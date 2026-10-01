

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Typography, Button, Stack, IconButton, Tooltip, Chip,
  CircularProgress, Card, Dialog, DialogTitle, Paper,
  DialogContent, DialogActions, TextField, InputAdornment,
  Skeleton, Pagination, Select, MenuItem,
  ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import {
  Description, Add, Edit, AutoAwesome, Delete, Search,
  RefreshOutlined, HelpOutlineOutlined, DescriptionOutlined,
  ClearRounded, ViewList, ViewModule,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';

import assessmentService from '../../../services/api/employer/assessmentService';
import { aiPaperService } from '../../../services/api/employer/aiGenerationService';

/* ── Brand tokens — exact mirror of AIAssessments.jsx ────────────────── */
const FONT = "'Jost','DM Sans',sans-serif";

const B = {
  pine:        '#022124',
  pineDark:    '#0A3A38',
  sage:        '#7F9E7E',
  sageText:    '#5E815D',
  sageSoft:    '#EDF3EC',
  sageDark:    '#6C8B6B',
  border:      '#E7EAE3',
  borderStrong:'#D8DDD4',
  muted:       '#55584F',
  faint:       '#7A7E76',
  ink:         '#101210',
  bg:          '#F6F8F3',
  surface:     '#FFFFFF',
  amber:       '#A35A2D',
  amberSoft:   '#FBF0E7',
  done:        '#3E6E3E',
  doneSoft:    '#EAF2E9',
  danger:      '#A63D2F',
  dangerSoft:  '#FAEAE8',
  dangerBdr:   '#E8C4BF',
};

/* ── Source / type pill config — mirrors STATUS_PILL + FOLD_COLOR ─────── */
const SOURCE_META = {
  ai:     {
    label: 'AI-Generated', color: B.sageText,  bg: B.sageSoft,
    fold:  { face: B.sage, edge: B.sageSoft },
    icon:  <AutoAwesome sx={{ fontSize: 16 }} />,
    iconBg: B.sageSoft, iconColor: B.sageText,
  },
  manual: {
    label: 'Manual',       color: B.pine,      bg: '#E8EFEF',
    fold:  { face: B.pine, edge: '#D4DFDF' },
    icon:  <Edit sx={{ fontSize: 16 }} />,
    iconBg: '#E8EFEF', iconColor: B.pine,
  },
};

const CHIP_COLORS = {
  all:    { tint: B.pine,     soft: 'rgba(2,33,36,0.05)',  ink: B.pine,     dot: B.pine },
  manual: { tint: B.pine,     soft: '#E8EFEF',             ink: B.pine,     dot: B.pine },
  ai:     { tint: B.sageText, soft: B.sageSoft,            ink: B.sageText, dot: B.sage },
};

const VIEW_CHIPS = [
  { value: 'all',    label: 'All Papers' },
  { value: 'manual', label: 'Manual' },
  { value: 'ai',     label: 'AI-Generated' },
];

const PAGE_SIZES = [5, 10, 25, 50, 'all'];
const DEFAULT_PAGE_SIZE = 10;

function extractArray(data, ...keys) {
  if (Array.isArray(data)) return data;
  for (const k of keys) {
    if (Array.isArray(data?.[k])) return data[k];
  }
  return [];
}

/* ── PaperCard — dog-ear fold card (exact AIAssessments card DNA) ─────── */
function PaperCard({ paper, onOpen, onDelete, isDeleting, viewMode = 'grid' }) {
  const name   = paper.paper_name || paper.name || 'Unnamed paper';
  const isAi   = paper.source === 'ai';
  const meta   = SOURCE_META[isAi ? 'ai' : 'manual'];
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'QB';
  if (viewMode === 'list') {
    const identity = (
      <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'center', minWidth: 0 }}>
        <Box sx={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
          bgcolor: B.pine, color: B.sage,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: '0.78rem', fontFamily: FONT,
        }}>
          {initials}
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography noWrap title={name} sx={{ fontSize: '0.92rem', fontWeight: 800, color: B.ink, lineHeight: 1.25, letterSpacing: '-0.01em' }}>
            {name}
          </Typography>
          <Typography noWrap sx={{ fontSize: '0.72rem', color: B.muted, fontWeight: 500, mt: 0.2 }}>
            {paper.description || (isAi ? 'AI-generated paper' : 'Manually created paper')}
          </Typography>
        </Box>
      </Box>
    );

    const sourcePill = (
      <Box sx={{
        display: 'inline-flex', alignItems: 'center', flexShrink: 0,
        bgcolor: meta.bg, color: meta.color,
        px: 1, py: 0.4, borderRadius: '7px',
        fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.05em',
        textTransform: 'uppercase', whiteSpace: 'nowrap', lineHeight: 1.6,
        fontFamily: FONT,
      }}>
        {meta.label}
      </Box>
    );

    const actions = (
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexShrink: 0 }}>
        <Tooltip title="Delete paper">
          <span>
            <IconButton size="small" disabled={isDeleting}
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              sx={{
                color: B.faint, border: `1px solid ${B.border}`,
                borderRadius: '9px', p: 0.6,
                '&:hover': { color: B.danger, bgcolor: B.dangerSoft, borderColor: B.dangerBdr },
              }}>
              {isDeleting
                ? <CircularProgress size={13} sx={{ color: B.danger }} />
                : <Delete sx={{ fontSize: 15 }} />}
            </IconButton>
          </span>
        </Tooltip>
        <Button
          disableElevation
          onClick={onOpen}
          sx={{
            textTransform: 'none', fontSize: '0.76rem', fontWeight: 700,
            borderRadius: '999px', px: 1.6, height: 32, minWidth: 0,
            lineHeight: 1, whiteSpace: 'nowrap',
            bgcolor: B.pine, color: '#fff',
            boxShadow: '0 2px 8px rgba(2,33,36,0.22)',
            '&:hover': { bgcolor: B.sage, boxShadow: '0 4px 12px rgba(127,158,126,0.4)' },
          }}
        >
          Open Paper
        </Button>
      </Stack>
    );

    return (
      <Card
        elevation={0}
        sx={{
          fontFamily: FONT,
          '& .MuiTypography-root, & .MuiButton-root': { fontFamily: FONT },
          borderRadius: '14px', bgcolor: B.surface,
          border: `1px solid ${B.border}`,
          borderLeft: `4px solid ${meta.fold.face}`,
          transition: 'all 0.2s ease',
          '&:hover': { borderColor: B.sage, borderLeftColor: meta.fold.face, boxShadow: '0 6px 20px rgba(2,33,36,0.08)' },
        }}
      >
        {/* Desktop ledger row (md+) */}
        <Box sx={{
          display: { xs: 'none', md: 'grid' },
          gridTemplateColumns: '2.4fr 1.3fr 1fr 175px',
          alignItems: 'center',
          px: 2.25, py: 1.6, gap: 2,
        }}>
          {identity}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0, flexWrap: 'wrap', rowGap: 0.4 }}>
            <Tooltip title={`${paper.total_questions ?? 0} question${(paper.total_questions ?? 0) === 1 ? '' : 's'}`} arrow>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, flexShrink: 0, cursor: 'help' }}>
                <HelpOutlineOutlined sx={{ fontSize: 14, color: B.faint }} />
                <Typography sx={{ fontSize: '0.76rem', color: B.muted, fontWeight: 500, whiteSpace: 'nowrap' }}>{paper.total_questions ?? 0} Qs</Typography>
              </Box>
            </Tooltip>
            <Tooltip title={`${paper.total_marks ?? 0} total marks`} arrow>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, flexShrink: 0, cursor: 'help' }}>
                <DescriptionOutlined sx={{ fontSize: 14, color: B.faint }} />
                <Typography sx={{ fontSize: '0.76rem', color: B.muted, fontWeight: 500, whiteSpace: 'nowrap' }}>{paper.total_marks ?? 0} pts</Typography>
              </Box>
            </Tooltip>
            {paper.assessment_id && (
              <Typography sx={{ fontSize: '0.72rem', color: B.faint, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
                #{paper.assessment_id}
              </Typography>
            )}
          </Box>

          <Box>{sourcePill}</Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>{actions}</Box>
        </Box>

        {/* Mobile stacked (xs–sm) */}
        <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', p: 1.75, gap: 1.1 }}>
          {identity}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
            {sourcePill}
            {actions}
          </Box>
        </Box>
      </Card>
    );
  }

  return (
    <Card
      elevation={0}
      sx={{
        position: 'relative', height: '100%',
        display: 'flex', flexDirection: 'column',
        borderRadius: '16px', bgcolor: B.surface, overflow: 'hidden',
        border: `1px solid ${B.border}`,
        fontFamily: FONT,
        '& .MuiTypography-root, & .MuiButton-root': { fontFamily: FONT },
        boxShadow: '0 10px 26px rgba(2,33,36,0.06)',
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
          borderLeft: `38px solid ${meta.fold.edge}`,
          borderTop: `38px solid ${meta.fold.face}`,
          borderRadius: '0 16px 0 0',
          transition: 'border-width .25s ease',
        }} />
        <Box sx={{
          position: 'absolute', top: 0, right: 0, width: 38, height: 38,
          background: 'linear-gradient(225deg, transparent 50%, rgba(2,33,36,0.16) 50%, transparent 64%)',
        }} />
      </Box>

      <Box sx={{ p: '17px 18px 18px', display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>

        {/* Header: circular initials + title + source */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.4, pr: 3.5, minWidth: 0 }}>
          <Box sx={{
            width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
            bgcolor: B.pine, color: B.sage,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: '0.85rem', fontFamily: FONT,
          }}>
            {initials}
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography sx={{
              fontSize: '0.98rem', fontWeight: 800, color: B.ink, lineHeight: 1.25,
              letterSpacing: '-0.015em',
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              overflow: 'hidden', minHeight: '2.5em',
            }}>
              {name}
            </Typography>
            <Typography noWrap sx={{ fontSize: '0.72rem', color: B.muted, mt: 0.3, fontWeight: 500 }}>
              {isAi ? 'AI-generated paper' : 'Manually created paper'}
            </Typography>
          </Box>
        </Box>

        {/* Description */}
        {paper.description && (
          <Typography sx={{
            mt: 1.5, fontSize: '0.76rem', lineHeight: 1.55, color: B.muted,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {paper.description}
          </Typography>
        )}

        {/* Meta chips — Qs · points · source */}
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 1.75, mb: 1.5 }}>
          <Tooltip title={`${paper.total_questions ?? 0} questions`} arrow>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, cursor: 'help' }}>
              <HelpOutlineOutlined sx={{ fontSize: 14, color: B.faint }} />
              <Typography sx={{ fontSize: '0.76rem', color: B.muted, fontWeight: 500 }}>
                {paper.total_questions ?? 0} Qs
              </Typography>
            </Box>
          </Tooltip>
          <Tooltip title={`${paper.total_marks ?? 0} total marks`} arrow>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, cursor: 'help' }}>
              <DescriptionOutlined sx={{ fontSize: 14, color: B.faint }} />
              <Typography sx={{ fontSize: '0.76rem', color: B.muted, fontWeight: 500 }}>
                {paper.total_marks ?? 0} pts
              </Typography>
            </Box>
          </Tooltip>
          {paper.assessment_id && (
            <Typography sx={{ fontSize: '0.72rem', color: B.faint, fontWeight: 600 }}>
              #{paper.assessment_id}
            </Typography>
          )}
        </Stack>

        {/* Window line — source type */}
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 0.75, mt: 'auto',
          py: 1.25,
          borderTop: `1px dashed ${B.border}`,
          borderBottom: `1px dashed ${B.border}`,
          mb: 1.5,
        }}>
          <Box sx={{
            width: 20, height: 20, borderRadius: '5px',
            bgcolor: meta.iconBg, color: meta.iconColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            '& svg': { fontSize: 12 },
          }}>
            {meta.icon}
          </Box>
          <Box sx={{
            display: 'inline-flex', alignItems: 'center', flexShrink: 0,
            bgcolor: meta.bg, color: meta.color,
            px: 1, py: 0.4, borderRadius: '7px',
            fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.05em',
            textTransform: 'uppercase', lineHeight: 1.6,
          }}>
            {meta.label}
          </Box>
        </Box>

        {/* Footer: Open + Delete */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Tooltip title="Delete paper">
            <span>
              <IconButton size="small" disabled={isDeleting}
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                sx={{
                  color: B.faint, border: `1px solid ${B.border}`,
                  borderRadius: '9px', p: 0.75,
                  '&:hover': { color: B.danger, bgcolor: B.dangerSoft, borderColor: B.dangerBdr },
                }}>
                {isDeleting
                  ? <CircularProgress size={14} sx={{ color: B.danger }} />
                  : <Delete sx={{ fontSize: 16 }} />}
              </IconButton>
            </span>
          </Tooltip>
          <Button
            disableElevation
            onClick={onOpen}
            sx={{
              textTransform: 'none', fontSize: '0.76rem', fontWeight: 700,
              borderRadius: '999px', px: 1.6, height: 32, minWidth: 0,
              bgcolor: B.pine, color: '#fff',
              boxShadow: '0 2px 8px rgba(2,33,36,0.22)',
              '&:hover': { bgcolor: B.sage, boxShadow: '0 4px 12px rgba(127,158,126,0.4)' },
            }}
          >
            Open Paper
          </Button>
        </Box>
      </Box>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   QuestionBank — page component
   ═══════════════════════════════════════════════════════════════════════ */
export default function QuestionBank() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const companyId = useMemo(
    () => JSON.parse(localStorage.getItem('ievalx_user') || '{}')?.company_id ?? null,
    [],
  );

  const [papers, setPapers]             = useState([]);
  const [loading, setLoading]           = useState(false);
  const [deletingId, setDeletingId]     = useState(null);
  const [choiceOpen, setChoiceOpen]     = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [filterType, setFilterType]     = useState('all');
  const [searchQuery, setSearchQuery]   = useState('');
  const [page, setPage]                 = useState(1);
  const [pageSize, setPageSize]         = useState(DEFAULT_PAGE_SIZE);
  const [viewMode, setViewMode]         = useState('grid');

 
  const fetchPapers = useCallback(async () => {
    if (!companyId) {
      enqueueSnackbar('No company ID found.', { variant: 'warning' });
      return;
    }
    setLoading(true);
    try {
      const [manualRes, aiRes] = await Promise.allSettled([
        assessmentService.listPapers(companyId),
        aiPaperService.list(companyId),
      ]);

      const manualList = manualRes.status === 'fulfilled'
        ? extractArray(manualRes.value?.data, 'papers', 'results', 'paper_list', 'data')
            .map((p) => ({ ...p, source: 'manual' }))
        : [];
      const aiList = aiRes.status === 'fulfilled'
        ? extractArray(aiRes.value?.data, 'papers', 'results', 'paper_list', 'data')
            .map((p) => ({ ...p, source: 'ai' }))
        : [];

      if (manualRes.status === 'rejected') {
        console.error('[QuestionBank] manual fetch failed:', manualRes.reason);
      }
      if (aiRes.status === 'rejected') {
        console.error('[QuestionBank] AI fetch failed:', aiRes.reason);
      }
      if (manualRes.status === 'rejected' && aiRes.status === 'rejected') {
        enqueueSnackbar('Failed to load papers.', { variant: 'error' });
      } else if (manualRes.status === 'rejected' || aiRes.status === 'rejected') {
        enqueueSnackbar(
          manualRes.status === 'rejected'
            ? 'Manual papers failed to load — showing AI papers only.'
            : 'AI papers failed to load — showing manual papers only.',
          { variant: 'warning' });
      }
      setPapers([...manualList, ...aiList]);
    } catch (err) {
      console.error('[QuestionBank] fetch failed:', err);
      enqueueSnackbar('Failed to load papers.', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [companyId, enqueueSnackbar]);

  useEffect(() => { fetchPapers(); }, [fetchPapers]);

  // ── Filtering ──────────────────────────────────────────────────────
  const filteredPapers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return papers.filter(p => {
      const matchType =
        filterType === 'all' ||
        (filterType === 'ai' ? p.source === 'ai' : p.source !== 'ai');
      const matchSearch = !q
        || (p.paper_name || '').toLowerCase().includes(q)
        || (p.description || '').toLowerCase().includes(q);
      return matchType && matchSearch;
    });
  }, [papers, filterType, searchQuery]);

  const chipCounts = useMemo(() => ({
    all:    papers.length,
    manual: papers.filter(p => p.source !== 'ai').length,
    ai:     papers.filter(p => p.source === 'ai').length,
  }), [papers]);

  // ── Pagination ─────────────────────────────────────────────────────
  const effectiveSize = pageSize === 'all' ? Math.max(filteredPapers.length, 1) : pageSize;
  const totalPages = Math.max(1, Math.ceil(filteredPapers.length / effectiveSize));
  useEffect(() => { setPage(1); }, [filterType, searchQuery, pageSize]);
  useEffect(() => { if (page > totalPages) setPage(1); }, [page, totalPages]);
  const pagedPapers = useMemo(() => {
    const start = (page - 1) * effectiveSize;
    return filteredPapers.slice(start, start + effectiveSize);
  }, [filteredPapers, page, effectiveSize]);

  // ── Delete ─────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    // 🔧 Composite id for the spinner — matches the key used in the paper list
    setDeletingId(`${deleteTarget.source}-${deleteTarget.id}`);
    try {
      if (deleteTarget.source === 'ai') {
        await aiPaperService.delete(deleteTarget.id, companyId);
      } else {
        await assessmentService.deletePaper(deleteTarget.id, companyId);
      }
      enqueueSnackbar(`"${deleteTarget.name}" deleted.`, { variant: 'success' });
      // 🔧 Match on BOTH id and source — manual and AI can share numeric IDs
      setPapers(prev => prev.filter(p => !(p.id === deleteTarget.id && p.source === deleteTarget.source)));
    } catch (err) {
      enqueueSnackbar(
        err?.response?.data?.error || err?.response?.data?.detail || 'Failed to delete paper.',
        { variant: 'error' },
      );
    } finally {
      setDeletingId(null);
      setDeleteTarget(null);
    }
  };

  // ── Modal ──────────────────────────────────────────────────────────
  const openChoiceModal = () => { setSelectedChoice(null); setChoiceOpen(true); };
  const handleBuild = () => {
    setChoiceOpen(false);
    navigate(selectedChoice === 'manual'
      ? '/employer/manual-test-builder?origin=question-bank'
      : '/employer/ai-assessment-builder?origin=question-bank'
    );
  };

  const dlgPaper = { sx: { borderRadius: '16px', border: `1px solid ${B.border}`, fontFamily: FONT } };

  return (
    <Box className="page-fade-in" sx={{
      p: { xs: 1.5, sm: 2, md: 3, lg: 4 },
      maxWidth: 1440, mx: 'auto', bgcolor: B.bg, minHeight: '100vh',
      fontFamily: FONT,
      '& .MuiTypography-root, & .MuiButton-root, & .MuiChip-root, & .MuiInputBase-root, & .MuiMenuItem-root, & .MuiPaginationItem-root': {
        fontFamily: FONT,
      },
    }}>

      {/* ── Hero header — Paper card (exact AIAssessments pattern) ──────── */}
      <Paper
        elevation={0}
        sx={{
          bgcolor: B.surface,
          border: `1px solid ${B.border}`,
          borderRadius: { xs: '14px', sm: '16px' },
          p: { xs: 2, sm: 2.5, md: 3 },
          mb: { xs: 2, md: 2.5 },
          boxShadow: '0 1px 2px rgba(16,18,16,0.04)',
        }}
      >
        {/* Row 1 — title + refresh + new paper */}
        <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5, mb: { xs: 2, md: 2.25 } }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography component="h1" sx={{
              fontWeight: 700, color: B.ink,
              letterSpacing: '-0.02em', lineHeight: 1.15,
              fontSize: { xs: '1.3rem', sm: '1.45rem', md: '1.6rem' },
            }}>
              Question Bank
            </Typography>
            <Typography sx={{ color: B.muted, fontSize: { xs: '0.82rem', sm: '0.9rem' }, fontWeight: 500, mt: 0.5 }}>
              <Box component="span" sx={{ color: B.sageText, fontWeight: 700 }}>
                {loading ? '—' : `${papers.length} ${papers.length === 1 ? 'paper' : 'papers'}`}
              </Box>
              {' '}in your library
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 0.5 }}>
            <Tooltip title="Refresh" arrow>
              <span>
                <IconButton
                  onClick={fetchPapers}
                  disabled={loading}
                  size="small"
                  sx={{
                    color: B.muted,
                    border: `1px solid ${B.borderStrong}`,
                    borderRadius: '9px',
                    '&:hover': { bgcolor: B.sageSoft, color: B.pine, borderColor: B.sage },
                  }}
                >
                  <RefreshOutlined sx={{ fontSize: 18 }} />
                </IconButton>
              </span>
            </Tooltip>
            <Button
              variant="contained" disableElevation
              startIcon={<Add sx={{ fontSize: 16 }} />}
              onClick={openChoiceModal}
              sx={{
                textTransform: 'none', fontSize: '0.85rem', fontWeight: 700,
                borderRadius: '10px', bgcolor: B.pine, px: 2.25, height: 38,
                boxShadow: '0 2px 8px rgba(2,33,36,0.18)',
                '&:hover': { bgcolor: B.sage, boxShadow: '0 4px 12px rgba(127,158,126,0.35)' },
              }}
            >
              New Paper
            </Button>
          </Stack>
        </Stack>

        {/* Row 2 — search (exact AIAssessments pill search bar) */}
        <TextField
          placeholder="Search papers by name or description…"
          value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: B.muted, fontSize: 20 }} />
                </InputAdornment>
              ),
              endAdornment: searchQuery ? (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                    sx={{ color: B.muted, '&:hover': { color: B.ink, bgcolor: 'rgba(16,18,16,0.05)' } }}
                  >
                    <ClearRounded sx={{ fontSize: 18 }} />
                  </IconButton>
                </InputAdornment>
              ) : null,
            },
          }}
          sx={{
            width: '100%',
            '& .MuiOutlinedInput-root': {
              bgcolor: B.bg,
              borderRadius: '25px',
              fontSize: { xs: '0.88rem', sm: '0.92rem' },
              height: { xs: 46, md: 48 },
              color: B.ink,
              fontFamily: FONT,
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              '& input::placeholder': { color: B.muted, opacity: 0.85 },
              '& fieldset': { borderColor: '#B0BEC5', borderWidth: '1.5px' },
              '&:hover fieldset': { borderColor: '#78909C', borderWidth: '2px' },
              '&.Mui-focused': { boxShadow: '0 6px 18px rgba(0,0,0,0.12)' },
              '&.Mui-focused fieldset': { borderColor: B.sage, borderWidth: '2px' },
            },
          }}
        />

        {/* Row 3 — filter chips (left) + view toggle (right) */}
        <Stack direction="row" sx={{ alignItems: 'center', mt: { xs: 1.75, md: 2 }, gap: 1, flexWrap: 'wrap' }}>
          <Box sx={{
            display: 'flex', gap: 0.75, alignItems: 'center',
            flexWrap: { xs: 'nowrap', sm: 'wrap' },
            overflowX: { xs: 'auto', sm: 'visible' },
            pb: { xs: 0.5, sm: 0 }, mr: 'auto', minWidth: 0,
            '&::-webkit-scrollbar': { display: 'none' },
          }}>
            {VIEW_CHIPS.map((opt) => {
              const selected = filterType === opt.value;
              const c = CHIP_COLORS[opt.value] ?? CHIP_COLORS.all;
              const isAll = opt.value === 'all';
              const count = chipCounts[opt.value] ?? 0;
              return (
                <Box
                  key={opt.value}
                  onClick={() => setFilterType(opt.value)}
                  role="button" tabIndex={0}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setFilterType(opt.value)}
                  sx={{
                    cursor: 'pointer', userSelect: 'none',
                    display: 'inline-flex', alignItems: 'center', gap: 0.6,
                    px: 1.5, py: 0.65, borderRadius: 999, flexShrink: 0,
                    fontSize: '0.8rem', fontWeight: selected ? 700 : 600,
                    ...(selected
                      ? isAll
                        ? { bgcolor: B.pine, color: '#fff', border: `1px solid ${B.pine}` }
                        : { bgcolor: c.soft, color: c.ink, border: `1px solid ${c.tint}` }
                      : { bgcolor: B.surface, color: B.muted, border: `1px solid ${B.borderStrong}` }),
                    transition: 'all 0.16s ease',
                    '&:hover': selected
                      ? {}
                      : {
                          bgcolor: isAll ? B.bg : c.soft,
                          borderColor: isAll ? B.muted : c.tint,
                          color: isAll ? B.ink : c.ink,
                        },
                  }}
                >
                  {/* State-colored dot — hidden for "All" */}
                {!isAll && !selected && (
                  <Box component="span" sx={{
                    width: 7, height: 7, borderRadius: '50%',
                    bgcolor: c.dot, flexShrink: 0,
                  }} />
                )}
                {!isAll && selected && (
                  <Box component="span" sx={{
                    width: 7, height: 7, borderRadius: '50%',
                    bgcolor: c.dot, flexShrink: 0,
                    boxShadow: `0 0 0 2px ${c.soft}`,
                  }} />
                )}
                {opt.label}
                <Box component="span" sx={{
                  fontSize: '0.68rem', fontWeight: 800, lineHeight: 1.6,
                  px: 0.7, borderRadius: 999,
                  bgcolor: selected
                    ? isAll ? 'rgba(255,255,255,0.22)' : B.surface
                    : B.bg,
                  color: selected
                    ? isAll ? '#fff' : c.ink
                    : B.muted,
                }}>
                  {loading ? '—' : count}
                </Box>
                </Box>
              );
            })}
          </Box>

          {/* Grid / List view toggle — exact AIAssessments pattern */}
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(e, m) => m && setViewMode(m)}
            sx={{
              height: 38, flexShrink: 0,
              bgcolor: B.bg,
              border: `1px solid ${B.border}`,
              borderRadius: '10px', p: '3px',
              '& .MuiToggleButton-root': {
                border: 0, borderRadius: '7px !important', m: 0,
                color: B.muted, px: 1.25, height: 30,
                '&:hover': { bgcolor: 'rgba(16,18,16,0.04)' },
                '&.Mui-selected': {
                  bgcolor: B.surface, color: B.pine,
                  boxShadow: '0 1px 3px rgba(16,18,16,0.12)',
                  '&:hover': { bgcolor: B.surface },
                },
              },
            }}
          >
            <ToggleButton value="grid" aria-label="grid view"><ViewModule sx={{ fontSize: 18 }} /></ToggleButton>
            <ToggleButton value="list" aria-label="list view"><ViewList sx={{ fontSize: 18 }} /></ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Paper>

      {/* ── Loading skeletons — mirror fold card shape ──────────────────── */}
      {loading && (
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))',
            md: 'repeat(3, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))',
          },
          gap: { xs: 1.5, sm: 1.75, md: 2 }, pb: 4,
        }}>
          {[0, 1, 2, 3].map((i) => (
            <Card key={i} elevation={0} sx={{
              borderRadius: '16px', border: `1px solid ${B.border}`, p: 2.25,
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

      {/* ── Empty: zero papers ──────────────────────────────────────────── */}
      {!loading && papers.length === 0 && (
        <Box sx={{
          textAlign: 'center', py: { xs: 5, sm: 7 }, px: 2,
          bgcolor: B.surface, borderRadius: '16px',
          border: `1px dashed ${B.borderStrong}`,
        }}>
          <Description sx={{ fontSize: 44, color: B.border, mb: 1.5 }} />
          <Typography sx={{ mb: 1, color: B.ink, fontWeight: 700, fontSize: { xs: '0.95rem', sm: '1.05rem' } }}>
            No papers yet
          </Typography>
          <Typography sx={{ mb: 2.5, color: B.muted, fontSize: { xs: '0.78rem', sm: '0.875rem' } }}>
            Create your first paper — manually or with AI.
          </Typography>
          <Button
            variant="contained" disableElevation
            startIcon={<Add sx={{ fontSize: 16 }} />}
            onClick={openChoiceModal}
            sx={{
              textTransform: 'none', fontWeight: 700, borderRadius: '10px',
              bgcolor: B.pine, px: 2.5,
              '&:hover': { bgcolor: B.sage },
            }}
          >
            New Paper
          </Button>
        </Box>
      )}

      {/* ── Empty: filter returns nothing ───────────────────────────────── */}
      {!loading && papers.length > 0 && filteredPapers.length === 0 && (
        <Box sx={{
          textAlign: 'center', py: { xs: 5, sm: 7 }, px: 2,
          bgcolor: B.surface, borderRadius: '16px',
          border: `1px dashed ${B.borderStrong}`,
        }}>
          <Search sx={{ fontSize: 36, color: B.border, mb: 1.5 }} />
          <Typography sx={{ mb: 1, color: B.ink, fontWeight: 700, fontSize: '0.95rem' }}>
            No papers match
          </Typography>
          <Typography sx={{ mb: 2.5, color: B.muted, fontSize: '0.78rem' }}>
            Try a different search or switch the filter back to All.
          </Typography>
          <Button
            variant="outlined"
            onClick={() => { setSearchQuery(''); setFilterType('all'); }}
            sx={{
              borderColor: B.borderStrong, color: B.ink,
              textTransform: 'none', fontWeight: 600, borderRadius: '10px',
              '&:hover': { borderColor: B.sage, bgcolor: B.sageSoft },
            }}
          >
            Clear search & filters
          </Button>
        </Box>
      )}

      {/* ── Paper cards — grid (fold) or list (ledger rows) ────────────── */}
      {!loading && pagedPapers.length > 0 && (
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
          {pagedPapers.map(paper => {
            // 🔧 Manual and AI papers live in separate tables and can share numeric IDs —
            // combine source+id to get a globally unique key for React and state.
            const uniqueKey = `${paper.source}-${paper.id}`;
            return (
              <Box key={uniqueKey} sx={{ minWidth: 0, width: '100%' }}>
                <PaperCard
                  paper={paper}
                  viewMode={viewMode}
                  isDeleting={deletingId === uniqueKey}
                  onOpen={() =>
                    navigate(
                      paper.source === 'ai'
                        ? `/employer/ai-assessment-builder?paperId=${paper.id}&origin=question-bank`
                        : `/employer/manual-test-builder?paperId=${paper.id}&origin=question-bank`
                    )
                  }
                  onDelete={() =>
                    setDeleteTarget({
                      id: paper.id,
                      source: paper.source,
                      name: paper.paper_name || paper.name || 'Unnamed',
                    })
                  }
                />
              </Box>
            );
          })}
        </Box>
      )}

      {/* ── Pagination bar — exact AIAssessments pattern ─────────────── */}
      {filteredPapers.length > 0 && !loading && (
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
              color: B.muted, fontWeight: 500, whiteSpace: 'nowrap',
            }}>
              Showing{' '}
              <Box component="span" sx={{ color: B.ink, fontWeight: 700 }}>
                {(page - 1) * effectiveSize + 1}–{Math.min(page * effectiveSize, filteredPapers.length)}
              </Box>
              {' '}of{' '}
              <Box component="span" sx={{ color: B.ink, fontWeight: 700 }}>
                {filteredPapers.length}
              </Box>
              {' '}papers
            </Typography>

            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
              <Typography sx={{ fontSize: { xs: '0.78rem', sm: '0.82rem' }, color: B.muted, fontWeight: 500 }}>
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
                  color: B.pine, bgcolor: B.bg,
                  borderRadius: '10px', minWidth: { xs: 76, sm: 80 },
                  height: { xs: 38, sm: 36 },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: B.border },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: B.borderStrong },
                }}
              >
                {PAGE_SIZES.map((n) => (
                  <MenuItem key={n} value={n} sx={{ fontSize: '0.82rem', fontFamily: FONT }}>
                    {n === 'all' ? 'All' : n}
                  </MenuItem>
                ))}
              </Select>
              <Typography sx={{ fontSize: { xs: '0.78rem', sm: '0.82rem' }, color: B.muted, fontWeight: 500 }}>
                per page
              </Typography>
            </Stack>
          </Stack>

          <Pagination
            count={totalPages}
            page={page}
            onChange={(_e, v) => { setPage(v); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            shape="rounded"
            siblingCount={0}
            sx={{
              '& .MuiPaginationItem-root': {
                fontWeight: 700, fontFamily: FONT, borderRadius: '9px',
                '&.Mui-selected': {
                  bgcolor: B.pine, color: '#fff',
                  '&:hover': { bgcolor: B.pineDark },
                },
              },
            }}
          />
        </Box>
      )}

      {/* ── DIALOG: New paper (choose type) ────────────────────────────── */}
      <Dialog open={choiceOpen} onClose={() => setChoiceOpen(false)}
        maxWidth="xs" fullWidth slotProps={{ paper: dlgPaper }}>
        <DialogTitle sx={{
          fontSize: '1.05rem', fontWeight: 700, color: B.ink, fontFamily: FONT,
          pb: 1, borderBottom: `1px solid ${B.border}`,
        }}>
          New Paper
        </DialogTitle>
        <DialogContent sx={{ pt: '20px !important' }}>
          <Typography sx={{ fontSize: '0.82rem', color: B.muted, mb: 2, fontFamily: FONT }}>
            How do you want to build it?
          </Typography>
          <Stack direction="row" spacing={1.5}>
            {/* Manual */}
            <Box onClick={() => setSelectedChoice('manual')} sx={{
              flex: 1, p: 2.25, cursor: 'pointer', borderRadius: '14px', transition: 'all 0.15s',
              border: `1.5px solid ${selectedChoice === 'manual' ? B.pine : B.border}`,
              bgcolor: selectedChoice === 'manual' ? '#E8EFEF' : 'transparent',
              '&:hover': { borderColor: B.pine, bgcolor: '#E8EFEF' },
            }}>
              <Box sx={{
                width: 40, height: 40, borderRadius: '10px', bgcolor: '#E8EFEF', mb: 1.25,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Edit sx={{ fontSize: 20, color: B.pine }} />
              </Box>
              <Typography sx={{ fontSize: '0.88rem', fontWeight: 700, color: B.ink, mb: 0.5, fontFamily: FONT }}>
                Manual
              </Typography>
              <Typography sx={{ fontSize: '0.74rem', color: B.muted, lineHeight: 1.5, fontFamily: FONT }}>
                Write each question yourself with full control over scoring and options.
              </Typography>
            </Box>

            {/* AI */}
            <Box onClick={() => setSelectedChoice('ai')} sx={{
              flex: 1, p: 2.25, cursor: 'pointer', borderRadius: '14px', transition: 'all 0.15s',
              border: `1.5px solid ${selectedChoice === 'ai' ? B.sageText : B.border}`,
              bgcolor: selectedChoice === 'ai' ? B.sageSoft : 'transparent',
              '&:hover': { borderColor: B.sageText, bgcolor: B.sageSoft },
            }}>
              <Box sx={{
                width: 40, height: 40, borderRadius: '10px', bgcolor: B.sageSoft, mb: 1.25,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <AutoAwesome sx={{ fontSize: 20, color: B.sageText }} />
              </Box>
              <Typography sx={{ fontSize: '0.88rem', fontWeight: 700, color: B.ink, mb: 0.5, fontFamily: FONT }}>
                AI-Generated
              </Typography>
              <Typography sx={{ fontSize: '0.74rem', color: B.muted, lineHeight: 1.5, fontFamily: FONT }}>
                Describe the topic and skill level — AI drafts the full question pool.
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1.5, borderTop: `1px solid ${B.border}`, gap: 1 }}>
          <Button onClick={() => setChoiceOpen(false)} sx={{
            textTransform: 'none', color: B.muted, fontSize: '0.85rem',
            borderRadius: '10px', border: `1px solid ${B.border}`, px: 2, fontFamily: FONT,
            '&:hover': { bgcolor: B.bg },
          }}>
            Cancel
          </Button>
          <Button variant="contained" disableElevation disabled={!selectedChoice} onClick={handleBuild} sx={{
            textTransform: 'none', fontSize: '0.85rem', fontWeight: 700,
            borderRadius: '10px', bgcolor: B.pine, px: 2.5, fontFamily: FONT,
            '&:hover': { bgcolor: B.sage },
            '&.Mui-disabled': { bgcolor: B.border, color: B.faint },
          }}>
            Build Paper
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── DIALOG: Delete confirm ──────────────────────────────────────── */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        maxWidth="xs" fullWidth slotProps={{ paper: dlgPaper }}>
        <DialogTitle sx={{
          fontSize: '1.05rem', fontWeight: 700, color: B.ink, fontFamily: FONT,
          pb: 1, borderBottom: `1px solid ${B.border}`,
        }}>
          Delete paper?
        </DialogTitle>
        <DialogContent sx={{ pt: '20px !important' }}>
          <Typography sx={{ fontSize: '0.85rem', color: B.muted, fontFamily: FONT }}>
            "{deleteTarget?.name}" will be removed from the library. This can't be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1.5, borderTop: `1px solid ${B.border}`, gap: 1 }}>
          <Button onClick={() => setDeleteTarget(null)} sx={{
            textTransform: 'none', color: B.muted, fontSize: '0.85rem',
            borderRadius: '10px', border: `1px solid ${B.border}`, px: 2, fontFamily: FONT,
            '&:hover': { bgcolor: B.bg },
          }}>
            Cancel
          </Button>
          <Button onClick={handleDelete} disabled={!!deletingId} variant="contained" disableElevation sx={{
            textTransform: 'none', fontSize: '0.85rem', fontWeight: 700,
            borderRadius: '10px', bgcolor: B.danger, px: 2.5, fontFamily: FONT,
            '&:hover': { bgcolor: '#8C3225' },
          }}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}