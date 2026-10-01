

import React, { useMemo, useState } from 'react';
import {
  Box, Stack, Typography, Button, Chip, IconButton,
} from '@mui/material';
import {
  NotificationsNone,
  EventAvailableRounded, DescriptionOutlined, PersonAddRounded,
  CampaignOutlined,
  CircleRounded, DoneAllRounded, DeleteSweepRounded,
   ChevronLeftRounded, ChevronRightRounded, ArrowBackRounded,
} from '@mui/icons-material';

import { useNavigate } from 'react-router-dom';
import { useEmployerNotifications } from '@/hooks/employer/useEmployerNotifications'; 

/* ── Palette (same tokens as Topbar / feed page) ─────────────────────── */
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

const NOTIF_ICON = {
  candidate:   { Icon: PersonAddRounded,       bg: T.sageSoft,  color: T.sageText, label: 'Candidate'   },
  interview:   { Icon: EventAvailableRounded,  bg: '#EAF0F6',   color: '#3C5A78',  label: 'Interview'   },
  assessment:  { Icon: DescriptionOutlined,    bg: '#FFF6E5',   color: '#8A6A1F',  label: 'Assessment'  },
  post:        { Icon: CampaignOutlined,       bg: '#E9EFEA',   color: '#022124',  label: 'Post'        },
};

/* ── Filter tabs ─────────────────────────────────────────────────────── */
const FILTERS = [
  { value: 'all',    label: 'All'    },
  { value: 'unread', label: 'Unread' },
];

const KINDS = [
  { value: null,         label: 'Everything'  },
  { value: 'candidate',  label: 'Candidates'  },
  { value: 'interview',  label: 'Interviews'  },
  { value: 'assessment', label: 'Assessments' },
  { value: 'post',       label: 'Posts'       },
];

/* ── Single row ──────────────────────────────────────────────────────── */
const NotificationRow = ({ item, onOpen, onMarkRead }) => {
  const { Icon, bg, color, label } = NOTIF_ICON[item.kind] || NOTIF_ICON.candidate;

  return (
        <Box
      sx={{
        display: 'flex', gap: 1.5, alignItems: 'flex-start',
        p: 2,
        bgcolor: item.unread ? T.sageSoft : T.white,
        borderBottom: `1px solid ${T.line}`,
        transition: 'background-color 0.14s ease',
        '&:last-of-type': { borderBottom: 'none' },
      }}
    >
      {/* Icon tile */}
      <Box sx={{
        width: 40, height: 40, borderRadius: '10px',
        bgcolor: bg, color,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon sx={{ fontSize: 20 }} />
      </Box>

      {/* Body */}
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

      {/* Action */}
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
const EmployerNotifications = () => {
  const navigate = useNavigate();
  const {
    notifications, unreadCount, totalCount,
    page, pageSize, markRead, markAllRead,
    clearAll, goToPage,
  } = useEmployerNotifications();

  const [filter, setFilter] = useState('all');
  const [kind,   setKind]   = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);

  /* client-side kind filter (server already paginated) */
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

  /* ── action-button style (shared by Mark-all-read & Clear-all) ── */
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
            <IconButton onClick={() => navigate('/employer/overview')} sx={{ p: 0.5, color: T.pine, '&:hover': { bgcolor: T.sageSoft } }}>
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
            Candidates, interviews, assessments & post activity
          </Typography>
        </Box>

        {/* ── Action buttons (right-aligned) ── */}
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
        {/* Read/unread tabs */}
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

        {/* Kind chips */}
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
        {isEmpty ? (
          <Box sx={{ p: 5, textAlign: 'center' }}>
            <NotificationsNone sx={{ fontSize: 40, color: T.lineSoft, mb: 1.5 }} />
            <Typography sx={{
              fontSize: '0.95rem', fontWeight: 700, color: T.ink,
              letterSpacing: '-0.01em',
            }}>
              {filter === 'unread' ? "You're all caught up." : 'No notifications yet.'}
            </Typography>
            <Typography sx={{
              fontSize: '0.82rem', color: T.muted, mt: 0.75,
            }}>
              {filter === 'unread'
                ? 'New updates about candidates, interviews, and assessments will appear here.'
                : 'Notifications about candidates, interviews, assessments, and post activity will show up here.'}
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

export default EmployerNotifications;