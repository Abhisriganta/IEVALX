import api from '@/services/api/axiosInstance';

const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem('ievalx_user') || '{}');
  } catch {
    return {};
  }
};

const authHeader = () => {
  const token = localStorage.getItem('ievalx_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const UPLOAD_TIMEOUT = 120000; // 2 minutes

const BACKEND_TO_FRONTEND = {
  candidate_id:           'id',
  phone_number:           'phone',
  current_address_line:   'current_address',
  permanent_address_line: 'permanent_address',
};

const FRONTEND_TO_BACKEND = {
  phone:            'phone_number',
  current_address:  'current_address_line',
  permanent_address:'permanent_address_line',
};

const FILE_KEY_MAP = {
  profile_image: 'profile_photo',
};

const MARITAL_BACKEND_TO_FRONTEND = {
  'Single/Unmarried': 'Single',
  'Separated':        'Divorced',
};
const MARITAL_FRONTEND_TO_BACKEND = {
  'Single': 'Single/Unmarried',
};

const normalizeProfile = (candidate = {}) => {
  const mapped = { ...candidate };
  Object.entries(BACKEND_TO_FRONTEND).forEach(([bk, fk]) => {
    if (mapped[bk] !== undefined) mapped[fk] = mapped[fk] ?? mapped[bk];
  });
  const rawMarital = mapped.marital_status || '';
  const marital    = MARITAL_BACKEND_TO_FRONTEND[rawMarital] ?? rawMarital;
  return {
    id:           mapped.id           || mapped.candidate_id || null,
    first_name:   mapped.first_name   || '',
    middle_name:  mapped.middle_name  || '',
    last_name:    mapped.last_name    || '',
    email:        mapped.email        || '',
    phone:        mapped.phone        || mapped.phone_number || '',
    phone_number: mapped.phone_number || mapped.phone        || '',
    country_code: mapped.country_code || '+91',
    date_of_birth:  mapped.date_of_birth  || '',
    gender:         mapped.gender         || '',
    gender_other:   mapped.gender_other   || '',
    category:       mapped.category       || '',
    marital_status: marital,
    has_disability:        mapped.has_disability        || 0,
    disability_percentage: mapped.disability_percentage || '',
    disability_proof_doc:  mapped.disability_proof_doc  || '',
    current_address:  mapped.current_address  || mapped.current_address_line  || '',
    current_city:     mapped.current_city     || '',
    current_district: mapped.current_district || '',
    current_state:    mapped.current_state    || '',
    current_pincode:  mapped.current_pincode  || '',
    current_country:  mapped.current_country  || 'India',
    permanent_address:  mapped.permanent_address  || mapped.permanent_address_line  || '',
    permanent_city:     mapped.permanent_city     || '',
    permanent_district: mapped.permanent_district || '',
    permanent_state:    mapped.permanent_state    || '',
    permanent_pincode:  mapped.permanent_pincode  || '',
    permanent_country:  mapped.permanent_country  || 'India',
    hometown:         mapped.hometown          || '',
    more_information: mapped.more_information  || '',
    work_permit_usa:  mapped.work_permit_usa   || '',
    work_permit_other:mapped.work_permit_other || '',
    profile_image:     mapped.profile_image     || '',
    profile_image_url: mapped.profile_image_url || '',
    profile_photo_id:  mapped.profile_photo_id  || '',
    status:            mapped.status            ?? 1,
    is_email_verified: mapped.is_email_verified ?? false,
    is_phone_verified: mapped.is_phone_verified ?? false,
    notice_period:     mapped.notice_period     || '',
    expected_salary:   mapped.expected_salary   || '',
    updated_at:        mapped.updated_at        || '',
    created_at:        mapped.created_at        || '',
  };
};

const remapObjectForBackend = (obj = {}) => {
  const result = {};
  Object.entries(obj).forEach(([k, v]) => {
    const bk = FRONTEND_TO_BACKEND[k] || k;
    result[bk] = (bk === 'marital_status' && typeof v === 'string')
      ? (MARITAL_FRONTEND_TO_BACKEND[v] ?? v)
      : v;
  });
  return result;
};

const remapFormDataForBackend = (fd) => {
  const newFd = new FormData();
  for (const [key, value] of fd.entries()) {
    const bk = FRONTEND_TO_BACKEND[key] || FILE_KEY_MAP[key] || key;
    if (bk === 'marital_status' && typeof value === 'string') {
      newFd.append(bk, MARITAL_FRONTEND_TO_BACKEND[value] ?? value);
    } else {
      newFd.append(bk, value);
    }
  }
  return newFd;
};

const resolveResumeFilename = (r = {}) =>
  r.original_filename ||
  r.Original_Filename ||
  r.filename          ||
  r.resume_filename   ||
  r.file_name         ||
  r.name              ||
  '';

const normalizeResumeData = (responseData = {}) => {
  const r = responseData.resume || responseData || {};
  return {
    filename:    resolveResumeFilename(r),
    updated_at:  r.updated_at  || r.created_at || '',
    _raw: r,
  };
};

// 🔧 CHANGE 1/1: english_marks and maths_marks were missing from this
// builder entirely, so 12th-standard subject marks were dropped on the way to
// the API and could never be saved — the backend has always accepted them.
// Also switched the string fields to a trim-aware helper: `|| null` turned a
// whitespace-only value into the string itself rather than null.
const buildEduPayload = (eduData) => {
  const numOrNull = (v) => (v !== '' && v !== null && v !== undefined ? Number(v) : null);
  const strOrNull = (v) => (v && String(v).trim() ? String(v).trim() : null);
  return {
    education_level:            eduData.education_level,
    board:                      strOrNull(eduData.board),
    passing_out_year:           numOrNull(eduData.passing_out_year),
    school_medium:              strOrNull(eduData.school_medium),
    marks:                      numOrNull(eduData.marks),
    english_marks:              numOrNull(eduData.english_marks),
    maths_marks:                numOrNull(eduData.maths_marks),
    university_institute:       eduData.university_institute       || null,
    course:                     eduData.course                     || null,
    specialization:             eduData.specialization             || null,
    course_type:                eduData.course_type                || null,
    course_duration_start_year: numOrNull(eduData.course_duration_start_year),
    course_duration_end_year:   numOrNull(eduData.course_duration_end_year),
    grading_system:             eduData.grading_system             || null,
    other_education_details:    eduData.other_education_details    || null,
  };
};

const buildProjectPayload = (projectData) => {
  const numOrNull = (v) => (v !== '' && v !== null && v !== undefined ? Number(v) : null);
  const strOrNull = (v) => (v && String(v).trim() ? String(v).trim() : null);

  return {
    project_title:            projectData.project_title,
    client:                   projectData.client,
    tag_employment_education: strOrNull(projectData.tag_employment_education),
    project_status:           projectData.project_status || 'In progress',
    worked_from_year:         numOrNull(projectData.worked_from_year),
    worked_from_month:        numOrNull(projectData.worked_from_month),
    details_of_project:       strOrNull(projectData.details_of_project),
    project_location:         strOrNull(projectData.project_location),
    project_site:             strOrNull(projectData.project_site),
    nature_of_employment:     strOrNull(projectData.nature_of_employment),
    team_size:                strOrNull(projectData.team_size),
    role:                     strOrNull(projectData.role),
    role_description:         strOrNull(projectData.role_description),
    skills_used:              strOrNull(projectData.skills_used),
    github_url:               strOrNull(projectData.github_url),
    live_link:                strOrNull(projectData.live_link),
  };
};

// ══════════════════════════════════════════════════════════════════════════
// Career Profile ↔ Backend translation helpers
// ══════════════════════════════════════════════════════════════════════════
const JOB_TYPE_TO_BACKEND = {
  'Permanent':                ['Permanent'],
  'Contractual / Temporary':  ['Contractual'],
  'Contractual':              ['Contractual'],
  'Both':                     ['Permanent', 'Contractual'],
};

const EMP_TYPE_TO_BACKEND = {
  'Full time': ['Full time'],
  'Part time': ['Part time'],
  'Both':      ['Full time', 'Part time'],
};

const toBackendJobType = (val) => {
  if (Array.isArray(val)) return val.flatMap(v => JOB_TYPE_TO_BACKEND[v] || [v]);
  if (!val) return [];
  return JOB_TYPE_TO_BACKEND[val] || [val];
};

const toBackendEmpType = (val) => {
  if (Array.isArray(val)) return val.flatMap(v => EMP_TYPE_TO_BACKEND[v] || [v]);
  if (!val) return [];
  return EMP_TYPE_TO_BACKEND[val] || [val];
};

const jobTypeFromBackend = (list) => {
  const arr = Array.isArray(list)
    ? list
    : String(list || '').split(',').map(s => s.trim()).filter(Boolean);
  if (arr.length >= 2) return 'Both';
  if (arr[0] === 'Contractual') return 'Contractual / Temporary';
  return arr[0] || '';
};

const empTypeFromBackend = (list) => {
  const arr = Array.isArray(list)
    ? list
    : String(list || '').split(',').map(s => s.trim()).filter(Boolean);
  if (arr.length >= 2) return 'Both';
  return arr[0] || '';
};

const locationsToBackend = (val) => {
  if (Array.isArray(val)) return val.map(v => String(v).trim()).filter(Boolean);
  if (typeof val === 'string') return val.split(',').map(v => v.trim()).filter(Boolean);
  return [];
};

const locationsFromBackend = (val) => {
  if (Array.isArray(val)) return val.join(', ');
  return val || '';
};

// ══════════════════════════════════════════════════════════════════════════
// ✅ NEW: Diversity payload + FormData helpers
// ══════════════════════════════════════════════════════════════════════════
const buildDiversityPayload = (d = {}) => {
  const numOrNull = (v) => (v !== '' && v !== null && v !== undefined ? Number(v) : null);
  const strOrNull = (v) => (v && String(v).trim() ? String(v).trim() : null);
  return {
    disability_status:     strOrNull(d.disability_status),
    disability_type:       strOrNull(d.disability_type),
    disability_percentage: numOrNull(d.disability_percentage),
    disability_reason:     strOrNull(d.disability_reason),
    certificate_type:      strOrNull(d.certificate_type),
    military_status:       strOrNull(d.military_status),
    service_type:          strOrNull(d.service_type),
    enrolment_day:         numOrNull(d.enrolment_day),
    enrolment_month:       numOrNull(d.enrolment_month),
    enrolment_year:        numOrNull(d.enrolment_year),
    discharge_day:         numOrNull(d.discharge_day),
    discharge_month:       numOrNull(d.discharge_month),
    discharge_year:        numOrNull(d.discharge_year),
    service_number:        strOrNull(d.service_number),
    career_break_status:   strOrNull(d.career_break_status),
    break_reason:          strOrNull(d.break_reason),
    break_from_month:      numOrNull(d.break_from_month),
    break_from_year:       numOrNull(d.break_from_year),
    break_till_month:      numOrNull(d.break_till_month),
    break_till_year:       numOrNull(d.break_till_year),
    currently_on_break:    !!d.currently_on_break,
  };
};

const diversityToFormData = (payload, candidateId, file) => {
  const fd = new FormData();
  if (candidateId !== undefined && candidateId !== null) {
    fd.append('candidate_id', String(candidateId));
  }
  Object.entries(payload).forEach(([key, value]) => {
    if (value === null || value === undefined) return; // skip nulls
    if (typeof value === 'boolean') {
      fd.append(key, value ? 'true' : 'false');
    } else {
      fd.append(key, String(value));
    }
  });
  if (file) {
    fd.append('disability_proof_doc', file);
  }
  return fd;
};


const jobseekerService = {

  // ── OTP & Email ───────────────────────────────────────────────────────────
  sendOtp: (email, otp_type = 'registration') =>
    api.post('/jobseeker/send-otp', { email, otp_type }),

  verifyOtp: (email, otp_code, otp_type = 'registration') =>
    api.post('/jobseeker/verify-otp', { email, otp_code, otp_type }),

  validateEmail: (email) =>
    api.post('/jobseeker/validate-email', { email }),

  // ── Auth ──────────────────────────────────────────────────────────────────
  login: (credential, password) =>
    api.post('/jobseeker/login', { Credential: credential, Password: password }),

  logout: (candidateId) =>
    api.post('/jobseeker/logout', { Candidate_Id: candidateId }),

  // ── Password ──────────────────────────────────────────────────────────────
  forgotPassword: (email) =>
    api.post('/jobseeker/forgot-password', { email }),

  resetPassword: (email, otp, password) =>
    api.post('/jobseeker/reset-password', { email, otp, password }),

  // ── Profile CRUD ──────────────────────────────────────────────────────────
  getProfile: async () => {
    const user = getUser();
    const candidateId = user?.id;
    if (!candidateId) return Promise.reject(new Error('Not authenticated'));
    const res        = await api.get(`/jobseeker/list/${candidateId}`, { headers: authHeader() });
    const raw        = res.data?.candidate || res.data || {};
    const normalized = normalizeProfile(raw);
    return { ...res, data: { ...res.data, data: normalized, candidate: normalized } };
  },

  updateProfile: (payload) => {
    const user = getUser();
    const candidateId = user?.id;
    if (!candidateId) return Promise.reject(new Error('Not authenticated'));
    let body, headers, extraConfig = {};
    if (payload instanceof FormData) {
      body    = remapFormDataForBackend(payload);
      headers = { ...authHeader(), 'Content-Type': undefined };
      extraConfig.timeout = UPLOAD_TIMEOUT; // FormData may include a file
    } else {
      body    = remapObjectForBackend(payload);
      headers = { ...authHeader(), 'Content-Type': 'application/json' };
    }
    return api.put(`/jobseeker/update/${candidateId}`, body, { headers, ...extraConfig });
  },

  // ⏱️ Upload: extended timeout
  updatePhoto: (candidateId, photoFile) => {
    const fd = new FormData();
    fd.append('profile_photo', photoFile);
    return api.post(
      `/jobseeker/update-photo/${candidateId}/`,
      fd,
      {
        headers: { ...authHeader(), 'Content-Type': undefined },
        timeout: UPLOAD_TIMEOUT,
      },
    );
  },

  // 🔧 CHANGE 2/2: removePhoto did not exist. The backend helper
  // delete_candidate_photo_s3() was written but never wired to a route, so a
  // candidate could change their photo and never take it down. The endpoint
  // now exists at DELETE /api/jobseeker/remove-photo/<id>/ (see
  // core/jobseekers/job_seeker_photo.py).
  removePhoto: (candidateId) =>
    api.delete(`/jobseeker/remove-photo/${candidateId}/`, { headers: authHeader() }),

  deleteProfile: () => {
    const user = getUser();
    const candidateId = user?.id;
    if (!candidateId) return Promise.reject(new Error('Not authenticated'));
    return api.delete(`/jobseeker/remove/${candidateId}`, { headers: authHeader() });
  },

  // ── Profile Summary ───────────────────────────────────────────────────────
  getProfileSummary: (candidateId) =>
    api.get(`/jobseeker/profile-summary/${candidateId}`, { headers: authHeader() }),

  createProfileSummary: (candidateId, profile_summary) =>
    api.post(
      '/jobseeker/profile-summary',
      { candidate_id: candidateId, profile_summary },
      { headers: { ...authHeader(), 'Content-Type': 'application/json' } },
    ),

  updateProfileSummary: (candidateId, profile_summary) =>
    api.put(
      `/jobseeker/profile-summary/update/${candidateId}`,
      { profile_summary },
      { headers: { ...authHeader(), 'Content-Type': 'application/json' } },
    ),

  deleteProfileSummary: (candidateId) =>
    api.delete(`/jobseeker/profile-summary/remove/${candidateId}`, { headers: authHeader() }),

  upsertProfileSummary: (candidateId, profile_summary, exists) =>
    exists
      ? jobseekerService.updateProfileSummary(candidateId, profile_summary)
      : jobseekerService.createProfileSummary(candidateId, profile_summary),

  // ── Resume Headline ───────────────────────────────────────────────────────
  getResumeHeadline: (candidateId) =>
    api.get(`/jobseeker/resume-headline/${candidateId}`, { headers: authHeader() }),

  createResumeHeadline: (candidateId, resume_headline) =>
    api.post(
      '/jobseeker/resume-headline',
      { candidate_id: candidateId, resume_headline },
      { headers: { ...authHeader(), 'Content-Type': 'application/json' } },
    ),

  updateResumeHeadline: (candidateId, resume_headline) =>
    api.put(
      `/jobseeker/resume-headline/update/${candidateId}`,
      { resume_headline },
      { headers: { ...authHeader(), 'Content-Type': 'application/json' } },
    ),

  deleteResumeHeadline: (candidateId) =>
    api.delete(`/jobseeker/resume-headline/remove/${candidateId}`, { headers: authHeader() }),

  upsertResumeHeadline: (candidateId, resume_headline, exists) =>
    exists
      ? jobseekerService.updateResumeHeadline(candidateId, resume_headline)
      : jobseekerService.createResumeHeadline(candidateId, resume_headline),

  // ── Resume File ───────────────────────────────────────────────────────────
  getResumeInfo: async (candidateId) => {
    const res = await api.get(`/jobseeker/resume/${candidateId}`, { headers: authHeader() });
    if (process.env.NODE_ENV === 'development') {
      console.log('[getResumeInfo] raw response data:', res.data);
    }
    const normalized = normalizeResumeData(res.data);
    if (process.env.NODE_ENV === 'development' && !normalized.filename) {
      // 🔧 CHANGE 1/2: only warn when a resume actually exists. A candidate
      // who has not uploaded one returns has_resume:false with empty filename
      // fields, which is a normal empty state — it was logging on every poll.
      if (normalized._raw?.has_resume) console.warn('[getResumeInfo] Could not resolve filename. Actual keys received:', Object.keys(normalized._raw));
    }
    return { ...res, data: { ...res.data, _normalized: normalized } };
  },

  // ⏱️ Upload: extended timeout
  uploadResume: (candidateId, file) => {
    const fd = new FormData();
    fd.append('candidate_id', String(candidateId));
    fd.append('resume', file);
    return api.post('/jobseeker/resume', fd, {
      headers: { ...authHeader(), 'Content-Type': undefined },
      timeout: UPLOAD_TIMEOUT,
    });
  },

  // ⏱️ Upload: extended timeout
  updateResume: (candidateId, file) => {
    const fd = new FormData();
    fd.append('resume', file);
    return api.put(`/jobseeker/resume/update/${candidateId}`, fd, {
      headers: { ...authHeader(), 'Content-Type': undefined },
      timeout: UPLOAD_TIMEOUT,
    });
  },

  deleteResume: (candidateId) =>
    api.delete(`/jobseeker/resume/remove/${candidateId}`, { headers: authHeader() }),

  upsertResume: (candidateId, file, exists) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[upsertResume] exists=${exists} → calling ${exists ? 'PUT (updateResume)' : 'POST (uploadResume)'}`);
    }
    return exists
      ? jobseekerService.updateResume(candidateId, file)
      : jobseekerService.uploadResume(candidateId, file);
  },

  resumeViewUrl: (candidateId) =>
    candidateId ? `/api/jobseeker/resume/view/${candidateId}` : '',

  resumeDownloadUrl: (candidateId) =>
    candidateId ? `/api/jobseeker/resume/download/${candidateId}` : '',

  // ── Key Skills ────────────────────────────────────────────────────────────
  getSkills: (candidateId) =>
    api.get(`/jobseeker/skills/${candidateId}`, { headers: authHeader() }),

  addSkill: (candidateId, skillData) =>
    api.post(
      '/jobseeker/skills',
      {
        candidate_id:      Number(candidateId),
        skill_name:        skillData.skill_name,
        software_version:  skillData.software_version  || '',
        last_used:         skillData.last_used         || '',
        experience_years:  Number(skillData.experience_years  || 0),
        experience_months: Number(skillData.experience_months || 0),
      },
      { headers: { ...authHeader(), 'Content-Type': 'application/json' } },
    ),

  updateSkill: (skillId, skillData) =>
    api.put(
      `/jobseeker/skills/update/${skillId}`,
      {
        skill_name:        skillData.skill_name,
        software_version:  skillData.software_version  || '',
        last_used:         skillData.last_used         || '',
        experience_years:  Number(skillData.experience_years  || 0),
        experience_months: Number(skillData.experience_months || 0),
      },
      { headers: { ...authHeader(), 'Content-Type': 'application/json' } },
    ),

  deleteSkill: (skillId) =>
    api.delete(`/jobseeker/skills/remove/${skillId}`, { headers: authHeader() }),

  deleteAllSkills: (candidateId) =>
    api.delete(`/jobseeker/skills/remove-all/${candidateId}`, { headers: authHeader() }),

  // ── Pincode Lookup ────────────────────────────────────────────────────────
  lookupPincode: (pincode) =>
    api.get(`/jobseeker/pincode-lookup/${pincode}`, { headers: authHeader() }),

  // ── Education ─────────────────────────────────────────────────────────────
  getEducation: (candidateId) =>
    api.get(`/jobseeker/education/${candidateId}`, { headers: authHeader() }),

  addEducation: (candidateId, eduData) =>
    api.post(
      '/jobseeker/education',
      { candidate_id: Number(candidateId), ...buildEduPayload(eduData) },
      { headers: { ...authHeader(), 'Content-Type': 'application/json' } },
    ),

  updateEducation: (educationId, eduData) =>
    api.put(
      `/jobseeker/education/update/${educationId}`,
      buildEduPayload(eduData),
      { headers: { ...authHeader(), 'Content-Type': 'application/json' } },
    ),

  deleteEducation: (educationId) =>
    api.delete(`/jobseeker/education/remove/${educationId}`, { headers: authHeader() }),

  deleteAllEducation: (candidateId) =>
    api.delete(`/jobseeker/education/remove-all/${candidateId}`, { headers: authHeader() }),

  // ── Employment ────────────────────────────────────────────────────────────
  getEmployment: (candidateId) =>
    api.get(`/jobseeker/employment/${candidateId}`, { headers: authHeader() }),

  addEmployment: (candidateId, empData) =>
    api.post(
      '/jobseeker/employment',
      {
        candidate_id: Number(candidateId),
        is_current_employment: empData.is_current_employment ?? false,
        employment_type: empData.employment_type,
        total_experience_years: Number(empData.total_experience_years || 0),
        total_experience_months: Number(empData.total_experience_months || 0),
        company_name: empData.company_name,
        job_title: empData.job_title,
        joining_date_year: empData.joining_date_year ? Number(empData.joining_date_year) : null,
        joining_date_month: empData.joining_date_month ? Number(empData.joining_date_month) : null,
        salary_currency: empData.salary_currency || '₹',
        current_salary: empData.current_salary ? Number(empData.current_salary) : null,
        skills_used: empData.skills_used || '',
        job_profile: empData.job_profile || null,
        notice_period: empData.notice_period || null,
      },
      { headers: { ...authHeader(), 'Content-Type': 'application/json' } }
    ),

  updateEmployment: (employmentId, empData) =>
    api.put(
      `/jobseeker/employment/update/${employmentId}`,
      {
        is_current_employment: empData.is_current_employment,
        employment_type: empData.employment_type,
        total_experience_years: Number(empData.total_experience_years || 0),
        total_experience_months: Number(empData.total_experience_months || 0),
        company_name: empData.company_name,
        job_title: empData.job_title,
        joining_date_year: empData.joining_date_year ? Number(empData.joining_date_year) : null,
        joining_date_month: empData.joining_date_month ? Number(empData.joining_date_month) : null,
        salary_currency: empData.salary_currency || '₹',
        current_salary: empData.current_salary ? Number(empData.current_salary) : null,
        skills_used: empData.skills_used || '',
        job_profile: empData.job_profile || null,
        notice_period: empData.notice_period || null,
      },
      { headers: { ...authHeader(), 'Content-Type': 'application/json' } }
    ),

  deleteEmployment: (employmentId) =>
    api.delete(`/jobseeker/employment/remove/${employmentId}`, { headers: authHeader() }),

  deleteAllEmployment: async (candidateId) => {
    try {
  return await api.delete(`/jobseeker/employment/remove-all/${candidateId}`, {
        headers: authHeader()
      });
    } catch (error) {
      if (error?.response?.status === 404) {
        console.log('ℹ️ Delete endpoint returned 404 - treating as no employment exists');
        return {
          data: {
            success: true,
            message: 'No employment to delete',
            Candidate_Id: candidateId,
            Employments_Deleted: 0
          }
        };
      }
      throw error;
    }
  },

  // ── Projects ──────────────────────────────────────────────────────────────
  getProjects: (candidateId) =>
    api.get(`/jobseeker/project/${candidateId}`, { headers: authHeader() }),

  getProjectDetail: (projectId) =>
    api.get(`/jobseeker/project/detail/${projectId}`, { headers: authHeader() }),

  addProject: (candidateId, projectData) =>
    api.post(
      '/jobseeker/project',
      { candidate_id: Number(candidateId), ...buildProjectPayload(projectData) },
      { headers: { ...authHeader(), 'Content-Type': 'application/json' } },
    ),

  updateProject: (projectId, projectData) =>
    api.put(
      `/jobseeker/project/update/${projectId}`,
      buildProjectPayload(projectData),
      { headers: { ...authHeader(), 'Content-Type': 'application/json' } },
    ),

  deleteProject: (projectId) =>
    api.delete(`/jobseeker/project/remove/${projectId}`, { headers: authHeader() }),

  deleteAllProjects: (candidateId) =>
    api.delete(`/jobseeker/project/remove-all/${candidateId}`, { headers: authHeader() }),

  // ── Languages ─────────────────────────────────────────────────────────────
  getLanguages: (candidateId) =>
    api.get(`/jobseeker/language/${candidateId}`, { headers: authHeader() }),

  addLanguage: (candidateId, languageData) =>
    api.post(
      '/jobseeker/language',
      {
        candidate_id: Number(candidateId),
        language_name: languageData.language || languageData.language_name,
        proficiency: languageData.proficiency || '',
        can_read: languageData.read || languageData.can_read || false,
        can_write: languageData.write || languageData.can_write || false,
        can_speak: languageData.speak || languageData.can_speak || false,
      },
      { headers: { ...authHeader(), 'Content-Type': 'application/json' } },
    ),

  updateLanguage: (languageId, languageData) =>
    api.put(
      `/jobseeker/language/update/${languageId}`,
      {
        language_name: languageData.language || languageData.language_name,
        proficiency: languageData.proficiency || '',
        can_read: languageData.read || languageData.can_read || false,
        can_write: languageData.write || languageData.can_write || false,
        can_speak: languageData.speak || languageData.can_speak || false,
      },
      { headers: { ...authHeader(), 'Content-Type': 'application/json' } },
    ),

  deleteLanguage: (languageId) =>
    api.delete(`/jobseeker/language/remove/${languageId}`, { headers: authHeader() }),

  deleteAllLanguages: (candidateId) =>
    api.delete(`/jobseeker/language/remove-all/${candidateId}`, { headers: authHeader() }),

  // ══════════════════════════════════════════════════════════════════════════
  // Career Profile
  // ══════════════════════════════════════════════════════════════════════════
  getCareerProfile: async (candidateId) => {
    const res = await api.get(`/jobseeker/career-profile/${candidateId}`, { headers: authHeader() });
    const cp  = res.data?.career_profile || {};
    const normalized = {
      ...cp,
      desired_job_type:        jobTypeFromBackend(cp.desired_job_type),
      desired_employment_type: empTypeFromBackend(cp.desired_employment_type),
      preferred_work_location: locationsFromBackend(cp.preferred_work_location),
    };
    return { ...res, data: { ...res.data, career_profile: normalized } };
  },

  createCareerProfile: (candidateId, careerData) =>
    api.post(
      '/jobseeker/career-profile',
      {
        candidate_id:            Number(candidateId),
        current_industry:        careerData.current_industry || '',
        department:              careerData.department       || '',
        role_category:           careerData.role_category    || '',
        job_role:                careerData.job_role         || '',
        desired_job_type:        toBackendJobType(careerData.desired_job_type),
        desired_employment_type: toBackendEmpType(careerData.desired_employment_type),
        preferred_shift:         careerData.preferred_shift  || null,
        preferred_work_location: locationsToBackend(careerData.preferred_work_location),
        salary_currency:         careerData.salary_currency  || '₹',
        expected_salary:         careerData.expected_salary ? Number(careerData.expected_salary) : null,
      },
      { headers: { ...authHeader(), 'Content-Type': 'application/json' } }
    ),

  updateCareerProfile: (candidateId, careerData) =>
    api.put(
      `/jobseeker/career-profile/update/${candidateId}`,
      {
        current_industry:        careerData.current_industry || '',
        department:              careerData.department       || '',
        role_category:           careerData.role_category    || '',
        job_role:                careerData.job_role         || '',
        desired_job_type:        toBackendJobType(careerData.desired_job_type),
        desired_employment_type: toBackendEmpType(careerData.desired_employment_type),
        preferred_shift:         careerData.preferred_shift  || null,
        preferred_work_location: locationsToBackend(careerData.preferred_work_location),
        salary_currency:         careerData.salary_currency  || '₹',
        expected_salary:         careerData.expected_salary ? Number(careerData.expected_salary) : null,
      },
      { headers: { ...authHeader(), 'Content-Type': 'application/json' } }
    ),

  deleteCareerProfile: (candidateId) =>
    api.delete(`/jobseeker/career-profile/remove/${candidateId}`, { headers: authHeader() }),

  upsertCareerProfile: (candidateId, careerData, exists) =>
    exists
      ? jobseekerService.updateCareerProfile(candidateId, careerData)
      : jobseekerService.createCareerProfile(candidateId, careerData),

  // ══════════════════════════════════════════════════════════════════════════
  // Online Profiles
  // ══════════════════════════════════════════════════════════════════════════
  getOnlineProfiles: (candidateId) =>
    api.get(`/jobseeker/online-profile/${candidateId}`, { headers: authHeader() }),

  getOnlineProfile: (profileId) =>
    api.get(`/jobseeker/online-profile/detail/${profileId}`, { headers: authHeader() }),

  addOnlineProfile: (candidateId, profileData) =>
    api.post(
      '/jobseeker/online-profile',
      {
        candidate_id: Number(candidateId),
        platform_key: (profileData.platform_key || profileData.key || '').toLowerCase(),
        label: profileData.label || null,
        url: profileData.url,
      },
      { headers: { ...authHeader(), 'Content-Type': 'application/json' } }
    ),

  updateOnlineProfile: (profileId, profileData) =>
    api.put(
      `/jobseeker/online-profile/update/${profileId}`,
      {
        platform_key: profileData.platform_key || profileData.key,
        label: profileData.label || null,
        url: profileData.url,
      },
      { headers: { ...authHeader(), 'Content-Type': 'application/json' } }
    ),

  deleteOnlineProfile: (profileId) =>
    api.delete(`/jobseeker/online-profile/remove/${profileId}`, { headers: authHeader() }),

  deleteAllOnlineProfiles: async (candidateId) => {
    try {
      return await api.delete(`/jobseeker/online-profile/remove-all/${candidateId}`, {
        headers: authHeader()
      });
    } catch (error) {
      if (error?.response?.status === 404) {
        console.log('ℹ️ No online profiles to delete');
        return {
          data: {
            success: true,
            message: 'No online profiles to delete',
            Candidate_Id: candidateId,
            Profiles_Deleted: 0
          }
        };
      }
      throw error;
    }
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Accomplishments & Certifications
  // ══════════════════════════════════════════════════════════════════════════
  getAccomplishments: (candidateId, type = null) => {
    const params = type ? `?type=${type}` : '';
    return api.get(`/jobseeker/accomplishment/${candidateId}${params}`, { headers: authHeader() });
  },

  getAccomplishment: (accomplishmentId) =>
    api.get(`/jobseeker/accomplishment/detail/${accomplishmentId}`, { headers: authHeader() }),

  addAccomplishment: (candidateId, data) =>
    api.post(
      '/jobseeker/accomplishment',
      {
        candidate_id: Number(candidateId),
        accomplishment_type: data.accomplishment_type || data.type,
        title: data.title || null,
        url: data.url || null,
        description: data.description || null,
        social_profile: data.social_profile || null,
        duration_from_year: data.duration_from_year || null,
        duration_from_month: data.duration_from_month || null,
        duration_to_year: data.duration_to_year || null,
        duration_to_month: data.duration_to_month || null,
        currently_working: data.currently_working || false,
        published_on_year: data.published_on_year || null,
        published_on_month: data.published_on_month || null,
        patent_office: data.patent_office || null,
        patent_status: data.patent_status || null,
        application_number: data.application_number || null,
        issue_date_year: data.issue_date_year || null,
        issue_date_month: data.issue_date_month || null,
        certification_name: data.certification_name || data.name || null,
        issuing_organisation: data.issuing_organisation || null,
        certification_url: data.certification_url || data.certificate_url || null,
        validity_from_date: data.validity_from_date || null,
        validity_to_date: data.validity_to_date || null,
        does_not_expire: data.does_not_expire || false,
      },
      { headers: { ...authHeader(), 'Content-Type': 'application/json' } }
    ),

  updateAccomplishment: (accomplishmentId, data) =>
    api.put(
      `/jobseeker/accomplishment/update/${accomplishmentId}`,
      {
        title: data.title || null,
        url: data.url || null,
        description: data.description || null,
        social_profile: data.social_profile || null,
        duration_from_year: data.duration_from_year || null,
        duration_from_month: data.duration_from_month || null,
        duration_to_year: data.duration_to_year || null,
        duration_to_month: data.duration_to_month || null,
        currently_working: data.currently_working || false,
        published_on_year: data.published_on_year || null,
        published_on_month: data.published_on_month || null,
        patent_office: data.patent_office || null,
        patent_status: data.patent_status || null,
        application_number: data.application_number || null,
        issue_date_year: data.issue_date_year || null,
        issue_date_month: data.issue_date_month || null,
        certification_name: data.certification_name || data.name || null,
        issuing_organisation: data.issuing_organisation || null,
        certification_url: data.certification_url || data.certificate_url || null,
        validity_from_date: data.validity_from_date || null,
        validity_to_date: data.validity_to_date || null,
        does_not_expire: data.does_not_expire || false,
      },
      { headers: { ...authHeader(), 'Content-Type': 'application/json' } }
    ),

  deleteAccomplishment: (accomplishmentId) =>
    api.delete(`/jobseeker/accomplishment/remove/${accomplishmentId}`, { headers: authHeader() }),

  deleteAllAccomplishments: async (candidateId, type = null) => {
    try {
      const params = type ? `?type=${type}` : '';
      return await api.delete(`/jobseeker/accomplishment/remove-all/${candidateId}${params}`, {
        headers: authHeader()
      });
    } catch (error) {
      if (error?.response?.status === 404) {
        console.log('ℹ️ No accomplishments to delete');
        return {
          data: {
            success: true,
            message: 'No accomplishments to delete',
            Candidate_Id: candidateId,
            Deleted: 0
          }
        };
      }
      throw error;
    }
  },

  // ══════════════════════════════════════════════════════════════════════════
  // ✅ Diversity & Inclusion (with file upload support)
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Get diversity & inclusion profile for a candidate
   * GET /api/jobseeker/diversity-inclusion/<candidate_id>
   */
  getDiversity: (candidateId) =>
    api.get(`/jobseeker/diversity-inclusion/${candidateId}`, { headers: authHeader() }),

  /**
   * Create diversity & inclusion profile.
   * If a `file` is provided, sends multipart/form-data so the backend's
   * request.FILES['disability_proof_doc'] is populated. Otherwise sends JSON.
   *
   * @param {number} candidateId
   * @param {object} diversityData - flat object of diversity fields
   * @param {File}   [file]        - optional disability proof document
   */
  createDiversity: (candidateId, diversityData, file = null) => {
    const payload = buildDiversityPayload(diversityData);

    if (file) {
      const fd = diversityToFormData(payload, candidateId, file);
      // ⏱️ Upload: extended timeout
      return api.post('/jobseeker/diversity-inclusion', fd, {
        headers: { ...authHeader(), 'Content-Type': undefined },
        timeout: UPLOAD_TIMEOUT,
      });
    }

    return api.post(
      '/jobseeker/diversity-inclusion',
      { candidate_id: Number(candidateId), ...payload },
      { headers: { ...authHeader(), 'Content-Type': 'application/json' } }
    );
  },

  /**
   * Update diversity & inclusion profile.
   * If a `file` is provided, sends multipart/form-data. Otherwise sends JSON.
   *
   * @param {number} candidateId
   * @param {object} diversityData
   * @param {File}   [file]
   */
  updateDiversity: (candidateId, diversityData, file = null) => {
    const payload = buildDiversityPayload(diversityData);

    if (file) {
      // candidateId not needed in body (it's in URL), but harmless to omit
      const fd = diversityToFormData(payload, null, file);
      // ⏱️ Upload: extended timeout
      return api.put(`/jobseeker/diversity-inclusion/update/${candidateId}`, fd, {
        headers: { ...authHeader(), 'Content-Type': undefined },
        timeout: UPLOAD_TIMEOUT,
      });
    }

    return api.put(
      `/jobseeker/diversity-inclusion/update/${candidateId}`,
      payload,
      { headers: { ...authHeader(), 'Content-Type': 'application/json' } }
    );
  },

  /**
   * Soft-delete diversity & inclusion profile
   * DELETE /api/jobseeker/diversity-inclusion/remove/<candidate_id>
   */
  deleteDiversity: (candidateId) =>
    api.delete(`/jobseeker/diversity-inclusion/remove/${candidateId}`, { headers: authHeader() }),

  /**
   * Upsert (create or update) — file forwarded to either path.
   *
   * @param {number} candidateId
   * @param {object} diversityData
   * @param {boolean} exists
   * @param {File}   [file]
   */
  upsertDiversity: (candidateId, diversityData, exists, file = null) =>
    exists
      ? jobseekerService.updateDiversity(candidateId, diversityData, file)
      : jobseekerService.createDiversity(candidateId, diversityData, file),

  // ══════════════════════════════════════════════════════════════════════════
  // ✅ NEW: Job Applications
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Submit a job application.
   *
   * Backend: POST /api/jobs/apply (multipart/form-data)
   *
   * The backend's @require_jobseeker_session decorator reads candidate_id
   * from session → X-Candidate-Id header → candidate_id form field.
   * We send candidate_id in the form data as a fallback for cross-origin
   * cases where the SameSite session cookie may not be delivered.
   *
   * Profile auto-fill: the backend pulls full_name / email / phone / address
   * / current_role / experience / skills / etc. from the candidate's profile
   * tables, so the dialog only needs to send the resume choice. The backend
   * also hardcodes `confirm_accurate=True`.
   *
   @param {object} args
   @param {number|string} args.jobId       tbl_job_post.id of the job
   @param {'existing'|'new'} args.resumeMode  Which resume to use
    @param {File} [args.resumeFile]         Required only when resumeMode === 'new'
   @returns {Promise} axios response — body shape:
      { Message, Application_Id, Job_Post_Id, Candidate_Id, Application_Status, Education_Rows }
   */
  applyForJob: ({ jobId, resumeMode, resumeFile = null }) => {
    const user = getUser();
    const candidateId = user?.id;
    if (!candidateId) return Promise.reject(new Error('Not authenticated'));
    if (!jobId)       return Promise.reject(new Error('jobId is required'));
    if (!['existing', 'new'].includes(resumeMode)) {
      return Promise.reject(new Error("resumeMode must be 'existing' or 'new'"));
    }
    if (resumeMode === 'new' && !resumeFile) {
      return Promise.reject(new Error('A resume file is required when resumeMode is "new"'));
    }

    const fd = new FormData();
    // Send BOTH camelCase and snake_case keys so the request satisfies the
    // backend regardless of which convention it expects (a 400 here is almost
    // always a missing/mis-named field). Extra form fields are ignored by Django.
    fd.append('jobPostId',    String(jobId));
    fd.append('job_post_id',  String(jobId));
    fd.append('jobId',        String(jobId));
    fd.append('job_id',       String(jobId));

    fd.append('resumeMode',   resumeMode);
    fd.append('resume_mode',  resumeMode);

    fd.append('candidate_id', String(candidateId));
    fd.append('candidateId',  String(candidateId));

    // Backend hardcodes this true, but send it too in case validation expects it.
    fd.append('confirm_accurate', 'true');

    if (resumeMode === 'new' && resumeFile) {
      fd.append('resume', resumeFile);
    }

    
    return api.post('/js/jobs/apply', fd, {
      headers: {
        ...authHeader(),
        'Content-Type':    undefined,
        'X-Candidate-Id':  String(candidateId), 
      },
      timeout: UPLOAD_TIMEOUT,
    });
  },

 
  photoUrlFor: (candidateId) => {
    if (!candidateId) return '';
    return `/api/jobseeker/photo/${candidateId}/`;
  },

  
  docUrlFor: (candidateId) => {
    if (!candidateId) return '';
    return `/api/jobseeker/diversity/document/${candidateId}`;
  },
};

export default jobseekerService;