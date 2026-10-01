// ============================================================================
// CareerProfile.jsx
// Workspace > Resume Builder > Career Profile card
// Location: src/components/jobseeker/Workspace/CareerProfile.jsx
// ============================================================================

import React from 'react';
import {
  Paper, Typography, Stack, Avatar, Button, TextField, Box,
} from '@mui/material';
import { Description } from '@mui/icons-material';

const PRIMARY = '#1E3358';
const PRIMARY_DARK = '#162848';
const PRIMARY_SOFT = 'rgba(30, 51, 88, 0.10)';

const CareerProfile = ({ profile, saving, updateProfileField, onSave }) => {
  return (
    <Paper
      elevation={0}
      sx={{ p: 3.5, borderRadius: 3, border: '1px solid #E5E7EB', textAlign: 'center' }}
    >
      <Avatar sx={{ bgcolor: PRIMARY_SOFT, color: PRIMARY, width: 56, height: 56, mx: 'auto', mb: 1.5 }}>
        <Description />
      </Avatar>
      <Typography variant="h6" fontWeight={700} sx={{ color: PRIMARY, mb: 0.5 }}>
        Career Profile
      </Typography>
      <Typography variant="body2" sx={{ color: '#9CA3AF', mb: 3 }}>
        Update your core information for the AI Resume builder.
      </Typography>

      <Stack spacing={2} sx={{ textAlign: 'left' }}>
        <Box>
          <Typography
            variant="caption"
            sx={{ color: '#6B7280', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}
          >
            Current Role
          </Typography>
          <TextField
            fullWidth
            size="small"
            sx={{ mt: 0.5 }}
            value={profile.currentRole || ''}
            onChange={(e) => updateProfileField('currentRole', e.target.value)}
            placeholder="e.g. Full Stack Developer"
          />
        </Box>
        <Box>
          <Typography
            variant="caption"
            sx={{ color: '#6B7280', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}
          >
            Expertise
          </Typography>
          <TextField
            fullWidth
            size="small"
            sx={{ mt: 0.5 }}
            value={profile.expertise || ''}
            onChange={(e) => updateProfileField('expertise', e.target.value)}
            placeholder="e.g. React, Node.js, AWS"
          />
        </Box>

        <Button
          variant="contained"
          disabled={saving}
          onClick={onSave}
          sx={{
            bgcolor: PRIMARY,
            textTransform: 'none',
            borderRadius: 8,
            py: 2.25,
            fontWeight: 600,
            ml: 'auto',
            '&:hover': { bgcolor: PRIMARY_DARK },
          }}
        >
          {saving ? 'Saving...' : 'Save Profile'}
        </Button>
      </Stack>
    </Paper>
  );
};

export default CareerProfile;