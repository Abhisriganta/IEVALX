import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import candidateService from '../../services/api/employer/candidateService';
export const useCandidates = () => {
  const [candidates, setCandidates] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; }; 
  }, []);

  const refresh = useCallback(async () => {
    if (isMountedRef.current) { setLoading(true); setError(''); }
    try {
      const data = await candidateService.list();
      if (!isMountedRef.current) return;
      // Handle all response shapes: { Candidates: [] }, { candidates: [] }, { results: [] }, or plain []
const raw = data?.Candidates ?? data?.candidates ?? data?.results ?? data;
setCandidates(Array.isArray(raw) ? raw : []);
    } catch (err) {
      if (!isMountedRef.current) return;
      setError(err?.message || 'Failed to load candidates');
      setCandidates([]);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const updateStatus = useCallback(async (applicationId, status) => {
    await candidateService.updateStatus(applicationId, status);
    await refresh();
  }, [refresh]);


  const membershipOf = useCallback((candidate) => {
    if (!candidate) return null;
    const m = candidate.pipeline_membership
           || candidate.membership
           || null;
    if (!m) return null;
    return {
      processId:   m.process_id ?? m.processId ?? null,
      processName: m.process_name || m.processName
                   || (m.sequence_no ? `Pipeline #${m.sequence_no}` : 'a pipeline'),
    };
  }, []);

  /** True when this candidate is already locked inside an active pipeline. */
  const isLocked = useCallback(
    (candidate) => membershipOf(candidate) !== null,
    [membershipOf],
  );

  /** Candidates free to enter a NEW pipeline (selectable on the page). */
  const availableCandidates = useMemo(
    () => candidates.filter((c) => !isLocked(c)),
    [candidates, isLocked],
  );

  /** Candidates already inside a pipeline (rendered read-only). */
  const lockedCandidates = useMemo(
    () => candidates.filter((c) => isLocked(c)),
    [candidates, isLocked],
  );

  return {
    candidates, loading, error, refresh, updateStatus,
    // membership (R2)
    membershipOf, isLocked, availableCandidates, lockedCandidates,
  };
};

export default useCandidates;