// BUILD: 2026-08-25-iaem-appealService-v2
// Phase 7: HR appeals queue — list, detail, resolve
// Backend endpoints: /api/iaem/hr/appeals/*
import api from '../axiosInstance';

const BASE = '/iaem/hr/appeals';

const pk = (id) => {
  if (typeof id === 'number') return id;
  const m = String(id).match(/(\d+)/);
  return m ? parseInt(m[1], 10) : id;
};

const appealService = {

  // ── Appeals queue ─────────────────────────────────────────────────────
  // GET /api/iaem/hr/appeals/?status=PENDING
  // Filtered server-side: only appeals assigned to current HR (or unassigned)
  // Returns: { appeals: [...], total }
  getAppealsQueue: (filters = {}) =>
    api.get(`${BASE}/`, { params: filters }),

  // ── Appeal detail ─────────────────────────────────────────────────────
  // GET /api/iaem/hr/appeals/<appeal_id>/
  // Accepts "APL-0008" or integer 8
  // Returns full case context + original decision + interviewer's appeal text
  // + evidence (signals, transcript, audio, classification, model_card)
  getAppealDetail: (appealId) =>
    api.get(`${BASE}/${pk(appealId)}/`),

  // ── Resolve appeal ────────────────────────────────────────────────────
  // POST /api/iaem/hr/appeals/<appeal_id>/resolve/
  // outcome: UPHELD | MODIFIED | OVERTURNED
  // rationale: required text
  // newResolution: required when outcome=MODIFIED (valid resolution code)
  // Backend enforces: reviewer must be different from original case resolver
  resolveAppeal: (appealId, outcome, rationale, newResolution) =>
    api.post(`${BASE}/${pk(appealId)}/resolve/`, {
      outcome,
      rationale,
      ...(newResolution ? { new_resolution: newResolution } : {}),
    }),
};

export default appealService;
