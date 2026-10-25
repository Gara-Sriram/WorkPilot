import { Task } from '../models/Task.js';
import { toolRegistry } from '../tools/index.js';
import { interpretTask, generateExecutionPlan } from './geminiClient.js';
import { env } from '../config/env.js';

export class AgentRuntime {
  constructor(options = {}) {
    this.maxToolCalls = options.maxToolCalls || env.MAX_TOOL_CALLS;
    this.maxRetries = options.maxRetries || env.MAX_RETRIES;
    this.taskTimeoutMs = options.taskTimeoutMs || env.TASK_TIMEOUT_MS;
  }

  /**
   * Initialize a task: interpret request, construct plan, persist initial state
   */
  async initializeTask(taskDoc) {
    // 1. Task Received Event
    taskDoc.executionHistory.push({
      timestamp: new Date(),
      eventType: 'TASK_RECEIVED',
      details: `Autonomous agent initialized for goal: "${taskDoc.userRequest}"`,
      payload: { userRequest: taskDoc.userRequest },
    });

    // 2. Interpret Goal with AI
    const interpretation = await interpretTask(taskDoc.userRequest);
    taskDoc.executionHistory.push({
      timestamp: new Date(),
      eventType: 'PLAN_CREATED',
      details: `AI task understanding completed: ${interpretation.goal} (Engine: ${interpretation.source || 'AI'})`,
      payload: interpretation,
    });

    // 3. Generate structured execution plan
    const availableTools = toolRegistry.list();
    const rawPlan = await generateExecutionPlan(interpretation, availableTools);

    taskDoc.plan = rawPlan;
    taskDoc.currentStepIndex = 0;
    taskDoc.status = 'RUNNING';
    await taskDoc.save();

    return taskDoc;
  }

