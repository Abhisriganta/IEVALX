import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { aiAssessmentTestService } from '@/services/api/jobseeker/aiAssessmentTestService';
import { aiAssessmentService     } from '@/services/api/jobseeker/aiAssessmentService';

const _startAssessmentCache = new Map();
const _generatePaperCache   = new Map();
const ALLOW_AUTO_FINALIZE = true;


const _normalizeCode = (s) =>
  String(s || '').replace(/\r\n/g, '\n').trim();

export const isAnswerAttempted = (question, answer) => {
  if (answer === undefined || answer === null) return false;
  const qtype = (question?.question_type || '').toLowerCase();
  if (qtype !== 'coding' && qtype !== 'sql') {
    return true;
  }
  if (typeof answer !== 'object') return false;
  const code = answer.code || answer.source_code || '';
  if (!String(code).trim()) return false;
  const bp = question?.content?.boilerplate || question?.boilerplate || '';
  if (bp && _normalizeCode(code) === _normalizeCode(bp)) return false;
  return true;
};

const _onceStartAssessment = (assignmentId) => {
  if (!_startAssessmentCache.has(assignmentId)) {
    _startAssessmentCache.set(
      assignmentId,
      aiAssessmentService.startAssessment(assignmentId).catch((e) => {
        const msg = e?.response?.data?.Error || e?.response?.data?.error || '';
        if (!/already|started/i.test(msg)) {
          console.warn('[useAIAssessmentTest] startAssessment warning:', msg || e?.message);
        }
        return null;
      }),
    );
  }
  return _startAssessmentCache.get(assignmentId);
};

const _onceGeneratePaper = (assignmentId) => {
  if (!_generatePaperCache.has(assignmentId)) {
    _generatePaperCache.set(
      assignmentId,
      aiAssessmentService.generateTestPaper(assignmentId).catch((e) => {
        console.warn(
          '[useAIAssessmentTest] generateTestPaper warning:',
          e?.response?.data?.Error || e?.response?.data?.error || e?.message,
        );
        return null;
      }),
    );
  }
  return _generatePaperCache.get(assignmentId);
};

