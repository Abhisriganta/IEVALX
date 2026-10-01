import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import {
  Box, Stack, Typography, Button, Alert, LinearProgress, Card, Chip,
} from '@mui/material';
import MicOutlined from '@mui/icons-material/MicOutlined';
import StopCircleOutlined from '@mui/icons-material/StopCircleOutlined';
import ReplayOutlined from '@mui/icons-material/ReplayOutlined';
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import ErrorOutlineOutlined from '@mui/icons-material/ErrorOutlineOutlined';

import {
  startMicRecorder, stopMicStream, blobToBase64, mapPermissionError,
  startVoiceActivityDetector,
} from '../../../../utils/webcamUtils';

const publicApi = axios.create({ baseURL: '/api' });

const CHECK_SECONDS = 10;
const AUTO_ADVANCE_MS = 1500;
const MATCH_THRESHOLD = 0.75;
const VERIFICATION_PROMPT = 'Please say this out loud: "This is my voice, and I am registering for iEvalx today."';

const STATE_META = {
  idle:      { label: 'Ready',                     color: 'default', message: '' },
  silent:    { label: 'Silent',                     color: 'error',   message: 'You are silent — please speak clearly.' },
  too_low:   { label: 'Voice too low',              color: 'warning', message: 'Speak louder so we can verify.' },
  ok:        { label: 'Voice OK',                   color: 'success', message: 'Voice detected clearly.' },
  disturbed: { label: 'Background noise',           color: 'error',   message: 'Too much noise — please move to a quiet place.' },
};

