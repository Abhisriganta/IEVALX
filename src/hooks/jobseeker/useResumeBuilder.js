// ============================================================================
// useResumeBuilder.js
// Hook for the Resume Builder workspace screen.
// Owns: Career Profile + Recent Resumes + Resume Scan (file/drag/drop/validate/scan).
// Location: src/hooks/jobseeker/useResumeBuilder.js
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import workspaceService from '@/services/api/jobseeker/workspaceService';
import resumeScanService from '@/services/api/jobseeker/resumeScanService';

// ── File-validation rules (used by the scan section) ───────────────────────
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const ALLOWED_EXT = ['.pdf', '.doc', '.docx'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

const validateResumeFile = (file) => {
  const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
  const typeOk = ALLOWED_TYPES.includes(file.type) || ALLOWED_EXT.includes(ext);
  if (!typeOk) return 'Only PDF, DOC, or DOCX files are allowed.';
  if (file.size > MAX_SIZE) return 'File size must be under 5MB.';
  if (file.size === 0) return 'File appears to be empty.';
  return null;
};

export const useResumeBuilder = () => {
  // ── Career Profile + Recent Resumes state ────────────────────────────────
  const [profile, setProfile]   = useState({ currentRole: '', expertise: '' });
  const [resumes, setResumes]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [saving,  setSaving]    = useState(false);
  const [creating, setCreating] = useState(false);
  const [error,   setError]     = useState(null);

  // ── Resume Scan state ────────────────────────────────────────────────────
  const [scanFile,    setScanFile]    = useState(null);
  const [dragActive,  setDragActive]  = useState(false);
  const [scanning,    setScanning]    = useState(false);
  const [scanResult,  setScanResult]  = useState(null);
  const [scanError,   setScanError]   = useState(null);   // transient — read+cleared by parent
  const [scanSuccess, setScanSuccess] = useState(null);   // transient — read+cleared by parent

  // ── Career Profile + Recent Resumes ──────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, r] = await Promise.all([
        workspaceService.getCareerProfile(),
        workspaceService.getRecentResumes(),
      ]);
      setProfile(p);
      setResumes(r);
    } catch (err) {
      setError(err.message || 'Failed to load resume builder');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfileField = useCallback((field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  }, []);

  const saveProfile = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const result = await workspaceService.saveCareerProfile(profile);
      return result;
    } catch (err) {
      setError(err.message || 'Save failed');
      throw err;
    } finally {
      setSaving(false);
    }
  }, [profile]);

  const createResume = useCallback(async (filename) => {
    setCreating(true);
    setError(null);
    try {
      const created = await workspaceService.createResume(filename);
      setResumes((prev) => [created, ...prev]);
      return created;
    } catch (err) {
      setError(err.message || 'Create failed');
      throw err;
    } finally {
      setCreating(false);
    }
  }, []);

  const deleteResume = useCallback(async (resumeId) => {
    try {
      await workspaceService.deleteResume(resumeId);
      setResumes((prev) => prev.filter((r) => r.id !== resumeId));
    } catch (err) {
      setError(err.message || 'Delete failed');
      throw err;
    }
  }, []);

  // ── Resume Scan: file selection + drag-drop ──────────────────────────────
  const clearScanMessages = useCallback(() => {
    setScanError(null);
    setScanSuccess(null);
  }, []);

  const selectScanFile = useCallback((file) => {
    const err = validateResumeFile(file);
    if (err) {
      setScanError(err);
      return;
    }
    setScanFile(file);
    setScanResult(null);
  }, []);

  const handleScanDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleScanDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleScanDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      const file = e.dataTransfer.files?.[0];
      if (file) selectScanFile(file);
    },
    [selectScanFile]
  );

  const runScan = useCallback(async () => {
    if (!scanFile || scanning) return;
    setScanning(true);
    setScanResult(null);
    try {
      const result = await resumeScanService.scanResume(scanFile);
      setScanResult(result);
      setScanSuccess('Resume scan complete.');
    } catch {
      setScanError('Scan failed. Please try again.');
    } finally {
      setScanning(false);
    }
  }, [scanFile, scanning]);

  const resetScan = useCallback(() => {
    setScanFile(null);
    setScanResult(null);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    // Career Profile + Recent Resumes
    profile,
    resumes,
    loading,
    saving,
    creating,
    error,
    refetch: fetchAll,
    updateProfileField,
    saveProfile,
    createResume,
    deleteResume,

    // Resume Scan
    scanFile,
    dragActive,
    scanning,
    scanResult,
    scanError,
    scanSuccess,
    clearScanMessages,
    selectScanFile,
    handleScanDragOver,
    handleScanDragLeave,
    handleScanDrop,
    runScan,
    resetScan,
  };
};

export default useResumeBuilder;