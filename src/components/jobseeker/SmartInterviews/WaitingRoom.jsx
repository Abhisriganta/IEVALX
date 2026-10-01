import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Typography, CircularProgress, Button, Stack, Paper, Chip, Avatar,
} from '@mui/material';
import {
  ArrowBack, AccessTime, CheckCircleOutlined, VideocamRounded,
} from '@mui/icons-material';
import smartInterviewService from '@/services/api/jobseeker/smartInterviewService';
import api from '@/services/api/axiosInstance';

/* ── Design tokens — canonical IEvalX palette ────────────────────────── */
const T = {
  pine:       '#022124',
  pineLight:  '#043034',
  sage:       '#7F9E7E',
  sageText:   '#5E815D',
  sageDeep:   '#4E6E4D',
  sageSoft:   '#EDF3EC',
  sageWash:   '#F3F7F1',
  cream:      '#F6F8F3',
  white:      '#FFFFFF',
  ink:        '#101210',
  muted:      '#55584F',
  faint:      '#7A7E76',
  line:       '#E7EAE3',
  lineSoft:   '#D8DDD4',
  done:       '#3E6E3E',
  doneSoft:   '#EAF2E9',
  error:      '#B4462F',
  errorSoft:  '#FBECEA',
};

const FONT  = "'Jost','DM Sans',sans-serif";

const POLL_INTERVAL_MS = 5000;

