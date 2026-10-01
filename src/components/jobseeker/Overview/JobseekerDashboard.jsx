import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  Box, Typography, Card, CardContent, LinearProgress,
  Chip, Button, Skeleton,
  useMediaQuery, useTheme,
} from '@mui/material';
import {
  TrendingUp, Bookmark, Assignment, EmojiEvents,
  ArrowForward, LocationOn, AccessTime, CurrencyRupee, SmartToy,
  WorkOutlineOutlined, AutoAwesomeOutlined, WorkOffOutlined,
  CheckCircle,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import jobseekerService from '@/services/api/jobseeker/jobseekerService';
import overviewService from '@/services/api/jobseeker/overviewService';
import smartInterviewService from '@/services/api/jobseeker/smartInterviewService';

import { useJobseekerProfile } from '@/hooks/jobseeker/useJobseekerProfile';

import jobService from '@/services/api/jobseeker/jobService';
import { formatSalary } from '@/utils/formatters';
import { ROUTES } from '@/constants';

/* ── Landing-page theme tokens ─────────────────────────────────────────── */
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
};

const toSkillArray = (val) => {
  if (!val) return [];
  let raw = val;
  if (Array.isArray(raw)) {
    // Array of one giant string → treat as string
    if (raw.length === 1 && typeof raw[0] === 'string' && raw[0].length > 40) {
      raw = raw[0];
    } else {
      return raw.map(s => String(s).trim()).filter(Boolean);
    }
  }
  if (typeof raw !== 'string') return [];

  // Preferred: comma/semicolon/pipe separated
  if (/[,;|]/.test(raw)) {
    return raw.split(/[,;|]/).map(s => s.trim()).filter(Boolean);
  }
  const MULTI = [
    'Hyperledger Fabric', 'Binance Smart Chain', 'Smart Contracts',
    'Smart Chain', 'REST APIs', 'REST API', 'System Design', 'Machine Learning',
    'Deep Learning', 'Data Science', 'Data Analysis', 'Data Engineering',
    'Google Cloud', 'Spring Boot', 'Ruby on Rails', 'Objective C',
    'React Native', 'Node js', 'Next js', 'Vue js', 'CI CD', 'Unit Testing',
  ];
  let guarded = raw;
  const restore = {};
  MULTI.forEach((phrase, i) => {
    const token = `__M${i}__`;
    const re = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    guarded = guarded.replace(re, (m) => { restore[token] = m; return token; });
  });
  const parts = guarded
    .split(/\s+/)
    .map(s => restore[s] ?? s)
    .map(s => s.trim())
    .filter(Boolean);

  const merged = [];
  parts.forEach((p) => {
    if (/^\(.+\)$/.test(p) && merged.length) {
      merged[merged.length - 1] = `${merged[merged.length - 1]} ${p}`;
    } else {
      merged.push(p);
    }
  });
  return merged;
};

const normalizeJob = (job) => {
  if (!job) return null;
  const title    = job.jobTitle    ?? job.job_title    ?? job.title        ?? '';
  const company  = job.companyName ?? job.company_name ?? job.company      ?? '';
  const location = job.jobLocation ?? job.job_location ?? job.location
                ?? job.jobCity     ?? job.job_city     ?? '';
  const jobType  = (job.jobType ?? job.job_type ?? '').replace(/_/g, '-');
  const workMode = job.workModeDisplay ?? job.work_mode_display ?? '';
  const salary   = job.salaryDisplay ?? job.salary_display
                ?? ((job.salaryMin ?? job.min_salary ?? job.salary_min) != null
                      ? formatSalary(
                          job.salaryMin ?? job.min_salary ?? job.salary_min,
                          job.salaryMax ?? job.max_salary ?? job.salary_max,
                        )
                      : '');
  const skills = toSkillArray(job.skills ?? job.required_skills);

  return {
    id: job.id ?? job.job_id,
    title,
    company,
    location,
    jobType,
    workMode,
    salary: salary && salary !== 'Not disclosed' ? salary : '',
    skills,
    logoUrl: job.companyLogoUrl ?? job.company_logo_url ?? null,
    initial: (company || title || '•').charAt(0).toUpperCase(),
  };
};

/* ── SectionHeading — sage accent bar ──────────────────────────────────── */
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

