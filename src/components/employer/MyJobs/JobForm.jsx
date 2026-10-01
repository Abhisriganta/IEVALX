import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Box, TextField,
  Select, MenuItem, FormControl, InputLabel, Chip, Button, Typography,
  IconButton, Checkbox, FormControlLabel,
  Stack, Tabs, Tab, InputAdornment, Alert, Badge, Divider,
} from '@mui/material';
import {
  Close as CloseIcon,
  Add as AddIcon,
  InfoOutlined,
  CheckCircleOutlined,
  WarningAmberOutlined,
  EditOutlined,
  BusinessOutlined,
  LocationOnOutlined,
  WorkOutlined,
} from '@mui/icons-material';
import Autocomplete from '@mui/material/Autocomplete';

/* ── Visual tokens (pine/sage brand — matches MyJobs / FindJobs) ──── */
const NAVY          = '#022124';   
const NAVY_DARK     = '#0A3A38';   
const ACCENT        = '#7F9E7E';  
const SAGE_SOFT     = '#EDF3EC';
const SAGE_TEXT     = '#5E815D';
const BORDER        = '#E7EAE3';
const BORDER_STRONG = '#D8DDD4';
const INK_MUTED     = '#55584F';
const HELPER_TEXT   = '#55584F';
const PAGE_BG       = '#F6F8F3';
const FONT          = "'Jost','DM Sans',sans-serif";
const DIALOG_SHADOW = '0 24px 48px -12px rgba(2,33,36,0.18)';

/* ── Constants — identical to admin PostJob.jsx ───────────────────── */
const COMPANY_TYPES = ['FMCG', 'MNC', 'Start-up', 'Product-based', 'B2B', 'Private', 'Government', 'Others'];
const JOB_TYPES     = ['Internship', 'Full-time', 'Part-time', 'Contract', 'Freelance'];
const GENDER_OPTIONS = ['Male', 'Female', 'All'];
const SHIFT_OPTIONS  = ['Day', 'Midday', 'Night', 'Rotational'];
const WORK_MODE_OPTIONS = ['On-Site', 'Remote', 'Hybrid', 'Field Work', 'Flexible'];
const CANDIDATE_CATEGORIES = [
  'General (Open to All)',
  'Diversity Hiring',
  'Persons with Disabilities (PwD)',
];
const LANGUAGES = [
  'English', 'Hindi', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Marathi',
  'Bengali', 'Gujarati', 'Punjabi', 'Odia', 'Urdu', 'Assamese', 'Maithili',
  'Santali', 'Kashmiri', 'Nepali', 'Sindhi', 'Konkani', 'Manipuri', 'Bodo',
  'Dogri', 'Sanskrit', 'Arabic', 'French', 'German', 'Spanish', 'Mandarin',
  'Japanese', 'Korean', 'Portuguese', 'Russian', 'Italian', 'Dutch', 'Other',
];

// Category keys MUST match BENEFIT_CATEGORY_MAP in backend job_post.py
const BENEFITS = {
  Travel: ['Travel allowance', 'Company car', 'Fuel reimbursement', 'Public transport subsidy', 'Parking allowance', 'Other'],
  Health: ['Health insurance', 'Vision', 'Annual health checkup', 'Dental', 'Gym membership', 'Other'],
  Financial: ['Performance bonus', 'Life insurance', 'Salary advance', 'Stock options', 'Provident fund', 'Gratuity', 'Other'],
  'Time Off': ['Paid time off', 'Flexible hours', 'Work from home', 'Sabbatical', 'Maternity/Paternity', 'Casual leave', 'Other'],
  'Professional Support & Learning': ['Training programs', 'Conference attendance', 'Certification support', 'Skill development', 'Mentorship program', 'Career advancement', 'Other'],
};

const ADMIN_ROLES = new Set(['COMPANY_ADMIN']);

/* ── Form initial state — admin shape ─────────────────────────────── */
const INITIAL_FORM = {
  companyName: '',
  companyType: '',
  companyTypeOther: '',
  jobTitle: '',
  jobLocation: '',
  completeAddress: '',
  interviewLocation: '',
  jobType: 'Full-time',
  workMode: '',
  openings: '1',
  skills: [],
  responsibilities: [],
  jobDescription: '',
  expMin: '',
  expMax: '',
  salaryMin: '',
  salaryMax: '',
  education: [],
  gender: 'All',
  candidateCategory: '',
  disabilityType: '',
  jobShift: 'Day',
  industryPreference: '',
  languages: [],
  applicationDeadline: '',
  requirementsCovered: false,
  benefits: {},
};

/* ── Helpers ──────────────────────────────────────────────────────── */
const wordCount = (str) => (str?.trim().split(/\s+/).filter(Boolean).length) || 0;

// Which tab each field belongs to — used for badge error counts
const FIELD_TO_TAB = {
  companyName: 0, companyType: 0, companyTypeOther: 0, jobTitle: 0, jobLocation: 0,
  completeAddress: 0, interviewLocation: 0, jobType: 0, workMode: 0,
  skills: 1, responsibilities: 1, jobDescription: 1,
  expMin: 2, expMax: 2, salaryMin: 2, salaryMax: 2, education: 2,
  gender: 2, candidateCategory: 2, disabilityType: 2, jobShift: 2, languages: 2, applicationDeadline: 2,
};

