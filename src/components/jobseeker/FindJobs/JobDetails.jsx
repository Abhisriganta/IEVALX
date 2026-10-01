import { useEffect, useState, useRef } from 'react';
import {
  Box, Card, CardContent, Typography, Chip, Button,
  Grid, IconButton, List, ListItem,
  ListItemText, ListItemIcon, Dialog, DialogTitle,
  DialogContent, DialogActions, Alert,
  CircularProgress, Skeleton, Stack, Tooltip,
  Snackbar,
} from '@mui/material';
import {
  Business, Person, Email, Phone, School, Language,
  CheckCircle, ArrowBack, CloudUpload,
  Close as CloseIcon,
  Description as DescriptionIcon, UploadFile as UploadFileIcon,
  CheckCircleOutlined, Visibility,
  WorkOutlineRounded, AccessTimeOutlined, TrendingUpRounded,
  ArrowForwardRounded, VerifiedRounded, LocationOnOutlined,
  WorkHistoryOutlined, CardGiftcardOutlined,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useJobs } from '@/hooks/jobseeker/useJobs';
import { useAuth } from '@/hooks/useAuth';
import jobseekerService from '@/services/api/jobseeker/jobseekerService';
import jobService from '@/services/api/jobseeker/jobService';


const extractApiError = (err) => {
  const data = err?.response?.data;
  if (!data) return err?.message || '';
  if (typeof data === 'string') return data;
  const direct = data.Error || data.error || data.message || data.detail || data.Message;
  if (direct) return String(direct);
  // Field-error map → "field: first error"
  const firstKey = Object.keys(data)[0];
  if (firstKey) {
    const v = data[firstKey];
    const msg = Array.isArray(v) ? v[0] : v;
    if (msg) return `${firstKey}: ${msg}`;
  }
  return err?.message || '';
};

/* ───────────────────────────────────────────────────────────────────────────
   Brand tokens — consistent with FindJobs / JobseekerDashboard
─────────────────────────────────────────────────────────────────────────── */
const FONT = "'Jost','DM Sans',sans-serif";

/* Landing-page palette — pine authority on cream */
const BRAND = {
  navy:        '#022124',                  // pine — primary
  navyDark:    '#0A3A38',                  // pine hover
  navySoft:    '#EDF3EC',                  // sageSoft surfaces
  navyTint:    'rgba(127,158,126,0.08)',   // sage wash
  sage:        '#7F9E7E',
  sageText:    '#5E815D',
  ink:         '#101210',
  body:        '#2F332E',
  muted:       '#55584F',
  border:      '#E7EAE3',
  divider:     '#F0F2ED',
  surface:     '#FFFFFF',
  bg:          '#F6F8F3',
  success:     '#3E6E3E',
  successSoft: '#EAF2E9',
  danger:      '#A32D2D',
  dangerSoft:  '#FCEBEB',
};

const CARD_SX = {
  bgcolor:      BRAND.surface,
  border:       `1px solid ${BRAND.border}`,
  borderRadius: '12px',
  boxShadow:    'none',
};

/* Compact metric cell — used inside the hero info strip */
const HeroMetric = ({ label, value, danger, last }) => (
  <Box sx={{
    flex: 1,
    px: { xs: 2, md: 2.5 },
    py: 0.25,
    borderRight: last ? 'none' : `1px solid ${BRAND.border}`,
    minWidth: 0,
  }}>
    <Typography sx={{
      fontSize: '0.68rem',
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: BRAND.muted,
      fontWeight: 600,
      mb: 0.5,
      fontFamily: FONT,
    }}>
      {label}
    </Typography>
    <Typography sx={{
      fontSize: { xs: '0.95rem', md: '1.05rem' },
      fontWeight: 700,
      color: danger ? BRAND.danger : BRAND.ink,
      letterSpacing: '-0.01em',
      lineHeight: 1.2,
      fontFamily: FONT,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    }}>
      {value}
    </Typography>
  </Box>
);

