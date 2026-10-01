import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, CircularProgress, Button, Stack, Chip, Paper,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Divider, IconButton, Tooltip,  
  Avatar, Badge, List, ListItem, ListItemAvatar,
  ListItemText, InputBase, Slider,
} from '@mui/material';
import {
  VideocamOff, AccessTime, ArrowBack, ErrorOutlined, CheckCircleOutlined,
  Mic, MicOff, Videocam, CallEnd, Person,
  ScreenShare, StopScreenShare,
  PeopleAlt, Chat as ChatIcon, Send,
  FiberManualRecord, Close, RadioButtonChecked,
  FaceOutlined,
} from '@mui/icons-material';
import useFaceGate from '@/hooks/jobseeker/useFaceGate';
import {
  LiveKitRoom,
  useLocalParticipant,
  useParticipants,
  useTracks,
  ParticipantTile,
  useConnectionState,
  RoomAudioRenderer,
  useChat,
} from '@livekit/components-react';
import { Track, ConnectionState } from 'livekit-client';
import '@livekit/components-styles';
import api from '@/services/api/axiosInstance';
import jobseekerService from '@/services/api/jobseeker/jobseekerService';

const INTERVIEWS_BASE = '/employer/interviews';
const SIDEBAR_W = 320;

// ══════════════════════════════════════════════════════════════
// OUTSIDE LiveKitRoom context
// ══════════════════════════════════════════════════════════════

// ── Live score dialog ─────────────────────────────────────────────────────────
const LiveScoreDialog = ({ open, candidateInterviewId, scheduledInterviewId, roomName, onDone }) => {
  const [score,    setSc]       = useState(7);
  const [feedback, setFeedback] = useState('');
  const [saving,   setSaving]   = useState(false);
  const [done,     setDone]     = useState(false);
  const [error,    setError]    = useState('');


  const handleSubmit = async () => {
    setSaving(true);
    setError('');
    try {
      await api.post(`${INTERVIEWS_BASE}/results/create/`, {
        ...(candidateInterviewId
          ? { interview: candidateInterviewId }
          : scheduledInterviewId
            ? { scheduled_interview_id: scheduledInterviewId }
            : { room_name: roomName }),
        overall_score: Math.round(score * 10),
        ...(feedback.trim() ? { overall_feedback: feedback.trim() } : {}),
      });
      setDone(true);
      setTimeout(onDone, 1000);
    } catch (e) {
      const msg = e?.response?.data?.detail
        || (typeof e?.response?.data === 'object' ? JSON.stringify(e?.response?.data) : null)
        || e?.message
        || 'Failed to submit score.';
      console.error('[LiveRoom] score submit failed:', msg, e?.response?.data);
      setError(msg);
    } finally { setSaving(false); }
  };

  const scoreColor = score >= 7 ? '#22C55E' : score >= 5 ? '#F59E0B' : '#EF4444';

  return (
    <Dialog open={open} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 700, color: '#1E3358', pb: 0 }}>Score the interview</DialogTitle>
      <DialogContent sx={{ pt: 2.5 }}>
        {done ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <CheckCircleOutlined sx={{ fontSize: 56, color: '#22C55E', mb: 1 }} />
            <Typography fontWeight={600} sx={{ color: '#1E3358' }}>Score submitted!</Typography>
            <Typography variant="body2" sx={{ color: '#6B7280', mt: 0.5 }}>Ranking panel updated.</Typography>
          </Box>
        ) : (
          <Box sx={{ px: 1 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography sx={{ color: '#374151', fontSize: 14, fontWeight: 600 }}>Overall score</Typography>
              <Box sx={{ bgcolor: scoreColor + '18', border: `1px solid ${scoreColor}40`, borderRadius: 2, px: 1.5, py: 0.5, minWidth: 80, textAlign: 'center' }}>
                <Typography sx={{ color: scoreColor, fontWeight: 800, fontSize: 22 }}>
                  {score.toFixed(1)}<Typography component="span" sx={{ fontSize: 14, fontWeight: 500, color: '#9CA3AF' }}> / 10</Typography>
                </Typography>
              </Box>
            </Stack>
            <Slider value={score} onChange={(_, v) => setSc(v)} min={0} max={10} step={0.5}
              sx={{ color: scoreColor, '& .MuiSlider-thumb': { width: 22, height: 22, bgcolor: '#fff', border: `2.5px solid ${scoreColor}` }, '& .MuiSlider-track': { height: 7, borderRadius: 4 }, '& .MuiSlider-rail': { height: 7, borderRadius: 4, bgcolor: '#E5E7EB' } }} />
           <Stack direction="row" justifyContent="space-between" mt={0.5}>
              <Typography sx={{ color: '#EF4444', fontSize: 11 }}>Poor</Typography>
              <Typography sx={{ color: '#F59E0B', fontSize: 11 }}>Average</Typography>
              <Typography sx={{ color: '#22C55E', fontSize: 11 }}>Excellent</Typography>
            </Stack>

            <Box sx={{ mt: 2.5 }}>
              <Typography sx={{ color: '#374151', fontSize: 13, fontWeight: 600, mb: 0.75 }}>
                How well does this candidate fit the role?
              </Typography>
              <TextField
                multiline rows={3} fullWidth
                placeholder="e.g. Strong technical skills, good culture fit, needs more system design experience…"
                value={feedback} onChange={e => setFeedback(e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: 13, color: '#374151' },
                  '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#1E3358' },
                }}
              />
            </Box>

            {error && (
              <Typography sx={{ color: '#EF4444', fontSize: 12, mt: 1.5, textAlign: 'center', bgcolor: 'rgba(239,68,68,0.08)', p: 1, borderRadius: 1 }}>
                ⚠ {error}
              </Typography>
            )}
          </Box>
        )}
      </DialogContent>
      {!done && (
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button fullWidth variant="contained" onClick={handleSubmit} disabled={saving}
            sx={{ bgcolor: '#1E3358', borderRadius: 2, textTransform: 'none', fontWeight: 700, py: 1.25, fontSize: 15 }}>
            {saving ? 'Submitting…' : 'Submit score'}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};

// ── Error screen ──────────────────────────────────────────────────────────────
const ErrorScreen = ({ error, onBack }) => {
  const [countdown, setCountdown] = useState(null);
  useEffect(() => {
    if (error.type !== 'early' || !error.opens_at) return;
    const tick = () => {
      const ms = new Date(error.opens_at).getTime() - Date.now();
      if (ms <= 0) { setCountdown('now'); return; }
      const s = Math.ceil(ms / 1000);
      setCountdown(`${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`);
    };
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, [error]);

  const icons  = { early: <AccessTime sx={{ fontSize: 56, color: '#F59E0B' }} />, ended: <VideocamOff sx={{ fontSize: 56, color: '#9CA3AF' }} />, not_found: <ErrorOutlined sx={{ fontSize: 56, color: '#EF4444' }} />, auth: <ErrorOutlined sx={{ fontSize: 56, color: '#EF4444' }} />, generic: <ErrorOutlined sx={{ fontSize: 56, color: '#EF4444' }} /> };
  const titles = { early: 'Room not open yet', ended: 'Interview ended', not_found: 'Room not found', auth: 'Please log in', generic: 'Unable to connect' };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#F5F7FA', p: 3 }}>
      <Paper elevation={0} sx={{ maxWidth: 440, width: '100%', p: 5, borderRadius: 4, textAlign: 'center', border: '1px solid #EEF1F5' }}>
        <Box sx={{ mb: 3 }}>{icons[error.type] || icons.generic}</Box>
        <Typography variant="h5" fontWeight={700} sx={{ color: '#1E3358', mb: 1 }}>{titles[error.type] || 'Unable to connect'}</Typography>
        <Typography sx={{ color: '#6B7280', mb: 3, lineHeight: 1.7 }}>{error.message}</Typography>
        {error.type === 'early' && countdown && countdown !== 'now' && (
          <Box sx={{ mb: 3, p: 2.5, borderRadius: 3, bgcolor: '#FFFBEB', border: '1px solid #FEF3C7' }}>
            <Typography variant="caption" sx={{ color: '#92400E', fontWeight: 600, display: 'block', mb: 0.5 }}>Room opens in</Typography>
            <Typography variant="h3" fontWeight={700} sx={{ color: '#D97706' }}>{countdown}</Typography>
          </Box>
        )}
        {error.type === 'early' && countdown === 'now' && (
          <Box sx={{ mb: 3, p: 2, borderRadius: 2, bgcolor: '#F0FDF4', border: '1px solid #BBF7D0' }}>
            <Typography sx={{ color: '#166534', fontWeight: 600, fontSize: 14 }}>The room is now open — click refresh to join.</Typography>
          </Box>
        )}
        <Stack spacing={1.5}>
          {error.type === 'early' && countdown === 'now' && (
            <Button variant="contained" onClick={() => window.location.reload()} startIcon={<CheckCircleOutlined />}
              sx={{ bgcolor: '#1E3358', borderRadius: 2, textTransform: 'none', fontWeight: 600, py: 1.25 }}>Refresh and join</Button>
          )}
          <Button variant={error.type === 'early' && countdown !== 'now' ? 'outlined' : 'contained'} startIcon={<ArrowBack />} onClick={onBack}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, py: 1.25, ...(error.type === 'early' && countdown !== 'now' ? { borderColor: '#D1D5DB', color: '#374151' } : { bgcolor: '#1E3358' }) }}>
            Back to interviews
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
};

