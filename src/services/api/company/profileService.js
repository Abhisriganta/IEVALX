import api from '@/services/api/axiosInstance';

// The axios instance defaults to application/json, so multipart calls must
// clear it. Setting 'multipart/form-data' by hand is NOT the fix: the browser
// only appends the boundary when it generates the header itself, and without
// a boundary Django's MultiPartParser reads zero files.
const MULTIPART = { headers: { 'Content-Type': undefined } };

export const fetchFullProfile = async (companyId) => {
  const res = await api.get(`/companies/${companyId}/full-profile`);
  return res.data;
};

export const updateAccountSection = async (companyId, payload) => {
  const hasFile = payload.profile_image_file instanceof File;
  if (hasFile) {
    const fd = new FormData();
    Object.entries(payload).forEach(([k, v]) => {
      if (v === null || v === undefined) return;
      if (k === 'profile_image_file')         fd.append('profile_image', v); // backend field name
      else if (k === 'profile_image_preview') return;                        // local blob, skip
      else                                     fd.append(k, v);
    });
    const res = await api.patch(`/companies/${companyId}/account`, fd, MULTIPART);
    return res.data;
  }
  const { profile_image_file, profile_image_preview, ...jsonPayload } = payload;
  const res = await api.patch(`/companies/${companyId}/account`, jsonPayload);
  return res.data;
};

export const updateCompanySection = async (companyId, payload) => {
  const hasFile = payload.company_logo_file instanceof File;
  if (hasFile) {
    const fd = new FormData();
    Object.entries(payload).forEach(([k, v]) => {
      if (v === null || v === undefined) return;
      if (k === 'company_logo_file')   fd.append('company_logo', v);
      else if (k === 'company_logo_preview') return;        // local-only
      else fd.append(k, v);
    });
    const res = await api.patch(`/companies/${companyId}/company-info`, fd, MULTIPART);
    return res.data;
  }
  const { company_logo_file, company_logo_preview, ...jsonPayload } = payload;
  const res = await api.patch(`/companies/${companyId}/company-info`, jsonPayload);
  return res.data;
};

export const updateAddressSection = async (companyId, payload) => {
  const res = await api.patch(`/companies/${companyId}/address`, payload);
  return res.data;
};

export const updateSocialSection = async (companyId, payload) => {
  const res = await api.patch(`/companies/${companyId}/social`, payload);
  return res.data;
};

export const changePassword = async (companyId, payload) => {
  const res = await api.post(`/companies/${companyId}/change-password`, payload);
  return res.data;
};

export const uploadDocument = async (companyId, { type, title, file }) => {
  const fd = new FormData();
  fd.append('document_type',  type);
  fd.append('document_title', title || '');
  fd.append('document_file',  file);
  const res = await api.post(`/companies/${companyId}/documents`, fd, MULTIPART);
  return res.data;
};

export const replaceDocument = async (companyId, documentId, { title, file }) => {
  const fd = new FormData();
  if (title) fd.append('document_title', title);
  if (file)  fd.append('document_file',  file);
  const res = await api.put(`/companies/${companyId}/documents/${documentId}`, fd, MULTIPART);
  return res.data;
};

export const deleteDocument = async (companyId, documentId) => {
  const res = await api.delete(`/employers/company-document/delete/${documentId}`);
  return res.data;
};

export const fetchDocumentVerificationStatus = async (companyProfileId) => {
  const res = await api.get(
    `/employers/company-profile/${companyProfileId}/documents/verification-status`,
  );
  return res.data;
};

export const fetchDocumentVerificationStatusByCompanyId = async (companyId) => {
  const res = await api.get(
    `/employers/company/${companyId}/documents/verification-status`,
  );
  return res.data;
};

export const fetchRejectedDocuments = async (companyId) => {
  const res = await api.get(`/employers/company/${companyId}/documents/rejected`);
  return res.data;
};