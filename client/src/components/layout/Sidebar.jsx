import React from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  FileText,
  CreditCard,
  ShieldAlert,
  Sparkles,
  Database,
  RefreshCw,
  Cpu,
} from 'lucide-react';

export default function Sidebar({
  activeTab,
  setActiveTab,
  pendingApprovalsCount = 0,
  systemHealth,
  onSeedDemo,
  isSeeding,
}) {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'tasks', label: 'Tasks & Execution', icon: CheckSquare },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'finance', label: 'Finance Records', icon: CreditCard },
    {
      id: 'approvals',
      label: 'Approvals',
      icon: ShieldAlert,
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : null,
    },
  ];

  const isLiveAI = systemHealth?.aiEngine?.isLiveAI;

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-100 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-sm shadow-emerald-200">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="font-bold text-slate-900 tracking-tight text-base">WorkPilot</h1>
            <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
              v1.0
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium leading-none mt-1">Autonomous AI Employee</p>
        </div>
      </div>

      {/* AI Mode Banner */}
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/70">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-slate-400" />
            AI Engine
          </span>
          <span
            className={`font-semibold px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider ${
              isLiveAI
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-amber-100 text-amber-800 border border-amber-300'
            }`}
          >
            {isLiveAI ? 'Live Gemini' : 'Demo Fixture'}
          </span>
        </div>
        <p className="text-[11px] text-slate-500 mt-1 truncate">
          {systemHealth?.aiEngine?.model || 'Deterministic AI Agent'}
        </p>
      </div>

      {/* Navigation */}
      <nav className="p-3 space-y-1 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-rose-500 text-white animate-pulse">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Quick Demo Action & Database Status */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-3">
        <button
          onClick={onSeedDemo}
          disabled={isSeeding}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs hover:border-slate-300 transition-all disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isSeeding ? 'animate-spin' : ''}`} />
          <span>{isSeeding ? 'Resetting Demo...' : 'Seed Sample Invoices'}</span>
        </button>

        <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
          <span className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-slate-400" />
            MongoDB
          </span>
          <span className="flex items-center gap-1 font-medium text-emerald-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Connected
          </span>
        </div>
      </div>
    </aside>
  );
}
