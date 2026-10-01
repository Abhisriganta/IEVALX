
import { useCallback, useEffect, useRef, useState } from 'react';
import proctoringService from '@/services/api/jobseeker/Proctoringservice';
const CONFIG = {
  IDENTITY_CHECK_INTERVAL: 3000,      // unchanged (was already reasonable)
  IDENTITY_INITIAL_DELAY:  1000,      // was 500
  IDENTITY_FRAME_QUALITY:  0.85,
  IDENTITY_FRAME_WIDTH:    640,
  IDENTITY_FRAME_HEIGHT:   480,
  VOICE_CHUNK_MS:          2500,      // was 2000
  VOICE_PCM_SAMPLE_RATE:   16000,
  VOICE_PCM_DURATION_MS:   2500,
  DEVTOOLS_CHECK_INTERVAL: 3000,
  DEVTOOLS_SIZE_THRESHOLD: 160,
  FRONTEND_COOLDOWN_MS:    3000,      // was 1000
  SERVER_WARN_COOLDOWN_MS: 5000,      // NEW — per-type dedupe for banners
  POST_WARN_QUIET_MS:      2000,      // NEW — pause identity ticks briefly after a warn
};


export default function useAssessmentProctoring({
  assignmentId,
  moduleCode = 'AI-ASM',
  scheduledInterviewId = null,
  isPractice = false,
  videoRef,
  mediaStream,
  isActive,
  onTerminate,
  onWarning,
}) {
   const frameCaptureRef  = useRef(null);
  const identityIntervalRef = useRef(null);
  const voiceRecorderRef = useRef(null);
  const canvasRef        = useRef(null);
  const lastViolationAt  = useRef({});
  const sessionIdRef     = useRef(null);
  const terminatedRef    = useRef(false);
  const identityBusyRef  = useRef(false);
  const onTerminateRef   = useRef(onTerminate);
  const onWarningRef     = useRef(onWarning);
  // HARDENING: per-event-type dedupe + quiet window.
  const lastServerWarnAt      = useRef({});
  const identityQuietUntilRef = useRef(0);
  useEffect(() => { onTerminateRef.current = onTerminate; onWarningRef.current = onWarning; });

  const _shouldSurfaceServerWarn = (eventType) => {
    const now = Date.now();
    const last = lastServerWarnAt.current[eventType] || 0;
    if (now - last < CONFIG.SERVER_WARN_COOLDOWN_MS) return false;
    lastServerWarnAt.current[eventType] = now;
    return true;
  };

  const [sessionId,   setSessionId]   = useState(null);
  const [enrolled,    setEnrolled]    = useState({ face: false, voice: false });
  const [faceStatus,  setFaceStatus]  = useState('initializing');
  const [lastWarning, setLastWarning] = useState(null);
  const [terminated,  setTerminated]  = useState(false);

  /* ── SESSION START — call once on mount when isActive becomes true ──── */
  useEffect(() => {
    if (!isActive || !assignmentId || sessionIdRef.current) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await proctoringService.startSession({
          assignmentId, moduleCode, scheduledInterviewId, isPractice,
        });
        if (cancelled) return;
        if (res?.success) {
          sessionIdRef.current = res.session_id;
          setSessionId(res.session_id);
          setEnrolled(res.enrolled || { face: false, voice: false });
        }
      } catch (err) {
        console.warn('[Proctor] session start failed', err);
      }
    })();
    return () => { cancelled = true; };
  }, [isActive, assignmentId, moduleCode, scheduledInterviewId, isPractice]);

  /* ── SESSION END — on unmount or terminate ──────────────────────────── */
  useEffect(() => {
    return () => {
      const sid = sessionIdRef.current;
      if (sid) {
        proctoringService.endSession(sid).catch(() => {});
        sessionIdRef.current = null;
      }
    };
  }, []);

  /* ── Send a violation event via REST ────────────────────────────────── */
  const sendViolation = useCallback(async (eventType, severity = 'medium', metadata = {}) => {
    const sid = sessionIdRef.current;
    if (!sid || terminatedRef.current) return;
    const now = Date.now();
    if (now - (lastViolationAt.current[eventType] || 0) < CONFIG.FRONTEND_COOLDOWN_MS) return;
    lastViolationAt.current[eventType] = now;

    try {
      const res = await proctoringService.recordEvent({
        sessionId: sid, event: eventType, severity, metadata,
      });
      if (res?.action === 'warn') {
        identityQuietUntilRef.current = Date.now() + CONFIG.POST_WARN_QUIET_MS;
        const w = { event: eventType, strike: res.strike, maxStrikes: res.max_strikes, message: res.message };
        setLastWarning(w);
        onWarningRef.current?.(w);
      } else if (res?.action === 'terminate') {
        terminatedRef.current = true;
        setTerminated(true);
        setLastWarning({ event: eventType, strike: res.strike, maxStrikes: res.max_strikes, message: res.message, terminate: true });
        onTerminateRef.current?.(eventType, res.message);
      }
    } catch (err) {
      // Fail-open: proctoring must never break the assessment
    }
  }, []);

  /* ── Send an identity-check frame via REST ──────────────────────────── */
  const sendIdentityFrame = useCallback(async () => {
    const sid   = sessionIdRef.current;
    const video = videoRef?.current;
    if (!sid || terminatedRef.current || !video || video.readyState < 2 || !video.videoWidth) return;
    if (identityBusyRef.current) return;
    // HARDENING: brief post-warn quiet window.
    if (Date.now() < identityQuietUntilRef.current) return;
    identityBusyRef.current = true;
    try {
      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas');
        canvasRef.current.width  = CONFIG.IDENTITY_FRAME_WIDTH;
        canvasRef.current.height = CONFIG.IDENTITY_FRAME_HEIGHT;
      }
      const canvas = canvasRef.current;
      const ctx    = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', CONFIG.IDENTITY_FRAME_QUALITY);
      const base64  = dataUrl.split(',')[1] || '';

      const res = await proctoringService.identityCheck({ sessionId: sid, imageBase64: base64 });
      const evt = res?.violation_type || 'identity_mismatch';
            if (res?.action === 'warn') {
        identityQuietUntilRef.current = Date.now() + CONFIG.POST_WARN_QUIET_MS;
        const w = { event: evt, strike: res.strike, maxStrikes: res.max_strikes, message: res.message };
        setLastWarning(w);  // ALWAYS refresh banner text
        if (_shouldSurfaceServerWarn(evt)) {
          onWarningRef.current?.(w);   // toast/callback deduped
        } else {
          console.log('[Proctor:identity] SUPPRESS duplicate warn', evt, 'strike=', res.strike);
        }
      } else if (res?.action === 'terminate') {
        terminatedRef.current = true;
        setTerminated(true);
        onTerminateRef.current?.(evt, res.message);
      }

    } catch (err) { /* fail-open */ } finally { identityBusyRef.current = false; }
  }, [videoRef]);


  /* ── LAYER 2: Browser monitoring ────────────────────────────────────── */
  useEffect(() => {
    if (!isActive || !sessionId) return;
    const onVisibility = () => { if (document.hidden) sendViolation('tab_switch', 'medium', { reason: 'tab_switch' }); };
    const onBlur = () => sendViolation('window_blur', 'low', { reason: 'window_blur' });
    const onKey  = (e) => {
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && ['I','J','C'].includes(e.key))) {
        e.preventDefault();
        sendViolation('devtools_open', 'medium', { reason: 'devtools_shortcut' });
      }
    };
    const onContextMenu = (e) => {
      e.preventDefault();
      sendViolation('right_click', 'low', { reason: 'right_click' });
    };
    const onCopy  = () => sendViolation('clipboard_attempt', 'low', { reason: 'copy' });
    const onPaste = () => sendViolation('clipboard_attempt', 'low', { reason: 'paste' });
    const onFullscreen = () => {
      if (!document.fullscreenElement) {
        sendViolation('fullscreen_exit', 'medium', { reason: 'fullscreen_exit' });
      }
    };

    let devtoolsWasOpen = false;
    const devtoolsPoller = setInterval(() => {
      let detected = false;
      const wDiff = window.outerWidth  - window.innerWidth;
      const hDiff = window.outerHeight - window.innerHeight;
      if (wDiff > CONFIG.DEVTOOLS_SIZE_THRESHOLD || hDiff > CONFIG.DEVTOOLS_SIZE_THRESHOLD) {
        detected = true;
      }
      if (!detected) {
        const el = document.createElement('div');
        Object.defineProperty(el, 'id', { get() { detected = true; return ''; }, configurable: true });
        console.dir(el);
      }
      if (detected) {
        devtoolsWasOpen = true;
        const w = { event: 'devtools_open', message: '⚠️ Developer tools detected — please close them immediately.', ts: Date.now() };
        setLastWarning(w);
        onWarningRef.current?.(w);
        sendViolation('devtools_open', 'medium', { reason: 'devtools_open', wDiff, hDiff });
      } else if (devtoolsWasOpen) {
        devtoolsWasOpen = false;
      }
    }, CONFIG.DEVTOOLS_CHECK_INTERVAL);

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('contextmenu', onContextMenu, true);
    document.addEventListener('copy',  onCopy,  true);
    document.addEventListener('paste', onPaste, true);
    document.addEventListener('fullscreenchange', onFullscreen);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('contextmenu', onContextMenu, true);
      document.removeEventListener('copy',  onCopy,  true);
      document.removeEventListener('paste', onPaste, true);
      document.removeEventListener('fullscreenchange', onFullscreen);
      clearInterval(devtoolsPoller);
    };
  }, [isActive, sessionId, sendViolation]);

  /* ── LAYER 3: Server-side identity check (all candidates) ───────────── */
  useEffect(() => {
    if (!isActive || !sessionId) return;
    const startTimer = setTimeout(() => {
      sendIdentityFrame();
      identityIntervalRef.current = setInterval(sendIdentityFrame, CONFIG.IDENTITY_CHECK_INTERVAL);
    }, CONFIG.IDENTITY_INITIAL_DELAY);
    return () => {
      clearTimeout(startTimer);
      if (identityIntervalRef.current) { clearInterval(identityIntervalRef.current); identityIntervalRef.current = null; }
    };
  }, [isActive, sessionId, enrolled.face, sendIdentityFrame]);

  /* ── LAYER 4: Server-side voice check (PCM — same as interviews) ──── */
  useEffect(() => {
    if (!isActive || !sessionId || !mediaStream) return;
    const tracks = mediaStream.getAudioTracks?.() || [];
    if (!tracks.length) return;
    let disposed = false;
    let voiceBusy = false;

    const ctx = new AudioContext({ sampleRate: CONFIG.VOICE_PCM_SAMPLE_RATE });
    const source = ctx.createMediaStreamSource(new MediaStream(tracks));
    const processor = ctx.createScriptProcessor(4096, 1, 1);
    const silentGain = ctx.createGain();
    silentGain.gain.value = 0;
    silentGain.connect(ctx.destination);
    source.connect(processor);
    processor.connect(silentGain);
    let chunks = [];
    processor.onaudioprocess = (ev) => {
      const data = ev.inputBuffer.getChannelData(0);
      const pcm16 = new Int16Array(data.length);
      for (let i = 0; i < data.length; i++) {
        pcm16[i] = Math.max(-32768, Math.min(32767, Math.floor(data[i] * 32767)));
      }
      chunks.push(pcm16);
    };

    const loop = setInterval(async () => {
      const sid = sessionIdRef.current;
      if (!sid || terminatedRef.current || disposed) return;
      if (voiceBusy) return;
      try {
        if (!chunks.length || disposed) return;
                const total = chunks.reduce((s, c) => s + c.length, 0);
        if (total < 4000) { console.log('[Proctor:voice] SKIP chunk too small', total, 'samples'); return; }
        console.log('[Proctor:voice] SENDING PCM', { samples: total, chunks: chunks.length });
        const merged = new Int16Array(total);
        let off = 0;
        for (const c of chunks) { merged.set(c, off); off += c.length; }
        chunks = [];   // reset BEFORE sending — don't re-send old audio next tick

        voiceBusy = true;
        try {
          const res = await proctoringService.voiceCheckPCM({
            sessionId: sid,
            pcmData: merged.buffer,
            sampleRate: CONFIG.VOICE_PCM_SAMPLE_RATE,
          });
          if (res?.action === 'terminate') {
            terminatedRef.current = true; setTerminated(true);
            onTerminateRef.current?.('voice_second_speaker', res.message);
          } else if (res?.action === 'warn') {
            identityQuietUntilRef.current = Date.now() + CONFIG.POST_WARN_QUIET_MS;
            if (_shouldSurfaceServerWarn('voice_second_speaker')) {
              const w = { event: 'voice_second_speaker', strike: res.strike, maxStrikes: res.max_strikes, message: res.message };
              setLastWarning(w); onWarningRef.current?.(w);
            } else {
              console.log('[Proctor:voice] SUPPRESS duplicate warn strike=', res.strike);
            }
          }
        } catch (err) { console.warn('[Proctor] PCM voice check failed:', err?.message || err); }
        finally { voiceBusy = false; }
      } catch { /* AudioContext can fail on some browsers */ }
    }, CONFIG.VOICE_CHUNK_MS);

    return () => {
      disposed = true;
      clearInterval(loop);
      try { processor.disconnect(); source.disconnect(); ctx.close(); } catch {}
    };
  }, [isActive, sessionId, mediaStream]);

  return {
    sessionId,
    enrolled,
    faceStatus,
    lastWarning,
    terminated,
  };
}