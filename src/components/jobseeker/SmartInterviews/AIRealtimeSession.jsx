
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, CircularProgress, LinearProgress,
} from '@mui/material';
import {
  Mic, MicOff, Videocam, VideocamOff, Warning,
  Timer, StopCircle, CheckCircle, CheckCircleOutlined, Headset,
  FaceOutlined,
} from '@mui/icons-material';

import smartInterviewService from '@/services/api/jobseeker/smartInterviewService';
import {
  connectWS, sendWSMessage, disconnectWS, getWSState, processAudioForWS,
} from '@/services/api/jobseeker/aiRealtimeService';
import AIRealtimeAvatar from './AIRealtimeAvatar';
import campusDriveService from '@/services/api/jobseeker/campusDriveService'; 
import quickInterviewService from '@/services/api/jobseeker/quickInterviewService';
import useInterviewProctoring from '@/hooks/jobseeker/useInterviewProctoring';
import useFaceGate from '@/hooks/jobseeker/useFaceGate';
import proctoringService from '@/services/api/jobseeker/Proctoringservice';
import NoiseSuppressionService from '@/services/noiseSupression';
// ── Design tokens ───────────────────────────────────────────────────────────
const C = {
  navy: '#1E3358', navyLight: '#2D4A7C', accent: '#D97757',
  bg: '#0a0f18', surface: '#111827', surfaceLight: '#1f2937',
  text: '#fff', textSec: 'rgba(255,255,255,0.65)', textMuted: 'rgba(255,255,255,0.35)',
  success: '#10B981', warning: '#F59E0B', error: '#EF4444',
  border: 'rgba(255,255,255,0.08)',
};

// Fixed overlay style — covers DashboardLayout sidebar/header
const FULLSCREEN_OVERLAY = {
  position: 'fixed',
  top: 0, left: 0, right: 0, bottom: 0,
  zIndex: 99998,
  bgcolor: C.bg,
};

// ── Landing-page brand tokens (pine / sage light theme) ─────────────────────
// Shared by init-ready, connecting, error, and completed phases.
const BRAND = {
  navy: '#022124', sage: '#7F9E7E', sageDark: '#6C8B6B', sageText: '#5E815D',
  sageSoft: '#EDF3EC', bg: '#F6F8F3', surface: '#FFFFFF', ink: '#101210',
  muted: '#55584F', faint: '#7A7E76', border: '#E7EAE3', borderStrong: '#D8DDD4',
  done: '#3E6E3E', doneSoft: '#EAF2E9', amber: '#A35A2D',
  errorSoft: '#FBECEA', error: '#B4462F',
};
const FONT_STACK = "'Jost','DM Sans',sans-serif";

// Shared page shell for the pine/sage phase screens
const BRAND_SHELL = {
  position: 'fixed', inset: 0, zIndex: 99998,
  bgcolor: BRAND.bg,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontFamily: FONT_STACK, overflow: 'hidden',
};

// ── Audio config ────────────────────────────────────────────────────────────
const AUDIO_CFG = {
  SILENCE_THRESHOLD: 0.015,
  SILENCE_DURATION: 8000,
  MAX_RECORDING_TIME: 600000,
  MIN_SPEECH_TIME: 300,
  KEEPALIVE_INTERVAL: 25000,
  PLAYBACK_VOLUME: 0.9,
};

const ROUND_META = {
  introduction:  { label: 'Introduction',    icon: '👋', duration: 60,   color: C.textSec },
  interview:     { label: 'Interview',       icon: '💼', duration: 2280, color: '#10B981' },
  communication: { label: 'Communication',   icon: '🗣️', duration: 600,  color: '#3B82F6' },
  technical:     { label: 'Technical',       icon: '💻', duration: 1200, color: '#10B981' },
  hr:            { label: 'HR / Behavioral', icon: '🤝', duration: 900,  color: C.accent  },
};

class SimpleVAD {
  constructor(analyser) {
    this.analyser = analyser;
    this.data = new Uint8Array(analyser.fftSize);
    this.voiceFrames = 0;
    this.silenceFrames = 0;
    this.isVoice = false;
    this.isAIPlaying = false;
    this.noiseFloor = 0.01;   
  }

  setAIPlaying(v) { this.isAIPlaying = v; }

