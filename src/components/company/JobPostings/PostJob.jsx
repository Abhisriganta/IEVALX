import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  IconButton,
  Tabs,
  Tab,
  Box,
  TextField,
  MenuItem,
  Button,
  Chip,
  Stack,
  Typography,
  Checkbox,
  FormControlLabel,
  InputAdornment,
  Divider,
  Badge,
  Alert,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import Autocomplete from '@mui/material/Autocomplete';
import adminService from '@/services/api/company/adminService';

// ── Palette ──
const HELPER_DARK  = '#55584F';
const BRAND        = '#7F9E7E';  // sage — unchanged
const BRAND_DK     = '#6C8B6B';
const BRAND_BORDER = '#E7EAE3';
const SKIN         = '#D8DDD4';  // borderStrong
const SKIN_SOFT    = 'rgba(127,158,126,0.10)';  // navySoft
const OFF_WHITE    = '#F6F8F3';  // cream
const CHARCOAL     = '#101210';  // ink
const CHARCOAL_MID = '#55584F';  // muted
const CHARCOAL_LT  = '#7A7E76';  // faint
const SAGE_TINT    = '#EDF3EC';  // sageSoft
const SAGE_WASH    = '#F3F7F1';  // sageWash
const BORDER_SOFT  = '#E7EAE3';  // border
const DISABLED_BG  = '#0A3A38';  // navyDark for disabled

// 🔧 CHANGE 1/4 — Hidden-but-functional scrollbar style
const HIDDEN_SCROLLBAR = {
  scrollbarWidth: 'none',        // Firefox
  msOverflowStyle: 'none',       // IE / old Edge
  '&::-webkit-scrollbar': {      // Chrome / Safari / new Edge
    width: 0,
    height: 0,
    display: 'none',
  },
  '&::-webkit-scrollbar-track': { background: 'transparent' },
  '&::-webkit-scrollbar-thumb': { background: 'transparent' },
};

const COMPANY_TYPES = ['FMCG', 'MNC', 'Start-up', 'Product-based', 'B2B', 'Private', 'Government', 'Others'];
const JOB_TYPES = ['Internship', 'Full-time', 'Part-time', 'Contract', 'Freelance'];
const GENDER_OPTIONS = ['Male', 'Female', 'All'];
const SHIFT_OPTIONS = ['Day', 'Midday', 'Night', 'Rotational'];
const WORK_MODE_OPTIONS = ['On-Site', 'Remote', 'Hybrid', 'Field Work', 'Flexible'];
const EDUCATION_OPTIONS = ['10th', '12th', 'Diploma', "Bachelor's", "Master's", 'PhD', 'Any'];
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

const BENEFITS = {
  Travel: ['Travel allowance', 'Company car', 'Fuel reimbursement', 'Public transport subsidy', 'Parking allowance', 'Other'],
  Health: ['Health insurance', 'Vision', 'Annual health checkup', 'Dental', 'Gym membership', 'Other'],
  Financial: ['Performance bonus', 'Life insurance', 'Salary advance', 'Stock options', 'Provident fund', 'Gratuity', 'Other'],
  'Time Off': ['Paid time off', 'Flexible hours', 'Work from home', 'Sabbatical', 'Maternity/Paternity', 'Casual leave', 'Other'],
  'Professional Support & Learning': ['Training programs', 'Conference attendance', 'Certification support', 'Skill development', 'Mentorship program', 'Career advancement', 'Other'],
};

const INITIAL_FORM = {
  companyName: '',
  companyType: '',
  companyTypeOther: '',
  assignToEmployeeId: '',
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
    languages          : Array.isArray(job.languages) ? job.languages : [],
    applicationDeadline: job.application_deadline || '',
    requirementsCovered: !!job.is_requirements_covered,
    benefits           : (job.benefits && typeof job.benefits === 'object') ? job.benefits : {},
  };
};

const wordCount = (str) => (str?.trim().split(/\s+/).filter(Boolean).length) || 0;

const FIELD_TO_TAB = {
  companyName: 0, companyType: 0, companyTypeOther: 0, assignToEmployeeId: 0, jobTitle: 0, jobLocation: 0,
  completeAddress: 0, interviewLocation: 0, jobType: 0, workMode: 0,
  skills: 1, responsibilities: 1, jobDescription: 1,
  expMin: 2, expMax: 2, salaryMin: 2, salaryMax: 2, education: 2,
  gender: 2, candidateCategory: 2, disabilityType: 2, jobShift: 2, languages: 2, applicationDeadline: 2,
};

