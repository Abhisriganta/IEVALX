// ============================================================================
// useEmployerFeed.js  (v1)
//
// Employer-facing mirror of useJobseekerFeed — identical return contract so
// the feed page markup can be shared 1:1 with JobseekerFeed:
//   posts / total / totalPages / currentPage / hasMore
//   loading / loadingMore / error
//   postType, setFilterType
//   goToPage / loadMore / pageSize
//   toggleLike / submitComment
//   commentsMap / commentsLoading / fetchComments / replyToComment
//   upcomingEvents / refresh
//
// Location: src/hooks/employer/useEmployerFeed.js
// ============================================================================

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSnackbar } from 'notistack';
import employerFeedService from '@/services/api/employer/employerFeedService';

const PAGE_SIZE = 20;

export const useEmployerFeed = () => {
  const { enqueueSnackbar } = useSnackbar();

  const [posts,       setPosts]       = useState([]);
  const [total,       setTotal]       = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error,       setError]       = useState(null);

  const [postType, setPostType] = useState(null);

  const [currentPage,    setCurrentPage]    = useState(1);
  const [lastLoadedPage, setLastLoadedPage] = useState(1);

  const [commentsMap,     setCommentsMap]     = useState({});
  const [commentsLoading, setCommentsLoading] = useState({});

  const requestSeq = useRef(0);

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
      const res = await employerFeedService.getFeed({
        limit:    PAGE_SIZE,
        offset:   (page - 1) * PAGE_SIZE,
        postType: postType || null,
      });
      if (seq !== requestSeq.current) return;   // superseded
      if (append) {
        setPosts((prev) => [...prev, ...res.posts]);
      } else {
        setPosts(res.posts);
        setCurrentPage(page);
        setCommentsMap({});
      }
      setTotal(res.total);
      setLastLoadedPage(page);
    } catch (err) {
      if (seq !== requestSeq.current) return;
      const msg = err?.response?.data?.Error
               || err?.response?.data?.error
               || err?.message
               || 'Failed to load feed.';
      setError(msg);
      if (!append) enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      if (seq === requestSeq.current) {
        if (!append) setLoading(false);
        else         setLoadingMore(false);
      }
    }
  }, [postType, enqueueSnackbar]);

  /* ── Initial + filter-change reset ───────────────────────────────── */
  useEffect(() => {
    setLastLoadedPage(1);
    setCurrentPage(1);
    fetchPage(1, { append: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postType]);

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
        ? await employerFeedService.unlikePost(postId)
        : await employerFeedService.likePost(postId);
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
      enqueueSnackbar(
        err?.response?.data?.Error || err?.response?.data?.error || 'Could not update like.',
        { variant: 'error' },
      );
    }
  }, [posts, enqueueSnackbar]);

  /* ── Fetch comments for a single post (lazy load) ───────────────── */
  const fetchComments = useCallback(async (postId) => {
    if (!postId) return;
    setCommentsLoading((prev) => ({ ...prev, [postId]: true }));
    try {
      const list = await employerFeedService.getComments(postId);
      setCommentsMap((prev) => ({ ...prev, [postId]: list }));
    } catch (err) {
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
      const res = await employerFeedService.commentOnPost(postId, clean);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, comment_count: (p.comment_count || 0) + 1 } : p,
        ),
      );
      await fetchComments(postId);
      enqueueSnackbar('Comment posted.', { variant: 'success' });
      return res;
    } catch (err) {
      enqueueSnackbar(
        err?.response?.data?.Error || err?.response?.data?.error || 'Could not post comment.',
        { variant: 'error' },
      );
      return null;
    }
  }, [enqueueSnackbar, fetchComments]);

  /* ── Reply to a comment ──────────────────────────────────────────── */
  const replyToComment = useCallback(async (postId, parentCommentId, text) => {
    const clean = (text || '').trim();
    if (!clean) return null;
    try {
      const res = await employerFeedService.commentOnPost(postId, clean, parentCommentId);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, comment_count: (p.comment_count || 0) + 1 } : p,
        ),
      );
      await fetchComments(postId);
      enqueueSnackbar('Reply posted.', { variant: 'success' });
      return res;
    } catch (err) {
      enqueueSnackbar(
        err?.response?.data?.Error || err?.response?.data?.error || 'Could not post reply.',
        { variant: 'error' },
      );
      return null;
    }
  }, [enqueueSnackbar, fetchComments]);

  /* ── Derived: upcoming events for the right rail ─────────────────── */
  const upcomingEvents = useMemo(() => {
    const now = Date.now();
    return posts
      .filter((p) => p.post_type === 'EVENT' && p.event_date)
      .filter((p) => new Date(p.event_date).getTime() >= now)
      .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
      .slice(0, 5);
  }, [posts]);

  return {
    posts, total, totalPages, currentPage, lastLoadedPage, hasMore,
    loading, loadingMore, error,
    postType,
    setFilterType,
    goToPage, loadMore, pageSize: PAGE_SIZE,
    toggleLike, submitComment,
    commentsMap,
    commentsLoading,
    fetchComments,
    replyToComment,
    upcomingEvents,
    refresh: () => fetchPage(currentPage, { append: false }),
  };
};

export default useEmployerFeed;