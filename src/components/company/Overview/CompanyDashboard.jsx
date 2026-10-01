import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Card, CardContent, LinearProgress,
  Chip, Button, Skeleton,
  Table, TableBody, TableCell, TableHead, TableRow,
  Avatar, Menu, MenuItem, Divider,
  useMediaQuery, useTheme,
} from '@mui/material';
import {
  People, Work, TrendingUp, Shield,
  ArrowForward, Business, CreditCard, Warning,
  ArrowUpward, WorkOffOutlined,
} from '@mui/icons-material';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Cell, Tooltip,
  PieChart, Pie, RadialBarChart, RadialBar, PolarAngleAxis,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCompanyDashboard } from '@/hooks/company/useCompanyDashboard';
import { formatRelativeTime, getInitials } from '@/utils/formatters';

// Registered routes (see AppRouter / Sidebar)
const ACTIVITY_LOG_PATH = '/company/activity-log';
const EMPLOYERS_PATH    = '/company/employers';

/* ── Landing-page theme tokens ─────────────────────────────────────────── *
 * EXACT mirror of JobseekerDashboard's T.* — canonical source:
 * src/components/jobseeker/LiveChat/theme.js
 * ──────────────────────────────────────────────────────────────────────── */
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

/* ── Shared card styles — identical to JobseekerDashboard ────────────── */
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

/* ── Status / Activity palette ───────────────────────────────────────── */
const STATUS_STYLE = {
  ACTIVE:   { bgcolor: '#EAF2E9', color: '#3E6E3E', border: '1px solid rgba(62,110,62,0.25)' },
  INACTIVE: { bgcolor: '#E8EFEF', color: T.faint,    border: `1px solid ${T.line}` },
  PENDING:  { bgcolor: '#F6ECDF', color: '#A35A2D',  border: '1px solid rgba(163,90,45,0.25)' },
};

const ACT_COLOR = {
  success: { bg: 'rgba(62,110,62,0.08)',   border: 'rgba(62,110,62,0.18)',   icon: '#3E6E3E' },
  info:    { bg: 'rgba(127,158,126,0.10)', border: 'rgba(127,158,126,0.22)', icon: T.sage    },
  error:   { bg: 'rgba(163,90,45,0.08)',   border: 'rgba(163,90,45,0.18)',   icon: '#A35A2D' },
};
const ACT_ICON_EL = {
  success: (c) => <Business   sx={{ fontSize: 16, color: c }} />,
  info:    (c) => <CreditCard sx={{ fontSize: 16, color: c }} />,
  error:   (c) => <Warning    sx={{ fontSize: 16, color: c }} />,
};

/* ── SectionHeading — sage accent bar (EXACT copy from JobseekerDashboard) */
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

/* ── StatCard (EXACT copy from JobseekerDashboard) ───────────────────── */
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

/* ── ChartTooltip ────────────────────────────────────────────────────── */
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
   CompanyDashboard
   — identical visual system to JobseekerDashboard, company data
   ═══════════════════════════════════════════════════════════════════════ */
