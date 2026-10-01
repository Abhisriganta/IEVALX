// BUILD: 2026-08-25-iaem-interviewerCaseService-v2
// Phase 7: Interviewer's resolved cases + appeals
// Backend endpoints: /api/iaem/interviewer/cases/*, /api/iaem/interviewer/appeals/*
import api from '../axiosInstance';

const BASE = '/iaem/interviewer';

const pk = (id) => {
  if (typeof id === 'number') return id;
  const m = String(id).match(/(\d+)/);
  return m ? parseInt(m[1], 10) : id;
};

const interviewerCaseService = {

  // ── My resolved cases list ────────────────────────────────────────────
  // GET /api/iaem/interviewer/cases/
  // Returns: { cases: [{ case_id (display), case_pk (integer), signal_code, ... }] }
  getMyCases: () =>
    api.get(`${BASE}/cases/`),

  // ── Case detail ───────────────────────────────────────────────────────
  // GET /api/iaem/interviewer/cases/<case_id>/
  // Accepts "CASE-0022" or integer 22
  // Returns full evidence: transcript_segments, audio_segment_url (presigned S3, 1hr expiry),
  // classification, model_card, resolution, coaching_resources, appeal info
  getCaseDetail: (caseId) =>
    api.get(`${BASE}/cases/${pk(caseId)}/`),

  // ── File an appeal on a resolved case ─────────────────────────────────
  // POST /api/iaem/interviewer/cases/<case_id>/appeal/
  // 21-day window enforced server-side. Only one appeal per case.
  // payload: { disagree_with: CLASSIFICATION|SEVERITY|EVIDENCE|RESOLUTION,
  //            explanation: min 200 chars, supporting_context, desired_outcome: OVERTURN|MODIFY|REVIEW }
  fileAppeal: (caseId, payload) =>
    api.post(`${BASE}/cases/${pk(caseId)}/appeal/`, payload),

  // ── Respond to HR context request ──────────────────────────────────────
  // POST /api/iaem/interviewer/cases/<case_id>/respond/
  // Only when case is in AWAITING_RESPONSE state. min 50 chars.
  respondToContext: (caseId, response) =>
    api.post(`${BASE}/cases/${pk(caseId)}/respond/`, { response }),

  // ── Appeal status ─────────────────────────────────────────────────────
  // GET /api/iaem/interviewer/appeals/<appeal_id>/
  // Returns: { appeal_id, case_id, status, filed_on, original_resolution,
  //            outcome, new_resolution, reviewer_rationale }
  getAppealStatus: (appealId) =>
    api.get(`${BASE}/appeals/${pk(appealId)}/`),

  // GET /api/iaem/interviewer/appeals/latest/
  getLatestAppeal: () =>
    api.get(`${BASE}/appeals/latest/`),
};

export default interviewerCaseService;
