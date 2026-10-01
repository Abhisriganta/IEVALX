// BUILD: 2026-08-24-iaem-common-v1
import React from 'react';
import { Box, Typography, LinearProgress } from '@mui/material';

const getColor = (value) => {
  if (value >= 0.9) return '#B71C1C';
  if (value >= 0.75) return '#E65100';
  if (value >= 0.5) return '#FF9800';
  return '#4CAF50';
};

const ConfidenceBar = ({ value, label = 'Confidence' }) => {
  const pct = Math.round(value * 100);
  const color = getColor(value);

  return (
    <Box sx={{ mb: 1.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="caption" sx={{ color: '#666', fontWeight: 500 }}>{label}</Typography>
        <Typography variant="caption" sx={{ color, fontWeight: 700 }}>{value.toFixed(2)} ({pct}%)</Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          height: 6,
          borderRadius: 3,
          bgcolor: '#E8E8E8',
          '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 3 },
        }}
      />
    </Box>
  );
};

export default ConfidenceBar;
