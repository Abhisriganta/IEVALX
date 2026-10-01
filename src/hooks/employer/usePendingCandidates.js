import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSnackbar } from 'notistack';
import pendingCandidateService from '../../services/api/employer/pendingCandidateService';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';


const usePendingCandidates = () => {
  const { enqueueSnackbar } = useSnackbar();

  const [activeTab, setActiveTab] = useState('pending');
  const [pending,   setPending]   = useState([]);
  const [hired,     setHired]     = useState([]);
  const [rejected,  setRejected]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [busyId,    setBusyId]    = useState(null);

  const [search,    setSearch]    = useState('');
  const [jobFilter, setJobFilter] = useState('all');
  const [poolFilter, setPoolFilter] = useState('all');
  const [sortBy,    setSortBy]    = useState('waiting');

  // ── Soft-delete / selection state ───────────────────────────────────
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedKeys,  setSelectedKeys]  = useState(new Set());
  const [hiding,        setHiding]        = useState(false);

  const _keyOf = (c) => `${c.process_id}_${c.candidate_id}_${c.round_number}`;

  const toggleSelect = useCallback((c) => {
    const k = _keyOf(c);
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedKeys(new Set());
    setSelectionMode(false);
  }, []);

  const enterSelectionMode = useCallback((c) => {
    setSelectionMode(true);
    if (c) setSelectedKeys(new Set([_keyOf(c)]));
  }, []);

  const selectAll = useCallback((list) => {
    setSelectionMode(true);
    setSelectedKeys(new Set((list || []).map(_keyOf)));
  }, []);

  
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pRes, hRes, rRes] = await Promise.all([
        pendingCandidateService.getPendingCandidates(),
        pendingCandidateService.getHiredCandidates(),
        pendingCandidateService.getRejectedCandidates(),
      ]);
      setPending(pRes.data || []);
      setHired(hRes.data || []);
      setRejected(rRes.data || []);
    } catch (e) {
      setError(e?.message || 'Failed to load candidates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useRefetchOnFocus(load);

  const _sourceFor = (tab) =>
    tab === 'pending' ? pending :
    tab === 'hired'   ? hired :
    rejected;

  const jobs = useMemo(() => {
    const source = _sourceFor(activeTab);
    const seen = new Map();
    source.forEach(c => {
      if (c.job_id != null && !seen.has(c.job_id)) {
        seen.set(c.job_id, { id: c.job_id, title: c.job_title || `Job ${c.job_id}` });
      }
    });
    return Array.from(seen.values());
  }, [pending, hired, rejected, activeTab]);

  const filtered = useMemo(() => {
    const source = _sourceFor(activeTab);
    const q = search.trim().toLowerCase();
    const rows = source.filter(c => {
      if (jobFilter  !== 'all' && String(c.job_id) !== String(jobFilter))  return false;
      if (poolFilter !== 'all' && c.pool_type      !== poolFilter)         return false;
      if (!q) return true;
      const hay = [c.full_name, c.email, c.job_title, ...(c.skills || [])].join(' ').toLowerCase();
      return hay.includes(q);
    });

    const cmp = {
      waiting: (a, b) => (b.daysWaiting || 0) - (a.daysWaiting || 0),
      recent:  (a, b) => new Date(b.completed_date || 0) - new Date(a.completed_date || 0),
      score:   (a, b) => (b.overall_cps ?? -1) - (a.overall_cps ?? -1),
      name:    (a, b) => (a.full_name || '').localeCompare(b.full_name || ''),
    }[sortBy] || (() => 0);
    return [...rows].sort(cmp);
  }, [pending, hired, rejected, activeTab, search, jobFilter, poolFilter, sortBy]);

  const stats = useMemo(() => ({
    pending:  pending.length,
    hired:    hired.length,
    rejected: rejected.length,
  }), [pending, hired, rejected]);

  // Confirm hire from the awaiting-hire pool → POST /pool/<pid>/candidate/<cid>/hire/.
  const hire = useCallback(async (candidateId, fullName, processId) => {
    setBusyId(candidateId);
    try {
      await pendingCandidateService.hireCandidate(candidateId, { process_id: processId });
      enqueueSnackbar(`${fullName} hired`, { variant: 'success' });
      await load();
    } catch (e) {
      enqueueSnackbar(e?.message || 'Hire failed', { variant: 'error' });
    } finally {
      setBusyId(null);
    }
  }, [enqueueSnackbar, load]);


  const reject = useCallback(async (candidateId, fullName, processId /*, roundNumber */) => {
    setBusyId(candidateId);
    try {
      await pendingCandidateService.rejectCandidate(candidateId, { process_id: processId });
      enqueueSnackbar(`${fullName} rejected from pool`, { variant: 'info' });
      await load();
    } catch (e) {
      enqueueSnackbar(e?.message || 'Reject failed', { variant: 'error' });
    } finally {
      setBusyId(null);
    }
  }, [enqueueSnackbar, load]);

  // ── Soft-delete: hide one / hide selected / undo ─────────────────────
  const _showUndoSnack = useCallback((items, count) => {
    const label = count === 1 ? '1 candidate removed' : `${count} candidates removed`;
    enqueueSnackbar(label, {
      variant: 'success',
      autoHideDuration: 5000,
      action: () => React.createElement(
        'button',
        {
          onClick: async () => {
            try {
              await pendingCandidateService.unhideCandidates(items);
              enqueueSnackbar('Restored', { variant: 'info' });
              await load();
            } catch (e) {
              enqueueSnackbar(e?.message || 'Restore failed', { variant: 'error' });
            }
          },
          style: {
            background: 'transparent', border: '1px solid rgba(255,255,255,0.5)',
            color: '#fff', padding: '4px 12px', borderRadius: 6, cursor: 'pointer',
            fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
          },
        },
        'Undo',
      ),
    });
  }, [enqueueSnackbar, load]);

  const hideOne = useCallback(async (c) => {
    const items = [{ process_id: c.process_id, candidate_id: c.candidate_id, round_number: c.round_number }];
    setHiding(true);
    try {
      await pendingCandidateService.hideCandidates(items);
      await load();
      _showUndoSnack(items, 1);
    } catch (e) {
      enqueueSnackbar(e?.message || 'Delete failed', { variant: 'error' });
    } finally {
      setHiding(false);
    }
  }, [enqueueSnackbar, load, _showUndoSnack]);

  const hideSelected = useCallback(async () => {
    const source = _sourceFor(activeTab);
    const items = source
      .filter(c => selectedKeys.has(_keyOf(c)))
      .map(c => ({ process_id: c.process_id, candidate_id: c.candidate_id, round_number: c.round_number }));
    if (!items.length) return;
    setHiding(true);
    try {
      await pendingCandidateService.hideCandidates(items);
      const count = items.length;
      clearSelection();
      await load();
      _showUndoSnack(items, count);
    } catch (e) {
      enqueueSnackbar(e?.message || 'Delete failed', { variant: 'error' });
    } finally {
      setHiding(false);
    }
  }, [activeTab, pending, hired, rejected, selectedKeys, enqueueSnackbar, load, clearSelection, _showUndoSnack]);

  return {
    activeTab, setActiveTab,
    candidates: filtered,
    jobs, stats,
    loading, error, busyId,
    search, setSearch,
    jobFilter, setJobFilter,
    poolFilter, setPoolFilter,
    sortBy, setSortBy,
    refresh: load,
    hire, reject,
    // ── Soft-delete API ──
    selectionMode, setSelectionMode,
    selectedKeys, toggleSelect, clearSelection, enterSelectionMode, selectAll,
    keyOf: _keyOf,
    hiding, hideOne, hideSelected,
  };
};

export default usePendingCandidates;