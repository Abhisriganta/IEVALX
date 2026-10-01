// BUILD: 2026-08-24-iaem-common-v1
import React from 'react';
import { Chip } from '@mui/material';
import { CheckCircle, WarningAmber } from '@mui/icons-material';

const AuditStatusBadge = ({ status, size = 'small' }) => {
  const isClean = status === 'NO_SIGNALS';
  return (
    <Chip
      icon={isClean ? <CheckCircle sx={{ fontSize: 16 }} /> : <WarningAmber sx={{ fontSize: 16 }} />}
      label={isClean ? 'No signals fired' : 'Signals surfaced'}
      size={size}
      sx={{
        bgcolor: isClean ? '#E8F5E9' : '#FFF3E0',
        color: isClean ? '#4CAF50' : '#E65100',
        fontWeight: 600,
        fontSize: '0.75rem',
        '& .MuiChip-icon': { color: 'inherit' },
      }}
    />
  );
};

export default AuditStatusBadge;
