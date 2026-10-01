import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Paper, Typography, Stack, Avatar, Button, IconButton,
  Container, Skeleton, Alert, Snackbar, Chip, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, Tooltip,
  Divider,
} from '@mui/material';
import {
  ArrowBackRounded, AccessTimeRounded, PersonOutlineRounded,
  CheckCircleOutlined, EventOutlined, EventBusyRounded, LinkOffRounded,
 ArrowForwardRounded, CalendarMonthOutlined,
  RefreshRounded, CloseRounded, ChevronLeftRounded, ChevronRightRounded,
  CheckCircleRounded, VerifiedOutlined, DescriptionOutlined,
  WbSunnyRounded, NightlightRounded, WbTwilightRounded, WarningAmberRounded,
} from '@mui/icons-material';

import smartInterviewService from '@/services/api/jobseeker/smartInterviewService';


const C = {
  sage:       '#7F9E7E',
  sageDark:   '#6C8B6B',
  sageSoft:   '#EDF3EC',
  sageText:   '#5E815D',
  pine:       '#022124',
  pine2:      '#24433E',
  cream:      '#F6F8F3',
  creamSoft:  '#FAFBF8',
  white:      '#FFFFFF',
  ink:        '#1F1F1F',
  muted:      '#6F7470',
  faint:      '#B9BEB4',
  line:       '#E7EAE3',
  lineStrong: '#D8DDD4',
  amber:      '#A35A2D',
  amberSoft:  '#FBF0E7',
  gold:       '#C99A4A',
  done:       '#3E6E3E',
  doneSoft:   '#EAF2E9',
  danger:     '#A63D2F',
  dangerSoft: '#FAEAE8',
};
const FONT = "'Jost','DM Sans',sans-serif";



const AVATAR_COLORS = ['#7F9E7E','#5E7F9E','#9E7F7E','#8B7F9E','#7E9E93','#9E937E','#6C8B6B','#3C5A78'];

/* ═══════════════════════════════════════════════════════════════════════════
   Helpers
═══════════════════════════════════════════════════════════════════════════ */
const initials = (name = '') =>
  String(name).split(/[\s.]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '—';

const avatarColorFor = (str = '') => {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
};

const parseISO = (v) => { if (!v) return null; try { const d = new Date(v); return Number.isNaN(d.getTime()) ? null : d; } catch { return null; } };
const fmtMon        = (d) => d?.toLocaleDateString('en-IN', { month: 'short', timeZone: 'Asia/Kolkata' }) || '—';
const fmtWeekday    = (d) => d?.toLocaleDateString('en-IN', { weekday: 'short', timeZone: 'Asia/Kolkata' }) || '';
const fmtLongMon    = (d) => d?.toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' }) || '—';
const fmtFullDate   = (d) => d?.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' }) || '—';
const fmtDateTime   = (d) => d?.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) || '—';
const fmtWeekdayDT  = (d) => d?.toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) || '—';

// Day-of-month in IST — replaces `d.getDate()` which uses browser-local TZ.
const istDay = (d) => d ? new Intl.DateTimeFormat('en-IN', { day: 'numeric', timeZone: 'Asia/Kolkata' }).format(d) : '—';

const slotDateKey = (slot) => {
  if (slot.date) return slot.date;
  const startIso = slot.window_start || slot.start_at;
  if (!startIso) return 'unknown';
  const d = parseISO(startIso);
  if (!d) return 'unknown';
  // Format the date part in IST (not UTC) so groupings match the slot's IST day.
  return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Kolkata' }).format(d);
};
const slotStart = (slot) => {
  if (slot.window_start) return parseISO(slot.window_start);
  if (slot.start_at)     return parseISO(slot.start_at);
  if (slot.date && slot.start_time) return parseISO(`${slot.date}T${slot.start_time}+05:30`);
  return null;
};
const linkExpiryUrgent = (iso) => {
  const d = parseISO(iso);
  if (!d) return false;
  const ms = d.getTime() - Date.now();
  return ms > 0 && ms < 24 * 60 * 60 * 1000;
};


const timeOfDay = (start) => {
  if (!start) return { label: 'Time', Icon: AccessTimeRounded, color: C.pine };
  const h = start.getHours();
  if (h < 5)  return { label: 'Late Night', Icon: NightlightRounded, color: '#3C5A78' };
  if (h < 12) return { label: 'Morning',    Icon: WbSunnyRounded,    color: C.gold };
  if (h < 17) return { label: 'Afternoon',  Icon: WbSunnyRounded,    color: '#C97B4A' };
  if (h < 20) return { label: 'Evening',    Icon: WbTwilightRounded, color: '#8A6A1F' };
  return { label: 'Night', Icon: NightlightRounded, color: '#3C5A78' };
};


const refFromToken = (token = '') => {
  const clean = String(token).replace(/[^a-f0-9]/gi, '');
  if (!clean) return 'IVX-XXXX';
  return `IVX-${clean.slice(0, 6).toUpperCase()}`;
};


const dayKey = (d) => {
  if (!d) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const addMonths    = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);
const sameMonth    = (a, b) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();


const buildMonthGrid = (anchor) => {
  const first = startOfMonth(anchor);
 
  const startWeekday = (first.getDay() + 6) % 7;
  const startDate = new Date(first);
  startDate.setDate(1 - startWeekday);
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    cells.push(d);
  }
  return cells;
};

/* ═══════════════════════════════════════════════════════════════════════════
   Eyebrow — bracket-corner label from the landing primitives.
═══════════════════════════════════════════════════════════════════════════ */
function Eyebrow({ children }) {
  return (
    <Box sx={{ display: 'inline-block' }}>
      <Box component="span" sx={{ position: 'relative', display: 'inline-block', p: '8px 14px' }}>
        <Box component="span" sx={{
          position: 'absolute', left: 0, top: 0, width: 14, height: 14,
          borderLeft: `1.5px solid ${C.sage}`, borderTop: `1.5px solid ${C.sage}`,
        }} />
        <Box component="span" sx={{
          position: 'absolute', right: 0, bottom: 0, width: 14, height: 14,
          borderRight: `1.5px solid ${C.sage}`, borderBottom: `1.5px solid ${C.sage}`,
        }} />
        <Typography component="span" sx={{
          fontFamily: FONT, fontSize: 12, fontWeight: 700,
          letterSpacing: '2.5px', textTransform: 'uppercase',
          color: C.sageDark, lineHeight: 1, whiteSpace: 'nowrap',
        }}>
          {children}
        </Typography>
      </Box>
    </Box>
  );
}


