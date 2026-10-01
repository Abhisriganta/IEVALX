import axiosInstance from '../axiosInstance';

const BASE = '/employer/jobs';

/* ── Identity helpers (mirrors the old jobPost.js) ──────────────── */
const getStoredUser = () => {
  try {
    const raw = localStorage.getItem('ievalx_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const getCompanyId = () => {
  const u = getStoredUser();
  if (!u) return null;
  const explicit = u.company_id ?? u.companyId ?? u.Company_Id;
  if (explicit != null) return Number(explicit);
  const role = String(u.role || '').toLowerCase();
  if (role === 'company' && u.id != null) return Number(u.id);
  return u.id != null ? Number(u.id) : null;
};

const getEmployerId = () => {
  const u = getStoredUser();
  if (!u) return null;
  const explicit = u.employer_id ?? u.employerId;
  if (explicit != null) return Number(explicit);
  const EMPLOYER_ROLES = new Set([
    'employer', 'hiring_manager', 'recruiter', 'viewer',
  ]);
  const role = String(u.role || '').toLowerCase();
  if (EMPLOYER_ROLES.has(role) && u.id != null) return Number(u.id);
  return null;   // company_admin/unknown → backend auto-resolves
};

/* Add company_id + employer_id only if the caller didn't already set them. */
const withIdentity = (payload = {}) => {
  const out = { ...payload };
  if (out.company_id == null && out.companyId == null) {
    const cid = getCompanyId();
    if (cid != null) out.company_id = cid;
  }
  if (out.employer_id == null && out.employerId == null) {
    const eid = getEmployerId();
    if (eid != null) out.employer_id = eid;
  }
  return out;
};

/* ── Error unwrap ───────────────────────────────────────────────── */
const unwrap = (promise) =>
  promise
    .then((res) => res.data)
    .catch((err) => {
      const data = err?.response?.data;
      const msg =
        data?.Error || data?.error || data?.message ||
        err?.message || 'Request failed';
      const e = new Error(msg);
      e.status = err?.response?.status;
      e.data = data;
      throw e;
    });

/* ── Service ────────────────────────────────────────────────────── */
const jobService = {
  listMyJobs: (statusDisplayLabel = '') => {
    const params =
      statusDisplayLabel && statusDisplayLabel !== 'all'
        ? { status: statusDisplayLabel }
        : {};
    return unwrap(axiosInstance.get(`${BASE}/`, { params }));
  },
  getJobDetail:      (id)      => unwrap(axiosInstance.get(`${BASE}/${id}/`)),
  createJob:         (payload) => unwrap(axiosInstance.post(`${BASE}/create/`, withIdentity(payload))),
  updateJob:         (id, p)   => unwrap(axiosInstance.put(`${BASE}/${id}/update/`, withIdentity(p))),
  deleteJob:         (id)      => unwrap(axiosInstance.delete(`${BASE}/${id}/delete/`)),
  submitForApproval: (id)      => unwrap(axiosInstance.post(`${BASE}/${id}/submit-approval/`)),
  publishJob:        (id)      => unwrap(axiosInstance.post(`${BASE}/${id}/publish/`)),
  unpublishJob:      (id)      => unwrap(axiosInstance.post(`${BASE}/${id}/unpublish/`)),

  /* ── Edit-access flow (employer side) ─────────────────────────── */
  // File a request to the Company Admin to edit a specific job.
  requestEditAccess: (id, reason) =>
    unwrap(axiosInstance.post(`${BASE}/${id}/request-edit-access/`, { reason })),

 
  getEditRequestStatus: (id) =>
    unwrap(axiosInstance.get(`${BASE}/${id}/edit-request-status/`)),


  requestRepublish: (id, reason) =>
    unwrap(axiosInstance.post(`${BASE}/${id}/request-republish/`, withIdentity({ reason }))),

  getRepublishRequestStatus: (id) =>
    unwrap(axiosInstance.get(`${BASE}/${id}/republish-request-status/`)),
};

export default jobService;