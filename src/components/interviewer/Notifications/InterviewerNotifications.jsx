// BUILD: 2026-09-29-iaem-notif-employer-style — redesigned to match employer notification theme
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Chip, Skeleton, Button, Stack, IconButton, Tooltip,
} from '@mui/material';
import {
  DoneAllRounded, DeleteSweepRounded, NotificationsNone,
  EventAvailableRounded, DescriptionOutlined, PersonAddRounded,
  SmartToyOutlined, GavelRounded, CircleRounded,
  ChevronLeftRounded, ChevronRightRounded,
} from '@mui/icons-material';
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined';
import { iaemNotificationService } from '@/services/api/iaem';

/* ── Palette (same tokens as employer / Topbar) ── */
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

const FONT = "'Jost','DM Sans',sans-serif";
const ITEMS_PER_PAGE = 10;

/* ── Icon mapping by type_code ── */
const NOTIF_ICON = {
  SCHEDULE_RELEASED:     { Icon: EventAvailableRounded, bg: '#EAF0F6', color: '#3C5A78', label: 'Schedule'     },
  BOOKING_CONFIRMED_IV:  { Icon: EventAvailableRounded, bg: T.sageSoft, color: T.sageText, label: 'Booking'    },
  AI_SCORE_READY:        { Icon: SmartToyOutlined,      bg: '#F3E8FD', color: '#6B21A8', label: 'AI Score'     },
  CALIBRATION_ASSIGNED:  { Icon: SmartToyOutlined,      bg: '#EAF0F6', color: '#3C5A78', label: 'Calibration'  },
  CASE_RESOLVED:         { Icon: DescriptionOutlined,   bg: '#FFF6E5', color: '#8A6A1F', label: 'Case'         },
  CONTEXT_REQUESTED:     { Icon: DescriptionOutlined,   bg: '#FFF6E5', color: '#8A6A1F', label: 'Case'         },
  SLA_BREACH:            { Icon: GavelRounded,          bg: '#FEF2F2', color: '#DC2626', label: 'SLA Breach'   },
  COMPLIANCE_ALERT:      { Icon: GavelRounded,          bg: '#FEF2F2', color: '#DC2626', label: 'Alert'        },
  APPEAL_RESULT:         { Icon: GavelRounded,          bg: '#EAF0F6', color: '#3C5A78', label: 'Appeal'       },
  REGISTRATION_APPROVED: { Icon: PersonAddRounded,      bg: T.sageSoft, color: T.sageText, label: 'Account'    },
  REGISTRATION_REJECTED: { Icon: PersonAddRounded,      bg: '#FEF2F2', color: '#DC2626', label: 'Account'      },
  NO_SHOW:               { Icon: EventAvailableRounded, bg: '#FEF2F2', color: '#DC2626', label: 'No-Show'      },
};
const DEFAULT_ICON = { Icon: NotificationsNone, bg: T.sageSoft, color: T.sageText, label: 'Notification' };

/* ── Relative time helper ── */
const timeAgo = (dateStr) => {
  const now = Date.now();
  const d = new Date(dateStr).getTime();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60)    return 'Just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  if (diff < 172800) return 'Yesterday';
  if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

/* ── Action button style ── */
const actionBtnSx = {
  textTransform: 'none', fontFamily: FONT,
  fontSize: '0.78rem', fontWeight: 700,
  border: `1px solid ${T.line}`, bgcolor: T.white,
  px: 1.5, py: 0.6, borderRadius: '10px',
  '&:hover': { bgcolor: T.sageSoft, borderColor: T.lineSoft },
};

