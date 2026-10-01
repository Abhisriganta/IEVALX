import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, CircularProgress, Button, Stack, Chip,
  Alert, IconButton, Tooltip, Dialog, Avatar,
  TextField, FormControl, InputLabel, Select, MenuItem,
  Card, CardContent, Pagination,
} from '@mui/material';
import {
  CheckCircle, Launch, Wifi, Business, SwapHoriz,
  ArrowBack, ArrowForward, Add, Close,
  CalendarMonth, AccessTime, LocationOn,
  // Round-type icons (replacing emojis for a proper design system)
  Assignment,        
  SmartToy,          
  Description,       
  Videocam,         
  School,            
  AutoAwesome,       
  EditNote,          
  WarningAmberRounded,
} from '@mui/icons-material';
  
import { useSnackbar } from 'notistack';
import { interviewAPI }  from '../../../services/api/employer/candidateService';
import axiosInstance     from '../../../services/api/axiosInstance';
import jobseekerService  from '../../../services/api/jobseeker/jobseekerService'
import { useNavigate }   from 'react-router-dom';
import AssessmentBuilder from '../Assessments/AssessmentBuilder';
import AIAssessmentBuilder from '../Assessments/AIAssessmentBuilder';
import DateTimeField from './pickers/DateTimeField';

// ═════════════════════════════════════════════════════════════════════════════
// ── WIZARD CONSTANTS ──────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════

const WIZARD_MODES = [
  {
    id: 'online', label: 'Online only',
    desc: 'AI assessment · AI interview · document test · live video portal',
    color: '#6C8B6B', bg: '#EDF3EC', border: '#C7D9C5',
  },
];

const EDIT_RED = {
  main:      '#C0392B',   
  dark:      '#8E2222',   
  text:      '#7F1D1D',   
  soft:      '#FDECEA',  
  softer:    '#FEF6F5',   
  border:    '#F1B7B0',   
  onPine:    '#FF8A7A',   
  onPineBg:  'rgba(192,57,43,0.16)',
  onPineBr:  'rgba(255,138,122,0.34)',
};

// ── Matches Pipeline.jsx ROUND_TYPES exactly ──────────────────────────────────
const WIZARD_ROUND_TYPES = [
  { value: 'aptitude',   label: 'Assessment',        Icon: Assignment,  color: '#C08A5B', desc: 'AI-generated or manually built test' },
  { value: 'ai-powered', label: 'AI Interview',       Icon: SmartToy,    color: '#24433E', desc: 'AI-powered Q&A with real-time CPS scoring' },
  { value: 'document',   label: 'Document Interview', Icon: Description, color: '#4B9E9A', desc: 'AI reads uploaded doc and generates unique questions' },
  { value: 'live-video', label: 'Live / Inline',      Icon: Videocam,    color: '#6C8B6B', desc: 'Video call or in-person interview via portal' },
];

// ── Matches Pipeline.jsx ROUND_NAME_OPTIONS exactly ───────────────────────────
const WIZARD_ROUND_NAMES = {
  document:     ['Technical Q&A Interview'],
  'ai-powered': ['AI Technical Interview'],
  aptitude:     ['AI-Generated Test', 'Manually Uploaded Test'],
  'live-video': ['Live Technical Interview'],
};

// Helper — find which option is selected from the full name string
const wSelectedOption = (fullName, options) => {
  if (!options?.length) return '';
  return options.find(o => fullName?.includes(o)) || options[0];
};
const wDisplayName = (name) => {
  if (!name) return name;
  return String(name).replace(/^Round\s+\d+\s*[—:\-]\s*/, '');
};

const WIZARD_DEFAULT_ROUNDS = {
  online: [
    { name: 'Round 1 — AI-Generated Test',      type: 'aptitude',   mode: 'online', order: 1 },
    { name: 'Round 2 — AI Technical Interview', type: 'ai-powered', mode: 'online', order: 2, interview_mode: 'standard' },
  ],
  offline: [
    { name: 'Round 1 — Live Technical Interview', type: 'live-video', mode: 'offline', order: 1 },
    { name: 'Round 2 — Live Manager Interview',   type: 'live-video', mode: 'offline', order: 2 },
    { name: 'Round 3 — Live HR Interview',        type: 'live-video', mode: 'offline', order: 3 },
  ],
  mixed: [
    { name: 'Round 1 — AI-Generated Test',        type: 'aptitude',   mode: 'online',  order: 1 },
    { name: 'Round 2 — AI Technical Interview',   type: 'ai-powered', mode: 'online',  order: 2, interview_mode: 'standard' },
    { name: 'Round 3 — Technical Test',           type: 'document',   mode: 'online',  order: 3 },
    { name: 'Round 4 — Live Technical Interview', type: 'live-video', mode: 'iaem',    order: 4 },
  ],
};

const WIZARD_STEP_LABELS    = ['Mode & candidates', 'Define rounds', 'Schedule', 'Review & launch'];
const WIZARD_DIFFICULTY_OPT = ['fresher', 'junior', 'mid', 'senior', 'expert'];

const wRoundColor = (mode) => {
  if (mode === 'slot')    return { color: '#4B9E9A', bg: '#E8F4F3', border: '#B8DDD9' };
  if (mode === 'iaem')    return { color: '#6366F1', bg: '#EEF2FF', border: '#C7D2FE' };
  if (mode === 'offline') return { color: '#C08A5B', bg: '#F7EFE6', border: '#E8D3B8' };
  return                         { color: '#6C8B6B', bg: '#EDF3EC', border: '#C7D9C5' };
};

// Compute a friendly duration label between two YYYY-MM-DD strings.
// Used by the Schedule step to show a helper under the availability window.
const wDurationLabel = (startDate, endDate) => {
  if (!startDate || !endDate) return null;
  const s = new Date(`${startDate}T00:00:00`);
  const e = new Date(`${endDate}T00:00:00`);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return null;
  const ms = e - s;
  if (ms < 0) return 'End is before start';
  const days = Math.round(ms / 86400000);
  if (days === 0) return 'Same day';
  if (days === 1) return '1 day';
  if (days < 7)   return `${days} days`;
  if (days === 7) return '1 week';
  if (days < 14 && days % 7 === 0) return `${days / 7} weeks`;
  return `${days} days`;
};

const wCandName = (c) =>
  c.full_name || c.applicant?.full_name || c.candidate?.full_name || c.candidate_name || c.email || 'Unknown';

const isEmailStr = (v) => typeof v === 'string' && v.includes('@');

const wCandIdentifiers = (c) => {
  const email =
    c.email ||
    c.applicant?.email ||
    c.candidate?.email ||
    c.applicant_email ||
    c.candidate_email ||
    null;

  const _xid = (v) => {
    if (v == null) return null;
    if (typeof v === 'number') return v;
    if (typeof v === 'string' && /^\d+$/.test(v)) return v;
    if (typeof v === 'object' && v.id != null) return v.id;
    return null;
  };
  const user_id = _xid(c.user) || c.user_id || null;

  return {
    application_id: c.id || c.application_id || null,
    portal_id:      c.candidate_id || c.applicant_id || c.portal_id || null,
    user_id,
    email,
  };
};

// ═════════════════════════════════════════════════════════════════════════════
// ── WIZARD PROGRESS ──────────────────────────────────────────────────────────


const WIZARD_STEP_HINTS = [
  "Pick who's interviewing and how",
  'Order and type of each round',
  'Windows, fixed dates, or slots',
  'Confirm and notify candidates',
];

function SidebarStepList({ step, onStepClick, disabled }) {
  return (
    <Stack spacing={0.25}>
      {WIZARD_STEP_LABELS.map((label, i) => {
        const done      = i < step;
        const active    = i === step;
        const hint      = WIZARD_STEP_HINTS[i];
        const clickable = !disabled && !active && typeof onStepClick === 'function';
        return (
          <Box
            key={i}
            onClick={clickable ? () => onStepClick(i) : undefined}
            role={clickable ? 'button' : undefined}
            tabIndex={clickable ? 0 : undefined}
            onKeyDown={clickable ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onStepClick(i); }
            } : undefined}
            sx={{
              display: 'flex', gap: 1.5, position: 'relative',
              py: 1.25, px: 1.25, borderRadius: '10px',
              bgcolor: active ? 'rgba(127,158,126,0.10)' : 'transparent',
              cursor: clickable ? 'pointer' : 'default',
              userSelect: 'none',
              transition: 'background 0.15s ease',
              '&:hover': clickable ? { bgcolor: 'rgba(127,158,126,0.07)' } : undefined,
              '&:focus-visible': clickable ? {
                outline: '2px solid #7F9E7E',
                outlineOffset: '2px',
              } : undefined,
            }}
          >
            {/* connector line between numbers */}
            {i < WIZARD_STEP_LABELS.length - 1 && (
              <Box sx={{
                position: 'absolute',
                left: '25px',
                top: '42px',
                width: '1.5px',
                height: 'calc(100% - 26px)',
                bgcolor: done ? '#7F9E7E' : 'rgba(255,255,255,0.10)',
              }} />
            )}
            {/* number bubble */}
            <Box sx={{
              width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.72rem', fontWeight: 700,
              bgcolor: done ? '#7F9E7E' : active ? '#7F9E7E' : 'rgba(255,255,255,0.06)',
              color:   done ? '#022124' : active ? '#FFFFFF' : '#7A8C87',
              border:  '1px solid',
              borderColor: (done || active) ? '#7F9E7E' : 'rgba(255,255,255,0.08)',
              boxShadow: active ? '0 0 0 3px rgba(127,158,126,0.20)' : 'none',
              transition: 'all 0.18s ease',
              zIndex: 1,
            }}>
              {done ? <CheckCircle sx={{ fontSize: 14 }} /> : i + 1}
            </Box>
            {/* label + hint */}
            <Box sx={{ minWidth: 0, pt: 0.2 }}>
              <Typography sx={{
                fontSize: '0.79rem',
                fontWeight: active ? 600 : 500,
                color: active ? '#FFFFFF' : done ? '#C7D9C5' : '#B8C4B7',
                lineHeight: 1.3,
              }}>
                {label}
              </Typography>
              <Typography sx={{
                fontSize: '0.68rem',
                color: active ? '#B8C4B7' : '#7A8C87',
                mt: 0.3, lineHeight: 1.4,
              }}>
                {hint}
              </Typography>
            </Box>
          </Box>
        );
      })}
    </Stack>
  );
}

function MobileProgressBar({ step }) {
  return (
    <Box sx={{ display: { xs: 'block', md: 'none' }, mb: 2 }}>
      <Stack direction="row" spacing={0.6} sx={{ mb: 1 }}>
        {WIZARD_STEP_LABELS.map((_, i) => (
          <Box key={i} sx={{
            flex: 1, height: 4, borderRadius: '2px',
            bgcolor: i <= step ? '#7F9E7E' : '#E7EAE3',
            transition: 'background 0.2s ease',
          }} />
        ))}
      </Stack>
      <Typography sx={{ fontSize: '0.7rem', color: '#6F7470', fontWeight: 500 }}>
        Step {step + 1} of {WIZARD_STEP_LABELS.length} — {WIZARD_STEP_LABELS[step]}
      </Typography>
    </Box>
  );
}


// props (schedule-only rebuild, R3).
const _NO_SIS    = Object.freeze([]);
const _NO_ROUNDS = Object.freeze([]);

