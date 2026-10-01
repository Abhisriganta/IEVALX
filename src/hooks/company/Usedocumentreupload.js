import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchRejectedDocuments,
  replaceDocument,
  uploadDocument,
} from '@/services/api/company/profileService';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';

export const DOC_GATE_KEY = 'ievalx_docs_gate';

export const setDocGate = (destination) => {
  if (destination && destination !== 'dashboard') {
    localStorage.setItem(DOC_GATE_KEY, destination);
  } else {
    localStorage.removeItem(DOC_GATE_KEY);
  }
};

export const getDocGate = () => localStorage.getItem(DOC_GATE_KEY) || null;
export const isDocGateSet = () => Boolean(getDocGate());

const decide = (data) => {
  if (data?.Requires_Reupload) return 'reupload';
  if (data?.All_Required_Verified) return 'dashboard';
  return 'review';
};


export const checkDocumentGate = async (companyId) => {
  if (!companyId) return { destination: 'dashboard', count: 0 };
  try {
    const data = await fetchRejectedDocuments(companyId);
    const destination = decide(data);
    setDocGate(destination);
    return {
      destination,
      count: data?.Action_Required_Count ?? data?.Rejected_Count ?? 0,
    };
  } catch {
    setDocGate('dashboard');
    return { destination: 'dashboard', count: 0 };
  }
};

const errText = (e, fallback) =>
  e?.response?.data?.Error || e?.response?.data?.message || e?.message || fallback;

export default function useDocumentReupload(companyId) {
  const [documents, setDocuments] = useState([]);
  const [companyName, setCompanyName] = useState('');
  const [requiredSummary, setRequiredSummary] = useState([]);
  const [destination, setDestination] = useState('review');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploadingId, setUploadingId] = useState(null);
  const [toast, setToast] = useState(null);

  // True until the first fetch resolves. Opening the file picker blurs the
  // window; closing it refires 'focus' and refetches. If that refetch flipped
  // `loading` back on, the card list would be swapped for a spinner and the
  // hidden <input> destroyed before its change event was delivered — the file
  // would silently never upload. Refetches after the first update in place.
  const firstLoadRef = useRef(true);

  const load = useCallback(async () => {
    if (!companyId) { setLoading(false); return; }
    if (firstLoadRef.current) setLoading(true);
    setError(null);
    try {
      const data = await fetchRejectedDocuments(companyId);
      setDocuments(data?.Rejected_Documents || []);
      setCompanyName(data?.Company_Name || '');
      setRequiredSummary(data?.Required_Documents || []);
      const next = decide(data);
      setDestination(next);
      setDocGate(next);
    } catch (e) {
      setError(errText(e, 'Could not load your document status. Try again in a moment.'));
    } finally {
      firstLoadRef.current = false;
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { load(); }, [load]);
  useRefetchOnFocus(load, !uploadingId);

  // doc.id === null means the row was deleted outright — there is nothing to
  // replace, so it has to go through the create endpoint instead.
  const reupload = async (doc, file) => {
    const isNew = doc?.id == null;
    setUploadingId(isNew ? doc.document_type : doc.id);
    try {
      if (isNew) {
        await uploadDocument(companyId, {
          type: doc.document_type,
          title: doc.document_title || doc.document_type,
          file,
        });
      } else {
        await replaceDocument(companyId, doc.id, { file });
      }
      await load();
      setToast({
        severity: 'success',
        message: isNew
          ? 'Document uploaded. It is now with the review team.'
          : 'Document replaced. It is back with the review team.',
      });
      return true;
    } catch (e) {
      setToast({ severity: 'error', message: errText(e, 'That upload did not go through.') });
      return false;
    } finally {
      setUploadingId(null);
    }
  };

  return {
    documents, companyName, requiredSummary, destination,
    loading, error, uploadingId, toast,
    setToast, reupload, refetch: load,
  };
}