import axiosInstance from '../axiosInstance';

const unwrap = (promise) =>
  promise
    .then((res) => res.data)
    .catch((err) => {
      const data = err?.response?.data;
      const msg =
        data?.Error || data?.error || data?.message ||
        err?.message || 'Request failed';
      const e = new Error(msg);
      e.status = err?.response?.status;
      e.data = data;
      throw e;
    });

const applicantService = {
  /** List all applicants for a specific job, optionally filtered by status. */
 listByJob: (jobId, status = '') => {
    return unwrap(axiosInstance.get(`/jobs/${jobId}/applications`));
},


  computeMatchScore: (applicationId) =>
    unwrap(axiosInstance.post(`/jobs/application/${applicationId}/match-score`)),

  /** Single applicant detail — includes the education child rows. */
  getDetail: (applicationId) =>
    unwrap(axiosInstance.get(`/jobs/application/${applicationId}`)),

  /** Status breakdown for a job (counts per APPLIED / SHORTLISTED / etc.). */
  getJobStats: (jobId) =>
    unwrap(axiosInstance.get(`/jobs/${jobId}/application-stats`)),

  /** Update one applicant's status. Used later for shortlist / reject. */
  updateStatus: (applicationId, applicationStatus) =>
    unwrap(axiosInstance.put(
      `/jobs/application/${applicationId}/status`,
      { application_status: applicationStatus },
    )),

  /** Bulk status update — used later for multi-select shortlist / reject. */
  bulkUpdateStatus: (applicationIds, applicationStatus) =>
    unwrap(axiosInstance.put(
      `/jobs/application/bulk-status`,
      {
        application_ids:    applicationIds,
        application_status: applicationStatus,
      },
    )),
};

export default applicantService;