import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Box, Typography, Button, Stack, CircularProgress,
  Alert, IconButton, Chip, Checkbox, LinearProgress, Tooltip,
  Card, Divider, Pagination, Select, MenuItem, useMediaQuery, useTheme, Grow,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  ToggleButton, ToggleButtonGroup, Menu, ListItemIcon, ListItemText,
} from '@mui/material';
import {
  HourglassEmpty, VisibilityOutlined, CheckCircle, ArrowForward, Cancel,
  ViewList, ViewModule, MoreVert, Person,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import rankedResultsService from '../../../services/api/employer/rankedResultsService';
import applicantService from '../../../services/api/employer/ApplicantService';
import jobseekerService from '../../../services/api/jobseeker/jobseekerService';
import { interviewAPI } from '../../../services/api/employer/candidateService';

const FONT = "'Jost','DM Sans',sans-serif";
const B = {
  pine:'#022124', pineHover:'#0A3F42',
  sage:'#7F9E7E', sageText:'#5E815D', sageSoft:'#EDF3EC',
  border:'#E7EAE3', borderS:'#D8DDD4',
  muted:'#55584F', faint:'#7A7E76', ink:'#101210', body:'#2F332E',
  bg:'#F6F8F3', surface:'#FFFFFF',
  done:'#3E6E3E', doneSoft:'#EAF2E9',
  amber:'#A35A2D', amberSoft:'#F6ECDF',
  danger:'#A63D2F', dangerSoft:'#FAEAE8',
};
const scoreColor = s => s == null ? B.faint : s >= 7 ? B.done : s >= 5 ? B.amber : B.danger;

const PAGE_SIZES = [5, 10, 25, 50, 'all'];

const ROUND_TYPE_CFG = {
  document:     { icon: '📄', color: '#3C5A78', label: 'Document' },
  'ai-powered': { icon: '🤖', color: '#5E815D', label: 'AI-Powered' },
  aptitude:     { icon: '📝', color: '#A35A2D', label: 'Aptitude' },
  'live-video': { icon: '🎥', color: '#3E6E3E', label: 'Live Video' },
};
const DEFAULT_CFG = { icon: '📋', color: '#7A7E76', label: 'Round' };

/* ── ScoreGauge ───────────────────────────────────────────────────── */
const ScoreGauge = ({ score, size = 40, sw = 3.5 }) => {
  const val = score ?? 0;
  const col = scoreColor(score);
  const r = (size - sw) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.min(val / 10, 1));
  return (
    <Box sx={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={B.border} strokeWidth={sw} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth={sw}
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      </svg>
      <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <Typography sx={{ fontSize: size > 36 ? '0.82rem' : '0.7rem', fontWeight: 900, color: col, lineHeight: 1, fontFamily: FONT }}>{val}</Typography>
        <Typography sx={{ fontSize: '0.42rem', fontWeight: 700, color: B.faint, lineHeight: 1, fontFamily: FONT }}>/10</Typography>
      </Box>
    </Box>
  );
};

/* ── CandidateAvatar ──────────────────────────────────────────────── */
const CandidateAvatar = ({ r, size = 28 }) => {
  const name = r.candidate_name || r.candidate_email || '';
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
  const photoUrl = r.candidate_id ? jobseekerService.photoUrlFor(r.candidate_id) : '';
  return (
    <Box sx={{ position: 'relative', width: size, height: size, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
      bgcolor: B.pine, color: B.sage, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size > 24 ? '0.6rem' : '0.5rem', fontFamily: FONT }}>
      {initials}
      {photoUrl && <Box component="img" src={photoUrl} alt={name}
        onError={e => { e.currentTarget.style.display = 'none'; }}
        sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', bgcolor: '#fff', display: 'block' }} />}
    </Box>
  );
};


/* ── CandidateProfileDialog ───────────────────────────────────────── */
function CandidateProfileDialog({ row, open, onClose, process, pipelineRounds, round, isOverallView, dataRound, disabled, onApprove, onReject, onViewResume, onViewReport, ROUND_TYPE_CFG, DEFAULT_CFG }) {
  const [assignmentInfo, setAssignmentInfo] = useState(null);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  useEffect(() => {
    let cancelled = false;
    if (!open || !row?.assignment_id) { setAssignmentInfo(null); return; }
    setAssignmentInfo(null);
    setAssignmentLoading(true);
    rankedResultsService.getAssignmentInfo(row.assignment_id)
      .then(info => { if (!cancelled) setAssignmentInfo(info); })
      .catch(() => { if (!cancelled) setAssignmentInfo(null); })
      .finally(() => { if (!cancelled) setAssignmentLoading(false); });
    return () => { cancelled = true; };
  }, [open, row?.assignment_id]);

  if (!row) return null;
  const name = row.candidate_name || row.candidate_email || `Candidate ${row.candidate_id}`;
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
  const photoUrl = row.candidate_id ? jobseekerService.photoUrlFor(row.candidate_id) : '';
  const sc = scoreColor(row.cgps_score);
  const isHired = row.status === 'approved' && isOverallView;
  const isRejected = row.status === 'rejected';
  const isApproved = row.status === 'approved';
  const canAct = !disabled && !isRejected;
  const isFinalDialogRound = isOverallView || round >= pipelineRounds.length;
  const approveLabel = isFinalDialogRound ? '✓ Approve → Pending Candidates' : `→ Approve to Round ${round + 1}`;

  const headerGrad = isHired ? `linear-gradient(135deg, ${B.done} 0%, #2B5B2B 100%)`
    : isRejected ? `linear-gradient(135deg, ${B.danger} 0%, #6B2820 100%)`
    : `linear-gradient(135deg, ${B.pine} 0%, #0A3F42 100%)`;

  const statusBadge = isHired ? { label: '✅ Hired', bg: B.doneSoft, color: B.done }
    : isRejected ? { label: '❌ Rejected', bg: B.dangerSoft, color: B.danger }
    : isApproved ? { label: '✅ Approved', bg: B.doneSoft, color: B.done }
    : { label: '⏳ Pending Review', bg: B.amberSoft, color: B.amber };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      slotProps={{ paper: { sx: { borderRadius: '18px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(2,33,36,0.18)' } } }}>
      {/* Header */}
      <Box sx={{ background: headerGrad, p: '20px 24px', display: 'flex', alignItems: 'center', gap: 1.5, position: 'relative' }}>
        <IconButton onClick={onClose} size="small" sx={{ position: 'absolute', top: 12, right: 12,
          color: 'rgba(255,255,255,0.6)', bgcolor: 'rgba(255,255,255,0.1)', borderRadius: '8px',
          '&:hover': { bgcolor: 'rgba(255,255,255,0.2)', color: '#fff' } }}>
          <Box sx={{ fontSize: 16, fontWeight: 700, fontFamily: FONT }}>✕</Box>
        </IconButton>
        <Box sx={{ width: 52, height: 52, borderRadius: '50%', bgcolor: B.pine, color: B.sage, border: '2.5px solid rgba(255,255,255,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1rem', fontFamily: FONT,
          flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
          {initials}
          {photoUrl && <Box component="img" src={photoUrl} alt={name}
            onError={e => { e.currentTarget.style.display = 'none'; }}
            sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#fff', fontFamily: FONT }}>{name}</Typography>
          <Typography sx={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.65)', fontFamily: FONT }}>
            {row.candidate_email || ''} · {process?.job_title || ''}
          </Typography>
          <Stack direction="row" spacing={0.5} sx={{ mt: 0.75 }}>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.3, px: 0.8, py: 0.3, borderRadius: '6px',
              bgcolor: statusBadge.bg, color: statusBadge.color, fontSize: '0.58rem', fontWeight: 800, textTransform: 'uppercase' }}>
              {statusBadge.label}
            </Box>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', px: 0.8, py: 0.3, borderRadius: '6px',
              bgcolor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.85)', fontSize: '0.58rem', fontWeight: 700 }}>
              CPS: {row.cgps_score ?? 0}
            </Box>
          </Stack>
        </Box>
      </Box>

      <DialogContent sx={{ p: '20px 24px' }}>
        {/* ── TWO SEPARATE DOCUMENT CARDS: Resume + Report ─────────── */}
        <Stack spacing={1.25} sx={{ mb: 2 }}>
          {/* Resume */}
          <Box onClick={() => onViewResume?.(row)} role="button" tabIndex={0}
            sx={{ display: 'flex', alignItems: 'center', gap: 1, p: '10px 14px', borderRadius: '12px',
              border: `1.5px solid ${B.border}`, bgcolor: B.bg, cursor: 'pointer',
              transition: 'all 0.15s ease',
              '&:hover': { borderColor: B.sage, bgcolor: B.sageSoft, transform: 'translateX(2px)' } }}>
            <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: B.sageSoft,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Typography sx={{ fontSize: '1rem' }}>📄</Typography>
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: B.ink, fontFamily: FONT }}>
                View Resume
              </Typography>
              <Typography sx={{ fontSize: '0.68rem', color: B.faint, fontFamily: FONT }}>
                Candidate's uploaded CV / resume file
              </Typography>
            </Box>
            <Typography sx={{ fontSize: '1rem', color: B.faint }}>↗</Typography>
          </Box>

          {/* Report */}
          <Box onClick={() => onViewReport?.(row)} role="button" tabIndex={0}
            sx={{ display: 'flex', alignItems: 'center', gap: 1, p: '10px 14px', borderRadius: '12px',
              border: `1.5px solid ${B.border}`, bgcolor: B.bg, cursor: 'pointer',
              transition: 'all 0.15s ease',
              '&:hover': { borderColor: B.sage, bgcolor: B.sageSoft, transform: 'translateX(2px)' } }}>
            <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: B.sageSoft,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Typography sx={{ fontSize: '1rem' }}>📊</Typography>
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: B.ink, fontFamily: FONT }}>
                View Report
              </Typography>
              <Typography sx={{ fontSize: '0.68rem', color: B.faint, fontFamily: FONT }}>
                Assessment scoring & round-by-round breakdown
              </Typography>
            </Box>
            <Typography sx={{ fontSize: '1rem', color: B.faint }}>↗</Typography>
          </Box>
        </Stack>

        {/* Info rows — reads from actual backend field names, with the
            Applied timestamp injected by the panel (from job applications
            list) and the Assigned timestamp lazy-fetched from the
            manual-assignment record. Completed comes straight off CRS. */}
        {(() => {
          const fmt = (d) => {
            if (!d) return '—';
            const dt = new Date(d);
            if (isNaN(dt.getTime())) return '—';
            return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
          };
          // Applied — try enriched value first, then any legacy variant.
          const appliedRaw =
            row.applied_at
            || row.application_date
            || row.applied_date
            || row.created_at;
          const assignedRaw =
            assignmentInfo?.created_at
            || assignmentInfo?.assigned_at
            || assignmentInfo?.scheduled_start_at
            || row.assigned_at
            || row.assigned_date
            || row.assignment_date;
          
          const completedRaw =
            row.decided_at
            || row.completed_date
            || row.completed_at
            || assignmentInfo?.completed_at;
          const completedCount = row.rounds_completed || 0;
          const totalRounds    = row.total_rounds || process?.rounds_count || pipelineRounds.length || 1;
          
          const assignedDisplay = assignedRaw
            ? fmt(assignedRaw)
            : assignmentLoading
            ? '…'
            : '—';
          return [
            { label: 'Applied',          value: fmt(appliedRaw) },
            { label: 'Assigned',         value: assignedDisplay },
            { label: 'Completed',        value: fmt(completedRaw) },
            { label: 'Overall CPS',      value: `${row.cgps_score ?? 0} / 10`, color: sc },
            { label: 'Rounds Completed', value: `${completedCount} / ${totalRounds}`,
              color: completedCount >= totalRounds ? B.done : B.amber },
          ];
        })().map(({ label, value, color }) => (
          <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            py: 1, borderBottom: `0.5px solid ${B.bg}` }}>
            <Typography sx={{ fontSize: '0.78rem', color: B.faint, fontWeight: 600, fontFamily: FONT }}>{label}</Typography>
            <Typography sx={{ fontSize: '0.78rem', color: color || B.ink, fontWeight: 700, fontFamily: FONT }}>{value}</Typography>
          </Box>
        ))}

        {/* Round performance */}
        <Typography sx={{ fontSize: '0.62rem', fontWeight: 800, color: B.faint, textTransform: 'uppercase',
          letterSpacing: '0.06em', mt: 2, mb: 1, fontFamily: FONT }}>Round performance</Typography>
        <Stack spacing={0.75}>
          {pipelineRounds.map((pr, i) => {
            const cfg = ROUND_TYPE_CFG[pr.round_type] || DEFAULT_CFG;
            const roundNum = pr.order;
            const completed = (row.rounds_completed || 0) >= roundNum;
            const isCurrentRound = roundNum === (row.rounds_completed || 0) + 1;
            const pastRejection = isRejected && roundNum > (row.rounds_completed || 0);
            const rScore = row[`round_${roundNum}_score`] ?? (completed ? row.cgps_score : null);
            const rColor = pastRejection ? B.faint : completed ? scoreColor(rScore) : B.faint;
            const accent = pastRejection ? B.border : isRejected && roundNum === (row.rounds_completed || 0) ? B.danger : completed ? B.done : isCurrentRound ? B.amber : B.border;
            return (
              <Box key={pr.id} sx={{
                display: 'flex', alignItems: 'center', gap: 1.2, p: '8px 12px', borderRadius: '10px',
                border: `0.5px solid ${B.border}`, borderLeft: `3px solid ${accent}`, bgcolor: B.surface,
                opacity: pastRejection ? 0.45 : 1, transition: 'opacity 0.2s ease',
              }}>
                <Box sx={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                  bgcolor: pastRejection ? B.bg : completed ? B.doneSoft : isCurrentRound ? B.amberSoft : B.bg,
                  color: pastRejection ? B.faint : completed ? B.done : isCurrentRound ? B.amber : B.faint,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, fontFamily: FONT }}>
                  {roundNum}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: B.ink, fontFamily: FONT }}>{cfg.icon} {pr.name}</Typography>
                  <Typography sx={{ fontSize: '0.62rem', color: B.faint, fontFamily: FONT }}>
                    {pastRejection ? 'Not reached'
                      : isRejected && roundNum === (row.rounds_completed || 0) ? 'Completed · Rejected ✕'
                      : completed ? 'Completed · Advanced'
                      : isCurrentRound ? '⏳ Yet to be attended'
                      : 'Locked — complete previous round'}
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: '0.92rem', fontWeight: 800, color: rColor, fontFamily: FONT, flexShrink: 0 }}>
                  {completed && rScore != null ? rScore : '—'}
                  {completed && rScore != null && <Box component="span" sx={{ fontSize: '0.55rem', color: B.faint, fontWeight: 600 }}>/10</Box>}
                </Typography>
              </Box>
            );
          })}
        </Stack>
      </DialogContent>

      {/* Action buttons */}
      {canAct && (
        <Box sx={{ px: 3, pb: 2.5, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          {!isApproved && !isRejected && (
            <Button variant="contained" disableElevation
              onClick={() => { onClose(); onApprove(row); }}
              sx={{ bgcolor: B.done, color: '#fff', textTransform: 'none', fontWeight: 700, borderRadius: '10px',
                px: 2.5, py: 0.9, fontSize: '0.82rem', fontFamily: FONT, whiteSpace: 'nowrap',
                boxShadow: '0 1px 0 rgba(43,91,43,0.25) inset',
                '&:hover': { bgcolor: '#2B5B2B', boxShadow: '0 4px 14px rgba(62,110,62,0.3), 0 1px 0 rgba(0,0,0,0.15) inset' } }}>
              {approveLabel}
            </Button>
          )}
          {!isRejected && (
            <Button variant="outlined"
              onClick={() => { onClose(); onReject(row); }}
              sx={{ color: B.danger, borderColor: 'rgba(166,61,47,0.35)', borderWidth: '1.5px',
                textTransform: 'none', fontWeight: 700, borderRadius: '10px',
                px: 2, py: 0.9, fontSize: '0.82rem', fontFamily: FONT, whiteSpace: 'nowrap',
                '&:hover': { bgcolor: B.dangerSoft, borderColor: B.danger, borderWidth: '1.5px' } }}>
              ✕ Reject
            </Button>
          )}
        </Box>
      )}
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
export function RankingPanel({ process, view = 'rankings', disabled = false, onReschedule = null, onViewResult = null }) {
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const pipelineRounds = useMemo(() => {
    const rs = process?.rounds;
    if (Array.isArray(rs) && rs.length > 0)
      return [...rs].filter(r => r.is_active !== false).sort((a, b) => (a.order || 0) - (b.order || 0));
    const n = process?.rounds_count || 1;
    return Array.from({ length: n }, (_, i) => ({ id: `synth-${i+1}`, name: `Round ${i+1}`, order: i+1, round_type: null }));
  }, [process?.rounds, process?.rounds_count]);

  const OVERALL_ROUND = pipelineRounds.length + 1;
  const isPoolView = view === 'pending' || view === 'hired';

  const [round, setRound] = useState(() => pipelineRounds[0]?.order || 1);
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkActing, setBulkActing] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [panelView, setPanelView] = useState('list');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [confirmDlg, setConfirmDlg] = useState(null);
  const [profileDlg, setProfileDlg] = useState(null); 
  const [thresholdOpen, setThresholdOpen] = useState(false);
  const [thresholdVal, setThresholdVal] = useState('6.0');
  const [thresholdPreview, setThresholdPreview] = useState(null);
  const [thresholdSaving, setThresholdSaving] = useState(false);

  const [statusFilter, setStatusFilter] = useState('all');

  const [actionMenu, setActionMenu] = useState(null); 

  const [appliedAtByCandidate, setAppliedAtByCandidate] = useState({});

  const isOverallView = round === OVERALL_ROUND || isPoolView;
  const dataRound = isOverallView ? pipelineRounds.length : round;

  const totalRoundsFor = (r) =>
    r?.total_rounds || process?.rounds_count || pipelineRounds.length || 1;

  const isFullyCompleted = (r) =>
    (r?.rounds_completed || 0) >= totalRoundsFor(r);

  const overallAvailable =
    pipelineRounds.length > 1 && ranking.some(isFullyCompleted);

  useEffect(() => {
    if (pipelineRounds.length === 0) return;
    const valid = round === OVERALL_ROUND || pipelineRounds.some(r => r.order === round);
    if (!valid) setRound(pipelineRounds[0].order);
  }, [pipelineRounds, round, OVERALL_ROUND]);

  /* Safety: if the user was viewing Overall but it's no longer available
     (fresh pipeline, everyone's still mid-round, etc.), snap back to the
     first real round so they don't stare at an empty aggregate view. */
  useEffect(() => {
    if (isOverallView && !overallAvailable && pipelineRounds.length > 0) {
      setRound(pipelineRounds[0].order);
    }
  }, [isOverallView, overallAvailable, pipelineRounds]);

  // Fetch job applications once per process → build the applied-at map.
  // Silent failure is acceptable here: the dialog will fall back to "—".
  // NOTE: if the underlying JobPost has been deleted, this endpoint
  // returns 404 "Job post not found". That's expected — we swallow it
  // quietly and the Applied field renders as "—" for that pipeline.
  // Long-term fix is to add applied_at to the ranking backend response
  // directly so we don't depend on the JobPost still existing.
  useEffect(() => {
    let cancelled = false;
    // Different serializers use different keys for the parent job id.
    // On this codebase, the InterviewProcess.job_ref field is the REAL
    // foreign key to the JobPost (used at line 1374 of interview_results.py
    // for the same lookup we're doing here). job_id is a legacy alias
    // that may not always resolve. Try job_ref first, fall through to
    // every other conceivable variant.
    const jobId =
      process?.job_ref
      ?? process?.jobRef
      ?? process?.job_id
      ?? process?.jobId
      ?? process?.job?.id
      ?? (typeof process?.job === 'number' ? process.job : null)
      ?? (typeof process?.job === 'string' && !isNaN(Number(process.job)) ? Number(process.job) : null);
    if (!jobId) {
      // Only clear the map if it wasn't already empty — otherwise we hand
      // React a new object reference every render and downstream memos
      // (loadRanking, enriched ranking) needlessly re-fire.
      setAppliedAtByCandidate(prev => (Object.keys(prev).length === 0 ? prev : {}));
      return;
    }
    (async () => {
      try {
        const raw = await applicantService.listByJob(jobId);
        // The /jobs/{jobId}/applications endpoint returns
        //   { Applications: [...], Total_Applications: N, Job_Title: '...' }
        // with a CAPITAL-A "Applications" key.
        const list = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.Applications)
          ? raw.Applications
          : Array.isArray(raw?.applications)
          ? raw.applications
          : Array.isArray(raw?.results)
          ? raw.results
          : Array.isArray(raw?.data)
          ? raw.data
          : [];
        const map = {};
        list.forEach(a => {
          // Row shape on this endpoint uses lowercase applied_at.
          const cid = a.candidate_id ?? a.candidate?.id ?? a.jobseeker_id ?? a.user_id
                    ?? a.applicant_id ?? a.jobseekerId ?? a.candidateId;
          const at  = a.applied_at ?? a.application_date ?? a.created_at ?? a.appliedAt
                    ?? a.applicationDate ?? a.createdAt ?? a.date_applied;
          if (cid != null && at) map[String(cid)] = at;
        });
        if (cancelled) return;
        // Content-compare before setting state. If the map hasn't actually
        // changed, keep the old reference so loadRanking (which uses this)
        // doesn't get a new identity and re-fetch the ranking pointlessly.
        setAppliedAtByCandidate(prev => {
          const prevKeys = Object.keys(prev);
          const nextKeys = Object.keys(map);
          if (prevKeys.length === nextKeys.length &&
              nextKeys.every(k => prev[k] === map[k])) {
            return prev;
          }
          return map;
        });
      } catch (err) {
        // 404 = JobPost deleted; any other error = server issue. In
        // both cases the graceful degradation is the same: leave the
        // map empty and let the dialog render "—". No console spam.
        if (!cancelled) {
          setAppliedAtByCandidate(prev => (Object.keys(prev).length === 0 ? prev : {}));
        }
      }
    })();
    return () => { cancelled = true; };
  }, [process?.job_ref, process?.job_id, process?.jobId, process?.job?.id, process?.job]);

  const loadRanking = useCallback(async () => {
    if (!process?.id) return;
    setLoading(true);
    try {
      // NOTE: applied_at enrichment moved OUT of this callback. It now
      // happens at render time via the `filtered` memo below. That's
      // critical — putting appliedAtByCandidate in these deps caused the
      // ranking to re-fetch every time we set the applied-at state,
      // which visually looked like the page constantly refreshing.
      if (isOverallView) {
        // Read pipelineRounds via ref so a same-content array reference
        // change (parent re-render) doesn't invalidate this callback.
        const rounds = pipelineRoundsRef.current;
        const allRows = await Promise.all(
          rounds.map(r => rankedResultsService.getRanking(process.id, r.order).then(res => res.data?.results || res.data || []).catch(() => []))
        );
        const map = {};
        allRows.forEach(rows => rows.forEach(row => {
          const cid = row.candidate_id;
          if (!map[cid]) map[cid] = { ...row, _scores: [] };
          if (row.cgps_score != null) map[cid]._scores.push(row.cgps_score);
          map[cid] = { ...map[cid], ...row, _scores: map[cid]._scores };
        }));
        setRanking(Object.values(map)
          .map(c => ({ ...c, cgps_score: c._scores.length ? Math.round((c._scores.reduce((a, b) => a + b, 0) / c._scores.length) * 100) / 100 : 0 }))
          .sort((a, b) => b.cgps_score - a.cgps_score)
          .map((c, i) => ({ ...c, rank: i + 1 })));
      } else {
        const r = await rankedResultsService.getRanking(process.id, dataRound);
        setRanking(r.data?.results || r.data || []);
      }
    } catch { setRanking([]); } finally { setLoading(false); }
  
  }, [process?.id, dataRound, isOverallView]);

  // Keep pipelineRoundsRef fresh without triggering loadRanking.
  const pipelineRoundsRef = React.useRef(pipelineRounds);
  useEffect(() => { pipelineRoundsRef.current = pipelineRounds; }, [pipelineRounds]);

  useEffect(() => { loadRanking(); }, [loadRanking]);

  const enrichedRanking = useMemo(() => {
    return ranking.map(r => {
      if (r.applied_at) return r;
      const at = appliedAtByCandidate[String(r.candidate_id)];
      return at ? { ...r, applied_at: at } : r;
    });
  }, [ranking, appliedAtByCandidate]);

  useEffect(() => {
    if (!profileDlg?.candidate_id) return;
    const fresh = enrichedRanking.find(r => String(r.candidate_id) === String(profileDlg.candidate_id));
    if (!fresh) return;
    const sig = (r) => [
      r.rounds_completed, r.total_rounds,
      r.status,           r.pool_type,
      r.cgps_score,       r.rank,
      r.decided_at,       r.applied_at,
      r.assignment_id,    r.test_id,
      r.interview_type,   r.assessment_title, r.assessment_mode,
      r.pdf_url,          r.comment,
    ].join('|');
    if (sig(fresh) !== sig(profileDlg)) setProfileDlg(fresh);
  }, [enrichedRanking, profileDlg?.candidate_id]);

  const _dlgLoadRef = React.useRef(false);
  useEffect(() => {
    if (!profileDlg) { _dlgLoadRef.current = false; return; }
    if (_dlgLoadRef.current) return;
    _dlgLoadRef.current = true;
    loadRanking();
  }, [profileDlg?.candidate_id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setStatusFilter('all'); }, [round]);

  const filtered = useMemo(() => {
    // Pool views (Pending Candidates / Hired) use dedicated pages now.
    // Kept here as a safety net for legacy callers.
    if (view === 'pending') return enrichedRanking.filter(r => r.pool_type === 'awaiting_hire');
    if (view === 'hired')   return enrichedRanking.filter(r => r.pool_type === 'pool_hired');
   
    let base = isOverallView
      ? enrichedRanking.filter(r => r.status !== 'rejected' && isFullyCompleted(r))
      : enrichedRanking;
    if (statusFilter !== 'all') {
      base = base.filter(r => (r.status || 'pending') === statusFilter);
    }
    return base;
  }, [enrichedRanking, view, isOverallView, statusFilter, pipelineRounds.length, process?.rounds_count]);

  useEffect(() => { setPage(1); }, [round, view, pageSize, statusFilter, filtered.length]);
  const effectiveSize = pageSize === 'all' ? Math.max(filtered.length, 1) : pageSize;
  const totalPages = Math.max(1, Math.ceil(filtered.length / effectiveSize));
  useEffect(() => { if (page > totalPages) setPage(1); }, [page, totalPages]);
  const paginated = useMemo(() => filtered.slice((page - 1) * effectiveSize, page * effectiveSize), [filtered, page, effectiveSize]);
  const currentRound = pipelineRounds.find(r => r.order === round);

  // ── Live interview feedback dialog ───────────────────────────────────
  const [liveFeedbackDlg, setLiveFeedbackDlg] = useState({ open: false, loading: false, data: null });

  const handleViewReport = (row) => {
    // Live-video: show the employer's post-interview feedback instead of a PDF report
    if (row.interview_type === 'live-video') {
      setLiveFeedbackDlg({ open: true, loading: true, data: null });


 interviewAPI.getCandidateScoreDetail(process?.id, row.round_number ?? round, row.candidate_id)


        .then(res => {
          const lr = res.data?.live_result || {};
          setLiveFeedbackDlg({ open: true, loading: false, data: lr });
        })
        .catch(() => {
          setLiveFeedbackDlg({ open: true, loading: false, data: {} });
        });
      return;
    }
    if (row.pdf_url || row.test_id) {
      const weeklyBase = import.meta.env.VITE_WEEKLY_INTERVIEW_URL || '';
      const url = row.pdf_url || (weeklyBase ? `${weeklyBase}/download_results/${row.test_id}` : `/weekly_interview/download_results/${row.test_id}`);
      window.open(url, '_blank', 'noopener,noreferrer'); return;
    }
    if (row.assignment_id) {
      setPdfLoading(true);
      rankedResultsService.openReportPdf(row.assignment_id).catch(err => {
        enqueueSnackbar(err?.response?.status === 404 ? 'Report not found.' : 'Failed to open report.', { variant: 'error' });
      }).finally(() => setPdfLoading(false)); return;
    }
    if (typeof onViewResult === 'function') onViewResult(row);
    else enqueueSnackbar('Report not available for this round type yet.', { variant: 'info' });
  };

  // ── Live feedback dialog JSX (rendered at component root level) ──────
  const LiveFeedbackDialog = (
    <Dialog open={liveFeedbackDlg.open} onClose={() => setLiveFeedbackDlg(p => ({ ...p, open: false }))}
      maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '16px', overflow: 'hidden', fontFamily: FONT } }}>
      <Box sx={{ background: `linear-gradient(135deg, ${B.pine} 0%, #0A3F42 100%)`, px: 2.5, pt: 2.5, pb: 2, position: 'relative' }}>
        <IconButton size="small" onClick={() => setLiveFeedbackDlg(p => ({ ...p, open: false }))}
          sx={{ position: 'absolute', top: 10, right: 10, color: 'rgba(255,255,255,0.7)', '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.12)' } }}>
          <Cancel sx={{ fontSize: 18 }} />
        </IconButton>
        <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '1rem', lineHeight: 1.2 }}>Live Interview Feedback</Typography>
        <Typography sx={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.76rem', mt: 0.3 }}>Employer assessment after the session</Typography>
      </Box>
      <DialogContent sx={{ p: 0, maxHeight: '65vh', overflowY: 'auto' }}>
        {liveFeedbackDlg.loading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160 }}>
            <CircularProgress size={32} sx={{ color: B.pine }} />
          </Box>
        ) : !liveFeedbackDlg.data?.overall_feedback && liveFeedbackDlg.data?.overall_score == null ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 140, gap: 1.5, px: 3 }}>
            <Typography sx={{ fontSize: '0.84rem', color: B.muted, textAlign: 'center', fontFamily: FONT }}>
              No feedback was submitted for this interview yet.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ px: 3, py: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Score + Recommendation */}
            {liveFeedbackDlg.data?.overall_score != null && (
              <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{ textAlign: 'center', bgcolor: B.doneSoft, border: `1.5px solid ${B.done}40`, borderRadius: '10px', px: 2.5, py: 1 }}>
                  <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: B.done, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Score</Typography>
                  <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, color: B.done, lineHeight: 1.2 }}>
                    {(liveFeedbackDlg.data.overall_score / 10).toFixed(1)}
                    <Typography component="span" sx={{ fontSize: '0.8rem', fontWeight: 500, color: B.muted }}>/10</Typography>
                  </Typography>
                </Box>
                {liveFeedbackDlg.data?.recommendation && (
                  <Box sx={{ bgcolor: B.sageSoft, border: `1px solid ${B.sage}`, borderRadius: '10px', px: 2, py: 0.75 }}>
                    <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: B.sageText, textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.25 }}>Recommendation</Typography>
                    <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: B.pine, textTransform: 'capitalize', fontFamily: FONT }}>
                      {liveFeedbackDlg.data.recommendation.replace(/-/g, ' ')}
                    </Typography>
                  </Box>
                )}
              </Stack>
            )}
            {/* Feedback text */}
            {liveFeedbackDlg.data?.overall_feedback && (
              <Box>
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: B.muted, textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1 }}>
                  How well does this candidate fit the role?
                </Typography>
                <Box sx={{ bgcolor: B.bg, border: `1px solid ${B.border}`, borderRadius: '10px', px: 2, py: 1.5 }}>
                  <Typography sx={{ fontSize: '0.88rem', color: B.body, lineHeight: 1.65, fontFamily: FONT, whiteSpace: 'pre-wrap' }}>
                    {liveFeedbackDlg.data.overall_feedback}
                  </Typography>
                </Box>
              </Box>
            )}
            {/* Additional notes */}
            {liveFeedbackDlg.data?.additional_notes && (
              <Box>
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: B.muted, textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1 }}>Additional notes</Typography>
                <Box sx={{ bgcolor: B.bg, border: `1px solid ${B.border}`, borderRadius: '10px', px: 2, py: 1.5 }}>
                  <Typography sx={{ fontSize: '0.88rem', color: B.body, lineHeight: 1.65, fontFamily: FONT }}>
                    {liveFeedbackDlg.data.additional_notes}
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={() => setLiveFeedbackDlg(p => ({ ...p, open: false }))}
          sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.82rem', color: B.muted, borderRadius: '10px', fontFamily: FONT }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );

  // ── Resume (candidate's uploaded CV) ────────────────────────────────
  const handleViewResume = (row) => {
    if (!row?.candidate_id) {
      enqueueSnackbar('Candidate ID missing — cannot open resume.', { variant: 'warning' });
      return;
    }
    setPdfLoading(true);
    rankedResultsService.openResumePdf(row.candidate_id).catch(err => {
      const status = err?.response?.status;
      enqueueSnackbar(
        status === 404 ? 'This candidate has not uploaded a resume yet.'
        : status === 401 ? 'Session expired — please sign in again.'
        : 'Failed to open resume.',
        { variant: status === 404 ? 'info' : 'error' }
      );
    }).finally(() => setPdfLoading(false));
  };

  // Back-compat alias for the row-level quick-view icon in the table:
  // that icon has always opened the report, so preserve behaviour.
  const handleQuickView = handleViewReport;

  // These predicates + confirm-dialog openers are used by both the
  // row-level kebab menu (defined below) and the panel-level bulk /
  // dialog flows (further down). They MUST be declared before
  // actionButtons + rowActionMenu — those hold JSX expressions that
  // reference these at component evaluation time, and hitting them in
  // the TDZ crashes render.
  // ── Round-state helpers ─────────────────────────────────────────
  // A candidate row is ONE of three states in the current round:
  //   'scored'    → they completed the round AND their score is finalized.
  //                 The employer can now Approve or Reject them.
  //   'ongoing'   → they've been assigned to (or invited to) this round
  //                 but haven't produced a finalized score yet. Actions
  //                 stay hidden — decision would be premature.
  //   'not_yet'   → they haven't been assigned/invited to this round yet.
  //                 Actions hidden.
  // Signal used: `rounds_completed` on the ranking row is a count of how
  // many rounds a candidate has actually finished (backend derives it from
  // ScheduledInterview.status IN ('completed','partial')). So
  // rounds_completed >= currentRound means this round is done.
  const roundState = (r) => {
    // In Overall view, "the current round" is the LAST round in the pipeline
    // — a candidate is scored overall iff they've cleared every stage.
    const currentRound = isOverallView ? (pipelineRounds.length || 1) : round;
    const completed = r?.rounds_completed || 0;

    // If a decision was already made server-side, the round is definitionally done.
    if (r?.status === 'approved' || r?.status === 'rejected') return 'scored';

    // rounds_completed is the AUTHORITATIVE completion signal — the backend
    // increments it only after ScheduledInterview.status hits
    // ('completed', 'partial'). If the candidate has cleared the current
    // round by that count, they're scored. This check goes FIRST because it
    // beats every other heuristic.
    if (completed >= currentRound) return 'scored';

    // Per-round view: check ONLY the round-specific score field. Do NOT fall
    // back to `cgps_score` — that's the aggregate CGPS across the whole
    // pipeline and would falsely mark a Round-N candidate as "scored"
    // for Round N+1 the moment they finished Round N (the pranay-vanam
    // bug from the deploy screenshot: he never took Round 2 but the row
    // showed "Pending Review" because his Round 1 score bumped cgps_score
    // above zero).
    if (!isOverallView) {
      const roundScoreField = `round_${currentRound}_score`;
      const roundScore = r?.[roundScoreField];
      if (roundScore != null && Number(roundScore) > 0) return 'scored';
    } else {
      // Overall view: aggregate score IS meaningful, BUT only when paired
      // with a completed >= total check (already handled above). We arrive
      // here only when the candidate hasn't finished every round yet, so an
      // aggregate score alone doesn't grant 'scored' status.
    }

    if (r?.decided_at) return 'scored';

    // Assigned but not finished → ongoing. In per-round loading the
    // backend returns the round-specific assignment_id / test_id, so this
    // correctly distinguishes "invited to this round" from "invited to a
    // previous round".
    if (r?.assignment_id || r?.test_id) return 'ongoing';
    return 'not_yet';
  };
  const hasFinalizedScore = (r) => roundState(r) === 'scored';

  // Approve / Reject are only meaningful once the candidate's round is
  // scored. Before that, the employer has nothing to decide on.
  const canApprove = (r) => !disabled && hasFinalizedScore(r) && r.status !== 'approved' && r.status !== 'rejected';
  const canReject  = (r) => !disabled && hasFinalizedScore(r) && r.status !== 'rejected';
  const isFinalRound = isOverallView || round >= pipelineRounds.length;
  const handleApprove = (row) => setConfirmDlg({ type: 'approve', row });
  const handleReject = (row) => setConfirmDlg({ type: 'reject', row });

  // Contextual approve label + tooltip based on which round we're in.
  const approveLabelFor = (round) => isFinalRound
    ? '✓ Approve → Pending Candidates'
    : `→ Approve to Round ${round + 1}`;

  const actionButtons = (r, compact = false) => {
    // ONE kebab icon per row. Clicking opens a Menu with three items:
    // Approve · Reject · View report. Decided rows only get View report.
    // Everything is keyboard-navigable via the native Menu component.
    const decided = r.status === 'approved' || r.status === 'rejected';
    const size = compact ? 26 : 30;
    return (
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
        <Tooltip title="Actions" arrow>
          <IconButton
            size="small"
            onClick={e => { e.stopPropagation(); setActionMenu({ anchorEl: e.currentTarget, row: r }); }}
            sx={{
              width: size, height: size, borderRadius: '9px', p: 0,
              color: B.muted, border: `1px solid ${B.border}`, bgcolor: B.surface,
              transition: 'all 0.15s ease',
              '&:hover': {
                bgcolor: B.sageSoft, color: B.pine, borderColor: B.sage,
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 10px rgba(2,33,36,0.08)',
              },
            }}>
            <MoreVert sx={{ fontSize: compact ? 15 : 17 }} />
          </IconButton>
        </Tooltip>
      </Box>
    );
  };

  // Single Menu rendered once, anchored to whichever kebab was clicked.
  // Sits at the panel level so opening it never remounts a per-row menu.
  const menuRow    = actionMenu?.row;
  const menuDecided = menuRow && (menuRow.status === 'approved' || menuRow.status === 'rejected');
  const closeMenu  = () => setActionMenu(null);
  const runFromMenu = (fn) => () => {
    if (!menuRow) return;
    fn(menuRow);
    closeMenu();
  };

  const rowActionMenu = (
    <Menu
      anchorEl={actionMenu?.anchorEl || null}
      open={Boolean(actionMenu)}
      onClose={closeMenu}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      slotProps={{
        paper: {
          elevation: 0,
          sx: {
            mt: 0.5,
            minWidth: 220,
            borderRadius: '12px',
            border: `1px solid ${B.border}`,
            boxShadow: '0 12px 32px rgba(2,33,36,0.14)',
            overflow: 'hidden',
            fontFamily: FONT,
          },
        },
      }}
    >
      {/* Header — candidate name so the user never loses context */}
      {menuRow && (
        <Box sx={{
          px: 1.75, py: 1.25, bgcolor: B.bg, borderBottom: `1px solid ${B.border}`,
          display: 'flex', flexDirection: 'column', gap: 0.2,
        }}>
          <Typography sx={{ fontSize: '0.65rem', color: B.faint, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: FONT }}>
            Actions
          </Typography>
          <Typography noWrap sx={{ fontSize: '0.82rem', color: B.ink, fontWeight: 700, fontFamily: FONT, letterSpacing: '-0.01em' }}>
            {menuRow.candidate_name || menuRow.candidate_email || `Candidate ${menuRow.candidate_id}`}
          </Typography>
        </Box>
      )}

      {/* Approve */}
      {menuRow && !menuDecided && canApprove(menuRow) && (
        <MenuItem onClick={runFromMenu(handleApprove)}
          sx={{
            py: 1.1, px: 1.75, gap: 1, fontFamily: FONT,
            transition: 'background 0.12s ease',
            '&:hover': { bgcolor: B.doneSoft },
          }}>
          <ListItemIcon sx={{ minWidth: 0, mr: 0 }}>
            <Box sx={{
              width: 30, height: 30, borderRadius: '8px', bgcolor: B.doneSoft,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <CheckCircle sx={{ fontSize: 18, color: B.done }} />
            </Box>
          </ListItemIcon>
          <ListItemText
            primary={
              <Typography sx={{ fontSize: '0.84rem', fontWeight: 700, color: B.ink, fontFamily: FONT, whiteSpace: 'nowrap' }}>
                Approve
              </Typography>
            }
            secondary={
              <Typography sx={{ fontSize: '0.7rem', color: B.muted, fontFamily: FONT, mt: 0.1 }}>
                {isFinalRound ? '→ Pending Candidates' : `→ advances to Round ${round + 1}`}
              </Typography>
            }
          />
        </MenuItem>
      )}

      {/* Reject */}
      {menuRow && !menuDecided && canReject(menuRow) && (
        <MenuItem onClick={runFromMenu(handleReject)}
          sx={{
            py: 1.1, px: 1.75, gap: 1, fontFamily: FONT,
            transition: 'background 0.12s ease',
            '&:hover': { bgcolor: B.dangerSoft },
          }}>
          <ListItemIcon sx={{ minWidth: 0, mr: 0 }}>
            <Box sx={{
              width: 30, height: 30, borderRadius: '8px', bgcolor: B.dangerSoft,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Cancel sx={{ fontSize: 18, color: B.danger }} />
            </Box>
          </ListItemIcon>
          <ListItemText
            primary={
              <Typography sx={{ fontSize: '0.84rem', fontWeight: 700, color: B.ink, fontFamily: FONT, whiteSpace: 'nowrap' }}>
                Reject
              </Typography>
            }
            secondary={
              <Typography sx={{ fontSize: '0.7rem', color: B.muted, fontFamily: FONT, mt: 0.1 }}>
                Stays in this round as rejected
              </Typography>
            }
          />
        </MenuItem>
      )}

      {/* Divider between decisions and info-only items */}
      {menuRow && !menuDecided && (canApprove(menuRow) || canReject(menuRow)) && (
        <Divider sx={{ borderColor: B.border, my: 0.25 }} />
      )}

      {/* View profile — opens the candidate profile dialog */}
      {menuRow && (
        <MenuItem onClick={runFromMenu((r) => setProfileDlg(r))}
          sx={{
            py: 1.1, px: 1.75, gap: 1, fontFamily: FONT,
            transition: 'background 0.12s ease',
            '&:hover': { bgcolor: B.sageSoft },
          }}>
          <ListItemIcon sx={{ minWidth: 0, mr: 0 }}>
            <Box sx={{
              width: 30, height: 30, borderRadius: '8px', bgcolor: B.sageSoft,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Person sx={{ fontSize: 18, color: B.sageText }} />
            </Box>
          </ListItemIcon>
          <ListItemText
            primary={
              <Typography sx={{ fontSize: '0.84rem', fontWeight: 700, color: B.ink, fontFamily: FONT, whiteSpace: 'nowrap' }}>
                View profile
              </Typography>
            }
            secondary={
              <Typography sx={{ fontSize: '0.7rem', color: B.muted, fontFamily: FONT, mt: 0.1 }}>
                Full candidate detail & round history
              </Typography>
            }
          />
        </MenuItem>
      )}

      {LiveFeedbackDialog}

      {/* View report / View feedback depending on round type */}
      {menuRow && (
        <MenuItem onClick={runFromMenu(handleQuickView)}
          sx={{
            py: 1.1, px: 1.75, gap: 1, fontFamily: FONT,
            transition: 'background 0.12s ease',
            '&:hover': { bgcolor: B.bg },
          }}>
          <ListItemIcon sx={{ minWidth: 0, mr: 0 }}>
            <Box sx={{
              width: 30, height: 30, borderRadius: '8px', bgcolor: B.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <VisibilityOutlined sx={{ fontSize: 18, color: B.muted }} />
            </Box>
          </ListItemIcon>
          <ListItemText
            primary={
              <Typography sx={{ fontSize: '0.84rem', fontWeight: 700, color: B.ink, fontFamily: FONT, whiteSpace: 'nowrap' }}>
                {menuRow?.interview_type === 'live-video' ? 'View feedback' : 'View report'}
              </Typography>
            }
            secondary={
              <Typography sx={{ fontSize: '0.7rem', color: B.muted, fontFamily: FONT, mt: 0.1 }}>
                {menuRow?.interview_type === 'live-video' ? 'Role fit & employer notes' : 'Assessment scoring & round-by-round'}
              </Typography>
            }
          />
        </MenuItem>
      )}

      {/* Not-yet-scored helper: shown when Approve/Reject are hidden
          because the candidate hasn't completed the round yet. Explains
          WHY the decision buttons are absent so the employer isn't
          confused by a stripped-down menu. */}
      {menuRow && !menuDecided && !hasFinalizedScore(menuRow) && (
        <Box sx={{
          mx: 1, my: 0.75, px: 1.2, py: 1,
          bgcolor: B.amberSoft, border: `1px solid rgba(163,90,45,0.18)`,
          borderRadius: '10px', display: 'flex', gap: 0.85, alignItems: 'flex-start',
        }}>
          <Box sx={{
            width: 6, height: 6, borderRadius: '50%', bgcolor: B.amber, flexShrink: 0, mt: 0.6,
            animation: 'rp-ongoing-pulse 1.6s ease-in-out infinite',
          }} />
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, color: B.amber, fontFamily: FONT, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {roundState(menuRow) === 'ongoing' ? 'Round in progress' : 'Yet to be attended'}
            </Typography>
            <Typography sx={{ fontSize: '0.7rem', color: B.muted, fontFamily: FONT, mt: 0.15, lineHeight: 1.4 }}>
              {roundState(menuRow) === 'ongoing'
                ? 'Approve / Reject will unlock once the score is finalized.'
                : 'The candidate hasn\'t started this round yet. Actions unlock after they complete it.'}
            </Typography>
          </Box>
        </Box>
      )}

      {/* Decided-state helper text so the menu never renders empty */}
      {menuRow && menuDecided && (
        <Box sx={{ px: 1.75, py: 1, borderTop: `1px solid ${B.border}` }}>
          <Typography sx={{ fontSize: '0.7rem', color: B.faint, fontStyle: 'italic', fontFamily: FONT }}>
            Decision already made — {menuRow.status === 'approved' ? 'advanced' : 'rejected'}.
          </Typography>
        </Box>
      )}
    </Menu>
  );

  const executeApprove = (row) => {
    const isFinal = isOverallView || round >= pipelineRounds.length;
    if (isFinal) {
      // Final-round Approve now sends the candidate into the "awaiting
      // hire" pool — they surface on the Pending Candidates page for the
      // final Hire / Reject decision. Backend handles pool_type flip and
      // does NOT create a HiringRecord here; that happens only when the
      // employer confirms Hire from Pending Candidates.
      rankedResultsService.setCandidateStatus(process.id, dataRound, row.candidate_id, { status: 'approved', advance_to_next: false })
        .then(() => { enqueueSnackbar(`${row.candidate_name || 'Candidate'} → Pending Candidates for final decision`, { variant: 'success' }); loadRanking(); })
        .catch(() => enqueueSnackbar('Failed', { variant: 'error' }));
    } else {
      rankedResultsService.setCandidateStatus(process.id, round, row.candidate_id, { status: 'approved', advance_to_next: true })
        .then(() => { enqueueSnackbar(`Advanced to Round ${round + 1}`, { variant: 'success' }); loadRanking(); })
        .catch(() => enqueueSnackbar('Failed', { variant: 'error' }));
    }
  };

  const executeReject = (row) => {
    rankedResultsService.setCandidateStatus(process.id, isOverallView ? dataRound : round, row.candidate_id, { status: 'rejected' })
      .then(() => { enqueueSnackbar('Rejected', { variant: 'info' }); loadRanking(); })
      .catch(() => enqueueSnackbar('Failed', { variant: 'error' }));
  };

  const handleConfirm = async () => {
    if (!confirmDlg) return;
    if (confirmDlg.type === 'approve') executeApprove(confirmDlg.row);
    else if (confirmDlg.type === 'reject') executeReject(confirmDlg.row);
    else if (confirmDlg.type === 'bulk') {
      setBulkActing(true);
      const st = confirmDlg.bulkStatus;
      await Promise.all([...selectedIds].map(cid =>
        rankedResultsService.setCandidateStatus(process.id, dataRound, cid, {
          status: st, ...(st === 'approved' ? { advance_to_next: false } : {}) }).catch(() => {})
      ));
      enqueueSnackbar(`${selectedIds.size} candidate${selectedIds.size > 1 ? 's' : ''} updated`, { variant: 'success' });
      setSelectedIds(new Set()); setBulkActing(false); loadRanking();
    }
    setConfirmDlg(null);
  };

  const handleThresholdPreview = async () => {
    const t = parseFloat(thresholdVal);
    if (isNaN(t) || t < 0 || t > 10) return;
    try { const r = await rankedResultsService.applyRoundThreshold(process.id, round, { threshold: t, advance_to_next: !isOverallView, dry_run: true }); setThresholdPreview(r.data); }
    catch (e) { enqueueSnackbar(e?.response?.data?.detail || 'Preview failed', { variant: 'error' }); }
  };
  const handleThresholdApply = async () => {
    const t = parseFloat(thresholdVal);
    if (isNaN(t) || t < 0 || t > 10) return;
    setThresholdSaving(true);
    try { const r = await rankedResultsService.applyRoundThreshold(process.id, round, { threshold: t, advance_to_next: !isOverallView, dry_run: false });
      enqueueSnackbar(`Approved ${r.data.approved}, Rejected ${r.data.rejected}, Skipped ${r.data.skipped}`, { variant: 'success' });
      setThresholdOpen(false); setThresholdPreview(null); loadRanking();
    } catch (e) { enqueueSnackbar(e?.response?.data?.detail || 'Apply failed', { variant: 'error' }); }
    finally { setThresholdSaving(false); }
  };

  const statusPill = (r) => {
    // Final-round approved candidates who have entered the awaiting-hire
    // pool render with a distinct pill so employers immediately see they
    // now live on the Pending Candidates page.
    if (r.status === 'approved' && r.pool_type === 'awaiting_hire') {
      return <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.3, bgcolor: B.amberSoft, color: B.amber, px: 0.8, py: 0.3, borderRadius: '5px', fontSize: '0.58rem', fontWeight: 800, textTransform: 'uppercase' }}>⏳ Awaiting Hire</Box>;
    }
    if (r.status === 'approved' && r.pool_type === 'pool_hired') {
      return <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.3, bgcolor: B.doneSoft, color: B.done, px: 0.8, py: 0.3, borderRadius: '5px', fontSize: '0.58rem', fontWeight: 800, textTransform: 'uppercase' }}>🏆 Hired</Box>;
    }
    if (r.status === 'approved' && r.pool_type === 'pool_rejected') {
      return <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.3, bgcolor: B.dangerSoft, color: B.danger, px: 0.8, py: 0.3, borderRadius: '5px', fontSize: '0.58rem', fontWeight: 800, textTransform: 'uppercase' }}>✕ Pool Rejected</Box>;
    }
    if (r.status === 'approved' && isOverallView) return <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.3, bgcolor: B.doneSoft, color: B.done, px: 0.8, py: 0.3, borderRadius: '5px', fontSize: '0.58rem', fontWeight: 800, textTransform: 'uppercase' }}>✅ Approved</Box>;
    if (r.status === 'approved') return <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.3, bgcolor: B.doneSoft, color: B.done, px: 0.8, py: 0.3, borderRadius: '5px', fontSize: '0.58rem', fontWeight: 800, textTransform: 'uppercase' }}>✅ R{round+1}</Box>;
    if (r.status === 'rejected') return <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.3, bgcolor: B.dangerSoft, color: B.danger, px: 0.8, py: 0.3, borderRadius: '5px', fontSize: '0.58rem', fontWeight: 800, textTransform: 'uppercase' }}>❌ Rejected</Box>;
    // ── Not yet decided ──────────────────────────────────────────────
    // Show one of three pills based on round progress:
    //   scored   → amber "Pending Review" (candidate finished, waiting on employer)
    //   ongoing  → amber pulsing "Ongoing" (candidate mid-attempt)
    //   not_yet  → muted dashed "Yet to be attended" (not started at all)
    const state = roundState(r);
    if (state === 'scored') {
      return (
        <Box sx={{
          display: 'inline-flex', alignItems: 'center', gap: 0.4,
          bgcolor: B.amberSoft, color: B.amber,
          px: 0.9, py: 0.3, borderRadius: '5px',
          fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.05em',
          textTransform: 'uppercase', whiteSpace: 'nowrap', fontFamily: FONT,
        }}>⏳ Pending Review</Box>
      );
    }
    if (state === 'ongoing') {
      return (
        <Box sx={{
          display: 'inline-flex', alignItems: 'center', gap: 0.5,
          bgcolor: B.amberSoft, color: B.amber,
          px: 0.9, py: 0.3, borderRadius: '5px',
          fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.05em',
          textTransform: 'uppercase', whiteSpace: 'nowrap', fontFamily: FONT,
        }}>
          <Box component="span" sx={{
            width: 6, height: 6, borderRadius: '50%', bgcolor: B.amber, flexShrink: 0,
            animation: 'rp-ongoing-pulse 1.6s ease-in-out infinite',
            '@keyframes rp-ongoing-pulse': {
              '0%,100%': { opacity: 1, transform: 'scale(1)' },
              '50%':     { opacity: 0.55, transform: 'scale(1.4)' },
            },
          }} />
          Ongoing
        </Box>
      );
    }
    // not_yet — muted, dashed border to visually distinguish from a real status
    return (
      <Box sx={{
        display: 'inline-flex', alignItems: 'center', gap: 0.4,
        bgcolor: B.bg, color: B.muted,
        px: 0.9, py: 0.3, borderRadius: '5px',
        border: `1px dashed ${B.borderS}`,
        fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.05em',
        textTransform: 'uppercase', whiteSpace: 'nowrap', fontFamily: FONT,
      }}>Yet to be attended</Box>
    );
  };

  return (
    <Box sx={{ fontFamily: FONT, '& .MuiTypography-root': { fontFamily: FONT } }}>


      {/* ── Round selector — step circles with connecting lines ──── */}
      {!isPoolView && (
        <Box sx={{ pb: 2, px: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0, mb: 1.5 }}>
            {pipelineRounds.map((r, i) => {
              const cfg = ROUND_TYPE_CFG[r.round_type] || DEFAULT_CFG;
              const active = round === r.order;
              return (
                <React.Fragment key={r.id}>
                  {i > 0 && <Box sx={{ flex: 1, height: 2, bgcolor: B.done, mx: 0.5, minWidth: 20 }} />}
                  <Box onClick={() => setRound(r.order)} role="button" tabIndex={0}
                    sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.4, cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s ease' }}>
                    <Box sx={{
                      width: 36, height: 36, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.82rem', fontWeight: 700, fontFamily: FONT,
                      ...(active
                        ? { bgcolor: B.pine, color: '#fff', boxShadow: '0 3px 10px rgba(2,33,36,0.28)' }
                        : { bgcolor: B.bg, color: B.muted, border: `2px solid ${B.borderS}` }),
                      transition: 'all 0.15s ease',
                      '&:hover': active ? {} : { borderColor: B.sage, color: B.pine, bgcolor: B.sageSoft },
                    }}>{r.order}</Box>
                    <Typography sx={{ fontSize: '0.62rem', fontWeight: active ? 700 : 500, color: active ? B.pine : B.faint,
                      maxWidth: 80, textAlign: 'center', lineHeight: 1.2 }}>{cfg.icon} {r.name}</Typography>
                    <Tooltip title={active ? `Viewing results for ${r.name}` : `Click to view results in ${r.name}`} arrow>
                      <Box sx={{ mt: 0.5, px: 1.2, py: 0.4, borderRadius: '7px', fontSize: '0.62rem', fontWeight: 700,
                        bgcolor: active ? B.pine : B.surface, color: active ? '#fff' : B.muted,
                        border: active ? `1.5px solid ${B.pine}` : `1.5px solid ${B.borderS}`,
                        textTransform: 'none', letterSpacing: '0.02em', whiteSpace: 'nowrap',
                        transition: 'all 0.15s ease', cursor: 'pointer',
                        boxShadow: active ? '0 2px 6px rgba(2,33,36,0.2)' : 'none',
                        '&:hover': active ? {} : { bgcolor: B.sageSoft, borderColor: B.sage, color: B.pine } }}>
                        {active ? '● Viewing' : 'Show Results'}
                      </Box>
                    </Tooltip>
                  </Box>
                </React.Fragment>
              );
            })}
            {/* Overall node — only rendered when the aggregate view is
                meaningful (pipeline has >1 round AND at least one
                candidate has finished every round). Both the connector
                line and the trophy sit inside the same guard so the
                trailing dash doesn't hang off Round 1 when Overall is
                hidden. */}
            {overallAvailable && (
              <>
                <Box sx={{ flex: 1, height: 2, bgcolor: B.border, mx: 0.5, minWidth: 20 }} />
                <Box onClick={() => setRound(OVERALL_ROUND)} role="button" tabIndex={0}
                  sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.4, cursor: 'pointer', flexShrink: 0 }}>
                  <Box sx={{
                    width: 36, height: 36, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.9rem', fontFamily: FONT,
                    ...(isOverallView
                      ? { bgcolor: B.sageSoft, color: B.sageText, border: `2px solid ${B.sage}`, boxShadow: '0 3px 10px rgba(94,129,93,0.2)' }
                      : { bgcolor: B.bg, color: B.muted, border: `2px solid ${B.borderS}` }),
                    transition: 'all 0.15s ease',
                    '&:hover': isOverallView ? {} : { borderColor: B.sage, bgcolor: B.sageSoft },
                  }}>🏆</Box>
                  <Typography sx={{ fontSize: '0.62rem', fontWeight: isOverallView ? 700 : 500, color: isOverallView ? B.sageText : B.faint }}>Overall</Typography>
                  <Tooltip title={isOverallView ? 'Viewing overall results' : 'Click to view overall results'} arrow>
                    <Box sx={{ mt: 0.5, px: 1.2, py: 0.4, borderRadius: '7px', fontSize: '0.62rem', fontWeight: 700,
                      bgcolor: isOverallView ? B.sageText : B.surface, color: isOverallView ? '#fff' : B.muted,
                      border: isOverallView ? `1.5px solid ${B.sage}` : `1.5px solid ${B.borderS}`,
                      textTransform: 'none', letterSpacing: '0.02em', whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease', cursor: 'pointer',
                      boxShadow: isOverallView ? '0 2px 6px rgba(94,129,93,0.2)' : 'none',
                      '&:hover': isOverallView ? {} : { bgcolor: B.sageSoft, borderColor: B.sage, color: B.sageText } }}>
                      {isOverallView ? '● Viewing' : 'Show Results'}
                    </Box>
                  </Tooltip>
                </Box>
              </>
            )}
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <ToggleButtonGroup value={panelView} exclusive onChange={(e, m) => m && setPanelView(m)}
              sx={{ height: 32, bgcolor: B.bg, border: `1px solid ${B.border}`, borderRadius: '8px', p: '2px',
                '& .MuiToggleButton-root': { border: 0, borderRadius: '6px !important', m: 0, color: B.muted, px: 1, height: 26,
                  '&.Mui-selected': { bgcolor: B.surface, color: B.pine, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', '&:hover': { bgcolor: B.surface } } } }}>
              <ToggleButton value="list"><ViewList sx={{ fontSize: 16 }} /></ToggleButton>
              <ToggleButton value="grid"><ViewModule sx={{ fontSize: 16 }} /></ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>
      )}

      {/* ── Filter chips: All / Pending / Approved / Rejected ───── */}
      {!isPoolView && !disabled && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5, flexWrap: 'wrap' }}>
          {(() => {
            // Live counts computed from the unfiltered per-round ranking.
            // Mirror the base filter used by `filtered`: in Overall view we
            // exclude both rejected AND anyone who hasn't finished every
            // round, so the counts match what the grid actually shows.
            const base = isOverallView
              ? ranking.filter(r => r.status !== 'rejected' && isFullyCompleted(r))
              : ranking;
            const norm = (s) => s || 'pending';
            const counts = {
              all:      base.length,
              pending:  base.filter(r => norm(r.status) === 'pending').length,
              approved: base.filter(r => norm(r.status) === 'approved').length,
              rejected: base.filter(r => norm(r.status) === 'rejected').length,
            };
            const chips = [
              { k: 'all',      label: 'All',      bg: B.pine,   dot: null },
              { k: 'pending',  label: 'Pending',  bg: B.amber,  dot: B.amber },
              { k: 'approved', label: 'Approved', bg: B.done,   dot: B.done },
              { k: 'rejected', label: 'Rejected', bg: B.danger, dot: B.danger },
            ];
            return chips.map(({ k, label, bg, dot }) => {
              const active = statusFilter === k;
              return (
                <Box key={k} onClick={() => setStatusFilter(k)} role="button" tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setStatusFilter(k); } }}
                  sx={{
                    display: 'inline-flex', alignItems: 'center', gap: 0.6,
                    px: 1.4, py: 0.55, borderRadius: '999px', cursor: 'pointer',
                    fontFamily: FONT, fontSize: '0.76rem', fontWeight: active ? 800 : 600,
                    transition: 'all 0.15s ease',
                    ...(active
                      ? { bgcolor: bg, color: '#fff', border: `1px solid ${bg}` }
                      : { bgcolor: B.surface, color: B.muted, border: `1px solid ${B.borderS}` }),
                    '&:hover': active ? {} : { bgcolor: B.bg, borderColor: B.muted },
                  }}>
                  {dot && (
                    <Box component="span" sx={{
                      width: 7, height: 7, borderRadius: '50%',
                      bgcolor: active ? 'rgba(255,255,255,0.75)' : dot, flexShrink: 0,
                    }} />
                  )}
                  {label}
                  <Box component="span" sx={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    minWidth: 20, height: 18, px: 0.7, borderRadius: '999px',
                    fontFamily: FONT, fontSize: '0.62rem', fontWeight: 800,
                    bgcolor: active ? 'rgba(255,255,255,0.2)' : B.bg,
                    color: active ? '#fff' : B.muted,
                  }}>{counts[k]}</Box>
                </Box>
              );
            });
          })()}
        </Box>
      )}

      {/* ── HR Review alert ─────────────────────────────────────── */}
      {!isPoolView && !isOverallView && !disabled && (
        <Alert icon={<HourglassEmpty sx={{ fontSize: 14 }} />}
          sx={{ mb: 1.5, py: 0.4, fontSize: '0.7rem', borderRadius: '10px', bgcolor: B.sageSoft, color: B.sageText, '& .MuiAlert-icon': { color: B.sage }, fontFamily: FONT }}>
          {round < pipelineRounds.length ? (
            <>Candidates who finish this round stay in <strong>Pending HR Review</strong>. Use <strong>→ R{round+1}</strong> to advance or <strong>Reject</strong>.</>
          ) : (
            <><strong>Final round.</strong> <strong>Approve</strong> sends the candidate to <strong>Pending Candidates</strong> for the final Hire / Reject decision. <strong>Reject</strong> keeps them here under the Rejected filter.</>
          )}
        </Alert>
      )}

      {/* ── Threshold button ────────────────────────────────────── */}
      {!isPoolView && !isOverallView && !disabled && filtered.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
          <Tooltip title="Set a cutoff score — candidates above get approved, below get rejected automatically" arrow placement="left"><span><Button size="small" variant="outlined" onClick={() => { setThresholdOpen(true); setThresholdPreview(null); }}
            sx={{ fontSize: '0.72rem', textTransform: 'none', borderRadius: '8px', borderColor: B.pine, color: B.pine, fontFamily: FONT,
              '&:hover': { bgcolor: B.sageSoft, borderColor: B.pine } }}>⚡ Apply Score Threshold</Button></span></Tooltip>
        </Box>
      )}

      {/* ── Bulk actions ────────────────────────────────────────── */}
      {(isOverallView || isPoolView) && !disabled && filtered.length > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, px: 1.5, py: 1.2,
          bgcolor: B.bg, borderRadius: '12px', border: `1px solid ${B.border}` }}>
          <Checkbox size="small" checked={selectedIds.size === filtered.length && filtered.length > 0}
            indeterminate={selectedIds.size > 0 && selectedIds.size < filtered.length}
            onChange={() => selectedIds.size === filtered.length ? setSelectedIds(new Set()) : setSelectedIds(new Set(filtered.map(r => r.candidate_id)))}
            sx={{ p: 0.5, color: B.borderS, '&.Mui-checked': { color: B.pine }, '&.MuiCheckbox-indeterminate': { color: B.pine } }} />
          <Typography sx={{ fontSize: '0.78rem', color: B.muted, fontWeight: 600, fontFamily: FONT, mr: 0.5 }}>
            {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all'}
          </Typography>
          {selectedIds.size > 0 && (
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
              {[
                { label: '✓ Approve', status: 'approved', bg: B.done, color: '#fff', hBg: '#2B5B2B' },
                { label: '⏳ Pending', status: 'pending', bg: 'transparent', color: B.amber, hBg: B.amberSoft, border: B.amber },
                { label: '✕ Reject', status: 'rejected', bg: 'transparent', color: B.danger, hBg: B.dangerSoft, border: B.danger },
              ].map(({ label, status, bg, color, hBg, border }) => (
                <Button key={status} size="small" disabled={bulkActing}
                  sx={{ fontSize: '0.72rem', py: 0.5, px: 1.5, borderRadius: '8px', textTransform: 'none', fontFamily: FONT, fontWeight: 700,
                    bgcolor: bg, color, border: border ? `1.5px solid ${border}` : 'none',
                    '&:hover': { bgcolor: hBg } }}
                  onClick={() => setConfirmDlg({ type: 'bulk', bulkStatus: status, bulkLabel: label })}
                >{label} ({selectedIds.size})</Button>
              ))}
            </Stack>
          )}
        </Box>
      )}

      {/* ── Loading ─────────────────────────────────────────────── */}
      {loading ? (
        <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress size={24} sx={{ color: B.sage }} /></Stack>
      ) : panelView === 'grid' ? (
        /* ── GRID VIEW — fold cards with score gauge ───────────── */
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)', lg: 'repeat(4,1fr)' }, gap: 1.5, px: 0.5 }}>
          {paginated.map((r, idx) => {
            const i = (page - 1) * effectiveSize + idx;
            const sCol = scoreColor(r.cgps_score);
            const fold = r.status === 'rejected' ? { face: B.danger, edge: B.dangerSoft } : r.status === 'approved' ? { face: B.done, edge: B.doneSoft } : { face: B.sage, edge: B.sageSoft };
            return (
              <Card key={r.candidate_id || i} elevation={0} sx={{
                position: 'relative', borderRadius: '14px', bgcolor: B.surface, overflow: 'hidden',
                border: `1px solid ${B.border}`, fontFamily: FONT,
                boxShadow: '0 6px 18px rgba(2,33,36,0.05)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
                '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 14px 32px rgba(2,33,36,0.12)', borderColor: B.sage },
                '&:hover .dogear': { borderTopWidth: '38px', borderLeftWidth: '38px' },
              }}>
                <Box sx={{ position: 'absolute', top: 0, right: 0, zIndex: 1, pointerEvents: 'none' }}>
                  <Box className="dogear" sx={{ width: 0, height: 0, borderLeft: `30px solid ${fold.edge}`, borderTop: `30px solid ${fold.face}`, borderRadius: '0 14px 0 0', transition: 'border-width .2s ease' }} />
                  <Box sx={{ position: 'absolute', top: 0, right: 0, width: 30, height: 30, background: 'linear-gradient(225deg, transparent 50%, rgba(2,33,36,0.14) 50%, transparent 64%)' }} />
                </Box>
                <Box sx={{ p: '14px 14px 12px', display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ScoreGauge score={r.cgps_score} size={52} sw={4} />
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: 2.5 }}>
                    <Box
                      onClick={e => { e.stopPropagation(); setProfileDlg(r); }}
                      role="button" tabIndex={0}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setProfileDlg(r); } }}
                      sx={{
                        display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flex: 1,
                        cursor: 'pointer', borderRadius: '8px', p: 0.25, m: -0.25,
                        transition: 'background 0.15s ease',
                        '&:hover': { bgcolor: 'rgba(127,158,126,0.06)' },
                        '&:hover .cand-name': { color: B.sageText },
                      }}>
                      <CandidateAvatar r={r} size={32} />
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography className="cand-name" noWrap sx={{ fontSize: '0.82rem', fontWeight: 700, color: B.ink, transition: 'color 0.15s ease' }}>{r.candidate_name || r.candidate_email || `#${r.candidate_id}`}</Typography>
                        <Typography sx={{ fontSize: '0.62rem', color: B.faint }}>Rounds: {r.rounds_completed || 0}/{r.total_rounds || process?.rounds_count || 1}</Typography>
                      </Box>
                    </Box>
                  </Box>
                  <Box sx={{ borderTop: `1px dashed ${B.border}`, pt: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {statusPill(r)}
                    {actionButtons(r, true)}
                  </Box>
                </Box>
              </Card>
            );
          })}
          {filtered.length === 0 && (
            <Box sx={{ gridColumn: '1 / -1', textAlign: 'center', py: 4 }}>
              <Typography sx={{ color: B.faint, fontSize: '0.82rem' }}>No candidates found for this round.</Typography>
            </Box>
          )}
        </Box>
      ) : (
        /* ── LIST VIEW — clean table ──────────────────────────── */
        <Box sx={{ overflowX: 'auto', '&::-webkit-scrollbar': { height: 3 }, '&::-webkit-scrollbar-thumb': { bgcolor: B.borderS, borderRadius: 2 } }}>
          <Box sx={{ minWidth: 720 }}>
            {/* Grid: S.NO | CANDIDATE | TEST / INTERVIEW | CPS | STATUS | ACTION */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '48px 1.2fr 1.4fr 110px 130px 70px', gap: 1.5, alignItems: 'center',
              px: 2, py: 1.1, bgcolor: B.bg, borderRadius: '10px 10px 0 0' }}>
              {[
                { k: 's_no',   label: 'S.NO' },
                { k: 'cand',   label: 'CANDIDATE' },
                { k: 'test',   label: 'TEST / INTERVIEW' },
                { k: 'cps',    label: 'CPS' },
                { k: 'status', label: 'STATUS' },
                { k: 'action', label: 'ACTION' },
              ].map(({ k, label }) => (
                <Typography key={k} sx={{
                  fontSize: '0.66rem', fontWeight: 800, color: B.muted,
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                  fontFamily: FONT, whiteSpace: 'nowrap',
                  ...(k === 'action' ? { textAlign: 'right' } : {}),
                }}>{label}</Typography>
              ))}
            </Box>
            {paginated.map((r, idx) => {
              const i = (page - 1) * effectiveSize + idx;
              const sCol = scoreColor(r.cgps_score);
              // TEST / INTERVIEW cell content — comes off the ranking API:
              //   assessment_title = e.g. "Backend developer assessment"
              //   assessment_mode  = 'Manual' | 'AI generated' | 'AI interview' | 'Live' | 'Document'
              const testTitle = r.assessment_title || r.test_name || null;
              const testMode  = r.assessment_mode  || null;
              // Mode-specific pill palette so recruiters can spot the type at a glance.
              const modePalette = {
                'AI generated':  { bg: B.sageSoft,   fg: B.sageText },
                'AI interview':  { bg: B.sageSoft,   fg: B.sageText },
                'Manual':        { bg: B.bg,         fg: B.muted    },
                'Live':          { bg: B.amberSoft,  fg: B.amber    },
                'Document':      { bg: B.dangerSoft, fg: B.danger   },
              }[testMode] || { bg: B.bg, fg: B.muted };
              return (
                <Box key={r.candidate_id || i} sx={{
                  display: 'grid', gridTemplateColumns: '48px 1.2fr 1.4fr 110px 130px 70px', gap: 1.5, alignItems: 'center',
                  px: 2, py: 1.3, borderBottom: `1px solid ${B.bg}`,
                  transition: 'background 0.1s ease', '&:hover': { bgcolor: 'rgba(127,158,126,0.03)' },
                }}>
                  <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: B.pine, fontFamily: FONT }}>{i + 1}</Typography>
                  <Box
                    onClick={e => { e.stopPropagation(); setProfileDlg(r); }}
                    role="button" tabIndex={0}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setProfileDlg(r); } }}
                    sx={{
                      display: 'flex', alignItems: 'center', gap: 0.8, minWidth: 0,
                      cursor: 'pointer', borderRadius: '8px', px: 0.5, mx: -0.5, py: 0.25,
                      transition: 'background 0.15s ease',
                      '&:hover': { bgcolor: 'rgba(127,158,126,0.08)' },
                      '&:hover .cand-name': { color: B.sageText },
                    }}>
                    <CandidateAvatar r={r} size={26} />
                    <Typography className="cand-name" noWrap sx={{ fontSize: '0.78rem', fontWeight: 600, color: B.ink, fontFamily: FONT, transition: 'color 0.15s ease' }}>
                      {r.candidate_name || r.candidate_email || `Candidate ${r.candidate_id}`}
                    </Typography>
                  </Box>
                  {/* TEST / INTERVIEW cell — title on top, mode pill below */}
                  <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.35 }}>
                    <Typography noWrap title={testTitle || ''} sx={{
                      fontSize: '0.78rem', fontWeight: 600, color: testTitle ? B.ink : B.faint,
                      fontFamily: FONT,
                    }}>
                      {testTitle || '—'}
                    </Typography>
                    {testMode && (
                      <Box sx={{
                        display: 'inline-flex', alignItems: 'center', alignSelf: 'flex-start',
                        px: 0.9, py: 0.15, borderRadius: '6px',
                        bgcolor: modePalette.bg, color: modePalette.fg,
                        fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.05em',
                        textTransform: 'uppercase', fontFamily: FONT, lineHeight: 1.5,
                      }}>{testMode}</Box>
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: sCol, fontFamily: FONT }}>{r.cgps_score ?? '—'}</Typography>
                    {r.cgps_score != null && (
                      <Box sx={{ width: 50, height: 4, borderRadius: 2, bgcolor: B.border, overflow: 'hidden' }}>
                        <Box sx={{ width: `${Math.min((r.cgps_score / 10) * 100, 100)}%`, height: '100%', borderRadius: 2, bgcolor: sCol, transition: 'width 0.4s ease' }} />
                      </Box>
                    )}
                  </Box>
                  {statusPill(r)}
                  {actionButtons(r, false)}
                </Box>
              );
            })}
            {filtered.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography sx={{ color: B.faint, fontSize: '0.82rem' }}>No candidates found.</Typography>
              </Box>
            )}
          </Box>
        </Box>
      )}

      {/* ── Pagination ──────────────────────────────────────────── */}
      {filtered.length > 0 && (
        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5, px: 0.5 }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.75 }}>
            <Typography sx={{ fontSize: '0.78rem', color: B.muted, fontWeight: 500, lineHeight: '34px', fontFamily: FONT }}>
              Showing{' '}
              <Box component="span" sx={{ color: B.ink, fontWeight: 700 }}>{(page - 1) * effectiveSize + 1}–{Math.min(page * effectiveSize, filtered.length)}</Box>
              {' '}of{' '}
              <Box component="span" sx={{ color: B.ink, fontWeight: 700 }}>{filtered.length}</Box>
              {' '}candidates
            </Typography>
            <Stack direction="row" spacing={0.6} sx={{ alignItems: 'center' }}>
              <Typography sx={{ fontSize: '0.78rem', color: B.muted, fontWeight: 500, lineHeight: '34px', fontFamily: FONT }}>Show</Typography>
              <Select size="small" value={pageSize}
                onChange={e => { const v = e.target.value; setPageSize(v === 'all' ? 'all' : Number(v)); setPage(1); }}
                renderValue={v => v === 'all' ? 'All' : v}
                sx={{ fontSize: '0.78rem', fontWeight: 700, color: B.pine, bgcolor: B.bg, borderRadius: '8px', minWidth: 70, height: 34, fontFamily: FONT,
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: B.border },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: B.borderS } }}>
                {PAGE_SIZES.map(n => <MenuItem key={n} value={n} sx={{ fontSize: '0.78rem', fontFamily: FONT }}>{n === 'all' ? 'All' : n}</MenuItem>)}
              </Select>
              <Typography sx={{ fontSize: '0.78rem', color: B.muted, fontWeight: 500, lineHeight: '34px', fontFamily: FONT }}>per page</Typography>
            </Stack>
          </Stack>
          {totalPages > 1 && (
            <Pagination count={totalPages} page={page} onChange={(_, v) => setPage(v)}
              shape="rounded" siblingCount={0}
              sx={{ '& .MuiPaginationItem-root': { fontWeight: 700, borderRadius: '8px', fontFamily: FONT,
                '&.Mui-selected': { bgcolor: B.pine, color: '#fff', '&:hover': { bgcolor: B.pineHover } } } }} />
          )}
        </Box>
      )}

      {/* ── Threshold dialog ────────────────────────────────────── */}
      <Dialog open={thresholdOpen} onClose={() => { setThresholdOpen(false); setThresholdPreview(null); }} maxWidth="xs" fullWidth
        slotProps={{ paper: { sx: { borderRadius: '16px', overflow: 'hidden' } } }}>
        <Box sx={{ background: `linear-gradient(135deg, ${B.pine} 0%, #0A3F42 100%)`, px: 3, py: 2 }}>
          <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '1rem', fontFamily: FONT }}>⚡ Score Threshold — Round {round}</Typography>
        </Box>
        <DialogContent sx={{ pt: 2.5 }}>
          <Typography sx={{ mb: 2, color: B.muted, fontSize: '0.82rem', fontFamily: FONT }}>
            At or above → <b>Approved</b>. Below → <b>Rejected</b>. Unscored → skipped.
          </Typography>
          <TextField label="CGPS Threshold (0–10)" type="number" inputProps={{ min: 0, max: 10, step: 0.5 }}
            value={thresholdVal} onChange={e => { setThresholdVal(e.target.value); setThresholdPreview(null); }}
            fullWidth size="small" sx={{ mb: 1.5, '& .MuiOutlinedInput-root': { borderRadius: '10px', fontFamily: FONT, '& fieldset': { borderColor: B.border }, '&:hover fieldset': { borderColor: B.borderS }, '&.Mui-focused fieldset': { borderColor: B.sage, borderWidth: '2px' } }, '& .MuiInputLabel-root': { fontFamily: FONT, color: B.faint, '&.Mui-focused': { color: B.sageText } } }} />
          <Button size="small" variant="text" onClick={handleThresholdPreview}
            sx={{ textTransform: 'none', fontSize: '0.78rem', color: B.pine, fontFamily: FONT }}>Preview →</Button>
          {thresholdPreview && (
            <Box sx={{ mt: 1.5, p: 1.5, bgcolor: B.bg, borderRadius: '8px', border: `1px solid ${B.border}`, fontSize: '0.82rem', fontFamily: FONT }}>
              <Stack direction="row" spacing={2}>
                <Box><b style={{ color: B.done }}>✅ Approve:</b> {thresholdPreview.will_approve}</Box>
                <Box><b style={{ color: B.danger }}>❌ Reject:</b> {thresholdPreview.will_reject}</Box>
                <Box><b style={{ color: B.amber }}>⏭ Skip:</b> {thresholdPreview.skipped}</Box>
              </Stack>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { setThresholdOpen(false); setThresholdPreview(null); }} sx={{ textTransform: 'none', color: B.muted, fontFamily: FONT }}>Cancel</Button>
          <Button variant="contained" disableElevation disabled={thresholdSaving || !thresholdPreview}
            onClick={handleThresholdApply}
            sx={{ bgcolor: B.pine, '&:hover': { bgcolor: B.pineHover }, textTransform: 'none', fontWeight: 700, borderRadius: '10px', fontFamily: FONT }}>
            {thresholdSaving ? 'Applying…' : 'Apply Threshold'}
          </Button>
        </DialogActions>
      </Dialog>


      {/* ── Candidate profile dialog ────────────────────── */}
      <CandidateProfileDialog
        row={profileDlg} open={!!profileDlg} onClose={() => setProfileDlg(null)}
        process={process} pipelineRounds={pipelineRounds} round={round}
        isOverallView={isOverallView} dataRound={dataRound} disabled={disabled}
        onApprove={handleApprove} onReject={handleReject}
        onViewResume={handleViewResume} onViewReport={handleViewReport}
        ROUND_TYPE_CFG={ROUND_TYPE_CFG} DEFAULT_CFG={DEFAULT_CFG}
      />

      {/* ── Per-row action menu — single instance, re-anchored on click ── */}
      {rowActionMenu}

      {/* ── Confirm approve/reject dialog ────────────────────── */}
      <Dialog open={!!confirmDlg} onClose={() => setConfirmDlg(null)} maxWidth="xs" fullWidth
        TransitionComponent={Grow} slotProps={{ paper: { sx: { borderRadius: '16px', overflow: 'hidden' } } }}>
        {confirmDlg && (<>
          <Box sx={{
            background: confirmDlg.type === 'reject'
              ? `linear-gradient(135deg, ${B.danger} 0%, #6B2820 100%)`
              : confirmDlg.type === 'approve' || (confirmDlg.type === 'bulk' && confirmDlg.bulkStatus === 'approved')
              ? `linear-gradient(135deg, ${B.done} 0%, #2B5B2B 100%)`
              : confirmDlg.type === 'bulk' && confirmDlg.bulkStatus === 'rejected'
              ? `linear-gradient(135deg, ${B.danger} 0%, #6B2820 100%)`
              : `linear-gradient(135deg, ${B.pine} 0%, #0A3F42 100%)`,
            px: 3, py: 2, display: 'flex', alignItems: 'center', gap: 1.3,
          }}>
            <Box sx={{ width: 38, height: 38, borderRadius: '11px', bgcolor: 'rgba(255,255,255,0.16)',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {(confirmDlg.type === 'approve' || (confirmDlg.type === 'bulk' && confirmDlg.bulkStatus === 'approved'))
                ? <CheckCircle sx={{ color: '#fff', fontSize: 21 }} />
                : <Cancel sx={{ color: '#fff', fontSize: 21 }} />}
            </Box>
            <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '1rem', fontFamily: FONT }}>
              {confirmDlg.type === 'bulk'
                ? `Confirm Bulk ${confirmDlg.bulkLabel?.replace(/[^a-zA-Z ]/g, '').trim()}`
                : confirmDlg.type === 'approve'
                ? (isOverallView ? 'Confirm Hire' : `Approve for Round ${round + 1}`)
                : 'Confirm Reject'}
            </Typography>
          </Box>
          <DialogContent sx={{ pt: 2.5 }}>
            <Typography sx={{ fontSize: '0.85rem', color: B.body, lineHeight: 1.6, fontFamily: FONT }}>
              {confirmDlg.type === 'bulk'
                ? <>Apply <strong>{confirmDlg.bulkLabel}</strong> to <strong>{selectedIds.size} candidate{selectedIds.size > 1 ? 's' : ''}</strong>? This will update their status immediately.</>
                : confirmDlg.type === 'approve'
                ? (isOverallView
                  ? <>Hire <strong>{confirmDlg.row?.candidate_name || 'this candidate'}</strong>? They will be marked as approved.</>
                  : <>Advance <strong>{confirmDlg.row?.candidate_name || 'this candidate'}</strong> to <strong>Round {round + 1}</strong>?</>)
                : <>Reject <strong>{confirmDlg.row?.candidate_name || 'this candidate'}</strong>? This action can be reversed from bulk actions.</>}
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setConfirmDlg(null)} sx={{ textTransform: 'none', color: B.muted, fontFamily: FONT }}>Cancel</Button>
            <Button variant="contained" disableElevation onClick={handleConfirm}
              sx={{
                bgcolor: confirmDlg.type === 'reject' || (confirmDlg.type === 'bulk' && confirmDlg.bulkStatus === 'rejected') ? B.danger
                  : (confirmDlg.type === 'approve' || (confirmDlg.type === 'bulk' && confirmDlg.bulkStatus === 'approved')) ? B.done : B.pine,
                '&:hover': { bgcolor: confirmDlg.type === 'reject' || (confirmDlg.type === 'bulk' && confirmDlg.bulkStatus === 'rejected') ? '#8C3225'
                  : (confirmDlg.type === 'approve' || (confirmDlg.type === 'bulk' && confirmDlg.bulkStatus === 'approved')) ? '#2B5B2B' : B.pineHover },
                textTransform: 'none', fontWeight: 700, borderRadius: '10px', px: 2.5, fontFamily: FONT,
              }}>
              {confirmDlg.type === 'bulk' ? `Confirm ${confirmDlg.bulkLabel?.replace(/[^a-zA-Z ]/g, '').trim()}`
                : confirmDlg.type === 'approve' ? (isOverallView ? 'Confirm Hire' : `Approve → R${round + 1}`) : 'Confirm Reject'}
            </Button>
          </DialogActions>
        </>)}
      </Dialog>

      <Dialog open={pdfLoading} slotProps={{ paper: { sx: { borderRadius: '16px', boxShadow: '0 8px 32px rgba(2,33,36,0.1)', minWidth: 200, border: 'none', overflow: 'hidden' } } }}
        slotProps={{ backdrop: { sx: { bgcolor: 'rgba(246,248,243,0.7)', backdropFilter: 'blur(4px)' } } }}>
        <Box sx={{ p: '24px 36px', textAlign: 'center', bgcolor: B.surface }}>
          <Box sx={{ display: 'flex', gap: '6px', justifyContent: 'center', mb: 1.5,
            '@keyframes dotPulse': { '0%,100%': { opacity: 0.3, transform: 'scale(0.85)' }, '50%': { opacity: 1, transform: 'scale(1)' } } }}>
            {[0, 1, 2].map(i => (
              <Box key={i} sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: B.sage,
                animation: 'dotPulse 1.2s ease infinite', animationDelay: `${i * 0.2}s` }} />
            ))}
          </Box>
          <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: B.muted, fontFamily: FONT }}>Opening document…</Typography>
        </Box>
      </Dialog>
    </Box>
  );
}