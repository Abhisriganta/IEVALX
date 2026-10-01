import React, { useEffect } from 'react';
import { Box, Stack, Typography, Button, Checkbox } from '@mui/material';
import {
  DeleteSweepOutlined,
  CheckBoxOutlineBlank, CheckBoxOutlined, IndeterminateCheckBoxOutlined,
} from '@mui/icons-material';



const FONT = "'Jost','DM Sans',sans-serif";

const BRAND = {
  navy:         '#022124',
  navyDark:     '#0A3A38',
  sage:         '#7F9E7E',
  sageSoft:     '#EDF3EC',
  sageText:     '#5E815D',
  border:       '#E7EAE3',
  borderStrong: '#D8DDD4',
  muted:        '#55584F',
  ink:          '#101210',
  surface:      '#FFFFFF',
  bg:           '#F6F8F3',
};

export default function SelectionBar({
  count = 0,
  total = 0,
  allSelected = false,
  someSelected = false,
  onSelectAll = () => {},
  onClear = () => {},
  onRemove = () => {},
  deleting = false,
  categoryLabel = 'completed',
  noun = 'item',
}) {
  /* Escape clears the selection — quick keyboard undo. */
  useEffect(() => {
    if (count === 0) return;
    const onKey = (e) => {
      if (e.key === 'Escape' && !deleting) onClear();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [count, onClear, deleting]);

  const hasSelection = count > 0;

  /* ── Active state: something is selected → navy bar ─────────────────── */
  if (hasSelection) {
    const plural = count === 1 ? noun : `${noun}s`;
    return (
      <Box
        role="region"
        aria-label="Selection actions"
        aria-live="polite"
        sx={{
          position: 'sticky', top: 0, zIndex: 20,
          mb: 1.5,
          animation: 'selBarGrow 180ms ease-out',
          '@keyframes selBarGrow': {
            from: { opacity: 0, transform: 'scaleY(0.92)' },
            to:   { opacity: 1, transform: 'scaleY(1)' },
          },
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
        }}
      >
        <Box sx={{
          bgcolor: BRAND.navy, color: '#fff',
          borderRadius: '14px',
          px: { xs: 1.5, sm: 2.25 }, py: { xs: 1, sm: 1.15 },
          display: 'flex', alignItems: 'center',
          gap: { xs: 1, sm: 2 }, flexWrap: 'wrap',
          boxShadow: '0 8px 24px rgba(2,33,36,0.18), 0 2px 6px rgba(2,33,36,0.12)',
          fontFamily: FONT,
        }}>
          {/* Checkbox + count */}
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexGrow: 1, minWidth: 0 }}>
            <Checkbox
              checked={allSelected}
              indeterminate={someSelected}
              onChange={onSelectAll}
              sx={{
                p: 0.5, color: 'rgba(255,255,255,0.6)',
                '&.Mui-checked, &.MuiCheckbox-indeterminate': { color: BRAND.sage },
              }}
              icon={<CheckBoxOutlineBlank sx={{ fontSize: 20 }} />}
              checkedIcon={<CheckBoxOutlined sx={{ fontSize: 20 }} />}
              indeterminateIcon={<IndeterminateCheckBoxOutlined sx={{ fontSize: 20 }} />}
            />
            <Typography sx={{ fontFamily: FONT, fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
              {count} {plural} selected
            </Typography>
            {!allSelected && total > count && (
              <Typography
                component="span"
                onClick={onSelectAll}
                sx={{
                  fontFamily: FONT, fontSize: '0.78rem', fontWeight: 500,
                  color: 'rgba(255,255,255,0.6)',
                  cursor: 'pointer', whiteSpace: 'nowrap',
                  '&:hover': { color: '#fff', textDecoration: 'underline' },
                }}
              >
                · select all {total}
              </Typography>
            )}
          </Stack>

          {/* Actions */}
          <Stack direction="row" spacing={1} sx={{ flexShrink: 0, alignItems: 'center' }}>
            <Button
              onClick={onClear}
              disabled={deleting}
              disableRipple
              sx={{
                fontFamily: FONT, textTransform: 'none', fontWeight: 600, fontSize: '0.82rem',
                color: 'rgba(255,255,255,0.85)', px: 1.5, minWidth: 0,
                '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', color: '#fff' },
              }}
            >
              Clear
            </Button>
            <Button
              variant="contained"
              onClick={onRemove}
              disabled={deleting}
              disableElevation
              startIcon={<DeleteSweepOutlined sx={{ fontSize: 18 }} />}
              sx={{
                fontFamily: FONT, textTransform: 'none', fontWeight: 700, borderRadius: '10px',
                fontSize: '0.82rem', py: 0.75, px: 1.75,
                bgcolor: '#fff', color: BRAND.navy,
                '&:hover': { bgcolor: BRAND.sageSoft },
              }}
            >
              Remove
            </Button>
          </Stack>
        </Box>
      </Box>
    );
  }

  /* ── Idle state: nothing selected yet → quiet info strip ────────────── */
  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{
        position: 'sticky', top: 0, zIndex: 20,
        alignItems: 'center', justifyContent: 'space-between',
        mb: 1.5, px: 0.5, flexWrap: 'wrap', rowGap: 1, width: '100%',
      }}
    >
      <Typography sx={{ fontFamily: FONT, fontSize: '0.82rem', color: BRAND.muted, fontWeight: 500 }}>
        {total} {categoryLabel}
      </Typography>
      <Button
        onClick={onSelectAll}
        disableElevation
        startIcon={<CheckBoxOutlineBlank sx={{ fontSize: 18 }} />}
        sx={{
          fontFamily: FONT, textTransform: 'none', fontSize: '0.82rem', fontWeight: 700,
          borderRadius: '10px', px: 1.75, py: 0.7, ml: 'auto', flexShrink: 0,
          color: BRAND.ink, bgcolor: BRAND.surface,
          border: `1px solid ${BRAND.borderStrong}`,
          '&:hover': { bgcolor: BRAND.sageSoft, borderColor: BRAND.sage },
        }}
      >
        Select all {total}
      </Button>
    </Stack>
  );
}