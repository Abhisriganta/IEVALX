// ============================================================================
// JobseekerNotifications.jsx
// Full-page /jobseeker/notifications — sage/cream aesthetic, matched to
// the feed page. Backed by the real-API `useNotifications` store so the
// Topbar badge stays in sync when items are read here.
//
// v3 update — expanded KINDS + NOTIF_ICON to cover the full v3 event matrix:
//   application · interview · assessment · offer · profile ·
//   message · announcement · post · job_match
//
// Also: rows now deep-link to their `actionUrl` (set server-side per event).
//
// Location: src/components/jobseeker/Notifications/JobseekerNotifications.jsx
// ============================================================================

import React, { useMemo, useState } from 'react'
import {
  Box, Stack, Typography, Button, Chip, IconButton, CircularProgress,
} from '@mui/material';
import {
  NotificationsNone,
  EventAvailableRounded, DescriptionOutlined, WorkOutlineRounded,
  EmojiEventsOutlined, PersonOutlineRounded,
  ChatBubbleOutlineRounded, CampaignOutlined, ForumOutlined,
  BoltRounded,
  CircleRounded, DoneAllRounded, DeleteSweepRounded,
    ChevronLeftRounded, ChevronRightRounded, ArrowBackRounded,
} from '@mui/icons-material';

import { useNavigate } from 'react-router-dom';
import { useNotifications } from '@/hooks/jobseeker/useNotifications';

/* ── Palette ─────────────────────────────────────────────────────────── */
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
  danger:   '#EF4444',
};

/* ── NOTIF_ICON — full v3 kind palette ───────────────────────────────── */
const NOTIF_ICON = {
  application:  { Icon: WorkOutlineRounded,   bg: T.sageSoft,  color: T.sageText, label: 'Application' },
  interview:    { Icon: EventAvailableRounded, bg: '#EAF0F6',   color: '#3C5A78',  label: 'Interview'   },
  assessment:   { Icon: DescriptionOutlined,   bg: '#FFF6E5',   color: '#8A6A1F',  label: 'Assessment'  },
  offer:        { Icon: EmojiEventsOutlined,   bg: '#F3EAFA',   color: '#6D3AAF',  label: 'Offer'       },
  profile:      { Icon: PersonOutlineRounded,  bg: '#E9EFEA',   color: '#022124',  label: 'Profile'     },
  message:      { Icon: ChatBubbleOutlineRounded, bg: '#EAF6F5', color: '#0E6B65', label: 'Message'     },
  announcement: { Icon: CampaignOutlined,      bg: '#FEF4E6',   color: '#A65A00',  label: 'Announcement'},
  post:         { Icon: ForumOutlined,         bg: '#EDEEFA',   color: '#3B4A9E',  label: 'Post'        },
  job_match:    { Icon: BoltRounded,           bg: '#EAF6E9',   color: '#2F7A3B',  label: 'Job match'   },
  system:       { Icon: NotificationsNone,     bg: '#EEF0EC',   color: T.muted,    label: 'System'      },
};

const FILTERS = [
  { value: 'all',    label: 'All'    },
  { value: 'unread', label: 'Unread' },
];

const KINDS = [
  { value: null,           label: 'Everything'  },
  { value: 'application',  label: 'Applications' },
  { value: 'interview',    label: 'Interviews'   },
  { value: 'assessment',   label: 'Assessments'  },
  { value: 'offer',        label: 'Offers'       },
  { value: 'job_match',    label: 'Job matches'  },
  { value: 'announcement', label: 'Announcements'},
  { value: 'post',         label: 'Posts'        },
  { value: 'message',      label: 'Messages'     },
  { value: 'profile',      label: 'Profile'      },
];

