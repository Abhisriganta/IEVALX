// ============================================================================
// useAnnouncementFeed.js
// Lightweight hook JUST for the Topbar announcement popover.
// Fetches the 5 newest published company posts, computes unread against a
// per-candidate localStorage last-seen-id, and provides mark-all-read.
//
// The full-page feed uses useJobseekerFeed instead (pagination, filters).
// Location: src/hooks/jobseeker/useAnnouncementFeed.js
// ============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import feedService from '@/services/api/jobseeker/feedService';

const TOPBAR_LIMIT      = 5;      // items shown in the popover
const POLL_INTERVAL_MS  = 90_000; // refresh badge every 90 s while page is open

export const useAnnouncementFeed = (enabled = true) => {
  const [posts,       setPosts]       = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const [lastSeenId,  setLastSeenId]  = useState(() => feedService.getLastSeenId());
  const pollRef = useRef(null);

  /* ── Fetch (also used by polling) ────────────────────────────────────── */
  const refresh = useCallback(async ({ silent = false } = {}) => {
    if (!enabled) return;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const { posts: fresh } = await feedService.getFeed({ limit: TOPBAR_LIMIT });
      setPosts(fresh);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Failed to load feed.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [enabled]);

  /* ── Initial load + polling (only when enabled — i.e. jobseeker role) ── */
  useEffect(() => {
    if (!enabled) return;
    refresh();
    pollRef.current = setInterval(() => refresh({ silent: true }), POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [enabled, refresh]);

  /* ── Refresh when the tab regains focus (cheap, improves UX) ────────── */
  useEffect(() => {
    if (!enabled) return;
    const onFocus = () => refresh({ silent: true });
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [enabled, refresh]);

  /* ── Derived: which items are still unread on this device ───────────── */
  const decoratedPosts = posts.map((p) => ({ ...p, unread: p.id > lastSeenId }));
  const unreadCount    = decoratedPosts.filter((p) => p.unread).length;

  /* ── Mark all seen: bump last-seen to the newest id we have ─────────── */
  const markAllRead = useCallback(() => {
    if (!posts.length) return;
    const newest = Math.max(...posts.map((p) => p.id));
    feedService.setLastSeenId(newest);
    setLastSeenId(newest);
  }, [posts]);

  /* ── Optimistic like toggle (also used from the popover) ───────────── */
  const toggleLike = useCallback(async (postId) => {
    const current = posts.find((p) => p.id === postId);
    if (!current) return;
    const wasLiked = current.is_liked;

    // Optimistic
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, is_liked: !wasLiked, like_count: p.like_count + (wasLiked ? -1 : 1) }
          : p,
      ),
    );

    try {
      const res = wasLiked
        ? await feedService.unlikePost(postId)
        : await feedService.likePost(postId);
      // Reconcile with the server's authoritative count.
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, like_count: res?.like_count ?? p.like_count } : p,
        ),
      );
    } catch {
      // Roll back on failure
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, is_liked: wasLiked, like_count: p.like_count + (wasLiked ? 1 : -1) }
            : p,
        ),
      );
    }
  }, [posts]);

  return {
    posts:       decoratedPosts,
    loading,
    error,
    unreadCount,
    markAllRead,
    toggleLike,
    refresh,
  };
};

export default useAnnouncementFeed;