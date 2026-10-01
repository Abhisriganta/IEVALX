

import { useState, useEffect, useCallback, useRef } from 'react';
import analyticsService from '@/services/api/company/analyticsService';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';

// ── normalise helpers ──────────────────────────────────────────────────────

function normaliseOverview(raw = {}) {
  const sc = raw.stats_cards || {};
  return {
    statsCards: {
      total_jobs_posted:      sc.total_jobs_posted      ?? 0,
      total_applications:     sc.total_applications     ?? 0,
      active_jobs:            sc.active_jobs            ?? 0,
      avg_applicants_per_job: sc.avg_applicants_per_job ?? 0,
    },
    // Backend: [{month, applications, jobs_posted, live_jobs}]
    // Chart needs: [{month, applications, jobs, live}]
    trend: (raw.trend || []).map((t) => ({
      month:        t.month,
      applications: t.applications ?? 0,
      jobs:         t.jobs_posted  ?? 0,
      live:         t.live_jobs    ?? 0,
    })),
    // Backend: [{stage, count, pct}]
    funnelData: (raw.hiring_funnel || []).map((f) => ({
      stage: f.stage,
      count: f.count ?? 0,
      rate:  f.pct   ?? 0,
      color: null,   // filled in component
    })),
    // Backend: [{department, jobs, applicants}]
    // Chart needs: [{name, jobs, applicants}]
    deptData: (raw.by_department || []).map((d) => ({
      name:       d.department ?? 'Unspecified',
      jobs:       d.jobs       ?? 0,
      applicants: d.applicants ?? 0,
    })),
    // Backend: [{department, count}] for pie
    jobsByDept: (raw.jobs_by_dept || []).map((d) => ({
      name: d.department ?? 'Unspecified',
      jobs: d.count      ?? 0,
    })),
  };
}

function normaliseApplicants(raw = {}) {
  const sc = raw.stats_cards || {};
  const skills = (raw.top_skills || []);
  const maxCnt  = skills[0]?.count || 1;
  return {
    statsCards: {
      total_applications:  sc.total_applications  ?? 0,
      candidates_in_pool:  sc.candidates_in_pool  ?? 0,
      avg_candidate_score: sc.avg_candidate_score ?? 0,
      shortlist_rate:      sc.shortlist_rate       ?? 0,
    },
    // Backend: [{range, count}]  → chart wants {range, candidates}
    scoreDist: (raw.score_distribution || []).map((b) => ({
      range:      b.range ?? '',
      candidates: b.count ?? 0,
    })),
    // Backend: [{skill, count}]  → add pct for progress bar
    topSkills: skills.map((s) => ({
      skill: s.skill,
      count: s.count ?? 0,
      pct:   Math.round(((s.count ?? 0) / maxCnt) * 100),
    })),
    // Backend: [{department, count}]  → chart wants {name, applicants}
    deptData: (raw.by_department || []).map((d) => ({
      name:       d.department ?? 'Unspecified',
      applicants: d.count      ?? 0,
    })),
  };
}

function normaliseJobs(raw = {}) {
  const sc = raw.stats_cards || {};
  const qs = raw.quick_stats  || {};
  return {
    statsCards: {
      active_jobs:    sc.active_jobs    ?? 0,
      total_postings: sc.total_postings ?? 0,
      departments:    sc.departments    ?? 0,
      job_fill_rate:  sc.job_fill_rate  ?? 0,
    },
    quickStats: {
      total_jobs:       qs.total_jobs       ?? 0,
      active_jobs:      qs.active_jobs      ?? 0,
      pending_approval: qs.pending_approval ?? 0,
      flagged_jobs:     qs.flagged_jobs     ?? 0,
      total_applicants: qs.total_applicants ?? 0,
      busiest_dept:     qs.busiest_dept     ?? '—',
    },
    // Backend: [{status, count}]
    statusData: (raw.jobs_by_status || []).map((s) => ({
      stage: s.status ?? '',
      count: s.count  ?? 0,
      rate:  0,        // computed below
    })),
    // Backend: [{department, jobs, applicants}] → chart needs {name, ...}
    deptData: (raw.by_department || []).map((d) => ({
      name:       d.department ?? 'Unspecified',
      jobs:       d.jobs       ?? 0,
      applicants: d.applicants ?? 0,
    })),
  };
}

