import { useState, useEffect, useCallback, useRef } from 'react';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import adminService from '@/services/api/company/adminService';
const getBackendError = (err, fallback) => {
  return err?.response?.data?.Error
    || err?.response?.data?.message
    || err?.response?.data?.error
    || err?.message
    || fallback;
};

const useEmployers = ({ formOpen = false } = {}) => {
  const [employers, setEmployers] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  // Guard against setState after unmount (prevents React warnings on fast nav).
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchEmployers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminService.getEmployers();
      // Backend returns { Company_Id, Total_Employers, results: [...] }
      const list = res?.data?.results || res?.data || [];
      if (mountedRef.current) setEmployers(list);
      return list;
    } catch (err) {
      const msg = getBackendError(err, 'Failed to load employers.');
      if (mountedRef.current) setError(msg);
      throw err;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployers().catch(() => { /* error already captured in state */ });
  }, [fetchEmployers]);

  useRefetchOnFocus(fetchEmployers, { enabled: !formOpen });

  // ── Add ──────────────────────────────────────────────────────────────────
  const addEmployer = useCallback(async (payload) => {
    try {
      const res = await adminService.addEmployer(payload);
      const newEmp = res?.data?.data || {
        id: Date.now(),
        ...payload,
        status: 'PENDING',
        active_jobs: 0,
        joined: new Date().toISOString(),
      };
      const emailSent = res?.data?.email_sent;

      if (mountedRef.current) {
        setEmployers((prev) => [newEmp, ...prev]);
      }
      return { data: newEmp, emailSent };
    } catch (err) {
      err.friendlyMessage = getBackendError(err, 'Failed to add employer.');
      throw err;
    }
  }, []);

  // ── Update ───────────────────────────────────────────────────────────────
  const updateEmployer = useCallback(async (id, patch) => {
    try {
      const res = await adminService.updateEmployer(id, patch);
      const updated = res?.data?.data || { id, ...patch };

      if (mountedRef.current) {
        setEmployers((prev) =>
          prev.map((e) => (e.id === id ? { ...e, ...updated } : e))
        );
      }
      return updated;
    } catch (err) {
      err.friendlyMessage = getBackendError(err, 'Failed to update employer.');
      throw err;
    }
  }, []);

  // ── Toggle status (optimistic) ───────────────────────────────────────────
  const toggleStatus = useCallback(async (emp) => {
    if (!emp?.id) throw new Error('toggleStatus called without a valid employer.');
    try {
      const res = await adminService.toggleEmployerStatus(emp.id);
      const newStatus = res?.data?.status
        || (emp.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE');

      if (mountedRef.current) {
        setEmployers((prev) =>
          prev.map((e) => (e.id === emp.id ? { ...e, status: newStatus } : e))
        );
      }
      return newStatus;
    } catch (err) {
      err.friendlyMessage = getBackendError(err, 'Failed to update status.');
      throw err;
    }
  }, []);

  // ── Remove ───────────────────────────────────────────────────────────────
  const removeEmployer = useCallback(async (id) => {
    try {
      await adminService.removeEmployer(id);
      if (mountedRef.current) {
        setEmployers((prev) => prev.filter((e) => e.id !== id));
      }
    } catch (err) {
      err.friendlyMessage = getBackendError(err, 'Failed to remove employer.');
      throw err;
    }
  }, []);

  return {
    employers,
    loading,
    error,
    refetch: fetchEmployers,
    addEmployer,
    updateEmployer,
    toggleStatus,
    removeEmployer,
  };
};

export default useEmployers;