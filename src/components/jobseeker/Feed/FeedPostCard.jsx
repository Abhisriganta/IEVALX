

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Box, Stack, Typography, Avatar, IconButton, Button,
  TextField, CircularProgress, Collapse, Menu, MenuItem, Dialog,
} from '@mui/material';
import {
  FavoriteBorderRounded, FavoriteRounded,
  ChatBubbleOutlineRounded, CalendarTodayRounded, LocationOnOutlined,
  SendRounded, KeyboardArrowDownRounded, KeyboardArrowUpRounded,
  ReplyRounded, PictureAsPdfRounded, OpenInNewRounded,
  CloseRounded, ZoomInRounded,
} from '@mui/icons-material';

import defaultFeedService from '@/services/api/jobseeker/feedService';

const VIDEO_EXTS = ['mp4', 'mov', 'webm', 'avi', 'mkv', 'm4v'];

const resolveMediaType = (post) => {
  if (post.media_type === 'video' || post.media_type === 'document' || post.media_type === 'image') {
    return post.media_type;
  }
  const url = post.image_url || '';
  const path = url.split('?')[0].split('#')[0];
  const last = path.split('/').pop() || '';
  const ext = last.includes('.') ? last.split('.').pop().toLowerCase() : '';
  if (VIDEO_EXTS.includes(ext)) return 'video';
  if (ext === 'pdf') return 'document';
  return 'image';
};

const fileNameFromUrl = (url) => {
  try {
    const path = String(url || '').split('?')[0].split('#')[0];
    const name = decodeURIComponent(path.split('/').pop() || '');
    return name || 'Document.pdf';
  } catch {
    return 'Document.pdf';
  }
};

function PostMedia({ post }) {
  /* 🔧 CHANGE 2/4 — lightbox open state (hook must precede early return) */
  const [viewerOpen, setViewerOpen] = useState(false);

  if (!post.image_url) return null;
  const kind = resolveMediaType(post);

  if (kind === 'video') {
    return (
      <Box
        component="video"
        src={post.image_url}
        controls
        preload="metadata"
        playsInline
        sx={{
          width: '100%', display: 'block',
          maxHeight: 420,
          borderRadius: '12px',
          border: '1px solid #E7EAE3',
          mt: 1.25,
          bgcolor: '#101210',
          outline: 'none',
        }}
      />
    );
  }

  if (kind === 'document') {
    const openDoc = () => window.open(post.image_url, '_blank', 'noopener,noreferrer');
    return (
      <Box
        onClick={openDoc}
        role="button" tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDoc(); } }}
        sx={{
          mt: 1.25, px: 1.5, py: 1.25,
          display: 'flex', alignItems: 'center', gap: 1.25,
          bgcolor: '#F6F8F3', borderRadius: '12px',
          border: '1px solid #E7EAE3',
          cursor: 'pointer', outline: 'none',
          transition: 'all .2s ease',
          '&:hover, &:focus-visible': { borderColor: '#7F9E7E', bgcolor: '#EDF3EC' },
        }}
      >
        <Box sx={{
          width: 42, height: 42, borderRadius: '10px', flexShrink: 0,
          bgcolor: '#FDECEC', color: '#EF4444',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <PictureAsPdfRounded sx={{ fontSize: 22 }} />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{
            fontFamily: "'Jost','DM Sans',sans-serif", fontSize: '0.84rem', fontWeight: 700, color: '#101210',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {fileNameFromUrl(post.image_url)}
          </Typography>
          <Typography sx={{ fontFamily: "'Jost','DM Sans',sans-serif", fontSize: '0.72rem', color: '#7A8073', mt: 0.125 }}>
            PDF document · click to open
          </Typography>
        </Box>
        <OpenInNewRounded sx={{ fontSize: 17, color: '#5E815D', flexShrink: 0 }} />
      </Box>
    );
  }

  /* 🔧 CHANGE 2/4 + 3/4 — clickable image with full-screen lightbox */
  return (
    <>
      <Box
        onClick={() => setViewerOpen(true)}
        role="button"
        tabIndex={0}
        aria-label="View image"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setViewerOpen(true); }
        }}
        sx={{
          position: 'relative',
          mt: 1.25,
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid #E7EAE3',
          bgcolor: '#EDF3EC',
          cursor: 'zoom-in',
          outline: 'none',
          '&:focus-visible': { outline: '2px solid #7F9E7E', outlineOffset: 2 },
          '&:hover .ievalx-zoom-hint': { opacity: 1 },
        }}
      >
        <Box
          component="img"
          src={post.image_url}
          alt=""
          loading="lazy"
          sx={{
            width: '100%', display: 'block',
            maxHeight: 380, objectFit: 'cover',
          }}
        />
        <Box
          className="ievalx-zoom-hint"
          sx={{
            position: 'absolute', right: 10, bottom: 10,
            display: 'inline-flex', alignItems: 'center', gap: 0.5,
            px: 1, py: 0.5, borderRadius: '999px',
            bgcolor: 'rgba(2,33,36,0.72)', color: '#FFFFFF',
            fontFamily: "'Jost','DM Sans',sans-serif",
            fontSize: '0.68rem', fontWeight: 700,
            opacity: 0, transition: 'opacity 0.15s ease',
            pointerEvents: 'none',
          }}
        >
          <ZoomInRounded sx={{ fontSize: 14 }} />
          View
        </Box>
      </Box>

      <Dialog
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        maxWidth={false}
        slotProps={{
          backdrop: { sx: { bgcolor: 'rgba(2,33,36,0.88)' } },
          paper: {
            sx: {
              bgcolor: 'transparent',
              boxShadow: 'none',
              m: { xs: 1, sm: 2 },
              maxWidth: '92vw',
              maxHeight: '92vh',
              overflow: 'visible',
            },
          },
        }}
      >
        <IconButton
          onClick={() => setViewerOpen(false)}
          aria-label="Close image viewer"
          sx={{
            position: 'absolute', top: -8, right: -8, zIndex: 2,
            bgcolor: '#FFFFFF', color: '#022124',
            width: 34, height: 34,
            boxShadow: '0 2px 10px rgba(0,0,0,0.25)',
            '&:hover': { bgcolor: '#EDF3EC' },
          }}
        >
          <CloseRounded sx={{ fontSize: 18 }} />
        </IconButton>
       
        <Box
          component="img"
          src={post.image_url}
          alt=""
          onClick={() => setViewerOpen(false)}
          sx={{
            display: 'block',
            height: { xs: 'auto', sm: '80vh' },
            width: { xs: '92vw', sm: 'auto' },
            maxWidth: '92vw',
            maxHeight: '80vh',
            objectFit: 'contain',
            borderRadius: '12px',
            cursor: 'zoom-out',
            bgcolor: 'rgba(255,255,255,0.02)',
          }}
        />
        <Typography sx={{
          mt: 1, textAlign: 'center',
          fontFamily: "'Jost','DM Sans',sans-serif",
          fontSize: '0.74rem', fontWeight: 600,
          color: 'rgba(255,255,255,0.85)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {fileNameFromUrl(post.image_url)}
        </Typography>
      </Dialog>
    </>
  );
}

