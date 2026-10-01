import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, Button, TextField, MenuItem, InputAdornment,
  ToggleButton, ToggleButtonGroup, Paper, Stack, IconButton, Tooltip,
  CircularProgress, Pagination, Select,
} from '@mui/material';
import {
  Search, ViewList, ViewModule, ClearRounded, BookmarkBorder, RefreshOutlined,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import jobService from '@/services/api/jobseeker/jobService';
import JobCard from '../FindJobs/JobCard';
import { ROUTES } from '@/constants';

/* ───────────────────────────────────────────────────────────────────────────
   Constants & brand tokens — mirrors FindJobs exactly
─────────────────────────────────────────────────────────────────────────── */
const FONT = "'Jost','DM Sans',sans-serif";

const BRAND = {
  navy:          '#022124',
  navyDark:      '#0A3A38',
  navySoft:      'rgba(127,158,126,0.10)',
  sage:          '#7F9E7E',
  sageText:      '#5E815D',
  sageSoft:      '#EDF3EC',
  border:        '#E7EAE3',
  borderStrong:  '#D8DDD4',
  muted:         '#55584F',
  ink:           '#101210',
  bg:            '#F6F8F3',
  surface:       '#FFFFFF',
};

const SORT_OPTIONS = [
  { value: 'recent',      label: 'Recently Saved' },
  { value: 'salary_desc', label: 'Salary: High to Low' },
  { value: 'salary_asc',  label: 'Salary: Low to High' },
  { value: 'deadline',    label: 'Deadline: Soonest' },
];

/* Same partition as FindJobs: All = Not Applied + Applied + Expired. */
const APPLIED_FILTER_OPTIONS = [
  { value: 'all',         label: 'All' },
  { value: 'not_applied', label: 'Not Applied' },
  { value: 'applied',     label: 'Applied' },
  { value: 'expired',     label: 'Expired' },
];

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50, 'all'];
const DEFAULT_PAGE_SIZE = 10;

/* Same deadline logic as FindJobs — expired = deadline passed. */
const isJobExpired = (job) => {
  const deadline = job?.applicationDeadline;
  if (!deadline) return false;
  const d = new Date(deadline);
  if (isNaN(d.getTime())) return false;
  const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  return endOfDay < new Date();
};

/**
 * Saved Jobs — the exact Find Jobs experience scoped to the candidate's
 * saved list. Backend (tbl_saved_job via GET /js/jobs/saved) is the source
 * of truth; jobService serves its local mirror when offline. Same Clean
 * Board hero (search / status chips / sort / view toggle), same JobCard
 * grid and list views, same pagination bar.
 */
