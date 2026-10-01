
import { useState, useEffect, useCallback } from 'react';
import workspaceService from '@/services/api/jobseeker/workspaceService';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';

export const useMyProjects = () => {
  const [projects, setProjects] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await workspaceService.getMyProjects();
      setProjects(data);
    } catch (err) {
      setError(err.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, []);

  const createProject = useCallback(async (project) => {
    setSaving(true);
    try {
      const created = await workspaceService.createProject(project);
      setProjects((prev) => [created, ...prev]);
      return created;
    } catch (err) {
      setError(err.message || 'Create failed');
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  const updateProject = useCallback(async (projectId, updates) => {
    setSaving(true);
    try {
      const updated = await workspaceService.updateProject(projectId, updates);
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, ...updates } : p))
      );
      return updated;
    } catch (err) {
      setError(err.message || 'Update failed');
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  const deleteProject = useCallback(async (projectId) => {
    try {
      await workspaceService.deleteProject(projectId);
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
    } catch (err) {
      setError(err.message || 'Delete failed');
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);
  useRefetchOnFocus(fetchProjects);

  return {
    projects,
    loading,
    saving,
    error,
    refetch: fetchProjects,
    createProject,
    updateProject,
    deleteProject,
  };
};

export default useMyProjects;
