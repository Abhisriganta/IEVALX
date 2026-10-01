// ============================================================================
// publicJobsService.js
// Live data layer for every PUBLIC page: landing Industry tiles / Feature
// Jobs, /jobs (Browse), /categories (industries page), /jobs/:id (Detail)
// and the MegaNav job count.
//
// GROUPING DIMENSION — INDUSTRY TYPE:
// The derived-category classifier is REMOVED. Jobs are grouped by the
// employer-entered Industry Type (`industry_preference` on the posting
// form), which every job row already carries. Because it is free text,
// grouping is case-insensitive after whitespace normalisation, and each
// bucket displays the casing employers used most often. Blank industry
// falls into an "Other" bucket. The exact same algorithm runs on the
// backend (GET /api/jobs/industries) — this file only re-derives it as a
// fallback when that endpoint isn't deployed yet.
//
// Backend routes used (all PUBLIC — PUBLISHED + APPROVED jobs only):
//   GET /api/jobs/list?viewer_role=JOBSEEKER  → { Total_Jobs, Jobs:[…] }
//   GET /api/jobs/industries                  → { Total_Jobs, Industries:[…] }
//   GET /api/jobs/<id>?viewer_role=JOBSEEKER  → full job + benefits
// Reached through the Vite proxy as /api/js/jobs/… (rewritten to /api/jobs/…
// on the Django server at :8025), so axiosInstance paths are '/js/jobs/…'.
// ============================================================================

import { useEffect, useState } from 'react';
import api from '@/services/api/axiosInstance';

/* ── Industry normalisation (MUST mirror job_post.py _clean_industry) ──── */
export const OTHER_INDUSTRY = 'Other';

/** Trim + collapse internal whitespace. '' for null/blank. */
export const cleanIndustry = (v) =>
  v == null ? '' : String(v).split(/\s+/).filter(Boolean).join(' ');

/** Case-insensitive bucket key for an industry display name. */
export const industryKeyOf = (name) => cleanIndustry(name).toLowerCase();

/* ── Presentation helpers ──────────────────────────────────────────────── */

// Deterministic avatar color per company.
// Sage/earth avatar family — matches the public sage system (no blues).
const AVATAR_PALETTE = ['#7F9E7E', '#6C8B6B', '#4F6F52', '#A3B18A', '#C08A5B', '#4B9E9A'];
export const companyColor = (name) => {
  const s = String(name || '?');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
};

export const companyInitials = (name) => {
  const parts = String(name || '?').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// Salary values may be stored as absolute rupees (e.g. 1400000) or already
// as LPA (e.g. 14) depending on which form posted the job. Normalise to LPA.
const toLpa = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n >= 10000 ? n / 100000 : n;
};
const fmtLpa = (n) => {
  if (n == null) return null;
  const r = Math.round(n * 10) / 10;
  return String(r);
};
const salaryLabel = (lo, hi, backendDisplay) => {
  if (lo != null && hi != null) return `₹${fmtLpa(lo)} – ${fmtLpa(hi)} LPA`;
  if (lo != null) return `₹${fmtLpa(lo)}+ LPA`;
  if (hi != null) return `Up to ₹${fmtLpa(hi)} LPA`;
  return backendDisplay || 'Not disclosed';
};

// Experience band — must emit the exact EXPERIENCE_OPTIONS strings the
// search bar / filter rail use (note the en-dash "–").
export const EXPERIENCE_BANDS = ['Fresher', '1–3 years', '3–5 years', '5–10 years', '10+ years'];
const expBand = (min, max) => {
  const lo = Number(min);
  const hi = Number(max);
  const loOk = Number.isFinite(lo);
  const hiOk = Number.isFinite(hi);
  if (!loOk && !hiOk) return 'Fresher';
  const start = loOk ? lo : 0;
  if (start >= 10) return '10+ years';
  if (start >= 5)  return '5–10 years';
  if (start >= 3)  return '3–5 years';
  if (start >= 1)  return '1–3 years';
  return hiOk && hi >= 2 ? '1–3 years' : 'Fresher';
};

