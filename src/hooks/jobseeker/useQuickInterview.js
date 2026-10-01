import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import quickInterviewService from '@/services/api/jobseeker/quickInterviewService';

const ACTIVE_STATUSES = ['started', 'in_progress'];
const POLL_INTERVAL_MS = 5000;
const POLL_MAX_ATTEMPTS = 60;   // ~5 minutes — covers full evaluation + PDF

const useQuickInterview = (candidateId) => {
  const navigate = useNavigate();
  const pollRef = useRef(null);
  const pollCountRef = useRef(0);

  const [latest, setLatest] = useState(null);   // most recent attempt row, or null
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Fetch latest attempt ────────────────────────────────────────────────
  const fetchLatest = useCallback(async () => {
    if (!candidateId) {
      setLoading(false);
      return;
    }
    try {
      const history = await quickInterviewService.getHistory(candidateId);
      setLatest(history?.[0] || null);
    } catch (err) {
      // Non-fatal — card just falls back to the CTA state.
      console.error('[useQuickInterview] history fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [candidateId]);

  useEffect(() => {
    fetchLatest();
  }, [fetchLatest]);
  useEffect(() => {
    if (candidateId) {
      quickInterviewService.prewarm();
    }
  }, [candidateId]);

  // ── Auto-poll while latest attempt is still scoring ─────────────────────
  useEffect(() => {
    clearInterval(pollRef.current);
    pollCountRef.current = 0;

    if (latest && ACTIVE_STATUSES.includes(latest.status)) {
      pollRef.current = setInterval(() => {
        pollCountRef.current += 1;
        if (pollCountRef.current > POLL_MAX_ATTEMPTS) {
          clearInterval(pollRef.current);
          return;
        }
        fetchLatest();
      }, POLL_INTERVAL_MS);
    }

    return () => clearInterval(pollRef.current);
  }, [latest, fetchLatest]);

  // ── Navigate to AIRealtimeSession with ?quick=1 ─────────────────────────
  const startInterview = useCallback(() => {
    setError(null);
    navigate('/jobseeker/quick-interview/session?quick=1');
  }, [navigate]);

  return { latest, loading, error, startInterview, refresh: fetchLatest };
};

export default useQuickInterview;