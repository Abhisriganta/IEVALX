import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSnackbar } from 'notistack';
import finalHireService from '../../services/api/employer/finalHireService';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';

const useFinalHire = () => {
  const { enqueueSnackbar } = useSnackbar();

  const [hires,   setHires]   = useState([]);
  const [jobs,    setJobs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const [search,       setSearch]       = useState('');
  const [jobFilter,    setJobFilter]    = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy,       setSortBy]       = useState('recent');

  // ── Soft-delete / selection state ─────────────────────────────────────────
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds,   setSelectedIds]   = useState(new Set());
  const [hiding,        setHiding]        = useState(false);

  const toggleSelect = useCallback((recordId) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(recordId)) next.delete(recordId); else next.add(recordId);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  }, []);

  const enterSelectionMode = useCallback((recordId) => {
    setSelectionMode(true);
    if (recordId != null) setSelectedIds(new Set([recordId]));
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [hireRes, jobRes] = await Promise.all([
        finalHireService.getHires(),
        finalHireService.getJobOptions(),
      ]);
      setHires(hireRes.data || []);
      setJobs(jobRes.data || []);
    } catch (err) {
      setError(err?.message || 'Failed to load hires');
    } finally {
      setLoading(false);
    }
  }, []);

 useEffect(() => { fetchAll(); }, [fetchAll]);
  useRefetchOnFocus(fetchAll);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = hires.filter(c => {
      const matchSearch = !q
        || c.full_name.toLowerCase().includes(q)
        || c.email.toLowerCase().includes(q)
        || c.job_title.toLowerCase().includes(q)
        || (c.skills || []).some(s => s.toLowerCase().includes(q));
      const matchJob    = jobFilter    === 'all' || String(c.job_id) === String(jobFilter);
      const matchStatus = statusFilter === 'all' || c.offer_status === statusFilter;
      return matchSearch && matchJob && matchStatus;
    });

    if (sortBy === 'score')        list = [...list].sort((a, b) => (b.overall_cps || 0) - (a.overall_cps || 0));
    else if (sortBy === 'name')    list = [...list].sort((a, b) => a.full_name.localeCompare(b.full_name));
    else if (sortBy === 'joining') list = [...list].sort((a, b) => new Date(a.joining_date || 0) - new Date(b.joining_date || 0));
    else                           list = [...list].sort((a, b) => new Date(b.hired_date || 0) - new Date(a.hired_date || 0));
    return list;
  }, [hires, search, jobFilter, statusFilter, sortBy]);

  const stats = useMemo(() => {
    const total    = hires.length;
    const joined   = hires.filter(c => c.offer_status === 'joined').length;
    const accepted = hires.filter(c => c.offer_status === 'accepted').length;
    const extended = hires.filter(c => c.offer_status === 'extended').length;

    const cpsVals = hires.map(c => c.overall_cps).filter(v => v != null);
    const avgCps  = cpsVals.length
      ? Math.round((cpsVals.reduce((a, b) => a + b, 0) / cpsVals.length) * 10) / 10
      : null;

    const tthVals = hires.map(c => c.timeToHireDays).filter(v => v != null);
    const avgTimeToHire = tthVals.length
      ? Math.round(tthVals.reduce((a, b) => a + b, 0) / tthVals.length)
      : null;

    return { total, joined, accepted, extended, avgCps, avgTimeToHire };
  }, [hires]);

  // ── Soft-delete actions ───────────────────────────────────────────────────
  const _showUndoSnack = useCallback((ids, count) => {
    const label = count === 1 ? '1 hire removed' : `${count} hires removed`;
    enqueueSnackbar(label, {
      variant: 'success',
      autoHideDuration: 5000,
      action: () => React.createElement(
        'button',
        {
          onClick: async () => {
            try {
              await finalHireService.unhideHires(ids);
              enqueueSnackbar('Restored', { variant: 'info' });
              await fetchAll();
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
        'Undo'
      ),
    });
  }, [enqueueSnackbar, fetchAll]);

  const hideOne = useCallback(async (recordId) => {
    setHiding(true);
    try {
      await finalHireService.hideHires([recordId]);
      await fetchAll();
      _showUndoSnack([recordId], 1);
    } catch (e) {
      enqueueSnackbar(e?.message || 'Delete failed', { variant: 'error' });
    } finally {
      setHiding(false);
    }
  }, [enqueueSnackbar, fetchAll, _showUndoSnack]);

  const hideSelected = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    setHiding(true);
    try {
      await finalHireService.hideHires(ids);
      const count = ids.length;
      clearSelection();
      await fetchAll();
      _showUndoSnack(ids, count);
    } catch (e) {
      enqueueSnackbar(e?.message || 'Delete failed', { variant: 'error' });
    } finally {
      setHiding(false);
    }
  }, [selectedIds, enqueueSnackbar, fetchAll, clearSelection, _showUndoSnack]);

  return {
    hires: filtered, jobs, stats, loading, error,
    search, setSearch,
    jobFilter, setJobFilter,
    statusFilter, setStatusFilter,
    sortBy, setSortBy,
    refresh: fetchAll,
    // ── Soft-delete API ──
    selectionMode, setSelectionMode,
    selectedIds, setSelectedIds, toggleSelect, clearSelection, enterSelectionMode,
    hiding, hideOne, hideSelected,
  };
};

export default useFinalHire;