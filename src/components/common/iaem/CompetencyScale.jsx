// BUILD: 2026-09-07-iaem-v2-competency-scale
// v2: supports NA + 1-5 ratings, shows weightage, updated SCORE_LABELS
import React from 'react';
import { Box, Typography, ToggleButton, ToggleButtonGroup, Tooltip, Chip } from '@mui/material';
import { SCORE_LABELS } from '@/constants/iaem';

const CompetencyScale = ({ competency, value, onChange, disabled = false }) => {
  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
        <Typography variant="body2" sx={{ fontWeight: 700, color: '#2C2C2A', fontSize: '0.88rem' }}>
          {competency.label}
        </Typography>
        {competency.weightage != null && (
          <Chip label={`${competency.weightage}%`} size="small"
            sx={{ bgcolor: '#E8EEF4', color: '#1B2A4A', fontWeight: 700, fontSize: '0.68rem', height: 20 }} />
        )}
      </Box>
      <Typography variant="caption" sx={{ color: '#888', mb: 1, display: 'block', fontSize: '0.78rem' }}>
        {competency.description}
      </Typography>
      <ToggleButtonGroup
        value={value}
        exclusive
        onChange={(_, v) => { if (v !== null) onChange(v); }}
        disabled={disabled}
        size="small"
        sx={{ gap: 0.5 }}
      >
        {['NA', 1, 2, 3, 4, 5].map((n) => (
          <Tooltip key={n} title={SCORE_LABELS[n] || String(n)} arrow>
            <ToggleButton
              value={n}
              sx={{
                px: 2, py: 0.75, borderRadius: '8px !important', border: '1px solid #E0E0E0 !important',
                fontWeight: 700, fontSize: '0.85rem',
                '&.Mui-selected': {
                  bgcolor: n === 'NA' ? '#9E9E9E' : '#04282B',
                  color: '#fff',
                  borderColor: n === 'NA' ? '#9E9E9E !important' : '#04282B !important',
                  '&:hover': { bgcolor: n === 'NA' ? '#757575' : '#0a3d40' },
                },
              }}
            >
              {n}
            </ToggleButton>
          </Tooltip>
        ))}
      </ToggleButtonGroup>
      {value != null && (
        <Typography variant="caption" sx={{ ml: 1, color: '#04282B', fontWeight: 600 }}>
          {SCORE_LABELS[value] || ''}
        </Typography>
      )}
    </Box>
  );
};

export default CompetencyScale;
