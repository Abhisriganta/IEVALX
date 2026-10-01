import React, { useState, useMemo, useCallback, useEffect ,useRef} from "react";
import {
  useParams, useNavigate, useSearchParams, useLocation,
} from "react-router-dom";
import {
  Box, Paper, Typography, Stack, Avatar, Button, Container,
  CircularProgress, Alert, Snackbar, Card, Skeleton, Tooltip, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, Chip,
  Pagination, Select, MenuItem, TextField, InputAdornment,
  ToggleButton, ToggleButtonGroup,
} from "@mui/material";
import {
  RefreshOutlined, ErrorOutlined, Search, ClearRounded,
  ViewList, ViewModule,
  VideocamRounded, ArrowForwardRounded, OpenInNew,
  CheckCircleOutlined, AccessTimeOutlined, EventOutlined, LayersOutlined,
  PlayCircleFilledRounded, HelpOutlineOutlined,
} from "@mui/icons-material";
// BUILD: 2026-08-07-smart-soft-delete-v1
import { DeleteOutlineRounded, CloseRounded, CheckBoxOutlineBlankRounded } from "@mui/icons-material";
import Checkbox from "@mui/material/Checkbox";

import useLiveInterview from "@/hooks/jobseeker/useLiveInterview";
import smartInterviewService from "@/services/api/jobseeker/smartInterviewService";
import { jobseekerSlotService } from "@/services/api/iaem";
import api from "@/services/api/axiosInstance";

// BookSlotMode removed — live-video booking handled by IAEMSlotBooking

/* ═══════════════════════════════════════════════════════════════════════════
   Brand tokens — same pine/sage system as FindJobs, SavedJobs, Applications,
   AI Assessments, and the Document Interviews page. Keeps every jobseeker
   surface reading as a single family.
═══════════════════════════════════════════════════════════════════════════ */
const FONT = "'Jost','DM Sans',sans-serif";

const BRAND = {
  navy:         '#022124',
  navyDark:     '#0A3A38',
  sage:         '#7F9E7E',
  sageDark:     '#6C8B6B',
  sageText:     '#5E815D',
  sageSoft:     '#EDF3EC',
  border:       '#E7EAE3',
  borderStrong: '#D8DDD4',
  muted:        '#55584F',
  faint:        '#7A7E76',
  ink:          '#101210',
  bg:           '#F6F8F3',
  surface:      '#FFFFFF',
  amber:        '#A35A2D',
  amberSoft:    '#FBF0E7',
  amberLeaf:    '#C99A4A',
  done:         '#3E6E3E',
  doneSoft:     '#EAF2E9',
  danger:       '#A63D2F',
  dangerSoft:   '#FAEAE8',
  sched:        '#3C5A78',
  schedSoft:    '#EAF0F6',
  live:         '#2E7D4F',
  liveSoft:     'rgba(46,125,79,0.10)',
};

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50, 'all'];
const DEFAULT_PAGE_SIZE = 10;

const VIEW_CHIPS = [
  { value: 'all',       label: 'All' },
  { value: 'upcoming',  label: 'Upcoming' },
  { value: 'completed', label: 'Completed' },
  { value: 'expired',   label: 'Expired' },
];

/* Status pill meta — colour codes the state pill in each card footer. */
const STATUS_PILL = {
  to_book:   { label: 'To Book',   color: BRAND.amber,  bg: BRAND.amberSoft },
  live:      { label: 'Live Now',  color: BRAND.live,   bg: BRAND.liveSoft,   pulse: true },
  upcoming:  { label: 'Booked',    color: BRAND.sched,  bg: BRAND.schedSoft },
  completed: { label: 'Completed', color: BRAND.done,   bg: BRAND.doneSoft },
  missed:    { label: 'Missed',    color: BRAND.danger, bg: BRAND.dangerSoft },
  cancelled: { label: 'Cancelled', color: BRAND.muted,  bg: '#F0F1EE' },
  expired:   { label: 'Expired',   color: BRAND.muted,  bg: '#F0F1EE' },
  /* ── multi-pipeline rebuild states (R4/R5/R7) ── */
  awaiting_decision: { label: '⏳ Awaiting decision', color: '#8A6A1F',    bg: '#FFF6E5' },
  approved:          { label: '✓ Approved',           color: BRAND.done,   bg: BRAND.doneSoft },
  rejected:          { label: 'Not selected',         color: BRAND.danger, bg: BRAND.dangerSoft },
  resched_requested: { label: '🔁 Reschedule asked',  color: '#8A6A1F',    bg: '#FFF6E5' },
};

/* Dog-ear fold colour per effective status — the corner colour telegraphs
   the card's state at a glance. */
const FOLD_COLOR = {
  to_book:   { face: BRAND.amberLeaf, edge: BRAND.amberSoft },
  live:      { face: BRAND.live,      edge: BRAND.doneSoft  },
  upcoming:  { face: '#8AA4BC',       edge: BRAND.schedSoft },
  completed: { face: BRAND.done,      edge: BRAND.doneSoft  },
  missed:    { face: BRAND.danger,    edge: BRAND.dangerSoft },
  cancelled: { face: '#B9BEB4',       edge: '#F0F1EE'       },
  expired:   { face: '#B9BEB4',       edge: '#F0F1EE'       },
  awaiting_decision: { face: '#C97B4A',   edge: '#FFF6E5'        },
  approved:          { face: BRAND.done,  edge: BRAND.doneSoft   },
  rejected:          { face: BRAND.danger, edge: BRAND.dangerSoft },
  resched_requested: { face: '#C97B4A',   edge: '#FFF6E5'        },
};

/* Calendar-leaf month band colour per state. The tear-off block is the
   card's signature; its band colour communicates urgency without a word. */
const LEAF_BAND = {
  to_book:   BRAND.amberLeaf,
  live:      BRAND.live,
  upcoming:  BRAND.navy,
  completed: BRAND.done,
  missed:    BRAND.danger,
  cancelled: BRAND.muted,
  expired:   BRAND.muted,
};

const AVATAR_COLORS = ['#7F9E7E','#5E7F9E','#9E7F7E','#8B7F9E','#7E9E93','#9E937E','#6C8B6B','#3C5A78'];

