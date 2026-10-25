import React from 'react';
import { Plus, RefreshCw, Activity, ShieldAlert } from 'lucide-react';

export default function Header({
  title,
  subtitle,
  onNewTask,
  onRefresh,
  isRefreshing,
  pendingApprovalsCount = 0,
}) {
  return (
    <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-20">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {pendingApprovalsCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium animate-pulse">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            <span>{pendingApprovalsCount} Action(s) Require Human Approval</span>
          </div>
        )}

        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Refresh current state"
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>

        <button
          onClick={onNewTask}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Task</span>
        </button>
      </div>
    </header>
  );
}
