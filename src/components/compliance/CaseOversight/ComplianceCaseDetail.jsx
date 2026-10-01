// BUILD: 2026-08-28-iaem-compliance-evidence-parity — Read-only case detail with full evidence
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, Button, Grid, Chip, Skeleton, Tabs, Tab, Fade, Dialog, DialogContent, IconButton } from '@mui/material';
import { ArrowBack, History, Close } from '@mui/icons-material';
import { complianceService } from '@/services/api/iaem';
import {
  EvidenceVideoPlayer, TranscriptSegmentList, AIAnalysisPanel,
  AIScoreBreakdown, CaseStateBadge, SignalBadge, SeverityBadge, SLACountdown, ChangeLogTimeline,
} from '@/components/common/iaem';
import { RESOLUTION_TYPES } from '@/constants/iaem';
import ScoringForm from '../../interviewer/PostInterview/ScoringForm';

/* ── Theme tokens (pine/sage) ───────────────────────────────────────────── */
const P = '#04282B';
const INK = '#1F1F1F';
const MUTED = '#6F7470';
const HINT = '#A0A8A0';
const LINE = '#E7EAE3';
const SUBTLE = '#F0F3EE';
const ACCENT_BG = '#EDF3EC';

const SEV_COLOR = {
  CRITICAL: { bg: '#FFEBEE', color: '#C62828', border: '#EF9A9A' },
  HIGH:     { bg: '#FFEBEE', color: '#C62828', border: '#EF9A9A' },
  MEDIUM:   { bg: '#FFF3E0', color: '#E65100', border: '#F57C00' },
  LOW:      { bg: '#E8F5E9', color: '#2E7D32', border: '#A5D6A7' },
};

