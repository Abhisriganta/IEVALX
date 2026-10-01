// ============================================================================
// useAccomplishmentEditor.js
// Accomplishments and certifications — form state and per-entry persistence
// Location: src/hooks/jobseeker/useAccomplishmentEditor.js
// ============================================================================
//
// Six types share one table with different field sets, so the form shape
// changes with the type picker. accomplishmentFieldsFor() decides which
// inputs render; buildAccomplishmentPayload() sends only those fields, so a
// value left over from a previously selected type never reaches the API.
//
// The type cannot be changed on an existing entry — every other column means
// something different per type, so switching would silently reinterpret the
// row. The backend rejects it too.
// ============================================================================

import { useState, useCallback, useMemo } from 'react';
import profileService from '@/services/api/jobseeker/profileService';
import { unwrapError } from '@/utils/apiError';
import {
  validateAccomplishment,
  accomplishmentFieldsFor,
  hasErrors,
  mergeErrors,
} from '@/utils/profileValidation';
import {
  ACCOMPLISHMENT_TYPES,
  MAX_ACCOMPLISHMENTS_PER_CANDIDATE,
} from '@/constants/profileConstants';

export const EMPTY_ACCOMPLISHMENT = {
  accomplishment_id: null,
  accomplishment_type: '',
  title: '',
  url: '',
  description: '',
  social_profile: '',
  duration_from_year: '',
  duration_from_month: '',
  duration_to_year: '',
  duration_to_month: '',
  currently_working: false,
  published_on_year: '',
  published_on_month: '',
  patent_office: '',
  patent_status: '',
  application_number: '',
  issue_date_year: '',
  issue_date_month: '',
  certification_name: '',
  issuing_organisation: '',
  certification_url: '',
  validity_from_date: '',
  validity_to_date: '',
  does_not_expire: false,
};

/**
 * @param {'certifications'|'accomplishments'} variant
 *   Which tab this editor drives. Certifications are a fixed type; the other
 *   tab lets the user choose from the remaining five.
 */
export const useAccomplishmentEditor = ({
  variant = 'accomplishments',
  candidateId,
  items = [],
  onSaved,
  dateOfBirth = null,
}) => {
  const isCertificationTab = variant === 'certifications';

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_ACCOMPLISHMENT);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const isEditing = Boolean(form.accomplishment_id);

  /** Only the rows belonging to this tab. */
  const visible = useMemo(
    () =>
      items.filter((item) =>
        isCertificationTab
          ? item.accomplishment_type === ACCOMPLISHMENT_TYPES.CERTIFICATION
          : item.accomplishment_type !== ACCOMPLISHMENT_TYPES.CERTIFICATION,
      ),
    [items, isCertificationTab],
  );

  const sorted = useMemo(
    () =>
      [...visible].sort(
        (a, b) => (Number(b.accomplishment_id) || 0) - (Number(a.accomplishment_id) || 0),
      ),
    [visible],
  );

  const atLimit = items.length >= MAX_ACCOMPLISHMENTS_PER_CANDIDATE;

  /** Which inputs to render for the currently selected type. */
  const shownFields = useMemo(
    () => accomplishmentFieldsFor(form.accomplishment_type),
    [form.accomplishment_type],
  );

  const setField = useCallback((field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      // An ongoing item has no end date; a certificate that never expires has
      // no expiry. Clear them as the box is ticked rather than at save time,
      // so the form matches what will be stored.
      if (field === 'currently_working' && value) {
        next.duration_to_year = '';
        next.duration_to_month = '';
      }
      if (field === 'does_not_expire' && value) {
        next.validity_to_date = '';
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
    setForm({
      ...EMPTY_ACCOMPLISHMENT,
      accomplishment_type: isCertificationTab ? ACCOMPLISHMENT_TYPES.CERTIFICATION : '',
    });
    setFieldErrors({});
    setFormError('');
    setOpen(true);
  }, [isCertificationTab]);

  const openEdit = useCallback((entry) => {
    setForm({
      ...EMPTY_ACCOMPLISHMENT,
      ...Object.fromEntries(
        Object.keys(EMPTY_ACCOMPLISHMENT).map((key) => [
          key,
          entry[key] ?? EMPTY_ACCOMPLISHMENT[key],
        ]),
      ),
      accomplishment_id: entry.accomplishment_id,
      currently_working: Boolean(entry.currently_working),
      does_not_expire: Boolean(entry.does_not_expire),
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
    const clientErrors = validateAccomplishment(form, dateOfBirth);
    if (hasErrors(clientErrors)) {
      setFieldErrors(clientErrors);
      setFormError('Please correct the highlighted fields.');
      return false;
    }

    setSaving(true);
    setFormError('');
    try {
      if (isEditing) {
        await profileService.accomplishments.update(form.accomplishment_id, form);
      } else {
        await profileService.accomplishments.create(candidateId, form);
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
      await profileService.accomplishments.remove(pendingDelete.accomplishment_id);
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
    atLimit,
    isCertificationTab,

    open,
    form,
    fieldErrors,
    formError,
    saving,
    isEditing,
    shownFields,
    shows: (field) => shownFields.has(field),

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

export default useAccomplishmentEditor;
