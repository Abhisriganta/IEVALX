
export const EMPTY_PROFILE = {
  id: null,
  first_name: '',
  middle_name: '',
  last_name: '',
  email: '',
  phone: '',
  country_code: '',
  date_of_birth: '',
  gender: '',
  gender_other: '',
  category: '',
  marital_status: '',
  more_information: [],
  notice_period: '',
  expected_salary: '',

  current_address: '',
  current_city: '',
  current_district: '',
  current_state: '',
  current_country: '',
  current_pincode: '',

  permanent_address: '',
  permanent_city: '',
  permanent_district: '',
  permanent_state: '',
  permanent_country: '',
  permanent_pincode: '',

  hometown: '',
  profile_image: '',
  status: 1,
};

/**
 * Empty extended profile.
 * Keys are exactly the `extended.*` properties the legacy code reads.
 */
export const EMPTY_EXTENDED = {
  resume_headline: '',
  profile_summary: '',
  key_skills: [],
  education: [],
  employment: [],
  projects: [],
  accomplishments: [],
  certifications: [],
  languages: [],
  social_profiles: [],
  career_profile: null,
  diversity: null,
  resume_filename: '',
  resume_url: '',
};

/**
 * Flatten fields + files into the body jobseekerService.updateProfile expects.
 *
 * Blank strings are dropped rather than sent: the update endpoint treats a
 * submitted key as an instruction to write it, so sending "" for an untouched
 * optional field would blank a stored value.
 */
export function buildRequestBody(fields = {}, files = {}) {
  const body = {};

  Object.entries(fields).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (typeof value === 'string' && value.trim() === '') return;
    body[key] = typeof value === 'string' ? value.trim() : value;
  });

  Object.entries(files || {}).forEach(([key, file]) => {
    if (file) body[key] = file;
  });

  return body;
}

const WEIGHTS = {
  resume: 15,
  skills: 12,
  summary: 8,
  employment: 10,
  education: 10,
  projects: 8,
  quickInterview: 8,
  headline: 4,
  photo: 4,
  career: 5,
  certifications: 4,
  accomplishments: 3,
  onlineProfiles: 3,
  languages: 2,
  basic: 2,
  diversity: 2,
};

const notEmpty = (v) => Array.isArray(v) ? v.length > 0 : Boolean(v);

export function computeCompletionLegacy(form = {}, extended = {}) {
  const f = form || {};
  const e = extended || {};

  const map = {
    resume: notEmpty(e.resume_filename || e.resume_url),
    skills: notEmpty(e.key_skills),
    summary: notEmpty(e.profile_summary),
    employment: notEmpty(e.employment),
    education: notEmpty(e.education),
    projects: notEmpty(e.projects),
    // The legacy hook does not fetch quick-interview status, so this scores 0
    // there. The profile page, which does fetch it, is the accurate figure.
    quickInterview: Boolean(e.quick_interview_completed),
    headline: notEmpty(e.resume_headline),
    photo: notEmpty(f.profile_image),
    career: Boolean(
      e.career_profile && (
        e.career_profile.current_industry ||
        e.career_profile.job_role ||
        e.career_profile.expected_salary
      ),
    ),
    languages: notEmpty(e.languages),
    basic: Boolean(f.first_name && f.last_name && (f.email || f.phone)),
    certifications: (e.accomplishments || []).some(
      (a) => a?.accomplishment_type === 'Certification',
    ),
    accomplishments: (e.accomplishments || []).some(
      (a) => a?.accomplishment_type && a.accomplishment_type !== 'Certification',
    ),
    onlineProfiles: notEmpty(e.social_profiles),
    diversity: Boolean(
      e.diversity && (
        e.diversity.disability_status ||
        e.diversity.military_status ||
        e.diversity.career_break_status
      ),
    ),
  };


  const total = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
  const earned = Object.keys(WEIGHTS)
    .reduce((sum, key) => sum + (map[key] ? WEIGHTS[key] : 0), 0);

  const percent = total ? Math.round((earned / total) * 100) : 0;

  // The dashboard reads `.percent`, but older call sites treated the return
  // value as a number. Returning a Number subclass satisfies both: it compares
  // and formats as a number, and still carries the breakdown.
  const result = new Number(percent);   // eslint-disable-line no-new-wrappers
  result.percent = percent;
  result.map = map;
  result.missing = Object.keys(WEIGHTS).filter((k) => !map[k]);
  return result;
}

export default {
  EMPTY_PROFILE,
  EMPTY_EXTENDED,
  buildRequestBody,
  computeCompletionLegacy,
};
