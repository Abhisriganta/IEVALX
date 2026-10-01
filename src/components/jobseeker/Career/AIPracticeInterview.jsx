import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box, Paper, Typography, Stack, Chip, Button, IconButton,
  LinearProgress, CircularProgress, Divider, Tooltip, Fade,
  Alert,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import {
  SmartToyOutlined, UploadFileOutlined, StopRounded,
  MicOutlined, MicOffOutlined,
  DescriptionOutlined,
  CheckCircleOutlined,
  RuleOutlined, TimerOutlined, HeadphonesOutlined, PsychologyOutlined,
  VideocamOutlined, VideocamOffOutlined,
  WarningAmberOutlined,
  // 🔧 CHANGE 1/4 — Icons for the History button
  HistoryOutlined,
  ArrowBackOutlined,
} from '@mui/icons-material';
import useAIPracticeInterview from '@/hooks/jobseeker/useAIPracticeInterview';
import useInterviewProctoring from '@/hooks/jobseeker/useInterviewProctoring';
import NoiseSuppressionService from '@/services/noiseSupression';

import {
  FONT,
  NAVY, NAVY_MID, NAVY_SOFT, NAVY_SOFTER,
  BORDER, MUTED, TEXT_DIM, SUCCESS, WARN, DANGER,
  SHADOW_SM, SHADOW_MD, SHADOW_LG, SHADOW_CARD,
  VISEME_KEYS,
  Avatar, StageChip, SectionTitle, SlotIcon, GuidelineRow,
  ReadyView, CompleteView,
  // 🔧 CHANGE 1/4 — Import the two new history views
  HistoryListView,
  HistoryDetailView,
} from './AIPracticeInterview.parts';

/* ────────────────────────────────────────────────────────────────────────
   Main page
   ──────────────────────────────────────────────────────────────────────── */
const PRACTICE_PATH = '/jobseeker/career/ai-practice-interview';
const HISTORY_PATH  = '/jobseeker/career/interview-history';