// ── Session tracker ───────────────────────────────────────────────────────────
const SessionTracker = ({ candidateInterviewId, onSessionStarted, onDisconnected }) => {
  const connectionState = useConnectionState();
  const sessionIdRef = useRef(null);
  const joinedAtRef  = useRef(null);
  const startRef     = useRef(false);
  const endRef       = useRef(false);

  useEffect(() => {
    if (connectionState === ConnectionState.Connected && !startRef.current) {
      startRef.current = true; joinedAtRef.current = Date.now();
      if (!candidateInterviewId) return;
      api.post(`${INTERVIEWS_BASE}/live/interviews/${candidateInterviewId}/start-session/`)
        .then(({ data }) => { sessionIdRef.current = data.id; onSessionStarted(data.id); })
        .catch((e) => console.warn('[LiveRoom] start-session:', e?.response?.data || e.message));
    }
    if (
      (connectionState === ConnectionState.Disconnected || connectionState === ConnectionState.Failed) &&
      !endRef.current && startRef.current
    ) {
      endRef.current = true;
      const secs = joinedAtRef.current ? Math.round((Date.now() - joinedAtRef.current) / 1000) : 0;
      const finish = () => { if (onDisconnected) onDisconnected(); };
      if (sessionIdRef.current) {
        api.post(`${INTERVIEWS_BASE}/video/session/${sessionIdRef.current}/end/`, { duration_seconds: secs })
          .catch((e) => console.warn('[LiveRoom] end-session:', e?.response?.data || e.message))
          .finally(finish);
      } else { finish(); }
    }
  }, [connectionState, candidateInterviewId, onSessionStarted, onDisconnected]);

  return null;
};

// ── Admit panel ───────────────────────────────────────────────────────────────
const IAEM_SLOTS_BASE = '/iaem/jobseeker/slots/status';