/* ── StatCard ──────────────────────────────────────────────────────────── */
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

/* ── JobCard ───────────────────────────────────────────────────────────── */
const JobCard = ({ job, maxSkills, showApply, onApply, onOpen }) => {
  const [logoErrored, setLogoErrored] = useState(false);
  const logoSrc =
    typeof job.logoUrl === 'string' && /^https?:\/\//i.test(job.logoUrl.trim())
      ? job.logoUrl.trim()
      : null;
  const showLogo = Boolean(logoSrc) && !logoErrored;

  const metas = [
    job.location && { icon: <LocationOn   sx={{ fontSize: { xs: 13, sm: 14 } }} />, text: job.location },
    job.jobType  && { icon: <AccessTime   sx={{ fontSize: { xs: 13, sm: 14 } }} />, text: job.jobType },
    job.workMode && { icon: <WorkOutlineOutlined sx={{ fontSize: { xs: 13, sm: 14 } }} />, text: job.workMode },
    job.salary   && { icon: <CurrencyRupee sx={{ fontSize: { xs: 13, sm: 14 } }} />, text: job.salary },
  ].filter(Boolean);

  const visibleSkills = job.skills.slice(0, maxSkills);
  const overflow      = job.skills.length - maxSkills;

  return (
    <Box
      onClick={onOpen}
      sx={{
        p: { xs: 1.75, sm: 2, md: 2.25 },
        border: `1px solid ${T.line}`,
        borderRadius: '12px', bgcolor: T.surface,
        transition: 'all 0.18s ease',
        cursor: onOpen ? 'pointer' : 'default',
        '&:hover': {
          borderColor: T.sage,
          boxShadow: '0 4px 16px rgba(2,33,36,0.06)',
        },
      }}
    >
      <Box sx={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', gap: 1.5,
        mb: metas.length || visibleSkills.length ? { xs: 1.25, sm: 1.5 } : 0,
      }}>
        <Box sx={{ display: 'flex', gap: 1.5, minWidth: 0, flex: 1 }}>
          <Box sx={{
            width: { xs: 38, sm: 42 }, height: { xs: 38, sm: 42 }, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: '10px', overflow: 'hidden', position: 'relative',
            bgcolor: showLogo ? '#FFFFFF' : T.sageSoft,
            border: showLogo ? `1px solid ${T.line}` : 'none',
            color: T.sageText,
            fontWeight: 700, fontSize: { xs: '0.9rem', sm: '1rem' },
            fontFamily: "'DM Serif Display', serif",
          }}>
            {showLogo ? (
              <Box
                component="img"
                src={logoSrc}
                alt={job.company || 'Company logo'}
                onError={() => setLogoErrored(true)}
                sx={{
                  width: '100%', height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            ) : (
              job.initial
            )}
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography sx={{
              fontWeight: 700, mb: 0.25, fontFamily: FONT,
              fontSize: { xs: '0.88rem', sm: '0.95rem', md: '1rem' },
              color: T.ink, overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              lineHeight: 1.3,
            }}>
              {job.title || 'Untitled role'}
            </Typography>
            {job.company && (
              <Typography sx={{
                fontSize: { xs: '0.74rem', sm: '0.8rem' },
                color: T.muted, fontFamily: FONT,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {job.company}
              </Typography>
            )}
          </Box>
        </Box>
        {showApply && (
          job.applied ? (
            <Box sx={{
              display: 'inline-flex', alignItems: 'center', gap: 0.6,
              flexShrink: 0, whiteSpace: 'nowrap',
              bgcolor: T.sageSoft,
              border: `1px solid rgba(127,158,126,0.35)`,
              color: '#4A6E49',
              borderRadius: '8px',
              px: { xs: 1.25, sm: 1.5, md: 1.75 },
              py: { xs: '5px', sm: '6px' },
              fontFamily: FONT, fontWeight: 600,
              fontSize: { xs: '0.72rem', sm: '0.76rem', md: '0.8rem' },
            }}>
              <CheckCircle sx={{ fontSize: { xs: 15, sm: 16 } }} />
              {job.appliedLabel || 'Already Applied'}
            </Box>
          ) : (
            <Button
              variant="contained" size="small" disableElevation
              onClick={(e) => { e.stopPropagation(); onApply?.(); }}
              sx={{
                bgcolor: T.sage, color: '#FFFFFF', fontFamily: FONT,
                '&:hover': { bgcolor: T.sageDark },
                borderRadius: '8px', fontWeight: 600, textTransform: 'none',
                whiteSpace: 'nowrap', flexShrink: 0,
                fontSize: { xs: '0.72rem', sm: '0.76rem', md: '0.8rem' },
                px: { xs: 1.5, sm: 1.75, md: 2 },
                py: { xs: '5px', sm: '6px' },
              }}
            >
              Apply now
            </Button>
          )
        )}
      </Box>

      {metas.length > 0 && (
        <Box sx={{
          display: 'flex', gap: { xs: 1.25, sm: 2, md: 2.25 },
          mb: visibleSkills.length ? { xs: 1.25, sm: 1.5 } : 0,
          flexWrap: 'wrap',
        }}>
          {metas.map(({ icon, text }) => (
            <Box key={text} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: T.muted, minWidth: 0 }}>
              {icon}
              <Typography sx={{
                fontSize: { xs: '0.7rem', sm: '0.74rem' },
                fontWeight: 500, fontFamily: FONT,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                maxWidth: { xs: 140, sm: 180 },
              }}>{text}</Typography>
            </Box>
          ))}
        </Box>
      )}

      {visibleSkills.length > 0 && (
        <Box sx={{ display: 'flex', gap: { xs: 0.5, sm: 0.6, md: 0.75 }, flexWrap: 'wrap' }}>
          {visibleSkills.map((s) => (
            <Chip key={s} label={s} size="small" sx={{
              bgcolor: T.sageSoft, color: '#4A6E49',
              border: `1px solid ${T.line}`,
              borderRadius: '8px', fontFamily: FONT,
              fontSize: { xs: '0.64rem', sm: '0.7rem' },
              fontWeight: 500, height: { xs: 24, sm: 26 },
              maxWidth: { xs: 130, sm: 170 },
              '& .MuiChip-label': {
                px: { xs: 0.8, sm: 1 },
                overflow: 'hidden', textOverflow: 'ellipsis',
              },
            }} />
          ))}
          {overflow > 0 && (
            <Chip label={`+${overflow}`} size="small" sx={{
              bgcolor: T.lineSoft, color: T.muted,
              borderRadius: '8px', fontFamily: FONT,
              fontSize: { xs: '0.64rem', sm: '0.7rem' },
              fontWeight: 600, height: { xs: 24, sm: 26 },
              '& .MuiChip-label': { px: { xs: 0.8, sm: 1 } },
            }} />
          )}
        </Box>
      )}
    </Box>
  );
};

/* ═══════════════════════════════════════════════════════════════════════ */
const JobseekerDashboard = () => {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const theme      = useTheme();

  const isXxs = useMediaQuery('(max-width:240px)');
  const isXs  = useMediaQuery(theme.breakpoints.down('sm'));
  const isSm  = useMediaQuery(theme.breakpoints.down('md'));

  const [dashboard,  setDashboard]  = useState(null);
  const [jobs,       setJobs]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const mountedRef   = useRef(true);
  const inFlightRef  = useRef(false);
  const hasLoadedRef = useRef(false);

/* ── Profile completion — uses the same hook + formula as Profile page ── */
  const { completion: profileCompletionData } = useJobseekerProfile();
  const profileCompletion = profileCompletionData.percent;

  const loadDashboard = useCallback(async ({ background = false } = {}) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    if (background) setRefreshing(true); else setLoading(true);

    const candidateId = user?.id;
    const [appsRes, jobsRes, skillsRes, perfRes, aiRes, savedRes] = await Promise.all([
      jobService.getApplications().catch(() => ({ applications: [], total: 0 })),
      jobService.listJobs({}).catch(() => ({ jobs: [] })),
      candidateId
        ? jobseekerService.getSkills(candidateId).catch(() => null)
        : Promise.resolve(null),
      overviewService.getCandidatePerformance().catch(() => null),
      smartInterviewService.getAIInterviewSessions().catch(() => null),
      
      jobService.getSavedJobs().catch(() => jobService.getSavedJobsLocal?.() ?? []),
    ]);

    if (!mountedRef.current) { inFlightRef.current = false; return; }

    const appList = appsRes?.applications || (Array.isArray(appsRes) ? appsRes : []);
    const applications_count = appsRes?.total ?? appList.length;
    const saved_count = Array.isArray(savedRes) ? savedRes.length : 0;
    const rawJobs = jobsRes?.jobs || jobsRes?.results || (Array.isArray(jobsRes) ? jobsRes : []);

    const skillsRaw = skillsRes?.data?.skills || skillsRes?.data || [];
    const skillNames = (Array.isArray(skillsRaw) ? skillsRaw : [])
      .map(s => (typeof s === 'string' ? s : s?.skill_name ?? s?.name ?? ''))
      .map(s => String(s).trim())
      .filter(Boolean);
    const mySkills = new Set(skillNames.map(s => s.toLowerCase()));

    const serverAppliedIds = new Set(
      appList
        .filter(a => (a.status ?? '').toUpperCase() !== 'WITHDRAWN')
        .map(a => String(a.jobId ?? a.job_id ?? a.id))
        .filter(Boolean),
    );

   
    const normalized = (rawJobs || []).map(normalizeJob).filter(Boolean);
    normalized.forEach((job) => {
      const idStr = String(job.id ?? '');
      const localApp = jobService.isJobApplied?.(job.id) || null;
      const applied  = Boolean(localApp) || serverAppliedIds.has(idStr);
      job.applied      = applied;
      job.appliedLabel = applied
        ? (jobService.getAppliedLabel?.(job.id) || 'Already Applied')
        : null;
    });

    const scored = normalized.map((job, idx) => {
      let match = 0;
      if (mySkills.size) {
        job.skills.forEach(sk => {
          if (mySkills.has(sk.toLowerCase())) match += 1;
        });
      }
      return { job, match, idx };
    });
    scored.sort((a, b) => (b.match - a.match) || (a.idx - b.idx));

   
    const perf   = perfRes || {};
    const perfIr = perf.industry_readiness || {};
    const perfIv = perf.interviews         || {};
    const perfApps   = perf.applications   || {};
    const perfRounds = perf.rounds         || {};

    let overall_score = perfIr.score ?? null;
    if (overall_score == null) {
      const parts = [
        perfApps.shortlist_rate, perfIv.attendance_rate,
        perfRounds.approval_rate, perfIr.score,
      ].filter(v => typeof v === 'number');
      overall_score = parts.length
        ? Math.round(parts.reduce((a, b) => a + b, 0) / parts.length)
        : null;
    }

  

    const ai_best = aiRes?.best_score != null
      ? Math.round(aiRes.best_score * 10) / 10 : null;
    const ai_avg  = aiRes?.avg_score != null
      ? Math.round(aiRes.avg_score * 10) / 10 : null;

    setDashboard((prev) => ({
      ...(prev || {}),
      applications_count,
      saved_count,
      overall_score,
      ai_best,
      ai_avg,
    }));
    setJobs(scored.slice(0, 6).map(s => s.job));
    hasLoadedRef.current = true;

    if (mountedRef.current) { setRefreshing(false); setLoading(false); }
    inFlightRef.current = false;
  }, [user?.id, user?.user_id]);

  useEffect(() => {
    mountedRef.current = true;
    loadDashboard({ background: false });

    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') loadDashboard({ background: true });
    }, 30000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') loadDashboard({ background: true });
    };
   
    const onJobsUpdated = () => loadDashboard({ background: true });

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    window.addEventListener('jobs-updated', onJobsUpdated);

    return () => {
      mountedRef.current = false;
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      window.removeEventListener('jobs-updated', onJobsUpdated);
    };
  }, [loadDashboard]);

  const displayName = useMemo(() => {
    if (!user) return 'there';
    if (user.full_name && user.full_name.trim()) return user.full_name.trim();
    const parts = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
    if (parts) return parts;
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

  /* Skill chip counts per breakpoint */
  const maxSkills = isXxs ? 2 : isXs ? 4 : isSm ? 5 : 6;

  /* ── Skeleton ────────────────────────────────────────────────────────── */
  if (loading) return (
    <Box sx={{ pt: { xs: 2, sm: 3, md: 4 } }}>
      <Skeleton variant="text" width="min(340px, 80%)" height={48} sx={{ mb: 1, borderRadius: '8px' }} />
      <Skeleton variant="text" width="min(420px, 90%)" height={20} sx={{ mb: { xs: 2, sm: 3 }, borderRadius: '6px' }} />
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
        gap: { xs: 1.25, sm: 1.5, md: 2 },
        mb: { xs: 1.25, sm: 1.5, md: 2 },
      }}>
        {[1, 2, 3].map(i => (
          <Skeleton key={i} variant="rounded" height={150} sx={{ borderRadius: '14px' }} />
        ))}
      </Box>
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 2fr) minmax(0, 1fr)' },
        gap: { xs: 1.25, sm: 1.5, md: 2 },
      }}>
        <Skeleton variant="rounded" height={420} sx={{ borderRadius: '14px' }} />
        <Box>
          <Skeleton variant="rounded" height={260} sx={{ borderRadius: '14px', mb: 2 }} />
          <Skeleton variant="rounded" height={140} sx={{ borderRadius: '14px' }} />
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box
      className="page-fade-in"
      sx={{
        pt: { xs: 2, sm: 3, md: 4 },
        pb: { xs: 3, sm: 4 },
        overflowX: 'hidden',
        maxWidth: { xl: '1600px' },
        mx: 'auto',
        fontFamily: FONT,
        color: T.body,
      }}
    >
      {refreshing && (
        <LinearProgress sx={{
          height: 2, borderRadius: 1, mb: 1, bgcolor: 'transparent',
          '& .MuiLinearProgress-bar': { bgcolor: T.sage },
        }} />
      )}

      {/* ── Greeting ──────────────────────────────────────────────────── */}
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

        <Typography sx={{
          mt: { xs: 0.5, sm: 0.75, md: 1 }, color: T.muted, fontFamily: FONT,
          fontSize: { xs: isXxs ? '0.7rem' : '0.8rem', sm: '0.875rem', md: '0.95rem' },
          animation: 'fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) 1.2s both',
          '@media (prefers-reduced-motion: reduce)': { animation: 'none', opacity: 1 },
        }}>
          Manage your job search efficiently and stay ahead in your career journey.
        </Typography>
      </Box>

      {/* ── Stat cards row — CSS grid guarantees equal heights ────────── */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
        gap: { xs: 1.25, sm: 1.5, md: 2 },
        alignItems: 'stretch',
        mb: { xs: 1.25, sm: 1.5, md: 2 },
      }}>
        <StatCard
          label="Overall Score"
          value={dashboard?.overall_score ?? '—'}
          sub="Your score · View candidate performance"
          icon={<EmojiEvents />}
          onClick={() => navigate('/jobseeker/career/candidate-performance')}
        />

        <Card
          elevation={0}
          onClick={() => navigate(ROUTES.JS_PROFILE)}
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
                  Profile Strength
                </Typography>
                <Box sx={{
                  width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: '10px', bgcolor: T.sageSoft, color: T.sageText,
                  flexShrink: 0, '& svg': { fontSize: 18 },
                }}>
                  <WorkOutlineOutlined />
                </Box>
              </Box>

              <Box sx={{ flex: 1, display: 'flex', alignItems: 'flex-start' }}>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                  <Typography sx={{
                    fontFamily: FONT, fontWeight: 800, color: T.ink, lineHeight: 1,
                    letterSpacing: '-0.02em',
                    fontSize: { xs: '1.75rem', sm: '2rem', md: '2.15rem' },
                  }}>
                    {profileCompletion ?? 0}
                  </Typography>
                  <Typography sx={{ fontSize: '1rem', fontWeight: 600, color: T.faint, fontFamily: FONT }}>%</Typography>
                </Box>
              </Box>

              <LinearProgress
                variant="determinate"
                value={profileCompletion ?? 0}
                sx={{
                  height: 6, borderRadius: 999, mb: 1, mt: 1,
                  bgcolor: T.lineSoft,
                  '& .MuiLinearProgress-bar': { bgcolor: T.sage, borderRadius: 999 },
                }}
              />
              <Typography sx={{
                fontSize: { xs: '0.7rem', sm: '0.72rem', md: '0.75rem' },
                color: T.muted, fontFamily: FONT, fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: 0.5,
              }}>
                Complete your profile
                <ArrowForward sx={{ fontSize: 12, color: T.sageText }} />
              </Typography>
            </CardContent>
          </Card>

        <StatCard
          label="AI Interview Score"
          value={dashboard?.ai_best != null ? `${dashboard.ai_best}/10` : '—'}
          sub={dashboard?.ai_avg != null
            ? `Avg ${dashboard.ai_avg}/10 · View AI interviews`
            : 'Take your first AI interview'}
          icon={<TrendingUp />}
          accent={T.pine}
          onClick={() => navigate('/jobseeker/smart-interviews/ai')}
        />
      </Box>

      {/* ── Main content — 2fr / 1fr CSS grid, stretch-aligned ─────────── */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 2fr) minmax(0, 1fr)' },
        gap: { xs: 1.25, sm: 1.5, md: 2 },
        alignItems: 'stretch',
      }}>

        {/* ── Recommended Jobs (left) ──────────────────────────────────── */}
        <Card elevation={0} sx={{ ...CARD_SX, height: '100%' }}>
            <CardContent sx={{ p: { xs: 2, sm: 2.25, md: 2.75 }, '&:last-child': { pb: { xs: 2, sm: 2.25, md: 2.75 } } }}>
              <SectionHeading
                title="Recommended for You"
                subtitle="Roles matched to your profile and preferences"
                sx={{
                  mb: { xs: 2, sm: 2.25, md: 2.5 },
                  pb: { xs: 1.5, sm: 1.75 },
                  borderBottom: `1px solid ${T.lineSoft}`,
                }}
                action={
                  <Button
                    endIcon={<ArrowForward sx={{ fontSize: { xs: 13, sm: 15, md: 16 } }} />}
                    size="small"
                    onClick={() => navigate(ROUTES.JS_FIND_JOBS)}
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

              {jobs.length === 0 ? (
                /* Empty state */
                <Box sx={{
                  py: { xs: 4, sm: 6 }, textAlign: 'center',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5,
                }}>
                  <Box sx={{
                    width: 56, height: 56, borderRadius: '16px',
                    bgcolor: T.sageSoft, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <WorkOffOutlined sx={{ fontSize: 26, color: T.sage }} />
                  </Box>
                  <Typography sx={{ fontWeight: 600, fontSize: '0.95rem', color: T.ink, fontFamily: FONT }}>
                    No recommendations yet
                  </Typography>
                  <Typography sx={{ fontSize: '0.8rem', color: T.muted, fontFamily: FONT, maxWidth: 320 }}>
                    Complete your profile and add skills so we can match roles to you.
                  </Typography>
                  <Button
                    variant="contained" disableElevation size="small"
                    onClick={() => navigate(ROUTES.JS_FIND_JOBS)}
                    sx={{
                      mt: 0.5, bgcolor: T.sage, color: '#fff', fontFamily: FONT,
                      '&:hover': { bgcolor: T.sageDark },
                      borderRadius: '8px', fontWeight: 600, textTransform: 'none',
                    }}
                  >
                    Browse all jobs
                  </Button>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1.25, sm: 1.5, md: 1.75 } }}>
                  {jobs.slice(0, 3).map((job, jdx) => (
                    <JobCard
                      key={job.id ?? `job-${jdx}`}
                      job={job}
                      maxSkills={maxSkills}
                      showApply={!isXxs}
                      onApply={() =>
                        job.id != null
                          ? navigate(`/jobseeker/job/${job.id}`)
                          : navigate(ROUTES.JS_FIND_JOBS)
                      }
                      onOpen={() =>
                        job.id != null
                          ? navigate(`/jobseeker/job/${job.id}`)
                          : navigate(ROUTES.JS_FIND_JOBS)
                      }
                    />
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>

        {/* ── Right column — flex column fills grid row height ─────────── */}
        <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>

          {/* AI Interview Prep — pine card */}
          <Card elevation={0} sx={{
            background: 'linear-gradient(160deg, #08302F 0%, #0E1E1D 70%, #121615 100%)',
            border: `1px solid ${T.pine2}`,
            borderRadius: '14px', mb: { xs: 1.5, sm: 2 },
            position: 'relative', overflow: 'hidden',
          }}>
            <Box sx={{
              position: 'absolute', top: -30, right: -30,
              width: 120, height: 120, borderRadius: '50%',
              bgcolor: 'rgba(127,158,126,0.06)', pointerEvents: 'none',
            }} />
            <CardContent sx={{
              p: { xs: 2, sm: 2.25, md: 2.75 },
              '&:last-child': { pb: { xs: 2, sm: 2.25, md: 2.75 } },
              position: 'relative',
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: { xs: 1.5, sm: 1.75, md: 2 } }}>
                <Box sx={{
                  width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: '10px', bgcolor: 'rgba(127,158,126,0.12)', flexShrink: 0,
                }}>
                  <SmartToy sx={{ color: T.sage, fontSize: 18 }} />
                </Box>
                <Typography sx={{
                  color: 'rgba(255,255,255,0.97)', fontWeight: 700, fontFamily: FONT,
                  fontSize: { xs: '0.88rem', sm: '0.95rem', md: '1rem' },
                  letterSpacing: '-0.01em',
                }}>
                  AI Interview Prep
                </Typography>
              </Box>

              <Typography sx={{
                color: 'rgba(255,255,255,0.72)', fontFamily: FONT,
                fontSize: { xs: '0.75rem', sm: '0.8rem', md: '0.82rem' },
                mb: { xs: 2, sm: 2.25 }, lineHeight: 1.55,
                display: isXxs ? 'none' : 'block',
              }}>
                Practice with our AI and improve your interview readiness score.
              </Typography>

              <Button
                fullWidth variant="contained" disableElevation
                onClick={() => navigate('/jobseeker/quick-interview/session?quick=1')}
                startIcon={<AutoAwesomeOutlined sx={{ fontSize: 16 }} />}
                sx={{
                  bgcolor: T.sage, color: '#FFFFFF', fontFamily: FONT,
                  '&:hover': { bgcolor: T.sageDark },
                  borderRadius: '10px', fontWeight: 600, textTransform: 'none',
                  py: { xs: 0.9, sm: 1, md: 1.1 },
                  fontSize: { xs: '0.78rem', sm: '0.82rem', md: '0.875rem' },
                  minHeight: { xs: 40, md: 'auto' },
                }}
              >
                Start Mock Interview
              </Button>
            </CardContent>
          </Card>

          {/* Quick Stats — stretches to fill remaining column height */}
          <Card elevation={0} sx={{ ...CARD_SX, flex: 1 }}>
            <CardContent sx={{
              p: { xs: 2, sm: 2.25, md: 2.75 },
              '&:last-child': { pb: { xs: 2, sm: 2.25, md: 2.75 } },
            }}>
              <SectionHeading title="Quick Stats" sx={{ mb: { xs: 1.5, sm: 1.75, md: 2 } }} />
              {[
                { label: 'Applications sent', value: dashboard?.applications_count ?? 0, icon: <Assignment sx={{ fontSize: 16 }} />, tint: T.sageText },
                { label: 'Jobs saved',         value: dashboard?.saved_count ?? 0,         icon: <Bookmark   sx={{ fontSize: 16 }} />, tint: T.pine },
              ].map(({ label, value, icon, tint }) => (
                <Box key={label} sx={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  py: { xs: 1.25, sm: 1.4, md: 1.5 },
                  borderBottom: `1px solid ${T.lineSoft}`,
                  '&:last-child': { borderBottom: 'none', pb: 0 },
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
                    <Box sx={{
                      width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      borderRadius: '8px', bgcolor: T.sageSoft, color: tint === '#7F9E7E' ? T.sageText : tint, flexShrink: 0,
                    }}>
                      {icon}
                    </Box>
                    <Typography sx={{
                      fontSize: { xs: '0.75rem', sm: '0.8rem', md: '0.85rem' },
                      color: T.body, fontWeight: 600, fontFamily: FONT,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {label}
                    </Typography>
                  </Box>
                  <Typography sx={{
                    fontWeight: 800, fontFamily: FONT,
                    fontSize: { xs: '0.95rem', sm: '1rem', md: '1.05rem' },
                    color: T.ink, flexShrink: 0,
                  }}>
                    {value}
                  </Typography>
                </Box>
              ))}
            </CardContent>
          </Card>

        </Box>
      </Box>
    </Box>
  );
};

export default JobseekerDashboard;