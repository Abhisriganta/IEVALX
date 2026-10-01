import axiosInstance from '../axiosInstance';
import { interviewAPI } from './candidateService';

const rankedResultsService = {
  // ─── Pipelines (InterviewProcess) ──────────────────────────────────────
  getProcesses: (params = {}) => interviewAPI.getProcesses(params),
  deleteProcess: (processId) => interviewAPI.deleteProcess(processId),
  closeProcess: (processId, force = false) =>
    interviewAPI.closeProcess(processId, force),

  // ─── Rankings (CandidateRoundStatus per round) ─────────────────────────
  getRanking: (processId, roundNumber) =>
    interviewAPI.getRanking(processId, roundNumber),

  setCandidateStatus: (processId, roundNumber, candidateId, payload) =>
    interviewAPI.setCandidateStatus(processId, roundNumber, candidateId, payload),

  getPipelineMembers: (processId, params = {}) =>
    interviewAPI.getPipelineMembers(processId, params),

  // R4 — { action: 'approve' | 'reject', candidate_ids: [...] }
  decideRound: (processId, roundConfigId, payload) =>
    interviewAPI.decideRound(processId, roundConfigId, payload),

  // R5 — grouped by round; only rounds with pending requests come back.
  getRescheduleRequests: (processId) =>
    interviewAPI.getRescheduleRequests(processId),

  // R5 — { round_config_id, window_start, window_end, si_ids? }
  applyReschedule: (processId, payload) =>
    interviewAPI.applyReschedule(processId, payload),

  // Full per-candidate, per-round score breakdown (round_status + ai_scores +
  // category_breakdown + live_result). Powers the Report column AND the score
  // fallback: the members endpoint only carries the composite CGPS from
  // CandidateRoundStatus, which can legitimately be empty even after a scored
  // attempt — this endpoint merges every score the system actually stores.
  getCandidateScoreDetail: (processId, roundNumber, candidateId) =>
    interviewAPI.getCandidateScoreDetail(processId, roundNumber, candidateId),

  // ── Edit-Pipeline wizard (schedule-page parity) ────────────────────────
  updateProcess:     (id, payload)        => interviewAPI.updateProcess(id, payload),
  createRound:       (processId, payload) => interviewAPI.createRound(processId, payload),
  updateRound:       (roundId, payload)   => interviewAPI.updateRound(roundId, payload),
  deleteRound:       (roundId)            => interviewAPI.deleteRound(roundId),
  syncProcessRounds: (processId)          => interviewAPI.syncProcessRounds(processId),
  updateScheduled:   (siId, payload)      => interviewAPI.updateScheduled(siId, payload),
  // getSlots, deleteSlot, createAvailability — REMOVED (IAEM handles live-video scheduling)

  bulkSoftDeleteByJobs: (jobIds) =>
    axiosInstance.post('/employer/interviews/processes/bulk-soft-delete/', { job_ids: jobIds }),

  bulkSoftDeleteProcesses: (processIds) =>
    axiosInstance.post('/employer/interviews/processes/bulk-soft-delete/', { process_ids: processIds }),

  // Undo a soft-delete — clears hidden_at so the pipeline reappears.
  restoreProcess: (processId) =>
    axiosInstance.post(`/employer/interviews/processes/${processId}/restore/`),
  // BUILD: 2026-08-14-round-doc-readback-v1
  getRoundDocument: (roundConfigId) =>
    axiosInstance.get(`/employer/interviews/rounds/${roundConfigId}/document/`),

  uploadRoundDocument: (roundConfigId, { file, questionsPerCandidate,
                                          interviewName, durationMins }) => {
    const fd = new FormData();
    fd.append('document_file', file);
    fd.append('questions_per_candidate', String(parseInt(questionsPerCandidate) || 10));
    if (interviewName) fd.append('interview_name', interviewName);
    if (durationMins)  fd.append('duration_mins', String(parseInt(durationMins) || 60));
    return axiosInstance.post(
      `/employer/interviews/rounds/${roundConfigId}/document/`,
      fd,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
  },

  getResumeBlobUrl: async (candidateId) => {
    if (!candidateId) throw new Error('candidateId is required');
    const res = await axiosInstance.get(
      `/jobseeker/resume/view/${candidateId}`,
      { responseType: 'blob' },
    );
    const rawType = (res.headers?.['content-type'] || '').toLowerCase();
    const type = rawType.includes('html') ? 'text/html'
               : rawType.includes('pdf')  ? 'application/pdf'
               : rawType || 'application/pdf';
    const blob = new Blob([res.data], { type });
    return { url: URL.createObjectURL(blob), type };
  },

  applyRoundThreshold: (processId, roundNumber, payload) =>
    interviewAPI.applyRoundThreshold(processId, roundNumber, payload),

  openWeeklyPdf: (testId) => {
    const WEEKLY_URL = import.meta.env.VITE_WEEKLY_INTERVIEW_URL || '';
    const pdfUrl = WEEKLY_URL ? `${WEEKLY_URL}/download_results/${testId}` : `/weekly_interview/download_results/${testId}`;
    window.open(pdfUrl, '_blank', 'noopener,noreferrer');
  },

  openReportPdf: async (assignmentId) => {
    const res = await axiosInstance.get(
      `/manual-result/${assignmentId}/report-pdf/`,
      { responseType: 'blob' },
    );

    const rawType = (res.headers?.['content-type'] || res.headers?.['Content-Type'] || '').toLowerCase();
    const blobType = rawType.includes('html') ? 'text/html' : 'application/pdf';
    const blob = new Blob([res.data], { type: blobType });
    const url  = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  },


  getResponseScores: async (assignmentId) => {
    const res = await axiosInstance.get(
      `/manual-ai/response-scores/${assignmentId}/`,
    );
    return res.data;
  },

  overrideResponseScore: async (assignmentId, responseId, { new_score, reason, new_is_correct }) => {
    const res = await axiosInstance.post(
      `/manual-ai/override/${assignmentId}/${responseId}/`,
      { new_score, reason, ...(new_is_correct != null ? { new_is_correct } : {}) },
    );
    return res.data;
  },

  listScoreOverrides: async (assignmentId) => {
    const res = await axiosInstance.get(
      `/manual-ai/override/${assignmentId}/`,
    );
    return res.data;
  },

  getReportBlobUrl: async ({ processId, roundNumber, candidateId, siId = null,
                              scoreDetail = null }) => {
    if (!processId || !roundNumber || !candidateId) {
      throw new Error('processId, roundNumber, and candidateId are required');
    }
    let detail = scoreDetail;
    if (!detail) {
      const res = await interviewAPI.getCandidateScoreDetail(processId, roundNumber, candidateId);
      detail = res?.data || null;
    }
    if (!detail) {
      const err = new Error('No score record found for this attempt yet.');
      err.code = 'NO_DETAIL';
      throw err;
    }

    const rt_raw   = detail.round_type || '';
    const ai        = detail.ai_scores || null;
    const apt       = detail.aptitude_result || null;
    const live      = detail.live_result || null;
    const doc       = detail.document_result || null;
    const testId    = ai?.test_id || null;
    const aptAssign = apt?.assignment_id || null;

    let rt = rt_raw;
    if (rt === 'document' && !doc && live)          rt = 'live-video';
    else if (rt === 'live-video' && !live && doc)   rt = 'document';
    else if (!rt && live && !doc && !ai && !apt)    rt = 'live-video';
    else if (!rt && doc  && !live && !ai && !apt)   rt = 'document';
    else if (!rt && ai   && !live && !doc && !apt)  rt = 'ai-powered';
    else if (!rt && apt  && !live && !doc && !ai)   rt = 'aptitude';

 
    const _proxy = async (kind, id) => {
      const res = await axiosInstance.get(
        `/employer/interviews/preview/${kind}/${id}/`,
        { responseType: 'blob' },
      );
      const rawType = (res.headers?.['content-type']
                    || res.headers?.['Content-Type'] || '').toLowerCase();
      const type = rawType.includes('html') ? 'text/html' : 'application/pdf';
      const blob = new Blob([res.data], { type });
      return { url: URL.createObjectURL(blob), type };
    };

    // ── ai-powered → AI proxy (Django reads test_id off AIInterviewSession)
    if ((rt === 'ai-powered' || (rt === '' && testId)) && testId) {
      if (!siId) {
        const err = new Error('Cannot resolve this AI interview yet — reload the page and try again.');
        err.code = 'AI_NO_SI';
        throw err;
      }
      const { url, type } = await _proxy('ai', siId);
      return { url, type, source: 'ai-proxy' };
    }

    if (rt === 'aptitude' && testId && siId) {
      try {
        const { url, type } = await _proxy('ai', siId);
        return { url, type, source: 'aptitude-ai-proxy' };
      } catch { /* fall through to manual */ }
    }

    // ── aptitude / manual-result PDF (Django, same origin) ────────────────
    if (aptAssign) {
      const res = await axiosInstance.get(
        `/manual-result/${aptAssign}/report-pdf/`,
        { responseType: 'blob' },
      );
      const rawType = (res.headers?.['content-type']
                    || res.headers?.['Content-Type'] || '').toLowerCase();
      const type = rawType.includes('html') ? 'text/html' : 'application/pdf';
      const blob = new Blob([res.data], { type });
      return { url: URL.createObjectURL(blob), type, source: 'aptitude-django' };
    }

    // ── document round PDF ────────────────────────────────────────────────
    // The Django proxy handles the Mongo lookup (session_id) and streams
    // the FastAPI PDF back over HTTPS. si_id is required — it identifies
    // the specific ScheduledInterview this candidate attempted.
    if (rt === 'document') {
      if (!siId) {
        const err = new Error('This document round has no ScheduledInterview id yet — the candidate may not have started it.');
        err.code = 'DOC_NO_SI';
        throw err;
      }
      try {
        const { url, type } = await _proxy('doc', siId);
        return { url, type, source: 'doc-proxy' };
      } catch (e) {
        const s = e?.response?.status;

        if (s === 404 && live && siId) {
          try {
            const { url, type } = await _proxy('live', siId);
            return { url, type, source: 'live-proxy (doc-fallback)' };
          } catch { /* keep the original doc error below */ }
        }
        const detailMsg = e?.response?.data?.detail;
        const err = new Error(
          s === 404 ? (detailMsg || 'No document report is available for this interview yet.')
        : s === 403 ? 'You don\'t have access to this candidate\'s document report.'
        : s === 502 ? (detailMsg || 'The report service is unreachable — try again in a moment.')
        :             (detailMsg || 'Failed to load the document report.'));
        err.code = s === 404 ? 'DOC_PDF_NOT_READY' : 'DOC_STATUS_FAILED';
        throw err;
      }
    }

    if (rt === 'live-video') {
      if (!siId) {
        const err = new Error('This live interview has no ScheduledInterview id yet — the candidate hasn\'t been scheduled.');
        err.code = 'LIVE_NO_SI';
        throw err;
      }
      try {
        // First try JSON (v2 submission form data)
        const jsonRes = await axiosInstance.get(
          `/employer/interviews/preview/live/${siId}/`,
          { responseType: 'json' },
        );
        if (jsonRes.data && jsonRes.data.report_type === 'v2_submission') {
          return { url: null, type: 'v2_submission', source: 'live-v2-form', data: jsonRes.data };
        }
        // If it's not JSON (legacy PDF), re-fetch as blob
        const { url, type } = await _proxy('live', siId);
        return { url, type, source: 'live-proxy' };
      } catch (e) {
        // If JSON request got a PDF back (content-type mismatch), try blob
        const contentType = e?.response?.headers?.['content-type'] || '';
        if (contentType.includes('pdf') || contentType.includes('octet')) {
          try {
            const { url, type } = await _proxy('live', siId);
            return { url, type, source: 'live-proxy' };
          } catch { /* fall through */ }
        }
        const s = e?.response?.status;
        if (s === 404 && doc && siId) {
          try {
            const { url, type } = await _proxy('doc', siId);
            return { url, type, source: 'doc-proxy (live-fallback)' };
          } catch { /* keep the original live error below */ }
        }
        const detailMsg = e?.response?.data?.detail;
        const err = new Error(
          s === 404 ? (detailMsg || 'No live-interview report exists for this candidate yet.')
        : s === 403 ? 'You don\'t have access to this candidate\'s live-interview report.'
        : s === 502 ? (detailMsg || 'The report service is unreachable — try again in a moment.')
        :             (detailMsg || 'Failed to load the live-interview report.'));
        err.code = s === 404 ? 'LIVE_REPORT_NOT_READY' : 'LIVE_REPORT_FAILED';
        throw err;
      }
    }

    const err = new Error('No preview is available for this round yet — the attempt may still be scoring.');
    err.code = 'NO_REPORT';
    throw err;
  },

  openResumePdf: async (candidateId) => {
    if (!candidateId) throw new Error('candidateId is required');
    const res = await axiosInstance.get(
      `/jobseeker/resume/view/${candidateId}`,
      { responseType: 'blob' },
    );
    const rawType = (res.headers?.['content-type'] || res.headers?.['Content-Type'] || '').toLowerCase();
    const blobType = rawType.includes('html')
      ? 'text/html'
      : rawType.includes('pdf')
      ? 'application/pdf'
      : rawType || 'application/pdf';
    const blob = new Blob([res.data], { type: blobType });
    const url  = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  },

    updateReauditStatus: async (siId, status) => {
    const res = await axiosInstance.patch(
      `/employer/interviews/preview/live/${siId}/reaudit-status/`,
      { hr_reaudit_status: status },
    );
    return res.data;
  },

  getAssignmentInfo: async (assignmentId) => {
    if (!assignmentId) throw new Error('assignmentId is required');
    const res = await axiosInstance.get(`/manual-assignment/${assignmentId}/`);
 
    return res.data?.assignment ?? res.data ?? null;
  },
};

export default rankedResultsService;