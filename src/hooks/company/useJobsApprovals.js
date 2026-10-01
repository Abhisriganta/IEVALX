import { useCallback, useEffect, useMemo, useState } from 'react';
import { approvalService } from '@/services/api/company/approvalService';
import { useAuth } from '@/hooks/useAuth';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */
const VIEWER_ROLE = 'COMPANY_ADMIN';

const TAB_STATUS = ['all', 'Pending Approval', 'Active', 'Draft', 'Closed'];

const AVATAR_COLORS = [
  '#1976d2', '#9c27b0', '#2e7d32', '#ed6c02',
  '#d32f2f', '#0288d1', '#7b1fa2', '#388e3c',
  '#f57c00', '#c62828', '#00796b', '#5d4037',
];

const ACTOR_COMPANY  = 'COMPANY';
const ACTOR_EMPLOYER = 'EMPLOYER';

/* ------------------------------------------------------------------ */
/* Pure helpers                                                        */
/* ------------------------------------------------------------------ */
const colorForId = (id) =>
  AVATAR_COLORS[Math.abs(Number(id) || 0) % AVATAR_COLORS.length];

const dateOnly = (v) => (v ? String(v).split(' ')[0].split('T')[0] : null);

const buildEmployerJobCounts = (rawJobs) => {
  const counts = {};
  for (const j of rawJobs) {
    const empId = j.employer?.id ?? j.employer_id;
    if (empId == null) continue;
    if (!counts[empId]) counts[empId] = { total: 0, live: 0 };
    counts[empId].total += 1;
    if (j.display_status === 'Active') counts[empId].live += 1;
  }
  return counts;
};

const normalizeJob = (raw, employerCounts) => {
  const emp = raw.employer || {};
  const empId = emp.id ?? raw.employer_id ?? null;
  const counts = (empId != null && employerCounts[empId]) || { total: 0, live: 0 };

  const employerLocation =
    emp.location ?? emp.location_region ?? emp.branch ?? '';
  const companyLogoUrl =
    raw.company_logo_url || emp.company_logo_url || null;

  return {
    id:          raw.id,
    title:       raw.job_title,
    department:  raw.department,
    description: raw.job_description || raw.job_description_snippet || '',
    location:    raw.job_location,
    workMode:    raw.work_mode_display,
    salary:      raw.salary_display,
    experience:  raw.experience_display,
    openings:    raw.openings,
    skills:      Array.isArray(raw.skills) ? raw.skills : [],

    submittedOn: dateOnly(raw.created_at),
    daysLeft:    raw.days_left,

    status:            raw.display_status,
    rawStatus:         raw.status,
    rawApprovalStatus: raw.approval_status,

    urgency:    raw.urgency_display,
    applicants: raw.applicants,

    flagged:    Boolean(raw.flagged),
    flagReason: raw.flag_reason,

    // Expose at job root so JSX can read j.company_logo_url as a fallback.
    company_logo_url: companyLogoUrl,

    raw,

    employer: {
      id:              empId,
      name:            emp.name,
      role:            (String(emp.role || '').toUpperCase() === 'OTHER' && emp.role_other) ? emp.role_other : emp.role,
      location:        employerLocation,
      email:           emp.email,
      phone:           emp.phone,
      joinedOn:        dateOnly(emp.joined_on),
      avatar:          emp.avatar,
      avatarUrl:       emp.avatar_url || companyLogoUrl || null,
      avatarColor:     colorForId(empId),
      company_logo_url: companyLogoUrl,
      jobsPostedTotal: counts.total,
      jobsLiveCount:   counts.live,
    },
  };
};

