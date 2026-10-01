import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Typography, Stack, Button, TextField, IconButton,
} from '@mui/material';
import { Google, Apple, Facebook } from '@mui/icons-material';
import login from '../../assets/images/login.png'
import login2 from '../../assets/images/login2.png'
import login3 from '../../assets/images/login3.png'


/* ============================================================================
 * AUTH THEME — sage palette lifted from the landing system (src/pages/landing/
 * theme.js) so every auth surface matches the marketing site exactly. Kept as a
 * self-contained token set so the auth folder never breaks if landing internals
 * move. Reference layout: Tuga-style split — white form panel + sage art panel.
 * ========================================================================== */
export const AC = {
  sage:     '#7F9E7E',
  sageDark: '#6C8B6B',
  sageSoft: '#EDF3EC',
  hero:     '#D4E2E3',
  ink:      '#1F1F1F',
  inkSoft:  '#111111',
  pine:     '#022124',
  pine2:    '#24433E',
  cream:    '#F6F8F3',
  white:    '#FFFFFF',
  text:     '#1F1F1F',
  muted:    '#6F7470',
  hint:     '#8A8F8B',
  line:     '#E7EAE3',
};

export const FONT = "'Jost','DM Sans',sans-serif";

/* ── Corner-bracket eyebrow label — lifted from the landing's editorial system. */
export function Eyebrow({ label, sx = {} }) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', width: 'fit-content', mb: 1.5, ...sx }}>
      <Box sx={{ width: 10, height: 10, borderLeft: `1.5px solid ${AC.sage}`, borderTop: `1.5px solid ${AC.sage}` }} />
      <Typography sx={{ fontFamily: FONT, fontSize: 10.5, fontWeight: 600, letterSpacing: '2.5px', color: AC.sageDark, lineHeight: 1 }}>
        {label}
      </Typography>
      <Box sx={{ width: 10, height: 10, borderRight: `1.5px solid ${AC.sage}`, borderBottom: `1.5px solid ${AC.sage}` }} />
    </Stack>
  );
}


/* ── Ink pill button with a sage bloom on hover (mirrors landing SageButton,
      inverted: ink base, sage bloom) — the reference's black "Login" button. */
export function InkButton({
  children, onClick, type = 'button', fullWidth = false,
  disabled = false, startIcon, sx = {},
}) {
  return (
    <Button
      type={type}
      onClick={onClick}
      disabled={disabled}
      startIcon={startIcon}
      disableElevation
      fullWidth={fullWidth}
      sx={{
        position: 'relative', overflow: 'hidden',
        fontFamily: FONT, textTransform: 'none',
        bgcolor: AC.ink, color: '#fff',
        borderRadius: '999px', height: 50, minWidth: 0, lineHeight: 1,
        fontSize: 15, fontWeight: 500,
        '& .ink-btn-label, & .MuiButton-startIcon': {
          position: 'relative', zIndex: 2, color: '#fff',
          transition: 'color .45s cubic-bezier(0.22,1,0.36,1)',
        },
        '&::before': {
          content: '""', position: 'absolute', zIndex: 1,
          left: '100%', top: '100%',
          width: 560, height: 560, ml: '-280px', mt: '-280px',
          borderRadius: '50%', bgcolor: AC.sage,
          transform: 'scale(0)',
          transition: 'transform .55s cubic-bezier(0.22,1,0.36,1)',
          pointerEvents: 'none',
        },
        '&:hover::before': { transform: 'scale(1)' },
        '&.Mui-disabled': { bgcolor: AC.ink, opacity: 0.5, color: '#fff' },
        ...sx,
      }}
    >
      <Box component="span" className="ink-btn-label">{children}</Box>
    </Button>
  );
}

/* ── Editorial underline field — 2px ink-family underline, sage on focus.
      (Name kept as PillField so every existing import keeps working.) */
export function PillField({ sx = {}, ...props }) {
  return (
    <TextField
      fullWidth
      variant="standard"
      {...props}
      sx={{
        '& .MuiInput-root': {
          fontFamily: FONT, fontSize: 16.5, color: AC.ink,
          '&::before': { borderBottom: `2px solid ${AC.line}` },
          '&:hover:not(.Mui-disabled, .Mui-error)::before': { borderBottom: `2px solid ${AC.ink}` },
          '&::after': { borderBottom: `2px solid ${AC.sage}` },
          '&.Mui-error::after': { borderBottomColor: '#D9534F' },
        },
        '& .MuiInputBase-input': { color: AC.ink, py: '12px', px: 0.25 },
        '& .MuiInputBase-input[type="password"]': { fontSize: 20, letterSpacing: '0.1em' },
        '& .MuiInputBase-input::placeholder': { color: AC.hint, opacity: 1 },
        '& .MuiFormHelperText-root': { fontFamily: FONT, ml: 0.25, mt: 0.5 },
        ...sx,
      }}
    />
  );
}

