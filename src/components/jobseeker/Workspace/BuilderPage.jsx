// ============================================================================
// BuilderPage.jsx  (v4 — cross-tab file handoff)
//
// CHANGELOG v4:
//   • NEW: Claims files handed off from the Workspace tab via IndexedDB.
//     WorkspaceHome opens this route in a NEW TAB with ?rbTransfer=<key>;
//     this page calls takeTransfer(key) (consume-once: read + delete),
//     captures the File into initialFileRef, strips rbTransfer from the
//     URL (replace:true — a refresh won't retry a claimed key), and only
//     then mounts the studio, which auto-uploads via initialFile.
//   • StrictMode-safe: the claim effect may run twice; a ref guard skips
//     the second invoke, and the studio mounts only after the first
//     claim resolves — the file is present on the studio's first mount.
//   • KEPT: same-tab handoff via location.state.droppedFile (fallback
//     path when popups are blocked), and the upload-only landing lock.
//
// Route: /jobseeker/workspace/builder   (full screen, no DashboardLayout)
// Location: src/components/jobseeker/Workspace/BuilderPage.jsx
// ============================================================================

import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';

import AIResumeBuilderApp from './AIResumeBuilder/ResumeStudio';
import { takeTransfer } from './resumeTransfer';

const WORKSPACE_PATH = '/jobseeker/workspace/resume-builder';
const ALLOWED_LANDING_STEPS = ['upload', 'processing', 'success'];

const BuilderPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [ready, setReady] = useState(false);

  // Same-tab handoff (popup-blocked fallback) — captured once.
  const initialFileRef = useRef(location.state?.droppedFile || null);

  // Cross-tab handoff: gate the studio until the transfer (if any) is
  // claimed, so initialFile is present on the studio's first mount.
  const [transferSettled, setTransferSettled] = useState(
    () => !new URLSearchParams(window.location.search).get('rbTransfer'),
  );
  const claimStarted = useRef(false);

  useEffect(() => {
    const key = searchParams.get('rbTransfer');
    if (!key) return;
    if (claimStarted.current) return;   // StrictMode second invoke: skip
    claimStarted.current = true;

    (async () => {
      const file = await takeTransfer(key);
      if (file && !initialFileRef.current) {
        initialFileRef.current = file;
      }
      // Strip the consumed key so refresh/back never retries it.
      const next = new URLSearchParams(window.location.search);
      next.delete('rbTransfer');
      setSearchParams(next, { replace: true });
      setTransferSettled(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Upload-only landing lock (hero/choice removed) */
  useEffect(() => {
    const view = searchParams.get('rsView');
    const step = searchParams.get('rsStep');

    if (view !== null && view !== 'landing') {
      setReady(true);
      return;
    }

    if (view === null || !ALLOWED_LANDING_STEPS.includes(step)) {
      const next = new URLSearchParams(searchParams);
      next.set('rsView', 'landing');
      next.set('rsStep', 'upload');
      setSearchParams(next, { replace: true });
      return;
    }

    setReady(true);
  }, [searchParams, setSearchParams]);

  if (!ready || !transferSettled) return null;

  /* In a spawned tab (window.opener set), "Back to iEvalx" closes the
     tab — the user's Workspace tab is still open behind it. If the
     browser refuses (or this is a direct visit), fall through to a
     normal navigation after a beat.                                    */
  const handleClose = () => {
    if (window.opener && !window.opener.closed) {
      window.close();
      setTimeout(() => navigate(WORKSPACE_PATH), 150);
      return;
    }
    navigate(WORKSPACE_PATH);
  };

  return (
    <AIResumeBuilderApp
      onClose={handleClose}
      initialFile={initialFileRef.current}
    />
  );
};

export default BuilderPage;