// Map backend snake_case row to form camelCase shape (for edit prefill)
const mapBackendToForm = (job, fallbackCompanyName = '') => {
  if (!job) return { ...INITIAL_FORM, companyName: fallbackCompanyName };
  return {
    companyName        : job.company_name || fallbackCompanyName,
    companyType        : COMPANY_TYPES.includes(job.company_type) ? job.company_type : (job.company_type ? 'Others' : ''),
    companyTypeOther   : COMPANY_TYPES.includes(job.company_type) ? '' : (job.company_type || ''),
    jobTitle           : job.job_title || '',
    jobLocation        : job.job_location || '',
    completeAddress    : job.job_address_line1 || '',
    interviewLocation  : job.preferred_interview_location || '',
    jobType            : job.job_type || 'Full-time',
    workMode           : job.work_mode || '',
        openings           : job.openings != null ? String(job.openings) : '1',

    skills             : Array.isArray(job.skills) ? job.skills : [],
    responsibilities   : Array.isArray(job.responsibilities) ? job.responsibilities : [],
    jobDescription     : job.job_description || '',
    expMin             : job.experience_min != null ? String(job.experience_min) : '',
    expMax             : job.experience_max != null ? String(job.experience_max) : '',
    salaryMin          : job.salary_min != null ? String(job.salary_min) : '',
    salaryMax          : job.salary_max != null ? String(job.salary_max) : '',
    education          : job.education_requirements
                          ? String(job.education_requirements).split(',').map(s => s.trim()).filter(Boolean)
                          : [],
    gender             : job.gender || 'All',
    candidateCategory  : job.candidate_category || '',
    disabilityType     : job.disability_type || '',
    jobShift           : job.job_shift || 'Day',
    industryPreference : job.industry_preference || '',
    languages: (() => {
  const raw = Array.isArray(job.languages) ? job.languages : [];
  return raw.map(l => LANGUAGES.find(opt => opt.toLowerCase() === l.toLowerCase()) || l);
})(),
    applicationDeadline: job.application_deadline || '',
    requirementsCovered: !!job.is_requirements_covered,
    benefits           : (job.benefits && typeof job.benefits === 'object') ? job.benefits : {},
  };
};

// Build the payload sent up via onSubmit(payload, intent).
const buildPayload = (form, status, companyId) => {
  const resolvedCompanyType =
    form.companyType === 'Others' ? form.companyTypeOther.trim() : form.companyType;

  return {
    companyId,
    companyName:                form.companyName,
    companyType:                resolvedCompanyType,
    jobTitle:                   form.jobTitle.trim(),
    jobLocation:                form.jobLocation.trim(),
    completeAddress:            form.completeAddress.trim(),
    preferredInterviewLocation: form.interviewLocation.trim(),
    jobType:                    form.jobType,
    workMode:                   form.workMode,
     openings:                   form.openings === '' ? 1 : Math.max(1, Number(form.openings)),

    requiredSkills:             form.skills,
    rolesResponsibilities:      form.responsibilities,
    jobDescription:             form.jobDescription,

    minExperience:              form.expMin === '' ? null : Number(form.expMin),
    maxExperience:              form.expMax === '' ? null : Number(form.expMax),
    minSalary:                  form.salaryMin === '' ? null : Number(form.salaryMin),
    maxSalary:                  form.salaryMax === '' ? null : Number(form.salaryMax),

    educationRequirements:      form.education,
    gender:                     form.gender,
    candidateCategory:          form.candidateCategory,
    disabilityType:
      form.candidateCategory === 'Persons with Disabilities (PwD)'
        ? form.disabilityType.trim()
        : null,

    jobShift:                   form.jobShift,
    languages:                  form.languages,
    industryPreference:         form.industryPreference.trim(),
    applicationDeadline:        form.applicationDeadline,
    requirementsCovered:        form.requirementsCovered,
    benefits:                   form.benefits,
    status,
  };
};

/* ── Validation — identical rules to admin PostJob.jsx ────────────── */
const validateFull = (form) => {
  const errors = {};

  // Tab 0 — Basics
  if (!form.companyName.trim()) errors.companyName = 'Company name is required';
  if (!form.companyType) errors.companyType = 'Select a company type';
  if (form.companyType === 'Others' && !form.companyTypeOther.trim()) {
    errors.companyTypeOther = 'Please specify';
  }
  if (!form.jobTitle.trim()) errors.jobTitle = 'Job title is required';
  if (!form.jobLocation.trim()) errors.jobLocation = 'Location is required';
  if (!form.completeAddress.trim()) errors.completeAddress = 'Address is required';
  if (!form.interviewLocation.trim()) errors.interviewLocation = 'Interview location is required';
  if (!form.jobType) errors.jobType = 'Select a job type';
  if (!form.workMode) errors.workMode = 'Select a work mode';

  // Tab 1 — Job Details
  if (!form.skills.length) errors.skills = 'Add at least one skill';
  if (!form.responsibilities.length) errors.responsibilities = 'Add at least one responsibility';

  const wc = wordCount(form.jobDescription);
  if (!form.jobDescription.trim()) {
    errors.jobDescription = 'Description is required';
  } else if (wc > 5000) {
    errors.jobDescription = `Must be at most 5000 words (currently ${wc})`;
  }

  // Tab 2 — Requirements
  if (form.expMin === '' || isNaN(Number(form.expMin))) errors.expMin = 'Required';
  else if (Number(form.expMin) < 0) errors.expMin = 'Cannot be negative';
  if (form.expMax === '' || isNaN(Number(form.expMax))) errors.expMax = 'Required';
  else if (Number(form.expMax) < 0) errors.expMax = 'Cannot be negative';
  else if (Number(form.expMax) < Number(form.expMin)) errors.expMax = 'Max must be >= Min';

  if (form.salaryMin === '' || isNaN(Number(form.salaryMin))) errors.salaryMin = 'Required';
  else if (Number(form.salaryMin) < 0) errors.salaryMin = 'Cannot be negative';
  if (form.salaryMax === '' || isNaN(Number(form.salaryMax))) errors.salaryMax = 'Required';
  else if (Number(form.salaryMax) < 0) errors.salaryMax = 'Cannot be negative';
  else if (Number(form.salaryMax) < Number(form.salaryMin)) errors.salaryMax = 'Max must be >= Min';

  if (!form.education.length) errors.education = 'Add at least one education requirement';
  if (!form.jobShift) errors.jobShift = 'Select shift';
  if (!form.languages.length) errors.languages = 'Add at least one language';
  if (!form.applicationDeadline) errors.applicationDeadline = 'Pick a deadline';

  if (!form.candidateCategory) {
    errors.candidateCategory = 'Select a candidate category';
  } else if (
    form.candidateCategory === 'Persons with Disabilities (PwD)' &&
    !form.disabilityType.trim()
  ) {
    errors.disabilityType = 'Specify allowed disability types';
  }
  return errors;
};

