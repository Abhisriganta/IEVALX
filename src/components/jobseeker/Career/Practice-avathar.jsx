
import { useState, useEffect } from 'react';
import { Box } from '@mui/material';

import {
  NAVY, SUCCESS, DANGER,
} from './AIPracticeInterview.parts';

/* ────────────────────────────────────────────────────────────────────────
   Viseme mouth shapes — UNCHANGED so lip-sync is byte-identical.
   ──────────────────────────────────────────────────────────────────────── */
export const VISEMES = {
  /* rest — proper closed lips with a subtle cupid's bow at the top. */
  rest: 'M 108 141 Q 118 137 128 139 Q 138 137 148 141 Q 128 147 108 141 Z',
  a:    'M 100 138 Q 128 168 156 138 Q 128 158 100 138 Z',
  e:    'M 96 140 Q 128 154 160 140 Q 128 150 96 140 Z',
  i:    'M 100 141 Q 128 150 156 141 Q 128 147 100 141 Z',
  o:    'M 110 138 Q 128 165 146 138 Q 128 152 110 138 Z',
  u:    'M 114 140 Q 128 155 142 140 Q 128 150 114 140 Z',
  /* m — flat bilabial closed shape */
  m:    'M 108 141 Q 128 138 148 141 Q 128 144 108 141 Z',
};
export const VISEME_KEYS = ['a', 'e', 'i', 'o', 'u', 'm'];


