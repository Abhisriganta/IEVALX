import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSnackbar } from 'notistack';
import interviewRoundService from '../../services/api/employer/interviewRound';
import { useRefetchOnFocus } from '../useRefetchOnFocus';


export const useInterviewRounds = () => {
  const { enqueueSnackbar } = useSnackbar();

  const [tab,           setTab]           = useState(0);
  const [ivLoading,     setIvLoading]     = useState(true);
  const [dashboard,     setDashboard]     = useState(null);
  const [processes,     setProcesses]     = useState([]);
  const [scheduled,     setScheduled]     = useState([]);
  const [liveIvs,       setLiveIvs]       = useState([]);
  const [deleting,      setDeleting]      = useState(false);
  const [expandedProc,  setExpandedProc]  = useState(null);
  const [expandedView,  setExpandedView]  = useState('rankings');

  const [deleteDlg,        setDeleteDlg]        = useState(null);
  const [pipelineDialog,   setPipelineDialog]   = useState(false);
  const [schedDialog,      setSchedDialog]      = useState({ open: false, preSelect: null });
  const [manageDialog,     setManageDialog]     = useState({ open: false, process: null });
  const [bulkHireDialog,   setBulkHireDialog]   = useState({ open: false, process: null });
  const [hiringDialog,     setHiringDialog]     = useState({ open: false, process: null });
  const [closeDialog,      setCloseDialog]      = useState({ open: false, process: null });
  const [liveScoreDialog,  setLiveScoreDialog]  = useState({ open: false, candidateInterview: null });
  const [resultPreview,    setResultPreview]    = useState({ open: false, sessionId: null, interviewType: null, candidateName: '', interviewName: '' });
  const [feedbackPreview,  setFeedbackPreview]  = useState({ open: false, interviewId: null, candidateName: '', interviewName: '' });

  // ── Soft-delete selection state ──
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds,   setSelectedIds]   = useState(new Set());

  const UPCOMING_STATUSES    = ['draft', 'scheduled', 'invited', 'locked', 'rescheduled', 'cancelled', 'disqualified', 'started', 'in_progress', 'scoring'];
  const IN_PROGRESS_STATUSES = ['in_progress', 'scoring', 'started'];
  const TERMINAL_STATUSES    = ['completed', 'no_attempt', 'partial'];
  const inProgress = useMemo(() => scheduled.filter(s => IN_PROGRESS_STATUSES.includes(s.status)), [scheduled]);
  const upcoming   = useMemo(() => scheduled.filter(s => UPCOMING_STATUSES.includes(s.status)),    [scheduled]);
  const completed  = useMemo(() => scheduled.filter(s => TERMINAL_STATUSES.includes(s.status)),    [scheduled]);

  const _sameShape = (a, b) => {
    if (a === b) return true;
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      const x = a[i], y = b[i];
      if (!x || !y) return false;
      if (x.id !== y.id) return false;
      if (x.status !== y.status) return false;
      if ((x.updated_at || '') !== (y.updated_at || '')) return false;
    }
    return true;
  };

  
  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setIvLoading(true);
    const [dashRes, procRes, schedRes, liveRes] = await Promise.allSettled([
      interviewRoundService.getDashboard(),
      interviewRoundService.getProcesses(),
      interviewRoundService.getScheduled({ ordering: 'window_start' }),
      interviewRoundService.getLiveInterviews(),
    ]);
    if (dashRes.status  === 'fulfilled') setDashboard(dashRes.value.data);
    if (procRes.status  === 'fulfilled') setProcesses(procRes.value.data?.results  || procRes.value.data  || []);
    if (schedRes.status === 'fulfilled') {
      const next = schedRes.value.data?.results || schedRes.value.data || [];
      setScheduled(prev => _sameShape(prev, next) ? prev : next);
    }
    if (liveRes.status  === 'fulfilled') {
      const next = liveRes.value.data?.results || liveRes.value.data || [];
      setLiveIvs(prev => _sameShape(prev, next) ? prev : next);
    }
    if (!silent) setIvLoading(false);
  }, []);