const T = {
  ink:      '#101210',
  sage:     '#7F9E7E',
  sageText: '#5E815D',
  pine:     '#022124',
  cream:    '#F6F8F3',
  white:    '#FFFFFF',
  muted:    '#55584F',
  soft:     '#7A8073',
  line:     '#E7EAE3',
  lineSoft: '#D8DDD4',
  sageSoft: '#EDF3EC',
  hoverBg:  '#F1F4EE',
  danger:   '#EF4444',
  dangerBg: '#FDECEC',
  dividerSoft: '#F0F2ED',
  spine:    '#EDF3EC',
};

const TYPE_CHIP = {
  NEWS:     { bg: '#EDF3EC', color: '#5E815D', label: 'News'     },
  UPDATE:   { bg: '#E6F1FB', color: '#185FA5', label: 'Update'   },
  EVENT:    { bg: '#FFF6E5', color: '#8A6A1F', label: 'Event'    },
  GREETING: { bg: '#FAECE7', color: '#712B13', label: 'Greeting' },
  ANNOUNCEMENT: { bg: '#E9EFEA', color: '#022124', label: 'Announcement' },
};

const formatEventDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    weekday: 'short', day: 'numeric', month: 'short',
  });
};

const AVATAR_SIZE  = 42;
const AVATAR_GAP   = 12;
const INITIAL_COMMENT_LIMIT = 3;

/* ══════════════════════════════════════════════════════════════════════
   Multi-source avatar — tries each candidate URL, then falls back
   ══════════════════════════════════════════════════════════════════════ */
const MultiSrcAvatar = ({ sources = [], initials, size = 34, isCompany = false }) => {
  // Filter out null/empty
  const validSources = useMemo(
    () => sources.filter((s) => typeof s === 'string' && s.trim().length > 0),
    [sources],
  );
  const [idx, setIdx] = useState(0);

  // Reset when sources change (different comment mounts)
  useEffect(() => { setIdx(0); }, [validSources.join('|')]);

  const currentSrc = validSources[idx] || null;
  const exhausted  = idx >= validSources.length;

  return (
    <Avatar
      src={!exhausted && currentSrc ? currentSrc : undefined}
      onError={() => setIdx((i) => i + 1)}
      imgProps={{
        // If image loads as broken zero-size, treat as error
        onError: () => setIdx((i) => i + 1),
      }}
      sx={{
        width: size, height: size,
        bgcolor: isCompany ? T.pine : T.sageSoft,
        color:   isCompany ? T.white : T.sageText,
        fontSize: size >= 34 ? '0.68rem' : '0.6rem',
        fontWeight: 800,
        fontFamily: "'Jost','DM Sans',sans-serif",
        flexShrink: 0,
        mt: 0.25,
      }}
    >
      {initials || 'U'}
    </Avatar>
  );
};

