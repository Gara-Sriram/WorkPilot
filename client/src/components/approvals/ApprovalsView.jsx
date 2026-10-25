import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2, XCircle, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';
import Badge from '../common/Badge.jsx';
import Modal from '../common/Modal.jsx';
import { api } from '../../api/client.js';

export default function ApprovalsView({
  approvals = [],
  onRefresh,
  activeApprovalId,
  setActiveApprovalId,
}) {
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [decisionType, setDecisionType] = useState('APPROVED'); // 'APPROVED' or 'REJECTED'
  const [decidedBy, setDecidedBy] = useState('Enterprise Finance Officer');
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const approvalList = Array.isArray(approvals) ? approvals : [];
  const pendingApprovals = approvalList.filter((a) => a.status === 'PENDING');
  const historicalApprovals = approvalList.filter((a) => a.status !== 'PENDING');

  const openDecisionModal = (approval, type) => {
    setSelectedApproval(approval);
    setDecisionType(type);
    setComments('');
    setDecisionModalOpen(true);
  };

  const handleDecisionSubmit = async () => {
    if (!selectedApproval) return;
    setIsSubmitting(true);

    try {
      if (decisionType === 'APPROVED') {
        await api.approveAction(selectedApproval.approvalId, { decidedBy, comments });
      } else {
        await api.rejectAction(selectedApproval.approvalId, { decidedBy, comments });
      }
      setDecisionModalOpen(false);
      onRefresh();
    } catch (err) {
      alert(`Decision recording failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            Human-in-the-Loop Governance & Audit Gateways
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Operations exceeding enterprise financial thresholds require explicit human authorization before execution continues.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
            {pendingApprovals.length} Pending Actions
          </span>
        </div>
      </div>

      {/* Pending Approvals Section */}
      <div className="space-y-4">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Actions Awaiting Authorization ({pendingApprovals.length})
        </h4>

        {pendingApprovals.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-xs shadow-xs">
            <ShieldCheck className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
            <p className="font-medium text-slate-700">No actions currently require human approval.</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Launch the Globex Logistics ($14,800) scenario to trigger a policy threshold lock.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingApprovals.map((req) => (
              <div
                key={req.approvalId}
                className="bg-white rounded-xl border-2 border-amber-300 p-5 shadow-xs flex flex-col justify-between space-y-4 animate-in fade-in"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-amber-700">
                      {req.approvalId}
                    </span>
                    <Badge status="WAITING_FOR_APPROVAL" size="xs" />
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 leading-snug">
                    {req.actionDescription}
                  </h4>

                  <div className="mt-3 p-3 rounded-lg bg-amber-50/70 border border-amber-200 text-xs text-amber-900 leading-relaxed">
                    <span className="font-semibold">Reason: </span>
                    {req.reason}
                  </div>

                  {req.amount && (
                    <div className="mt-3 text-xs flex items-center justify-between text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <span>Operation Value:</span>
                      <span className="font-bold text-slate-900">
                        {req.currency} {Number(req.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}

                  <p className="text-[11px] text-slate-400 mt-2 font-mono">
                    Associated Task: {req.taskId}
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => openDecisionModal(req, 'APPROVED')}
                    className="flex-1 py-2 px-3 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Authorize Action</span>
                  </button>

                  <button
                    onClick={() => openDecisionModal(req, 'REJECTED')}
                    className="flex-1 py-2 px-3 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historical Decided Approvals */}
      <div className="space-y-4 pt-4">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Decision Audit History ({historicalApprovals.length})
        </h4>

        {historicalApprovals.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-400 text-xs">
            No historical decisions recorded yet.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs divide-y divide-slate-100">
            {historicalApprovals.map((req) => (
              <div key={req.approvalId} className="p-4 flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-semibold text-slate-500">{req.approvalId}</span>
                    <Badge status={req.status} size="xs" />
                  </div>
                  <p className="font-semibold text-slate-900 mt-1">{req.actionDescription}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Decided by <span className="font-medium text-slate-700">{req.decidedBy || 'Operator'}</span> on{' '}
                    {new Date(req.decidedAt).toLocaleString()}
                    {req.comments && ` • Note: "${req.comments}"`}
                  </p>
                </div>
                <div className="text-right font-mono text-xs font-semibold text-slate-800">
                  {req.currency} {Number(req.amount || 0).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Decision Confirmation Modal */}
      <Modal
        isOpen={decisionModalOpen}
        onClose={() => setDecisionModalOpen(false)}
        title={decisionType === 'APPROVED' ? 'Authorize Sensitive Action' : 'Reject Action'}
        subtitle={`Audit recording for ${selectedApproval?.approvalId}`}
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div
            className={`p-3 rounded-lg border text-xs leading-relaxed ${
              decisionType === 'APPROVED'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            <p className="font-semibold">Action to be {decisionType.toLowerCase()}:</p>
            <p className="mt-0.5">{selectedApproval?.actionDescription}</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Authorized Officer Identity:
            </label>
            <input
              type="text"
              value={decidedBy}
              onChange={(e) => setDecidedBy(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-200 p-2.5 outline-none focus:border-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Audit Commentary / Reason:
            </label>
            <textarea
              rows={2}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="e.g. Verified against Q4 vendor budget and approved for payment."
              className="w-full text-xs rounded-lg border border-slate-200 p-2.5 outline-none focus:border-slate-900"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={() => setDecisionModalOpen(false)}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              Cancel
            </button>

            <button
              onClick={handleDecisionSubmit}
              disabled={isSubmitting}
              className={`px-4 py-2 text-xs font-semibold text-white rounded-lg transition-colors ${
                decisionType === 'APPROVED'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {isSubmitting ? 'Recording Decision...' : `Confirm ${decisionType}`}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
