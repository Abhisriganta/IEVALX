// BUILD: 2026-09-04-iaem-calibration-mgmt-v5
// Single dialog: level + skills + deadline + videos → create on final submit
// Skills filter which interviewers get assigned
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Button, Skeleton, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, IconButton, MenuItem,
  LinearProgress, Alert, Divider, Autocomplete,
} from '@mui/material';
import { ThemeProvider, createTheme, useTheme } from '@mui/material/styles';
import { Add, Close, CloudUpload, VideoFile, Delete, CheckCircle } from '@mui/icons-material';
import { calibrationService } from '@/services/api/iaem';

const MAX_VIDEOS = 4;
const MIN_VIDEOS = 2;
const OTHER_SENTINEL = '__OTHER__';

/* ── pine / sage scoped palette ──────────────────────────────────── */
const T = {
  pine:     '#08302F',
  pineDk:   '#04282B',
  pineHov:  '#0a3d40',
  sage:     '#8FB08E',
  sageDk:   '#5E815D',
  sageLt:   '#E8F0E8',
  sageXLt:  '#F4F7F2',
  ink:      '#2F332E',
  body:     '#2F332E',
  muted:    '#7A7E76',
  faint:    '#9CA3AF',
  line:     '#E7EAE3',
  lineSoft: '#F0F2ED',
  greenBg:  '#ECFDF5',
  greenTxt: '#065F46',
  amberBg:  '#FFFBEB',
  amberTxt: '#92400E',
  redBg:    '#FEF2F2',
  redTxt:   '#991B1B',
};

const CalibrationManagement = () => {
  const navigate = useNavigate();
  const outerTheme = useTheme();
  const scopedTheme = useMemo(() => createTheme(outerTheme, {
    palette: {
      primary:    { main: T.pine, light: T.sage, dark: T.pineDk, contrastText: '#FFFFFF' },
      text:       { primary: T.ink, secondary: T.muted },
      background: { default: T.sageXLt, paper: '#FFFFFF' },
      divider:    T.line,
    },
  }), [outerTheme]);
    const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);

  const reload = () => calibrationService.getSessions()
    .then(r => setSessions(r.data.sessions || []))
    .catch(console.error)
    .finally(() => setLoading(false));

  useEffect(() => { reload(); }, []);

  return (
    <ThemeProvider theme={scopedTheme}>
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: T.pine }}>Calibration Management</Typography>
          <Typography variant="body2" sx={{ color: T.muted }}>
            Schedule calibration sessions with skill-specific reference videos.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => setDialog(true)}
          sx={{ textTransform: 'none', fontWeight: 600, bgcolor: T.pineDk, '&:hover': { bgcolor: T.pineHov } }}>
          New Session
        </Button>
      </Box>

      <Paper elevation={0} sx={{ borderRadius: 2.5, border: `1px solid ${T.line}`, overflow: 'hidden' }}>
        {loading ? <Box sx={{ p: 3 }}><Skeleton height={100} /></Box> : (
          <TableContainer><Table size="small"><TableHead><TableRow sx={{ bgcolor: T.sageLt }}>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.78rem', color: T.sageDk }}>Session</TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.78rem', color: T.sageDk }}>Level</TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.78rem', color: T.sageDk }}>Skills</TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.78rem', color: T.sageDk }}>Videos</TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.78rem', color: T.sageDk }}>Deadline</TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.78rem', color: T.sageDk }}>Progress</TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.78rem', color: T.sageDk }}>Status</TableCell>
            <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.78rem', color: T.sageDk }}>Action</TableCell>
          </TableRow></TableHead><TableBody>
            {sessions.map(s => (
              <TableRow key={s.session_id} hover sx={{ '&:hover': { bgcolor: '#FAFCF8' } }}>
                <TableCell><Typography variant="body2" sx={{ fontWeight: 600, color: T.ink }}>{s.session_id}</Typography></TableCell>
                <TableCell><Typography variant="body2" sx={{ color: T.ink }}>{s.level}</Typography></TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {(s.skills || []).slice(0, 3).map(sk => (
                      <Chip key={sk} label={sk} size="small"
                        sx={{ height: 20, fontSize: '0.68rem', fontWeight: 600, bgcolor: T.sageLt, color: T.pine }} />
                    ))}
                    {(s.skills || []).length > 3 && (
                      <Chip label={`+${s.skills.length - 3}`} size="small"
                        sx={{ height: 20, fontSize: '0.68rem', fontWeight: 600, bgcolor: T.lineSoft, color: T.sageDk }} />
                    )}
                    {(s.skills || []).length === 0 && (
                      <Typography variant="caption" sx={{ color: T.faint }}>All skills</Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip label={`${s.reference_count}`} size="small"
                    sx={{ bgcolor: s.reference_count > 0 ? T.greenBg : T.redBg,
                      color: s.reference_count > 0 ? T.greenTxt : T.redTxt, fontWeight: 700, fontSize: '0.72rem' }} />
                </TableCell>
                <TableCell><Typography variant="body2" sx={{ color: T.muted }}>{s.deadline}</Typography></TableCell>
                <TableCell><Typography variant="body2" sx={{ fontWeight: 600, color: T.ink }}>{s.completed_count} / {s.assigned_count}</Typography></TableCell>
                <TableCell><Chip label={s.status} size="small" sx={{ bgcolor: s.status === 'COMPLETED' ? T.greenBg : s.status === 'EXPIRED' ? T.redBg : T.amberBg, color: s.status === 'COMPLETED' ? T.greenTxt : s.status === 'EXPIRED' ? T.redTxt : T.amberTxt, fontWeight: 700, fontSize: '0.72rem' }} /></TableCell>
                <TableCell align="right">
                  <Button size="small" onClick={() => navigate(`/employer/iaem-calibration/${s.session_id}`)}
                    sx={{ textTransform: 'none', fontWeight: 600, color: T.pine }}>Details</Button>
                </TableCell>
              </TableRow>
            ))}
            {sessions.length === 0 && (
              <TableRow><TableCell colSpan={8} sx={{ textAlign: 'center', py: 4, color: T.muted }}>No calibration sessions yet.</TableCell></TableRow>
            )}
          </TableBody></Table></TableContainer>
        )}
      </Paper>

      <NewSessionDialog open={dialog} onClose={() => setDialog(false)} onCreated={() => { setDialog(false); reload(); }} />
    </Box>
    </ThemeProvider>
  );
};