function InterviewWizard({ open, onClose, onDone, job, candidates, processes, existingScheduled = _NO_SIS, procRounds = _NO_ROUNDS, existingProcess = null, existingPipelines = 0, forceNew = false }) {
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const companyId = JSON.parse(localStorage.getItem('ievalx_user') || '{}')?.company_id || null;
  const editingPipeline = !!existingProcess?.id;
  const pipelineLabel   = existingProcess
    ? (existingProcess.name
       || `Pipeline #${existingProcess.sequence_no || existingProcess.id}`)
    : '';
  const addingCount = (candidates || []).length;

  const [step,           setStep]           = useState(0);
  const [mode,           setMode]           = useState('online');
  const [rounds,         setRounds]         = useState([...WIZARD_DEFAULT_ROUNDS.online]);
  const [scheduleConfig, setScheduleConfig] = useState({});
  const [saving,         setSaving]         = useState(false);
  const [vacancies,      setVacancies]      = useState(1);
  const [testBuilderOpen, setTestBuilderOpen] = useState(false);
  const [testBuilderJob,  setTestBuilderJob]  = useState(null);
  const [manualAssessments, setManualAssessments] = useState([]);
  const [aiBuilderOpen, setAiBuilderOpen] = useState(false);
  const [aiBuilderJob,  setAiBuilderJob]  = useState(null);
  const [builderRoundIdx, setBuilderRoundIdx] = useState(null);
  const [missingTestWarn, setMissingTestWarn] = useState(null);

  // Success dialog after pipeline launch —

  // Success dialog after pipeline launch —{ createdCount, patchCount, notifyCount, inviteCount, candidateCount, roundCount, jobTitle }
  const [launchSuccess, setLaunchSuccess] = useState(null);
  const [candPage,     setCandPage]     = useState(1);
  const [candPageSize, setCandPageSize] = useState(10);
  // Set true by the open-effect when the ticked candidates have MORE
  // than one distinct pipeline shape. Rendered as an Alert in Step 0.
  const [pipelineMixedWarning, setPipelineMixedWarning] = useState(false);

  // ── UI-only refs: main-panel scroll target + last round row (for auto-scroll on Add round) ──
  const mainScrollRef  = useRef(null);
  const lastRoundRef   = useRef(null);
  const prevRoundsLen  = useRef(0);

  // Auto-scroll the main right panel so the newly-added round centers into view
  useEffect(() => {
    if (!open) { prevRoundsLen.current = rounds.length; return; }
    if (rounds.length > prevRoundsLen.current && lastRoundRef.current) {
      // Nested rAF: 1st waits for React commit, 2nd waits for browser layout
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          lastRoundRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      });
    }
    prevRoundsLen.current = rounds.length;
  }, [rounds.length, open]);

  // When the step changes (via sidebar click, Next, or Back), reset scroll to top
  useEffect(() => {
    if (!open || !mainScrollRef.current) return;
    mainScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step, open]);

  // Esc key closes the wizard (fixed-viewport mode — matches sidebar hint)
  useEffect(() => {
    if (!open) return;
    const handleEsc = (e) => {

      if (e.key === 'Escape' && !saving && !launchSuccess) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, saving, launchSuccess, onClose]);

  const _existingSisKey = React.useMemo(
    () => (existingScheduled || []).map(s => `${s.id}:${s.round_number}:${s.status}`).join('|'),
    [existingScheduled],
  );
  const _procRoundsKey = React.useMemo(
    () => (procRounds || []).map(r => `${r.id}:${r.order}:${r.round_type}`).join('|'),
    [procRounds],
  );

  // ── Reset on open + pre-fill existing schedule timings if editing ──────────
  useEffect(() => {
  if (!open) return;
  setStep(0); setSaving(false);
  setVacancies(job?.vacancies || 1);
  setPipelineMixedWarning(false); // reset every time wizard opens

  if (!procRounds || procRounds.length === 0) {
    setMode('online');
    setRounds([...WIZARD_DEFAULT_ROUNDS.online]);
    setScheduleConfig({});
    return;
  }

  const _SIsByCandidate = new Map();
  (existingScheduled || []).forEach(si => {
    const cid = si.candidate ?? si.candidate_id ?? si.user_id;
    if (cid == null) return;
    if (!_SIsByCandidate.has(cid)) _SIsByCandidate.set(cid, []);
    _SIsByCandidate.get(cid).push(si);
  });

  // Shape signature = sorted unique round_numbers joined by comma.
  const shapeSig = arr =>
    Array.from(new Set(arr.map(s => s.round_number))).sort((a, b) => a - b).join(',');

  const shapeCounts = new Map(); // sig -> { count, sample: [SIs] }
  for (const [, siList] of _SIsByCandidate.entries()) {
    const sig = shapeSig(siList);
    if (!sig) continue;
    const prev = shapeCounts.get(sig);
    if (prev) { prev.count += 1; }
    else      { shapeCounts.set(sig, { count: 1, sample: siList }); }
  }

  const shapeEntries = [...shapeCounts.entries()];
  const majorityShape = shapeEntries.sort((a, b) => b[1].count - a[1].count)[0] || null;
  const mixedPipelines = shapeEntries.length > 1;
  setPipelineMixedWarning(mixedPipelines);

  const _trustProcRounds = !!(existingProcess && procRounds && procRounds.length);
  // TEMP DEBUG — remove after we confirm the fix path
  console.log('[wizard debug] existingProcess?', !!existingProcess,
              '| procRounds count:', (procRounds || []).length,
              '| procRounds:', procRounds,
              '| _trustProcRounds:', _trustProcRounds,
              '| majorityShape sig:', majorityShape?.[0]);
  let rebuiltRounds;
  if (majorityShape && !_trustProcRounds) {
    // Rebuild from the candidates' OWN SI rows (per-candidate pipeline).
    const orderedSIs = [...majorityShape[1].sample].sort(
      (a, b) => (a.round_number || 1) - (b.round_number || 1)
    );
    const seenOrders = new Set();
    rebuiltRounds = [];
    orderedSIs.forEach(si => {
      const ord = si.round_number || 1;
      if (seenOrders.has(ord)) return;
      seenOrders.add(ord);
      const rType = si.interview_type || 'ai-powered';
      // Try to keep the recruiter-visible round name if this order also
      // exists in procRounds; otherwise derive one from the SI.
      const procMatch = (procRounds || []).find(p => p.order === ord);
      rebuiltRounds.push({
        name:           procMatch?.name || si.interview_name || `Round ${ord}`,
        type:           rType,
        mode:           rType === 'live-video' ? 'iaem' : 'online',
        order:          ord,
        _roundConfigId: procMatch?.id,
        ...(rType === 'ai-powered' ? { interview_mode: 'standard' } : {}),
      });
    });
  } else {
    
    rebuiltRounds = [...procRounds]
      .sort((a, b) => (a.order || 1) - (b.order || 1))
      .map((r, i) => {
        const rType = r.round_type || 'ai-powered';
        return {
          name:           r.name || `Round ${r.order || i + 1}`,
          type:           rType,
          mode:           rType === 'live-video' ? 'iaem' : 'online',
          order:          r.order || i + 1,
          _roundConfigId: r.id,
          ...(rType === 'ai-powered' ? { interview_mode: 'standard' } : {}),
        };
      });
  }
  setRounds(rebuiltRounds);
  setMode('online');

  const prefilledConfig = {};
  const _VALID_DIFF = ['fresher', 'junior', 'mid', 'senior', 'expert'];

  rebuiltRounds.forEach((r, i) => {
    const pr  = procRounds.find(p => p.order === r.order);
    const cfg = {};

    // Slot definitions removed for live-video — IAEM handles scheduling.
    // Only non-live-video slot rounds (if any) keep this path.
    if (r.mode === 'slot' && Array.isArray(pr?.slot_definitions) && pr.slot_definitions.length > 0) {
      cfg.slots = pr.slot_definitions.map(s => ({
        date: s.date || '',
        time: s.time || '10:00',
      }));
    }

    const sisForRound = (existingScheduled || []).filter(s => s.round_number === r.order);
    const sampleSI    = sisForRound
      .slice()
      .sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0))[0];

    if (sampleSI) {
      const ws = sampleSI.window_start ? new Date(sampleSI.window_start) : null;
      const we = sampleSI.window_end   ? new Date(sampleSI.window_end)   : null;
      const pad       = n => String(n).padStart(2, '0');
      const localDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      const localTime = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

      if (r.mode === 'offline' && ws) {
        cfg.fixed_date     = localDate(ws);
        cfg.fixed_time     = localTime(ws);
        cfg.fixed_end_time = we ? localTime(we) : '17:00';
        cfg.venue          = sampleSI.meeting_link || sampleSI.meeting_url || '';
      } else if (r.mode !== 'slot') {
        if (ws) {
          cfg.window_start_date = localDate(ws);
          cfg.window_start_time = localTime(ws);
        }
        if (we) {
          cfg.window_end_date = localDate(we);
          cfg.window_end_time = localTime(we);
        }
        cfg.difficulty  = _VALID_DIFF.includes(sampleSI.difficulty) ? sampleSI.difficulty : 'junior';
        cfg.meeting_url = sampleSI.meeting_link || sampleSI.meeting_url || '';
      }

      // Document round metadata
      if (r.type === 'document' && sampleSI.document_interview_id) {
        cfg._existingDocId             = sampleSI.document_interview_id;
        cfg._existingDocFilename       = sampleSI.document_original_filename || '';
        cfg.questions_per_candidate    = sampleSI.document_questions_per_candidate || '';
        cfg.duration_mins              = sampleSI.duration_mins || '';
      }

      cfg._existingInterviewId = sampleSI.id;
    }

    prefilledConfig[i] = cfg;
  });

  const r1 = prefilledConfig[0] || {};
  rebuiltRounds.forEach((_, i) => {
    if (i === 0) return;
    const cfg = prefilledConfig[i] || {};
    if (!cfg.window_start_date && !cfg.fixed_date && !cfg.slots) {
      prefilledConfig[i] = {
        ...cfg,
        window_start_date: r1.window_start_date || '',
        window_start_time: r1.window_start_time || '09:00',
        window_end_date:   r1.window_end_date   || '',
        window_end_time:   r1.window_end_time   || '18:00',
        difficulty:        r1.difficulty         || 'junior',
      };
    }
  });
  setScheduleConfig(prefilledConfig);
}, [open, job?.id, existingProcess?.id, _existingSisKey, _procRoundsKey]);

  // Fetch published assessments for aptitude round dropdown
  useEffect(() => {
    if (!open || !job?.id) return;
    axiosInstance.get('/employer/interviews/assessments/manual/', {
      params: { job_id: job.id }
    })
      .then(r => setManualAssessments(r.data || []))
      .catch(() => {});
  }, [open, job?.id]);
 

  // ── Mode ────────────────────────────────────────────────────────────────────
  const handleModeChange = (m) => {
    if (editingPipeline) return;   // see ROUNDS_LOCKED note below
    setMode(m);
    setRounds(WIZARD_DEFAULT_ROUNDS[m].map(r => ({ ...r })));
    setScheduleConfig({});
  };
  const roundsLocked = editingPipeline;

  // ── Rounds ──────────────────────────────────────────────────────────────────
  const addRound = () => {
    if (roundsLocked) return;
    const order   = rounds.length + 1;
    const isOff   = mode === 'offline';
    const type    = isOff ? 'live-video' : 'aptitude';
    const opts    = WIZARD_ROUND_NAMES[type] || [];
    const rMode   = isOff ? 'offline' : 'online';
    const name    = opts[0] ? `Round ${order} — ${opts[0]}` : `Round ${order} — Interview`;
    setRounds(prev => [...prev, { name, type, mode: rMode, order }]);
    if (type === 'aptitude') {
      _warnMissingPaperForRound(rounds.length, name);
    }
  };

  const addRoundOfMode = (rMode) => {
    if (roundsLocked) return;
    const order = rounds.length + 1;
    const type  = rMode === 'offline' ? 'live-video' : 'aptitude';
    const opts  = WIZARD_ROUND_NAMES[type] || [];
    const name  = opts[0] ? `Round ${order} — ${opts[0]}` : `Round ${order} — Interview`;
    const mode  = type === 'live-video' ? 'iaem' : 'online';
    setRounds(prev => [...prev, { name, type, mode, order }]);
    if (type === 'aptitude') {
      _warnMissingPaperForRound(rounds.length, name);
    }
  };

  const removeRound = (idx) => {
    if (roundsLocked) return;
    setRounds(prev => prev.filter((_, i) => i !== idx).map((r, i) => ({ ...r, order: i + 1 })));
    setScheduleConfig(prev => {
      const next = {};
      Object.keys(prev).forEach(k => {
        const ki = parseInt(k, 10);
        if (ki < idx)      next[ki]     = prev[ki];
        else if (ki > idx) next[ki - 1] = prev[ki];
      });
      return next;
    });
  };

  const updateRound = (idx, field, value) => {
    if (roundsLocked) return;
    setRounds(prev => prev.map((r, i) => {
      if (i !== idx) return r;
      if (field === 'type') {
        const opts    = WIZARD_ROUND_NAMES[value] || [];
        const newName = opts[0] ? `Round ${r.order} — ${opts[0]}` : r.name;
        const newMode = value === 'live-video' ? 'iaem' : 'online';
        const next    = { ...r, type: value, name: newName, mode: newMode };
        if (value === 'ai-powered') { next.interview_mode = 'standard'; }
        else                        { delete next.interview_mode; }
        return next;
      }
      return { ...r, [field]: value };
    }));
    if (field === 'type' && value === 'aptitude') {
      const opts    = WIZARD_ROUND_NAMES['aptitude'] || [];
      const orderNo = rounds[idx]?.order || idx + 1;
      const newName = opts[0] ? `Round ${orderNo} — ${opts[0]}` : (rounds[idx]?.name || '');
      _warnMissingPaperForRound(idx, newName);
    } else if (field === 'name' && rounds[idx]?.type === 'aptitude') {
      _warnMissingPaperForRound(idx, value);
    }
  };

  // ── Schedule config ─────────────────────────────────────────────────────────
  const getSched  = (idx) => scheduleConfig[idx] || {};
  const updSched  = (idx, field, value) => {
    setScheduleConfig(prev => ({ ...prev, [idx]: { ...(prev[idx] || {}), [field]: value } }));
  };
  const addSlot    = (rIdx) => { const s = getSched(rIdx).slots || []; updSched(rIdx, 'slots', [...s, { date: '', time: '10:00' }]); };
  const removeSlot = (rIdx, sIdx) => { updSched(rIdx, 'slots', (getSched(rIdx).slots || []).filter((_, i) => i !== sIdx)); };
  const updateSlot = (rIdx, sIdx, field, value) => {
    const s = [...(getSched(rIdx).slots || [])];
    s[sIdx] = { ...(s[sIdx] || {}), [field]: value };
    updSched(rIdx, 'slots', s);
  };
  const _effectiveCfgForRound = (i) => {
    const own = scheduleConfig[i] || {};
    if (i === 0) return own;
    const r1  = scheduleConfig[0] || {};
    return {
      ...own,
      window_start_date: own.window_start_date || r1.window_start_date || '',
      window_start_time: own.window_start_time || r1.window_start_time || '09:00',
      window_end_date:   own.window_end_date   || r1.window_end_date   || own.window_start_date || r1.window_start_date || '',
      window_end_time:   own.window_end_time   || r1.window_end_time   || '18:00',
      fixed_date:        own.fixed_date        || r1.fixed_date        || '',
      fixed_time:        own.fixed_time        || r1.fixed_time        || '09:00',
      fixed_end_time:    own.fixed_end_time    || r1.fixed_end_time    || '18:00',
      difficulty:        own.difficulty        || r1.difficulty        || 'junior',
    };
  };

  const _validateStep2Windows = () => {
    const IST_ = '+05:30';
    const problems = [];
    for (let i = 0; i < rounds.length; i++) {
      const r    = rounds[i];
      const cfg  = _effectiveCfgForRound(i);
      if (r.mode === 'iaem') {
        // IAEM handles scheduling — no validation needed here
        continue;
      }
      if (r.mode === 'slot') {
        const hasSlot = (cfg.slots || []).some(s => s.date && s.time);
        if (!hasSlot) problems.push(`Round ${r.order} (${wDisplayName(r.name)}) needs at least one time slot.`);
        continue;
      }
      if (r.mode === 'offline') {
        if (!cfg.fixed_date) { problems.push(`Round ${r.order} (${wDisplayName(r.name)}) needs a date.`); continue; }
        const wsD = new Date(`${cfg.fixed_date}T${cfg.fixed_time || '09:00'}:00${IST_}`);
        const weD = new Date(`${cfg.fixed_date}T${cfg.fixed_end_time || '18:00'}:00${IST_}`);
        if (isNaN(wsD.getTime()) || isNaN(weD.getTime()))
          problems.push(`Round ${r.order} (${wDisplayName(r.name)}) has an invalid date/time.`);
        else if (weD <= wsD)
          problems.push(`Round ${r.order} (${wDisplayName(r.name)}) end time must be after start time.`);
        continue;
      }
      // online mode
      if (!cfg.window_start_date) { problems.push(`Round ${r.order} (${wDisplayName(r.name)}) needs a start date.`); continue; }
      const wsD = new Date(`${cfg.window_start_date}T${cfg.window_start_time || '09:00'}:00${IST_}`);
      const weD = new Date(`${(cfg.window_end_date || cfg.window_start_date)}T${cfg.window_end_time || '18:00'}:00${IST_}`);
      if (isNaN(wsD.getTime()) || isNaN(weD.getTime()))
        problems.push(`Round ${r.order} (${wDisplayName(r.name)}) has an invalid date/time.`);
      else if (weD <= wsD)
        problems.push(`Round ${r.order} (${wDisplayName(r.name)}) window end must be after window start.`);
    }
    return problems;
  };
  const _findMissingTestRounds = () => (rounds || [])
    .map((r, idx) => ({ r, idx }))
    .filter(({ r, idx }) => r.type === 'aptitude' && !getSched(idx).assessment_id)
    .map(({ r, idx }) => ({
      idx,
      name: r.name || '',
      isAI: !!(r.name && r.name.includes('AI-Generated Test')),
    }));
  const _warnMissingPaperForRound = (idx, fullName) => {
    if (getSched(idx).assessment_id) return;
    const isAI = !!(fullName && fullName.includes('AI-Generated Test'));
    setMissingTestWarn({ rounds: [{ idx, name: fullName || '', isAI }] });
  };

  const goNext = async () => {
    if (step === 1 && (!rounds || rounds.length === 0)) {
      enqueueSnackbar('⚠️ Add at least one interview round to continue.',
        { variant: 'warning', autoHideDuration: 5000 });
      return;
    }
    if (step === 2) {
      const problems = _validateStep2Windows();
      if (problems.length) {
        problems.slice(0, 3).forEach(msg =>
          enqueueSnackbar(`⚠️ ${msg}`, { variant: 'warning', autoHideDuration: 6500 }));
        if (problems.length > 3) {
          enqueueSnackbar(`… and ${problems.length - 3} more round(s) need timing.`,
            { variant: 'warning', autoHideDuration: 6500 });
        }
        return;
      }
    }
    if (step < 3) { setStep(s => s + 1); } else { await handleLaunch(); }
  };
  const goBack = ()        => { if (step > 0) setStep(s => s - 1); else onClose(); };
  const goToStep = (targetStep) => {
    if (saving) return;
    if (targetStep === step) return;
    if (targetStep < 0 || targetStep >= WIZARD_STEP_LABELS.length) return;

    if (targetStep < step) {
      setStep(targetStep);
      return;
    }

   if (targetStep >= 2 && (!rounds || rounds.length === 0)) {
      enqueueSnackbar('⚠️ Add at least one interview round to continue.',
        { variant: 'warning', autoHideDuration: 5000 });
      if (step !== 1) setStep(1);
      return;
    }

    // Forward: gate the jump into Review (step 3) on Step-2 window validity
    if (targetStep >= 3 && step <= 2) {
      const problems = _validateStep2Windows();
      if (problems.length) {
        problems.slice(0, 3).forEach(msg =>
          enqueueSnackbar(`⚠️ ${msg}`, { variant: 'warning', autoHideDuration: 6500 }));
        if (problems.length > 3) {
          enqueueSnackbar(`… and ${problems.length - 3} more round(s) need timing.`,
            { variant: 'warning', autoHideDuration: 6500 });
        }
        // Land on Schedule so the user can fix the timings
        if (step !== 2) setStep(2);
        return;
      }
    }
    setStep(targetStep);
  };

  // ── Launch ──────────────────────────────────────────────────────────────────
 const handleLaunch = async () => {
  setSaving(true);
  const pad = n => String(n).padStart(2, '0');
  const toApiType = (t) => t;
  const toApiPlatform = (r) => (r.mode === 'offline' ? 'in-person' : 'google-meet');
  const _VALID_DIFF   = ['fresher', 'junior', 'mid', 'senior', 'expert'];

  const IST = '+05:30';
  const computeWindow = (r, cfg) => {
    if (r.mode === 'offline') {
      if (!cfg.fixed_date) return null;
      return {
        ws: `${cfg.fixed_date}T${cfg.fixed_time || '09:00'}:00${IST}`,
        we: `${cfg.fixed_date}T${cfg.fixed_end_time || '18:00'}:00${IST}`,
      };
    }
    if (r.mode === 'iaem') {
      // IAEM rounds don't need a window from the wizard — IAEM handles scheduling.
      // Return a wide default so the pipeline can create the round without errors.
      const now = new Date();
      const future = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      return {
        ws: now.toISOString(),
        we: future.toISOString(),
      };
    }
    if (r.mode === 'slot') {
      const first = (cfg.slots || []).find(s => s.date && s.time);
      if (!first) return null;
      return {
        ws: `${first.date}T${first.time}:00${IST}`,
        we: `${first.date}T23:59:00${IST}`,
      };
    }
    if (!cfg.window_start_date) return null;
    const ws = `${cfg.window_start_date}T${cfg.window_start_time || '09:00'}:00${IST}`;
    const we = cfg.window_end_date
      ? `${cfg.window_end_date}T${cfg.window_end_time || '18:00'}:00${IST}`
      : `${cfg.window_start_date}T23:59:00${IST}`;
    return { ws, we };
  };

  try {
    // ── Step 1: resolve the process ──────────────────────────────────────────
let processId;
try {
  const existingProc = existingProcess?.id
    ? existingProcess
    : (forceNew ? null : (processes || []).find(p => {
        const raw    = p.job_ref || p.job_id || p.job;
        const pJobId = (raw != null && typeof raw === 'object') ? raw.id : raw;
        return pJobId != null && String(pJobId) === String(job?.id);
      }));

  if (existingProc?.id) {
    processId = existingProc.id;
  } else {
    // Not found locally — call the API
    const res = await interviewAPI.createProcess({
      job_id:    job?.id,
      job_title: job?.title,
      vacancies,
    });
    processId = res.data?.id || res.data?.process_id;
  }
} catch (err) {
  const data   = err?.response?.data || {};
  const detail = data.detail
              || JSON.stringify(data)
              || err?.message
              || 'Unknown error';
  enqueueSnackbar(`❌ Could not create/find process: ${detail}`,
    { variant: 'error', autoHideDuration: 9000 });
  setSaving(false);
  return;
}
if (!processId) {
  enqueueSnackbar('❌ Could not resolve process — refresh and try again.',
    { variant: 'error' });
  setSaving(false);
  return;
}

    // ── Step 2: fetch current rounds ──
    let freshRounds = [];
    try {
      const r = await axiosInstance.get(`/employer/interviews/processes/${processId}/`);
      freshRounds = r.data?.rounds || [];
    } catch (_) {}

    // ── Step 3: create missing rounds ──
    const existingOrders = new Set(freshRounds.map(r => r.order));
    const failedRounds = [];
    if (roundsLocked) {
      console.info(
        `[wizard] ROUNDS_LOCKED — existing pipeline ${processId}: skipping `
        + 'round create/delete/sync/update. Timings only.'
      );
    } else {
    for (const r of rounds) {
      if (existingOrders.has(r.order)) continue;
      try {
        const _createPayload = {
          name: r.name, round_type: toApiType(r.type),
          order: r.order, duration: 60, passing_score: 70,
        };
        if (toApiType(r.type) === 'ai-powered') {
          _createPayload.interview_mode = r.interview_mode || 'standard';
        }
        await interviewAPI.createRound(processId, _createPayload);
        // END BUILD: 2026-08-13-campus-mode-persist-v1
      } catch (err) {
        failedRounds.push({ order: r.order, name: r.name,
          detail: err?.response?.data?.detail || 'Unknown error' });
      }
    }
    if (failedRounds.length > 0) {
      const msg = failedRounds.map(f => `R${f.order} (${f.name}): ${f.detail}`).join(' · ');
      enqueueSnackbar(`❌ Pipeline NOT saved: ${msg}.`,
        { variant: 'error', autoHideDuration: 12000 });
      return;
    }
    // Re-fetch to get IDs of newly created rounds
    try {
      const r = await axiosInstance.get(`/employer/interviews/processes/${processId}/`);
      freshRounds = r.data?.rounds || freshRounds;
    } catch (_) {}
    const desiredOrders = new Set(rounds.map(r => r.order));
    const staleRounds   = freshRounds.filter(fr => !desiredOrders.has(fr.order));
    for (const fr of staleRounds) {
      try { await interviewAPI.deleteRound(fr.id); }
      catch (e) { console.error(`[wizard] delete stale round R${fr.order} (id=${fr.id}):`, e?.response?.data); }
    }
    try { await interviewAPI.syncProcessRounds(processId); }
    catch (e) { console.error('[wizard] sync rounds failed:', e?.response?.data); }
    // Refresh local round list so later steps see the trimmed pipeline.
    try {
      const r = await axiosInstance.get(`/employer/interviews/processes/${processId}/`);
      freshRounds = r.data?.rounds || freshRounds.filter(fr => desiredOrders.has(fr.order));
    } catch (_) {
      freshRounds = freshRounds.filter(fr => desiredOrders.has(fr.order));
    }

    // ── Step 4: update round types AND names if changed ──
    for (const r of rounds) {
      const existing = freshRounds.find(fr => fr.order === r.order);
      if (!existing) continue;
      const correctType = toApiType(r.type);
      const updates = {};
      if (existing.round_type !== correctType) updates.round_type = correctType;
      if (existing.name       !== r.name)      updates.name       = r.name;
      if (correctType === 'ai-powered') {
        const _desiredMode = r.interview_mode || 'standard';
        const _existingMode = existing.interview_mode || 'standard';
        if (_desiredMode !== _existingMode) {
          updates.interview_mode = _desiredMode;
        }
      }
      // END BUILD: 2026-08-13-campus-mode-persist-v1
      if (Object.keys(updates).length > 0) {
        try { await interviewAPI.updateRound(existing.id, updates); }
        catch (e) { console.error(`[wizard] update round R${r.order}:`, e?.response?.data || e); }
      }
    }

    // ── Step 5: save slot_definitions to RoundConfiguration ──
    // IAEM rounds (live-video) skip this — IAEM handles scheduling.
    for (const [i, r] of rounds.entries()) {
      if (r.mode !== 'slot') continue;  // only legacy slot rounds (not iaem)
      const cfg = getSched(i);
      const rc  = freshRounds.find(fr => fr.order === r.order);
      if (!rc?.id) continue;
      const slots = (cfg.slots || [])
        .filter(s => s.date && s.time)
        .map(s => ({ date: s.date, time: s.time }));
      try { await interviewAPI.updateRound(rc.id, { slot_definitions: slots }); }
      catch (e) { console.error(`[wizard] save slots R${r.order}:`, e?.response?.data); }
    }
    }
    // ── Step 5b: slot rounds → real bookable slots + booking invites ──
    // IAEM rounds (live-video) skip this entire block — IAEM handles scheduling.
    const addMinsToTime = (t, mins) => {
      const [h, m] = (t || '10:00').split(':').map(Number);
      const d = new Date(2000, 0, 1, h, (m || 0) + mins);
      return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    const bookingCandidateIds = (candidates || [])
      .map(c => {
        const ids = wCandIdentifiers(c);
        if (ids.user_id != null && /^\d+$/.test(String(ids.user_id))) return String(ids.user_id);
        if (ids.email && ids.email.includes('@')) return ids.email;
        return null;
      })
      .filter(v => v != null);
    let inviteCount = 0;

    for (const [i, r] of rounds.entries()) {
      if (r.mode !== 'slot') continue;  // only legacy slot rounds (not iaem)
      const rc  = freshRounds.find(fr => fr.order === r.order);
      if (!rc?.id) continue;
      const cfg = getSched(i);
      const slots = (cfg.slots || []).filter(s => s.date && s.time);
      if (slots.length === 0) continue;

      let existingAvail = [];
      try {
        const av = await axiosInstance.get('/employer/interviews/slots/availability/', {
          params: { process_id: processId },
        });
        existingAvail = av.data?.results || av.data || [];
      } catch (_) {}
      const alreadyHasAvail = (date, start) => {
        return existingAvail.some(a => {
          if (a.date !== date) return false;
          if (String(a.start_time).slice(0, 5) !== start) return false;
          const aProc = a.process_id ?? a.process;
          const aRound = a.round_config_id ?? a.round_config;
          const procMatch = aProc != null && String(aProc) === String(processId);
          const roundMatch = aRound != null && String(aRound) === String(rc.id);
          return procMatch && roundMatch;
        });
      };
      // one availability window per slot → exactly one bookable InterviewSlot each
      for (const s of slots) {
        if (alreadyHasAvail(s.date, s.time)) continue;   // created on a prior launch — skip
        try {
          await interviewAPI.createSlotAvailability({
            process_id:          processId,
            round_config_id:     rc.id,
            date:                s.date,
            start_time:          s.time,
            end_time:            addMinsToTime(s.time, 60),
            slot_duration_mins:  60,
            buffer_mins:         0,
            auto_generate_slots: true,
          });
        } catch (e) {
          const slotErr = e?.response?.data?.detail
            || JSON.stringify(e?.response?.data || {})
            || e?.message || 'unknown';
          console.error(
            `[wizard] availability R${r.order} ${s.date} ${s.time}: `
            + `HTTP ${e?.response?.status} — ${slotErr}`
          );
          const isDuplicate = e?.response?.status === 400
            && /already|exists|duplicate|unique/i.test(slotErr);
          if (!isDuplicate) {
            enqueueSnackbar(
              `⚠️ Slot ${s.date} ${s.time} for ${wDisplayName(r.name)} failed: ${slotErr}`,
              { variant: 'warning', autoHideDuration: 9000 },
            );
          }
        }
      }
      const doneForRound = new Set(
        (existingScheduled || [])
          .filter(s => s.round_number === r.order && ['completed', 'in_progress', 'scoring', 'locked', 'invited'].includes(s.status))
          .flatMap(s => [
            String(s.candidate?.id || ''),
            (s.candidate?.email || '').toLowerCase().trim(),
          ])
          .filter(Boolean)
      );
      const eligibleBookingIds = bookingCandidateIds.filter(id =>
        !doneForRound.has(id.includes('@') ? id.toLowerCase().trim() : id)
      );

      // email the slot-picker link to candidates (slots now exist either way)
       if (r.order === 1 && eligibleBookingIds.length > 0) {
        try {
          const inviteRes = await interviewAPI.sendBookingInvites({
            process_id:      processId,
            round_config_id: rc.id,
            candidate_ids:   eligibleBookingIds,
            expires_hours:   72,
            auto_extend:     false,
          });
          const sent = inviteRes?.data?.invites_sent ?? 0;
          if (sent > 0) {
            inviteCount += sent;
            enqueueSnackbar(`📅 ${sent} slot booking link(s) sent for ${wDisplayName(r.name)}.`, { variant: 'success' });
          }
        } catch (e) {
          console.error(`[wizard] booking invites R${r.order}: ${e?.response?.data?.detail || e?.response?.status}`);
        }
      }
    }
    const r1AlreadyScheduledEmails = new Set(
      (existingScheduled || [])
        .filter(s => s.round_number === 1)
        .map(s => (s.candidate?.email || '').toLowerCase().trim())
        .filter(Boolean)
    );
    const candidateIdentifiers = (candidates || []).map(wCandIdentifiers)
      .filter(c => c.application_id || c.portal_id || c.user_id || c.email);
    const newCandIdentifiers = candidateIdentifiers.filter(c => {
      if (c.email) return !r1AlreadyScheduledEmails.has(c.email.toLowerCase().trim());
      return !r1AlreadyScheduledEmails.has(String(c.user_id));
    });

    // ── Step 6: validate Round 1 window before any scheduling ──
    const round1 = rounds[0];
    if (!round1) {
      enqueueSnackbar('No rounds defined.', { variant: 'warning' });
      return;
    }
    const apiType1 = toApiType(round1.type);
    const cfg0     = getSched(0);
    let r1win      = computeWindow(round1, cfg0);
    if (!r1win) {
      const now  = new Date();
      const week = new Date(now.getTime() + 7 * 86400000);
      r1win = {
        ws: `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T09:00`,
        we: `${week.getFullYear()}-${pad(week.getMonth()+1)}-${pad(week.getDate())}T18:00`,
      };
    }
    if (round1.mode !== 'slot' && round1.mode !== 'iaem' && newCandIdentifiers.length > 0 && new Date(r1win.ws) < new Date()) {
      enqueueSnackbar('❌ Round 1 start time is in the past.',
        { variant: 'error', autoHideDuration: 9000 });
      setStep(2); setSaving(false); return;
    }
    if (new Date(r1win.we) <= new Date(r1win.ws)) {
      const safe = new Date(new Date(r1win.ws).getTime() + 7 * 86400000);
      r1win.we = `${safe.getFullYear()}-${pad(safe.getMonth()+1)}-${pad(safe.getDate())}T18:00`;
    }


    let createdCount = 0;
    const visibleSkipped = [];
    // IAEM (live-video) rounds still need bulkSchedule to enroll candidates
    // into PipelineMembership and create ScheduledInterview rows. IAEM only
    // handles slot scheduling — it works with candidates that already exist
    // in the pipeline. Without this call, IAEM Scheduling shows Total=0.
    if (round1.mode !== 'slot' && newCandIdentifiers.length > 0) {
      const candidateUserIds = newCandIdentifiers.map(c => c.user_id)
        .filter(v => v != null && /^\d+$/.test(String(v)));
      const _safeDiff = _VALID_DIFF.includes(cfg0.difficulty) ? cfg0.difficulty : 'junior';
      const payload = {
        process_id:            processId,
        candidate_identifiers: newCandIdentifiers,
        candidate_ids:         candidateUserIds,
        interview_type:        apiType1,
        interview_name:        `${job?.title} — ${round1.name}`,
        job_title:             job?.title || '',
        job_id:                String(job?.id || '0'),
        round_number:          1,
        total_rounds:          rounds.length,
        per_candidate_rounds:  candidateUserIds.reduce((acc, uid) => {
                                 acc[String(uid)] = rounds.length;
                                 return acc;
                               }, {}),
        vacancies,
        difficulty:            _safeDiff,
        time_limit_secs:       3600,
        notify_app:            true, notify_email: true, notify_sms: true,
        notify_whatsapp:       false, confirm: true,
        window_start:          r1win.ws, window_end: r1win.we,
        round_windows:         rounds.reduce((acc, r, i) => {
                                 if (r.order <= 1) return acc;
                                 let w = computeWindow(r, getSched(i));
                                 if (!w || !w.ws || !w.we) {
                                   w = { ws: r1win.ws, we: r1win.we };
                                 }
                                 acc[String(r.order)] = { window_start: w.ws, window_end: w.we };
                                 return acc;
                               }, {}),
        platform:              toApiPlatform(round1),
        meeting_url:           round1.mode === 'offline' ? (cfg0.venue || '') : (cfg0.meeting_url || ''),
        interview_mode:        apiType1 === 'ai-powered' ? (round1.interview_mode || 'standard') : 'standard',
        ...(apiType1 === 'aptitude' && cfg0.assessment_id ? { assessment_id: Number(cfg0.assessment_id) } : {}),
      };

      let bulkRes;
      if (apiType1 === 'document') {
        if (!cfg0._docFile && !cfg0._existingDocId) {
          enqueueSnackbar('⚠️ Round 1 is a document interview — upload a question document in the Schedule step.',
            { variant: 'warning', autoHideDuration: 9000 });
          setStep(2); setSaving(false); return;
        }
        const fd = new FormData();
        Object.entries(payload).forEach(([k, v]) => {
          if (v == null) return;
          if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'object') {
            fd.append(k, JSON.stringify(v));
          } else if (Array.isArray(v)) {
            fd.append(k, JSON.stringify(v));
          } else if (typeof v === 'object') {
            fd.append(k, JSON.stringify(v));
          } else { fd.append(k, String(v)); }
        });
        if (cfg0._docFile) fd.append('document_file', cfg0._docFile);
        if (cfg0._existingDocId) fd.append('existing_doc_id', String(cfg0._existingDocId));
        fd.append('questions_per_candidate', String(parseInt(cfg0.questions_per_candidate) || 10));
        if (cfg0.duration_mins) fd.append('duration_mins', String(parseInt(cfg0.duration_mins)));
        bulkRes = await axiosInstance.post('/employer/interviews/schedule/bulk/', fd,
          { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        bulkRes = await interviewAPI.bulkSchedule(payload);
      }

      const respData = bulkRes.data || {};
createdCount   = (respData.created_ids || []).length;
const SILENT = createdCount > 0
  ? new Set(['already_scheduled', 'already_scheduled_for_round', 'did_not_apply'])
  : new Set();

(respData.skipped || [])
  .filter(s => !SILENT.has(s.reason))
  .forEach(s => visibleSkipped.push(s));
    }

    let freshSIs = existingScheduled || [];
    {
      const desiredOrders = new Set(rounds.map(r => r.order));
      const _sleep = (ms) => new Promise(res => setTimeout(res, ms));
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          const sr = await interviewAPI.getScheduled({ process: processId });
          const list = sr.data?.results || sr.data || [];
          const gotOrders = new Set(list.map(s => s.round_number));
          const missing = [...desiredOrders].filter(o => !gotOrders.has(o));
          freshSIs = list;
          if (missing.length === 0) break;
          console.warn(`[wizard] getScheduled attempt ${attempt + 1}: still missing rounds ${missing.join(',')}`);
        } catch (e) {
          console.warn(`[wizard] getScheduled attempt ${attempt + 1} failed:`, e?.response?.data || e?.message);
        }
        await _sleep(250);
      }
    }

    
    // ── Step 9: PATCH every SI across every round with the configured timings ──
let patchCount = 0;
let notifyCount = 0;
const patchFailures = [];   // [{round, count, sampleDetail}]


const currentUserIds = new Set(
  (candidates || []).flatMap(c => {
    const ids = wCandIdentifiers(c);
    return [
      ids.user_id ? String(ids.user_id) : null,
      ids.email   ? ids.email.toLowerCase().trim() : null,
    ].filter(Boolean);
  })
);

for (const [i, r] of rounds.entries()) {
  const cfg = getSched(i);
  const _cfg0 = getSched(0);
  const _effCfg = (i === 0) ? cfg : {
    ...cfg,
    window_start_date: cfg.window_start_date || _cfg0.window_start_date || '',
    window_start_time: cfg.window_start_time || _cfg0.window_start_time || '09:00',
    window_end_date:   cfg.window_end_date   || _cfg0.window_end_date   || cfg.window_start_date || _cfg0.window_start_date || '',
    window_end_time:   cfg.window_end_time   || _cfg0.window_end_time   || '18:00',
    fixed_date:        cfg.fixed_date        || _cfg0.fixed_date        || '',
    fixed_time:        cfg.fixed_time        || _cfg0.fixed_time        || '09:00',
    fixed_end_time:    cfg.fixed_end_time    || _cfg0.fixed_end_time    || '18:00',
    difficulty:        cfg.difficulty        || _cfg0.difficulty        || 'junior',
  };
  let win = computeWindow(r, _effCfg);
  if (!win) win = { ws: r1win.ws, we: r1win.we };
  if (new Date(win.we) <= new Date(win.ws)) continue;
  const diff = _VALID_DIFF.includes(cfg.difficulty) ? cfg.difficulty : 'junior';
  const sisForRound = freshSIs.filter(s => s.round_number === r.order);
  let roundFails = 0;
  let sampleDetail = '';
  const TERMINAL = new Set(['completed', 'cancelled', 'in_progress', 'started', 'scoring', 'partial']);
  if (sisForRound.length === 0 && r.order > 1) {
    console.warn(`[wizard] PATCH loop: no SI found for Round ${r.order} (${wDisplayName(r.name)}) after bulk create -- window may not be applied.`);
    patchFailures.push({ round: r.order, name: r.name, count: 0, sampleDetail: 'No scheduled interview row found for this round yet. Try re-opening the wizard.' });
  }
  for (const si of sisForRound) {
    const siCandId    = String(si.candidate?.id || '');
    const siCandEmail = (si.candidate?.email || '').toLowerCase().trim();
    if (!currentUserIds.has(siCandId) && !currentUserIds.has(siCandEmail)) continue;
    if (TERMINAL.has(si.status)) continue;

  try {
    const _patchBody = {
      window_start: win.ws,
      window_end: win.we,
      difficulty: diff,
      interview_name: `${job?.title || ''} — ${r.name}`,
      total_rounds: rounds.length,
    };
    if ((r.type === 'aptitude' || r.type === 'ai-powered') && cfg.assessment_id) {
      _patchBody.assessment_id = Number(cfg.assessment_id);
    }
    await axiosInstance.patch(`/employer/interviews/schedule/${si.id}/`, _patchBody);
    patchCount++;
  } catch (err) {
    roundFails++;
    if (!sampleDetail) {
      sampleDetail = err?.response?.data?.detail
                  || JSON.stringify(err?.response?.data || {})
                  || err?.message
                  || 'unknown error';
    }
    console.error(`[wizard] PATCH SI ${si.id} R${r.order}:`, err?.response?.data);
  }

  if (r.order === 1 && r.mode !== 'slot' && r.mode !== 'iaem') {
    try {
      await interviewAPI.sendInvite(si.id, { force: true });
      notifyCount++;
    } catch (notifyErr) {
      console.error(
        `[wizard] re-invite FAILED SI=${si.id} siStatus=${si.status} ` +
        `candEmail=${si.candidate?.email} http=${notifyErr?.response?.status}`,
        notifyErr?.response?.data,
      );
    }
  }
}
  if (roundFails > 0) {
    patchFailures.push({ round: r.order, name: r.name, count: roundFails, sampleDetail });
  }
}

// Show user-visible warning so silent timing failures stop happening.
patchFailures.forEach(f => {
  enqueueSnackbar(
    `⚠️ Round ${f.round} (${f.name}): timing didn't save for ${f.count} candidate(s). Reason: ${f.sampleDetail}`,
    { variant: 'warning', autoHideDuration: 10000 }
  );
});

    // ── Step 10: handle document upload/replace per document round ──
    for (const [i, r] of rounds.entries()) {
      if (r.type !== 'document') continue;
      const cfg = getSched(i);
      if (!cfg._docFile) continue;       // no new file to upload
      const sisForRound = freshSIs.filter(s => s.round_number === r.order);
      const qpc         = parseInt(cfg.questions_per_candidate) || 10;
      const durMins     = parseInt(cfg.duration_mins) || 60;
      for (const si of sisForRound) {
        try {
          const fd = new FormData();
          fd.append('document_file', cfg._docFile);
          fd.append('questions_per_candidate', String(qpc));
          fd.append('duration_mins', String(durMins));
          if (si.document_interview_id) {
            await axiosInstance.put(
              `/employer/interviews/schedule/${si.id}/replace-document/`,
              fd, { headers: { 'Content-Type': 'multipart/form-data' } });
          } else {
            fd.append('scheduled_interview_id', String(si.id));
            fd.append('interview_name', r.name);
            await axiosInstance.post(
              '/employer/interviews/document/upload/',
              fd, { headers: { 'Content-Type': 'multipart/form-data' } });
          }
        } catch (err) {
          console.error(`[wizard] doc op SI ${si.id} R${r.order}:`, err?.response?.data);
        }
      }
    }

    // ── Step 11: report results ──
    visibleSkipped.forEach(s => {
      const reason = s.reason === 'pending'              ? 'pending in previous round — approve in Rankings first'
                   : s.reason === 'rejected'             ? 'rejected previously'
                   : s.reason === 'already_hired'        ? 'already hired'
                   : s.reason === 'completed_all_rounds' ? 'completed all rounds — use Hire flow'
                   : (s.reason || 'not eligible');
      enqueueSnackbar(`⚠️ ${s.name || `Candidate ${s.candidate_id}`}: ${reason}`,
        { variant: 'warning', autoHideDuration: 8000 });
    });

    const parts = [];
    if (patchCount   > 0) parts.push(`${patchCount} schedule(s) updated`);
    if (notifyCount  > 0) parts.push(`${notifyCount} candidate(s) re-notified`);
    if (createdCount > 0) parts.push(`${createdCount} newly scheduled`);
    if (inviteCount  > 0) parts.push(`${inviteCount} slot booking invite(s) sent`);
    if (parts.length > 0) {
      enqueueSnackbar(`🚀 ${parts.join(', ')}.`,
        { variant: 'success', autoHideDuration: 6000 });
    } else if (visibleSkipped.length === 0) {
      const hasSlotRound = rounds.some(r => r.mode === 'slot');
      if (hasSlotRound && bookingCandidateIds.length === 0) {
        enqueueSnackbar(
          '⚠️ No booking invites sent — selected candidates have no resolvable user IDs. ' +
          'Make sure they completed account signup.',
          { variant: 'warning', autoHideDuration: 9000 }
        );
      } else {
        enqueueSnackbar('All candidates were already scheduled — no changes needed.',
          { variant: 'info' });
      }
    }

    setLaunchSuccess({
      createdCount,
      patchCount,
      notifyCount,
      inviteCount,
      candidateCount: (candidates || []).length,
      roundCount:     rounds.length,
      jobTitle:       job?.title || '',
    });
  } catch (err) {
    const data = err?.response?.data || {};
    const nfe  = Array.isArray(data.non_field_errors) ? data.non_field_errors[0] : null;
    const detail = data.detail
      || (nfe === 'window_end must be after window_start.'
          ? '⚠️ End date must be after start date. Go back to Schedule.'
          : nfe)
      || err?.message
      || 'Something went wrong.';
    enqueueSnackbar(`❌ ${detail}`, { variant: 'error', autoHideDuration: 9000 });
  } finally {
    setSaving(false);
  }
};
 

  if (!job) return null;

  // ── Shared field style ──────────────────────────────────────────────────────
  const fSx = {
    '& .MuiInputBase-input':    { fontSize: '0.78rem', py: '6.5px', color: '#1F1F1F' },
    '& .MuiInputLabel-root':    { fontSize: '0.78rem', color: '#6F7470' },
    '& .MuiInputLabel-root.Mui-focused': { color: '#6C8B6B' },
    '& .MuiOutlinedInput-root': {
      borderRadius: '8px',
      '& fieldset':             { borderColor: '#E7EAE3' },
      '&:hover fieldset':       { borderColor: '#A8ADA8' },
      '&.Mui-focused fieldset': { borderColor: '#7F9E7E', borderWidth: '1.5px' },
    },
  };

  // ── Candidate chips (shown in header + step 0) ──────────────────────────────