/* ── Formatters ─────────────────────────────────────────────────────────── */
const initials = (name = "") =>
  String(name).split(/[\s.]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "IV";

const avatarColorFor = (str = "") => {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
};

const fmtDate     = (v) => { if (!v) return "—"; try { return new Date(v).toLocaleDateString("en-IN", { day:"numeric", month:"short" }); } catch { return "—"; } };
const fmtTime     = (v) => { if (!v) return "—"; try { return new Date(v).toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" }); } catch { return "—"; } };
const fmtDateTime = (v) => { if (!v) return null; try { return new Date(v).toLocaleString("en-IN", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" }); } catch { return null; } };

/* Backend often pre-formats scheduled dates. Prefer those; fall back to raw. */
const formatWhen = (iv) => {
  if (iv?.datetime_display) return iv.datetime_display;
  if (iv?.date_display && iv?.time_display) return `${iv.date_display} at ${iv.time_display}`;
  if (iv?.scheduled_date && iv?.scheduled_time) return `${iv.scheduled_date} ${iv.scheduled_time}`;
  if (iv?.window_start) return fmtDateTime(iv.window_start);
  return "—";
};

/* Waiting-room gate — opens 30 min before start, closes at window_end.
   Matches backend interview_slots.py:1089. */
const canJoinNow = (iv) => {
  if (!iv?.window_start) return false;
  const now = Date.now();
  const start = new Date(iv.window_start).getTime();
  const end   = iv.window_end ? new Date(iv.window_end).getTime() : start + 60 * 60 * 1000;
  const earliest = start;
  return now >= earliest && now <= end;
};

const minutesUntilOpen = (iv) => {
  if (!iv?.window_start) return null;
  const start = new Date(iv.window_start).getTime();
  const earliest = start - 30 * 60 * 1000;
  const diffMs = earliest - Date.now();
  if (diffMs <= 0) return 0; 
  return Math.ceil(diffMs / 60000);
};

const formatOpensIn = (mins) => {
  if (mins == null) return "Awaiting time";
  if (mins === 0)   return "Join now";
  if (mins < 60)    return `Opens in ${mins} min`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `Opens in ${hrs} hr`;
  const days = Math.round(hrs / 24);
  return `Opens in ${days} day${days === 1 ? "" : "s"}`;
};

const formatSlotWindow = (startIso, endIso) => {
  if (!startIso || !endIso) return null;
  const s = new Date(startIso), e = new Date(endIso);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return null;
  const dOpts = { day: "2-digit", month: "short" };
  const tOpts = { hour: "numeric", minute: "2-digit", hour12: true };
  const sameDay = s.toDateString() === e.toDateString();
  if (sameDay) {
    return `${s.toLocaleDateString(undefined, dOpts)}, ${s.toLocaleTimeString(undefined, tOpts)} – ${e.toLocaleTimeString(undefined, tOpts)}`;
  }
  return `${s.toLocaleDateString(undefined, dOpts)} – ${e.toLocaleDateString(undefined, dOpts)}`;
};

/* Effective status — unifies raw invite / slot / history shapes into one
   bucket the chip filter, fold colour, pill, and action all agree on. */
const effectiveStatus = (item) => {
  if (!item) return 'expired';
  if (item._kind === 'invite') {
    return (item.expires_at && new Date(item.expires_at).getTime() < Date.now())
      ? 'expired' : 'to_book';
  }
  if (item._kind === 'slot') {
    /* ── Multi-pipeline decision engine (R4/R5/R7) ── */
    if (item.status === 'rejected' || item.decision === 'rejected') return 'rejected';
    if (item.status === 'reschedule_requested') return 'resched_requested';
    if (item.status === 'completed') {
      return 'completed';
    }
    if (item.status === 'no_attempt') return 'missed';
    if (item.status === 'cancelled')  return 'cancelled';
    /* If the slot window has ended, treat as missed — don't show Join */
    if (item.window_end && new Date(item.window_end).getTime() < Date.now()) {
      return 'missed';
    }
    return canJoinNow(item) ? 'live' : 'upcoming';
  }
  if (item._kind === 'history') {
    if (item.status === 'rejected' || item.decision === 'rejected') return 'rejected';
    if (item.status === 'completed') {
      return item.decision === 'approved' ? 'approved' : 'awaiting_decision';
    }
    if (item.status === 'no_attempt') return 'missed';
    if (item.status === 'cancelled')  return 'cancelled';
    return 'expired';
  }
  return 'expired';
};

// BUILD: 2026-08-14-live-candidate-reschedule-v1
// Only booked SLOTS that were missed can be rescheduled. Invites (no SI)
// and history (read-only) are excluded.
const RESCHED_ATTEMPTED_STATUSES_LIVE = [
  'started', 'in_progress', 'scoring', 'completed', 'partial',
];
const canRequestRescheduleLive = (item) => {
  if (!item || item._kind !== 'slot') return false;
  const winEnd = item.window_end;
  if (!winEnd) return false;
  if (Date.now() <= new Date(winEnd).getTime()) return false;
  if (RESCHED_ATTEMPTED_STATUSES_LIVE.includes(item.status)) return false;
  if (item.decision === 'approved' || item.decision === 'rejected') return false;
  if (item.status === 'locked' || item.status === 'draft') return false;
  if (item.status === 'reschedule_requested') return false;
  return true;
};

/* Chip bucket — the 4 top-level filters. to_book collapses into upcoming
   because they're both "future-looking items awaiting the candidate." */
const chipBucket = (eff) => {
  if (eff === 'to_book' || eff === 'live' || eff === 'upcoming'
      || eff === 'resched_requested') return 'upcoming';
  if (eff === 'completed' || eff === 'awaiting_decision'
      || eff === 'approved' || eff === 'rejected') return 'completed';
  return 'expired';
};

/* Anchor date for the calendar leaf — what date the tear-off shows */
const leafDate = (item, eff) => {
  if (eff === 'to_book' || eff === 'expired' && item._kind === 'invite') return item.expires_at;
  return item.window_start || item.scheduled_at || item.expires_at || null;
};

/* Booking-pressure — <48h to expiry turns the leaf amber and the window
   line urgent. Same rule as AI Assessments' isDueSoon(). */
const bookingUrgent = (item) => {
  if (item._kind !== 'invite' || !item.expires_at) return false;
  const ms = new Date(item.expires_at).getTime() - Date.now();
  return ms > 0 && ms < 48 * 60 * 60 * 1000;
};

/* Extract the live-room name from a meeting link so we can request the
   recording from the backend. Preserves the original regex. */
const roomFromLink = (link) => {
  if (!link) return null;
  const m = String(link).match(/\/live-room\/([^/?#]+)/);
  return m ? m[1] : null;
};

const getId = (item) => item?.invite_token || item?.slot_id || item?.id;
function InterviewCard({
  item, viewMode = 'grid', busy = false,
  onChooseSlot, onJoin, onViewRecording, onLockedTouch,
  // BUILD: 2026-08-14-live-candidate-reschedule-v1
  onRequestReschedule = null,
}) {
  const eff  = effectiveStatus(item);
  const pill = STATUS_PILL[eff]  ?? STATUS_PILL.expired;
  const fold = FOLD_COLOR[eff]   ?? FOLD_COLOR.expired;
  const leafBand = LEAF_BAND[eff] ?? LEAF_BAND.expired;

  const company     = item.company_name || 'Company';
  // Same Round n/N disambiguation as the AI and Document pages — two
  // live rounds in one pipeline must not render as the same card.
  const roundName   = (item.interview_name || 'Live interview')
    + (Number(item.total_rounds) > 1
        ? ` · Round ${item.round_number || 1}/${item.total_rounds}` : '');
  const jobTitle    = item.job_title || item.title || 'Live interview';
  const logoUrl     = item.company_logo || item.company_logo_url || item.employer_logo || item.logo_url || null;
  const avatarBg    = avatarColorFor(company);

  const anchor      = leafDate(item, eff);
  const leafDay     = anchor ? new Date(anchor).getDate() : '—';
  const leafMon     = anchor ? new Date(anchor).toLocaleDateString('en-IN', { month: 'short' }) : '—';
  const urgent      = bookingUrgent(item);
  const minsToOpen  = eff === 'upcoming' ? minutesUntilOpen(item) : null;

  /* What does the date on the leaf mean, and what does the second line say? */
  const leafTitle =
    eff === 'to_book'   ? 'Booking closes'
    : eff === 'live'    ? 'Happening now'
    : eff === 'upcoming'? 'Interview date'
    : eff === 'completed'? 'Held on'
    : eff === 'missed'  ? 'Missed on'
    : eff === 'cancelled'? 'Was scheduled'
    : eff === 'expired' && item._kind === 'invite' ? 'Invitation expired'
    : 'Was on';

  const leafSub =
    eff === 'to_book' && item.earliest_slot_at && item.latest_slot_at
      ? `Slots ${formatSlotWindow(item.earliest_slot_at, item.latest_slot_at) || '—'}`
    : eff === 'to_book' ? `by ${fmtTime(item.expires_at)}`
    : anchor            ? `${fmtTime(anchor)}${item.duration_mins ? ` · ${item.duration_mins} min` : ''}`
    : null;

  /* Dashed line under the meta row — echoes the Deadline Forward direction
     you approved for Document Interviews. */
  const winText =
    eff === 'to_book'   ? `Book by ${fmtDateTime(item.expires_at) ?? '—'}`
    : eff === 'live'    ? `Live now — started ${fmtTime(item.window_start)}`
    : eff === 'upcoming'? `Starts ${formatWhen(item)}`
    : eff === 'completed'? `Held ${formatWhen(item)}`
    : eff === 'missed'  ? `Was ${formatWhen(item)}`
    : eff === 'cancelled'? 'Cancelled by the employer'
    : eff === 'expired' && item._kind === 'invite' ? `Expired ${fmtDateTime(item.expires_at)}`
    : null;

  const hasRecording = false;

  const btnLabel =
    eff === 'to_book'   ? 'Choose Slot'
    : eff === 'live'    ? 'Join Meeting'
    : eff === 'upcoming'? formatOpensIn(minsToOpen)
    : eff === 'completed' && hasRecording ? 'View Recording'
    : eff === 'completed'? 'Completed'
    : eff === 'missed'  ? 'Missed'
    : eff === 'cancelled'? 'Cancelled'
    : 'Expired';

  const primaryEnabled = eff === 'to_book' || eff === 'live' || (eff === 'completed' && hasRecording);

  const hasAction = primaryEnabled;

  // BUILD: 2026-08-14-live-candidate-reschedule-v1
  const canAskReschedule = !!onRequestReschedule && canRequestRescheduleLive(item);
  const rescheduleBtn = canAskReschedule ? (
    <Button
      onClick={(e) => { e.stopPropagation(); onRequestReschedule(item); }}
      disableElevation
      sx={{
        fontFamily: FONT, textTransform: 'none', fontSize: '0.72rem',
        fontWeight: 700, borderRadius: '999px', px: 1.4, height: 34,
        minWidth: 0, whiteSpace: 'nowrap', flexShrink: 0,
        color: '#8A6A1F', bgcolor: '#FFF6E5',
        border: '1px solid rgba(201,123,74,0.35)',
        '&:hover': { bgcolor: '#FBEED3', borderColor: '#C97B4A' },
      }}
    >
      🔁 Reschedule
    </Button>
  ) : null;

  const handlePrimary = (e) => {
    e?.stopPropagation?.();
    if (busy) return;
    if      (eff === 'to_book')   onChooseSlot?.(item);
    else if (eff === 'live')      onJoin?.(item);
    else if (eff === 'completed' && hasRecording) onViewRecording?.(item);
    else                          onLockedTouch?.(item, eff);
  };

  const handleCardClick = () => {
    if (primaryEnabled) handlePrimary();
    else onLockedTouch?.(item, eff);
  };

  /* Avatar */
  const avatarNode = (
    <Avatar
      src={logoUrl || undefined}
      alt={company}
      sx={{
        width: 40, height: 40, flexShrink: 0,
        bgcolor: avatarBg, color: '#fff',
        fontFamily: FONT, fontSize: 15, fontWeight: 700,
      }}
    >
      {initials(company)}
    </Avatar>
  );

  /* Calendar-leaf block — the signature element */
  const leafNode = (
    <Box sx={{
      width: 52, flexShrink: 0,
      border: `1.5px solid ${BRAND.borderStrong}`,
      borderRadius: '10px', overflow: 'hidden',
      bgcolor: BRAND.surface, textAlign: 'center',
      boxShadow: '0 1px 3px rgba(16,18,16,0.05)',
    }}>
      <Box sx={{
        bgcolor: leafBand, color: '#fff',
        fontFamily: FONT, fontSize: 9, fontWeight: 800,
        letterSpacing: '1px', textTransform: 'uppercase',
        py: '3px',
      }}>
        {leafMon}
      </Box>
      <Typography sx={{
        fontFamily: FONT, fontSize: 19, fontWeight: 800,
        color: BRAND.ink, lineHeight: 1, py: '5px',
      }}>
        {leafDay}
      </Typography>
    </Box>
  );

  /* Primary action button, brand-consistent per state */
  const actionBtn = (
    <Button
      onClick={handlePrimary}
      disabled={!primaryEnabled || busy}
      disableElevation
      startIcon={
        eff === 'live'
          ? <VideocamRounded sx={{ fontSize: 16 }} />
          : eff === 'completed' && hasRecording
          ? <PlayCircleFilledRounded sx={{ fontSize: 16 }} />
          : null
      }
      endIcon={
        primaryEnabled && eff !== 'live' && !hasRecording
          ? <ArrowForwardRounded sx={{ fontSize: 15 }} />
          : null
      }
      sx={{
        fontFamily: FONT, textTransform: 'none',
        fontSize: 12.5, fontWeight: 700,
        borderRadius: '999px', px: 1.8, py: 0,
        height: 34, minWidth: 0, lineHeight: 1, flexShrink: 0,
        ...(eff === 'live'
          ? {
              bgcolor: BRAND.live, color: '#fff',
              boxShadow: '0 2px 10px rgba(46,125,79,0.35)',
              '&:hover': { bgcolor: '#256540', boxShadow: '0 4px 14px rgba(46,125,79,0.45)' },
            }
          : eff === 'to_book'
          ? {
              bgcolor: BRAND.navy, color: '#fff',
              boxShadow: '0 2px 8px rgba(2,33,36,0.22)',
              '&:hover': { bgcolor: BRAND.sage, boxShadow: '0 4px 12px rgba(127,158,126,0.4)' },
            }
          : eff === 'completed' && hasRecording
          ? {
              bgcolor: BRAND.done, color: '#fff',
              boxShadow: '0 2px 8px rgba(62,110,62,0.22)',
              '&:hover': { bgcolor: '#2F5730' },
            }
          : eff === 'completed'
          ? { bgcolor: BRAND.doneSoft, color: BRAND.done, border: '1px solid rgba(127,158,126,0.45)' }
          : eff === 'upcoming'
          ? { bgcolor: BRAND.schedSoft, color: BRAND.sched }
          : eff === 'missed'
          ? { bgcolor: BRAND.dangerSoft, color: BRAND.danger }
          : { bgcolor: '#F0F1EE', color: BRAND.muted }),
        '&.Mui-disabled': {
          ...(eff === 'completed'
            ? { bgcolor: BRAND.doneSoft, color: BRAND.done }
            : eff === 'upcoming'
            ? { bgcolor: BRAND.schedSoft, color: BRAND.sched }
            : eff === 'missed'
            ? { bgcolor: BRAND.dangerSoft, color: BRAND.danger }
            : { bgcolor: '#F0F1EE', color: BRAND.muted }),
        },
      }}
    >
      {busy && primaryEnabled ? (
        <>
          <CircularProgress size={13} sx={{ color: 'inherit', mr: 0.6 }} />
          Loading…
        </>
      ) : btnLabel}
    </Button>
  );

  /* Status pill — with a pulsing dot when Live */
  const statusPill = (
    <Box sx={{
      display: 'inline-flex', alignItems: 'center', gap: 0.6,
      px: 1.1, py: 0.4, borderRadius: 999,
      bgcolor: pill.bg, color: pill.color,
      fontFamily: FONT, fontSize: '0.68rem', fontWeight: 800,
      letterSpacing: '0.06em', textTransform: 'uppercase',
      minWidth: 0, overflow: 'hidden', flexShrink: 1,
      '@keyframes livePulse': {
        '0%,100%': { opacity: 1, transform: 'scale(1)' },
        '50%':     { opacity: 0.35, transform: 'scale(0.7)' },
      },
    }}>
      <Box component="span" sx={{
        width: 6, height: 6, borderRadius: '50%', bgcolor: 'currentColor', flexShrink: 0,
        animation: pill.pulse ? 'livePulse 1.4s ease-in-out infinite' : 'none',
      }} />
      <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {pill.label}
      </Box>
    </Box>
  );

  /* ── LIST VIEW ─────────────────────────────────────────────────────────── */
  if (viewMode === 'list') {
    return (
      <Paper
        elevation={0}
        onClick={handleCardClick}
        sx={{
          position: 'relative',
          bgcolor: BRAND.surface,
          border: `1px solid ${BRAND.border}`,
          borderRadius: '14px',
          p: { xs: 1.5, sm: 2 },
          cursor: 'pointer',
          overflow: 'hidden',
          transition: 'all 0.18s ease',
          '&:hover': {
            borderColor: BRAND.borderStrong,
            boxShadow: '0 4px 12px rgba(2,33,36,0.06)',
          },
        }}
      >
        {/* Left status accent bar */}
        <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, bgcolor: fold.face }} />

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 1.25, md: 2 }} sx={{ alignItems: { md: 'center' }, pl: 0.5 }}>
          {leafNode}

          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flex: '1 1 300px', minWidth: 0 }}>
            {avatarNode}
            <Box sx={{ minWidth: 0 }}>
              {/* Full title / subline reveal on hover when the row truncates them */}
              <Tooltip title={jobTitle} arrow placement="top" enterDelay={400}>
                <Typography sx={{
                  fontFamily: FONT, fontSize: '0.95rem', fontWeight: 700, color: BRAND.ink,
                  lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {jobTitle}
                </Typography>
              </Tooltip>
              <Tooltip title={`${company} · ${roundName}`} arrow placement="top" enterDelay={400}>
                <Typography sx={{
                  fontFamily: FONT, fontSize: '0.78rem', color: BRAND.faint, mt: 0.25,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {company} · {roundName}
                </Typography>
              </Tooltip>
            </Box>
          </Stack>

          {winText && (
            <Tooltip title={winText} arrow placement="top" enterDelay={400}>
              <Typography sx={{
                fontFamily: FONT, fontSize: '0.78rem', fontWeight: 600,
                color: urgent ? BRAND.amber : eff === 'live' ? BRAND.live : BRAND.muted,
                flex: '1 1 auto', minWidth: 0,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {winText}
              </Typography>
            </Tooltip>
          )}

          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexShrink: 0 }}>
            {statusPill}
            {/* BUILD: 2026-08-14-live-candidate-reschedule-v1 */}
            {rescheduleBtn}
            {hasAction && actionBtn}
          </Stack>
        </Stack>
      </Paper>
    );
  }

  /* ── GRID VIEW — the Calendar Leaf card ────────────────────────────────── */
  return (
    <Paper
      elevation={0}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      aria-label={`${jobTitle} at ${company}`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleCardClick(); } }}
      sx={{
        position: 'relative',
        cursor: 'pointer',
        borderRadius: '16px',
        bgcolor: BRAND.surface,
        overflow: 'hidden',
        boxShadow: '0 12px 28px rgba(2,33,36,0.08)',
        p: '18px 20px 20px',
        height: '100%',
        display: 'flex', flexDirection: 'column',
        transition: 'transform .3s ease, box-shadow .3s ease',
        outline: 'none',
        '&:focus-visible': { boxShadow: `0 0 0 2px ${BRAND.sage}, 0 12px 28px rgba(2,33,36,0.08)` },
        '&:hover': {
          transform: 'translateY(-6px)',
          boxShadow: '0 24px 56px rgba(2,33,36,0.13)',
        },
        '&:hover .di-dogear': { borderTopWidth: '46px', borderLeftWidth: '46px' },
        '&:hover .di-dogear-sh': { width: 46, height: 46 },
      }}
    >
      {/* Dog-ear fold — colour is the status */}
      <Tooltip title={pill.label} arrow placement="left">
        <Box sx={{ position: 'absolute', top: 0, right: 0, zIndex: 2 }}>
          <Box className="di-dogear" sx={{
            width: 0, height: 0,
            borderLeft: `40px solid ${fold.edge}`,
            borderTop:  `40px solid ${fold.face}`,
            borderRadius: '0 16px 0 0',
            transition: 'border-width .25s ease',
          }} />
          <Box className="di-dogear-sh" sx={{
            position: 'absolute', top: 0, right: 0, width: 40, height: 40,
            background: 'linear-gradient(225deg, transparent 50%, rgba(2,33,36,0.16) 50%, transparent 64%)',
            pointerEvents: 'none', transition: 'all .25s ease',
          }} />
        </Box>
      </Tooltip>

      {/* Header row: avatar + title + "Company · Round name" — Tooltip
          surfaces the full text on hover when the card truncates either. */}
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', pr: 4.5 }}>
        {avatarNode}
        <Box sx={{ minWidth: 0 }}>
          <Tooltip title={jobTitle} arrow placement="top" enterDelay={400}>
            <Typography sx={{
              fontFamily: FONT, fontSize: 16.5, fontWeight: 700, color: BRAND.ink,
              lineHeight: 1.25,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
              {jobTitle}
            </Typography>
          </Tooltip>
          <Tooltip title={`${company} · ${roundName}`} arrow placement="top" enterDelay={400}>
            <Typography sx={{
              fontFamily: FONT, fontSize: 12, color: BRAND.faint, mt: 0.375,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {company} · {roundName}
            </Typography>
          </Tooltip>
        </Box>
      </Stack>

      {/* Calendar-leaf row — the signature: tear-off date + what it means */}
      <Stack direction="row" spacing={1.5} sx={{ mt: 1.75, alignItems: 'center' }}>
        {leafNode}
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{
            fontFamily: FONT, fontSize: 10.5, fontWeight: 800,
            letterSpacing: '0.8px', textTransform: 'uppercase',
            color: urgent ? BRAND.amber : eff === 'live' ? BRAND.live : BRAND.faint,
          }}>
            {leafTitle}
          </Typography>
          <Tooltip title={leafSub || ''} arrow placement="top" enterDelay={400} disableHoverListener={!leafSub}>
            <Typography sx={{
              fontFamily: FONT, fontSize: 12.5, fontWeight: 600,
              color: BRAND.ink, mt: 0.25, lineHeight: 1.3,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {leafSub || '—'}
            </Typography>
          </Tooltip>
        </Box>
      </Stack>

      {/* Dashed window line — matches the Deadline Forward direction. Turns
          amber under booking pressure and green when a live meeting is open.
          Tooltip surfaces the full string ("Missed — window closed with no
          attempt", etc.) when the card truncates it — the case the screenshot
          flagged. */}
      {winText && (
        <Stack direction="row" spacing={0.75} sx={{
          alignItems: 'center', mt: 1.5, pt: 1.25,
          borderTop: `1.5px dashed ${urgent ? 'rgba(163,90,45,0.5)' : eff === 'live' ? 'rgba(46,125,79,0.45)' : BRAND.borderStrong}`,
        }}>
          {eff === 'live'
            ? <VideocamRounded sx={{ fontSize: 14, color: BRAND.live, flexShrink: 0 }} />
            : <EventOutlined sx={{ fontSize: 14, color: urgent ? BRAND.amber : BRAND.faint, flexShrink: 0 }} />}
          <Tooltip title={winText} arrow placement="top" enterDelay={400}>
            <Typography sx={{
              fontFamily: FONT, fontSize: 12.5, fontWeight: 600,
              color: urgent ? BRAND.amber : eff === 'live' ? BRAND.live : BRAND.muted,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
            }}>
              {winText}
            </Typography>
          </Tooltip>
        </Stack>
      )}

      {/* Footer: pill + optional action. When the action label would just
          repeat the pill (Completed w/o recording, Missed, Cancelled,
          Expired) we drop the button, so finished cards visibly quiet down. */}
      <Stack direction="row"
        sx={{ justifyContent: 'space-between', alignItems: 'center', mt: 'auto', pt: 2, width: '100%', gap: 1 }}>
        {statusPill}
        {/* BUILD: 2026-08-14-live-candidate-reschedule-v1 */}
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexShrink: 0 }}>
          {rescheduleBtn}
          {hasAction && actionBtn}
        </Stack>
      </Stack>
    </Paper>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Skeleton — mirrors the Calendar Leaf card shape while loading
═══════════════════════════════════════════════════════════════════════════ */
function CardSkeleton() {
  return (
    <Card elevation={0} sx={{
      borderRadius: '16px', border: `1px solid ${BRAND.border}`, p: 2.25,
      bgcolor: BRAND.surface,
    }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <Skeleton variant="circular" width={40} height={40} />
        <Box sx={{ flexGrow: 1 }}>
          <Skeleton width="80%" height={20} />
          <Skeleton width="55%" height={14} />
        </Box>
      </Stack>
      <Stack direction="row" spacing={1.5} sx={{ mt: 1.75, alignItems: 'center' }}>
        <Skeleton variant="rounded" width={52} height={52} sx={{ borderRadius: '10px' }} />
        <Box sx={{ flexGrow: 1 }}>
          <Skeleton width="45%" height={14} />
          <Skeleton width="75%" height={16} sx={{ mt: 0.5 }} />
        </Box>
      </Stack>
      <Skeleton width="80%" height={16} sx={{ mt: 2 }} />
      <Stack direction="row" spacing={1} sx={{ mt: 2, alignItems: 'center' }}>
        <Skeleton variant="rounded" width={70} height={22} sx={{ borderRadius: '999px' }} />
        <Skeleton variant="rounded" height={34} sx={{ borderRadius: '999px', flex: 1 }} />
      </Stack>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MyInterviewsMode — the "Book Interview" tab
═══════════════════════════════════════════════════════════════════════════ */
const MyInterviewsMode = () => {
  const {
    slots, history, loading, error,
    refetch,
  } = useLiveInterview();

  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const bookSlotToken = searchParams.get("slot");

  // ── IAEM: available releases the candidate can book from ──
  const [iaemReleases, setIaemReleases] = useState([]);
  const [iaemLoading, setIaemLoading] = useState(true);

  useEffect(() => {
    jobseekerSlotService.getMyAvailableReleases()
      .then((res) => setIaemReleases(res.data?.releases || []))
      .catch((err) => console.warn('[LiveInterview] IAEM releases load failed:', err))
      .finally(() => setIaemLoading(false));
  }, []);

  const [view,        setView]        = useState('all');
  const [viewMode,    setViewMode]    = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [page,        setPage]        = useState(1);
  const [pageSize,    setPageSize]    = useState(DEFAULT_PAGE_SIZE);
  const [busyId,      setBusyId]      = useState(null);
  const [toast,       setToast]       = useState(null);

  // BUILD: 2026-08-14-live-candidate-reschedule-v1
  const [reschedDlg,  setReschedDlg]  = useState(null);
  const [reschedBusy, setReschedBusy] = useState(false);

  const submitReschedule = async () => {
    if (!reschedDlg?.item || reschedBusy) return;
    const item = reschedDlg.item;
    const reason = (reschedDlg.reason || '').trim();

    // Live-video interviews reschedule through IAEM
    const iaemBookingId = item.iaem_booking_id;
    if (item.interview_type === 'live-video' || item._kind === 'slot') {
      if (!iaemBookingId) {
        setToast({ severity: 'error',
          message: 'No IAEM booking found for this interview — cannot reschedule.' });
        return;
      }
      setReschedBusy(true);
      try {
        const { jobseekerSlotService } = await import('@/services/api/iaem');
        await jobseekerSlotService.requestReschedule(iaemBookingId, reason);
        setToast({ severity: 'success',
          message: 'Reschedule requested — HR will review and you will be notified.' });
        setReschedDlg(null);
        refetch();
      } catch (e) {
        const detail = e?.response?.data?.detail
          || 'Could not request a reschedule for this interview.';
        setToast({ severity: 'error', message: detail });
      } finally {
        setReschedBusy(false);
      }
      return;
    }

    // Non-live interviews use the pipeline endpoint
    const siId = item.id;
    if (!siId) {
      setToast({ severity: 'error',
        message: 'This slot does not expose an interview id — cannot reschedule.' });
      return;
    }
    setReschedBusy(true);
    try {
      await smartInterviewService.requestReschedule(siId, reason);
      setToast({ severity: 'success',
        message: 'Reschedule requested — the employer will pick a new time for this round.' });
      setReschedDlg(null);
      refetch();
    } catch (e) {
      const detail = e?.response?.data?.detail
        || 'Could not request a reschedule for this interview.';
      setToast({ severity: 'error', message: detail });
    } finally {
      setReschedBusy(false);
    }
  };

  const [recDlg, setRecDlg] = useState({ open:false, loading:false, url:'', duration:0, error:'' });

  /* ═══ BUILD: 2026-08-07-smart-soft-delete-v1 — soft-delete state ═══ */
  const [selectMode,   setSelectMode]   = useState(false);
  const [selectedKeys, setSelectedKeys] = useState(() => new Set());
  const [deleteBusy,   setDeleteBusy]   = useState(false);
  const [confirmDlg,   setConfirmDlg]   = useState({ open: false, target: null, bulk: false });

  const selectionKey = useCallback(
    (it) => `${it._kind}::${it._kind === 'invite' ? it.invite_token : (it.id ?? it.slot_id)}`,
    []
  );

  const toggleSelectOne = useCallback((it) => {
    const key = selectionKey(it);
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, [selectionKey]);

  const exitSelectMode = useCallback(() => {
    setSelectMode(false);
    setSelectedKeys(new Set());
  }, []);

  /* ── The three data sources become one uniform list, tagged with _kind so
        we can reason about them in one loop from here on. ───────────────── */
const items = useMemo(() => {
  const up   = (slots   || []).map((s) => ({ ...s, _kind: 'slot'    }));
  const hist = (history || []).map((h) => ({ ...h, _kind: 'history' }));
  return [...up, ...hist];
}, [slots, history]);

  /* ── Search across job / round / company (all three lists) ─────────────── */
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.trim().toLowerCase();
    return items.filter((it) => {
      const hay = `${it.job_title || ''} ${it.interview_name || ''} ${it.company_name || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, searchQuery]);

  /* ── Chip counts computed on the search-filtered set ───────────────────── */
  const chipCounts = useMemo(() => {
    const c = { all: filtered.length, upcoming: 0, completed: 0, expired: 0 };
    filtered.forEach((it) => { c[chipBucket(effectiveStatus(it))]++; });
    return c;
  }, [filtered]);

  /* ── Filter by active chip ─────────────────────────────────────────────── */
  const visible = useMemo(() => {
    if (view === 'all') return filtered;
    return filtered.filter((it) => chipBucket(effectiveStatus(it)) === view);
  }, [filtered, view]);

  /* ── Order: To Book first (soonest expiry first), then Live/Upcoming
        (soonest first), then Completed / Expired (newest first). ────────── */
  const sortedVisible = useMemo(() => {
    const orderKey = (it) => {
      const e = effectiveStatus(it);
      if (e === 'to_book')  return [0, new Date(it.expires_at || 0).getTime()];
      if (e === 'live')     return [1, new Date(it.window_start || 0).getTime()];
      if (e === 'upcoming') return [2, new Date(it.window_start || 0).getTime()];
      if (e === 'completed')return [3, -new Date(it.window_start || 0).getTime()];
      if (e === 'missed' || e === 'cancelled') return [4, -new Date(it.window_start || 0).getTime()];
      return [5, -new Date(it.expires_at || it.window_start || 0).getTime()];
    };
    return [...visible].sort((a, b) => {
      const [ax, ay] = orderKey(a); const [bx, by] = orderKey(b);
      return (ax - bx) || (ay - by);
    });
  }, [visible]);

  /* ── Pagination ────────────────────────────────────────────────────────── */
  const effectiveSize = pageSize === 'all' ? Math.max(sortedVisible.length, 1) : pageSize;
  const totalPages = Math.max(1, Math.ceil(sortedVisible.length / effectiveSize));
  useEffect(() => { setPage(1); }, [view, sortedVisible.length, pageSize, searchQuery]);
  useEffect(() => { if (page > totalPages) setPage(1); }, [page, totalPages]);
  const pagedVisible = useMemo(() => {
    const start = (page - 1) * effectiveSize;
    return sortedVisible.slice(start, start + effectiveSize);
  }, [sortedVisible, page, effectiveSize]);
  const handlePageChange = (_e, value) => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* ── Refresh — the hook refetches on mount; nudge state so children
        re-render even when the underlying arrays don't change identity. ── */
  const refresh = useCallback(() => {
    setToast({ severity: 'info', message: 'Refreshing…' });
    refetch();
    
  }, [refetch]);

  const prevTokenRef = useRef(bookSlotToken);
  useEffect(() => {
    if (prevTokenRef.current && !bookSlotToken) {
      refetch();
      
    }
    prevTokenRef.current = bookSlotToken;
  }, [bookSlotToken, refetch]);


  /* ── Actions preserved from the original page ──────────────────────────── */
  const handleChooseSlot = useCallback((invite) => {
    if (!invite?.invite_token) {
      setToast({ severity: 'warning', message: 'Invitation token missing.' });
      return;
    }
    /* Push a new history entry so browser Back returns cleanly to the list. */
    navigate(`${location.pathname}?slot=${encodeURIComponent(invite.invite_token)}`);
  }, [navigate, location.pathname]);

  const handleJoin = useCallback(async (iv) => {
    const link = iv.meeting_link || iv.meeting_url;
    if (!link) {
      setToast({ severity: 'warning', message: 'Meeting link not available yet.' });
      return;
    }
    if (!canJoinNow(iv)) {
      const mins = minutesUntilOpen(iv);
      setToast({
        severity: 'info',
        message: mins != null && mins > 0
          ? `The meeting opens in ${mins} minute(s). Please come back then.`
          : 'This interview is outside its time window.',
      });
      return;
    }
    const roomName = roomFromLink(link);
    if (!roomName) {
      /* External link (Google Meet, Zoom, etc.) — open directly */
      window.open(link, '_blank', 'noopener,noreferrer');
      return;
    }
    setBusyId(getId(iv));
    try {
      if (iv.slot_id) {
        try {
          const res = await smartInterviewService.joinWaitingRoom(iv.slot_id);
          if (res.already_admitted) {
            navigate(`/live-room/${roomName}`);
          } else {
            navigate(`/waiting-room/${roomName}`, { state: { slotId: iv.slot_id, interview: iv } });
          }
        } catch (err) {
          const msg = err?.response?.data?.detail || 'Could not join waiting room.';
          setToast({ severity: 'error', message: msg });
        }
      } else {
        navigate(`/live-room/${roomName}`);
      }
    } finally {
      setBusyId(null);
    }
  }, [navigate]);

  const handleViewRecording = useCallback(async (iv) => {
    const link = iv.meeting_link || iv.meeting_url;
    const roomName = roomFromLink(link);
    if (!roomName) {
      setToast({ severity: 'info', message: 'Recording is not available for this interview.' });
      return;
    }
    setRecDlg({ open: true, loading: true, url: '', duration: 0, error: '' });
    try {
      const res = await api.get(`/employer/interviews/live/recording/${roomName}/`);
      const d = res.data;
      if (d.status === 'completed' && d.presigned_url) {
        setRecDlg({ open: true, loading: false, url: d.presigned_url, duration: d.duration_secs || 0, error: '' });
      } else if (d.status === 'recording') {
        setRecDlg({ open: true, loading: false, url: '', duration: 0, error: 'Recording is still processing. Try again in a minute.' });
      } else {
        setRecDlg({ open: true, loading: false, url: '', duration: 0, error: 'Recording is not available.' });
      }
    } catch (err) {
      setRecDlg({ open: true, loading: false, url: '', duration: 0, error: err?.response?.data?.detail || 'Failed to load recording.' });
    }
  }, []);

  /* Explain the lock when a candidate taps a locked card / button */
  const handleLockedTouch = useCallback((iv, eff) => {
    if (eff === 'upcoming') {
      const mins = minutesUntilOpen(iv);
      setToast({
        severity: 'info',
        message: mins != null && mins > 0
          ? `The meeting opens in ${mins} minute(s). Come back then.`
          : `Starts ${formatWhen(iv)}.`,
      });
    } else if (eff === 'missed') {
      setToast({ severity: 'warning', message: 'You didn\u2019t attend this interview.' });
    } else if (eff === 'cancelled') {
      setToast({ severity: 'info', message: 'This interview was cancelled by the employer.' });
    } else if (eff === 'expired') {
      setToast({ severity: 'info', message: iv._kind === 'invite'
        ? 'This invitation window has closed.'
        : 'This interview has expired.' });
   } else if (eff === 'completed') {
      setToast({ severity: 'info', message: 'This interview is complete. A recording will show here if the employer enabled recording.' });
    }
  }, []);

  /* ═══ BUILD: 2026-08-07-smart-soft-delete-v1 — delete handlers ═══ */
  const doDeleteOne = useCallback(async (it) => {
    if (!it) return;
    setDeleteBusy(true);
    try {
      const siId = it.id ?? it.slot_id;
      await smartInterviewService.deleteSmartInterview(siId);
      setToast({ severity: 'success', message: 'Removed from your list.' });
      refetch();
      
    } catch (err) {
      setToast({
        severity: 'error',
        message: err?.response?.data?.detail || 'Failed to remove. Please try again.',
      });
    } finally {
      setDeleteBusy(false);
      setConfirmDlg({ open: false, target: null, bulk: false });
    }
  }, [refetch]);

  const doDeleteBulk = useCallback(async () => {
    const ids = [];
    for (const it of items) {
      const key = selectionKey(it);
      if (!selectedKeys.has(key)) continue;
      ids.push(it.id ?? it.slot_id);
    }
    if (ids.length === 0) {
      setConfirmDlg({ open: false, target: null, bulk: false });
      return;
    }
    setDeleteBusy(true);
    try {
      const res = await smartInterviewService.deleteSmartBulk(ids);
      const total = (res?.hidden_interviews || 0);
      setToast({
        severity: 'success',
        message: `Removed ${total} ${total === 1 ? 'item' : 'items'} from your list.`,
      });
      exitSelectMode();
      refetch();
      
    } catch (err) {
      setToast({
        severity: 'error',
        message: err?.response?.data?.detail || 'Bulk remove failed. Please try again.',
      });
    } finally {
      setDeleteBusy(false);
      setConfirmDlg({ open: false, target: null, bulk: false });
    }
  }, [items, selectedKeys, selectionKey, exitSelectMode, refetch]);

  const selectAllVisible = useCallback(() => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      sortedVisible.forEach((it) => next.add(selectionKey(it)));
      return next;
    });
  }, [sortedVisible, selectionKey]);

  const toBookCount = useMemo(
    () => items.filter((it) => effectiveStatus(it) === 'to_book').length,
    [items]
  );

  // Old BookSlotMode removed — IAEM handles booking via /jobseeker/smart-interviews/book/:releaseId

  const totalCount = items.length;
  const isFirstLoad = loading && items.length === 0;
  const showError = (error) && !loading && items.length === 0;

  return (
    <Box className="page-fade-in" sx={{
      p: { xs: 1.5, sm: 2, md: 3, lg: 4 },
      maxWidth: 1440, mx: 'auto', bgcolor: BRAND.bg, minHeight: '100vh',
      fontFamily: FONT,
      '& .MuiTypography-root, & .MuiButton-root, & .MuiChip-root, & .MuiInputBase-root, & .MuiMenuItem-root, & .MuiPaginationItem-root': {
        fontFamily: FONT,
      },
    }}>

      {/* ── Command header — identical to AI Assessments / Doc Interviews ─ */}
      <Paper
        elevation={0}
        sx={{
          bgcolor: BRAND.surface,
          border: `1px solid ${BRAND.border}`,
          borderRadius: { xs: '14px', sm: '16px' },
          p: { xs: 2, sm: 2.5, md: 3 },
          mb: { xs: 2, md: 2.5 },
          boxShadow: '0 1px 2px rgba(16,18,16,0.04)',
        }}
      >
        {/* Row 1 — title + subline + refresh */}
        <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5, mb: { xs: 2, md: 2.25 } }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography component="h1" sx={{
              fontWeight: 700, color: BRAND.ink,
              letterSpacing: '-0.02em', lineHeight: 1.15,
              fontSize: { xs: '1.3rem', sm: '1.45rem', md: '1.6rem' },
            }}>
              Book Interview
            </Typography>
            <Typography sx={{ color: BRAND.muted, fontSize: { xs: '0.82rem', sm: '0.9rem' }, fontWeight: 500, mt: 0.5 }}>
              <Box component="span" sx={{ color: BRAND.sageText, fontWeight: 700 }}>
                {isFirstLoad ? '—' : `${totalCount} ${totalCount === 1 ? 'interview' : 'interviews'}`}
              </Box>
              {toBookCount > 0 && !isFirstLoad && (
                <>
                  {' · '}
                  <Box component="span" sx={{ color: BRAND.amber, fontWeight: 700 }}>
                    {toBookCount} awaiting your booking
                  </Box>
                </>
              )}
              {toBookCount === 0 && !isFirstLoad && ' assigned to you'}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 0.5 }}>
            {/* ═══ BUILD: 2026-08-07-smart-soft-delete-v3 ═══
                Always-visible "Select" label so users know what the
                control does without needing to hover. */}
            {!selectMode ? (
              <Button
                startIcon={<CheckBoxOutlineBlankRounded sx={{ fontSize: 16 }} />}
                onClick={() => setSelectMode(true)}
                disabled={loading || items.length === 0}
                sx={{
                  textTransform: 'none', fontFamily: FONT,
                  fontSize: '0.78rem', fontWeight: 700,
                  color: BRAND.muted,
                  border: `1px solid ${BRAND.borderStrong}`,
                  borderRadius: '9px',
                  px: 1.25, height: 34, minWidth: 0,
                  '&:hover': { bgcolor: BRAND.sageSoft, color: BRAND.navy, borderColor: BRAND.sage },
                  '&.Mui-disabled': { color: BRAND.faint, borderColor: BRAND.border },
                }}
              >
                Select
              </Button>
            ) : (
              <>
                <Button
                  size="small"
                  onClick={selectAllVisible}
                  sx={{
                    textTransform: 'none', fontFamily: FONT, fontSize: '0.78rem',
                    fontWeight: 700, color: BRAND.navy, borderRadius: '9px',
                    '&:hover': { bgcolor: BRAND.sageSoft },
                  }}
                >
                  Select all visible
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  disabled={selectedKeys.size === 0 || deleteBusy}
                  startIcon={<DeleteOutlineRounded sx={{ fontSize: 16 }} />}
                  onClick={() => setConfirmDlg({ open: true, target: null, bulk: true })}
                  sx={{
                    textTransform: 'none', fontFamily: FONT, fontSize: '0.78rem',
                    fontWeight: 700, bgcolor: BRAND.danger, color: '#fff',
                    borderRadius: '9px', boxShadow: 'none',
                    '&:hover': { bgcolor: '#8B321F', boxShadow: 'none' },
                  }}
                >
                  Remove ({selectedKeys.size})
                </Button>
                <Tooltip title="Cancel" arrow>
                  <IconButton
                    onClick={exitSelectMode}
                    size="small"
                    sx={{
                      color: BRAND.muted,
                      border: `1px solid ${BRAND.borderStrong}`,
                      borderRadius: '9px',
                      '&:hover': { bgcolor: BRAND.sageSoft, color: BRAND.navy, borderColor: BRAND.sage },
                    }}
                  >
                    <CloseRounded sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
              </>
            )}
            <Tooltip title="Refresh" arrow>
              <span>
                <IconButton
                  onClick={refresh}
                  disabled={loading}
                  size="small"
                  sx={{
                    color: BRAND.muted,
                    border: `1px solid ${BRAND.borderStrong}`,
                    borderRadius: '9px',
                    '&:hover': { bgcolor: BRAND.sageSoft, color: BRAND.navy, borderColor: BRAND.sage },
                  }}
                >
                  <RefreshOutlined sx={{ fontSize: 18 }} />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </Stack>

        {/* Row 2 — search */}
        <Stack direction="row" spacing={1} sx={{ alignItems: 'stretch', flexWrap: 'wrap', gap: 1 }}>
          <TextField
            placeholder="Search by job, round, or company"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: BRAND.muted, fontSize: 20 }} />
                  </InputAdornment>
                ),
                endAdornment: searchQuery ? (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => setSearchQuery('')}
                      aria-label="Clear search"
                      sx={{ color: BRAND.muted, '&:hover': { color: BRAND.ink, bgcolor: 'rgba(16,18,16,0.05)' } }}
                    >
                      <ClearRounded sx={{ fontSize: 18 }} />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              },
            }}
            sx={{
              flex: '1 1 300px',
              minWidth: { xs: '100%', sm: 260 },
              '& .MuiOutlinedInput-root': {
                bgcolor: BRAND.bg,
                borderRadius: '25px',
                fontSize: { xs: '0.88rem', sm: '0.92rem' },
                height: { xs: 46, md: 48 },
                color: BRAND.ink,
                fontFamily: FONT,
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                '& input::placeholder': { color: BRAND.muted, opacity: 0.85 },
                '& fieldset': { borderColor: '#B0BEC5', borderWidth: '1.5px' },
                '&:hover fieldset': { borderColor: '#78909C', borderWidth: '2px' },
                '&.Mui-focused': { boxShadow: '0 6px 18px rgba(0,0,0,0.12)' },
                '&.Mui-focused fieldset': { borderColor: BRAND.sage, borderWidth: '2px' },
              },
            }}
          />
        </Stack>

        {/* Row 3 — chips + view toggle */}
        <Stack direction="row" sx={{ alignItems: 'center', mt: { xs: 1.75, md: 2 }, gap: 1, flexWrap: 'wrap' }}>
          <Box sx={{
            display: 'flex', gap: 0.75, alignItems: 'center',
            flexWrap: { xs: 'nowrap', sm: 'wrap' },
            overflowX: { xs: 'auto', sm: 'visible' },
            pb: { xs: 0.5, sm: 0 }, mr: 'auto', minWidth: 0,
            '&::-webkit-scrollbar': { display: 'none' },
          }}>
            {VIEW_CHIPS.map((opt) => {
              const selected = view === opt.value;
              return (
                <Box
                  key={opt.value}
                  onClick={() => setView(opt.value)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setView(opt.value)}
                  sx={{
                    cursor: 'pointer', userSelect: 'none',
                    display: 'inline-flex', alignItems: 'center', gap: 0.6,
                    px: 1.5, py: 0.65, borderRadius: 999, flexShrink: 0,
                    fontSize: '0.8rem', fontWeight: selected ? 700 : 600,
                    fontFamily: FONT,
                    bgcolor: selected ? BRAND.navy : BRAND.surface,
                    color: selected ? '#fff' : BRAND.muted,
                    border: `1px solid ${selected ? BRAND.navy : BRAND.borderStrong}`,
                    transition: 'all 0.16s ease',
                    '&:hover': {
                      bgcolor: selected ? BRAND.navy : BRAND.bg,
                      borderColor: selected ? BRAND.navy : BRAND.muted,
                    },
                  }}
                >
                  {opt.label}
                  <Box component="span" sx={{
                    fontSize: '0.68rem', fontWeight: 800, lineHeight: 1.6,
                    px: 0.7, borderRadius: 999,
                    bgcolor: selected ? 'rgba(255,255,255,0.22)' : BRAND.bg,
                    color: selected ? '#fff' : BRAND.muted,
                  }}>
                    {isFirstLoad ? '—' : chipCounts[opt.value]}
                  </Box>
                </Box>
              );
            })}
          </Box>

          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_e, m) => m && setViewMode(m)}
            sx={{
              height: 38, flexShrink: 0,
              bgcolor: BRAND.bg,
              border: `1px solid ${BRAND.border}`,
              borderRadius: '10px', p: '3px',
              '& .MuiToggleButton-root': {
                border: 0, borderRadius: '7px !important', m: 0,
                color: BRAND.muted, px: 1.25, height: 30,
                '&:hover': { bgcolor: 'rgba(16,18,16,0.04)' },
                '&.Mui-selected': {
                  bgcolor: BRAND.surface, color: BRAND.navy,
                  boxShadow: '0 1px 3px rgba(16,18,16,0.12)',
                  '&:hover': { bgcolor: BRAND.surface },
                },
              },
            }}
          >
            <ToggleButton value="grid" aria-label="grid view"><ViewModule sx={{ fontSize: 18 }} /></ToggleButton>
            <ToggleButton value="list" aria-label="list view"><ViewList sx={{ fontSize: 18 }} /></ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Paper>

      {/* ── Error banner ─────────────────────────────────────────────────── */}
      {showError && (
        <Alert severity="error" icon={<ErrorOutlined />} sx={{ mb: 2, borderRadius: '12px' }}>
          {error}
        </Alert>
      )}

      {/* ── Loading skeletons ────────────────────────────────────────────── */}
      {isFirstLoad && (
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, minmax(0, 1fr))',
            md: 'repeat(3, minmax(0, 1fr))',
            lg: 'repeat(4, minmax(0, 1fr))',
          },
          gap: { xs: 1.5, sm: 1.75, md: 2 },
          pb: 4,
        }}>
          {[0,1,2,3,4,5,6,7].map((i) => <CardSkeleton key={i} />)}
        </Box>
      )}

      {/* ── Content ──────────────────────────────────────────────────────── */}
      {!isFirstLoad && !showError && (
        <>
          {/* ── IAEM: Available rounds to book ─────────────────────────────── */}
          {iaemReleases.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: BRAND.sage, mb: 1.5, fontFamily: FONT }}>
                Book Your Interview
              </Typography>
              <Box sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
                gap: 2,
              }}>
                {iaemReleases.map((rel) => (
                  <Card key={rel.release_id} variant="outlined" sx={{
                    borderRadius: '14px', border: `1px solid ${BRAND.sage}40`,
                    bgcolor: BRAND.surface, overflow: 'hidden',
                    transition: 'box-shadow 0.2s, transform 0.2s',
                    '&:hover': { boxShadow: '0 4px 16px rgba(0,0,0,0.08)', transform: 'translateY(-1px)' },
                  }}>
                    {/* BUILD: 2026-09-25-iaem-book-card-left-rail-v1 */}
                    <Box sx={{ display: 'flex', alignItems: 'stretch' }}>
                      <Box sx={{ width: 5, bgcolor: BRAND.sage, flexShrink: 0 }} />
                      <Box sx={{ p: 2.5, flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, mb: 0.5 }}>
                          <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: BRAND.ink, fontFamily: FONT, lineHeight: 1.3 }}>
                            {rel.job_title}
                          </Typography>
                          <Chip
                            label={`${rel.open_slots} slot${rel.open_slots === 1 ? '' : 's'} open`}
                            size="small"
                            sx={{
                              bgcolor: `${BRAND.sage}22`, color: BRAND.pine,
                              fontWeight: 700, fontSize: '0.68rem', height: 22,
                              border: `1px solid ${BRAND.sage}55`,
                              '& .MuiChip-label': { px: 1 },
                              flexShrink: 0,
                            }}
                          />
                        </Box>
                        <Typography sx={{ fontSize: '0.78rem', color: BRAND.muted, mb: 1.5, fontFamily: FONT }}>
                          {rel.company_name}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.75, color: BRAND.muted }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <LayersOutlined sx={{ fontSize: 14 }} />
                            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, fontFamily: FONT }}>
                              {rel.level}
                            </Typography>
                          </Box>
                          <Box sx={{ width: '3px', height: '3px', borderRadius: '50%', bgcolor: BRAND.faint || BRAND.muted, opacity: 0.6 }} />
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <AccessTimeOutlined sx={{ fontSize: 14 }} />
                            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, fontFamily: FONT }}>
                              {rel.duration}
                            </Typography>
                          </Box>
                        </Box>
                        {rel.round_name && (
                          <Typography sx={{ fontSize: '0.72rem', color: BRAND.sage, fontWeight: 700, mb: 1.75, fontFamily: FONT, letterSpacing: 0.2 }}>
                            ROUND {rel.round_order} · {rel.round_name}
                          </Typography>
                        )}
                        <Button
                          fullWidth variant="contained" disableElevation
                          onClick={() => navigate(`/jobseeker/smart-interviews/book/${rel.release_id}`)}
                          startIcon={<EventOutlined sx={{ fontSize: 16 }} />}
                          sx={{
                            bgcolor: BRAND.pine, color: '#fff', textTransform: 'none',
                            fontWeight: 700, borderRadius: '10px', fontSize: '0.82rem',
                            fontFamily: FONT, py: 1,
                            '&:hover': { bgcolor: '#0a3d40' },
                          }}
                        >
                          Choose a time slot
                        </Button>
                      </Box>
                    </Box>
                  </Card>
                ))}
              </Box>
            </Box>
          )}

          {sortedVisible.length === 0 && iaemReleases.length === 0 ? (
            <Box sx={{
              textAlign: 'center', py: { xs: 5, sm: 7 }, px: 2,
              bgcolor: BRAND.surface, borderRadius: '16px',
              border: `1px dashed ${BRAND.borderStrong}`,
            }}>
              <Typography sx={{ mb: 1, color: BRAND.ink, fontWeight: 700, fontSize: { xs: '0.95rem', sm: '1.05rem' } }}>
                {searchQuery
                  ? 'No interviews match'
                  : view === 'upcoming'  ? 'Nothing upcoming'
                  : view === 'completed' ? 'No completed interviews yet'
                  : view === 'expired'   ? 'Nothing expired'
                  : 'No live interviews yet'}
              </Typography>
              <Typography sx={{ mb: searchQuery ? 2.5 : 0, color: BRAND.muted, fontSize: { xs: '0.78rem', sm: '0.875rem' } }}>
                {searchQuery
                  ? 'Try a different search or switch the status filter back to All.'
                  : view === 'upcoming'  ? 'Pending invites and booked interviews will appear here.'
                  : view === 'completed' ? 'Finished interviews and recordings will appear here.'
                  : view === 'expired'   ? 'Missed, cancelled, or expired items will collect here.'
                  : 'When an employer schedules a live interview it will appear here.'}
              </Typography>
              {searchQuery && (
                <Button
                  variant="outlined"
                  onClick={() => { setSearchQuery(''); setView('all'); }}
                  sx={{
                    borderColor: BRAND.borderStrong, color: BRAND.ink,
                    textTransform: 'none', fontWeight: 600, borderRadius: '10px',
                    '&:hover': { borderColor: BRAND.sage, bgcolor: BRAND.sageSoft },
                  }}
                >
                  Clear search & filters
                </Button>
              )}
            </Box>
          ) : (
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: viewMode === 'grid' ? 'repeat(2, minmax(0, 1fr))' : '1fr',
                md: viewMode === 'grid' ? 'repeat(3, minmax(0, 1fr))' : '1fr',
                lg: viewMode === 'grid' ? 'repeat(4, minmax(0, 1fr))' : '1fr',
              },
              gap: viewMode === 'grid' ? { xs: 1.5, sm: 1.75, md: 2 } : { xs: 1, sm: 1.25 },
              width: '100%',
            }}>
              {pagedVisible.map((it) => {
                const id = getId(it);
                return (
                  <Box key={`${it._kind}-${id}`} sx={{ minWidth: 0, width: '100%' }}>
                    
                    <Box sx={{ position: 'relative' }}>
                      {selectMode ? (
                        <Box
                          onClick={(e) => { e.stopPropagation(); toggleSelectOne(it); }}
                          sx={{
                            position: 'absolute', bottom: 10, right: 10, zIndex: 5,
                            bgcolor: '#FFFFFF', borderRadius: '8px',
                            boxShadow: '0 2px 6px rgba(2,33,36,0.15)',
                            cursor: 'pointer',
                          }}
                        >
                          <Checkbox
                            checked={selectedKeys.has(selectionKey(it))}
                            size="small"
                            sx={{
                              p: 0.5,
                              color: BRAND.borderStrong,
                              '&.Mui-checked': { color: BRAND.navy },
                            }}
                          />
                        </Box>
                      ) : (
                        <Tooltip title="Remove from my list" arrow placement="left">
                          <Button
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDlg({ open: true, target: it, bulk: false });
                            }}
                            startIcon={<DeleteOutlineRounded sx={{ fontSize: 15 }} />}
                            sx={{
                              position: 'absolute', bottom: 10, right: 10, zIndex: 5,
                              textTransform: 'none', fontFamily: FONT,
                              fontSize: '0.7rem', fontWeight: 700,
                              lineHeight: 1, minWidth: 0, height: 26,
                              px: 1, py: 0,
                              color: BRAND.danger,
                              bgcolor: '#FFFFFF',
                              border: `1px solid ${BRAND.dangerSoft}`,
                              borderRadius: '999px',
                              boxShadow: '0 2px 6px rgba(2,33,36,0.10)',
                              transition: 'all 0.15s ease',
                              '& .MuiButton-startIcon': { mr: 0.4, ml: 0 },
                              '&:hover': {
                                color: '#FFFFFF',
                                bgcolor: BRAND.danger,
                                borderColor: BRAND.danger,
                                boxShadow: '0 3px 10px rgba(166,61,47,0.35)',
                              },
                            }}
                          >
                          
                          </Button>
                        </Tooltip>
                      )}
                      <InterviewCard
                        item={it}
                        viewMode={viewMode}
                        busy={busyId === id}
                        onChooseSlot={handleChooseSlot}
                        onJoin={handleJoin}
                        onViewRecording={handleViewRecording}
                        onLockedTouch={handleLockedTouch}
                        /* BUILD: 2026-08-14-live-candidate-reschedule-v1 */
                        onRequestReschedule={(sel) => setReschedDlg({ item: sel, reason: '' })}
                      />
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}

          {/* ── Pagination bar — identical to AI Assessments ─────────────── */}
          {sortedVisible.length > 0 && (
            <Box sx={{
              mt: { xs: 3, sm: 3.5 }, mb: 4,
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'stretch', sm: 'center' },
              gap: { xs: 1.5, sm: 2 },
            }}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={{ xs: 1, sm: 2 }}
                sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, flex: 1, minWidth: 0 }}
              >
                <Typography sx={{
                  fontSize: { xs: '0.78rem', sm: '0.82rem' },
                  color: BRAND.muted, fontWeight: 500, whiteSpace: 'nowrap',
                }}>
                  Showing{' '}
                  <Box component="span" sx={{ color: BRAND.ink, fontWeight: 700 }}>
                    {(page - 1) * effectiveSize + 1}–{Math.min(page * effectiveSize, sortedVisible.length)}
                  </Box>
                  {' '}of{' '}
                  <Box component="span" sx={{ color: BRAND.ink, fontWeight: 700 }}>
                    {sortedVisible.length}
                  </Box>
                  {' '}interviews
                </Typography>

                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                  <Typography sx={{ fontSize: { xs: '0.78rem', sm: '0.82rem' }, color: BRAND.muted, fontWeight: 500 }}>
                    Show
                  </Typography>
                  <Select
                    size="small"
                    value={pageSize}
                    onChange={(e) => {
                      const v = e.target.value;
                      setPageSize(v === 'all' ? 'all' : Number(v));
                    }}
                    renderValue={(v) => (v === 'all' ? 'All' : v)}
                    MenuProps={{
                      slotProps: { paper: {
                        sx: {
                          borderRadius: '12px',
                          mt: 0.5,
                          border: `1px solid ${BRAND.border}`,
                          boxShadow: '0 8px 24px rgba(2,33,36,0.12)',
                          '& .MuiMenuItem-root': {
                            fontSize: '0.82rem', fontWeight: 600, fontFamily: FONT,
                            color: BRAND.ink,
                            minHeight: { xs: 40, sm: 36 },
                            '&.Mui-selected': {
                              bgcolor: BRAND.sageSoft, color: BRAND.navy,
                              '&:hover': { bgcolor: BRAND.sageSoft },
                            },
                          },
                        },
                      } },
                    }}
                    sx={{
                      fontSize: '0.82rem', fontWeight: 700, fontFamily: FONT,
                      color: BRAND.navy, bgcolor: BRAND.bg,
                      borderRadius: '10px', minWidth: { xs: 76, sm: 80 },
                      height: { xs: 38, sm: 36 },
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: BRAND.border },
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: BRAND.navy },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: BRAND.navy, borderWidth: '1px',
                      },
                      '& .MuiSelect-select': { py: 0.75, pl: 1.25, pr: '28px !important' },
                      '& .MuiSvgIcon-root': { color: BRAND.navy },
                    }}
                  >
                    {PAGE_SIZE_OPTIONS.map((n) => (
                      <MenuItem key={n} value={n}>{n === 'all' ? 'All' : n}</MenuItem>
                    ))}
                  </Select>
                  <Typography sx={{ fontSize: { xs: '0.78rem', sm: '0.82rem' }, color: BRAND.muted, fontWeight: 500 }}>
                    per page
                  </Typography>
                </Stack>
              </Stack>

              {/* Pagination — matches FindJobs exactly: boxed items with
                  border + subtle bg, hover tint, selected pill in pine. */}
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
                    fontSize: { xs: '0.75rem', sm: '0.82rem' },
                    fontWeight: 600, fontFamily: FONT,
                    color: BRAND.ink,
                    borderRadius: '8px',
                    border: `1px solid ${BRAND.border}`,
                    bgcolor: BRAND.bg,
                    minWidth: { xs: 32, sm: 36 },
                    height: { xs: 32, sm: 36 },
                    '&:hover': { bgcolor: BRAND.sageSoft, borderColor: BRAND.sage },
                    '&.Mui-selected': {
                      bgcolor: BRAND.navy, color: '#fff',
                      borderColor: BRAND.navy, fontWeight: 700,
                      boxShadow: '0 4px 12px rgba(2,33,36,0.2)',
                      '&:hover': { bgcolor: BRAND.navyDark },
                    },
                  },
                  '& .MuiPaginationItem-ellipsis': {
                    border: 'none', bgcolor: 'transparent',
                  },
                }}
              />
            </Box>
          )}
        </>
      )}

      {/* ── Recording player dialog (preserved) ──────────────────────────── */}
      <Dialog
        open={recDlg.open}
        onClose={() => setRecDlg((p) => ({ ...p, open: false }))}
        maxWidth="md" fullWidth
        slotProps={{ paper: { sx: { borderRadius: '16px', overflow: 'hidden', fontFamily: FONT } } }}
      >
        <DialogTitle sx={{
          fontWeight: 700, fontSize: '1rem', display: 'flex',
          alignItems: 'center', gap: 1, pb: 0.5, fontFamily: FONT, color: BRAND.navy,
        }}>
          <VideocamRounded sx={{ color: BRAND.navy, fontSize: 20 }} />
          Interview Recording
          {recDlg.duration > 0 && (
            <Chip
              label={`${Math.floor(recDlg.duration / 60)}m ${recDlg.duration % 60}s`}
              size="small"
              sx={{ ml: 1, fontSize: '0.7rem', bgcolor: BRAND.sageSoft, color: BRAND.sageText, fontFamily: FONT }}
            />
          )}
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {recDlg.loading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 280 }}>
              <CircularProgress size={36} sx={{ color: BRAND.navy }} />
            </Box>
          ) : recDlg.url ? (
            <Box sx={{ bgcolor: '#000' }}>
              <video controls autoPlay
                style={{ width: '100%', maxHeight: '62vh', display: 'block' }}
                src={recDlg.url}>
                Your browser does not support video playback.
              </video>
            </Box>
          ) : (
            <Box sx={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              height: 200, gap: 1.5,
            }}>
              <VideocamRounded sx={{ fontSize: 44, color: '#CBD5E1' }} />
              <Typography sx={{ fontSize: '0.85rem', color: BRAND.muted, textAlign: 'center', px: 3, fontFamily: FONT }}>
                {recDlg.error || 'Recording not available.'}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button
            onClick={() => setRecDlg((p) => ({ ...p, open: false }))}
            sx={{
              textTransform: 'none', fontWeight: 600, fontSize: '0.82rem',
              color: BRAND.muted, borderRadius: '10px', fontFamily: FONT,
            }}
          >
            Close
          </Button>
          {recDlg.url && (
            <Button
              variant="contained"
              href={recDlg.url}
              target="_blank"
              component="a"
              startIcon={<OpenInNew sx={{ fontSize: 15 }} />}
              sx={{
                textTransform: 'none', fontWeight: 700, fontSize: '0.82rem',
                bgcolor: BRAND.navy, borderRadius: '10px', boxShadow: 'none', fontFamily: FONT,
                '&:hover': { bgcolor: BRAND.navyDark },
              }}
            >
              Open in new tab
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* BUILD: 2026-08-14-live-candidate-reschedule-v1 */}
      <Dialog open={!!reschedDlg} onClose={() => !reschedBusy && setReschedDlg(null)}
        maxWidth="xs" fullWidth
        slotProps={{ paper: { sx: { borderRadius: '16px', fontFamily: FONT } } }}>
        <DialogTitle sx={{ fontFamily: FONT, fontWeight: 800, fontSize: '1rem' }}>
          🔁 Request a reschedule
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontFamily: FONT, fontSize: '0.84rem',
            color: BRAND.muted, mb: 1.5 }}>
            {reschedDlg?.item?.interview_name || 'This live interview'} — tell
            the employer why you need a new time. Only this round moves; your
            completed rounds are untouched.
          </Typography>
          <TextField
            autoFocus fullWidth multiline minRows={3}
            placeholder="e.g. I had a network / power issue during this slot — could we reschedule?"
            value={reschedDlg?.reason || ''}
            onChange={(e) => setReschedDlg((d) => ({ ...d, reason: e.target.value }))}
            inputProps={{ maxLength: 2000 }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '11px',
              fontFamily: FONT, fontSize: '0.86rem' } }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.25 }}>
          <Button onClick={() => setReschedDlg(null)} disabled={reschedBusy}
            sx={{ textTransform: 'none', fontFamily: FONT, color: BRAND.muted }}>
            Cancel
          </Button>
          <Button variant="contained" disableElevation
            onClick={submitReschedule} disabled={reschedBusy}
            sx={{ textTransform: 'none', fontFamily: FONT, fontWeight: 700,
              borderRadius: '10px', px: 2.2, bgcolor: '#C97B4A',
              '&:hover': { bgcolor: '#A35A2D' } }}>
            {reschedBusy ? 'Sending…' : 'Send request'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Toast (preserved) ────────────────────────────────────────────── */}
      <Snackbar
        open={!!toast}
        autoHideDuration={3500}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        {toast && (
          <Alert
            severity={toast.severity}
            onClose={() => setToast(null)}
            variant="filled"
            sx={{ borderRadius: '10px', fontWeight: 500, fontFamily: FONT }}
          >
            {toast.message}
          </Alert>
        )}
      </Snackbar>

      {/* ═══ BUILD: 2026-08-07-smart-soft-delete-v1 — remove confirmation ═══ */}
      <Dialog
        open={confirmDlg.open}
        onClose={() => !deleteBusy && setConfirmDlg({ open: false, target: null, bulk: false })}
        maxWidth="xs" fullWidth
        slotProps={{ paper: { sx: { borderRadius: '16px', fontFamily: FONT } } }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem', color: BRAND.navy, fontFamily: FONT }}>
          {confirmDlg.bulk
            ? `Remove ${selectedKeys.size} ${selectedKeys.size === 1 ? 'interview' : 'interviews'}?`
            : 'Remove this interview?'}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontFamily: FONT, fontSize: '0.88rem', color: BRAND.muted }}>
            This hides {confirmDlg.bulk ? 'them' : 'it'} from your list. The employer still keeps a record.
            You can’t undo this from here.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button
            onClick={() => setConfirmDlg({ open: false, target: null, bulk: false })}
            disabled={deleteBusy}
            sx={{
              textTransform: 'none', fontWeight: 600, fontSize: '0.82rem',
              color: BRAND.muted, borderRadius: '10px', fontFamily: FONT,
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={deleteBusy}
            onClick={() => confirmDlg.bulk ? doDeleteBulk() : doDeleteOne(confirmDlg.target)}
            startIcon={deleteBusy
              ? <CircularProgress size={14} sx={{ color: '#fff' }} />
              : <DeleteOutlineRounded sx={{ fontSize: 16 }} />}
            sx={{
              textTransform: 'none', fontWeight: 700, fontSize: '0.82rem',
              bgcolor: BRAND.danger, borderRadius: '10px', boxShadow: 'none', fontFamily: FONT,
              '&:hover': { bgcolor: '#8B321F', boxShadow: 'none' },
            }}
          >
            {deleteBusy ? 'Removing…' : 'Remove'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   Top-level component — routes between BookSlotMode and MyInterviewsMode
   based on the :token URL param. Preserved from the original.
═══════════════════════════════════════════════════════════════════════════ */
const LiveInterview = () => {
  // Old token-based BookSlotMode routing removed.
  // IAEM booking is at /jobseeker/smart-interviews/book/:releaseId
  return <MyInterviewsMode />;
};

export default LiveInterview;