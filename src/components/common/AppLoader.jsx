import React, { useEffect, useMemo, useRef, useState } from 'react';


const SESSION_KEY = 'ievalx_boot_reveal_shown';

/* Timings (ms) — must match the CSS below. */
const FULL_PLAY = 1900; 
const REPEAT_PLAY = 350; 
const REDUCED_PLAY = 400; 
const FADE_MS = 600; 

const AppLoader = ({ active = false }) => {
  /* Decide the minimum play ONCE per mount. */
  const minPlay = useMemo(() => {
    try {
      const reduced =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduced) return REDUCED_PLAY;
      return sessionStorage.getItem(SESSION_KEY) ? REPEAT_PLAY : FULL_PLAY;
    } catch {
      return FULL_PLAY; 
    }
  }, []);

  const [minElapsed, setMinElapsed] = useState(minPlay === 0);
  const [mounted, setMounted] = useState(true); // unmount after fade completes
  const hideTimer = useRef(null);

 
  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
      /* non-fatal */
    }
  }, []);

  /* Minimum-duration clock. */
  useEffect(() => {
    const t = window.setTimeout(() => setMinElapsed(true), minPlay);
    return () => window.clearTimeout(t);
  }, [minPlay]);

  const hidden = !active && minElapsed;

  useEffect(() => {
    window.clearTimeout(hideTimer.current);
    if (hidden) {
      hideTimer.current = window.setTimeout(() => setMounted(false), FADE_MS + 50);
    } else {
      setMounted(true);
    }
    return () => window.clearTimeout(hideTimer.current);
  }, [hidden]);

  if (!mounted) return null;

  return (
    <div
      className={`ievalx-boot${hidden ? ' done' : ''}`}
      role="status"
      aria-live="polite"
      aria-label="IEVALX is loading"
    >
      <style>{`
        .ievalx-boot{
          position:fixed;inset:0;z-index:2000;
          display:flex;flex-direction:column;align-items:center;justify-content:center;
          background:#F6F8F3;
          font-family:'Jost','DM Sans',sans-serif;
          transition:opacity ${FADE_MS}ms ease, visibility ${FADE_MS}ms;
        }
        .ievalx-boot.done{opacity:0;visibility:hidden;pointer-events:none;}
        .ievalx-boot .word{
          display:flex;
          font-family:'DM Serif Display','Jost',serif;
          font-size:clamp(44px,9vw,76px);
          color:#022124;line-height:1;
        }
        .ievalx-boot .word span{
          display:inline-block;opacity:0;
          transform:translateY(26px) rotate(2deg);
          animation:ievalxRise .7s cubic-bezier(.22,1,.36,1) forwards;
        }
        .ievalx-boot .word span:nth-child(6){color:#4E6E4D;}
        .ievalx-boot .word span:nth-child(1){animation-delay:.05s}
        .ievalx-boot .word span:nth-child(2){animation-delay:.13s}
        .ievalx-boot .word span:nth-child(3){animation-delay:.21s}
        .ievalx-boot .word span:nth-child(4){animation-delay:.29s}
        .ievalx-boot .word span:nth-child(5){animation-delay:.37s}
        .ievalx-boot .word span:nth-child(6){animation-delay:.45s}
        @keyframes ievalxRise{to{opacity:1;transform:translateY(0) rotate(0)}}
        .ievalx-boot .underline{
          margin-top:14px;width:min(320px,60vw);height:3px;border-radius:999px;
          background:#E7EAE3;overflow:hidden;position:relative;
        }
        .ievalx-boot .underline i{
          position:absolute;top:0;bottom:0;left:-40%;width:40%;border-radius:999px;
          background:linear-gradient(90deg,transparent,#7F9E7E,#4E6E4D,#7F9E7E,transparent);
          animation:ievalxShimmer 1.4s ease-in-out infinite .55s;
        }
        @keyframes ievalxShimmer{to{left:100%}}
        .ievalx-boot .tagline{
          margin-top:20px;font-size:13.5px;color:#55584F;letter-spacing:.02em;
          opacity:0;animation:ievalxFadeIn .8s ease forwards .8s;
        }
        @keyframes ievalxFadeIn{to{opacity:1}}
        .ievalx-boot .tagline b{color:#4E6E4D;font-weight:600;}
        @media (prefers-reduced-motion: reduce){
          .ievalx-boot .word span{animation:none;opacity:1;transform:none}
          .ievalx-boot .underline i{animation:none;left:30%}
          .ievalx-boot .tagline{animation:none;opacity:1}
        }
      `}</style>

      <div className="word" aria-hidden="true">
        <span>I</span>
        <span>E</span>
        <span>V</span>
        <span>A</span>
        <span>L</span>
        <span>X</span>
      </div>
      <div className="underline" aria-hidden="true">
        <i />
      </div>
      <div className="tagline">
        Where skills speak <b>louder than resumes</b>
      </div>
    </div>
  );
};

export default AppLoader;