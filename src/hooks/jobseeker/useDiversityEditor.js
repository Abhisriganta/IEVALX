// ============================================================================
// useDiversityEditor.js
// Diversity & inclusion — form state, document upload and persistence
// Location: src/hooks/jobseeker/useDiversityEditor.js
// ============================================================================
//
// This section is entirely optional and holds medical information. Two things
// follow from that:
//
//   * Nothing here is required. The form opens with everything blank and the
//     rules only apply once an answer selects a branch.
//
//   * Choosing "Do not have disability", "Never served" or "Have not taken"
//     clears the fields those answers make irrelevant, so a value entered
//     before the user changed their mind does not persist and reappear.
// ============================================================================

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import profileService from '@/services/api/jobseeker/profileService';
import { unwrapError } from '@/utils/apiError';
import {
  validateDiversity,
  hasErrors,
  mergeErrors,
} from '@/utils/profileValidation';
import {
  DIVERSITY_MAX_DOC_SIZE,
  DIVERSITY_ALLOWED_EXTENSIONS,
} from '@/constants/profileConstants';

export const EMPTY_DIVERSITY = {
  disability_status: '',
  disability_type: '',
  disability_percentage: '',
  disability_reason: '',
  certificate_type: '',

  military_status: '',
  service_type: '',
  service_number: '',
  enrolment_day: '',
  enrolment_month: '',
  enrolment_year: '',
  discharge_day: '',
  discharge_month: '',
  discharge_year: '',

  career_break_status: '',
  break_reason: '',
  break_from_month: '',
  break_from_year: '',
  break_till_month: '',
  break_till_year: '',
  currently_on_break: false,
};

const asText = (value) =>
  value === null || value === undefined ? '' : String(value);

function toForm(record) {
  if (!record) return { ...EMPTY_DIVERSITY };
  const form = {};
  Object.keys(EMPTY_DIVERSITY).forEach((key) => {
    form[key] = key === 'currently_on_break'
      ? Boolean(record[key])
      : asText(record[key]);
  });
  return form;
}

const extensionOf = (name = '') =>
  name.includes('.') ? name.split('.').pop().toLowerCase() : '';

export function validateDiversityDoc(file) {
  if (!file) return null;

  const extension = extensionOf(file.name);
  if (!DIVERSITY_ALLOWED_EXTENSIONS.includes(extension)) {
    return `Accepted formats: ${DIVERSITY_ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(', ')}`;
  }
  if (file.size === 0) return 'That file is empty';
  if (file.size > DIVERSITY_MAX_DOC_SIZE) {
    return `That file is larger than ${Math.round(DIVERSITY_MAX_DOC_SIZE / (1024 * 1024))}MB`;
  }
  return null;
}
export const useDiversityEditor = ({ candidateId, diversity, onSaved, dateOfBirth = null }) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(() => toForm(diversity));
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [pendingFile, setPendingFile] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  const fileInputRef = useRef(null);

  // Track a refresh that happened elsewhere, but never clobber an open form.
  useEffect(() => {
    if (!open) setForm(toForm(diversity));
  }, [diversity, open]);

  const hasAnything = useMemo(
    () =>
      Boolean(
        diversity &&
          (diversity.disability_status ||
            diversity.military_status ||
            diversity.career_break_status),
      ),
    [diversity],
  );

  const hasDocument = Boolean(diversity?.has_document);
  const documentName = diversity?.document?.original_filename || '';
  const documentUrl = profileService.diversity.documentUrl(candidateId);

  /** Which branches of the form are open, given the current answers. */
  const shows = useMemo(() => ({
    disabilityDetails: form.disability_status === 'Have disability',
    serviceDates: form.military_status && form.military_status !== 'Never served',
    dischargeDates: form.military_status === 'Previously served',
    breakDetails: form.career_break_status === 'Have taken',
  }), [form.disability_status, form.military_status, form.career_break_status]);

  const setField = useCallback((field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'currently_on_break' && value) {
        next.break_till_month = '';
        next.break_till_year = '';
      }
      if (field === 'military_status' && value === 'Currently serving') {
        next.discharge_day = '';
        next.discharge_month = '';
        next.discharge_year = '';
      }
      return next;
    });
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const pickFile = useCallback(() => {
    setFormError('');
    fileInputRef.current?.click();
  }, []);

  const onFileChange = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const error = validateDiversityDoc(file);
    if (error) {
      setFieldErrors((prev) => ({ ...prev, disability_proof_doc: error }));
      setPendingFile(null);
    } else {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.disability_proof_doc;
        return next;
      });
      setPendingFile(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const clearPendingFile = useCallback(() => setPendingFile(null), []);

  const openEditor = useCallback(() => {
    setForm(toForm(diversity));
    setPendingFile(null);
    setFieldErrors({});
    setFormError('');
    setOpen(true);
  }, [diversity]);

  const close = useCallback(() => {
    if (saving) return;
    setOpen(false);
    setPendingFile(null);
    setFieldErrors({});
    setFormError('');
  }, [saving]);

  const save = useCallback(async () => {
    const clientErrors = validateDiversity(form, dateOfBirth);
    if (hasErrors(clientErrors)) {
      setFieldErrors(clientErrors);
      setFormError('Please correct the highlighted fields.');
      return false;
    }

    setSaving(true);
    setFormError('');
    try {
      await profileService.diversity.save(candidateId, form, pendingFile);
      setOpen(false);
      setPendingFile(null);
      await onSaved?.();
      return true;
    } catch (err) {
      const { message, fieldErrors: serverErrors } = unwrapError(err);
      setFieldErrors((prev) => mergeErrors(prev, serverErrors));
      setFormError(message);
      return false;
    } finally {
      setSaving(false);
    }
  }, [form, pendingFile, candidateId, onSaved]);

  const clear = useCallback(async () => {
    setClearing(true);
    try {
      await profileService.diversity.remove(candidateId);
      setConfirmClear(false);
      setForm({ ...EMPTY_DIVERSITY });
      await onSaved?.();
      return true;
    } catch (err) {
      setFormError(unwrapError(err).message);
      return false;
    } finally {
      setClearing(false);
    }
  }, [candidateId, onSaved]);

  return {
    form,
    fieldErrors,
    formError,
    saving,
    open,
    shows,
    hasAnything,

    hasDocument,
    documentName,
    documentUrl,
    fileInputRef,
    pendingFile,
    pickFile,
    onFileChange,
    clearPendingFile,

    setField,
    openEditor,
    close,
    save,

    confirmClear,
    setConfirmClear,
    clearing,
    clear,
  };
};

export default useDiversityEditor;