const validateFull = (form, { requireAssignee = false } = {}) => {
  const errors = {};

  if (!form.companyName.trim()) errors.companyName = 'Company name is required';
  if (!form.companyType) errors.companyType = 'Select a company type';
  if (requireAssignee && !form.assignToEmployeeId) errors.assignToEmployeeId = 'Select an employee to assign this job to';
  if (form.companyType === 'Others' && !form.companyTypeOther.trim()) {
    errors.companyTypeOther = 'Please specify';
  }
  if (!form.jobTitle.trim()) errors.jobTitle = 'Job title is required';
  if (!form.jobLocation.trim()) errors.jobLocation = 'Location is required';
  if (!form.completeAddress.trim()) errors.completeAddress = 'Address is required';
  if (!form.interviewLocation.trim()) errors.interviewLocation = 'Interview location is required';
  if (!form.jobType) errors.jobType = 'Select a job type';
  if (!form.workMode) errors.workMode = 'Select a work mode';

  if (!form.skills.length) errors.skills = 'Add at least one skill';
  if (!form.responsibilities.length) errors.responsibilities = 'Add at least one responsibility';

  const wc = wordCount(form.jobDescription);
  if (!form.jobDescription.trim()) {
    errors.jobDescription = 'Description is required';
  } else if (wc > 5000) {
    errors.jobDescription = `Must be at most 5000 words (currently ${wc})`;
  }

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

const TabPanel = ({ value, index, children }) => (
  <Box hidden={value !== index} sx={{ pt: 2 }}>
    {value === index && children}
  </Box>
);

// 🔧 CHANGE 2/4 — Shared input styling defined BEFORE ChipInput
//   so ChipInput's internal TextField can consume it. This is the fix
//   for the blue focus color you saw on Required Skills / Roles.
const inputSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '12px',
    bgcolor: '#fff',
    '& fieldset': { borderColor: BORDER_SOFT },
    '&:hover fieldset': { borderColor: SKIN },
    '&.Mui-focused fieldset': { borderColor: BRAND, borderWidth: 2 },
  },
  '& .MuiInputLabel-root': { color: CHARCOAL_MID },
  '& .MuiInputLabel-root.Mui-focused': { color: BRAND },
  '& .MuiOutlinedInput-input': { color: CHARCOAL },
  // Nuke MUI's default blue caret and text-selection color
  '& .MuiInputBase-input': { caretColor: BRAND },
  '& .MuiInputBase-input::selection': {
    backgroundColor: `${BRAND}44`,
    color: CHARCOAL,
  },
};

// 🔧 CHANGE 3/4 — ChipInput internal TextField now uses inputSx (sage focus,
//   no more blue). Also removed old sx-less TextField so nothing defaults to
//   MUI's primary.main blue.
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
        sx={inputSx}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                size="small"
                onClick={add}
                sx={{ color: BRAND, '&:hover': { bgcolor: `${BRAND}14` } }}
              >
                <AddIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
      <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1, minWidth: 0, width: '100%' }}>
        {value.map((item) => (
          <Chip
            key={item}
            label={item}
            title={item}
            onDelete={() => remove(item)}
            size="small"
            sx={{
              maxWidth: '100%',
              height: 'auto',
              minHeight: 24,
              bgcolor: `${BRAND}14`,
              color: BRAND_DK,
              border: `1px solid ${BRAND}33`,
              fontWeight: 600,
              '& .MuiChip-label': {
                whiteSpace: 'normal',
                wordBreak: 'break-word',
                display: 'block',
                py: '4px',
                lineHeight: 1.4,
              },
              '& .MuiChip-deleteIcon': {
                color: BRAND,
                '&:hover': { color: BRAND_DK },
              },
            }}
          />
        ))}
      </Box>
    </Box>
  );
};

