/**
 * src/utils/apiError.js
 * ---------------------------------------------------------------------------
 * One place to turn an axios failure into something a form can render.
 *
 * The jobseeker backend is mid-migration and currently speaks three dialects:
 *
 *   Rebuilt modules (education, and everything that follows):
 *     { success: false, message: "...", errors: { field: "reason" }, Error: "..." }
 *
 *   Original modules:
 *     { Error: "company_name is required" }
 *
 *   A few older handlers:
 *     { error: "..." }  |  { detail: "..." }  |  bare string
 *
 * unwrapError() reads all of them and always returns the same shape, so a
 * section component never has to care which backend it is talking to.
 * ---------------------------------------------------------------------------
 */

const GENERIC_MESSAGE = 'Something went wrong. Please try again.';

const NETWORK_MESSAGE =
  'Cannot reach the server. Check your connection and try again.';

const TIMEOUT_MESSAGE =
  'The server took too long to respond. Please try again.';

/**
 * Field keys the backend uses for errors that belong to the form as a whole
 * rather than to any one input.
 */
const FORM_LEVEL_KEYS = ['_error', '_'];

const isFormLevelKey = (key) =>
  FORM_LEVEL_KEYS.includes(key) || key.startsWith('_error');

/**
 * @typedef  {Object} UnwrappedError
 * @property {string}  message      Human-readable summary, safe to toast.
 * @property {Object}  fieldErrors  { fieldName: message } for inline display.
 * @property {number?} status       HTTP status, when there was a response.
 * @property {boolean} isNetwork    True when the request never reached the server.
 * @property {boolean} isAuth       True for 401/403.
 * @property {boolean} isConflict   True for 409 (duplicate entry).
 */

/**
 * @param   {unknown} error  An axios error, a plain Error, or anything else.
 * @returns {UnwrappedError}
 */
export function unwrapError(error) {
  const base = {
    message: GENERIC_MESSAGE,
    fieldErrors: {},
    status: null,
    isNetwork: false,
    isAuth: false,
    isConflict: false,
  };

  if (!error) return base;

  // ── No response: offline, DNS failure, CORS, timeout ────────────────────
  if (error.code === 'ECONNABORTED') {
    return { ...base, message: TIMEOUT_MESSAGE, isNetwork: true };
  }
  if (error.request && !error.response) {
    return { ...base, message: NETWORK_MESSAGE, isNetwork: true };
  }

  const response = error.response;
  if (!response) {
    return { ...base, message: error.message || GENERIC_MESSAGE };
  }

  const status = response.status;
  const data = response.data;

  const result = {
    ...base,
    status,
    isAuth: status === 401 || status === 403,
    isConflict: status === 409,
  };

  // Some endpoints return a bare string body.
  if (typeof data === 'string' && data.trim()) {
    return { ...result, message: data.trim() };
  }

  if (!data || typeof data !== 'object') {
    return { ...result, message: statusFallback(status) };
  }

  // ── Field-level errors (rebuilt modules) ────────────────────────────────
  if (data.errors && typeof data.errors === 'object' && !Array.isArray(data.errors)) {
    const fieldErrors = {};
    const formLevel = [];

    Object.entries(data.errors).forEach(([key, value]) => {
      const text = Array.isArray(value) ? value[0] : String(value);
      if (isFormLevelKey(key)) formLevel.push(text);
      else fieldErrors[key] = text;
    });

    result.fieldErrors = fieldErrors;
    result.message =
      data.message ||
      data.Error ||
      formLevel[0] ||
      Object.values(fieldErrors)[0] ||
      statusFallback(status);

    return result;
  }

  // Some handlers return errors as a plain array of strings.
  if (Array.isArray(data.errors) && data.errors.length) {
    return { ...result, message: String(data.errors[0]) };
  }

  // ── Legacy single-message shapes ────────────────────────────────────────
  const message =
    data.Error ||
    data.error ||
    data.message ||
    data.Message ||
    data.detail ||
    statusFallback(status);

  return { ...result, message: String(message) };
}

function statusFallback(status) {
  switch (status) {
    case 400: return 'Some of the details are not valid. Please review and try again.';
    case 401: return 'Your session has expired. Please log in again.';
    case 403: return 'You do not have permission to do that.';
    case 404: return 'We could not find what you were looking for.';
    case 409: return 'That entry already exists.';
    case 413: return 'That file is too large.';
    case 429: return 'Too many requests. Please wait a moment and try again.';
    default:
      return status >= 500
        ? 'The server ran into a problem. Please try again shortly.'
        : GENERIC_MESSAGE;
  }
}

/**
 * Pull the payload out of a success response, tolerating both envelopes.
 *
 *   new:    { success: true, data: {...}, education: [...] }
 *   legacy: { success: true, education: [...] }
 *
 * @param {Object} responseData  response.data
 * @param {string} legacyKey     e.g. 'education', 'employments'
 * @param {*}      fallback      returned when neither key is present
 */
export function unwrapData(responseData, legacyKey, fallback = null) {
  if (!responseData || typeof responseData !== 'object') return fallback;

  if (legacyKey && responseData[legacyKey] !== undefined) {
    return responseData[legacyKey];
  }

  if (responseData.data !== undefined) {
    const inner = responseData.data;
    if (legacyKey && inner && typeof inner === 'object' && inner[legacyKey] !== undefined) {
      return inner[legacyKey];
    }
    return inner;
  }

  return fallback;
}

export default unwrapError;
