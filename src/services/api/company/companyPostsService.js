import api from '../axiosInstance';

/**
 * Company Posts Service
 * Wraps all /api/companies/posts/* and related endpoints.
 *
 * Backend: core/employers/company_post.py
 *
 * Auth: the company-scoped axios instance already attaches the Bearer token.
 * company_id and posted_by_employer_id are resolved from localStorage here
 * so callers don't have to pass them every time.
 */

// ─── resolve ids from session ──────────────────────────────────────────────
function getSession() {
  try {
    const user = JSON.parse(localStorage.getItem('ievalx_user') || '{}');
    const role = String(user.role || '').toLowerCase();
    const companyId =
      user.company_id ?? user.companyId ?? user.Company_Id ??
      (role === 'company' ? user.id : null) ??
      null;
    const employerId = role === 'company' ? null : (user.id ?? null);
    return { companyId, employerId };
  } catch {
    return { companyId: null, employerId: null };
  }
}

/**
 * Resolve who is authoring a comment/reply.
 * Company-role users have no employer_account id — fall back to companyId
 * so commenter_id is never null (backend 400s otherwise).
 */
function getCommenterIdentity() {
  try {
    const user = JSON.parse(localStorage.getItem('ievalx_user') || '{}');
    const { companyId, employerId } = getSession();
    const role = String(user.role || '').toLowerCase();
    const humanName =
      user.full_name || user.name ||
      [user.first_name, user.last_name].filter(Boolean).join(' ').trim() ||
      user.company_name || null;
    if (role === 'company') {
      return {
        commenter_type: 'EMPLOYER',
        commenter_id:   companyId,
        commenter_name: humanName || 'Company Admin',
      };
    }
    return {
      commenter_type: 'EMPLOYER',
      commenter_id:   employerId || companyId,
      commenter_name: humanName || 'Employer',
    };
  } catch {
    return {
      commenter_type: 'EMPLOYER',
      commenter_id:   null,
      commenter_name: 'User',
    };
  }
}

// ─── posts ─────────────────────────────────────────────────────────────────

/**
 * Create a post.
 * @param {object} payload – { post_type, title, content, is_published?,
 *                             image_url?, event_date?, event_location? }
 */
const createPost = (payload) => {
  const { companyId, employerId } = getSession();
  return api.post('/companies/posts/create', {
    company_id: companyId,
    posted_by_employer_id: employerId,
    // POST types in backend are uppercase: NEWS | UPDATE | EVENT | GREETING
    post_type: String(payload.post_type || payload.type || 'NEWS').toUpperCase(),
    title:    payload.title,
    content:  payload.content,
    is_published: payload.is_published ?? true,
    image_url:      payload.image_url      || null,
    event_date:     payload.event_date     || null,
    event_location: payload.event_location || null,
  });
};

/**
 * List all posts for the session company.
 * @param {object} params – { post_type?, is_published? }
 */
const listPosts = (params = {}) => {
  const { companyId } = getSession();
  return api.get(`/companies/${companyId}/posts`, { params });
};

/** Get a single post by id. */
const getPost = (postId) => api.get(`/companies/posts/${postId}`);

/**
 * Update a post.
 * @param {number} postId
 * @param {object} updates – any subset of post fields
 */
const updatePost = (postId, updates) =>
  api.put(`/companies/posts/update/${postId}`, updates);

/** Delete a post. */
const deletePost = (postId) => api.delete(`/companies/posts/delete/${postId}`);

// ─── comments ──────────────────────────────────────────────────────────────

/**
 * Add a top-level comment on a post.
 * @param {number} postId
 * @param {string} text
 */
const addComment = (postId, text) => {
  const { companyId } = getSession();
  const who = getCommenterIdentity();
  return api.post('/companies/posts/comments/add', {
    post_id:        postId,
    commenter_type: who.commenter_type,
    commenter_id:   who.commenter_id,
    commenter_name: who.commenter_name,
    comment_text:   text,
    company_id:     companyId,
  });
};

/**
 * Reply to an existing comment.
 * @param {number} postId
 * @param {number} parentCommentId
 * @param {string} text
 */
const replyToComment = (postId, parentCommentId, text) => {
  const { companyId } = getSession();
  const who = getCommenterIdentity();
  return api.post('/companies/posts/comments/reply', {
    post_id:           postId,
    parent_comment_id: parentCommentId,
    commenter_type:    who.commenter_type,
    commenter_id:      who.commenter_id,
    commenter_name:    who.commenter_name,
    comment_text:      text,
    company_id:        companyId,
  });
};


const listComments = (postId) =>
  api.get(`/companies/posts/${postId}/comments`);