  analyze() {
    if (!this.analyser || this.isAIPlaying) return { isVoice: false, rms: 0 };
    
    this.analyser.getByteTimeDomainData(this.data);
    let sum = 0;
    for (let i = 0; i < this.data.length; i++) {
      const v = (this.data[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / this.data.length);

    
    if (rms < this.noiseFloor) {
      this.noiseFloor = this.noiseFloor * 0.7 + rms * 0.3;
    } else {
      this.noiseFloor = Math.min(this.noiseFloor * 1.005, 0.05);
    }

    const threshold = Math.max(0.02, this.noiseFloor * 3);
    const voiced = rms > threshold;

    if (voiced) {
      this.voiceFrames++;
      this.silenceFrames = 0;
      if (this.voiceFrames >= 5) this.isVoice = true;     // ~400ms attack
    } else {
      this.silenceFrames++;
      this.voiceFrames = 0;
      if (this.silenceFrames >= 15) this.isVoice = false; // ~1.2s release
    }
    return { isVoice: this.isVoice, rms };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const AIRealtimeSession = () => {
  const { configId } = useParams();
  const navigate = useNavigate();
    const isCampus = new URLSearchParams(window.location.search).get('campus') === '1'; 
    const isQuick  = new URLSearchParams(window.location.search).get('quick')  === '1';


  // ── State: session ────────────────────────────────────────────────────────
  const [phase, setPhase] = useState('init');     // init | connecting | live | completed | error
  const [sessionId, setSessionId] = useState(null);
  const sessionIdRef = useRef(null);
  const aiSessionIdRef = useRef(null);
  const [wsUrl, setWsUrl] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [userReady, setUserReady] = useState(false);

  const [permissionState, setPermissionState] = useState('idle');
  const [permissionError, setPermissionError] = useState('');

  // Face gate — required for Standard + Campus, skipped for Quick
  const gate = useFaceGate();

  // ── State: interview ──────────────────────────────────────────────────────
  const [currentRound, setCurrentRound] = useState(
  (isQuick || isCampus) ? 'interview' : 'introduction'
);
  const [roundTime, setRoundTime] = useState(0);
 
  const [sessionMaxSecs, setSessionMaxSecs] = useState(isQuick ? 600 : 2400);
  const isSingleRoundRef = useRef(isQuick || isCampus);

  const [questionNumber, setQuestionNumber] = useState(0);
  const [subtitle, setSubtitle] = useState('');
  const [userTranscript, setUserTranscript] = useState('');

  // ── State: audio ──────────────────────────────────────────────────────────
  const [isRecording, setIsRecording] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  // ── State: proctoring / UI ────────────────────────────────────────────────
  const [cameraOn, setCameraOn] = useState(true);
  const [fullscreenExited, setFullscreenExited] = useState(false);
  const [proctoringAlert, setProctoringAlert] = useState(null);
  const [silenceWarning, setSilenceWarning] = useState(false);
  const [endDialogOpen, setEndDialogOpen] = useState(false);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const vadRef = useRef(null);
  const audioQueueRef = useRef([]);
  const isPlayingRef = useRef(false);
  const audioSourceRef = useRef(null);   
  const noiseSuppressionRef = useRef(null);
  const denoisedStreamRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const recordingStartRef = useRef(null);
  const voiceDetectedRef = useRef(false);
  const keepaliveRef = useRef(null);
  const roundTimerRef = useRef(null);
  const isCompleteRef = useRef(false);
  const chunksRef = useRef([]);
  const audioEndReceivedRef = useRef(false);
  const sessionDataRef = useRef(null);
  const endingRef = useRef(false);

  const startRecordingRef = useRef(null);
  const stopRecordingRef = useRef(null);
  const playNextChunkRef = useRef(null);
  const proctorSessionIdRef = useRef(null);
  const [proctorSessionId, setProctorSessionId] = useState(null);

  // REST proctoring (Django persistence via bridge.py)
  const { workerReady: proctorWorkerReady, faceStatus: proctorFaceStatus } = useInterviewProctoring({
    proctorSessionId: proctorSessionId,
    isActive: phase === 'live' || phase === 'ai_speaking' || phase === 'processing',
    enrolled: isQuick ? { face: true, voice: true } : gate.enrolled,
    videoRef,
    mediaStream: denoisedStreamRef.current || streamRef.current,
    isAISpeaking,
    onTerminate: (_evt, msg) => {
      if (isQuick) {
        setProctoringAlert({ message: '⚠ ' + (msg || 'Proctoring violation detected.'), severity: 'warning' });
        setTimeout(() => setProctoringAlert(null), 6000);
      } else {
        setProctoringAlert({ message: msg || 'Session terminated by proctoring.', severity: 'error' });
        setTimeout(() => { if (doTeardownRef.current) doTeardownRef.current('proctor_terminated'); }, 2000);
      }
    },
    onWarning: (w) => {
      setProctoringAlert({ message: w.message, severity: 'warning', strike: w.strike, maxStrikes: w.maxStrikes });
      setTimeout(() => setProctoringAlert(null), 10000);
    },
  });
  // =========================================================================
  // SHARED TEARDOWN — called by End button AND by backend session_completed
  // =========================================================================
  const doTeardown = useCallback((reason = 'unknown') => {
    if (endingRef.current) return;   // guard against double-fire
    endingRef.current = true;

    console.log('[Session] Teardown triggered, reason=', reason);

    const _proctorSid = proctorSessionIdRef.current;
    if (_proctorSid) {
      proctoringService.endSession(_proctorSid).catch(() => {});
      proctorSessionIdRef.current = null;
    }

    try {
      if (getWSState() === 'open') {
        sendWSMessage({ type: 'manual_stop', reason });
      }
    } catch { /* ignore */ }

       setTimeout(() => disconnectWS(), 3000);

    clearInterval(keepaliveRef.current);
    clearInterval(roundTimerRef.current);
    clearTimeout(silenceTimerRef.current);
    if (stopRecordingRef.current) stopRecordingRef.current(false);

    // If proctor terminated, mark SI as completed directly in case callback doesn't fire
    if (reason === 'proctor_terminated') {
      const sid = aiSessionIdRef.current;
      if (sid) {
        smartInterviewService.updateSessionStatus?.(sid, 'completed').catch(() => {});
      }
    }

    setPhase('completed');

    const djangoId = aiSessionIdRef.current;
    setTimeout(() => {
      if (isQuick) {
        navigate('/jobseeker/profile');
        } else if (djangoId) {
        navigate(`/jobseeker/smart-interviews/ai/results/${djangoId}${isCampus ? '?campus=1' : ''}`);
      } else {
        navigate('/jobseeker/smart-interviews/ai');
      }
    }, 1500);
  }, [navigate]);


  const startSession = useCallback(async () => {
    setPermissionState('requesting');
    setPermissionError('');

    // ── Step 1: acquire mic + camera ────────────────────────────────────
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
        },
      });
    } catch (err) {
      // Distinguish the common failure modes so the user knows what to fix.
      let msg;
      const name = err?.name || '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
        msg = 'Camera and microphone permission was denied. Please allow access from the browser address bar and try again.';
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') {
        msg = 'No camera or microphone was detected. Please connect the devices and try again.';
      } else if (name === 'NotReadableError' || name === 'TrackStartError') {
        msg = 'Your camera or microphone is being used by another application. Close it and try again.';
      } else {
        msg = err?.message || 'Unable to access your camera and microphone. Please check your device settings and try again.';
      }
      console.warn('[startSession] getUserMedia failed:', name, err);
      setPermissionError(msg);
      setPermissionState('denied');
      return;
    }


    const hasVideo = stream.getVideoTracks().length > 0;
    const hasAudio = stream.getAudioTracks().length > 0;
    if (!hasVideo || !hasAudio) {
      stream.getTracks().forEach((t) => t.stop());
      const missing = !hasVideo && !hasAudio
        ? 'camera and microphone'
        : !hasVideo ? 'camera' : 'microphone';
      setPermissionError(
        `Access to your ${missing} was not granted. Both are required to start the interview.`
      );
      setPermissionState('denied');
      return;
    }

    // ── Step 3: stash stream so the init effect below reuses it ─────────
    streamRef.current = stream;
    setPermissionState('granted');

  
    try { await document.documentElement.requestFullscreen(); } catch (err) {
      console.warn('[Fullscreen] API unavailable:', err.message, '— using CSS overlay instead');
    }

    // ── Step 5: hand off to the init effect (starts backend + WebSocket) ─
    setUserReady(true);
  }, []);

  // =========================================================================
  // CONNECT WEBSOCKET — called directly after camera/mic acquired
  // =========================================================================
  const connectWebSocket = useCallback(() => {
    const data = sessionDataRef.current;
    if (!data) return;

    connectWS(data.session_id, data.websocket_url, {
      onOpen: () => {
        setIsConnected(true);
        setPhase('live');
        startKeepAlive();
      },
      onMessage: (msg) => {
        if (handleWSMessageRef.current) handleWSMessageRef.current(msg);
      },
      onError: (err) => console.error('[WS] Error:', err),
      onClose: (evt) => {
        setIsConnected(false);
        if (evt?.code !== 1000 && !endingRef.current) {
          console.warn('[WS] Closed unexpectedly:', evt?.code);
        }
      },
    });
  }, []);

  // ============================================
  // AUDIO RECORDING — Student's microphone
  // ===========================================
  const startRecording = useCallback(() => {
    console.log('[DEBUG startRecording] called. isMuted=', isMuted, 'stream=', !!streamRef.current, 'isPlaying=', isPlayingRef.current);
    if (isMuted || !streamRef.current || isPlayingRef.current) {
      console.warn('[DEBUG startRecording] BAILED — guard failed');
      return;
    }

    const audioTracks = streamRef.current.getAudioTracks().filter(t => t.readyState === 'live');
    if (!audioTracks.length) return;

    try {
      // Prefer the RNNoise-denoised stream when the chain is up; otherwise
      // fall back to the raw mic tracks (preserves original behaviour).
      const audioStream = denoisedStreamRef.current
        ? denoisedStreamRef.current
        : new MediaStream(audioTracks);
      const recorder = new MediaRecorder(audioStream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      });

      chunksRef.current = [];
      recordingStartRef.current = Date.now();
      voiceDetectedRef.current = false;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        console.log('[DEBUG onstop] chunks=', chunksRef.current.length);
        if (chunksRef.current.length === 0) { console.warn('[DEBUG onstop] No chunks — skipping'); return; }
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        console.log('[DEBUG onstop] blob size=', blob.size, 'bytes');
        if (blob.size < 500) { console.warn('[DEBUG onstop] Blob too small — skipping'); return; }

        try {
           const msg = await processAudioForWS(blob);
          msg.round = currentRound;
          console.log('[DEBUG onstop] ✅ Sending audio to backend, type=', msg.type, 'audioLen=', (msg.audio || '').length);
            sendWSMessage(msg);
          sendWSMessage({ type: 'silence_detected', reason: 'recording_stopped', round: currentRound });
          setUserTranscript('Processing…');
        } catch (err) {
          console.error('[Record] Send failed:', err);
        }
      };

      recorder.start(100);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      console.log('[DEBUG startRecording] ✅ MediaRecorder started, state=', recorder.state);

      startSilenceDetection();

     // Audio level polling + post-speech silence detection
      let postSpeechSilenceStart = 0;
      const POST_SPEECH_SILENCE_MS = 3000;
      const MAX_RECORDING_MS = 300000;   // 5 min absolute ceiling — only fires if VAD fails completely

      const levelPoll = setInterval(() => {
        if (vadRef.current) {
          const { rms, isVoice } = vadRef.current.analyze();
          setAudioLevel(rms);
          if (isVoice) {
            voiceDetectedRef.current = true;
            postSpeechSilenceStart = 0;
            clearTimeout(silenceTimerRef.current);
            setSilenceWarning(false);
          } else if (voiceDetectedRef.current && postSpeechSilenceStart === 0) {
            postSpeechSilenceStart = Date.now();
          } else if (voiceDetectedRef.current && postSpeechSilenceStart > 0) {
            if (Date.now() - postSpeechSilenceStart > POST_SPEECH_SILENCE_MS) {
              console.log('[Record] Post-speech silence detected — sending audio');
              if (stopRecordingRef.current) stopRecordingRef.current(true);
            }
          }
        }
        const elapsed = recordingStartRef.current ? Date.now() - recordingStartRef.current : 0;
        const currentlyVoice = vadRef.current?.isVoice ?? false;
        if (elapsed > MAX_RECORDING_MS && !currentlyVoice) {
          console.log('[Record] Max recording ceiling reached (no active speech) — sending audio');
          if (stopRecordingRef.current) stopRecordingRef.current(true);
        }
      }, 80);

      recorder._levelPoll = levelPoll;
    } catch (err) {
      console.error('[Record] Start failed:', err);
    }
  }, [isMuted, currentRound]);

  const stopRecording = useCallback((send = true) => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;

    if (recorder._levelPoll) clearInterval(recorder._levelPoll);
    clearTimeout(silenceTimerRef.current);

    try {
      recorder.stop();
    } catch { /* ignore */ }

    mediaRecorderRef.current = null;
    setIsRecording(false);
    setAudioLevel(0);
  }, []);

  useEffect(() => { startRecordingRef.current = startRecording; }, [startRecording]);
  useEffect(() => { stopRecordingRef.current = stopRecording; }, [stopRecording]);

  // ── Silence detection ────────────────────
  const startSilenceDetection = useCallback(() => {
    clearTimeout(silenceTimerRef.current);

    silenceTimerRef.current = setTimeout(() => {
      if (!voiceDetectedRef.current && mediaRecorderRef.current?.state === 'recording') {
        setSilenceWarning(true);

        silenceTimerRef.current = setTimeout(() => {
          setSilenceWarning(false);
          stopRecording(true);
         sendWSMessage({ type: 'silence_detected', reason: 'frontend_timeout', round: currentRound });
        }, 3000);
      }
    }, AUDIO_CFG.SILENCE_DURATION);
  }, [currentRound, stopRecording]);

  // ===========================================
  // AUDIO PLAYBACK — TTS chunks from backend
  // ============================================
  const playNextChunk = useCallback(async () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;

      if (audioEndReceivedRef.current) {
        audioEndReceivedRef.current = false;
        setIsAISpeaking(false);
        if (vadRef.current) vadRef.current.setAIPlaying(false);
        if (startRecordingRef.current) startRecordingRef.current();
      }
      return;
    }

    isPlayingRef.current = true;
    setIsAISpeaking(true);
    if (vadRef.current) vadRef.current.setAIPlaying(true);
    if (stopRecordingRef.current) stopRecordingRef.current(false);