useEffect(() => { fetchAll(); }, [fetchAll]);
useRefetchOnFocus(fetchAll);
  
  useEffect(() => {
    const hasActiveLive = liveIvs.some(iv =>
      iv.status !== 'completed' && iv.status !== 'cancelled'
    );
    if (!hasActiveLive) return;
    let id = null;
    const start = () => {
      if (id != null) return;

      id = setInterval(() => {
        if (document.visibilityState === 'visible') fetchAll(true);
      }, 60000);
    };
    const stop = () => {
      if (id != null) { clearInterval(id); id = null; }
    };
    start();
    const onVis = () => {
      if (document.visibilityState === 'visible') { fetchAll(true); start(); } else { stop(); }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => { stop(); document.removeEventListener('visibilitychange', onVis); };
  }, [liveIvs, fetchAll]);

  useEffect(() => {
    const needsPolling = scheduled.some(s =>
      s.status === 'scoring' ||
      (s.interview_type === 'aptitude' && ['scheduled', 'invited', 'in_progress', 'started'].includes(s.status))
    );
    if (!needsPolling) return;
    let id = null;
    const start = () => {
      if (id != null) return;
      // 45s cadence for aptitude/scoring. Silent poll → no spinner flash.
      id = setInterval(() => {
        if (document.visibilityState === 'visible') fetchAll(true);
      }, 45000);
    };
    const stop = () => {
      if (id != null) { clearInterval(id); id = null; }
    };
    start();
    const onVis = () => {
      if (document.visibilityState === 'visible') { fetchAll(true); start(); } else { stop(); }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => { stop(); document.removeEventListener('visibilitychange', onVis); };
  }, [scheduled, fetchAll]);

  useEffect(() => {
    const docCompleted = scheduled.filter(s => s.status === 'completed' && s.interview_type === 'document' && s.doc_overall_pct == null);
    if (!docCompleted.length) return;
    docCompleted.forEach(s => {
      interviewRoundService.getDocResult(s.id)
        .then(r => {
          const d = r.data;
          const answered = (d.qa_pairs || []).filter(q => !q.skipped && q.ai_score != null);
          const pct = answered.length ? Math.round(answered.reduce((sum, q) => sum + q.ai_score, 0) / answered.length * 10) : null;
          const overall = d.overall_pct ?? (d.overall_score != null ? Math.round(d.overall_score * 10) : null) ?? pct;
          if (overall != null) setScheduled(prev => prev.map(iv => iv.id === s.id ? { ...iv, doc_overall_pct: overall } : iv));
        }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
    });
  }, [scheduled.length]);

  const handleSendInvite = async (id, name) => {
    try { await interviewRoundService.sendInvite(id); enqueueSnackbar(`✅ Invite sent to ${name || 'candidate'}`, { variant: 'success' }); fetchAll(); }
    catch (err) { enqueueSnackbar(err?.response?.data?.detail || 'Failed to send invite', { variant: 'error' }); }
  };

  const handleSendReminder = async (id) => {
    try { await interviewRoundService.sendReminder(id); enqueueSnackbar('Reminder sent!', { variant: 'success' }); }
    catch { enqueueSnackbar('Failed', { variant: 'error' }); }
  };

  const handleFlagFraud = async (sessionId) => {
    try { await interviewRoundService.flagFraud(sessionId, { reason: 'Fraud detected by employer' }); enqueueSnackbar('Candidate disqualified', { variant: 'warning' }); fetchAll(); }
    catch { enqueueSnackbar('Failed', { variant: 'error' }); }
  };

  const _HARD_DELETABLE = new Set(['scheduled', 'invited', 'locked', 'cancelled', 'draft']);

  const handleDelete = async () => {
    if (!deleteDlg || deleting) return;
    const target = scheduled.find(s => s.id === deleteDlg.id);
    if (target && !_HARD_DELETABLE.has(target.status)) {
      setDeleteDlg(null);
      await hideOne(deleteDlg.id);
      return;
    }
    setDeleting(true);
    try {
      await interviewRoundService.deleteScheduled(deleteDlg.id);
      setScheduled(prev => prev.filter(s => s.id !== deleteDlg.id));
      enqueueSnackbar('Interview deleted.', { variant: 'success' });
      setDeleteDlg(null);
    } catch (err) {
      // Fallback: if hard delete fails (e.g. status changed), try soft-hide
      try {
        setDeleteDlg(null);
        await hideOne(deleteDlg.id);
      } catch {
        enqueueSnackbar(err?.response?.data?.detail || 'Failed to delete.', { variant: 'error' });
      }
    }
    finally { setDeleting(false); }
  };

  const handleMissed = async (id) => {
    try {
      const r = await interviewRoundService.handleMissedRound(id);
      enqueueSnackbar(r.data?.action === 'reminded' ? 'Reminder sent (1st absence)' : 'Permanently closed (2nd absence)', { variant: 'info' });
      fetchAll();
    } catch { enqueueSnackbar('Failed', { variant: 'error' }); }
  };

  const handleSyncManualAssessment = async (id) => {
    try {
      const r = await interviewRoundService.syncManualAssessment(id);
      if (r.data?.changed) {
        enqueueSnackbar('Status updated — candidate marked completed.', { variant: 'success' });
        fetchAll();
      } else {
        enqueueSnackbar('No update yet — candidate may still be taking the assessment.', { variant: 'info' });
      }
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.detail || 'Failed to check status', { variant: 'error' });
    }
  };

  const handleRepairManualAssignment = async (id) => {
    try {
      const r = await interviewRoundService.repairManualAssignment(id);
      if (r.data?.repaired) {
        enqueueSnackbar('Fixed — candidate will now see their test for this job.', { variant: 'success' });
        fetchAll();
      } else {
        enqueueSnackbar(r.data?.detail || 'Nothing to repair.', { variant: 'info' });
      }
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.detail || 'Repair failed', { variant: 'error' });
    }
  };

  // ── Soft-delete handlers ──
  const toggleSelect = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback((list) => {
    setSelectionMode(true);
    setSelectedIds(new Set(list.map(s => s.id)));
  }, []);

  const exitSelection = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const hideOne = useCallback(async (id) => {
    const item = scheduled.find(s => s.id === id);
    setScheduled(prev => prev.filter(s => s.id !== id));
    try {
      await interviewRoundService.hideScheduled([id]);
    } catch { /* optimistic — already removed */ }
    enqueueSnackbar('Interview removed', {
      variant: 'default',
      autoHideDuration: 5000,
      action: (snackKey) =>
        React.createElement('button', {
          onClick: async () => {
            try {
              await interviewRoundService.unhideScheduled([id]);
              fetchAll();
            } catch { enqueueSnackbar('Undo failed', { variant: 'error' }); }
          },
          style: { color: '#60A5FA', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.82rem' },
        }, 'UNDO'),
    });
  }, [scheduled, fetchAll, enqueueSnackbar]);

  const hideSelected = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    setScheduled(prev => prev.filter(s => !selectedIds.has(s.id)));
    exitSelection();
    try {
      await interviewRoundService.hideScheduled(ids);
    } catch { /* optimistic */ }
    enqueueSnackbar(`${ids.length} interview(s) removed`, {
      variant: 'default',
      autoHideDuration: 5000,
      action: (snackKey) =>
        React.createElement('button', {
          onClick: async () => {
            try {
              await interviewRoundService.unhideScheduled(ids);
              fetchAll();
            } catch { enqueueSnackbar('Undo failed', { variant: 'error' }); }
          },
          style: { color: '#60A5FA', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.82rem' },
        }, 'UNDO'),
    });
  }, [selectedIds, exitSelection, fetchAll, enqueueSnackbar]);

  const handleLaunchPipeline = async ({ jobId, jobTitle, vacancies, rounds }) => {
    let processId;
    try {
      const procRes = await interviewRoundService.createProcess({ job_id: jobId, job_title: jobTitle, vacancies });
      processId = procRes.data?.id;
      if ((procRes.data?.rounds || []).length > 0) {
        enqueueSnackbar(`"${jobTitle}" already has rounds. Use Manage to edit.`, { variant: 'warning' });
        await fetchAll();
        return;
      }
    } catch (err) { enqueueSnackbar(err?.response?.data?.detail || 'Failed to create process', { variant: 'error' }); throw err; }
    const failures = [];
    for (const r of rounds) {
      try { await interviewRoundService.createRound(processId, { name: r.name, round_type: r.type, order: r.order, duration: 60, passing_score: 70 }); }
      catch { failures.push(r.name); }
    }
    await fetchAll();
    enqueueSnackbar(
      failures.length === 0
        ? `Pipeline created: ${rounds.length} round(s) for "${jobTitle}".`
        : `Pipeline created but ${failures.length} round(s) failed.`,
      { variant: failures.length === 0 ? 'success' : 'warning', autoHideDuration: 6000 }
    );
  };

  const handleConfirmClose = async (remaining) => {
    const process = closeDialog.process;
    setCloseDialog({ open: false, process: null });
    try {
      await interviewRoundService.closeProcess(process.id, remaining > 0);
      enqueueSnackbar(
        remaining > 0 ? `Process closed. ${remaining} position(s) still vacant.` : 'All positions filled! 🎉',
        { variant: remaining > 0 ? 'warning' : 'success' }
      );
      fetchAll();
    } catch (err) { enqueueSnackbar(err?.response?.data?.detail || 'Failed to close', { variant: 'error' }); }
  };

  const handleViewClick = (procId, viewKey) => {
    if (expandedProc === procId && expandedView === viewKey) setExpandedProc(null);
    else { setExpandedProc(procId); setExpandedView(viewKey); }
  };

  const viewBtnProps = (procId, viewKey, baseColor) => {
    const isActive = expandedProc === procId && expandedView === viewKey;
    return { variant: isActive ? 'contained' : 'outlined', color: baseColor, sx: isActive ? { boxShadow: 1 } : {} };
  };

  return {
    tab, setTab,
    ivLoading,
    dashboard,
    processes,  setProcesses,
    scheduled,  setScheduled,
    liveIvs,
    deleting,
    expandedProc,
    expandedView,
    deleteDlg,        setDeleteDlg,
    pipelineDialog,   setPipelineDialog,
    schedDialog,      setSchedDialog,
    manageDialog,     setManageDialog,
    bulkHireDialog,   setBulkHireDialog,
    hiringDialog,     setHiringDialog,
    closeDialog,      setCloseDialog,
    liveScoreDialog,  setLiveScoreDialog,
    resultPreview,    setResultPreview,
    feedbackPreview,  setFeedbackPreview,
    selectionMode, setSelectionMode,
    selectedIds,
    toggleSelect, selectAll, exitSelection,
    hideOne, hideSelected,
    inProgress, upcoming, completed,
    fetchAll,
    handleSendInvite,
    handleSendReminder,
    handleFlagFraud,
    handleDelete,
    handleMissed,
    handleSyncManualAssessment,
    handleRepairManualAssignment,
    handleLaunchPipeline,
    handleConfirmClose,
    handleViewClick,
    viewBtnProps,
  };
};