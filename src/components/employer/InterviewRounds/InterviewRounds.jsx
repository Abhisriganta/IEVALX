import React, { useState, useMemo, useEffect } from 'react';
import {
  Box, Typography, CircularProgress, Button, Stack, Chip, Checkbox,
  Alert, IconButton, Tooltip, Dialog, DialogContent, DialogActions, Avatar, Paper,
  Divider, TextField, InputAdornment, Select, MenuItem, ListSubheader,
  Card, Skeleton, Pagination,
  ToggleButton, ToggleButtonGroup,
  useMediaQuery, useTheme, Menu,
} from '@mui/material';
import {
  Refresh, Assignment, Schedule, CheckCircle,
  DeleteOutlined, ExpandMore, ExpandLess,
  VideoCall, Search as SearchIcon, Work as WorkIcon, HourglassEmpty,
  MoreVert, Close, ClearRounded, ViewList, ViewModule,
  HelpOutlineOutlined, AccessTimeOutlined, VisibilityOutlined,
  CheckBoxOutlineBlank, CheckBoxOutlined, IndeterminateCheckBoxOutlined,
  DeleteSweepOutlined, PlaylistAddCheck,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { useInterviewRounds } from '../../../hooks/employer/useInterviewRounds';
import { interviewAPI } from '../../../services/api/employer/candidateService';
import jobseekerService from '../../../services/api/jobseeker/jobseekerService';
import { HiringPipelineDialog, ManagePipelineDialog, BulkHireDialog, CloseProcessDialog, HiringDialog, STATUS_CHIP, ROUND_TYPE_CFG } from '../Candidates/Pipeline';
import ScheduleDialog from '../Candidates/Schedule';
import { FeedbackPreview, ResultPreview, LiveScore } from './Results';

const FONT = "'Jost','DM Sans',sans-serif";
const B = {
  pine:'#022124', pineHover:'#0A3F42', pine2:'#24433E',
  sage:'#7F9E7E', sageText:'#5E815D', sageSoft:'#EDF3EC', sageDark:'#6C8B6B',
  border:'#E7EAE3', borderS:'#D8DDD4',
  muted:'#55584F', faint:'#7A7E76', ink:'#101210', body:'#2F332E',
  bg:'#F6F8F3', surface:'#FFFFFF',
  done:'#3E6E3E', doneSoft:'#EAF2E9',
  amber:'#A35A2D', amberSoft:'#F6ECDF',
  danger:'#A63D2F', dangerSoft:'#FAEAE8',
};

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short'}) : '—';
const fmtDT = (d) => {
  if (!d) return '—';
  const s = String(d);

  const hasTZ  = /Z$|[+\-]\d{2}:?\d{2}$/.test(s);
  const hasT   = s.indexOf('T') !== -1 || s.indexOf(' ') !== -1;
  let iso;
  if (hasTZ)      iso = s;
  else if (!hasT) iso = `${s.slice(0,10)}T00:00:00+05:30`;
  else            iso = `${s.slice(0,10)}T${s.slice(11,19).padEnd(8,'0')}Z`;
  const t = new Date(iso).getTime();
  return isNaN(t) ? '—' : new Date(t).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  });
};

const getCandidateName = (item) => {
  if (!item) return '—';
  const c = item.candidate;
  if (!c || typeof c !== 'object') return item.candidate_id != null ? `#${item.candidate_id}` : '—';
  const pick = (...v) => v.find(x => typeof x === 'string' && x.trim());
  return pick(c.full_name, c.name, `${c.first_name||''} ${c.last_name||''}`.trim(), c.email) || '—';
};

const TYPE_COLOR = { 'ai-powered': B.sageText, document: '#3C5A78', 'live-video': B.done, aptitude: B.amber };

const STATUS_STYLE = {
  scheduled:   { color: B.pine,   bg: '#E8EFEF',    dot: B.pine },
  invited:     { color: '#3C5A78',bg: '#EAF0F6',    dot: '#3C5A78' },
  started:     { color: B.amber,  bg: B.amberSoft,  dot: B.amber },
  in_progress: { color: B.amber,  bg: B.amberSoft,  dot: B.amber },
  completed:   { color: B.done,   bg: B.doneSoft,   dot: B.done },
  scoring:     { color: B.amber,  bg: B.amberSoft,  dot: B.amber },
  partial:     { color: B.amber,  bg: B.amberSoft,  dot: B.amber },
  no_attempt:  { color: B.danger, bg: B.dangerSoft, dot: B.danger },
  missed:      { color: B.danger, bg: B.dangerSoft, dot: B.danger },
  disqualified:{ color: B.danger, bg: B.dangerSoft, dot: B.danger },
  draft:       { color: B.faint,  bg: '#F0F2ED',    dot: B.faint },
};

const FOLD_MAP = {
  scheduled: { face: B.pine,  edge: '#D4DFDF' },
  invited:   { face: '#3C5A78', edge: '#EAF0F6' },
  started:   { face: B.amber, edge: B.amberSoft },
  in_progress:{ face: B.amber,edge: B.amberSoft },
  completed: { face: B.done,  edge: B.doneSoft },
  no_attempt:{ face: B.danger,edge: B.dangerSoft },
  missed:    { face: B.danger,edge: B.dangerSoft },
};
const DEFAULT_FOLD = { face: B.sage, edge: B.sageSoft };

const CHIP_COLORS = {
  all:          { tint: B.pine,    soft: 'rgba(2,33,36,0.05)', ink: B.pine,    dot: B.pine },
  upcoming:     { tint: B.amber,   soft: B.amberSoft,          ink: B.amber,   dot: B.amber },
  in_progress:  { tint: B.amber,   soft: B.amberSoft,          ink: B.amber,   dot: B.amber },
  completed:    { tint: B.done,    soft: B.doneSoft,            ink: B.done,    dot: B.done },
  no_attempt:   { tint: B.danger,  soft: B.dangerSoft,          ink: B.danger,  dot: B.danger },
  partial:      { tint: B.amber,   soft: B.amberSoft,          ink: B.amber,   dot: B.amber },
  missed:       { tint: B.danger,  soft: B.dangerSoft,          ink: B.danger,  dot: B.danger },
};

const PAGE_SIZES = [5, 10, 25, 50, 'all'];

/* Statuses that allow the delete (soft-hide) action on interview cards */
const DELETABLE_STATUSES = new Set(['completed', 'no_attempt', 'partial']);

