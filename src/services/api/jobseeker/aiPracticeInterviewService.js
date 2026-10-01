// ============================================================================
// aiPracticeInterviewService.js
// Location: src/services/api/jobseeker/aiPracticeInterviewService.js
// ----------------------------------------------------------------------------
// Talks to the Django `real-time-interview` endpoints:
//   POST /api/jobseekers/real-time-interview/upload-resume/
//   POST /api/jobseekers/real-time-interview/coverage-plan/
//   POST /api/jobseekers/real-time-interview/ask/            (streaming)
//   POST /api/jobseekers/real-time-interview/save-answer/   ← 🔧 CHANGE 1/1
//   POST /api/jobseekers/real-time-interview/evaluate/
//   GET  /api/jobseekers/real-time-interview/list/
//   GET  /api/jobseekers/real-time-interview/result/<id>
//
// Set USE_MOCK = true to develop offline against the mock question bank.
// Real backend is the default so the app just works once the endpoints are up.
// ============================================================================

import {
  practiceInterviewConfigMock,
  skillQuestionBank,
  behavioralQuestions,
  closingQuestions,
} from '@/mocks/jobseeker/aipracticeinterview.mock';

const USE_MOCK = false;                          // flip to true for offline dev
const MOCK_DELAY_MS = 350;
const BASE = '/api/jobseekers/real-time-interview';

/* ── auth ─────────────────────────────────────────────────────────────── */
function getAuthHeader() {
  // The app stores the JWT under `ievalx_token` (login flow via authService.js).
  // `token` is kept as a fallback in case older login paths write to it too.
  const t =
    localStorage.getItem('ievalx_token') ||
    localStorage.getItem('token') ||
    '';
  return t ? { Authorization: `Bearer ${t}` } : {};
}
const jsonHeaders = () => ({ 'Content-Type': 'application/json', ...getAuthHeader() });

/* ── mock helpers (only used when USE_MOCK=true) ──────────────────────── */
const mockReturn = (data, ms = MOCK_DELAY_MS) =>
  new Promise((resolve) => setTimeout(() => resolve(data), ms));

const readFileText = (file) =>
  new Promise((resolve) => {
    if (!file) return resolve('');
    const isTxt = /\.(txt|md)$/i.test(file.name);
    if (!isTxt) return resolve(file.name || '');
    const reader = new FileReader();
    reader.onload = (e) => resolve(String(e.target?.result || ''));
    reader.onerror = () => resolve(file.name || '');
    reader.readAsText(file);
  });

const detectSkillsFromText = (hay) => {
  const src = (hay || '').toLowerCase();
  return Object.keys(skillQuestionBank).filter((kw) => src.includes(kw));
};

const buildMockSequence = (detectedSkills = [], target = 8) => {
  const seq = [behavioralQuestions[0]];
  const pool = detectedSkills.filter((kw) => skillQuestionBank[kw]).slice(0, 3);
  pool.forEach((kw) => { const opts = skillQuestionBank[kw]; if (opts?.length) seq.push(opts[0]); });
  let bIdx = 1;
  while (seq.length < target - 1 && bIdx < behavioralQuestions.length) {
    seq.push(behavioralQuestions[bIdx]); bIdx += 1;
  }
  seq.push(closingQuestions[0]);
  return seq.slice(0, target);
};

