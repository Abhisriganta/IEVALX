import { useState, useEffect, useCallback, useRef } from 'react';
import { useRefetchOnFocus } from '../useRefetchOnFocus';
import applicantService   from '../../services/api/employer/applicantService';
import jobseekerService   from '../../services/api/jobseeker/jobseekerService';
/**
 *
 * @param {number|string} jobId         
 * @param {string}        statusFilter                                    
 */
export const useJobApplicants = (jobId, statusFilter = 'all') => {
  const [applicants, setApplicants] = useState([]);
  const [total, setTotal]           = useState(0);
  const [jobTitle, setJobTitle]     = useState('');
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');

  const isMountedRef = useRef(true);
  const scoreAttemptedRef = useRef(new Set());
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  /* ── Fetch ──────────────────────────────────────────────────────── */
  const refresh = useCallback(async () => {
    if (!jobId) return;
    if (isMountedRef.current) {
      setLoading(true);
      setError('');
    }
    try {
      const data = await applicantService.listByJob(jobId, statusFilter);
      if (!isMountedRef.current) return;

    const raw = Array.isArray(data?.Applications) ? data.Applications : [];
      setApplicants(raw.map(a => ({
        ...a,
        application_photo_url: a.application_photo_url || jobseekerService.photoUrlFor(a.candidate_id),
      })));

      setTotal(Number(data?.Total_Applications ?? 0));
      if (data?.Job_Title) setJobTitle(String(data.Job_Title));
      (async () => {
        for (const row of raw) {
          if (!isMountedRef.current) return;
          const hasScore  = typeof row.match_score === 'number';
          const hasResume = Boolean(row.resume_s3_key);
                    if (hasScore || !hasResume || scoreAttemptedRef.current.has(row.id)) continue;
          try {
            const res = await applicantService.computeMatchScore(row.id);
            const score = res?.match_score;
            if (isMountedRef.current && typeof score === 'number') {
              scoreAttemptedRef.current.add(row.id);
              setApplicants(prev =>
                prev.map(a => (a.id === row.id ? { ...a, match_score: score } : a)),
              );
            } else {
              console.warn(`[matchScore] app=${row.id} returned non-numeric:`, res);
            }
          } catch (err) {
            console.warn(`[matchScore] app=${row.id} failed:`, err?.message || err);
          }
        }
      })();
    } catch (err) {
      if (!isMountedRef.current) return;
      setError(err?.message || 'Failed to load applicants');
      setApplicants([]);
      setTotal(0);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [jobId, statusFilter]);

  useEffect(() => {
    refresh();
  }, [refresh]);
  useRefetchOnFocus(refresh);

  /* ── Status mutations (used later by shortlist / reject) ────────── */
  const updateStatus = useCallback(async (applicationId, status) => {
    const res = await applicantService.updateStatus(applicationId, status);
    await refresh();
    return res;
  }, [refresh]);

  const bulkUpdateStatus = useCallback(async (applicationIds, status) => {
    const res = await applicantService.bulkUpdateStatus(applicationIds, status);
    await refresh();
    return res;
  }, [refresh]);

  /* Read-only — no list refresh needed. */
  const getDetail  = useCallback((id) => applicantService.getDetail(id),  []);
  const getJobStats = useCallback(()   => applicantService.getJobStats(jobId), [jobId]);

  return {
    applicants,
    total,
    jobTitle,
    loading,
    error,
    refresh,
    updateStatus,
    bulkUpdateStatus,
    getDetail,
    getJobStats,
  };
};

export default useJobApplicants;