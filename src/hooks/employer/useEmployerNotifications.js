

import { useSyncExternalStore, useEffect } from 'react';
import notificationsApi from '@/services/api/jobseeker/notificationsService';
import iaemNotificationService from '@/services/api/iaem/iaemNotificationService';

const ROLE = 'employer';
const POLL_INTERVAL_MS = 45_000;
const BUMP_STORAGE_KEY = 'ievalx_notif_bump_emp';

// BUILD: 2026-08-07-notif-pagination-v1
const PAGE_SIZE = 10;

// ── IAEM normalizer — maps IAEM notifications to the same shape ──
const _relTime = (iso) => {
  if (!iso) return '';
  const t = new Date(String(iso).replace(' ', 'T'));
  if (isNaN(t)) return '';
  const s = Math.max(0, (Date.now() - t.getTime()) / 1000);
  if (s < 60) return 'Just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'Yesterday';
  if (d < 7) return `${d} days ago`;
  return t.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};
const _normalizeIAEM = (row) => ({
  id: `iaem_${row.id}`,
  kind: 'interview',
  unread: !row.is_read,
  time: _relTime(row.created_at),
  title: row.title,
  body: row.message,
  actionUrl: row.action_url || null,
  createdAt: row.created_at,
  typeCode: row.type_code,
  _iaem: true,
});

let state = {
  notifications: [], unreadCount: 0, totalCount: 0,
  page: 0,
  loading: false, error: null, initialized: false,
};

const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn());
const setState = (patch) => {
  state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) };
  emit();
};
const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const getSnapshot = () => state;

const getRecipientId = () => {
  try {
    const raw = localStorage.getItem('ievalx_user');
    if (!raw) return null;
    const u = JSON.parse(raw);
    const role = String(u?.role || '').toLowerCase();
    // Both 'employer' and 'company' users' bells consume the same account row
    // (they share tbl_employer_account) — this hook is only for `employer`.
    if (role !== ROLE) return null;
    return u?.id ?? null;
  } catch { return null; }
};

const bumpAllTabs = () => {
  try { localStorage.setItem(BUMP_STORAGE_KEY, String(Date.now())); } catch {}
};
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === BUMP_STORAGE_KEY) { fetchAll(); }
  });
}

// BUILD: 2026-08-07-notif-pagination-v1
async function fetchAll(page) {
  const recipientId = getRecipientId();
  if (!recipientId) return;
  const currentPage = page ?? state.page;
  try {
    const [listResult, unreadCount, iaemRes, iaemUnread] = await Promise.all([
      notificationsApi.list({ role: ROLE, recipientId, limit: PAGE_SIZE, offset: currentPage * PAGE_SIZE }),
      notificationsApi.unreadCount({ role: ROLE, recipientId }),
      iaemNotificationService.getNotifications({ role: 'EMPLOYER', page: currentPage + 1, page_size: PAGE_SIZE })
        .then((r) => r.data)
        .catch(() => ({ notifications: [], total: 0 })),
      iaemNotificationService.getUnreadCount({ role: 'EMPLOYER' })
        .then((r) => r.data?.unread_count || 0)
        .catch(() => 0),
    ]);
    const iaemItems = (iaemRes.notifications || []).map(_normalizeIAEM);
    const merged = [...listResult.items, ...iaemItems].sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
    );
    setState({
      notifications: merged,
      totalCount: listResult.total + (iaemRes.total || 0),
      unreadCount: unreadCount + iaemUnread,
      page: currentPage,
      initialized: true,
      error: null,
    });
  } catch (err) {
    setState({ error: err?.message || 'Failed to load notifications',
               initialized: true });
  }
}

export const markNotificationRead = async (id) => {
  setState((s) => {
    const target = s.notifications.find((n) => n.id === id);
    if (!target || !target.unread) return {};
    return {
      notifications: s.notifications.map((n) =>
        n.id === id ? { ...n, unread: false } : n),
      unreadCount: Math.max(0, s.unreadCount - 1),
    };
  });
  bumpAllTabs();
  try {
    if (typeof id === 'string' && id.startsWith('iaem_')) {
      await iaemNotificationService.markAsRead(id.replace('iaem_', ''));
    } else {
      await notificationsApi.markRead(id);
    }
  } catch { fetchAll(); }
};

export const markAllNotificationsRead = async () => {
  const recipientId = getRecipientId();
  if (!recipientId) return;
  setState((s) => ({
    notifications: s.notifications.map((n) => ({ ...n, unread: false })),
    unreadCount: 0,
  }));
  bumpAllTabs();
  try {
    await Promise.all([
      notificationsApi.markAllRead({ role: ROLE, recipientId }),
      iaemNotificationService.markAllAsRead().catch(() => {}),
    ]);
  } catch { fetchAll(); }
};

// BUILD: 2026-08-07-notif-clearall-v1
export const clearAllNotifications = async () => {
  const recipientId = getRecipientId();
  if (!recipientId) return;
  setState({ notifications: [], unreadCount: 0, totalCount: 0, page: 0 });
  bumpAllTabs();
  try { await notificationsApi.clearAll({ role: ROLE, recipientId }); }
  catch { fetchAll(0); }
};

// BUILD: 2026-08-07-notif-pagination-v1
export const goToPage = (page) => fetchAll(page);

export const refreshNotifications = () => fetchAll();

let pollTimer = null;
let refCount = 0;
const startPolling = () => {
  if (pollTimer) return;
  fetchAll();
  pollTimer = setInterval(fetchAll, POLL_INTERVAL_MS);
};
const stopPolling = () => {
  if (!pollTimer) return;
  clearInterval(pollTimer);
  pollTimer = null;
};

export const useEmployerNotifications = () => {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => {
    refCount += 1;
    if (refCount === 1) startPolling();
    return () => {
      refCount = Math.max(0, refCount - 1);
      if (refCount === 0) stopPolling();
    };
  }, []);

  return {
    notifications: snap.notifications,
    unreadCount:   snap.unreadCount,
    totalCount:    snap.totalCount,
    page:          snap.page,
    pageSize:      PAGE_SIZE,
    loading:       snap.loading,
    error:         snap.error,
    initialized:   snap.initialized,
    markRead:      markNotificationRead,
    markAllRead:   markAllNotificationsRead,
    clearAll:      clearAllNotifications,
    goToPage,
    refresh:       refreshNotifications,
  };
};

export default useEmployerNotifications;