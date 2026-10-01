import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, TextField, MenuItem, InputAdornment,
  ToggleButton, ToggleButtonGroup, Drawer, Slider,
  Button, Typography, Chip, Alert, CircularProgress,
  Paper, Divider, Stack, IconButton, Badge,
  Pagination, Select, // 🔧 pagination + page-size selector
  Tooltip,
} from '@mui/material';
import {
  Search, FilterList, ViewList, ViewModule,
  Close, TuneRounded, WorkOutlineRounded,
  LocationOnOutlined, AccessTimeOutlined, PaymentsOutlined,
  WorkHistoryOutlined, ArrowForwardRounded, ClearRounded,
  RefreshOutlined,
} from '@mui/icons-material';
import { useJobs } from '@/hooks/jobseeker/useJobs';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import useDebounce from '@/hooks/useDebounce';
import jobService from '@/services/api/jobseeker/jobService';
import JobCard from './JobCard';

/* ───────────────────────────────────────────────────────────────────────────
   Constants & brand tokens (module-level — no re-creation per render)
─────────────────────────────────────────────────────────────────────────── */
const WORK_MODES = ['Remote', 'Hybrid', 'On-Site'];
const JOB_TYPES  = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance'];
const SHIFTS = [
  { value: 'DAY',        label: 'Day' },
  { value: 'NIGHT',      label: 'Night' },
  { value: 'ROTATIONAL', label: 'Rotational' },
];
const SORT_OPTIONS = [
  { value: 'newest',      label: 'Newest First' },
  { value: 'deadline',    label: 'Deadline' },
  { value: 'salary-high', label: 'Highest Salary' },
  { value: 'salary-low',  label: 'Lowest Salary' },
];


const APPLIED_FILTER_OPTIONS = [
  { value: 'all',         label: 'All' },
  { value: 'not_applied', label: 'Not Applied' },
  { value: 'applied',     label: 'Applied' },
  { value: 'expired',     label: 'Expired' },
];


const isJobExpired = (job) => {
  const deadline = job?.applicationDeadline;
  if (!deadline) return false;
  const d = new Date(deadline);
  if (isNaN(d.getTime())) return false;
  const endOfDeadlineDay = new Date(
    d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999,
  );
  return endOfDeadlineDay < new Date();
};

// 🔧 page size options (user-selectable, client-side pagination)
const PAGE_SIZE_OPTIONS = [5, 10, 25, 50, 'all'];
const DEFAULT_PAGE_SIZE = 10;

const FONT = "'Jost','DM Sans',sans-serif";

/* Landing-page palette — pine authority on cream */
const BRAND = {
  navy:          '#022124',                  // pine — buttons, active, titles
  navyDark:      '#0A3A38',                  // pine hover
  navySoft:      'rgba(127,158,126,0.10)',   // sage tint
  navySoftHover: 'rgba(127,158,126,0.18)',
  sage:          '#7F9E7E',
  sageDark:      '#6C8B6B',
  sageText:      '#5E815D',                  // sage for TEXT on light
  sageSoft:      '#EDF3EC',
  border:        '#E7EAE3',
  borderStrong:  '#D8DDD4',
  muted:         '#55584F',
  ink:           '#101210',
  bg:            '#F6F8F3',                  // cream
  surface:       '#FFFFFF',
};

const sliderSx = {
  color: BRAND.sage,
  '& .MuiSlider-thumb': {
    width: 18, height: 18,
    border: `2px solid #fff`,
    boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
    '&:hover, &.Mui-focusVisible': { boxShadow: `0 0 0 8px ${BRAND.navySoft}` },
  },
  '& .MuiSlider-rail':  { color: BRAND.border, opacity: 1, height: 4 },
  '& .MuiSlider-track': { height: 4 },
};

