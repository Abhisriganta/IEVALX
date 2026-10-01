// BUILD: 2026-09-29-iaem-calibration-runner-v7-custom
// Custom layout — dark video card on cream bg, full-width scoring aligned with video edges
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Alert, Skeleton, Chip,
  TextField, MenuItem, IconButton, LinearProgress,
} from '@mui/material';
import { ThemeProvider, createTheme, useTheme } from '@mui/material/styles';
import {
  Send, CheckCircle, ArrowBack, PlayCircle,
  VideocamOutlined, GradingOutlined, NavigateNext,
} from '@mui/icons-material';
import { calibrationService } from '@/services/api/iaem';
import { COMPETENCIES, RECOMMENDATIONS, SCORE_LABELS } from '@/constants/iaem';
import EvidenceVideoPlayer from '@/components/common/iaem/EvidenceVideoPlayer';

/* ── palette ──────────────────────────────────────────────────────── */
const T = {
  pine:     '#08302F',
  pineDk:   '#04282B',
  pineHov:  '#0a3d40',
  sage:     '#8FB08E',
  sageDk:   '#5E815D',
  sageLt:   '#E8F0E8',
  sageXLt:  '#F4F7F2',
  cream:    '#F6F8F3',
  ink:      '#2F332E',
  muted:    '#7A7E76',
  faint:    '#9CA3AF',
  line:     '#E7EAE3',
  lineSoft: '#F0F2ED',
  greenBg:  '#ECFDF5',
  greenTxt: '#065F46',
  amberBg:  '#FFFBEB',
  amberTxt: '#92400E',
  white:    '#FFFFFF',
};

