

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  Box, Typography, Card, CardContent, LinearProgress,
  Chip, Button, Skeleton, Avatar, IconButton, Tooltip, CircularProgress,
  useMediaQuery,
} from '@mui/material';
import {
  Work, People, CheckCircle, ArrowForward,
  TrendingUp, EventAvailable,
  InboxOutlined, Add, Refresh,
} from '@mui/icons-material';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  PieChart, Pie, Cell, RadialBarChart, RadialBar, PolarAngleAxis,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import employerService from '@/services/api/employer/employerService';
import interviewRoundService from '@/services/api/employer/interviewRound';
import { formatDate, getInitials } from '@/utils/formatters';


const T = {
  sage:       '#7F9E7E',
  sageText:   '#5E815D',
  sageDark:   '#6C8B6B',
  sageSoft:   '#EDF3EC',
  pine:       '#022124',
  pine2:      '#24433E',
  cream:      '#F6F8F3',
  ink:        '#101210',
  body:       '#2F332E',
  muted:      '#55584F',
  faint:      '#7A7E76',
  line:       '#E7EAE3',
  lineSoft:   '#F0F2ED',
  surface:    '#FFFFFF',
};

const FONT = "'Jost','DM Sans',sans-serif";

/* ── Shared card styles — identical to CompanyDashboard ──────────────── */
const CARD_SX = {
  bgcolor:      T.surface,
  border:       `1px solid ${T.line}`,
  borderRadius: '14px',
  boxShadow:    'none',
};

const HOVER_LIFT_SX = {
  transition: 'transform 0.25s cubic-bezier(0.22,1,0.36,1), box-shadow 0.25s ease',
  cursor: 'pointer',
  '&:hover': {
    transform: 'translateY(-3px)',
    boxShadow: '0 8px 24px rgba(2,33,36,0.08)',
  },
  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none',
    '&:hover': { transform: 'none' },
  },
};

const ANIMATIONS = {
  '@keyframes fadeUp': {
    '0%':   { opacity: 0, transform: 'translateY(12px)' },
    '100%': { opacity: 1, transform: 'translateY(0)' },
  },
  '@keyframes popIn': {
    '0%':   { opacity: 0, transform: 'scale(0.4) rotate(-30deg)' },
    '60%':  { opacity: 1, transform: 'scale(1.15) rotate(8deg)' },
    '100%': { opacity: 1, transform: 'scale(1) rotate(0deg)' },
  },
  '@keyframes livePulse': {
    '0%, 100%': { opacity: 1, transform: 'scale(1)' },
    '50%':      { opacity: 0.5, transform: 'scale(1.6)' },
  },
};

/* ── Job status palette — sage/pine mapped ───────────────────────────── */
const JOB_STATUS_STYLE = {
  LIVE:   { bgcolor: '#EAF2E9', color: '#3E6E3E', border: '1px solid rgba(62,110,62,0.25)' },
  CLOSED: { bgcolor: '#FBECEA', color: '#B4462F', border: '1px solid rgba(180,70,47,0.25)' },
  DRAFT:  { bgcolor: '#E8EFEF', color: T.faint,   border: `1px solid ${T.line}` },
  PAUSED: { bgcolor: '#F6ECDF', color: '#A35A2D', border: '1px solid rgba(163,90,45,0.25)' },
};

/* ── Registered employer routes (see AppRouter / Sidebar) ────────────── */
const NAV = {
  postJob:       '/employer/my-jobs',
  myJobs:        '/employer/my-jobs',
  candidates:    '/employer/candidates',
  interviews:    '/employer/live-interview',
  finalHire:     '/employer/final-hire',
  liveInterview: '/employer/live-interview',
  applicants:    (id) => `/employer/my-jobs/${id}/applicants`,
};

const REFRESH_INTERVAL_MS  = 30000;
const MONTHLY_HIRE_TARGET  = 5;

const buildFallbackData = () => ({
  active_jobs: 4, total_applicants: 21, interviews_today: 2, hired_this_month: 0,
  recent_jobs: [
    { id: 1, title: 'Cyber Security',  status: 'LIVE',  applicants: 3, created_at: new Date().toISOString() },
    { id: 2, title: 'Data Scientist',  status: 'LIVE',  applicants: 3, created_at: new Date(Date.now() - 86400000 * 6).toISOString() },
    { id: 3, title: 'DevOps Engineer', status: 'DRAFT', applicants: 5, created_at: new Date(Date.now() - 86400000 * 6).toISOString() },
  ],
  funnel: { applied: 21, ai_passed: 16, shortlisted: 16 },
  applicants_trend: [],
  interviews_today_list: [],
});

const pct = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : 0);


const GRACE_MS = 5 * 60 * 1000;   // 5-min grace after scheduled end

const isTodayIST = (dateStr) => {
  if (!dateStr) return false;
  const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const todayStr = [
    nowIST.getFullYear(),
    String(nowIST.getMonth() + 1).padStart(2, '0'),
    String(nowIST.getDate()).padStart(2, '0'),
  ].join('-');
  return String(dateStr).slice(0, 10) === todayStr;
};

/* Parse date+time as IST wall-clock (mirrors OnlineInterview's parseSchedIST) */
const parseSchedIST = (iv) => {
  const dateStr = iv?.date ? String(iv.date).slice(0, 10) : '';
  const timeStr = iv?.time ? String(iv.time).slice(0, 8) : '00:00:00';
  if (!dateStr) return NaN;
  const ms = new Date(`${dateStr}T${timeStr}+05:30`).getTime();
  return isNaN(ms) ? NaN : ms;
};

/* Exact same expiry logic as OnlineInterview.jsx */
const isExpiredIv = (iv) => {
  if (!iv?.date) return false;
  if (['completed', 'cancelled', 'live', 'in_progress'].includes(iv.status)) return false;
  if (['no_attempt', 'expired', 'partial'].includes(iv.status)) return true;
  const start = parseSchedIST(iv);
  if (isNaN(start)) return false;
  return Date.now() > start + (Number(iv.duration) || 60) * 60 * 1000 + GRACE_MS;
};

/* Derive effective status — mirrors OnlineInterview's LiveCard logic */
const getEffectiveStatus = (iv) => {
  if (isExpiredIv(iv)) return 'expired';
  if (iv.status === 'live' || iv.status === 'in_progress') return 'live';
  if (iv.status === 'completed') return 'completed';
  if (iv.status === 'cancelled') return 'cancelled';
  return 'upcoming';
};

/* Status visual styles for the dashboard card — same palette as Live tab */
const IV_STATUS = {
  upcoming:  { label: 'Upcoming',  bg: '#E8EFEF',  color: T.pine,    dot: T.pine },
  live:      { label: 'Live',      bg: '#EAF2E9',  color: '#3E6E3E', dot: '#3E6E3E' },
  completed: { label: 'Completed', bg: '#EAF2E9',  color: '#3E6E3E', dot: '#3E6E3E' },
  expired:   { label: 'Expired',   bg: '#FAEAE8',  color: '#A63D2F', dot: '#A63D2F' },
  cancelled: { label: 'Cancelled', bg: '#F0F2ED',  color: T.faint,   dot: T.faint },
};

