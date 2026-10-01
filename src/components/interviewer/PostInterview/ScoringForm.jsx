// BUILD: 2026-09-07-iaem-v2-feedback-form
// Excel-faithful Interviewer Feedback & Final Evaluation Form
// Sections 2-6 of the IEVALX feedback form, pixel-matched to the Excel palette.
import React from 'react';
import {
  Box, Typography, TextField, MenuItem, Paper, Divider, Checkbox,
  FormControlLabel, Table, TableBody, TableCell, TableHead, TableRow,
} from '@mui/material';
import {
  COMPETENCIES, SCORE_LABELS, RECOMMENDATIONS, QUESTION_METRICS,
  VALIDATION, computeWeightedScore, computeScoreBand, computeIndicativeRecommendation,
  computeAlignmentCheck, SCORE_BANDS,
} from '@/constants/iaem';

// ── Excel palette ──
const C = {
  navy:       '#1B2A4A',
  teal:       '#2E86AB',
  labelBg:    '#E8EEF4',
  inputBg:    '#FFF7DC',
  computedBg: '#F2F2F2',
  green:      '#C6EFCE',
  amber:      '#FFEB9C',
  red:        '#FFC7CE',
  white:      '#FFFFFF',
  instructBg: '#FFF7DC',
  instructTx: '#7A5C00',
  navyTx:     '#1B2A4A',
  whiteTx:    '#FFFFFF',
  greyTx:     '#555555',
};

const SectionHeader = ({ children }) => (
  <Box sx={{ bgcolor: C.navy, color: C.whiteTx, px: 2, py: 1.2, fontWeight: 700, fontSize: '0.95rem', borderRadius: '4px 4px 0 0', mt: 3 }}>
    <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: C.whiteTx }}>{children}</Typography>
  </Box>
);

const LabelCell = ({ children, sx = {} }) => (
  <TableCell sx={{ bgcolor: C.labelBg, fontWeight: 700, fontSize: '0.82rem', color: '#333', py: 1, ...sx }}>{children}</TableCell>
);

const InputCell = ({ children, sx = {} }) => (
  <TableCell sx={{ bgcolor: C.inputBg, py: 0.5, ...sx }}>{children}</TableCell>
);

const ComputedCell = ({ children, sx = {} }) => (
  <TableCell sx={{ bgcolor: C.computedBg, fontWeight: 700, fontSize: '0.9rem', color: C.navyTx, textAlign: 'center', py: 1, ...sx }}>{children}</TableCell>
);

const bandColor = (band) => {
  if (band === 'A' || band === 'B') return C.green;
  if (band === 'C') return C.amber;
  if (band === 'D') return C.red;
  return C.computedBg;
};

const alignColor = (a) => {
  if (!a) return C.computedBg;
  if (a.startsWith('Aligned')) return C.green;
  if (a.startsWith('Minor')) return C.amber;
  return C.red;
};

const completenessColor = (c) => {
  if (!c) return C.computedBg;
  return c.startsWith('COMPLETE') ? C.green : C.red;
};

