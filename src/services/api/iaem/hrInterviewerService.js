
import api from '../axiosInstance';

const BASE = '/iaem/hr/interviewers';

const pk = (id) => {
  if (typeof id === 'number') return id;
  const m = String(id).match(/(\d+)/);
  return m ? parseInt(m[1], 10) : id;
};

const hrInterviewerService = {


  getInterviewers: (filters = {}) =>
    api.get(`${BASE}/`, { params: filters }),

  getApprovalQueue: () =>
    api.get(`${BASE}/approvals/`),

  
  approveRegistration: (interviewerId) =>
    api.post(`${BASE}/${pk(interviewerId)}/approve/`),

  // ── Reject registration ───────────────────────────────────────────────
  // POST /api/iaem/hr/interviewers/<id>/reject/
  rejectRegistration: (interviewerId, reason, notes) =>
    api.post(`${BASE}/${pk(interviewerId)}/reject/`, { reason, notes }),

  // ── Profile detail ────────────────────────────────────────────────────
  // GET /api/iaem/hr/interviewers/<id>/
  getInterviewerDetail: (interviewerId) =>
    api.get(`${BASE}/${pk(interviewerId)}/`),


  updateInterviewer: (interviewerId, data) =>
    api.patch(`${BASE}/${pk(interviewerId)}/`, data),


  changeLifecycleState: (interviewerId, newState) =>
    api.post(`${BASE}/${pk(interviewerId)}/lifecycle/`, { new_state: newState }),
};

export default hrInterviewerService;