/* Editorial alias — same component, clearer name for new code. */
export const LineField = PillField;

/* ── Sage segmented role toggle (Company / Employer / Jobseeker). */
export function RoleToggle({ value, onChange, options, sx = {} }) {
  return (
    <Stack direction="row" spacing={0} sx={{ mb: 2.5, borderBottom: `1px solid ${AC.line}`, ...sx }}>
      {options.map((o) => {
        const on = value === o.value;
        return (
          <Box
            key={o.value}
            role="button"
            tabIndex={0}
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChange(o.value); } }}
            sx={{
              flex: 1, textAlign: 'center', cursor: 'pointer', outline: 'none',
              fontFamily: FONT, fontSize: 12.5, letterSpacing: '0.3px',
              fontWeight: on ? 600 : 500, pb: 1, pt: 0.5, mb: '-1px',
              color: on ? AC.ink : AC.muted,
              borderBottom: `2px solid ${on ? AC.sage : 'transparent'}`,
              transition: 'all .2s',
              '&:hover': { color: AC.ink },
              '&:focus-visible': { color: AC.ink, borderBottomColor: AC.sageDark },
            }}
          >
            {o.label}
          </Box>
        );
      })}
    </Stack>
  );
}

/* ── "or continue with" divider. */
export function OrDivider({ label = 'or continue with' }) {
  return (
    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', my: 2 }}>
      <Box sx={{ flex: 1, height: '1px', bgcolor: AC.line }} />
      <Typography sx={{ fontFamily: FONT, fontSize: 11.5, color: AC.hint, whiteSpace: 'nowrap' }}>
        {label}
      </Typography>
      <Box sx={{ flex: 1, height: '1px', bgcolor: AC.line }} />
    </Stack>
  );
}

/* ── Round ink social buttons (presentational until OAuth is wired). */
export function SocialRow({ onProvider }) {
  const items = [['google', Google], ['apple', Apple], ['facebook', Facebook]];
  return (
    <Stack direction="row" spacing={1.75} sx={{ justifyContent: 'center' }}>
      {items.map(([k, Icon]) => (
        <IconButton
          key={k}
          onClick={() => onProvider?.(k)}
          aria-label={`Continue with ${k}`}
          sx={{
            width: 46, height: 46, borderRadius: '50%',
            bgcolor: AC.ink, color: '#fff',
            transition: 'background-color .2s, transform .2s',
            '&:hover': { bgcolor: AC.pine, transform: 'translateY(-2px)' },
          }}
        >
          <Icon sx={{ fontSize: 20 }} />
        </IconButton>
      ))}
    </Stack>
  );
}

/* ── Brand lockup (IE tile + wordmark). */
export function AuthBrand({ onClick, dark = false, size = 'md' }) {
  const tile = size === 'sm' ? 34 : 40;
  const word = size === 'sm' ? 19 : 22;
  return (
    <Stack
      direction="row" spacing={1.25}
      onClick={onClick}
      sx={{
        alignItems: 'center', cursor: onClick ? 'pointer' : 'default',
        width: 'fit-content', transition: 'opacity .2s',
        '&:hover': onClick ? { opacity: 0.85 } : {},
      }}
    >
      <Box sx={{
        width: tile, height: tile, borderRadius: '11px', bgcolor: AC.sage,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontWeight: 800, fontSize: tile * 0.36, fontFamily: FONT,
      }}>
        IE
      </Box>
      <Typography sx={{ fontFamily: FONT, fontSize: word, fontWeight: 600, color: dark ? '#fff' : AC.ink }}>
        IEvalx
      </Typography>
    </Stack>
  );
}