/* ── Tab panel ────────────────────────────────────────────────────── */
const TabPanel = ({ value, index, children }) => (
  <Box hidden={value !== index} sx={{ pt: 2 }}>
    {value === index && children}
  </Box>
);

/* ── Chip input (Skills, Responsibilities, Education, Languages) ──── */
const ChipInput = ({ value = [], onChange, label, placeholder, error }) => {
  const [text, setText] = useState('');

  const add = () => {
    const t = text.trim();
    if (t && !value.some((v) => v.toLowerCase() === t.toLowerCase())) {
      onChange([...value, t]);
    }
    setText('');
  };

  const remove = (item) => onChange(value.filter((v) => v !== item));

  return (
    <Box>
     <TextField
        fullWidth
        size="small"
        label={label}
        placeholder={placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            add();
          }
        }}
        error={!!error}
        helperText={error || 'Press Enter to add'}
        slotProps={{
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <IconButton size="small" onClick={add}>
                  <AddIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          },
          /* helper-text colour handled globally via DialogContent sx —
             per-component fallback in case ChipInput is reused */
          formHelperText: {
            sx: !error ? { color: HELPER_TEXT, fontWeight: 500 } : undefined,
          },
        }}
      />
      <Stack direction="row" spacing={1} sx={{ mt: 1, gap: 1, flexWrap: 'wrap' }}>
        {/* 🔧 CHANGE 1/8 · chip visual tint (logic unchanged) */}
        {value.map((item) => (
          <Chip key={item} label={item} onDelete={() => remove(item)} size="small"
            sx={{ bgcolor: SAGE_SOFT, color: NAVY, fontWeight: 500, borderRadius: '8px',
              '& .MuiChip-deleteIcon': { color: SAGE_TEXT, opacity: 0.6, '&:hover': { color: NAVY, opacity: 1 } } }} />
        ))}
      </Stack>
    </Box>
  );
};

/* ── Benefits selector ────────────────────────────────────────────── */
const BenefitsSelector = ({ value = {}, onChange }) => {
  const toggle = (category, item) => {
    const current = value[category] || [];
    const next = current.includes(item)
      ? current.filter((i) => i !== item)
      : [...current, item];
    onChange({ ...value, [category]: next });
  };

  return (
    <Stack spacing={2.5}>
      {Object.entries(BENEFITS).map(([category, items]) => (
        <Box key={category}>
          {/* 🔧 CHANGE 2/8 · benefit category header with accent bar */}
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.25 }}>
            <Box sx={{ width: 3, height: 14, borderRadius: 2, bgcolor: ACCENT }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: NAVY }}>
              {category}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
            {items.map((item) => {
              const selected = (value[category] || []).includes(item);
              return (
                <Chip
                  key={item}
                  label={item}
                  onClick={() => toggle(category, item)}
                  color={selected ? 'primary' : 'default'}
                  variant={selected ? 'filled' : 'outlined'}
                  size="small"
                  sx={{ borderRadius: '8px', fontWeight: 500,
                    ...(selected ? { bgcolor: NAVY } : { borderColor: BORDER, color: INK_MUTED }) }}
                />
              );
            })}
          </Stack>
        </Box>
      ))}
    </Stack>
  );
};