const DrawerSection = ({ icon, title, children, last }) => (
  <Box sx={{ mb: last ? 0 : 3.5 }}>
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.75 }}>
      <Box sx={{
        width: 28, height: 28, borderRadius: 1,
        bgcolor: BRAND.navySoft, color: BRAND.navy,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {icon}
      </Box>
      <Typography sx={{
        fontWeight: 600, fontSize: '0.875rem', color: BRAND.ink,
        letterSpacing: '-0.005em',
      }}>
        {title}
      </Typography>
    </Stack>
    {children}
  </Box>
);

/* ─────────────────────────────────────────────────────────────────────────── */
const FindJobs = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    jobs,
    allJobs,
    loading,
    error,
    totalResults,
    fetchAllJobs,
    applyFilters,
    applySorting,
    calculateSkillMatch,
  } = useJobs();

  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    city: '',
    jobType: [],
    workMode: [],
    shift: [],
    salaryRange: [0, 100],
    experienceRange: [0, 20],
  });
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('grid');
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // 🔧 CHANGE 3/7 — status toggle state ('all' | 'not_applied' | 'applied' | 'expired')
  const [appliedFilter, setAppliedFilter] = useState('all');

  
  const [savedIds, setSavedIds] = useState(
    () => new Set(jobService.getSavedJobsLocal().map((j) => String(j.id))),
  );
  useEffect(() => {
    let cancelled = false;
    jobService.getSavedJobs().then((list) => {
      if (!cancelled) setSavedIds(new Set(list.map((j) => String(j.id))));
    }).catch(() => { /* offline — local mirror already seeded state */ });
    return () => { cancelled = true; };
  }, []);
  const handleToggleSave = async (job) => {
    const key = String(job.id);
    const wasSaved = savedIds.has(key);
    // Optimistic flip for instant bookmark feedback…
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (wasSaved) next.delete(key); else next.add(key);
      return next;
    });
    try {
      await jobService.toggleSaveJob(job);
    } catch {
      // …rolled back if the backend rejects (session expired, network down).
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (wasSaved) next.add(key); else next.delete(key);
        return next;
      });
    }
  };

  // 🔧 CHANGE 2/4 — current page + user-selectable page size (client-side pagination)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  /* 🔧 Local-only draft state for sliders during drag.
     onChange writes to draft (cheap); onChangeCommitted writes to filters (once on release). */
  const [salaryDraft, setSalaryDraft] = useState(filters.salaryRange);
  const [expDraft,    setExpDraft]    = useState(filters.experienceRange);

  /* Re-sync drafts when filters change externally (Reset all, drawer re-open). */
  useEffect(() => { setSalaryDraft(filters.salaryRange); }, [filters.salaryRange]);
  useEffect(() => { setExpDraft(filters.experienceRange); }, [filters.experienceRange]);


  const debouncedQuery = useDebounce(searchQuery, 300);
  const didMountRef = React.useRef(false);

  /* Initial load: pull the full job list once → this is the master list that
     all client-side searching & filtering runs against. */
  const handleRefreshJobs = async () => {
    try {
      await fetchAllJobs();
      setLoadError(null);
    } catch (err) {
      console.error('Failed to load jobs:', err);
      setLoadError('Failed to load jobs. Please refresh the page.');
    }
  };

  useEffect(() => {
    handleRefreshJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    applyFilters({ query: debouncedQuery.trim() });
  }, [debouncedQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = () => {
    try {
      applyFilters({ query: searchQuery.trim() });
      setLoadError(null);
    } catch (err) {
      console.error('Search error:', err);
      setLoadError('Search failed. Please try again.');
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    applyFilters({ query: '' });
  };

  const handleApplyFilters = () => {
    try {
      applyFilters(filters);
      setFilterDrawerOpen(false);
    } catch (err) {
      console.error('Filter error:', err);
    }
  };

  const handleClearFilters = () => {
    const cleared = {
      city: '',
      jobType: [],
      workMode: [],
      shift: [],
      salaryRange: [0, 100],
      experienceRange: [0, 20],
    };
    setFilters(cleared);
    applyFilters({ ...cleared, query: searchQuery.trim() });
    setFilterDrawerOpen(false);
  };

  const handleSortChange = (event) => {
    const newSort = event.target.value;
    setSortBy(newSort);
    applySorting(newSort);
  };

  const handleJobClick = (jobId) => {
    navigate(`/jobseeker/job/${jobId}`);
  };

  const jobsWithSkillMatch = user?.skills
    ? jobs.map(job => {
        try {
          return { ...job, skillMatch: calculateSkillMatch(job, user.skills) };
        } catch (err) {
          console.error('Skill match calculation error:', err);
          return job;
        }
      })
    : jobs;


  const classifiedJobs = jobsWithSkillMatch.map((j) => ({
    job: j,
    applied: Boolean(jobService.isJobApplied(j.id)),
    expired: isJobExpired(j),
  }));

  const appliedCount = classifiedJobs.filter((c) => c.applied).length;
  const expiredCount = classifiedJobs.filter((c) => c.expired && !c.applied).length;
  const notAppliedCount = classifiedJobs.filter((c) => !c.applied && !c.expired).length;
  const allCount = classifiedJobs.length;

  const displayJobs = classifiedJobs
    .filter((c) => {
      switch (appliedFilter) {
        case 'applied':     return c.applied;                 // applied, even if since expired
        case 'not_applied': return !c.applied && !c.expired;  // still actionable
        case 'expired':     return c.expired && !c.applied;   // missed opportunities
        default:            return true;                      // 'all'
      }
    })
    .map((c) => c.job);


  const effectivePageSize = pageSize === 'all' ? Math.max(displayJobs.length, 1) : pageSize;
  const totalPages = Math.max(1, Math.ceil(displayJobs.length / effectivePageSize));

  // Clamp page if it falls out of range (e.g. after filter narrows results).
  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [totalPages, page]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, sortBy, filters.city, filters.jobType, filters.workMode, filters.shift, pageSize, appliedFilter]);

  const paginatedJobs = useMemo(() => {
    const start = (page - 1) * effectivePageSize;
    return displayJobs.slice(start, start + effectivePageSize);
  }, [displayJobs, page, effectivePageSize]);

  const handlePageChange = (_e, value) => {
    setPage(value);
    // Scroll back to results top for a clean transition.
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const activeFilterCount =
    (filters.city ? 1 : 0) +
    filters.jobType.length +
    filters.workMode.length +
    filters.shift.length;

  const filterChipSx = {
    bgcolor: BRAND.navySoft,
    color: BRAND.navy,
    border: `1px solid ${BRAND.navySoft}`,
    fontWeight: 500,
    fontSize: '0.8125rem',
    height: 30,
    borderRadius: 1,
    '& .MuiChip-deleteIcon': {
      color: BRAND.navy,
      opacity: 0.65,
      fontSize: 16,
      '&:hover': { opacity: 1, color: BRAND.navy },
    },
    '&:hover': { bgcolor: BRAND.navySoftHover },
  };

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      bgcolor: '#fff',
      borderRadius: 1.25,
      fontSize: '0.875rem',
      '& fieldset': { borderColor: BRAND.border },
      '&:hover fieldset': { borderColor: BRAND.borderStrong },
      '&.Mui-focused fieldset': { borderColor: BRAND.navy, borderWidth: 1.5 },
    },
    '& .MuiInputLabel-root': {
      fontSize: '0.875rem',
      color: BRAND.muted,
      '&.Mui-focused': { color: BRAND.navy },
    },
  };

  const pillSx = (active) => ({
    cursor: 'pointer',
    px: 1.75,
    py: 0.85,
    borderRadius: 999,
    border: `1px solid ${active ? BRAND.navy : BRAND.border}`,
    bgcolor: active ? BRAND.navy : '#fff',
    color: active ? '#fff' : BRAND.ink,
    fontSize: '0.8125rem',
    fontWeight: active ? 600 : 500,
    transition: 'all 0.18s ease',
    userSelect: 'none',
    '&:hover': {
      borderColor: BRAND.navy,
      bgcolor: active ? BRAND.navyDark : BRAND.navySoft,
    },
  });

  const togglePill = (key, value) => {
    setFilters((prev) => {
      const current = Array.isArray(prev[key]) ? prev[key] : [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      const updated = { ...prev, [key]: next };
      applyFilters({ [key]: next });
      return updated;
    });
  };

  const removeFilterValue = (key, value) => {
    setFilters((prev) => {
      const next = (Array.isArray(prev[key]) ? prev[key] : []).filter((v) => v !== value);
      applyFilters({ [key]: next });
      return { ...prev, [key]: next };
    });
  };

  const shiftLabel = (value) =>
    (SHIFTS.find((s) => s.value === value) || {}).label || value;

  return (
    <Box sx={{
      p: { xs: 1.5, sm: 2, md: 3, lg: 4 },
      maxWidth: 1440, mx: 'auto', bgcolor: BRAND.bg, minHeight: '100vh',
      fontFamily: FONT,
      '& .MuiTypography-root, & .MuiButton-root, & .MuiToggleButton-root, & .MuiChip-root, & .MuiInputBase-root, & .MuiMenuItem-root, & .MuiPaginationItem-root': {
        fontFamily: FONT,
      },
    }}>
     
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
              Find your next role
            </Typography>
            <Typography sx={{ color: BRAND.muted, fontSize: { xs: '0.82rem', sm: '0.9rem' }, fontWeight: 500, mt: 0.5 }}>
              <Box component="span" sx={{ color: BRAND.sageText, fontWeight: 700 }}>
                {totalResults} live {totalResults === 1 ? 'opening' : 'openings'}
              </Box>
              {' '}matched to your profile
            </Typography>
          </Box>
          <Tooltip title="Refresh" arrow>
            <span>
              <IconButton
                onClick={handleRefreshJobs}
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

        {/* Row 2 — search + Search + Filters */}
        <Stack direction="row" spacing={1} sx={{ alignItems: 'stretch', flexWrap: 'wrap', gap: 1 }}>
          <TextField
            placeholder="Search by job title, skills, or company"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
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
                      onClick={handleClearSearch}
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

          

          <Button
            variant="outlined"
            startIcon={
              <Badge
                badgeContent={activeFilterCount}
                sx={{
                  '& .MuiBadge-badge': {
                    bgcolor: BRAND.sage, color: '#fff',
                    fontSize: '0.65rem', height: 16, minWidth: 16, right: -3, top: -2,
                    fontWeight: 800,
                  },
                }}
              >
                <TuneRounded sx={{ fontSize: 18 }} />
              </Badge>
            }
            onClick={() => setFilterDrawerOpen(true)}
            sx={{
              bgcolor: BRAND.surface,
              borderColor: BRAND.borderStrong,
              color: BRAND.ink,
              textTransform: 'none', fontWeight: 600,
              fontSize: '0.9rem', px: 2.25,
              height: { xs: 46, md: 48 }, borderRadius: '12px',
              flexShrink: 0,
              '&:hover': { borderColor: BRAND.sage, bgcolor: BRAND.sageSoft },
            }}
          >
            Filters
          </Button>
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
            onChange={handleSortChange}
            sx={{
              minWidth: 150, flexShrink: 0,
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

      {(loadError || error) && (
        <Alert
          severity="error"
          sx={{ mb: 3, borderRadius: '12px', border: '1px solid', borderColor: 'error.light', fontFamily: FONT }}
          onClose={() => setLoadError(null)}
        >
          {loadError || error}
        </Alert>
      )}

      {/* Active Filter Chips */}
      {(filters.city || filters.jobType.length > 0 || filters.workMode.length > 0 || filters.shift.length > 0) && (
        <Stack direction="row" spacing={1} sx={{ mb: 2.5, flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
          <Typography variant="caption" sx={{ color: BRAND.muted, fontWeight: 500, mr: 0.5 }}>
            Active filters:
          </Typography>
          {filters.city && (
            <Chip
              label={`City: ${filters.city}`}
              onDelete={() => {
                setFilters((prev) => ({ ...prev, city: '' }));
                applyFilters({ city: '' });
              }}
              sx={filterChipSx}
            />
          )}
          {filters.workMode.map((mode) => (
            <Chip
              key={`mode-${mode}`}
              label={`Mode: ${mode}`}
              onDelete={() => removeFilterValue('workMode', mode)}
              sx={filterChipSx}
            />
          ))}
          {filters.jobType.map((type) => (
            <Chip
              key={`type-${type}`}
              label={`Type: ${type}`}
              onDelete={() => removeFilterValue('jobType', type)}
              sx={filterChipSx}
            />
          ))}
          {filters.shift.map((s) => (
            <Chip
              key={`shift-${s}`}
              label={`Shift: ${shiftLabel(s)}`}
              onDelete={() => removeFilterValue('shift', s)}
              sx={filterChipSx}
            />
          ))}
          <Button
            size="small"
            onClick={handleClearFilters}
            sx={{
              textTransform: 'none',
              color: BRAND.muted,
              fontSize: '0.8125rem',
              fontWeight: 500,
              minWidth: 'auto',
              '&:hover': { color: BRAND.navy, bgcolor: 'transparent' },
            }}
          >
            Clear all
          </Button>
        </Stack>
      )}

      {/* Results */}
      {loading ? (
        <Paper elevation={0} sx={{
          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
          minHeight: 420, borderRadius: 1.5, border: `1px solid ${BRAND.border}`, bgcolor: '#fff',
        }}>
          <CircularProgress size={36} sx={{ color: BRAND.sage }} />
          <Typography variant="body2" sx={{ mt: 2, color: BRAND.muted, fontSize: '0.875rem' }}>
            Loading opportunities…
          </Typography>
        </Paper>
      ) : displayJobs.length === 0 ? (
   
        <Paper elevation={0} sx={{
          textAlign: 'center', py: 8, px: 3,
          borderRadius: 1.5, border: `1px solid ${BRAND.border}`, bgcolor: '#fff',
        }}>
          <Box sx={{
            width: 64, height: 64, borderRadius: '50%',
            bgcolor: BRAND.sageSoft, mx: 'auto', mb: 2.5,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Search sx={{ fontSize: 30, color: BRAND.sage }} />
          </Box>
          {appliedFilter !== 'all' && jobsWithSkillMatch.length > 0 ? (
            <>
              <Typography variant="h6" sx={{ fontWeight: 700, color: BRAND.ink, mb: 0.75, fontSize: '1.0625rem' }}>
                {appliedFilter === 'applied'
                  ? 'No applied jobs here yet'
                  : appliedFilter === 'expired'
                    ? 'No expired jobs'
                    : 'You\u2019ve applied to all of these'}
              </Typography>
              <Typography variant="body2" sx={{ color: BRAND.muted, mb: 3, fontSize: '0.875rem' }}>
                {appliedFilter === 'applied'
                  ? 'Jobs you apply to will show up in this view'
                  : appliedFilter === 'expired'
                    ? 'Great — no deadlines have slipped past you'
                    : 'Nice work — every matching opening already has your application'}
              </Typography>
              <Button
                variant="outlined"
                onClick={() => setAppliedFilter('all')}
                sx={{
                  borderColor: BRAND.navy, color: BRAND.navy,
                  textTransform: 'none', fontWeight: 500, px: 3, borderRadius: 1.25,
                  '&:hover': { borderColor: BRAND.navyDark, bgcolor: BRAND.navySoft },
                }}
              >
                Show all jobs
              </Button>
            </>
          ) : (
            <>
              <Typography variant="h6" sx={{ fontWeight: 700, color: BRAND.ink, mb: 0.75, fontSize: '1.0625rem' }}>
                No matching openings
              </Typography>
              <Typography variant="body2" sx={{ color: BRAND.muted, mb: 3, fontSize: '0.875rem' }}>
                Try adjusting your search criteria or clearing some filters
              </Typography>
              <Button
                variant="outlined"
                onClick={handleClearFilters}
                sx={{
                  borderColor: BRAND.navy, color: BRAND.navy,
                  textTransform: 'none', fontWeight: 500, px: 3, borderRadius: 1.25,
                  '&:hover': { borderColor: BRAND.navyDark, bgcolor: BRAND.navySoft },
                }}
              >
                Clear filters
              </Button>
            </>
          )}
        </Paper>
      ) : (
        <>
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: viewMode === 'grid' ? 'repeat(2, minmax(0, 1fr))' : '1fr',
              md: viewMode === 'grid' ? 'repeat(3, minmax(0, 1fr))' : '1fr',
              lg: viewMode === 'grid' ? 'repeat(4, minmax(0, 1fr))' : '1fr',
              xl: viewMode === 'grid' ? 'repeat(4, minmax(0, 1fr))' : '1fr',
            },
            gap: { xs: 1.5, sm: 1.75, md: 2 },
            width: '100%',
          }}>
            {/* 🔧 CHANGE 3/4 — render paginated slice instead of full list */}
            {paginatedJobs.map((job) => (
               <Box key={job.id} sx={{ minWidth: 0, width: '100%' }}>
                <JobCard
                  job={job}
                  onClick={() => handleJobClick(job.id)}
                  viewMode={viewMode}
                  appliedLabel={jobService.getAppliedLabel(job.id)}
                  isExpired={isJobExpired(job)}
                  isSaved={savedIds.has(String(job.id))}
                  onSave={() => handleToggleSave(job)}
                />
              </Box>
            ))}
          </Box>

          {/* ── Pagination bar — always visible below the cards ──────── */}
          {displayJobs.length > 0 && (

            <Box sx={{
              mt: { xs: 3, sm: 3.5, md: 4 },
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'stretch', sm: 'center' },
              gap: { xs: 1.5, sm: 2 },
            }}>
              {/* Left: count + page-size selector */}
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={{ xs: 1, sm: 2 }}
               
                sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, flex: 1, minWidth: 0 }}
              >
                <Typography sx={{
                  fontSize: { xs: '0.78rem', sm: '0.82rem' },
                  color: BRAND.muted,
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                }}>
                  Showing{' '}
                  <Box component="span" sx={{ color: BRAND.ink, fontWeight: 700 }}>
                    {(page - 1) * effectivePageSize + 1}–{Math.min(page * effectivePageSize, displayJobs.length)}
                  </Box>
                  {' '}of{' '}
                  <Box component="span" sx={{ color: BRAND.ink, fontWeight: 700 }}>
                    {displayJobs.length}
                  </Box>
                  {' '}openings
                </Typography>

                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                  <Typography sx={{
                    fontSize: { xs: '0.78rem', sm: '0.82rem' },
                    color: BRAND.muted, fontWeight: 500,
                  }}>
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
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            fontFamily: FONT,
                            color: BRAND.ink,
                            minHeight: { xs: 40, sm: 36 },
                            '&.Mui-selected': {
                              bgcolor: BRAND.navySoft,
                              color: BRAND.navy,
                              '&:hover': { bgcolor: BRAND.navySoft },
                            },
                          },
                        },
                      },
                    } }}
                    sx={{
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      fontFamily: FONT,
                      color: BRAND.navy,
                      bgcolor: BRAND.bg,
                      borderRadius: '10px',
                      minWidth: { xs: 76, sm: 80 },
                      height: { xs: 38, sm: 36 },
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: BRAND.border,
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: BRAND.navy,
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: BRAND.navy,
                        borderWidth: '1px',
                      },
                      '& .MuiSelect-select': {
                        py: 0.75,
                        pl: 1.25,
                        pr: '28px !important',
                      },
                      '& .MuiSvgIcon-root': { color: BRAND.navy },
                    }}
                  >
                    {PAGE_SIZE_OPTIONS.map((opt) => (
                      <MenuItem key={opt} value={opt}>{opt === 'all' ? 'All' : opt}</MenuItem>
                    ))}
                  </Select>
                  <Typography sx={{
                    fontSize: { xs: '0.78rem', sm: '0.82rem' },
                    color: BRAND.muted, fontWeight: 500,
                  }}>
                    per page
                  </Typography>
                </Stack>
              </Stack>

              {/* Right: page buttons — only when paginated */}
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
                      fontWeight: 600,
                      fontFamily: FONT,
                      color: BRAND.ink,
                      borderRadius: '8px',
                      border: `1px solid ${BRAND.border}`,
                      bgcolor: BRAND.bg,
                      minWidth: { xs: 32, sm: 36 },
                      height: { xs: 32, sm: 36 },
                      '&:hover': {
                        bgcolor: BRAND.navySoft,
                        borderColor: BRAND.sage,
                      },
                      '&.Mui-selected': {
                        bgcolor: BRAND.navy,
                        color: '#fff',
                        borderColor: BRAND.navy,
                        fontWeight: 700,
                        boxShadow: '0 4px 12px rgba(2,33,36,0.2)',
                        '&:hover': { bgcolor: BRAND.navyDark },
                      },
                    },
                    '& .MuiPaginationItem-ellipsis': {
                      border: 'none',
                      bgcolor: 'transparent',
                    },
                  }}
                />
            </Box>
          )}
        </>
      )}

      {/* Filter Drawer */}
      <Drawer
        anchor="right"
        open={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        slotProps={{
          paper: {
            sx: {
              width: { xs: '100%', sm: 420 },
              bgcolor: '#fff',
              borderRadius: { xs: 0, sm: '20px 0 0 20px' },
              fontFamily: FONT,
              '& .MuiTypography-root, & .MuiButton-root, & .MuiInputBase-root': { fontFamily: FONT },
            },
          },
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Drawer Header */}
          <Box sx={{
            px: 3, py: 2.5,
            borderBottom: `1px solid ${BRAND.border}`,
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
            bgcolor: BRAND.bg,
          }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Box sx={{
                width: 38, height: 38, borderRadius: 1.25,
                bgcolor: BRAND.navy,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(2,33,36,0.22)',
              }}>
                <TuneRounded sx={{ color: BRAND.sage, fontSize: 20 }} />
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: BRAND.ink, letterSpacing: '-0.01em' }}>
                  Refine Results
                </Typography>
                <Typography sx={{ fontSize: '0.75rem', color: BRAND.muted, mt: 0.25 }}>
                  {activeFilterCount > 0
                    ? `${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''} applied`
                    : 'Narrow down your search'}
                </Typography>
              </Box>
            </Stack>
            <IconButton
              size="small"
              onClick={() => setFilterDrawerOpen(false)}
              sx={{
                color: BRAND.muted,
                bgcolor: '#fff',
                border: `1px solid ${BRAND.border}`,
                '&:hover': { bgcolor: BRAND.navySoft, color: BRAND.navy, borderColor: BRAND.navy },
              }}
            >
              <Close sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>

          {/* Drawer Body */}
          <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 3 }}>

            <DrawerSection icon={<LocationOnOutlined sx={{ fontSize: 16 }} />} title="Location">
              <TextField
                fullWidth
                placeholder="e.g. Bengaluru, Hyderabad"
                value={filters.city}
                onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                sx={inputSx}
              />
            </DrawerSection>

            <DrawerSection icon={<WorkOutlineRounded sx={{ fontSize: 16 }} />} title="Work Mode">
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                {WORK_MODES.map((mode) => (
                  <Box key={mode} onClick={() => togglePill('workMode', mode)} sx={pillSx(filters.workMode.includes(mode))}>
                    {mode}
                  </Box>
                ))}
              </Stack>
            </DrawerSection>

            <DrawerSection icon={<WorkHistoryOutlined sx={{ fontSize: 16 }} />} title="Job Type">
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                {JOB_TYPES.map((type) => (
                  <Box key={type} onClick={() => togglePill('jobType', type)} sx={pillSx(filters.jobType.includes(type))}>
                    {type}
                  </Box>
                ))}
              </Stack>
            </DrawerSection>

            <DrawerSection icon={<AccessTimeOutlined sx={{ fontSize: 16 }} />} title="Shift">
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                {SHIFTS.map((s) => (
                  <Box key={s.value} onClick={() => togglePill('shift', s.value)} sx={pillSx(filters.shift.includes(s.value))}>
                    {s.label}
                  </Box>
                ))}
              </Stack>
            </DrawerSection>

            <Divider sx={{ borderColor: BRAND.border, mb: 3 }} />

            <DrawerSection icon={<PaymentsOutlined sx={{ fontSize: 16 }} />} title="Salary Range">
              <Box sx={{ px: 0.5 }}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 1.5 }}>
                  <Box sx={{
                    px: 1.25, py: 0.5, borderRadius: 1,
                    bgcolor: BRAND.navySoft, color: BRAND.navy,
                    fontSize: '0.75rem', fontWeight: 600,
                  }}>
                    ₹{salaryDraft[0]}L
                  </Box>
                  <Typography sx={{ fontSize: '0.75rem', color: BRAND.muted, alignSelf: 'center' }}>to</Typography>
                  <Box sx={{
                    px: 1.25, py: 0.5, borderRadius: 1,
                    bgcolor: BRAND.navySoft, color: BRAND.navy,
                    fontSize: '0.75rem', fontWeight: 600,
                  }}>
                    ₹{salaryDraft[1]}L
                  </Box>
                </Stack>
                <Slider
                  value={salaryDraft}
                  onChange={(e, newValue) => setSalaryDraft(newValue)}
                  onChangeCommitted={(e, newValue) =>
                    setFilters((prev) => ({ ...prev, salaryRange: newValue }))
                  }
                  valueLabelDisplay="auto"
                  min={0} max={100}
                  sx={sliderSx}
                />
              </Box>
            </DrawerSection>

            <DrawerSection icon={<WorkHistoryOutlined sx={{ fontSize: 16 }} />} title="Experience" last>
              <Box sx={{ px: 0.5 }}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 1.5 }}>
                  <Box sx={{
                    px: 1.25, py: 0.5, borderRadius: 1,
                    bgcolor: BRAND.navySoft, color: BRAND.navy,
                    fontSize: '0.75rem', fontWeight: 600,
                  }}>
                    {expDraft[0]} yrs
                  </Box>
                  <Typography sx={{ fontSize: '0.75rem', color: BRAND.muted, alignSelf: 'center' }}>to</Typography>
                  <Box sx={{
                    px: 1.25, py: 0.5, borderRadius: 1,
                    bgcolor: BRAND.navySoft, color: BRAND.navy,
                    fontSize: '0.75rem', fontWeight: 600,
                  }}>
                    {expDraft[1]} yrs
                  </Box>
                </Stack>
                <Slider
                  value={expDraft}
                  onChange={(e, newValue) => setExpDraft(newValue)}
                  onChangeCommitted={(e, newValue) =>
                    setFilters((prev) => ({ ...prev, experienceRange: newValue }))
                  }
                  valueLabelDisplay="auto"
                  min={0} max={20}
                  sx={sliderSx}
                />
              </Box>
            </DrawerSection>
          </Box>

          {/* Footer — sticky at drawer bottom with safe-area inset for
              notched phones, stacked vertically on narrow widths */}
          <Box sx={{
            px: { xs: 2, sm: 3 }, py: { xs: 1.75, sm: 2.25 },
            pb: { xs: 'calc(1.75rem + env(safe-area-inset-bottom, 0px))', sm: 2.25 },
            borderTop: `1px solid ${BRAND.border}`,
            bgcolor: '#fff',
            display: 'flex',
            flexDirection: { xs: 'column-reverse', sm: 'row' },
            gap: { xs: 1, sm: 1.5 },
            alignItems: 'stretch',
          }}>
            <Button
              onClick={handleClearFilters}
              sx={{
                textTransform: 'none', fontWeight: 600,
                color: BRAND.muted,
                fontSize: { xs: '0.82rem', sm: '0.875rem' },
                borderRadius: '12px',
                border: `1px solid ${BRAND.border}`,
                px: { xs: 2, sm: 2.5 }, py: { xs: 1.1, sm: 1.15 },
                minHeight: { xs: 44, sm: 'auto' },
                width: { xs: '100%', sm: 'auto' },
                flexShrink: 0,
                '&:hover': { bgcolor: BRAND.navySoft, color: BRAND.navy, borderColor: BRAND.navy },
              }}
            >
              Reset all
            </Button>
            <Button
              variant="contained"
              fullWidth
              onClick={handleApplyFilters}
              disableElevation
              endIcon={<ArrowForwardRounded sx={{ fontSize: { xs: 15, sm: 16 } }} />}
              sx={{
                textTransform: 'none', fontWeight: 700,
                bgcolor: BRAND.navy, color: '#fff',
                borderRadius: '12px',
                py: { xs: 1.15, sm: 1.2 },
                minHeight: { xs: 48, sm: 'auto' },
                fontSize: { xs: '0.88rem', sm: '0.9rem' },
                letterSpacing: '0.005em',
                '&:hover': { bgcolor: BRAND.navyDark },
              }}
            >
              Apply filters
              {activeFilterCount > 0 && (
                <Box component="span" sx={{
                  ml: 1, px: 0.85, py: 0.1, borderRadius: 999,
                  bgcolor: 'rgba(127,158,126,0.3)',
                  color: '#fff',
                  fontSize: '0.7rem', fontWeight: 800,
                }}>
                  {activeFilterCount}
                </Box>
              )}
            </Button>
          </Box>
        </Box>
      </Drawer>
    </Box>
  );
};

export default FindJobs;