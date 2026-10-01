import api from '@/services/api/axiosInstance';

const authHeader = () => {
  const token = localStorage.getItem('ievalx_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/** Logged-in candidate stored at login. */
const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem('ievalx_user') || '{}');
  } catch {
    return {};
  }
};

const currentCandidateId = () => {
  const u = getUser();
  return u?.id ?? u?.candidate_id ?? null;
};

const localKey = (candidateId = currentCandidateId()) =>
  `ievalx_applications_${candidateId ?? 'anon'}`;

const readLocalApplications = (candidateId = currentCandidateId()) => {
  try {
    const raw = localStorage.getItem(localKey(candidateId));
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};

const writeLocalApplications = (list, candidateId = currentCandidateId()) => {
  try {
    localStorage.setItem(localKey(candidateId), JSON.stringify(list || []));
  } catch {
    /* storage full / unavailable — non-fatal */
  }
};

const deletedJobIds = new Set();

const logoHydratedJobIds = new Set();
const notifyJobsUpdated = () => {
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('jobs-updated'));
    }
  } catch { /* non-fatal */ }
};


const savedKey = (candidateId = currentCandidateId()) =>
  `ievalx_saved_jobs_${candidateId ?? 'anon'}`;

const readSavedJobs = (candidateId = currentCandidateId()) => {
  try {
    const raw = localStorage.getItem(savedKey(candidateId));
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};

const writeSavedJobs = (list, candidateId = currentCandidateId()) => {
  try {
    localStorage.setItem(savedKey(candidateId), JSON.stringify(list || []));
  } catch {
    /* storage full / unavailable — non-fatal */
  }
};

const pick = (...vals) => vals.find((v) => v !== undefined && v !== null && v !== '');

const extractApplicationList = (data) => {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];
  return (
    data.Applications || data.applications ||
    data.results || data.data ||
    data.Items || data.items ||
    data.Jobs || []
  );
};

const normaliseAppStatus = (raw) => {
  
  const t = String(raw || 'APPLIED').toUpperCase().replace(/[^A-Z]/g, '');

  const DIRECT = {
    APPLIED: 'APPLIED', REVIEWING: 'REVIEWING', SHORTLISTED: 'SHORTLISTED',
    ONHOLD: 'ON_HOLD',
    INTERVIEW: 'INTERVIEW', OFFERED: 'OFFERED', REJECTED: 'REJECTED', WITHDRAWN: 'WITHDRAWN',
  };
  if (DIRECT[t]) return DIRECT[t];
  const SYNONYMS = {
    PENDING: 'APPLIED', SUBMITTED: 'APPLIED', NEW: 'APPLIED',
    UNDERREVIEW: 'REVIEWING', INREVIEW: 'REVIEWING', REVIEW: 'REVIEWING', SCREENING: 'REVIEWING',
    SHORTLIST: 'SHORTLISTED',
    HOLD: 'ON_HOLD', HELD: 'ON_HOLD', PAUSED: 'ON_HOLD',
    AIINTERVIEW: 'INTERVIEW', INTERVIEWING: 'INTERVIEW', INTERVIEWED: 'INTERVIEW', INTERVIEWSCHEDULED: 'INTERVIEW',
    SELECTED: 'OFFERED', OFFER: 'OFFERED', HIRED: 'OFFERED', ACCEPTED: 'OFFERED',
    REJECT: 'REJECTED', DECLINED: 'REJECTED', NOTSELECTED: 'REJECTED',
    WITHDRAW: 'WITHDRAWN', WITHDRAWAL: 'WITHDRAWN', CANCELLED: 'WITHDRAWN',
  };
  return SYNONYMS[t] || 'APPLIED';
};

