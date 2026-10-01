

import React, { useState, useRef } from 'react';
import { Box, Typography, Popover, Button } from '@mui/material';
import { CalendarMonth, AccessTime } from '@mui/icons-material';
import CustomCalendar from './CustomCalendar';
import CustomClock    from './CustomClock';

const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// 'YYYY-MM-DD' → 'dd/mm/yyyy' (e.g. '31/07/2026'). Falls back to null if invalid.
function formatDateDisplay(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
}

// Placeholder text for a date that isn't set yet — matches the display format
const DATE_PLACEHOLDER = 'dd/mm/yyyy';

// 'HH:mm' → '9:00 AM'
function formatTimeDisplay(timeStr) {
  if (!timeStr) return null;
  const parts = timeStr.split(':');
  if (parts.length < 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return null;
  const isPM = h >= 12;
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`;
}

export default function DateTimeField({
  label,
  mode = 'date',
  dateValue,
  timeValue,
  onDateChange,
  onTimeChange,
  placeholder = 'Select…',
  icon: IconOverride,
  disabled = false,
  error = false,
  sx = {},
}) {
  const anchorRef = useRef(null);
  const [open, setOpen] = useState(false);

  const handleOpen  = () => { if (!disabled) setOpen(true); };
  const handleClose = () => setOpen(false);

  // Compose display text — always show something so users know the format expected
  let displayText;
  let isPlaceholder = false;
  if (mode === 'date') {
    displayText = formatDateDisplay(dateValue);
    if (!displayText) { displayText = DATE_PLACEHOLDER; isPlaceholder = true; }
  } else if (mode === 'time') {
    displayText = formatTimeDisplay(timeValue);
    if (!displayText) { displayText = '--:-- --';       isPlaceholder = true; }
  } else {
    
    const d       = formatDateDisplay(dateValue);
    const t       = formatTimeDisplay(timeValue) || formatTimeDisplay('09:00');
    const dOut    = d || DATE_PLACEHOLDER;
    displayText   = `${dOut} · ${t}`;
    isPlaceholder = !d;   
  }
  const hasValue = !isPlaceholder;

  // Pick default icon
  const IconComponent = IconOverride || (mode === 'time' ? AccessTime : CalendarMonth);

  // date-only mode: auto-close on selection
  const handleDatePick = (newDate) => {
    onDateChange?.(newDate);
    if (mode === 'date') handleClose();
  };
  // time-only mode: stay open so user can adjust h/m/AM/PM freely
  const handleTimePick = (newTime) => {
    onTimeChange?.(newTime);
  };

  const borderColor =
    open   ? '#7F9E7E' :
    error  ? '#C08A5B' :
    '#E7EAE3';

  return (
    <Box sx={{ position: 'relative', flex: 1, minWidth: 0, ...sx }}>
      {/* Floating label */}
      {label && (
        <Typography sx={{
          position: 'absolute',
          top: -8, left: 10,
          bgcolor: '#FFFFFF', px: 0.75,
          fontSize: '11px',
          color: open ? '#6C8B6B' : error ? '#C08A5B' : '#6F7470',
          fontWeight: 600,
          letterSpacing: '0.02em',
          zIndex: 1, pointerEvents: 'none',
          transition: 'color 0.15s',
        }}>
          {label}
        </Typography>
      )}

      {/* Trigger — styled to look like a filled outlined input */}
      <Box
        ref={anchorRef}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={handleOpen}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            handleOpen();
          }
        }}
        sx={{
          height: 44,
          border: '1.5px solid',
          borderColor,
          borderRadius: '10px',
          bgcolor: disabled ? '#F6F8F3' : '#FFFFFF',
          padding: '0 12px 0 40px',
          display: 'flex',
          alignItems: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          position: 'relative',
          transition: 'all 0.15s ease',
          boxShadow: open ? '0 0 0 3px rgba(127,158,126,0.14)' : 'none',
          opacity: disabled ? 0.6 : 1,
          '&:hover': !disabled && !open ? {
            borderColor: '#A8ADA8',
          } : {},
          '&:focus-visible': {
            outline: 'none',
            borderColor: '#7F9E7E',
            boxShadow: '0 0 0 3px rgba(127,158,126,0.14)',
          },
        }}
      >
        <IconComponent sx={{
          position: 'absolute', left: 12,
          fontSize: 18, color: open ? '#6C8B6B' : '#6C8B6B',
        }} />
        <Typography sx={{
          flex: 1, minWidth: 0,
          fontSize: '13.5px',
          fontWeight: hasValue ? 500 : 400,
          color:      hasValue ? '#022124' : '#A8ADA8',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {displayText}
        </Typography>
        <Box sx={{
          color: '#6F7470', fontSize: '10px', ml: 0.5,
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.15s',
        }}>▾</Box>
      </Box>

      {/* Popover with the appropriate picker(s) */}
      <Popover
        open={open}
        onClose={handleClose}
        anchorEl={anchorRef.current}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              mt: 0.75,
              borderRadius: '12px',
              border: '1px solid #E7EAE3',
              boxShadow: '0 12px 32px rgba(2,33,36,0.12)',
              overflow: 'hidden',
              bgcolor: '#FFFFFF',
            },
          },
        }}
      >
        {mode === 'date' && (
          <CustomCalendar value={dateValue} onChange={handleDatePick} />
        )}
        {mode === 'time' && (
          <CustomClock value={timeValue || '09:00'} onChange={handleTimePick} />
        )}
        {mode === 'datetime' && (
          <Box>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' } }}>
              <CustomCalendar value={dateValue} onChange={handleDatePick} />
              <Box sx={{
                borderLeft: { xs: 'none', sm: '1px solid #E7EAE3' },
                borderTop:  { xs: '1px solid #E7EAE3', sm: 'none' },
              }}>
                <CustomClock value={timeValue || '09:00'} onChange={handleTimePick} />
              </Box>
            </Box>
            <Box sx={{
              display: 'flex', justifyContent: 'flex-end',
              gap: 1,
              px: 2, py: 1.25,
              borderTop: '1px solid #E7EAE3',
              bgcolor: '#F6F8F3',
            }}>
              <Button
                onClick={handleClose}
                size="small"
                sx={{
                  textTransform: 'none', color: '#6F7470',
                  fontSize: '12.5px', fontWeight: 500,
                  borderRadius: '8px', px: 1.5,
                  '&:hover': { bgcolor: 'rgba(2,33,36,0.05)', color: '#022124' },
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleClose}
                size="small"
                variant="contained"
                sx={{
                  bgcolor: '#7F9E7E', color: '#FFFFFF',
                  textTransform: 'none', fontWeight: 600,
                  fontSize: '12.5px', borderRadius: '8px', px: 2,
                  boxShadow: 'none',
                  '&:hover': { bgcolor: '#6C8B6B', boxShadow: 'none' },
                }}
              >
                Done
              </Button>
            </Box>
          </Box>
        )}
      </Popover>
    </Box>
  );
}