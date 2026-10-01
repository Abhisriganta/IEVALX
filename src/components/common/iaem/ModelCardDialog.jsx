// BUILD: 2026-08-29-iaem-common-v2
import React from 'react';
import { Dialog, DialogContent, IconButton, Typography, Box } from '@mui/material';
import { Close } from '@mui/icons-material';
import ModelCard from './ModelCard';

const T = {
  pine:   '#04282B',
  sage:   '#8FB08E',
  sageBg: '#EDF3EC',
  border: '#E7EAE3',
  white:  '#FFFFFF',
  font:   "'DM Sans', sans-serif",
  display:"'Jost', sans-serif",
};

const ModelCardDialog = ({ open, onClose, card }) => (
  <Dialog
    open={open}
    onClose={onClose}
    maxWidth="md"
    fullWidth
    slotProps={{
      paper: {
        sx: {
          borderRadius: 3.5,
          overflow: 'hidden',
          border: `1px solid ${T.border}`,
          boxShadow: '0 20px 60px rgba(4,40,43,0.12)',
        },
      },
    }}
  >
    {/* ── Pine header bar ── */}
    <Box
      sx={{
        bgcolor: T.pine,
        px: 3,
        py: 1.75,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Typography
        sx={{
          fontFamily: T.display,
          fontWeight: 600,
          fontSize: '0.95rem',
          color: T.white,
          letterSpacing: '0.01em',
        }}
      >
        AI Model Card
      </Typography>
      <IconButton
        size="small"
        onClick={onClose}
        sx={{
          color: T.sage,
          '&:hover': { bgcolor: 'rgba(143,176,142,0.15)' },
        }}
      >
        <Close fontSize="small" />
      </IconButton>
    </Box>

    {/* ── Content ── */}
    <DialogContent sx={{ px: 3, py: 3, bgcolor: T.white }}>
      <ModelCard card={card} />
    </DialogContent>
  </Dialog>
);

export default ModelCardDialog;