import React from 'react';
import { Box, CircularProgress } from '@mui/material';

const PINE  = '#022124';
const SAGE  = '#7F9E7E';
const CREAM = '#F6F8F3';

const RouteFallback = ({ variant = 'inline', minHeight }) => {
  const fullscreen = variant === 'fullscreen';

  return (
    <Box
      role="status"
      aria-live="polite"
      aria-busy="true"
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        minHeight: minHeight || (fullscreen ? '100vh' : '60vh'),
        bgcolor: fullscreen ? CREAM : 'transparent',
      }}
    >
      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
        {/* Static track ring */}
        <CircularProgress
          variant="determinate"
          value={100}
          size={38}
          thickness={3}
          sx={{ color: 'rgba(127,158,126,0.22)' }}
        />
        {/* Animated arc */}
        <CircularProgress
          size={38}
          thickness={3}
          disableShrink
          sx={{
            color: SAGE,
            position: 'absolute',
            left: 0,
            animationDuration: '900ms',
            '& .MuiCircularProgress-circle': { strokeLinecap: 'round' },
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: '"DM Serif Display", Georgia, serif',
            fontSize: 13,
            lineHeight: 1,
            color: PINE,
            opacity: 0.65,
            userSelect: 'none',
          }}
        >
          i
        </Box>
      </Box>
    </Box>
  );
};

export default RouteFallback;