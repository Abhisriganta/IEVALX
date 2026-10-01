

import React, { useState } from 'react';
import { Box, Typography, Chip, Collapse, Button } from '@mui/material';
import { Psychology, ExpandMore, ExpandLess } from '@mui/icons-material';

const SCORE_LABELS = {
  1: 'Poor',
  2: 'Below avg',
  3: 'Average',
  4: 'Good',
  5: 'Exceptional',
};

const ScorePill = ({ value, variant }) => {
  if (value === 0 || value == null) {
    return (
      <Typography variant="caption" sx={{ color: '#9E9E9E', fontWeight: 600, minWidth: 20, textAlign: 'center' }}>
        N/A
      </Typography>
    );
  }
  const color = variant === 'interviewer' ? '#04282B' : '#1976D2';
  return (
    <Typography variant="body2" sx={{ fontWeight: 700, color, minWidth: 20, textAlign: 'center' }}>
      {value}
    </Typography>
  );
};

const AIScoreBreakdown = ({ signalEvidence }) => {
  const [expanded, setExpanded] = useState(true);

  if (!signalEvidence?.per_competency) return null;

  const competencies = signalEvidence.per_competency;
  const hasAnyReasoning = competencies.some(c => c.ai_reasoning);
  const overallReasoning = signalEvidence.ai_overall_reasoning;

  return (
    <Box sx={{ borderRadius: 2.5, border: '1px solid #E8E8E8', overflow: 'hidden' }}>
      {/* Header */}
      <Box
        onClick={() => setExpanded(!expanded)}
        sx={{
          px: 2.5, py: 1.5, bgcolor: '#F9F9F9', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: expanded ? '1px solid #E8E8E8' : 'none',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Psychology sx={{ fontSize: 18, color: '#04282B' }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#2C2C2A' }}>
            AI score breakdown — why the AI scored each area
          </Typography>
          {hasAnyReasoning && (
            <Chip label="Detailed" size="small" sx={{
              height: 18, fontSize: '0.65rem', fontWeight: 600,
              bgcolor: '#E3F2FD', color: '#1976D2',
            }} />
          )}
        </Box>
        {expanded ? <ExpandLess sx={{ color: '#888' }} /> : <ExpandMore sx={{ color: '#888' }} />}
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ p: 2.5 }}>
          {/* Overall AI reasoning (if provided) */}
          {overallReasoning && (
            <Box sx={{ mb: 2.5, p: 2, borderRadius: 1.5, bgcolor: '#F5F9FF', border: '1px solid #E3F2FD' }}>
              <Typography variant="caption" sx={{ color: '#1976D2', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem', mb: 0.5, display: 'block' }}>
                AI overall assessment
              </Typography>
              <Typography variant="body2" sx={{ color: '#333', lineHeight: 1.6, fontSize: '0.88rem' }}>
                {overallReasoning}
              </Typography>
            </Box>
          )}

          {/* Column headers */}
          <Box sx={{ display: 'flex', alignItems: 'center', px: 1, mb: 1 }}>
            <Typography variant="caption" sx={{ flex: 2, color: '#AAA', fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase' }}>
              Competency
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', minWidth: 80 }}>
              <Typography variant="caption" sx={{ color: '#04282B', fontWeight: 600, fontSize: '0.7rem', minWidth: 20, textAlign: 'center' }}>
                Int
              </Typography>
              <Typography variant="caption" sx={{ color: '#AAA', fontSize: '0.65rem' }}>vs</Typography>
              <Typography variant="caption" sx={{ color: '#1976D2', fontWeight: 600, fontSize: '0.7rem', minWidth: 20, textAlign: 'center' }}>
                AI
              </Typography>
            </Box>
            {hasAnyReasoning && (
              <Typography variant="caption" sx={{ flex: 3, color: '#AAA', fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', ml: 2 }}>
                AI reasoning
              </Typography>
            )}
          </Box>

          {/* Per-competency rows */}
          {competencies.map((c, i) => {
            const notAssessed = c.ai === 0 || c.ai == null;
            const diverges = !notAssessed && c.interviewer && c.ai && Math.abs(c.interviewer - c.ai) >= 2;
            return (
              <Box
                key={i}
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  py: 1.5,
                  px: 1,
                  borderBottom: i < competencies.length - 1 ? '1px solid #F0F0F0' : 'none',
                  bgcolor: diverges ? '#FFF8E1' : 'transparent',
                  borderRadius: 1,
                  transition: 'background-color 0.15s',
                  '&:hover': { bgcolor: diverges ? '#FFF3E0' : '#FAFAFA' },
                }}
              >
                {/* Competency name */}
                <Box sx={{ flex: 2, display: 'flex', alignItems: 'center', gap: 0.5, minHeight: 24 }}>
                  <Typography variant="body2" sx={{ color: '#555', fontSize: '0.88rem' }}>
                    {c.competency}
                  </Typography>
                  {diverges && (
                    <Chip label={`${Math.abs(c.interviewer - c.ai)} gap`} size="small" sx={{
                      height: 16, fontSize: '0.6rem', fontWeight: 700,
                      bgcolor: '#FFF3E0', color: '#E65100',
                    }} />
                  )}
                </Box>

                {/* Score comparison */}
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', minWidth: 80 }}>
                  <ScorePill value={c.interviewer} variant="interviewer" />
                  <Typography variant="caption" sx={{ color: '#CCC' }}>vs</Typography>
                  {notAssessed ? (
                    <Typography variant="caption" sx={{ color: '#E65100', fontWeight: 700, fontSize: '0.7rem', minWidth: 20, textAlign: 'center' }}>
                      N/A
                    </Typography>
                  ) : (
                    <ScorePill value={c.ai} variant="ai" />
                  )}
                </Box>

                {/* AI reasoning for this competency */}
                {hasAnyReasoning && (
                  <Typography variant="body2" sx={{
                    flex: 3, ml: 2, color: notAssessed ? '#E65100' : '#666', fontSize: '0.82rem', lineHeight: 1.5,
                    fontStyle: (c.ai_reasoning && !notAssessed) ? 'normal' : 'italic',
                  }}>
                    {notAssessed
                      ? 'Interviewer did not ask questions on this category — excluded from overall score.'
                      : (c.ai_reasoning || 'No detailed reasoning available')}
                  </Typography>
                )}
              </Box>
            );
          })}

          {/* Score scale legend */}
          <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px solid #F0F0F0', display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <Typography variant="caption" sx={{ color: '#AAA', fontSize: '0.7rem' }}>Scale:</Typography>
            {Object.entries(SCORE_LABELS).map(([val, label]) => (
              <Typography key={val} variant="caption" sx={{ color: '#AAA', fontSize: '0.7rem' }}>
                {val} = {label}
              </Typography>
            ))}
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
};

export default AIScoreBreakdown;
