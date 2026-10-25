import { z } from 'zod';

class ToolRegistry {
  constructor() {
    this.tools = new Map();
  }

  register({ name, description, schema, execute, requiresApproval = false }) {
    if (!name || typeof name !== 'string') {
      throw new Error('Tool must have a valid name string.');
    }
    if (!description || typeof description !== 'string') {
      throw new Error(`Tool ${name} must have a description.`);
    }
    if (!schema || !(schema instanceof z.ZodType)) {
      throw new Error(`Tool ${name} must define a Zod schema.`);
    }
    if (typeof execute !== 'function') {
      throw new Error(`Tool ${name} must provide an execute function.`);
    }

    this.tools.set(name, {
      name,
      description,
      schema,
      execute,
      requiresApproval,
    });
  }

  get(name) {
    return this.tools.get(name);
  }

  has(name) {
    return this.tools.has(name);
  }

  list() {
    return Array.from(this.tools.values()).map(t => ({
      name: t.name,
      description: t.description,
      requiresApproval: t.requiresApproval,
    }));
  }

  /**
   * Validate arguments against tool's Zod schema
   */
  validateArgs(name, rawArgs) {
    const tool = this.get(name);
    if (!tool) {
      throw new Error(`Unknown tool "${name}". Tool does not exist in registry.`);
    }
    const result = tool.schema.safeParse(rawArgs || {});
    if (!result.success) {
      const issues = result.error.issues.map(i => `${i.path.join('.') || 'root'}: ${i.message}`).join(', ');
      throw new Error(`Validation failed for tool "${name}" arguments: ${issues}`);
    }
    return result.data;
  }

  /**
   * Execute tool with validated arguments and execution context
   */
  async execute(name, rawArgs, context = {}) {
    try {
      const tool = this.get(name);
      if (!tool) {
        return {
          success: false,
          error: `Unknown tool "${name}". Available tools: ${Array.from(this.tools.keys()).join(', ')}`,
          errorCode: 'UNKNOWN_TOOL',
        };
      }

      const validatedArgs = this.validateArgs(name, rawArgs);
      const result = await tool.execute(validatedArgs, context);
      return {
        success: true,
        data: result,
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        errorCode: err.code || 'TOOL_EXECUTION_ERROR',
        isDuplicate: err.name === 'DuplicateFinanceRecordError',
      };
    }
  }
}

export const toolRegistry = new ToolRegistry();