function SageButton({ children, onClick, startIcon, endIcon, disabled, sx = {}, fullWidth = false }) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      disableElevation
      fullWidth={fullWidth}
      sx={{
        position: 'relative', overflow: 'hidden',
        fontFamily: FONT, textTransform: 'none',
        bgcolor: C.sage, color: '#fff',
        borderRadius: '999px', px: 3.25, py: 0,
        height: 48, minWidth: 0, lineHeight: 1,
        fontSize: 14.5, fontWeight: 600,
        '& .MuiButton-startIcon, & .MuiButton-endIcon, & .sage-btn-label': {
          position: 'relative', zIndex: 2, color: '#fff',
          transition: 'color .45s cubic-bezier(0.22,1,0.36,1)',
        },
        '&::before': {
          content: '""', position: 'absolute', zIndex: 1,
          left: '100%', top: '100%',
          width: 560, height: 560, ml: '-280px', mt: '-280px',
          borderRadius: '50%', bgcolor: C.ink,
          transform: 'scale(0)', transformOrigin: 'center',
          transition: 'transform .45s cubic-bezier(0.22,1,0.36,1)',
        },
        '&:hover': { bgcolor: C.sage },
        '&:hover::before': { transform: 'scale(1)' },
        '&.Mui-disabled': { bgcolor: C.sageSoft, color: C.muted },
        ...sx,
      }}
    >
      {startIcon}
      <Box component="span" className="sage-btn-label" sx={{ display: 'inline-flex', alignItems: 'center' }}>
        {children}
      </Box>
      {endIcon}
    </Button>
  );
}

function Shell({ children, onBack, embedded }) {
  return (
    <Box sx={{
      bgcolor: embedded ? 'transparent' : C.cream,
      minHeight: embedded ? 'auto' : '100vh',
      fontFamily: FONT, pb: 6,
      '& .MuiTypography-root, & .MuiButton-root, & .MuiChip-root, & .MuiInputBase-root, & .MuiMenuItem-root': {
        fontFamily: FONT,
      },
    }}>
      <Container maxWidth="lg" sx={{ pt: { xs: 2, md: 3 } }}>
        <Button
          onClick={onBack}
          startIcon={<ArrowBackRounded sx={{ fontSize: 18 }} />}
          sx={{
            textTransform: 'none', color: C.muted, fontWeight: 600, fontFamily: FONT,
            fontSize: '0.85rem', mb: 2, borderRadius: '10px', px: 1.25, py: 0.5,
            '&:hover': { bgcolor: C.sageSoft, color: C.pine },
          }}
        >
          Back
        </Button>

        {children}
      </Container>
    </Box>
  );
}

function FormalNoticeHero({ data, token }) {
  const companyName = data?.company_name || 'Company';
  const jobTitle    = data?.job_title    || 'Interview';
  const candidateName  = data?.candidate_name || null;
  const candidateEmail = data?.candidate_email || null;
  const expires        = parseISO(data?.expires_at);
  const urgent         = linkExpiryUrgent(data?.expires_at);
  const duration       = data?.duration_mins || data?.round_duration_mins;
  const ref            = refFromToken(token);
  const logoUrl        = data?.company_logo || data?.company_logo_url;
  const avatarBg       = avatarColorFor(companyName);
  const roundLabel     = data?.round_name || 'Live Interview';

  return (
    <Paper elevation={0} sx={{
      position: 'relative', overflow: 'hidden',
      bgcolor: '#fff',
      border: `1px solid ${C.line}`,
      borderRadius: '18px',
      boxShadow: '0 4px 16px rgba(2,33,36,0.05)',
      mb: 3,
    }}>
     
      <Box aria-hidden="true" sx={{
        position: 'absolute', top: -30, right: -30,
        width: 210, height: 210, borderRadius: '50%',
        border: `1.5px solid ${C.sageSoft}`,
        pointerEvents: 'none',
        '&::before, &::after': {
          content: '""', position: 'absolute',
          borderRadius: '50%', border: `1.5px solid ${C.sageSoft}`,
        },
        '&::before': { inset: 22 },
        '&::after':  { inset: 44 },
      }} />

      {/* ── LETTERHEAD ROW ─────────────────────────────────────────────── */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{
          alignItems: { sm: 'center' }, justifyContent: 'space-between',
          px: { xs: 2.5, md: 4 }, py: { xs: 2, md: 2.25 },
          borderBottom: `1px solid ${C.line}`,
          position: 'relative',
        }}
      >
        {/* iEvalx wordmark — IE tile + name + Interview Booking caption */}
        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
          <Box sx={{
            width: 36, height: 36, borderRadius: '9px',
            bgcolor: C.pine, color: '#BED58F',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: FONT, fontSize: 13, fontWeight: 800, letterSpacing: '-0.5px',
          }}>
            IE
          </Box>
          <Box>
            <Typography sx={{
              fontFamily: FONT, fontSize: 15, fontWeight: 800,
              color: C.pine, lineHeight: 1,
            }}>
              iEvalx
            </Typography>
            <Typography sx={{
              fontFamily: FONT, fontSize: 9.5, fontWeight: 700,
              letterSpacing: '1.8px', textTransform: 'uppercase',
              color: C.muted, mt: 0.5,
            }}>
              Interview Booking
            </Typography>
          </Box>
        </Stack>

    
        <Box sx={{
          alignSelf: { xs: 'flex-start', sm: 'center' },
          fontFamily: FONT, fontSize: 10.5, fontWeight: 800,
          letterSpacing: '2px', textTransform: 'uppercase',
          color: C.sageText,
          border: `1.5px solid ${C.sage}`,
          borderRadius: '9px',
          px: 1.5, py: 0.75,
          whiteSpace: 'nowrap',
        }}>
          Official Invite
        </Box>
      </Stack>

      {/* ── BODY ───────────────────────────────────────────────────────── */}
      <Box sx={{ px: { xs: 2.5, md: 4 }, py: { xs: 2.75, md: 3.25 }, position: 'relative' }}>
       
        {(candidateName || candidateEmail) && (
          <Typography sx={{
            fontFamily: FONT, fontSize: '0.82rem', fontWeight: 600,
            color: C.muted, mb: 1.75,
          }}>
            To:{' '}
            {candidateName && (
              <Box component="span" sx={{ color: C.ink, fontWeight: 700 }}>
                {candidateName}
              </Box>
            )}
            {candidateName && candidateEmail && (
              <Box component="span" sx={{ mx: 0.75, color: C.faint }}>·</Box>
            )}
            {candidateEmail && (
              <Box component="span" sx={{ color: C.muted }}>
                {candidateEmail}
              </Box>
            )}
          </Typography>
        )}

        
        <Typography component="p" sx={{
          fontFamily: FONT, fontSize: { xs: '1.05rem', md: '1.25rem' },
          fontWeight: 500, lineHeight: 1.5, color: C.ink,
          letterSpacing: '-0.005em',
          maxWidth: 820,
          pr: { xs: 0, md: 6 },  /* keeps the sentence clear of the watermark */
        }}>
          <Box component="span" sx={{ fontWeight: 800 }}>{companyName}</Box>
          {' has invited you to book a '}
          <Box component="span" sx={{ fontWeight: 700 }}>{roundLabel.toLowerCase()}</Box>
          {' for the '}
          <Box component="span" sx={{
            fontWeight: 800, color: C.sageText,
            borderBottom: `3px solid ${C.sageSoft}`,
            pb: '1px',
          }}>
            {jobTitle}
          </Box>
          {' position. Choose a time that works for you below.'}
        </Typography>

       
       <Stack
          direction="row"
          spacing={1.5}
          sx={{
            alignItems: 'center', mt: 2.5,
            display: { xs: 'flex', md: 'flex' },
          }}
        >
          <Avatar
            src={logoUrl || undefined}
            alt={companyName}
            sx={{
              width: 38, height: 38, flexShrink: 0,
              bgcolor: avatarBg, color: '#fff',
              fontFamily: FONT, fontSize: 13, fontWeight: 800,
              border: `1px solid ${C.line}`,
            }}
          >
            {initials(companyName)}
          </Avatar>
          <Box>
            <Typography sx={{
              fontFamily: FONT, fontSize: '0.82rem', fontWeight: 800,
              color: C.ink, lineHeight: 1.2,
            }}>
              {companyName}
            </Typography>
            <Stack direction="row" spacing={0.6} sx={{ alignItems: 'center', mt: 0.25 }}>
              <VerifiedOutlined sx={{ fontSize: 12, color: C.sageDark }} />
              <Typography sx={{
                fontFamily: FONT, fontSize: '0.68rem', fontWeight: 700,
                letterSpacing: '1.4px', textTransform: 'uppercase', color: C.sageText,
              }}>
                Verified Employer
              </Typography>
            </Stack>
          </Box>
        </Stack>
      </Box>

      {/* ── FOOTER STRIP ───────────────────────────────────────────────── */}
      <Box sx={{
        display: 'flex', flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between', alignItems: { sm: 'center' },
        gap: 1,
        px: { xs: 2.5, md: 4 }, py: { xs: 1.5, md: 1.75 },
        bgcolor: C.creamSoft,
        borderTop: `1px solid ${C.line}`,
      }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.5 }}>
      
          <Box component="span" sx={{
            width: 7, height: 7, borderRadius: '50%', bgcolor: C.done,
            '@keyframes noticePulse': {
              '0%,100%': { opacity: 1, transform: 'scale(1)' },
              '50%':     { opacity: 0.4, transform: 'scale(0.75)' },
            },
            animation: 'noticePulse 1.8s ease-in-out infinite',
          }} />
          <Typography sx={{
            fontFamily: FONT, fontSize: '0.78rem', fontWeight: 700,
            color: C.muted,
          }}>
            Ref <Box component="span" sx={{ color: C.ink, fontWeight: 800 }}>#{ref}</Box>
            {' · '}{roundLabel}
            {duration ? ` · ${duration} minutes` : ''}
          </Typography>
        </Stack>

        {expires && (
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
            <EventOutlined sx={{ fontSize: 14, color: urgent ? C.amber : C.muted }} />
            <Typography sx={{
              fontFamily: FONT, fontSize: '0.78rem', fontWeight: 700,
              color: urgent ? C.amber : C.muted,
            }}>
              Expires {fmtWeekdayDT(expires)}
            </Typography>
          </Stack>
        )}
      </Box>
    </Paper>
  );
}


