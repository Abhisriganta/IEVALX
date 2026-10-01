

import api from '@/services/api/axiosInstance';

const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem('ievalx_user') || '{}');
  } catch {
    return {};
  }
};

const currentCandidateId = () => {
  const u = getUser();
  return u?.id ?? u?.candidate_id ?? null;
};

const authHeader = () => {
  const token = localStorage.getItem('ievalx_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const POST_TYPE_TO_KIND = {
  NEWS:     'feature',
  UPDATE:   'tip',
  EVENT:    'event',
  GREETING: 'tip',
  ANNOUNCEMENT: 'feature',
};

const timeAgo = (isoString) => {
  if (!isoString) return '';
  const then  = new Date(isoString).getTime();
  const now   = Date.now();
  const diffS = Math.max(0, Math.floor((now - then) / 1000));
  if (diffS < 60)         return 'Just now';
  if (diffS < 3600)       return `${Math.floor(diffS / 60)} min ago`;
  if (diffS < 86400)      return `${Math.floor(diffS / 3600)} hr ago`;
  if (diffS < 172800)     return 'Yesterday';
  if (diffS < 604800)     return `${Math.floor(diffS / 86400)} d ago`;
  const d = new Date(isoString);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const normalizePost = (raw) => {
  const company     = raw.company || {};
  const companyName = company.name || '';
  const initials    = companyName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('') || 'CO';

  return {
    ...raw,
    kind:     POST_TYPE_TO_KIND[raw.post_type] || 'tip',
    time:     timeAgo(
      raw.is_repost && raw.repost?.created_at
        ? raw.repost.created_at
        : (raw.published_at || raw.created_at)
    ),
    initials,
    is_liked: !!raw.is_liked,
  };
};

/* ─── Comment normalizer — v5 adds photo_url pass-through ───────────── */
const normalizeComment = (raw) => {
  const name = raw.commenter_name || 'User';
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('') || 'U';

  // Support several backend field names for the commenter avatar URL
  const photoUrl =
    raw.commenter_photo_url ||
    raw.commenter_photo ||
    raw.commenter_avatar ||
    raw.photo_url ||
    raw.avatar_url ||
    null;

  return {
    id:             raw.id,
    post_id:        raw.post_id,
    commenter_type: raw.commenter_type  || 'CANDIDATE',
    commenter_id:   raw.commenter_id    || null,
    commenter_name: name,
    photo_url:      photoUrl,
    initials,
    text:           raw.comment_text    || '',
    parent_id:      raw.parent_comment_id || null,
    created_at:     raw.created_at      || '',
    time:           timeAgo(raw.created_at),
    is_hidden:      !!raw.is_hidden,
    // Optional like state for comments (backend may add later)
    like_count:     raw.like_count      || 0,
    is_liked:       !!raw.is_liked,
    replies:        Array.isArray(raw.replies)
                      ? raw.replies.map(normalizeComment)
                      : [],
  };
};

const getFeed = async ({
  limit    = 20,
  offset   = 0,
  postType = null,
  companyId = null,
} = {}) => {
  const candidateId = currentCandidateId();
  const params = { limit, offset };
  if (candidateId) params.candidate_id = candidateId;
  if (postType)    params.post_type    = postType;
  if (companyId)   params.company_id   = companyId;

  const res = await api.get('/jobseeker/feed', {
    params,
    headers: authHeader(),
  });

  return {
    total:    res.data?.total    ?? 0,
    limit:    res.data?.limit    ?? limit,
    offset:   res.data?.offset   ?? offset,
    hasMore:  !!res.data?.has_more,
    posts:    (res.data?.posts || []).map(normalizePost),
  };
};
const recordView = async (postId) => {
  const candidateId = currentCandidateId();
  if (!candidateId) return;               // don't record anonymous views
  try {
    await api.post(
      `/companies/posts/${postId}/view`,
      { viewer_type: 'JOBSEEKER', viewer_id: candidateId },
      { headers: authHeader() },
    );
  } catch {
    /* fire-and-forget — never break the feed on failure */
  }
};
const getPost = async (postId) => {


  const candidateId = currentCandidateId();
  const params = candidateId ? { candidate_id: candidateId } : {};
  const res = await api.get(`/jobseeker/feed/${postId}`, {
    params,
    headers: authHeader(),
  });
  return res.data?.post ? normalizePost(res.data.post) : null;
};

const likePost = async (postId) => {
  const candidateId = currentCandidateId();
  if (!candidateId) throw new Error('Not signed in.');
  const res = await api.post(
    `/jobseeker/feed/${postId}/like`,
    { candidate_id: candidateId },
    { headers: authHeader() },
  );
  return res.data;
};

const unlikePost = async (postId) => {
  const candidateId = currentCandidateId();
  if (!candidateId) throw new Error('Not signed in.');
  const res = await api.delete(
    `/jobseeker/feed/${postId}/unlike`,
    {
      data:    { candidate_id: candidateId },
      headers: authHeader(),
    },
  );
  return res.data;
};

const getComments = async (postId) => {
  const candidateId = currentCandidateId();
  const params = candidateId ? { candidate_id: candidateId } : {};

  try {
    const res = await api.get(`/jobseeker/feed/${postId}/comments`, {
      params,
      headers: authHeader(),
    });
    const raw = res.data?.comments || res.data?.Comments || [];
    return raw.map(normalizeComment);
  } catch (primaryErr) {
    if (primaryErr?.response?.status === 404) {
      try {
        const res = await api.get(`/companies/posts/${postId}/comments`, {
          headers: authHeader(),
        });
        const raw = res.data?.comments || res.data?.Comments || [];
        return raw.map(normalizeComment);
      } catch {
        return [];
      }
    }
    throw primaryErr;
  }
};

const commentOnPost = async (postId, commentText, parentCommentId = null) => {
  const candidateId = currentCandidateId();
  if (!candidateId) throw new Error('Not signed in.');
  const res = await api.post(
    `/jobseeker/feed/${postId}/comment`,
    {
      candidate_id:      candidateId,
      comment_text:      commentText,
      parent_comment_id: parentCommentId,
    },
    { headers: authHeader() },
  );
  return res.data;
};

/* ─── Like / unlike a specific COMMENT (optional — backend may 404) ─── */
const likeComment = async (commentId) => {
  const candidateId = currentCandidateId();
  if (!candidateId) throw new Error('Not signed in.');
  try {
    const res = await api.post(
      `/jobseeker/feed/comments/${commentId}/like`,
      { candidate_id: candidateId },
      { headers: authHeader() },
    );
    return res.data;
  } catch (err) {
    // If backend doesn't support comment likes yet, resolve gracefully
    if (err?.response?.status === 404) return { like_count: 0, unsupported: true };
    throw err;
  }
};

const unlikeComment = async (commentId) => {
  const candidateId = currentCandidateId();
  if (!candidateId) throw new Error('Not signed in.');
  try {
    const res = await api.delete(
      `/jobseeker/feed/comments/${commentId}/unlike`,
      {
        data:    { candidate_id: candidateId },
        headers: authHeader(),
      },
    );
    return res.data;
  } catch (err) {
    if (err?.response?.status === 404) return { like_count: 0, unsupported: true };
    throw err;
  }
};

const currentUserKey = () => {
  try {
    const u = JSON.parse(localStorage.getItem('ievalx_user') || '{}');
    const role = u?.role || 'anon';
    const id   = u?.id ?? u?.candidate_id ?? u?.employer_id ?? 'anon';
    return `${role}_${id}`;
  } catch { return 'anon'; }
};

const lastSeenKey = () => `ievalx_ann_last_seen_id_${currentUserKey()}`;

const getLastSeenId = () => {
  try {
    const v = localStorage.getItem(lastSeenKey());
    return v ? Number(v) : 0;
  } catch { return 0; }
};

const setLastSeenId = (id) => {
  try {
    localStorage.setItem(lastSeenKey(), String(id));
  } catch {}
};

const feedService = {
  getFeed,
  getPost,
  recordView,
  likePost,
  unlikePost,
  getComments,
  commentOnPost,
  likeComment,     // NEW v5
  unlikeComment,   // NEW v5
  getLastSeenId,
  setLastSeenId,
  POST_TYPE_TO_KIND,
  normalizeComment,
};

export default feedService;