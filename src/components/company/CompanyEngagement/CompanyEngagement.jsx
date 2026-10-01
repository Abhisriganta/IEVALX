import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Avatar,
  Button,
  IconButton,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Stack,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Menu,
  InputAdornment,
  useTheme,
  useMediaQuery,
  Skeleton,
  CircularProgress,
  Pagination,
} from '@mui/material';
import {
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Language as WebsiteIcon,
  LocationOn as LocationIcon,
  People as PeopleIcon,
  Reply as ReplyIcon,
  Repeat as RepostIcon,
  Comment as CommentIcon,
  Campaign as NewsIcon,
  PriorityHigh as UpdateIcon,
  Celebration as EventIcon,
  NotificationsActive as AnnouncementIcon,
  MoreVert as MoreVertIcon,
  ThumbUp as ThumbUpIcon,
  PhotoCamera as CameraIcon,
  Send as SendIcon,
  CheckCircle as VerifiedIcon,
  Visibility as ViewersIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useAuth } from '@/hooks/useAuth';
import { useCompanyProfile } from '@/hooks/company/useCompanyProfile';
import { useCompanyPosts } from '@/hooks/company/useCompanyPosts';
import companyPostsService from '@/services/api/company/companyPostsService';
import axiosInstance from '@/services/api/axiosInstance';

/* ════════════════════════════════════════════════════════════════════
   🔧 REDESIGN "Pine Masthead + Canvas Social" (Demo 1 top + Demo 5 body)
   Design tokens — local mirror of the canonical pine/sage BRAND palette
   (src/components/jobseeker/LiveChat/theme.js). Kept local so the
   company bundle does not import jobseeker modules.
   ════════════════════════════════════════════════════════════════════ */
const B = {
  navy: '#022124', navySoft: '#043034', navyLighter: '#0A3F42',
  sage: '#7F9E7E', sageText: '#5E815D', sageDeep: '#4E6E4D',
  sageSoft: '#EDF3EC', sageWash: '#F3F7F1',
  bg: '#F6F8F3', surface: '#FFFFFF',
  ink: '#101210', muted: '#55584F', faint: '#7A7E76',
  border: '#E7EAE3', borderStrong: '#D8DDD4',
  done: '#3E6E3E', doneSoft: '#EAF2E9',
  amber: '#A35A2D', amberSoft: '#F6ECDF',
  error: '#B4462F', errorSoft: '#FBECEA',
};

const FONT  = "'Jost','DM Sans',sans-serif";
const SERIF = "'DM Serif Display','Jost',serif";

/* 🔧 PAGINATION — same pattern as JobPostings; default 10, options 5/10/25/50/all. */
const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [5, 10, 25, 50, 'all'];

const inputSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '12px', bgcolor: B.surface, fontFamily: FONT,
    '& fieldset': { borderColor: B.border },
    '&:hover fieldset': { borderColor: B.sage },
    '&.Mui-focused fieldset': { borderColor: B.sageText, borderWidth: 2 },
  },
  '& .MuiInputLabel-root': { fontFamily: FONT },
  '& .MuiInputLabel-root.Mui-focused': { color: B.sageText },
};



/* Small status pill used across comments (Replied / Flagged / Hidden). */
const StatusPill = ({ kind, children }) => {
  const map = {
    ok:   { bg: B.doneSoft,  tx: B.done  },
    warn: { bg: B.errorSoft, tx: B.error },
  };
  const c = map[kind] || map.ok;
  return (
    <Box component="span" sx={{
      height: { xs: 16, sm: 18 }, px: 0.9, borderRadius: '999px',
      bgcolor: c.bg, color: c.tx, fontFamily: FONT,
      fontSize: { xs: '0.55rem', sm: '0.6rem' }, fontWeight: 700,
      display: 'inline-flex', alignItems: 'center',
    }}>{children}</Box>
  );
};

/* Surface panel — cream-system card. */
const Panel = ({ children, sx }) => (
  <Box sx={{
    bgcolor: B.surface, border: `1px solid ${B.border}`,
    borderRadius: { xs: '14px', sm: '18px' },
    transition: 'box-shadow .2s ease',
    ...sx,
  }}>{children}</Box>
);

/* Completeness ring (SVG donut) — used in right rail + About tab. */
const StrengthRing = ({ pct, size = 54, track = 'rgba(16,18,16,0.08)', stroke = B.sageText }) => {
  const r = (size / 2) - 6;
  const circ = 2 * Math.PI * r;
  return (
    <Box component="svg" width={size} height={size} viewBox={`0 0 ${size} ${size}`} sx={{ flex: 'none' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth="6" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={stroke} strokeWidth="6"
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)}
        strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Box>
  );
};

/* ------------------------------------------------------------------ */
/* Maps the /full-profile payload into the shape this page renders.    */
const initials = (name) => (String(name || '').trim().split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'CO');

const mapProfile = (data) => {
  const a = data?.account || {};
  const c = data?.company || {};
  const p = data?.profile || {};
  const name = c.company_name || a.full_name || 'Your Company';
  const location = p.locations || [p.city, p.state, p.country].filter(Boolean).join(', ') || a.location_region || '—';
  return {
    name,
    logo: initials(name),
    logoUrl: p.company_logo_url || a.profile_image_url || '',

    adminPhotoUrl: a.profile_image_url || '',
    tagline: c.industry_type || p.about?.slice(0, 80) || 'Company profile',
    website: p.website_url || (c.company_domain ? c.company_domain : '—'),
    industry: c.industry_type || '—',
    location,
    size: p.employee_count_range ? `${p.employee_count_range} employees` : '—',
    founded: p.established_year || '—',
    about: p.about || 'No company description has been added yet.',
    domain: c.company_domain || '—',
    email: p.office_email || a.email || '—',
    phone: [c.country_code, c.phone].filter(Boolean).join(' ') || p.primary_contact || '—',
    verified: Boolean(c.is_verified ?? data?.is_verified ?? p.is_verified ?? false),
  };
};

const EMPTY_PROFILE = {
  name: '—', logo: 'CO', logoUrl: '', adminPhotoUrl: '', tagline: '', website: '—', industry: '—',
  location: '—', size: '—', founded: '—', about: '', domain: '—', email: '—', phone: '—', verified: false,
};

/* ------------------------------------------------------------------ */
/* Post-type configuration — pine/sage semantic mapping.               */
const postTypeConfig = {
  news:   { label: 'Company News',     short: 'News',   color: B.sageDeep,    bg: B.sageSoft,  icon: <NewsIcon fontSize="small" /> },
  update: { label: 'Important Update', short: 'Update', color: B.amber,       bg: B.amberSoft, icon: <UpdateIcon fontSize="small" /> },
  event:  { label: 'Event / Greeting', short: 'Event',  color: B.navyLighter, bg: '#E4ECEE',   icon: <EventIcon fontSize="small" /> },
  announcement: { label: 'Announcement',   short: 'Announcement', color: B.navy, bg: '#E9EFEA', icon: <AnnouncementIcon fontSize="small" /> },
};