function SlotCountStrip({ slotCount, data }) {
  const urgent = linkExpiryUrgent(data?.expires_at);
  const limited = data?.slots_limited && slotCount > 0;
  const showWarn = urgent || limited;

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      sx={{ alignItems: { sm: 'center' }, mb: 2.5 }}
    >
      <Box sx={{
        display: 'inline-flex', alignItems: 'center', gap: 0.75,
        px: 1.5, py: 0.75, borderRadius: 999,
        bgcolor: C.sageSoft,
        border: `1px solid rgba(127,158,126,0.35)`,
        alignSelf: 'flex-start',
      }}>
        <CalendarMonthOutlined sx={{ fontSize: 15, color: C.sageDark }} />
        <Typography sx={{
          fontFamily: FONT, fontSize: '0.78rem', fontWeight: 800,
          color: C.sageText, letterSpacing: '0.02em',
        }}>
          {slotCount} {slotCount === 1 ? 'slot' : 'slots'} available
        </Typography>
      </Box>

      {showWarn && (
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
          <WarningAmberRounded sx={{ fontSize: 15, color: C.amber }} />
          <Typography sx={{
            fontFamily: FONT, fontSize: '0.78rem', fontWeight: 700, color: C.amber,
          }}>
            {limited && urgent
              ? 'Only a few slots left — book before the link expires.'
              : limited
              ? 'Only a few slots left — book one soon to confirm.'
              : `Link expires ${fmtDateTime(parseISO(data?.expires_at))}`}
          </Typography>
        </Stack>
      )}
    </Stack>
  );
}

