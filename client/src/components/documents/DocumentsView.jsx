import React, { useState } from 'react';
import {
  FileText,
  Upload,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import Badge from '../common/Badge.jsx';
import Modal from '../common/Modal.jsx';
import { api } from '../../api/client.js';

export default function DocumentsView({
  documents = [],
  onUploadSuccess,
  isUploading,
  setIsUploading,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDocText, setSelectedDocText] = useState(null);
  const [isTextModalOpen, setIsTextModalOpen] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const docList = Array.isArray(documents) ? documents : [];

  const handleFileUpload = async (file) => {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setUploadError('Only PDF documents are supported.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File exceeds maximum size limit of 10 MB.');
      return;
    }

    setUploadError('');
    setIsUploading(true);

    try {
      await api.uploadDocument(file);
      onUploadSuccess();
    } catch (err) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleInspectText = async (docId, name) => {
    try {
      const data = await api.getDocumentText(docId);
      setSelectedDocText({
        name,
        text: data.text || 'No text extracted from this document.',
        status: data.extractionStatus,
        error: data.extractionError,
      });
      setIsTextModalOpen(true);
    } catch (err) {
      alert(`Failed to load document text: ${err.message}`);
    }
  };

  const filtered = docList.filter((d) => {
    const term = searchTerm.toLowerCase();
    return (
      (d?.originalName || '').toLowerCase().includes(term) ||
      (d?.vendorGuess && d.vendorGuess.toLowerCase().includes(term)) ||
      (d?.invoiceNumberGuess && d.invoiceNumberGuess.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Upload Zone */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <h3 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
          <Upload className="w-4 h-4 text-emerald-600" />
          Upload Business PDF Invoice
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Upload standard enterprise PDF invoices (up to 10 MB). Text stream is extracted and parsed automatically.
        </p>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files?.[0]) {
              handleFileUpload(e.dataTransfer.files[0]);
            }
          }}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
            isDragging
              ? 'border-emerald-500 bg-emerald-50/50'
              : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
          }`}
        >
          <div className="w-10 h-10 rounded-full bg-white border border-slate-200 shadow-2xs flex items-center justify-center mx-auto text-slate-500 mb-3">
            <FileText className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-xs font-semibold text-slate-700">
            Drag and drop your PDF invoice here, or{' '}
            <label className="text-emerald-600 hover:text-emerald-700 cursor-pointer underline underline-offset-2">
              browse files
              <input
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                disabled={isUploading}
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />
            </label>
          </p>
          <p className="text-[11px] text-slate-400 mt-1">PDF format only • Max file size: 10 MB</p>

          {isUploading && (
            <div className="mt-3 text-xs font-semibold text-emerald-600 animate-pulse">
              Processing and extracting PDF text...
            </div>
          )}

          {uploadError && (
            <div className="mt-3 text-xs font-medium text-rose-600 flex items-center justify-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              <span>{uploadError}</span>
            </div>
          )}
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900">Document Repository</h3>
            <span className="text-xs text-slate-400 font-mono">({filtered.length} documents)</span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search filename or vendor..."
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
                <th className="py-3 px-4">Filename</th>
                <th className="py-3 px-4">Detected Vendor</th>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4">Extraction</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No documents found. Upload a PDF or click "Seed Sample Invoices" in the sidebar.
                  </td>
                </tr>
              ) : (
                filtered.map((doc) => (
                  <tr key={doc.documentId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-900 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="truncate max-w-xs">{doc.originalName}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{doc.vendorGuess || '—'}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                      {doc.invoiceNumberGuess || '—'}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                      {(doc.size / 1024).toFixed(1)} KB
                    </td>
                    <td className="py-3 px-4">
                      <Badge status={doc.extractionStatus === 'SUCCESS' ? 'SUCCESS' : 'FAILED'} size="xs" />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleInspectText(doc.documentId, doc.originalName)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect Text</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Extracted Text Inspector Modal */}
      <Modal
        isOpen={isTextModalOpen}
        onClose={() => setIsTextModalOpen(false)}
        title={`Extracted PDF Text: ${selectedDocText?.name}`}
        subtitle="Raw text extracted by Node.js PDF engine"
        maxWidth="max-w-3xl"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Extraction Status:</span>
            <Badge status={selectedDocText?.status === 'SUCCESS' ? 'SUCCESS' : 'FAILED'} />
          </div>

          {selectedDocText?.error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
              {selectedDocText.error}
            </div>
          )}

          <div className="p-4 bg-slate-900 text-slate-200 rounded-lg text-xs font-mono whitespace-pre-wrap max-h-96 overflow-y-auto leading-relaxed border border-slate-800">
            {selectedDocText?.text}
          </div>
        </div>
      </Modal>
    </div>
  );
}
