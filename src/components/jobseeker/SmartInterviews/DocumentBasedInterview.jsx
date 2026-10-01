import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Container, Typography, Card, Button, Stack, Tooltip, IconButton,
  Skeleton, Alert, CircularProgress, Checkbox, Dialog, DialogTitle,
  DialogContent, DialogContentText, DialogActions, Pagination, Select,
  MenuItem, TextField, InputAdornment, Paper, ToggleButton, ToggleButtonGroup,
  Snackbar, Avatar,
} from '@mui/material';
import {
  RefreshOutlined, ErrorOutlined, CheckCircleOutlined, DeleteOutlined, CheckBoxOutlineBlank, CheckBoxOutlined,
  IndeterminateCheckBoxOutlined, Search, ClearRounded, ViewList, ViewModule,
  HelpOutlineOutlined, AccessTimeOutlined, PlayArrowRounded,
  BusinessRounded, EventOutlined, ArrowForwardRounded,
} from '@mui/icons-material';

import useDocumentBasedInterview from '@/hooks/jobseeker/useDocumentBasedInterview';
import SelectionBar from '@/components/jobseeker/common/SelectionBar';
import smartInterviewService from '@/services/api/jobseeker/smartInterviewService';
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
  done:         '#3E6E3E',
  doneSoft:     '#EAF2E9',
  danger:       '#A63D2F',
  dangerSoft:   '#FAEAE8',
  sched:        '#3C5A78',
  schedSoft:    '#EAF0F6',
};

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50, 'all'];
const DEFAULT_PAGE_SIZE = 10;

const VIEW_CHIPS = [
  { value: 'all',         label: 'All' },
  { value: 'ready',       label: 'Ready' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed',   label: 'Completed' },
  { value: 'expired',     label: 'Expired' },
];

/* Status pill meta — pine-system palette matching AI Assessments. */
const STATUS_PILL = {
  ready:       { label: 'Ready',       color: BRAND.done,   bg: BRAND.doneSoft },
  scheduled:   { label: 'Scheduled',   color: BRAND.sched,  bg: BRAND.schedSoft },
  in_progress: { label: 'In Progress', color: '#8A6A1F',    bg: '#FFF6E5' },
  scoring:     { label: 'Scoring',     color: '#8A6A1F',    bg: '#FFF6E5' },
  completed:   { label: 'Completed',   color: BRAND.done,   bg: BRAND.doneSoft },
  expired:     { label: 'Expired',     color: BRAND.muted,  bg: '#F0F1EE' },
  missed:      { label: 'Missed',      color: BRAND.danger, bg: BRAND.dangerSoft },
  cancelled:   { label: 'Cancelled',   color: BRAND.muted,  bg: '#F0F1EE' },
  locked:      { label: 'Locked',      color: BRAND.muted,  bg: '#F0F1EE' },

  pending_document: { label: 'Awaiting questions', color: '#8A6A1F', bg: '#FFF6E5' },
};


const FOLD_COLOR = {
  ready:       { face: BRAND.sage,   edge: BRAND.sageSoft  },
  scheduled:   { face: '#8AA4BC',    edge: BRAND.schedSoft },
  in_progress: { face: '#C97B4A',    edge: BRAND.amberSoft },
  scoring:     { face: '#C97B4A',    edge: BRAND.amberSoft },
  completed:   { face: BRAND.done,   edge: BRAND.doneSoft  },
  expired:     { face: '#B9BEB4',    edge: '#F0F1EE'       },
  missed:      { face: BRAND.danger, edge: BRAND.dangerSoft},
  cancelled:   { face: '#B9BEB4',    edge: '#F0F1EE'       },
  locked:      { face: '#B9BEB4',    edge: '#F0F1EE'       },
  pending_document: { face: '#C97B4A', edge: BRAND.amberSoft },
};

const AVATAR_COLORS = ['#7F9E7E','#5E7F9E','#9E7F7E','#8B7F9E','#7E9E93','#9E937E','#6C8B6B','#3C5A78'];

/* ── Formatters ──────────────────────────────────────────────────────────── */
const fmtDateTime = (v) => {
  if (!v) return null;
  try { return new Date(v).toLocaleString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }); }
  catch { return null; }
};
const fmtDate = (v) => {
  if (!v) return '—';
  try { return new Date(v).toLocaleDateString('en-IN', { day:'numeric', month:'short' }); }
  catch { return '—'; }
};

