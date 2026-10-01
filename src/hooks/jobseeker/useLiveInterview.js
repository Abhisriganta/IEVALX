import { useState, useEffect, useCallback } from 'react';
import smartInterviewService, {
  invalidateSmartInterviewsCache,
} from '@/services/api/jobseeker/smartInterviewService';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';

const useLiveInterview = () => {
  const [slots,   setSlots]   = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  // pendingInvites removed — old SlotBookingInvite system replaced by IAEM

  const fetchInterviews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [upcomingData, historyData] = await Promise.all([
        smartInterviewService.getLiveInterviewSlots(),
        smartInterviewService.getLiveInterviewHistory(),
      ]);
      setSlots(Array.isArray(upcomingData)  ? upcomingData  : []);
      setHistory(Array.isArray(historyData) ? historyData   : []);
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
        err?.response?.data?.error  ||
        err?.message                 ||
        'Could not load your interviews.'
      );
      setSlots([]);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInterviews();
  }, [fetchInterviews]);

  const focusRefetch = useCallback(async () => {
    invalidateSmartInterviewsCache();
    await fetchInterviews();
  }, [fetchInterviews]);
  useRefetchOnFocus(focusRefetch);

  return {
    slots,
    history,
    loading,
    error,
    refetch: fetchInterviews,
  };
};

export default useLiveInterview;
