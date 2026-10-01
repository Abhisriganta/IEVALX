// ============================================================================
// useEmployerAnnouncementFeed.js  (v1)
//
// Lightweight Topbar badge hook for EMPLOYERS — mirrors
// useAnnouncementFeed.js (jobseeker) but hits the employer feed endpoint.
// Fetches the 5 newest published company posts, computes unread against a
// per-employer localStorage last-seen-id, provides mark-all-read.
//
// The full-page feed uses useEmployerFeed instead (pagination, filters).
// Location: src/hooks/employer/useEmployerAnnouncementFeed.js
// ============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import employerFeedService from '@/services/api/employer/employerFeedService';

const TOPBAR_LIMIT     = 5;
const POLL_INTERVAL_MS = 90_000;

/* Per-employer last-seen persistence (mirrors jobseeker pattern) */
const lsKey = (employerId) =>
  `ievalx_emp_ann_last_seen_id_${employerId || 'anon'}`;

const getUser = () => {
  try { return JSON.parse(localStorage.getItem('ievalx_user') || '{}'); }
  catch { return {}; }
};

const currentEmployerId = () => {
  const u = getUser();
  return u?.employer_id ?? u?.employerId ?? u?.id ?? null;
};

const readLastSeen = () => {
  try {
    const v = localStorage.getItem(lsKey(currentEmployerId()));
    return v ? Number(v) : 0;
  } catch { return 0; }
};

const writeLastSeen = (id) => {
  try { localStorage.setItem(lsKey(currentEmployerId()), String(id)); }
  catch { /* noop */ }
};

export const useEmployerAnnouncementFeed = (enabled = true) => {
  const [posts,      setPosts]      = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);
  const [lastSeenId, setLastSeenId] = useState(() => readLastSeen());
  const pollRef = useRef(null);

  const refresh = useCallback(async ({ silent = false } = {}) => {
    if (!enabled) return;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const { posts: fresh } = await employerFeedService.getFeed({ limit: TOPBAR_LIMIT });
      setPosts(fresh);
    } catch (err) {
      setError(err?.response?.data?.Error || err?.message || 'Failed to load feed.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    refresh();
    pollRef.current = setInterval(() => refresh({ silent: true }), POLL_INTERVAL_MS);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [enabled, refresh]);

  useEffect(() => {
    if (!enabled) return;
    const onFocus = () => refresh({ silent: true });
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [enabled, refresh]);

  const decoratedPosts = posts.map((p) => ({ ...p, unread: p.id > lastSeenId }));
  const unreadCount    = decoratedPosts.filter((p) => p.unread).length;

  const markAllRead = useCallback(() => {
    if (!posts.length) return;
    const newest = Math.max(...posts.map((p) => p.id));
    writeLastSeen(newest);
    setLastSeenId(newest);
  }, [posts]);

  return { posts: decoratedPosts, loading, error, unreadCount, markAllRead, refresh };
};

export default useEmployerAnnouncementFeed;