/* Section heading with navy accent bar */
const SectionHeading = ({ title, icon }) => (
  <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 2 }}>
    <Box sx={{ width: 4, height: 18, bgcolor: BRAND.navy, borderRadius: 1 }} />
    {icon && (
      <Box sx={{
        width: 28, height: 28, borderRadius: 1,
        bgcolor: BRAND.navySoft, color: BRAND.navy,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {icon}
      </Box>
    )}
    <Typography sx={{
      fontSize: '1rem', fontWeight: 700, color: BRAND.ink,
      letterSpacing: '-0.01em', fontFamily: FONT,
    }}>
      {title}
    </Typography>
  </Stack>
);

/* ══════════════════════════════════════════════════════════════════
   APPLY DIALOG — UNCHANGED (your existing logic preserved verbatim)
═══════════════════════════════════════════════════════════════════ */
const ApplyDialog = ({
  open, onClose, jobId, jobTitle, companyName,
  existingResumeName = '', existingResumeViewUrl = '', onApplied,
}) => {
  const [resumeChoice, setResumeChoice]         = useState(null);
  const [resume, setResume]                     = useState(null);
  const [resumeName, setResumeName]             = useState('');
  const [resumePreviewUrl, setResumePreviewUrl] = useState('');
  const [submitting, setSubmitting]             = useState(false);
  const [submitError, setSubmitError]           = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setResumeChoice(null); setResume(null); setResumeName('');
      if (resumePreviewUrl) URL.revokeObjectURL(resumePreviewUrl);
      setResumePreviewUrl(''); setSubmitting(false); setSubmitError('');
    }
  }, [open]);

  const handleClose = () => {
    setResumeChoice(null); setResume(null); setResumeName('');
    if (resumePreviewUrl) URL.revokeObjectURL(resumePreviewUrl);
    setResumePreviewUrl(''); setSubmitting(false); setSubmitError('');
    onClose();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setSubmitError('Only PDF resumes are accepted. Please upload a .pdf file.');
        e.target.value = ''; return;
      }
      if (resumePreviewUrl) URL.revokeObjectURL(resumePreviewUrl);
      const blobUrl = URL.createObjectURL(file);
      setResumeChoice('new'); setResume(file); setResumeName(file.name);
      setResumePreviewUrl(blobUrl);
    }
    e.target.value = '';
  };

  const handleSelectExisting = () => {
    setResumeChoice('existing'); setResume('EXISTING');
    setResumeName(existingResumeName || 'Profile Resume');
  };

  const handleRemoveFile = (e) => {
    e.stopPropagation();
    if (resumePreviewUrl) URL.revokeObjectURL(resumePreviewUrl);
    setResume(null); setResumeName(''); setResumePreviewUrl('');
  };

  const canSubmit = resumeChoice === 'existing' || (resumeChoice === 'new' && resume instanceof File);

  const handleSubmit = async () => {
    if (!canSubmit || !jobId) {
      if (!jobId) setSubmitError('Missing job reference. Please reopen the page and try again.');
      return;
    }
    setSubmitting(true); setSubmitError('');
    try {
      const res = await jobseekerService.applyForJob({
        jobId, resumeMode: resumeChoice,
        resumeFile: resumeChoice === 'new' ? resume : null,
      });
      if (process.env.NODE_ENV === 'development') {
        console.log('[ApplyDialog] Application created:', res?.data);
      }
      // Record locally so "My Applications" reflects it immediately & after reloads.
      try {
        const d = res?.data || {};
        jobService.recordLocalApplication({
          applicationId: d.Application_Id ?? d.application_id,
          jobId: jobId ?? d.Job_Post_Id ?? d.job_post_id,
          jobTitle,
          companyName,
          status: d.Application_Status ?? d.application_status ?? 'APPLIED',
        });
      } catch (recErr) {
        console.warn('Could not record application locally:', recErr);
      }
      handleClose();
      if (typeof onApplied === 'function') onApplied(res?.data);
    } catch (err) {
      console.error('[ApplyDialog] apply failed:', err?.response?.status, err?.response?.data);
      const errMsg = extractApiError(err) || '';
      const isAlreadyApplied = err?.response?.status === 400
        && /already\s*(applied|submitted|exists)/i.test(errMsg);

      if (isAlreadyApplied) {
        // The backend confirmed the application exists — record it and treat as success.
        try {
          jobService.recordLocalApplication({
            jobId,
            jobTitle,
            companyName,
            status: 'APPLIED',
          });
        } catch { /* non-fatal */ }
        handleClose();
        if (typeof onApplied === 'function') onApplied({ alreadyApplied: true });
      } else {
        setSubmitError(errMsg || 'Submission failed. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const hasExistingResume = Boolean(existingResumeName);
  const existingSelected  = resumeChoice === 'existing';
  const newSelected       = resumeChoice === 'new';
  const fileReady         = newSelected && resume instanceof File;

  return (
    <Dialog open={open} onClose={submitting ? undefined : handleClose} maxWidth="md" fullWidth
      slotProps={{ paper: { sx: { borderRadius: 2.5 } } }}>
      <DialogTitle sx={{
        bgcolor: '#022124', color: 'white',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        py: 2, px: 3,
      }}>
        <Box>
          <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.3 }}>Apply for {jobTitle}</Typography>
          <Typography variant="caption" sx={{ opacity: 0.75 }}>{companyName}</Typography>
        </Box>
        <IconButton onClick={handleClose} disabled={submitting} sx={{ color: 'white', mt: -0.5 }} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 4, py: 3.5 }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#022124', mb: 0.5 }}>
              How would you like to apply?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Choose whether to use your saved resume or upload a new one for this application.
            </Typography>
          </Box>

          {submitError && (
            <Alert severity="error" onClose={() => setSubmitError('')} sx={{ borderRadius: 1.5 }}>
              {submitError}
            </Alert>
          )}

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="stretch">
            <Box onClick={() => hasExistingResume && handleSelectExisting()}
              sx={{
                flex: 1, borderRadius: 2.5, border: '2px solid',
                borderColor: existingSelected ? '#022124' : hasExistingResume ? 'divider' : '#E7EAE3',
                bgcolor: existingSelected ? '#EDF3EC' : hasExistingResume ? '#F6F8F3' : '#F6F8F3',
                opacity: hasExistingResume ? 1 : 0.5,
                cursor: hasExistingResume ? 'pointer' : 'not-allowed',
                boxShadow: existingSelected ? '0 0 0 3px rgba(30,51,88,0.12)' : 'none',
                transition: 'all 0.2s ease',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                textAlign: 'center', gap: 1.5, p: 3, userSelect: 'none',
                '&:hover': hasExistingResume ? { borderColor: '#022124', bgcolor: '#EDF3EC' } : {},
              }}
            >
              <Box sx={{ position: 'relative' }}>
                <Box sx={{
                  width: 64, height: 64, borderRadius: '50%',
                  bgcolor: existingSelected ? '#022124' : '#E3EDE2',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s',
                }}>
                  <DescriptionIcon sx={{ fontSize: 30, color: existingSelected ? 'white' : '#022124' }} />
                </Box>
                {existingSelected && (
                  <CheckCircleOutlined sx={{
                    position: 'absolute', bottom: -4, right: -4,
                    fontSize: 22, color: '#022124', bgcolor: 'white', borderRadius: '50%',
                  }} />
                )}
              </Box>

              <Typography variant="body1" fontWeight={700} sx={{ color: '#022124' }}>
                Use Profile Resume
              </Typography>

              {hasExistingResume ? (
                <Box sx={{
                  px: 2, py: 1.25, borderRadius: 1.5, width: '100%',
                  bgcolor: existingSelected ? 'white' : '#E3EDE2',
                  border: '1px solid',
                  borderColor: existingSelected ? 'rgba(127,158,126,0.45)' : 'transparent',
                }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
                    Saved resume
                  </Typography>
                  <Typography variant="body2" fontWeight={600}
                    sx={{ color: '#022124', wordBreak: 'break-all', lineHeight: 1.5, mb: existingResumeViewUrl ? 1 : 0 }}>
                    {existingResumeName}
                  </Typography>
                  {existingResumeViewUrl && (
                    <Button size="small" variant="outlined"
                      startIcon={<Visibility sx={{ fontSize: '0.9rem !important' }} />}
                      onClick={(e) => { e.stopPropagation(); window.open(existingResumeViewUrl, '_blank'); }}
                      sx={{
                        textTransform: 'none', fontWeight: 600, fontSize: '0.72rem',
                        px: 1.25, py: 0.4, borderRadius: 1.5,
                        borderColor: '#022124', color: '#022124', bgcolor: 'white',
                        '&:hover': { bgcolor: '#EDF3EC', borderColor: '#022124' },
                      }}
                    >
                      View Resume
                    </Button>
                  )}
                </Box>
              ) : (
                <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>
                  No resume saved in your profile yet
                </Typography>
              )}

              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                We'll use the resume already saved in your profile — quick and effortless.
              </Typography>
            </Box>

            <Box sx={{
              flex: 1, borderRadius: 2.5, border: '2px solid',
              borderColor: newSelected ? (fileReady ? 'success.main' : '#022124') : 'divider',
              bgcolor: newSelected ? (fileReady ? '#EAF2E9' : '#EDF3EC') : '#F6F8F3',
              boxShadow: newSelected ? '0 0 0 3px rgba(30,51,88,0.12)' : 'none',
              transition: 'all 0.2s ease',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}>
              <Box onClick={() => setResumeChoice('new')}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5,
                  px: 2.5, pt: 2.5, pb: 1.5, cursor: 'pointer', userSelect: 'none',
                }}
              >
                <Box sx={{ position: 'relative', flexShrink: 0 }}>
                  <Box sx={{
                    width: 48, height: 48, borderRadius: '50%',
                    bgcolor: newSelected ? (fileReady ? 'success.main' : '#022124') : '#E3EDE2',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s',
                  }}>
                    <UploadFileIcon sx={{ fontSize: 24, color: newSelected ? 'white' : '#022124' }} />
                  </Box>
                  {fileReady && (
                    <CheckCircleOutlined sx={{
                      position: 'absolute', bottom: -3, right: -3,
                      fontSize: 18, color: 'success.main', bgcolor: 'white', borderRadius: '50%',
                    }} />
                  )}
                </Box>
                <Box>
                  <Typography variant="body1" fontWeight={700} sx={{ color: '#022124' }}>
                    Upload New Resume
                  </Typography>
                  <Typography variant="caption" color="text.secondary">PDF only — max 5 MB</Typography>
                </Box>
              </Box>

              <Box sx={{ px: 2.5, pb: 2.5 }}>
                {fileReady ? (
                  <Box sx={{
                    border: '2px dashed', borderColor: 'success.main',
                    borderRadius: 2, bgcolor: '#EAF2E9', px: 2, py: 1.5,
                    display: 'flex', alignItems: 'center', gap: 1.5,
                  }}>
                    <CheckCircleOutlined sx={{ color: 'success.main', fontSize: 28, flexShrink: 0 }} />
                    <Typography variant="body2" fontWeight={600}
                      sx={{
                        flex: 1, color: 'success.dark',
                        overflow: 'hidden', textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap', minWidth: 0,
                      }}>
                      {resumeName}
                    </Typography>
                    <Button size="small" variant="outlined"
                      startIcon={<Visibility sx={{ fontSize: '0.85rem !important' }} />}
                      onClick={(e) => { e.stopPropagation(); window.open(resumePreviewUrl, '_blank'); }}
                      sx={{
                        textTransform: 'none', fontWeight: 600, fontSize: '0.72rem',
                        px: 1.25, py: 0.35, borderRadius: 1.5, flexShrink: 0,
                        borderColor: 'success.main', color: 'success.dark', bgcolor: 'white',
                        '&:hover': { bgcolor: '#DFEDDE', borderColor: 'success.dark' },
                      }}
                    >
                      View
                    </Button>
                    <Tooltip title="Remove file" placement="top">
                      <IconButton size="small" onClick={handleRemoveFile}
                        sx={{
                          flexShrink: 0, color: 'error.main', bgcolor: '#FEF2F2',
                          border: '1px solid', borderColor: '#FECACA',
                          width: 28, height: 28,
                          '&:hover': { bgcolor: '#FEE2E2', borderColor: 'error.main' },
                        }}
                      >
                        <CloseIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                ) : (
                  <Box onClick={() => { setResumeChoice('new'); fileInputRef.current?.click(); }}
                    sx={{
                      border: '2px dashed #D8DDD4', borderRadius: 2,
                      p: 2.5, textAlign: 'center', cursor: 'pointer', bgcolor: 'white',
                      transition: 'all 0.2s ease',
                      '&:hover': { borderColor: '#022124', bgcolor: '#EDF3EC' },
                    }}
                  >
                    <CloudUpload sx={{ fontSize: 32, color: '#7A7E76', mb: 0.75 }} />
                    <Typography variant="body2" fontWeight={600} sx={{ color: '#022124' }}>
                      Click to browse file
                    </Typography>
                    <Typography variant="caption" color="text.disabled">
                      or drag &amp; drop your resume here
                    </Typography>
                  </Box>
                )}
                <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" hidden onChange={handleFileChange} />
              </Box>
            </Box>
          </Stack>

          {(!resumeChoice || (newSelected && !(resume instanceof File))) && (
            <Typography variant="caption" color="text.disabled" sx={{ textAlign: 'center', display: 'block' }}>
              {!resumeChoice ? 'Select an option above to continue' : 'Please upload a resume file to submit'}
            </Typography>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{
        px: 4, py: 2, borderTop: '1px solid', borderColor: 'divider',
        justifyContent: 'space-between',
      }}>
        <Button onClick={handleClose} disabled={submitting}
          sx={{ textTransform: 'none', color: 'text.secondary' }}>Cancel</Button>
        <Button variant="contained" disabled={!canSubmit || submitting} onClick={handleSubmit}
          sx={{
            textTransform: 'none', fontWeight: 700, minWidth: 200, py: 1.25,
            bgcolor: '#022124', '&:hover': { bgcolor: '#0A3A38' },
            '&.Mui-disabled': { bgcolor: '#7A7E76', color: 'white' },
          }}
        >
          {submitting
            ? <><CircularProgress size={16} color="inherit" sx={{ mr: 1 }} />Submitting…</>
            : 'Submit Application'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

/* ══════════════════════════════════════════════════════════════════
   JOB DETAILS — Variant 1 (Dense Corporate Strip) redesign
═══════════════════════════════════════════════════════════════════ */
const JobDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedJob, loading, error, fetchJobDetails, calculateSkillMatch } = useJobs();

  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [loadError, setLoadError]             = useState(null);
  const [profileResume, setProfileResume]     = useState({ name: '', viewUrl: '' });
  const [applySuccess, setApplySuccess]       = useState(false);
  const [appliedLabel, setAppliedLabel]       = useState(null); // null = not applied
  const [logoErrored, setLogoErrored]         = useState(false);
  useEffect(() => {
    const fetchProfileResume = async () => {
      const candidateId = user?.id;
      if (!candidateId) return;
      try {
        const res     = await jobseekerService.getResumeInfo(candidateId);
        const data    = res.data?._normalized || {};
        const name    = data.filename || '';
        const viewUrl = name ? jobseekerService.resumeViewUrl(candidateId) : '';
        setProfileResume({ name, viewUrl });
      } catch (_err) { /* No resume — safe to ignore */ }
    };
    fetchProfileResume();
  }, []);

  useEffect(() => {
    const loadJobDetails = async () => {
      if (id) {
        try {
          await fetchJobDetails(id);
          setLoadError(null);
          // Check if this job has already been applied to.
          const label = jobService.getAppliedLabel(id);
          if (label) setAppliedLabel(label);
        } catch (err) {
          console.error('Failed to load job details:', err);
          setLoadError('Failed to load job details. Please try again.');
        }
      }
    };
    loadJobDetails();
  }, [id]);

  const formatPostedDate = (createdAt) => {
    if (!createdAt) return '';
    try {
      const posted   = new Date(createdAt);
      const today    = new Date();
      const diffTime = Math.abs(today - posted);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays === 0) return 'Posted today';
      if (diffDays === 1) return 'Posted 1 day ago';
      if (diffDays < 7)   return `Posted ${diffDays} days ago`;
      if (diffDays < 30)  return `Posted ${Math.floor(diffDays / 7)} weeks ago`;
      return `Posted ${Math.floor(diffDays / 30)} months ago`;
    } catch (err) { return ''; }
  };

  const handleApply = () => {
    if (appliedLabel) return; // button is disabled, but safety check
    setApplyDialogOpen(true);
  };
  const handleBack  = () => navigate('/jobseeker/find-jobs');

  if (loading) {
    return (
      <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, maxWidth: 1200, mx: 'auto', fontFamily: FONT }}>
        <Skeleton variant="rectangular" height={200} sx={{ mb: 3, borderRadius: 2 }} />
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
          </Grid>
        </Grid>
      </Box>
    );
  }

  if (loadError || error || !selectedJob) {
    return (
      <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, maxWidth: 1200, mx: 'auto', fontFamily: FONT }}>
        <Alert severity="error"
          action={<Button color="inherit" size="small" onClick={handleBack}>Go Back</Button>}>
          {loadError || error || 'Job not found'}
        </Alert>
      </Box>
    );
  }