/* Time-badge background per status */
const TIME_BG = {
  upcoming:  T.sageSoft,
  live:      '#EAF2E9',
  completed: '#F0F2ED',
  expired:   '#FAEAE8',
  cancelled: '#F0F2ED',
};

const liveIvToDashboardShape = (iv) => {
  const dateStr = iv.date ? String(iv.date).slice(0, 10) : '';
  const timeStr = iv.time ? String(iv.time).slice(0, 8) : '00:00:00';
  const scheduled_at = dateStr ? `${dateStr}T${timeStr}+05:30` : null;

  const c = iv.candidate;
  const candidate_name = c
    ? (c.full_name || c.name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.email || 'Candidate')
    : 'Candidate';

  return {
    id:             iv.id,
    scheduled_at,
    candidate_name,
    job_title:      iv.position || '',
    round_no:       iv.round_number ?? iv.round_no ?? null,
    round_type:     'Live Video',
    meeting_url:    iv.meeting_link || null,
    status:         iv.status || 'upcoming',
    duration:       iv.duration || 60,
    date:           iv.date || null,
    time:           iv.time || null,
    _source:        'live',
  };
};

/* ── SectionHeading — sage accent bar (EXACT copy from CompanyDashboard) */
const SectionHeading = ({ title, subtitle, action, sx }) => (
  <Box sx={{
    display: 'flex', justifyContent: 'space-between',
    alignItems: subtitle ? 'flex-start' : 'center',
    gap: 1.5, ...sx,
  }}>
    <Box sx={{ display: 'flex', alignItems: 'stretch', gap: 1.25, minWidth: 0, flex: 1 }}>
      <Box sx={{
        width: 4, bgcolor: T.sage, borderRadius: '2px',
        alignSelf: 'stretch', minHeight: { xs: 20, sm: 24 }, flexShrink: 0,
      }} />
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{
          fontWeight: 800, fontFamily: FONT,
          fontSize: { xs: '0.95rem', sm: '1.05rem', md: '1.15rem' },
          color: T.ink, letterSpacing: '-0.01em', lineHeight: 1.2,
        }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' }, color: T.muted, mt: 0.4, fontFamily: FONT }}>
            {subtitle}
          </Typography>
        )}
      </Box>
    </Box>
    {action}
  </Box>
);

/* ── StatCard (EXACT copy from CompanyDashboard) ─────────────────────── */
const StatCard = ({ label, value, sub, icon, accent = T.sage, onClick }) => (
  <Card
    elevation={0}
    onClick={onClick}
    sx={{ ...CARD_SX, ...HOVER_LIFT_SX, height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}
  >
    <CardContent sx={{
      p: { xs: 2, sm: 2.25, md: 2.5 }, flex: 1,
      display: 'flex', flexDirection: 'column',
      '&:last-child': { pb: { xs: 2, sm: 2.25, md: 2.5 } },
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
        <Typography sx={{
          fontSize: { xs: '0.68rem', sm: '0.72rem', md: '0.75rem' },
          color: T.muted, fontWeight: 800, fontFamily: FONT,
          letterSpacing: '0.05em', textTransform: 'uppercase',
        }}>
          {label}
        </Typography>
        {icon && (
          <Box sx={{
            width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: '10px', bgcolor: T.sageSoft, color: accent,
            flexShrink: 0, '& svg': { fontSize: 18 },
          }}>
            {icon}
          </Box>
        )}
      </Box>
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'flex-start' }}>
        <Typography sx={{
          fontFamily: FONT, fontWeight: 800, color: T.ink, lineHeight: 1,
          letterSpacing: '-0.02em',
          fontSize: { xs: '1.75rem', sm: '2rem', md: '2.15rem' },
        }}>
          {value}
        </Typography>
      </Box>
      {sub && (
        <Typography sx={{
          mt: 1, fontSize: { xs: '0.7rem', sm: '0.72rem', md: '0.75rem' },
          color: T.muted, fontFamily: FONT, fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: 0.5,
        }}>
          {sub}
          {onClick && <ArrowForward sx={{ fontSize: 12, color: T.sageText }} />}
        </Typography>
      )}
    </CardContent>
  </Card>
);

/* ── ChartTooltip (EXACT copy from CompanyDashboard) ─────────────────── */
const ChartTooltip = ({ active, payload, label, suffix = '' }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <Box sx={{
      bgcolor: T.surface, border: `1px solid ${T.line}`, borderRadius: '10px',
      px: 1.25, py: 0.75, boxShadow: '0 6px 18px rgba(2,33,36,0.10)',
    }}>
      <Typography sx={{ fontSize: '0.72rem', color: T.faint, fontWeight: 600, fontFamily: FONT }}>{label}</Typography>
      <Typography sx={{ fontSize: '0.82rem', color: T.ink, fontWeight: 700, fontFamily: FONT }}>{payload[0].value}{suffix}</Typography>
    </Box>
  );
};

/* ═══════════════════════════════════════════════════════════════════════
   EmployerDashboard
   — identical visual system to CompanyDashboard, employer data
   ═══════════════════════════════════════════════════════════════════════ */