const AIPracticeInterview = () => {
  const hook = useAIPracticeInterview();
  const location = useLocation();
  const navigate = useNavigate();
  const isHistoryRoute = location.pathname === HISTORY_PATH;
  const {
    config, loading, error,
    stage, resume, plan, qas, qNum, currentQ, report, attemptId,
    proctorSessionIdRef,
    uploadResume, buildPlan, start, askNext, commitAnswer, finish, reset,
    listAttempts,
    getAttemptDetail,
    deleteAttempts,
  } = hook;

  
  const [viseme, setViseme]         = useState('rest');
  const [muted]                     = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);
  const [ttsSupported, setTts]      = useState(true);
  const [srSupported, setSr]        = useState(false);
  const [srInterim, setSrInterim]   = useState('');
  const [answerText, setAnswerText] = useState('');
  const [parseError, setParseError] = useState(null);

  const [micPermission, setMicPermission] = useState('unknown');
  const [requestingPerm, setRequestingPerm] = useState(false);

  /* Camera preview state */
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraError,  setCameraError]  = useState(null);

  /* End-interview confirmation dialog */
  const [endConfirmOpen, setEndConfirmOpen] = useState(false);

  const [historyView,      setHistoryView]      = useState(null);
  const [historyAttempts,  setHistoryAttempts]  = useState([]);
  const [historyLoading,   setHistoryLoading]   = useState(false);
  const [historyError,     setHistoryError]     = useState(null);
  const [detailAttempt,    setDetailAttempt]    = useState(null);
  const [detailLoading,    setDetailLoading]    = useState(false);

  const fileInputRef   = useRef(null);
  const utterRef       = useRef(null);
  const recognitionRef = useRef(null);
  const visemeTimerRef = useRef(null);
  const bootedRef      = useRef(false);

  const videoRef        = useRef(null);
  const cameraStreamRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const proctorAudioCtxRef = useRef(null);
  const proctorNoiseSuppressionRef = useRef(null);

  const startListeningRef = useRef(null);
  const manualStopRef    = useRef(false);
  const micPermissionRef = useRef('unknown');
  const lastInterimRef   = useRef('');

  /* ── Proctoring (practice — warns only, never terminates) ───────────── */
  const [proctoringAlert, setProctoringAlert] = useState(null);
  useInterviewProctoring({
    proctorSessionId: proctorSessionIdRef?.current,
    isActive: stage === 'asking' || stage === 'listening' || stage === 'processing',
    enrolled: { face: true, voice: true },
    videoRef,
    mediaStream: cameraStream,
    isAISpeaking: ttsSupported && !muted && viseme !== 'rest',
    onTerminate: (_evt, msg) => {
      // Practice mode — backend never terminates, but guard frontend too
      setProctoringAlert({ message: '⚠ ' + (msg || 'Proctoring violation detected.'), severity: 'warning' });
      setTimeout(() => setProctoringAlert(null), 6000);
    },
            onWarning: (w) => {
      setProctoringAlert({ message: w.message, severity: 'warning', strike: w.strike, maxStrikes: w.maxStrikes });
      setTimeout(() => setProctoringAlert(null), 2000);
    },
  });

  /* ── capability detection + cleanup ─────────────────────────────────── */
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    setTts(!!window.speechSynthesis);
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSr(!!SR);

    if (navigator.permissions?.query) {
      navigator.permissions.query({ name: 'microphone' })
        .then((status) => {
          setMicPermission(status.state === 'prompt' ? 'unknown' : status.state);
          status.onchange = () => {
            setMicPermission(status.state === 'prompt' ? 'unknown' : status.state);
          };
        })
        .catch(() => { /* Permissions API not fully supported */ });
    }

    return () => {
      try { window.speechSynthesis?.cancel(); } catch { /* noop */ }
      try { recognitionRef.current?.stop(); } catch { /* noop */ }
      if (visemeTimerRef.current) clearInterval(visemeTimerRef.current);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      try { proctorNoiseSuppressionRef.current?.destroy(); } catch { /* ignore */ }
      proctorNoiseSuppressionRef.current = null;
      try { proctorAudioCtxRef.current?.close?.(); } catch { /* ignore */ }
      try {
        cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
      } catch { /* noop */ }
      cameraStreamRef.current = null;
      try {
        const doc = document;
        const isFs = doc.fullscreenElement || doc.webkitFullscreenElement
          || doc.mozFullScreenElement || doc.msFullscreenElement;
        if (isFs) {
          const exit = doc.exitFullscreen || doc.webkitExitFullscreen
            || doc.mozCancelFullScreen || doc.msExitFullscreen;
          exit?.call(doc);
        }
      } catch { /* noop */ }
    };
  }, []);

  useEffect(() => {
    cameraStreamRef.current = cameraStream;
    if (videoRef.current) {
      videoRef.current.srcObject = cameraStream || null;
    }
  }, [cameraStream]);

  const stopCamera = useCallback(() => {
    try {
      cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    } catch { /* noop */ }
    cameraStreamRef.current = null;
    setCameraStream(null);
  }, []);

  const enterFullscreen = useCallback(async () => {
    if (typeof document === 'undefined') return;
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen
      || el.mozRequestFullScreen || el.msRequestFullscreen;
    if (!req) return;
    try { await req.call(el); } catch { /* user or browser blocked */ }
  }, []);

  const exitFullscreen = useCallback(() => {
    if (typeof document === 'undefined') return;
    const isFs = document.fullscreenElement || document.webkitFullscreenElement
      || document.mozFullScreenElement || document.msFullscreenElement;
    if (!isFs) return;
    const exit = document.exitFullscreen || document.webkitExitFullscreen
      || document.mozCancelFullScreen || document.msExitFullscreen;
    if (!exit) return;
    try { exit.call(document); } catch { /* noop */ }
  }, []);

  const startCamera = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera is not supported in this browser.');
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      });
      setCameraStream(stream);
      setCameraError(null);
      return true;
    } catch {
      setCameraError('Camera access was blocked. Enable it in your browser to see yourself.');
      return false;
    }
  }, []);

  const toggleCamera = useCallback(() => {
    if (cameraStream) { stopCamera(); setCameraError(null); } else { startCamera(); }
  }, [cameraStream, stopCamera, startCamera]);

  const requestMicPermission = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setMicPermission('denied'); return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setMicPermission('granted');
      return true;
    } catch {
      setMicPermission('denied');
      return false;
    }
  }, []);

  const totalQuestions = plan?.total_questions || plan?.slots?.length || config?.targetQuestions || 8;
  const progressPct    = totalQuestions ? Math.round(((qNum - 1) / totalQuestions) * 100) : 0;

  /* ── speak ───────────────────────────────────────────────────────────── */
  const speak = useCallback((text, onEnd) => {
    if (!ttsSupported || muted || !text) {
      let ticks = 0;
      const total = Math.max(20, Math.min(80, text?.length / 3 || 40));
      if (visemeTimerRef.current) clearInterval(visemeTimerRef.current);
      visemeTimerRef.current = setInterval(() => {
        setViseme(VISEME_KEYS[ticks % VISEME_KEYS.length]);
        ticks += 1;
        if (ticks >= total) {
          clearInterval(visemeTimerRef.current);
          setViseme('rest');
          onEnd?.();
        }
      }, 110);
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.98; u.pitch = 1.0; u.volume = 1.0;
      const voices = window.speechSynthesis.getVoices();
      const FEMALE_VOICE_PREFERENCES = [
        'Google UK English Female',
        'Microsoft Neerja Online (Natural) - English (India)',
        'Microsoft Aria Online (Natural) - English (United States)',
        'Microsoft Jenny Online (Natural) - English (United States)',
        'Microsoft Sonia Online (Natural) - English (United Kingdom)',
        'Google US English',
        'Microsoft Zira - English (United States)',
        'Microsoft Heera - English (India)',
        'Samantha',
      ];
      let preferred = null;
      for (const name of FEMALE_VOICE_PREFERENCES) {
        preferred = voices.find((v) => v.name === name);
        if (preferred) break;
      }
      if (!preferred) {
        /* last-resort: any English voice with a female-sounding name */
        preferred = voices.find((v) =>
          /^en/i.test(v.lang) &&
          /female|zira|aria|jenny|neerja|heera|sonia|samantha|karen/i.test(v.name),
        ) || voices.find((v) => /^en/i.test(v.lang));
      }
      if (preferred) u.voice = preferred;

      let bIdx = 0;
      u.onstart = () => setViseme(VISEME_KEYS[0]);
      u.onboundary = () => { bIdx = (bIdx + 1) % VISEME_KEYS.length; setViseme(VISEME_KEYS[bIdx]); };
      if (visemeTimerRef.current) clearInterval(visemeTimerRef.current);
      visemeTimerRef.current = setInterval(() => {
        bIdx = (bIdx + 1) % VISEME_KEYS.length;
        setViseme(VISEME_KEYS[bIdx]);
      }, 160);

      const stopVisemes = () => {
        if (visemeTimerRef.current) { clearInterval(visemeTimerRef.current); visemeTimerRef.current = null; }
        setViseme('rest');
        onEnd?.();
      };
      u.onend = stopVisemes; u.onerror = stopVisemes;
      utterRef.current = u;
      window.speechSynthesis.speak(u);
    } catch {
      setViseme('rest');
      onEnd?.();
    }
  }, [ttsSupported, muted]);

  const cancelSpeech = useCallback(() => {
    try { window.speechSynthesis?.cancel(); } catch { /* noop */ }
    if (visemeTimerRef.current) { clearInterval(visemeTimerRef.current); visemeTimerRef.current = null; }
    setViseme('rest');
  }, []);

  /* ── STT ───────────────────────────────────────────────────────────── */
  const startListening = useCallback(async () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setMicEnabled(false); return; }
    if (micPermission !== 'granted') {
      const ok = await requestMicPermission();
      if (!ok) { setMicEnabled(false); return; }
    }
    try {

      manualStopRef.current = false;

      const rec = new SR();
      rec.lang = (typeof navigator !== 'undefined' && /^en/i.test(navigator.language || ''))
        ? navigator.language
        : 'en-US';
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      rec.onresult = (e) => {
        let interim = '', final = '';
        for (let i = e.resultIndex; i < e.results.length; i += 1) {
          const r = e.results[i];
          if (r.isFinal) final += r[0].transcript; else interim += r[0].transcript;
        }
        if (final) setAnswerText((prev) => `${prev} ${final}`.replace(/\s+/g, ' ').trim());
        setSrInterim(interim);
        lastInterimRef.current = interim;      
      };

      rec.onerror = (e) => {
        const err = e?.error;
        if (err === 'not-allowed' || err === 'service-not-allowed') {
          setMicPermission('denied');
          manualStopRef.current = true;       
          setMicEnabled(false);
        }
       
      };

      rec.onend = () => {
        if (lastInterimRef.current) {
          setAnswerText((prev) => `${prev} ${lastInterimRef.current}`.replace(/\s+/g, ' ').trim());
          lastInterimRef.current = '';
        }
        setSrInterim('');
        if (!manualStopRef.current && micPermissionRef.current === 'granted') {
          setTimeout(() => {
            if (!manualStopRef.current) startListeningRef.current?.();
          }, 250);
        }
      };

      rec.start();
      recognitionRef.current = rec;
      setMicEnabled(true);
    } catch { setMicEnabled(false); }
  }, [micPermission, requestMicPermission]);

  useEffect(() => { startListeningRef.current = startListening; }, [startListening]);
 
  useEffect(() => { micPermissionRef.current = micPermission; }, [micPermission]);

  const stopListening = useCallback(() => {
    manualStopRef.current = true;             
    lastInterimRef.current = '';
    try { recognitionRef.current?.stop(); } catch { /* noop */ }
    recognitionRef.current = null;
    setMicEnabled(false); setSrInterim('');
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
  }, []);

  /* ── resume upload ─────────────────────────────────────────────────── */
  const handleFile = useCallback(async (file) => {
    if (!file) return;
    const maxBytes = (config?.maxFileSizeMB || 5) * 1024 * 1024;
    if (file.size > maxBytes) {
      setParseError(`File too large. Maximum ${config?.maxFileSizeMB || 5} MB.`);
      return;
    }
    setParseError(null);
    try {
      const parsed = await uploadResume(file);
      if (parsed?.resume_id) {
        await buildPlan({ resume_id: parsed.resume_id, totalQs: config?.targetQuestions || 8, mode: 'exhaustive' });
      }
    } catch (err) {
      setParseError(err?.message || config?.copy?.parseError || 'Could not read that file.');
    }
  }, [uploadResume, buildPlan, config]);

  const onDrop = useCallback((e) => {
    e.preventDefault(); e.stopPropagation();
    const f = e.dataTransfer?.files?.[0];
    if (f) handleFile(f);
  }, [handleFile]);
  const onDragOver = useCallback((e) => { e.preventDefault(); e.stopPropagation(); }, []);

  /* ── interview flow ─────────────────────────────────────────────────── */
  const beginInterview = useCallback(async () => {
    setParseError(null); setCameraError(null); setRequestingPerm(true);
    enterFullscreen();
    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setParseError('Your browser does not support microphone or camera access.');
        setMicPermission('denied'); return;
      }
      let combined = null;
      try {
        combined = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        });
      } catch (err) {
        try {
          const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true });
          let deliverAudio = audioOnly;
          try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 48000 });
            const ns = new NoiseSuppressionService();
            const exitNode = await ns.createNode(ctx);
            const src = ctx.createMediaStreamSource(audioOnly);
            const dest = ctx.createMediaStreamDestination();
            src.connect(ns.getEntryNode());
            exitNode.connect(dest);
            proctorAudioCtxRef.current = ctx;
            proctorNoiseSuppressionRef.current = ns;
            deliverAudio = dest.stream;
            console.log('[PracticeProctor] RNNoise noise suppression attached (audio-only)');
          } catch (nsErr) {
            console.warn('[PracticeProctor] Noise suppression unavailable:', nsErr?.message);
          }
          setCameraStream(deliverAudio);
          setCameraError('Camera access was blocked — you can turn it on any time using the toggle.');
        } catch {
          setMicPermission('denied');
          setParseError('Microphone access is required for the voice interview. Please click "Allow" when your browser asks, or enable it in the address bar and try again.');
          return;
        }
        setAnswerText(''); setSrInterim('');
        start(); bootedRef.current = false; return;
      }
      const videoTracks = combined.getVideoTracks();
      const audioTracks = combined.getAudioTracks();
      // Keep audio tracks alive — voice proctoring (Layer 4) needs them.
      // SpeechRecognition opens its own internal mic, so these don't conflict.
      if (videoTracks.length > 0 || audioTracks.length > 0) {
        let deliverStream = new MediaStream([...videoTracks, ...audioTracks]);
        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 48000 });
          const ns = new NoiseSuppressionService();
          const exitNode = await ns.createNode(ctx);
          const micOnly = new MediaStream(audioTracks);
          const src = ctx.createMediaStreamSource(micOnly);
          const dest = ctx.createMediaStreamDestination();
          src.connect(ns.getEntryNode());
          exitNode.connect(dest);
          proctorAudioCtxRef.current = ctx;
          proctorNoiseSuppressionRef.current = ns;
          deliverStream = new MediaStream([...videoTracks, ...dest.stream.getAudioTracks()]);
          console.log('[PracticeProctor] RNNoise noise suppression attached');
        } catch (nsErr) {
          console.warn('[PracticeProctor] Noise suppression unavailable, using raw mic:', nsErr?.message);
        }
        setCameraStream(deliverStream);
      }
      setMicPermission('granted');
      setAnswerText(''); setSrInterim('');
      start(); bootedRef.current = false;
    } finally { setRequestingPerm(false); }
  }, [start, enterFullscreen]);

  /* Boot first question */
  useEffect(() => {
    if (stage !== 'asking') { bootedRef.current = false; return; }
    if (bootedRef.current) return;
    bootedRef.current = true;
    (async () => {
      const r = await askNext();
      if (r?.done) { finish(); return; }
      if (r?.question) speak(r.question, () => setTimeout(() => startListeningRef.current?.(), 400));
    })();
  }, [stage, askNext, speak, finish]);

  const advance = useCallback(async (answer) => {
    stopListening(); cancelSpeech();
    commitAnswer(answer);
    setAnswerText(''); setSrInterim('');
    if (qNum >= totalQuestions) { finish(); return; }
    const r = await askNext();
    if (r?.done) { finish(); return; }
    if (r?.question) setTimeout(() => speak(r.question, () => setTimeout(() => startListeningRef.current?.(), 400)), 200);
  }, [qNum, totalQuestions, askNext, commitAnswer, finish, speak, stopListening, cancelSpeech]);


  const submitAnswer = useCallback(() => {
    if (!currentQ) return;
    const aiSpeaking = ttsSupported && !muted && viseme !== 'rest';
    if (aiSpeaking) return;                 // don't submit while the question is being read
    const finalText = (answerText + (srInterim ? ` ${srInterim}` : ''))
      .replace(/\s+/g, ' ')
      .trim();
    advance(finalText);
  }, [advance, answerText, srInterim, currentQ, ttsSupported, muted, viseme]);

  const endInterview = useCallback(() => {
    cancelSpeech(); stopListening(); stopCamera(); exitFullscreen(); finish();
  }, [cancelSpeech, stopListening, stopCamera, exitFullscreen, finish]);

  
  useEffect(() => {
    if (stage !== 'asking') return undefined;
    window.history.pushState(null, '', window.location.href);

    const onPopState = () => {
      const ok = window.confirm(
        'Leaving will end your interview immediately. Your responses so far will be evaluated. Are you sure?'
      );
      if (ok) {
        endInterview();
      } else {
        window.history.pushState(null, '', window.location.href);
      }
    };

    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };

    window.addEventListener('popstate', onPopState);
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('beforeunload', onBeforeUnload);
      try { cancelSpeech(); } catch { /* ignore */ }
      try { stopListening(); } catch { /* ignore */ }
      try { stopCamera(); } catch { /* ignore */ }
      try { exitFullscreen(); } catch { /* ignore */ }
    };
  }, [stage, endInterview, cancelSpeech, stopListening, stopCamera, exitFullscreen]);

  const requestEndInterview = useCallback(() => setEndConfirmOpen(true), []);
  const cancelEndInterview  = useCallback(() => setEndConfirmOpen(false), []);
  const confirmEndInterview = useCallback(() => {
    setEndConfirmOpen(false); endInterview();
  }, [endInterview]);

  const restart = useCallback(() => {
    cancelSpeech(); stopListening(); stopCamera(); exitFullscreen();
    setAnswerText(''); setSrInterim(''); setParseError(null); setCameraError(null);
    reset();
  }, [cancelSpeech, stopListening, stopCamera, exitFullscreen, reset]);

  const handleBack = useCallback(() => {
    restart();
  }, [restart]);

  const toggleMic = useCallback(() => {
    if (micEnabled) stopListening(); else startListening();
  }, [micEnabled, startListening, stopListening]);

  useEffect(() => {
    if (stage !== 'asking') return undefined;
    const onKey = (e) => {
      if (e.code !== 'Space') return;
      const tag = document.activeElement?.tagName || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      e.preventDefault(); toggleMic();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stage, toggleMic]);

  // 🔧 CHANGE 2/4 — History handlers
  const openHistory = useCallback(async () => {
    setHistoryView('list');
    setHistoryLoading(true);
    setHistoryError(null);
    const data = await listAttempts();
    if (!Array.isArray(data)) {
      setHistoryError('Failed to load history. Please try again.');
    } else {
      setHistoryAttempts(data);
    }
    setHistoryLoading(false);
  }, [listAttempts]);

  const closeHistory = useCallback(() => {
    setHistoryView(null);
    setDetailAttempt(null);
  }, []);

  const viewAttempt = useCallback(async (id) => {
    setHistoryView('detail');
    setDetailLoading(true);
    setDetailAttempt(null);
    const data = await getAttemptDetail(id);
    setDetailAttempt(data);
    setDetailLoading(false);
  }, [getAttemptDetail]);

  const backToList = useCallback(() => {
    setHistoryView('list');
    setDetailAttempt(null);
  }, []);

  // 🔧 History moved to sidebar — route drives the view:
  //   /interview-history        → open the list
  //   /ai-practice-interview    → history closed
  //   "Back to interview" and onClose now navigate instead of toggling state.
  const exitHistory = useCallback(() => {
    navigate(PRACTICE_PATH);
  }, [navigate]);

  useEffect(() => {
    if (isHistoryRoute) {
      openHistory();
    } else {
      closeHistory();
    }

  }, [isHistoryRoute]);

  const deleteHistory = useCallback(async (ids) => {
    const list = Array.isArray(ids) ? ids : [ids];
    if (!list.length) return { ok: true, deleted: 0 };
    const res = await deleteAttempts(list);
    if (res?.ok) {
      setHistoryAttempts((prev) => prev.filter((a) => !list.includes(a.attempt_id)));
    }
    return res || { ok: false };
  }, [deleteAttempts]);

  const currentStageLabel = useMemo(() => {
    const map = {
      idle: 'READY', uploading: 'PARSING', planning: 'PLANNING',
      ready: 'READY TO START', asking: 'INTERVIEW LIVE',
      evaluating: 'SCORING', complete: 'COMPLETE',
    };
    return map[stage] || 'READY';
  }, [stage]);

  /* ── config gate ───────────────────────────────────────────────────── */
  if (loading && !config) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 10, gap: 2 }}>
        <CircularProgress sx={{ color: NAVY }} thickness={3.5} size={36} />
        <Typography sx={{ color: MUTED, fontSize: '0.85rem' }}>Loading practice interview…</Typography>
      </Box>
    );
  }
  if (error && !config) return <Alert severity="error" sx={{ borderRadius: '12px' }}>{error}</Alert>;
  if (!config) return null;

  const speaking  = stage === 'asking' && !muted && ttsSupported && viseme !== 'rest';
  const listening = micEnabled;

  /* ─────────────────────────────────────────────────────────────────────
     Fullscreen asking view — UNCHANGED
     ───────────────────────────────────────────────────────────────────── */
  const renderAskingFullscreen = () => {
    const slot = plan?.slots?.[qNum - 1] || {};
    const skillTag = (slot.skills || []).join(', ');
    const liveText = (answerText + (srInterim ? ` ${srInterim}` : '')).trim();
    const cameraOn = !!cameraStream;

  const _procBanner = proctoringAlert && (
    <Box onClick={() => setProctoringAlert(null)} sx={{
      position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 99999,
      bgcolor: 'rgba(160,90,0,0.97)', color: '#fff',
      px: 3.5, py: 1.75, borderRadius: '10px',
      border: '2px solid #f59e0b',
      boxShadow: '0 6px 32px rgba(0,0,0,0.5)', textAlign: 'center',
      fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer', backdropFilter: 'blur(8px)',
    }}>
     {proctoringAlert.message}
      {proctoringAlert.strike && proctoringAlert.maxStrikes && (
        <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.9 }}>
          ({proctoringAlert.strike} of {proctoringAlert.maxStrikes})
        </span>
      )}
    </Box>
  );

    return (
      <Box sx={{ position: 'fixed', inset: 0, zIndex: 1400, background: 'linear-gradient(180deg, #EDF3EC 0%, #F6F8F3 100%)', fontFamily: FONT, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        {_procBanner}
        {/* Top bar */}
        <Box sx={{ px: { xs: 2, md: 4 }, py: { xs: 1.5, md: 2 }, bgcolor: '#FFFFFF', borderBottom: `1px solid ${BORDER}`, boxShadow: SHADOW_SM, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexShrink: 0 }}>
          <Stack direction="row" alignItems="center" spacing={1.75}>
            <Box sx={{ width: 44, height: 44, borderRadius: '12px', background: `linear-gradient(180deg, ${NAVY_MID} 0%, ${NAVY} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: SHADOW_MD, flexShrink: 0 }}>
              <SmartToyOutlined sx={{ color: '#FFFFFF', fontSize: 22 }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: { xs: '0.98rem', md: '1.1rem' }, fontWeight: 800, color: NAVY, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                AI Practice Interview
              </Typography>
              <Typography sx={{ fontSize: '0.78rem', color: TEXT_DIM, mt: 0.25 }}>
                Question {qNum} of {totalQuestions}{slot.type ? ` · ${slot.type}` : ''}
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={1.25}>
            <Box sx={{ display: { xs: 'none', sm: 'inline-flex' }, alignItems: 'center', gap: 0.75, px: 1.25, py: 0.5, borderRadius: '999px', bgcolor: `${DANGER}12`, border: `1px solid ${DANGER}33` }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: DANGER, animation: 'liveDot 1.4s ease-in-out infinite', '@keyframes liveDot': { '0%, 100%': { opacity: 0.5 }, '50%': { opacity: 1 } } }} />
              <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, color: DANGER, letterSpacing: '0.06em' }}>INTERVIEW LIVE</Typography>
            </Box>
            <Button variant="contained" startIcon={<StopRounded sx={{ fontSize: 18 }} />} onClick={requestEndInterview} sx={{ bgcolor: DANGER, color: '#FFFFFF', textTransform: 'none', fontWeight: 700, fontSize: '0.85rem', px: 2.25, py: 0.85, borderRadius: '10px', boxShadow: SHADOW_MD, '&:hover': { bgcolor: '#7A2E24', boxShadow: SHADOW_LG } }}>
              End interview
            </Button>
          </Stack>
        </Box>

        <LinearProgress variant="determinate" value={progressPct} sx={{ height: 4, bgcolor: BORDER, '& .MuiLinearProgress-bar': { bgcolor: NAVY }, flexShrink: 0 }} />

        {/* Body */}
        <Box sx={{ flex: 1, px: { xs: 2, md: 4 }, py: { xs: 2, md: 3 } }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: { xs: 2, md: 3 }, alignItems: 'stretch', width: '100%' }}>

            {/* LEFT — AI */}
            <Box sx={{ flex: 1, minWidth: 0, display: 'flex' }}>
              <Paper elevation={0} sx={{ borderRadius: '20px', width: '100%', border: `1px solid ${BORDER}`, background: 'linear-gradient(180deg, #FFFFFF 0%, #F6F8F3 100%)', boxShadow: SHADOW_CARD, p: { xs: 2.5, md: 3 }, height: '100%', minHeight: { md: 560 }, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
                <Box aria-hidden sx={{ position: 'absolute', top: -20, left: '50%', transform: 'translateX(-50%)', width: 340, height: 340, borderRadius: '50%', background: speaking ? `radial-gradient(circle, ${NAVY}22 0%, transparent 60%)` : `radial-gradient(circle, ${NAVY}10 0%, transparent 60%)`, transition: 'background 300ms ease', pointerEvents: 'none' }} />
                <Box sx={{ position: 'relative', zIndex: 1, textAlign: 'center', pb: 1.5 }}>
                  <Box sx={{ maxWidth: 320, mx: 'auto' }}>
                    <Avatar speaking={speaking} listening={listening} viseme={viseme} mute={muted} />
                  </Box>
                  <Box sx={{ mt: 1.5, display: 'inline-flex', alignItems: 'center', gap: 0.75, px: 1.5, py: 0.6, borderRadius: '999px', bgcolor: speaking ? `${NAVY}12` : NAVY_SOFTER, border: `1px solid ${speaking ? `${NAVY}33` : BORDER}`, boxShadow: SHADOW_SM, transition: 'all 200ms ease' }}>
                    <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: speaking ? NAVY : MUTED, animation: speaking ? 'aiStatusPulse 1.4s ease-in-out infinite' : 'none', '@keyframes aiStatusPulse': { '0%, 100%': { opacity: 0.4 }, '50%': { opacity: 1 } } }} />
                    <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: speaking ? NAVY : TEXT_DIM, letterSpacing: '0.05em' }}>
                      {speaking ? 'SPEAKING…' : 'YOUR AI INTERVIEWER'}
                    </Typography>
                  </Box>
                </Box>
                <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 1.5, mb: 1, position: 'relative', zIndex: 1 }}>
                  <Typography sx={{ fontSize: '0.7rem', color: MUTED, fontWeight: 700, letterSpacing: '0.06em', mr: 0.5 }}>QUESTION {qNum} / {totalQuestions}</Typography>
                  {slot.type && <Chip size="small" icon={<SlotIcon type={slot.type} />} label={slot.type.toUpperCase()} sx={{ bgcolor: NAVY_SOFT, color: NAVY, fontWeight: 700, height: 22, letterSpacing: '0.04em', fontSize: '0.68rem' }} />}
                  {skillTag && <Chip size="small" label={skillTag} sx={{ bgcolor: '#FFFFFF', color: NAVY, border: `1px solid ${NAVY}22`, fontWeight: 700, height: 22, fontSize: '0.68rem' }} />}
                </Stack>
                <Box sx={{ flex: 1, p: { xs: 2.25, md: 2.75 }, borderRadius: '16px', border: `1px solid ${BORDER}`, background: 'linear-gradient(180deg, rgba(2,33,36,0.03) 0%, rgba(2,33,36,0.08) 100%)', boxShadow: SHADOW_SM, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                    <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: SHADOW_SM }}>
                      <SmartToyOutlined sx={{ fontSize: 16, color: '#FFFFFF' }} />
                    </Box>
                    <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: NAVY, letterSpacing: '0.06em' }}>AI INTERVIEWER</Typography>
                  </Stack>
                  <Typography sx={{ flex: 1, fontSize: { xs: '1.02rem', md: '1.12rem' }, color: NAVY, lineHeight: 1.65, fontWeight: 500 }}>
                    {currentQ || 'Preparing question…'}
                  </Typography>
                </Box>
              </Paper>
            </Box>

            {/* RIGHT — User */}
            <Box sx={{ flex: 1, minWidth: 0, display: 'flex' }}>
              <Paper elevation={0} sx={{ borderRadius: '20px', width: '100%', border: `1px solid ${BORDER}`, bgcolor: '#FFFFFF', boxShadow: SHADOW_CARD, p: { xs: 2.5, md: 3 }, height: '100%', minHeight: { md: 560 }, display: 'flex', flexDirection: 'column' }}>
                {/* Camera box */}
                <Box sx={{ position: 'relative', width: '100%', aspectRatio: '4 / 3', borderRadius: '16px', overflow: 'hidden', bgcolor: '#022124', border: `2px solid ${cameraOn ? SUCCESS : BORDER}`, boxShadow: SHADOW_MD, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'border-color 250ms ease' }}>
                  <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', display: cameraOn ? 'block' : 'none' }} />
                  {!cameraOn && (
                    <Box sx={{
                      position: 'absolute', inset: 0,
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center',
                      gap: 1.75,
                      color: '#FFFFFF', px: 3, textAlign: 'center',
                    }}>
                      <Box sx={{ width: 72, height: 72, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <VideocamOffOutlined sx={{ fontSize: 36, opacity: 0.8 }} />
                      </Box>
                      <Typography sx={{ fontSize: '0.95rem', fontWeight: 700, letterSpacing: '0.02em', opacity: 0.9 }}>Camera is off</Typography>
                      <Typography sx={{ fontSize: '0.78rem', opacity: 0.6, lineHeight: 1.55, maxWidth: 280 }}>Turn it on to see yourself during the interview.</Typography>
                      <Button variant="contained" onClick={toggleCamera} startIcon={<VideocamOutlined sx={{ fontSize: 22 }} />} sx={{ mt: 1, bgcolor: SUCCESS, color: '#FFFFFF', textTransform: 'none', fontWeight: 700, fontSize: '0.9rem', px: 3, py: 1.15, borderRadius: '12px', boxShadow: `0 8px 24px ${SUCCESS}66, 0 3px 10px ${SUCCESS}44`, '&:hover': { bgcolor: '#3E6E3E', boxShadow: `0 12px 32px ${SUCCESS}77, 0 4px 14px ${SUCCESS}55`, transform: 'translateY(-1px)' }, transition: 'all 180ms ease' }}>Turn camera on</Button>
                    </Box>
                  )}
                  {cameraOn && (
                    <Box sx={{ position: 'absolute', top: 12, left: 12, px: 1, py: 0.4, borderRadius: '8px', bgcolor: 'rgba(0,0,0,0.55)', display: 'inline-flex', alignItems: 'center', gap: 0.6, backdropFilter: 'blur(4px)' }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: SUCCESS, animation: 'camLive 1.4s ease-in-out infinite', '@keyframes camLive': { '0%, 100%': { opacity: 0.5 }, '50%': { opacity: 1 } } }} />
                      <Typography sx={{ fontSize: '0.68rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '0.06em' }}>LIVE</Typography>
                    </Box>
                  )}
                  {cameraOn && (
                    <Box sx={{ position: 'absolute', top: 12, right: 12, px: 1, py: 0.4, borderRadius: '8px', bgcolor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
                      <Typography sx={{ fontSize: '0.68rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '0.06em' }}>YOU</Typography>
                    </Box>
                  )}
                  {cameraOn && (
                    <Tooltip title="Turn camera off">
                      <IconButton onClick={toggleCamera} sx={{ position: 'absolute', bottom: 12, right: 12, width: 48, height: 48, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.95)', color: DANGER, boxShadow: SHADOW_LG, backdropFilter: 'blur(4px)', transition: 'all 200ms ease', '&:hover': { bgcolor: '#FFFFFF', transform: 'scale(1.06)' } }}>
                        <VideocamOffOutlined sx={{ fontSize: 24 }} />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
                {cameraError && <Alert severity="info" sx={{ borderRadius: '10px', mt: 1.5, boxShadow: SHADOW_SM, fontSize: '0.8rem' }}>{cameraError}</Alert>}
                {micPermission === 'denied' && <Alert severity="warning" sx={{ borderRadius: '10px', mt: 1.5, boxShadow: SHADOW_SM, fontSize: '0.8rem' }}>Microphone is blocked. Enable it in your browser to answer.</Alert>}

                <Divider sx={{ borderColor: BORDER, my: 2 }}>
                  <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: MUTED, letterSpacing: '0.08em', px: 1 }}>YOUR VOICE</Typography>
                </Divider>

                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1.25 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                    <Box sx={{ position: 'relative', width: 76, height: 76, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {micEnabled && (
                        <>
                          <Box aria-hidden sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 76, height: 76, borderRadius: '50%', border: `2px solid ${SUCCESS}55`, animation: 'micRingC1 1.8s ease-out infinite', '@keyframes micRingC1': { '0%': { transform: 'translate(-50%, -50%) scale(0.85)', opacity: 0.8 }, '100%': { transform: 'translate(-50%, -50%) scale(1.65)', opacity: 0 } }, pointerEvents: 'none' }} />
                          <Box aria-hidden sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 76, height: 76, borderRadius: '50%', border: `2px solid ${SUCCESS}44`, animation: 'micRingC2 1.8s ease-out infinite', animationDelay: '0.6s', '@keyframes micRingC2': { '0%': { transform: 'translate(-50%, -50%) scale(0.85)', opacity: 0.8 }, '100%': { transform: 'translate(-50%, -50%) scale(1.9)', opacity: 0 } }, pointerEvents: 'none' }} />
                        </>
                      )}
                      <Tooltip title={!srSupported ? 'Voice not supported in this browser' : micPermission === 'denied' ? 'Microphone blocked — enable in browser' : micEnabled ? 'Tap to stop' : 'Tap to speak (Space)'}>
                        <span>
                          <IconButton disabled={!srSupported || micPermission === 'denied' || !currentQ} onClick={toggleMic} sx={{ width: 76, height: 76, borderRadius: '50%', bgcolor: micEnabled ? SUCCESS : NAVY, color: '#FFFFFF', boxShadow: micEnabled ? `0 8px 24px ${SUCCESS}55, 0 3px 8px ${SUCCESS}33` : `0 8px 24px ${NAVY}44, 0 3px 8px ${NAVY}22`, transition: 'all 200ms ease', position: 'relative', zIndex: 1, '&:hover': { bgcolor: micEnabled ? '#3E6E3E' : NAVY_MID, transform: 'scale(1.06)' }, '&.Mui-disabled': { bgcolor: NAVY_SOFT, color: MUTED, boxShadow: 'none' } }}>
                            {micEnabled ? <MicOutlined sx={{ fontSize: 34 }} /> : <MicOffOutlined sx={{ fontSize: 34 }} />}
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Box>
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: micEnabled ? SUCCESS : NAVY, letterSpacing: '0.06em', textAlign: 'center' }}>
                      {!currentQ ? 'PREPARING…' : speaking ? 'LISTEN TO THE QUESTION…' : micEnabled ? 'LISTENING…' : 'MIC WILL AUTO-START AFTER QUESTION'}
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: '0.68rem', color: MUTED, textAlign: 'center' }}>Space toggles the mic · The next question is asked only when you press Submit</Typography>
                  {liveText && (
                    <Box sx={{ mt: 0.5, px: 1.5, py: 0.85, maxWidth: '100%', width: '100%', borderRadius: '10px', bgcolor: NAVY_SOFTER, border: `1px solid ${SUCCESS}33`, boxShadow: SHADOW_SM, maxHeight: 84, overflowY: 'auto' }}>
                      <Typography sx={{ fontSize: '0.8rem', color: NAVY, lineHeight: 1.5, textAlign: 'center' }}>
                        {answerText}
                        {srInterim && <Box component="span" sx={{ color: TEXT_DIM, fontStyle: 'italic' }}>{answerText ? ' ' : ''}{srInterim}</Box>}
                      </Typography>
                    </Box>
                  )}
                  {/* 🔧 CHANGE — Explicit submit: the AI advances to the next question
                      ONLY when the user presses this — never on a silence timer. */}
                  <Button
                    variant="contained"
                    onClick={submitAnswer}
                    disabled={!currentQ || speaking}
                    startIcon={<CheckCircleOutlined sx={{ fontSize: 20 }} />}
                    sx={{
                      mt: 1, bgcolor: NAVY, color: '#FFFFFF', textTransform: 'none',
                      fontWeight: 700, fontSize: '0.9rem', px: 3.5, py: 1.15, borderRadius: '12px',
                      boxShadow: SHADOW_MD, minWidth: 210,
                      '&:hover': { bgcolor: NAVY_MID, boxShadow: SHADOW_LG, transform: 'translateY(-1px)' },
                      '&.Mui-disabled': { bgcolor: NAVY_SOFT, color: MUTED, boxShadow: 'none' },
                      transition: 'all 180ms ease',
                    }}
                  >
                    {qNum >= totalQuestions ? 'Submit & finish' : 'Submit answer'}
                  </Button>
                </Box>
              </Paper>
            </Box>
          </Box>
        </Box>

        {/* End-interview dialog */}
        <Dialog open={endConfirmOpen} onClose={cancelEndInterview} maxWidth="xs" fullWidth sx={{ zIndex: 1600 }} slotProps={{ backdrop: { sx: { bgcolor: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(6px)' } }, paper: { sx: { borderRadius: '20px', boxShadow: '0 30px 80px rgba(15,23,42,0.35), 0 12px 24px rgba(15,23,42,0.18)', border: `1px solid ${BORDER}`, overflow: 'hidden', background: '#FFFFFF' } } }}>
          <Box aria-hidden sx={{ height: 4, width: '100%', background: `linear-gradient(90deg, ${DANGER} 0%, #C97B4A 50%, ${DANGER} 100%)` }} />
          <DialogTitle sx={{ px: 3, pt: 3, pb: 1.25 }}>
            <Stack direction="column" spacing={1.75} alignItems="flex-start">
              <Box sx={{ width: 52, height: 52, borderRadius: '14px', background: `linear-gradient(180deg, ${DANGER}18 0%, ${DANGER}0A 100%)`, border: `1px solid ${DANGER}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 4px 12px ${DANGER}22` }}>
                <WarningAmberOutlined sx={{ color: DANGER, fontSize: 28 }} />
              </Box>
              <Box>
                <Typography sx={{ fontSize: '1.25rem', fontWeight: 800, color: NAVY, letterSpacing: '-0.015em', lineHeight: 1.25 }}>End interview?</Typography>
                <Typography sx={{ fontSize: '0.82rem', color: TEXT_DIM, mt: 0.5, fontWeight: 500 }}>This action can't be undone.</Typography>
              </Box>
            </Stack>
          </DialogTitle>
          <DialogContent sx={{ px: 3, pt: 0.5, pb: 1 }}>
            <Typography sx={{ fontSize: '0.9rem', color: TEXT_DIM, lineHeight: 1.65, mb: 2 }}>
              Are you sure you want to end this practice interview? Your answers so far will still be scored — but the remaining questions won't be asked and you can't resume from where you left off.
            </Typography>
            <Box sx={{ display: 'flex', borderRadius: '12px', border: `1px solid ${BORDER}`, bgcolor: NAVY_SOFTER, overflow: 'hidden' }}>
              <Box sx={{ flex: 1, px: 2, py: 1.5, textAlign: 'center', borderRight: `1px solid ${BORDER}` }}>
                <Typography sx={{ fontSize: '1.35rem', fontWeight: 800, color: SUCCESS, lineHeight: 1 }}>{Math.max(0, qNum - 1)}</Typography>
                <Typography sx={{ fontSize: '0.66rem', color: MUTED, fontWeight: 700, letterSpacing: '0.06em', mt: 0.5 }}>ANSWERED</Typography>
              </Box>
              <Box sx={{ flex: 1, px: 2, py: 1.5, textAlign: 'center' }}>
                <Typography sx={{ fontSize: '1.35rem', fontWeight: 800, color: DANGER, lineHeight: 1 }}>{Math.max(0, totalQuestions - qNum + 1)}</Typography>
                <Typography sx={{ fontSize: '0.66rem', color: MUTED, fontWeight: 700, letterSpacing: '0.06em', mt: 0.5 }}>WILL BE SKIPPED</Typography>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.75, pt: 2, gap: 1.25, borderTop: `1px solid ${BORDER}`, mt: 1.5, bgcolor: '#FBFCFA' }}>
            <Button onClick={cancelEndInterview} fullWidth sx={{ textTransform: 'none', fontWeight: 700, color: NAVY, fontSize: '0.88rem', px: 2, py: 1.1, borderRadius: '10px', bgcolor: '#FFFFFF', border: `1px solid ${BORDER}`, boxShadow: SHADOW_SM, '&:hover': { bgcolor: NAVY_SOFTER, borderColor: `${NAVY}33`, boxShadow: SHADOW_MD } }}>Continue interview</Button>
            <Button onClick={confirmEndInterview} fullWidth variant="contained" sx={{ bgcolor: DANGER, color: '#FFFFFF', textTransform: 'none', fontWeight: 700, fontSize: '0.88rem', px: 2, py: 1.1, borderRadius: '10px', boxShadow: `0 6px 16px ${DANGER}55, 0 2px 6px ${DANGER}33`, '&:hover': { bgcolor: '#7A2E24', boxShadow: `0 8px 22px ${DANGER}66, 0 3px 8px ${DANGER}44`, transform: 'translateY(-1px)' }, transition: 'all 180ms ease' }}>End interview</Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  };

  if (stage === 'asking' && !isHistoryRoute) return renderAskingFullscreen();

  /* ─────────────────────────────────────────────────────────────────────
     Non-fullscreen stage renderers — UNCHANGED
     ───────────────────────────────────────────────────────────────────── */
  const renderIdle = () => (
    <Stack spacing={2.5}>
      {/* Guidelines — flattened: no nested card. The section now sits
          directly on the main card surface (header band above it). */}
      <Box>
        <SectionTitle icon={RuleOutlined} label="AI Practice Guidelines" hint="A quick overview before you start" />
        <Divider sx={{ mb: 0.5, borderColor: BORDER }} />
        <GuidelineRow icon={DescriptionOutlined} title="Upload your resume first" desc="The AI reads it end-to-end and tailors every question to your actual skills, projects, and experience." />
        <Divider sx={{ borderColor: BORDER }} />
        <GuidelineRow icon={MicOutlined} title="Voice-only answers" desc="You'll answer by speaking — no typing. Make sure you're in a quiet room and allow microphone access when prompted." />
        <Divider sx={{ borderColor: BORDER }} />
        <GuidelineRow icon={VideocamOutlined} title="Camera turns on when you start" desc="You'll see yourself in a large preview, just like a real video call. You can turn the camera on or off at any time during the interview." />
        <Divider sx={{ borderColor: BORDER }} />
        <GuidelineRow icon={HeadphonesOutlined} title="Listen carefully to each question" desc={`Expect ${config?.targetQuestions || 8} questions covering behavioral, technical, and project deep-dives.`} />
        <Divider sx={{ borderColor: BORDER }} />
        <GuidelineRow icon={TimerOutlined} title="Take your time" desc="There's no strict timer. Aim for concrete, structured answers with real examples from your work." />
        <Divider sx={{ borderColor: BORDER }} />
        <GuidelineRow icon={PsychologyOutlined} title="Get a scored report" desc="At the end you'll see an overall score, per-skill proficiency, strengths, gaps, and a full transcript." />
      </Box>
      {micPermission === 'denied' && (
        <Alert severity="warning" sx={{ borderRadius: '12px', boxShadow: SHADOW_SM }}>
          Microphone access is blocked. To take the voice interview, click the lock icon in your browser's address bar and allow microphone access, then reload this page.
        </Alert>
      )}
      <Box onDrop={onDrop} onDragOver={onDragOver} sx={{ border: `1.5px dashed ${NAVY}40`, borderRadius: '16px', background: 'linear-gradient(180deg, rgba(2,33,36,0.03) 0%, rgba(2,33,36,0.05) 100%)', p: { xs: 3, md: 4 }, textAlign: 'center', transition: 'all 200ms ease', boxShadow: SHADOW_CARD, '&:hover': { borderColor: NAVY, background: 'linear-gradient(180deg, rgba(2,33,36,0.05) 0%, rgba(2,33,36,0.08) 100%)', boxShadow: SHADOW_LG } }}>
        <Box sx={{ width: 64, height: 64, borderRadius: '16px', bgcolor: '#FFFFFF', border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2, boxShadow: SHADOW_MD }}>
          <UploadFileOutlined sx={{ fontSize: 30, color: NAVY }} />
        </Box>
        <Typography sx={{ fontWeight: 800, color: NAVY, fontSize: '1.15rem', mb: 0.75, letterSpacing: '-0.01em' }}>{config.copy?.uploadTitle || 'Upload your resume to begin'}</Typography>
        <Typography sx={{ color: TEXT_DIM, fontSize: '0.86rem', mb: 2.75, maxWidth: 420, mx: 'auto', lineHeight: 1.6 }}>{config.copy?.uploadHint || 'PDF · DOCX · TXT · up to 5 MB. The AI reads it and tailors every question to your background.'}</Typography>
        <input ref={fileInputRef} type="file" accept={(config.supportedFileTypes || []).join(',')} style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files?.[0])} />
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1.5, justifyContent: 'center', alignItems: 'center', width: '100%' }}>
          <Button variant="contained" startIcon={<UploadFileOutlined />} onClick={() => fileInputRef.current?.click()} sx={{ bgcolor: NAVY, color: '#FFFFFF', textTransform: 'none', fontWeight: 700, fontSize: '0.9rem', px: 3, py: 1.15, borderRadius: '12px', boxShadow: SHADOW_MD, minWidth: 160, '&:hover': { bgcolor: NAVY_MID, boxShadow: SHADOW_LG, transform: 'translateY(-1px)' }, transition: 'all 180ms ease' }}>Choose file</Button>
          {srSupported && micPermission !== 'granted' && micPermission !== 'denied' && (
            <Button variant="outlined" startIcon={<MicOutlined />} onClick={requestMicPermission} sx={{ borderColor: `${NAVY}40`, color: NAVY, textTransform: 'none', fontWeight: 700, fontSize: '0.9rem', px: 2.5, py: 1.15, borderRadius: '12px', minWidth: 180, '&:hover': { borderColor: NAVY, bgcolor: NAVY_SOFT } }}>Allow microphone</Button>
          )}
        </Box>
        {micPermission === 'granted' && (
          <Box sx={{ mt: 2.25, display: 'inline-flex', alignItems: 'center', gap: 0.75, px: 1.5, py: 0.6, borderRadius: '999px', bgcolor: `${SUCCESS}12`, border: `1px solid ${SUCCESS}33` }}>
            <CheckCircleOutlined sx={{ fontSize: 15, color: SUCCESS }} />
            <Typography sx={{ fontSize: '0.75rem', color: SUCCESS, fontWeight: 700, letterSpacing: '0.02em' }}>Microphone ready</Typography>
          </Box>
        )}
        {parseError && <Alert severity="error" sx={{ mt: 2.25, borderRadius: '12px', textAlign: 'left', boxShadow: SHADOW_SM }}>{parseError}</Alert>}
      </Box>
    </Stack>
  );

  const renderUploading = (label) => (
    <Box sx={{ textAlign: 'center', py: 5 }}>
      <CircularProgress sx={{ color: NAVY, mb: 2 }} thickness={3.5} size={40} />
      <Typography sx={{ color: NAVY, fontWeight: 700, fontSize: '1rem' }}>{label}</Typography>
      <Typography sx={{ color: TEXT_DIM, fontSize: '0.82rem', mt: 0.75 }}>Groq is doing the heavy lifting — usually 3-8 seconds.</Typography>
    </Box>
  );

  const renderReady = () => (
    <ReadyView ctx={{ plan, resume, config, requestingPerm, micPermission, parseError, beginInterview, fileInputRef, handleFile }} />
  );

  const renderAsking = () => {
    const slot = plan?.slots?.[qNum - 1] || {};
    const skillTag = (slot.skills || []).join(', ');
    const liveText = (answerText + (srInterim ? ` ${srInterim}` : '')).trim();
    return (
      <Stack spacing={2.25}>
        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography sx={{ fontSize: '0.75rem', color: MUTED, fontWeight: 700, letterSpacing: '0.05em' }}>QUESTION {qNum} OF {totalQuestions}</Typography>
              {slot.type && <Chip size="small" icon={<SlotIcon type={slot.type} />} label={slot.type.toUpperCase()} sx={{ bgcolor: NAVY_SOFT, color: NAVY, fontWeight: 700, height: 22, letterSpacing: '0.04em' }} />}
              {skillTag && <Chip size="small" label={skillTag} sx={{ bgcolor: '#FFFFFF', color: NAVY, border: `1px solid ${NAVY}22`, fontWeight: 700, height: 22 }} />}
            </Stack>
            <Button variant="outlined" size="small" startIcon={<StopRounded sx={{ fontSize: 16 }} />} onClick={requestEndInterview} sx={{ borderColor: `${DANGER}44`, color: DANGER, textTransform: 'none', fontWeight: 700, borderRadius: '10px', px: 1.5, py: 0.4, fontSize: '0.78rem', '&:hover': { borderColor: DANGER, bgcolor: `${DANGER}0A` } }}>End interview</Button>
          </Stack>
          <LinearProgress variant="determinate" value={progressPct} sx={{ height: 6, borderRadius: 3, bgcolor: BORDER, '& .MuiLinearProgress-bar': { bgcolor: NAVY, borderRadius: 3 } }} />
        </Box>
        <Box sx={{ p: 2.25, borderRadius: '14px', border: `1px solid ${BORDER}`, bgcolor: NAVY_SOFTER, minHeight: 90, boxShadow: SHADOW_SM }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <Box sx={{ width: 26, height: 26, borderRadius: '50%', bgcolor: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: SHADOW_SM }}>
              <SmartToyOutlined sx={{ fontSize: 15, color: '#FFFFFF' }} />
            </Box>
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: NAVY, letterSpacing: '0.05em' }}>AI INTERVIEWER</Typography>
          </Stack>
          <Typography sx={{ fontSize: '0.98rem', color: NAVY, lineHeight: 1.6, fontWeight: 500 }}>{currentQ || 'Preparing question…'}</Typography>
        </Box>
        {micPermission === 'denied' && <Alert severity="warning" sx={{ borderRadius: '12px', boxShadow: SHADOW_SM }}>Microphone access is blocked. Please enable it in your browser to continue speaking your answers.</Alert>}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2.5, position: 'relative' }}>
          {micEnabled && (
            <>
              <Box aria-hidden sx={{ position: 'absolute', top: 12, width: 140, height: 140, borderRadius: '50%', border: `2px solid ${SUCCESS}55`, animation: 'micRing1 1.8s ease-out infinite', '@keyframes micRing1': { '0%': { transform: 'scale(0.8)', opacity: 0.8 }, '100%': { transform: 'scale(1.4)', opacity: 0 } } }} />
              <Box aria-hidden sx={{ position: 'absolute', top: 12, width: 140, height: 140, borderRadius: '50%', border: `2px solid ${SUCCESS}44`, animation: 'micRing2 1.8s ease-out infinite', animationDelay: '0.6s', '@keyframes micRing2': { '0%': { transform: 'scale(0.8)', opacity: 0.8 }, '100%': { transform: 'scale(1.6)', opacity: 0 } } }} />
            </>
          )}
          <Tooltip title={!srSupported ? 'Voice not supported in this browser' : micPermission === 'denied' ? 'Microphone blocked — enable in browser' : micEnabled ? 'Tap to stop' : 'Tap to speak (Space)'}>
            <span>
              <IconButton disabled={!srSupported || micPermission === 'denied' || !currentQ} onClick={toggleMic} sx={{ width: 96, height: 96, borderRadius: '50%', bgcolor: micEnabled ? SUCCESS : NAVY, color: '#FFFFFF', boxShadow: micEnabled ? `0 8px 32px ${SUCCESS}66, 0 3px 10px ${SUCCESS}44` : `0 8px 32px ${NAVY}55, 0 3px 10px ${NAVY}33`, transition: 'all 200ms ease', '&:hover': { bgcolor: micEnabled ? '#3E6E3E' : NAVY_MID, transform: 'scale(1.06)' }, '&.Mui-disabled': { bgcolor: NAVY_SOFT, color: MUTED, boxShadow: 'none' } }}>
                {micEnabled ? <MicOutlined sx={{ fontSize: 42 }} /> : <MicOffOutlined sx={{ fontSize: 42 }} />}
              </IconButton>
            </span>
          </Tooltip>
          <Typography sx={{ mt: 1.75, fontSize: '0.78rem', fontWeight: 700, color: micEnabled ? SUCCESS : NAVY, letterSpacing: '0.05em' }}>
            {!currentQ ? 'PREPARING QUESTION…' : micEnabled ? 'LISTENING… PRESS SUBMIT WHEN DONE' : 'MIC WILL AUTO-START AFTER QUESTION'}
          </Typography>
          <Typography sx={{ mt: 0.5, fontSize: '0.72rem', color: MUTED }}>Space toggles the mic · The next question is asked only when you press Submit</Typography>
          {(micEnabled || liveText) && liveText && (
            <Box sx={{ mt: 2, px: 2, py: 1.25, maxWidth: 520, width: '100%', borderRadius: '12px', bgcolor: '#FFFFFF', border: `1px solid ${SUCCESS}33`, textAlign: 'center', boxShadow: SHADOW_SM }}>
              <Typography sx={{ fontSize: '0.85rem', color: NAVY, lineHeight: 1.55, fontStyle: srInterim && !answerText ? 'italic' : 'normal' }}>
                {answerText}
                {srInterim && <Box component="span" sx={{ color: TEXT_DIM, fontStyle: 'italic' }}>{answerText ? ' ' : ''}{srInterim}</Box>}
              </Typography>
            </Box>
          )}
          {/* 🔧 CHANGE — Explicit submit (non-fullscreen fallback) */}
          <Button
            variant="contained"
            onClick={submitAnswer}
            disabled={!currentQ || speaking}
            startIcon={<CheckCircleOutlined sx={{ fontSize: 20 }} />}
            sx={{
              mt: 2, bgcolor: NAVY, color: '#FFFFFF', textTransform: 'none',
              fontWeight: 700, fontSize: '0.9rem', px: 3.5, py: 1.1, borderRadius: '12px',
              boxShadow: SHADOW_MD, minWidth: 210,
              '&:hover': { bgcolor: NAVY_MID, boxShadow: SHADOW_LG, transform: 'translateY(-1px)' },
              '&.Mui-disabled': { bgcolor: NAVY_SOFT, color: MUTED, boxShadow: 'none' },
              transition: 'all 180ms ease',
            }}
          >
            {qNum >= totalQuestions ? 'Submit & finish' : 'Submit answer'}
          </Button>
        </Box>
      </Stack>
    );
  };

  const renderComplete = () => (
    <CompleteView ctx={{ report, qas, attemptId, config, restart }} />
  );
  const renderRightPanel = () => {
    if (historyView === 'list') return (
      <HistoryListView ctx={{ attempts: historyAttempts, loading: historyLoading, error: historyError, onView: viewAttempt, onClose: exitHistory, onDelete: deleteHistory, onRefresh: openHistory }} />
    );
    if (historyView === 'detail') return (
      <HistoryDetailView ctx={{ attempt: detailAttempt, loading: detailLoading, onBack: backToList, onClose: exitHistory }} />
    );
   
    if (isHistoryRoute) return renderUploading('Loading interview history…');
    if (stage === 'idle')       return renderIdle();
    if (stage === 'uploading')  return renderUploading('Reading and parsing your resume…');
    if (stage === 'planning')   return renderUploading('Building your interview plan…');
    if (stage === 'ready')      return renderReady();
    if (stage === 'asking')     return renderAsking();
    if (stage === 'evaluating') return renderUploading('Scoring your interview…');
    if (stage === 'complete')   return renderComplete();
    return null;
  };

  /* ── page shell ────────────────────────────────────────────────────── */

  if (isHistoryRoute) {
    return (
      <Box sx={{
        maxWidth: 1440, mx: 'auto', minHeight: '100vh',
        bgcolor: '#F6F8F3',
        px: { xs: 2, md: 3 }, py: { xs: 2, md: 3 },
        fontFamily: FONT,
        '& .MuiTypography-root, & .MuiButton-root, & .MuiToggleButton-root, & .MuiChip-root, & .MuiInputBase-root, & .MuiMenuItem-root, & .MuiPaginationItem-root': {
          fontFamily: FONT,
        },
      }}>
        <Fade in key={historyView ?? 'history'}>
          <Box>{renderRightPanel()}</Box>
        </Fade>
      </Box>
    );
  }

    return (
    <>
    <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, md: 3 }, py: { xs: 2, md: 3 }, fontFamily: FONT }}>
     
      <Paper elevation={0} sx={{ borderRadius: '18px', border: `1px solid ${BORDER}`, bgcolor: '#FFFFFF', boxShadow: SHADOW_CARD, overflow: 'hidden' }}>

        {/* ── Header band (was its own card) ─────────────────────────── */}
        <Box sx={{ px: { xs: 2, md: 2.75 }, py: { xs: 1.75, md: 2.25 }, background: 'linear-gradient(180deg, #FBFCFA 0%, #FFFFFF 100%)' }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
        
            {(stage === 'ready' || stage === 'complete') && historyView === null && (
              <Tooltip title="Back">
                <IconButton
                  onClick={handleBack}
                  sx={{
                    width: 40, height: 40, borderRadius: '10px', flexShrink: 0,
                    color: NAVY, border: `1px solid ${BORDER}`, bgcolor: '#FFFFFF',
                    boxShadow: SHADOW_SM, transition: 'all 160ms ease',
                    '&:hover': { bgcolor: NAVY_SOFTER, borderColor: `${NAVY}35`, boxShadow: SHADOW_MD },
                  }}
                >
                  <ArrowBackOutlined sx={{ fontSize: 20 }} />
                </IconButton>
              </Tooltip>
            )}
            <Box sx={{ width: 46, height: 46, borderRadius: '12px', background: `linear-gradient(180deg, ${NAVY_MID} 0%, ${NAVY} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: SHADOW_MD }}>
              {isHistoryRoute
                ? <HistoryOutlined sx={{ color: '#FFFFFF', fontSize: 24 }} />
                : <SmartToyOutlined sx={{ color: '#FFFFFF', fontSize: 24 }} />}
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: '1.15rem', fontWeight: 800, color: NAVY, letterSpacing: '-0.01em' }}>
                {isHistoryRoute
                  ? 'Interview History'
                  : (config.copy?.heroTitle || 'AI Practice Interview')}
              </Typography>
              <Typography sx={{ fontSize: '0.83rem', color: TEXT_DIM, mt: 0.25 }}>
                {isHistoryRoute
                  ? 'Your past practice interviews with scores and full reports.'
                  : (config.copy?.heroLead || 'Speak your answers. Get a scored report per skill.')}
              </Typography>
            </Box>

      
            {isHistoryRoute && (
              <Button
                startIcon={<ArrowBackOutlined sx={{ fontSize: 17 }} />}
                onClick={exitHistory}
                sx={{
                  textTransform: 'none', fontWeight: 700, color: NAVY, fontSize: '0.82rem',
                  borderRadius: '10px', px: 1.75, py: 0.85,
                  '&:hover': { bgcolor: NAVY_SOFTER },
                }}
              >
                Back to interview
              </Button>
            )}

            {/* Stage chip — only on the practice route */}
            {!isHistoryRoute && historyView === null && <StageChip label={currentStageLabel} />}
          </Stack>
        </Box>

        <Divider sx={{ borderColor: BORDER }} />

        {/* ── Card body ──────────────────────────────────────────────── */}
        <Box sx={{ px: { xs: 2, md: 2.75 }, py: { xs: 2, md: 2.75 } }}>
          <Fade in key={historyView ?? stage}>
            <Box>{renderRightPanel()}</Box>
          </Fade>
          {error && stage !== 'complete' && !historyView && (
            <Alert severity="warning" sx={{ mt: 2, borderRadius: '12px', boxShadow: SHADOW_SM }}>{error}</Alert>
          )}
        </Box>
      </Paper>
    </Box>
    </>
  );
};

export default AIPracticeInterview;