const CompanyDashboard = () => {
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const theme     = useTheme();

  const isXxs = useMediaQuery('(max-width:240px)');

  const [anchor,  setAnchor]  = useState(null);
  const [actMem,  setActMem]  = useState(null);

  const {
    loading,
    data,
    employers = [],
    jobStats  = { active: 0, total: 0 },
  } = useCompanyDashboard();

  const team        = employers;
  const teamPreview = employers.slice(0, 3);
  const activity    = data?.activity || [];
  const usage       = Number(data?.monthly_usage ?? 0);

  /* ── Derived chart data ──────────────────────────────────────────────── */
  const workloadData = useMemo(
    () => [...team]
      .sort((a, b) => (Number(b.active_jobs) || 0) - (Number(a.active_jobs) || 0))
      .slice(0, 6)
      .map((m) => ({
        name: (m.full_name || '').split(' ')[0] || '—',
        jobs: Number(m.active_jobs) || 0,
      })),
    [team],
  );

  const statusData = useMemo(() => {
    const counts = { ACTIVE: 0, INACTIVE: 0, PENDING: 0 };
    team.forEach((m) => { counts[m.status] = (counts[m.status] || 0) + 1; });
    return [
      { name: 'Active',   value: counts.ACTIVE,   color: '#3E6E3E' },
      { name: 'Inactive', value: counts.INACTIVE, color: '#A8ADA8' },
      { name: 'Pending',  value: counts.PENDING,  color: '#A35A2D' },
    ].filter((d) => d.value > 0);
  }, [team]);

  const totalMembers = team.length;
  const usageColor   = usage >= 90 ? '#B4462F' : usage >= 70 ? '#A35A2D' : '#3E6E3E';
  const activeMembers = team.filter((m) => m.status === 'ACTIVE').length;

  /* ── Greeting — identical to JobseekerDashboard ─────────────────────── */
  const displayName = useMemo(() => {
    if (!user) return 'there';
    if (user.full_name && user.full_name.trim()) return user.full_name.trim();
    if (user.company_name && user.company_name.trim()) return user.company_name.trim();
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

  /* ── Skeleton — identical structure to JobseekerDashboard ───────────── */
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
        overflowX: 'hidden',
        maxWidth: { xl: '1600px' },
        mx: 'auto',
        fontFamily: FONT,
        color: T.body,
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

        <Typography sx={{
          mt: { xs: 0.5, sm: 0.75, md: 1 }, color: T.muted, fontFamily: FONT,
          fontSize: { xs: isXxs ? '0.7rem' : '0.8rem', sm: '0.875rem', md: '0.95rem' },
          animation: 'fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) 1.2s both',
          '@media (prefers-reduced-motion: reduce)': { animation: 'none', opacity: 1 },
        }}>
          Manage your organisation's hiring team, jobs, and subscription.
        </Typography>
      </Box>

      {/* ── Stat cards row — 4-col grid (3-col on sm, 2 on xs) ────────── */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'repeat(2, minmax(0, 1fr))',
          sm: 'repeat(4, minmax(0, 1fr))',
        },
        gap: { xs: 1.25, sm: 1.5, md: 2 },
        alignItems: 'stretch',
        mb: { xs: 1.25, sm: 1.5, md: 2 },
      }}>
        <StatCard
          label="Total Employers"
          value={employers.length}
          sub={`${activeMembers} active`}
          icon={<People />}
          accent={T.sageText}
          onClick={() => navigate(EMPLOYERS_PATH)}
        />

        <StatCard
          label="Active Job Posts"
          value={jobStats.active ?? 0}
          sub={`${jobStats.total ?? 0} total postings`}
          icon={<Work />}
          accent={T.sageText}
          onClick={() => navigate('/company/job-postings')}
        />

        {/* Monthly Usage — with progress bar like Profile Strength */}
        <Card
          elevation={0}
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
                Monthly Usage
              </Typography>
              <Box sx={{
                width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '10px', bgcolor: T.sageSoft, color: T.sageText,
                flexShrink: 0, '& svg': { fontSize: 18 },
              }}>
                <TrendingUp />
              </Box>
            </Box>

            <Box sx={{ flex: 1, display: 'flex', alignItems: 'flex-start' }}>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                <Typography sx={{
                  fontFamily: FONT, fontWeight: 800, color: T.ink, lineHeight: 1,
                  letterSpacing: '-0.02em',
                  fontSize: { xs: '1.75rem', sm: '2rem', md: '2.15rem' },
                }}>
                  {usage}
                </Typography>
                <Typography sx={{ fontSize: '1rem', fontWeight: 600, color: T.faint, fontFamily: FONT }}>%</Typography>
              </Box>
            </Box>

            <LinearProgress
              variant="determinate"
              value={usage}
              sx={{
                height: 6, borderRadius: 999, mb: 1, mt: 1,
                bgcolor: T.lineSoft,
                '& .MuiLinearProgress-bar': { bgcolor: usageColor, borderRadius: 999 },
              }}
            />
            <Typography sx={{
              fontSize: { xs: '0.7rem', sm: '0.72rem', md: '0.75rem' },
              color: T.muted, fontFamily: FONT, fontWeight: 500,
            }}>
              {Math.max(0, 100 - usage)}% capacity remaining
            </Typography>
          </CardContent>
        </Card>

        {/* Plan Status — pine card like AI Interview Prep */}
        <Card elevation={0} sx={{
          background: 'linear-gradient(160deg, #08302F 0%, #0E1E1D 70%, #121615 100%)',
          border: `1px solid ${T.pine2}`,
          borderRadius: '14px',
          position: 'relative', overflow: 'hidden',
          height: '100%', width: '100%', display: 'flex', flexDirection: 'column',
        }}>
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
                Plan Status
              </Typography>
              <Box sx={{
                width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '10px', bgcolor: 'rgba(127,158,126,0.12)',
                flexShrink: 0, '& svg': { fontSize: 18 },
              }}>
                <Shield sx={{ color: T.sage }} />
              </Box>
            </Box>

            <Box sx={{ flex: 1, display: 'flex', alignItems: 'flex-start' }}>
              <Typography sx={{
                fontFamily: FONT, fontWeight: 800, color: 'rgba(255,255,255,0.97)', lineHeight: 1,
                letterSpacing: '-0.02em',
                fontSize: { xs: '1.75rem', sm: '2rem', md: '2.15rem' },
              }}>
                {data?.plan ?? '—'}
              </Typography>
            </Box>

            <Typography sx={{
              mt: 1, fontSize: { xs: '0.7rem', sm: '0.72rem', md: '0.75rem' },
              color: 'rgba(255,255,255,0.55)', fontFamily: FONT, fontWeight: 500,
            }}>
              Renews in {data?.plan_renews_in ?? 0} days
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* ── Analytics row — 3-col grid, each in a Card ───────────────── */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', lg: 'repeat(3, minmax(0, 1fr))' },
        gap: { xs: 1.25, sm: 1.5, md: 2 },
        alignItems: 'stretch',
        mb: { xs: 1.25, sm: 1.5, md: 2 },
      }}>
        {/* Workload bar chart */}
        <Card elevation={0} sx={{ ...CARD_SX, height: '100%', gridColumn: { xs: 'auto', md: '1 / -1', lg: 'auto' } }}>
          <CardContent sx={{ p: { xs: 2, sm: 2.25, md: 2.75 }, '&:last-child': { pb: { xs: 2, sm: 2.25, md: 2.75 } } }}>
            <SectionHeading
              title="Team Workload"
              subtitle="Active jobs per recruiter"
              sx={{ mb: { xs: 1.5, sm: 1.75, md: 2 } }}
            />
            <Box sx={{ width: '100%', height: 220, minWidth: 0 }}>
              {workloadData.length === 0 ? (
                <Box sx={{
                  height: '100%', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 1,
                }}>
                  <Box sx={{
                    width: 48, height: 48, borderRadius: '14px',
                    bgcolor: T.sageSoft, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <WorkOffOutlined sx={{ fontSize: 22, color: T.sage }} />
                  </Box>
                  <Typography sx={{ fontSize: '0.85rem', color: T.muted, fontFamily: FONT, fontWeight: 500 }}>
                    No team data yet
                  </Typography>
                </Box>
              ) : (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <BarChart data={workloadData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} barCategoryGap="28%">
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: T.muted, fontFamily: FONT }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: T.muted, fontFamily: FONT }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: 'rgba(127,158,126,0.06)' }} content={<ChartTooltip suffix=" jobs" />} />
                    <Bar dataKey="jobs" radius={[6, 6, 0, 0]} maxBarSize={46}>
                      {workloadData.map((_, i) => (
                        <Cell key={i} fill={i % 2 ? T.sage : '#4E6E4D'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Box>
          </CardContent>
        </Card>

        {/* Team status donut */}
        <Card elevation={0} sx={{ ...CARD_SX, height: '100%' }}>
          <CardContent sx={{ p: { xs: 2, sm: 2.25, md: 2.75 }, '&:last-child': { pb: { xs: 2, sm: 2.25, md: 2.75 } } }}>
            <SectionHeading
              title="Team Status"
              subtitle="Member distribution"
              sx={{ mb: { xs: 1.5, sm: 1.75, md: 2 } }}
            />
            <Box sx={{ width: '100%', height: 200, position: 'relative' }}>
              {statusData.length === 0 ? (
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
                    No team data yet
                  </Typography>
                </Box>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <PieChart>
                      <Pie
                        data={statusData} dataKey="value" nameKey="name"
                        cx="50%" cy="50%" innerRadius={52} outerRadius={78}
                        paddingAngle={3} stroke="none"
                      >
                        {statusData.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <Tooltip content={<ChartTooltip suffix=" members" />} />
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
                    }}>{totalMembers}</Typography>
                    <Typography sx={{
                      fontSize: '0.62rem', color: T.faint, fontWeight: 800,
                      letterSpacing: '0.06em', textTransform: 'uppercase',
                      fontFamily: FONT,
                    }}>Members</Typography>
                  </Box>
                </>
              )}
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25, justifyContent: 'center', mt: 1 }}>
              {statusData.map((d) => (
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

        {/* AI usage gauge */}
        <Card elevation={0} sx={{ ...CARD_SX, height: '100%' }}>
          <CardContent sx={{ p: { xs: 2, sm: 2.25, md: 2.75 }, '&:last-child': { pb: { xs: 2, sm: 2.25, md: 2.75 } } }}>
            <SectionHeading
              title="AI Usage"
              subtitle="This billing cycle"
              sx={{ mb: { xs: 1.5, sm: 1.75, md: 2 } }}
            />
            <Box sx={{ width: '100%', height: 200, position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <RadialBarChart
                  innerRadius="68%" outerRadius="100%"
                  data={[{ name: 'usage', value: usage, fill: usageColor }]}
                  startAngle={90} endAngle={-270}
                >
                  <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                  <RadialBar background={{ fill: T.lineSoft }} dataKey="value" cornerRadius={12} />
                </RadialBarChart>
              </ResponsiveContainer>
              <Box sx={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%,-50%)', textAlign: 'center',
                pointerEvents: 'none',
              }}>
                <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 0.25 }}>
                  <Typography sx={{
                    fontSize: '1.6rem', fontWeight: 800, color: usageColor,
                    lineHeight: 1, fontFamily: FONT, letterSpacing: '-0.02em',
                  }}>{usage}</Typography>
                  <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: T.faint, fontFamily: FONT }}>%</Typography>
                </Box>
                <Typography sx={{
                  fontSize: '0.62rem', color: T.faint, fontWeight: 800,
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                  fontFamily: FONT,
                }}>Used</Typography>
              </Box>
            </Box>
            <Typography sx={{
              textAlign: 'center', fontSize: '0.74rem', color: T.muted,
              mt: 1, fontFamily: FONT, fontWeight: 500,
            }}>
              {usage >= 90 ? 'Nearing your monthly limit'
                : usage >= 70 ? 'Healthy usage this cycle'
                : 'Plenty of capacity remaining'}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* ── Team + Activity — 2fr / 1fr grid, stretch-aligned ────────── */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 2fr) minmax(0, 1fr)' },
        gap: { xs: 1.25, sm: 1.5, md: 2 },
        alignItems: 'stretch',
      }}>

        {/* ── Hiring Team (left) ─────────────────────────────────────── */}
        <Card elevation={0} sx={{ ...CARD_SX, height: '100%' }}>
          <CardContent sx={{ p: { xs: 2, sm: 2.25, md: 2.75 }, '&:last-child': { pb: { xs: 2, sm: 2.25, md: 2.75 } } }}>
            <SectionHeading
              title="Hiring Team"
              subtitle="Access and roles for your recruiters"
              sx={{
                mb: { xs: 2, sm: 2.25, md: 2.5 },
                pb: { xs: 1.5, sm: 1.75 },
                borderBottom: `1px solid ${T.lineSoft}`,
              }}
              action={
                <Button
                  endIcon={<ArrowForward sx={{ fontSize: { xs: 13, sm: 15, md: 16 } }} />}
                  size="small"
                  onClick={() => navigate(EMPLOYERS_PATH)}
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

            {teamPreview.length === 0 ? (
              <Box sx={{
                py: { xs: 4, sm: 6 }, textAlign: 'center',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5,
              }}>
                <Box sx={{
                  width: 56, height: 56, borderRadius: '16px',
                  bgcolor: T.sageSoft, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <People sx={{ fontSize: 26, color: T.sage }} />
                </Box>
                <Typography sx={{ fontWeight: 600, fontSize: '0.95rem', color: T.ink, fontFamily: FONT }}>
                  No employers yet
                </Typography>
                <Typography sx={{ fontSize: '0.8rem', color: T.muted, fontFamily: FONT, maxWidth: 320 }}>
                  Add employers to your organisation to start managing your hiring team.
                </Typography>
                <Button
                  variant="contained" disableElevation size="small"
                  onClick={() => navigate(EMPLOYERS_PATH)}
                  sx={{
                    mt: 0.5, bgcolor: T.sage, color: '#fff', fontFamily: FONT,
                    '&:hover': { bgcolor: T.sageDark },
                    borderRadius: '8px', fontWeight: 600, textTransform: 'none',
                  }}
                >
                  Add employers
                </Button>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1.25, sm: 1.5, md: 1.75 } }}>
                {teamPreview.map((member) => {
                  const st = STATUS_STYLE[member.status] || STATUS_STYLE.PENDING;
                  return (
                    <Box
                      key={member.id}
                      sx={{
                        p: { xs: 1.75, sm: 2, md: 2.25 },
                        border: `1px solid ${T.line}`,
                        borderRadius: '12px', bgcolor: T.surface,
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
                            src={member.photo || undefined}
                            sx={{
                              width: { xs: 38, sm: 42 }, height: { xs: 38, sm: 42 }, flexShrink: 0,
                              bgcolor: T.sageSoft, color: T.sageText,
                              fontWeight: 700, fontSize: { xs: '0.85rem', sm: '0.95rem' },
                              fontFamily: FONT, borderRadius: '10px',
                            }}
                            variant="rounded"
                          >{getInitials(member.full_name)}</Avatar>
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography sx={{
                              fontWeight: 700, mb: 0.25, fontFamily: FONT,
                              fontSize: { xs: '0.88rem', sm: '0.95rem', md: '1rem' },
                              color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap', lineHeight: 1.3,
                            }}>
                              {member.full_name}
                            </Typography>
                            <Typography sx={{
                              fontSize: { xs: '0.74rem', sm: '0.8rem' },
                              color: T.muted, fontFamily: FONT,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {member.email}
                            </Typography>
                          </Box>
                        </Box>
                        <Chip
                          label={member.status}
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
                          <Work sx={{ fontSize: { xs: 13, sm: 14 } }} />
                          <Typography sx={{
                            fontSize: { xs: '0.7rem', sm: '0.74rem' },
                            fontWeight: 500, fontFamily: FONT,
                          }}>
                            {member.role}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: T.muted, minWidth: 0 }}>
                          <TrendingUp sx={{ fontSize: { xs: 13, sm: 14 } }} />
                          <Typography sx={{
                            fontSize: { xs: '0.7rem', sm: '0.74rem' },
                            fontWeight: 500, fontFamily: FONT,
                          }}>
                            {member.active_jobs} active job{member.active_jobs === 1 ? '' : 's'}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            )}
          </CardContent>
        </Card>

        {/* ── Right column — stacked cards ───────────────────────────── */}
        <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, gap: { xs: 1.25, sm: 1.5, md: 2 } }}>

          {/* Recent Activity — matches Quick Stats pattern */}
          <Card elevation={0} sx={{ ...CARD_SX, flex: 1 }}>
            <CardContent sx={{
              p: { xs: 2, sm: 2.25, md: 2.75 },
              '&:last-child': { pb: { xs: 2, sm: 2.25, md: 2.75 } },
            }}>
              <SectionHeading
                title="Recent Activity"
                subtitle="System logs and updates"
                sx={{ mb: { xs: 1.5, sm: 1.75, md: 2 } }}
                action={
                  <Chip
                    label="● Live"
                    size="small"
                    sx={{
                      bgcolor: '#EAF2E9', color: '#3E6E3E', fontWeight: 700,
                      fontSize: '0.68rem', height: 22,
                      border: '1px solid rgba(62,110,62,0.25)',
                      borderRadius: '999px', fontFamily: FONT, flexShrink: 0,
                      '& .MuiChip-label': { px: 1 },
                    }}
                  />
                }
              />

              {activity.length === 0 ? (
                <Box sx={{
                  py: { xs: 3, sm: 4 }, textAlign: 'center',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                }}>
                  <Box sx={{
                    width: 48, height: 48, borderRadius: '14px',
                    bgcolor: T.sageSoft, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <TrendingUp sx={{ fontSize: 22, color: T.sage }} />
                  </Box>
                  <Typography sx={{ fontSize: '0.85rem', color: T.muted, fontFamily: FONT, fontWeight: 500 }}>
                    No recent activity
                  </Typography>
                </Box>
              ) : activity.map((act, i) => {
                const { bg, border, icon: iconColor } = ACT_COLOR[act.type] || ACT_COLOR.info;
                return (
                  <Box key={act.id} sx={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    py: { xs: 1.25, sm: 1.4, md: 1.5 },
                    borderBottom: `1px solid ${T.lineSoft}`,
                    '&:last-child': { borderBottom: 'none', pb: 0 },
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0, flex: 1 }}>
                      <Box sx={{
                        width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRadius: '8px', bgcolor: bg, border: `1.5px solid ${border}`,
                        flexShrink: 0,
                      }}>
                        {ACT_ICON_EL[act.type]?.(iconColor)}
                      </Box>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography sx={{
                          fontSize: { xs: '0.75rem', sm: '0.8rem', md: '0.85rem' },
                          color: T.body, fontWeight: 600, fontFamily: FONT,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {act.message}
                        </Typography>
                        <Typography sx={{
                          fontSize: { xs: '0.65rem', sm: '0.7rem' },
                          color: T.faint, fontFamily: FONT, fontWeight: 400,
                        }}>
                          {formatRelativeTime(act.time)}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                );
              })}

              {activity.length > 0 && (
                <Box sx={{ mt: 1.5 }}>
                  <Button
                    fullWidth
                    endIcon={<ArrowForward sx={{ fontSize: 14 }} />}
                    onClick={() => navigate(ACTIVITY_LOG_PATH)}
                    sx={{
                      color: T.sageText, fontWeight: 600, fontFamily: FONT,
                      textTransform: 'none', fontSize: '0.82rem',
                      borderRadius: '10px', border: `1px solid ${T.line}`,
                      bgcolor: T.sageSoft,
                      '&:hover': { bgcolor: '#DDE9DC', borderColor: T.sage },
                      py: 0.9, transition: 'all 0.18s',
                    }}
                  >
                    View All Logs
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Team member action menu */}
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        slotProps={{
          paper: {
            sx: {
              borderRadius: '12px', border: `1px solid ${T.line}`,
              boxShadow: '0 10px 36px rgba(2,33,36,0.12)',
              minWidth: 168, mt: 0.5, p: 0.5, fontFamily: FONT,
            },
          },
        }}
      >
        <MenuItem sx={{
          fontSize: '0.875rem', color: T.ink, borderRadius: '8px',
          py: 1, fontFamily: FONT,
          '&:hover': { bgcolor: 'rgba(127,158,126,0.08)' },
        }}>Edit Role</MenuItem>
        <MenuItem sx={{
          fontSize: '0.875rem', color: T.ink, borderRadius: '8px',
          py: 1, fontFamily: FONT,
          '&:hover': { bgcolor: 'rgba(127,158,126,0.08)' },
        }}>
          {actMem?.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
        </MenuItem>
        <Divider sx={{ borderColor: T.lineSoft, my: 0.5 }} />
        <MenuItem sx={{
          fontSize: '0.875rem', color: '#B4462F', borderRadius: '8px',
          py: 1, fontFamily: FONT,
          '&:hover': { bgcolor: 'rgba(180,70,47,0.05)' },
        }}>Remove</MenuItem>
      </Menu>
    </Box>
  );
};

export default CompanyDashboard;