const SavedJobs = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  // Instant paint from the local mirror, then the server list replaces it.
  const [jobs, setJobs]       = useState(() => jobService.getSavedJobsLocal());
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery]     = useState('');
  const [sortBy, setSortBy]               = useState('recent');
  const [viewMode, setViewMode]           = useState('grid');
  const [appliedFilter, setAppliedFilter] = useState('all');
  const [page, setPage]                   = useState(1);
  const [pageSize, setPageSize]           = useState(DEFAULT_PAGE_SIZE);

  const loadSaved = React.useCallback(async () => {
    setLoading(true);
    try {
      const list = await jobService.getSavedJobs();
      setJobs(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSaved(); }, [loadSaved]);

  const handleUnsave = async (jobId) => {
    // Optimistic removal — the card disappears immediately…
    const before = jobs;
    setJobs((prev) => prev.filter((j) => String(j.id) !== String(jobId)));
    try {
      await jobService.unsaveJob(jobId);
      enqueueSnackbar('Job removed from saved.', { variant: 'info' });
    } catch {
      // …and comes back if the backend rejects.
      setJobs(before);
      enqueueSnackbar('Could not remove — please try again.', { variant: 'error' });
    }
  };

  const openJob = (jobId) => navigate(`/jobseeker/job/${jobId}`);

  /* ── Classify (same source of truth as the cards) ─────────────────────── */
  const classified = useMemo(() => jobs.map((j) => ({
    job: j,
    applied: Boolean(jobService.isJobApplied(j.id)),
    expired: isJobExpired(j),
  })), [jobs]);

  const notAppliedCount = classified.filter((c) => !c.applied && !c.expired).length;
  const appliedCount    = classified.filter((c) => c.applied).length;
  const expiredCount    = classified.filter((c) => c.expired && !c.applied).length;
  const allCount        = classified.length;

  /* ── Search (live, client-side) + status toggle + sort ────────────────── */
  const displayJobs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    let list = classified.filter((c) => {
      if (appliedFilter === 'not_applied' && (c.applied || c.expired)) return false;
      if (appliedFilter === 'applied'     && !c.applied)               return false;
      if (appliedFilter === 'expired'     && (!c.expired || c.applied)) return false;
      if (!q) return true;
      const j = c.job;
      const hay = [
        j.jobTitle, j.companyName, j.jobLocation, j.jobCity,
        ...(Array.isArray(j.skills) ? j.skills : []),
      ].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    }).map((c) => c.job);

    const salary = (j) => Number(j.salaryMax ?? j.salaryMin ?? 0);
    const deadlineMs = (j) => {
      const d = j.applicationDeadline ? new Date(j.applicationDeadline) : null;
      return d && !isNaN(d.getTime()) ? d.getTime() : Infinity;
    };
    if (sortBy === 'salary_desc') list = [...list].sort((a, b) => salary(b) - salary(a));
    if (sortBy === 'salary_asc')  list = [...list].sort((a, b) => salary(a) - salary(b));
    if (sortBy === 'deadline')    list = [...list].sort((a, b) => deadlineMs(a) - deadlineMs(b));
    // 'recent' keeps the server order (saved_at DESC).
    return list;
  }, [classified, searchQuery, appliedFilter, sortBy]);

  /* ── Pagination (derived from displayJobs — same pattern as FindJobs) ── */
  useEffect(() => { setPage(1); }, [searchQuery, appliedFilter, sortBy, pageSize]);
  const effectivePageSize = pageSize === 'all' ? Math.max(displayJobs.length, 1) : pageSize;
  const pageCount   = Math.max(1, Math.ceil(displayJobs.length / effectivePageSize));
  const currentPage = Math.min(page, pageCount);
  const paginatedJobs = useMemo(() => {
    const start = (currentPage - 1) * effectivePageSize;
    return displayJobs.slice(start, start + effectivePageSize);
  }, [displayJobs, currentPage, effectivePageSize]);

  const hasSaved = jobs.length > 0;

  return (
    <Box className="page-fade-in" sx={{
      p: { xs: 1.5, sm: 2, md: 3, lg: 4 },
      maxWidth: 1440, mx: 'auto', bgcolor: BRAND.bg, minHeight: '100vh',
      fontFamily: FONT,
      '& .MuiTypography-root, & .MuiButton-root, & .MuiToggleButton-root, & .MuiChip-root, & .MuiInputBase-root, & .MuiMenuItem-root, & .MuiPaginationItem-root': {
        fontFamily: FONT,
      },
    }}>
      {/* ── Clean Board · light command header — same as Find Jobs ─────── */}
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
              Saved Jobs
            </Typography>
            <Typography sx={{ color: BRAND.muted, fontSize: { xs: '0.82rem', sm: '0.9rem' }, fontWeight: 500, mt: 0.5 }}>
              <Box component="span" sx={{ color: BRAND.sageText, fontWeight: 700 }}>
                {jobs.length} saved {jobs.length === 1 ? 'position' : 'positions'}
              </Box>
              {' '}— apply any time before the deadline
            </Typography>
          </Box>
          <Tooltip title="Refresh" arrow>
            <span>
              <IconButton
                onClick={loadSaved}
                disabled={loading}
                size="small"
                sx={{
                  color: BRAND.muted, flexShrink: 0, mt: 0.5,
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

        {/* Row 2 — search + Search button */}
        <Stack direction="row" spacing={1} sx={{ alignItems: 'stretch', flexWrap: 'wrap', gap: 1 }}>
          <TextField
            placeholder="Search by job title, skills, or company"
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

        
        </Stack>

        {/* Row 3 — status pills (left) + sort & view toggle (right) */}
        <Stack
          direction="row"
         
          sx={{ alignItems: 'center', mt: { xs: 1.75, md: 2 }, gap: 1, flexWrap: 'wrap' }}
        >
          <Box sx={{
            display: 'flex', gap: 0.75, alignItems: 'center',
            flexWrap: { xs: 'nowrap', sm: 'wrap' },
            overflowX: { xs: 'auto', sm: 'visible' },
            pb: { xs: 0.5, sm: 0 }, mr: 'auto',
            '&::-webkit-scrollbar': { display: 'none' },
          }}>
            {APPLIED_FILTER_OPTIONS.map((opt) => {
              const chipCount =
                opt.value === 'all'         ? allCount :
                opt.value === 'not_applied' ? notAppliedCount :
                opt.value === 'applied'     ? appliedCount : expiredCount;
              const selected = appliedFilter === opt.value;
              return (
                <Box
                  key={opt.value}
                  onClick={() => setAppliedFilter(opt.value)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setAppliedFilter(opt.value)}
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
                    {chipCount}
                  </Box>
                </Box>
              );
            })}
          </Box>

          {/* Sort */}
          <TextField
            select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            sx={{
              minWidth: 170, flexShrink: 0,
              '& .MuiOutlinedInput-root': {
                bgcolor: BRAND.surface,
                borderRadius: '10px',
                fontSize: '0.82rem',
                height: 38,
                color: BRAND.ink,
                fontFamily: FONT,
                '& fieldset': { borderColor: BRAND.borderStrong },
                '&:hover fieldset': { borderColor: BRAND.muted },
                '&.Mui-focused fieldset': { borderColor: BRAND.sage, borderWidth: 1.5 },
                '& .MuiSvgIcon-root': { color: BRAND.muted },
              },
            }}
          >
            {SORT_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value} sx={{ fontSize: '0.85rem', fontFamily: FONT }}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>

          {/* View toggle */}
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(e, newMode) => newMode && setViewMode(newMode)}
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

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      {loading && !hasSaved ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: { xs: 6, md: 10 } }}>
          <CircularProgress sx={{ color: BRAND.navy }} thickness={3.5} size={34} />
        </Box>
      ) : !hasSaved ? (
        /* Empty ledger — nothing saved at all */
        <Box sx={{
          textAlign: 'center',
          py: { xs: 5, sm: 7, md: 10 }, px: { xs: 2, sm: 3, md: 4 },
          bgcolor: BRAND.surface, borderRadius: '16px',
          border: `1px solid ${BRAND.border}`,
        }}>
          <BookmarkBorder sx={{ fontSize: { xs: 36, sm: 42, md: 48 }, color: '#D8DDD4', mb: 2 }} />
          <Typography sx={{ mb: 1, color: BRAND.ink, fontWeight: 700, fontSize: { xs: '0.95rem', sm: '1.1rem' } }}>
            No saved jobs yet
          </Typography>
          <Typography sx={{
            mb: 3, color: BRAND.muted, fontSize: { xs: '0.78rem', sm: '0.875rem' },
            maxWidth: 380, mx: 'auto',
          }}>
            Tap the bookmark on any job in Find Jobs — it will show up here.
          </Typography>
          <Button
            variant="contained" disableElevation
            onClick={() => navigate(ROUTES.JS_FIND_JOBS)}
            sx={{
              bgcolor: BRAND.navy, '&:hover': { bgcolor: BRAND.navyDark },
              borderRadius: '10px', fontWeight: 700, textTransform: 'none',
              fontSize: { xs: '0.82rem', md: '0.875rem' },
              px: { xs: 2.5, md: 3.5 }, py: { xs: '9px', md: '10px' },
            }}
          >
            Browse Jobs
          </Button>
        </Box>
      ) : displayJobs.length === 0 ? (
        /* Saved jobs exist, but the search / status toggle filtered them all out */
        <Box sx={{
          textAlign: 'center',
          py: { xs: 5, sm: 7 }, px: 2,
          bgcolor: BRAND.surface, borderRadius: '16px',
          border: `1px dashed ${BRAND.borderStrong}`,
        }}>
          <Typography sx={{ mb: 1, color: BRAND.ink, fontWeight: 700, fontSize: { xs: '0.95rem', sm: '1.05rem' } }}>
            No saved jobs match
          </Typography>
          <Typography sx={{ mb: 2.5, color: BRAND.muted, fontSize: { xs: '0.78rem', sm: '0.875rem' } }}>
            Try a different search or switch the status filter back to All.
          </Typography>
          <Button
            variant="outlined"
            onClick={() => { setSearchQuery(''); setAppliedFilter('all'); }}
            sx={{
              borderColor: BRAND.borderStrong, color: BRAND.ink,
              textTransform: 'none', fontWeight: 600, borderRadius: '10px',
              '&:hover': { borderColor: BRAND.sage, bgcolor: BRAND.sageSoft },
            }}
          >
            Clear search & filters
          </Button>
        </Box>
      ) : (
        <>
          {/* Cards — same grid / list as Find Jobs */}
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: viewMode === 'grid' ? 'repeat(2, minmax(0, 1fr))' : '1fr',
              md: viewMode === 'grid' ? 'repeat(3, minmax(0, 1fr))' : '1fr',
              lg: viewMode === 'grid' ? 'repeat(4, minmax(0, 1fr))' : '1fr',
            },
            gap: { xs: 1.5, sm: 1.75, md: 2 },
            width: '100%',
          }}>
            {paginatedJobs.map((job) => (
              <Box key={job.id} sx={{ minWidth: 0, width: '100%' }}>
                <JobCard
                  job={job}
                  viewMode={viewMode}
                  onClick={() => openJob(job.id)}
                  appliedLabel={jobService.getAppliedLabel(job.id)}
                  isExpired={isJobExpired(job)}
                  isSaved
                  onSave={() => handleUnsave(job.id)}
                />
              </Box>
            ))}
          </Box>

          {/* Pagination bar — same as Find Jobs */}
          <Box sx={{
            mt: { xs: 3, sm: 3.5, md: 4 },
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
                  {(currentPage - 1) * effectivePageSize + 1}–{Math.min(currentPage * effectivePageSize, displayJobs.length)}
                </Box>
                {' '}of{' '}
                <Box component="span" sx={{ color: BRAND.ink, fontWeight: 700 }}>
                  {displayJobs.length}
                </Box>
                {' '}saved
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
              count={pageCount}
              page={currentPage}
              onChange={(e, v) => setPage(v)}
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
        </>
      )}
    </Box>
  );
};

export default SavedJobs;