
import api from '@/services/api/axiosInstance';
import jobseekerFeedService from '@/services/api/jobseeker/feedService';

const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem('ievalx_user') || '{}');
  } catch {
    return {};
  }
};

/* Same resolution rules as employer/jobService.js — explicit employer_id
   wins, otherwise the account id for employer-family roles. */
const currentEmployerId = () => {
  const u = getUser();
  const explicit = u?.employer_id ?? u?.employerId;
  if (explicit != null) return Number(explicit);
  return u?.id != null ? Number(u.id) : null;
};

const currentEmployerName = () => {
  const u = getUser();
  return u?.full_name || u?.name || u?.email || 'Employer';
};

const authHeader = () => {
  const token = localStorage.getItem('ievalx_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
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

/* Backend already returns the jobseeker-feed payload shape, so the
   normalizer only has to add the derived UI fields. */
const normalizePost = (raw) => {
  const company     = raw.company || {};
  const companyName = company.name || '';
  const initials    = companyName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('') || 'CO';

  // Surface the company logo from all possible backend field names
  const logo = company.logo
    || company.logo_url
    || company.profile_image_url
    || company.profile_image
    || company.image
    || company.avatar
    || company.company_logo
    || null;

  return {
    ...raw,
    company: { ...company, logo },
    time:     timeAgo(raw.published_at || raw.created_at),
    initials,
    is_liked: !!raw.is_liked,
  };
};


const getFeed = async ({
  limit    = 20,
  offset   = 0,
  postType = null,
} = {}) => {
  const employerId = currentEmployerId();
  const params     = { limit, offset };
  if (postType) params.post_type = postType;

  // Strategy 1: employer-specific endpoint (employer is_liked + company scoped)
  if (employerId) {
    try {
      const res = await api.get(`/employers/${employerId}/feed`, {
        params,
        headers: authHeader(),
      });

      // BUILD: 2026-09-11-employer-announcements-parity-v1
      const posts = (res.data?.posts || []).map(normalizePost);

      return {
        total:   res.data?.total    ?? posts.length,
        limit:   res.data?.limit    ?? limit,
        offset:  res.data?.offset   ?? offset,
        hasMore: !!res.data?.has_more,
        posts,
      };
    } catch {
      
    }
  }


  const res = await api.get('/jobseeker/feed', {
    params,
    headers: authHeader(),
  });

  const posts = (res.data?.posts || []).map(normalizePost);

  return {
    total:   res.data?.total    ?? posts.length,
    limit:   res.data?.limit    ?? limit,
    offset:  res.data?.offset   ?? offset,
    hasMore: !!res.data?.has_more,
    posts,
  };
};

/* ─── Views ────────────────────────────────────────────────────────── */
const recordView = async (postId) => {
  const employerId = currentEmployerId();
  if (!employerId) return;
  try {
    await api.post(
      `/companies/posts/${postId}/view`,
      { viewer_type: 'EMPLOYER', viewer_id: employerId },
      { headers: authHeader() },
    );
  } catch {
    /* fire-and-forget — never break the feed on failure */
  }
};

/* ─── Likes (post-level, employer-owned table) ─────────────────────── */
const likePost = async (postId) => {
  const employerId = currentEmployerId();
  if (!employerId) throw new Error('Not signed in.');
  const res = await api.post(
    `/employers/feed/${postId}/like`,
    { employer_id: employerId },
    { headers: authHeader() },
  );
  return res.data;
};

const unlikePost = async (postId) => {
  const employerId = currentEmployerId();
  if (!employerId) throw new Error('Not signed in.');
  const res = await api.delete(
    `/employers/feed/${postId}/unlike`,
    {
      data:    { employer_id: employerId },
      headers: authHeader(),
    },
  );
  return res.data;
};

/* ─── Comments (shared company-post endpoints) ─────────────────────── */
const getComments = async (postId) => {
  try {
    const res = await api.get(`/companies/posts/${postId}/comments`, {
      headers: authHeader(),
    });
    const raw = res.data?.comments || res.data?.Comments || [];
    // Reuse the jobseeker normalizer so comment shape is identical.
    return raw.map(jobseekerFeedService.normalizeComment);
  } catch {
    return [];
  }
};

const commentOnPost = async (postId, commentText, parentCommentId = null) => {
  const employerId = currentEmployerId();
  if (!employerId) throw new Error('Not signed in.');

  const body = {
    post_id:        postId,
    commenter_type: 'EMPLOYER',
    commenter_id:   employerId,
    commenter_name: currentEmployerName(),
    comment_text:   commentText,
  };

  if (parentCommentId) {
    const res = await api.post(
      '/companies/posts/comments/reply',
      { ...body, parent_comment_id: parentCommentId },
      { headers: authHeader() },
    );
    return res.data;
  }

  const res = await api.post(
    '/companies/posts/comments/add',
    body,
    { headers: authHeader() },
  );
  return res.data;
};

/* ─── Comment likes — not supported for employers yet.
   Return the same graceful `unsupported` shape the jobseeker service
   uses so FeedPostCard's optimistic UI reverts silently. ─────────── */
const likeComment   = async () => ({ like_count: 0, unsupported: true });
const unlikeComment = async () => ({ like_count: 0, unsupported: true });

const employerFeedService = {
  getFeed,
  recordView,
  likePost,
  unlikePost,
  getComments,
  commentOnPost,
  likeComment,
  unlikeComment,
};

export default employerFeedService;