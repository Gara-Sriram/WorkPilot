const API_ORIGIN = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/+$/, '') : '';
const BASE_URL = `${API_ORIGIN}/api`;

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = { ...options.headers };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || `HTTP error ${response.status}`);
    error.status = response.status;
    error.code = data.code;
    error.details = data.details;
    throw error;
  }

  return data;
}

export const api = {
  // System Health & Demo Status
  getHealth: () => request('/health'),
  getDemoStatus: () => request('/demo/status'),
  seedDemoData: (reset = false) => request('/demo/seed', {
    method: 'POST',
    body: JSON.stringify({ reset }),
  }),

  // Tasks
  createTask: (userRequest, relevantDocumentIds = [], autoRun = true) => request('/tasks', {
    method: 'POST',
    body: JSON.stringify({ userRequest, relevantDocumentIds, autoRun }),
  }),
  getTasks: (params = {}) => {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.limit) query.append('limit', params.limit);
    if (params.skip) query.append('skip', params.skip);
    const qs = query.toString();
    return request(`/tasks${qs ? `?${qs}` : ''}`);
  },
  getTaskById: (taskId) => request(`/tasks/${taskId}`),
  runTask: (taskId) => request(`/tasks/${taskId}/run`, { method: 'POST' }),
  cancelTask: (taskId) => request(`/tasks/${taskId}/cancel`, { method: 'POST' }),
  retryTask: (taskId) => request(`/tasks/${taskId}/retry`, { method: 'POST' }),

  // Documents
  uploadDocument: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return request('/documents', {
      method: 'POST',
      body: formData,
    });
  },
  getDocuments: (params = {}) => {
    const query = new URLSearchParams();
    if (params.limit) query.append('limit', params.limit);
    if (params.skip) query.append('skip', params.skip);
    const qs = query.toString();
    return request(`/documents${qs ? `?${qs}` : ''}`);
  },
  getDocumentById: (documentId) => request(`/documents/${documentId}`),
  getDocumentText: (documentId) => request(`/documents/${documentId}/text`),
  searchDocuments: (query, vendor) => {
    const params = new URLSearchParams();
    if (query) params.append('query', query);
    if (vendor) params.append('vendor', vendor);
    return request(`/documents/search?${params.toString()}`);
  },

  // Finance Records
  getFinanceRecords: (params = {}) => {
    const query = new URLSearchParams();
    if (params.isVerified !== undefined) query.append('isVerified', params.isVerified);
    if (params.limit) query.append('limit', params.limit);
    if (params.skip) query.append('skip', params.skip);
    const qs = query.toString();
    return request(`/finance-records${qs ? `?${qs}` : ''}`);
  },
  getFinanceRecordById: (recordId) => request(`/finance-records/${recordId}`),

  // Approvals
  getApprovals: (status) => {
    const qs = status ? `?status=${status}` : '';
    return request(`/approvals${qs}`);
  },
  getApprovalById: (approvalId) => request(`/approvals/${approvalId}`),
  approveAction: (approvalId, { decidedBy, comments }) => request(`/approvals/${approvalId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ decidedBy, comments }),
  }),
  rejectAction: (approvalId, { decidedBy, comments }) => request(`/approvals/${approvalId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ decidedBy, comments }),
  }),
};
