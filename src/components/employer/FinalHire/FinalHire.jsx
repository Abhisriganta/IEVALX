import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Button, Stack, IconButton, Tooltip, Chip,
  CircularProgress, Card, Dialog, DialogContent, DialogContentText,
  DialogActions, TextField, InputAdornment, Paper, Avatar,
  Skeleton, Pagination, Select, MenuItem, Grow,
  ToggleButton, ToggleButtonGroup, Checkbox, Divider,
} from '@mui/material';
import {
  Search, RefreshOutlined, ClearRounded, ViewList, ViewModule,
  EmojiEvents, AttachMoney, Close, Phone, Email, VisibilityOutlined,
  Delete as DeleteOutline, CheckBoxOutlineBlank as CheckBoxOutlined,
  HelpOutlineOutlined, WorkOutlineRounded,
} from '@mui/icons-material';

import useFinalHire from '../../../hooks/employer/useFinalHire';

/* ── Brand tokens — exact AIAssessments system ──────────────────────── */
const FONT = "'Jost','DM Sans',sans-serif";

const B = {
  pine:       '#022124',
  pineHover:  '#0A3F42',
  sage:       '#7F9E7E',
  sageText:   '#5E815D',
  sageSoft:   '#EDF3EC',
  sageDark:   '#6C8B6B',
  border:     '#E7EAE3',
  borderS:    '#D8DDD4',
  muted:      '#55584F',
  faint:      '#7A7E76',
  ink:        '#101210',
  body:       '#2F332E',
  bg:         '#F6F8F3',
  surface:    '#FFFFFF',
  done:       '#3E6E3E',
  doneSoft:   '#EAF2E9',
  amber:      '#A35A2D',
  amberSoft:  '#F6ECDF',
  danger:     '#A63D2F',
  dangerSoft: '#FAEAE8',
};

/* ── Offer-status config — mapped to pine/sage palette ──────────────── */
const OFFER_CFG = {
  extended: { label: 'Hired',        color: B.amber,   bg: B.amberSoft, dot: B.amber },
  accepted: { label: 'Offer Accepted', color: '#3C5A78', bg: '#EAF0F6',   dot: '#3C5A78' },
  joined:   { label: 'Joined',         color: B.done,    bg: B.doneSoft,  dot: B.done },
  declined: { label: 'Declined',       color: B.danger,  bg: B.dangerSoft,dot: B.danger },
};

const STATUS_CHIPS = [
  { value: 'all',      label: 'All' },
  { value: 'extended', label: 'Hired' },
];

const CHIP_COLORS = {
  all:      { tint: B.pine,     soft: 'rgba(2,33,36,0.05)', ink: B.pine,     dot: B.pine },
  extended: { tint: B.amber,    soft: B.amberSoft,           ink: B.amber,    dot: B.amber },
  accepted: { tint: '#3C5A78',  soft: '#EAF0F6',             ink: '#3C5A78',  dot: '#3C5A78' },
  joined:   { tint: B.done,     soft: B.doneSoft,             ink: B.done,     dot: B.done },
  declined: { tint: B.danger,   soft: B.dangerSoft,           ink: B.danger,   dot: B.danger },
};

const FOLD_COLOR = {
  extended: { face: B.amber,   edge: B.amberSoft },
  accepted: { face: '#3C5A78', edge: '#EAF0F6' },
  joined:   { face: B.done,    edge: B.doneSoft },
  declined: { face: B.danger,  edge: B.dangerSoft },
};

const PAGE_SIZES = [5, 10, 25, 50, 'all'];