const job             = selectedJob;
  const skillMatch      = user?.skills ? calculateSkillMatch(job, user.skills) : null;
  const companyName     = job?.companyName || 'Company';
  // 🆕 Company logo URL — reads both camelCase and snake_case for safety
  const companyLogoUrl  = job?.companyLogoUrl || job?.company_logo_url || null;
  const showLogo        = Boolean(companyLogoUrl) && !logoErrored;
  const jobTitle        = job?.jobTitle || 'Job Position';
  const jobLocation     = job?.jobLocation || 'Location TBD';
  const workModeDisplay = job?.workModeDisplay || job?.workMode || 'Not specified';
  const isActive        = String(job?.displayStatus || job?.status || 'ACTIVE').toUpperCase() === 'ACTIVE';

  const companyInitials = (companyName || 'CO')
    .split(' ').filter(Boolean).slice(0, 2)
    .map(w => w[0]).join('').toUpperCase();

  const deadlineStr = (job.daysLeft !== null && job.daysLeft !== undefined)
    ? `${job.daysLeft} days left`
    : (job.applicationDeadline ? new Date(job.applicationDeadline).toLocaleDateString() : 'Not specified');
  const deadlineUrgent = typeof job.daysLeft === 'number' && job.daysLeft <= 3;

  const existingResumeName    = profileResume.name;
  const existingResumeViewUrl = profileResume.viewUrl;

  return (
    <Box sx={{
      p: { xs: 1.5, sm: 2, md: 3 }, maxWidth: 1200, mx: 'auto',
      fontFamily: FONT,
      '& .MuiTypography-root, & .MuiButton-root, & .MuiChip-root, & .MuiInputBase-root, & .MuiMenuItem-root': {
        fontFamily: FONT,
      },
    }}>

      {/* Back button */}
      <Button startIcon={<ArrowBack />} onClick={handleBack}
        sx={{
          mb: 2.5, textTransform: 'none', fontWeight: 500,
          color: BRAND.muted,
          '&:hover': { color: BRAND.navy, bgcolor: BRAND.navySoft },
        }}>
        Back to Jobs
      </Button>

    
      <Card elevation={0} sx={{ ...CARD_SX, mb: 3, overflow: 'hidden' }}>

        {/* Top row */}
        <Box sx={{
          display: 'flex',
          alignItems: { xs: 'stretch', md: 'flex-start' },
          justifyContent: 'space-between',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 2,
          px: { xs: 2.5, md: 3.5 },
          pt: { xs: 2.5, md: 3 },
          pb: { xs: 2, md: 2.25 },
        }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', minWidth: 0, flex: 1 }}>
            {/* Company avatar — 🆕 logo image if available, else initials */}
            <Box sx={{
              width: 56, height: 56, borderRadius: '10px',
              bgcolor: showLogo ? '#fff' : BRAND.navy,
              border: showLogo ? `1px solid ${BRAND.border}` : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, overflow: 'hidden',
            }}>
              {showLogo ? (
                <Box
                  component="img"
                  src={companyLogoUrl}
                  alt={companyName}
                  onError={() => setLogoErrored(true)}
                  sx={{
                    width: '100%', height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
              ) : (
                <Typography sx={{
                  color: '#fff', fontWeight: 700, fontSize: '1.05rem',
                  letterSpacing: '0.02em',
                }}>
                  {companyInitials}
                </Typography>
              )}
            </Box>

            <Box sx={{ minWidth: 0, flex: 1 }}>
              {/* Status pill + urgency + posted date */}
              <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 0.75, flexWrap: 'wrap' }}>
                {isActive && (
                  <Box sx={{
                    display: 'inline-flex', alignItems: 'center', gap: 0.5,
                    px: 1, py: 0.25,
                    bgcolor: BRAND.successSoft, color: BRAND.success,
                    borderRadius: 1,
                  }}>
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: BRAND.success }} />
                    <Typography sx={{
                      fontSize: '0.65rem', fontWeight: 700,
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                    }}>
                      Active
                    </Typography>
                  </Box>
                )}
                {job.urgency === 'HIGH' && (
                  <Box sx={{
                    display: 'inline-flex', alignItems: 'center',
                    px: 1, py: 0.25,
                    bgcolor: BRAND.dangerSoft, color: BRAND.danger,
                    borderRadius: 1,
                  }}>
                    <Typography sx={{
                      fontSize: '0.65rem', fontWeight: 700,
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                    }}>
                      Urgent Hiring
                    </Typography>
                  </Box>
                )}
                <Typography sx={{ fontSize: '0.75rem', color: BRAND.muted }}>
                  {formatPostedDate(job.createdAt)}
                </Typography>
              </Stack>

              {/* Job title */}
              <Typography component="h1" sx={{
                fontFamily:'ui-sans-serif',
                fontSize: { xs: '1.5rem', md: '1.85rem' },
                fontWeight: 700,
                color: BRAND.ink,
                letterSpacing: '-0.02em',
                lineHeight: 1.15,
                mb: 0.5,
              }}>
                {jobTitle}
              </Typography>

              {/* Company name + verified */}
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Typography sx={{
                  fontSize: { xs: '0.9rem', md: '0.95rem' },
                  fontWeight: 600, color: BRAND.navy,
                }}>
                  {companyName}
                </Typography>
                <VerifiedRounded sx={{ fontSize: 16, color: BRAND.navy, opacity: 0.6 }} />
              </Stack>
            </Box>
          </Box>

          {/* Apply CTA */}
          <Button
            variant="contained"
            onClick={handleApply}
            disabled={!!appliedLabel}
            disableElevation
            startIcon={appliedLabel ? <CheckCircleOutlined sx={{ fontSize: 18 }} /> : null}
            endIcon={!appliedLabel ? <ArrowForwardRounded sx={{ fontSize: 18 }} /> : null}
            sx={{
              bgcolor: appliedLabel ? '#EAF2E9' : BRAND.navy,
              color:   appliedLabel ? '#3E6E3E' : '#fff',
              border:  appliedLabel ? '1px solid rgba(127,158,126,0.45)' : 'none',
              textTransform: 'none', fontWeight: 600, fontSize: '0.9rem',
              px: 3, py: 1.1, borderRadius: 1.5,
              alignSelf: { xs: 'stretch', md: 'flex-start' },
              minWidth: { md: 160 },
              '&:hover': appliedLabel
                ? { bgcolor: '#EAF2E9' }
                : { bgcolor: BRAND.navyDark },
              '&.Mui-disabled': appliedLabel
                ? { bgcolor: '#EAF2E9', color: '#3E6E3E' }
                : {},
            }}
          >
            {appliedLabel || 'Apply now'}
          </Button>
        </Box>

        {/* Chip row */}
        <Box sx={{
          display: 'flex', flexWrap: 'wrap', gap: 1,
          px: { xs: 2.5, md: 3.5 }, pb: 2,
        }}>
          <Chip
            icon={<LocationOnOutlined sx={{ fontSize: '15px !important' }} />}
            label={jobLocation}
            size="small"
            sx={{
              bgcolor: BRAND.navySoft, color: BRAND.navy,
              border: 'none', borderRadius: 1.25,
              fontSize: '0.78rem', fontWeight: 600, height: 28,
              '& .MuiChip-icon': { color: BRAND.navy, ml: 1 },
              '& .MuiChip-label': { px: 1.25 },
            }}
          />
          <Chip
            icon={<WorkOutlineRounded sx={{ fontSize: '15px !important' }} />}
            label={workModeDisplay}
            size="small"
            sx={{
              bgcolor: BRAND.navy, color: '#fff',
              border: 'none', borderRadius: 1.25,
              fontSize: '0.78rem', fontWeight: 600, height: 28,
              '& .MuiChip-icon': { color: '#fff', ml: 1 },
              '& .MuiChip-label': { px: 1.25 },
            }}
          />
          {job.jobType && (
            <Chip
              icon={<AccessTimeOutlined sx={{ fontSize: '15px !important' }} />}
              label={job.jobType}
              size="small"
              sx={{
                bgcolor: '#fff', color: BRAND.body,
                border: `1px solid ${BRAND.border}`, borderRadius: 1.25,
                fontSize: '0.78rem', fontWeight: 600, height: 28,
                '& .MuiChip-icon': { color: BRAND.muted, ml: 1 },
                '& .MuiChip-label': { px: 1.25 },
              }}
            />
          )}
        </Box>

        {/* Skill match band */}
        {skillMatch && skillMatch.matchPercentage > 0 && (
          <Box sx={{
            mx: { xs: 2.5, md: 3.5 }, mb: 2,
            px: 2, py: 1.25,
            display: 'flex', alignItems: 'center', gap: 1.25,
            bgcolor: BRAND.navyTint, borderRadius: 1.5,
          }}>
            <TrendingUpRounded sx={{ fontSize: 18, color: BRAND.navy }} />
            <Typography sx={{ fontSize: '0.8rem', color: BRAND.ink }}>
              <Box component="span" sx={{ fontWeight: 700, color: BRAND.navy }}>
                {skillMatch.matchPercentage}% skill match
              </Box>
              {' — '}
              <Box component="span" sx={{ color: BRAND.muted }}>
                {skillMatch.matchedSkills?.length || 0} of your skills align with this role
              </Box>
            </Typography>
          </Box>
        )}

        {/* Divider */}
        <Box sx={{ height: '1px', bgcolor: BRAND.border, mx: { xs: 2.5, md: 3.5 } }} />

        {/* Info strip */}
        <Box sx={{
          display: 'flex', alignItems: 'stretch',
          py: 2, px: { xs: 1, md: 1.5 },
        }}>
          <HeroMetric label="Salary"     value={job.salaryDisplay      || 'Not disclosed'} />
          <HeroMetric label="Experience" value={job.experienceDisplay  || 'Any'} />
          <HeroMetric label="Deadline"   value={deadlineStr} danger={deadlineUrgent} last />
        </Box>
      </Card>

      {/* ═══════════════════════════════════════════════════════════
          MAIN CONTENT
      ═══════════════════════════════════════════════════════════ */}
      <Grid container spacing={3}>

        {/* ── LEFT COLUMN ────────────────────────────────────────── */}
        <Grid size={{ xs: 12, md: 8 }}>
          {job.jobDescription && (
            <Card elevation={0} sx={{ ...CARD_SX, mb: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <SectionHeading title="Job Description" />
                <Typography sx={{
                  fontSize: '0.9rem', lineHeight: 1.75,
                  color: BRAND.body, whiteSpace: 'pre-wrap',
                }}>
                  {job.jobDescription}
                </Typography>
              </CardContent>
            </Card>
          )}

          {job.responsibilities && job.responsibilities.length > 0 && (
            <Card elevation={0} sx={{ ...CARD_SX, mb: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <SectionHeading title="Roles & Responsibilities" />
                <List sx={{ py: 0 }}>
                  {job.responsibilities.map((resp, idx) => (
                    <ListItem key={idx} sx={{ px: 0, py: 0.75, alignItems: 'flex-start' }}>
                      <ListItemIcon sx={{ minWidth: 30, mt: 0.5 }}>
                        <CheckCircle sx={{ fontSize: 18, color: BRAND.navy }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={resp}
                        primaryTypographyProps={{
                          fontSize: '0.9rem', color: BRAND.body, lineHeight: 1.65,
                        }}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          )}

          {job.skills && job.skills.length > 0 && (
            <Card elevation={0} sx={{ ...CARD_SX, mb: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <SectionHeading title="Required Skills" />
                <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                  {job.skills.map((skill, idx) => {
                    const isMatched = skillMatch?.matchedSkills?.includes(skill.toLowerCase());
                    return (
                      <Chip
                        key={idx}
                        label={skill}
                        size="small"
                        sx={{
                          bgcolor: isMatched ? BRAND.successSoft : BRAND.navySoft,
                          color:   isMatched ? BRAND.success     : BRAND.navy,
                          border:  `1px solid ${isMatched ? BRAND.success : BRAND.border}`,
                          borderRadius: 1.25,
                          fontSize: '0.78rem', fontWeight: 600, height: 28,
                          '& .MuiChip-label': { px: 1.25 },
                        }}
                      />
                    );
                  })}
                </Box>
              </CardContent>
            </Card>
          )}
        </Grid>

        {/* ── RIGHT COLUMN ───────────────────────────────────────── */}
        <Grid size={{ xs: 12, md: 4 }}>

          {/* Company Information */}
          <Card elevation={0} sx={{ ...CARD_SX, mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <SectionHeading title="Company Information" icon={<Business sx={{ fontSize: 16 }} />} />
              <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 1 }}>
                <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: BRAND.ink }}>
                  {companyName}
                </Typography>
                <VerifiedRounded sx={{ fontSize: 15, color: BRAND.navy, opacity: 0.6 }} />
              </Stack>
              {job.companyType && (
                <Typography sx={{ fontSize: '0.8rem', color: BRAND.muted }}>{job.companyType}</Typography>
              )}
            </CardContent>
          </Card>

          {/* Job Details */}
          <Card elevation={0} sx={{ ...CARD_SX, mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <SectionHeading title="Job Details" icon={<WorkHistoryOutlined sx={{ fontSize: 16 }} />} />

              {job.education && (
                <Box sx={{ mb: 2 }}>
                  <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.5 }}>
                    <School sx={{ fontSize: 14, color: BRAND.navy }} />
                    <Typography sx={{
                      fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase',
                      color: BRAND.muted, fontWeight: 700,
                    }}>
                      Education
                    </Typography>
                  </Stack>
                  <Typography sx={{ fontSize: '0.85rem', fontWeight: 500, color: BRAND.ink }}>
                    {job.education}
                  </Typography>
                </Box>
              )}

              {job.languages && job.languages.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.5 }}>
                    <Language sx={{ fontSize: 14, color: BRAND.navy }} />
                    <Typography sx={{
                      fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase',
                      color: BRAND.muted, fontWeight: 700,
                    }}>
                      Languages
                    </Typography>
                  </Stack>
                  <Typography sx={{ fontSize: '0.85rem', fontWeight: 500, color: BRAND.ink }}>
                    {job.languages.join(', ')}
                  </Typography>
                </Box>
              )}

              {job.jobShift && (
                <Box sx={{ mb: 2 }}>
                  <Typography sx={{
                    fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase',
                    color: BRAND.muted, fontWeight: 700, mb: 0.5,
                  }}>
                    Shift
                  </Typography>
                  <Typography sx={{ fontSize: '0.85rem', fontWeight: 500, color: BRAND.ink }}>
                    {job.jobShift}
                  </Typography>
                </Box>
              )}

              {job.openings && (
                <Box>
                  <Typography sx={{
                    fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase',
                    color: BRAND.muted, fontWeight: 700, mb: 0.5,
                  }}>
                    Openings
                  </Typography>
                  <Typography sx={{ fontSize: '0.85rem', fontWeight: 500, color: BRAND.ink }}>
                    {job.openings} position(s)
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* 🔧 BENEFITS — moved here below Job Details per request */}
          {job.benefits && Object.keys(job.benefits).length > 0 && (
            <Card elevation={0} sx={{ ...CARD_SX, mb: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <SectionHeading title="Benefits & Perks" icon={<CardGiftcardOutlined sx={{ fontSize: 16 }} />} />
                {Object.entries(job.benefits).map(([category, items]) => (
                  items && items.length > 0 && (
                    <Box key={category} sx={{ mb: 2, '&:last-of-type': { mb: 0 } }}>
                      <Typography sx={{
                        fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase',
                        color: BRAND.muted, fontWeight: 700, mb: 1,
                      }}>
                        {category}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                        {items.map((item, idx) => (
                          <Chip
                            key={idx}
                            label={item}
                            size="small"
                            sx={{
                              bgcolor: BRAND.navySoft, color: BRAND.navy,
                              border: `1px solid ${BRAND.border}`,
                              borderRadius: 1.25,
                              fontSize: '0.75rem', fontWeight: 600, height: 26,
                              '& .MuiChip-label': { px: 1.1 },
                            }}
                          />
                        ))}
                      </Box>
                    </Box>
                  )
                ))}
              </CardContent>
            </Card>
          )}

          {/* Contact Person */}
          {job.employer && job.employer.name && (
            <Card elevation={0} sx={CARD_SX}>
              <CardContent sx={{ p: 3 }}>
                <SectionHeading title="Contact Person" icon={<Person sx={{ fontSize: 16 }} />} />
                <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 1.25 }}>
                  <Person sx={{ fontSize: 16, color: BRAND.navy }} />
                  <Typography sx={{ fontSize: '0.85rem', fontWeight: 500, color: BRAND.ink }}>
                    {job.employer.name}
                  </Typography>
                </Stack>
                {job.employer.email && (
                  <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 1.25 }}>
                    <Email sx={{ fontSize: 16, color: BRAND.navy }} />
                    <Typography sx={{ fontSize: '0.85rem', fontWeight: 500, color: BRAND.ink, wordBreak: 'break-all' }}>
                      {job.employer.email}
                    </Typography>
                  </Stack>
                )}
                {job.employer.phone && (
                  <Stack direction="row" alignItems="center" spacing={1.25}>
                    <Phone sx={{ fontSize: 16, color: BRAND.navy }} />
                    <Typography sx={{ fontSize: '0.85rem', fontWeight: 500, color: BRAND.ink }}>
                      {job.employer.phone}
                    </Typography>
                  </Stack>
                )}
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      <ApplyDialog
        open={applyDialogOpen}
        onClose={() => setApplyDialogOpen(false)}
        jobId={id}
        jobTitle={jobTitle}
        companyName={companyName}
        existingResumeName={existingResumeName}
        existingResumeViewUrl={existingResumeViewUrl}
        onApplied={() => {
          setApplySuccess(true);
          setAppliedLabel('Applied just now');
        }}
      />

      <Snackbar
        open={applySuccess}
        autoHideDuration={4000}
        onClose={() => setApplySuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setApplySuccess(false)} sx={{ borderRadius: '10px' }}>
          {appliedLabel === 'Already Applied' ? 'You have already applied to this job.' : 'Application submitted successfully!'}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default JobDetails;