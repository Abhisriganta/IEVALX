import React, { useState, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import {
  Box, Typography, CircularProgress, Button, Stack, Chip,
  Alert, IconButton, Tooltip, Dialog, Avatar,
  LinearProgress, Collapse, Checkbox,
  useMediaQuery, useTheme,
  Paper, TextField, InputAdornment,
  ToggleButton, ToggleButtonGroup,
  Pagination, Select, MenuItem,
} from '@mui/material';
import {
  Refresh, Assignment, BarChart, Schedule, CheckCircle,
  HowToReg, Groups, Monitor, DeleteOutlined,
  PlayArrow, Work, ExpandMore, ExpandLess,
  Delete,
  ArrowBack, ArrowForward, ArrowForwardRounded, Search, ClearRounded, Add,
  ViewList, ViewModule, GroupsRounded,
  WorkOutlineRounded,
} from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';

// ── Hooks + services ──────────────────────────────────────────────────────────
import { useCandidates } from '../../../hooks/employer/useCandidates';
import applicantService  from '../../../services/api/employer/ApplicantService';
import { interviewAPI }  from '../../../services/api/employer/candidateService';
import jobService        from '../../../services/api/employer/jobService';
import axiosInstance     from '../../../services/api/axiosInstance';
import jobseekerService  from '../../../services/api/jobseeker/jobseekerService';
// ── Split components ──────────────────────────────────────────────────────────
import {
  CandidateCard, CandidateDetailDialog, CandidateFilters, ACTIONED_STATUSES,
} from './CandidateCard';
import {
  ManagePipelineDialog,
  BulkHireDialog, CloseProcessDialog, HiringDialog,
  STATUS_CHIP, ROUND_TYPE_CFG,
} from './Pipeline';
import ScheduleDialog from './Schedule';
import { FeedbackPreview, ResultPreview, LiveScore } from '../InterviewRounds/Results';
import InterviewWizard from './Interviews';

// ─────────────────────────────────────────────────────────────────────────────
// ── SAGE / PINE BRAND PALETTE (mirrors My Jobs so this page feels native) ────
// ─────────────────────────────────────────────────────────────────────────────
const FONT = "'Jost','DM Sans',sans-serif";

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

// ── Jobs-level status filter pills (mirrors My Jobs status pills) ───────────
const JOB_STATUS_FILTERS = [
  { value: 'all',     label: 'All Jobs' },
  { value: 'pending', label: 'Has Pending' },
  { value: 'done',    label: 'All Scheduled' },
  { value: 'none',    label: 'Not Scheduled' },
];

// ── Sort options (My Jobs uses Newest/Deadline/Most-Least Applicants) ───────
const SORT_OPTIONS = [
  { value: 'title-asc',    label: 'Job Title (A–Z)' },
  { value: 'most-cand',    label: 'Most Candidates' },
  { value: 'fewest-cand',  label: 'Fewest Candidates' },
  { value: 'most-pending', label: 'Most Pending' },
  { value: 'most-sched',   label: 'Most Scheduled' },
];

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50, 'all'];
const DEFAULT_PAGE_SIZE = 10;

const LS_JOBS_VIEW_KEY  = 'ievalx_candidates_jobs_view_mode';
const LS_CANDS_VIEW_KEY = 'ievalx_candidates_cands_view_mode_v2';

// Candidate-level status filter (used inside the drill-down candidates view)
const CAND_STATUS_FILTERS = [
  { value: 'all',     label: 'All' },
  { value: 'sched',   label: 'Scheduled' },
  { value: 'nosched', label: 'Pending' },
];

// Candidate-level sort options (used inside the drill-down candidates view)
const CAND_SORT_OPTIONS = [
  { value: 'name-asc',       label: 'Name (A–Z)' },
  { value: 'name-desc',      label: 'Name (Z–A)' },
  { value: 'exp-desc',       label: 'Experience (High→Low)' },
  { value: 'exp-asc',        label: 'Experience (Low→High)' },
  { value: 'status-sched',   label: 'Scheduled first' },
  { value: 'status-pending', label: 'Pending first' },
];

// ── jobsAPI ───────────────────────────────────────────────────────────────────
const jobsAPI = {
  getMyJobs: () =>
    jobService.listMyJobs()
      .then(response => {
        const payload = response?.data ?? response;
        const raw = Array.isArray(payload)
          ? payload
          : (payload?.jobs ?? payload?.results ?? payload?.data ?? []);
        return { data: Array.isArray(raw) ? raw : [] };
      })
      .catch(err => { console.error('[jobsAPI.getMyJobs]', err?.message); return { data: [] }; }),
  getApplicants: (jobId, params = {}) =>
    applicantService.listByJob(jobId, params?.status || '')
      .then(response => {
        const raw = Array.isArray(response)
          ? response
          : (response?.Applications ?? response?.results ?? response?.data ?? []);
        return { data: Array.isArray(raw) ? raw : [] };
      })
      .catch(err => { console.error(`[jobsAPI.getApplicants] job_id=${jobId}`, err?.message); return { data: [] }; }),
};

// ── Pure-UI helpers ───────────────────────────────────────────────────────────
const fmt = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};
const fmtDT = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const TYPE_ICON  = { 'ai-powered': '🤖', document: '📄', 'live-video': '🎥', aptitude: '📝' };
const TYPE_COLOR = { 'ai-powered': '#7C3AED', document: '#0284C7', 'live-video': '#16A34A', aptitude: '#ea580c' };

const DIFFICULTY_CFG = {
  fresher: { label: 'Fresher', color: BRAND.sageText, bg: BRAND.sageSoft },
  junior:  { label: 'Junior',  color: '#3E6E7A',      bg: '#E4EEF0' },
  mid:     { label: 'Mid',     color: BRAND.amber,    bg: BRAND.amberSoft },
  senior:  { label: 'Senior',  color: BRAND.navy,     bg: 'rgba(127,158,126,0.16)' },
  expert:  { label: 'Expert',  color: BRAND.err,      bg: BRAND.errSoft },
};

const StatCard = React.memo(function StatCard({ label, value, color, icon }) {
  return (
    <Box sx={{
      minWidth: { xs: 96, sm: 116, md: 'unset' },
      flex:     { xs: '0 0 auto', md: '1 1 0' },
      maxWidth: { md: 220, xl: 240 },
      p: { xs: 1.2, sm: 1.5, md: 1.8, lg: 2, xl: 2.25 },
      bgcolor: BRAND.surface,
      borderRadius: { xs: '11px', sm: '12px', xl: '14px' },
      border: `1px solid ${BRAND.border}`,
      borderTop: `2.5px solid ${color}`,
      boxShadow: '0 1px 2px rgba(16,18,16,0.04), 0 6px 16px rgba(16,18,16,0.06)',
      transition: 'all 0.18s ease',
      fontFamily: FONT,
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 3px 10px rgba(16,18,16,0.08), 0 10px 24px rgba(16,18,16,0.08)',
        borderColor: BRAND.borderStrong,
      },
      '@media (max-width: 240px)': { minWidth: 76, p: 0.9 },
    }}>
      <Box sx={{
        width:  { xs: 24, sm: 27, md: 29, lg: 31, xl: 34 },
        height: { xs: 24, sm: 27, md: 29, lg: 31, xl: 34 },
        borderRadius: { xs: '7px', sm: '8px', xl: '9px' },
        bgcolor: color + '1E',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        mb: { xs: 0.7, sm: 0.9, md: 1 },
        color,
        '& svg': { fontSize: { xs: 12, sm: 13, md: 15, lg: 16, xl: 18 } },
      }}>
        {icon}
      </Box>
      <Typography sx={{
        fontFamily: FONT,
        fontSize: { xs: '1.08rem', sm: '1.22rem', md: '1.35rem', lg: '1.45rem', xl: '1.55rem' },
        fontWeight: 800, color: BRAND.ink, lineHeight: 1, letterSpacing: '-0.01em',
      }}>
        {value}
      </Typography>
      <Typography sx={{
        fontFamily: FONT,
        fontSize: { xs: '0.6rem', sm: '0.64rem', md: '0.68rem', lg: '0.7rem', xl: '0.72rem' },
        color: BRAND.muted, fontWeight: 700, mt: 0.4,
        textTransform: 'uppercase', letterSpacing: '0.05em',
      }}>
        {label}
      </Typography>
    </Box>
  );
});

// ── Kept for API compatibility (no-op UI wrapper) ──────────────────────────
function TabPanel({ children, value, index }) {
  return value === index ? <Box sx={{ pt: { xs: 1.2, sm: 1.5, md: 2, xl: 2.5 } }}>{children}</Box> : null;
}

// ── SectionCard: My Jobs Paper feel (sage-tinted border, subtle shadow) ─────
function SectionCard({ children, sx = {} }) {
  return (
    <Box sx={{
      bgcolor: BRAND.surface,
      borderRadius: { xs: '13px', sm: '15px', xl: '16px' },
      border: `1px solid ${BRAND.border}`,
      boxShadow: '0 1px 2px rgba(16,18,16,0.04), 0 6px 16px rgba(16,18,16,0.05)',
      overflow: 'hidden',
      fontFamily: FONT,
      ...sx,
    }}>
      {children}
    </Box>
  );
}

// ── SectionHeader: title + optional count chip + subtitle + actions ─────────
function SectionHeader({ title, count, icon: Icon, iconColor = BRAND.navy, subtitle, actions }) {
  return (
    <Stack direction="row" justifyContent="space-between"
      alignItems={{ xs: 'flex-start', sm: 'center' }}
      sx={{
        px: { xs: 1.8, sm: 2.2, md: 2.6, xl: 3 },
        py: { xs: 1.3, sm: 1.6, md: 1.8, xl: 2 },
        borderBottom: `1px solid ${BRAND.border}`,
        gap: { xs: 0.7, sm: 1 },
        background: `linear-gradient(90deg, ${BRAND.sageSoft} 0%, ${BRAND.surface} 65%)`,
      }}>
      <Stack direction="row" spacing={{ xs: 1, sm: 1.3, md: 1.5 }} alignItems="center" sx={{ minWidth: 0 }}>
        {Icon && (
          <Box sx={{
            width:  { xs: 30, sm: 33, md: 35, xl: 38 },
            height: { xs: 30, sm: 33, md: 35, xl: 38 },
            borderRadius: { xs: '8px', sm: '9px' },
            bgcolor: iconColor + '18',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: iconColor, flexShrink: 0,
            '& svg': { fontSize: { xs: 14, sm: 16, md: 17, xl: 19 } },
          }}>
            <Icon />
          </Box>
        )}
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={0.8} alignItems="center" flexWrap="wrap">
            <Typography sx={{
              fontFamily: FONT,
              fontWeight: 700, color: BRAND.ink,
              fontSize: { xs: '0.85rem', sm: '0.92rem', md: '0.98rem', xl: '1.05rem' },
              letterSpacing: '-0.01em',
            }}>
              {title}
            </Typography>
            {count != null && (
              <Chip label={count} size="small" sx={{
                height:   { xs: 18, sm: 19, md: 20, xl: 22 },
                fontSize: { xs: '0.6rem', sm: '0.64rem', md: '0.66rem', xl: '0.7rem' },
                fontWeight: 800,
                bgcolor: BRAND.sageSoft, color: BRAND.sageText,
                border: `0.5px solid rgba(127,158,126,0.4)`,
                fontFamily: FONT,
                '& .MuiChip-label': { px: 0.9 },
              }} />
            )}
          </Stack>
          {subtitle && (
            <Typography sx={{
              fontFamily: FONT,
              fontSize: { xs: '0.65rem', sm: '0.7rem', md: '0.73rem', xl: '0.76rem' },
              color: BRAND.muted, mt: 0.3, fontWeight: 500,
              display: { xs: 'none', sm: 'block' },
            }}>
              {subtitle}
            </Typography>
          )}
        </Box>
      </Stack>
      {actions && <Stack direction="row" spacing={0.6} alignItems="center" flexShrink={0}>{actions}</Stack>}
    </Stack>
  );
}

