// BUILD: 2026-09-07-iaem-v2-reveal
// Post-submit only — AI score revealed after submission is locked
import React from 'react';
import { Box, Typography, Paper, Chip } from '@mui/material';
import { SmartToy, CompareArrows } from '@mui/icons-material';
import { ScoreComparisonTable } from '@/components/common/iaem';
import { COMPETENCY_LABELS } from '@/constants/iaem';

const AIScoreReveal = ({ aiScore, overallScore, divergence }) => {
  if (!aiScore) return null;

  return (
    <Paper elevation={0} sx={{ p: 3, borderRadius: 2.5, border: '1px solid #E3F2FD', bgcolor: '#FAFCFF', mt: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <SmartToy sx={{ color: '#1976D2', fontSize: 22 }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#2C2C2A' }}>AI Provisional Score — Now Revealed</Typography>
      </Box>
      <Typography variant="body2" sx={{ color: '#888', mb: 2 }}>
        Your submission is final. Below is the AI-generated score for comparison. This was hidden while you completed your evaluation to prevent anchoring bias.
      </Typography>

      <Box sx={{ display: 'flex', gap: 3, mb: 2, flexWrap: 'wrap' }}>
        <Box sx={{ p: 2, bgcolor: '#fff', borderRadius: 2, border: '1px solid #E8E8E8', minWidth: 120, textAlign: 'center' }}>
          <Typography variant="caption" sx={{ color: '#888' }}>Your Score</Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#2C2C2A' }}>{overallScore ?? '—'}</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center' }}><CompareArrows sx={{ color: '#CCC', fontSize: 28 }} /></Box>
        <Box sx={{ p: 2, bgcolor: '#fff', borderRadius: 2, border: '1px solid #E8E8E8', minWidth: 120, textAlign: 'center' }}>
          <Typography variant="caption" sx={{ color: '#888' }}>AI Score</Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#1976D2' }}>{aiScore.overall}</Typography>
        </Box>
        {divergence && (
          <Box sx={{ p: 2, bgcolor: '#fff', borderRadius: 2, border: '1px solid #E8E8E8', minWidth: 120, textAlign: 'center' }}>
            <Typography variant="caption" sx={{ color: '#888' }}>Divergence</Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: Math.abs(divergence?.raw) > 10 ? '#E65100' : '#4CAF50' }}>
              {divergence?.raw > 0 ? '+' : ''}{divergence?.raw}
            </Typography>
            <Typography variant="caption" sx={{ color: '#888' }}>adjusted: {divergence?.calibration_adjusted}</Typography>
          </Box>
        )}
      </Box>

      <ScoreComparisonTable comparison={{
        interviewer_overall: overallScore,
        ai_overall: aiScore.overall,
        raw_divergence: divergence?.raw,
        calibration_adjusted_divergence: divergence?.calibration_adjusted,
        per_competency: Object.entries(aiScore.competencies || {}).map(([key, aiVal]) => ({
          competency: COMPETENCY_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          interviewer: null, // interviewer per-competency not passed through in current flow
          ai: aiVal,
        })),
      }} />
    </Paper>
  );
};

export default AIScoreReveal;