const parseTs = (s) => {
  if (!s) return null;
  const d = new Date(String(s).replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? null : d;
};
const daysAgoFrom = (createdAt) => {
  const d = parseTs(createdAt);
  if (!d) return 0;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
};
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const postedDateLabel = (createdAt) => {
  const d = parseTs(createdAt);
  if (!d) return '';
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

const csvToList = (v) => {
  if (Array.isArray(v)) return v.filter(Boolean).map((x) => String(x).trim()).filter(Boolean);
  if (!v) return [];
  return String(v).split(',').map((x) => x.trim()).filter(Boolean);
};

/* ── Backend row → public card shape ──────────────────────────────────────
   { id, title, co, initials, color, logoUrl, loc, type, exp, expDisplay,
     sal, salMin, salMax, industry, industryKey, skills, daysAgo, date,
     desc, applicants, daysLeft, workMode, openings, raw }                  */
export function mapPublicJob(j) {
  if (!j) return null;

  const skills   = j.skills && j.skills.length ? j.skills : csvToList(j.required_skills);
  const co       = j.company_name || 'Verified Employer';
  const salMin   = toLpa(j.salary_min);
  const salMax   = toLpa(j.salary_max);

  // Industry Type — the grouping dimension. Blank → "Other".
  const industry = cleanIndustry(j.industry_preference) || OTHER_INDUSTRY;

  return {
    id:        j.id,
    title:     j.job_title || 'Untitled role',
    co,
    initials:  companyInitials(co),
    color:     companyColor(co),
    logoUrl:   j.company_logo_url || null,

    loc:       j.job_city || j.job_location || '—',
    type:      j.job_type || 'Full-time',
    workMode:  j.work_mode_display || j.work_mode || null,

    exp:        expBand(j.experience_min, j.experience_max),
    expDisplay: j.experience_display || expBand(j.experience_min, j.experience_max),

    sal:    salaryLabel(salMin, salMax, j.salary_display),
    salMin: salMin ?? 0,
    salMax: salMax ?? salMin ?? 0,

    industry,
    industryKey: industry.toLowerCase(),

    skills,

    daysAgo: daysAgoFrom(j.created_at),
    date:    postedDateLabel(j.created_at),

    desc: j.job_description_snippet || j.job_description || '',

    applicants: Number(j.applicants || 0),
    daysLeft:   j.days_left ?? null,
    openings:   j.openings ?? null,

    raw: j,
  };
}

/* ── Fetch + cache (single-flight, short TTL) ─────────────────────────── */
const CACHE_TTL_MS = 2 * 60 * 1000;
let _cache = null;
let _cacheAt = 0;
let _inflight = null;

export async function fetchPublicJobs({ force = false } = {}) {
  const fresh = _cache && Date.now() - _cacheAt < CACHE_TTL_MS;
  if (fresh && !force) return _cache;
  if (_inflight && !force) return _inflight;

  _inflight = api
    .get('/js/jobs/list', { params: { viewer_role: 'JOBSEEKER' } })
    .then((res) => {
      const jobs = (res.data?.Jobs || []).map(mapPublicJob).filter(Boolean);
      _cache = jobs;
      _cacheAt = Date.now();
      return jobs;
    })
    .finally(() => { _inflight = null; });

  return _inflight;
}

export function invalidatePublicJobsCache() {
  _cache = null;
  _cacheAt = 0;
}

/* ── Single job detail (full description + benefits) ─────────────────── */
export async function fetchPublicJobDetail(jobId) {
  const res = await api.get(`/js/jobs/${jobId}`, { params: { viewer_role: 'JOBSEEKER' } });
  const j = res.data;
  const card = mapPublicJob(j);
  if (!card) return null;

  // Benefits arrive as { category: [names…] } (or list) — flatten to strings.
  const perks = [];
  const b = j.benefits;
  if (Array.isArray(b)) {
    for (const item of b) {
      if (typeof item === 'string') perks.push(item);
      else if (item && item.benefit_name) perks.push(item.benefit_name);
    }
  } else if (b && typeof b === 'object') {
    for (const v of Object.values(b)) {
      if (Array.isArray(v)) for (const name of v) { if (name) perks.push(String(name)); }
      else if (v) perks.push(String(v));
    }
  }

  return {
    ...card,
    desc:             j.job_description || card.desc,
    responsibilities: j.responsibilities && j.responsibilities.length
                        ? j.responsibilities
                        : csvToList(j.roles_responsibilities),
    education:        j.education_requirements || null,
    additional:       j.additional_requirements || null,
    languages:        j.languages && j.languages.length ? j.languages : csvToList(j.language),
    deadline:         j.application_deadline || null,
    perks,
  };
}

/* ── INDUSTRY BUCKETS ──────────────────────────────────────────────────────
   Local derivation — the SAME algorithm List_Job_Industries runs on the
   server: case-insensitive grouping, majority-casing display names, count
   desc (name asc on ties), "Other" always last.                            */
export function industryBuckets(jobs) {
  const counts  = {};   // key -> count
  const casings = {};   // key -> { displayVariant: occurrences }
  for (const j of jobs || []) {
    const key = j.industryKey;
    counts[key] = (counts[key] || 0) + 1;
    const variants = casings[key] || (casings[key] = {});
    variants[j.industry] = (variants[j.industry] || 0) + 1;
  }
  const out = Object.keys(counts).map((key) => {
    const display = Object.entries(casings[key])
      .sort((a, b) => (b[1] - a[1]) || (a[0] < b[0] ? -1 : 1))[0][0];
    return { name: display, count: counts[key] };
  });
  out.sort((a, b) => {
    const ao = a.name.toLowerCase() === OTHER_INDUSTRY.toLowerCase();
    const bo = b.name.toLowerCase() === OTHER_INDUSTRY.toLowerCase();
    if (ao !== bo) return ao ? 1 : -1;                 // Other last
    if (b.count !== a.count) return b.count - a.count; // count desc
    return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1;
  });
  return out;
}

/** Industry display names present in a job list (for the filter rail). */
export function uniqueIndustries(jobs) {
  return industryBuckets(jobs).map((b) => b.name);
}

/* ── BACKEND-DRIVEN INDUSTRIES ─────────────────────────────────────────────
   GET /api/jobs/industries (proxy: /js/jobs/industries) is the source of
   truth. Fallback: derive locally from the cached jobs list with the same
   algorithm, so the UI keeps working while the backend deploy catches up.  */
let _indCache = null;
let _indCacheAt = 0;
let _indInflight = null;

export async function fetchPublicIndustries({ force = false } = {}) {
  const fresh = _indCache && Date.now() - _indCacheAt < CACHE_TTL_MS;
  if (fresh && !force) return _indCache;
  if (_indInflight && !force) return _indInflight;

  _indInflight = api
    .get('/jobs/industries')
    .then((res) => {
      const list = Array.isArray(res.data?.Industries) ? res.data.Industries : null;
      if (!list) throw new Error('Malformed industries response');
      const result = {
        industries: list.map((d) => ({ name: d.name, count: Number(d.count) || 0 })),
        total: Number(res.data?.Total_Jobs) || 0,
        source: 'backend',
      };
      _indCache = result;
      _indCacheAt = Date.now();
      return result;
    })
    .catch(async (err) => {
      // Endpoint missing (backend not redeployed yet) → derive locally.
      console.warn('[publicJobsService] /jobs/industries unavailable, deriving locally:', err?.message);
      const jobs = await fetchPublicJobs();
      const result = { industries: industryBuckets(jobs), total: jobs.length, source: 'derived' };
      _indCache = result;
      _indCacheAt = Date.now();
      return result;
    })
    .finally(() => { _indInflight = null; });

  return _indInflight;
}

export function invalidatePublicIndustriesCache() {
  _indCache = null;
  _indCacheAt = 0;
}

/* ── Derived collections ─────────────────────────────────────────────── */
export function uniqueLocations(jobs) {
  return [...new Set((jobs || []).map((j) => j.loc).filter((l) => l && l !== '—'))].sort();
}

const TYPE_ORDER = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance'];
export function uniqueJobTypes(jobs) {
  const present = [...new Set((jobs || []).map((j) => j.type).filter(Boolean))];
  return present.sort((a, b) => {
    const ia = TYPE_ORDER.indexOf(a); const ib = TYPE_ORDER.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
}

// Top skills across live jobs → "Popular:" chips on /jobs. Static fallback
// keeps the strip useful before the first job is ever published.
const POPULAR_FALLBACK = ['React', 'Data Scientist', 'Product Manager', 'Remote', 'Fresher', 'DevOps'];
export function popularSearches(jobs, limit = 6) {
  if (!jobs || jobs.length === 0) return POPULAR_FALLBACK;
  const freq = {};
  for (const j of jobs) for (const s of j.skills) freq[s] = (freq[s] || 0) + 1;
  const top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([s]) => s);
  return top.length ? top : POPULAR_FALLBACK;
}

export const SALARY_BANDS = [
  { label: '0 – 10 LPA',  min: 0,  max: 10 },
  { label: '10 – 20 LPA', min: 10, max: 20 },
  { label: '20+ LPA',     min: 20, max: 9999 },
];

/* ── React hooks ─────────────────────────────────────────────────────── */

/** All published jobs. StrictMode-safe (closure `cancelled` flag). */
export function usePublicJobs() {
  const [jobs, setJobs]       = useState(() => _cache || null);
  const [loading, setLoading] = useState(() => !_cache);
  const [error, setError]     = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(!_cache);
    fetchPublicJobs()
      .then((list) => { if (!cancelled) { setJobs(list); setError(null); setLoading(false); } })
      .catch((err) => {
        if (!cancelled) {
          console.error('[publicJobsService] list fetch failed:', err);
          setJobs([]); setError(err); setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  const reload = () => {
    invalidatePublicJobsCache();
    setLoading(true);
    return fetchPublicJobs()
      .then((list) => { setJobs(list); setError(null); setLoading(false); return list; })
      .catch((err) => { setJobs([]); setError(err); setLoading(false); throw err; });
  };

  return { jobs, loading, error, reload };
}

/** Backend industry list with live counts. StrictMode-safe. */
export function usePublicIndustries() {
  const [data, setData]       = useState(() => _indCache || null);
  const [loading, setLoading] = useState(() => !_indCache);
  const [error, setError]     = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(!_indCache);
    fetchPublicIndustries()
      .then((d) => { if (!cancelled) { setData(d); setError(null); setLoading(false); } })
      .catch((err) => {
        if (!cancelled) {
          console.error('[publicJobsService] industries fetch failed:', err);
          setData({ industries: [], total: 0, source: 'error' });
          setError(err); setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  return {
    industries: data ? data.industries : [],
    total:      data ? data.total : 0,
    source:     data ? data.source : null,
    loading,
    error,
  };
}

/** Single job detail. StrictMode-safe. `reload()` refetches after a network
 *  failure (used by the Connection-lost screen's Try again). */
export function usePublicJobDetail(jobId) {
  const [job, setJob]         = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNF]     = useState(false);
  const [error, setError]     = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (jobId == null) return undefined;
    let cancelled = false;
    setJob(null); setLoading(true); setNF(false); setError(null);

    fetchPublicJobDetail(jobId)
      .then((d) => { if (!cancelled) { setJob(d); setLoading(false); } })
      .catch((err) => {
        if (cancelled) return;
        if (err?.response?.status === 404) setNF(true);
        else {
          console.error('[publicJobsService] detail fetch failed:', err);
          setError(err);
        }
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [jobId, attempt]);

  const reload = () => setAttempt((a) => a + 1);

  return { job, loading, notFound, error, reload };
}