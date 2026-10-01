// ============================================================================
// workspaceService.js - Service for the Workspace section
// (Resume Builder + My Projects)
// Location: src/services/api/jobseeker/workspaceService.js
//
// Changes:
//   [REMOVED] getCareerProfile, saveCareerProfile — Career Profile section dropped
//   [CHANGED] getRecentResumes — now calls resumeAiService.listSessions (real backend)
//   [CHANGED] deleteResume     — now calls resumeAiService.deleteSession (real backend)
//   [UNCHANGED] createResume, getMyProjects, createProject, updateProject, deleteProject
// ============================================================================

import resumeAiService, { getCandidateId } from '@/services/api/jobseeker/resumeAiService';
import { myProjectsMock } from '@/mocks/jobseeker/workspace.mock';

const MOCK_DELAY_MS = 350;
const mockReturn = (data) =>
  new Promise((resolve) => setTimeout(() => resolve(data), MOCK_DELAY_MS));

const workspaceService = {
  // ── Recent Resumes — real backend via resume-builder sessions ─────────────
  // listSessions returns: { sessions: [{ session_id, session_name, created_at, updated_at, ats_score? }] }
  // We map to the shape RecentResumes.jsx expects: { id, filename, createdAt, atsScore }
  getRecentResumes: async () => {
    try {
      const candidateId = getCandidateId();
      if (!candidateId) throw new Error('Candidate ID not found — user may not be logged in.');

      const data = await resumeAiService.listSessions(candidateId);
      const sessions = data?.sessions || data?.results || [];

      // Filter out any stale "Clone of …" sessions left from the old variant system.
      // Going forward clones are never created, but existing DBs may still have them.
      const filtered = sessions.filter(
        (s) => !((s.session_name || '').startsWith('Clone of'))
      );

      // Sort newest first (backend may not guarantee order)
      const sorted = [...filtered].sort(
        (a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at)
      );

      return sorted.map((s) => ({
        id:        s.session_id,
        filename:  s.session_name || s.filename || 'Untitled Resume',
        createdAt: s.updated_at   || s.created_at || new Date().toISOString(),
        atsScore:  s.ats_score    ?? null,   // null = not yet scored; UI will hide the badge
      }));
    } catch (error) {
      console.error('[workspaceService] getRecentResumes error:', error);
      throw error;
    }
  },

  // ── Delete Resume — delegates to real session delete ──────────────────────
  deleteResume: async (sessionId) => {
    try {
      return await resumeAiService.deleteSession(sessionId);
    } catch (error) {
      console.error('[workspaceService] deleteResume error:', error);
      throw error;
    }
  },

  // ── My Projects — still mock (unchanged) ──────────────────────────────────
  getMyProjects: async () => {
    try {
      return await mockReturn(myProjectsMock);
    } catch (error) {
      console.error('[workspaceService] getMyProjects error:', error);
      throw error;
    }
  },

  createProject: async (project) => {
    try {
      return await mockReturn({ ...project, id: 'proj-' + Date.now() });
    } catch (error) {
      console.error('[workspaceService] createProject error:', error);
      throw error;
    }
  },

  updateProject: async (projectId, updates) => {
    try {
      return await mockReturn({ projectId, ...updates });
    } catch (error) {
      console.error('[workspaceService] updateProject error:', error);
      throw error;
    }
  },

  deleteProject: async (projectId) => {
    try {
      return await mockReturn({ projectId, deleted: true });
    } catch (error) {
      console.error('[workspaceService] deleteProject error:', error);
      throw error;
    }
  },
};

export default workspaceService;