import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchFullProfile,
  updateAccountSection,
  updateCompanySection,
  updateAddressSection,
  updateSocialSection,
  changePassword as apiChangePassword,
  uploadDocument,
  replaceDocument,
  deleteDocument,
  fetchDocumentVerificationStatusByCompanyId,
} from '@/services/api/company/profileService';

export const useCompanyProfile = (companyId) => {
  const [data,        setData]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [saving,      setSaving]      = useState(false);
  const [saveError,   setSaveError]   = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(null);

  const load = useCallback(async () => {
  setLoading(true); setError(null);
  try {
    if (!companyId) {
      console.error('[useCompanyProfile] No companyId provided', { companyId });
      setError('No company ID provided. Please log in or register.');
      setLoading(false);
      return null;
    }
    const payload = await fetchFullProfile(companyId);
    setData(payload);
    return payload;
  } catch (err) {
    const msg = err.response?.data?.Error || err.message || 'Failed to load profile';
    console.error('[useCompanyProfile] load failed:', {
      companyId,
      status: err.response?.status,
      url: err.config?.url,
      responseData: err.response?.data,
      message: err.message,
    });
    setError(msg);
    setData(null);
    return null;
  } finally {
    setLoading(false);
  }
}, [companyId]);

    useEffect(() => { load(); }, [load]);

  const runSave = async (sectionKey, apiFn) => {
    setSaving(true); setSaveError(null); setSaveSuccess(null);
    try {
      await apiFn();
      await load();                          // refetch so UI reflects real DB state
      setSaveSuccess(sectionKey);
      return true;
    } catch (err) {
      const msg = err.response?.data?.Error || err.message || 'Save failed';
      setSaveError(msg);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const saveAccount  = (payload) => runSave('account',  () => updateAccountSection(companyId, payload));
  const saveCompany  = (payload) => runSave('company',  () => updateCompanySection(companyId, payload));
  const saveAddress  = (payload) => runSave('address',  () => updateAddressSection(companyId, payload));
  const saveSocial   = (payload) => runSave('social',   () => updateSocialSection(companyId, payload));
  const savePassword = (payload) => runSave('password', () => apiChangePassword(companyId, payload));

  const clearMessages = useCallback(() => {
  setSaveError(null);
  setSaveSuccess(null);
}, []);

  return {
    data, setData, loading, error,
    refetch: load,
    saving, saveError, saveSuccess, clearMessages,
    saveAccount, saveCompany, saveAddress, saveSocial, savePassword,
  };
};

export const useDocuments = (companyId, data, setData) => {
  const [busyDocKey, setBusyDocKey] = useState(null);
  const [error,      setError]      = useState(null);

  const refreshDocuments = async () => {
    try {
      const payload = await fetchFullProfile(companyId);
      setData(payload);
    } catch {
      /* swallow; the primary op already succeeded */
    }
  };

  const wrap = async (key, fn) => {
    setBusyDocKey(key); setError(null);
    try {
      await fn();
      await refreshDocuments();
    } catch (err) {
      setError(err.response?.data?.Error || err.message || 'Operation failed');
      throw err;
    } finally {
      setBusyDocKey(null);
    }
  };

  const upload  = (key, args)                  => wrap(key, () => uploadDocument(companyId, args));
  const replace = (key, documentId, args)      => wrap(key, () => replaceDocument(companyId, documentId, args));
  const remove  = (key, documentId)            => wrap(key, () => deleteDocument(companyId, documentId));

  return {
    busyDocKey, error,
    clearError: () => setError(null),
    upload, replace, remove,
  };
};

export const useDocumentVerificationStatus = (companyProfileId, { pollInterval = 30_000 } = {}) => {
  const [status,  setStatus]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const timerRef   = useRef(null);
  const mountedRef = useRef(true);

  const fetch = useCallback(async (isFirst = false) => {
    if (!companyProfileId) return;
    if (isFirst) setLoading(true);
    try {
      const data = await fetchDocumentVerificationStatusByCompanyId(companyProfileId);
      if (!mountedRef.current) return;
      setStatus(data);
      setError(null);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err.response?.data?.Error || err.message || 'Failed to fetch verification status');
    } finally {
      if (isFirst && mountedRef.current) setLoading(false);
    }
  }, [companyProfileId]);

  useEffect(() => {
    mountedRef.current = true;
    if (!companyProfileId) return;
    fetch(true);
    timerRef.current = setInterval(() => fetch(false), pollInterval);
    return () => {
      mountedRef.current = false;
      clearInterval(timerRef.current);
    };
  }, [fetch, companyProfileId, pollInterval]);

  const docStatusByType = {};
  if (status) {
    [...(status.Required_Documents || []), ...(status.Optional_Documents || [])].forEach(
      (d) => { docStatusByType[d.document_type] = d.status; },
    );
  }

  return {
    verificationStatus:  status?.Verification_Status  ?? null,
    isActivated:         status?.Is_Activated          ?? false,
    allRequiredVerified: status?.All_Required_Verified ?? false,
    anyRejected:         status?.Any_Required_Rejected ?? false,
    requiredDocs:        status?.Required_Documents    ?? [],
    optionalDocs:        status?.Optional_Documents    ?? [],
    docStatusByType,
    loading,
    error,
    refetch: () => fetch(false),
  };
};