const JobForm = ({
  open,
  onClose,
  onSubmit,
  initialData = null,
  isEditing = false,
  readOnly = false,
  companyId,
  companyName = '',
  currentUserRole = 'HIRING_MANAGER',
}) => {
  const [tab, setTab] = useState(0);
  const [form, setForm] = useState({
    ...INITIAL_FORM,
    companyName: companyName || INITIAL_FORM.companyName,
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  // Approval banner logic
  const isAdmin       = ADMIN_ROLES.has(currentUserRole);
  const needsApproval = !isAdmin;

  /* ── Reset / prefill form when dialog opens ─────────────────────── */
  useEffect(() => {
    if (open) {
      if (initialData) {
        setForm(mapBackendToForm(initialData, companyName));
      } else {
        setForm({ ...INITIAL_FORM, companyName: companyName || INITIAL_FORM.companyName });
      }
      setErrors({});
      setServerError('');
      setTab(0);
    }
  }, [open, initialData, companyName]);

  /* ── Field updaters ─────────────────────────────────────────────── */
  const update = (name) => (e) => {
    const val = e?.target
      ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value)
      : e;
    setForm((f) => ({ ...f, [name]: val }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const updateValue = (name, val) => {
    setForm((f) => ({ ...f, [name]: val }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  /* ── Tab error badges ───────────────────────────────────────────── */
  const tabErrorCount = { 0: 0, 1: 0, 2: 0, 3: 0 };
  Object.keys(errors).forEach((field) => {
    const t = FIELD_TO_TAB[field];
    if (t !== undefined) tabErrorCount[t]++;
  });

  const jumpToFirstError = (errs) => {
    const firstField = Object.keys(errs)[0];
    if (firstField && FIELD_TO_TAB[firstField] !== undefined) {
      setTab(FIELD_TO_TAB[firstField]);
    }
  };

  /* ── Submit handlers ────────────────────────────────────────────── */
  const handlePost = async () => {
    setServerError('');

    if (!companyId) {
      setServerError('Missing company context. Please refresh and try again.');
      return;
    }

    const errs = validateFull(form);
    setErrors(errs);
    if (Object.keys(errs).length) {
      jumpToFirstError(errs);
      return;
    }

    setSubmitting(true);
    try {
      const payload = buildPayload(form, 'active', companyId);
      // Preserve existing onSubmit(payload, intent) contract.
      await onSubmit(payload, 'active');
      handleClose();
    } catch (err) {
      setServerError(err?.friendlyMessage || err?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    setServerError('');

    if (!companyId) {
      setServerError('Missing company context. Please refresh and try again.');
      return;
    }

    // Backend requires all fields even for drafts, so validate fully here.
    const errs = validateFull(form);
    setErrors(errs);
    if (Object.keys(errs).length) {
      jumpToFirstError(errs);
      return;
    }

    setSubmitting(true);
    try {
      const payload = buildPayload(form, 'draft', companyId);
      await onSubmit(payload, 'draft');
      handleClose();
    } catch (err) {
      setServerError(err?.friendlyMessage || err?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setForm({ ...INITIAL_FORM, companyName: companyName || INITIAL_FORM.companyName });
    setErrors({});
    setServerError('');
    setTab(0);
    onClose();
  };

  const descWords = wordCount(form.jobDescription);

  const renderApprovalBanner = () => {
    if (isEditing) {
      if (!needsApproval) return null;
      return (
        <Alert
          severity="warning"
          icon={<WarningAmberOutlined />}
          sx={{ mb: 2, borderRadius: '12px' }}
        >
          <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, mb: 0.3 }}>
            Saving will use up your edit access.
          </Typography>
          <Typography sx={{ fontSize: '0.78rem' }}>
            You have one chance to save changes for this job. To edit it again,
            you'll need to request access from your Company Admin.
          </Typography>
        </Alert>
      );
    }
    if (needsApproval) {
      return (
        <Alert
          severity="info"
          icon={<InfoOutlined />}
          sx={{ mb: 2, borderRadius: '12px' }}
        >
          <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, mb: 0.3 }}>
            This job will be sent to your Company Admin for approval.
          </Typography>
          <Typography sx={{ fontSize: '0.78rem' }}>
            Once approved, it will be published automatically. You can track its status under
            the <strong>Pending Approval</strong> tab on My Jobs.
          </Typography>
        </Alert>
      );
    }
    return (
      <Alert
        severity="success"
        icon={<CheckCircleOutlined />}
        sx={{ mb: 2, borderRadius: '12px' }}
      >
        <Typography sx={{ fontSize: '0.85rem', fontWeight: 600 }}>
          You're posting as Company Admin — this job will go live immediately on submit.
        </Typography>
      </Alert>
    );
  };

  /* ── Tab label with error badge ─────────────────────────────────── */
  const TabLabel = ({ label, count }) => (
    <Badge badgeContent={count} color="error" invisible={!count}>
      <Box component="span" sx={{ px: 1 }}>{label}</Box>
    </Badge>
  );

  // Submit button label depends on edit mode + role.
  const submitLabel = isEditing
    ? (submitting ? 'Saving…' : 'Save Changes')
    : needsApproval
      ? (submitting ? 'Submitting…' : 'Submit for Approval')
      : (submitting ? 'Posting…' : 'Post Job');

  /* ── READ-ONLY DETAILS VIEW (corporate detail layout) ─────────── */
  if (readOnly) {
    const j = initialData || {};
    const skills           = Array.isArray(j.skills) ? j.skills : [];
    const responsibilities = Array.isArray(j.responsibilities) ? j.responsibilities : [];
    const languages        = Array.isArray(j.languages) ? j.languages : [];
    const education        = j.education_requirements
      ? (Array.isArray(j.education_requirements)
          ? j.education_requirements
          : String(j.education_requirements).split(',').map(s => s.trim()).filter(Boolean))
      : [];
    const benefitsObj = (j.benefits && typeof j.benefits === 'object') ? j.benefits : {};
    const status      = j.display_status || j.status_display || 'Draft';

    const salaryText = (() => {
      const a = j.salary_min, b = j.salary_max;
      if (a == null && b == null) return '—';
      const f = (v) => v == null ? '' :
        (v / 100000 >= 1 ? `₹${(v/100000).toFixed(1)}L` : `₹${Number(v).toLocaleString('en-IN')}`);
      if (a != null && b != null) return `${f(a)} – ${f(b)} per annum`;
      return f(a ?? b);
    })();

    const experienceText = (() => {
      const a = j.experience_min, b = j.experience_max;
      if (a == null && b == null) return '—';
      if (a != null && b != null) return `${a}–${b} years`;
      if (a != null) return `${a}+ years`;
      return `up to ${b} years`;
    })();

    /* 🔧 CHANGE 3/8 · view helpers — status tint, section header, fact cell, chip groups */
    const STATUS_TINT = {
      'Active':           { c: '#3E6E3E', b: '#EAF2E9' },  // sage-green
      'Draft':            { c: '#55584F', b: '#F0F2ED' },
      'Closed':           { c: '#B4462F', b: '#FBECEA' },
      'Pending Approval': { c: '#A35A2D', b: '#FBF0E7' },  // amber
      'Rejected':         { c: '#B4462F', b: '#FBECEA' },
      'Removed':          { c: '#55584F', b: '#F0F2ED' },
    };
    const st = STATUS_TINT[status] || STATUS_TINT.Draft;

    const Section = ({ children }) => (
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 3, mb: 1.5 }}>
        <Box sx={{ width: 3, height: 16, borderRadius: 2, bgcolor: ACCENT }} />
        <Typography sx={{ fontSize: '0.98rem', fontWeight: 700, color: NAVY }}>
          {children}
        </Typography>
      </Stack>
    );

    const Fact = ({ label, value }) => (
      <Box>
        <Typography sx={{ fontSize: '0.68rem', color: INK_MUTED, textTransform: 'uppercase',
          letterSpacing: '0.05em', fontWeight: 700, mb: 0.3 }}>
          {label}
        </Typography>
        <Typography sx={{ fontSize: '0.9rem', color: NAVY, fontWeight: 500, lineHeight: 1.5 }}>
          {value || '—'}
        </Typography>
      </Box>
    );

    const ChipGroup = ({ items }) => (
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
        {items.map((it, i) => (
          <Chip key={`${it}-${i}`} label={it} size="small"
            sx={{ bgcolor: SAGE_SOFT, color: SAGE_TEXT, fontWeight: 600, borderRadius: '8px', border: `1px solid rgba(127,158,126,0.28)` }} />
        ))}
      </Stack>
    );

    const metaChipSx = {
      bgcolor: PAGE_BG, color: SAGE_TEXT, fontWeight: 600, borderRadius: '8px',
      border: `1px solid ${BORDER}`,
      '& .MuiChip-icon': { color: SAGE_TEXT },
    };

    return (
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { maxHeight: '90vh', borderRadius: '16px', boxShadow: DIALOG_SHADOW } } }}
      >
        {/* 🔧 CHANGE 4/8 · navy header band for the details view */}
        <DialogTitle
          sx={{
            bgcolor: NAVY, color: '#fff',
            display: 'flex', alignItems: 'center', gap: 1.5, py: 2, px: 3,
          }}
        >
          <Box sx={{
            width: 34, height: 34, borderRadius: '10px', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            bgcolor: 'rgba(255,255,255,0.14)',
          }}>
            <WorkOutlined sx={{ fontSize: 18 }} />
          </Box>
          <Typography component="span" sx={{ fontWeight: 700, fontSize: '1.05rem', flex: 1 }}>
            Job Details
          </Typography>
          <IconButton onClick={handleClose} aria-label="Close dialog" sx={{ color: 'inherit' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

       <DialogContent sx={{ px: { xs: 2.5, sm: 4 }, py: 3, bgcolor: PAGE_BG, '&.MuiDialogContent-root': { pt: 3 } }}>
          {/* Title + status */}
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, mb: 1.5 }}>
            <Typography
              sx={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: '1.7rem',
                color: NAVY,
                lineHeight: 1.2,
              }}
            >
              {j.job_title || 'Untitled Job'}
            </Typography>
           <Chip
  label={status}
  size="small"
  icon={<Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: st.c }} />}
  sx={{ ml: 'auto', bgcolor: st.b, color: st.c, fontWeight: 700, fontSize: '0.72rem',
    flexShrink: 0, border: `1px solid ${st.c}22`, pl: 0.5,
    '& .MuiChip-icon': { ml: 0.6, mr: -0.2 } }}
/>
          </Stack>

          {/* Meta chips */}
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', mb: 1 }}>
            {j.company_name && (
              <Chip icon={<BusinessOutlined sx={{ fontSize: 15 }} />} label={j.company_name} size="small" sx={metaChipSx} />
            )}
            {j.job_location && (
              <Chip icon={<LocationOnOutlined sx={{ fontSize: 15 }} />} label={j.job_location} size="small" sx={metaChipSx} />
            )}
            {j.job_type && (
              <Chip icon={<WorkOutlined sx={{ fontSize: 15 }} />} label={j.job_type} size="small" sx={metaChipSx} />
            )}
          </Stack>

          {/* About the role */}
          <Section>About the role</Section>
          <Typography
            sx={{
              fontSize: '0.92rem',
              color: '#2F332E',
              lineHeight: 1.7,
              whiteSpace: 'pre-wrap',
            }}
          >
            {j.job_description || '—'}
          </Typography>

          {/* Overview grid */}
          <Section>Overview</Section>
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: '14px 28px',
            p: 2, borderRadius: '12px', border: `1px solid ${BORDER}`, bgcolor: '#fff',
          }}>
            <Fact label="Company" value={j.company_name} />
            <Fact label="Company Type" value={j.company_type} />
            <Fact label="Location" value={j.job_location} />
            <Fact label="Address" value={j.job_address_line1} />
            <Fact label="Interview Location" value={j.preferred_interview_location} />
            <Fact label="Job Type" value={j.job_type} />
            <Fact label="Work Mode" value={j.work_mode} />
            <Fact label="Openings" value={j.openings != null ? String(j.openings) : null} />
            <Fact label="Experience" value={experienceText} />
            <Fact label="Salary" value={salaryText} />
            <Fact label="Education" value={education.length ? education.join(', ') : null} />
            <Fact label="Gender" value={j.gender} />
            <Fact label="Shift" value={j.job_shift} />
            <Fact label="Candidate Category" value={j.candidate_category} />
            {j.candidate_category === 'Persons with Disabilities (PwD)' && (
              <Fact label="Disability Type" value={j.disability_type} />
            )}
            <Fact label="Industry Preference" value={j.industry_preference} />
            <Fact label="Application Deadline" value={j.application_deadline} />
          </Box>

          {/* Skills */}
          {skills.length > 0 && (
            <>
              <Section>Skills</Section>
              <ChipGroup items={skills} />
            </>
          )}

          {/* Responsibilities */}
          {responsibilities.length > 0 && (
            <>
              <Section>Responsibilities</Section>
              <Stack component="ul" sx={{ pl: 2.5, m: 0 }} spacing={0.75}>
                {responsibilities.map((r, i) => (
                  <Typography key={i} component="li"
                    sx={{ fontSize: '0.9rem', color: '#2F332E', lineHeight: 1.6 }}>
                    {r}
                  </Typography>
                ))}
              </Stack>
            </>
          )}

          {/* Languages */}
          {languages.length > 0 && (
            <>
              <Section>Languages</Section>
              <ChipGroup items={languages} />
            </>
          )}

          {/* Benefits */}
          <Section>Benefits</Section>
          {Object.keys(benefitsObj).length === 0 ? (
            <Typography sx={{ fontSize: '0.9rem', color: INK_MUTED }}>
              No benefits listed.
            </Typography>
         ) : (
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: '18px 28px',
            }}>
              {Object.entries(benefitsObj).map(([category, items]) => (
                Array.isArray(items) && items.length ? (
                  <Box key={category}>
                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: INK_MUTED, mb: 0.75 }}>
                      {category}
                    </Typography>
                    <ChipGroup items={items} />
                  </Box>
                ) : null
          ))}
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${BORDER}`, bgcolor: '#fff' }}>
          <Button
            onClick={handleClose}
            variant="contained"
            sx={{ textTransform: 'none', bgcolor: NAVY, fontWeight: 600, borderRadius: '10px', px: 3,
              '&:hover': { bgcolor: NAVY_DARK } }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  /* ── ORIGINAL CREATE / EDIT FORM ─────────────────────────────── */
  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      /* 🔧 CHANGE 5/8 · PaperProps → slotProps (MUI v9) + rounded corners + soft shadow */
      slotProps={{ paper: { sx: { minHeight: '80vh', maxHeight: '90vh', borderRadius: '16px', boxShadow: DIALOG_SHADOW } } }}
    >
      {/* 🔧 CHANGE 6/8 · navy header band with icon tile + subtitle */}
      <DialogTitle
        sx={{
          bgcolor: NAVY,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          py: 2,
          px: 3,
        }}
      >
        <Box sx={{
          width: 36, height: 36, borderRadius: '10px', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          bgcolor: 'rgba(255,255,255,0.14)',
        }}>
          {isEditing ? <EditOutlined sx={{ fontSize: 19 }} /> : <AddIcon sx={{ fontSize: 20 }} />}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography component="span" sx={{ fontWeight: 700, fontSize: '1.1rem', lineHeight: 1.2, display: 'block' }}>
            {isEditing ? 'Edit Job' : 'Post a New Job'}
          </Typography>
          <Typography sx={{ fontSize: '0.78rem', opacity: 0.82 }}>
            {isEditing ? 'Update the details for this role' : 'Fill in the details to create a new posting'}
          </Typography>
        </Box>
        <IconButton onClick={handleClose} sx={{ color: 'inherit' }} aria-label="Close dialog">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {/* 🔧 CHANGE 7/8 · tabs — clean labels, navy selected, accent indicator */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="fullWidth"
        sx={{
          borderBottom: `1px solid ${BORDER}`,
          bgcolor: '#fff',
          '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, color: INK_MUTED, minHeight: 52 },
          '& .MuiTab-root:hover': { color: NAVY },
          '& .Mui-selected': { color: `${NAVY} !important` },
          '& .MuiTabs-indicator': { backgroundColor: ACCENT, height: 3, borderRadius: 3 },
        }}
      >
        <Tab label={<TabLabel label="Basics" count={tabErrorCount[0]} />} />
        <Tab label={<TabLabel label="Job Details" count={tabErrorCount[1]} />} />
        <Tab label={<TabLabel label="Requirements" count={tabErrorCount[2]} />} />
        <Tab label={<TabLabel label="Benefits" count={tabErrorCount[3]} />} />
      </Tabs>

   
      <DialogContent
        sx={{
          px: 3,
          py: 2.5,
          bgcolor: PAGE_BG, fontFamily: FONT,
          '& .MuiTypography-root, & .MuiButton-root, & .MuiInputBase-root, & .MuiFormLabel-root, & .MuiMenuItem-root, & .MuiChip-root': { fontFamily: FONT },

          /* ── TextField / Select — kill the default primary-blue focus ring
                and label. MUI's outlined variant uses `primary.main` (blue)
                for focused border + label unless overridden. */
          '& .MuiOutlinedInput-root': {
            borderRadius: '10px',
            '& fieldset': { borderColor: BORDER },
            '&:hover fieldset': { borderColor: BORDER_STRONG },
            '&.Mui-focused fieldset': { borderColor: ACCENT, borderWidth: '1.5px' },
            '&.Mui-error fieldset': { borderColor: '#B4462F' },
          },
          '& .MuiInputLabel-root': {
            color: INK_MUTED,
            '&.Mui-focused': { color: NAVY },
            '&.Mui-error':  { color: '#B4462F' },
          },
          '& .MuiFormHelperText-root:not(.Mui-error)': {
            color: HELPER_TEXT,
            fontWeight: 500,
          },

          /* ── Alerts — retint every severity to the pine/sage palette so
                the info banner never renders in MUI's default blue. */
          '& .MuiAlert-root': {
            borderRadius: '12px',
            fontFamily: FONT,
            border: '1px solid transparent',
          },
          '& .MuiAlert-standardInfo': {
            bgcolor: SAGE_SOFT,
            color: NAVY,
            borderColor: 'rgba(127,158,126,0.35)',
            '& .MuiAlert-icon': { color: SAGE_TEXT },
          },
          '& .MuiAlert-standardWarning': {
            bgcolor: '#FBF0E7',
            color: '#7A4520',
            borderColor: 'rgba(163,90,45,0.30)',
            '& .MuiAlert-icon': { color: '#A35A2D' },
          },
          '& .MuiAlert-standardSuccess': {
            bgcolor: '#EAF2E9',
            color: '#2F5A2F',
            borderColor: 'rgba(62,110,62,0.30)',
            '& .MuiAlert-icon': { color: '#3E6E3E' },
          },
          '& .MuiAlert-standardError': {
            bgcolor: '#FBECEA',
            color: '#7A2E1C',
            borderColor: 'rgba(180,70,47,0.28)',
            '& .MuiAlert-icon': { color: '#B4462F' },
          },

          /* ── Radios / checkboxes / switches use primary.main by default
                too — retint those to sage/pine. */
          '& .MuiCheckbox-root.Mui-checked, & .MuiRadio-root.Mui-checked': { color: ACCENT },
          '& .MuiSwitch-switchBase.Mui-checked': { color: ACCENT },
          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: ACCENT },
        }}
      >
        {serverError && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: '12px' }} onClose={() => setServerError('')}>
            {serverError}
          </Alert>
        )}

        {/* ═══════════════ TAB 0 — BASICS ═══════════════ */}
        <TabPanel value={tab} index={0}>
          <Stack spacing={2}>
            {renderApprovalBanner()}

            <TextField
              label="Company Name *"
              value={form.companyName}
              onChange={update('companyName')}
              fullWidth
              size="small"
              error={!!errors.companyName}
              helperText={
                errors.companyName ||
                (companyName ? 'Auto-filled from your company account' : '')
              }
              slotProps={{ input: { readOnly: !!companyName  } }}
            />

            <TextField
              select
              label="Company Type *"
              value={form.companyType}
              onChange={update('companyType')}
              fullWidth
              size="small"
              error={!!errors.companyType}
              helperText={errors.companyType}
            >
              {COMPANY_TYPES.map((t) => (
                <MenuItem key={t} value={t}>{t}</MenuItem>
              ))}
            </TextField>

            {form.companyType === 'Others' && (
              <TextField
                label="Specify company type *"
                value={form.companyTypeOther}
                onChange={update('companyTypeOther')}
                fullWidth
                size="small"
                error={!!errors.companyTypeOther}
                helperText={errors.companyTypeOther}
              />
            )}

            <TextField
              label="Job Title *"
              value={form.jobTitle}
              onChange={update('jobTitle')}
              fullWidth
              size="small"
              error={!!errors.jobTitle}
              helperText={errors.jobTitle}
            />

            <TextField
              label="Job Location *"
              placeholder="City, Country"
              value={form.jobLocation}
              onChange={update('jobLocation')}
              fullWidth
              size="small"
              error={!!errors.jobLocation}
              helperText={errors.jobLocation}
            />

            <TextField
              label="Complete Address *"
              value={form.completeAddress}
              onChange={update('completeAddress')}
              fullWidth
              size="small"
              multiline
              rows={2}
              error={!!errors.completeAddress}
              helperText={errors.completeAddress}
            />

            <TextField
              label="Preferred Interview Location *"
              value={form.interviewLocation}
              onChange={update('interviewLocation')}
              fullWidth
              size="small"
              error={!!errors.interviewLocation}
              helperText={errors.interviewLocation}
            />

            <TextField
              select
              label="Job Type *"
              value={form.jobType}
              onChange={update('jobType')}
              fullWidth
              size="small"
              error={!!errors.jobType}
              helperText={errors.jobType}
            >
              {JOB_TYPES.map((t) => (
                <MenuItem key={t} value={t}>{t}</MenuItem>
              ))}
            </TextField>

           
            <TextField
              select
              label="Work Mode *"
              value={form.workMode}
              onChange={update('workMode')}
              fullWidth
              size="small"
              error={!!errors.workMode}
              helperText={errors.workMode}
            >
              {WORK_MODE_OPTIONS.map((w) => (
                <MenuItem key={w} value={w}>{w}</MenuItem>
              ))}
            </TextField>

            <TextField
              label="Number of Openings *"
              type="number"
              value={form.openings}
              onChange={update('openings')}
              fullWidth
              size="small"
              slotProps={{ htmlInput: { min: 1, step: 1 } }}
              error={!!errors.openings}
              helperText={errors.openings || 'How many candidates do you want to hire for this role'}
            />
          </Stack>
        </TabPanel>


        {/* ═══════════════ TAB 1 — JOB DETAILS ═══════════════ */}
        <TabPanel value={tab} index={1}>
          <Stack spacing={2}>
            <ChipInput
              label="Required Skills *"
              placeholder="e.g. React, TypeScript"
              value={form.skills}
              onChange={(v) => updateValue('skills', v)}
              error={errors.skills}
            />

            <ChipInput
              label="Roles & Responsibilities *"
              placeholder="Add each responsibility"
              value={form.responsibilities}
              onChange={(v) => updateValue('responsibilities', v)}
              error={errors.responsibilities}
            />

            <TextField
              label="Job Description (0-5000 words) *"
              value={form.jobDescription}
              onChange={update('jobDescription')}
              fullWidth
              multiline
              rows={8}
              size="small"
              error={!!errors.jobDescription}
              helperText={
                errors.jobDescription ||
                `${descWords} words${
                  descWords > 5000
                    ? ` (${descWords - 5000} over limit)`
                    : ' OK'
                }`
              }
            />

            <TextField
              label="Industry Preference"
              placeholder="e.g. Fintech, Healthcare"
              value={form.industryPreference}
              onChange={update('industryPreference')}
              fullWidth
              size="small"
            />
          </Stack>
        </TabPanel>

        {/* ═══════════════ TAB 2 — REQUIREMENTS ═══════════════ */}
        <TabPanel value={tab} index={2}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700, color: NAVY }}>
                Work Experience (years)
              </Typography>
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Min *"
                  type="number"
                  value={form.expMin}
                  onChange={update('expMin')}
                  fullWidth
                  size="small"
                  slotProps={{ htmlInput: { min: 0 } }}
                  error={!!errors.expMin}
                  helperText={errors.expMin}
                />
                <TextField
                  label="Max *"
                  type="number"
                  value={form.expMax}
                  onChange={update('expMax')}
                  fullWidth
                  size="small"
                  slotProps={{ htmlInput: { min: 0 } }}
                  error={!!errors.expMax}
                  helperText={errors.expMax}
                />
              </Stack>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700, color: NAVY }}>
                Salary per Annum (₹)
              </Typography>
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Min *"
                  type="number"
                  value={form.salaryMin}
                  onChange={update('salaryMin')}
                  fullWidth
                  size="small"
                  slotProps={{ htmlInput: { min: 0 } }}
                  error={!!errors.salaryMin}
                  helperText={errors.salaryMin}
                />
                <TextField
                  label="Max *"
                  type="number"
                  value={form.salaryMax}
                  onChange={update('salaryMax')}
                  fullWidth
                  size="small"
                  slotProps={{ htmlInput: { min: 0 } }}
                  error={!!errors.salaryMax}
                  helperText={errors.salaryMax}
                />
              </Stack>
            </Box>

            <ChipInput
              label="Education Requirements *"
              placeholder="e.g. Bachelor's in Computer Science"
              value={form.education}
              onChange={(v) => updateValue('education', v)}
              error={errors.education}
            />

            <TextField
              select
              label="Gender"
              value={form.gender}
              onChange={update('gender')}
              fullWidth
              size="small"
            >
              {GENDER_OPTIONS.map((g) => (
                <MenuItem key={g} value={g}>{g}</MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Candidate Category Required *"
              value={form.candidateCategory}
              onChange={update('candidateCategory')}
              fullWidth
              size="small"
              error={!!errors.candidateCategory}
              helperText={errors.candidateCategory}
            >
              {CANDIDATE_CATEGORIES.map((c) => (
                <MenuItem key={c} value={c}>{c}</MenuItem>
              ))}
            </TextField>

            {form.candidateCategory === 'Persons with Disabilities (PwD)' && (
              <TextField
                label="Specify Disability Type *"
                placeholder="Enter allowed disability types"
                value={form.disabilityType}
                onChange={update('disabilityType')}
                fullWidth
                size="small"
                error={!!errors.disabilityType}
                helperText={errors.disabilityType}
              />
            )}

            <Divider />

            <TextField
              select
              label="Job Shift *"
              value={form.jobShift}
              onChange={update('jobShift')}
              fullWidth
              size="small"
              error={!!errors.jobShift}
              helperText={errors.jobShift}
            >
              {SHIFT_OPTIONS.map((s) => (
                <MenuItem key={s} value={s}>{s}</MenuItem>
              ))}
            </TextField>

            <Autocomplete
  multiple
  options={LANGUAGES}
  value={form.languages}
  onChange={(_, newValue) => updateValue('languages', newValue)}
  disableCloseOnSelect
  renderOption={(props, option, { selected }) => (
    <li {...props}>
      <Checkbox checked={selected} size="small" sx={{ mr: 1 }} />
      {option}
    </li>
  )}
  renderInput={(params) => (
    <TextField
      {...params}
      label="Languages *"
      size="small"
      error={!!errors.languages}
      helperText={errors.languages || `${form.languages.length} selected`}
    />
  )}
/>

            <TextField
              label="Application Deadline *"
              type="date"
              value={form.applicationDeadline}
              onChange={update('applicationDeadline')}
              fullWidth
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
              slotProps={{
                inputLabel: { shrink: true },
                htmlInput: { min: new Date().toISOString().split('T')[0] },
              }}
              error={!!errors.applicationDeadline}
              helperText={errors.applicationDeadline}
            />

          </Stack>
        </TabPanel>

        {/* ═══════════════ TAB 3 — BENEFITS (Optional) ═══════════════ */}
        <TabPanel value={tab} index={3}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Select any benefits this role offers. All optional.
          </Typography>
          <BenefitsSelector
            value={form.benefits}
            onChange={(v) => updateValue('benefits', v)}
          />
        </TabPanel>
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          py: 2,
          borderTop: `1px solid ${BORDER}`,
          bgcolor: '#fff',
          justifyContent: 'space-between',
        }}
      >
        <Button onClick={handleClose} disabled={submitting}
          sx={{ textTransform: 'none', color: INK_MUTED, fontWeight: 600 }}>
          Cancel
        </Button>
        <Stack direction="row" spacing={1}>
          {tab > 0 && (
            <Button onClick={() => setTab(tab - 1)} disabled={submitting}
              sx={{ textTransform: 'none', color: NAVY, fontWeight: 600 }}>
              Back
            </Button>
          )}
          {tab < 3 && (
            <Button variant="outlined" onClick={() => setTab(tab + 1)} disabled={submitting}
              sx={{ textTransform: 'none', borderRadius: '10px', fontWeight: 600,
                color: NAVY, borderColor: BORDER,
                '&:hover': { borderColor: NAVY, bgcolor: SAGE_SOFT } }}>
              Next
            </Button>
          )}
          {!isEditing && (
            <Button onClick={handleSaveDraft} disabled={submitting}
              sx={{ textTransform: 'none', color: NAVY, fontWeight: 600 }}>
              {submitting ? 'Saving…' : 'Save Draft'}
            </Button>
          )}
          <Button variant="contained" onClick={handlePost} disabled={submitting}
            sx={{ textTransform: 'none', bgcolor: NAVY, fontWeight: 600, borderRadius: '10px', px: 2.5,
              boxShadow: '0 4px 12px rgba(30,51,88,0.18)',
              '&:hover': { bgcolor: NAVY_DARK } }}>
            {submitLabel}
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
};

export default JobForm;