import axios from "./api/axiosInstance";

const CONTACT_ENDPOINT = "/support/contact";
const normalizeError = (err) => {
  const status = err?.response?.status;
  const data   = err?.response?.data || {};
  const message =
    data.message ||
    data.Error   ||
    data.detail  ||
    (status === 0 || err.code === "ERR_NETWORK"
      ? "Network error. Please check your connection and try again."
      : "Could not send your message right now. Please try again.");
  const out = new Error(message);
  out.status = status;
  return out;
};

/**
 * Send a contact-form message to support.
 * @param {{ name: string, email: string, topic?: string, message: string }} payload
 * @returns {Promise<{ sent: true, message: string }>}
 * @throws  {Error}
 */
export async function sendContactMessage(payload) {
  const body = {
    name:    (payload.name    || "").trim(),
    email:   (payload.email   || "").trim(),
    topic:   (payload.topic   || "").trim(),
    message: (payload.message || "").trim(),
  };

  try {
    const { data } = await axios.post(CONTACT_ENDPOINT, body);
    return {
      sent:    data?.sent === true,
      message: data?.message || "Thanks — we'll get back to you within 24 hours.",
    };
  } catch (err) {
    throw normalizeError(err);
  }
}

/**
 * Lightweight client-side check before hitting the network.
 * @param {{ name?: string, email?: string, message?: string }} form
 * @returns {boolean}
 */
export function isContactFormValid(form = {}) {
  const name    = (form.name    || "").trim();
  const email   = (form.email   || "").trim();
  const message = (form.message || "").trim();
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  return Boolean(name && emailOk && message);
}

export default { sendContactMessage, isContactFormValid };