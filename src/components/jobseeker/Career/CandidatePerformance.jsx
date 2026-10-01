import React from 'react';
import {
  Box, Paper, Typography, Grid, Stack,
  CircularProgress, Alert, Chip, Divider, IconButton, Tooltip,
} from '@mui/material';
import {
  TrendingUp, EmojiEvents, WorkOutlined, AssignmentTurnedIn,
  ThumbUpOutlined, ThumbDownOutlined, HourglassEmpty,
  CheckCircleOutlined, BarChartOutlined, StarOutlined,
  RefreshOutlined, CancelOutlined,
} from '@mui/icons-material';
import useCandidatePerformance from '@/hooks/jobseeker/useCandidatePerformance';


const FONT = "'Jost','DM Sans',sans-serif";
const BRAND = {
  ink: '#101210', navy: '#022124', navyDark: '#0A3A38',
  sage: '#7F9E7E', sageText: '#5E815D', sageSoft: '#EDF3EC',
  border: '#E7EAE3', borderStrong: '#D8DDD4',
  muted: '#55584F', bg: '#F6F8F3', surface: '#FFFFFF',
};


const POS   = '#4A7C59'; 
const WARN  = '#9C7A2E'; 
const NEG   = '#A63D2F'; 
const STEEL = '#3D6B8E';

const POS_BG  = '#EDF4EF';
const WARN_BG = '#FBF5E6';
const NEG_BG  = '#FAEAE8';
const STEEL_BG= '#EBF1F6';

const rate = (v) => (v >= 60 ? { c: POS, bg: POS_BG } : v >= 30 ? { c: WARN, bg: WARN_BG } : { c: NEG, bg: NEG_BG });

const TRACK_COLORS = ['#022124', '#0A3A38', '#24433E', '#3E6E3E', BRAND.sageText, BRAND.sage];

const fontSx = {
  fontFamily: FONT,
  '& .MuiTypography-root, & .MuiChip-root': { fontFamily: FONT },
};

/* ── Card shell ─────────────────────────────────────────────────────────── */
const Panel = ({ children, sx = {} }) => (
  <Paper
    elevation={0}
    sx={{
      borderRadius: '16px',
      border: `1px solid ${BRAND.border}`,
      bgcolor: BRAND.surface,
      boxShadow: '0 1px 2px rgba(16,18,16,0.04)',
      overflow: 'hidden',
      ...fontSx,
      ...sx,
    }}
  >
    {children}
  </Paper>
);

const SectionHeading = ({ icon: Icon, children, right = null }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.25 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.1 }}>
      <Box sx={{
        width: 30, height: 30, borderRadius: '9px',
        bgcolor: BRAND.sageSoft,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon sx={{ fontSize: 15, color: BRAND.navy }} />
      </Box>
      <Typography sx={{ fontWeight: 700, color: BRAND.ink, fontSize: '0.94rem', letterSpacing: '-0.01em' }}>
        {children}
      </Typography>
    </Box>
    {right}
  </Box>
);

/* ── Top KPI tile ───────────────────────────────────────────────────────── */
const StatTile = ({ icon: Icon, label, value, sublabel, color }) => (
  <Panel sx={{ height: '100%' }}>
    <Box sx={{ p: { xs: 2, md: 2.5 } }}>
      <Box sx={{
        width: 38, height: 38, borderRadius: '10px',
        bgcolor: `${color}14`, border: `1px solid ${color}28`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.5,
      }}>
        <Icon sx={{ fontSize: 18, color }} />
      </Box>
      <Typography sx={{ fontSize: { xs: '1.4rem', md: '1.6rem' }, fontWeight: 700, color: BRAND.ink, lineHeight: 1, letterSpacing: '-0.02em', mb: 0.5 }}>
        {value}
      </Typography>
      <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: BRAND.muted, mb: 0.2 }}>
        {label}
      </Typography>
      {sublabel && (
        <Typography sx={{ fontSize: '0.68rem', color: BRAND.muted, opacity: 0.75 }}>
          {sublabel}
        </Typography>
      )}
    </Box>
  </Panel>
);