/** Hide (moderate) a comment. */
const hideComment = (commentId, reason = '') =>
  api.put(`/companies/posts/comments/hide/${commentId}`, { hidden_reason: reason });

/** Delete a comment. */
const deleteComment = (commentId) =>
  api.delete(`/companies/posts/comments/delete/${commentId}`);

// ─── reposts ───────────────────────────────────────────────────────────────

/**
 * Repost a post.
 * @param {number} postId
 * @param {object} opts – { repost_note?, repost_type? } type: POSITIVE|NEGATIVE|NEUTRAL
 */
const repostPost = (postId, opts = {}) => {
  const { companyId, employerId } = getSession();
  return api.post('/companies/posts/repost', {
    post_id:                 postId,
    reposted_by_employer_id: employerId || null,
    company_id:              companyId  || null,
    repost_note: opts.repost_note || null,
    repost_type: (opts.repost_type || 'NEUTRAL').toUpperCase(),
  });
};

/** List reposts for a post. */
const listReposts = (postId) =>
  api.get(`/companies/posts/${postId}/reposts`);
/** List jobseekers who liked a post. Company-facing (for engagement view). */
const listLikers = (postId, { limit = 50, offset = 0 } = {}) =>
  api.get(`/companies/posts/${postId}/likers`, { params: { limit, offset } });

/** List viewers for a post (who viewed it). */
const listViewers = (postId) =>
  api.get(`/companies/posts/${postId}/viewers`);

const recordView = (postId) => {
  const { employerId, companyId } = getSession();
  const viewerId = employerId || companyId || 0;
  return api.post(`/companies/posts/${postId}/view`, {
    viewer_type: viewerId ? 'EMPLOYER' : 'ANONYMOUS',
    viewer_id:   viewerId,
  });
};

/** Delete a repost. */
const deleteRepost = (repostId) =>
  api.delete(`/companies/posts/reposts/delete/${repostId}`);

/* 🔧 UNDO-REPOST — orchestrator used by CompanyEngagement's
   handleUndoRepost. The delete endpoint needs a repost ID, but the UI
   only knows the post ID, so:
     1. list the post's reposts,
     2. pick the session user's most recent repost (falling back to the
        newest repost overall — on the company-engagement page reposts
        are made by the company admin),
     3. delete it by ID via the existing deleteRepost endpoint.
   Throws an axios-style error ({ response.data.Error }) when there is
   nothing to remove, so the component's snackbar shows a clean message. */
const undoRepost = async (postId) => {
  const { companyId, employerId } = getSession();

  const res = await listReposts(postId);
  const raw = res?.data;
  const reposts = Array.isArray(raw) ? raw
    : raw?.reposts || raw?.Reposts || raw?.data || [];

  if (!Array.isArray(reposts) || reposts.length === 0) {
    const err = new Error('No repost found to remove');
    err.response = { data: { Error: 'No repost found to remove' } };
    throw err;
  }

  const ts = (r) => new Date(
    r.created_at || r.reposted_at || r.createdAt || r.updated_at || 0,
  ).getTime() || 0;

  const uid = String(employerId ?? companyId ?? '');
  const byUser = (r) => {
    const who = r.reposted_by_employer_id ?? r.reposted_by ??
                r.employer_id ?? r.reposter_id ?? null;
    /* Backend stores reposted_by_employer_id = NULL for company-admin
       reposts (see company_post.py Repost_Post) — a company-role session
       (employerId null) therefore owns the NULL-employer rows. */
    if (employerId == null) return who == null;
    return uid && who != null && String(who) === uid;
  };

  const mine = reposts.filter(byUser).sort((a, b) => ts(b) - ts(a));
  const target = mine[0] || [...reposts].sort((a, b) => ts(b) - ts(a))[0];

  const repostId = target?.id ?? target?.repost_id ?? target?.Id ?? target?.repostId;
  if (repostId == null) {
    const err = new Error('Could not identify the repost to remove');
    err.response = { data: { Error: 'Could not identify the repost to remove' } };
    throw err;
  }

  return deleteRepost(repostId);
};

// ─── engagement stats ──────────────────────────────────────────────────────

const getEngagementStats = () => {
  const { companyId } = getSession();
  return api.get(`/companies/${companyId}/posts/engagement-stats`);
};

const companyPostsService = {
  // posts
  createPost,
  listPosts,
  getPost,
  updatePost,
  deletePost,
  // comments
  addComment,
  replyToComment,
  listComments,
  hideComment,
  deleteComment,
  // reposts
  repostPost,
  listReposts,
  deleteRepost,
  undoRepost,
  listLikers,
  listViewers,
  recordView,
  // stats
  getEngagementStats,
};

export default companyPostsService;