
import React from 'react';
import {
  Box, Dialog, Typography, Stack, CircularProgress,
} from '@mui/material';
import { AC, FONT, Eyebrow } from '../authTheme';

const ROLE_META = {
  COMPANY:     { icon: '🏢', title: 'Continue as Company',     desc: 'Manage your organization and hiring pipeline.' },
  EMPLOYER:    { icon: '💼', title: 'Continue as Employer',    desc: 'Post jobs and review candidates on behalf of a company.' },
  JOBSEEKER:   { icon: '👤', title: 'Continue as Jobseeker',   desc: 'Browse jobs, take assessments, track applications.' },
  INTERVIEWER: { icon: '🎙️', title: 'Continue as Interviewer', desc: 'Conduct interviews, submit evaluations, track cases.' }, // BUILD: 2026-08-24-iaem-gaps-v1
  COMPLIANCE:  { icon: '🛡️', title: 'Continue as Compliance',  desc: 'Oversee critical cases, legal holds, and audit trails.' }, // BUILD: 2026-08-24-iaem-gaps-v1
};

const Card = ({ role, onClick, disabled, isSubmitting }) => {
  const meta = ROLE_META[role] || { icon: '•', title: role, desc: '' };
  return (
    <Box
      onClick={disabled ? undefined : onClick}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); }
      }}
      sx={{
        border: `1px solid ${AC.line}`,
        borderRadius: '14px',
        p: 2,
        display: 'flex',
        alignItems: 'center',
        gap: 1.75,
        cursor: disabled ? 'default' : 'pointer',
        bgcolor: AC.white,
        opacity: disabled && !isSubmitting ? 0.55 : 1,
        outline: 'none',
        transition: 'all 0.22s cubic-bezier(0.22,1,0.36,1)',
        '&:hover, &:focus-visible': disabled ? {} : {
          borderColor: AC.sage,
          bgcolor: AC.sageSoft,
          transform: 'translateY(-2px)',
          boxShadow: '0 10px 24px rgba(2,33,36,0.08)',
        },
      }}
    >
      <Box sx={{
        width: 46, height: 46, borderRadius: '12px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22, bgcolor: AC.sageSoft, border: `1px solid rgba(127,158,126,0.3)`,
        flexShrink: 0,
      }}>
        {meta.icon}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontFamily: FONT, fontSize: 14.5, fontWeight: 600, color: AC.ink, mb: 0.25 }}>
          {meta.title}
        </Typography>
        <Typography sx={{ fontFamily: FONT, fontSize: 12, color: AC.muted, lineHeight: 1.5 }}>
          {meta.desc}
        </Typography>
      </Box>
      <Box sx={{ fontSize: 18, color: AC.sage, flexShrink: 0 }}>
        {isSubmitting ? <CircularProgress size={16} sx={{ color: AC.sage }} /> : '→'}
      </Box>
    </Box>
  );
};

const RoleChoiceDialog = ({ open, email, roles = [], submittingRole, onChoose, onClose }) => {
  const busy = Boolean(submittingRole);
  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: '18px',
            p: 0,
            bgcolor: AC.cream,
            border: `1px solid ${AC.line}`,
            boxShadow: '0 24px 60px rgba(2,33,36,0.18)',
          },
        },
      }}
    >
      <Box sx={{ p: { xs: 3, sm: 3.5 } }}>
        <Eyebrow label="CHOOSE ROLE" />
        <Typography sx={{ fontFamily: FONT, fontSize: 24, fontWeight: 700, letterSpacing: '-0.6px', color: AC.ink, mb: 0.5 }}>
          Which{' '}
          <Box component="span" sx={{ fontStyle: 'italic', fontWeight: 500, color: AC.sage }}>account</Box>?
        </Typography>
        <Typography sx={{ fontFamily: FONT, fontSize: 12.5, color: AC.muted, mb: 2.5, lineHeight: 1.6 }}>
          These credentials work for multiple accounts on{' '}
          <Box component="span" sx={{ color: AC.ink, fontWeight: 600 }}>{email}</Box>. Pick which one you'd like to sign in as.
        </Typography>

        <Stack spacing={1.25}>
          {roles.map((r) => (
            <Card
              key={r}
              role={r}
              disabled={busy}
              isSubmitting={submittingRole === r}
              onClick={() => onChoose(r)}
            />
          ))}
        </Stack>

        <Typography
          onClick={busy ? undefined : onClose}
          sx={{
            fontFamily: FONT, fontSize: 12.5, color: AC.muted,
            textAlign: 'center', mt: 2.5, cursor: busy ? 'default' : 'pointer',
            '&:hover': busy ? {} : { color: AC.ink },
          }}
        >
          Cancel
        </Typography>
      </Box>
    </Dialog>
  );
};

export default RoleChoiceDialog;