const sLabel = { fontSize: '0.65rem', color: HINT, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', mb: 0.75 };
const cardSx = { p: 2.5, borderRadius: 2.5, border: `1px solid ${LINE}`, mb: 2 };

/* ── Per-signal evidence renderer ───────────────────────────────────────── */
const SignalEvidence = ({ pse, handleSeekTo }) => (
  <Fade in timeout={300}>
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
        <SignalBadge code={pse.signal_code} />
        <SeverityBadge severity={pse.severity} />
        <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', color: INK, ml: 0.5 }}>{pse.signal_name}</Typography>
      </Box>
      <Typography sx={{ fontSize: '0.82rem', color: MUTED, mb: 2, lineHeight: 1.6 }}>{pse.summary}</Typography>

      {/* ── A6, A7 — Transcript Segments ── */}
      {['A6', 'A7'].includes(pse.signal_code) && (pse.transcript_segments || []).length > 0 && (
        <Box><TranscriptSegmentList segments={pse.transcript_segments} onSeekTo={handleSeekTo} /></Box>
      )}

      {/* ── A1 — Score Comparison ── */}
      {pse.signal_code === 'A1' && pse.evidence && (
        <Box>
          <Typography sx={{ ...sLabel, mt: 1 }}>Score comparison</Typography>
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <Paper elevation={0} sx={{ p: 1.5, borderRadius: 2, bgcolor: SUBTLE, border: `1px solid ${LINE}`, flex: 1, textAlign: 'center' }}>
              <Typography sx={{ fontSize: '0.65rem', color: HINT, fontWeight: 600, textTransform: 'uppercase' }}>Interviewer</Typography>
              <Typography sx={{ fontWeight: 700, fontSize: '1.05rem', color: P, mt: 0.3 }}>{pse.evidence.interviewer_overall}/100</Typography>
            </Paper>
            <Paper elevation={0} sx={{ p: 1.5, borderRadius: 2, bgcolor: SUBTLE, border: `1px solid ${LINE}`, flex: 1, textAlign: 'center' }}>
              <Typography sx={{ fontSize: '0.65rem', color: HINT, fontWeight: 600, textTransform: 'uppercase' }}>AI</Typography>
              <Typography sx={{ fontWeight: 700, fontSize: '1.05rem', color: '#5E815D', mt: 0.3 }}>{pse.evidence.ai_overall}/100</Typography>
            </Paper>
          </Box>
          <Box sx={{ mt: 1 }}>
            <AIScoreBreakdown signalEvidence={pse.evidence} />
          </Box>
          {(pse.evidence.unsubstantiated_scores || []).length > 0 && (
            <Paper elevation={0} sx={{ mt: 2, p: 1.5, borderRadius: 2, bgcolor: '#FFF3E0', border: '1px solid #FFE082' }}>
              <Typography sx={{ ...sLabel, color: '#E65100' }}>Unsubstantiated scores</Typography>
              {(pse.evidence.unsubstantiated_scores || []).map((u, i) => (
                <Box key={i} sx={{ mb: 1 }}>
                  <Typography sx={{ fontSize: '0.8rem', color: '#E65100', mb: 0.5 }}>{u.finding}</Typography>
                  {(u.transcript_excerpts || []).length > 0 && (
                    <Box sx={{ ml: 1 }}>
                      {u.transcript_excerpts.map((ex, j) => (
                        <Box key={j} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mb: 0.5, p: 0.5, borderRadius: 1, bgcolor: 'rgba(255,255,255,0.7)' }}>
                          <Chip label={`▶ ${ex.timestamp}`} size="small" onClick={() => handleSeekTo(ex.timestamp_secs)}
                            sx={{ height: 20, fontSize: '0.6rem', fontWeight: 700, bgcolor: ACCENT_BG, color: P, flexShrink: 0, cursor: 'pointer', borderRadius: 1.5, '&:hover': { bgcolor: '#D5E8D4' } }} />
                          <Typography sx={{ fontSize: '0.72rem', color: MUTED, lineHeight: 1.4 }}>{ex.text}</Typography>
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
              ))}
            </Paper>
          )}
          <Box sx={{ mt: 2 }}>
            <Typography sx={sLabel}>Recommendation</Typography>
            <Chip label={pse.evidence.recommendation} size="small" sx={{ fontWeight: 600, mb: 2, borderRadius: 2 }} />
          </Box>
        </Box>
      )}

      {/* ── A3 — Question Scope List ── */}
      {pse.signal_code === 'A3' && pse.evidence && (
        <Box>
          {pse.evidence.scope_summary && (
            <Box sx={{ display: 'flex', gap: 0.75, mb: 2, flexWrap: 'wrap' }}>
              <Chip label={`In-scope: ${pse.evidence.scope_summary.in_scope || 0}`} size="small" sx={{ bgcolor: '#E8F5E9', color: '#2E7D32', fontWeight: 600, borderRadius: 2, fontSize: '0.7rem' }} />
              <Chip label={`Adjacent: ${pse.evidence.scope_summary.adjacent || 0}`} size="small" sx={{ bgcolor: '#FFF3E0', color: '#E65100', fontWeight: 600, borderRadius: 2, fontSize: '0.7rem' }} />
              <Chip label={`Out-of-scope: ${pse.evidence.scope_summary.out_of_scope || 0}`} size="small" sx={{ bgcolor: '#FFEBEE', color: '#C62828', fontWeight: 600, borderRadius: 2, fontSize: '0.7rem' }} />
            </Box>
          )}
          {(pse.evidence.questions || []).map((q, i) => (
            <Paper key={i} elevation={0} sx={{
              p: 1.5, mb: 1, borderRadius: 2,
              bgcolor: q.scope === 'OUT_OF_SCOPE' ? '#FFFDE7' : SUBTLE,
              border: `1px solid ${q.scope === 'OUT_OF_SCOPE' ? '#FFE082' : LINE}`,
            }}>
              <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', mb: 0.5 }}>
                <Chip label={q.scope?.replace('_', ' ')} size="small" sx={{
                  height: 20, fontWeight: 700, fontSize: '0.6rem', borderRadius: 1.5,
                  bgcolor: q.scope === 'IN_SCOPE' ? '#E8F5E9' : q.scope === 'ADJACENT' ? '#FFF3E0' : '#FFEBEE',
                  color: q.scope === 'IN_SCOPE' ? '#2E7D32' : q.scope === 'ADJACENT' ? '#E65100' : '#C62828',
                }} />
                {q.timestamp && (
                  <Chip label={`▶ ${q.timestamp}`} size="small" onClick={() => handleSeekTo(q.timestamp_secs)}
                    sx={{ height: 20, fontSize: '0.6rem', fontWeight: 700, bgcolor: ACCENT_BG, color: P, cursor: 'pointer', borderRadius: 1.5, '&:hover': { bgcolor: '#D5E8D4' } }} />
                )}
              </Box>
              <Typography sx={{ fontSize: '0.82rem', color: INK }}>"{q.question}"</Typography>
              {q.transcript_excerpt && (
                <Box sx={{ mt: 0.5, p: 1, bgcolor: '#fff', borderLeft: `3px solid ${P}`, borderRadius: '0 4px 4px 0' }}>
                  <Typography sx={{ fontSize: '0.72rem', color: MUTED, fontStyle: 'italic', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{q.transcript_excerpt}</Typography>
                </Box>
              )}
              {q.reasoning && <Typography sx={{ fontSize: '0.72rem', color: HINT, fontStyle: 'italic', mt: 0.5 }}>{q.reasoning}</Typography>}
            </Paper>
          ))}
          {pse.evidence.jd_text && (
            <Paper elevation={0} sx={{ mt: 2, p: 1.5, borderRadius: 2, bgcolor: SUBTLE, border: `1px solid ${LINE}` }}>
              <Typography sx={sLabel}>Job description (reference)</Typography>
              <Typography sx={{ fontSize: '0.8rem', color: INK, whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto', lineHeight: 1.6 }}>{pse.evidence.jd_text}</Typography>
            </Paper>
          )}
        </Box>
      )}

      {/* ── A4 — Difficulty Distribution ── */}
      {pse.signal_code === 'A4' && pse.evidence && (
        <Box>
          <Typography sx={{ fontSize: '0.82rem', color: INK, mb: 1.5 }}>
            Expected level: <b>{pse.evidence.expected_level}</b> — Questions were <b>{pse.evidence.mismatch_direction?.replace('_', ' ')}</b>
          </Typography>
          {pse.evidence.distribution && (
            <Box sx={{ display: 'flex', gap: 0.75, mb: 2, flexWrap: 'wrap' }}>
              {Object.entries(pse.evidence.distribution).map(([lvl, count]) => (
                <Chip key={lvl} label={`${lvl}: ${count}`} size="small" sx={{ fontWeight: 600, borderRadius: 2, fontSize: '0.7rem' }} />
              ))}
            </Box>
          )}
          {(pse.evidence.questions || []).map((q, i) => (
            <Paper key={i} elevation={0} sx={{ p: 1.5, mb: 1, borderRadius: 2, bgcolor: SUBTLE, border: `1px solid ${LINE}` }}>
              <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', mb: 0.5 }}>
                <Chip label={q.difficulty} size="small" sx={{ height: 20, fontWeight: 700, fontSize: '0.6rem', borderRadius: 1.5 }} />
                {q.timestamp && (
                  <Chip label={`▶ ${q.timestamp}`} size="small" onClick={() => handleSeekTo(q.timestamp_secs)}
                    sx={{ height: 20, fontSize: '0.6rem', fontWeight: 700, bgcolor: ACCENT_BG, color: P, cursor: 'pointer', borderRadius: 1.5, '&:hover': { bgcolor: '#D5E8D4' } }} />
                )}
              </Box>
              <Typography sx={{ fontSize: '0.82rem', color: INK }}>"{q.question}"</Typography>
              {q.transcript_excerpt && (
                <Box sx={{ mt: 0.5, p: 1, bgcolor: '#fff', borderLeft: `3px solid ${P}`, borderRadius: '0 4px 4px 0' }}>
                  <Typography sx={{ fontSize: '0.72rem', color: MUTED, fontStyle: 'italic', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{q.transcript_excerpt}</Typography>
                </Box>
              )}
            </Paper>
          ))}
        </Box>
      )}

      {/* ── A8 — Duration Stats ── */}
      {pse.signal_code === 'A8' && pse.evidence && (
        <Box>
          {pse.evidence.duration_stats && (
            <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
              <Paper elevation={0} sx={{ p: 1.5, borderRadius: 2, bgcolor: '#E8F5E9', border: '1px solid #C8E6C9', flex: 1, textAlign: 'center' }}>
                <Typography sx={{ fontSize: '0.62rem', color: '#2E7D32', fontWeight: 600, textTransform: 'uppercase' }}>Hire avg</Typography>
                <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#2E7D32', mt: 0.3 }}>{pse.evidence.duration_stats.avg_hire_mins} min</Typography>
              </Paper>
              <Paper elevation={0} sx={{ p: 1.5, borderRadius: 2, bgcolor: '#FFEBEE', border: '1px solid #FFCDD2', flex: 1, textAlign: 'center' }}>
                <Typography sx={{ fontSize: '0.62rem', color: '#C62828', fontWeight: 600, textTransform: 'uppercase' }}>No-hire avg</Typography>
                <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#C62828', mt: 0.3 }}>{pse.evidence.duration_stats.avg_nohire_mins} min</Typography>
              </Paper>
              {pse.evidence.duration_stats.ratio_pct != null && (
                <Paper elevation={0} sx={{ p: 1.5, borderRadius: 2, bgcolor: '#FFF3E0', border: '1px solid #FFE0B2', flex: 1, textAlign: 'center' }}>
                  <Typography sx={{ fontSize: '0.62rem', color: '#E65100', fontWeight: 600, textTransform: 'uppercase' }}>Ratio</Typography>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#E65100', mt: 0.3 }}>{pse.evidence.duration_stats.ratio_pct}%</Typography>
                </Paper>
              )}
            </Box>
          )}
          {(pse.evidence.interviews || []).map((iv, i) => (
            <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.8, px: 1, borderBottom: `1px solid ${LINE}`, '&:last-child': { borderBottom: 0 } }}>
              <Typography sx={{ fontSize: '0.8rem', color: INK }}>{iv.date} — {iv.job_title || ''}</Typography>
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: INK }}>{iv.duration_mins} min</Typography>
                <Chip label={iv.recommendation} size="small" sx={{
                  height: 20, fontSize: '0.6rem', fontWeight: 700, borderRadius: 1.5,
                  bgcolor: ['HIRE', 'LEAN_HIRE'].includes(iv.recommendation) ? '#E8F5E9' : '#FFEBEE',
                  color: ['HIRE', 'LEAN_HIRE'].includes(iv.recommendation) ? '#2E7D32' : '#C62828',
                }} />
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  </Fade>
);

const ComplianceCaseDetail = () => {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [activeSignalIdx, setActiveSignalIdx] = useState(0);
  const [showChangeLog, setShowChangeLog] = useState(false);

  // Evaluation form dialog
  const [formOpen, setFormOpen] = useState(false);
  const [formDetail, setFormDetail] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  const handleViewForm = useCallback(() => {
    if (!data?.submission_id) return;
    setFormOpen(true);
    setFormLoading(true);
    setFormDetail(null);
    complianceService.getSubmissionDetail(data.submission_id)
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

  useEffect(() => { complianceService.getCaseDetail(caseId).then(r => setData(r.data)).catch(console.error).finally(() => setLoading(false)); }, [caseId]);

  const sortedSignals = useMemo(() => {
    const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return [...(data?.per_signal_evidence || [])].sort((a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9));
  }, [data?.per_signal_evidence]);

  const activeSignal = sortedSignals[activeSignalIdx] || null;

  if (loading) return <Box sx={{ p: 3 }}><Skeleton height={400} /></Box>;
  if (!data) return <Box sx={{ p: 3 }}><Typography>Not found.</Typography></Box>;

  const hasPerSignal = sortedSignals.length > 0;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: 'auto' }}>
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/compliance/cases')}
        sx={{ mb: 1.5, textTransform: 'none', color: P, fontWeight: 600, fontSize: '0.82rem', '&:hover': { bgcolor: ACCENT_BG }, borderRadius: 2 }}>
        Back
      </Button>

      {/* ═══ TOP BAR ═══ */}
      <Paper elevation={0} sx={{ ...cardSx, bgcolor: SUBTLE }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5, flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: INK }}>{data.case_id} — Read Only</Typography>
            <CaseStateBadge state={data.state} />
          </Box>
          {data.submission_id && (
            <Button variant="outlined" size="small" onClick={handleViewForm}
              sx={{ textTransform: 'none', fontWeight: 600, borderColor: P, color: P, borderRadius: 2, px: 2, fontSize: '0.8rem' }}>
              View Full Evaluation Form
            </Button>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
          {[data.interviewer_name, data.department, data.job_title, data.level, data.interview_date].filter(Boolean).map((item, i, arr) => (
            <React.Fragment key={i}>
              <Typography sx={{ fontSize: '0.78rem', color: MUTED, fontWeight: i === 0 ? 500 : 400 }}>{item}</Typography>
              {i < arr.length - 1 && <Typography sx={{ fontSize: '0.78rem', color: HINT }}>·</Typography>}
            </React.Fragment>
          ))}
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
          {(data.signals || []).map((s, i) => {
            const sev = SEV_COLOR[s.severity] || SEV_COLOR.MEDIUM;
            return (
              <Box key={i} sx={{
                display: 'inline-flex', gap: 0.75, alignItems: 'center',
                px: 1, py: 0.5, borderRadius: 2,
                bgcolor: sev.bg, border: `1px solid ${sev.border}`,
              }}>
                <SignalBadge code={s.signal_code} />
                <SeverityBadge severity={s.severity} />
              </Box>
            );
          })}
        </Box>
      </Paper>

      {/* ═══ RESOLUTION (if resolved) ═══ */}
      {data.resolution && (
        <Paper elevation={0} sx={cardSx}>
          <Typography sx={{ ...sLabel }}>Resolution</Typography>
          <Typography sx={{ fontWeight: 600, color: INK, fontSize: '0.92rem', mb: 0.5 }}>{RESOLUTION_TYPES[data.resolution]?.label || data.resolution}</Typography>
          <Typography sx={{ color: MUTED, fontSize: '0.85rem', lineHeight: 1.6, wordBreak: 'break-word' }}>{data.resolution_rationale}</Typography>
          {data.resolved_by && <Typography sx={{ color: HINT, mt: 1, display: 'block', fontSize: '0.78rem' }}>Resolved by {data.resolved_by} on {data.resolved_at ? new Date(data.resolved_at).toLocaleDateString() : ''}</Typography>}
        </Paper>
      )}

      {/* ═══ FULL INTERVIEW RECORDING ═══ */}
      {(data.video_segment_url || data.audio_segment_url) && (
        <Paper ref={videoContainerRef} elevation={0} sx={cardSx}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', color: INK, mb: 0.3 }}>Full Interview Recording</Typography>
          <Typography sx={{ fontSize: '0.72rem', color: HINT, mb: 2 }}>
            Click any timestamp in the evidence below to jump to that moment in the recording.
          </Typography>
          <EvidenceVideoPlayer ref={videoRef} videoSrc={data.video_segment_url} audioSrc={data.audio_segment_url} segmentLabel="Full interview recording" />
        </Paper>
      )}

      {/* ═══ TABBED SIGNALS + AI ANALYSIS ═══ */}
      {hasPerSignal && (
        <>
          {/* Signal tabs */}
          <Paper elevation={0} sx={{ borderRadius: 2.5, border: `1px solid ${LINE}`, mb: 0, overflow: 'hidden' }}>
            <Tabs value={activeSignalIdx} onChange={(_, v) => setActiveSignalIdx(v)} variant="scrollable" scrollButtons="auto"
              sx={{
                bgcolor: SUBTLE, minHeight: 40,
                '& .MuiTab-root': {
                  textTransform: 'none', fontWeight: 600, fontSize: '0.8rem', minHeight: 40, color: MUTED, px: 2, gap: 0.75,
                  '&.Mui-selected': { color: P },
                },
                '& .MuiTabs-indicator': { height: 2.5, borderRadius: '2px 2px 0 0', bgcolor: P },
              }}>
              {sortedSignals.map((sig, idx) => {
                const sev = SEV_COLOR[sig.severity] || SEV_COLOR.MEDIUM;
                return (
                  <Tab key={idx} label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Chip label={sig.signal_code} size="small" sx={{ height: 18, fontSize: '0.58rem', fontWeight: 700, bgcolor: sev.bg, color: sev.color, borderRadius: 1 }} />
                      <span>{sig.signal_name}</span>
                    </Box>
                  } />
                );
              })}
            </Tabs>
          </Paper>

          {/* Evidence + AI side by side */}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, md: 7 }}>
              <Paper elevation={0} sx={{ ...cardSx, borderRadius: 2.5, mt: 0 }}>
                {activeSignal && <SignalEvidence pse={activeSignal} handleSeekTo={handleSeekTo} />}
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <Paper elevation={0} sx={{ borderRadius: 2.5, border: `1px solid ${LINE}`, mt: { xs: 0, md: 0 } }}>
                {activeSignal && (
                  <AIAnalysisPanel
                    classification={activeSignal.classification}
                    modelCard={null}
                  />
                )}
              </Paper>
            </Grid>
          </Grid>
        </>
      )}

      {/* Fallback: if per_signal_evidence not available, show old single-evidence view */}
      {!hasPerSignal && data.classification && (
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid size={{ xs: 12, md: 7 }}>
            <Paper elevation={0} sx={cardSx}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', color: INK, mb: 2 }}>Evidence</Typography>
              <Typography sx={{ fontSize: '0.8rem', color: HINT }}>Legacy evidence view — data from primary signal only.</Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 5 }}>
            <Paper elevation={0} sx={{ borderRadius: 2.5, border: `1px solid ${LINE}` }}>
              <AIAnalysisPanel classification={data.classification} modelCard={null} />
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* ═══ COMMENTS ═══ */}
      {(data.comments || []).length > 0 && (
        <Paper elevation={0} sx={cardSx}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', color: INK, mb: 2 }}>Comments</Typography>
          {data.comments.map((c, i) => (
            <Box key={i} sx={{ mb: 1.5, p: 1.5, borderRadius: 1.5, bgcolor: SUBTLE }}>
              <Typography sx={{ color: INK, fontSize: '0.85rem' }}>{c.text}</Typography>
              <Typography sx={{ color: HINT, fontSize: '0.75rem' }}>{c.author} — {new Date(c.created_at).toLocaleString()}</Typography>
            </Box>
          ))}
        </Paper>
      )}

      {/* ═══ CHANGE LOG (collapsible) ═══ */}
      {(data.change_log || []).length > 0 && (
        <>
          <Button onClick={() => setShowChangeLog(v => !v)}
            sx={{ textTransform: 'none', fontWeight: 700, color: P, fontSize: '0.82rem', mb: showChangeLog ? 1.5 : 0 }}>
            {showChangeLog ? '▾ Hide Change Log' : '▸ Show Change Log'}
          </Button>
                    {showChangeLog && (
            <Paper elevation={0} sx={cardSx}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <History sx={{ fontSize: 18, color: P }} />
                <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: P }}>Change Log</Typography>
              </Box>
              <ChangeLogTimeline events={data.change_log} />
            </Paper>
          )}
        </>
      )}

      {/* ═══ EVALUATION FORM DIALOG ═══ */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="lg" fullWidth
        slotProps={{ paper: { sx: { borderRadius: '14px', border: `1px solid ${LINE}`, maxHeight: '90vh' } } }}>
        <DialogContent sx={{ p: 0 }}>
          {formLoading && (
            <Box sx={{ p: 3 }}><Skeleton height={40} sx={{ mb: 2 }} /><Skeleton height={400} /></Box>
          )}
          {!formLoading && formDetail && (
            <Box sx={{ p: { xs: 2, md: 3 }, overflowY: 'auto' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: INK }}>Submitted Evaluation Form</Typography>
                <IconButton size="small" onClick={() => setFormOpen(false)}><Close fontSize="small" /></IconButton>
              </Box>

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
                  alignment_justification: formDetail.alignment_justification || '',
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
export default ComplianceCaseDetail;