  /**
   * Main controlled execution loop for a task
   */
  async runTask(taskId) {
    const task = await Task.findOne({ taskId });
    if (!task) {
      throw new Error(`Task with ID "${taskId}" not found.`);
    }

    // Guard against invalid initial status
    if (['COMPLETED', 'CANCELLED'].includes(task.status)) {
      return task;
    }

    if (task.status === 'PENDING' || !task.plan || task.plan.length === 0) {
      await this.initializeTask(task);
    } else {
      task.status = 'RUNNING';
      await task.save();
    }

    // Context dictionary passed between steps to propagate dynamic data
    const executionContext = {
      task,
      extractedData: null,
      createdFinanceRecord: null,
      verificationReport: null,
    };

    const startTime = Date.now();

    while (task.currentStepIndex < task.plan.length) {
      // 1. Check Task Timeout Budget
      if (Date.now() - startTime > this.taskTimeoutMs) {
        task.status = 'FAILED';
        task.errorDetails = `Task execution exceeded global timeout limit of ${this.taskTimeoutMs / 1000}s.`;
        task.executionHistory.push({
          timestamp: new Date(),
          eventType: 'TASK_FAILED',
          details: task.errorDetails,
        });
        await task.save();
        return task;
      }

      // 2. Check Tool Call Count Budget
      if (task.toolCallCount >= this.maxToolCalls) {
        task.status = 'FAILED';
        task.errorDetails = `Execution budget exhausted: exceeded maximum allowed tool calls (${this.maxToolCalls}).`;
        task.executionHistory.push({
          timestamp: new Date(),
          eventType: 'TASK_FAILED',
          details: task.errorDetails,
        });
        await task.save();
        return task;
      }

      const currentStep = task.plan[task.currentStepIndex];
      currentStep.status = 'RUNNING';
      currentStep.startedAt = currentStep.startedAt || new Date();
      currentStep.attempts += 1;
      task.toolCallCount += 1;

      // 3. Dynamically resolve step arguments from previous step results
      const resolvedArgs = this.resolveStepArguments(currentStep, executionContext);

      // Record Tool Requested
      task.executionHistory.push({
        timestamp: new Date(),
        eventType: 'TOOL_REQUESTED',
        stepId: currentStep.stepId,
        tool: currentStep.tool,
        details: `Step ${task.currentStepIndex + 1}/${task.plan.length}: Preparing tool "${currentStep.tool}" (Attempt ${currentStep.attempts}/${this.maxRetries})`,
        payload: { args: resolvedArgs },
      });

      // 4. Validate tool existence
      if (!toolRegistry.has(currentStep.tool)) {
        currentStep.status = 'FAILED';
        currentStep.error = `Tool "${currentStep.tool}" is not registered in the system allowlist.`;
        task.status = 'FAILED';
        task.errorDetails = currentStep.error;
        task.executionHistory.push({
          timestamp: new Date(),
          eventType: 'TOOL_FAILED',
          stepId: currentStep.stepId,
          tool: currentStep.tool,
          details: currentStep.error,
        });
        await task.save();
        return task;
      }

      // 5. Execute the Tool
      task.executionHistory.push({
        timestamp: new Date(),
        eventType: 'TOOL_STARTED',
        stepId: currentStep.stepId,
        tool: currentStep.tool,
        details: `Executing "${currentStep.tool}"...`,
      });

      const execResult = await toolRegistry.execute(currentStep.tool, resolvedArgs, { task });

      if (execResult.success) {
        // Check if the tool intercepted and requested human approval
        if (execResult.data && execResult.data.requiresApproval) {
          currentStep.status = 'PENDING'; // Kept pending until operator decides
          task.status = 'WAITING_FOR_APPROVAL';
          await task.save();
          return task; // Pause execution until approval
        }

        currentStep.status = 'SUCCEEDED';
        currentStep.result = execResult.data;
        currentStep.completedAt = new Date();

        task.executionHistory.push({
          timestamp: new Date(),
          eventType: 'TOOL_SUCCEEDED',
          stepId: currentStep.stepId,
          tool: currentStep.tool,
          details: `Tool "${currentStep.tool}" completed successfully.`,
          payload: execResult.data,
        });

        // Update runtime execution context
        this.updateContextAfterSuccess(currentStep.tool, execResult.data, executionContext);

        // Move to next step
        task.currentStepIndex += 1;
        await task.save();
      } else {
        // Tool execution failed
        const isDuplicate = execResult.isDuplicate;
        const errorMessage = execResult.error;

        task.executionHistory.push({
          timestamp: new Date(),
          eventType: 'TOOL_FAILED',
          stepId: currentStep.stepId,
          tool: currentStep.tool,
          details: `Tool "${currentStep.tool}" returned failure: ${errorMessage}`,
          error: errorMessage,
        });

        // Check if retryable
        if (this.isRetryable(currentStep.tool, execResult) && currentStep.attempts < this.maxRetries) {
          task.executionHistory.push({
            timestamp: new Date(),
            eventType: 'RETRY_SCHEDULED',
            stepId: currentStep.stepId,
            tool: currentStep.tool,
            details: `Scheduling transient retry attempt ${currentStep.attempts + 1} for ${currentStep.tool}...`,
          });
          currentStep.status = 'PENDING';
          await task.save();
          // Small jitter backoff
          await new Promise(r => setTimeout(r, 500));
          continue; // retry current step
        }

        // Non-retryable or retries exhausted
        currentStep.status = 'FAILED';
        currentStep.error = errorMessage;
        task.status = 'FAILED';
        task.errorDetails = `Step ${currentStep.stepId} (${currentStep.tool}) failed: ${errorMessage}`;
        task.completedAt = new Date();

        task.executionHistory.push({
          timestamp: new Date(),
          eventType: 'TASK_FAILED',
          stepId: currentStep.stepId,
          tool: currentStep.tool,
          details: `Task terminated due to unrecoverable step failure.`,
          error: errorMessage,
        });

        await task.save();
        return task;
      }
    }

    // 6. Final Independent Verification Phase
    task.status = 'VERIFYING';
    task.executionHistory.push({
      timestamp: new Date(),
      eventType: 'VERIFICATION_STARTED',
      details: 'Conducting final independent verification of outcomes against source data...',
    });
    await task.save();

    // Perform verification assertion
    const isOutcomeVerified = await this.performFinalOutcomeVerification(task, executionContext);

    if (isOutcomeVerified.passed) {
      task.status = 'COMPLETED';
      task.completedAt = new Date();
      task.resultSummary = `Workflow successfully completed and independently verified. Finance record ${task.verificationReport.financeRecordId} matches source document with 100% fidelity across all checks.`;
      task.executionHistory.push({
        timestamp: new Date(),
        eventType: 'VERIFICATION_SUCCEEDED',
        details: 'All independent verification assertions PASSED. Business data matches source invoice exactly.',
        payload: task.verificationReport,
      });
      task.executionHistory.push({
        timestamp: new Date(),
        eventType: 'TASK_COMPLETED',
        details: task.resultSummary,
      });
    } else {
      task.status = 'FAILED';
      task.completedAt = new Date();
      task.errorDetails = `Independent verification failed: ${isOutcomeVerified.discrepancies.join('; ')}`;
      task.executionHistory.push({
        timestamp: new Date(),
        eventType: 'VERIFICATION_FAILED',
        details: `Verification failed. Discrepancies detected between database record and original source data.`,
        payload: isOutcomeVerified,
      });
      task.executionHistory.push({
        timestamp: new Date(),
        eventType: 'TASK_FAILED',
        details: task.errorDetails,
      });
    }

    await task.save();
    return task;
  }

