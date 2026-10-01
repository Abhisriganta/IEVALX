import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Button, Stack, IconButton, Tooltip,
  CircularProgress, Card, Dialog, DialogContent, DialogContentText,
  DialogActions, TextField, InputAdornment, Paper, Avatar, Chip,
  Skeleton, Pagination, Select, MenuItem, Grow, Divider,
  ToggleButton, ToggleButtonGroup, Checkbox,
} from '@mui/material';
import {
  RefreshOutlined, ClearRounded, ViewList, ViewModule, Search,
  HourglassEmpty, CheckCircle, Cancel, TimerOff,
  Close, VisibilityOutlined, AccessTime,
  Delete as DeleteOutline, CheckBoxOutlineBlank as CheckBoxOutlined,
  HelpOutlineOutlined, WorkOutlineRounded,
} from '@mui/icons-material';

import usePendingCandidates from '../../../hooks/employer/usePendingCandidates';

const FONT = "'Jost','DM Sans',sans-serif";
const B = {
  pine:'#022124', pineHover:'#0A3F42',
  sage:'#7F9E7E', sageText:'#5E815D', sageSoft:'#EDF3EC', sageDark:'#6C8B6B',
  border:'#E7EAE3', borderS:'#D8DDD4',
  muted:'#55584F', faint:'#7A7E76', ink:'#101210', body:'#2F332E',
  bg:'#F6F8F3', surface:'#FFFFFF',
  done:'#3E6E3E', doneSoft:'#EAF2E9',
  amber:'#A35A2D', amberSoft:'#F6ECDF',
  danger:'#A63D2F', dangerSoft:'#FAEAE8',
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : '—';
const scoreColor = (s) => s==null ? B.faint : s>=8 ? B.done : s>=6 ? B.amber : B.danger;

/* ── ScoreGauge — circular ring like Interview History ────────────────── */
const ScoreGauge = ({ score, size = 56, strokeWidth = 5 }) => {
  const val = score ?? 0;
  const color = scoreColor(score);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(val / 10, 1);
  const offset = circumference * (1 - pct);
  return (
    <Box sx={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none"
          stroke={B.border} strokeWidth={strokeWidth} />
        <circle cx={size/2} cy={size/2} r={radius} fill="none"
          stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <Typography sx={{ fontSize: size > 50 ? '1.05rem' : '0.85rem', fontWeight: 900,
          color, lineHeight: 1, fontFamily: FONT }}>{score ?? 0}</Typography>
        <Typography sx={{ fontSize: '0.5rem', fontWeight: 700, color: B.faint,
          lineHeight: 1, fontFamily: FONT }}>/ 10</Typography>
      </Box>
    </Box>
  );
};

const TAB_CHIPS = [
  { value:'pending',  label:'Pending Review' },
  { value:'rejected', label:'Rejected from Pool' },
];
const TAB_COLORS = {
  pending:  { tint:B.amber,  soft:B.amberSoft,  ink:B.amber,  dot:B.amber },
  hired:    { tint:B.done,   soft:B.doneSoft,   ink:B.done,   dot:B.done },
  rejected: { tint:B.danger, soft:B.dangerSoft, ink:B.danger, dot:B.danger },
};

const FOLD = {
  pending:       { face:B.amber,  edge:B.amberSoft },
  final_pending: { face:B.danger, edge:B.dangerSoft },
  hired:         { face:B.done,   edge:B.doneSoft },
  rejected:      { face:B.danger, edge:B.dangerSoft },
};

const PAGE_SIZES = [5,10,25,50,'all'];

/* ── CandidateCard — dog-ear fold card ───────────────────────────────── */
function CandidateCard({ c, tab, viewMode='grid', busyId, onDetail, onHire, onReject, onDelete, selectable, selected, onToggle, keyOf }) {
  const isBusy = busyId === c.candidate_id;
  const sCol = scoreColor(c.overall_cps);
  const initials = (c.full_name||'C').split(' ').filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase();
  const fold = tab==='hired' ? FOLD.hired : tab==='rejected' ? FOLD.rejected : c.pool_type==='final_pending' ? FOLD.final_pending : FOLD.pending;
  const cKey = keyOf(c);

  const identity = (
    <Box sx={{ display:'flex', gap:1.25, alignItems:'center', minWidth:0 }}>
      {selectable && (
        <Checkbox checked={selected} onChange={()=>onToggle(c)} onClick={e=>e.stopPropagation()} size="small"
          sx={{ p:0.5, flexShrink:0, color:B.borderS, '&.Mui-checked':{color:B.sage} }} />
      )}
      <Box sx={{
        position:'relative', width:viewMode==='list'?36:42, height:viewMode==='list'?36:42,
        borderRadius:'50%', flexShrink:0, overflow:'hidden',
        bgcolor:B.pine, color:B.sage,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontWeight:700, fontSize:viewMode==='list'?'0.78rem':'0.85rem', fontFamily:FONT,
      }}>
        {initials}
        {c.photo_url && <Box component="img" src={c.photo_url} alt={c.full_name}
          onError={e=>{e.currentTarget.style.display='none';}}
          sx={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', bgcolor:'#fff', display:'block' }} />}
      </Box>
      <Box sx={{ minWidth:0, flex:1 }}>
        <Typography noWrap title={c.full_name} sx={{ fontSize:viewMode==='list'?'0.92rem':'0.98rem', fontWeight:800, color:B.ink, lineHeight:1.25, letterSpacing:'-0.01em' }}>
          {c.full_name}
        </Typography>
        <Typography noWrap sx={{ fontSize:'0.72rem', color:B.muted, fontWeight:500, mt:0.2 }}>
          {c.job_title} {c.experience_years!=null && `· ${c.experience_years} yr`}
        </Typography>
      </Box>
      {tab==='pending' && !selectable && (
        <Tooltip title="Delete" arrow>
          <IconButton size="small" disabled={isBusy}
            onClick={e=>{e.stopPropagation();onDelete(c);}}
            sx={{ color:B.faint, flexShrink:0, border:`1px solid ${B.border}`, borderRadius:'9px', p:0.6,
              '&:hover':{color:B.danger, bgcolor:B.dangerSoft, borderColor:'rgba(166,61,47,0.3)'} }}>
            <DeleteOutline sx={{fontSize:16}} />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );

  const poolPill = tab==='hired' ? (
    <Box sx={{ display:'inline-flex', alignItems:'center', bgcolor:B.doneSoft, color:B.done,
      px:1, py:0.4, borderRadius:'7px', fontSize:'0.6rem', fontWeight:800, letterSpacing:'0.05em',
      textTransform:'uppercase', lineHeight:1.6, fontFamily:FONT }}>🏆 Hired</Box>
  ) : tab==='rejected' ? (
    <Box sx={{ display:'inline-flex', alignItems:'center', bgcolor:B.dangerSoft, color:B.danger,
      px:1, py:0.4, borderRadius:'7px', fontSize:'0.6rem', fontWeight:800, letterSpacing:'0.05em',
      textTransform:'uppercase', lineHeight:1.6, fontFamily:FONT }}>Rejected (Pool)</Box>
  ) : (
    <Box sx={{ display:'inline-flex', alignItems:'center', bgcolor:B.amberSoft, color:B.amber,
      px:1, py:0.4, borderRadius:'7px', fontSize:'0.6rem', fontWeight:800, letterSpacing:'0.05em',
      textTransform:'uppercase', lineHeight:1.6, fontFamily:FONT }}>Awaiting Hire</Box>
  );

  const actions = tab==='pending' ? (
    <Stack direction="row" spacing={0.5} sx={{ flexShrink:0 }}>
      <Tooltip title="Hire" arrow><span>
        <Button size="small" variant="contained" disableElevation disabled={isBusy}
          startIcon={isBusy?<CircularProgress size={12} color="inherit"/>:<CheckCircle sx={{fontSize:14}}/>}
          onClick={e=>{e.stopPropagation();onHire(c);}}
          sx={{ bgcolor:B.done, color:'#fff', textTransform:'none', fontSize:'0.72rem', fontWeight:700,
            borderRadius:'999px', px:1.4, height:30, minWidth:0,
            '&:hover':{bgcolor:'#2B5B2B'} }}>Hire</Button>
      </span></Tooltip>
      <Tooltip title="Reject" arrow><span>
        <Button size="small" variant="outlined" disabled={isBusy}
          startIcon={<Cancel sx={{fontSize:14}}/>}
          onClick={e=>{e.stopPropagation();onReject(c);}}
          sx={{ color:B.danger, borderColor:'rgba(166,61,47,0.3)', textTransform:'none', fontSize:'0.72rem', fontWeight:700,
            borderRadius:'999px', px:1.4, height:30, minWidth:0,
            '&:hover':{bgcolor:B.dangerSoft, borderColor:B.danger} }}>Reject</Button>
      </span></Tooltip>
      </Stack>
  ) : (
    <Stack direction="row" spacing={0.5} sx={{ flexShrink:0 }}>
      <Tooltip title="View details" arrow>
        <IconButton size="small" onClick={e=>{e.stopPropagation();onDetail(c);}}
          sx={{ color:B.faint, border:`1px solid ${B.border}`, borderRadius:'9px', p:0.6,
            '&:hover':{bgcolor:B.sageSoft, color:B.pine, borderColor:B.sage} }}>
          <VisibilityOutlined sx={{fontSize:16}} />
        </IconButton>
      </Tooltip>
      <Tooltip title="Delete" arrow>
        <IconButton size="small" onClick={e=>{e.stopPropagation();onDelete(c);}}
          sx={{ color:B.faint, border:`1px solid ${B.border}`, borderRadius:'9px', p:0.6,
            '&:hover':{color:B.danger, bgcolor:B.dangerSoft, borderColor:'rgba(166,61,47,0.3)'} }}>
          <DeleteOutline sx={{fontSize:16}} />
        </IconButton>
      </Tooltip>
    </Stack>
  );

  /* ── LIST VIEW ─────────────────────────────────────────────────────── */
  if (viewMode==='list') return (
    <Card elevation={0} onClick={()=>selectable?onToggle(c):onDetail(c)}
      sx={{ fontFamily:FONT, '& .MuiTypography-root':{fontFamily:FONT},
        borderRadius:'14px', bgcolor:B.surface, border:`1px solid ${selected?B.sage:B.border}`,
        borderLeft:`4px solid ${fold.face}`, cursor:'pointer', opacity:isBusy?0.6:1,
        transition:'all 0.2s ease',
        '&:hover':{borderColor:B.sage, borderLeftColor:fold.face, boxShadow:'0 6px 20px rgba(2,33,36,0.08)'} }}>
      <Box sx={{ display:{xs:'none',md:'grid'}, gridTemplateColumns:'2.2fr 1.1fr 1fr 0.8fr auto', alignItems:'center', px:2.25, py:1.6, gap:2 }}>
        {identity}
        <Box sx={{ display:'flex', alignItems:'center', gap:1.25 }}>
          <ScoreGauge score={c.overall_cps} size={34} strokeWidth={3.5} />
          <Tooltip title="Experience" arrow><Box sx={{display:'flex',alignItems:'center',gap:0.4,cursor:'help'}}>
            <WorkOutlineRounded sx={{fontSize:14,color:B.faint}} />
            <Typography sx={{fontSize:'0.76rem',color:B.muted,fontWeight:500}}>{c.experience_years??0} yr</Typography>
          </Box></Tooltip>
        </Box>
        <Typography noWrap sx={{ fontSize:'0.76rem', color:B.muted, fontWeight:600 }}>
          {c.daysWaiting!=null ? `${c.daysWaiting}d waiting` : fmtDate(c.application_date)}
        </Typography>
        {poolPill}
        {actions}
      </Box>
      <Box sx={{ display:{xs:'flex',md:'none'}, flexDirection:'column', p:1.75, gap:1.1 }}>
        {identity}
        <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:1 }}>
          {poolPill}
          {actions}
        </Box>
      </Box>
    </Card>
  );

  /* ── GRID VIEW — dog-ear fold card ─────────────────────────────────── */
  return (
    <Card elevation={0} onClick={()=>selectable?onToggle(c):onDetail(c)}
      sx={{
        position:'relative', height:'100%', display:'flex', flexDirection:'column',
        borderRadius:'16px', bgcolor:B.surface, overflow:'hidden',
        border:`1px solid ${selected?B.sage:B.border}`,
        fontFamily:FONT, '& .MuiTypography-root':{fontFamily:FONT},
        boxShadow:selected?`0 0 0 2px ${B.sageSoft}, 0 10px 26px rgba(2,33,36,0.08)`:'0 10px 26px rgba(2,33,36,0.06)',
        cursor:'pointer', opacity:isBusy?0.6:1,
        transition:'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease',
        '&:hover':{ transform:'translateY(-4px)', boxShadow:'0 22px 48px -18px rgba(2,33,36,0.16)', borderColor:B.sage },
        '&:hover .dogear':{ borderTopWidth:'44px', borderLeftWidth:'44px' },
      }}>
      {/* Dog-ear */}
      <Box sx={{ position:'absolute', top:0, right:0, zIndex:1, pointerEvents:'none' }}>
        <Box className="dogear" sx={{ width:0, height:0, borderLeft:`38px solid ${fold.edge}`, borderTop:`38px solid ${fold.face}`, borderRadius:'0 16px 0 0', transition:'border-width .25s ease' }} />
        <Box sx={{ position:'absolute', top:0, right:0, width:38, height:38, background:'linear-gradient(225deg, transparent 50%, rgba(2,33,36,0.16) 50%, transparent 64%)' }} />
      </Box>
      {selectable && (
        <Checkbox checked={selected} onChange={()=>onToggle(c)} onClick={e=>e.stopPropagation()} size="small"
          sx={{ position:'absolute', top:6, left:6, zIndex:2, p:0.5, color:B.borderS, '&.Mui-checked':{color:B.sage},
            bgcolor:'rgba(255,255,255,0.85)', borderRadius:'8px', '&:hover':{bgcolor:B.sageSoft} }} />
      )}
      <Box sx={{ p:'17px 18px 18px', display:'flex', flexDirection:'column', flex:1, minWidth:0 }}>
        {/* Header */}
        <Box sx={{ display:'flex', alignItems:'center', gap:1.4, pr:3.5, pl:selectable?3.5:0, minWidth:0 }}>
          <Box sx={{
            position:'relative', width:42, height:42, borderRadius:'50%', flexShrink:0, overflow:'hidden',
            bgcolor:B.pine, color:B.sage, display:'flex', alignItems:'center', justifyContent:'center',
            fontWeight:700, fontSize:'0.85rem', fontFamily:FONT,
          }}>
            {initials}
            {c.photo_url && <Box component="img" src={c.photo_url} alt={c.full_name}
              onError={e=>{e.currentTarget.style.display='none';}}
              sx={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', bgcolor:'#fff', display:'block' }} />}
          </Box>
          <Box sx={{ minWidth:0, flex:1 }}>
            <Typography sx={{ fontSize:'0.98rem', fontWeight:800, color:B.ink, lineHeight:1.25, letterSpacing:'-0.015em',
              display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden', minHeight:'2.5em' }}>
              {c.full_name}
            </Typography>
            <Typography noWrap sx={{ fontSize:'0.72rem', color:B.muted, mt:0.3, fontWeight:500 }}>
              {c.job_title} {c.experience_years!=null && `· ${c.experience_years} yr`}
            </Typography>
          </Box>
          {tab==='pending' && !selectable && (
            <Tooltip title="Delete" arrow>
              <IconButton size="small" disabled={isBusy}
                onClick={e=>{e.stopPropagation();onDelete(c);}}
                sx={{ color:B.faint, flexShrink:0, alignSelf:'flex-end', p:0.5,
                  '&:hover':{color:B.danger, bgcolor:B.dangerSoft} }}>
                <DeleteOutline sx={{fontSize:16}} />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* Score gauge + waiting meta */}
        <Box sx={{ display:'flex', alignItems:'center', gap:1.5, mt:1.75, mb:1.5 }}>
          <ScoreGauge score={c.overall_cps} size={56} strokeWidth={5} />
          <Box sx={{ display:'flex', flexDirection:'column', gap:0.6 }}>
          {c.daysWaiting!=null && (
              <Box sx={{display:'flex',alignItems:'center',gap:0.4}}>
                <AccessTime sx={{fontSize:14,color:B.faint}} />
                <Typography sx={{fontSize:'0.76rem',color:B.muted,fontWeight:500}}>{c.daysWaiting}d waiting</Typography>
              </Box>
            )}
            {tab==='pending'&&c.pool_type==='final_pending'&&c.daysUntilExpiry!=null && (
              <Box sx={{display:'flex',alignItems:'center',gap:0.4}}>
                <TimerOff sx={{fontSize:14,color:c.daysUntilExpiry<=5?B.danger:B.amber}} />
                <Typography sx={{fontSize:'0.76rem',color:c.daysUntilExpiry<=5?B.danger:B.amber,fontWeight:700}}>
                  {c.daysUntilExpiry===0?'Expires today':`${c.daysUntilExpiry}d left`}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>

        {/* Window line */}
        <Box sx={{ display:'flex', alignItems:'center', gap:0.75, mt:'auto', py:1.25,
          borderTop:`1px dashed ${B.border}`, borderBottom:`1px dashed ${B.border}`, mb:1.5 }}>
          <Typography noWrap sx={{ fontSize:'0.73rem', fontWeight:600, color:B.muted }}>
            {tab==='rejected'
              ? `Rejected ${fmtDate(c.rejected_date)} · Round ${c.round_number??'—'}`
              : `Completed ${fmtDate(c.completed_date || c.application_date)}`}
          </Typography>
        </Box>

        {/* Footer: pool pill + actions */}
        <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:1 }}>
          {poolPill}
          {actions}
        </Box>
      </Box>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ */
const PendingCandidates = () => {
  const {
    candidates, jobs, stats, loading, error, busyId,
    activeTab, setActiveTab,
    search, setSearch, jobFilter, setJobFilter,
    poolFilter, setPoolFilter,
    sortBy, setSortBy, refresh, hire, reject,
    selectionMode, setSelectionMode,
    selectedKeys, toggleSelect, clearSelection, enterSelectionMode, selectAll,
    keyOf, hiding, hideOne, hideSelected,
  } = usePendingCandidates();

  const [confirmHire, setConfirmHire]     = useState(null);
  const [confirmReject, setConfirmReject] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [detailC, setDetailC]             = useState(null);
  const [viewMode, setViewMode]           = useState('grid');
  const [page, setPage]                   = useState(1);
  const [pageSize, setPageSize]           = useState(10);

  useEffect(()=>{setPage(1);},[search,jobFilter,sortBy,activeTab,poolFilter,pageSize]);
  const effectiveSize = pageSize==='all'?Math.max(candidates.length,1):pageSize;
  const totalPages = Math.max(1,Math.ceil(candidates.length/effectiveSize));
  useEffect(()=>{if(page>totalPages)setPage(1);},[page,totalPages]);
  const paged = useMemo(()=>candidates.slice((page-1)*effectiveSize,page*effectiveSize),[candidates,page,effectiveSize]);

  if (loading) return (
    <Box className="page-fade-in" sx={{ p:{xs:1.5,sm:2,md:3,lg:4}, maxWidth:1440, mx:'auto', bgcolor:B.bg, minHeight:'100vh', fontFamily:FONT }}>
      <Paper elevation={0} sx={{ bgcolor:B.surface, border:`1px solid ${B.border}`, borderRadius:'16px', p:3, mb:2.5 }}>
        <Skeleton width="40%" height={36} sx={{borderRadius:'8px'}} />
        <Skeleton width="30%" height={20} sx={{mt:1,borderRadius:'6px'}} />
      </Paper>
      <Box sx={{ display:'grid', gridTemplateColumns:{xs:'1fr',sm:'repeat(2,1fr)',md:'repeat(3,1fr)',lg:'repeat(4,1fr)'}, gap:2 }}>
        {[0,1,2,3].map(i=>(
          <Card key={i} elevation={0} sx={{borderRadius:'16px',border:`1px solid ${B.border}`,p:2.25}}>
            <Stack direction="row" spacing={1.5} alignItems="center"><Skeleton variant="circular" width={42} height={42} /><Box sx={{flex:1}}><Skeleton width="80%" height={20}/><Skeleton width="55%" height={14}/></Box></Stack>
            <Skeleton width="70%" height={16} sx={{mt:2}} />
            <Skeleton variant="rounded" height={34} sx={{mt:1.5,borderRadius:'9px'}} />
          </Card>
        ))}
      </Box>
    </Box>
  );

  if (error) return (
    <Box sx={{p:4,textAlign:'center',fontFamily:FONT}}>
      <Typography sx={{color:B.danger,mb:2,fontWeight:700}}>{error}</Typography>
      <Button startIcon={<RefreshOutlined/>} onClick={refresh} variant="outlined"
        sx={{borderRadius:'10px',textTransform:'none',borderColor:B.border,color:B.pine,'&:hover':{bgcolor:B.sageSoft}}}>Try Again</Button>
    </Box>
  );

  return (
    <Box className="page-fade-in" sx={{
      p:{xs:1.5,sm:2,md:3,lg:4}, maxWidth:1440, mx:'auto', bgcolor:B.bg, minHeight:'100vh', fontFamily:FONT,
      '& .MuiTypography-root, & .MuiButton-root, & .MuiChip-root, & .MuiInputBase-root, & .MuiMenuItem-root, & .MuiPaginationItem-root':{fontFamily:FONT},
    }}>
      {/* ── Hero header ────────────────────────────────────────────────── */}
      <Paper elevation={0} sx={{ bgcolor:B.surface, border:`1px solid ${B.border}`, borderRadius:{xs:'14px',sm:'16px'},
        p:{xs:2,sm:2.5,md:3}, mb:{xs:2,md:2.5}, boxShadow:'0 1px 2px rgba(16,18,16,0.04)' }}>

        <Stack direction="row" sx={{ alignItems:'flex-start', justifyContent:'space-between', gap:1.5, mb:{xs:2,md:2.25} }}>
          <Box sx={{minWidth:0}}>
            <Typography component="h1" sx={{ fontWeight:700, color:B.ink, letterSpacing:'-0.02em', lineHeight:1.15,
              fontSize:{xs:'1.3rem',sm:'1.45rem',md:'1.6rem'} }}>
              Pending Candidates
            </Typography>
            <Typography sx={{ color:B.muted, fontSize:{xs:'0.82rem',sm:'0.9rem'}, fontWeight:500, mt:0.5 }}>
              <Box component="span" sx={{color:B.sageText,fontWeight:700}}>
                {`${candidates.length} ${candidates.length===1?'candidate':'candidates'}`}
              </Box>
              {' '}awaiting your decision
            </Typography>
          </Box>
          <Tooltip title="Refresh" arrow><span>
            <IconButton onClick={refresh} size="small" sx={{ color:B.muted, border:`1px solid ${B.borderS}`, borderRadius:'9px',
              '&:hover':{bgcolor:B.sageSoft, color:B.pine, borderColor:B.sage} }}>
              <RefreshOutlined sx={{fontSize:18}} />
            </IconButton>
          </span></Tooltip>
        </Stack>

        {/* Search + job filter + sort */}
        <Stack direction="row" spacing={1} sx={{ alignItems:'stretch', flexWrap:'wrap', gap:1 }}>
          <TextField placeholder="Search by name, email, job, skill…" value={search} onChange={e=>setSearch(e.target.value)}
            slotProps={{ input:{
              startAdornment:<InputAdornment position="start"><Search sx={{color:B.muted,fontSize:20}}/></InputAdornment>,
              endAdornment:search?(<InputAdornment position="end"><IconButton size="small" onClick={()=>setSearch('')}
                sx={{color:B.muted,'&:hover':{color:B.ink,bgcolor:'rgba(16,18,16,0.05)'}}}><ClearRounded sx={{fontSize:18}}/></IconButton></InputAdornment>):null,
            }}}
            sx={{ flex:'1 1 300px', minWidth:{xs:'100%',sm:260},
              '& .MuiOutlinedInput-root':{ bgcolor:B.bg, borderRadius:'25px', fontSize:{xs:'0.88rem',sm:'0.92rem'},
                height:{xs:46,md:48}, color:B.ink, boxShadow:'0 4px 12px rgba(0,0,0,0.08)',
                '& input::placeholder':{color:B.muted,opacity:0.85},
                '& fieldset':{borderColor:'#B0BEC5',borderWidth:'1.5px'},
                '&:hover fieldset':{borderColor:'#78909C',borderWidth:'2px'},
                '&.Mui-focused':{boxShadow:'0 6px 18px rgba(0,0,0,0.12)'},
                '&.Mui-focused fieldset':{borderColor:B.sage,borderWidth:'2px'} } }}
          />
          <Select value={jobFilter} onChange={e=>setJobFilter(e.target.value)} size="small" displayEmpty
            sx={{ bgcolor:B.bg, borderRadius:'25px', fontSize:'0.88rem', fontWeight:700, height:{xs:46,md:48}, minWidth:160,
              boxShadow:'0 4px 12px rgba(0,0,0,0.08)', color:B.ink,
              '& fieldset':{borderColor:'#B0BEC5',borderWidth:'1.5px'},
              '&:hover fieldset':{borderColor:'#78909C'},
              '&.Mui-focused fieldset':{borderColor:B.sage,borderWidth:'2px'} }}>
            <MenuItem value="all" sx={{fontSize:'0.82rem',fontWeight:600}}>All Jobs</MenuItem>
            {jobs.map(j=><MenuItem key={j.id} value={j.id} sx={{fontSize:'0.82rem'}}>{j.title}</MenuItem>)}
          </Select>
          <Select value={sortBy} onChange={e=>setSortBy(e.target.value)} size="small"
            sx={{ bgcolor:B.bg, borderRadius:'25px', fontSize:'0.88rem', fontWeight:700, height:{xs:46,md:48}, minWidth:160,
              boxShadow:'0 4px 12px rgba(0,0,0,0.08)', color:B.ink,
              '& fieldset':{borderColor:'#B0BEC5',borderWidth:'1.5px'},
              '&:hover fieldset':{borderColor:'#78909C'},
              '&.Mui-focused fieldset':{borderColor:B.sage,borderWidth:'2px'} }}>
            <MenuItem value="waiting" sx={{fontSize:'0.82rem'}}>Longest Waiting</MenuItem>
            <MenuItem value="recent" sx={{fontSize:'0.82rem'}}>Most Recent</MenuItem>
            <MenuItem value="score" sx={{fontSize:'0.82rem'}}>Highest Score</MenuItem>
            <MenuItem value="name" sx={{fontSize:'0.82rem'}}>Name</MenuItem>
          </Select>
        </Stack>

        {/* Tab chips + view toggle */}
        <Stack direction="row" sx={{ alignItems:'center', mt:{xs:1.75,md:2}, gap:1, flexWrap:'wrap' }}>
          <Box sx={{ display:'flex', gap:0.75, alignItems:'center', mr:'auto', minWidth:0 }}>
            {TAB_CHIPS.map(opt=>{
              const sel=activeTab===opt.value;
              const cc=TAB_COLORS[opt.value];
              const count=stats[opt.value]??0;
              return (
                <Box key={opt.value} onClick={()=>setActiveTab(opt.value)} role="button" tabIndex={0}
                  sx={{ cursor:'pointer', userSelect:'none', display:'inline-flex', alignItems:'center', gap:0.6,
                    px:1.5, py:0.65, borderRadius:999, flexShrink:0, fontSize:'0.8rem', fontWeight:sel?700:600,
                    ...(sel?{bgcolor:cc.soft,color:cc.ink,border:`1px solid ${cc.tint}`}:{bgcolor:B.surface,color:B.muted,border:`1px solid ${B.borderS}`}),
                    transition:'all 0.16s ease',
                    '&:hover':sel?{}:{bgcolor:cc.soft,borderColor:cc.tint,color:cc.ink} }}>
                  <Box component="span" sx={{ width:7, height:7, borderRadius:'50%', bgcolor:cc.dot, flexShrink:0,
                    boxShadow:sel?`0 0 0 2px ${cc.soft}`:'none' }} />
                  {opt.label}
                  <Box component="span" sx={{ fontSize:'0.68rem', fontWeight:800, lineHeight:1.6, px:0.7, borderRadius:999,
                    bgcolor:sel?B.surface:B.bg, color:sel?cc.ink:B.muted }}>{count}</Box>
                </Box>
              );
            })}
          </Box>
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

      {/* Select toggle — right-aligned below the hero box */}
      {!selectionMode && candidates.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1.5 }}>
          <Button
            size="small"
            onClick={() => selectAll(candidates)}
            startIcon={<CheckBoxOutlined sx={{ fontSize: 16 }} />}
            sx={{
              textTransform: 'none', fontWeight: 700, fontSize: '0.8rem',
              color: B.pine, bgcolor: B.surface,
              border: `1px solid ${B.borderS}`, borderRadius: '9px',
              px: 1.5, height: 34,
              '&:hover': { bgcolor: B.sageSoft, borderColor: B.sage },
            }}
          >
            Select All
          </Button>
        </Box>
      )}

      {/* Selection bar */}
      {selectionMode && (
        <Box sx={{ mb:2, px:2, py:1.2, bgcolor:B.pine, color:'#fff', borderRadius:'12px',
          display:'flex', alignItems:'center', justifyContent:'space-between', boxShadow:'0 4px 12px rgba(2,33,36,0.25)' }}>
          <Typography sx={{fontSize:'0.85rem',fontWeight:700}}>{selectedKeys.size} selected</Typography>
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="contained" disableElevation disabled={selectedKeys.size===0||hiding}
              onClick={()=>setConfirmDelete('bulk')}
              sx={{bgcolor:B.danger,color:'#fff',textTransform:'none',fontWeight:700,borderRadius:'8px','&:hover':{bgcolor:'#8C3225'}}}>Delete</Button>
            <Button size="small" variant="outlined" onClick={clearSelection}
              sx={{color:'#fff',borderColor:'rgba(255,255,255,0.4)',textTransform:'none',fontWeight:700,borderRadius:'8px'}}>Cancel</Button>
          </Stack>
        </Box>
      )}

      {/* Empty */}
      {candidates.length===0 && (
        <Box sx={{ textAlign:'center', py:{xs:5,sm:7}, px:2, bgcolor:B.surface, borderRadius:'16px', border:`1px dashed ${B.borderS}` }}>
          <HourglassEmpty sx={{fontSize:44,color:B.border,mb:1.5}} />
          <Typography sx={{mb:1,color:B.ink,fontWeight:700,fontSize:'1.05rem'}}>
            {activeTab==='hired' ? 'No hires yet'
              : activeTab==='rejected' ? 'No pool rejections'
              : 'No pending candidates'}
          </Typography>
          <Typography sx={{color:B.muted,fontSize:'0.875rem'}}>
            {activeTab==='hired' ? 'Confirm a Hire from the Pending Review tab to see them here.'
              : activeTab==='rejected' ? 'These are candidates rejected AFTER passing the Final round — separate from Final-round rejections which live on the Final Hire page.'
              : 'Candidates arrive here after being Approved in the Final round of Ranked Results.'}
          </Typography>
        </Box>
      )}

      {/* Cards */}
      {paged.length>0 && (
        <Box sx={{ display:'grid',
          gridTemplateColumns:{
            xs:'1fr',
            sm:viewMode==='grid'?'repeat(2,1fr)':'1fr',
            md:viewMode==='grid'?'repeat(3,1fr)':'1fr',
            lg:viewMode==='grid'?'repeat(4,1fr)':'1fr',
          },
          gap:viewMode==='grid'?{xs:1.5,sm:1.75,md:2}:{xs:1,sm:1.25} }}>
          {paged.map(c=>(
            <CandidateCard key={`${c.process_id}_${c.candidate_id}`} c={c} tab={activeTab} viewMode={viewMode}
              busyId={busyId} onDetail={setDetailC} onHire={setConfirmHire} onReject={setConfirmReject}
              onDelete={c2=>setConfirmDelete(c2)} selectable={selectionMode} selected={selectedKeys.has(keyOf(c))}
              onToggle={toggleSelect} keyOf={keyOf} />
          ))}
        </Box>
      )}

      {/* Pagination */}
      {candidates.length>0 && (
        <Box sx={{ mt:{xs:3,sm:3.5}, mb:4, display:'flex', flexDirection:{xs:'column',sm:'row'}, justifyContent:'space-between', alignItems:'center', gap:{xs:1.5,sm:2} }}>
          <Stack direction="row" spacing={2} sx={{alignItems:'center',flexWrap:'wrap',rowGap:1}}>
            <Typography sx={{fontSize:'0.82rem',color:B.muted,fontWeight:500,whiteSpace:'nowrap',lineHeight:'36px'}}>
              Showing <Box component="span" sx={{color:B.ink,fontWeight:700}}>{(page-1)*effectiveSize+1}–{Math.min(page*effectiveSize,candidates.length)}</Box> of <Box component="span" sx={{color:B.ink,fontWeight:700}}>{candidates.length}</Box> candidates
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

      {/* Detail dialog */}
      <Dialog open={!!detailC} onClose={()=>setDetailC(null)} maxWidth="sm" fullWidth TransitionComponent={Grow}
        PaperProps={{sx:{borderRadius:'16px',overflow:'hidden'}}}>
        {detailC && (<Box>
          <Box sx={{ background:`linear-gradient(135deg, ${B.pine} 0%, #0A3F42 100%)`, px:2.5, pt:2.5, pb:2, position:'relative' }}>
            <IconButton size="small" onClick={()=>setDetailC(null)}
              sx={{position:'absolute',top:10,right:10,color:'rgba(255,255,255,0.7)','&:hover':{color:'#fff',bgcolor:'rgba(255,255,255,0.12)'}}}>
              <Close sx={{fontSize:18}} />
            </IconButton>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar src={detailC.photo_url} alt={detailC.full_name}
                sx={{width:52,height:52,fontSize:'1.2rem',fontWeight:700,bgcolor:B.amberSoft,color:B.amber,border:'2px solid rgba(255,255,255,0.35)'}}>
                {detailC.full_name?.[0]?.toUpperCase()}
              </Avatar>
              <Box sx={{minWidth:0}}>
                <Typography sx={{color:'#fff',fontWeight:800,fontSize:'1rem',lineHeight:1.2}}>{detailC.full_name}</Typography>
                <Typography sx={{color:'rgba(255,255,255,0.75)',fontSize:'0.72rem',mt:0.3}}>{detailC.email}</Typography>
                <Stack direction="row" spacing={0.6} sx={{mt:0.8}}>
                  <Chip label={activeTab==='hired'?'Hired':activeTab==='rejected'?'Rejected (Pool)':'Awaiting Hire'} size="small"
                    sx={{height:20,fontSize:'0.62rem',fontWeight:700,
                      bgcolor:activeTab==='hired'?B.doneSoft:activeTab==='rejected'?B.dangerSoft:B.amberSoft,
                      color:activeTab==='hired'?B.done:activeTab==='rejected'?B.danger:B.amber}} />
                  {detailC.daysWaiting!=null && (
                    <Chip icon={<AccessTime sx={{fontSize:'12px !important',color:`${B.sage} !important`}} />}
                      label={`${detailC.daysWaiting}d waiting`} size="small"
                      sx={{height:20,fontSize:'0.62rem',fontWeight:700,bgcolor:'rgba(255,255,255,0.12)',color:B.sage}} />
                  )}
                </Stack>
              </Box>
            </Stack>
          </Box>
          <Box sx={{p:3,fontFamily:FONT}}>
            <Stack direction="row" spacing={1.2} sx={{mb:2.2,p:1.6,bgcolor:B.bg,borderRadius:'10px',border:`1px solid ${B.border}`,alignItems:'center'}}>
              <Box sx={{flex:1,minWidth:0}}>
                <Typography sx={{fontSize:'0.66rem',color:B.faint,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.05em'}}>Applied for</Typography>
                <Typography sx={{fontSize:'0.95rem',fontWeight:700,color:B.ink}}>{detailC.job_title}</Typography>
              </Box>
              <Box sx={{textAlign:'right',flexShrink:0}}>
                <Typography sx={{fontSize:'0.66rem',color:B.faint,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.05em'}}>Overall</Typography>
                <Typography sx={{fontSize:'1.45rem',fontWeight:900,color:scoreColor(detailC.overall_cps),lineHeight:1.1}}>
                  {detailC.overall_cps??'—'}<span style={{fontSize:'0.8rem',color:B.faint,fontWeight:600}}>/10</span>
                </Typography>
              </Box>
            </Stack>
            {[
              {label:'Applied',value:fmtDate(detailC.application_date)},
              activeTab==='rejected'?{label:'Rejected on',value:fmtDate(detailC.rejected_date)}:{label:'Completed',value:fmtDate(detailC.completed_date)},
              {label:'Round',value:`${detailC.round_number??'—'} of ${detailC.total_rounds??'—'}`},
            ].map(row=>(
              <Stack key={row.label} direction="row" sx={{justifyContent:'space-between',alignItems:'center',py:1.2,borderBottom:`1px solid ${B.border}`}}>
                <Typography sx={{fontSize:'0.82rem',color:B.muted,fontWeight:600}}>{row.label}</Typography>
                <Typography sx={{fontSize:'0.82rem',color:B.ink,fontWeight:700}}>{row.value}</Typography>
              </Stack>
            ))}
            {detailC.rounds?.length>0 && (<Box sx={{mt:1.8}}>
              <Typography sx={{fontSize:'0.68rem',color:B.faint,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.05em',mb:1}}>Round Performance</Typography>
              {detailC.rounds.map(r=>{
                const sVal=r.cgps_score??(r.doc_overall_pct!=null?r.doc_overall_pct/10:null);
                return (<Stack key={r.round_number} direction="row" sx={{alignItems:'center',justifyContent:'space-between',py:0.6}}>
                  <Typography sx={{fontSize:'0.82rem',color:B.body}}>{`R${r.round_number} · ${r.name||r.round_name||'Round '+r.round_number}`}</Typography>
                  <Typography sx={{fontSize:'0.9rem',fontWeight:800,color:scoreColor(sVal)}}>{sVal!=null?sVal:'—'}<span style={{fontSize:'0.68rem',color:B.faint,fontWeight:600}}>/10</span></Typography>
                </Stack>);
              })}
            </Box>)}
            {detailC.skills?.length>0 && (<Box sx={{mt:1.8}}>
              <Typography sx={{fontSize:'0.68rem',color:B.faint,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.05em',mb:0.8}}>Skills</Typography>
              <Stack direction="row" spacing={0.6} flexWrap="wrap" useFlexGap>
                {detailC.skills.map(s=><Chip key={s} label={s} size="small" sx={{height:24,fontSize:'0.72rem',fontWeight:500,bgcolor:B.bg,color:B.body}}/>)}
              </Stack>
            </Box>)}
            {activeTab==='rejected'&&detailC.comment && (
              <Box sx={{mt:1.8,p:1.4,bgcolor:B.dangerSoft,border:`1px solid rgba(166,61,47,0.2)`,borderRadius:'8px'}}>
                <Typography sx={{fontSize:'0.78rem',color:B.danger,fontStyle:'italic'}}>"{detailC.comment}"</Typography>
              </Box>
            )}
          </Box>
        </Box>)}
      </Dialog>

      {/* Hire confirm */}
      <Dialog open={!!confirmHire} onClose={()=>setConfirmHire(null)} maxWidth="xs" fullWidth TransitionComponent={Grow} PaperProps={{sx:{borderRadius:'16px',overflow:'hidden'}}}>
        <Box sx={{background:`linear-gradient(135deg, ${B.done} 0%, #2B5B2B 100%)`,px:3,py:2,display:'flex',alignItems:'center',gap:1.3}}>
          <Box sx={{width:38,height:38,borderRadius:'11px',bgcolor:'rgba(255,255,255,0.16)',display:'flex',alignItems:'center',justifyContent:'center'}}><CheckCircle sx={{color:'#fff',fontSize:21}}/></Box>
          <Typography sx={{color:'#fff',fontWeight:800,fontSize:'1rem',fontFamily:FONT}}>Confirm Hire</Typography>
        </Box>
        <DialogContent sx={{pt:2.5}}><DialogContentText sx={{fontSize:'0.85rem',color:B.body,lineHeight:1.6,fontFamily:FONT}}>
          Hire <strong>{confirmHire?.full_name}</strong> for <strong>{confirmHire?.job_title}</strong>?
        </DialogContentText></DialogContent>
        <DialogActions sx={{px:3,pb:2}}>
          <Button onClick={()=>setConfirmHire(null)} sx={{textTransform:'none',color:B.muted,fontFamily:FONT}}>Cancel</Button>
          <Button variant="contained" disableElevation onClick={()=>{const c=confirmHire;setConfirmHire(null);hire(c.candidate_id,c.full_name,c.process_id);}}
            sx={{bgcolor:B.done,'&:hover':{bgcolor:'#2B5B2B'},textTransform:'none',fontWeight:700,borderRadius:'10px',px:2.5,fontFamily:FONT}}>Confirm Hire</Button>
        </DialogActions>
      </Dialog>

      {/* Reject confirm */}
      <Dialog open={!!confirmReject} onClose={()=>setConfirmReject(null)} maxWidth="xs" fullWidth TransitionComponent={Grow} PaperProps={{sx:{borderRadius:'16px',overflow:'hidden'}}}>
        <Box sx={{background:`linear-gradient(135deg, ${B.danger} 0%, #8C3225 100%)`,px:3,py:2,display:'flex',alignItems:'center',gap:1.3}}>
          <Box sx={{width:38,height:38,borderRadius:'11px',bgcolor:'rgba(255,255,255,0.16)',display:'flex',alignItems:'center',justifyContent:'center'}}><Cancel sx={{color:'#fff',fontSize:21}}/></Box>
          <Typography sx={{color:'#fff',fontWeight:800,fontSize:'1rem',fontFamily:FONT}}>Confirm Reject</Typography>
        </Box>
        <DialogContent sx={{pt:2.5}}><DialogContentText sx={{fontSize:'0.85rem',color:B.body,lineHeight:1.6,fontFamily:FONT}}>
          Reject <strong>{confirmReject?.full_name}</strong>? They will be notified.
        </DialogContentText></DialogContent>
        <DialogActions sx={{px:3,pb:2}}>
          <Button onClick={()=>setConfirmReject(null)} sx={{textTransform:'none',color:B.muted,fontFamily:FONT}}>Cancel</Button>
          <Button variant="contained" disableElevation onClick={()=>{const c=confirmReject;setConfirmReject(null);reject(c.candidate_id,c.full_name,c.process_id,c.round_number);}}
            sx={{bgcolor:B.danger,'&:hover':{bgcolor:'#8C3225'},textTransform:'none',fontWeight:700,borderRadius:'10px',px:2.5,fontFamily:FONT}}>Confirm Reject</Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!confirmDelete} onClose={()=>setConfirmDelete(null)} maxWidth="xs" fullWidth TransitionComponent={Grow} PaperProps={{sx:{borderRadius:'16px',overflow:'hidden'}}}>
        <Box sx={{background:`linear-gradient(135deg, ${B.danger} 0%, #6B2820 100%)`,px:3,py:2,display:'flex',alignItems:'center',gap:1.3}}>
          <Box sx={{width:38,height:38,borderRadius:'11px',bgcolor:'rgba(255,255,255,0.16)',display:'flex',alignItems:'center',justifyContent:'center'}}><DeleteOutline sx={{color:'#fff',fontSize:21}}/></Box>
          <Typography sx={{color:'#fff',fontWeight:800,fontSize:'1rem',fontFamily:FONT}}>Confirm Delete</Typography>
        </Box>
        <DialogContent sx={{pt:2.5}}><DialogContentText sx={{fontSize:'0.85rem',color:B.body,lineHeight:1.6,fontFamily:FONT}}>
          {confirmDelete==='bulk'?<>Remove <strong>{selectedKeys.size}</strong> candidate{selectedKeys.size===1?'':'s'} from your view?</>
            :<>Remove <strong>{confirmDelete?.full_name}</strong> from your view?</>}
        </DialogContentText></DialogContent>
        <DialogActions sx={{px:3,pb:2}}>
          <Button onClick={()=>setConfirmDelete(null)} sx={{textTransform:'none',color:B.muted,fontFamily:FONT}}>Cancel</Button>
          <Button variant="contained" disableElevation disabled={hiding}
            onClick={()=>{const t=confirmDelete;setConfirmDelete(null);if(t==='bulk')hideSelected();else hideOne(t);}}
            sx={{bgcolor:B.danger,'&:hover':{bgcolor:'#8C3225'},textTransform:'none',fontWeight:700,borderRadius:'10px',px:2.5,fontFamily:FONT}}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PendingCandidates;