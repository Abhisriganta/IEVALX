import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// ── Helpers ───────────────────────────────────────────────────────────────
function clearSession() {
  localStorage.removeItem('ievalx_token');
  localStorage.removeItem('ievalx_refresh_token');
  localStorage.removeItem('ievalx_user');
  localStorage.removeItem('currentCompanyId');
  window.location.href = '/auth';
}

function getToken() {
  return localStorage.getItem('ievalx_token');
}

function isRealJwt(token) {
  return token && token.includes('.');
}

function tokenExpiresIn(token) {
  try {
    const { exp } = jwtDecode(token);
    return exp * 1000 - Date.now();
  } catch {
    return -1;
  }
}

// ── Proactive refresh (runs while token is still valid) ──────────────────
const REFRESH_BUFFER_MS = 5 * 60 * 1000;        // refresh 5 min before expiry
let refreshTimer = null;

function scheduleRefresh() {
  clearTimeout(refreshTimer);
  const token = getToken();
  if (!token || !isRealJwt(token)) return;

  const remaining = tokenExpiresIn(token);
  const delay = remaining - REFRESH_BUFFER_MS;

  if (delay <= 0 && remaining > 0) {
    doRefresh();
  } else if (delay > 0) {
    refreshTimer = setTimeout(doRefresh, delay);
  }
}

async function doRefresh() {
  const token = getToken();
  if (!token || !isRealJwt(token)) return;

  try {
    const { data } = await axios.post(
      `${API_BASE_URL}/auth/refresh`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    localStorage.setItem('ievalx_token', data.Token);
    scheduleRefresh();
  } catch {
    const remaining = tokenExpiresIn(getToken());
    if (remaining <= 0) clearSession();
  }
}

// Start the timer on module load (handles page refresh / tab reopen)
scheduleRefresh();

// Call this from LoginForm after storing the token
export function onLoginSuccess(token) {
  localStorage.setItem('ievalx_token', token);
  scheduleRefresh();
}

// Call this from logout handler
export function onLogout() {
  clearTimeout(refreshTimer);
  localStorage.removeItem('ievalx_token');
  localStorage.removeItem('ievalx_refresh_token');
  localStorage.removeItem('ievalx_user');
  localStorage.removeItem('currentCompanyId');
  window.location.href = '/auth';
}

// ── Request interceptor: attach access token ─────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Single-flight token refresh (shared across concurrent 401s) ──────────
let _refreshInFlight = null;
async function refreshAccessToken() {
  const token = getToken();
  if (!token || !isRealJwt(token)) throw new Error('No valid token to refresh');
  const { data } = await axios.post(
    `${API_BASE_URL}/auth/refresh`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!data?.Token) throw new Error('Refresh response missing Token');
  localStorage.setItem('ievalx_token', data.Token);
  scheduleRefresh();
  return data.Token;
}

const AUTH_401_PASSTHROUGH = [
  '/auth/login',
  '/auth/login-discover',
  '/auth/forgot-password',
  '/auth/reset-roles-for-email',
  '/auth/resend-reset-otp',
  '/auth/verify-reset-otp',
  '/auth/reset-password',
];

function isAuthPassthrough(url) {
  if (!url) return false;
  return AUTH_401_PASSTHROUGH.some((p) => url.includes(p));
}

// ── Response interceptor: on 401, refresh once and retry, else log out ───
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    // Skip refresh-and-retry for auth endpoints — their 401s are meaningful.
    if (error.response?.status === 401 && isAuthPassthrough(original?.url)) {
      return Promise.reject(error);
    }
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      try {
        // Reuse one in-flight refresh if several requests 401 at once
        _refreshInFlight = _refreshInFlight || refreshAccessToken().finally(() => {
          _refreshInFlight = null;
        });
        const newToken = await _refreshInFlight;
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);            // retry the original request
      } catch (e) {
        clearSession();                  // refresh failed → session truly dead
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

export default api;