export default function VoiceCheckStep({
  voiceReferenceBase64,       // the 30-second base64 from step 4
  voiceReferenceContentType,  // usually 'audio/webm'
  onCheckPassed,              // called with true on success
  onSkip, // kept for backward-compat; no longer used
  onContinue,
  onBack,
}) {
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const detectorRef = useRef(null);
  const timerRef = useRef(null);
  const autoStopRef = useRef(null);
  const autoAdvanceRef = useRef(null);
  const mimeTypeRef = useRef('audio/webm');

  const [referenceId, setReferenceId] = useState(null);
  const [referenceError, setReferenceError] = useState('');
  const [initializing, setInitializing] = useState(true);

  const [micError, setMicError] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [voiceState, setVoiceState] = useState('idle');

  const [verifying, setVerifying] = useState(false);
  const [checkPassed, setCheckPassed] = useState(false);
  const [similarity, setSimilarity] = useState(null);
  const [checkError, setCheckError] = useState('');

  // ── Step 1: create voice reference on mount OR when the reference prop arrives ──
  // NOTE: depending on `voiceReferenceBase64` fixes a race where this step
  // mounts before the parent's biometricVoiceBase64 state has propagated,
  // which previously left the screen stuck on the "no reference" error and
  // gave the impression that voice verification wasn't showing up at all.
  useEffect(() => {
    let cancelled = false;

    // Reset transient init state whenever we (re)try with a new reference.
    setReferenceError('');
    setReferenceId(null);

    (async () => {
      if (!voiceReferenceBase64) {
        // Still waiting on the parent to hand us the base64 — stay in
        // initializing state instead of hard-erroring so the effect can
        // re-run once the prop arrives.
        setInitializing(true);
        return;
      }
      try {
        setInitializing(true);
        const { data } = await publicApi.post('/jobseeker/voice-reference', {
          audio_base64: voiceReferenceBase64,
          content_type: voiceReferenceContentType || 'audio/webm',
        });
        if (cancelled) return;
        if (data?.reference_id) {
          setReferenceId(data.reference_id);
        } else {
          setReferenceError('Could not prepare voice verification. Please try again.');
        }
      } catch (err) {
        if (cancelled) return;
        console.error('[VoiceCheck] voice-reference error:', err);
        setReferenceError(
          err?.response?.data?.Error
          || 'Could not prepare voice verification. Please check your connection and try again.'
        );
      } finally {
        if (!cancelled) setInitializing(false);
      }
    })();
    // Do NOT run full cleanup() here — that would stop recorder/mic if the
    // effect re-runs mid-recording. Only cancel the in-flight request.
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceReferenceBase64, voiceReferenceContentType]);

  // Full cleanup on component unmount (mic / recorder / timers).
  useEffect(() => {
    return () => cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cleanup = () => {
    if (timerRef.current)       { clearInterval(timerRef.current);      timerRef.current = null; }
    if (autoStopRef.current)    { clearTimeout(autoStopRef.current);    autoStopRef.current = null; }
    if (autoAdvanceRef.current) { clearTimeout(autoAdvanceRef.current); autoAdvanceRef.current = null; }
    if (detectorRef.current)    { detectorRef.current.stop();           detectorRef.current = null; }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try { recorderRef.current.stop(); } catch { /* noop */ }
    }
    stopMicStream(streamRef.current);
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
  };

  const startRecording = async () => {
    setMicError('');
    setCheckError('');
    setSimilarity(null);
    setCheckPassed(false);
    setVoiceState('idle');
    setElapsed(0);

    try {
      const { recorder, stream, mimeType, chunks } = await startMicRecorder();
      recorderRef.current = recorder;
      streamRef.current = stream;
      chunksRef.current = chunks;
      mimeTypeRef.current = mimeType;

      const detector = startVoiceActivityDetector(stream, {
        onStateChange: (state) => setVoiceState(state),
      });
      detectorRef.current = detector;

      recorder.onstop = async () => {
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        if (autoStopRef.current) { clearTimeout(autoStopRef.current); autoStopRef.current = null; }
        if (detectorRef.current) { detectorRef.current.stop(); detectorRef.current = null; }
        stopMicStream(streamRef.current);
        streamRef.current = null;

        const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
        chunksRef.current = [];

        try {
          setVerifying(true);
          const base64 = await blobToBase64(blob);
          const { data } = await publicApi.post('/jobseeker/voice-verify-chunk', {
            reference_id: referenceId,
            audio_base64: base64,
            content_type: mimeTypeRef.current,
          });

          const score = typeof data?.similarity === 'number' ? data.similarity : 0;
          setSimilarity(score);

          if (score >= MATCH_THRESHOLD) {
            setCheckPassed(true);
            setIsRecording(false);
            onCheckPassed?.(true);
            // No auto-advance — user must click Next to move on.
          } else {
            const pct = Math.round(score * 100);
            setCheckError(
              `Voice did not match closely enough (${pct}% match — need 75%). ` +
              `Please re-record and speak clearly like you did before.`
            );
            setIsRecording(false);
          }
        } catch (err) {
          console.error('[VoiceCheck] voice-verify-chunk error:', err);
          setCheckError(
            err?.response?.data?.Error
            || 'Voice verification failed. Please try again.'
          );
          setIsRecording(false);
        } finally {
          setVerifying(false);
        }
      };

      recorder.start(1000);
      setIsRecording(true);

      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);

      autoStopRef.current = setTimeout(() => {
        if (recorderRef.current && recorderRef.current.state === 'recording') {
          recorderRef.current.stop();
        }
      }, CHECK_SECONDS * 1000);
    } catch (err) {
      console.error('[VoiceCheck] mic error:', err);
      setMicError(mapPermissionError(err));
    }
  };

  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.stop();
    }
  };

  const redo = async () => {
    cleanup();
    setElapsed(0);
    setVoiceState('idle');
    setCheckError('');
    setCheckPassed(false);
    setSimilarity(null);
    await startRecording();
  };

  const secondsLeft = Math.max(0, CHECK_SECONDS - elapsed);
  const progressPct = Math.min(100, (elapsed / CHECK_SECONDS) * 100);
  const meta = STATE_META[voiceState] || STATE_META.idle;
  const canRecord = !!referenceId && !initializing;

  return (
    <Box>
      <Stack spacing={2}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Verify your voice
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Record a short 10-second clip to confirm the voice matches your previous recording (must match 75% or higher).
          </Typography>
        </Box>

        {initializing && <LinearProgress />}
        {referenceError && (
          <Alert
            severity="error"
            sx={{
              bgcolor: '#FDECEA',
              color: '#C0392B',
              border: '1px solid #C0392B',
              '& .MuiAlert-icon': { color: '#C0392B' },
              fontWeight: 600,
            }}
          >
            {referenceError}
          </Alert>
        )}
        {micError && (
          <Alert
            severity="error"
            sx={{
              bgcolor: '#FDECEA',
              color: '#C0392B',
              border: '1px solid #C0392B',
              '& .MuiAlert-icon': { color: '#C0392B' },
              fontWeight: 600,
            }}
          >
            {micError}
          </Alert>
        )}
        {checkError && (
          <Alert
            severity="error"
            icon={<ErrorOutlineOutlined />}
            sx={{
              bgcolor: '#FDECEA',
              color: '#C0392B',
              border: '1px solid #C0392B',
              '& .MuiAlert-icon': { color: '#C0392B' },
              fontWeight: 600,
            }}
          >
            {checkError}
          </Alert>
        )}

        {/* Verification prompt */}
        <Card variant="outlined" sx={{ p: 2 }}>
          <Typography sx={{ lineHeight: 1.7 }}>
            {VERIFICATION_PROMPT}
          </Typography>
        </Card>

        {/* Live state indicator */}
        {isRecording && (() => {
          const isBad = voiceState === 'silent' || voiceState === 'too_low' || voiceState === 'disturbed';
          const isOk  = voiceState === 'ok';
          const chipSx = isBad
            ? { fontWeight: 700, bgcolor: '#C0392B', color: '#fff', '& .MuiChip-label': { color: '#fff' } }
            : isOk
              ? { fontWeight: 700, bgcolor: '#2E7D32', color: '#fff', '& .MuiChip-label': { color: '#fff' } }
              : { fontWeight: 600 };
          const msgColor = isBad ? '#C0392B' : (isOk ? '#2E7D32' : 'text.secondary');
          return (
            <Card variant="outlined" sx={{ p: 1.5, borderColor: isBad ? '#C0392B' : undefined }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Chip
                  label={meta.label}
                  size="small"
                  sx={chipSx}
                />
                <Typography variant="body2" sx={{ flex: 1, color: msgColor, fontWeight: isBad ? 600 : 400 }}>
                  {meta.message || 'Listening…'}
                </Typography>
              </Stack>
            </Card>
          );
        })()}

        {/* Timer */}
        {(isRecording || verifying) && (
          <Box>
            <LinearProgress variant={verifying ? 'indeterminate' : 'determinate'} value={progressPct} />
            <Typography variant="body2" align="center" sx={{ mt: 0.5 }}>
              {verifying ? 'Verifying your voice…' : `${secondsLeft}s remaining`}
            </Typography>
          </Box>
        )}

        {/* Result */}
        {checkPassed && (
          <Alert
            severity="success"
            icon={<CheckCircleOutlined fontSize="inherit" />}
            sx={{ '& .MuiAlert-message': { fontWeight: 600 } }}
          >
            Voice verified{similarity != null ? ` (${Math.round(similarity * 100)}% match)` : ''}. Click Next to continue.
          </Alert>
        )}

        {/* Controls */}
        <Stack direction="row" spacing={1} justifyContent="center" sx={{ flexWrap: 'wrap', rowGap: 1 }}>
          <Button
            variant="outlined"
            onClick={() => { cleanup(); onBack?.(); }}
            sx={{ minWidth: 120 }}
          >
            Back
          </Button>
          {!isRecording && !checkPassed && !verifying && !checkError && (
            <Button
              variant="contained"
              startIcon={<MicOutlined />}
              onClick={startRecording}
              disabled={!canRecord}
            >
              Start 10-second check
            </Button>
          )}
          {isRecording && (
            <Button
              variant="contained"
              color="error"
              startIcon={<StopCircleOutlined />}
              onClick={stopRecording}
            >
              Stop
            </Button>
          )}
          {(checkError || (!isRecording && !checkPassed && !verifying && similarity !== null)) && (
            <Button
              variant="outlined"
              startIcon={<ReplayOutlined />}
              onClick={redo}
            >
              Re-record
            </Button>
          )}
          {checkPassed && (
            <Button
              variant="contained"
              onClick={() => onContinue?.()}
              sx={{ minWidth: 120 }}
            >
              Next
            </Button>
          )}
        </Stack>
      </Stack>
    </Box>
  );
}