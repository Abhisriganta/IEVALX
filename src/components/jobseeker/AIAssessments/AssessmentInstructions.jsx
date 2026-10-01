import React, { useState } from 'react';
import {
  Box, Typography, Button, Card, Stack, Checkbox,
  FormControlLabel, Chip, Grid, Divider,
} from '@mui/material';
import {
  TimerOutlined, AssignmentOutlined, VisibilityOutlined,
  WarningAmberOutlined, CheckCircleOutlined, GppGoodOutlined,
  VideocamOutlined, TabOutlined, FullscreenOutlined,
  ContentCopyOutlined, MouseOutlined, FaceOutlined,
  ArrowForwardOutlined, LaptopOutlined, WifiOutlined,
  MicNoneOutlined, ArticleOutlined,
} from '@mui/icons-material';
// BUILD: 2026-09-17-proctor-assessment-v1 — layout: 2026-09-21-two-column-fullscreen
import useFaceGate from '@/hooks/jobseeker/useFaceGate';



const FONT = "'Jost','DM Sans',sans-serif";

const C = {
  pine:       '#022124',
  pineDark:   '#0A3A38',
  sage:       '#7F9E7E',
  sageDark:   '#6C8B6B',
  sageText:   '#5E815D',
  sageSoft:   '#EDF3EC',
  sageHover:  '#DDE9DC',
  border:     '#E7EAE3',
  cream:      '#F6F8F3',
  surface:    '#FFFFFF',
  ink:        '#1F1F1F',
  muted:      '#55584F',
  faint:      '#7A7E76',
  amber:      '#A35A2D',
  amberSoft:  '#FBF0E7',
  danger:     '#A63D2F',
  dangerSoft: '#FAEAE8',
};

