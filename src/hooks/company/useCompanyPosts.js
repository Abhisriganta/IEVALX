import { useState, useEffect, useCallback, useRef } from 'react';
import companyPostsService from '@/services/api/company/companyPostsService';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';

export const useCompanyPosts = (typeFilter = 'all') => {
  const [posts,    setPosts]   = useState([]);
  const [comments, setComments] = useState([]);
  const [stats,    setStats]   = useState(null);
  const [loading,  setLoading] = useState(true);
  const [error,    setError]   = useState('');

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const VIDEO_EXT = /\.(mp4|mov|webm|avi|mkv|m4v)(\?|$)/i;
  const DOC_EXT   = /\.(pdf)(\?|$)/i;
  const deriveMediaType = (url, stored) => {
    if (url) {
      if (VIDEO_EXT.test(url)) return 'video';
      if (DOC_EXT.test(url))   return 'document';
    }
    return stored || (url ? 'image' : null);
  };

  // ─── normalize backend post → UI shape ────────────────────────────────
  const normalizePost = (p) => ({
    id:           p.id,
    // backend uses uppercase types; UI uses lowercase
    type:         String(p.post_type || 'news').toLowerCase(),
    title:        p.title || '',
    content:      p.content || '',
    author:       p.posted_by_employer_id ? `Employer #${p.posted_by_employer_id}` : 'Company Admin',
    authorAvatar: 'CO',
    postedAt:     p.published_at || p.created_at || '',
    // backend: is_published bool
    status:       p.is_published ? 'Published' : 'Draft',
    likes:        p.like_count || 0,                        // no likes column in backend yet
    comments:     p.comment_count  || 0,
    reposts:      p.repost_count   || 0,
    views:        p.view_count     || 0,
    image_url:    p.image_url      || null,
    media_type:   deriveMediaType(p.image_url, p.media_type),
    event_date:   p.event_date     || null,
    event_location: p.event_location || null,
    // keep raw fields for edit flow
    _raw: p,
  });

  // ─── normalize backend comment → UI shape ──────────────────────────────
  const normalizeComment = (c, postTitle = '') => ({
    id:           c.id,
    author:       c.commenter_name  || 'User',
    authorAvatar: (c.commenter_name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
    photo:        c.commenter_photo_url || c.photo_url || c.employer_photo || c.profile_image || c.avatar_url || null,
    authorRole:   c.commenter_type  || '',
    postId:       c.post_id,
    postTitle,
    content:      c.comment_text    || '',
    timestamp:    c.created_at      || '',
    // no sentiment in backend — default to neutral
    sentiment:    'neutral',
    replied:      false,
    flagged:      c.is_hidden     || false,
    parentId:     c.parent_comment_id || null,
    _raw: c,
  });

  // ─── fetch ─────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = typeFilter !== 'all' ? { post_type: typeFilter.toUpperCase() } : {};
      const [postsRes, statsRes] = await Promise.allSettled([
        companyPostsService.listPosts(params),
        companyPostsService.getEngagementStats(),
      ]);

      if (!mountedRef.current) return;

      // Posts
      if (postsRes.status === 'fulfilled') {
        const raw = postsRes.value?.data?.Posts || postsRes.value?.data?.posts || [];
        const normalized = raw.map(normalizePost);
        setPosts(normalized);

        // Fetch comments for all posts in one pass
        const commentResults = await Promise.allSettled(
          raw.map(p => companyPostsService.listComments(p.id).then(r => ({ postId: p.id, postTitle: p.title, data: r.data })))
        );
        if (!mountedRef.current) return;
        const allComments = [];
        commentResults.forEach(r => {
          if (r.status === 'fulfilled') {
            const list = r.value?.data?.Comments || r.value?.data?.comments || [];
            list.forEach(c => {
              const normalized = normalizeComment(c, r.value.postTitle);
              normalized.replied = Boolean(c.has_replies);
              normalized.replies = (c.replies || []).map(reply => normalizeComment(reply, r.value.postTitle));
              allComments.push(normalized);
              // also push nested replies into flat list so comments tab shows them
              (c.replies || []).forEach(reply => {
                allComments.push(normalizeComment(reply, r.value.postTitle));
              });
            });
          }
        });
        setComments(allComments);
      } else {
        const msg = postsRes.reason?.response?.data?.Error || 'Failed to load posts.';
        setError(msg);
      }

      // Stats (non-fatal)
      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value?.data || null);
      }
    } catch (err) {
      if (mountedRef.current) setError(err?.message || 'Unexpected error loading posts.');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [typeFilter]);
