import api from '@/services/api/axiosInstance';

const ACTOR_EMPLOYER = 'EMPLOYER';

const buildListJobsParams = (viewer = {}) => {
  const params = {};
  if (viewer.viewerRole)               params.viewer_role        = viewer.viewerRole;
  if (viewer.viewerCompanyId  != null) params.viewer_company_id  = viewer.viewerCompanyId;
  if (viewer.viewerEmployerId != null) params.viewer_employer_id = viewer.viewerEmployerId;
  if (viewer.postedVia)                params.posted_via         = viewer.postedVia;
  return params;
};
export const approvalService = {
  // ── LIST ──────────────────────────────────────────────────────────
  async listJobs({ viewer } = {}) {
    const res = await api.get('/jobs/list', {
      params: buildListJobsParams(viewer),
    });
    return res.data?.Jobs || [];
  },

  async getStats(viewerCompanyId) {
  const res = await api.get('/admin/jobs/stats', {
    params: viewerCompanyId != null ? { viewer_company_id: viewerCompanyId } : {},
  });
  return res.data || {};
},

  // ── APPROVAL WORKFLOW ─────────────────────────────────────────────
  async approveJob(jobId, approvedBy, actorType = ACTOR_EMPLOYER) {
    const res = await api.post(`/jobs/${jobId}/approve`, {
      approved_by: approvedBy,
      actor_type:  actorType,
    });
    return res.data;
  },

  async rejectJob(jobId, approvedBy, rejectionReason, actorType = ACTOR_EMPLOYER) {
    const res = await api.post(`/jobs/${jobId}/reject`, {
      approved_by:      approvedBy,
      actor_type:       actorType,
      rejection_reason: rejectionReason,
    });
    return res.data;
  },

  async removeJob(jobId, removedBy, removalReason = '', actorType = ACTOR_EMPLOYER) {
    const res = await api.post(`/jobs/${jobId}/remove`, {
      removed_by:     removedBy,
      actor_type:     actorType,
      removal_reason: removalReason,
    });
    return res.data;
  },

  async bulkApprove(jobIds, approvedBy, actorType = ACTOR_EMPLOYER) {
    const res = await api.post('/admin/jobs/bulk-approve', {
      job_ids:     jobIds,
      approved_by: approvedBy,
      actor_type:  actorType,
    });
    return res.data;
  },

  // ── PUBLISH / UNPUBLISH / CLOSE (no actor required) ───────────────
  async publishJob(jobId) {
    const res = await api.post(`/jobs/${jobId}/publish`);
    return res.data;
  },

  async unpublishJob(jobId) {
    const res = await api.post(`/jobs/${jobId}/unpublish`);
    return res.data;
  },

  async closeJob(jobId) {
    const res = await api.post(`/jobs/${jobId}/close`);
    return res.data;
  },

  // ── UPDATE (edit) ─────────────────────────────────────────────────
  async updateJob(jobId, payload) {
    const res = await api.put(`/jobs/update/${jobId}`, payload);
    return res.data;
  },

  // ── DELETE (permanent) ────────────────────────────────────────────
  async deleteJob(jobId) {
    const res = await api.delete(`/jobs/delete/${jobId}`);
    return res.data;
  },

  // ── EDIT-ACCESS REQUESTS (admin) ──────────────────────────────────
  // status: 'PENDING' (default) | 'APPROVED' | 'REJECTED' | 'CONSUMED' | 'ALL'
  async listEditRequests(status = 'PENDING') {
    const res = await api.get('/admin/jobs/edit-requests/pending/', {
      params: status && status !== 'PENDING' ? { status } : {},
    });
    return res.data?.Pending_Requests || [];
  },

  async approveEditRequest(requestId, adminNote = '') {
    const res = await api.post(
      `/admin/jobs/edit-requests/${requestId}/approve/`,
      { admin_note: adminNote || null }
    );
    return res.data;
  },

  async rejectEditRequest(requestId, adminNote = '') {
    const res = await api.post(
      `/admin/jobs/edit-requests/${requestId}/reject/`,
      { admin_note: adminNote || null }
    );
    return res.data;
  },

  // ── REPUBLISH REQUESTS (admin) ────────────────────────────────────
  async listRepublishRequests(status = 'PENDING') {
    const res = await api.get('/admin/jobs/republish-requests/pending/', {
      params: status && status !== 'PENDING' ? { status } : {},
    });
    return res.data?.Pending_Requests || [];
  },

  async approveRepublishRequest(requestId, adminNote = '') {
    const res = await api.post(
      `/admin/jobs/republish-requests/${requestId}/approve/`,
      { admin_note: adminNote || null }
    );
    return res.data;
  },

  async rejectRepublishRequest(requestId, adminNote = '') {
    const res = await api.post(
      `/admin/jobs/republish-requests/${requestId}/reject/`,
      { admin_note: adminNote || null }
    );
    return res.data;
  },
};

export default approvalService;