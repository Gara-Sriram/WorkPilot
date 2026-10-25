import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  RotateCcw,
  Ban,
  CheckCircle2,
  CheckSquare,
  XCircle,
  Clock,
  Sparkles,
  FileText,
  Upload,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
  Search,
  AlertTriangle,
  Info,
} from 'lucide-react';
import Badge from '../common/Badge.jsx';
import { api } from '../../api/client.js';

export default function TasksView({
  tasks = [],
  selectedTaskId,
  onSelectTask,
  onCreateTask,
  isCreating,
  documents = [],
  onRefresh,
  onOpenApproval,
}) {
  const [userPrompt, setUserPrompt] = useState('');
  const [selectedDocId, setSelectedDocId] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentTask, setCurrentTask] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [expandedEvents, setExpandedEvents] = useState({});

  const taskList = Array.isArray(tasks) ? tasks : [];
  const docList = Array.isArray(documents) ? documents : [];

  // When selectedTaskId changes or initial mount, load selected task or default to latest
  useEffect(() => {
    let isMounted = true;

    if (!selectedTaskId) {
      if (taskList.length > 0) {
        // If no task selected yet, pick the first one
        setCurrentTask((prev) => prev || taskList[0]);
      } else {
        setCurrentTask(null);
      }
      return;
    }

    const fetchDetail = async () => {
      try {
        setIsLoadingDetail(true);
        const full = await api.getTaskById(selectedTaskId);
        if (isMounted && full && !full.error) {
          setCurrentTask(full);
        }
      } catch (err) {
        console.error('Failed to load task details:', err);
      } finally {
        if (isMounted) setIsLoadingDetail(false);
      }
    };

    fetchDetail();

    return () => {
      isMounted = false;
    };
  }, [selectedTaskId]);

  // Keep active task synced with tasks list if selectedTaskId is null
  useEffect(() => {
    if (!selectedTaskId && taskList.length > 0 && !currentTask) {
      setCurrentTask(taskList[0]);
    }
  }, [taskList, selectedTaskId, currentTask]);

  // Dedicated lightweight poll for in-flight running task
  useEffect(() => {
    const isRunning = currentTask && ['RUNNING', 'VERIFYING', 'PENDING'].includes(currentTask.status);
    if (!isRunning || !currentTask?.taskId) return;

    const interval = setInterval(async () => {
      try {
        const updated = await api.getTaskById(currentTask.taskId);
        if (updated && !updated.error) {
          setCurrentTask(updated);
        }
      } catch (err) {
        console.warn('Poll task error:', err.message);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [currentTask?.taskId, currentTask?.status]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!userPrompt.trim()) return;

    const docIds = selectedDocId ? [selectedDocId] : [];
    onCreateTask(userPrompt, docIds);
    setUserPrompt('');
  };

  const handleRetry = async (taskId) => {
    try {
      await api.retryTask(taskId);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(`Retry failed: ${err.message}`);
    }
  };

  const handleCancel = async (taskId) => {
    try {
      await api.cancelTask(taskId);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(`Cancel failed: ${err.message}`);
    }
  };

  const toggleEventExpand = (idx) => {
    setExpandedEvents((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const filteredTasks = taskList.filter((t) => {
    if (statusFilter === 'ALL') return true;
    return t.status === statusFilter;
  });

  const promptPresets = [
    'Find the latest Acme Technologies invoice, extract its details, create a finance record, and verify it.',
    'Find the Globex Logistics invoice GLX-9942, extract details, create finance record, and verify.',
    'Process Initech Consulting invoice INT-7701, validate line items, create record, and verify.',
    'Find and verify invoice for NonExistentVendor999 to test graceful failure.',
  ];

  const planList = Array.isArray(currentTask?.plan) ? currentTask.plan : [];
  const historyList = Array.isArray(currentTask?.executionHistory) ? currentTask.executionHistory : [];
  const checksList = Array.isArray(currentTask?.verificationReport?.checks)
    ? currentTask.verificationReport.checks
    : [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Task Creation Panel */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm font-semibold text-slate-900">Instruct WorkPilot AI</h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <textarea
              rows={3}
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              placeholder="Enter a task in natural language... (e.g. 'Find the latest Acme Technologies invoice, extract its details, create a finance record, and verify it.')"
              className="w-full text-sm rounded-lg border border-slate-200 p-3.5 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none transition-all placeholder:text-slate-400 font-sans"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Document selector dropdown */}
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Target Document:</span>
              <select
                value={selectedDocId}
                onChange={(e) => setSelectedDocId(e.target.value)}
                className="text-xs border border-slate-200 rounded-md px-2.5 py-1.5 bg-slate-50 text-slate-700 outline-none focus:border-slate-900"
              >
                <option value="">Auto-discover via autonomous document search</option>
                {docList.map((d) => (
                  <option key={d.documentId} value={d.documentId}>
                    {d.originalName} ({d.vendorGuess || 'Invoice'})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={isCreating || !userPrompt.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isCreating ? 'Deploying Agent...' : 'Run Task'}</span>
            </button>
          </div>

          {/* Quick presets */}
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-medium text-slate-400">Quick Prompts:</span>
            {promptPresets.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setUserPrompt(preset)}
                className="text-[11px] text-slate-600 hover:text-slate-900 bg-slate-100/80 hover:bg-slate-200/70 px-2.5 py-1 rounded-md transition-colors truncate max-w-xs text-left"
              >
                {preset}
              </button>
            ))}
          </div>
        </form>
      </div>

      {/* 2. Tasks Master-Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Task History List */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900">Task History</h3>
              <span className="text-xs text-slate-400 font-mono">{filteredTasks.length} tasks</span>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap gap-1">
              {['ALL', 'RUNNING', 'WAITING_FOR_APPROVAL', 'COMPLETED', 'FAILED'].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-md transition-colors ${
                    statusFilter === status
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {status === 'WAITING_FOR_APPROVAL' ? 'APPROVALS' : status}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-slate-100 max-h-[650px] overflow-y-auto">
            {filteredTasks.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No tasks matching this filter.
              </div>
            ) : (
              filteredTasks.map((t) => {
                const isSelected = currentTask?.taskId === t.taskId;
                return (
                  <div
                    key={t.taskId}
                    onClick={() => onSelectTask(t.taskId)}
                    className={`p-3.5 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-slate-50 border-l-4 border-l-slate-900'
                        : 'hover:bg-slate-50/70 border-l-4 border-l-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[11px] font-mono font-medium text-slate-400">
                        {t.taskId}
                      </span>
                      <Badge status={t.status} size="xs" />
                    </div>
                    <p className="text-xs text-slate-800 font-medium line-clamp-2 leading-relaxed">
                      {t.userRequest}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {t.createdAt ? new Date(t.createdAt).toLocaleString() : 'Just now'}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Live Execution & Verification Details */}
        <div className="lg:col-span-8 space-y-6">
          {!currentTask ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 shadow-xs">
              <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-medium">Select a task on the left or create a new one to view execution.</p>
            </div>
          ) : (
            <>
              {/* Task Header & Quick Actions */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider">
                        {currentTask.taskId}
                      </span>
                      <Badge status={currentTask.status} />
                    </div>
                    <h3 className="text-base font-semibold text-slate-900 mt-1.5 leading-snug">
                      "{currentTask.userRequest}"
                    </h3>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {currentTask.status === 'FAILED' && (
                      <button
                        type="button"
                        onClick={() => handleRetry(currentTask.taskId)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Retry Task</span>
                      </button>
                    )}

                    {['RUNNING', 'VERIFYING'].includes(currentTask.status) && (
                      <button
                        type="button"
                        onClick={() => handleCancel(currentTask.taskId)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Cancel Task</span>
                      </button>
                    )}

                    {currentTask.status === 'WAITING_FOR_APPROVAL' && (
                      <button
                        type="button"
                        onClick={() => onOpenApproval && onOpenApproval(currentTask.approvalState?.approvalId)}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs animate-pulse"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Review & Decide Approval</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Error Banner if any */}
                {currentTask.errorDetails && (
                  <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Execution Stopped Safely:</p>
                      <p className="mt-0.5 leading-relaxed">{String(currentTask.errorDetails)}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Independent Verification Report Card */}
              {currentTask.verificationReport && checksList.length > 0 && (
                <div
                  className={`rounded-xl border p-6 shadow-xs ${
                    currentTask.verificationReport.passed
                      ? 'bg-emerald-50/40 border-emerald-200'
                      : 'bg-rose-50/40 border-rose-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      {currentTask.verificationReport.passed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-rose-600" />
                      )}
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">
                          Independent Outcome Verification Report
                        </h4>
                        <p className="text-xs text-slate-500">
                          {currentTask.verificationReport.passed
                            ? 'All database records were matched directly against raw PDF source data.'
                            : 'Discrepancies identified between database records and source document.'}
                        </p>
                      </div>
                    </div>
                    <Badge
                      status={currentTask.verificationReport.passed ? 'VERIFIED' : 'VERIFICATION_FAILED'}
                    />
                  </div>

                  {/* Individual Checks Table */}
                  <div className="bg-white rounded-lg border border-slate-200 overflow-hidden divide-y divide-slate-100">
                    {checksList.map((c, i) => (
                      <div key={i} className="p-3 text-xs flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2 min-w-0">
                          {c.passed ? (
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                          )}
                          <div>
                            <span className="font-semibold text-slate-900">{c.check}: </span>
                            <span className="text-slate-600">{c.message}</span>
                          </div>
                        </div>
                        <div className="text-right font-mono text-[11px] text-slate-500 shrink-0">
                          {c.passed ? (
                            <span className="text-emerald-700 font-semibold">PASS</span>
                          ) : (
                            <span className="text-rose-700 font-semibold">FAIL</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Execution Plan Stepper */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
                <h4 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-slate-600" />
                  Structured Autonomous Plan ({planList.length} Steps)
                </h4>

                <div className="space-y-3">
                  {planList.length === 0 ? (
                    <div className="text-xs text-slate-400 py-2">
                      Plan initializing or being constructed by AI...
                    </div>
                  ) : (
                    planList.map((step, idx) => {
                      const isStepRunning = step.status === 'RUNNING';
                      const isStepSucceeded = step.status === 'SUCCEEDED';
                      const isStepFailed = step.status === 'FAILED';

                      return (
                        <div
                          key={step.stepId || idx}
                          className={`p-3.5 rounded-lg border transition-all ${
                            isStepRunning
                              ? 'border-blue-300 bg-blue-50/30'
                              : isStepSucceeded
                              ? 'border-slate-200 bg-white'
                              : isStepFailed
                              ? 'border-rose-200 bg-rose-50/20'
                              : 'border-slate-100 bg-slate-50/40 text-slate-400'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-mono font-bold text-slate-400">
                                0{idx + 1}
                              </span>
                              <div>
                                <p className="text-xs font-semibold text-slate-900">
                                  {step.description}
                                </p>
                                <p className="text-[11px] font-mono text-emerald-700 mt-0.5">
                                  Tool: {step.tool}
                                </p>
                              </div>
                            </div>
                            <Badge status={step.status} size="xs" />
                          </div>

                          {/* Step result preview if succeeded */}
                          {step.result && (
                            <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-slate-600 font-mono bg-slate-50 p-2 rounded max-h-24 overflow-y-auto">
                              <span className="text-slate-400">Output: </span>
                              {typeof step.result === 'object'
                                ? JSON.stringify(step.result)
                                : String(step.result)}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Live Execution Event Timeline */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-600" />
                    Actual Execution History & Audit Events
                  </h4>
                  <span className="text-xs font-mono text-slate-400">
                    {historyList.length} events
                  </span>
                </div>

                <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {historyList.length === 0 ? (
                    <div className="text-xs text-slate-400 py-2">
                      No audit events recorded yet.
                    </div>
                  ) : (
                    historyList.map((ev, i) => {
                      const isExpanded = expandedEvents[i];
                      const eventType = String(ev?.eventType || 'EVENT');
                      const isFailed = eventType.includes('FAILED');
                      const isSucceeded = eventType.includes('SUCCEEDED') || eventType.includes('COMPLETED');
                      const isApproval = eventType.includes('APPROVAL');

                      return (
                        <div key={i} className="relative group">
                          {/* Dot */}
                          <div
                            className={`absolute -left-[27px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white shadow-2xs ${
                              isFailed
                                ? 'bg-rose-500'
                                : isSucceeded
                                ? 'bg-emerald-500'
                                : isApproval
                                ? 'bg-amber-500'
                                : 'bg-blue-500'
                            }`}
                          />

                          <div className="text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] text-slate-400">
                                {ev?.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : '—'}
                              </span>
                              <span className="font-semibold text-slate-800 font-mono text-[11px]">
                                [{eventType}]
                              </span>
                            </div>
                            <p className="text-slate-700 mt-0.5 leading-relaxed">
                              {typeof ev?.details === 'object'
                                ? JSON.stringify(ev.details)
                                : String(ev?.details ?? '')}
                            </p>

                            {/* Payload collapsible */}
                            {ev?.payload && (
                              <div className="mt-1">
                                <button
                                  type="button"
                                  onClick={() => toggleEventExpand(i)}
                                  className="text-[10px] text-emerald-600 hover:text-emerald-700 flex items-center gap-1 font-mono"
                                >
                                  {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                  {isExpanded ? 'Hide payload' : 'Inspect event payload'}
                                </button>
                                {isExpanded && (
                                  <pre className="mt-1 p-2 bg-slate-900 text-slate-100 rounded text-[10px] font-mono overflow-x-auto max-h-48">
                                    {JSON.stringify(ev.payload, null, 2)}
                                  </pre>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
