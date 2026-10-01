import { useState, useEffect, useCallback, useMemo } from 'react';
import { aiAssessmentService } from '@/services/api/jobseeker/aiAssessmentService';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';

export const useAIAssessments = () => {
  const [assessments, setAssessments] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [startingId,  setStartingId]  = useState(null);

  const fetchAssessments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await aiAssessmentService.getAssessments();
      setAssessments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[useAIAssessments] failed to fetch assessments:', err);
      setError(
        err?.response?.data?.Error   ||
        err?.response?.data?.error   ||
        err?.response?.data?.detail  ||
        err?.message                 ||
        'Unable to load assessments. Please try again.'
      );
      setAssessments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteAssessment = useCallback(async (assignmentIds) => {
    const ids = Array.isArray(assignmentIds) ? assignmentIds : [assignmentIds];
    try {
      const result = await aiAssessmentService.deleteMyAssignments(ids);
      await fetchAssessments();
      return result;
    } catch (err) {
      console.error('[useAIAssessments] failed to delete assessments:', err);
      const msg =
        err?.response?.data?.Error  ||
        err?.response?.data?.error  ||
        err?.response?.data?.detail ||
        err?.message                ||
        'Failed to delete assessment. Please try again.';
      throw new Error(msg);
    }
  }, [fetchAssessments]);

  const startAssessment = useCallback(async (assignmentId) => {
    setStartingId(assignmentId);
    try {
      await aiAssessmentService.startAssessment(assignmentId);
      await aiAssessmentService.generateTestPaper(assignmentId);
      return { success: true, assignmentId };
    } catch (err) {
      console.error('[useAIAssessments] failed to start assessment:', err);
      const msg =
        err?.response?.data?.Error  ||
        err?.response?.data?.error  ||
        err?.response?.data?.detail ||
        err?.message                ||
        'Failed to start assessment. Please try again.';
      throw new Error(msg);
    } finally {
      setStartingId(null);
    }
  }, []);

  useEffect(() => { fetchAssessments(); }, [fetchAssessments]);
  useRefetchOnFocus(fetchAssessments);

  const stats = useMemo(() => {
    const now        = new Date();
    const total      = assessments.length;
    const inProgress = assessments.filter((a) => a.status === 'in_progress').length;
    const expired    = assessments.filter((a) => a.status === 'expired').length;
    // Upcoming = not_started AND scheduledAt is in the future
    const scheduled  = assessments.filter(
      (a) => a.status === 'not_started' && a.scheduledAt && new Date(a.scheduledAt) > now
    ).length;
    const available  = assessments.filter((a) => {
      if (a.status !== 'not_started') return false;
      if (a.scheduledAt && new Date(a.scheduledAt) > now) return false;
      if (a.expiresAt   && new Date(a.expiresAt)   < now) return false;
      return true;
    }).length;
    const avgDuration = total
      ? Math.round(assessments.reduce((s, a) => s + (a.durationMinutes || 0), 0) / total)
      : 0;
    return { total, available, inProgress, expired, scheduled, avgDuration };
  }, [assessments]);

  return {
    assessments,
    loading,
    error,
    stats,
    startingId,
    startAssessment,
    deleteAssessment,
    refetch: fetchAssessments,
  };
};

export default useAIAssessments;