import React, { useState } from 'react';
import { CreditCard, Eye, ShieldCheck, AlertCircle, Search, CheckCircle2 } from 'lucide-react';
import Badge from '../common/Badge.jsx';
import Modal from '../common/Modal.jsx';

export default function FinanceView({ financeRecords = [] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const financeList = Array.isArray(financeRecords) ? financeRecords : [];

  const filtered = financeList.filter((r) => {
    const term = searchTerm.toLowerCase();
    return (
      (r?.vendor || '').toLowerCase().includes(term) ||
      (r?.invoiceNumber || '').toLowerCase().includes(term) ||
      (r?.recordId || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Info Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-600" />
            General Ledger & Accounts Payable Records
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Finance records persisted in MongoDB with strict composite uniqueness constraints and integer minor units.
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>{financeList.filter((r) => r.isVerified).length} Verified</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>{financeList.filter((r) => !r.isVerified).length} Unverified</span>
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900">Persisted Records</h3>
            <span className="text-xs text-slate-400 font-mono">({filtered.length} total)</span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search vendor or invoice #..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 w-64 outline-none focus:border-slate-900"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Record ID</th>
                <th className="py-3 px-4">Vendor</th>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Minor Units (Cents)</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Independent Verification</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No finance records found in the database. Process an invoice task to create records.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.recordId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] font-semibold text-slate-500">
                      {r.recordId}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{r.vendor}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600">{r.invoiceNumber}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {r.currency} {Number(r.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {r.amountCents?.toLocaleString() ?? Math.round(r.amount * 100)} cents
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {r.dueDate ? new Date(r.dueDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        status={r.isVerified ? 'VERIFIED' : 'PENDING_VERIFICATION'}
                        size="xs"
                      />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedRecord(r);
                          setIsDetailOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Inspection Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={`Finance Record: ${selectedRecord?.recordId}`}
        subtitle="Full database schema and verification status inspection"
        maxWidth="max-w-2xl"
      >
        {selectedRecord && (
          <div className="space-y-5 text-xs">
            <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-slate-50 border border-slate-200">
              <div>
                <span className="text-slate-400 font-medium">Vendor:</span>
                <p className="font-semibold text-slate-900 mt-0.5">{selectedRecord.vendor}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Invoice Number:</span>
                <p className="font-mono font-semibold text-slate-900 mt-0.5">{selectedRecord.invoiceNumber}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Total Amount:</span>
                <p className="font-bold text-slate-900 mt-0.5">
                  {selectedRecord.currency} {Number(selectedRecord.amount).toFixed(2)}
                </p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Minor Unit Representation:</span>
                <p className="font-mono text-slate-700 mt-0.5">
                  {selectedRecord.amountCents} integer cents
                </p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Due Date:</span>
                <p className="text-slate-700 mt-0.5">
                  {selectedRecord.dueDate ? new Date(selectedRecord.dueDate).toLocaleDateString() : 'None'}
                </p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Verification Status:</span>
                <div className="mt-1">
                  <Badge status={selectedRecord.isVerified ? 'VERIFIED' : 'PENDING_VERIFICATION'} />
                </div>
              </div>
            </div>

            {/* Composite Unique Key */}
            <div>
              <span className="text-slate-500 font-semibold">MongoDB Composite Uniqueness Key:</span>
              <p className="mt-1 p-2 bg-slate-100 rounded font-mono text-[11px] text-slate-800 break-all border border-slate-200">
                {selectedRecord.uniqueCompositeKey}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Protected at database index level. Any duplicate submission triggers code 11000 and is rejected safely.
              </p>
            </div>

            {/* Verification Audit Notes */}
            <div>
              <span className="text-slate-500 font-semibold">Verification Audit Notes:</span>
              <p className="mt-1 p-3 bg-emerald-50/50 border border-emerald-200 rounded text-slate-700 leading-relaxed">
                {selectedRecord.verificationNotes || 'No verification notes recorded.'}
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