const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};
const fmtSalary = (min, max, cur = 'INR') => {
  const fmt = (n) => n == null ? null : new Intl.NumberFormat('en-IN', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(n);
  const lo = fmt(min), hi = fmt(max);
  if (lo && hi) return lo === hi ? lo : `${lo} – ${hi}`;
  return lo || hi || '—';
};
const scoreColor = (s) => s == null ? B.faint : s >= 8 ? B.done : s >= 6 ? B.amber : B.danger;

/* ── HireCard — dog-ear fold card (exact AIAssessments DNA) ──────────── */
function HireCard({ c, viewMode = 'grid', onDetail, onDelete, selectable, selected, onToggle }) {
  const oCfg   = OFFER_CFG[c.offer_status] || OFFER_CFG.extended;
  const fold   = FOLD_COLOR[c.offer_status] || FOLD_COLOR.extended;
  const sCol   = scoreColor(c.overall_cps);
  const initials = (c.full_name || 'H').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();

  const identity = (
    <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'center', minWidth: 0 }}>
      {selectable && (
        <Checkbox checked={selected} onChange={() => onToggle(c.record_id)}
          onClick={(e) => e.stopPropagation()} size="small"
          sx={{ p: 0.5, flexShrink: 0, color: B.borderS, '&.Mui-checked': { color: B.sage } }} />
      )}
      <Box sx={{
        position: 'relative', width: viewMode === 'list' ? 36 : 42, height: viewMode === 'list' ? 36 : 42,
        borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
        bgcolor: B.pine, color: B.sage,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700, fontSize: viewMode === 'list' ? '0.78rem' : '0.85rem', fontFamily: FONT,
      }}>
        {initials}
        {c.photo_url && (
          <Box component="img" src={c.photo_url} alt={c.full_name}
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
            sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', bgcolor: '#fff', display: 'block' }}
          />
        )}
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography noWrap title={c.full_name} sx={{ fontSize: viewMode === 'list' ? '0.92rem' : '0.98rem', fontWeight: 800, color: B.ink, lineHeight: 1.25, letterSpacing: '-0.01em' }}>
          {c.full_name}
        </Typography>
        <Typography noWrap sx={{ fontSize: '0.72rem', color: B.muted, fontWeight: 500, mt: 0.2 }}>
          {c.job_title}
        </Typography>
      </Box>
    </Box>
  );

  const statusPill = (
    <Box sx={{
      display: 'inline-flex', alignItems: 'center', flexShrink: 0,
      bgcolor: oCfg.bg, color: oCfg.color,
      px: 1, py: 0.4, borderRadius: '7px',
      fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.05em',
      textTransform: 'uppercase', whiteSpace: 'nowrap', lineHeight: 1.6,
      fontFamily: FONT,
    }}>
      {oCfg.label}
    </Box>
  );

  /* ── LIST VIEW ─────────────────────────────────────────────────────── */
  if (viewMode === 'list') {
    return (
      <Card elevation={0}
        onClick={() => selectable ? onToggle(c.record_id) : onDetail(c)}
        sx={{
          fontFamily: FONT, '& .MuiTypography-root': { fontFamily: FONT },
          borderRadius: '14px', bgcolor: B.surface,
          border: `1px solid ${selected ? B.sage : B.border}`,
          borderLeft: `4px solid ${fold.face}`,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          '&:hover': { borderColor: B.sage, borderLeftColor: fold.face, boxShadow: '0 6px 20px rgba(2,33,36,0.08)' },
        }}
      >
        <Box sx={{ display: { xs: 'none', md: 'grid' }, gridTemplateColumns: '2.2fr 1.1fr 1.2fr 0.9fr 80px', alignItems: 'center', px: 2.25, py: 1.6, gap: 2 }}>
          {identity}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
            <Tooltip title="CPS Score" arrow>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, cursor: 'help' }}>
                <HelpOutlineOutlined sx={{ fontSize: 14, color: B.faint }} />
                <Typography sx={{ fontSize: '0.76rem', color: sCol, fontWeight: 700 }}>{c.overall_cps ?? '—'}/10</Typography>
              </Box>
            </Tooltip>
            <Tooltip title="Experience" arrow>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, cursor: 'help' }}>
                <WorkOutlineRounded sx={{ fontSize: 14, color: B.faint }} />
                <Typography sx={{ fontSize: '0.76rem', color: B.muted, fontWeight: 500 }}>{c.experience_years ?? 0} yr</Typography>
              </Box>
            </Tooltip>
          </Box>
          <Typography noWrap sx={{ fontSize: '0.76rem', color: B.muted, fontWeight: 600 }}>
            Hired {fmtDate(c.hired_date)}
          </Typography>
          <Box>{statusPill}</Box>
          <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
            <Tooltip title="View details" arrow>
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); onDetail(c); }}
                sx={{ color: B.faint, border: `1px solid ${B.border}`, borderRadius: '9px', p: 0.6,
                  '&:hover': { bgcolor: B.sageSoft, color: B.pine, borderColor: B.sage } }}>
                <VisibilityOutlined sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete" arrow>
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); onDelete(c); }}
                sx={{ color: B.faint, border: `1px solid ${B.border}`, borderRadius: '9px', p: 0.6,
                  '&:hover': { color: B.danger, bgcolor: B.dangerSoft, borderColor: 'rgba(166,61,47,0.3)' } }}>
                <DeleteOutline sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>
        <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', p: 1.75, gap: 1.1 }}>
          {identity}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
            {statusPill}
            <Stack direction="row" spacing={0.5}>
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); onDetail(c); }}
                sx={{ color: B.faint, '&:hover': { color: B.pine } }}>
                <VisibilityOutlined sx={{ fontSize: 16 }} />
              </IconButton>
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); onDelete(c); }}
                sx={{ color: B.faint, '&:hover': { color: B.danger } }}>
                <DeleteOutline sx={{ fontSize: 16 }} />
              </IconButton>
            </Stack>
          </Box>
        </Box>
      </Card>
    );
  }

  /* ── GRID VIEW — dog-ear fold card ─────────────────────────────────── */
  return (
    <Card elevation={0}
      onClick={() => selectable ? onToggle(c.record_id) : onDetail(c)}
      sx={{
        position: 'relative', height: '100%',
        display: 'flex', flexDirection: 'column',
        borderRadius: '16px', bgcolor: B.surface, overflow: 'hidden',
        border: `1px solid ${selected ? B.sage : B.border}`,
        fontFamily: FONT, '& .MuiTypography-root': { fontFamily: FONT },
        boxShadow: selected
          ? `0 0 0 2px ${B.sageSoft}, 0 10px 26px rgba(2,33,36,0.08)`
          : '0 10px 26px rgba(2,33,36,0.06)',
        cursor: 'pointer',
        transition: 'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 22px 48px -18px rgba(2,33,36,0.16)',
          borderColor: B.sage,
        },
        '&:hover .dogear': { borderTopWidth: '44px', borderLeftWidth: '44px' },
      }}
    >
      {/* Dog-ear fold */}
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

      {selectable && (
        <Checkbox checked={selected} onChange={() => onToggle(c.record_id)}
          onClick={(e) => e.stopPropagation()} size="small"
          sx={{
            position: 'absolute', top: 6, left: 6, zIndex: 2, p: 0.5,
            color: B.borderS, '&.Mui-checked': { color: B.sage },
            bgcolor: 'rgba(255,255,255,0.85)', borderRadius: '8px',
            '&:hover': { bgcolor: B.sageSoft },
          }}
        />
      )}

      <Box sx={{ p: '17px 18px 18px', display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
        {/* Header: avatar + name + job */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.4, pr: 3.5, pl: selectable ? 3.5 : 0, minWidth: 0 }}>
          <Box sx={{
            position: 'relative', width: 42, height: 42, borderRadius: '50%',
            flexShrink: 0, overflow: 'hidden',
            bgcolor: B.pine, color: B.sage,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: '0.85rem', fontFamily: FONT,
          }}>
            {initials}
            {c.photo_url && (
              <Box component="img" src={c.photo_url} alt={c.full_name}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', bgcolor: '#fff', display: 'block' }}
              />
            )}
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography sx={{
              fontSize: '0.98rem', fontWeight: 800, color: B.ink, lineHeight: 1.25,
              letterSpacing: '-0.015em',
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              overflow: 'hidden', minHeight: '2.5em',
            }}>
              {c.full_name}
            </Typography>
            <Typography noWrap sx={{ fontSize: '0.72rem', color: B.muted, mt: 0.3, fontWeight: 500 }}>
              {c.job_title} · {c.experience_years ?? 0} yr exp
            </Typography>
          </Box>
        </Box>

        {/* Meta: CPS + salary */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mt: 1.75, mb: 1.5, flexWrap: 'wrap', rowGap: 0.4 }}>
          <Tooltip title={`CPS Score: ${c.overall_cps ?? '—'}/10`} arrow>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, cursor: 'help' }}>
              <HelpOutlineOutlined sx={{ fontSize: 14, color: B.faint }} />
              <Typography sx={{ fontSize: '0.76rem', color: sCol, fontWeight: 700 }}>{c.overall_cps ?? '—'}/10</Typography>
            </Box>
          </Tooltip>
          <Tooltip title="Offered Salary" arrow>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, cursor: 'help' }}>
              <Typography sx={{ fontSize: '0.76rem', color: B.muted, fontWeight: 500 }}>{fmtSalary(c.salary_min_month != null ? c.salary_min_month * 12 : null, c.salary_max_month != null ? c.salary_max_month * 12 : null, c.currency)}</Typography>
            </Box>
          </Tooltip>
        </Box>

        {/* Window line — hired date */}
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 0.75, mt: 'auto',
          py: 1.25,
          borderTop: `1px dashed ${B.border}`,
          borderBottom: `1px dashed ${B.border}`,
          mb: 1.5,
        }}>
          <Typography noWrap sx={{ fontSize: '0.73rem', fontWeight: 600, color: B.muted }}>
            Hired {fmtDate(c.hired_date)}
          </Typography>
        </Box>

        {/* Footer: status pill + view/delete actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          {statusPill}
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="View details" arrow>
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); onDetail(c); }}
                sx={{ color: B.faint, border: `1px solid ${B.border}`, borderRadius: '9px', p: 0.6,
                  '&:hover': { bgcolor: B.sageSoft, color: B.pine, borderColor: B.sage } }}>
                <VisibilityOutlined sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete" arrow>
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); onDelete(c); }}
                sx={{ color: B.faint, border: `1px solid ${B.border}`, borderRadius: '9px', p: 0.6,
                  '&:hover': { color: B.danger, bgcolor: B.dangerSoft, borderColor: 'rgba(166,61,47,0.3)' } }}>
                <DeleteOutline sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>
      </Box>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   FinalHire — page component (exact AIAssessments page structure)
   ═══════════════════════════════════════════════════════════════════════ */
const FinalHire = () => {
  const {
    hires, jobs, stats, loading, error,
    search, setSearch, jobFilter, setJobFilter,
    statusFilter, setStatusFilter, sortBy, setSortBy, refresh,
    selectionMode, setSelectionMode,
    selectedIds, setSelectedIds, toggleSelect, clearSelection,
    hiding, hideOne, hideSelected,
  } = useFinalHire();

  const [detailRow, setDetailRow]   = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [viewMode, setViewMode]     = useState('grid');
  const [page, setPage]             = useState(1);
  const [pageSize, setPageSize]     = useState(10);

  useEffect(() => { setPage(1); }, [search, jobFilter, statusFilter, sortBy, pageSize]);

  const effectiveSize = pageSize === 'all' ? Math.max(hires.length, 1) : pageSize;
  const totalPages = Math.max(1, Math.ceil(hires.length / effectiveSize));
  useEffect(() => { if (page > totalPages) setPage(1); }, [page, totalPages]);
  const pagedHires = useMemo(() => {
    const start = (page - 1) * effectiveSize;
    return hires.slice(start, start + effectiveSize);
  }, [hires, page, effectiveSize]);

  /* Chip counts per status */
  const chipCounts = useMemo(() => {
    const c = { all: hires.length, extended: 0, accepted: 0, joined: 0, declined: 0 };
    hires.forEach(h => { if (c[h.offer_status] !== undefined) c[h.offer_status]++; });
    return c;
  }, [hires]);


  const scoreColorFn = (s) => s == null ? B.faint : s >= 8 ? B.done : s >= 6 ? B.amber : B.danger;

  if (loading) return (
    <Box className="page-fade-in" sx={{ p: { xs: 1.5, sm: 2, md: 3, lg: 4 }, maxWidth: 1440, mx: 'auto', bgcolor: B.bg, minHeight: '100vh', fontFamily: FONT }}>
      <Paper elevation={0} sx={{ bgcolor: B.surface, border: `1px solid ${B.border}`, borderRadius: '16px', p: 3, mb: 2.5 }}>
        <Skeleton width="40%" height={36} sx={{ borderRadius: '8px' }} />
        <Skeleton width="30%" height={20} sx={{ mt: 1, borderRadius: '6px' }} />
      </Paper>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)', lg: 'repeat(4,1fr)' }, gap: 2 }}>
        {[0,1,2,3].map(i => (
          <Card key={i} elevation={0} sx={{ borderRadius: '16px', border: `1px solid ${B.border}`, p: 2.25 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Skeleton variant="circular" width={42} height={42} />
              <Box sx={{ flex: 1 }}><Skeleton width="80%" height={20} /><Skeleton width="55%" height={14} /></Box>
            </Stack>
            <Skeleton width="70%" height={16} sx={{ mt: 2 }} />
            <Skeleton variant="rounded" height={34} sx={{ mt: 1.5, borderRadius: '9px' }} />
          </Card>
        ))}
      </Box>
    </Box>
  );

  if (error) return (
    <Box sx={{ p: 4, textAlign: 'center', fontFamily: FONT }}>
      <Typography sx={{ color: B.danger, mb: 2, fontWeight: 700 }}>{error}</Typography>
      <Button startIcon={<RefreshOutlined />} onClick={refresh} variant="outlined"
        sx={{ borderRadius: '10px', textTransform: 'none', borderColor: B.border, color: B.pine, '&:hover': { bgcolor: B.sageSoft } }}>
        Try Again
      </Button>
    </Box>
  );

  return (
    <Box className="page-fade-in" sx={{
      p: { xs: 1.5, sm: 2, md: 3, lg: 4 },
      maxWidth: 1440, mx: 'auto', bgcolor: B.bg, minHeight: '100vh',
      fontFamily: FONT,
      '& .MuiTypography-root, & .MuiButton-root, & .MuiChip-root, & .MuiInputBase-root, & .MuiMenuItem-root, & .MuiPaginationItem-root': { fontFamily: FONT },
    }}>
      {/* ── Hero header — exact AIAssessments Paper ────────────────────── */}
      <Paper elevation={0} sx={{
        bgcolor: B.surface, border: `1px solid ${B.border}`,
        borderRadius: { xs: '14px', sm: '16px' },
        p: { xs: 2, sm: 2.5, md: 3 },
        mb: { xs: 2, md: 2.5 },
        boxShadow: '0 1px 2px rgba(16,18,16,0.04)',
      }}>
        {/* Row 1 — title + refresh */}
        <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5, mb: { xs: 2, md: 2.25 } }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography component="h1" sx={{
              fontWeight: 700, color: B.ink, letterSpacing: '-0.02em', lineHeight: 1.15,
              fontSize: { xs: '1.3rem', sm: '1.45rem', md: '1.6rem' },
            }}>
              Final Hire
            </Typography>
            <Typography sx={{ color: B.muted, fontSize: { xs: '0.82rem', sm: '0.9rem' }, fontWeight: 500, mt: 0.5 }}>
            </Typography>
          </Box>
          <Tooltip title="Refresh" arrow>
            <span>
              <IconButton onClick={refresh} size="small" sx={{
                color: B.muted, border: `1px solid ${B.borderS}`, borderRadius: '9px',
                '&:hover': { bgcolor: B.sageSoft, color: B.pine, borderColor: B.sage },
              }}>
                <RefreshOutlined sx={{ fontSize: 18 }} />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>

        {/* Row 2 — search (full width pill) + job filter + sort */}
        <Stack direction="row" spacing={1} sx={{ alignItems: 'stretch', flexWrap: 'wrap', gap: 1 }}>
          <TextField
            placeholder="Search by name, email, job, skill…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start"><Search sx={{ color: B.muted, fontSize: 20 }} /></InputAdornment>,
                endAdornment: search ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearch('')}
                      sx={{ color: B.muted, '&:hover': { color: B.ink, bgcolor: 'rgba(16,18,16,0.05)' } }}>
                      <ClearRounded sx={{ fontSize: 18 }} />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              },
            }}
            sx={{
              flex: '1 1 300px', minWidth: { xs: '100%', sm: 260 },
              '& .MuiOutlinedInput-root': {
                bgcolor: B.bg, borderRadius: '25px',
                fontSize: { xs: '0.88rem', sm: '0.92rem' },
                height: { xs: 46, md: 48 }, color: B.ink,
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                '& input::placeholder': { color: B.muted, opacity: 0.85 },
                '& fieldset': { borderColor: '#B0BEC5', borderWidth: '1.5px' },
                '&:hover fieldset': { borderColor: '#78909C', borderWidth: '2px' },
                '&.Mui-focused': { boxShadow: '0 6px 18px rgba(0,0,0,0.12)' },
                '&.Mui-focused fieldset': { borderColor: B.sage, borderWidth: '2px' },
              },
            }}
          />
          <Select value={jobFilter} onChange={(e) => setJobFilter(e.target.value)}
            size="small" displayEmpty
            sx={{
              bgcolor: B.bg, borderRadius: '25px', fontSize: '0.88rem', fontWeight: 700,
              height: { xs: 46, md: 48 }, minWidth: 160,
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)', color: B.ink,
              '& fieldset': { borderColor: '#B0BEC5', borderWidth: '1.5px' },
              '&:hover fieldset': { borderColor: '#78909C' },
              '&.Mui-focused fieldset': { borderColor: B.sage, borderWidth: '2px' },
            }}
          >
            <MenuItem value="all" sx={{ fontSize: '0.82rem', fontWeight: 600 }}>All Jobs</MenuItem>
            {jobs.map(j => <MenuItem key={j.id} value={j.id} sx={{ fontSize: '0.82rem' }}>{j.title}</MenuItem>)}
          </Select>
          <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
            size="small"
            sx={{
              bgcolor: B.bg, borderRadius: '25px', fontSize: '0.88rem', fontWeight: 700,
              height: { xs: 46, md: 48 }, minWidth: 160,
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)', color: B.ink,
              '& fieldset': { borderColor: '#B0BEC5', borderWidth: '1.5px' },
              '&:hover fieldset': { borderColor: '#78909C' },
              '&.Mui-focused fieldset': { borderColor: B.sage, borderWidth: '2px' },
            }}
          >
            <MenuItem value="recent" sx={{ fontSize: '0.82rem' }}>Recent Hires</MenuItem>
            <MenuItem value="joining" sx={{ fontSize: '0.82rem' }}>Joining Date</MenuItem>
            <MenuItem value="score" sx={{ fontSize: '0.82rem' }}>Highest Score</MenuItem>
            <MenuItem value="name" sx={{ fontSize: '0.82rem' }}>Name</MenuItem>
          </Select>
        </Stack>

        {/* Row 3 — status chips + view toggle */}
        <Stack direction="row" sx={{ alignItems: 'center', mt: { xs: 1.75, md: 2 }, gap: 1, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', mr: 'auto', minWidth: 0,
            flexWrap: { xs: 'nowrap', sm: 'wrap' },
            overflowX: { xs: 'auto', sm: 'visible' },
            '&::-webkit-scrollbar': { display: 'none' },
          }}>
            {STATUS_CHIPS.map((opt) => {
              const sel = statusFilter === opt.value;
              const cc = CHIP_COLORS[opt.value] ?? CHIP_COLORS.all;
              const isAll = opt.value === 'all';
              return (
                <Box key={opt.value} onClick={() => setStatusFilter(opt.value)}
                  role="button" tabIndex={0}
                  sx={{
                    cursor: 'pointer', userSelect: 'none',
                    display: 'inline-flex', alignItems: 'center', gap: 0.6,
                    px: 1.5, py: 0.65, borderRadius: 999, flexShrink: 0,
                    fontSize: '0.8rem', fontWeight: sel ? 700 : 600,
                    ...(sel
                      ? isAll
                        ? { bgcolor: B.pine, color: '#fff', border: `1px solid ${B.pine}` }
                        : { bgcolor: cc.soft, color: cc.ink, border: `1px solid ${cc.tint}` }
                      : { bgcolor: B.surface, color: B.muted, border: `1px solid ${B.borderS}` }),
                    transition: 'all 0.16s ease',
                    '&:hover': sel ? {} : { bgcolor: isAll ? B.bg : cc.soft, borderColor: isAll ? B.muted : cc.tint, color: isAll ? B.ink : cc.ink },
                  }}
                >
                  {!isAll && (
                    <Box component="span" sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: cc.dot, flexShrink: 0,
                      boxShadow: sel ? `0 0 0 2px ${cc.soft}` : 'none' }} />
                  )}
                  {opt.label}
                  <Box component="span" sx={{
                    fontSize: '0.68rem', fontWeight: 800, lineHeight: 1.6, px: 0.7, borderRadius: 999,
                    bgcolor: sel ? isAll ? 'rgba(255,255,255,0.22)' : B.surface : B.bg,
                    color: sel ? isAll ? '#fff' : cc.ink : B.muted,
                  }}>
                    {chipCounts[opt.value] ?? 0}
                  </Box>
                </Box>
              );
            })}
          </Box>
          <ToggleButtonGroup value={viewMode} exclusive onChange={(e, m) => m && setViewMode(m)}
            sx={{
              height: 38, flexShrink: 0, bgcolor: B.bg,
              border: `1px solid ${B.border}`, borderRadius: '10px', p: '3px',
              '& .MuiToggleButton-root': {
                border: 0, borderRadius: '7px !important', m: 0,
                color: B.muted, px: 1.25, height: 30,
                '&:hover': { bgcolor: 'rgba(16,18,16,0.04)' },
                '&.Mui-selected': { bgcolor: B.surface, color: B.pine, boxShadow: '0 1px 3px rgba(16,18,16,0.12)', '&:hover': { bgcolor: B.surface } },
              },
            }}
          >
            <ToggleButton value="grid"><ViewModule sx={{ fontSize: 18 }} /></ToggleButton>
            <ToggleButton value="list"><ViewList sx={{ fontSize: 18 }} /></ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Paper>

      {/* Select toggle — right-aligned below the hero box */}
      {!selectionMode && hires.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1.5 }}>
          <Button
            size="small"
            onClick={() => {
              setSelectionMode(true);
              setSelectedIds(new Set(hires.map(h => h.record_id)));
            }}
            startIcon={<CheckBoxOutlined sx={{ fontSize: 16 }} />}
            sx={{
              textTransform: 'none', fontWeight: 700, fontSize: '0.8rem',
              color: B.pine, bgcolor: B.surface,
              border: `1px solid ${B.borderS}`, borderRadius: '9px',
              px: 1.5, height: 34,
              '&:hover': { bgcolor: B.sageSoft, borderColor: B.sage },
            }}
          >
            Select All
          </Button>
        </Box>
      )}

      {/* ── Selection bar ──────────────────────────────────────────────── */}
      {selectionMode && (
        <Box sx={{ mb: 2, px: 2, py: 1.2, bgcolor: B.pine, color: '#fff', borderRadius: '12px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 4px 12px rgba(2,33,36,0.25)' }}>
          <Typography sx={{ fontSize: '0.85rem', fontWeight: 700 }}>{selectedIds.size} selected</Typography>
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="contained" disableElevation disabled={selectedIds.size === 0 || hiding}
              onClick={() => setConfirmDelete('bulk')}
              sx={{ bgcolor: B.danger, color: '#fff', textTransform: 'none', fontWeight: 700, borderRadius: '8px', '&:hover': { bgcolor: '#8C3225' } }}>
              Delete
            </Button>
            <Button size="small" variant="outlined" onClick={clearSelection}
              sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.4)', textTransform: 'none', fontWeight: 700, borderRadius: '8px' }}>
              Cancel
            </Button>
          </Stack>
        </Box>
      )}

      {/* ── Empty state ──────────────────────────────────────────────── */}
      {hires.length === 0 && (
        <Box sx={{ textAlign: 'center', py: { xs: 5, sm: 7 }, px: 2, bgcolor: B.surface, borderRadius: '16px', border: `1px dashed ${B.borderS}` }}>
          <EmojiEvents sx={{ fontSize: 44, color: B.border, mb: 1.5 }} />
          <Typography sx={{ mb: 1, color: B.ink, fontWeight: 700, fontSize: '1.05rem' }}>No hires yet</Typography>
          <Typography sx={{ color: B.muted, fontSize: '0.875rem' }}>Candidates you hire from the Pending tab will appear here.</Typography>
        </Box>
      )}

      {/* ── Hire cards ────────────────────────────────────────────────── */}
      {pagedHires.length > 0 && (
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: viewMode === 'grid' ? 'repeat(2,1fr)' : '1fr',
            md: viewMode === 'grid' ? 'repeat(3,1fr)' : '1fr',
            lg: viewMode === 'grid' ? 'repeat(4,1fr)' : '1fr',
          },
          gap: viewMode === 'grid' ? { xs: 1.5, sm: 1.75, md: 2 } : { xs: 1, sm: 1.25 },
        }}>
          {pagedHires.map(c => (
            <HireCard key={c.record_id} c={c} viewMode={viewMode}
              onDetail={setDetailRow} onDelete={(row) => setConfirmDelete(row)}
              selectable={selectionMode} selected={selectedIds.has(c.record_id)} onToggle={toggleSelect} />
          ))}
        </Box>
      )}

      {/* ── Pagination bar — exact AIAssessments ─────────────────────── */}
      {hires.length > 0 && (
        <Box sx={{
          mt: { xs: 3, sm: 3.5 }, mb: 4,
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: { xs: 1.5, sm: 2 },
        }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}>
            <Typography sx={{ fontSize: '0.82rem', color: B.muted, fontWeight: 500, whiteSpace: 'nowrap', lineHeight: '36px' }}>
              Showing{' '}
              <Box component="span" sx={{ color: B.ink, fontWeight: 700 }}>{(page-1)*effectiveSize+1}–{Math.min(page*effectiveSize, hires.length)}</Box>
              {' '}of{' '}
              <Box component="span" sx={{ color: B.ink, fontWeight: 700 }}>{hires.length}</Box>
              {' '}hires
            </Typography>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
              <Typography sx={{ fontSize: '0.82rem', color: B.muted, fontWeight: 500, lineHeight: '36px' }}>Show</Typography>
              <Select size="small" value={pageSize} onChange={(e) => { const v = e.target.value; setPageSize(v === 'all' ? 'all' : Number(v)); }}
                renderValue={v => v === 'all' ? 'All' : v}
                sx={{ fontSize: '0.82rem', fontWeight: 700, color: B.pine, bgcolor: B.bg, borderRadius: '10px', minWidth: 80, height: 36,
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: B.border },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: B.borderS } }}>
                {PAGE_SIZES.map(n => <MenuItem key={n} value={n} sx={{ fontSize: '0.82rem' }}>{n === 'all' ? 'All' : n}</MenuItem>)}
              </Select>
              <Typography sx={{ fontSize: '0.82rem', color: B.muted, fontWeight: 500, lineHeight: '36px' }}>per page</Typography>
            </Stack>
          </Stack>
          <Pagination count={totalPages} page={page} onChange={(_, v) => { setPage(v); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            shape="rounded" siblingCount={0}
            sx={{ '& .MuiPaginationItem-root': { fontWeight: 700, borderRadius: '9px', '&.Mui-selected': { bgcolor: B.pine, color: '#fff', '&:hover': { bgcolor: B.pineHover } } } }}
          />
        </Box>
      )}

      {/* ── Detail dialog ──────────────────────────────────────────────── */}
      <Dialog open={!!detailRow} onClose={() => setDetailRow(null)} maxWidth="sm" fullWidth TransitionComponent={Grow}
        PaperProps={{ sx: { borderRadius: '16px', overflow: 'hidden' } }}>
        {detailRow && (
          <Box>
            <Box sx={{ background: `linear-gradient(135deg, ${B.pine} 0%, #0A3F42 100%)`, px: 2.5, pt: 2.5, pb: 2, position: 'relative' }}>
              <IconButton size="small" onClick={() => setDetailRow(null)}
                sx={{ position: 'absolute', top: 10, right: 10, color: 'rgba(255,255,255,0.7)', '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.12)' } }}>
                <Close sx={{ fontSize: 18 }} />
              </IconButton>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar src={detailRow.photo_url} alt={detailRow.full_name}
                  sx={{ width: 52, height: 52, fontSize: '1.2rem', fontWeight: 700, bgcolor: B.doneSoft, color: B.done, border: '2px solid rgba(255,255,255,0.35)' }}>
                  {detailRow.full_name[0]?.toUpperCase()}
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '1rem', lineHeight: 1.2 }}>{detailRow.full_name}</Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.72rem', mt: 0.3 }}>{detailRow.job_title}</Typography>
                  <Stack direction="row" spacing={0.6} sx={{ mt: 0.8 }}>
                    <Chip label={(OFFER_CFG[detailRow.offer_status] || OFFER_CFG.extended).label} size="small"
                      sx={{ height: 20, fontSize: '0.62rem', fontWeight: 700, bgcolor: (OFFER_CFG[detailRow.offer_status] || OFFER_CFG.extended).bg, color: (OFFER_CFG[detailRow.offer_status] || OFFER_CFG.extended).color }} />
                  </Stack>
                </Box>
              </Stack>
            </Box>
            <Box sx={{ p: 3, fontFamily: FONT }}>
              {[
                { label: 'Hired', value: fmtDate(detailRow.hired_date) },
                { label: 'Offered Salary', value: `${fmtSalary(detailRow.salary_min_month != null ? detailRow.salary_min_month * 12 : null, detailRow.salary_max_month != null ? detailRow.salary_max_month * 12 : null, detailRow.currency)} /yr` },
                { label: 'Experience', value: detailRow.experience_years != null ? `${detailRow.experience_years} yr` : '—' },
                { label: 'CPS Score', value: detailRow.overall_cps != null ? `${detailRow.overall_cps}/10` : '—' },
              ].map(row => (
                <Stack key={row.label} direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', py: 1.2, borderBottom: `1px solid ${B.border}` }}>
                  <Typography sx={{ fontSize: '0.82rem', color: B.muted, fontWeight: 600 }}>{row.label}</Typography>
                  <Typography sx={{ fontSize: '0.82rem', color: B.ink, fontWeight: 700 }}>{row.value}</Typography>
                </Stack>
              ))}
              {detailRow.email && (
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 2 }}>
                  <Email sx={{ fontSize: 16, color: B.muted }} />
                  <Typography sx={{ fontSize: '0.85rem', color: B.ink }}>{detailRow.email}</Typography>
                </Stack>
              )}
              {detailRow.phone && (
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
                  <Phone sx={{ fontSize: 16, color: B.muted }} />
                  <Typography sx={{ fontSize: '0.85rem', color: B.ink }}>{detailRow.phone}</Typography>
                </Stack>
              )}
              {detailRow.rounds?.length > 0 && (
                <>
                  <Divider sx={{ my: 2, borderColor: B.border }} />
                  <Typography sx={{ fontSize: '0.68rem', color: B.faint, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1 }}>Round Performance</Typography>
                  {detailRow.rounds.map(r => {
                    const sVal = r.cgps_score ?? (r.doc_overall_pct != null ? r.doc_overall_pct / 10 : null);
                    return (
                      <Stack key={r.round_number} direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', py: 0.6 }}>
                        <Typography sx={{ fontSize: '0.82rem', color: B.body }}>R{r.round_number} · {r.name}</Typography>
                        <Typography sx={{ fontSize: '0.9rem', fontWeight: 800, color: scoreColorFn(sVal) }}>{sVal != null ? sVal.toFixed(1) : '—'}/10</Typography>
                      </Stack>
                    );
                  })}
                </>
              )}
            </Box>
          </Box>
        )}
      </Dialog>

      {/* ── Confirm delete dialog ──────────────────────────────────────── */}
      <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} maxWidth="xs" fullWidth TransitionComponent={Grow}
        PaperProps={{ sx: { borderRadius: '16px', overflow: 'hidden' } }}>
        <Box sx={{ background: `linear-gradient(135deg, ${B.danger} 0%, #6B2820 100%)`, px: 3, py: 2, display: 'flex', alignItems: 'center', gap: 1.3 }}>
          <Box sx={{ width: 38, height: 38, borderRadius: '11px', bgcolor: 'rgba(255,255,255,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DeleteOutline sx={{ color: '#fff', fontSize: 21 }} />
          </Box>
          <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '1rem', fontFamily: FONT }}>Confirm Delete</Typography>
        </Box>
        <DialogContent sx={{ pt: 2.5 }}>
          <DialogContentText sx={{ fontSize: '0.85rem', color: B.body, lineHeight: 1.6, fontFamily: FONT }}>
            {confirmDelete === 'bulk'
              ? <>Remove <strong>{selectedIds.size}</strong> hire{selectedIds.size === 1 ? '' : 's'} from your view?</>
              : <>Remove <strong>{confirmDelete?.full_name}</strong> from your view?</>}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmDelete(null)} sx={{ textTransform: 'none', color: B.muted, fontFamily: FONT }}>Cancel</Button>
          <Button variant="contained" disableElevation disabled={hiding}
            onClick={() => { const t = confirmDelete; setConfirmDelete(null); if (t === 'bulk') hideSelected(); else hideOne(t.record_id); }}
            sx={{ bgcolor: B.danger, '&:hover': { bgcolor: '#8C3225' }, textTransform: 'none', fontWeight: 700, borderRadius: '10px', px: 2.5, fontFamily: FONT }}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FinalHire;