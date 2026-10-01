import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import profileService from '@/services/api/jobseeker/profileService';
import { unwrapError } from '@/utils/apiError';
import {
  validatePersonalDetails,
  validateOnlineProfile,
  splitCsv,
  hasErrors,
  mergeErrors,
} from '@/utils/profileValidation';
import {
  PHOTO_MAX_FILE_SIZE,
  PHOTO_ALLOWED_EXTENSIONS,
  MAX_ONLINE_PROFILES,
  ONLINE_PLATFORMS,
} from '@/constants/profileConstants';

/* ══════════════════════════════════════════════════════════════════════════
   PERSONAL DETAILS
   ══════════════════════════════════════════════════════════════════════════ */

export const EMPTY_PERSONAL = {
  first_name: '',
  middle_name: '',
  last_name: '',
  email: '',
  phone_number: '',
  country_code: '+91',
  date_of_birth: '',
  gender: '',
  gender_other: '',
  category: '',
  marital_status: '',
  more_information: [],

  current_address_line: '',
  current_city: '',
  current_district: '',
  current_state: '',
  current_pincode: '',

  permanent_address_line: '',
  permanent_city: '',
  permanent_district: '',
  permanent_state: '',
  permanent_pincode: '',

  hometown: '',
};

const asText = (v) => (v === null || v === undefined ? '' : String(v));

function toPersonalForm(record) {
  if (!record) return { ...EMPTY_PERSONAL };
  const form = {};
  Object.keys(EMPTY_PERSONAL).forEach((k) => {
    form[k] = k === 'more_information'
      ? splitCsv(record[k])
      : asText(record[k] ?? record[k.replace('_line', '')]);
  });
  
  form.date_of_birth = asText(record.date_of_birth).slice(0, 10);
  form.country_code = asText(record.country_code) || '+91';

  if (form.marital_status === 'Single') form.marital_status = 'Single/Unmarried';

  return form;
}

export const usePersonalDetailsEditor = ({ basic, onSaved }) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(() => toPersonalForm(basic));
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [sameAsCurrent, setSameAsCurrent] = useState(false);
  const [pincodeBusy, setPincodeBusy] = useState('');

  useEffect(() => {
    if (!open) setForm(toPersonalForm(basic));
  }, [basic, open]);

  const hasAnything = Boolean(basic?.first_name || basic?.last_name);

  const fullName = useMemo(
    () => [basic?.first_name, basic?.middle_name, basic?.last_name]
      .filter(Boolean).join(' '),
    [basic],
  );

  const setField = useCallback((field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'gender' && value !== 'Other') next.gender_other = '';
      return next;
    });
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const n = { ...prev };
      delete n[field];
      return n;
    });
  }, []);

  const toggleMoreInfo = useCallback((value) => {
    setForm((prev) => {
      const cur = prev.more_information || [];
      return {
        ...prev,
        more_information: cur.includes(value)
          ? cur.filter((v) => v !== value)
          : [...cur, value],
      };
    });
  }, []);

  const lookupPincode = useCallback(async (which) => {
    const field = which === 'permanent' ? 'permanent_pincode' : 'current_pincode';
    const code = String(form[field] || '').trim();
    if (!/^\d{6}$/.test(code)) return;

    setPincodeBusy(which);
    try {
      const result = await profileService.basic.lookupPincode(code);
      const data = result?.data || result;
      // The backend returns { success, city, state, country, ... } without a
      // `found` flag — treat "any city or state returned" as a match.
      if (!data || (!data.city && !data.state && !data.district)) return;
      setForm((prev) => {
        const next = { ...prev };
        const prefix = which === 'permanent' ? 'permanent' : 'current';
        if (data.city)     next[`${prefix}_city`]     = data.city;
        if (data.district) next[`${prefix}_district`] = data.district;
        if (data.state)    next[`${prefix}_state`]    = data.state;
        return next;
      });
    } finally {
      setPincodeBusy('');
    }
  }, [form]);

  // Auto-fill city / district / state the moment either pincode reaches 6
  // digits. A ref tracks the last value looked up so we don't re-hit the API
  // on every unrelated keystroke.
  const lastLookedUp = useRef({ current: '', permanent: '' });
  useEffect(() => {
    const code = String(form.current_pincode || '').trim();
    if (/^\d{6}$/.test(code) && lastLookedUp.current.current !== code) {
      lastLookedUp.current.current = code;
      lookupPincode('current');
    }
  }, [form.current_pincode, lookupPincode]);
  useEffect(() => {
    const code = String(form.permanent_pincode || '').trim();
    if (/^\d{6}$/.test(code) && lastLookedUp.current.permanent !== code) {
      lastLookedUp.current.permanent = code;
      lookupPincode('permanent');
    }
  }, [form.permanent_pincode, lookupPincode]);

  const copyCurrentToPermanent = useCallback((checked) => {
    setSameAsCurrent(checked);
    if (!checked) return;
    setForm((prev) => ({
      ...prev,
      permanent_address_line: prev.current_address_line,
      permanent_city: prev.current_city,
      permanent_district: prev.current_district,
      permanent_state: prev.current_state,
      permanent_pincode: prev.current_pincode,
    }));
  }, []);

  const openEditor = useCallback(() => {
    setForm(toPersonalForm(basic));
    setSameAsCurrent(false);
    setFieldErrors({});
    setFormError('');
    setOpen(true);
  }, [basic]);

  const close = useCallback(() => {
    if (saving) return;
    setOpen(false);
    setFieldErrors({});
    setFormError('');
  }, [saving]);

  const save = useCallback(async () => {
    const clientErrors = validatePersonalDetails(form);
    if (hasErrors(clientErrors)) {
      setFieldErrors(clientErrors);
      setFormError('Please correct the highlighted fields.');
      return false;
    }

    setSaving(true);
    setFormError('');
    try {
      await profileService.basic.save(form);
      setOpen(false);
      window.dispatchEvent(new CustomEvent('profile-updated', {
        detail: {
          full_name: [form.first_name, form.middle_name, form.last_name]
            .filter(Boolean).join(' '),
        },
      }));
      await onSaved?.();
      return true;
    } catch (err) {
      const { message, fieldErrors: serverErrors, isConflict } = unwrapError(err);
      setFieldErrors((prev) => mergeErrors(prev, serverErrors));
      setFormError(isConflict ? 'That email or phone number is already registered.' : message);
      return false;
    } finally {
      setSaving(false);
    }
  }, [form, onSaved]);

  return {
    open, form, fieldErrors, formError, saving,
    hasAnything, fullName,
    sameAsCurrent, pincodeBusy,
    setField, toggleMoreInfo, lookupPincode, copyCurrentToPermanent,
    openEditor, close, save,
  };
};

