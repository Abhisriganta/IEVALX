import { useState, useEffect, useCallback } from 'react';
import overviewService from '@/services/api/jobseeker/overviewService';
import useAuth from '@/hooks/useAuth';
import { ROLES } from '@/constants/roles';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';


export const useCandidatePerformance = () => {
  const { isAuthenticated, role, loading: authLoading } = useAuth();
  const canFetch = isAuthenticated && role === ROLES.JOBSEEKER && !authLoading;

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

 
  const fetchPerformance = useCallback(async () => {
    if (!canFetch) {
   
      return null;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await overviewService.getCandidatePerformance();
      setData(result);
      return result;
    } catch (err) {
      setError(err?.message || 'Failed to load performance data');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [canFetch]);

  useEffect(() => {
    if (!canFetch) return;
    fetchPerformance().catch(() => {
    });
  }, [canFetch, fetchPerformance]);

  // Also refresh on tab focus / interval — but only when eligible.
  useRefetchOnFocus(fetchPerformance, { enabled: canFetch });

  return { data, loading, error, refetch: fetchPerformance };
};

export default useCandidatePerformance;