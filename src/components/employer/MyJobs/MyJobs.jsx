

import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, TextField, MenuItem, InputAdornment,
  ToggleButton, ToggleButtonGroup, Drawer, Slider,
  Button, Typography, Chip, Alert, CircularProgress,
  Paper, Divider, Stack, IconButton, Badge,
  Pagination, Select, Snackbar,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Tooltip, Menu,
} from '@mui/material';
import {
  Search, Close, TuneRounded, WorkOutlineRounded,
  LocationOnOutlined, ClearRounded, RefreshOutlined,
  ViewList, ViewModule, ArrowForwardRounded, WorkHistoryOutlined,
  GroupsRounded, Add, PostAddRounded, KeyboardArrowDownRounded,
} from '@mui/icons-material';

import { useNavigate } from 'react-router-dom';
import { useEmployerJobs } from '@/hooks/employer/useEmployerJobs';
import useDebounce from '@/hooks/useDebounce';
import JobFormDialog from './JobForm';
import JobCard from './JobCard';

/* ── Constants (module-level — no re-creation per render) ──────────────── */
const WORK_MODES = ['Remote', 'Hybrid', 'On-site'];
const JOB_TYPES  = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance'];

const SORT_OPTIONS = [
  { value: 'newest',        label: 'Newest First'      },
  { value: 'deadline',      label: 'Deadline (nearest)'},
  { value: 'most-appl',     label: 'Most Applicants'   },
  { value: 'fewest-appl',   label: 'Fewest Applicants' },
];

/* Status pill options — driven by employer job lifecycle. Values match the
   backend's DISPLAY_STATUS_FILTER_MAP labels accepted by useEmployerJobs. */
const STATUS_FILTER_OPTIONS = [
  { value: 'all',              label: 'All'              },
  { value: 'Active',           label: 'Active'           },
  { value: 'Draft',            label: 'Drafts'           },
  { value: 'Pending Approval', label: 'Pending Approval' },
  { value: 'Closed',           label: 'Closed'           },
  { value: 'Rejected',         label: 'Rejected'         },
];

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50, 'all'];
const DEFAULT_PAGE_SIZE = 10;

/* Persisted view-mode preference (grid vs list). Same pattern as
   `ievalx_sidebar_collapsed` in DashboardLayout — lazy read on mount,
   write on every toggle. Set once, remembered forever per browser. */
const LS_VIEW_MODE_KEY = 'ievalx_myjobs_view_mode';

const FONT = "'Jost','DM Sans',sans-serif";

