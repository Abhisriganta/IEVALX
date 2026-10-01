// BUILD: 2026-08-24-iaem-phase3-v1
// Appendix §3 — 3 self-reflection questions
import React from 'react';
import { Box, Typography, TextField, Paper } from '@mui/material';
import { SELF_REFLECTION_QUESTIONS, VALIDATION } from '@/constants/iaem';

const SelfReflectionForm = ({ answers, setAnswers, disabled = false }) => {
  const update = (key, value) => setAnswers((prev) => ({ ...prev, [key]: value }));

  return (
    <Paper elevation={0} sx={{ p: 3, borderRadius: 2.5, border: '1px solid #E8E8E8' }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#2C2C2A', mb: 0.5 }}>
        Self-Reflection
      </Typography>
      <Typography variant="body2" sx={{ color: '#888', mb: 3 }}>
        Answer these three reflection questions about the interview you just conducted.
      </Typography>

      {SELF_REFLECTION_QUESTIONS.map((q) => {
        const val = answers[q.key] || '';
        const len = val.length;
        const tooShort = q.required && len > 0 && len < q.minChars;

        return (
          <Box key={q.key} sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, color: '#2C2C2A', mb: 0.5 }}>
              {q.question}
              {!q.required && (
                <Typography component="span" variant="caption" sx={{ color: '#AAA', ml: 1 }}>(optional)</Typography>
              )}
            </Typography>
            {q.minChars > 0 && (
              <Typography variant="caption" sx={{ color: '#888', mb: 0.5, display: 'block' }}>
                Minimum {q.minChars} characters
              </Typography>
            )}
            <TextField
              fullWidth
              multiline
              rows={3}
              size="small"
              value={val}
              onChange={(e) => update(q.key, e.target.value)}
              disabled={disabled}
              error={tooShort}
              helperText={
                tooShort
                  ? `${len} / ${q.minChars} characters (need ${q.minChars - len} more)`
                  : q.minChars > 0 ? `${len} characters` : ''
              }
            />
          </Box>
        );
      })}
    </Paper>
  );
};

export default SelfReflectionForm;
