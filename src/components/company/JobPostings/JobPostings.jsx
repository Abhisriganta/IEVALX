import React, { useState, useMemo, useEffect } from 'react';
import {
  Box, Paper, Typography, Button, TextField, MenuItem, Card, Chip,
  IconButton, CircularProgress, Alert, Menu, ListItemIcon,
  ListItemText, Dialog, DialogContent, DialogActions, DialogContentText,
  Tooltip, Divider, InputAdornment, Checkbox,
  ToggleButton, ToggleButtonGroup, Pagination, Select,
  useTheme, useMediaQuery,
} from '@mui/material';
import {
  Add as AddIcon,
  Work as WorkIcon,
  People as PeopleIcon,
  BusinessCenter as BusinessCenterIcon,
  TrendingUp as TrendingUpIcon,
  LocationOn as LocationOnIcon,
  CurrencyRupee as CurrencyRupeeIcon,
  MoreVert as MoreVertIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  PlayArrow as PlayArrowIcon,
  Pause as PauseIcon,
  Block as BlockIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  ViewModule as ViewModuleIcon,
  ViewList as ViewListIcon,
  WorkOutlineOutlined as WorkOutlineIcon,
  ApartmentOutlined as ApartmentIcon,
  GroupOutlined as GroupIcon,
  ClearRounded, RefreshOutlined,
  AccessTimeOutlined,
} from '@mui/icons-material';
import PostJob from './PostJob';
import { useJobPostings } from '@/hooks/company';

/* ── Brand tokens — EXACT mirror of FindJobs BRAND.* ───────────────── */
const BRAND = {
  navy:          '#022124',
  navyDark:      '#0A3A38',
  navySoft:      'rgba(127,158,126,0.10)',
  navySoftHover: 'rgba(127,158,126,0.18)',
  sage:          '#7F9E7E',
  sageDark:      '#6C8B6B',
  sageText:      '#5E815D',
  sageSoft:      '#EDF3EC',
  border:        '#E7EAE3',
  borderStrong:  '#D8DDD4',
  muted:         '#55584F',
  ink:           '#101210',
  bg:            '#F6F8F3',
  surface:       '#FFFFFF',
};

const FONT = "'Jost','DM Sans',sans-serif";

/* ── Backend status mapping ──────────────────────────────────────────── */
const isActive      = (s) => String(s || '').toUpperCase() === 'PUBLISHED';
const isDraft       = (s) => String(s || '').toUpperCase() === 'DRAFT';
const isUnpublished = (s) => String(s || '').toUpperCase() === 'UNPUBLISHED';
const isClosed      = (s) => String(s || '').toUpperCase() === 'CLOSED';

const statusLabel = (s) => {
  const up = String(s || '').toUpperCase();
  if (up === 'PUBLISHED')   return 'Active';
  if (up === 'DRAFT')       return 'Draft';
  if (up === 'UNPUBLISHED') return 'Inactive';
  if (up === 'CLOSED')      return 'Closed';
  return s || '—';
};

const STATUS_STYLE = {
  Active:   { bg: '#EAF2E9', tx: '#3E6E3E', dot: '#3E6E3E' },
  Draft:    { bg: '#F6ECDF', tx: '#A35A2D', dot: '#A35A2D' },
  Inactive: { bg: '#E8EFEF', tx: BRAND.muted, dot: '#A8ADA8' },
  Closed:   { bg: '#FBECEA', tx: '#B4462F', dot: '#B4462F' },
};

const matchesStatusFilter = (filter, status) => {
  if (filter === 'all')         return true;
  if (filter === 'active')      return isActive(status);
  if (filter === 'draft')       return isDraft(status);
  if (filter === 'unpublished') return isUnpublished(status);
  if (filter === 'closed')      return isClosed(status);
  return false;
};

const fmtSalary = (j) =>
  (j?.salary_min != null && j?.salary_max != null)
    ? `₹${Number(j.salary_min).toLocaleString()} – ₹${Number(j.salary_max).toLocaleString()}`
    : '—';

const fmtExp = (j) =>
  (j?.experience_min != null && j?.experience_max != null)
    ? `${j.experience_min}–${j.experience_max} yrs`
    : '—';

const deadlineText = (j) =>
  j?.days_left != null
    ? (j.days_left > 0 ? `${j.days_left}d left` : j.days_left === 0 ? 'Closing today' : 'Expired')
    : 'Open';

const jobKey = (j) => j.job_id ?? j.id;

const STATUS_FILTER_OPTIONS = [
  { value: 'all',         label: 'All'      },
  { value: 'active',      label: 'Active'   },
  { value: 'draft',       label: 'Draft'    },
  { value: 'unpublished', label: 'Inactive' },
  { value: 'closed',      label: 'Closed'   },
];

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50, 'all'];
const DEFAULT_PAGE_SIZE = 10;

/* ── StatusBadge ─────────────────────────────────────────────────────── */
const StatusBadge = ({ status }) => {
  const label = statusLabel(status);
  const s = STATUS_STYLE[label] || STATUS_STYLE.Draft;
  return (
    <Box component="span" sx={{
      display: 'inline-flex', alignItems: 'center', gap: 0.6,
      height: 24, px: 1.1, borderRadius: '8px',
      bgcolor: s.bg, color: s.tx, fontSize: '0.72rem',
      fontWeight: 700, fontFamily: FONT, whiteSpace: 'nowrap',
      border: `1px solid ${s.bg}`,
    }}>
      <Box component="span" sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: s.dot }} />
      {label}
    </Box>
  );
};