/* ══════════════════════════════════════════════════════════════════════════
   PROFILE PHOTO
   ══════════════════════════════════════════════════════════════════════════ */

const SIGNATURES = {
  jpg:  [[0xff, 0xd8, 0xff]],
  jpeg: [[0xff, 0xd8, 0xff]],
  png:  [[0x89, 0x50, 0x4e, 0x47]],
  gif:  [[0x47, 0x49, 0x46, 0x38]],
  webp: [[0x52, 0x49, 0x46, 0x46]],
};

const extensionOf = (name = '') =>
  name.includes('.') ? name.split('.').pop().toLowerCase() : '';

/** Read the first bytes — a renamed file passes both extension and MIME. */
async function looksLikeImage(file, extension) {
  const expected = SIGNATURES[extension];
  if (!expected) return true;
  try {
    const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
    return expected.some((sig) => sig.every((b, i) => head[i] === b));
  } catch {
    return true;   // let the server decide rather than blocking
  }
}

export async function validatePhotoFile(file) {
  if (!file) return 'Choose an image';
  const ext = extensionOf(file.name);
  if (!PHOTO_ALLOWED_EXTENSIONS.includes(ext)) {
    return `Accepted formats: ${PHOTO_ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(', ')}`;
  }
  if (file.size === 0) return 'That file is empty';
  if (file.size > PHOTO_MAX_FILE_SIZE) {
    return `That image is larger than ${Math.round(PHOTO_MAX_FILE_SIZE / (1024 * 1024))}MB`;
  }
  if (!(await looksLikeImage(file, ext))) {
    return 'That file is not a valid image';
  }
  return null;
}

