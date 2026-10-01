

// ── Design tokens ──────────────────────────────────────────────────────────
export const PALETTE = {
  navy:     '#1E3358',
  accent:   '#4666B8',
  muted:    '#9CA3AF',
  offWhite: '#FAFAFA',
  border:   '#E5E7EB',
  success:  '#2E7D32',
  warning:  '#ED6C02',
  danger:   '#C62828',
  surface:  '#FFFFFF',
  charcoal: '#273238',
  sage:     '#7F9E7E',
  sageTint: 'rgba(127,158,126,0.1)',
};

export const FONTS = {
  body:    '"DM Sans", system-ui, -apple-system, sans-serif',
  display: '"DM Serif Display", Georgia, serif',
};

// ── Year helpers ───────────────────────────────────────────────────────────
// Backend: _validators.py MIN_YEAR = 1950, max = current year + 8
export const MIN_YEAR = 1950;
export const FUTURE_YEAR_ALLOWANCE = 8;

export const currentYear = () => new Date().getFullYear();
export const maxYear = () => currentYear() + FUTURE_YEAR_ALLOWANCE;

export const yearOptions = (from = MIN_YEAR, to = maxYear()) => {
  const years = [];
  for (let y = to; y >= from; y -= 1) years.push(y);
  return years;
};

export const MONTHS = [
  { value: 1,  label: 'January'   },
  { value: 2,  label: 'February'  },
  { value: 3,  label: 'March'     },
  { value: 4,  label: 'April'     },
  { value: 5,  label: 'May'       },
  { value: 6,  label: 'June'      },
  { value: 7,  label: 'July'      },
  { value: 8,  label: 'August'    },
  { value: 9,  label: 'September' },
  { value: 10, label: 'October'   },
  { value: 11, label: 'November'  },
  { value: 12, label: 'December'  },
];

export const monthLabel = (value) =>
  MONTHS.find((m) => m.value === Number(value))?.label || '';

// ═══════════════════════════════════════════════════════════════════════════
// EDUCATION — tbl_Job_Seeker_Education
// ═══════════════════════════════════════════════════════════════════════════

export const EDUCATION_LEVELS = {
  TENTH:      '10th',
  TWELFTH:    '12th',
  GRADUATION: 'Graduation/Diploma',
  MASTERS:    'Masters/Post-Graduation',
  DOCTORATE:  'Doctorate/PhD',
  OTHER:      'Other',
};

export const EDUCATION_LEVEL_OPTIONS = [
  EDUCATION_LEVELS.TENTH,
  EDUCATION_LEVELS.TWELFTH,
  EDUCATION_LEVELS.GRADUATION,
  EDUCATION_LEVELS.MASTERS,
  EDUCATION_LEVELS.DOCTORATE,
  EDUCATION_LEVELS.OTHER,
];

export const SCHOOL_LEVELS = [EDUCATION_LEVELS.TENTH, EDUCATION_LEVELS.TWELFTH];

export const UNIVERSITY_LEVELS = [
  EDUCATION_LEVELS.GRADUATION,
  EDUCATION_LEVELS.MASTERS,
  EDUCATION_LEVELS.DOCTORATE,
];

/** Display order — highest qualification first. Mirrors LEVEL_RANK server-side. */
export const EDUCATION_LEVEL_RANK = {
  [EDUCATION_LEVELS.DOCTORATE]:  1,
  [EDUCATION_LEVELS.MASTERS]:    2,
  [EDUCATION_LEVELS.GRADUATION]: 3,
  [EDUCATION_LEVELS.TWELFTH]:    4,
  [EDUCATION_LEVELS.TENTH]:      5,
  [EDUCATION_LEVELS.OTHER]:      6,
};

export const COURSE_TYPES = [
  'Full time',
  'Part time',
  'Correspondence/Distance learning',
];

export const GRADING_SYSTEMS = {
  SCALE_10: 'Scale 10 Grading System',
  SCALE_4:  'Scale 4 Grading System',
  PERCENT:  '% Marks of 100 Maximum',
  PASS:     'Course Requires a Pass',
};

export const GRADING_SYSTEM_OPTIONS = [
  GRADING_SYSTEMS.SCALE_10,
  GRADING_SYSTEMS.SCALE_4,
  GRADING_SYSTEMS.PERCENT,
  GRADING_SYSTEMS.PASS,
];

export const GRADING_BOUNDS = {
  [GRADING_SYSTEMS.SCALE_10]: { min: 0, max: 10,  label: 'CGPA',       step: 0.01 },
  [GRADING_SYSTEMS.SCALE_4]:  { min: 0, max: 4,   label: 'GPA',        step: 0.01 },
  [GRADING_SYSTEMS.PERCENT]:  { min: 0, max: 100, label: 'Percentage', step: 0.01 },
  [GRADING_SYSTEMS.PASS]:     { min: null, max: null, label: null,     step: null },
};