const mapApplicationFromBackend = (a = {}) => {
  const job = a.job || a.Job || a.job_post || a.jobPost || {};

  const title = pick(
    job.title, job.job_title, job.jobTitle, job.Job_Title,
    a.job_title, a.jobTitle, a.Job_Title,
  ) || 'Untitled role';

  const company = pick(
    job.company_name, job.companyName, job.company, job.Company_Name,
    a.company_name, a.companyName, a.Company_Name,
  ) || '—';

  // BUILD: 2026-08-05-company-logo-proxy — extract company_id so the
  // frontend can build a stable proxy URL: /api/company/{id}/logo/
  const companyId = pick(
    job.company_id, job.companyId, job.Company_Id,
    a.company_id, a.companyId, a.Company_Id,
  ) || null;

  const jobId = pick(
    job.id, job.job_id, job.jobId,
    a.job_id, a.jobId, a.jobPostId, a.job_post_id, a.Job_Post_Id,
  );

  const appId = pick(
    a.id, a.application_id, a.applicationId, a.Application_Id, a.app_id,
  );

  const appliedAt = pick(
    a.applied_at, a.appliedAt, a.Applied_At,
    a.created_at, a.createdAt, a.Created_At, a.applied_on,
  );

  const updatedAt = pick(
    a.updated_at, a.updatedAt, a.Updated_At,
    a.modified_at, a.modifiedAt, a.status_updated_at,
  );

  return {
    id: appId ?? (jobId != null ? `job-${jobId}` : `${title}-${company}`),
    jobId: jobId ?? null,
  
    job: {
      title,
      company_name:       company,
      company_id:         companyId,
      job_location:       pick(job.job_location, a.job_location, job.location, a.location),
      job_city:           pick(job.job_city,     a.job_city,     job.city,     a.city),
      work_mode:          pick(job.work_mode,    a.work_mode,    job.workMode, a.workMode),
      job_type:           pick(job.job_type,     a.job_type,     job.type,     a.type),
      salary_display:     pick(job.salary_display,     a.salary_display,     job.salaryDisplay,     a.salaryDisplay),
      experience_display: pick(job.experience_display, a.experience_display, job.experienceDisplay, a.experienceDisplay),
      company_logo_url:   pick(job.company_logo_url, a.company_logo_url, job.companyLogoUrl, a.companyLogoUrl) || null,
    },
    status: normaliseAppStatus(pick(a.status, a.application_status, a.Application_Status)),
    applied_at: appliedAt || null,
    updated_at: updatedAt || appliedAt || null,
  };
};

const splitCSV = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return value.split(',').map(s => s.trim()).filter(Boolean);
};


const normaliseToken = (value) =>
  (value == null ? '' : String(value)).toUpperCase().replace(/[^A-Z0-9]/g, '');

/** Coerce to a finite number, or null. */
const numOrNull = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};


const toLakhs = (value) => {
  const n = numOrNull(value);
  if (n == null) return null;
  return n >= 1000 ? n / 100000 : n;
};


const normaliseRange = (range, legacy, fallback) => {
  const pick = Array.isArray(range) && range.length === 2 ? range : legacy;
  if (!Array.isArray(pick) || pick.length !== 2) return fallback || null;
  let lo = numOrNull(pick[0]);
  let hi = numOrNull(pick[1]);
  if (lo == null && hi == null) return fallback || null;
  if (lo == null) lo = fallback ? fallback[0] : 0;
  if (hi == null) hi = fallback ? fallback[1] : lo;
  return lo <= hi ? [lo, hi] : [hi, lo];
};

const isFullRange = ([lo, hi], [min, max]) => lo <= min && hi >= max;


const toTokenSet = (value) => {
  const list = Array.isArray(value) ? value : value ? [value] : [];
  return [...new Set(list.map(normaliseToken).filter(Boolean))];
};


