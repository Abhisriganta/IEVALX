// BUILD: 2026-09-16-jp-biometric-v1
// ============================================================================
// VoiceRecordStep — Step 4 of jobseeker registration wizard.
// 30-second recording with live 4-state voice activity detection:
//   silent / too_low / ok / disturbed
// Auto-advances to next step 1.5s after a successful recording.
// ============================================================================

import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import {
  Box, Stack, Typography, Button, Alert, LinearProgress, Card, IconButton, Chip,
} from '@mui/material';
import MicOutlined from '@mui/icons-material/MicOutlined';
import StopCircleOutlined from '@mui/icons-material/StopCircleOutlined';
import ReplayOutlined from '@mui/icons-material/ReplayOutlined';
import RefreshOutlined from '@mui/icons-material/RefreshOutlined';
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';

import {
  startMicRecorder, stopMicStream, blobToBase64, mapPermissionError,
  startVoiceActivityDetector, MAX_VOICE_BYTES,
} from '../../../../utils/webcamUtils';

const publicApi = axios.create({ baseURL: '/api' });

const RECORDING_SECONDS = 30;
const AUTO_ADVANCE_MS = 1500;
const FALLBACK_SENTENCE = `I am committed to pursuing excellence in my professional journey and believe that dedication and continuous learning are the foundations of achieving meaningful career success. I value teamwork, effective communication, and maintaining high ethical standards in every task I take on. Throughout my education I have developed strong analytical and problem-solving skills that I am eager to apply in real-world situations, contributing positively wherever I work.`;

// Live message + colour per voice state
const STATE_META = {
  idle:      { label: 'Ready',                              color: 'default', message: '' },
  silent:    { label: 'Silent',                             color: 'error',   message: 'You are silent — please speak / read the paragraph aloud.' },
  too_low:   { label: 'Voice too low',                      color: 'warning', message: 'Your voice is too low — please speak louder.' },
  ok:        { label: 'Voice OK',                           color: 'success', message: 'Voice detected clearly. Keep going.' },
  disturbed: { label: 'Too much background noise',           color: 'error',   message: 'Your voice is too disturbed — please move to a quieter place.' },
};

