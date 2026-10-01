import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, CircularProgress, Chip, Stack,
} from '@mui/material';
import {
  Mic, MicOff, Videocam, VideocamOff, Timer, StopCircle, CheckCircle,
  CheckCircleOutlined, Description, FaceOutlined,
} from '@mui/icons-material';

import { useDocumentRealtimeSession } from '@/hooks/jobseeker/useDocumentBasedInterview';
import useFaceGate from '@/hooks/jobseeker/useFaceGate';
import AIRealtimeAvatar from './AIRealtimeAvatar';

const C = {
  navy: '#1E3358', accent: '#D97757',
  bg: '#0a0f18', surface: '#111827', surfaceLight: '#1f2937',
  text: '#fff', textSec: 'rgba(255,255,255,0.65)', textMuted: 'rgba(255,255,255,0.35)',
  success: '#10B981', warning: '#F59E0B', error: '#EF4444',
  border: 'rgba(255,255,255,0.08)',
};

const FULLSCREEN_OVERLAY = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  zIndex: 99998, bgcolor: C.bg,
};

const DocumentRealtimeSession = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [endDialogOpen, setEndDialogOpen] = React.useState(false);

  const gate = useFaceGate();

  const {
     phase, phaseLabel, errorMsg, elapsedSecs, remainingSecs, currentQuestionNum,
    subtitle, totalQuestions, liveScores,
    isRecording, isAISpeaking, isMuted, cameraOn, silenceWarning,
    videoRef, proctoringAlert,
    startSession, endInterview, toggleMute, toggleCamera,
  } = useDocumentRealtimeSession(id, { enrolled: gate.enrolled });

  const answeredCount = liveScores.length;
  const [_procAlert, _setProcAlert] = React.useState(null);
  React.useEffect(() => { if (proctoringAlert) _setProcAlert(proctoringAlert); }, [proctoringAlert]);

  // ── Init screen ─────────────────────────────────────────────────────────
  const _procBanner = _procAlert && (
    <Box onClick={() => _setProcAlert(null)} sx={{
      position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 99999,
      bgcolor: _procAlert.severity === 'error' ? 'rgba(180,20,20,0.97)' : 'rgba(160,90,0,0.97)',
      color: '#fff', px: 3.5, py: 1.75, borderRadius: '10px',
      border: _procAlert.severity === 'error' ? '2px solid #ff4444' : '2px solid #f59e0b',
      boxShadow: '0 6px 32px rgba(0,0,0,0.7)', textAlign: 'center',
      fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer', backdropFilter: 'blur(8px)',
    }}>
      {_procAlert.message}
      {_procAlert.strike && _procAlert.maxStrikes && (
        <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.9 }}>
          ({_procAlert.strike} of {_procAlert.maxStrikes})
        </span>
      )}
    </Box>
  );

    if (phase === 'init') {
    // ── Local tokens & UI helpers scoped to this render only ──────────────
    const _P = {
      pine:'#022124', pineDark:'#0A3A38', sage:'#7F9E7E', sageDark:'#6C8B6B',
      sageText:'#5E815D', sageSoft:'#EDF3EC', border:'#E7EAE3', cream:'#F6F8F3',
      surface:'#FFFFFF', ink:'#1F1F1F', muted:'#55584F', faint:'#7A7E76',
      amber:'#A35A2D', amberSoft:'#FBF0E7', danger:'#A63D2F', dangerSoft:'#FAEAE8',
    };
    const _FONT = "'Jost','DM Sans',sans-serif";
    const _card = {
      borderRadius: '18px', border: `1px solid ${_P.border}`,
      bgcolor: _P.surface, boxShadow: '0 6px 20px rgba(2,33,36,0.05)',
      p: { xs: 2.5, md: 3 },
    };
    const _sectionTitle = (IconComp, title, subtitle) => (
      <Box sx={{ mb: 1.75 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Box sx={{
            width: 34, height: 34, borderRadius: '10px', flexShrink: 0,
            display: 'grid', placeItems: 'center',
            bgcolor: _P.sageSoft, color: _P.sageText,
          }}>
            <IconComp sx={{ fontSize: 18 }} />
          </Box>
          <Typography sx={{ fontFamily: _FONT, fontSize: 16, fontWeight: 700, color: _P.pine }}>
            {title}
          </Typography>
        </Box>
        {subtitle && (
          <Typography sx={{
            fontFamily: _FONT, fontSize: 12.5, color: _P.faint, mt: 0.75, ml: '46px',
          }}>{subtitle}</Typography>
        )}
      </Box>
    );
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
        position: 'fixed', inset: 0, zIndex: 99998,
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
          <Box sx={{
            display: 'flex', flexDirection: { xs: 'column', md: 'row' },
            gap: 2, alignItems: { md: 'center' }, justifyContent: 'space-between',
            position: 'relative',
          }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', minWidth: 0 }}>
              <Box sx={{
                width: 58, height: 58, borderRadius: '16px', flexShrink: 0,
                display: 'grid', placeItems: 'center',
                bgcolor: 'rgba(255,255,255,0.08)', color: '#fff',
                border: '1px solid rgba(255,255,255,0.14)',
              }}>
                <Description sx={{ fontSize: 28 }} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{
                  fontFamily: _FONT, fontSize: 11, fontWeight: 700,
                  letterSpacing: '2px', textTransform: 'uppercase',
                  color: _P.sage, mb: 0.5,
                }}>
                  Interview Instructions
                </Typography>
                <Typography sx={{
                  fontFamily: _FONT, fontSize: { xs: 22, md: 28 }, fontWeight: 700,
                  color: '#fff', lineHeight: 1.2, letterSpacing: '-0.02em',
                }}>
                  Document-based voice interview
                </Typography>
                <Typography sx={{
                  fontFamily: _FONT, fontSize: 13, color: 'rgba(255,255,255,0.72)', mt: 0.5,
                }}>
                  A spoken interview from the questions your employer prepared. Please read the guidelines before starting.
                </Typography>
              </Box>
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

          {/* ═════════ LEFT (main) column ═════════ */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, md: 2.5 }, minWidth: 0 }}>

            {/* Do's & Don'ts — single card, split into two columns */}
            <Box sx={_card}>
              <Box sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                gap: { xs: 2.5, md: 3 },
              }}>

                {/* ── DO'S ── */}
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <CheckCircle sx={{ fontSize: 20, color: _P.sageText }} />
                    <Typography sx={{
                      fontFamily: _FONT, fontSize: 12, fontWeight: 700,
                      letterSpacing: '1.5px', textTransform: 'uppercase',
                      color: _P.sageText,
                    }}>
                      Do's
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {_rule(Videocam, 'Use Google Chrome or Microsoft Edge (latest version) on a laptop or desktop with a stable internet connection.')}
                    {_rule(Mic, 'Grant camera and microphone permissions when the browser prompts you, and complete face verification before starting.')}
                    {_rule(Description, 'Sit in a quiet, well-lit room with your face clearly visible in the centre of the frame.')}
                    {_rule(Mic, 'Speak clearly and at a natural, moderate pace — your voice is transcribed as you speak.')}
                    {_rule(Videocam, 'Look towards the camera as you would with a real interviewer, not at the keyboard.')}
                    {_rule(Timer, 'Take a brief moment to think before answering; a longer pause at the end tells the system you are done.')}
                    {_rule(CheckCircle, 'Use concrete examples from your own experience — depth and reasoning score better than generic answers.')}
                    {_rule(Mic, 'If you did not hear or understand the question the first time, ask "Please repeat the question" out loud and it will be read again.')}
                    {_rule(Description, 'If you do not know the answer to a question, say "Skip the question" or "Let\'s skip this" and the interview will move on to the next one.')}
                  </Box>
                </Box>

                {/* ── DON'TS ── */}
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <StopCircle sx={{ fontSize: 20, color: _P.danger }} />
                    <Typography sx={{
                      fontFamily: _FONT, fontSize: 12, fontWeight: 700,
                      letterSpacing: '1.5px', textTransform: 'uppercase',
                      color: _P.danger,
                    }}>
                      Don'ts
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {_rule(StopCircle, 'Do not exit fullscreen at any point — even briefly. Every exit is recorded as a violation.', true)}
                    {_rule(StopCircle, 'Do not switch browser tabs, open other applications, or interact with anything outside the interview window.', true)}
                    {_rule(VideocamOff, 'Do not allow anyone else to appear on camera. If additional faces are detected the session is flagged.', true)}
                    {_rule(MicOff, 'Do not read from notes, printed material, or another screen, and do not receive help from anyone in the room.', true)}
                    {_rule(StopCircle, 'Do not read from prepared or memorised scripts — it is detectable in the transcript and lowers your Communication score.', true)}
                    {_rule(MicOff, 'Do not mumble, rush, or trail off at the end of sentences — clear speech scores better.', true)}
                    {_rule(StopCircle, 'Do not stay silent for long stretches — if you are stuck, ask for a repeat or say "skip" so the interview keeps moving.', true)}
                    {_rule(StopCircle, 'Do not use a mobile browser or an unstable Wi-Fi connection — the session will not run reliably.', true)}
                  </Box>
                </Box>

              </Box>
            </Box>
          </Box>

          {/* ═════════ RIGHT (sidebar) column ═════════ */}
          <Box sx={{
            display: 'flex', flexDirection: 'column',
            gap: { xs: 2, md: 2.5 }, minWidth: 0,
            position: { md: 'sticky' }, top: { md: 16 },
          }}>

            {/* Pre-Interview Check */}
            <Box sx={_card}>
              {_sectionTitle(CheckCircle, 'Pre-Interview Check')}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                {[
                  { Icon: Videocam, label: 'Camera & microphone will be enabled' },
                  { Icon: Description, label: 'Browser will enter fullscreen mode' },
                  { Icon: StopCircle, label: 'Proctoring enabled throughout the interview' },
                ].map((item, i) => {
                  const Icon = item.Icon;
                  return (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                      <Box sx={{
                        width: 30, height: 30, borderRadius: '9px', flexShrink: 0,
                        display: 'grid', placeItems: 'center',
                        bgcolor: _P.sageSoft, color: _P.sageText,
                      }}>
                        <Icon sx={{ fontSize: 16 }} />
                      </Box>
                      <Typography sx={{ fontFamily: _FONT, fontSize: 13, color: _P.ink, fontWeight: 500 }}>
                        {item.label}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            </Box>

            {/* Face verification — same face-gate hook, same handlers, re-skinned */}
            <Box sx={_card}>
              {_sectionTitle(FaceOutlined, 'Face verification required')}

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
                    bgcolor: '#000', aspectRatio: '4 / 3', width: '100%',
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

              {gate.state === 'verified' && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircleOutlined sx={{ fontSize: 20, color: _P.sageText }} />
                  <Typography sx={{ fontFamily: _FONT, fontSize: '0.85rem', color: _P.sageText, fontWeight: 600 }}>
                    Face verified. You may start the interview.
                  </Typography>
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
            </Box>

            {/* Start button — same onClick, same disabled logic */}
            <Box sx={{ ..._card, bgcolor: _P.cream }}>
              <Button
                fullWidth variant="contained" disableElevation
                onClick={() => { gate.stopCamera(); startSession(); }}
                disabled={!gate.isVerified}
                sx={{
                  fontFamily: _FONT, textTransform: 'none',
                  fontWeight: 700, fontSize: '0.95rem',
                  borderRadius: '14px', py: 1.5,
                  bgcolor: _P.pine, color: '#fff',
                  boxShadow: '0 4px 16px rgba(2,33,36,0.22)',
                  '&:hover': {
                    bgcolor: _P.sage,
                    boxShadow: '0 6px 20px rgba(127,158,126,0.35)',
                  },
                  '&.Mui-disabled': {
                    bgcolor: _P.border, color: _P.faint,
                    boxShadow: 'none',
                  },
                }}
              >
                Start Interview
              </Button>
              <Typography sx={{
                fontFamily: _FONT, fontSize: 11.5, color: _P.faint,
                mt: 1.25, textAlign: 'center',
              }}>
                By starting, you confirm you're ready for the interview.
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    );
  }
  // ── Error screen ────────────────────────────────────────────────────────
  if (phase === 'error') {
    return (
      <Box sx={{ ...FULLSCREEN_OVERLAY, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
        <Box sx={{ maxWidth: 480, textAlign: 'center' }}>
          <Typography variant="h6" sx={{ color: C.error, mb: 1.5 }}>
            Something went wrong
          </Typography>
          <Typography sx={{ color: C.textSec, mb: 3 }}>{errorMsg}</Typography>
          <Button
            variant="contained"
            onClick={() => navigate('/jobseeker/smart-interviews/document-based')}
            sx={{ bgcolor: C.navy, textTransform: 'none', borderRadius: 2 }}
          >
            Back to document interviews
          </Button>
        </Box>
      </Box>
    );
  }

  // ── Connecting screen ───────────────────────────────────────────────────
  if (phase === 'connecting') {
    return (
      <Box sx={{ ...FULLSCREEN_OVERLAY, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
        <CircularProgress sx={{ color: C.accent }} />
        <Typography sx={{ color: C.textSec }}>{phaseLabel || 'Connecting…'}</Typography>
      </Box>
    );
  }

  // ── Completed screen ────────────────────────────────────────────────────
  if (phase === 'completed') {
    return (
      <Box sx={{ ...FULLSCREEN_OVERLAY, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
        <CheckCircle sx={{ fontSize: 56, color: C.success }} />
        <Typography variant="h6" sx={{ color: C.text }}>Interview complete</Typography>
        <Typography sx={{ color: C.textSec }}>Taking you to your results…</Typography>
      </Box>
    );
  }

  // ── Live session ─────────────────────────────────────────────────────────
  const statusLabel = isAISpeaking ? 'Speaking' : isRecording ? 'Listening' : 'Idle';
  const statusDotColor = isAISpeaking ? C.accent : isRecording ? C.success : C.textMuted;
  const displaySecs = remainingSecs > 0 ? remainingSecs : elapsedSecs;
  const isCountdown = remainingSecs > 0;
  const mm = String(Math.floor(displaySecs / 60)).padStart(2, '0');
  const ss = String(displaySecs % 60).padStart(2, '0');

  const questionLabel = totalQuestions > 0
    ? `Question ${currentQuestionNum || Math.min(answeredCount + 1, totalQuestions)} of ${totalQuestions}`
    : 'Question —';

  return (
    <Box sx={FULLSCREEN_OVERLAY}>
      {_procBanner}
      {/* Top bar */}
      <Box sx={{
        position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        px: 3, py: 1.75, borderBottom: `1px solid ${C.border}`,
      }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box sx={{
            width: 36, height: 36, borderRadius: 1.5, bgcolor: 'rgba(217,119,87,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Description sx={{ color: C.accent, fontSize: 20 }} />
          </Box>
          <Box>
            <Typography sx={{ color: C.text, fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>
              Interview
            </Typography>
            <Typography sx={{ color: C.textSec, fontSize: 12 }}>
              {questionLabel}
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" alignItems="center" spacing={1}
          sx={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
          <Timer sx={{ color: C.textSec, fontSize: 18 }} />
          <Typography sx={{
            color: isCountdown && remainingSecs <= 60 ? C.error : C.text,
            fontWeight: 600, fontSize: 15,
          }}>
            {isCountdown ? `${mm}:${ss} left` : `${mm}:${ss}`}
          </Typography>
        </Stack>

        <Button
          size="small"
          startIcon={<StopCircle sx={{ fontSize: 16 }} />}
          onClick={() => setEndDialogOpen(true)}
          sx={{
            bgcolor: C.error, color: '#fff', textTransform: 'none', borderRadius: 5,
            px: 1.75, fontWeight: 600, fontSize: 13,
            '&:hover': { bgcolor: '#d13a3a' },
          }}
        >
          End
        </Button>
      </Box>

      {/* Main stage — 50/50 split */}
      <Box sx={{ display: 'flex', height: 'calc(100% - 65px)' }}>
        {/* Left half — AI avatar */}
        <Box sx={{
          width: '50%', position: 'relative', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', p: 4,
          borderRight: `1px solid ${C.border}`,
        }}>
          <AIRealtimeAvatar isPlaying={isAISpeaking} isListening={isRecording} isWaiting={!isAISpeaking && !isRecording} />

          {/* Floating subtitle box, bottom of the avatar panel only */}
          <Box sx={{
            position: 'absolute', left: 24, right: 24, bottom: 24,
            bgcolor: 'rgba(0,0,0,0.55)', borderRadius: 2, p: 2.5, textAlign: 'center',
          }}>
            <Typography sx={{ color: C.text, fontSize: 15, lineHeight: 1.6 }}>
              {subtitle || '…'}
            </Typography>
            {silenceWarning && (
              <Typography sx={{ color: C.warning, mt: 1, fontSize: 12 }}>
                Still there? Go ahead and answer when you're ready.
              </Typography>
            )}

            {/* Waveform — only animates while listening or speaking */}
            <Stack direction="row" spacing={0.5} justifyContent="center" alignItems="flex-end" sx={{ mt: 1.5, height: 20 }}>
              {Array.from({ length: 9 }).map((_, i) => (
                <Box key={i} sx={{
                  width: 3, borderRadius: 1,
                  bgcolor: (isRecording || isAISpeaking) ? C.accent : C.textMuted,
                  height: (isRecording || isAISpeaking) ? `${30 + (i % 4) * 18}%` : '20%',
                  animation: (isRecording || isAISpeaking) ? `docWaveBar 0.9s ease-in-out ${i * 0.08}s infinite` : 'none',
                  '@keyframes docWaveBar': {
                    '0%, 100%': { transform: 'scaleY(0.4)' },
                    '50%':      { transform: 'scaleY(1)' },
                  },
                }} />
              ))}
            </Stack>
          </Box>
        </Box>

        {/* Right half — candidate camera, fills the whole panel */}
        <Box sx={{ width: '50%', position: 'relative', bgcolor: C.surface }}>
          <video ref={videoRef} autoPlay muted playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: cameraOn ? 'block' : 'none' }} />
          {!cameraOn && (
            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <VideocamOff sx={{ color: C.textMuted, fontSize: 48 }} />
            </Box>
          )}

          {/* Status badge — Idle / Listening / Speaking */}
          <Chip
            size="small"
            label={statusLabel}
            icon={<Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: statusDotColor, ml: '8px !important' }} />}
            sx={{
              position: 'absolute', top: 16, left: 16,
              bgcolor: 'rgba(0,0,0,0.55)', color: C.text, fontWeight: 500,
              '& .MuiChip-icon': { order: -1 },
            }}
          />

          {/* Mic/camera controls, overlaid at the bottom-right of the camera panel */}
          <Stack direction="row" spacing={1.5}
            sx={{ position: 'absolute', bottom: 16, right: 16 }}>
            <IconButton onClick={toggleMute} sx={{
              bgcolor: isMuted ? 'rgba(239,68,68,0.85)' : 'rgba(16,185,129,0.85)', color: '#fff',
              '&:hover': { bgcolor: isMuted ? '#d13a3a' : '#0ea472' },
            }}>
              {isMuted ? <MicOff /> : <Mic />}
            </IconButton>
            <IconButton onClick={toggleCamera} sx={{
              bgcolor: 'rgba(0,0,0,0.55)', color: '#fff',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.75)' },
            }}>
              {cameraOn ? <Videocam /> : <VideocamOff />}
            </IconButton>
          </Stack>
        </Box>
      </Box>

      {/* End confirmation */}
      <Dialog open={endDialogOpen} onClose={() => setEndDialogOpen(false)} sx={{ zIndex: 1000000 }}>
        <DialogTitle>End interview now?</DialogTitle>
        <DialogContent>
          <Typography>
            Any unanswered questions will be marked as skipped. This can't be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEndDialogOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => { setEndDialogOpen(false); endInterview(); }}>
            End interview
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DocumentRealtimeSession;