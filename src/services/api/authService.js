import api from './axiosInstance';
// authService.js or axios config

const authService = {
  // ── Auth ──────────────────────────────────────────────────────────────────
  login: (email, password, role) =>
    api.post('/auth/login', { email, password, role }),

  register: (payload) =>
    api.post('/auth/register/', payload),

  // ── Password Reset (3-step OTP flow) ─────────────────────────────────────
 // Returns { Email, Roles: ['COMPANY', ...] } — used by forgot-password picker
  resetRolesForEmail: (email) =>
    api.post('/auth/reset-roles-for-email', { email }),

  // user_type: 'COMPANY' | 'EMPLOYER' | 'JOBSEEKER' | 'ALL' — omit for legacy
  forgotPassword: (email, user_type) =>
    api.post('/auth/forgot-password', user_type ? { email, user_type } : { email }),

  resendResetOtp: (email, user_type) =>
    api.post('/auth/resend-reset-otp', user_type ? { email, user_type } : { email }),

  verifyResetOtp: (email, otp) =>
    api.post('/auth/verify-reset-otp', { email, otp }),      // was missing

  resetPassword: (email, otp, new_password) =>
    api.post('/auth/reset-password', { email, otp, new_password }),  // key: new_password not password

  // ── Token ─────────────────────────────────────────────────────────────────
  refreshToken: (refresh) =>
    api.post('/auth/token/refresh/', { refresh }),

  verifyToken: () =>
    api.get('/auth/verify'),

  // ── Profile ───────────────────────────────────────────────────────────────
  getProfile:    ()     => api.get('/auth/me/'),
  updateProfile: (data) => api.patch('/auth/me/', data),
};

export default authService;