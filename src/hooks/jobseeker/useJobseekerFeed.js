// ============================================================================
// useJobseekerFeed.js  (v4 — visible comments + replies)
// Feed page hook with:
//   • 25 posts per page
//   • Post-type filter (NEWS/UPDATE/EVENT/GREETING)
//   • Company filter
//   • Page navigation via number pagination at the top
//   • Infinite-scroll append below
//   • Optimistic like + comment
//   • NEW: fetchComments per post (lazy — triggered when user expands)
//   • NEW: replyToComment (jobseeker can reply to any comment)
//   • NEW: commentsMap keyed by postId → array of normalised comments
//
// CHANGELOG v4:
//   + commentsMap state — { [postId]: Comment[] }
//   + fetchComments(postId) — loads comments for a single post, caches
//   + submitComment now auto-refreshes the post's comment list
//   + replyToComment(postId, parentId, text) — alias for comment with parent
// Location: src/hooks/jobseeker/useJobseekerFeed.js
// ============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSnackbar } from 'notistack';
import feedService from '@/services/api/jobseeker/feedService';

export const PAGE_SIZE = 25;

export const useJobseekerFeed = () => {
  const { enqueueSnackbar } = useSnackbar();

  const [posts,       setPosts]       = useState([]);
  const [total,       setTotal]       = useState(0);
  const [loading,     setLoading]     = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error,       setError]       = useState(null);

  // Filters
  const [postType,  setPostType]  = useState(null);
  const [companyId, setCompanyId] = useState(null);

  // Pagination — currentPage is the "starting" page loaded via jump; when
  // user scrolls, we append subsequent pages but keep currentPage anchored
  // so the top-pagination highlight tells the user where they jumped from.
  const [currentPage,     setCurrentPage]     = useState(1);
  const [lastLoadedPage,  setLastLoadedPage]  = useState(1);

  // ── Comments map: { [postId]: Comment[] } ──────────────────────────
  const [commentsMap, setCommentsMap] = useState({});
  // Track which posts are currently loading comments
  const [commentsLoading, setCommentsLoading] = useState({});

  // Race-guard for filter changes / page jumps
  const requestSeq = useRef(0);

  /* ── Derived ─────────────────────────────────────────────────────── */
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((total || 0) / PAGE_SIZE)),
    [total],
  );
  const hasMore = lastLoadedPage < totalPages;

  /* ── Core fetch — replace or append ──────────────────────────────── */
  const fetchPage = useCallback(async (page, { append = false } = {}) => {
    const seq = ++requestSeq.current;
    if (!append) setLoading(true);
    else         setLoadingMore(true);
    setError(null);
    try {
      const res = await feedService.getFeed({
        limit:     PAGE_SIZE,
        offset:    (page - 1) * PAGE_SIZE,
        postType:  postType  || null,
        companyId: companyId || null,
      });
      if (seq !== requestSeq.current) return;   // superseded
      if (append) {
        setPosts((prev) => [...prev, ...res.posts]);
      } else {
        setPosts(res.posts);
        setCurrentPage(page);
        // Clear comments cache on full reload
        setCommentsMap({});
      }
      setTotal(res.total);
      setLastLoadedPage(page);
    } catch (err) {
      if (seq !== requestSeq.current) return;
      const msg = err?.response?.data?.error || err?.message || 'Failed to load feed.';
      setError(msg);
      if (!append) enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      if (seq === requestSeq.current) {
        if (!append) setLoading(false);
        else         setLoadingMore(false);
      }
    }
  }, [postType, companyId, enqueueSnackbar]);

  /* ── Initial + filter-change reset ───────────────────────────────── */
  useEffect(() => {
    setLastLoadedPage(1);
    setCurrentPage(1);
    fetchPage(1, { append: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postType, companyId]);

  /* ── Public actions ──────────────────────────────────────────────── */
  const goToPage = useCallback((page) => {
    const clamped = Math.max(1, Math.min(page, totalPages));
    setLastLoadedPage(clamped);
    fetchPage(clamped, { append: false });
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [fetchPage, totalPages]);

  const loadMore = useCallback(() => {
    if (loadingMore || loading || !hasMore) return;
    fetchPage(lastLoadedPage + 1, { append: true });
  }, [loadingMore, loading, hasMore, lastLoadedPage, fetchPage]);

  const setFilterType = useCallback((type) => {
    setPostType(type || null);
  }, []);

  const setFilterCompany = useCallback((cid) => {
    setCompanyId(cid || null);
  }, []);

  /* ── Optimistic like ─────────────────────────────────────────────── */
  const toggleLike = useCallback(async (postId) => {
    const current = posts.find((p) => p.id === postId);
    if (!current) return;
    const wasLiked = current.is_liked;

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
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, like_count: res?.like_count ?? p.like_count } : p,
        ),
      );
    } catch (err) {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, is_liked: wasLiked, like_count: p.like_count + (wasLiked ? 1 : -1) }
            : p,
        ),
      );
      enqueueSnackbar(err?.response?.data?.error || 'Could not update like.', { variant: 'error' });
    }
  }, [posts, enqueueSnackbar]);

  /* ── Fetch comments for a single post (lazy load) ───────────────── */
  const fetchComments = useCallback(async (postId) => {
    if (!postId) return;
    setCommentsLoading((prev) => ({ ...prev, [postId]: true }));
    try {
      const list = await feedService.getComments(postId);
      setCommentsMap((prev) => ({ ...prev, [postId]: list }));
    } catch (err) {
      // Silently fail — the UI will just show "no comments"
      console.warn('Failed to load comments for post', postId, err);
      setCommentsMap((prev) => ({ ...prev, [postId]: [] }));
    } finally {
      setCommentsLoading((prev) => ({ ...prev, [postId]: false }));
    }
  }, []);

  /* ── Submit comment (top-level) ──────────────────────────────────── */
  const submitComment = useCallback(async (postId, text) => {
    const clean = (text || '').trim();
    if (!clean) return null;
    try {
      const res = await feedService.commentOnPost(postId, clean);
      // Increment comment count on the post card
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, comment_count: (p.comment_count || 0) + 1 } : p,
        ),
      );
      // Refresh the comments list for this post so the new comment shows
      await fetchComments(postId);
      enqueueSnackbar('Comment posted.', { variant: 'success' });
      return res;
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.error || 'Could not post comment.', { variant: 'error' });
      return null;
    }
  }, [enqueueSnackbar, fetchComments]);

  /* ── Reply to a comment ──────────────────────────────────────────── */
  const replyToComment = useCallback(async (postId, parentCommentId, text) => {
    const clean = (text || '').trim();
    if (!clean) return null;
    try {
      const res = await feedService.commentOnPost(postId, clean, parentCommentId);
      // Increment comment count
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, comment_count: (p.comment_count || 0) + 1 } : p,
        ),
      );
      // Refresh comments to show the new reply
      await fetchComments(postId);
      enqueueSnackbar('Reply posted.', { variant: 'success' });
      return res;
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.error || 'Could not post reply.', { variant: 'error' });
      return null;
    }
  }, [enqueueSnackbar, fetchComments]);

  /* ── Derived: upcoming events for right rail ─────────────────────── */
  const upcomingEvents = useMemo(() => {
    const now = Date.now();
    return posts
      .filter((p) => p.post_type === 'EVENT' && p.event_date)
      .filter((p) => new Date(p.event_date).getTime() >= now)
      .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
      .slice(0, 5);
  }, [posts]);

  return {
    // Data
    posts, total, totalPages, currentPage, lastLoadedPage, hasMore,
    loading, loadingMore, error,
    // Filters
    postType, companyId,
    setFilterType, setFilterCompany,
    // Pagination
    goToPage, loadMore, pageSize: PAGE_SIZE,
    // Interactions
    toggleLike, submitComment,
    // NEW: Comments
    commentsMap,        // { [postId]: Comment[] }
    commentsLoading,    // { [postId]: boolean }
    fetchComments,      // (postId) => void
    replyToComment,     // (postId, parentCommentId, text) => Promise
    // Derived
    upcomingEvents,
    // Refresh
    refresh: () => fetchPage(currentPage, { append: false }),
  };
};

export default useJobseekerFeed;