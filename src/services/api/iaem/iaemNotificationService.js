
import api from '../axiosInstance';

const BASE = '/iaem/notifications';

const iaemNotificationService = {


  getNotifications: (params = {}) =>
    api.get(`${BASE}/`, { params }),

  // ── Mark single notification as read ──────────────────────────────────
  // POST /api/iaem/notifications/<id>/read/
  markAsRead: (notificationId) =>
    api.post(`${BASE}/${notificationId}/read/`),

  // ── Mark all as read ──────────────────────────────────────────────────
  // POST /api/iaem/notifications/read-all/
  // Returns: { success, marked: <count> }
  markAllAsRead: () =>
    api.post(`${BASE}/read-all/`),

  getUnreadCount: (params = {}) =>
    api.get(`${BASE}/unread-count/`, { params }),

  // ── Delete single notification ──────────────────────────────────────
  deleteOne: (notificationId) =>
    api.delete(`${BASE}/${notificationId}/delete/`),

  // ── Delete all notifications ────────────────────────────────────────
  deleteAll: () =>
    api.delete(`${BASE}/delete-all/`),
};

export default iaemNotificationService;