function normaliseEmployers(raw = {}) {
  const sc = raw.stats_cards || {};
  return {
    statsCards: {
      total_employers:    sc.total_employers    ?? 0,
      active_employers:   sc.active_employers   ?? 0,
      inactive_employers: sc.inactive_employers ?? 0,
      pending_employers:  sc.pending_employers  ?? 0,
    },
    byRole: (raw.by_role || []),
    // workload → same shape as employerPerf in old component
    workload: (raw.workload || []).map((e) => ({
      id:         e.id,
      name:       e.name        ?? '—',
      role:       e.role        ?? '—',
      status:     e.status,
      jobs:       e.active_jobs ?? 0,
      applicants: e.total_apps  ?? 0,
      avatar:     (e.name || '?').split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase(),
      photo:      e.photo_url || null,   // presigned S3 URL from backend, else null
    })),
    topPerformers: (raw.top_performers || []),
  };
}

// ── hook ───────────────────────────────────────────────────────────────────

const useCompanyAnalytics = (range = 'all') => {
  const [overview,   setOverview]   = useState(null);
  const [applicants, setApplicants] = useState(null);
  const [jobs,       setJobs]       = useState(null);
  const [employers,  setEmployers]  = useState(null);

  const [loadingOv,  setLoadingOv]  = useState(true);
  const [loadingAp,  setLoadingAp]  = useState(true);
  const [loadingJb,  setLoadingJb]  = useState(true);
  const [loadingEmp, setLoadingEmp] = useState(true);

  const [errors, setErrors] = useState({});

  // Use a ref so stale closures don't re-fetch on every render
  const rangeRef = useRef(range);
  useEffect(() => { rangeRef.current = range; }, [range]);

  const fetchOverview = useCallback(async (r) => {
    setLoadingOv(true);
    try {
      const res = await analyticsService.getOverview(r);
      setOverview(normaliseOverview(res.data));
      setErrors((prev) => ({ ...prev, overview: null }));
    } catch (e) {
      setErrors((prev) => ({ ...prev, overview: e?.message || 'Failed to load overview' }));
    } finally { setLoadingOv(false); }
  }, []);

  const fetchApplicants = useCallback(async (r) => {
    setLoadingAp(true);
    try {
      const res = await analyticsService.getApplicants(r);
      setApplicants(normaliseApplicants(res.data));
      setErrors((prev) => ({ ...prev, applicants: null }));
    } catch (e) {
      setErrors((prev) => ({ ...prev, applicants: e?.message || 'Failed to load applicants' }));
    } finally { setLoadingAp(false); }
  }, []);

  const fetchJobs = useCallback(async (r) => {
    setLoadingJb(true);
    try {
      const res = await analyticsService.getJobs(r);
      // compute statusData rates after normalise
      const norm = normaliseJobs(res.data);
      const total = norm.statusData.reduce((s, d) => s + d.count, 0) || 1;
      norm.statusData = norm.statusData.map((d) => ({
        ...d,
        rate: Math.round((d.count / total) * 100),
      }));
      setJobs(norm);
      setErrors((prev) => ({ ...prev, jobs: null }));
    } catch (e) {
      setErrors((prev) => ({ ...prev, jobs: e?.message || 'Failed to load jobs data' }));
    } finally { setLoadingJb(false); }
  }, []);

  const fetchEmployers = useCallback(async () => {
    setLoadingEmp(true);
    try {
      const res = await analyticsService.getEmployers();
      setEmployers(normaliseEmployers(res.data));
      setErrors((prev) => ({ ...prev, employers: null }));
    } catch (e) {
      setErrors((prev) => ({ ...prev, employers: e?.message || 'Failed to load employers' }));
    } finally { setLoadingEmp(false); }
  }, []);

  // Fetch range-sensitive tabs when range changes
  useEffect(() => {
    fetchOverview(range);
    fetchApplicants(range);
    fetchJobs(range);
  }, [range, fetchOverview, fetchApplicants, fetchJobs]);

  // Employers tab doesn't have a range filter — load once
  useEffect(() => { fetchEmployers(); }, [fetchEmployers]);
  useRefetchOnFocus(fetchEmployers);

  const refresh = useCallback(() => {
    const r = rangeRef.current;
    fetchOverview(r);
    fetchApplicants(r);
    fetchJobs(r);
    fetchEmployers();
  }, [fetchOverview, fetchApplicants, fetchJobs, fetchEmployers]);

  return {
    overview,   loadingOv,
    applicants, loadingAp,
    jobs,       loadingJb,
    employers,  loadingEmp,
    errors,
    loading: loadingOv || loadingAp || loadingJb || loadingEmp,
    refresh,
  };
};

export { useCompanyAnalytics };
export default useCompanyAnalytics;