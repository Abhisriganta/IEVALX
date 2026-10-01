
import { useState, useEffect, useCallback } from 'react';
import campusDriveService from '@/services/api/jobseeker/campusDriveService';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';

const useCampusDrive = () => {
  const [sessions,  setSessions]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [starting,  setStarting]  = useState(null);   

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await campusDriveService.getCampusDriveSessions();
      setSessions(Array.isArray(resp.results) ? resp.results : []);
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
        err?.response?.data?.error  ||
        err?.message                 ||
        'Could not load your campus drive interviews.'
      );
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await fetchSessions();
      if (cancelled) return;
    })();
    return () => { cancelled = true; };
  }, [fetchSessions]);

  useRefetchOnFocus(fetchSessions);

  const startDrive = useCallback(async (configId) => {
    setStarting(configId);
    try {
      return await campusDriveService.startCampusDrive(configId);
    } finally {
      setStarting(null);
    }
  }, []);

const deleteSession = useCallback(async (siId) => {
    await campusDriveService.deleteSession(siId);
    setSessions(prev => prev.filter(s => s.id !== siId));
  }, []);

  const deleteSessions = useCallback(async (siIds) => {
    await campusDriveService.deleteSessions(siIds);
    setSessions(prev => prev.filter(s => !siIds.includes(s.id)));
  }, []);

 return {
    sessions,
    loading,
    error,
    starting,
    startDrive,
    deleteSession,
    deleteSessions,
    refetch: fetchSessions,
  };


};

export default useCampusDrive;