// BUILD: 2026-08-24-iaem-common-v1
import React from 'react';
import { Chip } from '@mui/material';
import { CASE_STATES } from '@/constants/iaem';

const CaseStateBadge = ({ state, size = 'small' }) => {
  const s = CASE_STATES[state] || CASE_STATES.OPEN;
  return (
    <Chip
      label={s.label}
      size={size}
      sx={{ bgcolor: s.bg, color: s.color, fontWeight: 700, fontSize: '0.72rem', borderRadius: 1.5 }}
    />
  );
};

export default CaseStateBadge;
