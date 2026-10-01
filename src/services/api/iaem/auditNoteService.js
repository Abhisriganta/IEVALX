// BUILD: 2026-08-25-iaem-auditNoteService-v2
// Phase 9: Audit Notes Browser — HR list + detail
// Backend endpoints: /api/iaem/hr/audit-notes/*
//
// RESPONSE NORMALIZATION:
// Backend returns { audit_notes: [...] }, consumer reads r.data.notes
import api from '../axiosInstance';

const BASE = '/iaem/hr/audit-notes';

const pk = (id) => {
  if (typeof id === 'number') return id;
  const m = String(id).match(/(\d+)/);
  return m ? parseInt(m[1], 10) : id;
};

const auditNoteService = {

  // ── List audit notes ──────────────────────────────────────────────────
  // GET /api/iaem/hr/audit-notes/?interviewer_id=5&audit_status=SIGNALS_SURFACED
  //     &job_title=Backend&date_from=2026-08-01&date_to=2026-08-31
  // Backend returns { audit_notes, total }, consumer expects { notes, total }
  getAuditNotes: (filters = {}) =>
    api.get(`${BASE}/`, { params: filters }).then(r => ({
      ...r,
      data: {
        ...r.data,
        notes: r.data.audit_notes || r.data.notes || [],
      },
    })),

  // ── Audit note detail ─────────────────────────────────────────────────
  // GET /api/iaem/hr/audit-notes/{note_id}/
  // Accepts "AN-00041" or integer 41
  // Returns: note_id, interviewer_name, interview_date, interview_time, job_title,
  //          level, candidate_name, audit_status, score_comparison, question_analysis,
  //          self_reflection, signals, evidence_pointers, pdf_url (presigned S3, 1hr)
  getAuditNoteDetail: (noteId) =>
    api.get(`${BASE}/${pk(noteId)}/`),
};

export default auditNoteService;
