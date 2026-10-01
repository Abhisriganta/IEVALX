import api from '../axiosInstance';

const BASE = '/employer/interviews';

// ── Helpers ──────────────────────────────────────────────────────────────────
const unwrapList = (resp) => {
  const data = resp?.data;
  if (Array.isArray(data))          return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
};

const isCampusRow = (iv) =>
  iv?.interview_mode === 'on_campus' ||
  iv?.is_campus_drive === true ||
  iv?.campus_drive === true ||
  iv?.drive_type === 'on_campus' ||
  iv?.drive_type === 'campus' ||
  iv?.interview_type === 'campus' ||
  iv?.interview_type === 'on-campus';

const UPCOMING = ['scheduled', 'invited', 'in_progress', 'scoring'];
const PAST     = ['completed', 'cancelled', 'no_attempt', 'disqualified', 'rescheduled'];

const isUpcoming = (iv) => UPCOMING.includes(iv?.status);
const isPast     = (iv) => PAST.includes(iv?.status);

// ── Service ───────────────────────────────────────────────────────────────────
const campusDriveService = {
  _cached:    null,
  _cacheTime: 0,

  _getAll: async () => {
    const now = Date.now();
    if (campusDriveService._cached && now - campusDriveService._cacheTime < 2000) {
      return campusDriveService._cached;
    }
    try {
      // Dedicated endpoint — returns only on_campus interviews
     const resp = await api.get(`${BASE}/my/campus/`);
      const raw  = resp?.data || {};
      const list = Array.isArray(raw)
        ? raw
        : Array.isArray(raw.results) ? raw.results : [];

      // Use backend scores if present, else calculate from sessions
      const scores     = list.filter(iv => iv.cgps_overall != null).map(iv => iv.cgps_overall);
      const avg_score  = scores.length
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : (raw.avg_score  ?? null);
      const best_score = scores.length
        ? Math.max(...scores)
        : (raw.best_score ?? null);

      const full = {
        results:    list,
        avg_score:  raw.avg_score  ?? avg_score,
        best_score: raw.best_score ?? best_score,
        count:      raw.count      ?? list.length,
      };
      campusDriveService._cached    = full;
      campusDriveService._cacheTime = now;
      return full;
    } catch (err) {
      console.error('[campusDriveService] /my/campus/ failed:', err?.response?.status, err?.message);
      return { results: [], avg_score: null, best_score: null, count: 0 };
    }
  },

  /** All campus-drive interviews — backend already filters, no client filter needed */
  getCampusDriveSessions: async () => {
    const resp = await campusDriveService._getAll();
    return {
      results:    resp.results    ?? [],
      avg_score:  resp.avg_score  ?? null,
      best_score: resp.best_score ?? null,
    };
  },

  getUpcoming: async () => {
    const { results } = await campusDriveService.getCampusDriveSessions();
    return results.filter(isUpcoming);
  },

  getHistory: async () => {
    const { results } = await campusDriveService.getCampusDriveSessions();
    return results.filter(isPast);
  },

  deleteSession: async (siId) => {
    await api.delete(`${BASE}/my/campus/${siId}/`);
    campusDriveService._cached    = null;
    campusDriveService._cacheTime = 0;
  },

  deleteSession: async (siId) => {
    await api.delete(`${BASE}/my/campus/${siId}/`);
    campusDriveService._cached    = null;
    campusDriveService._cacheTime = 0;
  },

  deleteSessions: async (siIds) => {
    await api.post(`${BASE}/my/campus/bulk-delete/`, { ids: siIds });
    campusDriveService._cached    = null;
    campusDriveService._cacheTime = 0;
  },

  getDetail: async (id) => {
    const resp = await api.get(`${BASE}/my/${id}/`);
    return resp.data;
  },

  startCampusDrive: async (configId) => {
    const resp = await api.post(
      `${BASE}/ai/realtime/start/${configId}/`,
      { is_campus_drive: true },
    );
    return resp.data;
  },

  getRealtimeStatus: async (sessionId) => {
    const resp = await api.get(`${BASE}/ai/realtime/status/${sessionId}/`);
    return resp.data;
  },

  getMyPendingInvites: async () => {
    try {
      const resp = await api.get(`${BASE}/slots/invites/my/`);
      return unwrapList(resp).filter(isCampusRow);
    } catch (err) {
      if (err?.response?.status === 404) return [];
      console.warn('[campusDriveService] failed to load invites:', err);
      return [];
    }
  },
};

export default campusDriveService;