const hexStr = audioQueueRef.current.shift();
    try {
      const bytes = new Uint8Array(hexStr.length / 2);
      for (let i = 0; i < hexStr.length; i += 2) {
        bytes[i / 2] = parseInt(hexStr.substr(i, 2), 16);
      }

      let ctx = audioContextRef.current;
      if (!ctx || ctx.state === 'closed') {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        audioContextRef.current = ctx;
      }
      if (ctx.state === 'suspended') await ctx.resume();

      const arrayBuffer = bytes.buffer.slice(0);

      let audioBuf;
      try {
        audioBuf = await ctx.decodeAudioData(arrayBuffer);
      } catch {
        const view = new DataView(arrayBuffer);
        const numSamples = Math.floor(arrayBuffer.byteLength / 2);
        if (numSamples === 0) throw new Error('Empty PCM chunk');
        audioBuf = ctx.createBuffer(1, numSamples, 24000);
        const channel = audioBuf.getChannelData(0);
        for (let i = 0; i < numSamples; i++) {
          channel[i] = view.getInt16(i * 2, true) / 32768.0;
        }
      }

      const source = ctx.createBufferSource();
      source.buffer = audioBuf;
      audioSourceRef.current = source;   


      const gain = ctx.createGain();
      gain.gain.value = AUDIO_CFG.PLAYBACK_VOLUME;
      source.connect(gain).connect(ctx.destination);

      const safetyMs = (audioBuf.duration * 1000) + 2000;
      let advanced = false;
      const safetyTimer = setTimeout(() => {
        if (!advanced) {
          advanced = true;
          console.warn('[Audio] Safety timeout — onended did not fire, forcing next chunk');
          if (playNextChunkRef.current) playNextChunkRef.current();
        }
      }, safetyMs);

      source.onended = () => {
        if (!advanced) {
          advanced = true;
          clearTimeout(safetyTimer);
          if (playNextChunkRef.current) playNextChunkRef.current();
        }
      };
      source.start(0);
    } catch (err) {
      console.warn('[Audio] Skipping chunk, decode error:', err.message);
      if (playNextChunkRef.current) playNextChunkRef.current();
    }
  }, []);

  useEffect(() => { playNextChunkRef.current = playNextChunk; }, [playNextChunk]);

  // =========================================================================
  // WebSocket message handler
  // =========================================================================
  const handleWSMessage = useCallback((msg) => {
    const { type } = msg;
    if (msg.is_single_round) isSingleRoundRef.current = true;

    switch (type) {
    case 'ai_response':
  setSubtitle(msg.text || '');
  setQuestionNumber(msg.question_number || questionNumber);
  if (!isCompleteRef.current && msg.stage && msg.stage !== currentRound) {
    if (msg.is_single_round) {
      if (currentRound !== 'interview') setCurrentRound('interview');
    } else {
      setCurrentRound(msg.stage);
      setRoundTime(0);
    }
  }
  break;

      case 'audio_reset':
        try {
          if (audioSourceRef.current) {
            audioSourceRef.current.onended = null;   
            audioSourceRef.current.stop();
            audioSourceRef.current.disconnect();
            audioSourceRef.current = null;
          }
        } catch (_) { /* source may already be stopped */ }
        audioQueueRef.current = [];
        isPlayingRef.current = false;
        audioEndReceivedRef.current = false;
        break;

      case 'audio_chunk':
        if (msg.audio) {
          audioQueueRef.current.push(msg.audio);
          if (!isPlayingRef.current && playNextChunkRef.current) playNextChunkRef.current();
        }
        break;


     case 'audio_end':
        console.log('[DEBUG audio_end] received. isPlaying=', isPlayingRef.current, 'queueLen=', audioQueueRef.current.length);
        audioEndReceivedRef.current = true;
        if (!isPlayingRef.current && audioQueueRef.current.length === 0) {
          // Queue already drained — start recording immediately
          audioEndReceivedRef.current = false;
          setIsAISpeaking(false);
          if (vadRef.current) vadRef.current.setAIPlaying(false);
          if (startRecordingRef.current) startRecordingRef.current();
        }
        break;

     case 'round_transition':
        setCurrentRound(msg.to_stage || msg.new_round || msg.round || currentRound);
        setRoundTime(0);
        setQuestionNumber(0);
        setSubtitle(msg.text || `Moving to ${msg.to_stage || 'next'} round…`);
        break;

      case 'silence_prompt':
      case 'silence_detected':
        setSilenceWarning(true);
        setTimeout(() => setSilenceWarning(false), 4000);
        break;

      case 'session_completed':
        if (doTeardownRef.current) doTeardownRef.current('backend_completed');
        break;

      case 'session_terminated':
        if (isQuick) {
          setProctoringAlert({ message: '⚠ Proctoring violation detected. Please stay on screen.', severity: 'warning' });
          setTimeout(() => setProctoringAlert(null), 6000);
        } else {
          if (doTeardownRef.current) doTeardownRef.current('backend_completed');
        }
        break;

      case 'interview_complete': {
        const waitMs = msg.wait_for_audio_ms ?? 6000;
        console.log('[WS] interview_complete — deferring teardown by', waitMs, 'ms');
        setTimeout(() => {
          if (doTeardownRef.current) doTeardownRef.current('backend_completed');
        }, waitMs);
        break;
      }

      case 'timer_tick':
        if (typeof msg.remaining_seconds === 'number') {
          const _lockedMax = msg.is_single_round
            ? sessionMaxSecs
            : (ROUND_META[currentRound]?.duration || sessionMaxSecs);
          const _remaining = Math.max(0, msg.remaining_seconds);
          setRoundTime(Math.max(0, _lockedMax - _remaining));
          // Freeze at 00:00 once backend says so
          if (_remaining === 0) {
            isCompleteRef.current = true;
            clearInterval(roundTimerRef.current);
          }
        }
        break;

      case 'phase_change':
        if (msg.phase === 'complete') {
          isCompleteRef.current = true;
          clearInterval(roundTimerRef.current);
          setRoundTime(sessionMaxSecs);
        } else if (!isCompleteRef.current) {
          if (msg.is_single_round) {
            if (currentRound !== 'interview') setCurrentRound('interview');
            // NOTE: no setSessionMaxSecs, no setRoundTime — timer stays continuous.
          } else if (msg.phase && msg.phase !== currentRound) {
            setCurrentRound(msg.phase);
            setRoundTime(0);
          }
        }
        break;

      case 'model_loading':
        setSubtitle(msg.message || 'Preparing your interview…');
        break;

      case 'model_ready':
        setSubtitle(msg.message || 'AI interviewer is ready');
        break;

      case 'verification_warning':
      case 'proctoring_warning':
        setProctoringAlert({
          message: msg.message || msg.warning || 'Proctoring violation detected',
          severity: msg.severity === 'high' ? 'error' : 'warning',
        });
        setTimeout(() => setProctoringAlert(null), 6000);
        break;

      case 'proctoring_ok':
        break;

      case 'voice_identity_warning':
        setProctoringAlert({ message: msg.message || 'Voice mismatch detected', severity: 'error' });
        setTimeout(() => setProctoringAlert(null), 5000);
        break;

      case 'language_warning':
        setProctoringAlert({ message: msg.message || 'Please maintain professional language', severity: 'error' });
        setTimeout(() => setProctoringAlert(null), 5000);
        break;

      case 'language_switch_warning':
        setProctoringAlert({ message: msg.message || 'Please respond in English', severity: 'warning' });
        setTimeout(() => setProctoringAlert(null), 5000);
        break;

      case 'voice_not_captured':
        setProctoringAlert({ message: "We didn't catch that. Please speak clearly in complete sentences.", severity: 'warning' });
        setTimeout(() => setProctoringAlert(null), 4000);
        if (startRecordingRef.current) startRecordingRef.current();
        break;

      default:
        console.log('[WS] Unhandled message type:', type, msg);
    }
  }, [sessionId, navigate, currentRound, questionNumber]);

  const handleWSMessageRef = useRef(handleWSMessage);
  useEffect(() => { handleWSMessageRef.current = handleWSMessage; }, [handleWSMessage]);

  // Keep doTeardown stable in a ref so WS handler can call it without stale closure
  const doTeardownRef = useRef(doTeardown);
  useEffect(() => { doTeardownRef.current = doTeardown; }, [doTeardown]);


  const handleEndInterview = () => {
    setEndDialogOpen(false);
    if (doTeardownRef.current) doTeardownRef.current('user_requested');
  };

  useEffect(() => {
    if (!userReady) return;
    let cancelled = false;

    const init = async () => {
      try {
        setPhase('connecting');
        const data = isCampus
  ? await campusDriveService.startCampusDrive(configId) 
  : isQuick
  ? await quickInterviewService.startQuickInterview()  
  : await smartInterviewService.startRealtimeAI(configId);

        if (cancelled) return;
        if (!data?.session_id) throw new Error('No session_id in response');

        setSessionId(data.session_id);
        sessionIdRef.current = data.session_id;
        aiSessionIdRef.current = data.ai_session_id;
        if (data.proctor_session_id) {
          proctorSessionIdRef.current = data.proctor_session_id;
          setProctorSessionId(data.proctor_session_id);
        }
        setWsUrl(data.websocket_url || null);
        sessionDataRef.current = data;
        if (data.first_question) setSubtitle(data.first_question);  


        let stream = streamRef.current;
        if (!stream) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480, facingMode: 'user' },
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              sampleRate: 44100,
            },
          });
          streamRef.current = stream;
        }

        // Audio context + analyser for VAD
        const ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 44100 });
        audioContextRef.current = ctx;
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.4;

        // ── RNNoise noise suppression ────────────────────────────────────
        // Runs mic through pre-filter + RNNoise. Analyser and MediaRecorder
        // both see the DENOISED signal. Falls back to raw mic if unavailable.
        try {
          const ns = new NoiseSuppressionService();
          const exitNode = await ns.createNode(ctx);
          const dest = ctx.createMediaStreamDestination();
          src.connect(ns.getEntryNode());
          exitNode.connect(analyser);
          exitNode.connect(dest);
          noiseSuppressionRef.current = ns;
          denoisedStreamRef.current = dest.stream;
          console.log('[Session] RNNoise noise suppression attached');
        } catch (nsErr) {
          console.warn('[Session] Noise suppression unavailable, using raw mic:', nsErr?.message);
          src.connect(analyser);
        }
        // ─────────────────────────────────────────────────────────────────

        analyserRef.current = analyser;
        vadRef.current = new SimpleVAD(analyser);

        if (!cancelled) {
          connectWebSocket();
        }

     } catch (err) {
        if (!cancelled) {
          console.error('[Session] Init failed:', err);
          const detail = err?.response?.data?.detail
            || err?.response?.data?.message
            || err.message
            || 'Failed to start interview';
          setErrorMsg(detail);
          setPhase('error');
        }
      }
    };

    init();
    return () => { cancelled = true; };
  }, [configId, userReady]);

  // =========================================================================
  // Attach camera stream to <video> once live UI mounts
  // =========================================================================
  useEffect(() => {
    if (phase === 'live' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [phase]);

  // =========================================================================
  // CLEANUP on unmount
  // =========================================================================
  useEffect(() => {
    return () => {
      disconnectWS();
      clearInterval(keepaliveRef.current);
      clearInterval(roundTimerRef.current);
      clearTimeout(silenceTimerRef.current);
      try { noiseSuppressionRef.current?.destroy(); } catch { /* ignore */ }
      noiseSuppressionRef.current = null;
      denoisedStreamRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioContextRef.current?.close().catch(() => {});
      try {
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      } catch { /* ok */ }
    };
  }, []);

  // =========================================
  // KEEPALIVE ping
  // =========================================
  const startKeepAlive = useCallback(() => {
    clearInterval(keepaliveRef.current);
    keepaliveRef.current = setInterval(() => {
      if (getWSState() === 'open') {
        sendWSMessage({ type: 'ping', timestamp: Date.now() });
      }
    }, AUDIO_CFG.KEEPALIVE_INTERVAL);
  }, []);

  // ================================================
  // ROUND TIMER — counts up every second while live
  // ===============================================
  useEffect(() => {
    if (phase !== 'live') return;
    clearInterval(roundTimerRef.current);
    setRoundTime(0);

    roundTimerRef.current = setInterval(() => {
      setRoundTime((t) => t + 1);
    }, 1000);

    return () => clearInterval(roundTimerRef.current);
  }, [phase, currentRound]);

  // ── Fullscreen listener ──────
  useEffect(() => {
    const onFs = () => {
      if (!document.fullscreenElement && phase === 'live') {
        setFullscreenExited(true);
      }
    };
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, [phase]);

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    streamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !next; });
    if (next) stopRecording(false);
  };

  const toggleCamera = () => {
    const next = !cameraOn;
    setCameraOn(next);
    streamRef.current?.getVideoTracks().forEach((t) => { t.enabled = next; });
  };

  // ── Voice check frames (every 3s while recording) ─────
  useEffect(() => {
    if (!isRecording || phase !== 'live') return;

    const interval = setInterval(async () => {
      if (getWSState() !== 'open') return;
      const stream = denoisedStreamRef.current || streamRef.current;
      if (!stream) return;

      try {
        const ctx = new AudioContext({ sampleRate: 16000 });
        const source = ctx.createMediaStreamSource(stream);
        const processor = ctx.createScriptProcessor(4096, 1, 1);
        const chunks = [];

        processor.onaudioprocess = (e) => {
          const data = e.inputBuffer.getChannelData(0);
          const pcm16 = new Int16Array(data.length);
          for (let i = 0; i < data.length; i++) {
            pcm16[i] = Math.max(-32768, Math.min(32767, Math.floor(data[i] * 32767)));
          }
          chunks.push(pcm16);
        };

        source.connect(processor);
        processor.connect(ctx.destination);

        await new Promise((r) => setTimeout(r, 500));
        processor.disconnect();
        source.disconnect();
        ctx.close();

        if (chunks.length === 0) return;
        const total = chunks.reduce((s, c) => s + c.length, 0);
        const merged = new Int16Array(total);
        let off = 0;
        for (const c of chunks) { merged.set(c, off); off += c.length; }

        const b64 = btoa(String.fromCharCode(...new Uint8Array(merged.buffer)));
        sendWSMessage({ type: 'voice_check_pcm', audio: b64, sample_rate: 16000 });
      } catch { /* ignore */ }
    }, 3000);

    return () => clearInterval(interval);
  }, [isRecording, phase]);

  // ========================
  // RENDER helpers
  // ========================
  const rm = ROUND_META[currentRound] || ROUND_META.introduction;
  const maxDuration = (isSingleRoundRef.current || currentRound === 'interview') ? sessionMaxSecs : rm.duration;
  const timeLeft    = Math.max(0, maxDuration - roundTime);
  const isOverTime  = roundTime > maxDuration;
  const fmtTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  // Normal countdown; when over limit show elapsed overtime in amber (+M:SS)
  const timerDisplay = isOverTime ? `+${fmtTime(roundTime - maxDuration)}` : fmtTime(timeLeft);

  // ── PHASE: Error ─────────
  if (phase === 'error') {
    const _backPath = isCampus ? '/jobseeker/smart-interviews/campus-drive'
      : isQuick ? '/jobseeker/profile'
      : '/jobseeker/smart-interviews/ai';
    const _backLabel = isCampus ? 'Back to Campus Drive'
      : isQuick ? 'Back to Profile'
      : 'Back to AI Interviews';

    return (
      <Box sx={BRAND_SHELL}>
        {/* Subtle background decoration — matches ready screen */}
        <Box aria-hidden sx={{
          position: 'absolute', top: '-12%', right: '-5%',
          width: '45vmin', height: '45vmin', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(127,158,126,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <Box aria-hidden sx={{
          position: 'absolute', bottom: '-10%', left: '-8%',
          width: '35vmin', height: '35vmin', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(2,33,36,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Card */}
        <Box sx={{
          position: 'relative', zIndex: 1,
          bgcolor: BRAND.surface,
          borderRadius: '24px',
          border: `1px solid ${BRAND.border}`,
          boxShadow: '0 24px 64px rgba(2,33,36,0.10), 0 4px 16px rgba(2,33,36,0.06)',
          width: { xs: 'calc(100% - 32px)', sm: 440 },
          maxWidth: 440,
          px: { xs: 3.5, sm: 4.5 }, py: { xs: 4, sm: 4.5 },
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 2.25, textAlign: 'center',
        }}>
          {/* Iconography — soft amber ring around a warning glyph */}
          <Box sx={{
            width: 72, height: 72, borderRadius: '50%',
            bgcolor: BRAND.errorSoft,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `1px solid ${BRAND.border}`,
          }}>
            <Warning sx={{ fontSize: 36, color: BRAND.error }} />
          </Box>

          <Typography sx={{
            color: BRAND.ink, fontWeight: 600, fontSize: '1.35rem',
            letterSpacing: '-0.01em', lineHeight: 1.2,
            fontFamily: "'DM Serif Display','Jost',serif",
          }}>
            Unable to Start Interview
          </Typography>

          <Typography sx={{
            color: BRAND.muted, fontSize: '0.925rem', lineHeight: 1.55,
            maxWidth: 340,
          }}>
            {errorMsg || 'Something went wrong while preparing your interview. Please try again.'}
          </Typography>

          {/* Subtle divider tint */}
          <Box sx={{ width: '100%', height: 1, bgcolor: BRAND.border, my: 0.5 }} />

          <Button
            fullWidth
            variant="contained"
            onClick={() => navigate(_backPath)}
            sx={{
              bgcolor: BRAND.navy,
              color: '#fff',
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.95rem',
              borderRadius: '12px',
              py: 1.35,
              boxShadow: '0 6px 16px rgba(2,33,36,0.18)',
              '&:hover': {
                bgcolor: '#043034',
                boxShadow: '0 8px 20px rgba(2,33,36,0.24)',
              },
            }}
          >
            {_backLabel}
          </Button>

          <Typography sx={{ color: BRAND.faint, fontSize: '0.75rem', mt: 0.25 }}>
            Need help? Contact support if the issue persists.
          </Typography>
        </Box>
      </Box>
    );
  }

  // ── PHASE: Init — Ready screen (pine/sage theme, fit-to-viewport) ────────
  if (phase === 'init' && !userReady) {
    const _BRAND = {
      navy: '#022124', sage: '#7F9E7E', sageDark: '#6C8B6B', sageText: '#5E815D',
      sageSoft: '#EDF3EC', bg: '#F6F8F3', surface: '#FFFFFF', ink: '#101210',
      muted: '#55584F', faint: '#7A7E76', border: '#E7EAE3', borderStrong: '#D8DDD4',
      done: '#3E6E3E', doneSoft: '#EAF2E9', amber: '#A35A2D',
    };
    const _FONT = "'Jost','DM Sans',sans-serif";
    const _checks = [
      { icon: Videocam, label: 'Camera & microphone will be enabled' },
      { icon: Headset,  label: 'Browser will enter fullscreen mode' },
      { icon: Warning,  label: 'Proctoring enabled throughout the interview' },
    ];
    const _backPath = isCampus ? '/jobseeker/smart-interviews/campus-drive'
      : isQuick ? '/jobseeker/profile'
      : '/jobseeker/smart-interviews/ai';
    const _backLabel = isCampus ? 'Campus Drive'
      : isQuick ? 'Profile'
      : 'AI Interviews';

    // ── Mode-aware instruction content ──────────────────────────────────────
    // Standard / Campus / Quick are three genuinely different flows.
    // Layout is identical; only the copy inside each card changes.
    const _mode = isQuick ? 'quick' : isCampus ? 'campus' : 'standard';
    const _content = {
      standard: {
        headerSubtitle: 'A structured AI-powered interview for the role you applied to.',
        cards: [
          {
            title: 'What is this interview?',
            icon: Headset,
            rules: [
              [Headset, 'This is a formal AI-powered interview for the specific role you applied to. Your responses and CGPS scores are shared with the employer as part of your application.'],
              [Timer, 'The session runs for 40 minutes and cannot be paused, extended, or restarted once it begins.'],
              [CheckCircleOutlined, 'Questions are drawn from your resume and the job description — expect a mix of resume deep-dives and role-specific scenarios.'],
              [Mic, 'The interaction is voice-based. The AI speaks aloud, listens to your reply, transcribes it in real time, and adapts follow-up questions based on what you say.'],
              [CheckCircle, 'You are scored on Communication, Grasp, Professionalism, and Structure (CGPS). Scores, written feedback, and a PDF report appear on your dashboard and are shared with the employer.'],
            ],
          },
          {
            title: 'How to answer well',
            icon: CheckCircleOutlined,
            rules: [
              [Mic, 'Speak clearly and at a natural, moderate pace. The AI transcribes your voice as you speak, so avoid mumbling or rushing.'],
              [Videocam, 'Look towards the camera as you would with a real interviewer — not down at the keyboard or off to the side.'],
              [Timer, 'Take a short moment to think before answering. Brief pauses are natural and lead to a better structured reply.'],
              [CheckCircleOutlined, 'For behavioural questions, use the STAR method — Situation, Task, Action, Result. It maps directly to the Structure part of your CGPS score.'],
              [CheckCircle, 'When asked about your projects or past work, use specific examples from your resume — what you built, decisions you made, tools you used, and what you learned.'],
              [Headset, 'If a question is unclear, ask for it to be rephrased. That is much better than guessing what it meant.'],
              [Warning, 'Speak in your own words. Reading from prepared scripts is usually detectable in the transcript and lowers your Communication score.'],
            ],
          },
          {
            title: 'Before you begin',
            icon: Videocam,
            rules: [
              [Warning, 'Make sure the resume on your Profile matches the one you applied with. Questions are built from both your resume and the job description.', true],
              [Videocam, 'Use Google Chrome or Microsoft Edge (latest version) on a laptop or desktop. Mobile browsers are not supported.'],
              [Mic, 'A working webcam and microphone are required. Grant camera and microphone permissions when the browser prompts you on this page.'],
              [FaceOutlined, 'You will need to complete face verification (right sidebar) before the Start Interview button becomes active.'],
              [CheckCircle, 'Use a stable internet connection — at least 5 Mbps is recommended. Wired or strong Wi-Fi works best.'],
              [Headset, 'Sit in a quiet, well-lit room with your face clearly visible in the centre of the frame. Background noise interferes with the transcript.'],
              [Timer, 'Set aside at least 45 uninterrupted minutes — 40 for the interview itself, plus a few minutes on either side.'],
            ],
          },
          {
            title: 'Session monitoring',
            icon: Warning,
            subtitle: 'The interview runs in a proctored fullscreen window. The following activities are logged, included in your report, and shared with the employer.',
            rules: [
              [Warning, 'The interview runs in fullscreen mode. Exiting fullscreen — even briefly — is recorded as a violation.', true],
              [Warning, 'Do not switch browser tabs, open other applications, or interact with anything outside the interview window.', true],
              [VideocamOff, 'Only you should be visible on camera. If additional faces are detected, the session is flagged and may be terminated.', true],
              [MicOff, 'Do not read from notes, printed material, or another screen, and do not receive help from another person in the room.', true],
              [Warning, 'Repeated or serious violations will end your interview automatically, and the incident will be reported to the employer as part of your application.', true],
            ],
          },
        ],
        warningStrip: 'Once you click "Start Interview" the 40-minute timer begins and the session cannot be paused, restarted, or repeated. Make sure your resume is up to date, your camera and microphone are working, face verification is complete, and you are settled in a quiet space for the full duration.',
      },

      campus: {
        headerSubtitle: 'Your 30-minute campus placement interview, based on your resume.',
        cards: [
          {
            title: 'What is this interview?',
            icon: Headset,
            rules: [
              [Headset, "This is your campus placement interview, run as part of your college's placement drive. Your responses and CGPS scores are shared with the visiting employer and your placement office."],
              [Timer, 'The session runs for 30 minutes and cannot be paused, extended, or restarted once it begins.'],
              [CheckCircleOutlined, 'Questions are generated from your uploaded resume, focused on your projects, core concepts, and behavioural situations — no job description is used.'],
              [Mic, 'The interaction is voice-based. The AI speaks aloud, listens to your reply, transcribes it in real time, and adapts follow-up questions based on what you say.'],
              [CheckCircle, 'You are scored on Communication, Grasp, Professionalism, and Structure (CGPS). Scores, written feedback, and a PDF report are shared with the visiting employer and your placement team.'],
            ],
          },
          {
            title: 'How the 30 minutes are spent',
            icon: Timer,
            rules: [
              [Headset, 'Introduction (~1 minute). A short greeting and confirmation that you are ready to begin.'],
              [Mic, 'Tell me about yourself. Cover your academic background, projects you have been working on, and the kind of role you are aiming for.'],
              [CheckCircleOutlined, 'Technical round (~18 minutes). Questions on the projects, tools, and core concepts on your resume. Depth on your decisions, trade-offs, and what you learned matters more than jargon.'],
              [CheckCircle, 'Behavioural / HR round (~10 minutes). Career goals, resume consistency, and campus-style scenario questions on teamwork and initiative.'],
              [Timer, 'Closing (~1 minute). A final question and a chance to highlight anything from your background you would like to add.'],
            ],
          },
          {
            title: 'How to answer well',
            icon: CheckCircleOutlined,
            rules: [
              [Mic, 'Speak clearly and at a natural, moderate pace. The AI transcribes your voice as you speak, so avoid mumbling or rushing.'],
              [Videocam, 'Look towards the camera as you would with a real interviewer — not down at the keyboard or off to the side.'],
              [Timer, 'Take a short moment to think before answering. Brief pauses are natural and lead to a better structured reply.'],
              [CheckCircleOutlined, 'For behavioural questions, use the STAR method — Situation, Task, Action, Result. It maps directly to the Structure part of your CGPS score.'],
              [CheckCircle, 'When asked about your projects, use specific examples — what you built, decisions you made, tools you used, and what you learned. Academic and personal projects are perfectly valid material.'],
              [Headset, 'It is completely fine to say "I have not worked on this in production yet, but based on what I have learned…" — honesty scores better than guessing.'],
              [Warning, 'Speak in your own words. Reading from prepared scripts is usually detectable in the transcript and lowers your Communication score.'],
            ],
          },
          {
            title: 'Before you begin',
            icon: Videocam,
            rules: [
              [Warning, 'Your resume must already be uploaded on your Profile and reflect what you actually know. The whole interview is built from it.', true],
              [Videocam, 'Use Google Chrome or Microsoft Edge (latest version) on a laptop or desktop. Mobile browsers are not supported.'],
              [Mic, 'A working webcam and microphone are required. Grant camera and microphone permissions when the browser prompts you on this page.'],
              [FaceOutlined, 'You will need to complete face verification (right sidebar) before the Start Interview button becomes active.'],
              [CheckCircle, 'Use a stable college Wi-Fi, home Wi-Fi, or a mobile hotspot with at least 5 Mbps. Test your connection before starting.'],
              [Headset, 'Sit in a quiet, well-lit room with your face clearly visible in the centre of the frame. Background noise interferes with the transcript.'],
              [Timer, 'Set aside at least 35 uninterrupted minutes — 30 for the interview itself, plus a few minutes on either side.'],
            ],
          },
          {
            title: 'Session monitoring',
            icon: Warning,
            subtitle: 'The interview runs in a proctored fullscreen window. The following activities are logged, included in your report, and shared with the visiting employer and your placement office.',
            rules: [
              [Warning, 'The interview runs in fullscreen mode. Exiting fullscreen — even briefly — is recorded as a violation.', true],
              [Warning, 'Do not switch browser tabs, open other applications, or interact with anything outside the interview window.', true],
              [VideocamOff, 'Only you should be visible on camera. If additional faces are detected, the session is flagged and may be terminated.', true],
              [MicOff, 'Do not read from notes, printed material, or another screen, and do not receive help from another person in the room.', true],
              [Warning, 'Repeated or serious violations will end your interview automatically. The incident is reported to the visiting employer and your placement office.', true],
            ],
          },
        ],
        warningStrip: 'Once you click "Start Interview" the 30-minute timer begins and the session cannot be paused, restarted, or repeated. This interview counts toward your campus placement drive. Make sure your resume is uploaded, your camera and microphone are working, face verification is complete, and you are settled in a quiet space.',
      },

      quick: {
        headerSubtitle: 'A 10-minute AI-powered practice interview based on your resume.',
        cards: [
          {
            title: 'What is the Quick Interview?',
            icon: Headset,
            rules: [
              [Headset, 'This is a 10-minute AI-powered practice interview. It is designed to help you prepare for real employer interviews — it is not tied to any job and does not affect any application.'],
              [Timer, 'The session is fixed at exactly 10 minutes. Once you click Start Interview, the timer runs continuously and cannot be paused, extended, or restarted.'],
              [CheckCircleOutlined, 'Questions are generated from your uploaded resume — your projects, skills, and experience. There is no job description; the conversation is about you.'],
              [Mic, 'The interaction is voice-based. The AI speaks aloud, listens to your reply, transcribes it in real time, and adapts follow-up questions based on what you say.'],
              [CheckCircle, 'You are scored on four dimensions — Communication, Grasp, Professionalism, and Structure (CGPS). Your scores, written feedback, and a PDF report appear on your Profile a moment after the interview ends.'],
            ],
          },
          {
            title: 'Before you begin',
            icon: Videocam,
            rules: [
              [Warning, 'Your resume must already be uploaded on your Profile. The whole interview is built from it — without a resume, the session cannot start.', true],
              [Videocam, 'Use Google Chrome or Microsoft Edge (latest version) on a laptop or desktop. Mobile browsers are not supported.'],
              [Mic, 'A working webcam and microphone are required. Grant camera and microphone permissions when the browser prompts you on this page.'],
              [CheckCircle, 'Use a stable internet connection — at least 5 Mbps is recommended. Wired or strong Wi-Fi works best.'],
              [Headset, 'Sit in a quiet, well-lit room with your face clearly visible in the centre of the frame. Background noise interferes with the transcript.'],
              [Timer, 'Set aside at least 15 uninterrupted minutes — 10 for the interview itself, plus a few minutes on either side.'],
            ],
          },
          {
            title: 'Session monitoring',
            icon: Warning,
            subtitle: 'The interview runs in a proctored fullscreen window. The following activities are logged and included in your report.',
            rules: [
              [Warning, 'The interview runs in fullscreen mode. Exiting fullscreen — even briefly — is recorded as a violation.', true],
              [Warning, 'Do not switch browser tabs, open other applications, or interact with anything outside the interview window.', true],
              [VideocamOff, 'Only you should be visible on camera. If additional faces are detected, the session is flagged.', true],
              [MicOff, 'Do not read from notes, printed material, or another screen, and do not receive help from another person in the room.', true],
              [CheckCircleOutlined, 'Since this is a practice session, violations will be surfaced as on-screen warnings and included in your report, but they will not end the interview. Treat every alert as feedback for the real interviews ahead.'],
            ],
          },
        ],
        warningStrip: 'Once you click "Start Interview" the 10-minute timer begins and the session cannot be paused, restarted, or repeated with the same configuration. Make sure your resume is uploaded, your camera and microphone are working, and you are settled in a quiet space before you begin.',
      },
    };

        // ── Local UI helpers (scoped to this render only — no new imports) ──────
    const _card = {
      borderRadius: '18px',
      border: `1px solid ${_BRAND.border}`,
      bgcolor: _BRAND.surface,
      boxShadow: '0 6px 20px rgba(2,33,36,0.05)',
      p: { xs: 2.5, md: 3 },
    };
    const _sectionTitleRow = (IconComp, title, subtitle) => (
      <Box sx={{ mb: 1.75 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Box sx={{
            width: 34, height: 34, borderRadius: '10px', flexShrink: 0,
            display: 'grid', placeItems: 'center',
            bgcolor: _BRAND.sageSoft, color: _BRAND.sageText,
          }}>
            <IconComp sx={{ fontSize: 18 }} />
          </Box>
          <Typography sx={{
            fontFamily: _FONT, fontSize: 16, fontWeight: 700, color: _BRAND.navy,
          }}>{title}</Typography>
        </Box>
        {subtitle && (
          <Typography sx={{
            fontFamily: _FONT, fontSize: 12.5, color: _BRAND.faint,
            mt: 0.75, ml: '46px',
          }}>{subtitle}</Typography>
        )}
      </Box>
    );
    const _rule = (IconComp, text, warn = false) => (
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
        <Box sx={{
          width: 28, height: 28, borderRadius: '9px', flexShrink: 0,
          display: 'grid', placeItems: 'center',
          bgcolor: warn ? '#FBECEA' : _BRAND.sageSoft,
          color: warn ? '#B4462F' : _BRAND.sageText,
        }}>
          <IconComp sx={{ fontSize: 15 }} />
        </Box>
        <Typography sx={{
          fontFamily: _FONT, fontSize: 13.25, color: _BRAND.ink,
          lineHeight: 1.6, pt: '2px',
        }}>{text}</Typography>
      </Box>
    );

    return (
      <Box sx={{
        position: 'fixed', inset: 0, zIndex: 99998,
        bgcolor: _BRAND.bg, fontFamily: _FONT,
        overflowY: 'auto', WebkitOverflowScrolling: 'touch',
      }}>
        {/* ── Full-width dark hero band ───────────────────────────── */}
        <Box sx={{
          bgcolor: _BRAND.navy, color: '#fff',
          px: { xs: 2.5, md: 5 }, py: { xs: 2.75, md: 3.25 },
          position: 'relative', overflow: 'hidden',
        }}>
          <Box aria-hidden sx={{
            position: 'absolute', right: -60, top: -40,
            width: 220, height: 220, borderRadius: '50%',
            bgcolor: 'rgba(127,158,126,0.10)',
          }} />
          <Box aria-hidden sx={{
            position: 'absolute', right: 80, bottom: -50,
            width: 140, height: 140, borderRadius: '50%',
            bgcolor: 'rgba(127,158,126,0.08)',
          }} />
          <Box sx={{
            display: 'flex', flexDirection: { xs: 'column', md: 'row' },
            gap: 2, alignItems: { md: 'center' }, justifyContent: 'space-between',
            position: 'relative',
          }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', minWidth: 0 }}>
              <Box sx={{
                width: 58, height: 58, borderRadius: '16px', flexShrink: 0,
                display: 'grid', placeItems: 'center',
                bgcolor: 'rgba(255,255,255,0.08)', color: '#fff',
                border: '1px solid rgba(255,255,255,0.14)',
              }}>
                <Headset sx={{ fontSize: 28 }} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{
                  fontFamily: _FONT, fontSize: 11, fontWeight: 700,
                  letterSpacing: '2px', textTransform: 'uppercase',
                  color: _BRAND.sage, mb: 0.5,
                }}>
                  Interview Instructions
                </Typography>
                <Typography sx={{
                  fontFamily: _FONT, fontSize: { xs: 22, md: 28 }, fontWeight: 700,
                  color: '#fff', lineHeight: 1.2, letterSpacing: '-0.02em',
                }}>
                  Ready to begin?
                </Typography>
                                <Typography sx={{
                  fontFamily: _FONT, fontSize: 13, color: 'rgba(255,255,255,0.72)', mt: 0.5,
                }}>
                  {_content[_mode].headerSubtitle}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* ── Body: two-column grid ──────────────────────────────── */}
        <Box sx={{
          px: { xs: 2, md: 4 }, py: { xs: 2.5, md: 3.5 },
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' },
          gap: { xs: 2, md: 3 },
          alignItems: 'start',
        }}>

          {/* ═════════ LEFT (main) — instructions ═════════ */}
          <Box sx={{
            display: 'flex', flexDirection: 'column',
            gap: { xs: 2, md: 2.5 }, minWidth: 0,
          }}>

            {/* Instruction cards — content is mode-aware (standard / campus / quick) */}
            {_content[_mode].cards.map((card, ci) => (
              <Box key={ci} sx={_card}>
                {_sectionTitleRow(card.icon, card.title, card.subtitle)}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {card.rules.map(([Ic, txt, warn], ri) => (
                    <React.Fragment key={ri}>{_rule(Ic, txt, !!warn)}</React.Fragment>
                  ))}
                </Box>
              </Box>
            ))}

            {/* Important warning strip — mode-aware */}
            <Box sx={{
              bgcolor: '#FBECEA', borderRadius: '14px',
              border: '1px solid #F0C9C0',
              px: { xs: 2, md: 2.5 }, py: 1.75,
              display: 'flex', gap: 1.5, alignItems: 'flex-start',
            }}>
              <Warning sx={{ fontSize: 20, color: '#B4462F', mt: '2px', flexShrink: 0 }} />
              <Typography sx={{
                fontFamily: _FONT, fontSize: 13, color: '#8A3520', lineHeight: 1.65,
              }}>
                <strong>Important:</strong> {_content[_mode].warningStrip}
              </Typography>
            </Box>
          </Box>

          {/* ═════════ RIGHT (sidebar) — action panel ═════════ */}
          <Box sx={{
            display: 'flex', flexDirection: 'column',
            gap: { xs: 2, md: 2.5 }, minWidth: 0,
            position: { md: 'sticky' }, top: { md: 16 },
          }}>

            {/* Pre-interview checklist (uses the same _checks array — unchanged) */}
            <Box sx={_card}>
              {_sectionTitleRow(CheckCircle, 'Pre-Interview Check')}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                {_checks.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                      <Box sx={{
                        width: 30, height: 30, borderRadius: '9px', flexShrink: 0,
                        display: 'grid', placeItems: 'center',
                        bgcolor: _BRAND.sageSoft, color: _BRAND.sageText,
                      }}>
                        <Icon sx={{ fontSize: 16 }} />
                      </Box>
                      <Typography sx={{
                        fontFamily: _FONT, fontSize: 13, color: _BRAND.ink, fontWeight: 500,
                      }}>
                        {item.label}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            </Box>

            {/* Permission denied — same block as before, restyled to card */}
            {permissionState === 'denied' && (
              <Box sx={{
                bgcolor: '#FBECEA',
                border: `1px solid #F0C9C0`,
                borderRadius: '18px',
                px: 2.25, py: 2,
                display: 'flex', alignItems: 'flex-start', gap: 1.25,
              }}>
                <Warning sx={{ fontSize: 20, color: '#B4462F', mt: '2px', flexShrink: 0 }} />
                <Box>
                  <Typography sx={{
                    fontFamily: _FONT, fontSize: '0.85rem', fontWeight: 700,
                    color: '#8A3520', lineHeight: 1.3, mb: 0.5,
                  }}>
                    Access required
                  </Typography>
                  <Typography sx={{
                    fontFamily: _FONT, fontSize: '0.8rem',
                    color: '#6D3524', lineHeight: 1.55,
                  }}>
                    {permissionError}
                  </Typography>
                </Box>
              </Box>
            )}

            {/* Face gate — Standard + Campus only (same logic, unchanged) */}
            {!isQuick && (
              <Box sx={_card}>
                {_sectionTitleRow(FaceOutlined, 'Face verification required')}
                {gate.state === 'idle' && (
                  <Button size="small" variant="outlined" onClick={gate.startCamera}
                    fullWidth
                    sx={{
                      fontFamily: _FONT, textTransform: 'none',
                      borderColor: _BRAND.sage, color: _BRAND.navy,
                      fontSize: '0.85rem', fontWeight: 600, borderRadius: '10px', py: 1,
                      '&:hover': { borderColor: _BRAND.sageText, bgcolor: _BRAND.sageSoft },
                    }}>
                    Enable Camera
                  </Button>
                )}
                {(gate.state === 'requesting' || gate.state === 'ready' || gate.state === 'verifying' || gate.state === 'mismatch') && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                    <Box sx={{
                      borderRadius: '12px', overflow: 'hidden',
                      bgcolor: '#000', aspectRatio: '4 / 3', width: '100%',
                    }}>
                      <video ref={gate.videoRef} autoPlay muted playsInline
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    </Box>
                    <Typography sx={{ fontFamily: _FONT, fontSize: '0.78rem', color: _BRAND.muted }}>
                      Position your face clearly in the frame and capture.
                    </Typography>
                    <Button size="small" variant="contained" onClick={gate.verify}
                      disabled={gate.state === 'requesting' || gate.state === 'verifying'}
                      fullWidth
                      sx={{
                        fontFamily: _FONT, textTransform: 'none',
                        bgcolor: _BRAND.navy, fontSize: '0.85rem', fontWeight: 600,
                        borderRadius: '10px', py: 1,
                        '&:hover': { bgcolor: _BRAND.sageDark },
                      }}>
                      {gate.state === 'verifying' ? 'Verifying…' : gate.state === 'mismatch' ? 'Retry' : 'Capture & Verify'}
                    </Button>
                    {gate.state === 'mismatch' && gate.errorMessage && (
                      <Typography sx={{ fontFamily: _FONT, fontSize: '0.75rem', color: '#B4462F' }}>
                        {gate.errorMessage}
                      </Typography>
                    )}
                  </Box>
                )}
                {gate.state === 'verified' && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircleOutlined sx={{ fontSize: 20, color: _BRAND.sageText }} />
                    <Typography sx={{ fontFamily: _FONT, fontSize: '0.85rem', color: _BRAND.sageText, fontWeight: 600 }}>
                      Face verified. You may start the interview.
                    </Typography>
                  </Box>
                )}
                {gate.state === 'not_enrolled' && (
                  <Typography sx={{ fontFamily: _FONT, fontSize: '0.8rem', color: '#B4462F' }}>
                    {gate.errorMessage}
                  </Typography>
                )}
                {gate.state === 'error' && (
                  <Typography sx={{ fontFamily: _FONT, fontSize: '0.8rem', color: '#B4462F' }}>
                    {gate.errorMessage}
                  </Typography>
                )}
              </Box>
            )}

            {/* Start + Back — same handlers, same disabled logic */}
            <Box sx={{ ..._card, bgcolor: _BRAND.bg }}>
              <Button
                variant="contained" fullWidth disableElevation
                onClick={startSession}
                disabled={permissionState === 'requesting' || (!isQuick && !gate.isVerified)}
                startIcon={
                  permissionState === 'requesting'
                    ? <CircularProgress size={16} sx={{ color: 'rgba(255,255,255,0.85)' }} thickness={4} />
                    : null
                }
                sx={{
                  fontFamily: _FONT, textTransform: 'none',
                  fontWeight: 700, fontSize: '0.95rem',
                  borderRadius: '14px', py: 1.5,
                  bgcolor: _BRAND.navy, color: '#fff',
                  boxShadow: '0 4px 16px rgba(2,33,36,0.22)',
                  '&:hover': {
                    bgcolor: _BRAND.sage,
                    boxShadow: '0 6px 20px rgba(127,158,126,0.35)',
                  },
                  '&.Mui-disabled': {
                    bgcolor: _BRAND.navy,
                    color: 'rgba(255,255,255,0.85)',
                    opacity: 0.85,
                  },
                }}
              >
                {permissionState === 'requesting'
                  ? 'Requesting camera & microphone…'
                  : permissionState === 'denied'
                    ? 'Try Again'
                    : 'Start Interview'}
              </Button>

              <Button
                onClick={() => navigate(_backPath)}
                disableRipple
                fullWidth
                sx={{
                  fontFamily: _FONT, textTransform: 'none',
                  fontSize: '0.82rem', fontWeight: 600,
                  color: _BRAND.faint, mt: 1,
                  '&:hover': { color: _BRAND.ink, bgcolor: 'transparent' },
                }}
              >
                ← Back to {_backLabel}
              </Button>

              <Typography sx={{
                fontFamily: _FONT, fontSize: 11.5, color: _BRAND.faint,
                mt: 1, textAlign: 'center',
              }}>
                By starting, you confirm you're ready for the interview.
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    );
  }

  // ── PHASE: Connecting ─────────────────────────────────────────────────────
  if (phase === 'init' || phase === 'connecting') {
    return (
      <Box sx={BRAND_SHELL}>
        <Box aria-hidden sx={{
          position: 'absolute', top: '-12%', right: '-5%',
          width: '45vmin', height: '45vmin', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(127,158,126,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <Box aria-hidden sx={{
          position: 'absolute', bottom: '-10%', left: '-8%',
          width: '35vmin', height: '35vmin', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(2,33,36,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <Box sx={{
          position: 'relative', zIndex: 1,
          bgcolor: BRAND.surface,
          borderRadius: '24px',
          border: `1px solid ${BRAND.border}`,
          boxShadow: '0 24px 64px rgba(2,33,36,0.10), 0 4px 16px rgba(2,33,36,0.06)',
          width: { xs: 'calc(100% - 32px)', sm: 420 },
          maxWidth: 420,
          px: { xs: 3.5, sm: 4.5 }, py: { xs: 4, sm: 4.5 },
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 2.25, textAlign: 'center',
        }}>
          <Box sx={{
            width: 72, height: 72, borderRadius: '50%',
            bgcolor: BRAND.sageSoft,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `1px solid ${BRAND.border}`,
          }}>
            <CircularProgress size={32} sx={{ color: BRAND.sageText }} thickness={3.5} />
          </Box>

          <Typography sx={{
            color: BRAND.ink, fontWeight: 600, fontSize: '1.25rem',
            letterSpacing: '-0.01em', lineHeight: 1.2,
            fontFamily: "'DM Serif Display','Jost',serif",
          }}>
            Preparing your interview
          </Typography>

          <Typography sx={{
            color: BRAND.muted, fontSize: '0.9rem', lineHeight: 1.55,
            maxWidth: 320,
          }}>
            Setting up your camera, microphone, and AI interviewer. This will only take a moment.
          </Typography>
        </Box>
      </Box>
    );
  }

  // ── PHASE: Completed ──────────────────────────────────────────────────────
  if (phase === 'completed') {
    return (
      <Box sx={BRAND_SHELL}>
        <Box aria-hidden sx={{
          position: 'absolute', top: '-12%', right: '-5%',
          width: '45vmin', height: '45vmin', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(127,158,126,0.14) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <Box aria-hidden sx={{
          position: 'absolute', bottom: '-10%', left: '-8%',
          width: '35vmin', height: '35vmin', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(2,33,36,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <Box sx={{
          position: 'relative', zIndex: 1,
          bgcolor: BRAND.surface,
          borderRadius: '24px',
          border: `1px solid ${BRAND.border}`,
          boxShadow: '0 24px 64px rgba(2,33,36,0.10), 0 4px 16px rgba(2,33,36,0.06)',
          width: { xs: 'calc(100% - 32px)', sm: 440 },
          maxWidth: 440,
          px: { xs: 3.5, sm: 4.5 }, py: { xs: 4, sm: 4.5 },
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 2.25, textAlign: 'center',
        }}>
          <Box sx={{
            width: 76, height: 76, borderRadius: '50%',
            bgcolor: BRAND.doneSoft,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `1px solid ${BRAND.border}`,
          }}>
            <CheckCircle sx={{ fontSize: 44, color: BRAND.done }} />
          </Box>

          <Typography sx={{
            color: BRAND.ink, fontWeight: 600, fontSize: '1.5rem',
            letterSpacing: '-0.01em', lineHeight: 1.2,
            fontFamily: "'DM Serif Display','Jost',serif",
          }}>
            Interview Complete
          </Typography>

          <Typography sx={{
            color: BRAND.muted, fontSize: '0.925rem', lineHeight: 1.55,
            maxWidth: 320,
          }}>
            Great work. We're compiling your responses and redirecting you to your results.
          </Typography>

          <Box sx={{
            display: 'flex', alignItems: 'center', gap: 1,
            mt: 0.5, color: BRAND.sageText,
          }}>
            <CircularProgress size={16} sx={{ color: BRAND.sageText }} thickness={4} />
            <Typography sx={{ fontSize: '0.8rem', fontWeight: 500 }}>
              Redirecting…
            </Typography>
          </Box>
        </Box>
      </Box>
    );
  }

  // ── PHASE: Live ─────────
  return (
    <Box sx={{ ...FULLSCREEN_OVERLAY, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ═══ TOP BAR ═══ */}
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        px: 2.5, py: 1.5, borderBottom: `1px solid ${C.border}`,
        background: 'rgba(10,15,24,0.92)', backdropFilter: 'blur(12px)',
        zIndex: 10,
      }}>
        {/* Round label */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography sx={{ fontSize: '1.1rem' }}>{rm.icon}</Typography>
          <Box>
            <Typography sx={{ color: C.text, fontWeight: 700, fontSize: '0.88rem', lineHeight: 1.2 }}>
              {isQuick ? '⚡ Quick Interview' : rm.label}
            </Typography>
            <Typography sx={{ color: C.textMuted, fontSize: '0.7rem' }}>
              Question {questionNumber || '—'}
            </Typography>
          </Box>
        </Box>

        {/* Timer */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Timer sx={{ fontSize: 18, color: isOverTime ? C.warning : timeLeft < 60 ? C.error : C.textSec }} />
          <Typography sx={{
            color: isOverTime ? C.warning : timeLeft < 60 ? C.error : C.text,
            fontWeight: 700, fontSize: '1rem', fontVariantNumeric: 'tabular-nums',
          }}>
            {timerDisplay}
          </Typography>
        </Box>

        {/* End button — inline onClick, no handler indirection */}
        <Button
          size="small"
          startIcon={<StopCircle sx={{ fontSize: 16 }} />}
          onClick={() => {
            console.log('[End] Button clicked');
            setEndDialogOpen(true);
          }}
          sx={{
            color: C.error, textTransform: 'none', fontWeight: 600,
            fontSize: '0.78rem', borderRadius: '8px',
            border: `1px solid rgba(239,68,68,0.3)`,
            '&:hover': { bgcolor: 'rgba(239,68,68,0.1)' },
            zIndex: 1,   // ensure above siblings inside the bar
          }}
        >
          End
        </Button>
      </Box>

      {/* Progress bar */}
      <LinearProgress
        variant="determinate"
        value={Math.min(100, (roundTime / maxDuration) * 100)}
        sx={{
          height: 3, bgcolor: 'rgba(255,255,255,0.04)',
          '& .MuiLinearProgress-bar': {
            bgcolor: isOverTime ? C.warning : timeLeft < 60 ? C.error : rm.color,
            transition: 'transform 1s linear',
          },
        }}
      />

      {/* ═══ MAIN CONTENT ═══ */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, overflow: 'hidden' }}>

        {/* Left — AI avatar + subtitle */}
        <Box sx={{ flex: { xs: '0 0 45%', md: '0 0 55%' }, position: 'relative', overflow: 'hidden' }}>
          <AIRealtimeAvatar isPlaying={isAISpeaking} isListening={isRecording} isWaiting={!isAISpeaking && !isRecording} />
          {subtitle && (
            <Box sx={{
              position: 'absolute', bottom: 60, left: 16, right: 16,
              px: 2.5, py: 1.5, borderRadius: '12px',
              background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(10px)',
              border: `1px solid ${C.border}`,
            }}>
              <Typography sx={{ color: C.text, fontSize: '0.88rem', lineHeight: 1.55, textAlign: 'center' }}>
                {subtitle}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Right — camera + controls */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', borderLeft: { md: `1px solid ${C.border}` } }}>

          {/* Camera feed */}
          <Box sx={{ flex: 1, position: 'relative', bgcolor: '#000', minHeight: 200 }}>
            <video
              ref={videoRef}
              autoPlay playsInline muted
              style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', opacity: cameraOn ? 1 : 0 }}
            />
            {!cameraOn && (
              <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <VideocamOff sx={{ fontSize: 48, color: C.textMuted }} />
              </Box>
            )}

            {/* Audio level bar */}
            {isRecording && (
              <Box sx={{ position: 'absolute', bottom: 12, left: 12, right: 12, height: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                <Box sx={{
                  height: '100%', borderRadius: 2,
                  bgcolor: audioLevel > 0.08 ? C.success : C.warning,
                  width: `${Math.min(100, audioLevel * 500)}%`,
                  transition: 'width 0.1s',
                }} />
              </Box>
            )}

            {/* Status badge */}
            <Box sx={{
              position: 'absolute', top: 12, left: 12, px: 1.25, py: 0.5, borderRadius: '8px',
              bgcolor: isRecording ? 'rgba(16,185,129,0.2)' : isAISpeaking ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${isRecording ? 'rgba(16,185,129,0.4)' : isAISpeaking ? 'rgba(59,130,246,0.4)' : C.border}`,
              display: 'flex', alignItems: 'center', gap: 0.75,
            }}>
              <Box sx={{
                width: 8, height: 8, borderRadius: '50%',
                bgcolor: isRecording ? C.success : isAISpeaking ? '#3B82F6' : C.textMuted,
                animation: isRecording || isAISpeaking ? 'pulse 1.5s infinite' : 'none',
                '@keyframes pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.4 } },
              }} />
              <Typography sx={{ color: C.text, fontSize: '0.7rem', fontWeight: 600 }}>
                {isRecording ? 'Listening' : isAISpeaking ? 'AI Speaking' : 'Idle'}
              </Typography>
            </Box>

            {/* Proctoring face status */}
            {proctorFaceStatus &&
              proctorFaceStatus !== 'ok' &&
              proctorFaceStatus !== 'monitoring' &&
              proctorFaceStatus !== 'initializing' && (
              <Box sx={{ position: 'absolute', top: 12, right: 12, px: 1.25, py: 0.5, borderRadius: '8px', bgcolor: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)' }}>
                <Typography sx={{ color: C.error, fontSize: '0.7rem', fontWeight: 600 }}>
                  ⚠ {proctorFaceStatus.replace(/_/g, ' ')}
                </Typography>
              </Box>
            )}
          </Box>

          {/* User transcript */}
          {userTranscript && (
            <Box sx={{ px: 2, py: 1, bgcolor: C.surface, borderTop: `1px solid ${C.border}` }}>
              <Typography sx={{ color: C.textSec, fontSize: '0.78rem', fontStyle: 'italic' }}>
                You: {userTranscript}
              </Typography>
            </Box>
          )}

          {/* Mic + camera toggles */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, py: 2, px: 2, borderTop: `1px solid ${C.border}`, bgcolor: C.surface }}>
            <IconButton onClick={toggleMute} sx={{
              width: 48, height: 48, borderRadius: '14px',
              bgcolor: isMuted ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
              border: `1px solid ${isMuted ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
              '&:hover': { bgcolor: isMuted ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.25)' },
            }}>
              {isMuted ? <MicOff sx={{ color: C.error, fontSize: 22 }} /> : <Mic sx={{ color: C.success, fontSize: 22 }} />}
            </IconButton>

            <IconButton onClick={toggleCamera} sx={{
              width: 48, height: 48, borderRadius: '14px',
              bgcolor: cameraOn ? 'rgba(255,255,255,0.06)' : 'rgba(239,68,68,0.15)',
              border: `1px solid ${cameraOn ? C.border : 'rgba(239,68,68,0.3)'}`,
              '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
            }}>
              {cameraOn ? <Videocam sx={{ color: C.text, fontSize: 22 }} /> : <VideocamOff sx={{ color: C.error, fontSize: 22 }} />}
            </IconButton>
          </Box>
        </Box>
      </Box>

      {/* Silence warning */}
      {silenceWarning && (
        <Box sx={{
          position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 99999,
          display: 'flex', alignItems: 'center', gap: 2, px: 3, py: 2, borderRadius: '14px',
          background: 'rgba(28,20,8,0.97)', backdropFilter: 'blur(24px)',
          border: '1.5px solid rgba(245,158,11,0.35)', boxShadow: '0 8px 32px rgba(0,0,0,0.6)', maxWidth: 480,
        }}>
          <Timer sx={{ fontSize: 22, color: C.warning }} />
          <Box>
            <Typography sx={{ fontSize: '0.88rem', fontWeight: 700, color: C.text }}>Silence detected</Typography>
            <Typography sx={{ fontSize: '0.72rem', color: C.textMuted, mt: 0.25 }}>Please speak now — we'll move to the next question shortly.</Typography>
          </Box>
        </Box>
      )}

      {/* Proctoring alert */}
      {proctoringAlert && (
        <Box onClick={() => setProctoringAlert(null)} sx={{
          position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 99999,
          bgcolor: proctoringAlert.severity === 'error' ? 'rgba(180,20,20,0.97)' : 'rgba(160,90,0,0.97)',
          color: '#fff', px: 3.5, py: 1.75, borderRadius: '10px',
          border: proctoringAlert.severity === 'error' ? '2px solid #ff4444' : '2px solid #f59e0b',
          boxShadow: '0 6px 32px rgba(0,0,0,0.7)', maxWidth: 560,
          textAlign: 'center', fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer', backdropFilter: 'blur(8px)',
        }}>
         {proctoringAlert.message}
          {proctoringAlert.strike && proctoringAlert.maxStrikes && (
            <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.9 }}>
              ({proctoringAlert.strike} of {proctoringAlert.maxStrikes})
            </span>
          )}
        </Box>
      )}

      {/* Fullscreen enforcement overlay */}
      {fullscreenExited && (
        <Box sx={{
          position: 'fixed', inset: 0, zIndex: 999999, bgcolor: 'rgba(0,0,0,0.97)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
        }}>
          <Typography variant="h4" sx={{ color: C.error, fontWeight: 700 }}>⚠️ Fullscreen Required</Typography>
          <Typography sx={{ color: '#ccc', textAlign: 'center', maxWidth: 480, px: 2 }}>
            You exited fullscreen mode. The interview cannot continue until you return. This violation has been recorded.
          </Typography>
          <Button variant="contained" size="large"
            sx={{ bgcolor: C.navy, px: 6, py: 2, fontSize: 18, fontWeight: 700, borderRadius: 2 }}
            onClick={() => {
              document.documentElement.requestFullscreen?.()
                .then(() => setFullscreenExited(false))
                .catch(() => setFullscreenExited(false));
            }}>
            Return to Fullscreen
          </Button>
        </Box>
      )}

      {/* ═══ END INTERVIEW DIALOG ═══ */}
      <Dialog
        open={endDialogOpen}
        onClose={() => setEndDialogOpen(false)}
        disablePortal={false}
        sx={{
          zIndex: 1000000,
          '& .MuiBackdrop-root': { bgcolor: 'rgba(2,22,24,0.55)' },
        }}
        slotProps={{
          paper: {
            sx: {
              borderRadius: '20px',
              bgcolor: BRAND.surface,
              color: BRAND.ink,
              maxWidth: 440, mx: 2,
              border: `1px solid ${BRAND.border}`,
              boxShadow: '0 24px 64px rgba(2,33,36,0.24), 0 4px 16px rgba(2,33,36,0.10)',
              fontFamily: FONT_STACK,
              overflow: 'hidden',
            },
          },
        }}
      >
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 1.5,
          px: 3, pt: 3, pb: 1.5,
        }}>
          <Box sx={{
            width: 40, height: 40, borderRadius: '50%',
            bgcolor: BRAND.errorSoft,
            border: `1px solid ${BRAND.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Warning sx={{ fontSize: 22, color: BRAND.error }} />
          </Box>
          <DialogTitle sx={{
            p: 0, m: 0,
            fontFamily: "'DM Serif Display','Jost',serif",
            fontWeight: 600, fontSize: '1.2rem',
            color: BRAND.ink, letterSpacing: '-0.01em',
          }}>
            End Interview?
          </DialogTitle>
        </Box>

        <DialogContent sx={{ px: 3, pt: 0.5, pb: 1.5 }}>
          <Typography sx={{ color: BRAND.muted, fontSize: '0.9rem', lineHeight: 1.55, mb: 1.25 }}>
            This will end your interview immediately. Your responses so far will be evaluated but you won't be able to resume.
          </Typography>
          <Typography sx={{ color: BRAND.faint, fontSize: '0.8rem', fontWeight: 500 }}>
            Are you sure you want to continue?
          </Typography>
        </DialogContent>

        <DialogActions sx={{
          px: 3, pb: 2.5, pt: 1,
          gap: 1.25,
          borderTop: `1px solid ${BRAND.border}`,
          bgcolor: BRAND.bg,
        }}>
          <Button
            onClick={() => setEndDialogOpen(false)}
            sx={{
              color: BRAND.navy,
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: '10px',
              px: 2,
              '&:hover': { bgcolor: BRAND.sageSoft },
            }}
          >
            Continue Interview
          </Button>
          <Button
            variant="contained"
            onClick={handleEndInterview}
            disableElevation
            sx={{
              bgcolor: BRAND.error,
              color: '#fff',
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: '10px',
              px: 2.25, py: 0.9,
              boxShadow: '0 4px 12px rgba(180,70,47,0.28)',
              '&:hover': {
                bgcolor: '#96371F',
                boxShadow: '0 6px 16px rgba(180,70,47,0.36)',
              },
            }}
          >
            End Interview
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AIRealtimeSession;