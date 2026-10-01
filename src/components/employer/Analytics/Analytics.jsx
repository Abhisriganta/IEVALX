import React, { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Chip, Stack,
  Select, MenuItem, FormControl, CircularProgress, Alert,
} from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
  LabelList,
} from 'recharts';
import {
  TrendingUp, People, Work, CheckCircle,
  ArrowUpward, AccessTime, EventBusy, HourglassEmpty,
} from '@mui/icons-material';
import { useEmployerAnalytics } from '@/hooks/employer/useEmployerAnalytics';

// ─────────────────────────────────────────────────────────────────────────────
// Design tokens
// ─────────────────────────────────────────────────────────────────────────────
const FONT = "'Jost','DM Sans',sans-serif";

const T = {
  navy:        '#022124',                 
  navyHover:   '#0A3F42',
  navyLight:   'rgba(2,33,36,0.06)',
  blue:        '#5E815D',                 
  blueLight:   '#EDF3EC',               
  pageBg:      '#F6F8F3',                 
  surface:     '#FFFFFF',
  border:      '#E7EAE3',
  borderHover: '#D8DDD4',
  textPrimary: '#101210',                 
  textSecond:  '#2F332E',                 
  textMuted:   '#7A7E76',                 
  success:     '#3E6E3E',               
  successBg:   '#EAF2E9',                 
  successBdr:  'rgba(62,110,62,0.25)',
  warn:        '#A35A2D',                 
  warnBg:      '#F6ECDF',                 
  warnBdr:     'rgba(163,90,45,0.25)',
};

const CHART_PRIMARY   = '#022124';        // pine
const CHART_SECONDARY = '#5E815D';        // sageText
const CHART_ACCENT    = '#7F9E7E';        // sage
const FUNNEL_COLORS   = ['#022124', '#24433E', '#4E6E4D', '#7F9E7E', '#A9C0A8'];

// Round-type bar colours for the interview attendance card.
const OUTCOME_COMPLETED  = '#3E6E3E';
const OUTCOME_NO_ATTEMPT = '#B4462F';

const labelSx = {
  fontSize: '0.65rem', fontWeight: 700, color: T.textMuted,
  textTransform: 'uppercase', letterSpacing: '0.1em',
};

// ─────────────────────────────────────────────────────────────────────────────
// Custom tooltip
// ─────────────────────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <Box sx={{
      bgcolor: T.navy, color: '#FFFFFF',
      px: 1.5, py: 1, borderRadius: '8px',
      boxShadow: '0 6px 22px rgba(2,33,36,0.18)',
      border: `1px solid ${T.navyHover}`,
      minWidth: 120,
    }}>
      <Typography sx={{ color: '#FFFFFF', fontWeight: 700, fontSize: '0.75rem', mb: 0.5 }}>
        {label}
      </Typography>
      {payload.map(p => (
        <Stack key={p.name} direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.25 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '2px', bgcolor: p.fill || p.color }} />
          <Typography sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.72rem' }}>
            {p.name}: <strong style={{ color: '#FFFFFF' }}>{p.value}</strong>
          </Typography>
        </Stack>
      ))}
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Stat card
// ─────────────────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, icon: Icon, trend, accent = T.navy }) => (
  <Card elevation={0} sx={{
    position: 'relative',
    border: `1px solid ${T.border}`,
    borderRadius: '14px',
    bgcolor: T.surface,
    overflow: 'hidden',
    transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
    '&:hover': {
      transform: 'translateY(-2px)',
      borderColor: T.borderHover,
      boxShadow: '0 8px 24px rgba(2,33,36,0.08)',
    },
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0, left: 0, bottom: 0,
      width: 3,
      bgcolor: accent,
    },
  }}>
    <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ ...labelSx, mb: 0.75 }}>{label}</Typography>
          <Typography sx={{
            fontSize: '1.85rem', fontWeight: 800, color: T.textPrimary,
            lineHeight: 1, letterSpacing: '-0.02em',
          }}>
            {value}
          </Typography>
          {sub && (
            <Typography sx={{ fontSize: '0.72rem', color: T.textMuted, mt: 0.6 }}>
              {sub}
            </Typography>
          )}
        </Box>
      </Stack>
      {trend && (
        <Chip
          icon={<ArrowUpward sx={{ fontSize: 11 }} />}
          label={trend}
          size="small"
          sx={{
            height: 20, fontSize: '0.66rem', fontWeight: 700,
            bgcolor: T.successBg, color: T.success,
            border: `1px solid ${T.successBdr}`,
            borderRadius: '6px',
            '& .MuiChip-icon': { color: T.success, ml: '6px' },
          }}
        />
      )}
    </CardContent>
  </Card>
);

