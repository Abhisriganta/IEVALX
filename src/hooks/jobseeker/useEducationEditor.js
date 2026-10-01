

import { useState, useCallback, useMemo } from 'react';
import profileService from '@/services/api/jobseeker/profileService';
import { unwrapError } from '@/utils/apiError';
import {
  validateEducation,
  hasErrors,
  mergeErrors,
} from '@/utils/profileValidation';
import {
  EDUCATION_LEVEL_OPTIONS,
  EDUCATION_LEVEL_RANK,
} from '@/constants/profileConstants';

export const EMPTY_EDUCATION = {
  education_id: null,
  education_level: '',
  board: '',
  passing_out_year: '',
  school_medium: '',
  marks: '',
  english_marks: '',
  maths_marks: '',
  university_institute: '',
  course: '',
  specialization: '',
  course_type: '',
  course_duration_start_year: '',
  course_duration_end_year: '',
  grading_system: '',
  other_education_details: '',
};

export const useEducationEditor = ({ candidateId, education = [], onSaved, dateOfBirth = null }) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_EDUCATION);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const isEditing = Boolean(form.education_id);

  /** Highest qualification first. */
  const sorted = useMemo(
    () =>
      [...education].sort(
        (a, b) =>
          (EDUCATION_LEVEL_RANK[a.education_level] ?? 99) -
          (EDUCATION_LEVEL_RANK[b.education_level] ?? 99),
      ),
    [education],
  );

  /** One entry per level is a hard database constraint. */
  const availableLevels = useMemo(() => {
    const used = education
      .filter((e) => e.education_id !== form.education_id)
      .map((e) => e.education_level);
    return EDUCATION_LEVEL_OPTIONS.filter((level) => !used.includes(level));
  }, [education, form.education_id]);

  const setField = useCallback((field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      // Re-validate live for year fields so duration errors show immediately
      if (field === 'course_duration_start_year' || field === 'course_duration_end_year') {
        const liveErrors = validateEducation(next, education, dateOfBirth);
        setFieldErrors((prevErr) => {
          const cleared = { ...prevErr };
          delete cleared.course_duration_start_year;
          delete cleared.course_duration_end_year;
          if (liveErrors.course_duration_start_year) cleared.course_duration_start_year = liveErrors.course_duration_start_year;
          if (liveErrors.course_duration_end_year) cleared.course_duration_end_year = liveErrors.course_duration_end_year;
          return cleared;
        });
      } else {
        // Clear the error the moment the user edits the field it belongs to.
        setFieldErrors((prevErr) => {
          if (!prevErr[field]) return prevErr;
          const cleared = { ...prevErr };
          delete cleared[field];
          return cleared;
        });
      }
      return next;
    });
  }, [education, dateOfBirth]);

  const openCreate = useCallback(() => {
    setForm(EMPTY_EDUCATION);
    setFieldErrors({});
    setFormError('');
    setOpen(true);
  }, []);

  const openEdit = useCallback((entry) => {
    setForm({
      ...EMPTY_EDUCATION,
      // Normalise nulls to '' so every input stays controlled.
      ...Object.fromEntries(
        Object.keys(EMPTY_EDUCATION).map((key) => [key, entry[key] ?? '']),
      ),
      education_id: entry.education_id,
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
    const clientErrors = validateEducation(form, education, dateOfBirth);
    if (hasErrors(clientErrors)) {
      setFieldErrors(clientErrors);
      setFormError('Please correct the highlighted fields.');
      return false;
    }

    setSaving(true);
    setFormError('');

    try {
      if (isEditing) {
        await profileService.education.update(form.education_id, form);
      } else {
        await profileService.education.create(candidateId, form);
      }
      setOpen(false);
      await onSaved?.();
      return true;
    } catch (err) {
      const { message, fieldErrors: serverErrors, isConflict } = unwrapError(err);
      setFieldErrors((prev) => mergeErrors(prev, serverErrors));
      setFormError(
        isConflict
          ? `You have already added ${form.education_level}. Edit that entry instead.`
          : message,
      );
      return false;
    } finally {
      setSaving(false);
    }
  }, [form, education, isEditing, candidateId, onSaved]);

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete) return false;
    setDeleting(true);
    try {
      await profileService.education.remove(pendingDelete.education_id);
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
    availableLevels,
    canAdd: availableLevels.length > 0,

    open,
    form,
    fieldErrors,
    formError,
    saving,
    isEditing,

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

export default useEducationEditor;
