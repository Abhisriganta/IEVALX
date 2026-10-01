import axiosInstance from '../axiosInstance';

const unwrap = (promise) =>
  promise
    .then((res) => res.data)
    .catch((err) => {
      const data = err?.response?.data;
      const msg  = data?.Error || data?.error || data?.message || err?.message || 'Request failed';
      const e    = new Error(msg);
      e.status   = err?.response?.status;
      throw e;
    });

const candidateService = {
  list: (params = {}) =>
    unwrap(axiosInstance.get('/employer/candidates', { params })),

  updateStatus: (applicationId, applicationStatus) =>
    unwrap(axiosInstance.put(
      `/jobs/application/${applicationId}/status`,
      { application_status: applicationStatus },
    )),
};

export default candidateService;

// ── Interview API — all URLs corrected to match backend router ────────────────
// axiosInstance already has /api in its baseURL — do NOT add it again here
const BASE = '/employer/interviews';

export const interviewAPI = {

  // ── Dashboard ───────────────────────────────────────────────────────────────
  getInterviewDashboard: () =>
    axiosInstance.get(`${BASE}/dashboard/`).catch(() => ({ data: {} })),

  // ── Processes ───────────────────────────────────────────────────────────────
  getProcesses: (params = {}) =>
    axiosInstance.get(`${BASE}/processes/`, { params }).catch(() => ({ data: [] })),
  createProcess: (payload) =>
    axiosInstance.post(`${BASE}/processes/`, payload),
  updateProcess: (id, payload) =>
    axiosInstance.patch(`${BASE}/processes/${id}/`, payload),
  closeProcess: (id, force = false) =>
    axiosInstance.post(`${BASE}/processes/${id}/close/`, { force }),

  // ── Rounds ──────────────────────────────────────────────────────────────────
  createRound: (processId, payload) =>
    axiosInstance.post(`${BASE}/processes/${processId}/rounds/`, payload),
  updateRound: (id, payload) =>
    axiosInstance.patch(`${BASE}/rounds/${id}/`, payload),
  deleteRound: (id) =>
    axiosInstance.delete(`${BASE}/rounds/${id}/`),
  // ── Pipeline round sync (after add/remove rounds on edit) ──
  syncProcessRounds: (processId) =>
    axiosInstance.post(`${BASE}/schedule/sync-rounds/${processId}/`),

  // ── Scheduled interviews ────────────────────────────────────────────────────
  getScheduled: (params = {}) =>
    axiosInstance.get(`${BASE}/schedule/`, { params }).catch(() => ({ data: [] })),
  bulkSchedule: (payload) =>
    axiosInstance.post(`${BASE}/schedule/bulk/`, payload),
  confirmSchedule: (payload) =>
    axiosInstance.post(`${BASE}/schedule/confirm/`, payload),
  deleteScheduled: (id) =>
    axiosInstance.delete(`${BASE}/schedule/${id}/`),
  // PATCH one scheduled interview (window/date/duration). Backend's edit
  // serializer locks identity fields read-only, so this is window-safe.
  updateScheduled: (id, payload) =>
    axiosInstance.patch(`${BASE}/schedule/${id}/`, payload),

  // ── Old slot management methods REMOVED ─────────────────────────────────
  // getSlots, deleteSlot, createAvailability, sendBookingInvites — removed.
  // Live-video scheduling is now handled by IAEM (hrSchedulingService,
  // jobseekerSlotService, interviewerService).

  deleteProcess: (id) => axiosInstance.delete(`/employer/interviews/processes/${id}/`),

  markCompleted: (id) =>
    axiosInstance.post(`${BASE}/schedule/${id}/mark-completed/`),
  syncManualAssessment: (id) =>
    axiosInstance.post(`${BASE}/schedule/${id}/sync-manual-assessment/`),
  repairManualAssignment: (id) =>
    axiosInstance.post(`${BASE}/schedule/${id}/repair-manual-assignment/`),

  // ✅ Corrected: was /schedule/${id}/send-invite/
  sendInvite: (id, body = {}) =>
    axiosInstance.post(`${BASE}/schedule/${id}/invite/`, body),

  sendReminder: (id) =>
    axiosInstance.post(`${BASE}/schedule/${id}/reminder/`),
  handleMissedRound: (id) =>
    axiosInstance.post(`${BASE}/schedule/${id}/missed/`),
  autoRejectNonAttempts: (processId, roundNumber) =>
    axiosInstance.post(`${BASE}/schedule/auto-reject/${processId}/round/${roundNumber}/`),
  getDocResult: (id) =>
    axiosInstance.get(`${BASE}/schedule/${id}/doc-result/`).catch(() => ({ data: {} })),
  getInviteLogs: (id) =>
    axiosInstance.get(`${BASE}/schedule/${id}/invite-logs/`).catch(() => ({ data: [] })),

  // ── Live interviews ─────────────────────────────────────────────────────────

 getLiveInterviews: () =>
    axiosInstance.get(`${BASE}/live/interviews/`).catch(() => ({ data: [] })),

  getRecording: (roomName) =>
    axiosInstance.get(`${BASE}/live/recording/${roomName}/`),

  getInterviewChat: (interviewId) =>
    axiosInstance.get(`${BASE}/live/interviews/${interviewId}/chat/`),

  admitCandidate: (slotId) =>
    axiosInstance.post(`${BASE}/slots/${slotId}/admit/`),

  getSlotStatus: (slotId) =>
    axiosInstance.get(`${BASE}/slots/${slotId}/`),

  startVideoSession: (id) =>
    axiosInstance.post(`${BASE}/live/interviews/${id}/start-session/`),

  rescheduleLiveInterview: (id, payload) =>
    axiosInstance.patch(`${BASE}/live/interviews/${id}/reschedule/`, payload),

  // ── Video sessions ──────────────────────────────────────────────────────────
  endVideoSession: (sessionId, payload) =>
    axiosInstance.post(`${BASE}/video/session/${sessionId}/end/`, payload),
  updateVideoSession: (sessionId, payload) =>
    axiosInstance.patch(`${BASE}/video/session/${sessionId}/update/`, payload),
  sendChatMessage: (sessionId, payload) =>
    axiosInstance.post(`${BASE}/video/session/${sessionId}/chat/`, payload),

  // ── Rankings & status ───────────────────────────────────────────────────────
  // ✅ Corrected: was /processes/${processId}/rankings/${round}/
  getRanking: (processId, round) =>
    axiosInstance
      .get(`${BASE}/ranking/${processId}/round/${round}/`),

getRoundStatus: (processId, round) =>
    axiosInstance
      .get(`${BASE}/status/${processId}/round/${round}/`)
      .catch(() => ({ data: [] })),
  getCandidateScoreDetail: (processId, round, candidateId) =>
    axiosInstance.get(`${BASE}/status/${processId}/round/${round}/candidate/${candidateId}/scores/`),
  applyRoundThreshold: (processId, round, payload) =>
    axiosInstance.post(
      `${BASE}/ranking/${processId}/round/${round}/apply-threshold/`,
      payload,
    ),

  // ✅ Corrected: was /processes/${processId}/rankings/${round}/status/${candidateId}/
  setCandidateStatus: (processId, round, candidateId, payload) =>
    axiosInstance.post(
      `${BASE}/status/${processId}/round/${round}/candidate/${candidateId}/`,
      payload,
    ),

  // ── Results ─────────────────────────────────────────────────────────────────
  createResult: (payload) =>
    axiosInstance.post(`${BASE}/results/create/`, payload),
  getResult: (id) =>
    axiosInstance.get(`${BASE}/results/${id}/`).catch(() => ({ data: {} })),
  updateResult: (id, payload) =>
    axiosInstance.patch(`${BASE}/results/${id}/`, payload),

  // ── Pending pool ────────────────────────────────────────────────────────────
  getPendingCandidates: (processId, params = {}) =>
    axiosInstance.get(`${BASE}/pending/${processId}/`, { params }).catch(() => ({ data: [] })),
  recallPendingCandidates: (processId, payload) =>
    axiosInstance.post(`${BASE}/pending/${processId}/recall/`, payload),

  // ── Hiring ──────────────────────────────────────────────────────────────────
  // ✅ Corrected: was /hiring/outcome/
  recordHiringOutcome: (payload) =>
    axiosInstance.post(`${BASE}/hiring-outcome/`, payload),
  getHiringOutcomes: (processId) =>
    axiosInstance
      .get(`${BASE}/hiring-outcome/`, { params: { process_id: processId } })
      .catch(() => ({ data: [] })),
  updateHiringOutcome: (id, payload) =>
    axiosInstance.patch(`${BASE}/hiring-outcome/${id}/`, payload),
  completeHiring: (payload) =>
    axiosInstance.post(`${BASE}/hiring-complete/`, payload),
  getHiringRecords: (processId) =>
    axiosInstance
      .get(`${BASE}/hiring-records/`, {
        params: processId ? { process_id: processId } : {},
      })
      .catch(() => ({ data: [] })),

  // ── Feedback ────────────────────────────────────────────────────────────────
  getFeedbackByInterview: (interviewId) =>
    axiosInstance
      .get(`${BASE}/feedback/interview/${interviewId}/`)
      .catch(() => ({ data: {} })),
  getFeedbackSummary: (processId, round = 0) =>
    axiosInstance
      .get(`${BASE}/feedback/summary/${processId}/`, { params: { round } })
      .catch(() => ({ data: {} })),
  getFeedbackList: (processId) =>
    axiosInstance
      .get(`${BASE}/feedback/list/${processId}/`)
      .catch(() => ({ data: [] })),
  getMyFeedback: (interviewId) =>
    axiosInstance
      .get(`${BASE}/feedback/${interviewId}/mine/`)
      .catch(() => ({ data: [] })),
  submitFeedback: (interviewId, payload) =>
    axiosInstance.post(`${BASE}/feedback/${interviewId}/submit/`, payload),

  // ── Analytics ───────────────────────────────────────────────────────────────
  getAnalytics: (processId) =>
    axiosInstance
      .get(`${BASE}/analytics/`, {
        params: processId ? { process_id: processId } : {},
      })
      .catch(() => ({ data: {} })),

  // ── Document interviews ─────────────────────────────────────────────────────
  uploadDocument: (formData) =>
    axiosInstance.post(`${BASE}/document/upload/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getDocument: (id) =>
    axiosInstance.get(`${BASE}/document/${id}/`),
  getDocumentQuestions: (docId) =>
    axiosInstance
      .get(`${BASE}/document/${docId}/questions/`)
      .catch(() => ({ data: [] })),
  approveDocumentQuestions: (docId, payload) =>
    axiosInstance.post(`${BASE}/document/${docId}/questions/approve/`, payload),
  launchDocumentInterview: (docId) =>
    axiosInstance.post(`${BASE}/document/${docId}/launch/`),
  updateQuestion: (id, payload) =>
    axiosInstance.patch(`${BASE}/questions/${id}/`, payload),

  // ── AI interviews ───────────────────────────────────────────────────────────
  createAIConfig: (payload) =>
    axiosInstance.post(`${BASE}/ai/config/`, payload),
  getAIConfig: (id) =>
    axiosInstance.get(`${BASE}/ai/config/${id}/`),
  generateAIQuestions: (configId) =>
    axiosInstance.post(`${BASE}/ai/config/${configId}/generate/`),
  getAIQuestions: (configId) =>
    axiosInstance
      .get(`${BASE}/ai/config/${configId}/questions/`)
      .catch(() => ({ data: [] })),
  launchAIInterview: (configId) =>
    axiosInstance.post(`${BASE}/ai/config/${configId}/launch/`),
  getAISessions: (configId) =>
    axiosInstance
      .get(`${BASE}/ai/config/${configId}/sessions/`)
      .catch(() => ({ data: [] })),
  updateAIQuestion: (id, payload) =>
    axiosInstance.patch(`${BASE}/ai/questions/${id}/`, payload),
  startAISession: (configId) =>
    axiosInstance.post(`${BASE}/ai/session/start/${configId}/`),
  getAISession: (id) =>
    axiosInstance.get(`${BASE}/ai/session/${id}/`),
  submitAISession: (id, payload) =>
    axiosInstance.post(`${BASE}/ai/session/${id}/submit/`, payload),

  // ── Slot booking (live interview) ───────────────────────────────────────────
  // createSlotAvailability, sendBookingInvites — REMOVED (IAEM handles live-video)

  flagFraud: (sessionId, payload) =>
    axiosInstance.post(`${BASE}/ai/session/${sessionId}/flag-fraud/`, payload),

  // ── Soft-delete for Interview Rounds Done tab ─────────────────────────────
  hideScheduled:   (ids) => axiosInstance.post(`${BASE}/schedule/hide/`,   { ids }),
  unhideScheduled: (ids) => axiosInstance.post(`${BASE}/schedule/unhide/`, { ids }),

  // ══════════════════════════════════════════════════════════════════════════
  // MULTI-PIPELINE REBUILD (backend P1–P6)
  //
  //  R1 a job holds MANY pipelines · R2 membership is a frozen snapshot ·
  //  R3 Candidates page is schedule-only · R4 stage-based approve/reject ·
  //  R5 round-scoped reschedule · R6 grandfathering · R7 decisions permanent
  //
  //  NOTE ON ROUND IDS: every endpoint below takes a **round_config_id**
  //  (the RoundConfiguration PK), NOT a round number. Round numbers are now
  //  display-only and renumber whenever the pipeline is edited — joining on
  //  the PK is what makes grandfathered (removed) rounds addressable.
  // ══════════════════════════════════════════════════════════════════════════

  // ── Pipeline members (this pipeline's snapshot ONLY) ──────────────────────
  // params.round_config_id may reference a REMOVED round → returns only the
  // grandfathered members still living inside it.
  getPipelineMembers: (processId, params = {}) =>
    axiosInstance
      .get(`${BASE}/processes/${processId}/members/`, { params })
      .catch(() => ({ data: null })),

  // ── Decision engine — approve → next round / Hire pool · reject ───────────
  // payload: { action: 'approve' | 'reject', candidate_ids: [...] }
  // returns: { applied, results[{candidate_id, outcome, next_round}],
  //            skipped[{candidate_id, name, reason}] }
  // Works identically when roundConfigId is a REMOVED round (R6).
  decideRound: (processId, roundConfigId, payload) =>
    axiosInstance.post(
      `${BASE}/processes/${processId}/rounds/${roundConfigId}/decide/`,
      payload,
      // Hard timeout: when the backend is down/502ing, an untimed POST
      // hangs the promise forever and the Approve click looks like
      // "nothing happened". 15s → clean error → visible snackbar.
      { timeout: 15000 },
    ),

  // ── Round-scoped reschedule (R5) ─────────────────────────────────────────
  // Grouped by round; ONLY rounds with >=1 pending request are returned.
  // Removed rounds appear too, flagged is_removed — same flow for their
  // grandfathered members.
  getRescheduleRequests: (processId) =>
    axiosInstance
      .get(`${BASE}/schedule/reschedule-requests/${processId}/`)
      .catch(() => ({ data: { rounds: [], total_requests: 0 } })),

  // payload: { round_config_id, window_start, window_end, si_ids? }
  // Applies to that ONE round only; the affected candidates resume FROM it
  // (their later active rounds re-lock).
  applyReschedule: (processId, payload) =>
    axiosInstance.post(
      `${BASE}/schedule/reschedule-requests/${processId}/apply/`,
      payload,
    ),

  // Employer-side flag (the jobseeker calls the same route from their portal)
  requestReschedule: (scheduledInterviewId, reason = '') =>
    axiosInstance.post(
      `${BASE}/schedule/${scheduledInterviewId}/request-reschedule/`,
      { reason },
    ),
};