function MonthCalendar({ month, onMonthChange, slotDayKeys, slotCountByKey, selectedKey, onSelect, expiresAt }) {
  const cells = useMemo(() => buildMonthGrid(month), [month]);
  const today = new Date();
  const todayKey = dayKey(today);
  const activeMonth = startOfMonth(month);

  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const expiryDate = parseISO(expiresAt);
  const dayAfterExpiry = expiryDate
    ? new Date(expiryDate.getFullYear(), expiryDate.getMonth(), expiryDate.getDate() + 1)
    : null;

  const canGoBack = true;     
  const canGoFwd  = true;

  const weekdayLabels = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  return (
    <Paper elevation={0} sx={{
      bgcolor: '#fff',
      border: `1px solid ${C.line}`,
      borderRadius: '16px',
      p: { xs: 2, md: 2.5 },
      boxShadow: '0 4px 14px rgba(2,33,36,0.04)',
    }}>
      {/* Month header — prev / label / next */}
      <Stack direction="row" sx={{
        justifyContent: 'space-between', alignItems: 'center', mb: 2,
      }}>
        <IconButton
          size="small"
          onClick={() => canGoBack && onMonthChange(addMonths(month, -1))}
          disabled={!canGoBack}
          sx={{
            width: 32, height: 32, borderRadius: '9px',
            border: `1px solid ${C.line}`, color: C.muted,
            '&:hover': { bgcolor: C.sageSoft, color: C.pine, borderColor: C.sage },
          }}
        >
          <ChevronLeftRounded sx={{ fontSize: 18 }} />
        </IconButton>

        <Typography sx={{
          fontFamily: FONT, fontSize: '1rem', fontWeight: 800,
          color: C.ink, letterSpacing: '-0.01em',
        }}>
          {fmtLongMon(activeMonth)}
        </Typography>

        <IconButton
          size="small"
          onClick={() => canGoFwd && onMonthChange(addMonths(month, 1))}
          disabled={!canGoFwd}
          sx={{
            width: 32, height: 32, borderRadius: '9px',
            border: `1px solid ${C.line}`, color: C.muted,
            '&:hover': { bgcolor: C.sageSoft, color: C.pine, borderColor: C.sage },
          }}
        >
          <ChevronRightRounded sx={{ fontSize: 18 }} />
        </IconButton>
      </Stack>

      {/* Weekday header */}
      <Box sx={{
        display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 0.5, mb: 0.5,
      }}>
        {weekdayLabels.map((w) => (
          <Typography key={w} sx={{
            fontFamily: FONT, fontSize: 10.5, fontWeight: 800,
            letterSpacing: '0.5px', textTransform: 'uppercase',
            color: C.muted, textAlign: 'center', py: 0.75,
          }}>
            {w}
          </Typography>
        ))}
      </Box>

      {/* Day grid */}
      <Box sx={{
        display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5,
      }}>
        {cells.map((d) => {
          const key = dayKey(d);
          const inMonth   = sameMonth(d, activeMonth);
          
          const isPast    = d < todayStart;
          const isExpired = dayAfterExpiry && d >= dayAfterExpiry;
          const isBlocked = isPast || isExpired;

          const hasSlots   = slotDayKeys.has(key);
          const slotCount  = slotCountByKey?.get(key) || 0;
          const isSelected = selectedKey === key;
          const isToday    = key === todayKey;

       
          const clickable = hasSlots && !isBlocked;

          let tooltipText = '';
          if (isPast)          tooltipText = 'Past date';
          else if (isExpired)  tooltipText = 'After this invite expires';
          else if (hasSlots)   tooltipText = `${slotCount} slot${slotCount === 1 ? '' : 's'} available`;
          else if (isToday)    tooltipText = 'Today';

          const cellNode = (
            <Box
              onClick={() => {
                if (clickable) onSelect(key);
              }}
              role={clickable ? 'button' : undefined}
              tabIndex={clickable ? 0 : -1}
              aria-disabled={isBlocked || undefined}
              onKeyDown={(e) => {
                if (clickable && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onSelect(key);
                }
              }}
              sx={{
                position: 'relative',
                aspectRatio: '1',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                borderRadius: '11px',
                fontFamily: FONT, fontSize: 13.5,
                fontWeight: isSelected || hasSlots ? 800 : 600,
                cursor: clickable ? 'pointer' : (isBlocked ? 'not-allowed' : 'default'),
                userSelect: 'none',
                transition: 'all 0.18s ease',
                outline: 'none',

             
                ...(!inMonth && { color: C.faint }),
                ...(inMonth && !hasSlots && { color: C.ink }),
                ...(hasSlots && !isSelected && !isBlocked && {
                  color: C.ink,
                  bgcolor: C.sageSoft,
                  border: `1px solid transparent`,
                }),
                ...(isSelected && !isBlocked && {
                  bgcolor: C.pine,
                  color: '#fff',
                  boxShadow: '0 4px 12px rgba(2,33,36,0.25)',
                }),
                ...(isToday && !isSelected && !isBlocked && {
                  border: `1.5px solid ${C.pine}`,
                }),
                ...(isPast && {
                  color: C.faint,
                  opacity: 0.55,
                  bgcolor: 'transparent',
                  border: 'none',
                  boxShadow: 'none',
                  textDecoration: 'line-through',
                  textDecorationColor: 'rgba(111,116,112,0.4)',
                  textDecorationThickness: '1.5px',
                }),
                ...(isExpired && !isPast && {
                  color: C.amber,
                  opacity: 0.55,
                  bgcolor: 'transparent',
                  border: `1px dashed rgba(163,90,45,0.28)`,
                  boxShadow: 'none',
                }),

                '&:hover': clickable && !isSelected ? {
                  bgcolor: C.sage, color: '#fff',
                } : (isBlocked ? {
                  
                  bgcolor: isPast ? 'rgba(111,116,112,0.06)' : 'rgba(163,90,45,0.06)',
                } : {}),
                '&:focus-visible': {
                  boxShadow: `0 0 0 2px ${C.sage}`,
                },
              }}
            >
              {d.getDate()}
           
              {hasSlots && !isBlocked && (
                <Box component="span" sx={{
                  position: 'absolute', bottom: 5,
                  width: 4, height: 4, borderRadius: '50%',
                  bgcolor: isSelected ? '#BED58F' : C.sage,
                }} />
              )}
            </Box>
          );

       
          return tooltipText ? (
            <Tooltip
              key={key}
              title={tooltipText}
              arrow placement="top"
              enterDelay={200}
              disableInteractive
            >
              <Box component="span" sx={{ display: 'block', minWidth: 0 }}>
                {cellNode}
              </Box>
            </Tooltip>
          ) : (
            <React.Fragment key={key}>{cellNode}</React.Fragment>
          );
        })}
      </Box>

    
      <Stack direction="row" spacing={2} sx={{
        mt: 2, pt: 1.75, borderTop: `1px solid ${C.line}`,
        flexWrap: 'wrap', rowGap: 0.9,
      }}>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
          <Box sx={{ width: 12, height: 12, borderRadius: '4px', bgcolor: C.sageSoft, border: `1px solid ${C.sage}` }} />
          <Typography sx={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: C.muted }}>
            Has slots
          </Typography>
        </Stack>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
          <Box sx={{ width: 12, height: 12, borderRadius: '4px', bgcolor: C.pine }} />
          <Typography sx={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: C.muted }}>
            Selected
          </Typography>
        </Stack>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
          <Box sx={{ width: 12, height: 12, borderRadius: '4px', bgcolor: '#fff', border: `1.5px solid ${C.pine}` }} />
          <Typography sx={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: C.muted }}>
            Today
          </Typography>
        </Stack>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
          <Box sx={{
            width: 12, height: 12, borderRadius: '4px',
            bgcolor: 'rgba(111,116,112,0.10)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Box sx={{ width: 8, height: '1.5px', bgcolor: C.muted, opacity: 0.55 }} />
          </Box>
          <Typography sx={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: C.muted }}>
            Past
          </Typography>
        </Stack>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
          <Box sx={{
            width: 12, height: 12, borderRadius: '4px',
            border: `1px dashed rgba(163,90,45,0.5)`,
            bgcolor: 'rgba(163,90,45,0.06)',
          }} />
          <Typography sx={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: C.muted }}>
            After expiry
          </Typography>
        </Stack>
      </Stack>
    </Paper>
  );
}