const BenefitsSelector = ({ value = {}, onChange }) => {
  const toggle = (category, item) => {
    const current = value[category] || [];
    const next = current.includes(item)
      ? current.filter((i) => i !== item)
      : [...current, item];
    onChange({ ...value, [category]: next });
  };

  return (
    <Stack spacing={2}>
      {Object.entries(BENEFITS).map(([category, items]) => (
        <Box key={category}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: CHARCOAL }}>
            {category}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, minWidth: 0, width: '100%' }}>
            {items.map((item) => {
              const selected = (value[category] || []).includes(item);
              return (
                <Chip
                  key={item}
                  label={item}
                  title={item}
                  onClick={() => toggle(category, item)}
                  size="small"
                  sx={{
                    maxWidth: '100%',
                    height: 'auto',
                    minHeight: 26,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    ...(selected
                      ? {
                          bgcolor: BRAND,
                          color: '#fff',
                          border: `1px solid ${BRAND}`,
                          boxShadow: `0 2px 6px ${BRAND}44`,
                          '&:hover': { bgcolor: '#0A3A38', boxShadow: `0 3px 10px ${BRAND}55` },
                        }
                      : {
                          bgcolor: '#fff',
                          color: CHARCOAL_MID,
                          border: `1px solid ${BORDER_SOFT}`,
                          '&:hover': {
                            bgcolor: SKIN_SOFT,
                            borderColor: SKIN,
                            color: CHARCOAL,
                          },
                        }),
                    '& .MuiChip-label': {
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                      display: 'block',
                      py: '4px',
                      lineHeight: 1.4,
                    },
                  }}
                />
              );
            })}
          </Box>
        </Box>
      ))}
    </Stack>
  );
};