export const useAIAssessmentTest = (assignmentId, durationMinutes = 30) => {
  const [questions,   setQuestions]   = useState([]);
  const [currentIdx,  setCurrentIdx]  = useState(0);
  const [answers,     setAnswers]     = useState({});
  const [timeLeft,    setTimeLeft]    = useState(durationMinutes * 60);
  const [loading,     setLoading]     = useState(true);
  const [submitting,  setSubmitting]  = useState(false);
  const [submitted,   setSubmitted]   = useState(false);
  const [result,      setResult]      = useState(null);
  const [error,       setError]       = useState(null);

  const [preparingReview, setPreparingReview] = useState(false);

  const [pendingSectionComplete, setPendingSectionComplete] = useState(null);

  const [sectionStartTimes, setSectionStartTimes] = useState({});
  const [lockedSectionIds,  setLockedSectionIds]  = useState(new Set());

  const [tick, setTick] = useState(0);

  // ─── Phase 2 review-phase state ──────────────────────────────────────────
  const [reviewSummary,           setReviewSummary]           = useState(null);
  const [inReattemptPhase,        setInReattemptPhase]        = useState(false);
  const [currentReviewSectionId,  setCurrentReviewSectionId]  = useState(null);
  const [reviewSectionStartTimes, setReviewSectionStartTimes] = useState({});
  const [visitedReviewSections,   setVisitedReviewSections]   = useState(new Set());

  const timerRef         = useRef(null);
  const hasAutoSubmitted = useRef(false);
  const doSubmitRef      = useRef(null);
  const hasLoadedRef     = useRef(false);
  const exitReviewSectionRef = useRef(null);
  const openReviewSummaryRef = useRef(null);
  const enteredSectionsRef = useRef(new Set());


  const unmodifiedCodingCacheRef = useRef({});

  const [saveStatus, setSaveStatus] = useState({});
  // Timers pending flush per question — set by debounced typing types.
  const saveTimersRef = useRef({});
  // In-flight save promises per question — awaited by flushPendingSaves.
  const inFlightSavesRef = useRef({});
  
  const pendingValueRef = useRef({});
  const DEBOUNCED_TYPES = new Set([
    'short_answer', 'scenario', 'fill_blank', 'coding', 'sql',
  ]);
  const DEBOUNCE_MS = 600;

  const _resumeStorageKey = assignmentId != null
    ? `aiAssessmentTest:resume:${assignmentId}`
    : null;

  const _readResumeState = () => {
    if (!_resumeStorageKey || typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(_resumeStorageKey);
      return raw ? JSON.parse(raw) : null;
    } catch (_e) { return null; }
  };

  const _writeResumeState = useCallback((patch) => {
    if (!_resumeStorageKey || typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(_resumeStorageKey);
      const cur = raw ? JSON.parse(raw) : {};
      const next = { ...cur, ...patch, updatedAt: Date.now() };
      window.localStorage.setItem(_resumeStorageKey, JSON.stringify(next));
    } catch (_e) { /* quota exceeded, private mode — degrade silently */ }
  }, [_resumeStorageKey]);

  const _clearResumeState = useCallback(() => {
    if (!_resumeStorageKey || typeof window === 'undefined') return;
    try { window.localStorage.removeItem(_resumeStorageKey); } catch (_e) {}
  }, [_resumeStorageKey]);

  const [resumeInfo, setResumeInfo] = useState({
    isResuming:         false,
    lastSeenQuestionId: null,
    lastSeenAt:         null,
  });

  const dismissResumeBanner = useCallback(() => {
    setResumeInfo((prev) => ({ ...prev, isResuming: false }));
  }, []);

  const hasRestoredRef = useRef(false);

  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine !== false : true,
  );

  useEffect(() => {
    if (typeof window === 'undefined') return () => {};
    const onOnline  = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online',  onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online',  onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // ─── Load test paper ─────────────────────────────────────────────────────
  const loadTest = useCallback(async () => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    setLoading(true);
    setError(null);
    try {
      await _onceStartAssessment(assignmentId);
      await _onceGeneratePaper(assignmentId);

      const paperData = await aiAssessmentTestService.getTestPaper(assignmentId);

      const qMetas = Array.isArray(paperData?.sections)
        ? paperData.sections.flatMap((sec) =>
            (sec.questions || []).map((q) => ({
              ...q,
              _section_id:        sec.section_id,
              _section_name:      sec.name,
              _section_position:  sec.position,
              _section_duration:  sec.duration_minutes,
            }))
          )
        : (paperData?.questions ?? []);

      setQuestions(qMetas);
    } catch (err) {
      console.error('[useAIAssessmentTest] loadTest:', err);
      setError(
        err?.response?.data?.Error  ||
        err?.response?.data?.error  ||
        err?.message                ||
        'Failed to load test questions.',
      );
    } finally {
      setLoading(false);
    }
  }, [assignmentId]);

  useEffect(() => { loadTest(); }, [loadTest]);

  useEffect(() => {
    if (questions.length === 0) return;
    const seen = new Set();
    let totalMinutes = 0;
    for (const q of questions) {
      if (q._section_id == null || seen.has(q._section_id)) continue;
      seen.add(q._section_id);
      totalMinutes += (q._section_duration || 0);
    }
    if (totalMinutes > 0 && totalMinutes !== durationMinutes) {
      setTimeLeft(totalMinutes * 60);
    }
  }, [questions]);
  useEffect(() => {
    if (hasRestoredRef.current) return;
    if (questions.length === 0) return;
    if (submitted) return;

    const stored = _readResumeState();
    if (!stored || stored.lastSeenQuestionId == null) return;

    const STALE_MS = 24 * 60 * 60 * 1000;
    if (stored.updatedAt && (Date.now() - stored.updatedAt) > STALE_MS) {
      _clearResumeState();
      return;
    }

    const targetIdx = questions.findIndex(
      (q) => String(q.id) === String(stored.lastSeenQuestionId),
    );
    if (targetIdx < 0) return;
    if (targetIdx > 0) {
      hasRestoredRef.current = true;
      setCurrentIdx(targetIdx);
    } else {
      hasRestoredRef.current = true;
    }

    setResumeInfo({
      isResuming:         true,
      lastSeenQuestionId: stored.lastSeenQuestionId,
      lastSeenAt:         stored.updatedAt || null,
    });
  }, [questions, submitted, _clearResumeState]);

  useEffect(() => {
    if (loading || submitted) return;
    timerRef.current = setInterval(() => {
      setTick((t) => t + 1);
      setTimeLeft((prev) => (prev <= 0 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [loading, submitted]);

  // ─── Auto-complete on exit ─────────────────────────────────────────
  useEffect(() => {
    if (loading || submitted || !assignmentId) return;

    const handleBeforeUnload = () => {
      if (!submitted) {
        aiAssessmentTestService.fireAndForgetExit(assignmentId);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (!submitted) {
        aiAssessmentTestService.fireAndForgetExit(assignmentId);
      }
    };
  }, [loading, submitted, assignmentId]);

  // ─── Submit ────────────
  const doSubmit = async () => {
    if (submitting || submitted) return;
    clearInterval(timerRef.current);
    setSubmitting(true);
    setError(null);

    try {
      const answersPayload = Object.entries(answers)
        .filter(([, val]) => val !== null && val !== undefined)
        .map(([qId, candidateAnswer]) => ({
          question_id:      parseInt(qId, 10),
          candidate_answer: candidateAnswer,
        }));

      if (answersPayload.length > 0) {
        await aiAssessmentTestService.bulkSaveResponses(assignmentId, answersPayload);
      }

      const data = await aiAssessmentTestService.submitTest(assignmentId);
      setResult(data?.result ?? null);
      setSubmitted(true);
      _clearResumeState();
    } catch (err) {
      console.error('[useAIAssessmentTest] doSubmit:', err);
      const errMsg =
        err?.response?.data?.Error  ||
        err?.response?.data?.error  ||
        err?.response?.data?.detail ||
        err?.message                ||
        '';
      const isTimeout       = err?.code === 'ECONNABORTED' || /timeout/i.test(errMsg);
      const isAlreadyDone   = /assignment status:\s*completed|already (submitted|completed)/i.test(errMsg);

      if (isTimeout || isAlreadyDone) {
        console.warn('[useAIAssessmentTest] doSubmit: treating as success (timeout or already completed)');
        setResult(null);
        setSubmitted(true);
        _clearResumeState();
      } else {
        setError(errMsg || 'Submission failed. Please try again.');
  
        hasAutoSubmitted.current = false;
      }
    } finally {
      setSubmitting(false);
    }
  };

  doSubmitRef.current = doSubmit;

  const hasAnySectionTimer = useMemo(
    () => questions.some((q) => (q._section_duration || 0) > 0),
    [questions],
  );

  useEffect(() => {
    if (hasAnySectionTimer) return;
    if (!ALLOW_AUTO_FINALIZE) return; 
    if (timeLeft === 0 && !loading && !submitted && !submitting && !hasAutoSubmitted.current) {
      hasAutoSubmitted.current = true;
      doSubmitRef.current?.();
    }
  }, [timeLeft, loading, submitted, submitting, hasAnySectionTimer]);

  /// BUILD: 2026-08-12-RESUME-ON-DISCONNECT-v1
  // Persist the current questionId whenever the candidate navigates,
  // so a tab-close-then-reopen lands them on the same question.
  useEffect(() => {
    if (loading || submitted) return;
    const q = questions[currentIdx];
    if (!q) return;
    _writeResumeState({ lastSeenQuestionId: q.id });
  }, [currentIdx, questions, loading, submitted, _writeResumeState]);

  const _actuallyPerformSave = useCallback((questionId, value) => {
    const isCodingAnswer =
      typeof value === 'object' && value !== null && 'code' in value;

    // Same starter-code guard as before — do not send if we already know
    // the backend will reject it as unmodified boilerplate.
    if (isCodingAnswer) {
      const codeStr = typeof value.code === 'string' ? value.code : '';
      if (
        unmodifiedCodingCacheRef.current[questionId] !== undefined &&
        unmodifiedCodingCacheRef.current[questionId] === codeStr
      ) {
        return Promise.resolve();
      }
    }

    setSaveStatus((prev) => ({ ...prev, [questionId]: 'saving' }));

    const promise = aiAssessmentTestService
      .saveResponse(assignmentId, questionId, value)
      .then(() => {
        setSaveStatus((prev) => ({ ...prev, [questionId]: 'saved' }));
        // Clear pending marker for this value if it's still the latest.
        if (pendingValueRef.current[questionId] === value) {
          delete pendingValueRef.current[questionId];
        }
      })
      .catch((e) => {
        const msg =
          e?.response?.data?.Error  ||
          e?.response?.data?.error  ||
          e?.response?.data?.detail ||
          e?.message                ||
          '';

        if (
          isCodingAnswer &&
          /not modified the starter code/i.test(msg)
        ) {
          const codeStr = typeof value.code === 'string' ? value.code : '';
          unmodifiedCodingCacheRef.current[questionId] = codeStr;
          console.warn(
            '[useAIAssessmentTest] saveResponse: starter code unchanged ' +
            'for question ' + questionId + ' — waiting for candidate to edit.',
          );
        
          setSaveStatus((prev) => ({ ...prev, [questionId]: 'saved' }));
          return;
        }

        console.error('[useAIAssessmentTest] saveResponse:', e?.response?.data || e);
        setSaveStatus((prev) => ({ ...prev, [questionId]: 'error' }));
      })
      .finally(() => {
        // Remove from in-flight tracker only if this is still the latest
        // promise for this question (a newer save may have started).
        if (inFlightSavesRef.current[questionId] === promise) {
          delete inFlightSavesRef.current[questionId];
        }
      });

    inFlightSavesRef.current[questionId] = promise;
    return promise;
  }, [assignmentId]);

  const answerQuestion = useCallback((questionId, value) => {
    const q = questions.find(x => x.id === questionId);
    if (q && q._section_id != null && lockedSectionIds.has(q._section_id)) {
      console.warn('[useAIAssessmentTest] section locked — answer ignored');
      return;
    }
    setAnswers((prev) => ({ ...prev, [questionId]: value }));

    const isEmptyAnswer =
      value == null ||
      value === '' ||
      (typeof value === 'string' && value.trim() === '') ||
      (Array.isArray(value) && value.length === 0) ||
      (typeof value === 'object' &&
        value !== null &&
        'code' in value &&
        (typeof value.code !== 'string' || value.code.trim() === ''));

    if (isEmptyAnswer) return;

    // Track this as the latest pending value for the question so a flush
    // knows what to send if it runs before the debounce timer fires.
    pendingValueRef.current[questionId] = value;

    const qtype = (q?.question_type || '').toLowerCase();
    const shouldDebounce = DEBOUNCED_TYPES.has(qtype);

    if (!shouldDebounce) {
      // Structural type (mcq/multi_select/true_false/match/sequence): save
      // immediately — one click is one clear intent.
      _actuallyPerformSave(questionId, value);
      return;
    }

    // Typing type: debounce. Cancel any pending timer for this question,
    // start a new one; save fires once the candidate pauses typing.
    setSaveStatus((prev) => ({ ...prev, [questionId]: 'saving' }));
    if (saveTimersRef.current[questionId]) {
      clearTimeout(saveTimersRef.current[questionId]);
    }
    saveTimersRef.current[questionId] = setTimeout(() => {
      delete saveTimersRef.current[questionId];
      _actuallyPerformSave(questionId, pendingValueRef.current[questionId] ?? value);
    }, DEBOUNCE_MS);
  }, [assignmentId, questions, lockedSectionIds, _actuallyPerformSave]);

  const flushPendingSaves = useCallback(async () => {
    // Fire any timer that hasn't fired yet with the latest value.
    const pendingQIds = Object.keys(saveTimersRef.current);
    for (const qid of pendingQIds) {
      clearTimeout(saveTimersRef.current[qid]);
      delete saveTimersRef.current[qid];
      const val = pendingValueRef.current[qid];
      if (val !== undefined) {
        _actuallyPerformSave(qid, val);
      }
    }
    // Await every in-flight save.
    const inFlight = Object.values(inFlightSavesRef.current);
    if (inFlight.length > 0) {
      try {
        await Promise.allSettled(inFlight);
      } catch (_e) {
        // Errors are already surfaced via saveStatus.
      }
    }
  }, [_actuallyPerformSave]);

  useEffect(() => {
    const handler = () => {
      const pending = Object.entries(pendingValueRef.current);
      if (pending.length === 0) return;
      try {
        for (const [qid, value] of pending) {
          const payload = JSON.stringify({
            assignment_id:    parseInt(assignmentId),
            question_id:      parseInt(qid),
            candidate_answer: value,
          });
          // Best-effort — server accepts application/json on the same
          // /manual-response/submit/ endpoint. Ignore whatever comes back.
          if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
            const blob = new Blob([payload], { type: 'application/json' });
            navigator.sendBeacon('/api/manual-response/submit/', blob);
          }
        }
      } catch (_e) { /* nothing we can do at unload */ }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [assignmentId]);

  const goTo = useCallback((idx) => {
    flushPendingSaves();
    setCurrentIdx(idx);
  }, [flushPendingSaves]);
  const goPrev = useCallback(() => {
    flushPendingSaves();
    setCurrentIdx((i) => Math.max(0, i - 1));
  }, [flushPendingSaves]);

  const goNext = useCallback(() => {
    flushPendingSaves();
    const i       = currentIdx;
    const nextIdx = Math.min(questions.length - 1, i + 1);
    const curQ    = questions[i];

    if (inReattemptPhase && currentReviewSectionId != null && curQ) {
      const sectionQs    = questions.filter(q => q._section_id === currentReviewSectionId);
      const lastSectionQ = sectionQs[sectionQs.length - 1];
      const atSectionEnd = lastSectionQ && curQ.id === lastSectionQ.id;

      if (atSectionEnd) {
        exitReviewSectionRef.current?.();
        return;
      }
      if (nextIdx === i) return;
      const nextQ = questions[nextIdx];
      if (nextQ && nextQ._section_id !== currentReviewSectionId) {
        exitReviewSectionRef.current?.();
        return;
      }
      setCurrentIdx(nextIdx);
      return;
    }

    if (nextIdx === i) return;
    const nextQ = questions[nextIdx];

    const crossingBoundary =
      curQ && nextQ &&
      curQ._section_id  != null &&
      nextQ._section_id != null &&
      curQ._section_id !== nextQ._section_id;

    if (crossingBoundary) {
      setPendingSectionComplete({
        fromSection: {
          section_id: curQ._section_id,
          name:       curQ._section_name,
          position:   curQ._section_position,
        },
        toSection: {
          section_id: nextQ._section_id,
          name:       nextQ._section_name,
          position:   nextQ._section_position,
        },
        nextIdx,
      });
      return;
    }

   setCurrentIdx(nextIdx);
    // BUILD: 2026-08-12-AUTOSAVE-DEBOUNCE-v1 — flushPendingSaves in deps.
  }, [currentIdx, questions, inReattemptPhase, currentReviewSectionId, flushPendingSaves]);

  const confirmSectionComplete = useCallback(() => {
    setPendingSectionComplete((p) => {
      if (p && typeof p.nextIdx === 'number') {
        const fromSecId = p.fromSection?.section_id;
        if (fromSecId != null) {
          aiAssessmentTestService
            .completeSection(assignmentId, fromSecId)
            .catch((err) => {
              console.warn('[useAIAssessmentTest] completeSection (boundary):', err);
            });
        }
        setCurrentIdx(p.nextIdx);
      }
      return null;
    });
  }, [assignmentId]);

  const dismissSectionComplete = useCallback(() => {
    setPendingSectionComplete(null);
  }, []);

  const findNextSectionFirstIdx = useCallback((fromIdx) => {
    const fromSecId = questions[fromIdx]?._section_id;
    if (fromSecId == null) return -1;
    for (let i = fromIdx + 1; i < questions.length; i++) {
      if (questions[i]._section_id !== fromSecId) return i;
    }
    return -1;
  }, [questions]);

  const lockSectionAndAdvance = useCallback((sectionId) => {
    if (inReattemptPhase) {
      exitReviewSectionRef.current?.();
      return;
    }

    aiAssessmentTestService
      .lockSection(assignmentId, sectionId)
      .catch((err) => {
        console.warn('[useAIAssessmentTest] lockSection:', err);
      });

    setLockedSectionIds(prev => {
      if (prev.has(sectionId)) return prev;
      const next = new Set(prev);
      next.add(sectionId);
      return next;
    });
    setPendingSectionComplete(null);

    if (!hasAutoSubmitted.current) {
      if (typeof openReviewSummaryRef.current === 'function') {
        openReviewSummaryRef.current();
      } else if (ALLOW_AUTO_FINALIZE) {
        hasAutoSubmitted.current = true;
        doSubmitRef.current?.();
      }
    }
  }, [inReattemptPhase, assignmentId]);

  useEffect(() => {
    const curSecId = questions[currentIdx]?._section_id;
    if (curSecId == null) return;
    setSectionStartTimes(prev => {
      if (prev[curSecId]) return prev;
      return { ...prev, [curSecId]: Date.now() };
    });
    if (
      !inReattemptPhase &&
      curSecId != null &&
      !enteredSectionsRef.current.has(curSecId) &&
      !lockedSectionIds.has(curSecId)
    ) {
      enteredSectionsRef.current.add(curSecId);
      aiAssessmentTestService
        .enterSection(assignmentId, curSecId)
        .catch((err) => {
          console.warn('[useAIAssessmentTest] enterSection:', err);
        });
    }
  }, [currentIdx, questions, inReattemptPhase, assignmentId, lockedSectionIds]);

  // ─── Section timer ───────────────────────────────────────────────────────
  const currentSectionTimeLeft = useMemo(() => {
    const curQ = questions[currentIdx];
    if (!curQ || curQ._section_id == null) return null;

    if (inReattemptPhase) {
      const entry = reviewSectionStartTimes[curQ._section_id];
      if (!entry) return null;
      const banked = typeof entry === 'object' ? entry.banked : 0;
      const start  = typeof entry === 'object' ? entry.startedAt : entry;
      if (!banked || banked <= 0) return null;
      const elapsed = Math.floor((Date.now() - start) / 1000);
      return Math.max(0, banked - elapsed);
    }

    const dur = curQ._section_duration;
    if (!dur || dur <= 0) return null;
    const start = sectionStartTimes[curQ._section_id];
    if (!start) return dur * 60;
    const elapsed = Math.floor((Date.now() - start) / 1000);
    return Math.max(0, dur * 60 - elapsed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, questions, sectionStartTimes, reviewSectionStartTimes, inReattemptPhase, tick]);

  useEffect(() => {
    if (currentSectionTimeLeft !== 0) return;
    const curSecId = questions[currentIdx]?._section_id;
    if (curSecId == null) return;
    if (lockedSectionIds.has(curSecId)) return;
    lockSectionAndAdvance(curSecId);
  }, [currentSectionTimeLeft, currentIdx, questions, lockedSectionIds, lockSectionAndAdvance]);
  useEffect(() => {
    if (loading || submitted || submitting) return;
    if (hasAutoSubmitted.current) return;
    if (!reviewSummary || !Array.isArray(reviewSummary.by_section)) return;
    if (inReattemptPhase && currentReviewSectionId != null) return;

    const FINALIZED = new Set(['locked', 'completed', 'review_locked']);
    const allFinalized = reviewSummary.by_section.every(
      (sec) => FINALIZED.has(sec.status),
    );
    if (!allFinalized) return;

    // Guard 2 — no banked review time left on any section.
    let bankedRemaining = 0;
    for (const sec of reviewSummary.by_section) {
      bankedRemaining += Math.max(0, Number(sec.review_seconds_banked || 0));
    }
    if (bankedRemaining > 0) return;

    hasAutoSubmitted.current = true;
    doSubmitRef.current?.();
  }, [
    loading, submitted, submitting,
    reviewSummary, inReattemptPhase, currentReviewSectionId,
  ]);

  const openReviewSummary = useCallback(async () => {
    setPreparingReview(true);
    try {
    
    if (!inReattemptPhase) {
      const toComplete = [];
      enteredSectionsRef.current.forEach((secId) => {
        if (!lockedSectionIds.has(secId)) toComplete.push(secId);
      });
      if (toComplete.length > 0) {
        await Promise.allSettled(
          toComplete.map((secId) =>
            aiAssessmentTestService
              .completeSection(assignmentId, secId)
              .catch((err) => {
                console.warn(
                  '[useAIAssessmentTest] completeSection (pre-review, section ' + secId + '):',
                  err,
                );
              })
          )
        );
      }
    }

    try {
      const data = await aiAssessmentTestService.getReviewSummary(assignmentId);
      if (data && Array.isArray(data.by_section)) {
        setReviewSummary(data);
      } else {
        console.warn('[useAIAssessmentTest] review-summary returned no section data, finalizing directly');
        if (ALLOW_AUTO_FINALIZE && !submitting && !submitted && !hasAutoSubmitted.current) {
          hasAutoSubmitted.current = true;
          await doSubmitRef.current?.();
        }
      }
    } catch (err) {
      console.error('[useAIAssessmentTest] getReviewSummary:', err);
      // 🔧 TESTING — same as above; do not auto-submit on review-summary fetch errors.
      if (ALLOW_AUTO_FINALIZE && !submitting && !submitted && !hasAutoSubmitted.current) {
        hasAutoSubmitted.current = true;
        await doSubmitRef.current?.();
      }
    }
    } finally {
      setPreparingReview(false);
    }
  }, [assignmentId, submitting, submitted, inReattemptPhase, lockedSectionIds]);

  openReviewSummaryRef.current = openReviewSummary;

  const closeReviewSummary = useCallback(() => {
    setReviewSummary(null);
  }, []);

  const finalSubmit = useCallback(async () => {
    if (hasAutoSubmitted.current) return;
    hasAutoSubmitted.current = true;
    await doSubmitRef.current?.();
    setReviewSummary(null);
  }, []);

  const enterReviewSection = useCallback(async (sectionId) => {
    const section = reviewSummary?.by_section?.find(s => s.section_id === sectionId);
   const banked  = section?.review_seconds_banked ?? 0;
if (banked <= 0) {
  console.warn('[useAIAssessmentTest] enterReviewSection: no banked time for section', sectionId);
  return;
}


    if (!inReattemptPhase) {
      try {
        await aiAssessmentService.enterReviewPhase(assignmentId);
      } catch (err) {
        const msg =
          err?.response?.data?.Error ||
          err?.response?.data?.error ||
          '';
        if (!/already|reviewing/i.test(msg)) {
          console.error('[useAIAssessmentTest] enterReviewPhase:', err);
          setError(msg || 'Failed to start review phase.');
          return;
        }
      }
    }

    try {
      await aiAssessmentTestService.startReviewSection(assignmentId, sectionId);
    } catch (err) {
      console.warn('[useAIAssessmentTest] startReviewSection:', err);
    }

    const allSecIds = new Set();
    questions.forEach(q => {
      if (q._section_id != null) allSecIds.add(q._section_id);
    });
    allSecIds.delete(sectionId);

    setLockedSectionIds(allSecIds);
    setCurrentReviewSectionId(sectionId);
    setReviewSectionStartTimes(prev => ({
      ...prev,
      [sectionId]: { startedAt: Date.now(), banked },
    }));
    setInReattemptPhase(true);
    setReviewSummary(null);
    hasAutoSubmitted.current = false;

    const firstIdx = questions.findIndex(q => q._section_id === sectionId);
    if (firstIdx >= 0) setCurrentIdx(firstIdx);
  }, [reviewSummary, visitedReviewSections, inReattemptPhase, assignmentId, questions]);

  const exitReviewSection = useCallback(async () => {
    const currentSecId = currentReviewSectionId;
    if (currentSecId == null) {
      await openReviewSummary();
      return;
    }

   try {
      await aiAssessmentTestService.endReviewSection(assignmentId, currentSecId);
    } catch (err) {
      console.warn('[useAIAssessmentTest] endReviewSection:', err);
    }

    
    setCurrentReviewSectionId(null);

    await openReviewSummary();

  }, [currentReviewSectionId, assignmentId, openReviewSummary]);

  exitReviewSectionRef.current = exitReviewSection;

  // ─── Derived ─────────────────────────────────────────────────────────────
  const currentQuestion = questions[currentIdx] ?? null;
  const answeredCount   = questions.filter(
    (q) => isAnswerAttempted(q, answers[q.id]),
  ).length;
  const unansweredCount = questions.length - answeredCount;

  const currentSection = currentQuestion && currentQuestion._section_id != null
    ? {
        section_id:       currentQuestion._section_id,
        name:             currentQuestion._section_name,
        position:         currentQuestion._section_position,
        duration_minutes: currentQuestion._section_duration,
      }
    : null;

  const sectionsSummary = useMemo(() => {
    const map = new Map();
    questions.forEach((q, idx) => {
      if (q._section_id == null) return;
      if (!map.has(q._section_id)) {
        map.set(q._section_id, {
          section_id:   q._section_id,
          name:         q._section_name,
          position:     q._section_position ?? 0,
          firstIdx:     idx,
          lastIdx:      idx,
          questionCount: 1,
        });
      } else {
        const s = map.get(q._section_id);
        s.lastIdx       = idx;
        s.questionCount = s.questionCount + 1;
      }
    });
    return Array.from(map.values()).sort(
      (a, b) => (a.position ?? 0) - (b.position ?? 0),
    );
  }, [questions]);

  return {
    questions,
    currentQuestion,
    currentIdx,
    answers,
    timeLeft,
    loading,
    submitting,
    submitted,
    result,
    error,
    preparingReview,
    answeredCount,
    unansweredCount,
    goTo,
    goPrev,
    goNext,
    answerQuestion,
    submitTest: doSubmit,

    saveStatus,
    flushPendingSaves,

    // BUILD: 2026-08-12-RESUME-ON-DISCONNECT-v1 — expose resume + online state.
    resumeInfo,
    isOnline,
    dismissResumeBanner,

    currentSection,
    sectionsSummary,
    pendingSectionComplete,
    confirmSectionComplete,
    dismissSectionComplete,

    currentSectionTimeLeft,
    lockedSectionIds,

    // Phase 2 — review page API
    reviewSummary,
    openReviewSummary,
    closeReviewSummary,
    enterReviewSection,
    exitReviewSection,
    finalSubmit,
    inReattemptPhase,
    currentReviewSectionId,
    visitedReviewSections,

    // Back-compat aliases
    submitAnyway: finalSubmit,
    startReattempt: openReviewSummary,
  };
};

export default useAIAssessmentTest;