/**
 * Support Ticket Service — shared across jobseeker, employer, company roles
 *
 * Location: src/services/api/supportTicketService.js
 * Backend:  core/platform_admin/user_support_ticket.py
 */
import axiosInstance from './axiosInstance';

const BASE = '/support/tickets';

// ── Raise a new ticket (multipart: fields + attachments[]) ──────────
export const raiseTicket = async (fields, files = []) => {
  const fd = new FormData();
  fd.append('category', fields.category);
  fd.append('subject', fields.subject);
  fd.append('description', fields.description);
  if (fields.priority)            fd.append('priority', fields.priority);
  if (fields.related_content_type) fd.append('related_content_type', fields.related_content_type);
  if (fields.related_content_id)   fd.append('related_content_id', fields.related_content_id);
  files.forEach((f) => fd.append('attachments', f));

  const res = await axiosInstance.post(BASE, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  });
  return res.data;
};

// ── List my tickets ─────────────────────────────────────────────────
export const listMyTickets = async ({ status, page = 1, limit = 20 } = {}) => {
  const params = { page, limit };
  if (status) params.status = status;
  const res = await axiosInstance.get(`${BASE}/list`, { params });
  return res.data;
};

// ── Get ticket detail (ticket + responses + attachments) ────────────
export const getTicketDetail = async (ticketId) => {
  const res = await axiosInstance.get(`${BASE}/${ticketId}`);
  return res.data;
};

// ── Reply to a ticket (multipart: message + attachments[]) ──────────
export const replyToTicket = async (ticketId, message, files = []) => {
  const fd = new FormData();
  fd.append('message', message);
  files.forEach((f) => fd.append('attachments', f));

  const res = await axiosInstance.post(`${BASE}/${ticketId}/reply`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  });
  return res.data;
};

// ── Close ticket ────────────────────────────────────────────────────
export const closeTicket = async (ticketId) => {
  const res = await axiosInstance.post(`${BASE}/${ticketId}/close`);
  return res.data;
};

// ── Reopen ticket ───────────────────────────────────────────────────
export const reopenTicket = async (ticketId) => {
  const res = await axiosInstance.post(`${BASE}/${ticketId}/reopen`);
  return res.data;
};

// ── Upload attachments to an existing ticket ────────────────────────
export const uploadAttachments = async (ticketId, files) => {
  const fd = new FormData();
  files.forEach((f) => fd.append('attachments', f));

  const res = await axiosInstance.post(`${BASE}/${ticketId}/attachments`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  });
  return res.data;
};

// ── Delete an attachment ────────────────────────────────────────────
export const deleteAttachment = async (attachmentId) => {
  const res = await axiosInstance.delete(`${BASE}/attachments/${attachmentId}`);
  return res.data;
};

export default {
  raiseTicket,
  listMyTickets,
  getTicketDetail,
  replyToTicket,
  closeTicket,
  reopenTicket,
  uploadAttachments,
  deleteAttachment,
};