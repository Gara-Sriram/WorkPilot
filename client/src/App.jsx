import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/layout/Sidebar.jsx';
import Header from './components/layout/Header.jsx';
import OverviewView from './components/dashboard/OverviewView.jsx';
import TasksView from './components/tasks/TasksView.jsx';
import DocumentsView from './components/documents/DocumentsView.jsx';
import FinanceView from './components/finance/FinanceView.jsx';
import ApprovalsView from './components/approvals/ApprovalsView.jsx';
import ErrorBoundary from './components/common/ErrorBoundary.jsx';
import { api } from './api/client.js';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [tasks, setTasks] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [financeRecords, setFinanceRecords] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [systemHealth, setSystemHealth] = useState(null);
  const [demoStats, setDemoStats] = useState(null);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [isSeedingDemo, setIsSeedingDemo] = useState(false);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  // Load all foundational data
  const refreshAllData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [health, demo, tasksData, docsData, finData, apprData] = await Promise.all([
        api.getHealth().catch(() => null),
        api.getDemoStatus().catch(() => null),
        api.getTasks().catch(() => ({ tasks: [] })),
        api.getDocuments().catch(() => ({ documents: [] })),
        api.getFinanceRecords().catch(() => ({ records: [] })),
        api.getApprovals().catch(() => ({ approvals: [] })),
      ]);

      if (health) setSystemHealth(health);
      if (demo) setDemoStats(demo.stats);
      if (tasksData?.tasks) setTasks(tasksData.tasks);
      if (docsData?.documents) setDocuments(docsData.documents);
      if (finData?.records) setFinanceRecords(finData.records);
      if (apprData?.approvals) setApprovals(apprData.approvals);
    } catch (err) {
      console.error('Error refreshing state:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    refreshAllData();

    // Auto-polling every 3 seconds to keep UI responsive to background task progress
    const interval = setInterval(() => {
      refreshAllData();
    }, 3000);

    return () => clearInterval(interval);
  }, [refreshAllData]);

  const handleCreateTask = async (prompt, docIds = []) => {
    setIsCreatingTask(true);
    try {
      const res = await api.createTask(prompt, docIds, true);
      if (res.task) {
        setSelectedTaskId(res.task.taskId);
        setActiveTab('tasks');
        await refreshAllData();
      }
    } catch (err) {
      alert(`Task creation failed: ${err.message}`);
    } finally {
      setIsCreatingTask(false);
    }
  };

  const handleLaunchPreset = async (prompt) => {
    await handleCreateTask(prompt);
  };

  const handleSeedDemo = async () => {
    setIsSeedingDemo(true);
    try {
      const res = await api.seedDemoData(false);
      await refreshAllData();
      alert(res.message || 'Sample invoices seeded successfully!');
    } catch (err) {
      alert(`Seeding failed: ${err.message}`);
    } finally {
      setIsSeedingDemo(false);
    }
  };

  const pendingApprovalsCount = Array.isArray(approvals)
    ? approvals.filter((a) => a.status === 'PENDING').length
    : 0;

  const getPageHeaderProps = () => {
    switch (activeTab) {
      case 'overview':
        return {
          title: 'Autonomous Workflow Control',
          subtitle: 'Live enterprise dashboard monitoring AI agent tasks, data persistence, and outcomes.',
        };
      case 'tasks':
        return {
          title: 'Task Execution & Verification',
          subtitle: 'Instruct WorkPilot AI, observe tool invocations, and inspect independent verification.',
        };
      case 'documents':
        return {
          title: 'Document Intelligence Repository',
          subtitle: 'Upload and inspect business PDF invoices and verify text extraction fidelity.',
        };
      case 'finance':
        return {
          title: 'Finance & Accounts Payable Records',
          subtitle: 'Persisted MongoDB records with duplicate-prevention constraints and verified integrity.',
        };
      case 'approvals':
        return {
          title: 'Human-in-the-Loop Governance',
          subtitle: 'Review, authorize, or reject operations exceeding automatic enterprise policy thresholds.',
        };
      default:
        return { title: 'WorkPilot Dashboard', subtitle: '' };
    }
  };

  const headerProps = getPageHeaderProps();

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingApprovalsCount={pendingApprovalsCount}
        systemHealth={systemHealth}
        onSeedDemo={handleSeedDemo}
        isSeeding={isSeedingDemo}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title={headerProps.title}
          subtitle={headerProps.subtitle}
          onNewTask={() => {
            setActiveTab('tasks');
            setSelectedTaskId(null);
          }}
          onRefresh={refreshAllData}
          isRefreshing={isRefreshing}
          pendingApprovalsCount={pendingApprovalsCount}
        />

        <main className="flex-1 p-8 overflow-y-auto">
          <ErrorBoundary onReset={() => setActiveTab('overview')}>
            {activeTab === 'overview' && (
              <OverviewView
                stats={demoStats}
                tasks={tasks}
                financeRecords={financeRecords}
                onSelectTask={setSelectedTaskId}
                onLaunchTaskPreset={handleLaunchPreset}
                setActiveTab={setActiveTab}
              />
            )}

            {activeTab === 'tasks' && (
              <TasksView
                tasks={tasks}
                selectedTaskId={selectedTaskId}
                onSelectTask={setSelectedTaskId}
                onCreateTask={handleCreateTask}
                isCreating={isCreatingTask}
                documents={documents}
                onRefresh={refreshAllData}
                onOpenApproval={(apprId) => {
                  setActiveTab('approvals');
                }}
              />
            )}

            {activeTab === 'documents' && (
              <DocumentsView
                documents={documents}
                onUploadSuccess={refreshAllData}
                isUploading={isUploadingDoc}
                setIsUploading={setIsUploadingDoc}
              />
            )}

            {activeTab === 'finance' && (
              <FinanceView financeRecords={financeRecords} />
            )}

            {activeTab === 'approvals' && (
              <ApprovalsView
                approvals={approvals}
                onRefresh={refreshAllData}
              />
            )}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
