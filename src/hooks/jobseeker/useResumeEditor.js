// ============================================================================
// useResumeEditor.js
// Resume upload, replace, view, download and removal
// Location: src/hooks/jobseeker/useResumeEditor.js
// ============================================================================
//
// The file is checked here before it leaves the browser — size, extension and
// magic bytes. The backend checks all three again; doing it first means the
// user learns a 12MB file is too large without waiting for the upload.
//
// The magic-byte read matters because a file renamed to .pdf passes both the
// extension and the browser-reported MIME type. The first bytes do not lie.
// ============================================================================

import { useState, useCallback, useRef } from 'react';
import profileService from '@/services/api/jobseeker/profileService';
import { unwrapError } from '@/utils/apiError';
import {
  RESUME_MAX_FILE_SIZE,
  RESUME_ALLOWED_EXTENSIONS,
} from '@/constants/profileConstants';

/** First bytes of each accepted format. docx is a zip archive. */
const SIGNATURES = {
  pdf:  [[0x25, 0x50, 0x44, 0x46]],                  // %PDF
  docx: [[0x50, 0x4b, 0x03, 0x04],
         [0x50, 0x4b, 0x05, 0x06],
         [0x50, 0x4b, 0x07, 0x08]],                  // PK..
};

const extensionOf = (name = '') =>
  name.includes('.') ? name.split('.').pop().toLowerCase() : '';

export const formatBytes = (bytes) => {
  const size = Number(bytes) || 0;
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  if (size >= 1024) return `${Math.round(size / 1024)} KB`;
  return `${size} bytes`;
};

/** Read the first four bytes and compare against the claimed format. */
async function signatureMatches(file, extension) {
  const expected = SIGNATURES[extension];
  if (!expected) return true;

  try {
    const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
    return expected.some((sig) => sig.every((byte, i) => head[i] === byte));
  } catch {
    // If the read fails, let the server decide rather than blocking the user.
    return true;
  }
}

/**
 * Validate a chosen file. Returns null when acceptable, or a message.
 */
export async function validateResumeFile(file) {
  if (!file) return 'Choose a file to upload';

  const extension = extensionOf(file.name);

  if (!RESUME_ALLOWED_EXTENSIONS.includes(extension)) {
    return `Only ${RESUME_ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(' and ')} files are accepted`;
  }

  if (file.size === 0) return 'That file is empty';

  if (file.size > RESUME_MAX_FILE_SIZE) {
    return `That file is ${formatBytes(file.size)}. The limit is ${formatBytes(RESUME_MAX_FILE_SIZE)}.`;
  }

  const matches = await signatureMatches(file, extension);
  if (!matches) {
    return `This does not appear to be a valid .${extension} file. Re-save it and try again.`;
  }

  return null;
}

export const useResumeEditor = ({ candidateId, resume, onSaved }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const inputRef = useRef(null);

  const hasResume = Boolean(resume?.has_resume || resume?.filename || resume?.original_filename);
  const filename = resume?.original_filename || resume?.filename || '';
  const sizeDisplay = resume?.file_size_display || formatBytes(resume?.file_size);

  const pickFile = useCallback(() => {
    setError('');
    inputRef.current?.click();
  }, []);

  const upload = useCallback(async (file) => {
    const validationError = await validateResumeFile(file);
    if (validationError) {
      setError(validationError);
      return false;
    }

    setUploading(true);
    setError('');
    try {
      if (hasResume) {
        await profileService.resume.replace(candidateId, file);
      } else {
        await profileService.resume.upload(candidateId, file);
      }
      await onSaved?.();
      return true;
    } catch (err) {
      const { message, fieldErrors } = unwrapError(err);
      setError(fieldErrors?.resume || message);
      return false;
    } finally {
      setUploading(false);
      // Clear the input so choosing the same file again still fires onChange.
      if (inputRef.current) inputRef.current.value = '';
    }
  }, [candidateId, hasResume, onSaved]);

  const onInputChange = useCallback((event) => {
    const file = event.target.files?.[0];
    if (file) upload(file);
  }, [upload]);

  const onDrop = useCallback((event) => {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) upload(file);
  }, [upload]);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    setDragActive(true);
  }, []);

  const onDragLeave = useCallback((event) => {
    event.preventDefault();
    setDragActive(false);
  }, []);

  const remove = useCallback(async () => {
    setRemoving(true);
    try {
      await profileService.resume.remove(candidateId);
      setConfirmRemove(false);
      await onSaved?.();
      return true;
    } catch (err) {
      setError(unwrapError(err).message);
      return false;
    } finally {
      setRemoving(false);
    }
  }, [candidateId, onSaved]);

  return {
    hasResume,
    filename,
    sizeDisplay,
    updatedAt: resume?.updated_at || resume?.created_at || null,

    viewUrl: profileService.resume.viewUrl(candidateId),
    downloadUrl: profileService.resume.downloadUrl(candidateId),

    inputRef,
    uploading,
    error,
    setError,
    dragActive,

    pickFile,
    upload,
    onInputChange,
    onDrop,
    onDragOver,
    onDragLeave,

    confirmRemove,
    setConfirmRemove,
    removing,
    remove,
  };
};

export default useResumeEditor;