/* ── Job card (FindJobs card pattern) ────────────────────────────────── */
const JobPostCard = ({ job, onClick, onMenuOpen, isSelected, onSelect }) => (
  <Card
    elevation={0}
    onClick={onClick}
    sx={{
      borderRadius: '14px',
      border: `1px solid ${isSelected ? BRAND.sage : BRAND.border}`,
      bgcolor: BRAND.surface,
      p: { xs: 1.75, sm: 2, md: 2.25 },
      boxShadow: '0 1px 3px rgba(2,33,36,0.05), 0 4px 12px rgba(2,33,36,0.04)',
      transition: 'transform 0.25s cubic-bezier(0.22,1,0.36,1), box-shadow 0.25s ease, border-color 0.18s ease',
      cursor: 'pointer',
      '&:hover': {
        transform: 'translateY(-3px)',
        borderColor: BRAND.sage,
        boxShadow: '0 8px 24px rgba(2,33,36,0.08), 0 2px 6px rgba(127,158,126,0.10)',
      },
      '@media (prefers-reduced-motion: reduce)': {
        transition: 'none',
        '&:hover': { transform: 'none' },
      },
    }}
  >
    {/* Top — checkbox + icon + title + menu */}
    <Box sx={{
      display: 'flex', justifyContent: 'space-between',
      alignItems: 'flex-start', gap: 1,
      mb: { xs: 1.25, sm: 1.5 },
    }}>
      <Box sx={{ display: 'flex', gap: 1.25, minWidth: 0, flex: 1, alignItems: 'flex-start' }}>
        <Checkbox
          checked={!!isSelected}
          onClick={onSelect}
          size="small"
          sx={{ p: 0.25, mt: 0.25, color: BRAND.borderStrong, '&.Mui-checked': { color: BRAND.sage } }}
        />
        <Box sx={{
          width: { xs: 38, sm: 42 }, height: { xs: 38, sm: 42 }, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: '10px', bgcolor: BRAND.sageSoft, color: BRAND.sageText,
          fontWeight: 700, fontSize: { xs: '0.9rem', sm: '1rem' },
          fontFamily: "'DM Serif Display', serif",
        }}>
          <BusinessCenterIcon sx={{ fontSize: 22 }} />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Tooltip title={job.job_title || '—'} arrow enterDelay={300}>
            <Typography sx={{
              fontWeight: 700, mb: 0.25, fontFamily: FONT,
              fontSize: { xs: '0.88rem', sm: '0.95rem', md: '1rem' },
              color: BRAND.ink, overflow: 'hidden', textOverflow: 'ellipsis',
              whiteSpace: 'nowrap', lineHeight: 1.3,
            }}>
              {job.job_title || '—'}
            </Typography>
          </Tooltip>
          <Tooltip title={job.department || job.industry_preference || '—'} arrow enterDelay={300}>
            <Typography sx={{
              fontSize: { xs: '0.74rem', sm: '0.8rem' },
              color: BRAND.muted, fontFamily: FONT,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {job.department || job.industry_preference || '—'}
            </Typography>
          </Tooltip>
        </Box>
      </Box>
      <IconButton
        size="small"
        onClick={(e) => { e.stopPropagation(); onMenuOpen?.(e, job); }}
        sx={{ color: BRAND.muted, '&:hover': { bgcolor: BRAND.navySoft, color: BRAND.navy } }}
      >
        <MoreVertIcon sx={{ fontSize: 18 }} />
      </IconButton>
    </Box>

    {/* Status + deadline */}
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: { xs: 1.25, sm: 1.5 } }}>
      <StatusBadge status={job.status} />
      <Typography sx={{ fontSize: '0.72rem', color: BRAND.muted, fontWeight: 600, fontFamily: FONT }}>{deadlineText(job)}</Typography>
    </Box>

    {/* Meta row */}
    <Box sx={{
      display: 'flex', gap: { xs: 1.25, sm: 2, md: 2.25 },
      mb: { xs: 1.25, sm: 1.5 }, flexWrap: 'wrap',
    }}>
      {[
        job.job_location && { icon: <LocationOnIcon sx={{ fontSize: { xs: 13, sm: 14 } }} />, text: job.job_location },
        job.job_type     && { icon: <WorkIcon sx={{ fontSize: { xs: 13, sm: 14 } }} />, text: job.job_type },
        { icon: <CurrencyRupeeIcon sx={{ fontSize: { xs: 13, sm: 14 } }} />, text: fmtSalary(job) },
      ].filter(Boolean).map(({ icon, text }) => (
        <Box key={text} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: BRAND.muted, minWidth: 0 }}>
          {icon}
          <Typography sx={{
            fontSize: { xs: '0.7rem', sm: '0.74rem' }, fontWeight: 500, fontFamily: FONT,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            maxWidth: { xs: 120, sm: 160 },
          }}>{text}</Typography>
        </Box>
      ))}
    </Box>

    {/* Bottom — applicants + view */}
    <Box sx={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      pt: { xs: 1.25, sm: 1.5 }, borderTop: `1px solid ${BRAND.border}`,
    }}>
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: BRAND.muted }}>
        <PeopleIcon sx={{ fontSize: 15 }} />
        <Typography sx={{ fontSize: '0.76rem', fontWeight: 700, fontFamily: FONT }}>{job.applicants || 0}</Typography>
        <Typography sx={{ fontSize: '0.72rem', fontFamily: FONT, ml: 0.25 }}>applicants</Typography>
      </Box>
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: BRAND.sageText, fontWeight: 700, fontSize: '0.74rem', fontFamily: FONT }}>
        View <VisibilityIcon sx={{ fontSize: 14 }} />
      </Box>
    </Box>
  </Card>
);

