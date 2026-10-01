import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Box, Typography, Button, Stack, IconButton, Tooltip, Chip,
  CircularProgress, Card, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, InputAdornment, Paper, Skeleton, Select, MenuItem,
  ToggleButton, ToggleButtonGroup, Pagination, Checkbox, Alert, Divider,
} from '@mui/material';
import {
  Refresh, ClearRounded, Search as SearchIcon, BarChart,
  Delete as DeleteOutline, CheckCircle, Lock, ArrowBack,
  VisibilityOutlined, ViewList, ViewModule, ArrowForward, Cancel,
  HelpOutlineOutlined, HourglassEmpty,
  // BUILD: 2026-08-19-edit-pipeline-test-builder-v1
  AutoAwesome, EditNote, Assignment,
} from '@mui/icons-material';

import { useSnackbar } from 'notistack';
import { useParams, useNavigate } from 'react-router-dom';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import useRankedResults, { describeEdit } from '../../../hooks/employer/useRankedResults';
import rankedResultsService from '../../../services/api/employer/rankedResultsService';
import AssessmentBuilder   from '../Assessments/AssessmentBuilder';
import AIAssessmentBuilder from '../Assessments/AIAssessmentBuilder';
import * as XLSX from 'xlsx-js-style';

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
  blue:'#0284c7', blueSoft:'#E3F2FB',
  gold:'#8a6d1f', goldSoft:'#F3ECDD',
};

const CHIP_COLORS = {
  all:    { tint: B.pine,   soft: 'rgba(2,33,36,0.05)', ink: B.pine,   dot: B.pine },
  active: { tint: B.done,   soft: B.doneSoft,            ink: B.done,   dot: B.done },
  closed: { tint: B.danger, soft: B.dangerSoft,          ink: B.danger, dot: B.danger },
};
const PAGE_SIZES = [5, 10, 25, 50, 'all'];

const ROUND_ICON = {
  aptitude: '📝', 'ai-powered': '🤖', document: '📄', 'live-video': '🎥',
};
const roundIcon = (t) => ROUND_ICON[t] || '📋';
const ROUND_TYPE_LABEL = {
  'ai-powered': 'AI Interview',
  document:     'Document Interview',
  'live-video': 'Live Interview',
  aptitude:     'Assessment',
};
const roundTypeLabel = (t) => ROUND_TYPE_LABEL[t] || 'Round';
const ROW_GRID = {
  xs: '1fr',
  md: 'minmax(240px, 2.1fr) minmax(180px, 1.5fr) 90px 96px minmax(380px, auto)',
};

const fmtDate = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString(undefined,
      { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return '—'; }
};

/* ── shared bits ─────────────────────────────────────────────────────── */
const StatusPill = ({ active }) => (
  <Box sx={{ display:'inline-flex', alignItems:'center', gap:0.35,
    bgcolor: active ? B.doneSoft : B.dangerSoft, color: active ? B.done : B.danger,
    px:1, py:0.4, borderRadius:'7px', fontSize:'0.6rem', fontWeight:800,
    letterSpacing:'0.05em', textTransform:'uppercase', lineHeight:1.6 }}>
    <Box sx={{ width:5, height:5, borderRadius:'50%', bgcolor: active ? B.done : B.danger }} />
    {active ? 'Active' : 'Closed'}
  </Box>
);

/* ═══════════════ LEVEL 1 — job card ═══════════════ */
function JobCard({ job, viewMode, onOpen, onDelete, onSelect, selected }) {
  const meta = `${job.pipelineCount} pipeline${job.pipelineCount !== 1 ? 's' : ''}`
    + (job.memberTotal != null
        ? ` · ${job.memberTotal} candidate${job.memberTotal !== 1 ? 's' : ''}`
        : '');

  if (viewMode === 'list') return (
    <Card elevation={0} onClick={() => onOpen(job)}
      sx={{ fontFamily:FONT, borderRadius:'14px', bgcolor:B.surface, border:`1px solid ${B.border}`,
        borderLeft:`4px solid ${job.activeCount ? B.done : B.danger}`, cursor:'pointer',
        transition:'all 0.2s ease', mb:1.25,
        '&:hover':{ borderColor:B.sage, boxShadow:'0 6px 20px rgba(2,33,36,0.08)' } }}>
      <Box sx={{ display:'grid',
        gridTemplateColumns:{ xs:'1fr auto', md:'2.5fr 1.2fr 0.9fr auto' },
        alignItems:'center', px:2.25, py:1.6, gap:2 }}>
        <Box sx={{ display:'flex', alignItems:'center', gap:1, minWidth:0 }}>
          {onSelect && (
            <Checkbox size="small" checked={!!selected}
              onClick={(e) => { e.stopPropagation(); onSelect(job.key); }}
              sx={{ p:0.4, color:B.borderS, '&.Mui-checked':{ color:B.pine } }} />
          )}
                    <Typography noWrap sx={{ fontSize:'0.95rem', fontWeight:700, color:B.ink }}>
            {job.jobTitle}
          </Typography>
        </Box>
        <Typography sx={{ display:{ xs:'none', md:'block' }, fontSize:'0.76rem',
          color:B.muted, fontWeight:600 }}>{meta}</Typography>
        <Box sx={{ display:{ xs:'none', md:'flex' }, gap:0.5, flexWrap:'wrap' }}>
          {job.hasReduced && (
            <Chip size="small" label="edited" sx={{ height:20, fontSize:'0.6rem',
              fontWeight:800, bgcolor:B.amberSoft, color:B.amber }} />
          )}
        </Box>
        <Stack direction="row" spacing={0.5} sx={{ flexShrink:0 }}>
          {onDelete && (
            <Tooltip title="Remove this job from view" arrow>
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); onDelete(job); }}
                sx={{ color:B.faint, border:`1px solid ${B.border}`, borderRadius:'9px', p:0.6,
                  '&:hover':{ color:B.danger, bgcolor:B.dangerSoft,
                    borderColor:'rgba(166,61,47,0.3)' } }}>
                <DeleteOutline sx={{ fontSize:16 }} />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="View pipelines" arrow>
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); onOpen(job); }}
              sx={{ color:B.faint, border:`1px solid ${B.border}`, borderRadius:'9px', p:0.6,
                '&:hover':{ bgcolor:B.sageSoft, color:B.pine, borderColor:B.sage } }}>
              <ArrowForward sx={{ fontSize:16 }} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>
      <Typography sx={{ display:{ xs:'block', md:'none' }, px:2.25, pb:1.5,
        fontSize:'0.72rem', color:B.faint }}>{meta}</Typography>
    </Card>
  );

  return (
    <Card elevation={0} onClick={() => onOpen(job)}
      sx={{ position:'relative', height:'100%', display:'flex', flexDirection:'column',
        borderRadius:'16px', bgcolor:B.surface, overflow:'hidden', border:`1px solid ${B.border}`,
        fontFamily:FONT, boxShadow:'0 10px 26px rgba(2,33,36,0.06)', cursor:'pointer',
        transition:'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease',
        '&:hover':{ transform:'translateY(-4px)', boxShadow:'0 22px 48px -18px rgba(2,33,36,0.16)',
          borderColor:B.sage } }}>
      <Box sx={{ p:'17px 18px 18px', display:'flex', flexDirection:'column', flex:1, minWidth:0 }}>
        <Typography sx={{ fontSize:'0.98rem', fontWeight:800, color:B.ink, lineHeight:1.25,
          letterSpacing:'-0.015em', display:'-webkit-box', WebkitLineClamp:2,
          WebkitBoxOrient:'vertical', overflow:'hidden', minHeight:'2.5em' }}>
          {job.jobTitle}
        </Typography>
        <Typography sx={{ fontSize:'0.76rem', color:B.muted, fontWeight:600, mt:1.25 }}>
          <Box component="span" sx={{ color:B.sageText, fontWeight:800 }}>
            {job.pipelineCount} pipeline{job.pipelineCount !== 1 ? 's' : ''}
          </Box>
          {job.memberTotal != null && <>{' '}· {job.memberTotal} candidates</>}
        </Typography>
        <Box sx={{ mt:'auto', pt:1.5, display:'flex', alignItems:'center',
          justifyContent:'space-between', gap:1 }}>
          <Box sx={{ display:'flex', alignItems:'center', gap:0.5 }}>
            {onSelect && (
              <Checkbox size="small" checked={!!selected}
                onClick={(e) => { e.stopPropagation(); onSelect(job.key); }}
                sx={{ p:0.3, color:B.borderS, '&.Mui-checked':{ color:B.pine } }} />
            )}
            <StatusPill active={job.activeCount > 0} />
          </Box>
          <Box sx={{ display:'flex', alignItems:'center', gap:0.5 }}>
            {job.hasReduced && (
              <Chip size="small" label="pipeline edited" sx={{ height:20, fontSize:'0.58rem',
                fontWeight:800, bgcolor:B.amberSoft, color:B.amber }} />
            )}
            {onDelete && (
              <Tooltip title="Remove from view" arrow>
                <IconButton size="small" onClick={(e) => { e.stopPropagation(); onDelete(job); }}
                  sx={{ color:B.faint, border:`1px solid ${B.border}`, borderRadius:'9px', p:0.4,
                    '&:hover':{ color:B.danger, bgcolor:B.dangerSoft,
                      borderColor:'rgba(166,61,47,0.3)' } }}>
                  <DeleteOutline sx={{ fontSize:14 }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>
      </Box>
    </Card>
  );
}

/* ═══════════════ LEVEL 2 — pipeline card ═══════════════ */
function PipelineCard({ p, onOpen, onDelete, onEdit }) {
  const edit = describeEdit(p);
  return (
    <Card elevation={0} onClick={() => onOpen(p)}
      sx={{ fontFamily:FONT, borderRadius:'14px', bgcolor:B.surface,
        border:`1px solid ${B.border}`, borderLeft:`4px solid ${p.is_active ? B.done : B.danger}`,
        cursor:'pointer', transition:'all 0.2s ease', mb:1.25,
        '&:hover':{ borderColor:B.sage, boxShadow:'0 6px 20px rgba(2,33,36,0.08)' } }}>
      <Box sx={{ p:{ xs:1.75, sm:2 }, display:'flex', alignItems:'center',
        gap:1.5, flexWrap:'wrap' }}>
        <Box sx={{ minWidth:0, flex:'1 1 260px' }}>
          <Typography sx={{ fontSize:'0.95rem', fontWeight:800, color:B.ink }}>
            {p.name}
          </Typography>
          <Typography sx={{ fontSize:'0.74rem', color:B.muted, mt:0.4 }}>
            Created {fmtDate(p.created_at)} · {p.roundsCount} round{p.roundsCount !== 1 ? 's' : ''}
            {p.isReduced && (
              <Box component="span" sx={{ color:B.danger, fontWeight:700 }}>
                {' '}(reduced from {p.originalRoundsCount})
              </Box>
            )}
            {p.memberCount != null && <>{' '}· {p.memberCount} candidate{p.memberCount !== 1 ? 's' : ''}</>}
          </Typography>
          {edit && (
            <Typography sx={{ fontSize:'0.68rem', color:B.amber, fontWeight:700, mt:0.3 }}>
              ✎ {edit}
            </Typography>
          )}
        </Box>
        <Stack direction="row" spacing={0.75} sx={{ alignItems:'center', flexWrap:'wrap' }}>
          {p.removedRounds.length > 0 && (
            <Chip size="small"
              label={`🗄 ${p.removedRounds.length} removed`}
              sx={{ height:22, fontSize:'0.6rem', fontWeight:800,
                bgcolor:'#EFF1EC', color:B.faint }} />
          )}
          {p.grandfatheredCount > 0 && (
            <Tooltip title="Candidates who were already in a round that was later removed — they still finish it, new candidates skip it" arrow>
              <Chip size="small" label={`${p.grandfatheredCount} in ${p.grandfatheredCount === 1 ? 'a removed round' : 'removed rounds'}`}
                sx={{ height:22, fontSize:'0.6rem', fontWeight:800,
                  bgcolor:B.blueSoft, color:B.blue }} />
            </Tooltip>
          )}
          <StatusPill active={p.is_active} />
          <Tooltip title="Edit pipeline — add or remove rounds. Candidates already in a removed round will still finish it; new candidates skip it." arrow>
            <span>
              <Button size="small" variant="outlined" disabled={!p.is_active}
                onClick={(e) => { e.stopPropagation(); onEdit(p); }}
                sx={{ textTransform:'none', fontWeight:700, fontSize:'0.7rem',
                  borderRadius:'9px', px:1.1, py:0.35, color:B.pine,
                  borderColor:B.borderS, minWidth:0,
                  '&:hover':{ bgcolor:B.sageSoft, borderColor:B.sage } }}>
                🛠 Edit
              </Button>
            </span>
          </Tooltip>
          <Tooltip title="Open pipeline" arrow>
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); onOpen(p); }}
              sx={{ color:B.faint, border:`1px solid ${B.border}`, borderRadius:'9px', p:0.6,
                '&:hover':{ bgcolor:B.sageSoft, color:B.pine, borderColor:B.sage } }}>
              <VisibilityOutlined sx={{ fontSize:16 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete pipeline" arrow>
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); onDelete(p); }}
              sx={{ color:B.faint, border:`1px solid ${B.border}`, borderRadius:'9px', p:0.6,
                '&:hover':{ color:B.danger, bgcolor:B.dangerSoft,
                  borderColor:'rgba(166,61,47,0.3)' } }}>
              <DeleteOutline sx={{ fontSize:16 }} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>
    </Card>
  );
}

function RoundTabs({ activeRounds, removedRounds, current, onPick, reschedule }) {
  const countFor = (rcId) => {
    const g = (reschedule?.rounds || []).find(
      (r) => String(r.round_config_id) === String(rcId));
    return g ? g.requests.length : 0;
  };

  const slotOf = (r, kind) => {
    if (typeof r.original_number === 'number' && r.original_number > 0) return r.original_number;
    if (kind === 'active'  && typeof r.round_number === 'number') return r.round_number;
    return Number.MAX_SAFE_INTEGER;
  };
  const merged = [
    ...activeRounds.map((r)  => ({ round: r, kind: 'active',  slot: slotOf(r, 'active')  })),
    ...removedRounds.map((r) => ({ round: r, kind: 'removed', slot: slotOf(r, 'removed') })),
  ].sort((a, b) => a.slot - b.slot);

  return (
    <Stack direction="row" sx={{ gap:0.9, flexWrap:'wrap', my:1.75 }}>
      {merged.map(({ round: r, kind, slot }) => {
        const on = String(current) === String(r.id);
        const n  = countFor(r.id);

        if (kind === 'active') {
          return (
            <Box key={r.id} role="button" tabIndex={0} onClick={() => onPick(r.id)}
              sx={{ cursor:'pointer', userSelect:'none', display:'inline-flex',
                alignItems:'center', gap:0.6, px:1.6, py:0.85, borderRadius:999,
                fontSize:'0.78rem', fontWeight:on ? 800 : 700, fontFamily:FONT,
                transition:'all 0.16s ease',
                ...(on ? { bgcolor:B.pine, color:'#fff', border:`1px solid ${B.pine}` }
                       : { bgcolor:B.surface, color:B.muted, border:`1px solid ${B.borderS}` }),
                '&:hover': on ? {} : { bgcolor:B.sageSoft, borderColor:B.sage, color:B.pine } }}>
              <Tooltip title={r.name || ''} arrow disableInteractive>
                <Box component="span" sx={{ display:'inline-flex',
                  alignItems:'center', gap:0.6 }}>
                  {roundIcon(r.round_type)} R{slot} · {roundTypeLabel(r.round_type)}
                </Box>
              </Tooltip>
              {n > 0 && (
                <Box component="span" sx={{ bgcolor:B.danger, color:'#fff', borderRadius:999,
                  px:0.75, fontSize:'0.6rem', fontWeight:800, lineHeight:1.7 }}>{n}</Box>
              )}
            </Box>
          );
        }

        return (
          <Tooltip key={r.id} arrow
            title={`Cut off ${fmtDate(r.removed_on)} — still live for ${r.live_member_count} candidate(s) who already attempted it; new candidates never see it`}>
            <Box role="button" tabIndex={0} onClick={() => onPick(r.id)}
              sx={{ cursor:'pointer', userSelect:'none', display:'inline-flex',
                alignItems:'center', gap:0.6, px:1.6, py:0.85, borderRadius:999,
                fontSize:'0.78rem', fontWeight:on ? 800 : 700, fontFamily:FONT,
                borderStyle:'dashed', borderWidth:'1px',
                transition:'all 0.16s ease',
                ...(on ? { bgcolor:B.dangerSoft, color:B.danger, borderColor:B.danger,
                           borderStyle:'solid' }
                       : { bgcolor:'#FAFBF8', color:B.faint, borderColor:B.borderS }),
                '&:hover': on ? {} : { bgcolor:B.dangerSoft, borderColor:B.danger, color:B.danger } }}>
              <Box component="span" sx={{ bgcolor:B.danger, color:'#fff', borderRadius:'5px',
                px:0.7, py:0.05, fontSize:'0.55rem', fontWeight:800, letterSpacing:'0.05em' }}>
                CUT OFF
              </Box>
              <Box component="s" sx={{ textDecorationColor:B.danger,
                display:'inline-flex', alignItems:'center', gap:0.4 }}>
                {roundIcon(r.round_type)} R{slot} · {roundTypeLabel(r.round_type)}
              </Box>
              {r.live_member_count > 0 && (
                <Tooltip arrow disableInteractive
                  title={`${r.live_member_count} candidate(s) attempted this round before it was cut off — they still finish here`}>
                  <Box component="span" sx={{ bgcolor:'#EFF1EC', color:B.faint, borderRadius:999,
                    px:0.75, fontSize:'0.62rem', fontWeight:800 }}>{r.live_member_count}</Box>
                </Tooltip>
              )}
              {n > 0 && (
                <Box component="span" sx={{ bgcolor:B.danger, color:'#fff', borderRadius:999,
                  px:0.75, fontSize:'0.6rem', fontWeight:800 }}>{n}</Box>
              )}
            </Box>
          </Tooltip>
        );
      })}
    </Stack>
  );
}