function TimeSlotRow({ slot, onSelect, disabled }) {
  const start = slotStart(slot);
  const timeText = slot.time_display || `${slot.start_time} – ${slot.end_time}`;
  const interviewerName =
    slot.interviewer_name
    || slot.interviewer?.first_name
    || slot.interviewer?.email
    || 'Interviewer to be assigned';
  
  const bookable = slot.is_bookable !== false && !disabled;
  const tod = timeOfDay(start);
  const TodIcon = tod.Icon;

  return (
    <Paper
      elevation={0}
      onClick={() => bookable && onSelect(slot)}
      role={bookable ? 'button' : undefined}
      tabIndex={bookable ? 0 : -1}
      onKeyDown={(e) => { if (bookable && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onSelect(slot); } }}
      sx={{
        cursor: bookable ? 'pointer' : 'not-allowed',
        bgcolor: '#fff',
        border: `1px solid ${C.line}`,
        borderRadius: '14px',
        px: { xs: 1.75, md: 2.25 }, py: { xs: 1.5, md: 1.75 },
        mb: 1.5,
        opacity: bookable ? 1 : 0.55,
        outline: 'none',
        transition: 'all 0.22s ease',
        '&:focus-visible': { boxShadow: `0 0 0 2px ${C.sage}` },
        '&:hover': bookable ? {
          borderColor: C.sage,
          bgcolor: C.sageSoft,
          transform: 'translateX(4px)',
          boxShadow: '0 6px 18px rgba(2,33,36,0.06)',
        } : {},
        '&:hover .book-pill': bookable ? {
          bgcolor: C.sage, color: '#fff',
        } : {},
        '&:hover .book-pill .arrow': bookable ? {
          transform: 'translateX(3px)',
        } : {},
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={{ xs: 1.25, sm: 2 }}
        sx={{ alignItems: { sm: 'center' } }}
      >
        {/* Time-of-day badge (compact) */}
        <Box sx={{
          alignSelf: { xs: 'flex-start', sm: 'auto' },
          display: 'inline-flex', alignItems: 'center', gap: 0.5,
          px: 0.9, py: 0.4, borderRadius: 999,
          bgcolor: C.cream, border: `1px solid ${C.line}`,
          flexShrink: 0,
        }}>
          <TodIcon sx={{ fontSize: 13, color: tod.color }} />
          <Typography sx={{
            fontFamily: FONT, fontSize: 10, fontWeight: 800,
            color: tod.color, letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            {tod.label}
          </Typography>
        </Box>

        {/* Time — the primary content */}
        <Typography sx={{
          fontFamily: FONT, fontSize: { xs: '1.05rem', md: '1.15rem' },
          fontWeight: 800, color: C.ink, letterSpacing: '-0.01em',
          minWidth: { sm: 170 }, whiteSpace: 'nowrap',
        }}>
          {timeText}
        </Typography>

        {/* Meta cluster */}
        <Stack
          direction="row"
          spacing={2}
          sx={{
            alignItems: 'center', flexWrap: 'wrap', rowGap: 0.5,
            flex: '1 1 auto', minWidth: 0,
          }}
        >
          <Tooltip title={interviewerName} arrow placement="top" enterDelay={400}>
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', minWidth: 0 }}>
              <PersonOutlineRounded sx={{ fontSize: 15, color: C.muted, flexShrink: 0 }} />
              <Typography sx={{
                fontFamily: FONT, fontSize: '0.8rem', color: C.muted, fontWeight: 600,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160,
              }}>
                {interviewerName}
              </Typography>
            </Stack>
          </Tooltip>
         
          {slot.duration_mins && (
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
              <AccessTimeRounded sx={{ fontSize: 15, color: C.muted }} />
              <Typography sx={{ fontFamily: FONT, fontSize: '0.8rem', color: C.muted, fontWeight: 600 }}>
                {slot.duration_mins} min
              </Typography>
            </Stack>
          )}
        </Stack>

       
        <Box
          className="book-pill"
          onClick={(e) => { e.stopPropagation(); if (bookable) onSelect(slot); }}
          sx={{
            display: 'inline-flex', alignItems: 'center', gap: 0.5,
            fontFamily: FONT, fontSize: 12.5, fontWeight: 700,
            bgcolor: C.sageSoft, color: C.sageText,
            borderRadius: '999px', px: 1.75, height: 34, lineHeight: 1,
            flexShrink: 0, transition: 'all 0.22s ease',
            cursor: bookable ? 'pointer' : 'not-allowed',
            ...(disabled && { bgcolor: C.line, color: C.muted }),
          }}
        >
          Book
          <ArrowForwardRounded
            className="arrow"
            sx={{ fontSize: 15, transition: 'transform 0.22s ease' }}
          />
        </Box>
      </Stack>
    </Paper>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SlotSummary — used inside confirm dialog + both result screens
═══════════════════════════════════════════════════════════════════════════ */
function SlotSummary({ slot, jobTitle, companyName, tone = 'default' }) {
  const start = slotStart(slot);
  const timeText = slot.time_display || `${slot.start_time} – ${slot.end_time}`;
  const interviewerName =
    slot.interviewer_name || slot.interviewer?.first_name || slot.interviewer?.email || 'Interviewer';

  const band = tone === 'success' ? C.done : C.pine;

  return (
    <Paper elevation={0} sx={{
      bgcolor: C.white,
      border: `1px solid ${C.line}`,
      borderRadius: '14px',
      p: { xs: 2, md: 2.5 },
      textAlign: 'left',
    }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
        {/* Calendar leaf — the recurring visual token */}
        <Box sx={{
          width: 64, flexShrink: 0,
          border: `1.5px solid ${C.lineStrong}`,
          borderRadius: '12px', overflow: 'hidden',
          bgcolor: C.white, textAlign: 'center',
          boxShadow: '0 2px 6px rgba(2,33,36,0.06)',
        }}>
          <Box sx={{
            bgcolor: band, color: '#fff',
            fontFamily: FONT, fontSize: 10, fontWeight: 800,
            letterSpacing: '1.2px', textTransform: 'uppercase',
            py: '4px',
          }}>
            {fmtMon(start)}
          </Box>
          <Typography sx={{
            fontFamily: FONT, fontSize: 26, fontWeight: 800,
            color: C.ink, lineHeight: 1, py: '7px',
          }}>
            {start ? istDay(start) : '—'}
          </Typography>
          <Typography sx={{
            fontFamily: FONT, fontSize: 10, fontWeight: 700,
            color: C.muted, letterSpacing: '0.5px', textTransform: 'uppercase',
            pb: '4px',
          }}>
            {start ? fmtWeekday(start) : ''}
          </Typography>
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{
            fontFamily: FONT, fontSize: '0.72rem', color: C.sageDark, fontWeight: 800,
            letterSpacing: '2px', textTransform: 'uppercase', mb: 0.5,
          }}>
            {fmtFullDate(start)}
          </Typography>
          <Typography sx={{
            fontFamily: FONT, fontSize: { xs: '1.15rem', md: '1.3rem' },
            fontWeight: 800, color: C.ink, letterSpacing: '-0.01em', mb: 1.25,
          }}>
            {timeText}
          </Typography>
          <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', rowGap: 0.5, alignItems: 'center' }}>
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
              <PersonOutlineRounded sx={{ fontSize: 15, color: C.muted }} />
              <Typography sx={{ fontFamily: FONT, fontSize: '0.82rem', color: C.muted, fontWeight: 600 }}>
                {interviewerName}
              </Typography>
            </Stack>
            {slot.duration_mins && (
              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                <AccessTimeRounded sx={{ fontSize: 15, color: C.muted }} />
                <Typography sx={{ fontFamily: FONT, fontSize: '0.82rem', color: C.muted, fontWeight: 600 }}>
                  {slot.duration_mins} min
                </Typography>
              </Stack>
            )}
          
          </Stack>
          {(jobTitle || companyName) && (
            <>
              <Divider sx={{ my: 1.5, borderColor: C.line }} />
              <Typography sx={{ fontFamily: FONT, fontSize: '0.78rem', color: C.muted, fontWeight: 600 }}>
                {jobTitle && <Box component="span" sx={{ color: C.ink, fontWeight: 800 }}>{jobTitle}</Box>}
                {jobTitle && companyName && ' · '}
                {companyName}
              </Typography>
            </>
          )}
        </Box>
      </Stack>
    </Paper>
  );
}

function LoadingSkeleton() {
  return (
    <>
      <Paper elevation={0} sx={{
        bgcolor: '#fff', border: `1px solid ${C.line}`,
        borderRadius: '18px', mb: 3, overflow: 'hidden',
      }}>
        <Box sx={{
          px: 4, py: 2.25,
          borderBottom: `1px solid ${C.line}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
            <Skeleton variant="rounded" width={36} height={36} sx={{ borderRadius: '9px' }} />
            <Box>
              <Skeleton width={70} height={16} />
              <Skeleton width={110} height={10} sx={{ mt: 0.5 }} />
            </Box>
          </Stack>
          <Skeleton variant="rounded" width={130} height={32} sx={{ borderRadius: '9px' }} />
        </Box>
        <Box sx={{ px: 4, py: 3 }}>
          <Skeleton width="30%" height={14} />
          <Skeleton width="88%" height={26} sx={{ mt: 1.5 }} />
          <Skeleton width="72%" height={26} sx={{ mt: 0.5 }} />
          <Stack direction="row" spacing={1.5} sx={{ mt: 2.5, alignItems: 'center' }}>
            <Skeleton variant="circular" width={38} height={38} />
            <Box>
              <Skeleton width={90} height={14} />
              <Skeleton width={110} height={10} sx={{ mt: 0.5 }} />
            </Box>
          </Stack>
        </Box>
        <Box sx={{
          px: 4, py: 1.75, bgcolor: C.creamSoft, borderTop: `1px solid ${C.line}`,
          display: 'flex', justifyContent: 'space-between',
        }}>
          <Skeleton width={280} height={14} />
          <Skeleton width={200} height={14} />
        </Box>
      </Paper>

      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '360px 1fr' },
        gap: 3,
      }}>
        <Paper elevation={0} sx={{ p: 2.5, borderRadius: '16px', bgcolor: '#fff' }}>
          <Skeleton width="60%" height={22} sx={{ mx: 'auto' }} />
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 0.5, mt: 2 }}>
            {Array.from({ length: 42 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" sx={{ aspectRatio: '1', borderRadius: '11px' }} />
            ))}
          </Box>
        </Paper>
        <Box>
          <Skeleton width="55%" height={30} />
          <Skeleton width="35%" height={16} sx={{ mt: 0.5, mb: 2 }} />
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} variant="rounded" height={70} sx={{ borderRadius: '14px', mb: 1.5 }} />
          ))}
        </Box>
      </Box>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ErrorView — 404 / 410 / network
═══════════════════════════════════════════════════════════════════════════ */
function ErrorView({ error, onRetry }) {
  const isExpired  = error.status === 410;
  const isNotFound = error.status === 404;
  const isNetwork  = error.status === 0;
  const Icon = isExpired ? EventBusyRounded : isNotFound ? LinkOffRounded : WarningAmberRounded;

  const title = isExpired ? 'This booking link has expired'
    : isNotFound ? 'Booking link not found'
    : 'Something went wrong';

  return (
    <Paper elevation={0} sx={{
      bgcolor: '#fff', borderRadius: '18px',
      p: { xs: 4, md: 6 }, textAlign: 'center',
      border: `1px solid ${C.line}`,
      boxShadow: '0 4px 16px rgba(2,33,36,0.05)',
    }}>
      <Box sx={{
        width: 84, height: 84, borderRadius: '20px',
        bgcolor: isExpired ? C.amberSoft : C.dangerSoft,
        color: isExpired ? C.amber : C.danger,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', mb: 3,
      }}>
        <Icon sx={{ fontSize: 40 }} />
      </Box>
      <Typography sx={{
        fontFamily: FONT, fontSize: { xs: '1.4rem', md: '1.65rem' },
        fontWeight: 800, color: C.ink, letterSpacing: '-0.02em', mb: 1.25,
      }}>
        {title}
      </Typography>
      <Typography sx={{
        fontFamily: FONT, fontSize: '0.92rem', color: C.muted,
        maxWidth: 480, mx: 'auto', mb: 3,
      }}>
        {error.detail || 'Please contact the recruiter if you believe this is a mistake.'}
      </Typography>
      {error.job_title && (
        <Chip
          label={error.job_title}
          size="small"
          sx={{
            bgcolor: C.sageSoft, color: C.sageText, fontFamily: FONT,
            fontWeight: 700, fontSize: '0.75rem', borderRadius: '999px',
          }}
        />
      )}
      {isNetwork && onRetry && (
        <Box sx={{ mt: 3.5 }}>
          <SageButton onClick={onRetry} startIcon={<RefreshRounded sx={{ fontSize: 17 }} />}>
            Try again
          </SageButton>
        </Box>
      )}
    </Paper>
  );
}
function ResultView({ slot, jobTitle, companyName, mode }) {
  const isFresh = mode === 'success';
  return (
    <Paper elevation={0} sx={{
      bgcolor: '#fff', borderRadius: '18px',
      p: { xs: 3, md: 4.5 }, textAlign: 'center',
      border: `1px solid ${C.line}`,
      boxShadow: '0 4px 16px rgba(2,33,36,0.05)',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Sage top rule — echoes the letterhead's two-tone rule */}
      <Box sx={{
        position: 'absolute', left: 0, right: 0, top: 0, height: 4,
        background: `linear-gradient(90deg, ${C.done} 0%, ${C.sage} 100%)`,
      }} />

      <Box sx={{
        width: 76, height: 76, borderRadius: '50%',
        bgcolor: C.doneSoft, color: C.done,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        mb: 2.25, boxShadow: `0 0 0 8px rgba(62,110,62,0.08)`,
      }}>
        <CheckCircleRounded sx={{ fontSize: 40 }} />
      </Box>

      <Typography sx={{
        fontFamily: FONT, fontSize: '0.72rem', fontWeight: 800,
        letterSpacing: '2.5px', textTransform: 'uppercase',
        color: C.sageText, mb: 1,
      }}>
        {isFresh ? 'Booking Confirmed' : 'Slot Already Booked'}
      </Typography>

      <Typography component="h1" sx={{
        fontFamily: FONT, m: 0, mb: 1.25,
        fontSize: { xs: 26, md: 32 }, fontWeight: 800,
        letterSpacing: '-0.02em', lineHeight: 1.15, color: C.ink,
      }}>
        {isFresh ? 'Your interview is booked.' : 'You\u2019re already booked in.'}
      </Typography>

      <Typography sx={{
        fontFamily: FONT, fontSize: '0.95rem', color: C.muted,
        maxWidth: 500, mx: 'auto', mb: 3,
      }}>
        {isFresh
          ? 'A confirmation email is on its way. The meeting link opens 30 minutes before your interview starts.'
          : 'This slot is already confirmed. The meeting link opens 30 minutes before the interview.'}
      </Typography>

      <SlotSummary slot={slot} jobTitle={jobTitle} companyName={companyName} tone="success" />

      <Typography sx={{
        fontFamily: FONT, fontSize: '0.78rem', color: C.muted, fontWeight: 500, mt: 2.75,
      }}>
        The meeting link becomes available 30 minutes before start.
      </Typography>
    </Paper>
  );
}


const BookSlotMode = ({ token, embedded = false }) => {
  const navigate = useNavigate();

  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [data, setData]               = useState(null);
  const [bookedSlot, setBookedSlot]   = useState(null);
  const [bookingId, setBookingId]     = useState(null);
  const [success, setSuccess]         = useState(null);
  const [toast, setToast]             = useState(null);
  const [confirmSlot, setConfirmSlot] = useState(null);
  const [selectedDateKey, setSelectedDateKey] = useState(null);
  const [calendarMonth, setCalendarMonth]     = useState(() => startOfMonth(new Date()));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { ok, status, data: resp } = await smartInterviewService.getAvailableSlotsByToken(token);
      if (status === 404) {
        setError({ status, detail: resp?.detail || 'This booking link is not valid.' });
      } else if (status === 410) {
        setError({
          status, detail: resp?.detail || 'This booking link is no longer accepting responses.',
          expired_at: resp?.expired_at, job_title: resp?.job_title,
        });
      } else if (ok) {
        if (resp?.booked_slot) setBookedSlot(resp.booked_slot);
        setData(resp);
      } else {
        setError({ status, detail: resp?.detail || `Request failed (${status}).` });
      }
    } catch {
      setError({ status: 0, detail: 'Network error. Check your connection and try again.' });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  /* Group + sort slots by date, then by time within each group */
  const groupedDates = useMemo(() => {
    const slots = data?.slots || [];
    const byDate = new Map();
    slots.forEach((s) => {
      const key = slotDateKey(s);
      if (!byDate.has(key)) byDate.set(key, []);
      byDate.get(key).push(s);
    });
    return [...byDate.entries()]
      .map(([key, group]) => {
        const date = parseISO(key) || slotStart(group[0]);
        const sorted = [...group].sort((a, b) => {
          const at = slotStart(a)?.getTime() || 0;
          const bt = slotStart(b)?.getTime() || 0;
          return at - bt;
        });
        return { key, date, slots: sorted };
      })
      .sort((a, b) => (a.date?.getTime() || 0) - (b.date?.getTime() || 0));
  }, [data]);

  /* Set of day-keys the calendar can highlight. Cheap O(1) lookup per cell. */
  const slotDayKeys = useMemo(
    () => new Set(groupedDates.map((g) => g.key)),
    [groupedDates]
  );

  /* Per-day slot count for the calendar's hover tooltips. Keyed the same
     way as slotDayKeys so lookups pair cleanly at render time. */
  const slotCountByKey = useMemo(() => {
    const m = new Map();
    groupedDates.forEach((g) => m.set(g.key, g.slots.length));
    return m;
  }, [groupedDates]);

  
  useEffect(() => {
    if (!groupedDates.length) return;
    const stillValid = selectedDateKey && slotDayKeys.has(selectedDateKey);
    if (!stillValid) setSelectedDateKey(groupedDates[0].key);
  }, [groupedDates, selectedDateKey, slotDayKeys]);

  useEffect(() => {
    if (!selectedDateKey) return;
    const d = parseISO(selectedDateKey);
    if (!d) return;
    if (!sameMonth(d, calendarMonth)) setCalendarMonth(startOfMonth(d));
   
  }, [selectedDateKey]);

  const handleBack = useCallback(() => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/jobseeker/smart-interviews/live');
  }, [navigate]);

  const openConfirm  = (slot) => setConfirmSlot(slot);
  const closeConfirm = () => { if (!bookingId) setConfirmSlot(null); };

  const handleBookConfirmed = async () => {
    if (!confirmSlot) return;
    const slotId = confirmSlot.id;
    setBookingId(slotId);
    try {
      const { ok, data: resp } = await smartInterviewService.bookSlotByToken(token, slotId);
      if (ok && resp?.slot) {
        setSuccess(resp.slot);
        setConfirmSlot(null);
        setToast({ severity: 'success', message: resp.detail || 'Interview booked.' });
      } else {
        setToast({ severity: 'error', message: resp?.detail || 'Booking failed. Please try another slot.' });
        setConfirmSlot(null);
        load();
      }
    } catch {
      setToast({ severity: 'error', message: 'Network error during booking.' });
      setConfirmSlot(null);
    } finally {
      setBookingId(null);
    }
  };

  const companyName = data?.company_name || '';
  const jobTitle    = data?.job_title || '';

  // ── Early-return states (all hooks above are unconditional) ────────────
  if (loading) {
    return (
      <Shell onBack={handleBack} embedded={embedded}>
        <LoadingSkeleton />
      </Shell>
    );
  }
  if (error) {
    return (
      <Shell onBack={handleBack} embedded={embedded}>
        <ErrorView error={error} onRetry={load} />
      </Shell>
    );
  }
  if (success) {
    return (
      <Shell onBack={handleBack} embedded={embedded}>
        <ResultView slot={success} jobTitle={jobTitle} companyName={companyName} mode="success" />
        <Snackbar
          open={!!toast}
          autoHideDuration={3500}
          onClose={() => setToast(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          {toast && (
            <Alert severity={toast.severity} onClose={() => setToast(null)} variant="filled"
              sx={{ borderRadius: '10px', fontFamily: FONT }}>
              {toast.message}
            </Alert>
          )}
        </Snackbar>
      </Shell>
    );
  }
  if (bookedSlot) {
    return (
      <Shell onBack={handleBack} embedded={embedded}>
        <ResultView slot={bookedSlot} jobTitle={jobTitle} companyName={companyName} mode="already" />
      </Shell>
    );
  }

  // ── State 5: Available slots ───────────────────────────────────────────
  const totalSlots = data?.slots?.length || 0;
  const selectedGroup = groupedDates.find(g => g.key === selectedDateKey);
  const timeSlotsForDay = selectedGroup?.slots || [];
  const selectedDateObj = selectedGroup?.date || (selectedDateKey ? parseISO(selectedDateKey) : null);

  return (
    <Shell onBack={handleBack} embedded={embedded}>
      <FormalNoticeHero data={data} token={token} />
      <SlotCountStrip slotCount={totalSlots} data={data} />

      {totalSlots === 0 ? (
        <Paper elevation={0} sx={{
          textAlign: 'center', py: 8, px: 3,
          bgcolor: '#fff', borderRadius: '18px',
          border: `1.5px dashed ${C.lineStrong}`,
        }}>
          <CalendarMonthOutlined sx={{ fontSize: 48, color: C.muted, mb: 1.5 }} />
          <Typography sx={{ fontFamily: FONT, fontWeight: 800, fontSize: '1.1rem', color: C.ink, mb: 0.5 }}>
            No slots available yet
          </Typography>
          <Typography sx={{ fontFamily: FONT, color: C.muted, fontSize: '0.88rem', maxWidth: 400, mx: 'auto' }}>
            The recruiter hasn\u2019t opened any times yet. Check back soon, or reach out to them directly.
          </Typography>
        </Paper>
      ) : (
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '360px 1fr' },
          gap: { xs: 2.5, md: 3 },
        }}>
          {/* ── Left: mini month calendar ─────────────────────────────── */}
          <Box>
            <Box sx={{ mb: 1.5, pl: 0.5 }}>
              <Eyebrow>Available Dates</Eyebrow>
            </Box>
            <MonthCalendar
              month={calendarMonth}
              onMonthChange={setCalendarMonth}
              slotDayKeys={slotDayKeys}
              slotCountByKey={slotCountByKey}
              selectedKey={selectedDateKey}
              onSelect={setSelectedDateKey}
              expiresAt={data?.expires_at}
            />
          </Box>

          {/* ── Right: time rows for selected date ────────────────────── */}
          <Box sx={{ minWidth: 0 }}>
            <Box sx={{ mb: 2, pl: 0.5 }}>
              <Eyebrow>Choose a Time</Eyebrow>
            </Box>
            <Typography sx={{
              fontFamily: FONT, fontSize: { xs: '1.35rem', md: '1.55rem' },
              fontWeight: 800, color: C.ink, letterSpacing: '-0.02em',
              lineHeight: 1.15,
            }}>
              {fmtFullDate(selectedDateObj)}
            </Typography>
            <Typography sx={{
              fontFamily: FONT, fontSize: '0.85rem', color: C.muted, mt: 0.4, mb: 2,
            }}>
              {timeSlotsForDay.length} {timeSlotsForDay.length === 1 ? 'slot' : 'slots'} available on this date
            </Typography>

            {timeSlotsForDay.length === 0 ? (
              <Paper elevation={0} sx={{
                textAlign: 'center', py: 5, px: 3,
                bgcolor: '#fff', borderRadius: '14px',
                border: `1.5px dashed ${C.lineStrong}`,
              }}>
                <Typography sx={{ fontFamily: FONT, color: C.muted, fontSize: '0.88rem' }}>
                  No slots on this day. Pick a highlighted day from the calendar.
                </Typography>
              </Paper>
            ) : (
              timeSlotsForDay.map((slot) => (
                <TimeSlotRow
                  key={slot.id}
                  slot={slot}
                  onSelect={openConfirm}
                  disabled={bookingId && bookingId !== slot.id}
                />
              ))
            )}
          </Box>
        </Box>
      )}

      {/* ── Confirm-booking dialog ────────────────────────────────────── */}
      <Dialog
        open={Boolean(confirmSlot)}
        onClose={closeConfirm}
        maxWidth="sm" fullWidth
        slotProps={{ paper: { sx: {
          borderRadius: '18px', fontFamily: FONT, overflow: 'hidden',
          border: `1px solid ${C.line}`,
        } } }}
      >
        {/* Two-tone rule at the top — matches the hero letterhead rule */}
        <Box sx={{ height: 4, background: `linear-gradient(90deg, ${C.pine} 0%, ${C.pine} 30%, ${C.sage} 30%, ${C.sage} 100%)` }} />
        <DialogTitle sx={{
          fontFamily: FONT, fontWeight: 800, color: C.ink,
          letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 1, pb: 1,
          fontSize: '1.15rem',
        }}>
          <DescriptionOutlined sx={{ color: C.pine, fontSize: 22 }} />
          Confirm your booking
          <IconButton
            onClick={closeConfirm}
            disabled={Boolean(bookingId)}
            sx={{ ml: 'auto', color: C.muted, '&:hover': { bgcolor: C.sageSoft, color: C.pine } }}
            size="small"
          >
            <CloseRounded sx={{ fontSize: 18 }} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography sx={{
            fontFamily: FONT, fontSize: '0.88rem', color: C.muted, mb: 2,
          }}>
            Once you confirm, this slot is locked in and the recruiter is notified. You\u2019ll receive a confirmation email.
          </Typography>
          {confirmSlot && (
            <SlotSummary slot={confirmSlot} jobTitle={jobTitle} companyName={companyName} />
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            onClick={closeConfirm}
            disabled={Boolean(bookingId)}
            sx={{
              fontFamily: FONT, textTransform: 'none', fontWeight: 700,
              color: C.muted, borderRadius: '999px', fontSize: '0.9rem',
              px: 2.5, height: 44,
              '&:hover': { bgcolor: C.sageSoft, color: C.pine },
            }}
          >
            Cancel
          </Button>
          <SageButton
            onClick={handleBookConfirmed}
            disabled={Boolean(bookingId)}
            startIcon={
              bookingId
                ? <CircularProgress size={15} sx={{ color: '#fff', mr: 0.5 }} />
                : <CheckCircleOutlined sx={{ fontSize: 17, mr: 0.5 }} />
            }
            sx={{ height: 44 }}
          >
            {bookingId ? 'Booking\u2026' : 'Confirm booking'}
          </SageButton>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!toast}
        autoHideDuration={3500}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        {toast && (
          <Alert severity={toast.severity} onClose={() => setToast(null)} variant="filled"
            sx={{ borderRadius: '10px', fontFamily: FONT }}>
            {toast.message}
          </Alert>
        )}
      </Snackbar>
    </Shell>
  );
};

export default BookSlotMode;