const WaitingRoom = () => {
  const { roomName }   = useParams();
  const navigate       = useNavigate();
  const location       = useLocation();

  const slotId    = location.state?.slotId    || null;
  const interview = location.state?.interview || null;

  const [phase, setPhase]       = useState('waiting');
  const [errMsg, setErrMsg]     = useState('');
  const [waitSecs, setWaitSecs] = useState(0);

  const goBack = useCallback(() => {
    if (slotId) {
      api.post(`/iaem/jobseeker/slots/status/${slotId}/leave/`).catch(() => {});
    }
    navigate('/jobseeker/smart-interviews/live');
  }, [navigate, slotId]);
  const goRoom = useCallback(() => navigate(`/live-room/${roomName}`), [navigate, roomName]);

  useEffect(() => {
    const id = setInterval(() => setWaitSecs(s => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!slotId || phase !== 'waiting') return;

    const poll = async () => {
      try {
        const slot = await smartInterviewService.checkSlotStatus(slotId);
        if (slot.admitted_at) {
          setPhase('admitted');
          setTimeout(goRoom, 1500);
        }
        // Interviewer no-show or reschedule detected by the system
        if (slot.booking_status === 'NO_SHOW_IV' || slot.booking_status === 'RESCHEDULED') {
          setPhase('no_show');
        }
      } catch (e) {
        console.warn('[WaitingRoom] poll failed:', e?.response?.data || e.message);
      }
    };

    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [slotId, phase, goRoom]);

  const fmtWait = (secs) => {
    if (secs < 60) return `${secs}s`;
    return `${Math.floor(secs / 60)}m ${secs % 60}s`;
  };

  const company  = interview?.company_name || 'Company';
  const jobTitle = interview?.job_title    || interview?.interview_name || 'Interview';
  const when     = interview?.datetime_display || interview?.date_display || '';

  // 🔧 CHANGE 1/3 — resolve company logo URL from any likely backend field
  // Avatar auto-falls-back to the initial letter if src is empty or fails to load.
  const companyLogo =
    interview?.company_logo      ||
    interview?.company_logo_url  ||
    interview?.logo_url          ||
    interview?.logo              ||
    interview?.company?.logo     ||
    interview?.company?.logo_url ||
    '';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        bgcolor: T.cream,
        p: 3,
        /* Subtle radial glow behind the card */
        background: `radial-gradient(ellipse at 50% 40%, ${T.sageSoft} 0%, ${T.cream} 65%)`,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          maxWidth: 460, width: '100%',
          p: { xs: 4, sm: 5 },
          borderRadius: '20px',
          bgcolor: T.white,
          border: `1px solid ${T.line}`,
          boxShadow: '0 8px 40px rgba(2,33,36,0.06), 0 1px 4px rgba(2,33,36,0.04)',
          textAlign: 'center',
          fontFamily: FONT,
        }}
      >
        {/* ── Phase: WAITING ─────────────────────────────────────────── */}
        {phase === 'waiting' && (
          <>
            {/* Animated ring + company avatar */}
            <Box sx={{ position: 'relative', display: 'inline-flex', mb: 3.5 }}>
              <CircularProgress
                size={92} thickness={2.2}
                sx={{
                  color: T.sage,
                  animationDuration: '2.8s',
                  '& .MuiCircularProgress-circle': { strokeLinecap: 'round' },
                }}
              />
              <Box sx={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {/* 🔧 CHANGE 1/3 — pass src so real logo renders; letter stays as fallback */}
                <Avatar
                  src={companyLogo}
                  alt={company}
                  imgProps={{
                    onError: (e) => { e.currentTarget.style.display = 'none'; },
                  }}
                  sx={{
                    width: 62, height: 62,
                    bgcolor: T.sageSoft,
                    color: T.sageDeep,
                    fontSize: '1.35rem',
                    fontWeight: 800,
                    fontFamily: FONT,
                    border: `2.5px solid ${T.white}`,
                    boxShadow: `0 0 0 1.5px ${T.line}`,
                    // 🔧 FIX — image fills the full circle (was shrinking with contain + padding)
                    '& .MuiAvatar-img': {
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      objectPosition: 'center',
                      p: 0,
                    },
                  }}
                >
                  {company.charAt(0).toUpperCase()}
                </Avatar>
              </Box>
            </Box>

            <Typography sx={{
              fontFamily: FONT,
              fontSize: { xs: '1.2rem', sm: '1.4rem' },
              fontWeight: 800,
              color: T.ink,
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
              mb: 0.75,
            }}>
              You're in the waiting room
            </Typography>

            <Typography sx={{
              fontFamily: FONT,
              fontSize: '0.85rem',
              color: T.muted,
              lineHeight: 1.7,
              mb: 3,
              maxWidth: 320,
              mx: 'auto',
            }}>
              The host will admit you shortly. Please keep this page open.
            </Typography>

            {/* Interview info card */}
            {(jobTitle || when) && (
              <Box sx={{
                mb: 3,
                p: 2.25,
                borderRadius: '14px',
                bgcolor: T.sageWash,
                border: `1px solid ${T.line}`,
              }}>
                <Typography sx={{
                  fontFamily: FONT,
                  fontWeight: 700,
                  color: T.ink,
                  fontSize: '0.9rem',
                  letterSpacing: '-0.01em',
                }}>
                  {jobTitle}
                </Typography>
                {company && (
                  <Typography sx={{
                    fontFamily: FONT,
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: T.sageText,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    mt: 0.25,
                  }}>
                    {company}
                  </Typography>
                )}
                {/* 🔧 CHANGE 2/3 — force date/time row to center via sx (was drifting left) */}
                {when && (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 0.75,
                      mt: 0.75,
                      width: '100%',
                      textAlign: 'center',
                    }}
                  >
                    <AccessTime sx={{ fontSize: 13, color: T.faint }} />
                    <Typography sx={{
                      fontFamily: FONT,
                      fontSize: '0.78rem',
                      color: T.faint,
                      fontWeight: 600,
                    }}>
                      {when}
                    </Typography>
                  </Box>
                )}
              </Box>
            )}

            {/* Wait timer chip */}
            <Chip
              label={`Waiting ${fmtWait(waitSecs)}`}
              size="small"
              sx={{
                bgcolor: T.sageSoft,
                color: T.sageDeep,
                fontFamily: FONT,
                fontWeight: 700,
                fontSize: '0.76rem',
                letterSpacing: '0.02em',
                mb: 3,
                border: `1px solid ${T.line}`,
                height: 28,
              }}
            />

            {/* 🔧 CHANGE 3/3 — bouncing dots row: wrap in centered Box so the flex
                 row shrinks to content and sits dead center under the chip */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                width: '100%',
                mb: 4,
              }}
            >
              <Box
                sx={{
                  display: 'inline-flex',
                  gap: '8px',
                  mx: 'auto',
                }}
              >
                {[0, 1, 2].map((i) => (
                  <Box key={i} sx={{
                    width: 8, height: 8, borderRadius: '50%',
                    bgcolor: T.sage,
                    animation: 'waitBounce 1.4s ease-in-out infinite',
                    animationDelay: `${i * 0.2}s`,
                    '@keyframes waitBounce': {
                      '0%, 80%, 100%': { opacity: 0.25, transform: 'scale(0.8)' },
                      '40%':           { opacity: 1,    transform: 'scale(1.2)' },
                    },
                  }} />
                ))}
              </Box>
            </Box>

            {/* Leave button */}
            <Button
              startIcon={<ArrowBack sx={{ fontSize: 16 }} />}
              onClick={goBack}
              disableRipple
              sx={{
                fontFamily: FONT,
                color: T.faint,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.82rem',
                borderRadius: '10px',
                px: 2, py: 0.75,
                transition: 'all 0.15s ease',
                '&:hover': {
                  bgcolor: T.sageSoft,
                  color: T.sageText,
                },
              }}
            >
              Leave waiting room
            </Button>
          </>
        )}

        {/* ── Phase: ADMITTED ────────────────────────────────────────── */}
        {phase === 'admitted' && (
          <>
            <CheckCircleOutlined sx={{ fontSize: 72, color: T.done, mb: 2 }} />
            <Typography sx={{
              fontFamily: FONT,
              fontSize: { xs: '1.2rem', sm: '1.4rem' },
              fontWeight: 800,
              color: T.ink,
              letterSpacing: '-0.02em',
              mb: 1,
            }}>
              You've been admitted!
            </Typography>
            <Typography sx={{
              fontFamily: FONT,
              fontSize: '0.85rem',
              color: T.muted,
              mb: 3,
            }}>
              Joining the interview room now…
            </Typography>
            <CircularProgress
              size={28}
              sx={{
                color: T.done,
                '& .MuiCircularProgress-circle': { strokeLinecap: 'round' },
              }}
            />
          </>
        )}

        {/* ── Phase: INTERVIEWER NO-SHOW ─────────────────────────────── */}
        {phase === 'no_show' && (
          <>
            <Box sx={{
              width: 72, height: 72, borderRadius: '50%',
              bgcolor: T.errorSoft, display: 'flex', alignItems: 'center',
              justifyContent: 'center', mx: 'auto', mb: 2.5,
            }}>
              <AccessTime sx={{ fontSize: 36, color: T.error }} />
            </Box>
            <Typography sx={{
              fontFamily: FONT,
              fontSize: { xs: '1.2rem', sm: '1.4rem' },
              fontWeight: 800,
              color: T.ink,
              letterSpacing: '-0.02em',
              mb: 1,
            }}>
              Your interviewer was unable to attend
            </Typography>
            <Typography sx={{
              fontFamily: FONT,
              fontSize: '0.85rem',
              color: T.muted,
              lineHeight: 1.7,
              mb: 3,
              maxWidth: 340,
              mx: 'auto',
            }}>
              We apologize for the inconvenience. A reschedule has been initiated
              and you will be notified when you can book a new slot.
            </Typography>
            <Button
              variant="contained"
              disableElevation
              onClick={() => navigate('/jobseeker/smart-interviews/live')}
              sx={{
                fontFamily: FONT,
                bgcolor: T.pine,
                color: T.white,
                borderRadius: '12px',
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '0.85rem',
                px: 3, py: 1,
                '&:hover': { bgcolor: T.pineLight },
              }}
            >
              Back to My Interviews
            </Button>
          </>
        )}

        {/* ── Phase: ERROR ───────────────────────────────────────────── */}
        {phase === 'error' && (
          <>
            <Typography sx={{
              fontFamily: FONT,
              fontSize: { xs: '1.2rem', sm: '1.4rem' },
              fontWeight: 800,
              color: T.ink,
              letterSpacing: '-0.02em',
              mb: 1,
            }}>
              Something went wrong
            </Typography>
            <Typography sx={{
              fontFamily: FONT,
              fontSize: '0.85rem',
              color: T.muted,
              mb: 3,
            }}>
              {errMsg}
            </Typography>
            <Stack direction="row" spacing={1.5} justifyContent="center">
              <Button
                variant="contained"
                startIcon={<VideocamRounded sx={{ fontSize: 18 }} />}
                onClick={goRoom}
                disableElevation
                sx={{
                  fontFamily: FONT,
                  bgcolor: T.pine,
                  color: T.white,
                  borderRadius: '12px',
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  px: 2.5, py: 1,
                  '&:hover': { bgcolor: T.pineLight },
                }}
              >
                Join anyway
              </Button>
              <Button
                onClick={goBack}
                disableRipple
                sx={{
                  fontFamily: FONT,
                  color: T.faint,
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  borderRadius: '12px',
                  px: 2, py: 1,
                  '&:hover': { bgcolor: T.sageSoft, color: T.sageText },
                }}
              >
                Go back
              </Button>
            </Stack>
          </>
        )}
      </Paper>
    </Box>
  );
};

export default WaitingRoom;