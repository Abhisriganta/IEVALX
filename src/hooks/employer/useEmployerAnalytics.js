import { useState, useEffect, useCallback } from 'react';
import employerAnalyticsService from '@/services/api/employer/employerAnalyticsService';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';


export const useEmployerAnalytics = (period = '6m') => {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await employerAnalyticsService.getOverview(period);
      setData(res.data);
    } catch (err) {
      setError(
        err?.response?.data?.error ||
        err?.response?.data?.Error ||
        err?.message ||
        'Failed to load analytics.'
      );
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { refresh(); }, [refresh]);
  useRefetchOnFocus(refresh);

  return { data, loading, error, refresh };
};