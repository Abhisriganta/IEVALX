// ============================================================================
// ResumeBuilder.jsx  (v3 — dynamic fit-to-screen shell)
//
// CHANGELOG v3:
//   [CHANGED] Shell height is no longer a guessed calc(100vh - 120px).
//             It is now MEASURED: on mount and on every window resize the
//             shell reads its own top offset via getBoundingClientRect and
//             sets height = viewport height − top offset − bottom margin.
//             The builder therefore fits EXACTLY on any screen size,
//             regardless of the app topbar/padding around it.
//   [KEPT]    Direct-to-upload step lock (upload/processing/success allowed,
//             hero/choice redirected).
//   [KEPT]    transform:translateZ(0) containment so the studio's fixed
//             overlay stays inside this tab (sidebar remains visible).
//
// PAIRS WITH: ResumeStudio.jsx v2 (100vh → 100% fixes) — deploy together.
//
// Location: src/components/jobseeker/Workspace/ResumeBuilder.jsx
// ============================================================================

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { useSearchParams } from 'react-router-dom';

import AIResumeBuilderApp from './AIResumeBuilder/ResumeStudio';

const PRIMARY = '#1E3358';
const BOTTOM_GAP = 16;   // breathing room below the shell
const MIN_HEIGHT = 480;  // never collapse below this

const ResumeBuilder = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [ready, setReady] = useState(false);

  /* ── Dynamic fit-to-screen height ─────────────────────────────────
     Measure where this shell actually starts on screen and size it to
     fill the remaining viewport. Re-measures on resize + orientation
     change, so it fits laptops, monitors, and small screens alike.   */
  const shellRef = useRef(null);
  const [shellHeight, setShellHeight] = useState(null);

  const measure = useCallback(() => {
    const el = shellRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top;
    const vh  = window.innerHeight;
    setShellHeight(Math.max(MIN_HEIGHT, Math.floor(vh - top - BOTTOM_GAP)));
  }, []);

  useEffect(() => {
    // Measure after first paint so layout above us has settled
    const raf = requestAnimationFrame(measure);
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
    };
  }, [measure]);

  /* ── Force the studio to open at the UPLOAD step ─────────────────── */
  useEffect(() => {
    const view = searchParams.get('rsView');
    const step = searchParams.get('rsStep');

    if (view !== 'landing' && view !== null) {
      // Studio is in the editor (rsView=editor/app) — leave it alone.
      setReady(true);
      return;
    }

    // Steps that are part of the real upload flow — never redirect these.
    const ALLOWED_LANDING_STEPS = ['upload', 'processing', 'success'];

    if (view === null || !ALLOWED_LANDING_STEPS.includes(step)) {
      const next = new URLSearchParams(searchParams);
      next.set('rsView', 'landing');
      next.set('rsStep', 'upload');
      setSearchParams(next, { replace: true });
      return;
    }

    setReady(true);
  }, [searchParams, setSearchParams]);

  return (
    <Box
      ref={shellRef}
      sx={{
        /* transform creates a containing block for the studio's
           position:fixed overlay → it fills this shell, not the viewport. */
        transform: 'translateZ(0)',
        position: 'relative',
        height: shellHeight ? `${shellHeight}px` : 'calc(100vh - 140px)',
        minHeight: MIN_HEIGHT,
        borderRadius: '16px',
        overflow: 'hidden',
        border: '1px solid #E5E7EB',
        bgcolor: '#fff',
        '& > *': { minWidth: 0 },
      }}
    >
      {ready && shellHeight ? (
        <AIResumeBuilderApp />
      ) : (
        <Box
          sx={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CircularProgress size={28} sx={{ color: PRIMARY }} />
        </Box>
      )}
    </Box>
  );
};

export default ResumeBuilder;