/* ── View dialog helpers ─────────────────────────────────────────────── */
const SectionTitle = ({ icon, children }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
    <Box sx={{
      width: 30, height: 30, borderRadius: '9px', bgcolor: BRAND.sageSoft, color: BRAND.sageText,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {icon}
    </Box>
    <Typography sx={{ fontSize: '0.95rem', fontWeight: 700, color: BRAND.ink, fontFamily: FONT }}>{children}</Typography>
  </Box>
);

const InfoTile = ({ label, value }) => (
  <Box sx={{ border: `1px solid ${BRAND.border}`, borderRadius: '12px', p: 1.5, bgcolor: BRAND.bg }}>
    <Typography sx={{ fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: BRAND.muted, mb: 0.5, fontFamily: FONT }}>
      {label}
    </Typography>
    <Typography sx={{ fontSize: '0.88rem', fontWeight: 600, color: BRAND.ink, lineHeight: 1.4, fontFamily: FONT }}>
      {value || '—'}
    </Typography>
  </Box>
);

const HeroStat = ({ icon, children }) => (
  <Box sx={{
    display: 'inline-flex', alignItems: 'center', gap: 0.6,
    bgcolor: 'rgba(127,158,126,0.15)', color: '#fff',
    px: 1.25, py: 0.6, borderRadius: '999px', fontSize: '0.78rem',
    fontWeight: 600, fontFamily: FONT,
    border: '1px solid rgba(255,255,255,0.12)',
  }}>
    <Box sx={{ display: 'flex', opacity: 0.9 }}>{icon}</Box>{children}
  </Box>
);

const tilesGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 1.25 };

/* ═══════════════════════════════════════════════════════════════════════
   JobPostings — FindJobs visual system
   ═══════════════════════════════════════════════════════════════════════ */
const JobPostings = () => {
   const [modalOpen, setModalOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);

  const {
    jobs, loading, error, stats, refetch,
    getJob, createJob, saveDraft, updateJob,
    publishJob, unpublishJob, closeJob, deleteJob,
      } = useJobPostings({ formOpen: modalOpen || Boolean(menuAnchor) });

  const [menuJob, setMenuJob]       = useState(null);

  const companyName = useMemo(() => {
    try {
      const raw = localStorage.getItem('ievalx_user');
      if (!raw) return '';
      const user = JSON.parse(raw);
      return user.company_name || user.companyName || '';
    } catch { return ''; }
  }, []);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [search,     setSearch]     = useState('');
  const [status,     setStatus]     = useState('all');
  const [department, setDepartment] = useState('all');

  const [editingJob, setEditingJob] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  const [viewMode, setViewMode] = useState('grid');
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [viewJob, setViewJob]       = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [jobConfirm, setJobConfirm] = useState(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const departments = useMemo(() => {
    const set = new Set(jobs.map((j) => j.department).filter(Boolean));
    return ['all', ...Array.from(set)];
  }, [jobs]);
  const hasDepartments = departments.length > 1;

  const filtered = useMemo(() => {
    return jobs.filter((j) => {
      const q = search.toLowerCase();
      const matchSearch = !search
        || (j.job_title || '').toLowerCase().includes(q)
        || (j.department || '').toLowerCase().includes(q)
        || (j.job_location || '').toLowerCase().includes(q);
      const matchStatus = matchesStatusFilter(status, j.status);
      const matchDept = department === 'all' || j.department === department;
      return matchSearch && matchStatus && matchDept;
    });
  }, [jobs, search, status, department]);

  const counts = useMemo(() => ({
    all:         jobs.length,
    active:      jobs.filter((j) => isActive(j.status)).length,
    draft:       jobs.filter((j) => isDraft(j.status)).length,
    unpublished: jobs.filter((j) => isUnpublished(j.status)).length,
    closed:      jobs.filter((j) => isClosed(j.status)).length,
  }), [jobs]);

  const statusCount = (key) => counts[key] ?? 0;

  const allFilteredIds = filtered.map(jobKey);
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedIds.has(id));
  const someSelected = selectedIds.size > 0;
  const toggleSelectAll = () => { allSelected ? setSelectedIds(new Set()) : setSelectedIds(new Set(allFilteredIds)); };

  /* ── Pagination (FindJobs pattern) ────────────────────────────────── */
  const effectivePageSize = pageSize === 'all' ? Math.max(filtered.length, 1) : pageSize;
  const totalPages = Math.max(1, Math.ceil(filtered.length / effectivePageSize));

  useEffect(() => { if (page > totalPages) setPage(1); }, [totalPages, page]);
  useEffect(() => { setPage(1); }, [search, status, department, pageSize]);

  const paginated = useMemo(() => {
    const start = (page - 1) * effectivePageSize;
    return filtered.slice(start, start + effectivePageSize);
  }, [filtered, page, effectivePageSize]);

  const handlePageChange = (_e, value) => setPage(value);

  /* ── Handlers ─────────────────────────────────────────────────────── */
  const handleMenuOpen = (event, job) => { setMenuAnchor(event.currentTarget); setMenuJob(job); };
  const handleMenuClose = () => { setMenuAnchor(null); setMenuJob(null); };

  const openFullView = async (job) => {
    if (!job) return;
    const id = jobKey(job);
    setViewJob(job); setViewLoading(true); setActionError('');
        try { const fullJob = await getJob(id); if (fullJob) setViewJob(prev => ({ ...prev, ...fullJob, applicants: fullJob.applicants ?? prev?.applicants ?? 0 })); }
    catch (err) { setActionError(err.friendlyMessage || 'Failed to load job details.'); }
    finally { setViewLoading(false); }
  };
  const handleView = () => { const job = menuJob; handleMenuClose(); openFullView(job); };
  const handleJobClick = (job) => openFullView(job);

  const handleEdit = async () => {
    if (!menuJob) return;
    const id = jobKey(menuJob);
    handleMenuClose(); setEditLoading(true); setActionError('');
    try { const fullJob = await getJob(id); setEditingJob(fullJob || menuJob); setModalOpen(true); }
    catch (err) { setActionError(err.friendlyMessage || 'Failed to load job for editing.'); }
    finally { setEditLoading(false); }
  };
  const editFromView = () => { if (!viewJob) return; setEditingJob(viewJob); setViewJob(null); setModalOpen(true); };

    const requestJobConfirm = (type) => {
    if (!menuJob) return;
    if (type === 'activate' && menuJob.days_left != null && menuJob.days_left <= 0) {
      setActionError('Deadline has passed — update it to a future date, then activate.');
      handleMenuClose();
      return;
    }
    setJobConfirm({ type, job: menuJob });
    handleMenuClose();
  };
  const closeJobConfirm = () => { if (!confirmBusy) setJobConfirm(null); };
  const executeJobConfirm = async () => {
    if (!jobConfirm) return;
    const { type, job } = jobConfirm;
    const id = jobKey(job);
    setConfirmBusy(true); setBusyId(id); setActionError('');
    try {
      if      (type === 'activate')   await publishJob(id);
      else if (type === 'deactivate') await unpublishJob(id);
      else if (type === 'close')      await closeJob(id);
      else if (type === 'delete')     await deleteJob(id);
      setJobConfirm(null);
    } catch (err) {
      const fallback = { activate: 'Failed to activate.', deactivate: 'Failed to deactivate.', close: 'Failed to close.', delete: 'Failed to delete.' }[type] || 'Action failed.';
      setActionError(err.friendlyMessage || fallback);
    } finally { setConfirmBusy(false); setBusyId(null); }
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true); setActionError('');
    try {
      const ids = [...selectedIds];
      const results = await Promise.allSettled(ids.map((id) => deleteJob(id)));
      const failed = results.filter((r) => r.status === 'rejected').length;
      setSelectedIds(new Set()); setBulkDeleteConfirm(false);
      if (failed > 0) setActionError(`${failed} of ${ids.length} job(s) could not be deleted.`);
    } catch (err) { setActionError(err.friendlyMessage || 'Failed to delete selected jobs.'); }
    finally { setBulkDeleting(false); }
  };

  const menuJobIsActive = menuJob && isActive(menuJob.status);
  const menuJobIsClosed = menuJob && isClosed(menuJob.status);

  const jobConfirmCfg = (() => {
    if (!jobConfirm) return null;
    const { type, job } = jobConfirm;
    const title = job?.job_title || 'this job';
    const map = {
      activate: {
        icon: <PlayArrowIcon sx={{ color: BRAND.sage, fontSize: 28 }} />,
        gradient: 'linear-gradient(160deg, #08302F 0%, #0E1E1D 70%, #121615 100%)',
        heading: 'Activate this job?',
        subtitle: 'This will make it live for applicants',
        body: <><strong>{title}</strong> will be published and become visible to all job seekers. They'll be able to apply immediately.</>,
        confirmLabel: 'Activate',
        btnBg: BRAND.sage, btnHover: BRAND.sageDark,
      },
      deactivate: {
        icon: <PauseIcon sx={{ color: '#D4A574', fontSize: 28 }} />,
        gradient: 'linear-gradient(160deg, #3D2A1A 0%, #2A1D12 70%, #1F1610 100%)',
        heading: 'Set job inactive?',
        subtitle: 'Temporarily hide from job seekers',
        body: <><strong>{title}</strong> will be unpublished and hidden from job seekers. You can reactivate it anytime to make it live again.</>,
        confirmLabel: 'Set Inactive',
        btnBg: '#A35A2D', btnHover: '#7A4422',
      },
      close: {
        icon: <BlockIcon sx={{ color: '#9BA8AE', fontSize: 28 }} />,
        gradient: 'linear-gradient(160deg, #2C3539 0%, #1E2629 70%, #171D1F 100%)',
        heading: 'Close this job?',
        subtitle: 'This action is permanent',
        body: <><strong>{title}</strong> will be closed permanently and applicants can no longer apply. Closed jobs cannot be reopened — you'll need to create a new posting.</>,
        confirmLabel: 'Close Job',
        btnBg: BRAND.muted, btnHover: '#3E443F',
      },
      delete: {
        icon: <DeleteIcon sx={{ color: '#E8897A', fontSize: 28 }} />,
        gradient: 'linear-gradient(160deg, #4A1A12 0%, #331210 70%, #250E0B 100%)',
        heading: 'Delete this job?',
        subtitle: 'This cannot be undone',
        body: <>This will permanently remove <strong>{title}</strong> and all associated data including applicant records. This action cannot be reversed.</>,
        confirmLabel: 'Delete',
        btnBg: '#B4462F', btnHover: '#8A3522',
      },
    };
    return map[type] || null;
  })();

  /* ── Loading / Error ───────────────────────────────────────────────── */
  if (loading) return (
    <Paper elevation={0} sx={{
      display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
      minHeight: 420, borderRadius: '14px', border: `1px solid ${BRAND.border}`, bgcolor: BRAND.surface,
      my: 4, mx: 'auto', maxWidth: 1440,
    }}>
      <CircularProgress size={36} sx={{ color: BRAND.sage }} />
      <Typography sx={{ mt: 2, color: BRAND.muted, fontSize: '0.875rem', fontFamily: FONT }}>Loading job postings…</Typography>
    </Paper>
  );

  if (error) return (
    <Paper elevation={0} sx={{
      textAlign: 'center', py: 8, px: 3, borderRadius: '14px',
      border: `1px solid ${BRAND.border}`, bgcolor: BRAND.surface, my: 4, mx: 'auto', maxWidth: 1440,
    }}>
      <Typography sx={{ color: '#B4462F', mb: 2, fontFamily: FONT }}>{error}</Typography>
      <Button variant="outlined" onClick={refetch} sx={{
        textTransform: 'none', fontWeight: 600, borderRadius: '12px',
        borderColor: BRAND.navy, color: BRAND.navy, fontFamily: FONT,
        '&:hover': { borderColor: BRAND.navyDark, bgcolor: BRAND.navySoft },
      }}>Retry</Button>
    </Paper>
  );

  /* ═══ Render ═══════════════════════════════════════════════════════ */
  return (
    <Box className="page-fade-in" sx={{
      p: { xs: 1.5, sm: 2, md: 3, lg: 4 },
      maxWidth: 1440, mx: 'auto', bgcolor: BRAND.bg, minHeight: '100vh',
      fontFamily: FONT,
      '& .MuiTypography-root, & .MuiButton-root, & .MuiToggleButton-root, & .MuiChip-root, & .MuiInputBase-root, & .MuiMenuItem-root, & .MuiPaginationItem-root': { fontFamily: FONT },
    }}>
      {/* ── Command header (FindJobs Paper) ──────────────────────────── */}
      <Paper elevation={0} sx={{
        bgcolor: BRAND.surface, border: `1px solid ${BRAND.border}`,
        borderRadius: { xs: '14px', sm: '16px' },
        p: { xs: 2, sm: 2.5, md: 3 }, mb: { xs: 2, md: 2.5 },
        boxShadow: '0 1px 2px rgba(16,18,16,0.04)',
      }}>
        {/* Row 1 — Title + actions */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5, mb: { xs: 2, md: 2.25 } }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography component="h1" sx={{ fontWeight: 700, color: BRAND.ink, letterSpacing: '-0.02em', lineHeight: 1.15, fontSize: { xs: '1.3rem', sm: '1.45rem', md: '1.6rem' } }}>
              Job Postings
            </Typography>
            <Typography sx={{ color: BRAND.muted, fontSize: { xs: '0.82rem', sm: '0.9rem' }, fontWeight: 500, mt: 0.5 }}>
              <Box component="span" sx={{ color: BRAND.sageText, fontWeight: 700 }}>
                {stats.active} active
              </Box>
              {' · '}{stats.total} total postings · {stats.applicants} applicants
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexShrink: 0, mt: 0.5 }}>
            <Tooltip title="Refresh" arrow>
              <span>
                <IconButton onClick={refetch} size="small" sx={{
                  color: BRAND.muted, border: `1px solid ${BRAND.borderStrong}`, borderRadius: '9px',
                  '&:hover': { bgcolor: BRAND.sageSoft, color: BRAND.navy, borderColor: BRAND.sage },
                }}>
                  <RefreshOutlined sx={{ fontSize: 18 }} />
                </IconButton>
              </span>
            </Tooltip>
            <Button variant="contained" startIcon={<AddIcon sx={{ fontSize: 18 }} />} disableElevation
              onClick={() => { setEditingJob(null); setModalOpen(true); }}
              sx={{
                bgcolor: BRAND.navy, color: '#fff', textTransform: 'none', fontWeight: 700,
                borderRadius: '12px', fontSize: { xs: '0.82rem', sm: '0.88rem' },
                px: { xs: 1.75, sm: 2.25 }, py: { xs: 0.85, sm: 0.95 },
                letterSpacing: '0.005em', '&:hover': { bgcolor: BRAND.navyDark },
              }}
            >
              Post a Job
            </Button>
          </Box>
        </Box>

        {/* Row 2 — Search pill + department filter */}
        <Box sx={{ display: 'flex', gap: 1, mb: { xs: 1.75, md: 2 }, flexWrap: 'wrap', alignItems: 'stretch' }}>
          <TextField
            placeholder="Search by job title, department or location…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: BRAND.muted, fontSize: 20 }} /></InputAdornment>,
                endAdornment: search ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearch('')} sx={{ color: BRAND.muted, '&:hover': { color: BRAND.ink } }}>
                      <ClearRounded sx={{ fontSize: 18 }} />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              },
            }}
            sx={{
              flex: '1 1 300px', minWidth: { xs: '100%', sm: 260 },
              '& .MuiOutlinedInput-root': {
                bgcolor: BRAND.bg, borderRadius: '25px',
                fontSize: { xs: '0.88rem', sm: '0.92rem' }, height: { xs: 46, md: 48 },
                color: BRAND.ink, fontFamily: FONT,
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                '& input::placeholder': { color: BRAND.muted, opacity: 0.85 },
                '& fieldset': { borderColor: '#B0BEC5', borderWidth: '1.5px' },
                '&:hover fieldset': { borderColor: '#78909C', borderWidth: '2px' },
                '&.Mui-focused': { boxShadow: '0 6px 18px rgba(0,0,0,0.12)' },
                '&.Mui-focused fieldset': { borderColor: BRAND.sage, borderWidth: '2px' },
              },
            }}
          />
          {hasDepartments && (
            <TextField
              select size="small" value={department}
              onChange={(e) => setDepartment(e.target.value)}
              sx={{
                minWidth: 190, flexShrink: 0,
                '& .MuiOutlinedInput-root': {
                  bgcolor: BRAND.surface, borderRadius: '10px',
                  fontSize: '0.82rem', height: { xs: 46, md: 48 }, color: BRAND.ink, fontFamily: FONT,
                  '& fieldset': { borderColor: BRAND.borderStrong },
                  '&:hover fieldset': { borderColor: BRAND.muted },
                  '&.Mui-focused fieldset': { borderColor: BRAND.sage, borderWidth: 1.5 },
                },
              }}
            >
              {departments.map((d) => <MenuItem key={d} value={d}>{d === 'all' ? 'All Departments' : d}</MenuItem>)}
            </TextField>
          )}
        </Box>

        {/* Row 3 — Status pills + view toggle */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Box sx={{
            display: 'flex', gap: 0.75, alignItems: 'center',
            flexWrap: { xs: 'nowrap', sm: 'wrap' },
            overflowX: { xs: 'auto', sm: 'visible' },
            pb: { xs: 0.5, sm: 0 }, mr: 'auto',
            '&::-webkit-scrollbar': { display: 'none' },
          }}>
            {STATUS_FILTER_OPTIONS.map((opt) => {
              const chipCount = statusCount(opt.value);
              const sel = status === opt.value;
              return (
                <Box key={opt.value} onClick={() => setStatus(opt.value)} role="button" tabIndex={0}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setStatus(opt.value)}
                  sx={{
                    cursor: 'pointer', userSelect: 'none',
                    display: 'inline-flex', alignItems: 'center', gap: 0.6,
                    px: 1.5, py: 0.65, borderRadius: 999, flexShrink: 0,
                    fontSize: '0.8rem', fontWeight: sel ? 700 : 600, fontFamily: FONT,
                    bgcolor: sel ? BRAND.navy : BRAND.surface,
                    color: sel ? '#fff' : BRAND.muted,
                    border: `1px solid ${sel ? BRAND.navy : BRAND.borderStrong}`,
                    transition: 'all 0.16s ease',
                    '&:hover': { bgcolor: sel ? BRAND.navy : BRAND.bg, borderColor: sel ? BRAND.navy : BRAND.muted },
                  }}
                >
                  {opt.label}
                  <Box component="span" sx={{
                    fontSize: '0.68rem', fontWeight: 800, lineHeight: 1.6, px: 0.7, borderRadius: 999,
                    bgcolor: sel ? 'rgba(255,255,255,0.22)' : BRAND.bg,
                    color: sel ? '#fff' : BRAND.muted,
                  }}>
                    {chipCount}
                  </Box>
                </Box>
              );
            })}
          </Box>

          <ToggleButtonGroup value={viewMode} exclusive onChange={(e, v) => v && setViewMode(v)} sx={{
            height: 38, flexShrink: 0, bgcolor: BRAND.bg,
            border: `1px solid ${BRAND.border}`, borderRadius: '10px', p: '3px',
            '& .MuiToggleButton-root': {
              border: 0, borderRadius: '7px !important', m: 0, color: BRAND.muted, px: 1.25, height: 30,
              '&:hover': { bgcolor: 'rgba(16,18,16,0.04)' },
              '&.Mui-selected': { bgcolor: BRAND.surface, color: BRAND.navy, boxShadow: '0 1px 3px rgba(16,18,16,0.12)', '&:hover': { bgcolor: BRAND.surface } },
            },
          }}>
            <ToggleButton value="grid"><ViewModuleIcon sx={{ fontSize: 18 }} /></ToggleButton>
            <ToggleButton value="list"><ViewListIcon sx={{ fontSize: 18 }} /></ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Paper>

      {actionError && <Alert severity="error" onClose={() => setActionError('')} sx={{ mb: 2, borderRadius: '12px', fontFamily: FONT }}>{actionError}</Alert>}

      {/* ── Select-all / bulk ────────────────────────────────────────── */}
      {filtered.length > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: { xs: 1.5, md: 2 }, minHeight: 36 }}>
          <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
            <Checkbox checked={allSelected} indeterminate={someSelected && !allSelected} onChange={toggleSelectAll} size="small"
              sx={{ color: BRAND.borderStrong, '&.Mui-checked, &.MuiCheckbox-indeterminate': { color: BRAND.sage } }}
            />
            <Typography sx={{ color: BRAND.muted, fontSize: '0.82rem', fontWeight: 500 }}>Select all</Typography>
          </Box>
          {someSelected && (
            <>
              <Chip label={`${selectedIds.size} selected`} size="small" sx={{ fontWeight: 700, bgcolor: BRAND.sageSoft, color: BRAND.sageText, border: `1px solid ${BRAND.sage}`, fontFamily: FONT }} />
              <Button variant="contained" size="small" startIcon={<DeleteIcon />} disableElevation
                onClick={() => setBulkDeleteConfirm(true)}
                sx={{
                  borderRadius: '10px', textTransform: 'none', fontWeight: 700,
                  bgcolor: '#B4462F', color: '#fff', fontFamily: FONT,
                  '&:hover': { bgcolor: '#8A3522' },
                }}
              >
                Delete {selectedIds.size}
              </Button>
            </>
          )}
        </Box>
      )}

      {/* ── Results ──────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <Paper elevation={0} sx={{
          textAlign: 'center', py: 8, px: 3, borderRadius: '14px',
          border: `1px solid ${BRAND.border}`, bgcolor: BRAND.surface,
        }}>
          <Box sx={{ width: 64, height: 64, borderRadius: '50%', bgcolor: BRAND.sageSoft, mx: 'auto', mb: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <SearchIcon sx={{ fontSize: 30, color: BRAND.sage }} />
          </Box>
          <Typography sx={{ fontWeight: 700, color: BRAND.ink, mb: 0.75, fontSize: '1.0625rem' }}>
            {jobs.length === 0 ? 'No job postings yet' : 'No matching postings'}
          </Typography>
          <Typography sx={{ color: BRAND.muted, mb: 3, fontSize: '0.875rem' }}>
            {jobs.length === 0 ? 'Create your first job posting to get started.' : 'Try adjusting your search or filters.'}
          </Typography>
          {jobs.length === 0 ? (
            <Button variant="contained" disableElevation startIcon={<AddIcon />}
              onClick={() => { setEditingJob(null); setModalOpen(true); }}
              sx={{ bgcolor: BRAND.navy, borderRadius: '10px', textTransform: 'none', fontWeight: 600, '&:hover': { bgcolor: BRAND.navyDark } }}
            >Post a Job</Button>
          ) : status !== 'all' ? (
            <Button variant="outlined" onClick={() => setStatus('all')} sx={{
              borderColor: BRAND.navy, color: BRAND.navy, textTransform: 'none', fontWeight: 500, px: 3, borderRadius: '10px',
              '&:hover': { borderColor: BRAND.navyDark, bgcolor: BRAND.navySoft },
            }}>Show all jobs</Button>
          ) : null}
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
            },
            gap: { xs: 1.5, sm: 1.75, md: 2 }, width: '100%',
          }}>
            {paginated.map((job) => (
              <Box key={jobKey(job)} sx={{ minWidth: 0, width: '100%' }}>
                <JobPostCard
                  job={job}
                  onClick={() => handleJobClick(job)}
                  onMenuOpen={handleMenuOpen}
                  isSelected={selectedIds.has(jobKey(job))}
                  onSelect={(e) => { e.stopPropagation(); toggleSelect(jobKey(job)); }}
                />
              </Box>
            ))}
          </Box>

          {/* ── Pagination bar ─────────────────────────────────────────── */}
          {filtered.length > 0 && (
            <Box sx={{
              mt: { xs: 3, sm: 3.5, md: 4 }, display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between',
              alignItems: { xs: 'stretch', sm: 'center' }, gap: { xs: 1.5, sm: 2 },
            }}>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 1, sm: 2 }, alignItems: { xs: 'flex-start', sm: 'center' }, flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: { xs: '0.78rem', sm: '0.82rem' }, color: BRAND.muted, fontWeight: 500, whiteSpace: 'nowrap' }}>
                  Showing{' '}<Box component="span" sx={{ color: BRAND.ink, fontWeight: 700 }}>{(page - 1) * effectivePageSize + 1}–{Math.min(page * effectivePageSize, filtered.length)}</Box>
                  {' '}of{' '}<Box component="span" sx={{ color: BRAND.ink, fontWeight: 700 }}>{filtered.length}</Box>{' '}postings
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
                  <Typography sx={{ fontSize: { xs: '0.78rem', sm: '0.82rem' }, color: BRAND.muted, fontWeight: 500 }}>Show</Typography>
                  <Select size="small" value={pageSize}
                    onChange={(e) => { const v = e.target.value; setPageSize(v === 'all' ? 'all' : Number(v)); }}
                    renderValue={(v) => (v === 'all' ? 'All' : v)}
                    MenuProps={{ slotProps: { paper: { sx: {
                      borderRadius: '12px', mt: 0.5, border: `1px solid ${BRAND.border}`, boxShadow: '0 8px 24px rgba(2,33,36,0.12)',
                      '& .MuiMenuItem-root': { fontSize: '0.82rem', fontWeight: 600, fontFamily: FONT, color: BRAND.ink, minHeight: { xs: 40, sm: 36 },
                        '&.Mui-selected': { bgcolor: BRAND.navySoft, color: BRAND.navy, '&:hover': { bgcolor: BRAND.navySoft } },
                      },
                    } } } }}
                    sx={{
                      fontSize: '0.82rem', fontWeight: 700, fontFamily: FONT, color: BRAND.navy,
                      bgcolor: BRAND.bg, borderRadius: '10px', minWidth: { xs: 76, sm: 80 }, height: { xs: 38, sm: 36 },
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: BRAND.border },
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: BRAND.navy },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: BRAND.navy, borderWidth: '1px' },
                      '& .MuiSelect-select': { py: 0.75, pl: 1.25, pr: '28px !important' },
                      '& .MuiSvgIcon-root': { color: BRAND.navy },
                    }}
                  >
                    {PAGE_SIZE_OPTIONS.map((opt) => <MenuItem key={opt} value={opt}>{opt === 'all' ? 'All' : opt}</MenuItem>)}
                  </Select>
                  <Typography sx={{ fontSize: { xs: '0.78rem', sm: '0.82rem' }, color: BRAND.muted, fontWeight: 500 }}>per page</Typography>
                </Box>
              </Box>
              <Pagination count={totalPages} page={page} onChange={handlePageChange} shape="rounded" siblingCount={1} boundaryCount={1} size="small"
                sx={{
                  '& .MuiPaginationItem-root': {
                    fontSize: { xs: '0.75rem', sm: '0.82rem' }, fontWeight: 600, fontFamily: FONT, color: BRAND.ink,
                    borderRadius: '8px', border: `1px solid ${BRAND.border}`, bgcolor: BRAND.bg,
                    minWidth: { xs: 32, sm: 36 }, height: { xs: 32, sm: 36 },
                    '&:hover': { bgcolor: BRAND.navySoft, borderColor: BRAND.sage },
                    '&.Mui-selected': { bgcolor: BRAND.navy, color: '#fff', borderColor: BRAND.navy, fontWeight: 700, boxShadow: '0 4px 12px rgba(2,33,36,0.2)', '&:hover': { bgcolor: BRAND.navyDark } },
                  },
                  '& .MuiPaginationItem-ellipsis': { border: 'none', bgcolor: 'transparent' },
                }}
              />
            </Box>
          )}
        </>
      )}

      {/* ── Action menu ──────────────────────────────────────────────── */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { elevation: 0, sx: {
          mt: 0.5, minWidth: 180, bgcolor: BRAND.surface, border: `1px solid ${BRAND.border}`, borderRadius: '12px',
          boxShadow: '0 10px 36px rgba(2,33,36,0.12), 0 2px 6px rgba(2,33,36,0.06)', overflow: 'hidden',
          '& .MuiMenuItem-root': { fontSize: '0.875rem', py: 1.05, px: 2 },
        } } }}
      >
        <MenuItem onClick={handleView} sx={{ color: BRAND.muted, '&:hover': { bgcolor: BRAND.navySoft } }}>
          <ListItemIcon sx={{ minWidth: '30px !important', color: 'inherit' }}><VisibilityIcon sx={{ fontSize: 18 }} /></ListItemIcon>
          <ListItemText slotProps={{ primary: { fontSize: '0.875rem', fontWeight: 500 } }}>View</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleEdit} sx={{ color: BRAND.muted, '&:hover': { bgcolor: BRAND.navySoft } }}>
          <ListItemIcon sx={{ minWidth: '30px !important', color: 'inherit' }}><EditIcon sx={{ fontSize: 18 }} /></ListItemIcon>
          <ListItemText slotProps={{ primary: { fontSize: '0.875rem', fontWeight: 500 } }}>Edit</ListItemText>
        </MenuItem>
        {!menuJobIsClosed && menuJobIsActive && (
          <MenuItem onClick={() => requestJobConfirm('deactivate')} disabled={busyId != null} sx={{ color: BRAND.muted, '&:hover': { bgcolor: BRAND.navySoft } }}>
            <ListItemIcon sx={{ minWidth: '30px !important', color: 'inherit' }}><PauseIcon sx={{ fontSize: 18 }} /></ListItemIcon>
            <ListItemText slotProps={{ primary: { fontSize: '0.875rem', fontWeight: 500 } }}>Set Inactive</ListItemText>
          </MenuItem>
        )}
        {!menuJobIsClosed && !menuJobIsActive && (
          <MenuItem onClick={() => requestJobConfirm('activate')} disabled={busyId != null} sx={{ color: BRAND.muted, '&:hover': { bgcolor: BRAND.navySoft } }}>
            <ListItemIcon sx={{ minWidth: '30px !important', color: 'inherit' }}><PlayArrowIcon sx={{ fontSize: 18 }} /></ListItemIcon>
            <ListItemText slotProps={{ primary: { fontSize: '0.875rem', fontWeight: 500 } }}>Activate</ListItemText>
          </MenuItem>
        )}
        {!menuJobIsClosed && (
          <MenuItem onClick={() => requestJobConfirm('close')} disabled={busyId != null} sx={{ color: BRAND.muted, '&:hover': { bgcolor: BRAND.navySoft } }}>
            <ListItemIcon sx={{ minWidth: '30px !important', color: 'inherit' }}><BlockIcon sx={{ fontSize: 18 }} /></ListItemIcon>
            <ListItemText slotProps={{ primary: { fontSize: '0.875rem', fontWeight: 500 } }}>Close Job</ListItemText>
          </MenuItem>
        )}
        <Divider sx={{ borderColor: BRAND.border, my: '0 !important' }} />
        <MenuItem onClick={() => requestJobConfirm('delete')} sx={{ color: '#B4462F', '&:hover': { bgcolor: '#FBECEA' } }}>
          <ListItemIcon sx={{ minWidth: '30px !important', color: 'inherit' }}><DeleteIcon sx={{ fontSize: 18 }} /></ListItemIcon>
          <ListItemText slotProps={{ primary: { fontSize: '0.875rem', fontWeight: 500 } }}>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* ══════════════ VIEW DIALOG ══════════════ */}
      <Dialog open={Boolean(viewJob)} onClose={() => setViewJob(null)} maxWidth="md" fullWidth fullScreen={isMobile}
        slotProps={{ paper: { sx: { borderRadius: isMobile ? 0 : '16px', overflow: 'hidden', bgcolor: BRAND.surface, boxShadow: '0 20px 60px rgba(2,33,36,0.18)', fontFamily: FONT } } }}
      >
        {viewJob && (
          <>
            <Box sx={{
                            background: 'linear-gradient(160deg, #08302F 0%, #0E1E1D 70%, #121615 100%)',
              px: { xs: 2.5, sm: 3.5 }, pt: 3, pb: 2.75, position: 'relative',
            }}>
              <Box sx={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', bgcolor: 'rgba(127,158,126,0.06)', pointerEvents: 'none' }} />
              <IconButton onClick={() => setViewJob(null)} sx={{ position: 'absolute', top: 12, right: 12, color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.1)' } }}>
                <CloseIcon fontSize="small" />
              </IconButton>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, pr: 4 }}>
                <Box sx={{ width: 52, height: 52, borderRadius: '14px', flex: 'none', bgcolor: 'rgba(127,158,126,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <BusinessCenterIcon sx={{ color: BRAND.sage, fontSize: 28 }} />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontSize: '1.4rem', fontWeight: 800, color: 'rgba(255,255,255,0.97)', lineHeight: 1.25, fontFamily: FONT }}>{viewJob.job_title || 'Job Details'}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mt: 0.5, color: 'rgba(255,255,255,0.65)' }}>
                    <ApartmentIcon sx={{ fontSize: 16 }} />
                    <Typography sx={{ fontSize: '0.85rem', fontWeight: 500, fontFamily: FONT }}>{viewJob.company_name || companyName || '—'}{viewJob.department ? ` · ${viewJob.department}` : ''}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
                    <Box component="span" sx={{
                      display: 'inline-flex', alignItems: 'center', gap: 0.6, height: 26, px: 1.25,
                      borderRadius: '999px', bgcolor: '#fff',
                      color: (STATUS_STYLE[statusLabel(viewJob.status)] || STATUS_STYLE.Draft).tx,
                      fontSize: '0.74rem', fontWeight: 700, fontFamily: FONT,
                    }}>
                      <Box component="span" sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: (STATUS_STYLE[statusLabel(viewJob.status)] || STATUS_STYLE.Draft).dot }} />
                      {statusLabel(viewJob.status)}
                    </Box>
                    {viewLoading && <CircularProgress size={16} sx={{ color: BRAND.sage }} />}
                  </Box>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                <HeroStat icon={<LocationOnIcon sx={{ fontSize: 16 }} />}>{viewJob.job_location || '—'}</HeroStat>
                <HeroStat icon={<WorkIcon sx={{ fontSize: 16 }} />}>{viewJob.job_type || '—'}</HeroStat>
                <HeroStat icon={<CurrencyRupeeIcon sx={{ fontSize: 16 }} />}>{fmtSalary(viewJob)}</HeroStat>
              </Box>
            </Box>

            <DialogContent sx={{ px: { xs: 2.5, sm: 3.5 }, py: 3, bgcolor: BRAND.surface }}>
              <Box sx={{ mb: 3 }}><SectionTitle icon={<WorkOutlineIcon sx={{ fontSize: 18 }} />}>Job Description</SectionTitle><Typography sx={{ fontSize: '0.9rem', color: BRAND.muted, lineHeight: 1.7, whiteSpace: 'pre-wrap', fontFamily: FONT }}>{viewJob.job_description || 'No description provided.'}</Typography></Box>
              <Box sx={{ mb: 3 }}><SectionTitle icon={<BusinessCenterIcon sx={{ fontSize: 18 }} />}>Key Details</SectionTitle><Box sx={tilesGrid}><InfoTile label="Location" value={viewJob.job_location} /><InfoTile label="Job Type" value={viewJob.job_type} /><InfoTile label="Openings" value={viewJob.openings != null ? String(viewJob.openings) : '1'} /><InfoTile label="Shift" value={viewJob.job_shift} /><InfoTile label="Experience" value={fmtExp(viewJob)} /><InfoTile label="Salary (₹/annum)" value={fmtSalary(viewJob)} /><InfoTile label="Application Deadline" value={viewJob.application_deadline} /><InfoTile label="Time Left" value={deadlineText(viewJob)} /><InfoTile label="Interview Location" value={viewJob.preferred_interview_location} /><InfoTile label="Address" value={viewJob.job_address_line1} /></Box></Box>
              {Array.isArray(viewJob.responsibilities) && viewJob.responsibilities.length > 0 && (<Box sx={{ mb: 3 }}><SectionTitle icon={<CheckCircleIcon sx={{ fontSize: 18 }} />}>Roles & Responsibilities</SectionTitle><Box sx={{ display: 'grid', gap: 1 }}>{viewJob.responsibilities.map((r, i) => (<Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}><CheckCircleIcon sx={{ fontSize: 17, color: BRAND.sage, mt: '2px', flex: 'none' }} /><Typography sx={{ fontSize: '0.88rem', color: BRAND.muted, lineHeight: 1.6, fontFamily: FONT }}>{r}</Typography></Box>))}</Box></Box>)}
              {Array.isArray(viewJob.skills) && viewJob.skills.length > 0 && (<Box sx={{ mb: 3 }}><SectionTitle icon={<TrendingUpIcon sx={{ fontSize: 18 }} />}>Required Skills</SectionTitle><Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>{viewJob.skills.map((s) => (<Chip key={s} label={s} size="small" sx={{ height: 26, fontSize: '0.76rem', fontWeight: 600, bgcolor: BRAND.sageSoft, color: '#4A6E49', borderRadius: '8px', border: `1px solid ${BRAND.border}`, fontFamily: FONT }} />))}</Box></Box>)}
              <Box sx={{ mb: 3 }}><SectionTitle icon={<GroupIcon sx={{ fontSize: 18 }} />}>Eligibility</SectionTitle><Box sx={tilesGrid}><InfoTile label="Education" value={viewJob.education_requirements} /><InfoTile label="Languages" value={Array.isArray(viewJob.languages) && viewJob.languages.length ? viewJob.languages.join(', ') : '—'} /><InfoTile label="Gender" value={viewJob.gender} /><InfoTile label="Candidate Category" value={viewJob.candidate_category} />{viewJob.candidate_category === 'Persons with Disabilities (PwD)' && <InfoTile label="Disability Type" value={viewJob.disability_type} />}<InfoTile label="Industry Preference" value={viewJob.industry_preference} /></Box></Box>
              {viewJob.benefits && Object.keys(viewJob.benefits).length > 0 && (<Box sx={{ mb: 3 }}><SectionTitle icon={<CurrencyRupeeIcon sx={{ fontSize: 18 }} />}>Benefits & Perks</SectionTitle><Box sx={{ display: 'grid', gap: 1.5 }}>{Object.entries(viewJob.benefits).map(([category, items]) => (<Box key={category}><Typography sx={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: BRAND.muted, mb: 0.75, fontFamily: FONT }}>{category}</Typography><Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>{(items || []).map((item) => (<Chip key={item} label={item} size="small" variant="outlined" sx={{ height: 26, fontSize: '0.76rem', fontWeight: 600, color: BRAND.muted, borderColor: BRAND.border, borderRadius: '8px', fontFamily: FONT }} />))}</Box></Box>))}</Box></Box>)}
              <Box><SectionTitle icon={<ApartmentIcon sx={{ fontSize: 18 }} />}>Company</SectionTitle><Box sx={tilesGrid}><InfoTile label="Company Name" value={viewJob.company_name || companyName} /><InfoTile label="Company Type" value={viewJob.company_type} /></Box></Box>
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2, gap: 1, bgcolor: BRAND.surface, borderTop: `1px solid ${BRAND.border}` }}>
              <Button onClick={() => setViewJob(null)} sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 600, color: BRAND.muted, fontFamily: FONT, border: `1px solid ${BRAND.border}`, '&:hover': { bgcolor: BRAND.navySoft } }}>Close</Button>
              <Button variant="contained" startIcon={<EditIcon />} onClick={editFromView} disableElevation sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 700, px: 2.5, bgcolor: BRAND.navy, color: '#fff', fontFamily: FONT, '&:hover': { bgcolor: BRAND.navyDark } }}>Edit Job</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ── Confirmation dialog ─────────────────────────────────────── */}
      <Dialog open={Boolean(jobConfirm)} onClose={closeJobConfirm} maxWidth="xs" fullWidth
        slotProps={{ paper: { sx: { borderRadius: '18px', overflow: 'hidden', boxShadow: '0 24px 64px rgba(2,33,36,0.22)', fontFamily: FONT } } }}
      >
        {jobConfirmCfg && (<>
          <Box sx={{
            background: jobConfirmCfg.gradient,
            px: { xs: 2.5, sm: 3 }, pt: { xs: 2.5, sm: 3 }, pb: { xs: 2.25, sm: 2.75 },
            position: 'relative', overflow: 'hidden', textAlign: 'center',
          }}>
            <Box sx={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />
            <Box sx={{ position: 'absolute', bottom: -20, left: -20, width: 100, height: 100, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.02)', pointerEvents: 'none' }} />
            <Box sx={{
              width: 56, height: 56, borderRadius: '16px', mx: 'auto', mb: 2,
              bgcolor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(8px)',
            }}>
              {jobConfirmCfg.icon}
            </Box>
            <Typography sx={{ fontWeight: 700, color: 'rgba(255,255,255,0.97)', fontSize: { xs: '1.1rem', sm: '1.2rem' }, lineHeight: 1.2, mb: 0.5 }}>
              {jobConfirmCfg.heading}
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: { xs: '0.76rem', sm: '0.82rem' }, fontWeight: 500 }}>
              {jobConfirmCfg.subtitle}
            </Typography>
          </Box>
          <DialogContent sx={{ pt: { xs: 2.5, sm: 3 }, pb: { xs: 1.5, sm: 2 }, px: { xs: 2.5, sm: 3 }, bgcolor: BRAND.surface }}>
            <Typography sx={{ color: BRAND.muted, lineHeight: 1.65, fontSize: { xs: '0.82rem', sm: '0.88rem' } }}>
              {jobConfirmCfg.body}
            </Typography>
          </DialogContent>
          <DialogActions sx={{
            px: { xs: 2.5, sm: 3 }, py: { xs: 1.75, sm: 2 }, gap: 1,
            bgcolor: BRAND.surface, borderTop: `1px solid ${BRAND.border}`,
            flexDirection: { xs: 'column-reverse', sm: 'row' }, alignItems: 'stretch',
          }}>
            <Button onClick={closeJobConfirm} disabled={confirmBusy} sx={{
              borderRadius: '12px', textTransform: 'none', fontWeight: 600, color: BRAND.muted,
              fontFamily: FONT, border: `1px solid ${BRAND.border}`,
              width: { xs: '100%', sm: 'auto' }, minHeight: { xs: 44, sm: 'auto' },
              '&:hover': { bgcolor: BRAND.navySoft, borderColor: BRAND.borderStrong },
            }}>Cancel</Button>
            <Button variant="contained" onClick={executeJobConfirm} disabled={confirmBusy} disableElevation
              startIcon={confirmBusy ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : null}
              sx={{
                borderRadius: '12px', textTransform: 'none', fontWeight: 700, px: 3,
                width: { xs: '100%', sm: 'auto' }, minHeight: { xs: 48, sm: 'auto' },
                bgcolor: jobConfirmCfg.btnBg, color: '#fff', fontFamily: FONT,
                '&:hover': { bgcolor: jobConfirmCfg.btnHover },
                '&.Mui-disabled': { bgcolor: jobConfirmCfg.btnBg, color: 'rgba(255,255,255,0.6)', opacity: 0.85 },
              }}
            >{confirmBusy ? 'Working…' : jobConfirmCfg.confirmLabel}</Button>
          </DialogActions>
        </>)}
      </Dialog>

      {/* ── Bulk delete dialog ─────────────────────────────────────── */}
      <Dialog open={bulkDeleteConfirm} onClose={() => !bulkDeleting && setBulkDeleteConfirm(false)} maxWidth="xs" fullWidth
        slotProps={{ paper: { sx: { borderRadius: '18px', overflow: 'hidden', boxShadow: '0 24px 64px rgba(2,33,36,0.22)', fontFamily: FONT } } }}
      >
        <Box sx={{
          background: 'linear-gradient(160deg, #4A1A12 0%, #331210 70%, #250E0B 100%)',
          px: { xs: 2.5, sm: 3 }, pt: { xs: 2.5, sm: 3 }, pb: { xs: 2.25, sm: 2.75 },
          position: 'relative', overflow: 'hidden', textAlign: 'center',
        }}>
          <Box sx={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />
          <Box sx={{
            width: 56, height: 56, borderRadius: '16px', mx: 'auto', mb: 2,
            bgcolor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <DeleteIcon sx={{ color: '#E8897A', fontSize: 28 }} />
          </Box>
          <Typography sx={{ fontWeight: 700, color: 'rgba(255,255,255,0.97)', fontSize: { xs: '1.1rem', sm: '1.2rem' }, lineHeight: 1.2, mb: 0.5 }}>
            Delete {selectedIds.size} job{selectedIds.size > 1 ? 's' : ''}?
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: { xs: '0.76rem', sm: '0.82rem' }, fontWeight: 500 }}>
            This cannot be undone
          </Typography>
        </Box>
        <DialogContent sx={{ pt: { xs: 2.5, sm: 3 }, pb: { xs: 1.5, sm: 2 }, px: { xs: 2.5, sm: 3 }, bgcolor: BRAND.surface }}>
          <Typography sx={{ color: BRAND.muted, lineHeight: 1.65, fontSize: { xs: '0.82rem', sm: '0.88rem' } }}>
            This will permanently delete <strong>{selectedIds.size} selected posting{selectedIds.size > 1 ? 's' : ''}</strong> and all associated applicant data. This action cannot be reversed.
          </Typography>
        </DialogContent>
        <DialogActions sx={{
          px: { xs: 2.5, sm: 3 }, py: { xs: 1.75, sm: 2 }, gap: 1,
          bgcolor: BRAND.surface, borderTop: `1px solid ${BRAND.border}`,
          flexDirection: { xs: 'column-reverse', sm: 'row' }, alignItems: 'stretch',
        }}>
          <Button onClick={() => setBulkDeleteConfirm(false)} disabled={bulkDeleting} sx={{
            borderRadius: '12px', textTransform: 'none', fontWeight: 600, color: BRAND.muted,
            fontFamily: FONT, border: `1px solid ${BRAND.border}`,
            width: { xs: '100%', sm: 'auto' }, minHeight: { xs: 44, sm: 'auto' },
            '&:hover': { bgcolor: BRAND.navySoft },
          }}>Cancel</Button>
          <Button variant="contained" onClick={handleBulkDelete} disabled={bulkDeleting} disableElevation
            startIcon={bulkDeleting ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : null}
            sx={{
              borderRadius: '12px', textTransform: 'none', fontWeight: 700, px: 3,
              width: { xs: '100%', sm: 'auto' }, minHeight: { xs: 48, sm: 'auto' },
              bgcolor: '#B4462F', color: '#fff', fontFamily: FONT,
              '&:hover': { bgcolor: '#8A3522' },
              '&.Mui-disabled': { bgcolor: '#B4462F', color: 'rgba(255,255,255,0.6)', opacity: 0.85 },
            }}
          >{bulkDeleting ? 'Deleting…' : `Delete ${selectedIds.size}`}</Button>
        </DialogActions>
      </Dialog>

      <PostJob open={modalOpen} onClose={() => { setModalOpen(false); setEditingJob(null); }}
        createJob={createJob} saveDraft={saveDraft} updateJob={updateJob} editingJob={editingJob} companyName={companyName}
      />
    </Box>
  );
};

export default JobPostings;