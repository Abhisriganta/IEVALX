
import api from '../axiosInstance';

const BASE = '/iaem/interviewer-auth';

const interviewerAuthService = {


  getCompanies: (search = '') =>
    api.get(`${BASE}/companies/`, { params: search ? { search } : {} }),

  // Step 0a — Request email-verification OTP (public, no auth)
  // POST /api/iaem/interviewer-auth/request-email-otp/  { email }
  requestEmailOtp: (email) =>
    api.post(`${BASE}/request-email-otp/`, { email }),

  // Step 0b — Verify email OTP (public, no auth)
  // POST /api/iaem/interviewer-auth/verify-email-otp/  { email, otp }
  verifyEmailOtp: (email, otp) =>
    api.post(`${BASE}/verify-email-otp/`, { email, otp }),

  // Step 1 — Interviewer self-registration (public, no auth)
  // POST /api/iaem/interviewer-auth/register/
  register: (payload) =>
    api.post(`${BASE}/register/`, payload),

  // Step 4 — Activate account (public, token from approval email)
  // POST /api/iaem/interviewer-auth/activate/
  activate: (token, password) =>
    api.post(`${BASE}/activate/`, { token, password }),

  // Acknowledge a single consent clause (requires INTERVIEWER JWT)
  // POST /api/iaem/interviewer-auth/consent/acknowledge/
  acknowledgeClause: (clauseNo) =>
    api.post(`${BASE}/consent/acknowledge/`, { clause_no: clauseNo }),

  getConsentStatus: () =>
    api.get(`${BASE}/consent/status/`),
};

export default interviewerAuthService;
