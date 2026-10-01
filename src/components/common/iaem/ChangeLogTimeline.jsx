// BUILD: 2026-08-24-iaem-common-v1
// Tamper-evident change log — each event shows its hash + prev_hash
import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { FiberManualRecord, Lock } from '@mui/icons-material';

const ChangeLogTimeline = ({ events = [] }) => {
  if (!events.length) {
    return (
      <Typography variant="body2" sx={{ color: '#888', p: 2 }}>
        No events recorded yet.
      </Typography>
    );
  }

  return (
    <Box sx={{ pl: 2 }}>
      {events.map((evt, i) => (
        <Box key={i} sx={{ display: 'flex', gap: 2, mb: 0, position: 'relative' }}>
          {/* Timeline line */}
          <Box sx={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20, flexShrink: 0,
          }}>
            <FiberManualRecord sx={{
              fontSize: 10,
              color: i === 0 ? '#04282B' : '#CCC',
              mt: 0.8,
            }} />
            {i < events.length - 1 && (
              <Box sx={{ width: 1, flex: 1, bgcolor: '#E0E0E0', my: 0.5 }} />
            )}
          </Box>

          {/* Content */}
          <Paper elevation={0} sx={{
            flex: 1, p: 1.5, mb: 1.5, borderRadius: 1.5,
            bgcolor: i === 0 ? '#F5F5F5' : 'transparent',
            border: i === 0 ? '1px solid #E8E8E8' : 'none',
          }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#2C2C2A', fontSize: '0.88rem' }}>
              {evt.event}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mt: 0.5, flexWrap: 'wrap' }}>
              <Typography variant="caption" sx={{ color: '#666' }}>
                {evt.actor}
              </Typography>
              <Typography variant="caption" sx={{ color: '#AAA' }}>
                {new Date(evt.timestamp).toLocaleString()}
              </Typography>
              {evt.hash && (
                <Typography variant="caption" sx={{ color: '#BBB', fontFamily: 'monospace', fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: 0.3 }}>
                  <Lock sx={{ fontSize: 10 }} /> {evt.hash}
                </Typography>
              )}
            </Box>
          </Paper>
        </Box>
      ))}
    </Box>
  );
};

export default ChangeLogTimeline;