// ─────────────────────────────────────────────────────────────────────────────
// Section card
// ─────────────────────────────────────────────────────────────────────────────
const SectionCard = ({ title, subtitle, action, children, sx = {} }) => (
  <Card elevation={0} sx={{
    border: `1px solid ${T.border}`,
    borderRadius: '14px',
    bgcolor: T.surface,
    height: '100%',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
    '&:hover': { borderColor: '#7F9E7E', boxShadow: '0 2px 14px rgba(2,33,36,0.06)' },
    ...sx,
  }}>
    <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
      <Stack direction="row" alignItems="flex-start" sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'stretch', gap: 1.25, flex: 1, minWidth: 0 }}>
          <Box sx={{
            width: 4, bgcolor: '#7F9E7E', borderRadius: '2px',
            alignSelf: 'stretch', minHeight: 22, flexShrink: 0,
          }} />
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{
              fontSize: '0.95rem', fontWeight: 800, color: T.textPrimary,
              lineHeight: 1.3, letterSpacing: '-0.01em',
            }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography sx={{ fontSize: '0.72rem', color: T.textMuted, mt: 0.3 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>
        {action}
      </Stack>
      {children}
    </CardContent>
  </Card>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
const Analytics = () => {
  const [period, setPeriod] = useState('6m');
  const { data, loading, error } = useEmployerAnalytics(period);

  // Derive live chart data from API — empty arrays while loading
  const stats           = data?.stats                || {};
  const APPLICANTS_DATA = data?.applicants_over_time || [];
  const FUNNEL_DATA     = (data?.hiring_funnel       || []).map(f => ({ name: f.stage, value: f.count }));
  const SCORE_DIST      = (data?.ai_score_distribution || []).map(d => ({ range: d.range, count: d.count }));
  const OUTCOMES      = data?.interview_outcomes || [];
  const IV_TOTALS     = data?.interview_totals   || {};
  const JOB_PERF      = data?.job_performance    || [];
  const STAGE_AGING   = data?.stage_aging        || [];
  const AI_SCREEN     = data?.ai_screen          || {};
  const staleDays     = data?.stale_days ?? 7;
  const totalStale    = STAGE_AGING.reduce((s, r) => s + (r.stale_count || 0), 0);

  // ── Stat card values ──────────────────────────────────────────────────────
  const totalApplicants = loading ? '…' : String(stats.total_applicants ?? 0);

  const vsPct = stats.vs_last_period_pct;
  const applicantsTrend = vsPct != null
    ? `${vsPct >= 0 ? '+' : ''}${vsPct}% vs last period`
    : null;

  const activeJobs   = loading ? '…' : String(stats.active_jobs ?? 0);
  const pendingCount = stats.pending_approval ?? 0;
  const activeJobSub = pendingCount ? `${pendingCount} pending approval` : 'No pending';

  const hired      = stats.hired_this_period ?? 0;
  const hireTarget = stats.hire_target ?? 10;
  const hiredValue = loading ? '…' : String(hired);
  const hiredTrend = hireTarget
    ? `${Math.round((hired / hireTarget) * 100)}% of target`
    : null;

  const tth         = stats.avg_time_to_hire_days;
  const industryAvg = stats.industry_avg_days ?? 24;
  const tthValue    = loading ? '…' : (tth != null ? `${tth}d` : '—');
  const tthTrend    = (tth != null && tth < industryAvg)
    ? `${Math.round(((industryAvg - tth) / industryAvg) * 100)}% faster`
    : null;

  return (
    <Box className="page-fade-in" sx={{
      p: { xs: 1.5, sm: 2, md: 3, lg: 4 },
      maxWidth: 1440, mx: 'auto',
      bgcolor: T.pageBg, minHeight: '100vh',
      fontFamily: FONT,
      '& .MuiTypography-root, & .MuiButton-root, & .MuiChip-root, & .MuiInputBase-root, & .MuiMenuItem-root, & .MuiPaginationItem-root': {
        fontFamily: FONT,
      },
    }}>

      {/* ── Hero header ────────────────────────────────────────────── */}
      <Card elevation={0} sx={{ bgcolor: T.surface, border: `1px solid ${T.border}`, borderRadius: { xs: '14px', sm: '16px' }, p: { xs: 2, sm: 2.5, md: 3 }, mb: { xs: 2, md: 2.5 }, boxShadow: '0 1px 2px rgba(16,18,16,0.04)' }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={1.5}
        sx={{ mb: 3, width: '100%' }}
      >
        <Box sx={{ flex: 1 }}>
          <Typography component="h1" sx={{
            fontWeight: 700, color: T.textPrimary, letterSpacing: '-0.02em', lineHeight: 1.15,
            fontSize: { xs: '1.3rem', sm: '1.45rem', md: '1.6rem' },
          }}>
            Analytics
          </Typography>
          <Typography sx={{ color: T.textMuted, fontSize: { xs: '0.82rem', sm: '0.9rem' }, fontWeight: 500, mt: 0.5 }}>
            <Box component="span" sx={{ color: T.blue, fontWeight: 700 }}>Hiring performance</Box> overview
          </Typography>
        </Box>

        <FormControl size="small" sx={{ minWidth: 160, ml: 'auto', alignSelf: { xs: 'flex-start', sm: 'center' } }}>
          <Select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            startAdornment={<AccessTime sx={{ fontSize: 16, color: T.textMuted, mr: 1 }} />}
            sx={{
              bgcolor: T.pageBg,
              borderRadius: '25px',
              fontSize: '0.88rem',
              fontWeight: 700,
              color: T.textPrimary,
              height: { xs: 42, md: 46 },
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              '& fieldset':             { borderColor: '#B0BEC5', borderWidth: '1.5px' },
              '&:hover fieldset':       { borderColor: '#78909C' },
              '&.Mui-focused fieldset': { borderColor: '#7F9E7E', borderWidth: '2px' },
              '& .MuiSelect-select':    { py: '8px' },
            }}
            MenuProps={{
              disableScrollLock: true,
              sx: { '& .MuiPaper-root': { borderRadius: '9px', mt: '4px', boxShadow: '0 4px 18px rgba(0,0,0,0.10)' } },
            }}
          >
            <MenuItem value="1m" sx={{ fontSize: '0.82rem' }}>Last Month</MenuItem>
            <MenuItem value="3m" sx={{ fontSize: '0.82rem' }}>Last 3 Months</MenuItem>
            <MenuItem value="6m" sx={{ fontSize: '0.82rem' }}>Last 6 Months</MenuItem>
            <MenuItem value="1y" sx={{ fontSize: '0.82rem' }}>Last Year</MenuItem>
          </Select>
        </FormControl>
      </Stack>
      </Card>

      {/* ── Error banner ────────────────────────────────────────────────── */}
      {error && (
        <Alert severity="error" sx={{ mb: 2.5, borderRadius: '10px', bgcolor: '#FAEAE8', color: '#A63D2F', fontFamily: FONT, '& .MuiAlert-icon': { color: '#A63D2F' } }}>
          {error}
        </Alert>
      )}

      {/* ── Stat cards ──────────────────────────────────────────────────── */}
      <Grid container spacing={{ xs: 1.5, sm: 2 }} sx={{ mb: { xs: 2, md: 2.5 } }}>
        {[
         { label: 'Total Applicants',  value: totalApplicants, sub: 'This period',           icon: People,      trend: applicantsTrend, accent: T.navy    },
          { label: 'Active Job Posts',  value: activeJobs,      sub: activeJobSub,             icon: Work,        trend: null,            accent: T.blue    },
          { label: 'Hired this Period', value: hiredValue,      sub: `Target: ${hireTarget}`,  icon: CheckCircle, trend: hiredTrend,       accent: T.success },
          { label: 'Stalled Candidates', value: loading ? '…' : String(totalStale), sub: `Idle over ${staleDays} days`, icon: HourglassEmpty, trend: null, accent: T.warn },
        ].map((c) => (
          <Grid key={c.label} size={{ xs: 6, sm: 6, md: 3 }}>
            <StatCard {...c} />
          </Grid>
        ))}
      </Grid>

      {/* ── Loading spinner (charts only) ───────────────────────────────── */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={36} sx={{ color: '#7F9E7E' }} />
        </Box>
      ) : (
        <Grid container spacing={{ xs: 1.5, sm: 2 }}>

          {/* Applicants & Hires Over Time */}
          <Grid size={{ xs: 12 }}>
            <SectionCard
              title="Applicants & Hires Over Time"
              subtitle="Monthly inflow and successful hires"
              action={
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Stack direction="row" spacing={0.6} alignItems="center">
                    <Box sx={{ width: 9, height: 9, borderRadius: '2px', bgcolor: CHART_SECONDARY }} />
                    <Typography sx={{ fontSize: '0.7rem', color: T.textSecond, fontWeight: 600 }}>Applicants</Typography>
                  </Stack>
                  <Stack direction="row" spacing={0.6} alignItems="center">
                    <Box sx={{ width: 9, height: 9, borderRadius: '2px', bgcolor: CHART_PRIMARY }} />
                    <Typography sx={{ fontSize: '0.7rem', color: T.textSecond, fontWeight: 600 }}>Hired</Typography>
                  </Stack>
                </Stack>
              }
            >
              {APPLICANTS_DATA.length === 0 ? (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 260 }}>
                  <Typography sx={{ color: T.textMuted, fontSize: '0.85rem' }}>No data for this period</Typography>
                </Box>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={APPLICANTS_DATA} barGap={6} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="grad-applicants" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor={CHART_SECONDARY} stopOpacity={1} />
                        <stop offset="100%" stopColor={CHART_SECONDARY} stopOpacity={0.55} />
                      </linearGradient>
                      <linearGradient id="grad-hired" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor={CHART_PRIMARY} stopOpacity={1} />
                        <stop offset="100%" stopColor={CHART_PRIMARY} stopOpacity={0.7} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
                    <XAxis dataKey="month" axisLine={false} tickLine={false}
                      tick={{ fontSize: 11, fill: T.textMuted, fontWeight: 600 }} />
                    <YAxis axisLine={false} tickLine={false}
                      tick={{ fontSize: 11, fill: T.textMuted }} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: T.navyLight }} />
                    <Bar dataKey="applicants" name="Applicants" fill="url(#grad-applicants)" radius={[6, 6, 0, 0]} maxBarSize={36} />
                    <Bar dataKey="hired"      name="Hired"      fill="url(#grad-hired)"      radius={[6, 6, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </SectionCard>
          </Grid>

          {/* Hiring Funnel */}
          <Grid size={{ xs: 12, md: 6 }}>
            <SectionCard title="Hiring Funnel" subtitle="Candidate progression through stages">
              {FUNNEL_DATA.length === 0 || FUNNEL_DATA[0]?.value === 0 ? (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
                  <Typography sx={{ color: T.textMuted, fontSize: '0.85rem' }}>No applicants for this period</Typography>
                </Box>
              ) : (
                <Stack spacing={2}>
                  {FUNNEL_DATA.map((stage, i) => {
                    const pct      = FUNNEL_DATA[0].value > 0 ? (stage.value / FUNNEL_DATA[0].value) * 100 : 0;
                    const movedFwd = i < FUNNEL_DATA.length - 1 && stage.value > 0
                      ? Math.round((FUNNEL_DATA[i + 1].value / stage.value) * 100)
                      : null;
                    const color = FUNNEL_COLORS[i];
                    return (
                      <Box key={stage.name}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.6, width: '100%', gap: 1 }}>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{
                              width: 20, height: 20, borderRadius: '5px',
                              bgcolor: color + '18', color, border: `1px solid ${color}30`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.65rem', fontWeight: 800,
                              flexShrink: 0,
                            }}>
                              {i + 1}
                            </Box>
                            <Typography sx={{ fontSize: '0.82rem', color: T.textPrimary, fontWeight: 600 }}>
                              {stage.name}
                            </Typography>
                          </Stack>
                          <Typography sx={{ fontSize: '0.92rem', color: T.textPrimary, fontWeight: 800, flexShrink: 0, ml: 'auto' }}>
                            {stage.value}
                          </Typography>
                        </Stack>
                        <Box sx={{ height: 10, bgcolor: T.pageBg, borderRadius: '6px', overflow: 'hidden' }}>
                          <Box sx={{
                            height: '100%', width: `${pct}%`,
                            background: `linear-gradient(90deg, ${color}, ${color}CC)`,
                            borderRadius: '6px',
                            transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                          }} />
                        </Box>
                        {movedFwd !== null && (
                          <Stack direction="row" justifyContent="flex-end" alignItems="center" sx={{ mt: 0.4 }}>
                            <ArrowUpward sx={{ fontSize: 10, color: T.textMuted, transform: 'rotate(45deg)', mr: 0.3 }} />
                            <Typography sx={{ fontSize: '0.66rem', color: T.textMuted, fontWeight: 600 }}>
                              {movedFwd}% moved forward
                            </Typography>
                          </Stack>
                        )}
                      </Box>
                    );
                  })}
                </Stack>
              )}

            </SectionCard>
          </Grid>

          {/* AI Score Distribution */}
          <Grid size={{ xs: 12, md: 6 }}>
            <SectionCard title="AI Score Distribution" subtitle="Candidates grouped by resume match score">
              {SCORE_DIST.length === 0 || SCORE_DIST.every(d => d.count === 0) ? (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 250 }}>
                  <Typography sx={{ color: T.textMuted, fontSize: '0.85rem' }}>No scored applications yet</Typography>
                </Box>
              ) : (
                <ResponsiveContainer width="100%" height={270}>
                  <BarChart data={SCORE_DIST} margin={{ top: 18, right: 8, left: 5, bottom: 20 }}>
                    <defs>
                      <linearGradient id="grad-score" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor={CHART_ACCENT}   stopOpacity={1} />
                        <stop offset="100%" stopColor={CHART_PRIMARY}  stopOpacity={0.85} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
                    <XAxis dataKey="range" axisLine={false} tickLine={false}
                      tick={{ fontSize: 11, fill: T.textMuted, fontWeight: 600 }}
                      label={{ value: 'Score range', position: 'insideBottom', offset: -8, style: { fontSize: 11, fill: T.textSecond, fontWeight: 700 } }} />
                    <YAxis axisLine={false} tickLine={false}
                      tick={{ fontSize: 11, fill: T.textMuted }}
                      label={{ value: 'Candidates', angle: -90, position: 'insideLeft', offset: 15, style: { fontSize: 11, fill: T.textSecond, fontWeight: 700, textAnchor: 'middle' } }} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: T.navyLight }} />
                    <Bar dataKey="count" name="Candidates" fill="url(#grad-score)" radius={[6, 6, 0, 0]} maxBarSize={56}>
                      <LabelList dataKey="count" position="top"
                        style={{ fill: T.textSecond, fontSize: 11, fontWeight: 700 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </SectionCard>
          </Grid>

          {/* Interview Attendance */}
          <Grid size={{ xs: 12, md: 6 }}>
            <SectionCard
              title="Interview Attendance"
              subtitle="Completed vs no-show, by round type"
              action={
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Stack direction="row" spacing={0.6} alignItems="center">
                    <Box sx={{ width: 9, height: 9, borderRadius: '2px', bgcolor: OUTCOME_COMPLETED }} />
                    <Typography sx={{ fontSize: '0.7rem', color: T.textSecond, fontWeight: 600 }}>Completed</Typography>
                  </Stack>
                  <Stack direction="row" spacing={0.6} alignItems="center">
                    <Box sx={{ width: 9, height: 9, borderRadius: '2px', bgcolor: OUTCOME_NO_ATTEMPT }} />
                    <Typography sx={{ fontSize: '0.7rem', color: T.textSecond, fontWeight: 600 }}>No attempt</Typography>
                  </Stack>
                </Stack>
              }
            >
              {OUTCOMES.length === 0 ? (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 250 }}>
                  <Typography sx={{ color: T.textMuted, fontSize: '0.85rem' }}>No interviews scheduled in this period</Typography>
                </Box>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={OUTCOMES} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
                    <XAxis dataKey="type_label" axisLine={false} tickLine={false}
                      tick={{ fontSize: 11, fill: T.textMuted, fontWeight: 600 }} />
                    <YAxis axisLine={false} tickLine={false} allowDecimals={false}
                      tick={{ fontSize: 11, fill: T.textMuted }} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: T.navyLight }} />
                    <Bar dataKey="completed"  name="Completed"  stackId="iv" fill={OUTCOME_COMPLETED}  maxBarSize={40} />
                    <Bar dataKey="no_attempt" name="No attempt" stackId="iv" fill={OUTCOME_NO_ATTEMPT} radius={[6, 6, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </SectionCard>
          </Grid>

          {/* Stage Aging */}
          <Grid size={{ xs: 12, md: 6 }}>
            <SectionCard title="Stage Aging" subtitle={`Candidates idle over ${staleDays} days need attention`}>
              {STAGE_AGING.length === 0 ? (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
                  <Typography sx={{ color: T.textMuted, fontSize: '0.85rem' }}>Nothing in the pipeline</Typography>
                </Box>
              ) : (
                <Stack spacing={0}>
                  {STAGE_AGING.map((row) => {
                    const hot = row.stale_pct >= 50;
                    return (
                      <Stack key={row.status} direction="row" justifyContent="space-between" alignItems="center"
                        sx={{ py: 1.25, borderTop: `1px solid ${T.border}`, width: '100%', gap: 1 }}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography sx={{ fontSize: '0.82rem', color: T.textPrimary, fontWeight: 600 }}>
                            {row.status}
                          </Typography>
                          <Typography sx={{ fontSize: '0.7rem', color: T.textMuted, mt: 0.2 }}>
                            avg {row.avg_days_idle}d idle · longest {row.max_days_idle}d
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ flexShrink: 0, ml: 'auto' }}>
                          <Typography sx={{ fontSize: '0.92rem', color: T.textPrimary, fontWeight: 800 }}>
                            {row.count}
                          </Typography>
                          {row.stale_count > 0 && (
                            <Chip
                              label={`${row.stale_count} stale`}
                              size="small"
                              sx={{
                                height: 20, fontSize: '0.66rem', fontWeight: 700, borderRadius: '6px',
                                bgcolor: hot ? '#FEF2F2' : T.warnBg,
                                color:   hot ? '#B4462F' : T.warn,
                                border:  `1px solid ${hot ? '#FECACA' : T.warnBdr}`,
                              }}
                            />
                          )}
                        </Stack>
                      </Stack>
                    );
                  })}
                </Stack>
              )}
            </SectionCard>
          </Grid>

          {/* Job Performance */}
          <Grid size={{ xs: 12 }}>
            <SectionCard title="Job Performance" subtitle="Which postings are pulling their weight">
              {JOB_PERF.length === 0 ? (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 140 }}>
                  <Typography sx={{ color: T.textMuted, fontSize: '0.85rem' }}>No job postings yet</Typography>
                </Box>
              ) : (
                <Box sx={{ overflowX: 'auto' }}>
                  <Box component="table" sx={{ width: '100%', minWidth: 560, borderCollapse: 'collapse' }}>
                    <Box component="thead">
                      <Box component="tr">
                        {['Role', 'Applicants', 'Per day', 'AI pass', 'Shortlisted', 'Days live'].map((h, i) => (
                          <Box component="th" key={h}
                            sx={{ ...labelSx, textAlign: i === 0 ? 'left' : 'right', pb: 1, whiteSpace: 'nowrap' }}>
                            {h}
                          </Box>
                        ))}
                      </Box>
                    </Box>
                    <Box component="tbody">
                      {JOB_PERF.map((j) => (
                        <Box component="tr" key={j.id} sx={{ borderTop: `1px solid ${T.border}` }}>
                          <Box component="td" sx={{ py: 1.1, fontSize: '0.82rem', color: T.textPrimary, fontWeight: 600 }}>
                            {j.title}
                          </Box>
                          <Box component="td" sx={{ py: 1.1, fontSize: '0.82rem', color: T.textPrimary, textAlign: 'right' }}>
                            {j.applicants}
                          </Box>
                          <Box component="td" sx={{ py: 1.1, fontSize: '0.82rem', color: T.textSecond, textAlign: 'right' }}>
                            {j.applicants_per_day}
                          </Box>
                          <Box component="td" sx={{ py: 1.1, fontSize: '0.82rem', textAlign: 'right', color: j.ai_pass_rate_pct === 0 ? T.textMuted : T.textPrimary }}>
                            {j.ai_pass_rate_pct}%
                          </Box>
                          <Box component="td" sx={{ py: 1.1, fontSize: '0.82rem', color: T.textSecond, textAlign: 'right' }}>
                            {j.shortlisted}
                          </Box>
                          <Box component="td" sx={{ py: 1.1, fontSize: '0.82rem', color: T.textSecond, textAlign: 'right' }}>
                            {j.days_live}
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                </Box>
              )}
            </SectionCard>
          </Grid>

        </Grid>
      )}

      {/* Bottom spacer */}
      <Box sx={{ pb: { xs: 3, md: 4 } }} />
    </Box>
  );
};

export default Analytics;