import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import jobPost from '@/services/api/company/jobPost';
const getBackendError = (err, fallback) => {
  return err?.response?.data?.Error
    || err?.response?.data?.message
    || err?.response?.data?.error
    || err?.message
    || fallback;
};

const isPublished = (status) => String(status || '').toUpperCase() === 'PUBLISHED';

const useJobPostings = ({ formOpen = false } = {}) => {
  const [jobs,    setJobs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  // Guard against setState after unmount (prevents React warnings on fast nav).
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await jobPost.getJobPostings();
      const payload = res?.data ?? res;
      const list = payload?.Jobs ?? payload?.jobs ?? (Array.isArray(payload) ? payload : []);
      const safeList = Array.isArray(list) ? list : [];
      if (mountedRef.current) setJobs(safeList);
      return safeList;
    } catch (err) {
      const msg = getBackendError(err, 'Failed to load job postings.');
      console.error('Failed to load jobs:', err);
      if (mountedRef.current) {
        setError(msg);
        setJobs([]);
      }
      throw err;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs().catch(() => { /* error already captured in state */ });
  }, [fetchJobs]);

 
  useRefetchOnFocus(fetchJobs, { enabled: !formOpen });

  // ── Internal helper: upsert a single job in the local list ──
  const upsertJob = useCallback((job) => {
    if (!job?.job_id && !job?.id) return;
    const key = job.job_id ?? job.id;
    setJobs((prev) => {
      const idx = prev.findIndex((j) => (j.job_id ?? j.id) === key);
      if (idx === -1) return [job, ...prev];
      const next = [...prev];
      next[idx] = { ...next[idx], ...job };
      return next;
    });
  }, []);

  // ── Create ───────────────────────────────────────────────────────────────
  const createJob = useCallback(async (payload) => {
    try {
      const res = await jobPost.createJobPosting({ ...payload, status: 'active' });
      const newJob = res?.data?.data || res?.data?.job || res?.data || null;
      // Refetch to make sure we have the formatted row (with applicants, daysLeft, etc.)
      // that the backend's format_job_row() produces — safer than trusting the create response.
      await fetchJobs();
      return newJob;
    } catch (err) {
      err.friendlyMessage = getBackendError(err, 'Failed to post job.');
      console.error('Failed to post job:', err);
      throw err;
    }
  }, [fetchJobs]);

  // ── Save draft ───────────────────────────────────────────────────────────
  const saveDraft = useCallback(async (payload) => {
    try {
      const res = await jobPost.saveJobDraft(payload);
      const newJob = res?.data?.data || res?.data?.job || res?.data || null;
      await fetchJobs();
      return newJob;
    } catch (err) {
      err.friendlyMessage = getBackendError(err, 'Failed to save draft.');
      console.error('Failed to save draft:', err);
      throw err;
    }
  }, [fetchJobs]);
// ── Get single (for edit prefill — list endpoint omits benefits) ─────────
  const getJob = useCallback(async (id) => {
    try {
      const res = await jobPost.getJobPosting(id);
      return res?.data ?? null;
    } catch (err) {
      err.friendlyMessage = getBackendError(err, 'Failed to load job.');
      throw err;
    }
  }, []);
  // ── Update ───────────────────────────────────────────────────────────────
  const updateJob = useCallback(async (id, patch) => {
    try {
      const res = await jobPost.updateJobPosting(id, patch);
      const key = res?.data?.Job_Id ?? id;
      const list = await fetchJobs();
      return list.find((j) => (j.job_id ?? j.id) === key) || null;
    } catch (err) {
      err.friendlyMessage = getBackendError(err, 'Failed to update job.');
      throw err;
    }
  }, [fetchJobs]);

  // ── Delete ───────────────────────────────────────────────────────────────
  const deleteJob = useCallback(async (id) => {
    try {
      await jobPost.deleteJobPosting(id);
      if (mountedRef.current) {
        setJobs((prev) => prev.filter((j) => (j.job_id ?? j.id) !== id));
      }
    } catch (err) {
      err.friendlyMessage = getBackendError(err, 'Failed to delete job.');
      throw err;
    }
  }, []);
  const bulkDelete = useCallback(async (ids) => {
  try {
    await Promise.all(ids.map((id) => jobPost.deleteJobPosting(id)));
    if (mountedRef.current) {
      setJobs((prev) => prev.filter((j) => !ids.includes(j.job_id ?? j.id)));
    }
  } catch (err) {
    err.friendlyMessage = getBackendError(err, 'Failed to delete selected jobs.');
    throw err;
  }
}, []);

  // ── Workflow actions (publish / unpublish / close) ───────────────────────
  const runStatusAction = useCallback(async (id, apiFn, newStatusHint, failMsg) => {
    try {
      const res = await apiFn(id);
      const hint = res?.data?.data
        || { job_id: id, status: res?.data?.Status || res?.data?.status || newStatusHint };
      if (mountedRef.current) upsertJob(hint);
  
      const list = await fetchJobs();
      return list.find((j) => (j.job_id ?? j.id) === id) || hint;
    } catch (err) {
      err.friendlyMessage = getBackendError(err, failMsg);
      throw err;
    }
  }, [upsertJob, fetchJobs]);

  const publishJob   = useCallback((id) => runStatusAction(id, jobPost.publishJob,   'PUBLISHED',   'Failed to publish job.'),   [runStatusAction]);
  const unpublishJob = useCallback((id) => runStatusAction(id, jobPost.unpublishJob, 'UNPUBLISHED', 'Failed to unpublish job.'), [runStatusAction]);
  const closeJob     = useCallback((id) => runStatusAction(id, jobPost.closeJob,     'CLOSED',      'Failed to close job.'),     [runStatusAction]);

  // ── Derived stats ────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const active = jobs.filter((j) => isPublished(j.status)).length;
    const applicants = jobs.reduce((sum, j) => sum + (j.applicants || 0), 0);
    const avg = active > 0 ? Math.round(applicants / active) : 0;
    return { active, total: jobs.length, applicants, avg };
  }, [jobs]);

  return {
    jobs,
    loading,
    error,
    stats,
    refetch: fetchJobs,
    getJob,
    createJob,
    saveDraft,
    updateJob,
    deleteJob,
    publishJob,
    unpublishJob,
    closeJob,
  };
};

export { useJobPostings };
export default useJobPostings;