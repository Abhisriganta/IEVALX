import api from '../axiosInstance';


const getCompanyId = () => {
  try {
    const raw = localStorage.getItem('ievalx_user');
    if (!raw) {
      console.warn('[jobPost] Not logged in — ievalx_user missing from localStorage.');
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
        '[jobPost] No explicit company_id and role is not "company". ' +
        'Falling back to user.id. User object:', user
      );
      return String(user.id);
    }

    console.warn('[jobPost] Could not extract company_id from ievalx_user:', user);
    return null;
  } catch (e) {
    console.warn('[jobPost] Failed to parse ievalx_user:', e);
    return null;
  }
};

const getEmployerId = () => {
  try {
    const raw = localStorage.getItem('ievalx_user');
    if (!raw) return null;

    const user = JSON.parse(raw);
    if (!user) return null;

    const role = String(user.role || '').toLowerCase();

 
    const COMPANY_ROLES = new Set(['company', 'company_admin']);
    if (COMPANY_ROLES.has(role)) return null;
    const explicit = user.employer_id ?? user.employerId;
    if (explicit !== undefined && explicit !== null) {
      return String(explicit);
    }

    // user.id is treated as employer_id ONLY for explicit employer-side roles.
    const EMPLOYER_ROLES = new Set([
      'employer', 'hiring_manager', 'recruiter', 'viewer',
    ]);
    if (EMPLOYER_ROLES.has(role) && user.id !== undefined && user.id !== null) {
      return String(user.id);
    }

    // Default — no employer context. Backend will auto-pick COMPANY_ADMIN.
    return null;
  } catch (e) {
    console.warn('[jobPost] Failed to parse ievalx_user for employer_id:', e);
    return null;
  }
};

const sanitizeJobPayload = (form) => {
  const { disabilityProof, ...rest } = form;
  if (disabilityProof instanceof File) {
    console.warn(
      '[jobPost] disabilityProof file was dropped from payload. ' +
      'File uploads require a multipart endpoint (not wired yet).'
    );
  }
  return rest;
};
// ──────────────────────────────────────────────────────────────────────────
// THE SERVICE
// ──────────────────────────────────────────────────────────────────────────
// Build viewer context for the backend's role-based visibility filter.
// Without these, the backend defaults to jobseeker visibility (PUBLISHED+APPROVED only)
// which hides DRAFT/PENDING jobs from the company's own admin dashboard.
const buildViewerParams = (extra = {}) => {
  const companyId = getCompanyId();
  const employerId = getEmployerId();
  const params = { ...(extra || {}) };

  if (companyId) params.viewer_company_id = companyId;

  if (employerId) {
    params.viewer_employer_id = employerId;
    params.viewer_role = 'HIRING_MANAGER';
  } else if (companyId) {
    params.viewer_role = 'COMPANY_ADMIN';
  }
  return params;
};

const jobPost = {
  getJobPostings: (params) => {
    const companyId = getCompanyId();
    const employerId = getEmployerId();
    const merged = buildViewerParams(params || {});

    if (employerId) {
      return api.get(`/employers/${employerId}/jobs`, { params: merged });
    }
    if (companyId) {
      return api.get(`/companies/${companyId}/jobs`, {
        params: { ...merged, posted_via: 'COMPANY' },
      });
    }
    return Promise.reject(new Error('Not logged in.'));
  },

  // All jobs for the company (COMPANY- and EMPLOYER-posted), no posted_via
  // filter — Ownership management needs employee-posted jobs (which carry
  // employer_id) visible alongside unassigned company posts.
  getAllCompanyJobs: (params) => {
    const companyId = getCompanyId();
    if (!companyId) return Promise.reject(new Error('Not logged in.'));
    return api.get(`/companies/${companyId}/jobs`, {
      params: buildViewerParams(params || {}),
    });
  },

  // Pass viewer context so DRAFT/PENDING jobs are visible in View/Edit modals.
  getJobPosting: (id) => api.get(`/jobs/${id}`, { params: buildViewerParams() }),

  // ── Create / update / delete ────────────────────────────────────────────
  createJobPosting: (data) => {
    const companyId = getCompanyId();
    const employerId = getEmployerId();

    if (!companyId) {
      return Promise.reject(new Error('No company_id available — please log in.'));
    }

    const payload = {
      ...sanitizeJobPayload(data),
      company_id: Number(companyId),
    };
    if (employerId) {
      payload.employer_id = Number(employerId);
    }
    return api.post('/jobs/create', payload);
  },

  // Backend uses PUT (not PATCH) at /api/jobs/update/<id>.
  updateJobPosting: (id, data) => {
    const payload = sanitizeJobPayload(data);
    return api.put(`/jobs/update/${id}`, payload);
  },

  // Backend route: DELETE /api/jobs/delete/<id>
  deleteJobPosting: (id) => api.delete(`/jobs/delete/${id}`),
  saveJobDraft: (data) => {
    const companyId = getCompanyId();
    const employerId = getEmployerId();

    if (!companyId) {
      return Promise.reject(new Error('No company_id available — please log in.'));
    }

    const payload = {
      ...sanitizeJobPayload(data),
      company_id: Number(companyId),
      status: 'draft',
    };
    if (employerId) {
      payload.employer_id = Number(employerId);
    }
    return api.post('/jobs/create', payload);
  },

  // ── Approval workflow (admin actions) ──────────────────────────────────
  approveJob: (id, approvedBy) =>
    api.post(`/jobs/${id}/approve`, { approved_by: Number(approvedBy) }),

  rejectJob: (id, approvedBy, rejectionReason) =>
    api.post(`/jobs/${id}/reject`, {
      approved_by: Number(approvedBy),
      rejection_reason: rejectionReason,
    }),

  // ── Status transitions ──────────────────────────────────────────────────
  publishJob:   (id) => api.post(`/jobs/${id}/publish`),
  unpublishJob: (id) => api.post(`/jobs/${id}/unpublish`),
  closeJob:     (id) => api.post(`/jobs/${id}/close`),

  // ── Public search ───────────────────────────────────────────────────────
  // Backend route: GET /api/jobs/search?q=...&city=...&job_type=...&shift=...
  searchJobs: (params) => api.get('/jobs/search', { params }),

  // ── Ownership reassignment (Company Admin only) ─────────────────────────
  reassignJobOwner: (jobId, newEmployeeId) =>
    api.post(`/admin/jobs/${jobId}/reassign/`, { new_employee_id: Number(newEmployeeId) }),
};

export { jobPost };
export default jobPost;