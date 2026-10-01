import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ROLE_HOME } from '@/constants';
import { C, FONT, REDUCED } from '@/pages/landing/theme';


const G = "#7F9E7E";      // sage line + fills
const GD = "#6C8B6B";     // darker sage (404 digits)
const SAND = "#EDE4CE";   // warm sand
const SUN = "#F3EAD3";    // pale sun

const NotFoundPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, role } = useAuth();

  const goHome = () => {
    if (isAuthenticated && role) navigate(ROLE_HOME[role] || '/');
    else navigate('/');
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: '18px',
      background: '#FFFFFF', fontFamily: FONT, padding: '32px 20px',
      textAlign: 'center',
    }}>
      <svg
        viewBox="0 12 600 336" role="img"
        aria-label="404 error — page not found"
        style={{ width: 'min(560px, 92vw)', height: 'auto' }}
      >
        {/* ── sky elements ── */}
        {/* sun */}
        <circle cx="212" cy="150" r="26" fill={SUN} stroke={G} strokeWidth="2.4" />

        {/* clouds (line style) */}
        <g fill="none" stroke={G} strokeWidth="2.6" strokeLinecap="round">
          <path d="M256 118 q20 -22 44 -8 q26 -14 40 8" />
          <path d="M330 100 h40" />
          <path d="M262 132 h56" />

          <path d="M410 150 q18 -20 40 -8 q24 -12 36 8" />
          <path d="M470 134 h30" />
          <path d="M418 164 h48" />

          <path d="M120 186 q18 -20 40 -8 q24 -12 36 8" />
          <path d="M128 200 h48" />
        </g>

        {/* ── sand dunes ── */}
        <g fill={SAND}>
          <ellipse cx="300" cy="322" rx="210" ry="26" />
          <ellipse cx="180" cy="336" rx="120" ry="18" />
          <ellipse cx="430" cy="332" rx="120" ry="16" />
        </g>
        {/* sand speckles */}
        <g fill={G} opacity="0.6">
          <circle cx="150" cy="330" r="2.4" />
          <circle cx="250" cy="340" r="2.4" />
          <circle cx="360" cy="336" r="2.4" />
          <circle cx="452" cy="328" r="2.4" />
          <circle cx="405" cy="342" r="2.4" />
        </g>

        {/* ── cactus (left) ── */}
        <g fill="#B9D3A0" stroke={G} strokeWidth="2.6" strokeLinejoin="round">
          <path d="M150 210 q10 0 10 12 v88 q0 8 -10 8 q-10 0 -10 -8 v-88 q0 -12 10 -12 Z" />
          <path d="M150 246 q-2 -18 -18 -18 q-10 0 -10 10 v10 q0 10 10 10 q12 0 18 -2 Z" />
          <path d="M150 240 q2 -22 20 -22 q10 0 10 10 v12 q0 10 -10 10 q-14 0 -20 -4 Z" />
        </g>
        {/* cactus spines */}
        <g stroke={G} strokeWidth="1.6" strokeLinecap="round">
          <path d="M144 226 l-5 -5 M156 226 l5 -5 M144 262 l-5 -5 M156 262 l5 -5 M144 290 l-5 -5 M156 290 l5 -5" />
        </g>
        {/* cactus pot */}
        <path d="M132 318 h36 l-4 20 h-28 Z" fill={G} />

        {/* ── windmill (right) ── */}
        <g stroke={G} strokeWidth="2.6" strokeLinejoin="round">
          {/* tower */}
          <path d="M436 250 l-10 72 M436 250 l10 72" fill="none" />
          <path d="M430 286 h12 M427 304 h18" fill="none" />
          {/* blades */}
          <g fill="#B9D3A0">
            <path d="M436 250 l-2 -40 l14 8 Z" />
            <path d="M436 250 l34 -18 l-4 16 Z" />
            <path d="M436 250 l30 26 l-16 4 Z" />
            <path d="M436 250 l-16 34 l-8 -14 Z" />
            <path d="M436 250 l-38 -6 l10 -12 Z" />
          </g>
          <circle cx="436" cy="250" r="5" fill={G} stroke="none" />
        </g>

        {/* ── 404 ERROR text (part of the illustration) ── */}
        <text x="300" y="250" textAnchor="middle" fontFamily={FONT}
          fontSize="96" fontWeight="800" fill={GD} letterSpacing="2">404</text>
        <text x="300" y="300" textAnchor="middle" fontFamily={FONT}
          fontSize="52" fontWeight="800" fill={GD} letterSpacing="6">ERROR</text>
      </svg>

      <h1 style={{
        margin: 0, fontFamily: FONT, fontWeight: 500,
        fontSize: 'clamp(22px, 4vw, 30px)', color: G, letterSpacing: '0.5px',
      }}>
        Page not found
      </h1>

      <p style={{
        margin: 0, fontFamily: FONT, fontSize: 15.5, color: C.muted,
        maxWidth: 440, lineHeight: 1.7,
      }}>
        The page you're looking for doesn't exist, may have moved, or you don't
        have access to it.
      </p>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={goHome}
          style={{
            fontFamily: FONT, fontSize: 15, fontWeight: 600, color: '#fff',
            background: C.sage, border: 'none', cursor: 'pointer',
            borderRadius: '999px', padding: '12px 30px',
            transition: REDUCED ? 'none' : 'background .25s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = C.ink; }}
          onMouseLeave={e => { e.currentTarget.style.background = C.sage; }}
        >
          {isAuthenticated ? 'Go to Dashboard' : 'Back to Home'}
        </button>
        <button
          onClick={() => navigate(-1)}
          style={{
            fontFamily: FONT, fontSize: 15, fontWeight: 600, color: C.ink,
            background: 'transparent', border: `1.5px solid ${C.line}`,
            cursor: 'pointer', borderRadius: '999px', padding: '12px 30px',
            transition: REDUCED ? 'none' : 'all .25s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = C.sage; e.currentTarget.style.color = C.sageDark; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = C.line; e.currentTarget.style.color = C.ink; }}
        >
          Go back
        </button>
      </div>
    </div>
  );
};

export default NotFoundPage;