const ScoringForm = ({ scores, setScores, context, disabled = false }) => {
  const u = (field, value) => setScores(prev => ({ ...prev, [field]: value }));
  const uNested = (group, key, value) => setScores(prev => ({
    ...prev, [group]: { ...(prev[group] || {}), [key]: value },
  }));

  // Computed values (live, matching Excel formulas)
  const ratings = scores.competency_scores || {};
  const evidence = scores.competency_evidence || {};
  const weightedScore = computeWeightedScore(ratings);
  const band = computeScoreBand(weightedScore);
  const bandLabel = SCORE_BANDS[band] || '-';
  const indicativeRec = computeIndicativeRecommendation(weightedScore);
  const recLabel = RECOMMENDATIONS.find(r => r.value === indicativeRec)?.label || '-';
  const alignment = computeAlignmentCheck(scores.recommendation, weightedScore);

  const applicableWeight = COMPETENCIES.reduce((sum, c) => {
    const r = ratings[c.key];
    return sum + (r != null && r !== 'NA' && r !== '' ? c.weightage : 0);
  }, 0);

  // Per-metric score: weightage × rating / 5
  const metricScore = (key) => {
    const r = ratings[key];
    if (r == null || r === 'NA' || r === '') return '-';
    const w = COMPETENCIES.find(c => c.key === key)?.weightage || 0;
    return (w * parseInt(r) / 5).toFixed(1);
  };

  // Completeness check
  const blankRatings = COMPETENCIES.filter(c => ratings[c.key] == null || ratings[c.key] === '').length;
  const blankEvidence = COMPETENCIES.filter(c => ratings[c.key] != null && ratings[c.key] !== 'NA' && ratings[c.key] !== '' && !(evidence[c.key] || '').trim()).length;
  const questionLog = scores.question_log || [];
  const validQuestions = questionLog.filter(q => (q.question || '').trim());
  const shortEvidence = COMPETENCIES.filter(c =>
    ratings[c.key] != null && ratings[c.key] !== 'NA' && ratings[c.key] !== '' &&
    (evidence[c.key] || '').trim().length < VALIDATION.EVIDENCE_MIN
  ).length;
  let completeness;
  if (blankRatings > 0) completeness = `INCOMPLETE - ${blankRatings} rating(s) pending`;
  else if (blankEvidence > 0) completeness = `INCOMPLETE - evidence pending for ${blankEvidence} metric(s)`;
  else if (shortEvidence > 0) completeness = `INCOMPLETE - evidence too short for ${shortEvidence} metric(s) (min ${VALIDATION.EVIDENCE_MIN} chars)`;
  else if (validQuestions.length < VALIDATION.QUESTION_LOG_MIN) completeness = `INCOMPLETE - log at least ${VALIDATION.QUESTION_LOG_MIN} questions asked`;
  else if (!scores.recommendation) completeness = 'INCOMPLETE - final recommendation not selected';
  else if (alignment && !alignment.startsWith('Aligned') && (scores.alignment_justification || '').trim().length < VALIDATION.ALIGNMENT_JUSTIFICATION_MIN) completeness = `INCOMPLETE - Alignment justification needed (min ${VALIDATION.ALIGNMENT_JUSTIFICATION_MIN} chars)`;
  else if ((scores.key_strengths || '').trim().length < VALIDATION.KEY_STRENGTHS_MIN) completeness = `INCOMPLETE - Key Strengths need ${VALIDATION.KEY_STRENGTHS_MIN} characters`;
  else if ((scores.areas_of_concern || '').trim().length < VALIDATION.AREAS_OF_CONCERN_MIN) completeness = `INCOMPLETE - Areas of Concern need ${VALIDATION.AREAS_OF_CONCERN_MIN} characters`;
  else if ((scores.overall_remarks || '').trim().length < VALIDATION.OVERALL_REMARKS_MIN) completeness = `INCOMPLETE - overall remarks need ${VALIDATION.OVERALL_REMARKS_MIN} characters`;
  else completeness = 'COMPLETE - ready for submission in IEVALX';

  // Ensure question_log has 5 rows
  const ensureRows = (log, min = 5) => {
    const rows = [...(log || [])];
    while (rows.length < min) rows.push({ question: '', metric: '', response: '' });
    return rows;
  };
  const qRows = ensureRows(questionLog);

  return (
    <Paper elevation={0} sx={{ borderRadius: 2.5, border: '1px solid #D0D0D0', overflow: 'hidden' }}>
      {/* ═══ SECTION 2: EVALUATION MATRIX ═══ */}
      <SectionHeader>2.  EVALUATION MATRIX  -  SIX CORE METRICS</SectionHeader>
      <Box sx={{ px: 2, py: 1, bgcolor: C.labelBg }}>
        <Typography sx={{ fontSize: '0.75rem', color: C.navyTx, fontWeight: 700 }}>
          RATING SCALE &nbsp;&nbsp; NA = Not assessed &nbsp;&nbsp; 1 = Poor &nbsp;&nbsp; 2 = Basic &nbsp;&nbsp; 3 = Good (meets expectation) &nbsp;&nbsp; 4 = Strong (exceeds) &nbsp;&nbsp; 5 = Outstanding
        </Typography>
      </Box>
      <Table size="small" sx={{ '& td, & th': { borderColor: '#D0D0D0' } }}>
        <TableHead>
          <TableRow sx={{ bgcolor: C.teal }}>
            {['Competency', 'What is being assessed', 'Weightage', 'Rating\n(NA, 1-5)', 'Score', "Interviewer's Evidence / Remarks (mandatory)"].map((h, i) => (
              <TableCell key={i} sx={{ color: C.whiteTx, fontWeight: 700, fontSize: '0.78rem', py: 1, whiteSpace: i === 3 ? 'pre-line' : 'normal' }}>{h}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {COMPETENCIES.map((comp) => (
            <TableRow key={comp.key}>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.82rem', width: 180 }}>{comp.label}</TableCell>
              <TableCell sx={{ fontSize: '0.78rem', color: '#555', width: 220 }}>{comp.description}</TableCell>
              <ComputedCell sx={{ width: 70 }}>{comp.weightage}</ComputedCell>
              <InputCell sx={{ width: 90 }}>
                <TextField select size="small" fullWidth
                  value={ratings[comp.key] ?? ''}
                  onChange={e => uNested('competency_scores', comp.key, e.target.value === 'NA' ? 'NA' : parseInt(e.target.value))}
                  disabled={disabled}
                  sx={{ '& .MuiOutlinedInput-root': { bgcolor: C.inputBg } }}
                >
                  <MenuItem value="">—</MenuItem>
                  <MenuItem value="NA">NA</MenuItem>
                  {[1,2,3,4,5].map(n => <MenuItem key={n} value={n}>{n}</MenuItem>)}
                </TextField>
              </InputCell>
              <ComputedCell sx={{ width: 70 }}>{metricScore(comp.key)}</ComputedCell>
              <InputCell sx={{ width: 300 }}>
                <TextField size="small" fullWidth multiline rows={2}
                  value={evidence[comp.key] || ''}
                  onChange={e => uNested('competency_evidence', comp.key, e.target.value)}
                  disabled={disabled || ratings[comp.key] === 'NA'}
                  placeholder={ratings[comp.key] === 'NA' ? 'N/A' : `Minimum ${VALIDATION.EVIDENCE_MIN} characters`}
                  helperText={ratings[comp.key] !== 'NA' && ratings[comp.key] != null && ratings[comp.key] !== '' ? `${(evidence[comp.key] || '').length} characters` : ''}
                  sx={{ '& .MuiOutlinedInput-root': { bgcolor: C.inputBg, fontSize: '0.8rem' } }}
                />
              </InputCell>
            </TableRow>
          ))}
          {/* TOTAL row */}
          <TableRow sx={{ bgcolor: C.navy }}>
            <TableCell sx={{ color: C.whiteTx, fontWeight: 700, fontSize: '0.85rem' }}>TOTAL</TableCell>
            <TableCell sx={{ color: C.whiteTx, fontSize: '0.78rem' }}>Weightage and points scored</TableCell>
            <TableCell sx={{ color: C.whiteTx, fontWeight: 700, textAlign: 'center', fontSize: '0.9rem' }}>{applicableWeight}</TableCell>
            <TableCell />
            <TableCell sx={{ color: C.whiteTx, fontWeight: 700, textAlign: 'center', fontSize: '0.9rem' }}>
              {COMPETENCIES.reduce((s, c) => { const v = metricScore(c.key); return s + (v === '-' ? 0 : parseFloat(v)); }, 0).toFixed(1)}
            </TableCell>
            <TableCell sx={{ color: C.whiteTx, fontSize: '0.72rem' }}>A rating of 1 on any metric needs a written justification in Section 5.</TableCell>
          </TableRow>
        </TableBody>
      </Table>

      {/* ═══ SECTION 3: SCORE SUMMARY ═══ */}
      <SectionHeader>3.  SCORE SUMMARY &amp; FINAL RECOMMENDATION</SectionHeader>
      <Table size="small" sx={{ '& td': { borderColor: '#D0D0D0' } }}>
        <TableBody>
          <TableRow>
            <LabelCell>Weighted Score (out of 100)</LabelCell>
            <ComputedCell>{weightedScore != null ? weightedScore : '-'}</ComputedCell>
            <LabelCell>Score Band</LabelCell>
            <ComputedCell sx={{ bgcolor: bandColor(band) }}>{bandLabel}</ComputedCell>
          </TableRow>
          <TableRow>
            <LabelCell>Applicable Weightage Considered</LabelCell>
            <ComputedCell>{applicableWeight}%</ComputedCell>
            <LabelCell>Indicative Recommendation (system)</LabelCell>
            <ComputedCell sx={{ bgcolor: bandColor(band) }}>{recLabel}</ComputedCell>
          </TableRow>
          <TableRow>
            <LabelCell>INTERVIEWER'S FINAL RECOMMENDATION</LabelCell>
            <InputCell>
              <TextField select size="small" fullWidth
                value={scores.recommendation || ''}
                onChange={e => u('recommendation', e.target.value)}
                disabled={disabled}
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: C.inputBg } }}
              >
                <MenuItem value="">— select —</MenuItem>
                {RECOMMENDATIONS.map(r => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
              </TextField>
            </InputCell>
            <LabelCell>Alignment Check</LabelCell>
            <ComputedCell sx={{ bgcolor: alignColor(alignment), fontSize: '0.78rem' }}>{alignment || '-'}</ComputedCell>
          </TableRow>
          {alignment && !alignment.startsWith('Aligned') && (
            <TableRow>
              <LabelCell sx={{ verticalAlign: 'top' }}>Justification for Override</LabelCell>
              <TableCell colSpan={3} sx={{ bgcolor: C.inputBg, py: 0.5 }}>
                <TextField size="small" fullWidth multiline rows={3}
                  value={scores.alignment_justification || ''}
                  onChange={e => u('alignment_justification', e.target.value)}
                  disabled={disabled}
                  placeholder={`Your recommendation does not match the score band. Please justify (minimum ${VALIDATION.ALIGNMENT_JUSTIFICATION_MIN} characters)`}
                  helperText={`${(scores.alignment_justification || '').length} characters`}
                  sx={{ '& .MuiOutlinedInput-root': { bgcolor: C.inputBg, fontSize: '0.82rem' } }}
                />
              </TableCell>
            </TableRow>
          )}
          <TableRow>
            <LabelCell>Form Completeness Check</LabelCell>
            <TableCell colSpan={3} sx={{ bgcolor: completenessColor(completeness), fontWeight: 700, fontSize: '0.82rem', color: C.navyTx, textAlign: 'center' }}>
              {completeness}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      {/* ═══ SECTION 4: QUESTION LOG ═══ */}
      <SectionHeader>4.  QUESTION LOG  -  WHAT WAS ACTUALLY ASKED  (minimum three entries)</SectionHeader>
      <Table size="small" sx={{ '& td, & th': { borderColor: '#D0D0D0' } }}>
        <TableHead>
          <TableRow sx={{ bgcolor: C.teal }}>
            <TableCell sx={{ color: C.whiteTx, fontWeight: 700, fontSize: '0.78rem', width: 300 }}>Question asked</TableCell>
            <TableCell sx={{ color: C.whiteTx, fontWeight: 700, fontSize: '0.78rem', width: 140 }}>Metric assessed</TableCell>
            <TableCell sx={{ color: C.whiteTx, fontWeight: 700, fontSize: '0.78rem' }}>Candidate's response and your assessment</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {qRows.map((row, i) => (
            <TableRow key={i}>
              <InputCell>
                <TextField size="small" fullWidth multiline rows={2}
                  value={row.question || ''}
                  onChange={e => {
                    const updated = [...qRows]; updated[i] = { ...updated[i], question: e.target.value };
                    u('question_log', updated);
                  }}
                  disabled={disabled}
                  sx={{ '& .MuiOutlinedInput-root': { bgcolor: C.inputBg, fontSize: '0.8rem' } }}
                />
              </InputCell>
              <InputCell>
                <TextField select size="small" fullWidth
                  value={row.metric || ''}
                  onChange={e => {
                    const updated = [...qRows]; updated[i] = { ...updated[i], metric: e.target.value };
                    u('question_log', updated);
                  }}
                  disabled={disabled}
                  sx={{ '& .MuiOutlinedInput-root': { bgcolor: C.inputBg, fontSize: '0.78rem' } }}
                >
                  <MenuItem value="">—</MenuItem>
                  {QUESTION_METRICS.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
                </TextField>
              </InputCell>
              <InputCell>
                <TextField size="small" fullWidth multiline rows={2}
                  value={row.response || ''}
                  onChange={e => {
                    const updated = [...qRows]; updated[i] = { ...updated[i], response: e.target.value };
                    u('question_log', updated);
                  }}
                  disabled={disabled}
                  sx={{ '& .MuiOutlinedInput-root': { bgcolor: C.inputBg, fontSize: '0.8rem' } }}
                />
              </InputCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* ═══ SECTION 5: QUALITATIVE FEEDBACK ═══ */}
      <SectionHeader>5.  QUALITATIVE FEEDBACK</SectionHeader>
      <Table size="small" sx={{ '& td': { borderColor: '#D0D0D0' } }}>
        <TableBody>
          <TableRow>
            <LabelCell sx={{ width: 200, verticalAlign: 'top' }}>Key Strengths Observed</LabelCell>
            <InputCell>
              <TextField size="small" fullWidth multiline rows={3}
                value={scores.key_strengths || ''}
                onChange={e => u('key_strengths', e.target.value)}
                disabled={disabled}
                placeholder={`Minimum ${VALIDATION.KEY_STRENGTHS_MIN} characters`}
                helperText={`${(scores.key_strengths || '').length} characters`}
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: C.inputBg, fontSize: '0.82rem' } }}
              />
            </InputCell>
          </TableRow>
          <TableRow>
            <LabelCell sx={{ verticalAlign: 'top' }}>Areas of Concern / Development Needs</LabelCell>
            <InputCell>
              <TextField size="small" fullWidth multiline rows={3}
                value={scores.areas_of_concern || ''}
                onChange={e => u('areas_of_concern', e.target.value)}
                disabled={disabled}
                placeholder={`Minimum ${VALIDATION.AREAS_OF_CONCERN_MIN} characters`}
                helperText={`${(scores.areas_of_concern || '').length} characters`}
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: C.inputBg, fontSize: '0.82rem' } }}
              />
            </InputCell>
          </TableRow>
          <TableRow>
            <LabelCell sx={{ verticalAlign: 'top' }}>Overall Remarks &amp; Justification for the Recommendation</LabelCell>
            <InputCell>
              <TextField size="small" fullWidth multiline rows={4}
                value={scores.overall_remarks || ''}
                onChange={e => u('overall_remarks', e.target.value)}
                disabled={disabled}
                placeholder={`Minimum ${VALIDATION.OVERALL_REMARKS_MIN} characters`}
                helperText={`${(scores.overall_remarks || '').length} characters`}
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: C.inputBg, fontSize: '0.82rem' } }}
              />
            </InputCell>
          </TableRow>
        </TableBody>
      </Table>

      {/* ═══ SECTION 6: PANEL, DECLARATION & SUBMISSION ═══ */}
      <SectionHeader>6.  PANEL, DECLARATION &amp; SUBMISSION</SectionHeader>
      <Table size="small" sx={{ '& td': { borderColor: '#D0D0D0' } }}>
        <TableBody>
          <TableRow>
            <LabelCell sx={{ width: 200 }}>Other panel members (if any)</LabelCell>
            <InputCell>
              <TextField size="small" fullWidth value={scores.panel_members || ''} onChange={e => u('panel_members', e.target.value)} disabled={disabled}
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: C.inputBg, fontSize: '0.82rem' } }} />
            </InputCell>
            <LabelCell>Panel consensus reached</LabelCell>
            <InputCell>
              <TextField select size="small" fullWidth value={scores.panel_consensus || ''} onChange={e => u('panel_consensus', e.target.value)} disabled={disabled}
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: C.inputBg } }}>
                <MenuItem value="">—</MenuItem>
                {['Yes', 'No', 'Not Applicable'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
              </TextField>
            </InputCell>
          </TableRow>
        </TableBody>
      </Table>

      {/* Declaration */}
      <Box sx={{ px: 2, py: 1.5, bgcolor: C.instructBg, borderTop: '1px solid #D0D0D0' }}>
        <Typography sx={{ fontSize: '0.75rem', color: C.instructTx, lineHeight: 1.5 }}>
          I confirm that this evaluation is based solely on the candidate's performance during the interview; that I have no personal, financial or referral interest in the outcome; that I have not shared or discussed the questions or the candidate's answers outside the authorised panel; and that every rating above is supported by the evidence I have documented in this form.
        </Typography>
        <FormControlLabel
          control={
            <Checkbox checked={!!scores.declaration_accepted} onChange={e => u('declaration_accepted', e.target.checked)} disabled={disabled}
              sx={{ '&.Mui-checked': { color: C.navy } }} />
          }
          label={<Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: C.navyTx }}>I accept this declaration</Typography>}
          sx={{ mt: 1 }}
        />
      </Box>

      {/* Bottom section — Signature, Date, Ref, HR Status */}
      <Table size="small" sx={{ '& td': { borderColor: '#D0D0D0', py: 0.8, fontSize: '0.82rem' } }}>
        <TableBody>
          <TableRow>
            <LabelCell sx={{ width: '18%' }}>Interviewer Signature</LabelCell>
            <InputCell sx={{ width: '30%' }}>
              <TextField size="small" fullWidth
                value={scores.interviewer_signature || ''}
                onChange={e => u('interviewer_signature', e.target.value)}
                disabled={disabled}
                placeholder="Type your full name"
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: C.inputBg, fontSize: '0.82rem' } }}
              />
            </InputCell>
            <LabelCell sx={{ width: '18%' }}>Date of Submission</LabelCell>
            <TableCell sx={{ width: '34%', bgcolor: C.computedBg, fontSize: '0.82rem' }}>
              {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </TableCell>
          </TableRow>
          <TableRow>
            <LabelCell>IEVALX Submission Ref. No.</LabelCell>
            <TableCell sx={{ bgcolor: C.computedBg, fontSize: '0.82rem', color: '#888' }}>
              {context?.submission?.submission_ref || 'Generated on submission'}
            </TableCell>
            <LabelCell>HR Re-audit Status</LabelCell>
            <TableCell sx={{ bgcolor: C.computedBg, fontSize: '0.82rem' }}>
              {context?.submission?.hr_reaudit_status || 'Pending'}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      {/* Footer */}
      <Box sx={{ bgcolor: C.navy, px: 2, py: 1, textAlign: 'center' }}>
        <Typography sx={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.6)' }}>
          CONFIDENTIAL — Advisory only. Subject to mandatory HR re-audit within IEVALX before any outcome is communicated to the candidate. &nbsp;&nbsp; IEVALX | {context?.company_name || 'Company'}
        </Typography>
      </Box>
    </Paper>
  );
};

export default ScoringForm;
