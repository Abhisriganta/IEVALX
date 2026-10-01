import api from "./api/axiosInstance";

export const isValidEmail = (email) => {
  if (typeof email !== "string") return false;
  const trimmed = email.trim();
  if (trimmed.length === 0 || trimmed.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
};

const normalizeError = (err, fallbackCode = "SERVER_ERROR") => {
  const status = err?.response?.status;
  const data   = err?.response?.data || {};
  const code   = data.code || (status === 429 ? "RATE_LIMITED" : fallbackCode);
  const message =
    data.message ||
    data.detail  ||
    data.Error   ||
    (status === 0 || err.code === "ERR_NETWORK"
      ? "Network error. Please check your connection and try again."
      : "Something went wrong. Please try again.");
  const out = new Error(message);
  out.code   = code;
  out.status = status;
  return out;
};

/**

 *
 * @param {string} email
 * @param {object} [opts]
 * @param {string} [opts.source="footer"] 
 *                                          .
 * @param {string} [opts.hp=""]           
 * @returns {Promise<{ status: "PENDING_VERIFICATION"|"ALREADY_ACTIVE", email?: string, message: string }>}
 * @throws  {Error} err.code ∈ { INVALID_EMAIL, RATE_LIMITED, SERVER_ERROR }
 */
export const subscribe = async (email, { source = "footer", hp = "" } = {}) => {
  const cleaned = (email || "").trim().toLowerCase();

  if (!isValidEmail(cleaned)) {
    const err = new Error("Please enter a valid email address.");
    err.code = "INVALID_EMAIL";
    throw err;
  }

  if (hp && hp.trim() !== "") {
    return {
      status: "PENDING_VERIFICATION",
      message: "Check your inbox to confirm your subscription.",
    };
  }

  try {
    const { data } = await api.post("/newsletter/subscribe", {
      email:  cleaned,
      source: source || "footer",
    });

    return {
      status:  data?.status  || "PENDING_VERIFICATION",
      email:   data?.email,
      message: data?.message || "Check your inbox to confirm your subscription.",
    };
  } catch (err) {
    throw normalizeError(err);
  }
};

/**
 * Verify a subscription using the token from the confirmation email.
 * Fired by Footer.jsx when the URL carries ?nl_verify=<token>.
 *
 * @param {string} token
 * @returns {Promise<{ status: "ACTIVE"|"ALREADY_ACTIVE", email?: string, message: string }>}
 * @throws  {Error} err.code ∈ { INVALID_TOKEN, USED_TOKEN, SERVER_ERROR }
 */
export const verifySubscription = async (token) => {
  const t = (token || "").trim();
  if (!t) {
    const err = new Error("Missing verification token.");
    err.code = "INVALID_TOKEN";
    throw err;
  }
  try {
    const { data } = await api.post("/newsletter/verify", { token: t });
    return {
      status:  data?.status  || "ACTIVE",
      email:   data?.email,
      message: data?.message || "You're subscribed. Welcome aboard!",
    };
  } catch (err) {
    throw normalizeError(err, "INVALID_TOKEN");
  }
};

/**
 * Unsubscribe using the token from a newsletter email footer.
 * Fired by Footer.jsx when the URL carries ?nl_unsubscribe=<token>.
 *
 * @param {string} token
 * @returns {Promise<{ status: "UNSUBSCRIBED", email?: string, message: string }>}
 * @throws  {Error} err.code ∈ { INVALID_TOKEN, SERVER_ERROR }
 */
export const unsubscribeByToken = async (token) => {
  const t = (token || "").trim();
  if (!t) {
    const err = new Error("Missing unsubscribe token.");
    err.code = "INVALID_TOKEN";
    throw err;
  }
  try {
    const { data } = await api.post("/newsletter/unsubscribe", { token: t });
    return {
      status:  data?.status  || "UNSUBSCRIBED",
      email:   data?.email,
      message: data?.message || "You have been unsubscribed.",
    };
  } catch (err) {
    throw normalizeError(err, "INVALID_TOKEN");
  }
};

export default {
  isValidEmail,
  subscribe,
  verifySubscription,
  unsubscribeByToken,
};