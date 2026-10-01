import { mockTestPaper, mockQuestions } from '@/mocks/jobseeker/aiAssessmentTestMock';
import api from '@/services/api/axiosInstance';

const USE_MOCK   = false;
const MOCK_DELAY = 350;
const delay = (ms = MOCK_DELAY) => new Promise((r) => setTimeout(r, ms));

const isMockId         = (id) => isNaN(Number(id));
const MOCK_QUESTION_IDS = new Set([101, 102, 103, 104]);
const isMockQuestionId = (id) => MOCK_QUESTION_IDS.has(Number(id));

export const aiAssessmentTestService = {

  async getTestPaper(assignmentId) {
    if (USE_MOCK || isMockId(assignmentId)) {
      await delay();
      return {
        success: true,
        test:    mockTestPaper,
        sections: [
          {
            section_id:       null,
            name:             'General',
            position:         0,
            duration_minutes: null,
            legacy:           true,
            questions: mockQuestions.map(({ id, question_type, difficulty, marks, display_order, mongo_id }) => ({
              id, question_type, difficulty, marks, display_order, mongo_id,
            })),
          },
        ],
      };
    }
    const { data } = await api.get(`/manual-test/${assignmentId}/content/`);
    return data;
  },

  async getQuestion(questionId) {
    if (USE_MOCK || isMockQuestionId(questionId)) {
      await delay(80);
      const q = mockQuestions.find((m) => m.id === Number(questionId));
      if (!q) return { success: false, question: null };
      return { success: true, question: { ...q } };
    }
    const { data } = await api.get(`/manual-question/${questionId}/`);
    return data;
  },

  async saveResponse(assignmentId, questionId, candidateAnswer) {
    if (USE_MOCK || isMockId(assignmentId)) {
      await delay(60);
      return { success: true };
    }
    const { data } = await api.post('/manual-response/submit/', {
      assignment_id:    parseInt(assignmentId),
      question_id:      parseInt(questionId),
      candidate_answer: candidateAnswer,
    });
    return data;
  },

  async bulkSaveResponses(assignmentId, answers) {
    if (USE_MOCK || isMockId(assignmentId)) {
      await delay(400);
      return { success: true, processed: answers.length, skipped: 0, obtained_marks: 0, errors: [] };
    }
    const { data } = await api.post('/manual-response/bulk-submit/', {
      assignment_id: parseInt(assignmentId),
      answers,
    });
    return data;
  },

  async submitTest(assignmentId) {
    if (USE_MOCK || isMockId(assignmentId)) {
      await delay(900);
      return {
        success: true,
        result: {
          assignment_id:     assignmentId,
          total_questions:   4,
          total_marks:       10.5,
          obtained_marks:    6.5,
          percentage:        61.9,
          passed:            null,
          auto_scored:       false,
          evaluated:         false,
          section_breakdown: [
            {
              section_id:      null,
              name:            'General',
              position:        0,
              total_questions: 4,
              total_marks:     10.5,
              obtained_marks:  6.5,
              percentage:      61.9,
              pass_marks:      null,
              passed:          null,
              legacy:          true,
            },
          ],
        },
      };
    }
    // 🔧 BUGFIX — the previous URL /manual-result/{aid}/submit/ did not
    // exist on the backend and returned 404, making the Final Submit
    // button appear dead. The Manual assessment already finalises via
    // Complete_Assessment at /api/manual-assignment/{aid}/complete/
    // (see core/manual_assessment/manual_candidate_assignment.py). AI
    // Assessment reuses the Manual candidate pipeline, so the same
    // endpoint applies here. Complete_Assessment updates
    // tbl_manual_candidate_assignment.status = 'completed' and returns
    // { success: true, assignment: {...} }. The submitted screen in
    // AIAssessmentTest.jsx does not read fields off the returned
    // payload, so the response-shape difference is inconsequential.
    const { data } = await api.post(
      `/manual-assignment/${assignmentId}/complete/`,
      null,
      { timeout: 180000 },
    );
    return data;
  },

  async getReviewSummary(assignmentId) {
    if (USE_MOCK || isMockId(assignmentId)) {
      await delay(200);
      return {
        success: true,
        total_questions: 4, answered: 3, unanswered: 1, marked_for_review: 0,
        unanswered_question_ids: [],
        by_section: [],
        total_review_banked_seconds: 0,
        reattempt_eligible: false,
      };
    }
    const { data } = await api.get(`/manual-response/${assignmentId}/review-summary/`);
    return data;
  },

  async startReviewSection(assignmentId, sectionId) {
    if (USE_MOCK || isMockId(assignmentId)) {
      await delay(150);
      return { success: true, was_changed: true, progress: {} };
    }
    const { data } = await api.post(
      `/manual-response/section/${assignmentId}/${sectionId}/start-review/`,
    );
    return data;
  },

  async endReviewSection(assignmentId, sectionId) {
    if (USE_MOCK || isMockId(assignmentId)) {
      await delay(150);
      return { success: true, was_changed: true, progress: {} };
    }
    const { data } = await api.post(
      `/manual-response/section/${assignmentId}/${sectionId}/end-review/`,
    );
    return data;
  },

  // 🔧 NEW — Section-progress lifecycle during the ATTEMPT phase.
  //
  //   enterSection    → POST /section/<aid>/<sid>/enter/
  //                     Sets entered_at on the backend. Required so that
  //                     completeSection (below) can compute time_used.
  //   completeSection → POST /section/<aid>/<sid>/complete/
  //                     Banks review_seconds_banked = duration*60 - time_used.
  //                     Primary trigger for the per-section banked review
  //                     model. Called when:
  //                       (a) candidate crosses a section boundary forward
  //                       (b) candidate clicks Submit Test on the last
  //                           question (so the FINAL section also banks).
  //   lockSection     → POST /section/<aid>/<sid>/lock/
  //                     Called when the section's attempt timer hits 0
  //                     client-side. Backend banks 0 (per spec: timer
  //                     expiry means no reattempt for that section).
  //
  // All three are idempotent on the backend.
  async enterSection(assignmentId, sectionId) {
    if (USE_MOCK || isMockId(assignmentId)) {
      await delay(80);
      return { success: true, was_created: true, progress: {} };
    }
    const { data } = await api.post(
      `/manual-response/section/${assignmentId}/${sectionId}/enter/`,
    );
    return data;
  },

  async completeSection(assignmentId, sectionId) {
    if (USE_MOCK || isMockId(assignmentId)) {
      await delay(80);
      return { success: true, was_changed: true, progress: {} };
    }
    const { data } = await api.post(
      `/manual-response/section/${assignmentId}/${sectionId}/complete/`,
    );
    return data;
  },

  async lockSection(assignmentId, sectionId) {
    if (USE_MOCK || isMockId(assignmentId)) {
      await delay(80);
      return { success: true, was_changed: true, progress: {} };
    }
    const { data } = await api.post(
      `/manual-response/section/${assignmentId}/${sectionId}/lock/`,
    );
    return data;
  },
  fireAndForgetExit(assignmentId) {
    // Marks assignment 'abandoned' + SI 'partial' on browser exit.
    try {
      const token   = localStorage.getItem('ievalx_token');
      const baseURL = (api.defaults.baseURL || '/api').replace(/\/+$/, '');
      fetch(`${baseURL}/manual-assignment/${assignmentId}/exit/`, {
        method:    'POST',
        headers:   { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        keepalive: true,
      }).catch(() => {});
    } catch { /* best effort */ }
  },
};

export default aiAssessmentTestService;