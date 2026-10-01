// ============================================================================
// profileService.js
// Job seeker profile — all HTTP for the profile sections
// Location: src/services/api/jobseeker/profileService.js
// ============================================================================
//
// WHY THIS SITS BETWEEN THE HOOKS AND jobseekerService
//
// jobseekerService returns raw axios responses, and the jobseeker backend is
// mid-rebuild so it currently answers in two envelopes:
//
//   rebuilt : { success: true, data: {...}, employments: [...] }
//   original: { success: true, employments: [...] }
//
// Every caller unwrapping that itself is how the shapes drift. This module is
// the single place that knows about envelopes and payload keys. Hooks and
// components see plain arrays and objects, and never touch axios.
//
// Methods resolve to data (not responses) and reject with the original axios
// error, so callers can run it through unwrapError for field-level messages.
// ============================================================================

import jobseekerService from '@/services/api/jobseeker/jobseekerService';
import quickInterviewService from '@/services/api/jobseeker/quickInterviewService';
import { unwrapData } from '@/utils/apiError';
import {
  buildEducationPayload,
  buildEmploymentPayload,
  buildCareerProfilePayload,
  buildSkillPayload,
  buildLanguagePayload,
  buildProjectPayload,
  buildAccomplishmentPayload,
  buildDiversityPayload,
  buildPersonalDetailsPayload,
  buildOnlineProfilePayload,
  cleanStr,
} from '@/utils/profileValidation';

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Read a list out of either envelope, always returning an array.
 */
const asList = (response, key) => {
  const value = unwrapData(response?.data, key, []);
  return Array.isArray(value) ? value : [];
};

/**
 * Read a single object out of either envelope.
 */
const asObject = (response, key) => {
  const value = unwrapData(response?.data, key, null);
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
};

/**
 * A GET that 404s because nothing has been saved yet is an empty state, not a
 * failure. Several singleton endpoints (summary, headline, career profile,
 * resume) still answer that way.
 */
const tolerate404 = (fallback) => (error) => {
  if (error?.response?.status === 404) return fallback;
  throw error;
};

// ============================================================================
// EDUCATION
// ============================================================================

const education = {
  /** @returns {Promise<Object[]>} */
  list: (candidateId) =>
    jobseekerService
      .getEducation(candidateId)
      .then((res) => asList(res, 'education'))
      .catch(tolerate404([])),

  /** @returns {Promise<Object>} the created row */
  create: (candidateId, entry) =>
    jobseekerService
      .addEducation(candidateId, buildEducationPayload(entry))
      .then((res) => asObject(res, 'education') || res?.data?.data || null),

  /** @returns {Promise<Object>} the updated row */
  update: (educationId, entry) =>
    jobseekerService
      .updateEducation(educationId, buildEducationPayload(entry))
      .then((res) => asObject(res, 'education') || res?.data?.data || null),

  remove: (educationId) =>
    jobseekerService.deleteEducation(educationId).then(() => true),

  /**
   * Deliberately NOT exposed as part of the normal save path.
   *
   * The previous editor called deleteAllEducation() and then re-added every
   * entry in a loop. That was survivable while deletes were soft, but the
   * rebuilt backend removes rows physically — so a validation failure partway
   * through destroyed every entry after it. Use create/update/remove per entry
   * instead. This remains only for an explicit "clear my education" action.
   */
  removeAll: (candidateId) =>
    jobseekerService.deleteAllEducation(candidateId).then(() => true),
};

// ============================================================================
// EMPLOYMENT
// ============================================================================

const employment = {
  /** @returns {Promise<Object[]>} */
  list: (candidateId) =>
    jobseekerService
      .getEmployment(candidateId)
      .then((res) => asList(res, 'employments'))
      .catch(tolerate404([])),

  create: (candidateId, entry) =>
    jobseekerService
      .addEmployment(candidateId, buildEmploymentPayload(entry))
      .then((res) => asObject(res, 'employment') || res?.data?.data || null),

  update: (employmentId, entry) =>
    jobseekerService
      .updateEmployment(employmentId, buildEmploymentPayload(entry))
      .then((res) => asObject(res, 'employment') || res?.data?.data || null),

  remove: (employmentId) =>
    jobseekerService.deleteEmployment(employmentId).then(() => true),

  removeAll: (candidateId) =>
    jobseekerService.deleteAllEmployment(candidateId).then(() => true),
};

