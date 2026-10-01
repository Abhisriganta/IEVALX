import { useEffect, useRef, useState, useCallback } from 'react';

// --- Configuration ---
const CONFIG = {
  FRAME_CAPTURE_INTERVAL: 500,

  IDENTITY_CHECK_INTERVAL: 5000,
  IDENTITY_FRAME_QUALITY: 0.7,
  IDENTITY_FRAME_WIDTH: 320,
  IDENTITY_FRAME_HEIGHT: 240,

  DEVTOOLS_CHECK_INTERVAL: 3000,
  DEVTOOLS_SIZE_THRESHOLD: 160,

  FRONTEND_COOLDOWN_MS: 5000,
};

// Map Worker violation types to backend proctor_event names
const WORKER_TO_BACKEND_MAP = {
  'FACE_NOT_VISIBLE':  'no_face',
  'MULTIPLE_FACES':    'multiple_faces',
  'FACE_TURNED_LEFT':  'head_turned_left',
  'FACE_TURNED_RIGHT': 'head_turned_right',
  'LOOKING_DOWN':      'looking_down',
  'LOOKING_UP':        'looking_up',
  'ELECTRONIC_DEVICE': 'phone_detected',
  'MULTIPLE_PERSONS':  'multiple_faces',
  'BOOK_DETECTED':     'book_detected',
  'REPEATED_GLANCE':   'repeated_glance',
  'FACE_OBSCURED':     'face_obscured',
  'GAZE_LEFT':         'gaze_away_left',
  'GAZE_RIGHT':        'gaze_away_right',
  'GAZE_DOWN':         'gaze_away_down',
  // FACE_RETURNED is handled specially - triggers immediate identity check
};