/* ── Small ringed avatar chip. */
function AvatarChip({ sx }) {
  return (
    <Box sx={{
      position: 'absolute', width: 42, height: 42, borderRadius: '50%',
      bgcolor: '#fff', border: `2px solid ${AC.sage}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: AC.sageDark, fontSize: 20, ...sx,
    }}>
      <Box component="span" sx={{ fontSize: 18 }}>◕</Box>
    </Box>
  );
}



const SLIDES = [
  {
    image: login,  // ← replace with your image path e.g. '/assets/auth/hiring.png'
    caption: 'Make your hiring easier and organized with IEvalx',
    badge: 'AI Interview',
    badgeSub: '10 Rounds',
    badgeTag: 'CIR Score',
    percent: 64,
  },
  {
    image: login2,  // ← replace with your image path
    caption: 'Join the platform where talent proves itself first',
    badge: 'Smart Screening',
    badgeSub: 'Auto-rank',
    badgeTag: 'Fit Score',
    percent: 87,
  },
  {
    image: login3,  // ← replace with your image path
    caption: 'Hire smarter with AI-powered interviews and CIR scores',
    badge: 'CIR Report',
    badgeSub: 'Deep Analysis',
    badgeTag: 'Performance',
    percent: 92,
  },
];

const INTERVAL_MS = 4500;
const EASE = 'cubic-bezier(0.22,1,0.36,1)';



function FallbackArt1({ width = 230 }) {
  return (
    <Box component="svg" viewBox="0 0 260 230" role="img" aria-label="Person meditating"
      sx={{ width, maxWidth: '78%', height: 'auto', display: 'block' }}>
      <path d="M40 150 C10 110 30 40 90 42 C120 43 130 20 160 30" fill="none" stroke={AC.sage} strokeWidth="2.5" strokeLinecap="round" opacity="0.55" />
      <path d="M222 150 C250 108 232 42 176 46" fill="none" stroke={AC.sage} strokeWidth="2.5" strokeLinecap="round" opacity="0.55" />
      <ellipse cx="130" cy="205" rx="78" ry="12" fill={AC.sage} opacity="0.14" />
      <path d="M62 200 C70 168 100 160 130 160 C160 160 190 168 198 200 Z" fill="#fff" stroke={AC.ink} strokeWidth="2.5" />
      <path d="M92 168 C70 150 60 120 66 108" fill="none" stroke={AC.ink} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M168 168 C190 150 200 120 194 108" fill="none" stroke={AC.ink} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M96 150 C96 118 108 104 130 104 C152 104 164 118 164 150 C164 165 150 172 130 172 C110 172 96 165 96 150 Z" fill={AC.sage} stroke={AC.ink} strokeWidth="2.5" />
      <path d="M130 122 c-5 -6 -14 -3 -14 4 c0 6 9 11 14 15 c5 -4 14 -9 14 -15 c0 -7 -9 -10 -14 -4 Z" fill="#fff" />
      <circle cx="66" cy="106" r="9" fill={AC.sage} stroke={AC.ink} strokeWidth="2.5" />
      <circle cx="194" cy="106" r="9" fill={AC.sage} stroke={AC.ink} strokeWidth="2.5" />
      <circle cx="130" cy="78" r="26" fill="#fff" stroke={AC.ink} strokeWidth="2.5" />
      <path d="M104 74 C102 50 120 40 130 40 C140 40 158 50 156 74 C150 66 142 62 130 62 C118 62 110 66 104 74 Z" fill={AC.ink} />
      <circle cx="122" cy="78" r="2.4" fill={AC.ink} />
      <circle cx="138" cy="78" r="2.4" fill={AC.ink} />
      <path d="M124 88 C127 91 133 91 136 88" fill="none" stroke={AC.ink} strokeWidth="2" strokeLinecap="round" />
    </Box>
  );
}

function FallbackArt2({ width = 230 }) {
  return (
    <Box component="svg" viewBox="0 0 260 230" role="img" aria-label="Person reviewing on laptop"
      sx={{ width, maxWidth: '78%', height: 'auto', display: 'block' }}>
      {/* desk */}
      <rect x="50" y="170" width="160" height="6" rx="3" fill={AC.sage} opacity="0.25" />
      <ellipse cx="130" cy="210" rx="90" ry="10" fill={AC.sage} opacity="0.1" />
      {/* laptop base */}
      <rect x="80" y="134" width="100" height="38" rx="4" fill="#fff" stroke={AC.ink} strokeWidth="2.5" />
      {/* screen content lines */}
      <rect x="92" y="142" width="36" height="3" rx="1.5" fill={AC.sage} opacity="0.6" />
      <rect x="92" y="149" width="52" height="3" rx="1.5" fill={AC.line} />
      <rect x="92" y="156" width="28" height="3" rx="1.5" fill={AC.line} />
      {/* screen checkmark */}
      <circle cx="152" cy="150" r="10" fill={AC.sageSoft} stroke={AC.sage} strokeWidth="1.5" />
      <path d="M147 150 l3 3 l6 -6" fill="none" stroke={AC.sageDark} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* laptop lid hinge */}
      <path d="M76 134 L84 134" fill="none" stroke={AC.ink} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M176 134 L184 134" fill="none" stroke={AC.ink} strokeWidth="2.5" strokeLinecap="round" />
      {/* person torso */}
      <path d="M108 132 C108 108 116 98 130 98 C144 98 152 108 152 132" fill={AC.sage} stroke={AC.ink} strokeWidth="2.5" />
      {/* arms reaching to laptop */}
      <path d="M112 120 C100 126 90 132 88 140" fill="none" stroke={AC.ink} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M148 120 C160 126 170 132 172 140" fill="none" stroke={AC.ink} strokeWidth="2.5" strokeLinecap="round" />
      {/* hands */}
      <circle cx="88" cy="141" r="5" fill="#fff" stroke={AC.ink} strokeWidth="2" />
      <circle cx="172" cy="141" r="5" fill="#fff" stroke={AC.ink} strokeWidth="2" />
      {/* head */}
      <circle cx="130" cy="74" r="24" fill="#fff" stroke={AC.ink} strokeWidth="2.5" />
      {/* hair */}
      <path d="M106 68 C106 46 120 38 130 38 C140 38 154 46 154 68 C148 60 140 56 130 56 C120 56 112 60 106 68 Z" fill={AC.ink} />
      {/* eyes */}
      <circle cx="122" cy="74" r="2.2" fill={AC.ink} />
      <circle cx="138" cy="74" r="2.2" fill={AC.ink} />
      {/* smile */}
      <path d="M124 83 C127 86 133 86 136 83" fill="none" stroke={AC.ink} strokeWidth="2" strokeLinecap="round" />
      {/* glasses */}
      <rect x="114" y="68" width="14" height="12" rx="4" fill="none" stroke={AC.ink} strokeWidth="1.5" />
      <rect x="132" y="68" width="14" height="12" rx="4" fill="none" stroke={AC.ink} strokeWidth="1.5" />
      <path d="M128 74 L132 74" fill="none" stroke={AC.ink} strokeWidth="1.5" />
      {/* floating profile cards */}
      <rect x="30" y="80" width="40" height="32" rx="6" fill="#fff" stroke={AC.sage} strokeWidth="1.5" opacity="0.7" />
      <circle cx="42" cy="90" r="5" fill={AC.sageSoft} />
      <rect x="36" y="100" width="14" height="2" rx="1" fill={AC.sage} opacity="0.5" />
      <rect x="190" y="70" width="40" height="32" rx="6" fill="#fff" stroke={AC.sage} strokeWidth="1.5" opacity="0.7" />
      <circle cx="202" cy="80" r="5" fill={AC.sageSoft} />
      <rect x="196" y="90" width="14" height="2" rx="1" fill={AC.sage} opacity="0.5" />
    </Box>
  );
}

function FallbackArt3({ width = 230 }) {
  return (
    <Box component="svg" viewBox="0 0 260 230" role="img" aria-label="Person with verified badge"
      sx={{ width, maxWidth: '78%', height: 'auto', display: 'block' }}>
      <ellipse cx="130" cy="210" rx="80" ry="12" fill={AC.sage} opacity="0.12" />
      {/* body */}
      <path d="M80 200 C86 162 106 148 130 148 C154 148 174 162 180 200 Z" fill="#fff" stroke={AC.ink} strokeWidth="2.5" />
      {/* shirt/vest */}
      <path d="M100 168 C100 155 112 148 130 148 C148 148 160 155 160 168 L160 200 L100 200 Z" fill={AC.sage} stroke={AC.ink} strokeWidth="2.5" />
      {/* tie */}
      <path d="M130 148 L126 168 L130 172 L134 168 Z" fill={AC.sageDark} />
      {/* head */}
      <circle cx="130" cy="110" r="30" fill="#fff" stroke={AC.ink} strokeWidth="2.5" />
      {/* hair */}
      <path d="M100 104 C100 76 114 66 130 66 C146 66 160 76 160 104 C154 92 144 86 130 86 C116 86 106 92 100 104 Z" fill={AC.ink} />
      {/* eyes */}
      <circle cx="120" cy="110" r="2.5" fill={AC.ink} />
      <circle cx="140" cy="110" r="2.5" fill={AC.ink} />
      {/* smile */}
      <path d="M122 120 C126 124 134 124 138 120" fill="none" stroke={AC.ink} strokeWidth="2" strokeLinecap="round" />
      {/* raised right hand with badge */}
      <path d="M160 168 C178 150 192 132 196 118" fill="none" stroke={AC.ink} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="196" cy="116" r="5" fill="#fff" stroke={AC.ink} strokeWidth="2" />
      {/* shield / verified badge floating */}
      <g transform="translate(186, 58)">
        <path d="M0 8 L14 0 L28 8 L28 20 C28 32 14 38 14 38 C14 38 0 32 0 20 Z" fill={AC.sageSoft} stroke={AC.sage} strokeWidth="2" />
        <path d="M9 18 l4 4 l8 -8" fill="none" stroke={AC.sageDark} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      {/* left hand relaxed */}
      <path d="M100 168 C82 156 68 148 62 152" fill="none" stroke={AC.ink} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="62" cy="152" r="5" fill="#fff" stroke={AC.ink} strokeWidth="2" />
      {/* star sparkles */}
      <g opacity="0.5">
        <path d="M50 80 l2 -6 l2 6 l6 2 l-6 2 l-2 6 l-2 -6 l-6 -2 z" fill={AC.sage} />
        <path d="M210 160 l1.5 -4.5 l1.5 4.5 l4.5 1.5 l-4.5 1.5 l-1.5 4.5 l-1.5 -4.5 l-4.5 -1.5 z" fill={AC.sage} />
        <path d="M44 140 l1 -3 l1 3 l3 1 l-3 1 l-1 3 l-1 -3 l-3 -1 z" fill={AC.sage} />
      </g>
    </Box>
  );
}

const FALLBACK_ARTS = [FallbackArt1, FallbackArt2, FallbackArt3];


export function RightPanel() {
  const [active, setActive]     = useState(0);
  const [visible, setVisible]   = useState(true);  // controls fade out → in
  const timerRef                = useRef(null);

  const total = SLIDES.length;

  // ── advance to a specific slide with a crossfade ──
  const goTo = useCallback((idx) => {
    setVisible(false);                         // 1) fade OUT current
    setTimeout(() => {                         // 2) after exit anim…
      setActive(idx % total);                  //    swap index
      setVisible(true);                        // 3) fade IN new
    }, 320);                                   //    must be < CSS transition
  }, [total]);

  // ── auto-advance timer ──
  useEffect(() => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      goTo((prev) => prev);                    // goTo reads `active` via closure below
    }, INTERVAL_MS);
    return () => clearInterval(timerRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // We need the timer callback to always see the latest `active`:
  useEffect(() => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setActive((prev) => (prev + 1) % total);
        setVisible(true);
      }, 320);
    }, INTERVAL_MS);
    return () => clearInterval(timerRef.current);
  }, [active, total]);

  // ── manual dot click — go to that slide + reset timer ──
  const handleDot = (idx) => {
    if (idx === active) return;
    clearInterval(timerRef.current);
    goTo(idx);
  };

  const slide = SLIDES[active];
  const FallbackComponent = FALLBACK_ARTS[active % FALLBACK_ARTS.length];

  // ── shared transition for the crossfade ──
  const fadeSx = {
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(14px)',
    transition: `opacity 0.4s ${EASE}, transform 0.4s ${EASE}`,
  };

  return (
    <Box sx={{
      flex: 1, m: { md: 1.75 }, borderRadius: '16px', bgcolor: AC.sageSoft,
      position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      p: { md: '32px 26px' }, minHeight: 420,
    }}>
      {/* ── watermark ── */}
      <Typography aria-hidden sx={{
        position: 'absolute', bottom: 52, right: 16, fontFamily: FONT,
        fontSize: 'clamp(56px, 8.5vw, 96px)', fontWeight: 800,
        letterSpacing: '-3px', lineHeight: 1, whiteSpace: 'nowrap',
        maxWidth: 'calc(100% - 32px)', overflow: 'hidden',
        color: 'transparent', WebkitTextStroke: '1.4px rgba(127,158,126,0.5)',
        pointerEvents: 'none', userSelect: 'none',
      }}>
        IEvalx
      </Typography>

      {/* ── corner brackets ── */}
      <Box sx={{ position: 'absolute', top: 18, left: 18, width: 18, height: 18, borderLeft: `2px solid ${AC.sage}`, borderTop: `2px solid ${AC.sage}` }} />
      <Box sx={{ position: 'absolute', bottom: 18, right: 18, width: 18, height: 18, borderRight: `2px solid ${AC.sage}`, borderBottom: `2px solid ${AC.sage}` }} />

      {/* ── avatar chips ── */}
      <AvatarChip sx={{ top: 34, left: 26 }} />
      <AvatarChip sx={{ top: 120, right: 22 }} />

      {/* ── IMAGE / FALLBACK ART — crossfades ── */}
      <Box sx={{ position: 'relative', zIndex: 1, ...fadeSx }}>
        {slide.image ? (
          <Box
            component="img"
            src={slide.image}
            alt="IEvalx illustration"
            onError={(e) => { e.target.style.display = 'none'; }}
            sx={{
              width: '100%',
              maxWidth: 500,
              maxHeight: 500,
              objectFit: 'contain',
              display: 'block',
              mx: 'auto',
            }}
          />
        ) : (
          <FallbackComponent />
        )}
      </Box>

      {/* ── floating task card — updates per slide ── */}
      <Box sx={{
        position: 'absolute', bottom: 148, left: 22, zIndex: 3,
        bgcolor: '#fff', borderRadius: '14px', p: '12px 14px',
        boxShadow: '0 12px 30px rgba(2,33,36,0.14)',
        display: 'flex', alignItems: 'center', gap: 1.5, width: 190,
        ...fadeSx,
      }}>
        <Box>
          <Typography sx={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: AC.ink }}>
            {slide.badge}
          </Typography>
          <Typography sx={{ fontFamily: FONT, fontSize: 11, color: AC.muted, mb: 1 }}>
            {slide.badgeSub}
          </Typography>
          <Box component="span" sx={{
            display: 'inline-block', fontFamily: FONT, fontSize: 10.5, fontWeight: 500,
            color: AC.sageDark, bgcolor: AC.sageSoft, borderRadius: '999px', p: '3px 10px',
          }}>
            {slide.badgeTag}
          </Box>
        </Box>
        <Box sx={{ position: 'relative', width: 40, height: 40, flexShrink: 0 }}>
          <Box component="svg" viewBox="0 0 40 40" sx={{ width: 40, height: 40, transform: 'rotate(-90deg)' }}>
            <circle cx="20" cy="20" r="16" fill="none" stroke={AC.line} strokeWidth="4" />
            <circle
              cx="20" cy="20" r="16" fill="none" stroke={AC.sage} strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="100.5"
              strokeDashoffset={100.5 - (100.5 * slide.percent) / 100}
              style={{ transition: `stroke-dashoffset 0.6s ${EASE}` }}
            />
          </Box>
          <Box sx={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: FONT, fontSize: 10, fontWeight: 600, color: AC.sageDark,
          }}>
            {slide.percent}%
          </Box>
        </Box>
      </Box>

      {/* ── DOTS — clickable, active one stretches into a pill ── */}
      <Stack direction="row" spacing={0.75} sx={{ mt: 2, alignItems: 'center', position: 'relative', zIndex: 4 }}>
        {SLIDES.map((_, i) => {
          const isActive = i === active;
          return (
            <Box
              key={i}
              role="button"
              tabIndex={0}
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => handleDot(i)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleDot(i); } }}
              sx={{
                width: isActive ? 24 : 7,
                height: 7,
                borderRadius: '999px',
                bgcolor: isActive ? AC.ink : 'rgba(31,31,31,0.2)',
                cursor: 'pointer',
                outline: 'none',
                transition: `all 0.35s ${EASE}`,
                '&:hover': { bgcolor: isActive ? AC.ink : 'rgba(31,31,31,0.35)' },
                '&:focus-visible': { boxShadow: `0 0 0 2px ${AC.sage}` },
              }}
            />
          );
        })}
      </Stack>

      {/* ── CAPTION — crossfades in sync with image ── */}
      <Typography sx={{
        fontFamily: FONT, textAlign: 'center', fontSize: 19, fontWeight: 600,
        lineHeight: 1.35, mt: 2, maxWidth: 320, color: AC.ink,
        position: 'relative', zIndex: 2,
        minHeight: 52,      // prevents layout shift between different caption lengths
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        ...fadeSx,
      }}>
        {slide.caption}
      </Typography>
    </Box>
  );
}