import React from 'react';
import {
  CheckSquare,
  FileCheck,
  ShieldAlert,
  CreditCard,
  ArrowRight,
  TrendingUp,
  FileText,
  Clock,
  Sparkles,
} from 'lucide-react';
import Badge from '../common/Badge.jsx';

export default function OverviewView({
  stats,
  tasks = [],
  financeRecords = [],
  onSelectTask,
  onLaunchTaskPreset,
  setActiveTab,
}) {
  const taskList = Array.isArray(tasks) ? tasks : [];
  const financeList = Array.isArray(financeRecords) ? financeRecords : [];

  const statCards = [
    {
      label: 'Total Executed Tasks',
      value: stats?.totalTasks ?? taskList.length,
      sub: `${stats?.completedTasks ?? 0} Completed, ${stats?.failedTasks ?? 0} Failed`,
      icon: CheckSquare,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Verified Outcomes',
      value: stats?.completedTasks ?? 0,
      sub: 'Independently verified against source',
      icon: FileCheck,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Pending Human Approvals',
      value: stats?.waitingApprovals ?? 0,
      sub: 'High-value policy threshold locks',
      icon: ShieldAlert,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Finance Records in DB',
      value: stats?.totalFinanceRecords ?? financeList.length,
      sub: 'Unique composite key protected',
      icon: CreditCard,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
  ];

  const presets = [
    {
      id: 'acme-happy-path',
      title: 'Acme Technologies Workflow',
      tag: 'Happy Path',
      tagColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      prompt: 'Find the latest Acme Technologies invoice, extract its details, create a finance record, and verify it.',
      desc: 'Autonomous discovery, PDF extraction, Zod validation, MongoDB insert, and 100% independent verification.',
    },
    {
      id: 'globex-approval',
      title: 'Globex Logistics ($14,800)',
      tag: 'Human Governance',
      tagColor: 'bg-amber-50 text-amber-700 border-amber-200',
      prompt: 'Find the Globex Logistics invoice GLX-9942, extract details, create finance record, and verify.',
      desc: 'Amount exceeds $10,000 policy threshold. Pauses task and requests human sign-off before committing.',
    },
    {
      id: 'non-existent-failure',
      title: 'Non-Existent Document Test',
      tag: 'Failure Handling',
      tagColor: 'bg-rose-50 text-rose-700 border-rose-200',
      prompt: 'Find and verify invoice for QuantumLeap Innovations Corp.',
      desc: 'Demonstrates authentic system integrity. Rejects fabrication when no matching invoice exists.',
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">{card.label}</span>
                <div className={`p-2 rounded-lg ${card.bg}`}>
                  <Icon className={`w-4 h-4 ${card.color}`} />
                </div>
              </div>
              <div className="mt-4">
                <div className="text-2xl font-bold text-slate-900 tracking-tight">{card.value}</div>
                <p className="text-xs text-slate-500 mt-1">{card.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Preset Workflow Showcase */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              Interview & Demonstration Workflows
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select any pre-configured scenario to trigger real autonomous execution and independent verification.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {presets.map((preset) => (
            <div
              key={preset.id}
              className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${preset.tagColor}`}>
                    {preset.tag}
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">
                  {preset.title}
                </h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{preset.desc}</p>
              </div>

              <button
                onClick={() => onLaunchTaskPreset(preset.prompt)}
                className="mt-4 w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium text-slate-800 bg-white hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 rounded-md transition-all shadow-2xs"
              >
                <span>Run Scenario</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Grid: Recent Tasks & Recent Finance Records */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tasks */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                Recent Task Executions
              </h3>
              <button
                type="button"
                onClick={() => setActiveTab('tasks')}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
              >
                View all ({taskList.length})
              </button>
            </div>

            {taskList.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                No tasks executed yet. Launch a preset scenario above to begin.
              </div>
            ) : (
              <div className="space-y-3">
                {taskList.slice(0, 5).map((task) => (
                  <div
                    key={task.taskId}
                    onClick={() => {
                      if (onSelectTask) onSelectTask(task.taskId);
                      setActiveTab('tasks');
                    }}
                    className="p-3 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50/80 cursor-pointer transition-all flex items-center justify-between"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="text-xs font-medium text-slate-900 truncate">{task.userRequest}</p>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {task.taskId} • {task.createdAt ? new Date(task.createdAt).toLocaleTimeString() : 'Just now'}
                      </p>
                    </div>
                    <Badge status={task.status} size="xs" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Finance Records */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-slate-500" />
                Persisted Finance Records
              </h3>
              <button
                type="button"
                onClick={() => setActiveTab('finance')}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
              >
                View all ({financeList.length})
              </button>
            </div>

            {financeList.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                No finance records created yet. Process an invoice to create records.
              </div>
            ) : (
              <div className="space-y-3">
                {financeList.slice(0, 5).map((record) => (
                  <div
                    key={record.recordId}
                    className="p-3 rounded-lg border border-slate-100 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-semibold text-slate-900">{record.vendor}</p>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {record.invoiceNumber} • {record.recordId}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-900">
                        {record.currency || 'USD'} {(Number(record.amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                      <span className="inline-block mt-0.5">
                        <Badge status={record.isVerified ? 'VERIFIED' : 'PENDING_VERIFICATION'} size="xs" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