const initials = (name = '') =>
  String(name).split(/[\s.]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'IV';

const avatarColorFor = (str = '') => {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
};

/* ── Interview classification ────────────────────────────────────────────── */
const isWindowExpired = (iv) => iv?.window_end && Date.now() > new Date(iv.window_end).getTime();
const isBeforeWindow  = (iv) => iv?.window_start && Date.now() < new Date(iv.window_start).getTime();

// BUILD: 2026-08-14-doc-candidate-reschedule-v1
const RESCHED_ATTEMPTED_STATUSES = [
  'started', 'in_progress', 'scoring', 'completed', 'partial',
];
const canRequestReschedule = (iv) => {
  if (!iv || !iv.window_end) return false;
  if (!isWindowExpired(iv)) return false;
  if (RESCHED_ATTEMPTED_STATUSES.includes(iv.status)) return false;
  if (iv.decision === 'approved' || iv.decision === 'rejected') return false;
  if (iv.status === 'locked' || iv.status === 'draft') return false;
  if (iv.status === 'reschedule_requested') return false;
  return true;
};
const effectiveStatus = (iv) => {
  if (!iv) return 'expired';
  if (iv.status === 'completed' || iv.status === 'scoring') return 'completed';
  if (iv.status === 'no_attempt') return 'missed';
  if (iv.status === 'cancelled')  return 'cancelled';
  if (iv.status === 'locked' && iv.pending_document) return 'pending_document';
  if (iv.status === 'locked')     return 'locked';
  if (isWindowExpired(iv))        return 'expired';
  if (iv.status === 'in_progress') return 'in_progress';
  if (isBeforeWindow(iv))         return 'scheduled';
  return 'ready';
};

const canStart = (iv) => {
  const eff = effectiveStatus(iv);
  const hasQs = (iv.questions_count ?? 0) > 0;
  return (eff === 'ready' || eff === 'in_progress') && hasQs;
};


const isDueSoon = (iv) => {
  if (!iv?.window_end) return false;
  const ms = new Date(iv.window_end).getTime() - Date.now();
  return ms > 0 && ms < 48 * 60 * 60 * 1000;
};

const getId = (iv) => iv?.id ?? iv?.assignment_id;

function InterviewCard({
  iv, onStart, isStarting, viewMode = 'grid',
  selectable = false, selected = false, onToggleSelect = () => {},
  // BUILD: 2026-08-14-doc-candidate-reschedule-v1
  onRequestReschedule = null,
}) {
  const eff       = effectiveStatus(iv);
  const pill      = STATUS_PILL[eff] ?? STATUS_PILL.ready;
  const fold      = FOLD_COLOR[eff]  ?? FOLD_COLOR.ready;
  const locked    = ['completed','expired','scheduled','cancelled','locked','missed'].includes(eff);
  const inProg    = eff === 'in_progress';
  const isReady   = eff === 'ready';
  const startable = !locked && canStart(iv);
  const urgent    = isReady && isDueSoon(iv);

  const hasAction = ['ready', 'in_progress', 'scheduled'].includes(eff);

  // BUILD: 2026-08-14-doc-candidate-reschedule-v1
  const canAskReschedule = !!onRequestReschedule && canRequestReschedule(iv);
  const rescheduleBtn = canAskReschedule ? (
    <Button
      onClick={(e) => { e.stopPropagation(); onRequestReschedule(iv); }}
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

  const company   = iv.company_name || iv.company || 'Company';
  const roundName = (iv.interview_name || 'Interview')
    + (Number(iv.total_rounds) > 1
        ? ` · Round ${iv.round_number || 1}/${iv.total_rounds}` : '');
  const jobTitle  = iv.job_title || iv.title || 'Untitled interview';
  const avatarBg  = avatarColorFor(company);
  const logoUrl   = iv.company_logo_url || iv.company_logo || iv.employer_logo_url || iv.employer_logo || iv.logo_url || iv.logo || iv.company_photo;

  const windowText =
    eff === 'scheduled' ? `Opens ${fmtDateTime(iv.window_start) ?? '—'}`
    : eff === 'expired'   ? (iv.window_end ? `Closed ${fmtDateTime(iv.window_end)}` : 'Window closed')
    : eff === 'completed' ? 'Submitted — awaiting nothing more'
    : eff === 'missed'    ? 'Missed — window closed with no attempt'
    : eff === 'cancelled' ? 'Cancelled by the employer'
    : eff === 'pending_document'
        ? (iv.window_start
            ? `Opens ${fmtDateTime(iv.window_start)} · questions pending`
            : 'Questions pending from employer')
    : iv.window_end       ? `Due ${fmtDateTime(iv.window_end)}`
    : iv.window_start     ? `From ${fmtDateTime(iv.window_start)}`
    : null;

  const btnLabel =
    eff === 'scheduled' ? `Opens ${fmtDate(iv.window_start)}`
    : eff === 'expired'   ? 'Expired'
    : eff === 'completed' ? 'Completed'
    : eff === 'missed'    ? 'Missed'
    : eff === 'cancelled' ? 'Cancelled'
    : inProg              ? 'Resume Interview'
    : 'Start Interview';

  const handleStart = (e) => {
    e?.stopPropagation?.();
    if (!startable || isStarting) return;
    onStart(iv);
  };

  const handleCardClick = () => {
    if (selectable) onToggleSelect(iv);
    else if (startable) onStart(iv);
  };

  /* Avatar node — logo if present, otherwise coloured initials chip */
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

  /* ── LIST VIEW ────────────────────────────────────────────────────────── */
  if (viewMode === 'list') {
    const actionBtn = (
      <Button
        disabled={!startable || isStarting || selectable}
        onClick={handleStart}
        disableElevation
        endIcon={startable ? <ArrowForwardRounded sx={{ fontSize: 16 }} /> : null}
        sx={{
          textTransform: 'none', fontSize: '0.78rem', fontWeight: 700,
          borderRadius: '999px', px: 1.8, height: 34, minWidth: 0,
          lineHeight: 1, flexShrink: 0, whiteSpace: 'nowrap',
          ...(inProg
            ? { bgcolor: BRAND.sage, color: '#fff', '&:hover': { bgcolor: BRAND.sageDark } }
            : startable
            ? {
                bgcolor: BRAND.navy, color: '#fff',
                boxShadow: '0 2px 8px rgba(2,33,36,0.22)',
                '&:hover': { bgcolor: BRAND.sage, boxShadow: '0 4px 12px rgba(127,158,126,0.4)' },
              }
            : eff === 'completed'
            ? { bgcolor: BRAND.doneSoft, color: BRAND.done, border: '1px solid rgba(127,158,126,0.45)' }
            : eff === 'scheduled'
            ? { bgcolor: BRAND.schedSoft, color: BRAND.sched }
            : eff === 'missed'
            ? { bgcolor: BRAND.dangerSoft, color: BRAND.danger }
            : { bgcolor: '#F0F1EE', color: BRAND.muted }),
          '&.Mui-disabled': {
            ...(eff === 'completed'
              ? { bgcolor: BRAND.doneSoft, color: BRAND.done }
              : eff === 'scheduled'
              ? { bgcolor: BRAND.schedSoft, color: BRAND.sched }
              : eff === 'missed'
              ? { bgcolor: BRAND.dangerSoft, color: BRAND.danger }
              : { bgcolor: '#F0F1EE', color: BRAND.muted }),
          },
        }}
      >
        {btnLabel}
      </Button>
    );

    return (
      <Paper
        elevation={0}
        onClick={handleCardClick}
        sx={{
          position: 'relative',
          bgcolor: selected ? BRAND.sageSoft : BRAND.surface,
          border: `1px solid ${selected ? BRAND.sage : BRAND.border}`,
          borderRadius: '14px',
          p: { xs: 1.5, sm: 2 },
          cursor: (selectable || startable) ? 'pointer' : 'default',
          overflow: 'hidden',
          transition: 'all 0.18s ease',
          '&:hover': {
            borderColor: selected ? BRAND.sage : BRAND.borderStrong,
            boxShadow: '0 4px 12px rgba(2,33,36,0.06)',
          },
        }}
      >
        {/* Left status accent bar — colour-codes the row at the edge */}
        <Box sx={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
          bgcolor: fold.face,
        }} />

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 1.25, md: 2 }} sx={{ alignItems: { md: 'center' }, pl: 0.5 }}>
          {selectable && (
            <Checkbox
              checked={selected}
              onChange={() => onToggleSelect(iv)}
              onClick={(e) => e.stopPropagation()}
              sx={{ p: 0.5, color: BRAND.borderStrong, '&.Mui-checked': { color: BRAND.sage } }}
            />
          )}

          {/* Identity block */}
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flex: '1 1 300px', minWidth: 0 }}>
            {avatarNode}
            <Box sx={{ minWidth: 0 }}>
              {/* Full title shows on hover when the row truncates it */}
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

          {/* Meta cluster */}
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexShrink: 0 }}>
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
              <HelpOutlineOutlined sx={{ fontSize: 14, color: BRAND.faint }} />
              <Typography sx={{ fontFamily: FONT, fontSize: '0.78rem', color: BRAND.muted, fontWeight: 600 }}>
                {iv.questions_count ?? 0} Qs
              </Typography>
            </Stack>
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
              <AccessTimeOutlined sx={{ fontSize: 14, color: BRAND.faint }} />
              <Typography sx={{ fontFamily: FONT, fontSize: '0.78rem', color: BRAND.muted, fontWeight: 600 }}>
                {iv.duration_mins ?? '—'} min
              </Typography>
            </Stack>
          </Stack>

          {/* Window text — Tooltip surfaces the full string when the cell truncates */}
          {windowText && (
            <Tooltip title={windowText} arrow placement="top" enterDelay={400}>
              <Typography sx={{
                fontFamily: FONT, fontSize: '0.78rem', fontWeight: 600,
                color: urgent ? BRAND.amber : BRAND.muted,
                flex: '1 1 auto', minWidth: 0,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {windowText}
              </Typography>
            </Tooltip>
          )}


          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexShrink: 0 }}>
            <Box sx={{
              display: 'inline-flex', alignItems: 'center', gap: 0.6,
              px: 1.1, py: 0.35, borderRadius: 999,
              bgcolor: pill.bg, color: pill.color,
              fontFamily: FONT, fontSize: '0.68rem', fontWeight: 800,
              letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap',
            }}>
              <Box component="span" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'currentColor' }} />
              {pill.label}
            </Box>
            {/* BUILD: 2026-08-14-doc-candidate-reschedule-v1 */}
            {rescheduleBtn}
            {hasAction && actionBtn}
          </Stack>
        </Stack>
      </Paper>
    );
  }

  /* ── GRID VIEW — Deadline Forward card ─────────────────────────────────── */
  const actionBtn = (
    <Button
      disabled={!startable || isStarting || selectable}
      onClick={handleStart}
      disableElevation
      endIcon={startable ? <ArrowForwardRounded sx={{ fontSize: 15 }} /> : null}
      sx={{
        fontFamily: FONT, textTransform: 'none',
        fontSize: 12.5, fontWeight: 700,
        borderRadius: '999px', px: 1.8, py: 0,
        height: 34, minWidth: 0, lineHeight: 1, flexShrink: 0,
        ...(inProg
          ? { bgcolor: BRAND.sage, color: '#fff', '&:hover': { bgcolor: BRAND.sageDark } }
          : startable
          ? {
              bgcolor: BRAND.navy, color: '#fff',
              boxShadow: '0 2px 8px rgba(2,33,36,0.22)',
              '&:hover': { bgcolor: BRAND.sage, boxShadow: '0 4px 12px rgba(127,158,126,0.4)' },
            }
          : eff === 'completed'
          ? { bgcolor: BRAND.doneSoft, color: BRAND.done, border: '1px solid rgba(127,158,126,0.45)' }
          : eff === 'scheduled'
          ? { bgcolor: BRAND.schedSoft, color: BRAND.sched }
          : eff === 'missed'
          ? { bgcolor: BRAND.dangerSoft, color: BRAND.danger }
          : { bgcolor: '#F0F1EE', color: BRAND.muted }),
        '&.Mui-disabled': {
          ...(eff === 'completed'
            ? { bgcolor: BRAND.doneSoft, color: BRAND.done }
            : eff === 'scheduled'
            ? { bgcolor: BRAND.schedSoft, color: BRAND.sched }
            : eff === 'missed'
            ? { bgcolor: BRAND.dangerSoft, color: BRAND.danger }
            : { bgcolor: '#F0F1EE', color: BRAND.muted }),
        },
      }}
    >
      {isStarting && startable
        ? <CircularProgress size={13} sx={{ color: 'inherit', mr: 0.6 }} />
        : null}
      {btnLabel}
    </Button>
  );

  return (
    <Paper
      elevation={0}
      onClick={handleCardClick}
      role={startable || selectable ? 'button' : undefined}
      tabIndex={startable || selectable ? 0 : -1}
      aria-label={`${jobTitle} at ${company}`}
      onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && (startable || selectable)) { e.preventDefault(); handleCardClick(); } }}
      sx={{
        position: 'relative',
        cursor: (selectable || startable) ? 'pointer' : 'default',
        borderRadius: '16px',
        bgcolor: selected ? BRAND.sageSoft : BRAND.surface,
        overflow: 'hidden',
        boxShadow: selected
          ? '0 0 0 2px rgba(127,158,126,0.55), 0 12px 28px rgba(2,33,36,0.08)'
          : '0 12px 28px rgba(2,33,36,0.08)',
        p: '18px 20px 20px',
        height: '100%',
        display: 'flex', flexDirection: 'column',
        transition: 'transform .3s ease, box-shadow .3s ease',
        outline: 'none',
        '&:focus-visible': { boxShadow: `0 0 0 2px ${BRAND.sage}, 0 12px 28px rgba(2,33,36,0.08)` },
        '&:hover': {
          transform: 'translateY(-6px)',
          boxShadow: selected
            ? '0 0 0 2px rgba(127,158,126,0.55), 0 24px 56px rgba(2,33,36,0.13)'
            : '0 24px 56px rgba(2,33,36,0.13)',
        },
        '&:hover .dogear': { borderTopWidth: '46px', borderLeftWidth: '46px' },
        '&:hover .dogear-shadow': { width: 46, height: 46 },
      }}
    >
      {/* Dog-ear fold — its colour telegraphs status. Clickable for select mode. */}
      <Box
        role={selectable ? 'button' : undefined}
        aria-label={selectable ? `Select ${jobTitle}` : `Status: ${pill.label}`}
        onClick={(e) => { if (selectable) { e.stopPropagation(); onToggleSelect(iv); } }}
        sx={{ position: 'absolute', top: 0, right: 0, cursor: selectable ? 'pointer' : 'default', zIndex: 2, outline: 'none' }}
      >
        <Tooltip title={pill.label} arrow placement="left">
          <Box className="dogear" sx={{
            width: 0, height: 0,
            borderLeft: `40px solid ${fold.edge}`,
            borderTop:  `40px solid ${fold.face}`,
            borderRadius: '0 16px 0 0',
            transition: 'border-width .25s ease',
          }} />
        </Tooltip>
        <Box className="dogear-shadow" sx={{
          position: 'absolute', top: 0, right: 0, width: 40, height: 40,
          background: 'linear-gradient(225deg, transparent 50%, rgba(2,33,36,0.16) 50%, transparent 64%)',
          pointerEvents: 'none', transition: 'all .25s ease',
        }} />
        {/* Selection check overlays the fold when in select mode + selected */}
        {selectable && selected && (
          <CheckCircleOutlined sx={{
            position: 'absolute', top: 5, right: 5, fontSize: 18, color: '#fff',
            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))',
          }} />
        )}
      </Box>

      {/* Header row: avatar + title + subline — both wrapped in Tooltip so a
          long title or long "Company · Round name" reveals in full on hover. */}
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

      {/* Meta row: questions · duration · round */}
      <Stack direction="row" spacing={2} sx={{ mt: 1.75, flexWrap: 'wrap', rowGap: 0.5 }}>
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
          <HelpOutlineOutlined sx={{ fontSize: 14, color: BRAND.faint }} />
          <Typography sx={{ fontFamily: FONT, fontSize: 12.5, color: BRAND.faint, fontWeight: 500 }}>
            {iv.questions_count ?? 0} Qs
          </Typography>
        </Stack>
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
          <AccessTimeOutlined sx={{ fontSize: 14, color: BRAND.faint }} />
          <Typography sx={{ fontFamily: FONT, fontSize: 12.5, color: BRAND.faint, fontWeight: 500 }}>
            {iv.duration_mins ?? '—'} min
          </Typography>
        </Stack>
      </Stack>

    
      {windowText && (
        <Stack direction="row" spacing={0.75} sx={{
          alignItems: 'center', mt: 1.5, pt: 1.25,
          borderTop: `1.5px dashed ${urgent ? 'rgba(163,90,45,0.5)' : BRAND.borderStrong}`,
        }}>
          <EventOutlined sx={{ fontSize: 14, color: urgent ? BRAND.amber : BRAND.faint, flexShrink: 0 }} />
          <Tooltip title={windowText} arrow placement="top" enterDelay={400}>
            <Typography sx={{
              fontFamily: FONT, fontSize: 12.5, fontWeight: 600,
              color: urgent ? BRAND.amber : BRAND.muted,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
            }}>
              {windowText}
            </Typography>
          </Tooltip>
        </Stack>
      )}

      <Stack direction="row"
        sx={{ justifyContent: 'space-between', alignItems: 'center', mt: 'auto', pt: 2, width: '100%', gap: 1 }}>
        <Box sx={{
          display: 'inline-flex', alignItems: 'center', gap: 0.6,
          px: 1.1, py: 0.4, borderRadius: 999,
          bgcolor: pill.bg, color: pill.color,
          fontFamily: FONT, fontSize: '0.68rem', fontWeight: 800,
          letterSpacing: '0.06em', textTransform: 'uppercase',
          minWidth: 0, overflow: 'hidden', flexShrink: 1,
        }}>
          <Box component="span" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'currentColor', flexShrink: 0 }} />
          <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {pill.label}
          </Box>
        </Box>
        {/* BUILD: 2026-08-14-doc-candidate-reschedule-v1 */}
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexShrink: 0 }}>
          {rescheduleBtn}
          {hasAction && actionBtn}
        </Stack>
      </Stack>
    </Paper>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Main page — AI Assessments shell wrapping the InterviewCard grid
