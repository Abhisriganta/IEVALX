
import api from '../axiosInstance';

const pk = (id) => {
  if (typeof id === 'number') return id;
  const m = String(id).match(/(\d+)/);
  return m ? parseInt(m[1], 10) : id;
};

const complianceService = {
  // ── Profile ──────────────────────────────────────────────────────────────
  getProfile: () =>
    api.get('/iaem/compliance/profile/'),

  uploadProfilePhoto: (file) => {
    const formData = new FormData();
    formData.append('photo', file);
    return api.post('/iaem/compliance/profile-photo/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  deleteProfilePhoto: () =>
    api.delete('/iaem/compliance/profile-photo/'),

  getAlerts: (params = {}) =>
    api.get('/iaem/compliance/alerts/', { params }).then(r => ({
      ...r,
      data: {
        ...r.data,
        alerts: (r.data.alerts || []).map(a => ({
          ...a,
          type:             a.alert_type || a.type || '',
          read:             typeof a.is_read === 'boolean' ? a.is_read : (a.read ?? false),
          case_id:          a.case_id || '',
          case_pk:          a.case_pk || a.related_entity_id || '',
          interviewer_name: a.interviewer_name || '',
          timestamp:        a.created_at || a.timestamp || '',
        })),
      },
    })),

  // ── Section B: Case Oversight (read-only, tenant-wide) ────────────────
  // GET /api/iaem/compliance/cases/?state=OPEN&severity=HIGH&signal_code=A7&sla_status=breached
  getAllCases: (filters = {}) =>
    api.get('/iaem/compliance/cases/', { params: filters }),

  // GET /api/iaem/compliance/cases/<case_id>/ — read-only full detail
  getCaseDetail: (caseId) =>
    api.get(`/iaem/compliance/cases/${pk(caseId)}/`),

  // ── Section C: Co-sign queue ──────────────────────────────────────────
  // GET /api/iaem/compliance/cosign/
  // Backend returns { cosign_requests: [...] }, components read r.data.pending
  getCoSignQueue: () =>
    api.get('/iaem/compliance/cosign/').then(r => ({
      ...r,
      data: {
        ...r.data,
        pending: r.data.cosign_requests || r.data.pending || [],
      },
    })),

  // POST /api/iaem/compliance/cosign/<cosign_id>/approve/
  // cosignId = integer PK (returned as request_pk from queue)
  approveCoSign: (cosignId) =>
    api.post(`/iaem/compliance/cosign/${pk(cosignId)}/approve/`),

  // POST /api/iaem/compliance/cosign/<cosign_id>/reject/
  rejectCoSign: (cosignId, reason) =>
    api.post(`/iaem/compliance/cosign/${pk(cosignId)}/reject/`, { reason }),

  // POST /api/iaem/compliance/legal-holds/apply/
  applyLegalHold: (scheduledInterviewId, reason) =>
    api.post('/iaem/compliance/legal-holds/apply/', {
      scheduled_interview_id: scheduledInterviewId,
      reason,
    }),

  // POST /api/iaem/compliance/legal-holds/<hold_id>/release/
  // holdId = integer PK (returned as hold_pk from list)
  releaseLegalHold: (holdId, reason) =>
    api.post(`/iaem/compliance/legal-holds/${pk(holdId)}/release/`, {
      ...(reason ? { reason } : {}),
    }),

  // ── Submission detail (for "View Full Evaluation Form") ───────────────
  // GET /api/iaem/compliance/submission/<submission_id>/
  getSubmissionDetail: (submissionId) =>
    api.get(`/iaem/compliance/submission/${pk(submissionId)}/`),

  // ── Section E: Full audit trail for a case ────────────────────────────
 
  getCaseAuditTrail: (caseId) =>
    api.get(`/iaem/compliance/audit-trail/${pk(caseId)}/`).then(r => ({
      ...r,
      data: {
        ...r.data,
        events: r.data.entries || r.data.events || [],
      },
    })),
};

export default complianceService;
