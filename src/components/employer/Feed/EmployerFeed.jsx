import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box, Stack, Typography, Button, CircularProgress, Alert, Skeleton,
  Pagination,
} from '@mui/material';
import { ArrowBackRounded, CampaignOutlined, RefreshRounded } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

import { useEmployerFeed }  from '@/hooks/employer/useEmployerFeed';
import { useAuth }          from '@/hooks/useAuth';
import { getInitials }      from '@/utils/formatters';
import employerFeedService  from '@/services/api/employer/employerFeedService';
import FeedPostCard  from '@/components/jobseeker/Feed/FeedPostCard';
import FeedFilterBar from '@/components/jobseeker/Feed/FeedFilterBar';

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

/* Skeleton row while loading */
const SkeletonRow = ({ isLast }) => (
  <Box sx={{
    px: { xs: 1.75, sm: 2.25 }, pt: 2, pb: 2,
    borderBottom: isLast ? 'none' : `1px solid ${T.dividerSoft}`,
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

const EmployerFeed = () => {
  const navigate = useNavigate();
  const { user }  = useAuth();

  const {
    posts, total, totalPages, currentPage, hasMore,
    loading, loadingMore, error,
    postType, setFilterType,
    goToPage, loadMore, pageSize,
    toggleLike, submitComment,
    commentsMap, commentsLoading, fetchComments, replyToComment,
    refresh,
  } = useEmployerFeed();

  /* ── User avatar (mirrors Topbar.jsx) ────────────────────────────── */
  const [avatarSrc, setAvatarSrc] = useState(
    () => localStorage.getItem('user_profile_image_url') || null,
  );
  useEffect(() => {
    const handler = (e) => { if (e.detail?.url) setAvatarSrc(e.detail.url); };
    window.addEventListener('profile-image-updated', handler);
    return () => window.removeEventListener('profile-image-updated', handler);
  }, []);

  const currentUserInitials = useMemo(
    () => getInitials(user?.full_name || user?.email) || 'YOU',
    [user],
  );

  /* Infinite scroll sentinel */
  const sentinelRef = useRef(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) loadMore();
    }, { rootMargin: '400px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loadMore, posts.length]);

  const isEmpty = !loading && !error && posts.length === 0;

  return (
    <Box sx={{
      p: { xs: 2, sm: 2.5, md: 3 },
      fontFamily: "'Jost','DM Sans',sans-serif",
      minHeight: '100%',
      bgcolor: T.cream,
    }}>
      {/* Header */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'flex-end' }}
        justifyContent="space-between"
        spacing={1.5}
        sx={{ mb: 2 }}
      >
        <Box>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <ArrowBackRounded
              onClick={() => navigate('/employer/overview')}
              sx={{
                fontSize: 22, color: T.muted, cursor: 'pointer',
                borderRadius: '8px', p: 0.25,
                '&:hover': { color: T.ink, bgcolor: 'rgba(127,158,126,0.10)' },
              }}
            />
            <CampaignOutlined sx={{ fontSize: 22, color: T.sage }} />
            <Typography sx={{
              fontSize: { xs: '1.15rem', sm: '1.4rem' },
              fontWeight: 800, color: T.ink,
              letterSpacing: '-0.02em', lineHeight: 1.15,
            }}>
              Company Feed
            </Typography>
          </Stack>
          <Typography sx={{
            fontSize: '0.7rem', color: T.muted,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            fontWeight: 600, mt: 0.5,
          }}>
            Announcements, news & events from your company
            {total > 0 ? ` · ${total} total` : ''}
          </Typography>
        </Box>

        <Button
          onClick={() => refresh()}
          startIcon={<RefreshRounded sx={{ fontSize: 16 }} />}
          disableRipple
          sx={{
            textTransform: 'none', fontFamily: "'Jost','DM Sans',sans-serif",
            fontSize: '0.8rem', fontWeight: 700, color: T.pine,
            border: `1px solid ${T.line}`, bgcolor: T.white,
            px: 1.75, py: 0.75, borderRadius: '10px',
            '&:hover': { bgcolor: T.sageSoft, borderColor: T.lineSoft },
          }}
        >
          Refresh
        </Button>
      </Stack>

      {/* Filter bar */}
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2, flexWrap: 'wrap', rowGap: 1 }}>
        <FeedFilterBar
          activeType={postType}
          totalCount={total}
          onChange={setFilterType}
        />
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

     {/* Single-column layout — employer sees only their own company */}
      <Box sx={{ maxWidth: 780, mx: 'auto', minWidth: 0 }}>
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
            <Box sx={{
              bgcolor: T.white, border: `1px solid ${T.line}`,
              borderRadius: '14px', overflow: 'hidden',
            }}>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow isLast />
            </Box>
          )}

          {isEmpty && (
            <Box sx={{
              bgcolor: T.white, border: `1px dashed ${T.lineSoft}`,
              borderRadius: '14px', p: 5, textAlign: 'center',
            }}>
              <CampaignOutlined sx={{ fontSize: 40, color: T.lineSoft, mb: 1.5 }} />
              <Typography sx={{
                fontSize: '0.95rem', fontWeight: 700, color: T.ink, mb: 0.5,
              }}>
                No posts yet
              </Typography>
              <Typography sx={{ fontSize: '0.8rem', color: T.muted }}>
                {postType
                  ? 'No posts match this filter. Try another category.'
                  : 'Announcements, news and events from your company will appear here.'}
              </Typography>
            </Box>
          )}

          {!loading && posts.length > 0 && (
            <Stack spacing={2.5}>
              {posts.map((post, i) => (
                <FeedPostCard
                  key={`${post.id}-${i}`}
                  post={post}
                  service={employerFeedService}
                  onToggleLike={toggleLike}
                  onSubmitComment={submitComment}
                  onFetchComments={fetchComments}
                  onReplyToComment={replyToComment}
                  comments={commentsMap[post.id] || []}
                  commentsLoading={!!commentsLoading[post.id]}
                  currentUserAvatarSrc={avatarSrc}
                  currentUserInitials={currentUserInitials}
                  isLast={i === posts.length - 1}
                />
              ))}
            </Stack>
          )}

          {/* Infinite-scroll sentinel + spinner */}
          {hasMore && !loading && (
            <Box ref={sentinelRef} sx={{ py: 2, textAlign: 'center' }}>
              {loadingMore && <CircularProgress size={22} sx={{ color: T.sage }} />}
            </Box>
          )}
      </Box>
    </Box>
  );
};

export default EmployerFeed;