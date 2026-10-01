
import api from '../axiosInstance';

const BASE = '/iaem/interviewer';

const pk = (id) => {
  if (typeof id === 'number') return id;
  const m = String(id).match(/(\d+)/);
  return m ? parseInt(m[1], 10) : id;
};

const interviewerService = {

  // ── My Profile ──────────────────────────────────────────────────────────
  // GET /api/iaem/interviewer/profile/
  getMyProfile: () =>
    api.get(`${BASE}/profile/`),

  // PATCH /api/iaem/interviewer/profile/
  // Interviewers can edit: department, designation, skills, languages, timezone, phone
  updateMyProfile: (data) =>
    api.patch(`${BASE}/profile/`, data),

  // POST /api/iaem/interviewer/profile-photo/ — upload or replace profile photo
  uploadProfilePhoto: (file) => {
    const formData = new FormData();
    formData.append('photo', file);
    return api.post(`${BASE}/profile-photo/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // DELETE /api/iaem/interviewer/profile-photo/ — remove profile photo
  deleteProfilePhoto: () =>
    api.delete(`${BASE}/profile-photo/`),


    getDashboardSummary: (params) =>
    api.get(`${BASE}/dashboard/`, { params }),


  getSlotRequests: () =>
    api.get(`${BASE}/slot-requests/`),


  getMySubmittedSlots: (releaseId) =>
    api.get(`${BASE}/slots/${pk(releaseId)}/`),


  submitSlots: (releaseId, slots) =>
    api.post(`${BASE}/slots/${pk(releaseId)}/submit/`, { slots }),

  getSubmissionContext: (bookingId) =>
    api.get(`${BASE}/submission/${pk(bookingId)}/context/`),

  submitEvaluation: (bookingId, payload) =>
    api.post(`${BASE}/submission/${pk(bookingId)}/`, payload),

  // ── Non-IAEM (audit OFF) — same form, different data pipe ───────────────
  getNonIAEMContext: (siId) =>
    api.get(`${BASE}/submission/si/${pk(siId)}/context/`),

  submitNonIAEMEvaluation: (siId, payload) =>
    api.post(`${BASE}/submission/si/${pk(siId)}/`, payload),

  // ── Completed Interviews ────────────────────────────────────────────────
  // GET /api/iaem/interviewer/completed-interviews/
  getCompletedInterviews: () =>
    api.get(`${BASE}/completed-interviews/`),

  // GET /api/iaem/interviewer/completed-interviews/<submission_id>/
  getCompletedInterviewDetail: (submissionId) =>
    api.get(`${BASE}/completed-interviews/${submissionId}/`),
};

export default interviewerService;