/* ── Competency Card (for 2-col grid) ─────────────────────────────── */
const CompetencyCard = ({ competency, value, onChange, disabled }) => {
  const selected = value;
  return (
    <Box sx={{
      bgcolor: T.white, borderRadius: '12px', p: 2,
      border: `1px solid ${T.line}`,
      transition: 'box-shadow 0.15s ease',
      '&:hover': { boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography sx={{ fontWeight: 600, color: T.ink, fontSize: '0.82rem', lineHeight: 1.3 }}>
          {competency.label}
        </Typography>
        <Chip label={`${competency.weightage}%`} size="small"
          sx={{ bgcolor: T.sageLt, color: T.pine, fontWeight: 700, fontSize: '0.65rem', height: 18, minWidth: 36 }} />
      </Box>
      <Typography sx={{ color: T.muted, fontSize: '0.7rem', lineHeight: 1.3, mb: 1.25 }}>
        {competency.description}
      </Typography>
      <Box sx={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
        {['NA', 1, 2, 3, 4, 5].map((n) => {
          const isSelected = selected === n;
          const isNA = n === 'NA';
          return (
            <Box key={n} onClick={() => !disabled && onChange(n)}
              title={SCORE_LABELS[n] || String(n)}
              sx={{
                width: 36, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '8px', cursor: disabled ? 'default' : 'pointer', userSelect: 'none',
                fontWeight: 700, fontSize: isNA ? '0.68rem' : '0.82rem',
                transition: 'all 0.15s ease',
                border: `1.5px solid ${isSelected ? (isNA ? '#78909C' : T.pine) : T.line}`,
                bgcolor: isSelected ? (isNA ? '#78909C' : T.pine) : T.white,
                color: isSelected ? T.white : T.ink,
                '&:hover': !disabled ? {
                  borderColor: isNA ? '#78909C' : T.pine,
                  bgcolor: isSelected ? undefined : (isNA ? '#ECEFF1' : T.sageLt),
                  transform: 'scale(1.05)',
                } : {},
              }}>
              {n}
            </Box>
          );
        })}
        {selected != null && (
          <Typography sx={{ ml: 0.5, fontSize: '0.68rem', color: T.sageDk, fontWeight: 600, alignSelf: 'center' }}>
            {SCORE_LABELS[selected]}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

/* ── Reference tab pill (for top bar) ─────────────────────────────── */
const RefTab = ({ ref_, idx, isActive, onClick }) => {
  const scored = ref_.scored;
  return (
    <Box onClick={onClick}
      sx={{
        display: 'flex', alignItems: 'center', gap: 0.75,
        px: 1.25, py: 0.6, borderRadius: '8px', cursor: 'pointer',
        transition: 'all 0.15s ease',
        bgcolor: isActive ? T.sage : scored ? 'rgba(167,243,208,0.2)' : 'rgba(255,255,255,0.08)',
        color: isActive ? T.pineDk : scored ? '#A7F3D0' : 'rgba(255,255,255,0.55)',
        '&:hover': !isActive ? { bgcolor: 'rgba(255,255,255,0.14)' } : {},
      }}>
      {scored ? (
        <CheckCircle sx={{ fontSize: 14, color: isActive ? T.pineDk : '#A7F3D0' }} />
      ) : isActive ? (
        <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: T.pineDk }} />
      ) : (
        <Box sx={{ width: 7, height: 7, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.3)' }} />
      )}
      <Typography sx={{ fontSize: '0.72rem', fontWeight: 600 }}>
        Ref {idx + 1}
      </Typography>
    </Box>
  );
};

/* ════════════════════════════════════════════════════════════════════ */
const CalibrationSessionRunner = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const outerTheme = useTheme();
  const scopedTheme = useMemo(() => createTheme(outerTheme, {
    palette: {
      primary:    { main: T.pine, light: T.sage, dark: T.pineDk, contrastText: '#FFFFFF' },
      text:       { primary: T.ink, secondary: T.muted },
      background: { default: T.cream, paper: '#FFFFFF' },
      divider:    T.line,
    },
  }), [outerTheme]);

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeRef, setActiveRef] = useState(0);
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    calibrationService.getSessionDetail(sessionId)
      .then((res) => {
        setSession(res.data);
        const first = (res.data.references || []).findIndex((r) => !r.scored);
        if (first >= 0) setActiveRef(first);
      })
      .catch(() => setError('Could not load calibration session.'))
      .finally(() => setLoading(false));
  }, [sessionId]);

  const currentRef = session?.references?.[activeRef];
  const refId = currentRef?.reference_id || '';
  const scores = formData[refId] || {};

  const updateScore = useCallback((field, value) => {
    setFormData((prev) => ({
      ...prev,
      [refId]: { ...prev[refId], [field]: value },
    }));
  }, [refId]);

  const allCompetencies = COMPETENCIES.every((c) => {
    const v = scores[c.key];
    return v === 'NA' || (typeof v === 'number' && v >= 1 && v <= 5);
  });
  const hasOverall = scores.overall != null && scores.overall >= 0 && scores.overall <= 100;
  const hasRecommendation = !!scores.recommendation;
  const canSubmit = allCompetencies && hasOverall && hasRecommendation;

  const scoredCount = COMPETENCIES.filter(c => {
    const v = scores[c.key];
    return v === 'NA' || (typeof v === 'number' && v >= 1 && v <= 5);
  }).length;

  const handleSubmitScore = useCallback(async () => {
    if (!canSubmit || !refId) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const competency_scores = {};
      COMPETENCIES.forEach((c) => { competency_scores[c.key] = scores[c.key]; });
      const res = await calibrationService.submitCalibrationScore(sessionId, refId, {
        competency_scores,
        overall_score: scores.overall,
        recommendation: scores.recommendation,
        self_reflection: {},
      });
      setSession((prev) => ({
        ...prev,
        references: prev.references.map((r) => r.reference_id === refId ? { ...r, scored: true } : r),
        scored_count: res.data.scores_submitted, all_done: res.data.all_done,
      }));
      if (!res.data.all_done) {
        const next = session.references.findIndex((r, i) => i > activeRef && !r.scored && r.reference_id !== refId);
        const fallback = session.references.findIndex((r) => !r.scored && r.reference_id !== refId);
        setActiveRef(next >= 0 ? next : fallback >= 0 ? fallback : activeRef);
      }
    } catch (err) {
      setSubmitError(err.response?.data?.detail || 'Failed to submit.');
    } finally { setSubmitting(false); }
  }, [canSubmit, refId, scores, sessionId, session, activeRef]);

  /* ── Loading / Error states ───────────────────────────────────── */
  if (loading) return (
    <ThemeProvider theme={scopedTheme}>
      <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: T.cream }}>
        <Box sx={{ textAlign: 'center' }}>
          <Skeleton variant="rounded" width={480} height={280} sx={{ mb: 2, borderRadius: 3 }} />
          <Skeleton width={220} height={32} sx={{ mx: 'auto' }} />
        </Box>
      </Box>
    </ThemeProvider>
  );

  if (error) return (
    <ThemeProvider theme={scopedTheme}>
      <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: T.cream }}>
        <Box sx={{ textAlign: 'center', maxWidth: 400 }}>
          <Alert severity="error" sx={{ borderRadius: 2, mb: 2 }}>{error}</Alert>
          <Button startIcon={<ArrowBack />} onClick={() => navigate('/interviewer/calibration')}
            sx={{ textTransform: 'none', color: T.pineDk, fontWeight: 600 }}>Back to Calibration</Button>
        </Box>
      </Box>
    </ThemeProvider>
  );

  if (!session?.references?.length) return (
    <ThemeProvider theme={scopedTheme}>
      <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: T.cream }}>
        <Box sx={{ textAlign: 'center', maxWidth: 400 }}>
          <Alert severity="warning" sx={{ borderRadius: 2, mb: 2 }}>No reference videos uploaded yet.</Alert>
          <Button startIcon={<ArrowBack />} onClick={() => navigate('/interviewer/calibration')}
            sx={{ textTransform: 'none', color: T.pineDk, fontWeight: 600 }}>Back to Calibration</Button>
        </Box>
      </Box>
    </ThemeProvider>
  );

  const allDone = session.all_done || session.references.every((r) => r.scored);
  const isCurrentScored = currentRef?.scored;
  const totalRefs = session.total_count || session.references.length;

  return (
    <ThemeProvider theme={scopedTheme}>
      <Box sx={{ minHeight: '100vh', bgcolor: T.cream }}>

        {/* ── Pine-dark top bar ──────────────────────────────────── */}
        <Box sx={{
          px: { xs: 2, md: 3.5 }, py: 1.25,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          bgcolor: T.pineDk, color: '#fff',
          position: 'sticky', top: 0, zIndex: 10,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <IconButton size="small" onClick={() => navigate('/interviewer/calibration')}
              sx={{ bgcolor: 'rgba(255,255,255,0.1)', '&:hover': { bgcolor: 'rgba(255,255,255,0.18)' } }}>
              <ArrowBack sx={{ fontSize: 17, color: '#fff' }} />
            </IconButton>
            <Box>
              <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: '0.92rem', lineHeight: 1.2 }}>
                Calibration — {session.level}
              </Typography>
              <Typography sx={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.2 }}>
                {session.scored_count} / {totalRefs} scored · Deadline: {session.deadline}
              </Typography>
            </Box>
          </Box>

          {/* Reference tabs */}
          <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
            {session.references.map((ref_, idx) => (
              <RefTab key={ref_.reference_id} ref_={ref_} idx={idx}
                isActive={idx === activeRef}
                onClick={() => { if (!ref_.scored || allDone) setActiveRef(idx); }} />
            ))}
            {/* Progress chip */}
            <Chip
              icon={allDone ? <CheckCircle sx={{ fontSize: 13 }} /> : undefined}
              label={allDone ? 'All Done' : `${session.scored_count}/${totalRefs}`}
              size="small"
              sx={{
                ml: 0.5, fontWeight: 700, fontSize: '0.68rem', height: 22,
                bgcolor: allDone ? 'rgba(167,243,208,0.2)' : 'rgba(255,255,255,0.1)',
                color: allDone ? '#A7F3D0' : 'rgba(255,255,255,0.7)',
                '& .MuiChip-icon': { color: '#A7F3D0' },
              }}
            />
          </Box>
        </Box>

        {/* ── All done banner ──────────────────────────────────── */}
        {allDone && (
          <Box sx={{
            mx: { xs: 2, md: 3.5 }, mt: 2.5, p: 2.5, borderRadius: '12px',
            bgcolor: T.greenBg, border: '1px solid #A7F3D0',
            display: 'flex', alignItems: 'center', gap: 1.5,
          }}>
            <CheckCircle sx={{ color: T.greenTxt, fontSize: 22 }} />
            <Box>
              <Typography sx={{ fontWeight: 700, color: T.greenTxt, fontSize: '0.9rem' }}>
                All {totalRefs} references scored
              </Typography>
              <Typography sx={{ color: T.greenTxt, fontSize: '0.76rem', opacity: 0.8 }}>
                Your baseline will be computed once all interviewers complete this session.
              </Typography>
            </Box>
          </Box>
        )}

        {/* ── Stacked content ─────────────────────────────────── */}
        {!allDone && currentRef && !isCurrentScored && (
          <>
            {/* ─── VIDEO SECTION (dark card on cream bg) ─────────── */}
            <Box sx={{ pt: { xs: 2, md: 2.5 }, px: { xs: 2, md: 3.5 } }}>
              <Box sx={{
                bgcolor: '#0B0F10', borderRadius: '14px', overflow: 'hidden',
                p: { xs: 2, md: 2.5 },
              }}>
                {/* Video header */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.25 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <VideocamOutlined sx={{ fontSize: 18, color: T.sage }} />
                    <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: '0.85rem' }}>
                      {currentRef.title || `Reference Interview ${activeRef + 1}`}
                    </Typography>
                  </Box>
                  <Chip label={`${activeRef + 1} of ${totalRefs}`} size="small"
                    sx={{ bgcolor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)',
                      fontWeight: 600, fontSize: '0.65rem', height: 20 }} />
                </Box>

                {/* Video player */}
                <Box sx={{ borderRadius: '12px', overflow: 'hidden' }}>
                  <EvidenceVideoPlayer ref={videoRef} videoSrc={currentRef.video_url}
                    segmentLabel={`Reference Interview ${activeRef + 1} of ${totalRefs}`} />
                </Box>
              </Box>
            </Box>

            {/* ─── SCORING SECTION (cream bg, aligned with video card) */}
            <Box sx={{ py: { xs: 2, md: 2.5 }, px: { xs: 2, md: 3.5 } }}>
              <Box>

                {/* Scoring header */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <GradingOutlined sx={{ fontSize: 22, color: T.pine }} />
                    <Typography sx={{ fontWeight: 700, color: T.pine, fontSize: '1.05rem' }}>
                      Score This Candidate
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                    <LinearProgress variant="determinate"
                      value={((scoredCount + (hasOverall ? 1 : 0) + (hasRecommendation ? 1 : 0)) / 8) * 100}
                      sx={{ width: 100, height: 3, borderRadius: 2, bgcolor: T.line,
                        '& .MuiLinearProgress-bar': { bgcolor: T.sage, borderRadius: 2 } }} />
                    <Chip label={`${scoredCount}/6`} size="small"
                      sx={{
                        bgcolor: scoredCount === 6 ? T.greenBg : T.sageLt,
                        color: scoredCount === 6 ? T.greenTxt : T.pine,
                        fontWeight: 700, fontSize: '0.68rem', height: 20,
                      }} />
                  </Box>
                </Box>

                {/* ── 2-column competency cards ────────────────────── */}
                <Box sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 1.5, mb: 2.5,
                }}>
                  {COMPETENCIES.map((comp) => (
                    <CompetencyCard key={comp.key} competency={comp}
                      value={scores[comp.key] || null}
                      onChange={(v) => updateScore(comp.key, v)}
                      disabled={submitting} />
                  ))}
                </Box>

                {/* ── Bottom strip: Overall + Recommendation + Submit ── */}
                <Box sx={{
                  bgcolor: T.white, borderRadius: '12px', p: 2.5,
                  border: `1px solid ${T.line}`,
                  display: 'flex', alignItems: 'flex-end', gap: 2,
                  flexWrap: 'wrap',
                }}>
                  {/* Overall Score */}
                  <Box sx={{ flex: 1, minWidth: 130 }}>
                    <Typography sx={{ fontWeight: 700, color: T.ink, fontSize: '0.82rem', mb: 0.25 }}>
                      Overall Score
                    </Typography>
                    <Typography sx={{ color: T.muted, fontSize: '0.68rem', mb: 1 }}>
                      Holistic assessment (0–100)
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <TextField type="number" size="small"
                        value={scores.overall ?? ''}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (raw === '') { updateScore('overall', null); return; }
                          updateScore('overall', Math.min(100, Math.max(0, parseInt(raw) || 0)));
                        }}
                        disabled={submitting}
                        inputProps={{ min: 0, max: 100, style: { fontWeight: 700, fontSize: '0.92rem' } }}
                        sx={{ width: 90, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                      />
                      {scores.overall != null && (
                        <Typography sx={{ color: T.pine, fontWeight: 700, fontSize: '0.78rem' }}>/ 100</Typography>
                      )}
                    </Box>
                  </Box>

                  {/* Recommendation */}
                  <Box sx={{ flex: 1, minWidth: 160 }}>
                    <Typography sx={{ fontWeight: 700, color: T.ink, fontSize: '0.82rem', mb: 0.25 }}>
                      Recommendation
                    </Typography>
                    <Typography sx={{ color: T.muted, fontSize: '0.68rem', mb: 1 }}>
                      Your hiring verdict
                    </Typography>
                    <TextField select size="small"
                      value={scores.recommendation || ''}
                      onChange={(e) => updateScore('recommendation', e.target.value)}
                      disabled={submitting}
                      sx={{ minWidth: 160, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                    >
                      {RECOMMENDATIONS.map((r) => (
                        <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
                      ))}
                    </TextField>
                  </Box>

                  {/* Submit */}
                  <Button variant="contained" size="large"
                    endIcon={submitting ? null : <NavigateNext />}
                    disabled={!canSubmit || submitting}
                    onClick={handleSubmitScore}
                    sx={{
                      textTransform: 'none', fontWeight: 700, py: 1.25, px: 3.5,
                      borderRadius: '10px', fontSize: '0.88rem', whiteSpace: 'nowrap',
                      bgcolor: T.pineDk,
                      boxShadow: canSubmit ? '0 4px 14px rgba(4,40,43,0.25)' : 'none',
                      '&:hover': { bgcolor: T.pineHov },
                      '&.Mui-disabled': { bgcolor: T.lineSoft, color: T.faint },
                    }}>
                    {submitting ? 'Submitting…' : activeRef < totalRefs - 1 ? 'Submit & Next' : 'Submit Final'}
                  </Button>
                </Box>

                {/* Validation checklist */}
                {!canSubmit && (
                  <Box sx={{
                    mt: 1.5, p: 1.5, borderRadius: '10px', bgcolor: T.amberBg,
                    border: '1px solid #FDE68A',
                  }}>
                    <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: T.amberTxt, mb: 0.5 }}>
                      Complete before submitting:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {[
                        { done: allCompetencies, label: 'All 6 competencies' },
                        { done: hasOverall, label: 'Overall score' },
                        { done: hasRecommendation, label: 'Recommendation' },
                      ].map((item) => (
                        <Chip key={item.label} size="small"
                          icon={item.done ? <CheckCircle sx={{ fontSize: 12 }} /> : undefined}
                          label={item.label}
                          sx={{
                            height: 22, fontSize: '0.68rem', fontWeight: 600,
                            bgcolor: item.done ? T.greenBg : 'rgba(255,255,255,0.6)',
                            color: item.done ? T.greenTxt : T.amberTxt,
                            '& .MuiChip-icon': { color: T.greenTxt },
                            border: `1px solid ${item.done ? '#A7F3D0' : '#FDE68A'}`,
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}

                {submitError && <Alert severity="error" sx={{ mt: 1.5, borderRadius: 2 }}>{submitError}</Alert>}
              </Box>
            </Box>
          </>
        )}

        {/* ── Already scored notice ────────────────────────────── */}
        {!allDone && currentRef && isCurrentScored && (
          <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
            <Box sx={{
              maxWidth: 480, textAlign: 'center', p: 4, borderRadius: 3,
              bgcolor: T.greenBg, border: '1px solid #A7F3D0',
            }}>
              <CheckCircle sx={{ fontSize: 40, color: T.greenTxt, mb: 1 }} />
              <Typography sx={{ fontWeight: 700, color: T.greenTxt, fontSize: '1rem', mb: 0.5 }}>
                Already scored "{currentRef.title || `Reference ${activeRef + 1}`}"
              </Typography>
              <Typography sx={{ color: T.greenTxt, fontSize: '0.82rem', opacity: 0.8 }}>
                Select an unscored reference above to continue.
              </Typography>
            </Box>
          </Box>
        )}
      </Box>
    </ThemeProvider>
  );
};

export default CalibrationSessionRunner;