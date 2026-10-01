import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogActions,
  Box, Typography, Button, Stack, CircularProgress,
  Chip, LinearProgress, Divider, Alert, IconButton,
  TextField, FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import {
  Close, CheckCircle, TrendingUp, ThumbUp, ThumbDown,
  Star, EmojiEvents,
} from '@mui/icons-material';
import { interviewAPI } from '../../../services/api/employer/candidateService';
import { useSnackbar } from 'notistack';

// ── Shared: dialog paper style ────────────────────────────────────────────────
const dialogPaper = {
  borderRadius: { xs: 0, sm: '16px' },
  m: { xs: 0, sm: 2 },
  maxHeight: { xs: '100dvh', sm: '90vh' },
  width: { xs: '100%', sm: 'auto' },
  '@media (max-width: 240px)': { m: 0, borderRadius: 0 },
};

// ── Shared: gradient dialog header ───────────────────────────────────────────
function GradHeader({ gradient, title, subtitle, onClose }) {
  return (
    <Box
      sx={{
        background: gradient,
        px: { xs: 2, sm: 2.5 },
        pt: { xs: 2.2, sm: 2.8 },
        pb: { xs: 1.8, sm: 2.2 },
        '@media (max-width: 240px)': { px: 1.5, pt: 1.5, pb: 1.2 },
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography
            sx={{
              color: 'white',
              fontWeight: 800,
              fontSize: { xs: '0.92rem', sm: '1.05rem' },
              '@media (max-width: 240px)': { fontSize: '0.78rem' },
            }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography
              sx={{
                color: 'rgba(255,255,255,0.65)',
                fontSize: { xs: '0.68rem', sm: '0.75rem' },
                mt: 0.4,
                '@media (max-width: 240px)': { fontSize: '0.6rem' },
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
        <IconButton
          size="small"
          onClick={onClose}
          sx={{ color: 'rgba(255,255,255,0.7)', '&:hover': { color: 'white', bgcolor: 'rgba(255,255,255,0.12)' } }}
        >
          <Close fontSize="small" />
        </IconButton>
      </Stack>
    </Box>
  );
}

// ── Shared: score bar ─────────────────────────────────────────────────────────
function ScoreBar({ label, value, max = 10 }) {
  const pct = value != null ? Math.min((value / max) * 100, 100) : 0;
  const col  = pct >= 70 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444';
  return (
    <Box sx={{ mb: { xs: 1.2, sm: 1.5 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.4 }}>
        <Typography
          sx={{
            fontSize: { xs: '0.72rem', sm: '0.78rem' },
            color: '#64748B',
            fontWeight: 500,
            '@media (max-width: 240px)': { fontSize: '0.62rem' },
          }}
        >
          {label}
        </Typography>
        <Typography
          sx={{
            fontSize: { xs: '0.75rem', sm: '0.82rem' },
            fontWeight: 700,
            color: value != null ? col : '#CBD5E1',
          }}
        >
          {value != null ? `${value.toFixed(1)}/${max}` : '—'}
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          height: { xs: 4, sm: 6 },
          borderRadius: 3,
          bgcolor: '#F1F5F9',
          '& .MuiLinearProgress-bar': { bgcolor: col, borderRadius: 3 },
        }}
      />
    </Box>
  );
}

// ── Shared: close-only dialog actions ─────────────────────────────────────────
function CloseActions({ onClose }) {
  return (
    <DialogActions
      sx={{
        px: { xs: 2, sm: 2.5 },
        py: { xs: 1.5, sm: 2 },
        borderTop: '1px solid #E2E8F0',
        '@media (max-width: 240px)': { px: 1.5, py: 1 },
      }}
    >
      <Button
        onClick={onClose}
        sx={{
          textTransform: 'none',
          color: '#64748B',
          fontSize: { xs: '0.78rem', sm: '0.85rem' },
        }}
      >
        Close
      </Button>
    </DialogActions>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ResultPreview
// Props: open, sessionId, interviewType, candidateName, interviewName,
//        onClose, onScoreLoaded
// ─────────────────────────────────────────────────────────────────────────────
export function ResultPreview({
  open, sessionId, interviewType, candidateName, interviewName,
  onClose, onScoreLoaded,
}) {
  const [loading, setLoading] = useState(false);
  const [data,    setData]    = useState(null);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (!open || !sessionId) return;
    setLoading(true); setData(null); setError('');
    (async () => {
      try {
        if (interviewType === 'ai-powered' || interviewType === 'aptitude') {
          const res = await interviewAPI.getDocResult(sessionId);
          setData({ type: 'ai', ...res.data });
        } else if (interviewType === 'document') {
          const res = await interviewAPI.getDocResult(sessionId);
          const d   = res.data;
          setData({ type: 'document', ...d });
          const answered = (d.qa_pairs || []).filter(q => !q.skipped && q.ai_score != null);
          const pct = answered.length
            ? Math.round(answered.reduce((s, q) => s + q.ai_score, 0) / answered.length * 10)
            : null;
          const overall = d.overall_pct ?? (d.overall_score != null ? Math.round(d.overall_score * 10) : null) ?? pct;
          if (overall != null && onScoreLoaded) onScoreLoaded(sessionId, overall);
        } else if (interviewType === 'live-video') {
          const res = await interviewAPI.getResult(sessionId);
          setData({ type: 'live', ...res.data });
        }
      } catch (e) {
        setError(e?.message || 'Failed to load results');
      } finally {
        setLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sessionId, interviewType]);

  const typeLabel = {
    'ai-powered': '🤖 AI Interview',
    document:     '📄 Document',
    'live-video': '🎥 Live Video',
    aptitude:     '📝 Aptitude Test',
  };

  const scrollContent = {
    p: { xs: 2, sm: 2.5 },
    overflowY: 'auto',
    '&::-webkit-scrollbar': { width: 4 },
    '&::-webkit-scrollbar-thumb': { bgcolor: '#E2E8F0', borderRadius: 2 },
    '@media (max-width: 240px)': { p: 1.5 },
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: dialogPaper }}>
      <GradHeader
        gradient="linear-gradient(135deg, #1E3358 0%, #2D4E80 100%)"
        title="Interview Results"
        subtitle={`${typeLabel[interviewType] || interviewType} · ${candidateName}`}
        onClose={onClose}
      />

      <DialogContent sx={scrollContent}>
        {/* Loading */}
        {loading && (
          <Stack alignItems="center" justifyContent="center" sx={{ py: { xs: 5, sm: 7 } }}>
            <CircularProgress size={28} sx={{ color: '#1E3358' }} />
            <Typography sx={{ mt: 1.5, color: '#94A3B8', fontSize: '0.82rem' }}>Loading results…</Typography>
          </Stack>
        )}

        {!loading && error && (
          <Alert severity="error" sx={{ borderRadius: '10px' }}>{error}</Alert>
        )}

        {!loading && !error && !data && (
          <Alert severity="info" sx={{ borderRadius: '10px' }}>No results available yet.</Alert>
        )}

        {/* ── AI-Powered results ── */}
        {data?.type === 'ai' && (
          <Stack spacing={{ xs: 1.8, sm: 2.2 }}>
            <Box
              sx={{
                p: { xs: 1.5, sm: 2 },
                bgcolor: '#F8FAFF',
                borderRadius: '12px',
                border: '1px solid #E0E7FF',
              }}
            >
              <Typography
                sx={{
                  fontSize: { xs: '0.62rem', sm: '0.68rem' },
                  fontWeight: 700,
                  color: '#4338CA',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  mb: { xs: 1.2, sm: 1.5 },
                }}
              >
                               CGPS Score Breakdown
              </Typography>
              {[
                { label: 'Overall',                            value: data.cgps_overall },
                { label: 'Technical competency',               value: data.cgps_technical },
                { label: 'Problem solving & reasoning',        value: data.cgps_problem_solving },
                { label: 'Communication',                      value: data.cgps_communication },
                { label: 'Role / job relevance',               value: data.cgps_relevance },
                { label: 'Behavioral & professional skills',   value: data.cgps_clarity },
                { label: 'Confidence & interview conduct',     value: data.cgps_confidence },
              ].map(s => <ScoreBar key={s.label} label={s.label} value={s.value} />)}
            </Box>

            {data.ai_summary && (
              <Box sx={{ p: { xs: 1.2, sm: 1.5 }, bgcolor: '#F0F9FF', borderRadius: '10px', border: '1px solid #BAE6FD' }}>
                <Typography sx={{ fontSize: { xs: '0.62rem', sm: '0.68rem' }, color: '#0369A1', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.6 }}>
                  AI Summary
                </Typography>
                <Typography sx={{ fontSize: { xs: '0.78rem', sm: '0.83rem' }, color: '#0C4A6E', lineHeight: 1.65 }}>{data.ai_summary}</Typography>
              </Box>
            )}

            {data.ai_strengths?.length > 0 && (
              <Box>
                <Typography sx={{ fontSize: { xs: '0.62rem', sm: '0.68rem' }, fontWeight: 700, color: '#16A34A', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.8 }}>
                  💪 Strengths
                </Typography>
                <Stack spacing={0.6}>
                  {data.ai_strengths.map((s, i) => (
                    <Stack key={i} direction="row" spacing={1} alignItems="flex-start">
                      <CheckCircle sx={{ fontSize: { xs: 13, sm: 14 }, color: '#16A34A', mt: 0.3, flexShrink: 0 }} />
                      <Typography sx={{ fontSize: { xs: '0.78rem', sm: '0.83rem' }, color: '#374151' }}>{s}</Typography>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            )}

            {data.ai_improvements?.length > 0 && (
              <Box>
                <Typography sx={{ fontSize: { xs: '0.62rem', sm: '0.68rem' }, fontWeight: 700, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.8 }}>
                  📈 Areas to Improve
                </Typography>
                <Stack spacing={0.6}>
                  {data.ai_improvements.map((s, i) => (
                    <Stack key={i} direction="row" spacing={1} alignItems="flex-start">
                      <TrendingUp sx={{ fontSize: { xs: 13, sm: 14 }, color: '#D97706', mt: 0.3, flexShrink: 0 }} />
                      <Typography sx={{ fontSize: { xs: '0.78rem', sm: '0.83rem' }, color: '#374151' }}>{s}</Typography>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            )}
          </Stack>
        )}

        {/* ── Document results ── */}
        {data?.type === 'document' && (
          <Stack spacing={{ xs: 1.8, sm: 2.2 }}>
            {/* Summary stats */}
            <Stack direction="row" spacing={{ xs: 1, sm: 1.5 }} flexWrap="wrap" useFlexGap>
              {[
                { label: 'Questions', value: data.total_questions || 0, color: '#3B82F6' },
                { label: 'Answered',  value: data.answered || 0,        color: '#10B981' },
                { label: 'Skipped',   value: data.skipped || 0,         color: '#F59E0B' },
                {
                  label: 'Score',
                  value: data.overall_pct != null ? `${(data.overall_pct / 10).toFixed(1)}/10` : '—',
                  color: '#6366F1',
                },
              ].map(({ label, value, color }) => (
                <Box
                  key={label}
                  sx={{
                    flex: 1,
                    minWidth: { xs: 64, sm: 76 },
                    p: { xs: 1.2, sm: 1.5 },
                    bgcolor: '#F8FAFC',
                    borderRadius: '10px',
                    border: '1px solid #E2E8F0',
                    textAlign: 'center',
                    '@media (max-width: 240px)': { minWidth: 52, p: 0.8 },
                  }}
                >
                  <Typography sx={{ fontSize: { xs: '1rem', sm: '1.15rem' }, fontWeight: 800, color }}>
                    {value}
                  </Typography>
                  <Typography sx={{ fontSize: { xs: '0.6rem', sm: '0.65rem' }, color: '#94A3B8', fontWeight: 600 }}>
                    {label}
                  </Typography>
                </Box>
              ))}
            </Stack>

            {data.no_data ? (
              <Alert severity="info" sx={{ borderRadius: '10px' }}>
                {data.message || 'No answers submitted yet.'}
              </Alert>
            ) : (
              <Stack spacing={{ xs: 1, sm: 1.2 }}>
                {(data.qa_pairs || []).map((qa, i) => (
                  <Box
                    key={i}
                    sx={{
                      p: { xs: 1.2, sm: 1.5 },
                      bgcolor: qa.skipped ? '#FFF7ED' : '#F8FAFC',
                      borderRadius: '10px',
                      border: `1px solid ${qa.skipped ? '#FED7AA' : '#E2E8F0'}`,
                    }}
                  >
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="flex-start"
                      sx={{ mb: 0.6 }}
                    >
                      <Typography
                        sx={{
                          fontSize: { xs: '0.75rem', sm: '0.8rem' },
                          fontWeight: 600,
                          color: '#374151',
                          flex: 1,
                          mr: 1,
                          '@media (max-width: 240px)': { fontSize: '0.65rem' },
                        }}
                      >
                        Q{i + 1}. {qa.question}
                      </Typography>
                      {qa.ai_score != null && (
                        <Chip
                          label={`${qa.ai_score.toFixed(1)}/10`}
                          size="small"
                          sx={{
                            flexShrink: 0,
                            height: { xs: 18, sm: 20 },
                            fontSize: { xs: '0.6rem', sm: '0.62rem' },
                            fontWeight: 700,
                            bgcolor: qa.ai_score >= 7 ? '#ECFDF5' : qa.ai_score >= 5 ? '#FEF9C3' : '#FEF2F2',
                            color:   qa.ai_score >= 7 ? '#065F46' : qa.ai_score >= 5 ? '#713F12' : '#991B1B',
                          }}
                        />
                      )}
                    </Stack>
                    {qa.skipped ? (
                      <Typography sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' }, color: '#D97706', fontStyle: 'italic' }}>
                        ⏭ Skipped
                      </Typography>
                    ) : (
                      <Typography sx={{ fontSize: { xs: '0.73rem', sm: '0.78rem' }, color: '#475569', lineHeight: 1.55 }}>
                        {qa.answer || '—'}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Stack>
            )}
          </Stack>
        )}

        {/* ── Live video results ── */}
        {data?.type === 'live' && (
          <Stack spacing={{ xs: 1.8, sm: 2.2 }}>
            {data.overall_score != null ? (
              <>
                <Box
                  sx={{
                    p: { xs: 2, sm: 2.5 },
                    bgcolor: '#F8FAFC',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    textAlign: 'center',
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: { xs: '1.8rem', sm: '2.2rem' },
                      fontWeight: 900,
                      lineHeight: 1,
                      color: data.overall_score >= 70 ? '#10B981' : data.overall_score >= 50 ? '#F59E0B' : '#EF4444',
                    }}
                  >
                    {(data.overall_score / 10).toFixed(1)}
                    <Box component="span" sx={{ fontSize: { xs: '0.9rem', sm: '1rem' }, color: '#94A3B8', fontWeight: 400 }}>
                      /10
                    </Box>
                  </Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: '#94A3B8', mt: 0.5 }}>Overall Score</Typography>
                  {data.recommendation && (
                    <Chip
                      label={data.recommendation.replace(/-/g, ' ')}
                      size="small"
                      sx={{ mt: 1, textTransform: 'capitalize', fontWeight: 700, bgcolor: '#EEF2FF', color: '#4338CA', fontSize: '0.65rem', height: 22 }}
                    />
                  )}
                </Box>

                {data.overall_feedback && (
                  <Box sx={{ p: { xs: 1.2, sm: 1.5 }, bgcolor: '#F0F9FF', borderRadius: '10px', border: '1px solid #BAE6FD' }}>
                    <Typography sx={{ fontSize: { xs: '0.62rem', sm: '0.68rem' }, color: '#0369A1', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.6 }}>
                      Feedback
                    </Typography>
                    <Typography sx={{ fontSize: { xs: '0.78rem', sm: '0.83rem' }, color: '#0C4A6E', lineHeight: 1.65 }}>
                      {data.overall_feedback}
                    </Typography>
                  </Box>
                )}

                {[
                  { key: 'strengths',    label: '💪 Strengths',        color: '#16A34A', Icon: CheckCircle },
                  { key: 'improvements', label: '📈 Areas to Improve', color: '#D97706', Icon: TrendingUp  },
                  { key: 'next_steps',   label: '🗺 Next Steps',        color: '#4338CA', Icon: TrendingUp  },
                ].filter(({ key }) => data[key]?.length > 0).map(({ key, label, color, Icon }) => (
                  <Box key={key}>
                    <Typography sx={{ fontSize: { xs: '0.62rem', sm: '0.68rem' }, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.8 }}>
                      {label}
                    </Typography>
                    <Stack spacing={0.5}>
                      {data[key].map((s, i) => (
                        <Stack key={i} direction="row" spacing={1} alignItems="flex-start">
                          <Icon sx={{ fontSize: { xs: 12, sm: 14 }, color, mt: 0.35, flexShrink: 0 }} />
                          <Typography sx={{ fontSize: { xs: '0.75rem', sm: '0.81rem' }, color: '#374151' }}>{s}</Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </Box>
                ))}
              </>
            ) : (
              <Alert severity="info" sx={{ borderRadius: '10px' }}>
                No score submitted yet. Use the <strong>Score</strong> button on the Live Video tab.
              </Alert>
            )}
          </Stack>
        )}
      </DialogContent>

      <CloseActions onClose={onClose} />
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FeedbackPreview
// Props: open, interviewId, candidateName, interviewName, onClose
// ─────────────────────────────────────────────────────────────────────────────
export function FeedbackPreview({ open, interviewId, candidateName, interviewName, onClose }) {
  const [loading,  setLoading]  = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (!open || !interviewId) return;
    setLoading(true); setFeedback(null);
    interviewAPI
      .getFeedbackByInterview(interviewId)
      .then(r => {
        const d = r.data;
        setFeedback(d?.results?.[0] || (d && !d.no_data ? d : null));
      })
      .catch(() => setFeedback(null))
      .finally(() => setLoading(false));
  }, [open, interviewId]);

  const ratingFields = [
    { label: 'Overall Experience',  key: 'overall_experience'  },
    { label: 'Difficulty',          key: 'interview_difficulty' },
    { label: 'Communication',       key: 'communication_rating' },
    { label: 'Process Fairness',    key: 'process_fairness'    },
    { label: 'Tech Experience',     key: 'tech_experience'     },
  ];

  const scrollContent = {
    p: { xs: 2, sm: 2.5 },
    overflowY: 'auto',
    '&::-webkit-scrollbar': { width: 4 },
    '&::-webkit-scrollbar-thumb': { bgcolor: '#E2E8F0', borderRadius: 2 },
    '@media (max-width: 240px)': { p: 1.5 },
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: dialogPaper }}>
      <GradHeader
        gradient="linear-gradient(135deg, #065F46 0%, #047857 100%)"
        title="Candidate Feedback"
        subtitle={`${candidateName} · ${interviewName}`}
        onClose={onClose}
      />

      <DialogContent sx={scrollContent}>
        {loading && (
          <Stack alignItems="center" sx={{ py: { xs: 5, sm: 7 } }}>
            <CircularProgress size={26} sx={{ color: '#065F46' }} />
          </Stack>
        )}

        {!loading && !feedback && (
          <Alert severity="info" sx={{ borderRadius: '10px' }}>
            No feedback submitted by the candidate yet.
          </Alert>
        )}

        {!loading && feedback && (
          <Stack spacing={{ xs: 2, sm: 2.5 }}>
            {/* Ratings */}
            <Box
              sx={{
                p: { xs: 1.5, sm: 2 },
                bgcolor: '#F0FDF4',
                borderRadius: '12px',
                border: '1px solid #A7F3D0',
              }}
            >
              <Typography
                sx={{
                  fontSize: { xs: '0.62rem', sm: '0.68rem' },
                  fontWeight: 700,
                  color: '#065F46',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  mb: { xs: 1.2, sm: 1.5 },
                }}
              >
                Ratings
              </Typography>
              <Stack spacing={{ xs: 1, sm: 1.2 }}>
                {ratingFields.map(({ label, key }) => (
                  <Stack key={key} direction="row" justifyContent="space-between" alignItems="center">
                    <Typography sx={{ fontSize: { xs: '0.75rem', sm: '0.8rem' }, color: '#374151' }}>
                      {label}
                    </Typography>
                    {feedback[key] != null ? (
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Typography sx={{ fontSize: { xs: '0.78rem', sm: '0.82rem' }, fontWeight: 800, color: '#065F46' }}>
                          {feedback[key]}/5
                        </Typography>
                        <Stack direction="row">
                          {[1, 2, 3, 4, 5].map(n => (
                            <Star
                              key={n}
                              sx={{
                                fontSize: { xs: 12, sm: 14 },
                                color: n <= feedback[key] ? '#F59E0B' : '#E2E8F0',
                              }}
                            />
                          ))}
                        </Stack>
                      </Stack>
                    ) : (
                      <Typography sx={{ fontSize: '0.75rem', color: '#CBD5E1' }}>—</Typography>
                    )}
                  </Stack>
                ))}
              </Stack>
            </Box>

            {/* Would recommend */}
            {feedback.would_recommend != null && (
              <Stack
                direction="row"
                spacing={1.5}
                alignItems="center"
                sx={{
                  p: { xs: 1.2, sm: 1.5 },
                  bgcolor: feedback.would_recommend ? '#F0FDF4' : '#FEF2F2',
                  borderRadius: '10px',
                  border: `1px solid ${feedback.would_recommend ? '#A7F3D0' : '#FECACA'}`,
                }}
              >
                {feedback.would_recommend ? (
                  <>
                    <ThumbUp sx={{ color: '#16A34A', fontSize: { xs: 16, sm: 18 } }} />
                    <Typography sx={{ fontSize: { xs: '0.78rem', sm: '0.83rem' }, color: '#065F46', fontWeight: 600 }}>
                      Would recommend this employer
                    </Typography>
                  </>
                ) : (
                  <>
                    <ThumbDown sx={{ color: '#DC2626', fontSize: { xs: 16, sm: 18 } }} />
                    <Typography sx={{ fontSize: { xs: '0.78rem', sm: '0.83rem' }, color: '#991B1B', fontWeight: 600 }}>
                      Would not recommend
                    </Typography>
                  </>
                )}
              </Stack>
            )}

            {/* Open-ended responses */}
            {[
              { key: 'what_went_well',      label: 'What Went Well',       color: '#065F46', bg: '#F0FDF4', border: '#A7F3D0' },
              { key: 'what_to_improve',     label: 'What to Improve',      color: '#92400E', bg: '#FFFBEB', border: '#FDE68A' },
              { key: 'additional_comments', label: 'Additional Comments',  color: '#1E3A5F', bg: '#F0F4FF', border: '#C7D2FE' },
            ]
              .filter(({ key }) => feedback[key])
              .map(({ key, label, color, bg, border }) => (
                <Box
                  key={key}
                  sx={{ p: { xs: 1.2, sm: 1.5 }, bgcolor: bg, borderRadius: '10px', border: `1px solid ${border}` }}
                >
                  <Typography
                    sx={{
                      fontSize: { xs: '0.62rem', sm: '0.68rem' },
                      fontWeight: 700,
                      color,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      mb: 0.6,
                    }}
                  >
                    {label}
                  </Typography>
                  <Typography sx={{ fontSize: { xs: '0.78rem', sm: '0.83rem' }, color: '#374151', lineHeight: 1.65 }}>
                    {feedback[key]}
                  </Typography>
                </Box>
              ))}
          </Stack>
        )}
      </DialogContent>

      <CloseActions onClose={onClose} />
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LiveScore
// Props: open, candidateInterview, onClose, onDone
// ─────────────────────────────────────────────────────────────────────────────
export function LiveScore({ open, candidateInterview, onClose, onDone }) {
  const { enqueueSnackbar } = useSnackbar();
  const [saving, setSaving]   = useState(false);
  const [form, setForm]       = useState({
    candidate_fit:     '',
    employer_feedback: '',
  });

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    if (open) {
      setForm({
        candidate_fit:     '',
        employer_feedback: '',
      });

    }
  }, [open]);

  const handleSave = async () => {
    if (!form.candidate_fit) { enqueueSnackbar('Candidate fit score is required', { variant: 'warning' }); return; }
    const score = parseFloat(form.candidate_fit);
    if (isNaN(score) || score < 0 || score > 100) {
      enqueueSnackbar('Fit score must be 0–100', { variant: 'warning' }); return;
    }
    if (!form.employer_feedback.trim()) { enqueueSnackbar('Employer feedback is required', { variant: 'warning' }); return; }
    setSaving(true);
    try {
      await interviewAPI.createResult({
        interview:        candidateInterview?.id,
        overall_score:    score,
        overall_feedback: form.employer_feedback,
      });
      enqueueSnackbar('Score submitted!', { variant: 'success' });
      onDone(); onClose();
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.detail || 'Failed to save score', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };


 const fitScore = parseFloat(form.candidate_fit);
  const fitValid = !isNaN(fitScore);
  const fitColor = fitValid ? (fitScore >= 70 ? '#10B981' : fitScore >= 50 ? '#F59E0B' : '#EF4444') : '#94A3B8';
  const fitLabel = fitValid ? (fitScore >= 70 ? 'Strong Fit' : fitScore >= 50 ? 'Moderate Fit' : 'Low Fit') : '';


  const scrollContent = {
    p: { xs: 2, sm: 2.5 },
    overflowY: 'auto',
    '&::-webkit-scrollbar': { width: 4 },
    '&::-webkit-scrollbar-thumb': { bgcolor: '#E2E8F0', borderRadius: 2 },
    '@media (max-width: 240px)': { p: 1.5 },
  };

  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '10px',
      fontSize: { xs: '0.78rem', sm: '0.83rem' },
      '& fieldset': { borderColor: '#E2E8F0' },
      '&.Mui-focused fieldset': { borderColor: '#4338CA' },
    },
    '& .MuiInputLabel-root': { fontSize: { xs: '0.78rem', sm: '0.83rem' } },
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: dialogPaper }}>
      <GradHeader
        gradient="linear-gradient(135deg, #4338CA 0%, #5B21B6 100%)"
        title="Score Live Interview"
        subtitle={`${candidateInterview?.position || 'Interview'} · ${candidateInterview?.candidate?.full_name || ''}`}
        onClose={onClose}
      />

       <DialogContent sx={scrollContent}>
        <Stack spacing={{ xs: 2.5, sm: 3 }}>

          {/* Field 1: Candidate Fit */}
          <Box
            sx={{
              p: { xs: 1.5, sm: 2 },
              bgcolor: '#F8FAFC',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
            }}
          >
            <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569', mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              How much does the candidate fit for the role?
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <TextField
                label="Fit Score *"
                type="number"
                size="small"
                value={form.candidate_fit}
                onChange={e => f('candidate_fit', e.target.value)}
                inputProps={{ min: 0, max: 100, step: 1 }}
                helperText="0 – 100%"
                sx={{ width: { xs: 130, sm: 150 }, ...fieldSx }}
              />
              {fitValid && (
                <Box>
                  <Typography
                    sx={{
                      fontSize: { xs: '1.5rem', sm: '1.8rem' },
                      fontWeight: 900,
                      color: fitColor,
                      lineHeight: 1,
                    }}
                  >
                    {Math.round(fitScore)}
                    <Box component="span" sx={{ fontSize: '1rem', color: '#94A3B8', fontWeight: 500 }}>
                      %
                    </Box>
                  </Typography>
                  <Typography sx={{ fontSize: '0.72rem', color: fitColor, fontWeight: 700, mt: 0.3 }}>
                    {fitLabel}
                  </Typography>
                </Box>
              )}
            </Stack>
          </Box>

          {/* Field 2: Employer Feedback */}
          <TextField
            label="Employer Feedback *"
            multiline
            rows={5}
            fullWidth disabled={saving || !form.overall_score}

            size="small"
            value={form.employer_feedback}
            onChange={e => f('employer_feedback', e.target.value)}
            placeholder="Share your feedback about the candidate's performance, suitability, and any observations…"
            sx={fieldSx}
          />

        </Stack>
      </DialogContent>
      <DialogActions
        sx={{
          px: { xs: 2, sm: 2.5 },
          py: { xs: 1.5, sm: 2 },
          borderTop: '1px solid #E2E8F0',
          gap: 1,
          '@media (max-width: 240px)': { px: 1.5, py: 1 },
        }}
      >
        <Button
          onClick={onClose}
          sx={{
            textTransform: 'none',
            color: '#64748B',
            fontSize: { xs: '0.78rem', sm: '0.85rem' },
          }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || !form.candidate_fit || !form.employer_feedback.trim()}
          startIcon={
            saving ? (
              <CircularProgress size={14} color="inherit" />
            ) : (
              <EmojiEvents sx={{ fontSize: { xs: 14, sm: 16 } }} />
            )
          }
          sx={{
            textTransform: 'none',
            bgcolor: '#4338CA',
            '&:hover': { bgcolor: '#3730A3' },
            borderRadius: '10px',
            px: { xs: 2, sm: 2.5 },
            fontSize: { xs: '0.78rem', sm: '0.85rem' },
          }}
        >
          {saving ? 'Saving…' : 'Submit Score'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}