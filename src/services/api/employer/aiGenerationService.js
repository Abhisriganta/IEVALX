// src/services/api/employer/aiGenerationService.js


import api from '../axiosInstance';

const BASE = '/ai-assessment';


const POLL_INTERVAL_MS = 2500;
const POLL_TIMEOUT_MS  = 3 * 60 * 1000; // 3 minutes

const LONG_TIMEOUT_MS    = 3 * 60 * 1000; // 3 minutes
const ENQUEUE_TIMEOUT_MS = 30 * 1000;     // 30 seconds

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const aiGenerationService = {
  // ── Config / draft (Steps 3, Save Draft) ──────────────────────────────────
  saveConfig: (payload) => api.post(`${BASE}/config/save/`, payload),

  listConfigs: (companyId, status) =>
    api.get(`${BASE}/config/list/`, { params: { company_id: companyId, status } }),

  getConfig: (configId, companyId) =>
    api.get(`${BASE}/config/${configId}/`, { params: { company_id: companyId } }),

  deleteConfig: (configId, companyId) =>
    api.delete(`${BASE}/config/${configId}/delete/`, { params: { company_id: companyId } }),


  startGeneration: (configId, companyId) =>
    api.post(
      `${BASE}/generate/${configId}/`,
      { company_id: companyId },
      { timeout: ENQUEUE_TIMEOUT_MS },
    ),

  getStatus: (configId, companyId) =>
    api.get(`${BASE}/status/${configId}/`, { params: { company_id: companyId } }),

  /**
   
   * @returns the latest version { paper, coverage, validation, ... }
   */
  async generateAndWait(configId, companyId, onProgress) {
    await this.startGeneration(configId, companyId);
    const deadline = Date.now() + POLL_TIMEOUT_MS;

    while (Date.now() < deadline) {
      await sleep(POLL_INTERVAL_MS);
      const { data } = await this.getStatus(configId, companyId);
      if (onProgress) onProgress(data.status);

      if (data.status === 'generated') return data.version;
      if (data.status === 'failed') {
        throw new Error(data.last_error || 'Generation failed.');
      }
    }
    throw new Error('Generation timed out. Please try again.');
  },

 
  regenerateQuestion: (configId, questionId, companyId) =>
    api.post(
      `${BASE}/regenerate-question/${configId}/`,
      { question_id: questionId, company_id: companyId },
      { timeout: LONG_TIMEOUT_MS },
    ),

  regenerateSection: (configId, sectionName, companyId) =>
    api.post(
      `${BASE}/regenerate-section/${configId}/`,
      { section_name: sectionName, company_id: companyId },
      { timeout: LONG_TIMEOUT_MS },
    ),

  editQuestion: (configId, questionId, patch, companyId) =>
    api.put(`${BASE}/version/${configId}/edit-question/`, {
      question_id: questionId, patch, company_id: companyId,
    }),

  deleteQuestion: (configId, questionId, companyId) =>
    api.delete(`${BASE}/version/${configId}/delete-question/`, {
      params: { question_id: questionId, company_id: companyId },
    }),

  reorderQuestions: (configId, sectionId, orderedIds, companyId) =>
    api.post(`${BASE}/version/${configId}/reorder/`, {
      section_id: sectionId, ordered_question_ids: orderedIds, company_id: companyId,
    }),

  // ── Versions (Step 8) ──────────────────────────────────────────────────────
  listVersions: (configId, companyId) =>
    api.get(`${BASE}/versions/${configId}/`, { params: { company_id: companyId } }),

  getVersion: (configId, versionNo, companyId) =>
    api.get(`${BASE}/version/${configId}/${versionNo}/`, { params: { company_id: companyId } }),

  restoreVersion: (configId, versionNo, companyId) =>
    api.post(`${BASE}/version/${configId}/restore/${versionNo}/`, { company_id: companyId }),

  approve: (configId, companyId, instructions) =>
    api.post(
      `${BASE}/approve/${configId}/`,
      { company_id: companyId, instructions },
      { timeout: LONG_TIMEOUT_MS },
    ),
};

export const aiPaperService = {
  saveFromConfig: (payload) =>
    api.post(
      '/ai-paper/save-from-config/',
      payload,
      { timeout: LONG_TIMEOUT_MS },
    ),

  // List with search / role / level / pagination. All params optional.
  list: (companyId, params = {}) =>
    api.get('/ai-paper/list/', { params: { company_id: companyId, ...params } }),

  get: (paperId, companyId) =>
    api.get(`/ai-paper/${paperId}/`, { params: { company_id: companyId } }),

  update: (paperId, payload) =>
    // payload: { company_id, paper_name?, description? }
    api.put(`/ai-paper/${paperId}/update/`, payload),

  delete: (paperId, companyId) =>
    api.delete(`/ai-paper/${paperId}/delete/`, {
      params: { company_id: companyId },
    }),

  loadIntoConfig: (paperId, payload) =>
    api.post(
      `/ai-paper/${paperId}/load-into-config/`,
      payload,
      { timeout: LONG_TIMEOUT_MS },
    ),
};

export default aiGenerationService;