  /**
   * Dynamically fill step arguments from accumulated context
   */
  resolveStepArguments(step, ctx) {
    const args = { ...step.args };

    if (step.tool === 'extract_invoice') {
      if (!args.documentId) {
        // Get documentId from task relevantDocumentIds or from step_1 search results
        if (ctx.task.relevantDocumentIds && ctx.task.relevantDocumentIds.length > 0) {
          args.documentId = ctx.task.relevantDocumentIds[0];
        } else {
          const searchStep = ctx.task.plan.find(s => s.tool === 'search_documents' && s.result?.matches?.length > 0);
          if (searchStep && searchStep.result.matches[0]) {
            args.documentId = searchStep.result.matches[0].documentId;
          }
        }
      }
    } else if (step.tool === 'validate_invoice') {
      if (ctx.extractedData) {
        args.vendor = args.vendor || ctx.extractedData.vendor;
        args.invoiceNumber = args.invoiceNumber || ctx.extractedData.invoiceNumber;
        args.amount = args.amount !== undefined ? args.amount : ctx.extractedData.amount;
        args.currency = args.currency || ctx.extractedData.currency || 'USD';
        args.dueDate = args.dueDate || ctx.extractedData.dueDate;
        args.invoiceDate = args.invoiceDate || ctx.extractedData.invoiceDate;
      }
    } else if (step.tool === 'create_finance_record') {
      if (ctx.extractedData) {
        args.vendor = args.vendor || ctx.extractedData.vendor;
        args.invoiceNumber = args.invoiceNumber || ctx.extractedData.invoiceNumber;
        args.amount = args.amount !== undefined ? args.amount : ctx.extractedData.amount;
        args.currency = args.currency || ctx.extractedData.currency || 'USD';
        args.dueDate = args.dueDate || ctx.extractedData.dueDate;
        args.invoiceDate = args.invoiceDate || ctx.extractedData.invoiceDate;
        args.lineItems = args.lineItems || ctx.extractedData.lineItems || [];
        args.documentId = args.documentId || ctx.extractedData.documentId;
      }
    } else if (step.tool === 'verify_finance_record') {
      if (ctx.createdFinanceRecord) {
        args.recordId = args.recordId || ctx.createdFinanceRecord.recordId;
      }
      if (ctx.extractedData) {
        args.vendor = args.vendor || ctx.extractedData.vendor;
        args.invoiceNumber = args.invoiceNumber || ctx.extractedData.invoiceNumber;
        args.expectedSourceData = args.expectedSourceData || {
          vendor: ctx.extractedData.vendor,
          invoiceNumber: ctx.extractedData.invoiceNumber,
          amount: ctx.extractedData.amount,
          currency: ctx.extractedData.currency,
          dueDate: ctx.extractedData.dueDate,
          invoiceDate: ctx.extractedData.invoiceDate,
        };
      }
    }

    return args;
  }

  updateContextAfterSuccess(toolName, data, ctx) {
    if (toolName === 'search_documents') {
      if (data.matches && data.matches.length > 0) {
        const docId = data.matches[0].documentId;
        if (!ctx.task.relevantDocumentIds.includes(docId)) {
          ctx.task.relevantDocumentIds.push(docId);
        }
      }
    } else if (toolName === 'extract_invoice') {
      ctx.extractedData = data;
    } else if (toolName === 'create_finance_record') {
      ctx.createdFinanceRecord = data;
    } else if (toolName === 'verify_finance_record') {
      ctx.verificationReport = data;
      ctx.task.verificationReport = {
        passed: data.passed,
        checks: data.checks,
        verifiedAt: data.verifiedAt,
        financeRecordId: data.financeRecordId || (ctx.createdFinanceRecord ? ctx.createdFinanceRecord.recordId : null),
      };
    }
  }

  isRetryable(toolName, execResult) {
    // Non-retryable errors
    if (execResult.isDuplicate) return false;
    if (execResult.errorCode === 'VALIDATION_ERROR' || execResult.errorCode === 'UNKNOWN_TOOL') return false;
    if (execResult.error && (execResult.error.includes('does not exist') || execResult.error.includes('documentId is required') || execResult.error.includes('Validation failed'))) return false;
    if (execResult.error && execResult.error.includes('Missing')) return false;

    // Retryable transient conditions: network hiccups, transient DB locks
    return true;
  }

  async performFinalOutcomeVerification(task, ctx) {
    // Check if verification report already exists in task
    if (task.verificationReport && task.verificationReport.checks?.length > 0) {
      return {
        passed: task.verificationReport.passed,
        checks: task.verificationReport.checks,
        discrepancies: task.verificationReport.checks.filter(c => !c.passed).map(c => c.message),
      };
    }

    // If verify_finance_record was not executed in plan, execute it now to guarantee independent verification
    if (ctx.createdFinanceRecord && ctx.extractedData) {
      const report = await toolRegistry.execute('verify_finance_record', {
        recordId: ctx.createdFinanceRecord.recordId,
        expectedSourceData: {
          vendor: ctx.extractedData.vendor,
          invoiceNumber: ctx.extractedData.invoiceNumber,
          amount: ctx.extractedData.amount,
          currency: ctx.extractedData.currency,
          dueDate: ctx.extractedData.dueDate,
          invoiceDate: ctx.extractedData.invoiceDate,
        },
      }, { task });

      if (report.success) {
        task.verificationReport = {
          passed: report.data.passed,
          checks: report.data.checks,
          verifiedAt: report.data.verifiedAt,
          financeRecordId: report.data.financeRecordId,
        };
        return report.data;
      }
    }

    return {
      passed: false,
      checks: [{ check: 'INDEPENDENT_VERIFICATION', passed: false, message: 'Verification step was not executed or failed to run.' }],
      discrepancies: ['Verification step was not executed or failed to run.'],
    };
  }
}

export const agentRuntime = new AgentRuntime();
