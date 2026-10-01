
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, Button, Alert, Skeleton, Table, TableBody, TableCell, TableRow, Select, MenuItem } from '@mui/material';
import { Send, ArrowBack, HourglassEmpty, CheckCircle } from '@mui/icons-material';
import { interviewerService } from '@/services/api/iaem';
import { COMPETENCIES, VALIDATION, computeWeightedScore, computeAlignmentCheck } from '@/constants/iaem';
import ScoringForm from './ScoringForm';
import AIScoreReveal from './AIScoreReveal';

const STATES = { DRAFT: 'DRAFT', SUBMITTING: 'SUBMITTING', REVEALED: 'REVEALED' };
const C = { navy: '#1B2A4A', teal: '#2E86AB', labelBg: '#E8EEF4', inputBg: '#FFF7DC' };

const PostInterviewSubmission = () => {
  const { bookingId, siId } = useParams();
  const isIAEM = !!bookingId;
  const entityId = bookingId || siId;

  const navigate = useNavigate();
  const [phase, setPhase] = useState(STATES.DRAFT);
  const [context, setContext] = useState(null);
  const [loading, setLoading] = useState(true);

  const [scores, setScores] = useState({
    competency_scores: {},
    competency_evidence: {},
    question_log: [],
    recommendation: '',
    alignment_justification: '',
    key_strengths: '',
    areas_of_concern: '',
    overall_remarks: '',
    panel_members: '',
    panel_consensus: '',
    declaration_accepted: false,
    interviewer_signature: '',
    session_checks: {
      session_recorded: '',
      identity_verified: '',
      proctoring_check: '',
      interruption: '',
    },
  });

  const [aiResult, setAiResult] = useState(null);

  useEffect(() => {
    const fetcher = isIAEM
      ? interviewerService.getSubmissionContext(entityId)
      : interviewerService.getNonIAEMContext(entityId);

    fetcher
      .then((res) => {
        setContext(res.data);
        if (res.data.already_submitted) {
          setPhase(STATES.REVEALED);
          if (res.data.ai_score) {
            setAiResult({ ai_score: res.data.ai_score, divergence: res.data.divergence });
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [entityId, isIAEM]);

  // ── Validation ──
  const ratings = scores.competency_scores || {};
  const evidence = scores.competency_evidence || {};
  const allRated = COMPETENCIES.every(c => ratings[c.key] != null && ratings[c.key] !== '');
  const allEvidence = COMPETENCIES.every(c =>
    ratings[c.key] === 'NA' || (evidence[c.key] || '').trim().length >= VALIDATION.EVIDENCE_MIN
  );
  const hasRecommendation = !!scores.recommendation;
  const questionLog = (scores.question_log || []).filter(q => (q.question || '').trim());
  const enoughQuestions = questionLog.length >= VALIDATION.QUESTION_LOG_MIN;
  const strengthsOk = (scores.key_strengths || '').trim().length >= VALIDATION.KEY_STRENGTHS_MIN;
  const concernsOk = (scores.areas_of_concern || '').trim().length >= VALIDATION.AREAS_OF_CONCERN_MIN;
  const remarksOk = (scores.overall_remarks || '').length >= VALIDATION.OVERALL_REMARKS_MIN;
  const declared = !!scores.declaration_accepted;
  const signed = !!(scores.interviewer_signature || '').trim();
  const weightedScore = computeWeightedScore(ratings);
  const hasScore = weightedScore != null;
  const alignment = computeAlignmentCheck(scores.recommendation, weightedScore);
  const needsAlignmentJustification = alignment && !alignment.startsWith('Aligned');
  const alignmentJustificationOk = !needsAlignmentJustification || (scores.alignment_justification || '').trim().length >= VALIDATION.ALIGNMENT_JUSTIFICATION_MIN;

  const canSubmit = allRated && allEvidence && hasRecommendation && enoughQuestions && strengthsOk && concernsOk && remarksOk && alignmentJustificationOk && declared && signed && hasScore;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setPhase(STATES.SUBMITTING);
    try {
      const payload = {
        competency_scores: scores.competency_scores,
        competency_evidence: scores.competency_evidence,
        question_log: (scores.question_log || []).filter(q => (q.question || '').trim()),
        recommendation: scores.recommendation,
        alignment_justification: scores.alignment_justification || '',
        key_strengths: scores.key_strengths || '',
        areas_of_concern: scores.areas_of_concern || '',
        overall_remarks: scores.overall_remarks || '',
        panel_members: scores.panel_members || '',
        panel_consensus: scores.panel_consensus || '',
        declaration_accepted: true,
        interviewer_signature: scores.interviewer_signature || '',
        session_checks: scores.session_checks || {},
      };

      const submitter = isIAEM
        ? interviewerService.submitEvaluation(entityId, payload)
        : interviewerService.submitNonIAEMEvaluation(entityId, payload);

      const res = await submitter;
      setAiResult(res.data);
      setPhase(STATES.REVEALED);
    } catch (err) {
      console.error(err);
      setPhase(STATES.DRAFT);
    }
  }, [entityId, isIAEM, scores, canSubmit]);

  if (loading) return (
    <Box sx={{ maxWidth: '100%', mx: 'auto', p: 4 }}>
      <Skeleton height={60} sx={{ mb: 2 }} /><Skeleton height={400} /><Skeleton height={200} sx={{ mt: 2 }} />
    </Box>
  );

  const isDraft = phase === STATES.DRAFT;
  const isRevealed = phase === STATES.REVEALED;
  const isSubmitting = phase === STATES.SUBMITTING;

  return (
    <Box sx={{ maxWidth: '100%', mx: 'auto', p: { xs: 1, md: 3 }, minHeight: '100vh', bgcolor: '#F5F4F0' }}>
      {isRevealed && (
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/interviewer/overview')}
          sx={{ mb: 2, textTransform: 'none', color: '#04282B' }}>Back to Dashboard</Button>
      )}

      {/* ═══ HEADER BANNER ═══ */}
      <Paper elevation={0} sx={{ borderRadius: '8px 8px 0 0', overflow: 'hidden', mb: 0 }}>
        <Box sx={{ bgcolor: C.navy, px: 3, py: 2 }}>
          <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '1.1rem' }}>
            IEVALX &nbsp;|&nbsp; INTERVIEWER FEEDBACK &amp; FINAL EVALUATION FORM
          </Typography>
        </Box>
        <Box sx={{ bgcolor: C.teal, px: 3, py: 0.8 }}>
          <Typography sx={{ color: '#fff', fontSize: '0.78rem' }}>
            Submit in IEVALX immediately after the final evaluation round &nbsp;&nbsp;|&nbsp;&nbsp; {context?.company_name || ''}
          </Typography>
        </Box>
        <Box sx={{ bgcolor: C.inputBg, px: 3, py: 0.8 }}>
          <Typography sx={{ fontSize: '0.75rem', color: '#7A5C00' }}>
            Fill only the LIGHT YELLOW cells. GREY cells calculate themselves and are locked. Every rating needs written evidence beside it.
          </Typography>
        </Box>
      </Paper>

      {/* ═══ SECTION 1: INTERVIEW DETAILS (auto-filled) ═══ */}
      <Paper elevation={0} sx={{ borderRadius: 0, border: '1px solid #D0D0D0', borderTop: 0, mb: 0 }}>
        <Box sx={{ bgcolor: C.navy, px: 2, py: 1 }}>
          <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '0.92rem' }}>1.  INTERVIEW DETAILS &amp; SESSION CHECK</Typography>
        </Box>
        <Table size="small" sx={{ '& td': { borderColor: '#D0D0D0', py: 0.8, fontSize: '0.82rem' } }}>
          <TableBody>
            {[
              ['Candidate Name', context?.candidate_name, 'Candidate ID / Req. No.', context?.candidate_id],
              ['Position / Role Applied', context?.position_role, 'Interview Round', context?.interview_round],
              ['Primary Skill / Technology', context?.primary_skill, 'Date of Interview', context?.interview_date],
              ['Total Years of Experience', context?.total_experience, 'Required Experience for Role', context?.required_experience],
              ['Interviewer Name', context?.interviewer_name, 'Interviewer ID / Level', `${context?.interviewer_id || ''} / ${context?.interviewer_level || ''}`],
              ['Mode of Interview', context?.mode_of_interview, 'Interview Duration (mins)', context?.actual_duration || context?.planned_duration],
            ].map(([lbl1, val1, lbl2, val2], i) => (
              <TableRow key={i}>
                <TableCell sx={{ bgcolor: C.labelBg, fontWeight: 700, width: '18%' }}>{lbl1}</TableCell>
                <TableCell sx={{ width: '30%' }}>{val1 || '—'}</TableCell>
                <TableCell sx={{ bgcolor: C.labelBg, fontWeight: 700, width: '18%' }}>{lbl2}</TableCell>
                <TableCell sx={{ width: '34%' }}>{val2 || '—'}</TableCell>
              </TableRow>
            ))}
            {/* ── Session check fields (editable by interviewer) ── */}
            {[
              ['Session recorded in IEVALX', 'session_recorded', 'Candidate identity verified', 'identity_verified'],
              ['Proctoring / integrity check', 'proctoring_check', 'Interruption / disconnection', 'interruption'],
            ].map(([lbl1, key1, lbl2, key2], i) => (
              <TableRow key={`sc-${i}`}>
                <TableCell sx={{ bgcolor: C.labelBg, fontWeight: 700, width: '18%' }}>{lbl1}</TableCell>
                <TableCell sx={{ width: '30%', bgcolor: isDraft ? C.inputBg : undefined }}>
                  {isDraft ? (
                    <Select size="small" displayEmpty fullWidth variant="standard"
                      value={scores.session_checks?.[key1] || ''}
                      onChange={(e) => setScores(prev => ({
                        ...prev,
                        session_checks: { ...prev.session_checks, [key1]: e.target.value },
                      }))}>
                      <MenuItem value=""><em>Select</em></MenuItem>
                      <MenuItem value="Yes">Yes</MenuItem>
                      <MenuItem value="No">No</MenuItem>
                    </Select>
                  ) : (scores.session_checks?.[key1] || context?.submission?.session_checks?.[key1] || '—')}
                </TableCell>
                <TableCell sx={{ bgcolor: C.labelBg, fontWeight: 700, width: '18%' }}>{lbl2}</TableCell>
                <TableCell sx={{ width: '34%', bgcolor: isDraft ? C.inputBg : undefined }}>
                  {isDraft ? (
                    <Select size="small" displayEmpty fullWidth variant="standard"
                      value={scores.session_checks?.[key2] || ''}
                      onChange={(e) => setScores(prev => ({
                        ...prev,
                        session_checks: { ...prev.session_checks, [key2]: e.target.value },
                      }))}>
                      <MenuItem value=""><em>Select</em></MenuItem>
                      <MenuItem value="Yes">Yes</MenuItem>
                      <MenuItem value="No">No</MenuItem>
                    </Select>
                  ) : (scores.session_checks?.[key2] || context?.submission?.session_checks?.[key2] || '—')}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      {/* ═══ ANCHORING GUARD (only for IAEM) ═══ */}
      {isDraft && isIAEM && (
        <Alert severity="warning" sx={{ my: 2, borderRadius: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            The AI provisional score is hidden until you submit your evaluation.
          </Typography>
          <Typography variant="caption">
            You will not be able to change your scores after submission. This prevents anchoring bias.
          </Typography>
        </Alert>
      )}

      {/* ═══ SECTIONS 2-6: THE FORM ═══ */}
      {!isRevealed && (
        <ScoringForm scores={scores} setScores={setScores} context={context} disabled={!isDraft} />
      )}

      {/* ═══ SUBMIT BUTTON ═══ */}
      {isDraft && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', my: 3 }}>
          <Button variant="contained" size="large" startIcon={<Send />}
            disabled={!canSubmit || isSubmitting} onClick={handleSubmit}
            sx={{
              textTransform: 'none', fontWeight: 700, px: 5, py: 1.5,
              bgcolor: C.navy, fontSize: '1rem',
              '&:hover': { bgcolor: '#0a3d40' },
              '&.Mui-disabled': { bgcolor: '#CCC' },
            }}>
            Submit Evaluation
          </Button>
        </Box>
      )}

      {/* Validation hints */}
      {isDraft && !canSubmit && (
        <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid #FFF3E0', bgcolor: '#FFFDE7', mb: 3 }}>
          <Typography variant="caption" sx={{ color: '#E65100', fontWeight: 600 }}>Before you can submit:</Typography>
          <Box component="ul" sx={{ m: 0, pl: 2, mt: 0.5 }}>
            {!allRated && <li><Typography variant="caption" sx={{ color: '#888' }}>Rate all 6 competencies (NA or 1-5)</Typography></li>}
            {!allEvidence && <li><Typography variant="caption" sx={{ color: '#888' }}>Provide evidence for all rated competencies (min {VALIDATION.EVIDENCE_MIN} characters each)</Typography></li>}
            {!hasRecommendation && <li><Typography variant="caption" sx={{ color: '#888' }}>Select a final recommendation</Typography></li>}
            {!enoughQuestions && <li><Typography variant="caption" sx={{ color: '#888' }}>Log at least {VALIDATION.QUESTION_LOG_MIN} questions</Typography></li>}
            {!alignmentJustificationOk && <li><Typography variant="caption" sx={{ color: '#888' }}>Alignment justification needed — recommendation does not match score band (min {VALIDATION.ALIGNMENT_JUSTIFICATION_MIN} characters)</Typography></li>}
            {!strengthsOk && <li><Typography variant="caption" sx={{ color: '#888' }}>Key Strengths Observed need {VALIDATION.KEY_STRENGTHS_MIN} characters</Typography></li>}
            {!concernsOk && <li><Typography variant="caption" sx={{ color: '#888' }}>Areas of Concern / Development Needs need {VALIDATION.AREAS_OF_CONCERN_MIN} characters</Typography></li>}
            {!remarksOk && <li><Typography variant="caption" sx={{ color: '#888' }}>Overall remarks need {VALIDATION.OVERALL_REMARKS_MIN} characters</Typography></li>}
            {!signed && <li><Typography variant="caption" sx={{ color: '#888' }}>Type your signature</Typography></li>}
            {!declared && <li><Typography variant="caption" sx={{ color: '#888' }}>Accept the declaration</Typography></li>}
          </Box>
        </Paper>
      )}

      {isSubmitting && (
        <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
          Submitting your evaluation{isIAEM ? ' and retrieving the AI score' : ''}...
        </Alert>
      )}

      {/* ═══ AI SCORE REVEAL (IAEM only) ═══ */}
      {isRevealed && isIAEM && aiResult?.ai_score && (
        <AIScoreReveal aiScore={aiResult.ai_score} overallScore={scores.overall_score ?? context?.submission?.overall_score} divergence={aiResult.divergence} />
      )}

      {/* IAEM: AI pending */}
      {isRevealed && isIAEM && aiResult && !aiResult.ai_score && (
        <Paper elevation={0} sx={{ p: 3, borderRadius: 2.5, border: '1px solid #FFF3E0', bgcolor: '#FFFDE7', mt: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <HourglassEmpty sx={{ color: '#F57F17', fontSize: 22 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#2C2C2A' }}>Your evaluation has been submitted</Typography>
          </Box>
          <Typography variant="body2" sx={{ color: '#666', mb: 2 }}>
            The AI score is currently being computed. You will receive a notification when the score comparison is ready.
          </Typography>
          <Button variant="outlined" onClick={() => navigate('/interviewer/completed')}
            sx={{ textTransform: 'none', fontWeight: 600, borderColor: '#E0E0E0', color: '#04282B', borderRadius: 2 }}>
            Go to Completed Interviews
          </Button>
        </Paper>
      )}

      {/* Non-IAEM: simple confirmation */}
      {isRevealed && !isIAEM && (
        <Paper elevation={0} sx={{ p: 3, borderRadius: 2.5, border: '1px solid #C6EFCE', bgcolor: '#F0FFF4', mt: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <CheckCircle sx={{ color: '#2E7D32', fontSize: 22 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#2C2C2A' }}>Evaluation submitted successfully</Typography>
          </Box>
          <Typography variant="body2" sx={{ color: '#666', mb: 2 }}>
            Your feedback has been recorded. Ref: {aiResult?.computed?.submission_ref || '—'}
          </Typography>
          <Button variant="outlined" onClick={() => navigate('/interviewer/overview')}
            sx={{ textTransform: 'none', fontWeight: 600, borderColor: '#E0E0E0', color: '#04282B', borderRadius: 2 }}>
            Back to Dashboard
          </Button>
        </Paper>
      )}
    </Box>
  );
};

export default PostInterviewSubmission;
