// HTTP client configuration. Adjust timeouts / headers here rather than in axios calls.
import env from './env';

export const apiConfig = {
  baseURL: '/api',                 // proxied by Vite to VITE_API_BASE_URL in dev
  absoluteBaseURL: env.API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
};

export default apiConfig;