/* ── tiny icon-row helper ─────────────────────────────────────────────── */
const Rule = ({ icon, text, warn = false }) => (
  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
    <Box sx={{
      width: 30, height: 30, borderRadius: '10px', flexShrink: 0,
      bgcolor: warn ? C.amberSoft : C.sageSoft,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {React.cloneElement(icon, {
        sx: { fontSize: 16, color: warn ? C.amber : C.sageText },
      })}
    </Box>
    <Typography sx={{
      fontFamily: FONT, fontSize: 13.5, color: C.ink, lineHeight: 1.65, pt: '3px',
    }}>
      {text}
    </Typography>
  </Stack>
);

/* ── meta pill (duration / questions / sections) ─────────────────────── */
const MetaPill = ({ icon, label }) => (
  <Chip
    icon={React.cloneElement(icon, { sx: { fontSize: 16, color: `${C.sageText} !important` } })}
    label={label}
    size="small"
    sx={{
      fontFamily: FONT, fontSize: 12.5, fontWeight: 600, color: C.sageText,
      bgcolor: C.sageSoft, border: 'none', height: 32, px: 0.5,
      '& .MuiChip-icon': { ml: '8px' },
    }}
  />
);

/* ── card wrapper (used across the 2-column grid) ─────────────────────── */
const SectionCard = ({ children, sx }) => (
  <Card elevation={0} sx={{
    borderRadius: '18px',
    border: `1px solid ${C.border}`,
    bgcolor: C.surface,
    boxShadow: '0 6px 20px rgba(2,33,36,0.05)',
    p: { xs: 2.5, md: 3 },
    ...sx,
  }}>
    {children}
  </Card>
);

/* ── section heading inside a card ────────────────────────────────────── */
const SectionTitle = ({ icon, title, subtitle }) => (
  <Box sx={{ mb: 2 }}>
    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
      <Box sx={{
        width: 34, height: 34, borderRadius: '10px', flexShrink: 0,
        bgcolor: C.sageSoft,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {React.cloneElement(icon, { sx: { fontSize: 18, color: C.sageText } })}
      </Box>
      <Typography sx={{
        fontFamily: FONT, fontSize: 16, fontWeight: 700, color: C.pine,
      }}>
        {title}
      </Typography>
    </Stack>
    {subtitle && (
      <Typography sx={{
        fontFamily: FONT, fontSize: 12.5, color: C.faint,
        mt: 0.75, ml: '46px',
      }}>
        {subtitle}
      </Typography>
    )}
  </Box>
);

/* ── big number stat (Questions / Minutes / Sections) ─────────────────── */
const StatBlock = ({ value, label, accent }) => (
  <Box sx={{
    flex: 1, minWidth: 0,
    bgcolor: C.cream,
    border: `1px solid ${C.border}`,
    borderRadius: '14px',
    py: { xs: 2, md: 2.5 }, px: 1.5,
    textAlign: 'center',
  }}>
    <Typography sx={{
      fontFamily: FONT, fontSize: { xs: 30, md: 36 }, fontWeight: 700,
      color: accent || C.pine, lineHeight: 1,
    }}>
      {value}
    </Typography>
    <Typography sx={{
      fontFamily: FONT, fontSize: 10.5, fontWeight: 700,
      letterSpacing: '1.5px', textTransform: 'uppercase',
      color: C.faint, mt: 1,
    }}>
      {label}
    </Typography>
  </Box>
);

/* ── row inside System Check card ─────────────────────────────────────── */
const CheckRow = ({ icon, label, status, ok = true }) => (
  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
    <Box sx={{
      width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
      bgcolor: ok ? C.sageSoft : C.dangerSoft,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {ok
        ? <CheckCircleOutlined sx={{ fontSize: 18, color: C.sageText }} />
        : <WarningAmberOutlined sx={{ fontSize: 18, color: C.danger }} />}
    </Box>
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
        {icon && React.cloneElement(icon, { sx: { fontSize: 14, color: C.faint } })}
        <Typography sx={{
          fontFamily: FONT, fontSize: 13.5, fontWeight: 600, color: C.pine,
        }}>
          {label}
        </Typography>
      </Stack>
      <Typography sx={{
        fontFamily: FONT, fontSize: 12, color: ok ? C.muted : C.danger,
        lineHeight: 1.5, mt: 0.25,
      }}>
        {status}
      </Typography>
    </Box>
  </Stack>
);

/* ══════════════════════════════════════════════════════════════════════ */
export default function AssessmentInstructions({
  title = 'Assessment',
  durationMinutes = 30,
  totalQuestions = 0,
  sectionCount = 0,
  onStart,
}) {
  const [accepted, setAccepted] = useState(false);
  // BUILD: 2026-09-17-proctor-assessment-v1 — pre-test face gate
  const gate = useFaceGate();

  // Derived-only helpers for System Check display; drive from the same gate state.
  const camOk = gate.state === 'verified' || gate.state === 'ready' || gate.state === 'verifying';
  const camMsg =
    gate.state === 'verified' ? 'Verified' :
    gate.state === 'ready'    ? 'Camera detected' :
    gate.state === 'verifying'? 'Verifying…' :
    gate.state === 'requesting' ? 'Requesting access…' :
    gate.state === 'error' || gate.state === 'not_enrolled' || gate.state === 'mismatch'
      ? (gate.errorMessage || 'Camera access failed')
      : 'Awaiting camera permission';

  return (
    <Box sx={{
      position: 'fixed', inset: 0, zIndex: 1300,
      bgcolor: C.cream, fontFamily: FONT,
      overflowY: 'auto', WebkitOverflowScrolling: 'touch',
    }}>
      {/* ── Full-width dark hero band ──────────────────────────────── */}
      <Box sx={{
        bgcolor: C.pine, color: '#fff',
        px: { xs: 2.5, md: 5 }, py: { xs: 2.5, md: 3 },
        position: 'relative', overflow: 'hidden',
      }}>
        <Box sx={{
          position: 'absolute', right: -60, top: -40,
          width: 220, height: 220, borderRadius: '50%',
          bgcolor: 'rgba(127,158,126,0.10)',
        }} />
        <Box sx={{
          position: 'absolute', right: 80, bottom: -50,
          width: 140, height: 140, borderRadius: '50%',
          bgcolor: 'rgba(127,158,126,0.08)',
        }} />
        <Stack direction={{ xs: 'column', md: 'row' }}
          spacing={{ xs: 1.5, md: 2 }}
          sx={{ alignItems: { md: 'center' }, justifyContent: 'space-between', position: 'relative' }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{
              fontFamily: FONT, fontSize: 11, fontWeight: 700,
              letterSpacing: '2px', textTransform: 'uppercase',
              color: C.sage, mb: 0.5,
            }}>
              Assessment Instructions
            </Typography>
            <Typography sx={{
              fontFamily: FONT, fontSize: { xs: 20, md: 26 }, fontWeight: 700,
              color: '#fff', lineHeight: 1.25,
            }}>
              {title}
            </Typography>
            <Typography sx={{
              fontFamily: FONT, fontSize: 13, color: 'rgba(255,255,255,0.72)', mt: 0.5,
            }}>
              Please read carefully before starting your assessment.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
            <MetaPill icon={<TimerOutlined />} label={`${durationMinutes} min`} />
            {totalQuestions > 0 && (
              <MetaPill
                icon={<AssignmentOutlined />}
                label={`${totalQuestions} question${totalQuestions !== 1 ? 's' : ''}`}
              />
            )}
            {sectionCount > 1 && (
              <MetaPill
                icon={<ArticleOutlined />}
                label={`${sectionCount} section${sectionCount !== 1 ? 's' : ''}`}
              />
            )}
          </Stack>
        </Stack>
      </Box>

      {/* ── Body: full-width 2-column grid ──────────────────────────── */}
      <Box sx={{ px: { xs: 2, md: 4 }, py: { xs: 2.5, md: 3.5 } }}>
        <Grid container spacing={{ xs: 2, md: 3 }}>

          {/* ═════════ LEFT (main) column ═════════ */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Stack spacing={{ xs: 2, md: 2.5 }}>

              {/* Test Overview */}
              <SectionCard>
                <SectionTitle icon={<AssignmentOutlined />} title="Assessment Overview" />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <StatBlock value={totalQuestions || '—'} label="Questions" accent={C.pine} />
                  <StatBlock value={durationMinutes}        label="Minutes"   accent={C.amber} />
                  <StatBlock value={sectionCount || 1}
                    label={sectionCount === 1 ? 'Section' : 'Sections'} accent={C.sageText} />
                </Stack>
              </SectionCard>

              {/* General Instructions (same rule content as before) */}
              <SectionCard>
                <SectionTitle icon={<GppGoodOutlined />} title="General Instructions" />
                <Stack spacing={1.75}>
                  <Rule
                    icon={<TimerOutlined />}
                    text={`You have ${durationMinutes} minutes to complete this assessment. The timer starts as soon as you click "Start Assessment" and cannot be paused.`}
                  />
                  <Rule
                    icon={<AssignmentOutlined />}
                    text="Read each question carefully before answering. You can navigate between questions using the Previous and Next buttons, or the question navigator panel."
                  />
                  <Rule
                    icon={<CheckCircleOutlined />}
                    text="You can change your answer to any question before submitting. Unanswered questions will be marked as not attempted."
                  />
                  <Rule
                    icon={<ContentCopyOutlined />}
                    text="Copy-paste is disabled during the assessment. You must type your answers directly."
                  />
                  <Rule
                    icon={<FullscreenOutlined />}
                    text="The assessment runs in fullscreen mode. Do not exit fullscreen until you have submitted your test — exiting will be recorded as a violation."
                  />
                  <Rule
                    icon={<WarningAmberOutlined />}
                    warn
                    text={'Once you click "Submit", your answers are final and cannot be changed. Make sure you have reviewed all your answers before submitting.'}
                  />
                </Stack>
              </SectionCard>

              {/* Proctoring Guidelines (same rules) */}
              <SectionCard>
                <SectionTitle
                  icon={<VisibilityOutlined />}
                  title="Proctoring Guidelines"
                  subtitle="This assessment is AI-proctored. The following activities are monitored in real time."
                />
                <Stack spacing={1.75}>
                  <Rule
                    icon={<VideocamOutlined />}
                    text="Your webcam must remain on throughout the test. Ensure your face is clearly visible, well-lit, and centred in the frame."
                  />
                  <Rule
                    icon={<FaceOutlined />}
                    text="Face detection is active. Looking away from the screen, turning your head, or covering your face will trigger a violation alert."
                  />
                  <Rule
                    icon={<FaceOutlined />}
                    warn
                    text="Only one person may be visible on camera. If multiple faces are detected, it will be flagged as a violation."
                  />
                  <Rule
                    icon={<TabOutlined />}
                    text="Do not switch tabs or open other applications. Tab switches and window blur events are tracked and reported."
                  />
                  <Rule
                    icon={<FullscreenOutlined />}
                    text="Remain in fullscreen mode at all times. Any exit from fullscreen is logged as a proctoring event."
                  />
                  <Rule
                    icon={<MouseOutlined />}
                    text="Right-click context menus, developer tools, and keyboard shortcuts (Ctrl+C, Ctrl+V, Alt+Tab, etc.) are disabled and monitored."
                  />
                  <Rule
                    icon={<VisibilityOutlined />}
                    warn
                    text="Using a phone, book, or any external material in your camera's view will be detected and flagged."
                  />
                  <Rule
                    icon={<FaceOutlined />}
                    text="Identity verification runs periodically — your face is compared against your registered profile photo. Ensure no one else takes the test on your behalf."
                  />
                </Stack>
              </SectionCard>

              {/* Important warning (unchanged text) */}
              <Box sx={{
                bgcolor: C.dangerSoft, borderRadius: '14px',
                border: '1px solid #F0C9C4',
                px: { xs: 2, md: 2.5 }, py: 1.75,
                display: 'flex', gap: 1.5, alignItems: 'flex-start',
              }}>
                <WarningAmberOutlined sx={{ fontSize: 20, color: C.danger, mt: '2px', flexShrink: 0 }} />
                <Typography sx={{ fontFamily: FONT, fontSize: 13, color: C.danger, lineHeight: 1.65 }}>
                  <strong>Important:</strong> Excessive violations (tab switches, face not detected,
                  multiple persons, use of external materials) may result in automatic disqualification
                  of your assessment. Ensure you are in a quiet, well-lit environment with a stable
                  internet connection before starting.
                </Typography>
              </Box>
            </Stack>
          </Grid>

          {/* ═════════ RIGHT (sidebar) column ═════════ */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Stack spacing={{ xs: 2, md: 2.5 }}
              sx={{
                position: { md: 'sticky' },
                top: { md: 16 },
              }}
            >
              {/* System Check */}
              <SectionCard>
                <SectionTitle icon={<LaptopOutlined />} title="System Check" />
                <Stack spacing={1.5}>
                  <CheckRow icon={<LaptopOutlined />}    label="Browser"    status="Chrome / Edge detected" ok />
                  <CheckRow icon={<WifiOutlined />}      label="Internet"   status="Connected"              ok />
                  <CheckRow icon={<VideocamOutlined />}  label="Camera"     status={camMsg}                 ok={camOk} />
                  <CheckRow icon={<FullscreenOutlined />} label="Fullscreen" status="Supported"             ok />
                  <CheckRow icon={<MicNoneOutlined />}   label="Microphone" status={camOk ? 'Detected' : 'Awaiting permission'} ok={camOk} />
                </Stack>
              </SectionCard>

              {/* Camera Setup — same face-gate hook, just re-skinned */}
              <SectionCard>
                <SectionTitle icon={<FaceOutlined />} title="Camera Setup" />

                {gate.state === 'idle' && (
                  <Box sx={{
                    borderRadius: '14px', bgcolor: '#0F1A1A',
                    aspectRatio: '4 / 3', width: '100%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    mb: 1.5,
                  }}>
                    <Stack sx={{ alignItems: 'center' }} spacing={0.75}>
                      <VideocamOutlined sx={{ fontSize: 34, color: 'rgba(255,255,255,0.55)' }} />
                      <Typography sx={{ fontFamily: FONT, fontSize: 12.5, color: 'rgba(255,255,255,0.65)' }}>
                        Camera not started
                      </Typography>
                    </Stack>
                  </Box>
                )}

                {(gate.state === 'error' || gate.state === 'not_enrolled') && (
                  <Box sx={{
                    borderRadius: '14px', bgcolor: '#1F0E0E',
                    aspectRatio: '4 / 3', width: '100%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    mb: 1.5,
                  }}>
                    <Stack sx={{ alignItems: 'center' }} spacing={0.75}>
                      <VideocamOutlined sx={{ fontSize: 34, color: '#F0857A' }} />
                      <Typography sx={{ fontFamily: FONT, fontSize: 12.5, color: '#F0857A' }}>
                        Camera access failed
                      </Typography>
                    </Stack>
                  </Box>
                )}

                {gate.state !== 'idle' && gate.state !== 'error' && gate.state !== 'not_enrolled' && (
                  <Box sx={{
                    borderRadius: '14px', overflow: 'hidden',
                    bgcolor: '#000', aspectRatio: '4 / 3', width: '100%',
                    mb: 1.5, position: 'relative',
                  }}>
                    <video ref={gate.videoRef} autoPlay muted playsInline
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    {gate.state === 'verified' && (
                      <Box sx={{
                        position: 'absolute', top: 8, right: 8,
                        bgcolor: C.sageText, color: '#fff',
                        borderRadius: '999px', px: 1.25, py: 0.25,
                        fontFamily: FONT, fontSize: 11, fontWeight: 700,
                        display: 'flex', alignItems: 'center', gap: 0.5,
                      }}>
                        <CheckCircleOutlined sx={{ fontSize: 13 }} />
                        Verified
                      </Box>
                    )}
                  </Box>
                )}

                {gate.state === 'idle' && (
                  <Button fullWidth variant="outlined" onClick={gate.startCamera}
                    sx={{
                      fontFamily: FONT, textTransform: 'none', fontWeight: 600,
                      borderColor: C.sage, color: C.pine, borderRadius: '10px',
                      '&:hover': { borderColor: C.sageText, bgcolor: C.sageSoft },
                    }}>
                    Enable Camera &amp; Microphone
                  </Button>
                )}

                {(gate.state === 'ready' || gate.state === 'verifying' || gate.state === 'mismatch') && (
                  <>
                    <Button fullWidth variant="contained" onClick={gate.verify}
                      disabled={gate.state === 'verifying'}
                      sx={{
                        fontFamily: FONT, textTransform: 'none', fontWeight: 600,
                        bgcolor: C.pine, color: '#fff', borderRadius: '10px',
                        '&:hover': { bgcolor: C.pineDark },
                      }}>
                      {gate.state === 'verifying'
                        ? 'Verifying…'
                        : (gate.state === 'mismatch' ? 'Retry verification' : 'Capture & Verify')}
                    </Button>
                    {gate.state === 'mismatch' && gate.errorMessage && (
                      <Typography sx={{ fontFamily: FONT, fontSize: 12, color: C.danger, mt: 1 }}>
                        {gate.errorMessage}
                      </Typography>
                    )}
                  </>
                )}

                {(gate.state === 'error' || gate.state === 'not_enrolled') && (
                  <>
                    <Button fullWidth variant="contained" onClick={gate.startCamera}
                      sx={{
                        fontFamily: FONT, textTransform: 'none', fontWeight: 600,
                        bgcolor: C.danger, color: '#fff', borderRadius: '10px',
                        '&:hover': { bgcolor: '#8B2F24' },
                      }}>
                      Retry
                    </Button>
                    {gate.errorMessage && (
                      <Typography sx={{ fontFamily: FONT, fontSize: 12, color: C.danger, mt: 1 }}>
                        {gate.errorMessage}
                      </Typography>
                    )}
                  </>
                )}

                {gate.state === 'verified' && (
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 0.5 }}>
                    <CheckCircleOutlined sx={{ fontSize: 18, color: C.sageText }} />
                    <Typography sx={{
                      fontFamily: FONT, fontSize: 13, color: C.sageText, fontWeight: 600,
                    }}>
                      Face verified. You may start the assessment.
                    </Typography>
                  </Stack>
                )}
              </SectionCard>

              {/* Accept + Start (same accept state, same onStart, same disabled logic) */}
              <SectionCard sx={{ bgcolor: C.cream }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={accepted}
                      onChange={(e) => setAccepted(e.target.checked)}
                      sx={{
                        color: C.sage, p: 0.75,
                        '&.Mui-checked': { color: C.sageText },
                      }}
                    />
                  }
                  label={
                    <Typography sx={{
                      fontFamily: FONT, fontSize: 13, color: C.ink, fontWeight: 500, lineHeight: 1.5,
                    }}>
                      I have read and understood the assessment rules and proctoring guidelines.
                    </Typography>
                  }
                  sx={{ alignItems: 'flex-start', ml: -0.5, mr: 0 }}
                />
                <Divider sx={{ my: 2, borderColor: C.border }} />
                <Button
                  fullWidth
                  variant="contained"
                  disabled={!accepted || !gate.isVerified}
                  onClick={onStart}
                  endIcon={<ArrowForwardOutlined />}
                  sx={{
                    fontFamily: FONT, textTransform: 'none',
                    fontSize: 15, fontWeight: 700, height: 48,
                    borderRadius: '12px',
                    bgcolor: C.pine, color: '#fff',
                    boxShadow: 'none',
                    '&:hover': { bgcolor: C.pineDark, boxShadow: '0 4px 16px rgba(2,33,36,0.18)' },
                    '&.Mui-disabled': { bgcolor: C.border, color: C.faint },
                  }}
                >
                  Start Assessment
                </Button>
                <Typography sx={{
                  fontFamily: FONT, fontSize: 11.5, color: C.faint, mt: 1.25, textAlign: 'center',
                }}>
                  By starting, you confirm you're ready for the assessment.
                </Typography>
              </SectionCard>
            </Stack>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}