/* Build ordered list of photo sources for a commenter */
const buildCommenterPhotoSources = (comment, postCompanyLogo) => {
  if (!comment) return [];
  const list = [];

  // 1. Backend-provided URL (most reliable — if server ever adds it)
  if (comment.photo_url) list.push(comment.photo_url);

  const type = String(comment.commenter_type || '').toUpperCase();
  const id   = comment.commenter_id;

  if (type === 'CANDIDATE' && id) {
    // 2. Direct jobseeker photo endpoint
    list.push(`/api/jobseeker/photo/${id}/`);
    // 3. Underscore variant some backends use
    list.push(`/api/jobseeker/${id}/photo/`);
  }

  if (type === 'EMPLOYER') {
    // 2. Company logo (employers post from a company)
    if (postCompanyLogo) list.push(postCompanyLogo);
    if (id) list.push(`/api/employer/photo/${id}/`);
  }

  return list;
};


/* ══════════════════════════════════════════════════════════════════════
   COMMENT ACTION PILL — small icon+label button (matches main action bar)
   ══════════════════════════════════════════════════════════════════════ */
const CommentActionPill = ({ icon: Icon, label, count, active, activeColor, onClick }) => (
  <Box
    role="button"
    onClick={onClick}
    sx={{
      display: 'inline-flex', alignItems: 'center', gap: 0.4,
      px: 1.1, py: 0.4, borderRadius: '999px',
      fontSize: '0.7rem', fontWeight: 700,
      cursor: 'pointer', userSelect: 'none',
      transition: 'all 0.15s ease',
      bgcolor: active ? T.dangerBg : 'transparent',
      color:   active ? (activeColor || T.danger) : T.soft,
      '&:hover': {
        bgcolor: active ? T.dangerBg : T.hoverBg,
        color:   active ? (activeColor || T.danger) : T.pine,
      },
    }}
  >
    <Icon sx={{ fontSize: 13 }} />
    <span>{label}</span>
    {typeof count === 'number' && count > 0 && (
      <span style={{ fontWeight: 500 }}>· {count}</span>
    )}
  </Box>
);


/* ══════════════════════════════════════════════════════════════════════
   COMMENT ROW
   ══════════════════════════════════════════════════════════════════════ */
