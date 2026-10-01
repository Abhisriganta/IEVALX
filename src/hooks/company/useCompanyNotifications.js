
import { useSyncExternalStore, useEffect } from 'react';
import notificationsApi from '@/services/api/jobseeker/notificationsService';

const ROLE = 'company';
const POLL_INTERVAL_MS = 45_000;
const BUMP_STORAGE_KEY = 'ievalx_notif_bump_co';
const PAGE_SIZE = 10;

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
    if (String(u?.role || '').toLowerCase() !== ROLE) return null;
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

async function fetchAll(page) {
  const recipientId = getRecipientId();
  if (!recipientId) return;
  const currentPage = page ?? state.page;
  try {
    const [listResult, unreadCount] = await Promise.all([
      notificationsApi.list({ role: ROLE, recipientId, limit: PAGE_SIZE, offset: currentPage * PAGE_SIZE }),
      notificationsApi.unreadCount({ role: ROLE, recipientId }),
    ]);
    setState({
      notifications: listResult.items,
      totalCount: listResult.total,
      unreadCount,
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
  try { await notificationsApi.markRead(id); }
  catch { fetchAll(); }
};

export const markAllNotificationsRead = async () => {
  const recipientId = getRecipientId();
  if (!recipientId) return;
  setState((s) => ({
    notifications: s.notifications.map((n) => ({ ...n, unread: false })),
    unreadCount: 0,
  }));
  bumpAllTabs();
  try { await notificationsApi.markAllRead({ role: ROLE, recipientId }); }
  catch { fetchAll(); }
};

export const clearAllNotifications = async () => {
  const recipientId = getRecipientId();
  if (!recipientId) return;
  setState({ notifications: [], unreadCount: 0, totalCount: 0, page: 0 });
  bumpAllTabs();
  try { await notificationsApi.clearAll({ role: ROLE, recipientId }); }
  catch { fetchAll(0); }
};

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

export const useCompanyNotifications = () => {
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

export default useCompanyNotifications;