/** Chronology pairs — [earlier, later]. Mirrors LEVEL_SEQUENCE server-side. */
export const EDUCATION_SEQUENCE = [
  [EDUCATION_LEVELS.TENTH,      EDUCATION_LEVELS.TWELFTH],
  [EDUCATION_LEVELS.TWELFTH,    EDUCATION_LEVELS.GRADUATION],
  [EDUCATION_LEVELS.GRADUATION, EDUCATION_LEVELS.MASTERS],
  [EDUCATION_LEVELS.MASTERS,    EDUCATION_LEVELS.DOCTORATE],
];

export const SCHOOL_MEDIUMS = [
  'English', 'Hindi', 'Telugu', 'Tamil', 'Kannada', 'Malayalam',
  'Marathi', 'Bengali', 'Gujarati', 'Punjabi', 'Urdu', 'Other',
];

export const EDUCATION_FIELD_LIMITS = {
  board:                   150,
  school_medium:           50,
  university_institute:    200,
  course:                  150,
  specialization:          150,
  other_education_details: 150,
};

// ═══════════════════════════════════════════════════════════════════════════
// EMPLOYMENT — tbl_Job_Seeker_Employment
// ═══════════════════════════════════════════════════════════════════════════

export const EMPLOYMENT_TYPES = ['Full-time', 'Internship'];

export const NOTICE_PERIODS = [
  'Not Applicable',
  'Serving Notice Period',
  '15 Days or less',
  '1 Month',
  '2 Months',
  '3 Months',
  'More than 3 Months',
];

export const EMPLOYMENT_FIELD_LIMITS = {
  company_name: 150,
  job_title:    150,
  skills_used:  500,
  job_profile:  4000,
};

/**
 * current_salary is DECIMAL(15,2) — 13 digits before the decimal point.
 * Exceeding it produces MySQL error 1264 and a 500, so the form blocks it.
 */
export const SALARY_MAX_INTEGER_DIGITS = 13;
export const SALARY_MAX = 10 ** SALARY_MAX_INTEGER_DIGITS - 1;

export const CURRENCIES = ['₹', '$', '€', '£', '¥', 'A$', 'C$', 'S$', 'AED'];

export const EXPERIENCE_YEARS = Array.from({ length: 51 }, (_, i) => i);   // 0-50
export const EXPERIENCE_MONTHS = Array.from({ length: 12 }, (_, i) => i);  // 0-11

// ═══════════════════════════════════════════════════════════════════════════
// SHARED
// ═══════════════════════════════════════════════════════════════════════════

export const PROFILE_SUMMARY_MAX = 1000;   // VARCHAR(1000)
export const PROFILE_SUMMARY_MIN = 20;     // backend MIN_SUMMARY_LENGTH
export const RESUME_HEADLINE_MAX = 250;    // VARCHAR(250)
export const RESUME_HEADLINE_MIN_WORDS = 5;



export const DESIRED_JOB_TYPES = ['Permanent', 'Contractual', 'Both'];
export const DESIRED_EMPLOYMENT_TYPES = ['Full time', 'Part time', 'Both'];
export const PREFERRED_SHIFTS = ['Day', 'Night', 'Flexible'];

export const MAX_PREFERRED_LOCATIONS = 10;
export const MAX_LOCATION_FIELD = 500;      // VARCHAR(500) once comma-joined

export const CAREER_FIELD_LIMITS = {
  current_industry: 150,
  department:       150,
  role_category:    150,
  job_role:         150,
};

export const INDUSTRY_SUGGESTIONS = [
  'IT Services & Consulting', 'Software Product', 'BPO / KPO', 'Banking',
  'Financial Services', 'Insurance', 'Healthcare', 'Pharmaceutical',
  'Education & Training', 'Manufacturing', 'Automobile', 'Construction',
  'Retail', 'E-commerce', 'Telecom', 'Media & Entertainment', 'Logistics',
  'Real Estate', 'Government', 'Other',
];

export const DEPARTMENT_SUGGESTIONS = [
  'Engineering - Software', 'Engineering - Hardware', 'Data Science & Analytics',
  'IT & Information Security', 'Product Management', 'UX / Design',
  'Quality Assurance', 'DevOps', 'Sales & Business Development', 'Marketing',
  'Human Resources', 'Finance & Accounting', 'Operations', 'Customer Support',
  'Consulting', 'Research & Development', 'Other',
];

