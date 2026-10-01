import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '@/services/api/axiosInstance';

export const AuthContext = createContext();

// Map role → endpoint that returns fresh user data (with fresh presigned URLs)
const REFRESH_ENDPOINT = {
  company:   (id) => `/companies/${id}/full-profile`,
  jobseeker: (id) => `/jobseeker/list/${id}`,
  employer:  ()   => `/employer/profile`,
};

const extractFreshFields = (role, payload) => {
  if (role === 'company') {
    const acct = payload?.account || {};
    return {
      full_name:         acct.full_name         ?? null,
      profile_image_url: acct.profile_image_url ?? null,
    };
  }

  if (role === 'jobseeker') {
    const c = payload?.candidate || payload?.data || payload || {};
    const full_name = [c.first_name, c.middle_name, c.last_name]
      .filter(Boolean)
      .map((s) => String(s).trim())
      .filter(Boolean)
      .join(' ') || null;
    return {
      full_name,
      email:             c.email             ?? null,
      phone:             c.phone_number      ?? c.phone ?? null,
      profile_image_url: c.profile_image_url ?? null,
    };
  }

  if (role === 'employer') {
    const d = payload?.data || payload || {};
    return {
      full_name:         d.full_name         ?? null,
      email:             d.email             ?? null,
      phone:             d.phone             ?? null,
      profile_image_url: d.profile_image_url ?? null,
      company_name:      d.company_name      ?? null,
    };
  }

  return {};
};

// Only overwrite fields the server actually returned (non-null).
// Prevents a partial response from wiping a field the login had set.
const mergeFresh = (prev, fresh) => {
  const out = { ...prev };
  for (const [k, v] of Object.entries(fresh)) {
    if (v !== null && v !== undefined) out[k] = v;
  }
  return out;
};

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  // Latest user, readable from event handlers without re-binding them on
  // every state change (window listeners registered once).
  const userRef = useRef(null);
  useEffect(() => { userRef.current = user; }, [user]);

  // ── Refetch fresh identity fields for the current role and merge them in ──
  const refreshUser = useCallback(async (currentUser) => {
    const target = currentUser || userRef.current;
    if (!target?.role) return;
    const builder = REFRESH_ENDPOINT[target.role];
    if (!builder) return;                          // roles without a refresh endpoint
    if (builder.length > 0 && !target.id) return;  // needs an id, don't have it

    try {
      const url = builder(target.id);
      const res = await api.get(url);
      const fresh = extractFreshFields(target.role, res.data);
      setUser((prev) => {
        const base   = prev || target;
        const merged = mergeFresh(base, fresh);
        localStorage.setItem('ievalx_user', JSON.stringify(merged));
        return merged;
      });
    } catch (err) {
      // A stale refresh must never log the user out or blank the topbar.
      console.warn('[AuthProvider] refreshUser failed:', err?.message);
    }
  }, []);

  // ── Optimistic merge (used by editors, cross-tab sync, and event listeners)
  const updateUser = useCallback((userData) => {
    if (!userData || typeof userData !== 'object') return;
    setUser((prev) => {
      const merged = { ...(prev || {}), ...userData };
      try {
        localStorage.setItem('ievalx_user', JSON.stringify(merged));
      } catch { /* quota / private mode — non-fatal */ }
      return merged;
    });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('ievalx_token');
    localStorage.removeItem('ievalx_user');
    localStorage.removeItem('currentCompanyId');
    localStorage.removeItem('ievalx_docs_blocked');
    // Topbar's separate avatar cache — clear it too so the next user
    // doesn't briefly see the previous user's photo.
    localStorage.removeItem('user_profile_image_url');
    localStorage.removeItem('user_profile_image_url_ts');
    setUser(null);
  }, []);

  // ── On app mount: hydrate from localStorage, then reconcile with server ──
  useEffect(() => {
    let stored = null;
    try {
      const raw = localStorage.getItem('ievalx_user');
      stored = raw ? JSON.parse(raw) : null;
    } catch { stored = null; }
    const token = localStorage.getItem('ievalx_token');
    if (stored && token) {
      setUser(stored);
      refreshUser(stored);
    }
    setLoading(false);
  }, [refreshUser]);

  // ── On window focus: refetch so an edit made on another device or tab
  //     surfaces the next time this tab regains attention.
  useEffect(() => {
    const onFocus = () => {
      if (userRef.current?.id) refreshUser(userRef.current);
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refreshUser]);

 
  useEffect(() => {
    const onProfileUpdated = (e) => {
      const detail = e?.detail || {};
      const patch = {};
      if (typeof detail.full_name === 'string') patch.full_name = detail.full_name;
      if (typeof detail.email     === 'string') patch.email     = detail.email;
      if (typeof detail.phone     === 'string') patch.phone     = detail.phone;
      if (Object.keys(patch).length) updateUser(patch);
      if (userRef.current?.role) refreshUser(userRef.current);
    };
    window.addEventListener('profile-updated', onProfileUpdated);
    return () => window.removeEventListener('profile-updated', onProfileUpdated);
  }, [updateUser, refreshUser]);

  
  useEffect(() => {
    const onImageUpdated = (e) => {
      const detail = e?.detail || {};
      if (detail.removed) {
        updateUser({ profile_image_url: null });
      } else if (typeof detail.url === 'string' && detail.url) {
        updateUser({ profile_image_url: detail.url });
      }
      if (userRef.current?.role) refreshUser(userRef.current);
    };
    window.addEventListener('profile-image-updated', onImageUpdated);
    return () => window.removeEventListener('profile-image-updated', onImageUpdated);
  }, [updateUser, refreshUser]);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== 'ievalx_user') return;
      if (!e.newValue) return;              // logout in another tab — ignore
      try {
        setUser(JSON.parse(e.newValue));
      } catch { /* corrupt blob — ignore */ }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const isAuthenticated = !!user;
  const role = user?.role || null;

  return (
    <AuthContext.Provider value={{
      user, loading, isAuthenticated, role,
      logout, updateUser, refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;