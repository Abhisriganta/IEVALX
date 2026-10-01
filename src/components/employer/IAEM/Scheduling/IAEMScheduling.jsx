
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Button, Chip, Skeleton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton,
  Switch, FormControlLabel, Alert, MenuItem, Tooltip, LinearProgress,
  Collapse, InputAdornment, Snackbar,
} from '@mui/material';
import {
  Close, People, CheckCircle, Lock, EventAvailable,
  ExpandMore, ExpandLess, Schedule, AssignmentTurnedIn,
  HourglassEmpty, CalendarMonth, Groups, TaskAlt, Refresh,
  ArrowBack, Search as SearchIcon, Warning, SwapHoriz,
} from '@mui/icons-material';
import { ThemeProvider, createTheme, useTheme } from '@mui/material/styles';
import { hrSchedulingService } from '@/services/api/iaem';
import { INTERVIEW_LEVELS } from '@/constants/iaem';

/* ── palette tokens (iEvalX pine/sage) ───────────────────────────── */
const C = {
  pri:      '#08302F',
  priHover: '#0a3d40',
  sage:     '#8FB08E',
  sageDk:   '#5E815D',
  sageLt:   '#E8F0E8',
  sageXLt:  '#F4F7F2',
  bg:       '#F6F8F3',
  white:    '#FFFFFF',
  green:    '#10B981',
  greenBg:  '#ECFDF5',
  greenTxt: '#065F46',
  amber:    '#F59E0B',
  amberBg:  '#FFFBEB',
  amberTxt: '#92400E',
  indigo:   '#08302F',
  indigoBg: '#E8F0E8',
  indigoTxt:'#08302F',
  red:      '#EF4444',
  redBg:    '#FEF2F2',
  redTxt:   '#991B1B',
  gray50:   '#F9FAFB',
  gray100:  '#F3F4F6',
  gray200:  '#E5E7EB',
  gray300:  '#D1D5DB',
  gray400:  '#9CA3AF',
  gray500:  '#6B7280',
  gray600:  '#4B5563',
  gray700:  '#374151',
};

/* ── helpers (UNCHANGED) ─────────────────────────────────────────── */
const fmtDeadline = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return d; }
};

const fmtDeadlineShort = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return d; }
};

const isDeadlineSoon = (d) => {
  if (!d) return false;
  try {
    const diff = new Date(d) - new Date();
    return diff > 0 && diff < 48 * 60 * 60 * 1000;
  } catch { return false; }
};

const isDeadlinePassed = (d) => {
  if (!d) return false;
  try { return new Date(d) < new Date(); } catch { return false; }
};

/* ── groupByJobTitle (UNCHANGED) ─────────────────────────────────── */
const groupByJobTitle = (rounds) => {
  const map = {};
  rounds.forEach(r => {
    const key = (r.job_title || '').trim().toLowerCase();
    if (!map[key]) {
      map[key] = { job_title: r.job_title, rounds: [] };
    }
    map[key].rounds.push(r);
  });

  return Object.values(map).map(g => {
    const rs = g.rounds;
    const releasedRounds = rs.filter(r => r.has_release);
    const readyRounds = rs.filter(r => r.can_release && !r.has_release);
    const waitingRounds = rs.filter(r => !r.has_release && !r.can_release);

    const totalCandidates = rs.reduce((s, r) => s + r.total_assigned, 0);
    const totalReady = rs.reduce((s, r) => s + r.ready_count, 0);
    const totalCompleted = rs.reduce((s, r) => s + r.completed_count, 0);
    const totalLocked = rs.reduce((s, r) => s + r.locked_count, 0);
    const totalSlotsBooked = releasedRounds.reduce((s, r) => s + (r.release?.slots_booked || 0), 0);
    const totalSlotsAll = releasedRounds.reduce((s, r) => s + (r.release?.slots_total || 0), 0);

    const aggBookingStats = { upcoming: 0, live: 0, completed: 0, eval_pending: 0, no_show_iv: 0, no_show_cand: 0, rescheduled: 0 };
    releasedRounds.forEach(r => {
      const bs = r.release?.booking_stats;
      if (bs) Object.keys(aggBookingStats).forEach(k => { aggBookingStats[k] += (bs[k] || 0); });
    });

    const latestDeadline = releasedRounds
      .map(r => r.release?.slot_deadline).filter(Boolean).sort().pop() || null;

    let status = 'waiting';
    if (readyRounds.length > 0) status = 'ready';
    else if (releasedRounds.length > 0) status = 'released';

    const reReleasableRounds = rs.filter(r => r.can_re_release);
    const totalUnbooked = rs.reduce((s, r) => s + (r.unbooked_count || 0), 0);

    return {
      ...g, status, releasedRounds, readyRounds, waitingRounds, reReleasableRounds,
      totalCandidates, totalReady, totalCompleted, totalLocked,
      totalSlotsBooked, totalSlotsAll, aggBookingStats, totalUnbooked, latestDeadline,
      releaseCount: releasedRounds.length,
      allAuditOn: releasedRounds.length > 0 && releasedRounds.every(r => r.release?.audit_enabled),
    };
  }).sort((a, b) => {
    const order = { ready: 0, released: 1, waiting: 2 };
    return (order[a.status] ?? 3) - (order[b.status] ?? 3);
  });
};

/* ── SlotProgress (UNCHANGED) ─────────────────────────────────────── */
const SlotProgress = ({ booked, total }) => {
  const pct = total > 0 ? Math.round((booked / total) * 100) : 0;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 110 }}>
      <Box sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: C.gray100, overflow: 'hidden' }}>
        <Box sx={{ height: '100%', borderRadius: 3, transition: 'width 0.3s',
          bgcolor: pct === 100 ? C.green : pct > 50 ? C.amber : C.indigo, width: `${pct}%` }} />
      </Box>
      <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, minWidth: 32,
        color: pct === 100 ? C.greenTxt : C.gray500 }}>{pct}%</Typography>
    </Box>
  );
};

/* ── BookingLifecycle (UNCHANGED) ─────────────────────────────────── */
const BookingLifecycle = ({ stats }) => {
  if (!stats) return null;
  const items = [
    { key: 'upcoming', label: 'Upcoming', val: stats.upcoming, bg: '#E0F2FE', fg: '#0369A1' },
    { key: 'live', label: 'Live', val: stats.live, bg: '#FEF3C7', fg: '#92400E' },
    { key: 'completed', label: 'Done', val: stats.completed, bg: C.greenBg, fg: C.greenTxt },
    { key: 'eval_pending', label: 'Eval pending', val: stats.eval_pending, bg: '#FFF7ED', fg: '#9A3412' },
    { key: 'no_show_iv', label: 'IV no-show', val: stats.no_show_iv, bg: C.redBg, fg: '#991B1B' },
    { key: 'no_show_cand', label: 'Cand no-show', val: stats.no_show_cand, bg: C.redBg, fg: '#991B1B' },
    { key: 'rescheduled', label: 'Rescheduled', val: stats.rescheduled, bg: C.gray100, fg: C.gray600 },
  ].filter(i => i.val > 0);
  if (items.length === 0) return null;
  return (
    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
      {items.map(i => (
        <Chip key={i.key} label={`${i.val} ${i.label}`} size="small"
          sx={{ bgcolor: i.bg, color: i.fg, fontWeight: 600, fontSize: '0.6rem', height: 18 }} />
      ))}
    </Box>
  );
};

/* ── GroupStatusChip (UNCHANGED) ──────────────────────────────────── */
const GroupStatusChip = ({ status }) => {
  if (status === 'released') return <Chip label="Released" size="small" sx={{ bgcolor: C.greenBg, color: C.greenTxt, fontWeight: 600, fontSize: '0.7rem', height: 22 }} />;
  if (status === 'ready') return <Chip label="Ready to Release" size="small" sx={{ bgcolor: C.amberBg, color: C.amberTxt, fontWeight: 600, fontSize: '0.7rem', height: 22 }} />;
  return <Chip label="Waiting" size="small" sx={{ bgcolor: C.gray100, color: C.gray500, fontWeight: 600, fontSize: '0.7rem', height: 22 }} />;
};

/* ── StatBox (UNCHANGED) ──────────────────────────────────────────── */
const StatBox = ({ label, value, color }) => (
  <Box sx={{ textAlign: 'center', p: 1.25, borderRadius: 2, bgcolor: C.white, border: `1px solid ${C.gray200}`, minWidth: 65 }}>
    <Typography sx={{ fontSize: '1.15rem', fontWeight: 700, color }}>{value}</Typography>
    <Typography sx={{ fontSize: '0.65rem', color: C.gray400 }}>{label}</Typography>
  </Box>
);

/* ── NEW: Mini 4-segment journey bar ─────────────────────────────── */
const MiniJourneyBar = ({ group }) => {
  const segColor = (val, max) => {
    if (max === 0) return C.gray200;
    const pct = val / max;
    return pct >= 0.9 ? C.green : pct >= 0.5 ? C.sage : pct > 0 ? C.amber : C.red;
  };
  const c = group.totalCandidates;
  const segs = [
    { val: c, max: c },
    { val: group.totalSlotsBooked, max: group.totalSlotsAll || c || 1 },
    { val: group.totalCompleted, max: c || 1 },
    { val: group.totalCompleted, max: group.totalCompleted || 1 },
  ];
  return (
    <Box sx={{ display: 'flex', gap: '3px', flex: 1, alignItems: 'center' }}>
      {segs.map((s, i) => (
        <Box key={i} sx={{ flex: 1, height: 6, borderRadius: 3,
          bgcolor: group.status === 'waiting' ? C.gray200 : segColor(s.val, s.max) }} />
      ))}
    </Box>
  );
};

/* ── NEW: Health dot ─────────────────────────────────────────────── */
const HealthDot = ({ group }) => {
  const lowBooking = group.status === 'released' && group.totalSlotsAll > 0 && group.totalSlotsBooked / group.totalSlotsAll < 0.4;
  const color = lowBooking ? C.red
    : (group.status === 'ready' || group.reReleasableRounds.length > 0) ? C.amber
    : group.status === 'released' ? C.green : C.gray300;
  return <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />;
};

/* ── NEW: Wizard tab ─────────────────────────────────────────────── */
const WizardTab = ({ label, icon, active, badge, badgeBg, badgeFg, onClick }) => (
  <Box onClick={onClick} sx={{
    display: 'flex', alignItems: 'center', gap: 0.75, px: 2, py: 1.25,
    cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '0.82rem',
    fontWeight: active ? 600 : 400, color: active ? C.pri : C.gray500,
    borderBottom: '2px solid', borderColor: active ? C.sageDk : 'transparent',
    transition: 'all 0.15s', '&:hover': { color: C.pri },
  }}>
    {icon}{label}
    {badge > 0 && <Chip label={badge} size="small" sx={{
      height: 18, minWidth: 18, fontSize: '0.65rem', fontWeight: 700,
      bgcolor: badgeBg || C.gray100, color: badgeFg || C.gray500,
    }} />}
  </Box>
);


