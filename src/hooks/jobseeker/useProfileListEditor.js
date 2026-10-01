// ============================================================================
// useProfileListEditor.js
// Per-entry editor for the repeating profile sections
// Location: src/hooks/jobseeker/useProfileListEditor.js
// ============================================================================
//
// Key skills, languages and projects are the same interaction: a list of
// rows, a dialog to add or edit one, and a confirm to remove one. One hook,
// parameterised by kind.
//
// PER-ENTRY, NEVER DELETE-ALL-THEN-RE-ADD
// The previous editor deleted every row and re-added them in a loop. With the
// rebuilt backends deleting physically, a failure partway through destroys
// everything after it. Each row is created, updated or removed on its own.
// ============================================================================

import { useState, useCallback, useMemo } from 'react';
import profileService from '@/services/api/jobseeker/profileService';
import { unwrapError } from '@/utils/apiError';
import {
  validateSkill,
  validateLanguage,
  validateProject,
  hasErrors,
  mergeErrors,
} from '@/utils/profileValidation';
import {
  LANGUAGE_PROFICIENCY,
  MAX_SKILLS_PER_CANDIDATE,
  MAX_LANGUAGES_PER_CANDIDATE,
  MAX_PROJECTS_PER_CANDIDATE,
} from '@/constants/profileConstants';

export const EMPTY_SKILL = {
  skill_id: null,
  skill_name: '',
  software_version: '',
  last_used: '',
  experience_years: '',
  experience_months: '',
};

export const EMPTY_LANGUAGE = {
  language_id: null,
  language_name: '',
  proficiency: '',
  can_read: false,
  can_write: false,
  can_speak: false,
};

export const EMPTY_PROJECT = {
  project_id: null,
  project_title: '',
  tag_employment_education: '',
  client: '',
  project_status: 'In progress',
  worked_from_year: '',
  worked_from_month: '',
  details_of_project: '',
  project_location: '',
  project_site: '',
  nature_of_employment: '',
  team_size: '',
  role: '',
  role_description: '',
  skills_used: '',
  github_url: '',
  live_link: '',
};

/** Strongest proficiency first, then alphabetical — how a recruiter scans. */
const PROFICIENCY_RANK = Object.fromEntries(
  LANGUAGE_PROFICIENCY.map((p, i) => [p, LANGUAGE_PROFICIENCY.length - i]),
);

const KINDS = {
  skills: {
    api: 'skills',
    idField: 'skill_id',
    empty: EMPTY_SKILL,
    validate: validateSkill,
    max: MAX_SKILLS_PER_CANDIDATE,
    label: 'skill',
    nameOf: (e) => e.skill_name,
    sort: (a, b) =>
      (Number(b.experience_years) || 0) - (Number(a.experience_years) || 0) ||
      (Number(b.experience_months) || 0) - (Number(a.experience_months) || 0) ||
      String(a.skill_name || '').localeCompare(String(b.skill_name || '')),
  },
  languages: {
    api: 'languages',
    idField: 'language_id',
    empty: EMPTY_LANGUAGE,
    validate: validateLanguage,
    max: MAX_LANGUAGES_PER_CANDIDATE,
    label: 'language',
    nameOf: (e) => e.language_name,
    sort: (a, b) =>
      (PROFICIENCY_RANK[b.proficiency] || 0) - (PROFICIENCY_RANK[a.proficiency] || 0) ||
      String(a.language_name || '').localeCompare(String(b.language_name || '')),
  },
  projects: {
    api: 'projects',
    idField: 'project_id',
    empty: EMPTY_PROJECT,
    validate: validateProject,
    max: MAX_PROJECTS_PER_CANDIDATE,
    label: 'project',
    nameOf: (e) => e.project_title,
    sort: (a, b) =>
      (Number(b.worked_from_year) || 0) - (Number(a.worked_from_year) || 0) ||
      (Number(b.worked_from_month) || 0) - (Number(a.worked_from_month) || 0) ||
      (Number(b.project_id) || 0) - (Number(a.project_id) || 0),
  },
};

/**
 * @param {'skills'|'languages'|'projects'} kind
 */
export const useProfileListEditor = ({ kind, candidateId, items = [], onSaved, dateOfBirth = null }) => {
  const config = KINDS[kind];
  if (!config) throw new Error(`useProfileListEditor: unknown kind "${kind}"`);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(config.empty);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const isEditing = Boolean(form[config.idField]);

  const sorted = useMemo(() => [...items].sort(config.sort), [items, config]);

  const atLimit = items.length >= config.max;
  const remaining = Math.max(0, config.max - items.length);

  const setField = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const openCreate = useCallback(() => {
    setForm(config.empty);
    setFieldErrors({});
    setFormError('');
    setOpen(true);
  }, [config.empty]);

  const openEdit = useCallback((entry) => {
    setForm({
      ...config.empty,
      // Normalise nulls to the empty default so inputs stay controlled.
      ...Object.fromEntries(
        Object.keys(config.empty).map((key) => [key, entry[key] ?? config.empty[key]]),
      ),
      [config.idField]: entry[config.idField],
    });
    setFieldErrors({});
    setFormError('');
    setOpen(true);
  }, [config]);

  const close = useCallback(() => {
    if (saving) return;
    setOpen(false);
    setFieldErrors({});
    setFormError('');
  }, [saving]);

  const save = useCallback(async () => {
    const clientErrors = config.validate(form, dateOfBirth);
    if (hasErrors(clientErrors)) {
      setFieldErrors(clientErrors);
      setFormError('Please correct the highlighted fields.');
      return false;
    }

    setSaving(true);
    setFormError('');
    try {
      if (isEditing) {
        await profileService[config.api].update(form[config.idField], form);
      } else {
        await profileService[config.api].create(candidateId, form);
      }
      setOpen(false);
      await onSaved?.();
      return true;
    } catch (err) {
      const { message, fieldErrors: serverErrors, isConflict } = unwrapError(err);
      setFieldErrors((prev) => mergeErrors(prev, serverErrors));
      setFormError(
        isConflict
          ? `${config.nameOf(form) || `That ${config.label}`} is already in your list.`
          : message,
      );
      return false;
    } finally {
      setSaving(false);
    }
  }, [config, form, isEditing, candidateId, onSaved]);

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete) return false;
    setDeleting(true);
    try {
      await profileService[config.api].remove(pendingDelete[config.idField]);
      setPendingDelete(null);
      await onSaved?.();
      return true;
    } catch (err) {
      setFormError(unwrapError(err).message);
      return false;
    } finally {
      setDeleting(false);
    }
  }, [config, pendingDelete, onSaved]);

  return {
    sorted,
    atLimit,
    remaining,
    max: config.max,
    label: config.label,
    nameOf: config.nameOf,

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

export default useProfileListEditor;
