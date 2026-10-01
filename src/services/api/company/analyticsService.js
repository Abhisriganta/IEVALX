import api from '../axiosInstance';
const PERIOD_MAP = {
  '1m':  '30d',
  '3m':  '90d',
  '6m':  '6m',
  '1y':  '1y',
  'all': 'all',
};

const analyticsService = {
  getOverview:   (range = 'all') =>
    api.get('/company/analytics/overview/',   { params: { period: PERIOD_MAP[range] ?? 'all' } }),

  getApplicants: (range = 'all') =>
    api.get('/company/analytics/applicants/', { params: { period: PERIOD_MAP[range] ?? 'all' } }),

  getJobs:       (range = 'all') =>
    api.get('/company/analytics/jobs/',       { params: { period: PERIOD_MAP[range] ?? 'all' } }),

  getEmployers:  () =>
    api.get('/company/analytics/employers/'),

  exportPDF: async (range = 'all') => {
    const period = PERIOD_MAP[range] ?? 'all';
    const token  = localStorage.getItem('ievalx_token') || localStorage.getItem('token') || '';
    const res    = await fetch(
      `/api/company/analytics/export/pdf/?period=${period}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) throw new Error(`PDF export failed (${res.status})`);
    return { data: await res.blob() };
  },

  exportCSV: async (range = 'all') => {
    const period = PERIOD_MAP[range] ?? 'all';
    const token  = localStorage.getItem('ievalx_token') || localStorage.getItem('token') || '';
    const res    = await fetch(
      `/api/company/analytics/export/csv/?period=${period}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) throw new Error(`CSV export failed (${res.status})`);
    return { data: await res.blob() };
  },
};
export default analyticsService;
