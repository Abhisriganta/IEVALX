import React, { useState, useCallback, useEffect } from 'react';
import {
  Box, Typography, Button, Stack, CircularProgress, Card, CardContent,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  Select, FormControl, InputLabel, Alert, IconButton, Avatar, Chip,
  Checkbox, Tooltip, LinearProgress,
  Table, TableBody, TableCell, TableHead, TableRow,
  useMediaQuery, useTheme,
} from '@mui/material';
import {
  Add, Close, PlayArrow, ArrowForward, WorkspacePremium,
  Schedule, HourglassEmpty,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { interviewAPI } from '../../../services/api/employer/candidateService';
import jobService from '../../../services/api/employer/jobService';

const jobsAPI = {
  getMyJobs: () =>
    jobService.listMyJobs()
      .then(response => {
        const raw  = response?.data ?? response;
        const list = Array.isArray(raw) ? raw : (raw?.results ?? []);
        return { data: list };
      })
      .catch(() => ({ data: [] })),
};

// ── Constants (aptitude kept per user instruction) ────────────────────────────
const ROUND_TYPES = [
  { value: 'aptitude',   label: 'Assessment',        icon: '📝', color: '#ea580c', desc: 'AI-generated or manually built test' },
  { value: 'ai-powered', label: 'AI Interview',       icon: '🤖', color: '#7c3aed', desc: 'AI-powered Q&A with real-time CPS scoring' },
  { value: 'document',   label: 'Document Interview', icon: '📄', color: '#0284c7', desc: 'AI reads uploaded doc and generates unique questions' },
  { value: 'live-video', label: 'Live / Inline',      icon: '🎥', color: '#16a34a', desc: 'Video call or in-person interview via portal' },
];

const ROUND_NAME_OPTIONS = {
  document:     ['Technical Q&A Interview'],
  'ai-powered': ['AI Technical Interview', 'AI Manager Interview', 'AI HR Interview'],
  aptitude:     ['AI-Generated Test', 'Manually Uploaded Test'],
  'live-video': ['Live Technical Interview', 'Live Manager Interview', 'Live HR Interview'],
};

export const ROUND_TYPE_CFG = {
  document:     { icon: '📄', color: '#0284c7', label: 'Document'   },
  'ai-powered': { icon: '🤖', color: '#7c3aed', label: 'AI-Powered' },
  aptitude:     { icon: '📝', color: '#ea580c', label: 'Assessment' },
  'live-video': { icon: '🎥', color: '#16a34a', label: 'Live Video' },
};
const DEFAULT_ROUND_CFG = { icon: '📋', color: '#888', label: 'Round' };

export const STATUS_CHIP = {
  scheduled:    { color: 'primary',  label: 'Scheduled'        },
  invited:      { color: 'info',     label: 'Invited'          },
  started:      { color: 'warning',  label: 'Started'          },
  in_progress:  { color: 'warning',  label: 'In Progress'      },
  completed:    { color: 'success',  label: 'Completed'        },
  partial:      { color: 'warning',  label: 'Partially Exited' },
  no_attempt:   { color: 'error',    label: 'No Attempt'       },
  cancelled:    { color: 'default',  label: 'Cancelled'        },
  disqualified: { color: 'error',    label: 'Disqualified'     },
  draft:        { color: 'default',  label: 'Draft'            },
};

const selectedRoundOption = (fullName, options) => {
  if (!options?.length) return '';
  return options.find(o => fullName?.includes(o)) || options[0];
};

// ── Shared dialog paper style ─────────────────────────────────────────────────
const dlgPaper = {
  borderRadius: { xs: 0, sm: '16px' },
  m: { xs: 0, sm: 2 },
  maxHeight: { xs: '100dvh', sm: '92vh' },
  width: { xs: '100%', sm: 'auto' },
  '@media (max-width: 240px)': { m: 0, borderRadius: 0 },
};

// ── Shared round-card builder (used by HiringPipelineDialog + ManagePipelineDialog)
function RoundCard({ round, index, onUpdate, onRemove, disabled, showNewBadge = false }) {
  const cfg = ROUND_TYPES.find(x => x.value === round.type) || ROUND_TYPES[1];
  const theme = useTheme();
  const isXs  = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Card
      variant="outlined"
      sx={{
        border: '1.5px solid',
        borderColor: cfg.color + '40',
        bgcolor: cfg.color + '06',
        borderRadius: { xs: '10px', sm: '12px' },
      }}
    >
      <CardContent sx={{ pb: '12px !important', px: { xs: 1.5, sm: 2 }, pt: { xs: 1.5, sm: 2 } }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={{ xs: 1, sm: 2 }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
        >
          {/* Order avatar + type selector */}
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ width: { xs: '100%', sm: 'auto' } }}>
            <Avatar
              sx={{
                bgcolor: cfg.color,
                width: { xs: 30, sm: 36 },
                height: { xs: 30, sm: 36 },
                fontSize: { xs: 12, sm: 14 },
                fontWeight: 800,
                flexShrink: 0,
              }}
            >
              {round.order}
            </Avatar>
            <FormControl size="small" sx={{ minWidth: { xs: 160, sm: 220 }, flex: { xs: 1, sm: 'none' } }}>
              <InputLabel sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Round Type</InputLabel>
              <Select
                value={round.type}
                label="Round Type"
                disabled={disabled}
                sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                onChange={e => {
                  const nt = e.target.value;
                  onUpdate(index, 'type', nt);
                  const opts = ROUND_NAME_OPTIONS[nt];
                  onUpdate(index, 'name', `Round ${round.order} — ${opts ? opts[0] : (ROUND_TYPES.find(x => x.value === nt)?.label || '')}`);
                }}
              >
                {ROUND_TYPES.map(rt => (
                  <MenuItem key={rt.value} value={rt.value}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <span style={{ fontSize: { xs: 13, sm: 16 } }}>{rt.icon}</span>
                      <Box>
                        <Typography variant="body2" fontWeight={600} sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                          {rt.label}
                        </Typography>
                        {!isXs && (
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                            {rt.desc}
                          </Typography>
                        )}
                      </Box>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          {/* Name selector + actions */}
          <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1, width: { xs: '100%', sm: 'auto' } }}>
            {ROUND_NAME_OPTIONS[round.type] ? (
              <FormControl size="small" sx={{ flex: 1 }} disabled={disabled}>
                <InputLabel sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Round Name</InputLabel>
                <Select
                  label="Round Name"
                  value={selectedRoundOption(round.name, ROUND_NAME_OPTIONS[round.type])}
                  onChange={e => onUpdate(index, 'name', `Round ${round.order} — ${e.target.value}`)}
                  sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                >
                  {ROUND_NAME_OPTIONS[round.type].map(opt => (
                    <MenuItem key={opt} value={opt} sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                      {opt}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <TextField
                size="small"
                label="Round Name"
                sx={{
                  flex: 1,
                  '& .MuiInputBase-input': { fontSize: { xs: '0.75rem', sm: '0.875rem' } },
                  '& .MuiInputLabel-root': { fontSize: { xs: '0.75rem', sm: '0.875rem' } },
                }}
                value={round.name}
                onChange={e => onUpdate(index, 'name', e.target.value)}
                disabled={disabled}
              />
            )}
            {showNewBadge && !round.id && (
              <Chip
                label="NEW"
                size="small"
                color="success"
                sx={{ height: { xs: 18, sm: 20 }, fontSize: { xs: '0.55rem', sm: '0.6rem' }, fontWeight: 700 }}
              />
            )}
            <Tooltip title={round.id ? 'Mark for deletion' : 'Discard'}>
              <IconButton
                size="small"
                color="error"
                disabled={disabled}
                onClick={() => onRemove(index)}
                sx={{ flexShrink: 0 }}
              >
                <Close sx={{ fontSize: { xs: 14, sm: 16 } }} />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HiringPipelineDialog
// ═══════════════════════════════════════════════════════════════════════════════
export function HiringPipelineDialog({ open, onClose, onLaunch }) {
  const { enqueueSnackbar } = useSnackbar();
  const [jobs,       setJobs]       = React.useState([]);
  const [jobsLoading,setJobsLoading]= React.useState(false);
  const [jobsError,  setJobsError]  = React.useState('');
  const [jobId,      setJobId]      = React.useState('');
  const [jobTitle,   setJobTitle]   = React.useState('');
  const [vacancies,  setVacancies]  = React.useState(1);
  const [submitting, setSubmitting] = React.useState(false);
  const [rounds, setRounds] = React.useState([
    { type: 'aptitude',   name: 'Round 1 — AI-Generated Test',        order: 1 },
    { type: 'ai-powered', name: 'Round 2 — AI Technical Interview',   order: 2 },
    { type: 'document',   name: 'Round 3 — Technical Test',           order: 3 },
    { type: 'live-video', name: 'Round 4 — Live Technical Interview', order: 4 },
  ]);

   React.useEffect(() => {
    if (!open) return;
    setJobsLoading(true);
    setJobsError('');
 
    jobService.listMyJobs()
      .then(response => {
        const raw = Array.isArray(response)
          ? response
          : (response?.jobs ?? response?.results ?? response?.data ?? []);
        const active = raw.filter(j => {
          const ds = String(j.display_status || '').toLowerCase();
          const s  = String(j.status        || '').toLowerCase();
          return ds === 'active' || s === 'active' || s === 'published';
        });
 
        setJobs(active);
 
        if (active.length === 0) {
          setJobsError(
            'No active job postings found. ' +
            'Go to My Jobs and set at least one job to Active.'
          );
        }
      })
      .catch(err => {
        console.error('[HiringPipelineDialog] jobs fetch failed:', err);
        setJobsError(err?.message || 'Failed to load jobs. Please try again.');
        setJobs([]);
      })
      .finally(() => setJobsLoading(false));
  }, [open]);
 

  React.useEffect(() => {
    if (open) return;
    setJobId(''); setJobTitle(''); setVacancies(1); setJobsError('');  // ← add setJobsError('')
    setRounds([
      { type: 'aptitude',   name: 'Round 1 — AI-Generated Test',        order: 1 },
      { type: 'ai-powered', name: 'Round 2 — AI Technical Interview',   order: 2 },
      { type: 'document',   name: 'Round 3 — Technical Test',           order: 3 },
      { type: 'live-video', name: 'Round 4 — Live Technical Interview', order: 4 },
    ]);
  }, [open]);

  const handleJobChange = (id) => {
    setJobId(id);
    const job = jobs.find(j => String(j.id) === String(id));
    if (job) {
      setJobTitle(job.title || job.job_title || '');
      setVacancies(job.openings_count || job.openings || job.vacancies || 1);
    }
  };

  const addRound    = () => setRounds(p => [...p, { type: 'ai-powered', name: `Round ${p.length + 1} — Interview`, order: p.length + 1 }]);
  const removeRound = (i) => setRounds(p => p.filter((_, idx) => idx !== i).map((r, idx) => ({ ...r, order: idx + 1 })));
  const updateRound = (i, key, val) => setRounds(p => p.map((r, idx) => idx === i ? { ...r, [key]: val } : r));

  const handleLaunch = async () => {
    if (!jobId)              { enqueueSnackbar('Please select a job posting', { variant: 'error' }); return; }
    if (!jobTitle.trim())    { enqueueSnackbar('Job title is required',        { variant: 'error' }); return; }
    if (rounds.length === 0) { enqueueSnackbar('Add at least one round',       { variant: 'error' }); return; }
    setSubmitting(true);
    try { await onLaunch({ jobId, jobTitle: jobTitle.trim(), vacancies, rounds }); onClose(); }
    catch (err) { console.error('Launch failed:', err); }
    finally { setSubmitting(false); }
  };

  return (
    <Dialog
      open={open}
      onClose={submitting ? undefined : onClose}
      maxWidth="md"
      fullWidth
      disableRestoreFocus
      TransitionProps={{ onExited: () => { document.activeElement?.blur(); } }}
      PaperProps={{ sx: dlgPaper }}
    >
      {/* Header */}
      <Box
        sx={{
          px: { xs: 2, sm: 3 },
          py: { xs: 2, sm: 2.5 },
          bgcolor: 'primary.main',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          '@media (max-width: 240px)': { px: 1.5, py: 1.5 },
        }}
      >
        <Box>
          <Typography
            variant="h6"
            fontWeight={700}
            color="white"
            sx={{ fontSize: { xs: '0.95rem', sm: '1.1rem', '@media (max-width: 240px)': '0.8rem' } }}
          >
            Setup Hiring Pipeline
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: 'rgba(255,255,255,0.75)',
              fontSize: { xs: '0.65rem', sm: '0.72rem', display: { xs: 'none', sm: 'block' } },
            }}
          >
            Pick a job, define rounds — scheduling unlocks only after this is saved
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          disabled={submitting}
          sx={{ color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' } }}
          size="small"
        >
          <Close />
        </IconButton>
      </Box>

      <DialogContent
        sx={{
          p: { xs: 2, sm: 3 },
          overflowY: 'auto',
          '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-thumb': { bgcolor: '#E2E8F0', borderRadius: 2 },
          '@media (max-width: 240px)': { p: 1.5 },
        }}
      >
        <Stack spacing={{ xs: 2, sm: 3 }}>
          {/* Job + vacancies row */}
          {jobsError && (
            <Alert severity="warning" sx={{ py: 0.5, fontSize: { xs: '0.75rem', sm: '0.82rem' } }}>
              {jobsError}
            </Alert>
          )}
 
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1.5, sm: 2 }}>
            <FormControl size="small" fullWidth required>
              <InputLabel sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>Job Posting *</InputLabel>
              <Select
                value={jobId}
                label="Job Posting *"
                onChange={e => handleJobChange(e.target.value)}
                disabled={jobsLoading || submitting}
                sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
              >
                {jobsLoading && <MenuItem disabled value=""><em>Loading…</em></MenuItem>}
                {/* Only show "No active job postings" when there truly are none AND no error is shown above */}
                {!jobsLoading && jobs.length === 0 && !jobsError && (
                  <MenuItem disabled value=""><em>No active job postings</em></MenuItem>
                )}
                {jobs.map(j => {
                  // ← handle both field names; never undefined
                  const title = j.title || j.job_title || `Job #${j.id}`;
                  const o     = j.openings_count || j.openings || j.vacancies || 1;
                  return (
                    <MenuItem key={j.id} value={j.id}>
                      <Stack>
                        <Typography variant="body2" fontWeight={600} sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                          {title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.72rem' } }}>
                          {j.location || j.job_location || 'Remote'} · {o} opening{o === 1 ? '' : 's'}
                        </Typography>
                      </Stack>
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
            <TextField
              label="Vacancies"
              size="small"
              type="number"
              sx={{ width: { xs: '100%', sm: 140 } }}
              inputProps={{ min: 1 }}
              value={vacancies}
              onChange={e => setVacancies(Math.max(1, +e.target.value))}
              disabled={submitting}
              helperText="From job · override if needed"
              InputProps={{ sx: { fontSize: { xs: '0.8rem', sm: '0.875rem' } } }}
              InputLabelProps={{ sx: { fontSize: { xs: '0.8rem', sm: '0.875rem' } } }}
            />
          </Stack>

          {jobId && (
            <Alert severity="info" sx={{ py: 0.5, fontSize: { xs: '0.75rem', sm: '0.83rem' } }}>
              Pipeline for: <strong>{jobTitle}</strong>
            </Alert>
          )}

          {/* Rounds */}
          <Box>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: { xs: 1.5, sm: 2 } }}
            >
              <Typography
                variant="subtitle1"
                fontWeight={700}
                sx={{ fontSize: { xs: '0.88rem', sm: '0.95rem' } }}
              >
                Interview Rounds (in order)
              </Typography>
              <Button
                size="small"
                startIcon={<Add sx={{ fontSize: { xs: 14, sm: 16 } }} />}
                onClick={addRound}
                variant="outlined"
                disabled={submitting}
                sx={{ textTransform: 'none', fontSize: { xs: '0.72rem', sm: '0.8rem' }, borderRadius: '8px' }}
              >
                Add Round
              </Button>
            </Stack>
            <Stack spacing={{ xs: 1, sm: 1.5 }}>
              {rounds.map((r, i) => (
                <RoundCard
                  key={i}
                  round={r}
                  index={i}
                  onUpdate={updateRound}
                  onRemove={removeRound}
                  disabled={submitting}
                />
              ))}
            </Stack>
          </Box>

          {/* Pipeline flow preview */}
          <Box
            sx={{
              p: { xs: 1.5, sm: 2 },
              bgcolor: 'grey.50',
              borderRadius: { xs: '10px', sm: '12px' },
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={600}
              sx={{ mb: 1, display: 'block', fontSize: { xs: '0.65rem', sm: '0.72rem' } }}
            >
              Pipeline Flow
            </Typography>
            <Box
              sx={{
                display: 'flex',
                gap: 0.5,
                alignItems: 'center',
                flexWrap: 'wrap',
                overflowX: 'auto',
                '&::-webkit-scrollbar': { display: 'none' },
              }}
            >
              {rounds.map((r, i) => {
                const cfg = ROUND_TYPES.find(x => x.value === r.type) || ROUND_TYPES[1];
                return (
                  <React.Fragment key={i}>
                    <Chip
                      label={`${cfg.icon} ${r.name}`}
                      size="small"
                      sx={{
                        bgcolor: cfg.color + '15',
                        color: cfg.color,
                        fontWeight: 600,
                        border: `1px solid ${cfg.color}30`,
                        fontSize: { xs: '0.58rem', sm: '0.65rem' },
                        height: { xs: 20, sm: 24 },
                      }}
                    />
                    {i < rounds.length - 1 && (
                      <ArrowForward sx={{ fontSize: { xs: 12, sm: 14 }, color: 'text.disabled' }} />
                    )}
                  </React.Fragment>
                );
              })}
              <ArrowForward sx={{ fontSize: { xs: 12, sm: 14 }, color: 'text.disabled' }} />
              <Chip
                label={`✅ Hired (${vacancies})`}
                size="small"
                color="success"
                sx={{ fontSize: { xs: '0.58rem', sm: '0.65rem' }, height: { xs: 20, sm: 24 } }}
              />
            </Box>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 2.5 }, gap: 1 }}>
        <Button
          onClick={onClose}
          disabled={submitting}
          sx={{ textTransform: 'none', fontSize: { xs: '0.78rem', sm: '0.85rem' } }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleLaunch}
          disabled={!jobId || !jobTitle.trim() || rounds.length === 0 || submitting}
          startIcon={submitting ? <CircularProgress size={14} color="inherit" /> : <PlayArrow />}
          sx={{
            textTransform: 'none',
            borderRadius: '10px',
            fontSize: { xs: '0.78rem', sm: '0.85rem' },
            bgcolor: '#1E3358',
            '&:hover': { bgcolor: '#152540' },
          }}
        >
          {submitting ? 'Creating…' : 'Create Pipeline'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ManagePipelineDialog
// ═══════════════════════════════════════════════════════════════════════════════
export function ManagePipelineDialog({ open, process, onClose, onDone }) {
  const { enqueueSnackbar } = useSnackbar();
  const [saving,          setSaving]          = useState(false);
  const [vacancies,       setVacancies]       = useState(1);
  const [isActive,        setIsActive]        = useState(true);
  const [rounds,          setRounds]          = useState([]);
  const [deletedRoundIds, setDeletedRoundIds] = useState([]);

  React.useEffect(() => {
    if (open && process) {
      setVacancies(process.vacancies || 1);
      setIsActive(process.is_active !== false);
      setDeletedRoundIds([]);
      const sorted = Array.isArray(process.rounds)
        ? [...process.rounds].filter(r => r.is_active !== false).sort((a, b) => (a.order || 0) - (b.order || 0))
        : [];
      setRounds(sorted.map(r => ({
        id: r.id,
        type: r.round_type || 'ai-powered',
        name: r.name || `Round ${r.order} — Interview`,
        order: r.order,
        _orig: { name: r.name, type: r.round_type, order: r.order },
      })));
    }
  }, [open, process]);

  const addRound    = () => setRounds(p => [...p, { type: 'ai-powered', name: `Round ${p.length + 1} — Interview`, order: p.length + 1 }]);
  const removeRound = (i) => setRounds(p => {
    const removed = p[i];
    if (removed?.id) setDeletedRoundIds(d => [...d, removed.id]);
    return p.filter((_, idx) => idx !== i).map((r, idx) => ({ ...r, order: idx + 1 }));
  });
  const updateField = (i, key, val) => setRounds(p => p.map((r, idx) => idx === i ? { ...r, [key]: val } : r));

  const handleSave = async () => {
    if (rounds.length === 0) { enqueueSnackbar('At least one round is required', { variant: 'warning' }); return; }
    setSaving(true);
    const failures = { create: [], update: [], delete: [], proc: false };
    try {
      const procChanged = Number(vacancies) !== Number(process.vacancies) || Boolean(isActive) !== (process.is_active !== false);
      if (procChanged) {
        try { await interviewAPI.updateProcess(process.id, { vacancies, is_active: isActive }); }
        catch (err) { failures.proc = true; enqueueSnackbar(`Process update failed: ${err?.response?.data?.detail || 'unknown'}`, { variant: 'error' }); }
      }
      for (const id of deletedRoundIds) {
        try { await interviewAPI.deleteRound(id); }
        catch { failures.delete.push(id); }
      }
      for (const r of rounds) {
        const payload = { name: r.name, round_type: r.type, order: r.order, duration: r.duration ?? 60, passing_score: r.passing_score ?? 70 };
        if (r.id) {
          const o = r._orig || {};
          if (o.name === r.name && o.type === r.type && o.order === r.order) continue;
          try { await interviewAPI.updateRound(r.id, payload); }
          catch { failures.update.push(r.name); }
        } else {
          try { await interviewAPI.createRound(process.id, payload); }
          catch { failures.create.push(r.name); }
        }
      }
      const total = failures.create.length + failures.update.length + failures.delete.length + (failures.proc ? 1 : 0);
      enqueueSnackbar(
        total === 0 ? 'Pipeline updated.' : `Updated with ${total} failure(s). Check console.`,
        { variant: total === 0 ? 'success' : 'warning', autoHideDuration: total > 0 ? 8000 : undefined }
      );
      onDone(); onClose();
    } finally { setSaving(false); }
  };

  if (!process) return null;
  const filled    = process.vacancies_filled || 0;
  const remaining = Math.max(0, vacancies - filled);

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      maxWidth="md"
      fullWidth
      disableRestoreFocus
      TransitionProps={{ onExited: () => { document.activeElement?.blur(); } }}
      PaperProps={{ sx: dlgPaper }}
    >
      <DialogTitle sx={{ px: { xs: 2, sm: 3 }, py: { xs: 1.8, sm: 2.2 }, borderBottom: '1px solid #E2E8F0' }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <WorkspacePremium color="primary" sx={{ fontSize: { xs: 20, sm: 24 } }} />
          <Box>
            <Typography
              variant="h6"
              fontWeight={700}
              sx={{ fontSize: { xs: '0.9rem', sm: '1rem', md: '1.1rem' } }}
            >
              Manage Pipeline
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: { xs: '0.65rem', sm: '0.72rem' } }}
            >
              {process.job_title}
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>

      <DialogContent
        sx={{
          p: { xs: 2, sm: 3 },
          overflowY: 'auto',
          '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-thumb': { bgcolor: '#E2E8F0', borderRadius: 2 },
          '@media (max-width: 240px)': { p: 1.5 },
        }}
      >
        <Stack spacing={{ xs: 2, sm: 2.5 }} sx={{ mt: 0.5 }}>
          {/* Status banner */}
          <Box
            sx={{
              p: { xs: 1.5, sm: 2 },
              bgcolor: 'grey.50',
              borderRadius: { xs: '10px', sm: '12px' },
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={600}
              sx={{ display: 'block', mb: 1, fontSize: { xs: '0.65rem', sm: '0.72rem' } }}
            >
              Hiring status
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                label={`${rounds.length} round${rounds.length === 1 ? '' : 's'}`}
                size="small"
                color="primary"
                sx={{ height: { xs: 20, sm: 24 }, fontSize: { xs: '0.62rem', sm: '0.7rem' } }}
              />
              <Chip
                label={`${filled}/${vacancies} hired`}
                size="small"
                color={filled >= vacancies ? 'success' : 'warning'}
                variant="outlined"
                sx={{ height: { xs: 20, sm: 24 }, fontSize: { xs: '0.62rem', sm: '0.7rem' } }}
              />
              {deletedRoundIds.length > 0 && (
                <Chip
                  label={`${deletedRoundIds.length} marked for deletion`}
                  size="small"
                  color="error"
                  variant="outlined"
                  sx={{ height: { xs: 20, sm: 24 }, fontSize: { xs: '0.62rem', sm: '0.7rem' } }}
                />
              )}
            </Stack>
          </Box>

          {/* Vacancies + active */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1.5, sm: 2 }} alignItems="flex-start">
            <TextField
              label="Vacancies"
              type="number"
              size="small"
              sx={{ width: { xs: '100%', sm: 140 } }}
              value={vacancies}
              onChange={e => setVacancies(Math.max(1, +e.target.value))}
              inputProps={{ min: 1 }}
              disabled={saving}
              helperText={`${filled} filled · ${remaining} remaining`}
              InputProps={{ sx: { fontSize: { xs: '0.8rem', sm: '0.875rem' } } }}
              InputLabelProps={{ sx: { fontSize: { xs: '0.8rem', sm: '0.875rem' } } }}
            />
            <Stack direction="row" alignItems="center" spacing={1} sx={{ pt: { sm: 0.5 } }}>
              <Checkbox
                checked={isActive}
                onChange={e => setIsActive(e.target.checked)}
                disabled={saving}
                size="small"
              />
              <Box>
                <Typography variant="body2" fontWeight={600} sx={{ fontSize: { xs: '0.78rem', sm: '0.85rem' } }}>
                  Pipeline is active
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.62rem', sm: '0.68rem' } }}>
                  Uncheck to stop accepting new candidates
                </Typography>
              </Box>
            </Stack>
          </Stack>

          {/* Rounds */}
          <Box>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: { xs: 1.2, sm: 1.5 } }}
            >
              <Typography
                variant="subtitle2"
                fontWeight={700}
                sx={{ fontSize: { xs: '0.82rem', sm: '0.88rem' } }}
              >
                Interview Rounds (in order)
              </Typography>
              <Button
                size="small"
                startIcon={<Add sx={{ fontSize: { xs: 14, sm: 16 } }} />}
                onClick={addRound}
                variant="outlined"
                disabled={saving}
                sx={{ textTransform: 'none', fontSize: { xs: '0.68rem', sm: '0.75rem' }, borderRadius: '8px' }}
              >
                Add Round
              </Button>
            </Stack>
            {rounds.length === 0 && (
              <Alert severity="warning" sx={{ py: 0.5, fontSize: { xs: '0.72rem', sm: '0.78rem' } }}>
                No rounds. Click <strong>Add Round</strong> to begin.
              </Alert>
            )}
            <Stack spacing={{ xs: 1, sm: 1.5 }}>
              {rounds.map((r, i) => (
                <RoundCard
                  key={i}
                  round={r}
                  index={i}
                  onUpdate={updateField}
                  onRemove={removeRound}
                  disabled={saving}
                  showNewBadge
                />
              ))}
            </Stack>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 2.5 }, gap: 1 }}>
        <Button
          onClick={onClose}
          disabled={saving}
          sx={{ textTransform: 'none', fontSize: { xs: '0.78rem', sm: '0.85rem' } }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || rounds.length === 0}
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : null}
          sx={{
            textTransform: 'none',
            borderRadius: '10px',
            fontSize: { xs: '0.78rem', sm: '0.85rem' },
          }}
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BulkHireDialog
// ═══════════════════════════════════════════════════════════════════════════════
export function BulkHireDialog({ open, process, onClose, onDone }) {
  const { enqueueSnackbar } = useSnackbar();
  const [loading,     setLoading]     = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [candidates,  setCandidates]  = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const vacancies   = process?.vacancies    || 1;
  const totalRounds = process?.rounds_count || 1;

  React.useEffect(() => {
    if (!open || !process?.id) return;
    setLoading(true); setSelectedIds(new Set());
    interviewAPI.getRanking(process.id, totalRounds)
      .then(r => {
        const eligible = (r.data?.results || r.data || []).filter(c => c.status === 'pending');
        setCandidates(eligible);
        setSelectedIds(new Set(
          eligible.slice().sort((a, b) => (a.rank || 999) - (b.rank || 999))
            .slice(0, vacancies)
            .map(c => c.candidate_id)
        ));
      })
      .catch(() => setCandidates([]))
      .finally(() => setLoading(false));
  }, [open, process?.id, totalRounds, vacancies]);

  const toggle = (cid) => setSelectedIds(p => { const n = new Set(p); n.has(cid) ? n.delete(cid) : n.add(cid); return n; });

  const handleConfirm = async () => {
    if (selectedIds.size === 0) { enqueueSnackbar('Select at least one candidate', { variant: 'warning' }); return; }
    if (selectedIds.size > vacancies) { enqueueSnackbar(`Only ${vacancies} vacanc${vacancies === 1 ? 'y' : 'ies'} available`, { variant: 'warning' }); return; }
    setSaving(true);
    try {
      await Promise.all(candidates.map(c =>
        interviewAPI.setCandidateStatus(process.id, totalRounds, c.candidate_id, {
          status: selectedIds.has(c.candidate_id) ? 'approved' : 'pending',
          advance: false,
        })
      ));
      enqueueSnackbar(`🎉 Hired ${selectedIds.size} candidate${selectedIds.size === 1 ? '' : 's'}!`, { variant: 'success', autoHideDuration: 6000 });
      onDone(); onClose();
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.detail || 'Failed', { variant: 'error' });
    } finally { setSaving(false); }
  };

  if (!process) return null;
  const tooMany = selectedIds.size > vacancies;

  const thSx = {
    fontWeight: 700,
    color: '#64748B',
    fontSize: { xs: '0.6rem', sm: '0.68rem' },
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    bgcolor: '#F8FAFC',
    py: { xs: 0.9, sm: 1.1 },
    px: { xs: 0.8, sm: 1.2 },
  };
  const tdSx = {
    py: { xs: 0.9, sm: 1.1 },
    px: { xs: 0.8, sm: 1.2 },
    fontSize: { xs: '0.68rem', sm: '0.75rem' },
    borderBottom: '1px solid #F8FAFC',
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      disableRestoreFocus
      TransitionProps={{ onExited: () => { document.activeElement?.blur(); } }}
      PaperProps={{ sx: dlgPaper }}
    >
      <Box
        sx={{
          px: { xs: 2, sm: 3 },
          py: { xs: 2, sm: 2.5 },
          bgcolor: 'success.main',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box>
          <Typography
            variant="h6"
            fontWeight={700}
            color="white"
            sx={{ fontSize: { xs: '0.9rem', sm: '1rem', md: '1.1rem' } }}
          >
            Hire Candidates
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: 'rgba(255,255,255,0.8)', fontSize: { xs: '0.62rem', sm: '0.7rem' } }}
          >
            {process.job_title} · {vacancies} vacanc{vacancies === 1 ? 'y' : 'ies'}
          </Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ color: 'white' }} size="small">
          <Close />
        </IconButton>
      </Box>

      <DialogContent
        sx={{
          p: { xs: 2, sm: 3 },
          overflowY: 'auto',
          '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-thumb': { bgcolor: '#E2E8F0', borderRadius: 2 },
        }}
      >
        <Stack spacing={2}>
          {!loading && candidates.length === 0 && (
            <Alert severity="info" sx={{ borderRadius: '10px', fontSize: { xs: '0.75rem', sm: '0.82rem' } }}>
              No pending candidates have completed all rounds yet.
            </Alert>
          )}
          {loading ? (
            <Stack alignItems="center" sx={{ py: { xs: 3, sm: 4 } }}>
              <CircularProgress size={26} color="success" />
            </Stack>
          ) : candidates.length > 0 && (
            <>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip
                  label={`${selectedIds.size}/${vacancies} selected`}
                  color={tooMany ? 'error' : 'success'}
                  size="small"
                  sx={{ height: { xs: 20, sm: 24 }, fontSize: { xs: '0.62rem', sm: '0.7rem' } }}
                />
                <Chip
                  label={`${candidates.length - selectedIds.size} → Pending`}
                  size="small"
                  variant="outlined"
                  color="warning"
                  sx={{ height: { xs: 20, sm: 24 }, fontSize: { xs: '0.62rem', sm: '0.7rem' } }}
                />
              </Stack>
              <Box sx={{ overflowX: 'auto', '&::-webkit-scrollbar': { height: 3 }, '&::-webkit-scrollbar-thumb': { bgcolor: '#CBD5E1', borderRadius: 2 } }}>
                <Table size="small" sx={{ minWidth: { xs: 440, md: 'auto' } }}>
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox" sx={thSx}>
                        <Checkbox
                          size="small"
                          checked={selectedIds.size === candidates.length && candidates.length > 0}
                          indeterminate={selectedIds.size > 0 && selectedIds.size < candidates.length}
                          onChange={() =>
                            selectedIds.size === candidates.length
                              ? setSelectedIds(new Set())
                              : setSelectedIds(new Set(candidates.map(c => c.candidate_id)))
                          }
                        />
                      </TableCell>
                      {['Rank','Candidate','CPS','Outcome'].map(h => <TableCell key={h} sx={thSx}>{h}</TableCell>)}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {candidates.map(c => {
                      const isSel = selectedIds.has(c.candidate_id);
                      return (
                        <TableRow key={c.candidate_id} hover selected={isSel} sx={{ cursor: 'pointer' }} onClick={() => toggle(c.candidate_id)}>
                          <TableCell padding="checkbox" sx={tdSx}>
                            <Checkbox size="small" checked={isSel} onChange={() => toggle(c.candidate_id)} onClick={e => e.stopPropagation()} />
                          </TableCell>
                          <TableCell sx={tdSx}>
                            <Typography fontWeight={700} sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' }, color: c.rank <= 3 ? '#F59E0B' : 'inherit' }}>
                              {c.rank === 1 ? '🥇' : c.rank === 2 ? '🥈' : c.rank === 3 ? '🥉' : `#${c.rank}`}
                            </Typography>
                          </TableCell>
                          <TableCell sx={tdSx}>
                            <Stack direction="row" spacing={0.8} alignItems="center">
                              <Avatar sx={{ width: 24, height: 24, fontSize: '0.65rem', bgcolor: isSel ? 'success.main' : 'grey.400' }}>
                                {(c.candidate_name || '?')[0].toUpperCase()}
                              </Avatar>
                              <Box>
                                <Typography variant="body2" fontWeight={600} sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' }, whiteSpace: 'nowrap' }}>
                                  {c.candidate_name || `Candidate ${c.candidate_id}`}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.6rem', sm: '0.65rem' } }}>
                                  {c.candidate_email}
                                </Typography>
                              </Box>
                            </Stack>
                          </TableCell>
                          <TableCell sx={tdSx}>
                            <Typography variant="body2" fontWeight={700} color="primary.main" sx={{ fontSize: { xs: '0.72rem', sm: '0.78rem' } }}>
                              {(c.cgps_score ?? 0).toFixed(2)}
                            </Typography>
                          </TableCell>
                          <TableCell sx={tdSx}>
                            {isSel ? (
                              <Chip label="✓ Hire" color="success" size="small" sx={{ fontWeight: 700, height: { xs: 18, sm: 20 }, fontSize: { xs: '0.55rem', sm: '0.62rem' } }} />
                            ) : (
                              <Chip label="⏳ Pending" color="warning" size="small" variant="outlined" sx={{ height: { xs: 18, sm: 20 }, fontSize: { xs: '0.55rem', sm: '0.62rem' } }} />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Box>
            </>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 2.5 }, gap: 1 }}>
        <Box sx={{ flex: 1 }}>
          {tooMany && (
            <Typography variant="caption" color="error" fontWeight={600} sx={{ fontSize: { xs: '0.65rem', sm: '0.72rem' } }}>
              ⚠️ Only {vacancies} vacanc{vacancies === 1 ? 'y' : 'ies'} available
            </Typography>
          )}
        </Box>
        <Button onClick={onClose} sx={{ textTransform: 'none', fontSize: { xs: '0.78rem', sm: '0.85rem' } }}>Cancel</Button>
        <Button
          variant="contained"
          color="success"
          onClick={handleConfirm}
          disabled={saving || selectedIds.size === 0 || tooMany || candidates.length === 0}
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <WorkspacePremium />}
          sx={{ textTransform: 'none', borderRadius: '10px', fontSize: { xs: '0.78rem', sm: '0.85rem' } }}
        >
          {saving ? 'Hiring…' : `Confirm Hire (${selectedIds.size})`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CloseProcessDialog
// ═══════════════════════════════════════════════════════════════════════════════
export function CloseProcessDialog({ open, process, onClose, onConfirm }) {
  if (!process) return null;
  const approved  = process.vacancies_filled || 0;
  const vacancies = process.vacancies || 1;
  const remaining = Math.max(0, vacancies - approved);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      disableRestoreFocus
      TransitionProps={{ onExited: () => { document.activeElement?.blur(); } }}
      PaperProps={{
        sx: {
          borderRadius: { xs: '14px', sm: '16px' },
          m: { xs: 2, sm: 3 },
          '@media (max-width: 240px)': { m: 1.5 },
        },
      }}
    >
      <DialogTitle sx={{ px: { xs: 2, sm: 3 }, fontSize: { xs: '0.95rem', sm: '1rem' } }}>
        Close Interview Process
      </DialogTitle>
      <DialogContent sx={{ px: { xs: 2, sm: 3 } }}>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography sx={{ fontSize: { xs: '0.82rem', sm: '0.88rem' } }}>
            You are closing <strong>{process.job_title}</strong>.
          </Typography>
          <Box
            sx={{
              p: { xs: 1.5, sm: 2 },
              bgcolor: remaining > 0 ? 'warning.50' : 'success.50',
              borderRadius: { xs: '10px', sm: '12px' },
              border: '1px solid',
              borderColor: remaining > 0 ? 'warning.light' : 'success.light',
            }}
          >
            {[['Total vacancies', vacancies], ['Completed rounds', approved], ['Still vacant', remaining]].map(([label, val]) => (
              <Stack key={label} direction="row" justifyContent="space-between" sx={{ mb: 0.8 }}>
                <Typography variant="body2" sx={{ fontSize: { xs: '0.78rem', sm: '0.83rem' } }}>{label}:</Typography>
                <Typography
                  variant="body2"
                  fontWeight={700}
                  sx={{ fontSize: { xs: '0.78rem', sm: '0.83rem' } }}
                  color={label === 'Still vacant' ? (remaining > 0 ? 'warning.main' : 'success.main') : 'inherit'}
                >
                  {val}
                </Typography>
              </Stack>
            ))}
            {remaining > 0 ? (
              <Alert severity="warning" sx={{ mt: 1, py: 0.5, fontSize: { xs: '0.72rem', sm: '0.78rem' } }}>
                {remaining} position{remaining > 1 ? 's' : ''} still vacant.
              </Alert>
            ) : (
              <Alert severity="success" sx={{ mt: 1, py: 0.5, fontSize: { xs: '0.72rem', sm: '0.78rem' } }}>
                All {vacancies} position{vacancies > 1 ? 's' : ''} filled — safe to close!
              </Alert>
            )}
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 2.5 }, gap: 1 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none', fontSize: { xs: '0.78rem', sm: '0.85rem' } }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={() => onConfirm(remaining)}
          sx={{ textTransform: 'none', borderRadius: '10px', fontSize: { xs: '0.78rem', sm: '0.85rem' } }}
        >
          Confirm Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HiringDialog (legacy single-candidate)
// ═══════════════════════════════════════════════════════════════════════════════
export function HiringDialog({ open, process, scheduled, onClose, onDone }) {
  const { enqueueSnackbar } = useSnackbar();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    candidate_id: '', outcome_type: 'offer_letter',
    offer_letter_text: '', call_notes: '', process_notes: '',
  });
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  React.useEffect(() => {
    if (open) setForm({ candidate_id: '', outcome_type: 'offer_letter', offer_letter_text: '', call_notes: '', process_notes: '' });
  }, [open]);

  const completedCandidates = React.useMemo(() =>
    (!process || !scheduled) ? [] :
      scheduled.filter(s => String(s.process_id) === String(process.id) && s.status === 'completed'),
  [process, scheduled]);

  const handleSubmit = async () => {
    if (!form.candidate_id) { enqueueSnackbar('Please select a candidate', { variant: 'warning' }); return; }
    setSaving(true);
    try {
      await interviewAPI.recordHiringOutcome({ ...form, process_id: process?.id });
      enqueueSnackbar('Hiring outcome recorded!', { variant: 'success' });
      onDone(); onClose();
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.detail || 'Failed', { variant: 'error' });
    } finally { setSaving(false); }
  };

  const fieldSx = {
    '& .MuiInputBase-input': { fontSize: { xs: '0.78rem', sm: '0.83rem' } },
    '& .MuiInputLabel-root': { fontSize: { xs: '0.78rem', sm: '0.83rem' } },
    '& .MuiOutlinedInput-root': { borderRadius: '10px' },
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      disableRestoreFocus
      TransitionProps={{ onExited: () => { document.activeElement?.blur(); } }}
      PaperProps={{ sx: dlgPaper }}
    >
      <DialogTitle sx={{ px: { xs: 2, sm: 3 }, fontSize: { xs: '0.95rem', sm: '1rem' } }}>
        Record Hiring Outcome
      </DialogTitle>
      <DialogContent sx={{ px: { xs: 2, sm: 3 }, overflowY: 'auto' }}>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <FormControl fullWidth size="small" sx={fieldSx}>
            <InputLabel>Select Candidate *</InputLabel>
            <Select
              value={form.candidate_id}
              label="Select Candidate *"
              onChange={e => f('candidate_id', e.target.value)}
            >
              {completedCandidates.length === 0 && (
                <MenuItem disabled sx={{ fontSize: { xs: '0.78rem', sm: '0.83rem' } }}>
                  No completed candidates
                </MenuItem>
              )}
              {completedCandidates.map(s => {
                const name = s.candidate?.full_name || s.candidate?.email || `#${s.candidate_id}`;
                return (
                  <MenuItem key={String(s.candidate?.id || s.candidate_id)} value={String(s.candidate?.id || s.candidate_id)}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Avatar sx={{ width: 22, height: 22, fontSize: '0.6rem', bgcolor: 'success.light' }}>
                        {name[0]?.toUpperCase()}
                      </Avatar>
                      <Typography variant="body2" sx={{ fontSize: { xs: '0.78rem', sm: '0.83rem' } }}>
                        {name}
                      </Typography>
                    </Stack>
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small" sx={fieldSx}>
            <InputLabel>Outcome Type</InputLabel>
            <Select
              value={form.outcome_type}
              label="Outcome Type"
              onChange={e => f('outcome_type', e.target.value)}
            >
              <MenuItem value="offer_letter" sx={{ fontSize: { xs: '0.78rem', sm: '0.83rem' } }}>📧 Offer Letter</MenuItem>
              <MenuItem value="direct_call"  sx={{ fontSize: { xs: '0.78rem', sm: '0.83rem' } }}>📞 Direct Call</MenuItem>
              <MenuItem value="company_way"  sx={{ fontSize: { xs: '0.78rem', sm: '0.83rem' } }}>🏢 Company Process</MenuItem>
            </Select>
          </FormControl>

          {form.outcome_type === 'offer_letter' && (
            <TextField
              label="Offer Letter Text"
              multiline
              rows={4}
              fullWidth
              value={form.offer_letter_text}
              onChange={e => f('offer_letter_text', e.target.value)}
              sx={fieldSx}
            />
          )}
          {form.outcome_type === 'direct_call' && (
            <TextField
              label="Call Notes"
              multiline
              rows={3}
              fullWidth
              size="small"
              value={form.call_notes}
              onChange={e => f('call_notes', e.target.value)}
              sx={fieldSx}
            />
          )}
          {form.outcome_type === 'company_way' && (
            <TextField
              label="Process Notes"
              multiline
              rows={3}
              fullWidth
              size="small"
              value={form.process_notes}
              onChange={e => f('process_notes', e.target.value)}
              sx={fieldSx}
            />
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 2.5 }, gap: 1 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none', fontSize: { xs: '0.78rem', sm: '0.85rem' } }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={saving || !form.candidate_id}
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : null}
          sx={{ textTransform: 'none', borderRadius: '10px', fontSize: { xs: '0.78rem', sm: '0.85rem' } }}
        >
          {saving ? 'Saving…' : 'Confirm Outcome'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}