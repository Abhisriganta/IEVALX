// BUILD: 2026-08-24-iaem-common-v1
import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { AccessTime, Warning } from '@mui/icons-material';

const formatRemaining = (ms) => {
  if (ms <= 0) return 'OVERDUE';
  const hours = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return `${days}d ${remHours}h`;
  }
  return `${hours}h ${mins}m`;
};

const SLACountdown = ({ deadline }) => {
  const [remaining, setRemaining] = useState(() => new Date(deadline) - Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setRemaining(new Date(deadline) - Date.now());
    }, 60000); // update every minute
    return () => clearInterval(timer);
  }, [deadline]);

  const breached = remaining <= 0;
  const urgent = remaining > 0 && remaining < 3600000 * 4; // < 4 hours

  return (
    <Box sx={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 0.5,
      px: 1,
      py: 0.25,
      borderRadius: 1,
      bgcolor: breached ? '#FFCDD2' : urgent ? '#FFF3E0' : '#F5F5F5',
    }}>
      {breached ? (
        <Warning sx={{ fontSize: 14, color: '#B71C1C' }} />
      ) : (
        <AccessTime sx={{ fontSize: 14, color: urgent ? '#E65100' : '#666' }} />
      )}
      <Typography variant="caption" sx={{
        fontWeight: 700,
        fontSize: '0.72rem',
        color: breached ? '#B71C1C' : urgent ? '#E65100' : '#555',
      }}>
        {formatRemaining(remaining)}
      </Typography>
    </Box>
  );
};

export default SLACountdown;
