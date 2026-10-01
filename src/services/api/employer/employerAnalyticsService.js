import api from '../axiosInstance';

const employerAnalyticsService = {
  
  getOverview: (period = '6m') =>
    api.get('/employer/analytics/overview/', { params: { period } }),
};

export default employerAnalyticsService;
