// BUILD: 2026-08-25-iaem-coachingService-v2
// Phase 9: Coaching Library — HR CRUD for coaching resources
// Backend endpoints: /api/iaem/hr/coaching/*
import api from '../axiosInstance';

const BASE = '/iaem/hr/coaching';

const pk = (id) => {
  if (typeof id === 'number') return id;
  const m = String(id).match(/(\d+)/);
  return m ? parseInt(m[1], 10) : id;
};

const coachingService = {

  // ── List coaching resources ───────────────────────────────────────────
  // GET /api/iaem/hr/coaching/?category=JD_SCOPE_ALIGNMENT&signal=A3
  // Returns: { resources: [{ id, title, description, category, format, link,
  //            estimated_duration, relevant_signals, created_at }] }
  getResources: (filters = {}) =>
    api.get(`${BASE}/`, { params: filters }),

  // ── Create resource ───────────────────────────────────────────────────
  // POST /api/iaem/hr/coaching/create/
  // Required: title, description, category, format, link, estimated_duration
  // Optional: relevant_signals (array of signal codes like ['A3', 'A4'])
  createResource: (data) =>
    api.post(`${BASE}/create/`, data),

  // ── Update resource ───────────────────────────────────────────────────
  // PATCH /api/iaem/hr/coaching/{id}/
  updateResource: (id, data) =>
    api.patch(`${BASE}/${pk(id)}/`, data),

  // ── Delete resource ───────────────────────────────────────────────────
  // DELETE /api/iaem/hr/coaching/{id}/delete/
  deleteResource: (id) =>
    api.delete(`${BASE}/${pk(id)}/delete/`),
};

export default coachingService;