const EmployerDashboard = () => {
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const isXxs     = useMediaQuery('(max-width:240px)');

  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const mountedRef   = useRef(true);
  const inFlightRef  = useRef(false);
  const hasLoadedRef = useRef(false);
  const dataRef      = useRef(null);
  
  const loadDashboard = useCallback(async ({ background = false } = {}) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    if (!background) setLoading(true);
    else setRefreshing(true);

    try {
      // Fire both requests in parallel — neither blocks the other
      const [dashRes, liveRes] = await Promise.allSettled([
        employerService.getDashboard(),
        interviewRoundService.getLiveInterviews(),
      ]);

      if (!mountedRef.current) return;

      // ── Dashboard summary ──────────────────────────────────────────
      let dashData;
      if (dashRes.status === 'fulfilled') {
        dashData = dashRes.value.data;
      } else if (!hasLoadedRef.current) {
        dashData = buildFallbackData();
      } else if (background && dataRef.current) {
        dashData = { ...dataRef.current };
      }

      // ── Live interviews → today's list ─────────────────────────────
      if (liveRes.status === 'fulfilled') {
        const rawList = liveRes.value?.data?.results || liveRes.value?.data || [];
        const allLive = Array.isArray(rawList) ? rawList : [];

        // Filter to today (IST) + not cancelled
        const todayLive = allLive
          .filter((iv) => isTodayIST(iv.date) && iv.status !== 'cancelled')
          .map(liveIvToDashboardShape);

        // Merge with any dashboard-supplied list (deduplicate by id)
        const existing = Array.isArray(dashData?.interviews_today_list)
          ? dashData.interviews_today_list
          : [];
        const seenIds = new Set(todayLive.map((iv) => iv.id));
        const merged = [
          ...todayLive,
          ...existing.filter((iv) => !seenIds.has(iv.id)),
        ];

        if (dashData) {
          dashData = {
            ...dashData,
            interviews_today_list: merged,
            // Also update the numeric count to match the live data
            interviews_today: merged.length,
          };
        }
      }

      if (dashData) {
        dataRef.current = dashData;
        setData(dashData);
        hasLoadedRef.current = true;
      }
    } catch {
      if (!mountedRef.current) return;
      if (!hasLoadedRef.current) {
        const fb = buildFallbackData();
        dataRef.current = fb;
        setData(fb);
        hasLoadedRef.current = true;
      }
    } finally {
      if (mountedRef.current) { setLoading(false); setRefreshing(false); }
      inFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    loadDashboard({ background: false });

    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') loadDashboard({ background: true });
    }, REFRESH_INTERVAL_MS);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') loadDashboard({ background: true });
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onVisibility);

    return () => {
      mountedRef.current = false;
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onVisibility);
    };
  }, [loadDashboard]);

  /* ── Derived values ───────────────────────────────────────────────── */
  const funnel  = data?.funnel || {};
  const applied = funnel.applied || 0;
  const hired   = Number(data?.hired_this_month ?? 0);
  const hirePct = Math.min(pct(hired, MONTHLY_HIRE_TARGET), 100);
  const hireColor = hirePct >= 100 ? '#3E6E3E' : hirePct >= 60 ? T.sageText : '#A35A2D';

  const trendData = useMemo(() => {
    const list = Array.isArray(data?.applicants_trend) ? data.applicants_trend : [];
    return list.map((d) => ({ name: d.day, count: Number(d.count) || 0 }));
  }, [data?.applicants_trend]);

  const trendDelta = useMemo(() => {
    if (trendData.length < 2) return null;
    const first = trendData[0]?.count ?? 0;
    const last  = trendData[trendData.length - 1]?.count ?? 0;
    if (first === 0) return last > 0 ? 100 : 0;
    return Math.round(((last - first) / first) * 100);
  }, [trendData]);

  const funnelDonut = useMemo(() => ([
    { name: 'Shortlisted', value: Number(funnel.shortlisted) || 0, color: '#3E6E3E' },
    { name: 'AI Passed',   value: Math.max((Number(funnel.ai_passed) || 0) - (Number(funnel.shortlisted) || 0), 0), color: T.sage },
    { name: 'Applied',     value: Math.max(applied - (Number(funnel.ai_passed) || 0), 0), color: '#A8ADA8' },
  ].filter((d) => d.value > 0)), [funnel, applied]);

  /* ── Sorted today's interviews — still used by the greeting widget's
       "N live · next at HH:mm" status line, even though the standalone
       Today's Interviews card was replaced. Kept for that consumer only. */
  const todaysInterviews = useMemo(() => {
    const list = Array.isArray(data?.interviews_today_list) ? data.interviews_today_list : [];
    const STATUS_ORDER = { live: 0, upcoming: 1, completed: 2, expired: 3, cancelled: 4 };
    return [...list].sort((a, b) => {
      const ea = getEffectiveStatus(a);
      const eb = getEffectiveStatus(b);
      const oa = STATUS_ORDER[ea] ?? 1;
      const ob = STATUS_ORDER[eb] ?? 1;
      if (oa !== ob) return oa - ob;
      // Within the same status group, sort by scheduled time
      const ta = a?.scheduled_at ? new Date(a.scheduled_at).getTime() : 0;
      const tb = b?.scheduled_at ? new Date(b.scheduled_at).getTime() : 0;
      return ta - tb;
    });
  }, [data?.interviews_today_list]);

  const recentJobs = data?.recent_jobs || [];

  /* ── Candidates awaiting review — derived from existing payload ───────
     REPLACES the removed "Today's Interviews" card. Live interviews now
     live on the Interviewer Dashboard, so this slot uses what the same
     /employers/dashboard/summary response already returns:
       · data.new_applicants   → apps still in APPLIED status
       · data.total_applicants → all non-withdrawn apps for the company
       · data.recent_jobs      → recent jobs + per-job applicant counts
     No new backend calls, no contract changes — display logic only. */
  const REVIEW_VISIBLE = 3;

  const pendingReviewCount = Number(data?.new_applicants ?? 0);
  const totalApplicantsAll = Number(data?.total_applicants ?? 0);
  const reviewedCount      = Math.max(totalApplicantsAll - pendingReviewCount, 0);
  const reviewedPct        = totalApplicantsAll > 0
    ? Math.round((reviewedCount / totalApplicantsAll) * 100)
    : 0;

  // Recent jobs that actually have applicants — LIVE first, then by volume.
  const jobsWithApplicants = useMemo(() => {
    const list = Array.isArray(recentJobs) ? recentJobs : [];
    return [...list]
      .filter((j) => (Number(j?.applicants) || 0) > 0)
      .sort((a, b) => {
        const la = a.status === 'LIVE' ? 0 : 1;
        const lb = b.status === 'LIVE' ? 0 : 1;
        if (la !== lb) return la - lb;
        return (Number(b?.applicants) || 0) - (Number(a?.applicants) || 0);
      });
  }, [recentJobs]);

  const visibleReviewJobs = jobsWithApplicants.slice(0, REVIEW_VISIBLE);
  const hiddenReviewJobs  = Math.max(0, jobsWithApplicants.length - REVIEW_VISIBLE);

  /* ── Greeting — identical to CompanyDashboard ─────────────────────── */
  const displayName = useMemo(() => {
    if (!user) return 'there';
    if (user.full_name && user.full_name.trim()) return user.full_name.trim().split(' ')[0];
    const parts = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
    if (parts) return parts.split(' ')[0];
    if (user.username) return user.username;
    if (user.email)    return user.email.split('@')[0];
    return 'there';
  }, [user]);

  const { greeting, greetEmoji } = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5  && hour < 12) return { greeting: 'Good Morning',   greetEmoji: '🌞' };
    if (hour >= 12 && hour < 17) return { greeting: 'Good Afternoon', greetEmoji: '🌤️' };
    if (hour >= 17 && hour < 21) return { greeting: 'Good Evening',   greetEmoji: '🌆' };
    return                              { greeting: 'Good Evening',   greetEmoji: '🌙' };
  }, []);

  /* ── Skeleton — identical structure to CompanyDashboard ───────────── */
  if (loading) return (
    <Box sx={{ pt: { xs: 2, sm: 3, md: 4 } }}>
      <Skeleton variant="text" width="min(340px, 80%)" height={48} sx={{ mb: 1, borderRadius: '8px' }} />
      <Skeleton variant="text" width="min(420px, 90%)" height={20} sx={{ mb: { xs: 2, sm: 3 }, borderRadius: '6px' }} />
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, minmax(0, 1fr))' },
        gap: { xs: 1.25, sm: 1.5, md: 2 },
        mb: { xs: 1.25, sm: 1.5, md: 2 },
      }}>
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} variant="rounded" height={150} sx={{ borderRadius: '14px' }} />
        ))}
      </Box>
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', lg: 'repeat(3, minmax(0, 1fr))' },
        gap: { xs: 1.25, sm: 1.5, md: 2 },
        mb: { xs: 1.25, sm: 1.5, md: 2 },
      }}>
        {[1, 2, 3].map(i => (
          <Skeleton key={i} variant="rounded" height={320} sx={{ borderRadius: '14px' }} />
        ))}
      </Box>
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 2fr) minmax(0, 1fr)' },
        gap: { xs: 1.25, sm: 1.5, md: 2 },
      }}>
        <Skeleton variant="rounded" height={340} sx={{ borderRadius: '14px' }} />
        <Skeleton variant="rounded" height={340} sx={{ borderRadius: '14px' }} />
      </Box>
    </Box>
  );

  /* ═══ Render ═══════════════════════════════════════════════════════════ */
  return (
    <Box
      className="page-fade-in"
      sx={{
        pt: { xs: 2, sm: 3, md: 4 },
        pb: { xs: 3, sm: 4 },
        overflowX: 'clip',
        maxWidth: { xl: '1600px' },
        mx: 'auto',
        fontFamily: FONT,
        color: T.body,
        ...ANIMATIONS,
      }}
    >
      {/* ── Greeting — exact same animation pattern ──────────────────── */}
      <Box sx={{ mb: { xs: 2.5, sm: 3, md: 3.5 }, ...ANIMATIONS }}>
        <Typography
          component="h1"
          sx={{
            fontFamily: FONT, color: T.ink, fontWeight: 800,
            letterSpacing: '-0.02em', lineHeight: 1.15,
            fontSize: {
              xs: isXxs ? '1.15rem' : '1.5rem',
              sm: '1.85rem', md: '2.2rem', lg: '2.4rem',
            },
            display: 'flex', alignItems: 'center', flexWrap: 'wrap',
            gap: { xs: 0.75, sm: 1, md: 1.25 },
          }}
        >
          <Box component="span" sx={{
            display: 'inline-block',
            animation: 'fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both',
            '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
          }}>
            {greeting},
          </Box>
          <Box component="span" sx={{
            display: 'inline-block', color: T.sageText,
            animation: 'fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.45s both',
            '@media (prefers-reduced-motion: reduce)': { animation: 'none', opacity: 1 },
          }}>
            {displayName}
          </Box>
          <Box component="span" aria-hidden="true" sx={{
            fontSize: 'inherit', lineHeight: 1,
            display: 'inline-flex', alignItems: 'center',
            transformOrigin: 'center center',
            animation: 'popIn 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.9s both',
            willChange: 'transform',
            '@media (prefers-reduced-motion: reduce)': { animation: 'none', opacity: 1 },
          }}>
            {greetEmoji}
          </Box>
        </Typography>

        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap',
          mt: { xs: 0.5, sm: 0.75, md: 1 },
          animation: 'fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) 1.2s both',
          '@media (prefers-reduced-motion: reduce)': { animation: 'none', opacity: 1 },
        }}>
          <Typography sx={{
            color: T.muted, fontFamily: FONT,
            fontSize: { xs: isXxs ? '0.7rem' : '0.8rem', sm: '0.875rem', md: '0.95rem' },
          }}>
            Track your job postings, applicants, and interviews at a glance.
            {user?.company_name ? ` · ${user.company_name}` : ''}
          </Typography>
          <Tooltip title="Refresh dashboard" arrow placement="right">
            <IconButton
              size="small"
              onClick={() => loadDashboard({ background: true })}
              disabled={refreshing}
              sx={{
                width: 32, height: 32, color: T.sageText,
                border: `1px solid ${T.line}`, borderRadius: '8px',
                transition: 'all 0.18s ease',
                '&:hover': { bgcolor: T.sageSoft, borderColor: T.sage },
              }}
            >
              {refreshing
                ? <CircularProgress size={14} sx={{ color: T.sage }} />
                : <Refresh sx={{ fontSize: 16 }} />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* ── Stat cards row — 4-col grid (2 on xs) ─────────────────────── */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'repeat(2, minmax(0, 1fr))',
          sm: 'repeat(4, minmax(0, 1fr))',
        },
        gap: { xs: 1.25, sm: 1.5, md: 2 },
        alignItems: 'stretch',
        mb: { xs: 1.25, sm: 1.5, md: 2 },
        ...ANIMATIONS,
        animation: 'fadeUp 0.55s cubic-bezier(0.22,1,0.36,1) 0.1s both',
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
      }}>
        <StatCard
          label="Active Jobs"
          value={data?.active_jobs ?? 0}
          sub={`${recentJobs.length} recent postings`}
          icon={<Work />}
          accent={T.sageText}
          onClick={() => navigate(NAV.myJobs)}
        />

        <StatCard
          label="Total Applicants"
          value={data?.total_applicants ?? 0}
          sub={`${funnel.shortlisted ?? 0} shortlisted`}
          icon={<People />}
          accent={T.sageText}
          onClick={() => navigate(NAV.candidates)}
        />

        {/* Hires This Month — with progress bar like Monthly Usage */}
        <Card
          elevation={0}
          onClick={() => navigate(NAV.finalHire)}
          sx={{ ...CARD_SX, ...HOVER_LIFT_SX, height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}
        >
          <CardContent sx={{
            p: { xs: 2, sm: 2.25, md: 2.5 }, flex: 1,
            display: 'flex', flexDirection: 'column',
            '&:last-child': { pb: { xs: 2, sm: 2.25, md: 2.5 } },
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
              <Typography sx={{
                fontSize: { xs: '0.68rem', sm: '0.72rem', md: '0.75rem' },
                color: T.muted, fontWeight: 800, fontFamily: FONT,
                letterSpacing: '0.05em', textTransform: 'uppercase',
              }}>
                Hires This Month
              </Typography>
              <Box sx={{
                width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '10px', bgcolor: T.sageSoft, color: T.sageText,
                flexShrink: 0, '& svg': { fontSize: 18 },
              }}>
                <CheckCircle />
              </Box>
            </Box>

            <Box sx={{ flex: 1, display: 'flex', alignItems: 'flex-start' }}>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                <Typography sx={{
                  fontFamily: FONT, fontWeight: 800, color: T.ink, lineHeight: 1,
                  letterSpacing: '-0.02em',
                  fontSize: { xs: '1.75rem', sm: '2rem', md: '2.15rem' },
                }}>
                  {hired}
                </Typography>
                <Typography sx={{ fontSize: '1rem', fontWeight: 600, color: T.faint, fontFamily: FONT }}>
                  / {MONTHLY_HIRE_TARGET}
                </Typography>
              </Box>
            </Box>

            <LinearProgress
              variant="determinate"
              value={hirePct}
              sx={{
                height: 6, borderRadius: 999, mb: 1, mt: 1,
                bgcolor: T.lineSoft,
                '& .MuiLinearProgress-bar': { bgcolor: hireColor, borderRadius: 999 },
              }}
            />
            <Typography sx={{
              fontSize: { xs: '0.7rem', sm: '0.72rem', md: '0.75rem' },
              color: T.muted, fontFamily: FONT, fontWeight: 500,
            }}>
              {Math.max(0, MONTHLY_HIRE_TARGET - hired)} more to reach target
            </Typography>
          </CardContent>
        </Card>

        {/* Interviews Today — dark pine card like Plan Status */}
        <Card
          elevation={0}
          onClick={() => navigate(NAV.interviews)}
          sx={{
            background: 'linear-gradient(160deg, #08302F 0%, #0E1E1D 70%, #121615 100%)',
            border: `1px solid ${T.pine2}`,
            borderRadius: '14px',
            position: 'relative', overflow: 'hidden',
            height: '100%', width: '100%', display: 'flex', flexDirection: 'column',
            cursor: 'pointer',
            transition: 'transform 0.25s cubic-bezier(0.22,1,0.36,1), box-shadow 0.25s ease',
            '&:hover': {
              transform: 'translateY(-3px)',
              boxShadow: '0 8px 24px rgba(2,33,36,0.18)',
            },
            '@media (prefers-reduced-motion: reduce)': {
              transition: 'none',
              '&:hover': { transform: 'none' },
            },
          }}
        >
          <Box sx={{
            position: 'absolute', top: -30, right: -30,
            width: 120, height: 120, borderRadius: '50%',
            bgcolor: 'rgba(127,158,126,0.06)', pointerEvents: 'none',
          }} />
          <CardContent sx={{
            p: { xs: 2, sm: 2.25, md: 2.5 }, flex: 1,
            display: 'flex', flexDirection: 'column',
            '&:last-child': { pb: { xs: 2, sm: 2.25, md: 2.5 } },
            position: 'relative',
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
              <Typography sx={{
                fontSize: { xs: '0.68rem', sm: '0.72rem', md: '0.75rem' },
                color: 'rgba(255,255,255,0.55)', fontWeight: 800, fontFamily: FONT,
                letterSpacing: '0.05em', textTransform: 'uppercase',
              }}>
                Interviews Today
              </Typography>
              <Box sx={{
                width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '10px', bgcolor: 'rgba(127,158,126,0.12)',
                flexShrink: 0, '& svg': { fontSize: 18 },
              }}>
                <EventAvailable sx={{ color: T.sage }} />
              </Box>
            </Box>

            <Box sx={{ flex: 1, display: 'flex', alignItems: 'flex-start' }}>
              <Typography sx={{
                fontFamily: FONT, fontWeight: 800, color: 'rgba(255,255,255,0.97)', lineHeight: 1,
                letterSpacing: '-0.02em',
                fontSize: { xs: '1.75rem', sm: '2rem', md: '2.15rem' },
              }}>
                {data?.interviews_today ?? 0}
              </Typography>
            </Box>

            <Typography sx={{
              mt: 1, fontSize: { xs: '0.7rem', sm: '0.72rem', md: '0.75rem' },
              color: 'rgba(255,255,255,0.55)', fontFamily: FONT, fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: 0.5,
            }}>
              {(() => {
                const liveCount = todaysInterviews.filter((iv) => getEffectiveStatus(iv) === 'live').length;
                if (liveCount > 0) return (
                  <>
                    <Box component="span" sx={{
                      width: 6, height: 6, borderRadius: '50%', bgcolor: '#5CC75C',
                      animation: 'livePulse 1.5s ease-in-out infinite',
                      '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
                    }} />
                    {`${liveCount} live now`}
                  </>
                );
                const nextUpcoming = todaysInterviews.find((iv) => getEffectiveStatus(iv) === 'upcoming');
                if (nextUpcoming?.scheduled_at) return `Next at ${formatDate(nextUpcoming.scheduled_at, 'h:mm A')}`;
                if (todaysInterviews.length > 0) return 'All sessions done';
                return 'No interviews scheduled';
              })()}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* ── Analytics row — 2-col: wider trend+gauge | funnel ────────── */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 2fr) minmax(0, 1fr)' },
        gap: { xs: 1.25, sm: 1.5, md: 2 },
        alignItems: 'stretch',
        mb: { xs: 1.25, sm: 1.5, md: 2 },
        ...ANIMATIONS,
        animation: 'fadeUp 0.55s cubic-bezier(0.22,1,0.36,1) 0.25s both',
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
      }}>
        {/* ── LEFT: Applicants Trend + Shortlist Rate (combined card) ── */}
        <Card elevation={0} sx={{ ...CARD_SX, height: '100%' }}>
          <CardContent sx={{ p: { xs: 2, sm: 2.25, md: 2.75 }, '&:last-child': { pb: { xs: 2, sm: 2.25, md: 2.75 } } }}>
            <SectionHeading
              title="Applicants — last 7 days"
              subtitle=""
              sx={{ mb: { xs: 1.5, sm: 1.75, md: 2 } }}
              action={trendDelta != null && (
                <Chip
                  label={`${trendDelta >= 0 ? '+' : ''}${trendDelta}%`}
                  size="small"
                  sx={{
                    bgcolor: trendDelta >= 0 ? '#EAF2E9' : '#FBECEA',
                    color:   trendDelta >= 0 ? '#3E6E3E' : '#B4462F',
                    fontWeight: 700, fontSize: '0.72rem', borderRadius: '8px',
                    fontFamily: FONT, height: 26,
                    border: `1px solid ${trendDelta >= 0 ? 'rgba(62,110,62,0.25)' : 'rgba(180,70,47,0.25)'}`,
                  }}
                />
              )}
            />

            {/* Area chart — full width */}
            <Box sx={{ width: '100%', height: 220, minWidth: 0 }}>
              {trendData.length === 0 ? (
                <Box sx={{
                  height: '100%', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 1,
                }}>
                  <Box sx={{
                    width: 48, height: 48, borderRadius: '14px',
                    bgcolor: T.sageSoft, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <TrendingUp sx={{ fontSize: 22, color: T.sage }} />
                  </Box>
                  <Typography sx={{ fontSize: '0.85rem', color: T.muted, fontFamily: FONT, fontWeight: 500 }}>
                    Trend appears once we have applicant data
                  </Typography>
                </Box>
              ) : (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <AreaChart data={trendData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="empTrendFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor={T.sage} stopOpacity={0.28} />
                        <stop offset="95%"  stopColor={T.sage} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke={T.lineSoft} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name" tickLine={false} axisLine={false}
                      tick={{ fill: T.muted, fontSize: 11, fontFamily: FONT }}
                    />
                    <YAxis
                      tickLine={false} axisLine={false} allowDecimals={false}
                      tick={{ fill: T.muted, fontSize: 11, fontFamily: FONT }}
                      width={34}
                    />
                    <ReTooltip content={<ChartTooltip suffix=" applicants" />} />
                    <Area
                      type="monotone" dataKey="count"
                      stroke={T.sageText} strokeWidth={2.5}
                      fill="url(#empTrendFill)"
                      isAnimationActive
                      animationDuration={1100}
                      animationEasing="ease-out"
                      activeDot={{
                        r: 5, fill: T.sageText,
                        stroke: T.surface, strokeWidth: 2.5,
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </Box>

            {/* Shortlist Rate — inline below the chart within the same card */}
            {(() => {
              const rate = pct(funnel.shortlisted, applied);
              const rateColor = rate >= 60 ? '#3E6E3E' : rate >= 30 ? T.sageText : '#A35A2D';
              return (
                <Box sx={{
                  mt: 2.5, pt: 2, borderTop: `1px solid ${T.lineSoft}`,
                  display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' },
                  flexDirection: { xs: 'column', sm: 'row' },
                  gap: { xs: 1.5, sm: 3 },
                }}>
                  {/* Gauge — compact size */}
                  <Box sx={{ width: { xs: '100%', sm: 160 }, height: 130, position: 'relative', flexShrink: 0 }}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                      <RadialBarChart
                        innerRadius="68%" outerRadius="100%"
                        data={[{ name: 'rate', value: rate, fill: rateColor }]}
                        startAngle={90} endAngle={-270}
                      >
                        <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                        <RadialBar background={{ fill: T.lineSoft }} dataKey="value" cornerRadius={12}
                          isAnimationActive animationDuration={1200} animationEasing="ease-out" />
                      </RadialBarChart>
                    </ResponsiveContainer>
                    <Box sx={{
                      position: 'absolute', top: '50%', left: '50%',
                      transform: 'translate(-50%,-50%)', textAlign: 'center',
                      pointerEvents: 'none',
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 0.25 }}>
                        <Typography sx={{
                          fontSize: '1.3rem', fontWeight: 800, color: rateColor,
                          lineHeight: 1, fontFamily: FONT, letterSpacing: '-0.02em',
                        }}>{rate}</Typography>
                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: T.faint, fontFamily: FONT }}>%</Typography>
                      </Box>
                    </Box>
                  </Box>

                  {/* Labels — beside the gauge on sm+ */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{
                      fontWeight: 800, fontFamily: FONT, color: T.ink,
                      fontSize: { xs: '0.95rem', sm: '1.05rem' },
                      letterSpacing: '-0.01em', mb: 0.5,
                    }}>
                      Shortlist Rate
                    </Typography>
                    <Typography sx={{ fontSize: '0.78rem', color: T.muted, fontFamily: FONT, lineHeight: 1.6 }}>
                      {rate >= 60 ? 'Excellent conversion this cycle — your screening is highly effective.'
                        : rate >= 30 ? 'Healthy shortlist pipeline. Applicants are moving through your funnel well.'
                        : 'Consider widening the applicant pool or adjusting your screening criteria.'}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, mt: 1.25 }}>
                      <Box>
                        <Typography sx={{ fontSize: '1.1rem', fontWeight: 800, color: T.ink, fontFamily: FONT }}>{applied}</Typography>
                        <Typography sx={{ fontSize: '0.62rem', color: T.faint, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: FONT }}>Applied</Typography>
                      </Box>
                      <Box sx={{ width: 1, bgcolor: T.lineSoft }} />
                      <Box>
                        <Typography sx={{ fontSize: '1.1rem', fontWeight: 800, color: rateColor, fontFamily: FONT }}>{funnel.shortlisted ?? 0}</Typography>
                        <Typography sx={{ fontSize: '0.62rem', color: T.faint, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: FONT }}>Shortlisted</Typography>
                      </Box>
                      <Box sx={{ width: 1, bgcolor: T.lineSoft }} />
                      <Box>
                        <Typography sx={{ fontSize: '1.1rem', fontWeight: 800, color: T.sage, fontFamily: FONT }}>{funnel.ai_passed ?? 0}</Typography>
                        <Typography sx={{ fontSize: '0.62rem', color: T.faint, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: FONT }}>AI Passed</Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              );
            })()}
          </CardContent>
        </Card>

        {/* ── RIGHT: Hiring Funnel donut ──────────────────────────────── */}
        <Card elevation={0} sx={{ ...CARD_SX, height: '100%' }}>
          <CardContent sx={{ p: { xs: 2, sm: 2.25, md: 2.75 }, '&:last-child': { pb: { xs: 2, sm: 2.25, md: 2.75 } } }}>
            <SectionHeading
              title="Hiring Funnel"
              subtitle="Candidate distribution"
              sx={{ mb: { xs: 1.5, sm: 1.75, md: 2 } }}
            />
            <Box sx={{ width: '100%', height: 200, position: 'relative' }}>
              {funnelDonut.length === 0 ? (
                <Box sx={{
                  height: '100%', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 1,
                }}>
                  <Box sx={{
                    width: 48, height: 48, borderRadius: '14px',
                    bgcolor: T.sageSoft, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <People sx={{ fontSize: 22, color: T.sage }} />
                  </Box>
                  <Typography sx={{ fontSize: '0.85rem', color: T.muted, fontFamily: FONT, fontWeight: 500 }}>
                    No applicant data yet
                  </Typography>
                </Box>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <PieChart>
                      <Pie
                        data={funnelDonut} dataKey="value" nameKey="name"
                        cx="50%" cy="50%" innerRadius={52} outerRadius={78}
                        paddingAngle={3} stroke="none"
                        isAnimationActive
                        animationDuration={1000}
                        animationEasing="ease-out"
                      >
                        {funnelDonut.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <ReTooltip content={<ChartTooltip suffix=" candidates" />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <Box sx={{
                    position: 'absolute', top: '50%', left: '50%',
                    transform: 'translate(-50%,-50%)', textAlign: 'center',
                    pointerEvents: 'none',
                  }}>
                    <Typography sx={{
                      fontSize: '1.5rem', fontWeight: 800, color: T.ink,
                      lineHeight: 1, fontFamily: FONT, letterSpacing: '-0.02em',
                    }}>{applied}</Typography>
                    <Typography sx={{
                      fontSize: '0.62rem', color: T.faint, fontWeight: 800,
                      letterSpacing: '0.06em', textTransform: 'uppercase',
                      fontFamily: FONT,
                    }}>Applied</Typography>
                  </Box>
                </>
              )}
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25, justifyContent: 'center', mt: 1 }}>
              {funnelDonut.map((d) => (
                <Box key={d.name} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.6 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: d.color }} />
                  <Typography sx={{ fontSize: '0.72rem', color: T.muted, fontWeight: 600, fontFamily: FONT }}>
                    {d.name} ({d.value})
                  </Typography>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* ── Jobs + Interviews — 2fr / 1fr grid, stretch-aligned ────────── */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 2fr) minmax(0, 1fr)' },
        gap: { xs: 1.25, sm: 1.5, md: 2 },
        alignItems: 'stretch',
        ...ANIMATIONS,
        animation: 'fadeUp 0.55s cubic-bezier(0.22,1,0.36,1) 0.4s both',
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
      }}>

        {/* ── Recent Job Postings (left) — matches Hiring Team ─────────── */}
        <Card elevation={0} sx={{ ...CARD_SX, height: '100%' }}>
          <CardContent sx={{ p: { xs: 2, sm: 2.25, md: 2.75 }, '&:last-child': { pb: { xs: 2, sm: 2.25, md: 2.75 } } }}>
            <SectionHeading
              title="Recent Job Postings"
              subtitle="Your latest roles and their applicants"
              sx={{
                mb: { xs: 2, sm: 2.25, md: 2.5 },
                pb: { xs: 1.5, sm: 1.75 },
                borderBottom: `1px solid ${T.lineSoft}`,
              }}
              action={
                <Button
                  endIcon={<ArrowForward sx={{ fontSize: { xs: 13, sm: 15, md: 16 } }} />}
                  size="small"
                  onClick={() => navigate(NAV.myJobs)}
                  sx={{
                    color: T.sageText, fontWeight: 700, fontFamily: FONT,
                    textTransform: 'none',
                    fontSize: { xs: '0.72rem', sm: '0.78rem', md: '0.82rem' },
                    flexShrink: 0,
                    '&:hover': { bgcolor: T.sageSoft },
                  }}
                >
                  View all
                </Button>
              }
            />

            {recentJobs.length === 0 ? (
              <Box sx={{
                py: { xs: 4, sm: 6 }, textAlign: 'center',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5,
              }}>
                <Box sx={{
                  width: 56, height: 56, borderRadius: '16px',
                  bgcolor: T.sageSoft, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <InboxOutlined sx={{ fontSize: 26, color: T.sage }} />
                </Box>
                <Typography sx={{ fontWeight: 600, fontSize: '0.95rem', color: T.ink, fontFamily: FONT }}>
                  No job postings yet
                </Typography>
                <Typography sx={{ fontSize: '0.8rem', color: T.muted, fontFamily: FONT, maxWidth: 320 }}>
                  Post your first role to start receiving applicants.
                </Typography>
                <Button
                  variant="contained" disableElevation size="small"
                  startIcon={<Add sx={{ fontSize: 16 }} />}
                  onClick={() => navigate(NAV.postJob)}
                  sx={{
                    mt: 0.5, bgcolor: T.sage, color: '#fff', fontFamily: FONT,
                    '&:hover': { bgcolor: T.sageDark },
                    borderRadius: '8px', fontWeight: 600, textTransform: 'none',
                  }}
                >
                  Post a Job
                </Button>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1.25, sm: 1.5, md: 1.75 } }}>
                {recentJobs.slice(0, 3).map((job) => {
                  const st = JOB_STATUS_STYLE[job.status] || JOB_STATUS_STYLE.DRAFT;
                  return (
                    <Box
                      key={job.id}
                      onClick={() => navigate(NAV.applicants(job.id), { state: { job } })}
                      sx={{
                        p: { xs: 1.75, sm: 2, md: 2.25 },
                        border: `1px solid ${T.line}`,
                        borderRadius: '12px', bgcolor: T.surface,
                        cursor: 'pointer',
                        transition: 'all 0.18s ease',
                        '&:hover': {
                          borderColor: T.sage,
                          boxShadow: '0 4px 16px rgba(2,33,36,0.06)',
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1.5 }}>
                        <Box sx={{ display: 'flex', gap: 1.5, minWidth: 0, flex: 1 }}>
                          <Avatar
                            variant="rounded"
                            sx={{
                              width: { xs: 38, sm: 42 }, height: { xs: 38, sm: 42 }, flexShrink: 0,
                              bgcolor: T.sageSoft, color: T.sageText,
                              fontWeight: 700, fontSize: { xs: '0.85rem', sm: '0.95rem' },
                              fontFamily: FONT, borderRadius: '10px',
                            }}
                          >{getInitials(job.title)}</Avatar>
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography sx={{
                              fontWeight: 700, mb: 0.25, fontFamily: FONT,
                              fontSize: { xs: '0.88rem', sm: '0.95rem', md: '1rem' },
                              color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap', lineHeight: 1.3,
                            }}>
                              {job.title}
                            </Typography>
                            <Typography sx={{
                              fontSize: { xs: '0.74rem', sm: '0.8rem' },
                              color: T.muted, fontFamily: FONT,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              Posted {formatDate(job.created_at)}
                            </Typography>
                          </Box>
                        </Box>
                        <Chip
                          label={job.status}
                          size="small"
                          sx={{
                            ...st, fontWeight: 700, fontSize: '0.68rem',
                            borderRadius: '8px', height: { xs: 24, sm: 26 },
                            letterSpacing: '0.04em', fontFamily: FONT,
                            flexShrink: 0,
                            '& .MuiChip-label': { px: { xs: 0.8, sm: 1 } },
                          }}
                        />
                      </Box>

                      <Box sx={{
                        display: 'flex', gap: { xs: 1.25, sm: 2, md: 2.25 },
                        mt: { xs: 1.25, sm: 1.5 }, flexWrap: 'wrap',
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: T.muted, minWidth: 0 }}>
                          <People sx={{ fontSize: { xs: 13, sm: 14 } }} />
                          <Typography sx={{
                            fontSize: { xs: '0.7rem', sm: '0.74rem' },
                            fontWeight: 500, fontFamily: FONT,
                          }}>
                            {job.applicants ?? 0} applicant{(job.applicants ?? 0) === 1 ? '' : 's'}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: T.sageText, minWidth: 0, ml: 'auto' }}>
                          <Typography sx={{
                            fontSize: { xs: '0.7rem', sm: '0.74rem' },
                            fontWeight: 700, fontFamily: FONT,
                          }}>
                            View applicants
                          </Typography>
                          <ArrowForward sx={{ fontSize: { xs: 12, sm: 13 } }} />
                        </Box>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            )}
          </CardContent>
        </Card>

      
        <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, gap: { xs: 1.25, sm: 1.5, md: 2 } }}>
          <Card elevation={0} sx={{ ...CARD_SX, flex: 1 }}>
            <CardContent sx={{
              p: { xs: 2, sm: 2.25, md: 2.75 },
              '&:last-child': { pb: { xs: 2, sm: 2.25, md: 2.75 } },
            }}>
              <SectionHeading
                title="Candidates Awaiting Review"
                subtitle="New applicants ready for your screening"
                sx={{ mb: { xs: 1.5, sm: 1.75, md: 2 } }}
                action={pendingReviewCount > 0 && (
                  <Chip
                    label={`● ${pendingReviewCount} to review`}
                    size="small"
                    sx={{
                      bgcolor: '#F6ECDF', color: '#A35A2D', fontWeight: 700,
                      fontSize: '0.68rem', height: 22,
                      border: '1px solid rgba(163,90,45,0.25)',
                      borderRadius: '999px', fontFamily: FONT, flexShrink: 0,
                      '& .MuiChip-label': { px: 1 },
                    }}
                  />
                )}
              />

              {jobsWithApplicants.length === 0 ? (
                <Box sx={{
                  py: { xs: 3, sm: 4 }, textAlign: 'center',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                }}>
                  <Box sx={{
                    width: 48, height: 48, borderRadius: '14px',
                    bgcolor: T.sageSoft, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <InboxOutlined sx={{ fontSize: 22, color: T.sage }} />
                  </Box>
                  <Typography sx={{ fontSize: '0.85rem', color: T.muted, fontFamily: FONT, fontWeight: 500 }}>
                    No applicants to review yet
                  </Typography>
                  <Typography sx={{ fontSize: '0.72rem', color: T.faint, fontFamily: FONT, maxWidth: 220 }}>
                    When candidates apply to your roles, they'll show up here.
                  </Typography>
                </Box>
              ) : pendingReviewCount === 0 ? (
                <Box sx={{
                  py: { xs: 3, sm: 4 }, textAlign: 'center',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                }}>
                  <Box sx={{
                    width: 48, height: 48, borderRadius: '14px',
                    bgcolor: '#EAF2E9', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <CheckCircle sx={{ fontSize: 22, color: '#3E6E3E' }} />
                  </Box>
                  <Typography sx={{ fontSize: '0.85rem', color: T.muted, fontFamily: FONT, fontWeight: 500 }}>
                    You're all caught up
                  </Typography>
                  <Typography sx={{ fontSize: '0.72rem', color: T.faint, fontFamily: FONT, maxWidth: 220 }}>
                    Every new applicant has been screened.
                  </Typography>
                </Box>
              ) : (
                <>
                  {totalApplicantsAll > 0 && (
                    <Box sx={{
                      display: 'flex', alignItems: 'center', gap: 1.25,
                      bgcolor: T.cream, borderRadius: '10px',
                      p: { xs: 1.1, sm: 1.25 }, mb: { xs: 1.25, sm: 1.5 },
                    }}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{
                          fontSize: '0.68rem', fontWeight: 800,
                          letterSpacing: '0.05em', textTransform: 'uppercase',
                          color: T.muted, fontFamily: FONT,
                        }}>
                          Review progress
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={reviewedPct}
                          sx={{
                            mt: 0.6, height: 6, borderRadius: 999,
                            bgcolor: '#E7EAE3',
                            '& .MuiLinearProgress-bar': { bgcolor: T.sage, borderRadius: 999 },
                          }}
                        />
                      </Box>
                      <Typography sx={{
                        fontSize: '0.9rem', fontWeight: 800, color: T.sageText, fontFamily: FONT,
                        flexShrink: 0, minWidth: 42, textAlign: 'right',
                      }}>
                        {reviewedPct}%
                      </Typography>
                    </Box>
                  )}

                  {visibleReviewJobs.map((job, i) => (
                    <Box key={job.id ?? i} sx={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      py: { xs: 1.25, sm: 1.4, md: 1.5 },
                      borderBottom: `1px solid ${T.lineSoft}`,
                      '&:last-child': {
                        borderBottom: hiddenReviewJobs > 0 ? `1px solid ${T.lineSoft}` : 'none',
                        pb: hiddenReviewJobs > 0 ? undefined : 0,
                      },
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0, flex: 1 }}>
                        <Box sx={{
                          flexShrink: 0, minWidth: 46, py: 0.5, px: 0.75,
                          bgcolor: T.sageSoft, borderRadius: '8px',
                          textAlign: 'center', lineHeight: 1.15,
                        }}>
                          <Typography sx={{
                            fontSize: '0.9rem', fontWeight: 800,
                            color: T.sageText, fontFamily: FONT,
                          }}>
                            {Number(job.applicants) || 0}
                          </Typography>
                          <Typography sx={{
                            fontSize: '0.55rem', fontWeight: 700,
                            color: T.sageText, letterSpacing: '0.06em', fontFamily: FONT,
                          }}>
                            APPS
                          </Typography>
                        </Box>

                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography sx={{
                            fontSize: { xs: '0.78rem', sm: '0.82rem', md: '0.85rem' },
                            color: T.body, fontWeight: 700, fontFamily: FONT,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {job.title || 'Untitled role'}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.4 }}>
                            <Box sx={{
                              display: 'inline-flex', alignItems: 'center',
                              ...(JOB_STATUS_STYLE[job.status] || JOB_STATUS_STYLE.DRAFT),
                              px: 0.75, py: 0.15, borderRadius: '6px',
                              fontSize: '0.56rem', fontWeight: 800,
                              letterSpacing: '0.05em', textTransform: 'uppercase',
                              lineHeight: 1.5, fontFamily: FONT,
                            }}>
                              {job.status || 'DRAFT'}
                            </Box>
                            <Typography sx={{
                              fontSize: { xs: '0.65rem', sm: '0.7rem' },
                              color: T.faint, fontFamily: FONT,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              Posted {job.created_at ? formatDate(job.created_at, 'MMM D') : '—'}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>

                      <Button
                        size="small" variant="contained" disableElevation
                        endIcon={<ArrowForward sx={{ fontSize: 12 }} />}
                        onClick={() => navigate(NAV.applicants(job.id))}
                        sx={{
                          flexShrink: 0, fontFamily: FONT,
                          fontSize: '0.7rem', fontWeight: 700, borderRadius: '8px',
                          py: 0.4, px: 1.1, minWidth: 0,
                          textTransform: 'none',
                          bgcolor: T.pine, color: '#fff',
                          '&:hover': { bgcolor: '#0A3F42' },
                        }}
                      >
                        Review
                      </Button>
                    </Box>
                  ))}

                  {hiddenReviewJobs > 0 && (
                    <Box
                      onClick={() => navigate(NAV.myJobs)}
                      sx={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        gap: 0.75, py: { xs: 1.1, sm: 1.25 },
                        cursor: 'pointer', borderRadius: '8px',
                        transition: 'background 0.15s ease',
                        '&:hover': { bgcolor: T.sageSoft },
                      }}
                    >
                      <Box sx={{
                        width: 22, height: 22, borderRadius: '6px',
                        bgcolor: T.sageSoft, display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Typography sx={{ fontSize: '0.65rem', fontWeight: 800, color: T.sageText, fontFamily: FONT }}>
                          +{hiddenReviewJobs}
                        </Typography>
                      </Box>
                      <Typography sx={{
                        fontSize: '0.74rem', fontWeight: 600, color: T.muted, fontFamily: FONT,
                      }}>
                        {hiddenReviewJobs === 1 ? '1 more role with applicants' : `${hiddenReviewJobs} more roles with applicants`}
                      </Typography>
                    </Box>
                  )}
                </>
              )}

              <Box sx={{ mt: 1.5 }}>
                <Button
                  fullWidth
                  endIcon={<ArrowForward sx={{ fontSize: 14 }} />}
                  onClick={() => navigate(NAV.candidates)}
                  sx={{
                    color: T.sageText, fontWeight: 600, fontFamily: FONT,
                    textTransform: 'none', fontSize: '0.82rem',
                    borderRadius: '10px', border: `1px solid ${T.line}`,
                    bgcolor: T.sageSoft,
                    '&:hover': { bgcolor: '#DDE9DC', borderColor: T.sage },
                    py: 0.9, transition: 'all 0.18s',
                  }}
                >
                  View All Candidates
                  {pendingReviewCount > 0 && (
                    <Chip
                      label={pendingReviewCount}
                      size="small"
                      sx={{
                        ml: 0.75, height: 18, minWidth: 18,
                        fontSize: '0.62rem', fontWeight: 800,
                        bgcolor: 'rgba(94,129,93,0.15)', color: T.sageText,
                        fontFamily: FONT,
                        '& .MuiChip-label': { px: 0.5 },
                      }}
                    />
                  )}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
};

export default EmployerDashboard;