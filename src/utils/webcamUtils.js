// BUILD: 2026-09-16-jp-biometric-v1
// ============================================================================
// Shared browser API helpers for webcam and microphone capture.
// Used by jobseeker biometric registration steps.
// Pure functions — no React, no MUI.
// ============================================================================

// ── Camera lifecycle ──────────────────────────────────────────────────────
export async function startCamera(videoRef) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      width: { ideal: 640 },
      height: { ideal: 480 },
      facingMode: 'user',
    },
    audio: false,
  });

  if (videoRef?.current) {
    videoRef.current.srcObject = stream;
    try {
      await videoRef.current.play();
    } catch (e) {
      console.warn('[webcam] video.play() rejected:', e?.name || e);
    }
  }
  return stream;
}

export function stopCamera(stream, videoRef) {
  if (stream) {
    stream.getTracks().forEach((track) => {
      try { track.stop(); } catch { /* noop */ }
    });
  }
  if (videoRef?.current) {
    try { videoRef.current.srcObject = null; } catch { /* noop */ }
  }
}

// ── Grab a still frame from the video element as base64 (data URI) ────────
export function captureFrameToBase64(videoRef, canvasRef, quality = 0.6) {
  const video = videoRef?.current;
  const canvas = canvasRef?.current;
  if (!video || !canvas) return null;
  if (video.videoWidth === 0 || video.videoHeight === 0) return null;

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}

// ── Microphone: MediaRecorder with fallback mime chain ────────────────────
export async function startMicRecorder() {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      sampleRate: 44100,
    },
  });

  let mimeType = 'audio/webm';
  if (typeof MediaRecorder !== 'undefined') {
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      mimeType = 'audio/webm;codecs=opus';
    } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
      mimeType = 'audio/mp4';
    }
  }

  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks = [];
  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) chunks.push(event.data);
  };

  return { recorder, stream, mimeType, chunks };
}

export function stopMicStream(stream) {
  if (!stream) return;
  stream.getTracks().forEach((track) => {
    try { track.stop(); } catch { /* noop */ }
  });
}

// ── Blob → base64 data URI ────────────────────────────────────────────────
export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Failed to encode audio'));
    reader.readAsDataURL(blob);
  });
}

// ── Legacy silence detector (kept for compatibility) ──────────────────────
export function startSilenceDetector(stream, { onWarn } = {}) {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) {
    return {
      stop() {},
      getStats() { return { silencePercent: 0, totalChecks: 0, silentChecks: 0 }; },
    };
  }

  const audioContext = new AudioContextCtor();
  const source = audioContext.createMediaStreamSource(stream);
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 512;
  analyser.smoothingTimeConstant = 0.3;
  source.connect(analyser);

  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  const SILENCE_THRESHOLD = 15;
  const SILENCE_WARN_AFTER_MS = 3000;

  let silenceMs = 0;
  let totalChecks = 0;
  let silentChecks = 0;
  let warned = false;

  const interval = setInterval(() => {
    analyser.getByteFrequencyData(dataArray);
    const avg = dataArray.reduce((s, v) => s + v, 0) / dataArray.length;
    totalChecks += 1;

    if (avg < SILENCE_THRESHOLD) {
      silenceMs += 500;
      silentChecks += 1;
      if (silenceMs >= SILENCE_WARN_AFTER_MS && !warned) {
        warned = true;
        onWarn?.(true);
      }
    } else {
      silenceMs = 0;
      if (warned) {
        warned = false;
        onWarn?.(false);
      }
    }
  }, 500);

  return {
    stop() {
      clearInterval(interval);
      try { audioContext.close(); } catch { /* noop */ }
    },
    getStats() {
      const silencePercent = totalChecks > 0 ? (silentChecks / totalChecks) * 100 : 100;
      return { silencePercent, totalChecks, silentChecks };
    },
  };
}

