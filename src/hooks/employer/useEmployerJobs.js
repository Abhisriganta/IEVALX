import { useState, useEffect, useCallback, useRef } from 'react';
import jobService from '../../services/api/employer/jobService';
import { useRefetchOnFocus } from '../useRefetchOnFocus';

/**
 * @param {string} statusFilter — one of the display labels accepted by the
 *   backend's DISPLAY_STATUS_FILTER_MAP: 'all' | 'Active' | 'Offline' |
 *   'Draft' | 'Pending Approval' | 'Closed' | 'Rejected' | 'Removed'.
 */
export const useEmployerJobs = (statusFilter = 'all', { formOpen = false } = {}) => {
  const [jobs, setJobs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  /* ── Fetch ──────────────────────────────────────────────────────── */
  const refresh = useCallback(async () => {
    if (isMountedRef.current) {
      setLoading(true);
      setError('');
    }
    try {
      const data = await jobService.listMyJobs(statusFilter);
      if (!isMountedRef.current) return;
      setJobs(Array.isArray(data.jobs) ? data.jobs : []);
    } catch (err) {
      if (!isMountedRef.current) return;
      setError(err?.message || 'Failed to load jobs');
      setJobs([]);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useRefetchOnFocus(refresh, { enabled: !formOpen });

  const createJob = useCallback(async (payload) => {
    const res = await jobService.createJob(payload);
    await refresh();
    return res;
  }, [refresh]);

  const updateJob = useCallback(async (id, payload) => {
    const res = await jobService.updateJob(id, payload);
    await refresh();
    return res;
  }, [refresh]);

  const deleteJob = useCallback(async (id) => {
    const res = await jobService.deleteJob(id);
    await refresh();
    return res;
  }, [refresh]);

  const submitForApproval = useCallback(async (id) => {
    const res = await jobService.submitForApproval(id);
    await refresh();
    return res;
  }, [refresh]);

  const publishJob = useCallback(async (id) => {
    const res = await jobService.publishJob(id);
    await refresh();
    return res;
  }, [refresh]);

  const unpublishJob = useCallback(async (id) => {
    const res = await jobService.unpublishJob(id);
    await refresh();
    return res;
  }, [refresh]);

  /* ── Edit-access flow ──────────────────────────────────────────── */
  const requestEditAccess = useCallback(async (id, reason) => {
    const res = await jobService.requestEditAccess(id, reason);
    await refresh();
    return res;
  }, [refresh]);

  const getEditRequestStatus = useCallback(
    (id) => jobService.getEditRequestStatus(id),
    []
  );

  /* ── Republish-request flow ────────────────────────────────────── */
  const requestRepublish = useCallback(async (id, reason) => {
    const res = await jobService.requestRepublish(id, reason);
    await refresh();
    return res;
  }, [refresh]);

  const getRepublishRequestStatus = useCallback(
    (id) => jobService.getRepublishRequestStatus(id),
    []
  );

  // Read-only — no list refresh needed.
  const getJobDetail = useCallback((id) => jobService.getJobDetail(id), []);

  return {
    jobs,
    loading,
    error,
    refresh,
    createJob,
    updateJob,
    deleteJob,
    submitForApproval,
    publishJob,
    unpublishJob,
    requestEditAccess,
    getEditRequestStatus,
    requestRepublish,
    getRepublishRequestStatus,
    getJobDetail,
  };
};

export default useEmployerJobs;