/* ═══════════════ reschedule dialog (round-filtered) ═══════════════ */
function RescheduleDialog({ open, onClose, groups, onApply, busy }) {
  const [roundId, setRoundId] = useState('');
  const [ws, setWs] = useState('');
  const [we, setWe] = useState('');

  useEffect(() => {
    if (open && groups?.length) {
      setRoundId(String(groups[0].round_config_id));
      const start = new Date(Date.now() + 86400000);
      const end   = new Date(Date.now() + 8 * 86400000);
      const iso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        .toISOString().slice(0, 16);
      setWs(iso(start)); setWe(iso(end));
    }
  }, [open, groups]);

  const group = groups?.find((g) => String(g.round_config_id) === String(roundId)) || null;

  return (
    <Dialog open={open} onClose={() => !busy && onClose()} maxWidth="sm" fullWidth
      slotProps={{ paper: { sx: { borderRadius:'16px', overflow:'hidden', fontFamily:FONT }  } }}>
      <Box sx={{ background:`linear-gradient(135deg, ${B.amber} 0%, #7E4522 100%)`,
        px:3, py:2, display:'flex', alignItems:'center', gap:1.3 }}>
        <Box component="span" sx={{ fontSize:16, lineHeight:1 }}>🔁</Box>
        <Typography sx={{ color:'#fff', fontWeight:800, fontSize:'1rem', fontFamily:FONT }}>
          Reschedule Requests
        </Typography>
      </Box>
      <DialogContent sx={{ pt:2.5 }}>
        <Typography sx={{ fontSize:'0.7rem', fontWeight:800, textTransform:'uppercase',
          letterSpacing:'0.05em', color:B.faint, mb:0.75 }}>
          Round filter — only rounds with requests appear
        </Typography>
        <Select fullWidth size="small" value={roundId} onChange={(e) => setRoundId(e.target.value)}
          sx={{ borderRadius:'10px', fontSize:'0.85rem', fontFamily:FONT, mb:2 }}>
          {(groups || []).map((g) => (
            <MenuItem key={g.round_config_id} value={String(g.round_config_id)}
              sx={{ fontSize:'0.83rem' }}>
              {roundIcon(g.round_type)}{' '}
              {g.is_removed
                ? `R${g.original_number} · ${g.name} — CUT OFF`
                : `R${g.original_number ?? g.round_number} · ${g.name}`}
              {' '}— {g.requests.length} waiting
            </MenuItem>
          ))}
        </Select>

        {group && (
          <Box sx={{ mb:2 }}>
            <Typography sx={{ fontSize:'0.7rem', fontWeight:800, textTransform:'uppercase',
              letterSpacing:'0.05em', color:B.faint, mb:0.75 }}>
              Applies to these {group.requests.length} only
            </Typography>
            <Stack spacing={0.75}>
              {group.requests.map((r) => (
                <Box key={r.si_id} sx={{ display:'flex', alignItems:'center', gap:1.25,
                  p:1.1, border:`1px solid ${B.border}`, borderRadius:'10px' }}>
                  <Box sx={{ minWidth:0, flex:1 }}>
                    <Typography sx={{ fontSize:'0.85rem', fontWeight:700, color:B.ink }}>
                      {r.candidate_name}
                    </Typography>
                    <Typography sx={{ fontSize:'0.72rem', color:B.faint }}>
                      “{r.reason || 'Requested a new slot'}”
                    </Typography>
                  </Box>
                  <Chip size="small"
                    label={r.is_grandfathered ? '🗄 removed round' : 'pending'}
                    sx={{ height:20, fontSize:'0.58rem', fontWeight:800,
                      bgcolor:B.dangerSoft, color:B.danger }} />
                </Box>
              ))}
            </Stack>
          </Box>
        )}

       <LocalizationProvider dateAdapter={AdapterDateFns}>
          <Stack direction={{ xs:'column', sm:'row' }} spacing={1.25}>
            <DateTimePicker label="New window start" ampm
              value={ws ? new Date(ws) : null}
              onChange={(d) => setWs(d instanceof Date && !isNaN(d)
                ? new Date(d.getTime() - d.getTimezoneOffset() * 60000)
                    .toISOString().slice(0, 16)
                : '')}
              format="dd MMM yyyy, hh:mm a"
              slotProps={{ textField:{ size:'small', fullWidth:true,
                helperText:_fmt12(ws) || undefined } }} />
            <DateTimePicker label="New window end" ampm
              value={we ? new Date(we) : null}
              onChange={(d) => setWe(d instanceof Date && !isNaN(d)
                ? new Date(d.getTime() - d.getTimezoneOffset() * 60000)
                    .toISOString().slice(0, 16)
                : '')}
              format="dd MMM yyyy, hh:mm a"
              slotProps={{ textField:{ size:'small', fullWidth:true,
                helperText:_fmt12(we) || undefined } }} />
          </Stack>
        </LocalizationProvider>

        <Alert severity="info" icon={false}
          sx={{ mt:2, borderRadius:'11px', bgcolor:B.sageSoft, color:B.sageText,
            fontSize:'0.78rem', fontFamily:FONT, border:`1px dashed ${B.sage}` }}>
          Applies <strong>only</strong> to the candidates above, at{' '}
          <strong>exactly this round</strong> — they resume <strong>from this round
          only</strong>: earlier completed rounds stay intact, later rounds re-lock until
          it is cleared and approved again. Removed rounds keep the same flow for their
          existing members. Everyone else is untouched.
        </Alert>
      </DialogContent>
      <DialogActions sx={{ px:3, pb:2.5 }}>
        <Button onClick={onClose} disabled={busy}
          sx={{ textTransform:'none', color:B.muted, fontFamily:FONT }}>Cancel</Button>
        <Button variant="contained" disableElevation disabled={busy || !group || !ws || !we}
          onClick={() => onApply(group.round_config_id, ws, we)}
          startIcon={busy ? <CircularProgress size={14} sx={{ color:'#fff' }} />
                          : <Box component="span" sx={{ fontSize:16, lineHeight:1 }}>🔁</Box>}
          sx={{ bgcolor:B.amber, '&:hover':{ bgcolor:'#7E4522' }, textTransform:'none',
            fontWeight:700, borderRadius:'10px', px:2.5, fontFamily:FONT }}>
          {busy ? 'Rescheduling…' : 'Reschedule this round'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ═══════════════ skip-report dialog (decision engine) ═══════════════ */
function SkipReportDialog({ report, onClose }) {
  if (!report) return null;
  const { action, applied, skipped = [] } = report;
  const _headline = action === 'approve'
      ? 'Approval processed successfully'
    : action === 'hire'
      ? 'Hiring decision confirmed'
    : action === 'reject'
      ? 'Rejection processed successfully'
      : 'Decision processed';
  const _icon = action === 'approve' ? '✓'
              : action === 'hire'    ? '✅'
              : action === 'reject'  ? '✕' : '•';
  const _accent = action === 'reject' ? B.danger
                : action === 'hire'   ? B.done
                                       : B.done;
  const _followUp = action === 'approve'
      ? `${applied === 1 ? 'has' : 'have'} been advanced to the next round of the interview pipeline. ${applied === 1 ? 'They' : 'They'} will receive an invitation for the next scheduled round.`
    : action === 'hire'
      ? `${applied === 1 ? 'has' : 'have'} been added to the Final Hire list. A hiring record has been generated, and the candidate profile will now appear under Final Hire.`
    : action === 'reject'
      ? `${applied === 1 ? 'has' : 'have'} been removed from consideration for this position. This decision is final and reflected in the candidate's pipeline status.`
      : `${applied === 1 ? 'has' : 'have'} been updated.`;
  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth
      slotProps={{ paper: { sx: { borderRadius:'16px', fontFamily:FONT,
        overflow:'hidden' }  } }}>
      <Box sx={{ background: action === 'reject'
          ? `linear-gradient(135deg, ${B.danger} 0%, #6B2820 100%)`
        : action === 'hire'
          ? `linear-gradient(135deg, ${B.done} 0%, #1A4A1A 100%)`
          : `linear-gradient(135deg, ${B.done} 0%, #2B5B2B 100%)`,
        px:3, py:2 }}>
        <Typography sx={{ color:'#fff', fontWeight:800, fontSize:'1rem',
          fontFamily:FONT }}>
          {_icon} {_headline}
        </Typography>
      </Box>
      <DialogContent sx={{ pt:2.5 }}>
        <Typography sx={{ fontSize:'0.88rem', color:B.ink, fontFamily:FONT,
          fontWeight:700, mb:0.75 }}>
          <Box component="span" sx={{ color:_accent, fontWeight:800 }}>
            {applied}
          </Box>{' '}
          candidate{applied !== 1 ? 's' : ''} {_followUp.split(' ')[0]}
        </Typography>
        <Typography sx={{ fontSize:'0.82rem', color:B.body, fontFamily:FONT,
          lineHeight:1.55 }}>
          {_followUp.substring(_followUp.indexOf(' ') + 1)}
        </Typography>
        {skipped.length > 0 && (
          <>
            <Divider sx={{ my:1.5 }} />
            <Typography sx={{ fontSize:'0.7rem', fontWeight:800, textTransform:'uppercase',
              letterSpacing:'0.05em', color:B.faint, mb:0.75 }}>
              Skipped ({skipped.length})
            </Typography>
            <Stack spacing={0.6}>
              {skipped.map((s, i) => (
                <Typography key={`${s.candidate_id}-${i}`}
                  sx={{ fontSize:'0.8rem', color:B.muted, fontFamily:FONT }}>
                  <strong style={{ color:B.ink }}>{s.name}</strong> — {s.reason}
                </Typography>
              ))}
            </Stack>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px:3, pb:2 }}>
        <Button onClick={onClose} variant="contained" disableElevation
          sx={{ bgcolor:B.pine, '&:hover':{ bgcolor:B.pineHover }, textTransform:'none',
            fontWeight:700, borderRadius:'10px', fontFamily:FONT }}>Got it</Button>
      </DialogActions>
    </Dialog>
  );
}

const _laterRoundLive = (m, activeRounds, currentRoundId) => {
  if (!Array.isArray(activeRounds) || !activeRounds.length) return false;
  const i = activeRounds.findIndex((r) => String(r.id) === String(currentRoundId));
  if (i === -1) return false;                    // removed round → rule N/A
  return activeRounds.slice(i + 1).some((r) => {
    const c = (m.rounds || {})[r.id];
    return !!c && c.status !== 'locked' && c.status !== 'draft';
  });
};

/* Rules 1–5: shared by approve and reject. */
const isDecidable = (m, cell, activeRounds, currentRoundId) => {
  if (!cell) return false;                                        // 1
  if (m.is_rejected) return false;                                // 2
  if (cell.status === 'rejected' || cell.decision === 'rejected') return false;
  if (m.in_hire_pool) return false;                               // 3
  if (cell.decision === 'approved') return false;                 // 4
  if (_laterRoundLive(m, activeRounds, currentRoundId)) return false; // 5
  return true;
};

const _missedRescheduled = (cell) =>
  cell?.status === 'rescheduled'
  && cell?.window_end
  && new Date(cell.window_end).getTime() < Date.now();

// 🔧 "Really attempted" = the candidate actually took the removed round
// (completed or partial). no_attempt/expired/invited/scheduled all count as
// NOT attempted for the grandfathered rule the recruiter asked for.
const _grandRealAttempt = (cell) =>
  cell && ['completed', 'partial'].includes(cell.status);

// 🔧 Common terminal-state gate reused by both branches below.
const _grandBaseBlocked = (m, cell) =>
  !cell
  || m.is_rejected
  || cell.status === 'rejected' || cell.decision === 'rejected'
  || m.in_hire_pool
  || cell.decision === 'approved';

const canApproveMember = (m, cell, activeRounds, currentRoundId) => {
  if (cell && cell.is_grandfathered) {
    if (_grandBaseBlocked(m, cell)) return false;
    return _grandRealAttempt(cell);
  }
  return isDecidable(m, cell, activeRounds, currentRoundId)
    && (['completed', 'partial', 'no_attempt', 'expired'].includes(cell.status)
        || _missedRescheduled(cell));
};

const canRejectMember = (m, cell, activeRounds, currentRoundId) => {

  if (cell && cell.is_grandfathered) {
    return !_grandBaseBlocked(m, cell);
  }
  return isDecidable(m, cell, activeRounds, currentRoundId)
    && (['completed', 'partial', 'no_attempt', 'expired'].includes(cell.status)
        || _missedRescheduled(cell));
};

function MemberRow({ m, checked, onCheck, isFinal, nextRound, onDecide, busy,
                     resolvedScore, onOpenReport, onOpenPreview, onOpenProfile,
                     roundType = '', liveNow = Date.now(),
                     decideBusy = null,
                     canApprove: canApproveProp,
                     canReject: canRejectProp }) {
  const _mine = decideBusy?.ids?.has(m.candidate_id) || false;
 const approving = _mine && (decideBusy.action === 'approve' || decideBusy.action === 'hold');
  const rejecting = _mine && decideBusy.action === 'reject';
  const hiring    = _mine && decideBusy.action === 'hire';
  const [_shortDurDlg, _setShortDurDlg] = useState({ open: false, minutes: 0 });
  const cell = m.cell || {};
  const rejected  = cell.status === 'rejected' || cell.decision === 'rejected';
  const approved  = cell.decision === 'approved';
  const awaiting  = m.in_hire_pool;
  const hired     = awaiting && (
    cell.pool_type === 'pool_hired'
    || Object.values(m.rounds || {}).some(c => c?.pool_type === 'pool_hired')
    || Object.values(m.removed_rounds || {}).some(c => c?.pool_type === 'pool_hired')
  );
  const completed = cell.status === 'completed';
  
 const attempted = ['completed', 'partial', 'no_attempt', 'expired']
   .includes(cell.status)
   || (cell.status === 'rescheduled'
       && cell.window_end
       && new Date(cell.window_end).getTime() < Date.now());
  const canApprove = canApproveProp !== undefined
    ? canApproveProp
    : (attempted && !approved && !rejected && !awaiting);
  const canReject  = canRejectProp !== undefined
    ? canRejectProp
    : (attempted && !approved && !rejected && !awaiting);

  const showDecisions = canApprove || canReject;
  const decidable = showDecisions;

  const chip = (label, bg, fg) => (
    <Box sx={{ display:'inline-flex', alignItems:'center', gap:0.3, bgcolor:bg, color:fg,
      px:0.85, py:0.3, borderRadius:'6px', fontSize:'0.58rem', fontWeight:800,
      textTransform:'uppercase', letterSpacing:'0.03em' }}>{label}</Box>
  );

  const displayScore = (cell.score != null) ? cell.score
                     : (resolvedScore !== undefined && resolvedScore !== null)
                       ? resolvedScore : null;
  const stillResolving = cell.score == null && resolvedScore === undefined;
  const hasAttempt = ['completed', 'partial', 'rejected'].includes(cell.status)
    || approved || awaiting;
 
  const _durGatedTypes = ['ai-powered'];
  const _isDurGated = _durGatedTypes.includes(cell.interview_type);
  const _durSecs    = Number(cell.duration_seconds || 0);
  const _durMins    = Math.floor(_durSecs / 60);
  const reportAvailable = hasAttempt
    && (!_isDurGated || _durSecs >= 20 * 60);

  return (
    <Box sx={{ display:'grid',
      gridTemplateColumns: ROW_GRID,
      alignItems:'center', columnGap:1.25, rowGap:0.75,
      px:1.75, py:1.4, bgcolor:B.surface,
      border:`1px solid ${B.border}`, borderRadius:'12px', mb:1,
      opacity: rejected ? 0.75 : 1 }}>


      <Box sx={{ minWidth:0 }}>
        <Typography noWrap role="button" tabIndex={0}
          onClick={() => onOpenProfile(m)}
          sx={{ fontSize:'0.88rem', fontWeight:700, color:B.ink, fontFamily:FONT,
            cursor:'pointer', width:'fit-content', maxWidth:'100%',
            '&:hover':{ color:B.sageText, textDecoration:'underline' } }}>
          {m.name}
        </Typography>
        <Typography noWrap sx={{ fontSize:'0.72rem', color:B.faint, fontFamily:FONT }}>
          {m.email || '—'}
        </Typography>
        {m.has_undecided_grandfathered && (
          <Typography sx={{ fontSize:'0.68rem', color:B.blue, fontWeight:700, mt:0.3 }}>
            🗄 still inside a removed round — decide there first
          </Typography>
        )}
      </Box>

      <Box sx={{ display:{ xs:'none', md:'flex' }, gap:0.5, flexWrap:'wrap',
        alignItems:'center' }}>
        {cell.is_grandfathered && chip('🗄 in a removed round', '#EFF1EC', B.faint)}
        {rejected  && chip('❌ Rejected', B.dangerSoft, B.danger)}
        {awaiting  && chip(
          hired ? '✅ Hired' : '📋 Moved to Pending Candidates',
          hired ? B.doneSoft : B.goldSoft,
          hired ? B.done     : B.gold,
        )}
        {!rejected && !awaiting && approved &&
          chip(nextRound ? `➡ Advanced to R${nextRound.original_number ?? nextRound.round_number}` : '➡ Advanced',
               B.blueSoft, B.blue)}
       {!rejected && !awaiting && !approved && !completed && cell.status === 'partial' &&
          chip('⚠ Partial · decision needed', B.amberSoft, B.amber)}
        {!rejected && !awaiting && !approved && completed &&
          chip('⏳ Decision pending', B.amberSoft, B.amber)}
        {!rejected && !completed && !awaiting && !approved && cell.status !== 'partial' && (
          roundType === 'live-video'
            ? (() => {
                if (m._awaitingEntry
                    || ['locked', 'draft'].includes(cell.status)
                    || !cell.window_start) {
                  return chip('🎟 Awaiting slot booking', B.amberSoft, B.amber);
                }
                const ws = new Date(cell.window_start).getTime();
                const we = cell.window_end
                  ? new Date(cell.window_end).getTime()
                  : ws + 60 * 60000;               // default 1h slot
                const withinWindow = liveNow >= ws && liveNow <= we;
                const pres = cell.live_presence || null;
              
                if (withinWindow && pres?.in_meeting) {
                  return (
                    <Box sx={{ display:'inline-flex', alignItems:'center',
                      gap:0.5, bgcolor:B.dangerSoft, color:B.danger,
                      px:0.85, py:0.3, borderRadius:'6px', fontSize:'0.58rem',
                      fontWeight:800, textTransform:'uppercase',
                      letterSpacing:'0.03em' }}>
                      <Box component="span" sx={{ width:7, height:7,
                        borderRadius:'50%', bgcolor:'currentColor',
                        '@keyframes livePulse': {
                          '0%':   { opacity: 1 },
                          '50%':  { opacity: 0.25 },
                          '100%': { opacity: 1 },
                        },
                        animation:'livePulse 1.2s ease-in-out infinite' }} />
                      LIVE NOW
                    </Box>
                  );
                }
                if (withinWindow && pres?.candidate_joined) {
                  return chip('🚪 In waiting room', B.amberSoft, B.amber);
                }
                if (liveNow > we) {
                  return chip('🕐 Ended · awaiting result',
                              B.amberSoft, B.amber);
                }
                const d = new Date(cell.window_start);
                const when = `${fmtDate(cell.window_start)}, ${d
                  .toLocaleTimeString('en-IN',
                    { hour:'2-digit', minute:'2-digit' })}`;
                return chip(`🎥 Booked · ${when}`, B.blueSoft, B.blue);
              })()
            : chip(String(cell.status || '—').replace(/_/g, ' '),
                   B.sageSoft, B.sageText)
        )}
        {cell.status === 'reschedule_requested' && cell.reschedule_reason && (
          <Typography sx={{ fontSize:'0.68rem', color:B.faint, width:'100%' }}>
            “{cell.reschedule_reason}”
          </Typography>
        )}
      </Box>

      <Typography sx={{ display:{ xs:'none', md:'block' }, fontSize:'0.85rem',
        fontWeight:800, textAlign:'center',
        color: rejected ? B.danger
             : displayScore == null ? B.faint : B.done,
        fontFamily:FONT }}>
        {displayScore != null ? `${displayScore}/10`
          : hasAttempt && stillResolving ? '…' : '—'}
      </Typography>

      <Box sx={{ display:{ xs:'none', md:'flex' }, justifyContent:'center' }}>
        <Tooltip arrow title={
          !hasAttempt
            ? 'Available after the candidate attempts this round'
            : 'Preview the full report inline — the SAME PDF the candidate received. No new tab opens.'
        }>
          <span>
            
            <Button size="small" variant="contained" disableElevation
              disabled={!hasAttempt}
              onClick={() => {
                if (reportAvailable) {
                  onOpenPreview(m);
                } else {
                  _setShortDurDlg({ open: true, minutes: _durMins });
                }
              }}
              sx={{ textTransform:'none', fontWeight:700, fontSize:'0.7rem',
                borderRadius:'8px', px:1.25, py:0.4, minWidth:0,
                bgcolor:B.pine, color:'#fff', fontFamily:FONT,
                '&:hover':{ bgcolor:B.pineHover },
                '&.Mui-disabled':{ bgcolor:B.bg, color:B.faint } }}>
              👁 Preview
            </Button>
          </span>
        </Tooltip>

        {/* Professional "insufficient duration" dialog — row-local */}
        <Dialog open={_shortDurDlg.open}
          onClose={() => _setShortDurDlg({ open: false, minutes: 0 })}
          PaperProps={{ sx: { borderRadius: '14px', maxWidth: 460,
            fontFamily: FONT } }}>
          <DialogTitle sx={{ fontFamily: FONT, fontWeight: 800,
            color: B.ink, fontSize: '1.05rem',
            borderBottom: `1px solid ${B.border}`, pb: 1.5 }}>
            Report Not Available
          </DialogTitle>
          <DialogContent sx={{ pt: 2.5, pb: 1 }}>
            <Typography sx={{ fontFamily: FONT, fontSize: '0.9rem',
              color: B.body, lineHeight: 1.6 }}>
              This candidate did not complete the minimum{' '}
              <Box component="span" sx={{ fontWeight: 800, color: B.ink }}>
                20-minute
              </Box>{' '}
              interview duration required for a report to be generated.
            </Typography>
            <Typography sx={{ fontFamily: FONT, fontSize: '0.9rem',
              color: B.body, lineHeight: 1.6, mt: 1.5 }}>
              The interview lasted only{' '}
              <Box component="span" sx={{ fontWeight: 800, color: B.danger }}>
                {_shortDurDlg.minutes} minute{_shortDurDlg.minutes === 1 ? '' : 's'}
              </Box>.
              A meaningful evaluation cannot be produced from such a short
              attempt, so no report has been generated for this round.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={() => _setShortDurDlg({ open: false, minutes: 0 })}
              variant="contained" disableElevation
              sx={{ textTransform: 'none', fontWeight: 700, fontFamily: FONT,
                bgcolor: B.pine, color: '#fff', borderRadius: '8px',
                px: 2.5, '&:hover': { bgcolor: B.pineHover } }}>
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </Box>

      {showDecisions ? (
      <Stack direction="row" spacing={0.6} sx={{ gridColumn:{ xs:'1 / -1', md:'auto' },
        flexWrap:'wrap', justifyContent:{ md:'flex-end' }, rowGap:0.5 }}>
        {cell.is_grandfathered
          && !['completed', 'partial'].includes(cell.status)
          ? null
          : (cell.is_grandfathered
             && ['completed', 'partial'].includes(cell.status)) ? (<>
          {/* 🔧 Attempted grandfathered → recruiter gets ALL FOUR buttons
              (Approve → next / Hold / Hire / Reject). Approve only renders
              when there is an active round left to advance to; Reject sits
              outside this branch and always shows. */}
          {nextRound && (
            <Tooltip arrow title={`Approve → advance to R${nextRound.original_number ?? nextRound.round_number}`}>
              <span>
                <Button size="small" variant="contained" disableElevation
                  disabled={!canApprove || busy || _mine}
                  onClick={() => onDecide('approve', [m.candidate_id])}
                  startIcon={approving
                    ? <CircularProgress size={13} sx={{ color:'#fff' }} />
                    : <CheckCircle sx={{ fontSize:15 }} />}
                  sx={{ bgcolor:B.done, '&:hover':{ bgcolor:'#2B5B2B' }, textTransform:'none',
                    fontWeight:700, borderRadius:'8px', fontSize:'0.72rem', fontFamily:FONT,
                    '&.Mui-disabled': approving
                      ? { bgcolor:B.done, color:'#fff', opacity:0.85 } : undefined }}>
                  {approving ? 'Approving…' : `Approve → R${nextRound.original_number ?? nextRound.round_number}`}
                </Button>
              </span>
            </Tooltip>
          )}
          <Tooltip arrow title="Hold → move to Pending Candidates for later decision">
            <span>
              <Button size="small" variant="outlined" disableElevation
                disabled={!canApprove || busy || _mine}
                onClick={() => onDecide('hold', [m.candidate_id])}
                startIcon={approving
                  ? <CircularProgress size={13} sx={{ color:B.amber }} />
                  : <HourglassEmpty sx={{ fontSize:14 }} />}
                sx={{ color:B.amber, borderColor:'rgba(163,90,45,0.35)', textTransform:'none',
                  fontWeight:700, borderRadius:'8px', fontSize:'0.72rem', fontFamily:FONT,
                  '&:hover':{ bgcolor:B.amberSoft, borderColor:B.amber },
                  '&.Mui-disabled': approving
                    ? { color:B.amber, borderColor:'rgba(163,90,45,0.35)', opacity:0.85 }
                    : undefined }}>
                {approving ? 'Holding…' : 'Hold'}
              </Button>
            </span>
          </Tooltip>
          <Tooltip arrow title="Hire → confirm as final hire immediately">
            <span>
              <Button size="small" variant="contained" disableElevation
                disabled={!canApprove || busy || _mine}
                onClick={() => onDecide('hire', [m.candidate_id])}
                startIcon={hiring
                  ? <CircularProgress size={13} sx={{ color:'#fff' }} />
                  : <CheckCircle sx={{ fontSize:15 }} />}
                sx={{ bgcolor:B.done, '&:hover':{ bgcolor:'#2B5B2B' }, textTransform:'none',
                  fontWeight:700, borderRadius:'8px', fontSize:'0.72rem', fontFamily:FONT,
                  '&.Mui-disabled': hiring
                    ? { bgcolor:B.done, color:'#fff', opacity:0.85 } : undefined }}>
                {hiring ? 'Hiring…' : 'Hire'}
              </Button>
            </span>
          </Tooltip>
        </>) : (isFinal || !nextRound) ? (<>
          <Tooltip arrow title={!canApprove
            ? 'Hold unlocks once the candidate has completed this round'
            : 'Hold → move to Pending Candidates for later decision'}>
            <span>
              <Button size="small" variant="outlined" disableElevation
                disabled={!canApprove || busy || _mine}
                onClick={() => onDecide('hold', [m.candidate_id])}
                startIcon={approving
                  ? <CircularProgress size={13} sx={{ color:B.amber }} />
                  : <HourglassEmpty sx={{ fontSize:14 }} />}
                sx={{ color:B.amber, borderColor:'rgba(163,90,45,0.35)', textTransform:'none',
                  fontWeight:700, borderRadius:'8px', fontSize:'0.72rem', fontFamily:FONT,
                  '&:hover':{ bgcolor:B.amberSoft, borderColor:B.amber },
                  '&.Mui-disabled': approving
                    ? { color:B.amber, borderColor:'rgba(163,90,45,0.35)', opacity:0.85 }
                    : undefined }}>
                {approving ? 'Holding…' : 'Hold'}
              </Button>
            </span>
          </Tooltip>
          <Tooltip arrow title={!canApprove
            ? 'Hire unlocks once the candidate has completed this round'
            : 'Hire → confirm as final hire immediately'}>
            <span>
              <Button size="small" variant="contained" disableElevation
                disabled={!canApprove || busy || _mine}
                onClick={() => onDecide('hire', [m.candidate_id])}
                startIcon={hiring
                  ? <CircularProgress size={13} sx={{ color:'#fff' }} />
                  : <CheckCircle sx={{ fontSize:15 }} />}
                sx={{ bgcolor:B.done, '&:hover':{ bgcolor:'#2B5B2B' }, textTransform:'none',
                  fontWeight:700, borderRadius:'8px', fontSize:'0.72rem', fontFamily:FONT,
                  '&.Mui-disabled': hiring
                    ? { bgcolor:B.done, color:'#fff', opacity:0.85 } : undefined }}>
                {hiring ? 'Hiring…' : 'Hire'}
              </Button>
            </span>
          </Tooltip>
        </>) : (
          /* ── NON-FINAL ROUND: Approve → next round ──────────────── */
          <Tooltip arrow title={!canApprove
            ? 'Approve unlocks once the candidate has completed this round'
            : `Approve → advance to R${nextRound.original_number ?? nextRound.round_number}`}>
            <span>
              <Button size="small" variant="contained" disableElevation
                disabled={!canApprove || busy || _mine}
                onClick={() => onDecide('approve', [m.candidate_id])}
                startIcon={approving
                  ? <CircularProgress size={13} sx={{ color:'#fff' }} />
                  : <CheckCircle sx={{ fontSize:15 }} />}
                sx={{ bgcolor:B.done, '&:hover':{ bgcolor:'#2B5B2B' }, textTransform:'none',
                  fontWeight:700, borderRadius:'8px', fontSize:'0.72rem', fontFamily:FONT,
                  '&.Mui-disabled': approving
                    ? { bgcolor:B.done, color:'#fff', opacity:0.85 } : undefined }}>
                {approving ? 'Approving…' : `Approve → R${nextRound.original_number ?? nextRound.round_number}`}
              </Button>
            </span>
          </Tooltip>
        )}

        {/* ── REJECT (always shown) ───────────────────────────────── */}
        <span>
          <Button size="small" variant="outlined"
            disabled={!canReject || busy || _mine}
            onClick={() => onDecide('reject', [m.candidate_id])}
            startIcon={rejecting
              ? <CircularProgress size={13} sx={{ color:B.danger }} />
              : <Cancel sx={{ fontSize:15 }} />}
            sx={{ color:B.danger, borderColor:'rgba(166,61,47,0.35)', textTransform:'none',
              fontWeight:700, borderRadius:'8px', fontSize:'0.72rem', fontFamily:FONT,
              '&:hover':{ bgcolor:B.dangerSoft, borderColor:B.danger },
              '&.Mui-disabled': rejecting
                ? { color:B.danger, borderColor:'rgba(166,61,47,0.35)', opacity:0.85 }
                : undefined }}>
            {rejecting ? 'Rejecting…' : 'Reject'}
          </Button>
        </span>
      </Stack>
      ) : (
        <Typography sx={{ gridColumn:{ xs:'1 / -1', md:'auto' },
          textAlign:{ md:'right' },
          fontSize:'0.7rem', fontWeight:700, fontFamily:FONT,
          color: rejected ? B.danger : awaiting ? B.gold
               : approved ? B.blue : B.faint }}>
          {rejected ? 'Decision made' : awaiting ? (hired ? 'Hired' : 'Pending Candidates')
            : approved ? 'Advanced' : '⏳ Awaiting completion'}
        </Typography>
      )}
    </Box>
  );
}

const RTYPE_OPTS = [
  { v: 'ai-powered', icon: '🤖', label: 'AI Interview',
    desc: 'AI-powered Q&A with real-time CPS scoring' },
  { v: 'document',   icon: '📄', label: 'Document Interview',
    desc: 'AI reads an uploaded doc and generates unique questions' },
  { v: 'live-video', icon: '🎥', label: 'Live Interview',
    desc: 'Live video round with interviewers / slot booking' },
  { v: 'aptitude',   icon: '📝', label: 'Assessment',
    desc: 'Manual / aptitude assessment with sectioned marking' },
];
const _SI_EDITABLE = ['scheduled', 'invited', 'locked', 'draft', 'no_attempt',
                      'rescheduled', 'expired', 'reschedule_requested'];
const _toLocal = (v) => {
  if (!v) return '';
  try {
    const d = new Date(v);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString().slice(0, 16);
  } catch { return ''; }
};

const _fmt12 = (v) => {
  if (!v) return '';
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('en-US', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    });
  } catch { return ''; }
};
const _fmtT12 = (t) => {
  if (!t) return '';
  const [hStr, mStr = '00'] = String(t).split(':');
  let h = Number(hStr); const m = Number(mStr);
  if (isNaN(h) || isNaN(m)) return '';
  const suffix = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${suffix}`;
};
function IAEMLiveRoundBanner({ roundName }) {
  const navigate = useNavigate();
  return (
    <Box sx={{ mt:1.25, border:`1px dashed ${B.sage}`, borderRadius:'12px',
      p:1.5, bgcolor:B.sageSoft }}>
      <Typography sx={{ fontSize:'0.72rem', fontWeight:800, color:B.pine,
        textTransform:'uppercase', letterSpacing:'0.05em', mb:0.75,
        fontFamily:FONT }}>
        🎥 Live Interview — Scheduled via IAEM
      </Typography>
      <Typography sx={{ fontSize:'0.76rem', color:B.body, fontFamily:FONT,
        mb:0.75 }}>
        This live round is scheduled through IAEM. Here's the flow:
      </Typography>
      <Box component="ol" sx={{ m:0, pl:2.25, color:B.body, fontFamily:FONT,
        fontSize:'0.76rem', '& li':{ mb:0.4 } }}>
        <li>Give this round a name above, then click <b>Save Changes</b>.</li>
        <li>Open <b>IAEM Scheduling</b> and release the schedule for this round.</li>
        <li>Interviewers submit their available slots.</li>
        <li>The candidate books a slot from those.</li>
      </Box>
    </Box>
  );
}

// LiveSlotEditor — REMOVED. Live-video scheduling handled by IAEM.


function RoundDocumentEditor({ roundConfigId, roundName, duration, seed, onFileChange }) {
  const { enqueueSnackbar } = useSnackbar();
  const [file, setFile]   = useState(null);
  const [qpc, setQpc]     = useState(seed?.questions_per_candidate || 10);
  const [busy, setBusy]   = useState(false);
  const [done, setDone]   = useState(null);   // { attached, activated, skipped }
  const [saved, setSaved] = useState(seed || null);
  const [dur,   setDur]   = useState(seed?.duration_mins || duration || 60);

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const res = await rankedResultsService.getRoundDocument(roundConfigId);
        const d = res?.data || {};
        if (dead || !d.has_document) return;
        setSaved(d);
        if (d.questions_per_candidate) setQpc(d.questions_per_candidate);
        if (d.duration_mins) setDur(d.duration_mins);
      } catch { /* no document yet, or endpoint not deployed — stay blank */ }
    })();
    return () => { dead = true; };
  }, [roundConfigId]);

  const upload = async () => {
    if (!file) {
      enqueueSnackbar('Choose a question document first.', { variant:'warning' });
      return;
    }
    setBusy(true);
    try {
      const res = await rankedResultsService.uploadRoundDocument(roundConfigId, {
        file,
        questionsPerCandidate: qpc,
        interviewName: roundName,
        durationMins: dur,
      });
      const d = res?.data || {};
      setDone(d);
      enqueueSnackbar(
        `Questions attached to ${d.attached ?? 0} candidate(s)` +
        (d.activated ? ` — ${d.activated} round(s) went live immediately.` : '.'),
        { variant:'success', autoHideDuration:7000 },
      );
    } catch (err) {
      enqueueSnackbar(
        err?.response?.data?.detail || 'Could not attach the question document.',
        { variant:'error', autoHideDuration:9000 },
      );
    } finally { setBusy(false); }
  };

  return (
    <Box sx={{ mt:1.25, p:1.25, borderRadius:'11px', bgcolor:B.bg,
      border:`1px dashed ${B.borderS}` }}>
      <Typography sx={{ fontSize:'0.72rem', fontWeight:800, color:B.ink,
        fontFamily:FONT, mb:0.75 }}>
        📄 Question document for this round
      </Typography>
      {saved?.original_filename && !file && (
        <Stack direction="row" spacing={1} alignItems="center"
          sx={{ p:1, mb:1, borderRadius:'9px', bgcolor:B.sageSoft,
            border:`1px solid ${B.sage}` }}>
          <Typography sx={{ fontSize:'0.74rem', fontWeight:700, color:B.pine,
            fontFamily:FONT, flex:1, minWidth:0, overflow:'hidden',
            textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            ✓ Saved: {saved.original_filename}
            {saved.questions_count ? ` · ${saved.questions_count} question(s)` : ''}
          </Typography>
        </Stack>
      )}
      <Stack direction={{ xs:'column', sm:'row' }} spacing={1}
        sx={{ alignItems:{ sm:'center' } }}>
        <Button component="label" size="small" variant="outlined"
          disabled={busy}
          sx={{ textTransform:'none', fontWeight:700, borderRadius:'9px',
            color:B.pine, borderColor:B.borderS, fontFamily:FONT,
            fontSize:'0.72rem', maxWidth:{ sm:230 },
            '&:hover':{ bgcolor:B.sageSoft, borderColor:B.sage } }}>
          {file ? `📎 ${file.name}` : 'Choose file (PDF/DOC/DOCX/TXT)'}
          <input hidden type="file" accept=".pdf,.doc,.docx,.txt"
                        onChange={(e) => { const _f = e.target.files?.[0] || null; setFile(_f); setDone(null); if (onFileChange) onFileChange(_f); }} />
        </Button>
        <TextField size="small" type="number" label="Qs per candidate"
          value={qpc} disabled={busy}
          onChange={(e) => setQpc(e.target.value)}
          slotProps={{ htmlInput:{ min:1, max:50 } }}
          sx={{ width:{ xs:'100%', sm:150 } }} />
        <TextField size="small" type="number" label="Duration (mins)"
          value={dur} disabled={busy}
          onChange={(e) => setDur(e.target.value)}
          slotProps={{ htmlInput:{ min:10, max:180, step:5 } }}
          sx={{ width:{ xs:'100%', sm:150 } }} />
        <Button size="small" variant="contained" disableElevation
          onClick={upload} disabled={busy || !file}
          startIcon={busy ? <CircularProgress size={13} sx={{ color:'#fff' }} /> : null}
          sx={{ bgcolor:B.pine, '&:hover':{ bgcolor:B.pineHover },
            textTransform:'none', fontWeight:700, borderRadius:'9px',
            fontSize:'0.72rem', fontFamily:FONT }}>
          {busy ? 'Uploading…' : 'Attach to round'}
        </Button>
      </Stack>
      <Typography sx={{ mt:0.75, fontSize:'0.68rem', color:B.faint,
        fontFamily:FONT }}>
        Uploads once for the whole round. Candidates already approved into it
        go live immediately; anyone who already has questions is left untouched.
      </Typography>
      {done && (
        <Typography sx={{ mt:0.5, fontSize:'0.7rem', color:B.sageText,
          fontWeight:700, fontFamily:FONT }}>
          ✓ attached {done.attached} · activated {done.activated} · already had questions {done.skipped}
        </Typography>
      )}
    </Box>
  );
}

function EditPipelineWizard({ process, onClose, onDone }) {
  const { enqueueSnackbar } = useSnackbar();
  const [rows, setRows]       = useState([]);       // round drafts
  const [vacancies, setVac]   = useState(1);
  const [isActive, setActive] = useState(true);
  const [siMap, setSiMap]     = useState({});       // roundConfigId -> [{si_id,status}]
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const _membersRef = useRef([]);
  const [testBuilderOpen,   setTestBuilderOpen]   = useState(false);
  const [aiBuilderOpen,     setAiBuilderOpen]     = useState(false);
  const [builderRoundIdx,   setBuilderRoundIdx]   = useState(null);
  const [missingPaperWarn,  setMissingPaperWarn]  = useState(null);
  const [kindNudge,         setKindNudge]         = useState(null);   // { idx, kind:'ai'|'manual' }
  const _companyId = React.useMemo(() => {
    try { return JSON.parse(localStorage.getItem('ievalx_user') || '{}')?.company_id || null; }
    catch { return null; }
  }, []);
  const _jobCtx = React.useMemo(() => ({
    id:    process?.jobId ?? process?.job_id ?? process?.job ?? null,
    title: process?.jobTitle || process?.job_title || '',
  }), [process?.jobId, process?.job_id, process?.job, process?.jobTitle, process?.job_title]);

  useEffect(() => {
    if (!process) return;
    let dead = false;
    (async () => {
      setLoading(true);
      try {
        const res = await rankedResultsService.getPipelineMembers(process.id);
        const d = res?.data || {};
        _membersRef.current = d.members || [];
        const map = {};
        (d.members || []).forEach((m) => {
          Object.entries(m.rounds || {}).forEach(([rcId, cell]) => {
            if (!cell) return;
            (map[rcId] = map[rcId] || []).push(cell);
          });
        });
        const src = (d.rounds && d.rounds.length)
          ? d.rounds
          : (process.activeRounds || []);
        if (dead) return;
        setSiMap(map);
        setRows(src.map((r, i) => {
                   const cells = map[String(r.id)] || [];
          const w = cells.find((c) => _SI_EDITABLE.includes(c.status) && c.window_start)
                 || cells.find((c) => c.window_start)
                 || cells[0] || {};
          const _cfgWs = r.default_window_start || null;
          const _cfgWe = r.default_window_end   || null;
          const _seedWs = _cfgWs ? _toLocal(_cfgWs) : _toLocal(w.window_start);
          const _seedWe = _cfgWe ? _toLocal(_cfgWe) : _toLocal(w.window_end);
          const _seedMode = r.interview_mode || 'standard';
          return {
            key: `r-${r.id}`, id: r.id,
            order: r.round_number ?? r.order ?? (i + 1),
            round_type: r.round_type || 'ai-powered',
            name: r.name || '',
            duration: r.duration ?? 60,
            passing_score: r.passing_score ?? 70,
            window_start: _seedWs,
            window_end:   _seedWe,
            __w0: _seedWs, _w1: _seedWe,
            interview_mode: _seedMode, _im0: _seedMode,
            _d0: (typeof r.duration === 'number') ? r.duration : null,
            _p0: (typeof r.passing_score === 'number') ? r.passing_score : null,
            _docSeed: r.document || null,
            _slots: [],   // slot_definitions removed — IAEM handles live-video scheduling
                        _docFile: null,
            _docQpc: r.document?.questions_per_candidate || 10,
            assessment_id: (r.assessment_id ?? null),
            _a0: (r.assessment_id ?? null),
            assessment_kind: (r.round_type === 'aptitude'
              ? (String(r.name || '').includes('AI-Generated Test') ? 'ai'
                : String(r.name || '').includes('Manually Uploaded Test') ? 'manual'
                : null)
              : null),
          };
        }));
        setVac(process.vacancies || 1);
        setActive(process.is_active !== false);
      } finally { if (!dead) setLoading(false); }
    })();
    return () => { dead = true; };
  }, [process]);

  
  const catCounts = useMemo(() => {
    const hired = new Set();
    const rejected = new Set();
    const grandfathered = new Set();
    const activeIds = new Set(rows.filter((r) => r.id).map((r) => String(r.id)));

    const members = _membersRef.current || [];
    members.forEach((m) => {
      const cid = m.candidate_id;
      if (cid == null) return;
      const cells = Object.values(m.rounds || {})
        .concat(Object.values(m.removed_rounds || {}));
      const anyHired = cells.some((c) => c && c.pool_type === 'pool_hired');
      if (anyHired) { hired.add(cid); return; }
      const anyRejected = cells.some((c) => c
        && (c.status === 'rejected' || c.decision === 'rejected'));
      if (anyRejected) { rejected.add(cid); return; }
      // Grandfathered = has a cell under a round_config_id that is NOT
      // in the current active rows list.
      const isGrand = Object.keys(m.rounds || {}).some((rcId) =>
        !activeIds.has(String(rcId)))
        || Object.keys(m.removed_rounds || {}).length > 0;
      if (isGrand) grandfathered.add(cid);
    });
    return {
      hired: hired.size,
      rejected: rejected.size,
      grandfathered: grandfathered.size,
    };
  }, [rows, siMap]);   // siMap is a stand-in trigger; ref carries the data

  const move = (i, dir) => setRows((r) => {
    const j = i + dir;
    if (j < 0 || j >= r.length) return r;
    const next = [...r];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });
  const removeRow = (i) => setRows((r) => r.filter((_, k) => k !== i));
        const addRow = () => setRows((r) => [...r, {
    key: `new-${Date.now()}`, id: null, order: r.length + 1,
    round_type: 'ai-powered', name: '', duration: 60, passing_score: 70,
    window_start: '', window_end: '', _w0: '', _w1: '',
    interview_mode: 'standard', _im0: 'standard',
    _d0: null, _p0: null, _docSeed: null, _slots: [],
    _docFile: null, _docQpc: 10,
    assessment_id: null, _a0: null,
    // BUILD: 2026-08-19-edit-pipeline-test-builder-v2
    assessment_kind: null,
  }]);
  const patchRow = (i, k, v) => setRows((r) =>
    r.map((row, idx) => (idx === i ? { ...row, [k]: v } : row)));

  const liveCount = (rcId) =>
    (siMap[String(rcId)] || []).filter((c) => c.status !== 'locked'
      && c.status !== 'draft').length;

  const _findMissingPapers = () => (rows || [])
    .map((r, idx) => ({ r, idx }))
    .filter(({ r }) => !r.id
      && r.round_type === 'aptitude'
      && !r.assessment_id
      && (r.assessment_kind === 'ai' || r.assessment_kind === 'manual'))
    .map(({ r, idx }) => ({
      idx,
      name: r.name || '',
      isAI: r.assessment_kind === 'ai',
    }));

  const save = async () => {
    if (saving) return;
    if (!rows.length) {
      enqueueSnackbar('A pipeline needs at least one round.', { variant: 'warning' });
      return;
    }
    if (rows.some((r) => !String(r.name).trim())) {
      enqueueSnackbar('Every round needs a name.', { variant: 'warning' });
      return;
    }
  
    const _missing = _findMissingPapers();
    if (_missing.length > 0) {
      setMissingPaperWarn({ rounds: _missing });
      return;
    }
    setSaving(true);
    try {
      // 1) pipeline-level fields
      await rankedResultsService.updateProcess(process.id, {
        vacancies: Number(vacancies) || 1, is_active: isActive,
      }).catch(() => {});

      // 2) removed rounds first — the backend soft-deletes + grandfathers
      const keptIds = new Set(rows.filter((r) => r.id).map((r) => String(r.id)));
      const removed = (process.activeRounds || [])
        .filter((r) => !keptIds.has(String(r.id)));
      for (const r of removed) {
        await rankedResultsService.deleteRound(r.id);
      }
      const kept = rows.filter((r) => r.id);
      for (let i = 0; i < kept.length; i += 1) {
        await rankedResultsService.updateRound(kept[i].id, {
          order: 500 + i + 1,
        });
      }
            const _postCreate = [];
      for (let i = 0; i < rows.length; i += 1) {
        const r = rows[i];
        const body = {
          name: r.name.trim(), round_type: r.round_type,
          order: i + 1,
          ...(r.id ? {} : {
            duration: Number(r.duration) || 60,
            passing_score: Number(r.passing_score) || 70,
          }),
          ...(r.round_type === 'ai-powered'
            ? { interview_mode: r.interview_mode || 'standard' }
            : {}),
          ...(r.round_type === 'aptitude' && r.assessment_id
            ? { assessment_id: Number(r.assessment_id) }
            : {}),
          ...(r.window_start
            ? { default_window_start: new Date(r.window_start).toISOString() }
            : {}),
          ...(r.window_end
            ? { default_window_end: new Date(r.window_end).toISOString() }
            : {}),
        };
        if (r.id) await rankedResultsService.updateRound(r.id, body);
        else {
          const res = await rankedResultsService.createRound(process.id, body);
          r.id = res?.data?.id ?? null;
          if (r.id) _postCreate.push(r);
        }
      }

      await rankedResultsService.syncProcessRounds(process.id);

            for (const r of _postCreate) {
        try {
          if (r.round_type === 'document' && r._docFile) {
            await rankedResultsService.uploadRoundDocument(r.id, {
              file: r._docFile,
              questionsPerCandidate: r._docQpc || 10,
              interviewName: r.name.trim(),
              durationMins: Number(r.duration) || 60,
            });
          }
        } catch (cfgErr) {
          enqueueSnackbar(
            `Round "${r.name}" was created, but its setup did not save — `
            + (cfgErr?.response?.data?.detail || 'open Edit Pipeline again to finish it.'),
            { variant: 'warning', autoHideDuration: 9000 });
        }
      }
          
      const _postCreateIds = new Set(_postCreate.map((r) => r.id));

      for (const r of rows) {
        if (!r.id || !r._docFile) continue;
        if (r.round_type !== 'document') continue;
        if (_postCreateIds.has(r.id)) continue;   // already handled above
        try {
          await rankedResultsService.uploadRoundDocument(r.id, {
            file: r._docFile,
            questionsPerCandidate: r._docQpc || 10,
            interviewName: r.name.trim(),
            durationMins: Number(r.duration) || 60,
          });
        } catch (docErr) {
          enqueueSnackbar(
            `Round "${r.name}" document upload failed — `
            + (docErr?.response?.data?.detail || 'try "Attach to round" manually.'),
            { variant: 'warning', autoHideDuration: 9000 });
        }
      }

      let _cells = siMap;
      try {
        const _fresh = await rankedResultsService.getPipelineMembers(process.id);
        const _m = {};
        ((_fresh?.data?.members) || []).forEach((mem) =>
          Object.entries(mem.rounds || {}).forEach(([rcId, cell]) => {
            if (cell) (_m[rcId] = _m[rcId] || []).push(cell);
          }));
        if (Object.keys(_m).length) _cells = _m;
      } catch { /* fall back to the map loaded when the dialog opened */ }

      let patched = 0; let liveSkipped = 0; let completedSkipped = 0;
      const failures = [];            // { si_id, detail }
      const intended = [];            // { roundId, iso } for post-save verify
      for (const r of rows) {
        if (!r.id) continue;
        const changed = (r.window_start && r.window_start !== r._w0)
                     || (r.window_end   && r.window_end   !== r._w1);
        if (!changed) continue;
        if (r.round_type === 'live-video') { liveSkipped += 1; continue; }
        const payload = {};
        let iso = null;
        if (r.window_start) {
          const d = new Date(r.window_start);
          iso = d.toISOString();
          payload.window_start   = iso;

          payload.scheduled_date = r.window_start.slice(0, 10);
          payload.scheduled_time = r.window_start.slice(11, 16);
        }
        if (r.window_end) payload.window_end = new Date(r.window_end).toISOString();
        const allCells = _cells[String(r.id)] || [];
        completedSkipped += allCells
          .filter((c) => !_SI_EDITABLE.includes(c.status)).length;
        for (const c of allCells.filter((x) => _SI_EDITABLE.includes(x.status))) {
          try {
            await rankedResultsService.updateScheduled(c.si_id, payload);
            patched += 1;
          } catch (err) {
            failures.push({
              si_id: c.si_id,
              detail: err?.response?.data?.detail
                || (err?.response?.status ? `HTTP ${err.response.status}` : 'network error'),
            });
          }
        }
        if (iso) intended.push({ roundId: String(r.id), iso });
      }

      let verified = 0; let mismatched = 0;
      if (intended.length) {
        try {
          const chk = await rankedResultsService.getPipelineMembers(process.id);
          const fresh = {};
          ((chk?.data?.members) || []).forEach((m) =>
            Object.entries(m.rounds || {}).forEach(([rcId, cell]) => {
              if (cell) (fresh[rcId] = fresh[rcId] || []).push(cell);
            }));
          intended.forEach(({ roundId, iso }) => {
            (fresh[roundId] || [])
              .filter((c) => _SI_EDITABLE.includes(c.status))
              .forEach((c) => {
                const got = c.window_start
                  ? new Date(c.window_start).toISOString().slice(0, 16) : null;
                if (got === iso.slice(0, 16)) verified += 1; else mismatched += 1;
              });
          });
        } catch { /* verification is best-effort */ }
      }

      if (failures.length) {
        enqueueSnackbar(
          `${failures.length} window update(s) FAILED — server said: “${failures[0].detail}”`,
          { variant: 'error', autoHideDuration: 9000 });
      }
      if (mismatched) {
        enqueueSnackbar(
          `${mismatched} interview(s) did not persist the new window — check the server logs (the PATCH returned OK but the value read back differs).`,
          { variant: 'warning', autoHideDuration: 9000 });
      }
      if (verified) {
        enqueueSnackbar(
          `✅ New window verified on ${verified} interview(s) — jobseeker dashboards read this exact field.`,
          { variant: 'success', autoHideDuration: 6500 });
      }
      if (completedSkipped) {
        enqueueSnackbar(
          `${completedSkipped} interview(s) untouched because the candidate already completed them — their card keeps the original time by design.`,
          { variant: 'info', autoHideDuration: 8000 });
      }
      if (liveSkipped) {
        enqueueSnackbar(
          'Live-interview rounds keep their slot times — windows there are managed by the slot/booking flow, not this wizard.',
          { variant: 'info', autoHideDuration: 6500 });
      }

      enqueueSnackbar(
        `Pipeline saved${removed.length ? ` · ${removed.length} round(s) removed (candidates already in them will finish)` : ''}${patched ? ` · ${patched} interview window(s) updated` : ''}.`,
        { variant: 'success' });
      onDone?.();
      onClose();
    } catch (err) {
      const detail = err?.response?.data?.detail
        || (typeof err?.response?.data === 'string'
            ? err.response.data.slice(0, 160) : null)
        || (err?.response?.status ? `server returned ${err.response.status}`
            : err?.message)
        || 'unknown error';
      enqueueSnackbar(`Failed to save the pipeline — ${detail}`,
        { variant: 'error', autoHideDuration: 9000 });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open onClose={() => !saving && onClose()} maxWidth="md" fullWidth
      slotProps={{ paper: { sx: { borderRadius:'18px', fontFamily:FONT,
        maxHeight:'92vh' } } }}>
      <Box sx={{ background:`linear-gradient(135deg, ${B.pine} 0%, #0A3F42 100%)`,
        px:{ xs:2.25, sm:3 }, py:2.25 }}>
        <Typography sx={{ color:'#fff', fontWeight:800, fontSize:'1.05rem',
          fontFamily:FONT }}>🛠 Edit Pipeline</Typography>
        <Typography sx={{ color:'#93C5AE', fontSize:'0.8rem', fontFamily:FONT }}>
          {process?.name} — {process?.jobTitle || process?.job_title}
        </Typography>
      </Box>
      <DialogContent sx={{ pt:2.5 }}>
        {loading ? (
          <Box sx={{ textAlign:'center', py:5 }}>
            <CircularProgress size={26} sx={{ color:B.sage }} />
          </Box>
        ) : (
        <>
          {(catCounts.hired > 0 || catCounts.rejected > 0
            || catCounts.grandfathered > 0) && (
            <Alert severity="info" icon={false}
              sx={{ mb:2.25, borderRadius:'12px', bgcolor:B.sageSoft,
                color:B.pine, border:`1px dashed ${B.sage}`,
                fontFamily:FONT, fontSize:'0.82rem',
                '& .MuiAlert-message':{ width:'100%' } }}>
              <Typography sx={{ fontWeight:800, fontSize:'0.86rem',
                color:B.pine, fontFamily:FONT, mb:0.75 }}>
                ℹ️ Heads-up on adding rounds to this pipeline
              </Typography>
              <Typography sx={{ fontSize:'0.8rem', color:B.body,
                fontFamily:FONT, lineHeight:1.55, mb:1 }}>
                Any rounds you add here will be scheduled{' '}
                <strong>only for candidates still moving through the
                pipeline</strong> and for{' '}
                <strong>anyone scheduled into it after you save</strong>.
              </Typography>
              <Typography sx={{ fontSize:'0.78rem', fontWeight:700,
                color:B.sageText, fontFamily:FONT, mb:0.5,
                textTransform:'uppercase', letterSpacing:'0.05em' }}>
                This pipeline currently holds:
              </Typography>
              <Box component="ul" sx={{ m:0, pl:2.5,
                '& li':{ fontSize:'0.8rem', color:B.body, fontFamily:FONT,
                  lineHeight:1.6, mb:0.35 } }}>
                {catCounts.hired > 0 && (
                  <li>
                    <strong>{catCounts.hired} hired
                    {catCounts.hired === 1 ? ' candidate' : ' candidates'}</strong>
                    {' — '}the flow is complete for
                    {catCounts.hired === 1 ? ' them' : ' them'}; new rounds
                    won't be scheduled.
                  </li>
                )}
                {catCounts.rejected > 0 && (
                  <li>
                    <strong>{catCounts.rejected} rejected
                    {catCounts.rejected === 1 ? ' candidate' : ' candidates'}</strong>
                    {' — '}they've been decided against; new rounds won't
                    be scheduled.
                  </li>
                )}
                {catCounts.grandfathered > 0 && (
                  <li>
                    <strong>{catCounts.grandfathered}
                    {catCounts.grandfathered === 1 ? ' candidate' : ' candidates'}
                    {' '}finishing a removed round</strong>
                    {' — '}
                    {catCounts.grandfathered === 1 ? 'they complete' : 'they complete'}
                    {' '}where they are; rounds added after that point
                    won't reach them.
                  </li>
                )}
              </Box>
              <Typography sx={{ fontSize:'0.76rem', color:B.muted,
                fontFamily:FONT, mt:1, fontStyle:'italic' }}>
                Their status stays exactly as it is. If you want a hired
                or rejected candidate to take an additional round, schedule
                that round for them separately from the Candidates page.
              </Typography>
            </Alert>
          )}

          <Stack direction={{ xs:'column', sm:'row' }} spacing={1.5}
            sx={{ mb:2.5, alignItems:{ sm:'center' } }}>
            <Box role="button" tabIndex={0} onClick={() => setActive((a) => !a)}
              sx={{ display:'flex', alignItems:'center', gap:1, cursor:'pointer',
                px:1.5, py:1, borderRadius:'11px',
                border:`1px solid ${isActive ? B.sage : B.borderS}`,
                bgcolor: isActive ? B.sageSoft : B.bg }}>
              <Checkbox checked={isActive} size="small" sx={{ p:0,
                color:B.borderS, '&.Mui-checked':{ color:B.pine } }} />
              <Box>
                <Typography sx={{ fontSize:'0.82rem', fontWeight:700,
                  color:B.ink, fontFamily:FONT }}>Pipeline is active</Typography>
                <Typography sx={{ fontSize:'0.7rem', color:B.faint,
                  fontFamily:FONT }}>Uncheck to stop accepting decisions & attempts</Typography>
              </Box>
            </Box>
          </Stack>

          <Stack direction="row" sx={{ alignItems:'center',
            justifyContent:'space-between', mb:1.25 }}>
            <Typography sx={{ fontSize:'0.8rem', fontWeight:800, color:B.ink,
              fontFamily:FONT }}>Interview Rounds (in order)</Typography>
            <Button size="small" onClick={addRow}
              sx={{ textTransform:'none', fontWeight:700, borderRadius:'9px',
                color:B.pine, border:`1px dashed ${B.sage}`, px:1.5,
                fontFamily:FONT, '&:hover':{ bgcolor:B.sageSoft } }}>
              ＋ Add Round
            </Button>
          </Stack>

          <Stack spacing={1.5}>
            {rows.map((r, i) => {
              const live = r.id ? liveCount(r.id) : 0;
              return (
                <Box key={r.key} sx={{ border:`1px solid ${B.border}`,
                  borderRadius:'14px', p:{ xs:1.5, sm:2 }, bgcolor:B.surface }}>
                  <Stack direction="row" spacing={1.25}
                    sx={{ alignItems:'flex-start' }}>
                    <Box sx={{ width:30, height:30, borderRadius:'50%',
                      bgcolor:B.pine, color:'#fff', display:'flex',
                      alignItems:'center', justifyContent:'center',
                      fontWeight:800, fontSize:'0.85rem', fontFamily:FONT,
                      flexShrink:0, mt:0.5 }}>{i + 1}</Box>
                    <Box sx={{ flex:1, minWidth:0 }}>
                      <Box sx={{ display:'grid', gap:1.25,
                        gridTemplateColumns:{ xs:'1fr', sm:'1.2fr 1fr' } }}>
                        <TextField select size="small" label="Round Type"
                          value={r.round_type}
                          onChange={(e) => patchRow(i, 'round_type', e.target.value)}>
                          {RTYPE_OPTS.map((o) => (
                            <MenuItem key={o.v} value={o.v}>
                              <Box>
                                <Typography sx={{ fontSize:'0.84rem',
                                  fontWeight:700, fontFamily:FONT }}>
                                  {o.icon} {o.label}
                                </Typography>
                                <Typography sx={{ fontSize:'0.68rem',
                                  color:B.faint, fontFamily:FONT }}>
                                  {o.desc}
                                </Typography>
                              </Box>
                            </MenuItem>
                          ))}
                        </TextField>
                        <TextField size="small" label="Round Name"
                          value={r.name}
                          onChange={(e) => patchRow(i, 'name', e.target.value)}
                          placeholder="e.g. AI Technical Interview" />
                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                          <DateTimePicker label="Attempt window start" ampm
                            disabled={r.round_type === 'live-video'}
                            value={r.window_start ? new Date(r.window_start) : null}
                            onChange={(d) => patchRow(i, 'window_start',
                              d instanceof Date && !isNaN(d)
                                ? new Date(d.getTime() - d.getTimezoneOffset() * 60000)
                                    .toISOString().slice(0, 16)
                                : '')}
                            format="dd MMM yyyy, hh:mm a"
                            slotProps={{ textField:{ size:'small',
                              helperText: r.round_type === 'live-video'
                                ? 'Live rounds use slot booking'
                                : (_fmt12(r.window_start)
                                   || 'Pick a date & time — displays as AM/PM') } }} />
                          <DateTimePicker label="Attempt window end" ampm
                            disabled={r.round_type === 'live-video'}
                            value={r.window_end ? new Date(r.window_end) : null}
                            onChange={(d) => patchRow(i, 'window_end',
                              d instanceof Date && !isNaN(d)
                                ? new Date(d.getTime() - d.getTimezoneOffset() * 60000)
                                    .toISOString().slice(0, 16)
                                : '')}
                            format="dd MMM yyyy, hh:mm a"
                            slotProps={{ textField:{ size:'small',
                              helperText: r.round_type === 'live-video'
                                ? undefined
                                : (_fmt12(r.window_end)
                                   || 'Pick a date & time — displays as AM/PM') } }} />
                        </LocalizationProvider>
                      </Box>
                      {r.round_type === 'ai-powered' && (
                        <Box sx={{ mt:1.25, display:'flex', alignItems:'center',
                          gap:1, flexWrap:'wrap' }}>
                          <Typography sx={{ fontSize:'0.72rem', fontWeight:800,
                            color:B.faint, textTransform:'uppercase',
                            letterSpacing:'0.05em', mr:0.5, fontFamily:FONT }}>
                            Interview format
                          </Typography>
                          {[
                            { v:'standard',  icon:'💼', label:'Standard',
                              hint:'Full-length professional interview' },
                            { v:'on_campus', icon:'🎓', label:'Campus Placement',
                              hint:'Shorter, fresher-focused format (~25 min)' },
                          ].map((opt) => {
                            const on = r.interview_mode === opt.v;
                            return (
                              <Tooltip key={opt.v} title={opt.hint} arrow>
                                <Box role="button" tabIndex={0}
                                  onClick={() => patchRow(i, 'interview_mode', opt.v)}
                                  sx={{ cursor:'pointer', userSelect:'none',
                                    px:1.4, py:0.55, borderRadius:'999px',
                                    fontSize:'0.75rem', fontWeight:700,
                                    fontFamily:FONT, display:'inline-flex',
                                    alignItems:'center', gap:0.5,
                                    transition:'all 0.15s ease',
                                    ...(on
                                      ? (opt.v === 'on_campus'
                                          ? { bgcolor:B.amberSoft, color:B.amber,
                                              border:`1.5px solid ${B.amber}` }
                                          : { bgcolor:B.sageSoft, color:B.pine,
                                              border:`1.5px solid ${B.sage}` })
                                      : { bgcolor:B.surface, color:B.muted,
                                          border:`1px solid ${B.borderS}` }),
                                    '&:hover': on ? {}
                                      : { bgcolor:B.bg, borderColor:B.sage } }}>
                                  <Box component="span" sx={{ fontSize:14, lineHeight:1 }}>
                                    {opt.icon}
                                  </Box>
                                  {opt.label}
                                </Box>
                              </Tooltip>
                            );
                          })}
                        </Box>
                      )}
                      {r.round_type === 'live-video' && (
                        <IAEMLiveRoundBanner roundName={r.name} />
                      )}
                                            {r.round_type === 'document' && r.id && (
                        <RoundDocumentEditor roundConfigId={r.id}
                          roundName={r.name} duration={r.duration}
                          seed={r._docSeed}
                          onFileChange={(f) => patchRow(i, '_docFile', f)} />
                      )}
                  
                      {r.round_type === 'document' && !r.id && (
                        <Box sx={{ mt:1.25, p:1.25, borderRadius:'11px', bgcolor:B.bg,
                          border:`1px dashed ${B.borderS}` }}>
                          <Typography sx={{ fontSize:'0.72rem', fontWeight:800, color:B.ink,
                            fontFamily:FONT, mb:0.75 }}>
                            📄 Question document for this round
                          </Typography>
                          <Stack direction={{ xs:'column', sm:'row' }} spacing={1}
                            sx={{ alignItems:{ sm:'center' } }}>
                            <Button component="label" size="small" variant="outlined"
                              sx={{ textTransform:'none', fontWeight:700, borderRadius:'9px',
                                color:B.pine, borderColor:B.borderS, fontFamily:FONT,
                                fontSize:'0.72rem', maxWidth:{ sm:260 },
                                '&:hover':{ bgcolor:B.sageSoft, borderColor:B.sage } }}>
                              {r._docFile ? `📎 ${r._docFile.name}`
                                          : 'Choose file (PDF/DOC/DOCX/TXT)'}
                              <input hidden type="file" accept=".pdf,.doc,.docx,.txt"
                                onChange={(e) => patchRow(i, '_docFile',
                                  e.target.files?.[0] || null)} />
                            </Button>
                            <TextField size="small" type="number" label="Questions per candidate"
                              value={r._docQpc ?? 10}
                              onChange={(e) => patchRow(i, '_docQpc', e.target.value)}
                              slotProps={{ htmlInput:{ min:1, max:50 } }}
                              helperText="How many questions each candidate sees"
                              sx={{ width:{ xs:'100%', sm:200 } }} />
                            <TextField size="small" type="number" label="Duration (mins)"
                              value={r.duration ?? 60}
                              onChange={(e) => patchRow(i, 'duration', e.target.value)}
                              slotProps={{ htmlInput:{ min:10, max:180, step:5 } }}
                              helperText="Time allowed to complete"
                              sx={{ width:{ xs:'100%', sm:160 } }} />
                          </Stack>
                          {r._docFile && (
                            <Button size="small"
                              onClick={() => patchRow(i, '_docFile', null)}
                              sx={{ mt:0.5, textTransform:'none', fontSize:'0.7rem',
                                color:B.danger, fontFamily:FONT }}>
                              ✕ Remove file
                            </Button>
                          )}
                          <Typography sx={{ mt:0.75, fontSize:'0.68rem',
                            color: r._docFile ? B.faint : B.amber,
                            fontWeight:700, fontFamily:FONT }}>
                            {r._docFile
                              ? 'Uploaded automatically when you press Save Changes.'
                              : '⚠ Without a question document this round cannot start for candidates.'}
                          </Typography>
                        </Box>
                      )}
                      {r.id && live > 0 && (
                        <Typography sx={{ mt:1, fontSize:'0.7rem', color:B.amber,
                          fontWeight:700, fontFamily:FONT }}>
                          ⚠ {live} candidate{live === 1 ? ' is' : 's are'} currently in this round.
                          If you remove it, {live === 1 ? 'they' : 'they'}'ll still finish this
                          round as planned — but new candidates won't see this round anymore.
                        </Typography>
                      )}
                                        </Box>
                                        <Stack spacing={0.5} sx={{ flexShrink:0, alignItems:'flex-end' }}>
                      
                      {r.round_type === 'aptitude' && !r.id && (
                        <>
                          {/* Sub-type picker — mandatory before Build button appears */}
                          <Stack direction="row" spacing={0.5}
                            sx={{ alignItems:'center' }}>
                            <Tooltip title="Test built by AI from the job description"
                              arrow>
                              <Box role="button" tabIndex={0}
                                onClick={() => {
                                  patchRow(i, 'assessment_kind', 'ai');
                                  // Auto-suffix name (parity with Create-Pipeline)
                                  const _n = String(r.name || '').trim();
                                  if (!_n
                                      || _n.includes('Manually Uploaded Test')
                                      || _n === `Round ${i + 1}`) {
                                                                        patchRow(i, 'name',
                                      `Round ${i + 1} — AI-Generated Test`);
                                  }
                                  if (!r.assessment_id) setKindNudge({ idx:i, kind:'ai' });
                                }}
                                sx={{ cursor:'pointer', userSelect:'none',
                                  px:1, py:0.4, borderRadius:'8px',
                                  fontSize:'0.68rem', fontWeight:700,
                                  fontFamily:FONT, display:'inline-flex',
                                  alignItems:'center', gap:0.4,
                                  whiteSpace:'nowrap',
                                  ...(r.assessment_kind === 'ai'
                                    ? { bgcolor:B.sageSoft, color:B.pine,
                                        border:`1.5px solid ${B.sage}` }
                                    : { bgcolor:B.surface, color:B.muted,
                                        border:`1px solid ${B.borderS}` }),
                                  '&:hover':{ borderColor:B.sage } }}>
                                <AutoAwesome sx={{ fontSize:12 }} /> AI
                              </Box>
                            </Tooltip>
                            <Tooltip title="Upload your own test paper" arrow>
                              <Box role="button" tabIndex={0}
                                onClick={() => {
                                  patchRow(i, 'assessment_kind', 'manual');
                                  const _n = String(r.name || '').trim();
                                  if (!_n
                                      || _n.includes('AI-Generated Test')
                                      || _n === `Round ${i + 1}`) {
                                                                        patchRow(i, 'name',
                                      `Round ${i + 1} — Manually Uploaded Test`);
                                  }
                                  if (!r.assessment_id) setKindNudge({ idx:i, kind:'manual' });
                                }}
                                sx={{ cursor:'pointer', userSelect:'none',
                                  px:1, py:0.4, borderRadius:'8px',
                                  fontSize:'0.68rem', fontWeight:700,
                                  fontFamily:FONT, display:'inline-flex',
                                  alignItems:'center', gap:0.4,
                                  whiteSpace:'nowrap',
                                  ...(r.assessment_kind === 'manual'
                                    ? { bgcolor:'#F7EFE6', color:'#C08A5B',
                                        border:`1.5px solid #E8D3B8` }
                                    : { bgcolor:B.surface, color:B.muted,
                                        border:`1px solid ${B.borderS}` }),
                                  '&:hover':{ borderColor:'#C08A5B' } }}>
                                <EditNote sx={{ fontSize:12 }} /> Manual
                              </Box>
                            </Tooltip>
                          </Stack>

                          {/* Build button — appears once a sub-type is picked */}
                          {r.assessment_kind && (
                            <Tooltip title={r.assessment_id
                              ? 'Paper attached — click to edit or replace'
                              : (r.assessment_kind === 'ai'
                                  ? 'Open AI Assessment Builder'
                                  : 'Open Manual Test Builder')} arrow>
                              <Button size="small" variant="outlined"
                                startIcon={r.assessment_kind === 'ai'
                                  ? <AutoAwesome sx={{ fontSize:14 }} />
                                  : <EditNote sx={{ fontSize:14 }} />}
                                onClick={() => {
                                  setBuilderRoundIdx(i);
                                  if (r.assessment_kind === 'ai') setAiBuilderOpen(true);
                                  else                             setTestBuilderOpen(true);
                                }}
                                sx={{ textTransform:'none', fontSize:'0.7rem',
                                  fontWeight:700, borderRadius:'8px', px:1,
                                  py:0.3, minHeight:26, whiteSpace:'nowrap',
                                  bgcolor: r.assessment_id ? '#EDF3EC' : '#F7EFE6',
                                  color:   r.assessment_id ? '#24433E' : '#C08A5B',
                                  borderColor: r.assessment_id ? '#C7D9C5' : '#E8D3B8',
                                  fontFamily:FONT,
                                  '&:hover':{
                                    bgcolor: r.assessment_id ? '#D7E4D5' : '#EDDCC7',
                                    borderColor: r.assessment_id ? '#022124' : '#C08A5B',
                                  } }}>
                                {r.assessment_id
                                  ? (r.assessment_kind === 'ai' ? '✓ Edit with AI' : '✓ Edit test')
                                  : (r.assessment_kind === 'ai' ? 'Build with AI' : 'Build test')}
                              </Button>
                            </Tooltip>
                          )}
                        </>
                      )}
                      <Stack direction="row" spacing={0.25}>
                        <IconButton size="small" disabled={i === 0}
                          onClick={() => move(i, -1)}
                          sx={{ color:B.muted }}>▲</IconButton>
                        <IconButton size="small" disabled={i === rows.length - 1}
                          onClick={() => move(i, 1)}
                          sx={{ color:B.muted }}>▼</IconButton>
                        <IconButton size="small" onClick={() => removeRow(i)}
                          sx={{ color:B.danger }}>✕</IconButton>
                      </Stack>
                    </Stack>
                  </Stack>
                </Box>
              );
            })}
          </Stack>

          <Alert severity="info" icon={false}
            sx={{ mt:2, borderRadius:'11px', bgcolor:B.sageSoft,
              color:B.sageText, fontSize:'0.76rem', fontFamily:FONT,
              border:`1px dashed ${B.sage}` }}>
            Window changes apply only to interviews that haven't been attempted
            yet (scheduled / invited / locked…). Completed and in-progress
            attempts are never modified.
          </Alert>
        </>
        )}
      </DialogContent>
            <DialogActions sx={{ px:3, pb:2.5 }}>
        <Button onClick={onClose} disabled={saving}
          sx={{ textTransform:'none', color:B.muted, fontFamily:FONT }}>
          Cancel
        </Button>
        <Button variant="contained" disableElevation onClick={save}
          disabled={saving || loading}
          startIcon={saving ? <CircularProgress size={14} sx={{ color:'#fff' }} /> : null}
          sx={{ bgcolor:B.pine, '&:hover':{ bgcolor:B.pineHover },
            textTransform:'none', fontWeight:700, borderRadius:'10px',
            px:2.5, fontFamily:FONT }}>
          {saving ? 'Saving…' : 'Save Changes'}
        </Button>
      </DialogActions>

      {/* ══════════════════════════════════════════════════════════════════
          BUILD: 2026-08-19-edit-pipeline-test-builder-v1
          Test-builder dialogs — parity with the Create-Pipeline wizard
          (Interviews.jsx lines ~3455 & ~3470). Rendered at zIndex 1400
          so they float above this dialog (default MUI zIndex 1300).
      ══════════════════════════════════════════════════════════════════ */}
      <Dialog open={testBuilderOpen} fullScreen sx={{ zIndex:1400 }}>
        <AssessmentBuilder
          open={testBuilderOpen}
          job={_jobCtx}
          companyId={_companyId}
          onClose={() => setTestBuilderOpen(false)}
          onComplete={(newAssessmentId) => {
            if (newAssessmentId != null && builderRoundIdx != null) {
              patchRow(builderRoundIdx, 'assessment_id', Number(newAssessmentId));
              enqueueSnackbar('✓ Test paper attached to this round.',
                { variant:'success', autoHideDuration:3500 });
            }
          }} />
      </Dialog>

      <Dialog open={aiBuilderOpen} fullScreen sx={{ zIndex:1400 }}>
        <AIAssessmentBuilder
          embedded
          open={aiBuilderOpen}
          job={_jobCtx}
          companyId={_companyId}
          onClose={() => setAiBuilderOpen(false)}
          onComplete={(newAssessmentId) => {
            if (newAssessmentId != null && builderRoundIdx != null) {
              patchRow(builderRoundIdx, 'assessment_id', Number(newAssessmentId));
              enqueueSnackbar('✓ AI-generated test attached to this round.',
                { variant:'success', autoHideDuration:3500 });
            }
          }} />
      </Dialog>

      <Dialog open={!!kindNudge}
        onClose={() => setKindNudge(null)}
        maxWidth="xs" fullWidth
        slotProps={{ paper:{ sx:{ borderRadius:'16px', border:`1px solid ${B.border}`,
          overflow:'hidden' } } }}
        sx={{ zIndex:1500 }}>
        {kindNudge && (() => {
          const _isAI = kindNudge.kind === 'ai';
          return (
            <Box>
              <Box sx={{ textAlign:'center', pt:3, pb:1, px:3 }}>
                <Box sx={{ position:'relative', display:'inline-block', mb:1.5 }}>
                  <Box sx={{ width:52, height:52, borderRadius:'50%',
                    bgcolor:'#FFFFFF',
                    border:`1.5px solid ${_isAI ? B.sage : '#E8D3B8'}`,
                    display:'inline-flex', alignItems:'center', justifyContent:'center',
                    boxShadow: _isAI
                      ? '0 8px 20px rgba(127,158,126,0.20)'
                      : '0 8px 20px rgba(192,138,91,0.18)' }}>
                    {_isAI
                      ? <AutoAwesome sx={{ fontSize:26, color:B.sage }} />
                      : <EditNote sx={{ fontSize:26, color:'#C08A5B' }} />}
                  </Box>
                </Box>
                <Typography sx={{ fontFamily:FONT, fontSize:'17px', fontWeight:700,
                  color:B.ink, mb:0.5 }}>
                  {_isAI ? 'AI-Generated Test selected' : 'Manual Test selected'}
                </Typography>
                <Typography sx={{ fontSize:'13px', color:B.muted, lineHeight:1.55,
                  fontFamily:FONT, maxWidth:320, mx:'auto' }}>
                  {_isAI
                    ? 'Build your test paper using AI before saving. Without a question paper, candidates will see an empty assessment.'
                    : 'Upload or create your test paper before saving. Without a question paper, candidates will see an empty assessment.'}
                </Typography>
              </Box>
              <Box sx={{ px:3, pt:1.5, pb:2.5 }}>
                <Button fullWidth variant="contained"
                  startIcon={_isAI
                    ? <AutoAwesome sx={{ fontSize:16 }} />
                    : <EditNote sx={{ fontSize:16 }} />}
                  onClick={() => {
                    const _idx = kindNudge.idx;
                    setKindNudge(null);
                    setBuilderRoundIdx(_idx);
                    if (_isAI) setAiBuilderOpen(true);
                    else       setTestBuilderOpen(true);
                  }}
                  sx={{ textTransform:'none', fontSize:'13px', fontWeight:700,
                    borderRadius:'10px', py:1.1, mb:1,
                    bgcolor: _isAI ? B.sage : '#C08A5B', color:'#FFFFFF',
                    boxShadow: _isAI
                      ? '0 3px 10px rgba(127,158,126,0.28)'
                      : '0 3px 10px rgba(192,138,91,0.25)',
                    fontFamily:FONT,
                    '&:hover':{ bgcolor: _isAI ? B.pine : '#A87548',
                      boxShadow: _isAI
                        ? '0 4px 14px rgba(127,158,126,0.35)'
                        : '0 4px 14px rgba(192,138,91,0.32)' } }}>
                  {_isAI ? 'Build with AI now' : 'Build test now'}
                </Button>
                <Button fullWidth
                  onClick={() => setKindNudge(null)}
                  sx={{ textTransform:'none', fontSize:'12.5px', fontWeight:600,
                    borderRadius:'10px', py:0.9, color:B.muted,
                    border:`1px solid ${B.border}`, bgcolor:'#FFFFFF',
                    fontFamily:FONT,
                    '&:hover':{ bgcolor:B.bg, color:B.ink, borderColor:B.borderS } }}>
                  I'll do it later
                </Button>
              </Box>
            </Box>
          );
        })()}
      </Dialog>

      {/* Missing-paper soft-block modal — compact copy of the
          "Let's build your test first" prompt in Interviews.jsx. */}
      <Dialog open={!!missingPaperWarn}
        onClose={() => setMissingPaperWarn(null)}
        maxWidth="xs" fullWidth
        slotProps={{ paper:{ sx:{ borderRadius:'16px', border:`1px solid ${B.border}`,
          overflow:'hidden' } } }}
        sx={{ zIndex:1500 }}>
        {missingPaperWarn && (() => {
          const _first = missingPaperWarn.rounds[0] || {};
          const _multi = missingPaperWarn.rounds.length > 1;
          const _kind  = _first.isAI ? 'AI-Generated Test' : 'Manually Uploaded Test';
          return (
            <Box>
              <Box sx={{ textAlign:'center', pt:3, pb:1.5, px:3 }}>
                <Box sx={{ position:'relative', display:'inline-block', mb:1.5 }}>
                  <Box sx={{ width:56, height:56, borderRadius:'50%',
                    bgcolor:'#FFFFFF', border:`1.5px solid ${B.sage}`,
                    display:'inline-flex', alignItems:'center', justifyContent:'center',
                    boxShadow:'0 8px 20px rgba(127,158,126,0.20)' }}>
                    <Assignment sx={{ fontSize:28, color:B.sage }} />
                  </Box>
                  <Box sx={{ position:'absolute', top:-4, right:-4, width:22, height:22,
                    borderRadius:'50%', bgcolor:B.amber, border:'2px solid #FFFFFF',
                    display:'inline-flex', alignItems:'center', justifyContent:'center',
                    fontFamily:FONT, fontSize:'11px', fontWeight:800, color:'#FFFFFF' }}>!</Box>
                </Box>
                <Typography sx={{ fontFamily:FONT, fontSize:'18px', fontWeight:700,
                  color:B.ink, mb:0.75 }}>
                  Let's build your test first
                </Typography>
                <Typography sx={{ fontSize:'13px', color:B.muted, lineHeight:1.55,
                  fontFamily:FONT, maxWidth:320, mx:'auto' }}>
                  {_multi ? (
                    <>Your{' '}
                      <Box component="span" sx={{ fontWeight:700, color:B.ink }}>
                        {missingPaperWarn.rounds.length} Assessment rounds
                      </Box>{' '}need a paper. Without one, candidates see an empty assessment.</>
                  ) : (
                    <>Your{' '}
                      <Box component="span" sx={{ fontWeight:700, color:B.ink }}>{_kind}</Box>{' '}
                      round needs a paper. Without one, candidates see an empty assessment.</>
                  )}
                </Typography>
              </Box>
              <Box sx={{ px:3, pt:1, pb:2.5 }}>
                <Box sx={{ display:'flex', alignItems:'center', justifyContent:'center',
                  gap:1, mb:2 }}>
                  <Box sx={{ px:1.4, py:0.5, borderRadius:'14px',
                    bgcolor:B.sageSoft, color:B.sageText, border:`1px solid ${B.sage}`,
                    fontFamily:FONT, fontSize:'11.5px', fontWeight:600 }}>Build</Box>
                  <Box sx={{ color:B.faint, fontSize:'13px' }}>→</Box>
                  <Box sx={{ px:1.4, py:0.5, borderRadius:'14px',
                    bgcolor:B.bg, color:B.muted, border:`1px solid ${B.border}`,
                    fontFamily:FONT, fontSize:'11.5px', fontWeight:600 }}>Publish</Box>
                  <Box sx={{ color:B.faint, fontSize:'13px' }}>→</Box>
                  <Box sx={{ px:1.4, py:0.5, borderRadius:'14px',
                    bgcolor:B.bg, color:B.muted, border:`1px solid ${B.border}`,
                    fontFamily:FONT, fontSize:'11.5px', fontWeight:600 }}>Back here</Box>
                </Box>
                <Box sx={{ display:'flex', gap:1 }}>
                  <Button fullWidth
                    onClick={() => {
                      setMissingPaperWarn(null);
                      enqueueSnackbar(
                        '⚠️ No test paper attached yet. Use "Build test" or "Build with AI" on the round before saving.',
                        { variant:'warning', autoHideDuration:6500 });
                    }}
                    sx={{ textTransform:'none', fontSize:'13px', fontWeight:600,
                      borderRadius:'10px', py:1.1, color:B.muted,
                      border:`1px solid ${B.border}`, bgcolor:'#FFFFFF',
                      fontFamily:FONT,
                      '&:hover':{ bgcolor:B.bg, color:B.ink, borderColor:B.borderS } }}>
                    Cancel
                  </Button>
                  <Button fullWidth variant="contained"
                    startIcon={_first.isAI
                      ? <AutoAwesome sx={{ fontSize:16 }} />
                      : <EditNote sx={{ fontSize:16 }} />}
                    onClick={() => {
                      const _idx = _first.idx;
                      setBuilderRoundIdx(_idx);
                      setMissingPaperWarn(null);
                      if (_first.isAI) setAiBuilderOpen(true);
                      else             setTestBuilderOpen(true);
                    }}
                    sx={{ textTransform:'none', fontSize:'13px', fontWeight:700,
                      borderRadius:'10px', py:1.1, bgcolor:B.sage, color:'#FFFFFF',
                      boxShadow:'0 3px 10px rgba(127,158,126,0.28)', fontFamily:FONT,
                      '&:hover':{ bgcolor:B.pine,
                        boxShadow:'0 4px 14px rgba(127,158,126,0.35)' } }}>
                    Open test builder
                  </Button>
                </Box>
              </Box>
            </Box>
          );
        })()}
      </Dialog>
    </Dialog>
  );
}

