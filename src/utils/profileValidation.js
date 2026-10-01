

import {
  EDUCATION_LEVELS,
  SCHOOL_LEVELS,
  UNIVERSITY_LEVELS,
  EDUCATION_LEVEL_OPTIONS,
  EDUCATION_FIELD_LIMITS,
  EDUCATION_SEQUENCE,
  COURSE_TYPES,
  GRADING_SYSTEMS,
  GRADING_BOUNDS,
  EMPLOYMENT_TYPES,
  EMPLOYMENT_FIELD_LIMITS,
  NOTICE_PERIODS,
  SALARY_MAX,
  SALARY_MAX_INTEGER_DIGITS,
  MIN_YEAR,
  maxYear,
  RESUME_HEADLINE_MAX,
  RESUME_HEADLINE_MIN_WORDS,
  PROFILE_SUMMARY_MAX,
  PROFILE_SUMMARY_MIN,
  DESIRED_JOB_TYPES,
  DESIRED_EMPLOYMENT_TYPES,
  PREFERRED_SHIFTS,
  MAX_PREFERRED_LOCATIONS,
  MAX_LOCATION_FIELD,
  CAREER_FIELD_LIMITS,
  SKILL_FIELD_LIMITS,
  LANGUAGE_PROFICIENCY,
  MAX_LANGUAGE_NAME,
  PROJECT_STATUS,
  PROJECT_SITE,
  PROJECT_NATURE_OF_EMPLOYMENT,
  PROJECT_FIELD_LIMITS,
  MAX_TEAM_SIZE,
  ACCOMPLISHMENT_TYPES,
  ACCOMPLISHMENT_TYPE_FIELDS,
  ACCOMPLISHMENT_FIELD_LIMITS,
  PATENT_STATUS,
  DISABILITY_STATUS,
  CERTIFICATE_TYPES,
  MILITARY_STATUS,
  CAREER_BREAK_STATUS,
  BREAK_REASONS,
  DIVERSITY_FIELD_LIMITS,
  GENDER_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  CATEGORY_OPTIONS,
  MORE_INFORMATION_OPTIONS,
  PERSONAL_FIELD_LIMITS,
  MIN_AGE,
  MAX_AGE,
  ONLINE_PLATFORMS,
  ONLINE_PROFILE_LIMITS,
} from '@/constants/profileConstants';

// ── Primitives ─────────────────────────────────────────────────────────────

export const isBlank = (value) =>
  value === null ||
  value === undefined ||
  (typeof value === 'string' && value.trim() === '');

/** Normalise anything to a trimmed string or null. Never throws. */
export const cleanStr = (value, maxLength) => {
  if (value === null || value === undefined) return null;
  let text = typeof value === 'string' ? value : String(value);
  text = text.trim();
  if (!text) return null;
  return maxLength ? text.slice(0, maxLength) : text;
};

/** Best-effort integer. Returns null rather than NaN. */
export const toInt = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
};

/** Best-effort number. Returns null rather than NaN. */
export const toNum = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

/** Collapse a year/month pair to a sortable integer. */
export const ymOrdinal = (year, month) => {
  const y = toInt(year);
  if (y === null) return null;
  return y * 12 + (toInt(month) || 1);
};

// ── Reusable field checks ──────────────────────────────────────────────────

export function checkRequired(value, label) {
  return isBlank(value) ? `${label} is required` : null;
}

export function checkLength(value, label, max) {
  if (isBlank(value)) return null;
  const len = String(value).trim().length;
  return len > max
    ? `${label} must be ${max} characters or less (you entered ${len})`
    : null;
}

export function checkChoice(value, label, allowed) {
  if (isBlank(value)) return null;
  return allowed.includes(value)
    ? null
    : `${label} must be one of: ${allowed.join(', ')}`;
}

export function checkYear(value, label, { min = MIN_YEAR, max = maxYear() } = {}) {
  if (isBlank(value)) return null;
  const year = toInt(value);
  if (year === null) return `${label} must be a valid year`;
  if (year < min) return `${label} must be ${min} or later`;
  if (year > max) return `${label} cannot be later than ${max}`;
  return null;
}

export function checkMonth(value, label) {
  if (isBlank(value)) return null;
  const month = toInt(value);
  if (month === null || month < 1 || month > 12) {
    return `${label} must be a month between January and December`;
  }
  return null;
}

export function checkRange(value, label, min, max) {
  if (isBlank(value)) return null;
  const n = toNum(value);
  if (n === null) return `${label} must be a number`;
  if (min !== null && n < min) return `${label} must be ${min} or more`;
  if (max !== null && n > max) return `${label} must be ${max} or less`;
  return null;
}

/** Order check for two year values. */
/**
 * A URL that renders as a link. Without a scheme the browser treats it as a
 * relative path, so "github.com/me" becomes a broken in-app link.
 */
export function checkUrl(value, label, maxLength = 500) {
  if (isBlank(value)) return null;
  const text = String(value).trim();

  const lengthError = checkLength(text, label, maxLength);
  if (lengthError) return lengthError;

  if (!/^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(text)) {
    return `${label} must be a valid URL starting with http:// or https://`;
  }
  return null;
}

export function checkOrder(earlier, later, labelEarlier, labelLater) {
  const a = toInt(earlier);
  const b = toInt(later);
  if (a === null || b === null) return null;
  return b < a ? `${labelLater} must be after ${labelEarlier}` : null;
}

/** Order check for two year/month pairs. */
export function checkPeriod(fromYear, fromMonth, toYear, toMonth, labelFrom, labelTo) {
  const start = ymOrdinal(fromYear, fromMonth);
  const end = ymOrdinal(toYear, toMonth);
  if (start === null || end === null) return null;
  return end < start ? `${labelTo} must be after ${labelFrom}` : null;
}

export function checkNotFuture(year, month, label, day) {
  const value = ymOrdinal(year, month);
  if (value === null) return null;
  const now = new Date();
  const today = now.getFullYear() * 12 + (now.getMonth() + 1);
  if (value > today) return `${label} cannot be in the future`;
  // Day-level check: if day is provided and we're in the same month, compare days
  const d = toInt(day);
  if (d !== null && value === today && d > now.getDate()) {
    return `${label} cannot be in the future`;
  }
  return null;
}

/**
 * Decimal that has to fit its column.
 * DECIMAL(15,2) allows 13 digits before the point; more produces MySQL 1264.
 */
