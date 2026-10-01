/**
 * useSupportTickets — hook for the Support Tickets page
 *
 * Location: src/hooks/useSupportTickets.js
 * Drives: src/components/<role>/SupportTickets/SupportTickets.jsx
 */
import { useState, useEffect, useCallback } from 'react';
import {
  raiseTicket,
  listMyTickets,
  getTicketDetail,
  replyToTicket,
  closeTicket as apiClose,
  reopenTicket as apiReopen,
  deleteAttachment as apiDeleteAtt,
} from '@/services/api/supportTicketService';

const EMPTY_FORM = {
  category: '',
  subject: '',
  description: '',
  priority: 'NORMAL',
  related_content_type: '',
  related_content_id: '',
};

export default function useSupportTickets() {
  // ── View state ──────────────────────────────────────────────────────
  const [view, setView] = useState('list');          // 'list' | 'raise' | 'detail'
  const [statusFilter, setStatusFilter] = useState('');

  // ── List state ──────────────────────────────────────────────────────
  const [tickets, setTickets] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [listLoading, setListLoading] = useState(false);

  // ── Detail state ────────────────────────────────────────────────────
  const [detail, setDetail] = useState(null);         // { ticket, responses, attachments, raiserName }
  const [detailLoading, setDetailLoading] = useState(false);

  // ── Form state ──────────────────────────────────────────────────────
  const [form, setForm] = useState(EMPTY_FORM);
  const [formFiles, setFormFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // ── Reply state ─────────────────────────────────────────────────────
  const [replyText, setReplyText] = useState('');
  const [replyFiles, setReplyFiles] = useState([]);
  const [replying, setReplying] = useState(false);

  // ── Feedback ────────────────────────────────────────────────────────
  const [toast, setToast] = useState(null);           // { severity, message }
  const [error, setError] = useState(null);

  // ── Counts (derived from full list fetch) ───────────────────────────
  const [counts, setCounts] = useState({
    all: 0, open: 0, in_progress: 0, awaiting_user: 0, resolved: 0, closed: 0,
  });

  // ────────────────────────────────────────────────────────────────────
  // FETCH LIST
  // ────────────────────────────────────────────────────────────────────
  const fetchList = useCallback(async () => {
    setListLoading(true);
    setError(null);
    try {
      const data = await listMyTickets({ status: statusFilter, page, limit: 20 });
      setTickets(data.tickets || []);
      setTotal(data.total || 0);

      // Also fetch unfiltered to get counts
      if (statusFilter) {
        const all = await listMyTickets({ page: 1, limit: 1000 });
        _deriveCounts(all.tickets || []);
      } else {
        _deriveCounts(data.tickets || []);
      }
    } catch (e) {
      setError(e?.response?.data?.Error || e.message || 'Failed to load tickets');
    } finally {
      setListLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => { fetchList(); }, [fetchList]);
  useEffect(() => { setPage(1); }, [statusFilter]);

  function _deriveCounts(list) {
    const c = { all: list.length, open: 0, in_progress: 0, awaiting_user: 0, resolved: 0, closed: 0 };
    list.forEach((t) => {
      const s = (t.status || '').toLowerCase().replace(/ /g, '_');
      if (s in c) c[s]++;
    });
    setCounts(c);
  }

  // ────────────────────────────────────────────────────────────────────
  // FETCH DETAIL
  // ────────────────────────────────────────────────────────────────────
  const openDetail = useCallback(async (ticketId) => {
    setDetailLoading(true);
    setView('detail');
    setReplyText('');
    setReplyFiles([]);
    try {
      const data = await getTicketDetail(ticketId);
      setDetail(data);
    } catch (e) {
      setToast({ severity: 'error', message: e?.response?.data?.Error || 'Could not load ticket' });
      setView('list');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  // ────────────────────────────────────────────────────────────────────
  // RAISE TICKET
  // ────────────────────────────────────────────────────────────────────
  const submitTicket = useCallback(async () => {
    if (!form.category || !form.subject.trim() || !form.description.trim()) {
      setToast({ severity: 'error', message: 'Please fill in all required fields' });
      return false;
    }
    setSubmitting(true);
    try {
      const data = await raiseTicket(form, formFiles);
      setToast({ severity: 'success', message: `Ticket ${data.ticketNumber} raised successfully` });
      setForm(EMPTY_FORM);
      setFormFiles([]);
      setView('list');
      fetchList();
      return true;
    } catch (e) {
      setToast({ severity: 'error', message: e?.response?.data?.Error || 'Failed to raise ticket' });
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [form, formFiles, fetchList]);

  // ────────────────────────────────────────────────────────────────────
  // REPLY
  // ────────────────────────────────────────────────────────────────────
  const sendReply = useCallback(async () => {
    if (!replyText.trim()) return;
    setReplying(true);
    try {
      await replyToTicket(detail.ticket.id, replyText, replyFiles);
      setReplyText('');
      setReplyFiles([]);
      // Refresh detail
      const data = await getTicketDetail(detail.ticket.id);
      setDetail(data);
      setToast({ severity: 'success', message: 'Reply sent' });
    } catch (e) {
      setToast({ severity: 'error', message: e?.response?.data?.Error || 'Failed to send reply' });
    } finally {
      setReplying(false);
    }
  }, [replyText, replyFiles, detail]);

  // ────────────────────────────────────────────────────────────────────
  // CLOSE / REOPEN
  // ────────────────────────────────────────────────────────────────────
  const closeTicketAction = useCallback(async (ticketId) => {
    try {
      await apiClose(ticketId);
      setToast({ severity: 'success', message: 'Ticket closed' });
      if (detail?.ticket?.id === ticketId) {
        const data = await getTicketDetail(ticketId);
        setDetail(data);
      }
      fetchList();
    } catch (e) {
      setToast({ severity: 'error', message: e?.response?.data?.Error || 'Failed to close ticket' });
    }
  }, [detail, fetchList]);

  const reopenTicketAction = useCallback(async (ticketId) => {
    try {
      await apiReopen(ticketId);
      setToast({ severity: 'success', message: 'Ticket reopened' });
      if (detail?.ticket?.id === ticketId) {
        const data = await getTicketDetail(ticketId);
        setDetail(data);
      }
      fetchList();
    } catch (e) {
      setToast({ severity: 'error', message: e?.response?.data?.Error || 'Failed to reopen ticket' });
    }
  }, [detail, fetchList]);

  // ────────────────────────────────────────────────────────────────────
  // DELETE ATTACHMENT
  // ────────────────────────────────────────────────────────────────────
  const deleteAttachment = useCallback(async (attachmentId) => {
    try {
      await apiDeleteAtt(attachmentId);
      if (detail) {
        const data = await getTicketDetail(detail.ticket.id);
        setDetail(data);
      }
      setToast({ severity: 'success', message: 'Attachment deleted' });
    } catch (e) {
      setToast({ severity: 'error', message: e?.response?.data?.Error || 'Failed to delete' });
    }
  }, [detail]);

  // ────────────────────────────────────────────────────────────────────
  // FORM HELPERS
  // ────────────────────────────────────────────────────────────────────
  const updateForm = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const addFormFiles = (newFiles) => {
    setFormFiles((prev) => {
      const combined = [...prev, ...newFiles];
      return combined.slice(0, 5); // max 5
    });
  };
  const removeFormFile = (idx) => setFormFiles((prev) => prev.filter((_, i) => i !== idx));

  const addReplyFiles = (newFiles) => {
    setReplyFiles((prev) => [...prev, ...newFiles].slice(0, 5));
  };
  const removeReplyFile = (idx) => setReplyFiles((prev) => prev.filter((_, i) => i !== idx));

  const goToList = () => { setView('list'); setDetail(null); };
  const goToRaise = () => { setView('raise'); setForm(EMPTY_FORM); setFormFiles([]); };

  return {
    // View
    view, setView, goToList, goToRaise,

    // List
    tickets, total, page, setPage, counts,
    statusFilter, setStatusFilter,
    listLoading,

    // Detail
    detail, detailLoading, openDetail,

    // Form
    form, updateForm, formFiles, addFormFiles, removeFormFile,
    submitting, submitTicket,

    // Reply
    replyText, setReplyText, replyFiles, addReplyFiles, removeReplyFile,
    replying, sendReply,

    // Actions
    closeTicketAction, reopenTicketAction, deleteAttachment,

    // Feedback
    toast, setToast, error,
  };
}