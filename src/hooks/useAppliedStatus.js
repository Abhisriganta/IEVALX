import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ROLES } from '@/constants';
import jobService from '@/services/api/jobseeker/jobService';

// ============================================================================
// useAppliedStatus — "has this jobseeker already applied?" for PUBLIC surfaces
// ----------------------------------------------------------------------------
// WHY THIS EXISTS: the landing Feature Jobs cards, the public /jobs Browse
// cards, the JobDetailPage hero CTA, and the similar-jobs rail all render an
// "Apply Now" CTA — but none of them consulted the applications ledger, so a
// logged-in jobseeker kept seeing a live Apply button on jobs they had
// already applied to (unlike the dashboard Find Jobs page, which reads
// jobService.isJobApplied / getAppliedLabel).
//
// SOURCE OF TRUTH: the exact same local applications ledger FindJobs/JobCard
// use (jobService.getAppliedLabel), so the public badge and the dashboard
// badge can never disagree.
//
// THE STALENESS GAP THIS CLOSES: the ledger is written at apply time and
// synced from the server only by the dashboard pages (JobseekerDashboard,
// Applications). A jobseeker logging in on a FRESH browser who lands on a
// public page first would have an empty ledger — every badge would lie. So
// the first mounted consumer kicks off ONE background server sync
// (jobService.getApplications() writes the ledger on success) and every
// consumer re-renders when it lands.
//
// DEDUPE: the sync promise is cached at module level PER CANDIDATE ID, so
// twenty JobCards mounting together produce exactly one network call — and a
// different candidate logging in later still gets their own sync. StrictMode
// double-invoke is naturally safe: the second effect run finds the cached
// promise and just re-subscribes.
//
// GUESTS / EMPLOYERS: zero network calls, labels always null, UI unchanged.
// ============================================================================

/** Module-level sync cache: candidateKey -> Promise. */
const syncPromises = new Map();

/** Same identity jobService.currentCandidateId() derives (from the
 *  'ievalx_user' object AuthContext writes at login), read defensively. */
const candidateKey = () => {
  try {
    const u = JSON.parse(localStorage.getItem('ievalx_user') || 'null');
    return String(u?.id ?? u?.candidate_id ?? 'anon');
  } catch {
    return 'anon';
  }
};

const ensureLedgerSynced = (key) => {
  if (!syncPromises.has(key)) {
    syncPromises.set(
      key,
      jobService
        .getApplications() // writes the local ledger on success
        .catch(() => {})   // offline / server down — local ledger still applies
    );
  }
  return syncPromises.get(key);
};

/**
 * @returns {{ appliedLabelFor: (jobId: any) => string|null, isJobseeker: boolean }}
 *   appliedLabelFor — time-aware label ("Applied just now" / "Applied today" /
 *   "Already Applied") or null when not applied / not a jobseeker.
 */
export default function useAppliedStatus() {
  const { isAuthenticated, role } = useAuth();
  const isJobseeker = isAuthenticated && role === ROLES.JOBSEEKER;

  // Bumped when the background sync completes so labels recompute.
  const [ledgerVersion, setLedgerVersion] = useState(0);

  useEffect(() => {
    if (!isJobseeker) return undefined;
    let cancelled = false; // StrictMode double-invoke guard
    ensureLedgerSynced(candidateKey()).then(() => {
      if (!cancelled) setLedgerVersion((v) => v + 1);
    });
    return () => { cancelled = true; };
  }, [isJobseeker]);

  const appliedLabelFor = (jobId) =>
    isJobseeker && ledgerVersion >= 0 ? jobService.getAppliedLabel(jobId) : null;

  return { appliedLabelFor, isJobseeker };
}