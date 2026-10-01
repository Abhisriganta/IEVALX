import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Container, Typography, Card, Button,
  Stack, Tooltip, IconButton, Skeleton, Alert, CircularProgress,
  Checkbox, Dialog, DialogTitle, DialogContent, DialogContentText,
  DialogActions, Pagination, Select, MenuItem, TextField, InputAdornment,
  Paper, ToggleButton, ToggleButtonGroup, Popover, Divider,
} from '@mui/material';
import {
  HelpOutlineOutlined, AccessTimeOutlined, ShieldOutlined,
  RefreshOutlined, ErrorOutlined,
  CheckCircleOutlined,
  CalendarMonthOutlined,
  DeleteOutlined,
  CheckBoxOutlineBlank, CheckBoxOutlined, IndeterminateCheckBoxOutlined,
  Search, ClearRounded, ViewList, ViewModule,
  DateRangeOutlined, TuneOutlined,
} from '@mui/icons-material';

import { useAIAssessments } from '@/hooks/jobseeker/useAIAssessments';
import { aiAssessmentService } from '@/services/api/jobseeker/aiAssessmentService';
import SelectionBar from '@/components/jobseeker/common/SelectionBar';

/* ───────────────────────────────────────────────────────────────────────────
   Brand tokens — same pine/sage system as FindJobs / SavedJobs / Applications
─────────────────────────────────────────────────────────────────────────── */
const FONT = "'Jost','DM Sans',sans-serif";

const BRAND = {
  navy:         '#022124',   // pine
  navyDark:     '#0A3A38',
  sage:         '#7F9E7E',
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
  done:         '#3E6E3E',
  doneSoft:     '#EAF2E9',
  danger:       '#A63D2F',
  dangerSoft:   '#FAEAE8',
};

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50, 'all'];
const DEFAULT_PAGE_SIZE = 10;

const LEVEL_COLOR = {
  Beginner:     BRAND.sageText,
  Intermediate: BRAND.amber,
  Advanced:     BRAND.danger,
};

/* Status pill meta — pine-system palette */
const STATUS_PILL = {
  not_started: { label: 'Active',      color: BRAND.done,   bg: BRAND.doneSoft },
  scheduled:   { label: 'Scheduled',   color: '#3C5A78',    bg: '#EAF0F6' },
  in_progress: { label: 'In Progress', color: '#8A6A1F',    bg: '#FFF6E5' },
  completed:   { label: 'Completed',   color: BRAND.done,   bg: BRAND.doneSoft },
  expired:     { label: 'Expired',     color: BRAND.muted,  bg: '#F0F1EE' },
};

/* Fold (dog-ear) colors per status — the card's status at a glance */
const FOLD_COLOR = {
  not_started: { face: BRAND.sage,    edge: BRAND.sageSoft },
  scheduled:   { face: '#8AA4BC',     edge: '#EAF0F6' },
  in_progress: { face: '#C97B4A',     edge: BRAND.amberSoft },
  completed:   { face: BRAND.done,    edge: BRAND.doneSoft },
  expired:     { face: '#B9BEB4',     edge: '#F0F1EE' },
};

const TYPE_LABEL = {
  mcq:    'MCQ assessment',
  coding: 'Coding assessment',
  mixed:  'Mixed assessment',
};


const CHIP_COLORS = {
  all:         { tint: BRAND.navy,      soft: 'rgba(2,33,36,0.05)',       ink: BRAND.navy,     dot: BRAND.navy   },
  not_started: { tint: BRAND.sage,      soft: BRAND.sageSoft,             ink: BRAND.sageText, dot: BRAND.done   },
  in_progress: { tint: '#C97B4A',       soft: '#FFF6E5',                  ink: '#8A6A1F',      dot: '#C97B4A'    },
  completed:   { tint: BRAND.done,      soft: BRAND.doneSoft,             ink: BRAND.done,     dot: BRAND.done   },
  expired:     { tint: BRAND.muted,     soft: '#F0F1EE',                  ink: BRAND.muted,    dot: '#B9BEB4'    },
};

const VIEW_CHIPS = [
  { value: 'all',         label: 'All' },
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed',   label: 'Completed' },
  { value: 'expired',     label: 'Expired' },
];

function fmtDateTime(isoStr) {
  if (!isoStr) return null;
  try {
    return new Date(isoStr).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  } catch { return null; }
}


function fmtDateOnly(isoStr) {
  if (!isoStr) return null;
  try {
    return new Date(isoStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short',
    });
  } catch { return null; }
}
function fmtTimeOnly(isoStr) {
  if (!isoStr) return null;
  try {
    return new Date(isoStr).toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return null; }
}


