import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import { Box, Stack, Typography, Button, LinearProgress } from '@mui/material';
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import RadioButtonUncheckedOutlined from '@mui/icons-material/RadioButtonUncheckedOutlined';
import CameraAltOutlined from '@mui/icons-material/CameraAltOutlined';
import ReplayOutlined from '@mui/icons-material/ReplayOutlined';
import WarningAmberOutlined from '@mui/icons-material/WarningAmberOutlined';

import {
  startCamera, stopCamera, captureFrameToBase64, mapPermissionError,
} from '../../../../utils/webcamUtils';

const publicApi = axios.create({ baseURL: '/api' });

// ── iEvalx design tokens (mirror JobseekerRegisterForm.jsx) ──────────────
const PRIMARY       = '#7F9E7E';
const PRIMARY_DARK  = '#6C8B6B';
const HEADING       = '#1F1F1F';
const MUTED         = '#6F7470';
const FAINT         = '#A8ACA6';
const SUCCESS_COLOR = '#2E7D32';
const ERROR_COLOR   = '#C62828';
const WARN_COLOR    = '#E65100';
const LINE          = '#E1E5DE';
const LINE_HOVER    = '#BFC8BC';
const TRACK         = '#E7EBE5';
const SERIF         = "'DM Serif Display', Georgia, 'Times New Roman', serif";

// ── Challenge configuration ──────────────────────────────────────────────
const CHALLENGE_META = {
  smile:      { label: 'Please smile',                 scoreOf: (d) => d?.smile_score ?? 0,               threshold: 0.30 },
  turn_left:  { label: 'Turn your head to the LEFT',   scoreOf: (d) => Math.max(0, d?.head_yaw ?? 0) / 12, threshold: 1.0 },
  turn_right: { label: 'Turn your head to the RIGHT',  scoreOf: (d) => Math.max(0, -(d?.head_yaw ?? 0)) / 12, threshold: 1.0 },
};
const CHALLENGE_KEYS = ['smile', 'turn_left', 'turn_right'];

// ── Polling + resilience ─────────────────────────────────────────────────
const BASE_POLL_MS = 1200;    // Normal cadence
const MAX_POLL_MS = 8000;     // Cap when backing off
const WARMUP_MS = 250;        // Wait after camera is ready before first poll
const CONSECUTIVE_PASS_REQUIRED = 2;
const FAILURE_WARN_AT = 3;    // Show warning after this many consecutive failures
const CIRCUIT_BREAK_AT = 10;  // Stop polling entirely after this many failures