const AdmitPanel = ({ slotId }) => {
  const [waiting,       setWaiting]       = useState(false);
  const [admitting,     setAdmitting]     = useState(false);
  const [admitted,      setAdmitted]      = useState(false);
  const [candidateName, setCandidateName] = useState('');

  useEffect(() => {
    if (!slotId) return;
    const check = async () => {
      try {
        const { data: d } = await api.get(`${IAEM_SLOTS_BASE}/${slotId}/`);
        if (d.candidate_joined_at && !d.admitted_at) {
          setWaiting(true);
          // Extract candidate name from booked_by
          const bookedBy = d.booked_by;
          if (bookedBy) {
            const name = bookedBy.full_name || bookedBy.email || '';
            setCandidateName(name);
          }
        } else if (!d.candidate_joined_at && !d.admitted_at) {
          // Candidate left the waiting room — clear the panel
          setWaiting(false);
          setCandidateName('');
        }
        if (d.admitted_at) { setWaiting(false); setAdmitted(true); }
      } catch { /* silent */ }
    };
    check(); const id = setInterval(check, 5000); return () => clearInterval(id);
  }, [slotId]);

  if (admitted || !waiting) return null;
  return (
    <Box sx={{ position: 'absolute', top: 70, right: 16, zIndex: 400, bgcolor: 'rgba(30,41,59,0.97)', backdropFilter: 'blur(8px)', border: '1px solid rgba(245,158,11,0.5)', borderRadius: 3, px: 3, py: 2, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', minWidth: 270 }}>
      <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#F59E0B', animation: 'lkblink 1.5s infinite', '@keyframes lkblink': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.3 } } }} />
        <Typography sx={{ color: '#F59E0B', fontWeight: 600, fontSize: 13 }}>Candidate is waiting</Typography>
      </Stack>
      {candidateName && (
        <Typography sx={{ color: '#E2E8F0', fontWeight: 700, fontSize: 14, mb: 1.5, pl: 0.5 }}>
          {candidateName}
        </Typography>
      )}
      <Button fullWidth variant="contained" disabled={admitting}
        onClick={async () => { setAdmitting(true); try { await api.post(`${IAEM_SLOTS_BASE}/${slotId}/admit/`); setWaiting(false); setAdmitted(true); } catch (e) { console.warn('[AdmitPanel]', e?.response?.data); } finally { setAdmitting(false); } }}
        sx={{ bgcolor: '#F59E0B', color: '#fff', fontWeight: 700, borderRadius: 2, textTransform: 'none', '&:hover': { bgcolor: '#D97706' } }}>
        {admitting ? 'Admitting…' : `Admit ${candidateName || 'candidate'}`}
      </Button>
    </Box>
  );
};

// ══════════════════════════════════════════════════════════════
// INSIDE LiveKitRoom context
// ══════════════════════════════════════════════════════════════

// ── Meeting timer ─────────────────────────────────────────────────────────────
const MeetingTimer = () => {
  const connectionState = useConnectionState();
  const [secs, setSecs] = useState(0);
  const startedRef      = useRef(false);
  useEffect(() => {
    if (connectionState === ConnectionState.Connected && !startedRef.current) {
      startedRef.current = true;
      const id = setInterval(() => setSecs(s => s + 1), 1000);
      return () => clearInterval(id);
    }
  }, [connectionState]);
  const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
  const label = h > 0
    ? `${h}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`
    : `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
  return <Typography sx={{ color: '#94A3B8', fontSize: 13, fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>{label}</Typography>;
};


const PARTICIPANT_COLORS = ['#7F9E7E','#5E7F9E','#9E7F7E','#8B7F9E','#7E9E93','#9E937E','#6C8B6B','#3C5A78','#A35A2D','#3E6E3E'];
const participantColor = (name = '') => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PARTICIPANT_COLORS[h % PARTICIPANT_COLORS.length];
};

const ParticipantsPanel = ({ onClose, tokenData }) => {
  const participants = useParticipants();
  // Track which photo URLs failed so we don't keep retrying broken images
  const [failedPhotos, setFailedPhotos] = useState({});

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, py: 1.5, borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
        <Typography sx={{ color: '#F1F5F9', fontWeight: 700, fontSize: 14, flex: 1 }}>Participants ({participants.length})</Typography>
        <IconButton size="small" onClick={onClose}
          sx={{ color: '#94A3B8', ml: 'auto', '&:hover': { color: '#F1F5F9', bgcolor: 'rgba(255,255,255,0.08)' } }}>
          <Close sx={{ fontSize: 18 }} />
        </IconButton>
      </Stack>
      <List sx={{ flex: 1, overflow: 'auto', py: 1 }}>
        {participants.map((p) => {
          const displayName = p.name || p.identity || '?';
          const initial = displayName.charAt(0).toUpperCase();
          const bgColor = participantColor(displayName);
          const userId = p.identity;
          const photoKey = (() => {
            
            if (p.isLocal && tokenData?.is_admin && tokenData?.photo_url) return null;
           
            if (!p.isLocal && !tokenData?.is_admin && tokenData?.host_photo_url) return null;
          
            return tokenData?.candidate_js_id
              ? String(tokenData.candidate_js_id)
              : userId;
          })();

          const photoUrl = (() => {
          
            if (p.isLocal && tokenData?.is_admin && tokenData?.photo_url)
              return tokenData.photo_url;
            
            if (!p.isLocal && !tokenData?.is_admin && tokenData?.host_photo_url)
              return tokenData.host_photo_url;
            return photoKey && !failedPhotos[photoKey]
              ? jobseekerService.photoUrlFor(photoKey)
              : null;
          })();



          return (
            <ListItem key={p.identity} sx={{ py: 0.75, px: 2 }}>
              <ListItemAvatar sx={{ minWidth: 42 }}>
                <Avatar
                  src={photoUrl || undefined}
                  sx={{ width: 32, height: 32, fontSize: 13, fontWeight: 700, bgcolor: bgColor, color: '#fff' }}
                  slotProps={{
                    img: {
                      onError: () => photoKey && setFailedPhotos(prev => ({ ...prev, [photoKey]: true })),
                    },
                  }}
                >
                  {initial}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Typography sx={{ color: '#E2E8F0', fontSize: 13, fontWeight: 500 }}>
                    {displayName}{p.isLocal ? ' (You)' : ''}
                    {tokenData?.is_admin && p.identity === tokenData?.identity && (
                      <Typography component="span" sx={{ fontSize: 10, color: '#93C5FD', ml: 0.75, fontWeight: 700 }}>Host</Typography>
                    )}
                  </Typography>
                }
                secondary={
                  <Stack direction="row" spacing={0.75} mt={0.25}>
                    {p.isMicrophoneEnabled ? <Mic sx={{ fontSize: 12, color: '#22C55E' }} /> : <MicOff sx={{ fontSize: 12, color: '#EF4444' }} />}
                    {p.isCameraEnabled ? <Videocam sx={{ fontSize: 12, color: '#22C55E' }} /> : <VideocamOff sx={{ fontSize: 12, color: '#EF4444' }} />}
                  </Stack>
                }
              />
            </ListItem>
          );
        })}
      </List>
    </Box>
  );
};

// ── Chat panel ────────────────────────────────────────────────────────────────
const ChatPanel = ({ onClose, sessionId, chatMessages = [], onSend }) => {
  const { localParticipant } = useLocalParticipant();
  const [msg, setMsg]        = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef            = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  const handleSend = async () => {
    if (!msg.trim() || sending) return;
    setSending(true);
    const text = msg.trim();
    try {
      await onSend(text);
      setMsg('');
      if (sessionId) {
        api.post(`${INTERVIEWS_BASE}/video/session/${sessionId}/chat/`, { text })
          .catch((e) => console.warn('[Chat] persist failed:', e?.response?.data || e.message));
      }
    }
    catch (e) { console.warn('[Chat] send failed:', e); }
    finally { setSending(false); }
  };

  const fmtTime = (ts) => { const d = new Date(ts); return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`; };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, py: 1.5, borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
        <Typography sx={{ color: '#F1F5F9', fontWeight: 700, fontSize: 14, flex: 1 }}>Chat</Typography>
        <IconButton size="small" onClick={onClose}
          sx={{ color: '#94A3B8', ml: 'auto', '&:hover': { color: '#F1F5F9', bgcolor: 'rgba(255,255,255,0.08)' } }}>
          <Close sx={{ fontSize: 18 }} />
        </IconButton>
      </Stack>
      <Box sx={{ flex: 1, overflow: 'auto', px: 2, py: 1.5 }}>
        {chatMessages.length === 0 && (
          <Box sx={{ textAlign: 'center', mt: 6 }}>
            <ChatIcon sx={{ fontSize: 36, color: '#334155', mb: 1 }} />
            <Typography sx={{ color: '#475569', fontSize: 13 }}>No messages yet</Typography>
          </Box>
        )}
        {chatMessages.map((m, i) => {
          const isMe = m.from?.identity === localParticipant?.identity;
          return (
            <Box key={i} sx={{ mb: 1.5, display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
              {!isMe && <Typography sx={{ color: '#60A5FA', fontSize: 11, fontWeight: 600, mb: 0.3, px: 0.5 }}>{m.from?.name || m.from?.identity || 'Unknown'}</Typography>}
              <Box sx={{ maxWidth: '85%', px: 1.5, py: 1, borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px', bgcolor: isMe ? '#1E3358' : '#1E293B', border: isMe ? '1px solid rgba(147,197,253,0.2)' : '1px solid rgba(255,255,255,0.06)' }}>
                <Typography sx={{ color: '#E2E8F0', fontSize: 13, lineHeight: 1.5, wordBreak: 'break-word' }}>{m.message}</Typography>
              </Box>
              <Typography sx={{ color: '#475569', fontSize: 10, mt: 0.3, px: 0.5 }}>{fmtTime(m.timestamp)}</Typography>
            </Box>
          );
        })}
        <div ref={bottomRef} />
      </Box>
      <Box sx={{ px: 1.5, py: 1.5, borderTop: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ bgcolor: '#1E293B', borderRadius: 3, px: 1.5, py: 0.75, border: '1px solid rgba(255,255,255,0.08)' }}>
      
          <InputBase fullWidth placeholder="Send a message…" value={msg}
            onChange={(e) => setMsg(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            sx={{ color: '#FFFFFF', fontSize: 13, '& input': { p: 0 }, '& input::placeholder': { color: '#64748B', opacity: 1 } }} />
          <IconButton size="small" onClick={handleSend} disabled={!msg.trim() || sending}
            sx={{ color: msg.trim() ? '#60A5FA' : '#334155', p: 0.5 }}>
            <Send sx={{ fontSize: 18 }} />
          </IconButton>
        </Stack>
      </Box>
    </Box>
  );
};

// ── Video area ────────────────────────────────────────────────────────────────
const VideoArea = ({ tokenData }) => {
  const { localParticipant } = useLocalParticipant();
  const cameraTracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }], { onlySubscribed: false });
  const screenTracks = useTracks([{ source: Track.Source.ScreenShare, withPlaceholder: false }], { onlySubscribed: false });

  const localTrack   = cameraTracks.find(t => t.participant.isLocal);
  const remoteTrack  = cameraTracks.find(t => !t.participant.isLocal);
  const activeScreen = screenTracks.find(t => t.publication);
  const remoteName   = remoteTrack?.participant?.name || remoteTrack?.participant?.identity || 'Participant';
  const localName    = localParticipant?.name || localParticipant?.identity || 'You';
  const tileSx = {
    '& [data-lk-participant-tile]': { width: '100% !important', height: '100% !important' },
    '& video': { width: '100% !important', height: '100% !important', objectFit: 'cover !important' },
    '& [data-lk-participant-name]': { display: 'none !important' },
    '& .lk-participant-name': { display: 'none !important' },
    '& .lk-participant-metadata': { display: 'none !important' },
    '& .lk-participant-metadata-item': { display: 'none !important' },
  };

  if (activeScreen) {
    return (
      <Box sx={{ display: 'flex', width: '100%', height: '100%', gap: 1.5, p: 1.5 }}>
        <Box sx={{ flex: 1, borderRadius: 2, overflow: 'hidden', bgcolor: '#000', position: 'relative', ...tileSx, '& video': { objectFit: 'contain !important' } }}>
          <ParticipantTile trackRef={activeScreen} style={{ width: '100%', height: '100%' }} />
          <Box sx={{ position: 'absolute', top: 10, left: 12, bgcolor: 'rgba(0,0,0,0.65)', borderRadius: 1.5, px: 1.5, py: 0.4 }}>
            <Stack direction="row" alignItems="center" spacing={0.75}>
              <ScreenShare sx={{ fontSize: 13, color: '#60A5FA' }} />
              <Typography sx={{ color: '#fff', fontSize: 12, fontWeight: 600 }}>{activeScreen.participant?.name || 'Screen share'}</Typography>
            </Stack>
          </Box>
        </Box>
        <Box sx={{ width: 168, display: 'flex', flexDirection: 'column', gap: 1 }}>
          {[localTrack, remoteTrack].filter(Boolean).map((t, i) => (
            <Box key={i} sx={{ flex: 1, minHeight: 0, borderRadius: 2, overflow: 'hidden', border: '2px solid rgba(255,255,255,0.1)', bgcolor: '#1E293B', position: 'relative', ...tileSx }}>
              <ParticipantTile trackRef={t} style={{ width: '100%', height: '100%' }} />
              <Box sx={{ position: 'absolute', bottom: 5, left: 7, bgcolor: 'rgba(0,0,0,0.6)', borderRadius: 1, px: 0.75, py: 0.2 }}>
                <Typography sx={{ color: '#fff', fontSize: 10, fontWeight: 600 }}>{t.participant.isLocal ? 'You' : remoteName}</Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    );
  }

  if (remoteTrack) {
    return (
      <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
        <Box sx={{ width: '100%', height: '100%', ...tileSx }}>
          <ParticipantTile trackRef={remoteTrack} style={{ width: '100%', height: '100%' }} />
        </Box>
        <Box sx={{ position: 'absolute', bottom: 20, left: 20, bgcolor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', borderRadius: 1.5, px: 1.5, py: 0.5 }}>
          <Stack direction="row" alignItems="center" spacing={0.75}>
            {!remoteTrack.participant?.isMicrophoneEnabled && <MicOff sx={{ fontSize: 13, color: '#EF4444' }} />}
            <Typography sx={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{remoteName}</Typography>
          </Stack>
        </Box>
        {localTrack && (
          <Box sx={{ position: 'absolute', bottom: 16, right: 16, width: { xs: 120, sm: 180, md: 220 }, height: { xs: 90, sm: 135, md: 165 }, borderRadius: 2, overflow: 'hidden', border: '2px solid rgba(255,255,255,0.18)', boxShadow: '0 4px 20px rgba(0,0,0,0.6)', bgcolor: '#1E293B', ...tileSx }}>
            <ParticipantTile trackRef={localTrack} style={{ width: '100%', height: '100%' }} />
            <Box sx={{ position: 'absolute', bottom: 5, left: 8, bgcolor: 'rgba(0,0,0,0.6)', borderRadius: 1, px: 0.75, py: 0.2 }}>
              <Typography sx={{ color: '#fff', fontSize: 10, fontWeight: 600 }}>You</Typography>
            </Box>
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      {localTrack ? (
        <Box sx={{ width: '100%', height: '100%', maxWidth: 720, maxHeight: 540, margin: 'auto', borderRadius: 2, overflow: 'hidden', ...tileSx }}>
          <ParticipantTile trackRef={localTrack} style={{ width: '100%', height: '100%' }} />
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ width: 100, height: 100, bgcolor: '#1E3358', fontSize: '2.5rem' }}>{localName.charAt(0).toUpperCase()}</Avatar>
          <Typography sx={{ color: '#64748B', fontSize: 15 }}>{localName}</Typography>
        </Box>
      )}
      <Box sx={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', bgcolor: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(8px)', borderRadius: 10, px: 3, py: 1, border: '1px solid rgba(255,255,255,0.08)' }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <CircularProgress size={12} sx={{ color: '#60A5FA' }} />
          <Typography sx={{ color: '#94A3B8', fontSize: 13, fontWeight: 500 }}>
            Waiting for {tokenData.is_admin ? 'candidate' : 'host'} to join…
          </Typography>
        </Stack>
      </Box>
    </Box>
  );
};

// ── Reusable control button (defined outside ControlBar to avoid recreation) ──
const Btn = ({ title, icon, onClick, active, activeColor = '#22C55E' }) => (
  <Tooltip title={title} arrow placement="top">
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
      <IconButton onClick={onClick} sx={{ width: 52, height: 52, bgcolor: active ? activeColor : 'rgba(255,255,255,0.10)', color: '#fff', transition: 'all 0.18s', '&:hover': { bgcolor: active ? activeColor : 'rgba(255,255,255,0.18)', transform: 'scale(1.06)' } }}>
        {icon}
      </IconButton>
      <Typography sx={{ color: '#475569', fontSize: 10, fontWeight: 500, userSelect: 'none' }}>{title}</Typography>
    </Box>
  </Tooltip>
);

// ── Control bar ───────────────────────────────────────────────────────────────
const ControlBar = ({ tokenData, onLeave, sidePanel, setSidePanel, recording, setRecording, chatMessages = [] }) => {
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();
  const participants  = useParticipants();
  const screenTracks  = useTracks([{ source: Track.Source.ScreenShare, withPlaceholder: false }], { onlySubscribed: false });
  const isSharing     = screenTracks.some(t => t.participant.isLocal && t.publication);

  const [unread,     setUnread]    = useState(0);
  const [egressId,   setEgressId]  = useState('');
  const [recLoading, setRecLoading] = useState(false);
  const prevCount = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (sidePanel !== 'chat' && chatMessages.length > prevCount.current) {
        setUnread(chatMessages.length - prevCount.current);
      }
      if (sidePanel === 'chat') {
        setUnread(0);
        prevCount.current = chatMessages.length;
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [chatMessages.length, sidePanel]);

  const toggleRecording = async () => {
    setRecLoading(true);
    try {
      if (!recording) {
        const { data } = await api.post(
          `${INTERVIEWS_BASE}/live/recording/${tokenData.room_name}/start/`
        );
        setEgressId(data.egress_id || '');
        setRecording(true);
      } else {
        await api.post(
          `${INTERVIEWS_BASE}/live/recording/${tokenData.room_name}/stop/`,
          { egress_id: egressId }
        );
        setRecording(false);
        setEgressId('');
      }
    } catch (e) {
      console.warn('[LiveRoom] recording toggle failed:', e?.response?.data || e.message);
    } finally { setRecLoading(false); }
  };

  return (
    <Box sx={{ px: 3, py: 1.5, bgcolor: 'rgba(17,24,39,0.97)', backdropFilter: 'blur(10px)', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
      <Box sx={{ width: 180, display: { xs: 'none', md: 'block' } }}>
        <Typography sx={{ color: '#E2E8F0', fontWeight: 600, fontSize: 13 }} noWrap>{tokenData.name}</Typography>
        <MeetingTimer />
      </Box>

      <Stack direction="row" alignItems="center" spacing={1.5}>
        <Btn title={isMicrophoneEnabled ? 'Mute' : 'Unmute'}
          icon={isMicrophoneEnabled ? <Mic sx={{ fontSize: 22 }} /> : <MicOff sx={{ fontSize: 22 }} />}
          onClick={() => localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)}
          active={!isMicrophoneEnabled} activeColor="#EF4444" />

        <Btn title={isCameraEnabled ? 'Stop video' : 'Start video'}
          icon={isCameraEnabled ? <Videocam sx={{ fontSize: 22 }} /> : <VideocamOff sx={{ fontSize: 22 }} />}
          onClick={() => localParticipant.setCameraEnabled(!isCameraEnabled)}
          active={!isCameraEnabled} activeColor="#EF4444" />

        {/* Screen share with audio enabled */}
        <Btn title={isSharing ? 'Stop sharing' : 'Share screen'}
          icon={isSharing ? <StopScreenShare sx={{ fontSize: 22 }} /> : <ScreenShare sx={{ fontSize: 22 }} />}
          onClick={() => localParticipant.setScreenShareEnabled(!isSharing, {
            audio: true,
            selfBrowserSurface: 'include',
          })}
          active={isSharing} activeColor="#22C55E" />

        {/* Record — employer only */}
        {tokenData.is_admin && (
          <Tooltip title={recording ? 'Stop recording' : 'Start recording'} arrow placement="top">
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
              <IconButton onClick={toggleRecording} disabled={recLoading}
                sx={{ width: 52, height: 52, bgcolor: recording ? '#EF4444' : 'rgba(255,255,255,0.10)', color: '#fff', transition: 'all 0.18s', '&:hover': { bgcolor: recording ? '#DC2626' : 'rgba(255,255,255,0.18)' } }}>
                <RadioButtonChecked sx={{ fontSize: 22, animation: recording ? 'lkblink 1s infinite' : 'none', '@keyframes lkblink': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.4 } } }} />
              </IconButton>
              <Typography sx={{ color: recording ? '#EF4444' : '#475569', fontSize: 10, fontWeight: 600 }}>
                {recLoading ? '...' : recording ? 'Stop REC' : 'Record'}
              </Typography>
            </Box>
          </Tooltip>
        )}

        <Box sx={{ width: 1, height: 36, bgcolor: 'rgba(255,255,255,0.08)', mx: 0.5 }} />

        <Tooltip title="Participants" arrow placement="top">
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
            <Badge badgeContent={participants.length} color="primary" max={9} sx={{ '& .MuiBadge-badge': { fontSize: 9, height: 15, minWidth: 15, top: 4, right: 4 } }}>
              <IconButton onClick={() => setSidePanel(sidePanel === 'people' ? null : 'people')}
                sx={{ width: 52, height: 52, bgcolor: sidePanel === 'people' ? '#1E3358' : 'rgba(255,255,255,0.10)', color: '#fff', border: sidePanel === 'people' ? '1px solid rgba(147,197,253,0.4)' : '1px solid transparent', '&:hover': { bgcolor: 'rgba(255,255,255,0.18)' } }}>
                <PeopleAlt sx={{ fontSize: 22 }} />
              </IconButton>
            </Badge>
            <Typography sx={{ color: '#475569', fontSize: 10, fontWeight: 500 }}>People</Typography>
          </Box>
        </Tooltip>

        <Tooltip title="Chat" arrow placement="top">
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
            <Badge badgeContent={unread} color="error" max={9} sx={{ '& .MuiBadge-badge': { fontSize: 9, height: 15, minWidth: 15 } }}>
              <IconButton onClick={() => { setSidePanel(sidePanel === 'chat' ? null : 'chat'); setUnread(0); prevCount.current = chatMessages.length; }}
                sx={{ width: 52, height: 52, bgcolor: sidePanel === 'chat' ? '#1E3358' : 'rgba(255,255,255,0.10)', color: '#fff', border: sidePanel === 'chat' ? '1px solid rgba(147,197,253,0.4)' : '1px solid transparent', '&:hover': { bgcolor: 'rgba(255,255,255,0.18)' } }}>
                <ChatIcon sx={{ fontSize: 22 }} />
              </IconButton>
            </Badge>
            <Typography sx={{ color: '#475569', fontSize: 10, fontWeight: 500 }}>Chat</Typography>
          </Box>
        </Tooltip>
      </Stack>

      <Box sx={{ width: 180, display: 'flex', justifyContent: 'flex-end' }}>
        <Tooltip title="End interview" arrow placement="top">
          <Button variant="contained" onClick={onLeave} startIcon={<CallEnd />}
            sx={{ bgcolor: '#EF4444', color: '#fff', fontWeight: 700, borderRadius: 3, textTransform: 'none', px: 2.5, py: 1.1, fontSize: 13, '&:hover': { bgcolor: '#DC2626' }, boxShadow: '0 4px 12px rgba(239,68,68,0.35)' }}>
            End
          </Button>
        </Tooltip>
      </Box>
    </Box>
  );
};

// ── Room content ──────────────────────────────────────────────────────────────
const RoomContent = ({ tokenData, onLeave, onSessionStarted, onDisconnected, sessionId }) => {
  const connectionState                       = useConnectionState();
  const { send: sendChat, chatMessages = [] } = useChat(); // one instance — survives panel open/close
  const [sidePanel,  setSidePanel]            = useState(null);
  const [recording,  setRecording]            = useState(false);  // lifted for REC badge in top bar
  const autoRecStarted                        = useRef(false);     // prevent double auto-start

  // ── Auto-start recording for IAEM / recording_enabled interviews ──
  useEffect(() => {
    if (
      connectionState === ConnectionState.Connected &&
      tokenData?.is_admin &&
      (tokenData?.recording_enabled || tokenData?.iaem_audit) &&
      !recording &&
      !autoRecStarted.current
    ) {
      autoRecStarted.current = true;
      api.post(`${INTERVIEWS_BASE}/live/recording/${tokenData.room_name}/start/`)
        .then(({ data }) => {
          setRecording(true);
          console.log('[LiveRoom] Auto-recording started:', data.egress_id);
        })
        .catch((e) => {
          console.warn('[LiveRoom] Auto-recording failed:', e?.response?.data || e.message);
          autoRecStarted.current = false; // allow manual retry
        });
    }
  }, [connectionState, tokenData, recording]);

  const connCfg = {
    [ConnectionState.Connected]:    { label: 'Live',           color: '#22C55E' },
    [ConnectionState.Connecting]:   { label: 'Connecting…',   color: '#F59E0B' },
    [ConnectionState.Reconnecting]: { label: 'Reconnecting…', color: '#F59E0B' },
    [ConnectionState.Disconnected]: { label: 'Disconnected',  color: '#9CA3AF' },
    [ConnectionState.Failed]:       { label: 'Failed',         color: '#EF4444' },
  }[connectionState] || { label: 'Connecting…', color: '#F59E0B' };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#0F172A', overflow: 'hidden' }}>
      {/* Top bar */}
      <Box sx={{ px: 2.5, py: 1, bgcolor: 'rgba(17,24,39,0.97)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0, minHeight: 52 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <FiberManualRecord sx={{ fontSize: 10, color: connCfg.color }} />
          <Typography sx={{ color: '#F1F5F9', fontWeight: 700, fontSize: 15 }}>{tokenData.name}</Typography>
          {tokenData.is_admin && <Chip label="Host" size="small" sx={{ bgcolor: 'rgba(30,58,138,0.8)', color: '#93C5FD', fontWeight: 700, height: 20, fontSize: 10, border: '1px solid rgba(147,197,253,0.2)' }} />}
          <Typography sx={{ color: connCfg.color, fontSize: 12, fontWeight: 500 }}>{connCfg.label}</Typography>
          {recording && tokenData.is_admin && (
            <Chip label="● REC" size="small"
              sx={{ bgcolor: 'rgba(239,68,68,0.15)', color: '#EF4444', fontWeight: 700, height: 20, fontSize: 11, border: '1px solid rgba(239,68,68,0.3)', animation: 'lkblink 1.5s infinite', '@keyframes lkblink': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.5 } } }} />
          )}
        </Stack>
        <MeetingTimer />
      </Box>

      {/* Video + sidebar */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        <Box sx={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <VideoArea tokenData={tokenData} />
          {tokenData.is_admin && tokenData.slot_id && <AdmitPanel slotId={tokenData.slot_id} />}
        </Box>
        
        <Box sx={{
          width: SIDEBAR_W, flexShrink: 0, bgcolor: '#0F1A2E',
          borderLeft: '1px solid rgba(255,255,255,0.07)',
          flexDirection: 'column', overflow: 'hidden',
          display: sidePanel ? 'flex' : 'none',
        }}>
          <Box sx={{ display: sidePanel === 'people' ? 'flex' : 'none', flexDirection: 'column', height: '100%' }}>
            <ParticipantsPanel onClose={() => setSidePanel(null)} tokenData={tokenData} />
          </Box>
          <Box sx={{ display: sidePanel === 'chat' ? 'flex' : 'none', flexDirection: 'column', height: '100%' }}>
            <ChatPanel onClose={() => setSidePanel(null)} sessionId={sessionId} chatMessages={chatMessages} onSend={sendChat} />
          </Box>
        </Box>
      </Box>

      <ControlBar
        tokenData={tokenData}
        onLeave={onLeave}
        sidePanel={sidePanel}
        setSidePanel={setSidePanel}
        recording={recording}
        setRecording={setRecording}
        chatMessages={chatMessages}
      />
      <RoomAudioRenderer />
      <SessionTracker candidateInterviewId={tokenData.candidate_interview_id} onSessionStarted={onSessionStarted} onDisconnected={onDisconnected} />
    </Box>
  );
};

// ══════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════
const LiveRoom = () => {
  const { roomName } = useParams();
  const navigate     = useNavigate();

const [tokenData, setTokenData] = useState(null);
  const [loading, setLoading]     = useState(() => !!roomName);
  const [error, setError]         = useState(() =>
    !roomName ? { type: 'not_found', message: 'No room name in URL.' } : null
  );
  const candidateBackUrl = '/jobseeker/smart-interviews/live';
  const employerBackUrl  = '/employer/interview-rounds';
  const [sessionId, setSessionId] = useState(null);
  const [showScore, setShowScore] = useState(false);

  useEffect(() => {
    if (!roomName) return;
    api.get(`${INTERVIEWS_BASE}/live/token/${roomName}/`)
      .then(({ data }) => { setTokenData(data); setLoading(false); })
      .catch((err) => {
        const resp = err?.response; const body = resp?.data || {};
        if (resp?.status === 403) {
          if (body.opens_at) setError({ type: 'early', message: body.detail || 'The room is not open yet.', opens_at: body.opens_at });
          else setError({ type: 'ended', message: body.detail || 'This interview has ended.' });
        } else if (resp?.status === 404) setError({ type: 'not_found', message: 'No interview found for this room.' });
        else if (resp?.status === 401) setError({ type: 'auth', message: 'Please log in to join this interview.' });
        else setError({ type: 'generic', message: body.detail || 'Could not connect.' });
        setLoading(false);
      });
  }, [roomName]);

  const handleSessionStarted = useCallback((id) => setSessionId(id), []);

  const handleDisconnected = useCallback(() => {
    if (!tokenData?.is_admin) navigate(candidateBackUrl);
  }, [tokenData, navigate]);

  const handleLeave = useCallback(() => {
    if (tokenData?.is_admin) {
      api.post(`${INTERVIEWS_BASE}/live/complete/${roomName}/`)
        .then((res) => {
          const data = res?.data || {};
          const isIaemAudit = data.iaem_audit ?? tokenData?.iaem_audit;
          const bookingId   = data.iaem_booking_id ?? tokenData?.iaem_booking_id;
          const siId        = data.scheduled_interview_id ?? tokenData?.scheduled_interview_id;

          if (isIaemAudit && bookingId) {
            // IAEM audited interview → full form with AI scoring
            navigate(`/interviewer/submission/${bookingId}`);
          } else if (siId) {
            // Non-IAEM (audit OFF) → same form, no AI scoring
            navigate(`/interviewer/submission/si/${siId}`);
          } else {
            // Fallback — legacy dialog (should rarely hit)
            setShowScore(true);
          }
        })
        .catch((e) => {
          console.warn('[LiveRoom] complete:', e?.response?.data);
          if (tokenData?.iaem_audit && tokenData?.iaem_booking_id) {
            navigate(`/interviewer/submission/${tokenData.iaem_booking_id}`);
          } else if (tokenData?.scheduled_interview_id) {
            navigate(`/interviewer/submission/si/${tokenData.scheduled_interview_id}`);
          } else {
            setShowScore(true);
          }
        });
    } else {
      navigate(candidateBackUrl);
    }
  }, [tokenData, roomName, navigate]);

  // Face gate — candidates only (interviewers/hosts skip)
  const gate = useFaceGate();
  const needsGate = tokenData && !tokenData.is_admin;

  // Hold on the "Verified" success state briefly before entering the room
  // so the candidate sees confirmation of the match instead of a hard cut.
  const [_readyToJoin, _setReadyToJoin] = useState(false);
  useEffect(() => {
    if (!gate.isVerified) return undefined;
    const t = setTimeout(() => _setReadyToJoin(true), 1500);
    return () => clearTimeout(t);
  }, [gate.isVerified]);

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: '#0F172A', gap: 2 }}>
        <CircularProgress sx={{ color: '#3B82F6' }} size={44} />
        <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 15 }}>Connecting to interview room…</Typography>
      </Box>
    );
  }
  if (error) return <ErrorScreen error={error} onBack={() => navigate(candidateBackUrl)} />;

   /* Face gate screen — candidate must verify before joining the room */
  if (needsGate && !_readyToJoin) {
    // ── Local tokens & UI helpers scoped to this render only ──────────────
    const _P = {
      pine:'#022124', pineDark:'#0A3A38', sage:'#7F9E7E', sageText:'#5E815D',
      sageSoft:'#EDF3EC', border:'#E7EAE3', cream:'#F6F8F3', surface:'#FFFFFF',
      ink:'#1F1F1F', muted:'#55584F', faint:'#7A7E76',
      amber:'#A35A2D', amberSoft:'#FBF0E7', danger:'#A63D2F',
    };
    const _FONT = "'Jost','DM Sans',sans-serif";
    const _card = {
      borderRadius: '18px', border: `1px solid ${_P.border}`,
      bgcolor: _P.surface, boxShadow: '0 6px 20px rgba(2,33,36,0.05)',
      p: { xs: 2.5, md: 3 },
    };
    const _rule = (IconComp, text, warn = false) => (
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
        <Box sx={{
          width: 28, height: 28, borderRadius: '9px', flexShrink: 0,
          display: 'grid', placeItems: 'center',
          bgcolor: warn ? _P.amberSoft : _P.sageSoft,
          color: warn ? _P.amber : _P.sageText,
        }}>
          <IconComp sx={{ fontSize: 15 }} />
        </Box>
        <Typography sx={{
          fontFamily: _FONT, fontSize: 13.25, color: _P.ink, lineHeight: 1.6, pt: '2px',
        }}>{text}</Typography>
      </Box>
    );

    return (
      <Box sx={{
        position: 'fixed', inset: 0, zIndex: 1300,
        bgcolor: _P.cream, fontFamily: _FONT,
        overflowY: 'auto', WebkitOverflowScrolling: 'touch',
      }}>
        {/* ── Full-width dark hero band ───────────────────────────── */}
        <Box sx={{
          bgcolor: _P.pine, color: '#fff',
          px: { xs: 2.5, md: 5 }, py: { xs: 2.75, md: 3.25 },
          position: 'relative', overflow: 'hidden',
        }}>
          <Box aria-hidden sx={{
            position: 'absolute', right: -60, top: -40,
            width: 220, height: 220, borderRadius: '50%',
            bgcolor: 'rgba(127,158,126,0.10)',
          }} />
          <Box aria-hidden sx={{
            position: 'absolute', right: 80, bottom: -50,
            width: 140, height: 140, borderRadius: '50%',
            bgcolor: 'rgba(127,158,126,0.08)',
          }} />
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', minWidth: 0, position: 'relative' }}>
            <Box sx={{
              width: 58, height: 58, borderRadius: '16px', flexShrink: 0,
              display: 'grid', placeItems: 'center',
              bgcolor: 'rgba(255,255,255,0.08)', color: '#fff',
              border: '1px solid rgba(255,255,255,0.14)',
            }}>
              <Person sx={{ fontSize: 28 }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{
                fontFamily: _FONT, fontSize: 11, fontWeight: 700,
                letterSpacing: '2px', textTransform: 'uppercase',
                color: '#7F9E7E', mb: 0.5,
              }}>
                Live Interview
              </Typography>
              <Typography sx={{
                fontFamily: _FONT, fontSize: { xs: 22, md: 28 }, fontWeight: 700,
                color: '#fff', lineHeight: 1.2, letterSpacing: '-0.02em',
              }}>
                You're joining a live video call
              </Typography>
              <Typography sx={{
                fontFamily: _FONT, fontSize: 13, color: 'rgba(255,255,255,0.72)', mt: 0.5,
              }}>
                A real interviewer will meet you on the other side. Verify your face on the right to join the room.
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* ── Body: two-column grid ──────────────────────────────── */}
        <Box sx={{
          px: { xs: 2, md: 4 }, py: { xs: 2.5, md: 3.5 },
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' },
          gap: { xs: 2, md: 3 },
          alignItems: 'start',
        }}>

          {/* ═════════ LEFT — Do's & Don'ts ═════════ */}
          <Box sx={_card}>
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              gap: { xs: 2.5, md: 3 },
            }}>
              {/* ── DO'S ── */}
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <CheckCircleOutlined sx={{ fontSize: 20, color: _P.sageText }} />
                  <Typography sx={{
                    fontFamily: _FONT, fontSize: 12, fontWeight: 700,
                    letterSpacing: '1.5px', textTransform: 'uppercase',
                    color: _P.sageText,
                  }}>
                    Do's
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {_rule(AccessTime, 'Join a couple of minutes early — a real interviewer is waiting on the other side.')}
                  {_rule(Videocam, 'Test your camera, microphone, and internet before verifying — the call needs stable video.')}
                  {_rule(Person, 'Sit in a quiet, well-lit room with your face clearly visible in the centre of the frame.')}
                  {_rule(Mic, 'Speak clearly and at a natural pace, and pause briefly after the interviewer finishes speaking.')}
                  {_rule(CheckCircleOutlined, 'Dress the way you would for an in-person interview — it sets the tone from the first moment.')}
                  {_rule(ChatIcon, 'Keep your resume and any work you may be asked to walk through easily reachable.')}
                </Box>
              </Box>

              {/* ── DON'TS ── */}
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <ErrorOutlined sx={{ fontSize: 20, color: _P.danger }} />
                  <Typography sx={{
                    fontFamily: _FONT, fontSize: 12, fontWeight: 700,
                    letterSpacing: '1.5px', textTransform: 'uppercase',
                    color: _P.danger,
                  }}>
                    Don'ts
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {_rule(VideocamOff, 'Do not turn off your camera during the interview — the interviewer should see you throughout.', true)}
                  {_rule(ErrorOutlined, 'Do not use a mobile browser — join from a laptop or desktop so the video stays stable.', true)}
                  {_rule(Person, 'Do not have other people in the room or visible in the background during the call.', true)}
                  {_rule(MicOff, 'Do not check messages, take other calls, or respond to notifications while the interview is in progress.', true)}
                  {_rule(ErrorOutlined, 'Do not read from a prepared script — natural, conversational answers land far better with a real interviewer.', true)}
                </Box>
              </Box>
            </Box>
          </Box>

          {/* ═════════ RIGHT — Face verification + Back ═════════ */}
          <Box sx={{
            display: 'flex', flexDirection: 'column',
            gap: { xs: 2, md: 2.5 }, minWidth: 0,
            position: { md: 'sticky' }, top: { md: 16 },
          }}>

            {/* Face verification — same face-gate hook, same handlers */}
            <Box sx={_card}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 2 }}>
                <Box sx={{
                  width: 34, height: 34, borderRadius: '10px', flexShrink: 0,
                  display: 'grid', placeItems: 'center',
                  bgcolor: _P.sageSoft, color: _P.sageText,
                }}>
                  <FaceOutlined sx={{ fontSize: 18 }} />
                </Box>
                <Typography sx={{ fontFamily: _FONT, fontSize: 16, fontWeight: 700, color: _P.pine }}>
                  Face verification required
                </Typography>
              </Box>
              <Typography sx={{
                fontFamily: _FONT, fontSize: 12.5, color: _P.faint, mb: 2, lineHeight: 1.55,
              }}>
                Once your face is verified you'll join the interview room automatically.
              </Typography>

              {gate.state === 'idle' && (
                <Button fullWidth variant="outlined" onClick={gate.startCamera}
                  sx={{
                    fontFamily: _FONT, textTransform: 'none', fontWeight: 600,
                    borderColor: _P.sage, color: _P.pine, borderRadius: '10px', py: 1,
                    '&:hover': { borderColor: _P.sageText, bgcolor: _P.sageSoft },
                  }}>
                  Enable Camera
                </Button>
              )}

              {(gate.state === 'requesting' || gate.state === 'ready' ||
                gate.state === 'verifying' || gate.state === 'mismatch') && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                  <Box sx={{
                    borderRadius: '12px', overflow: 'hidden',
                    bgcolor: '#000', aspectRatio: '4 / 3',
                    width: '100%', maxWidth: 240, mx: 'auto',
                  }}>
                    <video ref={gate.videoRef} autoPlay muted playsInline
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </Box>
                  <Typography sx={{ fontFamily: _FONT, fontSize: '0.78rem', color: _P.muted }}>
                    Position your face clearly in the frame and capture.
                  </Typography>
                  <Button size="small" variant="contained" onClick={gate.verify}
                    disabled={gate.state === 'requesting' || gate.state === 'verifying'}
                    fullWidth
                    sx={{
                      fontFamily: _FONT, textTransform: 'none', fontWeight: 600,
                      bgcolor: _P.pine, color: '#fff', borderRadius: '10px', py: 1,
                      '&:hover': { bgcolor: _P.pineDark },
                    }}>
                    {gate.state === 'verifying' ? 'Verifying…' : gate.state === 'mismatch' ? 'Retry' : 'Capture & Verify'}
                  </Button>
                  {gate.state === 'mismatch' && gate.errorMessage && (
                    <Typography sx={{ fontFamily: _FONT, fontSize: '0.75rem', color: _P.danger }}>
                      {gate.errorMessage}
                    </Typography>
                  )}
                </Box>
              )}

              {gate.state === 'not_enrolled' && (
                <Typography sx={{ fontFamily: _FONT, fontSize: '0.8rem', color: _P.danger }}>
                  {gate.errorMessage}
                </Typography>
              )}

              {gate.state === 'error' && (
                <Typography sx={{ fontFamily: _FONT, fontSize: '0.8rem', color: _P.danger }}>
                  {gate.errorMessage}
                </Typography>
              )}

              {gate.state === 'verified' && (
                <Box sx={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: 1.5, py: 1.5,
                }}>
                  <Box sx={{
                    width: 56, height: 56, borderRadius: '50%',
                    display: 'grid', placeItems: 'center',
                    bgcolor: _P.sageSoft, color: _P.sageText,
                  }}>
                    <CheckCircleOutlined sx={{ fontSize: 32 }} />
                  </Box>
                  <Typography sx={{
                    fontFamily: _FONT, fontSize: 15, fontWeight: 700,
                    color: _P.sageText, textAlign: 'center',
                  }}>
                    Face verified
                  </Typography>
                  <Typography sx={{
                    fontFamily: _FONT, fontSize: 12.5, color: _P.muted,
                    textAlign: 'center', lineHeight: 1.5,
                  }}>
                    Joining the interview room…
                  </Typography>
                  <CircularProgress size={20} sx={{ color: _P.sageText, mt: 0.5 }} />
                </Box>
              )}
            </Box>

            {/* Back — same navigate call */}
            <Button
              onClick={() => navigate(candidateBackUrl)}
              startIcon={<ArrowBack sx={{ fontSize: 18 }} />}
              disableRipple
              fullWidth
              sx={{
                fontFamily: _FONT, textTransform: 'none',
                fontSize: '0.85rem', fontWeight: 600,
                color: _P.faint, py: 1.25,
                '&:hover': { color: _P.ink, bgcolor: 'transparent' },
              }}
            >
              Back
            </Button>
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', overflow: 'hidden' }}>
    
      <LiveKitRoom token={tokenData.token} serverUrl={tokenData.livekit_url} connect={true} video={true} audio={false} style={{ height: '100%' }}>
        <RoomContent
          tokenData={tokenData}
          onLeave={handleLeave}
          onSessionStarted={handleSessionStarted}
          onDisconnected={handleDisconnected}
          sessionId={sessionId}
        />
      </LiveKitRoom>

     
      <LiveScoreDialog
        open={showScore && !!tokenData?.is_admin && !tokenData?.iaem_audit}
        candidateInterviewId={tokenData?.candidate_interview_id}
        scheduledInterviewId={tokenData?.scheduled_interview_id}
        roomName={roomName}
        onDone={() => { setShowScore(false); navigate(employerBackUrl); }}
      />
    </Box>
  );
};

export default LiveRoom;