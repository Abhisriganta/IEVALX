import api from '../axiosInstance';

const overviewService = {
  getCandidatePerformance: async () => {
    try {
      const response = await api.get('/jobseeker/analytics/');
      return response.data;
    } catch (error) {
      console.error('Error fetching candidate performance:', error);
      throw error;
    }
  },
};

export default overviewService;