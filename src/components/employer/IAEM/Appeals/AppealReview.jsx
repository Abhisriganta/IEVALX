// BUILD: 2026-08-28-iaem-appeal-signal-tabs-ui
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Button, TextField, MenuItem, Skeleton,
  Divider, Alert, Grid, Chip, Tabs, Tab, Dialog, DialogContent, IconButton,
} from '@mui/material';
import { ArrowBack, Gavel, ReportProblem, History, Close } from '@mui/icons-material';
import { appealService, caseService } from '@/services/api/iaem';
import {
  EvidenceVideoPlayer, TranscriptSegmentList, AIAnalysisPanel,
  AIScoreBreakdown, SignalBadge, SeverityBadge, ChangeLogTimeline,
} from '@/components/common/iaem';
import { APPEAL_OUTCOMES, RESOLUTION_TYPES, VALIDATION } from '@/constants/iaem';
import ScoringForm from '../../../interviewer/PostInterview/ScoringForm';

/* ── Pine / Sage / Cream palette ─────────────────────────────────────── */
const T = {
  pine:     '#04282B',
  pineHov:  '#0a3d40',
  sage:     '#8FB08E',
  sageDark: '#7F9E7E',
  sageSoft: '#EDF3EC',
  sageText: '#5E815D',
  cream:    '#F6F8F3',
  ink:      '#101210',
  body:     '#2F332E',
  muted:    '#55584F',
  faint:    '#7A7E76',
  line:     '#E7EAE3',
  lineSoft: '#F0F2ED',
  surface:  '#FFFFFF',
};
const FONT = "'Jost','DM Sans',sans-serif";

