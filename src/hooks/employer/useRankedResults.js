import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import rankedResultsService from '../../services/api/employer/rankedResultsService';

const _num = (v, d = 0) => (typeof v === 'number' ? v : d);

/** Normalise a pipeline (InterviewProcess) coming off the API. */
const shapePipeline = (p) => {
  const active  = Array.isArray(p.rounds) ? p.rounds : [];
  const removed = Array.isArray(p.removed_rounds) ? p.removed_rounds : [];
  const roundsCount   = _num(p.rounds_count, active.length);
  const originalCount = _num(p.original_rounds_count, roundsCount + removed.length);
  return {
    ...p,
    name: p.name || `Pipeline #${p.sequence_no || 1}`,
    sequenceNo: p.sequence_no || 1,
    jobId: p.job ?? p.job_id ?? null,
    jobTitle: p.job_title || 'Untitled job',
    activeRounds: active, 
    removedRounds: removed,
    roundsCount,
    originalRoundsCount: originalCount,
    /** true when rounds were removed → "reduced to X from Y" */
    isReduced: originalCount > roundsCount,
    /** how many candidates still live inside removed rounds */
    grandfatheredCount: removed.reduce(
      (a, r) => a + _num(r.live_member_count), 0,
    ),
    
    memberCount: (typeof p.member_count === 'number') ? p.member_count
               : (typeof p.candidate_count === 'number') ? p.candidate_count
               : (typeof p.candidates_count === 'number') ? p.candidates_count
               : null,
    editSummary: Array.isArray(p.edit_summary) ? p.edit_summary : [],
  };
};

export const describeEdit = (pipeline) => {
  if (!pipeline) return '';
  const ev = (pipeline.editSummary || [])[0];
  if (ev && ev.prev_count && ev.new_count && ev.prev_count !== ev.new_count) {
    return ev.new_count < ev.prev_count
      ? `reduced to ${ev.new_count} round${ev.new_count > 1 ? 's' : ''} from ${ev.prev_count}`
      : `extended from ${ev.prev_count} to ${ev.new_count} rounds`;
  }
  if (pipeline.isReduced) {
    return `reduced to ${pipeline.roundsCount} round${pipeline.roundsCount > 1 ? 's' : ''} from ${pipeline.originalRoundsCount}`;
  }
  return '';
};