const PostJob = ({ open, onClose, createJob, saveDraft, updateJob, editingJob, companyName = '' }) => {
  const isEdit = !!editingJob;
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [tab, setTab] = useState(0);
  const [form, setForm] = useState({
    ...INITIAL_FORM,
    companyName: companyName || INITIAL_FORM.companyName,
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    if (open) {
      if (editingJob) {
        setForm(mapBackendToForm(editingJob, companyName));
      } else {
        setForm({ ...INITIAL_FORM, companyName: companyName || INITIAL_FORM.companyName });
      }
      setErrors({});
      setServerError('');
    }
  }, [open, editingJob, companyName]);

  // Load this company's employees so the admin can assign an owner at post time.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    adminService.getEmployers()
      .then((res) => {
        const list = res?.data?.results ?? res?.data?.employers ?? res?.data?.Employers ?? [];
        if (!cancelled) setEmployees(Array.isArray(list) ? list : []);
      })
      .catch(() => { if (!cancelled) setEmployees([]); });
    return () => { cancelled = true; };
  }, [open]);

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

  const handlePost = async () => {
    setServerError('');
    const errs = validateFull(form, { requireAssignee: !isEdit });
    setErrors(errs);
    if (Object.keys(errs).length) {
      jumpToFirstError(errs);
      return;
    }
    setSubmitting(true);
    try {
      if (isEdit) {
        const jobId = editingJob.job_id ?? editingJob.id;
        await updateJob(jobId, form);
      } else {
        const payload = form.assignToEmployeeId
          ? { ...form, employer_id: Number(form.assignToEmployeeId) }
          : form;
        await createJob(payload);
      }
      handleClose();
    } catch (err) {
      setServerError(err.friendlyMessage || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    setServerError('');
    const errs = validateFull(form, { requireAssignee: !isEdit });
    setErrors(errs);
    if (Object.keys(errs).length) {
      jumpToFirstError(errs);
      return;
    }
    setSubmitting(true);
    try {
      const payload = form.assignToEmployeeId
        ? { ...form, employer_id: Number(form.assignToEmployeeId) }
        : form;
      await saveDraft(payload);
      handleClose();
    } catch (err) {
      setServerError(err.friendlyMessage || 'Something went wrong. Please try again.');
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

  const TabLabel = ({ label, count }) => (
    <Badge
      badgeContent={count}
      invisible={!count}
      sx={{
        '& .MuiBadge-badge': {
          bgcolor: '#B4462F',
          color: '#fff',
          fontWeight: 700,
        },
      }}
    >
      <Box component="span" sx={{ px: 1 }}>{label}</Box>
    </Badge>
  );

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      fullScreen={fullScreen}
      PaperProps={{ sx: {
        minHeight: fullScreen ? '100%' : '80vh',
        maxHeight: fullScreen ? '100%' : '90vh',
        borderRadius: fullScreen ? 0 : '16px',
        overflow: 'hidden',
        bgcolor: OFF_WHITE,
        boxShadow: '0 20px 60px rgba(2,33,36,0.18)',
      } }}
    >
      {/* Pine header */}
      <Box sx={{
        background: 'linear-gradient(160deg, #08302F 0%, #0E1E1D 70%, #121615 100%)',
        px: { xs: 2, sm: 3 }, py: { xs: 2, sm: 2.25 },
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1.5,
        position: 'relative', zIndex: 1, overflow: 'hidden',
      }}>
        <Box sx={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', bgcolor: 'rgba(127,158,126,0.06)', pointerEvents: 'none' }} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0, position: 'relative' }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '13px', flex: 'none',
            bgcolor: 'rgba(127,158,126,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {isEdit
              ? <EditIcon sx={{ color: BRAND, fontSize: 24 }} />
              : <AddIcon sx={{ color: BRAND, fontSize: 24 }} />}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700, color: 'rgba(255,255,255,0.97)', lineHeight: 1.2, fontSize: { xs: '1.05rem', sm: '1.2rem' } }}>
              {isEdit ? 'Edit Job' : 'Post a New Job'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.55)' }}>
              {isEdit ? 'Update this posting’s details.' : 'Fill in the details across the tabs below.'}
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={handleClose} aria-label="Close dialog"
          sx={{ flex: 'none', color: 'rgba(255,255,255,0.85)', '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.22)' } }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant={fullScreen ? 'scrollable' : 'fullWidth'}
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{
          borderBottom: `1px solid ${BORDER_SOFT}`,
          bgcolor: '#fff',
          minHeight: 48,
          '& .MuiTab-root': {
            textTransform: 'none',
            fontWeight: 600,
            minHeight: 48,
            color: CHARCOAL_LT,
            transition: 'color 0.2s ease, background-color 0.2s ease',
            '&:hover': { color: BRAND_DK, bgcolor: SAGE_WASH },
          },
          '& .Mui-selected': { color: '#022124 !important' },
          '& .MuiTabs-indicator': { backgroundColor: '#022124', height: 3, borderRadius: '3px 3px 0 0' },
        }}
      >
        <Tab label={<TabLabel label="Basics" count={tabErrorCount[0]} />} />
        <Tab label={<TabLabel label="Job Details" count={tabErrorCount[1]} />} />
        <Tab label={<TabLabel label="Requirements" count={tabErrorCount[2]} />} />
        <Tab label={<TabLabel label="Benefits" count={tabErrorCount[3]} />} />
      </Tabs>

      {/* 🔧 CHANGE 4/4 — DialogContent scroll still works, scrollbar hidden */}
      <DialogContent
        sx={{
          px: { xs: 2, sm: 3 },
          py: 2,
          overflowY: 'auto',
          overflowX: 'hidden',
          bgcolor: OFF_WHITE,
          ...HIDDEN_SCROLLBAR,
          '& .MuiFormHelperText-root:not(.Mui-error)': { color: HELPER_DARK },
          '& .MuiFormHelperText-root.Mui-error': { color: '#B4462F' },
        }}
      >
        {serverError && (
          <Alert
            severity="error"
            sx={{
              mb: 2,
              borderRadius: '12px',
              bgcolor: '#FBECEA',
              color: '#B4462F',
              border: '1px solid rgba(180,70,47,0.2)',
              '& .MuiAlert-icon': { color: '#B4462F' },
            }}
            onClose={() => setServerError('')}
          >
            {serverError}
          </Alert>
        )}

        {/* ═══════════════ TAB 0 — BASICS ═══════════════ */}
        <TabPanel value={tab} index={0}>
          <Stack spacing={2}>
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
              InputProps={{ readOnly: !!companyName }}
              sx={inputSx}
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
              sx={inputSx}
              SelectProps={{
                MenuProps: {
                  slotProps: {
                    paper: {
                      sx: {
                        ...HIDDEN_SCROLLBAR,
                        borderRadius: '12px',
                        boxShadow: '0 8px 24px rgba(2,33,36,0.12)',
                        mt: 0.5,
                        '& .MuiMenuItem-root': {
                          '&:hover': { bgcolor: SAGE_WASH },
                          '&.Mui-selected': { bgcolor: `${BRAND}22`, color: CHARCOAL },
                          '&.Mui-selected:hover': { bgcolor: `${BRAND}33` },
                        },
                      },
                    },
                  },
                },
              }}
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
                sx={inputSx}
              />
            )}

            {!isEdit && (
              <TextField
                select
                label="Assign to employee *"
                value={form.assignToEmployeeId}
                onChange={update('assignToEmployeeId')}
                fullWidth
                size="small"
                error={!!errors.assignToEmployeeId}
                helperText={errors.assignToEmployeeId || 'The selected employee becomes the job owner.'}
                sx={inputSx}
              >
                {employees
                  .filter((emp) => (emp.status || 'ACTIVE') === 'ACTIVE' && emp.role !== 'Company Admin')
                  .map((emp) => (
                    <MenuItem key={emp.id} value={emp.id}>
                      {(emp.full_name || emp.name || emp.email)}{emp.role ? ` — ${emp.role}` : ''}
                    </MenuItem>
                  ))}
              </TextField>
            )}

            <TextField
              label="Job Title *"
              value={form.jobTitle}
              onChange={update('jobTitle')}
              fullWidth
              size="small"
              error={!!errors.jobTitle}
              helperText={errors.jobTitle}
              sx={inputSx}
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
              sx={inputSx}
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
              sx={inputSx}
            />

            <TextField
              label="Preferred Interview Location *"
              value={form.interviewLocation}
              onChange={update('interviewLocation')}
              fullWidth
              size="small"
              error={!!errors.interviewLocation}
              helperText={errors.interviewLocation}
              sx={inputSx}
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
              sx={inputSx}
              SelectProps={{
                MenuProps: {
                  slotProps: {
                    paper: {
                      sx: {
                        ...HIDDEN_SCROLLBAR,
                        borderRadius: '12px',
                        boxShadow: '0 8px 24px rgba(2,33,36,0.12)',
                        mt: 0.5,
                        '& .MuiMenuItem-root': {
                          '&:hover': { bgcolor: SAGE_WASH },
                          '&.Mui-selected': { bgcolor: `${BRAND}22`, color: CHARCOAL },
                          '&.Mui-selected:hover': { bgcolor: `${BRAND}33` },
                        },
                      },
                    },
                  },
                },
              }}
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
              sx={inputSx}
              SelectProps={{
                MenuProps: {
                  slotProps: {
                    paper: {
                      sx: {
                        ...HIDDEN_SCROLLBAR,
                        borderRadius: '12px',
                        boxShadow: '0 8px 24px rgba(2,33,36,0.12)',
                        mt: 0.5,
                        '& .MuiMenuItem-root': {
                          '&:hover': { bgcolor: SAGE_WASH },
                          '&.Mui-selected': { bgcolor: `${BRAND}22`, color: CHARCOAL },
                          '&.Mui-selected:hover': { bgcolor: `${BRAND}33` },
                        },
                      },
                    },
                  },
                },
              }}
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
              inputProps={{ min: 1, step: 1 }}
              error={!!errors.openings}
              helperText={errors.openings || 'How many candidates do you want to hire for this role'}
              sx={inputSx}
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
              sx={{
                ...inputSx,
                // hide scrollbar inside the multiline textarea too
                '& .MuiInputBase-inputMultiline': HIDDEN_SCROLLBAR,
              }}
            />

            <TextField
              label="Industry Preference"
              placeholder="e.g. Fintech, Healthcare"
              value={form.industryPreference}
              onChange={update('industryPreference')}
              fullWidth
              size="small"
              sx={inputSx}
            />
          </Stack>
        </TabPanel>

        {/* ═══════════════ TAB 2 — REQUIREMENTS ═══════════════ */}
        <TabPanel value={tab} index={2}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: CHARCOAL }}>
                Work Experience (years)
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Min *"
                  type="number"
                  value={form.expMin}
                  onChange={update('expMin')}
                  fullWidth
                  size="small"
                  inputProps={{ min: 0 }}
                  error={!!errors.expMin}
                  helperText={errors.expMin}
                  sx={inputSx}
                />
                <TextField
                  label="Max *"
                  type="number"
                  value={form.expMax}
                  onChange={update('expMax')}
                  fullWidth
                  size="small"
                  inputProps={{ min: 0 }}
                  error={!!errors.expMax}
                  helperText={errors.expMax}
                  sx={inputSx}
                />
              </Stack>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: CHARCOAL }}>
                Salary per Annum (₹)
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Min *"
                  type="number"
                  value={form.salaryMin}
                  onChange={update('salaryMin')}
                  fullWidth
                  size="small"
                  inputProps={{ min: 0 }}
                  error={!!errors.salaryMin}
                  helperText={errors.salaryMin}
                  sx={inputSx}
                />
                <TextField
                  label="Max *"
                  type="number"
                  value={form.salaryMax}
                  onChange={update('salaryMax')}
                  fullWidth
                  size="small"
                  inputProps={{ min: 0 }}
                  error={!!errors.salaryMax}
                  helperText={errors.salaryMax}
                  sx={inputSx}
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
              sx={inputSx}
              SelectProps={{
                MenuProps: {
                  slotProps: {
                    paper: {
                      sx: {
                        ...HIDDEN_SCROLLBAR,
                        borderRadius: '12px',
                        boxShadow: '0 8px 24px rgba(2,33,36,0.12)',
                        mt: 0.5,
                        '& .MuiMenuItem-root': {
                          '&:hover': { bgcolor: SAGE_WASH },
                          '&.Mui-selected': { bgcolor: `${BRAND}22`, color: CHARCOAL },
                          '&.Mui-selected:hover': { bgcolor: `${BRAND}33` },
                        },
                      },
                    },
                  },
                },
              }}
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
              sx={inputSx}
              SelectProps={{
                MenuProps: {
                  slotProps: {
                    paper: {
                      sx: {
                        ...HIDDEN_SCROLLBAR,
                        borderRadius: '12px',
                        boxShadow: '0 8px 24px rgba(2,33,36,0.12)',
                        mt: 0.5,
                        '& .MuiMenuItem-root': {
                          '&:hover': { bgcolor: SAGE_WASH },
                          '&.Mui-selected': { bgcolor: `${BRAND}22`, color: CHARCOAL },
                          '&.Mui-selected:hover': { bgcolor: `${BRAND}33` },
                        },
                      },
                    },
                  },
                },
              }}
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
                sx={inputSx}
              />
            )}

            <Divider sx={{ borderColor: BORDER_SOFT }} />

            <TextField
              select
              label="Job Shift *"
              value={form.jobShift}
              onChange={update('jobShift')}
              fullWidth
              size="small"
              error={!!errors.jobShift}
              helperText={errors.jobShift}
              sx={inputSx}
              SelectProps={{
                MenuProps: {
                  slotProps: {
                    paper: {
                      sx: {
                        ...HIDDEN_SCROLLBAR,
                        borderRadius: '12px',
                        boxShadow: '0 8px 24px rgba(2,33,36,0.12)',
                        mt: 0.5,
                        '& .MuiMenuItem-root': {
                          '&:hover': { bgcolor: SAGE_WASH },
                          '&.Mui-selected': { bgcolor: `${BRAND}22`, color: CHARCOAL },
                          '&.Mui-selected:hover': { bgcolor: `${BRAND}33` },
                        },
                      },
                    },
                  },
                },
              }}
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
              ChipProps={{
                sx: {
                  bgcolor: `${BRAND}14`,
                  color: BRAND_DK,
                  border: `1px solid ${BRAND}33`,
                  fontWeight: 600,
                  '& .MuiChip-deleteIcon': {
                    color: BRAND,
                    '&:hover': { color: BRAND_DK },
                  },
                },
              }}
              slotProps={{
                paper: {
                  sx: {
                    ...HIDDEN_SCROLLBAR,
                    borderRadius: '12px',
                    boxShadow: '0 8px 24px rgba(2,33,36,0.12)',
                  },
                },
                listbox: {
                  sx: {
                    ...HIDDEN_SCROLLBAR,
                    '& .MuiAutocomplete-option': {
                      '&:hover': { bgcolor: SAGE_WASH },
                      '&[aria-selected="true"]': { bgcolor: `${BRAND}22` },
                      '&[aria-selected="true"].Mui-focused': { bgcolor: `${BRAND}33` },
                    },
                  },
                },
              }}
              renderOption={(props, option, { selected }) => (
                <li {...props}>
                  <Checkbox
                    checked={selected}
                    size="small"
                    sx={{
                      mr: 1,
                      color: CHARCOAL_LT,
                      '&.Mui-checked': { color: BRAND },
                    }}
                  />
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
                  sx={inputSx}
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
              InputLabelProps={{ shrink: true }}
              slotProps={{
                inputLabel: { shrink: true },
                htmlInput: { min: new Date().toISOString().split('T')[0] },
              }}
              error={!!errors.applicationDeadline}
              helperText={errors.applicationDeadline}
              sx={inputSx}
            />

          </Stack>
        </TabPanel>

        {/* ═══════════════ TAB 3 — BENEFITS ═══════════════ */}
        <TabPanel value={tab} index={3}>
          <Typography variant="body2" sx={{ mb: 2, color: HELPER_DARK }}>
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
          px: { xs: 2, sm: 3 },
          py: 2,
          borderTop: `1px solid ${BORDER_SOFT}`,
          gap: 1,
          flexDirection: { xs: 'column-reverse', sm: 'row' },
          alignItems: 'stretch',
          justifyContent: 'space-between',
          bgcolor: OFF_WHITE,
          boxShadow: 'none',
        }}
      >
        <Button
          onClick={handleClose}
          disabled={submitting}
          sx={{
            textTransform: 'none', fontWeight: 600, borderRadius: '8px',
            color: CHARCOAL_MID,
            width: { xs: '100%', sm: 'auto' },
            border: `1px solid ${BORDER_SOFT}`,
            px: 2.5,
            '&:hover': { bgcolor: SKIN_SOFT, borderColor: BRAND_BORDER, color: '#022124' },
          }}
        >
          Cancel
        </Button>
        <Stack
          direction="row"
          spacing={1}
          sx={{
            width: { xs: '100%', sm: 'auto' },
            flexWrap: 'wrap',
            justifyContent: { xs: 'stretch', sm: 'flex-end' },
            '& > *': { flex: { xs: '1 1 auto', sm: '0 0 auto' }, minWidth: 88 },
          }}
        >
          {tab > 0 && (
            <Button
              onClick={() => setTab(tab - 1)}
              disabled={submitting}
              sx={{
                textTransform: 'none', fontWeight: 600, borderRadius: '8px',
                color: CHARCOAL_MID,
                '&:hover': { bgcolor: SAGE_WASH, color: BRAND_DK },
              }}
            >
              Back
            </Button>
          )}
          {tab < 3 && (
            <Button
              variant="outlined"
              onClick={() => setTab(tab + 1)}
              disabled={submitting}
              sx={{
                textTransform: 'none', fontWeight: 600, borderRadius: '12px',
                borderColor: BRAND_BORDER, color: BRAND,
                '&:hover': { borderColor: BRAND, bgcolor: SAGE_WASH, color: BRAND_DK },
              }}
            >
              Next
            </Button>
          )}
          {!isEdit && (
            <Button
              onClick={handleSaveDraft}
              disabled={submitting}
              sx={{
                textTransform: 'none', fontWeight: 600, borderRadius: '8px',
                color: CHARCOAL_MID,
                '&:hover': { bgcolor: SAGE_WASH, color: BRAND_DK },
              }}
            >
              {submitting ? 'Saving…' : 'Save Draft'}
            </Button>
          )}
          <Button
            variant="contained"
            onClick={handlePost}
            disabled={submitting}
            sx={{
              textTransform: 'none', fontWeight: 700, borderRadius: '12px', px: 3,
              bgcolor: '#022124', color: '#fff',
              boxShadow: `0 2px 6px ${BRAND}30, 0 4px 14px ${BRAND}44`,
              transition: 'box-shadow .2s ease, background-color .2s ease, transform .2s ease',
              '&:hover': {
                bgcolor: '#0A3A38',
                boxShadow: `0 4px 10px ${BRAND}40, 0 8px 22px ${BRAND}55`,
                transform: 'translateY(-1px)',
              },
              '&:disabled': { bgcolor: DISABLED_BG, color: '#fff', boxShadow: 'none' },
            }}
          >
            {submitting
              ? (isEdit ? 'Saving…' : 'Posting…')
              : (isEdit ? 'Save Changes' : 'Post Job')}
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
};

export default PostJob;