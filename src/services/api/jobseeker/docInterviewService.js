import api from '../axiosInstance';
const BASE = '/employer/interviews';

const docInterviewService = {
  startRealtimeDoc: async (siId) => {
    try {
      const resp = await api.post(`${BASE}/doc/realtime/start/${siId}/`, {}, { timeout: 30000 });
      return resp.data;
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        'Could not start the document interview. Please try again.';
      throw new Error(msg);
    }
  },

  getRealtimeDocStatus: async (siId) => {
    const resp = await api.get(`${BASE}/doc/realtime/status/${siId}/`);
    return resp.data;
  },
};

export default docInterviewService;