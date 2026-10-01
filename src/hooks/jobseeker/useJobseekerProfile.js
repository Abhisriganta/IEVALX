

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import profileService from '@/services/api/jobseeker/profileService';
import { unwrapError } from '@/utils/apiError';
import { PROFILE_SECTIONS } from '@/constants/profileConstants';

const EMPTY = {
  basic: null,
  resume: null,
  headline: null,
  summary: null,
  skills: [],
  education: [],
  employment: [],
  projects: [],
  accomplishments: [],
  languages: [],
  career: null,
  diversity: null,
  quickInterview: null,
  onlineProfiles: [],
};

/**
 * Weighted profile completion.
 *
 * Exported separately so JobseekerDashboard can show the same number without
 * mounting the profile page.
 *
 * @param   {Object} data  The shape returned by this hook.
 * @returns {{percent:number, map:Object, missing:Object[]}}
 */
export function computeCompletion(data = {}) {
  const map = {
    // 20 — the single most useful thing a recruiter opens
    resume: Boolean(data.resume?.has_resume
      || data.resume?.filename
      || data.resume?.original_filename),

    // 15 — what search and matching run on
    skills: (data.skills?.length || 0) > 0,

    // 10 each
    summary: Boolean(data.summary?.profile_summary),
    employment: (data.employment?.length || 0) > 0,
    education: (data.education?.length || 0) > 0,

    // 8 each
    projects: (data.projects?.length || 0) > 0,
    quickInterview: data.quickInterview?.status === 'completed',

    // 5 each
    headline: Boolean(data.headline?.resume_headline),
    photo: Boolean(data.basic?.profile_photo_id
      || data.basic?.has_photo
      || data.basic?.profile_image_url),
    career: Boolean(
      data.career?.current_industry
      || data.career?.job_role
      || data.career?.expected_salary,
    ),

    // 2 each
    languages: (data.languages?.length || 0) > 0,
    basic: Boolean(data.basic?.first_name && data.basic?.last_name
      && (data.basic?.email || data.basic?.phone_number)),

    // Unscored, but the nav rail still shows a tick when they have content.
    certifications: (data.accomplishments || []).some(
      (a) => a.accomplishment_type === 'Certification',
    ),
    accomplishments: (data.accomplishments || []).some(
      (a) => a.accomplishment_type !== 'Certification',
    ),
    onlineProfiles: (data.onlineProfiles?.length || 0) > 0,
    diversity: Boolean(
      data.diversity?.disability_status
      || data.diversity?.military_status
      || data.diversity?.career_break_status,
    ),
  };

  // Only weighted sections count toward the score, so an unscored section can
  // never push the total past 100.
  const scored = PROFILE_SECTIONS.filter((s) => s.weight > 0);
  const totalWeight = scored.reduce((sum, s) => sum + s.weight, 0);
  const earned = scored.reduce((sum, s) => sum + (map[s.id] ? s.weight : 0), 0);

  return {
    percent: totalWeight ? Math.round((earned / totalWeight) * 100) : 0,
    map,
    // Heaviest missing section first, so the prompt names what helps most.
    missing: scored
      .filter((s) => !map[s.id])
      .sort((a, b) => b.weight - a.weight),
  };
}

/**
 * Resolve the candidate id from the prop or from stored session.
 */
export function resolveCandidateId(explicitId) {
  if (explicitId) return Number(explicitId) || null;
  try {
    const user = JSON.parse(localStorage.getItem('ievalx_user') || '{}');
    return Number(user.id || user.candidate_id) || null;
  } catch {
    return null;
  }
}

export const useJobseekerProfile = (candidateIdProp) => {
  const candidateId = useMemo(() => resolveCandidateId(candidateIdProp), [candidateIdProp]);

  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Keyed on candidateId rather than module scope, so switching accounts
  // still reloads while a StrictMode remount does not.
  const loadedFor = useRef(null);
  const inFlight = useRef(false);

  const loadAll = useCallback(
    async ({ silent = false } = {}) => {
      if (!candidateId) {
        setLoading(false);
        setError('We could not work out which profile to load. Try logging in again.');
        return;
      }
      if (inFlight.current) return;

      inFlight.current = true;
      if (!silent) setLoading(true);
      setError(null);

      const keys = [
        'basic', 'resume', 'headline', 'summary', 'skills', 'education',
        'employment', 'projects', 'accomplishments', 'languages',
        'career', 'diversity', 'quickInterview', 'onlineProfiles',
      ];

      try {
        const results = await Promise.allSettled([
          profileService.basic.get(candidateId),
          profileService.resume.get(candidateId),
          profileService.overview.headline(candidateId),
          profileService.overview.summary(candidateId),
          profileService.skills.list(candidateId),
          profileService.education.list(candidateId),
          profileService.employment.list(candidateId),
          profileService.projects.list(candidateId),
          profileService.accomplishments.list(candidateId),
          profileService.languages.list(candidateId),
          profileService.overview.career(candidateId),
          profileService.diversity.get(candidateId),
          profileService.quickInterview.latest(candidateId),
          profileService.onlineProfiles.list(candidateId),
        ]);

        const next = { ...EMPTY };
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            next[keys[index]] = result.value ?? EMPTY[keys[index]];
          }
        });
        setData(next);

        // Only the identity call failing is worth surfacing; the rest degrade
        // to an empty section.
        if (results[0].status === 'rejected') {
          const { message, isAuth } = unwrapError(results[0].reason);
          setError(isAuth ? 'Your session has expired. Please log in again.' : message);
        }

        loadedFor.current = candidateId;
      } catch (err) {
        setError(unwrapError(err).message);
      } finally {
        inFlight.current = false;
        setLoading(false);
      }
    },
    [candidateId],
  );

  useEffect(() => {
    if (loadedFor.current === candidateId) return;
    loadAll();
  }, [candidateId, loadAll]);

    const refresh = useCallback(() => loadAll({ silent: true }), [loadAll]);

  const completion = useMemo(() => computeCompletion(data), [data]);

  const displayName = useMemo(() => {
    const p = data.basic;
    if (!p) return '';
    return [p.first_name, p.middle_name, p.last_name].filter(Boolean).join(' ');
  }, [data.basic]);

  const [photoVersion, setPhotoVersion] = useState(0);
  const hasPhoto = Boolean(
    data.basic?.profile_photo_id
    || data.basic?.has_photo
    || data.basic?.profile_image_url,
  );
  const photoUrl = useMemo(
    () => (candidateId && hasPhoto
      ? `${profileService.photo.url(candidateId)}?v=${photoVersion}`
      : ''),
    [candidateId, hasPhoto, photoVersion],
  );
  const bustPhotoCache = useCallback(() => setPhotoVersion((v) => v + 1), []);

  return {
    candidateId,
    photoUrl,
    bustPhotoCache,
    data,
    loading,
    error,
    completion,
    displayName,
    reload: loadAll,
    refresh,
  };
};

export default useJobseekerProfile;