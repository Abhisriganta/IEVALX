// ============================================================================
// useEmploymentEditor.js
// Employment form state, validation and per-entry persistence
// Location: src/hooks/jobseeker/useEmploymentEditor.js
// ============================================================================
//
// Mirrors useEducationEditor. Client-side validation matters more here,
// because the employment backend's update handler called .strip() on whatever
// arrived — a cleared field sent null and returned a 500 with a Python
// traceback. buildEmploymentPayload guarantees a string or an explicit null,
// and validateEmployment adds the cross-field rules the server never had:
// a joining date cannot be in the future, a notice period only describes a
// job you still hold, and a salary cannot overflow DECIMAL(15,2).
// ============================================================================

import { useState, useCallback, useMemo } from 'react';
import profileService from '@/services/api/jobseeker/profileService';
import { unwrapError } from '@/utils/apiError';
import {
  validateEmployment,
  hasErrors,
  mergeErrors,
} from '@/utils/profileValidation';

export const EMPTY_EMPLOYMENT = {
  employment_id: null,
  is_current_employment: true,
  employment_type: 'Full-time',
  total_experience_years: '',
  total_experience_months: '',
  company_name: '',
  job_title: '',
  joining_date_year: '',
  joining_date_month: '',
  salary_currency: '₹',
  current_salary: '',
  skills_used: '',
  job_profile: '',
  notice_period: '',
};

export const useEmploymentEditor = ({ candidateId, employment = [], onSaved }) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_EMPLOYMENT);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const isEditing = Boolean(form.employment_id);
  const isCurrent = form.is_current_employment !== false;

  /** Current role first, then most recent joining date. */
  const sorted = useMemo(
    () =>
      [...employment].sort((a, b) => {
        if (a.is_current_employment !== b.is_current_employment) {
          return a.is_current_employment ? -1 : 1;
        }
        const ay = Number(a.joining_date_year) || 0;
        const by = Number(b.joining_date_year) || 0;
        if (ay !== by) return by - ay;
        return (Number(b.joining_date_month) || 0) - (Number(a.joining_date_month) || 0);
      }),
    [employment],
  );

  const totalExperience = useMemo(() => {
    const months = employment.reduce(
      (sum, e) =>
        sum +
        (Number(e.total_experience_years) || 0) * 12 +
        (Number(e.total_experience_months) || 0),
      0,
    );
    if (!months) return null;
    const years = Math.floor(months / 12);
    const rem = months % 12;
    return [years && `${years} yr`, rem && `${rem} mo`].filter(Boolean).join(' ');
  }, [employment]);

  const setField = useCallback((field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      // A notice period only applies to a job you still hold.
      if (field === 'is_current_employment' && value === false) {
        next.notice_period = '';
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

  const openCreate = useCallback(() => {
    // The backend demotes other current roles on save; default the switch to
    // off when one already exists so the user is not surprised by that.
    const hasCurrent = employment.some((e) => e.is_current_employment);
    setForm({ ...EMPTY_EMPLOYMENT, is_current_employment: !hasCurrent });
    setFieldErrors({});
    setFormError('');
    setOpen(true);
  }, [employment]);

  const openEdit = useCallback((entry) => {
    setForm({
      ...EMPTY_EMPLOYMENT,
      ...Object.fromEntries(
        Object.keys(EMPTY_EMPLOYMENT).map((key) => [
          key,
          entry[key] ?? EMPTY_EMPLOYMENT[key],
        ]),
      ),
      employment_id: entry.employment_id,
      is_current_employment: entry.is_current_employment !== false,
    });
    setFieldErrors({});
    setFormError('');
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    if (saving) return;
    setOpen(false);
    setFieldErrors({});
    setFormError('');
  }, [saving]);

  const save = useCallback(async () => {
    const clientErrors = validateEmployment(form);
    if (hasErrors(clientErrors)) {
      setFieldErrors(clientErrors);
      setFormError('Please correct the highlighted fields.');
      return false;
    }

    setSaving(true);
    setFormError('');

    try {
      if (isEditing) {
        await profileService.employment.update(form.employment_id, form);
      } else {
        await profileService.employment.create(candidateId, form);
      }
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
  }, [form, isEditing, candidateId, onSaved]);

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete) return false;
    setDeleting(true);
    try {
      await profileService.employment.remove(pendingDelete.employment_id);
      setPendingDelete(null);
      await onSaved?.();
      return true;
    } catch (err) {
      setFormError(unwrapError(err).message);
      return false;
    } finally {
      setDeleting(false);
    }
  }, [pendingDelete, onSaved]);

  return {
    sorted,
    totalExperience,

    open,
    form,
    fieldErrors,
    formError,
    saving,
    isEditing,
    isCurrent,

    setField,
    openCreate,
    openEdit,
    close,
    save,

    pendingDelete,
    setPendingDelete,
    deleting,
    confirmDelete,
  };
};

export default useEmploymentEditor;
