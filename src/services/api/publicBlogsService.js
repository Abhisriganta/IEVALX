import api from '@/services/api/axiosInstance';
import { BLOG_POSTS, BLOG_TAGS } from '@/pages/public/publicData';

/* ── Adapters ──────────────────────────────────────────────────────────── */

const IST = 'en-IN';

// "2026-08-12" → "12 Aug 2026", matching the static copy's formatting.
const formatDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(IST, { day: '2-digit', month: 'short', year: 'numeric' });
};

const adaptPost = (p = {}) => ({
  slug: p.slug,
  title: p.title || '',
  tag: p.tag || 'IEvalx',
  excerpt: p.excerpt || '',
  date: formatDate(p.date),
  read: p.read || '',
  img: p.img || null,
  imgKind: p.imgKind || 'image',
  views: p.views ?? 0,
  author: p.author || 'IEvalx Team',
});

const adaptArticle = (p = {}) => ({
  ...adaptPost(p),
  body: Array.isArray(p.body) ? p.body : (p.body ? [p.body] : []),
  tags: Array.isArray(p.tags) ? p.tags : [],
  gallery: Array.isArray(p.gallery) ? p.gallery : [],
  related: Array.isArray(p.related) ? p.related.map(adaptPost) : [],
  viewCounted: Boolean(p.viewCounted),
  galleryDisplay: p.galleryDisplay === 'carousel' ? 'carousel' : 'grid',
});

/* ── Static fallback ───────────────────────────────────────────────────── */

const staticPosts = (tag) => {
  const rows = !tag || tag === 'All' ? BLOG_POSTS : BLOG_POSTS.filter((p) => p.tag === tag);
  return rows.map((p) => ({ ...p, views: 0, author: 'IEvalx Team' }));
};

const staticArticle = (slug) => {
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  if (!post) return null;
  const related = BLOG_POSTS.filter((p) => p.slug !== slug && p.tag === post.tag).slice(0, 3);
  const fill = BLOG_POSTS
    .filter((p) => p.slug !== slug && !related.includes(p))
    .slice(0, 3 - related.length);
  return {
    ...post,
    views: 0,
    author: 'IEvalx Team',
    tags: [],
    gallery: [],
    related: [...related, ...fill],
    viewCounted: false,
  };
};

/* ── Service ───────────────────────────────────────────────────────────── */

export const publicBlogsService = {
  /** Published posts, newest first. Returns { posts, tags }. */
  list: async ({ tag = 'All', limit = 12 } = {}) => {
    try {
      const res = await api.get('/public/blogs', { params: { tag, limit } });
      const posts = (res.data?.posts || []).map(adaptPost);
      if (!posts.length) {
        return { posts: staticPosts(tag), tags: BLOG_TAGS, fromApi: false };
      }
      return {
        posts,
        tags: res.data?.tags?.length ? res.data.tags : BLOG_TAGS,
        fromApi: true,
      };
    } catch {
      return { posts: staticPosts(tag), tags: BLOG_TAGS, fromApi: false };
    }
  },

 
  getBySlug: async (slug) => {
    try {
      const res = await api.get(`/public/blogs/${encodeURIComponent(slug)}`);
      return { post: adaptArticle(res.data), fromApi: true };
    } catch {
      const fallback = staticArticle(slug);
      return { post: fallback, fromApi: false };
    }
  },
};

export default publicBlogsService;