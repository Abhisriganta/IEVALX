// ============================================================================
// useAIPracticeInterview.js
// Location: src/hooks/jobseeker/useAIPracticeInterview.js
// ============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import aiPracticeInterviewService, {
  cleanQuestion,
} from '@/services/api/jobseeker/aiPracticeInterviewService';
import proctoringService from '@/services/api/jobseeker/Proctoringservice';

const _generateSessionId = () =>
  `rt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;

export const useAIPracticeInterview = () => {
  const [config,  setConfig]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const [stage,     setStage]     = useState('idle');
  const [resume,    setResume]    = useState(null);
  const [plan,      setPlan]      = useState(null);
  const [qas,       setQas]       = useState([]);
  const [qNum,      setQNum]      = useState(0);
  const [currentQ,  setCurrentQ]  = useState('');
  const [attemptId, setAttemptId] = useState(null);
  const [report,    setReport]    = useState(null);
  const [sessionId, setSessionId] = useState(null);

  const qasRef       = useRef([]);
  const qNumRef            = useRef(0);
  const abortRef           = useRef(null);
  const startedAtRef       = useRef(0);
  const sessionIdRef       = useRef(null);
  const proctorSessionIdRef = useRef(null);

  useEffect(() => { qasRef.current  = qas;  }, [qas]);
  useEffect(() => { qNumRef.current = qNum; }, [qNum]);
  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);

  const fetchConfig = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const result = await aiPracticeInterviewService.getInterviewConfig();
      setConfig(result);
      return result;
    } catch (err) {
      setError(err?.message || 'Failed to load interview configuration');
      throw err;
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const uploadResume = useCallback(async (file) => {
    if (!file) return null;
    setStage('uploading');
    setError(null);
    try {
      const res = await aiPracticeInterviewService.uploadResume(file);
      setResume(res);
      return res;
    } catch (err) {
      setError(err?.message || 'Failed to parse resume');
      setStage('idle');
      throw err;
    }
  }, []);

  const buildPlan = useCallback(async ({ resume_id, totalQs, mode } = {}) => {
    if (!resume_id) return null;
    setStage('planning');
    setError(null);
    try {
      const p = await aiPracticeInterviewService.buildCoveragePlan({
        resume_id,
        totalQs: totalQs ?? config?.targetQuestions,
        mode,
      });
      setPlan(p);
      if (p?.proctor_session_id) {
        proctorSessionIdRef.current = p.proctor_session_id;
      }
      setStage('ready');
      return p;
    } catch (err) {
      setError(err?.message || 'Failed to build coverage plan');
      setStage('idle');
      throw err;
    }
  }, [config]);

  const askNext = useCallback(async ({ onChunk } = {}) => {
    if (!plan || !resume) return null;
    const next = qNumRef.current + 1;
    const totalQs = plan.total_questions || plan.slots?.length;
    if (!totalQs || next > totalQs) return null;

    setQNum(next);
    qNumRef.current = next;
    setCurrentQ('');
    setQas((prev) => [...prev, { q: '', a: '', skills: [], type: '' }]);

    const payload = {
      resume_id: resume.resume_id,
      plan_id:   plan.plan_id,
      questionNum: next,
      totalQs,
      answer: qasRef.current.length
        ? qasRef.current[qasRef.current.length - 1].a || ''
        : '',
      qas: qasRef.current,
    };

    let full = '';
    abortRef.current = new AbortController();
    try {
      for await (const chunk of aiPracticeInterviewService.askStream(payload, {
        signal: abortRef.current.signal,
      })) {
        full += chunk;
        const q = cleanQuestion(full);
        setCurrentQ(q);
        onChunk?.(q);
      }
    } catch { /* aborted */ }

    const question = cleanQuestion(full);
    if (!question) return null;
    if (/INTERVIEW_COMPLETE/i.test(question)) return { question, done: true };

    const slot   = plan.slots?.[next - 1] || {};
    const skills = Array.isArray(slot.skills) ? slot.skills : [];
    const type   = slot.type || '';

    setQas((prev) => {
      const cp = [...prev];
      cp[cp.length - 1] = { q: question, a: '', skills, type };
      return cp;
    });

    return { question, skills, type, done: false };
  }, [plan, resume]);

  const commitAnswer = useCallback((text) => {
    const currentQas = qasRef.current;
    if (sessionIdRef.current && currentQas.length) {
      const lastEntry = currentQas[currentQas.length - 1];
      if (lastEntry.q) {
        aiPracticeInterviewService.saveAnswer({
          session_id:   sessionIdRef.current,
          plan_id:      plan?.plan_id    || null,
          resume_id:    resume?.resume_id || null,
          question_num: qNumRef.current,
          q:     lastEntry.q,
          a:     text || '',
          skills: lastEntry.skills || [],
          type:  lastEntry.type   || '',
        }).catch((e) => console.warn('[AI Interview] save-answer silently failed:', e));
      }
    }
    setQas((prev) => {
      const cp = [...prev];
      if (cp.length) cp[cp.length - 1] = { ...cp[cp.length - 1], a: text || '' };
      return cp;
    });
  }, [plan, resume]);

  const start = useCallback(() => {
    const sid = _generateSessionId();
    setSessionId(sid);
    sessionIdRef.current = sid;
    setStage('asking');
    setQas([]); qasRef.current = [];
    setQNum(0); qNumRef.current = 0;
    setCurrentQ('');
    setReport(null);
    setAttemptId(null);
    startedAtRef.current = Date.now();
  }, []);

  const finish = useCallback(async () => {
    try { abortRef.current?.abort(); } catch { /* noop */ }
    setStage('evaluating');
    setError(null);
    const duration = Math.floor((Date.now() - (startedAtRef.current || Date.now())) / 1000);
    const finalQas = qasRef.current.filter((x) => x.q);

    // BUILD: 2026-09-22-realtime-honest-scoring-v1
    // Honest-scoring guard: if the candidate did not answer a single question,
    // short-circuit locally with a clean zero instead of calling /evaluate/.
    // Backend also enforces this; the client-side check saves a round trip
    // and keeps the UI honest even if a legacy backend is deployed.
    const _answered = finalQas.filter((x) => (x.a || '').trim()).length;
    if (_answered === 0) {
      setReport({
        attempt_id:      null,
        overall_score:   0,
        verdict:         'Not attempted',
        summary:         'No answers were recorded for this practice session. The AI can only score answers you actually speak — please try again and answer the questions out loud.',
        strengths:       [],
        weaknesses:      [],
        communication:   null,
        technical:       null,
        problem_solving: null,
        skills:          [],
      });
      setAttemptId(null);
      setStage('complete');
      return null;
    }

    try {
      const j = await aiPracticeInterviewService.evaluate({
        qas:              finalQas,
        session_id:       sessionIdRef.current || undefined,
        resume_id:        resume?.resume_id,
        plan_id:          plan?.plan_id,
        duration_seconds: duration,
      });
      setReport(j);
      setAttemptId(j.attempt_id || null);
      setStage('complete');
      const _proctorSid = proctorSessionIdRef.current;
      if (_proctorSid) {
        proctoringService.endSession(_proctorSid).catch(() => {});
        proctorSessionIdRef.current = null;
      }
      return j;
    } catch (err) {
      setError(err?.message || 'Failed to score interview');
      setStage('complete');
      return null;
    }
  }, [resume, plan]);

  const reset = useCallback(() => {
    try { abortRef.current?.abort(); } catch { /* noop */ }
    setStage('idle');
    setResume(null); setPlan(null);
    setQas([]); qasRef.current = [];
    setQNum(0); qNumRef.current = 0;
    setCurrentQ(''); setAttemptId(null); setReport(null); setError(null);
    startedAtRef.current = 0;
    setSessionId(null); sessionIdRef.current = null;
  }, []);

  // 🔧 CHANGE 1/2 — History: fetch the attempt list from GET /list/ and a
  //   single detailed result from GET /result/<id>. Both return safe defaults
  //   on error so the caller never needs try/catch around them.
  const listAttempts = useCallback(async ({ signal } = {}) => {
    try {
      const res = await aiPracticeInterviewService.listAttempts({ signal });
      return res?.Data || [];
    } catch {
      return [];
    }
  }, []);

  const getAttemptDetail = useCallback(async (id, { signal } = {}) => {
    try {
      const res = await aiPracticeInterviewService.getResult(id, { signal });
      return res?.Data || null;
    } catch {
      return null;
    }
  }, []);

  return {
    config, loading, error, refetch: fetchConfig,
    stage, resume, plan, qas, qNum, currentQ, attemptId, report, sessionId,
    proctorSessionIdRef,
    uploadResume, buildPlan, start, askNext, commitAnswer, finish, reset,
    // 🔧 CHANGE 2/2 — Expose history methods to the page component
    listAttempts,
    getAttemptDetail,
    /* legacy shims */
    parseResume:       uploadResume,
    generateQuestions: buildPlan,
    submitSession:     finish,
  };
};

export default useAIPracticeInterview;