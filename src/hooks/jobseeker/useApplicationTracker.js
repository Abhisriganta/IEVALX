

import { useState, useEffect, useCallback } from 'react';
import careerService from '@/services/api/jobseeker/careerService';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';

export const useApplicationTracker = (initialFilters = { status: 'all' }) => {
  const [applications, setApplications] = useState([]);
  const [filters,      setFilters]      = useState(initialFilters);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);

  const fetchApplications = useCallback(async (currentFilters = filters) => {
    setLoading(true);
    setError(null);
    try {
      const data = await careerService.getApplicationTracker(currentFilters);
      setApplications(data);
    } catch (err) {
      setError(err.message || 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const updateStatus = useCallback(async (applicationId, status) => {
    try {
      await careerService.updateApplicationStatus(applicationId, status);
      setApplications((prev) =>
        prev.map((a) => (a.id === applicationId ? { ...a, status } : a))
      );
    } catch (err) {
      setError(err.message || 'Status update failed');
      throw err;
    }
  }, []);

  const setFilterStatus = useCallback((status) => {
    const next = { ...filters, status };
    setFilters(next);
    fetchApplications(next);
  }, [filters, fetchApplications]);

  useEffect(() => {
    fetchApplications();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useRefetchOnFocus(fetchApplications);

  return {
    applications,
    filters,
    loading,
    error,
    refetch: fetchApplications,
    updateStatus,
    setFilterStatus,
  };
};

export default useApplicationTracker;