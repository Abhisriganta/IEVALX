
import { useCallback, useEffect, useRef, useState } from 'react';
import proctoringService from '@/services/api/jobseeker/Proctoringservice';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

const CAPTURE_WIDTH  = 640;
const CAPTURE_HEIGHT = 480;
const CAPTURE_QUALITY = 0.92;
const PERSON_MIN_CONFIDENCE = 0.45;  // gate threshold — matches proctor.worker.js runtime

export default function useFaceGate() {
  const videoRef  = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const cocoModelRef   = useRef(null);
  const cocoLoadingRef = useRef(false);

  const [state, setState] = useState('idle');
  const [similarity, setSimilarity] = useState(0);
  const [threshold, setThreshold]   = useState(0.55);
  const [errorMessage, setErrorMessage] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [enrolled, setEnrolled] = useState({ face: false, voice: false });

  const startCamera = useCallback(async () => {
  if (streamRef.current) return; // already on
  setState('requesting');
  setErrorMessage('');
  try {
    let stream = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
    } catch (audioErr) {
      if (audioErr?.name === 'NotAllowedError') throw audioErr;
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false,
      });
    }
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play().catch(() => {});
    }
  
    if (!cocoModelRef.current && !cocoLoadingRef.current) {
      cocoLoadingRef.current = true;
      cocoSsd.load({ base: 'lite_mobilenet_v2' })
        .then((m) => { cocoModelRef.current = m; })
        .catch(() => { /* fail-open */ })
        .finally(() => { cocoLoadingRef.current = false; });
    }
    setState('ready');
  } catch (err) {
    setState('error');
    const name = err?.name || '';
    setErrorMessage(
      name === 'NotAllowedError'
        ? 'Camera or microphone permission denied. Both are required for proctoring — please allow access and try again.'
      : name === 'NotFoundError'
        ? 'No camera found on this device.'
      : name === 'NotReadableError'
        ? 'Camera or microphone is being used by another application. Close it and retry.'
        : 'Unable to access your device. Please check and try again.',
    );
  }
}, []);

  /* Capture a frame + verify. */
  const verify = useCallback(async () => {
    if (!videoRef.current || !streamRef.current) {
      setState('error');
      setErrorMessage('Camera not ready.');
      return;
    }
    setState('verifying');
    setErrorMessage('');

    try {
      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas');
        canvasRef.current.width  = CAPTURE_WIDTH;
        canvasRef.current.height = CAPTURE_HEIGHT;
      }
      const canvas = canvasRef.current;
      const ctx    = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, CAPTURE_WIDTH, CAPTURE_HEIGHT);

   
      if (cocoModelRef.current) {
        try {
          const preds = await cocoModelRef.current.detect(canvas);
          const personCount = preds.filter(
            (p) => p.class === 'person' && p.score >= PERSON_MIN_CONFIDENCE
          ).length;
          if (personCount > 1) {
            setAttempts((n) => n + 1);
            setState('mismatch');
            setErrorMessage(
              `Multiple persons detected (${personCount}). Move to a location where no other people are visible in the camera.`
            );
            return;
          }
        } catch {
          // fail-open — proceed to backend verify
        }
      }

      const dataUrl = canvas.toDataURL('image/jpeg', CAPTURE_QUALITY);
      const base64  = dataUrl.split(',')[1] || '';

      const res = await proctoringService.preCheck(base64);
      setAttempts((n) => n + 1);
      setSimilarity(Number(res?.similarity ?? 0));
      setThreshold(Number(res?.threshold ?? 0.55));
      if (res?.enrolled) setEnrolled(res.enrolled);

      if (res?.enrolled?.face === false || res?.error === 'no_face_enrollment') {
        setState('not_enrolled');
        setErrorMessage('Your face is not registered. Please complete biometric registration in your profile before starting the test.');
        return;
      }
      if (res?.error === 'no_face_detected') {
        setState('mismatch');
        setErrorMessage('No face detected in the frame. Make sure your face is clearly visible.');
        return;
      }
      if (res?.error === 'multiple_faces_detected') {
        setState('mismatch');
        setErrorMessage('Multiple faces detected. Only one person should be visible on camera during verification.');
        return;
      }
      if (res?.verified === true) {
        setState('verified');
        return;
      }
      setState('mismatch');
      const simPct = Math.round(Number(res?.similarity ?? 0) * 100);
const thrPct = Math.round(Number(res?.threshold ?? 0.5) * 100);
setErrorMessage(
  `Face match ${simPct}% (need ${thrPct}%). Improve lighting, face the camera directly, and remove glasses if possible.`
);
    } catch (err) {
      setState('error');
      setErrorMessage('Verification failed. Please check your connection and try again.');
    }
  }, []);

  const retry = useCallback(() => {
    setState('ready');
    setErrorMessage('');
    setSimilarity(0);
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  return {
    videoRef,
    state,
    similarity,
    threshold,
    errorMessage,
    attempts,
    enrolled,
    startCamera,
    verify,
    retry,
    stopCamera,
    isVerified: state === 'verified',
  };
}