/* ── Score row: label · pill · thin bar ────────────────────────────────── */
const ScoreRow = ({ label, value }) => {
  const { c, bg } = rate(value);
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
        <Typography sx={{ fontSize: '0.83rem', fontWeight: 600, color: BRAND.ink }}>{label}</Typography>
        <Box sx={{ px: 1.2, py: 0.25, borderRadius: '999px', bgcolor: bg }}>
          <Typography sx={{ fontSize: '0.74rem', fontWeight: 700, color: c }}>{value}%</Typography>
        </Box>
      </Box>
      <Box sx={{ height: 5, borderRadius: 3, bgcolor: BRAND.sageSoft, overflow: 'hidden' }}>
        <Box sx={{ height: '100%', width: `${Math.min(value, 100)}%`, borderRadius: 3, bgcolor: c }} />
      </Box>
    </Box>
  );
};

/* ── Decision ledger row ────────────────────────────────────────────────── */
const DecisionRow = ({ icon: Icon, label, count, total, color, bg }) => (
  <Box sx={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    px: 1.4, py: 1,
    borderRadius: '12px',
    bgcolor: bg,
    border: `1px solid ${color}22`,
  }}>
    <Stack direction="row" spacing={1.1} alignItems="center">
      <Box sx={{
        width: 26, height: 26, borderRadius: '999px',
        bgcolor: BRAND.surface,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon sx={{ fontSize: 13, color }} />
      </Box>
      <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: BRAND.ink }}>{label}</Typography>
    </Stack>
    <Stack direction="row" spacing={0.9} alignItems="baseline">
      <Typography sx={{ fontWeight: 700, color, fontSize: '1rem', lineHeight: 1 }}>{count}</Typography>
      {total > 0 && (
        <Typography sx={{ fontSize: '0.66rem', color: BRAND.muted, fontWeight: 500 }}>
          {Math.round((count / total) * 100)}%
        </Typography>
      )}
    </Stack>
  </Box>
);

