// ============================================================================
// useCareerCoach.js
// Hook for the Career Coach screen
// Location: src/hooks/jobseeker/useCareerCoach.js
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import careerService from '@/services/api/jobseeker/careerService';

export const useCareerCoach = () => {
  const [coaches, setCoaches] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState(false);
  const [error,   setError]   = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [c, h] = await Promise.all([
        careerService.getCareerCoaches(),
        careerService.getCareerCoachHistory(),
      ]);
      setCoaches(c);
      setHistory(h);
    } catch (err) {
      setError(err.message || 'Failed to load career coaches');
    } finally {
      setLoading(false);
    }
  }, []);

  const bookSession = useCallback(async (coachId) => {
    setBooking(true);
    try {
      return await careerService.bookCoachingSession(coachId);
    } catch (err) {
      setError(err.message || 'Booking failed');
      throw err;
    } finally {
      setBooking(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { coaches, history, loading, booking, error, refetch: fetchAll, bookSession };
};

export default useCareerCoach;