const candChips = (candidates || []).slice(0, 4).map((c, i) => {
    const n = wCandName(c);
    const photoUrl = jobseekerService.photoUrlFor(c.candidate_id || c.applicant_id || c.portal_id);
    return (
      <Tooltip key={i} title={n} placement="bottom">
        <Avatar src={photoUrl} sx={{ width: 28, height: 28, fontSize: '0.66rem', fontWeight: 700, bgcolor: '#7F9E7E', color: '#FFFFFF', border: '1.5px solid #022124' }}>
          {n[0]?.toUpperCase() || '?'}
        </Avatar>
      </Tooltip>
    );
  });

  if (!open || !job) return null;

  return (
    <>
    <Box sx={{
      position: 'fixed',
      inset: 0,
      zIndex: 1300,
      bgcolor: '#FFFFFF',
      overflow: 'hidden',
      display: 'grid',
      gridTemplateColumns: { xs: '1fr', md: '300px 1fr' },
      height: { xs: '100vh', md: '100dvh' },
    }}>

      {/* ═══════════ LEFT: PINE SIDEBAR (desktop only) ═══════════ */}
      <Box sx={{
        display: { xs: 'none', md: 'flex' },
        flexDirection: 'column',
        bgcolor: '#022124',
        color: '#FFFFFF',
        p: 3,
        overflow: 'auto',
        '&::-webkit-scrollbar': { width: 4 },
        '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.08)', borderRadius: 2 },
      }}>
        {/* Top row: brand mark + close × button */}
        <Box sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          mb: 3,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{
              width: 26, height: 26, borderRadius: '8px',
              bgcolor: '#7F9E7E', color: '#022124',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'Jost','DM Sans',sans-serif",
              fontWeight: 700, fontSize: '13px',
              flexShrink: 0,
            }}>IE</Box>
            <Typography sx={{
              fontFamily: "'Jost','DM Sans',sans-serif",
              fontSize: '13px', fontWeight: 600, color: '#FFFFFF',
              letterSpacing: '0.02em',
            }}>IEvalx</Typography>
          </Box>
          <Tooltip title="Close (Esc)">
            <span>
              <IconButton
                onClick={saving ? undefined : onClose}
                disabled={saving}
                size="small"
                sx={{
                  bgcolor: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#B8C4B7',
                  width: 30, height: 30, borderRadius: '8px',
                  transition: 'all 0.15s ease',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.10)', color: '#FFFFFF' },
                  '&.Mui-disabled': { color: '#3E443F' },
                }}
              >
                <Close sx={{ fontSize: 16 }} />
              </IconButton>
            </span>
          </Tooltip>
        </Box>

        <Box sx={{
          bgcolor: editingPipeline ? EDIT_RED.onPineBg : 'rgba(127,158,126,0.08)',
          border: `1px solid ${editingPipeline ? EDIT_RED.onPineBr : 'rgba(127,158,126,0.15)'}`,
          borderLeft: editingPipeline ? `3px solid ${EDIT_RED.onPine}` : undefined,
          borderRadius: '12px',
          p: '14px 14px 12px',
          mb: 3,
        }}>
          {editingPipeline && (
            <Box sx={{
              display: 'inline-flex', alignItems: 'center', gap: 0.5,
              px: 0.9, py: 0.3, mb: 1, borderRadius: '6px',
              bgcolor: EDIT_RED.onPine, color: '#3B0A0A',
              fontSize: '9.5px', fontWeight: 800,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              lineHeight: 1.2,
            }}>
              ⚠ Editing existing pipeline
            </Box>
          )}
          <Typography sx={{
            fontSize: '10px', fontWeight: 700,
            color: editingPipeline ? EDIT_RED.onPine : '#7F9E7E',
            letterSpacing: '0.12em', textTransform: 'uppercase',
            mb: 0.75,
          }}>
            {editingPipeline ? `Adding to ${pipelineLabel}` : 'Scheduling for'}
          </Typography>
          <Typography sx={{
            fontFamily: "'Jost','DM Sans',sans-serif",
            fontSize: '15px', fontWeight: 600, color: '#FFFFFF',
            lineHeight: 1.3, letterSpacing: '-0.005em',
            overflow: 'hidden', textOverflow: 'ellipsis',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}>
            {job.title}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.75 }}>
            {/* BUILD: 2026-08-05-existing-pipeline-red-banner-v1 */}
            <Box sx={{
              width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
              bgcolor: editingPipeline ? EDIT_RED.onPine : '#7F9E7E',
            }} />
            <Typography sx={{
              fontSize: '11px',
              color: editingPipeline ? EDIT_RED.onPine : '#7A8C87',
              fontWeight: editingPipeline ? 600 : 400,
            }}>
              {editingPipeline ? 'adding ' : ''}
              {addingCount} candidate{addingCount !== 1 ? 's' : ''}
              {' · '}
              {WIZARD_MODES.find(m => m.id === mode)?.label || mode}
            </Typography>
          </Box>
        </Box>

        {/* Progress label */}
        <Typography sx={{
          fontSize: '10px', fontWeight: 700, color: '#7A8C87',
          letterSpacing: '0.12em', textTransform: 'uppercase',
          mb: 1.5, ml: 1.25,
        }}>
          Progress
        </Typography>

        {/* Vertical stepper */}
        <SidebarStepList step={step} onStepClick={goToStep} disabled={saving} />

        {/* Sidebar footer: Esc-to-exit keyboard hint */}
        <Box sx={{
          mt: 'auto', pt: 2.5,
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', gap: 1,
        }}>
          <Typography sx={{
            fontSize: '10.5px', color: '#7A8C87', lineHeight: 1.5,
          }}>
            Press{' '}
            <Box component="kbd" sx={{
              bgcolor: 'rgba(255,255,255,0.08)',
              color: '#B8C4B7',
              px: 0.75, py: 0.25, borderRadius: '4px',
              fontFamily: "'Inter', monospace",
              fontSize: '10px',
              border: '1px solid rgba(255,255,255,0.10)',
            }}>Esc</Box>{' '}
            to exit and return
          </Typography>
        </Box>
      </Box>

      {/* ═══════════ RIGHT: MAIN CONTENT ═══════════ */}
      <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>

        {editingPipeline && (
          <Box sx={{
            flexShrink: 0,
            display: 'flex', alignItems: 'center', gap: 1.25,
            px: { xs: 1.75, sm: 3 }, py: { xs: 1, sm: 1.15 },
            bgcolor: EDIT_RED.soft,
            borderBottom: `1px solid ${EDIT_RED.border}`,
            borderLeft: `4px solid ${EDIT_RED.main}`,
          }}>
            <Box sx={{
              width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
              bgcolor: EDIT_RED.main, color: '#FFFFFF',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '13px', fontWeight: 800, lineHeight: 1,
              fontFamily: "'Jost','DM Sans',sans-serif",
            }}>!</Box>
            <Typography sx={{
              fontSize: { xs: '0.72rem', sm: '0.8rem' },
              color: EDIT_RED.text, lineHeight: 1.4,
              minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              <Box component="span" sx={{
                fontWeight: 800, color: EDIT_RED.dark,
                letterSpacing: '0.04em', textTransform: 'uppercase',
                fontSize: { xs: '0.66rem', sm: '0.72rem' },
                mr: 0.75,
              }}>
                Adding a candidate
              </Box>
              You are adding to <strong>{pipelineLabel}</strong>. You only need to pick the timings.
            </Typography>
            <Box sx={{
              ml: 'auto', flexShrink: 0,
              display: { xs: 'none', sm: 'inline-flex' }, alignItems: 'center',
              px: 1.1, py: 0.35, borderRadius: '999px',
              bgcolor: '#FFFFFF', border: `1px solid ${EDIT_RED.border}`,
              color: EDIT_RED.main, fontWeight: 800,
              fontSize: '0.68rem', letterSpacing: '0.04em', whiteSpace: 'nowrap',
            }}>
              +{addingCount} candidate{addingCount !== 1 ? 's' : ''}
            </Box>
          </Box>
        )}

        {/* Mobile header (only <md) */}
        <Box sx={{
          display: { xs: 'flex', md: 'none' },
          alignItems: 'center', gap: 1.25,
          px: 2, py: 1.5,
          bgcolor: '#022124', color: '#FFFFFF',
          borderBottom: '1px solid #24433E',
        }}>
          <IconButton size="small" onClick={saving ? undefined : onClose} sx={{ color: '#B8C4B7', flexShrink: 0 }}>
            <ArrowBack fontSize="small" />
          </IconButton>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{
              fontFamily: "'Jost','DM Sans',sans-serif",
              fontSize: '0.9rem', fontWeight: 600, color: '#FFFFFF',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {job.title}
            </Typography>
            {/* BUILD: 2026-08-05-existing-pipeline-red-banner-v1 */}
            <Typography sx={{
              fontSize: '0.65rem',
              color: editingPipeline ? EDIT_RED.onPine : '#7A8C87',
              fontWeight: editingPipeline ? 700 : 400,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {editingPipeline
                ? `⚠ Editing ${pipelineLabel} · +${addingCount} candidate${addingCount !== 1 ? 's' : ''}`
                : `${addingCount} candidate${addingCount !== 1 ? 's' : ''} selected`}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex' }}>
            {candChips.slice(0, 3).map((chip, i) => (
              <Box key={i} sx={{ ml: i === 0 ? 0 : '-6px' }}>{chip}</Box>
            ))}
          </Box>
        </Box>
        <Box
          ref={mainScrollRef}
          sx={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            px: { xs: 2, sm: 5 },
            pt: 0,
            pb: { xs: 2, sm: 4 },
            bgcolor: '#FFFFFF',
            scrollBehavior: 'smooth',
            scrollbarGutter: 'stable',
            '&::-webkit-scrollbar': { width: 10 },
            '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
            '&::-webkit-scrollbar-thumb': {
              bgcolor: '#C7D9C5',
              borderRadius: 5,
              border: '2px solid #FFFFFF',
              backgroundClip: 'padding-box',
              transition: 'background 0.2s ease',
            },
            '&::-webkit-scrollbar-thumb:hover': { bgcolor: '#7F9E7E' },
            scrollbarWidth: 'thin',
            scrollbarColor: '#C7D9C5 transparent',
          }}
        >
          <MobileProgressBar step={step} />

          {/* Step eyebrow — "STEP 0X of 04" (pt provides the top breathing
              room that used to live on the scroll container). */}
          <Box sx={{
            display: 'flex', alignItems: 'baseline', gap: 1.25,
            pt: { xs: 2, sm: 4 },
            mb: 1,
          }}>
            <Typography sx={{
              fontSize: '10.5px', fontWeight: 700,
              color: '#6C8B6B', letterSpacing: '0.14em',
              textTransform: 'uppercase',
            }}>
              Step {String(step + 1).padStart(2, '0')}
            </Typography>
            <Typography sx={{
              fontSize: '12px', color: '#6F7470', fontWeight: 500,
            }}>
              of {String(WIZARD_STEP_LABELS.length).padStart(2, '0')}
            </Typography>
          </Box>

          {/* Step title */}
          <Typography sx={{
            fontFamily: "'Jost','DM Sans',sans-serif",
            fontSize: { xs: '1.4rem', sm: '1.65rem' }, fontWeight: 600,
            color: '#022124', letterSpacing: '-0.015em',
            lineHeight: 1.15, mb: 1,
          }}>
            {WIZARD_STEP_LABELS[step]}
          </Typography>
          <Typography sx={{
            fontSize: '0.85rem', color: '#6F7470', mb: 3.5,
            lineHeight: 1.55, maxWidth: 640,
          }}>
           
            {step === 0 && (editingPipeline
              ? `Confirm who you are adding to ${pipelineLabel} and check the interview format.`
              : 'Confirm who you are interviewing and choose the interview format.')}
            {step === 1 && (editingPipeline
              ? `${pipelineLabel}’s rounds, shown read-only. Round structure cannot be changed from here — only the timings on the next step.`
              : 'Design the interview rounds the way you want them run. Reorder, add, or remove as needed — the pipeline flow at the bottom updates live.')}
            {step === 2 && (editingPipeline
              ? `Set a fresh window for each round. These timings apply only to the ${addingCount} candidate${addingCount !== 1 ? 's' : ''} you are adding — existing members are not re-timed.`
              : 'Set when each round happens. Online windows, fixed dates, or slot pickers.')}
            {step === 3 && (editingPipeline
              ? `Review before you commit. Launch adds the selected candidate${addingCount !== 1 ? 's' : ''} to ${pipelineLabel} with the timings above. The pipeline’s rounds are unchanged.`
              : 'Review the pipeline. Launch to notify candidates for Round 1.')}
          </Typography>

          {/* ─────────── STEP 0: Mode & candidates ─────────── */}
          {step === 0 && (
            <Box>
              {editingPipeline && (
                <Box sx={{
                  mb: 2.5, borderRadius: '12px',
                  bgcolor: EDIT_RED.soft,
                  border: `1.5px solid ${EDIT_RED.border}`,
                  borderLeft: `5px solid ${EDIT_RED.main}`,
                  p: { xs: 1.75, sm: 2.25 },
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                    <Box sx={{
                      width: 30, height: 30, borderRadius: '9px', flexShrink: 0,
                      bgcolor: EDIT_RED.main, color: '#FFFFFF',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '17px', fontWeight: 800, lineHeight: 1,
                      fontFamily: "'Jost','DM Sans',sans-serif",
                    }}>!</Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography sx={{
                        fontSize: '0.7rem', fontWeight: 800, color: EDIT_RED.main,
                        letterSpacing: '0.1em', textTransform: 'uppercase',
                        lineHeight: 1.2, mb: 0.6,
                      }}>
                        You are adding to an existing pipeline — not creating a new one
                      </Typography>
                      <Typography sx={{
                        fontFamily: "'Jost','DM Sans',sans-serif",
                        fontSize: '1rem', fontWeight: 700, color: EDIT_RED.dark,
                        lineHeight: 1.3, mb: 0.9, letterSpacing: '-0.005em',
                      }}>
                        {pipelineLabel}
                      </Typography>
                      <Typography sx={{
                        fontSize: '0.82rem', color: EDIT_RED.text,
                        lineHeight: 1.6, mb: 1.25,
                      }}>
                        The interview rounds for {pipelineLabel} are already set and
                        <strong> can’t be changed here</strong>, so the people already in
                        this pipeline aren’t affected. You’ll see the rounds on the next
                        step, just to view.
                      </Typography>

                      <Stack spacing={0.85}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                          <Box sx={{
                            mt: '5px', width: 6, height: 6, borderRadius: '50%',
                            bgcolor: EDIT_RED.main, flexShrink: 0,
                          }} />
                          <Typography sx={{ fontSize: '0.8rem', color: EDIT_RED.text, lineHeight: 1.55 }}>
                            <strong>Rounds stay the same.</strong> You can’t add, remove
                            or rename any round here. Everyone already in {pipelineLabel}
                            keeps the same rounds.
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                          <Box sx={{
                            mt: '5px', width: 6, height: 6, borderRadius: '50%',
                            bgcolor: EDIT_RED.main, flexShrink: 0,
                          }} />
                          <Typography sx={{ fontSize: '0.8rem', color: EDIT_RED.text, lineHeight: 1.55 }}>
                            <strong>You only pick the timings.</strong> The dates and
                            slots you choose in the <em>Schedule</em> step apply only to
                            the {addingCount} candidate{addingCount !== 1 ? 's' : ''} you
                            are adding now. Everyone already in the pipeline keeps their
                            original schedule.
                          </Typography>
                        </Box>
                      </Stack>

                      <Typography sx={{
                        mt: 1.35, pt: 1.15,
                        borderTop: `1px dashed ${EDIT_RED.border}`,
                        fontSize: '0.78rem', color: EDIT_RED.text, lineHeight: 1.5,
                      }}>
                        Need a different set of rounds? Press{' '}
                        <Box component="kbd" sx={{
                          bgcolor: '#FFFFFF', color: EDIT_RED.dark,
                          px: 0.7, py: 0.2, borderRadius: '4px',
                          fontFamily: "'Inter', monospace", fontSize: '0.72rem',
                          border: `1px solid ${EDIT_RED.border}`,
                        }}>Esc</Box>{' '}
                        and choose <strong>Create new pipeline</strong> instead — that’s
                        the only way to run a different set of rounds for this job.
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              )}
              {pipelineMixedWarning && !roundsLocked && (
                <Alert
                  severity="warning"
                  sx={{
                    mb: 2.5,
                    borderRadius: '10px',
                    fontFamily: 'inherit',
                    fontSize: '0.82rem',
                    alignItems: 'flex-start',
                  }}
                >
                  <strong>Different pipelines detected.</strong> The candidates
                  you selected were originally scheduled on different pipeline
                  shapes (e.g. some on 2 rounds, others on 5). The wizard is
                  showing the most common shape so you can edit timings
                  safely. Any structural changes you make (adding or removing
                  rounds) will only apply to newly-added candidates — the
                  existing per-candidate pipelines are preserved.
                </Alert>
              )}
              <Typography sx={{ fontSize: '0.68rem', fontWeight: 600, color: '#6F7470', mb: 1.25, textTransform: 'uppercase', letterSpacing: '0.09em' }}>
                Interview mode{roundsLocked ? ' — locked to this pipeline' : ''}
              </Typography>
              <Stack spacing={1} sx={{ mb: 3 }}>
               
                {WIZARD_MODES.filter(m => !roundsLocked || m.id === mode).map(m => {
                  const active = mode === m.id;
                  const ModeIcon = m.id === 'online' ? Wifi : m.id === 'mixed' ? SwapHoriz : Business;
                  return (
                    <Box
                      key={m.id}
                      onClick={roundsLocked ? undefined : () => handleModeChange(m.id)}
                      sx={{
                        display: 'flex', alignItems: 'center', gap: 1.75,
                        p: 1.75, borderRadius: '10px',
                        cursor: roundsLocked ? 'default' : 'pointer',
                        bgcolor: active ? m.bg : '#FFFFFF',
                        border: active ? `1.5px solid ${m.color}` : '1px solid #E7EAE3',
                        transition: 'all 0.15s ease',
                        ...(roundsLocked ? {} : {
                          '&:hover': {
                            bgcolor: active ? m.bg : '#F6F8F3',
                            borderColor: active ? m.color : '#C7D9C5',
                          },
                        }),
                      }}
                    >
                      <Box sx={{
                        width: 38, height: 38, borderRadius: '10px', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        bgcolor: active ? m.color : '#EDF3EC',
                        color: active ? '#FFFFFF' : m.color,
                        transition: 'all 0.15s ease',
                      }}>
                        <ModeIcon sx={{ fontSize: 18 }} />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{
                          fontSize: '0.88rem', fontWeight: 600,
                          color: '#022124', lineHeight: 1.25,
                        }}>{m.label}</Typography>
                        <Typography sx={{
                          fontSize: '0.74rem', color: '#6F7470',
                          mt: 0.3, lineHeight: 1.4,
                        }}>{m.desc}</Typography>
                      </Box>
                      <Box sx={{
                        width: 20, height: 20, borderRadius: '50%',
                        border: '1.5px solid', borderColor: active ? m.color : '#CDD4CC',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, bgcolor: '#FFFFFF',
                        transition: 'all 0.15s ease',
                      }}>
                        {active && <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: m.color }} />}
                      </Box>
                    </Box>
                  );
                })}
              </Stack>

              <Typography sx={{ fontSize: '0.68rem', fontWeight: 600, color: '#6F7470', mb: 1.25, textTransform: 'uppercase', letterSpacing: '0.09em' }}>
                Scheduling for
              </Typography>
              {(() => {
                const allCands   = candidates || [];
                const totalC     = allCands.length;
                const effSize    = candPageSize === 'all' ? Math.max(totalC, 1) : candPageSize;
                const totalPages = Math.max(1, Math.ceil(totalC / effSize));
                // Clamp page if it drifts out of range after removals
                const safePage   = Math.min(candPage, totalPages);
                const pagedCands = allCands.slice((safePage - 1) * effSize, safePage * effSize);
                return (
                  <>
                    {/* Table container — proper 2-column table (Name | Experience) */}
                    <Box sx={{
                      bgcolor: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1px solid #E7EAE3',
                      overflow: 'hidden',
                      boxShadow: '0 1px 3px rgba(2,33,36,0.04)',
                    }}>
                      {/* Table header */}
                      <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 140px',
                        alignItems: 'center',
                        px: { xs: 1.5, sm: 2 }, py: 1.25,
                        bgcolor: '#F4F7F2',
                        borderBottom: '1px solid #E7EAE3',
                      }}>
                        <Typography sx={{
                          fontSize: '0.68rem', fontWeight: 700,
                          color: '#6F7470', textTransform: 'uppercase',
                          letterSpacing: '0.09em',
                        }}>
                          Name
                        </Typography>
                        <Typography sx={{
                          fontSize: '0.68rem', fontWeight: 700,
                          color: '#6F7470', textTransform: 'uppercase',
                          letterSpacing: '0.09em',
                          textAlign: 'right',
                        }}>
                          Experience
                        </Typography>
                      </Box>
                      {/* Table body */}
                      {pagedCands.map((c, i) => {
                        const n   = wCandName(c);
                        const exp = c.years_of_experience ?? c.relevant_experience_years ?? 0;
                        const photoUrl = jobseekerService.photoUrlFor(c.candidate_id || c.applicant_id || c.portal_id);
                        const isLast = i === pagedCands.length - 1;
                        return (
                          <Box key={i} sx={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 140px',
                            alignItems: 'center',
                            px: { xs: 1.5, sm: 2 }, py: 1.25,
                            borderBottom: isLast ? 'none' : '1px solid #F0F2ED',
                            transition: 'background-color 0.12s ease',
                            '&:hover': { bgcolor: '#F9FAF7' },
                          }}>
                            {/* Name column — avatar + name */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
                              <Avatar src={photoUrl} sx={{
                                width: 32, height: 32,
                                fontSize: '0.75rem', fontWeight: 700,
                                bgcolor: '#7F9E7E', color: '#FFFFFF',
                                flexShrink: 0,
                              }}>{n[0]?.toUpperCase()}</Avatar>
                              <Typography sx={{
                                fontSize: '0.85rem', fontWeight: 600, color: '#022124',
                                lineHeight: 1.35,
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                minWidth: 0,
                              }}>{n}</Typography>
                            </Box>
                            {/* Experience column — right-aligned */}
                            <Typography sx={{
                              fontSize: '0.8rem', fontWeight: 600, color: '#6F7470',
                              textAlign: 'right',
                            }}>
                              {exp} {exp === 1 ? 'year' : 'years'}
                            </Typography>
                          </Box>
                        );
                      })}
                    </Box>

                    {/* Pagination bar — matches InterviewRounds / Candidates pages */}
                    {totalC > 0 && (
                      <Box sx={{
                        mt: 2, mb: 1,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        flexWrap: 'wrap', gap: 1.5,
                      }}>
                        <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}>
                          <Typography sx={{ fontSize: '0.78rem', color: '#6F7470', fontWeight: 500, lineHeight: '34px' }}>
                            Showing{' '}
                            <Box component="span" sx={{ color: '#022124', fontWeight: 700 }}>
                              {totalC === 0 ? 0 : (safePage - 1) * effSize + 1}
                              {'–'}
                              {Math.min(safePage * effSize, totalC)}
                            </Box>{' '}
                            of{' '}
                            <Box component="span" sx={{ color: '#022124', fontWeight: 700 }}>{totalC}</Box>{' '}
                            candidate{totalC !== 1 ? 's' : ''}
                          </Typography>
                          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                            <Typography sx={{ fontSize: '0.78rem', color: '#6F7470', fontWeight: 500, lineHeight: '34px' }}>
                              Show
                            </Typography>
                            <Select
                              size="small"
                              value={candPageSize}
                              onChange={(e) => {
                                const v = e.target.value;
                                setCandPageSize(v === 'all' ? 'all' : Number(v));
                                setCandPage(1);
                              }}
                              renderValue={(v) => (v === 'all' ? 'All' : v)}
                              sx={{
                                fontSize: '0.78rem', fontWeight: 700, color: '#022124',
                                bgcolor: '#F6F8F3', borderRadius: '10px',
                                minWidth: 72, height: 34,
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#E7EAE3' },
                                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#C7D9C5' },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#6C8B6B' },
                              }}
                            >
                              {[5, 10, 25, 50, 'all'].map((n) => (
                                <MenuItem key={n} value={n} sx={{ fontSize: '0.78rem' }}>
                                  {n === 'all' ? 'All' : n}
                                </MenuItem>
                              ))}
                            </Select>
                            <Typography sx={{ fontSize: '0.78rem', color: '#6F7470', fontWeight: 500, lineHeight: '34px' }}>
                              per page
                            </Typography>
                          </Stack>
                        </Stack>
                        <Pagination
                          count={totalPages}
                          page={safePage}
                          onChange={(_, v) => setCandPage(v)}
                          shape="rounded"
                          siblingCount={0}
                          size="small"
                          sx={{
                            '& .MuiPaginationItem-root': {
                              fontWeight: 700, fontSize: '0.78rem', borderRadius: '8px',
                              color: '#6F7470',
                              '&:hover': { bgcolor: '#EDF3EC' },
                              '&.Mui-selected': {
                                bgcolor: '#022124', color: '#FFFFFF',
                                '&:hover': { bgcolor: '#24433E' },
                              },
                            },
                          }}
                        />
                      </Box>
                    )}
                  </>
                );
              })()}
            </Box>
          )}

          {/* ─────────── STEP 1: Define rounds ─────────── */}
          {step === 1 && (
            <Box>
              {/* Sticky section header — stays pinned FLUSH to the top of the
                  scroll area (no gap) because the scroll container now has
                  pt: 0. Solid opaque bg extends edge-to-edge via negative mx +
                  matching px, so rounds scroll cleanly under it. */}
              <Box
                sx={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 10,
                  bgcolor: '#FFFFFF',
                  mx: { xs: -2, sm: -5 },
                  px: { xs: 2, sm: 5 },
                  pt: 2,
                  pb: 2,
                  mb: 2.5,
                  borderBottom: '1px solid #E7EAE3',
                  boxShadow: '0 8px 20px -12px rgba(2,33,36,0.20)',
                }}
              >
                <Box sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  alignItems: { xs: 'stretch', sm: 'center' },
                  gap: { xs: 1.5, sm: 2 },
                  width: '100%',
                }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: '#6F7470', textTransform: 'uppercase', letterSpacing: '0.09em' }}>
                      Interview rounds (in order)
                    </Typography>
                  
                    <Box sx={{
                      display: 'flex', alignItems: 'center', gap: 0.75,
                      mt: 0.85, flexWrap: 'wrap', rowGap: 0.75,
                      overflowX: 'auto', '&::-webkit-scrollbar': { display: 'none' },
                    }}>
                      <Box sx={{
                        px: 1.25, py: 0.375, borderRadius: '999px',
                        bgcolor: '#EDF3EC', color: '#6C8B6B',
                        fontSize: '11px', fontWeight: 700,
                        border: '1px solid #C7D9C5',
                        whiteSpace: 'nowrap',
                      }}>
                        {WIZARD_MODES.find(m => m.id === mode)?.label}
                      </Box>

                      {rounds.length === 0 ? (
                        <Typography sx={{ fontSize: '12.5px', color: '#A8ADA8', fontStyle: 'italic' }}>
                          · No rounds yet — add your first round to start building the sequence
                        </Typography>
                      ) : (
                        <>
                          <Box component="span" sx={{ color: '#A8ADA8', fontSize: 12, fontWeight: 700 }}>·</Box>
                          {rounds.map((r, i) => {
                            const cfg   = WIZARD_ROUND_TYPES.find(x => x.value === r.type) || WIZARD_ROUND_TYPES[1];
                            const CIcon = cfg.Icon;
                            return (
                              <React.Fragment key={i}>
                                <Box sx={{
                                  display: 'inline-flex', alignItems: 'center', gap: 0.45,
                                  px: 1, py: 0.375, borderRadius: '999px',
                                  bgcolor: `${cfg.color}15`, color: cfg.color,
                                  border: `1px solid ${cfg.color}35`,
                                  fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap',
                                }}>
                                  <Box component="span" sx={{
                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                    minWidth: 16, height: 16, borderRadius: '50%',
                                    bgcolor: cfg.color, color: '#FFFFFF',
                                    fontSize: '9.5px', fontWeight: 800,
                                  }}>{i + 1}</Box>
                                  <CIcon sx={{ fontSize: 13, color: `${cfg.color} !important` }} />
                                  {wDisplayName(r.name) || cfg.label}
                                </Box>
                                {i < rounds.length - 1 && (
                                  <ArrowForward sx={{ fontSize: 13, color: '#A8ADA8', flexShrink: 0 }} />
                                )}
                              </React.Fragment>
                            );
                          })}
                          <ArrowForward sx={{ fontSize: 13, color: '#A8ADA8', flexShrink: 0 }} />
                          <Box sx={{
                            display: 'inline-flex', alignItems: 'center', gap: 0.35,
                            px: 1, py: 0.375, borderRadius: '999px',
                            bgcolor: '#EDF3EC', color: '#6C8B6B', fontWeight: 700,
                            border: '1px solid #C7D9C5',
                            fontSize: '11px', whiteSpace: 'nowrap',
                          }}>
                            ✅ Hired ({vacancies})
                          </Box>
                        </>
                      )}
                    </Box>
                  </Box>
                  <Box sx={{
                    display: 'flex',
                    gap: 1,
                    flexShrink: 0,
                    marginLeft: { sm: 'auto' },
                  }}>
                    {roundsLocked ? (
                      <Box sx={{
                        display: 'inline-flex', alignItems: 'center', gap: 0.75,
                        px: 1.6, py: 0.85, borderRadius: '10px',
                        bgcolor: EDIT_RED.soft, border: `1px solid ${EDIT_RED.border}`,
                        color: EDIT_RED.main, fontSize: '0.8rem', fontWeight: 700,
                        whiteSpace: 'nowrap',
                      }}>
                        <Box component="span" sx={{ fontSize: 14, lineHeight: 1 }}>🔒</Box>
                        Rounds locked
                      </Box>
                    ) : (
                    <>
                    {mode !== 'offline' && (
                      <Button
                        variant="contained"
                        startIcon={<Add sx={{ fontSize: 18 }} />}
                        onClick={() => addRoundOfMode('online')}
                        sx={{
                          textTransform: 'none',
                          fontSize: '0.85rem', fontWeight: 700,
                          borderRadius: '10px',
                          px: 2.25, py: 0.9,
                          bgcolor: '#7F9E7E', color: '#FFFFFF',
                          boxShadow: '0 4px 12px rgba(127,158,126,0.32)',
                          whiteSpace: 'nowrap',
                          '&:hover': {
                            bgcolor: '#6C8B6B',
                            boxShadow: '0 6px 18px rgba(127,158,126,0.44)',
                          },
                        }}
                      >
                        {mode === 'mixed' ? 'Add online' : 'Add round'}
                      </Button>
                    )}
                    {mode !== 'online' && (
                      <Button
                        variant="contained"
                        startIcon={<Add sx={{ fontSize: 18 }} />}
                        onClick={() => addRoundOfMode('offline')}
                        sx={{
                          textTransform: 'none',
                          fontSize: '0.85rem', fontWeight: 700,
                          borderRadius: '10px',
                          px: 2.25, py: 0.9,
                          bgcolor: '#C08A5B', color: '#FFFFFF',
                          boxShadow: '0 4px 12px rgba(192,138,91,0.32)',
                          whiteSpace: 'nowrap',
                          '&:hover': {
                            bgcolor: '#A5744B',
                            boxShadow: '0 6px 18px rgba(192,138,91,0.44)',
                          },
                        }}
                      >
                        {mode === 'mixed' ? 'Add offline' : 'Add round'}
                      </Button>
                    )}
                    </>
                    )}
                  </Box>
                </Box>
              </Box>

              
              {rounds.length === 0 && !roundsLocked && (
                <Box sx={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', gap: 2,
                  py: { xs: 5, sm: 7 }, px: { xs: 3, sm: 4 },
                  mb: 3,
                  bgcolor: '#F4F7F2',
                  border: '2px dashed #C7D9C5',
                  borderRadius: '16px',
                  textAlign: 'center',
                }}>
                  {/* Circular icon */}
                  <Box sx={{
                    width: 64, height: 64, borderRadius: '50%',
                    bgcolor: '#EDF3EC',
                    border: '1.5px solid #C7D9C5',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#6C8B6B',
                    mb: 0.5,
                  }}>
                    <Add sx={{ fontSize: 32 }} />
                  </Box>
                  <Box>
                    <Typography sx={{
                      fontFamily: "'Jost','DM Sans',sans-serif",
                      fontSize: '20px', fontWeight: 600, color: '#022124',
                      letterSpacing: '-0.01em', mb: 0.5,
                    }}>
                      No rounds yet
                    </Typography>
                    <Typography sx={{
                      fontSize: '13.5px', color: '#6F7470', lineHeight: 1.55,
                      maxWidth: 380, mx: 'auto',
                    }}>
                      Add your first interview round to start building the pipeline.
                      You'll be able to configure timing and launch once you're ready.
                    </Typography>
                  </Box>
                  {/* Primary CTA — mirrors the sticky header button */}
                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                    {mode !== 'offline' && (
                      <Button
                        variant="contained"
                        startIcon={<Add sx={{ fontSize: 20 }} />}
                        onClick={() => addRoundOfMode('online')}
                        sx={{
                          textTransform: 'none',
                          fontSize: '0.92rem', fontWeight: 700,
                          borderRadius: '10px',
                          px: 2.75, py: 1.1,
                          bgcolor: '#7F9E7E', color: '#FFFFFF',
                          boxShadow: '0 4px 14px rgba(127,158,126,0.34)',
                          '&:hover': {
                            bgcolor: '#6C8B6B',
                            boxShadow: '0 6px 20px rgba(127,158,126,0.46)',
                          },
                        }}
                      >
                        {mode === 'mixed' ? 'Add first online round' : 'Add first round'}
                      </Button>
                    )}
                    {mode !== 'online' && (
                      <Button
                        variant="contained"
                        startIcon={<Add sx={{ fontSize: 20 }} />}
                        onClick={() => addRoundOfMode('offline')}
                        sx={{
                          textTransform: 'none',
                          fontSize: '0.92rem', fontWeight: 700,
                          borderRadius: '10px',
                          px: 2.75, py: 1.1,
                          bgcolor: '#C08A5B', color: '#FFFFFF',
                          boxShadow: '0 4px 14px rgba(192,138,91,0.34)',
                          '&:hover': {
                            bgcolor: '#A5744B',
                            boxShadow: '0 6px 20px rgba(192,138,91,0.46)',
                          },
                        }}
                      >
                        {mode === 'mixed' ? 'Add first offline round' : 'Add first round'}
                      </Button>
                    )}
                  </Box>
                </Box>
              )}

              <Box sx={{ mb: 3, position: 'relative' }}>
                {rounds.map((r, i) => {
                  const cfg       = WIZARD_ROUND_TYPES.find(x => x.value === r.type) || WIZARD_ROUND_TYPES[1];
                  const nameOpts  = WIZARD_ROUND_NAMES[r.type];
                  const modeTag   = r.mode === 'iaem' ? 'IAEM' : r.mode === 'slot' ? 'Slot pick' : r.mode === 'offline' ? 'Offline' : 'Online';
                  const modeColor = r.mode === 'iaem' ? '#6366F1' : r.mode === 'slot' ? '#4B9E9A' : r.mode === 'offline' ? '#C08A5B' : '#6C8B6B';
                  const isLast    = i === rounds.length - 1;
                  return (
                    <Box
                      key={i}
                      ref={isLast ? lastRoundRef : undefined}
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '32px 1fr', sm: '40px 1fr auto' },
                        gap: { xs: 1.25, sm: 2 },
                        alignItems: 'flex-start',
                        position: 'relative',
                        py: 2,
                        // Connector line — only between rounds, not after the last one
                        '&:not(:last-child)::after': {
                          content: '""',
                          position: 'absolute',
                          left: { xs: '15px', sm: '19px' },
                          top: { xs: '56px', sm: '60px' },
                          bottom: { xs: '-4px', sm: '-4px' },
                          width: '2px',
                          background: '#E7EAE3',
                          zIndex: 0,
                        },
                      }}
                    >
                      {/* Timeline dot — outlined circle in the type color */}
                      <Box sx={{
                        width: { xs: 32, sm: 40 },
                        height: { xs: 32, sm: 40 },
                        borderRadius: '50%',
                        bgcolor: '#FFFFFF',
                        border: `2px solid ${cfg.color}`,
                        color: cfg.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: "'Jost','DM Sans',sans-serif",
                        fontSize: { xs: 13, sm: 15 }, fontWeight: 700,
                        flexShrink: 0,
                        position: 'relative', zIndex: 1,
                        mt: 0.25,
                      }}>
                        {r.order}
                      </Box>

                      {/* Content column: 2 rows */}
                      <Box sx={{ minWidth: 0 }}>
                        {/* Row 1 — chip-styled Type Select + Mode chip + Campus toggle */}
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mb: 1.25, rowGap: 1 }}>
                          {/* Round Type — chip-styled Select (no outer label / border) */}
                          <FormControl size="small" sx={{ minWidth: 0 }}>
                            <Select
                              value={r.type}
                              onChange={e => updateRound(i, 'type', e.target.value)}
                              /* BUILD: 2026-08-05-existing-pipeline-rounds-locked-v1 */
                              disabled={roundsLocked}
                              IconComponent={roundsLocked ? (() => null) : undefined}
                              variant="standard"
                              disableUnderline
                              MenuProps={{
                                paper: {
                                  sx: {
                                    borderRadius: '14px',
                                    border: '1.5px solid #7F9E7E',
                                    boxShadow: '0 20px 56px rgba(2,33,36,0.20), 0 6px 16px rgba(2,33,36,0.08)',
                                    mt: 0.75,
                                    p: 1,
                                    minWidth: 300,
                                    overflow: 'hidden',
                                    bgcolor: '#EDF3EC',
                                    '& .MuiList-root, & .MuiMenu-list': {
                                      bgcolor: 'transparent',
                                      py: 0,
                                    },
                                  }
                                }
                              }}
                              sx={{
                                '& .MuiSelect-select': {
                                  py: '8px', pl: 1.5, pr: '32px !important',
                                  fontSize: '12px', fontWeight: 700,
                                  letterSpacing: '0.02em',
                                  borderRadius: '8px',
                                  display: 'inline-flex !important', alignItems: 'center', gap: 0.85,
                                  bgcolor: `${cfg.color}22`,
                                  color: cfg.color,
                                  border: `1.5px solid ${cfg.color}55`,
                                  boxShadow: `0 2px 6px ${cfg.color}20, 0 1px 2px ${cfg.color}12`,
                                  minHeight: 'auto',
                                  transition: 'all 0.15s ease',
                                  '&:focus':  { bgcolor: `${cfg.color}2E`, borderRadius: '8px' },
                                  '&:hover':  {
                                    bgcolor: `${cfg.color}2E`,
                                    boxShadow: `0 4px 10px ${cfg.color}30, 0 2px 4px ${cfg.color}18`,
                                  },
                                },
                                '& .MuiSelect-icon': { color: cfg.color, right: 7, fontSize: 16, top: 'calc(50% - 9px)' },
                              }}
                              renderValue={(v) => {
                                const rt = WIZARD_ROUND_TYPES.find(x => x.value === v);
                                if (!rt) return null;
                                const IconC = rt.Icon;
                                return (
                                  <>
                                    <IconC sx={{ fontSize: 16, lineHeight: 1 }} />
                                    <span>{rt.label}</span>
                                  </>
                                );
                              }}
                            >
                              {WIZARD_ROUND_TYPES.map(rt => {
                                const IconC = rt.Icon;
                                return (
                                  <MenuItem
                                    key={rt.value}
                                    value={rt.value}
                                    sx={{
                                      py: 1.5, px: 1.75,
                                      borderRadius: '10px',
                                      mb: 0.5,
                                      bgcolor: '#FFFFFF !important',
                                      border: '1px solid #E7EAE3',
                                      transition: 'all 0.15s ease',
                                      '&:hover': {
                                        bgcolor: '#FFFFFF !important',
                                        borderColor: '#7F9E7E',
                                        transform: 'translateX(2px)',
                                        boxShadow: '0 4px 12px rgba(127,158,126,0.20)',
                                      },
                                      '&.Mui-selected': {
                                        bgcolor: '#7F9E7E !important',
                                        color: '#FFFFFF !important',
                                        borderColor: '#6C8B6B',
                                        boxShadow: '0 4px 12px rgba(127,158,126,0.36)',
                                        // Invert the icon tile so the icon reads as white-on-white
                                        // against the sage-filled selected state
                                        '& .rt-icon-tile': {
                                          bgcolor: 'rgba(255,255,255,0.20) !important',
                                          borderColor: 'rgba(255,255,255,0.35) !important',
                                          color: '#FFFFFF !important',
                                        },
                                        '& .rt-icon-tile .MuiSvgIcon-root': {
                                          color: '#FFFFFF !important',
                                        },
                                        '&:hover': {
                                          bgcolor: '#6C8B6B !important',
                                          transform: 'translateX(2px)',
                                        },
                                      },
                                      '&.Mui-selected.Mui-focusVisible': {
                                        bgcolor: '#7F9E7E !important',
                                      },
                                    }}
                                  >
                                    <Stack direction="row" spacing={1.75} alignItems="center" sx={{ width: '100%' }}>
                                      <Box
                                        className="rt-icon-tile"
                                        sx={{
                                          width: 40, height: 40, borderRadius: '10px',
                                          bgcolor: `${rt.color}22`,
                                          color: rt.color,
                                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                                          flexShrink: 0,
                                          border: `1px solid ${rt.color}35`,
                                          transition: 'all 0.15s ease',
                                        }}
                                      >
                                        <IconC sx={{ fontSize: 22, color: 'inherit' }} />
                                      </Box>
                                      <Box sx={{ minWidth: 0, flex: 1 }}>
                                        <Typography sx={{
                                          fontSize: '0.92rem', fontWeight: 700, lineHeight: 1.3,
                                          color: 'inherit',
                                        }}>
                                          {rt.label}
                                        </Typography>
                                        <Typography sx={{
                                          fontSize: '0.74rem', lineHeight: 1.4, mt: 0.25,
                                          color: 'inherit', opacity: 0.75,
                                        }}>
                                          {rt.desc}
                                        </Typography>
                                      </Box>
                                    </Stack>
                                  </MenuItem>
                                );
                              })}
                            </Select>
                          </FormControl>

                          {/* Mode chip — pill in the mode's color for at-a-glance recognition */}
                          <Chip
                            label={modeTag}
                            size="small"
                            sx={{
                              fontSize: '10.5px', height: 22, fontWeight: 700,
                              bgcolor: `${modeColor}15`,
                              color: modeColor,
                              border: `1px solid ${modeColor}45`,
                              borderRadius: '999px',
                              flexShrink: 0,
                              '& .MuiChip-label': { px: 1.1 },
                            }}
                          />

                          {/* Actions cluster — mobile shows inline, desktop shows in dedicated column.
                              On mobile we keep icon-only to save horizontal space; on desktop we get labels. */}
                          <Box sx={{
                            display: { xs: 'flex', sm: 'none' },
                            ml: 'auto', gap: 0.5, alignItems: 'center',
                          }}>
                            {/* Campus/Standard mobile — icon-only toggle */}
                            {r.type === 'ai-powered' && (
                              <Tooltip title={r.interview_mode === 'on_campus' ? 'Campus placement mode active' : 'Standard mode active'}>
                                <IconButton
                                  size="small"
                                  onClick={() => updateRound(i, 'interview_mode',
                                    r.interview_mode === 'on_campus' ? 'standard' : 'on_campus')}
                                  disabled={roundsLocked}
                                  sx={{
                                    width: 30, height: 30, borderRadius: '8px',
                                    bgcolor: r.interview_mode === 'on_campus' ? '#F7EFE6' : '#EDF3EC',
                                    color:   r.interview_mode === 'on_campus' ? '#C08A5B' : '#24433E',
                                    border:  r.interview_mode === 'on_campus' ? '1px solid #E8D3B8' : '1px solid #C7D9C5',
                                    boxShadow: '0 1px 3px rgba(2,33,36,0.06)',
                                    '&:hover': {
                                      bgcolor: r.interview_mode === 'on_campus' ? '#EDDCC7' : '#D7E4D5',
                                    },
                                  }}
                                >
                                  <School sx={{ fontSize: 15 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                            {r.type === 'aptitude' && r.name?.includes('Manually Uploaded Test') && (
                              <Tooltip title="Open Manual Test Builder">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    // BUILD: 2026-07-27-wizard-assessmentid-v1
                                    setBuilderRoundIdx(i);
                                    setTestBuilderJob({ id: job?.id, title: job?.title });
                                    setTestBuilderOpen(true);
                                  }}
                                  sx={{
                                    width: 30, height: 30, borderRadius: '8px',
                                    bgcolor: '#F7EFE6', color: '#C08A5B',
                                    border: '1px solid #E8D3B8',
                                    boxShadow: '0 1px 3px rgba(192,138,91,0.10)',
                                    '&:hover': { bgcolor: '#EDDCC7' },
                                  }}
                                >
                                  <EditNote sx={{ fontSize: 15 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                            {r.type === 'aptitude' && r.name?.includes('AI-Generated Test') && (
                              <Tooltip title="Open AI Assessment Builder">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    // BUILD: 2026-07-27-wizard-assessmentid-v1
                                    setBuilderRoundIdx(i);
                                    setAiBuilderJob({ id: job?.id, title: job?.title });
                                    setAiBuilderOpen(true);
                                  }}
                                  sx={{
                                    width: 30, height: 30, borderRadius: '8px',
                                    bgcolor: '#EDF3EC', color: '#24433E',
                                    border: '1px solid #C7D9C5',
                                    boxShadow: '0 1px 3px rgba(36,67,62,0.10)',
                                    '&:hover': { bgcolor: '#D7E4D5' },
                                  }}
                                >
                                  <AutoAwesome sx={{ fontSize: 15 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                            {/* BUILD: 2026-08-05-existing-pipeline-rounds-locked-v1 */}
                            {!roundsLocked && (
                            <Tooltip title="Remove round">
                              <IconButton
                                size="small"
                                onClick={() => removeRound(i)}
                                sx={{
                                  width: 28, height: 28, borderRadius: '8px',
                                  color: '#A8ADA8',
                                  '&:hover': { color: '#C0392B', bgcolor: '#F9ECEB' },
                                }}
                              >
                                <Close sx={{ fontSize: 15 }} />
                              </IconButton>
                            </Tooltip>
                            )}
                          </Box>
                        </Stack>

                        {/* Row 2 — Round Name (proper visible field with prominent depth shadow) */}
                        {nameOpts ? (
                          <FormControl size="small" fullWidth>
                            <Select
                              value={wSelectedOption(r.name, nameOpts)}
                              onChange={e => updateRound(i, 'name', `Round ${r.order} — ${e.target.value}`)}
                              /* BUILD: 2026-08-05-existing-pipeline-rounds-locked-v1 */
                              disabled={roundsLocked}
                              IconComponent={roundsLocked ? (() => null) : undefined}
                              MenuProps={{
                                paper: {
                                  sx: {
                                    borderRadius: '14px',
                                    border: '1.5px solid #7F9E7E',
                                    boxShadow: '0 20px 56px rgba(2,33,36,0.20), 0 6px 16px rgba(2,33,36,0.08)',
                                    mt: 0.75,
                                    p: 1,
                                    overflow: 'hidden',
                                    bgcolor: '#EDF3EC',
                                    // Ensure the MuiList inside doesn't paint over our sage bg
                                    '& .MuiList-root, & .MuiMenu-list': {
                                      bgcolor: 'transparent',
                                      py: 0,
                                    },
                                  }
                                }
                              }}
                              sx={{
                                '& .MuiSelect-select': {
                                  py: '13px', pl: 2, pr: '36px !important',
                                  fontFamily: "'Jost','DM Sans',sans-serif",
                                  fontSize: '15.5px', fontWeight: 600, color: '#022124',
                                  letterSpacing: '-0.005em',
                                  minHeight: 'auto',
                                },
                                '& .MuiOutlinedInput-notchedOutline': {
                                  borderColor: '#D6DAD1',
                                  borderWidth: '1.5px',
                                  transition: 'border-color 0.15s ease, box-shadow 0.2s ease',
                                },
                                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#7F9E7E', borderWidth: '1.5px' },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#6C8B6B', borderWidth: '2px' },
                                bgcolor: '#FFFFFF',
                                borderRadius: '12px',
                                // Prominent resting shadow — impossible to miss the field affordance
                                boxShadow: '0 6px 16px rgba(2,33,36,0.10), 0 2px 4px rgba(2,33,36,0.06)',
                                transition: 'box-shadow 0.2s ease',
                                '&:hover': {
                                  // Dramatic hover lift
                                  boxShadow: '0 14px 32px rgba(2,33,36,0.16), 0 4px 10px rgba(2,33,36,0.08)',
                                },
                                '& .MuiSelect-icon': { color: '#6C8B6B', right: 12, fontSize: 22 },
                              }}
                            >
                              {nameOpts.map(opt => (
                                <MenuItem
                                  key={opt}
                                  value={opt}
                                  sx={{
                                    borderRadius: '10px',
                                    mb: 0.5,
                                    py: 1.75, px: 2,
                                    bgcolor: '#FFFFFF !important',
                                    border: '1px solid #E7EAE3',
                                    fontFamily: "'Jost','DM Sans',sans-serif",
                                    fontSize: '15px', fontWeight: 600,
                                    color: '#022124 !important',
                                    letterSpacing: '-0.005em',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.25,
                                    transition: 'all 0.15s ease',
                                    '&:hover': {
                                      bgcolor: '#FFFFFF !important',
                                      borderColor: '#7F9E7E',
                                      transform: 'translateX(2px)',
                                      boxShadow: '0 4px 12px rgba(127,158,126,0.20)',
                                    },
                                    '&.Mui-selected': {
                                      bgcolor: '#7F9E7E !important',
                                      color: '#FFFFFF !important',
                                      borderColor: '#6C8B6B',
                                      boxShadow: '0 4px 12px rgba(127,158,126,0.36)',
                                      '&::before': {
                                        content: '"✓"',
                                        display: 'inline-flex',
                                        alignItems: 'center', justifyContent: 'center',
                                        width: 20, height: 20,
                                        fontSize: '13px', fontWeight: 900,
                                        borderRadius: '50%',
                                        bgcolor: 'rgba(255,255,255,0.22)',
                                        color: '#FFFFFF',
                                        flexShrink: 0,
                                      },
                                      '&:hover': {
                                        bgcolor: '#6C8B6B !important',
                                        transform: 'translateX(2px)',
                                      },
                                    },
                                    '&.Mui-selected.Mui-focusVisible': {
                                      bgcolor: '#7F9E7E !important',
                                    },
                                  }}
                                >
                                  {opt}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        ) : (
                          <TextField
                            size="small"
                            fullWidth
                            value={r.name}
                            onChange={e => updateRound(i, 'name', e.target.value)}
                            disabled={roundsLocked}
                            sx={{
                              '& .MuiInputBase-input': {
                                py: '13px', pl: 1.5,
                                fontFamily: "'Jost','DM Sans',sans-serif",
                                fontSize: '15.5px', fontWeight: 600, color: '#022124',
                                letterSpacing: '-0.005em',
                              },
                              '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: '#D6DAD1',
                                borderWidth: '1.5px',
                                transition: 'border-color 0.15s ease',
                              },
                              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#7F9E7E', borderWidth: '1.5px' },
                              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#6C8B6B', borderWidth: '2px' },
                              '& .MuiOutlinedInput-root': {
                                bgcolor: '#FFFFFF',
                                borderRadius: '12px',
                                boxShadow: '0 6px 16px rgba(2,33,36,0.10), 0 2px 4px rgba(2,33,36,0.06)',
                                transition: 'box-shadow 0.2s ease',
                                '&:hover': {
                                  boxShadow: '0 14px 32px rgba(2,33,36,0.16), 0 4px 10px rgba(2,33,36,0.08)',
                                },
                              },
                            }}
                          />
                        )}
                      </Box>

            
                      <Box sx={{
                        display: { xs: 'none', sm: 'flex' },
                        alignItems: 'center', gap: 0.75,
                        pt: 0.75, flexShrink: 0,
                      }}>
                        {/* Campus/Standard — AI Interview only. Same slot & styling as Build with AI. */}
                        {r.type === 'ai-powered' && (
                          <Tooltip
                            title={r.interview_mode === 'on_campus'
                              ? 'Campus placement mode: 25-min session, student-level Q&A, fresher scoring. Click to switch to standard.'
                              : 'Switch to Campus Placement mode — a shorter, fresher-focused format.'}
                            placement="top"
                          >
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<School sx={{ fontSize: 16 }} />}
                              onClick={() => updateRound(i, 'interview_mode',
                                r.interview_mode === 'on_campus' ? 'standard' : 'on_campus')}
                              disabled={roundsLocked}
                              sx={{
                                textTransform: 'none', fontSize: '0.72rem',
                                borderRadius: '8px', fontWeight: 700,
                                px: 1.25, py: 0.5, minHeight: 30, flexShrink: 0,
                                bgcolor: r.interview_mode === 'on_campus' ? '#F7EFE6' : '#EDF3EC',
                                color:   r.interview_mode === 'on_campus' ? '#C08A5B' : '#24433E',
                                borderColor: r.interview_mode === 'on_campus' ? '#E8D3B8' : '#C7D9C5',
                                boxShadow: r.interview_mode === 'on_campus'
                                  ? '0 1px 3px rgba(192,138,91,0.10)'
                                  : '0 1px 3px rgba(36,67,62,0.10)',
                                '&:hover': {
                                  bgcolor: r.interview_mode === 'on_campus' ? '#EDDCC7' : '#D7E4D5',
                                  borderColor: r.interview_mode === 'on_campus' ? '#C08A5B' : '#022124',
                                  boxShadow: r.interview_mode === 'on_campus'
                                    ? '0 2px 6px rgba(192,138,91,0.16)'
                                    : '0 2px 6px rgba(36,67,62,0.16)',
                                },
                              }}
                            >
                              {r.interview_mode === 'on_campus' ? 'Campus mode' : 'Standard'}
                            </Button>
                          </Tooltip>
                        )}

                        {r.type === 'aptitude' && r.name?.includes('Manually Uploaded Test') && (
                          <Tooltip title="Open Manual Test Builder">
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<EditNote sx={{ fontSize: 16 }} />}
                              onClick={() => {
                                // BUILD: 2026-07-27-wizard-assessmentid-v1
                                setBuilderRoundIdx(i);
                                setTestBuilderJob({ id: job?.id, title: job?.title });
                                setTestBuilderOpen(true);
                              }}
                              sx={{
                                textTransform: 'none', fontSize: '0.72rem',
                                borderRadius: '8px', fontWeight: 700,
                                px: 1.25, py: 0.5, minHeight: 30, flexShrink: 0,
                                bgcolor: '#F7EFE6', color: '#C08A5B',
                                borderColor: '#E8D3B8',
                                boxShadow: '0 1px 3px rgba(192,138,91,0.10)',
                                '&:hover': { bgcolor: '#EDDCC7', borderColor: '#C08A5B',
                                  boxShadow: '0 2px 6px rgba(192,138,91,0.16)' },
                              }}
                            >
                              Build test
                            </Button>
                          </Tooltip>
                        )}

                        {r.type === 'aptitude' && r.name?.includes('AI-Generated Test') && (
                          <Tooltip title="Open AI Assessment Builder">
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<AutoAwesome sx={{ fontSize: 16 }} />}
                              onClick={() => {
                                // BUILD: 2026-07-27-wizard-assessmentid-v1
                                setBuilderRoundIdx(i);
                                setAiBuilderJob({ id: job?.id, title: job?.title });
                                setAiBuilderOpen(true);
                              }}
                              sx={{
                                textTransform: 'none', fontSize: '0.72rem',
                                borderRadius: '8px', fontWeight: 700,
                                px: 1.25, py: 0.5, minHeight: 30, flexShrink: 0,
                                bgcolor: '#EDF3EC', color: '#24433E',
                                borderColor: '#C7D9C5',
                                boxShadow: '0 1px 3px rgba(36,67,62,0.10)',
                                '&:hover': { bgcolor: '#D7E4D5', borderColor: '#022124',
                                  boxShadow: '0 2px 6px rgba(36,67,62,0.16)' },
                              }}
                            >
                              Build with AI
                            </Button>
                          </Tooltip>
                        )}

                        {/* BUILD: 2026-08-05-existing-pipeline-rounds-locked-v1 */}
                        {!roundsLocked && (
                        <Tooltip title="Remove round">
                          <IconButton
                            size="small"
                            onClick={() => removeRound(i)}
                            sx={{
                              width: 32, height: 32, borderRadius: '8px',
                              color: '#A8ADA8',
                              border: '1px solid transparent',
                              '&:hover': { color: '#C0392B', bgcolor: '#F9ECEB', borderColor: '#E8D0CC' },
                            }}
                          >
                            <Close sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                        )}
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          )}

          {/* ─────────── STEP 2: Schedule ─────────── */}
          {step === 2 && (
            <Box>
              <Typography sx={{ fontSize: '0.75rem', color: '#6F7470', mb: 2.5, p: 1.5, bgcolor: '#F6F8F3', borderRadius: '8px', border: '1px solid #E7EAE3' }}>
                <Box component="span" sx={{ color: '#022124', fontWeight: 600 }}>Timing rules:</Box>{' '}
                Online rounds use a candidate window · Slot picks let candidates choose from your slots.
              </Typography>
              <Stack spacing={1.5}>
                {rounds.map((r, i) => {
                  const cfg      = getSched(i);
                  const rtCfg    = WIZARD_ROUND_TYPES.find(x => x.value === r.type) || WIZARD_ROUND_TYPES[1];
                  const isOnline = r.mode === 'online';
                  const isOff    = r.mode === 'offline';
                  const isSlot   = r.mode === 'slot';
                  const isIAEM   = r.mode === 'iaem';
                  const modeTag  = isIAEM ? 'IAEM Scheduled' : isSlot ? 'Slot pick' : isOnline ? 'Online · window' : 'Offline · fixed date';

                  return (
                    <Card key={i} variant="outlined" sx={{
                      border: '1px solid #E7EAE3',
                      borderLeft: `3px solid ${rtCfg.color}`,
                      bgcolor: '#FFFFFF', borderRadius: '10px', boxShadow: 'none',
                    }}>
                      <CardContent sx={{ pb: '16px !important', px: { xs: 1.5, sm: 2 }, pt: { xs: 1.5, sm: 2 } }}>
                        {/* Round header */}
                        <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 1.75 }}>
                          <Avatar sx={{
                            bgcolor: rtCfg.color, color: '#FFFFFF',
                            width: 28, height: 28, fontSize: 12, fontWeight: 700, flexShrink: 0,
                          }}>{i + 1}</Avatar>
                          <Typography sx={{ flex: 1, fontSize: '0.88rem', fontWeight: 600, color: '#022124' }}>{wDisplayName(r.name)}</Typography>
                          <Chip label={modeTag} size="small" sx={{
                            fontSize: '0.62rem', height: 22, fontWeight: 600,
                            bgcolor: `${rtCfg.color}18`, color: rtCfg.color,
                            border: `1px solid ${rtCfg.color}35`,
                            flexShrink: 0,
                          }} />
                        </Stack>

                        {/* Online: Availability window (custom sage pickers) */}
                        {isOnline && (
                          <Stack spacing={2}>
                            <Box>
                              {/* Section header */}
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                                <CalendarMonth sx={{ fontSize: 15, color: '#6C8B6B' }} />
                                <Typography sx={{
                                  fontSize: '11px', fontWeight: 700, color: '#6F7470',
                                  letterSpacing: '0.09em', textTransform: 'uppercase',
                                }}>
                                  Availability window
                                </Typography>
                              </Box>

                              {/* Starts + arrow + Ends */}
                              <Box sx={{
                                display: 'grid',
                                gridTemplateColumns: { xs: '1fr', sm: '1fr auto 1fr' },
                                gap: { xs: 1.5, sm: 2 },
                                alignItems: 'center',
                              }}>
                                <DateTimeField
                                  label="Starts"
                                  mode="datetime"
                                  dateValue={cfg.window_start_date || ''}
                                  timeValue={cfg.window_start_time || '09:00'}
                                  onDateChange={(d) => updSched(i, 'window_start_date', d)}
                                  onTimeChange={(t) => updSched(i, 'window_start_time', t)}
                                  placeholder="Pick date & time"
                                />
                                <Typography sx={{
                                  display: { xs: 'none', sm: 'block' },
                                  color: '#7F9E7E', fontSize: '22px',
                                  fontWeight: 300, textAlign: 'center',
                                }}>
                                  →
                                </Typography>
                                <DateTimeField
                                  label="Ends"
                                  mode="datetime"
                                  dateValue={cfg.window_end_date || ''}
                                  timeValue={cfg.window_end_time || '18:00'}
                                  onDateChange={(d) => updSched(i, 'window_end_date', d)}
                                  onTimeChange={(t) => updSched(i, 'window_end_time', t)}
                                  placeholder="Pick date & time"
                                />
                              </Box>

                              {/* Past time warning */}
                              {cfg.window_start_date && cfg.window_start_time &&
                                new Date(`${cfg.window_start_date}T${cfg.window_start_time}`) < new Date() && (
                                <Alert severity="warning" sx={{
                                  py: 0.5, mt: 1.5, fontSize: '0.73rem',
                                  borderRadius: '8px',
                                  bgcolor: '#F7EFE6', color: '#C08A5B',
                                  border: '1px solid #E8D3B8',
                                  '& .MuiAlert-icon': { color: '#C08A5B' },
                                }}>
                                  This start time is already in the past — candidates won't be able to attempt it.
                                </Alert>
                              )}

                              {/* Sage duration hint */}
                              {cfg.window_start_date && cfg.window_end_date && wDurationLabel(cfg.window_start_date, cfg.window_end_date) && (
                                <Box sx={{
                                  display: 'flex', alignItems: 'center', gap: 1,
                                  mt: 1.5, px: 1.5, py: 1.25,
                                  bgcolor: '#EDF3EC',
                                  border: '1px solid #C7D9C5',
                                  borderRadius: '8px',
                                }}>
                                  <CheckCircle sx={{ fontSize: 15, color: '#6C8B6B', flexShrink: 0 }} />
                                  <Typography sx={{ fontSize: '12.5px', color: '#6C8B6B', fontWeight: 500 }}>
                                    Duration:{' '}
                                    <Box component="span" sx={{ color: '#022124', fontWeight: 700 }}>
                                      {wDurationLabel(cfg.window_start_date, cfg.window_end_date)}
                                    </Box>
                                    {' · Candidates can attempt anytime in this window.'}
                                  </Typography>
                                </Box>
                              )}
                            </Box>

                            {/* Campus mode indicator (Difficulty UI removed — backend still gets 'junior') */}
                            {r.type === 'ai-powered' && r.interview_mode === 'on_campus' && (
                              <Chip
                                icon={<School sx={{ fontSize: 15, color: '#C08A5B !important' }} />}
                                label="Campus placement mode — student-level Q&A, fresher scoring"
                                size="small"
                                sx={{
                                  fontSize: '0.7rem', height: 24, fontWeight: 600,
                                  alignSelf: 'flex-start', px: 0.5,
                                  bgcolor: '#F7EFE6', color: '#C08A5B',
                                  border: '1px solid #E8D3B8',
                                }}
                              />
                            )}

                            {/* Document upload widget — unchanged behavior */}
                            {r.type === 'document' && (
                              <Box sx={{ mt: 0.5, pt: 2, borderTop: '1px dashed #E7EAE3' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.25 }}>
                                  <Description sx={{ fontSize: 17, color: '#4B9E9A' }} />
                                  <Typography sx={{
                                    fontSize: '11px', fontWeight: 700, color: '#6F7470',
                                    letterSpacing: '0.09em', textTransform: 'uppercase',
                                  }}>
                                    Question document
                                  </Typography>
                                </Box>

                                {cfg._existingDocFilename && !cfg._docFile && !cfg._replaceDoc && (
                                  <Stack direction="row" spacing={1} alignItems="center"
                                    sx={{ p: 1.25, bgcolor: '#EDF3EC', borderRadius: '8px', mb: 1, border: '1px solid #C7D9C5' }}>
                                    <CheckCircle sx={{ fontSize: 16, color: '#6C8B6B' }} />
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                      <Typography sx={{ fontSize: '0.75rem', color: '#6C8B6B', fontWeight: 600,
                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        Saved: {cfg._existingDocFilename}
                                      </Typography>
                                    </Box>
                                    <Button size="small" onClick={() => updSched(i, '_replaceDoc', true)}
                                      sx={{ fontSize: '0.7rem', textTransform: 'none', color: '#6C8B6B', fontWeight: 600 }}>
                                      Replace
                                    </Button>
                                  </Stack>
                                )}

                                {(!cfg._existingDocFilename || cfg._replaceDoc || cfg._docFile) && (
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    <input
                                      type="file" accept=".pdf,.doc,.docx,.txt"
                                      id={`doc-upload-r${i}`} style={{ display: 'none' }}
                                      onChange={e => {
                                        const file = e.target.files?.[0] || null;
                                        updSched(i, '_docFile', file);
                                        if (!file) updSched(i, '_replaceDoc', false);
                                      }}
                                    />
                                    <Button variant="outlined" size="small" component="label"
                                      htmlFor={`doc-upload-r${i}`}
                                      startIcon={<Add sx={{ fontSize: 14 }} />}
                                      sx={{
                                        textTransform: 'none', fontSize: '0.75rem', borderRadius: '8px', fontWeight: 600,
                                        color: '#4B9E9A', borderColor: '#B8DDD9', bgcolor: '#FFFFFF',
                                        '&:hover': { bgcolor: '#E8F4F3', borderColor: '#4B9E9A' },
                                      }}>
                                      {cfg._docFile ? cfg._docFile.name : 'Upload question document'}
                                    </Button>
                                    {cfg._docFile && (
                                      <IconButton size="small" onClick={() => updSched(i, '_docFile', null)}
                                        sx={{ color: '#A8ADA8', '&:hover': { color: '#C0392B' } }}>
                                        <Close sx={{ fontSize: 16 }} />
                                      </IconButton>
                                    )}
                                  </Stack>
                                )}

                                <Stack direction="row" spacing={1.5} sx={{ mt: 1.25 }} flexWrap="wrap" useFlexGap>
                                  <TextField
                                    label="Questions per candidate" type="number" size="small"
                                    value={cfg.questions_per_candidate || ''}
                                    inputProps={{ min: 1, max: 50 }}
                                    onChange={e => updSched(i, 'questions_per_candidate', e.target.value)}
                                    sx={{ ...fSx, width: 200 }}
                                    helperText="How many questions each candidate sees"
                                  />
                                  <TextField
                                    label="Duration (mins)" type="number" size="small"
                                    value={cfg.duration_mins || ''}
                                    inputProps={{ min: 10, max: 180, step: 5 }}
                                    onChange={e => updSched(i, 'duration_mins', e.target.value)}
                                    sx={{ ...fSx, width: 160 }}
                                    helperText="Time allowed to complete"
                                  />
                                </Stack>
                              </Box>
                            )}
                          </Stack>
                        )}

                        {/* Offline: fixed date + start/end time + venue */}
                        {isOff && (
                          <Stack spacing={2}>
                            <Box>
                              {/* Section header */}
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                                <CalendarMonth sx={{ fontSize: 15, color: '#C08A5B' }} />
                                <Typography sx={{
                                  fontSize: '11px', fontWeight: 700, color: '#6F7470',
                                  letterSpacing: '0.09em', textTransform: 'uppercase',
                                }}>
                                  Interview details
                                </Typography>
                              </Box>

                              {/* Date + Start + End */}
                              <Box sx={{
                                display: 'grid',
                                gridTemplateColumns: { xs: '1fr', sm: '1.5fr 1fr 1fr' },
                                gap: 1.5,
                              }}>
                                <DateTimeField
                                  label="Interview date"
                                  mode="date"
                                  dateValue={cfg.fixed_date || ''}
                                  onDateChange={(d) => updSched(i, 'fixed_date', d)}
                                  placeholder="Pick a date"
                                />
                                <DateTimeField
                                  label="Start time"
                                  mode="time"
                                  timeValue={cfg.fixed_time || '09:00'}
                                  onTimeChange={(t) => updSched(i, 'fixed_time', t)}
                                  icon={AccessTime}
                                  placeholder="Start"
                                />
                                <DateTimeField
                                  label="End time"
                                  mode="time"
                                  timeValue={cfg.fixed_end_time || '17:00'}
                                  onTimeChange={(t) => updSched(i, 'fixed_end_time', t)}
                                  icon={AccessTime}
                                  placeholder="End"
                                />
                              </Box>

                              {/* Venue with location icon */}
                              <TextField
                                size="small" fullWidth
                                label="Venue / location"
                                placeholder="e.g. IEvalx HQ — Room 204, Hyderabad"
                                value={cfg.venue || ''}
                                onChange={e => updSched(i, 'venue', e.target.value)}
                                sx={{ mt: 1.75, ...fSx }}
                                InputProps={{
                                  startAdornment: (
                                    <LocationOn sx={{ fontSize: 18, color: '#C08A5B', mr: 1, ml: -0.25 }} />
                                  ),
                                }}
                              />
                            </Box>
                          </Stack>
                        )}

                        {/* IAEM-scheduled: live-video rounds handled by IAEM */}
                        {isIAEM && (
                          <Box sx={{
                            mt: 1, p: 2, bgcolor: '#EEF2FF', border: '1px dashed #6366F1',
                            borderRadius: '10px',
                          }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                              <CalendarMonth sx={{ fontSize: 16, color: '#6366F1' }} />
                              <Typography sx={{
                                fontSize: '11px', fontWeight: 700, color: '#4338CA',
                                letterSpacing: '0.09em', textTransform: 'uppercase',
                              }}>
                                Scheduled via IAEM
                              </Typography>
                            </Box>
                            <Typography sx={{ fontSize: '12.5px', color: '#4338CA', lineHeight: 1.6 }}>
                              Scheduling for this live interview round is handled through IAEM.
                              Once candidates qualify from the previous round, go to{' '}
                              <Box component="span"
                                onClick={() => navigate('/employer/iaem-scheduling')}
                                sx={{
                                  fontWeight: 700, cursor: 'pointer',
                                  textDecoration: 'underline',
                                  '&:hover': { color: '#312E81' },
                                }}>
                                IAEM → Interview Scheduling
                              </Box>{' '}to release the schedule.
                              Interviewers will submit their available slots, and candidates will
                              book from those.
                            </Typography>
                            <Typography sx={{ fontSize: '11.5px', color: '#6366F1', mt: 1, fontStyle: 'italic' }}>
                              No manual slot setup needed here — just save the pipeline and IAEM takes over.
                            </Typography>
                          </Box>
                        )}

                        {/* Slot-based: candidate-chosen slots (custom pickers, card rows) */}
                        {isSlot && (
                          <Box>
                            <Box sx={{
                              display: 'flex', justifyContent: 'space-between',
                              alignItems: 'flex-start', gap: 1.5, mb: 1.5, flexWrap: 'wrap',
                            }}>
                              <Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <CalendarMonth sx={{ fontSize: 15, color: '#4B9E9A' }} />
                                  <Typography sx={{
                                    fontSize: '11px', fontWeight: 700, color: '#6F7470',
                                    letterSpacing: '0.09em', textTransform: 'uppercase',
                                  }}>
                                    Available time slots
                                  </Typography>
                                </Box>
                                <Typography sx={{ fontSize: '12px', color: '#6F7470', mt: 0.5 }}>
                                  Candidates pick one slot from your list.
                                </Typography>
                              </Box>
                              <Button
                                size="small" variant="outlined"
                                startIcon={<Add sx={{ fontSize: 14 }} />}
                                onClick={() => addSlot(i)}
                                sx={{
                                  textTransform: 'none', fontSize: '0.75rem', borderRadius: '8px', fontWeight: 600,
                                  color: '#4B9E9A', borderColor: '#B8DDD9', bgcolor: '#FFFFFF',
                                  '&:hover': { bgcolor: '#E8F4F3', borderColor: '#4B9E9A' },
                                }}
                              >
                                Add slot
                              </Button>
                            </Box>

                            <Stack spacing={1}>
                              {(cfg.slots || []).map((sl, si) => (
                                <Box
                                  key={si}
                                  sx={{
                                    display: 'grid',
                                    gridTemplateColumns: { xs: '1fr auto', sm: '1fr 1fr auto' },
                                    gap: 1.25,
                                    p: 1.25,
                                    bgcolor: '#F6F8F3',
                                    border: '1px solid #E7EAE3',
                                    borderRadius: '10px',
                                    alignItems: 'center',
                                  }}
                                >
                                  <DateTimeField
                                    label="Slot date"
                                    mode="date"
                                    dateValue={sl.date || ''}
                                    onDateChange={(d) => updateSlot(i, si, 'date', d)}
                                    placeholder="Pick a date"
                                  />
                                  <DateTimeField
                                    label="Slot time"
                                    mode="time"
                                    timeValue={sl.time || '10:00'}
                                    onTimeChange={(t) => updateSlot(i, si, 'time', t)}
                                    icon={AccessTime}
                                    placeholder="Time"
                                  />
                                  <IconButton
                                    size="small"
                                    onClick={() => removeSlot(i, si)}
                                    sx={{
                                      color: '#A8ADA8',
                                      alignSelf: 'center',
                                      '&:hover': { color: '#C0392B', bgcolor: '#F9ECEB' },
                                    }}
                                  >
                                    <Close sx={{ fontSize: 16 }} />
                                  </IconButton>
                                </Box>
                              ))}
                              {(!cfg.slots || cfg.slots.length === 0) && (
                                <Alert severity="info" sx={{
                                  py: 0.75, fontSize: '0.75rem', borderRadius: '8px',
                                  bgcolor: '#E8F4F3', color: '#4B9E9A',
                                  border: '1px solid #B8DDD9',
                                  '& .MuiAlert-icon': { color: '#4B9E9A' },
                                }}>
                                  Add at least one time slot so candidates can pick their preferred interview time.
                                </Alert>
                              )}
                            </Stack>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </Stack>
            </Box>
          )}

          {/* ─────────── STEP 3: Review & launch ─────────── */}
          {step === 3 && (
            <Box>
              {/* Summary tiles */}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' }, gap: 1.25, mb: 3 }}>
                {[
                  { label: 'Job',        value: job.title },
                  { label: 'Mode',       value: WIZARD_MODES.find(m => m.id === mode)?.label || mode },
                  { label: 'Rounds',     value: `${rounds.length} round${rounds.length !== 1 ? 's' : ''}` },
                  { label: 'Candidates', value: `${(candidates || []).length} selected` },
                ].map(item => (
                  <Box key={item.label} sx={{ bgcolor: '#F6F8F3', borderRadius: '10px', p: 1.5, border: '1px solid #E7EAE3' }}>
                    <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, color: '#6F7470', textTransform: 'uppercase', letterSpacing: '0.09em', mb: 0.5 }}>
                      {item.label}
                    </Typography>
                    <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: '#022124', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.value}
                    </Typography>
                  </Box>
                ))}
              </Box>

              <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: '#6F7470', mb: 1.25, textTransform: 'uppercase', letterSpacing: '0.09em' }}>
                Round timeline
              </Typography>
              <Stack spacing={0.75} sx={{ mb: 3 }}>
                {rounds.map((r, i) => {
                  const cfg = getSched(i);
                  const { color, bg } = wRoundColor(r.mode);
                  const timing = r.mode === 'iaem'
                    ? 'Scheduled via IAEM — interviewers provide slots after release'
                    : r.mode === 'online'
                    ? (cfg.window_start_date ? `${cfg.window_start_date} → ${cfg.window_end_date || '?'}` : '⚠ Window not set')
                    : r.mode === 'slot'
                    ? (cfg.slots?.length ? `${cfg.slots.length} slot${cfg.slots.length > 1 ? 's' : ''} created` : '⚠ No slots added')
                    : (cfg.fixed_date ? `${cfg.fixed_date}${cfg.fixed_time ? ` at ${cfg.fixed_time}` : ''}` : '⚠ Date not set');
                  return (
                    <Box key={i} sx={{
                      display: 'flex', alignItems: 'center', gap: 1.25,
                      p: '10px 14px', bgcolor: bg, borderRadius: '10px',
                      border: `1px solid ${color}25`,
                    }}>
                      <Box sx={{
                        width: 22, height: 22, borderRadius: '50%',
                        bgcolor: color, color: '#FFFFFF',
                        fontSize: '0.68rem', fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        {i + 1}
                      </Box>
                      <Typography sx={{ flex: 1, fontSize: '0.82rem', fontWeight: 500, color: '#022124' }}>{wDisplayName(r.name)}</Typography>
                      {r.type === 'ai-powered' && r.interview_mode === 'on_campus' && (
                        <Chip
                          icon={<School sx={{ fontSize: 12, color: '#C08A5B !important' }} />}
                          label="Campus"
                          size="small"
                          sx={{
                            fontSize: '0.58rem', height: 18, fontWeight: 600, flexShrink: 0,
                            bgcolor: '#F7EFE6', color: '#C08A5B', border: '1px solid #E8D3B8',
                          }}
                        />
                      )}
                      <Typography sx={{ fontSize: '0.72rem', color, fontWeight: 600 }}>{timing}</Typography>
                    </Box>
                  );
                })}
              </Stack>

              <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: '#6F7470', mb: 1.25, textTransform: 'uppercase', letterSpacing: '0.09em' }}>
                Candidates
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 3 }}>
                {(candidates || []).map((c, i) => {
                  const n = wCandName(c);
                  const photoUrl = jobseekerService.photoUrlFor(c.candidate_id || c.applicant_id || c.portal_id);
                  return (
                    <Box key={i} sx={{
                      display: 'flex', alignItems: 'center', gap: 0.75,
                      bgcolor: '#F6F8F3', border: '1px solid #E7EAE3', borderRadius: '999px',
                      pl: 0.5, pr: 1.25, py: 0.4,
                    }}>
                      <Avatar src={photoUrl} sx={{
                        width: 22, height: 22, fontSize: '0.62rem', fontWeight: 700,
                        bgcolor: '#7F9E7E', color: '#FFFFFF',
                      }}>{n[0]?.toUpperCase()}</Avatar>
                      <Typography sx={{ fontSize: '0.76rem', color: '#022124', fontWeight: 500 }}>{n}</Typography>
                    </Box>
                  );
                })}
              </Box>

              <Alert severity="info" sx={{
                py: 1, fontSize: '0.78rem', borderRadius: '10px',
                bgcolor: '#EDF3EC', color: '#022124',
                border: '1px solid #C7D9C5',
                '& .MuiAlert-icon': { color: '#6C8B6B' },
                '& .MuiAlert-message': { lineHeight: 1.6 },
              }}>
                All <strong>{(candidates || []).length}</strong> candidate{(candidates || []).length !== 1 ? 's' : ''} will be notified for Round 1 immediately.
                Rounds 2–{rounds.length} unlock automatically after each ranking approval.
              </Alert>
            </Box>
          )}
        </Box>

        {/* ═══════════ FOOTER ═══════════ */}
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 1,
          px: { xs: 2, sm: 5 }, py: 1.75,
          borderTop: '1px solid #E7EAE3', bgcolor: '#F6F8F3',
        }}>
          <Button
            onClick={goBack}
            disabled={saving}
            sx={{
              textTransform: 'none', color: '#6F7470', fontSize: '0.82rem',
              fontWeight: 500, borderRadius: '8px', px: 1.5,
              '&:hover': { bgcolor: 'rgba(2,33,36,0.05)', color: '#022124' },
            }}
          >
            {step === 0 ? 'Cancel' : '← Back'}
          </Button>
          <Box sx={{ flex: 1 }} />
          <Typography sx={{ fontSize: '0.7rem', color: '#6F7470', fontWeight: 500, display: { xs: 'none', sm: 'block' } }}>
            Step <Box component="span" sx={{ color: '#022124', fontWeight: 700 }}>{step + 1}</Box> of {WIZARD_STEP_LABELS.length}
          </Typography>
          <Button
            variant="contained"
            onClick={goNext}
            disabled={saving || (candidates || []).length === 0}
            startIcon={saving ? <CircularProgress size={14} sx={{ color: '#FFFFFF' }} /> : step === 3 ? <Launch sx={{ fontSize: 16 }} /> : null}
            sx={{
              textTransform: 'none', borderRadius: '10px',
              fontSize: '0.85rem', fontWeight: 600,
              px: 2.75, py: 1,
         
              ...(editingPipeline && step === 3
                ? {
                    bgcolor: EDIT_RED.main, color: '#FFFFFF',
                    boxShadow: '0 3px 10px rgba(192,57,43,0.30)',
                    '&:hover': { bgcolor: EDIT_RED.dark, boxShadow: '0 4px 14px rgba(192,57,43,0.38)' },
                    '&.Mui-disabled': { bgcolor: '#CDD4CC', color: '#FFFFFF', boxShadow: 'none' },
                  }
                : {
                    bgcolor: '#7F9E7E', color: '#FFFFFF',
                    boxShadow: '0 3px 10px rgba(127,158,126,0.28)',
                    '&:hover': { bgcolor: '#6C8B6B', boxShadow: '0 4px 14px rgba(127,158,126,0.35)' },
                    '&.Mui-disabled': { bgcolor: '#CDD4CC', color: '#FFFFFF', boxShadow: 'none' },
                  }),
            }}
          >
            {saving
              ? 'Launching…'
              : step === 3
                ? (editingPipeline ? `Update ${pipelineLabel}` : 'Launch pipeline')
                : 'Next →'}
          </Button>
        </Box>
      </Box>
    </Box>

          <Dialog open={testBuilderOpen} fullScreen sx={{ zIndex: 1400 }}>
        <AssessmentBuilder
          open={testBuilderOpen}
          job={testBuilderJob}
          companyId={companyId}
          onClose={() => setTestBuilderOpen(false)}
          onComplete={(newAssessmentId) => {
            // BUILD: 2026-07-27-wizard-assessmentid-v1
            if (newAssessmentId && builderRoundIdx !== null) {
              updSched(builderRoundIdx, 'assessment_id', Number(newAssessmentId));
            }
          }}
        />
      </Dialog>

      <Dialog open={aiBuilderOpen} fullScreen sx={{ zIndex: 1400 }}>
        <AIAssessmentBuilder
          embedded
          open={aiBuilderOpen}
          job={aiBuilderJob}
          companyId={companyId}
          onClose={() => setAiBuilderOpen(false)}
          onComplete={(newAssessmentId) => {
            // BUILD: 2026-07-27-wizard-assessmentid-v1
            if (newAssessmentId && builderRoundIdx !== null) {
              updSched(builderRoundIdx, 'assessment_id', Number(newAssessmentId));
            }
          }}
        />
      </Dialog>

      <Dialog
        open={!!missingTestWarn}
        onClose={() => setMissingTestWarn(null)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: {
          sx: {
            borderRadius: '16px',
            border: '1px solid #E7EAE3',
            boxShadow: '0 24px 60px rgba(2,33,36,0.18)',
            overflow: 'hidden',
            zIndex: 1500,
          }
        } }}
        sx={{ zIndex: 1500 }}
      >
       {missingTestWarn && (() => {
          const _first    = missingTestWarn.rounds[0] || {};
          const _multi    = missingTestWarn.rounds.length > 1;
          const _firstLbl = _first.name || 'Assessment';
          const _kind     = _first.isAI ? 'AI-Generated Test' : 'Manually Uploaded Test';
          return (
            <Box sx={{ textAlign: 'center' }}>
              <Box sx={{
                position: 'relative',
                background: 'linear-gradient(180deg, #EDF3EC 0%, #FFFFFF 100%)',
                px: 3, pt: 4, pb: 2.25,
              }}>
                {/* Decorative dot triads (top corners) */}
                <Box sx={{
                  position: 'absolute', top: 20, left: 24,
                  display: 'grid', gridTemplateColumns: 'repeat(3, 4px)', columnGap: '6px',
                }}>
                  <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: '#C7D9C5' }} />
                  <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: '#C7D9C5' }} />
                  <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: '#C7D9C5' }} />
                </Box>
                <Box sx={{
                  position: 'absolute', top: 20, right: 24,
                  display: 'grid', gridTemplateColumns: 'repeat(3, 4px)', columnGap: '6px',
                }}>
                  <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: '#C7D9C5' }} />
                  <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: '#C7D9C5' }} />
                  <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: '#C7D9C5' }} />
                </Box>

                {/* Clipboard tile + clay warning badge overlay */}
                <Box sx={{
                  position: 'relative',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  mb: 1.75,
                }}>
                  <Box sx={{
                    width: 72, height: 72, borderRadius: '18px',
                    bgcolor: '#FFFFFF', border: '1.5px solid #C7D9C5',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 8px 20px rgba(127,158,126,0.20)',
                  }}>
                    <Assignment sx={{ fontSize: 32, color: '#7F9E7E' }} />
                  </Box>
                  <Box sx={{
                    position: 'absolute', top: -4, right: -4,
                    width: 24, height: 24, borderRadius: '50%',
                    bgcolor: '#C08A5B', border: '2px solid #FFFFFF',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: "'Jost','DM Sans',sans-serif",
                    fontSize: '12px', fontWeight: 800, color: '#FFFFFF', lineHeight: 1,
                  }}>
                    !
                  </Box>
                </Box>

                {/* Title */}
                <Typography sx={{
                  fontFamily: "'Jost','DM Sans',sans-serif",
                  fontSize: '19px', fontWeight: 600, color: '#022124',
                  letterSpacing: '-0.01em', lineHeight: 1.25, mb: 0.75,
                }}>
                  Let's build your test first
                </Typography>

                {/* Description — variant-aware */}
                <Typography sx={{
                  fontSize: '13px', color: '#6F7470', lineHeight: 1.55,
                  maxWidth: 340, mx: 'auto',
                }}>
                  {_multi ? (
                    <>
                      <Box component="span" sx={{ fontWeight: 600, color: '#022124' }}>
                        {missingTestWarn.rounds.length} Assessment rounds
                      </Box>{' '}
                      need a paper. Without one, candidates see an empty
                      assessment.
                    </>
                  ) : (
                    <>
                      Your{' '}
                      <Box component="span" sx={{ fontWeight: 600, color: '#022124' }}>
                        {_kind}
                      </Box>{' '}
                      round needs a paper. Without one, candidates see an empty
                      assessment.
                    </>
                  )}
                </Typography>
              </Box>

              {/* Body — flow chips + action buttons */}
              <Box sx={{ px: 3, pt: 2, pb: 2.5 }}>
                {/* Build → Publish → Back here */}
                <Box sx={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 1, mb: 2,
                }}>
                  <Box sx={{
                    px: 1.4, py: 0.5, borderRadius: '14px',
                    bgcolor: '#EDF3EC', color: '#6C8B6B',
                    border: '1px solid #C7D9C5',
                    fontFamily: "'Jost','DM Sans',sans-serif",
                    fontSize: '11.5px', fontWeight: 600,
                  }}>
                    Build
                  </Box>
                  <Box sx={{ color: '#A8ADA8', fontSize: '13px', lineHeight: 1 }}>→</Box>
                  <Box sx={{
                    px: 1.4, py: 0.5, borderRadius: '14px',
                    bgcolor: '#F6F8F3', color: '#6F7470',
                    border: '1px solid #E7EAE3',
                    fontFamily: "'Jost','DM Sans',sans-serif",
                    fontSize: '11.5px', fontWeight: 600,
                  }}>
                    Publish
                  </Box>
                  <Box sx={{ color: '#A8ADA8', fontSize: '13px', lineHeight: 1 }}>→</Box>
                  <Box sx={{
                    px: 1.4, py: 0.5, borderRadius: '14px',
                    bgcolor: '#F6F8F3', color: '#6F7470',
                    border: '1px solid #E7EAE3',
                    fontFamily: "'Jost','DM Sans',sans-serif",
                    fontSize: '11.5px', fontWeight: 600,
                  }}>
                    Back here
                  </Box>
                </Box>

                {/* Actions */}
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    fullWidth
                    onClick={() => {
                      // Soft escape — close the dialog, stay on Step 1.
                      // The recruiter can still attach a paper from the row's
                      // Build test / Build with AI button.
                      setMissingTestWarn(null);
                      enqueueSnackbar(
                        '⚠️ No test paper attached yet. Use "Build test" or "Build with AI" on the round before publishing.',
                        { variant: 'warning', autoHideDuration: 6500 },
                      );
                    }}
                    sx={{
                      textTransform: 'none', fontSize: '13px', fontWeight: 600,
                      borderRadius: '10px', py: 1.1,
                      color: '#6F7470',
                      border: '1px solid #E7EAE3',
                      bgcolor: '#FFFFFF',
                      fontFamily: "'Jost','DM Sans',sans-serif",
                      '&:hover': { bgcolor: '#F6F8F3', color: '#022124', borderColor: '#CDD4CC' },
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    fullWidth
                    variant="contained"
                    endIcon={
                      <Box component="span" sx={{ fontSize: '15px', lineHeight: 1, mr: -0.25 }}>
                        →
                      </Box>
                    }
                    startIcon={
                      _first.isAI
                        ? <AutoAwesome sx={{ fontSize: 16 }} />
                        : <EditNote sx={{ fontSize: 16 }} />
                    }
                    onClick={() => {
                      const _idx = _first.idx;
                      setBuilderRoundIdx(_idx);
                      setMissingTestWarn(null);
                      if (_first.isAI) {
                        setAiBuilderJob({ id: job?.id, title: job?.title });
                        setAiBuilderOpen(true);
                      } else {
                        setTestBuilderJob({ id: job?.id, title: job?.title });
                        setTestBuilderOpen(true);
                      }
                    }}
                    sx={{
                      textTransform: 'none', fontSize: '13px', fontWeight: 700,
                      borderRadius: '10px', py: 1.1,
                      bgcolor: '#7F9E7E', color: '#FFFFFF',
                      boxShadow: '0 3px 10px rgba(127,158,126,0.28)',
                      fontFamily: "'Jost','DM Sans',sans-serif",
                      '&:hover': {
                        bgcolor: '#6C8B6B',
                        boxShadow: '0 4px 14px rgba(127,158,126,0.35)',
                      },
                    }}
                  >
                    Open test builder
                  </Button>
                </Box>
              </Box>
            </Box>
          );
        })()}
      </Dialog>

      <Dialog
        open={!!launchSuccess}
        onClose={() => { /* backdrop click is ignored — user must click a button */ }}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: {
          sx: {
            borderRadius: '16px',
            border: '1px solid #E7EAE3',
            boxShadow: '0 24px 60px rgba(2,33,36,0.18)',
            overflow: 'hidden',
            zIndex: 1500,
          }
        } }}
        sx={{ zIndex: 1500 }}
      >
        {launchSuccess && (
          <Box>
            {/* Sage top band with checkmark */}
            <Box sx={{
              bgcolor: '#EDF3EC',
              px: 3, pt: 3.5, pb: 2.5,
              textAlign: 'center',
              borderBottom: '1px solid #C7D9C5',
            }}>
              {/* Circle checkmark */}
              <Box sx={{
                width: 60, height: 60, borderRadius: '50%',
                bgcolor: '#7F9E7E', color: '#FFFFFF',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                mb: 1.75,
                boxShadow: '0 6px 20px rgba(127,158,126,0.35)',
              }}>
                <CheckCircle sx={{ fontSize: 34 }} />
              </Box>

              <Typography sx={{
                fontFamily: "'Jost','DM Sans',sans-serif",
                fontSize: '20px', fontWeight: 600, color: '#022124',
                letterSpacing: '-0.01em', lineHeight: 1.2, mb: 0.75,
              }}>
                Pipeline launched successfully
              </Typography>
              <Typography sx={{ fontSize: '13px', color: '#6C8B6B', lineHeight: 1.5 }}>
                {launchSuccess.jobTitle
                  ? <>Interviews are set up for <Box component="span" sx={{ color: '#022124', fontWeight: 600 }}>{launchSuccess.jobTitle}</Box>.</>
                  : 'Interviews are set up.'}
              </Typography>
            </Box>

            {/* Summary stats */}
            <Box sx={{ p: 3 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.25, mb: 2.5 }}>
                <Box sx={{
                  bgcolor: '#F6F8F3', border: '1px solid #E7EAE3',
                  borderRadius: '10px', p: 1.5,
                }}>
                  <Typography sx={{
                    fontSize: '10px', fontWeight: 700, color: '#6F7470',
                    letterSpacing: '0.09em', textTransform: 'uppercase', mb: 0.5,
                  }}>
                    Candidates
                  </Typography>
                  <Typography sx={{
                    fontFamily: "'Jost','DM Sans',sans-serif",
                    fontSize: '20px', fontWeight: 700, color: '#022124', lineHeight: 1,
                  }}>
                    {launchSuccess.candidateCount}
                  </Typography>
                </Box>
                <Box sx={{
                  bgcolor: '#F6F8F3', border: '1px solid #E7EAE3',
                  borderRadius: '10px', p: 1.5,
                }}>
                  <Typography sx={{
                    fontSize: '10px', fontWeight: 700, color: '#6F7470',
                    letterSpacing: '0.09em', textTransform: 'uppercase', mb: 0.5,
                  }}>
                    Rounds
                  </Typography>
                  <Typography sx={{
                    fontFamily: "'Jost','DM Sans',sans-serif",
                    fontSize: '20px', fontWeight: 700, color: '#022124', lineHeight: 1,
                  }}>
                    {launchSuccess.roundCount}
                  </Typography>
                </Box>
              </Box>

              {/* Detail lines */}
              <Stack spacing={0.75} sx={{ mb: 2.5 }}>
                {launchSuccess.createdCount > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#7F9E7E', flexShrink: 0 }} />
                    <Typography sx={{ fontSize: '12.5px', color: '#022124' }}>
                      <Box component="span" sx={{ fontWeight: 700 }}>{launchSuccess.createdCount}</Box> candidate{launchSuccess.createdCount !== 1 ? 's' : ''} newly scheduled
                    </Typography>
                  </Box>
                )}
                {launchSuccess.patchCount > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#7F9E7E', flexShrink: 0 }} />
                    <Typography sx={{ fontSize: '12.5px', color: '#022124' }}>
                      <Box component="span" sx={{ fontWeight: 700 }}>{launchSuccess.patchCount}</Box> schedule{launchSuccess.patchCount !== 1 ? 's' : ''} updated
                    </Typography>
                  </Box>
                )}
                {launchSuccess.notifyCount > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#7F9E7E', flexShrink: 0 }} />
                    <Typography sx={{ fontSize: '12.5px', color: '#022124' }}>
                      <Box component="span" sx={{ fontWeight: 700 }}>{launchSuccess.notifyCount}</Box> candidate{launchSuccess.notifyCount !== 1 ? 's' : ''} notified for Round 1
                    </Typography>
                  </Box>
                )}
                {launchSuccess.inviteCount > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#4B9E9A', flexShrink: 0 }} />
                    <Typography sx={{ fontSize: '12.5px', color: '#022124' }}>
                      <Box component="span" sx={{ fontWeight: 700 }}>{launchSuccess.inviteCount}</Box> slot booking invite{launchSuccess.inviteCount !== 1 ? 's' : ''} sent
                    </Typography>
                  </Box>
                )}
                {launchSuccess.createdCount === 0 && launchSuccess.patchCount === 0 && launchSuccess.notifyCount === 0 && launchSuccess.inviteCount === 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#6F7470', flexShrink: 0 }} />
                    <Typography sx={{ fontSize: '12.5px', color: '#022124' }}>
                      Pipeline is up to date — no changes needed.
                    </Typography>
                  </Box>
                )}
              </Stack>

              {/* Action buttons */}
              <Stack direction="row" spacing={1.25}>
                <Button
                  fullWidth
                  onClick={async () => {
                    // "Stay here" — close the wizard, remain on Candidates
                    setLaunchSuccess(null);
                    try { await onDone(); } catch (e) { /* refresh best-effort */ }
                    onClose();
                  }}
                  sx={{
                    textTransform: 'none',
                    fontSize: '13px', fontWeight: 600,
                    borderRadius: '10px',
                    py: 1.25,
                    color: '#6F7470',
                    border: '1px solid #E7EAE3',
                    bgcolor: '#FFFFFF',
                    '&:hover': { bgcolor: '#F6F8F3', color: '#022124', borderColor: '#CDD4CC' },
                  }}
                >
                  Stay here
                </Button>
                <Button
                  fullWidth
                  onClick={async () => {
                    // "Go to dashboard" — refresh parent then navigate
                    setLaunchSuccess(null);
                    try { await onDone(); } catch (e) { /* refresh best-effort */ }
                    navigate('/employer/overview');
                  }}
                  variant="contained"
                  startIcon={<Launch sx={{ fontSize: 16 }} />}
                  sx={{
                    textTransform: 'none',
                    fontSize: '13px', fontWeight: 600,
                    borderRadius: '10px',
                    py: 1.25,
                    bgcolor: '#7F9E7E', color: '#FFFFFF',
                    boxShadow: '0 3px 10px rgba(127,158,126,0.28)',
                    '&:hover': {
                      bgcolor: '#6C8B6B',
                      boxShadow: '0 4px 14px rgba(127,158,126,0.35)',
                    },
                  }}
                >
                  Go to dashboard
                </Button>
              </Stack>
            </Box>
          </Box>
        )}
      </Dialog>
    </>
  );
}

export default InterviewWizard;