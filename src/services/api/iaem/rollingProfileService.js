import api from '../axiosInstance';

const pk = (id) => {
  if (typeof id === 'number') return id;
  const m = String(id).match(/(\d+)/);
  return m ? parseInt(m[1], 10) : id;
};

const rollingProfileService = {

  getRollingProfile: (interviewerId, windowDays = 60) =>
    api.get(`/iaem/hr/rolling-profiles/${pk(interviewerId)}/`, {
      params: { window: windowDays },
    }),

  // Download PDF report — returns a blob
  downloadReport: (interviewerId, windowDays = 60) =>
    api.get(`/iaem/hr/rolling-profiles/${pk(interviewerId)}/report/`, {
      params: { window: windowDays },
      responseType: 'blob',
    }),
};

export default rollingProfileService;