// ============================================================================
// KEY SKILLS
// ============================================================================

const skills = {
  list: (candidateId) =>
    jobseekerService
      .getSkills(candidateId)
      .then((res) => asList(res, 'skills'))
      .catch(tolerate404([])),

  create: (candidateId, entry) =>
    jobseekerService
      .addSkill(candidateId, buildSkillPayload(entry))
      .then((res) => asObject(res, 'skill') || res?.data?.data || null),

  update: (skillId, entry) =>
    jobseekerService
      .updateSkill(skillId, buildSkillPayload(entry))
      .then((res) => asObject(res, 'skill') || res?.data?.data || null),

  remove: (skillId) => jobseekerService.deleteSkill(skillId).then(() => true),

  removeAll: (candidateId) =>
    jobseekerService.deleteAllSkills(candidateId).then(() => true),
};

// ============================================================================
// LANGUAGES
// ============================================================================

const languages = {
  list: (candidateId) =>
    jobseekerService
      .getLanguages(candidateId)
      .then((res) => asList(res, 'languages'))
      .catch(tolerate404([])),

  create: (candidateId, entry) =>
    jobseekerService
      .addLanguage(candidateId, buildLanguagePayload(entry))
      .then((res) => asObject(res, 'language') || res?.data?.data || null),

  update: (languageId, entry) =>
    jobseekerService
      .updateLanguage(languageId, buildLanguagePayload(entry))
      .then((res) => asObject(res, 'language') || res?.data?.data || null),

  remove: (languageId) => jobseekerService.deleteLanguage(languageId).then(() => true),

  removeAll: (candidateId) =>
    jobseekerService.deleteAllLanguages(candidateId).then(() => true),
};

// ============================================================================
// PROJECTS
// ============================================================================

const projects = {
  list: (candidateId) =>
    jobseekerService
      .getProjects(candidateId)
      .then((res) => asList(res, 'projects'))
      .catch(tolerate404([])),

  create: (candidateId, entry) =>
    jobseekerService
      .addProject(candidateId, buildProjectPayload(entry))
      .then((res) => asObject(res, 'project') || res?.data?.data || null),

  update: (projectId, entry) =>
    jobseekerService
      .updateProject(projectId, buildProjectPayload(entry))
      .then((res) => asObject(res, 'project') || res?.data?.data || null),

  remove: (projectId) => jobseekerService.deleteProject(projectId).then(() => true),

  removeAll: (candidateId) =>
    jobseekerService.deleteAllProjects(candidateId).then(() => true),
};

// ============================================================================
// ACCOMPLISHMENTS & CERTIFICATIONS
// ============================================================================
//
// The UI keeps certifications on their own tab, so list() takes a type filter.
// "Accomplishment" is the backend's shorthand for everything except
// certifications, matching the two calls the profile page already makes.

const accomplishments = {
  list: (candidateId, type) =>
    jobseekerService
      .getAccomplishments(candidateId, type)
      .then((res) => asList(res, 'accomplishments'))
      .catch(tolerate404([])),

  create: (candidateId, entry) =>
    jobseekerService
      .addAccomplishment(candidateId, buildAccomplishmentPayload(entry))
      .then((res) => asObject(res, 'accomplishment') || res?.data?.data || null),

  update: (accomplishmentId, entry) =>
    jobseekerService
      .updateAccomplishment(accomplishmentId, buildAccomplishmentPayload(entry))
      .then((res) => asObject(res, 'accomplishment') || res?.data?.data || null),

  remove: (accomplishmentId) =>
    jobseekerService.deleteAccomplishment(accomplishmentId).then(() => true),

  removeAll: (candidateId, type) =>
    jobseekerService.deleteAllAccomplishments(candidateId, type).then(() => true),
};

// ============================================================================
// PERSONAL DETAILS  (tbl_Job_Seeker)
// ============================================================================
//
// updateProfile derives candidate_id from the stored session and remaps the
// frontend's field names, so it takes no id argument.