// Randomize challenge order per session (prevents replay attacks)
function shuffledChallenges() {
  const arr = [...CHALLENGE_KEYS];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ── Component ────────────────────────────────────────────────────────────
export default function FaceCaptureStep({
  onPhotoBase64Change,
  onFaceValidChange,
  onSkip, // kept for backward-compat; no longer used
  onContinue,
}) {
  // Randomize challenges once per mount
  const challenges = useMemo(() => shuffledChallenges(), []);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const pollTimeoutRef = useRef(null);
  const challengePassCountRef = useRef(0);
  const analyzeInFlightRef = useRef(false);
  const currentPollMsRef = useRef(BASE_POLL_MS);
  const failureCountRef = useRef(0);
  const circuitBrokenRef = useRef(false);

  // Camera state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState('');

  // Live-feedback state (Step 2 indicators — updated on every poll)
  const [faceDetected, setFaceDetected] = useState(false);
  const [faceCount, setFaceCount] = useState(0);
  const [quality, setQuality] = useState(null);        // { brightness_ok, blur_ok, centered, face_size_ok, ... }
  const [feedback, setFeedback] = useState('');
  const [spoofScore, setSpoofScore] = useState(1);
  const [isLive, setIsLive] = useState(true);

  // Challenge state (Steps 4-5)
  const [livenessStep, setLivenessStep] = useState(0);
  const [activeProgress, setActiveProgress] = useState(0); // 0-100 for active chip

  // Post-capture state (Steps 7-9)
  const [photoTaken, setPhotoTaken] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [faceValidating, setFaceValidating] = useState(false);
  const [faceValid, setFaceValid] = useState(false);
  const [faceScore, setFaceScore] = useState(null);
  const [faceError, setFaceError] = useState('');

  // Service status
  const [serverWarning, setServerWarning] = useState('');
  const [serverDown, setServerDown] = useState(false);
  const [firstPollComplete, setFirstPollComplete] = useState(false);

  const allChallengesDone = livenessStep >= challenges.length;
  const currentChallenge = allChallengesDone ? null : challenges[livenessStep];

  // ── Camera lifecycle ─────────────────────────────────────────────────
  const openCamera = useCallback(async () => {
    setCameraError('');
    setCameraReady(false);
    try {
      const stream = await startCamera(videoRef);
      streamRef.current = stream;
      setCameraActive(true);
      setTimeout(() => setCameraReady(true), 100);
    } catch (err) {
      console.error('[FaceCapture] camera error:', err);
      setCameraError(mapPermissionError(err));
      setCameraActive(false);
    }
  }, []);

  const closeCamera = useCallback(() => {
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
    stopCamera(streamRef.current, videoRef);
    streamRef.current = null;
    setCameraActive(false);
    setCameraReady(false);
  }, []);

  useEffect(() => {
    openCamera();
    return () => closeCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Poll analyze-frame with exponential backoff + circuit breaker ────
  const analyzeFrame = useCallback(async () => {
    if (analyzeInFlightRef.current) return;
    if (circuitBrokenRef.current) return;
    if (!videoRef.current || !canvasRef.current) return;
    if (!cameraReady || photoTaken) return;

    const frameData = captureFrameToBase64(videoRef, canvasRef, 0.6);
    if (!frameData) return;

    analyzeInFlightRef.current = true;
    try {
      const { data } = await publicApi.post('/jobseeker/analyze-frame', {
        photo_base64: frameData,
        challenge_type: currentChallenge,
      });

      // ── SUCCESS — reset failure counter and back to base polling ───
      failureCountRef.current = 0;
      currentPollMsRef.current = BASE_POLL_MS;
      setServerWarning('');
      setServerDown(false);
      setFirstPollComplete(true);

      // Step 2 — Live indicators
      setFaceDetected(!!data?.face_detected);
      setFaceCount(data?.face_count ?? 0);
      setQuality(data?.quality || null);
      setFeedback(data?.feedback || '');
      setSpoofScore(data?.spoof_score ?? 1);
      setIsLive(data?.is_live_estimate !== false);

      // Step 5 — Live progress on active challenge
      if (!allChallengesDone && currentChallenge) {
        const meta = CHALLENGE_META[currentChallenge];
        const rawScore = meta.scoreOf(data);
        const progress = Math.min(100, (rawScore / meta.threshold) * 100);
        setActiveProgress(progress);
      }

      // Advance challenge when face is single, quality OK, and challenge_passed
      // (matches imentora's requirement — but user can still see progress before pass)
      if (!allChallengesDone && data?.face_detected && data?.face_count === 1
          && data?.quality?.overall_ok && data?.challenge_passed) {
        challengePassCountRef.current += 1;
        if (challengePassCountRef.current >= CONSECUTIVE_PASS_REQUIRED) {
          challengePassCountRef.current = 0;
          setActiveProgress(0);
          setLivenessStep((prev) => prev + 1);
        }
      } else if (!allChallengesDone && data?.face_count !== 1) {
        // Reset progress when face count is wrong
        challengePassCountRef.current = 0;
      }
    } catch (err) {
      // ── FAILURE — increment counter, apply backoff, maybe break circuit ─
      failureCountRef.current += 1;
      const failures = failureCountRef.current;

      // Exponential backoff: 1.2s → 2.4s → 4.8s → 8s (capped)
      currentPollMsRef.current = Math.min(
        MAX_POLL_MS,
        BASE_POLL_MS * Math.pow(2, Math.min(failures, 3))
      );

      if (failures >= CIRCUIT_BREAK_AT) {
        circuitBrokenRef.current = true;
        setServerDown(true);
        setServerWarning('Face detection unavailable. You can skip this step for now.');
      } else if (failures >= FAILURE_WARN_AT) {
        setServerWarning('Detection service is slow — waiting…');
      }

      console.warn(`[FaceCapture] analyze-frame failure #${failures}:`, err?.response?.status || err?.message);
    } finally {
      analyzeInFlightRef.current = false;
    }
  }, [cameraReady, photoTaken, currentChallenge, allChallengesDone]);

  // ── Recursive poll scheduler (setTimeout, not setInterval — respects backoff) ──
  useEffect(() => {
    if (!cameraActive || !cameraReady || photoTaken || circuitBrokenRef.current) {
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
      }
      return undefined;
    }

    let cancelled = false;

    const schedule = (delay) => {
      pollTimeoutRef.current = setTimeout(async () => {
        if (cancelled) return;
        await analyzeFrame();
        if (!cancelled) schedule(currentPollMsRef.current);
      }, delay);
    };

    schedule(WARMUP_MS);

    return () => {
      cancelled = true;
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
      }
    };
  }, [cameraActive, cameraReady, photoTaken, analyzeFrame]);

  // ── Capture (Step 7) + validate-face (Step 8) ────────────────────────
  const capturePhoto = async () => {
    const frameData = captureFrameToBase64(videoRef, canvasRef, 0.9);
    if (!frameData) {
      setFaceError('Could not capture frame. Please try again.');
      return;
    }
    setPhotoPreview(frameData);
    setPhotoTaken(true);
    setFaceValidating(true);
    setFaceValid(false);
    setFaceError('');
    setFaceScore(null);
    closeCamera();

    try {
      const { data } = await publicApi.post('/jobseeker/validate-face', {
        photo_base64: frameData,
      });

      if (data?.face_valid) {
        setFaceValid(true);
        setFaceScore(data?.face_score ?? null);
        onPhotoBase64Change?.(frameData);
        onFaceValidChange?.(true);
      } else {
        setFaceValid(false);
        setFaceError(data?.Error || 'No human face detected. Please retake your photo.');
        onPhotoBase64Change?.(null);
        onFaceValidChange?.(false);
      }
    } catch (err) {
      console.error('[FaceCapture] validate-face error:', err);
      setFaceValid(false);
      setFaceError(err?.response?.data?.Error || 'Face validation failed. Please retake your photo.');
      onPhotoBase64Change?.(null);
      onFaceValidChange?.(false);
    } finally {
      setFaceValidating(false);
    }
  };

  const retake = async () => {
    setPhotoTaken(false);
    setPhotoPreview(null);
    setFaceValidating(false);
    setFaceValid(false);
    setFaceScore(null);
    setFaceError('');
    setLivenessStep(0);
    setActiveProgress(0);
    challengePassCountRef.current = 0;
    failureCountRef.current = 0;
    circuitBrokenRef.current = false;
    currentPollMsRef.current = BASE_POLL_MS;
    setServerWarning('');
    setServerDown(false);
    setFirstPollComplete(false);
    onPhotoBase64Change?.(null);
    onFaceValidChange?.(false);
    await openCamera();
  };

  // ── Derived — spoof warning (Step 2) ──────────────────────────────────
  const spoofWarning = faceDetected && !isLive && spoofScore < 0.2;
  const multipleFacesWarning = faceCount > 1;

  // ── RENDER ────────────────────────────────────────────────────────────

  return (
    <Box>
      {/* Section heading — matches JobseekerRegisterForm eyebrow style */}
      <Box sx={{ mb: 3 }}>
        <Typography sx={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.16em',
          color: MUTED, textTransform: 'uppercase', mb: 1,
        }}>
          Face capture
        </Typography>
        <Typography sx={{
          fontSize: 22, color: HEADING, fontWeight: 700,
          letterSpacing: '-0.01em', mb: 0.75,
        }}>
          Verify your{' '}
          <Box component="span" sx={{
            fontFamily: SERIF, fontStyle: 'italic', fontWeight: 400, color: PRIMARY,
          }}>
            identity
          </Box>
        </Typography>
        <Typography sx={{ fontSize: 13.5, color: MUTED, lineHeight: 1.55 }}>
          A quick face reference to protect your account. This step is required to continue.
        </Typography>
      </Box>

      {/* Camera error (permission denied etc.) */}
      {cameraError && (
        <Box sx={{ mb: 2, py: 1.25, borderTop: `1px solid ${LINE}`, borderBottom: `1px solid ${LINE}` }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <WarningAmberOutlined sx={{ fontSize: 16, color: ERROR_COLOR }} />
            <Typography sx={{ fontSize: 13, color: ERROR_COLOR, fontWeight: 600 }}>{cameraError}</Typography>
          </Stack>
        </Box>
      )}

      {/* ── Camera preview / captured photo ── */}
      <Box sx={{
        position: 'relative', width: '100%', maxWidth: 480, mx: 'auto',
        bgcolor: '#000', aspectRatio: '4 / 3', mb: 2,
        border: `1px solid ${LINE}`,
      }}>
        {!photoTaken ? (
          <video
            ref={videoRef}
            autoPlay playsInline muted
            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
          />
        ) : (
          <img
            src={photoPreview}
            alt="Captured"
            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
          />
        )}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Live face-detected pill (top-left overlay) — only during camera preview */}
        {!photoTaken && cameraReady && (
          <Box sx={{
            position: 'absolute', top: 10, left: 10,
            display: 'inline-flex', alignItems: 'center', gap: 0.75,
            px: 1, py: 0.375, bgcolor: 'rgba(255,255,255,0.9)',
            border: `1px solid ${LINE}`,
          }}>
            <Box sx={{
              width: 7, height: 7, borderRadius: '50%',
              bgcolor: faceDetected ? SUCCESS_COLOR : FAINT,
              transition: 'background-color .2s',
            }} />
            <Typography sx={{
              fontSize: 11, fontWeight: 600,
              color: faceDetected ? SUCCESS_COLOR : MUTED,
              letterSpacing: '0.02em',
            }}>
              {faceDetected
                ? 'Face detected'
                : firstPollComplete
                  ? 'Looking for face…'
                  : 'Warming up detection…'}
            </Typography>
          </Box>
        )}
      </Box>

      {/* ── Multiple-faces warning ── */}
      {!photoTaken && multipleFacesWarning && (
        <Box sx={{ mb: 1.5 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <WarningAmberOutlined sx={{ fontSize: 15, color: ERROR_COLOR }} />
            <Typography sx={{ fontSize: 12.5, color: ERROR_COLOR, fontWeight: 600 }}>
              Multiple faces detected. Please make sure only you are in the frame.
            </Typography>
          </Stack>
        </Box>
      )}

      {/* ── Spoof warning ── */}
      {!photoTaken && spoofWarning && !multipleFacesWarning && (
        <Box sx={{ mb: 1.5 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <WarningAmberOutlined sx={{ fontSize: 15, color: ERROR_COLOR }} />
            <Typography sx={{ fontSize: 12.5, color: ERROR_COLOR, fontWeight: 600 }}>
              Please use a live camera — printed or on-screen photos aren't accepted.
            </Typography>
          </Stack>
        </Box>
      )}

      {/* ── Server-status warning (backoff / circuit breaker) ── */}
      {!photoTaken && serverWarning && (
        <Box sx={{ mb: 1.5 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <WarningAmberOutlined sx={{ fontSize: 15, color: ERROR_COLOR }} />
            <Typography sx={{
              fontSize: 12.5,
              color: ERROR_COLOR,
              fontWeight: 600,
            }}>
              {serverWarning}
            </Typography>
          </Stack>
        </Box>
      )}

      {/* ── Live quality indicators (Step 2) ── */}
      {!photoTaken && cameraReady && faceDetected && quality && (
        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          <QualityDot ok={quality.brightness_ok} label="Lighting" />
          <QualityDot ok={quality.blur_ok}       label="Sharpness" />
          <QualityDot ok={quality.centered && quality.face_size_ok} label="Position" />
        </Box>
      )}

      {/* ── Challenge chips + active progress (Steps 4-5) ── */}
      {!photoTaken && (
        <Box sx={{ mb: 2.5 }}>
          <Stack direction="row" spacing={1.5} sx={{ mb: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
            {challenges.map((ch, idx) => {
              const done = idx < livenessStep;
              const active = idx === livenessStep;
              return (
                <ChallengeChip
                  key={ch}
                  label={CHALLENGE_META[ch].label}
                  done={done}
                  active={active}
                  progress={active ? activeProgress : 0}
                />
              );
            })}
          </Stack>

          {/* Feedback text from backend — mirrors imentora's hint area */}
          {!allChallengesDone && feedback && faceDetected && (
            <Typography sx={{
              fontSize: 12.5,
              color: ERROR_COLOR,
              fontWeight: 600,
              textAlign: 'center',
              mt: 1,
            }}>
              {feedback}
            </Typography>
          )}

          {/* All challenges done — ready cue */}
          {allChallengesDone && (
            <Typography sx={{
              fontSize: 13, color: PRIMARY_DARK, textAlign: 'center',
              fontWeight: 700, mt: 1,
            }}>
              Ready to capture — hold still and click Capture.
            </Typography>
          )}
        </Box>
      )}

      {/* ── Validating spinner (Step 8) ── */}
      {faceValidating && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress sx={{ height: 2, bgcolor: TRACK,
            '& .MuiLinearProgress-bar': { bgcolor: PRIMARY } }} />
          <Typography sx={{ fontSize: 12, color: MUTED, textAlign: 'center', mt: 1 }}>
            Verifying your face…
          </Typography>
        </Box>
      )}

      {/* ── Success card (Step 8) — iEvalx serif-italic style ── */}
      {faceValid && (
        <Box sx={{
          my: 3, py: 3, textAlign: 'center',
          borderTop: `1px solid ${LINE}`, borderBottom: `1px solid ${LINE}`,
        }}>
          <CheckCircleOutlined sx={{ fontSize: 32, color: SUCCESS_COLOR, mb: 1 }} />
          <Typography sx={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.18em',
            color: SUCCESS_COLOR, textTransform: 'uppercase', mb: 1,
          }}>
            Face Captured &amp; Face Verified
          </Typography>
          {faceScore != null && (
            <Typography sx={{
              fontFamily: SERIF, fontStyle: 'italic', fontWeight: 400,
              fontSize: 40, color: PRIMARY_DARK, lineHeight: 1, mb: 0.5,
              letterSpacing: '-0.01em',
            }}>
              {Math.round(Number(faceScore) * 100)}%
            </Typography>
          )}
          <Typography sx={{ fontSize: 12.5, color: MUTED, letterSpacing: '0.02em' }}>
            {faceScore != null ? 'Confidence · Ready for submission' : 'Ready for submission'}
          </Typography>
        </Box>
      )}

      {/* ── Face validation error ── */}
      {faceError && photoTaken && (
        <Box sx={{ mb: 2, py: 1.25, borderTop: `1px solid ${LINE}`, borderBottom: `1px solid ${LINE}` }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <WarningAmberOutlined sx={{ fontSize: 16, color: ERROR_COLOR }} />
            <Typography sx={{ fontSize: 13, color: ERROR_COLOR }}>{faceError}</Typography>
          </Stack>
        </Box>
      )}

      {/* ── Actions ── */}
      <Stack direction="row" spacing={2} sx={{ mt: 2, justifyContent: 'center' }}>
        {!photoTaken && (
          <Button
            variant="contained"
            startIcon={<CameraAltOutlined />}
            onClick={capturePhoto}
            disabled={!cameraReady || !allChallengesDone || faceValidating}
            sx={{
              px: 3, py: 1.25, fontSize: 13.5, fontWeight: 700, textTransform: 'none',
              bgcolor: HEADING, color: '#fff', borderRadius: '999px', boxShadow: 'none',
              '&:hover': { bgcolor: '#000', boxShadow: '0 8px 24px rgba(31,31,31,0.18)' },
              '&.Mui-disabled': { bgcolor: '#D3D6D1', color: '#fff' },
            }}
          >
            Capture
          </Button>
        )}
        {photoTaken && !faceValid && !faceValidating && (
          <Button
            variant="outlined"
            startIcon={<ReplayOutlined />}
            onClick={retake}
            sx={{
              px: 3, py: 1.25, fontSize: 13.5, fontWeight: 700, textTransform: 'none',
              borderColor: LINE_HOVER, color: HEADING, borderRadius: '999px',
              '&:hover': { borderColor: HEADING, bgcolor: 'transparent' },
            }}
          >
            Retake
          </Button>
        )}
        {faceValid && (
          <>
            <Button
              variant="outlined"
              startIcon={<ReplayOutlined />}
              onClick={retake}
              sx={{
                px: 3, py: 1.25, fontSize: 13.5, fontWeight: 700, textTransform: 'none',
                borderColor: LINE_HOVER, color: HEADING, borderRadius: '999px',
                '&:hover': { borderColor: HEADING, bgcolor: 'transparent' },
              }}
            >
              Retake
            </Button>
            <Button
              variant="contained"
              onClick={() => onContinue?.()}
              sx={{
                px: 3, py: 1.25, fontSize: 13.5, fontWeight: 700, textTransform: 'none',
                bgcolor: HEADING, color: '#fff', borderRadius: '999px', boxShadow: 'none',
                '&:hover': { bgcolor: '#000', boxShadow: '0 8px 24px rgba(31,31,31,0.18)' },
              }}
            >
              Continue
            </Button>
          </>
        )}
      </Stack>
    </Box>
  );
}

// ── Small helper: sage-dot quality indicator ─────────────────────────────
function QualityDot({ ok, label }) {
  return (
    <Stack direction="row" spacing={0.75} alignItems="center">
      <Box sx={{
        width: 7, height: 7, borderRadius: '50%',
        bgcolor: ok ? SUCCESS_COLOR : ERROR_COLOR,
      }} />
      <Typography sx={{
        fontSize: 11.5, fontWeight: 600,
        color: ok ? SUCCESS_COLOR : ERROR_COLOR,
        letterSpacing: '0.02em',
      }}>
        {label} {ok ? 'OK' : 'Fix'}
      </Typography>
    </Stack>
  );
}

// ── Small helper: iEvalx-style challenge chip with progress line ─────────
function ChallengeChip({ label, done, active, progress }) {
  const borderColor = done ? SUCCESS_COLOR : active ? PRIMARY : LINE;
  const textColor   = done ? SUCCESS_COLOR : active ? HEADING : FAINT;
  const iconColor   = done ? SUCCESS_COLOR : active ? PRIMARY : FAINT;

  return (
    <Box sx={{ minWidth: 140 }}>
      <Box sx={{
        display: 'inline-flex', alignItems: 'center', gap: 0.75,
        px: 1.25, py: 0.5, border: `1px solid ${borderColor}`,
        bgcolor: 'transparent', borderRadius: '999px',
        transition: 'border-color .2s',
      }}>
        {done
          ? <CheckCircleOutlined sx={{ fontSize: 15, color: iconColor }} />
          : <RadioButtonUncheckedOutlined sx={{ fontSize: 15, color: iconColor }} />}
        <Typography sx={{
          fontSize: 11.5, fontWeight: active || done ? 700 : 500,
          color: textColor, letterSpacing: '0.01em',
        }}>
          {label}
        </Typography>
      </Box>
      {/* Progress line under active chip */}
      {active && (
        <Box sx={{
          height: 2, width: '100%', bgcolor: TRACK, mt: 0.75,
          overflow: 'hidden',
        }}>
          <Box sx={{
            height: '100%', width: `${progress}%`, bgcolor: PRIMARY,
            transition: 'width .2s ease-out',
          }} />
        </Box>
      )}
    </Box>
  );
}