const JourneyTrack = ({ funnel }) => {
  if (!funnel.length) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Box sx={{
          width: 46, height: 46, borderRadius: '12px', bgcolor: BRAND.sageSoft,
          display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1.5,
        }}>
          <BarChartOutlined sx={{ color: BRAND.navy, fontSize: 20 }} />
        </Box>
        <Typography sx={{ color: BRAND.muted, fontSize: '0.83rem', fontWeight: 500 }}>
          Apply to jobs to see your journey take shape
        </Typography>
      </Box>
    );
  }

  const max = funnel[0]?.count || 1;

  return (
    <Box sx={{ position: 'relative', pt: 0.5, overflowX: 'auto' }}>
      <Box sx={{
        position: 'absolute', top: 25, left: '4%', right: '4%', height: 2,
        bgcolor: BRAND.border, zIndex: 0,
      }} />
      <Stack direction="row" sx={{ position: 'relative', zIndex: 1, minWidth: 560 }}>
        {funnel.map((f, i) => {
          const prev = i === 0 ? null : funnel[i - 1].count;
          const conv = prev > 0 ? Math.round((f.count / prev) * 100) : null;
          const color = TRACK_COLORS[i] || BRAND.sage;
          const barPct = max > 0 ? Math.round((f.count / max) * 100) : 0;
          return (
            <Box key={f.stage} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', px: 0.5 }}>
              <Box sx={{
                width: 50, height: 50, borderRadius: '999px',
                bgcolor: color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 3px 10px ${color}40`,
                border: `3px solid ${BRAND.surface}`,
                flexShrink: 0,
              }}>
                <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '0.92rem', lineHeight: 1 }}>
                  {f.count}
                </Typography>
              </Box>
              <Typography sx={{ mt: 1.1, fontSize: '0.78rem', fontWeight: 700, color: BRAND.ink, textAlign: 'center' }}>
                {f.stage}
              </Typography>
              <Box sx={{ width: '72%', height: 4, borderRadius: 2, bgcolor: BRAND.sageSoft, mt: 0.9, overflow: 'hidden' }}>
                <Box sx={{ height: '100%', width: `${barPct}%`, borderRadius: 2, bgcolor: color }} />
              </Box>
              <Typography sx={{ mt: 0.6, fontSize: '0.66rem', color: BRAND.muted, fontWeight: 500, textAlign: 'center' }}>
                {conv !== null ? `${conv}% of prev` : 'starting pool'}
              </Typography>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
};

/* ── Skill pill ─────────────────────────────────────────────────────────── */
const SkillChip = ({ label, positive }) => (
  <Chip
    label={label} size="small"
    sx={{
      fontSize: '0.65rem', height: 23,
      bgcolor: positive ? BRAND.sageSoft : NEG_BG,
      color: positive ? BRAND.sageText : NEG,
      fontWeight: 600,
      border: `1px solid ${positive ? BRAND.sage : NEG}30`,
      borderRadius: '999px',
      textTransform: 'capitalize',
    }}
  />
);

/* ── Main component ────────────────────────────────────────────────────── */
const CandidatePerformance = () => {
  const { data, loading, error, refetch } = useCandidatePerformance();

  const shellSx = {
    p: { xs: 1.5, sm: 2, md: 3, lg: 4 },
    maxWidth: 1440, mx: 'auto', bgcolor: BRAND.bg, minHeight: '100vh',
    ...fontSx,
  };

  if (loading && !data) {
    return (
      <Box sx={shellSx}>
        <Paper elevation={0} sx={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: 420, gap: 2,
          borderRadius: { xs: '14px', sm: '16px' }, border: `1px solid ${BRAND.border}`, bgcolor: BRAND.surface,
        }}>
          <CircularProgress sx={{ color: BRAND.navy }} thickness={3.5} size={34} />
          <Typography sx={{ color: BRAND.muted, fontSize: '0.85rem' }}>
            Loading your performance data…
          </Typography>
        </Paper>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={shellSx}>
        <Alert severity="error" sx={{ borderRadius: '12px' }}>{error}</Alert>
      </Box>
    );
  }
  if (!data) return null;

  const apps   = data.applications       || {};
  const ivs    = data.interviews         || {};
  const rounds = data.rounds             || {};
  const offers = data.offers             || {};
  const ir     = data.industry_readiness || {};
  const funnel = data.funnel             || [];

  const scores = [
    { id: 'shortlist',  label: 'Shortlist rate',      value: apps.shortlist_rate  ?? 0 },
    { id: 'attendance', label: 'Interview attendance', value: ivs.attendance_rate  ?? 0 },
    { id: 'approval',   label: 'Round approval rate',  value: rounds.approval_rate ?? 0 },
    { id: 'readiness',  label: 'Industry readiness',   value: ir.score             ?? 0 },
  ];

  const irRate = rate(ir.score ?? 0);

  return (
    <Box className="page-fade-in" sx={{
      p: { xs: 1.5, sm: 2, md: 3, lg: 4 },
      maxWidth: 1440, mx: 'auto', bgcolor: BRAND.bg, minHeight: '100vh',
      fontFamily: FONT,
      '& .MuiTypography-root, & .MuiButton-root, & .MuiChip-root, & .MuiInputBase-root': {
        fontFamily: FONT,
      },
    }}>

      {/* ── Command header — identical shell to Find Jobs / Applications ── */}
      <Paper elevation={0} sx={{
        bgcolor: BRAND.surface, border: `1px solid ${BRAND.border}`,
        borderRadius: { xs: '14px', sm: '16px' },
        p: { xs: 2, sm: 2.5, md: 3 }, mb: { xs: 2, md: 2.5 },
        boxShadow: '0 1px 2px rgba(16,18,16,0.04)',
      }}>
        <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5, mb: { xs: 2, md: 2.25 } }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography component="h1" sx={{
              fontWeight: 700, color: BRAND.ink, letterSpacing: '-0.02em', lineHeight: 1.15,
              fontSize: { xs: '1.3rem', sm: '1.45rem', md: '1.6rem' },
            }}>
              Performance
            </Typography>
            <Typography sx={{ color: BRAND.muted, fontSize: { xs: '0.82rem', sm: '0.9rem' }, fontWeight: 500, mt: 0.5 }}>
              <Box component="span" sx={{ color: BRAND.sageText, fontWeight: 700 }}>
                {apps.total ?? 0} {(apps.total ?? 0) === 1 ? 'application' : 'applications'}
              </Box>
              {' '}— your complete hiring journey, start to offer
            </Typography>
          </Box>
          <Tooltip title="Refresh" arrow>
            <span>
              <IconButton
                onClick={refetch}
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

        <Divider sx={{ mb: { xs: 2, md: 2.25 }, borderColor: BRAND.border }} />

        <JourneyTrack funnel={funnel} />
      </Paper>

      {/* ── Stat tiles — same gap scale as the Find Jobs card grid ── */}
      <Grid container spacing={{ xs: 1.5, sm: 1.75, md: 2 }} sx={{ mb: { xs: 2, md: 2.5 } }}>
        {[
          { icon: WorkOutlined,       color: BRAND.navy, value: `${apps.shortlist_rate ?? 0}%`,
            label: 'Shortlist rate', sublabel: `${apps.shortlisted ?? 0} of ${apps.total ?? 0} applications` },
          { icon: AssignmentTurnedIn, color: STEEL,       value: `${ivs.attendance_rate ?? 0}%`,
            label: 'Attendance', sublabel: `${ivs.completed ?? 0} of ${ivs.total ?? 0} scheduled` },
          { icon: EmojiEvents,        color: WARN,        value: ivs.best_score ? `${ivs.best_score}/10` : '—',
            label: 'Best score', sublabel: ivs.avg_score ? `Avg ${ivs.avg_score}/10` : 'No scores yet' },
          { icon: TrendingUp,         color: POS,         value: `${apps.success_rate ?? 0}%`,
            label: 'Success rate', sublabel: `${offers.accepted ?? 0} offer${(offers.accepted ?? 0) !== 1 ? 's' : ''} accepted` },
        ].map((s) => (
          <Grid key={s.label} size={{ xs: 6, md: 3 }}>
            <StatTile {...s} />
          </Grid>
        ))}
      </Grid>

      {/* ── Main grid ── */}
      <Grid container spacing={{ xs: 1.5, sm: 1.75, md: 2 }}>

        {/* Left column */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Panel sx={{ p: { xs: 2, sm: 2.5, md: 3 }, mb: { xs: 2, md: 2.5 } }}>
            <SectionHeading icon={StarOutlined}>Score card</SectionHeading>
            <Stack spacing={2}>
              {scores.map((m) => <ScoreRow key={m.id} label={m.label} value={m.value} />)}
            </Stack>
          </Panel>

          <Panel sx={{ p: { xs: 2, sm: 2.5, md: 3 } }}>
            <SectionHeading icon={ThumbUpOutlined}>Round decisions</SectionHeading>
            <Stack spacing={0.9}>
              {[
                { label: 'Approved', count: rounds.approved ?? 0, color: POS,   bg: POS_BG,   icon: ThumbUpOutlined },
                { label: 'Rejected', count: rounds.rejected ?? 0, color: NEG,   bg: NEG_BG,   icon: ThumbDownOutlined },
                { label: 'Flagged',  count: rounds.flagged  ?? 0, color: WARN,  bg: WARN_BG,  icon: HourglassEmpty },
                { label: 'Pending',  count: rounds.pending  ?? 0, color: STEEL, bg: STEEL_BG, icon: HourglassEmpty },
              ].map((r) => (
                <DecisionRow key={r.label} {...r} total={rounds.total ?? 0} />
              ))}
            </Stack>
            <Divider sx={{ my: 2, borderColor: BRAND.border }} />
            <Box sx={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              px: 1.4, py: 1, borderRadius: '12px', bgcolor: BRAND.sageSoft,
            }}>
              <Typography sx={{ fontSize: '0.8rem', color: BRAND.muted, fontWeight: 500 }}>
                Avg interview score
              </Typography>
              <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: BRAND.ink, letterSpacing: '-0.01em' }}>
                {ivs.avg_score ? `${ivs.avg_score}/10` : '—'}
              </Typography>
            </Box>
          </Panel>
        </Grid>

        {/* Right column */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Panel sx={{ p: { xs: 2, sm: 2.5, md: 3 }, mb: { xs: 2, md: 2.5 } }}>
            <SectionHeading
              icon={EmojiEvents}
              right={
                <Box sx={{
                  minWidth: 44, height: 44, borderRadius: '999px', bgcolor: BRAND.navy,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Typography sx={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', lineHeight: 1 }}>
                    {offers.total ?? 0}
                  </Typography>
                </Box>
              }
            >
              Offers received
            </SectionHeading>
            <Stack spacing={0.9}>
              {[
                { label: 'Accepted', value: offers.accepted ?? 0, color: POS,   bg: POS_BG },
                { label: 'Declined', value: offers.declined ?? 0, color: NEG,   bg: NEG_BG },
                { label: 'Pending',  value: offers.pending  ?? 0, color: WARN,  bg: WARN_BG },
              ].map(({ label, value, color, bg }) => (
                <Box key={label} sx={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  px: 1.4, py: 1, borderRadius: '12px', bgcolor: bg, border: `1px solid ${color}22`,
                }}>
                  <Typography sx={{ fontSize: '0.82rem', color: BRAND.ink, fontWeight: 600 }}>{label}</Typography>
                  <Typography sx={{ fontSize: '1rem', fontWeight: 700, color }}>{value}</Typography>
                </Box>
              ))}
            </Stack>
          </Panel>

          <Panel sx={{ p: { xs: 2, sm: 2.5, md: 3 } }}>
            <SectionHeading
              icon={TrendingUp}
              right={
                <Box sx={{ px: 1.4, py: 0.4, borderRadius: '999px', bgcolor: irRate.bg }}>
                  <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: irRate.c }}>
                    {ir.score ?? 0}%
                  </Typography>
                </Box>
              }
            >
              Industry readiness
            </SectionHeading>

            <Box sx={{ height: 8, borderRadius: 4, bgcolor: BRAND.sageSoft, overflow: 'hidden', mb: 0.75 }}>
              <Box sx={{ height: '100%', borderRadius: 4, width: `${Math.min(ir.score ?? 0, 100)}%`, bgcolor: irRate.c }} />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography sx={{ fontSize: '0.66rem', color: BRAND.muted, fontWeight: 500 }}>
                {ir.candidate_skills_count ?? 0} skills on profile
              </Typography>
              <Typography sx={{ fontSize: '0.66rem', color: BRAND.muted, fontWeight: 500 }}>
                {ir.jd_skills_count ?? 0} required in JDs
              </Typography>
            </Box>

            {(ir.matched_skills?.length > 0) && (
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                  <CheckCircleOutlined sx={{ fontSize: 12, color: BRAND.sageText }} />
                  <Typography sx={{ fontSize: '0.66rem', fontWeight: 700, color: BRAND.sageText, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Skills you have
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6 }}>
                  {ir.matched_skills.map((sk) => <SkillChip key={sk} label={sk} positive />)}
                </Box>
              </Box>
            )}

            {(ir.skill_gaps?.length > 0) && (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                  <CancelOutlined sx={{ fontSize: 12, color: NEG }} />
                  <Typography sx={{ fontSize: '0.66rem', fontWeight: 700, color: NEG, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Gaps to close
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6 }}>
                  {ir.skill_gaps.map((sk) => <SkillChip key={sk} label={sk} positive={false} />)}
                </Box>
              </Box>
            )}

            {!ir.matched_skills?.length && !ir.skill_gaps?.length && (
              <Box sx={{ textAlign: 'center', py: 2.5 }}>
                <Typography sx={{ color: BRAND.muted, fontSize: '0.82rem', fontWeight: 500 }}>
                  Apply to jobs to see skill gap analysis
                </Typography>
              </Box>
            )}
          </Panel>
        </Grid>
      </Grid>
    </Box>
  );
};

export default CandidatePerformance;