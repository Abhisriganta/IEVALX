import api from '../axiosInstance';

const getCompanyId = () => {
  try {
    const raw = localStorage.getItem('ievalx_user');
    if (!raw) {
      console.warn('[adminService] Not logged in — ievalx_user missing from localStorage.');
      return null;
    }

    const user = JSON.parse(raw);
    if (!user) return null;

    // Priority 1: explicit company_id field (employer login)
    const explicitCompanyId = user.company_id ?? user.companyId ?? user.Company_Id;
    if (explicitCompanyId !== undefined && explicitCompanyId !== null) {
      return String(explicitCompanyId);
    }

    // Priority 2: role is 'company' → user.id IS company_id
    const role = String(user.role || '').toLowerCase();
    if (role === 'company' && user.id !== undefined && user.id !== null) {
      return String(user.id);
    }

    // Last resort: fall back to user.id with a warning
    if (user.id !== undefined && user.id !== null && !user.company_id) {
      console.warn(
        '[adminService] No explicit company_id and role is not "company". ' +
        'Falling back to user.id. User object:', user
      );
      return String(user.id);
    }

    console.warn('[adminService] Could not extract company_id from ievalx_user:', user);
    return null;
  } catch (e) {
    console.warn('[adminService] Failed to parse ievalx_user:', e);
    return null;
  }
};

// ──────────────────────────────────────────────────────────────────────────
// THE SERVICE
// ──────────────────────────────────────────────────────────────────────────
const adminService = {
  // ── Dashboard — GET /api/company/admin/dashboard (COMPANY JWT) ──────────
  getDashboard: () => api.get('/company/admin/dashboard'),

  // ── Employer endpoints ──────────────────────────────────────────────────
  getEmployers: () => {
    const companyId = getCompanyId();
    return api.get(`/companies/${companyId}/employers/dashboard`);
  },

  addEmployer: (data) => {
    const companyId = getCompanyId();
    return api.post('/employers/add', {
      ...data,
      company_id: Number(companyId),
    });
  },

  updateEmployer: (id, data) => {
    return api.put(`/employers/update-dashboard/${id}`, data);
  },

  removeEmployer: (id) => {
    return api.delete(`/employers/delete/${id}`);
  },

  toggleEmployerStatus: (id) => {
    return api.post(`/employers/${id}/toggle-status`);
  },

  // ── Misc company endpoints (will be split into their own services later) ──
  getCompanyProfile:    ()       => api.get('/company/profile/'),
  updateCompanyProfile: (data)   => api.patch('/company/profile/', data),
  getBillingHistory:    (params) => api.get('/company/billing/', { params }),
  getSubscription:      ()       => api.get('/company/subscription/'),
  updateSubscription:   (data)   => api.patch('/company/subscription/', data),
  getActivityLogs:      (params) => api.get('/company/activity-logs/', { params }),
};

export { adminService };
export default adminService;