/* ------------------------------------------------------------------ */
/* MAIN COMPONENT                                                      */
/* ------------------------------------------------------------------ */
const CompanyEngagement = () => {
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isLgUp   = useMediaQuery(theme.breakpoints.up('lg'));

  const { user } = useAuth() || {};
  const companyId =
    user?.id ?? user?.Id ?? user?.company_id ?? user?.Company_Id ??
    user?.companyId ?? user?.company?.id ??
    (typeof localStorage !== 'undefined' ? localStorage.getItem('currentCompanyId') : null) ?? null;

  const { data: profileData, loading: profileLoading, error: profileError } = useCompanyProfile(companyId);
  const mappedProfile = useMemo(() => (profileData ? mapProfile(profileData) : EMPTY_PROFILE), [profileData]);

  const [profile, setProfile] = useState(mappedProfile);
  useEffect(() => { setProfile(mappedProfile); }, [mappedProfile]);

  const completeness = useMemo(() => {
    const vals = [profile.name, profile.industry, profile.website, profile.location, profile.size, profile.founded, profile.about, profile.email, profile.phone, profile.logoUrl];
    const ok = (v) => v && String(v).trim() && String(v).trim() !== '—' && String(v) !== 'No company description has been added yet.';
    const filled = vals.filter(ok).length;
    return Math.round((filled / vals.length) * 100);
  }, [profile]);

  const [typeFilterHook, setTypeFilterHook] = useState('all');
  const {
    posts, comments, loading: postsLoading, error: postsError,
    createPost: apiCreatePost, updatePost: apiUpdatePost, deletePost: apiDeletePost,
    addComment: apiAddComment, replyToComment: apiReplyToComment,
    deleteComment: apiDeleteComment,
    repostPost: apiRepostPost, refresh: refreshPosts,
  } = useCompanyPosts(typeFilterHook);

  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(() => {
    const t = searchParams.get('tab');
    if (t === 'feed')     return 0;
    if (t === 'comments') return 1;
    if (t === 'about')    return 2;
    return 0;
  });
  const [likersDialog,  setLikersDialog]  = useState(null);
  const [likersList,    setLikersList]    = useState([]);
  const [likersLoading, setLikersLoading] = useState(false);
  const [viewersDialog,  setViewersDialog]  = useState(null);
  const [viewersList,    setViewersList]    = useState([]);
  const [viewersLoading, setViewersLoading] = useState(false);
  const [expandedPostId, setExpandedPostId] = useState(null);
  const [inlineReplyId, setInlineReplyId] = useState(null);
  const [inlineReplyText, setInlineReplyText] = useState('');
  const [inlineReplySending, setInlineReplySending] = useState(false);

  const [search, setSearch]         = useState('');
  /* 🔧 FILTER — Demo 5 left-rail filter. 'drafts' is a UI-only status
     filter (backend hook filters by type; drafts filter client-side). */
  const [feedFilter, setFeedFilter] = useState('all'); // all | news | update | event | drafts
  useEffect(() => {
    setTypeFilterHook(feedFilter === 'drafts' ? 'all' : feedFilter);
  }, [feedFilter]);

  /* 🔧 PAGINATION — mirrors JobPostings pattern exactly. */
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  /* 🔧 COMMENT PAGINATION — separate page/pageSize for Comments tab. */
  const [cmtPage, setCmtPage]         = useState(1);
  const [cmtPageSize, setCmtPageSize] = useState(DEFAULT_PAGE_SIZE);

  const [newPost, setNewPost]             = useState(false);
  const [editPost, setEditPost]           = useState(null);
  const [editDraft, setEditDraft]         = useState({ type: 'news', title: '', content: '' });
  const [preview, setPreview]             = useState(null);
  const [replyDialog, setReplyDialog]     = useState(null);
  const [replyText, setReplyText]         = useState('');
  const [menuAnchor, setMenuAnchor]       = useState(null);
  const [menuPost, setMenuPost]           = useState(null);

  const [postDraft, setPostDraft] = useState({ type: 'news', title: '', content: '' });
  const [mediaFile,          setMediaFile]          = useState(null);
  const [mediaPreview,       setMediaPreview]       = useState(null);
  const [mediaUploading,     setMediaUploading]     = useState(false);
  const fileInputRef = useRef(null);
  const [editMediaFile,      setEditMediaFile]      = useState(null);
  const [editMediaPreview,   setEditMediaPreview]   = useState(null);
 
  const [editMediaType,      setEditMediaType]      = useState(null);
  const [editMediaUploading, setEditMediaUploading] = useState(false);
  const editFileInputRef = useRef(null);

  /* ---- derived ---- */
  const stats = useMemo(() => ({
    totalPosts:       posts.length,
    publishedPosts:   posts.filter(p => p.status === 'Published').length,
    draftPosts:       posts.filter(p => p.status === 'Draft').length,
    totalLikes:       posts.reduce((a, p) => a + p.likes, 0),
    totalViews:       posts.reduce((a, p) => a + (p.views || 0), 0),
    totalComments:    comments.length,
    flaggedComments:  comments.filter(c => c.flagged).length,
    unrepliedComments: comments.filter(c => !c.replied).length,
  }), [posts, comments]);

  const filteredPosts = useMemo(() => {
    return posts.filter(p => {
      const q = search.toLowerCase();
      const matchSearch = !q ||
        p.title.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q);
      const matchStatus = feedFilter !== 'drafts' || p.status === 'Draft';
      return matchSearch && matchStatus;
    });
  }, [posts, search, feedFilter]);

  /* 🔧 PAGINATION — derived page slice (JobPostings pattern). */
  const effectivePageSize = pageSize === 'all' ? Math.max(filteredPosts.length, 1) : pageSize;
  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / effectivePageSize));

  useEffect(() => { if (page > totalPages) setPage(1); }, [totalPages, page]);
  useEffect(() => { setPage(1); }, [search, feedFilter, pageSize]);

  const paginatedPosts = useMemo(() => {
    const start = (page - 1) * effectivePageSize;
    return filteredPosts.slice(start, start + effectivePageSize);
  }, [filteredPosts, page, effectivePageSize]);

  const handlePageChange = (_e, value) => setPage(value);

  /* 🔧 COMMENT PAGINATION — derived slice for Comments tab. */
  const effectiveCmtPageSize = cmtPageSize === 'all' ? Math.max(comments.length, 1) : cmtPageSize;
  const totalCmtPages = Math.max(1, Math.ceil(comments.length / effectiveCmtPageSize));

  useEffect(() => { if (cmtPage > totalCmtPages) setCmtPage(1); }, [totalCmtPages, cmtPage]);
  useEffect(() => { setCmtPage(1); }, [cmtPageSize]);

  const paginatedComments = useMemo(() => {
    const start = (cmtPage - 1) * effectiveCmtPageSize;
    return comments.slice(start, start + effectiveCmtPageSize);
  }, [comments, cmtPage, effectiveCmtPageSize]);

  const handleCmtPageChange = (_e, value) => setCmtPage(value);

  const fmtCompact = (n) => {
    const v = Number(n) || 0;
    if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000)    return `${(v / 1000).toFixed(1)}k`;
    return v.toLocaleString();
  };

  /* ---- handlers (behavior preserved from previous version) ---- */

  const getMediaType = (file) =>
    !file ? null : file.type.startsWith('video/') ? 'video'
    : file.type === 'application/pdf' ? 'document' : 'image';

  const uploadMedia = async (file) => {
    const form = new FormData();
    form.append('file', file);
    const res = await axiosInstance.post('/companies/posts/upload-image', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    return { url: res.data?.image_url || null, media_type: res.data?.media_type || getMediaType(file) };
  };

  const handleMediaSelect = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const ok = ['image/', 'video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo', 'application/pdf'];
    if (!ok.some(t => file.type.startsWith(t) || file.type === t)) { enqueueSnackbar('Unsupported file type', { variant: 'warning' }); return; }
    if (file.size > 100 * 1024 * 1024) { enqueueSnackbar('File must be under 100 MB', { variant: 'warning' }); return; }
    setMediaFile(file);
    setMediaPreview(file.type.startsWith('image/') ? URL.createObjectURL(file) : file.name);
  };

  const handleMediaClear = () => {
    setMediaFile(null); setMediaPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleEditMediaSelect = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const ok = ['image/', 'video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo', 'application/pdf'];
    if (!ok.some(t => file.type.startsWith(t) || file.type === t)) { enqueueSnackbar('Unsupported file type', { variant: 'warning' }); return; }
    if (file.size > 100 * 1024 * 1024) { enqueueSnackbar('File must be under 100 MB', { variant: 'warning' }); return; }
    setEditMediaFile(file);
    setEditMediaType(getMediaType(file));
    /* Object URL works for image AND video previews; PDFs show a chip. */
    setEditMediaPreview(file.type === 'application/pdf' ? file.name : URL.createObjectURL(file));
  };

  const handleEditMediaClear = () => {
    setEditMediaFile(null); setEditMediaPreview(null); setEditMediaType(null);
    if (editFileInputRef.current) editFileInputRef.current.value = '';
  };

  const handleOpenEdit = (post) => {
    setEditDraft({ type: post.type || 'news', title: post.title || '', content: post.content || '' });
    setEditMediaFile(null);
    setEditMediaPreview(post.image_url || null);
    /* 🔧 carry the existing attachment's type so the preview renders
       through the correct branch (video → <video>, document → chip). */
    setEditMediaType(post.image_url ? (post.media_type || 'image') : null);
    setEditPost(post); setMenuAnchor(null);
  };

  const handleSaveEdit = async (publish = false) => {
    if (!editDraft.title.trim() || !editDraft.content.trim()) {
      enqueueSnackbar('Title and content are required', { variant: 'warning' }); return;
    }
    try {
      let image_url = editPost.image_url || null;
      let media_type = editPost.media_type || null;
      if (editMediaFile) {
        setEditMediaUploading(true);
        try { const up = await uploadMedia(editMediaFile); image_url = up.url; media_type = up.media_type; }
        catch { enqueueSnackbar('Media upload failed — existing kept', { variant: 'warning' }); }
        finally { setEditMediaUploading(false); }
      } else if (!editMediaPreview) { image_url = null; media_type = null; }
      const payload = { post_type: editDraft.type.toUpperCase(), title: editDraft.title, content: editDraft.content, image_url, media_type };
      if (publish) payload.is_published = true;
      await apiUpdatePost(editPost.id, payload);
      setEditPost(null);
      enqueueSnackbar(publish ? 'Post published successfully' : 'Post updated', { variant: 'success' });
    } catch (err) { enqueueSnackbar(err?.response?.data?.Error || 'Failed to update post.', { variant: 'error' }); }
  };

  const handleQuickPublish = async (post) => {
    try {
      await apiUpdatePost(post.id, {
        post_type: String(post.type || 'news').toUpperCase(),
        title: post.title, content: post.content,
        image_url: post.image_url || null, media_type: post.media_type || null,
        is_published: true,
      });
      enqueueSnackbar('Post published to the portal', { variant: 'success' });
    } catch (err) { enqueueSnackbar(err?.response?.data?.Error || 'Failed to publish post.', { variant: 'error' }); }
  };

  const handleCreatePost = async (publish = true) => {
    if (!postDraft.title.trim() || !postDraft.content.trim()) {
      enqueueSnackbar('Title and content are required', { variant: 'warning' });
      return;
    }
    try {
      let image_url = null; let media_type = null;
      if (mediaFile) {
        setMediaUploading(true);
        try { const up = await uploadMedia(mediaFile); image_url = up.url; media_type = up.media_type; }
        catch { enqueueSnackbar('Media upload failed — post will be created without attachment', { variant: 'warning' }); }
        finally { setMediaUploading(false); }
      }
      await apiCreatePost({ ...postDraft, is_published: publish, image_url, media_type });
      setPostDraft({ type: 'news', title: '', content: '' });
      handleMediaClear(); setNewPost(false);
      enqueueSnackbar(publish ? 'Post published to the portal' : 'Saved as draft', { variant: 'success' });
    } catch (err) { enqueueSnackbar(err?.response?.data?.Error || 'Failed to create post.', { variant: 'error' }); }
  };

  const handleDeletePost = async (id) => {
    try {
      await apiDeletePost(id);
      enqueueSnackbar('Post deleted', { variant: 'info' });
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.Error || 'Failed to delete post.', { variant: 'error' });
    }
    setMenuAnchor(null);
  };

  const handleReply = async () => {
    if (!replyText.trim()) return;
    try {
      await apiReplyToComment(replyDialog.postId, replyDialog.id, replyText);
      enqueueSnackbar(`Reply sent to ${replyDialog.author}`, { variant: 'success' });
      setReplyDialog(null);
      setReplyText('');
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.Error || 'Failed to send reply.', { variant: 'error' });
    }
  };

  const handleInlineReply = async (comment) => {
    const txt = inlineReplyText.trim();
    if (!txt) return;
    setInlineReplySending(true);
    try {
      await apiReplyToComment(comment.postId, comment.id, txt);
      enqueueSnackbar(`Reply sent to ${comment.author}`, { variant: 'success' });
      setInlineReplyId(null);
      setInlineReplyText('');
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.Error || 'Failed to send reply.', { variant: 'error' });
    } finally {
      setInlineReplySending(false);
    }
  };

  const handleRepost = async (post) => {
    try {
      await apiRepostPost(post.id, { repost_type: 'POSITIVE' });
      enqueueSnackbar('Post reposted', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.Error || 'Failed to repost.', { variant: 'error' });
    }
  };

  const navigateToPost = (postId) => {
    // Find the index of this post in filteredPosts
    const idx = filteredPosts.findIndex(p => p.id === postId);
    if (idx === -1) {
      // Post might be filtered out — reset filters and try again
      setFeedFilter('all');
      setSearch('');
    }
    // Compute which page this post falls on
    const targetIdx = idx >= 0 ? idx : posts.findIndex(p => p.id === postId);
    if (targetIdx >= 0) {
      const targetPage = Math.floor(targetIdx / effectivePageSize) + 1;
      setPage(targetPage);
    }
    setExpandedPostId(postId);
    setTab(0);
  };

  const selfPhotoCache = (typeof localStorage !== 'undefined' && localStorage.getItem('user_profile_image_url')) || '';
  const resolveCommentPhoto = (c) => {
    // 1. Hook-normalized photo field (checks multiple backend names)
    if (c?.photo) return c.photo;
    // 2. Raw backend fields (fallback if normalization missed one)
    const raw = c?._raw || {};
    if (raw.commenter_photo_url) return raw.commenter_photo_url;
    if (raw.photo_url)           return raw.photo_url;
    if (raw.employer_photo)      return raw.employer_photo;
    if (raw.profile_image)       return raw.profile_image;
    if (raw.profile_image_url)   return raw.profile_image_url;
    if (raw.avatar_url)          return raw.avatar_url;
    // 3. Admin self-detection — company-admin's own comments
    const cid = String(raw.commenter_id ?? '');
    if (cid && companyId != null && cid === String(companyId)) {
      return profile.adminPhotoUrl || selfPhotoCache || profile.logoUrl || undefined;
    }
    return undefined;
  };

  const openLikers = async (p) => {
    setLikersDialog(p); setLikersList([]); setLikersLoading(true);
    try {
      const res = await companyPostsService.listLikers(p.id);
      setLikersList(res.data?.likers || []);
    } catch (err) {
      console.error('[listLikers] failed:', err);
      enqueueSnackbar('Failed to load likers.', { variant: 'error' });
    } finally { setLikersLoading(false); }
  };

  const openViewers = async (p) => {
    setViewersDialog(p); setViewersList([]); setViewersLoading(true);
    try {
      const res = await companyPostsService.listViewers(p.id);
      setViewersList(res.data?.Viewers || []);
    } catch {
      enqueueSnackbar('Failed to load viewers.', { variant: 'error' });
    } finally { setViewersLoading(false); }
  };

  /* Feed action-bar button (Like / Comment / Repost / Viewers). */
  const FeedAction = ({ icon, label, onClick, active }) => (
    <Box
      onClick={onClick}
      sx={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 0.75, py: { xs: 1, sm: 1.25 }, cursor: 'pointer',
        color: active ? B.sageDeep : B.muted,
        bgcolor: active ? B.sageWash : 'transparent',
        fontFamily: FONT, fontWeight: 600,
        fontSize: { xs: '0.7rem', sm: '0.78rem' },
        transition: 'background-color 140ms ease, color 140ms ease',
        '&:hover': { bgcolor: B.sageWash, color: B.sageDeep },
      }}
    >
      {icon}{label}
    </Box>
  );

  const commentsFor = (postId) => comments.filter(c => c.postId === postId && !c.parentId);

  /* Left-rail / mobile filter definitions. */
  const FILTERS = [
    { key: 'all',    label: 'All posts',  icon: '◎' },
    { key: 'news',   label: 'News',       icon: '📰' },
    { key: 'update', label: 'Updates',    icon: '⚠' },
    { key: 'event',  label: 'Events',     icon: '🎉' },
    { key: 'announcement', label: 'Announcements', icon: '📣' },
    { key: 'drafts', label: `Drafts${stats.draftPosts ? ` (${stats.draftPosts})` : ''}`, icon: '✎' },
  ];

  /* Rule-nav tab definition (Demo 1). */
  const TABS = [
    { label: 'Feed',                 count: stats.publishedPosts },
    { label: 'Comments',  count: stats.totalComments  },
    { label: 'About',                count: null                 },
  ];

  /* ---------------------------------------------------------------- */
  return (

    <Box className="page-fade-in" sx={{
      bgcolor: B.bg, minHeight: '100%', width: '100%',
      fontFamily: FONT,
      p: { xs: 1, sm: 1.5, md: 2, lg: 2.5 },
    }}>

      {/* ═══════════════ MASTHEAD (Demo 1) ═══════════════ */}
      {profileError && !profileData && (
        <Panel sx={{ mb: 2, p: 2, borderColor: '#E5C1B6', bgcolor: B.errorSoft }}>
          <Typography variant="body2" sx={{ color: B.error, fontWeight: 600, fontFamily: FONT, fontSize: { xs: '0.75rem', sm: '0.85rem' } }}>
            Couldn't load company details: {profileError}
          </Typography>
        </Panel>
      )}

      {profileLoading && !profileData ? (
        <Panel sx={{ mb: 2, p: { xs: 2, sm: 3 } }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Skeleton variant="rounded" width={isMobile ? 64 : 96} height={isMobile ? 64 : 96} sx={{ borderRadius: '18px' }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Skeleton variant="text" width="45%" height={34} />
              <Skeleton variant="text" width="65%" />
            </Box>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 1.5, mt: 2 }}>
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} variant="rounded" height={62} sx={{ borderRadius: '12px' }} />)}
          </Box>
        </Panel>
      ) : (
      <Box sx={{
        bgcolor: B.navy, borderRadius: { xs: '18px', sm: '24px' },
        mb: { xs: 1.5, sm: 2 }, position: 'relative', overflow: 'hidden',
        color: '#fff',
      }}>
        {/* sage glow accents */}
        <Box sx={{
          position: 'absolute', right: -120, top: -120, width: 420, height: 420,
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(127,158,126,0.22), transparent 70%)',
          pointerEvents: 'none',
        }} />
        <Box sx={{
          position: 'absolute', left: -80, bottom: -140, width: 340, height: 340,
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(10,63,66,0.9), transparent 70%)',
          pointerEvents: 'none',
        }} />

        <Box sx={{ position: 'relative', zIndex: 1, px: { xs: 2, sm: 3, md: 4 }, pt: { xs: 2.5, sm: 3.5 } }}>
          <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'flex-end' }, gap: { xs: 1.75, sm: 2.5 }, flexWrap: 'wrap' }}>
            <Avatar src={profile.logoUrl || undefined} sx={{
              width:  { xs: 66, sm: 84, md: 96 },
              height: { xs: 66, sm: 84, md: 96 },
              borderRadius: { xs: '14px', sm: '18px' },
              bgcolor: '#fff', color: B.sageDeep,
              fontSize: { xs: 24, sm: 30, md: 34 }, fontWeight: 700, fontFamily: FONT,
              border: '3px solid rgba(127,158,126,0.5)',
              boxShadow: '0 12px 30px rgba(0,0,0,0.35)',
              flex: 'none',
            }}>
              {profile.logo}
            </Avatar>

            <Box sx={{ flex: 1, minWidth: 220 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
                <Typography sx={{
                  fontFamily: SERIF, fontWeight: 400, color: '#fff',
                  fontSize: { xs: '1.35rem', sm: '1.8rem', md: '2.2rem' },
                  lineHeight: 1.1, letterSpacing: '0.2px',
                  '@media (max-width: 320px)': { fontSize: '1.15rem' },
                }}>
                  {profile.name}
                </Typography>
                {profile.verified && (
                  <Tooltip title="Verified company">
                    <Box component="span" sx={{
                      display: 'inline-flex', alignItems: 'center', gap: 0.5,
                      fontSize: { xs: '0.62rem', sm: '0.7rem' }, fontWeight: 600, fontFamily: FONT,
                      bgcolor: 'rgba(127,158,126,0.18)', color: '#BCD4BB',
                      border: '1px solid rgba(127,158,126,0.4)',
                      px: 1.25, py: 0.35, borderRadius: '999px',
                    }}>
                      <VerifiedIcon sx={{ fontSize: { xs: 13, sm: 15 } }} /> Verified
                    </Box>
                  </Tooltip>
                )}
              </Box>
              <Typography sx={{ color: '#AEC3AE', mt: 0.5, fontFamily: FONT, fontSize: { xs: '0.78rem', sm: '0.92rem' } }}>
                {profile.tagline}
              </Typography>
              <Stack direction="row" sx={{ mt: 1.25, flexWrap: 'wrap', columnGap: { xs: 1.5, sm: 2.75 }, rowGap: 0.75 }}>
                {[
                  { icon: <WebsiteIcon  sx={{ fontSize: { xs: 13, sm: 15 } }} />, value: profile.website, isLink: true },
                  { icon: <LocationIcon sx={{ fontSize: { xs: 13, sm: 15 } }} />, value: profile.location },
                  { icon: <PeopleIcon   sx={{ fontSize: { xs: 13, sm: 15 } }} />, value: profile.size     },
                  { icon: null, value: profile.founded !== '—' ? `Est. ${profile.founded}` : '—' },
                ].map((m, i) => {
                  const isClickable = m.isLink && m.value && m.value !== '—';
                  const href = isClickable
                    ? (m.value.startsWith('http') ? m.value : `https://${m.value}`)
                    : null;
                  return (
                    <Box
                      key={i}
                      component={isClickable ? 'a' : 'div'}
                      href={href}
                      target={isClickable ? '_blank' : undefined}
                      rel={isClickable ? 'noopener noreferrer' : undefined}
                      sx={{
                        display: 'flex', alignItems: 'center', gap: 0.6, color: '#8FA6A4',
                        textDecoration: 'none',
                        ...(isClickable && {
                          cursor: 'pointer',
                          '&:hover': { '& .meta-val': { color: '#fff', textDecoration: 'underline' } },
                        }),
                      }}
                    >
                      {m.icon}
                      <Typography className="meta-val" sx={{
                        fontFamily: FONT, fontSize: { xs: '0.66rem', sm: '0.76rem' },
                        color: '#D8E4D8', fontWeight: 500,
                        transition: 'color .15s ease',
                      }}>
                        {m.value}
                      </Typography>
                    </Box>
                  );
                })}
              </Stack>
            </Box>

            <Button
              onClick={() => setNewPost(true)}
              startIcon={<AddIcon />}
              sx={{
                alignSelf: { xs: 'stretch', sm: 'center' },
                bgcolor: '#fff', color: B.navy, fontFamily: FONT,
                textTransform: 'none', fontWeight: 700, borderRadius: '12px',
                px: { xs: 2, sm: 2.75 }, py: { xs: 1, sm: 1.25 },
                fontSize: { xs: '0.8rem', sm: '0.9rem' },
                boxShadow: '0 10px 24px rgba(0,0,0,0.3)',
                transition: 'transform .15s ease, box-shadow .15s ease',
                '&:hover': { bgcolor: '#F2F6F0', transform: 'translateY(-2px)', boxShadow: '0 14px 30px rgba(0,0,0,0.35)' },
              }}
            >
              Create Post
            </Button>
          </Box>

          {/* Stat ribbon carved into the masthead bottom */}
          <Box sx={{
            mt: { xs: 2.5, sm: 3.5 }, mx: { xs: -2, sm: -3, md: -4 },
            display: 'grid',
            gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
            borderTop: '1px solid rgba(255,255,255,0.12)',
          }}>
            {[
              { k: 'Published',   v: stats.publishedPosts,             sub: stats.draftPosts ? `${stats.draftPosts} drafts` : null },
              { k: 'Total Likes', v: fmtCompact(stats.totalLikes),     sub: null },
              { k: 'Comments',    v: stats.totalComments,              sub: stats.unrepliedComments ? `${stats.unrepliedComments} unreplied` : null },
              { k: 'Post Views',  v: fmtCompact(stats.totalViews),     sub: null },
            ].map((s, i) => (
              <Box key={s.k} sx={{
                px: { xs: 2, sm: 3, md: 4 }, py: { xs: 1.5, sm: 2 },
                borderRight: { md: i < 3 ? '1px solid rgba(255,255,255,0.12)' : 'none' },
                borderBottom: { xs: i < 2 ? '1px solid rgba(255,255,255,0.12)' : 'none', md: 'none' },
              }}>
                <Typography sx={{ fontFamily: FONT, fontSize: { xs: '0.58rem', sm: '0.64rem' }, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#7E9896', fontWeight: 600 }}>
                  {s.k}
                </Typography>
                <Typography sx={{ fontFamily: SERIF, fontSize: { xs: '1.2rem', sm: '1.5rem' }, color: '#fff', mt: 0.25, lineHeight: 1.15 }}>
                  {s.v}
                  {s.sub && (
                    <Box component="span" sx={{ fontFamily: FONT, fontSize: { xs: '0.6rem', sm: '0.68rem' }, color: s.k === 'Comments' ? '#E8C4A0' : '#8FA6A4', ml: 1, fontWeight: 500 }}>
                      {s.sub}
                    </Box>
                  )}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
      )}

      {/* ═══════════════ RULE-NAV TABS (Demo 1) ═══════════════ */}
      <Box sx={{
        display: 'flex', gap: { xs: 2.5, sm: 4 },
        borderBottom: `2px solid ${B.borderStrong}`,
        px: { xs: 0.5, sm: 1 }, mb: { xs: 1.75, sm: 2.5 },
        overflowX: 'auto',
        '&::-webkit-scrollbar': { display: 'none' },
      }}>
        {TABS.map((t, i) => (
          <Box
            key={t.label}
            onClick={() => setTab(i)}
            sx={{
              fontFamily: FONT, fontSize: { xs: '0.78rem', sm: '0.88rem' }, fontWeight: 600,
              color: tab === i ? B.navy : B.faint,
              py: { xs: 1.25, sm: 1.6 }, px: 0.25, cursor: 'pointer',
              borderBottom: '3px solid', borderColor: tab === i ? B.sageText : 'transparent',
              mb: '-2px', whiteSpace: 'nowrap',
              transition: 'color .15s ease',
              '&:hover': { color: B.sageDeep },
            }}
          >
            {t.label}
            {t.count != null && (
              <Box component="sup" sx={{ fontSize: '0.62rem', color: B.sageText, fontWeight: 700, ml: 0.5 }}>
                {t.count}
              </Box>
            )}
          </Box>
        ))}
      </Box>

      {/* Posts loading / error */}
      {postsLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <Typography variant="body2" sx={{ color: B.faint, fontFamily: FONT, fontSize: { xs: '0.75rem', sm: '0.85rem' } }}>Loading posts…</Typography>
        </Box>
      )}
      {postsError && (
        <Box sx={{ mb: 2, px: 2, py: 1.5, bgcolor: B.errorSoft, border: '1px solid #E5C1B6', borderRadius: '12px' }}>
          <Typography variant="body2" sx={{ color: B.error, fontWeight: 600, fontFamily: FONT, fontSize: { xs: '0.75rem', sm: '0.85rem' } }}>{postsError}</Typography>
        </Box>
      )}

      {/* ═══════════════ TAB 0 — FEED (Demo 5 canvas) ═══════════════ */}
      {tab === 0 && (
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '218px minmax(0, 1fr) 280px' },
          gap: { xs: 1.5, sm: 2, lg: 2.5 },
          maxWidth: 1240, mx: 'auto',
        }}>

          {isLgUp && (
            <Box>{/* grid item — stretches full height */}
              <Box sx={{ position: 'sticky', top: 0, pt: 0.5 }}>
                <Panel sx={{ p: 1.25 }}>
                <Typography sx={{ fontFamily: FONT, fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.14em', color: B.faint, fontWeight: 700, px: 1, pt: 0.5, pb: 1 }}>
                  Filter feed
                </Typography>
                <Stack spacing={0.25}>
                  {FILTERS.map(f => (
                    <Box key={f.key}
                      onClick={() => setFeedFilter(f.key)}
                      sx={{
                        display: 'flex', alignItems: 'center', gap: 1,
                        fontFamily: FONT, fontSize: '0.8rem', fontWeight: 600,
                        color: feedFilter === f.key ? B.sageDeep : B.muted,
                        bgcolor: feedFilter === f.key ? B.sageSoft : 'transparent',
                        px: 1.25, py: 1, borderRadius: '10px', cursor: 'pointer',
                        transition: 'background-color .15s ease',
                        '&:hover': { bgcolor: feedFilter === f.key ? B.sageSoft : B.bg },
                      }}>
                      <Box component="span" sx={{ fontSize: '0.8rem', width: 18, textAlign: 'center' }}>{f.icon}</Box>
                      {f.label}
                    </Box>
                  ))}
                </Stack>
                <Divider sx={{ my: 1.25, borderColor: B.border }} />
                <TextField
                  size="small" fullWidth placeholder="Search posts…"
                  value={search} onChange={(e) => setSearch(e.target.value)}
                  sx={{ ...inputSx, '& .MuiInputBase-root': { fontSize: '0.78rem' } }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" sx={{ color: B.faint }} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Panel>
              </Box>
            </Box>
          )}

          {/* ── Center feed ── */}
          <Box sx={{ minWidth: 0 }}>

            {/* Mobile/tablet filter chips + search */}
            {!isLgUp && (
              <Box sx={{ mb: 1.5 }}>
                <Box sx={{ display: 'flex', gap: 0.75, overflowX: 'auto', pb: 0.75, '&::-webkit-scrollbar': { display: 'none' } }}>
                  {FILTERS.map(f => (
                    <Box key={f.key}
                      onClick={() => setFeedFilter(f.key)}
                      sx={{
                        fontFamily: FONT, fontSize: '0.72rem', fontWeight: 600, whiteSpace: 'nowrap',
                        color: feedFilter === f.key ? '#fff' : B.muted,
                        bgcolor: feedFilter === f.key ? B.sageText : B.surface,
                        border: `1px solid ${feedFilter === f.key ? B.sageText : B.border}`,
                        px: 1.5, py: 0.7, borderRadius: '999px', cursor: 'pointer', flex: 'none',
                      }}>
                      {f.label}
                    </Box>
                  ))}
                </Box>
                <TextField
                  size="small" fullWidth placeholder="Search posts…"
                  value={search} onChange={(e) => setSearch(e.target.value)}
                  sx={{ ...inputSx, mt: 0.75, '& .MuiInputBase-root': { fontSize: '0.78rem' } }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" sx={{ color: B.faint }} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
            )}

            {/* Composer card — opens the Create dialog (type pre-selected). */}
            <Panel sx={{ p: { xs: 1.5, sm: 2 }, mb: { xs: 1.5, sm: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar src={profile.logoUrl || undefined} sx={{
                  width: { xs: 36, sm: 42 }, height: { xs: 36, sm: 42 },
                  borderRadius: '12px', bgcolor: B.navy, color: '#fff',
                  fontWeight: 700, fontSize: { xs: 13, sm: 15 }, fontFamily: FONT, flex: 'none',
                }}>{profile.logo}</Avatar>
                <Box
                  onClick={() => setNewPost(true)}
                  sx={{
                    flex: 1, border: `1px solid ${B.border}`, borderRadius: '999px',
                    px: 2, py: { xs: 1, sm: 1.25 }, color: B.faint, fontFamily: FONT,
                    fontSize: { xs: '0.78rem', sm: '0.86rem' }, cursor: 'text',
                    transition: 'border-color .15s ease',
                    '&:hover': { borderColor: B.sage },
                  }}>
                  Share something with your audience…
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 0.5, mt: 1.5, pt: 1.25, borderTop: `1px solid ${B.border}` }}>
                {[
                  { t: 'news',   label: 'News',   icon: <NewsIcon   sx={{ fontSize: 16 }} /> },
                  { t: 'update', label: 'Update', icon: <UpdateIcon sx={{ fontSize: 16 }} /> },
                  { t: 'event',  label: 'Event',  icon: <EventIcon  sx={{ fontSize: 16 }} /> },
                  { t: 'announcement', label: 'Announce', icon: <AnnouncementIcon sx={{ fontSize: 16 }} /> },
                ].map((k, i) => (
                  <Box key={i}
                    onClick={() => { setPostDraft(d => ({ ...d, type: k.t })); setNewPost(true); }}
                    sx={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.75,
                      fontFamily: FONT, fontSize: { xs: '0.68rem', sm: '0.76rem' }, fontWeight: 600,
                      color: B.muted, py: 1, borderRadius: '10px', cursor: 'pointer',
                      transition: 'background-color .15s ease, color .15s ease',
                      '&:hover': { bgcolor: B.sageWash, color: B.sageDeep },
                    }}>
                    {k.icon}{k.label}
                  </Box>
                ))}
              </Box>
            </Panel>

            {/* Feed cards */}
            {filteredPosts.length === 0 && !postsLoading ? (
              <Panel sx={{ py: { xs: 4, sm: 6 }, textAlign: 'center' }}>
                <Typography sx={{ color: B.faint, fontFamily: FONT, fontSize: { xs: '0.78rem', sm: '0.85rem' } }}>
                  No posts match your filters.
                </Typography>
              </Panel>
            ) : (
              paginatedPosts.map(p => {
                const cfg = postTypeConfig[p.type] || postTypeConfig.news;
                const isDraft = p.status === 'Draft';
                const postComments = commentsFor(p.id);
                return (
                  <Panel key={p.id} sx={{
                    mb: { xs: 1.5, sm: 2 }, overflow: 'hidden',
                    '&:hover': { boxShadow: '0 12px 30px rgba(2,33,36,0.07)' },
                  }}>
                    {/* Card header */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: { xs: 1.5, sm: 2.25 }, pt: { xs: 1.5, sm: 2 } }}>
                      <Avatar src={profile.logoUrl || undefined} sx={{
                        width: { xs: 38, sm: 44 }, height: { xs: 38, sm: 44 },
                        borderRadius: '14px', bgcolor: B.navy, color: '#fff',
                        fontWeight: 700, fontSize: { xs: 13, sm: 15 }, fontFamily: FONT, flex: 'none',
                      }}>{p.authorAvatar || profile.logo}</Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                          <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: { xs: '0.82rem', sm: '0.9rem' }, color: B.ink }}>
                            {profile.name || p.author}
                          </Typography>
                          {profile.verified && <VerifiedIcon sx={{ color: B.sageText, fontSize: { xs: 14, sm: 15 } }} />}
                          {isDraft && (
                            <Box component="span" sx={{
                              fontFamily: FONT, fontSize: '0.6rem', fontWeight: 700, color: B.amber,
                              border: `1px dashed ${B.amber}`, px: 1, py: 0.15, borderRadius: '999px',
                            }}>Draft</Box>
                          )}
                        </Box>
                        <Typography sx={{ fontFamily: FONT, fontSize: { xs: '0.64rem', sm: '0.72rem' }, color: B.faint }}>
                          {p.postedAt}{isDraft ? ' · not published' : ' · Public'}
                        </Typography>
                      </Box>
                      <Box component="span" sx={{
                        fontFamily: FONT, fontSize: { xs: '0.56rem', sm: '0.6rem' }, fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '0.12em',
                        bgcolor: cfg.bg, color: cfg.color,
                        px: 1.25, py: 0.5, borderRadius: '999px', flex: 'none',
                      }}>{cfg.short}</Box>
                      <IconButton size="small" onClick={(e) => { setMenuAnchor(e.currentTarget); setMenuPost(p); }} sx={{ color: B.faint, ml: 0.25 }}>
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </Box>

                    {/* Title + content */}
                    <Typography sx={{
                      fontFamily: SERIF, fontWeight: 400, color: B.ink,
                      fontSize: { xs: '1.05rem', sm: '1.22rem' }, lineHeight: 1.3,
                      px: { xs: 1.5, sm: 2.25 }, pt: { xs: 1.25, sm: 1.5 },
                    }}>{p.title}</Typography>
                    <Typography sx={{
                      fontFamily: FONT, color: B.muted, lineHeight: 1.6,
                      fontSize: { xs: '0.78rem', sm: '0.86rem' },
                      px: { xs: 1.5, sm: 2.25 }, pt: 0.75,
                      whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    }}>{p.content}</Typography>

                    {/* Media — full-bleed inside card */}
                    {p.image_url && (
                      p.media_type === 'video' ? (
                        <Box sx={{ position: 'relative', mt: 1.75, borderTop: `1px solid ${B.border}`, borderBottom: `1px solid ${B.border}`, bgcolor: '#000' }}>
                          <Box component="video" src={p.image_url} controls preload="metadata"
                            sx={{ width: '100%', maxHeight: { xs: 220, sm: 300 }, display: 'block', outline: 'none' }} />
                          <IconButton size="small"
                            onClick={() => setPreview({ url: p.image_url, media_type: 'video', title: p.title })}
                            title="Expand"
                            sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'rgba(0,0,0,0.55)', color: '#fff', '&:hover': { bgcolor: 'rgba(0,0,0,0.75)' } }}>
                            <Box sx={{ fontSize: '0.9rem', lineHeight: 1, fontWeight: 700 }}>⛶</Box>
                          </IconButton>
                        </Box>
                      ) : p.media_type === 'document' ? (
                        <Box onClick={() => setPreview({ url: p.image_url, media_type: 'document', title: p.title })}
                          sx={{
                            display: 'flex', alignItems: 'center', gap: 1, mt: 1.75, mx: { xs: 1.5, sm: 2.25 },
                            p: { xs: 1.25, sm: 1.5 }, borderRadius: '12px',
                            border: `1px solid ${B.border}`, bgcolor: B.sageWash,
                            color: B.sageDeep, cursor: 'pointer', fontWeight: 600, fontFamily: FONT,
                            fontSize: { xs: '0.74rem', sm: '0.82rem' },
                            '&:hover': { bgcolor: B.sageSoft },
                          }}>
                          📄 View PDF attachment
                        </Box>
                      ) : (
                        <Box component="img" src={p.image_url} alt={p.title}
                          onClick={() => setPreview({ url: p.image_url, media_type: 'image', title: p.title })}
                          sx={{
                            width: '100%', maxHeight: { xs: 220, sm: 300 }, objectFit: 'cover',
                            display: 'block', mt: 1.75, cursor: 'zoom-in',
                            borderTop: `1px solid ${B.border}`, borderBottom: `1px solid ${B.border}`,
                          }} />
                      )
                    )}

                    {/* Counts row */}
                    <Box sx={{
                      display: 'flex', alignItems: 'center', gap: 1,
                      px: { xs: 1.5, sm: 2.25 }, py: 1,
                      fontFamily: FONT, fontSize: { xs: '0.64rem', sm: '0.72rem' }, color: B.faint,
                      flexWrap: 'wrap',
                    }}>
                      {isDraft ? (
                        <Typography sx={{ fontFamily: FONT, fontSize: 'inherit', color: B.faint }}>
                          Visible only to you until published
                        </Typography>
                      ) : (
                        <>
                          <Box component="span"
                            onClick={() => openLikers(p)}
                            sx={{ cursor: 'pointer', '&:hover': { color: B.sageDeep, textDecoration: 'underline' } }}>
                            👍 {p.likes.toLocaleString()} · see who liked
                          </Box>
                          <Box sx={{ ml: 'auto' }}>
                            {p.comments} comments · {p.reposts} reposts · {p.views.toLocaleString()} views
                          </Box>
                        </>
                      )}
                    </Box>

                    {/* Action bar */}
                    <Box sx={{ display: 'flex', borderTop: `1px solid ${B.border}` }}>
                      {isDraft ? (
                        <>
                          <FeedAction icon={<EditIcon sx={{ fontSize: { xs: 15, sm: 17 } }} />} label="Edit" onClick={() => handleOpenEdit(p)} />
                          <FeedAction icon={<SendIcon sx={{ fontSize: { xs: 15, sm: 17 } }} />} label="Publish" onClick={() => handleQuickPublish(p)} active />
                          <FeedAction icon={<DeleteIcon sx={{ fontSize: { xs: 15, sm: 17 } }} />} label="Delete" onClick={() => handleDeletePost(p.id)} />
                        </>
                      ) : (
                        <>
                          <FeedAction icon={<ThumbUpIcon sx={{ fontSize: { xs: 15, sm: 17 } }} />} label={fmtCompact(p.likes)} onClick={() => openLikers(p)} />
                          <FeedAction
                            icon={<CommentIcon sx={{ fontSize: { xs: 15, sm: 17 } }} />}
                            label={`${p.comments}`}
                            active={expandedPostId === p.id}
                            onClick={() => setExpandedPostId(prev => prev === p.id ? null : p.id)}
                          />
                          <FeedAction icon={<RepostIcon sx={{ fontSize: { xs: 15, sm: 17 } }} />} label={`${p.reposts}`} onClick={() => handleRepost(p)} />
                          <FeedAction icon={<ViewersIcon sx={{ fontSize: { xs: 15, sm: 17 } }} />} label="Viewers" onClick={() => openViewers(p)} />
                        </>
                      )}
                    </Box>

                    {/* Comment drawer — bubble style (Demo 5) */}
                    {expandedPostId === p.id && !isDraft && (
                      <Box sx={{ bgcolor: B.sageWash, borderTop: `1px solid ${B.border}`, px: { xs: 1.5, sm: 2.25 }, py: { xs: 1.5, sm: 2 } }}>
                        <Typography sx={{ fontFamily: FONT, fontWeight: 700, color: B.ink, fontSize: { xs: '0.72rem', sm: '0.8rem' }, mb: 1.25 }}>
                          Comments ({postComments.length})
                        </Typography>
                        <Stack spacing={1.25} sx={{ maxHeight: 360, overflowY: 'auto', pr: 0.5 }}>
                          {postComments.length === 0 ? (
                            <Typography sx={{ fontFamily: FONT, color: B.faint, fontStyle: 'italic', fontSize: { xs: '0.7rem', sm: '0.76rem' } }}>
                              No comments yet.
                            </Typography>
                          ) : postComments.map(c => {
                            const cAvatarSrc = resolveCommentPhoto(c);
                            return (
                            <Box key={c.id}>
                              <Box sx={{ display: 'flex', gap: 1.25 }}>
                                <Avatar src={cAvatarSrc} sx={{
                                  width: 32, height: 32, flex: 'none',
                                  bgcolor: B.surface, color: B.sageDeep,
                                  border: `1px solid ${B.border}`,
                                  fontSize: 11, fontWeight: 700, fontFamily: FONT,
                                }}>{c.authorAvatar}</Avatar>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Box sx={{
                                    bgcolor: c.flagged ? B.errorSoft : B.surface,
                                    border: `1px solid ${c.flagged ? '#EAC9C2' : B.border}`,
                                    borderRadius: '4px 14px 14px 14px', px: 1.5, py: 1,
                                  }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                                      <Typography sx={{ fontFamily: FONT, fontWeight: 700, color: B.ink, fontSize: { xs: '0.7rem', sm: '0.76rem' } }}>{c.author}</Typography>
                                      {c.authorRole && <Typography sx={{ fontFamily: FONT, color: B.faint, fontSize: { xs: '0.58rem', sm: '0.64rem' } }}>· {c.authorRole}</Typography>}
                                      <Typography sx={{ fontFamily: FONT, color: B.faint, fontSize: { xs: '0.58rem', sm: '0.64rem' } }}>· {c.timestamp}</Typography>
                                      {c.replied && <StatusPill kind="ok">Replied</StatusPill>}
                                      {c.flagged && <StatusPill kind="warn">Hidden</StatusPill>}
                                    </Box>
                                    <Typography sx={{
                                      fontFamily: FONT, color: B.muted, mt: 0.35,
                                      fontSize: { xs: '0.74rem', sm: '0.8rem' },
                                      lineHeight: 1.5, wordBreak: 'break-word',
                                    }}>{c.content}</Typography>
                                  </Box>
                                  <Stack direction="row" spacing={1.5} sx={{ mt: 0.5, pl: 0.5 }}>
                                    <Typography
                                      onClick={() => {
                                        if (inlineReplyId === c.id) { setInlineReplyId(null); setInlineReplyText(''); }
                                        else { setInlineReplyId(c.id); setInlineReplyText(''); }
                                      }}
                                      sx={{ fontFamily: FONT, fontSize: '0.66rem', fontWeight: 700, color: B.sageDeep, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}>
                                      {inlineReplyId === c.id ? 'Cancel' : 'Reply'}
                                    </Typography>
                                  </Stack>

                                  {/* Nested admin replies — sage bubble, left rail */}
                                  {c.replies && c.replies.length > 0 && (
                                    <Stack spacing={0.75} sx={{ mt: 1, ml: { xs: 2, sm: 4 }, borderLeft: `3px solid ${B.sage}`, pl: 1.25 }}>
                                      {c.replies.map(reply => {
                                        const replyPhoto = resolveCommentPhoto(reply);
                                        return (
                                        <Box key={reply.id} sx={{ display: 'flex', gap: 1 }}>
                                          <Avatar src={replyPhoto} sx={{
                                            width: 24, height: 24, flex: 'none',
                                            bgcolor: B.navy, color: '#fff',
                                            fontSize: 9, fontWeight: 700, fontFamily: FONT,
                                          }}>{reply.authorAvatar}</Avatar>
                                          <Box sx={{
                                            bgcolor: B.sageSoft, border: '1px solid #D6E2D4',
                                            borderRadius: '4px 12px 12px 12px', px: 1.25, py: 0.85, minWidth: 0, flex: 1,
                                          }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                                              <Typography sx={{ fontFamily: FONT, fontWeight: 700, color: B.ink, fontSize: '0.68rem' }}>{reply.author}</Typography>
                                              {reply.authorRole && <Typography sx={{ fontFamily: FONT, color: B.sageDeep, fontSize: '0.6rem', fontWeight: 700 }}>· {reply.authorRole}</Typography>}
                                              <Typography sx={{ fontFamily: FONT, color: B.faint, fontSize: '0.6rem' }}>· {reply.timestamp}</Typography>
                                            </Box>
                                            <Typography sx={{ fontFamily: FONT, color: B.muted, fontSize: '0.72rem', mt: 0.2, lineHeight: 1.45, wordBreak: 'break-word' }}>{reply.content}</Typography>
                                          </Box>
                                        </Box>
                                        );
                                      })}
                                    </Stack>
                                  )}

                                  {/* Inline reply composer — Enter to send / Esc to cancel */}
                                  {inlineReplyId === c.id && (
                                    <Box sx={{ display: 'flex', gap: 1, mt: 1, alignItems: 'flex-start' }}>
                                      <TextField
                                        size="small" fullWidth autoFocus multiline maxRows={4}
                                        placeholder={`Reply to ${c.author}…`}
                                        value={inlineReplyText}
                                        onChange={(e) => setInlineReplyText(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleInlineReply(c);
                                          }
                                          if (e.key === 'Escape') {
                                            setInlineReplyId(null); setInlineReplyText('');
                                          }
                                        }}
                                        sx={{
                                          ...inputSx,
                                          '& .MuiOutlinedInput-root': {
                                            ...inputSx['& .MuiOutlinedInput-root'],
                                            borderRadius: '999px', bgcolor: B.surface,
                                          },
                                          '& .MuiInputBase-root': { fontSize: { xs: '0.72rem', sm: '0.78rem' } },
                                        }}
                                      />
                                      <IconButton size="small"
                                        disabled={!inlineReplyText.trim() || inlineReplySending}
                                        onClick={() => handleInlineReply(c)}
                                        sx={{
                                          bgcolor: B.sageText, color: '#fff', borderRadius: '999px',
                                          width: 36, height: 36, flex: 'none',
                                          '&:hover': { bgcolor: B.sageDeep },
                                          '&.Mui-disabled': { bgcolor: B.border, color: B.faint },
                                        }}>
                                        {inlineReplySending ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <SendIcon fontSize="small" />}
                                      </IconButton>
                                    </Box>
                                  )}
                                </Box>
                              </Box>
                            </Box>
                            );
                          })}
                        </Stack>
                      </Box>
                    )}
                  </Panel>
                );
              })
            )}

            {/* ═══ Pagination bar — JobPostings design-match ═══ */}
            {filteredPosts.length > 0 && (
              <Box sx={{
                mt: { xs: 2.5, sm: 3 }, display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'space-between',
                alignItems: { xs: 'stretch', sm: 'center' },
                gap: { xs: 1.5, sm: 2 },
              }}>
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 1, sm: 2 }, alignItems: { xs: 'flex-start', sm: 'center' }, flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontFamily: FONT, fontSize: { xs: '0.78rem', sm: '0.82rem' }, color: B.muted, fontWeight: 500, whiteSpace: 'nowrap' }}>
                    Showing{' '}
                    <Box component="span" sx={{ color: B.ink, fontWeight: 700 }}>
                      {(page - 1) * effectivePageSize + 1}–{Math.min(page * effectivePageSize, filteredPosts.length)}
                    </Box>
                    {' '}of{' '}
                    <Box component="span" sx={{ color: B.ink, fontWeight: 700 }}>{filteredPosts.length}</Box>
                    {' '}posts
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
                    <Typography sx={{ fontFamily: FONT, fontSize: { xs: '0.78rem', sm: '0.82rem' }, color: B.muted, fontWeight: 500 }}>Show</Typography>
                    <Select size="small" value={pageSize}
                      onChange={(e) => { const v = e.target.value; setPageSize(v === 'all' ? 'all' : Number(v)); }}
                      renderValue={(v) => (v === 'all' ? 'All' : v)}
                      MenuProps={{ slotProps: { paper: { sx: {
                        borderRadius: '12px', mt: 0.5, border: `1px solid ${B.border}`, boxShadow: '0 8px 24px rgba(2,33,36,0.12)',
                        '& .MuiMenuItem-root': { fontSize: '0.82rem', fontWeight: 600, fontFamily: FONT, color: B.ink, minHeight: { xs: 40, sm: 36 },
                          '&.Mui-selected': { bgcolor: B.sageSoft, color: B.navy, '&:hover': { bgcolor: B.sageSoft } },
                        },
                      } } } }}
                      sx={{
                        fontSize: '0.82rem', fontWeight: 700, fontFamily: FONT, color: B.navy,
                        bgcolor: B.bg, borderRadius: '10px', minWidth: { xs: 76, sm: 80 }, height: { xs: 38, sm: 36 },
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: B.border },
                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: B.navy },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: B.navy, borderWidth: '1px' },
                        '& .MuiSelect-select': { py: 0.75, pl: 1.25, pr: '28px !important' },
                        '& .MuiSvgIcon-root': { color: B.navy },
                      }}
                    >
                      {PAGE_SIZE_OPTIONS.map((opt) => (
                        <MenuItem key={opt} value={opt}>{opt === 'all' ? 'All' : opt}</MenuItem>
                      ))}
                    </Select>
                    <Typography sx={{ fontFamily: FONT, fontSize: { xs: '0.78rem', sm: '0.82rem' }, color: B.muted, fontWeight: 500 }}>per page</Typography>
                  </Box>
                </Box>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={handlePageChange}
                  shape="rounded"
                  siblingCount={1}
                  boundaryCount={1}
                  size="small"
                  sx={{
                    '& .MuiPaginationItem-root': {
                      fontSize: { xs: '0.75rem', sm: '0.82rem' }, fontWeight: 600, fontFamily: FONT, color: B.ink,
                      borderRadius: '8px', border: `1px solid ${B.border}`, bgcolor: B.bg,
                      minWidth: { xs: 32, sm: 36 }, height: { xs: 32, sm: 36 },
                      '&:hover': { bgcolor: B.sageSoft, borderColor: B.sage },
                      '&.Mui-selected': {
                        bgcolor: B.navy, color: '#fff', borderColor: B.navy, fontWeight: 700,
                        boxShadow: '0 4px 12px rgba(2,33,36,0.2)',
                        '&:hover': { bgcolor: B.navySoft },
                      },
                    },
                    '& .MuiPaginationItem-ellipsis': { border: 'none', bgcolor: 'transparent' },
                  }}
                />
              </Box>
            )}
          </Box>

          {/* ── Right rail: engagement pulse + profile strength ── */}
          {isLgUp && (
            <Box>{/* grid item — stretches full height */}
              <Box sx={{ position: 'sticky', top: 0, pt: 0.5 }}>
              <Panel sx={{ p: 2, mb: 2 }}>
                <Typography sx={{ fontFamily: FONT, fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.14em', color: B.faint, fontWeight: 700, mb: 1.25 }}>
                  Engagement pulse
                </Typography>
                {[
                  { k: 'Published posts', v: stats.publishedPosts },
                  { k: 'Total likes',     v: stats.totalLikes.toLocaleString() },
                  { k: 'Comments',        v: stats.totalComments },
                  { k: 'Post views',      v: fmtCompact(stats.totalViews) },
                ].map((r, i, arr) => (
                  <Box key={r.k} sx={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    py: 1, borderBottom: i < arr.length - 1 ? `1px dashed ${B.border}` : 'none',
                  }}>
                    <Typography sx={{ fontFamily: FONT, fontSize: '0.78rem', color: B.muted }}>{r.k}</Typography>
                    <Typography sx={{ fontFamily: FONT, fontSize: '0.82rem', fontWeight: 700, color: B.ink }}>{r.v}</Typography>
                  </Box>
                ))}
                {stats.unrepliedComments > 0 && (
                  <Box
                    onClick={() => setTab(1)}
                    sx={{
                      mt: 1.25, bgcolor: B.amberSoft, borderRadius: '11px',
                      px: 1.5, py: 1.15, cursor: 'pointer',
                      fontFamily: FONT, fontSize: '0.74rem', fontWeight: 600, color: B.amber,
                      transition: 'filter .15s ease',
                      '&:hover': { filter: 'brightness(0.97)' },
                    }}>
                    💬 {stats.unrepliedComments} comment{stats.unrepliedComments !== 1 ? 's' : ''} awaiting your reply →
                  </Box>
                )}
              </Panel>

           
              </Box>
            </Box>
          )}
        </Box>
      )}

      {/* ═══════════════ TAB 1 — COMMENTS ═══════════════ */}
      {tab === 1 && (
        <Box sx={{ maxWidth: 860, mx: 'auto' }}>
          <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            <Box component="span" sx={{
              display: 'inline-flex', alignItems: 'center', gap: 0.75,
              bgcolor: B.amberSoft, color: B.amber, fontFamily: FONT, fontWeight: 700,
              borderRadius: '999px', px: 1.5, height: { xs: 26, sm: 30 },
              fontSize: { xs: '0.66rem', sm: '0.74rem' },
            }}>
              <CommentIcon sx={{ fontSize: { xs: 13, sm: 15 } }} /> {stats.unrepliedComments} unreplied
            </Box>
            {stats.flaggedComments > 0 && (
              <Box component="span" sx={{
                display: 'inline-flex', alignItems: 'center',
                bgcolor: B.errorSoft, color: B.error, fontFamily: FONT, fontWeight: 700,
                borderRadius: '999px', px: 1.5, height: { xs: 26, sm: 30 },
                fontSize: { xs: '0.66rem', sm: '0.74rem' },
              }}>
                {stats.flaggedComments} hidden
              </Box>
            )}
            <Typography sx={{ fontFamily: FONT, fontSize: { xs: '0.68rem', sm: '0.76rem' }, color: B.faint, ml: 'auto' }}>
              {comments.length} total comment{comments.length !== 1 ? 's' : ''}
            </Typography>
          </Stack>

          <Stack spacing={{ xs: 1.25, sm: 1.5 }}>
            {comments.length === 0 && !postsLoading && (
              <Panel sx={{ py: 5, textAlign: 'center' }}>
                <Typography sx={{ color: B.faint, fontFamily: FONT, fontSize: '0.82rem' }}>No comments yet.</Typography>
              </Panel>
            )}
            {paginatedComments.map(c => {
              /* 🔧 AVATAR — unified resolver (handles admin self-comments). */
              const avatarSrc = resolveCommentPhoto(c);
              return (
                <Panel key={c.id} sx={{
                  borderColor: c.flagged ? '#EAC9C2' : B.border,
                  bgcolor: c.flagged ? B.errorSoft : B.surface,
                  transition: 'box-shadow .18s ease',
                  '&:hover': { boxShadow: '0 8px 24px rgba(2,33,36,0.06)' },
                }}>
                  <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
                    <Box sx={{ display: 'flex', gap: { xs: 1.25, sm: 1.75 } }}>
                      <Avatar src={avatarSrc} sx={{
                        width: { xs: 38, sm: 44 }, height: { xs: 38, sm: 44 }, flex: 'none',
                        bgcolor: B.sageSoft, color: B.sageDeep, border: `1px solid ${B.border}`,
                        fontWeight: 700, fontFamily: FONT, fontSize: { xs: 13, sm: 15 },
                      }}>{c.authorAvatar}</Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 }, flexWrap: 'wrap' }}>
                          <Typography sx={{ fontFamily: FONT, fontWeight: 700, color: B.ink, fontSize: { xs: '0.78rem', sm: '0.85rem' } }}>{c.author}</Typography>
                          {c.authorRole && <Typography sx={{ fontFamily: FONT, color: B.faint, fontSize: { xs: '0.6rem', sm: '0.68rem' } }}>· {c.authorRole}</Typography>}
                          {c.flagged && <StatusPill kind="warn">Hidden</StatusPill>}
                          {c.replied && <StatusPill kind="ok">Replied</StatusPill>}
                        </Box>
                        <Typography
                          onClick={() => navigateToPost(c.postId)}
                          sx={{
                            fontFamily: FONT, color: B.faint,
                            fontSize: { xs: '0.6rem', sm: '0.68rem' },
                            display: 'block', cursor: 'pointer',
                            transition: 'color .15s ease',
                            '&:hover': { color: B.sageDeep, textDecoration: 'underline' },
                          }}
                        >
                          on "<Box component="span" sx={{ fontWeight: 600, color: B.sageText }}>{c.postTitle}</Box>" · {c.timestamp}
                        </Typography>
                        <Typography sx={{
                          mt: 1, mb: 1.5, fontFamily: FONT, color: B.muted,
                          fontSize: { xs: '0.76rem', sm: '0.84rem' }, lineHeight: 1.55,
                          wordBreak: 'break-word',
                        }}>{c.content}</Typography>

                        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                          <Button size="small" variant="outlined" startIcon={<ReplyIcon />} onClick={() => setReplyDialog(c)} disabled={c.replied}
                            sx={{
                              textTransform: 'none', fontWeight: 600, borderRadius: '10px', fontFamily: FONT,
                              borderColor: B.border, color: B.sageDeep,
                              fontSize: { xs: '0.7rem', sm: '0.78rem' }, px: { xs: 1.25, sm: 1.75 },
                              '&:hover': { borderColor: B.sageText, bgcolor: B.sageSoft },
                            }}>
                            Reply
                          </Button>
                          <Button size="small" variant="text"
                            onClick={() => navigateToPost(c.postId)}
                            sx={{
                              textTransform: 'none', fontWeight: 600, borderRadius: '10px', fontFamily: FONT,
                              color: B.sageText,
                              fontSize: { xs: '0.7rem', sm: '0.78rem' }, px: { xs: 1.25, sm: 1.75 },
                              '&:hover': { bgcolor: B.sageSoft },
                            }}>
                            View Post →
                          </Button>
                        </Stack>
                      </Box>
                    </Box>
                  </Box>
                </Panel>
              );
            })}
          </Stack>

          {/* ═══ Comment Pagination ═══ */}
          {comments.length > 0 && (
            <Box sx={{
              mt: { xs: 2.5, sm: 3 }, display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'stretch', sm: 'center' },
              gap: { xs: 1.5, sm: 2 },
            }}>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 1, sm: 2 }, alignItems: { xs: 'flex-start', sm: 'center' }, flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontFamily: FONT, fontSize: { xs: '0.78rem', sm: '0.82rem' }, color: B.muted, fontWeight: 500, whiteSpace: 'nowrap' }}>
                  Showing{' '}
                  <Box component="span" sx={{ color: B.ink, fontWeight: 700 }}>
                    {(cmtPage - 1) * effectiveCmtPageSize + 1}–{Math.min(cmtPage * effectiveCmtPageSize, comments.length)}
                  </Box>
                  {' '}of{' '}
                  <Box component="span" sx={{ color: B.ink, fontWeight: 700 }}>{comments.length}</Box>
                  {' '}comments
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
                  <Typography sx={{ fontFamily: FONT, fontSize: { xs: '0.78rem', sm: '0.82rem' }, color: B.muted, fontWeight: 500 }}>Show</Typography>
                  <Select size="small" value={cmtPageSize}
                    onChange={(e) => { const v = e.target.value; setCmtPageSize(v === 'all' ? 'all' : Number(v)); }}
                    renderValue={(v) => (v === 'all' ? 'All' : v)}
                    MenuProps={{ slotProps: { paper: { sx: {
                      borderRadius: '12px', mt: 0.5, border: `1px solid ${B.border}`, boxShadow: '0 8px 24px rgba(2,33,36,0.12)',
                      '& .MuiMenuItem-root': { fontSize: '0.82rem', fontWeight: 600, fontFamily: FONT, color: B.ink, minHeight: { xs: 40, sm: 36 },
                        '&.Mui-selected': { bgcolor: B.sageSoft, color: B.navy, '&:hover': { bgcolor: B.sageSoft } },
                      },
                    } } } }}
                    sx={{
                      fontSize: '0.82rem', fontWeight: 700, fontFamily: FONT, color: B.navy,
                      bgcolor: B.bg, borderRadius: '10px', minWidth: { xs: 76, sm: 80 }, height: { xs: 38, sm: 36 },
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: B.border },
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: B.navy },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: B.navy, borderWidth: '1px' },
                      '& .MuiSelect-select': { py: 0.75, pl: 1.25, pr: '28px !important' },
                      '& .MuiSvgIcon-root': { color: B.navy },
                    }}
                  >
                    {PAGE_SIZE_OPTIONS.map((opt) => (
                      <MenuItem key={opt} value={opt}>{opt === 'all' ? 'All' : opt}</MenuItem>
                    ))}
                  </Select>
                  <Typography sx={{ fontFamily: FONT, fontSize: { xs: '0.78rem', sm: '0.82rem' }, color: B.muted, fontWeight: 500 }}>per page</Typography>
                </Box>
              </Box>
              <Pagination
                count={totalCmtPages}
                page={cmtPage}
                onChange={handleCmtPageChange}
                shape="rounded"
                siblingCount={1}
                boundaryCount={1}
                size="small"
                sx={{
                  '& .MuiPaginationItem-root': {
                    fontSize: { xs: '0.75rem', sm: '0.82rem' }, fontWeight: 600, fontFamily: FONT, color: B.ink,
                    borderRadius: '8px', border: `1px solid ${B.border}`, bgcolor: B.bg,
                    minWidth: { xs: 32, sm: 36 }, height: { xs: 32, sm: 36 },
                    '&:hover': { bgcolor: B.sageSoft, borderColor: B.sage },
                    '&.Mui-selected': {
                      bgcolor: B.navy, color: '#fff', borderColor: B.navy, fontWeight: 700,
                      boxShadow: '0 4px 12px rgba(2,33,36,0.2)',
                      '&:hover': { bgcolor: B.navySoft },
                    },
                  },
                  '& .MuiPaginationItem-ellipsis': { border: 'none', bgcolor: 'transparent' },
                }}
              />
            </Box>
          )}
        </Box>
      )}

      {/* ═══════════════ TAB 2 — ABOUT ═══════════════ */}
      {tab === 2 && (
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' },
          gap: { xs: 1.5, sm: 2, md: 3 },
          maxWidth: 1100, mx: 'auto',
        }}>
          <Panel sx={{ p: { xs: 2, sm: 2.75 }, minWidth: 0 }}>
            <Typography sx={{
              fontFamily: SERIF, color: B.ink, mb: 1,
              fontSize: { xs: '1.05rem', sm: '1.25rem' },
            }}>
              About {profile.name}
            </Typography>
            <Typography sx={{
              fontFamily: FONT, color: B.muted, mb: { xs: 2, md: 3 }, lineHeight: 1.75,
              fontSize: { xs: '0.78rem', sm: '0.86rem' }, whiteSpace: 'pre-wrap',
            }}>
              {profile.about}
            </Typography>

            <Divider sx={{ my: 2, borderColor: B.border }} />

            <Typography sx={{
              fontFamily: FONT, fontWeight: 700, color: B.ink, mb: 1.75,
              fontSize: { xs: '0.85rem', sm: '0.95rem' },
            }}>
              Company Details
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: { xs: 1, sm: 1.5 } }}>
              {[
                { label: 'Industry',     value: profile.industry },
                { label: 'Founded',      value: profile.founded  },
                { label: 'Location',     value: profile.location },
                { label: 'Size',         value: profile.size     },
                { label: 'Website',      value: profile.website,  isLink: true },
                { label: 'Domain',       value: profile.domain,   isLink: true },
                { label: 'Office Email', value: profile.email    },
                { label: 'Contact',      value: profile.phone    },
              ].map(f => {
                const isClickable = f.isLink && f.value && f.value !== '—';
                const href = isClickable
                  ? (f.value.startsWith('http') ? f.value : `https://${f.value}`)
                  : null;
                return (
                  <Box key={f.label} sx={{
                    bgcolor: B.sageWash, borderRadius: '12px',
                    p: { xs: 1.25, sm: 1.5 }, border: `1px solid ${B.border}`,
                  }}>
                    <Typography sx={{ fontFamily: FONT, color: B.faint, fontWeight: 600, fontSize: { xs: '0.58rem', sm: '0.66rem' }, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{f.label}</Typography>
                    {isClickable ? (
                      <Typography
                        component="a" href={href} target="_blank" rel="noopener noreferrer"
                        sx={{
                          fontFamily: FONT, fontWeight: 600, color: B.sageText,
                          fontSize: { xs: '0.74rem', sm: '0.82rem' }, wordBreak: 'break-word', mt: 0.25,
                          display: 'block', textDecoration: 'none',
                          '&:hover': { textDecoration: 'underline', color: B.sageDeep },
                        }}
                      >{f.value}</Typography>
                    ) : (
                      <Typography sx={{ fontFamily: FONT, fontWeight: 600, color: B.ink, fontSize: { xs: '0.74rem', sm: '0.82rem' }, wordBreak: 'break-word', mt: 0.25 }}>{f.value}</Typography>
                    )}
                  </Box>
                );
              })}
            </Box>
          </Panel>

                    <Box sx={{ minWidth: 0, display: 'none' }}>
            <Box sx={{
              bgcolor: B.navy, borderRadius: '18px', p: { xs: 2, sm: 2.5 },
              position: 'relative', overflow: 'hidden', color: '#fff',
            }}>
              <Box sx={{
                position: 'absolute', right: -60, top: -60, width: 200, height: 200,
                borderRadius: '50%', background: 'radial-gradient(circle, rgba(127,158,126,0.25), transparent 70%)',
                pointerEvents: 'none',
              }} />
              <Typography sx={{ fontFamily: FONT, fontSize: '0.64rem', textTransform: 'uppercase', letterSpacing: '0.14em', color: '#7E9896', fontWeight: 700, mb: 1.5, position: 'relative' }}>
                Profile Completeness
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, position: 'relative' }}>
                <StrengthRing pct={completeness} size={64} track="rgba(255,255,255,0.14)" stroke={B.sage} />
                <Box>
                  <Typography sx={{ fontFamily: SERIF, fontSize: { xs: '1.8rem', sm: '2.1rem' }, lineHeight: 1 }}>{completeness}%</Typography>
                  <Typography sx={{ fontFamily: FONT, fontSize: '0.72rem', color: '#AEC3AE', mt: 0.75, lineHeight: 1.55 }}>
                    {completeness >= 100 ? 'Your company profile is fully complete.' : 'Fill in the remaining company details to reach 100%.'}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
      )}

      {/* ═══════════════ Post actions menu ═══════════════ */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}
        slotProps={{ paper: { sx: {
          borderRadius: '14px', border: `1px solid ${B.border}`,
          boxShadow: '0 12px 36px rgba(2,33,36,0.14), 0 2px 6px rgba(2,33,36,0.08)',
          minWidth: { xs: 160, sm: 180 }, mt: 0.5, p: 0.5,
          '& .MuiMenuItem-root': { borderRadius: '10px', fontFamily: FONT, fontSize: { xs: '0.8rem', sm: '0.86rem' }, py: 1 },
        } } }}>
        <MenuItem onClick={() => menuPost && handleOpenEdit(menuPost)} sx={{ color: B.ink }}>
          <EditIcon fontSize="small" sx={{ mr: 1.25, color: B.sageText }} /> Edit Post
        </MenuItem>
        <MenuItem onClick={() => menuPost && handleDeletePost(menuPost.id)} sx={{ color: B.error }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1.25 }} /> Delete
        </MenuItem>
      </Menu>

      {/* ═══════════════ Create Post Dialog ═══════════════ */}
      <Dialog open={newPost} onClose={() => setNewPost(false)} maxWidth="sm" fullWidth fullScreen={isMobile}
        slotProps={{ paper: { sx: {
          borderRadius: isMobile ? 0 : '20px', overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(2,33,36,0.22)',
        } } }}>
        <Box sx={{
          background: `linear-gradient(135deg, ${B.navy} 0%, ${B.navyLighter} 75%, ${B.sageDeep} 140%)`,
          px: { xs: 2, sm: 3 }, py: { xs: 1.75, sm: 2.25 },
          display: 'flex', alignItems: 'center', gap: 1.5,
        }}>
          <Box sx={{
            width: { xs: 36, sm: 42 }, height: { xs: 36, sm: 42 }, borderRadius: '12px', flex: 'none',
            bgcolor: 'rgba(127,158,126,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <AddIcon sx={{ color: '#fff', fontSize: { xs: 20, sm: 24 } }} />
          </Box>
          <Box>
            <Typography sx={{ fontFamily: SERIF, color: '#fff', lineHeight: 1.2, fontSize: { xs: '1.05rem', sm: '1.2rem' } }}>Create New Post</Typography>
            <Typography sx={{ fontFamily: FONT, color: '#AEC3AE', fontSize: { xs: '0.62rem', sm: '0.72rem' } }}>Share news, updates, or events with your audience</Typography>
          </Box>
        </Box>
        <DialogContent dividers sx={{ bgcolor: B.surface, px: { xs: 1.75, sm: 3 }, py: { xs: 1.5, sm: 2 } }}>
          <Stack spacing={{ xs: 1.5, sm: 2 }} sx={{ mt: 1 }}>
            <FormControl fullWidth size="small" sx={inputSx}>
              <InputLabel>Post Type</InputLabel>
              <Select value={postDraft.type} label="Post Type" onChange={(e) => setPostDraft({ ...postDraft, type: e.target.value })}>
                <MenuItem value="news">Company News</MenuItem>
                <MenuItem value="update">Important Update</MenuItem>
                <MenuItem value="event">Event / Greeting</MenuItem>
                <MenuItem value="announcement">Announcement</MenuItem>
              </Select>
            </FormControl>
            <TextField label="Title" fullWidth size="small" value={postDraft.title} onChange={(e) => setPostDraft({ ...postDraft, title: e.target.value })} sx={inputSx} />
            <TextField label="Content" fullWidth multiline rows={isMobile ? 4 : 5} value={postDraft.content} onChange={(e) => setPostDraft({ ...postDraft, content: e.target.value })} sx={inputSx} />
            <input ref={fileInputRef} type="file"
              accept="image/*,video/mp4,video/quicktime,video/webm,application/pdf"
              style={{ display: 'none' }} onChange={handleMediaSelect} />
            {mediaPreview ? (
              <Box sx={{ position: 'relative', alignSelf: 'flex-start' }}>
                {mediaFile?.type?.startsWith('video/') ? (
                  <Box component="video" src={URL.createObjectURL(mediaFile)} controls sx={{ maxHeight: { xs: 130, sm: 160 }, maxWidth: '100%', borderRadius: '12px', border: `1px solid ${B.border}` }} />
                ) : mediaFile?.type === 'application/pdf' ? (
                  <Box sx={{ p: 1.5, borderRadius: '12px', border: `1px solid ${B.border}`, bgcolor: B.sageWash, fontFamily: FONT, fontSize: { xs: '0.75rem', sm: '0.82rem' }, color: B.sageDeep, fontWeight: 600 }}>📄 {mediaFile.name}</Box>
                ) : (
                  <Box component="img" src={mediaPreview} alt="preview" sx={{ maxHeight: { xs: 130, sm: 160 }, maxWidth: '100%', borderRadius: '12px', border: `1px solid ${B.border}` }} />
                )}
                <IconButton size="small" onClick={handleMediaClear}
                  sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(0,0,0,0.55)', color: '#fff', '&:hover': { bgcolor: 'rgba(0,0,0,0.75)' } }}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            ) : (
              <Button variant="outlined"
                startIcon={mediaUploading ? <CircularProgress size={14} /> : <CameraIcon />}
                disabled={mediaUploading} onClick={() => fileInputRef.current?.click()}
                sx={{
                  alignSelf: 'flex-start', textTransform: 'none', fontWeight: 600, fontFamily: FONT,
                  borderRadius: '12px', borderColor: B.border, color: B.sageDeep,
                  fontSize: { xs: '0.78rem', sm: '0.86rem' },
                  '&:hover': { borderColor: B.sageText, bgcolor: B.sageSoft },
                }}>
                Attach Media (optional)
              </Button>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: { xs: 1.75, sm: 3 }, py: { xs: 1.5, sm: 2 }, gap: 1, flexWrap: 'wrap' }}>
          <Button onClick={() => setNewPost(false)} sx={{ textTransform: 'none', fontWeight: 600, fontFamily: FONT, color: B.muted, borderRadius: '10px', fontSize: { xs: '0.78rem', sm: '0.86rem' } }}>Cancel</Button>
          <Box sx={{ flex: 1 }} />
          <Button
            variant="outlined"
            onClick={() => handleCreatePost(false)}
            sx={{
              textTransform: 'none', fontWeight: 600, borderRadius: '12px', fontFamily: FONT,
              borderColor: B.border, color: B.sageDeep,
              fontSize: { xs: '0.78rem', sm: '0.86rem' },
              '&:hover': { borderColor: B.sageText, bgcolor: B.sageSoft },
            }}
          >
            Save Draft
          </Button>
          <Button variant="contained" startIcon={<SendIcon />} onClick={() => handleCreatePost(true)}
            sx={{
              textTransform: 'none', fontWeight: 700, borderRadius: '12px', fontFamily: FONT,
              bgcolor: B.sageText, fontSize: { xs: '0.78rem', sm: '0.86rem' },
              boxShadow: '0 6px 16px rgba(94,129,93,0.35)',
              '&:hover': { bgcolor: B.sageDeep },
            }}>
            Publish
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══════════════ Edit Post Dialog ═══════════════ */}
      <Dialog open={Boolean(editPost)} onClose={() => setEditPost(null)} maxWidth="sm" fullWidth fullScreen={isMobile}
        slotProps={{ paper: { sx: {
          borderRadius: isMobile ? 0 : '20px', overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(2,33,36,0.22)',
        } } }}>
        {editPost && (
          <>
            <Box sx={{
              background: `linear-gradient(135deg, ${B.navy} 0%, ${B.navyLighter} 75%, ${B.sageDeep} 140%)`,
              px: { xs: 2, sm: 3 }, py: { xs: 1.75, sm: 2.25 },
              display: 'flex', alignItems: 'center', gap: 1.5,
            }}>
              <Box sx={{
                width: { xs: 36, sm: 42 }, height: { xs: 36, sm: 42 }, borderRadius: '12px', flex: 'none',
                bgcolor: 'rgba(127,158,126,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <EditIcon sx={{ color: '#fff', fontSize: { xs: 20, sm: 24 } }} />
              </Box>
              <Box>
                <Typography sx={{ fontFamily: SERIF, color: '#fff', lineHeight: 1.2, fontSize: { xs: '1.05rem', sm: '1.2rem' } }}>Edit Post</Typography>
                <Typography sx={{ fontFamily: FONT, color: '#AEC3AE', fontSize: { xs: '0.62rem', sm: '0.72rem' } }}>Update your post details</Typography>
              </Box>
            </Box>
            <DialogContent dividers sx={{ bgcolor: B.surface, px: { xs: 1.75, sm: 3 }, py: { xs: 1.5, sm: 2 } }}>
              <Stack spacing={{ xs: 1.5, sm: 2 }} sx={{ mt: 1 }}>
                <FormControl fullWidth size="small" sx={inputSx}>
                  <InputLabel>Post Type</InputLabel>
                  <Select value={editDraft.type} label="Post Type" onChange={(e) => setEditDraft({ ...editDraft, type: e.target.value })}>
                    <MenuItem value="news">Company News</MenuItem>
                    <MenuItem value="update">Important Update</MenuItem>
                    <MenuItem value="event">Event / Greeting</MenuItem>
                    <MenuItem value="announcement">Announcement</MenuItem>
                  </Select>
                </FormControl>
                <TextField label="Title" fullWidth size="small" value={editDraft.title} onChange={(e) => setEditDraft({ ...editDraft, title: e.target.value })} sx={inputSx} />
                <TextField label="Content" fullWidth multiline rows={isMobile ? 4 : 5} value={editDraft.content} onChange={(e) => setEditDraft({ ...editDraft, content: e.target.value })} sx={inputSx} />
                <input ref={editFileInputRef} type="file"
                  accept="image/*,video/mp4,video/quicktime,video/webm,application/pdf"
                  style={{ display: 'none' }} onChange={handleEditMediaSelect} />
                {editMediaPreview ? (
                  <Box sx={{ position: 'relative', alignSelf: 'flex-start', maxWidth: '100%' }}>
                    {/* 🔧 Branch on editMediaType — covers BOTH existing
                        attachments (presigned URL, no File object) and
                        newly-selected files (object URL). */}
                    {editMediaType === 'video' ? (
                      <Box component="video" src={editMediaPreview} controls preload="metadata"
                        sx={{ maxHeight: { xs: 130, sm: 160 }, maxWidth: '100%', borderRadius: '12px', border: `1px solid ${B.border}`, display: 'block', bgcolor: '#000' }} />
                    ) : editMediaType === 'document' ? (
                      <Box sx={{ p: 1.5, pr: 5, borderRadius: '12px', border: `1px solid ${B.border}`, bgcolor: B.sageWash, fontFamily: FONT, fontSize: { xs: '0.75rem', sm: '0.82rem' }, color: B.sageDeep, fontWeight: 600 }}>
                        📄 {editMediaFile?.name || 'Attached PDF'}
                      </Box>
                    ) : (
                      <Box component="img" src={editMediaPreview} alt="attachment preview"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        sx={{ maxHeight: { xs: 130, sm: 160 }, maxWidth: '100%', borderRadius: '12px', border: `1px solid ${B.border}`, display: 'block' }} />
                    )}
                    <IconButton size="small" onClick={handleEditMediaClear} title="Remove attachment"
                      sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(0,0,0,0.55)', color: '#fff', '&:hover': { bgcolor: 'rgba(0,0,0,0.75)' } }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ) : (
                  <Button variant="outlined"
                    startIcon={editMediaUploading ? <CircularProgress size={14} /> : <CameraIcon />}
                    disabled={editMediaUploading} onClick={() => editFileInputRef.current?.click()}
                    sx={{
                      alignSelf: 'flex-start', textTransform: 'none', fontWeight: 600, fontFamily: FONT,
                      borderRadius: '12px', borderColor: B.border, color: B.sageDeep,
                      fontSize: { xs: '0.78rem', sm: '0.86rem' },
                      '&:hover': { borderColor: B.sageText, bgcolor: B.sageSoft },
                    }}>
                    Attach Media (optional)
                  </Button>
                )}
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: { xs: 1.75, sm: 3 }, py: { xs: 1.5, sm: 2 }, gap: 1 }}>
              <Button onClick={() => setEditPost(null)} sx={{ textTransform: 'none', fontWeight: 600, fontFamily: FONT, color: B.muted, borderRadius: '10px', fontSize: { xs: '0.78rem', sm: '0.86rem' } }}>Cancel</Button>
              <Button variant="contained" startIcon={<SendIcon />} onClick={handleSaveEdit}
                sx={{
                  textTransform: 'none', fontWeight: 700, borderRadius: '12px', fontFamily: FONT,
                  px: { xs: 2, sm: 2.5 }, bgcolor: B.sageText,
                  fontSize: { xs: '0.78rem', sm: '0.86rem' },
                  boxShadow: '0 6px 16px rgba(94,129,93,0.35)',
                  '&:hover': { bgcolor: B.sageDeep },
                }}>
                Save Changes
              </Button>
              {editPost?.status === 'Draft' && (
                <Button variant="contained" startIcon={<SendIcon />} onClick={() => handleSaveEdit(true)}
                  sx={{
                    textTransform: 'none', fontWeight: 700, borderRadius: '12px', fontFamily: FONT,
                    px: { xs: 2, sm: 2.5 }, bgcolor: B.done,
                    fontSize: { xs: '0.78rem', sm: '0.86rem' },
                    boxShadow: '0 6px 16px rgba(62,110,62,0.35)',
                    '&:hover': { bgcolor: '#33582F' },
                  }}>
                  Publish
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ═══════════════ Reply Dialog ═══════════════ */}
      <Dialog open={Boolean(replyDialog)} onClose={() => setReplyDialog(null)} maxWidth="sm" fullWidth fullScreen={isMobile}
        slotProps={{ paper: { sx: {
          borderRadius: isMobile ? 0 : '20px', overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(2,33,36,0.22)',
        } } }}>
        {replyDialog && (
          <>
            <Box sx={{
              background: `linear-gradient(135deg, ${B.navy} 0%, ${B.navyLighter} 75%, ${B.sageDeep} 140%)`,
              px: { xs: 2, sm: 3 }, py: { xs: 1.75, sm: 2.25 },
              display: 'flex', alignItems: 'center', gap: 1.5,
            }}>
              <Avatar sx={{
                width: { xs: 36, sm: 42 }, height: { xs: 36, sm: 42 },
                bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 700, flex: 'none',
                fontSize: { xs: 14, sm: 16 }, fontFamily: FONT,
              }} src={replyDialog?.photo || undefined}>{replyDialog.authorAvatar}</Avatar>
              <Typography sx={{
                fontFamily: SERIF, color: '#fff',
                fontSize: { xs: '1rem', sm: '1.15rem' },
                minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>Reply to {replyDialog.author}</Typography>
            </Box>
            <DialogContent dividers sx={{ bgcolor: B.surface, px: { xs: 1.75, sm: 3 }, py: { xs: 1.5, sm: 2 } }}>
              <Box sx={{
                mb: 2, bgcolor: B.sageWash, border: `1px solid ${B.border}`,
                borderRadius: '12px', p: { xs: 1.25, sm: 1.75 },
              }}>
                <Typography sx={{ fontFamily: FONT, color: B.faint, fontSize: { xs: '0.62rem', sm: '0.72rem' } }}>{replyDialog.author} · {replyDialog.timestamp}</Typography>
                <Typography sx={{ mt: 0.5, fontFamily: FONT, color: B.muted, fontSize: { xs: '0.75rem', sm: '0.82rem' } }}>{replyDialog.content}</Typography>
              </Box>
              <TextField
                label="Your reply" fullWidth multiline rows={isMobile ? 3 : 4} autoFocus
                value={replyText} onChange={(e) => setReplyText(e.target.value)}
                placeholder={`Hi ${replyDialog.author.split(' ')[0]}, thanks for your comment…`}
                sx={inputSx}
              />
            </DialogContent>
            <DialogActions sx={{ px: { xs: 1.75, sm: 3 }, py: { xs: 1.5, sm: 2 }, gap: 1 }}>
              <Button onClick={() => setReplyDialog(null)} sx={{ textTransform: 'none', fontWeight: 600, fontFamily: FONT, color: B.muted, borderRadius: '10px', fontSize: { xs: '0.78rem', sm: '0.86rem' } }}>Cancel</Button>
              <Button variant="contained" startIcon={<SendIcon />} onClick={handleReply}
                sx={{
                  textTransform: 'none', fontWeight: 700, borderRadius: '12px', fontFamily: FONT,
                  px: { xs: 2, sm: 2.5 }, bgcolor: B.sageText,
                  fontSize: { xs: '0.78rem', sm: '0.86rem' },
                  boxShadow: '0 6px 16px rgba(94,129,93,0.35)',
                  '&:hover': { bgcolor: B.sageDeep },
                }}>
                Send Reply
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ═══════════════ Likers Dialog ═══════════════ */}
      <Dialog
        open={Boolean(likersDialog)}
        onClose={() => setLikersDialog(null)}
        maxWidth="xs"
        fullWidth
        fullScreen={isMobile}
        slotProps={{ paper: { sx: { borderRadius: { xs: 0, sm: '18px' } } } }}
      >
        <DialogTitle sx={{ pb: 1, fontWeight: 700, color: B.ink, fontFamily: FONT }}>
          Liked this post
          {likersDialog && (
            <Typography variant="caption" sx={{ display: 'block', color: B.faint, fontWeight: 400, mt: 0.5, fontFamily: FONT }}>
              "{likersDialog.title}"
            </Typography>
          )}
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          {likersLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={28} sx={{ color: B.sageText }} />
            </Box>
          ) : likersList.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: B.faint, fontFamily: FONT }}>
                No likes yet.
              </Typography>
            </Box>
          ) : (
            <Stack divider={<Divider sx={{ borderColor: B.border }} />}>
              {likersList.map(l => {
                const lInitials = (l.name || '?')
                  .split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2);
                return (
                  <Box key={l.candidate_id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5, py: 1.5 }}>
                    <Avatar sx={{ bgcolor: B.sageSoft, color: B.sageDeep, width: 40, height: 40, fontWeight: 700, fontFamily: FONT }} src={l.photo_url || undefined}>{lInitials}</Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: B.ink, fontFamily: FONT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {l.name}
                      </Typography>
                      {l.email && (
                        <Typography variant="caption" sx={{ color: B.faint, fontFamily: FONT, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {l.email}
                        </Typography>
                      )}
                    </Box>
                    {l.liked_at && (
                      <Typography variant="caption" sx={{ color: B.faint, fontFamily: FONT, flex: 'none' }}>
                        {new Date(l.liked_at).toLocaleDateString()}
                      </Typography>
                    )}
                  </Box>
                );
              })}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2.5, py: 1.5 }}>
          <Button onClick={() => setLikersDialog(null)} sx={{ textTransform: 'none', fontWeight: 600, color: B.sageDeep, fontFamily: FONT }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══════════════ Viewers Dialog ═══════════════ */}
      <Dialog
        open={Boolean(viewersDialog)}
        onClose={() => setViewersDialog(null)}
        maxWidth="xs"
        fullWidth
        fullScreen={isMobile}
        slotProps={{ paper: { sx: { borderRadius: { xs: 0, sm: '18px' } } } }}
      >
        <DialogTitle sx={{ pb: 1, fontWeight: 700, color: B.ink, fontFamily: FONT }}>
          Who viewed this post
          {viewersDialog && (
            <Typography variant="caption" sx={{ display: 'block', color: B.faint, fontWeight: 400, mt: 0.5, fontFamily: FONT }}>
              "{viewersDialog.title}"
            </Typography>
          )}
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          {viewersLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={28} sx={{ color: B.sageText }} />
            </Box>
          ) : viewersList.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: B.faint, fontFamily: FONT }}>No views recorded yet.</Typography>
            </Box>
          ) : (
            <Stack divider={<Divider sx={{ borderColor: B.border }} />}>
              {viewersList.map((v, idx) => {
                const vInitials = (v.viewer_name || '?')
                  .split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2);
                return (
                  <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5, py: 1.5 }}>
                    <Avatar sx={{ bgcolor: B.sageSoft, color: B.sageDeep, width: 40, height: 40, fontWeight: 700, fontFamily: FONT }} src={v.photo_url || undefined}>{vInitials}</Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: B.ink, fontFamily: FONT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {v.viewer_name}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {v.viewer_email && (
                          <Typography variant="caption" sx={{ color: B.faint, fontFamily: FONT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {v.viewer_email}
                          </Typography>
                        )}
                        <Typography variant="caption" sx={{ color: B.sageDeep, fontFamily: FONT, fontWeight: 600, flex: 'none', fontSize: '0.6rem' }}>
                          {v.viewer_type}
                        </Typography>
                      </Box>
                    </Box>
                    {v.viewed_at && (
                      <Typography variant="caption" sx={{ color: B.faint, fontFamily: FONT, flex: 'none' }}>
                        {new Date(v.viewed_at).toLocaleDateString()}
                      </Typography>
                    )}
                  </Box>
                );
              })}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2.5, py: 1.5 }}>
          <Button onClick={() => setViewersDialog(null)} sx={{ textTransform: 'none', fontWeight: 600, color: B.sageDeep, fontFamily: FONT }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══════════════ Media Preview Dialog ═══════════════ */}
      <Dialog open={Boolean(preview)} onClose={() => setPreview(null)} maxWidth="md" fullWidth fullScreen={isMobile}
        slotProps={{ paper: { sx: {
          borderRadius: isMobile ? 0 : '18px',
          overflow: 'hidden', bgcolor: B.navy,
          boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
        } } }}>
        {preview && (
          <>
            <Box sx={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              px: { xs: 1.5, sm: 2 }, py: { xs: 1, sm: 1.25 },
              bgcolor: 'rgba(255,255,255,0.05)',
              borderBottom: '1px solid rgba(255,255,255,0.10)',
            }}>
              <Typography sx={{
                color: '#fff', fontWeight: 600, fontFamily: FONT,
                fontSize: { xs: '0.75rem', sm: '0.9rem' },
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, mr: 2,
              }}>
                {preview.title}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                {preview.media_type === 'document' ? (
                  <Button component="a" href={preview.url} target="_blank" rel="noopener noreferrer" size="small"
                    sx={{
                      color: 'rgba(255,255,255,0.75)', textTransform: 'none', fontFamily: FONT,
                      fontSize: { xs: '0.68rem', sm: '0.78rem' },
                      '&:hover': { color: '#fff' },
                    }}>
                    Open in new tab
                  </Button>
                ) : (
                  <Button component="a" href={preview.url} download size="small"
                    sx={{
                      color: 'rgba(255,255,255,0.75)', textTransform: 'none', fontFamily: FONT,
                      fontSize: { xs: '0.68rem', sm: '0.78rem' },
                      '&:hover': { color: '#fff' },
                    }}>
                    Download
                  </Button>
                )}
                <IconButton size="small" onClick={() => setPreview(null)}
                  sx={{ color: 'rgba(255,255,255,0.7)', '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.1)' } }}>
                  <Box sx={{ fontSize: '1.1rem', lineHeight: 1, fontWeight: 700 }}>✕</Box>
                </IconButton>
              </Stack>
            </Box>
            <Box sx={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              p: preview.media_type === 'document' ? 0 : { xs: 1, sm: 2 },
            }}>
              {preview.media_type === 'image' && (
                <Box component="img" src={preview.url} alt={preview.title}
                  sx={{ maxWidth: '100%', maxHeight: { xs: '75vh', sm: '80vh' }, objectFit: 'contain', borderRadius: '8px' }} />
              )}
              {preview.media_type === 'video' && (
                <Box component="video" src={preview.url} controls autoPlay
                  sx={{ maxWidth: '100%', maxHeight: { xs: '70vh', sm: '75vh' }, borderRadius: '8px', outline: 'none' }} />
              )}
              {preview.media_type === 'document' && (
                <Box component="iframe" src={preview.url} title={preview.title}
                  sx={{ width: '100%', height: { xs: '75vh', sm: '78vh' }, border: 'none', display: 'block' }} />
              )}
            </Box>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default CompanyEngagement;