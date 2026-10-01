// BUILD: 2026-09-05-signal-guidelines-v3 — minimal, clear descriptions only
import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Paper, Chip, useMediaQuery, useTheme,
} from '@mui/material';
import {
  Shield as ShieldIcon,
  TrendingUp as TrendingUpIcon,
  WarningAmber as WarningIcon,
  QuestionAnswer as QuestionIcon,
  BarChart as BarChartIcon,
  AccessTime as AccessTimeIcon,
  Groups as GroupsIcon,
  Speed as SpeedIcon,
  RecordVoiceOver as VoiceIcon,
  InfoOutlined as InfoIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import Collapse from '@mui/material/Collapse';
import { useAuth } from '@/hooks/useAuth';
import { ROLES } from '@/constants';

const T = {
  pine: '#08302F', sage: '#8FB08E', sageLight: '#EDF4EC',
  white: '#FFFFFF', text: '#1A2E2D', textSub: '#4A6360',
  textMuted: '#6B8380', border: '#D6DDD5',
  critical: '#C62828', criticalBg: '#FFF0F0',
  high: '#E65100', highBg: '#FFF3E0',
  medium: '#F57F17', mediumBg: '#FFFDE7',
  low: '#2E7D32', lowBg: '#F1F8E9',
};

const SEV = {
  Critical: { color: T.critical, bg: T.criticalBg },
  High:     { color: T.high,     bg: T.highBg },
  Medium:   { color: T.medium,   bg: T.mediumBg },
  Low:      { color: T.low,      bg: T.lowBg },
};

const SIGNALS = [
  { code: 'A1', name: 'Score Divergence', icon: TrendingUpIcon, severity: ['Low', 'Medium'],
    desc: 'Compares your submitted score against the AI-generated candidate score, adjusted for your personal calibration baseline. Consistent patterns of divergence are flagged for HR review.' },
  { code: 'A2', name: 'Selection Outcome Quality', icon: BarChartIcon, severity: ['Medium', 'High'],
    desc: 'Tracks whether candidates you recommended to hire are succeeding after being hired, based on their employment outcomes at 30, 90, and 180 days.' },
  { code: 'A3', name: 'JD Question Alignment', icon: QuestionIcon, severity: ['Low', 'Medium'],
    desc: 'Checks whether the questions you ask align with the job description. Questions are classified as in-scope, adjacent, or out-of-scope.' },
  { code: 'A4', name: 'Experience-Level Calibration', icon: SpeedIcon, severity: ['Low', 'Medium'],
    desc: 'Checks whether your question difficulty matches the interview level. Asking only basic questions in a senior interview, or vice versa, would be flagged.' },
  { code: 'A5', name: 'Differential Difficulty', icon: GroupsIcon, severity: ['Medium', 'High'],
    desc: 'Detects whether you ask harder questions to one group of candidates versus another. Uses anonymized cohort data only — no individual demographics are shared.' },
  { code: 'A6', name: 'Professional Conduct', icon: VoiceIcon, severity: ['High', 'Critical'],
    desc: 'Scans the interview transcript after the interview ends for patterns of dismissiveness, intimidation, or personal attacks. The AI also provides an alternative innocent explanation for HR to consider.' },
  { code: 'A7', name: 'Protected-Group Misconduct', icon: ShieldIcon, severity: ['Critical'], autoEscalate: true,
    desc: 'Scans for language constituting harassment, discrimination, or quid-pro-quo behavior. Uses the strictest confidence threshold (≥ 0.90) and automatically escalates to Compliance.' },
  { code: 'A8', name: 'Coverage & Duration', icon: AccessTimeIcon, severity: ['Low', 'Medium'],
    desc: 'Checks whether you systematically cut interviews short for some candidates while running full-length for others, especially when correlated with rejection patterns.' },
];

const SignalGuidelines = () => {
  const { role } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const effectiveRole = role || ROLES.EMPLOYER;
  const [showCalibration, setShowCalibration] = useState(false);

  const header = useMemo(() => {
    if (effectiveRole === ROLES.INTERVIEWER)
      return { title: 'Audit Signal Guidelines', subtitle: 'What the IAEM system evaluates after your audited interviews.' };
    if (effectiveRole === ROLES.COMPLIANCE)
      return { title: 'Signal Reference', subtitle: 'All eight audit signals — severity levels and escalation rules.' };
    return { title: 'IAEM Signal Guidelines', subtitle: 'All eight audit signals — what they measure, severity, and when they fire.' };
  }, [effectiveRole]);

  return (
    <Box sx={{ maxWidth: '100%', mx: 0, px: isMobile ? 2 : 3, pb: 6 }}>
      {/* Header */}
      <Box sx={{ mb: 3.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.75 }}>
          <Box sx={{ width: 4, height: 28, borderRadius: '2px',
            bgcolor: effectiveRole === ROLES.COMPLIANCE ? T.critical : T.sage }} />
          <Typography sx={{ fontSize: '1.45rem', fontWeight: 800, color: T.pine,
            fontFamily: "'Jost','DM Sans',sans-serif" }}>{header.title}</Typography>
        </Box>
        <Typography sx={{ fontSize: '0.88rem', color: T.textSub, ml: 2.75 }}>{header.subtitle}</Typography>
      </Box>

      {/* Signal list */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {SIGNALS.map((s) => {
          const Icon = s.icon;
          const isA7 = s.autoEscalate;
          return (
            <Paper key={s.code} elevation={0}
              sx={{
                display: 'flex', alignItems: 'flex-start', gap: 2,
                px: 2.5, py: 2, borderRadius: '12px',
                border: `1px solid ${isA7 ? T.critical + '30' : T.border}`,
                bgcolor: isA7 ? T.criticalBg : T.white,
                transition: 'border-color 0.2s',
                '&:hover': { borderColor: isA7 ? T.critical + '60' : T.sage },
              }}>
              {/* Icon */}
              <Box sx={{ width: 40, height: 40, borderRadius: '10px', flexShrink: 0, mt: 0.25,
                bgcolor: isA7 ? T.critical + '14' : T.pine + '0C',
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon sx={{ fontSize: 20, color: isA7 ? T.critical : T.pine }} />
              </Box>

              {/* Content */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
                  <Typography sx={{ fontSize: '0.68rem', fontWeight: 800,
                    color: isA7 ? T.critical : T.sage, letterSpacing: '0.06em',
                    fontFamily: "'Jost',sans-serif" }}>{s.code}</Typography>
                  <Typography sx={{ fontSize: '0.95rem', fontWeight: 700, color: T.text,
                    fontFamily: "'Jost','DM Sans',sans-serif" }}>{s.name}</Typography>
                  {isA7 && (
                    <Chip icon={<WarningIcon sx={{ fontSize: '13px !important' }} />}
                      label="Auto-escalates" size="small"
                      sx={{ bgcolor: T.critical + '14', color: T.critical, fontWeight: 600,
                        fontSize: '0.65rem', height: 20, borderRadius: '6px',
                        '& .MuiChip-icon': { color: T.critical } }} />
                  )}
                </Box>
                <Typography sx={{ fontSize: '0.84rem', color: T.textSub, lineHeight: 1.6 }}>
                  {s.desc}
                </Typography>

                {/* A1 calibration explainer */}
                {s.code === 'A1' && (
                  <Box sx={{ mt: 1 }}>
                    <Box
                      onClick={() => setShowCalibration((p) => !p)}
                      sx={{
                        display: 'inline-flex', alignItems: 'center', gap: 0.5,
                        cursor: 'pointer', userSelect: 'none',
                        color: T.pine, '&:hover': { color: T.sage },
                      }}
                    >
                      <InfoIcon sx={{ fontSize: 15 }} />
                      <Typography sx={{ fontSize: '0.78rem', fontWeight: 600,
                        fontFamily: "'Jost',sans-serif" }}>
                        How does calibration work?
                      </Typography>
                      <ExpandMoreIcon sx={{
                        fontSize: 16,
                        transform: showCalibration ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.25s',
                      }} />
                    </Box>
                    <Collapse in={showCalibration}>
                      <Box sx={{
                        mt: 1, px: 2, py: 1.5, borderRadius: '8px',
                        bgcolor: T.sageLight, border: `1px solid ${T.border}`,
                      }}>
                        <Typography sx={{ fontSize: '0.82rem', color: T.textSub, lineHeight: 1.7 }}>
                          your HR team selects 2–4 Reference interview videos and assigns
                          them to all interviewers at your level. You watch each video and score it using the
                          same scoring form you use for real interviews — competency scores, overall score,
                          recommendation, and rationale.
                        </Typography>
                        <Typography sx={{ fontSize: '0.82rem', color: T.textSub, lineHeight: 1.7, mt: 1 }}>
                          Now imagine 10 interviewers all score the same video. Most give around 65, but you
                          consistently give 58 — not because you're wrong, just because you're a tougher
                          grader. The system learns this about you.
                        </Typography>
                        <Typography sx={{ fontSize: '0.82rem', color: T.textSub, lineHeight: 1.7, mt: 1 }}>
                          So when A1 later sees you gave a real candidate 60 and the AI gave 68, it doesn't
                          flag the 8-point gap. It already knows you tend to score ~7 points lower, so the{' '}
                          <em>real</em> divergence is only about 1 point — well within the normal range.
                        </Typography>
                        <Typography sx={{ fontSize: '0.82rem', color: T.pine, fontWeight: 600, lineHeight: 1.7, mt: 1 }}>
                          In short: calibration makes sure strict graders and generous graders are both judged
                          fairly. It's not a test — there's no pass or fail.
                        </Typography>
                      </Box>
                    </Collapse>
                  </Box>
                )}
              </Box>

              {/* Severity */}
              <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0, mt: 0.5 }}>
                {s.severity.map((lv) => {
                  const c = SEV[lv] || SEV.Low;
                  return (
                    <Chip key={lv} label={lv} size="small"
                      sx={{ bgcolor: c.bg, color: c.color, fontWeight: 700,
                        fontSize: '0.68rem', height: 22, borderRadius: '6px',
                        border: `1px solid ${c.color}20` }} />
                  );
                })}
              </Box>
            </Paper>
          );
        })}
      </Box>
    </Box>
  );
};

export default SignalGuidelines;