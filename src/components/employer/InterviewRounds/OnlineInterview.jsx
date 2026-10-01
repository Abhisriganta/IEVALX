import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Box, Typography, Button, Stack, IconButton, Tooltip, Chip,
  CircularProgress, Card, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, InputAdornment, Paper, Avatar, Skeleton,
  Pagination, Select, MenuItem,
  ToggleButton, ToggleButtonGroup, Checkbox,
} from '@mui/material';
import {
  Refresh, Search as SearchIcon, ClearRounded, ViewList, ViewModule,
  VideoCall, Close, VisibilityOutlined, PlayArrow,
  Delete as DeleteOutline, HelpOutlineOutlined, AccessTimeOutlined,
  Schedule, Videocam, OpenInNew, Chat as ChatIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import interviewRoundService from '../../../services/api/employer/interviewRound';
import { interviewAPI } from '../../../services/api/employer/candidateService';
import jobseekerService from '../../../services/api/jobseeker/jobseekerService';

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

const GRACE_MS = 5 * 60 * 1000; 

const roomFromLink = (link) => {
  if (!link) return null;
  const m = String(link).match(/\/live-room\/([^/?#]+)/);
  return m ? m[1] : null;
};

const fmt = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',timeZone:'Asia/Kolkata'}) : '—';

// Generic ISO datetime formatter — forces IST render even if browser TZ differs.
const fmtDT = d => {
  if (!d) return '—';
  const s = String(d);
  const iso = /T|Z|\+/.test(s) ? s : `${s}T00:00:00+05:30`;
  const t = new Date(iso).getTime();
  return isNaN(t) ? '—' : new Date(t).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Kolkata'});
};

// Combine Django DateField ("2026-07-29") + TimeField ("16:00:00") as IST wall-clock.
const parseSchedIST = iv => {
  if (!iv?.date) return NaN;
  const dateStr = String(iv.date).slice(0, 10);
  const timeStr = iv.time ? String(iv.time).slice(0, 8) : '00:00:00';
  // Anchor to IST explicitly — do not let the browser reinterpret in local tz.
  const ms = new Date(`${dateStr}T${timeStr}+05:30`).getTime();
  return isNaN(ms) ? NaN : ms;
};

// Combined date + time for the card (uses iv.date AND iv.time together).
const fmtSched = iv => {
  const t = parseSchedIST(iv);
  return isNaN(t)
    ? '—'
    : new Date(t).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Kolkata'});
};

const isExpired = iv => {
  if (!iv?.date) return false;
  if (['completed','cancelled','live','in_progress'].includes(iv.status)) return false;
  // Trust an explicit backend terminal status too.
  if (['no_attempt','expired','partial'].includes(iv.status)) return true;
  const start = parseSchedIST(iv);
  if (isNaN(start)) return false;
  return Date.now() > start + (Number(iv.duration)||60)*60*1000 + GRACE_MS;
};

const getCandidateName = item => {
  if (!item) return '—';
  const c = item.candidate;
  if (!c || typeof c !== 'object') return item.candidate_id != null ? `#${item.candidate_id}` : '—';
  const pick = (...v) => v.find(x => typeof x === 'string' && x.trim());
  const flat = pick(c.full_name, c.name, `${c.first_name||''} ${c.last_name||''}`.trim(), c.email);
  return flat || '—';
};

const STATUS_STYLE = {
  upcoming:    { color: B.pine,   bg: '#E8EFEF',   dot: B.pine },
  live:        { color: B.done,   bg: B.doneSoft,  dot: B.done },
  in_progress: { color: B.done,   bg: B.doneSoft,  dot: B.done },
  completed:   { color: B.done,   bg: B.doneSoft,  dot: B.done },
  cancelled:   { color: B.faint,  bg: '#F0F2ED',   dot: B.faint },
  expired:     { color: B.danger, bg: B.dangerSoft, dot: B.danger },
};
const FOLD_MAP = {
  upcoming:    { face: B.sage,   edge: B.sageSoft },
  live:        { face: B.done,   edge: B.doneSoft },
  in_progress: { face: B.done,   edge: B.doneSoft },
  completed:   { face: B.done,   edge: B.doneSoft },
  cancelled:   { face: B.faint,  edge: '#F0F2ED' },
  expired:     { face: B.danger, edge: B.dangerSoft },
};

const CHIP_COLORS = {
  all:         { tint: B.pine,   soft: 'rgba(2,33,36,0.05)', ink: B.pine,   dot: B.pine },
  current:     { tint: B.sage,   soft: B.sageSoft,            ink: B.sageText, dot: B.sage },
  completed:   { tint: B.done,   soft: B.doneSoft,            ink: B.done,   dot: B.done },
  expired:     { tint: B.danger, soft: B.dangerSoft,          ink: B.danger, dot: B.danger },
};
const TAB_CHIPS = [
  { value:'all', label:'All' },
  { value:'current', label:'Current' },
  { value:'completed', label:'Completed' },
  { value:'expired', label:'Expired' },
];
const PAGE_SIZES = [5,10,25,50,'all'];

/* ── LiveCard — dog-ear fold card ──────────────────────────────────── */
function LiveCard({ iv, viewMode='list', onDetail, onJoin, onDelete, onViewRecording, onSelect, selected }) {
  const cname = getCandidateName(iv);
  const initials = cname.split(' ').filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase()||'?';
  const photoUrl = iv.candidate?.id ? jobseekerService.photoUrlFor(iv.candidate.id) : '';
  const _expired = isExpired(iv);
  const effStatus = _expired ? 'expired' : (iv.status === 'live' || iv.status === 'in_progress') ? 'live' : iv.status === 'completed' ? 'completed' : iv.status === 'cancelled' ? 'cancelled' : 'upcoming';
  const st = STATUS_STYLE[effStatus] || STATUS_STYLE.upcoming;
  const fold = FOLD_MAP[effStatus] || FOLD_MAP.upcoming;
  const isActive = !_expired && iv.status !== 'completed' && iv.status !== 'cancelled';
  const isLive = iv.status === 'live' || iv.status === 'in_progress';
  const statusLabel = _expired ? 'Expired' : isLive ? 'Live' : iv.status === 'completed' ? 'Completed' : iv.status === 'cancelled' ? 'Cancelled' : 'Upcoming';

  const statusPill = (
    <Box sx={{ display:'inline-flex', alignItems:'center', gap:0.4, bgcolor:st.bg, color:st.color,
      px:1, py:0.4, borderRadius:'7px', fontSize:'0.6rem', fontWeight:800, letterSpacing:'0.05em',
      textTransform:'uppercase', lineHeight:1.6, fontFamily:FONT }}>
      <Box sx={{ width:5, height:5, borderRadius:'50%', bgcolor:st.dot }} />
      {statusLabel}
    </Box>
  );

  const hasRecording = effStatus === 'completed' && roomFromLink(iv.meeting_link) && iv.recording_id;

  const actions = (
    <Stack direction="row" spacing={0.5} sx={{ flexShrink:0 }}>
      {isActive && iv.meeting_link && (
        <Tooltip title={isLive?"Join live":"Join as host"} arrow><span>
          <Button size="small" variant="contained" disableElevation
            startIcon={<VideoCall sx={{fontSize:14}}/>}
            component="a" href={iv.meeting_link} target="_blank" rel="noopener noreferrer"
            onClick={e=>e.stopPropagation()}
            sx={{ bgcolor:isLive?B.done:B.pine, color:'#fff', textTransform:'none', fontSize:'0.72rem', fontWeight:700,
              borderRadius:'999px', px:1.4, height:30, minWidth:0,
              '&:hover':{bgcolor:isLive?'#2B5B2B':B.pineHover} }}>Join</Button>
        </span></Tooltip>
      )}
      {hasRecording && (
        <Tooltip title="View Recording" arrow>
          <IconButton size="small" onClick={e=>{e.stopPropagation();onViewRecording(iv);}}
            sx={{ color:B.pine, border:`1px solid ${B.border}`, borderRadius:'9px', p:0.6,
              '&:hover':{color:B.done,bgcolor:B.sageSoft,borderColor:B.sage} }}>
            <Videocam sx={{fontSize:16}} />
          </IconButton>
        </Tooltip>
      )}
      {(effStatus==='completed'||effStatus==='expired'||effStatus==='cancelled') && (
        <Tooltip title="Delete" arrow>
          <IconButton size="small" onClick={e=>{e.stopPropagation();onDelete(iv);}}
            sx={{ color:B.faint, border:`1px solid ${B.border}`, borderRadius:'9px', p:0.6,
              '&:hover':{color:B.danger,bgcolor:B.dangerSoft,borderColor:'rgba(166,61,47,0.3)'} }}>
            <DeleteOutline sx={{fontSize:16}} />
          </IconButton>
        </Tooltip>
      )}
    </Stack>
  );

  if (viewMode==='list') return (
    <Card elevation={0} onClick={()=>onDetail(iv)}
      sx={{ fontFamily:FONT, borderRadius:'14px', bgcolor:B.surface, border:`1px solid ${B.border}`,
        borderLeft:`4px solid ${fold.face}`, cursor:'pointer', transition:'all 0.2s ease',
        '&:hover':{borderColor:B.sage, borderLeftColor:fold.face, boxShadow:'0 6px 20px rgba(2,33,36,0.08)'} }}>
      <Box sx={{ display:{xs:'none',md:'grid'}, gridTemplateColumns:'auto 2fr 1fr 1fr 0.8fr auto', alignItems:'center', px:2.25, py:1.6, gap:2 }}>
        {onSelect && (
          <Checkbox size="small" checked={!!selected}
            onClick={(e) => { e.stopPropagation(); onSelect(iv.id); }}
            sx={{ p:0.4, color:B.borderS, '&.Mui-checked':{ color:B.pine } }} />
        )}
        <Box sx={{ display:'flex', gap:1.25, alignItems:'center', minWidth:0 }}>
          <Box sx={{ position:'relative', width:36, height:36, borderRadius:'50%', flexShrink:0, overflow:'hidden',
            bgcolor:B.pine, color:B.sage, display:'flex', alignItems:'center', justifyContent:'center',
            fontWeight:700, fontSize:'0.78rem', fontFamily:FONT }}>
            {initials}
            {photoUrl && <Box component="img" src={photoUrl} alt={cname} onError={e=>{e.currentTarget.style.display='none';}}
              sx={{ position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',bgcolor:'#fff',display:'block' }} />}
          </Box>
          <Box sx={{ minWidth:0, flex:1 }}>
            <Typography noWrap sx={{ fontSize:'0.92rem', fontWeight:800, color:B.ink, lineHeight:1.25 }}>{cname}</Typography>
            <Typography noWrap sx={{ fontSize:'0.72rem', color:B.muted, fontWeight:500, mt:0.2 }}>{iv.position||'Interview'}</Typography>
          </Box>
        </Box>
        <Typography noWrap sx={{ fontSize:'0.76rem', color:B.muted }}>
          {iv.duration ? `${iv.duration} min` : '—'}
        </Typography>
        <Typography noWrap sx={{ fontSize:'0.76rem', color:B.muted }}>
          {effStatus === 'completed' && iv.completed_at ? fmtDT(iv.completed_at) : fmtSched(iv)}
        </Typography>
        {statusPill}
        {actions}
      </Box>
      <Box sx={{ display:{xs:'flex',md:'none'}, flexDirection:'column', p:1.75, gap:1.1 }}>
        <Box sx={{ display:'flex', gap:1.25, alignItems:'center', minWidth:0 }}>
          {onSelect && (
            <Checkbox size="small" checked={!!selected}
              onClick={(e) => { e.stopPropagation(); onSelect(iv.id); }}
              sx={{ p:0.3, color:B.borderS, '&.Mui-checked':{ color:B.pine } }} />
          )}
          <Box sx={{ width:36, height:36, borderRadius:'50%', flexShrink:0, bgcolor:B.pine, color:B.sage,
            display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:'0.78rem' }}>{initials}</Box>
          <Box sx={{ minWidth:0, flex:1 }}>
            <Typography noWrap sx={{ fontSize:'0.92rem', fontWeight:800, color:B.ink }}>{cname}</Typography>
            <Typography noWrap sx={{ fontSize:'0.72rem', color:B.muted }}>{iv.position||'Interview'}</Typography>
          </Box>
        </Box>
        <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:1 }}>
          {statusPill}
          {actions}
        </Box>
      </Box>
    </Card>
  );

  /* GRID — dog-ear fold card */
  return (
    <Card elevation={0} onClick={()=>onDetail(iv)}
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
            {photoUrl && <Box component="img" src={photoUrl} alt={cname} onError={e=>{e.currentTarget.style.display='none';}}
              sx={{ position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',bgcolor:'#fff',display:'block' }} />}
          </Box>
          <Box sx={{ minWidth:0, flex:1 }}>
            <Typography sx={{ fontSize:'0.98rem', fontWeight:800, color:B.ink, lineHeight:1.25, letterSpacing:'-0.015em',
              display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden', minHeight:'2.5em' }}>
              {cname}
            </Typography>
            <Typography noWrap sx={{ fontSize:'0.72rem', color:B.muted, mt:0.3, fontWeight:500 }}>{iv.position||'Interview'}</Typography>
          </Box>
        </Box>
        <Box sx={{ display:'flex', alignItems:'center', gap:1.25, mt:1.75, mb:1.5 }}>
          {iv.duration && (
            <Tooltip title="Duration" arrow><Box sx={{display:'flex',alignItems:'center',gap:0.4,cursor:'help'}}>
              <AccessTimeOutlined sx={{fontSize:14,color:B.faint}} />
              <Typography sx={{fontSize:'0.76rem',color:B.muted,fontWeight:500}}>{iv.duration} min</Typography>
            </Box></Tooltip>
          )}
        </Box>
        <Box sx={{ display:'flex', alignItems:'center', gap:0.75, mt:'auto', py:1.25,
          borderTop:`1px dashed ${B.border}`, borderBottom:`1px dashed ${B.border}`, mb:1.5 }}>
          <Typography noWrap sx={{ fontSize:'0.73rem', fontWeight:600, color:B.muted }}>
            {effStatus==='completed' ? `Completed ${iv.completed_at ? fmtDT(iv.completed_at) : fmtSched(iv)}` :
             _expired ? `Expired ${fmtSched(iv)}` :
             `Scheduled ${fmtSched(iv)}`}
          </Typography>
        </Box>
        <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:1 }}>
          <Box sx={{ display:'flex', alignItems:'center', gap:0.5 }}>
            {onSelect && (
              <Checkbox size="small" checked={!!selected}
                onClick={(e) => { e.stopPropagation(); onSelect(iv.id); }}
                sx={{ p:0.3, color:B.borderS, '&.Mui-checked':{ color:B.pine } }} />
            )}
            {statusPill}
          </Box>
          {actions}
        </Box>
      </Box>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ */
const OnlineInterview = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [initialLoading, setInitialLoading] = useState(true);
  const [liveIvs, setLiveIvs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewTab, setViewTab] = useState('all');
  const [viewMode, setViewMode] = useState('list');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deleteDialog, setDeleteDialog] = useState({ open:false, ids:[], name:'' });
  const [deleting, setDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLiveIds, setSelectedLiveIds] = useState(new Set());
  const [detailRow, setDetailRow] = useState(null);
  const [recDlg,  setRecDlg]  = useState({ open: false, loading: false, url: '', duration: 0, error: '' });
  const [chatDlg, setChatDlg] = useState({ open: false, loading: false, messages: [], candidateName: '', error: '' });
  const hasFetchedOnce = useRef(false);

  const handleViewRecording = useCallback(async (iv) => {
    const roomName = roomFromLink(iv?.meeting_link);
    if (!roomName) {
      setRecDlg({ open: true, loading: false, url: '', duration: 0, error: 'Recording not available for this interview.' });
      return;
    }
    setRecDlg({ open: true, loading: true, url: '', duration: 0, error: '' });
    try {
      const res = await interviewAPI.getRecording(roomName);
      const d = res.data || {};
      if (d.status === 'completed' && d.presigned_url) {
        setRecDlg({ open: true, loading: false, url: d.presigned_url, duration: d.duration_secs || 0, error: '' });
      } else if (d.status === 'recording') {
        setRecDlg({ open: true, loading: false, url: '', duration: 0, error: 'Recording is still processing. Try again in a minute.' });
      } else {
        setRecDlg({ open: true, loading: false, url: '', duration: 0, error: 'No recording was captured for this interview.' });
      }
    } catch (err) {
      setRecDlg({ open: true, loading: false, url: '', duration: 0, error: err?.response?.data?.detail || 'Failed to load recording.' });
    }
  }, []);

  const handleViewChat = useCallback(async (iv) => {
    setChatDlg({ open: true, loading: true, messages: [], candidateName: getCandidateName(iv), error: '' });
    try {
      const res = await interviewAPI.getInterviewChat(iv.id);
      const d   = res.data || {};
      if (!d.messages || d.messages.length === 0) {
        setChatDlg(p => ({ ...p, loading: false, messages: [], error: 'No chat messages were exchanged in this session.' }));
      } else {
        setChatDlg(p => ({ ...p, loading: false, messages: d.messages }));
      }
    } catch (err) {
      setChatDlg(p => ({ ...p, loading: false, error: err?.response?.data?.detail || 'Failed to load chat history.' }));
    }
  }, []);

  const fetchLiveInterviews = useCallback(async () => {
    if (!hasFetchedOnce.current) setInitialLoading(true);
    try {
      const res = await interviewRoundService.getLiveInterviews();
      setLiveIvs(res.data?.results || res.data || []);
    } catch { setLiveIvs([]); }
    finally { hasFetchedOnce.current = true; setInitialLoading(false); }
  }, []);

  useEffect(() => { fetchLiveInterviews(); }, [fetchLiveInterviews]);
  useEffect(() => {
    const hasActive = liveIvs.some(iv => iv.status !== 'completed' && iv.status !== 'cancelled');
    if (!hasActive) return;
    const id = setInterval(fetchLiveInterviews, 10000);
    return () => clearInterval(id);
  }, [liveIvs, fetchLiveInterviews]);

  const sorted = useMemo(() => {
    const ORDER = { upcoming:0, live:0, in_progress:0, cancelled:2, completed:1 };
    return [...liveIvs].sort((a,b) => (ORDER[a.status]??0) - (ORDER[b.status]??0));
  }, [liveIvs]);

  const q = searchQuery.trim().toLowerCase();
  const allFiltered = useMemo(() => sorted.filter(iv => {
    if (!q) return true;
    return getCandidateName(iv).toLowerCase().includes(q) || (iv.position||'').toLowerCase().includes(q);
  }), [sorted, q]);

  const displayed = useMemo(() => {
    if (viewTab === 'all') return allFiltered;
    if (viewTab === 'current') return allFiltered.filter(iv => iv.status !== 'completed' && iv.status !== 'cancelled' && !isExpired(iv));
    if (viewTab === 'completed') return allFiltered.filter(iv => iv.status === 'completed' || iv.status === 'cancelled');
    if (viewTab === 'expired') return allFiltered.filter(iv => isExpired(iv));
    return allFiltered;
  }, [allFiltered, viewTab]);

  const chipCounts = useMemo(() => ({
    all: allFiltered.length,
    current: allFiltered.filter(iv => iv.status !== 'completed' && iv.status !== 'cancelled' && !isExpired(iv)).length,
    completed: allFiltered.filter(iv => iv.status === 'completed' || iv.status === 'cancelled').length,
    expired: allFiltered.filter(iv => isExpired(iv)).length,
  }), [allFiltered]);

  useEffect(() => { setPage(1); }, [searchQuery, viewTab, pageSize]);
  const effectiveSize = pageSize === 'all' ? Math.max(displayed.length,1) : pageSize;
  const totalPages = Math.max(1, Math.ceil(displayed.length / effectiveSize));
  useEffect(() => { if (page > totalPages) setPage(1); }, [page, totalPages]);
  const paged = useMemo(() => displayed.slice((page-1)*effectiveSize, page*effectiveSize), [displayed, page, effectiveSize]);

  // BUILD: 2026-08-04-bulk-soft-delete-live
  const toggleLiveSelect = (id) => {
    setSelectedLiveIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const allLiveSelected = paged.length > 0 && paged.every((iv) => selectedLiveIds.has(iv.id));
  const someLiveSelected = selectedLiveIds.size > 0;

  const handleDelete = async () => {
    const ids = [...deleteDialog.ids];
    setDeleting(true);
    try {
      await interviewRoundService.hideLiveInterviews(ids);
      setSelectedLiveIds(new Set());
      fetchLiveInterviews();
      enqueueSnackbar(`${ids.length} interview${ids.length>1?'s':''} removed`, {
        variant:'success', autoHideDuration:5000,
        action: () => (
          <Button size="small" onClick={async()=>{
            try { await interviewRoundService.unhideLiveInterviews(ids); enqueueSnackbar('Restored',{variant:'info'}); fetchLiveInterviews(); }
            catch { enqueueSnackbar('Restore failed',{variant:'error'}); }
          }} sx={{ color:'#fff', border:'1px solid rgba(255,255,255,0.5)', textTransform:'none', fontWeight:700, fontSize:'0.72rem', px:1.2, borderRadius:'6px' }}>Undo</Button>
        ),
      });
    } catch { enqueueSnackbar('Failed to delete',{variant:'error'}); }
    finally { setDeleting(false); setDeleteDialog({open:false,ids:[],name:''}); }
  };

  if (initialLoading) return (
    <Box className="page-fade-in" sx={{ p:{xs:1.5,sm:2,md:3,lg:4}, maxWidth:1440, mx:'auto', bgcolor:B.bg, minHeight:'100vh', fontFamily:FONT }}>
      <Paper elevation={0} sx={{ bgcolor:B.surface, border:`1px solid ${B.border}`, borderRadius:'16px', p:3, mb:2.5 }}>
        <Skeleton width="40%" height={36}/><Skeleton width="30%" height={20} sx={{mt:1}}/>
      </Paper>
      <Box sx={{ display:'grid', gridTemplateColumns:{xs:'1fr',sm:'repeat(2,1fr)',md:'repeat(3,1fr)',lg:'repeat(4,1fr)'}, gap:2 }}>
        {[0,1,2,3].map(i=>(<Card key={i} elevation={0} sx={{borderRadius:'16px',border:`1px solid ${B.border}`,p:2.25}}>
          <Stack direction="row" spacing={1.5} alignItems="center"><Skeleton variant="circular" width={42} height={42}/><Box sx={{flex:1}}><Skeleton width="80%" height={20}/><Skeleton width="55%" height={14}/></Box></Stack>
          <Skeleton width="70%" height={16} sx={{mt:2}}/><Skeleton variant="rounded" height={34} sx={{mt:1.5,borderRadius:'9px'}}/>
        </Card>))}
      </Box>
    </Box>
  );

  return (
    <Box className="page-fade-in" sx={{
      p:{xs:1.5,sm:2,md:3,lg:4}, maxWidth:1440, mx:'auto', bgcolor:B.bg, minHeight:'100vh', fontFamily:FONT,
      '& .MuiTypography-root, & .MuiButton-root, & .MuiChip-root, & .MuiInputBase-root, & .MuiMenuItem-root, & .MuiPaginationItem-root':{fontFamily:FONT},
    }}>
      <Paper elevation={0} sx={{ bgcolor:B.surface, border:`1px solid ${B.border}`, borderRadius:{xs:'14px',sm:'16px'},
        p:{xs:2,sm:2.5,md:3}, mb:{xs:2,md:2.5}, boxShadow:'0 1px 2px rgba(16,18,16,0.04)' }}>
        <Stack direction="row" sx={{ alignItems:'flex-start', justifyContent:'space-between', gap:1.5, mb:{xs:2,md:2.25} }}>
          <Box sx={{minWidth:0}}>
            <Typography component="h1" sx={{ fontWeight:700, color:B.ink, letterSpacing:'-0.02em', lineHeight:1.15,
              fontSize:{xs:'1.3rem',sm:'1.45rem',md:'1.6rem'} }}>Live Interview</Typography>
            <Typography sx={{ color:B.muted, fontSize:{xs:'0.82rem',sm:'0.9rem'}, fontWeight:500, mt:0.5 }}>
              <Box component="span" sx={{color:B.sageText,fontWeight:700}}>{allFiltered.length} interviews</Box> scheduled
            </Typography>
          </Box>
          <Tooltip title="Refresh" arrow><span>
            <IconButton onClick={()=>{hasFetchedOnce.current=false;fetchLiveInterviews();}} size="small" sx={{ color:B.muted, border:`1px solid ${B.borderS}`, borderRadius:'9px',
              '&:hover':{bgcolor:B.sageSoft, color:B.pine, borderColor:B.sage} }}>
              <Refresh sx={{fontSize:18}} />
            </IconButton>
          </span></Tooltip>
        </Stack>

        <TextField placeholder="Search by candidate or position…" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}
          slotProps={{ input:{
            startAdornment:<InputAdornment position="start"><SearchIcon sx={{color:B.muted,fontSize:20}}/></InputAdornment>,
            endAdornment:searchQuery?(<InputAdornment position="end"><IconButton size="small" onClick={()=>setSearchQuery('')}
              sx={{color:B.muted,'&:hover':{color:B.ink,bgcolor:'rgba(16,18,16,0.05)'}}}><ClearRounded sx={{fontSize:18}}/></IconButton></InputAdornment>):null,
          }}}
          sx={{ width:'100%',
            '& .MuiOutlinedInput-root':{ bgcolor:B.bg, borderRadius:'25px', fontSize:{xs:'0.88rem',sm:'0.92rem'},
              height:{xs:46,md:48}, color:B.ink, boxShadow:'0 4px 12px rgba(0,0,0,0.08)',
              '& input::placeholder':{color:B.muted,opacity:0.85},
              '& fieldset':{borderColor:'#B0BEC5',borderWidth:'1.5px'},
              '&:hover fieldset':{borderColor:'#78909C',borderWidth:'2px'},
              '&.Mui-focused':{boxShadow:'0 6px 18px rgba(0,0,0,0.12)'},
              '&.Mui-focused fieldset':{borderColor:B.sage,borderWidth:'2px'} } }} />

        <Stack direction="row" sx={{ alignItems:'center', mt:{xs:1.75,md:2}, gap:1, flexWrap:'wrap' }}>
          <Box sx={{ display:'flex', gap:0.75, alignItems:'center', mr:'auto', minWidth:0,
            flexWrap:{xs:'nowrap',sm:'wrap'}, overflowX:{xs:'auto',sm:'visible'}, '&::-webkit-scrollbar':{display:'none'} }}>
            {TAB_CHIPS.map(opt => {
              const sel = viewTab === opt.value;
              const cc = CHIP_COLORS[opt.value] || CHIP_COLORS.all;
              const isAll = opt.value === 'all';
              return (
                <Box key={opt.value} onClick={()=>setViewTab(opt.value)} role="button" tabIndex={0}
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
                    {chipCounts[opt.value]??0}
                  </Box>
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

      {/* BUILD: 2026-08-04-bulk-soft-delete-live — bulk toolbar */}
      {paged.length > 0 && (
        <Box sx={{ display:'flex', alignItems:'center', gap:1, mb:1.5, px:1.25, py:1,
          bgcolor:B.bg, borderRadius:'12px', border:`1px solid ${B.border}` }}>
          <Checkbox size="small"
            checked={allLiveSelected}
            indeterminate={someLiveSelected && !allLiveSelected}
            onChange={() => {
              if (allLiveSelected) setSelectedLiveIds(new Set());
              else setSelectedLiveIds(new Set(paged.map((iv) => iv.id)));
            }}
            sx={{ p:0.5, color:B.borderS, '&.Mui-checked':{ color:B.pine } }} />
          <Typography sx={{ fontSize:'0.8rem', fontWeight:700, color:B.sageText, fontFamily:FONT }}>
            {selectedLiveIds.size > 0 ? `${selectedLiveIds.size} selected` : 'Select all'}
          </Typography>
          {someLiveSelected && (
            <Button size="small" variant="outlined"
              onClick={() => setDeleteDialog({
                open: true,
                ids: [...selectedLiveIds],
                name: `${selectedLiveIds.size} interview${selectedLiveIds.size !== 1 ? 's' : ''}`,
              })}
              startIcon={<DeleteOutline sx={{ fontSize:16 }} />}
              sx={{ ml:'auto', color:B.danger, borderColor:'rgba(166,61,47,0.35)',
                textTransform:'none', fontWeight:700, borderRadius:'9px',
                fontSize:'0.76rem', fontFamily:FONT,
                '&:hover':{ bgcolor:B.dangerSoft, borderColor:B.danger } }}>
              Remove Selected ({selectedLiveIds.size})
            </Button>
          )}
        </Box>
      )}

      {/* Column headers for list */}
      {paged.length > 0 && viewMode === 'list' && (
        <Box sx={{ display:{xs:'none',md:'grid'}, gridTemplateColumns:'auto 2fr 1fr 1fr 0.8fr auto',
          alignItems:'center', px:2.25, py:1, gap:2, mb:0.75, mx:0.5 }}>
          {['','Candidate','Duration','Scheduled','Status',''].map(h=>(
            <Typography key={h} sx={{ fontSize:'0.68rem', fontWeight:800, color:B.faint,
              textTransform:'uppercase', letterSpacing:'0.06em', fontFamily:FONT }}>{h}</Typography>
          ))}
        </Box>
      )}

      {displayed.length === 0 && (
        <Box sx={{ textAlign:'center', py:{xs:5,sm:7}, px:2, bgcolor:B.surface, borderRadius:'16px', border:`1px dashed ${B.borderS}` }}>
          <Schedule sx={{fontSize:44,color:B.border,mb:1.5}} />
          <Typography sx={{mb:1,color:B.ink,fontWeight:700,fontSize:'1.05rem'}}>No interviews found</Typography>
          <Typography sx={{color:B.muted,fontSize:'0.875rem'}}>Schedule from Interview Rounds.</Typography>
        </Box>
      )}

      {paged.length > 0 && (
        <Box sx={{ display:'grid',
          gridTemplateColumns:{
            xs:'1fr', sm:viewMode==='grid'?'repeat(2,1fr)':'1fr',
            md:viewMode==='grid'?'repeat(3,1fr)':'1fr', lg:viewMode==='grid'?'repeat(4,1fr)':'1fr',
          },
          gap:viewMode==='grid'?{xs:1.5,sm:1.75,md:2}:{xs:1,sm:1.25} }}>
          {paged.map(iv=>(
            <LiveCard key={iv.id} iv={iv} viewMode={viewMode} onDetail={setDetailRow}
              onJoin={()=>{}} onDelete={row=>setDeleteDialog({open:true,ids:[row.id],name:getCandidateName(row)})}
              onViewRecording={handleViewRecording}
              selected={selectedLiveIds.has(iv.id)}
              onSelect={toggleLiveSelect} />
          ))}
        </Box>
      )}

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

      {/* Detail dialog */}
      <Dialog open={!!detailRow} onClose={()=>setDetailRow(null)} maxWidth="xs" fullWidth
        PaperProps={{sx:{borderRadius:'16px',overflow:'hidden'}}}>
        {detailRow && (<Box>
          <Box sx={{ background:`linear-gradient(135deg, ${B.pine} 0%, #0A3F42 100%)`, px:2.5, pt:2.5, pb:2, position:'relative' }}>
            <IconButton size="small" onClick={()=>setDetailRow(null)}
              sx={{position:'absolute',top:10,right:10,color:'rgba(255,255,255,0.7)','&:hover':{color:'#fff',bgcolor:'rgba(255,255,255,0.12)'}}}>
              <Close sx={{fontSize:18}} />
            </IconButton>
            <Typography sx={{color:'#fff',fontWeight:800,fontSize:'1.05rem',lineHeight:1.2}}>{getCandidateName(detailRow)}</Typography>
            <Typography sx={{color:'rgba(255,255,255,0.7)',fontSize:'0.78rem',mt:0.5}}>{detailRow.position||'Live Interview'}</Typography>
          </Box>
          <Box sx={{p:3,fontFamily:FONT}}>
            {[
              {label:'Scheduled', value:fmtSched(detailRow)},
              {label:'Duration', value:detailRow.duration?`${detailRow.duration} min`:'—'},
              {label:'Status', value:isExpired(detailRow)?'Expired':detailRow.status},
              detailRow.meeting_link && {label:'Meeting', value:'Link available'},
            ].filter(Boolean).map(row=>(
              <Stack key={row.label} direction="row" sx={{justifyContent:'space-between',py:1.2,borderBottom:`1px solid ${B.border}`}}>
                <Typography sx={{fontSize:'0.82rem',color:B.muted,fontWeight:600}}>{row.label}</Typography>
                <Typography sx={{fontSize:'0.82rem',color:B.ink,fontWeight:700}}>{row.value}</Typography>
              </Stack>
            ))}
            {detailRow.meeting_link && !isExpired(detailRow) && detailRow.status!=='completed' && detailRow.status!=='cancelled' && (
              <Button fullWidth variant="contained" disableElevation startIcon={<VideoCall/>}
                component="a" href={detailRow.meeting_link} target="_blank" rel="noopener noreferrer"
                sx={{ mt:2, bgcolor:B.done, color:'#fff', textTransform:'none', fontWeight:700, borderRadius:'10px',
                  '&:hover':{bgcolor:'#2B5B2B'} }}>Join Interview</Button>
            )}
            {detailRow.status === 'completed' && roomFromLink(detailRow.meeting_link) && detailRow.recording_id && (
              <Button fullWidth variant="contained" disableElevation startIcon={<Videocam/>}
                onClick={() => handleViewRecording(detailRow)}
                sx={{ mt:2, bgcolor:B.pine, color:'#fff', textTransform:'none', fontWeight:700, borderRadius:'10px',
                  '&:hover':{bgcolor:B.pineHover} }}>View Recording</Button>
            )}
          
          </Box>
        </Box>)}
      </Dialog>

      {/* Chat History — shown only after session is terminated */}
      <Dialog open={chatDlg.open} onClose={()=>setChatDlg(p=>({...p,open:false}))} maxWidth="sm" fullWidth
        PaperProps={{sx:{borderRadius:'16px',overflow:'hidden',fontFamily:FONT}}}>
        <Box sx={{ background:`linear-gradient(135deg, ${B.pine} 0%, #0A3F42 100%)`, px:2.5, pt:2.5, pb:2, position:'relative' }}>
          <IconButton size="small" onClick={()=>setChatDlg(p=>({...p,open:false}))}
            sx={{position:'absolute',top:10,right:10,color:'rgba(255,255,255,0.7)','&:hover':{color:'#fff',bgcolor:'rgba(255,255,255,0.12)'}}}>
            <Close sx={{fontSize:18}}/>
          </IconButton>
          <Stack direction="row" alignItems="center" spacing={1.2}>
            <ChatIcon sx={{color:'rgba(255,255,255,0.85)',fontSize:20}}/>
            <Box>
              <Typography sx={{color:'#fff',fontWeight:800,fontSize:'1rem',lineHeight:1.2}}>Chat History</Typography>
              {chatDlg.candidateName && (
                <Typography sx={{color:'rgba(255,255,255,0.65)',fontSize:'0.76rem',mt:0.3}}>{chatDlg.candidateName}</Typography>
              )}
            </Box>
          </Stack>
        </Box>
        <DialogContent sx={{p:0,maxHeight:'60vh',overflowY:'auto'}}>
          {chatDlg.loading ? (
            <Box sx={{display:'flex',alignItems:'center',justifyContent:'center',height:180}}>
              <CircularProgress size={32} sx={{color:B.pine}}/>
            </Box>
          ) : chatDlg.error ? (
            <Box sx={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:160,gap:1.5,px:3}}>
              <ChatIcon sx={{fontSize:40,color:'#CBD5E1'}}/>
              <Typography sx={{fontSize:'0.84rem',color:B.muted,textAlign:'center',fontFamily:FONT}}>
                {chatDlg.error}
              </Typography>
            </Box>
          ) : (
            <Box sx={{px:2.5,py:2,display:'flex',flexDirection:'column',gap:1.5}}>
              {chatDlg.messages.map((m) => {
                const fmtTs = (ts) => {
                  try { return new Date(ts).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Kolkata'}); }
                  catch { return ''; }
                };
                return (
                  <Box key={m.id} sx={{display:'flex',flexDirection:'column',gap:0.3}}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Typography sx={{fontSize:'0.73rem',fontWeight:700,color:B.pine,fontFamily:FONT}}>
                        {m.is_system ? 'System' : m.sender_name || 'Participant'}
                      </Typography>
                      <Typography sx={{fontSize:'0.68rem',color:B.faint,fontFamily:FONT}}>{fmtTs(m.created_at)}</Typography>
                    </Stack>
                    <Box sx={{bgcolor:m.is_system ? B.sageSoft : B.bg,border:`1px solid ${B.border}`,borderRadius:'10px',px:1.75,py:1.1}}>
                      <Typography sx={{fontSize:'0.84rem',color:B.body,lineHeight:1.55,fontFamily:FONT,
                          fontStyle:m.is_system ? 'italic' : 'normal'}}>
                        {m.text}
                      </Typography>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{px:3,pb:2}}>
          <Typography sx={{flex:1,fontSize:'0.75rem',color:B.faint,fontFamily:FONT}}>
            {!chatDlg.loading && !chatDlg.error ? `${chatDlg.messages.length} message${chatDlg.messages.length!==1?'s':''}` : ''}
          </Typography>
          <Button onClick={()=>setChatDlg(p=>({...p,open:false}))}
            sx={{textTransform:'none',fontWeight:600,fontSize:'0.82rem',color:B.muted,borderRadius:'10px',fontFamily:FONT}}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Recording player */}
      <Dialog open={recDlg.open} onClose={()=>setRecDlg(p=>({...p,open:false}))} maxWidth="md" fullWidth
        PaperProps={{sx:{borderRadius:'16px',overflow:'hidden',fontFamily:FONT}}}>
        <DialogTitle sx={{fontWeight:700,fontSize:'1rem',display:'flex',alignItems:'center',gap:1,pb:0.5,fontFamily:FONT,color:B.pine}}>
          <Videocam sx={{color:B.pine,fontSize:20}} />
          Interview Recording
          {recDlg.duration > 0 && (
            <Chip label={`${Math.floor(recDlg.duration/60)}m ${recDlg.duration%60}s`} size="small"
              sx={{ml:1,fontSize:'0.7rem',bgcolor:B.sageSoft,color:B.sageText,fontFamily:FONT}} />
          )}
        </DialogTitle>
        <DialogContent sx={{p:0}}>
          {recDlg.loading ? (
            <Box sx={{display:'flex',alignItems:'center',justifyContent:'center',height:280}}>
              <CircularProgress size={36} sx={{color:B.pine}} />
            </Box>
          ) : recDlg.url ? (
            <Box sx={{bgcolor:'#000'}}>
              <video controls autoPlay style={{width:'100%',maxHeight:'62vh',display:'block'}} src={recDlg.url}>
                Your browser does not support video playback.
              </video>
            </Box>
          ) : (
            <Box sx={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:200,gap:1.5}}>
              <Videocam sx={{fontSize:44,color:'#CBD5E1'}} />
              <Typography sx={{fontSize:'0.85rem',color:B.muted,textAlign:'center',px:3,fontFamily:FONT}}>
                {recDlg.error || 'Recording not available.'}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{px:3,pb:2,gap:1}}>
          <Button onClick={()=>setRecDlg(p=>({...p,open:false}))}
            sx={{textTransform:'none',fontWeight:600,fontSize:'0.82rem',color:B.muted,borderRadius:'10px',fontFamily:FONT}}>
            Close
          </Button>
          {recDlg.url && (
            <Button variant="contained" href={recDlg.url} target="_blank" component="a"
              startIcon={<OpenInNew sx={{fontSize:15}}/>}
              sx={{textTransform:'none',fontWeight:700,fontSize:'0.82rem',bgcolor:B.pine,borderRadius:'10px',boxShadow:'none',fontFamily:FONT,'&:hover':{bgcolor:B.pineHover}}}>
              Open in new tab
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={deleteDialog.open} onClose={()=>setDeleteDialog({open:false,ids:[],name:''})} maxWidth="xs" fullWidth
        PaperProps={{sx:{borderRadius:'16px',overflow:'hidden'}}}>
        <Box sx={{background:`linear-gradient(135deg, ${B.danger} 0%, #6B2820 100%)`,px:3,py:2,display:'flex',alignItems:'center',gap:1.3}}>
          <Box sx={{width:38,height:38,borderRadius:'11px',bgcolor:'rgba(255,255,255,0.16)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <DeleteOutline sx={{color:'#fff',fontSize:21}} />
          </Box>
          <Typography sx={{color:'#fff',fontWeight:800,fontSize:'1rem',fontFamily:FONT}}>Confirm Delete</Typography>
        </Box>
        <DialogContent sx={{pt:2.5}}>
          <Typography sx={{fontSize:'0.85rem',color:B.body,lineHeight:1.6,fontFamily:FONT}}>
            Remove <strong>{deleteDialog.name || `${deleteDialog.ids.length} interview${deleteDialog.ids.length>1?'s':''}`}</strong> from your view?
          </Typography>
        </DialogContent>
        <DialogActions sx={{px:3,pb:2}}>
          <Button onClick={()=>setDeleteDialog({open:false,ids:[],name:''})} sx={{textTransform:'none',color:B.muted,fontFamily:FONT}}>Cancel</Button>
          <Button variant="contained" disableElevation disabled={deleting} onClick={handleDelete}
            sx={{bgcolor:B.danger,'&:hover':{bgcolor:'#8C3225'},textTransform:'none',fontWeight:700,borderRadius:'10px',px:2.5,fontFamily:FONT}}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OnlineInterview;