export default function useRealtimeProctoring({
  sessionId,
  isActive,
  videoRef,
  sendMessage,
  getWsState,
}) {
  const workerRef = useRef(null);
  const frameCaptureRef = useRef(null);
  const identityCheckRef = useRef(null);
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const lastViolationTimeRef = useRef({});

  const [workerReady, setWorkerReady] = useState(false);
  const workerFailedRef = useRef(false);
  const [faceStatus, setFaceStatus] = useState('initializing');
  const [violations, setViolations] = useState([]);
  const [lastViolation, setLastViolation] = useState(null);
  const sendIdentityFrameRef = useRef(null);

  // -- Capture identity frame and send to backend --
  const sendIdentityFrame = useCallback(() => {
    const video = videoRef?.current;
    if (!video || video.readyState < 2 || !video.videoWidth) return;
    if (getWsState && getWsState() !== 'open') return;

    try {
      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas');
        canvasRef.current.width = CONFIG.IDENTITY_FRAME_WIDTH;
        canvasRef.current.height = CONFIG.IDENTITY_FRAME_HEIGHT;
        ctxRef.current = canvasRef.current.getContext('2d', { willReadFrequently: true });
      }

      const canvas = canvasRef.current;
      const ctx = ctxRef.current;
      ctx.drawImage(video, 0, 0, CONFIG.IDENTITY_FRAME_WIDTH, CONFIG.IDENTITY_FRAME_HEIGHT);

      // Brightness check - skip dark frames
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let brightness = 0;
      for (let i = 0; i < imageData.data.length; i += 16) {
        brightness += imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2];
      }
      brightness /= (imageData.data.length / 16) * 3;
      if (brightness < 15) return;

      const dataUrl = canvas.toDataURL('image/jpeg', CONFIG.IDENTITY_FRAME_QUALITY);
      const base64 = dataUrl.split(',')[1];

      sendMessage({
        type: 'identity_check',
        image: base64,
        timestamp: Date.now(),
      });
    } catch (err) {
      // Ignore capture errors
    }
  }, [videoRef, sendMessage, getWsState]);

  // -- Send proctor_event to backend --
  const sendViolation = useCallback((eventType, severity, metadata = {}) => {
    const now = Date.now();
    const lastTime = lastViolationTimeRef.current[eventType] || 0;
    if (now - lastTime < CONFIG.FRONTEND_COOLDOWN_MS) return;
    lastViolationTimeRef.current[eventType] = now;

    if (getWsState && getWsState() !== 'open') return;

    const event = {
      type: 'proctor_event',
      event: eventType,
      severity: severity,
      metadata: metadata,
      timestamp: now,
    };

    try {
      sendMessage(event);
    } catch (err) {
      console.warn('[Proctor] Failed to send violation:', err);
    }

    const violationEntry = { ...event, id: eventType + '_' + now };
    setViolations(prev => [...prev.slice(-49), violationEntry]);
    setLastViolation(violationEntry);

    console.log('[Proctor] Sent: ' + eventType + ' (' + severity + ')', metadata);
  }, [sendMessage, getWsState]);

  // ======================================================================
  // LAYER 1: Web Worker (BlazeFace + COCO-SSD)
  // ======================================================================

  // LAYER 1: Web Worker — create ONCE, never retry
  useEffect(() => {
    if (!isActive) return;

    // Prevent re-creation across re-renders
    if (workerRef.current) return;
    if (workerFailedRef.current) return;

    let worker;
    try {
      worker = new Worker(new URL('../../workers/proctor.worker.js', import.meta.url), { type: 'module' });
    } catch (err) {
      console.error('[Proctor] Worker creation failed:', err);
      workerFailedRef.current = true;
      return;
    }
    workerRef.current = worker;

    worker.onmessage = (event) => {
      const { type } = event.data;
      if (type === 'MODEL_STATUS') {
        if (event.data.status === 'ready') {
          setWorkerReady(true);
          console.log('[Proctor] Worker models ready');
        } else if (event.data.status === 'error') {
          console.error('[Proctor] Worker model load failed');
          workerFailedRef.current = true;
        }
      } else if (type === 'DETECTION') {
        setFaceStatus(event.data.analysisStatus || 'monitoring');
      } else if (type === 'VIOLATION') {
        const violationType = event.data.violationType;
        if (violationType === 'FACE_RETURNED') {
          console.log('[Proctor] Face returned — immediate identity check');
          setTimeout(() => sendIdentityFrame(), 500);
        } else {
          const backendEvent = WORKER_TO_BACKEND_MAP[violationType];
          if (backendEvent) {
            const severity = violationType === 'LOOKING_UP' ? 'low' : 'medium';
            sendViolation(backendEvent, severity, {
              worker_type: violationType,
              ...(event.data.metadata || {}),
            });
          }
        }
      } else if (type === 'DIAG') {
        console.log('[Proctor Worker]', event.data.message);
      }
    };

    worker.onerror = (err) => {
      console.error('[Proctor] Worker error:', err);
    };

    worker.postMessage({ type: 'INIT' });

    // Cleanup only on unmount, NOT on re-render
    return () => {
      if (workerRef.current) {
        workerRef.current.postMessage({ type: 'STOP' });
        workerRef.current.terminate();
        workerRef.current = null;
      }
      setWorkerReady(false);
      workerFailedRef.current = false;
    };
  }, [isActive]); // Only depends on isActive — NOT sendViolation/sendIdentityFrame

  // -- Send video frames to worker --
  useEffect(() => {
    if (!isActive || !workerReady) return;

    const captureLoop = setInterval(() => {
      const video = videoRef?.current;
      if (!video || video.readyState < 2 || !video.videoWidth) return;

      try {
        createImageBitmap(video).then((bmp) => {
          if (workerRef.current) {
            workerRef.current.postMessage(
              { type: 'FRAME', bitmap: bmp },
              [bmp]
            );
          }
        }).catch(() => {});
      } catch (err) {
        // Ignore
      }
    }, CONFIG.FRAME_CAPTURE_INTERVAL);

    frameCaptureRef.current = captureLoop;

    return () => {
      clearInterval(captureLoop);
      frameCaptureRef.current = null;
    };
  }, [isActive, workerReady, videoRef]);

  // ======================================================================
  // LAYER 2: Browser Monitoring
  // ======================================================================

  useEffect(() => {
    if (!isActive) return;

    const handleVisibility = () => {
      if (document.hidden) {
        sendViolation('tab_switch', 'medium', { timestamp: Date.now() });
      }
    };

    const handleFullscreen = () => {
      if (!document.fullscreenElement) {
        sendViolation('fullscreen_exit', 'medium', { timestamp: Date.now() });
      }
    };

    const handleCopy = (e) => {
      e.preventDefault();
      sendViolation('clipboard_attempt', 'low', { action: 'copy' });
    };
    const handleCut = (e) => {
      e.preventDefault();
      sendViolation('clipboard_attempt', 'low', { action: 'cut' });
    };
    const handlePaste = (e) => {
      e.preventDefault();
      sendViolation('clipboard_attempt', 'low', { action: 'paste' });
    };

    const handleContextMenu = (e) => {
      e.preventDefault();
      sendViolation('right_click', 'low');
    };

    const handleBlur = () => {
      sendViolation('window_blur', 'medium', { timestamp: Date.now() });
    };

    const handleKeyDown = (e) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        (e.ctrlKey && e.shiftKey && e.key === 'J') ||
        (e.ctrlKey && e.shiftKey && e.key === 'C') ||
        (e.ctrlKey && e.key === 'u') ||
        (e.ctrlKey && e.key === 'U')
      ) {
        e.preventDefault();
        e.stopPropagation();
        sendViolation('keyboard_shortcut', 'low', { key: e.key, ctrl: e.ctrlKey, shift: e.shiftKey });
      }

      if (e.ctrlKey && ['c', 'v', 'x'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        sendViolation('clipboard_attempt', 'low', { action: 'ctrl+' + e.key });
      }

      if (e.key === 'PrintScreen') {
        e.preventDefault();
        sendViolation('tab_switch', 'medium', { action: 'screenshot_attempt' });
      }

      // Block Ctrl+A (select all), Ctrl+S (save page), Ctrl+P (print)
      if (e.ctrlKey && ['a', 's', 'p'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        sendViolation('keyboard_shortcut', 'low', { key: 'ctrl+' + e.key.toLowerCase() });
      }

      // Win+Shift+S (Snip & Sketch), Alt+PrintScreen
      if ((e.metaKey && e.shiftKey && e.key === 'S') ||
          (e.altKey && e.key === 'PrintScreen')) {
        e.preventDefault();
        sendViolation('keyboard_shortcut', 'low', { key: e.key });
      }
    };

    const devtoolsInterval = setInterval(() => {
      const widthDiff = window.outerWidth - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;
      if (widthDiff > CONFIG.DEVTOOLS_SIZE_THRESHOLD || heightDiff > CONFIG.DEVTOOLS_SIZE_THRESHOLD) {
        sendViolation('devtools_open', 'low', { widthDiff, heightDiff });
      }
    }, CONFIG.DEVTOOLS_CHECK_INTERVAL);

    document.addEventListener('visibilitychange', handleVisibility);
    document.addEventListener('fullscreenchange', handleFullscreen);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('cut', handleCut);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('fullscreenchange', handleFullscreen);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('keydown', handleKeyDown, true);
      clearInterval(devtoolsInterval);
    };
  }, [isActive, sendViolation]);

  // ======================================================================
  // LAYER 3: Identity Check Cycle (every 15s)
  // ======================================================================

  // Keep ref in sync with latest sendIdentityFrame (avoids useEffect re-triggering)
  useEffect(() => {
    sendIdentityFrameRef.current = sendIdentityFrame;
  }, [sendIdentityFrame]);

  useEffect(() => {
    if (!isActive) return;

    // 15-second initial delay (let camera stabilize)
    const startDelay = setTimeout(() => {
      console.log('[Proctor] Identity check timer STARTED (every ' + CONFIG.IDENTITY_CHECK_INTERVAL + 'ms)');
      if (sendIdentityFrameRef.current) sendIdentityFrameRef.current();
      identityCheckRef.current = setInterval(() => {
        if (sendIdentityFrameRef.current) sendIdentityFrameRef.current();
      }, CONFIG.IDENTITY_CHECK_INTERVAL);
    }, 15000);

    return () => {
      clearTimeout(startDelay);
      if (identityCheckRef.current) {
        clearInterval(identityCheckRef.current);
        identityCheckRef.current = null;
      }
    };
  }, [isActive]); // Only depends on isActive — stable reference via ref

  // -- Pause/resume worker --
  useEffect(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'PAUSE', value: !isActive });
    }
  }, [isActive]);

  // -- Return state for UI --
  return {
    workerReady,
    faceStatus,
    violations,
    lastViolation,
    violationCount: violations.length,
  };
}