export default function VoiceRecordStep({
  onVoiceBase64Change,
  onSentenceChange,
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

  const [sentence, setSentence] = useState('');
  const [loadingSentence, setLoadingSentence] = useState(true);
  const [sentenceError, setSentenceError] = useState('');
  const [micError, setMicError] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [voiceState, setVoiceState] = useState('idle');
  const [recordingDone, setRecordingDone] = useState(false);
  const [recordingError, setRecordingError] = useState('');

  const loadSentence = async () => {
    setLoadingSentence(true);
    setSentenceError('');
    try {
      const { data } = await publicApi.get('/jobseeker/voice-sentence');
      if (data?.Sentence) {
        setSentence(data.Sentence);
        onSentenceChange?.(data.Sentence);
      } else {
        throw new Error('No sentence in response');
      }
    } catch (err) {
      console.warn('[VoiceRecord] voice-sentence error, using fallback:', err?.message);
      setSentence(FALLBACK_SENTENCE);
      onSentenceChange?.(FALLBACK_SENTENCE);
      setSentenceError('Using a default sentence (server unavailable).');
    } finally {
      setLoadingSentence(false);
    }
  };

  useEffect(() => {
    loadSentence();
    return () => cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cleanup = () => {
    if (timerRef.current)       { clearInterval(timerRef.current);   timerRef.current = null; }
    if (autoStopRef.current)    { clearTimeout(autoStopRef.current); autoStopRef.current = null; }
    if (autoAdvanceRef.current) { clearTimeout(autoAdvanceRef.current); autoAdvanceRef.current = null; }
    if (detectorRef.current)    { detectorRef.current.stop();        detectorRef.current = null; }
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
    setRecordingError('');
    setVoiceState('idle');
    setElapsed(0);
    setRecordingDone(false);
    onVoiceBase64Change?.(null);

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
        const stats = detector.getStats();
        if (detectorRef.current) { detectorRef.current.stop(); detectorRef.current = null; }
        stopMicStream(streamRef.current);
        streamRef.current = null;

        // ── Verdict logic ─────────────────────────────────────────────
        // Priority: full silence > mostly silent > mostly disturbed > mostly too low > OK
        if (stats.totalChecks === 0) {
          setRecordingError('The microphone did not capture any audio. Please try again.');
          setIsRecording(false);
          setRecordingDone(false);
          chunksRef.current = [];
          return;
        }

        const silentPct    = stats.silentPercent;
        const tooLowPct    = stats.tooLowPercent;
        const okPct        = stats.okPercent;
        const disturbedPct = stats.disturbedPercent;
        const nonSpeechPct = silentPct + tooLowPct + disturbedPct;

        // Full 30s silent
        if (silentPct >= 90) {
          setRecordingError('No voice detected. You were silent for the full recording. Please read the paragraph aloud.');
          setIsRecording(false);
          setRecordingDone(false);
          chunksRef.current = [];
          return;
        }
        // Mostly silent
        if (silentPct > 60) {
          setRecordingError('Your recording was mostly silent. Please read the paragraph aloud clearly.');
          setIsRecording(false);
          setRecordingDone(false);
          chunksRef.current = [];
          return;
        }
        // Mostly disturbed
        if (disturbedPct > 50) {
          setRecordingError('Your recording was too disturbed by background noise. Please move to a quieter place and try again.');
          setIsRecording(false);
          setRecordingDone(false);
          chunksRef.current = [];
          return;
        }
        // Mostly too low
        if (tooLowPct > 60) {
          setRecordingError('Your voice was too low throughout the recording. Please speak louder and try again.');
          setIsRecording(false);
          setRecordingDone(false);
          chunksRef.current = [];
          return;
        }
       
        const usablePct = okPct + tooLowPct;
        const badPct    = silentPct + disturbedPct;
        if (usablePct < 40 || badPct > 60) {
          setRecordingError('We could not clearly hear your voice for enough of the recording. Please try again in a quieter place.');
          setIsRecording(false);
          setRecordingDone(false);
          chunksRef.current = [];
          return;
        }

        // ── Success — assemble blob ────────────────────────────────────
        const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
        if (blob.size > MAX_VOICE_BYTES) {
          setRecordingError('Recording too long. Please try again.');
          setIsRecording(false);
          setRecordingDone(false);
          chunksRef.current = [];
          return;
        }

        try {
          const base64 = await blobToBase64(blob);
          onVoiceBase64Change?.(base64);
          setRecordingDone(true);
          setIsRecording(false);
          setVoiceState('ok');
          // No auto-advance — user must click Next to move on.
        } catch (err) {
          console.error('[VoiceRecord] blob encode error:', err);
          setRecordingError('Failed to process the recording. Please try again.');
          setIsRecording(false);
          setRecordingDone(false);
        }
      };

      recorder.start(1000);
      setIsRecording(true);

      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);

      autoStopRef.current = setTimeout(() => {
        if (recorderRef.current && recorderRef.current.state === 'recording') {
          recorderRef.current.stop();
        }
      }, RECORDING_SECONDS * 1000);
    } catch (err) {
      console.error('[VoiceRecord] mic error:', err);
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
    setRecordingDone(false);
    setRecordingError('');
    onVoiceBase64Change?.(null);
    await startRecording();
  };

  const secondsLeft = Math.max(0, RECORDING_SECONDS - elapsed);
  const progressPct = Math.min(100, (elapsed / RECORDING_SECONDS) * 100);

  const meta = STATE_META[voiceState] || STATE_META.idle;

  return (
    <Box>
      <Stack spacing={2}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Record your voice
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Please read the paragraph below out loud. You have 30 seconds.
          </Typography>
        </Box>

        {sentenceError && <Alert severity="info">{sentenceError}</Alert>}
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
        {recordingError && (
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
            {recordingError}
          </Alert>
        )}

        {/* Sentence card */}
        <Card variant="outlined" sx={{ p: 2, position: 'relative' }}>
          {loadingSentence ? (
            <LinearProgress />
          ) : (
            <Stack direction="row" spacing={1} alignItems="flex-start">
              <Typography sx={{ flex: 1, whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                {sentence}
              </Typography>
              {!isRecording && !recordingDone && (
                <IconButton size="small" onClick={loadSentence} title="Get another paragraph">
                  <RefreshOutlined fontSize="small" />
                </IconButton>
              )}
            </Stack>
          )}
        </Card>

        {/* Live voice-state indicator (during recording only) */}
        {isRecording && (() => {
          // Force red for any bad state (silent / too_low / disturbed); green only when OK.
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

        {/* Timer + progress */}
        {(isRecording || recordingDone) && (
          <Box>
            <LinearProgress variant="determinate" value={progressPct} />
            <Typography variant="body2" align="center" sx={{ mt: 0.5 }}>
              {isRecording ? `${secondsLeft}s remaining` : `Recorded ${elapsed}s`}
            </Typography>
          </Box>
        )}

        {/* Success state */}
        {recordingDone && !recordingError && (
          <Alert
            severity="success"
            icon={<CheckCircleOutlined fontSize="inherit" />}
            sx={{ '& .MuiAlert-message': { fontWeight: 600 } }}
          >
            Voice recorded successfully. Click Next to continue.
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
          {!isRecording && !recordingDone && (
            <Button
              variant="contained"
              startIcon={<MicOutlined />}
              onClick={startRecording}
              disabled={loadingSentence}
            >
              Start recording
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
          {recordingDone && (
            <Button
              variant="outlined"
              startIcon={<ReplayOutlined />}
              onClick={redo}
            >
              Re-record
            </Button>
          )}
          {recordingDone && (
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