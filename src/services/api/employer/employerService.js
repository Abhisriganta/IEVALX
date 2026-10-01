import api from '../axiosInstance';

const employerService = {
  getDashboard:       async ()    => {
    const res = await api.get('/employers/dashboard/summary');
    return { ...res, data: res?.data?.data ?? res?.data };
  },
  getMyJobs:          (params)    => api.get('/employer/jobs/',          { params }),
  createJob:          (data)      => api.post('/employer/jobs/',          data),
  updateJob:          (id, data)  => api.put(`/employer/jobs/${id}/`,     data),
  deleteJob:          (id)        => api.delete(`/employer/jobs/${id}/`),
  toggleJobStatus:    (id)        => api.patch(`/employer/jobs/${id}/toggle-status/`),
  getCandidates:      (jobId, params) => api.get(`/employer/jobs/${jobId}/candidates/`, { params }),
  updateCandidateStatus: (appId, status) => api.patch(`/employer/applications/${appId}/`, { status }),
  searchTalent:       (params)    => api.get('/employer/talent-search/',  { params }),
  getInterviews:      (params)    => api.get('/employer/interviews/',     { params }),
  scheduleInterview:  (data)      => api.post('/employer/interviews/',    data),
  updateInterview:    (id, data)  => api.put(`/employer/interviews/${id}/`, data),
  deleteInterview:    (id)        => api.delete(`/employer/interviews/${id}/`),
  getAnalytics:       (params)    => api.get('/employer/analytics/',      { params }),
};

export default employerService;