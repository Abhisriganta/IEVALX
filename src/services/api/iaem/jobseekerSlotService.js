// BUILD: 2026-08-25-iaem-jobseekerSlotService-v2
// Phase 3: Jobseeker slot booking — pooled slots, book, my bookings
// Backend endpoints: /api/iaem/jobseeker/*
import api from '../axiosInstance';

const BASE = '/iaem/jobseeker';

const pk = (id) => {
  if (typeof id === 'number') return id;
  const m = String(id).match(/(\d+)/);
  return m ? parseInt(m[1], 10) : id;
};

const jobseekerSlotService = {

  // ── Pooled available slots for a release ──────────────────────────────
  // GET /api/iaem/jobseeker/slots/<release_id>/
  // Accepts "REL-00005" or integer 5
  // Returns pooled (grouped by date+time), only slots with remaining > 0
  getAvailableSlots: (releaseId) =>
    api.get(`${BASE}/slots/${pk(releaseId)}/`),

  // ── Book a slot (atomic — 409 if slot already taken) ──────────────────
  // POST /api/iaem/jobseeker/slots/<release_id>/book/
  // Body: { date: "2026-08-25", time: "11:00 AM" }
  // If two jobseekers book the same slot simultaneously, only one succeeds (409 for the other)
  // If jobseeker already has a booking for this release, returns 400
  bookSlot: (releaseId, date, time) =>
    api.post(`${BASE}/slots/${pk(releaseId)}/book/`, { date, time }),

  // ── My IAEM bookings ──────────────────────────────────────────────────
  // GET /api/iaem/jobseeker/bookings/
  getMyBookings: () =>
    api.get(`${BASE}/bookings/`),

  // ── My available releases (rounds I can book) ─────────────────────────
  // GET /api/iaem/jobseeker/available-releases/
  // Returns releases where I'm a participant, haven't booked, and slots exist
  getMyAvailableReleases: () =>
    api.get(`${BASE}/available-releases/`),

  // ── Slot status (waiting room state) ───────────────────────────────
  // GET /api/iaem/jobseeker/slots/status/<slot_id>/
  // Returns slot state, meeting link, join/admit timestamps
  checkSlotStatus: (slotId) =>
    api.get(`${BASE}/slots/status/${slotId}/`),

  // ── Join waiting room ──────────────────────────────────────────────
  // POST /api/iaem/jobseeker/slots/status/<slot_id>/join/
  // Time-gated: opens 30 min before slot start, closes at slot end
  joinWaitingRoom: (slotId) =>
    api.post(`${BASE}/slots/status/${slotId}/join/`),

  // ── Request reschedule (Problem 1 — candidate can't attend) ────────
  // POST /api/iaem/jobseeker/bookings/<booking_id>/request-reschedule/
  requestReschedule: (bookingId, reason) =>
    api.post(`${BASE}/bookings/${bookingId}/request-reschedule/`, { reason }),
};

export default jobseekerSlotService;