const toDateInputValue = (d) => {
  if (!d) return '';
  const yr = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${yr}-${mo}-${da}`;
};
const fromDateInputValue = (str) => {
  if (!str) return null;
  const [yr, mo, da] = str.split('-').map(Number);
  if (!yr || !mo || !da) return null;
  return new Date(yr, mo - 1, da);
};

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const endOfDay   = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };

/* Range presets. Each `get()` returns a fresh { from, to } computed against
   NOW so they always mean "today, right now" rather than a stale cache. */
const rangeToday = () => {
  const now = new Date();
  return { from: startOfDay(now), to: endOfDay(now) };
};
const rangeTomorrow = () => {
  const t = new Date(); t.setDate(t.getDate() + 1);
  return { from: startOfDay(t), to: endOfDay(t) };
};
const rangeThisWeek = () => {
  // Week starts Monday, matches Indian office-hours convention.
  const now = new Date();
  const day = now.getDay();
  const daysFromMon = (day + 6) % 7;
  const mon = new Date(now); mon.setDate(now.getDate() - daysFromMon);
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  return { from: startOfDay(mon), to: endOfDay(sun) };
};
const rangeNext = (days) => {
  const now = new Date();
  const end = new Date(now); end.setDate(now.getDate() + days);
  return { from: startOfDay(now), to: endOfDay(end) };
};

const DATE_PRESETS = [
  { id: 'today',    label: 'Today',        get: rangeToday    },
  { id: 'tomorrow', label: 'Tomorrow',     get: rangeTomorrow },
  { id: 'week',     label: 'This Week',    get: rangeThisWeek },
  { id: 'next7',    label: 'Next 7 Days',  get: () => rangeNext(7) },
  { id: 'next30',   label: 'Next 30 Days', get: () => rangeNext(30) },
];


const assessmentInRange = (a, from, to) => {
  if (!from && !to) return true;
  const hasStart = !!a.scheduledAt;
  const hasEnd   = !!a.expiresAt;
  if (!hasStart && !hasEnd) return false;
  const aStart = hasStart ? new Date(a.scheduledAt).getTime() : -Infinity;
  const aEnd   = hasEnd   ? new Date(a.expiresAt).getTime()   : Infinity;
  const fFrom  = from ? from.getTime() : -Infinity;
  const fTo    = to   ? to.getTime()   : Infinity;
  return aStart <= fTo && aEnd >= fFrom;
};

/* Compact human label for the current filter range, shown on the pill. */
const formatRangeLabel = (from, to) => {
  if (!from && !to) return '';
  const fmt = (d) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  if (from && to) {
    if (from.toDateString() === to.toDateString()) return fmt(from);
    return `${fmt(from)} – ${fmt(to)}`;
  }
  if (from) return `From ${fmt(from)}`;
  return `Until ${fmt(to)}`;
};

/* Due within 48h (and not yet past) → the window line goes amber. */
const isDueSoon = (expiresAt) => {
  if (!expiresAt) return false;
  const ms = new Date(expiresAt).getTime() - Date.now();
  return ms > 0 && ms < 48 * 60 * 60 * 1000;
};


function AssessmentCard({
  a, onStart, isStarting, viewMode = 'grid',
   selectable = false, selected = false, onToggleSelect = () => {},
  onRequestReschedule = null,   
}) {
  const now            = new Date();
  const isBeforeWindow = a.scheduledAt && new Date(a.scheduledAt) > now;
  const isAfterExpiry  = a.expiresAt   && new Date(a.expiresAt)   < now;

  const isScheduled = a.status === 'not_started' && isBeforeWindow;
  const locked      = isScheduled || a.status === 'expired' || a.status === 'completed' || isAfterExpiry;
  const inProg      = a.status === 'in_progress';

  const effectiveStatus =
    isScheduled                                   ? 'scheduled'
    : (isAfterExpiry && a.status !== 'completed') ? 'expired'
    : (a.status === 'expired' && !isAfterExpiry)  ? 'expired'
    : a.status;

  const pill = STATUS_PILL[effectiveStatus] ?? STATUS_PILL.not_started;
  const fold = FOLD_COLOR[effectiveStatus]  ?? FOLD_COLOR.not_started;

  const hasRealSkill = a.skill && a.skill !== '—' && a.skill.trim?.() !== '';
  const subtitle     = hasRealSkill ? a.skill : (TYPE_LABEL[a.type] ?? 'Manual assessment');
  const companyLine  = a.companyName ? `${a.companyName} · ${subtitle}` : subtitle;

  const initials = (a.companyName || a.title || 'AI')
    .split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  const levelColor = LEVEL_COLOR[a.level] ?? BRAND.sageText;


  const urgent = !locked && isDueSoon(a.expiresAt);
  const windowRange = (() => {
    if (isScheduled) {
      return { kind: 'opens', text: `Opens ${fmtDateTime(a.scheduledAt) ?? '—'}` };
    }
    if (effectiveStatus === 'expired') {
      return {
        kind: 'expired',
        text: a.expiresAt ? `Closed ${fmtDateTime(a.expiresAt)}` : 'Window closed',
      };
    }
    if (effectiveStatus === 'completed') {
      return { kind: 'completed', text: 'Submitted — awaiting nothing more' };
    }
    // Active state — the interesting case. Prefer showing both dates.
    if (a.scheduledAt && a.expiresAt) {
      const s = new Date(a.scheduledAt);
      const e = new Date(a.expiresAt);
      const sameDay = s.toDateString() === e.toDateString();
      return {
        kind: 'active',
        sameDay,
        startIso: a.scheduledAt,
        endIso:   a.expiresAt,
        // Single-line fallback for the list view.
        text: sameDay
          ? `${fmtDateOnly(a.scheduledAt)} · ${fmtTimeOnly(a.scheduledAt)} → ${fmtTimeOnly(a.expiresAt)}`
          : `${fmtDateTime(a.scheduledAt)} → ${fmtDateTime(a.expiresAt)}`,
      };
    }
    if (a.expiresAt) {
      return { kind: 'due-only', text: `Due ${fmtDateTime(a.expiresAt)}` };
    }
    if (a.scheduledAt) {
      return { kind: 'from-only', text: `From ${fmtDateTime(a.scheduledAt)}` };
    }
    return null;
  })();
  const windowText = windowRange?.text ?? null;

  const btnLabel =
    isScheduled                          ? `Opens ${fmtDateTime(a.scheduledAt) ?? '—'}`
    : effectiveStatus === 'expired'      ? 'Expired'
    : a.status === 'completed'           ? 'Completed'
    : inProg                             ? 'Resume'
    : 'Start Assessment';

 
  const hasAction = !locked || isScheduled;


  const reschedPending =
    a.siStatus === 'reschedule_requested' || !!a.rescheduleRequestedAt;

  const canAskReschedule =
    !!onRequestReschedule &&
    !!a.scheduledInterviewId &&
    !reschedPending &&
    (isAfterExpiry || a.status === 'expired') &&
    effectiveStatus !== 'completed' &&
    a.status !== 'in_progress';

  const rescheduleBtn = canAskReschedule ? (
    <Button
      onClick={(e) => { e.stopPropagation(); onRequestReschedule(a); }}
      disableElevation
      sx={{
        textTransform: 'none', fontSize: '0.75rem', fontWeight: 700,
        borderRadius: '999px', px: 1.5, height: 34, minWidth: 0,
        lineHeight: 1, flexShrink: 0, whiteSpace: 'nowrap',
        color: '#8A6A1F', bgcolor: '#FFF6E5',
        border: '1px solid rgba(201,123,74,0.35)',
        fontFamily: FONT,
        '&:hover': { bgcolor: '#FBEED3', borderColor: '#C97B4A' },
      }}>
      🔁 Reschedule
    </Button>
  ) : reschedPending && (isAfterExpiry || a.status === 'expired') ? (
    <Box sx={{
      display: 'inline-flex', alignItems: 'center', height: 34,
      px: 1.3, borderRadius: '999px', flexShrink: 0, whiteSpace: 'nowrap',
      bgcolor: '#FFF6E5', color: '#8A6A1F',
      border: '1px dashed rgba(201,123,74,0.45)',
      fontSize: '0.72rem', fontWeight: 700, fontFamily: FONT,
    }}>
      🔁 Requested
    </Box>
  ) : null;

  const handleClick = () => {
    if (locked || isAfterExpiry || isStarting) return;
    onStart(a.assignmentId ?? a.id, a.status, a);
  };

  const handleCardClick = () => {
    if (selectable) onToggleSelect(a);
  };

  /* ── LIST VIEW — ledger row: status-colored accent · identity · meta ·
        window · status · action. Stacks below md. ─────────────────────── */
  if (viewMode === 'list') {
    const actionBtn = (
      <Button
        disabled={locked || isAfterExpiry || isStarting || selectable}
        onClick={(e) => { e.stopPropagation(); handleClick(); }}
        disableElevation
        sx={{
          textTransform: 'none', fontSize: '0.76rem', fontWeight: 700,
          borderRadius: '999px', px: 1.6, height: 32, minWidth: 0,
          lineHeight: 1, flexShrink: 0, whiteSpace: 'nowrap',
          maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis',
          ...(inProg && !locked
            ? { bgcolor: BRAND.sage, color: '#fff', '&:hover': { bgcolor: '#6C8B6B' } }
            : !locked
            ? {
                bgcolor: BRAND.navy, color: '#fff',
                boxShadow: '0 2px 8px rgba(2,33,36,0.22)',
                '&:hover': { bgcolor: BRAND.sage, boxShadow: '0 4px 12px rgba(127,158,126,0.4)' },
              }
            : a.status === 'completed'
            ? { bgcolor: BRAND.doneSoft, color: BRAND.done, border: '1px solid rgba(127,158,126,0.45)' }
            : isScheduled
            ? { bgcolor: '#EAF0F6', color: '#3C5A78' }
            : { bgcolor: '#F0F1EE', color: BRAND.muted }),
          '&.Mui-disabled': {
            ...(a.status === 'completed'
              ? { bgcolor: BRAND.doneSoft, color: BRAND.done }
              : isScheduled
              ? { bgcolor: '#EAF0F6', color: '#3C5A78' }
              : { bgcolor: '#F0F1EE', color: BRAND.muted }),
          },
        }}
      >
        {isStarting ? <CircularProgress size={15} sx={{ color: '#fff' }} /> : btnLabel}
      </Button>
    );

    const statusEl = (
      <Box sx={{
        display: 'inline-flex', alignItems: 'center', flexShrink: 0,
        bgcolor: pill.bg, color: pill.color,
        px: 1, py: 0.4, borderRadius: '7px',
        fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.05em',
        textTransform: 'uppercase', whiteSpace: 'nowrap', lineHeight: 1.6,
        fontFamily: FONT,
      }}>
        {pill.label}
      </Box>
    );

    const identity = (
      <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'center', minWidth: 0 }}>
        {selectable && (
          <Checkbox
            checked={selected}
            onChange={() => onToggleSelect(a)}
            onClick={(e) => e.stopPropagation()}
            inputProps={{ 'aria-label': `Select ${a.title ?? 'assessment'}` }}
            size="small"
            sx={{
              p: 0.5, flexShrink: 0,
              color: BRAND.borderStrong,
              '&.Mui-checked': { color: BRAND.sage },
            }}
          />
        )}
        <Box sx={{
          position: 'relative', width: 36, height: 36, borderRadius: '50%',
          flexShrink: 0, overflow: 'hidden',
          bgcolor: BRAND.navy, color: BRAND.sage,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: '0.78rem', fontFamily: FONT,
        }}>
          {initials}
          {a.companyLogoUrl && (
            <Box component="img" src={a.companyLogoUrl} alt={a.companyName || a.title}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
              sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', bgcolor: '#fff', display: 'block' }}
            />
          )}
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography noWrap title={a.title} sx={{ fontSize: '0.92rem', fontWeight: 800, color: BRAND.ink, lineHeight: 1.25, letterSpacing: '-0.01em' }}>
            {a.title}
          </Typography>
          <Typography noWrap sx={{ fontSize: '0.72rem', color: BRAND.muted, fontWeight: 500, mt: 0.2 }}>
            {companyLine}
          </Typography>
        </Box>
      </Box>
    );

    return (
      <Card
        elevation={0}
        onClick={handleCardClick}
        sx={{
          fontFamily: FONT,
          '& .MuiTypography-root, & .MuiButton-root': { fontFamily: FONT },
          borderRadius: '14px', bgcolor: BRAND.surface,
          border: `1px solid ${selected ? BRAND.sage : BRAND.border}`,
          borderLeft: `4px solid ${fold.face}`,
          cursor: selectable ? 'pointer' : 'default',
          transition: 'all 0.2s ease',
          '&:hover': { borderColor: BRAND.sage, borderLeftColor: fold.face, boxShadow: '0 6px 20px rgba(2,33,36,0.08)' },
        }}
      >
        {/* Desktop ledger row (md+) */}
        <Box sx={{
          display: { xs: 'none', md: 'grid' },
          gridTemplateColumns: '2.2fr 1.1fr 1.5fr 0.9fr 175px',
          alignItems: 'center',
          px: 2.25, py: 1.6, gap: 2,
        }}>
          {identity}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0, flexWrap: 'wrap', rowGap: 0.4 }}>
            <Tooltip title={`${a.questionCount} question${a.questionCount === 1 ? '' : 's'}`} arrow>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, flexShrink: 0, cursor: 'help' }}>
                <HelpOutlineOutlined sx={{ fontSize: 14, color: BRAND.faint }} />
                <Typography sx={{ fontSize: '0.76rem', color: BRAND.muted, fontWeight: 500, whiteSpace: 'nowrap' }}>{a.questionCount} Qs</Typography>
              </Box>
            </Tooltip>
            <Tooltip title={`Duration · ${a.durationMinutes} minute${a.durationMinutes === 1 ? '' : 's'}`} arrow>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, flexShrink: 0, cursor: 'help' }}>
                <AccessTimeOutlined sx={{ fontSize: 14, color: BRAND.faint }} />
                <Typography sx={{ fontSize: '0.76rem', color: BRAND.muted, fontWeight: 500, whiteSpace: 'nowrap' }}>{a.durationMinutes} min</Typography>
              </Box>
            </Tooltip>
            {a.level && (
              <Tooltip title={`Difficulty · ${a.level}`} arrow>
                <Typography sx={{
                  fontSize: '0.72rem', fontWeight: 700, color: levelColor,
                  whiteSpace: 'nowrap', flexShrink: 0, cursor: 'help',
                }}>{a.level}</Typography>
              </Tooltip>
            )}
          </Box>

          <Tooltip
            arrow
            title={
              windowRange?.kind === 'active' && a.scheduledAt && a.expiresAt
                ? `Starts ${fmtDateTime(a.scheduledAt)} · Due ${fmtDateTime(a.expiresAt)}`
                : windowRange?.kind === 'opens'      ? 'Scheduled to open — not yet available'
                : windowRange?.kind === 'expired'     ? 'Window has closed'
                : windowRange?.kind === 'completed'   ? 'You submitted this — nothing more to do'
                : windowRange?.kind === 'due-only'    ? `Due date · ${fmtDateTime(a.expiresAt)}`
                : windowRange?.kind === 'from-only'   ? `Available from · ${fmtDateTime(a.scheduledAt)}`
                : ''
            }
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, minWidth: 0, cursor: 'help' }}>
              <CalendarMonthOutlined sx={{ fontSize: 15, color: urgent ? BRAND.amber : BRAND.faint, flexShrink: 0 }} />
              <Typography noWrap sx={{ fontSize: '0.76rem', fontWeight: 600, color: urgent ? BRAND.amber : BRAND.muted }}>
                {windowText ?? '—'}
              </Typography>
            </Box>
          </Tooltip>

          <Box>{statusEl}</Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
            gap: 0.75, flexWrap: 'wrap', rowGap: 0.75 }}>
            {rescheduleBtn}
            {hasAction ? actionBtn : null}
          </Box>
        </Box>

        {/* Mobile stacked (xs–sm) */}
        <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', p: 1.75, gap: 1.1 }}>
          {identity}
          {windowText && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, minWidth: 0 }}>
              <CalendarMonthOutlined sx={{ fontSize: 14, color: urgent ? BRAND.amber : BRAND.faint, flexShrink: 0 }} />
              <Typography noWrap sx={{ fontSize: '0.73rem', fontWeight: 600, color: urgent ? BRAND.amber : BRAND.muted }}>
                {windowText}
              </Typography>
            </Box>
          )}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
            {statusEl}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75,
              flexWrap: 'wrap', rowGap: 0.75, justifyContent: 'flex-end' }}>
              {rescheduleBtn}
              {hasAction && actionBtn}
            </Box>
          </Box>
        </Box>
      </Card>
    );
  }

  return (
    <Card
      elevation={0}
      onClick={handleCardClick}
      sx={{
        position: 'relative', height: '100%',
        display: 'flex', flexDirection: 'column',
        borderRadius: '16px', bgcolor: BRAND.surface, overflow: 'hidden',
        border: `1px solid ${selected ? BRAND.sage : BRAND.border}`,
        fontFamily: FONT,
        '& .MuiTypography-root, & .MuiButton-root': { fontFamily: FONT },
        boxShadow: selected
          ? `0 0 0 2px ${BRAND.sageSoft}, 0 10px 26px rgba(2,33,36,0.08)`
          : '0 10px 26px rgba(2,33,36,0.06)',
        cursor: selectable ? 'pointer' : 'default',
        transition: 'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 22px 48px -18px rgba(2,33,36,0.16)',
          borderColor: BRAND.sage,
        },
        '&:hover .dogear': { borderTopWidth: '44px', borderLeftWidth: '44px' },
      }}
    >
      {/* Dog-ear fold — status color at a glance */}
      <Box sx={{ position: 'absolute', top: 0, right: 0, zIndex: 1, pointerEvents: 'none' }}>
        <Box className="dogear" sx={{
          width: 0, height: 0,
          borderLeft: `38px solid ${fold.edge}`,
          borderTop: `38px solid ${fold.face}`,
          borderRadius: '0 16px 0 0',
          transition: 'border-width .25s ease',
        }} />
        <Box sx={{
          position: 'absolute', top: 0, right: 0, width: 38, height: 38,
          background: 'linear-gradient(225deg, transparent 50%, rgba(2,33,36,0.16) 50%, transparent 64%)',
        }} />
      </Box>

      {/* Selection checkbox — completed / expired views only */}
      {selectable && (
        <Checkbox
          checked={selected}
          onChange={() => onToggleSelect(a)}
          onClick={(e) => e.stopPropagation()}
          inputProps={{ 'aria-label': `Select ${a.title ?? 'assessment'}` }}
          size="small"
          sx={{
            position: 'absolute', top: 6, left: 6, zIndex: 2, p: 0.5,
            color: BRAND.borderStrong,
            '&.Mui-checked': { color: BRAND.sage },
            bgcolor: 'rgba(255,255,255,0.85)', borderRadius: '8px',
            '&:hover': { bgcolor: BRAND.sageSoft },
          }}
        />
      )}

      <Box sx={{ p: '17px 18px 18px', display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>

        {/* Header: circular logo/initials + title + company·skill */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.4, pr: 3.5, pl: selectable ? 3.5 : 0, minWidth: 0 }}>
          <Tooltip title={a.companyName || a.title || 'Assessment'} arrow>
            <Box sx={{
              position: 'relative', width: 42, height: 42, borderRadius: '50%',
              flexShrink: 0, overflow: 'hidden',
              bgcolor: BRAND.navy, color: BRAND.sage,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: '0.85rem', fontFamily: FONT,
              cursor: 'help',
            }}>
              {initials}
              {a.companyLogoUrl && (
                <Box
                  component="img"
                  src={a.companyLogoUrl}
                  alt={a.companyName || a.title}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  sx={{
                    position: 'absolute', inset: 0, width: '100%', height: '100%',
                    objectFit: 'cover', bgcolor: '#fff', display: 'block',
                  }}
                />
              )}
            </Box>
          </Tooltip>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Tooltip title={a.title} arrow placement="top-start">
              <Typography sx={{
                fontSize: '0.98rem', fontWeight: 800, color: BRAND.ink, lineHeight: 1.25,
                letterSpacing: '-0.015em',
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                overflow: 'hidden', minHeight: '2.5em',
                cursor: 'default',
              }}>
                {a.title}
              </Typography>
            </Tooltip>
          </Box>
        </Box>

       
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.6, mt: 1.6, flexWrap: 'wrap', rowGap: 0.6 }}>
          <Tooltip title={`${a.questionCount} question${a.questionCount === 1 ? '' : 's'}`} arrow>
            <Box sx={{
              display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0,
              cursor: 'help',
            }}>
              <HelpOutlineOutlined sx={{ fontSize: 15, color: BRAND.faint }} />
              <Typography sx={{ fontSize: '0.76rem', color: BRAND.muted, fontWeight: 500, whiteSpace: 'nowrap' }}>
                {a.questionCount} Qs
              </Typography>
            </Box>
          </Tooltip>
          <Tooltip title={`Duration · ${a.durationMinutes} minute${a.durationMinutes === 1 ? '' : 's'}`} arrow>
            <Box sx={{
              display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0,
              cursor: 'help',
            }}>
              <AccessTimeOutlined sx={{ fontSize: 15, color: BRAND.faint }} />
              <Typography sx={{ fontSize: '0.76rem', color: BRAND.muted, fontWeight: 500, whiteSpace: 'nowrap' }}>
                {a.durationMinutes} min
              </Typography>
            </Box>
          </Tooltip>
          {a.level && (
            <Tooltip title={`Difficulty · ${a.level}`} arrow>
              <Typography sx={{
                fontSize: '0.74rem', fontWeight: 700, color: levelColor,
                whiteSpace: 'nowrap', flexShrink: 0, cursor: 'help',
              }}>
                {a.level}
              </Typography>
            </Tooltip>
          )}
          {a.aiProctored && (
            <Tooltip title="AI proctored" arrow>
              <Box sx={{
                display: 'inline-flex', alignItems: 'center', gap: 0.4, flexShrink: 0,
                bgcolor: BRAND.sageSoft, color: BRAND.sageText,
                px: 0.8, py: 0.25, borderRadius: '6px',
                fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}>
                <ShieldOutlined sx={{ fontSize: 12 }} />
                Proctored
              </Box>
            </Tooltip>
          )}
        </Box>

  
        {windowRange && (
          <Box sx={{
            display: 'flex', alignItems: windowRange.kind === 'active' && !windowRange.sameDay ? 'flex-start' : 'center',
            gap: 0.75,
            mt: 1.5, px: 1.25, py: 0.8, borderRadius: '9px',
            bgcolor: urgent ? BRAND.amberSoft : BRAND.bg,
            border: `1px dashed ${urgent ? '#E5C4A8' : BRAND.borderStrong}`,
          }}>
            <CalendarMonthOutlined sx={{
              fontSize: 15,
              color: urgent ? BRAND.amber : BRAND.faint,
              flexShrink: 0,
              mt: windowRange.kind === 'active' && !windowRange.sameDay ? 0.2 : 0,
            }} />

            {windowRange.kind === 'active' && !windowRange.sameDay ? (
            
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Tooltip title={`Start date · ${fmtDateTime(windowRange.startIso)}`} arrow placement="top-start">
                  <Box sx={{
                    display: 'flex', alignItems: 'baseline', gap: 0.5, minWidth: 0,
                    cursor: 'help',
                  }}>
                    <Typography sx={{
                      fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.05em',
                      color: BRAND.faint, textTransform: 'uppercase',
                      width: 44, flexShrink: 0,
                    }}>
                      Starts
                    </Typography>
                    <Typography noWrap sx={{
                      fontSize: '0.73rem', fontWeight: 600, color: BRAND.muted,
                    }}>
                      {fmtDateTime(windowRange.startIso)}
                    </Typography>
                  </Box>
                </Tooltip>
                <Tooltip title={`Due date · ${fmtDateTime(windowRange.endIso)}`} arrow placement="bottom-start">
                  <Box sx={{
                    display: 'flex', alignItems: 'baseline', gap: 0.5, minWidth: 0, mt: 0.15,
                    cursor: 'help',
                  }}>
                    <Typography sx={{
                      fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.05em',
                      color: urgent ? BRAND.amber : BRAND.faint, textTransform: 'uppercase',
                      width: 44, flexShrink: 0,
                    }}>
                      Due
                    </Typography>
                    <Typography noWrap sx={{
                      fontSize: '0.73rem', fontWeight: 700,
                      color: urgent ? BRAND.amber : BRAND.muted,
                    }}>
                      {fmtDateTime(windowRange.endIso)}
                    </Typography>
                  </Box>
                </Tooltip>
              </Box>
            ) : windowRange.kind === 'active' && windowRange.sameDay ? (
            
              <Box sx={{ minWidth: 0, flex: 1, display: 'flex', alignItems: 'baseline', gap: 0.65, flexWrap: 'wrap' }}>
                <Tooltip title={`Window date · ${fmtDateOnly(windowRange.startIso)}`} arrow>
                  <Typography noWrap sx={{
                    fontSize: '0.73rem', fontWeight: 700, color: urgent ? BRAND.amber : BRAND.muted,
                    cursor: 'help',
                  }}>
                    {fmtDateOnly(windowRange.startIso)}
                  </Typography>
                </Tooltip>
                <Typography sx={{
                  fontSize: '0.7rem', fontWeight: 600, color: BRAND.faint,
                }}>
                  ·
                </Typography>
                <Tooltip title={`Start date · ${fmtDateTime(windowRange.startIso)}`} arrow>
                  <Typography noWrap sx={{
                    fontSize: '0.73rem', fontWeight: 600, color: BRAND.muted,
                    cursor: 'help',
                    borderBottom: `1px dotted ${BRAND.borderStrong}`,
                    transition: 'color 140ms ease, border-color 140ms ease',
                    '&:hover': { color: BRAND.ink, borderBottomColor: BRAND.faint },
                  }}>
                    {fmtTimeOnly(windowRange.startIso)}
                  </Typography>
                </Tooltip>
                <Typography sx={{
                  fontSize: '0.75rem', fontWeight: 700, color: urgent ? BRAND.amber : BRAND.faint,
                }}>
                  →
                </Typography>
                <Tooltip title={`Due date · ${fmtDateTime(windowRange.endIso)}`} arrow>
                  <Typography noWrap sx={{
                    fontSize: '0.73rem', fontWeight: 700, color: urgent ? BRAND.amber : BRAND.muted,
                    cursor: 'help',
                    borderBottom: `1px dotted ${urgent ? '#E5C4A8' : BRAND.borderStrong}`,
                    transition: 'color 140ms ease, border-color 140ms ease',
                    '&:hover': {
                      color: urgent ? BRAND.amber : BRAND.ink,
                      borderBottomColor: urgent ? BRAND.amber : BRAND.faint,
                    },
                  }}>
                    {fmtTimeOnly(windowRange.endIso)}
                  </Typography>
                </Tooltip>
              </Box>
            ) : (
              
              <Tooltip
                arrow
                title={
                  windowRange.kind === 'opens'      ? 'Scheduled to open — not yet available'
                  : windowRange.kind === 'expired'   ? 'Window has closed'
                  : windowRange.kind === 'completed' ? 'You submitted this — nothing more to do'
                  : windowRange.kind === 'due-only'  ? 'Due date'
                  : windowRange.kind === 'from-only' ? 'Available from'
                  : ''
                }
              >
                <Typography noWrap sx={{
                  fontSize: '0.73rem', fontWeight: 600,
                  color: urgent ? BRAND.amber : BRAND.muted,
                  minWidth: 0, flex: 1,
                  cursor: 'help',
                }}>
                  {windowRange.text}
                </Typography>
              </Tooltip>
            )}
          </Box>
        )}

     
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mt: 'auto', pt: 1.75 }}>
          <Tooltip
            arrow
            title={
              effectiveStatus === 'scheduled'   ? 'Scheduled — opens at the start time'
              : effectiveStatus === 'not_started' ? 'Available now — ready to start'
              : effectiveStatus === 'in_progress' ? 'You have an ongoing attempt'
              : effectiveStatus === 'completed'   ? 'Successfully submitted'
              : effectiveStatus === 'expired'     ? 'Window closed — no longer accepting submissions'
              : 'Status'
            }
          >
            <Box sx={{
              display: 'inline-flex', alignItems: 'center', gap: 0.5, flexShrink: 0,
              bgcolor: pill.bg, color: pill.color,
              px: 1, py: 0.4, borderRadius: '7px',
              fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.05em',
              textTransform: 'uppercase', whiteSpace: 'nowrap', lineHeight: 1.6,
              fontFamily: FONT, cursor: 'help',
            }}>
              {pill.label}
            </Box>
          </Tooltip>

           {/* BUILD: 2026-08-05-assessment-reschedule-v1 */}
          {rescheduleBtn}

          {hasAction && (
          <Button
            disabled={locked || isAfterExpiry || isStarting || selectable}
            onClick={(e) => { e.stopPropagation(); handleClick(); }}
            disableElevation
            sx={{
              textTransform: 'none', fontSize: '0.78rem', fontWeight: 700,
              borderRadius: '999px', px: 1.9, height: 34, minWidth: 0,
              lineHeight: 1, flexShrink: 0, whiteSpace: 'nowrap',
              maxWidth: '68%', overflow: 'hidden', textOverflow: 'ellipsis',
              ...(inProg && !locked
                ? { bgcolor: BRAND.sage, color: '#fff', '&:hover': { bgcolor: BRAND.sageDarker ?? '#6C8B6B' } }
                : !locked
                ? {
                    bgcolor: BRAND.navy, color: '#fff',
                    boxShadow: '0 2px 8px rgba(2,33,36,0.22)',
                    '&:hover': { bgcolor: BRAND.sage, boxShadow: '0 4px 12px rgba(127,158,126,0.4)' },
                  }
                : a.status === 'completed'
                ? { bgcolor: BRAND.doneSoft, color: BRAND.done, border: '1px solid rgba(127,158,126,0.45)' }
                : isScheduled
                ? { bgcolor: '#EAF0F6', color: '#3C5A78' }
                : { bgcolor: '#F0F1EE', color: BRAND.muted }),
              '&.Mui-disabled': {
                ...(a.status === 'completed'
                  ? { bgcolor: BRAND.doneSoft, color: BRAND.done }
                  : isScheduled
                  ? { bgcolor: '#EAF0F6', color: '#3C5A78' }
                  : { bgcolor: '#F0F1EE', color: BRAND.muted }),
              },
            }}
          >
            {isStarting
              ? <CircularProgress size={16} sx={{ color: '#fff' }} />
              : a.status === 'completed' && !selectable
              ? (
                <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                  <CheckCircleOutlined sx={{ fontSize: 15 }} /> {btnLabel}
                </Box>
              )
              : btnLabel}
          </Button>
          )}
        </Box>
      </Box>
    </Card>
  );
}

/* ───────────────────────────────────────────────────────────────────────────
   Page
─────────────────────────────────────────────────────────────────────────── */
export default function AIAssessments() {
  const {
    assessments, loading, error,
    startingId, startAssessment, refetch,
    deleteAssessment,
  } = useAIAssessments();

  const navigate = useNavigate();

  const [view,        setView]        = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [startError,  setStartError]  = useState(null);

  const [dateRange, setDateRange] = useState({ from: null, to: null });
  const [activePreset, setActivePreset] = useState(null);
  const [dateAnchor, setDateAnchor] = useState(null);

  const [removedIds,   setRemovedIds]   = useState(() => new Set());
  // Selection is always available on completed/expired cards via checkboxes.
  const [selectedIds,  setSelectedIds]  = useState(() => new Set());
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);

  const [reschedDlg,  setReschedDlg]  = useState(null);
  const [reschedBusy, setReschedBusy] = useState(false);
  const [reschedMsg,  setReschedMsg]  = useState(null);

  const [viewMode, setViewMode] = useState('grid');
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const getId = (a) => a.assignmentId ?? a.id;

  /* ── Classification (single source of truth for chips + filtering) ────── */
  const isExpiredFn = (a) =>
    a.status === 'expired' ||
    (a.expiresAt && new Date(a.expiresAt) < new Date() && a.status !== 'completed');

  const effState = (a) => {
    if (isExpiredFn(a))             return 'expired';
    if (a.status === 'completed')   return 'completed';
    if (a.status === 'in_progress') return 'in_progress';
    return 'not_started'; // includes scheduled — still "yours to do"
  };

  /* Live set: not deleted, matching the search, and inside the date range */
  const live = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const { from, to } = dateRange;
    return assessments
      .filter((a) => !removedIds.has(getId(a)))
      .filter((a) => {
        if (!q) return true;
        const hay = [
          a.title, a.skill, a.companyName, a.description,
          ...(a.tags ?? []),
        ].filter(Boolean).join(' ').toLowerCase();
        return hay.includes(q);
      })
      .filter((a) => assessmentInRange(a, from, to));
  }, [assessments, removedIds, searchQuery, dateRange]);

  const chipCounts = useMemo(() => {
    const c = { all: live.length, not_started: 0, in_progress: 0, completed: 0, expired: 0 };
    live.forEach((a) => { c[effState(a)] += 1; });
    return c;
  }, [live]);

  const visible = useMemo(
    () => (view === 'all' ? live : live.filter((a) => effState(a) === view)),
    [live, view],
  );

  /* ── Pagination ('all' shows everything on one page) ───────────────────── */
  const effectiveSize = pageSize === 'all' ? Math.max(visible.length, 1) : pageSize;
  const totalPages = Math.max(1, Math.ceil(visible.length / effectiveSize));
  useEffect(() => { setPage(1); }, [view, visible.length, pageSize]);
  useEffect(() => { if (page > totalPages) setPage(1); }, [page, totalPages]);
  const pagedVisible = useMemo(() => {
    const start = (page - 1) * effectiveSize;
    return visible.slice(start, start + effectiveSize);
  }, [visible, page, effectiveSize]);
  const handlePageChange = (_e, value) => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* ── Selection / delete (completed & expired views) ────────────────────── */
  const isCompletedView = view === 'completed';
  const isExpiredView   = view === 'expired';
  const canManage       = isCompletedView || isExpiredView;

  const completedVisibleIds = useMemo(
    () => (canManage ? visible.map(getId) : []),
    [canManage, visible],
  );

  const allSelected =
    completedVisibleIds.length > 0 &&
    completedVisibleIds.every((id) => selectedIds.has(id));
  const someSelected =
    completedVisibleIds.some((id) => selectedIds.has(id)) && !allSelected;

  const handleViewChange = (v) => {
    setView(v);
    setSelectedIds(new Set());
  };

  const clearSelection = () => setSelectedIds(new Set());

  const toggleSelect = (a) => {
    const id = getId(a);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(completedVisibleIds));
  };

  const requestBulkDelete = () => {
    const items = visible.filter((a) => selectedIds.has(getId(a)));
    if (items.length === 0) return;
    setDeleteTarget({ type: 'bulk', items });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const ids = deleteTarget.items.map(getId);
      await deleteAssessment(ids);
      setRemovedIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.add(id));
        return next;
      });
      setSelectedIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      setDeleteTarget(null);
      if (deleteTarget.type === 'bulk') clearSelection();
    } catch (err) {
      setStartError(err?.message ?? 'Failed to delete assessment.');
    } finally {
      setDeleting(false);
    }
  };
  const submitReschedule = async () => {
    const card = reschedDlg?.a;
    if (!card?.scheduledInterviewId || reschedBusy) return;
    const reason = (reschedDlg?.reason || '').trim();
    if (!reason) {
      setReschedDlg((d) => ({ ...d, showError: true }));
      return;
    }

    setReschedBusy(true);
    try {
      await aiAssessmentService.requestReschedule(
        card.scheduledInterviewId, reason,
      );
      setReschedDlg(null);
      setReschedMsg({
        severity: 'success',
        text: 'Your reschedule request has been sent to the recruiter. If approved, you\'ll receive an email with a new window. No further requests can be sent for this assessment.',
      });
      refetch();
    } catch (err) {
      setReschedMsg({
        severity: 'error',
        text: err?.response?.data?.detail
          || 'Could not request a reschedule for this assessment.',
      });
    } finally {
      setReschedBusy(false);
    }
  };


  /* ── Start / resume (behaviour unchanged: fullscreen + navState) ───────── */
  const handleStart = async (assignmentId, status, assessment) => {
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch {
      /* denied / unsupported */
    }

    setStartError(null);
    const navState = {
      title:           assessment?.title           ?? 'Assessment',
      durationMinutes: assessment?.durationMinutes ?? 30,
      aiProctored:     assessment?.aiProctored     ?? false,
      questionTypes:   assessment?.type            ?? '',
    };

    if (status === 'in_progress') {
      navigate(`/jobseeker/ai-assessments/${assignmentId}/test`, { state: navState });
      return;
    }
    try {
      await startAssessment(assignmentId);
      navigate(`/jobseeker/ai-assessments/${assignmentId}/test`, { state: navState });
    } catch (err) {
      setStartError(err.message ?? 'Failed to start assessment.');
    }
  };

  const hasCompletedVisible = completedVisibleIds.length > 0;
  const selectedCount       = selectedIds.size;

  return (
    <Box className="page-fade-in" sx={{
      p: { xs: 1.5, sm: 2, md: 3, lg: 4 },
      maxWidth: 1440, mx: 'auto', bgcolor: BRAND.bg, minHeight: '100vh',
      fontFamily: FONT,
      '& .MuiTypography-root, & .MuiButton-root, & .MuiChip-root, & .MuiInputBase-root, & .MuiMenuItem-root, & .MuiPaginationItem-root': {
        fontFamily: FONT,
      },
    }}>

      {/* ── Clean Board · light command header — same as the job pages ──── */}
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
        {/* Row 1 — title with subline underneath + refresh */}
        <Stack
          direction="row"
         
         
          sx={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5, mb: { xs: 2, md: 2.25 } }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography component="h1" sx={{
              fontWeight: 700, color: BRAND.ink,
              letterSpacing: '-0.02em', lineHeight: 1.15,
              fontSize: { xs: '1.3rem', sm: '1.45rem', md: '1.6rem' },
            }}>
              AI Assessments
            </Typography>
            <Typography sx={{ color: BRAND.muted, fontSize: { xs: '0.82rem', sm: '0.9rem' }, fontWeight: 500, mt: 0.5 }}>
              <Box component="span" sx={{ color: BRAND.sageText, fontWeight: 700 }}>
                {loading ? '—' : `${live.length} ${live.length === 1 ? 'assessment' : 'assessments'}`}
              </Box>
              {' '}assigned to you
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 0.5 }}>
            <Tooltip title="Refresh" arrow>
              <span>
                <IconButton
                  onClick={refetch}
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
            placeholder="Search by assessment, skill, or company"
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

    '& input::placeholder': {
      color: BRAND.muted,
      opacity: 0.85,
    },

    '& fieldset': {
      borderColor: '#B0BEC5',
      borderWidth: '1.5px',
    },

    '&:hover fieldset': {
      borderColor: '#78909C',
      borderWidth: '2px',
    },

    '&.Mui-focused': {
      boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
    },

    '&.Mui-focused fieldset': {
      borderColor: BRAND.sage,
      borderWidth: '2px',
    },
  },
}}
          />

        
          {(() => {
            const hasRange = !!(dateRange.from || dateRange.to);
            const label = hasRange
              ? formatRangeLabel(dateRange.from, dateRange.to)
              : 'Date range';
            return (
              <Button
                onClick={(e) => setDateAnchor(e.currentTarget)}
                disableElevation
                startIcon={<DateRangeOutlined sx={{ fontSize: 18 }} />}
                endIcon={hasRange ? (
                  <IconButton
                    component="span"
                    size="small"
                    aria-label="Clear date range"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDateRange({ from: null, to: null });
                      setActivePreset(null);
                    }}
                    sx={{
                      p: 0.25, color: BRAND.sageText,
                      '&:hover': { bgcolor: 'rgba(94,129,93,0.14)' },
                    }}
                  >
                    <ClearRounded sx={{ fontSize: 15 }} />
                  </IconButton>
                ) : null}
                sx={{
                  textTransform: 'none',
                  fontFamily: FONT,
                  fontSize: { xs: '0.85rem', sm: '0.9rem' },
                  fontWeight: 700,
                  height: { xs: 46, md: 48 },
                  px: 2, borderRadius: '25px',
                  flexShrink: 0,
                  border: '1.5px solid',
                  borderColor: hasRange ? BRAND.sage : '#B0BEC5',
                  bgcolor: hasRange ? BRAND.sageSoft : BRAND.bg,
                  color: hasRange ? BRAND.sageText : BRAND.ink,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  whiteSpace: 'nowrap',
                  maxWidth: { xs: '100%', sm: 260 },
                  '&:hover': {
                    bgcolor: hasRange ? BRAND.sageSoft : BRAND.surface,
                    borderColor: hasRange ? BRAND.sage : '#78909C',
                    borderWidth: '2px',
                    boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
                  },
                  '& .MuiButton-endIcon': { ml: hasRange ? 0.5 : 0 },
                }}
              >
                <Box component="span" sx={{
                  overflow: 'hidden', textOverflow: 'ellipsis',
                  maxWidth: { xs: 140, sm: 200 },
                }}>
                  {label}
                </Box>
              </Button>
            );
          })()}
        </Stack>

        {/* Row 3 — status chips (left) + view toggle (right) */}
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
            const c = CHIP_COLORS[opt.value] ?? CHIP_COLORS.all;
            const isAll = opt.value === 'all';
            return (
              <Box
                key={opt.value}
                onClick={() => handleViewChange(opt.value)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleViewChange(opt.value)}
                sx={{
                  cursor: 'pointer', userSelect: 'none',
                  display: 'inline-flex', alignItems: 'center', gap: 0.6,
                  px: 1.5, py: 0.65, borderRadius: 999, flexShrink: 0,
                  fontSize: '0.8rem', fontWeight: selected ? 700 : 600,
                  fontFamily: FONT,
                  /* Selected: state's soft-tint bg + state's deep ink + a
                     border in the state's tint. All → solid navy (neutral
                     anchor for the row). Unselected: white surface. */
                  ...(selected
                    ? isAll
                      ? { bgcolor: BRAND.navy, color: '#fff', border: `1px solid ${BRAND.navy}` }
                      : { bgcolor: c.soft,     color: c.ink,  border: `1px solid ${c.tint}` }
                    : { bgcolor: BRAND.surface, color: BRAND.muted, border: `1px solid ${BRAND.borderStrong}` }),
                  transition: 'all 0.16s ease',
                  '&:hover': selected
                    ? {}
                    : {
                        bgcolor: isAll ? BRAND.bg : c.soft,
                        borderColor: isAll ? BRAND.muted : c.tint,
                        color: isAll ? BRAND.ink : c.ink,
                      },
                }}
              >
                {/* State-colored dot — the same visual as the pill dots on
                    the cards. Hidden for "All" since it has no single
                    matching state. */}
                {!isAll && (
                  <Box component="span" sx={{
                    width: 7, height: 7, borderRadius: '50%',
                    bgcolor: c.dot, flexShrink: 0,
                    boxShadow: selected ? `0 0 0 2px ${c.soft}` : 'none',
                  }} />
                )}
                {opt.label}
                <Box component="span" sx={{
                  fontSize: '0.68rem', fontWeight: 800, lineHeight: 1.6,
                  px: 0.7, borderRadius: 999,
                  /* Count badge: soft-white on selected navy (All), otherwise
                     inherits the chip's ink over a light neutral fill. */
                  bgcolor: selected
                    ? isAll ? 'rgba(255,255,255,0.22)' : BRAND.surface
                    : BRAND.bg,
                  color: selected
                    ? isAll ? '#fff' : c.ink
                    : BRAND.muted,
                }}>
                  {loading ? '—' : chipCounts[opt.value]}
                </Box>
              </Box>
            );
          })}
        </Box>

          {/* View toggle — cards vs ledger rows */}
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(e, m) => m && setViewMode(m)}
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



      {/* ── Floating selection bar ───────────────────────────────────────── */}
      {canManage && hasCompletedVisible && !loading && (
        <SelectionBar
          count={selectedCount}
          total={completedVisibleIds.length}
          allSelected={allSelected}
          someSelected={someSelected}
          onSelectAll={toggleSelectAll}
          onClear={clearSelection}
          onRemove={requestBulkDelete}
          deleting={deleting}
          categoryLabel={isExpiredView ? "expired" : "completed"}
          noun="assessment"
        />
      )}


      {/* ── Error banner ─────────────────────────────────────────────────── */}
      {(error || startError) && !loading && (
        <Alert
          severity="error" icon={<ErrorOutlined />}
          onClose={startError ? () => setStartError(null) : undefined}
          action={
            error
              ? <Button color="inherit" size="small" onClick={refetch}>Retry</Button>
              : undefined
          }
          sx={{ mb: 2, borderRadius: '12px' }}
        >
          {error || startError}
        </Alert>
      )}

      {/* ── Loading skeletons — mirror the fold card's shape ─────────────── */}
      {loading && (
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
          {[0, 1, 2, 3].map((i) => (
            <Card key={i} elevation={0} sx={{
              borderRadius: '16px', border: `1px solid ${BRAND.border}`, p: 2.25,
            }}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <Skeleton variant="circular" width={42} height={42} />
                <Box sx={{ flexGrow: 1 }}>
                  <Skeleton width="80%" height={20} />
                  <Skeleton width="55%" height={14} />
                </Box>
              </Stack>
              <Skeleton width="70%" height={16} sx={{ mt: 2 }} />
              <Skeleton variant="rounded" height={34} sx={{ mt: 1.5, borderRadius: '9px' }} />
              <Skeleton variant="rounded" height={34} sx={{ mt: 1.75, borderRadius: '999px', width: '55%', ml: 'auto' }} />
            </Card>
          ))}
        </Box>
      )}

      {/* ── Cards ────────────────────────────────────────────────────────── */}
      {!loading && !error && (
        <>
          {visible.length === 0 ? (
            <Box sx={{
              textAlign: 'center', py: { xs: 5, sm: 7 }, px: 2,
              bgcolor: BRAND.surface, borderRadius: '16px',
              border: `1px dashed ${BRAND.borderStrong}`,
            }}>
              <Typography sx={{ mb: 1, color: BRAND.ink, fontWeight: 700, fontSize: { xs: '0.95rem', sm: '1.05rem' } }}>
                {searchQuery
                  ? 'No assessments match'
                  : view === 'completed' ? 'No completed assessments yet'
                  : view === 'expired'   ? 'No expired assessments'
                  : view === 'in_progress' ? 'Nothing in progress'
                  : 'No assessments available'}
              </Typography>
              <Typography sx={{ mb: searchQuery ? 2.5 : 0, color: BRAND.muted, fontSize: { xs: '0.78rem', sm: '0.875rem' } }}>
                {searchQuery
                  ? 'Try a different search or switch the status filter back to All.'
                  : view === 'completed' ? 'Finished tests will appear here.'
                  : view === 'expired'   ? 'Tests past their due date will appear here.'
                  : view === 'in_progress' ? 'Assessments you start will appear here until submitted.'
                  : 'Check back later for new assignments.'}
              </Typography>
              {searchQuery && (
                <Button
                  variant="outlined"
                  onClick={() => { setSearchQuery(''); handleViewChange('all'); }}
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
              {pagedVisible.map((a) => {
                const id = getId(a);
                return (
                  <Box key={a.id} sx={{ minWidth: 0, width: '100%' }}>
                    <AssessmentCard
                      a={a}
                      viewMode={viewMode}
                      onStart={handleStart}
                      isStarting={startingId === id}
                      selectable={canManage}
                      selected={selectedIds.has(id)}
                     onToggleSelect={toggleSelect}
                      onRequestReschedule={(card) => setReschedDlg({ a: card, reason: '' })}
                    />
                  </Box>
                );
              })}
            </Box>
          )}

          {/* ── Pagination bar — same as the job pages ─────────────────── */}
          {visible.length > 0 && (
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
                    {(page - 1) * effectiveSize + 1}–{Math.min(page * effectiveSize, visible.length)}
                  </Box>
                  {' '}of{' '}
                  <Box component="span" sx={{ color: BRAND.ink, fontWeight: 700 }}>
                    {visible.length}
                  </Box>
                  {' '}assessments
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
                    sx={{
                      fontSize: '0.82rem', fontWeight: 700, fontFamily: FONT,
                      color: BRAND.navy, bgcolor: BRAND.bg,
                      borderRadius: '10px', minWidth: { xs: 76, sm: 80 },
                      height: { xs: 38, sm: 36 },
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: BRAND.border },
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: BRAND.borderStrong },
                    }}
                  >
                    {PAGE_SIZE_OPTIONS.map((n) => (
                      <MenuItem key={n} value={n} sx={{ fontSize: '0.82rem', fontFamily: FONT }}>
                        {n === 'all' ? 'All' : n}
                      </MenuItem>
                    ))}
                  </Select>
                  <Typography sx={{ fontSize: { xs: '0.78rem', sm: '0.82rem' }, color: BRAND.muted, fontWeight: 500 }}>
                    per page
                  </Typography>
                </Stack>
              </Stack>

              <Pagination
                count={totalPages}
                page={page}
                onChange={handlePageChange}
                shape="rounded"
                siblingCount={0}
                sx={{
                  '& .MuiPaginationItem-root': {
                    fontWeight: 700, fontFamily: FONT, borderRadius: '9px',
                    '&.Mui-selected': {
                      bgcolor: BRAND.navy, color: '#fff',
                      '&:hover': { bgcolor: BRAND.navyDark },
                    },
                  },
                }}
              />
            </Box>
          )}
        </>
      )}

      {/* ── Delete confirmation dialog ───────────────────────────────────── */}
      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => !deleting && setDeleteTarget(null)}
        slotProps={{ paper: { sx: { borderRadius: '16px', maxWidth: 420, fontFamily: FONT } } }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: BRAND.navy, pb: 1, fontFamily: FONT }}>
          {deleteTarget?.type === 'bulk'
            ? `Delete ${deleteTarget?.items.length} assessment${deleteTarget?.items.length === 1 ? '' : 's'}?`
            : 'Delete this assessment?'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: BRAND.muted, fontSize: '0.9rem', fontFamily: FONT }}>
            {deleteTarget?.type === 'single' && deleteTarget?.items[0] && (
              <>
                <strong>{deleteTarget.items[0].title}</strong> will be removed
                from your {isExpiredView ? 'expired' : 'completed'} list.
                This action cannot be undone.
              </>
            )}
            {deleteTarget?.type === 'bulk' && (
              <>
                The selected {isExpiredView ? 'expired' : 'completed'} assessments
                will be removed from your list. This action cannot be undone.
              </>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            onClick={() => setDeleteTarget(null)}
            disabled={deleting}
            sx={{ textTransform: 'none', fontWeight: 600, color: BRAND.navy, borderRadius: '10px', fontFamily: FONT }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={confirmDelete}
            disabled={deleting}
            disableElevation
            startIcon={
              deleting
                ? <CircularProgress size={16} sx={{ color: '#fff' }} />
                : <DeleteOutlined />
            }
            sx={{
              textTransform: 'none', fontWeight: 700, borderRadius: '10px', fontFamily: FONT,
              bgcolor: BRAND.danger,
              '&:hover': { bgcolor: '#8F3427' },
            }}
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════
          Date-range filter popover
          Preset chips (Today / Tomorrow / This Week / Next 7 / Next 30) at
          the top, custom From/To date inputs below. Changes apply instantly
          — no Apply button — so the user sees results while they pick.
          The "Clear" action wipes the range and closes.
          ══════════════════════════════════════════════════════════════════ */}
      <Popover
        open={Boolean(dateAnchor)}
        anchorEl={dateAnchor}
        onClose={() => setDateAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              mt: 1,
              borderRadius: '14px',
              border: `1px solid ${BRAND.border}`,
              boxShadow: '0 16px 40px rgba(2,33,36,0.14)',
              width: { xs: 300, sm: 340 },
              fontFamily: FONT,
              overflow: 'hidden',
            },
          },
        }}
      >
        <Box sx={{
          px: 2, pt: 2, pb: 1.25,
          borderBottom: `1px solid ${BRAND.border}`,
          bgcolor: BRAND.bg,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TuneOutlined sx={{ fontSize: 18, color: BRAND.sageText }} />
            <Typography sx={{
              fontSize: '0.95rem', fontWeight: 700, color: BRAND.ink,
              letterSpacing: '-0.01em',
            }}>
              Filter by date
            </Typography>
          </Box>
          <Typography sx={{ fontSize: '0.75rem', color: BRAND.muted, mt: 0.25 }}>
            Show assessments whose window overlaps this range.
          </Typography>
        </Box>

        {/* Preset chips */}
        <Box sx={{
          display: 'flex', flexWrap: 'wrap', gap: 0.6,
          px: 2, pt: 1.75, pb: 1.25,
        }}>
          {DATE_PRESETS.map((p) => {
            const active = activePreset === p.id;
            return (
              <Box
                key={p.id}
                onClick={() => {
                  const r = p.get();
                  setDateRange(r);
                  setActivePreset(p.id);
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ')
                  && (() => { const r = p.get(); setDateRange(r); setActivePreset(p.id); })()}
                sx={{
                  cursor: 'pointer', userSelect: 'none',
                  px: 1.25, py: 0.5, borderRadius: 999,
                  fontSize: '0.76rem', fontWeight: 700,
                  fontFamily: FONT,
                  ...(active
                    ? { bgcolor: BRAND.sage, color: '#fff', border: `1px solid ${BRAND.sage}` }
                    : { bgcolor: BRAND.surface, color: BRAND.muted, border: `1px solid ${BRAND.borderStrong}` }),
                  transition: 'all 0.14s ease',
                  '&:hover': active
                    ? {}
                    : { bgcolor: BRAND.sageSoft, color: BRAND.sageText, borderColor: BRAND.sage },
                }}
              >
                {p.label}
              </Box>
            );
          })}
        </Box>

        <Divider sx={{ borderColor: BRAND.border }} />

        {/* Custom range */}
        <Box sx={{ px: 2, pt: 1.75, pb: 1.25 }}>
          <Typography sx={{
            fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.06em',
            color: BRAND.faint, textTransform: 'uppercase', mb: 1,
          }}>
            Custom range
          </Typography>
          <Stack spacing={1.25}>
            <Box>
              <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: BRAND.muted, mb: 0.5 }}>
                From
              </Typography>
              <TextField
                type="date"
                fullWidth
                size="small"
                value={toDateInputValue(dateRange.from)}
                onChange={(e) => {
                  const from = fromDateInputValue(e.target.value);
                  setDateRange((r) => ({
                    from: from ? startOfDay(from) : null,
                    to: r.to,
                  }));
                  setActivePreset(null);
                }}
                slotProps={{
                  htmlInput: { max: toDateInputValue(dateRange.to) || undefined },
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: BRAND.bg,
                    borderRadius: '10px',
                    fontFamily: FONT, fontSize: '0.88rem',
                    '& fieldset': { borderColor: BRAND.borderStrong },
                    '&:hover fieldset': { borderColor: BRAND.sage },
                    '&.Mui-focused fieldset': { borderColor: BRAND.sage },
                  },
                }}
              />
            </Box>
            <Box>
              <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: BRAND.muted, mb: 0.5 }}>
                To
              </Typography>
              <TextField
                type="date"
                fullWidth
                size="small"
                value={toDateInputValue(dateRange.to)}
                onChange={(e) => {
                  const to = fromDateInputValue(e.target.value);
                  setDateRange((r) => ({
                    from: r.from,
                    to: to ? endOfDay(to) : null,
                  }));
                  setActivePreset(null);
                }}
                slotProps={{
                  htmlInput: { min: toDateInputValue(dateRange.from) || undefined },
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: BRAND.bg,
                    borderRadius: '10px',
                    fontFamily: FONT, fontSize: '0.88rem',
                    '& fieldset': { borderColor: BRAND.borderStrong },
                    '&:hover fieldset': { borderColor: BRAND.sage },
                    '&.Mui-focused fieldset': { borderColor: BRAND.sage },
                  },
                }}
              />
            </Box>
          </Stack>
        </Box>

        {/* Footer actions */}
        <Box sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1,
          px: 2, py: 1.25,
          borderTop: `1px solid ${BRAND.border}`,
          bgcolor: BRAND.bg,
        }}>
          <Button
            onClick={() => {
              setDateRange({ from: null, to: null });
              setActivePreset(null);
            }}
            disabled={!(dateRange.from || dateRange.to)}
            sx={{
              textTransform: 'none', fontFamily: FONT, fontSize: '0.82rem',
              fontWeight: 700, color: BRAND.muted, borderRadius: '999px',
              px: 1.5, height: 32,
              '&:hover': { bgcolor: 'rgba(16,18,16,0.05)', color: BRAND.ink },
              '&.Mui-disabled': { color: BRAND.faint },
            }}
          >
            Clear
          </Button>
          <Button
            onClick={() => setDateAnchor(null)}
            disableElevation
            sx={{
              textTransform: 'none', fontFamily: FONT, fontSize: '0.82rem',
              fontWeight: 700, color: '#fff', bgcolor: BRAND.navy,
              borderRadius: '999px', px: 2, height: 32,
              '&:hover': { bgcolor: BRAND.sage },
            }}
          >
            Done
          </Button>
        </Box>
      </Popover>

      {/* BUILD: 2026-08-05-assessment-reschedule-v1 */}
      <Dialog open={!!reschedDlg} onClose={() => !reschedBusy && setReschedDlg(null)}
        maxWidth="xs" fullWidth
        slotProps={{ paper: { sx: { borderRadius: '16px', fontFamily: FONT } } }}>
        <DialogTitle sx={{ fontFamily: FONT, fontWeight: 800, fontSize: '1rem', pb: 1 }}>
          🔁 Request a reschedule
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ fontFamily: FONT, fontSize: '0.85rem', color: BRAND.muted, mb: 1.5 }}>
            {reschedDlg?.a?.title || 'This assessment'}
            {reschedDlg?.a?.expiresAt ? ` · closed ${fmtDateTime(reschedDlg.a.expiresAt)}` : ''}
          </DialogContentText>
          <TextField
            autoFocus fullWidth multiline minRows={3}
            required
            label="Reason for reschedule"
            placeholder="Briefly explain why you couldn't take the assessment in the given window (e.g. health issue, network failure, exam clash)"
            value={reschedDlg?.reason || ''}
            onChange={(e) => setReschedDlg((d) => ({ ...d, reason: e.target.value }))}
            error={!!reschedDlg?.showError && !(reschedDlg?.reason || '').trim()}
            helperText={
              !!reschedDlg?.showError && !(reschedDlg?.reason || '').trim()
                ? 'Please provide a reason — this helps the recruiter decide.'
                : `${(reschedDlg?.reason || '').length}/2000`
            }
            slotProps={{ htmlInput: { maxLength: 2000 } }}
            sx={{ '& .MuiInputBase-root': { fontFamily: FONT, fontSize: '0.85rem', borderRadius: '10px' } }}
          />
          <Alert severity="info" icon={false}
            sx={{ mt: 2, borderRadius: '10px', fontFamily: FONT, fontSize: '0.78rem',
              bgcolor: '#FFF6E5', color: '#8A6A1F', border: '1px dashed rgba(201,123,74,0.4)',
              '& .MuiAlert-message': { width: '100%' } }}>
            <Box sx={{ fontWeight: 800, mb: 0.6, fontSize: '0.8rem' }}>
              Before you send this request, please note:
            </Box>
            <Box component="ul" sx={{ pl: 2, m: 0, '& li': { mb: 0.4, lineHeight: 1.5 } }}>
              <li>
                <strong>Only one request is allowed</strong> per assessment. Once sent,
                you cannot send another for this assessment.
              </li>
              <li>
                <strong>The recruiter decides</strong> whether to approve it. If they
                approve, you'll receive an email with a new assessment window.
              </li>
              <li>
                If the recruiter does not approve, <strong>no new window will be set</strong>
                {' '}and you will not receive any further email — your assessment stays closed.
              </li>
              <li>
                Reschedule is an <strong>iEvalX platform feature</strong>, not a guarantee
                from the company. Please be clear and honest in your reason.
              </li>
            </Box>
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setReschedDlg(null)} disabled={reschedBusy}
            sx={{ textTransform: 'none', fontFamily: FONT, color: BRAND.muted }}>
            Cancel
          </Button>
          <Button onClick={submitReschedule} disabled={reschedBusy} disableElevation
            startIcon={reschedBusy ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : null}
            sx={{ textTransform: 'none', fontFamily: FONT, fontWeight: 700,
              bgcolor: '#C97B4A', color: '#fff', borderRadius: '999px', px: 2.25,
              '&:hover': { bgcolor: '#A8623A' } }}>
            {reschedBusy ? 'Sending…' : 'Send request'}
          </Button>
        </DialogActions>
      </Dialog>

      {reschedMsg && (
        <Box sx={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          zIndex: 1500, maxWidth: 480, width: 'calc(100% - 32px)' }}>
          <Alert severity={reschedMsg.severity} onClose={() => setReschedMsg(null)}
            sx={{ borderRadius: '12px', fontFamily: FONT, fontSize: '0.83rem',
              boxShadow: '0 12px 32px rgba(2,33,36,0.18)' }}>
            {reschedMsg.text}
          </Alert>
        </Box>
      )}
    </Box>
  );
}