/* ── Single notification row ── */
const NotificationRow = ({ item, onClick, onDelete, onMarkRead }) => {
  const { Icon, bg, color, label } = NOTIF_ICON[item.type_code] || DEFAULT_ICON;

  return (
    <Box
      onClick={() => onClick(item)}
      sx={{
        display: 'flex', gap: 1.5, alignItems: 'flex-start',
        p: 2, cursor: 'pointer',
        bgcolor: item.is_read ? T.white : T.sageSoft,
        borderBottom: `1px solid ${T.line}`,
        transition: 'background-color 0.14s ease',
        '&:last-of-type': { borderBottom: 'none' },
        '&:hover': { bgcolor: item.is_read ? T.cream : '#E3EDE2' },
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
          {!item.is_read && <CircleRounded sx={{ fontSize: 8, color: T.danger, flexShrink: 0 }} />}
          <Box sx={{
            px: 0.75, py: '1px', borderRadius: '4px',
            bgcolor: bg, color,
            fontFamily: FONT,
            fontSize: '0.58rem', fontWeight: 800,
            letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            {label}
          </Box>
          <Box sx={{ flex: 1 }} />
          <Typography sx={{
            fontFamily: FONT, fontSize: '0.72rem', color: T.muted,
            fontWeight: 600, flexShrink: 0,
          }}>
            {timeAgo(item.created_at)}
          </Typography>
        </Stack>

        <Typography sx={{
          fontFamily: FONT, fontSize: '0.92rem',
          fontWeight: item.is_read ? 700 : 800, color: T.ink,
          letterSpacing: '-0.01em', lineHeight: 1.3, mb: 0.4,
        }}>
          {item.title}
        </Typography>

        <Typography sx={{
          fontFamily: FONT, fontSize: '0.82rem', color: T.muted, lineHeight: 1.5,
        }}>
          {item.message}
        </Typography>
      </Box>

      {/* Actions */}
      <Stack direction="row" spacing={0.25} sx={{ flexShrink: 0, alignItems: 'center' }}>
        {!item.is_read && (
          <Tooltip title="Mark as read" arrow>
            <IconButton size="small"
              onClick={(e) => { e.stopPropagation(); onMarkRead(item.id); }}
              sx={{ color: T.muted, '&:hover': { bgcolor: T.cream, color: T.sageText } }}>
              <DoneAllRounded sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title="Delete" arrow>
          <IconButton size="small"
            onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
            sx={{ color: '#C0C0C0', '&:hover': { color: T.danger, bgcolor: '#FEF2F2' } }}>
            <DeleteOutlineOutlined sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      </Stack>
    </Box>
  );
};

/* ── Page ── */
const InterviewerNotifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmClear, setConfirmClear] = useState(false);
  const [page, setPage] = useState(0); // 0-indexed like employer

  const fetchNotifs = () => {
    iaemNotificationService.getNotifications({ role: 'INTERVIEWER', page_size: 50 })
      .then(r => setNotifications(r.data.notifications || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchNotifs(); }, []);

  const handleClick = (n) => {
    if (!n.is_read) {
      iaemNotificationService.markAsRead(n.id).catch(console.error);
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
    }
    if (n.action_url) navigate(n.action_url);
  };

  const handleMarkRead = (id) => {
    iaemNotificationService.markAsRead(id).catch(console.error);
    setNotifications(prev => prev.map(x => x.id === id ? { ...x, is_read: true } : x));
  };

  const handleMarkAll = () => {
    iaemNotificationService.markAllAsRead()
      .then(() => setNotifications(prev => prev.map(n => ({ ...n, is_read: true }))))
      .catch(console.error);
  };

  const handleDeleteOne = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    iaemNotificationService.deleteOne(id).catch(() => fetchNotifs());
  };

  const handleClearAll = () => {
    setNotifications([]);
    setConfirmClear(false);
    iaemNotificationService.deleteAll().catch(() => fetchNotifs());
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const totalCount = notifications.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));
  const paged = notifications.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);
  const isEmpty = notifications.length === 0;

  return (
    <Box sx={{
      p: { xs: 2, sm: 2.5, md: 3 },
      fontFamily: FONT, minHeight: '100%', bgcolor: T.cream,
    }}>
      {/* ── Header ── */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}
        sx={{ mb: 2, alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between' }}>
        <Box>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <NotificationsNone sx={{ fontSize: 22, color: T.sage }} />
            <Typography sx={{
              fontSize: { xs: '1.15rem', sm: '1.4rem' },
              fontWeight: 800, color: T.ink,
              letterSpacing: '-0.02em', lineHeight: 1.15,
            }}>
              Notifications
            </Typography>
            {unreadCount > 0 && (
              <Chip label={`${unreadCount} new`} size="small"
                sx={{
                  bgcolor: T.danger, color: T.white, fontFamily: FONT,
                  fontSize: '0.62rem', fontWeight: 800, height: 20,
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                }} />
            )}
          </Stack>
        </Box>

        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          {unreadCount > 0 && (
            <Button onClick={handleMarkAll}
              startIcon={<DoneAllRounded sx={{ fontSize: 16 }} />}
              disableRipple sx={{ ...actionBtnSx, color: T.pine }}>
              Mark all as read
            </Button>
          )}
          {totalCount > 0 && (
            <Button onClick={() => setConfirmClear(true)}
              startIcon={<DeleteSweepRounded sx={{ fontSize: 16 }} />}
              disableRipple
              sx={{ ...actionBtnSx, color: T.danger, '&:hover': { bgcolor: '#FEF2F2', borderColor: '#FECACA' } }}>
              Clear all
            </Button>
          )}
        </Stack>
      </Stack>

      {/* ── Clear-all confirmation banner ── */}
      {confirmClear && (
        <Box sx={{
          mb: 2, p: 2, borderRadius: '10px',
          bgcolor: '#FEF2F2', border: '1px solid #FECACA',
          display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
        }}>
          <Typography sx={{ fontFamily: FONT, fontSize: '0.85rem', fontWeight: 700, color: T.ink, flex: 1 }}>
            Delete all {totalCount} notifications? This cannot be undone.
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button onClick={handleClearAll} size="small" disableRipple
              sx={{ textTransform: 'none', fontFamily: FONT, fontSize: '0.78rem', fontWeight: 700,
                bgcolor: T.danger, color: T.white, px: 2, borderRadius: '8px',
                '&:hover': { bgcolor: '#DC2626' } }}>
              Yes, clear all
            </Button>
            <Button onClick={() => setConfirmClear(false)} size="small" disableRipple
              sx={{ textTransform: 'none', fontFamily: FONT, fontSize: '0.78rem', fontWeight: 700,
                color: T.muted, border: `1px solid ${T.line}`, px: 2, borderRadius: '8px',
                '&:hover': { bgcolor: T.white } }}>
              Cancel
            </Button>
          </Stack>
        </Box>
      )}

      {/* ── List ── */}
      <Box sx={{
        bgcolor: T.white, border: `1px solid ${T.line}`,
        borderRadius: '12px', overflow: 'hidden',
      }}>
        {loading ? (
          <Box sx={{ p: 3 }}><Skeleton height={120} /></Box>
        ) : isEmpty ? (
          <Box sx={{ p: 5, textAlign: 'center' }}>
            <NotificationsNone sx={{ fontSize: 40, color: T.lineSoft, mb: 1.5 }} />
            <Typography sx={{ fontSize: '0.95rem', fontWeight: 700, color: T.ink, letterSpacing: '-0.01em' }}>
              No notifications yet.
            </Typography>
            <Typography sx={{ fontSize: '0.82rem', color: T.muted, mt: 0.75 }}>
              Updates about interviews, scores, and cases will appear here.
            </Typography>
          </Box>
        ) : (
          paged.map(n => (
            <NotificationRow
              key={n.id}
              item={n}
              onClick={handleClick}
              onDelete={handleDeleteOne}
              onMarkRead={handleMarkRead}
            />
          ))
        )}
      </Box>

      {/* ── Pagination ── */}
      {totalCount > ITEMS_PER_PAGE && (
        <Stack direction="row" spacing={1}
          sx={{ py: 2, alignItems: 'center', justifyContent: 'center' }}>
          <IconButton onClick={() => setPage(p => p - 1)} disabled={page === 0} size="small"
            sx={{ color: T.pine, '&.Mui-disabled': { color: T.lineSoft } }}>
            <ChevronLeftRounded />
          </IconButton>

          {Array.from({ length: totalPages }, (_, i) => (
            <Box key={i} onClick={() => setPage(i)} role="button"
              sx={{
                width: 32, height: 32, borderRadius: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: FONT, fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
                bgcolor: page === i ? T.pine : 'transparent',
                color: page === i ? T.white : T.muted,
                transition: 'all 0.15s ease',
                '&:hover': { bgcolor: page === i ? T.pine : T.sageSoft },
              }}>
              {i + 1}
            </Box>
          ))}

          <IconButton onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1} size="small"
            sx={{ color: T.pine, '&.Mui-disabled': { color: T.lineSoft } }}>
            <ChevronRightRounded />
          </IconButton>

          <Typography sx={{ fontFamily: FONT, fontSize: '0.72rem', color: T.muted, fontWeight: 600, ml: 1 }}>
            {page * ITEMS_PER_PAGE + 1}–{Math.min((page + 1) * ITEMS_PER_PAGE, totalCount)} of {totalCount}
          </Typography>
        </Stack>
      )}

      {!isEmpty && totalCount <= ITEMS_PER_PAGE && (
        <Typography sx={{ textAlign: 'center', fontSize: '0.72rem', color: T.muted, py: 2, fontWeight: 600 }}>
          {totalCount} of {totalCount} shown
        </Typography>
      )}
    </Box>
  );
};

export default InterviewerNotifications;