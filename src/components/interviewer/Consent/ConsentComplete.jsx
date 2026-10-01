// BUILD: 2026-08-24-iaem-consent-v1
import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { CheckCircle } from '@mui/icons-material';

const ConsentComplete = ({ onProceed }) => (
  <Box sx={{
    minHeight: '100vh',
    bgcolor: '#F5F4F0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    px: 2,
  }}>
    <Paper elevation={0} sx={{
      maxWidth: 520,
      width: '100%',
      p: { xs: 4, md: 5 },
      borderRadius: 3,
      border: '1px solid #E0E0E0',
      bgcolor: '#fff',
      textAlign: 'center',
    }}>
      <CheckCircle sx={{ fontSize: 64, color: '#4CAF50', mb: 2 }} />
      <Typography variant="h5" sx={{ fontWeight: 700, color: '#2C2C2A', mb: 1.5 }}>
        You're All Set
      </Typography>
      <Typography variant="body1" sx={{ color: '#555', lineHeight: 1.7, mb: 3 }}>
        Thank you for reviewing and acknowledging each clause. Your profile is now Active.
        You can access your Interviewer Dashboard.
      </Typography>
      <Button
        variant="contained"
        onClick={onProceed}
        sx={{
          bgcolor: '#04282B',
          color: '#fff',
          textTransform: 'none',
          fontWeight: 600,
          px: 5,
          py: 1.2,
          borderRadius: 2,
          fontSize: '1rem',
          '&:hover': { bgcolor: '#0a3d40' },
        }}
      >
        Go to Dashboard
      </Button>
    </Paper>
  </Box>
);

export default ConsentComplete;