/* ------------------------------------------------------------------ */
/* Hook                                                                */
/* ------------------------------------------------------------------ */
export const useJobsApprovals = () => {
  const auth = useAuth?.() || {};
  const user = auth.user || auth.currentUser || {};

  const rawRole       = user.role || user.User_Role || user.user_role || '';
  const rawActorType  = user.actor_type || user.Actor_Type || '';
  const isCompanyLogin =
    rawActorType.toUpperCase() === ACTOR_COMPANY ||
    rawRole.toLowerCase()      === 'company';

  const viewerCompanyId =
    user.company_id ??
    user.companyId  ??
    user.Company_Id ??
    (isCompanyLogin ? (user.id ?? user.User_Id ?? user.user_id) : null);

  const viewerEmployerId =
    user.employer_id ??
    user.employerId  ??
    user.Employer_Id ??
    (isCompanyLogin ? null : (user.id ?? user.User_Id ?? user.user_id));

  const actorType  = isCompanyLogin ? ACTOR_COMPANY : ACTOR_EMPLOYER;
  const approverId = isCompanyLogin ? viewerCompanyId : viewerEmployerId;

  /* ---- server state ---- */
  const [rawJobs, setRawJobs] = useState([]);
  const [stats, setStats]     = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  /* ---- edit-access requests state ---- */
  const [editRequests, setEditRequests]               = useState([]);
  const [editRequestsLoading, setEditRequestsLoading] = useState(false);
  const [editRequestsError, setEditRequestsError]     = useState(null);

  /* ---- republish requests state (NEW) ---- */
  const [republishRequests, setRepublishRequests]               = useState([]);
  const [republishRequestsLoading, setRepublishRequestsLoading] = useState(false);
  const [republishRequestsError, setRepublishRequestsError]     = useState(null);

  /* ---- filter state ---- */
  const [search, setSearch]                 = useState('');
  const [employerFilter, setEmployerFilter] = useState('all');
  const [statusFilter, setStatusFilter]     = useState('all');
  const [tab, setTab]                       = useState(0);

  /* ---- pagination state ---- */
  const [page, setPage]               = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  /* ---- selection state ---- */
  const [selected, setSelected] = useState([]);

  /* ---- edit-request fetcher ---- */
  const fetchEditRequests = useCallback(async () => {
    setEditRequestsLoading(true);
    setEditRequestsError(null);
    try {
      const list = await approvalService.listEditRequests('PENDING');
      setEditRequests(Array.isArray(list) ? list : []);
    } catch (err) {
      setEditRequestsError(err?.message || 'Failed to load edit requests');
      setEditRequests([]);
    } finally {
      setEditRequestsLoading(false);
    }
  }, []);

  /* ---- republish-request fetcher (NEW) ---- */
  const fetchRepublishRequests = useCallback(async () => {
    setRepublishRequestsLoading(true);
    setRepublishRequestsError(null);
    try {
      const list = await approvalService.listRepublishRequests('PENDING');
      setRepublishRequests(Array.isArray(list) ? list : []);
    } catch (err) {
      setRepublishRequestsError(err?.message || 'Failed to load republish requests');
      setRepublishRequests([]);
    } finally {
      setRepublishRequestsLoading(false);
    }
  }, []);

  /* ---- fetch ---- */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (viewerCompanyId == null) {
      setError({
        friendlyMessage:
          'Your account is missing a company association. Please sign in again or contact support.',
      });
      setLoading(false);
      return;
    }

    try {
      const [jobsResp, statsResp] = await Promise.all([
    approvalService.listJobs({
    viewer: { viewerRole: VIEWER_ROLE, viewerCompanyId, viewerEmployerId, postedVia: 'EMPLOYER' },
  }),
  approvalService.getStats(viewerCompanyId),
]);
      setRawJobs(Array.isArray(jobsResp) ? jobsResp : []);
      setStats({
        total:     statsResp.total,
        pending:   statsResp.pending,
        live:      statsResp.live,
        draft:     statsResp.draft,
        closed:    statsResp.closed,
        rejected:  statsResp.rejected,
        employers: statsResp.active_employers,
        flagged:   statsResp.flagged,
      });
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
    // Fire-and-forget; doesn't block jobs UI even if either fails.
    fetchEditRequests();
    fetchRepublishRequests();
  }, [viewerCompanyId, viewerEmployerId, fetchEditRequests, fetchRepublishRequests]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useRefetchOnFocus(fetchAll);

  /* ---- normalize ---- */
  const employerJobCounts = useMemo(
    () => buildEmployerJobCounts(rawJobs),
    [rawJobs]
  );
  const jobs = useMemo(
    () => rawJobs.map((j) => normalizeJob(j, employerJobCounts)),
    [rawJobs, employerJobCounts]
  );

  const uniqueEmployers = useMemo(() => {
    const seen = new Map();
    for (const j of jobs) {
      if (j.employer?.id != null && !seen.has(j.employer.id)) {
        seen.set(j.employer.id, j.employer);
      }
    }
    return Array.from(seen.values());
  }, [jobs]);

  /* ---- filter pipeline ---- */
  const filtered = useMemo(() => {
    const lc = search.trim().toLowerCase();
    const tabStatus = TAB_STATUS[tab] || 'all';

    return jobs.filter((j) => {
      if (tabStatus      !== 'all' && j.status       !== tabStatus)      return false;
      if (statusFilter   !== 'all' && j.status       !== statusFilter)   return false;
      if (employerFilter !== 'all' && j.employer?.id !== employerFilter) return false;

      if (lc) {
        const haystack = [
          j.title,
          j.employer?.name,
          j.employer?.location,
          j.department,
          j.location,
          ...(j.skills || []),
        ].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(lc)) return false;
      }
      return true;
    });
  }, [jobs, tab, statusFilter, employerFilter, search]);

  /* ---- paginate ---- */
  const paginated = useMemo(() => {
    const start = page * rowsPerPage;
    return filtered.slice(start, start + rowsPerPage);
  }, [filtered, page, rowsPerPage]);

  useEffect(() => {
    const lastPage = Math.max(0, Math.ceil(filtered.length / rowsPerPage) - 1);
    if (page > lastPage) setPage(lastPage);
  }, [filtered.length, rowsPerPage, page]);

  /* ---- selection ---- */
  const toggleSelect = useCallback((id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const toggleSelectAll = useCallback((rows, checked) => {
    setSelected((prev) => {
      const ids = rows.map((r) => r.id);
      if (checked) return Array.from(new Set([...prev, ...ids]));
      return prev.filter((x) => !ids.includes(x));
    });
  }, []);

  const clearSelection = useCallback(() => setSelected([]), []);

  /* ---- workflow actions ---- */
  const requireApprover = () => {
    if (approverId == null) {
      const e = new Error(
        'Cannot perform this action — your session is missing the company or ' +
        'employer identity needed for approval. Please sign in again.'
      );
      e.friendlyMessage = e.message;
      throw e;
    }
  };

  const approveJob = useCallback(async (job) => {
    requireApprover();
    await approvalService.approveJob(job.id, approverId, actorType);
    await fetchAll();
  }, [approverId, actorType, fetchAll]);

  const rejectJob = useCallback(async (job, reason) => {
    requireApprover();
    if (!reason || !reason.trim()) {
      const e = new Error('A rejection reason is required.');
      e.friendlyMessage = e.message;
      throw e;
    }
    await approvalService.rejectJob(job.id, approverId, reason.trim(), actorType);
    await fetchAll();
  }, [approverId, actorType, fetchAll]);

  const publishJob = useCallback(async (job) => {
    await approvalService.publishJob(job.id);
    await fetchAll();
  }, [fetchAll]);

  const unpublishJob = useCallback(async (job) => {
    await approvalService.unpublishJob(job.id);
    await fetchAll();
  }, [fetchAll]);

  const updateJob = useCallback(async (jobId, payload) => {
    await approvalService.updateJob(jobId, payload);
    await fetchAll();
  }, [fetchAll]);

  const deleteJob = useCallback(async (job) => {
    await approvalService.deleteJob(job.id);
    await fetchAll();
  }, [fetchAll]);

  const removeJob = useCallback(async (job, reason = '') => {
    requireApprover();
    await approvalService.removeJob(job.id, approverId, reason, actorType);
    await fetchAll();
  }, [approverId, actorType, fetchAll]);

  const bulkApprove = useCallback(async () => {
    requireApprover();
    if (selected.length === 0) return { approvedCount: 0, skipped: [] };
    const resp = await approvalService.bulkApprove(selected, approverId, actorType);
    setSelected([]);
    await fetchAll();
    return {
      approvedCount: (resp?.Approved || []).length,
      skipped:       resp?.Skipped || [],
      raw:           resp,
    };
  }, [selected, approverId, actorType, fetchAll]);

  /* ---- edit-access request actions ---- */
  const approveEditRequest = useCallback(async (requestId) => {
    await approvalService.approveEditRequest(requestId);
    await fetchEditRequests();
  }, [fetchEditRequests]);

  const rejectEditRequest = useCallback(async (requestId, adminNote = '') => {
    await approvalService.rejectEditRequest(requestId, adminNote);
    await fetchEditRequests();
  }, [fetchEditRequests]);
  const approveRepublishRequest = useCallback(async (requestId) => {
    await approvalService.approveRepublishRequest(requestId);
    await Promise.all([fetchRepublishRequests(), fetchAll()]);
  }, [fetchRepublishRequests, fetchAll]);

  const rejectRepublishRequest = useCallback(async (requestId, adminNote = '') => {
    await approvalService.rejectRepublishRequest(requestId, adminNote);
    await fetchRepublishRequests();
  }, [fetchRepublishRequests]);

  /* ---- public surface ---- */
  return {
    loading, error,

    actorType,
    approverId,
    isCompanyLogin,
    viewerCompanyId,

    search,         setSearch,
    employerFilter, setEmployerFilter,
    statusFilter,   setStatusFilter,
    tab,            setTab,

    page,        setPage,
    rowsPerPage, setRowsPerPage,

    selected,
    toggleSelect,
    toggleSelectAll,
    clearSelection,

    approveJob,
    rejectJob,
    publishJob,
    unpublishJob,
    updateJob,
    deleteJob,
    removeJob,
    bulkApprove,

    stats,
    uniqueEmployers,
    jobs,
    filtered,
    paginated,

    refetch: fetchAll,
    rawJobs,

    /* ── edit-access requests ── */
    editRequests,
    editRequestsLoading,
    editRequestsError,
    refetchEditRequests: fetchEditRequests,
    approveEditRequest,
    rejectEditRequest,

    /* ── republish requests (NEW) ── */
    republishRequests,
    republishRequestsLoading,
    republishRequestsError,
    refetchRepublishRequests: fetchRepublishRequests,
    approveRepublishRequest,
    rejectRepublishRequest,
  };
};

export default useJobsApprovals;