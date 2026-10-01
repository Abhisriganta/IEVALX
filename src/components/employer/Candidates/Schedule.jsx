import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Stack, CircularProgress, Grid,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  Select, FormControl, InputLabel, Alert, IconButton, InputAdornment,
  Checkbox, Tooltip, Avatar, Chip, useMediaQuery, useTheme,
} from '@mui/material';
import {
  Assignment, Close, Search, Send, CheckCircle, Upload, InfoOutlined,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { interviewAPI } from '../../../services/api/employer/candidateService';
import jobService from '../../../services/api/employer/jobService';
import applicantService from '../../../services/api/employer/ApplicantService';
import axiosInstance from '../../../services/api/axiosInstance';

// REPLACE the entire jobsAPI block with this:
const jobsAPI = {
  getMyJobs: () =>
    jobService.listMyJobs()
      .then(response => {
        // Unwrap axios response wrapper first, then handle all payload shapes
        const payload = response?.data ?? response;
        const raw = Array.isArray(payload)
          ? payload
          : (payload?.jobs ?? payload?.results ?? payload?.data ?? []);
        return { data: Array.isArray(raw) ? raw : [] };
      })
      .catch(err => {
        console.error('[Schedule jobsAPI.getMyJobs] failed:', err?.message);
        return { data: [] };
      }),

  getApplicants: (jobId, params = {}) =>
    applicantService.listByJob(jobId, params?.status || '')
      .then(response => {
        const raw = Array.isArray(response)
          ? response
          : (response?.Applications ?? response?.results ?? response?.data ?? []);
        return { data: Array.isArray(raw) ? raw : [] };
      })
      .catch(err => {
        console.error(`[Schedule jobsAPI.getApplicants] job_id=${jobId} failed:`, err?.message);
        return { data: [] };
      }),
};

// ── Inlined helpers (unchanged logic) ────────────────────────────────────────
function toISO(date, time, ampm) {
  if (!date || !time) return '';
  try {
    const [h, m] = time.split(':').map(Number);
    let hour = h;
    if (ampm === 'PM' && h < 12) hour = h + 12;
    if (ampm === 'AM' && h === 12) hour = 0;
    return `${date}T${String(hour).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  } catch { return ''; }
}

async function detectPdfType(file) {
  if (!file) return 'unknown';
  const ext = (file.name || '').split('.').pop().toLowerCase();
  if (ext !== 'pdf') return 'not-pdf';
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const chunk = new TextDecoder('latin1').decode(e.target.result);
        const hasFont = chunk.includes('/Font');
        const hasBT   = chunk.includes('BT\n') || chunk.includes('BT\r') || chunk.includes(' BT ');
        const hasTj   = chunk.includes('Tj\n') || chunk.includes('Tj ') || chunk.includes('TJ\n') || chunk.includes('TJ ');
        resolve((hasFont || hasBT || hasTj) ? 'text' : 'image');
      } catch { resolve('unknown'); }
    };
    reader.onerror = () => resolve('unknown');
    reader.readAsArrayBuffer(file.slice(0, 51200));
  });
}

// ── TimePicker (responsive) ───────────────────────────────────────────────────
function TimePicker({ label, timeValue, ampmValue, onTimeChange, onAmpmChange }) {
  const hours   = ['01','02','03','04','05','06','07','08','09','10','11','12'];
  const minutes = ['00','15','30','45'];
  const [h, m]  = (timeValue || '').split(':');

  const selectSx = {
    '& .MuiInputLabel-root': { fontSize: { xs: '0.68rem', sm: '0.75rem' } },
    '& .MuiSelect-select': { py: { xs: '6px', sm: '8px' }, fontSize: { xs: '0.72rem', sm: '0.8rem' } },
    '& .MuiOutlinedInput-root': {
      borderRadius: '8px',
      '& fieldset': { borderColor: '#E2E8F0' },
      '&.Mui-focused fieldset': { borderColor: '#1E3358' },
    },
  };

  return (
    <Stack direction="row" spacing={0.5} alignItems="center">
      <FormControl size="small" sx={{ width: { xs: 60, sm: 72 }, ...selectSx }}>
        <InputLabel>{label} Hr</InputLabel>
        <Select
          value={h || ''}
          label={`${label} Hr`}
          onChange={e => onTimeChange(`${e.target.value}:${m || '00'}`)}
        >
          {hours.map(v => <MenuItem key={v} value={v} sx={{ fontSize: { xs: '0.72rem', sm: '0.8rem' } }}>{v}</MenuItem>)}
        </Select>
      </FormControl>
      <Typography variant="body1" fontWeight={700} color="text.secondary" sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>:</Typography>
      <FormControl size="small" sx={{ width: { xs: 60, sm: 72 }, ...selectSx }}>
        <InputLabel>Min</InputLabel>
        <Select
          value={m || ''}
          label="Min"
          onChange={e => onTimeChange(`${h || '09'}:${e.target.value}`)}
        >
          {minutes.map(v => <MenuItem key={v} value={v} sx={{ fontSize: { xs: '0.72rem', sm: '0.8rem' } }}>{v}</MenuItem>)}
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ width: { xs: 60, sm: 72 }, ...selectSx }}>
        <InputLabel>AM/PM</InputLabel>
        <Select
          value={ampmValue || 'AM'}
          label="AM/PM"
          onChange={e => onAmpmChange(e.target.value)}
        >
          <MenuItem value="AM" sx={{ fontSize: { xs: '0.72rem', sm: '0.8rem' } }}>AM</MenuItem>
          <MenuItem value="PM" sx={{ fontSize: { xs: '0.72rem', sm: '0.8rem' } }}>PM</MenuItem>
        </Select>
      </FormControl>
    </Stack>
  );
}

// ── Default form factory (unchanged) ─────────────────────────────────────────
function buildDefaultForm(pipelineRoundType, preJobTitle, pipelineRoundName,
                           pipelineRoundNumber, pipelineVacancies, preJobId) {

  const pad = n => String(n).padStart(2, '0');
  const now = new Date();
  const end = new Date(Date.now() + 86400000);
  const startDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const endDate   = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`;
  const iso = (date, time, ampm) => {
    const [h, m] = time.split(':').map(Number);
    let hour = h;
    if (ampm === 'PM' && h < 12) hour += 12;
    if (ampm === 'AM' && h === 12) hour = 0;
    // Emit IST-anchored ISO string so the backend can't misinterpret.
    return `${date}T${pad(hour)}:${pad(m)}:00+05:30`;
  };
  return {
    interview_type: pipelineRoundType || 'ai-powered',
    interview_name: preJobTitle
      ? `${preJobTitle} — ${pipelineRoundName || `Round ${pipelineRoundNumber || 1}`}`
      : '',
     job_title:    preJobTitle || '',
    job_id:       String(preJobId || ''),
    round_number: pipelineRoundNumber || 1,
    total_rounds: 1,
    vacancies:    pipelineVacancies || 1,
    difficulty:   'junior',
    window_start_date: startDate, window_start_time: '09:00', window_start_ampm: 'AM',
    window_end_date:   endDate,   window_end_time:   '06:00', window_end_ampm:   'PM',
    window_start: iso(startDate, '09:00', 'AM'),
    window_end:   iso(endDate,   '06:00', 'PM'),
    scheduled_date: '', scheduled_time: '10:00', scheduled_ampm: 'AM',
    scheduled_end_date: '', scheduled_end_time: '11:00', scheduled_end_ampm: 'AM',
    duration_mins: '',
    platform:      'google-meet',
    meeting_url:   '',
    notify_app: true, notify_email: true, notify_sms:            false,   
    questions_per_candidate: '',
    interview_mode: 'standard',  
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ScheduleDialog
// ═══════════════════════════════════════════════════════════════════════════════
export default function ScheduleDialog({
  open, preSelected, preJobTitle, preJobId,
  pipelineRoundType, pipelineVacancies, pipelineRoundNumber, pipelineRoundName,
  pipelineLocked, processes = [], onClose, onDone,
  extraCandidates = [],   // ← inject candidates not in shortlisted list
}) {
  const { enqueueSnackbar } = useSnackbar();
  const theme    = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isXs     = useMediaQuery(theme.breakpoints.down('sm'));

  // ── State (unchanged) ─────────────────────────────────────────────────────
  const [saving,             setSaving]             = useState(false);
  const [reviewMode,         setReviewMode]         = useState(false);
  const [candidates,         setCandidates]         = useState([]);
  const [loadingC,           setLoadingC]           = useState(false);
  const [selected,           setSelected]           = useState(new Set());
  const [searchC,            setSearchC]            = useState('');
  const [docFile,            setDocFile]            = useState(null);
  const [docFileType,        setDocFileType]        = useState(null);
  const [docUploadWarnings,  setDocUploadWarnings]  = useState([]);
  const [candidateRounds,    setCandidateRounds]    = useState({});
  const [matchedProc,        setMatchedProc]        = useState(null);
  const [form,               setForm]               = useState(() =>
    buildDefaultForm(pipelineRoundType, preJobTitle, pipelineRoundName,
                     pipelineRoundNumber, pipelineVacancies, preJobId));


  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // ── Keep window ISO strings in sync (unchanged) ───────────────────────────
  useEffect(() => {
    if (form.window_start_date && form.window_start_time) {
      const iso = toISO(form.window_start_date, form.window_start_time, form.window_start_ampm || 'AM');
      if (iso !== form.window_start) setForm(p => ({ ...p, window_start: iso }));
    }
    if (form.window_end_date && form.window_end_time) {
      const iso = toISO(form.window_end_date, form.window_end_time, form.window_end_ampm || 'PM');
      if (iso !== form.window_end) setForm(p => ({ ...p, window_end: iso }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.window_start_date, form.window_start_time, form.window_start_ampm,
      form.window_end_date,   form.window_end_time,   form.window_end_ampm]);

  // ── Load candidates + compute per-candidate next round on open (unchanged)
  useEffect(() => {
    if (!open) return;
    setLoadingC(true);
    setSelected(new Set());
    setSearchC('');
    setDocFile(null);
    setDocFileType(null);
    setReviewMode(false);
    setForm(buildDefaultForm(pipelineRoundType, preJobTitle, pipelineRoundName,
                              pipelineRoundNumber, pipelineVacancies, preJobId));

    jobsAPI.getMyJobs()
      .then(async r => {
        const jobs = r.data?.results || r.data || [];
        const all  = [];
        await Promise.allSettled(
          jobs.map(job =>
            jobsAPI.getApplicants(job.id, { status: 'shortlisted' })
              .then(res => {
                (res.data?.results || res.data || [])
                  .filter(a => {
  const s  = (a.status             || '').toLowerCase();
  const as = (a.application_status || '').toLowerCase();
  return s === 'shortlisted' || as === 'shortlisted';
})
                  .forEach(a => all.push({
                    ...a,
                    job_title: a.job_title || job.title,
                    job_id:    a.job_id    || job.id,
                  }));
              })
              .catch(() => {})
          )
        );

        const filtered = (preJobId || preJobTitle)
          ? all.filter(c =>
              (preJobId && String(c.job_id) === String(preJobId)) ||
              (!preJobId && c.job_title === preJobTitle))
          : all;

        const existingIds = new Set(filtered.map(c =>
          String(c.candidate?.id || c.candidate_id || c.id)
        ));
        const merged = [
          ...filtered,
          ...extraCandidates.filter(c =>
            !existingIds.has(String(c.candidate?.id || c.candidate_id || c.id))
          ),
        ];
        setCandidates(merged);


        try {
          const proc = (processes || []).find(p =>
            (preJobId && String(p.job_ref || p.job_id || p.job) === String(preJobId)) ||
            (!preJobId && (p.job_title || '').trim().toLowerCase() === (preJobTitle || '').trim().toLowerCase())
          );
          if (proc?.id) {
            setMatchedProc(proc);
            const totalRounds   = proc.rounds_count || (proc.rounds?.length || 1);
            const candStatusMap = {};
            for (let rn = 1; rn <= totalRounds; rn++) {
              try {
                const rr   = await interviewAPI.getRanking(proc.id, rn);
                const rows = rr.data?.results || rr.data || [];
                rows.forEach(row => {
                  const cid = String(row.candidate_id);
                  if (!candStatusMap[cid]) candStatusMap[cid] = {};
                  candStatusMap[cid][rn] = row.status;
                });
              } catch (_) { /* round may not have rankings yet */ }
            }
            const nextRoundMap = {};
            merged.forEach(c => {
              const cid = String(
                c.candidate_id || c.candidate?.id || c.applicant?.id || c.applicant_id || c.user?.id || c.user_id || ''
              );
              if (!cid) return;
              const statuses     = candStatusMap[cid] || {};
              const rounds       = Object.keys(statuses).map(Number).sort((a, b) => a - b);
              if (rounds.length === 0) {
                nextRoundMap[cid] = { state: 'not_started', round: 1, schedulable: true, nextRound: 1 };
                return;
              }
              const highestRound  = rounds[rounds.length - 1];
              const highestStatus = statuses[highestRound];
              if (highestStatus === 'rejected') {
                nextRoundMap[cid] = { state: 'rejected', round: highestRound, schedulable: false, nextRound: null };
              } else if (highestStatus === 'pending') {
                nextRoundMap[cid] = { state: 'pending', round: highestRound, schedulable: false, nextRound: null };
              } else if (highestStatus === 'approved') {
                if (highestRound >= totalRounds) {
                  nextRoundMap[cid] = { state: 'completed', round: totalRounds, schedulable: false, nextRound: null };
                } else {
                  nextRoundMap[cid] = { state: 'advanced', round: highestRound + 1, schedulable: true, nextRound: highestRound + 1 };
                }
              } else {
                nextRoundMap[cid] = { state: 'not_started', round: 1, schedulable: true, nextRound: 1 };
              }
            });
             extraCandidates.forEach(c => {
              const cid = String(c.candidate?.id || c.candidate_id || c.id || '');
              if (cid) {
                nextRoundMap[cid] = {
                  state:       'pending_pool_reschedule',
                  round:       c.round_number || 1,
                  schedulable: true,
                  nextRound:   c.round_number || 1,
                };
              }
            });
            setCandidateRounds(nextRoundMap);
          }
        } catch (e) {
          console.error('Failed to compute per-candidate next rounds:', e);
          setCandidateRounds({});
        }

        if (preSelected) {
          const preStr = String(preSelected);
          const found  = merged.find(c =>
            String(c.candidate?.id || c.applicant?.id || c.applicant_id || c.user?.id || c.user_id || '') === preStr
          ) || merged.find(c => String(c.id) === preStr);
          if (found) {
            setSelected(new Set([found.id]));
            if (found.job_title) f('job_id', String(found.job_id || ''));
          }
        } else if (preJobTitle || preJobId) {
  setSelected(new Set());

        } else if (all.length > 0) {
          const uniqueJobs = [...new Set(all.map(c => c.job_title).filter(Boolean))];
          if (uniqueJobs.length === 1) {
            f('job_title', uniqueJobs[0]);
            f('job_id', String(all[0]?.job_id || ''));
          }
        }
      })
      .catch(() => setCandidates([]))
      .finally(() => setLoadingC(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, preSelected]);

  // ── Sync form when candidateRounds map arrives (unchanged) ────────────────
  useEffect(() => {
    if (Object.keys(candidateRounds).length === 0) return;
    if (selected.size === 0) return;
    const selApps   = candidates.filter(c => selected.has(c.id));
    const selRounds = selApps.map(c => {
      const uid = String(c.candidate?.id || c.applicant?.id || c.applicant_id || c.user?.id || c.user_id || '');
      return candidateRounds[uid]?.nextRound;
    }).filter(r => r != null);
    if (selRounds.length === 0) return;
    const allSame = selRounds.every(r => r === selRounds[0]);
    if (!allSame) return;
    const targetRound = selRounds[0];
    setForm(p => {
      const updates = {};
      if (p.round_number !== targetRound) updates.round_number = targetRound;
      if (matchedProc?.rounds?.length) {
        const cfg = matchedProc.rounds.find(r => r.order === targetRound);
        if (cfg) {
          const _isPendingPool = selApps.some(c => {
            const uid = String(c.candidate?.id || c.candidate_id || c.user?.id || c.user_id || '');
            return candidateRounds[uid]?.state === 'pending_pool_reschedule';
          });
          if (!_isPendingPool && p.interview_type !== cfg.round_type) updates.interview_type = cfg.round_type || 'ai-powered';
          const desiredName  = `${matchedProc.job_title || preJobTitle || ''} — ${cfg.name}`;

          if (p.interview_name !== desiredName) updates.interview_name = desiredName;
          const desiredTotal = matchedProc.rounds_count || matchedProc.rounds.length || 1;
          if (p.total_rounds !== desiredTotal) updates.total_rounds = desiredTotal;
        }
      }
      return Object.keys(updates).length ? { ...p, ...updates } : p;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidateRounds, selected, candidates, matchedProc]);

  // ── Name/job helpers (unchanged) ──────────────────────────────────────────
  const getName = (c) => {
  if (c.full_name) return c.full_name;                                                  // ← NEW (flat)
  if (c.applicant?.full_name) return c.applicant.full_name;
  if (c.candidate?.full_name) return c.candidate.full_name;
  if (c.first_name || c.last_name)
    return `${c.first_name || ''} ${c.last_name || ''}`.trim();                          // ← NEW (flat)
  if (c.applicant?.first_name || c.applicant?.last_name)
    return `${c.applicant.first_name || ''} ${c.applicant.last_name || ''}`.trim();
  if (c.candidate?.first_name || c.candidate?.last_name)
    return `${c.candidate.first_name || ''} ${c.candidate.last_name || ''}`.trim();
  return c.candidate_name || c.email || c.applicant?.email || c.candidate?.email || 'Unknown';
};
  const getJob = (c) => c.job_title || c.job?.title || '';

  const filteredC = candidates.filter(c => {
    const n = getName(c).toLowerCase();
    const j = getJob(c).toLowerCase();
    return !searchC || n.includes(searchC.toLowerCase()) || j.includes(searchC.toLowerCase());
  });
  const allSel = filteredC.length > 0 && filteredC.every(c => selected.has(c.id));

  // ── Toggle (unchanged) ────────────────────────────────────────────────────
  const toggle = (appId) => {
    setSelected(prev => {
      const next       = new Set(prev);
      next.has(appId) ? next.delete(appId) : next.add(appId);
      const selApps    = candidates.filter(c => next.has(c.id));
      const uniqueJobs = [...new Set(selApps.map(c => c.job_title).filter(Boolean))];
      if (selApps.length === 0) {
        f('job_title', preJobTitle || ''); f('job_id', preJobId || '');
      } else if (uniqueJobs.length === 1) {
        const found = selApps.find(c => c.job_title === uniqueJobs[0]);
        f('job_title', uniqueJobs[0]);
        f('job_id', String(found?.job_id || ''));
        setForm(p => ({ ...p, interview_name: p.interview_name || `${uniqueJobs[0]} — Round 1` }));
      }
      const selRounds = selApps.map(c => {
        const uid = String(c.candidate?.id || c.applicant?.id || c.applicant_id || c.user?.id || c.user_id || '');
        return candidateRounds[uid]?.nextRound;
      }).filter(r => r != null);
      if (selRounds.length > 0 && selRounds.every(r => r === selRounds[0])) {
        const targetRound = selRounds[0];
        f('round_number', targetRound);
        if (matchedProc?.rounds?.length) {
          const cfg = matchedProc.rounds.find(r => r.order === targetRound);
          if (cfg) {
            const _isPendingPool = selApps.some(c => {
              const uid = String(c.candidate?.id || c.candidate_id || c.user?.id || c.user_id || '');
              return candidateRounds[uid]?.state === 'pending_pool_reschedule';
            });
            if (!_isPendingPool) f('interview_type', cfg.round_type || 'ai-powered');
            f('interview_name', `${matchedProc.job_title || preJobTitle || ''} — ${cfg.name}`);
            f('total_rounds', matchedProc.rounds_count || matchedProc.rounds.length || 1);
          }
        }
      }
      return next;
    });
  };

  const toggleAll = () => {
    const visible = filteredC.map(c => c.id);
    const allS    = visible.every(id => selected.has(id));
    setSelected(allS ? new Set() : new Set(visible));
    if (!allS) {
      const uniqueJobs = [...new Set(filteredC.map(c => c.job_title).filter(Boolean))];
      if (uniqueJobs.length === 1) {
        const found = filteredC.find(c => c.job_title === uniqueJobs[0]);
        f('job_title', uniqueJobs[0]);
        f('job_id', String(found?.job_id || ''));
      }
    } else {
      f('job_title', preJobTitle || '');
      f('job_id', preJobId || '');
    }
  };

  // ── Submit (unchanged) ────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (selected.size === 0) { enqueueSnackbar('Select at least one candidate', { variant: 'warning' }); return; }
    if (!form.interview_name.trim()) { enqueueSnackbar('Enter an interview name', { variant: 'warning' }); return; }
    if (form.interview_type === 'document' && !docFile) {
      enqueueSnackbar('Please upload the question document before scheduling.', { variant: 'warning' }); return;
    }
    if (form.interview_type === 'document') {
      const n = parseInt(form.questions_per_candidate);
      if (!n || n < 1) {
        enqueueSnackbar('Approved questions per candidate must be at least 1.', { variant: 'warning' }); return;
      }
    }
    setSaving(true);
    try {
      const selectedApps     = candidates.filter(c => selected.has(c.id));
      const candidateUserIds = selectedApps.map(c =>
  c.candidate_id || c.candidate?.id || c.applicant?.id || c.applicant_id || c.user?.id || c.user_id
).filter(Boolean);

       // 🔍 DEBUG — paste console output back to me
      console.log('🔍 [Schedule] selectedApps RAW:', JSON.parse(JSON.stringify(selectedApps)));
      console.log('🔍 [Schedule] candidateUserIds:', candidateUserIds);
      console.log('🔍 [Schedule] candidate count:', selectedApps.length);
      const pad     = n => String(n).padStart(2, '0');
      const toLocal = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00+05:30`;
      const now7    = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      let _meetingUrl = (form.meeting_url || '').trim();
      if (_meetingUrl && !_meetingUrl.startsWith('http://') && !_meetingUrl.startsWith('https://'))
        _meetingUrl = 'https://' + _meetingUrl;

      if (form.interview_type === 'live-video' && !_meetingUrl
          && !['portal','in-person','phone'].includes(form.platform || 'portal')) {
        enqueueSnackbar('Please paste the meeting URL so candidates can join.', { variant: 'warning' });
        setSaving(false); return;
      }
      if (form.interview_type === 'live-video' && !form.scheduled_date) {
        enqueueSnackbar('Please select a scheduled date for the live interview.', { variant: 'warning' });
        setSaving(false); return;
      }

      let _windowStart, _windowEnd;
      if (form.interview_type === 'live-video' && form.scheduled_date) {
        const [_sh, _sm] = (form.scheduled_time || '10:00').split(':');
        let _h = parseInt(_sh, 10);
        if ((form.scheduled_ampm || 'AM') === 'PM' && _h !== 12) _h += 12;
        if ((form.scheduled_ampm || 'AM') === 'AM' && _h === 12) _h = 0;
        _windowStart = `${form.scheduled_date}T${pad(_h)}:${_sm || '00'}`;
        if (form.scheduled_end_date) {
          const [_eh, _em] = (form.scheduled_end_time || '11:00').split(':');
          let _endH = parseInt(_eh, 10);
          if ((form.scheduled_end_ampm || 'AM') === 'PM' && _endH !== 12) _endH += 12;
          if ((form.scheduled_end_ampm || 'AM') === 'AM' && _endH === 12) _endH = 0;
          _windowEnd = `${form.scheduled_end_date}T${pad(_endH)}:${_em || '00'}`;
        } else {
          _windowEnd = toLocal(new Date(new Date(_windowStart).getTime() + (form.duration_mins || 60) * 60000));
        }
      } else {
        _windowStart = form.window_start || toLocal(new Date());
        _windowEnd   = form.window_end   || toLocal(now7);
      }

      const jobIdNum = parseInt(form.job_id, 10) || null;
      let processId  = null;
      try {
        const matchProcess = p => {
          if (jobIdNum)       return String(p.job_id || p.job) === String(jobIdNum);
          if (form.job_title) return (p.job_title || '').trim().toLowerCase() === form.job_title.trim().toLowerCase();
          return false;
        };
        const openFromProps = (processes || []).find(p =>
          matchProcess(p) && p.is_active !== false && p.status !== 'closed'
        );
        processId = openFromProps?.id ?? null;

        if (!processId) {
          const procRes  = await interviewAPI.getProcesses(jobIdNum ? { job_id: jobIdNum } : {});
          const procList = Array.isArray(procRes.data?.results) ? procRes.data.results
                         : Array.isArray(procRes.data)          ? procRes.data : [];
          processId = procList.find(p =>
          (jobIdNum ? String(p.job_id || p.job) === String(jobIdNum) : true)
          && p.is_active !== false && p.status !== 'closed'
        )?.id ?? null;
        // For pending-pool reschedule: also check closed processes
        // (the process may be closed but the candidate is still pending in it)
        if (!processId) {
          processId = procList.find(p =>
            (jobIdNum ? String(p.job_id || p.job) === String(jobIdNum) : true)
          )?.id ?? null;
        }

        }

        if (!processId) {
          const createRes = await interviewAPI.createProcess({
            job_title: form.job_title || form.interview_name,
            job_id: jobIdNum, vacancies: form.vacancies || 1, total_rounds: form.total_rounds || 1,
          });
          processId = createRes.data?.id;
        }
      } catch (err) {
        enqueueSnackbar(
          'Could not resolve interview process: ' +
            (err?.response?.data?.detail ||
            (typeof err?.response?.data === 'object' ? JSON.stringify(err.response.data) : err?.message || 'unknown error')),
          { variant: 'error' }
        );
        setSaving(false); return;
      }

      if (!processId) {
        enqueueSnackbar('Unable to resolve interview process. Please try again.', { variant: 'error' });
        setSaving(false); return;
      }

      const candidateIdentifiers = selectedApps.map(c => ({
  application_id: c.id || c.application_id || null,
  portal_id:      c.portal_id || c.applicant?.portal_id || c.candidate?.portal_id || null,
  user_id:        c.candidate_id || c.candidate?.id || c.applicant?.id || c.applicant_id || c.user?.id || c.user_id || null,
  email:          c.email || c.applicant?.email || c.candidate?.email || null,
  name:           c.full_name || c.applicant?.full_name || c.candidate?.full_name || c.candidate_name || null,
})).filter(c => c.application_id || c.portal_id || c.user_id || c.email);

      console.log('🔍 [Schedule] candidate_identifiers built:', candidateIdentifiers);

      if (candidateIdentifiers.length === 0) {
        enqueueSnackbar(
          `❌ Selected candidate has no resolvable ID (no application_id, user_id, or email). ` +
          `This usually means the applicant record is incomplete. Check the console for the raw candidate object.`,
          { variant: 'error', autoHideDuration: 12000 }
        );
        setSaving(false);
        return;
      }

      const payload = {
        process_id:            processId,
        candidate_ids:         candidateUserIds,
        candidate_identifiers: candidateIdentifiers,   // ← NEW: backend resolves via these
        interview_type: form.interview_type, interview_name: form.interview_name.trim(),
        job_title: form.job_title || '', job_id: form.job_id || '0',
        round_number: form.round_number || 1, total_rounds: form.total_rounds || 1,
        vacancies: form.vacancies || 1, difficulty: form.difficulty || 'junior',
        time_limit_secs: 3600,
        notify_app: !!form.notify_app, notify_email: !!form.notify_email,
        notify_sms: !!form.notify_sms, notify_whatsapp: false, confirm: true,
        meeting_url: _meetingUrl, duration_mins: form.duration_mins || 60,
        platform: form.platform || 'google-meet',
        window_start: _windowStart, window_end: _windowEnd,
        ...(form.interview_type === 'document'
            ? { questions_per_candidate: parseInt(form.questions_per_candidate) } : {}),
        ...(form.interview_type === 'live-video' && _windowEnd ? { scheduled_end: _windowEnd } : {}),
        interview_mode: form.interview_type === 'ai-powered'
          ? (form.interview_mode || 'standard')
          : 'standard',
      };

      let schedRes;
      if (form.interview_type === 'document' && docFile) {
        const fd = new FormData();
Object.entries(payload).forEach(([k, v]) => {
  if (v == null) return;
  // For arrays of objects, append each entry's fields with bracket-notation
  // (Django/DRF can parse this as a list of dicts in multipart).
  if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'object') {
    v.forEach((item, i) => {
      Object.entries(item).forEach(([ik, iv]) => {
        if (iv != null) fd.append(`${k}[${i}][${ik}]`, String(iv));
      });
    });
  } else if (Array.isArray(v)) {
    // Primitive arrays — append each value with the same key
    v.forEach(item => fd.append(k, String(item)));
  } else if (typeof v === 'object') {
    fd.append(k, JSON.stringify(v));   // plain objects still stringify
  } else {
    fd.append(k, String(v));
  }
});
fd.append('document_file', docFile);
        schedRes = await axiosInstance.post('/employer/interviews/schedule/bulk/', fd,
    { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        schedRes = await interviewAPI.bulkSchedule(payload);
      }

      const respData   = schedRes.data || {};
      const createdIds = respData.created_ids || respData.ids || respData.created_interview_ids || [];
      const skipped    = Array.isArray(respData.skipped) ? respData.skipped : [];

      const reasonLabel = (r) => {
        if (r === 'pending')              return 'needs to be approved in Rankings before advancing';
        if (r === 'rejected')             return 'was rejected in a previous round';
        if (r === 'already_hired')        return 'has already been hired — only Pending Pool candidates can be rescheduled';
        if (r === 'already_scheduled' || r === 'already_scheduled_for_round')
                                          return 'is already scheduled for this round';
        if (r === 'completed_all_rounds') return 'has already completed all rounds — use the Hire flow';
        if (r === 'not_found')            return 'candidate record not found';
        if (r === 'lookup_error')         return 'lookup failed — try again';
        if (r?.startsWith('no_round_'))   return 'pipeline has no matching round';
        if (r?.startsWith('doc_creation_failed:')) return 'document upload failed: ' + r.replace('doc_creation_failed:', '').trim();
        return r || 'not eligible';
      };
      const SILENT_REASONS = ['already_scheduled', 'already_scheduled_for_round'];
      const realSkipped           = skipped.filter(s => !SILENT_REASONS.includes(s.reason));
      const alreadyScheduledCount = skipped.length - realSkipped.length;

realSkipped.forEach(s => enqueueSnackbar(
  `⚠️ ${s.name || s.email || `Candidate ${s.candidate_id}`}: ${reasonLabel(s.reason)}`,
  { variant: 'warning', autoHideDuration: 9000 }
));

if (createdIds.length > 0) {
  const parts = [`✅ ${createdIds.length} interview(s) scheduled${form.interview_type === 'document' ? ' with document attached' : ''}`];
  if (alreadyScheduledCount > 0) parts.push(`${alreadyScheduledCount} already scheduled`);
  enqueueSnackbar(parts.join(', ') + '.', { variant: 'success', autoHideDuration: 4000 });
} else if (alreadyScheduledCount > 0 && realSkipped.length === 0) {
  enqueueSnackbar('All selected candidates are already scheduled for this round.',
    { variant: 'info', autoHideDuration: 4000 });
} else if (realSkipped.length > 0) {
  enqueueSnackbar('No interviews were scheduled — see warnings above.',
    { variant: 'error', autoHideDuration: 6000 });
}
      onDone(); onClose();
    } catch (err) {
      enqueueSnackbar(
        err?.response?.data?.detail ||
        (typeof err?.response?.data === 'object' ? JSON.stringify(err.response.data) : null) ||
        'Failed to schedule interview',
        { variant: 'error' }
      );
    } finally { setSaving(false); }
  };

  // ── Routing alert (unchanged logic) ──────────────────────────────────────
  const renderRoutingAlert = () => {
    const selApps = candidates.filter(c => selected.has(c.id));
    if (selApps.length === 0) return null;
    const buckets = { not_started: [], advanced: [], pending: [], rejected: [], completed: [], pending_pool_reschedule: [], unknown: [] };

    selApps.forEach(c => {
      const uid  = String(c.candidate?.id || c.applicant?.id || c.applicant_id || c.user?.id || c.user_id || '');
      const info = candidateRounds[uid];
      if (!info) buckets.unknown.push(c);
      else (buckets[info.state] || buckets.unknown).push(c);
    });
    const blocked = [...buckets.pending, ...buckets.rejected, ...buckets.completed];
    if (blocked.length > 0) {
      const reasons = [];
      if (buckets.pending.length)   reasons.push(`${buckets.pending.length} pending in a previous round (approve in Rankings first)`);
      if (buckets.rejected.length)  reasons.push(`${buckets.rejected.length} rejected`);
      if (buckets.completed.length) reasons.push(`${buckets.completed.length} already completed all rounds (use Hire flow)`);
      return (
        <Alert severity="warning" sx={{ py: 0.5, fontSize: { xs: '0.7rem', sm: '0.78rem' } }} icon={<InfoOutlined fontSize="small" />}>
          <strong>{blocked.length} of {selApps.length}</strong> selected candidates will be skipped:&nbsp;
          {reasons.join(' · ')}.
        </Alert>
      );
    }
    const schedulable  = [...buckets.not_started, ...buckets.advanced];
    const uniqueRounds = [...new Set(schedulable.map(c => {
      const uid = String(c.candidate?.id || c.applicant?.id || c.applicant_id || c.user?.id || c.user_id || '');
      return candidateRounds[uid]?.nextRound;
    }).filter(Boolean))];
    if (uniqueRounds.length > 1) return (
      <Alert severity="warning" sx={{ py: 0.5, fontSize: { xs: '0.7rem', sm: '0.78rem' } }} icon={<InfoOutlined fontSize="small" />}>
        Selected candidates are at <strong>different rounds</strong>:{' '}
        {uniqueRounds.sort().map(r => `R${r}`).join(', ')}.
        Each will be scheduled to their own next round automatically.
      </Alert>
    );
    if (uniqueRounds.length === 1 && uniqueRounds[0] === 1) return (
      <Alert severity="success" sx={{ py: 0.5, fontSize: { xs: '0.7rem', sm: '0.78rem' } }} icon={<InfoOutlined fontSize="small" />}>
        {schedulable.length === 1
          ? 'Candidate has not started — schedules to Round 1.'
          : `${schedulable.length} candidates haven't started — all schedule to Round 1.`}
      </Alert>
    );
    if (uniqueRounds.length === 1) return (
      <Alert severity="info" sx={{ py: 0.5, fontSize: { xs: '0.7rem', sm: '0.78rem' } }} icon={<InfoOutlined fontSize="small" />}>
        {schedulable.length === 1
          ? `Approved in Round ${uniqueRounds[0] - 1} — schedules to Round ${uniqueRounds[0]}.`
          : `${schedulable.length} candidates approved in Round ${uniqueRounds[0] - 1} — schedule to Round ${uniqueRounds[0]}.`}
      </Alert>
    );
    return null;
  };

  // ── Shared field style ────────────────────────────────────────────────────
  const fieldSx = {
    '& .MuiInputBase-input': { fontSize: { xs: '0.75rem', sm: '0.82rem' } },
    '& .MuiInputLabel-root': { fontSize: { xs: '0.75rem', sm: '0.82rem' } },
    '& .MuiOutlinedInput-root': {
      borderRadius: '10px',
      '& fieldset': { borderColor: '#E2E8F0' },
      '&.Mui-focused fieldset': { borderColor: '#1E3358' },
    },
    '& .MuiFormHelperText-root': { fontSize: { xs: '0.6rem', sm: '0.65rem' } },
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      disableRestoreFocus
      TransitionProps={{ onExited: () => { document.activeElement?.blur(); } }}
      PaperProps={{
        sx: {
          borderRadius: { xs: 0, sm: '16px' },
          m: { xs: 0, sm: 2 },
          maxHeight: { xs: '100dvh', sm: '92vh' },
          width: { xs: '100%', sm: 'auto' },
          '@media (max-width: 240px)': { m: 0, borderRadius: 0 },
        },
      }}
    >
      {/* Dialog title */}
      <DialogTitle
        sx={{
          px: { xs: 2, sm: 3 },
          py: { xs: 1.8, sm: 2.2 },
          borderBottom: '1px solid #E2E8F0',
          '@media (max-width: 240px)': { px: 1.5, py: 1.2 },
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Assignment color="primary" sx={{ fontSize: { xs: 18, sm: 22 } }} />
          <Box>
            <Typography
              variant="h6"
              fontWeight={700}
              sx={{ fontSize: { xs: '0.88rem', sm: '1rem', md: '1.1rem' } }}
            >
              Schedule Interview
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: { xs: '0.62rem', sm: '0.7rem' }, display: { xs: 'none', sm: 'block' } }}
            >
              Select shortlisted candidates and configure the interview
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ p: 0, overflow: 'hidden' }}>
        <Grid
          container
          sx={{
            height: { xs: 'auto', md: 520 },
            flexDirection: { xs: 'column', md: 'row' },
          }}
        >
          {/* ── LEFT: Candidate list ─────────────────────────────────── */}
          <Grid
            size={{ xs: 12, md: 5 }}
            sx={{
              borderRight: { xs: 'none', md: '1px solid' },
              borderBottom: { xs: '1px solid', md: 'none' },
              borderColor: 'divider',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: { xs: 260, sm: 300, md: '100%' },
              overflow: 'hidden',
            }}
          >
            {/* Search bar */}
            <Box
              sx={{
                p: { xs: 1.5, sm: 2 },
                borderBottom: '1px solid',
                borderColor: 'divider',
                flexShrink: 0,
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: { xs: 0.8, sm: 1 } }}>
                <Typography
                  variant="subtitle2"
                  fontWeight={700}
                  sx={{ fontSize: { xs: '0.78rem', sm: '0.85rem' }, flex: 1 }}
                >
                  Shortlisted Candidates
                </Typography>
                {selected.size > 0 && (
                  <Chip
                    label={`${selected.size} selected`}
                    size="small"
                    color="primary"
                    sx={{ height: { xs: 18, sm: 20 }, fontSize: { xs: '0.58rem', sm: '0.65rem' } }}
                  />
                )}
              </Stack>
              <TextField
                fullWidth
                size="small"
                placeholder="Search name or job…"
                value={searchC}
                onChange={e => setSearchC(e.target.value)}
                sx={{
                  ...fieldSx,
                  '& .MuiInputBase-input': { fontSize: { xs: '0.72rem', sm: '0.78rem' }, py: { xs: '6px', sm: '8px' } },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search sx={{ fontSize: { xs: 14, sm: 16 }, color: '#94A3B8' }} />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            {/* Candidate rows */}
            {loadingC ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', pt: { xs: 2, sm: 4 }, flexShrink: 0 }}>
                <CircularProgress size={24} sx={{ color: '#1E3358' }} />
              </Box>
            ) : filteredC.length === 0 ? (
              <Box sx={{ p: { xs: 1.5, sm: 2 }, flexShrink: 0 }}>
                <Alert severity="info" sx={{ fontSize: { xs: '0.7rem', sm: '0.78rem' }, borderRadius: '10px' }}>
                  {candidates.length === 0
                    ? 'No shortlisted candidates. Shortlist applicants from the Jobs page first.'
                    : 'No candidates match your search.'}
                </Alert>
              </Box>
            ) : (
              <Box
                sx={{
                  overflowY: 'auto',
                  flex: 1,
                  '&::-webkit-scrollbar': { width: 3 },
                  '&::-webkit-scrollbar-thumb': { bgcolor: '#E2E8F0', borderRadius: 2 },
                }}
              >
                {/* Select all row */}
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  sx={{
                    px: { xs: 1.5, sm: 2 },
                    py: { xs: 0.7, sm: 1 },
                    bgcolor: 'grey.50',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: '#F1F5F9' },
                  }}
                  onClick={toggleAll}
                >
                  <Checkbox
                    size="small"
                    checked={allSel}
                    indeterminate={selected.size > 0 && !allSel}
                    onChange={toggleAll}
                    sx={{ p: 0.3 }}
                  />
                  <Typography variant="caption" fontWeight={600} sx={{ fontSize: { xs: '0.65rem', sm: '0.72rem' } }}>
                    Select all ({filteredC.length})
                  </Typography>
                </Stack>

                {/* Individual candidates */}
                {filteredC.map(c => {
                  const cid      = c.id;
                  const isSel    = selected.has(cid);
                  const userId   = String(c.candidate?.id || c.applicant?.id || c.applicant_id || c.user?.id || c.user_id || '');
                  const candInfo = candidateRounds[userId];
                  let chipNode   = null;
                  if (candInfo) {
                    const { state, round } = candInfo;
                    if (state === 'not_started')
                      chipNode = (
                        <Tooltip title="Has not started — schedules to Round 1">
                          <Chip size="small" label="R1" variant="outlined"
                            sx={{ fontSize: '0.55rem', height: { xs: 16, sm: 18 }, fontWeight: 700 }} />
                        </Tooltip>
                      );
                    else if (state === 'advanced')
                      chipNode = (
                        <Tooltip title={`Approved in Round ${round - 1} — schedules to Round ${round}`}>
                          <Chip size="small" label={`R${round}`} color="primary"
                            sx={{ fontSize: '0.55rem', height: { xs: 16, sm: 18 }, fontWeight: 700 }} />
                        </Tooltip>
                      );
                    else if (state === 'pending')
                      chipNode = (
                        <Tooltip title={`Pending in Round ${round} — approve in Rankings`}>
                          <Chip size="small" label={`P${round}`} color="warning" variant="outlined"
                            sx={{ fontSize: '0.52rem', height: { xs: 16, sm: 18 }, fontWeight: 700 }} />
                        </Tooltip>
                      );
                    else if (state === 'rejected')
                      chipNode = (
                        <Tooltip title={`Rejected in Round ${round}`}>
                          <Chip size="small" label="✗" color="error" variant="outlined"
                            sx={{ fontSize: '0.52rem', height: { xs: 16, sm: 18 } }} />
                        </Tooltip>
                      );
                    else if (state === 'completed')
                      chipNode = (
                        <Tooltip title="Completed all rounds — use Hire flow">
                          <Chip size="small" label="Done" color="success" variant="outlined"
                            sx={{ fontSize: '0.52rem', height: { xs: 16, sm: 18 } }} />
                        </Tooltip>
                      );
                  }
                  return (
                    <Stack
                      key={c.id}
                      direction="row"
                      alignItems="center"
                      spacing={{ xs: 0.8, sm: 1 }}
                      sx={{
                        px: { xs: 1.5, sm: 2 },
                        py: { xs: 0.9, sm: 1.2 },
                        cursor: 'pointer',
                        bgcolor: isSel ? '#EEF2FF' : 'transparent',
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        '&:hover': { bgcolor: isSel ? '#E0E7FF' : 'grey.50' },
                        transition: 'background 0.1s',
                      }}
                      onClick={() => toggle(cid)}
                    >
                      <Checkbox
                        size="small"
                        checked={isSel}
                        onChange={() => toggle(cid)}
                        onClick={e => e.stopPropagation()}
                        color="primary"
                        sx={{ p: 0.3, flexShrink: 0 }}
                      />
                      <Avatar
                        sx={{
                          width: { xs: 26, sm: 30 },
                          height: { xs: 26, sm: 30 },
                          fontSize: { xs: '0.62rem', sm: '0.7rem' },
                          bgcolor: isSel ? '#4338CA' : '#94A3B8',
                          flexShrink: 0,
                        }}
                      >
                        {getName(c)[0]?.toUpperCase() || '?'}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="body2"
                          fontWeight={isSel ? 700 : 500}
                          noWrap
                          sx={{ fontSize: { xs: '0.72rem', sm: '0.78rem' } }}
                        >
                          {getName(c)}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          noWrap
                          sx={{ fontSize: { xs: '0.6rem', sm: '0.65rem' } }}
                        >
                          {getJob(c) || c.candidate?.email || c.applicant?.email || ''}
                        </Typography>
                      </Box>
                      {chipNode}
                      {c.match_score != null && (
                        <Chip
                          label={`${c.match_score}%`}
                          size="small"
                          color={c.match_score >= 70 ? 'success' : c.match_score >= 40 ? 'warning' : 'default'}
                          sx={{ fontSize: '0.55rem', height: { xs: 16, sm: 18 }, flexShrink: 0 }}
                        />
                      )}
                    </Stack>
                  );
                })}
              </Box>
            )}
          </Grid>

          {/* ── RIGHT: Configuration panel ───────────────────────────── */}
          <Grid
            size={{ xs: 12, md: 7 }}
            sx={{
              overflowY: 'auto',
              maxHeight: { xs: 420, sm: 480, md: '100%' },
              '&::-webkit-scrollbar': { width: 4 },
              '&::-webkit-scrollbar-thumb': { bgcolor: '#E2E8F0', borderRadius: 2 },
            }}
          >
            <Box sx={{ p: { xs: 1.5, sm: 2, md: 2.5 }, '@media (max-width: 240px)': { p: 1.2 } }}>
              <Typography
                variant="subtitle2"
                fontWeight={700}
                sx={{ mb: { xs: 1.5, sm: 2 }, fontSize: { xs: '0.78rem', sm: '0.85rem' } }}
              >
                Interview Configuration
              </Typography>
              <Stack spacing={{ xs: 1.5, sm: 2 }}>

                {/* Interview type */}
                <FormControl fullWidth size="small" disabled={!!pipelineLocked} sx={fieldSx}>
                  <InputLabel>Interview Type</InputLabel>
                  <Select
                    value={form.interview_type}
                    label="Interview Type"
                    onChange={e => !pipelineLocked && f('interview_type', e.target.value)}
                  >
                    <MenuItem value="ai-powered" sx={{ fontSize: { xs: '0.75rem', sm: '0.82rem' } }}> AI-Powered</MenuItem>
                    <MenuItem value="aptitude"   sx={{ fontSize: { xs: '0.75rem', sm: '0.82rem' } }}> Assessment</MenuItem>
                    <MenuItem value="document"   sx={{ fontSize: { xs: '0.75rem', sm: '0.82rem' } }}> Document-Based</MenuItem>
                    <MenuItem value="live-video" sx={{ fontSize: { xs: '0.75rem', sm: '0.82rem' } }}> Live Video</MenuItem>
                  </Select>
                </FormControl>

                {/* Pipeline pin banner */}
                {pipelineLocked && (() => {
                  const cfg     = matchedProc?.rounds?.find(r => r.order === form.round_number);
                  const effName = cfg?.name || pipelineRoundName;
                  const effNum  = cfg?.order || pipelineRoundNumber;
                  if (!effName) return null;
                  return (
                    <Alert severity="info" sx={{ py: 0.5, fontSize: { xs: '0.68rem', sm: '0.75rem' }, borderRadius: '10px' }} icon={<InfoOutlined fontSize="small" />}>
                      Pinned to <strong>{effName}</strong> (Round {effNum}) — type set by pipeline.
                    </Alert>
                  );
                })()}

                {renderRoutingAlert()}

                {/* Interview name */}
                <TextField
                  label="Interview Name"
                  size="small"
                  fullWidth
                  value={form.interview_name}
                  onChange={e => f('interview_name', e.target.value)}
                  placeholder="e.g. Round 1 — Technical"
                  sx={fieldSx}
                />

                {/* Job title */}
                <TextField
                  label="Job Title (shown to candidate)"
                  size="small"
                  fullWidth
                  value={form.job_title}
                  onChange={e => f('job_title', e.target.value)}
                  sx={fieldSx}
                />

                {/* Round, total rounds, vacancies */}
                <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                  <TextField
                    label="Round #"
                    size="small"
                    type="number"
                    sx={{ width: { xs: 80, sm: 90 }, ...fieldSx }}
                    value={form.round_number}
                    onChange={e => f('round_number', +e.target.value)}
                  />
                  <TextField
                    label="Total Rounds"
                    size="small"
                    type="number"
                    sx={{ width: { xs: 95, sm: 110 }, ...fieldSx }}
                    value={form.total_rounds}
                    onChange={e => f('total_rounds', +e.target.value)}
                  />
                  <TextField
                    label="Vacancies"
                    size="small"
                    type="number"
                    sx={{ width: { xs: 85, sm: 100 }, ...fieldSx }}
                    inputProps={{ min: 1 }}
                    value={form.vacancies || 1}
                    onChange={e => f('vacancies', Math.max(1, +e.target.value))}
                  />
                </Stack>

                {/* Interview window (non-live) */}
                {form.interview_type !== 'live-video' && (
                  <Stack spacing={{ xs: 1, sm: 1.2 }}>
                    {/* Quick day chips */}
                    <Stack direction="row" spacing={0.8} alignItems="center" flexWrap="wrap" useFlexGap>
                      <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ fontSize: { xs: '0.62rem', sm: '0.68rem' } }}>
                        Window
                      </Typography>
                      {[1,2,3,5,7].map(days => (
                        <Chip
                          key={days}
                          label={`${days}d`}
                          size="small"
                          variant="outlined"
                          sx={{ cursor: 'pointer', fontSize: { xs: '0.58rem', sm: '0.65rem' }, height: { xs: 18, sm: 20 }, borderRadius: '6px' }}
                          onClick={() => {
                            const pad = n => String(n).padStart(2,'0');
                            const now = new Date();
                            const endD = new Date(now.getTime() + days * 86400000);
                            const toLocal = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
                            f('window_start', toLocal(now));
                            f('window_end', toLocal(endD));
                            f('window_start_date', `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`);
                            f('window_end_date',   `${endD.getFullYear()}-${pad(endD.getMonth()+1)}-${pad(endD.getDate())}`);
                            f('window_start_time', `${pad(now.getHours())}:${pad(now.getMinutes())}`);
                            f('window_end_time',   `${pad(endD.getHours())}:${pad(endD.getMinutes())}`);
                            f('window_start_ampm', now.getHours() < 12 ? 'AM' : 'PM');
                            f('window_end_ampm',   endD.getHours() < 12 ? 'AM' : 'PM');
                          }}
                        />
                      ))}
                    </Stack>

                    {/* Window opens */}
                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ fontSize: { xs: '0.62rem', sm: '0.68rem' } }}>
                      Window Opens
                    </Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                      <TextField
                        label="Date"
                        size="small"
                        type="date"
                        sx={{ flex: { sm: 2 }, ...fieldSx }}
                        InputLabelProps={{ shrink: true }}
                        value={form.window_start_date || ''}
                        onChange={e => {
                          f('window_start_date', e.target.value);
                          f('window_start', toISO(e.target.value, form.window_start_time || '09:00', form.window_start_ampm || 'AM'));
                        }}
                      />
                      <TimePicker
                        label="Start"
                        timeValue={form.window_start_time}
                        ampmValue={form.window_start_ampm || 'AM'}
                        onTimeChange={v => { f('window_start_time', v); f('window_start', toISO(form.window_start_date, v, form.window_start_ampm || 'AM')); }}
                        onAmpmChange={v => { f('window_start_ampm', v); f('window_start', toISO(form.window_start_date, form.window_start_time, v)); }}
                      />
                    </Stack>

                    {/* Window closes */}
                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ fontSize: { xs: '0.62rem', sm: '0.68rem' } }}>
                      Window Closes
                    </Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                      <TextField
                        label="Date"
                        size="small"
                        type="date"
                        sx={{ flex: { sm: 2 }, ...fieldSx }}
                        InputLabelProps={{ shrink: true }}
                        value={form.window_end_date || ''}
                        onChange={e => {
                          f('window_end_date', e.target.value);
                          f('window_end', toISO(e.target.value, form.window_end_time || '06:00', form.window_end_ampm || 'PM'));
                        }}
                      />
                      <TimePicker
                        label="End"
                        timeValue={form.window_end_time}
                        ampmValue={form.window_end_ampm || 'PM'}
                        onTimeChange={v => { f('window_end_time', v); f('window_end', toISO(form.window_end_date, v, form.window_end_ampm || 'PM')); }}
                        onAmpmChange={v => { f('window_end_ampm', v); f('window_end', toISO(form.window_end_date, form.window_end_time, v)); }}
                      />
                    </Stack>
                  </Stack>
                )}

                {/* Difficulty */}
                {(form.interview_type === 'ai-powered' || form.interview_type === 'aptitude' || form.interview_type === 'document') && (
                  <FormControl fullWidth size="small" sx={fieldSx}>
                    <InputLabel>Difficulty</InputLabel>
                    <Select value={form.difficulty} label="Difficulty" onChange={e => f('difficulty', e.target.value)}>
                      {[
                        { value: 'fresher', label: 'Fresher (0 yrs)'   },
                        { value: 'junior',  label: 'Junior (1–3 yrs)'  },
                        { value: 'mid',     label: 'Mid-Level (3–5 yrs)' },
                        { value: 'senior',  label: 'Senior (5–7 yrs)'  },
                        { value: 'expert',  label: 'Expert (7+ yrs)'   },
                      ].map(o => (
                        <MenuItem key={o.value} value={o.value} sx={{ fontSize: { xs: '0.75rem', sm: '0.82rem' } }}>
                          {o.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}

                {/* Campus drive toggle — ai-powered rounds only */}
                {form.interview_type === 'ai-powered' && (
                  <Stack direction="row" alignItems="center" spacing={1.5}
                    sx={{ p: 1.2, bgcolor: form.interview_mode === 'on_campus' ? '#FFFBEB' : '#F8FAFC',
                          borderRadius: '10px', border: '1px solid',
                          borderColor: form.interview_mode === 'on_campus' ? '#FDE68A' : '#E2E8F0',
                          cursor: 'pointer', transition: 'all 0.15s' }}
                    onClick={() => f('interview_mode',
                      form.interview_mode === 'on_campus' ? 'standard' : 'on_campus')}
                  >
                    <Typography sx={{ fontSize: '1rem' }}>🎓</Typography>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontSize: { xs: '0.75rem', sm: '0.8rem' }, fontWeight: 600,
                        color: form.interview_mode === 'on_campus' ? '#B45309' : '#1E293B' }}>
                        Campus Placement Drive
                      </Typography>
                      <Typography sx={{ fontSize: { xs: '0.62rem', sm: '0.68rem' }, color: '#64748B' }}>
                        {form.interview_mode === 'on_campus'
                          ? '25-min session · student-level Q&A · difficulty locked to Fresher'
                          : 'Click to enable for campus drives (freshers only)'}
                      </Typography>
                    </Box>
                    <Chip
                      label={form.interview_mode === 'on_campus' ? 'ON' : 'OFF'}
                      size="small"
                      sx={{ height: 20, fontSize: '0.6rem', fontWeight: 700,
                        bgcolor: form.interview_mode === 'on_campus' ? '#FEF3C7' : '#F1F5F9',
                        color:   form.interview_mode === 'on_campus' ? '#B45309' : '#94A3B8' }}
                    />
                  </Stack>
                )}

                {/* Document upload */}
                {form.interview_type === 'document' && (
                  <Box>
                    <Typography
                      variant="caption"
                      fontWeight={600}
                      color="text.secondary"
                      sx={{ mb: 0.5, display: 'block', fontSize: { xs: '0.62rem', sm: '0.7rem' } }}
                    >
                      Upload Interview Document *
                    </Typography>
                    <Box
                      sx={{
                        border: '2px dashed',
                        borderColor: docFile ? 'success.main' : 'primary.main',
                        borderRadius: { xs: '10px', sm: '12px' },
                        p: { xs: 1.8, sm: 2.5 },
                        textAlign: 'center',
                        cursor: 'pointer',
                        bgcolor: docFile ? 'success.50' : 'primary.50',
                        '&:hover': { borderColor: 'primary.dark', bgcolor: 'primary.100' },
                        transition: 'all 0.15s',
                      }}
                      onClick={() => document.getElementById('doc-upload-input').click()}
                    >
                      <input
                        id="doc-upload-input"
                        type="file"
                        accept=".pdf,.doc,.docx,.txt"
                        style={{ display: 'none' }}
                        onChange={async e => {
                          const file = e.target.files[0] || null;
                          setDocFile(file);
                          setDocUploadWarnings([]);
                          setDocFileType(null);
                          if (file) { const t = await detectPdfType(file); setDocFileType(t); }
                        }}
                      />
                      {docFile ? (
                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                          <CheckCircle color="success" sx={{ fontSize: { xs: 18, sm: 22 } }} />
                          <Box sx={{ textAlign: 'left', flex: 1 }}>
                            <Typography variant="body2" fontWeight={700} color="success.main" sx={{ fontSize: { xs: '0.72rem', sm: '0.8rem' } }} noWrap>
                              {docFile.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.6rem', sm: '0.65rem' } }}>
                              {(docFile.size / 1024).toFixed(0)} KB
                              {docFileType === 'text'    && ' · Text-based PDF ✓'}
                              {docFileType === 'image'   && ' · Scanned PDF — OCR ✓'}
                              {docFileType === 'not-pdf' && ' · Text document ✓'}
                              {!docFileType             && ' · Analysing…'}
                            </Typography>
                          </Box>
                          <IconButton
                            size="small"
                            onClick={e => {
                              e.stopPropagation();
                              setDocFile(null); setDocFileType(null); setDocUploadWarnings([]);
                            }}
                          >
                            <Close fontSize="small" />
                          </IconButton>
                        </Stack>
                      ) : (
                        <Stack spacing={0.5} alignItems="center">
                          <Upload sx={{ fontSize: { xs: 26, sm: 32 }, color: 'primary.main' }} />
                          <Typography variant="body2" fontWeight={600} color="primary.main" sx={{ fontSize: { xs: '0.72rem', sm: '0.8rem' } }}>
                            Click to upload document
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.6rem', sm: '0.65rem' } }}>
                            PDF, DOC, DOCX, TXT · AI reads it and generates unique questions per candidate
                          </Typography>
                        </Stack>
                      )}
                    </Box>

                    {docFile && (
                      <Box sx={{ mt: 1 }}>
                        {docFileType === 'text'    && <Alert severity="success" sx={{ py: 0.4, fontSize: { xs: '0.65rem', sm: '0.72rem' }, borderRadius: '8px' }}>✅ <strong>Text-based PDF</strong> — AI will extract questions directly.</Alert>}
                        {docFileType === 'not-pdf' && <Alert severity="success" sx={{ py: 0.4, fontSize: { xs: '0.65rem', sm: '0.72rem' }, borderRadius: '8px' }}>✅ <strong>{docFile.name.split('.').pop().toUpperCase()}</strong> — fully supported.</Alert>}
                        {docFileType === 'image'   && <Alert severity="info"    sx={{ fontSize: { xs: '0.65rem', sm: '0.72rem' }, borderRadius: '8px' }}>✅ Scanned PDF — OCR supported.</Alert>}
                        {docFileType === null       && <Alert severity="info"    sx={{ py: 0.4, fontSize: { xs: '0.65rem', sm: '0.72rem' }, borderRadius: '8px' }}>🔍 Analysing file type…</Alert>}
                      </Box>
                    )}

                    {/* Questions per candidate */}
                    <Box
                      sx={{
                        mt: { xs: 1.5, sm: 2 },
                        p: { xs: 1.2, sm: 1.5 },
                        bgcolor: 'primary.50',
                        borderRadius: { xs: '10px', sm: '12px' },
                        border: '1px solid',
                        borderColor: 'primary.200',
                      }}
                    >
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box sx={{ flex: 1 }}>
                          <Typography
                            variant="caption"
                            fontWeight={700}
                            color="primary.dark"
                            sx={{ letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', mb: 0.3, fontSize: { xs: '0.58rem', sm: '0.65rem' } }}
                          >
                            Approved Questions per Candidate *
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: { xs: '0.58rem', sm: '0.62rem' } }}>
                            AI extracts ALL questions. Each candidate sees a random{' '}
                            <strong>{form.questions_per_candidate ? `${form.questions_per_candidate}` : 'N'}</strong> from that pool.
                          </Typography>
                        </Box>
                        <TextField
                          required
                          size="small"
                          type="number"
                          label="N"
                          placeholder="—"
                          value={form.questions_per_candidate}
                          onChange={e => f('questions_per_candidate', e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value)))}
                          error={form.questions_per_candidate === '' || form.questions_per_candidate < 1}
                          inputProps={{ min: 1, max: 100 }}
                          sx={{ width: { xs: 75, sm: 90 }, ...fieldSx }}
                        />
                      </Stack>
                    </Box>

                    {/* Duration (document interviews) */}
                    <Box
                      sx={{
                        mt: { xs: 1.5, sm: 2 },
                        p: { xs: 1.2, sm: 1.5 },
                        bgcolor: 'primary.50',
                        borderRadius: { xs: '10px', sm: '12px' },
                        border: '1px solid',
                        borderColor: 'primary.200',
                      }}
                    >
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box sx={{ flex: 1 }}>
                          <Typography
                            variant="caption"
                            fontWeight={700}
                            color="primary.dark"
                            sx={{ letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', mb: 0.3, fontSize: { xs: '0.58rem', sm: '0.65rem' } }}
                          >
                            Interview Duration *
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: { xs: '0.58rem', sm: '0.62rem' } }}>
                            Total time allowed for the candidate to complete this interview.
                          </Typography>
                        </Box>
                        <TextField
                          required
                          size="small"
                          type="number"
                          label="Mins"
                          placeholder="—"
                          value={form.duration_mins}
                          onChange={e => f('duration_mins', e.target.value === '' ? '' : Math.max(10, parseInt(e.target.value)))}
                          error={form.duration_mins === '' || form.duration_mins < 10}
                          inputProps={{ min: 10, max: 180, step: 5 }}
                          sx={{ width: { xs: 75, sm: 90 }, ...fieldSx }}
                        />
                      </Stack>
                    </Box>
                  </Box>
                )}

                {/* Live video fields */}
                {form.interview_type === 'live-video' && (
                  <Stack spacing={{ xs: 1, sm: 1.5 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ fontSize: { xs: '0.62rem', sm: '0.68rem' } }}>
                      📅 Scheduled Date &amp; Time *
                    </Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                      <TextField
                        label="Start Date"
                        size="small"
                        type="date"
                        sx={{ flex: { sm: 2 }, ...fieldSx }}
                        InputLabelProps={{ shrink: true }}
                        value={form.scheduled_date || ''}
                        onChange={e => { f('scheduled_date', e.target.value); if (!form.scheduled_end_date) f('scheduled_end_date', e.target.value); }}
                      />
                      <TimePicker
                        label="Start"
                        timeValue={form.scheduled_time || '10:00'}
                        ampmValue={form.scheduled_ampm || 'AM'}
                        onTimeChange={v => f('scheduled_time', v)}
                        onAmpmChange={v => f('scheduled_ampm', v)}
                      />
                    </Stack>

                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ fontSize: { xs: '0.62rem', sm: '0.68rem' } }}>
                      🏁 End Date &amp; Time
                    </Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                      <TextField
                        label="End Date"
                        size="small"
                        type="date"
                        sx={{ flex: { sm: 2 }, ...fieldSx }}
                        InputLabelProps={{ shrink: true }}
                        value={form.scheduled_end_date || ''}
                        inputProps={{ min: form.scheduled_date || undefined }}
                        onChange={e => f('scheduled_end_date', e.target.value)}
                      />
                      <TimePicker
                        label="End"
                        timeValue={form.scheduled_end_time || '11:00'}
                        ampmValue={form.scheduled_end_ampm || 'AM'}
                        onTimeChange={v => f('scheduled_end_time', v)}
                        onAmpmChange={v => f('scheduled_end_ampm', v)}
                      />
                    </Stack>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                      <TextField
                        label="Duration (mins)"
                        size="small"
                        type="number"
                        sx={{ width: { xs: '100%', sm: 130 }, ...fieldSx }}
                        
                        inputProps={{ min: 15, step: 15 }}
                      />
                      <FormControl fullWidth size="small" sx={fieldSx}>
                        <InputLabel>Platform</InputLabel>
                        <Select value={form.platform || 'portal'} label="Platform" onChange={e => f('platform', e.target.value)}>
                          {[
                            { value: 'portal',      label: '🖥️ Portal Video Room (auto-assigned)' },
                            { value: 'google-meet', label: '📹 Google Meet' },
                            { value: 'zoom',        label: '💻 Zoom' },
                            { value: 'teams',       label: '📘 Microsoft Teams' },
                            { value: 'in-person',   label: '🏢 In-Person' },
                            { value: 'phone',       label: '📞 Phone Call' },
                          ].map(o => (
                            <MenuItem key={o.value} value={o.value} sx={{ fontSize: { xs: '0.72rem', sm: '0.8rem' } }}>
                              {o.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Stack>

                    {form.platform !== 'portal' && form.platform !== 'in-person' && form.platform !== 'phone' && (
                      <TextField
                        label="Meeting URL *"
                        size="small"
                        fullWidth
                        required
                        value={form.meeting_url || ''}
                        onChange={e => f('meeting_url', e.target.value)}
                        placeholder={
                          form.platform === 'google-meet' ? 'https://meet.google.com/abc-defg-hij' :
                          form.platform === 'zoom'        ? 'https://zoom.us/j/123456789' :
                          form.platform === 'teams'       ? 'https://teams.microsoft.com/l/meetup-join/...' : 'https://...'
                        }
                        helperText="Candidates click this link to join the meeting"
                        sx={fieldSx}
                      />
                    )}

                    {(!form.platform || form.platform === 'portal') && (
                      <Alert severity="info" sx={{ py: 0.5, fontSize: { xs: '0.65rem', sm: '0.72rem' }, borderRadius: '10px' }}>
                        A portal video conference room will be automatically assigned when scheduled.
                      </Alert>
                    )}
                  </Stack>
                )}

                {/* Notification chips */}
                <Box
                  sx={{
                    p: { xs: 1.2, sm: 1.5 },
                    bgcolor: 'grey.50',
                    borderRadius: { xs: '8px', sm: '10px' },
                  }}
                >
                  <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ fontSize: { xs: '0.62rem', sm: '0.68rem' } }}>
                    Notify candidates via
                  </Typography>
                  <Stack direction="row" spacing={0.8} sx={{ mt: 0.5 }} flexWrap="wrap" useFlexGap>
                    {[
                      { key: 'notify_app',   label: '📱 In-App' },
                      { key: 'notify_email', label: '📧 Email' },
                      { key: 'notify_sms',   label: '💬 SMS' },
                    ].map(({ key, label }) => (
                      <Chip
                        key={key}
                        label={label}
                        size="small"
                        color={form[key] ? 'primary' : 'default'}
                        variant={form[key] ? 'filled' : 'outlined'}
                        onClick={() => f(key, !form[key])}
                        sx={{
                          cursor: 'pointer',
                          fontSize: { xs: '0.6rem', sm: '0.65rem' },
                          height: { xs: 22, sm: 26 },
                        }}
                      />
                    ))}
                  </Stack>
                </Box>
              </Stack>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>

      {/* Review panel */}
      {reviewMode && (
        <Box
          sx={{
            px: { xs: 2, sm: 3 },
            py: { xs: 1.5, sm: 2 },
            bgcolor: 'grey.50',
            borderTop: '1px solid',
            borderColor: 'divider',
            '@media (max-width: 240px)': { px: 1.5, py: 1 },
          }}
        >
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.2, fontSize: { xs: '0.78rem', sm: '0.85rem' } }}>
            ✅ Review Before Submitting
          </Typography>
          <Stack spacing={0.5}>
            {[
              ['Interview Name', form.interview_name || '—'],
              ['Type',           form.interview_type],
              ['Round',          `${form.round_number} of ${form.total_rounds}`],
              ['Candidates',     `${selected.size} selected`],
              ['Job Title',      form.job_title || '—'],
              form.interview_type !== 'live-video'
                ? ['Window', `${form.window_start ? new Date(form.window_start).toLocaleString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit', hour12:true }) : 'Not set'} → ${form.window_end ? new Date(form.window_end).toLocaleString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit', hour12:true }) : 'Not set'}`]
                : ['Scheduled', form.scheduled_date ? `${form.scheduled_date} ${form.scheduled_time} ${form.scheduled_ampm}` : '—'],
              ...(form.interview_type === 'document' ? [
                ['Document', docFile ? docFile.name : '⚠️ No document uploaded'],
                ['Questions per Candidate', form.questions_per_candidate ? `${form.questions_per_candidate} (random per candidate)` : '⚠️ Not set'],
              ] : []),
            ].map(([label, val]) => (
              <Stack key={label} direction="row" spacing={1}>
                <Typography variant="caption" color="text.secondary"
                  sx={{ width: { xs: 110, sm: 130 }, flexShrink: 0, fontSize: { xs: '0.62rem', sm: '0.68rem' } }}>
                  {label}:
                </Typography>
                <Typography variant="caption" fontWeight={700}
                  sx={{ fontSize: { xs: '0.62rem', sm: '0.68rem' } }}
                  color={label === 'Document' && !docFile ? 'error.main' : 'inherit'}>
                  {val}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Box>
      )}

      <DialogActions
        sx={{
          px: { xs: 2, sm: 3 },
          pb: { xs: 2, sm: 2.5 },
          pt: { xs: 1.2, sm: 1.5 },
          borderTop: '1px solid',
          borderColor: 'divider',
          flexWrap: 'wrap',
          gap: 1,
          '@media (max-width: 240px)': { px: 1.5, pb: 1.5 },
        }}
      >
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            flex: 1,
            fontSize: { xs: '0.65rem', sm: '0.72rem' },
            display: { xs: 'none', sm: 'block' },
          }}
        >
          {selected.size > 0
            ? `${selected.size} candidate(s) will be scheduled`
            : 'Select candidates from the left panel'}
        </Typography>
        <Button
          onClick={onClose}
          sx={{ textTransform: 'none', fontSize: { xs: '0.75rem', sm: '0.82rem' }, color: '#64748B' }}
        >
          Cancel
        </Button>
        {!reviewMode ? (
          <Button
            variant="outlined"
            color="primary"
            disabled={selected.size === 0 || !form.interview_name.trim()}
            startIcon={<CheckCircle sx={{ fontSize: { xs: 13, sm: 15 } }} />}
            onClick={() => setReviewMode(true)}
            sx={{ textTransform: 'none', fontSize: { xs: '0.75rem', sm: '0.82rem' }, borderRadius: '10px' }}
          >
            Review
          </Button>
        ) : (
          <>
            <Button
              variant="outlined"
              onClick={() => setReviewMode(false)}
              sx={{ textTransform: 'none', fontSize: { xs: '0.75rem', sm: '0.82rem' }, borderRadius: '10px' }}
            >
              ← Edit
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={saving}
              startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <Send sx={{ fontSize: { xs: 13, sm: 15 } }} />}
              sx={{
                textTransform: 'none',
                borderRadius: '10px',
                bgcolor: '#1E3358',
                '&:hover': { bgcolor: '#152540' },
                fontSize: { xs: '0.75rem', sm: '0.82rem' },
              }}
            >
              {saving ? 'Scheduling…' : `Confirm & Schedule (${selected.size})`}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}