/* ═══════════ candidate profile dialog (click on the name) ═════════════ */
function CandidateProfileDialog({ m, rounds, removedRoundsList, onClose,
                                  onViewReport, onViewPreview, scoreCache = {} }) {
  const [resume, setResume] = useState(null);        // { url, type } | 'loading' | 'error'
  useEffect(() => () => {
    if (resume && resume.url) URL.revokeObjectURL(resume.url);
  }, [resume]);
  if (!m) return null;

  const openResume = async () => {
    setResume('loading');
    try {
      const r = await rankedResultsService.getResumeBlobUrl(m.candidate_id);
      setResume(r);
    } catch { setResume('error'); }
  };

  const _slot = (rc) =>
    (typeof rc.original_number === 'number' && rc.original_number > 0)
      ? rc.original_number
      : (typeof rc.round_number === 'number' ? rc.round_number : Number.MAX_SAFE_INTEGER);
  const _entries = [];
  rounds.forEach((rc) => {
    const cell = (m.rounds || {})[String(rc.id)] || (m.rounds || {})[rc.id];
    if (cell) _entries.push({ rc, cell, removed: false });
  });
  removedRoundsList.forEach((rc) => {
    const cell = (m.removed_rounds || {})[String(rc.id)]
              || (m.removed_rounds || {})[rc.id];
    if (cell) _entries.push({ rc, cell, removed: true });
  });
  const journey = _entries
    .sort((a, b) => _slot(a.rc) - _slot(b.rc))
    .map(({ rc, cell, removed }) => {
      const slot = _slot(rc);
      return {
        label: removed
          ? `R${slot} · ${rc.name} — CUT OFF`
          : `R${slot} · ${rc.name}`,
        cell,
        score: cell.score ?? scoreCache[`${m.candidate_id}:${slot}`] ?? null,
        removed,
      };
    });
  const stateOf = (c) =>
    c.status === 'rejected' || c.decision === 'rejected' ? { t:'❌ Rejected', fg:B.danger, bg:B.dangerSoft }
    : c.decision === 'approved' ? { t:'➡ Approved', fg:B.blue, bg:B.blueSoft }
    : c.status === 'completed' ? { t:'⏳ Awaiting decision', fg:B.amber, bg:B.amberSoft }
    : { t:String(c.status || '—').replace(/_/g,' '), fg:B.sageText, bg:B.sageSoft };

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth
      slotProps={{ paper: { sx: { borderRadius:'16px', fontFamily:FONT } } }}>
      <Box sx={{ background:`linear-gradient(135deg, ${B.pine} 0%, #0A3F42 100%)`,
        px:3, py:2.25, display:'flex', alignItems:'center', gap:1.5 }}>
        {m.photo_url ? (
          <Box component="img" src={m.photo_url} alt={m.name}
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
            sx={{ width:46, height:46, borderRadius:'50%', objectFit:'cover',
              flexShrink:0, border:'2px solid rgba(255,255,255,0.35)' }} />
        ) : (
          <Box sx={{ width:46, height:46, borderRadius:'50%', bgcolor:B.sage,
            color:'#fff', display:'flex', alignItems:'center',
            justifyContent:'center', fontWeight:800, fontSize:'1.05rem',
            fontFamily:FONT, flexShrink:0 }}>
            {(m.name || '?').trim().charAt(0).toUpperCase()}
          </Box>
        )}
        <Box sx={{ minWidth:0 }}>
          <Typography noWrap sx={{ color:'#fff', fontWeight:800,
            fontSize:'1rem', fontFamily:FONT }}>{m.name}</Typography>
          <Typography noWrap sx={{ color:'#93C5AE', fontSize:'0.78rem',
            fontFamily:FONT }}>{m.email || 'email unavailable'}</Typography>
        </Box>
      </Box>
      <DialogContent sx={{ pt:2.25 }}>
        <Stack direction="row" spacing={1} sx={{ mb:2, flexWrap:'wrap', rowGap:1 }}>
          <Button size="small" variant="outlined"
            onClick={openResume}
            sx={{ textTransform:'none', fontWeight:700, fontSize:'0.76rem',
              borderRadius:'9px', color:B.pine, borderColor:B.borderS,
              fontFamily:FONT,
              '&:hover':{ bgcolor:B.sageSoft, borderColor:B.sage } }}>
            📎 View Resume
          </Button>
          {onViewPreview && (
            <Button size="small" variant="contained" disableElevation
              onClick={() => { onClose(); onViewPreview(m); }}
              sx={{ textTransform:'none', fontWeight:800, fontSize:'0.76rem',
                borderRadius:'9px', bgcolor:B.pine, color:'#fff', fontFamily:FONT,
                '&:hover':{ bgcolor:B.pineHover } }}>
              👁 Preview Report
            </Button>
          )}
        </Stack>

        {/* ── In-dialog resume PREVIEW (no download, no new tab) ── */}
        {resume === 'loading' && (
          <Box sx={{ textAlign:'center', py:2 }}>
            <CircularProgress size={20} sx={{ color:B.sage }} />
          </Box>
        )}
        {resume === 'error' && (
          <Alert severity="warning" sx={{ mb:2, borderRadius:'11px',
            fontSize:'0.78rem', fontFamily:FONT }}>
            Could not load this candidate's resume.
          </Alert>
        )}
        {resume && resume.url && (
          <Box sx={{ mb:2, border:`1px solid ${B.border}`, borderRadius:'12px',
            overflow:'hidden' }}>
            <Stack direction="row" sx={{ px:1.25, py:0.6,
              justifyContent:'space-between', alignItems:'center',
              bgcolor:B.bg }}>
              <Typography sx={{ fontSize:'0.72rem', fontWeight:800,
                color:B.muted, fontFamily:FONT }}>📎 RESUME PREVIEW</Typography>
              <Button size="small" onClick={() => setResume(null)}
                sx={{ textTransform:'none', fontSize:'0.7rem', minWidth:0,
                  color:B.muted, fontFamily:FONT }}>✕ close</Button>
            </Stack>
            <Box component="iframe" src={resume.url} title="Resume preview"
              sx={{ width:'100%', height:380, border:0, display:'block',
                bgcolor:'#fff' }} />
          </Box>
        )}

        <Typography sx={{ fontSize:'0.7rem', fontWeight:800, color:B.faint,
          textTransform:'uppercase', letterSpacing:'0.05em', mb:1,
          fontFamily:FONT }}>Pipeline journey</Typography>
        <Stack spacing={0.75}>
          {journey.length === 0 && (
            <Typography sx={{ fontSize:'0.8rem', color:B.muted, fontFamily:FONT }}>
              No rounds entered yet.
            </Typography>
          )}
          {journey.map((j, i) => {
            const st = stateOf(j.cell);
            return (
              <Stack key={i} direction="row" spacing={1}
                sx={{ alignItems:'center', p:1, border:`1px solid ${B.border}`,
                  borderRadius:'10px',
                  borderStyle: j.removed ? 'dashed' : 'solid' }}>
                <Typography sx={{ flex:1, minWidth:0, fontSize:'0.8rem',
                  fontWeight:700, color:B.ink, fontFamily:FONT }} noWrap>
                  {j.label}
                </Typography>
                {j.score != null && (
                  <Typography sx={{ fontSize:'0.78rem', fontWeight:800,
                    color:B.done, fontFamily:FONT }}>{j.score}/10</Typography>
                )}
                <Box sx={{ px:0.85, py:0.3, borderRadius:'6px', bgcolor:st.bg,
                  color:st.fg, fontSize:'0.6rem', fontWeight:800,
                  textTransform:'uppercase', fontFamily:FONT,
                  whiteSpace:'nowrap' }}>{st.t}</Box>
              </Stack>
            );
          })}
        </Stack>

        {m.in_hire_pool && (() => {
          // Check if any cell has pool_type='pool_hired'
          const anyHired = Object.values(m.rounds || {}).some(c => c?.pool_type === 'pool_hired');
          return (
            <Alert severity="success" icon={false}
              sx={{ mt:2, borderRadius:'11px',
                bgcolor: anyHired ? B.doneSoft : B.goldSoft,
                color:   anyHired ? B.done     : B.gold,
                fontWeight:700, fontSize:'0.8rem', fontFamily:FONT }}>
              {anyHired ? '✅ Hired' : '📋 Moved to Pending Candidates'}
            </Alert>
          );
        })()}
      </DialogContent>
      <DialogActions sx={{ px:3, pb:2 }}>
        <Button onClick={onClose} variant="contained" disableElevation
          sx={{ bgcolor:B.pine, '&:hover':{ bgcolor:B.pineHover },
            textTransform:'none', fontWeight:700, borderRadius:'10px',
            fontFamily:FONT }}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

function buildPrintableReportHtml({ candidate, roundLabel, data }) {
  const esc = (v) => String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const rs = data?.round_status || null;
  const _rt = data?.round_type || '';
  const _okFor = (...types) => !_rt || types.includes(_rt);
  const ai = (_okFor('ai-powered', 'aptitude') && data?.ai_scores) || null;
  const catsObj = _okFor('ai-powered', 'aptitude') ? data?.category_breakdown : null;
  const cats = catsObj && typeof catsObj === 'object' && !Array.isArray(catsObj)
    ? Object.entries(catsObj).map(([category, avg]) => ({ category, avg }))
    : [];
  const live = (_okFor('live-video') && data?.live_result) || null;
  const apt  = (_okFor('aptitude') && data?.aptitude_result) || null;
  const doc  = (_okFor('document') && data?.document_result) || null;
  const composite = rs?.cgps_score ?? ai?.overall ?? live?.overall_score
    ?? apt?.score_010 ?? doc?.avg_score ?? null;

  const bar = (label, value, max = 10) => {
    const pct = Math.max(0, Math.min(100, ((value || 0) / (max || 1)) * 100));
    const col = pct >= 70 ? '#3E6E3E' : pct >= 50 ? '#A35A2D' : '#A63D2F';
    return `<div class="bar-row"><div class="bar-head"><span>${esc(label)}</span>
      <b>${esc(value)}${max === 10 ? '/10' : ` / ${esc(max)}`}</b></div>
      <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${col}"></div></div></div>`;
  };
  const section = (title, inner) => inner
    ? `<div class="sec"><div class="sec-title">${esc(title)}</div>${inner}</div>` : '';

  let body = '';
  if (ai) {
    body += section('AI interview sub-scores',
      Object.entries(ai)
        .filter(([k, v]) => typeof v === 'number' && !['overall', 'test_id'].includes(k))
        .map(([k, v]) => bar(k.replace(/_/g, ' '), v)).join(''));
  }
  if (cats.length) {
    body += section('Per-category breakdown',
      cats.map((c) => bar(c.category, c.avg)).join(''));
  }
  if (doc) {
    body += section(`Document interview — ${doc.document_title || 'question paper'}`,
      `<p class="muted">${doc.answered_count}/${doc.questions_count} answered
        ${doc.avg_score != null ? ` · average ${doc.avg_score}/10` : ''}</p>`
      + (doc.questions || []).map((q) => `
        <div class="q">
          <div class="q-head"><b>Q${esc(q.order)}</b>
            <span>${q.ai_score != null ? `${esc(q.ai_score)}/10` : 'unscored'}
            ${q.time_secs ? ` · ${esc(q.time_secs)}s` : ''}</span></div>
          ${q.answer ? `<div class="q-a">${esc(q.answer)}</div>` : '<div class="q-a muted">No answer</div>'}
          ${q.ai_feedback ? `<div class="q-f">💬 ${esc(q.ai_feedback)}</div>` : ''}
        </div>`).join(''));
  }
  if (live) {
    body += section('Live interview result',
      Object.entries(live).filter(([, v]) => typeof v === 'number')
        .map(([k, v]) => bar(k.replace(/_/g, ' '), v)).join('')
      + ['recommendation', 'strengths', 'improvements', 'next_steps',
         'overall_feedback', 'key_insights', 'additional_notes']
        .map((k) => live[k]
          ? `<p><b>${esc(k.replace(/_/g, ' '))}:</b> ${esc(live[k])}</p>` : '')
        .join(''));
  }
  if (apt) {
    body += section('Assessment result',
      `<p><b>${esc(apt.marks_awarded)}</b> / ${esc(apt.total_marks)} marks ·
        ${esc(apt.percentage)}% · ${esc(apt.score_010)}/10</p>`
      + (apt.sections || []).map((sec) =>
          bar(sec.name, sec.marks_scored, sec.total_marks || 1)).join(''));
  }
  if (rs?.comment) {
    body += section('Employer note', `<p>“${esc(rs.comment)}”</p>`);
  }

  return `<!doctype html><html><head><meta charset="utf-8">
<title>Score Report — ${esc(candidate?.name)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Jost','DM Sans',Arial,sans-serif; color:#101210;
    margin:0; padding:32px; max-width:760px; margin-inline:auto;
    background:#FFFFFF; }
  .head { display:flex; justify-content:space-between; align-items:flex-start;
    border-bottom:3px solid #022124; padding-bottom:14px; margin-bottom:20px; }
  h1 { font-size:20px; margin:0 0 4px; color:#022124; }
  .muted { color:#7A7E76; font-size:12px; margin:2px 0; }
  .ring { width:84px; height:84px; border-radius:50%; border:5px solid #7F9E7E;
    display:flex; align-items:center; justify-content:center; font-size:24px;
    font-weight:800; color:#022124; flex-shrink:0; }
  .sec { margin:18px 0; }
  .sec-title { font-size:11px; font-weight:800; letter-spacing:0.06em;
    text-transform:uppercase; color:#55584F; border-bottom:1px solid #E7EAE3;
    padding-bottom:4px; margin-bottom:10px; }
  .bar-row { margin-bottom:9px; }
  .bar-head { display:flex; justify-content:space-between; font-size:12.5px;
    margin-bottom:3px; text-transform:capitalize; }
  .bar-track { height:7px; background:#F6F8F3; border-radius:99px; }
  .bar-fill { height:100%; border-radius:99px; }
  .q { border:1px solid #E7EAE3; border-radius:10px; padding:10px 12px;
    margin-bottom:8px; page-break-inside:avoid; }
  .q-head { display:flex; justify-content:space-between; font-size:12.5px;
    margin-bottom:4px; }
  .q-a { font-size:12px; color:#2F332E; white-space:pre-wrap; }
  .q-f { font-size:11.5px; color:#5E815D; margin-top:5px; }
  p { font-size:12.5px; margin:4px 0; }
  .foot { margin-top:26px; border-top:1px solid #E7EAE3; padding-top:8px;
    font-size:10.5px; color:#7A7E76; }
  @media print { body { padding:0; } }
</style></head><body>
  <div class="head">
    <div>
      <h1>Score Report — ${esc(candidate?.name)}</h1>
      <div class="muted">${esc(candidate?.email || '')}</div>
      <div class="muted">${esc(roundLabel)}</div>
      <div class="muted">Generated ${new Date().toLocaleString()}</div>
    </div>
    <div class="ring">${composite != null ? esc(composite) : '—'}</div>
  </div>
  ${body || '<p class="muted">No stored scores for this round.</p>'}
  <div class="foot">IEVALX Hiring Platform — confidential candidate report</div>
</body></html>`;
}

function openPrintableReport({ candidate, roundLabel, data }) {
  const html = buildPrintableReportHtml({ candidate, roundLabel, data });
  const frame = document.createElement('iframe');
  frame.style.cssText =
    'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
  frame.srcdoc = html;
  document.body.appendChild(frame);
  frame.onload = () => {
    try {
      frame.contentWindow.focus();
      frame.contentWindow.print();
    } finally {
      // Chrome needs the frame alive while the print dialog is open.
      setTimeout(() => frame.remove(), 60000);
    }
  };
  return true;
}

/* ═══════════════ score report dialog (📄 Report column) ═══════════════ */
function ScoreReportDialog({ report, onClose, onOpenPreview }) {
  const [manageScoresAssignmentId, setManageScoresAssignmentId] = useState(null);

  if (!report) return null;
  const { candidate, roundLabel, loading, data, error } = report;
  const rs   = data?.round_status || null;
  const _rt = data?.round_type || '';
  const _okFor = (...types) => !_rt || types.includes(_rt);
  const ai   = (_okFor('ai-powered', 'aptitude') && data?.ai_scores) || null;
  const catsObj = _okFor('ai-powered', 'aptitude') ? data?.category_breakdown : null;
  const cats = Array.isArray(catsObj)
    ? catsObj
    : catsObj && typeof catsObj === 'object'
      ? Object.entries(catsObj).map(([category, avg_score]) => ({ category, avg_score }))
      : [];
  const live = (_okFor('live-video') && data?.live_result) || null;
  const apt  = (_okFor('aptitude') && data?.aptitude_result) || null;
  const doc  = (_okFor('document') && data?.document_result) || null;
  const composite = rs?.cgps_score ?? ai?.overall ?? live?.overall_score
    ?? apt?.score_010 ?? doc?.avg_score ?? null;

  const numRows = (obj, skip = []) => Object.entries(obj || {})
    .filter(([k, v]) => typeof v === 'number' && !skip.includes(k))
    .map(([k, v]) => ({ label: k.replace(/^cgps_/, '').replace(/_/g, ' '), value: v }));

  const Bar = ({ label, value, max = 10 }) => (
    <Box sx={{ mb: 1 }}>
      <Stack direction="row" sx={{ justifyContent:'space-between', mb:0.3 }}>
        <Typography sx={{ fontSize:'0.74rem', fontWeight:700, color:B.body,
          fontFamily:FONT, textTransform:'capitalize' }}>{label}</Typography>
        <Typography sx={{ fontSize:'0.74rem', fontWeight:800, color:B.pine,
          fontFamily:FONT }}>{value}</Typography>
      </Stack>
      <Box sx={{ height:6, borderRadius:999, bgcolor:B.bg, overflow:'hidden' }}>
        <Box sx={{ height:'100%', borderRadius:999,
          width:`${Math.max(0, Math.min(100, (value / max) * 100))}%`,
          bgcolor: value >= max * 0.7 ? B.done : value >= max * 0.5 ? B.amber : B.danger }} />
      </Box>
    </Box>
  );

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth
      slotProps={{ paper: { sx: { borderRadius:'16px', fontFamily:FONT } } }}>
      <Box sx={{ background:`linear-gradient(135deg, ${B.pine} 0%, #0A3F42 100%)`,
        px:3, py:2 }}>
        <Typography sx={{ color:'#fff', fontWeight:800, fontSize:'1rem', fontFamily:FONT }}>
          📄 Score Report — {candidate?.name}
        </Typography>
        <Typography sx={{ color:'#93C5AE', fontSize:'0.78rem', fontFamily:FONT }}>
          {roundLabel}
        </Typography>
      </Box>
      <DialogContent sx={{ pt:2.5 }}>
        {loading ? (
          <Box sx={{ textAlign:'center', py:4 }}>
            <CircularProgress size={26} sx={{ color:B.sage }} />
            <Typography sx={{ mt:1.5, fontSize:'0.82rem', color:B.muted, fontFamily:FONT }}>
              Fetching the full breakdown…
            </Typography>
          </Box>
        ) : error ? (
          <Alert severity="warning" sx={{ borderRadius:'11px', fontFamily:FONT }}>
            {error}
          </Alert>
        ) : (
          <>
            {/* composite */}
            <Stack direction="row" spacing={2} sx={{ alignItems:'center', mb:2 }}>
              <Box sx={{ width:74, height:74, borderRadius:'50%', display:'flex',
                alignItems:'center', justifyContent:'center', flexShrink:0,
                bgcolor: composite == null ? B.bg
                       : composite >= 7 ? B.doneSoft
                       : composite >= 5 ? B.amberSoft : B.dangerSoft }}>
                <Typography sx={{ fontSize:'1.35rem', fontWeight:900, fontFamily:FONT,
                  color: composite == null ? B.faint
                       : composite >= 7 ? B.done
                       : composite >= 5 ? B.amber : B.danger }}>
                  {composite != null ? composite : '—'}
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize:'0.8rem', fontWeight:800, color:B.ink,
                  fontFamily:FONT }}>Composite CGPS (0–10)</Typography>
                {rs?.status && (
                  <Typography sx={{ fontSize:'0.76rem', color:B.muted, fontFamily:FONT,
                    textTransform:'capitalize' }}>
                    Round decision status: {String(rs.status).replace(/_/g,' ')}
                  </Typography>
                )}
                {rs?.comment && (
                  <Typography sx={{ fontSize:'0.74rem', color:B.faint, fontFamily:FONT,
                    fontStyle:'italic' }}>“{rs.comment}”</Typography>
                )}
              </Box>
            </Stack>

            {ai && numRows(ai, ['overall', 'test_id']).length > 0 && (
              <>
                <Typography sx={{ fontSize:'0.7rem', fontWeight:800, color:B.faint,
                  textTransform:'uppercase', letterSpacing:'0.05em', mb:1,
                  fontFamily:FONT }}>AI interview sub-scores</Typography>
                {numRows(ai, ['overall', 'test_id']).map((r) => (
                  <Bar key={r.label} label={r.label} value={r.value} />
                ))}
              </>
            )}

            {cats.length > 0 && (
              <>
                <Typography sx={{ fontSize:'0.7rem', fontWeight:800, color:B.faint,
                  textTransform:'uppercase', letterSpacing:'0.05em', my:1,
                  fontFamily:FONT }}>Per-category breakdown</Typography>
                {cats.map((c, i) => (
                  <Bar key={c.category || i}
                    label={c.category || `Category ${i + 1}`}
                    value={c.avg_score ?? c.average ?? c.score ?? 0} />
                ))}
              </>
            )}

            {live && (
              <>
                <Typography sx={{ fontSize:'0.7rem', fontWeight:800, color:B.faint,
                  textTransform:'uppercase', letterSpacing:'0.05em', my:1,
                  fontFamily:FONT }}>Live interview result</Typography>
                {numRows(live).map((r) => (
                  <Bar key={r.label} label={r.label} value={r.value} />
                ))}
                {live.feedback && (
                  <Typography sx={{ fontSize:'0.78rem', color:B.body, fontFamily:FONT }}>
                    “{live.feedback}”
                  </Typography>
                )}
              </>
            )}

            {apt && (
              <>
                <Typography sx={{ fontSize:'0.7rem', fontWeight:800, color:B.faint,
                  textTransform:'uppercase', letterSpacing:'0.05em', my:1,
                  fontFamily:FONT }}>Assessment result</Typography>
                <Typography sx={{ fontSize:'0.82rem', fontWeight:700, color:B.ink,
                  fontFamily:FONT, mb:1 }}>
                  {apt.marks_awarded} / {apt.total_marks} marks
                  {' '}· {apt.percentage}% · {apt.score_010}/10
                </Typography>
                {(apt.sections || []).map((sec) => (
                  <Bar key={sec.section_id} label={sec.name}
                    value={sec.marks_scored} max={sec.total_marks || 1} />
                ))}
              </>
            )}

            {doc && (
              <>
                <Typography sx={{ fontSize:'0.7rem', fontWeight:800, color:B.faint,
                  textTransform:'uppercase', letterSpacing:'0.05em', my:1,
                  fontFamily:FONT }}>
                  Document interview — {doc.document_title || 'question paper'}
                </Typography>
                <Typography sx={{ fontSize:'0.78rem', color:B.muted,
                  fontFamily:FONT, mb:1 }}>
                  {doc.answered_count}/{doc.questions_count} answered
                  {doc.avg_score != null && <> · average <b>{doc.avg_score}/10</b></>}
                </Typography>
                <Stack spacing={0.75} sx={{ maxHeight:220, overflowY:'auto',
                  pr:0.5 }}>
                  {(doc.questions || []).map((q) => (
                    <Box key={q.order} sx={{ border:`1px solid ${B.border}`,
                      borderRadius:'10px', p:1.1 }}>
                      <Stack direction="row"
                        sx={{ justifyContent:'space-between', mb:0.4 }}>
                        <Typography sx={{ fontSize:'0.76rem', fontWeight:800,
                          color:B.ink, fontFamily:FONT }}>Q{q.order}</Typography>
                        <Typography sx={{ fontSize:'0.74rem', fontWeight:800,
                          fontFamily:FONT,
                          color: q.ai_score == null ? B.faint
                               : q.ai_score >= 7 ? B.done
                               : q.ai_score >= 5 ? B.amber : B.danger }}>
                          {q.ai_score != null ? `${q.ai_score}/10` : 'unscored'}
                          {q.time_secs ? ` · ${q.time_secs}s` : ''}
                        </Typography>
                      </Stack>
                      {q.ai_feedback && (
                        <Typography sx={{ fontSize:'0.72rem', color:B.sageText,
                          fontFamily:FONT }}>💬 {q.ai_feedback}</Typography>
                      )}
                    </Box>
                  ))}
                </Stack>
              </>
            )}

            <Stack direction="row" spacing={1} sx={{ mt:2, flexWrap:'wrap',
              rowGap:1 }}>
              {onOpenPreview && (
                <Button size="small" variant="contained" disableElevation
                  onClick={() => onOpenPreview(candidate)}
                  sx={{ textTransform:'none', fontWeight:800, fontSize:'0.74rem',
                    borderRadius:'9px', bgcolor:B.pine, fontFamily:FONT,
                    '&:hover':{ bgcolor:B.pineHover } }}>
                  👁 Open Full Report Preview
                </Button>
              )}
              <Button size="small" variant="outlined"
                onClick={() => openPrintableReport({ candidate, roundLabel, data })}
                sx={{ textTransform:'none', fontWeight:700, fontSize:'0.74rem',
                  borderRadius:'9px', color:B.pine, borderColor:B.borderS,
                  fontFamily:FONT,
                  '&:hover':{ bgcolor:B.sageSoft, borderColor:B.sage } }}>
                🖨 Print / Save as PDF
              </Button>
            </Stack>

            {(apt?.assignment_id || ai?.test_id) && (
              <Stack direction="row" spacing={1} sx={{ mt:1, flexWrap:'wrap' }}>
                {apt?.assignment_id && (
                  <Button size="small" variant="outlined"
                    onClick={() => rankedResultsService.openReportPdf(apt.assignment_id)
                      .catch(() => {})}
                    sx={{ textTransform:'none', fontWeight:700, fontSize:'0.74rem',
                      borderRadius:'9px', color:B.pine, borderColor:B.borderS,
                      fontFamily:FONT,
                      '&:hover':{ bgcolor:B.sageSoft, borderColor:B.sage } }}>
                    ⬇ Assessment report PDF
                  </Button>
                )}
                {/* BUILD: 2026-08-12-OVERRIDE-AI-UI-v1 — opens override dialog */}
                {apt?.assignment_id && (
                  <Button size="small" variant="outlined"
                    onClick={() => setManageScoresAssignmentId(apt.assignment_id)}
                    sx={{ textTransform:'none', fontWeight:700, fontSize:'0.74rem',
                      borderRadius:'9px', color:B.amber, borderColor:B.amber,
                      fontFamily:FONT,
                      '&:hover':{ bgcolor:B.amberSoft, borderColor:B.amber } }}>
                    ✏ Manage AI Scores
                  </Button>
                )}
                {ai?.test_id && (
                  <Button size="small" variant="outlined"
                    onClick={() => rankedResultsService.openWeeklyPdf(ai.test_id)}
                    sx={{ textTransform:'none', fontWeight:700, fontSize:'0.74rem',
                      borderRadius:'9px', color:B.pine, borderColor:B.borderS,
                      fontFamily:FONT,
                      '&:hover':{ bgcolor:B.sageSoft, borderColor:B.sage } }}>
                    ⬇ Interview report PDF
                  </Button>
                )}
              </Stack>
            )}

            {!ai && cats.length === 0 && !live && !apt && !doc && composite == null && (
              <Alert severity="info" icon={false}
                sx={{ borderRadius:'11px', bgcolor:B.sageSoft, color:B.sageText,
                  fontSize:'0.8rem', fontFamily:FONT }}>
                No stored scores for this round yet — the attempt may still be
                scoring, or this round type does not produce a numeric score.
              </Alert>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px:3, pb:2 }}>
        <Button onClick={onClose} variant="contained" disableElevation
          sx={{ bgcolor:B.pine, '&:hover':{ bgcolor:B.pineHover },
            textTransform:'none', fontWeight:700, borderRadius:'10px',
            fontFamily:FONT }}>Close</Button>
      </DialogActions>

      {/* BUILD: 2026-08-12-OVERRIDE-AI-UI-v1 — nested override dialog */}
      <ManageScoresDialog
        assignmentId={manageScoresAssignmentId}
        onClose={() => setManageScoresAssignmentId(null)}
      />
    </Dialog>
  );
}

