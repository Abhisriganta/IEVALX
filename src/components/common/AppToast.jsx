

import React, { forwardRef, useCallback } from 'react';
import { SnackbarContent, useSnackbar } from 'notistack';
import { Box, IconButton, Typography } from '@mui/material';
import {
  CheckRounded, ErrorOutlineRounded, WarningAmberRounded,
  InfoOutlined, CloseRounded,
} from '@mui/icons-material';

/* ── Palette (same tokens as Topbar / Sidebar / Feed) ─────────────────── */
const T = {
  ink:      '#101210',
  sage:     '#7F9E7E',
  sageText: '#5E815D',
  pine:     '#022124',
  white:    '#FFFFFF',
  muted:    '#55584F',
  line:     '#E7EAE3',
};

/* ── Per-variant accent + icon ────────────────────────────────────────── */
const VARIANT = {
  success: { accent: '#7F9E7E', iconColor: '#5E815D', Icon: CheckRounded        },
  error:   { accent: '#EF4444', iconColor: '#B0322E', Icon: ErrorOutlineRounded },
  warning: { accent: '#E9A23B', iconColor: '#8A6A1F', Icon: WarningAmberRounded },
  info:    { accent: '#3C7DB8', iconColor: '#185FA5', Icon: InfoOutlined        },
  default: { accent: '#7F9E7E', iconColor: '#5E815D', Icon: InfoOutlined        },
};

/* ── The toast ────────────────────────────────────────────────────────── */
const AppToast = forwardRef(({ id, message, variant = 'default' }, ref) => {
  const { closeSnackbar } = useSnackbar();
  const { accent, iconColor, Icon } = VARIANT[variant] || VARIANT.default;

  const handleClose = useCallback(() => closeSnackbar(id), [id, closeSnackbar]);

  return (
    <SnackbarContent ref={ref} role="alert" style={{ minWidth: 'auto' }}>
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        bgcolor: T.white,
        border: `1px solid ${T.line}`,
        borderRadius: '999px',                       /* ← pill, per selection */
        pl: 2, pr: 0.75, py: 0.75,
        position: 'relative',
        overflow: 'hidden',
        maxWidth: 420,
        minWidth: 260,
        boxShadow: '0 10px 28px rgba(2,33,36,0.12), 0 2px 6px rgba(2,33,36,0.06)',
        fontFamily: "'Jost','DM Sans',sans-serif",
      }}>
        {/* 3px accent stripe — hugs the pill's left curve */}
        <Box sx={{
          position: 'absolute',
          left: 0, top: 0, bottom: 0,
          width: 5,
          bgcolor: accent,
        }} />

        {/* Variant icon */}
        <Icon sx={{ fontSize: 18, color: iconColor, flexShrink: 0, ml: 0.5 }} />

        {/* Message */}
        <Typography sx={{
          fontSize: '0.82rem',
          fontWeight: 600,
          color: T.ink,
          letterSpacing: '-0.005em',
          lineHeight: 1.4,
          flex: 1,
          py: 0.25,
          fontFamily: "'Jost','DM Sans',sans-serif",
          /* Clamp long messages to two lines so the pill stays a pill */
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {message}
        </Typography>

        {/* Close */}
        <IconButton
          onClick={handleClose}
          size="small"
          aria-label="Dismiss"
          sx={{
            width: 28, height: 28,
            color: T.muted,
            flexShrink: 0,
            '&:hover': { bgcolor: 'rgba(127,158,126,0.10)', color: T.pine },
          }}
        >
          <CloseRounded sx={{ fontSize: 15 }} />
        </IconButton>
      </Box>
    </SnackbarContent>
  );
});

AppToast.displayName = 'AppToast';

export default AppToast;