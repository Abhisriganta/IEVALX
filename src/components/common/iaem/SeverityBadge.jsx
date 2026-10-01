// BUILD: 2026-08-24-iaem-common-v1
import React from 'react';
import { Chip } from '@mui/material';
import { SEVERITY } from '@/constants/iaem';

const SeverityBadge = ({ severity, size = 'small' }) => {
  const s = SEVERITY[severity] || SEVERITY.LOW;
  return (
    <Chip
      label={s.label}
      size={size}
      sx={{ bgcolor: s.bg, color: s.color, fontWeight: 700, fontSize: '0.72rem', borderRadius: 1.5 }}
    />
  );
};

export default SeverityBadge;
