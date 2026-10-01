import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Paper, Typography, Stack } from '@mui/material';
import {
  ArrowBackRounded,
  CheckCircleRounded,
  InfoOutlined,
} from '@mui/icons-material';

const FONT = "'Jost','DM Sans',sans-serif";
const BRAND = {
  navy:     '#022124',
  navyDark: '#0A3A38',
  sage:     '#7F9E7E',
  sageText: '#5E815D',
  sageSoft: '#EDF3EC',
  border:   '#E7EAE3',
  muted:    '#55584F',
  ink:      '#101210',
  bg:       '#F6F8F3',
  surface:  '#FFFFFF',
};

const AIRealtimeResults = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{
      minHeight: '100vh', bgcolor: BRAND.bg, fontFamily: FONT,
      p: { xs: 2, sm: 3, md: 4 },
    }}>
      <Box sx={{ maxWidth: 720, mx: 'auto' }}>
        <Button
          startIcon={<ArrowBackRounded sx={{ fontSize: 18 }} />}
          onClick={() => navigate('/jobseeker/smart-interviews/ai')}
          sx={{
            color: BRAND.muted, textTransform: 'none', fontFamily: FONT,
            fontSize: '0.85rem', fontWeight: 600, mb: 2, ml: -1,
            borderRadius: '999px', px: 1.5,
            '&:hover': { bgcolor: BRAND.sageSoft, color: BRAND.navy },
          }}
        >
          Back to AI interviews
        </Button>

        <Paper elevation={0} sx={{
          bgcolor: BRAND.surface, border: `1px solid ${BRAND.border}`,
          borderRadius: '18px', p: { xs: 3, sm: 5 },
          textAlign: 'center',
          boxShadow: '0 1px 2px rgba(16,18,16,0.04)',
        }}>
          <Box sx={{
            width: 72, height: 72, borderRadius: '50%',
            bgcolor: BRAND.sageSoft, mx: 'auto', mb: 2.5,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CheckCircleRounded sx={{ fontSize: 40, color: BRAND.sageText }} />
          </Box>

          <Typography sx={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: { xs: '1.6rem', sm: '1.9rem' },
            color: BRAND.navy, fontWeight: 400,
            letterSpacing: '-0.015em', lineHeight: 1.2, mb: 1.5,
          }}>
            Submission received
          </Typography>

          <Typography sx={{
            color: BRAND.muted, fontSize: { xs: '0.9rem', sm: '0.95rem' },
            lineHeight: 1.65, maxWidth: 520, mx: 'auto', mb: 3,
          }}>
            Thank you for taking the time to complete this interview. Your
            session has been recorded and forwarded to the hiring team for
            review. You will be notified once a decision has been made.
          </Typography>

          <Stack
            direction="row" spacing={1} alignItems="center"
            justifyContent="center"
            sx={{
              bgcolor: BRAND.sageSoft, borderRadius: '10px',
              border: `1px solid rgba(127,158,126,0.28)`,
              px: 2, py: 1.25, mb: 3.5, maxWidth: 520, mx: 'auto',
            }}
          >
            <InfoOutlined sx={{ fontSize: 16, color: BRAND.sageText }} />
            <Typography sx={{
              fontSize: '0.8rem', color: BRAND.sageText, fontWeight: 600,
            }}>
              No further action required.
            </Typography>
          </Stack>

          <Button
            variant="contained" disableElevation
            onClick={() => navigate('/jobseeker/smart-interviews/ai')}
            sx={{
              bgcolor: BRAND.navy, color: '#fff', fontFamily: FONT,
              textTransform: 'none', fontWeight: 700, fontSize: '0.9rem',
              borderRadius: '10px', px: 3.5, py: 1.15,
              boxShadow: '0 4px 12px rgba(2,33,36,0.22)',
              '&:hover': { bgcolor: BRAND.navyDark },
            }}
          >
            Back to my interviews
          </Button>
        </Paper>
      </Box>
    </Box>
  );
};

export default AIRealtimeResults;