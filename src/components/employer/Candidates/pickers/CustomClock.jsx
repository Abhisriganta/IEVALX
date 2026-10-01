

import React from 'react';
import { Box, Typography } from '@mui/material';

// Parse 'HH:mm' 24h → { hour12, minute, isPM }. Defaults to 9:00 AM.
function parse24h(hhmm) {
  if (!hhmm || typeof hhmm !== 'string') return { hour12: 9, minute: 0, isPM: false };
  const [hStr, mStr] = hhmm.split(':');
  let h = parseInt(hStr, 10);
  let m = parseInt(mStr, 10);
  if (isNaN(h)) h = 9;
  if (isNaN(m)) m = 0;
  const isPM = h >= 12;
  let hour12 = h % 12;
  if (hour12 === 0) hour12 = 12;
  return { hour12, minute: m, isPM };
}

// Format hour12 (1..12) + minute (0..59) + isPM → 'HH:mm' 24h
function format24h(hour12, minute, isPM) {
  let h;
  if (isPM) h = hour12 === 12 ? 12 : hour12 + 12;
  else      h = hour12 === 12 ? 0  : hour12;
  return `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

const HOURS   = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

// Quick-pick presets — most common interview times
const PRESETS = [
  { label: '9 AM',  h: 9,  m: 0, pm: false },
  { label: '12 PM', h: 12, m: 0, pm: true  },
  { label: '5 PM',  h: 5,  m: 0, pm: true  },
  { label: '6 PM',  h: 6,  m: 0, pm: true  },
];

// A scroll column (Hour or Minute).
function Column({ label, items, selected, onPick, formatItem }) {
  return (
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography sx={{
        fontSize: '9.5px', fontWeight: 700, color: '#6F7470',
        letterSpacing: '0.09em', textTransform: 'uppercase',
        mb: 0.5, textAlign: 'center',
      }}>
        {label}
      </Typography>
      <Box sx={{
        maxHeight: 156, overflowY: 'auto',
        border: '1px solid #E7EAE3', borderRadius: '8px',
        p: 0.5,
        // Sage scrollbar
        '&::-webkit-scrollbar': { width: 4 },
        '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
        '&::-webkit-scrollbar-thumb': { bgcolor: '#C7D9C5', borderRadius: 2 },
        scrollbarWidth: 'thin',
        scrollbarColor: '#C7D9C5 transparent',
      }}>
        {items.map(item => {
          const isSel = item === selected;
          return (
            <Box
              key={item}
              onClick={() => onPick(item)}
              sx={{
                py: 0.5, textAlign: 'center', borderRadius: '6px',
                cursor: 'pointer', userSelect: 'none',
                fontSize: '12.5px',
                fontWeight: isSel ? 700 : 500,
                color:   isSel ? '#FFFFFF' : '#022124',
                bgcolor: isSel ? '#7F9E7E' : 'transparent',
                transition: 'all 0.12s ease',
                '&:hover': isSel ? {} : { bgcolor: '#EDF3EC' },
              }}
            >
              {formatItem ? formatItem(item) : String(item).padStart(2, '0')}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

export default function CustomClock({ value, onChange }) {
  const { hour12, minute, isPM } = parse24h(value);

  const set = (h, m, pm) => onChange(format24h(h, m, pm));

  return (
    <Box sx={{ width: 240, p: 2 }}>
      {/* Live-updating display */}
      <Box sx={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'center',
        gap: 0.25, mb: 1.75,
        py: 1.5, px: 1,
        bgcolor: '#F6F8F3',
        borderRadius: '10px',
        border: '1px solid #E7EAE3',
      }}>
        <Typography sx={{
          fontFamily: "'Jost','DM Sans',sans-serif",
          fontSize: '32px', fontWeight: 600, color: '#022124',
          lineHeight: 1, letterSpacing: '-0.02em',
        }}>
          {String(hour12).padStart(2, '0')}
        </Typography>
        <Typography sx={{
          fontFamily: "'Jost','DM Sans',sans-serif",
          fontSize: '32px', fontWeight: 300, color: '#7F9E7E',
          lineHeight: 1,
        }}>
          :
        </Typography>
        <Typography sx={{
          fontFamily: "'Jost','DM Sans',sans-serif",
          fontSize: '32px', fontWeight: 600, color: '#022124',
          lineHeight: 1, letterSpacing: '-0.02em',
        }}>
          {String(minute).padStart(2, '0')}
        </Typography>
        <Typography sx={{
          fontFamily: "'Inter','DM Sans',sans-serif",
          fontSize: '13px', fontWeight: 700, color: '#6C8B6B',
          ml: 1,
        }}>
          {isPM ? 'PM' : 'AM'}
        </Typography>
      </Box>

      {/* Hour + Minute + AM/PM in 3 columns */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 1, mb: 1.5 }}>
        <Column
          label="Hour"
          items={HOURS}
          selected={hour12}
          onPick={(h) => set(h, minute, isPM)}
        />
        <Column
          label="Min"
          items={MINUTES}
          selected={minute}
          onPick={(m) => set(hour12, m, isPM)}
        />

        {/* AM/PM toggle */}
        <Box>
          <Typography sx={{
            fontSize: '9.5px', fontWeight: 700, color: '#6F7470',
            letterSpacing: '0.09em', textTransform: 'uppercase',
            mb: 0.5, textAlign: 'center',
          }}>
            Period
          </Typography>
          <Box sx={{
            display: 'flex', flexDirection: 'column', gap: 0.5,
            border: '1px solid #E7EAE3', borderRadius: '8px', p: 0.5,
          }}>
            {[
              { label: 'AM', val: false },
              { label: 'PM', val: true  },
            ].map(p => {
              const isSel = isPM === p.val;
              return (
                <Box
                  key={p.label}
                  onClick={() => set(hour12, minute, p.val)}
                  sx={{
                    py: 0.9, px: 1.75, textAlign: 'center', borderRadius: '6px',
                    cursor: 'pointer', userSelect: 'none',
                    fontSize: '11.5px', fontWeight: 700,
                    color:   isSel ? '#FFFFFF' : '#022124',
                    bgcolor: isSel ? '#7F9E7E' : 'transparent',
                    transition: 'all 0.12s ease',
                    '&:hover': isSel ? {} : { bgcolor: '#EDF3EC' },
                  }}
                >
                  {p.label}
                </Box>
              );
            })}
          </Box>
        </Box>
      </Box>

      {/* Quick-pick presets */}
      <Box>
        <Typography sx={{
          fontSize: '9.5px', fontWeight: 700, color: '#6F7470',
          letterSpacing: '0.09em', textTransform: 'uppercase', mb: 0.75,
        }}>
          Quick pick
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0.5 }}>
          {PRESETS.map(p => {
            const active = p.h === hour12 && p.m === minute && p.pm === isPM;
            return (
              <Box
                key={p.label}
                onClick={() => set(p.h, p.m, p.pm)}
                sx={{
                  py: 0.6, textAlign: 'center', borderRadius: '6px',
                  border: '1px solid',
                  borderColor: active ? '#7F9E7E' : '#E7EAE3',
                  cursor: 'pointer', userSelect: 'none',
                  fontSize: '10.5px', fontWeight: 700,
                  color: active ? '#FFFFFF' : '#6C8B6B',
                  bgcolor: active ? '#7F9E7E' : '#FFFFFF',
                  transition: 'all 0.12s ease',
                  '&:hover': active ? {} : {
                    bgcolor: '#EDF3EC', borderColor: '#C7D9C5',
                  },
                }}
              >
                {p.label}
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}