// ── Voice Activity Detector — richer 4-state classifier ───────────────────
// Classifies each 300ms window into one of:
//   'silent'    — no meaningful audio (average energy below silence floor)
//   'too_low'   — voice-band energy is present but below the "clear speech" floor
//   'ok'        — voice-band energy in the speech range with good speech ratio
//   'disturbed' — loud/energetic but energy scatter suggests noise or music
//
// Calls onStateChange(state) whenever the state changes so the UI can react
// live. getStats() returns final percentages at the end of the recording.
//
// Speech band: 85-3400 Hz (human voice fundamentals + formants).
// ──────────────────────────────────────────────────────────────────────────
export function startVoiceActivityDetector(stream, { onStateChange } = {}) {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) {
    return {
      stop() {},
      getStats() {
        return {
          silentPercent: 0, tooLowPercent: 0, okPercent: 100, disturbedPercent: 0,
          totalChecks: 0,
        };
      },
    };
  }

  const audioContext = new AudioContextCtor();
  const sampleRate = audioContext.sampleRate;
  const source = audioContext.createMediaStreamSource(stream);
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0.3;
  source.connect(analyser);

  const bufferLen = analyser.frequencyBinCount;
  const freqData = new Uint8Array(bufferLen);

  // Bin frequency step = sampleRate / fftSize
  const binHz = sampleRate / analyser.fftSize;
  const SPEECH_LO = 85;
  const SPEECH_HI = 3400;
  const speechLoIdx = Math.max(1, Math.floor(SPEECH_LO / binHz));
  const speechHiIdx = Math.min(bufferLen - 1, Math.ceil(SPEECH_HI / binHz));

  // Thresholds
  const SILENCE_FLOOR = 12;      
  const QUIET_FLOOR   = 22;      
  const TOO_LOW_FLOOR = 20;      
  const SPEECH_RATIO_MIN = 0.55; 
  const DISTURBED_LOUD = 50;     

  const TICK_MS = 300;

  let currentState = 'silent';
  let counts = { silent: 0, too_low: 0, ok: 0, disturbed: 0 };
  let totalChecks = 0;

  const classify = () => {
    analyser.getByteFrequencyData(freqData);

    let totalSum = 0;
    let speechSum = 0;
    for (let i = 0; i < bufferLen; i++) {
      totalSum += freqData[i];
      if (i >= speechLoIdx && i <= speechHiIdx) speechSum += freqData[i];
    }
    const totalAvg = totalSum / bufferLen;
    const speechAvg = speechSum / (speechHiIdx - speechLoIdx + 1);
    const speechRatio = totalSum > 0 ? speechSum / totalSum : 0;

    let state;
    if (totalAvg < SILENCE_FLOOR) {
      // Truly silent — mic essentially picking up nothing.
      state = 'silent';
    } else if (totalAvg < QUIET_FLOOR) {
      state = 'silent';
    } else if (totalAvg >= DISTURBED_LOUD && speechRatio < SPEECH_RATIO_MIN) {
      state = 'disturbed';
    } else if (speechAvg < TOO_LOW_FLOOR) {
      state = 'too_low';
    } else if (speechRatio >= SPEECH_RATIO_MIN) {
      state = 'ok';
    } else if (totalAvg >= DISTURBED_LOUD) {

      state = 'disturbed';
    } else {
  
      state = 'too_low';
    }

    counts[state] += 1;
    totalChecks += 1;

    if (state !== currentState) {
      currentState = state;
      onStateChange?.(state);
    }
  };

  const interval = setInterval(classify, TICK_MS);

  return {
    stop() {
      clearInterval(interval);
      try { audioContext.close(); } catch { /* noop */ }
    },
    getStats() {
      const t = totalChecks || 1;
      return {
        silentPercent:    (counts.silent    / t) * 100,
        tooLowPercent:    (counts.too_low   / t) * 100,
        okPercent:        (counts.ok        / t) * 100,
        disturbedPercent: (counts.disturbed / t) * 100,
        totalChecks,
      };
    },
  };
}

// ── Human-readable messages for common permission/device errors ───────────
export function mapPermissionError(err) {
  const name = err?.name || '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Camera or microphone access was blocked. Please allow it in your browser settings and try again.';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'No camera or microphone was found on this device.';
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'Your camera or microphone is being used by another application. Close it and try again.';
  }
  if (name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError') {
    return 'Your device does not support the required camera or microphone settings.';
  }
  if (name === 'SecurityError') {
    return 'Camera and microphone access requires a secure (HTTPS) connection.';
  }
  return err?.message || 'Unable to access camera or microphone.';
}

// ── Size guards ───────────────────────────────────────────────────────────
export const MAX_VOICE_BYTES = 10 * 1024 * 1024;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;