export const usePhotoEditor = ({ candidateId, basic, photoUrl, onSaved, onPhotoChanged }) => {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState('');
  const [confirmRemove, setConfirmRemove] = useState(false);

  const hasPhoto = Boolean(basic?.profile_photo_id || basic?.has_photo);

  const initials = useMemo(() => {
    const a = (basic?.first_name || '').trim()[0] || '';
    const b = (basic?.last_name || '').trim()[0] || '';
    return (a + b).toUpperCase() || '?';
  }, [basic]);

  const pick = useCallback(() => {
    setError('');
    inputRef.current?.click();
  }, []);

  const upload = useCallback(async (file) => {
    const validationError = await validatePhotoFile(file);
    if (validationError) {
      setError(validationError);
      return false;
    }
    setUploading(true);
    setError('');
    try {
      await profileService.photo.upload(candidateId, file);
      onPhotoChanged?.();       // bust the <img> cache
      // BUILD: 2026-08-01-topbar-live-refresh — no url in detail: the
      // jobseeker photo endpoint is a stable URL, so the topbar responds by
      // bumping its ?v= cache-buster and refetching.
      window.dispatchEvent(new CustomEvent('profile-image-updated', { detail: {} }));
      await onSaved?.();
      return true;
    } catch (err) {
      const { message, fieldErrors } = unwrapError(err);
      setError(fieldErrors?.profile_photo || message);
      return false;
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }, [candidateId, onSaved, onPhotoChanged]);

  const onInputChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) upload(file);
  }, [upload]);

  const remove = useCallback(async () => {
    setRemoving(true);
    try {
      await profileService.photo.remove(candidateId);
      setConfirmRemove(false);
      // Refresh FIRST so basic.profile_photo_id / has_photo becomes falsy
      // before any listener refetches the (now deleted) photo URL.
      await onSaved?.();
      onPhotoChanged?.();
      // BUILD: 2026-08-01-topbar-live-refresh — refresh the topbar avatar
      // (it will fall back to initials via onError once the photo is gone).
      window.dispatchEvent(new CustomEvent('profile-image-updated', { detail: { removed: true } }));
      return true;
    } catch (err) {
      setError(unwrapError(err).message);
      return false;
    } finally {
      setRemoving(false);
    }
  }, [candidateId, onSaved, onPhotoChanged]);

  return {
    inputRef, hasPhoto, initials, photoUrl,
    uploading, removing, error, setError,
    pick, onInputChange,
    confirmRemove, setConfirmRemove, remove,
  };
};

/* ══════════════════════════════════════════════════════════════════════════
   ONLINE PROFILES
   ══════════════════════════════════════════════════════════════════════════ */

export const EMPTY_ONLINE_PROFILE = {
  profile_id: null,
  platform_key: '',
  label: '',
  url: '',
};

export const useOnlineProfilesEditor = ({ candidateId, profiles = [], onSaved }) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_ONLINE_PROFILE);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const isEditing = Boolean(form.profile_id);
  const atLimit = profiles.length >= MAX_ONLINE_PROFILES;

  const sorted = useMemo(
    () => [...profiles].sort((a, b) =>
      String(a.label || a.platform_key || '')
        .localeCompare(String(b.label || b.platform_key || ''))),
    [profiles],
  );

  /** Platforms not already used, so the picker cannot create a duplicate. */
  const availablePlatforms = useMemo(() => {
    const used = profiles
      .filter((p) => p.profile_id !== form.profile_id)
      .map((p) => String(p.platform_key || '').toLowerCase());
    return ONLINE_PLATFORMS.filter(
      (p) => p.key === 'other' || !used.includes(p.key),
    );
  }, [profiles, form.profile_id]);

  const selectedPlatform = useMemo(
    () => ONLINE_PLATFORMS.find((p) => p.key === form.platform_key) || null,
    [form.platform_key],
  );

  const setField = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const n = { ...prev };
      delete n[field];
      return n;
    });
  }, []);

  const openCreate = useCallback(() => {
    setForm(EMPTY_ONLINE_PROFILE);
    setFieldErrors({});
    setFormError('');
    setOpen(true);
  }, []);

  const openEdit = useCallback((entry) => {
    setForm({
      ...EMPTY_ONLINE_PROFILE,
      ...Object.fromEntries(
        Object.keys(EMPTY_ONLINE_PROFILE).map((k) => [k, entry[k] ?? '']),
      ),
      profile_id: entry.profile_id,
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
    const clientErrors = validateOnlineProfile(form);
    if (hasErrors(clientErrors)) {
      setFieldErrors(clientErrors);
      setFormError('Please correct the highlighted fields.');
      return false;
    }
    setSaving(true);
    setFormError('');
    try {
      if (isEditing) {
        await profileService.onlineProfiles.update(form.profile_id, form);
      } else {
        await profileService.onlineProfiles.create(candidateId, form);
      }
      setOpen(false);
      await onSaved?.();
      return true;
    } catch (err) {
      const { message, fieldErrors: serverErrors, isConflict } = unwrapError(err);
      setFieldErrors((prev) => mergeErrors(prev, serverErrors));
      setFormError(isConflict ? 'You have already added that platform.' : message);
      return false;
    } finally {
      setSaving(false);
    }
  }, [form, isEditing, candidateId, onSaved]);

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete) return false;
    setDeleting(true);
    try {
      await profileService.onlineProfiles.remove(pendingDelete.profile_id);
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
    sorted, atLimit, availablePlatforms, selectedPlatform,
    open, form, fieldErrors, formError, saving, isEditing,
    setField, openCreate, openEdit, close, save,
    pendingDelete, setPendingDelete, deleting, confirmDelete,
  };
};

export default usePersonalDetailsEditor;