/* Same brand palette as FindJobs — pine authority on cream */
const BRAND = {
  navy:          '#022124',                  // pine
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
  amber:         '#A35A2D',
  amberSoft:     '#FBF0E7',
  err:           '#B4462F',
  errSoft:       '#FBECEA',
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

/* ══════════════════════════════════════════════════════════════════════════
   Identity — same helpers as the old MyJobs, kept as-is
   ══════════════════════════════════════════════════════════════════════════ */
const getStoredUser = () => {
  try {
    const raw = localStorage.getItem('ievalx_user');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};
const ROLE_TO_BACKEND = {
  employer:       'HIRING_MANAGER',
  hiring_manager: 'HIRING_MANAGER',
  recruiter:      'RECRUITER',
  viewer:         'VIEWER',
  company_admin:  'COMPANY_ADMIN',
  company:        'COMPANY_ADMIN',
};

/* ══════════════════════════════════════════════════════════════════════════
   Request-Edit-Access dialog — rethemed to pine/sage (behaviour unchanged)
   ══════════════════════════════════════════════════════════════════════════ */
const RequestEditAccessDialog = ({ open, onClose, onSubmit, job, previousRejectionNote }) => {
  const [reason, setReason]         = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');

  useEffect(() => {
    if (open) { setReason(''); setError(''); setSubmitting(false); }
  }, [open]);

  const trimmed   = reason.trim();
  const tooShort  = trimmed.length > 0 && trimmed.length < 10;
  const tooLong   = trimmed.length > 1000;
  const canSubmit = trimmed.length >= 10 && !tooLong && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true); setError('');
    try { await onSubmit(trimmed); }
    catch (err) { setError(err?.message || 'Failed to submit request.'); }
    finally     { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth="sm" fullWidth
      slotProps={{ paper: { sx: { borderRadius: '16px', fontFamily: FONT } } }}>
      <DialogTitle sx={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        py: 1.75, borderBottom: `1px solid ${BRAND.border}`, fontFamily: FONT,
      }}>
        <Typography component="span" sx={{ fontWeight: 700, color: BRAND.ink, fontSize: '1.05rem', fontFamily: FONT }}>
          Request Edit Access
        </Typography>
        <IconButton size="small" onClick={onClose} disabled={submitting}
          sx={{ color: BRAND.muted, '&:hover': { bgcolor: BRAND.navySoft, color: BRAND.navy } }}>
          <Close fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 2.5, pb: 1, fontFamily: FONT }}>
        {job?.job_title && (
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: '0.78rem', color: BRAND.muted, mb: 0.5, fontFamily: FONT }}>
              Requesting edit access for
            </Typography>
            <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: BRAND.navy, fontFamily: FONT }}>
              {job.job_title}
            </Typography>
          </Box>
        )}
        <Alert severity="info"
          sx={{ mb: 2, borderRadius: '10px', fontFamily: FONT, '& .MuiAlert-message': { fontSize: '0.82rem' } }}>
          Once approved, you'll have <strong>one chance to save changes</strong>. After saving, you'll need to request access again to make further edits.
        </Alert>
        {previousRejectionNote && (
          <Alert severity="warning"
            sx={{ mb: 2, borderRadius: '10px', fontFamily: FONT, '& .MuiAlert-message': { fontSize: '0.8rem' } }}>
            <strong>Your last request was rejected.</strong>
            <br />
            Reason: <em>{previousRejectionNote}</em>
          </Alert>
        )}
        {error && (
          <Alert severity="error"
            sx={{ mb: 2, borderRadius: '10px', fontFamily: FONT }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        <TextField
          autoFocus fullWidth multiline rows={4}
          label="Why do you need to edit this job? *"
          placeholder="e.g. The salary range needs correction; the role responsibilities have changed."
          value={reason} onChange={(e) => setReason(e.target.value)}
          error={tooShort || tooLong}
          helperText={
            tooLong ? `${trimmed.length - 1000} characters over the limit`
              : tooShort ? `Please provide a bit more detail (at least 10 characters)`
              : `${trimmed.length}/1000 characters`
          }
          disabled={submitting}
          sx={{
            fontFamily: FONT,
            '& .MuiOutlinedInput-root': { fontFamily: FONT, borderRadius: '10px',
              '&.Mui-focused fieldset': { borderColor: BRAND.sage, borderWidth: 1.5 },
            },
            '& .MuiInputLabel-root.Mui-focused': { color: BRAND.navy },
          }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${BRAND.border}` }}>
        <Button onClick={onClose} disabled={submitting}
          sx={{ textTransform: 'none', color: BRAND.muted, fontFamily: FONT }}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={!canSubmit} disableElevation
          sx={{
            textTransform: 'none', bgcolor: BRAND.navy, color: '#fff', fontFamily: FONT,
            '&:hover': { bgcolor: BRAND.navyDark }, borderRadius: '10px', px: 2.5, fontWeight: 700,
          }}>
          {submitting ? 'Sending…' : 'Send Request'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   Request-Republish dialog — same pattern
   ══════════════════════════════════════════════════════════════════════════ */
const RequestRepublishDialog = ({ open, onClose, onSubmit, job, previousRejectionNote }) => {
  const [reason, setReason]         = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');

  useEffect(() => {
    if (open) { setReason(''); setError(''); setSubmitting(false); }
  }, [open]);

  const trimmed   = reason.trim();
  const tooShort  = trimmed.length > 0 && trimmed.length < 10;
  const tooLong   = trimmed.length > 1000;
  const canSubmit = trimmed.length >= 10 && !tooLong && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true); setError('');
    try { await onSubmit(trimmed); }
    catch (err) { setError(err?.message || 'Failed to submit request.'); }
    finally     { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth="sm" fullWidth
      slotProps={{ paper: { sx: { borderRadius: '16px', fontFamily: FONT } } }}>
      <DialogTitle sx={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        py: 1.75, borderBottom: `1px solid ${BRAND.border}`, fontFamily: FONT,
      }}>
        <Typography component="span" sx={{ fontWeight: 700, color: BRAND.ink, fontSize: '1.05rem', fontFamily: FONT }}>
          Request to Republish
        </Typography>
        <IconButton size="small" onClick={onClose} disabled={submitting}
          sx={{ color: BRAND.muted, '&:hover': { bgcolor: BRAND.navySoft, color: BRAND.navy } }}>
          <Close fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 2.5, pb: 1, fontFamily: FONT }}>
        {job?.job_title && (
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: '0.78rem', color: BRAND.muted, mb: 0.5, fontFamily: FONT }}>
              Requesting republish for
            </Typography>
            <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: BRAND.navy, fontFamily: FONT }}>
              {job.job_title}
            </Typography>
          </Box>
        )}
        <Alert severity="info"
          sx={{ mb: 2, borderRadius: '10px', fontFamily: FONT, '& .MuiAlert-message': { fontSize: '0.82rem' } }}>
          Once approved, your job will go <strong>live on the student portal immediately</strong>. If rejected, you can submit a new request afterwards.
        </Alert>
        {previousRejectionNote && (
          <Alert severity="warning"
            sx={{ mb: 2, borderRadius: '10px', fontFamily: FONT, '& .MuiAlert-message': { fontSize: '0.8rem' } }}>
            <strong>Your last republish request was rejected.</strong>
            <br />
            Reason: <em>{previousRejectionNote}</em>
          </Alert>
        )}
        {error && (
          <Alert severity="error"
            sx={{ mb: 2, borderRadius: '10px', fontFamily: FONT }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        <TextField
          autoFocus fullWidth multiline rows={4}
          label="Why do you want to republish this job? *"
          placeholder="e.g. The role is open again — we need to refill this position."
          value={reason} onChange={(e) => setReason(e.target.value)}
          error={tooShort || tooLong}
          helperText={
            tooLong ? `${trimmed.length - 1000} characters over the limit`
              : tooShort ? `Please provide a bit more detail (at least 10 characters)`
              : `${trimmed.length}/1000 characters`
          }
          disabled={submitting}
          sx={{
            fontFamily: FONT,
            '& .MuiOutlinedInput-root': { fontFamily: FONT, borderRadius: '10px',
              '&.Mui-focused fieldset': { borderColor: BRAND.sage, borderWidth: 1.5 },
            },
            '& .MuiInputLabel-root.Mui-focused': { color: BRAND.navy },
          }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${BRAND.border}` }}>
        <Button onClick={onClose} disabled={submitting}
          sx={{ textTransform: 'none', color: BRAND.muted, fontFamily: FONT }}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={!canSubmit} disableElevation
          sx={{
            textTransform: 'none', bgcolor: BRAND.navy, color: '#fff', fontFamily: FONT,
            '&:hover': { bgcolor: BRAND.navyDark }, borderRadius: '10px', px: 2.5, fontWeight: 700,
          }}>
          {submitting ? 'Sending…' : 'Send Request'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════════════════════════════════ */
const MyJobs = (props) => {
  const navigate = useNavigate();

  const stored = getStoredUser();
  const companyId       = props.companyId       ?? stored?.company_id ?? stored?.companyId;
  const companyName     = props.companyName     ?? stored?.company_name ?? '';
  const currentUserRole = props.currentUserRole
    ?? (stored?.backend_role ? String(stored.backend_role).toUpperCase().replace(/\s+/g, '_') : null)
    ?? ROLE_TO_BACKEND[String(stored?.role || '').toLowerCase()]
    ?? 'HIRING_MANAGER';

  const isAdmin = currentUserRole === 'COMPANY_ADMIN'
    && (stored?.actor_type === 'COMPANY' || stored?.role === 'company');

  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);

  const {
    jobs, loading, error: loadError, refresh,
    createJob, updateJob,
    submitForApproval, publishJob, unpublishJob,
    requestEditAccess, getEditRequestStatus,
    requestRepublish, getRepublishRequestStatus,
    getJobDetail,
  } = useEmployerJobs(statusFilter, { formOpen: dialogOpen });

  /* ── UI state ────────────────────────────────────────────── */
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters]         = useState({
    city: '',
    jobType: [],
    workMode: [],
    applicantsRange: [0, 500],
  });
  const [sortBy, setSortBy]                     = useState('newest');
  const [statusMenuAnchor, setStatusMenuAnchor]  = useState(null);
  const [viewMode, setViewMode]                 = useState(() => {
    try {
      const saved = localStorage.getItem(LS_VIEW_MODE_KEY);
      return (saved === 'grid' || saved === 'list') ? saved : 'grid';
    } catch { return 'grid'; }
  });
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  /* Local slider draft — same "onChange updates draft, onChangeCommitted
     writes filters" pattern FindJobs uses. */
  const [applDraft, setApplDraft] = useState(filters.applicantsRange);
  useEffect(() => { setApplDraft(filters.applicantsRange); }, [filters.applicantsRange]);

  const debouncedQuery = useDebounce(searchQuery, 300);

  /* ── Dialog & flow state ─────────────────────────────────── */
  const [editingJob, setEditingJob]             = useState(null);
  const [viewingJob, setViewingJob]             = useState(null);
  const [requestJob, setRequestJob]             = useState(null);
  const [requestJobNote, setRequestJobNote]     = useState(null);
  const [republishJob, setRepublishJob]         = useState(null);
  const [republishJobNote, setRepublishJobNote] = useState(null);
  const [toast, setToast]                       = useState({ open: false, severity: 'success', msg: '' });

  const showToast = (severity, msg) => setToast({ open: true, severity, msg });
  const filteredJobs = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    const cityQ = filters.city.trim().toLowerCase();
    return jobs.filter((j) => {
      if (q) {
        const hay = `${j.job_title || ''} ${j.job_location || ''} ${j.job_type || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (cityQ && !(j.job_location || '').toLowerCase().includes(cityQ)) return false;
      if (filters.jobType.length  && !filters.jobType.some((t) => t.toLowerCase() === (j.job_type || '').toLowerCase()))   return false;
      if (filters.workMode.length && !filters.workMode.some((m) => m.toLowerCase() === (j.work_mode || '').toLowerCase())) return false;
      const appl = Number(j.applicants ?? 0);
      if (appl < filters.applicantsRange[0] || appl > filters.applicantsRange[1]) return false;
      return true;
    });
  }, [jobs, debouncedQuery, filters]);

  const sortedJobs = useMemo(() => {
    const arr = [...filteredJobs];
    switch (sortBy) {
      case 'deadline':
        arr.sort((a, b) => {
          const av = a.days_left ?? Number.MAX_SAFE_INTEGER;
          const bv = b.days_left ?? Number.MAX_SAFE_INTEGER;
          return av - bv;
        });
        break;
      case 'most-appl':
        arr.sort((a, b) => Number(b.applicants ?? 0) - Number(a.applicants ?? 0));
        break;
      case 'fewest-appl':
        arr.sort((a, b) => Number(a.applicants ?? 0) - Number(b.applicants ?? 0));
        break;
      case 'newest':
      default:
        arr.sort((a, b) => {
          const av = new Date(a.posted_at || a.created_at || 0).getTime();
          const bv = new Date(b.posted_at || b.created_at || 0).getTime();
          return bv - av;
        });
        break;
    }
    return arr;
  }, [filteredJobs, sortBy]);

  const counts = useMemo(() => {
    const total = jobs.length;
    const byStatus = STATUS_FILTER_OPTIONS.slice(1).reduce((acc, o) => {
      acc[o.value] = jobs.filter(
        (j) => (j.display_status || j.status_display) === o.value,
      ).length;
      return acc;
    }, {});
    return { all: total, ...byStatus };
  }, [jobs]);

  /* ── Pagination — same math as FindJobs ──────────────────── */
  const effectivePageSize = pageSize === 'all' ? Math.max(sortedJobs.length, 1) : pageSize;
  const totalPages        = Math.max(1, Math.ceil(sortedJobs.length / effectivePageSize));

  useEffect(() => { if (page > totalPages) setPage(1); }, [totalPages, page]);
  useEffect(() => { setPage(1); },
    [debouncedQuery, sortBy, filters.city, filters.jobType, filters.workMode, pageSize, statusFilter]);

  const paginatedJobs = useMemo(() => {
    const start = (page - 1) * effectivePageSize;
    return sortedJobs.slice(start, start + effectivePageSize);
  }, [sortedJobs, page, effectivePageSize]);

  const handlePageChange = (_e, value) => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* ── Handlers (identical semantics to the old MyJobs) ────── */
  const handleOpenCreate     = () => { setEditingJob(null); setDialogOpen(true); };
  const handleViewApplicants = (job) => navigate(`/employer/my-jobs/${job.id}/applicants`, { state: { job } });

  const handleEdit = async (job) => {
    try {
      const req    = isAdmin ? null : (await getEditRequestStatus(job.id))?.Request;
      const status = isAdmin ? 'APPROVED' : req?.status;

      if (status === 'APPROVED') {
        const detail = await getJobDetail(job.id);
        setEditingJob(detail);
        setDialogOpen(true);
        return;
      }
      if (status === 'PENDING') {
        showToast('info', "Your edit request is awaiting your Company Admin's review.");
        return;
      }
      setRequestJobNote(status === 'REJECTED' ? (req?.admin_note || null) : null);
      setRequestJob(job);
    } catch (err) { showToast('error', err.message || 'Failed to check edit access'); }
  };

  const handleView = async (job) => {
    try {
      const detail = await getJobDetail(job.id);
      setEditingJob(null); setViewingJob(detail); setDialogOpen(true);
    } catch (err) { showToast('error', err.message || 'Failed to load job details'); }
  };

  const handleFormSubmit = async (payload) => {
    if (editingJob) {
      const wasRejected =
        editingJob.display_status === 'Rejected' ||
        editingJob.status_display === 'Rejected' ||
        editingJob.approval_status === 'REJECTED';

      await updateJob(editingJob.id, payload);

      if (wasRejected && !isAdmin) {
        try {
          await submitForApproval(editingJob.id);
          showToast('success', 'Changes saved and re-sent to Company Admin for approval');
        } catch (err) {
        
          showToast(
            'error',
            err.message || 'Changes saved, but re-submitting for approval failed. Use “Re-submit for Approval” to retry.',
          );
        }
      } else {
        showToast('success', 'Job updated successfully');
      }
      return;
    }
    const res = await createJob(payload);
    if (res.Approval_Status === 'PENDING')  showToast('info', 'Job submitted to Company Admin for approval');
    else if (res.Status === 'PUBLISHED')    showToast('success', 'Job posted and is now live');
    else                                    showToast('success', 'Job saved as draft');
  };

  const handleRequestSubmit = async (reason) => {
    if (!requestJob) return;
    await requestEditAccess(requestJob.id, reason);
    showToast('success', 'Edit request sent to your Company Admin.');
    setRequestJob(null); setRequestJobNote(null);
  };

  const handleRequestRepublish = async (job) => {
    try {
      const res = await getRepublishRequestStatus(job.id);
      const reqStatus = res?.Request?.status;
      if (reqStatus === 'PENDING') {
        showToast('info', "Your republish request is awaiting your Company Admin's review.");
        return;
      }
      if (reqStatus === 'APPROVED') {
        showToast('success', 'Your request was approved — refreshing.');
        await refresh(); return;
      }
      setRepublishJobNote(reqStatus === 'REJECTED' ? (res?.Request?.admin_note || null) : null);
      setRepublishJob(job);
    } catch (err) { showToast('error', err.message || 'Failed to check republish status'); }
  };

  const handleRepublishSubmit = async (reason) => {
    if (!republishJob) return;
    await requestRepublish(republishJob.id, reason);
    showToast('success', 'Republish request sent to your Company Admin.');
    setRepublishJob(null); setRepublishJobNote(null);
  };

  const handleSubmitForApproval = async (job) => {
    try { await submitForApproval(job.id); showToast('success', 'Sent to Company Admin for approval'); }
    catch (err) { showToast('error', err.message || 'Failed to submit for approval'); }
  };
  const handlePublish = async (job) => {
    try { await publishJob(job.id); showToast('success', 'Job published'); }
    catch (err) { showToast('error', err.message || 'Failed to publish job'); }
  };
  const handleUnpublish = async (job) => {
    try { await unpublishJob(job.id); showToast('success', 'Job unpublished'); }
    catch (err) { showToast('error', err.message || 'Failed to unpublish job'); }
  };

  /* ── Search actions (mirror FindJobs) ────────────────────── */
  const handleClearSearch = () => setSearchQuery('');

  const handleClearFilters = () => {
    const cleared = { city: '', jobType: [], workMode: [], applicantsRange: [0, 500] };
    setFilters(cleared);
    setFilterDrawerOpen(false);
  };

  const activeFilterCount =
    (filters.city ? 1 : 0)
    + filters.jobType.length
    + filters.workMode.length
    + ((filters.applicantsRange[0] !== 0 || filters.applicantsRange[1] !== 500) ? 1 : 0);

  const filterChipSx = {
    bgcolor: BRAND.navySoft, color: BRAND.navy,
    border: `1px solid ${BRAND.navySoft}`,
    fontWeight: 500, fontSize: '0.8125rem', height: 30, borderRadius: 1,
    '& .MuiChip-deleteIcon': {
      color: BRAND.navy, opacity: 0.65, fontSize: 16,
      '&:hover': { opacity: 1, color: BRAND.navy },
    },
    '&:hover': { bgcolor: BRAND.navySoftHover },
  };

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      bgcolor: '#fff', borderRadius: 1.25, fontSize: '0.875rem',
      '& fieldset':                { borderColor: BRAND.border },
      '&:hover fieldset':          { borderColor: BRAND.borderStrong },
      '&.Mui-focused fieldset':    { borderColor: BRAND.navy, borderWidth: 1.5 },
    },
    '& .MuiInputLabel-root':       { fontSize: '0.875rem', color: BRAND.muted,
                                     '&.Mui-focused':      { color: BRAND.navy } },
  };

  const pillSx = (active) => ({
    cursor: 'pointer',
    px: 1.75, py: 0.85, borderRadius: 999,
    border: `1px solid ${active ? BRAND.navy : BRAND.border}`,
    bgcolor: active ? BRAND.navy : '#fff',
    color:   active ? '#fff'     : BRAND.ink,
    fontSize: '0.8125rem', fontWeight: active ? 600 : 500,
    transition: 'all 0.18s ease', userSelect: 'none',
    '&:hover': { borderColor: BRAND.navy, bgcolor: active ? BRAND.navyDark : BRAND.navySoft },
  });

  const togglePill = (key, value) => {
    setFilters((prev) => {
      const current = Array.isArray(prev[key]) ? prev[key] : [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [key]: next };
    });
  };

  const removeFilterValue = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: (Array.isArray(prev[key]) ? prev[key] : []).filter((v) => v !== value),
    }));
  };

  /* ── Render ───────────────────────────────────────────── */
  return (
    <Box sx={{
      p: { xs: 1.5, sm: 2, md: 3, lg: 4 },
      maxWidth: 1440, mx: 'auto', bgcolor: BRAND.bg, minHeight: '100vh',
      fontFamily: FONT,
      '& .MuiTypography-root, & .MuiButton-root, & .MuiToggleButton-root, & .MuiChip-root, & .MuiInputBase-root, & .MuiMenuItem-root, & .MuiPaginationItem-root': {
        fontFamily: FONT,
      },
    }}>

      {/* ══ COMMAND HEADER ══════════════════════════════════════════ */}
      <Paper elevation={0} sx={{
        bgcolor: BRAND.surface, border: `1px solid ${BRAND.border}`,
        borderRadius: { xs: '14px', sm: '16px' },
        p: { xs: 2, sm: 2.5, md: 3 },
        mb: { xs: 2, md: 2.5 },
        boxShadow: '0 1px 2px rgba(16,18,16,0.04)',
      }}>
        {/* Row 1 — title + subline + Post-a-job CTA + refresh */}
        <Stack direction="row"
          sx={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5, mb: { xs: 2, md: 2.25 } }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography component="h1" sx={{
              fontWeight: 700, color: BRAND.ink,
              letterSpacing: '-0.02em', lineHeight: 1.15,
              fontSize: { xs: '1.3rem', sm: '1.45rem', md: '1.6rem' },
            }}>
              My Jobs
            </Typography>
            <Typography sx={{ color: BRAND.muted, fontSize: { xs: '0.82rem', sm: '0.9rem' }, fontWeight: 500, mt: 0.5 }}>
              <Box component="span" sx={{ color: BRAND.sageText, fontWeight: 700 }}>
                {jobs.length} {jobs.length === 1 ? 'posting' : 'postings'}
              </Box>
              {' '}{statusFilter === 'all'
                ? 'across your pipeline'
                : `in ${STATUS_FILTER_OPTIONS.find((o) => o.value === statusFilter)?.label || statusFilter}`
              } · {companyName || 'your company'}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', mt: 0.25, flexShrink: 0 }}>
            <Tooltip title="Refresh" arrow>
              <span>
                <IconButton
                  onClick={refresh}
                  disabled={loading}
                  size="small"
                  sx={{
                    color: BRAND.muted, border: `1px solid ${BRAND.borderStrong}`,
                    borderRadius: '9px',
                    '&:hover': { bgcolor: BRAND.sageSoft, color: BRAND.navy, borderColor: BRAND.sage },
                  }}>
                  <RefreshOutlined sx={{ fontSize: 18 }} />
                </IconButton>
              </span>
            </Tooltip>
            <Button
              variant="contained" disableElevation
              startIcon={<PostAddRounded sx={{ fontSize: 18 }} />}
              onClick={handleOpenCreate}
              sx={{
                bgcolor: BRAND.navy, color: '#fff', textTransform: 'none',
                fontWeight: 700, fontSize: '0.88rem',
                borderRadius: '12px', px: 2.25, height: { xs: 40, md: 42 },
                boxShadow: '0 4px 12px rgba(2,33,36,0.22)',
                '&:hover': { bgcolor: BRAND.navyDark, boxShadow: '0 6px 18px rgba(2,33,36,0.28)' },
              }}>
              Post a Job
            </Button>
          </Stack>
        </Stack>

        {/* Row 2 — search + Filters button */}
        <Stack direction="row" spacing={1} sx={{ alignItems: 'stretch', flexWrap: 'wrap', gap: 1 }}>
          <TextField
            placeholder="Search by role title or location"
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
                    <IconButton size="small" onClick={handleClearSearch} aria-label="Clear search"
                      sx={{ color: BRAND.muted, '&:hover': { color: BRAND.ink, bgcolor: 'rgba(16,18,16,0.05)' } }}>
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
                fontSize: { xs: '0.88rem', sm: '0.92rem' },
                height: { xs: 46, md: 48 },
                color: BRAND.ink, fontFamily: FONT,
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                '& input::placeholder':        { color: BRAND.muted, opacity: 0.85 },
                '& fieldset':                   { borderColor: '#B0BEC5', borderWidth: '1.5px' },
                '&:hover fieldset':             { borderColor: '#78909C', borderWidth: '2px' },
                '&.Mui-focused':                { boxShadow: '0 6px 18px rgba(0,0,0,0.12)' },
                '&.Mui-focused fieldset':       { borderColor: BRAND.sage, borderWidth: '2px' },
              },
            }}
          />
          <Button
            variant="outlined"
            startIcon={
              <Badge badgeContent={activeFilterCount}
                sx={{
                  '& .MuiBadge-badge': {
                    bgcolor: BRAND.sage, color: '#fff',
                    fontSize: '0.65rem', height: 16, minWidth: 16, right: -3, top: -2, fontWeight: 800,
                  },
                }}>
                <TuneRounded sx={{ fontSize: 18 }} />
              </Badge>
            }
            onClick={() => setFilterDrawerOpen(true)}
            sx={{
              bgcolor: BRAND.surface, borderColor: BRAND.borderStrong, color: BRAND.ink,
              textTransform: 'none', fontWeight: 600, fontSize: '0.9rem', px: 2.25,
              height: { xs: 46, md: 48 }, borderRadius: '12px', flexShrink: 0,
              '&:hover': { borderColor: BRAND.sage, bgcolor: BRAND.sageSoft },
            }}>
            Filters
          </Button>
        </Stack>

        {/* Row 3 — status pills (left) + sort & view (right) */}
        <Stack direction="row"
          sx={{ alignItems: 'center', mt: { xs: 1.75, md: 2 }, gap: 1, flexWrap: 'wrap' }}>
         
          <Box sx={{ mr: 'auto', flexShrink: 0 }}>
            {(() => {
              const activeOpt = STATUS_FILTER_OPTIONS.find(
                (o) => o.value === statusFilter,
              ) || STATUS_FILTER_OPTIONS[0];
              const activeLabel = activeOpt.value === 'all'
                ? 'All Jobs'
                : activeOpt.label;
              const activeCount = counts[activeOpt.value] ?? '—';
              const menuOpen    = Boolean(statusMenuAnchor);
              return (
                <>
                  <Button
                    onClick={(e) => setStatusMenuAnchor(e.currentTarget)}
                    endIcon={
                      <KeyboardArrowDownRounded
                        sx={{
                          fontSize: 20,
                          transition: 'transform 0.18s ease',
                          transform: menuOpen ? 'rotate(180deg)' : 'none',
                        }}
                      />
                    }
                    disableElevation disableRipple={false}
                    sx={{
                      height: 40, minHeight: 40,
                      px: 2, py: 0,
                      borderRadius: 999,
                      textTransform: 'none',
                      fontFamily: FONT,
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      color: BRAND.ink,
                      bgcolor: BRAND.surface,
                      border: `1.5px solid ${
                        menuOpen ? BRAND.sageText : BRAND.sage
                      }`,
                      boxShadow: 'none',
                      gap: 0.75,
                      transition: 'border-color 0.16s ease, background-color 0.16s ease',
                      '&:hover': {
                        bgcolor: BRAND.sageSoft,
                        borderColor: BRAND.sageText,
                        boxShadow: 'none',
                      },
                      '& .MuiButton-endIcon': {
                        ml: 0.5, color: BRAND.sageText,
                      },
                    }}
                  >
                    {activeLabel}
                    <Box
                      component="span"
                      sx={{
                        ml: 0.9,
                        px: 0.9,
                        py: 0.15,
                        borderRadius: 999,
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        lineHeight: 1.4,
                        bgcolor: BRAND.sageSoft,
                        color: BRAND.sageText,
                        minWidth: 22,
                        textAlign: 'center',
                      }}
                    >
                      {activeCount}
                    </Box>
                  </Button>
                  <Menu
                    anchorEl={statusMenuAnchor}
                    open={menuOpen}
                    onClose={() => setStatusMenuAnchor(null)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                    slotProps={{
                      paper: {
                        elevation: 0,
                        sx: {
                          mt: 1,
                          minWidth: 240,
                          borderRadius: '14px',
                          border: `1px solid ${BRAND.border}`,
                          boxShadow: '0 12px 32px rgba(16,18,16,0.10)',
                          overflow: 'hidden',
                          p: 0.5,
                        },
                      },
                    }}
                    MenuListProps={{
                      dense: true,
                      sx: { py: 0 },
                    }}
                  >
                    {STATUS_FILTER_OPTIONS.map((opt) => {
                      const chipCount = counts[opt.value] ?? '—';
                      const selected  = statusFilter === opt.value;
                      const label     = opt.value === 'all' ? 'All Jobs' : opt.label;
                      return (
                        <MenuItem
                          key={opt.value}
                          selected={selected}
                          onClick={() => {
                            setStatusFilter(opt.value);
                            setStatusMenuAnchor(null);
                          }}
                          sx={{
                            fontFamily: FONT,
                            fontSize: '0.85rem',
                            fontWeight: selected ? 700 : 500,
                            color: selected ? BRAND.navy : BRAND.ink,
                            borderRadius: '10px',
                            mx: 0.25, my: 0.15,
                            py: 0.9, px: 1.2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 1.25,
                            transition: 'background-color 0.14s ease',
                            '&.Mui-selected': {
                              bgcolor: BRAND.sageSoft,
                            },
                            '&.Mui-selected:hover': {
                              bgcolor: BRAND.navySoftHover,
                            },
                            '&:hover': {
                              bgcolor: BRAND.bg,
                            },
                          }}
                        >
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                              minWidth: 0,
                            }}
                          >
                            <Box
                              sx={{
                                width: 6, height: 6, borderRadius: '50%',
                                bgcolor: selected ? BRAND.sage : 'transparent',
                                border: selected
                                  ? 'none'
                                  : `1.5px solid ${BRAND.border}`,
                                flexShrink: 0,
                              }}
                            />
                            <Box
                              component="span"
                              sx={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {label}
                            </Box>
                          </Box>
                          <Box
                            component="span"
                            sx={{
                              px: 0.9, py: 0.15,
                              borderRadius: 999,
                              fontSize: '0.7rem',
                              fontWeight: 800,
                              lineHeight: 1.4,
                              bgcolor: selected ? BRAND.sage : BRAND.bg,
                              color: selected ? '#fff' : BRAND.muted,
                              minWidth: 24,
                              textAlign: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {chipCount}
                          </Box>
                        </MenuItem>
                      );
                    })}
                  </Menu>
                </>
              );
            })()}
          </Box>

          <TextField
            select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
            sx={{
              minWidth: 170, flexShrink: 0,
              '& .MuiOutlinedInput-root': {
                bgcolor: BRAND.surface, borderRadius: '10px',
                fontSize: '0.82rem', height: 38, color: BRAND.ink, fontFamily: FONT,
                '& fieldset':                { borderColor: BRAND.borderStrong },
                '&:hover fieldset':          { borderColor: BRAND.muted },
                '&.Mui-focused fieldset':    { borderColor: BRAND.sage, borderWidth: 1.5 },
                '& .MuiSvgIcon-root':        { color: BRAND.muted },
              },
            }}>
            {SORT_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value} sx={{ fontSize: '0.85rem', fontFamily: FONT }}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>

          <ToggleButtonGroup
            value={viewMode} exclusive
            onChange={(e, newMode) => {
              if (!newMode) return;
              setViewMode(newMode);
              try { localStorage.setItem(LS_VIEW_MODE_KEY, newMode); } catch {}
            }}
            sx={{
              height: 38, flexShrink: 0,
              bgcolor: BRAND.bg, border: `1px solid ${BRAND.border}`,
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
            }}>
            <ToggleButton value="grid" aria-label="grid view"><ViewModule sx={{ fontSize: 18 }} /></ToggleButton>
            <ToggleButton value="list" aria-label="list view"><ViewList  sx={{ fontSize: 18 }} /></ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Paper>

      {/* ══ ERROR ══════════════════════════════════════════ */}
      {loadError && (
        <Alert severity="error"
          sx={{ mb: 3, borderRadius: '12px', border: '1px solid', borderColor: 'error.light', fontFamily: FONT }}>
          {loadError}
        </Alert>
      )}

      {/* ══ ACTIVE FILTER CHIPS ═══════════════════════════ */}
      {(filters.city || filters.jobType.length || filters.workMode.length
        || filters.applicantsRange[0] !== 0 || filters.applicantsRange[1] !== 500) && (
        <Stack direction="row" spacing={1} sx={{ mb: 2.5, flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
          <Typography variant="caption" sx={{ color: BRAND.muted, fontWeight: 500, mr: 0.5 }}>
            Active filters:
          </Typography>
          {filters.city && (
            <Chip label={`City: ${filters.city}`} onDelete={() => setFilters((p) => ({ ...p, city: '' }))} sx={filterChipSx} />
          )}
          {filters.workMode.map((mode) => (
            <Chip key={`mode-${mode}`} label={`Mode: ${mode}`} onDelete={() => removeFilterValue('workMode', mode)} sx={filterChipSx} />
          ))}
          {filters.jobType.map((type) => (
            <Chip key={`type-${type}`} label={`Type: ${type}`} onDelete={() => removeFilterValue('jobType', type)} sx={filterChipSx} />
          ))}
          {(filters.applicantsRange[0] !== 0 || filters.applicantsRange[1] !== 500) && (
            <Chip
              label={`Applicants: ${filters.applicantsRange[0]}–${filters.applicantsRange[1]}`}
              onDelete={() => setFilters((p) => ({ ...p, applicantsRange: [0, 500] }))}
              sx={filterChipSx}
            />
          )}
          <Button size="small" onClick={handleClearFilters}
            sx={{
              textTransform: 'none', color: BRAND.muted,
              fontSize: '0.8125rem', fontWeight: 500, minWidth: 'auto',
              '&:hover': { color: BRAND.navy, bgcolor: 'transparent' },
            }}>
            Clear all
          </Button>
        </Stack>
      )}

      {/* ══ RESULTS ═════════════════════════════════════════ */}
      {loading ? (
        <Paper elevation={0} sx={{
          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
          minHeight: 420, borderRadius: 1.5, border: `1px solid ${BRAND.border}`, bgcolor: '#fff',
        }}>
          <CircularProgress size={36} sx={{ color: BRAND.sage }} />
          <Typography variant="body2" sx={{ mt: 2, color: BRAND.muted, fontSize: '0.875rem' }}>
            Loading your postings…
          </Typography>
        </Paper>
      ) : sortedJobs.length === 0 ? (
        <Paper elevation={0} sx={{
          textAlign: 'center', py: 8, px: 3,
          borderRadius: 1.5, border: `1px solid ${BRAND.border}`, bgcolor: '#fff',
        }}>
          <Box sx={{
            width: 64, height: 64, borderRadius: '50%',
            bgcolor: BRAND.sageSoft, mx: 'auto', mb: 2.5,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <WorkOutlineRounded sx={{ fontSize: 30, color: BRAND.sage }} />
          </Box>
          {searchQuery || activeFilterCount > 0 ? (
            <>
              <Typography variant="h6" sx={{ fontWeight: 700, color: BRAND.ink, mb: 0.75, fontSize: '1.0625rem' }}>
                No jobs match your search
              </Typography>
              <Typography variant="body2" sx={{ color: BRAND.muted, mb: 3, fontSize: '0.875rem' }}>
                Try adjusting your search criteria or clearing some filters
              </Typography>
              <Button variant="outlined" onClick={() => { setSearchQuery(''); handleClearFilters(); }}
                sx={{
                  borderColor: BRAND.navy, color: BRAND.navy,
                  textTransform: 'none', fontWeight: 500, px: 3, borderRadius: 1.25,
                  '&:hover': { borderColor: BRAND.navyDark, bgcolor: BRAND.navySoft },
                }}>
                Clear filters
              </Button>
            </>
          ) : statusFilter !== 'all' && jobs.length === 0 ? (
            <>
              <Typography variant="h6" sx={{ fontWeight: 700, color: BRAND.ink, mb: 0.75, fontSize: '1.0625rem' }}>
                Nothing in {STATUS_FILTER_OPTIONS.find((o) => o.value === statusFilter)?.label || statusFilter}
              </Typography>
              <Typography variant="body2" sx={{ color: BRAND.muted, mb: 3, fontSize: '0.875rem' }}>
                Switch to All to see every posting, or post a new job
              </Typography>
              <Button variant="outlined" onClick={() => setStatusFilter('all')}
                sx={{
                  borderColor: BRAND.navy, color: BRAND.navy,
                  textTransform: 'none', fontWeight: 500, px: 3, borderRadius: 1.25,
                  '&:hover': { borderColor: BRAND.navyDark, bgcolor: BRAND.navySoft },
                }}>
                Show all postings
              </Button>
            </>
          ) : (
            <>
              <Typography variant="h6" sx={{ fontWeight: 700, color: BRAND.ink, mb: 0.75, fontSize: '1.0625rem' }}>
                No jobs yet
              </Typography>
              <Typography variant="body2" sx={{ color: BRAND.muted, mb: 3, fontSize: '0.875rem' }}>
                Post your first role to start receiving applicants
              </Typography>
              <Button variant="contained" onClick={handleOpenCreate} disableElevation startIcon={<Add />}
                sx={{
                  bgcolor: BRAND.navy, color: '#fff',
                  textTransform: 'none', fontWeight: 700, px: 3, borderRadius: '12px',
                  '&:hover': { bgcolor: BRAND.navyDark },
                }}>
                Post your first job
              </Button>
            </>
          )}
        </Paper>
      ) : (
        <>
      
          {viewMode === 'list' && paginatedJobs.length > 0 && (
            <Box sx={{
              display: { xs: 'none', md: 'grid' },
              gridTemplateColumns: '2.4fr 1.1fr 1fr 0.9fr 1.1fr 150px',
              alignItems: 'center',
              px: 2.5, py: 1, gap: 2,
              mb: 0.75,
            }}>
              {['Role', 'Location', 'Type', 'Applicants', 'Salary', ''].map((h) => (
                <Typography key={h || 'actions'} sx={{
                  fontSize: '0.68rem', fontWeight: 800, color: BRAND.muted,
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  fontFamily: FONT,
                }}>
                  {h}
                </Typography>
              ))}
            </Box>
          )}

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
            {paginatedJobs.map((job) => (
              <Box key={job.id} sx={{ minWidth: 0, width: '100%' }}>
                <JobCard
                  job={job}
                  viewMode={viewMode}
                  isAdmin={isAdmin}
                  onView={handleView}
                  onEdit={handleEdit}
                  onViewApplicants={handleViewApplicants}
                  onSubmitApproval={handleSubmitForApproval}
                  onPublish={handlePublish}
                  onUnpublish={handleUnpublish}
                  onRequestRepublish={handleRequestRepublish}
                />
              </Box>
            ))}
          </Box>

          {/* Pagination bar */}
          {sortedJobs.length > 0 && (
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
                    {(page - 1) * effectivePageSize + 1}–{Math.min(page * effectivePageSize, sortedJobs.length)}
                  </Box>
                  {' '}of{' '}
                  <Box component="span" sx={{ color: BRAND.ink, fontWeight: 700 }}>
                    {sortedJobs.length}
                  </Box>
                  {' '}{sortedJobs.length === 1 ? 'posting' : 'postings'}
                </Typography>

                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                  <Typography sx={{
                    fontSize: { xs: '0.78rem', sm: '0.82rem' },
                    color: BRAND.muted, fontWeight: 500,
                  }}>Show</Typography>
                  <Select
                    size="small"
                    value={pageSize}
                    onChange={(e) => {
                      const v = e.target.value;
                      setPageSize(v === 'all' ? 'all' : Number(v));
                    }}
                    renderValue={(v) => (v === 'all' ? 'All' : v)}
                    MenuProps={{
                      slotProps: { paper: { sx: {
                        borderRadius: '12px', mt: 0.5,
                        border: `1px solid ${BRAND.border}`,
                        boxShadow: '0 8px 24px rgba(2,33,36,0.12)',
                        '& .MuiMenuItem-root': {
                          fontSize: '0.82rem', fontWeight: 600, fontFamily: FONT,
                          color: BRAND.ink, minHeight: { xs: 40, sm: 36 },
                          '&.Mui-selected': {
                            bgcolor: BRAND.navySoft, color: BRAND.navy,
                            '&:hover': { bgcolor: BRAND.navySoft },
                          },
                        },
                      }, }, },
                    }}
                    sx={{
                      fontSize: '0.82rem', fontWeight: 700, fontFamily: FONT,
                      color: BRAND.navy, bgcolor: BRAND.bg, borderRadius: '10px',
                      minWidth: { xs: 76, sm: 80 }, height: { xs: 38, sm: 36 },
                      '& .MuiOutlinedInput-notchedOutline':                    { borderColor: BRAND.border },
                      '&:hover .MuiOutlinedInput-notchedOutline':              { borderColor: BRAND.navy },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline':        { borderColor: BRAND.navy, borderWidth: '1px' },
                      '& .MuiSelect-select': { py: 0.75, pl: 1.25, pr: '28px !important' },
                      '& .MuiSvgIcon-root':  { color: BRAND.navy },
                    }}
                  >
                    {PAGE_SIZE_OPTIONS.map((opt) => (
                      <MenuItem key={opt} value={opt}>{opt === 'all' ? 'All' : opt}</MenuItem>
                    ))}
                  </Select>
                  <Typography sx={{
                    fontSize: { xs: '0.78rem', sm: '0.82rem' },
                    color: BRAND.muted, fontWeight: 500,
                  }}>per page</Typography>
                </Stack>
              </Stack>

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
                    fontWeight: 600, fontFamily: FONT, color: BRAND.ink,
                    borderRadius: '8px', border: `1px solid ${BRAND.border}`,
                    bgcolor: BRAND.bg,
                    minWidth: { xs: 32, sm: 36 }, height: { xs: 32, sm: 36 },
                    '&:hover':      { bgcolor: BRAND.navySoft, borderColor: BRAND.sage },
                    '&.Mui-selected': {
                      bgcolor: BRAND.navy, color: '#fff', borderColor: BRAND.navy,
                      fontWeight: 700, boxShadow: '0 4px 12px rgba(2,33,36,0.2)',
                      '&:hover': { bgcolor: BRAND.navyDark },
                    },
                  },
                  '& .MuiPaginationItem-ellipsis': { border: 'none', bgcolor: 'transparent' },
                }}
              />
            </Box>
          )}
        </>
      )}

      {/* ══ FILTER DRAWER ══════════════════════════════════════════ */}
      <Drawer
        anchor="right" open={filterDrawerOpen} onClose={() => setFilterDrawerOpen(false)}
        slotProps={{
          paper: {
            sx: {
              width: { xs: '100%', sm: 420 },
              bgcolor: '#fff', borderRadius: { xs: 0, sm: '20px 0 0 20px' },
              fontFamily: FONT,
              '& .MuiTypography-root, & .MuiButton-root, & .MuiInputBase-root': { fontFamily: FONT },
            },
          },
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Drawer Header */}
          <Box sx={{
            px: 3, py: 2.5, borderBottom: `1px solid ${BRAND.border}`,
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
                  Refine Postings
                </Typography>
                <Typography sx={{ fontSize: '0.75rem', color: BRAND.muted, mt: 0.25 }}>
                  {activeFilterCount > 0
                    ? `${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''} applied`
                    : 'Narrow down your postings'}
                </Typography>
              </Box>
            </Stack>
            <IconButton size="small" onClick={() => setFilterDrawerOpen(false)}
              sx={{
                color: BRAND.muted, bgcolor: '#fff', border: `1px solid ${BRAND.border}`,
                '&:hover': { bgcolor: BRAND.navySoft, color: BRAND.navy, borderColor: BRAND.navy },
              }}>
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

            <Divider sx={{ borderColor: BRAND.border, mb: 3 }} />

            <DrawerSection icon={<GroupsRounded sx={{ fontSize: 16 }} />} title="Applicants Range" last>
              <Box sx={{ px: 0.5 }}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 1.5 }}>
                  <Box sx={{ px: 1.25, py: 0.5, borderRadius: 1, bgcolor: BRAND.navySoft, color: BRAND.navy, fontSize: '0.75rem', fontWeight: 600 }}>
                    {applDraft[0]} min
                  </Box>
                  <Typography sx={{ fontSize: '0.75rem', color: BRAND.muted, alignSelf: 'center' }}>to</Typography>
                  <Box sx={{ px: 1.25, py: 0.5, borderRadius: 1, bgcolor: BRAND.navySoft, color: BRAND.navy, fontSize: '0.75rem', fontWeight: 600 }}>
                    {applDraft[1] === 500 ? '500+' : applDraft[1]}
                  </Box>
                </Stack>
                <Slider
                  value={applDraft}
                  onChange={(_, v) => setApplDraft(v)}
                  onChangeCommitted={(_, v) => setFilters((prev) => ({ ...prev, applicantsRange: v }))}
                  valueLabelDisplay="auto" min={0} max={500} step={5}
                  sx={sliderSx}
                />
              </Box>
            </DrawerSection>
          </Box>

          {/* Drawer footer */}
          <Box sx={{
            px: { xs: 2, sm: 3 }, py: { xs: 1.75, sm: 2.25 },
            pb: { xs: 'calc(1.75rem + env(safe-area-inset-bottom, 0px))', sm: 2.25 },
            borderTop: `1px solid ${BRAND.border}`, bgcolor: '#fff',
            display: 'flex',
            flexDirection: { xs: 'column-reverse', sm: 'row' },
            gap: { xs: 1, sm: 1.5 }, alignItems: 'stretch',
          }}>
            <Button
              onClick={handleClearFilters}
              sx={{
                textTransform: 'none', fontWeight: 600, color: BRAND.muted,
                fontSize: { xs: '0.82rem', sm: '0.875rem' },
                borderRadius: '12px', border: `1px solid ${BRAND.border}`,
                px: { xs: 2, sm: 2.5 }, py: { xs: 1.1, sm: 1.15 },
                minHeight: { xs: 44, sm: 'auto' },
                width: { xs: '100%', sm: 'auto' }, flexShrink: 0,
                '&:hover': { bgcolor: BRAND.navySoft, color: BRAND.navy, borderColor: BRAND.navy },
              }}>
              Reset all
            </Button>
            <Button
              variant="contained" fullWidth disableElevation
              onClick={() => setFilterDrawerOpen(false)}
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
              }}>
              Apply filters
              {activeFilterCount > 0 && (
                <Box component="span" sx={{
                  ml: 1, px: 0.85, py: 0.1, borderRadius: 999,
                  bgcolor: 'rgba(127,158,126,0.3)', color: '#fff',
                  fontSize: '0.7rem', fontWeight: 800,
                }}>
                  {activeFilterCount}
                </Box>
              )}
            </Button>
          </Box>
        </Box>
      </Drawer>

      {/* ══ DIALOGS (backend contract unchanged) ═════════════════════ */}
      <JobFormDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setViewingJob(null); setEditingJob(null); }}
        onSubmit={handleFormSubmit}
        initialData={editingJob || viewingJob}
        isEditing={!!editingJob}
        readOnly={!!viewingJob}
        companyId={companyId}
        companyName={companyName}
        currentUserRole={currentUserRole}
      />

      <RequestEditAccessDialog
        open={!!requestJob}
        onClose={() => { setRequestJob(null); setRequestJobNote(null); }}
        onSubmit={handleRequestSubmit}
        job={requestJob}
        previousRejectionNote={requestJobNote}
      />

      <RequestRepublishDialog
        open={!!republishJob}
        onClose={() => { setRepublishJob(null); setRepublishJobNote(null); }}
        onSubmit={handleRepublishSubmit}
        job={republishJob}
        previousRejectionNote={republishJobNote}
      />

      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={toast.severity}
          onClose={() => setToast((t) => ({ ...t, open: false }))}
          sx={{ borderRadius: '12px', fontFamily: FONT }}
        >
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default MyJobs;