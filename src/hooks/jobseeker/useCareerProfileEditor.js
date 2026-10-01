// ============================================================================
// useCareerProfileEditor.js
// Career preferences form state and persistence
// Location: src/hooks/jobseeker/useCareerProfileEditor.js
// ============================================================================
//
// Career preferences is a single row per candidate that the user edits as a
// whole, so there is one save rather than per-entry CRUD.
//
// The SET columns (desired_job_type, desired_employment_type) travel as arrays
// in both directions — the rebuilt backend serialises them as lists and takes
// them as lists — so nothing here deals with comma joining. Membership is
// checked client-side because an unrecognised value used to reach MySQL as
// error 1265 and surface as a 500 that named nothing.
// ============================================================================

import { useState, useCallback, useEffect, useMemo } from 'react';
import profileService from '@/services/api/jobseeker/profileService';
import { unwrapError } from '@/utils/apiError';
import {
  validateCareerProfile,
  splitCsv,
  hasErrors,
  mergeErrors,
} from '@/utils/profileValidation';
import { MAX_PREFERRED_LOCATIONS } from '@/constants/profileConstants';

export const EMPTY_CAREER_PROFILE = {
  current_industry: '',
  department: '',
  role_category: '',
  job_role: '',
  desired_job_type: [],
  desired_employment_type: [],
  preferred_shift: '',
  preferred_work_location: [],
  salary_currency: '₹',
  expected_salary: '',
};

/** Server row -> form values. Nulls become '' so inputs stay controlled. */
function toForm(record) {
  if (!record) return { ...EMPTY_CAREER_PROFILE };
  return {
    current_industry: record.current_industry ?? '',
    department: record.department ?? '',
    role_category: record.role_category ?? '',
    job_role: record.job_role ?? '',
    desired_job_type: splitCsv(record.desired_job_type),
    desired_employment_type: splitCsv(record.desired_employment_type),
    preferred_shift: record.preferred_shift ?? '',
    preferred_work_location: splitCsv(record.preferred_work_location),
    salary_currency: record.salary_currency || '₹',
    expected_salary:
      record.expected_salary === null || record.expected_salary === undefined
        ? ''
        : String(record.expected_salary),
  };
}

export const useCareerProfileEditor = ({ candidateId, career, onSaved }) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(() => toForm(career));
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  // Track a refresh that happened elsewhere, but never clobber an open form.
  useEffect(() => {
    if (!open) setForm(toForm(career));
  }, [career, open]);

  const hasAnything = useMemo(
    () =>
      Boolean(
        career &&
          (career.current_industry ||
            career.department ||
            career.role_category ||
            career.job_role ||
            career.preferred_shift ||
            career.expected_salary ||
            splitCsv(career.desired_job_type).length ||
            splitCsv(career.preferred_work_location).length),
      ),
    [career],
  );

  const setField = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  /** Add or remove one value from a multi-select field. */
  const toggleValue = useCallback((field, value) => {
    setForm((prev) => {
      const current = Array.isArray(prev[field]) ? prev[field] : [];
      const exists = current.includes(value);
      return {
        ...prev,
        [field]: exists ? current.filter((v) => v !== value) : [...current, value],
      };
    });
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const locationsRemaining =
    MAX_PREFERRED_LOCATIONS - (form.preferred_work_location?.length || 0);

  const openEditor = useCallback(() => {
    setForm(toForm(career));
    setFieldErrors({});
    setFormError('');
    setOpen(true);
  }, [career]);

  const close = useCallback(() => {
    if (saving) return;
    setOpen(false);
    setFieldErrors({});
    setFormError('');
  }, [saving]);

  const save = useCallback(async () => {
    const clientErrors = validateCareerProfile(form);
    if (hasErrors(clientErrors)) {
      setFieldErrors(clientErrors);
      setFormError('Please correct the highlighted fields.');
      return false;
    }

    setSaving(true);
    setFormError('');
    try {
      await profileService.career.save(candidateId, form);
      setOpen(false);
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
  }, [form, candidateId, onSaved]);

  const clear = useCallback(async () => {
    setClearing(true);
    try {
      await profileService.career.remove(candidateId);
      setConfirmClear(false);
      setForm({ ...EMPTY_CAREER_PROFILE });
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
    hasAnything,
    locationsRemaining,

    setField,
    toggleValue,
    openEditor,
    close,
    save,

    confirmClear,
    setConfirmClear,
    clearing,
    clear,
  };
};

export default useCareerProfileEditor;