export function checkDecimalWidth(value, label, integerDigits = SALARY_MAX_INTEGER_DIGITS) {
  if (isBlank(value)) return null;
  const n = toNum(value);
  if (n === null) return `${label} must be a valid number`;
  if (n < 0) return `${label} cannot be negative`;
  if (Math.abs(n) >= 10 ** integerDigits) {
    return `${label} is too large (maximum ${integerDigits} digits)`;
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// EDUCATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Marks bounds follow the grading system, not a fixed 0-100.
 * @param {string} gradingSystem
 * @returns {{min:number|null,max:number|null,label:string|null,step:number|null}}
 */
export function marksBoundsFor(gradingSystem) {
  return (
    GRADING_BOUNDS[gradingSystem] ||
    GRADING_BOUNDS[GRADING_SYSTEMS.PERCENT]
  );
}

function checkMarks(value, label, gradingSystem) {
  if (isBlank(value)) return null;

  const bounds = marksBoundsFor(gradingSystem);
  if (bounds.min === null) {
    return `${label} does not apply when the course only requires a pass`;
  }

  const n = toNum(value);
  if (n === null) return `${label} must be a number`;
  if (n < bounds.min) return `${label} must be ${bounds.min} or more (${bounds.label} scale)`;
  if (n > bounds.max) return `${label} must be ${bounds.max} or less (${bounds.label} scale)`;
  return null;
}

/**
 * Validate one education entry.
 *
 * @param {Object}   entry           The form values.
 * @param {Object[]} [siblings=[]]   The candidate's other education entries,
 *                                   used for the cross-level chronology check.
 * @returns {Object} { field: message } — empty when valid.
 */
export function validateEducation(entry = {}, siblings = [], dateOfBirth = null) {
  const errors = {};
  const add = (field, message) => {
    if (message && !errors[field]) errors[field] = message;
  };

  const level = cleanStr(entry.education_level);

  if (isBlank(level)) {
    return { education_level: 'Education level is required' };
  }

  const levelError = checkChoice(level, 'Education level', EDUCATION_LEVEL_OPTIONS);
  if (levelError) return { education_level: levelError };

  const grading = cleanStr(entry.grading_system);

  const MIN_AGE_AT_COMPLETION = {
    [EDUCATION_LEVELS.TENTH]:      12,
    [EDUCATION_LEVELS.TWELFTH]:    14,
    [EDUCATION_LEVELS.GRADUATION]: 17,
    [EDUCATION_LEVELS.MASTERS]:    19,
    [EDUCATION_LEVELS.DOCTORATE]:  22,
  };
  const _dobYear = (() => {
    if (isBlank(dateOfBirth)) return null;
    const d = new Date(String(dateOfBirth).slice(0, 10));
    return Number.isNaN(d.getTime()) ? null : d.getFullYear();
  })();

  // ── 10th / 12th ──────────────────────────────────────────────────────────
  if (SCHOOL_LEVELS.includes(level)) {
  add('board', checkRequired(entry.board, 'Board'));
    add('passing_out_year', checkRequired(entry.passing_out_year, 'Passing out year'));
    add('school_medium', checkRequired(entry.school_medium, 'School medium'));
    if (grading !== GRADING_SYSTEMS.PASS) {
      add('marks', checkRequired(entry.marks, 'Marks'));
    }
    add('board', checkLength(entry.board, 'Board', EDUCATION_FIELD_LIMITS.board));
    add('school_medium',
      checkLength(entry.school_medium, 'School medium', EDUCATION_FIELD_LIMITS.school_medium));
    add('passing_out_year', checkYear(entry.passing_out_year, 'Passing out year'));

  
    {
      const _passYr = toInt(entry.passing_out_year);
      if (_passYr !== null && _passYr > new Date().getFullYear()) {
        add('passing_out_year', 'Passing out year cannot be in the future');
      }
      if (_dobYear !== null && _passYr !== null &&
          (_passYr - _dobYear) < MIN_AGE_AT_COMPLETION[level]) {
        add('passing_out_year',
          `Passing out year is too early — you would have been under ${MIN_AGE_AT_COMPLETION[level]} (born ${_dobYear})`);
      }
    }

    const schoolScale = grading || GRADING_SYSTEMS.PERCENT;
    add('marks', checkMarks(entry.marks, 'Marks', schoolScale));

   if (level === EDUCATION_LEVELS.TWELFTH) {
      add('english_marks', checkMarks(entry.english_marks, 'English marks', schoolScale));
      add('maths_marks', checkMarks(entry.maths_marks, 'Maths marks', schoolScale));

      // BUILD: 2026-08-01-edu-cert-validations — E5: sub-marks cannot exceed overall
      {
        const _overall = toNum(entry.marks);
        const _eng = toNum(entry.english_marks);
        const _math = toNum(entry.maths_marks);
        if (_overall !== null && _eng !== null && _eng > _overall) {
          add('english_marks', 'English marks cannot exceed the overall marks');
        }
        if (_overall !== null && _math !== null && _math > _overall) {
          add('maths_marks', 'Maths marks cannot exceed the overall marks');
        }
      }
    }
  }

  // ── Graduation / Masters / Doctorate ─────────────────────────────────────
  else if (UNIVERSITY_LEVELS.includes(level)) {
    add('university_institute', checkRequired(entry.university_institute, 'University or institute'));
    add('course', checkRequired(entry.course, 'Course'));
    add('specialization', checkRequired(entry.specialization, 'Specialization'));
    add('course_type', checkRequired(entry.course_type, 'Course type'));
    add('course_duration_start_year', checkRequired(entry.course_duration_start_year, 'Course start year'));
    add('course_duration_end_year', checkRequired(entry.course_duration_end_year, 'Course end year'));

    add('university_institute',
      checkLength(entry.university_institute, 'University or institute', EDUCATION_FIELD_LIMITS.university_institute));
    add('course', checkLength(entry.course, 'Course', EDUCATION_FIELD_LIMITS.course));
    add('specialization',
      checkLength(entry.specialization, 'Specialization', EDUCATION_FIELD_LIMITS.specialization));
    add('course_type', checkChoice(entry.course_type, 'Course type', COURSE_TYPES));

    add('course_duration_start_year', checkYear(entry.course_duration_start_year, 'Course start year'));
    add('course_duration_end_year', checkYear(entry.course_duration_end_year, 'Course end year'));
    add('course_duration_end_year',
      checkOrder(entry.course_duration_start_year, entry.course_duration_end_year,
        'the course start year', 'Course end year'));

        {
      const _nowYr = new Date().getFullYear();
      const _startYr = toInt(entry.course_duration_start_year);
      const _endYr = toInt(entry.course_duration_end_year);

      // Start year cannot be in the future
      if (_startYr !== null && _startYr > _nowYr) {
        add('course_duration_start_year', 'Start year cannot be in the future');
      }

      // Start year must respect minimum age
      const MIN_AGE_AT_START = {
        [EDUCATION_LEVELS.GRADUATION]: 15,
        [EDUCATION_LEVELS.MASTERS]:    18,
        [EDUCATION_LEVELS.DOCTORATE]:  21,
      };
      if (_dobYear !== null && _startYr !== null && MIN_AGE_AT_START[level] &&
          (_startYr - _dobYear) < MIN_AGE_AT_START[level]) {
        add('course_duration_start_year',
          `Too early — you would have been under ${MIN_AGE_AT_START[level]} (born ${_dobYear})`);
      }

      // End year: minimum-age-at-completion check (existing logic, preserved)
      if (_dobYear !== null && _endYr !== null &&
          (_endYr - _dobYear) < MIN_AGE_AT_COMPLETION[level]) {
        add('course_duration_end_year',
          `Course end year is too early — you would have been under ${MIN_AGE_AT_COMPLETION[level]} (born ${_dobYear})`);
      }

      // End year: reasonable future cap
      if (_endYr !== null && _endYr > _nowYr + 6) {
        add('course_duration_end_year',
          `End year cannot be more than 6 years from now`);
      }

      // Minimum course duration based on education level
      if (_startYr !== null && _endYr !== null) {
        const MIN_COURSE_DURATION = {
          [EDUCATION_LEVELS.GRADUATION]: 3,
          [EDUCATION_LEVELS.MASTERS]:    2,
          [EDUCATION_LEVELS.DOCTORATE]:  3,
        };
        const minDur = MIN_COURSE_DURATION[level];
        if (minDur && (_endYr - _startYr) < minDur) {
          add('course_duration_end_year',
            `${level} requires at least ${minDur} years (${_startYr} – ${_startYr + minDur} minimum)`);
        }
      }
    }

    add('marks', checkMarks(entry.marks, 'Marks', grading));
  }

  // ── Other ────────────────────────────────────────────────────────────────
  else if (level === EDUCATION_LEVELS.OTHER) {
    add('other_education_details', checkRequired(entry.other_education_details, 'Education details'));
    add('other_education_details',
      checkLength(entry.other_education_details, 'Education details', EDUCATION_FIELD_LIMITS.other_education_details));
  }

  // ── Chronology against the candidate's other entries ─────────────────────
  Object.assign(errors, validateEducationSequence(entry, siblings, errors));

  return errors;
}

/**
 * Cross-entry chronology: 12th cannot precede 10th, graduation cannot begin
 * before 12th finished, and so on. Mirrors validate_against_siblings().
 */
export function validateEducationSequence(entry, siblings = [], existing = {}) {
  const errors = {};
  const level = cleanStr(entry.education_level);
  if (!level) return errors;

  // Exclude the entry being edited. Compare ids only when this entry actually
  // has one — on a new entry both sides are undefined, and `undefined !==
  // undefined` is false, which silently filtered out every sibling and turned
  // the whole chronology check into a no-op.
  const others = siblings.filter((s) => {
    if (s.education_level === level) return false;
    if (entry.education_id && s.education_id === entry.education_id) return false;
    return true;
  });
  const byLevel = Object.fromEntries(others.map((s) => [s.education_level, s]));

  const endOf = (row) =>
    row ? toInt(row.passing_out_year ?? row.course_duration_end_year) : null;
  const startOf = (row) =>
    row ? toInt(row.course_duration_start_year ?? row.passing_out_year) : null;

  const thisStart =
    toInt(entry.course_duration_start_year) ?? toInt(entry.passing_out_year);
  const thisEnd =
    toInt(entry.passing_out_year) ?? toInt(entry.course_duration_end_year);

  const yearField = UNIVERSITY_LEVELS.includes(level)
    ? 'course_duration_start_year'
    : 'passing_out_year';
  const endField = UNIVERSITY_LEVELS.includes(level)
    ? 'course_duration_end_year'
    : 'passing_out_year';

  EDUCATION_SEQUENCE.forEach(([earlier, later]) => {
    if (level === later) {
      const priorEnd = endOf(byLevel[earlier]);
      if (priorEnd !== null && thisStart !== null && thisStart < priorEnd) {
        if (!existing[yearField]) {
          errors[yearField] =
            `${later} cannot begin before you completed ${earlier} (${priorEnd})`;
        }
      }
    }
    if (level === earlier) {
      const nextStart = startOf(byLevel[later]);
      if (nextStart !== null && thisEnd !== null && nextStart < thisEnd) {
        if (!existing[endField]) {
          errors[endField] =
            `This conflicts with your ${later} entry, which starts in ${nextStart}`;
        }
      }
    }
  });

  return errors;
}

/** Which fields the form should show for a given level. */
export function educationFieldsFor(level) {
  if (SCHOOL_LEVELS.includes(level)) {
    return {
      school: true,
      university: false,
      other: false,
      subjectMarks: level === EDUCATION_LEVELS.TWELFTH,
    };
  }
  if (UNIVERSITY_LEVELS.includes(level)) {
    return { school: false, university: true, other: false, subjectMarks: false };
  }
  if (level === EDUCATION_LEVELS.OTHER) {
    return { school: false, university: false, other: true, subjectMarks: false };
  }
  return { school: false, university: false, other: false, subjectMarks: false };
}

/**
 * Strip fields that do not belong to the chosen level before sending.
 * The backend nulls these anyway; doing it here keeps the payload honest and
 * avoids "this field does not apply" errors from a stale form value.
 */
export function buildEducationPayload(entry) {
  const level = cleanStr(entry.education_level);
  const shape = educationFieldsFor(level);

  const payload = {
    education_level: level,
    board: null,
    passing_out_year: null,
    school_medium: null,
    marks: null,
    english_marks: null,
    maths_marks: null,
    university_institute: null,
    course: null,
    specialization: null,
    course_type: null,
    course_duration_start_year: null,
    course_duration_end_year: null,
    grading_system: null,
    other_education_details: null,
  };

  if (shape.school) {
    payload.board = cleanStr(entry.board, EDUCATION_FIELD_LIMITS.board);
    payload.passing_out_year = toInt(entry.passing_out_year);
    payload.school_medium = cleanStr(entry.school_medium, EDUCATION_FIELD_LIMITS.school_medium);
    payload.marks = toNum(entry.marks);
    payload.grading_system = cleanStr(entry.grading_system);
    if (shape.subjectMarks) {
      // These two were missing from the previous payload builder entirely,
      // so 12th-standard English and Maths marks could never be saved.
      payload.english_marks = toNum(entry.english_marks);
      payload.maths_marks = toNum(entry.maths_marks);
    }
  }

  if (shape.university) {
    payload.university_institute = cleanStr(entry.university_institute, EDUCATION_FIELD_LIMITS.university_institute);
    payload.course = cleanStr(entry.course, EDUCATION_FIELD_LIMITS.course);
    payload.specialization = cleanStr(entry.specialization, EDUCATION_FIELD_LIMITS.specialization);
    payload.course_type = cleanStr(entry.course_type);
    payload.course_duration_start_year = toInt(entry.course_duration_start_year);
    payload.course_duration_end_year = toInt(entry.course_duration_end_year);
    payload.grading_system = cleanStr(entry.grading_system);
    payload.marks = toNum(entry.marks);
  }

  if (shape.other) {
    payload.other_education_details =
      cleanStr(entry.other_education_details, EDUCATION_FIELD_LIMITS.other_education_details);
  }

  return payload;
}

// ═══════════════════════════════════════════════════════════════════════════
// EMPLOYMENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validate one employment entry.
 *
 * Adds the rules the backend never had: a joining date cannot be in the
 * future, a notice period only means something for a current job, and
 * stated total experience cannot predate the job you are describing.
 */
export function validateEmployment(entry = {}) {
  const errors = {};
  const add = (field, message) => {
    if (message && !errors[field]) errors[field] = message;
  };

  const isCurrent = entry.is_current_employment !== false;

  add('employment_type', checkRequired(entry.employment_type, 'Employment type'));
  add('employment_type', checkChoice(entry.employment_type, 'Employment type', EMPLOYMENT_TYPES));

  add('company_name', checkRequired(entry.company_name, 'Company name'));
  add('company_name',
    checkLength(entry.company_name, 'Company name', EMPLOYMENT_FIELD_LIMITS.company_name));

  add('job_title', checkRequired(entry.job_title, 'Job title'));
  add('job_title', checkLength(entry.job_title, 'Job title', EMPLOYMENT_FIELD_LIMITS.job_title));

  add('skills_used', checkRequired(entry.skills_used, 'Skills used'));
  add('skills_used',
    checkLength(entry.skills_used, 'Skills used', EMPLOYMENT_FIELD_LIMITS.skills_used));

  add('job_profile',
    checkLength(entry.job_profile, 'Job profile', EMPLOYMENT_FIELD_LIMITS.job_profile));

  add('total_experience_years',
    checkRange(entry.total_experience_years, 'Years of experience', 0, 50));
  add('total_experience_months',
    checkRange(entry.total_experience_months, 'Months of experience', 0, 11));

  add('joining_date_year', checkYear(entry.joining_date_year, 'Joining year'));
  add('joining_date_month', checkMonth(entry.joining_date_month, 'Joining month'));
  add('joining_date_year',
    checkNotFuture(entry.joining_date_year, entry.joining_date_month, 'Joining date'));

  add('current_salary', checkDecimalWidth(entry.current_salary, 'Salary'));

  add('notice_period', checkChoice(entry.notice_period, 'Notice period', NOTICE_PERIODS));

  // A notice period only describes a job you currently hold.
  if (!isCurrent && entry.notice_period && entry.notice_period !== 'Not Applicable') {
    add('notice_period', 'Notice period applies only to your current job');
  }

  // Stated total experience cannot start before this job began.
  const joinYear = toInt(entry.joining_date_year);
  const expYears = toInt(entry.total_experience_years);
  if (isCurrent && joinYear !== null && expYears !== null) {
    const now = new Date().getFullYear();
    const yearsInThisJob = now - joinYear;
    if (expYears < yearsInThisJob - 1) {
      add('total_experience_years',
        `You have been at this company for about ${yearsInThisJob} years, so total experience cannot be ${expYears}`);
    }
  }

  return errors;
}

export function buildEmploymentPayload(entry) {
  const isCurrent = entry.is_current_employment !== false;
  return {
    is_current_employment: isCurrent,
    employment_type: cleanStr(entry.employment_type),
    total_experience_years: toInt(entry.total_experience_years) ?? 0,
    total_experience_months: toInt(entry.total_experience_months) ?? 0,
    company_name: cleanStr(entry.company_name, EMPLOYMENT_FIELD_LIMITS.company_name),
    job_title: cleanStr(entry.job_title, EMPLOYMENT_FIELD_LIMITS.job_title),
    joining_date_year: toInt(entry.joining_date_year),
    joining_date_month: toInt(entry.joining_date_month),
    salary_currency: cleanStr(entry.salary_currency) || '₹',
    current_salary: toNum(entry.current_salary),
    skills_used: cleanStr(entry.skills_used, EMPLOYMENT_FIELD_LIMITS.skills_used),
    job_profile: cleanStr(entry.job_profile, EMPLOYMENT_FIELD_LIMITS.job_profile),
    notice_period: isCurrent ? cleanStr(entry.notice_period) : null,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// HEADLINE / SUMMARY
// ═══════════════════════════════════════════════════════════════════════════

export function validateResumeHeadline(text) {
  const value = cleanStr(text);
  if (!value) return { resume_headline: 'Resume headline is required' };

  if (value.length > RESUME_HEADLINE_MAX) {
    return {
      resume_headline:
        `Resume headline must be ${RESUME_HEADLINE_MAX} characters or less (you entered ${value.length})`,
    };
  }

  // Whitespace is collapsed first so "Backend    Developer" counts as two
  // words, matching the backend's word count exactly.
  const words = value.split(/\s+/).filter(Boolean).length;
  if (words < RESUME_HEADLINE_MIN_WORDS) {
    return {
      resume_headline:
        `Resume headline needs at least ${RESUME_HEADLINE_MIN_WORDS} words (you wrote ${words})`,
    };
  }

  return {};
}

export function validateProfileSummary(text) {
  const value = cleanStr(text);
  if (!value) return { profile_summary: 'Profile summary is required' };

  if (value.length > PROFILE_SUMMARY_MAX) {
    return {
      profile_summary:
        `Profile summary must be ${PROFILE_SUMMARY_MAX} characters or less (you entered ${value.length})`,
    };
  }

  if (value.length < PROFILE_SUMMARY_MIN) {
    return {
      profile_summary:
        `Profile summary needs at least ${PROFILE_SUMMARY_MIN} characters to be useful to a recruiter (you wrote ${value.length})`,
    };
  }

  return {};
}

// ═══════════════════════════════════════════════════════════════════════════
// CAREER PREFERENCES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Accept a list or a comma-separated string and return a clean list:
 * trimmed, blanks dropped, de-duplicated case-insensitively, order preserved.
 * Mirrors split_csv() server-side.
 */
export function splitCsv(value) {
  if (value === null || value === undefined) return [];

  const items = Array.isArray(value)
    ? value.map((v) => String(v).trim())
    : String(value).split(',').map((v) => v.trim());

  const seen = new Set();
  const result = [];
  items.forEach((item) => {
    if (!item) return;
    const key = item.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    result.push(item);
  });
  return result;
}

/**
 * Members of a MySQL SET column. An unrecognised value reaches the driver as
 * error 1265 and used to surface as a 500 naming nothing.
 */
function checkSetMembers(value, label, allowed) {
  const items = splitCsv(value);
  if (!items.length) return null;
  const invalid = items.filter((i) => !allowed.includes(i));
  return invalid.length ? `${label} must be chosen from: ${allowed.join(', ')}` : null;
}

export function validateCareerProfile(entry = {}) {
  const errors = {};
  const add = (field, message) => {
    if (message && !errors[field]) errors[field] = message;
  };

  // Every field is optional — a candidate may record only an expected salary.
  Object.entries(CAREER_FIELD_LIMITS).forEach(([field, limit]) => {
    const label = field.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
    add(field, checkLength(entry[field], label, limit));
  });

  add('desired_job_type',
    checkSetMembers(entry.desired_job_type, 'Desired job type', DESIRED_JOB_TYPES));
  add('desired_employment_type',
    checkSetMembers(entry.desired_employment_type, 'Desired employment type', DESIRED_EMPLOYMENT_TYPES));
  add('preferred_shift',
    checkChoice(entry.preferred_shift, 'Preferred shift', PREFERRED_SHIFTS));

  const locations = splitCsv(entry.preferred_work_location);
  if (locations.length > MAX_PREFERRED_LOCATIONS) {
    add('preferred_work_location',
      `Choose up to ${MAX_PREFERRED_LOCATIONS} preferred locations (you selected ${locations.length})`);
  }
  if (locations.join(',').length > MAX_LOCATION_FIELD) {
    add('preferred_work_location',
      `Preferred locations must total ${MAX_LOCATION_FIELD} characters or less`);
  }

  add('expected_salary', checkDecimalWidth(entry.expected_salary, 'Expected salary'));

  return errors;
}

export function buildCareerProfilePayload(entry = {}) {
  const locations = splitCsv(entry.preferred_work_location);
  return {
    current_industry: cleanStr(entry.current_industry, CAREER_FIELD_LIMITS.current_industry),
    department:       cleanStr(entry.department, CAREER_FIELD_LIMITS.department),
    role_category:    cleanStr(entry.role_category, CAREER_FIELD_LIMITS.role_category),
    job_role:         cleanStr(entry.job_role, CAREER_FIELD_LIMITS.job_role),
    desired_job_type:        splitCsv(entry.desired_job_type),
    desired_employment_type: splitCsv(entry.desired_employment_type),
    preferred_shift:         cleanStr(entry.preferred_shift),
    preferred_work_location: locations,
    salary_currency:         cleanStr(entry.salary_currency) || '\u20B9',
    expected_salary:         toNum(entry.expected_salary),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// KEY SKILLS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * The column is VARCHAR(10) and holds a bare year. The date picker sends
 * "2020-01-15"; a plain input sends "2020". Both reduce to the year, matching
 * normalise_last_used() server-side.
 */
export function normaliseLastUsed(value) {
  const text = cleanStr(value);
  if (!text) return null;
  return text.split('-', 1)[0].trim() || null;
}

export function validateSkill(entry = {}) {
  const errors = {};
  const add = (field, message) => {
    if (message && !errors[field]) errors[field] = message;
  };

  add('skill_name', checkRequired(entry.skill_name, 'Skill name'));
  add('skill_name', checkLength(entry.skill_name, 'Skill name', SKILL_FIELD_LIMITS.skill_name));
  add('software_version',
    checkLength(entry.software_version, 'Version', SKILL_FIELD_LIMITS.software_version));

  add('experience_years', checkRange(entry.experience_years, 'Years of experience', 0, 50));
  add('experience_months', checkRange(entry.experience_months, 'Months of experience', 0, 11));

    const lastUsed = normaliseLastUsed(entry.last_used);
  if (lastUsed) add('last_used', checkYear(lastUsed, 'Last used', { max: new Date().getFullYear() }));

  return errors;
}

export function buildSkillPayload(entry = {}) {
  return {
    skill_name:        cleanStr(entry.skill_name),
    software_version:  cleanStr(entry.software_version),
    last_used:         normaliseLastUsed(entry.last_used),
    experience_years:  toInt(entry.experience_years) ?? 0,
    experience_months: toInt(entry.experience_months) ?? 0,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// LANGUAGES
// ═══════════════════════════════════════════════════════════════════════════

export function validateLanguage(entry = {}) {
  const errors = {};
  const add = (field, message) => {
    if (message && !errors[field]) errors[field] = message;
  };

  add('language_name', checkRequired(entry.language_name, 'Language'));
  add('language_name', checkLength(entry.language_name, 'Language', MAX_LANGUAGE_NAME));

  add('proficiency', checkRequired(entry.proficiency, 'Proficiency'));
  add('proficiency', checkChoice(entry.proficiency, 'Proficiency', LANGUAGE_PROFICIENCY));

  // A language you can neither read, write nor speak says nothing.
  if (!entry.can_read && !entry.can_write && !entry.can_speak) {
    add('can_read', 'Choose at least one of read, write or speak');
  }

  return errors;
}

export function buildLanguagePayload(entry = {}) {
  return {
    language_name: cleanStr(entry.language_name),
    proficiency:   cleanStr(entry.proficiency),
    can_read:      Boolean(entry.can_read),
    can_write:     Boolean(entry.can_write),
    can_speak:     Boolean(entry.can_speak),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// PROJECTS
// ═══════════════════════════════════════════════════════════════════════════

export function validateProject(entry = {}, dateOfBirth = null) {
  const errors = {};
  const add = (field, message) => {
    if (message && !errors[field]) errors[field] = message;
  };

  // BUILD: 2026-08-03-project-dob-coherence — worked_from_year cannot precede
  // a realistic minimum age.
  const MIN_AGE_AT_PROJECT = 14;
  const _dobYear = (() => {
    if (isBlank(dateOfBirth)) return null;
    const d = new Date(String(dateOfBirth).slice(0, 10));
    return Number.isNaN(d.getTime()) ? null : d.getFullYear();
  })();
  if (_dobYear !== null) {
    const yr = toInt(entry.worked_from_year);
    if (yr !== null && (yr - _dobYear) < MIN_AGE_AT_PROJECT) {
      add('worked_from_year',
        `Start year is too early — you would have been under ${MIN_AGE_AT_PROJECT} (born ${_dobYear})`);
    }
  }

  add('project_title', checkRequired(entry.project_title, 'Project title'));
  add('client', checkRequired(entry.client, 'Client or organisation'));

  Object.entries(PROJECT_FIELD_LIMITS).forEach(([field, limit]) => {
    const label = field.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
    add(field, checkLength(entry[field], label, limit));
  });

  add('project_status', checkChoice(entry.project_status, 'Project status', PROJECT_STATUS));
  add('project_site', checkChoice(entry.project_site, 'Project site', PROJECT_SITE));
  add('nature_of_employment',
    checkChoice(entry.nature_of_employment, 'Nature of employment', PROJECT_NATURE_OF_EMPLOYMENT));

  add('worked_from_year', checkYear(entry.worked_from_year, 'Start year'));
  add('worked_from_month', checkMonth(entry.worked_from_month, 'Start month'));
  add('worked_from_year',
    checkNotFuture(entry.worked_from_year, entry.worked_from_month, 'Start date'));

  if (entry.project_status === 'Finished' && isBlank(entry.worked_from_year)) {
    add('worked_from_year', 'Add the year you started this finished project');
  }

  if (entry.project_site === 'Onsite' && isBlank(entry.project_location)) {
    add('project_location', 'Add the location for an onsite project');
  }

  if (!isBlank(entry.team_size)) {
    add('team_size', checkRange(entry.team_size, 'Team size', 1, MAX_TEAM_SIZE));
  }

  // A link without a scheme renders as a broken relative URL in the profile.
  add('github_url', checkUrl(entry.github_url, 'GitHub URL', PROJECT_FIELD_LIMITS.github_url));
  add('live_link', checkUrl(entry.live_link, 'Live link', PROJECT_FIELD_LIMITS.live_link));

  return errors;
}

export function buildProjectPayload(entry = {}) {
  return {
    project_title:            cleanStr(entry.project_title),
    tag_employment_education: cleanStr(entry.tag_employment_education),
    client:                   cleanStr(entry.client),
    project_status:           cleanStr(entry.project_status) || 'In progress',
    worked_from_year:         toInt(entry.worked_from_year),
    worked_from_month:        toInt(entry.worked_from_month),
    details_of_project:       cleanStr(entry.details_of_project),
    project_location:         cleanStr(entry.project_location),
    project_site:             cleanStr(entry.project_site),
    nature_of_employment:     cleanStr(entry.nature_of_employment),
    team_size:                cleanStr(entry.team_size),
    role:                     cleanStr(entry.role),
    role_description:         cleanStr(entry.role_description),
    skills_used:              cleanStr(entry.skills_used),
    github_url:               cleanStr(entry.github_url),
    live_link:                cleanStr(entry.live_link),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// ACCOMPLISHMENTS
// ═══════════════════════════════════════════════════════════════════════════

const T = ACCOMPLISHMENT_TYPES;

/** Which fields the form should show for a given type. */
export function accomplishmentFieldsFor(type) {
  return new Set(ACCOMPLISHMENT_TYPE_FIELDS[type] || []);
}

export function validateAccomplishment(entry = {}, dateOfBirth = null) {
  const errors = {};
  const add = (field, message) => {
    if (message && !errors[field]) errors[field] = message;
  };

  const type = cleanStr(entry.accomplishment_type);
  if (!type) return { accomplishment_type: 'Choose what you are adding' };

  const typeError = checkChoice(type, 'Type', Object.values(T));
  if (typeError) return { accomplishment_type: typeError };

  Object.entries(ACCOMPLISHMENT_FIELD_LIMITS).forEach(([field, limit]) => {
    const label = field.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
    add(field, checkLength(entry[field], label, limit));
  });

  // BUILD: 2026-08-03-accomplishment-dob-coherence — every year/date field
  // on an accomplishment must fall at least MIN_AGE years after DOB.
  const MIN_AGE_AT_EVENT = 14;
  const _dobYear = (() => {
    if (isBlank(dateOfBirth)) return null;
    const d = new Date(String(dateOfBirth).slice(0, 10));
    return Number.isNaN(d.getTime()) ? null : d.getFullYear();
  })();
  if (_dobYear !== null) {
    const _checkYear = (field, label) => {
      const yr = toInt(entry[field]);
      if (yr !== null && (yr - _dobYear) < MIN_AGE_AT_EVENT) {
        add(field,
          `${label} is too early — you would have been under ${MIN_AGE_AT_EVENT} (born ${_dobYear})`);
      }
    };
    const _checkDate = (field, label) => {
      if (isBlank(entry[field])) return;
      const d = new Date(String(entry[field]).slice(0, 10));
      if (Number.isNaN(d.getTime())) return;
      if ((d.getFullYear() - _dobYear) < MIN_AGE_AT_EVENT) {
        add(field,
          `${label} is too early — you would have been under ${MIN_AGE_AT_EVENT} (born ${_dobYear})`);
      }
    };
    _checkYear('duration_from_year', 'Start year');
    _checkYear('duration_to_year',   'End year');
    _checkYear('published_on_year',  'Published year');
    _checkYear('issue_date_year',    'Issue year');
    _checkDate('validity_from_date', 'Completion date');
    _checkDate('validity_to_date',   'Expiry date');
  }

  add('url', checkUrl(entry.url, 'URL', ACCOMPLISHMENT_FIELD_LIMITS.url));

  if (type === T.ONLINE_PROFILE) {
    add('social_profile', checkRequired(entry.social_profile, 'Profile name'));
  }

  if (type === T.WORK_SAMPLE) {
    add('title', checkRequired(entry.title, 'Work title'));
    add('duration_from_year', checkYear(entry.duration_from_year, 'From year'));
    add('duration_from_month', checkMonth(entry.duration_from_month, 'From month'));
    add('duration_to_year', checkYear(entry.duration_to_year, 'To year'));
    add('duration_to_month', checkMonth(entry.duration_to_month, 'To month'));
    add('duration_from_year',
      checkNotFuture(entry.duration_from_year, entry.duration_from_month, 'Start date'));

    // Ordering only means something when the work has actually ended.
    if (!entry.currently_working) {
      add('duration_to_year',
        checkPeriod(entry.duration_from_year, entry.duration_from_month,
          entry.duration_to_year, entry.duration_to_month,
          'the start date', 'End date'));
    }
  }

  if (type === T.WHITE_PAPER) {
    add('title', checkRequired(entry.title, 'Title'));
    add('published_on_year', checkYear(entry.published_on_year, 'Published year'));
    add('published_on_month', checkMonth(entry.published_on_month, 'Published month'));
    add('published_on_year',
      checkNotFuture(entry.published_on_year, entry.published_on_month, 'Publication date'));
  }

  if (type === T.PRESENTATION) {
    add('title', checkRequired(entry.title, 'Presentation title'));
  }

  if (type === T.PATENT) {
    add('title', checkRequired(entry.title, 'Patent title'));
    add('patent_status', checkChoice(entry.patent_status, 'Patent status', PATENT_STATUS));
    add('issue_date_year', checkYear(entry.issue_date_year, 'Issue year'));
    add('issue_date_month', checkMonth(entry.issue_date_month, 'Issue month'));

    if (entry.patent_status === 'Patent issued' && isBlank(entry.issue_date_year)) {
      add('issue_date_year', 'Add the year this patent was issued');
    }
  }

  if (type === T.CERTIFICATION) {
    add('certification_name', checkRequired(entry.certification_name, 'Certification name'));
    add('issuing_organisation',
      checkLength(entry.issuing_organisation, 'Issuing organisation',
        ACCOMPLISHMENT_FIELD_LIMITS.issuing_organisation));
    add('certification_url',
      checkUrl(entry.certification_url, 'Credential URL',
        ACCOMPLISHMENT_FIELD_LIMITS.certification_url));

    const _isDate = (v) => {
      if (isBlank(v)) return true;
      const d = new Date(String(v).slice(0, 10));
      return !Number.isNaN(d.getTime());
    };
    if (!_isDate(entry.validity_from_date)) {
      add('validity_from_date', 'Completion date is not a valid date');
    }
    if (!_isDate(entry.validity_to_date)) {
      add('validity_to_date', 'Expiry date is not a valid date');
    }

    if (!entry.does_not_expire) {
      const f = cleanStr(entry.validity_from_date);
      const t = cleanStr(entry.validity_to_date);
      if (f && t && String(t).slice(0, 10) < String(f).slice(0, 10)) {
        add('validity_to_date', 'Expiry date must be after the completion date');
      }
      if (isBlank(entry.validity_from_date)) {
        add('validity_from_date',
          'Completion date is required (or mark the certificate as non-expiring)');
      }
    }

    if (entry.does_not_expire && !isBlank(entry.validity_to_date)) {
      add('validity_to_date',
        'Uncheck "does not expire" or clear the expiry date — cannot have both');
    }
  }

  if (type === T.OTHER) {
    add('title', checkRequired(entry.title, 'Title'));
  }

  return errors;
}
/**
 * Send only the fields that belong to the chosen type. The backend nulls the
 * rest anyway; doing it here stops a stale value from a previously selected
 * type reaching the API at all.
 */
export function buildAccomplishmentPayload(entry = {}) {
  const type = cleanStr(entry.accomplishment_type);
  const keep = accomplishmentFieldsFor(type);

  const payload = {
    accomplishment_type: type,
    title: null, url: null, description: null, social_profile: null,
    duration_from_year: null, duration_from_month: null,
    duration_to_year: null, duration_to_month: null, currently_working: false,
    published_on_year: null, published_on_month: null,
    patent_office: null, patent_status: null, application_number: null,
    issue_date_year: null, issue_date_month: null,
    certification_name: null, issuing_organisation: null, certification_url: null,
    validity_from_date: null, validity_to_date: null, does_not_expire: false,
  };

  const numeric = new Set([
    'duration_from_year', 'duration_from_month', 'duration_to_year', 'duration_to_month',
    'published_on_year', 'published_on_month', 'issue_date_year', 'issue_date_month',
  ]);
  const boolean = new Set(['currently_working', 'does_not_expire']);

  keep.forEach((field) => {
    if (boolean.has(field)) payload[field] = Boolean(entry[field]);
    else if (numeric.has(field)) payload[field] = toInt(entry[field]);
    else payload[field] = cleanStr(entry[field]);
  });

  // An ongoing item has no end date; a certificate that never expires has no
  // expiry. Leaving both set renders two contradictory things in the profile.
  if (payload.currently_working) {
    payload.duration_to_year = null;
    payload.duration_to_month = null;
  }
  if (payload.does_not_expire) {
    payload.validity_to_date = null;
  }

  return payload;
}

// ═══════════════════════════════════════════════════════════════════════════
// DIVERSITY & INCLUSION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Is this a real calendar date?
 *
 * Day, month and year were previously validated as three independent numbers,
 * so 31 February 2020 passed all three checks. Mirrors _is_real_date().
 */
export function isRealDate(year, month, day) {
  const y = toInt(year);
  const m = toInt(month);
  const d = toInt(day);
  if (y === null || m === null || d === null) return true;   // partial is fine
  if (m < 1 || m > 12) return false;
  const daysInMonth = new Date(y, m, 0).getDate();
  return d >= 1 && d <= daysInMonth;
}

export function validateDiversity(entry = {}, dateOfBirth = null) {
  const errors = {};
  const add = (field, message) => {
    if (message && !errors[field]) errors[field] = message;
  };

  Object.entries(DIVERSITY_FIELD_LIMITS).forEach(([field, limit]) => {
    const label = field.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
    add(field, checkLength(entry[field], label, limit));
  });

  // BUILD: 2026-08-03-diversity-dob-coherence — enrolment / discharge / career
  // break years cannot precede DOB, and the candidate must be at least 16 at
  // each event.
  const MIN_AGE_MILITARY = 16;
  const MIN_AGE_BREAK = 16;
  const _dobYear = (() => {
    if (isBlank(dateOfBirth)) return null;
    const d = new Date(String(dateOfBirth).slice(0, 10));
    return Number.isNaN(d.getTime()) ? null : d.getFullYear();
  })();
  if (_dobYear !== null) {
    const _check = (field, minAge, label) => {
      const yr = toInt(entry[field]);
      if (yr !== null && (yr - _dobYear) < minAge) {
        add(field,
          `${label} is too early — you would have been under ${minAge} (born ${_dobYear})`);
      }
    };
    _check('enrolment_year',  MIN_AGE_MILITARY, 'Enrolment year');
    _check('discharge_year',  MIN_AGE_MILITARY, 'Discharge year');
    _check('break_from_year', MIN_AGE_BREAK,    'Break from year');
    _check('break_till_year', MIN_AGE_BREAK,    'Break until year');
  }

  // ── Disability ──────────────────────────────────────────────────────────
  add('disability_status',
    checkChoice(entry.disability_status, 'Disability status', DISABILITY_STATUS));
  add('certificate_type',
    checkChoice(entry.certificate_type, 'Certificate type', CERTIFICATE_TYPES));
  add('disability_percentage',
    checkRange(entry.disability_percentage, 'Disability percentage', 0, 100));

  if (entry.disability_status === 'Have disability' && isBlank(entry.disability_type)) {
    add('disability_type', 'Tell us the type of disability');
  }

  // ── Military service ────────────────────────────────────────────────────
  add('military_status', checkChoice(entry.military_status, 'Military status', MILITARY_STATUS));

  [['enrolment', 'Enrolment'], ['discharge', 'Discharge']].forEach(([prefix, label]) => {
    add(`${prefix}_day`, checkRange(entry[`${prefix}_day`], `${label} day`, 1, 31));
    add(`${prefix}_month`, checkMonth(entry[`${prefix}_month`], `${label} month`));
    add(`${prefix}_year`, checkYear(entry[`${prefix}_year`], `${label} year`));

    if (!isRealDate(entry[`${prefix}_year`], entry[`${prefix}_month`], entry[`${prefix}_day`])) {
      add(`${prefix}_day`, `${label} date is not a real date`);
    }

    add(`${prefix}_year`,
      checkNotFuture(entry[`${prefix}_year`], entry[`${prefix}_month`], `${label} date`, entry[`${prefix}_day`]));
  });

  add('discharge_year',
    checkPeriod(entry.enrolment_year, entry.enrolment_month,
      entry.discharge_year, entry.discharge_month,
      'your enrolment date', 'Discharge date'));

  if (entry.military_status === 'Previously served' && isBlank(entry.discharge_year)) {
    add('discharge_year', 'Add the year you were discharged');
  }

  // ── Career break ────────────────────────────────────────────────────────
  add('career_break_status',
    checkChoice(entry.career_break_status, 'Career break status', CAREER_BREAK_STATUS));
  add('break_reason', checkChoice(entry.break_reason, 'Break reason', BREAK_REASONS));

  add('break_from_month', checkMonth(entry.break_from_month, 'Break from month'));
  add('break_from_year', checkYear(entry.break_from_year, 'Break from year'));
  add('break_till_month', checkMonth(entry.break_till_month, 'Break until month'));
  add('break_till_year', checkYear(entry.break_till_year, 'Break until year'));

  add('break_from_year',
    checkNotFuture(entry.break_from_year, entry.break_from_month, 'Break start date'));

  if (!entry.currently_on_break) {
    add('break_till_year',
      checkPeriod(entry.break_from_year, entry.break_from_month,
        entry.break_till_year, entry.break_till_month,
        'the start of your break', 'Break end date'));
  }

  if (entry.career_break_status === 'Have taken') {
    if (isBlank(entry.break_reason)) add('break_reason', 'Tell us the reason for your break');
    if (isBlank(entry.break_from_year)) add('break_from_year', 'Add the year your break started');
  }

  return errors;
}

/**
 * Clear the fields an answer makes irrelevant, so a value entered before the
 * user changed their answer does not travel to the API and reappear in the
 * profile. Mirrors _normalise() server-side.
 */
export function buildDiversityPayload(entry = {}) {
  const payload = {
    disability_status:     cleanStr(entry.disability_status),
    disability_type:       cleanStr(entry.disability_type, DIVERSITY_FIELD_LIMITS.disability_type),
    disability_percentage: toNum(entry.disability_percentage),
    disability_reason:     cleanStr(entry.disability_reason, DIVERSITY_FIELD_LIMITS.disability_reason),
    certificate_type:      cleanStr(entry.certificate_type),

    military_status: cleanStr(entry.military_status),
    service_type:    cleanStr(entry.service_type, DIVERSITY_FIELD_LIMITS.service_type),
    service_number:  cleanStr(entry.service_number, DIVERSITY_FIELD_LIMITS.service_number),
    enrolment_day:   toInt(entry.enrolment_day),
    enrolment_month: toInt(entry.enrolment_month),
    enrolment_year:  toInt(entry.enrolment_year),
    discharge_day:   toInt(entry.discharge_day),
    discharge_month: toInt(entry.discharge_month),
    discharge_year:  toInt(entry.discharge_year),

    career_break_status: cleanStr(entry.career_break_status),
    break_reason:        cleanStr(entry.break_reason),
    break_from_month:    toInt(entry.break_from_month),
    break_from_year:     toInt(entry.break_from_year),
    break_till_month:    toInt(entry.break_till_month),
    break_till_year:     toInt(entry.break_till_year),
    currently_on_break:  Boolean(entry.currently_on_break),
  };

  if (payload.disability_status === 'Do not have disability') {
    payload.disability_type = null;
    payload.disability_percentage = null;
    payload.disability_reason = null;
    payload.certificate_type = null;
  }

  if (payload.military_status === 'Never served') {
    ['service_type', 'service_number',
      'enrolment_day', 'enrolment_month', 'enrolment_year',
      'discharge_day', 'discharge_month', 'discharge_year',
    ].forEach((f) => { payload[f] = null; });
  }

  if (payload.military_status === 'Currently serving') {
    payload.discharge_day = null;
    payload.discharge_month = null;
    payload.discharge_year = null;
  }

  if (payload.career_break_status === 'Have not taken') {
    ['break_reason', 'break_from_month', 'break_from_year',
      'break_till_month', 'break_till_year',
    ].forEach((f) => { payload[f] = null; });
    payload.currently_on_break = false;
  }

  if (payload.currently_on_break) {
    payload.break_till_month = null;
    payload.break_till_year = null;
  }

  return payload;
}

// ═══════════════════════════════════════════════════════════════════════════
// PERSONAL DETAILS
// ═══════════════════════════════════════════════════════════════════════════

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/;

/** Age in whole years, or null when the date is unusable. */
export function ageFrom(dateOfBirth) {
  if (isBlank(dateOfBirth)) return null;
  const dob = new Date(String(dateOfBirth).slice(0, 10));
  if (Number.isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age -= 1;
  return age;
}

export function validatePersonalDetails(entry = {}) {
  const errors = {};
  const add = (field, message) => {
    if (message && !errors[field]) errors[field] = message;
  };

  add('first_name', checkRequired(entry.first_name, 'First name'));
  add('last_name', checkRequired(entry.last_name, 'Last name'));

  Object.entries(PERSONAL_FIELD_LIMITS).forEach(([field, limit]) => {
    const label = field.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
    add(field, checkLength(entry[field], label, limit));
  });

  // Email is not editable here — the account owns it — but validate anything
  // that does arrive rather than letting it reach the database.
  if (!isBlank(entry.email) && !EMAIL_PATTERN.test(String(entry.email).trim())) {
    add('email', 'Enter a valid email address');
  }

  if (!isBlank(entry.phone_number)) {
    const digits = String(entry.phone_number).replace(/\D/g, '');
    const cc = cleanStr(entry.country_code) || '';
    if (cc === '+91') {
      if (digits.length !== 10) {
        add('phone_number', 'Indian phone numbers must be exactly 10 digits');
      }
    } else if (digits.length < 7 || digits.length > 15) {
      add('phone_number', 'Phone number must be 7 to 15 digits');
    }
  }

  add('gender', checkChoice(entry.gender, 'Gender', GENDER_OPTIONS));
  add('marital_status',
    checkChoice(entry.marital_status, 'Marital status', MARITAL_STATUS_OPTIONS));
  add('category', checkChoice(entry.category, 'Category', CATEGORY_OPTIONS));

  if (entry.gender === 'Other' && isBlank(entry.gender_other)) {
    add('gender_other', 'Tell us how you describe your gender');
  }

  ['current_pincode', 'permanent_pincode'].forEach((field) => {
    if (!isBlank(entry[field]) && !/^\d{4,10}$/.test(String(entry[field]).trim())) {
      add(field, 'Enter a valid pincode');
    }
  });

  const age = ageFrom(entry.date_of_birth);
  if (!isBlank(entry.date_of_birth)) {
    if (age === null) add('date_of_birth', 'Enter a valid date');
    else if (age < MIN_AGE) add('date_of_birth', `You must be at least ${MIN_AGE} to use this service`);
    else if (age > MAX_AGE) add('date_of_birth', 'Check the year of birth');
  }

  const invalidInfo = splitCsv(entry.more_information)
    .filter((v) => !MORE_INFORMATION_OPTIONS.includes(v));
  if (invalidInfo.length) {
    add('more_information',
      `More information must be chosen from: ${MORE_INFORMATION_OPTIONS.join(', ')}`);
  }

  return errors;
}

/**
 * Build the update body.
 *
 * jobseekerService.updateProfile remaps phone -> phone_number and
 * current_address -> current_address_line, so the frontend names are used
 * here. Blank strings are dropped: the endpoint treats a submitted key as an
 * instruction to write it, so sending "" would blank a stored value the user
 * never touched.
 */
export function buildPersonalDetailsPayload(entry = {}) {
  const out = {};
  const put = (key, value) => {
    if (value !== null && value !== undefined && value !== '') out[key] = value;
  };

  put('first_name', cleanStr(entry.first_name, PERSONAL_FIELD_LIMITS.first_name));
  put('middle_name', cleanStr(entry.middle_name, PERSONAL_FIELD_LIMITS.middle_name));
  put('last_name', cleanStr(entry.last_name, PERSONAL_FIELD_LIMITS.last_name));
  put('phone', cleanStr(entry.phone_number || entry.phone));
  put('country_code', cleanStr(entry.country_code));
  put('date_of_birth', cleanStr(entry.date_of_birth));
  put('gender', cleanStr(entry.gender));
  put('gender_other', entry.gender === 'Other' ? cleanStr(entry.gender_other) : null);
  put('category', cleanStr(entry.category));
  put('marital_status', cleanStr(entry.marital_status));

  const info = splitCsv(entry.more_information);
  if (info.length) out.more_information = info;

  put('current_address', cleanStr(entry.current_address_line || entry.current_address));
  put('current_city', cleanStr(entry.current_city));
  put('current_district', cleanStr(entry.current_district));
  put('current_state', cleanStr(entry.current_state));
  put('current_pincode', cleanStr(entry.current_pincode));

  put('permanent_address', cleanStr(entry.permanent_address_line || entry.permanent_address));
  put('permanent_city', cleanStr(entry.permanent_city));
  put('permanent_district', cleanStr(entry.permanent_district));
  put('permanent_state', cleanStr(entry.permanent_state));
  put('permanent_pincode', cleanStr(entry.permanent_pincode));

  put('hometown', cleanStr(entry.hometown));

  return out;
}

// ═══════════════════════════════════════════════════════════════════════════
// ONLINE PROFILES
// ═══════════════════════════════════════════════════════════════════════════

export function validateOnlineProfile(entry = {}) {
  const errors = {};
  const add = (field, message) => {
    if (message && !errors[field]) errors[field] = message;
  };

  add('platform_key', checkRequired(entry.platform_key, 'Platform'));
  add('platform_key',
    checkChoice(entry.platform_key, 'Platform', ONLINE_PLATFORMS.map((p) => p.key)));

  add('url', checkRequired(entry.url, 'Link'));
  add('url', checkUrl(entry.url, 'Link', ONLINE_PROFILE_LIMITS.url));
  add('label', checkLength(entry.label, 'Label', ONLINE_PROFILE_LIMITS.label));

  // "Other" is a catch-all, so without a label the entry says nothing.
  if (entry.platform_key === 'other' && isBlank(entry.label)) {
    add('label', 'Give this link a name');
  }

  return errors;
}

export function buildOnlineProfilePayload(entry = {}) {
  const key = (cleanStr(entry.platform_key) || '').toLowerCase();
  const platform = ONLINE_PLATFORMS.find((p) => p.key === key);
  return {
    platform_key: key || null,
    // Fall back to the platform's own name so a row always renders with
    // something readable.
    label: cleanStr(entry.label, ONLINE_PROFILE_LIMITS.label) || platform?.label || null,
    url: cleanStr(entry.url, ONLINE_PROFILE_LIMITS.url),
  };
}

// ── Helpers for form components ────────────────────────────────────────────

export const hasErrors = (errors) => Boolean(errors && Object.keys(errors).length);

/** First error message, for a toast summary. */
export const firstError = (errors) =>
  errors && Object.keys(errors).length ? Object.values(errors)[0] : null;

/** Merge client-side and server-side errors; server wins on conflict. */
export const mergeErrors = (clientErrors, serverErrors) => ({
  ...(clientErrors || {}),
  ...(serverErrors || {}),
});