const CommentRow = ({
  comment,
  postCompanyLogo,
  service = defaultFeedService,
  depth = 0,
  onReplyClick,
  replyingToId,
  replyText,
  onReplyTextChange,
  onReplySubmit,
  replySubmitting,
  currentUserAvatarSrc,
  currentUserInitials,
  avatarBroken,
  onAvatarError,
}) => {
  const isReplyTarget = replyingToId === comment.id;
  const maxDepth = 1;
  const effectiveDepth = Math.min(depth, maxDepth);

  const type = String(comment.commenter_type || '').toUpperCase();
  const isCompany   = type === 'EMPLOYER';
  const isJobseeker = type === 'CANDIDATE' || type === 'JOBSEEKER';

  const photoSources = useMemo(
    () => buildCommenterPhotoSources(comment, postCompanyLogo),
    [comment, postCompanyLogo],
  );

  /* Optimistic per-comment like state */
  const [liked,      setLiked]      = useState(!!comment.is_liked);
  const [likeCount,  setLikeCount]  = useState(comment.like_count || 0);
  const [likeBusy,   setLikeBusy]   = useState(false);

  const handleCommentLike = useCallback(async (e) => {
    e?.stopPropagation?.();
    if (likeBusy) return;
    const wasLiked = liked;
    // Optimistic flip
    setLiked(!wasLiked);
    setLikeCount((c) => Math.max(0, c + (wasLiked ? -1 : 1)));
    setLikeBusy(true);
    try {
      const res = wasLiked
        ? await service.unlikeComment(comment.id)
        : await service.likeComment(comment.id);
      // If backend confirms a real count, sync
      if (res && typeof res.like_count === 'number' && !res.unsupported) {
        setLikeCount(res.like_count);
      }
    } catch {
      // Revert on failure
      setLiked(wasLiked);
      setLikeCount((c) => Math.max(0, c + (wasLiked ? 1 : -1)));
    } finally {
      setLikeBusy(false);
    }
  }, [liked, likeBusy, comment.id, service]);

  return (
    <Box sx={{
      pl: effectiveDepth * 5,
      mt: depth === 0 ? 1.75 : 1.25,
    }}>
      <Stack direction="row" spacing={1.25} alignItems="flex-start">
        <MultiSrcAvatar
          sources={photoSources}
          initials={comment.initials}
          size={effectiveDepth > 0 ? 30 : 34}
          isCompany={isCompany}
        />

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{
            display: 'inline-block',
            maxWidth: '100%',
            bgcolor: T.cream,
            borderRadius: '12px',
            border: `1px solid ${T.dividerSoft}`,
            px: 1.5,
            py: 1,
          }}>
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ flexWrap: 'wrap' }}>
              <Typography sx={{
                fontSize: '0.82rem',
                fontWeight: 700,
                color: T.ink,
                letterSpacing: '-0.01em',
                lineHeight: 1.2,
              }}>
                {comment.commenter_name || 'User'}
              </Typography>
              {isCompany && (
                <Box sx={{
                  px: 0.6, py: '1px', borderRadius: '4px',
                  bgcolor: '#E6F1FB', color: '#185FA5',
                  fontSize: '0.54rem', fontWeight: 800,
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                }}>
                  Company
                </Box>
              )}
              {isJobseeker && (
                <Box sx={{
                  px: 0.6, py: '1px', borderRadius: '4px',
                  bgcolor: '#E6F1FB', color: '#185FA5',
                  fontSize: '0.54rem', fontWeight: 800,
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                }}>
                  Jobseeker
                </Box>
              )}
              <Typography sx={{
                fontSize: '0.68rem',
                color: T.soft,
                fontWeight: 500,
              }}>
                · {comment.time || 'now'}
              </Typography>
            </Stack>

            <Typography sx={{
              fontSize: '0.85rem',
              color: T.ink,
              lineHeight: 1.5,
              mt: 0.5,
              whiteSpace: 'pre-line',
              wordBreak: 'break-word',
            }}>
              {comment.text}
            </Typography>
          </Box>

          {/* ── Per-comment action pills ─────────────────────────── */}
          <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, pl: 0.5 }}>
            <CommentActionPill
              icon={liked ? FavoriteRounded : FavoriteBorderRounded}
              label="Like"
              count={likeCount}
              active={liked}
              activeColor={T.danger}
              onClick={handleCommentLike}
            />
            <CommentActionPill
              icon={ReplyRounded}
              label="Reply"
              active={isReplyTarget}
              activeColor={T.pine}
              onClick={() => onReplyClick(comment.id)}
            />
          </Stack>

          {/* Inline reply composer */}
          <Collapse in={isReplyTarget} timeout={200} unmountOnExit>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1, mb: 0.5 }}>
              <Avatar
                src={!avatarBroken && currentUserAvatarSrc ? currentUserAvatarSrc : undefined}
                onError={onAvatarError}
                sx={{
                  width: 28, height: 28,
                  bgcolor: T.sage, color: T.white,
                  fontSize: '0.62rem', fontWeight: 800,
                  fontFamily: "'Jost','DM Sans',sans-serif",
                  flexShrink: 0,
                }}
              >
                {currentUserInitials}
              </Avatar>
              <TextField
                value={replyText}
                onChange={(e) => onReplyTextChange(e.target.value)}
                placeholder={`Reply to ${(comment.commenter_name || 'User').split(' ')[0]}…`}
                fullWidth
                size="small"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    onReplySubmit();
                  }
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: T.white,
                    fontSize: '0.82rem',
                    fontFamily: "'Jost','DM Sans',sans-serif",
                    borderRadius: '20px',
                    paddingRight: '4px',
                    minHeight: 36,
                    '& fieldset': { borderColor: T.line },
                    '&:hover fieldset': { borderColor: T.lineSoft },
                    '&.Mui-focused fieldset': { borderColor: T.sage, borderWidth: 1 },
                  },
                  '& .MuiOutlinedInput-input': { py: 0.75, px: 1.5 },
                }}
                slotProps={{
                  input: {
                    endAdornment: (
                      <IconButton
                        onClick={onReplySubmit}
                        disabled={replySubmitting || !replyText.trim()}
                        size="small"
                        sx={{
                          width: 28, height: 28, borderRadius: '50%',
                          bgcolor: replyText.trim() ? T.sage : 'transparent',
                          color: replyText.trim() ? T.white : T.muted,
                          transition: 'all 0.15s ease',
                          '&:hover': { bgcolor: replyText.trim() ? T.pine : T.sageSoft },
                          '&.Mui-disabled': { bgcolor: 'transparent', color: T.lineSoft },
                        }}
                      >
                        {replySubmitting
                          ? <CircularProgress size={12} sx={{ color: T.white }} />
                          : <SendRounded sx={{ fontSize: 14 }} />}
                      </IconButton>
                    ),
                  },
                }}
              />
            </Stack>
          </Collapse>

          {/* Nested replies */}
          {comment.replies && comment.replies.length > 0 && (
            <Box>
              {comment.replies.map((reply) => (
                <CommentRow
                  key={reply.id}
                  comment={reply}
                  postCompanyLogo={postCompanyLogo}
                  service={service}
                  depth={depth + 1}
                  onReplyClick={onReplyClick}
                  replyingToId={replyingToId}
                  replyText={replyText}
                  onReplyTextChange={onReplyTextChange}
                  onReplySubmit={onReplySubmit}
                  replySubmitting={replySubmitting}
                  currentUserAvatarSrc={currentUserAvatarSrc}
                  currentUserInitials={currentUserInitials}
                  avatarBroken={avatarBroken}
                  onAvatarError={onAvatarError}
                />
              ))}
            </Box>
          )}
        </Box>
      </Stack>
    </Box>
  );
};


/* ══════════════════════════════════════════════════════════════════════
   FEED POST CARD  (main export)
   ══════════════════════════════════════════════════════════════════════ */
