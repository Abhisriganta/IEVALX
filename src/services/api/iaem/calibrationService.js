// BUILD: 2026-09-04-iaem-calibrationService-v5
// Calibration: skill-filtered sessions + video upload + video proxy
import api from '../axiosInstance';

const pk = (id) => {
  if (typeof id === 'number') return id;
  const m = String(id).match(/(\d+)/);
  return m ? parseInt(m[1], 10) : id;
};

const calibrationService = {

  // ── HR: List sessions ─────────────────────────────────────────────────
  getSessions: () => api.get('/iaem/hr/calibration/sessions/'),

  // ── HR: Create session (with skills for filtering) ────────────────────
  createSession: (level, deadline, skills = []) =>
    api.post('/iaem/hr/calibration/sessions/create/', { level, deadline, skills }),

  // ── HR: Upload reference video ────────────────────────────────────────
  uploadReference: (sessionId, file, title, description = '') => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('title', title);
    fd.append('description', description);
    return api.post(
      `/iaem/hr/calibration/sessions/${pk(sessionId)}/references/upload/`,
      fd, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 0 },
    );
  },

  // ── HR: Delete reference video ────────────────────────────────────────
  deleteReference: (referenceId) =>
    api.delete(`/iaem/hr/calibration/references/${pk(referenceId)}/`),

  // ── HR: Session detail ────────────────────────────────────────────────
  getSessionTracking: (sessionId) =>
    api.get(`/iaem/hr/calibration/sessions/${pk(sessionId)}/`),

  // ── HR: Baselines ─────────────────────────────────────────────────────
  getBaselines: () => api.get('/iaem/hr/calibration/baselines/'),

  // ── HR: Edit a calibration score (anti-gaming) ────────────────────────
  editScore: (scoreId, updates) =>
    api.patch(`/iaem/hr/calibration/scores/${pk(scoreId)}/`, updates),

  // ── HR: Get all unique skills from company interviewers ───────────────
  getCompanySkills: () => api.get('/iaem/hr/calibration/skills/'),

  // ── Interviewer: My sessions ──────────────────────────────────────────
  getMySessions: () => api.get('/iaem/interviewer/calibration/'),

  // ── Interviewer: Session detail with video URLs ───────────────────────
  getSessionDetail: (sessionId) =>
    api.get(`/iaem/interviewer/calibration/${pk(sessionId)}/`),

  // ── Interviewer: Score a reference ────────────────────────────────────
  submitCalibrationScore: (sessionId, referenceId, scores) =>
    api.post(`/iaem/interviewer/calibration/${pk(sessionId)}/score/`, {
      reference_interview_id: referenceId, ...scores,
    }),

  // ── Interviewer: My baselines ─────────────────────────────────────────
  getMyBaseline: () => api.get('/iaem/interviewer/calibration/baseline/'),
};

export default calibrationService;