const basic = {
  get: (candidateId) =>
    jobseekerService
      .getProfile(candidateId)
      .then((res) => asObject(res, 'job_seeker') || asObject(res, 'jobseeker'))
      .catch(tolerate404(null)),

  save: (entry) =>
    jobseekerService
      .updateProfile(buildPersonalDetailsPayload(entry))
      .then((res) => asObject(res, 'job_seeker') || res?.data?.data || null),

  lookupPincode: (pincode) =>
    jobseekerService
      .lookupPincode(pincode)
      .then((res) => res?.data || null)
      .catch(() => null),
};

// ============================================================================
// PROFILE PHOTO
// ============================================================================

const photo = {
  url: (candidateId) =>
    candidateId ? jobseekerService.photoUrlFor(candidateId) : '',

  upload: (candidateId, file) =>
    jobseekerService
      .updatePhoto(candidateId, file)
      .then((res) => res?.data || null),

  remove: (candidateId) =>
    jobseekerService.removePhoto(candidateId).then(() => true),
};

// ============================================================================
// ONLINE PROFILES
// ============================================================================

const onlineProfiles = {
 list: (candidateId) =>
    jobseekerService
      .getOnlineProfiles(candidateId)
      .then((res) => asList(res, 'profiles'))
      .catch(tolerate404([])),

  create: (candidateId, entry) =>
    jobseekerService
      .addOnlineProfile(candidateId, buildOnlineProfilePayload(entry))
      .then((res) => asObject(res, 'online_profile') || res?.data?.data || null),

  update: (profileId, entry) =>
    jobseekerService
      .updateOnlineProfile(profileId, buildOnlineProfilePayload(entry))
      .then((res) => asObject(res, 'online_profile') || res?.data?.data || null),

  remove: (profileId) =>
    jobseekerService.deleteOnlineProfile(profileId).then(() => true),
};

// ============================================================================
// DIVERSITY & INCLUSION  (one row per candidate)
// ============================================================================
//
// The most sensitive record in the profile: disability status and percentage,
// certificates, and military service numbers. save() takes an optional file;
// jobseekerService switches to multipart when one is present, and the rebuilt
// backend parses multipart on PUT as well as POST.

const diversity = {
  get: (candidateId) =>
    jobseekerService
      .getDiversity(candidateId)
      .then((res) => asObject(res, 'diversity'))
      .catch(tolerate404(null)),

  save: (candidateId, entry, file = null) =>
    jobseekerService
      .updateDiversity(candidateId, buildDiversityPayload(entry), file)
      .then((res) => asObject(res, 'diversity') || res?.data?.data || null),

  remove: (candidateId) =>
    jobseekerService.deleteDiversity(candidateId).then(() => true),

  documentUrl: (candidateId) =>
    candidateId ? jobseekerService.docUrlFor(candidateId) : '',
};

// ============================================================================
// RESUME FILE  (one row per candidate)
// ============================================================================
//
// Upload and replace hit different endpoints but do the same thing — the
// rebuilt backend upserts either way. view/download return URLs rather than
// blobs so the browser can stream them straight into an <iframe> or a link.

const resume = {
  get: (candidateId) =>
    jobseekerService
      .getResumeInfo(candidateId)
      .then((res) => asObject(res, 'resume'))
      .catch(tolerate404(null)),

  upload: (candidateId, file) =>
    jobseekerService
      .uploadResume(candidateId, file)
      .then((res) => asObject(res, 'resume') || res?.data?.data || null),

  replace: (candidateId, file) =>
    jobseekerService
      .updateResume(candidateId, file)
      .then((res) => asObject(res, 'resume') || res?.data?.data || null),

  remove: (candidateId) =>
    jobseekerService.deleteResume(candidateId).then(() => true),

  viewUrl: (candidateId) =>
    candidateId ? jobseekerService.resumeViewUrl(candidateId) : '',

  downloadUrl: (candidateId) =>
    candidateId ? jobseekerService.resumeDownloadUrl(candidateId) : '',
};

