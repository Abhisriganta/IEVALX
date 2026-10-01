import api from '../axiosInstance';

const BASE = '/jobseekers/quick-interview';

const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem('ievalx_user') || '{}');
  } catch {
    return {};
  }
};

const quickInterviewService = {
  startQuickInterview: async () => {
    const candidateId = getUser()?.id;
    try {
      const resp = await api.post(
        `${BASE}/start/`,
        { candidate_id: candidateId },
        { timeout: 50000 },          // FastAPI generates the first question — allow generous window
      );
      const data = resp.data || {};
      return {
        attempt_id:     data.attempt_id,
        session_id:     data.session_id,
        test_id:        data.test_id,
        ai_session_id:  data.attempt_id,         // attempt_id doubles as the ai_session_id
        websocket_url:  (() => {
          const rel = data.websocket_url
            || (data.ws_url ? new URL(data.ws_url).pathname : '');
          if (!rel || typeof window === 'undefined') return data.ws_url || data.websocket_url || '';
          const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          return `${proto}//${window.location.host}${rel.startsWith('/') ? rel : '/' + rel}`;
        })(),  
        first_question: data.first_question,
        candidate_name: data.candidate_name,
        proctor_session_id: data.proctor_session_id,
      };
    } catch (err) {
      const msg =
        err?.response?.data?.Error ||
        err?.response?.data?.error ||
        'Could not start the quick interview. Please try again.';
      throw new Error(msg);
    }
  },

  getResult: async (attemptId) => {
    const resp = await api.get(`${BASE}/result/${attemptId}`);
    return resp.data?.Data || null;
  },
  prewarm: async () => {
    const candidateId = getUser()?.id;
    if (!candidateId) return;   // no logged-in user yet — nothing to warm
    try {
      await api.post(
        `${BASE}/prewarm/`,
        { candidate_id: candidateId },
        { timeout: 5000 },
      );
    } catch (_err) {
      // Non-fatal — prewarm is a nice-to-have.
    }
  },

  getHistory: async (candidateId) => {
    if (!candidateId) return [];
    const resp = await api.get(`${BASE}/list/${candidateId}`);
    return resp.data?.Data || [];
  },
};

export default quickInterviewService;