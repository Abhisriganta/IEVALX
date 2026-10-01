

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import smartInterviewService from '@/services/api/jobseeker/smartInterviewService';
import docInterviewService from '@/services/api/jobseeker/docInterviewService';
import {
  connectWS, sendWSMessage, disconnectWS, getWSState, processAudioForWS,
} from '@/services/api/jobseeker/aiRealtimeService';
import { invalidateSmartInterviewsCache } from '@/services/api/jobseeker/smartInterviewService';
import { useRefetchOnFocus } from '../useRefetchOnFocus';
import proctoringService from '@/services/api/jobseeker/Proctoringservice';
import useInterviewProctoring from '@/hooks/jobseeker/useInterviewProctoring';
import NoiseSuppressionService from '@/services/noiseSupression';

export const useDocumentBasedInterview = () => {
  const [sessions, setSessions] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await smartInterviewService.getDocumentBasedSessions();
      setSessions(data);
    } catch (err) {
      setError(err?.message || 'Failed to load document interviews');
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteSession = useCallback(async (siId) => {
    await smartInterviewService.deleteDocumentSession(siId);
    setSessions((prev) => prev.filter((s) => s.id !== siId));
  }, []);

  const deleteSessions = useCallback(async (siIds) => {
    await smartInterviewService.deleteDocumentSessions(siIds);
    const idSet = new Set(siIds);
    setSessions((prev) => prev.filter((s) => !idSet.has(s.id)));
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Bust the smartInterviewService 2s cache first — otherwise polling
  // just re-reads the pre-mutation array.
  useRefetchOnFocus(() => {
    invalidateSmartInterviewsCache();
    return fetchSessions();
  });

  return {
    sessions, loading, error,
    refetch: fetchSessions,
    deleteSession, deleteSessions,
  };
};


const AUDIO_CFG = {
  SILENCE_DURATION: 8000,     // ms of total silence before a gentle nudge
  POST_SPEECH_SILENCE_MS: 3000,
  MAX_RECORDING_MS: 300000,   // 5 min ceiling if VAD never fires
  PLAYBACK_VOLUME: 0.9,
};

const PHASE_LABEL = {
  auth: 'Getting ready…',
  model_loading: 'Preparing your interview…',
  model_ready: 'Ready',
  'doc_intro/ready_check': 'Introduction',
  'doc_intro/confirmed': 'Introduction',
  questions: 'Interview in progress',
  doc_closing: 'Wrapping up',
  finalize: 'Finalizing your results…',
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
    if (rms < this.noiseFloor) this.noiseFloor = this.noiseFloor * 0.7 + rms * 0.3;
    else this.noiseFloor = Math.min(this.noiseFloor * 1.005, 0.05);
    const threshold = Math.max(0.02, this.noiseFloor * 3);
    const voiced = rms > threshold;
    if (voiced) {
      this.voiceFrames++; this.silenceFrames = 0;
      if (this.voiceFrames >= 5) this.isVoice = true;
    } else {
      this.silenceFrames++; this.voiceFrames = 0;
      if (this.silenceFrames >= 15) this.isVoice = false;
    }
    return { isVoice: this.isVoice, rms };
  }
}

export const useDocumentRealtimeSession = (siId, { enrolled = { face: false, voice: false } } = {}) => {
  const navigate = useNavigate();

  // ── Session state ──────────────────────
  const [phase, setPhase] = useState('init');           
  const [phaseLabel, setPhaseLabel] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [userReady, setUserReady] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [elapsedSecs, setElapsedSecs] = useState(0);
  const [remainingSecs, setRemainingSecs] = useState(30 * 60);
  const elapsedTimerRef = useRef(null);
  const remainingTimerRef = useRef(null);

  const startLocalCountdown = useCallback((fromSecs) => {
    clearInterval(remainingTimerRef.current);
    let secs = fromSecs;
    remainingTimerRef.current = setInterval(() => {
      secs -= 1;
      if (secs <= 0) {
        clearInterval(remainingTimerRef.current);
        secs = 0;
      }
      setRemainingSecs(secs);
    }, 1000);
  }, []);


  // ── Interview content ────────────────────────────
  const [subtitle, setSubtitle] = useState('');
   const [totalQuestions, setTotalQuestions] = useState(0);
  const [currentQuestionNum, setCurrentQuestionNum] = useState(0);
  const [liveScores, setLiveScores] = useState([]);      

  // ── Audio/UI state ──────────────────────────────────────
  const [isRecording, setIsRecording] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [silenceWarning, setSilenceWarning] = useState(false);

  // ── Refs ────────────────────────────────────────────────
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
  const chunksRef = useRef([]);
  const audioEndReceivedRef = useRef(false);
  const sessionDataRef = useRef(null);
  const endingRef = useRef(false);
  const initCalledRef = useRef(false);

  const startRecordingRef = useRef(null);
  const stopRecordingRef = useRef(null);
  const playNextChunkRef = useRef(null);
  const proctorSessionIdRef = useRef(null);
  const [proctorSessionId, setProctorSessionId] = useState(null);
  const [proctoringAlert, setProctoringAlert] = useState(null);

  // BUILD: 2026-09-19-proctor-doc-parity — parity with AIRealtimeSession
  useInterviewProctoring({
    proctorSessionId,
    isActive: phase === 'live' || phase === 'ai_speaking' || phase === 'processing',
    enrolled,
    videoRef,
    mediaStream: denoisedStreamRef.current || streamRef.current,
    isAISpeaking,
    onTerminate: (_evt, msg) => {
      setProctoringAlert({ message: msg || 'Session terminated by proctoring.', severity: 'error' });
      setTimeout(() => { if (doTeardownRef.current) doTeardownRef.current('proctor_terminated'); }, 2000);
    },
            onWarning: (w) => {
      setProctoringAlert({ message: w.message, severity: 'warning', strike: w.strike, maxStrikes: w.maxStrikes });
      setTimeout(() => setProctoringAlert(null), 2000);
    },
  });

  const doTeardown = useCallback((reason = 'unknown') => {
    if (endingRef.current) return;
    endingRef.current = true;

    try {
      if (getWSState() === 'open') sendWSMessage({ type: 'manual_stop', reason });
    } catch { /* ignore */ }
    setTimeout(() => disconnectWS(), 300);

    clearTimeout(silenceTimerRef.current);
    clearInterval(elapsedTimerRef.current);
    clearInterval(remainingTimerRef.current);
    if (stopRecordingRef.current) stopRecordingRef.current(false);

    try { noiseSuppressionRef.current?.destroy(); } catch { /* ignore */ }
    noiseSuppressionRef.current = null;
    denoisedStreamRef.current = null;
    try {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    } catch { /* ignore */ }

    setPhase('completed');

    setTimeout(() => {
      navigate(`/jobseeker/smart-interviews/document/results/${siId}`);
    }, 1500);
  }, [navigate, siId]);

  const startSession = useCallback(async () => {
    try { await document.documentElement.requestFullscreen(); } catch { /* optional */ }
    setUserReady(true);
  }, []);

  const connectWebSocket = useCallback(() => {
    const data = sessionDataRef.current;
    if (!data) return;

    connectWS(data.session_id, data.websocket_url, {
      onOpen: () => {
        setIsConnected(true);
        setPhase('live');
        clearInterval(elapsedTimerRef.current);
        elapsedTimerRef.current = setInterval(() => {
          setElapsedSecs((s) => s + 1);
          setRemainingSecs((r) => (r > 0 ? r - 1 : r));
        }, 1000);
      },
      onMessage: (msg) => { if (handleWSMessageRef.current) handleWSMessageRef.current(msg); },
      onError: (err) => console.error('[DocSession WS] Error:', err),
      onClose: (evt) => {
        setIsConnected(false);
        if (evt?.code !== 1000 && !endingRef.current) {
          console.warn('[DocSession WS] Closed unexpectedly:', evt?.code);
        }
      },
    });
  }, []);

  const startRecording = useCallback(() => {
    if (isMuted || !streamRef.current || isPlayingRef.current) return;
    const audioTracks = streamRef.current.getAudioTracks().filter(t => t.readyState === 'live');
    if (!audioTracks.length) return;

    try {
      // Prefer the RNNoise-denoised stream when available.
      const audioStream = denoisedStreamRef.current
        ? denoisedStreamRef.current
        : new MediaStream(audioTracks);
      const recorder = new MediaRecorder(audioStream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus' : 'audio/webm',
      });

      chunksRef.current = [];
      recordingStartRef.current = Date.now();
      voiceDetectedRef.current = false;

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };

      recorder.onstop = async () => {
        if (chunksRef.current.length === 0) return;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        if (blob.size < 500) return;
        try {
          const msg = await processAudioForWS(blob);
          sendWSMessage(msg);
          sendWSMessage({ type: 'silence_detected', reason: 'recording_stopped' });
          setSubtitle((s) => s); // no-op, keep last question visible while processing
        } catch (err) {
          console.error('[DocSession Record] Send failed:', err);
        }
      };

      recorder.start(100);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);

      startSilenceDetection();

      let postSpeechSilenceStart = 0;
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
            if (Date.now() - postSpeechSilenceStart > AUDIO_CFG.POST_SPEECH_SILENCE_MS) {
              if (stopRecordingRef.current) stopRecordingRef.current(true);
            }
          }
        }
        const elapsed = recordingStartRef.current ? Date.now() - recordingStartRef.current : 0;
        const currentlyVoice = vadRef.current?.isVoice ?? false;
        if (elapsed > AUDIO_CFG.MAX_RECORDING_MS && !currentlyVoice) {
          if (stopRecordingRef.current) stopRecordingRef.current(true);
        }
      }, 80);

      recorder._levelPoll = levelPoll;
    } catch (err) {
      console.error('[DocSession Record] Start failed:', err);
    }
  }, [isMuted]);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    if (recorder._levelPoll) clearInterval(recorder._levelPoll);
    clearTimeout(silenceTimerRef.current);
    try { recorder.stop(); } catch { /* ignore */ }
    mediaRecorderRef.current = null;
    setIsRecording(false);
    setAudioLevel(0);
  }, []);

  useEffect(() => { startRecordingRef.current = startRecording; }, [startRecording]);
  useEffect(() => { stopRecordingRef.current = stopRecording; }, [stopRecording]);

  const startSilenceDetection = useCallback(() => {
    clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => {
      if (!voiceDetectedRef.current && mediaRecorderRef.current?.state === 'recording') {
        setSilenceWarning(true);
        silenceTimerRef.current = setTimeout(() => {
          setSilenceWarning(false);
          stopRecording();
          sendWSMessage({ type: 'silence_detected', reason: 'frontend_timeout' });
        }, 3000);
      }
    }, AUDIO_CFG.SILENCE_DURATION);
  }, [stopRecording]);

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
      for (let i = 0; i < hexStr.length; i += 2) bytes[i / 2] = parseInt(hexStr.substr(i, 2), 16);

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
        for (let i = 0; i < numSamples; i++) channel[i] = view.getInt16(i * 2, true) / 32768.0;
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
        if (!advanced) { advanced = true; if (playNextChunkRef.current) playNextChunkRef.current(); }
      }, safetyMs);
      source.onended = () => {
        if (!advanced) { advanced = true; clearTimeout(safetyTimer); if (playNextChunkRef.current) playNextChunkRef.current(); }
      };
      source.start(0);
    } catch (err) {
      console.warn('[DocSession Audio] Skipping chunk, decode error:', err.message);
      if (playNextChunkRef.current) playNextChunkRef.current();
    }
  }, []);

  useEffect(() => { playNextChunkRef.current = playNextChunk; }, [playNextChunk]);

  // =========================================================================
  // WS MESSAGE HANDLER
  // =========================================================================
  const handleWSMessage = useCallback((msg) => {
    const { type } = msg;
    switch (type) {
      case 'model_loading':
        setPhaseLabel(msg.message || PHASE_LABEL.model_loading);
        break;

      case 'model_ready':
        setPhaseLabel(PHASE_LABEL.model_ready);
        setTotalQuestions(msg.total_questions || 0);
        break;

      case 'phase_change':
        if (msg.remaining_seconds != null) {
          setRemainingSecs(msg.remaining_seconds);
          startLocalCountdown(msg.remaining_seconds);
        }
        if (msg.phase) setPhaseLabel(PHASE_LABEL[msg.phase] || msg.phase);
        break;
      case 'timer_tick':
        if (msg.remaining_seconds != null) {
          setRemainingSecs(msg.remaining_seconds);
          startLocalCountdown(msg.remaining_seconds);
        }
        break;
      case 'question_info':
        if (msg.total_questions) setTotalQuestions(msg.total_questions);
        if (msg.question_number) setCurrentQuestionNum(msg.question_number);
        break;

      case 'ai_response':
        setSubtitle(msg.text || '');
        if (msg.lp_phase) setPhaseLabel(PHASE_LABEL[msg.lp_phase] || msg.lp_phase);
        break;

      case 'audio_reset':
        // Flush previous question's audio before new one arrives.
        try {
          if (audioSourceRef.current) {
            audioSourceRef.current.onended = null;
            audioSourceRef.current.stop();
            audioSourceRef.current.disconnect();
            audioSourceRef.current = null;
          }
        } catch (_) { /* already stopped */ }
        audioQueueRef.current = [];
        isPlayingRef.current = false;
        audioEndReceivedRef.current = false;
        break;

      case 'audio_chunk':
        audioQueueRef.current.push(msg.audio);
        if (!isPlayingRef.current && playNextChunkRef.current) playNextChunkRef.current();
        break;

      case 'audio_end':
        audioEndReceivedRef.current = true;
        if (!isPlayingRef.current) {
          audioEndReceivedRef.current = false;
          setIsAISpeaking(false);
          if (vadRef.current) vadRef.current.setAIPlaying(false);
          if (startRecordingRef.current) startRecordingRef.current();
        }
        break;

      case 'answer_scored':
        setLiveScores((prev) => [
          ...prev.filter((s) => s.order !== msg.order),
          { order: msg.order, overall: msg.overall, scores: msg.scores, skipped: msg.skipped },
        ]);
        break;

      case 'session_complete':
        if (doTeardownRef.current) doTeardownRef.current('session_complete');
        break;

      case 'error':
        setErrorMsg(msg.text || 'The interview service reported an error.');
        setPhase('error');
        break;

      case 'pong':
        break;

      default:
        console.log('[DocSession WS] Unhandled message type:', type, msg);
    }
  }, []);

  const handleWSMessageRef = useRef(handleWSMessage);
  useEffect(() => { handleWSMessageRef.current = handleWSMessage; }, [handleWSMessage]);

  const doTeardownRef = useRef(doTeardown);
  useEffect(() => { doTeardownRef.current = doTeardown; }, [doTeardown]);

  const endInterview = useCallback(() => {
    if (doTeardownRef.current) doTeardownRef.current('user_requested');
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((m) => {
      const next = !m;
      streamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !next; });
      return next;
    });
  }, []);

  const toggleCamera = useCallback(() => {
    setCameraOn((c) => {
      const next = !c;
      streamRef.current?.getVideoTracks().forEach((t) => { t.enabled = next; });
      return next;
    });
  }, []);

  // =========================================================================
  // INIT — start Django session, acquire media, connect WS
  // =========================================================================
  useEffect(() => {
    if (!userReady) return;
    if (initCalledRef.current) return;
    initCalledRef.current = true;
    let cancelled = false;

    const init = async () => {
      try {
        setPhase('connecting');
        const data = await docInterviewService.startRealtimeDoc(siId);
        if (cancelled) return;
        if (!data?.session_id) throw new Error('No session_id in response');

        sessionDataRef.current = data;
        setTotalQuestions(data.total_questions || 0);
        if (data.duration_mins) setRemainingSecs(data.duration_mins * 60);
        if (data.proctor_session_id) {
          proctorSessionIdRef.current = data.proctor_session_id;
          setProctorSessionId(data.proctor_session_id);
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' },
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, sampleRate: 44100 },
        });
        streamRef.current = stream;

        const ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 44100 });
        audioContextRef.current = ctx;
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.4;

        // ── RNNoise noise suppression ────────────────────────────────────
        try {
          const ns = new NoiseSuppressionService();
          const exitNode = await ns.createNode(ctx);
          const dest = ctx.createMediaStreamDestination();
          src.connect(ns.getEntryNode());
          exitNode.connect(analyser);
          exitNode.connect(dest);
          noiseSuppressionRef.current = ns;
          denoisedStreamRef.current = dest.stream;
          console.log('[DocSession] RNNoise noise suppression attached');
        } catch (nsErr) {
          console.warn('[DocSession] Noise suppression unavailable, using raw mic:', nsErr?.message);
          src.connect(analyser);
        }
        // ─────────────────────────────────────────────────────────────────

        analyserRef.current = analyser;
        vadRef.current = new SimpleVAD(analyser);

        if (!cancelled) connectWebSocket();
      } catch (err) {
        if (!cancelled) {
          initCalledRef.current = false;
          console.error('[DocSession] Init failed:', err);
          setErrorMsg(err.message || 'Failed to start the document interview');
          setPhase('error');
        }
      }
    };

    init();
    return () => { cancelled = true; };
  }, [siId, userReady, connectWebSocket]);

  // Attach camera stream once <video> mounts
  useEffect(() => {
    if (phase === 'live' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [phase]);

  // Cleanup on unmount
  useEffect(() => () => {
    try { disconnectWS(); } catch { /* ignore */ }
    try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch { /* ignore */ }
    try { if (audioContextRef.current?.state !== 'closed') audioContextRef.current?.close(); } catch { /* ignore */ }
    clearTimeout(silenceTimerRef.current);
    clearInterval(elapsedTimerRef.current);
    clearInterval(remainingTimerRef.current);
  }, []);

  return {
     phase, phaseLabel, errorMsg, isConnected, elapsedSecs, remainingSecs,
    subtitle, totalQuestions, currentQuestionNum, liveScores,
    isRecording, isAISpeaking, audioLevel, isMuted, cameraOn, silenceWarning,
    videoRef, proctoringAlert,
    startSession, endInterview, toggleMute, toggleCamera,
  };
};

export default useDocumentBasedInterview;