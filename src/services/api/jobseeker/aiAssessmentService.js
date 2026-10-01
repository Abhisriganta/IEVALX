import { mockAIAssessments } from '@/mocks/jobseeker/aiAssessmentsmock';
import api from '@/services/api/axiosInstance';

const MOCK_DELAY = 350;
const delay = (ms = MOCK_DELAY) => new Promise((resolve) => setTimeout(resolve, ms));

const isMockId = (id) => isNaN(Number(id));

const USE_MOCK_LIST = false;
const USE_MOCK      = false;


function _getCandidateId() {
  try {
    const token = localStorage.getItem('ievalx_token');
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
    );
    
    return (
      payload.user_id      ??   
      payload.candidate_id ??
      payload.candidateId  ??
      payload.userId       ??
      payload.id           ??
      payload.sub          ??
      null
    );
  } catch {
    return null;
  }
}

// ─── Status + normalizer ────────

const STATUS_MAP = {
  assigned:   'not_started',
  started:    'in_progress',
  reviewing:  'in_progress',
  completed:  'completed',
  abandoned:  'expired',
  no_attempt: 'expired',
  expired:    'expired',
};

const normalizeAssessment = (raw) => ({
  id:              raw.assignment_id   ?? raw.id,
  assignmentId:    raw.assignment_id   ?? raw.id,
  assessmentId:    raw.assessment_id   ?? null,
  title:           raw.assessment_title ?? raw.title ?? '—',
  skill:           raw.skill            ?? '—',
  level:           raw.level            ?? 'Intermediate',
  type:            raw.type             ?? raw.question_type ?? 'mcq',
  questionCount:   raw.final_question_count ?? raw.question_count ?? raw.questionCount ?? 0,
  durationMinutes: raw.duration_minutes     ?? raw.durationMinutes ?? 0,
  aiProctored:     raw.ai_proctored         ?? raw.aiProctored     ?? false,
  attemptsAllowed: raw.attemptsAllowed ?? null,
  attemptsUsed:    raw.attemptsUsed    ?? null,
  status:          STATUS_MAP[raw.status] ?? raw.status ?? 'not_started',
  scheduledAt:     raw.scheduled_start_at ?? raw.scheduledAt ?? null,
  expiresAt:       raw.expires_at   ?? raw.expiresAt   ?? null,
  startedAt:       raw.started_at   ?? raw.startedAt   ?? null,
  completedAt:     raw.completed_at ?? raw.completedAt ?? null,
description:     raw.description  ?? '',
  passMarks:       raw.pass_marks ?? raw.passMarks ?? null,
  tags:            Array.isArray(raw.tags) ? raw.tags : [],
  companyLogoUrl:  raw.company_logo_url ?? raw.companyLogoUrl ?? null,
  scheduledInterviewId:    raw.scheduled_interview_id ?? raw.scheduledInterviewId ?? null,
  siStatus:                raw.si_status ?? null,
  rescheduleRequestedAt:   raw.si_reschedule_requested_at ?? null,
});


// ─── Service ─────────────────────────────────────────────────────────────────

export const aiAssessmentService = {

  async getAssessments() {
    if (USE_MOCK_LIST) {
      await delay();
      return mockAIAssessments.map(normalizeAssessment);
    }
    const candidateId = _getCandidateId();
    if (!candidateId) {
      console.warn('[aiAssessmentService] Could not resolve candidate_id from token');
    }
    const { data } = await api.get('/manual-assignment/my-assignments/', {
      params: { candidate_id: candidateId },
    });
    const list = Array.isArray(data?.assignments) ? data.assignments : [];
    return list.map(normalizeAssessment);
  },

  async getAssessmentById(assignmentId) {
    if (USE_MOCK_LIST || isMockId(assignmentId)) {
      await delay(200);
      const raw = mockAIAssessments.find((a) => String(a.id) === String(assignmentId)) ?? null;
      return raw ? normalizeAssessment(raw) : null;
    }
    const { data } = await api.get(`/manual-assignment/${assignmentId}/`);
    return normalizeAssessment(data?.assignment ?? data);
  },

   async requestReschedule(scheduledInterviewId, reason = '') {
    const { data } = await api.post(
      `/employer/interviews/schedule/${scheduledInterviewId}/request-reschedule/`,
      { reason },
    );
    return data;
  },

  async startAssessment(assignmentId) {
    if (USE_MOCK || isMockId(assignmentId)) {
      await delay(300);
      return { success: true };
    }
    const { data } = await api.post(`/manual-assignment/${assignmentId}/start/`);
    return data;
  },

 
  async enterReviewPhase(assignmentId) {
    if (USE_MOCK || isMockId(assignmentId)) {
      await delay(300);
      return { success: true };
    }
    const { data } = await api.post(`/manual-assignment/${assignmentId}/enter-review/`);
    return data;
  },

  async generateTestPaper(assignmentId) {
    if (USE_MOCK || isMockId(assignmentId)) {
      await delay(300);
      return { success: true, test: { assignment_id: assignmentId, question_ids: [] } };
    }
    const { data } = await api.post(`/manual-test/${assignmentId}/generate/`);
    return data;
  },

  /**
    * @param {Array<number|string>} assignmentIds
   * @returns {Promise<{ deleted: number[], skipped: Array<{id:number, reason:string}> }>}
   */
  async deleteMyAssignments(assignmentIds) {
    const ids = (Array.isArray(assignmentIds) ? assignmentIds : [assignmentIds])
      .map((v) => Number(v))
      .filter((v) => Number.isFinite(v));

    if (ids.length === 0) {
      return { deleted: [], skipped: [] };
    }

    if (USE_MOCK_LIST) {
      await delay();
      return { deleted: ids, skipped: [] };
    }

    const candidateId = _getCandidateId();
    if (!candidateId) {
      throw new Error('Could not resolve candidate_id from token');
    }

    const { data } = await api.post('/manual-assignment/my-assignments/delete/', {
      candidate_id:   candidateId,
      assignment_ids: ids,
    });

    return {
      deleted: Array.isArray(data?.deleted) ? data.deleted : [],
      skipped: Array.isArray(data?.skipped) ? data.skipped : [],
    };
  },
};

export default aiAssessmentService;