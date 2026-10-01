

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box, Stack, Typography, Button, CircularProgress, Alert, Skeleton,
  Pagination, useMediaQuery, useTheme, IconButton,
} from '@mui/material';
import {
    CampaignOutlined, RefreshRounded, CloseRounded, ExpandMoreRounded, ArrowBackRounded,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

import { useJobseekerFeed } from '@/hooks/jobseeker/useJobseekerFeed';
import { useAuth }          from '@/hooks/useAuth';
import { getInitials }      from '@/utils/formatters';
import { ROLES }            from '@/constants';
import FeedPostCard  from '@/components/jobseeker/Feed/FeedPostCard';
import FeedFilterBar from '@/components/jobseeker/Feed/FeedFilterBar';
import FeedRightRail from '@/components/jobseeker/Feed/FeedRightRail';

const T = {
  ink:      '#101210',
  sage:     '#7F9E7E',
  sageText: '#5E815D',
  pine:     '#022124',
  cream:    '#F6F8F3',
  white:    '#FFFFFF',
  muted:    '#55584F',
  line:     '#E7EAE3',
  lineSoft: '#D8DDD4',
  sageSoft: '#EDF3EC',
  dividerSoft: '#F0F2ED',
};

/* 🔧 CHANGE 1/4 — how many cards are visible before "View more" */
const INITIAL_VISIBLE = 12;

/* Slim scrollbar for the sticky rail wrapper */
const railScrollbarSx = {
  '&::-webkit-scrollbar':        { width: 6 },
  '&::-webkit-scrollbar-track':  { background: 'transparent' },
  '&::-webkit-scrollbar-thumb':  { background: T.lineSoft, borderRadius: 4 },
  '&::-webkit-scrollbar-thumb:hover': { background: T.sage },
  scrollbarWidth: 'thin',
  scrollbarColor: `${T.lineSoft} transparent`,
};

/* Skeleton is a standalone card (matches post cards) */
const SkeletonRow = () => (
  <Box sx={{
    px: { xs: 1.75, sm: 2.25 }, pt: 2, pb: 2,
    bgcolor: T.white,
    border: `1px solid ${T.line}`,
    borderRadius: '14px',
  }}>
    <Stack direction="row" spacing={1.5}>
      <Skeleton variant="circular" width={42} height={42} sx={{ flexShrink: 0 }} />
      <Box sx={{ flex: 1 }}>
        <Skeleton width="40%" height={14} />
        <Skeleton width="70%" height={18} sx={{ mt: 0.75 }} />
        <Skeleton width="95%" height={14} />
        <Skeleton width="88%" height={14} />
      </Box>
    </Stack>
  </Box>
);

const JobseekerFeed = () => {
  const theme      = useTheme();
  const isDesktop  = useMediaQuery(theme.breakpoints.up('md'));
  const navigate   = useNavigate();
  const { user, role } = useAuth();

  const {
    posts, total, totalPages, currentPage, hasMore,
    loading, loadingMore, error,
    postType, companyId,
    setFilterType, setFilterCompany,
    goToPage, loadMore, pageSize,
    toggleLike, submitComment,
    commentsMap, commentsLoading, fetchComments, replyToComment,
    upcomingEvents, refresh,
  } = useJobseekerFeed();

  /* 🔧 CHANGE 1/4 — display cap state (client-side only) */
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);

  /* 🔧 CHANGE 2/4 — collapse back to 12 when the list context changes */
  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE);
  }, [postType, companyId, currentPage]);

  /* ── User avatar (mirrors Topbar.jsx) ────────────────────────────── */
  const [avatarSrc, setAvatarSrc] = useState(
    () => localStorage.getItem('user_profile_image_url') || null,
  );
  useEffect(() => {
    if (role === ROLES.JOBSEEKER && user?.id) {
      setAvatarSrc(`/api/jobseeker/photo/${user.id}/`);
    }
  }, [user?.id, role]);

  useEffect(() => {
    const handler = (e) => { if (e.detail?.url) setAvatarSrc(e.detail.url); };
    window.addEventListener('profile-image-updated', handler);
    return () => window.removeEventListener('profile-image-updated', handler);
  }, []);

  const currentUserInitials = useMemo(
    () => getInitials(user?.full_name || user?.email) || 'YOU',
    [user],
  );

  /* 🔧 CHANGE 3/4 — only the first `visibleCount` cards render */
  const visiblePosts    = useMemo(() => posts.slice(0, visibleCount), [posts, visibleCount]);
  const hiddenLocal     = Math.max(0, posts.length - visibleCount);
  const allLocalVisible = hiddenLocal === 0;

  /* Infinite scroll sentinel — unchanged, but the sentinel element only
     mounts once all local cards are revealed (see CHANGE 4/4 below) */
  const sentinelRef = useRef(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) loadMore();
    }, { rootMargin: '400px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loadMore, posts.length, allLocalVisible]);

  const selectedCompany = useMemo(() => {
    if (!companyId) return null;
    const hit = posts.find((p) => p.company?.id === companyId);
    return hit?.company?.name || 'Selected company';
  }, [companyId, posts]);

  const isEmpty = !loading && !error && posts.length === 0;

  return (
    <Box sx={{
      p: { xs: 2, sm: 2.5, md: 3 },
      fontFamily: "'Jost','DM Sans',sans-serif",
      minHeight: '100%',
      bgcolor: T.cream,
    }}>
      {/* Header */}
      <Box sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <IconButton onClick={() => navigate('/jobseeker/overview')} sx={{ p: 0.5, color: T.pine, '&:hover': { bgcolor: T.sageSoft } }}>
            <ArrowBackRounded sx={{ fontSize: 22 }} />
          </IconButton>
          <CampaignOutlined sx={{ fontSize: 22, color: T.sage }} />
          <Typography sx={{
            fontSize: { xs: '1.15rem', sm: '1.4rem' },
            fontWeight: 800, color: T.ink,
            letterSpacing: '-0.02em', lineHeight: 1.15,
          }}>
            Company Feed
          </Typography>
        </Stack>
        {/* 🔧 CHANGE 5/5 — Refresh sits INLINE at the end of the subtitle
            line, immediately after "· N total" on the same line */}
        <Stack
          direction="row"
          alignItems="center"
          spacing={1.25}
          sx={{ mt: 0.5, flexWrap: 'wrap', rowGap: 0.75 }}
        >
          <Typography sx={{
            fontSize: '0.7rem', color: T.muted,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            fontWeight: 600,
          }}>
            News, updates & events from companies on IEvalx
            {total > 0 ? ` · ${total} total` : ''}
          </Typography>
          <Button
            onClick={() => refresh()}
            startIcon={<RefreshRounded sx={{ fontSize: 14 }} />}
            disableRipple
            size="small"
            sx={{
              textTransform: 'none', fontFamily: "'Jost','DM Sans',sans-serif",
              fontSize: '0.72rem', fontWeight: 700, color: T.pine,
              border: `1px solid ${T.line}`, bgcolor: T.white,
              px: 1.25, py: 0.25, borderRadius: '999px',
              minWidth: 0, flexShrink: 0, lineHeight: 1.2,
              '& .MuiButton-startIcon': { mr: 0.5 },
              '&:hover': { bgcolor: T.sageSoft, borderColor: T.lineSoft },
            }}
          >
            Refresh
          </Button>
        </Stack>
      </Box>

      {/* Filter bar + active company chip */}
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2, flexWrap: 'wrap', rowGap: 1 }}>
        <FeedFilterBar
          activeType={postType}
          totalCount={total}
          onChange={setFilterType}
        />
        {companyId && (
          <Box
            role="button"
            onClick={() => setFilterCompany(null)}
            sx={{
              display: 'inline-flex', alignItems: 'center', gap: 0.5,
              px: 1.25, py: 0.5, borderRadius: '999px',
              fontSize: '0.75rem', fontWeight: 700,
              bgcolor: T.pine, color: T.white,
              border: `1px solid ${T.pine}`,
              cursor: 'pointer',
              '&:hover': { bgcolor: '#053438' },
            }}
          >
            <Box sx={{ fontSize: '0.72rem', opacity: 0.75 }}>Company:</Box>
            <Box sx={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selectedCompany}
            </Box>
            <CloseRounded sx={{ fontSize: 14 }} />
          </Box>
        )}
      </Stack>

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{
          display: 'flex',
          justifyContent: { xs: 'center', sm: 'space-between' },
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 1,
          mb: 2,
          px: 1.5, py: 1,
          bgcolor: T.white,
          border: `1px solid ${T.line}`,
          borderRadius: '12px',
        }}>
          <Typography sx={{
            fontSize: '0.72rem', color: T.muted, fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>
            Page {currentPage} of {totalPages} · {pageSize} per page
          </Typography>
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={(_e, page) => goToPage(page)}
            shape="rounded"
            size="small"
            siblingCount={1}
            boundaryCount={1}
            sx={{
              '& .MuiPaginationItem-root': {
                fontFamily: "'Jost','DM Sans',sans-serif",
                fontSize: '0.78rem', fontWeight: 700,
                color: T.muted,
                borderRadius: '8px',
                minWidth: 30, height: 30,
                '&:hover': { bgcolor: T.sageSoft, color: T.pine },
              },
              '& .MuiPaginationItem-root.Mui-selected': {
                bgcolor: T.pine, color: T.white,
                '&:hover': { bgcolor: '#053438' },
              },
            }}
          />
        </Box>
      )}

      {/* Two-column layout */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: isDesktop ? 'minmax(0, 1fr) 300px' : 'minmax(0, 1fr)',
        gap: 2,
        alignItems: 'start',
      }}>
        {/* Center */}
        <Box sx={{ minWidth: 0 }}>
          {error && (
            <Alert
              severity="error"
              sx={{ mb: 2, borderRadius: '10px' }}
              action={
                <Button size="small" onClick={() => refresh()} sx={{ fontWeight: 700 }}>
                  Retry
                </Button>
              }
            >
              {error}
            </Alert>
          )}

          {loading && (
            <Stack spacing={2}>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </Stack>
          )}

          {isEmpty && (
            <Box sx={{
              bgcolor: T.white, border: `1px dashed ${T.lineSoft}`,
              borderRadius: '14px', p: 5, textAlign: 'center',
            }}>
              <CampaignOutlined sx={{ fontSize: 40, color: T.lineSoft, mb: 1.5 }} />
              <Typography sx={{
                fontSize: '0.95rem', fontWeight: 700, color: T.ink,
                letterSpacing: '-0.01em',
              }}>
                No posts to show
              </Typography>
              <Typography sx={{
                fontSize: '0.82rem', color: T.muted, mt: 0.75, mb: 2.5,
              }}>
                {companyId
                  ? 'This company has no posts under the current filter.'
                  : postType
                    ? `Nothing published yet under "${postType.toLowerCase()}". Try another filter.`
                    : 'Check back soon — companies post updates here regularly.'}
              </Typography>
              {(postType || companyId) && (
                <Button
                  onClick={() => { setFilterType(null); setFilterCompany(null); }}
                  sx={{
                    textTransform: 'none', fontFamily: "'Jost','DM Sans',sans-serif",
                    fontSize: '0.82rem', fontWeight: 700,
                    color: T.white, bgcolor: T.sage,
                    px: 2, py: 0.75, borderRadius: '10px',
                    '&:hover': { bgcolor: T.pine },
                  }}
                >
                  Clear filters
                </Button>
              )}
            </Box>
          )}

          {/* 🔧 CHANGE 3/4 — separated cards, capped at visibleCount */}
          {!loading && visiblePosts.length > 0 && (
            <Stack spacing={2}>
              {visiblePosts.map((post, idx) => (
                <FeedPostCard
                  key={post.id}
                  post={post}
                  isLast={idx === visiblePosts.length - 1 && allLocalVisible && !hasMore}
                  currentUserAvatarSrc={avatarSrc}
                  currentUserInitials={currentUserInitials}
                  onToggleLike={toggleLike}
                  onSubmitComment={submitComment}
                  onOpenCompany={(cid) => cid && setFilterCompany(cid)}
                  comments={commentsMap[post.id] || []}
                  commentsLoading={!!commentsLoading[post.id]}
                  onFetchComments={fetchComments}
                  onReplyToComment={replyToComment}
                />
              ))}
            </Stack>
          )}

          {/* 🔧 CHANGE 3/4 — "View more" reveals the rest of the loaded list */}
          {!loading && hiddenLocal > 0 && (
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <Button
                onClick={() => setVisibleCount(posts.length)}
                endIcon={<ExpandMoreRounded sx={{ fontSize: 18 }} />}
                disableRipple
                sx={{
                  textTransform: 'none', fontFamily: "'Jost','DM Sans',sans-serif",
                  fontSize: '0.82rem', fontWeight: 700, color: T.sageText,
                  border: `1px solid ${T.line}`, bgcolor: T.white,
                  px: 2.5, py: 0.85, borderRadius: '999px',
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    bgcolor: T.sageSoft, color: T.pine, borderColor: T.lineSoft,
                    boxShadow: '0 2px 10px rgba(2,33,36,0.06)',
                  },
                }}
              >
                View {hiddenLocal} more post{hiddenLocal === 1 ? '' : 's'}
              </Button>
            </Box>
          )}

          {/* 🔧 CHANGE 4/4 — server "load more" only after all local cards shown */}
          {allLocalVisible && hasMore && !loading && (
            <Box ref={sentinelRef} sx={{ textAlign: 'center', py: 2 }}>
              {loadingMore
                ? <CircularProgress size={22} sx={{ color: T.sage }} />
                : (
                  <Button
                    onClick={loadMore}
                    sx={{
                      textTransform: 'none', fontFamily: "'Jost','DM Sans',sans-serif",
                      fontSize: '0.8rem', fontWeight: 700, color: T.sageText,
                      border: `1px solid ${T.line}`, bgcolor: T.white,
                      px: 2, py: 0.75, borderRadius: '10px',
                      '&:hover': { bgcolor: T.sageSoft, color: T.pine },
                    }}
                  >
                    Load more posts
                  </Button>
                )}
            </Box>
          )}

          {allLocalVisible && !hasMore && !loading && posts.length > 0 && (
            <Typography sx={{
              textAlign: 'center', fontSize: '0.72rem', color: T.muted,
              py: 2, fontWeight: 600,
            }}>
              You're all caught up.
            </Typography>
          )}
        </Box>

        {/* Right rail — STICKY & bounded */}
        {isDesktop && (
          <Box sx={{
            position: 'sticky',
            top: 16,
            alignSelf: 'flex-start',    // critical: without this, grid stretches the item
            maxHeight: 'calc(100vh - 32px)',
            overflowY: 'auto',
            overflowX: 'hidden',
            pr: 0.5,
            mr: -0.5,
            ...railScrollbarSx,
          }}>
            <FeedRightRail
              upcomingEvents={upcomingEvents}
              posts={posts}
              activeCompanyId={companyId}
              onCompanyClick={setFilterCompany}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default JobseekerFeed;