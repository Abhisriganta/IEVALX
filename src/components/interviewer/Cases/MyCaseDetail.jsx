// BUILD: 2026-08-29-iaem-mycasedetail-v3 — tabbed signal layout (matches employer CaseDetail)
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Button, Grid, Chip, Skeleton, Divider, TextField,
  Tabs, Tab, Fade,
} from '@mui/material';
import { ArrowBack, Gavel } from '@mui/icons-material';
import { interviewerCaseService } from '@/services/api/iaem';
import {
  EvidenceVideoPlayer, TranscriptSegmentList, AIAnalysisPanel,
  AIScoreBreakdown, SignalBadge, SeverityBadge,
} from '@/components/common/iaem';
import { RESOLUTION_TYPES } from '@/constants/iaem';

/* ── App-native tokens ─────────────────────────────────────────────── */
const T = {
  sage: '#7F9E7E', sageText: '#5E815D', sageSoft: '#EDF3EC', sageDark: '#6C8B6B',
  pine: '#04282B', pineMid: '#0a3d40',
  cream: '#F6F8F3', ink: '#101210', body: '#2F332E', muted: '#55584F', faint: '#7A7E76',
  line: '#E7EAE3', lineSoft: '#F0F2ED', surface: '#FFFFFF',
  green: '#3E6E3E', greenBg: '#EAF2E9',
  amber: '#A35A2D', amberBg: '#F6ECDF',
  red: '#8B2E2E', redBg: '#FAEAE8',
};
const FONT = "'Jost','DM Sans',sans-serif";
const CARD = { borderRadius: '14px', border: `1px solid ${T.line}`, mb: 2 };
const sLabel = { fontSize: '0.68rem', color: T.faint, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', mb: 0.75, fontFamily: FONT };

const SEV_COLOR = {
  CRITICAL: { bg: T.redBg,   color: T.red,   border: 'rgba(139,46,46,0.35)' },
  HIGH:     { bg: T.redBg,   color: T.red,   border: 'rgba(139,46,46,0.35)' },
  MEDIUM:   { bg: T.amberBg, color: T.amber, border: 'rgba(163,90,45,0.35)' },
  LOW:      { bg: T.greenBg, color: T.green, border: 'rgba(62,110,62,0.35)' },
};

/* ── Per-signal evidence renderer (same structure as employer CaseDetail) ── */
const SignalEvidence = ({ pse, handleSeekTo }) => {
  const scopeColor = (scope) => ({
    IN_SCOPE:     { bg: T.greenBg, color: T.green },
    ADJACENT:     { bg: T.amberBg, color: T.amber },
    OUT_OF_SCOPE: { bg: T.redBg,   color: T.red },
  }[scope] || { bg: T.lineSoft, color: T.faint });

  const TsChip = ({ ts, secs }) => ts ? (
    <Chip label={`▶ ${ts}`} size="small" onClick={() => handleSeekTo(secs)}
      sx={{ height: 20, fontSize: '0.6rem', fontWeight: 700, bgcolor: T.sageSoft, color: T.pine, cursor: 'pointer', borderRadius: 1.5, fontFamily: FONT, '&:hover': { bgcolor: T.sageDark, color: '#fff' } }} />
  ) : null;

  return (
    <Fade in timeout={300}>
      <Box>
        {/* Header */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
          <SignalBadge code={pse.signal_code} />
          <SeverityBadge severity={pse.severity} />
          <Typography sx={{ fontWeight: 800, fontFamily: FONT, color: T.ink, ml: 0.5, fontSize: '0.95rem' }}>{pse.signal_name}</Typography>
        </Box>
        <Typography sx={{ color: T.muted, fontFamily: FONT, fontSize: '0.85rem', mb: 2, lineHeight: 1.6 }}>{pse.summary}</Typography>

        {/* ── A6, A7 — Transcript Segments ── */}
        {['A6', 'A7'].includes(pse.signal_code) && (pse.transcript_segments || []).length > 0 && (
          <Box><TranscriptSegmentList segments={pse.transcript_segments} onSeekTo={handleSeekTo} /></Box>
        )}

        {/* ── A1 — Score Comparison ── */}
        {pse.signal_code === 'A1' && pse.evidence && (
          <Box>
            <Typography sx={{ ...sLabel, mt: 1 }}>Score comparison</Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Paper elevation={0} sx={{ p: 2, borderRadius: '10px', bgcolor: T.cream, border: `1px solid ${T.line}`, flex: 1, textAlign: 'center' }}>
                <Typography sx={{ fontSize: '0.68rem', color: T.faint, fontWeight: 600, textTransform: 'uppercase', fontFamily: FONT }}>Interviewer</Typography>
                <Typography sx={{ fontWeight: 800, color: T.pine, fontFamily: FONT, fontSize: '1.15rem', mt: 0.3 }}>{pse.evidence.interviewer_overall}/100</Typography>
              </Paper>
              <Paper elevation={0} sx={{ p: 2, borderRadius: '10px', bgcolor: T.cream, border: `1px solid ${T.line}`, flex: 1, textAlign: 'center' }}>
                <Typography sx={{ fontSize: '0.68rem', color: T.faint, fontWeight: 600, textTransform: 'uppercase', fontFamily: FONT }}>AI</Typography>
                <Typography sx={{ fontWeight: 800, color: T.sageText, fontFamily: FONT, fontSize: '1.15rem', mt: 0.3 }}>{pse.evidence.ai_overall}/100</Typography>
              </Paper>
            </Box>
            <Box sx={{ mt: 2 }}><AIScoreBreakdown signalEvidence={pse.evidence} /></Box>
          </Box>
        )}

        {/* ── A3 — Question Scope ── */}
        {pse.signal_code === 'A3' && pse.evidence && (
          <Box>
            {pse.evidence.scope_summary && (
              <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                <Chip label={`In-scope: ${pse.evidence.scope_summary.in_scope || 0}`} size="small" sx={{ bgcolor: T.greenBg, color: T.green, fontWeight: 700, fontFamily: FONT, border: '1px solid rgba(62,110,62,0.25)' }} />
                <Chip label={`Adjacent: ${pse.evidence.scope_summary.adjacent || 0}`} size="small" sx={{ bgcolor: T.amberBg, color: T.amber, fontWeight: 700, fontFamily: FONT, border: '1px solid rgba(163,90,45,0.25)' }} />
                <Chip label={`Out-of-scope: ${pse.evidence.scope_summary.out_of_scope || 0}`} size="small" sx={{ bgcolor: T.redBg, color: T.red, fontWeight: 700, fontFamily: FONT, border: '1px solid rgba(139,46,46,0.2)' }} />
              </Box>
            )}
            {(pse.evidence.questions || []).map((q, i) => {
              const sc = scopeColor(q.scope);
              return (
                <Box key={i} sx={{ p: 1.5, mb: 0.5, borderRadius: '10px', bgcolor: q.scope === 'OUT_OF_SCOPE' ? T.amberBg : T.cream,
                  border: q.scope === 'OUT_OF_SCOPE' ? '1px solid rgba(163,90,45,0.2)' : '1px solid transparent' }}>
                  <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', mb: 0.5 }}>
                    <Chip label={q.scope?.replace('_', ' ')} size="small" sx={{ height: 18, fontWeight: 700, fontSize: '0.65rem', fontFamily: FONT, bgcolor: sc.bg, color: sc.color }} />
                    <TsChip ts={q.timestamp} secs={q.timestamp_secs} />
                  </Box>
                  <Typography sx={{ color: T.body, fontFamily: FONT, fontSize: '0.88rem' }}>"{q.question}"</Typography>
                </Box>
              );
            })}
          </Box>
        )}

        {/* ── A4 — Level Mismatch ── */}
        {pse.signal_code === 'A4' && pse.evidence && (
          <Box>
            <Typography sx={{ color: T.muted, fontFamily: FONT, fontSize: '0.88rem', mb: 1 }}>
              Expected: <b>{pse.evidence.expected_level}</b> — Questions were <b>{pse.evidence.mismatch_direction?.replace('_', ' ')}</b>
            </Typography>
            {(pse.evidence.questions || []).map((q, i) => (
              <Box key={i} sx={{ p: 1.5, mb: 0.5, borderRadius: '10px', bgcolor: T.cream }}>
                <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', mb: 0.5 }}>
                  <Chip label={q.difficulty} size="small" sx={{ height: 18, fontWeight: 700, fontSize: '0.65rem', fontFamily: FONT, bgcolor: T.lineSoft, color: T.muted }} />
                  <TsChip ts={q.timestamp} secs={q.timestamp_secs} />
                </Box>
                <Typography component="span" sx={{ color: T.body, fontFamily: FONT, fontSize: '0.88rem' }}>"{q.question}"</Typography>
              </Box>
            ))}
          </Box>
        )}

        {/* ── A8 — Duration ── */}
        {pse.signal_code === 'A8' && pse.evidence && (
          <Box>
            {pse.evidence.duration_stats && (
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <Box sx={{ p: 2, borderRadius: '10px', bgcolor: T.greenBg, border: '1px solid rgba(62,110,62,0.25)', flex: 1, textAlign: 'center' }}>
                  <Typography sx={{ color: T.green, fontFamily: FONT, fontSize: '0.72rem', fontWeight: 600 }}>Hire avg</Typography>
                  <Typography sx={{ fontWeight: 800, color: T.green, fontFamily: FONT, fontSize: '1.1rem' }}>{pse.evidence.duration_stats.avg_hire_mins} min</Typography>
                </Box>
                <Box sx={{ p: 2, borderRadius: '10px', bgcolor: T.redBg, border: '1px solid rgba(139,46,46,0.2)', flex: 1, textAlign: 'center' }}>
                  <Typography sx={{ color: T.red, fontFamily: FONT, fontSize: '0.72rem', fontWeight: 600 }}>No-Hire avg</Typography>
                  <Typography sx={{ fontWeight: 800, color: T.red, fontFamily: FONT, fontSize: '1.1rem' }}>{pse.evidence.duration_stats.avg_nohire_mins} min</Typography>
                </Box>
              </Box>
            )}
            {(pse.evidence.interviews || []).map((iv, i) => (
              <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75, borderBottom: `1px solid ${T.line}` }}>
                <Typography sx={{ color: T.muted, fontFamily: FONT, fontSize: '0.85rem' }}>{iv.date}</Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Typography sx={{ fontWeight: 700, fontFamily: FONT, fontSize: '0.85rem', color: T.ink }}>{iv.duration_mins} min</Typography>
                  <Chip label={iv.recommendation} size="small" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700, fontFamily: FONT, bgcolor: T.lineSoft, color: T.muted }} />
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Fade>
  );
};

/* ═══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════ */
const MyCaseDetail = () => {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [contextResponse, setContextResponse] = useState('');
  const [submittingResponse, setSubmittingResponse] = useState(false);
  const [activeSignalIdx, setActiveSignalIdx] = useState(0);

  const videoRef = useRef(null);
  const videoContainerRef = useRef(null);

  const handleSeekTo = useCallback((seconds) => {
    if (!seconds && seconds !== 0) return;
    if (videoContainerRef.current) videoContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => { if (videoRef.current?.seekTo) videoRef.current.seekTo(seconds); }, 400);
  }, []);

  const handleSubmitResponse = async () => {
    if (contextResponse.length < 50) return;
    setSubmittingResponse(true);
    try {
      await interviewerCaseService.respondToContext(caseId, contextResponse);
      alert('Your response has been submitted. The case is now back with HR.');
      navigate('/interviewer/cases');
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to submit response.');
    } finally { setSubmittingResponse(false); }
  };

  useEffect(() => {
    interviewerCaseService.getCaseDetail(caseId).then(r => setData(r.data)).catch(console.error).finally(() => setLoading(false));
  }, [caseId]);

  /* Sort signals: CRITICAL/HIGH first, then MEDIUM, then LOW */
  const sortedSignals = useMemo(() => {
    if (!data?.per_signal_evidence?.length) return [];
    const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return [...data.per_signal_evidence].sort((a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9));
  }, [data?.per_signal_evidence]);

  const activeSignal = sortedSignals[activeSignalIdx] || null;
  const hasPerSignal = sortedSignals.length > 0;

  if (loading) return (
    <Box sx={{ p: 3 }}>
      <Skeleton variant="rounded" height={100} sx={{ borderRadius: '14px', mb: 2 }} />
      <Skeleton variant="rounded" height={80} sx={{ borderRadius: '14px', mb: 2 }} />
      <Skeleton variant="rounded" height={400} sx={{ borderRadius: '14px' }} />
    </Box>
  );
  if (!data) return <Box sx={{ p: 3 }}><Typography sx={{ fontFamily: FONT, color: T.muted }}>Case not found.</Typography></Box>;

  const canAppeal = !data.appeal_filed && data.appeal_deadline && new Date(data.appeal_deadline) > new Date();

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: 'auto' }}>
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/interviewer/cases')}
        sx={{ mb: 1.5, textTransform: 'none', color: T.pine, fontWeight: 700, fontFamily: FONT, fontSize: '0.85rem', borderRadius: '10px', '&:hover': { bgcolor: T.sageSoft } }}>
        Back to My Cases
      </Button>

      {/* ═══ HEADER CARD ═══ */}
      <Paper elevation={0} sx={{ p: { xs: 2, md: 2.5 }, ...CARD, bgcolor: T.cream }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography sx={{ fontWeight: 800, fontFamily: FONT, color: T.ink, fontSize: '1.15rem' }}>{data.case_id}</Typography>
            <Chip label={RESOLUTION_TYPES[data.resolution]?.label || data.state} size="small" sx={{
              fontWeight: 700, fontSize: '0.68rem', fontFamily: FONT,
              bgcolor: data.state === 'RESOLVED' ? T.greenBg : T.amberBg,
              color: data.state === 'RESOLVED' ? T.green : T.amber,
              border: data.state === 'RESOLVED' ? '1px solid rgba(62,110,62,0.25)' : '1px solid rgba(163,90,45,0.25)',
            }} />
          </Box>
          {canAppeal && (
            <Button variant="contained" size="small" startIcon={<Gavel />} onClick={() => navigate(`/interviewer/cases/${caseId}/appeal`)}
              sx={{ textTransform: 'none', fontWeight: 700, fontFamily: FONT, bgcolor: T.pine, borderRadius: '10px', boxShadow: 'none', fontSize: '0.82rem',
                '&:hover': { bgcolor: T.pineMid, boxShadow: 'none' } }}>
              File an Appeal
            </Button>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center', mb: 1 }}>
          {[data.job_title, data.level, data.interview_date].filter(Boolean).map((item, i, arr) => (
            <React.Fragment key={i}>
              <Typography sx={{ fontSize: '0.82rem', color: T.muted, fontFamily: FONT }}>{item}</Typography>
              {i < arr.length - 1 && <Typography sx={{ fontSize: '0.82rem', color: T.faint }}>·</Typography>}
            </React.Fragment>
          ))}
        </Box>
        {/* Signal badges row */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {(data.signals || data.per_signal_evidence || []).map((s, i) => {
            const sev = SEV_COLOR[s.severity] || SEV_COLOR.MEDIUM;
            return (
              <Box key={i} sx={{
                display: 'inline-flex', gap: 0.75, alignItems: 'center',
                px: 1, py: 0.5, borderRadius: '10px',
                bgcolor: sev.bg, border: `1px solid ${sev.border}`,
              }}>
                <SignalBadge code={s.signal_code} />
                <SeverityBadge severity={s.severity} />
              </Box>
            );
          })}
        </Box>

        {data.appeal_filed && data.appeal && (
          <Chip label={`Appeal ${data.appeal.status}`} size="small" clickable
            onClick={() => navigate(`/interviewer/appeals/${data.appeal.appeal_id}`)}
            sx={{ mt: 1.5, fontWeight: 700, fontFamily: FONT, bgcolor: T.sageSoft, color: T.sageText, cursor: 'pointer', border: `1px solid rgba(127,158,126,0.22)` }} />
        )}
      </Paper>

      {/* ═══ RESOLUTION RATIONALE ═══ */}
      {data.resolution_rationale && (
        <Paper elevation={0} sx={{ p: { xs: 2, md: 2.5 }, ...CARD }}>
          <Typography sx={sLabel}>Resolution rationale</Typography>
          <Typography sx={{ color: T.body, fontFamily: FONT, fontSize: '0.88rem', lineHeight: 1.6 }}>{data.resolution_rationale}</Typography>
          {data.coaching_resources?.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography sx={sLabel}>Coaching resources</Typography>
              {data.coaching_resources.map((cr, i) => (
                <Chip key={i} label={`${cr.title} (${cr.duration})`} size="small" clickable component="a" href={cr.link} target="_blank"
                  sx={{ mr: 0.5, mb: 0.5, bgcolor: T.greenBg, color: T.green, fontWeight: 600, fontFamily: FONT, border: '1px solid rgba(62,110,62,0.25)' }} />
              ))}
            </Box>
          )}
        </Paper>
      )}

      {/* ═══ AWAITING RESPONSE ═══ */}
      {data.state === 'AWAITING_RESPONSE' && (
        <Paper elevation={0} sx={{ p: { xs: 2, md: 2.5 }, ...CARD, bgcolor: T.amberBg, borderColor: 'rgba(163,90,45,0.25)' }}>
          <Typography sx={{ fontWeight: 800, color: T.amber, fontFamily: FONT, fontSize: '0.95rem', mb: 1 }}>HR has requested your response</Typography>
          {data.comments?.length > 0 && (
            <Box sx={{ mb: 2, p: 2, borderRadius: '10px', bgcolor: T.surface, border: `1px solid ${T.line}` }}>
              <Typography sx={sLabel}>HR's message</Typography>
              <Typography sx={{ color: T.body, fontWeight: 500, fontFamily: FONT, fontSize: '0.88rem' }}>
                {data.comments.filter(c => !c.text.startsWith('[Interviewer Response]')).slice(-1)[0]?.text || 'No specific message provided.'}
              </Typography>
              <Typography sx={{ color: T.faint, mt: 0.5, display: 'block', fontFamily: FONT, fontSize: '0.75rem' }}>
                {data.comments.filter(c => !c.text.startsWith('[Interviewer Response]')).slice(-1)[0]?.author} — {new Date(data.comments.filter(c => !c.text.startsWith('[Interviewer Response]')).slice(-1)[0]?.created_at).toLocaleString()}
              </Typography>
            </Box>
          )}
          <Typography sx={{ color: T.muted, fontFamily: FONT, fontSize: '0.88rem', mb: 2 }}>
            Your response will be added to the case and sent back to HR for review.
          </Typography>
          <TextField fullWidth multiline rows={3} size="small" label="Your response (min 50 characters)"
            value={contextResponse} onChange={e => setContextResponse(e.target.value)}
            error={contextResponse.length > 0 && contextResponse.length < 50}
            helperText={`${contextResponse.length} characters`}
            sx={{ mb: 2,
              '& .MuiOutlinedInput-root': { fontFamily: FONT, bgcolor: T.surface, '& fieldset': { borderColor: T.line }, '&:hover fieldset': { borderColor: T.sage }, '&.Mui-focused fieldset': { borderColor: T.pine } },
              '& .MuiInputLabel-root': { fontFamily: FONT, color: T.faint, '&.Mui-focused': { color: T.pine } },
            }} />
          <Button variant="contained" disabled={contextResponse.length < 50 || submittingResponse}
            onClick={handleSubmitResponse}
            sx={{ textTransform: 'none', fontWeight: 700, fontFamily: FONT, bgcolor: T.amber, borderRadius: '10px', boxShadow: 'none',
              '&:hover': { bgcolor: '#8A4A20', boxShadow: 'none' },
              '&.Mui-disabled': { bgcolor: T.lineSoft, color: T.faint },
            }}>
            {submittingResponse ? 'Submitting...' : 'Submit Response'}
          </Button>
        </Paper>
      )}

      {/* ═══ FULL INTERVIEW RECORDING ═══ */}
      {(data.video_segment_url || data.audio_segment_url) && (
        <Paper ref={videoContainerRef} elevation={0} sx={{ p: { xs: 2, md: 2.5 }, ...CARD }}>
          <Typography sx={{ fontWeight: 800, fontFamily: FONT, color: T.ink, fontSize: '0.95rem', mb: 0.3 }}>Full interview recording</Typography>
          <Typography sx={{ color: T.faint, fontFamily: FONT, fontSize: '0.78rem', mb: 2 }}>
            Click any timestamp in the evidence below to jump to that moment in the recording.
          </Typography>
          <EvidenceVideoPlayer ref={videoRef} videoSrc={data.video_segment_url} audioSrc={data.audio_segment_url} segmentLabel="Full interview recording" />
        </Paper>
      )}

      {/* ═══ TABBED SIGNALS + AI ANALYSIS (matches employer CaseDetail) ═══ */}
      {hasPerSignal && (
        <>
          {/* Signal tabs */}
          <Paper elevation={0} sx={{ borderRadius: '14px', border: `1px solid ${T.line}`, mb: 0, overflow: 'hidden' }}>
            <Tabs value={activeSignalIdx} onChange={(_, v) => setActiveSignalIdx(v)} variant="scrollable" scrollButtons="auto"
              sx={{
                bgcolor: T.cream, minHeight: 40,
                '& .MuiTab-root': {
                  textTransform: 'none', fontWeight: 600, fontSize: '0.82rem', fontFamily: FONT,
                  minHeight: 40, color: T.faint, px: 2, gap: 0.75,
                  '&.Mui-selected': { color: T.pine, fontWeight: 700 },
                },
                '& .MuiTabs-indicator': { height: 2.5, borderRadius: '2px 2px 0 0', backgroundColor: T.pine },
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
              <Paper elevation={0} sx={{ p: { xs: 2, md: 2.5 }, ...CARD, mt: 0 }}>
                {activeSignal && <SignalEvidence pse={activeSignal} handleSeekTo={handleSeekTo} />}
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <Paper elevation={0} sx={{ borderRadius: '14px', border: `1px solid ${T.line}` }}>
                {activeSignal && (
                  <AIAnalysisPanel
                    classification={activeSignal.classification}
                    modelCard={activeSignalIdx === 0 ? data.model_card : null}
                  />
                )}
              </Paper>
            </Grid>
          </Grid>
        </>
      )}

      {/* Fallback: if no per_signal_evidence, show legacy view */}
      {!hasPerSignal && (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 7 }}>
            <Paper elevation={0} sx={{ p: { xs: 2, md: 2.5 }, ...CARD }}>
              <Typography sx={{ fontWeight: 800, fontFamily: FONT, color: T.ink, fontSize: '0.95rem', mb: 2 }}>Evidence</Typography>
              <Typography sx={{ color: T.faint, fontFamily: FONT, fontSize: '0.88rem' }}>No detailed evidence available for this case.</Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 5 }}>
            <Paper elevation={0} sx={{ borderRadius: '14px', border: `1px solid ${T.line}` }}>
              <AIAnalysisPanel classification={data.classification} modelCard={data.model_card} />
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default MyCaseDetail;