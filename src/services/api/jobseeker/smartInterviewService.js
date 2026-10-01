import api from '../axiosInstance';

const BASE = '/employer/interviews';

// Old SLOT_API removed — live-video booking handled by IAEM (jobseekerSlotService)

// ── Helpers ─────────────────────────────────────────────────────────────────
const unwrapList = (resp) => {
  const data = resp?.data;
  if (Array.isArray(data))         return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
};

const UPCOMING_STATUSES = ['scheduled', 'invited', 'in_progress'];
const PAST_STATUSES     = ['completed', 'cancelled', 'no_attempt', 'disqualified', 'rescheduled'];

const isUpcoming = (iv) => UPCOMING_STATUSES.includes(iv?.status);
const isPast     = (iv) => PAST_STATUSES.includes(iv?.status);

// ── Service ─────────────────────────────────────────────────────────────────
const smartInterviewService = {
  _cachedAll: null,
  _cacheTime: 0,

  _getMyInterviews: async () => {
    const now = Date.now();
    if (smartInterviewService._cachedAll && now - smartInterviewService._cacheTime < 2000) {
      return smartInterviewService._cachedAll;
    }
    try {
      const resp = await api.get(`${BASE}/my/`);
      const raw  = resp?.data || {};
      const list = Array.isArray(raw) ? raw : (Array.isArray(raw.results) ? raw.results : []);
      const full = {
        results:    list,
        avg_score:  raw.avg_score  ?? null,
        best_score: raw.best_score ?? null,
        count:      raw.count      ?? list.length,
      };
      smartInterviewService._cachedAll = full;
      smartInterviewService._cacheTime = now;
      return full;
    } catch (err) {
      console.error(`[smartInterviewService] failed to load ${BASE}/my/:`, err);
      return { results: [], avg_score: null, best_score: null, count: 0 };
    }
  },


  requestReschedule: async (scheduledInterviewId, reason = '') => {
    const resp = await api.post(
      `${BASE}/schedule/${scheduledInterviewId}/request-reschedule/`,
      { reason },
    );
    // bust the 2s list cache so the UI reflects the new state immediately
    smartInterviewService._cachedAll = null;
    smartInterviewService._cacheTime = 0;
    return resp?.data ?? null;
  },

  // ── Book Interview (live-video) ──────────────────────────────────────────

  // 🔧 CHANGE 1/4 — extract resp.results before .filter() — resp is an object, not array
  getLiveInterviewSlots: async () => {
    const resp = await smartInterviewService._getMyInterviews();
    const list = Array.isArray(resp) ? resp : (resp.results ?? []);
    return list.filter((iv) => iv.interview_type === 'live-video' && isUpcoming(iv));
  },

  // 🔧 CHANGE 2/4 — same fix: extract resp.results before .filter()
  getLiveInterviewHistory: async () => {
    const resp = await smartInterviewService._getMyInterviews();
    const list = Array.isArray(resp) ? resp : (resp.results ?? []);
    return list.filter((iv) => iv.interview_type === 'live-video' && isPast(iv));
  },

 getDocumentBasedSessions: async () => {
    const resp = await smartInterviewService._getMyInterviews();
    const list = Array.isArray(resp) ? resp : (resp.results ?? []);
    return list.filter((iv) => iv.interview_type === 'document');
  },

  deleteDocumentSession: async (siId) => {
    await api.delete(`${BASE}/my/document/${siId}/`);
    smartInterviewService._cachedAll = null;
    smartInterviewService._cacheTime = 0;
  },

  deleteDocumentSessions: async (siIds) => {
    await api.post(`${BASE}/my/document/bulk-delete/`, { ids: siIds });
    smartInterviewService._cachedAll = null;
    smartInterviewService._cacheTime = 0;
  },
  // BUILD: 2026-08-04-deduplicate-pipeline-rounds
  getAIInterviewSessions: async () => {
    const resp = await smartInterviewService._getMyInterviews();
    const list = Array.isArray(resp) ? resp : (resp.results ?? []);
    const aiOnly = list.filter((iv) => iv.interview_type === 'ai-powered');

    const byProcess = new Map();
    const standalone = [];
    for (const iv of aiOnly) {
      const pid = iv.process_id;
      if (!pid) { standalone.push(iv); continue; }
      const existing = byProcess.get(pid);
      if (!existing) { byProcess.set(pid, iv); continue; }
 
      const rn     = iv.round_number       || 0;
      const exRn   = existing.round_number || 0;
      if (rn > exRn) byProcess.set(pid, iv);
      else if (rn === exRn) {
        const terminal = ['completed', 'scoring', 'cancelled', 'rejected'];
        if (terminal.includes(existing.status) && !terminal.includes(iv.status)) {
          byProcess.set(pid, iv);
        }
      }
    }
    const deduped = [...standalone, ...byProcess.values()];

    return {
      results:    deduped,
      avg_score:  resp.avg_score  ?? null,
      best_score: resp.best_score ?? null,
    };
  },

  // ── Detail (used by take-interview pages, when wired) ────────────────────
  getInterviewDetail: async (id) => {
    const resp = await api.get(`${BASE}/my/${id}/`);
    return resp.data;
  },

  // ── Real-time AI Interview (Lanciere bridge → weekly_interview engine) ──
  startRealtimeAI: async (configId) => {
    const resp = await api.post(`${BASE}/ai/realtime/start/${configId}/`);
    return resp.data;   // { session_id, websocket_url, status, ... }
  },

  getRealtimeAIStatus: async (sessionId) => {
    const resp = await api.get(`${BASE}/ai/realtime/status/${sessionId}/`);
    return resp.data;   // { status, cgps_overall, cgps_communication, ... }
  },

  checkRealtimeAIHealth: async () => {
    const resp = await api.get(`${BASE}/ai/realtime/health/`);
    return resp.data;
  },

  // getMyPendingInvites — REMOVED (old SlotBookingInvite system replaced by IAEM)

  
  // getAvailableSlotsByToken — REMOVED (old token-based booking replaced by IAEM)
  // bookSlotByToken — REMOVED (old token-based booking replaced by IAEM)

  joinWaitingRoom: async (slotId) => {
    const resp = await api.post(`/iaem/jobseeker/slots/status/${slotId}/join/`);
    return resp.data;
  },

  checkSlotStatus: async (slotId) => {
    const resp = await api.get(`/iaem/jobseeker/slots/status/${slotId}/`);
    return resp.data;
  },

  // ── Candidate soft-delete for AI / aptitude interviews ───────────────────
  deleteAISession: async (siId) => {
    const resp = await api.delete(`${BASE}/my/ai/${siId}/`);
    // Bust the 2s list cache so next getAIInterviewSessions() is fresh
    smartInterviewService._cachedAll = null;
    smartInterviewService._cacheTime = 0;
    return resp.data;
  },

  deleteAISessions: async (ids) => {
    const resp = await api.post(`${BASE}/my/ai/bulk-delete/`, { ids });
    smartInterviewService._cachedAll = null;
    smartInterviewService._cacheTime = 0;
    return resp.data;
  },

  // ── BUILD: 2026-08-07-smart-soft-delete-v1 ──
  // Book Interview page — candidate soft-delete
  deleteSmartInterview: async (siId) => {
    const resp = await api.delete(`${BASE}/my/smart/${siId}/`);
    smartInterviewService._cachedAll = null;
    smartInterviewService._cacheTime = 0;
    return resp.data;
  },

  // deleteSmartInvite — REMOVED (old SlotBookingInvite system replaced by IAEM)

  deleteSmartBulk: async (ids = []) => {
    const resp = await api.post(`${BASE}/my/smart/bulk-delete/`, {
      ids,
    });
    smartInterviewService._cachedAll = null;
    smartInterviewService._cacheTime = 0;
    return resp.data;
  },
};

export function invalidateSmartInterviewsCache() {
  smartInterviewService._cachedAll = null;
  smartInterviewService._cacheTime = 0;
}

export default smartInterviewService;