/* Strip the {"question":"..."} JSON envelope Groq streams. */
export function cleanQuestion(raw) {
  if (!raw) return '';
  const s = String(raw).replace(/```json|```/g, '').trim();
  const m = s.match(/"question"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (m) { try { return JSON.parse(`"${m[1]}"`); } catch { return m[1]; } }
  return s.replace(/^\s*(question\s*[:\-]\s*)/i, '').trim();
}

/* ────────────────────────────────────────────────────────────────────────
   PUBLIC API
   ──────────────────────────────────────────────────────────────────────── */
const aiPracticeInterviewService = {
  /* Static page config (question count, tips, file limits). */
  getInterviewConfig: async () => {
    // Config lives entirely in the frontend now — no backend call.
    if (USE_MOCK) return mockReturn(practiceInterviewConfigMock);
    return practiceInterviewConfigMock;
  },

  /* Upload the resume → LLM parse → returns {resume_id, parsed, parse_error}. */
  uploadResume: async (file) => {
    if (USE_MOCK) {
      const text = await readFileText(file);
      const detected = detectSkillsFromText(`${text} ${file?.name || ''}`);
      return mockReturn({
        Message: 'OK',
        resume_id: `MOCK-${Date.now()}`,
        parsed: {
          full_name: null,
          headline: 'Mock candidate — set USE_MOCK=false for real parsing',
          years_of_experience: 3,
          skills: detected.length ? detected : ['react', 'javascript', 'python'],
          domains: ['software engineering'],
          experience_count: 2,
          projects_count: 2,
        },
        parse_error: null,
      }, 800);
    }
    const form = new FormData();
    form.append('resume', file);
    const res = await fetch(`${BASE}/upload-resume/`, {
      method: 'POST',
      headers: getAuthHeader(),   // multipart — don't set Content-Type manually
      body: form,
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j.Error || `upload failed (${res.status})`);
    return j;
  },

  /* Build the per-question coverage plan. Returns {plan_id, mode, skills, slots}. */
  buildCoveragePlan: async ({ resume_id, totalQs, mode } = {}) => {
    if (USE_MOCK) {
      const sequence = buildMockSequence(['react', 'python', 'sql'], totalQs);
      return mockReturn({
        Message: 'OK',
        plan_id: `MOCK-PLAN-${Date.now()}`,
        mode: mode || 'smart',
        total_questions: sequence.length,
        skills: ['react', 'javascript', 'python', 'sql', 'aws', 'docker'],
        slots: sequence.map((_, i) => ({
          index: i + 1,
          type: i === 0 ? 'opening' : i === sequence.length - 1 ? 'closing' : 'definition',
          skills: [],
          focus: `question ${i + 1}`,
        })),
      });
    }
    const res = await fetch(`${BASE}/coverage-plan/`, {
      method: 'POST', headers: jsonHeaders(),
      body: JSON.stringify({ resume_id, totalQs, ...(mode ? { mode } : {}) }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j.Error || `plan failed (${res.status})`);
    return j;
  },

  /* Stream the next question. Async iterator yielding raw text chunks.
     Consumer: `for await (const chunk of svc.askStream(payload)) { … }`.  */
  askStream: async function* (payload, { signal } = {}) {
    if (USE_MOCK) {
      // Simulate streaming from the mock sequence: 1 word per 40ms.
      const seq = await this.buildCoveragePlan({ resume_id: 'MOCK', totalQs: payload.totalQs });
      const idx = Math.max(0, (payload.questionNum || 1) - 1);
      const q = buildMockSequence(payload.qas?.map(x => x.skills?.[0]).filter(Boolean) || [], seq.total_questions)[idx];
      const chunks = q.split(/(\s+)/);
      for (const c of chunks) {
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 40));
        if (signal?.aborted) return;
        yield c;
      }
      return;
    }
    let res;
    try {
      res = await fetch(`${BASE}/ask/`, {
        method: 'POST', headers: jsonHeaders(),
        body: JSON.stringify({ ...payload, stream: true }),
        signal,
      });
    } catch (err) {
      // Network — fall back to non-stream POST.
      yield* aiPracticeInterviewService._askNonStream(payload, signal);
      return;
    }
    if (!res.ok || !res.body) {
      yield* aiPracticeInterviewService._askNonStream(payload, signal);
      return;
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let got = false;
    try {
      for (;;) {
        // eslint-disable-next-line no-await-in-loop
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = dec.decode(value, { stream: true });
        if (chunk) { got = true; yield chunk; }
      }
    } finally { try { reader.releaseLock(); } catch { /* noop */ } }
    if (!got) yield* aiPracticeInterviewService._askNonStream(payload, signal);
  },

  _askNonStream: async function* (payload, signal) {
    try {
      const r = await fetch(`${BASE}/ask/`, {
        method: 'POST', headers: jsonHeaders(),
        body: JSON.stringify({ ...payload, stream: false }),
        signal,
      });
      const j = await r.json().catch(() => ({}));
      if (j.question || j.text) yield j.question || j.text;
    } catch { /* noop — caller handles empty stream */ }
  },

  // 🔧 CHANGE 1/1 — saveAnswer: persists one QA pair to MongoDB immediately
  //   after the candidate answers. Called after every question so no data is
  //   lost if the browser crashes before /evaluate/ is reached.
  //
  //   Body shape expected by POST /save-answer/:
  //     { session_id, plan_id, resume_id,
  //       question_num, q, a, skills, type }
  //
  //   Fire-and-forget from the hook (errors are warn-logged, not thrown).
  saveAnswer: async (payload, { signal } = {}) => {
    if (USE_MOCK) {
      return mockReturn({
        Message: 'OK',
        session_id:   payload.session_id,
        question_num: payload.question_num,
      });
    }
    const res = await fetch(`${BASE}/save-answer/`, {
      method: 'POST', headers: jsonHeaders(),
      body: JSON.stringify(payload), signal,
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j.Error || `save-answer failed (${res.status})`);
    return j;
  },

  /* Score the transcript. Returns per-skill proficiency + overall report. */
  evaluate: async (payload, { signal } = {}) => {
    if (USE_MOCK) {
      return mockReturn({
        Message: 'OK',
        attempt_id: Date.now(),
        overall_score: null,
        verdict: null,
        summary: null,
        strengths: [],
        weaknesses: [],
        communication: null,
        technical: null,
        problem_solving: null,
        skills: [
          { skill: 'react',      proficiency: 82, level: 'strong',     source: 'answered',     evidence: 'Explained hooks and reconciliation.', gaps: 'Suspense fuzzy.' },
          { skill: 'javascript', proficiency: 76, level: 'strong',     source: 'answered',     evidence: 'Confident on closures.',              gaps: '' },
          { skill: 'python',     proficiency: 58, level: 'proficient', source: 'answered',     evidence: 'Named GIL correctly.',                gaps: 'No async depth.' },
          { skill: 'sql',        proficiency: 42, level: 'developing', source: 'answered',     evidence: 'Basic joins.',                        gaps: 'No index reasoning.' },
          { skill: 'aws',        proficiency: null, level: 'not_covered', source: 'not_covered', evidence: '', gaps: '' },
          { skill: 'docker',     proficiency: null, level: 'not_covered', source: 'not_covered', evidence: '', gaps: '' },
        ],
      }, 900);
    }
    const res = await fetch(`${BASE}/evaluate/`, {
      method: 'POST', headers: jsonHeaders(),
      body: JSON.stringify(payload), signal,
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j.Error || `evaluate failed (${res.status})`);
    return j;
  },

  /* History list (compact — no transcript). */
  listAttempts: async ({ signal } = {}) => {
    if (USE_MOCK) return mockReturn({ Message: 'OK', Count: 0, Data: [] });
    const res = await fetch(`${BASE}/list/`, { headers: getAuthHeader(), signal });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j.Error || `list failed (${res.status})`);
    return j;
  },

  /* Single attempt with full transcript + skill detail. */
  getResult: async (attemptId, { signal } = {}) => {
    if (USE_MOCK) return mockReturn({ Message: 'OK', Data: null });
    const res = await fetch(`${BASE}/result/${attemptId}`, { headers: getAuthHeader(), signal });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j.Error || `result failed (${res.status})`);
    return j;
  },

  // 🔧 CHANGE 1/1 — deleteAttempts: delete one or more attempts.
  //   Accepts a single id or an array of ids and always normalises to a list,
  //   so it powers both single-select and multi-select delete through ONE
  //   backend route.
  //
  //   Matches the EXISTING Django endpoint (job_seeker_real_time_interview.py):
  //     DELETE /api/jobseekers/real-time-interview/bulk-delete/
  //     Body: { attempt_ids: [<id>, <id>, ...] }
  //     200 → { Message: 'OK', deleted: <count>, attempt_ids: [<owned ids>] }
  //   Ownership is enforced server-side (candidate_id-scoped, IDOR-safe); ids
  //   that don't exist or aren't owned are silently skipped, still 200.
  //
  //   NOTE: a dedicated single-delete route also exists on the backend
  //     (DELETE /delete/<attempt_id>/) — routing everything through bulk keeps
  //     one code path and one response shape ({ deleted: count, attempt_ids }).
  deleteAttempts: async (attemptIds, { signal } = {}) => {
    const ids = (Array.isArray(attemptIds) ? attemptIds : [attemptIds]).filter(
      (x) => x !== undefined && x !== null && x !== '',
    );
    if (!ids.length) return { Message: 'OK', deleted: 0, attempt_ids: [] };
    if (USE_MOCK) {
      return mockReturn({ Message: 'OK', deleted: ids.length, attempt_ids: ids });
    }
    const res = await fetch(`${BASE}/bulk-delete/`, {
      method: 'DELETE', headers: jsonHeaders(),
      body: JSON.stringify({ attempt_ids: ids }), signal,
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j.Error || `delete failed (${res.status})`);
    return j;
  },

  /* Convenience wrapper — deletes a single attempt via the bulk endpoint. */
  deleteAttempt: async (attemptId, opts = {}) =>
    aiPracticeInterviewService.deleteAttempts([attemptId], opts),
// Delete one or more attempts via the bulk endpoint.
  // Accepts a single id or an array; always resolves — never throws.
  deleteAttempts: async (attemptIds, { signal } = {}) => {
    const ids = (Array.isArray(attemptIds) ? attemptIds : [attemptIds])
      .filter((x) => x !== undefined && x !== null && x !== '');
    if (!ids.length) return { Message: 'OK', deleted: 0, attempt_ids: [] };
    if (USE_MOCK) return mockReturn({ Message: 'OK', deleted: ids.length, attempt_ids: ids });
    const res = await fetch(`${BASE}/bulk-delete/`, {
      method: 'DELETE', headers: jsonHeaders(),
      body: JSON.stringify({ attempt_ids: ids }), signal,
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j.Error || `delete failed (${res.status})`);
    return j;
  },

  deleteAttempt: async (attemptId, opts = {}) =>
    aiPracticeInterviewService.deleteAttempts([attemptId], opts),

  /* Kept for backwards-compatibility with any callers still using the old API. */
  parseResume: async (file) => aiPracticeInterviewService.uploadResume(file),
  generateQuestions: async ({ target } = {}) => {
    // Legacy shim — returns a mock sequence so old code paths don't crash.
    return { sequence: buildMockSequence(['react', 'python'], target) };
  },
  submitSession: async (payload) => aiPracticeInterviewService.evaluate(payload),
};

export default aiPracticeInterviewService;