const FeedPostCard = ({
  post,
  onToggleLike,
  service = defaultFeedService,
  onSubmitComment,
  onOpenCompany,
  onFetchComments,
  onReplyToComment,
  comments = [],
  commentsLoading = false,
  currentUserAvatarSrc = null,
  currentUserInitials = 'YOU',
  isLast = false,
}) => {
  const [expanded,        setExpanded]        = useState(false);
  const [commentText,     setCommentText]     = useState('');
  const [submitting,      setSubmitting]      = useState(false);
  const [avatarBroken,    setAvatarBroken]    = useState(false);
  const [showComments,    setShowComments]    = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);
  const [replyingToId,    setReplyingToId]    = useState(null);
  const [replyText,       setReplyText]       = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);

  const [sortAnchor, setSortAnchor] = useState(null);
  const [sortMode,   setSortMode]   = useState('relevant');

  const composerRef = useRef(null);


  const cardRef     = useRef(null);
  const viewSentRef = useRef(false);

  useEffect(() => {
    const el = cardRef.current;
    if (!el || viewSentRef.current) return undefined;

    let timer = null;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          timer = setTimeout(() => {
            if (!viewSentRef.current) {
              viewSentRef.current = true;
              service.recordView(post.id);
              observer.disconnect();
            }
          }, 1000);
        } else if (timer) {
          clearTimeout(timer);
          timer = null;
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(el);
    return () => { if (timer) clearTimeout(timer); observer.disconnect(); };
  }, [post.id, service]);

  const chip         = TYPE_CHIP[post.post_type] || TYPE_CHIP.UPDATE;
  const isEvent      = post.post_type === 'EVENT';
  const likeCount    = post.like_count    ?? 0;
  const commentCount = post.comment_count ?? 0;

  useEffect(() => {
    if (showComments && onFetchComments) {
      onFetchComments(post.id);
    }
  }, [showComments, post.id, onFetchComments]);

  const handleLikeClick = useCallback((e) => {
    e?.stopPropagation?.();
    onToggleLike?.(post.id);
  }, [onToggleLike, post.id]);

  const handleCommentToggle = useCallback((e) => {
    e?.stopPropagation?.();
    setShowComments((v) => !v);
  }, []);

  const handleCommentSubmit = useCallback(async () => {
    const text = commentText.trim();
    if (!text) return;
    setSubmitting(true);
    const res = await onSubmitComment?.(post.id, text);
    setSubmitting(false);
    if (res) {
      setCommentText('');
      setShowComments(true);
    }
  }, [commentText, onSubmitComment, post.id]);

  const handleReplyClick = useCallback((commentId) => {
    setReplyingToId((cur) => (cur === commentId ? null : commentId));
    setReplyText('');
  }, []);

  const handleReplySubmit = useCallback(async () => {
    const text = replyText.trim();
    if (!text || !replyingToId) return;
    setReplySubmitting(true);
    const res = await onReplyToComment?.(post.id, replyingToId, text);
    setReplySubmitting(false);
    if (res) {
      setReplyText('');
      setReplyingToId(null);
    }
  }, [replyText, replyingToId, onReplyToComment, post.id]);

  const contentIsLong = (post.content || '').length > 220;

  const threadedComments = useMemo(() => {
    if (!comments || comments.length === 0) return [];
    const hasNestedReplies = comments.some((c) => c.replies && c.replies.length > 0);

    let roots;
    if (hasNestedReplies) {
      roots = comments.filter((c) => !c.parent_id);
    } else {
      const map = new Map();
      roots = [];
      comments.forEach((c) => map.set(c.id, { ...c, replies: [] }));
      comments.forEach((c) => {
        const node = map.get(c.id);
        if (c.parent_id && map.has(c.parent_id)) {
          map.get(c.parent_id).replies.push(node);
        } else {
          roots.push(node);
        }
      });
    }

    const byNewest = (a, b) => new Date(b.created_at) - new Date(a.created_at);
    const byOldest = (a, b) => new Date(a.created_at) - new Date(b.created_at);
    if (sortMode === 'newest') return [...roots].sort(byNewest);
    if (sortMode === 'oldest') return [...roots].sort(byOldest);
    return roots;
  }, [comments, sortMode]);

  const visibleComments = showAllComments
    ? threadedComments
    : threadedComments.slice(0, INITIAL_COMMENT_LIMIT);
  const hiddenCommentCount = Math.max(0, threadedComments.length - INITIAL_COMMENT_LIMIT);

  const SORT_LABEL = {
    relevant: 'Most relevant',
    newest:   'Newest',
    oldest:   'Oldest',
  };

  return (
    <Box ref={cardRef} sx={{
      position: 'relative',
      px: { xs: 1.75, sm: 2.25 },
      pt: 2,
      pb: 2,
      bgcolor: T.white,
      border: `1px solid ${T.line}`,
      borderRadius: '14px',
      fontFamily: "'Jost','DM Sans',sans-serif",
      transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
      '&:hover': {
        borderColor: T.lineSoft,
        boxShadow: '0 2px 10px rgba(2,33,36,0.05)',
      },
    }}>
      {post.is_repost && (
        <Typography sx={{
          fontSize: '0.74rem', fontWeight: 700, color: T.soft,
          mb: 1, position: 'relative', zIndex: 1,
        }}>
          🔁 Reposted by {post.repost?.reposted_by}
          {post.repost?.company ? ` · ${post.repost.company}` : ''}
          {post.repost?.note ? ` — “${post.repost.note}”` : ''}
        </Typography>
      )}
      <Stack direction="row" spacing={`${AVATAR_GAP}px`} sx={{ position: 'relative', zIndex: 1 }}>
        <Avatar
          src={post.company?.logo || undefined}
          onClick={() => onOpenCompany?.(post.company_id)}
          sx={{
            width: AVATAR_SIZE, height: AVATAR_SIZE,
            bgcolor: T.sageSoft, color: T.sageText,
            fontSize: '0.85rem', fontWeight: 800,
            fontFamily: "'Jost','DM Sans',sans-serif",
            flexShrink: 0,
            cursor: 'pointer',
            transition: 'transform 0.15s ease',
            '&:hover': { transform: 'scale(1.04)' },
          }}
        >
          {post.initials}
        </Avatar>

        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack direction="row" alignItems="center" spacing={0.75}>
            <Typography sx={{
              fontSize: '0.86rem', fontWeight: 700, color: T.ink,
              letterSpacing: '-0.01em',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              maxWidth: 200,
            }}>
              {post.company?.name || 'Company'}
            </Typography>
            <Box sx={{
              px: 0.75, py: '1px', borderRadius: '4px',
              bgcolor: chip.bg, color: chip.color,
              fontSize: '0.58rem', fontWeight: 800,
              letterSpacing: '0.06em', textTransform: 'uppercase',
              flexShrink: 0,
            }}>
              {chip.label}
            </Box>
            <Box sx={{ flex: 1 }} />
            <Typography sx={{
              fontSize: '0.7rem', color: T.muted, fontWeight: 600, flexShrink: 0,
            }}>
              {post.time}
            </Typography>
          </Stack>

          {post.title && (
            <Typography sx={{
              fontSize: '0.94rem', fontWeight: 700, color: T.ink,
              letterSpacing: '-0.015em', lineHeight: 1.3, mt: 0.6, mb: 0.5,
            }}>
              {post.title}
            </Typography>
          )}

          {post.content && (
            <>
              <Typography sx={{
                fontSize: '0.85rem', color: T.muted, lineHeight: 1.55,
                display: expanded ? 'block' : '-webkit-box',
                WebkitLineClamp: expanded ? 'unset' : 3,
                WebkitBoxOrient: 'vertical', overflow: 'hidden',
                whiteSpace: 'pre-line',
              }}>
                {post.content}
              </Typography>
              {contentIsLong && (
                <Button
                  onClick={() => setExpanded((v) => !v)}
                  disableRipple
                  sx={{
                    textTransform: 'none', fontFamily: "'Jost','DM Sans',sans-serif",
                    fontSize: '0.74rem', fontWeight: 700,
                    color: T.sageText, px: 0, mt: 0.25, minWidth: 0,
                    '&:hover': { bgcolor: 'transparent', color: T.pine },
                  }}
                >
                  {expanded ? 'Show less' : 'Read more'}
                </Button>
              )}
            </>
          )}

          <PostMedia post={post} />

          {isEvent && (post.event_date || post.event_location) && (
            <Stack direction="row" spacing={1.75} sx={{
              mt: 1.25, px: 1.25, py: 0.75,
              bgcolor: T.cream, borderRadius: '10px',
              border: `1px solid ${T.line}`,
            }}>
              {post.event_date && (
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <CalendarTodayRounded sx={{ fontSize: 14, color: T.sage }} />
                  <Typography sx={{ fontSize: '0.76rem', color: T.muted, fontWeight: 600 }}>
                    {formatEventDate(post.event_date)}
                  </Typography>
                </Stack>
              )}
              {post.event_location && (
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <LocationOnOutlined sx={{ fontSize: 14, color: T.sage }} />
                  <Typography sx={{ fontSize: '0.76rem', color: T.muted, fontWeight: 600 }}>
                    {post.event_location}
                  </Typography>
                </Stack>
              )}
            </Stack>
          )}

          {/* Reactions summary row — Direction F social-feed style */}
          {(likeCount > 0 || commentCount > 0) && (
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{
                mt: 1.5, py: 1,
                borderTop: `1px solid ${T.dividerSoft}`,
                borderBottom: `1px solid ${T.dividerSoft}`,
                fontSize: '0.75rem', color: T.muted, fontWeight: 600,
              }}
            >
              <Stack direction="row" alignItems="center" spacing={0.75}>
                {likeCount > 0 && (
                  <>
                    <Box sx={{
                      width: 20, height: 20, borderRadius: '50%',
                      bgcolor: T.danger, color: T.white,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      border: `1.5px solid ${T.white}`,
                      boxShadow: '0 0 0 1px ' + T.dividerSoft,
                    }}>
                      <FavoriteRounded sx={{ fontSize: 11 }} />
                    </Box>
                    <span>{likeCount} {likeCount === 1 ? 'reaction' : 'reactions'}</span>
                  </>
                )}
              </Stack>
              {commentCount > 0 && (
                <Box
                  component="span"
                  role="button"
                  onClick={handleCommentToggle}
                  sx={{ cursor: 'pointer', '&:hover': { color: T.pine } }}
                >
                  {commentCount} {commentCount === 1 ? 'comment' : 'comments'}
                </Box>
              )}
            </Stack>
          )}

          {/* Main action bar — Direction F: Like | Comment | Share (3 columns) */}
          <Stack direction="row" sx={{
            mt: (likeCount > 0 || commentCount > 0) ? 0.5 : 1.5,
            borderTop: (likeCount > 0 || commentCount > 0) ? 'none' : `1px solid ${T.dividerSoft}`,
            pt: (likeCount > 0 || commentCount > 0) ? 0 : 1,
          }}>
            <Box
              role="button"
              onClick={handleLikeClick}
              sx={{
                flex: 1,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 0.75,
                py: 0.9, borderRadius: '8px',
                fontSize: '0.8rem', fontWeight: 700,
                cursor: 'pointer', userSelect: 'none',
                transition: 'all 0.15s ease',
                color: post.is_liked ? T.danger : T.muted,
                '&:hover': {
                  bgcolor: post.is_liked ? T.dangerBg : T.hoverBg,
                  color: post.is_liked ? T.danger : T.pine,
                },
              }}
            >
              {post.is_liked
                ? <FavoriteRounded sx={{ fontSize: 18 }} />
                : <FavoriteBorderRounded sx={{ fontSize: 18 }} />}
              <span>Like</span>
            </Box>

            <Box
              role="button"
              onClick={handleCommentToggle}
              sx={{
                flex: 1,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 0.75,
                py: 0.9, borderRadius: '8px',
                fontSize: '0.8rem', fontWeight: 700,
                cursor: 'pointer', userSelect: 'none',
                transition: 'all 0.15s ease',
                color: showComments ? T.pine : T.muted,
                bgcolor: showComments ? T.sageSoft : 'transparent',
                '&:hover': { bgcolor: T.hoverBg, color: T.pine },
              }}
            >
              <ChatBubbleOutlineRounded sx={{ fontSize: 18 }} />
              <span>Comment</span>
            </Box>

            <Box
              role="button"
              onClick={() => {
                const url = window.location.href;
                const title = post.title || 'Company post';
                if (navigator.share) {
                  navigator.share({ title, text: post.content || '', url }).catch(() => {});
                } else if (navigator.clipboard) {
                  navigator.clipboard.writeText(url).catch(() => {});
                }
              }}
              sx={{
                flex: 1,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 0.75,
                py: 0.9, borderRadius: '8px',
                fontSize: '0.8rem', fontWeight: 700,
                cursor: 'pointer', userSelect: 'none',
                transition: 'all 0.15s ease',
                color: T.muted,
                '&:hover': { bgcolor: T.hoverBg, color: T.pine },
              }}
            >
              <SendRounded sx={{ fontSize: 18, transform: 'rotate(-20deg)' }} />
              <span>Share</span>
            </Box>
          </Stack>

          {/* Comments section */}
          <Collapse in={showComments} timeout={250}>
            <Box sx={{
              mt: 1.5, pt: 1.5,
              borderTop: `1px solid ${T.dividerSoft}`,
            }}>
              <Stack
                ref={composerRef}
                direction="row"
                spacing={1.25}
                alignItems="center"
                sx={{ mb: 2 }}
              >
                <Avatar
                  src={!avatarBroken && currentUserAvatarSrc ? currentUserAvatarSrc : undefined}
                  onError={() => setAvatarBroken(true)}
                  sx={{
                    width: 34, height: 34,
                    bgcolor: T.sage, color: T.white,
                    fontSize: '0.72rem', fontWeight: 800,
                    fontFamily: "'Jost','DM Sans',sans-serif",
                    flexShrink: 0,
                  }}
                >
                  {currentUserInitials}
                </Avatar>
                <TextField
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment…"
                  fullWidth
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleCommentSubmit();
                    }
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: T.white,
                      fontSize: '0.88rem',
                      fontFamily: "'Jost','DM Sans',sans-serif",
                      borderRadius: '999px',
                      paddingRight: '6px',
                      minHeight: 42,
                      '& fieldset': { borderColor: T.line },
                      '&:hover fieldset': { borderColor: T.lineSoft },
                      '&.Mui-focused fieldset': { borderColor: T.sage, borderWidth: 1 },
                    },
                    '& .MuiOutlinedInput-input': { py: 1, px: 1.5 },
                  }}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <IconButton
                          onClick={handleCommentSubmit}
                          disabled={submitting || !commentText.trim()}
                          sx={{
                            width: 34, height: 34, borderRadius: '50%',
                            bgcolor: commentText.trim() ? T.sage : 'transparent',
                            color: commentText.trim() ? T.white : T.muted,
                            transition: 'all 0.15s ease',
                            '&:hover': { bgcolor: commentText.trim() ? T.pine : T.sageSoft },
                            '&.Mui-disabled': { bgcolor: 'transparent', color: T.lineSoft },
                          }}
                        >
                          {submitting
                            ? <CircularProgress size={16} sx={{ color: T.white }} />
                            : <SendRounded sx={{ fontSize: 17 }} />}
                        </IconButton>
                      ),
                    },
                  }}
                />
              </Stack>

              {threadedComments.length > 0 && (
                <>
                  <Box
                    role="button"
                    onClick={(e) => setSortAnchor(e.currentTarget)}
                    sx={{
                      display: 'inline-flex', alignItems: 'center', gap: 0.25,
                      cursor: 'pointer',
                      px: 0.5, py: 0.25, borderRadius: '6px',
                      '&:hover': { bgcolor: T.hoverBg },
                    }}
                  >
                    <Typography sx={{
                      fontSize: '0.75rem', fontWeight: 700, color: T.soft,
                      letterSpacing: '-0.01em',
                    }}>
                      {SORT_LABEL[sortMode]}
                    </Typography>
                    <KeyboardArrowDownRounded sx={{ fontSize: 16, color: T.soft }} />
                  </Box>
                  <Menu
                    anchorEl={sortAnchor}
                    open={Boolean(sortAnchor)}
                    onClose={() => setSortAnchor(null)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                    slotProps={{
                      paper: {
                        sx: {
                          mt: 0.5, borderRadius: '10px',
                          border: `1px solid ${T.line}`,
                          boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                          minWidth: 160,
                        },
                      },
                    }}
                  >
                    {[
                      { key: 'relevant', label: 'Most relevant' },
                      { key: 'newest',   label: 'Newest first'  },
                      { key: 'oldest',   label: 'Oldest first'  },
                    ].map((opt) => (
                      <MenuItem
                        key={opt.key}
                        selected={sortMode === opt.key}
                        onClick={() => { setSortMode(opt.key); setSortAnchor(null); }}
                        sx={{
                          fontFamily: "'Jost','DM Sans',sans-serif",
                          fontSize: '0.82rem',
                          fontWeight: sortMode === opt.key ? 700 : 500,
                          color: sortMode === opt.key ? T.pine : T.ink,
                          '&.Mui-selected': { bgcolor: T.sageSoft },
                          '&:hover': { bgcolor: T.hoverBg },
                        }}
                      >
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Menu>
                </>
              )}

              {commentsLoading && (
                <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 1.5 }}>
                  <CircularProgress size={16} sx={{ color: T.sage }} />
                  <Typography sx={{ fontSize: '0.76rem', color: T.muted, fontWeight: 600 }}>
                    Loading comments…
                  </Typography>
                </Stack>
              )}

              {!commentsLoading && threadedComments.length === 0 && (
                <Typography sx={{
                  fontSize: '0.8rem', color: T.soft, fontWeight: 500,
                  py: 1, fontStyle: 'italic',
                }}>
                  Be the first to comment.
                </Typography>
              )}

              {!commentsLoading && visibleComments.length > 0 && (
                <Box>
                  {visibleComments.map((c) => (
                    <CommentRow
                      key={c.id}
                      comment={c}
                      postCompanyLogo={post.company?.logo}
                      service={service}
                      depth={0}
                      onReplyClick={handleReplyClick}
                      replyingToId={replyingToId}
                      replyText={replyText}
                      onReplyTextChange={setReplyText}
                      onReplySubmit={handleReplySubmit}
                      replySubmitting={replySubmitting}
                      currentUserAvatarSrc={currentUserAvatarSrc}
                      currentUserInitials={currentUserInitials}
                      avatarBroken={avatarBroken}
                      onAvatarError={() => setAvatarBroken(true)}
                    />
                  ))}
                </Box>
              )}

              {!commentsLoading && hiddenCommentCount > 0 && !showAllComments && (
                <Box
                  role="button"
                  onClick={() => setShowAllComments(true)}
                  sx={{
                    mt: 1.5, fontSize: '0.8rem', fontWeight: 700,
                    color: T.sageText, cursor: 'pointer', display: 'inline-block',
                    '&:hover': { color: T.pine, textDecoration: 'underline' },
                  }}
                >
                  See {hiddenCommentCount} more comment{hiddenCommentCount === 1 ? '' : 's'}
                </Box>
              )}

              {!commentsLoading && showAllComments && threadedComments.length > INITIAL_COMMENT_LIMIT && (
                <Box
                  role="button"
                  onClick={() => setShowAllComments(false)}
                  sx={{
                    mt: 1.5, fontSize: '0.8rem', fontWeight: 700,
                    color: T.sageText, cursor: 'pointer', display: 'inline-block',
                    '&:hover': { color: T.pine, textDecoration: 'underline' },
                  }}
                >
                  Show fewer comments
                </Box>
              )}
            </Box>
          </Collapse>
        </Box>
      </Stack>
    </Box>
  );
};

export default React.memo(FeedPostCard);