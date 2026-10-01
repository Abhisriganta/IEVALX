import { useState, useEffect, useCallback } from 'react';
import adminService from '@/services/api/company/adminService';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';

// ── action_type → visual type used by the activity renderer ───────────────
const ACT_TYPE_MAP = {
  JOB_APPROVED:          'success',
  JOB_POSTED:            'info',
  JOB_PUBLISHED:         'info',
  JOB_UPDATED:           'info',
  JOB_CLOSED:            'error',
  JOB_REJECTED:          'error',
  JOB_DELETED:           'error',
  JOB_UNPUBLISHED:       'info',
  CANDIDATE_SHORTLISTED: 'success',
  CANDIDATE_SELECTED:    'success',
  CANDIDATE_REJECTED:    'error',
  INTERVIEW_SCHEDULED:   'info',
  INTERVIEW_COMPLETED:   'success',
  EMPLOYEE_ADDED:        'info',
  EMPLOYEE_REMOVED:      'error',
  EMPLOYEE_ROLE_CHANGED: 'info',
  PROFILE_UPDATED:       'info',
  PERMISSION_UPDATED:    'info',
  TALENT_POOL_ADDED:     'info',
  TALENT_POOL_REMOVED:   'error',
  REPORT_EXPORTED:       'info',
};

// Convert snake_case action type → human-readable title
// e.g. "JOB_APPROVED" → "Job Approved"
const toTitle = (str) =>
  (str || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

// ── normalise raw API response → shapes the component already expects ─────
function normalise(raw, fallbackUser) {
  // ── verification status (live from DB, falls back to login-time value) ──
  const verificationStatus =
    raw?.verification_status ||
    fallbackUser?.verification_status ||
    'PENDING';

  // ── employers list: backend returns 'name', component expects 'full_name' ─
  const employers = (raw?.hiring_team || []).map((m) => ({
    id:          m.id,
    full_name:   m.name,          // alias for the existing template
    email:       m.email,
    role:        m.role,
    status:      m.status,
    active_jobs: m.active_jobs,
    photo:       m.photo_url || null,   // presigned S3 URL, else null
  }));

  // ── job stats ─────────────────────────────────────────────────────────────
  const jobStats = {
    active: raw?.stats?.active_job_posts ?? 0,
    total:  raw?.stats?.total_job_posts  ?? 0,
  };

  // ── activity: map new shape → {id, type, message, detail, time} ──────────
  const activity = (raw?.recent_activity || []).map((a) => ({
    id:      a.id,
    type:    ACT_TYPE_MAP[a.action_type] || 'info',
    message: toTitle(a.action_type),
    detail:  a.description || '',
    time:    a.performed_at,
  }));

  // ── data blob (same keys the component's existing logic reads) ────────────
  const data = {
    monthly_usage:   raw?.stats?.ai_used_pct ?? 0,
    plan:            raw?.plan?.plan_name    ?? '—',
    plan_renews_in:  raw?.plan?.renews_in    ?? 0,
    activity,
  };

  return { verificationStatus, employers, jobStats, data };
}

// ── hook ──────────────────────────────────────────────────────────────────
const useCompanyDashboard = () => {
  const [loading,            setLoading]            = useState(true);
  const [error,              setError]              = useState(null);
  const [verificationStatus, setVerificationStatus] = useState('PENDING');
  const [data,               setData]               = useState(null);
  const [employers,          setEmployers]          = useState([]);
  const [jobStats,           setJobStats]           = useState({ active: 0, total: 0 });

  // Read the login-time user object for fallback verification status
  const fallbackUser = (() => {
    try { return JSON.parse(localStorage.getItem('ievalx_user') || '{}'); }
    catch { return {}; }
  })();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminService.getDashboard();
      const { verificationStatus: vs, employers: emps, jobStats: js, data: d } =
        normalise(res.data, fallbackUser);
      setVerificationStatus(vs);
      setEmployers(emps);
      setJobStats(js);
      setData(d);
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.Error ||
        err?.message ||
        'Failed to load dashboard';
      setError(msg);
      // Keep empty defaults so the component doesn't crash
      setData({ monthly_usage: 0, plan: '—', plan_renews_in: 0, activity: [] });
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);
  useRefetchOnFocus(load);

  return {
    loading,
    error,
    verificationStatus,
    data,
    employers,
    jobStats,
    refresh: load,
  };
};

export { useCompanyDashboard };
export default useCompanyDashboard;