// ============================================================================
// RESUME HEADLINE  (one row per candidate)
// ============================================================================
//
// The rebuilt backend upserts on both POST and PUT, so there is a single
// save() here. The original refused POST with "already exists, use PUT",
// which forced callers to know whether a row existed before choosing a verb.

const headline = {
  get: (candidateId) =>
    jobseekerService
      .getResumeHeadline(candidateId)
      .then((res) => asObject(res, 'resume_headline'))
      .catch(tolerate404(null)),

  save: (candidateId, text) =>
  jobseekerService
    .updateResumeHeadline(candidateId, cleanStr(text))
      .then((res) => asObject(res, 'resume_headline') || res?.data?.data || null),

  remove: (candidateId) =>
    jobseekerService.deleteResumeHeadline(candidateId).then(() => true),
};

// ============================================================================
// PROFILE SUMMARY  (one row per candidate)
// ============================================================================

const summary = {
  get: (candidateId) =>
    jobseekerService
      .getProfileSummary(candidateId)
      .then((res) => asObject(res, 'profile_summary'))
      .catch(tolerate404(null)),

  save: (candidateId, text) =>
  jobseekerService
    .updateProfileSummary(candidateId, cleanStr(text))
      .then((res) => asObject(res, 'profile_summary') || res?.data?.data || null),

  remove: (candidateId) =>
    jobseekerService.deleteProfileSummary(candidateId).then(() => true),
};

// ============================================================================
// CAREER PREFERENCES  (one row per candidate)
// ============================================================================
//
// The backend returns the SET columns as arrays and takes them as arrays, so
// nothing here has to think about comma joining.

const career = {
  get: (candidateId) =>
    jobseekerService
      .getCareerProfile(candidateId)
      .then((res) => asObject(res, 'career_profile'))
      .catch(tolerate404(null)),

  save: (candidateId, entry) =>
    jobseekerService
      .updateCareerProfile(candidateId, buildCareerProfilePayload(entry))
      .then((res) => asObject(res, 'career_profile') || res?.data?.data || null),

  remove: (candidateId) =>
    jobseekerService.deleteCareerProfile(candidateId).then(() => true),
};

// ============================================================================
// QUICK INTERVIEW
// ============================================================================
//
// Not a profile section the candidate edits, but it carries 8% of the profile
// score, so the loader needs its status. Only the most recent attempt matters:
// history is returned newest-first.

const quickInterview = {
  latest: (candidateId) =>
    quickInterviewService
      .getHistory(candidateId)
      .then((history) => (Array.isArray(history) ? history[0] : null) || null)
      .catch(() => null),
};

// ============================================================================
// EVERYTHING ELSE THE PROFILE PAGE READS
// ============================================================================
// These are read-only for now; their write paths land with each section as its
// backend module is rebuilt.

const overview = {
  basic: (candidateId) =>
    jobseekerService
      .getProfile(candidateId)
      .then((res) => asObject(res, 'job_seeker') || asObject(res, 'jobseeker'))
      .catch(tolerate404(null)),

  headline: (candidateId) =>
    jobseekerService
      .getResumeHeadline(candidateId)
      .then((res) => asObject(res, 'resume_headline'))
      .catch(tolerate404(null)),

  summary: (candidateId) =>
    jobseekerService
      .getProfileSummary(candidateId)
      .then((res) => asObject(res, 'profile_summary'))
      .catch(tolerate404(null)),

  career: (candidateId) =>
    jobseekerService
      .getCareerProfile(candidateId)
      .then((res) => asObject(res, 'career_profile'))
      .catch(tolerate404(null)),

  onlineProfiles: (candidateId) =>
    jobseekerService
      .getOnlineProfiles(candidateId)
      .then((res) => asList(res, 'profiles')),
  photoUrl: (candidateId) => jobseekerService.photoUrlFor(candidateId),
};

// ============================================================================

const profileService = {
  basic,
  photo,
  onlineProfiles,
  education,
  employment,
  skills,
  languages,
  projects,
  accomplishments,
  resume,
  diversity,
  quickInterview,
  headline,
  summary,
  career,
  overview,
};

export default profileService;