function ManageScoresDialog({ assignmentId, onClose }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [edits, setEdits] = useState({});   // { [response_id]: { score, reason } }
  const { enqueueSnackbar } = useSnackbar();

  const open = assignmentId != null;

  const load = React.useCallback(async () => {
    if (!open) return;
    setLoading(true);
    try {
      const data = await rankedResultsService.getResponseScores(assignmentId);
      setRows(Array.isArray(data?.responses) ? data.responses : []);
    } catch (err) {
      enqueueSnackbar(
        err?.response?.data?.Error || 'Could not load response list.',
        { variant: 'error' },
      );
    } finally {
      setLoading(false);
    }
  }, [open, assignmentId, enqueueSnackbar]);

  useEffect(() => {
    if (open) { load(); setEdits({}); }
  }, [open, load]);

  const handleFieldChange = (rid, field, value) => {
    setEdits((prev) => ({
      ...prev,
      [rid]: { ...(prev[rid] || {}), [field]: value },
    }));
  };

  const handleSave = async (row) => {
    const edit = edits[row.response_id] || {};
    const scoreStr = edit.score ?? row.current_score;
    const reason = (edit.reason || '').trim();
    const scoreNum = Number(scoreStr);

    if (Number.isNaN(scoreNum) || scoreNum < 0) {
      enqueueSnackbar('Enter a valid score (0 or greater).', { variant: 'warning' });
      return;
    }
    if (row.max_marks > 0 && scoreNum > row.max_marks) {
      enqueueSnackbar(`Score cannot exceed max marks (${row.max_marks}).`, { variant: 'warning' });
      return;
    }
    if (!reason) {
      enqueueSnackbar('Reason is required.', { variant: 'warning' });
      return;
    }

    setSavingId(row.response_id);
    try {
      await rankedResultsService.overrideResponseScore(
        assignmentId,
        row.response_id,
        { new_score: scoreNum, reason },
      );
      enqueueSnackbar('Score updated.', { variant: 'success' });
      await load();  // refresh so the badge appears
      setEdits((prev) => {
        const next = { ...prev };
        delete next[row.response_id];
        return next;
      });
    } catch (err) {
      enqueueSnackbar(
        err?.response?.data?.Error || 'Save failed.',
        { variant: 'error' },
      );
    } finally {
      setSavingId(null);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth
      slotProps={{ paper: { sx: { borderRadius:'14px', fontFamily:FONT } } }}>
      <Box sx={{ background:`linear-gradient(135deg, #A35A2D 0%, #78350F 100%)`,
        px:3, py:2 }}>
        <Typography sx={{ color:'#fff', fontWeight:800, fontSize:'1rem', fontFamily:FONT }}>
          ✏ Manage AI Scores
        </Typography>
        <Typography sx={{ color:'#FDE68A', fontSize:'0.76rem', fontFamily:FONT }}>
          Override an AI-assigned score with your own judgment. Every change is logged.
        </Typography>
      </Box>
      <DialogContent sx={{ pt:2.5, maxHeight:'70vh' }}>
        {loading ? (
          <Box sx={{ textAlign:'center', py:4 }}>
            <CircularProgress size={24} sx={{ color:B.amber }} />
            <Typography sx={{ mt:1.5, fontSize:'0.82rem', color:B.muted, fontFamily:FONT }}>
              Loading responses…
            </Typography>
          </Box>
        ) : rows.length === 0 ? (
          <Typography sx={{ fontSize:'0.85rem', color:B.muted, fontFamily:FONT, py:3, textAlign:'center' }}>
            No responses to display for this assignment.
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {rows.map((row) => {
              const isOverridden = !!row.latest_override;
              const edit = edits[row.response_id] || {};
              const scoreVal = edit.score ?? row.current_score;
              const reasonVal = edit.reason ?? '';
              const isSaving = savingId === row.response_id;
              return (
                <Paper key={row.response_id} elevation={0}
                  sx={{ p:1.5, border:`1px solid ${isOverridden ? B.amber : B.border}`,
                    borderRadius:'10px', bgcolor: isOverridden ? '#FFFBEB' : B.surface }}>
                  <Stack direction="row" spacing={1}
                    sx={{ justifyContent:'space-between', alignItems:'flex-start', mb:0.5 }}>
                    <Box sx={{ flex:1, minWidth:0 }}>
                      <Typography sx={{ fontSize:'0.72rem', fontWeight:700, color:B.pine,
                        fontFamily:FONT, textTransform:'uppercase', letterSpacing:'0.03em' }}>
                        {row.section_name || 'Section'} · {row.question_type}
                        {isOverridden && (
                          <Chip label="OVERRIDDEN" size="small"
                            sx={{ ml:1, height:16, fontSize:'0.62rem', fontWeight:700,
                              bgcolor:'#FEF3C7', color:'#92400E', border:'1px solid #FDE68A' }} />
                        )}
                      </Typography>
                      <Typography sx={{ fontSize:'0.82rem', color:B.ink, fontFamily:FONT,
                        mt:0.5, whiteSpace:'pre-wrap', wordBreak:'break-word' }}>
                        {row.stem_preview || '(no stem)'}
                      </Typography>
                    </Box>
                    <Typography sx={{ fontSize:'0.82rem', fontWeight:800, fontFamily:FONT,
                      color: row.current_score >= row.max_marks ? B.done
                           : row.current_score > 0 ? B.amber : B.danger, whiteSpace:'nowrap' }}>
                      {row.current_score.toFixed(2)} / {row.max_marks.toFixed(2)}
                    </Typography>
                  </Stack>

                  {row.candidate_answer_preview && (
                    <Box sx={{ bgcolor:B.bg, borderRadius:'6px', p:1, mt:0.5, mb:0.5,
                      border:`1px solid ${B.border}` }}>
                      <Typography sx={{ fontSize:'0.68rem', color:B.faint, fontWeight:700,
                        fontFamily:FONT, mb:0.3, textTransform:'uppercase' }}>
                        Candidate Answer
                      </Typography>
                      <Typography sx={{ fontSize:'0.75rem', color:B.body, fontFamily:FONT,
                        whiteSpace:'pre-wrap', wordBreak:'break-word' }}>
                        {row.candidate_answer_preview}
                      </Typography>
                    </Box>
                  )}

                  {row.ai_feedback && (
                    <Typography sx={{ fontSize:'0.72rem', color:B.sageText, fontFamily:FONT,
                      fontStyle:'italic', mb:0.5 }}>
                      💬 AI: {row.ai_feedback.slice(0, 300)}
                    </Typography>
                  )}

                  {isOverridden && (
                    <Alert severity="warning" icon={false}
                      sx={{ fontSize:'0.7rem', py:0.3, my:0.5, fontFamily:FONT,
                        '.MuiAlert-message':{ p:0 } }}>
                      <b>Previously overridden:</b>{' '}
                      {row.latest_override.original_score.toFixed(2)} →{' '}
                      {row.latest_override.new_score.toFixed(2)} —{' '}
                      "{row.latest_override.reason}"
                    </Alert>
                  )}

                  {row.can_override ? (
                    <Stack direction="row" spacing={1} sx={{ mt:1, alignItems:'flex-start' }}>
                      <TextField label="New score" type="number" size="small"
                        value={scoreVal}
                        onChange={(e) => handleFieldChange(row.response_id, 'score', e.target.value)}
                        slotProps={{ htmlInput: { min: 0, max: row.max_marks, step: 0.25 } }}
                        sx={{ width:110, fontFamily:FONT }} />
                      <TextField label="Reason (required)" size="small" fullWidth
                        value={reasonVal}
                        onChange={(e) => handleFieldChange(row.response_id, 'reason', e.target.value)}
                        placeholder="Why are you overriding?"
                        slotProps={{ htmlInput: { maxLength: 1000 } }}
                        sx={{ fontFamily:FONT }} />
                      <Button variant="contained" size="small" disabled={isSaving}
                        onClick={() => handleSave(row)}
                        sx={{ textTransform:'none', fontWeight:700, fontSize:'0.74rem',
                          borderRadius:'8px', bgcolor:B.amber, fontFamily:FONT,
                          whiteSpace:'nowrap', '&:hover':{ bgcolor:'#8B4C24' } }}>
                        {isSaving ? 'Saving…' : 'Save'}
                      </Button>
                    </Stack>
                  ) : (
                    <Typography sx={{ fontSize:'0.7rem', color:B.faint, fontFamily:FONT,
                      fontStyle:'italic', mt:0.5 }}>
                      Objective type — auto-scored from answer key. Override only if you spot an answer-key bug.
                    </Typography>
                  )}
                </Paper>
              );
            })}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px:3, py:1.5 }}>
        <Button onClick={onClose} sx={{ textTransform:'none', fontWeight:700,
          fontSize:'0.78rem', color:B.pine, fontFamily:FONT }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}


/* ═══════════ V2 Form Preview (read-only ScoringForm for HR) ═══════════              */
const V2FormPreviewLazy = React.lazy(() => import('@/components/interviewer/PostInterview/ScoringForm'));

function V2FormPreview({ formData, siId, onCsvReady }) {
  if (!formData) return null;
  const sub = formData.submission || {};
  const compConfig = formData.competency_config || [];
  const compScores = sub.competency_scores || {};
  const compEvidence = sub.competency_evidence || {};
  const sessionChecks = sub.session_checks || formData.session_checks || {};
  const C = { navy: '#1B2A4A', labelBg: '#E8EEF4' };

  // ── Local editable state ──
  const initRows = () => {
    const details = [
      ['Candidate Name', formData.candidate_name || '', 'Candidate ID / Req. No.', formData.candidate_id || ''],
      ['Position / Role Applied', formData.job_title || '', 'Interview Round', formData.interview_round || ''],
      ['Primary Skill / Technology', formData.primary_skill || '', 'Date of Interview', formData.interview_date || ''],
      ['Total Years of Experience', formData.total_experience || '', 'Required Experience for Role', formData.required_experience || ''],
      ['Interviewer Name', formData.interviewer_name || '', 'Interviewer ID / Level', `${formData.interviewer_id || ''} / ${formData.interviewer_level || formData.level || ''}`],
      ['Mode of Interview', formData.mode_of_interview || '', 'Interview Duration (mins)', String(formData.duration_mins || '')],
      ['Session recorded in IEVALX', sessionChecks.session_recorded || '', 'Candidate identity verified', sessionChecks.identity_verified || ''],
      ['Proctoring / integrity check', sessionChecks.proctoring_check || '', 'Interruption / disconnection', sessionChecks.interruption || ''],
    ];
    const metrics = compConfig.map((c) => ({
      key: c.key, label: c.label, description: c.description,
      weightage: c.weightage,
      rating: compScores[c.key] != null ? String(compScores[c.key]) : '',
      score: compScores[c.key] != null && compScores[c.key] !== 'NA'
        ? String(Number(compScores[c.key]) * c.weightage / 5) : '',
      evidence: compEvidence[c.key] || '',
    }));
    const questions = (sub.question_log || []).map((q, i) => ({
      question: q.question || '', metric: q.metric || '', response: q.response || '',
    }));
    return { details, metrics, questions };
  };

  const [data] = React.useState(initRows);
  const [hrReauditStatus, setHrReauditStatus] = React.useState(sub.hr_reaudit_status || 'Pending');
  const [reauditSaving, setReauditSaving] = React.useState(false);
  const [reauditSaved, setReauditSaved] = React.useState(false);

  // ── Build styled XLSX and notify parent ──
  const buildExcel = React.useCallback(() => {
    const rows = [];
    const merges = [];
    let r = 0;

    const pushRow = (cells) => { rows.push(cells); r++; };
    const blankRow = () => pushRow([]);
    const merge = (s, e) => merges.push({ s: { r: s.r, c: s.c }, e: { r: e.r, c: e.c } });

    // ── Style presets ──
    const border = { top:{style:'thin',color:{rgb:'D0D0D0'}}, bottom:{style:'thin',color:{rgb:'D0D0D0'}}, left:{style:'thin',color:{rgb:'D0D0D0'}}, right:{style:'thin',color:{rgb:'D0D0D0'}} };
    const _fill = (rgb) => ({ type:'pattern', patternType:'solid', fgColor:{rgb:'FF'+rgb}, bgColor:{rgb:'FF'+rgb} });
    const sNavy  = { fill:_fill('1B2A4A'), font:{bold:true,color:{rgb:'FFFFFF'},sz:11}, alignment:{horizontal:'left',vertical:'center',wrapText:true}, border };
    const sLabel = { fill:_fill('E8EEF4'), font:{bold:true,sz:10}, alignment:{vertical:'center',wrapText:true}, border };
   // F6F8F3 = B.bg — the DialogContent tint every "transparent" preview cell shows
const sVal   = { fill:_fill('F6F8F3'), font:{sz:10}, alignment:{vertical:'center',wrapText:true}, border };
const sHead  = { fill:_fill('E8EEF4'), font:{bold:true,sz:9,color:{rgb:'1B2A4A'}}, alignment:{horizontal:'center',vertical:'center',wrapText:true}, border };
const sHeadL = { fill:_fill('E8EEF4'), font:{bold:true,sz:9,color:{rgb:'1B2A4A'}}, alignment:{horizontal:'left',vertical:'center',wrapText:true}, border };
const sYellow = { fill:_fill('FFF7DC'), font:{sz:10}, alignment:{vertical:'center',wrapText:true}, border };
const sYellowH = { fill:_fill('FFF7DC'), font:{bold:true,sz:9,color:{rgb:'1B2A4A'}}, alignment:{horizontal:'center',vertical:'center',wrapText:true}, border };
const sCenter = { fill:_fill('F6F8F3'), font:{sz:10}, alignment:{horizontal:'center',vertical:'center',wrapText:true}, border };
const sBold  = { fill:_fill('F6F8F3'), font:{bold:true,sz:10}, alignment:{vertical:'center',wrapText:true}, border };
const sBoldC = { fill:_fill('F6F8F3'), font:{bold:true,sz:10}, alignment:{horizontal:'center',vertical:'center',wrapText:true}, border };
const sGray  = { fill:_fill('F0F0F0'), font:{bold:true,sz:10}, alignment:{horizontal:'center',vertical:'center',wrapText:true}, border };
const sTitle = { fill:_fill('1B2A4A'), font:{bold:true,color:{rgb:'FFFFFF'},sz:12}, alignment:{vertical:'center',wrapText:true}, border };
// RATING SCALE strip — preview uses #F8F8F8 with #555 text, not teal
const sSub   = { fill:_fill('F8F8F8'), font:{sz:9,color:{rgb:'555555'}}, alignment:{vertical:'center',wrapText:true}, border };
// Section 2 & 4 column headers — preview uses E8EEF4 for base, FFF7DC for RATING / EVIDENCE
const sTeal  = { fill:_fill('E8EEF4'), font:{bold:true,color:{rgb:'1B2A4A'},sz:9}, alignment:{horizontal:'center',vertical:'center',wrapText:true}, border };
const sTealL = { fill:_fill('E8EEF4'), font:{bold:true,color:{rgb:'1B2A4A'},sz:9}, alignment:{horizontal:'left',vertical:'center',wrapText:true}, border };
const sTealY = { fill:_fill('FFF7DC'), font:{bold:true,color:{rgb:'1B2A4A'},sz:9}, alignment:{horizontal:'center',vertical:'center',wrapText:true}, border };
    const sGreen = { fill:_fill('C6EFCE'), font:{bold:true,sz:10}, alignment:{horizontal:'center',vertical:'center',wrapText:true}, border };
    const sAmber = { fill:_fill('FFEB9C'), font:{bold:true,sz:10}, alignment:{horizontal:'center',vertical:'center',wrapText:true}, border };
    const sRed   = { fill:_fill('FFC7CE'), font:{bold:true,sz:10}, alignment:{horizontal:'center',vertical:'center',wrapText:true}, border };
    const sFoot  = { fill:_fill('1B2A4A'), font:{sz:8,color:{rgb:'AAAAAA'},italic:true}, alignment:{vertical:'center',wrapText:true}, border };

    // Styled cell helper
    const sc = (v, s) => ({ v: v ?? '', s });

    // ── Header ──
    pushRow([sc('IEVALX  |  INTERVIEWER FEEDBACK & FINAL EVALUATION FORM', sTitle)]);
    merge({ r: 0, c: 0 }, { r: 0, c: 5 });
    pushRow([sc(`Submit in IEVALX immediately after the final evaluation round  |  ${formData.company_name || ''}`, sSub)]);
    merge({ r: 1, c: 0 }, { r: 1, c: 5 });
    blankRow();

    // ── Section 1 ──
    const s1 = r;
    pushRow([sc('1.  INTERVIEW DETAILS & SESSION CHECK', sNavy), sc('',sNavy), sc('',sNavy), sc('',sNavy), sc('',sNavy), sc('',sNavy)]);
    merge({ r: s1, c: 0 }, { r: s1, c: 5 });
    data.details.forEach(([l1, v1, l2, v2]) => {
      pushRow([sc(l1, sLabel), sc(v1 || '—', sVal), sc('', sVal), sc(l2, sLabel), sc(v2 || '—', sVal), sc('', sVal)]);
    });
    blankRow();

    // ── Section 2 ──
    const s2 = r;
    pushRow([sc('2.  EVALUATION MATRIX — SIX CORE METRICS', sNavy), sc('',sNavy), sc('',sNavy), sc('',sNavy), sc('',sNavy), sc('',sNavy)]);
    merge({ r: s2, c: 0 }, { r: s2, c: 5 });
    const ratingRow = r;
    pushRow([sc('RATING SCALE:  NA = Not assessed   1 = Poor   2 = Basic   3 = Good (meets expectation)   4 = Strong (exceeds)   5 = Outstanding', sSub)]);
    merge({ r: ratingRow, c: 0 }, { r: ratingRow, c: 5 });
    pushRow([sc('COMPETENCY', sTealL), sc('WHAT IS BEING ASSESSED', sTealL), sc('WEIGHTAGE', sTeal), sc('RATING (NA, 1-5)', sTealY), sc('SCORE', sTeal), sc('EVIDENCE / REMARKS (MANDATORY)', sTealY)]);
    data.metrics.forEach((m) => {
      pushRow([sc(m.label, sBold), sc(m.description, sVal), sc(m.weightage, sBoldC), sc(m.rating || '—', sYellow), sc(m.score || '—', sGray), sc(m.evidence || '—', sYellow)]);
    });
    const totalWt = data.metrics.reduce((s, m) => s + (m.weightage || 0), 0);
    const totalScore = data.metrics.reduce((s, m) => s + (parseFloat(m.score) || 0), 0);
    pushRow([sc('TOTAL', sNavy), sc('Weightage and points scored', sNavy), sc(totalWt, sNavy), sc('', sNavy), sc(totalScore.toFixed(1), sNavy), sc('A rating of 1 on any metric needs a written justification in Section 5.', sNavy)]);
    blankRow();

    // ── Section 3 ──
    const s3 = r;
    pushRow([sc('3.  SCORE SUMMARY & FINAL RECOMMENDATION', sNavy), sc('',sNavy), sc('',sNavy), sc('',sNavy), sc('',sNavy), sc('',sNavy)]);
    merge({ r: s3, c: 0 }, { r: s3, c: 5 });
    const bandStyle = (b) => { if (!b) return sBold; if (b.includes('A') || b.includes('B')) return sGreen; if (b.includes('C')) return sAmber; return sRed; };
    const alignStyle = (a) => { if (!a) return sVal; if (a.startsWith('Aligned')) return sGreen; if (a.startsWith('Minor')) return sAmber; return sRed; };
    const complStyle = (c) => { if (!c) return sVal; return c.startsWith('COMPLETE') ? sGreen : sRed; };
    pushRow([sc('Weighted Score (out of 100)', sLabel), sc(sub.overall_score ?? '—', sBold), sc('', sVal), sc('Score Band', sLabel), sc(sub.score_band || '—', bandStyle(sub.score_band)), sc('', sVal)]);
    pushRow([sc('Applicable Weightage Considered', sLabel), sc('100%', sVal), sc('', sVal), sc('Indicative Recommendation (system)', sLabel), sc(sub.indicative_recommendation || '—', bandStyle(sub.score_band)), sc('', sVal)]);
    pushRow([sc("INTERVIEWER'S FINAL RECOMMENDATION", sLabel), sc(sub.recommendation || '—', sYellow), sc('', sVal), sc('Alignment Check', sLabel), sc(sub.alignment_check || '—', alignStyle(sub.alignment_check)), sc('', sVal)]);
    pushRow([sc('Form Completeness Check', sLabel), sc(sub.form_completeness || '—', complStyle(sub.form_completeness)), sc('', sVal), sc('', sVal), sc('', sVal), sc('', sVal)]);
    blankRow();

    // ── Section 4 ──
    const s4 = r;
    pushRow([sc('4.  QUESTION LOG — WHAT WAS ACTUALLY ASKED (minimum three entries)', sNavy), sc('',sNavy), sc('',sNavy), sc('',sNavy), sc('',sNavy), sc('',sNavy)]);
    merge({ r: s4, c: 0 }, { r: s4, c: 5 });
    const qhRow = r;
    pushRow([sc('QUESTION ASKED', sTealL), sc('METRIC ASSESSED', sTealL), sc("CANDIDATE'S RESPONSE AND YOUR ASSESSMENT", sTealL)]);
    merge({ r: qhRow, c: 2 }, { r: qhRow, c: 5 });
    data.questions.forEach((q) => {
      const qr = r;
      pushRow([sc(q.question || '—', sVal), sc(q.metric || '—', sVal), sc(q.response || '—', sVal)]);
      merge({ r: qr, c: 2 }, { r: qr, c: 5 });
    });
    blankRow();

    // ── Section 5 ──
    const s5 = r;
    pushRow([sc('5.  QUALITATIVE FEEDBACK', sNavy), sc('',sNavy), sc('',sNavy), sc('',sNavy), sc('',sNavy), sc('',sNavy)]);
    merge({ r: s5, c: 0 }, { r: s5, c: 5 });
    [['Key Strengths Observed', sub.key_strengths],
     ['Areas of Concern / Development Needs', sub.areas_of_concern],
     ['Overall Remarks & Justification for the Recommendation', sub.overall_remarks],
    ].forEach(([lbl, val]) => {
      const fr = r;
      pushRow([sc(lbl, sLabel), sc(val || '—', sVal)]);
      merge({ r: fr, c: 1 }, { r: fr, c: 5 });
    });
    blankRow();

    // ── Section 6 ──
    const s6 = r;
    pushRow([sc('6.  PANEL DECLARATION & SUBMISSION', sNavy), sc('',sNavy), sc('',sNavy), sc('',sNavy), sc('',sNavy), sc('',sNavy)]);
    merge({ r: s6, c: 0 }, { r: s6, c: 5 });
    pushRow([sc('Other panel members (if any)', sLabel), sc(sub.panel_members || '—', sVal), sc('', sVal), sc('Panel consensus reached', sLabel), sc(sub.panel_consensus || '—', sVal), sc('', sVal)]);
    pushRow([sc('Interviewer Signature', sLabel), sc(sub.interviewer_signature || '—', sVal), sc('', sVal), sc('Date of Submission', sLabel), sc(sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString() : '—', sVal), sc('', sVal)]);
    pushRow([sc('IEVALX Submission Ref. No.', sLabel), sc(sub.submission_ref || 'Pending', sVal), sc('', sVal), sc('HR Re-audit Status', sLabel), sc(hrReauditStatus, sBold), sc('', sVal)]);
    blankRow();
    const cf = r;
    pushRow([sc(`CONFIDENTIAL — Advisory only. Subject to mandatory HR re-audit within IEVALX before any outcome is communicated to the candidate.  IEVALX | ${formData.company_name || ''}`, sFoot), sc('',sFoot), sc('',sFoot), sc('',sFoot), sc('',sFoot), sc('',sFoot)]);
    merge({ r: cf, c: 0 }, { r: cf, c: 5 });

    if (formData.ai_score) {
      blankRow();
      const sa = r;
      pushRow([sc('AI SCORE COMPARISON', sNavy), sc('',sNavy), sc('',sNavy), sc('',sNavy), sc('',sNavy), sc('',sNavy)]);
      merge({ r: sa, c: 0 }, { r: sa, c: 5 });
      pushRow([sc('Interviewer Score', sLabel), sc(sub.overall_score ?? '—', sBold), sc('', sVal), sc('AI Score', sLabel), sc(formData.ai_score.overall ?? '—', sBold), sc('', sVal)]);
      if (formData.divergence) pushRow([sc('Divergence', sLabel), sc(formData.divergence.raw ?? '—', sBold), sc('', sVal), sc('', sVal), sc('', sVal), sc('', sVal)]);
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    // Force-apply styles — aoa_to_sheet drops fill on light colors
    for (let ri = 0; ri < rows.length; ri++) {
      const row = rows[ri];
      if (!row) continue;
      for (let ci = 0; ci < row.length; ci++) {
        const cell = row[ci];
        if (cell && cell.s) {
          const addr = XLSX.utils.encode_cell({ r: ri, c: ci });
          if (ws[addr]) ws[addr].s = cell.s;
        }
      }
    }
    ws['!merges'] = merges;
    ws['!cols'] = [
      { wch: 34 }, 
      { wch: 32 },
      { wch: 14 }, 
      { wch: 34 }, 
      { wch: 18 }, 
      { wch: 52 }, 
    ];
    // Row heights for section headers
    const headerRows = [s1, s2, s3, s4, s5, s6];
    ws['!rows'] = [];
    headerRows.forEach((ri) => { ws['!rows'][ri] = { hpt: 24 }; });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Interviewer Feedback Form');
    return wb;
  }, [data, sub, formData, hrReauditStatus]);

  React.useEffect(() => {
    if (onCsvReady) onCsvReady(buildExcel);
  }, [buildExcel, onCsvReady]);


  return (
    <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
      {/* ═══ Section 1: Interview Details & Session Check ═══ */}
      <Box sx={{ bgcolor: C.navy, px: 2, py: 1, borderRadius: '4px 4px 0 0' }}>
        <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '0.92rem' }}>
          1. INTERVIEW DETAILS &amp; SESSION CHECK
        </Typography>
      </Box>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', marginBottom: 16 }}>
        <tbody>
          {data.details.map(([l1, v1, l2, v2], i) => (
            <tr key={i}>
              <td style={{ padding: '6px 10px', fontWeight: 700, background: '#E8EEF4', width: '18%', border: '1px solid #D0D0D0' }}>{l1}</td>
              <td style={{ padding: '6px 10px', width: '30%', border: '1px solid #D0D0D0' }}>{v1 || '—'}</td>
              <td style={{ padding: '6px 10px', fontWeight: 700, background: '#E8EEF4', width: '18%', border: '1px solid #D0D0D0' }}>{l2}</td>
              <td style={{ padding: '6px 10px', width: '34%', border: '1px solid #D0D0D0' }}>{v2 || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ═══ Section 2: Evaluation Matrix ═══ */}
      <Box sx={{ bgcolor: C.navy, px: 2, py: 1 }}>
        <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '0.92rem' }}>
          2. EVALUATION MATRIX — SIX CORE METRICS
        </Typography>
      </Box>
      <Box sx={{ fontSize: '0.72rem', color: '#555', p: '6px 10px', bgcolor: '#F8F8F8', border: '1px solid #D0D0D0', borderTop: 0 }}>
        RATING SCALE &nbsp; NA = Not assessed &nbsp; 1 = Poor &nbsp; 2 = Basic &nbsp; 3 = Good (meets expectation) &nbsp; 4 = Strong (exceeds) &nbsp; 5 = Outstanding
      </Box>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
        <thead>
          <tr style={{ background: '#E8EEF4', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            <th style={{ padding: '6px 10px', border: '1px solid #D0D0D0', textAlign: 'left', width: '16%' }}>Competency</th>
            <th style={{ padding: '6px 10px', border: '1px solid #D0D0D0', textAlign: 'left', width: '22%' }}>What is being assessed</th>
            <th style={{ padding: '6px 10px', border: '1px solid #D0D0D0', textAlign: 'center', width: '8%' }}>Weightage</th>
            <th style={{ padding: '6px 10px', border: '1px solid #D0D0D0', textAlign: 'center', width: '8%', background: '#FFF7DC' }}>Rating (1-5)</th>
            <th style={{ padding: '6px 10px', border: '1px solid #D0D0D0', textAlign: 'center', width: '8%' }}>Score</th>
            <th style={{ padding: '6px 10px', border: '1px solid #D0D0D0', textAlign: 'left', background: '#FFF7DC' }}>Evidence / Remarks</th>
          </tr>
        </thead>
        <tbody>
          {data.metrics.map((m, i) => (
            <tr key={m.key} style={{ fontSize: '0.82rem' }}>
              <td style={{ padding: '6px 10px', border: '1px solid #D0D0D0', fontWeight: 700 }}>{m.label}</td>
              <td style={{ padding: '6px 10px', border: '1px solid #D0D0D0', color: '#555' }}>{m.description}</td>
              <td style={{ padding: '6px 10px', border: '1px solid #D0D0D0', textAlign: 'center', fontWeight: 700 }}>{m.weightage}</td>
              <td style={{ padding: '6px 10px', border: '1px solid #D0D0D0', textAlign: 'center', background: '#FFF7DC' }}>
                {m.rating || '—'}
              </td>
              <td style={{ padding: '6px 10px', border: '1px solid #D0D0D0', textAlign: 'center', fontWeight: 700, background: '#F0F0F0' }}>
                {m.score || '—'}
              </td>
              <td style={{ padding: '6px 10px', border: '1px solid #D0D0D0', background: '#FFF7DC' }}>
                {m.evidence || '—'}
              </td>
            </tr>
          ))}
          <tr style={{ fontSize: '0.82rem', fontWeight: 800, background: C.navy, color: '#fff' }}>
            <td style={{ padding: '6px 10px', border: '1px solid #D0D0D0' }}>TOTAL</td>
            <td style={{ padding: '6px 10px', border: '1px solid #D0D0D0' }}>Weightage and points scored</td>
            <td style={{ padding: '6px 10px', border: '1px solid #D0D0D0', textAlign: 'center' }}>
              {data.metrics.reduce((s, m) => s + (m.weightage || 0), 0)}
            </td>
            <td style={{ padding: '6px 10px', border: '1px solid #D0D0D0' }}></td>
            <td style={{ padding: '6px 10px', border: '1px solid #D0D0D0', textAlign: 'center' }}>
              {sub.overall_score ?? '—'}
            </td>
            <td style={{ padding: '6px 10px', border: '1px solid #D0D0D0', fontSize: '0.72rem' }}>
              A rating of 1 on any metric needs a written justification in Section 5.
            </td>
          </tr>
        </tbody>
      </table>

      {/* ═══ Section 3: Score Summary & Final Recommendation ═══ */}
      <Box sx={{ bgcolor: C.navy, px: 2, py: 1 }}>
        <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '0.92rem' }}>
          3. SCORE SUMMARY &amp; FINAL RECOMMENDATION
        </Typography>
      </Box>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', marginBottom: 16 }}>
        <tbody>
          {[
            ['Weighted Score (out of 100)', sub.overall_score ?? '—', 'Score Band', sub.score_band || '—'],
            ['Applicable Weightage Considered', '100%', 'Indicative Recommendation (system)', sub.indicative_recommendation || '—'],
            ["Interviewer's Final Recommendation", sub.recommendation || '—', 'Alignment Check', sub.alignment_check || '—'],
            ['Form Completeness Check', sub.form_completeness || '—', '', ''],
          ].map(([l1, v1, l2, v2], i) => (
            <tr key={i}>
              <td style={{ padding: '6px 10px', fontWeight: 700, background: '#E8EEF4', width: '22%', border: '1px solid #D0D0D0' }}>{l1}</td>
              <td style={{ padding: '6px 10px', width: '28%', border: '1px solid #D0D0D0', fontWeight: 600 }}>{v1}</td>
              {l2 ? (
                <>
                  <td style={{ padding: '6px 10px', fontWeight: 700, background: '#E8EEF4', width: '22%', border: '1px solid #D0D0D0' }}>{l2}</td>
                  <td style={{ padding: '6px 10px', width: '28%', border: '1px solid #D0D0D0', fontWeight: 600 }}>{v2}</td>
                </>
              ) : <td colSpan={2} style={{ border: '1px solid #D0D0D0' }}></td>}
            </tr>
          ))}
        </tbody>
      </table>

      {/* ═══ Section 4: Question Log ═══ */}
      <Box sx={{ bgcolor: C.navy, px: 2, py: 1 }}>
        <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '0.92rem' }}>
          4. QUESTION LOG — WHAT WAS ACTUALLY ASKED (minimum three entries)
        </Typography>
      </Box>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', marginBottom: 16 }}>
        <thead>
          <tr style={{ background: '#E8EEF4', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase' }}>
            <th style={{ padding: '6px 10px', border: '1px solid #D0D0D0', textAlign: 'left', width: '35%' }}>Question Asked</th>
            <th style={{ padding: '6px 10px', border: '1px solid #D0D0D0', textAlign: 'left', width: '18%' }}>Metric Assessed</th>
            <th style={{ padding: '6px 10px', border: '1px solid #D0D0D0', textAlign: 'left' }}>Candidate's Response &amp; Your Assessment</th>
          </tr>
        </thead>
        <tbody>
          {data.questions.length === 0 ? (
            <tr><td colSpan={3} style={{ padding: '10px', border: '1px solid #D0D0D0', color: '#888', textAlign: 'center' }}>No questions logged.</td></tr>
          ) : data.questions.map((q, i) => (
            <tr key={i}>
              <td style={{ padding: '6px 10px', border: '1px solid #D0D0D0' }}>{q.question || '—'}</td>
              <td style={{ padding: '6px 10px', border: '1px solid #D0D0D0' }}>{q.metric || '—'}</td>
              <td style={{ padding: '6px 10px', border: '1px solid #D0D0D0', whiteSpace: 'pre-wrap' }}>{q.response || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ═══ Section 5: Qualitative Feedback ═══ */}
      <Box sx={{ bgcolor: C.navy, px: 2, py: 1 }}>
        <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '0.92rem' }}>
          5. QUALITATIVE FEEDBACK
        </Typography>
      </Box>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', marginBottom: 16 }}>
        <tbody>
          {[
            ['Key Strengths Observed', sub.key_strengths || '—'],
            ['Areas of Concern / Development Needs', sub.areas_of_concern || '—'],
            ['Overall Remarks & Justification', sub.overall_remarks || '—'],
          ].map(([label, val], i) => (
            <tr key={i}>
              <td style={{ padding: '6px 10px', fontWeight: 700, background: '#E8EEF4', width: '25%', border: '1px solid #D0D0D0', verticalAlign: 'top' }}>{label}</td>
              <td style={{ padding: '6px 10px', border: '1px solid #D0D0D0', whiteSpace: 'pre-wrap' }}>{val}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ═══ Section 6: Panel Declaration & Submission ═══ */}
      <Box sx={{ bgcolor: C.navy, px: 2, py: 1 }}>
        <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '0.92rem' }}>
          6. PANEL DECLARATION &amp; SUBMISSION
        </Typography>
      </Box>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', marginBottom: 16 }}>
        <tbody>
          {[
            ['Other panel members (if any)', sub.panel_members || '—', 'Panel consensus reached', sub.panel_consensus || '—'],
            ['Interviewer Signature', sub.interviewer_signature || '—', 'Date of Submission', sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString() : '—'],
            ['IEVALX Submission Ref. No.', sub.submission_ref || 'Pending', 'HR Re-audit Status', '__HR_REAUDIT__'],
          ].map(([l1, v1, l2, v2], i) => (
            <tr key={i}>
              <td style={{ padding: '6px 10px', fontWeight: 700, background: '#E8EEF4', width: '22%', border: '1px solid #D0D0D0' }}>{l1}</td>
              <td style={{ padding: '6px 10px', width: '28%', border: '1px solid #D0D0D0' }}>{v1}</td>
              <td style={{ padding: '6px 10px', fontWeight: 700, background: '#E8EEF4', width: '22%', border: '1px solid #D0D0D0' }}>{l2}</td>
              <td style={{ padding: '6px 10px', width: '28%', border: '1px solid #D0D0D0' }}>
                {v2 === '__HR_REAUDIT__' ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Select size="small" variant="standard" value={hrReauditStatus}
                      onChange={(e) => { setHrReauditStatus(e.target.value); setReauditSaved(false); }}
                      sx={{ fontSize: '0.82rem', fontFamily: FONT, fontWeight: 700,
                        minWidth: 130,
                        color: hrReauditStatus === 'Completed' ? '#3E6E3E'
                             : hrReauditStatus === 'In Progress' ? '#0284c7'
                             : '#A35A2D',
                      }}>
                      <MenuItem value="Pending">Pending</MenuItem>
                      <MenuItem value="In Progress">In Progress</MenuItem>
                      <MenuItem value="Completed">Completed</MenuItem>
                    </Select>
                    <Button size="small" variant="contained" disableElevation
                      disabled={reauditSaving || hrReauditStatus === (sub.hr_reaudit_status || 'Pending')}
                      onClick={async () => {
                        if (!siId) return;
                        setReauditSaving(true);
                        try {
                          await rankedResultsService.updateReauditStatus(siId, hrReauditStatus);
                          sub.hr_reaudit_status = hrReauditStatus;
                          setReauditSaved(true);
                        } catch (err) {
                          console.error('Failed to save re-audit status', err);
                        } finally {
                          setReauditSaving(false);
                        }
                      }}
                      sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.7rem',
                        borderRadius: '7px', px: 1.5, py: 0.3, minWidth: 0,
                        bgcolor: '#1B2A4A', fontFamily: FONT,
                        '&:hover': { bgcolor: '#0A3F42' },
                        '&.Mui-disabled': { bgcolor: '#E0E0E0', color: '#999' },
                      }}>
                      {reauditSaving ? 'Saving…' : reauditSaved ? '✓ Saved' : 'Save'}
                    </Button>
                  </Box>
                ) : v2}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Typography sx={{ fontSize: '0.7rem', color: '#888', textAlign: 'center', mt: 1, fontFamily: FONT }}>
        CONFIDENTIAL — Advisory only. Subject to mandatory HR re-audit with IEVALX before any outcome is communicated to the candidate. &nbsp; IEVALX | {formData.company_name || ''}
      </Typography>

      {/* AI Score Comparison (if audit was on) — full per-competency breakdown */}
      {formData.ai_score && (() => {
        const aiComp = formData.ai_score.competencies || {};
        const aiReasoning = formData.ai_score.reasoning || {};
        const diffColor = (d) => d > 0 ? '#4CAF50' : d < 0 ? '#E65100' : '#888';
        const fmtDiff = (d) => d > 0 ? `+${d}` : d < 0 ? String(d) : '—';
        return (
          <Box sx={{ mt: 2, p: 2, bgcolor: '#FAFCFF', border: '1px solid #E3F2FD', borderRadius: 2 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.92rem', color: '#1B2A4A', mb: 1.5 }}>
              🤖 AI Score Comparison
            </Typography>

            {/* Overall scores row */}
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mb: 2, pb: 2, borderBottom: '1px solid #E3F2FD' }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" sx={{ color: '#888' }}>Your score</Typography>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>{sub.overall_score ?? '—'}</Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" sx={{ color: '#888' }}>AI score</Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#1976D2' }}>{formData.ai_score.overall}</Typography>
              </Box>
              {formData.divergence && (
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ color: '#888' }}>Divergence</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: Math.abs(formData.divergence.raw) > 10 ? '#E65100' : '#4CAF50' }}>
                    {formData.divergence.raw > 0 ? '+' : ''}{formData.divergence.raw}
                  </Typography>
                </Box>
              )}
              {formData.divergence?.calibration_adjusted != null && (
                <Typography variant="caption" sx={{ color: '#888', alignSelf: 'flex-end', ml: 1 }}>
                  Calibration-adjusted divergence: {formData.divergence.calibration_adjusted}
                </Typography>
              )}
            </Box>

            {/* Per-competency breakdown table */}
            <Typography sx={{ fontWeight: 800, fontSize: '0.72rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1 }}>
              Per-Competency Breakdown
            </Typography>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E3F2FD' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 800, fontSize: '0.72rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Competency</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 800, fontSize: '0.72rem', color: '#555', textTransform: 'uppercase', width: '12%' }}>YOU</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 800, fontSize: '0.72rem', color: '#1976D2', textTransform: 'uppercase', width: '12%' }}>AI</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 800, fontSize: '0.72rem', color: '#555', textTransform: 'uppercase', width: '12%' }}>DIFF</th>
                </tr>
              </thead>
              <tbody>
                {compConfig.map((c) => {
                  const youRaw = compScores[c.key];
                  const aiRaw = aiComp[c.key];
                  const youVal = youRaw != null && youRaw !== 'NA' ? Number(youRaw) : null;
                  const aiVal = aiRaw != null && aiRaw !== 'NA' && aiRaw !== 'N/A' ? Number(aiRaw) : null;
                  const diff = (youVal != null && aiVal != null) ? youVal - aiVal : null;
                  const isNA = youRaw === 'NA' || youRaw == null;
                  const aiNotAsked = aiRaw == null || aiRaw === 'N/A';
                  return (
                    <tr key={c.key} style={{ borderBottom: '1px solid #F0F4F8' }}>
                      <td style={{ padding: '8px 10px' }}>
                        <span style={{ fontWeight: 700 }}>{c.label}</span>
                        {aiNotAsked && !isNA && <span style={{ display: 'inline-block', marginLeft: 8, fontSize: '0.65rem', background: '#FFF3E0', color: '#E65100', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>Not Asked</span>}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 800 }}>
                        {isNA ? 'NA' : youVal}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 800, color: '#1976D2' }}>
                        {aiNotAsked ? 'N/A' : aiVal}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 800, color: diff != null ? diffColor(diff) : '#888' }}>
                        {diff != null ? fmtDiff(diff) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Box>
        );
      })()}
    </Box>
  );
}

