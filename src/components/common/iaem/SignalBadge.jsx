// BUILD: 2026-08-24-iaem-common-v1
import React from 'react';
import { Chip } from '@mui/material';
import { SIGNALS, SEVERITY } from '@/constants/iaem';

const SignalBadge = ({ code, showName = true, size = 'small' }) => {
  const signal = SIGNALS[code];
  if (!signal) return null;

  const sev = SEVERITY[signal.severityRange[signal.severityRange.length - 1]] || SEVERITY.LOW;

  return (
    <Chip
      label={showName ? `${code} — ${signal.name}` : code}
      size={size}
      sx={{
        bgcolor: sev.bg,
        color: sev.color,
        fontWeight: 700,
        fontSize: '0.72rem',
        borderRadius: 1.5,
      }}
    />
  );
};

export default SignalBadge;
