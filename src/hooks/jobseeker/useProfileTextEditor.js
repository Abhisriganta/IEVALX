// ============================================================================
// useProfileTextEditor.js
// Shared editor for the single-text profile sections (headline, summary)
// Location: src/hooks/jobseeker/useProfileTextEditor.js
// ============================================================================
//
// Resume headline and profile summary are the same interaction: one textarea,
// a character budget, a save and a clear. One hook, parameterised by kind.
//
// Both backends now upsert on save, so there is no create-versus-update
// branch here. The original modules refused POST with "already exists, use
// PUT", which is what forced callers to know whether a row existed before
// picking a verb.
// ============================================================================

import { useState, useCallback, useEffect, useMemo } from 'react';
import profileService from '@/services/api/jobseeker/profileService';
import { unwrapError } from '@/utils/apiError';
import {
  validateResumeHeadline,
  validateProfileSummary,
  hasErrors,
  mergeErrors,
  cleanStr,
} from '@/utils/profileValidation';
import {
  PROFILE_SUMMARY_MAX,
  PROFILE_SUMMARY_MIN,
  RESUME_HEADLINE_MAX,
  RESUME_HEADLINE_MIN_WORDS,
} from '@/constants/profileConstants';

const KINDS = {
  headline: {
    field: 'resume_headline',
    max: RESUME_HEADLINE_MAX,
    validate: validateResumeHeadline,
    api: 'headline',
    label: 'Resume headline',
  },
  summary: {
    field: 'profile_summary',
    max: PROFILE_SUMMARY_MAX,
    min: PROFILE_SUMMARY_MIN,
    validate: validateProfileSummary,
    api: 'summary',
    label: 'Profile summary',
  },
};

/**
 * @param {'headline'|'summary'} kind
 */
export const useProfileTextEditor = ({ kind, candidateId, record, onSaved }) => {
  const config = KINDS[kind];
  if (!config) throw new Error(`useProfileTextEditor: unknown kind "${kind}"`);

  const stored = record?.[config.field] || '';

  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(stored);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  // Keep the closed form in step with a refresh that happened elsewhere.
  useEffect(() => {
    if (!open) setValue(stored);
  }, [stored, open]);

  const charsUsed = value.length;
  const charsLeft = config.max - charsUsed;

  const wordCount = useMemo(
    () => value.split(/\s+/).filter(Boolean).length,
    [value],
  );

  /** Live guidance under the textarea — states the rule, not a scold. */
  const helper = useMemo(() => {
    if (kind === 'headline') {
      return wordCount < RESUME_HEADLINE_MIN_WORDS
        ? `${wordCount} of ${RESUME_HEADLINE_MIN_WORDS} words minimum`
        : `${charsUsed} / ${config.max} characters`;
    }
    return charsUsed < (config.min || 0)
      ? `${charsUsed} of ${config.min} characters minimum`
      : `${charsUsed} / ${config.max} characters`;
  }, [kind, wordCount, charsUsed, config.max, config.min]);

  const onChange = useCallback((next) => {
    setValue(next);
    setFieldErrors((prev) => {
      if (!prev[config.field]) return prev;
      const copy = { ...prev };
      delete copy[config.field];
      return copy;
    });
  }, [config.field]);

  const openEditor = useCallback(() => {
    setValue(stored);
    setFieldErrors({});
    setFormError('');
    setOpen(true);
  }, [stored]);

  const close = useCallback(() => {
    if (saving) return;
    setOpen(false);
    setFieldErrors({});
    setFormError('');
  }, [saving]);

  const save = useCallback(async () => {
    const clientErrors = config.validate(value);
    if (hasErrors(clientErrors)) {
      setFieldErrors(clientErrors);
      setFormError('Please correct the highlighted field.');
      return false;
    }

    setSaving(true);
    setFormError('');
    try {
      await profileService[config.api].save(candidateId, cleanStr(value));
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
  }, [config, value, candidateId, onSaved]);

  const clear = useCallback(async () => {
    setClearing(true);
    try {
      await profileService[config.api].remove(candidateId);
      setConfirmClear(false);
      setValue('');
      await onSaved?.();
      return true;
    } catch (err) {
      setFormError(unwrapError(err).message);
      return false;
    } finally {
      setClearing(false);
    }
  }, [config.api, candidateId, onSaved]);

  return {
    label: config.label,
    field: config.field,
    max: config.max,
    stored,

    open,
    value,
    error: fieldErrors[config.field] || '',
    formError,
    saving,
    charsUsed,
    charsLeft,
    wordCount,
    helper,

    onChange,
    openEditor,
    close,
    save,

    confirmClear,
    setConfirmClear,
    clearing,
    clear,
  };
};

export default useProfileTextEditor;