/* ── InterviewCard — dog-ear fold card ──────────────────────────────── */
function InterviewCard({ s, viewMode = 'grid', onDetail, onMenu, onDelete,
                         selectable = false, selected = false, onToggleSelect = () => {} }) {
  const cname = getCandidateName(s);
  const initials = cname.split(' ').filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase() || '?';
  const photoUrl = jobseekerService.photoUrlFor(s.candidate?.candidate_id);
  const st = STATUS_STYLE[s.status] || STATUS_STYLE.draft;
  const fold = FOLD_MAP[s.status] || DEFAULT_FOLD;
  const tc = TYPE_COLOR[s.interview_type] || B.faint;
  const tl = ROUND_TYPE_CFG[s.interview_type]?.label || s.interview_type || '—';
  const score = s.cgps_score;
  const docPct = s.doc_overall_pct;
  const scoreVal = score ?? (docPct != null ? (docPct/10).toFixed(1) : null);
  const scoreCol = scoreVal == null ? B.faint : Number(scoreVal) >= 7 ? B.done : Number(scoreVal) >= 5 ? B.amber : B.danger;

  const statusPill = (
    <Box sx={{ display:'inline-flex', alignItems:'center', gap:0.4, bgcolor:st.bg, color:st.color,
      px:1, py:0.4, borderRadius:'7px', fontSize:'0.6rem', fontWeight:800, letterSpacing:'0.05em',
      textTransform:'uppercase', lineHeight:1.6, fontFamily:FONT }}>
      <Box sx={{ width:5, height:5, borderRadius:'50%', bgcolor:st.dot }} />
      {(STATUS_CHIP[s.status]?.label) || s.status}
    </Box>
  );

  if (viewMode === 'list') return (
    <Card elevation={0}
      onClick={() => selectable ? onToggleSelect(s.id) : onDetail(s)}
      sx={{ fontFamily:FONT, borderRadius:'14px',
        bgcolor: selected ? B.sageSoft : B.surface,
        border: selected ? `1px solid ${B.sage}` : `1px solid ${B.border}`,
        borderLeft:`4px solid ${fold.face}`, cursor:'pointer', transition:'all 0.2s ease',
        '&:hover':{ borderColor:B.sage, borderLeftColor:fold.face, boxShadow:'0 6px 20px rgba(2,33,36,0.08)' } }}>
      <Box sx={{
        display:{xs:'none',md:'grid'},
        // Extra 40px lead column for the row checkbox when selection mode is on.
        gridTemplateColumns: selectable
          ? '40px 2fr 0.9fr 0.7fr 1fr 1.2fr 0.9fr 60px'
          : '2fr 0.9fr 0.7fr 1fr 1.2fr 0.9fr 60px',
        alignItems:'center', px:2.25, py:1.6, gap:2 }}>
        {selectable && (
          <Checkbox
            size="small"
            checked={selected}
            onClick={e => e.stopPropagation()}
            onChange={() => onToggleSelect(s.id)}
            icon={<CheckBoxOutlineBlank sx={{ fontSize: 20 }} />}
            checkedIcon={<CheckBoxOutlined sx={{ fontSize: 20 }} />}
            sx={{ p: 0.5, color: B.faint,
              '&.Mui-checked': { color: B.sageText },
              '&:hover': { bgcolor: 'transparent' } }}
            inputProps={{ 'aria-label': 'Select interview' }}
          />
        )}
        <Box sx={{ display:'flex', gap:1.25, alignItems:'center', minWidth:0 }}>
          <Box sx={{ position:'relative', width:36, height:36, borderRadius:'50%', flexShrink:0, overflow:'hidden',
            bgcolor:B.pine, color:B.sage, display:'flex', alignItems:'center', justifyContent:'center',
            fontWeight:700, fontSize:'0.78rem', fontFamily:FONT }}>
            {initials}
            {photoUrl && <Box component="img" src={photoUrl} alt={cname}
              onError={e=>{e.currentTarget.style.display='none';}}
              sx={{ position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',bgcolor:'#fff',display:'block' }} />}
          </Box>
          <Box sx={{ minWidth:0, flex:1 }}>
            <Typography noWrap sx={{ fontSize:'0.92rem', fontWeight:800, color:B.ink, lineHeight:1.25 }}>{cname}</Typography>
            <Typography noWrap sx={{ fontSize:'0.72rem', color:B.muted, fontWeight:500, mt:0.2 }}>{s.interview_name}</Typography>
          </Box>
        </Box>
        <Chip label={tl} size="small" sx={{ height:22, fontSize:'0.66rem', fontWeight:600, bgcolor:tc+'15', color:tc, borderRadius:'5px', width:'fit-content' }} />
        <Typography sx={{ fontSize:'0.76rem', color:B.muted, fontWeight:600 }}>R{s.round_number}/{s.total_rounds}</Typography>
        <Typography noWrap sx={{ fontSize:'0.76rem', color:B.muted }}>{fmtDT(s.window_start || s.started_at)}</Typography>
        {(() => {
         
          if (s.status === 'completed') {
            return (
              <Typography noWrap sx={{ fontSize:'0.76rem', color:B.done, fontWeight:600 }}>
                {fmtDT(s.completed_at) || '—'}
              </Typography>
            );
          }
          if (s.status === 'partial') {
            return (
              <Typography noWrap sx={{ fontSize:'0.76rem', color:B.amber, fontWeight:600 }}>
                {fmtDT(s.completed_at) || '—'}
              </Typography>
            );
          }
       
          if (['started','in_progress','scoring'].includes(s.status)) {
            return (
              <Box sx={{
                display:'inline-flex', alignItems:'center', gap:0.5, alignSelf:'flex-start',
                px:1, py:0.35, borderRadius:'6px',
                bgcolor:B.sageSoft, color:B.sageText,
                fontSize:'0.66rem', fontWeight:800, letterSpacing:'0.04em',
                textTransform:'uppercase', fontFamily:FONT, whiteSpace:'nowrap',
                border:`1px solid rgba(94,129,93,0.28)`,
              }}>
                <Box component="span" sx={{
                  width:6, height:6, borderRadius:'50%', bgcolor:B.sageText, flexShrink:0,
                  boxShadow:`0 0 0 0 ${B.sageText}`,
                  animation:'iv-live-pulse 1.2s ease-in-out infinite',
                  '@keyframes iv-live-pulse': {
                    '0%':   { boxShadow: `0 0 0 0 rgba(94,129,93,0.55)`, transform: 'scale(1)'   },
                    '70%':  { boxShadow: `0 0 0 6px rgba(94,129,93,0)`,  transform: 'scale(1.1)' },
                    '100%': { boxShadow: `0 0 0 0 rgba(94,129,93,0)`,   transform: 'scale(1)'   },
                  },
                }} />
                {s.status === 'scoring' ? 'Scoring live' : 'Live ongoing'}
              </Box>
            );
          }
          // Pre-attempt statuses: candidate has an invite but has not opened
          // the session yet. Amber 'YET TO BE ATTENDED' pill unchanged.
          if (['scheduled','invited','draft'].includes(s.status)) {
            return (
              <Box sx={{
                display:'inline-flex', alignItems:'center', gap:0.5, alignSelf:'flex-start',
                px:1, py:0.35, borderRadius:'6px',
                bgcolor:B.amberSoft, color:B.amber,
                fontSize:'0.66rem', fontWeight:800, letterSpacing:'0.04em',
                textTransform:'uppercase', fontFamily:FONT, whiteSpace:'nowrap',
                border:`1px solid rgba(163,90,45,0.2)`,
              }}>
                <Box component="span" sx={{
                  width:6, height:6, borderRadius:'50%', bgcolor:B.amber, flexShrink:0,
                  animation:'iv-pulse 1.6s ease-in-out infinite',
                  '@keyframes iv-pulse': {
                    '0%,100%': { opacity: 1, transform: 'scale(1)' },
                    '50%':     { opacity: 0.55, transform: 'scale(1.35)' },
                  },
                }} />
                Yet to be attended
              </Box>
            );
          }
          return <Typography sx={{ fontSize:'0.76rem', color:B.faint }}>—</Typography>;
        })()}
        {statusPill}
        {DELETABLE_STATUSES.has(s.status) ? (
          <Tooltip title="Delete" arrow>
            <IconButton size="small" onClick={e=>{e.stopPropagation();onDelete(s);}}
              sx={{ color:B.faint, border:`1px solid ${B.border}`, borderRadius:'9px', p:0.6,
                '&:hover':{color:B.danger,bgcolor:B.dangerSoft,borderColor:'rgba(166,61,47,0.3)'} }}>
              <DeleteOutlined sx={{fontSize:16}} />
            </IconButton>
          </Tooltip>
        ) :  ['scheduled','draft'].includes(s.status)? (
          <IconButton size="small" onClick={e=>{e.stopPropagation();onMenu(e,s);}} sx={{ color:B.faint, '&:hover':{bgcolor:B.sageSoft,color:B.ink} }}>
            <MoreVert sx={{fontSize:18}} />
          </IconButton>
        ) : null}
      </Box>
      <Box sx={{ display:{xs:'flex',md:'none'}, flexDirection:'column', p:1.75, gap:1.1 }}>
        <Box sx={{ display:'flex', gap:1.25, alignItems:'center', minWidth:0 }}>
          <Box sx={{ width:36, height:36, borderRadius:'50%', flexShrink:0, bgcolor:B.pine, color:B.sage,
            display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:'0.78rem' }}>{initials}</Box>
          <Box sx={{ minWidth:0, flex:1 }}>
            <Typography noWrap sx={{ fontSize:'0.92rem', fontWeight:800, color:B.ink }}>{cname}</Typography>
            <Typography noWrap sx={{ fontSize:'0.72rem', color:B.muted }}>{s.interview_name}</Typography>
          </Box>
        </Box>
        <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          {statusPill}
          {DELETABLE_STATUSES.has(s.status) ? (
            <Tooltip title="Delete" arrow>
              <IconButton size="small" onClick={e=>{e.stopPropagation();onDelete(s);}}
                sx={{ color:B.faint, '&:hover':{color:B.danger} }}>
                <DeleteOutlined sx={{fontSize:16}} />
              </IconButton>
            </Tooltip>
          ) : ['scheduled','draft','started','in_progress','scoring'].includes(s.status) ? (
            <IconButton size="small" onClick={e=>{e.stopPropagation();onMenu(e,s);}} sx={{ color:B.faint }}><MoreVert sx={{fontSize:18}} /></IconButton>
          ) : null}
        </Box>
      </Box>
    </Card>
  );

  /* GRID — dog-ear fold card */
  return (
    <Card elevation={0} onClick={() => onDetail(s)}
      sx={{ position:'relative', height:'100%', display:'flex', flexDirection:'column',
        borderRadius:'16px', bgcolor:B.surface, overflow:'hidden', border:`1px solid ${B.border}`,
        fontFamily:FONT, boxShadow:'0 10px 26px rgba(2,33,36,0.06)', cursor:'pointer',
        transition:'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease',
        '&:hover':{ transform:'translateY(-4px)', boxShadow:'0 22px 48px -18px rgba(2,33,36,0.16)', borderColor:B.sage },
        '&:hover .dogear':{ borderTopWidth:'44px', borderLeftWidth:'44px' } }}>
      <Box sx={{ position:'absolute', top:0, right:0, zIndex:1, pointerEvents:'none' }}>
        <Box className="dogear" sx={{ width:0, height:0, borderLeft:`38px solid ${fold.edge}`, borderTop:`38px solid ${fold.face}`, borderRadius:'0 16px 0 0', transition:'border-width .25s ease' }} />
        <Box sx={{ position:'absolute', top:0, right:0, width:38, height:38, background:'linear-gradient(225deg, transparent 50%, rgba(2,33,36,0.16) 50%, transparent 64%)' }} />
      </Box>
      <Box sx={{ p:'17px 18px 18px', display:'flex', flexDirection:'column', flex:1, minWidth:0 }}>
        <Box sx={{ display:'flex', alignItems:'center', gap:1.4, pr:3.5, minWidth:0 }}>
          <Box sx={{ position:'relative', width:42, height:42, borderRadius:'50%', flexShrink:0, overflow:'hidden',
            bgcolor:B.pine, color:B.sage, display:'flex', alignItems:'center', justifyContent:'center',
            fontWeight:700, fontSize:'0.85rem', fontFamily:FONT }}>
            {initials}
            {photoUrl && <Box component="img" src={photoUrl} alt={cname}
              onError={e=>{e.currentTarget.style.display='none';}}
              sx={{ position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',bgcolor:'#fff',display:'block' }} />}
          </Box>
          <Box sx={{ minWidth:0, flex:1 }}>
            <Typography sx={{ fontSize:'0.98rem', fontWeight:800, color:B.ink, lineHeight:1.25, letterSpacing:'-0.015em',
              display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden', minHeight:'2.5em' }}>
              {cname}
            </Typography>
            <Typography noWrap sx={{ fontSize:'0.72rem', color:B.muted, mt:0.3, fontWeight:500 }}>
              {s.interview_name}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display:'flex', alignItems:'center', gap:1.25, mt:1.75, mb:1.5, flexWrap:'wrap', rowGap:0.4 }}>
          <Tooltip title={`Round ${s.round_number} of ${s.total_rounds}`} arrow>
            <Box sx={{display:'flex',alignItems:'center',gap:0.4,cursor:'help'}}>
              <HelpOutlineOutlined sx={{fontSize:14,color:B.faint}} />
              <Typography sx={{fontSize:'0.76rem',color:B.muted,fontWeight:500}}>R{s.round_number}/{s.total_rounds}</Typography>
            </Box>
          </Tooltip>
          <Chip label={tl} size="small" sx={{ height:20, fontSize:'0.62rem', fontWeight:700, bgcolor:tc+'15', color:tc, borderRadius:'5px' }} />
          {scoreVal != null && (
            <Typography sx={{ fontSize:'0.76rem', fontWeight:700, color:scoreCol }}>{scoreVal}/10</Typography>
          )}
        </Box>
        <Box sx={{ display:'flex', alignItems:'center', gap:0.75, mt:'auto', py:1.25,
          borderTop:`1px dashed ${B.border}`, borderBottom:`1px dashed ${B.border}`, mb:1.5 }}>
          <Typography noWrap sx={{ fontSize:'0.73rem', fontWeight:600, color:B.muted }}>
            {s.status === 'completed' ? `Completed ${fmtDT(s.completed_at)}` :
             s.status === 'scheduled' || s.status === 'invited' || s.status === 'draft' ? `Scheduled ${fmtDT(s.window_start)}` :
             ['started','in_progress','scoring'].includes(s.status) ? `Started ${fmtDT(s.started_at || s.window_start)}` :
             fmtDT(s.window_start)}
          </Typography>
        </Box>
        <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:1 }}>
          {statusPill}
          {DELETABLE_STATUSES.has(s.status) ? (
            <Tooltip title="Delete" arrow>
              <IconButton size="small" onClick={e=>{e.stopPropagation();onDelete(s);}}
                sx={{ color:B.faint, border:`1px solid ${B.border}`, borderRadius:'9px', p:0.6,
                  '&:hover':{color:B.danger,bgcolor:B.dangerSoft,borderColor:'rgba(166,61,47,0.3)'} }}>
                <DeleteOutlined sx={{fontSize:16}} />
              </IconButton>
            </Tooltip>
          ) : ['scheduled','draft','started','in_progress','scoring'].includes(s.status) ? (
            <IconButton size="small" onClick={e=>{e.stopPropagation();onMenu(e,s);}}
              sx={{ color:B.faint, '&:hover':{bgcolor:B.sageSoft,color:B.ink} }}>
              <MoreVert sx={{fontSize:18}} />
            </IconButton>
          ) : null}
        </Box>
      </Box>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ */
const InterviewRounds = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJobId, setSelectedJobId] = useState('all');
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuRow, setMenuRow] = useState(null);
  const [detailRow, setDetailRow] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [activeFilter, setActiveFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [hideDlg, setHideDlg] = useState(null);
  const [hideBulkDlg, setHideBulkDlg] = useState(false);
  const [syncingId, setSyncingId] = useState(null);
  const [repairingId, setRepairingId] = useState(null);

  const {
    tab, setTab, ivLoading, dashboard, processes, scheduled, setScheduled, liveIvs, deleting,
    expandedProc, expandedView, deleteDlg, setDeleteDlg,
    pipelineDialog, setPipelineDialog, schedDialog, setSchedDialog,
    manageDialog, setManageDialog, bulkHireDialog, setBulkHireDialog,
    hiringDialog, setHiringDialog, closeDialog, setCloseDialog,
    liveScoreDialog, setLiveScoreDialog, resultPreview, setResultPreview,
    feedbackPreview, setFeedbackPreview,
    selectionMode, setSelectionMode, selectedIds, toggleSelect, selectAll, exitSelection,
    hideOne, hideSelected, inProgress, upcoming, completed, fetchAll,
    handleSendInvite, handleSendReminder, handleFlagFraud, handleDelete, handleMissed,
    handleSyncManualAssessment, handleRepairManualAssignment, handleLaunchPipeline,
    handleConfirmClose, handleViewClick, viewBtnProps,
  } = useInterviewRounds();

  const q = searchQuery.trim().toLowerCase();
  const matchesSearch = (item) => {
    if (!q) return true;
    return getCandidateName(item).toLowerCase().includes(q) || (item.interview_name||'').toLowerCase().includes(q);
  };
  const matchesJob = (item) => {
    if (selectedJobId === 'all') return true;
    return String(item.process_id ?? item.job_id ?? '') === String(selectedJobId);
  };

  const allItems = useMemo(() => [...upcoming, ...completed].filter(s => matchesSearch(s) && matchesJob(s)), [upcoming, completed, q, selectedJobId]);

  const UPCOMING_STATUSES = ['scheduled','invited','draft','started','scoring'];

  const chipCounts = useMemo(() => {
    const c = { all: allItems.length, upcoming: 0, in_progress: 0, completed: 0, no_attempt: 0, partial: 0, missed: 0 };
    allItems.forEach(s => {
      if (UPCOMING_STATUSES.includes(s.status)) c.upcoming++;
      else if (c[s.status] !== undefined) c[s.status]++;
    });
    return c;
  }, [allItems]);

  const displayed = useMemo(() => {
    if (activeFilter === 'all') return allItems;
    if (activeFilter === 'upcoming') return allItems.filter(s => UPCOMING_STATUSES.includes(s.status));
    return allItems.filter(s => s.status === activeFilter);
  }, [allItems, activeFilter]);

  useEffect(() => { setPage(1); }, [searchQuery, selectedJobId, activeFilter, pageSize]);
  const effectiveSize = pageSize === 'all' ? Math.max(displayed.length, 1) : pageSize;
  const totalPages = Math.max(1, Math.ceil(displayed.length / effectiveSize));
  useEffect(() => { if (page > totalPages) setPage(1); }, [page, totalPages]);
  const paged = useMemo(() => displayed.slice((page-1)*effectiveSize, page*effectiveSize), [displayed, page, effectiveSize]);


  const SELECTABLE_FILTERS = ['completed', 'no_attempt', 'partial'];
  const canSelectHere = SELECTABLE_FILTERS.includes(activeFilter);
  useEffect(() => {
    if (!canSelectHere && (selectionMode || selectedIds.size > 0)) {
      exitSelection();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSelectHere]);

  
  const pageIds        = paged.map(s => s.id);
  const displayedIds   = displayed.map(s => s.id);
  const selectedInPage = pageIds.filter(id => selectedIds.has(id)).length;
  const allPageSelected  = pageIds.length > 0 && selectedInPage === pageIds.length;
  const someInPageSelected = selectedInPage > 0 && !allPageSelected;

  const toggleSelectAllInPage = () => {
    if (allPageSelected) {
      // Un-select just this page's rows -- keep other-page selections.
      pageIds.forEach(id => { if (selectedIds.has(id)) toggleSelect(id); });
    } else {
      pageIds.forEach(id => { if (!selectedIds.has(id)) toggleSelect(id); });
    }
  };

  const enterSelectionMode = () => {
    setSelectionMode(true);
  };

  const requestBulkDelete = () => {
    if (selectedIds.size === 0) return;
    // hideSelected already handles the soft-delete API call + optimistic
    // update + UNDO snackbar. It also calls exitSelection() on success.
    hideSelected();
  };



  const handleMenu = (e, row) => { setMenuAnchor(e.currentTarget); setMenuRow(row); };

  if (ivLoading) return (
    <Box className="page-fade-in" sx={{ p:{xs:1.5,sm:2,md:3,lg:4}, maxWidth:1440, mx:'auto', bgcolor:B.bg, minHeight:'100vh', fontFamily:FONT }}>
      <Paper elevation={0} sx={{ bgcolor:B.surface, border:`1px solid ${B.border}`, borderRadius:'16px', p:3, mb:2.5 }}>
        <Skeleton width="40%" height={36} /><Skeleton width="30%" height={20} sx={{mt:1}} />
      </Paper>
      <Box sx={{ display:'grid', gridTemplateColumns:{xs:'1fr',sm:'repeat(2,1fr)',md:'repeat(3,1fr)',lg:'repeat(4,1fr)'}, gap:2 }}>
        {[0,1,2,3].map(i=>(<Card key={i} elevation={0} sx={{borderRadius:'16px',border:`1px solid ${B.border}`,p:2.25}}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems:'center' }}><Skeleton variant="circular" width={42} height={42} /><Box sx={{flex:1}}><Skeleton width="80%" height={20}/><Skeleton width="55%" height={14}/></Box></Stack>
          <Skeleton width="70%" height={16} sx={{mt:2}} /><Skeleton variant="rounded" height={34} sx={{mt:1.5,borderRadius:'9px'}} />
        </Card>))}
      </Box>
    </Box>
  );

  return (
    <Box className="page-fade-in" sx={{
      p:{xs:1.5,sm:2,md:3,lg:4}, maxWidth:1440, mx:'auto', bgcolor:B.bg, minHeight:'100vh', fontFamily:FONT,
      '& .MuiTypography-root, & .MuiButton-root, & .MuiChip-root, & .MuiInputBase-root, & .MuiMenuItem-root, & .MuiPaginationItem-root':{fontFamily:FONT},
    }}>
      {/* ── Hero header ────────────────────────────────────────────── */}
      <Paper elevation={0} sx={{ bgcolor:B.surface, border:`1px solid ${B.border}`, borderRadius:{xs:'14px',sm:'16px'},
        p:{xs:2,sm:2.5,md:3}, mb:{xs:2,md:2.5}, boxShadow:'0 1px 2px rgba(16,18,16,0.04)' }}>
        <Stack direction="row" sx={{ alignItems:'flex-start', justifyContent:'space-between', gap:1.5, mb:{xs:2,md:2.25} }}>
          <Box sx={{minWidth:0}}>
            <Typography component="h1" sx={{ fontWeight:700, color:B.ink, letterSpacing:'-0.02em', lineHeight:1.15,
              fontSize:{xs:'1.3rem',sm:'1.45rem',md:'1.6rem'} }}>Interview Rounds</Typography>
            <Typography sx={{ color:B.muted, fontSize:{xs:'0.82rem',sm:'0.9rem'}, fontWeight:500, mt:0.5 }}>
              <Box component="span" sx={{color:B.sageText,fontWeight:700}}>{allItems.length} interviews</Box> assigned to you
            </Typography>
          </Box>
          <Tooltip title="Refresh" arrow><span>
            <IconButton onClick={() => fetchAll()} size="small" sx={{ color:B.muted, border:`1px solid ${B.borderS}`, borderRadius:'9px',
              '&:hover':{bgcolor:B.sageSoft, color:B.pine, borderColor:B.sage} }}>
              <Refresh sx={{fontSize:18}} />
            </IconButton>
          </span></Tooltip>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ alignItems:'stretch', flexWrap:'wrap', gap:1 }}>
          <TextField placeholder="Search by job, round, or company" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}
            slotProps={{ input:{
              startAdornment:<InputAdornment position="start"><SearchIcon sx={{color:B.muted,fontSize:20}}/></InputAdornment>,
              endAdornment:searchQuery?(<InputAdornment position="end"><IconButton size="small" onClick={()=>setSearchQuery('')}
                sx={{color:B.muted,'&:hover':{color:B.ink,bgcolor:'rgba(16,18,16,0.05)'}}}><ClearRounded sx={{fontSize:18}}/></IconButton></InputAdornment>):null,
            }}}
            sx={{ flex:'1 1 300px', minWidth:{xs:'100%',sm:260},
              '& .MuiOutlinedInput-root':{ bgcolor:B.bg, borderRadius:'25px', fontSize:{xs:'0.88rem',sm:'0.92rem'},
                height:{xs:46,md:48}, color:B.ink, boxShadow:'0 4px 12px rgba(0,0,0,0.08)',
                '& input::placeholder':{color:B.muted,opacity:0.85},
                '& fieldset':{borderColor:'#B0BEC5',borderWidth:'1.5px'},
                '&:hover fieldset':{borderColor:'#78909C',borderWidth:'2px'},
                '&.Mui-focused':{boxShadow:'0 6px 18px rgba(0,0,0,0.12)'},
                '&.Mui-focused fieldset':{borderColor:B.sage,borderWidth:'2px'} } }} />
          <Select value={selectedJobId} onChange={e=>setSelectedJobId(e.target.value)} size="small" displayEmpty
            renderValue={(val) => {
              if (val === 'all') return 'All Jobs';
              const proc = processes.find(p => String(p.id) === String(val));
              if (!proc) return 'All Jobs';
              const sibs = processes.filter(s => (s.job ?? s.job_id) === (proc.job ?? proc.job_id));
              if (sibs.length <= 1) return proc.job_title;
              return `${proc.job_title} — ${proc.name || 'Pipeline #' + (proc.sequence_no || 1)}`;
            }}
            sx={{ bgcolor:B.bg, borderRadius:'25px', fontSize:'0.88rem', fontWeight:700, height:{xs:46,md:48}, minWidth:180,
              boxShadow:'0 4px 12px rgba(0,0,0,0.08)', color:B.ink,
              '& fieldset':{borderColor:'#B0BEC5',borderWidth:'1.5px'},'&:hover fieldset':{borderColor:'#78909C'},
              '&.Mui-focused fieldset':{borderColor:B.sage,borderWidth:'2px'} }}>
            <MenuItem value="all" sx={{fontSize:'0.82rem',fontWeight:600}}>All Jobs</MenuItem>
            {(() => {
              const grouped = new Map();
              processes.forEach(p => {
                const key = String(p.job ?? p.job_id ?? p.job_title);
                if (!grouped.has(key)) grouped.set(key, { title: p.job_title, items: [] });
                grouped.get(key).items.push(p);
              });
              const out = [];
              grouped.forEach(({ title, items }) => {
                if (items.length === 1) {
                  out.push(<MenuItem key={items[0].id} value={items[0].id} sx={{fontSize:'0.82rem'}}>{title}</MenuItem>);
                } else {
                  out.push(<ListSubheader key={'hdr-'+title} sx={{fontSize:'0.72rem',fontWeight:800,color:B.muted,lineHeight:'28px',textTransform:'uppercase',letterSpacing:'0.4px',bgcolor:'transparent'}}>{title}</ListSubheader>);
                  items.sort((a,b) => (a.sequence_no||1) - (b.sequence_no||1)).forEach(p => {
                    out.push(<MenuItem key={p.id} value={p.id} sx={{fontSize:'0.82rem',pl:3.5}}>{p.name || `Pipeline #${p.sequence_no || 1}`} <Box component="span" sx={{ml:0.75,fontSize:'0.7rem',color:B.muted}}>· {Array.isArray(p.rounds) ? p.rounds.length : '?'} round{Array.isArray(p.rounds) && p.rounds.length !== 1 ? 's' : ''}</Box></MenuItem>);
                  });
                }
              });
              return out;
            })()}
          </Select>
        </Stack>

        <Stack direction="row" sx={{ alignItems:'center', mt:{xs:1.75,md:2}, gap:1, flexWrap:'wrap' }}>
          <Box sx={{ display:'flex', gap:0.75, alignItems:'center', mr:'auto', minWidth:0,
            flexWrap:{xs:'nowrap',sm:'wrap'}, overflowX:{xs:'auto',sm:'visible'},
            pb:{xs:0.5,sm:0}, '&::-webkit-scrollbar':{display:'none'} }}>
            {[
              { value:'all', label:'All' },
              { value:'upcoming', label:'Upcoming' },
              { value:'in_progress', label:'In Progress' },
              { value:'completed', label:'Completed' },
              { value:'no_attempt', label:'No Attempt' },
              { value:'partial', label:'Partial' },
              { value:'missed', label:'Missed' },
            ].filter(opt => opt.value === 'all' || chipCounts[opt.value] > 0).map(opt => {
              const sel = activeFilter === opt.value;
              const cc = CHIP_COLORS[opt.value];
              const isAll = opt.value === 'all';
              return (
                <Box key={opt.value} onClick={()=>setActiveFilter(opt.value)} role="button" tabIndex={0}
                  sx={{ cursor:'pointer', userSelect:'none', display:'inline-flex', alignItems:'center', gap:0.6,
                    px:1.5, py:0.65, borderRadius:999, flexShrink:0, fontSize:'0.8rem', fontWeight:sel?700:600,
                    ...(sel ? isAll ? {bgcolor:B.pine,color:'#fff',border:`1px solid ${B.pine}`}
                      : {bgcolor:cc.soft,color:cc.ink,border:`1px solid ${cc.tint}`}
                      : {bgcolor:B.surface,color:B.muted,border:`1px solid ${B.borderS}`}),
                    transition:'all 0.16s ease',
                    '&:hover':sel?{}:{bgcolor:isAll?B.bg:cc.soft,borderColor:isAll?B.muted:cc.tint,color:isAll?B.ink:cc.ink} }}>
                  {!isAll && <Box component="span" sx={{ width:7, height:7, borderRadius:'50%', bgcolor:cc.dot, flexShrink:0,
                    boxShadow:sel?`0 0 0 2px ${cc.soft}`:'none' }} />}
                  {opt.label}
                  <Box component="span" sx={{ fontSize:'0.68rem', fontWeight:800, lineHeight:1.6, px:0.7, borderRadius:999,
                    bgcolor:sel?isAll?'rgba(255,255,255,0.22)':B.surface:B.bg, color:sel?isAll?'#fff':cc.ink:B.muted }}>
                    {chipCounts[opt.value]}
                  </Box>
                </Box>
              );
            })}
          </Box>
         
          {canSelectHere && (
            <Tooltip title={selectionMode ? 'Exit selection' : 'Select interviews for bulk actions'} arrow>
              <IconButton
                onClick={() => selectionMode ? exitSelection() : enterSelectionMode()}
                size="small"
                aria-pressed={selectionMode}
                aria-label={selectionMode ? 'Exit selection mode' : 'Enter selection mode'}
                sx={{
                  height: 38, width: 38, borderRadius: '10px', flexShrink: 0,
                  border: `1px solid ${selectionMode ? B.sage : B.border}`,
                  bgcolor: selectionMode ? B.sageSoft : B.bg,
                  color: selectionMode ? B.sageText : B.muted,
                  transition: 'all 0.16s ease',
                  '&:hover': { bgcolor: selectionMode ? B.sageSoft : 'rgba(16,18,16,0.04)', borderColor: B.sage, color: B.sageText },
                }}>
                {selectionMode ? <Close sx={{ fontSize: 18 }} /> : <PlaylistAddCheck sx={{ fontSize: 18 }} />}
              </IconButton>
            </Tooltip>
          )}
          <ToggleButtonGroup value={viewMode} exclusive onChange={(e,m)=>m&&setViewMode(m)}
            sx={{ height:38, flexShrink:0, bgcolor:B.bg, border:`1px solid ${B.border}`, borderRadius:'10px', p:'3px',
              '& .MuiToggleButton-root':{ border:0, borderRadius:'7px !important', m:0, color:B.muted, px:1.25, height:30,
                '&:hover':{bgcolor:'rgba(16,18,16,0.04)'},
                '&.Mui-selected':{bgcolor:B.surface,color:B.pine,boxShadow:'0 1px 3px rgba(16,18,16,0.12)','&:hover':{bgcolor:B.surface}} } }}>
            <ToggleButton value="grid"><ViewModule sx={{fontSize:18}}/></ToggleButton>
            <ToggleButton value="list"><ViewList sx={{fontSize:18}}/></ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Paper>

   
      {canSelectHere && (selectionMode || selectedIds.size > 0) && paged.length > 0 && (
        <Box sx={{
          position: 'sticky', top: 8, zIndex: 20, mb: 1.25,
          animation: 'iv-sel-bar-in 180ms ease-out',
          '@keyframes iv-sel-bar-in': {
            from: { opacity: 0, transform: 'translateY(-4px)' },
            to:   { opacity: 1, transform: 'translateY(0)' },
          },
        }}>
          <Box sx={{
            bgcolor: selectedIds.size > 0 ? B.pine : B.surface,
            color:   selectedIds.size > 0 ? '#fff' : B.ink,
            border:  `1px solid ${selectedIds.size > 0 ? B.pine : B.border}`,
            borderRadius: '14px',
            px: { xs: 1.5, sm: 2.25 }, py: { xs: 1, sm: 1.15 },
            display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 }, flexWrap: 'wrap',
            boxShadow: selectedIds.size > 0
              ? '0 8px 24px rgba(2,33,36,0.18), 0 2px 6px rgba(2,33,36,0.12)'
              : '0 2px 8px rgba(2,33,36,0.06)',
            fontFamily: FONT,
          }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexGrow: 1, minWidth: 0 }}>
              <Checkbox
                checked={allPageSelected}
                indeterminate={someInPageSelected}
                onChange={toggleSelectAllInPage}
                icon={<CheckBoxOutlineBlank sx={{ fontSize: 20 }} />}
                checkedIcon={<CheckBoxOutlined sx={{ fontSize: 20 }} />}
                indeterminateIcon={<IndeterminateCheckBoxOutlined sx={{ fontSize: 20 }} />}
                sx={{
                  p: 0.5,
                  color: selectedIds.size > 0 ? 'rgba(255,255,255,0.65)' : B.faint,
                  '&.Mui-checked, &.MuiCheckbox-indeterminate': {
                    color: selectedIds.size > 0 ? B.sage : B.sageText,
                  },
                }}
                inputProps={{ 'aria-label': 'Select all interviews on this page' }}
              />
              <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                {selectedIds.size === 0
                  ? 'Select interviews'
                  : `${selectedIds.size} selected`}
              </Typography>
              {selectedIds.size > 0 && selectedIds.size < displayedIds.length && (
                <Button
                  onClick={() => selectAll(displayed)}
                  size="small"
                  sx={{
                    textTransform: 'none', fontSize: '0.78rem', fontWeight: 600,
                    color: 'rgba(255,255,255,0.85)', ml: 0.5,
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', color: '#fff' },
                  }}>
                  Select all {displayedIds.length} in view
                </Button>
              )}
            </Stack>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexShrink: 0 }}>
              <Button
                onClick={requestBulkDelete}
                disabled={selectedIds.size === 0 || deleting}
                startIcon={<DeleteSweepOutlined sx={{ fontSize: 18 }} />}
                size="small"
                sx={{
                  textTransform: 'none', fontSize: '0.82rem', fontWeight: 700, borderRadius: '9px',
                  px: 1.5, py: 0.6,
                  bgcolor: selectedIds.size > 0 ? B.danger : 'transparent',
                  color:   selectedIds.size > 0 ? '#fff' : B.faint,
                  border:  `1px solid ${selectedIds.size > 0 ? B.danger : B.borderS}`,
                  '&:hover': {
                    bgcolor: selectedIds.size > 0 ? '#8A3226' : 'rgba(166,61,47,0.06)',
                    borderColor: B.danger, color: selectedIds.size > 0 ? '#fff' : B.danger,
                  },
                  '&.Mui-disabled': { color: 'rgba(255,255,255,0.35)', borderColor: 'rgba(255,255,255,0.15)' },
                }}>
                Delete{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
              </Button>
              <Button
                onClick={exitSelection}
                size="small"
                sx={{
                  textTransform: 'none', fontSize: '0.82rem', fontWeight: 600, borderRadius: '9px',
                  px: 1.5, py: 0.6,
                  color: selectedIds.size > 0 ? 'rgba(255,255,255,0.85)' : B.muted,
                  '&:hover': {
                    bgcolor: selectedIds.size > 0 ? 'rgba(255,255,255,0.08)' : 'rgba(16,18,16,0.04)',
                    color: selectedIds.size > 0 ? '#fff' : B.ink,
                  },
                }}>
                Cancel
              </Button>
            </Stack>
          </Box>
        </Box>
      )}

      {/* Empty */}
      {displayed.length === 0 && !ivLoading && (
        <Box sx={{ textAlign:'center', py:{xs:5,sm:7}, px:2, bgcolor:B.surface, borderRadius:'16px', border:`1px dashed ${B.borderS}` }}>
          <Schedule sx={{fontSize:44,color:B.border,mb:1.5}} />
          <Typography sx={{mb:1,color:B.ink,fontWeight:700,fontSize:'1.05rem'}}>No interviews found</Typography>
          <Typography sx={{color:B.muted,fontSize:'0.875rem'}}>Schedule candidates to see interviews here.</Typography>
        </Box>
      )}

      {paged.length > 0 && viewMode === 'list' && (
        <Box sx={{
          display: { xs: 'none', md: 'grid' },
          gridTemplateColumns: selectionMode
            ? '40px 2fr 0.9fr 0.7fr 1fr 1.2fr 0.9fr 60px'
            : '2fr 0.9fr 0.7fr 1fr 1.2fr 0.9fr 60px',
          alignItems: 'center', px: 2.25, py: 1, gap: 2,
          mb: 0.75, mx: 0.5,
        }}>
          {selectionMode && (
            <Checkbox
              size="small"
              checked={allPageSelected}
              indeterminate={someInPageSelected}
              onChange={toggleSelectAllInPage}
              icon={<CheckBoxOutlineBlank sx={{ fontSize: 18 }} />}
              checkedIcon={<CheckBoxOutlined sx={{ fontSize: 18 }} />}
              indeterminateIcon={<IndeterminateCheckBoxOutlined sx={{ fontSize: 18 }} />}
              sx={{ p: 0.25, color: B.faint,
                '&.Mui-checked, &.MuiCheckbox-indeterminate': { color: B.sageText } }}
              inputProps={{ 'aria-label': 'Select all on this page' }}
            />
          )}
          {['Candidate', 'Type', 'Round', 'Scheduled', 'Completed', 'Status', ''].map(h => (
            <Typography key={h} sx={{
              fontSize: '0.68rem', fontWeight: 800, color: B.faint,
              textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: FONT,
            }}>{h}</Typography>
          ))}
        </Box>
      )}

      {/* Cards */}
      {paged.length > 0 && (
        <Box sx={{ display:'grid',
          gridTemplateColumns:{
            xs:'1fr',
            sm:viewMode==='grid'?'repeat(2,1fr)':'1fr',
            md:viewMode==='grid'?'repeat(3,1fr)':'1fr',
            lg:viewMode==='grid'?'repeat(4,1fr)':'1fr',
          },
          gap:viewMode==='grid'?{xs:1.5,sm:1.75,md:2}:{xs:1,sm:1.25} }}>
          {paged.map(s=>(
            <InterviewCard
              key={s.id}
              s={s}
              viewMode={viewMode}
              onDetail={setDetailRow}
              onMenu={handleMenu}
              onDelete={(row) => setDeleteDlg({id:row.id,name:row.interview_name||getCandidateName(row)})}
              selectable={selectionMode}
              selected={selectedIds.has(s.id)}
              onToggleSelect={toggleSelect}
            />
          ))}
        </Box>
      )}

      {/* Pagination */}
      {displayed.length > 0 && (
        <Box sx={{ mt:{xs:3,sm:3.5}, mb:4, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:2 }}>
          <Stack direction="row" spacing={2} sx={{alignItems:'center',flexWrap:'wrap',rowGap:1}}>
            <Typography sx={{fontSize:'0.82rem',color:B.muted,fontWeight:500,lineHeight:'36px'}}>
              Showing <Box component="span" sx={{color:B.ink,fontWeight:700}}>{(page-1)*effectiveSize+1}–{Math.min(page*effectiveSize,displayed.length)}</Box> of <Box component="span" sx={{color:B.ink,fontWeight:700}}>{displayed.length}</Box> interviews
            </Typography>
            <Stack direction="row" spacing={0.75} sx={{alignItems:'center'}}>
              <Typography sx={{fontSize:'0.82rem',color:B.muted,fontWeight:500,lineHeight:'36px'}}>Show</Typography>
              <Select size="small" value={pageSize} onChange={e=>{const v=e.target.value;setPageSize(v==='all'?'all':Number(v));}}
                renderValue={v=>v==='all'?'All':v}
                sx={{fontSize:'0.82rem',fontWeight:700,color:B.pine,bgcolor:B.bg,borderRadius:'10px',minWidth:80,height:36,
                  '& .MuiOutlinedInput-notchedOutline':{borderColor:B.border},'&:hover .MuiOutlinedInput-notchedOutline':{borderColor:B.borderS}}}>
                {PAGE_SIZES.map(n=><MenuItem key={n} value={n} sx={{fontSize:'0.82rem'}}>{n==='all'?'All':n}</MenuItem>)}
              </Select>
              <Typography sx={{fontSize:'0.82rem',color:B.muted,fontWeight:500,lineHeight:'36px'}}>per page</Typography>
            </Stack>
          </Stack>
          <Pagination count={totalPages} page={page} onChange={(_,v)=>{setPage(v);window.scrollTo({top:0,behavior:'smooth'});}}
            shape="rounded" siblingCount={0}
            sx={{'& .MuiPaginationItem-root':{fontWeight:700,borderRadius:'9px','&.Mui-selected':{bgcolor:B.pine,color:'#fff','&:hover':{bgcolor:B.pineHover}}}}} />
        </Box>
      )}

      {/* ── Action menu ────────────────────────────────────────────── */}
      <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={()=>{setMenuAnchor(null);setMenuRow(null);}}
        slotProps={{paper:{sx:{borderRadius:'12px',border:`1px solid ${B.border}`,boxShadow:'0 10px 36px rgba(2,33,36,0.12)',minWidth:185,p:0.5}}}}>
        {menuRow && (menuRow.status==='scheduled'||menuRow.status==='draft') && (
          <MenuItem dense onClick={()=>{handleSendInvite(menuRow.id,getCandidateName(menuRow));setMenuAnchor(null);setMenuRow(null);}}
            sx={{fontSize:'0.85rem',gap:1.3,py:1,borderRadius:'8px','&:hover':{bgcolor:'rgba(127,158,126,0.08)'}}}>
            <Assignment sx={{fontSize:17,color:B.pine}}/> Send Invite
          </MenuItem>
        )}

        {menuRow && DELETABLE_STATUSES.has(menuRow.status) && (<>
          <Divider sx={{my:0.5,borderColor:B.border}} />
          <MenuItem dense onClick={()=>{setDeleteDlg({id:menuRow.id,name:menuRow.interview_name});setMenuAnchor(null);setMenuRow(null);}}
            sx={{fontSize:'0.85rem',gap:1.3,py:1,borderRadius:'8px',color:B.danger,'&:hover':{bgcolor:'rgba(180,70,47,0.05)'}}}>
            <DeleteOutlined sx={{fontSize:17}}/> Delete
          </MenuItem>
        </>)}
      </Menu>

      {/* ── Detail dialog ──────────────────────────────────────────── */}
      <Dialog open={!!detailRow} onClose={()=>setDetailRow(null)} maxWidth="xs" fullWidth
        slotProps={{ paper: { sx: { borderRadius: '16px', overflow: 'hidden' } } }}>
        {detailRow && (<Box>
          <Box sx={{ background:`linear-gradient(135deg, ${B.pine} 0%, #0A3F42 100%)`, px:2.5, pt:2.5, pb:2, position:'relative' }}>
            <IconButton size="small" onClick={()=>setDetailRow(null)}
              sx={{position:'absolute',top:10,right:10,color:'rgba(255,255,255,0.7)','&:hover':{color:'#fff',bgcolor:'rgba(255,255,255,0.12)'}}}>
              <Close sx={{fontSize:18}} />
            </IconButton>
            <Typography sx={{color:'#fff',fontWeight:800,fontSize:'1.05rem',lineHeight:1.2}}>{getCandidateName(detailRow)}</Typography>
            <Typography sx={{color:'rgba(255,255,255,0.7)',fontSize:'0.78rem',mt:0.5}}>{detailRow.interview_name}</Typography>
          </Box>
          <Box sx={{p:3,fontFamily:FONT}}>
            {[
              {label:'Type', value: ROUND_TYPE_CFG[detailRow.interview_type]?.label || detailRow.interview_type},
              {label:'Round', value:`${detailRow.round_number} of ${detailRow.total_rounds}`},
              {label:'Scheduled', value:fmtDT(detailRow.window_start)},
              detailRow.completed_at && {label:'Completed', value:fmtDT(detailRow.completed_at)},
              {label:'Status', value:(STATUS_CHIP[detailRow.status]?.label)||detailRow.status},
            ].filter(Boolean).map(row=>(
              <Stack key={row.label} direction="row" sx={{justifyContent:'space-between',py:1.2,borderBottom:`1px solid ${B.border}`}}>
                <Typography sx={{fontSize:'0.82rem',color:B.muted,fontWeight:600}}>{row.label}</Typography>
                <Typography sx={{fontSize:'0.82rem',color:B.ink,fontWeight:700}}>{row.value}</Typography>
              </Stack>
            ))}
          </Box>
        </Box>)}
      </Dialog>

      {/* ═══ Delete confirmation dialog ═══════════════════════════════ */}
      <Dialog open={!!deleteDlg} onClose={() => setDeleteDlg(null)} maxWidth="xs" fullWidth
        slotProps={{ paper: { sx: { borderRadius: '16px', overflow: 'hidden' } } }}>
        <Box sx={{
          background: `linear-gradient(135deg, ${B.danger} 0%, #6B2820 100%)`,
          px: 3, py: 2, display: 'flex', alignItems: 'center', gap: 1.3,
        }}>
          <Box sx={{
            width: 38, height: 38, borderRadius: '11px',
            bgcolor: 'rgba(255,255,255,0.16)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <DeleteOutlined sx={{ color: '#fff', fontSize: 21 }} />
          </Box>
          <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '1rem', fontFamily: FONT }}>
            Confirm Delete
          </Typography>
        </Box>
        <DialogContent sx={{ pt: 2.5 }}>
          <Typography sx={{ fontSize: '0.85rem', color: B.body, lineHeight: 1.6, fontFamily: FONT }}>
            Remove <strong>{deleteDlg?.name || 'this interview'}</strong> from your view?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteDlg(null)}
            sx={{ textTransform: 'none', color: B.muted, fontFamily: FONT }}>
            Cancel
          </Button>
          <Button variant="contained" disableElevation disabled={deleting}
            onClick={handleDelete}
            sx={{
              bgcolor: B.danger, '&:hover': { bgcolor: '#8C3225' },
              textTransform: 'none', fontWeight: 700, borderRadius: '10px',
              px: 2.5, fontFamily: FONT,
            }}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══ Pipeline / Schedule / Score dialogs (unchanged) ═══════════ */}
      <HiringPipelineDialog open={pipelineDialog} onClose={()=>setPipelineDialog(false)} onLaunch={handleLaunchPipeline} />
      <ManagePipelineDialog open={manageDialog.open} process={manageDialog.process} onClose={()=>setManageDialog({open:false,process:null})} onDone={fetchAll} />
      <ScheduleDialog open={schedDialog.open} preSelected={schedDialog.preSelect} preJobTitle={schedDialog.jobTitle} preJobId={schedDialog.jobId}
        pipelineRoundType={schedDialog.pipelineRoundType} pipelineVacancies={schedDialog.pipelineVacancies}
        pipelineRoundNumber={schedDialog.pipelineRoundNumber} pipelineRoundName={schedDialog.pipelineRoundName}
        pipelineLocked={schedDialog.pipelineLocked} processes={processes}
        onClose={()=>setSchedDialog({open:false,preSelect:null})} onDone={fetchAll} />
      <CloseProcessDialog open={closeDialog.open} process={closeDialog.process} onClose={()=>setCloseDialog({open:false,process:null})} onConfirm={handleConfirmClose} />
      <BulkHireDialog open={bulkHireDialog.open} process={bulkHireDialog.process} onClose={()=>setBulkHireDialog({open:false,process:null})} onDone={fetchAll} />
      <HiringDialog open={hiringDialog.open} process={hiringDialog.process} scheduled={scheduled} onClose={()=>setHiringDialog({open:false,process:null})} onDone={fetchAll} />
      <FeedbackPreview open={feedbackPreview.open} interviewId={feedbackPreview.interviewId} candidateName={feedbackPreview.candidateName} interviewName={feedbackPreview.interviewName} onClose={()=>setFeedbackPreview(p=>({...p,open:false}))} />
      <ResultPreview open={resultPreview.open} sessionId={resultPreview.sessionId} interviewType={resultPreview.interviewType} candidateName={resultPreview.candidateName} interviewName={resultPreview.interviewName} onClose={()=>setResultPreview({open:false,sessionId:null,interviewType:null,candidateName:'',interviewName:''})} onScoreLoaded={(id,pct)=>setScheduled(prev=>prev.map(s=>s.id===id?{...s,doc_overall_pct:pct}:s))} />
      <LiveScore open={liveScoreDialog.open} candidateInterview={liveScoreDialog.candidateInterview} onClose={()=>setLiveScoreDialog({open:false,candidateInterview:null})} onDone={fetchAll} />
    </Box>
  );
};

export default InterviewRounds;