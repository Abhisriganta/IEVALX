import React, { useEffect, useRef } from "react";


const AIAvatar = ({ isPlaying = false, isListening = false, isWaiting = false }) => {
  const lidLRef = useRef(null);
  const lidRRef = useRef(null);
  const lowerLipRef = useRef(null);
  const lowerGlossRef = useRef(null);
  const talkLoopRef = useRef(null);
  const blinkTimerRef = useRef(null);
  const lipPhaseRef = useRef(0);
  const lipCurRef = useRef(0);
  const lipTgtRef = useRef(0);
  const fadeIntervalRef = useRef(null);

  // ── LID HELPERS ──────────────────────────────────────────────────────────
  const LID_OPEN_CY = 130, LID_CLOSE_CY = 142;
  const LID_OPEN_RY = 7,   LID_CLOSE_RY = 14;

  const setLid = (el, t) => {
    if (!el) return;
    el.setAttribute("cy", (LID_OPEN_CY + (LID_CLOSE_CY - LID_OPEN_CY) * t).toFixed(1));
    el.setAttribute("ry", (LID_OPEN_RY + (LID_CLOSE_RY - LID_OPEN_RY) * t).toFixed(1));
  };

  // ── BLINK ────────────────────────────────────────────────────────────────
  const runBlink = (cb) => {
    const CLOSE = 90, HOLD = 20, OPEN = 110;
    let phase = "closing";
    let t0 = performance.now();
    const step = (now) => {
      const dt = now - t0;
      if (phase === "closing") {
        const p = Math.min(dt / CLOSE, 1);
        const t = p * p; // ease-in
        setLid(lidLRef.current, t);
        setLid(lidRRef.current, t);
        if (p >= 1) { phase = "hold"; t0 = now; }
        requestAnimationFrame(step);
      } else if (phase === "hold") {
        setLid(lidLRef.current, 1);
        setLid(lidRRef.current, 1);
        if (dt >= HOLD) { phase = "opening"; t0 = now; }
        requestAnimationFrame(step);
      } else {
        const p = Math.min(dt / OPEN, 1);
        const t = 1 - p * (2 - p); // ease-out
        setLid(lidLRef.current, t);
        setLid(lidRRef.current, t);
        if (p >= 1) {
          setLid(lidLRef.current, 0);
          setLid(lidRRef.current, 0);
          if (cb) cb();
          return;
        }
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  };

  const scheduleBlink = () => {
    const delay = 2500 + Math.random() * 3500;
    blinkTimerRef.current = setTimeout(() => {
      const dbl = Math.random() < 0.15;
      runBlink(() => {
        if (dbl) setTimeout(() => runBlink(() => {}), 180 + Math.random() * 60);
      });
      scheduleBlink();
    }, delay);
  };

  // ── LIP HELPERS ──────────────────────────────────────────────────────────
  const setLowerLip = (drop) => {
    if (lowerLipRef.current)
      lowerLipRef.current.style.transform = `translateY(${drop.toFixed(2)}px)`;
    if (lowerGlossRef.current)
      lowerGlossRef.current.style.transform = `translateY(${drop.toFixed(2)}px)`;
  };

  const startLips = () => {
    lipPhaseRef.current = 0;
    lipCurRef.current = 0;
    lipTgtRef.current = 0;
    if (fadeIntervalRef.current) { clearInterval(fadeIntervalRef.current); fadeIntervalRef.current = null; }
    talkLoopRef.current = setInterval(() => {
      lipPhaseRef.current += 0.11 + Math.random() * 0.13;
      const w1 = Math.abs(Math.sin(lipPhaseRef.current));
      const w2 = Math.abs(Math.sin(lipPhaseRef.current * 1.8 + 0.8));
      const paused = Math.random() < 0.10;
      const amp = paused ? 0.05 : (0.45 + Math.random() * 0.50);
      lipTgtRef.current = (w1 * 0.65 + w2 * 0.35) * amp;
      const lerpRate = lipTgtRef.current > lipCurRef.current ? 0.35 : 0.18;
      lipCurRef.current += (lipTgtRef.current - lipCurRef.current) * lerpRate;
      setLowerLip(lipCurRef.current * 9); // max 9px drop
    }, 48);
  };

  const stopLips = () => {
    if (talkLoopRef.current) { clearInterval(talkLoopRef.current); talkLoopRef.current = null; }
    let c = lipCurRef.current;
    fadeIntervalRef.current = setInterval(() => {
      c *= 0.72;
      setLowerLip(c * 9);
      if (c < 0.005) {
        setLowerLip(0);
        clearInterval(fadeIntervalRef.current);
        fadeIntervalRef.current = null;
      }
    }, 28);
    lipCurRef.current = 0;
    lipTgtRef.current = 0;
  };

  // ── INIT BLINK on mount ───────────────────────────────────────────────────
  useEffect(() => {
    setLid(lidLRef.current, 0);
    setLid(lidRRef.current, 0);
    const initTimer = setTimeout(scheduleBlink, 1500);
    return () => {
      clearTimeout(initTimer);
      if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);
    };
  }, []);

  // ── REACT TO isPlaying CHANGES ────────────────────────────────────────────
  useEffect(() => {
    if (isPlaying) {
      startLips();
    } else {
      stopLips();
    }
    return () => {
      if (talkLoopRef.current) clearInterval(talkLoopRef.current);
      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
    };
  }, [isPlaying]);

  // Mouth display: "smile" default, "talk" when playing, "rest" when listening/waiting
  const mouthState = isPlaying ? "talk" : (isListening || isWaiting) ? "rest" : "smile";

  return (
    <div style={{
      width: "100%",
      height: "100%",
      position: "relative",
      overflow: "hidden",
      background: "linear-gradient(160deg,#052a2d 0%,#022124 50%,#011618 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      {/* CSS keyframes injected once */}
      <style>{`
        @keyframes av-breathe    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
        @keyframes av-body-sway  { 0%,100%{transform:rotate(0deg)} 35%{transform:rotate(0.5deg)} 70%{transform:rotate(-0.35deg)} }
        @keyframes av-head-nod   { 0%,100%{transform:rotate(0deg) translateY(0)} 28%{transform:rotate(0.8deg) translateY(-2px)} 70%{transform:rotate(-0.5deg) translateY(1px)} }
        @keyframes av-head-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        @keyframes av-brow-l     { 0%,100%{transform:translateY(0)} 42%{transform:translateY(-2.5px)} }
        @keyframes av-brow-r     { 0%,100%{transform:translateY(0)} 42%{transform:translateY(-2px)} }
        @keyframes av-ai-bar     { 0%,100%{height:5px;opacity:.3} 50%{height:28px;opacity:1} }
        .av-body-grp   { animation: av-body-sway 7s ease-in-out infinite; transform-origin: 200px 600px; }
        .av-torso-grp  { animation: av-breathe 4.5s ease-in-out infinite; transform-origin: 200px 400px; }
        .av-head-grp   { animation: av-head-nod 5s ease-in-out infinite, av-head-float 7s ease-in-out infinite; transform-origin: 200px 300px; }
        .av-brow-l-g   { animation: av-brow-l 6s 1.2s ease-in-out infinite; }
        .av-brow-r-g   { animation: av-brow-r 6s 2.5s ease-in-out infinite; }
        .av-ai-b       { width:3px; border-radius:3px; background:#8FB08E; animation: av-ai-bar 1.1s ease-in-out infinite; }
        .av-ai-b:nth-child(1){animation-delay:.00s} .av-ai-b:nth-child(2){animation-delay:.09s}
        .av-ai-b:nth-child(3){animation-delay:.18s} .av-ai-b:nth-child(4){animation-delay:.06s}
        .av-ai-b:nth-child(5){animation-delay:.14s} .av-ai-b:nth-child(6){animation-delay:.22s}
        .av-ai-b:nth-child(7){animation-delay:.03s} .av-ai-b:nth-child(8){animation-delay:.12s}
        .av-ai-b:nth-child(9){animation-delay:.20s} .av-ai-b:nth-child(10){animation-delay:.08s}
        .av-ai-b:nth-child(11){animation-delay:.16s} .av-ai-b:nth-child(12){animation-delay:.25s}
        .av-ai-b:nth-child(13){animation-delay:.04s}
      `}</style>

      {/* Radial glow background */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse at 50% 40%,rgba(127,158,126,0.20) 0%,transparent 65%)",
      }} />

      {/* SVG Avatar */}
      <div style={{ position: "relative", zIndex: 4, width: "min(85%, 360px)", aspectRatio: "1", marginBottom: 0 }}>
        <svg viewBox="0 0 400 420" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
          <defs>
            <clipPath id="av-circleClip">
              <circle cx="200" cy="190" r="185"/>
            </clipPath>
            <linearGradient id="av-skF" x1="30%" y1="0%" x2="70%" y2="100%">
              <stop offset="0%" stopColor="#f5c89a"/>
              <stop offset="100%" stopColor="#e8a870"/>
            </linearGradient>
            <linearGradient id="av-skN" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#efc08e"/>
              <stop offset="100%" stopColor="#dda06a"/>
            </linearGradient>
            <linearGradient id="av-sL" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0A3F42"/>
              <stop offset="100%" stopColor="#022124"/>
            </linearGradient>
            <linearGradient id="av-sR" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#083538"/>
              <stop offset="100%" stopColor="#011A1C"/>
            </linearGradient>
            <linearGradient id="av-sh" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#e8ecf4"/>
              <stop offset="100%" stopColor="#d0d8ea"/>
            </linearGradient>
            <linearGradient id="av-hG" x1="20%" y1="0%" x2="80%" y2="100%">
              <stop offset="0%"   stopColor="#2c2018"/>
              <stop offset="40%"  stopColor="#1a1210"/>
              <stop offset="100%" stopColor="#0e0a08"/>
            </linearGradient>
            <linearGradient id="av-tG" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%"   stopColor="#C68A3E"/>
              <stop offset="100%" stopColor="#8A5324"/>
            </linearGradient>
            <linearGradient id="av-bgG" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%"   stopColor="#063336"/>
              <stop offset="100%" stopColor="#021618"/>
            </linearGradient>
            <filter id="av-fHead">
              <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="rgba(0,0,0,0.25)"/>
            </filter>
            <filter id="av-fBody">
              <feDropShadow dx="0" dy="10" stdDeviation="14" floodColor="rgba(0,0,0,0.30)"/>
            </filter>
          </defs>

          {/* Background circle */}
          <circle cx="200" cy="190" r="185" fill="url(#av-bgG)"/>
          <ellipse cx="200" cy="80" rx="130" ry="70" fill="rgba(127,158,126,0.10)"/>

          <g clipPath="url(#av-circleClip)">

            {/* ── BODY / SUIT ── */}
            <g className="av-body-grp">
              <g className="av-torso-grp" filter="url(#av-fBody)">
                {/* Left suit half */}
                <path d="M 15 420 L 15 310 Q 15 285 60 272 Q 110 260 155 257 L 200 256 L 200 420 Z"
                  fill="url(#av-sL)"/>
                {/* Right suit half */}
                <path d="M 385 420 L 385 310 Q 385 285 340 272 Q 290 260 245 257 L 200 256 L 200 420 Z"
                  fill="url(#av-sR)"/>
                {/* Shoulder highlights */}
                <path d="M 30 308 Q 90 272 155 260"
                  stroke="rgba(255,255,255,0.12)" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
                <path d="M 370 308 Q 310 272 245 260"
                  stroke="rgba(255,255,255,0.08)" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
                {/* Shirt strips */}
                <path d="M 183 238 L 194 290 L 200 290 L 200 420 L 188 420 L 176 238 Z" fill="url(#av-sh)"/>
                <path d="M 217 238 L 206 290 L 200 290 L 200 420 L 212 420 L 224 238 Z" fill="url(#av-sh)"/>
                {/* Lapels */}
                <path d="M 148 258 L 200 318 L 200 288 L 158 232 Z" fill="#0A3538"/>
                <path d="M 252 258 L 200 318 L 200 288 L 242 232 Z" fill="#052528"/>
                {/* Collar */}
                <path d="M 178 236 L 192 260 L 200 255 Q 192 228 178 236 Z" fill="url(#av-sh)"/>
                <path d="M 222 236 L 208 260 L 200 255 Q 208 228 222 236 Z" fill="url(#av-sh)"/>
                <path d="M 178 236 L 192 260" stroke="rgba(0,0,0,0.15)" strokeWidth="1.2" fill="none"/>
                <path d="M 222 236 L 208 260" stroke="rgba(0,0,0,0.12)" strokeWidth="1.2" fill="none"/>
                {/* Tie */}
                <polygon points="192,242 208,242 212,255 200,262 188,255" fill="#B87A2E"/>
                <path d="M 188 255 L 200 262 L 212 255 L 206 390 L 200 396 L 194 390 Z" fill="url(#av-tG)"/>
                <path d="M 199 264 L 200 262 L 201 264 L 201 350 L 200 354 L 199 350 Z" fill="rgba(255,255,255,0.12)"/>
                <line x1="200" y1="242" x2="200" y2="262" stroke="rgba(0,0,0,0.18)" strokeWidth="1"/>
              </g>
            </g>

            {/* ── NECK ── */}
            <rect x="183" y="210" width="34" height="52" rx="8" fill="url(#av-skN)"/>
            <rect x="183" y="210" width="6"  height="52" rx="4" fill="rgba(0,0,0,0.07)"/>
            <rect x="211" y="210" width="6"  height="52" rx="4" fill="rgba(0,0,0,0.10)"/>

            {/* ── HEAD ── */}
            <g className="av-head-grp" filter="url(#av-fHead)">
              {/* Face */}
              <ellipse cx="200" cy="142" rx="88" ry="96" fill="url(#av-skF)"/>

              {/* Ears */}
              <path d="M 115 138 C 104 140 98 148 98 156 C 98 166 104 174 114 177 C 118 178 122 177 123 174 C 123 165 121 155 121 146 C 121 141 118 138 115 138 Z"
                fill="#e8a870"/>
              <path d="M 115 144 C 110 146 108 152 110 158 C 111 164 115 168 119 167 C 118 161 116 154 116 147 Z"
                fill="#c8845a"/>
              <ellipse cx="113" cy="177" rx="7" ry="5" fill="#e0a068"/>

              <path d="M 285 138 C 296 140 302 148 302 156 C 302 166 296 174 286 177 C 282 178 278 177 277 174 C 277 165 279 155 279 146 C 279 141 282 138 285 138 Z"
                fill="#daa068"/>
              <path d="M 285 144 C 290 146 292 152 290 158 C 289 164 285 168 281 167 C 282 161 284 154 284 147 Z"
                fill="#be7848"/>
              <ellipse cx="287" cy="177" rx="7" ry="5" fill="#d49860"/>

              {/* Gold stud earrings */}
              <circle cx="113" cy="178" r="4.5" fill="#f0d060"/>
              <circle cx="113" cy="178" r="4.5" fill="none" stroke="#c8a830" strokeWidth="0.8"/>
              <circle cx="112" cy="177" r="1.5" fill="rgba(255,255,255,0.55)"/>
              <circle cx="287" cy="178" r="4.5" fill="#f0d060"/>
              <circle cx="287" cy="178" r="4.5" fill="none" stroke="#c8a830" strokeWidth="0.8"/>
              <circle cx="286" cy="177" r="1.5" fill="rgba(255,255,255,0.55)"/>

              {/* Hair */}
              <path d="M 114 138 C 110 106 112 70 128 48 C 148 24 174 14 200 14 C 226 14 252 24 272 48 C 288 70 290 106 286 138 C 272 120 252 110 234 98 C 220 90 210 88 200 88 C 190 88 180 90 166 98 C 148 110 128 120 114 138 Z"
                fill="url(#av-hG)"/>
              <path d="M 162 24 C 182 16 218 16 238 24"
                stroke="rgba(255,255,255,0.18)" strokeWidth="4" fill="none" strokeLinecap="round"/>

              {/* Forehead highlights / temple shadows */}
              <ellipse cx="200" cy="104" rx="42" ry="14" fill="rgba(255,255,255,0.07)"/>
              <ellipse cx="148" cy="112" rx="18" ry="10" fill="rgba(0,0,0,0.06)"/>
              <ellipse cx="252" cy="112" rx="18" ry="10" fill="rgba(0,0,0,0.06)"/>

              {/* Eyebrows */}
              <g className="av-brow-l-g">
                <path d="M 161 118 Q 175 112 189 116"
                  stroke="#1a1210" strokeWidth="4.5" fill="none" strokeLinecap="round"/>
              </g>
              <g className="av-brow-r-g">
                <path d="M 211 116 Q 225 112 239 118"
                  stroke="#1a1210" strokeWidth="4.5" fill="none" strokeLinecap="round"/>
              </g>

              {/* Left Eye */}
              <ellipse cx="175" cy="138" rx="18" ry="13" fill="white"/>
              <circle cx="176" cy="139" r="8.5" fill="#3a2a18"/>
              <circle cx="177" cy="140" r="5"   fill="#1a0e06"/>
              <circle cx="180" cy="136" r="2.5" fill="white"/>
              <ellipse ref={lidLRef} id="av-lid-l" cx="175" cy="130" rx="19" ry="7" fill="url(#av-skF)"/>

              {/* Right Eye */}
              <ellipse cx="225" cy="138" rx="18" ry="13" fill="white"/>
              <circle cx="224" cy="139" r="8.5" fill="#3a2a18"/>
              <circle cx="225" cy="140" r="5"   fill="#1a0e06"/>
              <circle cx="228" cy="136" r="2.5" fill="white"/>
              <ellipse ref={lidRRef} id="av-lid-r" cx="225" cy="130" rx="19" ry="7" fill="url(#av-skF)"/>

              {/* Nose */}
              <ellipse cx="193" cy="162" rx="5" ry="4" fill="rgba(0,0,0,0.12)"/>
              <ellipse cx="207" cy="162" rx="5" ry="4" fill="rgba(0,0,0,0.12)"/>
              <ellipse cx="200" cy="164" rx="4" ry="3" fill="rgba(0,0,0,0.08)"/>

              {/* ── MOUTH STATES ── */}

              {/* REST — closed beautiful lips */}
              {mouthState === "rest" && (
                <g>
                  <path d="M 176 182 C 183 177 191 174 200 175 C 209 174 217 177 224 182 C 218 184 210 186 200 186 C 190 186 182 184 176 182 Z"
                    fill="#c84848"/>
                  <path d="M 191 175 C 196 172 200 173 200 175" fill="#b03838"/>
                  <path d="M 209 175 C 204 172 200 173 200 175" fill="#b03838"/>
                  <path d="M 176 182 C 180 190 190 196 200 196 C 210 196 220 190 224 182 C 218 184 210 186 200 186 C 190 186 182 184 176 182 Z"
                    fill="#bc3c3c"/>
                  <path d="M 176 182 C 188 184 200 184 200 184 C 200 184 212 184 224 182"
                    stroke="#8a2828" strokeWidth="1.2" fill="none"/>
                  <ellipse cx="196" cy="179" rx="7"  ry="2.5" fill="rgba(255,200,190,0.30)"/>
                  <ellipse cx="200" cy="191" rx="10" ry="3"   fill="rgba(255,210,200,0.25)"/>
                </g>
              )}

              {/* TALK — upper fixed + lower lip moves via ref */}
              {mouthState === "talk" && (
                <g>
                  {/* Upper lip — fixed */}
                  <path d="M 178 183 Q 189 177 200 179 Q 211 177 222 183 L 219 184 Q 210 188 200 187 Q 190 188 181 184 Z"
                    fill="#c84035"/>
                  <path d="M 190 179 Q 200 176 210 179"
                    stroke="rgba(255,200,180,0.25)" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                  {/* Lower lip — moves via JS ref */}
                  <path
                    ref={lowerLipRef}
                    d="M 181 184 Q 190 188 200 187 Q 210 188 219 184 Q 214 193 200 195 Q 186 193 181 184 Z"
                    fill="#b03428"
                  />
                  <ellipse
                    ref={lowerGlossRef}
                    cx="200" cy="191" rx="10" ry="2.5"
                    fill="rgba(255,255,255,0.13)"
                  />
                </g>
              )}

              {/* SMILE — default resting smile */}
              {mouthState === "smile" && (
                <g>
                  <path d="M 176 183 C 183 177 191 174 200 175 C 209 174 217 177 224 183 C 218 185 210 187 200 187 C 190 187 182 185 176 183 Z"
                    fill="#c84848"/>
                  <path d="M 191 175 C 196 172 200 173 200 175" fill="#b03838"/>
                  <path d="M 209 175 C 204 172 200 173 200 175" fill="#b03838"/>
                  <path d="M 176 183 C 179 191 189 197 200 197 C 211 197 221 191 224 183 C 218 185 210 187 200 187 C 190 187 182 185 176 183 Z"
                    fill="#bc3c3c"/>
                  <path d="M 176 183 C 188 185 200 185 212 185 C 216 185 220 184 224 183"
                    stroke="#8a2828" strokeWidth="1.2" fill="none"/>
                  <ellipse cx="196" cy="179" rx="7"  ry="2.5" fill="rgba(255,200,190,0.30)"/>
                  <ellipse cx="200" cy="192" rx="10" ry="3"   fill="rgba(255,210,200,0.25)"/>
                </g>
              )}

              {/* Cheek blush */}
              <ellipse cx="148" cy="162" rx="16" ry="10" fill="rgba(210,100,70,0.10)"/>
              <ellipse cx="252" cy="162" rx="16" ry="10" fill="rgba(210,100,70,0.10)"/>
              {/* Face top highlight */}
              <ellipse cx="200" cy="95" rx="38" ry="20" fill="rgba(255,255,255,0.06)"/>
            </g>{/* head-grp */}

          </g>{/* clipPath */}

          {/* Circle border rings */}
          <circle cx="200" cy="190" r="185" fill="none" stroke="rgba(237,243,236,0.10)" strokeWidth="2"/>
          <circle cx="200" cy="190" r="182" fill="none" stroke="rgba(127,158,126,0.22)" strokeWidth="1"/>
        </svg>
      </div>

      {/* ── AI VOICE BARS at bottom ── */}
      <div style={{
        position: "absolute",
        bottom: 0, left: 0, right: 0,
        height: 52,
        background: "rgba(2,22,24,0.86)",
        backdropFilter: "blur(12px)",
        borderTop: "1px solid rgba(127,158,126,0.14)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "3.5px",
        opacity: isPlaying ? 1 : 0.28,
        transition: "opacity 0.5s ease",
      }}>
        {Array.from({ length: 13 }).map((_, i) => (
          <div key={i} className="av-ai-b" />
        ))}
      </div>
    </div>
  );
};

export default AIAvatar;