const mapJobFromBackend = (job) => {
  if (!job) return null;

  return {
    id: job.id,
    companyId: job.company_id,
    companyName: job.company_name,
    companyLogoUrl: job.company_logo_url,
    companyType: job.company_type,
    
    // Job basics
    jobTitle: job.job_title,
    jobLocation: job.job_location,
    jobType: job.job_type,
    workMode: job.work_mode,
    workModeDisplay: job.work_mode_display, // 'Remote', 'Hybrid', 'On-site'
    urgency: job.urgency,
    urgencyDisplay: job.urgency_display, // 'High', 'Medium', 'Low'
    openings: job.openings,
    department: job.department,
    
    // Address details
    jobAddressLine1: job.job_address_line1,
    jobAddressLine2: job.job_address_line2,
    jobCity: job.job_city,
    jobState: job.job_state,
    jobPincode: job.job_pincode,
    jobCountry: job.job_country,
    interviewLocation: job.preferred_interview_location,
    
    // Job requirements (arrays)
    skills: job.skills || splitCSV(job.required_skills),
    responsibilities: job.responsibilities || splitCSV(job.roles_responsibilities),
    languages: job.languages || splitCSV(job.language),
    
    // Description
    jobDescription: job.job_description,
    jobShift: job.job_shift,
    
    // Experience & Salary (formatted strings from backend)
    experienceDisplay: job.experience_display, // e.g., "5-8 years"
    salaryDisplay: job.salary_display,         // e.g., "₹25L - ₹40L"
    
    // Raw numeric values (if needed for filters)
    expMin: job.experience_min,
    expMax: job.experience_max,
    salaryMin: job.salary_min,
    salaryMax: job.salary_max,
    
    // Requirements
    education: job.education_requirements,
    gender: job.gender,
    candidateCategory: job.candidate_category,
    disabilityType: job.disability_type,
    industryPreference: job.industry_preference,
    additionalRequirements: job.additional_requirements,
    
    // Deadline & countdown
    applicationDeadline: job.application_deadline,
    daysLeft: job.days_left, // Calculated by backend: max(0, (deadline - today).days)
    
    // Status (for job seekers, always 'Active')
    status: job.status,
    displayStatus: job.display_status, // 'Active'
    
    // Timestamps
    createdAt: job.created_at,
    updatedAt: job.updated_at,
    postedDate: job.created_at, // Alias for "Posted X days ago"
    
    // Employer info (nested object from JOIN query)
    employer: job.employer || {
      id: job.employer_id,
      name: job.emp_full_name,
      role: job.emp_role,
      email: job.emp_email,
      phone: job.emp_phone,
      branch: job.emp_branch,
      avatar: job.employer?.avatar,
    },
    
    // Applicants count
    applicants: job.applicants || 0,
    
    // Benefits (object with category keys)
    benefits: job.benefits || {},
    
    // Flag info (admin use, job seekers may see flagged status)
    flagged: job.flagged || false,

    // Saved flag — annotated by the backend (tbl_saved_job) on list/search
    // when candidate_id is supplied, and always true on /jobs/saved.
    isSaved: Boolean(job.is_saved),
  };
};

// ============================================================================
// API METHODS
// ============================================================================