export const LOCATION_SUGGESTIONS = [
  'Hyderabad', 'Bengaluru', 'Chennai', 'Pune', 'Mumbai', 'Delhi', 'Noida',
  'Gurugram', 'Kolkata', 'Ahmedabad', 'Kochi', 'Coimbatore', 'Jaipur',
  'Indore', 'Chandigarh', 'Visakhapatnam', 'Remote', 'Anywhere in India',
];

export const PROFILE_SECTIONS = [
  { id: 'resume',          label: 'Resume',             weight: 15, required: true  },
  { id: 'skills',          label: 'Key skills',         weight: 12, required: true  },
  { id: 'summary',         label: 'Profile summary',    weight: 8,  required: false },
  { id: 'employment',      label: 'Employment',         weight: 10, required: false },
  { id: 'education',       label: 'Education',          weight: 10, required: true  },
  { id: 'projects',        label: 'Projects',           weight: 8,  required: false },
  { id: 'quickInterview',  label: 'Quick interview',    weight: 8,  required: false },
  { id: 'headline',        label: 'Resume headline',    weight: 4,  required: false },
  { id: 'photo',           label: 'Profile photo',      weight: 4,  required: false },
  { id: 'career',          label: 'Career preferences', weight: 5,  required: false },
  { id: 'certifications',  label: 'Certifications',     weight: 4,  required: false },
  { id: 'accomplishments', label: 'Accomplishments',    weight: 3,  required: false },
  { id: 'onlineProfiles',  label: 'Online profiles',    weight: 3,  required: false },
  { id: 'languages',       label: 'Languages',          weight: 2,  required: false },
  { id: 'basic',           label: 'Personal details',   weight: 2,  required: true  },
  { id: 'diversity',       label: 'Diversity',          weight: 2,  required: false },
];

/** Sanity check — the scored weights must total 100. */
export const PROFILE_WEIGHT_TOTAL = PROFILE_SECTIONS
  .reduce((sum, s) => sum + s.weight, 0);

// ═══════════════════════════════════════════════════════════════════════════
// KEY SKILLS — tbl_Job_Seeker_Key_Skills
// ═══════════════════════════════════════════════════════════════════════════

export const SKILL_FIELD_LIMITS = {
  skill_name:       100,
  software_version: 50,
};

export const MAX_SKILLS_PER_CANDIDATE = 50;

export const SKILL_SUGGESTIONS = [
  'Python', 'JavaScript', 'TypeScript', 'Java', 'C++', 'C#', 'Go', 'Rust',
  'React', 'Angular', 'Vue.js', 'Node.js', 'Django', 'Flask', 'FastAPI',
  'Spring Boot', '.NET', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis',
  'AWS', 'Azure', 'Google Cloud', 'Docker', 'Kubernetes', 'Git',
  'REST APIs', 'GraphQL', 'CI/CD', 'Linux', 'HTML', 'CSS', 'Tailwind CSS',
  'Figma', 'Machine Learning', 'Data Analysis', 'Pandas', 'TensorFlow',
];

// ═══════════════════════════════════════════════════════════════════════════
// LANGUAGES — tbl_Job_Seeker_Language
// ═══════════════════════════════════════════════════════════════════════════

export const LANGUAGE_PROFICIENCY = ['Beginner', 'Intermediate', 'Proficient', 'Expert'];

export const MAX_LANGUAGE_NAME = 50;
export const MAX_LANGUAGES_PER_CANDIDATE = 20;

export const LANGUAGE_SUGGESTIONS = [
  'English', 'Hindi', 'Telugu', 'Tamil', 'Kannada', 'Malayalam', 'Marathi',
  'Bengali', 'Gujarati', 'Punjabi', 'Odia', 'Assamese', 'Urdu', 'Sanskrit',
  'French', 'German', 'Spanish', 'Japanese', 'Mandarin', 'Arabic',
];

// ═══════════════════════════════════════════════════════════════════════════
// PROJECTS — tbl_Job_Seeker_Project
// ═══════════════════════════════════════════════════════════════════════════

export const PROJECT_STATUS = ['In progress', 'Finished'];
export const PROJECT_SITE = ['Offsite', 'Onsite'];
export const PROJECT_NATURE_OF_EMPLOYMENT = ['Full time', 'Part time', 'Contractual'];

export const PROJECT_FIELD_LIMITS = {
  project_title:            200,
  tag_employment_education: 200,
  client:                   150,
  details_of_project:       1000,
  project_location:         200,
  team_size:                50,
  role:                     150,
  role_description:         250,
  skills_used:              500,
  github_url:               500,
  live_link:                500,
};