/* ═══════════ in-app REPORT PREVIEW dialog (👁 Preview column) ═══════════               */
function ReportPreviewDialog({ state, onClose, onOpenSummary }) {
  if (!state) return null;
  const { candidate, roundLabel, loading, error, blobUrl, blobType, source, formData, siId } = state;
  const isHtml = (blobType || '').includes('html');
  const isV2Form = formData && formData.report_type === 'v2_submission';
  const _csvBuilderRef = React.useRef(null);

  return (
    <Dialog open onClose={onClose} maxWidth="lg" fullWidth
      slotProps={{ paper: { sx: {
        borderRadius:'16px', overflow:'hidden', fontFamily:FONT,
        height:{ xs:'100vh', md:'92vh' }, display:'flex', flexDirection:'column',
      } } }}>
      <Box sx={{ background:`linear-gradient(135deg, ${B.pine} 0%, #0A3F42 100%)`,
        px:{ xs:2, sm:3 }, py:2, display:'flex', alignItems:'center', gap:1.5 }}>
        <Box sx={{ flex:1, minWidth:0 }}>
          <Typography sx={{ color:'#fff', fontWeight:800, fontSize:'1rem',
            fontFamily:FONT, overflow:'hidden', textOverflow:'ellipsis',
            whiteSpace:'nowrap' }}>
            {isV2Form ? '📋 Evaluation Form' : '👁 Report Preview'} — {candidate?.name}
          </Typography>
          <Typography sx={{ color:'#93C5AE', fontSize:'0.78rem', fontFamily:FONT,
            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {roundLabel}{source ? ` · source: ${source}` : ''}
          </Typography>
        </Box>
        <Tooltip arrow title="Open the numeric score breakdown dialog">
          <span>
            <Button size="small" variant="contained" disableElevation
              disabled={!candidate}
              onClick={() => { onOpenSummary(candidate); }}
              sx={{ textTransform:'none', fontWeight:700, fontSize:'0.74rem',
                borderRadius:'9px', bgcolor:'rgba(255,255,255,0.14)',
                color:'#fff', fontFamily:FONT,
                '&:hover':{ bgcolor:'rgba(255,255,255,0.22)' } }}>
              📊 Summary
            </Button>
          </span>
        </Tooltip>
        {/* Download button — v2 form uses CSV export, legacy uses blob download */}
        {(isV2Form || blobUrl) && (
          <Tooltip arrow title={isV2Form ? "Download as Excel spreadsheet (.xlsx)" : "Download the PDF report"}>
            <span>
              <Button size="small" variant="contained" disableElevation
                onClick={() => {
                  if (isV2Form) {
                    if (_csvBuilderRef.current) {
                      const wb = _csvBuilderRef.current();
                      const safeName = String(candidate?.name || 'candidate').replace(/[^\w.-]+/g, '_');
                      XLSX.writeFile(wb, `${safeName}_evaluation.xlsx`);
                    }
                  } else {
                    const a = document.createElement('a');
                    a.href = blobUrl;
                    const safeName = String(candidate?.name || 'candidate')
                      .replace(/[^\w.-]+/g, '_');
                    a.download = `${safeName}_${roundLabel.replace(/[^\w.-]+/g, '_')}.${isHtml ? 'html' : 'pdf'}`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                  }
                }}
                sx={{ textTransform:'none', fontWeight:700, fontSize:'0.74rem',
                  borderRadius:'9px', bgcolor:'rgba(255,255,255,0.14)',
                  color:'#fff', fontFamily:FONT,
                  '&:hover':{ bgcolor:'rgba(255,255,255,0.22)' } }}>
                {isV2Form ? '⬇ Download Excel' : '⬇ Download'}
              </Button>
            </span>
          </Tooltip>
        )}
      </Box>

      <DialogContent sx={{ p:0, flex:1, bgcolor:B.bg, display:'flex',
        flexDirection:'column' }}>
        {loading && (
          <Box sx={{ flex:1, display:'flex', flexDirection:'column',
            alignItems:'center', justifyContent:'center', gap:1.5 }}>
            <CircularProgress size={32} sx={{ color:B.sage }} />
            <Typography sx={{ fontSize:'0.85rem', color:B.muted, fontFamily:FONT }}>
              Fetching the same report the candidate received…
            </Typography>
          </Box>
        )}
        {!loading && error && (
          <Box sx={{ p:3, display:'flex', flexDirection:'column', gap:2 }}>
            <Alert severity="warning" sx={{ borderRadius:'11px', fontFamily:FONT }}>
              {error}
            </Alert>
            <Typography sx={{ fontSize:'0.85rem', color:B.muted, fontFamily:FONT }}>
              You can still open the numeric summary — it works even when a
              printable report isn't available yet.
            </Typography>
            <Box>
              <Button size="small" variant="contained" disableElevation
                onClick={() => { onOpenSummary(candidate); }}
                sx={{ textTransform:'none', fontWeight:700, fontSize:'0.78rem',
                  borderRadius:'9px', bgcolor:B.pine, fontFamily:FONT,
                  '&:hover':{ bgcolor:B.pineHover } }}>
                📊 Open score summary
              </Button>
            </Box>
          </Box>
        )}
        {/* v2 form: render read-only ScoringForm inline */}
        {!loading && !error && isV2Form && (
          <V2FormPreview formData={formData} siId={siId} onCsvReady={(fn) => { _csvBuilderRef.current = fn; }} />
        )}
        {/* Legacy PDF: iframe */}
        {!loading && !error && !isV2Form && blobUrl && (
          <Box component="iframe"
            src={blobUrl}
            title={`Report preview for ${candidate?.name || 'candidate'}`}
            sx={{
              flex:1, width:'100%', minHeight:{ xs:'70vh', md:'75vh' },
              border:'none', bgcolor:'#fff',
            }} />
        )}
      </DialogContent>
      <DialogActions sx={{ px:3, py:1.75, borderTop:`1px solid ${B.border}`,
        bgcolor:B.surface }}>
        <Typography sx={{ flex:1, fontSize:'0.72rem', color:B.faint,
          fontFamily:FONT }}>
          {isV2Form ? 'Interviewer evaluation form — HR Re-audit Status is editable. Use Download Excel to export.' : 'Same report the candidate received. Rendered in-app — no external window opens.'}
        </Typography>
        <Button onClick={onClose} variant="contained" disableElevation
          sx={{ bgcolor:B.pine, '&:hover':{ bgcolor:B.pineHover },
            textTransform:'none', fontWeight:700, borderRadius:'10px',
            fontFamily:FONT }}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ */
const RankedResults = () => {
  const { enqueueSnackbar } = useSnackbar();
  const { processId, jobId } = useParams();
  const navigate = useNavigate();

  const {
    filteredJobs, jobs, pipelinesForJob, stats, loading, error,
    search, setSearch, statusFilter, setStatusFilter,
    selectedPipelineId, setSelectedPipelineId, selectedPipeline,
    detailLoading, members, membersForRound, activeRounds, removedRounds, membersUnavailable,
    isFinalRound, nextRoundAfter, reschedule, rescheduleCount,
    approve, hold, reject, hire, applyReschedule, deletePipeline, acting,
    softDeleteJob, bulkSoftDeleteJobs,
    refresh, refreshDetail, loadPipeline,
  } = useRankedResults();

 const [viewMode,   setViewMode]   = useState('list');
  const [page,       setPage]       = useState(1);
  const [pageSize,   setPageSize]   = useState(10);
  const [deleteDlg,  setDeleteDlg]  = useState(null);
  const [selectedJobs,    setSelectedJobs]    = useState(new Set());
  const [jobDeleteDlg,    setJobDeleteDlg]    = useState(null);   // { jobKey, jobTitle } | 'bulk'
  const [jobDeleting,     setJobDeleting]     = useState(false);
  const [deleting,   setDeleting]   = useState(false);
  const [currentRound, setCurrentRound] = useState(null);
  const [selected,   setSelected]   = useState(new Set());
  const [reschedOpen, setReschedOpen] = useState(false);
  const [skipReport, setSkipReport] = useState(null);
  const [manageDialog, setManageDialog] = useState({ open:false, process:null });
  const [scoreCache, setScoreCache] = useState({});
  /* Per-round decision filter — resets whenever the round tab changes. */
  const [roundFilter, setRoundFilter] = useState('all');
  const [reportDlg,  setReportDlg]  = useState(null);
  const [previewDlg, setPreviewDlg] = useState(null);
  const [profileDlg, setProfileDlg] = useState(null);
  const [liveNow, setLiveNow] = useState(Date.now());

  /* URL → state */
  useEffect(() => {
    setSelectedPipelineId(processId || null);
  }, [processId, setSelectedPipelineId]);

  /* default round tab whenever the pipeline detail changes */
  useEffect(() => {
    if (!activeRounds.length && !removedRounds.length) { setCurrentRound(null); return; }
    setCurrentRound((prev) => {
      const stillThere = [...activeRounds, ...removedRounds]
        .some((r) => String(r.id) === String(prev));
      return stillThere ? prev : (activeRounds[0]?.id ?? removedRounds[0]?.id ?? null);
    });
    setSelected(new Set());
  }, [activeRounds, removedRounds]);

  const rows = useMemo(
    () => membersForRound(currentRound), [membersForRound, currentRound]);

  const bucketOf = (cell) => {
    if (!cell) return 'waiting';
    if (cell.status === 'rejected' || cell.decision === 'rejected') return 'rejected';
    if (cell.decision === 'approved') return 'advanced';
    if (cell.status === 'reschedule_requested') return 'reschedule';
    if (cell.status === 'completed') return 'pending';
    return 'waiting';
  };
  const filterCounts = useMemo(() => {
    const c = { all: rows.length, pending: 0, advanced: 0, rejected: 0,
                reschedule: 0, waiting: 0 };
    rows.forEach((r) => { c[bucketOf(r.cell)] += 1; });
    return c;
  }, [rows]);
  const filteredRows = useMemo(
    () => (roundFilter === 'all' ? rows
      : rows.filter((r) => bucketOf(r.cell) === roundFilter)),
    [rows, roundFilter]);
  useEffect(() => { setRoundFilter('all'); setSelected(new Set()); },
    [currentRound]);

  const isRemovedTab = useMemo(
    () => removedRounds.some((r) => String(r.id) === String(currentRound)),
    [removedRounds, currentRound]);

  const activeRemoved = useMemo(
    () => removedRounds.find((r) => String(r.id) === String(currentRound)) || null,
    [removedRounds, currentRound]);
  const currentRoundType = useMemo(() => {
    const act = activeRounds.find((r) => String(r.id) === String(currentRound));
    if (act) return act.round_type;
    const rem = removedRounds.find((r) => String(r.id) === String(currentRound));
    return rem ? rem.round_type : '';
  }, [activeRounds, removedRounds, currentRound]);

  useEffect(() => {
    if (currentRoundType !== 'live-video') return undefined;
    const t = setInterval(() => setLiveNow(Date.now()), 15000);
    const p = setInterval(() => { refreshDetail(); }, 20000);
    return () => { clearInterval(t); clearInterval(p); };
  }, [currentRoundType, refreshDetail]);

  const currentRoundNo = useMemo(() => {
    const act = activeRounds.find((r) => String(r.id) === String(currentRound));
    if (act) return act.round_number;
    const rem = removedRounds.find((r) => String(r.id) === String(currentRound));
    return rem ? rem.original_number : null;
  }, [activeRounds, removedRounds, currentRound]);

  const _extractScore = (d) =>
    d?.round_status?.cgps_score
    ?? d?.ai_scores?.overall
    ?? d?.live_result?.overall_score
    ?? d?.aptitude_result?.score_010
    ?? d?.document_result?.avg_score
    ?? null;
  useEffect(() => {
    if (!selectedPipelineId || !members.length) return;
    const targets = [];
    const roundNoOf = {};
    activeRounds.forEach((r) => { roundNoOf[String(r.id)] = r.round_number; });
    removedRounds.forEach((r) => { roundNoOf[String(r.id)] = r.original_number; });
    members.forEach((m) => {
      const cellsets = [m.rounds || {}, m.removed_rounds || {}];
      cellsets.forEach((set) => Object.entries(set).forEach(([rcId, c]) => {
        if (!c) return;
        const rn = roundNoOf[String(rcId)];
        if (rn == null) return;
        const attempted = ['completed', 'partial', 'rejected'].includes(c.status)
          || c.decision === 'approved';
        const key = `${m.candidate_id}:${rn}`;
        if (attempted && c.score == null && !(key in scoreCache)) {
          targets.push({ cid: m.candidate_id, rn, key });
        }
      }));
    });
    if (!targets.length) return;
    let cancelled = false;
    (async () => {
      const updates = {};
      await Promise.all(targets.slice(0, 16).map(async (t) => {
        try {
          const res = await rankedResultsService.getCandidateScoreDetail(
            selectedPipelineId, t.rn, t.cid);
          updates[t.key] = _extractScore(res?.data);
        } catch {
          updates[t.key] = null;
        }
      }));
      if (!cancelled && Object.keys(updates).length) {
        setScoreCache((prev) => ({ ...prev, ...updates }));
      }
    })();
    return () => { cancelled = true; };
  }, [members, activeRounds, removedRounds, selectedPipelineId, scoreCache]);

  /* ── 📄 Report column click ── */
  const openReport = async (m) => {
    const roundLabel = isRemovedTab && activeRemoved
      ? `R${activeRemoved.original_number} · ${activeRemoved.name} — CUT OFF`
      : (() => {
          const rc = activeRounds.find((r) => String(r.id) === String(currentRound));
          const slot = rc ? (rc.original_number ?? rc.round_number) : currentRoundNo;
          return rc ? `R${slot} · ${rc.name}` : `Round ${slot ?? ''}`;
        })();
    setReportDlg({ candidate: m, roundLabel, loading: true, data: null, error: null });
    try {
      const res = await rankedResultsService.getCandidateScoreDetail(
        selectedPipelineId, currentRoundNo, m.candidate_id);
      setReportDlg((d) => d && ({ ...d, loading: false, data: res?.data || null }));
      const sc = _extractScore(res?.data);
      setScoreCache((prev) => ({ ...prev, [`${m.candidate_id}:${currentRoundNo}`]: sc }));
    } catch (err) {
      setReportDlg((d) => d && ({
        ...d, loading: false,
        error: err?.response?.status === 404
          ? 'No report found for this candidate at this round.'
          : 'Failed to load the score report.',
      }));
    }
  };

  const openPreview = async (m, existingDetail = null) => {
    const roundLabel = isRemovedTab && activeRemoved
      ? `R${activeRemoved.original_number} · ${activeRemoved.name} — CUT OFF`
      : (() => {
          const rc = activeRounds.find((r) => String(r.id) === String(currentRound));
          const slot = rc ? (rc.original_number ?? rc.round_number) : currentRoundNo;
          return rc ? `R${slot} · ${rc.name}` : `Round ${slot ?? ''}`;
        })();

    setPreviewDlg((prev) => {
      if (prev?.blobUrl) { try { URL.revokeObjectURL(prev.blobUrl); } catch {} }
      return { candidate: m, roundLabel, loading: true, blobUrl: null,
               blobType: null, source: null, error: null,
               siId: m.cell?.si_id ?? m.si_id ?? null };
    });
    try {
      const { url, type, source, data: formData } = await rankedResultsService.getReportBlobUrl({
        processId: selectedPipelineId,
        roundNumber: currentRoundNo,
        candidateId: m.candidate_id,
        siId: m.cell?.si_id ?? m.si_id ?? null,
        scoreDetail: existingDetail,
      });
      setPreviewDlg((d) => d && ({
        ...d, loading: false, blobUrl: url, blobType: type, source, formData: formData || null,
      }));
    } catch (err) {
      setPreviewDlg((d) => d && ({
        ...d, loading: false,
        error: err?.message
            || (err?.response?.status === 404
                ? 'No report has been generated for this candidate yet.'
                : 'Failed to load the report preview.'),
      }));
    }
  };

  const closePreview = () => {
    setPreviewDlg((prev) => {
      if (prev?.blobUrl) { try { URL.revokeObjectURL(prev.blobUrl); } catch {} }
      return null;
    });
  };

  const _previewBlobRef = useRef(null);
  useEffect(() => { _previewBlobRef.current = previewDlg?.blobUrl || null; },
    [previewDlg]);
  useEffect(() => () => {
    if (_previewBlobRef.current) {
      try { URL.revokeObjectURL(_previewBlobRef.current); } catch {}
    }
  }, []);
                
  const [decideBusy, setDecideBusy] = useState(null);
  const [confirmDlg, setConfirmDlg] = useState({
    open: false, action: null, ids: [], names: [],
  });

  const requestDecision = (action, ids) => {
    if (decideBusy) return;
    if (!ids || !ids.length) {
      enqueueSnackbar(
        action === 'reject'
          ? 'No selected candidate can be rejected at this stage.'
          : 'No selected candidate has completed this round yet.',
        { variant:'info' });
      return;
    }
    // Resolve candidate names for the confirmation dialog
    const nameMap = {};
    (rows || []).forEach(m => { if (m.candidate_id) nameMap[m.candidate_id] = m.name || m.email || `#${m.candidate_id}`; });
    const names = ids.map(id => nameMap[id] || `#${id}`);
    setConfirmDlg({ open: true, action, ids, names });
  };

  const executeDecision = async () => {
    const { action, ids } = confirmDlg;
    setConfirmDlg(s => ({ ...s, open: false }));
    if (!ids?.length) return;

    setDecideBusy({ action, ids: new Set(ids) });
    try {
     
      // Explicit is better.)
      const report = action === 'approve'
        ? await approve(currentRound, ids)
        : action === 'hold'
        ? await hold(currentRound, ids)
        : action === 'hire'
        ? await hire(currentRound, ids)
        : await reject(currentRound, ids);
      setSelected(new Set());
      if (report && typeof report.applied === 'number') {
        setSkipReport({ ...report, action });
        enqueueSnackbar(
          action === 'approve'
            ? `✓ ${report.applied} candidate(s) approved.`
            : action === 'hold'
            ? `⏳ ${report.applied} candidate(s) moved to Pending Candidates.`
            : action === 'hire'
            ? `✓ ${report.applied} candidate(s) hired!`
            : `✕ ${report.applied} candidate(s) rejected.`,
          { variant: action === 'reject' ? 'warning' : 'success' });
      } else {
        // Unexpected response shape must still FEEL like something happened.
        enqueueSnackbar('✓ Decision saved.', { variant: 'success' });
      }
    } catch (err) {
      const detail = err?.code === 'ECONNABORTED'
        ? 'The server did not respond within 15s — is the backend running?'
        : err?.response?.status === 502
          ? 'Backend unreachable (502) — it is down or restarting.'
          : err?.response?.data?.detail
            || (err?.response?.status ? `server returned ${err.response.status}`
                : err?.message)
            || 'Decision failed';
      enqueueSnackbar(`Decision failed — ${detail}`,
        { variant: 'error', autoHideDuration: 8000 });
    } finally {
      setDecideBusy(null);
    }
  };

  const handleApplyReschedule = async (rcId, ws, we) => {
    try {
      const res = await applyReschedule(rcId, new Date(ws).toISOString(),
                                        new Date(we).toISOString());
      setReschedOpen(false);
      enqueueSnackbar(
        `🔁 ${res?.applied || 0} candidate(s) rescheduled — they resume from this round only.`,
        { variant:'success' });
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.detail || 'Reschedule failed', { variant:'error' });
    }
  };

  const handleDelete = async () => {
    if (!deleteDlg || deleting) return;
    setDeleting(true);
    try {
      await deletePipeline(deleteDlg.id);
      enqueueSnackbar(`Deleted “${deleteDlg.name}”`, { variant:'success' });
    } catch { enqueueSnackbar('Delete failed', { variant:'error' }); }
    setDeleteDlg(null); setDeleting(false);
  };
  // BUILD: 2026-08-04-soft-delete-jobs ────────────────────────────────
  const handleSoftDeleteJob = async () => {
    if (!jobDeleteDlg || jobDeleting) return;
    setJobDeleting(true);
    try {
      if (jobDeleteDlg === 'bulk') {
        // Resolve job keys → jobIds for bulk call
        const jobIds = [...selectedJobs]
          .map((key) => {
            const j = jobs.find((j) => String(j.key) === String(key));
            return j?.jobId;
          })
          .filter(Boolean);
        if (jobIds.length) {
          await bulkSoftDeleteJobs(jobIds);
          enqueueSnackbar(`${jobIds.length} job(s) removed from view.`, { variant: 'success' });
        }
        setSelectedJobs(new Set());
      } else {
        const j = jobs.find((j) => String(j.key) === String(jobDeleteDlg.jobKey));
        if (j?.jobId) {
          await softDeleteJob(j.jobId);
          enqueueSnackbar(`"${j.jobTitle}" removed from view.`, { variant: 'success' });
        }
      }
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.detail || 'Failed to remove.', { variant: 'error' });
    }
    setJobDeleteDlg(null);
    setJobDeleting(false);
  };

  const toggleJobSelect = (jobKey) => {
    setSelectedJobs((prev) => {
      const next = new Set(prev);
      if (next.has(jobKey)) next.delete(jobKey); else next.add(jobKey);
      return next;
    });
  };

  /* ── loading / error ─────────────────────────────────────────────── */
  if (loading) return (
    <Box className="page-fade-in" sx={{ p:{ xs:1.5, sm:2, md:3, lg:4 }, maxWidth:1440,
      mx:'auto', bgcolor:B.bg, minHeight:'100vh', fontFamily:FONT }}>
      <Paper elevation={0} sx={{ bgcolor:B.surface, border:`1px solid ${B.border}`,
        borderRadius:'16px', p:3, mb:2.5 }}>
        <Skeleton width="40%" height={36} /><Skeleton width="30%" height={20} sx={{ mt:1 }} />
      </Paper>
      {[0,1,2].map((i) => (
        <Skeleton key={i} variant="rounded" height={60}
          sx={{ borderRadius:'14px', mb:1.25 }} />
      ))}
    </Box>
  );

  if (error) return (
    <Box sx={{ p:4, textAlign:'center', fontFamily:FONT }}>
      <Typography sx={{ color:B.danger, mb:2, fontWeight:700 }}>{error}</Typography>
      <Button startIcon={<Refresh />} onClick={refresh} variant="outlined"
        sx={{ borderRadius:'10px', textTransform:'none', borderColor:B.border,
          color:B.pine, '&:hover':{ bgcolor:B.sageSoft } }}>Try Again</Button>
    </Box>
  );

  const shell = (children) => (
    <Box className="page-fade-in" sx={{ p:{ xs:1.5, sm:2, md:3, lg:4 }, maxWidth:1440,
      mx:'auto', bgcolor:B.bg, minHeight:'100vh', fontFamily:FONT,
      '& .MuiTypography-root, & .MuiButton-root, & .MuiChip-root, & .MuiInputBase-root, & .MuiMenuItem-root, & .MuiPaginationItem-root':
        { fontFamily:FONT } }}>
      {children}
    </Box>
  );

  /* ══════════ LEVEL 3 — pipeline detail ══════════ */
  if (selectedPipelineId && selectedPipeline) {
    const p = selectedPipeline;
    const edit = describeEdit(p);
    const nextR = nextRoundAfter(currentRound);
    const finalR = isFinalRound(currentRound);
    const nextRForMember = (m) =>
      (m.cell && m.cell.is_grandfathered)
        ? nextRoundAfter(currentRound, m)
        : nextR;
    const approvableIds = new Set(
      rows.filter((m) => canApproveMember(m, m.cell, activeRounds, currentRound))
          .map((m) => m.candidate_id));
    const rejectableIds = new Set(
      rows.filter((m) => canRejectMember(m, m.cell, activeRounds, currentRound))
          .map((m) => m.candidate_id));
    const decidableIds = rejectableIds;
    const selApprove = [...selected].filter((id) => approvableIds.has(id));
    const selReject  = [...selected].filter((id) => rejectableIds.has(id));
    const allChecked = decidableIds.size > 0 && selected.size === decidableIds.size;
    return shell(
      <>
        <Paper elevation={0} sx={{ bgcolor:B.surface, border:`1px solid ${B.border}`,
          borderRadius:{ xs:'14px', sm:'16px' }, p:{ xs:2, sm:2.5, md:3 },
          mb:{ xs:2, md:2.5 }, boxShadow:'0 1px 2px rgba(16,18,16,0.04)' }}>
          <Stack direction="row" sx={{ alignItems:'center', gap:1.5, mb:1 }}>
            <Tooltip title="Back to pipelines" arrow>
              <IconButton size="small"
                onClick={() => navigate(p.jobId
                  ? `/employer/ranked-results/job/${p.jobId}`
                  : '/employer/ranked-results')}
                sx={{ color:B.muted, border:`1px solid ${B.borderS}`, borderRadius:'9px',
                  '&:hover':{ bgcolor:B.sageSoft, color:B.pine, borderColor:B.sage } }}>
                <ArrowBack sx={{ fontSize:18 }} />
              </IconButton>
            </Tooltip>
            <Box sx={{ minWidth:0, flex:1 }}>
              <Typography component="h1" sx={{ fontWeight:700, color:B.ink,
                letterSpacing:'-0.02em', lineHeight:1.15,
                fontSize:{ xs:'1.2rem', sm:'1.35rem', md:'1.5rem' } }}>
                {p.name} — {p.jobTitle}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt:0.5, alignItems:'center',
                flexWrap:'wrap', rowGap:0.5 }}>
                <Box sx={{ display:'inline-flex', alignItems:'center', gap:0.3, px:0.7,
                  py:0.2, borderRadius:'6px',
                  bgcolor: p.is_active ? B.doneSoft : B.dangerSoft,
                  color: p.is_active ? B.done : B.danger, fontSize:'0.62rem',
                  fontWeight:800, textTransform:'uppercase', letterSpacing:'0.04em' }}>
                  {p.is_active ? <><CheckCircle sx={{ fontSize:10 }} /> Active</>
                               : <><Lock sx={{ fontSize:10 }} /> Closed</>}
                </Box>
                <Typography sx={{ fontSize:'0.82rem', color:B.muted }}>
                  {p.memberCount != null
                    ? `${p.memberCount} candidate${p.memberCount !== 1 ? 's' : ''} in this pipeline only`
                    : 'candidates in this pipeline only'}
                  {' '}· created {fmtDate(p.created_at)}
                </Typography>
                {edit && (
                  <Typography sx={{ fontSize:'0.82rem', color:B.danger, fontWeight:800 }}>
                    · {edit}
                  </Typography>
                )}
              </Stack>
            </Box>
            <Tooltip title="Edit pipeline — add or remove rounds. If you remove a round, candidates already in it will still finish it; new candidates won't see it." arrow>
              <span>
                <Button size="small" variant="outlined" disabled={!p.is_active}
                  onClick={() => setManageDialog({ open:true, process:p })}
                  sx={{ textTransform:'none', fontWeight:700, fontSize:'0.76rem',
                    borderRadius:'9px', color:B.pine, borderColor:B.borderS,
                    '&:hover':{ bgcolor:B.sageSoft, borderColor:B.sage } }}>
                  🛠 Edit Pipeline
                </Button>
              </span>
            </Tooltip>
            <Tooltip title="Refresh" arrow><span>
              <IconButton size="small" onClick={refreshDetail}
                sx={{ color:B.muted, border:`1px solid ${B.borderS}`, borderRadius:'9px',
                  '&:hover':{ bgcolor:B.sageSoft, color:B.pine, borderColor:B.sage } }}>
                <Refresh sx={{ fontSize:18 }} />
              </IconButton>
            </span></Tooltip>
          </Stack>

          <RoundTabs activeRounds={activeRounds} removedRounds={removedRounds}
            current={currentRound} onPick={(id) => { setCurrentRound(id); setSelected(new Set()); }}
            reschedule={reschedule} />

          
          <Stack direction="row" sx={{ alignItems:'center', gap:1, flexWrap:'wrap',
            p:1.25, bgcolor:B.bg, borderRadius:'12px', border:`1px solid ${B.border}` }}>
            <Stack direction="row" spacing={0.75} sx={{ ml:'auto', flexWrap:'wrap',
              rowGap:0.75 }}>
              <Button size="small" variant="contained" disableElevation
                disabled={!rescheduleCount || acting} onClick={() => setReschedOpen(true)}
                startIcon={<Box component="span" sx={{ fontSize:16, lineHeight:1 }}>🔁</Box>}
                sx={{ bgcolor:B.amber, '&:hover':{ bgcolor:'#7E4522' }, textTransform:'none',
                  fontWeight:700, borderRadius:'9px', fontSize:'0.76rem' }}>
                Reschedule Requests{rescheduleCount ? ` (${rescheduleCount})` : ''}
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {/* removed-round banner (R6) */}
        {isRemovedTab && activeRemoved && (
          <Alert severity="warning" icon={false}
            sx={{ mb:2, borderRadius:'12px', bgcolor:B.amberSoft, color:B.amber,
              border:`1px dashed ${B.amber}`, fontSize:'0.82rem', fontFamily:FONT }}>
            ⚠ <strong>This pipeline was {edit || `reduced to ${p.roundsCount} rounds from ${p.originalRoundsCount}`}</strong>
            {' '}— {roundIcon(activeRemoved.round_type)} <strong>{activeRemoved.name}</strong>{' '}
            (was R{activeRemoved.original_number}) removed on {fmtDate(activeRemoved.removed_on)}.{' '}
            <strong>Candidates already in this round continue the SAME flow here</strong> — hire,
            reschedule, edit and reject all still work. <strong>New candidates never see it.</strong>
          </Alert>
        )}

        {/* members table */}
        <Card elevation={0} sx={{ border:`1px solid ${B.border}`, borderRadius:'14px',
          bgcolor:B.surface, p:{ xs:1.25, sm:1.75, md:2 } }}>
          {detailLoading ? (
            [0,1,2].map((i) => (
              <Skeleton key={i} variant="rounded" height={56}
                sx={{ borderRadius:'12px', mb:1 }} />
            ))
          ) : rows.length === 0 ? (
            <Box sx={{ textAlign:'center', py:5 }}>
              <BarChart sx={{ fontSize:40, color:B.border, mb:1 }} />
              <Typography sx={{ color:B.ink, fontWeight:700, fontSize:'0.98rem' }}>
                {membersUnavailable
                  ? 'Pipeline members not available yet'
                  : isRemovedTab
                    ? 'No candidate was in this round when it was removed'
                    : currentRoundType === 'live-video'
                      ? 'No live interview scheduled yet'
                      : 'No candidate has reached this round yet'}
              </Typography>
              <Typography sx={{ color:B.muted, fontSize:'0.84rem', mt:0.5 }}>
                {membersUnavailable
                  ? 'This view reads the pipeline-members endpoint from the multi-pipeline backend. Deploy it to load candidates, decisions and reschedule requests here.'
                  : isRemovedTab
                    ? 'New candidates will never see it.'
                    : currentRoundType === 'live-video'
                      ? 'Candidates appear here as soon as they are approved into this round and book / are scheduled for a live interview slot.'
                      : 'They appear here once the previous round is approved.'}
              </Typography>
            </Box>
          ) : (
            <>
              {/* ── decision filters (per round) ── */}
              <Stack direction="row" spacing={0.75}
                sx={{ mb:1.5, flexWrap:'wrap', rowGap:0.75 }}>
                {[
                  { k:'all',        label:'All' },
                  { k:'pending',    label:'⏳ Pending decision' },
                  { k:'advanced',   label:'➡ Advanced' },
                  { k:'rejected',   label:'❌ Rejected' },
                  { k:'reschedule', label:'🔁 Reschedule' },
                  { k:'waiting',    label:'🕐 Not attempted' },
                ].map(({ k, label }) => (
                  <Box key={k} role="button" tabIndex={0}
                    onClick={() => setRoundFilter(k)}
                    sx={{ px:1.4, py:0.55, borderRadius:'999px',
                      cursor:'pointer', userSelect:'none',
                      fontSize:'0.74rem', fontWeight:700, fontFamily:FONT,
                      display:'inline-flex', alignItems:'center', gap:0.6,
                      bgcolor: roundFilter === k ? B.pine : B.surface,
                      color:   roundFilter === k ? '#fff' : B.body,
                      border:`1px solid ${roundFilter === k ? B.pine : B.borderS}`,
                      opacity: filterCounts[k] === 0 && k !== 'all' ? 0.45 : 1,
                      transition:'all 0.15s ease',
                      '&:hover':{ borderColor:B.sage,
                        bgcolor: roundFilter === k ? B.pine : B.sageSoft } }}>
                    {label}
                    <Box component="span" sx={{ px:0.7, py:0.05,
                      borderRadius:'999px', fontSize:'0.66rem', fontWeight:800,
                      bgcolor: roundFilter === k ? 'rgba(255,255,255,0.22)' : B.bg,
                      color:   roundFilter === k ? '#fff' : B.muted }}>
                      {filterCounts[k]}
                    </Box>
                  </Box>
                ))}
              </Stack>

              <Box sx={{ display:{ xs:'none', md:'grid' },
                gridTemplateColumns: ROW_GRID.md, columnGap:1.25, px:1.75,
                pb:0.75 }}>
                {[
                  { h:'Candidate', align:'left'   },
                  { h:'Status',    align:'left'   },
                  { h:'Score',     align:'center' },
                  { h:'Report',    align:'center' },
                  { h:'Actions',   align:'right'  },
                ].map(({ h, align }, i) => (
                  <Typography key={h || i} sx={{ fontSize:'0.66rem', fontWeight:800,
                    color:B.faint, textTransform:'uppercase', letterSpacing:'0.06em',
                    textAlign:align }}>
                    {h}
                  </Typography>
                ))}
              </Box>
              {rows.length > 0 && filteredRows.length === 0 && (
                <Box sx={{ textAlign:'center', py:4 }}>
                  <Typography sx={{ color:B.muted, fontSize:'0.86rem',
                    fontFamily:FONT }}>
                    No candidates match this filter in this round.
                  </Typography>
                </Box>
              )}
              {filteredRows.map((m) => (
                <MemberRow key={m.candidate_id} m={m} busy={acting}
                  decideBusy={decideBusy}
                  resolvedScore={scoreCache[`${m.candidate_id}:${currentRoundNo}`]}
                  onOpenReport={openReport}
                  onOpenPreview={openPreview}
                  onOpenProfile={(row) => setProfileDlg(row)}
                  roundType={currentRoundType}
                  liveNow={liveNow}
                  checked={selected.has(m.candidate_id)}
                  onCheck={(on) => setSelected((prev) => {
                    const next = new Set(prev);
                    if (on) next.add(m.candidate_id); else next.delete(m.candidate_id);
                    return next;
                  })}
                  isFinal={finalR} nextRound={nextRForMember(m)} onDecide={requestDecision}
                  canApprove={approvableIds.has(m.candidate_id)}
                  canReject={rejectableIds.has(m.candidate_id)} />
              ))}
            </>
          )}
        </Card>


        {/* ── Decision Confirmation Dialog ─────────────────────────────── */}
        <Dialog
          open={confirmDlg.open}
          onClose={() => setConfirmDlg(s => ({ ...s, open: false }))}
          maxWidth="xs" fullWidth
          slotProps={{ paper: { sx: {
            borderRadius: '16px', overflow: 'hidden', fontFamily: FONT,
            border: `1px solid ${B.border}`,
            boxShadow: '0 20px 56px -12px rgba(2,33,36,0.22)',
          } } }}
        >
          {(() => {
            const a = confirmDlg.action;
            const count = confirmDlg.ids?.length || 0;
            const cfg = {
              approve: (() => {
                const _mem = confirmDlg.ids?.length === 1
                  ? rows.find((r) => r.candidate_id === confirmDlg.ids[0])
                  : null;
                const _nx = (_mem && _mem.cell && _mem.cell.is_grandfathered)
                  ? nextRoundAfter(currentRound, _mem)
                  : nextR;
                return { verb: 'Approve', past: 'approved', icon: '✓',
                         headerBg: `linear-gradient(135deg, ${B.done} 0%, #2B5B2B 100%)`,
                         accent: B.done, desc: _nx
                           ? `will be approved and advanced to Round ${_nx.original_number ?? _nx.round_number} of the interview pipeline`
                           : 'will be approved and advanced to the next stage of the interview pipeline' };
              })(),
              hold:    { verb: 'Hold', past: 'held', icon: '⏳',
                         headerBg: `linear-gradient(135deg, ${B.amber} 0%, #7E4522 100%)`,
                         accent: B.amber,
                         desc: 'will be placed on hold and moved to the Pending Candidates queue for review at a later stage' },
              hire:    { verb: 'Hire', past: 'hired', icon: '✅',
                         headerBg: `linear-gradient(135deg, ${B.done} 0%, #1A4A1A 100%)`,
                         accent: B.done,
                         desc: 'will be confirmed as a final hire and added to the Final Hire list' },
              reject:  { verb: 'Reject', past: 'rejected', icon: '✕',
                         headerBg: `linear-gradient(135deg, ${B.danger} 0%, #6B2820 100%)`,
                         accent: B.danger,
                         desc: 'will be permanently removed from consideration for this position' },
            }[a] || { verb: a, past: a, icon: '?',
                      headerBg: B.pine, accent: B.pine, desc: '' };
            return (<>
              <Box sx={{ background: cfg.headerBg, px: 3, py: 2 }}>
                <Typography sx={{ color: '#fff', fontWeight: 800,
                  fontSize: '1.02rem', fontFamily: FONT }}>
                  {cfg.icon} Confirm {cfg.verb}
                </Typography>
              </Box>
              <Box sx={{ px: 3, py: 2.5 }}>
                <Typography sx={{ fontSize: '0.9rem', color: B.ink,
                  fontWeight: 600, fontFamily: FONT, lineHeight: 1.6, mb: 2 }}>
                  <strong>{count} candidate{count !== 1 ? 's' : ''}</strong> {cfg.desc}.
                </Typography>

                {count <= 8 && (
                  <Box sx={{ borderRadius: '10px', border: `1px solid ${B.border}`,
                    maxHeight: 160, overflowY: 'auto', mb: 2,
                    '&::-webkit-scrollbar': { width: 4 },
                    '&::-webkit-scrollbar-thumb': { bgcolor: B.borderS, borderRadius: 2 } }}>
                    {(confirmDlg.names || []).map((nm, i) => (
                      <Box key={i} sx={{ px: 1.5, py: 0.85, display: 'flex',
                        alignItems: 'center', gap: 1,
                        borderBottom: i < count - 1
                          ? `1px solid ${B.border}` : 'none' }}>
                        <Box sx={{ width: 24, height: 24, borderRadius: '50%',
                          bgcolor: B.pine, color: '#fff', display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.6rem', fontWeight: 800, flexShrink: 0 }}>
                          {nm.split(' ').filter(Boolean).slice(0, 2)
                            .map(w => w[0]).join('').toUpperCase() || '?'}
                        </Box>
                        <Typography noWrap sx={{ fontSize: '0.82rem',
                          color: B.ink, fontWeight: 600, fontFamily: FONT }}>
                          {nm}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}

                {a === 'reject' && (
                  <Typography sx={{ fontSize: '0.76rem', color: B.danger,
                    fontFamily: FONT, fontWeight: 600 }}>
                    This decision is final and cannot be reversed. Please review carefully before confirming.
                  </Typography>
                )}
                {a === 'hire' && (
                  <Typography sx={{ fontSize: '0.76rem', color: B.done,
                    fontFamily: FONT, fontWeight: 600 }}>
                    A hiring record will be generated automatically, and the candidate will be listed under Final Hire.
                  </Typography>
                )}
              </Box>
              <Box sx={{ px: 3, pb: 2.25, display: 'flex',
                justifyContent: 'flex-end', gap: 1.25 }}>
                <Button
                  onClick={() => setConfirmDlg(s => ({ ...s, open: false }))}
                  sx={{ textTransform: 'none', color: B.muted,
                    fontFamily: FONT, fontSize: '0.84rem' }}>
                  Cancel
                </Button>
                <Button variant="contained" disableElevation
                  onClick={executeDecision}
                  sx={{ textTransform: 'none', fontFamily: FONT,
                    fontWeight: 700, fontSize: '0.86rem',
                    borderRadius: '10px', px: 2.5,
                    bgcolor: cfg.accent,
                    '&:hover': { bgcolor: cfg.accent, filter: 'brightness(0.88)' } }}>
                  {cfg.verb} {count > 1 ? `(${count})` : ''}
                </Button>
              </Box>
            </>);
          })()}
        </Dialog>

        <RescheduleDialog open={reschedOpen} onClose={() => setReschedOpen(false)}
          groups={reschedule?.rounds || []} onApply={handleApplyReschedule} busy={acting} />
        <SkipReportDialog report={skipReport} onClose={() => setSkipReport(null)} />
        <ScoreReportDialog report={reportDlg}
          onOpenPreview={(candidate) => {
       
            const detail = reportDlg?.data || null;
            setReportDlg(null);
            openPreview(candidate, detail);
          }}
          onClose={() => setReportDlg(null)} />
        <ReportPreviewDialog state={previewDlg}
          onOpenSummary={(candidate) => {
      
            closePreview();
            if (candidate) openReport(candidate);
          }}
          onClose={closePreview} />
        <CandidateProfileDialog m={profileDlg} rounds={activeRounds}
          removedRoundsList={removedRounds} scoreCache={scoreCache}
          onClose={() => setProfileDlg(null)} onViewReport={openReport}
          onViewPreview={openPreview} />
        {manageDialog.open && (
          <EditPipelineWizard process={manageDialog.process}
            onClose={() => setManageDialog({ open:false, process:null })}
            onDone={async () => { await refresh(); await refreshDetail(); }} />
        )}
        <Box sx={{ pb:4 }} />
      </>
    );
  }

  /* ══════════ LEVEL 2 — pipelines of one job ══════════ */
  if (jobId) {
    const job = jobs.find((j) => String(j.jobId) === String(jobId)
                             || String(j.key) === String(jobId));
    const list = pipelinesForJob(jobId);
    return shell(
      <>
        <Paper elevation={0} sx={{ bgcolor:B.surface, border:`1px solid ${B.border}`,
          borderRadius:{ xs:'14px', sm:'16px' }, p:{ xs:2, sm:2.5, md:3 },
          mb:{ xs:2, md:2.5 } }}>
          <Stack direction="row" sx={{ alignItems:'center', gap:1.5 }}>
            <Tooltip title="Back to jobs" arrow>
              <IconButton size="small" onClick={() => navigate('/employer/ranked-results')}
                sx={{ color:B.muted, border:`1px solid ${B.borderS}`, borderRadius:'9px',
                  '&:hover':{ bgcolor:B.sageSoft, color:B.pine, borderColor:B.sage } }}>
                <ArrowBack sx={{ fontSize:18 }} />
              </IconButton>
            </Tooltip>
            <Box sx={{ minWidth:0, flex:1 }}>
              <Typography component="h1" sx={{ fontWeight:700, color:B.ink,
                letterSpacing:'-0.02em', fontSize:{ xs:'1.25rem', md:'1.5rem' } }}>
                {job?.jobTitle || 'Job'} — {list.length} pipeline{list.length !== 1 ? 's' : ''}
              </Typography>
              <Typography sx={{ color:B.muted, fontSize:'0.85rem', mt:0.5 }}>
                One job can hold many pipelines — each is a frozen batch of the candidates
                who existed when it was created.
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" sx={{ gap:0.75, mt:2, flexWrap:'wrap' }}>
            {[{ v:'all', l:'All' }, { v:'active', l:'Active' }, { v:'closed', l:'Closed' }]
              .map((o) => {
                const sel = statusFilter === o.v; const cc = CHIP_COLORS[o.v];
                return (
                  <Box key={o.v} role="button" tabIndex={0} onClick={() => setStatusFilter(o.v)}
                    sx={{ cursor:'pointer', userSelect:'none', px:1.5, py:0.65,
                      borderRadius:999, fontSize:'0.8rem', fontWeight: sel ? 700 : 600,
                      ...(sel ? { bgcolor: o.v === 'all' ? B.pine : cc.soft,
                                  color: o.v === 'all' ? '#fff' : cc.ink,
                                  border:`1px solid ${cc.tint}` }
                              : { bgcolor:B.surface, color:B.muted,
                                  border:`1px solid ${B.borderS}` }) }}>
                    {o.l}
                  </Box>
                );
              })}
          </Stack>
        </Paper>

        {list.length === 0 ? (
          <Box sx={{ textAlign:'center', py:6, bgcolor:B.surface, borderRadius:'16px',
            border:`1px dashed ${B.borderS}` }}>
            <BarChart sx={{ fontSize:44, color:B.border, mb:1.5 }} />
            <Typography sx={{ color:B.ink, fontWeight:700 }}>No pipelines here</Typography>
            <Typography sx={{ color:B.muted, fontSize:'0.875rem' }}>
              Create one from the Candidates page.
            </Typography>
          </Box>
        ) : list.map((p) => (
          <PipelineCard key={p.id} p={p}
            onOpen={(pl) => navigate(`/employer/ranked-results/${pl.id}`)}
            onDelete={setDeleteDlg}
            onEdit={(pl) => setManageDialog({ open:true, process:pl })} />
        ))}

        <Dialog open={!!deleteDlg} onClose={() => !deleting && setDeleteDlg(null)}
          maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius:'16px' }  } }}>
          <DialogTitle sx={{ fontFamily:FONT, fontWeight:800 }}>Delete Pipeline</DialogTitle>
          <DialogContent>
            <Typography sx={{ fontSize:'0.85rem', color:B.body, fontFamily:FONT }}>
              Permanently delete <strong>{deleteDlg?.name}</strong>? This removes its rounds,
              interviews, rankings and slots.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px:3, pb:2 }}>
            <Button onClick={() => setDeleteDlg(null)} disabled={deleting}
              sx={{ textTransform:'none', color:B.muted, fontFamily:FONT }}>Cancel</Button>
            <Button variant="contained" disableElevation disabled={deleting}
              onClick={handleDelete}
              sx={{ bgcolor:B.danger, '&:hover':{ bgcolor:'#8C3225' }, textTransform:'none',
                fontWeight:700, borderRadius:'10px', fontFamily:FONT }}>
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>
        {manageDialog.open && (
          <EditPipelineWizard process={manageDialog.process}
            onClose={() => setManageDialog({ open:false, process:null })}
            onDone={refresh} />
        )}
        <Box sx={{ pb:4 }} />
      </>
    );
  }

 /* ══════════ LEVEL 1 — jobs ══════════ */
  const effectiveSize = pageSize === 'all' ? Math.max(filteredJobs.length, 1) : pageSize;
  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / effectiveSize));
  const paged = filteredJobs.slice((page - 1) * effectiveSize, page * effectiveSize);

  // BUILD: 2026-08-04-soft-delete-jobs — must be after paged is defined
  const allJobsSelected = paged.length > 0 && paged.every((j) => selectedJobs.has(j.key));
  const someJobsSelected = selectedJobs.size > 0;

  return shell(
    <>
      <Paper elevation={0} sx={{ bgcolor:B.surface, border:`1px solid ${B.border}`,
        borderRadius:{ xs:'14px', sm:'16px' }, p:{ xs:2, sm:2.5, md:3 },
        mb:{ xs:2, md:2.5 }, boxShadow:'0 1px 2px rgba(16,18,16,0.04)' }}>
        <Stack direction="row" sx={{ alignItems:'flex-start', justifyContent:'space-between',
          gap:1.5, mb:{ xs:2, md:2.25 } }}>
          <Box sx={{ minWidth:0 }}>
            <Typography component="h1" sx={{ fontWeight:700, color:B.ink,
              letterSpacing:'-0.02em', fontSize:{ xs:'1.3rem', sm:'1.45rem', md:'1.6rem' } }}>
              Ranked Results
            </Typography>
            <Typography sx={{ color:B.muted, fontSize:{ xs:'0.82rem', sm:'0.9rem' },
              fontWeight:500, mt:0.5 }}>
              <Box component="span" sx={{ color:B.sageText, fontWeight:700 }}>
                {stats.jobs} job{stats.jobs !== 1 ? 's' : ''}
              </Box>{' '}· {stats.total} pipelines · {stats.totalRounds} rounds
              {stats.grandfathered > 0 && (
                <Box component="span" sx={{ color:B.blue, fontWeight:700 }}>
                  {' '}· {stats.grandfathered} in {stats.grandfathered === 1 ? 'a removed round' : 'removed rounds'}
                </Box>
              )}
            </Typography>
          </Box>
          <Tooltip title="Refresh" arrow><span>
            <IconButton onClick={refresh} size="small"
              sx={{ color:B.muted, border:`1px solid ${B.borderS}`, borderRadius:'9px',
                '&:hover':{ bgcolor:B.sageSoft, color:B.pine, borderColor:B.sage } }}>
              <Refresh sx={{ fontSize:18 }} />
            </IconButton>
          </span></Tooltip>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ alignItems:'stretch', flexWrap:'wrap', gap:1 }}>
          <TextField placeholder="Search by job title…" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            slotProps={{ input:{
              startAdornment:(
                <InputAdornment position="start">
                  <SearchIcon sx={{ color:B.muted, fontSize:20 }} />
                </InputAdornment>),
              endAdornment: search ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearch('')}
                    sx={{ color:B.muted, '&:hover':{ color:B.ink } }}>
                    <ClearRounded sx={{ fontSize:18 }} />
                  </IconButton>
                </InputAdornment>) : null,
            } }}
            sx={{ flex:'1 1 300px', minWidth:{ xs:'100%', sm:260 },
              '& .MuiOutlinedInput-root':{ bgcolor:B.bg, borderRadius:'25px',
                fontSize:{ xs:'0.88rem', sm:'0.92rem' }, height:{ xs:46, md:48 }, color:B.ink,
                boxShadow:'0 4px 12px rgba(0,0,0,0.08)',
                '& fieldset':{ borderColor:'#B0BEC5', borderWidth:'1.5px' },
                '&:hover fieldset':{ borderColor:'#78909C', borderWidth:'2px' },
                '&.Mui-focused fieldset':{ borderColor:B.sage, borderWidth:'2px' } } }} />
          <ToggleButtonGroup value={viewMode} exclusive
            onChange={(e, m) => m && setViewMode(m)}
            sx={{ height:48, flexShrink:0, bgcolor:B.bg, border:`1px solid ${B.border}`,
              borderRadius:'10px', p:'3px',
              '& .MuiToggleButton-root':{ border:0, borderRadius:'7px !important', m:0,
                color:B.muted, px:1.25,
                '&.Mui-selected':{ bgcolor:B.surface, color:B.pine,
                  boxShadow:'0 1px 3px rgba(16,18,16,0.12)' } } }}>
            <ToggleButton value="list"><ViewList sx={{ fontSize:18 }} /></ToggleButton>
            <ToggleButton value="grid"><ViewModule sx={{ fontSize:18 }} /></ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Paper>
      {/* BUILD: 2026-08-04-soft-delete-jobs — bulk toolbar */}
      {filteredJobs.length > 0 && (
        <Box sx={{ display:'flex', alignItems:'center', gap:1, mb:1.5, px:1.25, py:1,
          bgcolor:B.bg, borderRadius:'12px', border:`1px solid ${B.border}` }}>
          <Checkbox size="small"
            checked={allJobsSelected}
            indeterminate={someJobsSelected && !allJobsSelected}
            onChange={() => {
              if (allJobsSelected) setSelectedJobs(new Set());
              else setSelectedJobs(new Set(paged.map((j) => j.key)));
            }}
            sx={{ p:0.5, color:B.borderS, '&.Mui-checked':{ color:B.pine } }} />
          <Typography sx={{ fontSize:'0.8rem', fontWeight:700, color:B.sageText }}>
            {selectedJobs.size > 0 ? `${selectedJobs.size} selected` : 'Select all'}
          </Typography>
          {someJobsSelected && (
            <Button size="small" variant="outlined"
              onClick={() => setJobDeleteDlg('bulk')}
              startIcon={<DeleteOutline sx={{ fontSize:16 }} />}
              sx={{ ml:'auto', color:B.danger, borderColor:'rgba(166,61,47,0.35)',
                textTransform:'none', fontWeight:700, borderRadius:'9px',
                fontSize:'0.76rem',
                '&:hover':{ bgcolor:B.dangerSoft, borderColor:B.danger } }}>
              Remove Selected ({selectedJobs.size})
            </Button>
          )}
        </Box>
      )}

      {filteredJobs.length === 0 ? (
        <Box sx={{ textAlign:'center', py:{ xs:5, sm:7 }, px:2, bgcolor:B.surface,
          borderRadius:'16px', border:`1px dashed ${B.borderS}` }}>
          <BarChart sx={{ fontSize:44, color:B.border, mb:1.5 }} />
          <Typography sx={{ mb:1, color:B.ink, fontWeight:700, fontSize:'1.05rem' }}>
            {stats.total === 0 ? 'No interview pipelines yet' : 'No jobs match your search'}
          </Typography>
          <Typography sx={{ color:B.muted, fontSize:'0.875rem' }}>
            {stats.total === 0
              ? 'Schedule shortlisted candidates from the Candidates page to create one.'
              : 'Try clearing your search.'}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display:'grid',
          gridTemplateColumns:{ xs:'1fr',
            sm: viewMode === 'grid' ? 'repeat(2,1fr)' : '1fr',
            md: viewMode === 'grid' ? 'repeat(3,1fr)' : '1fr',
            lg: viewMode === 'grid' ? 'repeat(4,1fr)' : '1fr' },
          gap: viewMode === 'grid' ? { xs:1.5, sm:1.75, md:2 } : 0 }}>
          {paged.map((j) => (
            <JobCard key={j.key} job={j} viewMode={viewMode}
              selected={selectedJobs.has(j.key)}
              onSelect={toggleJobSelect}
              onDelete={(job) => setJobDeleteDlg({ jobKey: job.key, jobTitle: job.jobTitle })}
              onOpen={(job) => navigate(
                `/employer/ranked-results/job/${job.jobId ?? job.key}`)} />
          ))}
        </Box>
      )}

      {filteredJobs.length > 0 && (
        <Box sx={{ mt:{ xs:3, sm:3.5 }, mb:4, display:'flex', alignItems:'center',
          justifyContent:'space-between', flexWrap:'wrap', gap:2 }}>
          <Stack direction="row" spacing={2} sx={{ alignItems:'center', flexWrap:'wrap',
            rowGap:1 }}>
            <Typography sx={{ fontSize:'0.82rem', color:B.muted, lineHeight:'36px' }}>
              Showing <Box component="span" sx={{ color:B.ink, fontWeight:700 }}>
                {(page - 1) * effectiveSize + 1}–
                {Math.min(page * effectiveSize, filteredJobs.length)}
              </Box> of <Box component="span" sx={{ color:B.ink, fontWeight:700 }}>
                {filteredJobs.length}</Box> jobs
            </Typography>
            <Select size="small" value={pageSize}
              onChange={(e) => { const v = e.target.value;
                setPageSize(v === 'all' ? 'all' : Number(v)); setPage(1); }}
              renderValue={(v) => (v === 'all' ? 'All' : v)}
              sx={{ fontSize:'0.82rem', fontWeight:700, color:B.pine, bgcolor:B.bg,
                borderRadius:'10px', minWidth:80, height:36 }}>
              {PAGE_SIZES.map((n) => (
                <MenuItem key={n} value={n} sx={{ fontSize:'0.82rem' }}>
                  {n === 'all' ? 'All' : n}
                </MenuItem>
              ))}
            </Select>
          </Stack>
          <Pagination count={totalPages} page={page}
            onChange={(_, v) => { setPage(v); window.scrollTo({ top:0, behavior:'smooth' }); }}
            shape="rounded" siblingCount={0}
            sx={{ '& .MuiPaginationItem-root':{ fontWeight:700, borderRadius:'9px',
              '&.Mui-selected':{ bgcolor:B.pine, color:'#fff',
                '&:hover':{ bgcolor:B.pineHover } } } }} />
        </Box>
      )}
    {/* BUILD: 2026-08-04-soft-delete-jobs — confirmation dialog */}
      <Dialog open={!!jobDeleteDlg} onClose={() => !jobDeleting && setJobDeleteDlg(null)}
        maxWidth="xs" fullWidth
        slotProps={{ paper: { sx: { borderRadius:'16px', overflow:'hidden', fontFamily:FONT } } }}>
        <Box sx={{ background:`linear-gradient(135deg, ${B.danger} 0%, #6B2820 100%)`,
          px:3, py:2 }}>
          <Typography sx={{ color:'#fff', fontWeight:800, fontSize:'1rem', fontFamily:FONT }}>
            {jobDeleteDlg === 'bulk'
              ? `Remove ${selectedJobs.size} job${selectedJobs.size !== 1 ? 's' : ''} from view`
              : `Remove "${jobDeleteDlg?.jobTitle || 'job'}" from view`}
          </Typography>
        </Box>
        <DialogContent>
          <Typography sx={{ fontSize:'0.85rem', color:B.body, fontFamily:FONT, mt:1 }}>
            {jobDeleteDlg === 'bulk'
              ? `This will hide ${selectedJobs.size} job(s) and all their pipelines from Ranked Results. The data is preserved — pipelines can be restored from the database.`
              : `This will hide all pipelines under this job from Ranked Results. The data is preserved — it can be restored later.`}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px:3, pb:2 }}>
          <Button onClick={() => setJobDeleteDlg(null)} disabled={jobDeleting}
            sx={{ textTransform:'none', color:B.muted, fontFamily:FONT }}>Cancel</Button>
          <Button variant="contained" disableElevation disabled={jobDeleting}
            onClick={handleSoftDeleteJob}
            startIcon={jobDeleting ? <CircularProgress size={14} sx={{ color:'#fff' }} /> : null}
            sx={{ bgcolor:B.danger, '&:hover':{ bgcolor:'#8C3225' }, textTransform:'none',
              fontWeight:700, borderRadius:'10px', fontFamily:FONT }}>
            {jobDeleting ? 'Removing…' : 'Remove'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default RankedResults;