export const Avatar = ({ speaking, listening, viseme, mute }) => {
  const [blink, setBlink] = useState(false);
  const [sway,  setSway]  = useState(0);

  useEffect(() => {
    let cancelled = false;
    const loop = () => {
      if (cancelled) return;
      setBlink(true);
      setTimeout(() => setBlink(false), 130);
      setTimeout(loop, 2600 + Math.random() * 2400);
    };
    const t = setTimeout(loop, 1400);
    return () => { cancelled = true; clearTimeout(t); };
  }, []);

  /* Gentle sway — 60 ms updates for a subtle head bob / rotation. */
  useEffect(() => {
    const id = setInterval(() => setSway((s) => (s + 1) % 360), 60);
    return () => clearInterval(id);
  }, []);

  const swayX     = Math.sin(sway * 0.02) * 1.4;
  const swayR     = Math.sin(sway * 0.015) * 0.8;
  const mouthPath = VISEMES[viseme] || VISEMES.rest;

  return (
    <Box sx={{ position: 'relative', width: '100%', maxWidth: 260, mx: 'auto' }}>

      {/* Ambient glow behind the SVG — unchanged logic */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute', inset: -12, borderRadius: '50%',
          background: speaking
            ? `radial-gradient(circle, ${NAVY}22 0%, transparent 65%)`
            : listening
              ? 'radial-gradient(circle, rgba(4,120,87,0.14) 0%, transparent 65%)'
              : 'radial-gradient(circle, rgba(30,51,88,0.06) 0%, transparent 65%)',
          transition: 'background 300ms ease',
          animation: speaking ? 'pulseGlow 1.6s ease-in-out infinite' : 'none',
          '@keyframes pulseGlow': {
            '0%, 100%': { transform: 'scale(1)', opacity: 0.9 },
            '50%':      { transform: 'scale(1.04)', opacity: 1 },
          },
        }}
      />

      <svg
        viewBox="0 0 256 300"
        style={{
          width: '100%', display: 'block', position: 'relative',
          transform: `translateX(${swayX}px) rotate(${swayR}deg)`,
          transition: 'transform 120ms linear',
          filter: 'drop-shadow(0 12px 24px rgba(30,51,88,0.22))',
        }}
      >
        <defs>
          {/* Skin: warm South-Asian gradient #e1bea2 → #c89478 */}
          <linearGradient id="an-skin" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#c2a084" />
            <stop offset="100%" stopColor="#d5a489" />
          </linearGradient>
          {/* Hair: three-value espresso depth */}
          <linearGradient id="an-hair" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#2A1A0A" />
            <stop offset="100%" stopColor="#130C04" />
          </linearGradient>
          {/* Blazer: iEvalx pine #16403B */}
          <linearGradient id="an-suit" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#2E5650" />
            <stop offset="100%" stopColor="#16403B" />
          </linearGradient>
          {/* Lapel shadow: deeper pine fold */}
          <linearGradient id="an-lap" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#24534C" />
            <stop offset="100%" stopColor="#113230" />
          </linearGradient>
          {/* Lips: terracotta */}
          <linearGradient id="an-lip" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#C87060" />
            <stop offset="100%" stopColor="#A85840" />
          </linearGradient>
          {/* Portrait backdrop: studio dark-pine */}
          <linearGradient id="an-bg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#14403C" />
            <stop offset="100%" stopColor="#04191B" />
          </linearGradient>
          {/* Key-light: upper-left 45° warm wash */}
          <radialGradient id="an-kl" cx="0.28" cy="0.26" r="0.65">
            <stop offset="0%"   stopColor="rgba(216,152,106,0.22)" />
            <stop offset="100%" stopColor="rgba(216,152,106,0)"    />
          </radialGradient>
          {/* Cheek blush */}
          <radialGradient id="an-cheek" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%"   stopColor="rgba(220,120,100,0.18)" />
            <stop offset="100%" stopColor="rgba(220,120,100,0)"    />
          </radialGradient>
        </defs>


        {/* ── Back / side hair (rendered behind face) ────────────────── */}
        <ellipse cx="128" cy="80" rx="56" ry="32" fill="url(#an-hair)" />
        <path d="M 70 108 Q 62 130 64 164 Q 70 148 72 118 Z" fill="url(#an-hair)" />
        <path d="M 186 108 Q 194 130 192 164 Q 186 148 184 118 Z" fill="url(#an-hair)" />

        {/* ── Pine blazer body ───────────────────────────────────────── */}
        <path
          d="M 0 300 L 18 230 Q 44 205 76 196
             L 96 212 L 128 206 L 160 212 L 180 196
             Q 212 205 238 230 L 256 300 Z"
          fill="url(#an-suit)"
        />
        {/* Left notch lapel shadow */}
        <path
          d="M 76 196 L 52 252 L 80 248 L 96 212 L 128 206 Z"
          fill="url(#an-lap)"
        />
        {/* Right notch lapel shadow */}
        <path
          d="M 180 196 L 204 252 L 176 248 L 160 212 L 128 206 Z"
          fill="url(#an-lap)"
        />
        {/* White shirt V between lapels */}
        <path
          d="M 102 196 L 128 212 L 154 196 L 150 236 L 128 242 L 106 236 Z"
          fill="#F2F6F1"
        />
        {/* Brand-sage #7F9E7E button accent */}
        <circle cx="128" cy="258" r="4" fill="#7F9E7E" />

        {/* ── Neck ───────────────────────────────────────────────────── */}
        <rect x="119" y="178" width="18" height="22" rx="7" fill="url(#an-skin)" />

        {/* ── Ears (drawn before face; face covers inner) ────────────── */}
        <ellipse cx="76"  cy="120" rx="8"  ry="12" fill="#B07448" />
        <ellipse cx="180" cy="120" rx="8"  ry="12" fill="#B07448" />

        {/* ── Face oval ──────────────────────────────────────────────── */}
        <ellipse cx="128" cy="118" rx="52" ry="60" fill="url(#an-skin)" />
        {/* Chin softening / jaw shadow */}
        <ellipse cx="128" cy="172" rx="34" ry="9"  fill="#A06040" opacity="0.20" />
        {/* Shadow pass: right face plane */}
        <path
          d="M 170 82 Q 192 116 188 170 Q 174 184 160 180 Q 178 154 174 108 Z"
          fill="#804020" opacity="0.13"
        />
        {/* Under-nose shadow anchor */}
        <ellipse cx="128" cy="138" rx="14" ry="5" fill="#A06040" opacity="0.14" />

        {/* ── Eyebrows — arched feminine profile ─────────────────────── */}
        <path
          d="M 92 104 Q 108 97 122 101"
          stroke="#1C1008" strokeWidth="3.4" fill="none" strokeLinecap="round"
        />
        <path
          d="M 134 101 Q 148 97 164 104"
          stroke="#1C1008" strokeWidth="3.4" fill="none" strokeLinecap="round"
        />

        {/* ── Eyes ───────────────────────────────────────────────────── */}
        {blink ? (
          <>
            {/* Closed eyelids */}
            <path
              d="M 101 113 Q 110 118 119 113"
              stroke="#1C1008" strokeWidth="2.8" fill="none" strokeLinecap="round"
            />
            <path
              d="M 137 113 Q 146 118 155 113"
              stroke="#1C1008" strokeWidth="2.8" fill="none" strokeLinecap="round"
            />
          </>
        ) : (
          <>
            {/* Upper-lid shadow */}
            <ellipse cx="110" cy="109" rx="13" ry="4.5" fill="#A06040" opacity="0.17" />
            <ellipse cx="146" cy="109" rx="13" ry="4.5" fill="#A06040" opacity="0.17" />
            {/* Eye whites — warm off-white */}
            <ellipse cx="110" cy="113" rx="13" ry="9"   fill="#F8F4EE" />
            <ellipse cx="146" cy="113" rx="13" ry="9"   fill="#F8F4EE" />
            {/* Iris outer */}
            <circle  cx="110" cy="113" r="7.5" fill="#2A1808" />
            <circle  cx="146" cy="113" r="7.5" fill="#2A1808" />
            {/* Iris mid */}
            <circle  cx="110" cy="113" r="5.5" fill="#3A2010" />
            <circle  cx="146" cy="113" r="5.5" fill="#3A2010" />
            {/* Pupil */}
            <circle  cx="110" cy="113" r="3"   fill="#080402" />
            <circle  cx="146" cy="113" r="3"   fill="#080402" />
            {/* Primary catchlight (upper-left) */}
            <circle  cx="112"   cy="110.5" r="2.5" fill="white" />
            <circle  cx="148"   cy="110.5" r="2.5" fill="white" />
            {/* Secondary catchlight (lower-right accent) */}
            <circle  cx="107.5" cy="115.5" r="1.2" fill="white" opacity="0.55" />
            <circle  cx="143.5" cy="115.5" r="1.2" fill="white" opacity="0.55" />
            {/* Upper lash arc */}
            <path
              d="M 97 113 Q 110 103 123 113"
              stroke="#1C1008" strokeWidth="2.6" fill="none" strokeLinecap="round"
            />
            <path
              d="M 133 113 Q 146 103 159 113"
              stroke="#1C1008" strokeWidth="2.6" fill="none" strokeLinecap="round"
            />
          </>
        )}

        {/* ── Nose — defined but understated ─────────────────────────── */}
        {/* Bridge highlight */}
        <rect x="126" y="124" width="4" height="14" rx="2" fill="#D8A880" opacity="0.34" />
        {/* Nostril arches */}
        <path
          d="M 118 138 Q 121 142 125 140"
          stroke="#A06040" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.60"
        />
        <path
          d="M 131 140 Q 135 142 138 138"
          stroke="#A06040" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.60"
        />
        {/* Nose tip */}
        <path
          d="M 120 137 Q 128 141 136 137"
          stroke="#B07448" strokeWidth="1.2" fill="none" opacity="0.45"
        />

        {/* ── Mouth — filled terracotta lips for every viseme ─────────── */}
        <path
          d={mouthPath}
          fill="url(#an-lip)"
          stroke="#A05038"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transition: 'd 90ms ease' }}
        />
        {/* Lip separation line at rest */}
        {viseme === 'rest' && (
          <path
            d="M 112 143 Q 128 145 144 143"
            stroke="rgba(160,80,56,0.55)"
            strokeWidth="1"
            fill="none"
            strokeLinecap="round"
          />
        )}
        {/* Teeth highlight for open vowels */}
        {(viseme === 'a' || viseme === 'e' || viseme === 'o') && (
          <path
            d="M 108 143 L 148 143"
            stroke="#FFFFFF"
            strokeWidth="3.5"
            strokeLinecap="round"
            opacity="0.85"
          />
        )}

        {/* Cheek blush */}
        <ellipse cx="89"  cy="134" rx="16" ry="9" fill="url(#an-cheek)" />
        <ellipse cx="167" cy="134" rx="16" ry="9" fill="url(#an-cheek)" />

        {/* ── Front hair: sleek swept-back with central bun ──────────── */}
        <path
          d="M 72 106 Q 78 66 128 58 Q 178 66 184 106
             Q 162 80 128 76 Q 94 80 72 106 Z"
          fill="url(#an-hair)"
        />
        {/* Mid-tone mass (adds depth below bun) */}
        <path
          d="M 112 58 Q 128 62 144 58 Q 144 76 128 78 Q 112 76 112 58 Z"
          fill="#2A1A0A" opacity="0.68"
        />
        {/* Catch-highlight on hair top */}
        <ellipse cx="136" cy="64" rx="20" ry="8" fill="#3A2818" opacity="0.50" />
        {/* Bun — three concentric circles for depth */}
        <circle cx="128" cy="58" r="22" fill="#2A1A0A" />
        <circle cx="128" cy="58" r="17" fill="#1C1208" />
        <circle cx="128" cy="58" r="13" fill="#130C04" />
        {/* Bun shine detail */}
        <ellipse cx="124" cy="54" rx="8" ry="5.5" fill="#2A1A0A" opacity="0.60" />

        {/* ── Pearl earrings in gold bezels ──────────────────────────── */}
        {/* Left */}
        <circle cx="74"  cy="128" r="7"   fill="#C8961A" />
        <circle cx="74"  cy="128" r="4.5" fill="#F0EDE8" />
        <circle cx="73"  cy="127" r="1.5" fill="white"   opacity="0.80" />
        {/* Right */}
        <circle cx="182" cy="128" r="7"   fill="#C8961A" />
        <circle cx="182" cy="128" r="4.5" fill="#F0EDE8" />
        <circle cx="181" cy="127" r="1.5" fill="white"   opacity="0.80" />

       

        {/* 🔧 CHANGE 4/4 — Mute badge position / markup unchanged */}
        {mute && (
          <g>
            <circle cx="210" cy="60" r="18" fill="#FFFFFF" stroke="#E7EAE3" strokeWidth="1.5" />
            <path
              d="M 202 60 L 218 60 M 206 54 L 214 66"
              stroke={DANGER}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </g>
        )}
      </svg>
    </Box>
  );
};

export default Avatar;