export const MAX_TEAM_SIZE = 10000;
export const MAX_PROJECTS_PER_CANDIDATE = 30;

// ═══════════════════════════════════════════════════════════════════════════
// ACCOMPLISHMENTS — tbl_Job_Seeker_Accomplishment
// ═══════════════════════════════════════════════════════════════════════════

export const ACCOMPLISHMENT_TYPES = {
  ONLINE_PROFILE: 'Online Profile',
  WORK_SAMPLE:    'Work Sample',
  WHITE_PAPER:    'White Paper/Research Publication/Journal Entry',
  PRESENTATION:   'Presentation',
  PATENT:         'Patent',
  CERTIFICATION:  'Certification',
  OTHER:          'Other',
};

export const ACCOMPLISHMENT_TYPE_OPTIONS = [
  ACCOMPLISHMENT_TYPES.ONLINE_PROFILE,
  ACCOMPLISHMENT_TYPES.WORK_SAMPLE,
  ACCOMPLISHMENT_TYPES.WHITE_PAPER,
  ACCOMPLISHMENT_TYPES.PRESENTATION,
  ACCOMPLISHMENT_TYPES.PATENT,
  ACCOMPLISHMENT_TYPES.OTHER,
];

/** Shorter labels for the type picker; the full value still goes to the API. */
export const ACCOMPLISHMENT_TYPE_LABELS = {
  [ACCOMPLISHMENT_TYPES.ONLINE_PROFILE]: 'Online profile',
  [ACCOMPLISHMENT_TYPES.WORK_SAMPLE]:    'Work sample',
  [ACCOMPLISHMENT_TYPES.WHITE_PAPER]:    'Paper or publication',
  [ACCOMPLISHMENT_TYPES.PRESENTATION]:   'Presentation',
  [ACCOMPLISHMENT_TYPES.PATENT]:         'Patent',
  [ACCOMPLISHMENT_TYPES.CERTIFICATION]:  'Certification',
  [ACCOMPLISHMENT_TYPES.OTHER]:          'Other',
};

export const PATENT_STATUS = ['Patent issued', 'Patent pending'];

export const ACCOMPLISHMENT_FIELD_LIMITS = {
  title:              200,
  url:                500,
  description:        500,
  social_profile:     150,
  patent_office:      150,
  application_number: 100,
  certification_name:    200,
  issuing_organisation:  200,
  certification_url:     500,
};

export const MAX_ACCOMPLISHMENTS_PER_CANDIDATE = 40;

/** Which fields each type shows. Mirrors TYPE_FIELDS server-side. */
export const ACCOMPLISHMENT_TYPE_FIELDS = {
  [ACCOMPLISHMENT_TYPES.ONLINE_PROFILE]: ['social_profile', 'url', 'description'],
  [ACCOMPLISHMENT_TYPES.WORK_SAMPLE]: [
    'title', 'url', 'description',
    'duration_from_year', 'duration_from_month',
    'duration_to_year', 'duration_to_month', 'currently_working',
  ],
  [ACCOMPLISHMENT_TYPES.WHITE_PAPER]: [
    'title', 'url', 'description', 'published_on_year', 'published_on_month',
  ],
  [ACCOMPLISHMENT_TYPES.PRESENTATION]: ['title', 'url', 'description'],
  [ACCOMPLISHMENT_TYPES.PATENT]: [
    'title', 'url', 'description', 'patent_office', 'patent_status',
    'application_number', 'issue_date_year', 'issue_date_month',
  ],
 [ACCOMPLISHMENT_TYPES.CERTIFICATION]: [
    'certification_name', 'issuing_organisation', 'certification_url',
    'validity_from_date', 'validity_to_date', 'does_not_expire',
  ],
  [ACCOMPLISHMENT_TYPES.OTHER]: ['title', 'url', 'description'],
};

// ═══════════════════════════════════════════════════════════════════════════
// RESUME — tbl_Job_Seeker_Resume
// ═══════════════════════════════════════════════════════════════════════════

export const RESUME_MAX_FILE_SIZE = 5 * 1024 * 1024;   // backend MAX_FILE_SIZE
export const RESUME_ALLOWED_EXTENSIONS = ['pdf', 'docx'];
export const RESUME_ACCEPT_ATTRIBUTE = '.pdf,.docx';


export const DISABILITY_STATUS = ['Have disability', 'Do not have disability'];
export const CERTIFICATE_TYPES = ['UDID', 'Other certificate'];
export const MILITARY_STATUS = ['Currently serving', 'Previously served', 'Never served'];
export const CAREER_BREAK_STATUS = ['Have taken', 'Have not taken'];
export const BREAK_REASONS = ['Child care', 'Education', 'Medical', 'Layoff', 'Personal'];