export const useRankedResults = () => {
  // ── level 1/2 state ──────────────────────────────────────────────────────
  const [pipelines, setPipelines] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  // ── level 3 state ────────────────────────────────────────────────────────
  const [selectedPipelineId, setSelectedPipelineId] = useState(null);
  const [detail,        setDetail]        = useState(null);   // members payload
  const [detailLoading, setDetailLoading] = useState(false);
  const [reschedule,    setReschedule]    = useState({ rounds: [], total_requests: 0 });
  const [acting,        setActing]        = useState(false);

  // ── filters ──────────────────────────────────────────────────────────────
  const [search,       setSearch]       = useState('');
  const [jobFilter,    setJobFilter]    = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');    // all | active | closed

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  // ── fetch pipelines (levels 1 + 2) ───────────────────────────────────────
  const fetchAll = useCallback(async () => {
    if (mounted.current) { setLoading(true); setError(null); }
    try {
      const res  = await rankedResultsService.getProcesses();
      const list = res?.data?.results || res?.data || [];
      if (!mounted.current) return;
      setPipelines((Array.isArray(list) ? list : []).map(shapePipeline));
    } catch (err) {
      if (!mounted.current) return;
      setError(err?.message || 'Failed to load pipelines');
      setPipelines([]);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── fetch one pipeline's members + reschedule groups (level 3) ───────────
  const loadPipeline = useCallback(async (processId, params = {}) => {
    if (!processId) { setDetail(null); return null; }
    if (mounted.current) setDetailLoading(true);
    try {
      const [membersRes, reschRes] = await Promise.all([
        rankedResultsService.getPipelineMembers(processId, params),
        rankedResultsService.getRescheduleRequests(processId),
      ]);
      if (!mounted.current) return null;
      const payload = membersRes?.data ?? null;
      setDetail(payload);
      setReschedule(reschRes?.data || { rounds: [], total_requests: 0 });
      return payload;
    } catch (err) {
      if (mounted.current) setError(err?.message || 'Failed to load pipeline');
      return null;
    } finally {
      if (mounted.current) setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedPipelineId) loadPipeline(selectedPipelineId);
    else { setDetail(null); setReschedule({ rounds: [], total_requests: 0 }); }
  }, [selectedPipelineId, loadPipeline]);

  const refreshDetail = useCallback(
    () => (selectedPipelineId ? loadPipeline(selectedPipelineId) : null),
    [selectedPipelineId, loadPipeline],
  );

  // ── LEVEL 1 — jobs, each owning many pipelines ───────────────────────────
  const jobs = useMemo(() => {
    const byJob = new Map();
    pipelines.forEach((p) => {
      const key = String(p.jobId ?? p.jobTitle);
      if (!byJob.has(key)) {
        byJob.set(key, {
          key,
          jobId: p.jobId,
          jobTitle: p.jobTitle,
          pipelines: [],
        });
      }
      byJob.get(key).pipelines.push(p);
    });
    return [...byJob.values()].map((j) => {
      const sorted = [...j.pipelines].sort((a, b) => a.sequenceNo - b.sequenceNo);
      return {
        ...j,
        pipelines: sorted,
        pipelineCount: sorted.length,
        activeCount:   sorted.filter((p) => p.is_active).length,
        // null-safe: unknown counts must not silently read as 0
        memberTotal:   sorted.some(p => p.memberCount != null)
          ? sorted.reduce((a, p) => a + (p.memberCount || 0), 0)
          : null,
        hasReduced:    sorted.some((p) => p.isReduced),
      };
    }).sort((a, b) => a.jobTitle.localeCompare(b.jobTitle));
  }, [pipelines]);

  const filteredJobs = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = jobs;
    if (jobFilter !== 'all') list = list.filter((j) => String(j.key) === String(jobFilter));
    if (q) list = list.filter((j) => j.jobTitle.toLowerCase().includes(q));
    return list;
  }, [jobs, search, jobFilter]);

  /** LEVEL 2 — the pipelines belonging to one job. */
  const pipelinesForJob = useCallback((jobKey) => {
    const job = jobs.find((j) => String(j.key) === String(jobKey)
                             || String(j.jobId) === String(jobKey));
    if (!job) return [];
    if (statusFilter === 'active') return job.pipelines.filter((p) => p.is_active);
    if (statusFilter === 'closed') return job.pipelines.filter((p) => !p.is_active);
    return job.pipelines;
  }, [jobs, statusFilter]);

  const getPipeline = useCallback(
    (processId) => pipelines.find((p) => String(p.id) === String(processId)) || null,
    [pipelines],
  );


  const _basePipeline = useMemo(
    () => pipelines.find(p => String(p.id) === String(selectedPipelineId)) || null,
    [pipelines, selectedPipelineId],
  );

  const activeRounds = useMemo(() => {
    const src = (detail?.rounds && detail.rounds.length)
      ? detail.rounds
      : (_basePipeline?.activeRounds || []);
   
    const removedSrc = (detail?.removed_rounds && detail.removed_rounds.length)
      ? detail.removed_rounds
      : (_basePipeline?.removedRounds || []);
    const removedSlots = new Set(
      removedSrc
        .map((r) => (typeof r.original_number === 'number' ? r.original_number : null))
        .filter((n) => n != null),
    );
    // Walk active rounds in order and assign the next non-removed slot number.
    let cursor = 1;
    const withStableSlot = src.map((r, i) => {
      // prefer backend original_number; otherwise skip removed slots as we count
      const stable = (typeof r.original_number === 'number' && r.original_number > 0)
        ? r.original_number
        : (() => {
            while (removedSlots.has(cursor)) cursor += 1;
            const slot = cursor;
            cursor += 1;
            return slot;
          })();
      return {
        id: r.id,
        round_number: r.round_number ?? r.order ?? (i + 1),
        original_number: stable,
        name: r.name || `Round ${stable}`,
        round_type: r.round_type || r.type || '',
        is_removed: false,
      };
    });
    return withStableSlot;
  }, [detail, _basePipeline]);

  const removedRounds = useMemo(() => {
    const src = (detail?.removed_rounds && detail.removed_rounds.length)
      ? detail.removed_rounds
      : (_basePipeline?.removedRounds || []);
    return src.map(r => ({
      id: r.id,
      original_number: r.original_number ?? r.order ?? 0,
      name: r.name || 'Removed round',
      round_type: r.round_type || r.type || '',
      removed_on: r.removed_on || null,
      live_member_count: r.live_member_count ?? 0,
      is_removed: true,
    }));
  }, [detail, _basePipeline]);

  const members = useMemo(() => detail?.members || [], [detail]);

  /** True when the members endpoint returned nothing usable — the UI uses this
   *  to explain the empty table instead of implying "no candidates". */
  const membersUnavailable = useMemo(
    () => !detail || !Array.isArray(detail.members),
    [detail],
  );

  /** Rows for one round tab. roundConfigId may be a REMOVED round (R6) — the
   *  member list then narrows to the grandfathered candidates only. */
  const membersForRound = useCallback((roundConfigId) => {
    if (!roundConfigId) return [];
    const id = String(roundConfigId);
    return members
      .map((m) => {
        const cell = (m.rounds || {})[id] || (m.removed_rounds || {})[id] || null;
        return cell ? { ...m, cell } : null;
      })
      .filter(Boolean)
     
      .map((r) => {
        if (!['locked', 'draft'].includes(r.cell?.status)) return r;
        const idx = activeRounds.findIndex(
          (rc) => String(rc.id) === String(roundConfigId));
        if (idx <= 0) return null;              // R1 has no previous round
        const prevId = String(activeRounds[idx - 1].id);
        const prev = (r.rounds || {})[prevId];
        if (prev && prev.decision === 'approved') {
          return { ...r, _awaitingEntry: true };
        }
        return null;
      })
      .filter(Boolean);
  }, [members, activeRounds]);

  /** Is this the last ACTIVE round? → approve routes to the Hire pool (R4). */
  const isFinalRound = useCallback((roundConfigId) => {
    if (!activeRounds.length) return true;
    const last = activeRounds[activeRounds.length - 1];
    return String(last.id) === String(roundConfigId);
  }, [activeRounds]);

  const nextRoundAfter = useCallback((roundConfigId, member = null) => {
    const i = activeRounds.findIndex((r) => String(r.id) === String(roundConfigId));
    const isGrandfathered = i === -1;
    if (isGrandfathered && member) {
      const activeIds = new Set(activeRounds.map((r) => String(r.id)));
      const rounds = member.rounds || {};
      const next = activeRounds.find((r) => {
        if (!activeIds.has(String(r.id))) return false;
        const cell = rounds[String(r.id)] || rounds[r.id];
        if (!cell) return true;                          // never entered
        return ['locked', 'draft'].includes(cell.status); // placeholder only
      });
      return next || null; // null → advance loop routes to Hire pool
    }
    if (isGrandfathered) return activeRounds[0] || null;  // legacy fallback
    return activeRounds[i + 1] || null;
  }, [activeRounds]);

  // ── ACTIONS ──────────────────────────────────────────────────────────────
  const decide = useCallback(async (roundConfigId, candidateIds, action) => {
    if (!selectedPipelineId || !roundConfigId || !candidateIds?.length) return null;
    setActing(true);
    try {
      const res = await rankedResultsService.decideRound(
        selectedPipelineId, roundConfigId,
        { action, candidate_ids: candidateIds },
      );
      await Promise.all([refreshDetail(), fetchAll()]);
      return res?.data ?? null;
    } finally {
      if (mounted.current) setActing(false);
    }
  }, [selectedPipelineId, refreshDetail, fetchAll]);

  const approve = useCallback(
    (roundConfigId, ids) => decide(roundConfigId, ids, 'approve'), [decide]);
  const hold    = useCallback(
    (roundConfigId, ids) => decide(roundConfigId, ids, 'hold'),    [decide]);
  const reject  = useCallback(
    (roundConfigId, ids) => decide(roundConfigId, ids, 'reject'),  [decide]);
  const hire    = useCallback(
    (roundConfigId, ids) => decide(roundConfigId, ids, 'hire'),    [decide]);

  const applyReschedule = useCallback(async (roundConfigId, windowStart, windowEnd, siIds) => {
    if (!selectedPipelineId || !roundConfigId) return null;
    setActing(true);
    try {
      const res = await rankedResultsService.applyReschedule(selectedPipelineId, {
        round_config_id: roundConfigId,
        window_start: windowStart,
        window_end: windowEnd,
        ...(siIds?.length ? { si_ids: siIds } : {}),
      });
      await refreshDetail();
      return res?.data ?? null;
    } finally {
      if (mounted.current) setActing(false);
    }
  }, [selectedPipelineId, refreshDetail]);

  const deletePipeline = useCallback(async (processId) => {
    await rankedResultsService.deleteProcess(processId);
    if (String(processId) === String(selectedPipelineId)) setSelectedPipelineId(null);
    await fetchAll();
  }, [selectedPipelineId, fetchAll]);

  // BUILD: 2026-08-04-soft-delete-jobs
  /** Soft-delete every pipeline belonging to a job (hides the whole job card). */
  const softDeleteJob = useCallback(async (jobId) => {
    await rankedResultsService.bulkSoftDeleteByJobs([jobId]);
    await fetchAll();
  }, [fetchAll]);

  /** Bulk soft-delete multiple jobs by their jobIds. */
  const bulkSoftDeleteJobs = useCallback(async (jobIds) => {
    await rankedResultsService.bulkSoftDeleteByJobs(jobIds);
    await fetchAll();
  }, [fetchAll]);

  // ── stats ────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    jobs: jobs.length,
    total: pipelines.length,
    activePipelines: pipelines.filter((p) => p.is_active).length,
    totalRounds: pipelines.reduce((a, p) => a + p.roundsCount, 0),
    removedRounds: pipelines.reduce((a, p) => a + p.removedRounds.length, 0),
    grandfathered: pipelines.reduce((a, p) => a + p.grandfatheredCount, 0),
  }), [jobs, pipelines]);

  const selectedPipeline = useMemo(() => {
    const base = getPipeline(selectedPipelineId);
    if (!base) return null;
    // the members payload is fresher than the list payload
    if (!detail) return base;
    return {
      ...base,
      activeRounds: detail.rounds || base.activeRounds,
      removedRounds: detail.removed_rounds || base.removedRounds,
      roundsCount: _num(detail.rounds_count, base.roundsCount),
      originalRoundsCount: _num(detail.original_rounds_count, base.originalRoundsCount),
      isReduced: _num(detail.original_rounds_count, base.originalRoundsCount)
                 > _num(detail.rounds_count, base.roundsCount),
      memberCount: (typeof detail.member_count === 'number')
        ? detail.member_count
        : (Array.isArray(detail.members) ? detail.members.length : base.memberCount),
      editSummary: detail.edit_events || base.editSummary,
    };
  }, [getPipeline, selectedPipelineId, detail]);

  return {
    // level 1 / 2
    pipelines, jobs, filteredJobs, pipelinesForJob, getPipeline,
    // level 3
    selectedPipelineId, setSelectedPipelineId, selectedPipeline,
    detail, detailLoading, members, membersForRound,
    activeRounds, removedRounds,
    isFinalRound, nextRoundAfter,
    membersUnavailable,
    reschedule, rescheduleCount: reschedule?.total_requests || 0,
    decide, approve, hold, reject, hire, applyReschedule, deletePipeline, acting,
    softDeleteJob, bulkSoftDeleteJobs,
    refresh: fetchAll, refreshDetail, loadPipeline,
    // filters + meta
    search, setSearch, jobFilter, setJobFilter, statusFilter, setStatusFilter,
    stats, loading, error,
    describeEdit,
  };
};

export default useRankedResults;