/* ── Section card ────────────────────────────────────────────────────── */
const SectionCard = ({ icon, iconBg, iconColor, title, borderLeft, children, sx: extraSx }) => (
  <Paper elevation={0} sx={{
    p: 2.5, borderRadius: '14px', border: `1px solid ${T.line}`,
    display: 'flex', flexDirection: 'column',
    ...(borderLeft && { borderLeft: `3px solid ${borderLeft}`, borderRadius: '0 14px 14px 0' }),
    ...extraSx,
  }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
      <Box sx={{
        width: 28, height: 28, borderRadius: '8px', bgcolor: iconBg, color: iconColor,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {icon}
      </Box>
      <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: T.pine, fontFamily: FONT }}>{title}</Typography>
    </Box>
    <Box sx={{ flex: 1 }}>{children}</Box>
  </Paper>
);

/* ── Field row ───────────────────────────────────────────────────────── */
const Field = ({ label, children }) => (
  <Box sx={{ display: 'flex', gap: 0.5, mb: 0.75 }}>
    <Typography sx={{ fontSize: '0.82rem', color: T.faint, minWidth: 105, flexShrink: 0, fontWeight: 500, fontFamily: FONT }}>{label}</Typography>
    <Box sx={{ fontSize: '0.82rem', color: T.body, lineHeight: 1.55, fontFamily: FONT, minWidth: 0, flex: 1, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{children}</Box>
  </Box>
);

/* ════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════════════════ */
const AppealReview = () => {
  const { appealId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [outcome, setOutcome] = useState('');
 const [rationale, setRationale] = useState('');
  const [showLog, setShowLog] = useState(false);
  const [newResolution, setNewResolution] = useState('');
  const [resolving, setResolving] = useState(false);

  // Signal tab index (0 = first signal, 1 = second, etc.)
  const [activeSignal, setActiveSignal] = useState(0);

  // Evaluation form dialog
  const [formOpen, setFormOpen] = useState(false);
  const [formDetail, setFormDetail] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  const handleViewForm = useCallback(() => {
    if (!data?.submission_id) return;
    setFormOpen(true);
    setFormLoading(true);
    setFormDetail(null);
    caseService.getSubmissionDetail(data.submission_id)
      .then(res => setFormDetail(res.data))
      .catch(console.error)
      .finally(() => setFormLoading(false));
  }, [data?.submission_id]);

  const videoRef = useRef(null);
  const videoContainerRef = useRef(null);

  const handleSeekTo = useCallback((seconds) => {
    if (!seconds && seconds !== 0) return;
    if (videoContainerRef.current) videoContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => { if (videoRef.current?.seekTo) videoRef.current.seekTo(seconds); }, 400);
  }, []);

  useEffect(() => {
    appealService.getAppealDetail(appealId)
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [appealId]);

  const handleResolve = async () => {
    if (!outcome || rationale.length < VALIDATION.RATIONALE_MIN) return;
    setResolving(true);
    try {
      await appealService.resolveAppeal(appealId, outcome, rationale, newResolution || undefined);
      alert('Appeal resolved.');
      navigate('/employer/appeals');
    } catch (err) { console.error(err); }
    finally { setResolving(false); }
  };

  if (loading) return <Box sx={{ p: 3 }}><Skeleton variant="rounded" height={400} sx={{ borderRadius: '14px' }} /></Box>;
  if (!data) return <Box sx={{ p: 3 }}><Typography sx={{ color: T.muted, fontFamily: FONT }}>Appeal not found.</Typography></Box>;

  const signals = data.per_signal_evidence || [];
  const pse = signals[activeSignal] || null;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, fontFamily: FONT }}>

      {/* ═══ BACK BUTTON ═══ */}
      <Button
        startIcon={<ArrowBack sx={{ fontSize: 18 }} />}
        onClick={() => navigate('/employer/appeals')}
        sx={{
          mb: 2, textTransform: 'none', color: T.sageText, fontWeight: 600,
          fontFamily: FONT, fontSize: '0.85rem',
          '&:hover': { color: T.pine, bgcolor: T.sageSoft },
        }}
      >
        Back to queue
      </Button>

      {/* ═══ TOP BAR — sage green background ═══ */}
      <Paper elevation={0} sx={{
        p: 2.5, mb: 2, borderRadius: '14px', border: `1px solid ${T.line}`,
        bgcolor: T.sageSoft, display: 'flex', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 2, alignItems: 'flex-start',
      }}>
        <Box>
          <Typography sx={{ fontSize: '1.1rem', fontWeight: 700, color: T.pine, fontFamily: FONT }}>
            Appeal Review — {data.appeal_id}
          </Typography>
          <Typography sx={{ fontSize: '0.82rem', color: T.faint, mt: 0.25, fontFamily: FONT }}>
            {data.interviewer_name} • {data.job_title} • {data.level} • {data.interview_date}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
          {(data.signals || []).map((s, i) => (
            <Box key={i} sx={{
              display: 'flex', alignItems: 'center', gap: 0.75,
              border: `1px solid ${T.line}`, borderRadius: '999px',
              px: 1, py: 0.5, bgcolor: T.surface,
            }}>
              <SignalBadge code={s.signal_code} />
              <SeverityBadge severity={s.severity} />
            </Box>
          ))}
          {data.submission_id && (
            <Button variant="outlined" size="small" onClick={handleViewForm}
              sx={{ textTransform: 'none', fontWeight: 600, borderColor: T.pine, color: T.pine, borderRadius: 2, px: 2, fontSize: '0.8rem' }}>
              View Full Evaluation Form
            </Button>
          )}
        </Box>
      </Paper>

      {/* ═══ ORIGINAL DECISION + INTERVIEWER'S APPEAL (always visible, equal height) ═══ */}
      <Grid container spacing={1.5} sx={{ mb: 2.5, alignItems: 'stretch' }}>
        <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex' }}>
          <SectionCard
            icon={<Gavel sx={{ fontSize: 16 }} />}
            iconBg="#FFF3E0" iconColor="#E65100"
            title="Original Decision"
            sx={{ flex: 1 }}
          >
            <Field label="Resolution">
              <Chip label={RESOLUTION_TYPES[data.original_resolution]?.label || data.original_resolution}
                size="small" sx={{ fontWeight: 600, fontSize: '0.72rem', bgcolor: T.lineSoft, color: T.muted }} />
            </Field>
            <Field label="Rationale">
              <Typography sx={{ fontSize: '0.82rem', color: T.body, lineHeight: 1.6 }}>{data.original_rationale}</Typography>
            </Field>
            <Field label="Reviewed by">{data.original_reviewer}</Field>
          </SectionCard>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex' }}>
          <SectionCard
            icon={<ReportProblem sx={{ fontSize: 16 }} />}
            iconBg={T.sageSoft} iconColor={T.sageText}
            title="Interviewer's Appeal"
            borderLeft={T.sage}
            sx={{ flex: 1 }}
          >
            <Field label="Disagrees with">{data.disagree_with}</Field>
            <Field label="Explanation">
              <Typography sx={{ fontSize: '0.82rem', color: T.body, lineHeight: 1.6 }}>{data.explanation}</Typography>
            </Field>
            {data.supporting_context && <Field label="Context">{data.supporting_context}</Field>}
            <Field label="Desired outcome">
              <Chip label={data.desired_outcome} size="small"
                sx={{ fontWeight: 600, fontSize: '0.72rem', bgcolor: T.sageSoft, color: T.sageText }} />
            </Field>
          </SectionCard>
        </Grid>
      </Grid>

      {/* ═══ FULL INTERVIEW RECORDING (always visible) ═══ */}
      <Paper ref={videoContainerRef} elevation={0} sx={{
        p: 2.5, mb: 2.5, borderRadius: '14px', border: `1px solid ${T.line}`, bgcolor: T.surface,
      }}>
        <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: T.pine, fontFamily: FONT, mb: 0.3 }}>
          Full interview recording
        </Typography>
        <Typography sx={{ fontSize: '0.75rem', color: T.faint, fontFamily: FONT, mb: 2 }}>
          Click any timestamp in the evidence below to jump to that moment in the recording.
        </Typography>
        <EvidenceVideoPlayer
          ref={videoRef}
          videoSrc={data.video_segment_url}
          audioSrc={data.audio_segment_url}
          segmentLabel="Full interview recording"
        />
      </Paper>

      {/* ═══ SIGNAL TABS (wizard — like Case Queue) ═══ */}
      {signals.length > 0 && (
        <>
          <Paper elevation={0} sx={{
            borderRadius: '14px', border: `1px solid ${T.line}`,
            bgcolor: T.surface, overflow: 'hidden', mb: 1.5,
          }}>
            <Tabs
              value={activeSignal}
              onChange={(_, v) => setActiveSignal(v)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                minHeight: 44,
                '& .MuiTabs-indicator': { bgcolor: T.pine, height: 3 },
                '& .MuiTabs-scrollButtons': { color: T.faint },
              }}
            >
              {signals.map((s, i) => (
                <Tab
                  key={i}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <SignalBadge code={s.signal_code} showName={false} size="small" />
                      <Typography sx={{
                        fontSize: '0.82rem', fontWeight: i === activeSignal ? 700 : 500,
                        color: i === activeSignal ? T.pine : T.faint, fontFamily: FONT,
                        textTransform: 'none', whiteSpace: 'nowrap',
                      }}>
                        {s.signal_name}
                      </Typography>
                    </Box>
                  }
                  sx={{
                    textTransform: 'none', minHeight: 44, px: 2.5,
                    '&.Mui-selected': { bgcolor: T.cream },
                  }}
                />
              ))}
            </Tabs>
          </Paper>

          {/* ═══ ACTIVE SIGNAL EVIDENCE + AI ANALYSIS ═══ */}
          {pse && (
            <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
              {/* ── LEFT: Evidence ── */}
              <Grid size={{ xs: 12, md: 7 }}>
                <Paper elevation={0} sx={{
                  p: 2.5, borderRadius: '14px', border: `1px solid ${T.line}`,
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
                      <SignalBadge code={pse.signal_code} />
                      <SeverityBadge severity={pse.severity} />
                      <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: T.pine, fontFamily: FONT, ml: 0.5 }}>
                        {pse.signal_name}
                      </Typography>
                    </Box>

                    <Typography sx={{ fontSize: '0.82rem', color: T.muted, mb: 2, lineHeight: 1.5, fontFamily: FONT }}>
                      {pse.summary}
                    </Typography>

                    {/* A6/A7 transcript */}
                    {['A6', 'A7'].includes(pse.signal_code) && (pse.transcript_segments || []).length > 0 && (
                      <TranscriptSegmentList segments={pse.transcript_segments} onSeekTo={handleSeekTo} />
                    )}

                    {/* A1 score comparison */}
                    {pse.signal_code === 'A1' && pse.evidence && (
                      <Box>
                        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                          <Box sx={{ p: 1.5, borderRadius: '10px', bgcolor: T.cream, flex: 1, textAlign: 'center', border: `1px solid ${T.line}` }}>
                            <Typography sx={{ fontSize: '0.72rem', color: T.faint, fontFamily: FONT }}>Interviewer</Typography>
                            <Typography sx={{ fontSize: '1.3rem', fontWeight: 700, color: T.pine, fontFamily: FONT }}>{pse.evidence.interviewer_overall}/100</Typography>
                          </Box>
                          <Box sx={{ p: 1.5, borderRadius: '10px', bgcolor: T.cream, flex: 1, textAlign: 'center', border: `1px solid ${T.line}` }}>
                            <Typography sx={{ fontSize: '0.72rem', color: T.faint, fontFamily: FONT }}>AI</Typography>
                            <Typography sx={{ fontSize: '1.3rem', fontWeight: 700, color: T.sageText, fontFamily: FONT }}>{pse.evidence.ai_overall}/100</Typography>
                          </Box>
                        </Box>
                        <Box sx={{ mb: 2 }}>
                          <AIScoreBreakdown signalEvidence={pse.evidence} />
                        </Box>
                        <Typography sx={{ fontSize: '0.72rem', color: T.faint, fontWeight: 600, mt: 2, display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: FONT }}>
                          Recommendation
                        </Typography>
                        <Chip label={pse.evidence.recommendation} size="small" sx={{ mb: 1, fontWeight: 600, bgcolor: T.lineSoft, color: T.muted }} />

                      </Box>
                    )}

                    {/* A3 question scope */}
                    {pse.signal_code === 'A3' && pse.evidence && (
                      <Box>
                        {pse.evidence.scope_summary && (
                          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                            <Chip label={`In-scope: ${pse.evidence.scope_summary.in_scope || 0}`} size="small" sx={{ bgcolor: '#E8F5E9', color: '#2E7D32', fontWeight: 600 }} />
                            <Chip label={`Adjacent: ${pse.evidence.scope_summary.adjacent || 0}`} size="small" sx={{ bgcolor: '#FFF3E0', color: '#E65100', fontWeight: 600 }} />
                            <Chip label={`Out-of-scope: ${pse.evidence.scope_summary.out_of_scope || 0}`} size="small" sx={{ bgcolor: '#FFEBEE', color: '#C62828', fontWeight: 600 }} />
                          </Box>
                        )}
                        {(pse.evidence.questions || []).map((q, i) => (
                          <Box key={i} sx={{
                            p: 1.5, mb: 0.5, borderRadius: '10px',
                            bgcolor: q.scope === 'OUT_OF_SCOPE' ? '#FFF8E1' : T.cream,
                            border: q.scope === 'OUT_OF_SCOPE' ? '1px solid #FFE082' : '1px solid transparent',
                          }}>
                            <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', mb: 0.5 }}>
                              <Chip label={q.scope?.replace('_', ' ')} size="small" sx={{
                                height: 18, fontWeight: 700, fontSize: '0.65rem',
                                bgcolor: q.scope === 'IN_SCOPE' ? '#E8F5E9' : q.scope === 'ADJACENT' ? '#FFF3E0' : '#FFEBEE',
                                color: q.scope === 'IN_SCOPE' ? '#2E7D32' : q.scope === 'ADJACENT' ? '#E65100' : '#C62828',
                              }} />
                              {q.timestamp && (
                                <Chip label={`▶ ${q.timestamp}`} size="small" onClick={() => handleSeekTo(q.timestamp_secs)}
                                  sx={{ height: 20, fontSize: '0.6rem', fontWeight: 700, bgcolor: T.sageSoft, color: T.pine, cursor: 'pointer', borderRadius: 1.5, '&:hover': { bgcolor: '#D5E8D4' } }} />
                              )}
                            </Box>
                            <Typography sx={{ fontSize: '0.88rem', color: T.body, fontFamily: FONT }}>"{q.question}"</Typography>
                          </Box>
                        ))}
                      </Box>
                    )}

                    {/* A4 level mismatch */}
                    {pse.signal_code === 'A4' && pse.evidence && (
                      <Box>
                        <Typography sx={{ fontSize: '0.85rem', color: T.muted, mb: 1, fontFamily: FONT }}>
                          Expected: <strong>{pse.evidence.expected_level}</strong> — Questions were <strong>{pse.evidence.mismatch_direction?.replace('_', ' ')}</strong>
                        </Typography>
                        {(pse.evidence.questions || []).map((q, i) => (
                          <Box key={i} sx={{ p: 1.5, mb: 0.5, borderRadius: '10px', bgcolor: T.cream }}>
                            <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', mb: 0.5 }}>
                              <Chip label={q.difficulty} size="small" sx={{ height: 18, fontWeight: 700, fontSize: '0.65rem' }} />
                              {q.timestamp && (
                                <Chip label={`▶ ${q.timestamp}`} size="small" onClick={() => handleSeekTo(q.timestamp_secs)}
                                  sx={{ height: 20, fontSize: '0.6rem', fontWeight: 700, bgcolor: T.sageSoft, color: T.pine, cursor: 'pointer', borderRadius: 1.5, '&:hover': { bgcolor: '#D5E8D4' } }} />
                              )}
                            </Box>
                            <Typography component="span" sx={{ fontSize: '0.88rem', color: T.body, fontFamily: FONT }}>"{q.question}"</Typography>
                          </Box>
                        ))}
                      </Box>
                    )}

                    {/* A8 duration */}
                    {pse.signal_code === 'A8' && pse.evidence && (
                      <Box>
                        {pse.evidence.duration_stats && (
                          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                            <Box sx={{ p: 1.5, borderRadius: '10px', bgcolor: '#E8F5E9', flex: 1, textAlign: 'center' }}>
                              <Typography sx={{ fontSize: '0.72rem', color: '#2E7D32', fontFamily: FONT }}>Hire avg</Typography>
                              <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: '#2E7D32', fontFamily: FONT }}>{pse.evidence.duration_stats.avg_hire_mins} min</Typography>
                            </Box>
                            <Box sx={{ p: 1.5, borderRadius: '10px', bgcolor: '#FFEBEE', flex: 1, textAlign: 'center' }}>
                              <Typography sx={{ fontSize: '0.72rem', color: '#C62828', fontFamily: FONT }}>No-Hire avg</Typography>
                              <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: '#C62828', fontFamily: FONT }}>{pse.evidence.duration_stats.avg_nohire_mins} min</Typography>
                            </Box>
                          </Box>
                        )}
                        {(pse.evidence.interviews || []).map((iv, i) => (
                          <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, borderBottom: `1px solid ${T.lineSoft}` }}>
                            <Typography sx={{ fontSize: '0.85rem', color: T.muted, fontFamily: FONT }}>{iv.date}</Typography>
                            <Box sx={{ display: 'flex', gap: 2 }}>
                              <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, fontFamily: FONT }}>{iv.duration_mins} min</Typography>
                              <Chip label={iv.recommendation} size="small" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 600 }} />
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    )}
                </Paper>
              </Grid>

              {/* ── RIGHT: AI Analysis ── */}
              <Grid size={{ xs: 12, md: 5 }}>
                <Paper elevation={0} sx={{
                  borderRadius: '14px', border: `1px solid ${T.line}`, overflow: 'hidden',
                  bgcolor: T.cream, borderTop: `3px solid ${T.sageDark}`,
                }}>
                  <AIAnalysisPanel classification={pse.classification} modelCard={data.model_card} />
                </Paper>
              </Grid>
            </Grid>
          )}
        </>
      )}

      {/* ═══ YOUR DECISION (always visible) ═══ */}
      {data.status === 'PENDING' && (
        <Paper elevation={0} sx={{
          p: 3, mb: 2.5, borderRadius: '14px', border: `1px solid ${T.sage}`, bgcolor: T.surface,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Box sx={{
              width: 28, height: 28, borderRadius: '8px', bgcolor: T.sageSoft, color: T.sageText,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Gavel sx={{ fontSize: 16 }} />
            </Box>
            <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: T.pine, fontFamily: FONT }}>Your Decision</Typography>
          </Box>

          <TextField select fullWidth size="small" label="Outcome" value={outcome} onChange={e => setOutcome(e.target.value)} sx={{ mb: 2 }}>
            {Object.entries(APPEAL_OUTCOMES).map(([k, v]) => <MenuItem key={k} value={k}>{v.label} — {v.description}</MenuItem>)}
          </TextField>

          {outcome === 'MODIFIED' && (
            <TextField select fullWidth size="small" label="New Resolution" value={newResolution} onChange={e => setNewResolution(e.target.value)} sx={{ mb: 2 }}>
              {Object.entries(RESOLUTION_TYPES).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
            </TextField>
          )}

          <TextField fullWidth multiline rows={3} size="small"
            label={`Rationale (min ${VALIDATION.RATIONALE_MIN} chars)`}
            value={rationale} onChange={e => setRationale(e.target.value)} sx={{ mb: 2 }}
            error={rationale.length > 0 && rationale.length < VALIDATION.RATIONALE_MIN}
            helperText={`${rationale.length} chars`}
          />

          <Button variant="contained" disabled={!outcome || rationale.length < VALIDATION.RATIONALE_MIN || resolving} onClick={handleResolve}
            sx={{
              textTransform: 'none', fontWeight: 700, fontFamily: FONT,
              bgcolor: T.pine, borderRadius: '8px',
              '&:hover': { bgcolor: T.pineHov },
            }}
          >
            {resolving ? 'Resolving...' : 'Submit Decision'}
          </Button>
        </Paper>
      )}

      {/* ═══ CHANGE LOG (always visible) ═══ */}
      {(data.change_log || []).length > 0 && (
        <>
          <Button onClick={() => setShowLog(v => !v)}
            sx={{ textTransform: 'none', fontWeight: 700, color: T.pine, fontSize: '0.82rem', fontFamily: FONT, mb: showLog ? 1.5 : 0 }}>
            {showLog ? '▾ Hide Change Log' : '▸ Show Change Log'}
          </Button>
          {showLog && (
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: '14px', border: `1px solid ${T.line}` }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <History sx={{ fontSize: 18, color: T.pine }} />
                <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: T.pine, fontFamily: FONT }}>Change Log</Typography>
              </Box>
              <ChangeLogTimeline events={data.change_log} />
            </Paper>
          )}
        </>
      )}

      {/* ═══ EVALUATION FORM DIALOG ═══ */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="lg" fullWidth
        slotProps={{ paper: { sx: { borderRadius: '14px', border: `1px solid ${T.line}`, maxHeight: '90vh' } } }}>
        <DialogContent sx={{ p: 0 }}>
          {formLoading && (
            <Box sx={{ p: 3 }}><Skeleton height={40} sx={{ mb: 2 }} /><Skeleton height={400} /></Box>
          )}
          {!formLoading && formDetail && (
            <Box sx={{ p: { xs: 2, md: 3 }, overflowY: 'auto' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: T.ink }}>Submitted Evaluation Form</Typography>
                <IconButton size="small" onClick={() => setFormOpen(false)}><Close fontSize="small" /></IconButton>
              </Box>

              {/* Header Banner */}
              <Paper elevation={0} sx={{ borderRadius: '8px 8px 0 0', overflow: 'hidden', mb: 0 }}>
                <Box sx={{ bgcolor: '#1B2A4A', px: 3, py: 2 }}>
                  <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '1.1rem' }}>
                    IEVALX &nbsp;|&nbsp; INTERVIEWER FEEDBACK &amp; FINAL EVALUATION FORM
                  </Typography>
                </Box>
                <Box sx={{ bgcolor: '#2E86AB', px: 3, py: 0.8 }}>
                  <Typography sx={{ color: '#fff', fontSize: '0.78rem' }}>
                    Submitted evaluation &nbsp;&nbsp;|&nbsp;&nbsp; {formDetail.company_name || ''}
                  </Typography>
                </Box>
              </Paper>

              {/* Section 1 */}
              <Paper elevation={0} sx={{ borderRadius: 0, border: '1px solid #D0D0D0', borderTop: 0, mb: 0 }}>
                <Box sx={{ bgcolor: '#1B2A4A', px: 2, py: 1 }}>
                  <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '0.92rem' }}>1.  INTERVIEW DETAILS &amp; SESSION CHECK</Typography>
                </Box>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <tbody>
                    {[
                      ['Candidate Name', formDetail.candidate_name, 'Candidate ID', formDetail.candidate_id_label],
                      ['Position / Role', formDetail.position_role || formDetail.job_title, 'Interview Round', formDetail.interview_round || formDetail.level],
                      ['Primary Skill', formDetail.primary_skill, 'Date of Interview', formDetail.interview_date],
                      ['Total Experience', formDetail.total_experience, 'Required Experience', formDetail.required_experience],
                      ['Interviewer Name', formDetail.interviewer_name, 'Interviewer ID / Level', `${formDetail.interviewer_id_label || ''} / ${formDetail.interviewer_level || ''}`],
                      ['Mode of Interview', formDetail.mode_of_interview || 'Video (iMeetPro)', 'Duration (mins)', formDetail.actual_duration || formDetail.planned_duration],
                    ].map(([l1, v1, l2, v2], i) => (
                      <tr key={i}>
                        <td style={{ padding: '8px', background: '#E8EEF4', fontWeight: 700, width: '18%', border: '1px solid #D0D0D0' }}>{l1}</td>
                        <td style={{ padding: '8px', width: '30%', border: '1px solid #D0D0D0' }}>{v1 || '—'}</td>
                        <td style={{ padding: '8px', background: '#E8EEF4', fontWeight: 700, width: '18%', border: '1px solid #D0D0D0' }}>{l2}</td>
                        <td style={{ padding: '8px', width: '34%', border: '1px solid #D0D0D0' }}>{v2 || '—'}</td>
                      </tr>
                    ))}
                    {[
                      ['Session recorded', 'session_recorded', 'Identity verified', 'identity_verified'],
                      ['Proctoring check', 'proctoring_check', 'Interruption', 'interruption'],
                    ].map(([l1, k1, l2, k2], i) => (
                      <tr key={`sc-${i}`}>
                        <td style={{ padding: '8px', background: '#E8EEF4', fontWeight: 700, border: '1px solid #D0D0D0' }}>{l1}</td>
                        <td style={{ padding: '8px', border: '1px solid #D0D0D0' }}>{formDetail.session_checks?.[k1] || '—'}</td>
                        <td style={{ padding: '8px', background: '#E8EEF4', fontWeight: 700, border: '1px solid #D0D0D0' }}>{l2}</td>
                        <td style={{ padding: '8px', border: '1px solid #D0D0D0' }}>{formDetail.session_checks?.[k2] || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Paper>

              {/* Sections 2-6 */}
              <ScoringForm
                scores={{
                  competency_scores:    formDetail.competency_scores || {},
                  competency_evidence:  formDetail.competency_evidence || {},
                  question_log:         formDetail.question_log || [],
                  recommendation:       formDetail.recommendation || '',
                  key_strengths:        formDetail.key_strengths || '',
                  areas_of_concern:     formDetail.areas_of_concern || '',
                  overall_remarks:      formDetail.overall_remarks || '',
                  panel_members:        formDetail.panel_members || '',
                  panel_consensus:      formDetail.panel_consensus || '',
                  declaration_accepted: formDetail.declaration_accepted ?? true,
                  interviewer_signature: formDetail.interviewer_signature || '',
                  session_checks:       formDetail.session_checks || {},
                }}
                setScores={() => {}}
                context={{
                  company_name: formDetail.company_name || '',
                  submission: {
                    submission_ref:    formDetail.submission_ref || '',
                    hr_reaudit_status: formDetail.hr_reaudit_status || 'Pending',
                  },
                }}
                disabled={true}
              />
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};
export default AppealReview;