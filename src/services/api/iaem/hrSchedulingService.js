import api from '../axiosInstance';

const BASE = '/iaem/hr/scheduling';

const pk = (id) => {
  if (typeof id === 'number') return id;
  const m = String(id).match(/(\d+)/);
  return m ? parseInt(m[1], 10) : id;
};

const hrSchedulingService = {


  getSchedulableRounds: () =>
    api.get(`${BASE}/rounds/`),

  // ── Participants in a specific round ───────────────────────────────────
  // GET /api/iaem/hr/scheduling/rounds/<process_id>/<round_config_id>/participants/
  getRoundParticipants: (processId, roundConfigId) =>
    api.get(`${BASE}/rounds/${processId}/${roundConfigId}/participants/`),

  // ── Release list ──────────────────────────────────────────────────────
  // GET /api/iaem/hr/scheduling/releases/
  getReleases: () =>
    api.get(`${BASE}/releases/`),

  createRelease: (processId, roundConfigId, auditEnabled, slotDeadline, level, durationMins, reRelease = false, interviewStart = null, interviewEnd = null) =>
    api.post(`${BASE}/releases/create/`, {
      process_id: processId,
      round_config_id: roundConfigId,
      audit_enabled: auditEnabled,
      slot_deadline: slotDeadline,
      level: level || '',
      duration_mins: durationMins || 45,
      ...(reRelease ? { re_release: true } : {}),
      ...(interviewStart ? { interview_start: interviewStart } : {}),
      ...(interviewEnd ? { interview_end: interviewEnd } : {}),
    }),

  // ── Deactivate a release (e.g. round removed from pipeline) ───────────
  // POST /api/iaem/hr/scheduling/releases/<release_id>/deactivate/
  deactivateRelease: (releaseId, reason) =>
    api.post(`${BASE}/releases/${pk(releaseId)}/deactivate/`, { reason }),

  // ── Slot supply review (HR checks demand vs supply before releasing) ──
  // GET /api/iaem/hr/scheduling/releases/<release_id>/supply-review/
  getSupplyReview: (releaseId) =>
    api.get(`${BASE}/releases/${pk(releaseId)}/supply-review/`),

  // ── Release slots to candidates (HR flips the switch) ─────────────────
  // POST /api/iaem/hr/scheduling/releases/<release_id>/release-to-candidates/
  releaseToCandidates: (releaseId) =>
    api.post(`${BASE}/releases/${pk(releaseId)}/release-to-candidates/`),

  // ── Update booking status (no-show, reschedule, etc.) ─────────────────
  // POST /api/iaem/hr/scheduling/bookings/<booking_id>/status/
  updateBookingStatus: (bookingId, newStatus) =>
    api.post(`${BASE}/bookings/${pk(bookingId)}/status/`, { status: newStatus }),

  // ── Eligible interviewers for a job (works before release exists) ─────
  // GET /api/iaem/hr/scheduling/job/<job_id>/eligible-interviewers/
  getEligibleInterviewers: (jobId) =>
    api.get(`${BASE}/job/${jobId}/eligible-interviewers/`),

  // ── Matched interviewers for a release ────────────────────────────────
  // GET /api/iaem/hr/scheduling/releases/<release_id>/interviewers/
  getReleaseInterviewers: (releaseId) =>
    api.get(`${BASE}/releases/${pk(releaseId)}/interviewers/`),

  // ── Slot details for a release (individual slots + candidate count) ───
  // GET /api/iaem/hr/scheduling/releases/<release_id>/slot-details/
  getReleaseSlotDetails: (releaseId) =>
    api.get(`${BASE}/releases/${pk(releaseId)}/slot-details/`),
  // ── Matched interviewers for a release ────────────────────────────────
  // GET /api/iaem/hr/scheduling/releases/<release_id>/interviewers/
  getReleaseInterviewers: (releaseId) =>
    api.get(`${BASE}/releases/${pk(releaseId)}/interviewers/`),

  // ── Slot details for a release (individual slots + candidate count) ───
  // GET /api/iaem/hr/scheduling/releases/<release_id>/slot-details/
  getReleaseSlotDetails: (releaseId) =>
    api.get(`${BASE}/releases/${pk(releaseId)}/slot-details/`),

  // ── Reschedule tab (Problem 2 — interviewer no-show + all pending) ────
  // GET /api/iaem/hr/scheduling/releases/<release_id>/reschedule-requests/
  getRescheduleRequests: (releaseId) =>
    api.get(`${BASE}/releases/${pk(releaseId)}/reschedule-requests/`),

  // POST /api/iaem/hr/scheduling/bookings/<booking_id>/reschedule/approve/
  approveReschedule: (bookingId) =>
    api.post(`${BASE}/bookings/${pk(bookingId)}/reschedule/approve/`),

  // POST /api/iaem/hr/scheduling/bookings/<booking_id>/reschedule/reject/
  rejectReschedule: (bookingId) =>
    api.post(`${BASE}/bookings/${pk(bookingId)}/reschedule/reject/`),

  // ── Reschedule tab (full workflow) ─────────────────────────────────
  // GET /api/iaem/hr/scheduling/releases/<release_id>/reschedule-tab/
  getRescheduleTabData: (releaseId) =>
    api.get(`${BASE}/releases/${pk(releaseId)}/reschedule-tab/`),

  // POST /api/iaem/hr/scheduling/releases/<release_id>/request-reschedule-slots/
  requestRescheduleSlots: (releaseId, data = {}) =>
    api.post(`${BASE}/releases/${pk(releaseId)}/request-reschedule-slots/`, data),

  // POST /api/iaem/hr/scheduling/releases/<release_id>/release-reschedule-slots/
  releaseRescheduleSlots: (releaseId) =>
    api.post(`${BASE}/releases/${pk(releaseId)}/release-reschedule-slots/`),

  // GET /api/iaem/hr/scheduling/reschedules-summary/
  getReschedulesSummary: () =>
    api.get(`${BASE}/reschedules-summary/`),
};

export default hrSchedulingService;