const Candidates = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { enqueueSnackbar } = useSnackbar();
  const theme    = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // ── Existing state ────────────────────────────────────────────────────────
  const { candidates, loading: candLoading, error: candError, refresh: candRefresh } = useCandidates();
  const [search,            setSearch]           = useState('');
  const [statusFilter,      setStatusFilter]      = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [detailLoading,     setDetailLoading]     = useState(false);

  const [tab,          setTab]          = useState(0);
  const [ivLoading,    setIvLoading]    = useState(true);
  const [dashboard,    setDashboard]    = useState(null);
  const [processes,    setProcesses]    = useState([]);
  const [scheduled,    setScheduled]    = useState([]);
  const [liveIvs,      setLiveIvs]      = useState([]);
  const [shortlisted,  setShortlisted]  = useState([]);
  const [loadingShort, setLoadingShort] = useState(false);
  const [expandedProc, setExpandedProc] = useState(null);
  const [expandedView, setExpandedView] = useState('rankings');
  const [expandedJob,  setExpandedJob]  = useState(null);
  const [deleting,     setDeleting]     = useState(false);

  const [deleteDlg,       setDeleteDlg]       = useState(null);
  const [schedDialog,     setSchedDialog]     = useState({ open: false, preSelect: null });
  const [manageDialog,    setManageDialog]    = useState({ open: false, process: null });
  const [bulkHireDialog,  setBulkHireDialog]  = useState({ open: false, process: null });
  const [hiringDialog,    setHiringDialog]    = useState({ open: false, process: null });
  const [membershipMap, setMembershipMap] = useState({});
  const [closeDialog,     setCloseDialog]     = useState({ open: false, process: null });
  const [liveScoreDialog, setLiveScoreDialog] = useState({ open: false, candidateInterview: null });
  const [resultPreview,   setResultPreview]   = useState({ open: false, sessionId: null, interviewType: null, candidateName: '', interviewName: '' });
  const [feedbackPreview, setFeedbackPreview] = useState({ open: false, interviewId: null, candidateName: '', interviewName: '' });

  // ── NEW: per-job checkbox map ─────────────────────────────────────────────
  const [selMap, setSelMap] = useState({});

  // ── NEW: wizard state ─────────────────────────────────────────────────────
  const [wizardState, setWizardState] = useState({ open: false, job: null, candidates: [] });

  // ── Pipeline Chooser: asks "existing pipeline or new?" before opening wizard ──
  const [chooserState, setChooserState] = useState({
    open: false,
    jobId: null,
    jobTitle: '',
    candidates: [],
    pipelines: [],          // existing active pipelines for this job
  });
  const [lockedNoticeDialog, setLockedNoticeDialog] = useState({
    open:      false,
    locked:    [],   // [{ name, pipelineName }]
    fresh:     [],   // [{ name }]
    onContinue: null, // fn — non-null only when there are fresh candidates left
  });

  const [loadingPipelineId, setLoadingPipelineId] = useState(null);

  const [confirmAdd, setConfirmAdd] = useState({
    open: false,
    pipeline: null,         // the chosen pipeline object
    jobId: null,
    jobTitle: '',
    candidates: [],
    adding: false,          // spinner while API is in flight
  });

  // ── Drill-down UI state (jobs list ↔ candidates list) ────────────────────
  const [activeView,      setActiveView]      = useState('jobs');       // 'jobs' | 'candidates'
  const [selectedJobKey,  setSelectedJobKey]  = useState(null);         // group key = jobTitle
  const [candFilter,      setCandFilter]      = useState('all');        // all | sched | nosched

  // ── Candidates-view filters + controls (mirror the jobs-view controls) ───
  const [candSortBy,           setCandSortBy]           = useState('name-asc');
  const [candPage,             setCandPage]             = useState(1);
  const [candPageSize,         setCandPageSize]         = useState(DEFAULT_PAGE_SIZE);

  // ── My-Jobs-style command controls ───────────────────────────────────────
  const [jobSearch,       setJobSearch]       = useState('');
  const [jobStatusFilter, setJobStatusFilter] = useState('all');        // all | pending | done | none
  const [jobTitleFilter,  setJobTitleFilter]  = useState('all');        // 'all' | specific job title
  const [sortBy,          setSortBy]          = useState('title-asc');
  const [page,            setPage]            = useState(1);
  const [pageSize,        setPageSize]        = useState(DEFAULT_PAGE_SIZE);
  const [jobsViewMode, setJobsViewMode] = useState(() => {
    try { return localStorage.getItem(LS_JOBS_VIEW_KEY)  || 'grid'; }
    catch { return 'grid'; }
  });
  const [candViewMode, setCandViewMode] = useState(() => {
    try { return localStorage.getItem(LS_CANDS_VIEW_KEY) || 'list'; }
    catch { return 'list'; }
  });

 const completed  = useMemo(() => scheduled.filter(s => s.status === 'completed'), [scheduled]);

  const shortlistedGroups = useMemo(() => {
    const groups = {};
    shortlisted.forEach(a => {
      const key = a.job_title || 'Unknown Job';
      if (!groups[key]) groups[key] = { jobTitle: key, jobId: a.job_id, candidates: [] };
      groups[key].candidates.push(a);
    });
    return groups;
  }, [shortlisted]);

  const actionedCandidates = candidates.filter(c => ACTIONED_STATUSES.includes(c.application_status));
  const filteredCandidates = actionedCandidates.filter(c => {
    const matchSearch = !search || (c.full_name || '').toLowerCase().includes(search.toLowerCase()) || (c.email || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || c.application_status === statusFilter;
    return matchSearch && matchStatus;
  });

  const navigateToJob = useCallback((jobKey) => {
    setWizardState({ open: false, job: null, candidates: [] });
    setSearchParams({ job: jobKey });
    setActiveView('candidates');
    setSelectedJobKey(jobKey);
    setCandFilter('all');
    setCandPage(1);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [setSearchParams]);

  const navigateToJobs = useCallback(() => {
    // Reset wizard eagerly (same reason as navigateToJob).
    setWizardState({ open: false, job: null, candidates: [] });
    setSearchParams({});
    setActiveView('jobs');
    setSelectedJobKey(null);
    setCandFilter('all');
    setCandPage(1);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [setSearchParams]);

  useLayoutEffect(() => {
    const urlJob = searchParams.get('job');
    const urlMode = searchParams.get('mode');
    if (urlJob) {
      if (activeView !== 'candidates' || selectedJobKey !== urlJob) {
        setActiveView('candidates');
        setSelectedJobKey(urlJob);
      }
    } else if (activeView !== 'jobs') {
      setActiveView('jobs');
      setSelectedJobKey(null);
    }
    // Wizard sync: URL doesn't have mode=schedule but wizard is open → back button pressed → close wizard
    if (urlMode !== 'schedule' && wizardState.open) {
      setWizardState({ open: false, job: null, candidates: [] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useLayoutEffect(() => {
    const currentMode = searchParams.get('mode');
    if (wizardState.open && currentMode !== 'schedule') {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.set('mode', 'schedule');
        return next;
      });
    } else if (!wizardState.open && currentMode === 'schedule') {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.delete('mode');
        return next;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wizardState.open]);

  // Reset candidate pagination whenever any candidate-view filter changes
  useEffect(() => {
    setCandPage(1);
  }, [candFilter, candSortBy, search, selectedJobKey]);


  useLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [wizardState.open]);

  // ── fetchAll ──────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setIvLoading(true); setLoadingShort(true);
    const [dashRes, procRes, schedRes, liveRes] = await Promise.allSettled([
      interviewAPI.getInterviewDashboard(),
      interviewAPI.getProcesses(),
      interviewAPI.getScheduled({ ordering: 'window_start' }),
      interviewAPI.getLiveInterviews(),
    ]);
    if (dashRes.status  === 'fulfilled') setDashboard(dashRes.value.data);
    if (procRes.status  === 'fulfilled') setProcesses(procRes.value.data?.results  || procRes.value.data  || []);
    if (schedRes.status === 'fulfilled') setScheduled(schedRes.value.data?.results || schedRes.value.data || []);
    if (liveRes.status  === 'fulfilled') setLiveIvs(liveRes.value.data?.results    || liveRes.value.data  || []);
    setIvLoading(false);
    try {
      const jobsRes = await jobsAPI.getMyJobs();
      const jobs    = (Array.isArray(jobsRes.data) ? jobsRes.data : [])
        .filter(j => j.days_left !== 0);
      const all = [];
      await Promise.allSettled(jobs.map(job =>
        jobsAPI.getApplicants(job.id, { status: 'shortlisted' })
          .then(r => {
            const items = r.data?.results || r.data || [];
            items.filter(a => {
              const s  = (a.status             || '').toLowerCase();
              const as = (a.application_status || '').toLowerCase();
              return s === 'shortlisted' || as === 'shortlisted';
            }).forEach(a => all.push({ ...a, job_title: a.job_title || job.job_title || job.title || '', job_id: a.job_id || job.id }));
          })
          .catch(err => { console.error(`[fetchAll] job ${job.id}:`, err?.message); })
      ));
      setShortlisted(all);
    } catch (err) { console.error('[fetchAll] shortlisted block:', err); setShortlisted([]); }
    finally { setLoadingShort(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (!scheduled.length) { setMembershipMap({}); return; }
    const procById = {};
    processes.forEach(p => {
      procById[String(p.id)] = {
        name: p.name || (p.sequence_no ? `Pipeline #${p.sequence_no}` : `Pipeline ${p.id}`),
        active: p.is_active !== false,
        jobId: (() => {
          const raw = p.job_ref || p.job_id || p.job;
          return (raw && typeof raw === 'object') ? raw.id : raw;
        })(),
      };
    });
    const next = { byUser: {}, byApplicant: {}, byEmail: {} };
    scheduled.forEach(si => {
      const pid  = si.process_id ?? si.process?.id ?? si.process;
      if (pid == null) return;
      const meta = procById[String(pid)];
      // unknown or closed pipeline → not a lock
      if (!meta || !meta.active) return;
      const jobId = si.job_id ?? meta.jobId;
      if (jobId == null) return;              // cannot scope it → skip
      const entry = { processId: pid, processName: meta.name, jobId };
      const K = (v) => `${jobId}::${String(v).trim()}`;

      [si.candidate?.id, si.candidate_id, si.candidate?.user_id, si.user_id]
        .forEach(v => { if (v != null && String(v).trim()) next.byUser[K(v)] = entry; });
      [si.applicant_id, si.application_id]
        .forEach(v => { if (v != null && String(v).trim()) next.byApplicant[K(v)] = entry; });
      const em = String(si.candidate?.email || '').trim().toLowerCase();
      if (em) next.byEmail[K(em)] = entry;
    });
    setMembershipMap(next);
  }, [scheduled, processes]);
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await interviewAPI.getScheduled({ ordering: 'window_start' });
        const fresh = res.data?.results || res.data || [];
        setScheduled(fresh);
      } catch { /* silent — page already has cached data */ }
    };
    const id = setInterval(poll, 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const docCompleted = scheduled.filter(s => s.status === 'completed' && s.interview_type === 'document' && s.doc_overall_pct == null);
    if (!docCompleted.length) return;
    docCompleted.forEach(s => {
      axiosInstance.get(`/employer/interviews/schedule/${s.id}/doc-result/`)
        .then(r => {
          const d = r.data;
          const answered = (d.qa_pairs || []).filter(q => !q.skipped && q.ai_score != null);
          const pct = answered.length ? Math.round(answered.reduce((sum, q) => sum + q.ai_score, 0) / answered.length * 10) : null;
          const overall = d.overall_pct ?? (d.overall_score != null ? Math.round(d.overall_score * 10) : null) ?? pct;
          if (overall != null) setScheduled(prev => prev.map(iv => iv.id === s.id ? { ...iv, doc_overall_pct: overall } : iv));
        }).catch(() => {});
   
    });
  }, [scheduled.length]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleCardClick = async (candidate) => {
    setSelectedCandidate(candidate); setDetailLoading(true);
    try { const detail = await applicantService.getDetail(candidate.id); setSelectedCandidate(detail); }
    catch { } finally { setDetailLoading(false); }
  };

  const handleSendInvite    = async (id, name) => { try { await interviewAPI.sendInvite(id); enqueueSnackbar(`✅ Invite sent to ${name || 'candidate'}`, { variant: 'success' }); fetchAll(); } catch (err) { enqueueSnackbar(err?.response?.data?.detail || 'Failed', { variant: 'error' }); } };
  const handleSendReminder  = async (id) => { try { await interviewAPI.sendReminder(id); enqueueSnackbar('Reminder sent!', { variant: 'success' }); } catch { enqueueSnackbar('Failed', { variant: 'error' }); } };
  const handleFlagFraud     = async (sessionId) => { try { await interviewAPI.flagFraud(sessionId, { reason: 'Fraud detected by employer' }); enqueueSnackbar('Candidate disqualified', { variant: 'warning' }); fetchAll(); } catch { enqueueSnackbar('Failed', { variant: 'error' }); } };

  const handleDelete = async () => {
    if (!deleteDlg || deleting) return;
    setDeleting(true);
    try { await interviewAPI.deleteScheduled(deleteDlg.id); setScheduled(prev => prev.filter(s => s.id !== deleteDlg.id)); enqueueSnackbar('Interview deleted.', { variant: 'success' }); setDeleteDlg(null); }
    catch (err) { enqueueSnackbar(err?.response?.data?.detail || 'Failed to delete.', { variant: 'error' }); }
    finally { setDeleting(false); }
  };

  const handleMissed = async (id) => {
    try { const r = await interviewAPI.handleMissedRound(id); enqueueSnackbar(r.data?.action === 'reminded' ? 'Reminder sent' : 'Permanently closed', { variant: 'info' }); fetchAll(); }
    catch { enqueueSnackbar('Failed', { variant: 'error' }); }
  };

/** All pipelines belonging to a job (R1: there can be several). */
const pipelinesForJob = useCallback((jobId) => {
  if (!jobId) return [];
  return processes.filter(p => {
    const raw    = p.job_ref || p.job_id || p.job;
    const pJobId = (raw != null && typeof raw === 'object') ? raw.id : raw;
    return pJobId != null && String(pJobId) === String(jobId);
  });
}, [processes]);

const membershipOf = useCallback((candidate) => {
  if (!candidate) return null;

  // 1) backend annotation on the applicant row — authoritative
  const m = candidate.pipeline_membership || candidate.membership || null;
  if (m) {
    return {
      processId:   m.process_id ?? m.processId ?? null,
      processName: m.process_name || m.processName
                   || (m.sequence_no ? `Pipeline #${m.sequence_no}` : 'a pipeline'),
    };
  }

  // 2) fallback map — requires a job id to scope the lookup
  const jobId = candidate.job_id ?? candidate.job_post_id ?? candidate.jobId ?? null;
  if (jobId == null) return null;
  const K = (v) => `${jobId}::${String(v).trim()}`;
  const { byUser = {}, byApplicant = {}, byEmail = {} } = membershipMap || {};

  // user-id space
  const userKeys = [candidate.candidate?.id, candidate.candidate_id,
                    candidate.user?.id, candidate.user_id];
  for (const v of userKeys) {
    if (v != null && String(v).trim() && byUser[K(v)]) return byUser[K(v)];
  }
  // applicant/application-id space (kept strictly separate from user ids)
  const appKeys = [candidate.applicant_id, candidate.application_id,
                   candidate.applicant?.id, candidate.id];
  for (const v of appKeys) {
    if (v != null && String(v).trim() && byApplicant[K(v)]) return byApplicant[K(v)];
  }
  // email — the only globally unambiguous key
  const em = getCandEmail(candidate);
  if (em && byEmail[K(em)]) return byEmail[K(em)];

  return null;
}, [membershipMap]);

const isLockedCandidate = useCallback(
  (candidate) => membershipOf(candidate) !== null,
  [membershipOf],
);

  const handleConfirmClose = async (remaining) => {
    const process = closeDialog.process;
    setCloseDialog({ open: false, process: null });
    try {
      await interviewAPI.closeProcess(process.id, remaining > 0);
      enqueueSnackbar(remaining > 0 ? `Process closed. ${remaining} position(s) still vacant.` : 'All positions filled! 🎉', { variant: remaining > 0 ? 'warning' : 'success' });
      fetchAll();
    } catch (err) { enqueueSnackbar(err?.response?.data?.detail || 'Failed', { variant: 'error' }); }
  };

  const handleViewClick = (procId, viewKey) => {
    if (expandedProc === procId && expandedView === viewKey) setExpandedProc(null);
    else { setExpandedProc(procId); setExpandedView(viewKey); }
  };

  const viewBtnProps = (procId, viewKey, baseColor) => {
    const isActive = expandedProc === procId && expandedView === viewKey;
    return { variant: isActive ? 'contained' : 'outlined', color: baseColor, sx: isActive ? { boxShadow: 1 } : {} };
  };

  // ── Checkbox helpers ──────────────────────────────────────────────────────
  const getCandUid = (c) => String(c.applicant_id || c.candidate_id || c.candidate?.id || c.applicant?.id || c.user?.id || c.user_id || c.id || '');
  /** Secondary key (email) used by the membership map fallback. */
  const getCandEmail = (c) => String(c?.email || c?.candidate?.email || c?.applicant?.email || '').trim().toLowerCase();

  const handleCheck = (jobTitle, uid, checked) => {
    // R2: a candidate locked inside a pipeline can never be re-selected here.
    if (checked) {
      const grp  = shortlistedGroups[jobTitle];
      const cand = grp?.candidates?.find(c => getCandUid(c) === uid);
      const mem  = cand ? membershipOf(cand) : null;
      if (mem) {
        enqueueSnackbar(
          `Already inside ${mem.processName} — manage them in Ranked Results.`,
          { variant: 'warning' },
        );
        return;
      }
    }
    setSelMap(prev => {
      const cur = new Set(prev[jobTitle] || []);
      checked ? cur.add(uid) : cur.delete(uid);
      return { ...prev, [jobTitle]: cur };
    });
  };

  const handleSelectAll = (jobTitle, candidates, checked) => {
    // R2: "select all" only ever selects candidates free for a NEW pipeline.
    setSelMap(prev => ({
      ...prev,
      [jobTitle]: checked
        ? new Set(candidates.filter(c => !isLockedCandidate(c)).map(getCandUid))
        : new Set(),
    }));
  };

  const getSelCount = (jobTitle) => (selMap[jobTitle]?.size || 0);

const handleScheduleSelected = useCallback(async (jobTitle, jobId, forceCandidates = null) => {
  const group = shortlistedGroups[jobTitle];
  if (!group) return;

  // ── Which candidates? Only the ticked ones. Never the whole group. ─────
  let toSchedule;
  if (Array.isArray(forceCandidates) && forceCandidates.length > 0) {
    toSchedule = forceCandidates;
  } else {
    const sel = selMap[jobTitle];
    if (!sel || sel.size === 0) {
      enqueueSnackbar('Tick at least one candidate first.', { variant: 'warning' });
      return;
    }
    toSchedule = group.candidates.filter(c => sel.has(getCandUid(c)));
  }
  if (!toSchedule.length) return;

  // ── Scope to this job ─────────────────────────────────────────────────
  const toScheduleScoped = toSchedule.filter(c => {
    const appJobId = c.job_id || c.job_post_id || c.jobId;
    if (!appJobId) return true;
    return String(appJobId) === String(jobId);
  });
  if (!toScheduleScoped.length) {
    enqueueSnackbar('No candidates found who applied for this specific job.',
      { variant: 'warning' });
    return;
  }

  const lockedOnes = toScheduleScoped.filter(isLockedCandidate);
  const freshOnes  = toScheduleScoped.filter(c => !isLockedCandidate(c));

  // Helper — resolve a candidate's display name from whichever shape the API returned.
  const nameOf = (c) =>
    c.full_name || c.applicant?.full_name || c.candidate?.full_name || c.email || 'Candidate';
  const proceedToScheduling = async (freshCandidates) => {
    let existingPipelines = pipelinesForJob(jobId);
    try {
      const procRes = await interviewAPI.getProcesses(jobId ? { job_id: jobId } : {});
      const fresh   = procRes.data?.results || procRes.data || [];
      if (fresh.length) {
        setProcesses(fresh);
        existingPipelines = fresh.filter(p => {
          const raw = p.job_ref || p.job_id || p.job;
          const pid = (raw && typeof raw === 'object') ? raw.id : raw;
          return pid != null && String(pid) === String(jobId) && p.is_active !== false;
        });
      }
    } catch (err) {
      console.error('[handleScheduleSelected] pipeline refresh failed:', err);
    }

    if (existingPipelines.length > 0) {
      setChooserState({
        open: true,
        jobId,
        jobTitle,
        candidates: freshCandidates,
        pipelines: existingPipelines,
      });
    } else {
      // BUILD: 2026-08-05-existing-pipeline-wizard-v1
      // No active pipeline for this job → unambiguously "create one".
      setWizardState({
        open:              true,
        job:               { id: jobId, title: jobTitle, vacancies: 1 },
        candidates:        freshCandidates,
        existingPipelines: 0,
        existingProcess:   null,
        procRounds:        [],
        forceNew:          true,
      });
    }
  };

 
  if (lockedOnes.length) {
    const lockedItems = lockedOnes.map(c => {
      const mem = membershipOf(c);
      return { name: nameOf(c), pipelineName: mem?.processName || 'an existing pipeline' };
    });
    const freshItems = freshOnes.map(c => ({ name: nameOf(c) }));
    setLockedNoticeDialog({
      open:       true,
      locked:     lockedItems,
      fresh:      freshItems,
      onContinue: freshOnes.length ? (() => proceedToScheduling(freshOnes)) : null,
    });
    return;
  }

  // No locked candidates → go straight through.
  await proceedToScheduling(freshOnes);
  }, [shortlistedGroups, selMap, getCandUid, pipelinesForJob, isLockedCandidate,
      membershipOf, enqueueSnackbar]);


  // ── Loading / error ───────────────────────────────────────────────────────
  if (candLoading) return (
    <Box sx={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      minHeight: '60vh', bgcolor: BRAND.bg, fontFamily: FONT,
    }}>
      <Stack alignItems="center" spacing={1.5}>
        <CircularProgress sx={{ color: BRAND.sage }} thickness={3} size={36} />
        <Typography sx={{ fontFamily: FONT, fontSize: '0.85rem', color: BRAND.muted, fontWeight: 500 }}>
          Loading candidates…
        </Typography>
      </Stack>
    </Box>
  );

  if (candError) return (
    <Box sx={{ p: { xs: 3, sm: 4 }, textAlign: 'center', bgcolor: BRAND.bg, minHeight: '100vh', fontFamily: FONT }}>
      <Alert severity="error" sx={{ borderRadius: '12px', mb: 2, fontFamily: FONT }}>{candError}</Alert>
      <Button startIcon={<Refresh />} onClick={candRefresh} variant="outlined"
        sx={{
          borderRadius: '10px', textTransform: 'none', fontFamily: FONT, fontWeight: 600,
          borderColor: BRAND.navy, color: BRAND.navy,
          '&:hover': { borderColor: BRAND.navyDark, bgcolor: BRAND.navySoft },
        }}>
        Try Again
      </Button>
    </Box>
  );

  // ── Computed values ──────────────────────────────────────────────────────
  const d = dashboard || {};
  const trulyScheduledCount = scheduled.filter(s => ['scheduled', 'invited'].includes(s.status)).length;
  const activePipelinesCount = processes.filter(p => p.is_active !== false && p.status !== 'closed').length;

  const stats = [
    { label: 'Scheduled',   value: trulyScheduledCount,                                  color: '#3E6E7A',       icon: <Schedule /> },
    { label: 'In Progress', value: d.total_in_progress || 0,                             color: BRAND.amber,     icon: <Assignment /> },
    { label: 'Completed',   value: d.total_completed   || completed.length  || 0,        color: BRAND.sageText,  icon: <CheckCircle /> },
    { label: 'Avg CPS',     value: d.avg_cgps_score    ? `${d.avg_cgps_score}/10` : '—', color: BRAND.navy,      icon: <BarChart /> },
    { label: 'Shortlisted', value: shortlisted.length,                                   color: BRAND.err,       icon: <HowToReg /> },
    { label: 'Pipelines',   value: activePipelinesCount,                                 color: BRAND.sage,      icon: <Groups /> },
  ];

  // ── Helpers ──────────────────────────────────────────────────────────────
  const jobsArr = Object.values(shortlistedGroups);
  const activeJob = activeView === 'candidates'
    ? (jobsArr.find(j => j.jobTitle === selectedJobKey) || null)
    : null;

  const computeJobStatus = ({ jobTitle: jt, jobId: ji, candidates: g }) => {
    // R1: match against EVERY pipeline of this job, not just "the" one.
    const procIds = new Set(pipelinesForJob(ji).map(p => String(p.id)));
    const jobSIs = scheduled.filter(s => {
      if (s.job_id != null && ji != null && String(s.job_id) === String(ji)) return true;
      if (procIds.size) {
        const sid = s.process_id ?? s.process?.id ?? s.process;
        if (sid != null && procIds.has(String(sid))) return true;
      }
      if (s.job_title && jt) {
        const sT = s.job_title.toLowerCase().split(' — ')[0].trim();
        const gT = jt.toLowerCase().trim();
        if (sT === gT) return true;
      }
      return false;
    });
    const idSet = new Set();
    jobSIs.forEach(s => {
      const cid = String(s.candidate?.id || '').trim();
      const em  = String(s.candidate?.email || '').trim().toLowerCase();
      const aid = String(s.applicant_id || s.application_id || '').trim();
      const uid = String(s.candidate?.user_id || s.user_id || '').trim();
      if (cid) idSet.add(cid);
      if (em)  idSet.add(em);
      if (aid) idSet.add(aid);
      if (uid) idSet.add(uid);
    });
    const isCandSched = (c) => {
      const cid = String(c.candidate?.id || c.candidate_id || '').trim();
      const aid = String(c.applicant_id || c.applicant?.id || c.id || '').trim();
      const uid = String(c.user?.id || c.user_id || '').trim();
      const em  = String(c.email || c.candidate?.email || c.applicant?.email || '').trim().toLowerCase();
      return (cid && idSet.has(cid)) || (aid && idSet.has(aid)) || (uid && idSet.has(uid)) || (em && idSet.has(em));
    };
    const schedCount = g.filter(isCandSched).length;
    const allSched   = schedCount === g.length && g.length > 0;
    const anySched   = jobSIs.length > 0;
    const noneSched  = schedCount === 0;
    
    const pipelines = pipelinesForJob(ji);
    return { pipelines, pipelineCount: pipelines.length,
             isCandSched, schedCount, allSched, anySched, noneSched };
  };

  const matchesJobFilter = (job) => {
    if (jobTitleFilter !== 'all' && job.jobTitle !== jobTitleFilter) return false;
    const q = jobSearch.trim().toLowerCase();
    if (q && !(job.jobTitle || '').toLowerCase().includes(q)) return false;
    if (jobStatusFilter === 'all') return true;
    const st = computeJobStatus(job);
    if (jobStatusFilter === 'pending') return st.anySched && !st.allSched;
    if (jobStatusFilter === 'done')    return st.allSched;
    if (jobStatusFilter === 'none')    return st.noneSched;
    return true;
  };

  const filteredJobs = jobsArr.filter(matchesJobFilter);

  // Sort
  const sortedJobs = [...filteredJobs].sort((a, b) => {
    if (sortBy === 'title-asc') return (a.jobTitle || '').localeCompare(b.jobTitle || '');
    if (sortBy === 'most-cand') return b.candidates.length - a.candidates.length;
    if (sortBy === 'fewest-cand') return a.candidates.length - b.candidates.length;
    const sa = computeJobStatus(a), sb = computeJobStatus(b);
    if (sortBy === 'most-pending') return (b.candidates.length - sb.schedCount) - (a.candidates.length - sa.schedCount);
    if (sortBy === 'most-sched')   return sb.schedCount - sa.schedCount;
    return 0;
  });

  // Pagination
  const effectivePageSize = pageSize === 'all' ? Math.max(sortedJobs.length, 1) : pageSize;
  const totalPages        = Math.max(1, Math.ceil(sortedJobs.length / effectivePageSize));
  const paginatedJobs = sortedJobs.slice((page - 1) * effectivePageSize, (page - 1) * effectivePageSize + effectivePageSize);

  // Job status pill counts
  const jobStatusCounts = {
    all:     jobsArr.length,
    pending: jobsArr.filter(j => { const s = computeJobStatus(j); return s.anySched && !s.allSched; }).length,
    done:    jobsArr.filter(j => computeJobStatus(j).allSched).length,
    none:    jobsArr.filter(j => computeJobStatus(j).noneSched).length,
  };

  // Avatar helper
  const AVATAR_COLORS = ['#7F9E7E', '#3E6E7A', '#A35A2D', '#5E815D', '#8A6D4A', '#4A7C6E', '#6C8B6B', '#977B4A'];
  const avatarColorFor = (name) => {
    const s = String(name || '?');
    return AVATAR_COLORS[s.charCodeAt(0) % AVATAR_COLORS.length];
  };
  const initialOf  = (name) => (name || '?').charAt(0).toUpperCase();
  const monogramOf = (jobTitle) => (jobTitle || '?').substring(0, 2).toUpperCase();

  const handleClearAllFilters = () => {
    setJobSearch('');
    setJobStatusFilter('all');
    setJobTitleFilter('all');
  };

  const isScheduleMode = wizardState.open;

  return (
    <Box sx={{
      bgcolor: BRAND.bg, minHeight: '100vh',
      p: { xs: 1.5, sm: 2, md: 3, lg: 4 },
      fontFamily: FONT,
      '& .MuiTypography-root, & .MuiButton-root, & .MuiToggleButton-root, & .MuiChip-root, & .MuiInputBase-root, & .MuiMenuItem-root, & .MuiPaginationItem-root': {
        fontFamily: FONT,
      },
    }}>
      <Box sx={{ maxWidth: 1440, mx: 'auto' }}>

      
        {isScheduleMode && (
          <>
            {/* Breadcrumb strip so the user knows they're on a subpage */}
            <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: { xs: 1.5, md: 2 }, px: 0.5 }}>
              <Box
                component="span"
                onClick={navigateToJobs}
                sx={{
                  fontFamily: FONT, fontSize: '0.78rem', fontWeight: 600,
                  color: BRAND.muted, cursor: 'pointer',
                  '&:hover': { color: BRAND.navy, textDecoration: 'underline' },
                }}>
                Candidates
              </Box>
              <Box component="span" sx={{ color: BRAND.borderStrong, fontSize: '0.78rem' }}>›</Box>
              <Box
                component="span"
                onClick={() => setWizardState({ open: false, job: null, candidates: [] })}
                sx={{
                  fontFamily: FONT, fontSize: '0.78rem', fontWeight: 600,
                  color: BRAND.muted, cursor: 'pointer',
                  '&:hover': { color: BRAND.navy, textDecoration: 'underline' },
                }}>
                {wizardState.job?.title || selectedJobKey || '—'}
              </Box>
              <Box component="span" sx={{ color: BRAND.borderStrong, fontSize: '0.78rem' }}>›</Box>
              <Box component="span" sx={{
                fontFamily: FONT, fontSize: '0.78rem', fontWeight: 700, color: BRAND.navy,
              }}>
                Schedule interviews
              </Box>
            </Stack>
          </>
        )}

        {/* ══ COMMAND HEADER (hidden while in schedule-mode) ═══════════════ */}
        {!isScheduleMode && (
        <Paper elevation={0} sx={{
          bgcolor: BRAND.surface, border: `1px solid ${BRAND.border}`,
          borderRadius: { xs: '14px', sm: '16px' },
          p: { xs: 2, sm: 2.5, md: 3 },
          mb: { xs: 2, md: 2.5 },
          boxShadow: '0 1px 2px rgba(16,18,16,0.04)',
        }}>
          {/* Row 1 — back + title + subline + refresh */}
          <Stack direction="row" sx={{
            alignItems: 'flex-start', justifyContent: 'space-between',
            gap: 1.5, mb: { xs: 1.75, md: 2 },
          }}>
            <Box sx={{ minWidth: 0, display: 'flex', alignItems: 'flex-start', gap: 1.4 }}>
              {activeView === 'candidates' && (
                <Tooltip title="Back to jobs" arrow>
                  <IconButton
                    onClick={navigateToJobs}
                    size="small"
                    sx={{
                      color: '#fff', bgcolor: BRAND.navy, borderRadius: '10px',
                      width: { xs: 36, md: 40 }, height: { xs: 36, md: 40 },
                      boxShadow: '0 3px 10px rgba(2,33,36,0.25)',
                      transition: 'all 0.22s ease',
                      mt: { xs: 0.3, md: 0.4 },
                      '&:hover': { bgcolor: BRAND.navyDark, transform: 'translateX(-2px)',
                                   boxShadow: '0 5px 14px rgba(2,33,36,0.35)' },
                    }}>
                    <ArrowBack sx={{ fontSize: { xs: 18, md: 20 } }} />
                  </IconButton>
                </Tooltip>
              )}
              <Box sx={{ minWidth: 0 }}>
                <Typography component="h1" sx={{
                  fontFamily: FONT,
                  fontWeight: 700, color: BRAND.ink,
                  letterSpacing: '-0.02em', lineHeight: 1.15,
                  fontSize: { xs: '1.3rem', sm: '1.45rem', md: '1.6rem' },
                }}>
                  {activeView === 'candidates' && activeJob ? activeJob.jobTitle : 'Candidates'}
                </Typography>
                <Typography sx={{
                  fontFamily: FONT, color: BRAND.muted,
                  fontSize: { xs: '0.82rem', sm: '0.9rem' },
                  fontWeight: 500, mt: 0.5,
                }}>
                  {activeView === 'jobs' ? (
                    <>
                      <Box component="span" sx={{ color: BRAND.sageText, fontWeight: 700 }}>
                        {shortlisted.length} {shortlisted.length === 1 ? 'candidate' : 'candidates'}
                      </Box>
                      {' '}shortlisted across{' '}
                      <Box component="span" sx={{ color: BRAND.sageText, fontWeight: 700 }}>
                        {jobsArr.length} {jobsArr.length === 1 ? 'job' : 'jobs'}
                      </Box>
                      {' '}· pick a job to schedule interviews
                    </>
                  ) : activeJob ? (
                    <>
                      <Box component="span" sx={{ color: BRAND.sageText, fontWeight: 700 }}>
                        {activeJob.candidates.length}
                      </Box>
                      {' '}shortlisted · tick candidates and schedule
                    </>
                  ) : 'Job not found'}
                </Typography>
              </Box>
            </Box>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', mt: 0.25, flexShrink: 0 }}>
              <Tooltip title="Refresh" arrow>
                <span>
                  <IconButton
                    onClick={fetchAll}
                    disabled={ivLoading || loadingShort}
                    size="small"
                    sx={{
                      color: BRAND.muted,
                      border: `1px solid ${BRAND.borderStrong}`,
                      borderRadius: '9px',
                      width: { xs: 40, md: 42 }, height: { xs: 40, md: 42 },
                      '&:hover': { bgcolor: BRAND.sageSoft, color: BRAND.navy, borderColor: BRAND.sage },
                    }}>
                    <Refresh sx={{ fontSize: 18 }} />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          </Stack>

          {/* Stats row — moved INSIDE the header, above the search bar */}
          {activeView === 'jobs' && (
            <Box sx={{
              display: 'flex',
              gap: { xs: 1, sm: 1.2, md: 1.5, lg: 1.8, xl: 2 },
              overflowX: { xs: 'auto', md: 'visible' },
              flexWrap: { xs: 'nowrap', md: 'wrap' },
              pb: { xs: 0.8, md: 0 },
              mb: { xs: 1.75, md: 2 },
              '&::-webkit-scrollbar':        { height: 3 },
              '&::-webkit-scrollbar-thumb':  { bgcolor: BRAND.borderStrong, borderRadius: 2 },
            }}>
              {stats.map(s => <StatCard key={s.label} label={s.label} value={s.value} color={s.color} icon={s.icon} />)}
            </Box>
          )}

          {/* Row 2 — search + job-title pill filter */}
          <Stack direction="row" spacing={1} sx={{ alignItems: 'stretch', flexWrap: 'wrap', gap: 1 }}>
            <TextField
              placeholder={activeView === 'jobs'
                ? 'Search jobs by title'
                : 'Search candidates in this job'}
              value={activeView === 'jobs' ? jobSearch : search}
              onChange={(e) => activeView === 'jobs' ? setJobSearch(e.target.value) : setSearch(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search sx={{ color: BRAND.muted, fontSize: 20 }} />
                    </InputAdornment>
                  ),
                  endAdornment: ((activeView === 'jobs' ? jobSearch : search) ? (
                    <InputAdornment position="end">
                      <IconButton size="small"
                        onClick={() => activeView === 'jobs' ? setJobSearch('') : setSearch('')}
                        aria-label="Clear search"
                        sx={{ color: BRAND.muted, '&:hover': { color: BRAND.ink, bgcolor: 'rgba(16,18,16,0.05)' } }}>
                        <ClearRounded sx={{ fontSize: 18 }} />
                      </IconButton>
                    </InputAdornment>
                  ) : null),
                },
              }}
              sx={{
                flex: '1 1 300px', minWidth: { xs: '100%', sm: 260 },
                '& .MuiOutlinedInput-root': {
                  bgcolor: BRAND.bg, borderRadius: '25px',
                  fontSize: { xs: '0.88rem', sm: '0.92rem' },
                  height: { xs: 46, md: 48 },
                  color: BRAND.ink, fontFamily: FONT,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                  '& input::placeholder': { color: BRAND.muted, opacity: 0.85 },
                  '& fieldset':             { borderColor: '#B0BEC5', borderWidth: '1.5px' },
                  '&:hover fieldset':       { borderColor: '#78909C', borderWidth: '2px' },
                  '&.Mui-focused':          { boxShadow: '0 6px 18px rgba(0,0,0,0.12)' },
                  '&.Mui-focused fieldset': { borderColor: BRAND.sage, borderWidth: '2px' },
                },
              }}
            />

            {/* Job-title pill dropdown (jobs view only) */}
            {activeView === 'jobs' && (
              <Select
                value={jobTitleFilter}
                onChange={(e) => { setJobTitleFilter(e.target.value); setPage(1); }}
                renderValue={(v) => {
                  if (v === 'all') return 'All Jobs';
                  // Truncate long titles inside the pill
                  return v.length > 26 ? v.substring(0, 24) + '…' : v;
                }}
                displayEmpty
                MenuProps={{
                  anchorOrigin:    { vertical: 'bottom', horizontal: 'left' },
                  transformOrigin: { vertical: 'top',    horizontal: 'left' },
                  slotProps: { paper: { sx: {
                    mt: 0.75, borderRadius: '14px', minWidth: 260, maxHeight: 380,
                    bgcolor: BRAND.surface,
                    border: `1px solid ${BRAND.border}`,
                    boxShadow: '0 12px 32px rgba(2,33,36,0.14)',
                    fontFamily: FONT,
                    '& .MuiList-root': { py: 0.5 },
                    '& .MuiMenuItem-root': {
                      fontFamily: FONT, fontSize: '0.85rem',
                      color: BRAND.ink, fontWeight: 500,
                      minHeight: 40, px: 1.75, py: 0.9,
                      borderRadius: '8px', mx: 0.5, my: 0.15,
                      transition: 'background 0.15s ease',
                      '&:hover': { bgcolor: BRAND.sageSoft, color: BRAND.navy },
                      '&.Mui-selected': {
                        bgcolor: BRAND.navySoft, color: BRAND.navy, fontWeight: 700,
                        '&:hover': { bgcolor: BRAND.navySoftHover },
                      },
                    },
                  } } },
                }}
                sx={{
                  flexShrink: 0,
                  minWidth: { xs: 140, sm: 170 },
                  maxWidth: { xs: 200, sm: 240 },
                  height: { xs: 46, md: 48 },
                  bgcolor: BRAND.surface,
                  borderRadius: '999px',   // pill
                  fontFamily: FONT, fontSize: '0.88rem', fontWeight: 700,
                  color: BRAND.ink,
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: BRAND.borderStrong, borderWidth: '1.5px',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: BRAND.sage, borderWidth: '1.5px',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: BRAND.sage, borderWidth: '2px',
                  },
                  '& .MuiSelect-select': {
                    py: 0, pl: 2.5, pr: '38px !important',
                    display: 'flex', alignItems: 'center',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  },
                  '& .MuiSvgIcon-root': {
                    color: BRAND.navy, right: 12,
                    transition: 'transform 0.2s ease',
                  },
                }}
              >
                <MenuItem value="all">All Jobs</MenuItem>
                {jobsArr
                  .map(j => j.jobTitle)
                  .filter(Boolean)
                  .sort((a, b) => a.localeCompare(b))
                  .map(title => (
                    <MenuItem key={title} value={title}>
                      {title}
                    </MenuItem>
                  ))}
              </Select>
            )}
          </Stack>

          {/* Row 3 — pills (left) + sort + view toggle (right) */}
          <Stack direction="row"
            sx={{ alignItems: 'center', mt: { xs: 1.75, md: 2 }, gap: 1, flexWrap: 'wrap' }}>
            <Box sx={{
              display: 'flex', gap: 0.75, alignItems: 'center',
              flexWrap: { xs: 'nowrap', sm: 'wrap' },
              overflowX: { xs: 'auto', sm: 'visible' },
              pb: { xs: 0.5, sm: 0 }, mr: 'auto',
              '&::-webkit-scrollbar': { display: 'none' },
            }}>
              {(activeView === 'jobs' ? JOB_STATUS_FILTERS : CAND_STATUS_FILTERS).map(opt => {
                const active = activeView === 'jobs'
                  ? jobStatusFilter === opt.value
                  : candFilter === opt.value;
                const cnt = activeView === 'jobs'
                  ? jobStatusCounts[opt.value] ?? '—'
                  : (activeJob
                      ? (opt.value === 'all'
                          ? activeJob.candidates.length
                          : opt.value === 'sched'
                            ? activeJob.candidates.filter(c => computeJobStatus(activeJob).isCandSched(c)).length
                            : activeJob.candidates.filter(c => !computeJobStatus(activeJob).isCandSched(c)).length)
                      : 0);
                return (
                  <Box
                    key={opt.value}
                    onClick={() => activeView === 'jobs' ? setJobStatusFilter(opt.value) : setCandFilter(opt.value)}
                    role="button" tabIndex={0}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') &&
                      (activeView === 'jobs' ? setJobStatusFilter(opt.value) : setCandFilter(opt.value))}
                    sx={{
                      cursor: 'pointer', userSelect: 'none',
                      display: 'inline-flex', alignItems: 'center', gap: 0.6,
                      px: 1.5, py: 0.65, borderRadius: 999, flexShrink: 0,
                      fontFamily: FONT,
                      fontSize: '0.8rem', fontWeight: active ? 700 : 600,
                      bgcolor: active ? BRAND.navy : BRAND.surface,
                      color:   active ? '#fff'    : BRAND.muted,
                      border: `1px solid ${active ? BRAND.navy : BRAND.borderStrong}`,
                      transition: 'all 0.16s ease',
                      '&:hover': {
                        bgcolor: active ? BRAND.navy : BRAND.bg,
                        borderColor: active ? BRAND.navy : BRAND.muted,
                      },
                    }}>
                    {opt.label}
                    <Box component="span" sx={{
                      fontSize: '0.68rem', fontWeight: 800, lineHeight: 1.6,
                      px: 0.7, borderRadius: 999,
                      bgcolor: active ? 'rgba(255,255,255,0.22)' : BRAND.bg,
                      color:   active ? '#fff' : BRAND.muted,
                    }}>
                      {cnt}
                    </Box>
                  </Box>
                );
              })}
            </Box>

            <TextField
              select
              value={activeView === 'jobs' ? sortBy : candSortBy}
              onChange={(e) => activeView === 'jobs'
                ? setSortBy(e.target.value)
                : (setCandSortBy(e.target.value), setCandPage(1))}
              sx={{
                minWidth: 176, flexShrink: 0,
                '& .MuiOutlinedInput-root': {
                  bgcolor: BRAND.surface, borderRadius: '10px',
                  fontSize: '0.82rem', height: 38, color: BRAND.ink, fontFamily: FONT,
                  '& fieldset':                { borderColor: BRAND.borderStrong },
                  '&:hover fieldset':          { borderColor: BRAND.muted },
                  '&.Mui-focused fieldset':    { borderColor: BRAND.sage, borderWidth: 1.5 },
                  '& .MuiSvgIcon-root':        { color: BRAND.muted },
                },
              }}>
              {(activeView === 'jobs' ? SORT_OPTIONS : CAND_SORT_OPTIONS).map(o => (
                <MenuItem key={o.value} value={o.value} sx={{ fontSize: '0.85rem', fontFamily: FONT }}>
                  {o.label}
                </MenuItem>
              ))}
            </TextField>

            <ToggleButtonGroup
              value={activeView === 'jobs' ? jobsViewMode : candViewMode}
              exclusive
              onChange={(e, mode) => {
                if (!mode) return;
                if (activeView === 'jobs') {
                  setJobsViewMode(mode);
                  try { localStorage.setItem(LS_JOBS_VIEW_KEY,  mode); } catch {}
                } else {
                  setCandViewMode(mode);
                  try { localStorage.setItem(LS_CANDS_VIEW_KEY, mode); } catch {}
                }
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
        )}

        {/* ══ MAIN CONTENT — Jobs list OR Candidates drill-down (hidden in schedule-mode) ═══════ */}
        {!isScheduleMode && (
        activeView === 'jobs' ? (
          <>
            {loadingShort ? (
              <Paper elevation={0} sx={{
                display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                minHeight: 420, borderRadius: '14px', border: `1px solid ${BRAND.border}`, bgcolor: BRAND.surface,
              }}>
                <CircularProgress size={36} sx={{ color: BRAND.sage }} />
                <Typography variant="body2" sx={{ mt: 2, color: BRAND.muted, fontSize: '0.875rem', fontFamily: FONT }}>
                  Loading shortlisted candidates…
                </Typography>
              </Paper>
            ) : shortlisted.length === 0 ? (
              <Paper elevation={0} sx={{
                textAlign: 'center', py: 8, px: 3,
                borderRadius: '14px', border: `1px solid ${BRAND.border}`, bgcolor: BRAND.surface,
              }}>
                <Box sx={{
                  width: 68, height: 68, borderRadius: '50%',
                  bgcolor: BRAND.sageSoft, mx: 'auto', mb: 2.5,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <HowToReg sx={{ fontSize: 32, color: BRAND.sage }} />
                </Box>
                <Typography sx={{
                  fontFamily: FONT, fontWeight: 700, color: BRAND.ink, mb: 0.75,
                  fontSize: '1.0625rem',
                }}>
                  No shortlisted candidates yet
                </Typography>
                <Typography sx={{
                  fontFamily: FONT, fontSize: '0.875rem', color: BRAND.muted,
                }}>
                  Shortlisted applicants from your job postings will appear here
                </Typography>
              </Paper>
            ) : sortedJobs.length === 0 ? (
              <Paper elevation={0} sx={{
                textAlign: 'center', py: 8, px: 3,
                borderRadius: '14px', border: `1px solid ${BRAND.border}`, bgcolor: BRAND.surface,
              }}>
                <Box sx={{
                  width: 68, height: 68, borderRadius: '50%',
                  bgcolor: BRAND.sageSoft, mx: 'auto', mb: 2.5,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Search sx={{ fontSize: 30, color: BRAND.sage }} />
                </Box>
                <Typography sx={{
                  fontFamily: FONT, fontWeight: 700, color: BRAND.ink, mb: 0.75,
                  fontSize: '1.0625rem',
                }}>
                  No jobs match your search
                </Typography>
                <Typography sx={{
                  fontFamily: FONT, fontSize: '0.875rem', color: BRAND.muted, mb: 3,
                }}>
                  Try adjusting your search criteria or clearing some filters
                </Typography>
                <Button variant="outlined" onClick={handleClearAllFilters}
                  sx={{
                    borderColor: BRAND.navy, color: BRAND.navy,
                    textTransform: 'none', fontWeight: 500, px: 3, borderRadius: '10px', fontFamily: FONT,
                    '&:hover': { borderColor: BRAND.navyDark, bgcolor: BRAND.navySoft },
                  }}>
                  Clear filters
                </Button>
              </Paper>
            ) : (
              <>
                {/* List-view column headers (only visible on md+ in list mode) */}
                {jobsViewMode === 'list' && paginatedJobs.length > 0 && (
                  <Box sx={{
                    display: { xs: 'none', md: 'grid' },
                    gridTemplateColumns: '2.4fr 1fr 1fr 1.4fr 1.2fr 100px',
                    alignItems: 'center',
                    px: 2.5, py: 1, gap: 2, mb: 0.75,
                  }}>
                    {['Role', 'Shortlisted', 'Scheduled', 'Progress', 'Status', ''].map((h) => (
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
                    sm: jobsViewMode === 'grid' ? 'repeat(2, minmax(0, 1fr))' : '1fr',
                    md: jobsViewMode === 'grid' ? 'repeat(3, minmax(0, 1fr))' : '1fr',
                    lg: jobsViewMode === 'grid' ? 'repeat(3, minmax(0, 1fr))' : '1fr',
                    xl: jobsViewMode === 'grid' ? 'repeat(4, minmax(0, 1fr))' : '1fr',
                  },
                  gap: { xs: 1.5, sm: 1.75, md: 2 },
                  width: '100%',
                }}>
                  {paginatedJobs.map(job => {
                    const st = computeJobStatus(job);
                    const total = job.candidates.length;
                    const schedPct = total ? Math.round((st.schedCount / total) * 100) : 0;
                    const accentColor = st.allSched
                      ? BRAND.sageText
                      : st.anySched ? BRAND.amber : BRAND.err;
                    const previewCands = job.candidates.slice(0, 4);
                    const more = total - previewCands.length;

                    const StatusChipEl = (
                      <Chip
                        label={st.allSched
                          ? '✓ All scheduled'
                          : st.anySched
                            ? `${st.schedCount}/${total} scheduled`
                            : '⚠ Not scheduled'}
                        size="small"
                        sx={{
                          height: 22, fontSize: '0.68rem',
                          fontFamily: FONT, fontWeight: 700,
                          bgcolor: st.allSched
                            ? BRAND.sageSoft
                            : st.anySched ? BRAND.amberSoft : BRAND.errSoft,
                          color: st.allSched
                            ? BRAND.sageText
                            : st.anySched ? BRAND.amber : BRAND.err,
                          border: `0.5px solid ${st.allSched ? 'rgba(127,158,126,0.4)' : st.anySched ? 'rgba(163,90,45,0.4)' : 'rgba(180,70,47,0.4)'}`,
                          '& .MuiChip-label': { px: 0.9 },
                        }}
                      />
                    );

                    if (jobsViewMode === 'list') {
                      // ────────── LIST VIEW ROW ──────────
                      return (
                        <Box
                          key={job.jobTitle}
                          onClick={() => navigateToJob(job.jobTitle)}
                          sx={{
                            cursor: 'pointer',
                            bgcolor: BRAND.surface, border: `1px solid ${BRAND.border}`,
                            borderRadius: '14px', transition: 'all 0.2s ease',
                            fontFamily: FONT,
                            '&:hover': { borderColor: BRAND.sage, boxShadow: '0 6px 20px rgba(2,33,36,0.08)' },
                          }}>
                          {/* Desktop grid row (md+) */}
                          <Box sx={{
                            display: { xs: 'none', md: 'grid' },
                            gridTemplateColumns: '2.4fr 1fr 1fr 1.4fr 1.2fr 100px',
                            alignItems: 'center', px: 2.5, py: 1.75, gap: 2,
                          }}>
                            <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'center', minWidth: 0 }}>
                              <Box sx={{
                                width: 40, height: 40, borderRadius: '10px',
                                bgcolor: BRAND.navy, flexShrink: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>
                                <Typography sx={{ fontFamily: FONT, color: BRAND.sage, fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.02em' }}>
                                  {monogramOf(job.jobTitle)}
                                </Typography>
                              </Box>
                              <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Typography noWrap sx={{ fontSize: '0.95rem', fontWeight: 800, color: BRAND.ink, lineHeight: 1.25, letterSpacing: '-0.01em' }}>
                                  {job.jobTitle}
                                </Typography>
                                <Box sx={{ display: 'flex', mt: 0.3 }}>
                                  {previewCands.slice(0, 3).map((c, i) => {
                                    const nm = c.full_name || c.applicant?.full_name || c.candidate?.full_name || c.email || '?';
                                    return (
                                      <Avatar
                                        key={i}
                                        src={jobseekerService.photoUrlFor(c.applicant_id || c.candidate_id || c.candidate?.id)}
                                        sx={{
                                          width: 20, height: 20, fontSize: '0.58rem', fontWeight: 700,
                                          bgcolor: avatarColorFor(nm), color: '#fff',
                                          border: `1.5px solid ${BRAND.surface}`, ml: i === 0 ? 0 : '-6px',
                                        }}>
                                        {initialOf(nm)}
                                      </Avatar>
                                    );
                                  })}
                                  {more > 0 && (
                                    <Box sx={{
                                      width: 20, height: 20, borderRadius: '50%',
                                      bgcolor: BRAND.bg, color: BRAND.muted,
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      fontFamily: FONT, fontSize: '0.52rem', fontWeight: 800,
                                      border: `1.5px solid ${BRAND.surface}`, ml: '-6px',
                                    }}>
                                      +{Math.max(more, 0)}
                                    </Box>
                                  )}
                                </Box>
                              </Box>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <GroupsRounded sx={{ fontSize: 16, color: BRAND.sageText }} />
                              <Typography sx={{ fontSize: '0.95rem', fontWeight: 800, color: BRAND.sageText, fontVariantNumeric: 'tabular-nums' }}>
                                {total}
                              </Typography>
                            </Box>
                            <Typography sx={{ fontSize: '0.9rem', fontWeight: 800, color: st.allSched ? BRAND.sageText : accentColor, fontVariantNumeric: 'tabular-nums' }}>
                              {st.schedCount}
                            </Typography>
                            <Box>
                              <Stack direction="row" alignItems="center" spacing={1}>
                                <LinearProgress
                                  variant="determinate"
                                  value={schedPct}
                                  sx={{
                                    flex: 1, height: 8, borderRadius: 4,
                                    bgcolor: BRAND.border,
                                    '& .MuiLinearProgress-bar': {
                                      bgcolor: st.allSched ? BRAND.sageText : accentColor,
                                      borderRadius: 4,
                                    },
                                  }}
                                />
                                <Typography sx={{ fontSize: '0.75rem', fontWeight: 800, color: BRAND.ink, minWidth: 34, textAlign: 'right' }}>
                                  {schedPct}%
                                </Typography>
                              </Stack>
                            </Box>
                            <Box>{StatusChipEl}</Box>
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                              <IconButton size="small" sx={{
                                bgcolor: BRAND.sageSoft, color: BRAND.navy, borderRadius: '9px',
                                width: 34, height: 34,
                                '&:hover': { bgcolor: BRAND.navy, color: '#fff' },
                              }}>
                                <ArrowForwardRounded sx={{ fontSize: 17 }} />
                              </IconButton>
                            </Box>
                          </Box>

                          {/* Mobile stack (xs–sm) */}
                          <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', p: 2, gap: 1.2 }}>
                            <Stack direction="row" spacing={1.25} alignItems="flex-start">
                              <Box sx={{
                                width: 38, height: 38, borderRadius: '10px', bgcolor: BRAND.navy, flexShrink: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>
                                <Typography sx={{ fontFamily: FONT, color: BRAND.sage, fontWeight: 700, fontSize: '0.82rem' }}>
                                  {monogramOf(job.jobTitle)}
                                </Typography>
                              </Box>
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography sx={{
                                  fontSize: '0.92rem', fontWeight: 800, color: BRAND.ink,
                                  lineHeight: 1.25,
                                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                                }}>
                                  {job.jobTitle}
                                </Typography>
                                <Typography sx={{ fontSize: '0.72rem', color: BRAND.muted, fontWeight: 500, mt: 0.3 }}>
                                  {total} shortlisted · {st.schedCount} scheduled
                                </Typography>
                              </Box>
                            </Stack>
                            <LinearProgress
                              variant="determinate"
                              value={schedPct}
                              sx={{
                                height: 6, borderRadius: 3, bgcolor: BRAND.border,
                                '& .MuiLinearProgress-bar': { bgcolor: st.allSched ? BRAND.sageText : accentColor, borderRadius: 3 },
                              }}
                            />
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                              {StatusChipEl}
                              <IconButton size="small" sx={{
                                bgcolor: BRAND.sageSoft, color: BRAND.navy, borderRadius: '9px',
                                width: 32, height: 32,
                                '&:hover': { bgcolor: BRAND.navy, color: '#fff' },
                              }}>
                                <ArrowForwardRounded sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Stack>
                          </Box>
                        </Box>
                      );
                    }

                    // ────────── GRID VIEW CARD ──────────
                    const dashArray  = 2 * Math.PI * 22;
                    const dashOffset = dashArray - (dashArray * schedPct / 100);
                    return (
                      <Box
                        key={job.jobTitle}
                        onClick={() => navigateToJob(job.jobTitle)}
                        sx={{
                          cursor: 'pointer', position: 'relative', height: '100%',
                          display: 'flex', flexDirection: 'column',
                          bgcolor: BRAND.surface,
                          borderRadius: '16px',
                          border: `1px solid ${BRAND.border}`,
                          boxShadow: '0 10px 26px rgba(2,33,36,0.06)',
                          overflow: 'hidden', fontFamily: FONT,
                          transition: 'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease',
                          '&::before': {
                            content: '""', position: 'absolute',
                            left: 0, top: 0, bottom: 0, width: 4,
                            bgcolor: accentColor,
                            transition: 'width 0.28s ease',
                          },
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: '0 22px 48px -18px rgba(2,33,36,0.16)',
                            borderColor: BRAND.sage,
                          },
                          '&:hover::before': { width: 6 },
                        }}>
                        {/* Top row */}
                        <Stack direction="row" spacing={{ xs: 1.2, sm: 1.4 }} sx={{
                          px: { xs: 1.8, sm: 2, md: 2.2 },
                          pt: { xs: 1.7, sm: 1.9, md: 2 },
                          pb: { xs: 1.2, sm: 1.3 },
                          alignItems: 'flex-start',
                        }}>
                          <Box sx={{
                            width: { xs: 42, sm: 44 }, height: { xs: 42, sm: 44 },
                            borderRadius: '10px', bgcolor: BRAND.navy, flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <Typography sx={{
                              fontFamily: FONT, color: BRAND.sage, fontWeight: 700,
                              fontSize: { xs: '0.9rem', md: '0.95rem' }, letterSpacing: '0.02em',
                            }}>
                              {monogramOf(job.jobTitle)}
                            </Typography>
                          </Box>
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography sx={{
                              fontFamily: FONT, fontWeight: 800, color: BRAND.ink,
                              fontSize: { xs: '0.95rem', sm: '1rem', md: '1.02rem' },
                              letterSpacing: '-0.01em', lineHeight: 1.3,
                              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}>
                              {job.jobTitle}
                            </Typography>
                            <Typography sx={{
                              fontFamily: FONT, mt: 0.4,
                              fontSize: { xs: '0.7rem', sm: '0.74rem' },
                              color: BRAND.muted, fontWeight: 500,
                            }}>
                              {total} shortlisted · {st.schedCount} scheduled
                            </Typography>
                          </Box>
                        </Stack>

                        {/* Progress + metrics */}
                        <Stack direction="row" spacing={{ xs: 1.5, sm: 2 }} sx={{
                          px: { xs: 1.8, sm: 2, md: 2.2 },
                          pb: { xs: 1.2, sm: 1.4 }, alignItems: 'center',
                        }}>
                          <Box sx={{ position: 'relative', width: 62, height: 62, flexShrink: 0 }}>
                            <Box component="svg" viewBox="0 0 56 56"
                              sx={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                              <circle cx="28" cy="28" r="22" fill="none"
                                stroke={BRAND.border} strokeWidth="5" />
                              <circle cx="28" cy="28" r="22" fill="none"
                                stroke={st.allSched ? BRAND.sageText : accentColor} strokeWidth="5"
                                strokeLinecap="round"
                                strokeDasharray={dashArray}
                                strokeDashoffset={dashOffset}
                                style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
                            </Box>
                            <Box sx={{
                              position: 'absolute', inset: 0,
                              display: 'flex', flexDirection: 'column',
                              alignItems: 'center', justifyContent: 'center',
                            }}>
                              <Typography sx={{ fontFamily: FONT, fontSize: '0.86rem', fontWeight: 800, color: BRAND.ink, lineHeight: 1 }}>
                                {schedPct}%
                              </Typography>
                              <Typography sx={{
                                fontFamily: FONT, fontSize: '0.5rem', color: BRAND.muted,
                                fontWeight: 700, mt: 0.2, textTransform: 'uppercase', letterSpacing: '0.05em',
                              }}>
                                Done
                              </Typography>
                            </Box>
                          </Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            {[
                              { l: 'Shortlisted', v: total, c: BRAND.ink },
                              { l: 'Scheduled',   v: st.schedCount, c: st.allSched ? BRAND.sageText : accentColor },
                              { l: 'Pending',     v: total - st.schedCount, c: (total - st.schedCount) === 0 ? BRAND.sageText : BRAND.amber },
                            ].map((m, i) => (
                              <Stack
                                key={i}
                                direction="row"
                                alignItems="baseline"
                                sx={{
                                  width: '100%',
                                  justifyContent: 'space-between',
                                  gap: 1,
                                  mb: i < 2 ? 0.4 : 0,
                                }}
                              >
                                <Typography sx={{
                                  fontFamily: FONT, fontSize: '0.72rem',
                                  color: BRAND.muted, fontWeight: 600,
                                  lineHeight: 1.4,
                                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                  minWidth: 0, flex: '1 1 auto',
                                }}>
                                  {m.l}
                                </Typography>
                                <Typography sx={{
                                  fontFamily: FONT, fontSize: '0.78rem',
                                  color: m.c, fontWeight: 800,
                                  lineHeight: 1.4,
                                  fontVariantNumeric: 'tabular-nums',
                                  flexShrink: 0,
                                }}>
                                  {m.v}
                                </Typography>
                              </Stack>
                            ))}
                          </Box>
                        </Stack>

                        {/* Avatar stack */}
                        <Stack direction="row" spacing={1.2} sx={{
                          px: { xs: 1.8, sm: 2, md: 2.2 }, pb: 1.3, alignItems: 'center',
                        }}>
                          <Box sx={{ display: 'flex' }}>
                            {previewCands.map((c, i) => {
                              const nm = c.full_name || c.applicant?.full_name || c.candidate?.full_name || c.email || '?';
                              return (
                                <Avatar
                                  key={i}
                                  src={jobseekerService.photoUrlFor(c.applicant_id || c.candidate_id || c.candidate?.id)}
                                  sx={{
                                    width: 28, height: 28, fontSize: '0.68rem', fontWeight: 700,
                                    bgcolor: avatarColorFor(nm), color: '#fff',
                                    border: `2px solid ${BRAND.surface}`,
                                    ml: i === 0 ? 0 : '-8px',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                                  }}>
                                  {initialOf(nm)}
                                </Avatar>
                              );
                            })}
                            {more > 0 && (
                              <Box sx={{
                                width: 28, height: 28, borderRadius: '50%',
                                bgcolor: BRAND.bg, color: BRAND.muted,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontFamily: FONT, fontSize: '0.62rem', fontWeight: 800,
                                border: `2px solid ${BRAND.surface}`, ml: '-8px',
                              }}>
                                +{more}
                              </Box>
                            )}
                          </Box>
                          <Typography sx={{
                            fontFamily: FONT, fontSize: '0.72rem',
                            color: BRAND.muted, fontWeight: 600,
                          }}>
                            {total} candidate{total !== 1 ? 's' : ''}
                          </Typography>
                        </Stack>

                        {/* Footer */}
                        <Box sx={{
                          mt: 'auto',
                          px: { xs: 1.8, sm: 2, md: 2.2 }, py: 1.3,
                          bgcolor: BRAND.bg, borderTop: `1px solid ${BRAND.border}`,
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1,
                        }}>
                          {StatusChipEl}
                          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: accentColor }}>
                            <Typography sx={{
                              fontFamily: FONT, fontSize: '0.75rem',
                              fontWeight: 800, color: accentColor,
                            }}>
                              View candidates
                            </Typography>
                            <ArrowForwardRounded sx={{ fontSize: 15, color: accentColor }} />
                          </Stack>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>

                {/* ══ Pagination bar (identical to My Jobs) ══════════════════ */}
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
                        color: BRAND.muted, fontWeight: 500, whiteSpace: 'nowrap', fontFamily: FONT,
                      }}>
                        Showing{' '}
                        <Box component="span" sx={{ color: BRAND.ink, fontWeight: 700 }}>
                          {(page - 1) * effectivePageSize + 1}–{Math.min(page * effectivePageSize, sortedJobs.length)}
                        </Box>
                        {' '}of{' '}
                        <Box component="span" sx={{ color: BRAND.ink, fontWeight: 700 }}>
                          {sortedJobs.length}
                        </Box>
                        {' '}{sortedJobs.length === 1 ? 'job' : 'jobs'}
                      </Typography>

                      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                        <Typography sx={{
                          fontSize: { xs: '0.78rem', sm: '0.82rem' },
                          color: BRAND.muted, fontWeight: 500, fontFamily: FONT,
                        }}>Show</Typography>
                        <Select
                          size="small"
                          value={pageSize}
                          onChange={(e) => {
                            const v = e.target.value;
                            setPageSize(v === 'all' ? 'all' : Number(v));
                            setPage(1);
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
                          color: BRAND.muted, fontWeight: 500, fontFamily: FONT,
                        }}>per page</Typography>
                      </Stack>
                    </Stack>

                    <Pagination
                      count={totalPages}
                      page={page}
                      onChange={(_e, v) => { setPage(v); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
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
          </>
        ) : activeJob ? (
          /* ─── CANDIDATES DRILL-DOWN VIEW ─────────────────────────────── */
          (() => {
            const { jobTitle, jobId, candidates: grp } = activeJob;
            const st = computeJobStatus(activeJob);
            const selCount = getSelCount(jobTitle);

            // Helper: extract experience number from a candidate record
            const expOf = (c) => {
              const v = c.years_of_experience ?? c.relevant_experience_years ?? c.experience_years;
              return v == null ? -1 : Number(v);
            };
            const nameOf = (c) =>
              (c.full_name || c.applicant?.full_name || c.candidate?.full_name || c.email || '').toLowerCase();

            const q = search.trim().toLowerCase();
            // Filter pipeline: status pill → search
            const preFiltered = grp
              .filter(c => {
                if (candFilter === 'sched')   return st.isCandSched(c);
                if (candFilter === 'nosched') return !st.isCandSched(c);
                return true;
              })
              .filter(c => {
                if (!q) return true;
                const nm = nameOf(c);
                const em = (c.email || c.candidate?.email || c.applicant?.email || '').toLowerCase();
                return nm.includes(q) || em.includes(q);
              });

            // Sort
            const filteredCands = [...preFiltered].sort((a, b) => {
              if (candSortBy === 'name-asc')  return nameOf(a).localeCompare(nameOf(b));
              if (candSortBy === 'name-desc') return nameOf(b).localeCompare(nameOf(a));
              if (candSortBy === 'exp-desc')  return expOf(b) - expOf(a);
              if (candSortBy === 'exp-asc')   return expOf(a) - expOf(b);
              if (candSortBy === 'status-sched') {
                const sa = st.isCandSched(a) ? 0 : 1;
                const sb = st.isCandSched(b) ? 0 : 1;
                if (sa !== sb) return sa - sb;
                return nameOf(a).localeCompare(nameOf(b));
              }
              if (candSortBy === 'status-pending') {
                const sa = st.isCandSched(a) ? 1 : 0;
                const sb = st.isCandSched(b) ? 1 : 0;
                if (sa !== sb) return sa - sb;
                return nameOf(a).localeCompare(nameOf(b));
              }
              return 0;
            });

            // Pagination
            const candEffPageSize = candPageSize === 'all' ? Math.max(filteredCands.length, 1) : candPageSize;
            const candTotalPages  = Math.max(1, Math.ceil(filteredCands.length / candEffPageSize));
            const paginatedCands  = filteredCands.slice(
              (candPage - 1) * candEffPageSize,
              (candPage - 1) * candEffPageSize + candEffPageSize,
            );

            const allSelInFiltered  = filteredCands.length > 0 && filteredCands.every(c => selMap[jobTitle]?.has(getCandUid(c)));
            const someSelInFiltered = !allSelInFiltered && filteredCands.some(c => selMap[jobTitle]?.has(getCandUid(c)));
            const hasUnschedSelected = selCount > 0 && grp
              .filter(c => selMap[jobTitle]?.has(getCandUid(c)))
              .some(c => !st.isCandSched(c));

            const handleToggleAllFiltered = (checked) => {
              setSelMap(prev => {
                const cur = new Set(prev[jobTitle] || []);
                if (checked) filteredCands.forEach(c => cur.add(getCandUid(c)));
                else         filteredCands.forEach(c => cur.delete(getCandUid(c)));
                return { ...prev, [jobTitle]: cur };
              });
            };

            return (
              <>
                {/* Sticky action bar */}
                <Paper elevation={0} sx={{
                  background: selCount > 0
                    ? `linear-gradient(90deg, ${BRAND.sageSoft} 0%, ${BRAND.surface} 65%)`
                    : BRAND.surface,
                  border: `1px solid ${selCount > 0 ? BRAND.sage : BRAND.border}`,
                  borderRadius: { xs: '12px', sm: '13px' },
                  p: { xs: 1.4, sm: 1.6 },
                  mb: { xs: 1.5, sm: 2 },
                  boxShadow: selCount > 0
                    ? '0 4px 14px rgba(127,158,126,0.15)'
                    : '0 1px 2px rgba(16,18,16,0.04)',
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: { xs: 'flex-start', sm: 'center' },
                  gap: { xs: 1, sm: 1.5 }, flexWrap: 'wrap',
                  transition: 'all 0.28s ease',
                  position: 'sticky', top: 0, zIndex: 60,
                }}>
                  <Stack direction="row" alignItems="center" spacing={{ xs: 1, sm: 1.5 }} sx={{ flexWrap: 'wrap', gap: 1 }}>
                    <Tooltip title={allSelInFiltered ? 'Deselect all' : `Select all ${filteredCands.length}`} arrow>
                      <Box
                        onClick={() => handleToggleAllFiltered(!allSelInFiltered)}
                        sx={{
                          display: 'flex', alignItems: 'center', gap: 0.9,
                          px: 1.4, py: 0.7, borderRadius: '9px',
                          bgcolor: BRAND.bg, border: `1px solid ${BRAND.borderStrong}`,
                          cursor: 'pointer', transition: 'all 0.18s ease',
                          '&:hover': { borderColor: BRAND.sage, bgcolor: BRAND.sageSoft, color: BRAND.navy },
                        }}>
                        <Checkbox
                          size="small"
                          checked={allSelInFiltered}
                          indeterminate={someSelInFiltered}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleToggleAllFiltered(e.target.checked)}
                          sx={{
                            p: 0, color: BRAND.borderStrong,
                            '&.Mui-checked': { color: BRAND.navy },
                            '&.MuiCheckbox-indeterminate': { color: BRAND.navy },
                            '& .MuiSvgIcon-root': { fontSize: 18 },
                          }}
                        />
                        <Typography sx={{
                          fontFamily: FONT, fontSize: { xs: '0.72rem', sm: '0.78rem' },
                          fontWeight: 700, color: BRAND.muted,
                        }}>
                          {allSelInFiltered ? 'Deselect' : 'Select all'}{filteredCands.length ? ` (${filteredCands.length})` : ''}
                        </Typography>
                      </Box>
                    </Tooltip>
                    <Typography sx={{
                      fontFamily: FONT, fontSize: { xs: '0.74rem', sm: '0.8rem' },
                      color: selCount > 0 ? BRAND.sageText : BRAND.muted, fontWeight: 600,
                    }}>
                      {selCount > 0
                        ? <><Box component="span" sx={{ color: BRAND.navy, fontWeight: 800 }}>{selCount}</Box> selected</>
                        : 'Tick candidates to schedule'}
                    </Typography>
                  </Stack>
                  <Tooltip title={
                    selCount === 0
                      ? 'Tick at least one candidate to enable'
                      : `Schedule ${selCount} candidate${selCount !== 1 ? 's' : ''} into a NEW pipeline`
                  } arrow>
                    <span>
                      <Button
                        variant="contained" disableElevation
                        disabled={selCount === 0}
                        startIcon={<Assignment sx={{ fontSize: 16 }} />}
                        onClick={() => handleScheduleSelected(jobTitle, jobId)}
                        sx={{
                          textTransform: 'none', fontFamily: FONT,
                          fontSize: { xs: '0.76rem', sm: '0.82rem' },
                          fontWeight: 700, borderRadius: '10px',
                          px: { xs: 1.8, sm: 2.2 }, py: { xs: 0.8, sm: 0.95 },
                          bgcolor: BRAND.sage,
                          color: '#fff', whiteSpace: 'nowrap',
                          boxShadow: '0 4px 12px rgba(127,158,126,0.42)',
                          transition: 'all 0.22s ease',
                          '&:hover': {
                            bgcolor: BRAND.sageDark,
                            transform: 'translateY(-1px)',
                            boxShadow: '0 6px 18px rgba(127,158,126,0.52)',
                          },
                          '&.Mui-disabled': { opacity: 0.4, bgcolor: BRAND.borderStrong, color: '#fff', boxShadow: 'none' },
                        }}>
                        {/* R3: schedule-only — no "Edit Schedule" variant exists any more */}
                        {selCount === 0 ? 'Schedule Interview' : `Schedule (${selCount})`}
                      </Button>
                    </span>
                  </Tooltip>
                </Paper>

                {/* Candidate list — grid OR list based on candViewMode, with pagination */}
                {filteredCands.length === 0 ? (
                  <SectionCard>
                    <Box sx={{ textAlign: 'center', py: { xs: 5, sm: 6 }, px: 2 }}>
                      <Box sx={{
                        width: 60, height: 60, borderRadius: '50%',
                        bgcolor: BRAND.sageSoft, mx: 'auto', mb: 2,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {candFilter === 'sched'
                          ? <Schedule sx={{ fontSize: 28, color: BRAND.sage }} />
                          : <HowToReg sx={{ fontSize: 28, color: BRAND.sage }} />}
                      </Box>
                      <Typography sx={{
                        fontFamily: FONT, fontWeight: 700, color: BRAND.ink, mb: 0.5,
                        fontSize: { xs: '0.92rem', sm: '1rem' },
                      }}>
                        {q
                          ? 'No candidates match your search'
                          : candFilter === 'sched'
                            ? 'No scheduled candidates yet'
                            : candFilter === 'nosched'
                              ? 'All candidates are scheduled'
                              : 'No candidates in this filter'}
                      </Typography>
                      <Typography sx={{
                        fontFamily: FONT, fontSize: { xs: '0.76rem', sm: '0.82rem' },
                        color: BRAND.muted,
                      }}>
                        Try switching the filter above{q ? ' or clearing the search' : ''}
                      </Typography>
                    </Box>
                  </SectionCard>
                ) : candViewMode === 'grid' ? (
                  /* ═══════════════════ CANDIDATES · GRID VIEW ═══════════════════ */
                  <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: '1fr',
                      sm: 'repeat(2, minmax(0, 1fr))',
                      md: 'repeat(2, minmax(0, 1fr))',
                      lg: 'repeat(3, minmax(0, 1fr))',
                      xl: 'repeat(4, minmax(0, 1fr))',
                    },
                    gap: { xs: 1.5, sm: 1.75, md: 2 },
                    width: '100%',
                  }}>
                    {paginatedCands.map((c, i) => {
                      const name = c.full_name || c.applicant?.full_name || c.candidate?.full_name
                        || c.candidate_name || c.email || c.applicant?.email || 'Unknown';
                      const email = c.email || c.candidate?.email || c.applicant?.email || '';
                      const exp  = c.years_of_experience ?? c.relevant_experience_years ?? c.experience_years ?? null;
                      const uid  = getCandUid(c);
                      const isSel = selMap[jobTitle]?.has(uid) || false;
                      const isSched = st.isCandSched(c);
                      // R2: already inside an active pipeline → locked, read-only here
                      const lockedMem = membershipOf(c);
                      const diffKey = String(c.difficulty || c.level || '').toLowerCase();
                      const diff = DIFFICULTY_CFG[diffKey];
                      const accentColor = lockedMem ? BRAND.navy : (isSched ? BRAND.sageText : BRAND.amber);

                      return (
                        <Box
                          key={i}
                          onClick={() => { if (!lockedMem) handleCheck(jobTitle, uid, !isSel); }}
                          sx={{
                            cursor: lockedMem ? 'not-allowed' : 'pointer',
                            opacity: lockedMem ? 0.72 : 1,
                            position: 'relative', height: '100%',
                            display: 'flex', flexDirection: 'column',
                            bgcolor: isSel ? BRAND.sageSoft : BRAND.surface,
                            borderRadius: '14px',
                            border: `1px solid ${isSel ? BRAND.sage : BRAND.border}`,
                            boxShadow: isSel
                              ? '0 8px 22px rgba(2,33,36,0.10)'
                              : '0 6px 16px rgba(2,33,36,0.05)',
                            overflow: 'hidden', fontFamily: FONT,
                            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                            '&::before': {
                              content: '""', position: 'absolute',
                              left: 0, top: 0, bottom: 0, width: 3,
                              bgcolor: accentColor,
                              transform: isSel ? 'scaleX(1.5)' : 'scaleX(1)',
                              transformOrigin: 'left',
                              transition: 'transform 0.25s ease',
                            },
                            '&:hover': {
                              transform: 'translateY(-3px)',
                              boxShadow: '0 16px 34px -14px rgba(2,33,36,0.14)',
                              borderColor: BRAND.sage,
                            },
                          }}>
                          {/* Top row: checkbox + status chip */}
                          <Stack direction="row" justifyContent="space-between" alignItems="center"
                            sx={{ px: 1.6, pt: 1.4, pb: 0.6 }}>
                            <Checkbox
                              size="small"
                              checked={isSel}
                              disabled={!!lockedMem}
                              onChange={(e) => { e.stopPropagation(); handleCheck(jobTitle, uid, e.target.checked); }}
                              onClick={(e) => e.stopPropagation()}
                              sx={{
                                p: 0.4, color: BRAND.borderStrong,
                                '&.Mui-checked': { color: BRAND.navy },
                                '& .MuiSvgIcon-root': { fontSize: 20 },
                              }}
                            />
                            <Chip
                              label={lockedMem
                                ? `🔒 ${lockedMem.processName}`
                                : (isSched ? '✓ Scheduled' : '⚠ Pending')}
                              size="small"
                              title={lockedMem
                                ? 'Already inside this pipeline — manage in Ranked Results'
                                : undefined}
                              sx={{
                                height: 22, fontSize: '0.66rem',
                                fontWeight: 700, fontFamily: FONT,
                                maxWidth: 170,
                                bgcolor: lockedMem ? 'rgba(2,33,36,0.07)'
                                       : isSched ? BRAND.sageSoft : BRAND.amberSoft,
                                color:   lockedMem ? BRAND.navy
                                       : isSched ? BRAND.sageText : BRAND.amber,
                                border: `0.5px solid ${isSched ? 'rgba(127,158,126,0.4)' : 'rgba(163,90,45,0.34)'}`,
                                '& .MuiChip-label': { px: 0.9 },
                              }}
                            />
                          </Stack>

                          {/* Avatar + name */}
                          <Stack direction="row" spacing={1.4} sx={{ px: 1.8, pb: 1, alignItems: 'flex-start' }}>
                            <Avatar
                              src={jobseekerService.photoUrlFor(c.applicant_id || c.candidate_id || c.candidate?.id)}
                              sx={{
                                width: 52, height: 52,
                                fontSize: '1.15rem', fontWeight: 700,
                                bgcolor: avatarColorFor(name), color: '#fff',
                                transition: 'all 0.28s ease',
                                boxShadow: isSel ? '0 4px 14px rgba(2,33,36,0.24)' : '0 2px 6px rgba(2,33,36,0.10)',
                                transform: isSel ? 'scale(1.05)' : 'scale(1)',
                                flexShrink: 0,
                              }}>
                              {initialOf(name)}
                            </Avatar>
                            <Box sx={{ flex: 1, minWidth: 0, pt: 0.4 }}>
                              <Typography sx={{
                                fontFamily: FONT,
                                fontWeight: isSel ? 800 : 700, color: BRAND.ink,
                                fontSize: '0.95rem',
                                lineHeight: 1.25,
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              }}>
                                {name}
                              </Typography>
                              {diff && (
                                <Chip label={diff.label} size="small" sx={{
                                  height: 17,
                                  fontSize: '0.55rem',
                                  fontWeight: 800, fontFamily: FONT,
                                  bgcolor: diff.bg, color: diff.color,
                                  textTransform: 'uppercase', letterSpacing: '0.04em',
                                  mt: 0.5,
                                  '& .MuiChip-label': { px: 0.7 },
                                }} />
                              )}
                            </Box>
                          </Stack>

                          {/* Email + experience */}
                          <Box sx={{ px: 1.8, pb: 1.4, mt: 'auto' }}>
                            {email && (
                              <Typography sx={{
                                fontFamily: FONT, fontSize: '0.72rem',
                                color: BRAND.muted, fontWeight: 500,
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                mb: 0.4,
                              }}>
                                ✉ {email}
                              </Typography>
                            )}
                            <Typography sx={{
                              fontFamily: FONT, fontSize: '0.72rem',
                              color: BRAND.sageText, fontWeight: 700,
                            }}>
                              {exp != null ? `📅 ${exp} ${exp === 1 ? 'year' : 'years'} experience` : '📅 Experience not listed'}
                            </Typography>
                          </Box>

                          {/* Footer: tap-to-select hint */}
                          <Box sx={{
                            px: 1.8, py: 1,
                            bgcolor: isSel ? 'rgba(127,158,126,0.15)' : BRAND.bg,
                            borderTop: `1px solid ${BRAND.border}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1,
                          }}>
                            <Typography sx={{
                              fontFamily: FONT, fontSize: '0.7rem',
                              color: isSel ? BRAND.sageText : BRAND.muted,
                              fontWeight: 700,
                            }}>
                              {isSel ? '✓ Selected' : 'Tap to select'}
                            </Typography>
                            <IconButton
                              size="small"
                              onClick={(e) => { e.stopPropagation(); setSelectedCandidate(c); }}
                              sx={{
                                color: BRAND.navy, bgcolor: BRAND.surface,
                                border: `1px solid ${BRAND.border}`,
                                width: 26, height: 26, borderRadius: '7px',
                                '&:hover': { bgcolor: BRAND.navy, color: '#fff', borderColor: BRAND.navy },
                              }}>
                              <ArrowForwardRounded sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                ) : (
                  /* ═══════════════════ CANDIDATES · LIST VIEW ═══════════════════ */
                  <SectionCard>
                    <Box>
                      {paginatedCands.map((c, i) => {
                        const name = c.full_name || c.applicant?.full_name || c.candidate?.full_name
                          || c.candidate_name || c.email || c.applicant?.email || 'Unknown';
                        const email = c.email || c.candidate?.email || c.applicant?.email || '';
                        const exp  = c.years_of_experience ?? c.relevant_experience_years ?? c.experience_years ?? null;
                        const uid  = getCandUid(c);
                        const isSel = selMap[jobTitle]?.has(uid) || false;
                        const isSched = st.isCandSched(c);
                        // R2: already inside an active pipeline → locked, read-only here
                        const lockedMem = membershipOf(c);
                        const diffKey = String(c.difficulty || c.level || '').toLowerCase();
                        const diff = DIFFICULTY_CFG[diffKey];

                        return (
                          <Stack
                            key={i}
                            direction="row" alignItems="center"
                            spacing={{ xs: 1.2, sm: 1.5 }}
                            onClick={() => { if (!lockedMem) handleCheck(jobTitle, uid, !isSel); }}
                            sx={{
                              px: { xs: 1.5, sm: 2, md: 2.4 },
                              py: { xs: 1.2, sm: 1.4, md: 1.6 },
                              cursor: lockedMem ? 'not-allowed' : 'pointer',
                              opacity: lockedMem ? 0.72 : 1,
                              borderBottom: `1px solid ${BRAND.border}`,
                              bgcolor: isSel ? BRAND.sageSoft : BRAND.surface,
                              transition: 'all 0.22s ease',
                              position: 'relative',
                              '&:last-of-type': { borderBottom: 'none' },
                              '&:hover': { bgcolor: isSel ? BRAND.navySoftHover : BRAND.bg },
                              '&::before': {
                                content: '""', position: 'absolute',
                                left: 0, top: 0, bottom: 0, width: 3,
                                bgcolor: BRAND.sage,
                                transform: isSel ? 'scaleY(1)' : 'scaleY(0)',
                                transformOrigin: 'center',
                                transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                              },
                            }}>
                            <Checkbox
                              size="small"
                              checked={isSel}
                              disabled={!!lockedMem}
                              onChange={(e) => { e.stopPropagation(); handleCheck(jobTitle, uid, e.target.checked); }}
                              onClick={(e) => e.stopPropagation()}
                              sx={{
                                p: 0.4, color: BRAND.borderStrong,
                                '&.Mui-checked': { color: BRAND.navy },
                                '& .MuiSvgIcon-root': { fontSize: 20 },
                                flexShrink: 0,
                              }}
                            />
                            <Avatar
                              src={jobseekerService.photoUrlFor(c.applicant_id || c.candidate_id || c.candidate?.id)}
                              sx={{
                                width:  { xs: 36, sm: 40 }, height: { xs: 36, sm: 40 },
                                fontSize: { xs: '0.82rem', sm: '0.92rem' }, fontWeight: 700,
                                bgcolor: avatarColorFor(name), color: '#fff',
                                transition: 'all 0.28s ease',
                                boxShadow: isSel ? '0 4px 12px rgba(2,33,36,0.22)' : 'none',
                                transform: isSel ? 'scale(1.05)' : 'scale(1)',
                                flexShrink: 0,
                              }}>
                              {initialOf(name)}
                            </Avatar>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Stack direction="row" spacing={0.9} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 0.3 }}>
                                <Typography sx={{
                                  fontFamily: FONT,
                                  fontWeight: isSel ? 800 : 700, color: BRAND.ink,
                                  fontSize: { xs: '0.85rem', sm: '0.92rem' },
                                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                  maxWidth: { xs: 160, sm: 280, md: 400 },
                                }}>
                                  {name}
                                </Typography>
                                {diff && (
                                  <Chip label={diff.label} size="small" sx={{
                                    height: { xs: 17, sm: 18 },
                                    fontSize: { xs: '0.55rem', sm: '0.58rem' },
                                    fontWeight: 800, fontFamily: FONT,
                                    bgcolor: diff.bg, color: diff.color,
                                    textTransform: 'uppercase', letterSpacing: '0.04em',
                                    '& .MuiChip-label': { px: 0.7 },
                                  }} />
                                )}
                              </Stack>
                              <Stack direction="row" spacing={{ xs: 1, sm: 1.5 }} alignItems="center" flexWrap="wrap" useFlexGap>
                                {email && (
                                  <Typography sx={{
                                    fontFamily: FONT, fontSize: { xs: '0.66rem', sm: '0.72rem' },
                                    color: BRAND.muted, fontWeight: 500,
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                    maxWidth: { xs: 140, sm: 240, md: 320 },
                                    display: { xs: 'none', sm: 'block' },
                                  }}>
                                    {email}
                                  </Typography>
                                )}
                                <Typography sx={{
                                  fontFamily: FONT, fontSize: { xs: '0.66rem', sm: '0.72rem' },
                                  color: BRAND.sageText, fontWeight: 700,
                                }}>
                                  {exp != null ? `${exp} yr exp` : 'Experience not listed'}
                                </Typography>
                              </Stack>
                            </Box>
                            <Chip
                              label={isSched ? '✓ Scheduled' : '⚠ Pending'}
                              size="small"
                              sx={{
                                height: { xs: 20, sm: 22 },
                                fontSize: { xs: '0.6rem', sm: '0.66rem' },
                                fontWeight: 700, fontFamily: FONT,
                                bgcolor: isSched ? BRAND.sageSoft : BRAND.amberSoft,
                                color:   isSched ? BRAND.sageText : BRAND.amber,
                                border: `0.5px solid ${isSched ? 'rgba(127,158,126,0.4)' : 'rgba(163,90,45,0.34)'}`,
                                flexShrink: 0,
                                '& .MuiChip-label': { px: { xs: 0.7, sm: 0.9 } },
                              }}
                            />
                          </Stack>
                        );
                      })}
                    </Box>
                  </SectionCard>
                )}

                {/* ══ Pagination bar (identical to jobs / My Jobs pattern) ═════ */}
                {filteredCands.length > 0 && (
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
                        color: BRAND.muted, fontWeight: 500, whiteSpace: 'nowrap', fontFamily: FONT,
                      }}>
                        Showing{' '}
                        <Box component="span" sx={{ color: BRAND.ink, fontWeight: 700 }}>
                          {(candPage - 1) * candEffPageSize + 1}–{Math.min(candPage * candEffPageSize, filteredCands.length)}
                        </Box>
                        {' '}of{' '}
                        <Box component="span" sx={{ color: BRAND.ink, fontWeight: 700 }}>
                          {filteredCands.length}
                        </Box>
                        {' '}{filteredCands.length === 1 ? 'candidate' : 'candidates'}
                      </Typography>

                      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                        <Typography sx={{
                          fontSize: { xs: '0.78rem', sm: '0.82rem' },
                          color: BRAND.muted, fontWeight: 500, fontFamily: FONT,
                        }}>Show</Typography>
                        <Select
                          size="small"
                          value={candPageSize}
                          onChange={(e) => {
                            const v = e.target.value;
                            setCandPageSize(v === 'all' ? 'all' : Number(v));
                            setCandPage(1);
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
                          color: BRAND.muted, fontWeight: 500, fontFamily: FONT,
                        }}>per page</Typography>
                      </Stack>
                    </Stack>

                    <Pagination
                      count={candTotalPages}
                      page={candPage}
                      onChange={(_e, v) => { setCandPage(v); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
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
            );
          })()
        ) : (
          <SectionCard sx={{ p: { xs: 4, sm: 6 }, textAlign: 'center' }}>
            <Typography sx={{ fontFamily: FONT, color: BRAND.muted, fontSize: '0.9rem' }}>
              Job not found. <Button size="small" onClick={navigateToJobs}
                sx={{ textTransform: 'none', color: BRAND.navy, fontWeight: 700, fontFamily: FONT }}>Back to jobs</Button>
            </Typography>
          </SectionCard>
        )
        )}

      {/* ══ Dialogs ══════════════════════════════════════════════════════════ */}
      <CandidateDetailDialog open={!!selectedCandidate} onClose={() => { setSelectedCandidate(null); setDetailLoading(false); }} candidate={selectedCandidate} detailLoading={detailLoading} />
      <ManagePipelineDialog  open={manageDialog.open} process={manageDialog.process} onClose={() => setManageDialog({ open: false, process: null })} onDone={fetchAll} />
      {/* ── Locked-candidates notice (replaces the two snackbars) ─────────── */}
      <Dialog
        open={lockedNoticeDialog.open}
        onClose={() => setLockedNoticeDialog(s => ({ ...s, open: false }))}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: {
          borderRadius: '18px', overflow: 'hidden', fontFamily: FONT,
          border: `1px solid ${BRAND.border}`,
          boxShadow: '0 24px 64px -16px rgba(2,33,36,0.22)',
        } } }}
      >
        {/* Header */}
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 1.25,
          background: `linear-gradient(135deg, ${BRAND.amber} 0%, #7A3F1C 100%)`,
          px: { xs: 2.25, sm: 3 }, py: 2.25,
        }}>
          <Box sx={{
            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
            bgcolor: '#FFFFFF', color: BRAND.amber,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '16px', fontWeight: 800, fontFamily: FONT, lineHeight: 1,
          }}>!</Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '1.02rem', fontFamily: FONT, lineHeight: 1.2 }}>
              {lockedNoticeDialog.fresh.length === 0
                ? 'These candidates are already in a pipeline'
                : 'Some candidates were skipped'}
            </Typography>
            <Typography sx={{ color: '#FBE4CE', fontSize: '0.78rem', fontFamily: FONT, mt: 0.3 }}>
              {lockedNoticeDialog.locked.length} already in a pipeline
              {lockedNoticeDialog.fresh.length > 0
                ? ` · ${lockedNoticeDialog.fresh.length} ready to schedule`
                : ''}
            </Typography>
          </Box>
        </Box>

        {/* Body */}
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography sx={{ fontSize: '0.86rem', color: BRAND.ink, lineHeight: 1.55, mb: 2, fontFamily: FONT }}>
            {lockedNoticeDialog.fresh.length === 0
              ? `All ${lockedNoticeDialog.locked.length} candidate${lockedNoticeDialog.locked.length !== 1 ? 's' : ''} you selected are already part of an existing pipeline for this job, so they can't be scheduled again from here.`
              : `${lockedNoticeDialog.locked.length} of the ${lockedNoticeDialog.locked.length + lockedNoticeDialog.fresh.length} candidates you selected are already inside an existing pipeline, so they've been skipped. You can continue scheduling the remaining ${lockedNoticeDialog.fresh.length}.`}
          </Typography>

          {/* Skipped list */}
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, color: BRAND.amber, textTransform: 'uppercase',
            letterSpacing: '0.06em', mb: 0.9, fontFamily: FONT }}>
            Skipped — already in a pipeline
          </Typography>
          <Box sx={{
            border: `1px solid ${BRAND.border}`, borderRadius: '10px',
            bgcolor: BRAND.amberSoft, p: 1.25, mb: lockedNoticeDialog.fresh.length ? 2 : 2.25,
          }}>
            <Stack spacing={0.75}>
              {lockedNoticeDialog.locked.map((c, i) => (
                <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5 }}>
                  <Typography sx={{ fontSize: '0.85rem', color: BRAND.ink, fontWeight: 600, fontFamily: FONT }}>
                    {c.name}
                  </Typography>
                  <Typography sx={{ fontSize: '0.78rem', color: BRAND.amber, fontWeight: 700, fontFamily: FONT, whiteSpace: 'nowrap' }}>
                    {c.pipelineName}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Box>

          {/* Fresh list — only when some can proceed */}
          {lockedNoticeDialog.fresh.length > 0 && (
            <>
              <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, color: BRAND.sageText, textTransform: 'uppercase',
                letterSpacing: '0.06em', mb: 0.9, fontFamily: FONT }}>
                Will be scheduled
              </Typography>
              <Box sx={{
                border: `1px solid ${BRAND.border}`, borderRadius: '10px',
                bgcolor: BRAND.sageSoft, p: 1.25, mb: 2.25,
              }}>
                <Stack spacing={0.75}>
                  {lockedNoticeDialog.fresh.map((c, i) => (
                    <Typography key={i} sx={{ fontSize: '0.85rem', color: BRAND.ink, fontWeight: 600, fontFamily: FONT }}>
                      {c.name}
                    </Typography>
                  ))}
                </Stack>
              </Box>
            </>
          )}

          <Typography sx={{ fontSize: '0.8rem', color: BRAND.muted, lineHeight: 1.5, mb: 2.25, fontFamily: FONT }}>
            Need to reschedule or change a round for the skipped candidates? Open <strong>Round Approvals</strong>.
          </Typography>

          {/* Actions */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} justifyContent="flex-end">
            <Button
              onClick={() => setLockedNoticeDialog(s => ({ ...s, open: false }))}
              sx={{
                borderRadius: '10px', textTransform: 'none', fontFamily: FONT, fontWeight: 700,
                color: BRAND.muted, px: 2,
                '&:hover': { bgcolor: BRAND.navySoft },
              }}>
              {lockedNoticeDialog.fresh.length === 0 ? 'Close' : 'Cancel'}
            </Button>
            <Button
              onClick={() => {
                setLockedNoticeDialog(s => ({ ...s, open: false }));
                navigate('/employer/ranked-results');
              }}
              variant="outlined"
              sx={{
                borderRadius: '10px', textTransform: 'none', fontFamily: FONT, fontWeight: 700,
                borderColor: BRAND.amber, color: BRAND.amber, px: 2,
                '&:hover': { borderColor: BRAND.amber, bgcolor: BRAND.amberSoft },
              }}>
              Open Round Approvals
            </Button>
            {lockedNoticeDialog.fresh.length > 0 && (
              <Button
                onClick={() => {
                  const cont = lockedNoticeDialog.onContinue;
                  setLockedNoticeDialog(s => ({ ...s, open: false }));
                  if (typeof cont === 'function') cont();
                }}
                variant="contained"
                sx={{
                  borderRadius: '10px', textTransform: 'none', fontFamily: FONT, fontWeight: 800,
                  bgcolor: BRAND.navy, color: '#fff', px: 2.25,
                  '&:hover': { bgcolor: BRAND.navyDark },
                }}>
                Continue with {lockedNoticeDialog.fresh.length}
              </Button>
            )}
          </Stack>
        </Box>
      </Dialog>

      <ScheduleDialog
        open={schedDialog.open} preSelected={schedDialog.preSelect} preJobTitle={schedDialog.jobTitle} preJobId={schedDialog.jobId}
        pipelineRoundType={schedDialog.pipelineRoundType} pipelineVacancies={schedDialog.pipelineVacancies}
        pipelineRoundNumber={schedDialog.pipelineRoundNumber} pipelineRoundName={schedDialog.pipelineRoundName}
        pipelineLocked={schedDialog.pipelineLocked} processes={processes}
        onClose={() => setSchedDialog({ open: false, preSelect: null })} onDone={fetchAll}
      />
      <CloseProcessDialog open={closeDialog.open} process={closeDialog.process} onClose={() => setCloseDialog({ open: false, process: null })} onConfirm={handleConfirmClose} />
      <BulkHireDialog     open={bulkHireDialog.open} process={bulkHireDialog.process} onClose={() => setBulkHireDialog({ open: false, process: null })} onDone={fetchAll} />
      <HiringDialog       open={hiringDialog.open} process={hiringDialog.process} scheduled={scheduled} onClose={() => setHiringDialog({ open: false, process: null })} onDone={fetchAll} />
      <FeedbackPreview    open={feedbackPreview.open} interviewId={feedbackPreview.interviewId} candidateName={feedbackPreview.candidateName} interviewName={feedbackPreview.interviewName} onClose={() => setFeedbackPreview(p => ({ ...p, open: false }))} />
      <ResultPreview      open={resultPreview.open} sessionId={resultPreview.sessionId} interviewType={resultPreview.interviewType} candidateName={resultPreview.candidateName} interviewName={resultPreview.interviewName} onClose={() => setResultPreview({ open: false, sessionId: null, interviewType: null, candidateName: '', interviewName: '' })} onScoreLoaded={(id, pct) => setScheduled(prev => prev.map(s => s.id === id ? { ...s, doc_overall_pct: pct } : s))} />
      <LiveScore          open={liveScoreDialog.open} candidateInterview={liveScoreDialog.candidateInterview} onClose={() => setLiveScoreDialog({ open: false, candidateInterview: null })} onDone={fetchAll} />

      {/* ── Pipeline Chooser Dialog ─────────────────────────────────────────── */}
      <Dialog
        open={chooserState.open}
        onClose={() => setChooserState(s => ({ ...s, open: false }))}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: {
          borderRadius: '18px', overflow: 'hidden', fontFamily: FONT,
          border: `1px solid ${BRAND.border}`,
          boxShadow: '0 24px 64px -16px rgba(2,33,36,0.22)',
        } } }}
      >
        {/* Header */}
        <Box sx={{
          background: `linear-gradient(135deg, ${BRAND.navy} 0%, #0A3F42 100%)`,
          px: { xs: 2.25, sm: 3 }, py: 2.25,
        }}>
          <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '1.05rem', fontFamily: FONT }}>
            Schedule Interview
          </Typography>
          <Typography sx={{ color: '#93C5AE', fontSize: '0.8rem', fontFamily: FONT, mt: 0.3 }}>
            {chooserState.jobTitle} · {chooserState.candidates.length} candidate{chooserState.candidates.length !== 1 ? 's' : ''}
          </Typography>
        </Box>

        {/* Body: two choices */}
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography sx={{ fontSize: '0.88rem', color: BRAND.ink, fontWeight: 700, mb: 2, fontFamily: FONT }}>
            This job has {chooserState.pipelines.length} active pipeline{chooserState.pipelines.length !== 1 ? 's' : ''}. Where should these candidates go?
          </Typography>

          {/* Option 1: Existing pipeline */}
          <Box sx={{ mb: 1.5 }}>
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, color: BRAND.muted, textTransform: 'uppercase',
              letterSpacing: '0.06em', mb: 1, fontFamily: FONT }}>
              Add to existing pipeline
            </Typography>
            <Stack spacing={1}>
              {chooserState.pipelines.map((p) => {
                const roundCount = p.rounds?.length ?? p.rounds_count ?? p.activeRounds?.length ?? '—';
                const memberCount = p.members_count ?? p.vacancies ?? '—';
                return (
                  <Box
                    key={p.id}
                    role="button" tabIndex={0}
                    onClick={async () => {
                      
                      if (loadingPipelineId) return;   // ignore double-clicks
                      setLoadingPipelineId(p.id);
                      let pipelineRounds = [];
                      try {
                        const r = await axiosInstance.get(
                          `/employer/interviews/processes/${p.id}/`);
                        pipelineRounds = (r.data?.rounds || [])
                          .filter(rc => rc.is_active !== false)
                          .sort((a, b) => (a.order || 0) - (b.order || 0));
                      } catch (err) {
                        console.error('[chooser] pipeline rounds fetch failed:', err);
                        setLoadingPipelineId(null);
                        enqueueSnackbar(
                          'Could not load that pipeline\u2019s rounds. Please try again.',
                          { variant: 'error', autoHideDuration: 7000 },
                        );
                        return;
                      }
                      if (!pipelineRounds.length) {
                        setLoadingPipelineId(null);
                        enqueueSnackbar(
                          'That pipeline has no active rounds yet — create a new pipeline instead.',
                          { variant: 'warning', autoHideDuration: 8000 },
                        );
                        return;
                      }
                      // Fetch existing SIs for this pipeline so the wizard
                      // can filter already-scheduled candidates and pre-fill
                      // round timings from the last run.
                      let existingSIs = [];
                      try {
                        const siRes = await interviewAPI.getScheduled({ process: p.id });
                        existingSIs = siRes.data?.results || siRes.data || [];
                      } catch (_siErr) {
                        console.warn('[chooser] existing SI fetch failed:', _siErr);
                      }
                      setLoadingPipelineId(null);
                      setChooserState(s => ({ ...s, open: false }));
                      setWizardState({
                        open:              true,
                        job:               { id: chooserState.jobId, title: chooserState.jobTitle, vacancies: p.vacancies || 1 },
                        candidates:        chooserState.candidates,
                        existingPipelines: chooserState.pipelines.length,
                        existingProcess:   p,
                        procRounds:        pipelineRounds,
                        existingScheduled: existingSIs,
                        forceNew:          false,
                      });
                    }}
                    sx={{
                      display: 'flex', alignItems: 'center', gap: 1.5,
                      p: 1.5, borderRadius: '12px',
                      border: `1.5px solid ${BRAND.border}`,
                      bgcolor: BRAND.surface, cursor: 'pointer',
                      transition: 'all 0.18s ease',
                      '&:hover': {
                        borderColor: BRAND.sage, bgcolor: BRAND.sageSoft,
                        boxShadow: '0 4px 16px rgba(127,158,126,0.18)',
                        transform: 'translateY(-1px)',
                      },
                    }}
                  >
                    <Box sx={{
                      width: 38, height: 38, borderRadius: '10px',
                      bgcolor: BRAND.sageSoft, display: 'flex',
                      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Assignment sx={{ fontSize: 18, color: BRAND.sageText }} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography noWrap sx={{ fontSize: '0.88rem', fontWeight: 700, color: BRAND.ink, fontFamily: FONT }}>
                        {p.name || `Pipeline #${p.sequence_no || p.id}`}
                      </Typography>
                      <Typography sx={{ fontSize: '0.72rem', color: BRAND.muted, fontFamily: FONT }}>
                        {roundCount} round{roundCount !== 1 ? 's' : ''} · {memberCount} candidate{memberCount !== 1 ? 's' : ''}
                      </Typography>
                    </Box>
                    {/* BUILD: 2026-08-05-existing-pipeline-wizard-v1 */}
                    {loadingPipelineId === p.id
                      ? <CircularProgress size={16} sx={{ color: BRAND.sage, flexShrink: 0 }} />
                      : <ArrowForward sx={{ fontSize: 16, color: BRAND.sage, flexShrink: 0 }} />}
                  </Box>
                );
              })}
            </Stack>
          </Box>

          {/* Divider */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, my: 2 }}>
            <Box sx={{ flex: 1, height: '1px', bgcolor: BRAND.border }} />
            <Typography sx={{ fontSize: '0.72rem', color: BRAND.muted, fontWeight: 700, fontFamily: FONT }}>OR</Typography>
            <Box sx={{ flex: 1, height: '1px', bgcolor: BRAND.border }} />
          </Box>

          {/* Option 2: New pipeline */}
          <Box
            role="button" tabIndex={0}
            onClick={() => {
              setChooserState(s => ({ ...s, open: false }));
              setWizardState({
                open: true,
                job: { id: chooserState.jobId, title: chooserState.jobTitle, vacancies: 1 },
                candidates: chooserState.candidates,
                existingPipelines: chooserState.pipelines.length,
                existingProcess: null,
                procRounds: [],
                forceNew: true,
              });
            }}
            sx={{
              display: 'flex', alignItems: 'center', gap: 1.5,
              p: 1.5, borderRadius: '12px',
              border: `1.5px dashed ${BRAND.sage}`,
              bgcolor: BRAND.sageSoft, cursor: 'pointer',
              transition: 'all 0.18s ease',
              '&:hover': {
                bgcolor: '#DDE9DC', borderColor: BRAND.sageDark,
                boxShadow: '0 4px 16px rgba(127,158,126,0.22)',
                transform: 'translateY(-1px)',
              },
            }}
          >
            <Box sx={{
              width: 38, height: 38, borderRadius: '10px',
              bgcolor: BRAND.sage, display: 'flex',
              alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Add sx={{ fontSize: 20, color: '#fff' }} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: '0.88rem', fontWeight: 700, color: BRAND.ink, fontFamily: FONT }}>
                Create new pipeline
              </Typography>
              <Typography sx={{ fontSize: '0.72rem', color: BRAND.muted, fontFamily: FONT }}>
                Set up fresh rounds, timings, and configuration
              </Typography>
            </Box>
            <ArrowForward sx={{ fontSize: 16, color: BRAND.sage, flexShrink: 0 }} />
          </Box>
        </Box>

        {/* Footer */}
        <Box sx={{ px: { xs: 2, sm: 3 }, pb: 2, pt: 0 }}>
          <Button
            onClick={() => setChooserState(s => ({ ...s, open: false }))}
            sx={{ textTransform: 'none', color: BRAND.muted, fontFamily: FONT, fontSize: '0.82rem' }}
          >
            Cancel
          </Button>
        </Box>
      </Dialog>

      {/* ── Confirm Add to Pipeline Dialog ───────────────────────────────── */}
      <Dialog
        open={confirmAdd.open}
        onClose={() => !confirmAdd.adding && setConfirmAdd(s => ({ ...s, open: false }))}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: {
          borderRadius: '18px', overflow: 'hidden', fontFamily: FONT,
          border: `1px solid ${BRAND.border}`,
          boxShadow: '0 24px 64px -16px rgba(2,33,36,0.22)',
        } } }}
      >
        {/* Header */}
        <Box sx={{
          background: `linear-gradient(135deg, ${BRAND.navy} 0%, #0A3F42 100%)`,
          px: { xs: 2.25, sm: 3 }, py: 2,
        }}>
          <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '1rem', fontFamily: FONT }}>
            Confirm — Add to Pipeline
          </Typography>
        </Box>

        <Box sx={{ p: { xs: 2.25, sm: 3 } }}>
          {/* Summary card */}
          <Box sx={{
            bgcolor: BRAND.sageSoft, borderRadius: '12px',
            border: `1px solid ${BRAND.sage}30`, p: 2, mb: 2.5,
          }}>
            <Stack spacing={1.5}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                <Box sx={{
                  width: 36, height: 36, borderRadius: '9px',
                  bgcolor: BRAND.sage, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Assignment sx={{ fontSize: 18, color: '#fff' }} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '0.92rem', fontWeight: 800, color: BRAND.ink, fontFamily: FONT }}>
                    {confirmAdd.pipeline?.name || `Pipeline #${confirmAdd.pipeline?.sequence_no || confirmAdd.pipeline?.id || ''}`}
                  </Typography>
                  <Typography sx={{ fontSize: '0.72rem', color: BRAND.muted, fontFamily: FONT }}>
                    {confirmAdd.jobTitle}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ height: '1px', bgcolor: `${BRAND.sage}30` }} />

              <Box sx={{ display: 'flex', gap: 3 }}>
                <Box>
                  <Typography sx={{ fontSize: '1.5rem', fontWeight: 900, color: BRAND.sageText, fontFamily: FONT, lineHeight: 1 }}>
                    {confirmAdd.candidates.length}
                  </Typography>
                  <Typography sx={{ fontSize: '0.7rem', color: BRAND.muted, fontWeight: 600, fontFamily: FONT, mt: 0.25 }}>
                    candidate{confirmAdd.candidates.length !== 1 ? 's' : ''} to add
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '1.5rem', fontWeight: 900, color: BRAND.ink, fontFamily: FONT, lineHeight: 1 }}>
                    {confirmAdd.pipeline?.rounds?.length ?? confirmAdd.pipeline?.rounds_count ?? confirmAdd.pipeline?.activeRounds?.length ?? '—'}
                  </Typography>
                  <Typography sx={{ fontSize: '0.7rem', color: BRAND.muted, fontWeight: 600, fontFamily: FONT, mt: 0.25 }}>
                    round{(confirmAdd.pipeline?.rounds?.length ?? confirmAdd.pipeline?.rounds_count ?? 0) !== 1 ? 's' : ''} in pipeline
                  </Typography>
                </Box>
              </Box>
            </Stack>
          </Box>

          {/* Candidate names */}
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, color: BRAND.muted, textTransform: 'uppercase',
            letterSpacing: '0.06em', mb: 0.75, fontFamily: FONT }}>
            Candidates
          </Typography>
          <Box sx={{
            maxHeight: 140, overflowY: 'auto', mb: 2,
            borderRadius: '10px', border: `1px solid ${BRAND.border}`,
            '&::-webkit-scrollbar': { width: 4 },
            '&::-webkit-scrollbar-thumb': { bgcolor: BRAND.borderStrong, borderRadius: 2 },
          }}>
            {confirmAdd.candidates.map((c, i) => {
              const nm = c.full_name || c.applicant?.full_name || c.candidate?.full_name
                || `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.email || 'Candidate';
              return (
                <Box key={i} sx={{
                  px: 1.5, py: 0.9,
                  borderBottom: i < confirmAdd.candidates.length - 1 ? `1px solid ${BRAND.border}` : 'none',
                  display: 'flex', alignItems: 'center', gap: 1,
                }}>
                  <Box sx={{
                    width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                    bgcolor: BRAND.navy, color: '#fff', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.65rem', fontWeight: 800, fontFamily: FONT,
                  }}>
                    {nm.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'}
                  </Box>
                  <Typography noWrap sx={{ fontSize: '0.82rem', color: BRAND.ink, fontWeight: 600, fontFamily: FONT }}>
                    {nm}
                  </Typography>
                </Box>
              );
            })}
          </Box>

          <Typography sx={{ fontSize: '0.76rem', color: BRAND.muted, fontFamily: FONT, lineHeight: 1.55, mb: 0.5 }}>
            {confirmAdd.candidates.length === 1 ? 'This candidate' : `These ${confirmAdd.candidates.length} candidates`} will
            be scheduled into <strong>Round 1</strong> and receive an interview invitation. Subsequent rounds will unlock as they advance.
          </Typography>
        </Box>

        {/* Actions */}
        <Box sx={{
          px: { xs: 2.25, sm: 3 }, pb: 2.25, pt: 0,
          display: 'flex', justifyContent: 'flex-end', gap: 1.25,
        }}>
          <Button
            onClick={() => setConfirmAdd(s => ({ ...s, open: false }))}
            disabled={confirmAdd.adding}
            sx={{ textTransform: 'none', color: BRAND.muted, fontFamily: FONT, fontSize: '0.84rem', fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disableElevation
            disabled={confirmAdd.adding}
            startIcon={confirmAdd.adding
              ? <CircularProgress size={14} color="inherit" />
              : <Add sx={{ fontSize: 16 }} />}
            onClick={async () => {
              const p = confirmAdd.pipeline;
              const processId = p?.id;
              const candIds = confirmAdd.candidates
                .map(c => String(c.applicant_id || c.candidate_id || c.candidate?.id || c.applicant?.id || c.user?.id || c.user_id || c.id || ''))
                .filter(Boolean);
              if (!processId || !candIds.length) return;

              setConfirmAdd(s => ({ ...s, adding: true }));

              // Fetch Round 1 config
              let round1Type = 'ai-powered';
              let round1Name = p.name || 'Interview';
              try {
                const procRes = await axiosInstance.get(`/employer/interviews/processes/${processId}/`);
                const rounds = (procRes.data?.rounds || []).filter(r => r.is_active !== false).sort((a, b) => a.order - b.order);
                if (rounds.length > 0) {
                  round1Type = rounds[0].round_type || 'ai-powered';
                  round1Name = rounds[0].name || round1Name;
                }
              } catch (err) {
                console.error('[confirmAdd] round config fetch failed:', err);
              }

              const now = new Date();
              const windowEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
              const pipelineName = p.name || `Pipeline #${p.sequence_no || p.id}`;

              try {
                await interviewAPI.bulkSchedule({
                  process_id:      processId,
                  candidate_ids:   candIds,
                  interview_type:  round1Type,
                  interview_name:  `${confirmAdd.jobTitle} — ${round1Name}`,
                  job_title:       confirmAdd.jobTitle || '',
                  job_id:          String(confirmAdd.jobId || '0'),
                  round_number:    1,
                  difficulty:      'junior',
                  time_limit_secs: 3600,
                  notify_app:      true,
                  notify_email:    true,
                  notify_sms:      false,
                  notify_whatsapp: false,
                  confirm:         true,
                  window_start:    now.toISOString(),
                  window_end:      windowEnd.toISOString(),
                });
                enqueueSnackbar(
                  `✅ ${candIds.length} candidate${candIds.length !== 1 ? 's' : ''} added to ${pipelineName}!`,
                  { variant: 'success', autoHideDuration: 5000 },
                );
                setConfirmAdd({ open: false, pipeline: null, jobId: null, jobTitle: '', candidates: [], adding: false });
                setSelMap({});
                fetchAll();
                navigate(`/employer/ranked-results/${processId}`);
              } catch (err) {
                setConfirmAdd(s => ({ ...s, adding: false }));
                const detail = err?.response?.data?.detail
                  || (typeof err?.response?.data === 'string' ? err.response.data.slice(0, 200) : null)
                  || err?.message || 'Unknown error';
                enqueueSnackbar(`Failed to add candidates: ${detail}`, { variant: 'error', autoHideDuration: 9000 });
              }
            }}
            sx={{
              textTransform: 'none', fontFamily: FONT, fontWeight: 700,
              fontSize: '0.86rem', borderRadius: '11px',
              px: 2.5, py: 0.9,
              bgcolor: BRAND.sage,
              '&:hover': { bgcolor: BRAND.sageDark },
            }}
          >
            {confirmAdd.adding
              ? 'Adding…'
              : `Add ${confirmAdd.candidates.length} candidate${confirmAdd.candidates.length !== 1 ? 's' : ''}`}
          </Button>
        </Box>
      </Dialog>

    
      <InterviewWizard
        open={wizardState.open}
        job={wizardState.job}
        candidates={wizardState.candidates}
        processes={processes}
        existingPipelines={wizardState.existingPipelines || 0}
        existingProcess={wizardState.existingProcess || null}
        existingScheduled={wizardState.existingScheduled || []}
        procRounds={wizardState.procRounds || []}
        forceNew={!!wizardState.forceNew}
        onClose={() => setWizardState({ open: false, job: null, candidates: [] })}
        onDone={fetchAll}
      />


      {/* Delete confirm */}
      <Dialog open={!!deleteDlg} onClose={() => !deleting && setDeleteDlg(null)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: { xs: '13px', sm: '15px', xl: '17px' }, m: { xs: 1.8, sm: 2.8 } }  } }}>
        <Box sx={{ p: { xs: 1.7, sm: 2.1, md: 2.4, xl: 2.9 } }}>
          <Stack direction="row" spacing={{ xs: 1.1, sm: 1.4 }} alignItems="flex-start" sx={{ mb: { xs: 1.7, sm: 1.9 } }}>
            <Box sx={{ width: { xs: 33, sm: 37, md: 41, xl: 45 }, height: { xs: 33, sm: 37, md: 41, xl: 45 }, borderRadius: '10px', bgcolor: BRAND.errSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <DeleteOutlined sx={{ color: BRAND.err, fontSize: { xs: 16, sm: 17, md: 19, xl: 21 } }} />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 700, color: '#0F172A', mb: 0.45, fontSize: { xs: '0.83rem', sm: '0.88rem', md: '0.93rem', xl: '0.98rem' } }}>Delete Interview</Typography>
              <Typography sx={{ fontSize: { xs: '0.73rem', sm: '0.78rem', md: '0.82rem', xl: '0.87rem' }, color: BRAND.muted, lineHeight: 1.5 }}>
                Permanently delete <strong>{deleteDlg?.name}</strong>? This removes the interview and all related data.
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button onClick={() => setDeleteDlg(null)} disabled={deleting} sx={{ textTransform: 'none', color: BRAND.muted, fontSize: { xs: '0.73rem', sm: '0.78rem', xl: '0.83rem' } }}>Cancel</Button>
            <Button variant="contained" color="error" disabled={deleting} startIcon={deleting ? <CircularProgress size={14} color="inherit" /> : <DeleteOutlined sx={{ fontSize: { xs: 13, sm: 14, md: 15, xl: 16 } }} />} onClick={handleDelete} sx={{ textTransform: 'none', borderRadius: '8px', bgcolor: BRAND.err, '&:hover': { bgcolor: BRAND.err }, fontSize: { xs: '0.73rem', sm: '0.78rem', xl: '0.83rem' } }}>
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </Stack>
        </Box>
      </Dialog>

      </Box>
    </Box>
  );
};

export default Candidates;