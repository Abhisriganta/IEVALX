
import React, { useState } from 'react';
import { Box, Typography, Divider, Button } from '@mui/material';
import { SmartToy, Info } from '@mui/icons-material';
import ConfidenceBar from './ConfidenceBar';

const Section = ({ label, children }) => (
  <Box sx={{ mb: 2 }}>
    <Typography variant="caption" sx={{ color: '#888', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', mb: 0.5, display: 'block' }}>
      {label}
    </Typography>
    {children}
  </Box>
);

const AIAnalysisPanel = ({ classification }) => {

  if (!classification) return null;

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <SmartToy sx={{ color: '#04282B', fontSize: 20 }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#2C2C2A' }}>
          AI Analysis
        </Typography>
      </Box>

      <Section label="Classification">
        <Typography variant="body2" sx={{ color: '#333', fontWeight: 600, fontSize: '0.9rem' }}>
          {classification.category}
        </Typography>
      </Section>

      <Section label="Confidence">
        <ConfidenceBar value={classification.confidence} />
      </Section>

      <Section label="Reasoning">
        <Typography variant="body2" sx={{ color: '#555', lineHeight: 1.6, fontSize: '0.88rem' }}>
          {classification.reasoning}
        </Typography>
      </Section>

      <Divider sx={{ my: 2 }} />

      <Section label="Alternative explanation (not evidence if)">
        <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: '#F0F7F0', border: '1px solid #C8E6C9' }}>
          <Typography variant="body2" sx={{ color: '#2E7D32', lineHeight: 1.6, fontSize: '0.85rem', fontStyle: 'italic' }}>
            {classification.not_evidence_if}
          </Typography>
        </Box>
      </Section>

    </Box>
  );
};

export default AIAnalysisPanel;