/* ── Row ─────────────────────────────────────────────────────────────── */
const NotificationRow = ({ item, onOpen, onMarkRead }) => {
  const { Icon, bg, color, label } = NOTIF_ICON[item.kind] || NOTIF_ICON.system;
  return (
        <Box
      sx={{
        display: 'flex', gap: 1.5, alignItems: 'flex-start', p: 2,
        bgcolor: item.unread ? T.sageSoft : T.white,
        borderBottom: `1px solid ${T.line}`,
        transition: 'background-color 0.14s ease',
        '&:last-of-type': { borderBottom: 'none' },
      }}
    >
      <Box sx={{
        width: 40, height: 40, borderRadius: '10px',
        bgcolor: bg, color,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon sx={{ fontSize: 20 }} />
      </Box>

      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Stack direction="row" spacing={0.75} sx={{ mb: 0.4, alignItems: 'center' }}>
          {item.unread && <CircleRounded sx={{ fontSize: 8, color: T.danger, flexShrink: 0 }} />}
          <Box sx={{
            px: 0.75, py: '1px', borderRadius: '4px',
            bgcolor: bg, color,
            fontFamily: "'Jost','DM Sans',sans-serif",
            fontSize: '0.58rem', fontWeight: 800,
            letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            {label}
          </Box>
          <Box sx={{ flex: 1 }} />
          <Typography sx={{
            fontFamily: "'Jost','DM Sans',sans-serif",
            fontSize: '0.72rem', color: T.muted, fontWeight: 600, flexShrink: 0,
          }}>
            {item.time}
          </Typography>
        </Stack>

        <Typography sx={{
          fontFamily: "'Jost','DM Sans',sans-serif",
          fontSize: '0.92rem', fontWeight: item.unread ? 800 : 700, color: T.ink,
          letterSpacing: '-0.01em', lineHeight: 1.3, mb: 0.4,
        }}>
          {item.title}
        </Typography>

        <Typography sx={{
          fontFamily: "'Jost','DM Sans',sans-serif",
          fontSize: '0.82rem', color: T.muted, lineHeight: 1.5,
        }}>
          {item.body}
        </Typography>
      </Box>

      {item.unread && (
        <IconButton
          onClick={(e) => { e.stopPropagation(); onMarkRead(item.id); }}
          size="small"
          aria-label="Mark as read"
          sx={{
            color: T.muted, flexShrink: 0,
            '&:hover': { bgcolor: T.cream, color: T.sageText },
          }}
        >
          <DoneAllRounded sx={{ fontSize: 18 }} />
        </IconButton>
      )}
    </Box>
  );
};

/* ── Page ────────────────────────────────────────────────────────────── */
// BUILD: 2026-08-07-notif-pagination-v1
const JobseekerNotifications = () => {
  const navigate = useNavigate();
  const {
    notifications, unreadCount, totalCount,
    page, pageSize, initialized, error,
    markRead, markAllRead, clearAll, goToPage,
  } = useNotifications();

  const [filter, setFilter] = useState('all');
  const [kind,   setKind]   = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const filtered = useMemo(() => {
    return notifications
      .filter((n) => (filter === 'unread' ? n.unread : true))
      .filter((n) => (kind ? n.kind === kind : true));
  }, [notifications, filter, kind]);

  const isEmpty = filtered.length === 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const hasNotifications = totalCount > 0;

  const handleClearAll = () => {
    clearAll();
    setConfirmClear(false);
  };

  const actionBtnSx = {
    textTransform: 'none', fontFamily: "'Jost','DM Sans',sans-serif",
    fontSize: '0.78rem', fontWeight: 700,
    border: `1px solid ${T.line}`, bgcolor: T.white,
    px: 1.5, py: 0.6, borderRadius: '10px',
    '&:hover': { bgcolor: T.sageSoft, borderColor: T.lineSoft },
  };

  return (
    <Box sx={{
      p: { xs: 2, sm: 2.5, md: 3 },
      fontFamily: "'Jost','DM Sans',sans-serif",
      minHeight: '100%',
      bgcolor: T.cream,
    }}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{
          mb: 2,
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
        }}
      >
        <Box>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <IconButton onClick={() => navigate('/jobseeker/overview')} sx={{ p: 0.5, color: T.pine, '&:hover': { bgcolor: T.sageSoft } }}>
              <ArrowBackRounded sx={{ fontSize: 22 }} />
            </IconButton>
            <NotificationsNone sx={{ fontSize: 22, color: T.sage }} />
            <Typography sx={{
              fontSize: { xs: '1.15rem', sm: '1.4rem' },
              fontWeight: 800, color: T.ink,
              letterSpacing: '-0.02em', lineHeight: 1.15,
            }}>
              Notifications
            </Typography>
            {unreadCount > 0 && (
              <Chip
                label={`${unreadCount} new`}
                size="small"
                sx={{
                  bgcolor: T.danger, color: T.white,
                  fontFamily: "'Jost','DM Sans',sans-serif",
                  fontSize: '0.62rem', fontWeight: 800, height: 20,
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                }}
              />
            )}
          </Stack>
          <Typography sx={{
            fontSize: '0.7rem', color: T.muted,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            fontWeight: 600, mt: 0.5,
          }}>
            Applications · interviews · assessments · offers · matches · posts
          </Typography>
        </Box>

        {/* ── Action buttons (right corner) ── */}
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          {unreadCount > 0 && (
            <Button
              onClick={markAllRead}
              startIcon={<DoneAllRounded sx={{ fontSize: 16 }} />}
              disableRipple
              sx={{ ...actionBtnSx, color: T.pine }}
            >
              Mark all as read
            </Button>
          )}
          {hasNotifications && (
            <Button
              onClick={() => setConfirmClear(true)}
              startIcon={<DeleteSweepRounded sx={{ fontSize: 16 }} />}
              disableRipple
              sx={{ ...actionBtnSx, color: T.danger, '&:hover': { bgcolor: '#FEF2F2', borderColor: '#FECACA' } }}
            >
              Clear all
            </Button>
          )}
        </Stack>
      </Stack>

      {/* ── Clear-all confirmation ─────────────────────────────────── */}
      {confirmClear && (
        <Box sx={{
          mb: 2, p: 2, borderRadius: '10px',
          bgcolor: '#FEF2F2', border: '1px solid #FECACA',
          display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
        }}>
          <Typography sx={{
            fontFamily: "'Jost','DM Sans',sans-serif",
            fontSize: '0.85rem', fontWeight: 700, color: T.ink, flex: 1,
          }}>
            Delete all {totalCount} notifications? This cannot be undone.
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button
              onClick={handleClearAll}
              size="small"
              disableRipple
              sx={{
                textTransform: 'none', fontFamily: "'Jost','DM Sans',sans-serif",
                fontSize: '0.78rem', fontWeight: 700,
                bgcolor: T.danger, color: T.white,
                px: 2, borderRadius: '8px',
                '&:hover': { bgcolor: '#DC2626' },
              }}
            >
              Yes, clear all
            </Button>
            <Button
              onClick={() => setConfirmClear(false)}
              size="small"
              disableRipple
              sx={{
                textTransform: 'none', fontFamily: "'Jost','DM Sans',sans-serif",
                fontSize: '0.78rem', fontWeight: 700, color: T.muted,
                border: `1px solid ${T.line}`, px: 2, borderRadius: '8px',
                '&:hover': { bgcolor: T.white },
              }}
            >
              Cancel
            </Button>
          </Stack>
        </Box>
      )}

      {/* ── Filter row ─────────────────────────────────────────────── */}
      <Stack direction="row" spacing={1} sx={{ mb: 1.5, flexWrap: 'wrap', rowGap: 1 }}>
        <Stack direction="row" spacing={0.5} sx={{
          bgcolor: T.white, p: 0.4, borderRadius: '10px',
          border: `1px solid ${T.line}`,
        }}>
          {FILTERS.map((f) => (
            <Box
              key={f.value}
              onClick={() => setFilter(f.value)}
              role="button"
              sx={{
                px: 1.5, py: 0.5, borderRadius: '8px',
                fontFamily: "'Jost','DM Sans',sans-serif",
                fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                bgcolor: filter === f.value ? T.pine : 'transparent',
                color:   filter === f.value ? T.white : T.muted,
                transition: 'all 0.15s ease',
                '&:hover': { color: filter === f.value ? T.white : T.pine },
              }}
            >
              {f.label}
              {f.value === 'unread' && unreadCount > 0 && ` · ${unreadCount}`}
            </Box>
          ))}
        </Stack>

        <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', rowGap: 0.75 }}>
          {KINDS.map((k) => {
            const active = kind === k.value;
            return (
              <Box
                key={k.value ?? 'all'}
                onClick={() => setKind(k.value)}
                role="button"
                sx={{
                  px: 1.25, py: 0.5, borderRadius: '999px',
                  fontFamily: "'Jost','DM Sans',sans-serif",
                  fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                  bgcolor: active ? T.sageSoft : T.white,
                  color:   active ? T.pine : T.muted,
                  border: `1px solid ${active ? T.sage : T.lineSoft}`,
                  transition: 'all 0.15s ease',
                  '&:hover': { bgcolor: T.sageSoft, color: T.pine, borderColor: T.line },
                }}
              >
                {k.label}
              </Box>
            );
          })}
        </Stack>
      </Stack>

      {/* ── List ───────────────────────────────────────────────────── */}
      <Box sx={{
        bgcolor: T.white,
        border: `1px solid ${T.line}`,
        borderRadius: '12px',
        overflow: 'hidden',
      }}>
        {!initialized ? (
          <Box sx={{ p: 5, textAlign: 'center' }}>
            <CircularProgress size={22} sx={{ color: T.sage }} />
            <Typography sx={{
              fontSize: '0.82rem', color: T.muted, mt: 1.25, fontWeight: 600,
            }}>
              Loading notifications…
            </Typography>
          </Box>
        ) : error ? (
          <Box sx={{ p: 5, textAlign: 'center' }}>
            <Typography sx={{
              fontSize: '0.92rem', fontWeight: 700, color: T.danger,
            }}>
              Couldn't load notifications
            </Typography>
            <Typography sx={{ fontSize: '0.8rem', color: T.muted, mt: 0.75 }}>
              {error}
            </Typography>
          </Box>
        ) : isEmpty ? (
          <Box sx={{ p: 5, textAlign: 'center' }}>
            <NotificationsNone sx={{ fontSize: 40, color: T.lineSoft, mb: 1.5 }} />
            <Typography sx={{
              fontSize: '0.95rem', fontWeight: 700, color: T.ink,
              letterSpacing: '-0.01em',
            }}>
              {filter === 'unread' ? "You're all caught up." : 'No notifications yet.'}
            </Typography>
            <Typography sx={{ fontSize: '0.82rem', color: T.muted, mt: 0.75 }}>
              {filter === 'unread'
                ? 'New updates about interviews, assessments, and applications will appear here.'
                : 'Notifications about your interviews, assessments, applications, offers and job matches will show up here.'}
            </Typography>
          </Box>
        ) : (
          filtered.map((n) => (
                        <NotificationRow
              key={n.id}
              item={n}
              onMarkRead={markRead}
            />
          ))
        )}
      </Box>

      {/* ── Pagination ─────────────────────────────────────────────── */}
      {totalCount > pageSize && (
        <Stack
          direction="row"
          spacing={1} sx={{ py: 2, alignItems: 'center', justifyContent: 'center' }}
        >
          <IconButton
            onClick={() => goToPage(page - 1)}
            disabled={page === 0}
            size="small"
            sx={{ color: T.pine, '&.Mui-disabled': { color: T.lineSoft } }}
          >
            <ChevronLeftRounded />
          </IconButton>

          {Array.from({ length: totalPages }, (_, i) => (
            <Box
              key={i}
              onClick={() => goToPage(i)}
              role="button"
              sx={{
                width: 32, height: 32, borderRadius: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'Jost','DM Sans',sans-serif",
                fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
                bgcolor: page === i ? T.pine : 'transparent',
                color:   page === i ? T.white : T.muted,
                transition: 'all 0.15s ease',
                '&:hover': { bgcolor: page === i ? T.pine : T.sageSoft },
              }}
            >
              {i + 1}
            </Box>
          ))}

          <IconButton
            onClick={() => goToPage(page + 1)}
            disabled={page >= totalPages - 1}
            size="small"
            sx={{ color: T.pine, '&.Mui-disabled': { color: T.lineSoft } }}
          >
            <ChevronRightRounded />
          </IconButton>

          <Typography sx={{
            fontFamily: "'Jost','DM Sans',sans-serif",
            fontSize: '0.72rem', color: T.muted, fontWeight: 600, ml: 1,
          }}>
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, totalCount)} of {totalCount}
          </Typography>
        </Stack>
      )}

      {!isEmpty && totalCount <= pageSize && (
        <Typography sx={{
          textAlign: 'center', fontSize: '0.72rem', color: T.muted,
          py: 2, fontWeight: 600,
        }}>
          {filtered.length} of {totalCount} shown
        </Typography>
      )}
    </Box>
  );
};

export default JobseekerNotifications;