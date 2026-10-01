

import React, { useState, useMemo, useEffect } from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';

const MONTH_NAMES = [
  'January', 'February', 'March',     'April',   'May',      'June',
  'July',    'August',   'September', 'October', 'November', 'December',
];
const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// Parse 'YYYY-MM-DD' → { y, m, d } or null. Uses local time (no TZ shift).
function parseDateStr(s) {
  if (!s || typeof s !== 'string') return null;
  const parts = s.split('-');
  if (parts.length !== 3) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  return { y, m, d };
}

// Format { y, m, d } (m is 0-indexed) → 'YYYY-MM-DD'
function fmtDateStr(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// Build 42-cell month grid (6 rows × 7 cols, starts Sunday)
function buildGrid(year, month) {
  const firstDay      = new Date(year, month, 1);
  const startDayOfWk  = firstDay.getDay();          // 0..6, Sunday=0
  const daysInMonth   = new Date(year, month + 1, 0).getDate();
  const daysInPrev    = new Date(year, month, 0).getDate();

  const grid = [];
  // Trailing days of previous month
  for (let i = startDayOfWk - 1; i >= 0; i--) {
    const dayNum = daysInPrev - i;
    const py = month === 0 ? year - 1 : year;
    const pm = month === 0 ? 11 : month - 1;
    grid.push({ y: py, m: pm, d: dayNum, inMonth: false });
  }
  // This month
  for (let d = 1; d <= daysInMonth; d++) {
    grid.push({ y: year, m: month, d, inMonth: true });
  }
  // Leading days of next month
  let leftover = 42 - grid.length;
  let ny = month === 11 ? year + 1 : year;
  let nm = month === 11 ? 0 : month + 1;
  for (let d = 1; d <= leftover; d++) {
    grid.push({ y: ny, m: nm, d, inMonth: false });
  }
  return grid;
}

export default function CustomCalendar({ value, onChange }) {
  const parsed = parseDateStr(value);
  const now    = new Date();
  const todayStr = fmtDateStr(now.getFullYear(), now.getMonth(), now.getDate());

  // View month/year — start on selected value if present, else today
  const [viewY, setViewY] = useState(parsed ? parsed.y : now.getFullYear());
  const [viewM, setViewM] = useState(parsed ? parsed.m : now.getMonth());

  // If the parent value changes to a different month, follow it (opening the
  // picker on an already-set field lands you on that month).
  useEffect(() => {
    if (parsed && (parsed.y !== viewY || parsed.m !== viewM)) {
      setViewY(parsed.y);
      setViewM(parsed.m);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const grid = useMemo(() => buildGrid(viewY, viewM), [viewY, viewM]);
  const selectedStr = parsed ? fmtDateStr(parsed.y, parsed.m, parsed.d) : null;

  const goPrevMonth = () => {
    if (viewM === 0) { setViewM(11); setViewY(y => y - 1); }
    else             { setViewM(m => m - 1); }
  };
  const goNextMonth = () => {
    if (viewM === 11) { setViewM(0); setViewY(y => y + 1); }
    else              { setViewM(m => m + 1); }
  };

  const handlePick = (cell) => {
    onChange(fmtDateStr(cell.y, cell.m, cell.d));
  };
  const handleToday = () => {
    setViewY(now.getFullYear());
    setViewM(now.getMonth());
    onChange(todayStr);
  };
  const handleClear = () => {
    onChange('');
  };

  return (
    <Box sx={{ width: 280, p: 2 }}>
      {/* Header: month/year + nav */}
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        mb: 1.5,
      }}>
        <IconButton
          size="small"
          onClick={goPrevMonth}
          sx={{
            color: '#6C8B6B', width: 28, height: 28,
            '&:hover': { bgcolor: '#EDF3EC' },
          }}
        >
          <ChevronLeft fontSize="small" />
        </IconButton>
        <Typography sx={{
          fontFamily: "'Jost','DM Sans',sans-serif",
          fontSize: '14px', fontWeight: 600, color: '#022124',
          letterSpacing: '-0.005em',
        }}>
          {MONTH_NAMES[viewM]} {viewY}
        </Typography>
        <IconButton
          size="small"
          onClick={goNextMonth}
          sx={{
            color: '#6C8B6B', width: 28, height: 28,
            '&:hover': { bgcolor: '#EDF3EC' },
          }}
        >
          <ChevronRight fontSize="small" />
        </IconButton>
      </Box>

      {/* Day-of-week header */}
      <Box sx={{
        display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 0.25, mb: 0.5,
      }}>
        {DAY_NAMES.map(name => (
          <Typography key={name} sx={{
            fontSize: '10px', fontWeight: 700, color: '#6F7470',
            textAlign: 'center', letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}>
            {name}
          </Typography>
        ))}
      </Box>

      {/* Day cells */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.25 }}>
        {grid.map((cell, i) => {
          const cellStr = fmtDateStr(cell.y, cell.m, cell.d);
          const isToday    = cellStr === todayStr;
          const isSelected = cellStr === selectedStr;

          return (
            <Box
              key={i}
              onClick={() => handlePick(cell)}
              sx={{
                aspectRatio: '1 / 1',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12.5px',
                fontWeight: isSelected ? 700 : isToday ? 600 : 500,
                color:   !cell.inMonth ? '#CDD4CC'
                       : isSelected    ? '#FFFFFF'
                       : isToday       ? '#6C8B6B'
                       : '#022124',
                bgcolor: isSelected ? '#7F9E7E' : 'transparent',
                border: isToday && !isSelected
                  ? '1.5px solid #7F9E7E'
                  : '1.5px solid transparent',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.12s ease',
                userSelect: 'none',
                '&:hover': !isSelected ? { bgcolor: '#EDF3EC' } : {},
              }}
            >
              {cell.d}
            </Box>
          );
        })}
      </Box>

      {/* Footer: Clear + Today */}
      <Box sx={{
        display: 'flex', justifyContent: 'space-between',
        mt: 1.5, pt: 1.5, borderTop: '1px solid #E7EAE3',
      }}>
        <Box
          onClick={handleClear}
          sx={{
            fontSize: '11.5px', fontWeight: 600, color: '#6F7470',
            cursor: 'pointer', px: 1, py: 0.5, borderRadius: '6px',
            userSelect: 'none',
            '&:hover': { bgcolor: '#F6F8F3', color: '#022124' },
          }}
        >
          Clear
        </Box>
        <Box
          onClick={handleToday}
          sx={{
            fontSize: '11.5px', fontWeight: 700, color: '#6C8B6B',
            cursor: 'pointer', px: 1, py: 0.5, borderRadius: '6px',
            userSelect: 'none',
            '&:hover': { bgcolor: '#EDF3EC' },
          }}
        >
          Today
        </Box>
      </Box>
    </Box>
  );
}