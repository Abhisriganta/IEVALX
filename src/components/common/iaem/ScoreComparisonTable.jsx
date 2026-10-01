// BUILD: 2026-08-24-iaem-common-v1
import React from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableHead, TableRow, Paper } from '@mui/material';
import { SCORE_LABELS } from '@/constants/iaem';

const ScoreCell = ({ value, highlight }) => (
  <TableCell align="center" sx={{
    fontWeight: 700, fontSize: '0.85rem',
    color: highlight ? '#E65100' : '#2C2C2A',
    bgcolor: highlight ? '#FFF3E0' : 'transparent',
  }}>
    {value ?? '—'} {value != null && value !== 'NA' && (
      <Typography component="span" variant="caption" sx={{ color: '#AAA', fontWeight: 400 }}>
        ({SCORE_LABELS[value] || '—'})
      </Typography>
    )}
    {value === 'NA' && (
      <Typography component="span" variant="caption" sx={{ color: '#AAA', fontWeight: 400 }}>(Not Assessed)</Typography>
    )}
  </TableCell>
);

const ScoreComparisonTable = ({ comparison }) => {
  if (!comparison) return null;

  return (
    <Paper elevation={0} sx={{ borderRadius: 2, border: '1px solid #E8E8E8', overflow: 'hidden' }}>
      {/* Overall scores */}
      <Box sx={{ p: 2, bgcolor: '#FAFAFA', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="caption" sx={{ color: '#888' }}>Interviewer Overall</Typography>
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#2C2C2A' }}>{comparison.interviewer_overall}/100</Typography>
        </Box>
        <Box>
          <Typography variant="caption" sx={{ color: '#888' }}>AI Overall</Typography>
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#1976D2' }}>{comparison.ai_overall}/100</Typography>
        </Box>
        <Box>
          <Typography variant="caption" sx={{ color: '#888' }}>Raw Divergence</Typography>
          <Typography variant="h6" sx={{ fontWeight: 800, color: Math.abs(comparison.raw_divergence) > 10 ? '#E65100' : '#4CAF50' }}>
            {comparison.raw_divergence > 0 ? '+' : ''}{comparison.raw_divergence}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" sx={{ color: '#888' }}>Calibration-Adjusted</Typography>
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#555' }}>
            {comparison.calibration_adjusted_divergence > 0 ? '+' : ''}{comparison.calibration_adjusted_divergence}
          </Typography>
        </Box>
      </Box>

      {/* Per-competency */}
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: '#F5F5F5' }}>
            <TableCell sx={{ fontWeight: 600, color: '#666', fontSize: '0.78rem' }}>Competency</TableCell>
            <TableCell align="center" sx={{ fontWeight: 600, color: '#666', fontSize: '0.78rem' }}>Interviewer</TableCell>
            <TableCell align="center" sx={{ fontWeight: 600, color: '#666', fontSize: '0.78rem' }}>AI</TableCell>
            <TableCell align="center" sx={{ fontWeight: 600, color: '#666', fontSize: '0.78rem' }}>Diff</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {comparison.per_competency?.map((row) => {
            const iv = typeof row.interviewer === 'number' ? row.interviewer : null;
            const ai = typeof row.ai === 'number' ? row.ai : null;
            const diff = iv != null && ai != null ? iv - ai : null;
            return (
              <TableRow key={row.competency} hover>
                <TableCell sx={{ fontSize: '0.85rem', color: '#333' }}>{row.competency}</TableCell>
                <ScoreCell value={row.interviewer} />
                <ScoreCell value={row.ai} />
                <TableCell align="center" sx={{
                  fontWeight: 700, fontSize: '0.85rem',
                  color: diff == null ? '#AAA' : Math.abs(diff) >= 2 ? '#E65100' : diff !== 0 ? '#FF9800' : '#4CAF50',
                }}>
                  {diff != null ? `${diff > 0 ? '+' : ''}${diff}` : '—'}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Paper>
  );
};

export default ScoreComparisonTable;
