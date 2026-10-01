// BUILD: 2026-09-04-iaem-baseline-v2
// Proper competency labels, interpretation from deviation, color coding
import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Skeleton, Chip } from '@mui/material';
import { calibrationService } from '@/services/api/iaem';
import { COMPETENCY_LABELS } from '@/constants/iaem';

// Backward-compat: map old keys to labels too
const LEGACY_LABELS = {
  technical_knowledge:  'Technical Knowledge',
  problem_solving:      'Problem Solving',
  communication:        'Communication',
  leadership_ownership: 'Leadership & Ownership',
  cultural_role_fit:    'Cultural & Role Fit',
  adaptability:         'Adaptability',
};
const COMP_LABELS = { ...LEGACY_LABELS, ...COMPETENCY_LABELS };

// ── Interpretation from deviation value ──
const getInterpretation = (d) => {
  if (d === 0)    return { label: 'Neutral',          color: '#2E7D32', bg: '#E8F5E9' };
  if (d > 0 && d <= 0.5) return { label: 'Slightly Lenient', color: '#E65100', bg: '#FFF3E0' };
  if (d > 0.5 && d <= 1.0) return { label: 'Lenient',         color: '#E65100', bg: '#FFF3E0' };
  if (d > 1.0)   return { label: 'Very Lenient',     color: '#BF360C', bg: '#FBE9E7' };
  if (d < 0 && d >= -0.5) return { label: 'Slightly Strict',  color: '#1565C0', bg: '#E3F2FD' };
  if (d < -0.5 && d >= -1.0) return { label: 'Strict',          color: '#1565C0', bg: '#E3F2FD' };
  return { label: 'Very Strict',      color: '#0D47A1', bg: '#BBDEFB' };
};

const deviationColor = (d) => {
  if (d === 0) return '#2E7D32';
  if (d > 0) return '#E65100';
  return '#1565C0';
};

/* ── pine / sage scoped palette ──────────────────────────────────── */
const T = {
  pine:     '#08302F',
  pineDk:   '#04282B',  
  sageLt:   '#E8F0E8',
  sageXLt:  '#F4F7F2',
  ink:      '#2F332E',
  muted:    '#7A7E76',
  faint:    '#9CA3AF',
  line:     '#E7EAE3',
  lineSoft: '#F0F2ED',
  greenBg:  '#ECFDF5',
  greenTxt: '#065F46',
};

const MyBaseline = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    calibrationService.getMyBaseline()
      .then(r => setData(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <Box sx={{ p: 3 }}><Skeleton height={200} /></Box>;

  const baselines = data?.baselines || [];

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>

      {/* ── Pine header ── */}
      <Paper elevation={0} sx={{
        bgcolor: T.pine, borderRadius: 4, px: 3, py: 2.5, mb: 3, color: '#fff',
      }}>
        <Typography sx={{ fontSize: '1.15rem', fontWeight: 700 }}>My Calibration Baseline</Typography>
        <Typography sx={{ fontSize: '0.78rem', opacity: 0.5, mt: 0.25 }}>
          How your scoring compares to the cohort median. This is used to adjust divergence calculations.
        </Typography>
      </Paper>

      {baselines.length === 0 && (
        <Paper elevation={0} sx={{ p: 4, borderRadius: 3, border: `1px solid ${T.line}`, textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: T.faint }}>
            No baseline yet. Complete a calibration session (minimum 2 interviewers must finish) to see your baseline.
          </Typography>
        </Paper>
      )}

      {baselines.map((b, i) => (
        <Paper key={i} elevation={0} sx={{
          mb: 2, borderRadius: 3.5, border: `1.5px solid ${T.line}`, overflow: 'hidden',
        }}>
          {/* Level header bar */}
          <Box sx={{
            px: 2.5, py: 1.3, bgcolor: T.sageXLt,
            display: 'flex', alignItems: 'center', gap: 1.2,
          }}>
            <Chip label={b.level} size="small"
              sx={{ bgcolor: T.pine, color: '#fff', fontWeight: 700, fontSize: '0.72rem' }} />
            <Typography variant="body2" sx={{ color: T.muted, fontSize: '0.8rem' }}>
              Calibrated: {b.calibrated_on}
            </Typography>
          </Box>

          {/* Column header */}
          <Box sx={{
            display: 'flex', alignItems: 'center', px: 2.5, py: 1,
            borderBottom: `1px solid ${T.line}`,
          }}>
            <Typography sx={{ flex: 1.4, fontSize: '0.7rem', fontWeight: 700, color: T.muted, letterSpacing: '0.03em' }}>
              COMPETENCY
            </Typography>
            <Typography sx={{ width: 70, textAlign: 'center', fontSize: '0.7rem', fontWeight: 700, color: T.muted }}>
              MEDIAN
            </Typography>
            <Typography sx={{ width: 70, textAlign: 'center', fontSize: '0.7rem', fontWeight: 700, color: T.muted }}>
              YOURS
            </Typography>
            <Typography sx={{ width: 55, textAlign: 'center', fontSize: '0.7rem', fontWeight: 700, color: T.muted }}>
              DEV
            </Typography>
            <Typography sx={{ width: 110, fontSize: '0.7rem', fontWeight: 700, color: T.muted }}>
              INTERPRETATION
            </Typography>
          </Box>

          {/* Competency rows — banded */}
          {(b.per_competency || []).map((c, ci) => {
            const interp = getInterpretation(c.deviation);
            return (
              <Box key={c.competency} sx={{
                display: 'flex', alignItems: 'center', px: 2.5, py: 1.3,
                bgcolor: ci % 2 === 0 ? '#fff' : T.sageXLt,
                borderTop: ci > 0 ? `1px solid ${T.lineSoft}` : 'none',
              }}>
                <Typography sx={{ flex: 1.4, fontSize: '0.84rem', fontWeight: 600, color: T.ink }}>
                  {COMP_LABELS[c.competency] || c.competency}
                </Typography>
                <Typography sx={{ width: 70, textAlign: 'center', fontSize: '0.84rem', color: T.muted }}>
                  {c.cohort_median != null ? c.cohort_median.toFixed(1) : '—'}
                </Typography>
                <Typography sx={{ width: 70, textAlign: 'center', fontSize: '0.84rem', fontWeight: 700, color: T.ink }}>
                  {c.interviewer_avg != null ? c.interviewer_avg.toFixed(1) : '—'}
                </Typography>
                <Typography sx={{ width: 55, textAlign: 'center', fontSize: '0.84rem', fontWeight: 800, color: deviationColor(c.deviation) }}>
                  {c.deviation > 0 ? '+' : ''}{c.deviation.toFixed(1)}
                </Typography>
                <Box sx={{ width: 110 }}>
                  <Chip label={interp.label} size="small"
                    sx={{ bgcolor: interp.bg, color: interp.color, fontWeight: 600, fontSize: '0.68rem' }} />
                </Box>
              </Box>
            );
          })}
        </Paper>
      ))}
    </Box>
  );
};

export default MyBaseline;