const jobService = {
  

  searchJobs: async (searchParams = {}) => {
    const params = {
      q: searchParams.query || searchParams.q, 
      city: searchParams.city,
      job_type: searchParams.jobType || searchParams.job_type,
      shift: searchParams.shift,
    };
    
    // Remove empty params
    Object.keys(params).forEach(key => {
      if (params[key] === undefined || params[key] === null || params[key] === '') {
        delete params[key];
      }
    });
    
    const response = await api.get('/js/jobs/search', { params });
    
    return {
      total: response.data.Total_Results,
      jobs: (response.data.Jobs || []).map(mapJobFromBackend),
    };
  },

  
  listJobs: async (filters = {}) => {
    const params = {
      // Job seekers always see public view
      viewer_role: 'JOBSEEKER',
      
      // Filters
      job_type: filters.jobType || filters.job_type,
      city: filters.city,
    };
    
    Object.keys(params).forEach(key => {
      if (params[key] === undefined || params[key] === null || params[key] === '') {
        delete params[key];
      }
    });
    
    const response = await api.get('/js/jobs/list', { params });
    
    return {
      total: response.data.Total_Jobs,
      jobs: (response.data.Jobs || []).map(mapJobFromBackend),
    };
  },

  
  getJobDetails: async (jobId) => {
    const params = {
      viewer_role: 'JOBSEEKER',
    };
    
    const response = await api.get(`/js/jobs/${jobId}`, {
      params,
      headers: authHeader(), // Optional: include if user is logged in
    });
    
    return mapJobFromBackend(response.data);
  },

  
  getJobsByCompany: async (companyId) => {
    const response = await api.get(`/js/companies/${companyId}/jobs`, {
      params: { viewer_role: 'JOBSEEKER' },
    });
    
    return {
      companyId: response.data.Company_Id,
      total: response.data.Total_Jobs,
      jobs: (response.data.Jobs || []).map(mapJobFromBackend),
    };
  },

 

  
  getPostedDaysAgo: (createdAt) => {
    if (!createdAt) return null;
    
    const posted = new Date(createdAt);
    const today = new Date();
    const diffTime = Math.abs(today - posted);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Posted today';
    if (diffDays === 1) return 'Posted 1 day ago';
    if (diffDays < 7) return `Posted ${diffDays} days ago`;
    if (diffDays < 30) return `Posted ${Math.floor(diffDays / 7)} weeks ago`;
    return `Posted ${Math.floor(diffDays / 30)} months ago`;
  },

 
  formatDeadline: (applicationDeadline, daysLeft) => {
    if (daysLeft === null || daysLeft === undefined) return null;
    
    if (daysLeft === 0) return 'Last day to apply';
    if (daysLeft === 1) return '1 day left';
    if (daysLeft <= 7) return `${daysLeft} days left`;
    
    // Show date for longer deadlines
    const deadline = new Date(applicationDeadline);
    return `Deadline: ${deadline.toLocaleDateString('en-IN', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    })}`;
  },

  
  calculateSkillMatch: (jobSkills, seekerSkills) => {
    if (!jobSkills || !seekerSkills || jobSkills.length === 0) {
      return { matchPercentage: 0, matchedSkills: [] };
    }
    
    const jobSkillsLower = jobSkills.map(s => s.toLowerCase());
    const seekerSkillsLower = seekerSkills.map(s => s.toLowerCase());
    
    const matched = jobSkillsLower.filter(skill => 
      seekerSkillsLower.includes(skill)
    );
    
    return {
      matchPercentage: Math.round((matched.length / jobSkillsLower.length) * 100),
      matchedSkills: matched,
    };
  },

  
 
  filterJobs: (jobs, filters = {}) => {
    if (!Array.isArray(jobs)) return [];
    let filtered = [...jobs];

  
    const query = (filters.query || '').trim().toLowerCase();
    if (query) {
      filtered = filtered.filter((j) => {
        const haystack = [
          j.jobTitle,
          j.companyName,
          j.department,
          j.jobLocation,
          j.jobCity,
          j.jobDescription,
          ...(Array.isArray(j.skills) ? j.skills : []),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(query);
      });
    }

    // ── Job type (multi-select; normalised: 'Full-time' === 'FULL_TIME') ──
    const jobTypeSet = toTokenSet(filters.jobType);
    if (jobTypeSet.length > 0) {
      filtered = filtered.filter((j) => jobTypeSet.includes(normaliseToken(j.jobType)));
    }

    const workModeSet = toTokenSet(filters.workMode);
    if (workModeSet.length > 0) {
      filtered = filtered.filter((j) => {
        const candidates = [j.workMode, j.workModeDisplay].map(normaliseToken);
        return candidates.some((c) => workModeSet.includes(c));
      });
    }

    // ── Shift (multi-select; normalised: 'Day' === 'DAY') ────────────────
    const shiftSet = toTokenSet(filters.shift);
    if (shiftSet.length > 0) {
      filtered = filtered.filter((j) => shiftSet.includes(normaliseToken(j.jobShift)));
    }

    // ── City (forgiving substring match across city + full location) ─────
    if (filters.city) {
      const want = filters.city.trim().toLowerCase();
      filtered = filtered.filter((j) => {
        const hay = `${j.jobCity || ''} ${j.jobLocation || ''}`.toLowerCase();
        return hay.includes(want);
      });
    }

    // ── Salary range [minLakhs, maxLakhs] — overlap test ─────────────────
    const salaryRange = normaliseRange(
      filters.salaryRange,
      filters.minSalary != null ? [toLakhs(filters.minSalary), 100] : null,
      [0, 100],
    );
    if (salaryRange && !isFullRange(salaryRange, [0, 100])) {
      const [lo, hi] = salaryRange;
      filtered = filtered.filter((j) => {
        const jMin = toLakhs(j.salaryMin);
        const jMax = toLakhs(j.salaryMax);
        if (jMin == null && jMax == null) return true;
        const bandMin = jMin == null ? jMax : jMin;
        const bandMax = jMax == null ? jMin : jMax;
        return bandMax >= lo && bandMin <= hi;
      });
    }

    const expRange = normaliseRange(
      filters.experienceRange,
      filters.maxExperience != null ? [0, Number(filters.maxExperience)] : null,
      [0, 20],
    );
    if (expRange && !isFullRange(expRange, [0, 20])) {
      const [lo, hi] = expRange;
      filtered = filtered.filter((j) => {
        const jMin = numOrNull(j.expMin);
        const jMax = numOrNull(j.expMax);
        if (jMin == null && jMax == null) return true;
        const bandMin = jMin == null ? jMax : jMin;
        const bandMax = jMax == null ? jMin : jMax;
        return bandMax >= lo && bandMin <= hi;
      });
    }

    // ── Skills match ─────────────────────────────────────────────────────
    if (filters.skills && filters.skills.length > 0) {
      filtered = filtered.filter((j) => {
        const match = jobService.calculateSkillMatch(j.skills, filters.skills);
        return match.matchPercentage >= (filters.minSkillMatch || 0);
      });
    }

    return filtered;
  },

  
  sortJobs: (jobs, sortBy = 'newest') => {
    const sorted = [...jobs];
    
    switch (sortBy) {
      case 'newest':
        return sorted.sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        );
      
      case 'deadline':
        return sorted.sort((a, b) => 
          (a.daysLeft || 999) - (b.daysLeft || 999)
        );
      
      case 'salary-high':
        return sorted.sort((a, b) => 
          (b.salaryMax || 0) - (a.salaryMax || 0)
        );
      
      case 'salary-low':
        return sorted.sort((a, b) => 
          (a.salaryMin || 0) - (b.salaryMin || 0)
        );
      
      case 'relevance':
        return sorted;
      
      default:
        return sorted;
    }
  },

  /**
   * Group jobs by category (for grouping in UI)
   */
  groupJobs: (jobs, groupBy = 'jobType') => {
    const grouped = {};
    
    jobs.forEach(job => {
      const key = job[groupBy] || 'Other';
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(job);
    });
    
    return grouped;
  },

  // ==========================================================================
  // JOB SEEKER — "MY APPLICATIONS"
  // ==========================================================================

  /**
   * Fetch the logged-in candidate's job applications (the jobs they applied to).
   *
   * Data sources, merged (server wins on conflicts):
   *   1. Locally recorded applications — every job the candidate applied to from
   *      this browser, captured at apply time. Works with zero backend support.
   *   2. The server list endpoint, IF one is configured (APPLICATIONS_PATH /
   *      VITE_APPLICATIONS_PATH). When it isn't set we skip the network call
   *      entirely, so there's no 404 noise — the page simply shows the local
   *      ledger. Set the path once and server data flows in automatically.
   *
   * @returns {Promise<{ applications: Array, total: number }>}
   *          normalised to: { id, jobId, job: { title, company_name }, status, applied_at, updated_at }
   */
  getApplications: async () => {
    const candidateId = currentCandidateId();

    // ── 1. Fetch from real backend ──────────────────────────────────────
    let server = [];
    let serverOk = false;
    if (candidateId) {
      const headers = {
        ...authHeader(),
        'X-Candidate-Id': String(candidateId),
      };
      try {
        const res = await api.get(`/js/jobseekers/${candidateId}/applications`, { headers });
        const rawList = extractApplicationList(res.data);
        server = rawList.map(mapApplicationFromBackend);
        serverOk = true;
      } catch (err) {
        console.warn('[getApplications] server fetch failed:', err?.response?.status, err?.message);
        server = [];
      }
    }

    // ── 2. Build the display list ───────────────────────────────────────
    let result;
    if (serverOk && server.length > 0) {
      // Build a map of local entries for smart merging
      const localMap = new Map();
      readLocalApplications(candidateId)
        .map(mapApplicationFromBackend)
        .forEach((a) => localMap.set(String(a.jobId ?? a.id), a));

      const merged = server.map((sApp) => {
        const key = String(sApp.jobId ?? sApp.id);
       const lApp = localMap.get(key);

        if (
          lApp &&
          sApp.status === 'WITHDRAWN' &&
          lApp.status === 'APPLIED' &&
          new Date(lApp.updated_at || 0) > new Date(sApp.updated_at || 0)
        ) {
          // User re-applied after withdrawing — local is newer, use local status
          return { ...sApp, status: 'APPLIED', updated_at: lApp.updated_at };
        }
        if (lApp?.job?.company_logo_url && !sApp.job?.company_logo_url) {
          return {
            ...sApp,
            job: { ...sApp.job, company_logo_url: lApp.job.company_logo_url },
          };
        }
        return sApp;
      });

      const serverJobIds = new Set(server.map((a) => String(a.jobId ?? a.id)));
      const localOnly = [...localMap.values()].filter(
        (a) => !serverJobIds.has(String(a.jobId ?? a.id)),
      );

      result = [...merged, ...localOnly].sort(
        (a, b) => new Date(b.applied_at || 0) - new Date(a.applied_at || 0),
      );
    } else if (serverOk) {
      result = readLocalApplications(candidateId).map(mapApplicationFromBackend);
    } else {
      result = readLocalApplications(candidateId).map(mapApplicationFromBackend);
    }

  const needsEnrichment = result.filter(
      (a) => a.jobId && (!a.job?.title || a.job.title === 'Untitled role' ||
                         !a.job?.company_name || a.job.company_name === '\u2014'),
    );
    if (needsEnrichment.length > 0) {
      const jobCache = {};
      await Promise.all(
       needsEnrichment.map(async (app) => {
          logoHydratedJobIds.add(String(app.jobId));
          if (jobCache[app.jobId]) return;
          // Skip anything the negative cache already knows is gone.
          if (deletedJobIds.has(String(app.jobId))) {
            jobCache[app.jobId] = {
              title: `Job #${app.jobId}`,
              company_name: '\u2014',
              company_logo_url: null,
            };
            return;
          }
          try {
            const jRes = await api.get(`/js/jobs/${app.jobId}`, {
              params: { viewer_role: 'JOBSEEKER' },
            });
            const j = jRes.data || {};
            jobCache[app.jobId] = {
              title: j.job_title || j.jobTitle || j.title || 'Untitled role',
              company_name: j.company_name || j.companyName || '\u2014',
              company_logo_url: j.company_logo_url || j.companyLogoUrl || null,
            };
          } catch (err) {
            // Remember the 404 so we don't retry it again this session.
            if (err?.response?.status === 404) {
              deletedJobIds.add(String(app.jobId));
            }
            jobCache[app.jobId] = {
              title: `Job #${app.jobId}`,
              company_name: '\u2014',
              company_logo_url: null,
            };
          }
        }),
      );
      // Apply enriched data
      result = result.map((a) => {
        const enriched = a.jobId ? jobCache[a.jobId] : null;
        if (!enriched) return a;
        const cur = a.job || {};
        const hasTitle = cur.title && cur.title !== 'Untitled role';
        return {
          ...a,
          job: {
            ...cur,
            title:            hasTitle ? cur.title : enriched.title,
            company_name:     (cur.company_name && cur.company_name !== '—') ? cur.company_name : enriched.company_name,
            company_logo_url: cur.company_logo_url || enriched.company_logo_url || null,
          },
        };
      });
    }

    // ── 4. Sync to local ledger ─────────────────────────────────────────
    if (serverOk && result.length > 0) {
      writeLocalApplications(
        result.map((a) => ({
          id: a.id, jobId: a.jobId, job: a.job,
          status: a.status, applied_at: a.applied_at, updated_at: a.updated_at,
        })),
        candidateId,
      );
    }

    return { applications: result, total: result.length };
  },

  
  recordLocalApplication: ({
    applicationId, jobId, jobTitle, companyName,
    status = 'APPLIED', appliedAt,
  } = {}) => {
    const candidateId = currentCandidateId();
    const record = {
      id: applicationId ?? (jobId != null ? `job-${jobId}` : `app-${Date.now()}`),
      jobId: jobId ?? null,
      job: { title: jobTitle || 'Untitled role', company_name: companyName || '—' },
      status: status || 'APPLIED',
      applied_at: appliedAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const list = readLocalApplications(candidateId);
    const idx = list.findIndex(
      (a) => (jobId != null && String(a.jobId) === String(jobId)) || a.id === record.id,
    );
    if (idx >= 0) list[idx] = { ...list[idx], ...record };
    else list.unshift(record);

    writeLocalApplications(list, candidateId);
    return record;
  },

  /**
   * Check whether a specific job has been applied to (from local ledger).
   * @returns {object|null} The application record if applied (with applied_at), or null.
   */
  isJobApplied: (jobId) => {
    if (jobId == null) return null;
    const list = readLocalApplications();
    const app = list.find(
      (a) => String(a.jobId) === String(jobId) && a.status !== 'WITHDRAWN',
    );
    return app || null;
  },

  /**
 
   *  - Older:            "Already Applied"
   * @returns {string|null}  null if the job hasn't been applied to.
   */
  getAppliedLabel: (jobId) => {
    const app = jobService.isJobApplied(jobId);
    if (!app) return null;

    const appliedAt = app.applied_at ? new Date(app.applied_at) : null;
    if (!appliedAt || isNaN(appliedAt.getTime())) return 'Already Applied';

    const now = new Date();
    const diffMs = now - appliedAt;
    const ONE_MINUTE = 60 * 1000;
    const isToday =
      appliedAt.getFullYear() === now.getFullYear() &&
      appliedAt.getMonth() === now.getMonth() &&
      appliedAt.getDate() === now.getDate();

    if (diffMs < ONE_MINUTE) return 'Applied just now';
    if (isToday) return 'Applied today';
    return 'Already Applied';
  },

  /**
   * Withdraw an application.
   * @returns {Promise<boolean>} true on success.
   */
  withdrawApplication: async (applicationId) => {
    if (!applicationId) throw new Error('applicationId is required');
    if (typeof applicationId === 'string' && !/^\d+$/.test(applicationId)) {
      throw new Error('Cannot withdraw — application has not been synced to server yet. Please refresh and try again.');
    }
    const candidateId = currentCandidateId();
    const headers = {
      ...authHeader(),
      ...(candidateId ? { 'X-Candidate-Id': String(candidateId) } : {}),
    };

    // Hit real backend endpoint
    const res = await api.post(
      `/js/jobs/application/${applicationId}/withdraw`,
      {},
      { headers },
    );

    // Update local ledger to reflect withdrawal immediately
    const list = readLocalApplications(candidateId).map((a) =>
      String(a.id) === String(applicationId)
        ? { ...a, status: 'WITHDRAWN', updated_at: new Date().toISOString() }
        : a,
    );
    writeLocalApplications(list, candidateId);

    return true;
  },

  _jsHeaders: () => {
    const candidateId = currentCandidateId();
    return {
      ...authHeader(),
      ...(candidateId ? { 'X-Candidate-Id': String(candidateId) } : {}),
    };
  },

  /**
   * Synchronous read of the saved-jobs cache (local mirror), newest first.

   * @returns {Array<object>}
   */
  getSavedJobsLocal: () =>
    readSavedJobs()
      .slice()
      .sort((a, b) => new Date(b.saved_at || 0) - new Date(a.saved_at || 0)),

  /**
   * All saved jobs for the logged-in jobseeker — server-first.

   * @returns {Promise<Array<object>>}
   */
  getSavedJobs: async () => {
    try {
      const res = await api.get('/js/jobs/saved', { headers: jobService._jsHeaders() });
      const jobs = (res.data?.Jobs || []).map(mapJobFromBackend).filter(Boolean);
      // Mirror server → local cache, preserving server order (saved_at DESC).
      const now = Date.now();
      writeSavedJobs(jobs.map((j, idx) => ({
        ...j,
        isSaved: true,
        saved_at: new Date(now - idx * 1000).toISOString(),
      })));
      return jobs.map((j) => ({ ...j, isSaved: true }));
    } catch (err) {
      // Offline / session issue — serve the local mirror so the page still works.
      return jobService.getSavedJobsLocal();
    }
  },

  /**
   * Whether a job is currently saved (from the local mirror — synchronous).
   * @returns {boolean}
   */
  isJobSaved: (jobId) => {
    if (jobId == null) return false;
    return readSavedJobs().some((j) => String(j.id) === String(jobId));
  },

  /**
   * Save a job. Optimistically writes the local mirror, then POSTs
 .
   * @param {object} job — the transformed job object as used by the cards.
   * @returns {Promise<boolean>} true on success.
   */
  saveJob: async (job) => {
    if (!job || job.id == null) return false;
    const before = readSavedJobs();
    if (!before.some((j) => String(j.id) === String(job.id))) {
      writeSavedJobs([
        { ...job, isSaved: true, saved_at: new Date().toISOString() },
        ...before,
      ]);
    }
    try {
      await api.post(`/js/jobs/${job.id}/save`, {}, { headers: jobService._jsHeaders() });
      notifyJobsUpdated();
      return true;
    } catch (err) {
      writeSavedJobs(before); // roll back optimistic write
      throw err;
    }
  },

  /**
 
   * @returns {Promise<boolean>} true on success.
   */
  unsaveJob: async (jobId) => {
    if (jobId == null) return false;
    const before = readSavedJobs();
    writeSavedJobs(before.filter((j) => String(j.id) !== String(jobId)));
    try {
      await api.delete(`/js/jobs/${jobId}/unsave`, { headers: jobService._jsHeaders() });
      notifyJobsUpdated();
      return true;
    } catch (err) {
      if (err?.response?.status === 404) { notifyJobsUpdated(); return true; } // already not saved server-side
      writeSavedJobs(before); // roll back optimistic removal
      throw err;
    }
  },

  /**
   * Toggle a job's saved state against the backend.
   * @returns {Promise<boolean>} the NEW saved state (true = now saved).
   */
  toggleSaveJob: async (job) => {
    if (!job || job.id == null) return false;
    if (jobService.isJobSaved(job.id)) {
      await jobService.unsaveJob(job.id);
      return false;
    }
    await jobService.saveJob(job);
    return true;
  },

};

jobService.companyLogoUrlFor = (companyId) => {
  if (!companyId) return null;
  return `/api/company/${companyId}/logo/`;
};

export default jobService;