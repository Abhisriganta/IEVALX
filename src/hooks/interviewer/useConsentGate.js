// BUILD: 2026-08-24-iaem-consentGate-v1
// Mirrors the isDocGateSet() pattern from hooks/company/useDocumentReupload.js
// Used by PrivateRoute to block interviewer dashboard access until all 12 clauses are acked.

const STORAGE_KEY = 'ievalx_consent_pending';

/** Check if the consent gate is blocking (synchronous — no API call). */
export function isConsentGateSet() {
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

/** Set the gate (called at login when consent is incomplete). */
export function setConsentGate() {
  localStorage.setItem(STORAGE_KEY, 'true');
}

/** Clear the gate (called when clause 12 is acknowledged). */
export function clearConsentGate() {
  localStorage.removeItem(STORAGE_KEY);
}