/* ═══════════════════════════════════════════════════════════════════ */
/*  MAIN COMPONENT                                                    */
/* ═══════════════════════════════════════════════════════════════════ */
const IAEMScheduling = () => {
  const navigate = useNavigate();

  /* ── Scoped theme (UNCHANGED) ────────────────────────────────── */
  const outerTheme = useTheme();
  const scopedTheme = useMemo(() => createTheme(outerTheme, {
    palette: {
      primary: { main: C.pri, light: C.sage, dark: '#04282B', contrastText: '#FFFFFF' },
      warning: { main: C.amber, light: '#FBBF24', dark: C.amberTxt, contrastText: '#FFFFFF' },
    },
  }), [outerTheme]);

  /* ── ALL ORIGINAL STATE — UNCHANGED ─────────────────────────── */
  const [rounds, setRounds] = useState([]);
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [releaseDialog, setReleaseDialog] = useState(null);
  const [participantDialog, setParticipantDialog] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [participantLoading, setParticipantLoading] = useState(false);

  const [selLevel, setSelLevel] = useState('');
  const [auditOn, setAuditOn] = useState(true);
  const [deadline, setDeadline] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('18:00');
  const [durationMins, setDurationMins] = useState(45);
  const [interviewStartDate, setInterviewStartDate] = useState('');
  const [interviewStartTime, setInterviewStartTime] = useState('09:00');
  const [interviewEndDate, setInterviewEndDate] = useState('');
  const [interviewEndTime, setInterviewEndTime] = useState('18:00');
  const [creating, setCreating] = useState(false);

  const [supplyReview, setSupplyReview] = useState(null);
  const [supplyReviewDialog, setSupplyReviewDialog] = useState(null);
  const [supplyLoading, setSupplyLoading] = useState(false);
  const [releasing, setReleasing] = useState(false);

  const [deactivateDialog, setDeactivateDialog] = useState(null);
  const [notifyInfoDialog, setNotifyInfoDialog] = useState({ open: false, count: 0 });
  const [releaseSlotsInfoDialog, setReleaseSlotsInfoDialog] = useState({ open: false, slots: 0, candidates: 0 });
  const [deactivateReason, setDeactivateReason] = useState('');
  const [deactivating, setDeactivating] = useState(false);

  const [isReRelease, setIsReRelease] = useState(false);

  /* ── Interviewers tab state ──────────────────────────────────── */
  const [interviewersList, setInterviewersList] = useState([]);
  const [interviewersLoading, setInterviewersLoading] = useState(false);
  const [interviewersLoadedFor, setInterviewersLoadedFor] = useState(null);

  /* ── Review & release tab state ──────────────────────────────── */
  const [slotDetails, setSlotDetails] = useState(null);
  const [slotDetailsLoading, setSlotDetailsLoading] = useState(false);
  const [slotDetailsLoadedRelease, setSlotDetailsLoadedRelease] = useState(null);

  /* ── Candidates tab state ────────────────────────────────────── */
  const [candidatesList, setCandidatesList] = useState([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [candidatesLoadedKey, setCandidatesLoadedKey] = useState(null);
  const [candidatesFilter, setCandidatesFilter] = useState('booked'); // 'booked' | 'notbooked'

  /* ── Interview status tab state ──────────────────────────────── */
  const [ivStatusFilter, setIvStatusFilter] = useState('completed'); // 'completed' | 'notattempted'

  /* ── NEW UI state ────────────────────────────────────────────── */
  const [mainTab, setMainTab] = useState('action');
  const [actionFilter, setActionFilter] = useState('all');
  const [selectedJobKey, setSelectedJobKey] = useState(null);
  const [jobTab, setJobTab] = useState('overview');
  const [jobSearch, setJobSearch] = useState('');
  const [jobPage, setJobPage] = useState(0);
  const [reschData, setReschData] = useState(null);
  const [reschLoading, setReschLoading] = useState(false);
  const [reschActing, setReschActing] = useState(false);

  /* ── Reschedule dialog state ──────────────────────────────────── */
  const [reschApproveDialog, setReschApproveDialog] = useState(null);
  const [reschRejectDialog, setReschRejectDialog] = useState(null);
  const [reschRequestSlotsDialog, setReschRequestSlotsDialog] = useState(false);
  const [reschReleaseSlotsDialog, setReschReleaseSlotsDialog] = useState(false);
  const [reschCfgLevel, setReschCfgLevel] = useState('');
  const [reschCfgDeadline, setReschCfgDeadline] = useState('');
  const [reschCfgDeadlineTime, setReschCfgDeadlineTime] = useState('18:00');
  const [reschCfgStartDate, setReschCfgStartDate] = useState('');
  const [reschCfgStartTime, setReschCfgStartTime] = useState('09:00');
  const [reschCfgEndDate, setReschCfgEndDate] = useState('');
  const [reschCfgEndTime, setReschCfgEndTime] = useState('18:00');
  const [reschCfgDuration, setReschCfgDuration] = useState(45);

  /* ── Reschedules summary tab state ──────────────────────────── */
  const [reschSummary, setReschSummary] = useState(null);
  const [reschSummaryLoading, setReschSummaryLoading] = useState(false);

  const JOBS_PER_PAGE = 10;
  const ACTION_PER_PAGE = 10;
  const [openSlotsPage, setOpenSlotsPage] = useState(0);
  const [newSlotsPage, setNewSlotsPage] = useState(0);

  /* ── data loading — UNCHANGED ────────────────────────────────── */
  const load = () => {
    setLoading(true);
    Promise.all([
      hrSchedulingService.getSchedulableRounds(),
      hrSchedulingService.getReleases(),
    ]).then(([roundsRes, relRes]) => {
      setRounds(roundsRes.data.rounds || []);
      setReleases(relRes.data.releases || []);
    }).catch(console.error)
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const loadReschedulesSummary = async () => {
    setReschSummaryLoading(true);
    try {
      const res = await hrSchedulingService.getReschedulesSummary();
      setReschSummary(res?.data || null);
    } catch (e) { console.error('Reschedules summary load failed', e); setReschSummary(null); }
    finally { setReschSummaryLoading(false); }
  };

  /* ── ALL HANDLERS — UNCHANGED ──────────────────────────────── */
  const handleCreateRelease = async () => {
    if (!releaseDialog || !deadline) return;
    if (!interviewStartDate || !interviewEndDate) {
      alert('Interview start and end dates are required.');
      return;
    }
    setCreating(true);
    try {
      const combinedDeadline = deadline ? `${deadline}T${deadlineTime || '18:00'}` : '';
      const combinedStart = interviewStartDate ? `${interviewStartDate}T${interviewStartTime || '09:00'}` : null;
      const combinedEnd = interviewEndDate ? `${interviewEndDate}T${interviewEndTime || '18:00'}` : null;
      await hrSchedulingService.createRelease(
        releaseDialog.process_id, releaseDialog.round_config_id,
        auditOn, combinedDeadline, selLevel,
        durationMins || releaseDialog.duration_mins, isReRelease,
        combinedStart, combinedEnd,
      );
      setReleaseDialog(null); setIsReRelease(false);
      setSelLevel(''); setDeadline(''); setDeadlineTime('18:00'); setAuditOn(true); setDurationMins(45);
      setInterviewStartDate(''); setInterviewStartTime('09:00');
      setInterviewEndDate(''); setInterviewEndTime('18:00');
      load();
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to create release');
    } finally { setCreating(false); }
  };

  const openSupplyReview = async (releaseId) => {
    setSupplyLoading(true);
    setSupplyReviewDialog(releaseId);
    try {
      const res = await hrSchedulingService.getSupplyReview(releaseId);
      setSupplyReview(res.data);
    } catch (err) { console.error(err); setSupplyReview(null); }
    finally { setSupplyLoading(false); }
  };

  const [releaseSnackbar, setReleaseSnackbar] = useState(null);

  const handleReleaseToCandidates = async () => {
    if (!supplyReviewDialog) return;
    setReleasing(true);
    try {
      await hrSchedulingService.releaseToCandidates(supplyReviewDialog);
      setSupplyReviewDialog(null); setSupplyReview(null);
      setReleaseSnackbar('Slots released to candidates successfully!');
      load();
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to release to candidates');
    } finally { setReleasing(false); }
  };

  const handleDeactivateRelease = async () => {
    if (!deactivateDialog || !deactivateReason.trim()) return;
    setDeactivating(true);
    try {
      const relPk = String(deactivateDialog.release_id || '').replace(/\D/g, '');
      await hrSchedulingService.deactivateRelease(relPk, deactivateReason);
      setDeactivateDialog(null); setDeactivateReason('');
      load();
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to deactivate release');
    } finally { setDeactivating(false); }
  };

  const openParticipants = async (round) => {
    setParticipantDialog(round);
    setParticipantLoading(true);
    try {
      const res = await hrSchedulingService.getRoundParticipants(round.process_id, round.round_config_id);
      setParticipants(res.data.participants || []);
    } catch (err) { console.error(err); setParticipants([]); }
    finally { setParticipantLoading(false); }
  };

  /* ── grouped + derived data ──────────────────────────────────── */
  const grouped = useMemo(() => groupByJobTitle(rounds), [rounds]);
  const groupedReleased = grouped.filter(g => g.status === 'released');
  const groupedReady    = grouped.filter(g => g.status === 'ready');
  const groupedWaiting  = grouped.filter(g => g.status === 'waiting');

  const releasedRounds = rounds.filter(r => r.has_release);
  const releaseReadyRounds = rounds.filter(r => r.can_release && !r.has_release);
  const reReleaseRounds = rounds.filter(r => r.can_re_release);
  const problemGroups = groupedReleased.filter(g =>
    g.totalSlotsAll > 0 && (g.totalSlotsBooked / g.totalSlotsAll) < 0.4
  );
  const actionCount = releaseReadyRounds.length + reReleaseRounds.length;
  const reschTotalCount = reschSummary?.total_candidates || 0;

  const selectedGroup = selectedJobKey
    ? grouped.find(g => (g.job_title || '').trim().toLowerCase() === selectedJobKey)
    : null;

  /* ── Navigation helpers ─────────────────────────────────────── */
  /* ── Loader: eligible interviewers for a job ─────────────────── */
  const loadEligibleInterviewers = async (jobId) => {
    if (interviewersLoadedFor === jobId) return;
    setInterviewersLoading(true);
    try {
      const res = await hrSchedulingService.getEligibleInterviewers(jobId);
      setInterviewersList(res.data.interviewers || []);
      setInterviewersLoadedFor(jobId);
    } catch (err) { console.error(err); setInterviewersList([]); }
    finally { setInterviewersLoading(false); }
  };
    /* ── Loader: candidates for all rounds in a job group ────────── */
  const loadCandidatesForJob = async (group) => {
    const key = (group.job_title || '').trim().toLowerCase();
    if (candidatesLoadedKey === key) return;
    setCandidatesLoading(true);
    try {
      const allParticipants = [];
      for (const r of group.rounds) {
        const res = await hrSchedulingService.getRoundParticipants(r.process_id, r.round_config_id);
        const pts = (res.data.participants || []).map(p => ({
          ...p,
          round_order: r.round_order,
          round_name: r.round_name,
        }));
        allParticipants.push(...pts);
      }
      // Deduplicate by candidate_id (same candidate may appear in multiple rounds)
      const seen = new Set();
      const unique = allParticipants.filter(p => {
        const k = `${p.candidate_id}-${p.round_order}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      setCandidatesList(unique);
      setCandidatesLoadedKey(key);
    } catch (err) { console.error(err); setCandidatesList([]); }
    finally { setCandidatesLoading(false); }
  };

  /* ── Loader: slot details for a release ────────────────────── */
  const loadSlotDetailsForRelease = async (releaseId) => {
    const numericId = String(releaseId).replace(/\D/g, '');
    if (slotDetailsLoadedRelease === numericId) return;
    setSlotDetailsLoading(true);
    try {
      const res = await hrSchedulingService.getReleaseSlotDetails(numericId);
      setSlotDetails(res.data);
      setSlotDetailsLoadedRelease(numericId);
    } catch (err) { console.error(err); setSlotDetails(null); }
    finally { setSlotDetailsLoading(false); }
  };

  const openJobDetail = (g, initialTab = 'overview') => {
    setSelectedJobKey((g.job_title || '').trim().toLowerCase());
    setJobTab(initialTab);
    setInterviewersList([]); setInterviewersLoadedFor(null);
    setSlotDetails(null); setSlotDetailsLoadedRelease(null);
    setCandidatesList([]); setCandidatesLoadedKey(null); setCandidatesFilter('booked');
    setIvStatusFilter('completed');
    setReschData(null);
  };
  useEffect(() => {
    if (!selectedGroup) return;
    if (selectedGroup.status !== 'released') return;
    if (reschData || reschLoading) return;
    const rId = selectedGroup.rounds.find(r => r.has_release && r.release)?.release?.id;
    if (!rId) return;
    let cancelled = false;
    setReschLoading(true);
    hrSchedulingService.getRescheduleTabData(rId)
      .then(res => { if (!cancelled) setReschData(res?.data || null); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setReschLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroup?.job_title]);

  const backToMain = () => {
    setSelectedJobKey(null); setJobTab('overview');
    setInterviewersList([]); setInterviewersLoadedFor(null);
    setSlotDetails(null); setSlotDetailsLoadedRelease(null);
    setCandidatesList([]); setCandidatesLoadedKey(null); setCandidatesFilter('booked');
    setIvStatusFilter('completed');
  };

  /* ── loading state ───────────────────────────────────────────── */
  if (loading) return <Box sx={{ p: 3 }}><Skeleton height={400} /></Box>;

  const cardSx = { bgcolor: C.white, border: `1px solid ${C.gray200}`, borderRadius: 2.5, p: 2, mb: 1 };

  /* ═════════════════════════════════════════════════════════════ */
  /*  RENDER                                                       */
  /* ═════════════════════════════════════════════════════════════ */
  return (
    <ThemeProvider theme={scopedTheme}>
    <Box sx={{ minHeight: '100vh' }}>

      {/* ══════════════════════════════════════════════════════════ */}
      {/*  LEVEL 1: MAIN PAGE                                       */}
      {/* ══════════════════════════════════════════════════════════ */}
      {!selectedGroup && (
        <>
          <Box sx={{
            px: { xs: 2, md: 3 }, pt: 2, pb: 0, mt: 1,
            borderBottom: `1px solid ${C.gray200}`, bgcolor: C.white,
            borderRadius: '14px 14px 0 0',
            position: 'sticky', top: 0, zIndex: 10,
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
              <Box>
                <Typography sx={{ fontSize: '0.65rem', fontWeight: 600, letterSpacing: 1.2, textTransform: 'uppercase', color: C.sage, mb: 0.25 }}>
                  IAEM Scheduler
                </Typography>
                <Typography sx={{ fontSize: '1.15rem', fontWeight: 700, color: C.pri }}>Interview scheduling</Typography>
                <Typography sx={{ fontSize: '0.78rem', color: C.gray500, mt: 0.25 }}>
                  Release slots, track bookings, monitor interviews across all jobs.
                </Typography>
              </Box>
              <Tooltip title="Refresh data">
                <IconButton onClick={load} size="small" sx={{ color: C.gray400, mt: 0.5 }}>
                  <Refresh fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            <Box sx={{ display: 'flex', gap: 0, overflow: 'auto' }}>
              <WizardTab label="Action needed" icon={<AssignmentTurnedIn sx={{ fontSize: 16 }} />}
                active={mainTab === 'action'} badge={actionCount}
                badgeBg={C.amberBg} badgeFg={C.amberTxt}
                onClick={() => { setMainTab('action'); setJobSearch(''); }} />
              <WizardTab label="All jobs" icon={<Groups sx={{ fontSize: 16 }} />}
                active={mainTab === 'alljobs'} badge={grouped.length}
                badgeBg={C.gray100} badgeFg={C.gray500}
                onClick={() => setMainTab('alljobs')} />
              <WizardTab label="Reschedules" icon={<SwapHoriz sx={{ fontSize: 16 }} />}
                active={mainTab === 'reschedules'} badge={reschTotalCount}
                badgeBg={reschTotalCount > 0 ? C.redBg : C.gray100}
                badgeFg={reschTotalCount > 0 ? C.redTxt : C.gray500}
                onClick={() => { setMainTab('reschedules'); if (!reschSummary && !reschSummaryLoading) loadReschedulesSummary(); }} />
            </Box>
          </Box>

          <Box sx={{ px: { xs: 2, md: 3 }, py: 2.5 }}>
            {rounds.length === 0 && (
              <Alert severity="info" sx={{ borderRadius: 3 }}>
                No live-video rounds found in any active pipeline. Add a live-video round to a pipeline first.
              </Alert>
            )}

            {/* ═══ ACTION NEEDED ═══════════════════════════════ */}
            {mainTab === 'action' && (
              <>
                {/* ── Category filter chips ── */}
                {actionCount > 0 && (
                  <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 2.5 }}>
                    {[
                      { key: 'all',      label: 'All',                        count: actionCount,              bg: C.pri,     fg: '#fff',       inactiveBg: C.gray100, inactiveFg: C.gray600 },
                      { key: 'open',     label: 'Open slots for candidates',  count: releaseReadyRounds.length, bg: C.greenBg, fg: C.greenTxt,   inactiveBg: C.gray100, inactiveFg: C.gray600 },
                      { key: 'newslots', label: 'New candidates need slots',  count: reReleaseRounds.length,    bg: C.amberBg, fg: C.amberTxt,   inactiveBg: C.gray100, inactiveFg: C.gray600 },
                    ].filter(f => f.key === 'all' || f.count > 0).map(f => {
                      const active = actionFilter === f.key;
                      return (
                        <Chip key={f.key} label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <span>{f.label}</span>
                            <Box component="span" sx={{
                              minWidth: 18, height: 16, px: 0.5, display: 'inline-flex', alignItems: 'center',
                              justifyContent: 'center', borderRadius: 10, fontSize: '0.62rem', fontWeight: 700,
                              bgcolor: active ? (f.key === 'all' ? 'rgba(255,255,255,0.25)' : `${f.fg}20`) : C.gray200,
                              color: active ? (f.key === 'all' ? '#fff' : f.fg) : C.gray500,
                            }}>{f.count}</Box>
                          </Box>
                        } size="small" clickable
                        onClick={() => { setActionFilter(f.key); setOpenSlotsPage(0); setNewSlotsPage(0); }}
                        sx={{
                          fontWeight: 600, fontSize: '0.78rem', borderRadius: '999px', height: 32,
                          bgcolor: active ? (f.key === 'all' ? C.pri : f.bg) : f.inactiveBg,
                          color: active ? (f.key === 'all' ? '#fff' : f.fg) : f.inactiveFg,
                          border: active ? 'none' : `1px solid ${C.gray200}`,
                          '&:hover': { bgcolor: active ? undefined : C.gray200 },
                        }} />
                      );
                    })}
                  </Box>
                )}

                {/* ── Open slots for candidates ── */}
                {(actionFilter === 'all' || actionFilter === 'open') && releaseReadyRounds.length > 0 && (
                  <>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                      <EventAvailable sx={{ fontSize: 18, color: C.greenTxt }} />
                      <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: C.pri }}>Open slots for candidates</Typography>
                      <Chip label={releaseReadyRounds.length} size="small" sx={{ bgcolor: C.greenBg, color: C.greenTxt, fontWeight: 700, fontSize: '0.7rem', height: 20 }} />
                    </Box>
                    {releaseReadyRounds.slice(openSlotsPage * ACTION_PER_PAGE, (openSlotsPage + 1) * ACTION_PER_PAGE).map((r, i) => (
                      <Paper key={`rel-${i}`} elevation={0} sx={{ ...cardSx, display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ width: 38, height: 38, borderRadius: '50%', bgcolor: C.greenBg,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <EventAvailable sx={{ color: C.greenTxt, fontSize: 18 }} />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: C.pri }}>{r.job_title}</Typography>
                          <Typography sx={{ fontSize: '0.75rem', color: C.gray500 }}>
                            {r.ready_count} candidate{r.ready_count !== 1 ? 's' : ''} ready — Rd {r.round_order}: {r.round_name} · {r.duration_mins}m
                          </Typography>
                        </Box>
                        <Button size="small" variant="outlined" sx={{ minWidth: 0, px: 1 }}
                          onClick={() => openParticipants(r)}><People sx={{ fontSize: 16 }} /></Button>
                        <Button size="small" variant="contained" disableElevation
                          onClick={() => { setReleaseDialog(r); setDurationMins(r.duration_mins || 45); }}
                          sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.78rem' }}>Open slots</Button>
                      </Paper>
                    ))}
                    {releaseReadyRounds.length > ACTION_PER_PAGE && (() => {
                      const totalPages = Math.ceil(releaseReadyRounds.length / ACTION_PER_PAGE);
                      return (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1.5, mt: 2, mb: 0.5 }}>
                          <IconButton size="small" disabled={openSlotsPage === 0}
                            onClick={() => setOpenSlotsPage(p => p - 1)}
                            sx={{ width: 32, height: 32, border: `1px solid ${C.gray200}`, borderRadius: '10px',
                              color: openSlotsPage === 0 ? C.gray300 : C.pri,
                              '&:hover': { bgcolor: C.sageLt, borderColor: C.sage } }}>
                            <ArrowBack sx={{ fontSize: 14 }} />
                          </IconButton>
                          <Typography sx={{ fontSize: '0.78rem', color: C.gray500, userSelect: 'none', minWidth: 90, textAlign: 'center' }}>
                            <Box component="span" sx={{ fontWeight: 700, color: C.pri }}>{openSlotsPage + 1}</Box> of {totalPages}
                          </Typography>
                          <IconButton size="small" disabled={openSlotsPage === totalPages - 1}
                            onClick={() => setOpenSlotsPage(p => p + 1)}
                            sx={{ width: 32, height: 32, border: `1px solid ${C.gray200}`, borderRadius: '10px',
                              color: openSlotsPage === totalPages - 1 ? C.gray300 : C.pri,
                              '&:hover': { bgcolor: C.sageLt, borderColor: C.sage } }}>
                            <ArrowBack sx={{ fontSize: 14, transform: 'rotate(180deg)' }} />
                          </IconButton>
                        </Box>
                      );
                    })()}
                  </>
                )}

                {/* ── New candidates need slots ── */}
                {(actionFilter === 'all' || actionFilter === 'newslots') && reReleaseRounds.length > 0 && (
                  <>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, mt: (actionFilter === 'all' && releaseReadyRounds.length > 0) ? 2.5 : 0 }}>
                      <Groups sx={{ fontSize: 18, color: C.amberTxt }} />
                      <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: C.pri }}>New candidates need slots</Typography>
                      <Chip label={reReleaseRounds.length} size="small" sx={{ bgcolor: C.amberBg, color: C.amberTxt, fontWeight: 700, fontSize: '0.7rem', height: 20 }} />
                    </Box>
                    {reReleaseRounds.slice(newSlotsPage * ACTION_PER_PAGE, (newSlotsPage + 1) * ACTION_PER_PAGE).map((r, i) => (
                      <Paper key={`rerel-${i}`} elevation={0} sx={{ ...cardSx, display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ width: 38, height: 38, borderRadius: '50%', bgcolor: C.amberBg,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Groups sx={{ color: C.amberTxt, fontSize: 18 }} />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: C.pri }}>{r.job_title}</Typography>
                          <Typography sx={{ fontSize: '0.75rem', color: C.gray500 }}>
                            {r.unbooked_count} new candidate{r.unbooked_count !== 1 ? 's' : ''} — Rd {r.round_order}: {r.round_name}
                          </Typography>
                        </Box>
                        <Button size="small" variant="outlined" sx={{ minWidth: 0, px: 1 }}
                          onClick={() => openParticipants(r)}><People sx={{ fontSize: 16 }} /></Button>
                        <Button size="small" variant="contained" disableElevation color="warning"
                          onClick={() => { setReleaseDialog(r); setIsReRelease(true); setDurationMins(r.duration_mins || 45); }}
                          sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.78rem' }}>Add slots</Button>
                      </Paper>
                    ))}
                    {reReleaseRounds.length > ACTION_PER_PAGE && (() => {
                      const totalPages = Math.ceil(reReleaseRounds.length / ACTION_PER_PAGE);
                      return (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1.5, mt: 2, mb: 0.5 }}>
                          <IconButton size="small" disabled={newSlotsPage === 0}
                            onClick={() => setNewSlotsPage(p => p - 1)}
                            sx={{ width: 32, height: 32, border: `1px solid ${C.gray200}`, borderRadius: '10px',
                              color: newSlotsPage === 0 ? C.gray300 : C.pri,
                              '&:hover': { bgcolor: C.sageLt, borderColor: C.sage } }}>
                            <ArrowBack sx={{ fontSize: 14 }} />
                          </IconButton>
                          <Typography sx={{ fontSize: '0.78rem', color: C.gray500, userSelect: 'none', minWidth: 90, textAlign: 'center' }}>
                            <Box component="span" sx={{ fontWeight: 700, color: C.pri }}>{newSlotsPage + 1}</Box> of {totalPages}
                          </Typography>
                          <IconButton size="small" disabled={newSlotsPage === totalPages - 1}
                            onClick={() => setNewSlotsPage(p => p + 1)}
                            sx={{ width: 32, height: 32, border: `1px solid ${C.gray200}`, borderRadius: '10px',
                              color: newSlotsPage === totalPages - 1 ? C.gray300 : C.pri,
                              '&:hover': { bgcolor: C.sageLt, borderColor: C.sage } }}>
                            <ArrowBack sx={{ fontSize: 14, transform: 'rotate(180deg)' }} />
                          </IconButton>
                        </Box>
                      );
                    })()}
                  </>
                )}

                {actionCount === 0 && rounds.length > 0 && (
                  <Paper elevation={0} sx={{ bgcolor: C.greenBg, border: `1px solid ${C.sage}40`, borderRadius: 3, p: 3, textAlign: 'center' }}>
                    <CheckCircle sx={{ fontSize: 36, color: C.green, mb: 1 }} />
                    <Typography sx={{ fontWeight: 600, color: C.greenTxt, fontSize: '0.9rem' }}>All clear</Typography>
                    <Typography sx={{ fontSize: '0.78rem', color: C.gray500, mt: 0.5 }}>
                      No actions needed right now. Check back when candidates advance.
                    </Typography>
                  </Paper>
                )}
              </>
            )}

            {/* ═══ ALL JOBS ════════════════════════════════════ */}
            {mainTab === 'alljobs' && (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                  <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: C.pri }}>
                    {groupedReleased.length + groupedReady.length} active + {groupedWaiting.length} waiting
                  </Typography>
                  <TextField size="small" placeholder="Search jobs..." value={jobSearch}
                    onChange={e => { setJobSearch(e.target.value); setJobPage(0); }}
                    slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16, color: C.gray400 }} /></InputAdornment> } }}
                    sx={{ width: 200, '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: '0.8rem' } }} />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {grouped.filter(g => !jobSearch || g.job_title.toLowerCase().includes(jobSearch.toLowerCase())).slice(jobPage * JOBS_PER_PAGE, (jobPage + 1) * JOBS_PER_PAGE).map((g, i) => (
                    <Paper key={i} elevation={0} onClick={() => openJobDetail(g)} sx={{
                      display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.5,
                      border: `1px solid ${C.gray200}`, borderRadius: 2, cursor: 'pointer',
                      opacity: g.status === 'waiting' ? 0.55 : 1,
                      '&:hover': { bgcolor: C.sageXLt, borderColor: C.sage },
                    }}>
                      <Typography sx={{ fontSize: '0.82rem', fontWeight: 500, flex: 1, minWidth: 150, color: C.pri }}>{g.job_title}</Typography>
                      <GroupStatusChip status={g.status} />
                      <Typography sx={{ fontSize: '0.75rem', color: C.gray500, minWidth: 80, textAlign: 'right' }}>
                        {g.status === 'waiting' ? 'Waiting' : `${g.totalCompleted}/${g.totalCandidates} done`}
                      </Typography>
                      <HealthDot group={g} />
                    </Paper>
                  ))}
                  {grouped.filter(g => !jobSearch || g.job_title.toLowerCase().includes(jobSearch.toLowerCase())).length === 0 && (
                    <Paper elevation={0} sx={{ p: 3, textAlign: 'center', color: C.gray400, fontSize: '0.85rem', border: `1px solid ${C.gray200}`, borderRadius: 2 }}>No jobs match "{jobSearch}"</Paper>
                  )}
                  {(() => {
                    const filtered = grouped.filter(g => !jobSearch || g.job_title.toLowerCase().includes(jobSearch.toLowerCase()));
                    const totalPages = Math.ceil(filtered.length / JOBS_PER_PAGE);
                    if (totalPages <= 1) return null;
                    return (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                        <Typography sx={{ fontSize: '0.78rem', color: C.gray500 }}>
                          Showing {jobPage * JOBS_PER_PAGE + 1}–{Math.min((jobPage + 1) * JOBS_PER_PAGE, filtered.length)} of {filtered.length} jobs
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Button size="small" variant="outlined" disabled={jobPage === 0}
                            onClick={() => setJobPage(p => p - 1)}
                            sx={{ textTransform: 'none', fontSize: '0.78rem', minWidth: 36 }}>‹ Prev</Button>
                          {Array.from({ length: totalPages }, (_, pi) => (
                            <Button key={pi} size="small"
                              variant={pi === jobPage ? 'contained' : 'outlined'} disableElevation
                              onClick={() => setJobPage(pi)}
                              sx={{ textTransform: 'none', fontSize: '0.78rem', minWidth: 36 }}>{pi + 1}</Button>
                          ))}
                          <Button size="small" variant="outlined" disabled={jobPage === totalPages - 1}
                            onClick={() => setJobPage(p => p + 1)}
                            sx={{ textTransform: 'none', fontSize: '0.78rem', minWidth: 36 }}>Next ›</Button>
                        </Box>
                      </Box>
                    );
                  })()}
                </Box>
              </>
            )}

            {/* ═══ RESCHEDULES ═════════════════════════════════ */}
            {mainTab === 'reschedules' && (
              <>
                {reschSummaryLoading ? (
                  <Box sx={{ p: 3 }}><LinearProgress /><Typography sx={{ mt: 2, textAlign: 'center', color: C.gray500, fontSize: '0.85rem' }}>Loading reschedule requests…</Typography></Box>
                ) : !reschSummary || reschSummary.jobs.length === 0 ? (
                  <Paper elevation={0} sx={{ bgcolor: C.greenBg, border: `1px solid ${C.sage}40`, borderRadius: 3, p: 3, textAlign: 'center' }}>
                    <CheckCircle sx={{ fontSize: 36, color: C.green, mb: 1 }} />
                    <Typography sx={{ fontWeight: 600, color: C.greenTxt, fontSize: '0.9rem' }}>No reschedule requests</Typography>
                    <Typography sx={{ fontSize: '0.78rem', color: C.gray500, mt: 0.5 }}>
                      No candidates have requested reschedules across any job right now.
                    </Typography>
                  </Paper>
                ) : (
                  <>
                    <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: C.pri, mb: 1.5 }}>
                      {reschSummary.total_candidates} candidate{reschSummary.total_candidates !== 1 ? 's' : ''} across {reschSummary.jobs.length} job{reschSummary.jobs.length !== 1 ? 's' : ''}
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {reschSummary.jobs.map((job, i) => {
                        const matchedGroup = grouped.find(g => (g.job_title || '').trim().toLowerCase() === (job.job_title || '').trim().toLowerCase());
                        return (
                          <Paper key={i} elevation={0}
                            onClick={() => { if (matchedGroup) { openJobDetail(matchedGroup, 'reschedule'); setReschData(null); } }}
                            sx={{
                              display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 1.5,
                              border: `1px solid ${C.gray200}`, borderRadius: 2,
                              cursor: matchedGroup ? 'pointer' : 'default',
                              '&:hover': matchedGroup ? { bgcolor: C.sageXLt, borderColor: C.sage } : {},
                            }}>
                            <Box sx={{ width: 38, height: 38, borderRadius: '50%', bgcolor: C.redBg,
                              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <SwapHoriz sx={{ color: C.redTxt, fontSize: 18 }} />
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: C.pri }}>{job.job_title}</Typography>
                              <Typography sx={{ fontSize: '0.75rem', color: C.gray500 }}>
                                {job.iv_no_show_count > 0 && `${job.iv_no_show_count} IV no-show`}
                                {job.iv_no_show_count > 0 && job.resched_request_count > 0 && ' · '}
                                {job.resched_request_count > 0 && `${job.resched_request_count} reschedule request`}
                              </Typography>
                            </Box>
                            <Chip label={`${job.total_candidates} candidate${job.total_candidates !== 1 ? 's' : ''}`}
                              size="small" sx={{ bgcolor: C.redBg, color: C.redTxt, fontWeight: 700, fontSize: '0.72rem', height: 24 }} />
                          </Paper>
                        );
                      })}
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1.5 }}>
                      <Button size="small" startIcon={<Refresh sx={{ fontSize: 14 }} />}
                        onClick={loadReschedulesSummary} disabled={reschSummaryLoading}
                        sx={{ textTransform: 'none', fontSize: '0.78rem', color: C.gray500 }}>
                        Refresh
                      </Button>
                    </Box>
                  </>
                )}
              </>
            )}
          </Box>
        </>
      )}


      {/* ══════════════════════════════════════════════════════════ */}
      {/*  LEVEL 2: JOB DETAIL PAGE                                 */}
      {/* ══════════════════════════════════════════════════════════ */}
      {selectedGroup && (() => {
        const g = selectedGroup;
        const isWaiting = g.status === 'waiting';
        const tabs = isWaiting
          ? [{ key: 'overview', label: 'Overview' }, { key: 'interviewers', label: 'Interviewers' }]
          : [
              { key: 'overview', label: 'Overview' },
              { key: 'interviewers', label: 'Interviewers' },
              { key: 'reviewrelease', label: 'Review & release' },
              { key: 'candidates', label: 'Candidates' },
              { key: 'ivstatus', label: 'Interview status' },
                            { key: 'reschedule', label: 'Reschedule' },
            ];
          const _heldReady = (reschData?.held_slots?.length || 0);
          const _waitingCount = (reschData?.waiting?.length || 0);
          const _pendingCount = (reschData?.pending?.length || 0);
          const _reschedTabCount = _heldReady + _waitingCount + _pendingCount;
          const _reschedTabHot = _heldReady > 0;   // green = actionable now
          const _reschedTabWarm = !_reschedTabHot && (_waitingCount + _pendingCount) > 0;
        return (
          <>
            <Box sx={{
              px: { xs: 2, md: 3 }, pt: 1.5, pb: 0, mt: 2,
              borderBottom: `1px solid ${C.gray200}`, bgcolor: C.white,
              borderRadius: '14px 14px 0 0',
              position: 'sticky', top: 0, zIndex: 10,
            }}>
              <Button size="small" startIcon={<ArrowBack sx={{ fontSize: 14 }} />}
                onClick={backToMain}
                sx={{ textTransform: 'none', color: C.gray500, fontSize: '0.78rem', mb: 1, '&:hover': { color: C.pri } }}>
                Back to all jobs
              </Button>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                <Box>
                  <Typography sx={{ fontSize: '1.15rem', fontWeight: 700, color: C.pri }}>{g.job_title}</Typography>
                  <Typography sx={{ fontSize: '0.78rem', color: C.gray500, mt: 0.25 }}>
                    {g.rounds.length} pipeline{g.rounds.length > 1 ? 's' : ''}
                    {g.latestDeadline ? ` · Deadline: ${fmtDeadlineShort(g.latestDeadline)}` : ''}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                  {g.readyRounds.map((r, ri) => (
                    <Button key={ri} size="small" variant="contained" disableElevation
                      startIcon={<EventAvailable sx={{ fontSize: 14 }} />}
                      onClick={() => { setReleaseDialog(r); setDurationMins(r.duration_mins || 45); }}
                      sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem', height: 30 }}>
                      Open slots (Rd {r.round_order})
                    </Button>
                  ))}
                  {g.reReleasableRounds.map((r, ri) => (
                    <Button key={`re-${ri}`} size="small" variant="contained" disableElevation color="warning"
                      startIcon={<Groups sx={{ fontSize: 14 }} />}
                      onClick={() => { setReleaseDialog(r); setIsReRelease(true); setDurationMins(r.duration_mins || 45); }}
                      sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem', height: 30 }}>
                      Add slots ({r.unbooked_count})
                    </Button>
                  ))}
                  <GroupStatusChip status={g.status} />
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 0, overflow: 'auto' }}>
                {tabs.map(t => {
                  const _isResched = t.key === 'reschedule';
                  return (
                    <WizardTab
                      key={t.key}
                      label={t.label}
                      active={jobTab === t.key}
                      badge={_isResched ? _reschedTabCount : t.count}
                      badgeBg={_isResched
                        ? (_reschedTabHot ? C.greenBg : _reschedTabWarm ? C.amberBg : undefined)
                        : undefined}
                      badgeFg={_isResched
                        ? (_reschedTabHot ? C.greenTxt : _reschedTabWarm ? C.amberTxt : undefined)
                        : undefined}
                      onClick={() => setJobTab(t.key)}
                    />
                  );
                })}
              </Box>
            </Box>

            <Box sx={{ px: { xs: 2, md: 3 }, py: 2.5 }}>

              {/* ═══ OVERVIEW ══════════════════════════════════ */}
              {jobTab === 'overview' && (
                <>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, mb: 2 }}>
                    {[
                      { label: 'Candidates', val: g.totalCandidates, max: g.totalCandidates, detail: `${g.rounds.length} pipeline${g.rounds.length > 1 ? 's' : ''}` },
                      { label: 'Slots booked', val: g.totalSlotsBooked, max: g.totalSlotsAll || g.totalCandidates || 1, detail: `${g.totalSlotsBooked}/${g.totalSlotsAll || '—'}` },
                      { label: 'Interviews done', val: g.totalCompleted, max: g.totalCandidates || 1, detail: `${g.totalCompleted} completed` },
                      { label: 'Evaluated', val: g.totalCompleted, max: g.totalCompleted || 1, detail: g.allAuditOn ? 'Audit ON' : g.releaseCount > 0 ? 'Audit MIXED' : '—' },
                    ].map((st, si) => {
                      const pct = st.max > 0 ? Math.round((st.val / st.max) * 100) : 0;
                      const barColor = pct >= 90 ? C.green : pct > 0 ? C.amber : C.gray200;
                      return (
                        <Paper key={si} elevation={0} sx={{ p: 1.5, borderRadius: 2, bgcolor: C.white, border: `1px solid ${C.gray200}` }}>
                          <Typography sx={{ fontSize: '0.65rem', color: C.gray400, mb: 0.25 }}>{st.label}</Typography>
                          <Typography sx={{ fontSize: '1.2rem', fontWeight: 700, color: C.pri }}>{st.val}</Typography>
                          <Typography sx={{ fontSize: '0.65rem', color: C.gray500 }}>{st.detail}</Typography>
                          <Box sx={{ height: 4, borderRadius: 2, bgcolor: C.gray100, mt: 0.5, overflow: 'hidden' }}>
                            <Box sx={{ height: '100%', borderRadius: 2, bgcolor: barColor, width: `${pct}%`, transition: 'width 0.3s' }} />
                          </Box>
                        </Paper>
                      );
                    })}
                  </Box>

                  {g.releasedRounds.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: C.pri, mb: 0.75 }}>Interview status</Typography>
                      <BookingLifecycle stats={g.aggBookingStats} />
                    </Box>
                  )}
                  {g.waitingRounds.length > 0 && (
                    <Paper elevation={0} sx={{ ...cardSx, bgcolor: C.gray50 }}>
                      <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: C.gray500, mb: 0.5 }}>
                        {g.waitingRounds.length} round{g.waitingRounds.length > 1 ? 's' : ''} waiting for candidates
                      </Typography>
                      {g.waitingRounds.map((r, wi) => (
                        <Box key={wi} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
                          <HourglassEmpty sx={{ fontSize: 14, color: C.gray400 }} />
                          <Typography sx={{ fontSize: '0.72rem', color: C.gray500 }}>
                            Rd {r.round_order}: {r.round_name} · {r.total_assigned} assigned, {r.locked_count} locked
                          </Typography>
                          {r.total_assigned > 0 && (
                            <Button size="small" variant="text" onClick={() => openParticipants(r)}
                              sx={{ textTransform: 'none', fontSize: '0.68rem', minWidth: 0, px: 1 }}>View</Button>
                          )}
                          {r.can_release && (
                            <Button size="small" variant="contained" disableElevation
                              startIcon={<EventAvailable sx={{ fontSize: 12 }} />}
                              onClick={() => { setReleaseDialog(r); setDurationMins(r.duration_mins || 45); }}
                              sx={{ textTransform: 'none', fontSize: '0.68rem', height: 24 }}>Release</Button>
                          )}
                        </Box>
                      ))}
                    </Paper>
                  )}
                  {isWaiting && g.totalCandidates === 0 && (
                    <Alert severity="info" sx={{ borderRadius: 3 }}>
                      No candidates assigned yet. Candidates will appear here when they qualify from previous rounds.
                    </Alert>
                  )}

                  {/* ── Candidates list ── */}
                  {(() => {
                    const key = (g.job_title || '').trim().toLowerCase();
                    if (candidatesLoadedKey !== key && !candidatesLoading) {
                      loadCandidatesForJob(g);
                    }
                    return (
                      <>
                        <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: C.pri, mb: 0.75, mt: 1 }}>
                          Candidates ({candidatesList.length})
                        </Typography>
                        {candidatesLoading && <LinearProgress sx={{ mb: 1 }} />}
                        {!candidatesLoading && candidatesList.length === 0 && (
                          <Typography sx={{ fontSize: '0.75rem', color: C.gray400 }}>No candidates found.</Typography>
                        )}
                        {!candidatesLoading && candidatesList.length > 0 && (
                          <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${C.gray200}`, borderRadius: 2 }}>
                            <Table size="small">
                              <TableHead>
                                <TableRow sx={{ bgcolor: C.gray50 }}>
                                  <TableCell sx={{ fontSize: '0.68rem', fontWeight: 600, color: C.gray500 }}>CANDIDATE</TableCell>
                                  <TableCell sx={{ fontSize: '0.68rem', fontWeight: 600, color: C.gray500 }}>ROUND</TableCell>
                                  <TableCell sx={{ fontSize: '0.68rem', fontWeight: 600, color: C.gray500 }}>STATUS</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {candidatesList.map((p, pi) => (
                                  <TableRow key={pi} sx={{ '&:last-child td': { borderBottom: 0 } }}>
                                    <TableCell>
                                      <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: C.pri }}>{p.candidate_name}</Typography>
                                      <Typography sx={{ fontSize: '0.65rem', color: C.gray400 }}>{p.email}</Typography>
                                    </TableCell>
                                    <TableCell>
                                      <Typography sx={{ fontSize: '0.72rem', color: C.gray500 }}>
                                        Rd {p.round_order}: {p.round_name}
                                      </Typography>
                                    </TableCell>
                                    <TableCell>
                                      <Chip label={p.has_booking ? (p.booking?.status || 'CONFIRMED') : p.si_status} size="small"
                                        sx={{
                                          fontWeight: 600, fontSize: '0.65rem', height: 20,
                                          bgcolor: p.has_booking ? C.greenBg
                                            : p.si_status === 'invited' || p.si_status === 'scheduled' ? C.amberBg
                                            : p.si_status === 'locked' ? C.gray100
                                            : p.si_status === 'completed' ? C.greenBg
                                            : C.gray100,
                                          color: p.has_booking ? C.greenTxt
                                            : p.si_status === 'invited' || p.si_status === 'scheduled' ? C.amberTxt
                                            : p.si_status === 'locked' ? C.gray500
                                            : p.si_status === 'completed' ? C.greenTxt
                                            : C.gray500,
                                        }} />
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        )}
                      </>
                    );
                  })()}
                </>
              )}

              {/* ═══ INTERVIEWERS ═════════════════════════════ */}
              {jobTab === 'interviewers' && (() => {
                const jobId = g.rounds[0]?.job_id;
                if (!jobId) return <Alert severity="info" sx={{ borderRadius: 3 }}>No job linked to this round.</Alert>;
                if (interviewersLoadedFor !== jobId && !interviewersLoading) {
                  loadEligibleInterviewers(jobId);
                }
                return (
                  <>
                    {interviewersLoading && <LinearProgress sx={{ mb: 2 }} />}
                    {!interviewersLoading && interviewersList.length === 0 && (
                      <Alert severity="info" sx={{ borderRadius: 3 }}>No eligible interviewers found for this job's skill requirements.</Alert>
                    )}
                    {interviewersList.length > 0 && (
                      <>
                        <Typography sx={{ fontSize: '0.78rem', color: C.gray500, mb: 1.5 }}>
                          {interviewersList.length} interviewer{interviewersList.length !== 1 ? 's' : ''} eligible based on skill match
                        </Typography>
                        <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2.5, border: `1px solid ${C.gray200}` }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow sx={{ bgcolor: C.gray50 }}>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', color: C.gray500 }}>Interviewer</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', color: C.gray500 }}>Department</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', color: C.gray500 }}>Designation</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', color: C.gray500 }} align="center">Skill match</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', color: C.gray500 }}>Matching skills</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', color: C.gray500 }} align="center">Slots submitted</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {interviewersList.map((iv, idx) => (
                                <TableRow key={idx} hover>
                                  <TableCell>
                                    <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: C.pri }}>{iv.name}</Typography>
                                    <Typography sx={{ fontSize: '0.7rem', color: C.gray400 }}>{iv.email}</Typography>
                                  </TableCell>
                                  <TableCell sx={{ fontSize: '0.78rem', color: C.gray600 }}>{iv.department || '—'}</TableCell>
                                  <TableCell sx={{ fontSize: '0.78rem', color: C.gray600 }}>{iv.designation || '—'}</TableCell>
                                  <TableCell align="center">
                                    <Chip label={`${iv.skill_overlap_pct}%`} size="small"
                                      sx={{ bgcolor: iv.skill_overlap_pct >= 70 ? C.greenBg : iv.skill_overlap_pct >= 40 ? C.amberBg : C.gray100,
                                        color: iv.skill_overlap_pct >= 70 ? C.greenTxt : iv.skill_overlap_pct >= 40 ? C.amberTxt : C.gray500,
                                        fontWeight: 600, fontSize: '0.65rem', height: 20 }} />
                                  </TableCell>
                                  <TableCell>
                                    {iv.matching_skills && iv.matching_skills.length > 0 ? (
                                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                        {iv.matching_skills.map((skill, si) => (
                                          <Chip key={si} label={skill} size="small"
                                            sx={{ bgcolor: C.sageLt, color: C.pri, fontSize: '0.62rem', height: 18 }} />
                                        ))}
                                      </Box>
                                    ) : (
                                      <Typography sx={{ fontSize: '0.72rem', color: C.gray400, fontStyle: 'italic' }}>No skill filter</Typography>
                                    )}
                                  </TableCell>
                                  <TableCell align="center">
                                    <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: iv.slots_submitted > 0 ? C.greenTxt : C.gray400 }}>
                                      {iv.slots_submitted}
                                    </Typography>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </>
                    )}
                  </>
                );
              })()}

              {/* ═══ REVIEW & RELEASE ════════════════════════ */}
              {jobTab === 'reviewrelease' && (
                <>
                  {g.releasedRounds.length === 0 ? (
                    <Alert severity="info" sx={{ borderRadius: 3 }}>No releases yet — create a release first to review slots.</Alert>
                  ) : (
                    <>
                      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                        {g.releasedRounds.map((r, ri) => (
                          <Button key={ri} size="small"
                            variant={slotDetailsLoadedRelease === String(r.release.release_id).replace(/\D/g, '') ? 'contained' : 'outlined'}
                            disableElevation
                            onClick={() => loadSlotDetailsForRelease(r.release.release_id)}
                            sx={{ textTransform: 'none', fontSize: '0.75rem', height: 28 }}>
                            {r.release.release_id}
                          </Button>
                        ))}
                      </Box>
                      {slotDetailsLoading && <LinearProgress sx={{ mb: 2 }} />}
                      {!slotDetailsLoading && !slotDetails && slotDetailsLoadedRelease === null && (
                        <Alert severity="info" sx={{ borderRadius: 3 }}>Select a release above to review its slots.</Alert>
                      )}
                      {slotDetails && (
                        <>
                          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, mb: 2 }}>
                            <Paper elevation={0} sx={{ p: 1.5, borderRadius: 2, bgcolor: C.sageLt, textAlign: 'center' }}>
                              <Typography sx={{ fontSize: '1.2rem', fontWeight: 700, color: C.pri }}>{slotDetails.total_candidates_in_round}</Typography>
                              <Typography sx={{ fontSize: '0.65rem', color: C.gray500 }}>Candidates in round</Typography>
                            </Paper>
                            <Paper elevation={0} sx={{ p: 1.5, borderRadius: 2, bgcolor: C.greenBg, textAlign: 'center' }}>
                              <Typography sx={{ fontSize: '1.2rem', fontWeight: 700, color: C.greenTxt }}>{slotDetails.slots_open}</Typography>
                              <Typography sx={{ fontSize: '0.65rem', color: C.gray500 }}>Open slots</Typography>
                            </Paper>
                            <Paper elevation={0} sx={{ p: 1.5, borderRadius: 2, bgcolor: C.amberBg, textAlign: 'center' }}>
                              <Typography sx={{ fontSize: '1.2rem', fontWeight: 700, color: C.amberTxt }}>{slotDetails.slots_booked}</Typography>
                              <Typography sx={{ fontSize: '0.65rem', color: C.gray500 }}>Booked</Typography>
                            </Paper>
                            <Paper elevation={0} sx={{ p: 1.5, borderRadius: 2, bgcolor: slotDetails.shortage > 0 ? C.redBg : C.gray50, textAlign: 'center' }}>
                              <Typography sx={{ fontSize: '1.2rem', fontWeight: 700, color: slotDetails.shortage > 0 ? C.red : C.gray600 }}>{slotDetails.shortage}</Typography>
                              <Typography sx={{ fontSize: '0.65rem', color: C.gray500 }}>Slot shortage</Typography>
                            </Paper>
                          </Box>
                          {slotDetails.has_enough_slots && !slotDetails.slots_released_to_candidates && (
                            <Alert severity="success" sx={{ borderRadius: 2, mb: 1.5 }}>Enough slots to cover all candidates. Ready to release to candidates.</Alert>
                          )}
                          {!slotDetails.has_enough_slots && slotDetails.slots_total > 0 && (
                            <Alert severity="warning" sx={{ borderRadius: 2, mb: 1.5 }}>
                              Shortage of <strong>{slotDetails.shortage}</strong> slot(s). You may want to wait for more interviewers to submit, or release anyway.
                            </Alert>
                          )}
                          {slotDetails.slots_released_to_candidates && (
                            <Alert severity="info" sx={{ borderRadius: 2, mb: 1.5 }}>Slots are already released to candidates for this release.</Alert>
                          )}
                          {!slotDetails.slots_released_to_candidates && (slotDetails.slots_open > 0 || (slotDetails.slots_supplied || 0) > 0) && (
                            <Box sx={{ mb: 2 }}>
                              <Button variant="contained" disableElevation
                                startIcon={<Groups sx={{ fontSize: 16 }} />}
                                onClick={() => openSupplyReview(slotDetails.release_id)}
                                sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.82rem', bgcolor: C.green, '&:hover': { bgcolor: '#059669' } }}>
                                Review & release to candidates
                              </Button>
                            </Box>
                          )}
                          {slotDetails.slots && slotDetails.slots.length > 0 ? (
                            <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2.5, border: `1px solid ${C.gray200}` }}>
                              <Table size="small">
                                <TableHead>
                                  <TableRow sx={{ bgcolor: C.gray50 }}>
                                    <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', color: C.gray500 }}>Interviewer</TableCell>
                                    <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', color: C.gray500 }}>Date</TableCell>
                                    <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', color: C.gray500 }}>Time</TableCell>
                                    <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', color: C.gray500 }} align="center">Duration</TableCell>
                                    <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', color: C.gray500 }}>Status</TableCell>
                                    <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', color: C.gray500 }}>Booked by</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {slotDetails.slots.map((sl, idx) => (
                                    <TableRow key={idx} hover>
                                      <TableCell>
                                        <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: C.pri }}>{sl.interviewer_name}</Typography>
                                        <Typography sx={{ fontSize: '0.68rem', color: C.gray400 }}>{sl.interviewer_email}</Typography>
                                      </TableCell>
                                      <TableCell sx={{ fontSize: '0.8rem', color: C.gray600 }}>
                                        {new Date(sl.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                      </TableCell>
                                      <TableCell sx={{ fontSize: '0.8rem', color: C.gray600 }}>{sl.time}</TableCell>
                                      <TableCell align="center" sx={{ fontSize: '0.8rem', color: C.gray500 }}>{sl.duration_mins}m</TableCell>
                                      <TableCell>
                                        <Chip label={sl.status === 'open' ? 'Open' : sl.status === 'booked' ? 'Booked' : sl.status === 'CLOSED' ? 'Closed' : sl.status} size="small"
                                          sx={{
                                            bgcolor: sl.status === 'open' ? C.greenBg : sl.status === 'booked' ? C.amberBg : sl.status === 'CLOSED' ? C.redBg : C.gray100,
                                            color: sl.status === 'open' ? C.greenTxt : sl.status === 'booked' ? C.amberTxt : sl.status === 'CLOSED' ? C.redTxt : C.gray500,
                                            fontWeight: 600, fontSize: '0.65rem', height: 20,
                                          }} />
                                      </TableCell>
                                      <TableCell sx={{ fontSize: '0.78rem', color: C.gray600 }}>{sl.candidate_name || '—'}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          ) : (
                            <Alert severity="info" sx={{ borderRadius: 3 }}>No slots submitted yet. Interviewers haven't added their availability.</Alert>
                          )}
                        </>
                      )}
                    </>
                  )}
                </>
              )}
                            {/* ═══ CANDIDATES ═══════════════════════════════ */}
              {jobTab === 'candidates' && (() => {
                const key = (g.job_title || '').trim().toLowerCase();
                if (candidatesLoadedKey !== key && !candidatesLoading) {
                  loadCandidatesForJob(g);
                }
                // Load reschedule data if needed (to detect expired reschedule slots)
                const rInfoCand = g.rounds.find(r => r.has_release && r.release);
                const rIdCand = rInfoCand?.release?.release_id ? parseInt(String(rInfoCand.release.release_id).replace(/\D/g, ''), 10) : null;
                if (rIdCand && (!reschData || reschData.release_id !== rIdCand) && !reschLoading) {
                  setReschLoading(true);
                  hrSchedulingService.getRescheduleTabData(rIdCand)
                    .then(res => setReschData(res?.data || null))
                    .catch(e => console.error(e))
                    .finally(() => setReschLoading(false));
                }
                const slotsExpired = reschData?.release_id === rIdCand && reschData?.reschedule_slots_expired === true;

                const slotsReleasedToCandidates = g.rounds.some(r => r.has_release && r.release?.slots_released_to_candidates);

                const booked = candidatesList.filter(p => p.has_booking && !(slotsExpired && p.booking?.status === 'RESCHEDULED'));
                const notBooked = slotsReleasedToCandidates
                  ? candidatesList.filter(p => !p.has_booking || (slotsExpired && p.booking?.status === 'RESCHEDULED'))
                  : [];
                const filtered = candidatesFilter === 'booked' ? booked : notBooked;

                return (
                  <>
                    {candidatesLoading && <LinearProgress sx={{ mb: 2 }} />}

                    {!candidatesLoading && (
                      <>
                        {/* Toggle */}
                        <Box sx={{ display: 'flex', gap: 0, mb: 2, border: `1px solid ${C.gray200}`, borderRadius: 2, overflow: 'hidden', width: 'fit-content' }}>
                          <Box onClick={() => setCandidatesFilter('booked')}
                            sx={{
                              px: 2.5, py: 1, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 500,
                              bgcolor: candidatesFilter === 'booked' ? C.pri : C.white,
                              color: candidatesFilter === 'booked' ? C.white : C.gray500,
                              transition: 'all 0.15s',
                            }}>
                            Booked ({booked.length})
                          </Box>
                          <Box onClick={() => setCandidatesFilter('notbooked')}
                            sx={{
                              px: 2.5, py: 1, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 500,
                              bgcolor: candidatesFilter === 'notbooked' ? C.pri : C.white,
                              color: candidatesFilter === 'notbooked' ? C.white : C.gray500,
                              borderLeft: `1px solid ${C.gray200}`,
                              transition: 'all 0.15s',
                            }}>
                            Not booked ({notBooked.length})
                          </Box>
                        </Box>

                        {filtered.length === 0 ? (
                          <Alert severity="info" sx={{ borderRadius: 3 }}>
                            {candidatesFilter === 'booked'
                              ? 'No candidates have booked a slot yet.'
                              : 'All candidates have booked their slots.'}
                          </Alert>
                        ) : (
                          <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2.5, border: `1px solid ${C.gray200}` }}>
                            <Table size="small">
                              <TableHead>
                                <TableRow sx={{ bgcolor: C.gray50 }}>
                                  <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', color: C.gray500 }}>Candidate</TableCell>
                                  <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', color: C.gray500 }}>Round</TableCell>
                                  {candidatesFilter === 'booked' && (
                                    <>
                                      <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', color: C.gray500 }}>Interviewer</TableCell>
                                      <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', color: C.gray500 }}>Date & time</TableCell>
                                      <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', color: C.gray500 }}>Status</TableCell>
                                    </>
                                  )}
                                  {candidatesFilter === 'notbooked' && (
                                    <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', color: C.gray500 }}>Pipeline status</TableCell>
                                  )}
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {filtered.map((p, idx) => (
                                  <TableRow key={idx} hover>
                                    <TableCell>
                                      <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: C.pri }}>{p.candidate_name}</Typography>
                                      <Typography sx={{ fontSize: '0.7rem', color: C.gray400 }}>{p.email}</Typography>
                                    </TableCell>
                                    <TableCell sx={{ fontSize: '0.78rem', color: C.gray600 }}>
                                      Rd {p.round_order}: {p.round_name}
                                    </TableCell>
                                    {candidatesFilter === 'booked' && p.booking && (
                                      <>
                                        <TableCell sx={{ fontSize: '0.78rem', color: C.gray600 }}>{p.booking.interviewer || '—'}</TableCell>
                                        <TableCell sx={{ fontSize: '0.78rem', color: C.gray600 }}>
                                          {p.booking.booked_date} at {p.booking.booked_time}
                                        </TableCell>
                                        <TableCell>
                                          <Chip label={p.booking.status || 'CONFIRMED'} size="small"
                                            sx={{
                                              bgcolor: (p.booking.status || 'CONFIRMED') === 'CONFIRMED' ? C.greenBg
                                                : (p.booking.status || '').includes('NO_SHOW') ? C.redBg
                                                : C.amberBg,
                                              color: (p.booking.status || 'CONFIRMED') === 'CONFIRMED' ? C.greenTxt
                                                : (p.booking.status || '').includes('NO_SHOW') ? C.redTxt
                                                : C.amberTxt,
                                              fontWeight: 600, fontSize: '0.65rem', height: 20,
                                            }} />
                                        </TableCell>
                                      </>
                                    )}
                                    {candidatesFilter === 'notbooked' && (
                                      <TableCell>
                                        <Chip label={p.si_status} size="small"
                                          sx={{
                                            bgcolor: p.si_status === 'invited' || p.si_status === 'scheduled' ? C.amberBg
                                              : p.si_status === 'locked' ? C.gray100
                                              : C.greenBg,
                                            color: p.si_status === 'invited' || p.si_status === 'scheduled' ? C.amberTxt
                                              : p.si_status === 'locked' ? C.gray500
                                              : C.greenTxt,
                                            fontWeight: 600, fontSize: '0.65rem', height: 20,
                                          }} />
                                      </TableCell>
                                    )}
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        )}
                      </>
                    )}
                  </>
                );
              })()}
                            {/* ═══ INTERVIEW STATUS ════════════════════════ */}
              {jobTab === 'ivstatus' && (() => {
                const key = (g.job_title || '').trim().toLowerCase();
                if (candidatesLoadedKey !== key && !candidatesLoading) {
                  loadCandidatesForJob(g);
                }
                const completedStatuses = ['COMPLETED', 'EVAL_PENDING'];
                const notAttemptedStatuses = ['NO_SHOW_IV', 'NO_SHOW_CAND', 'RESCHEDULED'];

                const completed = candidatesList.filter(p =>
                  p.has_booking && completedStatuses.includes(p.booking?.status)
                );

                // Also treat CONFIRMED bookings whose date has passed as "missed"
                const isPastInterview = (p) => {
                  if (!p.booking?.booked_date) return false;
                  try {
                    const interviewDate = new Date(p.booking.booked_date);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return interviewDate < today;
                  } catch { return false; }
                };

                const notAttempted = candidatesList.filter(p =>
                  p.has_booking && (
                    notAttemptedStatuses.includes(p.booking?.status) ||
                    (p.booking?.status === 'CONFIRMED' && isPastInterview(p))
                  )
                );
                const filtered = ivStatusFilter === 'completed' ? completed : notAttempted;

                const statusLabel = (s, p) => {
                  if (s === 'COMPLETED') return 'Completed';
                  if (s === 'EVAL_PENDING') return 'Eval pending';
                  if (s === 'NO_SHOW_IV') return 'Interviewer no-show';
                  if (s === 'NO_SHOW_CAND') return 'Candidate no-show';
                  if (s === 'RESCHEDULED') return 'Rescheduled';
                  if (s === 'CONFIRMED' && p && isPastInterview(p)) return 'Missed';
                  return s;
                };
                const statusColor = (s, p) => {
                  if (s === 'COMPLETED') return { bg: C.greenBg, fg: C.greenTxt };
                  if (s === 'EVAL_PENDING') return { bg: C.amberBg, fg: C.amberTxt };
                  if (s === 'NO_SHOW_IV' || s === 'NO_SHOW_CAND') return { bg: C.redBg, fg: C.redTxt };
                  if (s === 'RESCHEDULED') return { bg: C.gray100, fg: C.gray600 };
                  if (s === 'CONFIRMED' && p && isPastInterview(p)) return { bg: C.redBg, fg: C.redTxt };
                  return { bg: C.gray100, fg: C.gray500 };
                };

                return (
                  <>
                    {candidatesLoading && <LinearProgress sx={{ mb: 2 }} />}

                    {!candidatesLoading && (
                      <>
                        <Box sx={{ display: 'flex', gap: 0, mb: 2, border: `1px solid ${C.gray200}`, borderRadius: 2, overflow: 'hidden', width: 'fit-content' }}>
                          <Box onClick={() => setIvStatusFilter('completed')}
                            sx={{
                              px: 2.5, py: 1, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 500,
                              bgcolor: ivStatusFilter === 'completed' ? C.pri : C.white,
                              color: ivStatusFilter === 'completed' ? C.white : C.gray500,
                              transition: 'all 0.15s',
                            }}>
                            Attempted ({completed.length})
                          </Box>
                          <Box onClick={() => setIvStatusFilter('notattempted')}
                            sx={{
                              px: 2.5, py: 1, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 500,
                              bgcolor: ivStatusFilter === 'notattempted' ? C.pri : C.white,
                              color: ivStatusFilter === 'notattempted' ? C.white : C.gray500,
                              borderLeft: `1px solid ${C.gray200}`,
                              transition: 'all 0.15s',
                            }}>
                            Not attempted ({notAttempted.length})
                          </Box>
                        </Box>

                        {filtered.length === 0 ? (
                          <Alert severity="info" sx={{ borderRadius: 3 }}>
                            {ivStatusFilter === 'completed'
                              ? 'No completed interviews yet.'
                              : 'No missed or rescheduled interviews.'}
                          </Alert>
                        ) : (
                          <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2.5, border: `1px solid ${C.gray200}` }}>
                            <Table size="small">
                              <TableHead>
                                <TableRow sx={{ bgcolor: C.gray50 }}>
                                  <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', color: C.gray500 }}>Candidate</TableCell>
                                  <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', color: C.gray500 }}>Round</TableCell>
                                  <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', color: C.gray500 }}>Interviewer</TableCell>
                                  <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', color: C.gray500 }}>Date & time</TableCell>
                                  <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', color: C.gray500 }}>Status</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {filtered.map((p, idx) => {
                                  const sc = statusColor(p.booking?.status, p);
                                  return (
                                    <TableRow key={idx} hover>
                                      <TableCell>
                                        <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: C.pri }}>{p.candidate_name}</Typography>
                                        <Typography sx={{ fontSize: '0.7rem', color: C.gray400 }}>{p.email}</Typography>
                                      </TableCell>
                                      <TableCell sx={{ fontSize: '0.78rem', color: C.gray600 }}>
                                        Rd {p.round_order}: {p.round_name}
                                      </TableCell>
                                      <TableCell sx={{ fontSize: '0.78rem', color: C.gray600 }}>
                                        {p.booking?.interviewer || '—'}
                                      </TableCell>
                                      <TableCell sx={{ fontSize: '0.78rem', color: C.gray600 }}>
                                        {p.booking?.booked_date} at {p.booking?.booked_time}
                                      </TableCell>
                                      <TableCell>
                                        <Chip label={statusLabel(p.booking?.status, p)} size="small"
                                          sx={{ bgcolor: sc.bg, color: sc.fg, fontWeight: 600, fontSize: '0.65rem', height: 20 }} />
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        )}
                      </>
                    )}
                  </>
                );
              })()}

              {/* ═══ RESCHEDULE TAB ════════════════════════════════ */}
              {jobTab === 'reschedule' && (() => {
                const releaseInfo = g.rounds.find(r => r.has_release && r.release);
                const releaseId = releaseInfo?.release?.release_id;
                const releaseIdNum = releaseId ? parseInt(String(releaseId).replace(/\D/g, ''), 10) : null;

                if (!releaseIdNum) {
                  return <Alert severity="info" sx={{ borderRadius: 3 }}>No active release for this job. Create a release first.</Alert>;
                }

                const loadReschTab = async () => {
                  setReschLoading(true);
                  try {
                    const res = await hrSchedulingService.getRescheduleTabData(releaseIdNum);
                    setReschData(res?.data || null);
                  } catch (e) { console.error('Reschedule tab load failed', e); }
                  finally { setReschLoading(false); }
                };

                if (!reschData && !reschLoading) { loadReschTab(); }

                const handleApprove = async (bookingId) => {
                  setReschActing(true);
                  try {
                    await hrSchedulingService.approveReschedule(bookingId);
                    setReschApproveDialog(null);
                    await loadReschTab();
                    load();
                  } catch (e) { alert(e?.response?.data?.detail || 'Approve failed'); }
                  finally { setReschActing(false); }
                };

                const handleReject = async (bookingId) => {
                  setReschActing(true);
                  try {
                    await hrSchedulingService.rejectReschedule(bookingId);
                    setReschRejectDialog(null);
                    await loadReschTab();
                    load();
                  } catch (e) { alert(e?.response?.data?.detail || 'Reject failed'); }
                  finally { setReschActing(false); }
                };

                const handleRequestSlots = async () => {
                  if (!reschCfgDeadline || !reschCfgStartDate || !reschCfgEndDate) {
                    alert('Deadline date, interview start and end dates are required.');
                    return;
                  }
                  setReschActing(true);
                  try {
                    const payload = {
                      slot_deadline: `${reschCfgDeadline}T${reschCfgDeadlineTime || '18:00'}`,
                      interview_start: `${reschCfgStartDate}T${reschCfgStartTime || '09:00'}`,
                      interview_end: `${reschCfgEndDate}T${reschCfgEndTime || '18:00'}`,
                      duration_mins: reschCfgDuration || 45,
                      level: reschCfgLevel || '',
                    };
                    const res = await hrSchedulingService.requestRescheduleSlots(releaseIdNum, payload);
                    setReschRequestSlotsDialog(false);
                    setNotifyInfoDialog({ open: true, count: res?.data?.interviewers_notified || 0 });
                    await loadReschTab();
                  } catch (e) { alert(e?.response?.data?.detail || 'Failed'); }
                  finally { setReschActing(false); }
                };

                const handleReleaseSlots = async () => {
                  setReschActing(true);
                  try {
                    const res = await hrSchedulingService.releaseRescheduleSlots(releaseIdNum);
                    setReschReleaseSlotsDialog(false);
                    setReleaseSlotsInfoDialog({
                      open: true,
                      slots: res?.data?.slots_released || 0,
                      candidates: res?.data?.candidates_notified || 0,
                    });
                    await loadReschTab();
                    load();
                  } catch (e) { alert(e?.response?.data?.detail || 'Failed'); }
                  finally { setReschActing(false); }
                };

                if (reschLoading) return <LinearProgress sx={{ mb: 2 }} />;
                if (!reschData) return <Alert severity="info" sx={{ borderRadius: 3 }}>Unable to load reschedule data.</Alert>;

                const s = reschData.summary;
                const hasWork = s.pending_requests > 0 || s.waiting_to_rebook > 0 || s.held_slots > 0;

                return (
                  <>
                    {/* ── Summary cards ── */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, mb: 2.5 }}>
                      {[
                        { label: 'Pending requests', val: s.pending_requests, bg: s.pending_requests > 0 ? C.amberBg : C.gray50, fg: s.pending_requests > 0 ? C.amberTxt : C.gray500 },
                        { label: 'Waiting to rebook', val: s.waiting_to_rebook, bg: s.waiting_to_rebook > 0 ? C.redBg : C.gray50, fg: s.waiting_to_rebook > 0 ? C.redTxt : C.gray500 },
                        { label: 'Held slots', val: s.held_slots, bg: s.held_slots > 0 ? C.indigoBg : C.gray50, fg: s.held_slots > 0 ? C.indigoTxt : C.gray500 },
                        { label: 'Rebooked', val: s.rebooked, bg: s.rebooked > 0 ? C.greenBg : C.gray50, fg: s.rebooked > 0 ? C.greenTxt : C.gray500 },
                      ].map((c, i) => (
                        <Paper key={i} elevation={0} sx={{ p: 1.5, borderRadius: 2, bgcolor: c.bg, border: `1px solid ${C.gray200}`, textAlign: 'center' }}>
                          <Typography sx={{ fontSize: '1.3rem', fontWeight: 700, color: c.fg }}>{c.val}</Typography>
                          <Typography sx={{ fontSize: '0.68rem', color: C.gray500 }}>{c.label}</Typography>
                        </Paper>
                      ))}
                    </Box>

                    {!hasWork && s.rebooked === 0 && (
                      <Alert severity="info" sx={{ borderRadius: 3 }}>No reschedule requests at this time.</Alert>
                    )}

                    {/* ── Pending requests ── */}
                    {reschData.pending.length > 0 && (
                      <>
                        <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: C.pri, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                          <HourglassEmpty sx={{ fontSize: 16 }} /> Pending Requests
                        </Typography>
                        <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2.5, border: `1px solid ${C.gray200}`, mb: 2.5 }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow sx={{ bgcolor: C.gray50 }}>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', color: C.gray500 }}>Candidate</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', color: C.gray500 }}>Type</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', color: C.gray500 }}>Reason</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', color: C.gray500 }}>Original slot</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', color: C.gray500 }}>Actions</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {reschData.pending.map((p) => (
                                <TableRow key={p.booking_id} hover>
                                  <TableCell>
                                    <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: C.pri }}>{p.candidate_name}</Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Chip size="small" label={p.reschedule_type === 'INTERVIEWER_NO_SHOW' ? 'IV no-show' : 'Candidate request'}
                                      sx={{
                                        height: 20, fontSize: '0.6rem', fontWeight: 700,
                                        bgcolor: p.reschedule_type === 'INTERVIEWER_NO_SHOW' ? C.redBg : C.amberBg,
                                        color: p.reschedule_type === 'INTERVIEWER_NO_SHOW' ? C.redTxt : C.amberTxt,
                                      }} />
                                  </TableCell>
                                  <TableCell sx={{ fontSize: '0.78rem', color: C.gray600, maxWidth: 200 }}>
                                    {p.reason || '—'}
                                    {p.candidate_wait_mins != null && (
                                      <Typography sx={{ fontSize: '0.68rem', color: C.redTxt }}>Waited {p.candidate_wait_mins} min</Typography>
                                    )}
                                  </TableCell>
                                  <TableCell sx={{ fontSize: '0.78rem', color: C.gray600 }}>
                                    {p.slot_date} {p.slot_time}
                                    {p.interviewer_name && <Typography sx={{ fontSize: '0.68rem', color: C.gray400 }}>{p.interviewer_name}</Typography>}
                                  </TableCell>
                                  <TableCell>
                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                      <Button size="small" variant="contained" disableElevation disabled={reschActing}
                                        onClick={() => setReschApproveDialog({ bookingId: p.booking_id, candidateName: p.candidate_name })}
                                        sx={{ textTransform: 'none', fontSize: '0.68rem', fontWeight: 700, bgcolor: C.green, '&:hover': { bgcolor: '#059669' }, height: 26, px: 1.5 }}>
                                        Approve
                                      </Button>
                                      <Button size="small" variant="outlined" disabled={reschActing}
                                        onClick={() => setReschRejectDialog({ bookingId: p.booking_id, candidateName: p.candidate_name })}
                                        sx={{ textTransform: 'none', fontSize: '0.68rem', fontWeight: 700, color: C.red, borderColor: C.red, height: 26, px: 1.5 }}>
                                        Reject
                                      </Button>
                                    </Box>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </>
                    )}

                    {/* ── Waiting to rebook ── */}
                    {reschData.waiting.length > 0 && (
                      <>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, mt: 1 }}>
                          <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: C.pri, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Schedule sx={{ fontSize: 16 }} /> Waiting to Rebook ({reschData.waiting.length})
                          </Typography>
                          {!reschData.collecting_slots && !(reschData.summary?.open_slots > 0) && (
                            <Button size="small" variant="contained" disableElevation disabled={reschActing}
                              onClick={() => {
                                const cfg = reschData?.release_config || {};
                                if (cfg.slot_deadline) {
                                  const dl = new Date(cfg.slot_deadline);
                                  setReschCfgDeadline(dl.toISOString().slice(0, 10));
                                  setReschCfgDeadlineTime(dl.toTimeString().slice(0, 5));
                                } else { setReschCfgDeadline(''); setReschCfgDeadlineTime('18:00'); }
                                if (cfg.interview_start) {
                                  const st = new Date(cfg.interview_start);
                                  setReschCfgStartDate(st.toISOString().slice(0, 10));
                                  setReschCfgStartTime(st.toTimeString().slice(0, 5));
                                } else { setReschCfgStartDate(''); setReschCfgStartTime('09:00'); }
                                if (cfg.interview_end) {
                                  const en = new Date(cfg.interview_end);
                                  setReschCfgEndDate(en.toISOString().slice(0, 10));
                                  setReschCfgEndTime(en.toTimeString().slice(0, 5));
                                } else { setReschCfgEndDate(''); setReschCfgEndTime('18:00'); }
                                setReschCfgDuration(cfg.duration_mins || 45);
                                setReschCfgLevel(cfg.level || '');
                                setReschRequestSlotsDialog(true);
                              }}
                              sx={{ textTransform: 'none', fontSize: '0.72rem', fontWeight: 700, bgcolor: C.amber, '&:hover': { bgcolor: '#D97706' }, height: 28, px: 2 }}>
                              Request slots from interviewers
                            </Button>
                          )}
                          {reschData.collecting_slots && (
                            <Chip label="Collecting slots from interviewers…" size="small"
                              sx={{ bgcolor: C.amberBg, color: C.amberTxt, fontWeight: 600, fontSize: '0.68rem' }} />
                          )}
                          {!reschData.collecting_slots && reschData.summary?.open_slots > 0 && (
                            <Chip label={`${reschData.summary.open_slots} open slot${reschData.summary.open_slots !== 1 ? 's' : ''} — waiting for candidate to book`}
                              size="small"
                              sx={{ bgcolor: C.greenBg, color: C.greenTxt, fontWeight: 600, fontSize: '0.68rem' }} />
                          )}
                        </Box>
                        <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2.5, border: `1px solid ${C.gray200}`, mb: 2.5 }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow sx={{ bgcolor: C.gray50 }}>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', color: C.gray500 }}>Candidate</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', color: C.gray500 }}>Reason</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', color: C.gray500 }}>Approved at</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {reschData.waiting.map((w) => (
                                <TableRow key={w.booking_id} hover>
                                  <TableCell>
                                    <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: C.pri }}>{w.candidate_name}</Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Chip size="small"
                                      label={w.reschedule_type === 'INTERVIEWER_NO_SHOW' ? 'IV no-show' : 'Candidate request'}
                                      sx={{ height: 18, fontSize: '0.58rem', fontWeight: 600, bgcolor: C.gray100, color: C.gray600 }} />
                                  </TableCell>
                                  <TableCell sx={{ fontSize: '0.78rem', color: C.gray500 }}>
                                    {w.approved_at ? new Date(w.approved_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </>
                    )}

                    {/* ── Held slots (submitted by interviewers, awaiting HR release) ── */}
                    {reschData.held_slots.length > 0 && (
                      <>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, mt: 1 }}>
                          <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: C.pri, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Lock sx={{ fontSize: 16 }} /> Held Slots ({reschData.held_slots.length})
                            <Typography component="span" sx={{ fontSize: '0.72rem', color: C.gray500, fontWeight: 400 }}>
                              — {reschData.waiting.length} candidate{reschData.waiting.length !== 1 ? 's' : ''} waiting, {reschData.held_slots.length} slot{reschData.held_slots.length !== 1 ? 's' : ''} held
                            </Typography>
                          </Typography>
                          <Button size="small" variant="contained" disableElevation disabled={reschActing}
                            onClick={() => setReschReleaseSlotsDialog(true)}
                            sx={{ textTransform: 'none', fontSize: '0.72rem', fontWeight: 700, bgcolor: C.green, '&:hover': { bgcolor: '#059669' }, height: 28, px: 2 }}>
                            Release to candidates
                          </Button>
                        </Box>
                        {reschData.held_slots.length >= reschData.waiting.length ? (
                          <Alert severity="success" sx={{ borderRadius: 2, mb: 1.5, fontSize: '0.78rem' }}>
                            Enough slots to cover all waiting candidates. Ready to release.
                          </Alert>
                        ) : (
                          <Alert severity="warning" sx={{ borderRadius: 2, mb: 1.5, fontSize: '0.78rem' }}>
                            Shortage: {reschData.waiting.length - reschData.held_slots.length} more slot(s) needed. You can release what you have or wait for more.
                          </Alert>
                        )}
                        <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2.5, border: `1px solid ${C.gray200}`, mb: 2.5 }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow sx={{ bgcolor: C.gray50 }}>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', color: C.gray500 }}>Interviewer</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', color: C.gray500 }}>Date</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', color: C.gray500 }}>Time</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', color: C.gray500 }}>Duration</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', color: C.gray500 }}>Status</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {reschData.held_slots.map((sl) => (
                                <TableRow key={sl.slot_id} hover>
                                  <TableCell sx={{ fontSize: '0.82rem', fontWeight: 600, color: C.pri }}>{sl.interviewer_name}</TableCell>
                                  <TableCell sx={{ fontSize: '0.78rem', color: C.gray600 }}>{sl.date}</TableCell>
                                  <TableCell sx={{ fontSize: '0.78rem', color: C.gray600 }}>{sl.time}</TableCell>
                                  <TableCell sx={{ fontSize: '0.78rem', color: C.gray600 }}>{sl.duration_mins}m</TableCell>
                                  <TableCell>
                                    <Chip label="HELD" size="small" sx={{ height: 20, fontSize: '0.6rem', fontWeight: 700, bgcolor: C.amberBg, color: C.amberTxt }} />
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </>
                    )}

                    {/* ── Rebooked (success) ── */}
                    {reschData.rebooked.length > 0 && (
                      <>
                        <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: C.greenTxt, mb: 1, mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CheckCircle sx={{ fontSize: 16 }} /> Rebooked ({reschData.rebooked.length})
                        </Typography>
                        <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2.5, border: `1px solid ${C.gray200}` }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow sx={{ bgcolor: C.gray50 }}>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', color: C.gray500 }}>Candidate</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', color: C.gray500 }}>Reason</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', color: C.gray500 }}>Status</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {reschData.rebooked.map((rb) => (
                                <TableRow key={rb.booking_id} hover>
                                  <TableCell>
                                    <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: C.pri }}>{rb.candidate_name}</Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Chip size="small" label={rb.reschedule_type === 'INTERVIEWER_NO_SHOW' ? 'IV no-show' : 'Candidate request'}
                                      sx={{ height: 18, fontSize: '0.58rem', fontWeight: 600, bgcolor: C.gray100, color: C.gray600 }} />
                                  </TableCell>
                                  <TableCell>
                                    <Chip label="Rebooked" size="small" sx={{ height: 20, fontSize: '0.6rem', fontWeight: 700, bgcolor: C.greenBg, color: C.greenTxt }} />
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </>
                    )}

                    {/* ── Refresh button ── */}
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                      <Button size="small" startIcon={<Refresh sx={{ fontSize: 14 }} />}
                        onClick={loadReschTab} disabled={reschLoading}
                        sx={{ textTransform: 'none', fontSize: '0.75rem', color: C.gray500 }}>
                        Refresh
                      </Button>
                    </Box>
                  </>
                );
              })()}

            </Box>
          </>
        );
      })()}


      {/* ═══════════════════════════════════════════════════════ */}
      {/*  CREATE RELEASE DIALOG — UNCHANGED                     */}
      {/* ═══════════════════════════════════════════════════════ */}
      <Dialog open={!!releaseDialog} onClose={() => { setReleaseDialog(null); setIsReRelease(false); }} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {isReRelease ? 'Re-release Schedule' : 'Release Schedule'}
          <IconButton onClick={() => { setReleaseDialog(null); setIsReRelease(false); }}><Close /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {releaseDialog && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              {isReRelease ? (
                <Alert severity="warning" sx={{ borderRadius: 2 }}>
                  Re-releasing for <strong>{releaseDialog.job_title}</strong> — Round {releaseDialog.round_order}: {releaseDialog.round_name}.
                  {' '}<strong>{releaseDialog.unbooked_count}</strong> new candidate(s) were added since the last release.
                  The previous release will be closed and a fresh one created so interviewers can submit new slots.
                </Alert>
              ) : (
                <Alert severity="info" sx={{ borderRadius: 2 }}>
                  Releasing for <strong>{releaseDialog.job_title}</strong> — Round {releaseDialog.round_order}: {releaseDialog.round_name}.
                  {' '}{releaseDialog.ready_count} candidate(s) are ready to book.
                </Alert>
              )}
              <TextField select label="Interview Level" value={selLevel} onChange={(e) => setSelLevel(e.target.value)} size="small">
                {(INTERVIEW_LEVELS || [{ value: 'L2', label: 'L2' }]).map((l) => (
                  <MenuItem key={l.value || l} value={l.value || l}>{l.label || l}</MenuItem>
                ))}
              </TextField>
              <FormControlLabel
                control={<Switch checked={auditOn} onChange={(e) => setAuditOn(e.target.checked)} />}
                label={auditOn ? 'Audit ON — IAEM signals and scoring will run after interviews' : 'Audit OFF — interviews without IAEM evaluation'} />
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <TextField label="Deadline Date" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} size="small" slotProps={{ inputLabel: { shrink: true } }} sx={{ flex: 1 }} />
                <TextField label="Deadline Time" type="time" value={deadlineTime} onChange={(e) => setDeadlineTime(e.target.value)} size="small" slotProps={{ inputLabel: { shrink: true } }} sx={{ flex: 1 }} />
              </Box>
              <Typography variant="caption" sx={{ color: '#999', mt: -1.5 }}>Deadline for interviewers to submit their available slots</Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 1 }}>Interview Window</Typography>
              <Typography variant="caption" sx={{ color: '#999', mt: -0.5 }}>Interviews must happen within this date/time range. Interviewers can only submit slots inside this window.</Typography>
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <TextField label="Start Date" type="date" value={interviewStartDate} onChange={(e) => setInterviewStartDate(e.target.value)} size="small" slotProps={{ inputLabel: { shrink: true } }} sx={{ flex: 1 }} />
                <TextField label="Start Time" type="time" value={interviewStartTime} onChange={(e) => setInterviewStartTime(e.target.value)} size="small" slotProps={{ inputLabel: { shrink: true } }} sx={{ flex: 1 }} />
              </Box>
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <TextField label="End Date" type="date" value={interviewEndDate} onChange={(e) => setInterviewEndDate(e.target.value)} size="small" slotProps={{ inputLabel: { shrink: true } }} sx={{ flex: 1 }} />
                <TextField label="End Time" type="time" value={interviewEndTime} onChange={(e) => setInterviewEndTime(e.target.value)} size="small" slotProps={{ inputLabel: { shrink: true } }} sx={{ flex: 1 }} />
              </Box>
              <TextField label="Duration (minutes)" type="number" value={durationMins} onChange={(e) => setDurationMins(e.target.value)} size="small" />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setReleaseDialog(null); setIsReRelease(false); }}>Cancel</Button>
          <Button variant="contained" color={isReRelease ? 'warning' : 'primary'} onClick={handleCreateRelease}
            disabled={creating || !deadline || !interviewStartDate || !interviewEndDate}>
            {creating ? 'Releasing…' : (isReRelease ? 'Re-release Schedule' : 'Release to Interviewers')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════ */}
      {/*  PARTICIPANTS DIALOG — UNCHANGED (with no-show btns)   */}
      {/* ═══════════════════════════════════════════════════════ */}
      <Dialog open={!!participantDialog} onClose={() => setParticipantDialog(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Round Participants — {participantDialog?.job_title}
          <IconButton onClick={() => setParticipantDialog(null)}><Close /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {participantLoading ? (
            <Box sx={{ p: 3 }}><LinearProgress /><Typography sx={{ mt: 2, textAlign: 'center' }}>Loading participants…</Typography></Box>
          ) : participants.length === 0 ? (
            <Alert severity="info">No candidates assigned to this round yet.</Alert>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Candidate</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Booking</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {participants.map((p) => (
                    <TableRow key={p.candidate_id}>
                      <TableCell>{p.candidate_name}</TableCell>
                      <TableCell>{p.email}</TableCell>
                      <TableCell>
                        <Chip label={p.si_status} size="small" variant="outlined"
                          color={p.si_status === 'completed' ? 'success' : p.si_status === 'invited' ? 'primary' : 'default'} />
                      </TableCell>
                      <TableCell>
                        {p.has_booking ? (
                          <Box>
                            <Chip icon={<CheckCircle />} label={`${p.booking.booked_date} at ${p.booking.booked_time}`}
                              size="small" color="success" variant="outlined" />
                            {p.booking.status && p.booking.status !== 'CONFIRMED' && (
                              <Chip label={p.booking.status.replace(/_/g, ' ')} size="small"
                                sx={{ ml: 0.5, fontSize: '0.6rem', height: 18,
                                  bgcolor: p.booking.status.includes('NO_SHOW') ? C.redBg : C.gray100,
                                  color: p.booking.status.includes('NO_SHOW') ? '#991B1B' : C.gray600 }} />
                            )}
                          </Box>
                        ) : (
                          <Typography variant="caption" sx={{ color: '#999' }}>Not booked</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {p.has_booking && p.booking.booking_pk && (!p.booking.status || p.booking.status === 'CONFIRMED') && (
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            <Button size="small" variant="outlined"
                              onClick={async () => {
                                if (!confirm('Mark this candidate as no-show?')) return;
                                try { await hrSchedulingService.updateBookingStatus(p.booking.booking_pk, 'NO_SHOW_CAND'); openParticipants(participantDialog); load(); }
                                catch (e) { alert(e?.response?.data?.detail || 'Failed'); }
                              }}
                              sx={{ textTransform: 'none', fontSize: '0.6rem', color: C.red, borderColor: C.red, height: 24, px: 1 }}>
                              Cand no-show
                            </Button>
                            <Button size="small" variant="outlined"
                              onClick={async () => {
                                if (!confirm('Mark interviewer as no-show?')) return;
                                try { await hrSchedulingService.updateBookingStatus(p.booking.booking_pk, 'NO_SHOW_IV'); openParticipants(participantDialog); load(); }
                                catch (e) { alert(e?.response?.data?.detail || 'Failed'); }
                              }}
                              sx={{ textTransform: 'none', fontSize: '0.6rem', color: C.red, borderColor: C.red, height: 24, px: 1 }}>
                              IV no-show
                            </Button>
                          </Box>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════ */}
      {/*  SUPPLY REVIEW DIALOG — UNCHANGED                      */}
      {/* ═══════════════════════════════════════════════════════ */}
      <Dialog open={!!supplyReviewDialog} onClose={() => { setSupplyReviewDialog(null); setSupplyReview(null); }} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Slot Supply Review
          <IconButton onClick={() => { setSupplyReviewDialog(null); setSupplyReview(null); }}><Close /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {supplyLoading ? (
            <Box sx={{ p: 3 }}><LinearProgress /><Typography sx={{ mt: 2, textAlign: 'center' }}>Loading supply data…</Typography></Box>
          ) : supplyReview ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{supplyReview.job_title}</Typography>
              {supplyReview.interview_start && (
                <Alert severity="info" icon={<Schedule />} sx={{ borderRadius: 2 }}>
                  Interview window: {fmtDeadline(supplyReview.interview_start)} → {fmtDeadline(supplyReview.interview_end)}
                </Alert>
              )}
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Paper elevation={0} sx={{ p: 2, bgcolor: C.indigoBg, borderRadius: 2, textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: C.pri }}>{supplyReview.candidates_need_slots}</Typography>
                  <Typography variant="caption" sx={{ color: C.gray600 }}>Candidates need slots</Typography>
                </Paper>
                <Paper elevation={0} sx={{ p: 2, bgcolor: C.greenBg, borderRadius: 2, textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: C.greenTxt }}>{supplyReview.slots_open}</Typography>
                  <Typography variant="caption" sx={{ color: C.gray600 }}>Open slots available</Typography>
                </Paper>
                <Paper elevation={0} sx={{ p: 2, bgcolor: C.gray50, borderRadius: 2, textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: C.gray700 }}>{supplyReview.interviewers_submitted}</Typography>
                  <Typography variant="caption" sx={{ color: C.gray600 }}>Interviewers submitted</Typography>
                </Paper>
                <Paper elevation={0} sx={{ p: 2, bgcolor: C.gray50, borderRadius: 2, textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: C.gray700 }}>{supplyReview.slots_booked}</Typography>
                  <Typography variant="caption" sx={{ color: C.gray600 }}>Already booked</Typography>
                </Paper>
              </Box>
              {supplyReview.has_enough_slots ? (
                <Alert severity="success" sx={{ borderRadius: 2 }}>Enough slots to cover all candidates. Ready to release.</Alert>
              ) : (
                <Alert severity="warning" sx={{ borderRadius: 2 }}>
                  Shortage of <strong>{supplyReview.shortage}</strong> slot(s). You may want to wait for more interviewers to submit slots, or release anyway.
                </Alert>
              )}
              {supplyReview.slots_released_to_candidates && (
                <Alert severity="info" sx={{ borderRadius: 2 }}>Slots are already released to candidates.</Alert>
              )}
            </Box>
          ) : (
            <Alert severity="error">Failed to load supply data.</Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { setSupplyReviewDialog(null); setSupplyReview(null); }}>Close</Button>
          {supplyReview && !supplyReview.slots_released_to_candidates && (
            <Button variant="contained" onClick={handleReleaseToCandidates} disabled={releasing || supplyReview.slots_open === 0}
              sx={{ bgcolor: C.green, '&:hover': { bgcolor: '#059669' } }}>
              {releasing ? 'Releasing…' : 'Release Slots to Candidates'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════ */}
      {/*  DEACTIVATE RELEASE DIALOG — UNCHANGED                 */}
      {/* ═══════════════════════════════════════════════════════ */}
      <Dialog open={!!deactivateDialog} onClose={() => { setDeactivateDialog(null); setDeactivateReason(''); }} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Deactivate Release
          <IconButton onClick={() => { setDeactivateDialog(null); setDeactivateReason(''); }}><Close /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {deactivateDialog && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <Alert severity="warning" sx={{ borderRadius: 2 }}>
                Deactivating <strong>{deactivateDialog.release_id}</strong> will prevent interviewers from submitting new slots for this release. Existing bookings are not affected.
              </Alert>
              <TextField label="Reason" multiline minRows={2} size="small" fullWidth
                value={deactivateReason} onChange={(e) => setDeactivateReason(e.target.value)}
                placeholder="e.g. Round removed from pipeline, position filled, etc." />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDeactivateDialog(null); setDeactivateReason(''); }}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeactivateRelease}
            disabled={deactivating || !deactivateReason.trim()}>
            {deactivating ? 'Deactivating…' : 'Deactivate Release'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/*  RESCHEDULE — APPROVE CONFIRM DIALOG                              */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Dialog open={!!reschApproveDialog} onClose={() => setReschApproveDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Approve Reschedule
          <IconButton onClick={() => setReschApproveDialog(null)}><Close /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Alert severity="warning" icon={<CheckCircle />} sx={{ borderRadius: 2 }}>
            Approve reschedule for <strong>{reschApproveDialog?.candidateName}</strong>?
            The old booking will be cleaned up and the candidate will be moved to the waiting list.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setReschApproveDialog(null)}>Cancel</Button>
          <Button variant="contained" disableElevation disabled={reschActing}
            onClick={() => {
              const rInfo = grouped.flatMap(g2 => g2.rounds).find(r2 => r2.has_release && r2.release);
              const rNum = rInfo?.release?.release_id ? parseInt(String(rInfo.release.release_id).replace(/\D/g, ''), 10) : null;
              const doApprove = async () => {
                setReschActing(true);
                try {
                  await hrSchedulingService.approveReschedule(reschApproveDialog.bookingId);
                  setReschApproveDialog(null);
                  if (rNum) {
                    setReschLoading(true);
                    try { const res = await hrSchedulingService.getRescheduleTabData(rNum); setReschData(res?.data || null); }
                    catch (e2) { console.error(e2); }
                    finally { setReschLoading(false); }
                  }
                  load();
                } catch (e) { alert(e?.response?.data?.detail || 'Approve failed'); }
                finally { setReschActing(false); }
              };
              doApprove();
            }}
            sx={{ bgcolor: C.green, '&:hover': { bgcolor: '#059669' } }}>
            {reschActing ? 'Approving…' : 'Approve'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/*  RESCHEDULE — REJECT CONFIRM DIALOG                               */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Dialog open={!!reschRejectDialog} onClose={() => setReschRejectDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Reject Reschedule
          <IconButton onClick={() => setReschRejectDialog(null)}><Close /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Alert severity="error" sx={{ borderRadius: 2 }}>
            Reject the reschedule request from <strong>{reschRejectDialog?.candidateName}</strong>?
            The booking will be restored to its previous state.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setReschRejectDialog(null)}>Cancel</Button>
          <Button variant="contained" color="error" disableElevation disabled={reschActing}
            onClick={() => {
              const rInfo3 = grouped.flatMap(g3 => g3.rounds).find(r3 => r3.has_release && r3.release);
              const rNum3 = rInfo3?.release?.release_id ? parseInt(String(rInfo3.release.release_id).replace(/\D/g, ''), 10) : null;
              const doReject = async () => {
                setReschActing(true);
                try {
                  await hrSchedulingService.rejectReschedule(reschRejectDialog.bookingId);
                  setReschRejectDialog(null);
                  if (rNum3) {
                    setReschLoading(true);
                    try { const res = await hrSchedulingService.getRescheduleTabData(rNum3); setReschData(res?.data || null); }
                    catch (e2) { console.error(e2); }
                    finally { setReschLoading(false); }
                  }
                  load();
                } catch (e) { alert(e?.response?.data?.detail || 'Reject failed'); }
                finally { setReschActing(false); }
              };
              doReject();
            }}>
            {reschActing ? 'Rejecting…' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/*  RESCHEDULE — REQUEST SLOTS CONFIG DIALOG                         */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Dialog open={reschRequestSlotsDialog} onClose={() => setReschRequestSlotsDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Request Slots for Reschedule
          <IconButton onClick={() => setReschRequestSlotsDialog(false)}><Close /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              Configure the schedule for reschedule slots. All matched interviewers will be notified to submit their availability within this window.
              {reschData?.waiting?.length > 0 && (
                <> <strong>{reschData.waiting.length}</strong> candidate(s) are waiting to rebook.</>
              )}
            </Alert>
            <TextField select label="Interview Level" value={reschCfgLevel} onChange={(e) => setReschCfgLevel(e.target.value)} size="small">
              {(INTERVIEW_LEVELS || [{ value: 'L2', label: 'L2' }]).map((l) => (
                <MenuItem key={l.value || l} value={l.value || l}>{l.label || l}</MenuItem>
              ))}
            </TextField>
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <TextField label="Deadline Date" type="date" value={reschCfgDeadline} onChange={(e) => setReschCfgDeadline(e.target.value)} size="small" slotProps={{ inputLabel: { shrink: true } }} sx={{ flex: 1 }} />
              <TextField label="Deadline Time" type="time" value={reschCfgDeadlineTime} onChange={(e) => setReschCfgDeadlineTime(e.target.value)} size="small" slotProps={{ inputLabel: { shrink: true } }} sx={{ flex: 1 }} />
            </Box>
            <Typography variant="caption" sx={{ color: '#999', mt: -1.5 }}>Deadline for interviewers to submit their available slots</Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 1, color: C.pri }}>Interview Window</Typography>
            <Typography variant="caption" sx={{ color: '#999', mt: -0.5 }}>Interviews must happen within this date/time range. Interviewers can only submit slots inside this window.</Typography>
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <TextField label="Start Date" type="date" value={reschCfgStartDate} onChange={(e) => setReschCfgStartDate(e.target.value)} size="small" slotProps={{ inputLabel: { shrink: true } }} sx={{ flex: 1 }} />
              <TextField label="Start Time" type="time" value={reschCfgStartTime} onChange={(e) => setReschCfgStartTime(e.target.value)} size="small" slotProps={{ inputLabel: { shrink: true } }} sx={{ flex: 1 }} />
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <TextField label="End Date" type="date" value={reschCfgEndDate} onChange={(e) => setReschCfgEndDate(e.target.value)} size="small" slotProps={{ inputLabel: { shrink: true } }} sx={{ flex: 1 }} />
              <TextField label="End Time" type="time" value={reschCfgEndTime} onChange={(e) => setReschCfgEndTime(e.target.value)} size="small" slotProps={{ inputLabel: { shrink: true } }} sx={{ flex: 1 }} />
            </Box>
            <TextField label="Duration (minutes)" type="number" value={reschCfgDuration} onChange={(e) => setReschCfgDuration(e.target.value)} size="small" />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setReschRequestSlotsDialog(false)}>Cancel</Button>
          <Button variant="contained" disableElevation disabled={reschActing || !reschCfgDeadline || !reschCfgStartDate || !reschCfgEndDate}
            onClick={() => {
              const rInfo4 = grouped.flatMap(g4 => g4.rounds).find(r4 => r4.has_release && r4.release);
              const rNum4 = rInfo4?.release?.release_id ? parseInt(String(rInfo4.release.release_id).replace(/\D/g, ''), 10) : null;
              if (!rNum4) return;
              const doRequest = async () => {
                setReschActing(true);
                try {
                  const payload = {
                    slot_deadline: `${reschCfgDeadline}T${reschCfgDeadlineTime || '18:00'}`,
                    interview_start: `${reschCfgStartDate}T${reschCfgStartTime || '09:00'}`,
                    interview_end: `${reschCfgEndDate}T${reschCfgEndTime || '18:00'}`,
                    duration_mins: reschCfgDuration || 45,
                    level: reschCfgLevel || '',
                  };
                  const res = await hrSchedulingService.requestRescheduleSlots(rNum4, payload);
                  setReschRequestSlotsDialog(false);
                  setNotifyInfoDialog({ open: true, count: res?.data?.interviewers_notified || 0 });
                  setReschLoading(true);
                  try { const tabRes = await hrSchedulingService.getRescheduleTabData(rNum4); setReschData(tabRes?.data || null); }
                  catch (e2) { console.error(e2); }
                  finally { setReschLoading(false); }
                } catch (e) { alert(e?.response?.data?.detail || 'Failed to request slots'); }
                finally { setReschActing(false); }
              };
              doRequest();
            }}
            sx={{ bgcolor: C.amber, '&:hover': { bgcolor: '#D97706' } }}>
            {reschActing ? 'Requesting…' : 'Release to Interviewers'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/*  RESCHEDULE — RELEASE SLOTS TO CANDIDATES CONFIRM DIALOG          */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Dialog open={reschReleaseSlotsDialog} onClose={() => setReschReleaseSlotsDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Release Slots to Candidates
          <IconButton onClick={() => setReschReleaseSlotsDialog(false)}><Close /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {reschData && (
              <>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <Paper elevation={0} sx={{ p: 2, bgcolor: C.redBg, borderRadius: 2, textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: C.redTxt }}>{reschData.waiting?.length || 0}</Typography>
                    <Typography variant="caption" sx={{ color: C.gray600 }}>Candidates waiting</Typography>
                  </Paper>
                  <Paper elevation={0} sx={{ p: 2, bgcolor: C.indigoBg, borderRadius: 2, textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: C.pri }}>{reschData.held_slots?.length || 0}</Typography>
                    <Typography variant="caption" sx={{ color: C.gray600 }}>Held slots to release</Typography>
                  </Paper>
                </Box>
                {(reschData.held_slots?.length || 0) >= (reschData.waiting?.length || 0) ? (
                  <Alert severity="success" sx={{ borderRadius: 2 }}>
                    Enough held slots to cover all waiting candidates. Ready to release.
                  </Alert>
                ) : (
                  <Alert severity="warning" sx={{ borderRadius: 2 }}>
                    Shortage: {(reschData.waiting?.length || 0) - (reschData.held_slots?.length || 0)} more slot(s) needed. You can release what you have or wait for more.
                  </Alert>
                )}
                <Alert severity="info" sx={{ borderRadius: 2 }}>
                  All held slots will be opened and waiting candidates will be notified to book their new interview.
                </Alert>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setReschReleaseSlotsDialog(false)}>Cancel</Button>
          <Button variant="contained" disableElevation disabled={reschActing}
            onClick={() => {
              const rInfo5 = grouped.flatMap(g5 => g5.rounds).find(r5 => r5.has_release && r5.release);
              const rNum5 = rInfo5?.release?.release_id ? parseInt(String(rInfo5.release.release_id).replace(/\D/g, ''), 10) : null;
              if (!rNum5) return;
              const doRelease = async () => {
                setReschActing(true);
                try {
                  const res = await hrSchedulingService.releaseRescheduleSlots(rNum5);
                  setReschReleaseSlotsDialog(false);
                  setReleaseSlotsInfoDialog({ open: true, slots: res?.data?.slots_released || 0, candidates: res?.data?.candidates_notified || 0 });
                  setReschLoading(true);
                  try { const tabRes = await hrSchedulingService.getRescheduleTabData(rNum5); setReschData(tabRes?.data || null); }
                  catch (e2) { console.error(e2); }
                  finally { setReschLoading(false); }
                  load();
                } catch (e) { alert(e?.response?.data?.detail || 'Failed to release slots'); }
                finally { setReschActing(false); }
              };
              doRelease();
            }}
            sx={{ bgcolor: C.green, '&:hover': { bgcolor: '#059669' } }}>
            {reschActing ? 'Releasing…' : 'Release Slots to Candidates'}
          </Button>
        </DialogActions>
      </Dialog>

            {/* ── Release slots to candidates success dialog (replaces window.alert) ── */}
      <Dialog
        open={releaseSlotsInfoDialog.open}
        onClose={() => setReleaseSlotsInfoDialog({ open: false, slots: 0, candidates: 0 })}
        PaperProps={{ sx: { borderRadius: 3, minWidth: 380, maxWidth: 460 } }}
      >
        <Box sx={{
          background: `linear-gradient(135deg, ${C.pri} 0%, ${C.priHover} 100%)`,
          px: 3, py: 2.25,
        }}>
          <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '1.05rem' }}>
            Slots released to candidates
          </Typography>
          <Typography sx={{ color: C.sageLt, fontSize: '0.78rem', mt: 0.3 }}>
            Candidates have been emailed to book their new interview time
          </Typography>
        </Box>
        <DialogContent sx={{ pt: 2.5, pb: 1.5, px: 3 }}>
          <Box sx={{ display: 'flex', gap: 1.25, mb: 1 }}>
            <Box sx={{
              flex: 1, borderRadius: 2, p: 1.75, textAlign: 'center',
              bgcolor: C.sageLt, border: `1px solid ${C.sage}44`,
            }}>
              <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, color: C.pri, lineHeight: 1.1 }}>
                {releaseSlotsInfoDialog.slots}
              </Typography>
              <Typography sx={{ fontSize: '0.72rem', color: C.gray600, fontWeight: 600, mt: 0.25 }}>
                Slot{releaseSlotsInfoDialog.slots === 1 ? '' : 's'} released
              </Typography>
            </Box>
            <Box sx={{
              flex: 1, borderRadius: 2, p: 1.75, textAlign: 'center',
              bgcolor: C.greenBg, border: `1px solid ${C.green}44`,
            }}>
              <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, color: C.greenTxt, lineHeight: 1.1 }}>
                {releaseSlotsInfoDialog.candidates}
              </Typography>
              <Typography sx={{ fontSize: '0.72rem', color: C.gray600, fontWeight: 600, mt: 0.25 }}>
                Candidate{releaseSlotsInfoDialog.candidates === 1 ? '' : 's'} notified
              </Typography>
            </Box>
          </Box>
          <Typography sx={{ fontSize: '0.78rem', color: C.gray500, lineHeight: 1.5, mt: 1.25 }}>
            {releaseSlotsInfoDialog.candidates === 0
              ? 'The slots are live but no candidates were emailed. Check the Waiting to Rebook list.'
              : 'Candidates will pick a slot from the ones you released and their new interview will be booked automatically.'}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.25 }}>
          <Button
            onClick={() => setReleaseSlotsInfoDialog({ open: false, slots: 0, candidates: 0 })}
            variant="contained"
            sx={{
              textTransform: 'none', fontWeight: 700,
              bgcolor: C.pri, color: '#fff',
              '&:hover': { bgcolor: C.priHover },
              borderRadius: 2, px: 3.5,
            }}
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Notify interviewers success dialog (replaces window.alert) ── */}
      <Dialog
        open={notifyInfoDialog.open}
        onClose={() => setNotifyInfoDialog({ open: false, count: 0 })}
        PaperProps={{ sx: { borderRadius: 3, minWidth: 380, maxWidth: 440 } }}
      >
        <Box sx={{
          background: `linear-gradient(135deg, ${C.pri} 0%, ${C.priHover} 100%)`,
          px: 3, py: 2.25,
        }}>
          <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '1.05rem' }}>
            Slot requests sent
          </Typography>
          <Typography sx={{ color: C.sageLt, fontSize: '0.78rem', mt: 0.3 }}>
            Interviewers have been notified to submit their availability
          </Typography>
        </Box>
        <DialogContent sx={{ pt: 2.5, pb: 1.5, px: 3 }}>
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: 1.75, mb: 1.5,
            p: 2, borderRadius: 2,
            bgcolor: C.sageLt, border: `1px solid ${C.sage}44`,
          }}>
            <Box sx={{
              width: 44, height: 44, borderRadius: '50%',
              bgcolor: C.pri, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: '1.05rem', flexShrink: 0,
            }}>
              {notifyInfoDialog.count}
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: C.pri }}>
                {notifyInfoDialog.count === 1 ? 'Interviewer notified' : 'Interviewers notified'}
              </Typography>
              <Typography sx={{ fontSize: '0.78rem', color: C.gray600, lineHeight: 1.5, mt: 0.25 }}>
                {notifyInfoDialog.count === 0
                  ? "No matching interviewers were available. Try widening the interview level or window."
                  : "They'll receive an email asking them to submit slots within your window."}
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.25 }}>
          <Button
            onClick={() => setNotifyInfoDialog({ open: false, count: 0 })}
            variant="contained"
            sx={{
              textTransform: 'none', fontWeight: 700,
              bgcolor: C.pri, color: '#fff',
              '&:hover': { bgcolor: C.priHover },
              borderRadius: 2, px: 3.5,
            }}
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Release success snackbar ── */}
      <Snackbar
        open={!!releaseSnackbar}
        autoHideDuration={4000}
        onClose={() => setReleaseSnackbar(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setReleaseSnackbar(null)} severity="success" variant="filled" sx={{ width: '100%', borderRadius: 2 }}>
          {releaseSnackbar}
        </Alert>
      </Snackbar>
    </Box>
    </ThemeProvider>
  );
};

export default IAEMScheduling;