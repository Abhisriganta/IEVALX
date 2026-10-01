// BUILD: 2026-08-25-iaem-caseService-v2
// Phase 6: HR case management — queue, detail, resolve, context, comment, reopen, state
// Backend endpoints: /api/iaem/hr/cases/*
import api from '../axiosInstance';

const BASE = '/iaem/hr/cases';

const pk = (id) => {
  if (typeof id === 'number') return id;
  const m = String(id).match(/(\d+)/);
  return m ? parseInt(m[1], 10) : id;
};

const caseService = {

  // ── Case Queue ────────────────────────────────────────────────────────
  // GET /api/iaem/hr/cases/?state=OPEN&severity=HIGH&sla_status=breached&interviewer_id=5
  // Returns: { cases: [{ case_id (display), case_pk (integer), ... }], total }
  getCaseQueue: (filters = {}) =>
    api.get(`${BASE}/`, { params: filters }),

  // ── Case Detail ───────────────────────────────────────────────────────
  // GET /api/iaem/hr/cases/<case_id>/
  // Accepts "CASE-0025" or integer 25
  // Returns: signals, audio_segment_url (presigned S3, 1hr expiry),
  //          transcript_segments, classification, model_card, comments, change_log
  getCaseDetail: (caseId) =>
    api.get(`${BASE}/${pk(caseId)}/`),

  // ── Resolve case ──────────────────────────────────────────────────────
  // POST /api/iaem/hr/cases/<case_id>/resolve/
  // resolution: NO_ACTION | COACHING_CONVERSATION | COACHING_FORMAL | FORMAL_ACTION | IGNORED
  // rationale: min 200 chars
  // co_signer_id: required for FORMAL_ACTION
  // coaching_resource_ids: optional array of resource PKs
  //
  // IMPORTANT: If resolution=IGNORED and case has A7 signal, backend does NOT resolve.
  // Instead it creates a co-sign request for compliance. Response includes pending_cosign: true.
  resolveCase: (caseId, resolution, rationale, coSignerId, coachingResourceIds) =>
    api.post(`${BASE}/${pk(caseId)}/resolve/`, {
      resolution,
      rationale,
      ...(coSignerId ? { co_signer_id: coSignerId } : {}),
      ...(coachingResourceIds?.length ? { coaching_resource_ids: coachingResourceIds } : {}),
    }),

  // ── Request Context (sends notification to interviewer) ───────────────
  // POST /api/iaem/hr/cases/<case_id>/request-context/
  // Case state changes to AWAITING_RESPONSE
  requestContext: (caseId, message) =>
    api.post(`${BASE}/${pk(caseId)}/request-context/`, { message }),

  // ── Reopen (creates new linked case; original stays unchanged for audit) ──
  // POST /api/iaem/hr/cases/<case_id>/reopen/
  reopenCase: (caseId, reason) =>
    api.post(`${BASE}/${pk(caseId)}/reopen/`, { reason }),

  // ── Add Comment ───────────────────────────────────────────────────────
  // POST /api/iaem/hr/cases/<case_id>/comment/
  addComment: (caseId, text) =>
    api.post(`${BASE}/${pk(caseId)}/comment/`, { text }),

  // ── HR Co-Sign (Formal Action) ────────────────────────────────────────
  getCoSignQueue: () =>
    api.get(`${BASE}/../cosign/`),

  approveCoSign: (cosignId) =>
    api.post(`/iaem/hr/cosign/${cosignId}/approve/`),

  rejectCoSign: (cosignId, reason) =>
    api.post(`/iaem/hr/cosign/${cosignId}/reject/`, { reason }),

  // ── Manual state change ───────────────────────────────────────────────
  // PATCH /api/iaem/hr/cases/<case_id>/state/
  // OPEN↔IN_REVIEW, AWAITING_RESPONSE→IN_REVIEW/OPEN
  changeState: (caseId, newState) =>
    api.patch(`${BASE}/${pk(caseId)}/state/`, { new_state: newState }),

  // ── Submission detail (for "View Full Evaluation Form") ───────────────
  // GET /api/iaem/hr/cases/submission/<submission_id>/
  getSubmissionDetail: (submissionId) =>
    api.get(`${BASE}/submission/${submissionId}/`),
};

export default caseService;