useEffect(() => { fetchAll(); }, [fetchAll]);
  useRefetchOnFocus(fetchAll);

  // ─── mutations ─────────────────────────────────────────────────────────

  const createPost = useCallback(async (draft) => {
    const res = await companyPostsService.createPost(draft);
    const newId = res.data?.Post_Id;
    if (newId) {
      const getRes = await companyPostsService.getPost(newId);
      const raw = getRes.data?.Post || getRes.data;
      if (raw) setPosts(prev => [normalizePost(raw), ...prev]);
    } else {
      await fetchAll();
    }
    return res;
  }, [fetchAll]);

  const deletePost = useCallback(async (postId) => {
    await companyPostsService.deletePost(postId);
    setPosts(prev => prev.filter(p => p.id !== postId));
    setComments(prev => prev.filter(c => c.postId !== postId));
  }, []);

  const updatePost = useCallback(async (postId, updates) => {
    const res = await companyPostsService.updatePost(postId, updates);
    await fetchAll();
    return res;
  }, [fetchAll]);

  const addComment = useCallback(async (postId, text) => {
    const res = await companyPostsService.addComment(postId, text);
    // refresh comments for that post only
    const listRes = await companyPostsService.listComments(postId);
    const raw = listRes.data?.Comments || listRes.data?.comments || [];
    const postTitle = posts.find(p => p.id === postId)?.title || '';
    const fresh = [];
    raw.forEach(c => {
      const normalized = normalizeComment(c, postTitle);
      normalized.replied = Boolean(c.has_replies);
      normalized.replies = (c.replies || []).map(reply => normalizeComment(reply, postTitle));
      fresh.push(normalized);
      (c.replies || []).forEach(reply => {
        fresh.push(normalizeComment(reply, postTitle));
      });
    });
    setComments(prev => [
      ...prev.filter(c => c.postId !== postId),
      ...fresh,
    ]);

    // increment comment count on the post card
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments: p.comments + 1 } : p));
    return res;
  }, [posts]);

  const replyToComment = useCallback(async (postId, parentCommentId, text) => {
    const res = await companyPostsService.replyToComment(postId, parentCommentId, text);
    // refresh comments so the new reply appears nested under the parent immediately
    const listRes = await companyPostsService.listComments(postId);
    const raw = listRes.data?.Comments || listRes.data?.comments || [];
    const postTitle = posts.find(p => p.id === postId)?.title || '';
    const fresh = [];
    raw.forEach(c => {
      const normalized = normalizeComment(c, postTitle);
      normalized.replied = Boolean(c.has_replies);
      normalized.replies = (c.replies || []).map(reply => normalizeComment(reply, postTitle));
      fresh.push(normalized);
      // also push replies into flat list so comments tab shows them
      (c.replies || []).forEach(reply => {
        fresh.push(normalizeComment(reply, postTitle));
      });
    });
    setComments(prev => [
      ...prev.filter(c => c.postId !== postId),
      ...fresh,
    ]);
    return res;
  }, [posts]);


  const hideComment = useCallback(async (commentId, reason = '') => {
    await companyPostsService.hideComment(commentId, reason);
    setComments(prev => prev.map(c => c.id === commentId ? { ...c, flagged: true } : c));
  }, []);

  const deleteComment = useCallback(async (commentId, postId) => {
    await companyPostsService.deleteComment(commentId);
    setComments(prev => prev.filter(c => c.id !== commentId));
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, comments: Math.max(0, p.comments - 1) } : p
    ));
  }, []);

  const repostPost = useCallback(async (postId, opts = {}) => {
    const res = await companyPostsService.repostPost(postId, opts);
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, reposts: p.reposts + 1 } : p));
    return res;
  }, []);

  const recordView = useCallback(async (postId) => {
    try {
      const res = await companyPostsService.recordView(postId);
      if (res?.data?.counted) {
        setPosts(prev => prev.map(p =>
          p.id === postId ? { ...p, views: res.data.view_count ?? p.views + 1 } : p
        ));
      }
    } catch {
    }
  }, []);

  return {
    posts,
    comments,
    stats,
    loading,
    error,
    refresh: fetchAll,
    // mutations
    createPost,
    updatePost,
    deletePost,
    addComment,
    replyToComment,
    hideComment,
    deleteComment,
    repostPost,
    recordView,
  };
};