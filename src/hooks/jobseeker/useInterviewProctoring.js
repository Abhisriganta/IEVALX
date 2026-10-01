
import { useCallback, useEffect, useRef, useState } from 'react';
import proctoringService from '@/services/api/jobseeker/Proctoringservice';

const CONFIG = {
  IDENTITY_CHECK_INTERVAL: 3000,    // was 2000
  IDENTITY_INITIAL_DELAY:  1000,    // was 500
  IDENTITY_FRAME_QUALITY:  0.85,
  IDENTITY_FRAME_WIDTH:    640,
  IDENTITY_FRAME_HEIGHT:   480,
  VOICE_CHUNK_MS:          2500,    // was 2000
  VOICE_PCM_SAMPLE_RATE:   16000,
  VOICE_PCM_DURATION_MS:   2500,
  DEVTOOLS_CHECK_INTERVAL: 3000,
  DEVTOOLS_SIZE_THRESHOLD: 160,
  FRONTEND_COOLDOWN_MS:    3000,    // was 1000
  SERVER_WARN_COOLDOWN_MS: 5000,    // NEW — per-type dedupe for banners
  POST_WARN_QUIET_MS:      2000,    // NEW — pause identity ticks briefly after a warn
};


export default function useInterviewProctoring({
  proctorSessionId,
  enrolled = { face: false, voice: false },
  videoRef,
  mediaStream,
  isActive,
  isAISpeaking = false,
  onTerminate,
  onWarning,
}) {
  const frameCaptureRef     = useRef(null);
  const identityIntervalRef = useRef(null);
  const voiceRecorderRef    = useRef(null);
  const canvasRef           = useRef(null);
  const lastViolationAt     = useRef({});
  const terminatedRef       = useRef(false);
  const identityBusyRef     = useRef(false);   // one identity-check in flight at a time
  const voiceBusyRef        = useRef(false);   // one voice-check in flight at a time
  const isAISpeakingRef     = useRef(false);
  const onTerminateRef       = useRef(onTerminate);
  const onWarningRef         = useRef(onWarning);
  const sendViolationRef     = useRef(null);
  const sendIdentityFrameRef  = useRef(null);
  const lastGazeWarningAt     = useRef({});
  const lastServerWarnAt      = useRef({});
  const identityQuietUntilRef = useRef(0);
  useEffect(() => { isAISpeakingRef.current = isAISpeaking; onTerminateRef.current = onTerminate; onWarningRef.current = onWarning; });

  const [faceStatus,  setFaceStatus]  = useState('initializing');
  const [lastWarning, setLastWarning] = useState(null);
  const [terminated,  setTerminated]  = useState(false);

  // ── End session on unmount ──────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (proctorSessionId) {
        terminatedRef.current = true;   // stop identity/voice uploads after end → no 404s
        proctoringService.endSession(proctorSessionId).catch(() => {});
      }
    };
  }, [proctorSessionId]);

  // ── Send violation via REST ─────────────────────────────────────────────
  const sendViolation = useCallback(async (eventType, severity = 'medium', metadata = {}) => {
    if (!proctorSessionId) { console.warn('[Proctor:violation] SKIP no session', eventType); return; }
    if (terminatedRef.current) { console.warn('[Proctor:violation] SKIP session terminated', eventType); return; }
    const now = Date.now();
    const timeSinceLast = now - (lastViolationAt.current[eventType] || 0);
    if (timeSinceLast < CONFIG.FRONTEND_COOLDOWN_MS) {
      console.log('[Proctor:violation] COOLDOWN', eventType, `(${timeSinceLast}ms < ${CONFIG.FRONTEND_COOLDOWN_MS}ms)`);
      return;
    }
    lastViolationAt.current[eventType] = now;
    console.log('[Proctor:violation] SENDING', { event: eventType, severity, metadata });
    try {
      const res = await proctoringService.recordEvent({
        sessionId: proctorSessionId, event: eventType, severity, metadata,
      });
      console.log('[Proctor:violation] RESULT', { event: eventType, action: res?.action, strike: res?.strike, max: res?.max_strikes, error: res?.error });
      if (res?.action === 'warn') {
        identityQuietUntilRef.current = Date.now() + CONFIG.POST_WARN_QUIET_MS;
        const w = { event: eventType, strike: res.strike, maxStrikes: res.max_strikes, message: res.message };
        setLastWarning(w);
        onWarningRef.current?.(w);
      } else if (res?.action === 'terminate') {
        terminatedRef.current = true;
        setTerminated(true);
        setLastWarning({ event: eventType, message: res.message, terminate: true });
        onTerminateRef.current?.(eventType, res.message);
      }
    } catch (err) { console.warn('[Proctor] recordEvent failed:', err?.message || err); }
  }, [proctorSessionId]);
  useEffect(() => { sendViolationRef.current = sendViolation; }, [sendViolation]);

  // HARDENING: display-only dedupe — has an identical banner been shown too recently?
  const _shouldSurfaceServerWarn = (eventType) => {
    const now = Date.now();
    const last = lastServerWarnAt.current[eventType] || 0;
    if (now - last < CONFIG.SERVER_WARN_COOLDOWN_MS) return false;
    lastServerWarnAt.current[eventType] = now;
    return true;
  };

  // ── Send identity frame via REST ────────────────────────────────────────
  const sendIdentityFrame = useCallback(async () => {
    const video = videoRef?.current;
    if (!proctorSessionId || terminatedRef.current) return;
    if (!video || video.readyState < 2 || !video.videoWidth) {
      console.log('[Proctor:identity] SKIP frame not ready', { readyState: video?.readyState, videoWidth: video?.videoWidth });
      return;
    }
    if (identityBusyRef.current) { console.log('[Proctor:identity] SKIP previous check still in flight'); return; }
    // HARDENING: brief post-warn quiet window so the toast can be read.
    if (Date.now() < identityQuietUntilRef.current) {
      console.log('[Proctor:identity] SKIP post-warn quiet window'); return;
    }
  
    if (isAISpeakingRef.current) {
      console.log('[Proctor:identity] SKIP AI speaking'); return;
    }
    identityBusyRef.current = true;
    console.log('[Proctor:identity] SENDING frame');
    try {
      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas');
        canvasRef.current.width  = CONFIG.IDENTITY_FRAME_WIDTH;
        canvasRef.current.height = CONFIG.IDENTITY_FRAME_HEIGHT;
      }
      const ctx = canvasRef.current.getContext('2d');
      ctx.drawImage(video, 0, 0, CONFIG.IDENTITY_FRAME_WIDTH, CONFIG.IDENTITY_FRAME_HEIGHT);
      const base64 = canvasRef.current.toDataURL('image/jpeg', CONFIG.IDENTITY_FRAME_QUALITY).split(',')[1] || '';
      const res = await proctoringService.identityCheck({ sessionId: proctorSessionId, imageBase64: base64 });
      console.log('[Proctor:identity] RESULT', { action: res?.action, verified: res?.verified, similarity: res?.similarity, strike: res?.strike, violation_type: res?.violation_type, note: res?.note, error: res?.error });
      const evt = res?.violation_type || 'identity_mismatch';
      if (res?.error === 'already_terminated') {
        terminatedRef.current = true;
        setTerminated(true);
        onTerminateRef.current?.(evt, 'Session terminated by proctoring system.');
        return;
      }
      if (res?.action === 'warn') {
        // HARDENING: dedupe + quiet window. Server still counts every strike.
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
      // server_violations loop removed — see Patch #6 note above.

      // ── no_face + gaze from note (direct warn — backend already recorded) ──
      const note = res?.note || '';
     if ((note.includes('no_face') || note.includes('no face')) && _shouldSurfaceServerWarn('no_face')) {
        const w = {
          event: 'no_face',
          message: '⚠️ We can\'t see your face. Please centre yourself in front of the camera and keep your full face clearly visible until the interview ends.',
          strike: null,
        };
        setLastWarning(w);
        onWarningRef.current?.(w);
      }
      if (note.startsWith('face_tilted')) {
        const yaw   = parseInt(note.match(/yaw=(-?\d+)/)?.[1]  || '0');
        const pitch = parseInt(note.match(/pitch=(-?\d+)/)?.[1] || '0');
        const now   = Date.now();
     
        const gazeEvents = [];
        if (pitch > 30) {
          gazeEvents.push({
            event: 'looking_down',
            message: '⚠️ You appear to be looking down at your desk. Please look up at the screen and keep your eyes on the interview.',
          });
        }
        if (pitch < -30) {
          gazeEvents.push({
            event: 'looking_up',
            message: '⚠️ You appear to be looking up and away from the screen. Please face the camera and keep your eyes on the interview.',
          });
        }
        if (yaw > 25) {
          // Camera-yaw positive → candidate turned to their OWN LEFT.
          gazeEvents.push({
            event: 'gaze_away_left',
            message: '⚠️ Your head has turned to your left. Please face the camera straight-on and keep looking at the screen for the rest of the interview.',
          });
        }
        if (yaw < -25) {
          // Camera-yaw negative → candidate turned to their OWN RIGHT.
          gazeEvents.push({
            event: 'gaze_away_right',
            message: '⚠️ Your head has turned to your right. Please face the camera straight-on and keep looking at the screen for the rest of the interview.',
          });
        }
        for (const g of gazeEvents) {
          const last = lastGazeWarningAt.current[g.event] || 0;
          if (now - last < CONFIG.SERVER_WARN_COOLDOWN_MS) continue;   // matched to server-warn cooldown
          lastGazeWarningAt.current[g.event] = now;
          const w = { ...g, strike: null };
          setLastWarning(w);
          onWarningRef.current?.(w);
        }
      }

    } catch (err) { console.warn('[Proctor] identity check failed:', err?.message || err); } finally { identityBusyRef.current = false; }
  }, [proctorSessionId, videoRef]);
  useEffect(() => { sendIdentityFrameRef.current = sendIdentityFrame; }, [sendIdentityFrame]);


  // ── LAYER 2: Browser monitoring ─────────────────────────────────────────
   useEffect(() => {
    if (!isActive || !proctorSessionId) return;
    const onVisibility = () => {
      if (document.hidden) sendViolation('tab_switch', 'medium', { reason: 'tab_switch' });
    };
    const onBlur = () => sendViolation('window_blur', 'low', { reason: 'window_blur' });
    const onKey  = (e) => {
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && ['I','J','C'].includes(e.key))) {
        e.preventDefault();
        sendViolation('devtools_open', 'medium', { reason: 'devtools_shortcut' });
      }
    };
    const onContextMenu = () => {
      sendViolation('right_click', 'low', { reason: 'right_click' });
    };
    const onCopy  = () => sendViolation('clipboard_attempt', 'low', { reason: 'copy' });
    const onPaste = () => sendViolation('clipboard_attempt', 'low', { reason: 'paste' });
    const onCut   = () => sendViolation('clipboard_attempt', 'low', { reason: 'cut' });
    const onFullscreen = () => {
      if (!document.fullscreenElement) sendViolation('fullscreen_exit', 'low', { reason: 'fullscreen_exit' });
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
    document.addEventListener('cut',   onCut,   true);
    document.addEventListener('fullscreenchange', onFullscreen);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('contextmenu', onContextMenu, true);
      document.removeEventListener('copy',  onCopy,  true);
      document.removeEventListener('paste', onPaste, true);
      document.removeEventListener('cut',   onCut,   true);
      document.removeEventListener('fullscreenchange', onFullscreen);
      clearInterval(devtoolsPoller);
    };
  }, [isActive]);


  // ── LAYER 3: Identity check every 15 s ─────────────────────────────────
  useEffect(() => {
     if (!isActive || !proctorSessionId) return;    const t = setTimeout(() => {
      sendIdentityFrame();
      identityIntervalRef.current = setInterval(sendIdentityFrame, CONFIG.IDENTITY_CHECK_INTERVAL);
    }, CONFIG.IDENTITY_INITIAL_DELAY);
    return () => {
      clearTimeout(t);
      if (identityIntervalRef.current) { clearInterval(identityIntervalRef.current); identityIntervalRef.current = null; }
    };
   }, [isActive, proctorSessionId, sendIdentityFrame]);

  useEffect(() => {
    if (!isActive || !proctorSessionId || !mediaStream) return;
    const tracks = mediaStream.getAudioTracks?.() || [];
    if (!tracks.length) return;
    let disposed = false;

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
      if (!proctorSessionId || terminatedRef.current || disposed) return;
      if (voiceBusyRef.current) return;
      try {
        if (!chunks.length || disposed) return;
        const total = chunks.reduce((s, c) => s + c.length, 0);
        if (total < 4000) { console.log('[Proctor:voice] SKIP chunk too small', total, 'samples'); return; }
        console.log('[Proctor:voice] SENDING PCM', { samples: total, chunks: chunks.length, aiSpeaking: isAISpeakingRef.current });
        const merged = new Int16Array(total);
        let off = 0;
        for (const c of chunks) { merged.set(c, off); off += c.length; }
        chunks = [];

        voiceBusyRef.current = true;
        try {
          const res = await proctoringService.voiceCheckPCM({
            sessionId: proctorSessionId,
            pcmData: merged.buffer,
            sampleRate: CONFIG.VOICE_PCM_SAMPLE_RATE,
            aiSpeaking: isAISpeakingRef.current,
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
        finally { voiceBusyRef.current = false; }
      } catch { /* AudioContext can fail on some browsers */ }
    }, CONFIG.VOICE_CHUNK_MS);

    return () => {
      disposed = true;
      clearInterval(loop);
      try { processor.disconnect(); source.disconnect(); ctx.close(); } catch {}
    };
  }, [isActive, proctorSessionId, mediaStream]);


  return { faceStatus, lastWarning, terminated };
}