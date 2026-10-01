import { interviewAPI } from './candidateService';
import jobseekerService from '../jobseeker/jobseekerService';
import axiosInstance from '../axiosInstance';

// ─── Helpers ─────────────────────────────────────────────────────────────
const _daysWaiting = (dateStr) => {
  if (!dateStr) return 0;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
};

const _daysUntil = (dateStr) => {
  if (!dateStr) return null;
  return Math.max(0, Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
};


const _prettifyEmailAsName = (email) => {
  if (!email || typeof email !== 'string') return '';
  const local = email.split('@')[0] || '';
  if (!local) return '';
  return local
    .replace(/[._-]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
};

// Normalise a single row from GET /interviews/pool/<pid>/ into the shape
// the pending-candidate UI expects. Injects photo URL + waiting metrics.
const _normalisePoolRow = (row, proc) => {
  const cid = row.candidate_id;
  return {
    candidate_id:     cid,
    // BUILD: 2026-09-11-name-from-email-v1
    full_name:        row.candidate_name || _prettifyEmailAsName(row.candidate_email) || `Candidate ${cid}`,
    email:            row.candidate_email || '',
    photo_url:        jobseekerService.photoUrlFor(cid),
    location:         null,
    experience_years: null,
    skills:           [],
    // process context — needed by hire / reject buttons.
    job_id:           proc.job_id ?? proc.id,
    job_title:        proc.job_title || '',
    process_id:       proc.id,
    total_rounds:     proc.rounds_count || row.total_rounds || 1,
    round_number:     row.round_number  || row.total_rounds || 1,
    rounds:           [],
    // scores.
    cgps_score:       row.cgps_score ?? null,
    overall_cps:      row.cgps_score ?? null,
    rank:             row.rank ?? null,
    // pool bucket — 'awaiting' | 'hired' | 'rejected'.
    pool_state:       row.pool_state || '',
    pool_type:        row.pool_type  || '',
    // timing.
    completed_date:   row.decided_at || null,
    daysWaiting:      _daysWaiting(row.decided_at),
    daysUntilExpiry:  _daysUntil(row.expires_at),
    expires_at:       row.expires_at  || null,
    recalled_at:      row.recalled_at || null,
    application_date: row.application_date || null,
    status:           row.status || '',
  };
};

// Guard state — remember whether we've already warned about a missing
// backend patch so the console shows ONE clear message instead of dozens
// of raw axios 404 stack-traces.
let _warnedAboutMissingBackend = false;

// Aggregates across every active process. `state` = 'awaiting' | 'hired' |
// 'rejected' | 'all'. Silent per-process failure — one broken process
// never blocks the rest.
const _fetchPool = async (state = 'all') => {
  const procRes  = await interviewAPI.getProcesses({ is_active: true });
  const processes = procRes.data?.results || procRes.data || [];
  if (!processes.length) return [];

  const settled = await Promise.allSettled(
    processes.map(async (proc) => {
      const res = await axiosInstance.get(
        `/employer/interviews/pool/${proc.id}/`,
        { params: { state } },
      );
      const rows = Array.isArray(res.data) ? res.data : (res.data?.results || []);
      return rows.map(row => _normalisePoolRow(row, proc));
    }),
  );

  // If EVERY per-process fetch failed with a 404, the backend patch
  // almost certainly hasn't been deployed. Log a single actionable
  // warning so the console is readable, then keep going with an empty
  // list so the UI stays usable.
  const rejects = settled.filter(r => r.status === 'rejected');
  const all404  = rejects.length === settled.length
    && rejects.every(r => r.reason?.response?.status === 404);
  if (all404 && !_warnedAboutMissingBackend) {
    _warnedAboutMissingBackend = true;
    // eslint-disable-next-line no-console
    console.warn(
      '[pendingCandidateService] All /interviews/pool/ endpoints returned 404. ' +
      'The backend patch (patch_interview_results.py + makemigrations + migrate + restart) ' +
      'is probably not deployed yet. Pending Candidates will be empty until the backend is updated.',
    );
  } else if (rejects.length && rejects.length < settled.length) {
    // Partial failures — reset the "all-404" latch so future calls can
    // re-detect a total outage if it happens.
    _warnedAboutMissingBackend = false;
  }

  return settled
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value);
};

// ─── Service ─────────────────────────────────────────────────────────────
const pendingCandidateService = {

  // Awaiting Hire pool — candidates who Approved through the Final round
  // and are waiting for the employer's Hire or Reject decision.
  getPendingCandidates: async (params = {}) => {
    let rows = await _fetchPool('awaiting');
    if (params.job_id && params.job_id !== 'all') {
      rows = rows.filter(c => String(c.job_id) === String(params.job_id));
    }
    return { data: rows };
  },

  // Pool-rejected candidates — rejected FROM the awaiting-hire pool.
  // Intentionally separate from round-level rejections (which live on
  // FinalHire → Rejected in Final).
  getRejectedCandidates: async (params = {}) => {
    let rows = await _fetchPool('rejected');
    if (params.job_id && params.job_id !== 'all') {
      rows = rows.filter(c => String(c.job_id) === String(params.job_id));
    }
    return { data: rows };
  },

  // Confirmed hires from the pool. Mirrored on the Final Hire → Hired list.
  getHiredCandidates: async (params = {}) => {
    let rows = await _fetchPool('hired');
    if (params.job_id && params.job_id !== 'all') {
      rows = rows.filter(c => String(c.job_id) === String(params.job_id));
    }
    return { data: rows };
  },

  // Job list for the filter dropdown — derived from whatever we already
  // pulled for the current tab so the dropdown never lists a job the
  // user could not filter to.
  getJobs: async () => {
    const procRes = await interviewAPI.getProcesses({ is_active: true });
    const processes = procRes.data?.results || procRes.data || [];
    const jobs = [];
    const seen = new Set();
    processes.forEach(p => {
      const jid = p.job_id ?? p.id;
      if (jid != null && !seen.has(jid)) {
        seen.add(jid);
        jobs.push({ id: jid, title: p.job_title || `Job ${jid}` });
      }
    });
    return { data: jobs };
  },

  // Confirm hire from the pool → POST /interviews/pool/<pid>/candidate/<cid>/hire/.
  // Backend flips pool_type='pool_hired' and creates a HiringRecord.
  hireCandidate: async (candidateId, payload = {}) => {
    const { process_id } = payload;
    return axiosInstance.post(
      `/employer/interviews/pool/${Number(process_id)}/candidate/${Number(candidateId)}/hire/`,
    );
  },

  // Reject from pool → POST /interviews/pool/<pid>/candidate/<cid>/reject/.
  // Backend flips pool_type='pool_rejected'. Crucially this does NOT
  // touch CRS.status, so the row never leaks into the round-level
  // Rejected filter or the Final Hire → Rejected list.
  rejectCandidate: async (candidateId, payload = {}) => {
    const { process_id } = payload;
    return axiosInstance.post(
      `/employer/interviews/pool/${Number(process_id)}/candidate/${Number(candidateId)}/reject/`,
    );
  },

  rescheduleCandidate: async (candidateId, payload = {}) => {
    const { process_id, interview_type, interview_name, round_number, window_start, window_end } = payload;
    return interviewAPI.recallPendingCandidates(process_id, {
      candidate_ids:  [Number(candidateId)],
      interview_type,
      interview_name,
      round_number:   Number(round_number),
      window_start,
      window_end,
    });
  },

  // Detail lookup — derive from whichever list contains the candidate.
  getCandidateDetail: async (candidateId) => {
    for (const fetcher of [
      pendingCandidateService.getPendingCandidates,
      pendingCandidateService.getHiredCandidates,
      pendingCandidateService.getRejectedCandidates,
    ]) {
      const all = await fetcher();
      const c = (all.data || []).find(x => String(x.candidate_id) === String(candidateId));
      if (c) return { data: c };
    }
    throw new Error('Candidate not found');
  },

  hideCandidates: async (items) =>
    axiosInstance.post('/employer/interviews/pending/hide/', { items }),
  unhideCandidates: async (items) =>
    axiosInstance.post('/employer/interviews/pending/unhide/', { items }),
};

export default pendingCandidateService;