═══════════════════════════════════════════════════════════════════════════ */
const DocumentBasedInterview = () => {
  const { sessions, loading, error, refetch, deleteSession, deleteSessions } = useDocumentBasedInterview();
  const navigate = useNavigate();

  const [view,         setView]         = useState('all');
  const [viewMode,     setViewMode]     = useState('grid');
  const [searchQuery,  setSearchQuery]  = useState('');
  const [page,         setPage]         = useState(1);
  const [pageSize,     setPageSize]     = useState(DEFAULT_PAGE_SIZE);
  const [selectedIds,  setSelectedIds]  = useState(new Set());
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);
  const [startingId,   setStartingId]   = useState(null);
  const [startError,   setStartError]   = useState(null);
  const [toast,        setToast]        = useState(null);
  const [removedIds,   setRemovedIds]   = useState(new Set());
  // BUILD: 2026-08-14-doc-candidate-reschedule-v1
  const [reschedDlg,   setReschedDlg]   = useState(null);
  const [reschedBusy,  setReschedBusy]  = useState(false);

  const submitReschedule = async () => {
    if (!reschedDlg?.iv || reschedBusy) return;
    setReschedBusy(true);
    try {
      await smartInterviewService.requestReschedule(
        reschedDlg.iv.id, (reschedDlg.reason || '').trim(),
      );
      setToast({ severity: 'success',
        message: 'Reschedule requested — the employer will pick a new time for this round.' });
      setReschedDlg(null);
      await refetch();
    } catch (e) {
      const detail = e?.response?.data?.detail
        || 'Could not request a reschedule for this interview.';
      setToast({ severity: 'error', message: detail });
    } finally {
      setReschedBusy(false);
    }
  };
  const live = useMemo(
    () => (sessions || []).filter((s) => !removedIds.has(getId(s))),
    [sessions, removedIds],
  );

  /* Reset removedIds whenever the underlying sessions change (e.g. refetch). */
  useEffect(() => { setRemovedIds(new Set()); }, [sessions]);

  /* ── Filter by search first, then by effective-status chip. ────────────── */
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return live;
    const q = searchQuery.trim().toLowerCase();
    return live.filter((iv) => {
      const hay = `${iv.job_title || ''} ${iv.interview_name || ''} ${iv.company_name || iv.company || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [live, searchQuery]);

  const chipCounts = useMemo(() => {
    const c = { all: filtered.length, ready: 0, in_progress: 0, completed: 0, expired: 0 };
    filtered.forEach((iv) => {
      const e = effectiveStatus(iv);
    
      if (e === 'ready' || e === 'pending_document') c.ready++;
      else if (e === 'in_progress') c.in_progress++;
      else if (e === 'completed') c.completed++;
      else if (e === 'expired' || e === 'missed' || e === 'cancelled' || e === 'scheduled' || e === 'locked') c.expired++;
    });
    return c;
  }, [filtered]);

  const visible = useMemo(() => {
    if (view === 'all') return filtered;
    return filtered.filter((iv) => {
      const e = effectiveStatus(iv);
      if (view === 'expired') return ['expired','missed','cancelled','scheduled','locked'].includes(e);
      if (view === 'ready')   return e === 'ready' || e === 'pending_document';
      return e === view;
    });
  }, [filtered, view]);

  /* Sort within each view: soonest-due first for actionable buckets, most-
     recent-first for finished ones. */
  const sortedVisible = useMemo(() => {
    const arr = [...visible];
    if (view === 'completed' || view === 'expired') {
      arr.sort((a, b) => new Date(b.window_end || 0) - new Date(a.window_end || 0));
    } else {
      arr.sort((a, b) => new Date(a.window_end || 0) - new Date(b.window_end || 0));
    }
    return arr;
  }, [visible, view]);

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

  /* ── Selection / delete (completed & expired views) ────────────────────── */
  const isCompletedView = view === 'completed';
  const isExpiredView   = view === 'expired';
  const canManage       = isCompletedView || isExpiredView;

  const manageableIds = useMemo(
    () => (canManage ? sortedVisible.map(getId) : []),
    [canManage, sortedVisible],
  );

  const allSelected =
    manageableIds.length > 0 && manageableIds.every((id) => selectedIds.has(id));
  const someSelected =
    manageableIds.some((id) => selectedIds.has(id)) && !allSelected;

  const handleViewChange = (v) => {
    setView(v);
    setSelectedIds(new Set());
  };

  const clearSelection = () => setSelectedIds(new Set());

  const toggleSelect = (iv) => {
    const id = getId(iv);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(manageableIds));
  };

  const requestBulkDelete = () => {
    const items = sortedVisible.filter((iv) => selectedIds.has(getId(iv)));
    if (items.length === 0) return;
    setDeleteTarget({ type: 'bulk', items });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const ids = deleteTarget.items.map(getId);
      if (deleteTarget.type === 'bulk') await deleteSessions(ids);
      else                              await deleteSession(ids[0]);
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
      setToast({ severity: 'success', message: ids.length > 1 ? `${ids.length} interviews removed.` : 'Interview removed.' });
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to delete interview.';
      setStartError(msg);
    } finally {
      setDeleting(false);
    }
  };

  /* ── Start / resume — same navigation contract as the current page. ────── */
  const handleStart = (iv) => {
    setStartError(null);
    if (!canStart(iv)) {
      setToast({
        severity: 'info',
        message: isWindowExpired(iv)
          ? 'The submission window for this interview has closed.'
          : isBeforeWindow(iv)
            ? `This interview opens ${fmtDateTime(iv.window_start) ?? 'later'}.`
            : (iv.questions_count ?? 0) === 0
              ? 'Questions are still being prepared. Please check back shortly.'
              : `This interview is "${iv.status}".`,
      });
      return;
    }
    setStartingId(getId(iv));
    /* Give the button a beat to show its spinner, then navigate. */
    setTimeout(() => {
      navigate(`/jobseeker/smart-interviews/document/session/${iv.id}`);
    }, 60);
  };

  const hasManageable = manageableIds.length > 0;
  const selectedCount = selectedIds.size;

  return (
    <Box className="page-fade-in" sx={{
      p: { xs: 1.5, sm: 2, md: 3, lg: 4 },
      maxWidth: 1440, mx: 'auto', bgcolor: BRAND.bg, minHeight: '100vh',
      fontFamily: FONT,
      '& .MuiTypography-root, & .MuiButton-root, & .MuiChip-root, & .MuiInputBase-root, & .MuiMenuItem-root, & .MuiPaginationItem-root': {
        fontFamily: FONT,
      },
    }}>

      {/* ── Command header — same as AI Assessments ──────────────────────── */}
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
              Document Interviews
            </Typography>
            <Typography sx={{ color: BRAND.muted, fontSize: { xs: '0.82rem', sm: '0.9rem' }, fontWeight: 500, mt: 0.5 }}>
              <Box component="span" sx={{ color: BRAND.sageText, fontWeight: 700 }}>
                {loading ? '—' : `${live.length} ${live.length === 1 ? 'interview' : 'interviews'}`}
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

        {/* Row 3 — status chips + view toggle */}
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
                    {loading ? '—' : chipCounts[opt.value]}
                  </Box>
                </Box>
              );
            })}
          </Box>

          {/* Grid / list toggle */}
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



      {/* ── Floating selection bar ───────────────────────────────────────── */}
      {canManage && hasManageable && !loading && (
        <SelectionBar
          count={selectedCount}
          total={manageableIds.length}
          allSelected={allSelected}
          someSelected={someSelected}
          onSelectAll={toggleSelectAll}
          onClear={clearSelection}
          onRemove={requestBulkDelete}
          deleting={deleting}
          categoryLabel={isExpiredView ? "expired" : "completed"}
          noun="interview"
        />
      )}


      {/* ── Error banner ─────────────────────────────────────────────────── */}
      {(error || startError) && !loading && (
        <Alert
          severity="error" icon={<ErrorOutlined />}
          onClose={startError ? () => setStartError(null) : undefined}
          action={error ? <Button color="inherit" size="small" onClick={refetch}>Retry</Button> : undefined}
          sx={{ mb: 2, borderRadius: '12px' }}
        >
          {error || startError}
        </Alert>
      )}

      {/* ── Loading skeletons — mirror the Deadline Forward card shape ───── */}
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
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Card key={i} elevation={0} sx={{
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
              <Skeleton width="70%" height={16} sx={{ mt: 2 }} />
              <Skeleton variant="rounded" height={30} sx={{ mt: 1.5, borderRadius: '8px' }} />
              <Stack direction="row" spacing={1} sx={{ mt: 2, alignItems: 'center' }}>
                <Skeleton variant="rounded" width={70} height={22} sx={{ borderRadius: '999px' }} />
                <Skeleton variant="rounded" height={34} sx={{ borderRadius: '999px', flex: 1 }} />
              </Stack>
            </Card>
          ))}
        </Box>
      )}

      {/* ── Content ──────────────────────────────────────────────────────── */}
      {!loading && !error && (
        <>
          {sortedVisible.length === 0 ? (
            <Box sx={{
              textAlign: 'center', py: { xs: 5, sm: 7 }, px: 2,
              bgcolor: BRAND.surface, borderRadius: '16px',
              border: `1px dashed ${BRAND.borderStrong}`,
            }}>
              <Typography sx={{ mb: 1, color: BRAND.ink, fontWeight: 700, fontSize: { xs: '0.95rem', sm: '1.05rem' } }}>
                {searchQuery
                  ? 'No interviews match'
                  : view === 'completed'   ? 'No completed interviews yet'
                  : view === 'expired'     ? 'No expired interviews'
                  : view === 'in_progress' ? 'Nothing in progress'
                  : view === 'ready'       ? 'Nothing ready to start'
                  : 'No interviews assigned yet'}
              </Typography>
              <Typography sx={{ mb: searchQuery ? 2.5 : 0, color: BRAND.muted, fontSize: { xs: '0.78rem', sm: '0.875rem' } }}>
                {searchQuery
                  ? 'Try a different search or switch the status filter back to All.'
                  : view === 'completed'   ? 'Interviews you finish will appear here.'
                  : view === 'expired'     ? 'Interviews past their window will appear here.'
                  : view === 'in_progress' ? 'Interviews you start will appear here until submitted.'
                  : view === 'ready'       ? 'You\u2019ll see interviews here as their window opens.'
                  : 'When an employer schedules an interview for you it will appear here.'}
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
              {pagedVisible.map((iv) => {
                const id = getId(iv);
                return (
                  <Box key={id} sx={{ minWidth: 0, width: '100%' }}>
                    <InterviewCard
                      iv={iv}
                      viewMode={viewMode}
                      onStart={handleStart}
                      isStarting={startingId === id}
                      selectable={canManage}
                      selected={selectedIds.has(id)}
                      onToggleSelect={toggleSelect}
                      /* BUILD: 2026-08-14-doc-candidate-reschedule-v1 */
                      onRequestReschedule={(card) => setReschedDlg({ iv: card, reason: '' })}
                    />
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

      {/* ── Delete confirmation dialog ───────────────────────────────────── */}
      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => !deleting && setDeleteTarget(null)}
        slotProps={{ paper: { sx: { borderRadius: '16px', maxWidth: 420, fontFamily: FONT } } }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: BRAND.navy, pb: 1, fontFamily: FONT }}>
          {deleteTarget?.type === 'bulk'
            ? `Remove ${deleteTarget?.items.length} interview${deleteTarget?.items.length === 1 ? '' : 's'}?`
            : 'Remove this interview?'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: BRAND.muted, fontSize: '0.9rem', fontFamily: FONT }}>
            {deleteTarget?.type === 'single' && deleteTarget?.items[0] && (
              <>
                <strong>{deleteTarget.items[0].job_title || deleteTarget.items[0].interview_name || 'This interview'}</strong>{' '}
                will be hidden from your dashboard. Your results stay saved with the employer.
              </>
            )}
            {deleteTarget?.type === 'bulk' && (
              <>
                The selected {isExpiredView ? 'expired' : 'completed'} interviews will be hidden from your dashboard.
                Your results stay saved with the employer.
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
            {deleting ? 'Removing…' : 'Remove'}
          </Button>
        </DialogActions>
      </Dialog>

     {/* BUILD: 2026-08-14-doc-candidate-reschedule-v1 */}
      <Dialog open={!!reschedDlg} onClose={() => !reschedBusy && setReschedDlg(null)}
        maxWidth="xs" fullWidth
        slotProps={{ paper: { sx: { borderRadius: '16px', fontFamily: FONT } } }}>
        <DialogTitle sx={{ fontFamily: FONT, fontWeight: 800, fontSize: '1rem' }}>
          🔁 Request a reschedule
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontFamily: FONT, fontSize: '0.84rem',
            color: BRAND.muted, mb: 1.5 }}>
            {reschedDlg?.iv?.interview_name || 'This document interview'} — tell
            the employer why you need a new time. Only this round moves; your
            completed rounds are untouched.
          </Typography>
          <TextField
            autoFocus fullWidth multiline minRows={3}
            placeholder="e.g. I had a network outage during this window — could we shift it?"
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

      {/* ── Toast — same behaviour the old page used to explain "can't start" ─ */}
      <Snackbar
        open={!!toast}
        autoHideDuration={3500}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        {toast && (
          <Alert severity={toast.severity} onClose={() => setToast(null)} variant="filled" sx={{ fontFamily: FONT }}>
            {toast.message}
          </Alert>
        )}
      </Snackbar>
    </Box>
  );
};

export default DocumentBasedInterview;