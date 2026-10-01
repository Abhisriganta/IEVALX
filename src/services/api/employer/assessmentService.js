import axiosInstance from '../axiosInstance';

const assessmentService = {

  // ── Assessment CRUD ──────────────────────────────────────────────────────────
  create: (payload) =>
    axiosInstance.post('/manual-assessment/create/', payload),

  update: (id, payload) =>
    axiosInstance.put(`/manual-assessment/${id}/update/`, payload),

  get: (id, companyId) =>
    axiosInstance.get(`/manual-assessment/${id}/`, {
      params: companyId ? { company_id: companyId } : {},
    }),

  list: (companyId, params = {}) =>
    axiosInstance
      .get('/manual-assessment/list/', { params: { company_id: companyId, ...params } })
      .catch(() => ({ data: { assessments: [] } })),

  delete: (id) =>
    axiosInstance.delete(`/manual-assessment/${id}/delete/`),

  archive: (id) =>
    axiosInstance.post(`/manual-assessment/${id}/archive/`),

  duplicate: (id, companyId) =>
    axiosInstance.post(`/manual-assessment/${id}/duplicate/`, { company_id: companyId }),

 // ── Questions ────────────────────────────────────────────────────────────────
  addQuestion: (payload) =>
    axiosInstance.post('/manual-question/add/', payload),

 uploadQuestionImage: (file, assessmentId = null) => {
    const formData = new FormData();
    formData.append('image', file);
    if (assessmentId) formData.append('assessment_id', assessmentId);
    return axiosInstance.post('/manual-question/upload-image/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // 🔧 NEW — re-sign a stored S3 key when its presigned URL has expired.
  refreshImageUrl: (s3Key) =>
    axiosInstance.get('/manual-question/refresh-image-url/', { params: { key: s3Key } }),

  updateQuestion: (questionId, payload) =>
    axiosInstance.put(`/manual-question/${questionId}/update/`, payload),

  deleteQuestion: (questionId) =>
    axiosInstance.delete(`/manual-question/${questionId}/delete/`),

  listQuestions: (assessmentId, params = {}) =>
    axiosInstance.get('/manual-question/list/', {
      params: { assessment_id: assessmentId, page_size: 200, ...params },
    }),

  getQuestion: (questionId) =>
    axiosInstance.get(`/manual-question/${questionId}/`),

  // ── Distribution config + publish ────────────────────────────────────────────
  saveConfig: (payload) =>
    // payload: { assessment_id, final_question_count, distribution }
    axiosInstance.post('/manual-assessment-config/save/', payload),


  getConfig: (assessmentId) =>
    axiosInstance.get(`/manual-assessment-config/${assessmentId}/`),

  validateConfig: (assessmentId) =>
    axiosInstance.post(`/manual-assessment-config/${assessmentId}/validate/`),

  publish: (assessmentId, schedule = {}) =>
    axiosInstance.post(
      `/manual-assessment-config/${assessmentId}/publish/`,
      {
        scheduled_start_at: schedule.scheduled_start_at || null,
        expires_at:         schedule.expires_at         || null,
      },
    ),

  unpublish: (assessmentId) =>
    axiosInstance.post(`/manual-assessment-config/${assessmentId}/unpublish/`),

  // ── Paper repository ─────────────────────────────────────────────────────────
  // ── Sections (Section-Aware Model) ───────────────────────────────────────────
  createSection: (payload) =>
    axiosInstance.post('/manual-section/create/', payload),

  listSections: (assessmentId) =>
    axiosInstance.get('/manual-section/list/', {
      params: { assessment_id: assessmentId },
    }),

  getSection: (sectionId) =>
    axiosInstance.get(`/manual-section/${sectionId}/`),

  updateSection: (sectionId, payload) =>
    axiosInstance.put(`/manual-section/${sectionId}/update/`, payload),

  deleteSection: (sectionId) =>
    axiosInstance.delete(`/manual-section/${sectionId}/delete/`),

  reorderSections: (assessmentId, orderedIds) =>
    axiosInstance.post('/manual-section/reorder/', {
      assessment_id: assessmentId,
      order: orderedIds,
    }),

  validateSection: (sectionId) =>
    axiosInstance.post(`/manual-section/${sectionId}/validate/`),

  recalcSection: (sectionId) =>
    axiosInstance.post(`/manual-section/${sectionId}/recalc/`),

  bootstrapSections: (assessmentId) =>
    axiosInstance.post('/manual-section/bootstrap/', { assessment_id: assessmentId }),

  getSectionStatus: (assessmentId) =>
    axiosInstance.get(`/manual-assessment-config/${assessmentId}/section-status/`),
  saveAsPaper: (payload) =>
    // payload: { company_id, assessment_id, paper_name, description? }
    axiosInstance.post('/manual-paper/save-from-assessment/', payload),

  listPapers: (companyId, params = {}) =>
    axiosInstance.get('/manual-paper/list/', {
      params: { company_id: companyId, ...params },
    }),

  deletePaper: (paperId, companyId) =>
    axiosInstance.delete(`/manual-paper/${paperId}/delete/`, {
      params: { company_id: companyId },
    }),

  updatePaperFromAssessment: (paperId, payload) =>
    // payload: { assessment_id, description? }
    axiosInstance.post(`/manual-paper/${paperId}/update-from-assessment/`, payload),

  importPaperInto: (paperId, targetAssessmentId) =>
    axiosInstance.post(`/manual-paper/${paperId}/import-into/${targetAssessmentId}/`),
};

export default assessmentService;