// ══════════════════════════════════════════════════════════════════════════
// Single dialog: level + skills + deadline + videos → one submit
// ══════════════════════════════════════════════════════════════════════════
const NewSessionDialog = ({ open, onClose, onCreated }) => {
  const [level, setLevel] = useState('');
  const [notifDialog, setNotifDialog] = useState({ open: false, message: '' });
  const [deadline, setDeadline] = useState('');
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [companySkills, setCompanySkills] = useState([]);
  const [loadingSkills, setLoadingSkills] = useState(false);

  // "Other" custom skill input
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customSkill, setCustomSkill] = useState('');

  // Video files (client-side only until submit)
  const [files, setFiles] = useState([]);
  const fileRef = useRef(null);

  // Creation progress
  const [creating, setCreating] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');

  // Load company skills when dialog opens
  useEffect(() => {
    if (open) {
      setLoadingSkills(true);
      calibrationService.getCompanySkills()
        .then(r => setCompanySkills(r.data.skills || []))
        .catch(console.error)
        .finally(() => setLoadingSkills(false));
    }
  }, [open]);

  const reset = () => {
    setLevel(''); setDeadline(''); setSelectedSkills([]); setFiles([]);
    setShowCustomInput(false); setCustomSkill('');
    setCreating(false); setProgress(''); setError('');
  };

  const handleClose = () => { if (creating) return; reset(); onClose(); };

  // ── Skills: Autocomplete onChange handler ──
  const handleSkillsChange = (_, val) => {
    if (val.includes(OTHER_SENTINEL)) {
      setShowCustomInput(true);
      return;
    }
    setSelectedSkills(val);
  };

  const addCustomSkill = () => {
    const trimmed = customSkill.trim();
    if (trimmed && !selectedSkills.includes(trimmed)) {
      setSelectedSkills(prev => [...prev, trimmed]);
    }
    setCustomSkill('');
    setShowCustomInput(false);
  };

  // ── File management ──
  const handleFilesSelected = (e) => {
    const selected = Array.from(e.target.files || []);
    const remaining = MAX_VIDEOS - files.length;
    const toAdd = selected.slice(0, remaining).map((f, i) => ({
      file: f,
      title: `Reference Interview ${files.length + i + 1}`,
    }));
    setFiles(prev => [...prev, ...toAdd]);
    if (fileRef.current) fileRef.current.value = '';
  };

  const removeFile = (idx) => {
    setFiles(prev => prev.filter((_, i) => i !== idx).map((f, i) => ({
      ...f, title: `Reference Interview ${i + 1}`,
    })));
  };

  const updateTitle = (idx, title) => {
    setFiles(prev => prev.map((f, i) => i === idx ? { ...f, title } : f));
  };

  // ── Validation ──
  const canCreate = level && deadline && selectedSkills.length >= 1 && files.length >= MIN_VIDEOS && !creating;

  // ── Submit: create session → upload videos ──
  const handleCreate = async () => {
    if (!canCreate) return;
    setCreating(true);
    setError('');

    try {
      setProgress('Creating calibration session...');
      const res = await calibrationService.createSession(level, deadline, selectedSkills);
      const sessionId = res.data.session_id;
      const assigned = res.data.assigned_count;
      const skipped = res.data.skipped_count || 0;

      for (let i = 0; i < files.length; i++) {
        setProgress(`Uploading video ${i + 1} of ${files.length}: "${files[i].title}"...`);
        await calibrationService.uploadReference(sessionId, files[i].file, files[i].title, '');
      }

      setProgress('');
      setNotifDialog({ open: true, message:
        `Calibration session created!\n\n` +
        `• Skills: ${selectedSkills.join(', ')}\n` +
        `• ${files.length} reference video(s) uploaded\n` +
        `• ${assigned} interviewer(s) with matching skills assigned\n` +
        (skipped > 0 ? `• ${skipped} interviewer(s) skipped (no matching skills)\n` : '') +
        `• Deadline: ${deadline}`
      });
      reset();
      onCreated();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Something went wrong. Please try again.');
      setProgress('');
      setCreating(false);
    }
  };

  const totalSizeMB = files.reduce((sum, f) => sum + f.file.size, 0) / (1024 * 1024);

  // Dropdown options: company skills + "Other" at the bottom
  const skillOptions = [...companySkills, OTHER_SENTINEL];

  /* sx shared by every outlined TextField — green focus, no blue */
  const gf = {
    '& .MuiOutlinedInput-root': {
      borderRadius: 2,
      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: T.sage },
      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: T.pine, borderWidth: 2 },
    },
    '& .MuiInputLabel-root.Mui-focused': { color: T.pine },
    '& .MuiFormHelperText-root': { color: T.sageDk, mt: 0.5 },
  };

  return (
    <>
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 4, maxHeight: '80vh', display: 'flex', flexDirection: 'column' } }}>

      {/* ── Pine header strip ── */}
      <Box sx={{ bgcolor: T.pine, px: 3, py: 2.2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography sx={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>New Calibration Session</Typography>
          <Typography sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', mt: 0.25 }}>
            Configure level, skills, deadline and reference videos.
          </Typography>
        </Box>
        <IconButton size="small" onClick={handleClose} disabled={creating}
          sx={{ color: 'rgba(255,255,255,0.7)', '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.1)' } }}>
          <Close fontSize="small" />
        </IconButton>
      </Box>

      <DialogContent sx={{
        display: 'flex', flexDirection: 'column', gap: 2.5, pt: 3, pb: 1, px: 3,
        flex: 1, minHeight: 0, overflowY: 'auto',
        '&::-webkit-scrollbar': { width: 8 },
        '&::-webkit-scrollbar-thumb': { bgcolor: T.line, borderRadius: 4 },
        '&::-webkit-scrollbar-thumb:hover': { bgcolor: T.sageDk },
        '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
      }}>

        {/* ── Level & Deadline side-by-side ── */}
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField select fullWidth size="small" label="Interview Level" value={level}
            onChange={e => setLevel(e.target.value)} disabled={creating} required sx={gf}>
            <MenuItem value="L0">L0 — Screening</MenuItem>
            <MenuItem value="L1">L1 — Core Technical</MenuItem>
            <MenuItem value="L2">L2 — Deep Technical</MenuItem>
            <MenuItem value="L3">L3 — Architecture / System Design</MenuItem>
            <MenuItem value="PM">PM — Product Management</MenuItem>
            <MenuItem value="HR">HR — Culture & Fit</MenuItem>
          </TextField>

          <TextField fullWidth size="small" type="date" label="Completion Deadline" value={deadline}
            onChange={e => setDeadline(e.target.value)} disabled={creating}
            InputLabelProps={{ shrink: true }}
            sx={{ ...gf, '& .MuiInputLabel-root': { bgcolor: '#fff', px: 0.5 } }} />
        </Box>

        {/* ── Skills — with "Other" option ── */}
        <Autocomplete
          multiple
          options={skillOptions}
          value={selectedSkills}
          onChange={handleSkillsChange}
          loading={loadingSkills}
          disabled={creating}
          filterSelectedOptions
          getOptionLabel={(opt) => opt === OTHER_SENTINEL ? 'Other (Add Custom Skill)' : opt}
          renderOption={(props, option) => (
            <li {...props} key={option}>
              {option === OTHER_SENTINEL ? (
                <Typography variant="body2" sx={{ fontStyle: 'italic', color: T.sageDk, fontWeight: 600 }}>
                  + Other (Add Custom Skill)
                </Typography>
              ) : option}
            </li>
          )}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip {...getTagProps({ index })} key={option} label={option} size="small"
                sx={{ bgcolor: T.pine, color: '#fff', fontWeight: 600, fontSize: '0.73rem',
                      '& .MuiChip-deleteIcon': { color: 'rgba(255,255,255,0.5)', '&:hover': { color: '#fff' } } }} />
            ))
          }
          renderInput={(params) => (
            <TextField {...params} size="small" label="Skills *"
              placeholder={selectedSkills.length === 0 ? 'Select skills from list or add custom' : ''}
              helperText="Only interviewers with matching skills will be assigned."
              sx={gf} />
          )}
        />

        {/* Custom skill input — shown when "Other" is clicked */}
        {showCustomInput && (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
            <TextField size="small" fullWidth label="Custom Skill Name" value={customSkill}
              onChange={e => setCustomSkill(e.target.value)} autoFocus
              placeholder="e.g. Kubernetes, Tableau, SAP HANA"
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomSkill(); } }}
              sx={gf} />
            <Button variant="contained" size="small" onClick={addCustomSkill}
              disabled={!customSkill.trim()}
              sx={{ textTransform: 'none', fontWeight: 600, minWidth: 64, mt: '1px',
                    bgcolor: T.pine, '&:hover': { bgcolor: T.pineHov } }}>
              Add
            </Button>
            <Button size="small" onClick={() => { setShowCustomInput(false); setCustomSkill(''); }}
              sx={{ textTransform: 'none', color: T.muted, minWidth: 'auto', mt: '1px' }}>
              Cancel
            </Button>
          </Box>
        )}

        {/* ── Videos Section ── */}
        <Box sx={{ border: `1.5px solid ${T.line}`, borderRadius: 3, overflow: 'hidden' }}>
          {/* Section header */}
          <Box sx={{ bgcolor: T.sageXLt, px: 2, py: 1.2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: T.sageDk, letterSpacing: '0.03em' }}>
              REFERENCE VIDEOS
            </Typography>
            <Typography sx={{ fontSize: '0.72rem', color: T.faint }}>
              {files.length} of {MIN_VIDEOS}–{MAX_VIDEOS}
            </Typography>
          </Box>

          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box sx={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1.5, pr: files.length > 2 ? 0.5 : 0 }}>
            {files.map((f, idx) => (
              <Box key={idx} sx={{
                p: 1.5, border: `1px solid ${T.lineSoft}`, borderRadius: 2,
                display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: '#FAFCF9',
              }}>
                <Box sx={{
                  width: 36, height: 36, borderRadius: 2, bgcolor: T.sageLt,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <VideoFile sx={{ color: T.pine, fontSize: 20 }} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <TextField size="small" variant="standard" value={f.title}
                    onChange={e => updateTitle(idx, e.target.value)} disabled={creating} fullWidth
                    sx={{ '& input': { fontWeight: 600, fontSize: '0.84rem', py: 0, color: T.ink },
                          '& .MuiInput-underline:before': { borderColor: 'transparent' },
                          '& .MuiInput-underline:hover:before': { borderColor: T.line },
                          '& .MuiInput-underline:after': { borderColor: T.pine } }} />
                  <Typography variant="caption" sx={{ color: T.faint, display: 'block', mt: 0.25 }}>
                    {f.file.name} — {(f.file.size / (1024 * 1024)).toFixed(1)} MB
                  </Typography>
                </Box>
                {!creating && (
                  <IconButton size="small" onClick={() => removeFile(idx)} sx={{ color: T.faint, '&:hover': { color: T.redTxt } }}>
                    <Delete fontSize="small" />
                  </IconButton>
                )}
              </Box>
            ))}

            {files.length < MAX_VIDEOS && !creating && (
              <Button variant="outlined" startIcon={<CloudUpload />} component="label"
                sx={{
                  textTransform: 'none', fontWeight: 600, fontSize: '0.84rem',
                  borderColor: T.sage, color: T.pine, borderStyle: 'dashed', borderWidth: 2,
                  borderRadius: 2, py: 1.8, flexShrink: 0,
                  '&:hover': { borderColor: T.pine, bgcolor: T.sageXLt },
                }}>
                {files.length === 0 ? 'Click to upload videos (MP4, WebM, MOV)' : `Add more (${MAX_VIDEOS - files.length} remaining)`}
                <input ref={fileRef} type="file" hidden accept="video/*" multiple onChange={handleFilesSelected} />
              </Button>
            )}
            </Box>

            {files.length > 0 && files.length < MIN_VIDEOS && (
              <Typography variant="caption" sx={{ color: T.amberTxt, textAlign: 'center' }}>
                Minimum {MIN_VIDEOS} videos required — add {MIN_VIDEOS - files.length} more.
              </Typography>
            )}

            {files.length === 0 && (
              <Typography variant="caption" sx={{ color: T.faint, textAlign: 'center', pb: 0.5 }}>
                Upload {MIN_VIDEOS}–{MAX_VIDEOS} reference interview recordings.
              </Typography>
            )}
          </Box>
        </Box>

        {/* Ready summary */}
        {canCreate && (
          <Box sx={{ bgcolor: T.greenBg, borderRadius: 2, px: 2, py: 1.2, border: `1px solid ${T.sage}` }}>
            <Typography variant="caption" sx={{ color: T.greenTxt, fontWeight: 500 }}>
              Ready — {files.length} video{files.length > 1 ? 's' : ''} ({totalSizeMB.toFixed(1)} MB).
              Interviewers with [{selectedSkills.join(', ')}] skills will be assigned.
            </Typography>
          </Box>
        )}

        {creating && progress && (
          <Box>
            <LinearProgress sx={{ borderRadius: 1, mb: 1, height: 5,
              bgcolor: T.sageLt, '& .MuiLinearProgress-bar': { bgcolor: T.pine } }} />
            <Typography variant="caption" sx={{ color: T.pine, fontWeight: 600 }}>{progress}</Typography>
          </Box>
        )}

        {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1.5, borderTop: `1px solid ${T.lineSoft}` }}>
        <Button onClick={handleClose} disabled={creating}
          sx={{ textTransform: 'none', fontWeight: 600, color: T.muted, '&:hover': { bgcolor: T.sageXLt } }}>
          Cancel
        </Button>
        <Button variant="contained" disabled={!canCreate} onClick={handleCreate}
          sx={{ textTransform: 'none', fontWeight: 700, px: 4, borderRadius: 2,
                bgcolor: T.pine, '&:hover': { bgcolor: T.pineHov },
                '&.Mui-disabled': { bgcolor: T.lineSoft, color: T.faint } }}>
          {creating ? 'Creating...' : `Create Session (${files.length} video${files.length !== 1 ? 's' : ''})`}
        </Button>
      </DialogActions>
    </Dialog>

    {/* Notification Dialog */}
    <Dialog open={notifDialog.open} onClose={() => setNotifDialog({ open: false, message: '' })} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
      <Box sx={{ bgcolor: '#EDF7ED', px: 3, py: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <CheckCircle sx={{ color: '#2E7D32', fontSize: 28 }} />
        <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#2E7D32' }}>Success</Typography>
      </Box>
      <DialogContent sx={{ px: 3, py: 2.5 }}>
        <Typography sx={{ fontSize: '0.92rem', color: '#1F1F1F', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{notifDialog.message}</Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={() => setNotifDialog({ open: false, message: '' })} variant="contained" disableElevation
          sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, px: 4, bgcolor: '#2E7D32', '&:hover': { filter: 'brightness(0.9)', bgcolor: '#2E7D32' } }}>
          OK
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
};

export default CalibrationManagement;