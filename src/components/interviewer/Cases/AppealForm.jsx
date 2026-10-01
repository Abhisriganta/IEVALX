// BUILD: 2026-08-24-iaem-final-v1 — Appendix §9
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, TextField, MenuItem, Button, Alert } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { interviewerCaseService } from '@/services/api/iaem';
import { APPEAL_DISAGREE_OPTIONS, APPEAL_DESIRED_OUTCOMES, VALIDATION } from '@/constants/iaem';

const AppealForm = () => {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const [disagree, setDisagree] = useState('');
  const [explanation, setExplanation] = useState('');
  const [context, setContext] = useState('');
  const [desired, setDesired] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = disagree && explanation.length >= VALIDATION.APPEAL_MIN && desired;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await interviewerCaseService.fileAppeal(caseId, { disagree_with: disagree, explanation, supporting_context: context, desired_outcome: desired });
      navigate(`/interviewer/appeals/${res.data.appeal_id}`);
    } catch (err) { console.error(err); }
    finally { setSubmitting(false); }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 700, mx: 'auto' }}>
      <Button startIcon={<ArrowBack />} onClick={() => navigate(`/interviewer/cases/${caseId}`)} sx={{ mb: 2, textTransform: 'none', color: '#04282B' }}>Back to Case</Button>
      <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
        Filing an appeal is your right. It will not be used against you in any evaluation, interview assignment, or employment decision. Your appeal will be reviewed by a different HR reviewer than the one who made the original decision.
      </Alert>
      <Paper elevation={0} sx={{ p: 3, borderRadius: 2.5, border: '1px solid #E8E8E8' }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>File an Appeal — {caseId}</Typography>
        <TextField select fullWidth size="small" label="Which part of the finding do you disagree with?" value={disagree} onChange={e => setDisagree(e.target.value)} sx={{ mb: 2 }}>
          {APPEAL_DISAGREE_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </TextField>
        <TextField fullWidth multiline rows={4} size="small" label={`Your explanation (min ${VALIDATION.APPEAL_MIN} chars)`} value={explanation} onChange={e => setExplanation(e.target.value)} sx={{ mb: 2 }}
          placeholder="Describe why you believe the finding or resolution was incorrect. Reference specific moments from the interview if relevant."
          error={explanation.length > 0 && explanation.length < VALIDATION.APPEAL_MIN}
          helperText={`${explanation.length} / ${VALIDATION.APPEAL_MIN}`} />
        <TextField fullWidth multiline rows={2} size="small" label="Supporting context (optional)" value={context} onChange={e => setContext(e.target.value)} sx={{ mb: 2 }}
          placeholder="Any additional context HR may not have had." />
        <TextField select fullWidth size="small" label="Desired outcome" value={desired} onChange={e => setDesired(e.target.value)} sx={{ mb: 3 }}>
          {APPEAL_DESIRED_OUTCOMES.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </TextField>
        <Button variant="contained" fullWidth disabled={!canSubmit || submitting} onClick={handleSubmit}
          sx={{ textTransform: 'none', fontWeight: 700, py: 1.2, bgcolor: '#04282B', '&:hover': { bgcolor: '#0a3d40' } }}>
          {submitting ? 'Submitting...' : 'Submit Appeal'}
        </Button>
      </Paper>
    </Box>
  );
};

export default AppealForm;