/** Suggestions only — the form allows free text, so this is not a whitelist. */
export const DISABILITY_REASON_SUGGESTIONS = [
  'Genetic', 'Accident', 'Medicine', 'Diseases', 'By birth',
];

export const DISABILITY_TYPE_SUGGESTIONS = [
  'Visual impairment', 'Hearing impairment', 'Speech impairment',
  'Locomotor disability', 'Intellectual disability', 'Mental illness',
  'Multiple disabilities', 'Other',
];

export const DIVERSITY_FIELD_LIMITS = {
  disability_type:   150,
  disability_reason: 100,
  service_type:      100,
  service_number:    100,
};

export const DIVERSITY_MAX_DOC_SIZE = 10 * 1024 * 1024;   // backend MAX_DOC_SIZE
export const DIVERSITY_ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'];
export const DIVERSITY_ACCEPT_ATTRIBUTE = '.pdf,.jpg,.jpeg,.png,.doc,.docx';

export const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

// ═══════════════════════════════════════════════════════════════════════════
// PERSONAL DETAILS — tbl_Job_Seeker
// ═══════════════════════════════════════════════════════════════════════════

export const GENDER_OPTIONS = ['Male', 'Female', 'Other', 'Prefer Not to Say'];

export const MARITAL_STATUS_OPTIONS = [
  'Single/Unmarried', 'Married', 'Widowed', 'Divorced', 'Separated', 'Other',
];

export const CATEGORY_OPTIONS = [
  'General', 'Scheduled Caste (SC)', 'Scheduled Tribe (ST)',
  'OBC - Creamy', 'OBC - Non creamy', 'Other',
];

/** MySQL SET column — values must match the definition exactly. */
export const MORE_INFORMATION_OPTIONS = [
  'Single parent', 'Working mother', 'Retired 60+', 'LGBTQ+',
];

export const PERSONAL_FIELD_LIMITS = {
  first_name: 50, middle_name: 50, last_name: 50,
  email: 150, phone_number: 15, country_code: 10,
  gender_other: 50,
  work_permit_usa: 100, work_permit_other: 255,
  current_address_line: 255, current_city: 100,
  current_district: 100, current_state: 100, current_pincode: 10,
  permanent_address_line: 255, permanent_city: 100,
  permanent_district: 100, permanent_state: 100, permanent_pincode: 10,
  hometown: 100,
};

export const MIN_AGE = 16;
export const MAX_AGE = 100;

export const COUNTRY_CODES = ['+91', '+1', '+44', '+61', '+65', '+971', '+49', '+81'];

// ═══════════════════════════════════════════════════════════════════════════
// PROFILE PHOTO
// ═══════════════════════════════════════════════════════════════════════════

export const PHOTO_MAX_FILE_SIZE = 5 * 1024 * 1024;   // backend MAX_PHOTO_SIZE
export const PHOTO_ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
export const PHOTO_ACCEPT_ATTRIBUTE = 'image/jpeg,image/png,image/gif,image/webp';

export const ONLINE_PLATFORMS = [
  { key: 'linkedin',      label: 'LinkedIn',       hint: 'https://linkedin.com/in/you' },
  { key: 'github',        label: 'GitHub',         hint: 'https://github.com/you' },
  { key: 'portfolio',     label: 'Portfolio',      hint: 'https://yoursite.com' },
  { key: 'behance',       label: 'Behance',        hint: 'https://behance.net/you' },
  { key: 'dribbble',      label: 'Dribbble',       hint: 'https://dribbble.com/you' },
  { key: 'stackoverflow', label: 'Stack Overflow', hint: 'https://stackoverflow.com/users/…' },
  { key: 'medium',        label: 'Medium',         hint: 'https://medium.com/@you' },
  { key: 'kaggle',        label: 'Kaggle',         hint: 'https://kaggle.com/you' },
  { key: 'leetcode',      label: 'LeetCode',       hint: 'https://leetcode.com/you' },
  { key: 'other',         label: 'Other',          hint: 'https://…' },
];

export const ONLINE_PROFILE_LIMITS = { label: 100, url: 500 };
export const MAX_ONLINE_PROFILES = 10;

// ═══════════════════════════════════════════════════════════════════════════
// QUICK INTERVIEW
// ═══════════════════════════════════════════════════════════════════════════

export const QUICK_INTERVIEW_ROUTE = '/jobseeker/quick-interview/session';
export const QUICK_INTERVIEW_ACTIVE_STATUSES = ['started', 'in_progress'];