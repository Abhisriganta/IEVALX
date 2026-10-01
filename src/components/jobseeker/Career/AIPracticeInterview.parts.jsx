
import React, { useState, useEffect, useMemo } from 'react';

let _jsPDFPromise = null;
const _loadJsPDF = () => {
  if (!_jsPDFPromise) {
    _jsPDFPromise = import('jspdf')
      .then((m) => m.jsPDF)
      .catch((err) => { _jsPDFPromise = null; throw err; });
  }
  return _jsPDFPromise;
};
import {
  Box, Paper, Typography, Stack, Grid, Chip, Button, Tooltip,
  LinearProgress, CircularProgress, Divider, Alert,
  Accordion, AccordionSummary, AccordionDetails,
  Checkbox, Pagination, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Card, TextField, InputAdornment, MenuItem,
  ToggleButton, ToggleButtonGroup, Select,
} from '@mui/material';
import {
  DescriptionOutlined,
  AutoAwesomeOutlined,
  BuildOutlined, ScienceOutlined, FlashOnOutlined, ForumOutlined,
  EmojiEventsOutlined,
  CheckCircleOutlined, InsertDriveFileOutlined,
  UploadFileOutlined, PlayArrowRounded, RestartAltOutlined,
  TimerOutlined, TipsAndUpdatesOutlined, ExpandMoreRounded,
  
  HistoryOutlined,
  ArrowBackOutlined,
  ArrowForwardOutlined,
  FileDownloadOutlined,
  DeleteOutlineOutlined,
  DeleteSweepOutlined,
  WarningAmberOutlined,
  Search, ClearRounded, ViewModule, ViewList,
  Visibility, VisibilityOutlined, Schedule, CheckCircle, CalendarMonthOutlined,
  QuizOutlined, RefreshOutlined, CloseRounded,
} from '@mui/icons-material';

import {
  Avatar as PracticeAvatar,
  VISEMES as PRACTICE_VISEMES,
  VISEME_KEYS as PRACTICE_VISEME_KEYS,
} from './Practice-avathar';

export const Avatar      = PracticeAvatar;
export const VISEMES     = PRACTICE_VISEMES;
export const VISEME_KEYS = PRACTICE_VISEME_KEYS;


export const FONT        = "'Jost','DM Sans',sans-serif";
export const NAVY        = '#022124';               // pine
export const NAVY_MID    = '#24433E';               // pine2 (gradients)
export const NAVY_SOFT   = 'rgba(2,33,36,0.08)';
export const NAVY_SOFTER = 'rgba(2,33,36,0.04)';
export const SAGE        = '#7F9E7E';
export const SAGE_DARK   = '#6C8B6B';
export const SAGE_TEXT   = '#5E815D';
export const SAGE_SOFT   = '#EDF3EC';
export const CREAM       = '#F6F8F3';
export const BORDER      = '#E7EAE3';               // line
export const MUTED       = '#7A7E76';               // faint
export const TEXT_DIM    = '#55584F';               // muted
export const SUCCESS     = '#3E6E3E';               // done
export const WARN        = '#A35A2D';               // amber
export const DANGER      = '#A63D2F';               // danger

export const SHADOW_SM   = '0 1px 3px rgba(2,33,36,0.06), 0 1px 2px rgba(2,33,36,0.04)';
export const SHADOW_MD   = '0 4px 16px rgba(2,33,36,0.10), 0 2px 6px rgba(2,33,36,0.06)';
export const SHADOW_LG   = '0 8px 32px rgba(2,33,36,0.12), 0 3px 10px rgba(2,33,36,0.07)';
export const SHADOW_XL   = '0 20px 48px rgba(2,33,36,0.16), 0 6px 16px rgba(2,33,36,0.10)';
export const SHADOW_CARD = '0 2px 12px rgba(2,33,36,0.07), 0 1px 4px rgba(2,33,36,0.04)';

export const LEVEL_COLOR = {
  strong:      SUCCESS,
  proficient:  '#5E815D',      // sageText — a lighter "good" tier under done-green
  developing:  WARN,
  weak:        DANGER,
  not_covered: MUTED,
};

const BRAND = {
  navy:          '#022124',                  // pine — buttons, active, titles
  navyDark:      '#0A3A38',                  // pine hover
  navySoft:      'rgba(127,158,126,0.10)',   // sage tint
  navySoftHover: 'rgba(127,158,126,0.18)',
  sage:          '#7F9E7E',
  sageDark:      '#6C8B6B',
  sageText:      '#5E815D',                  // sage for TEXT on light
  sageSoft:      '#EDF3EC',
  border:        '#E7EAE3',
  borderStrong:  '#D8DDD4',
  muted:         '#55584F',
  ink:           '#101210',
  bg:            '#F6F8F3',                  // cream
  surface:       '#FFFFFF',
};
/* ────────────────────────────────────────────────────────────────────────
   Small building blocks — UNCHANGED
   ──────────────────────────────────────────────────────────────────────── */
export const StageChip = ({ label, color = NAVY, bg = NAVY_SOFT }) => (
  <Box sx={{
    px: 1.25, py: 0.35, borderRadius: '999px',
    bgcolor: bg, border: `1px solid ${color}22`,
    display: 'inline-flex', alignItems: 'center', gap: 0.75,
  }}>
    <Box sx={{
      width: 6, height: 6, borderRadius: '50%', bgcolor: color,
      animation: 'pulseDot 1.6s ease-in-out infinite',
      '@keyframes pulseDot': { '0%, 100%': { opacity: 0.4 }, '50%': { opacity: 1 } },
    }} />
    <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color, letterSpacing: '0.03em' }}>
      {label}
    </Typography>
  </Box>
);

export const SectionTitle = ({ icon: Icon, label, hint }) => (
  <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 1.5 }}>
    <Box sx={{
      width: 32, height: 32, borderRadius: 1.5,
      bgcolor: NAVY_SOFT, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Icon sx={{ fontSize: 17, color: NAVY }} />
    </Box>
    <Box>
      <Typography sx={{ color: NAVY, fontSize: '0.98rem', fontWeight: 700 }}>{label}</Typography>
      {hint && (
        <Typography sx={{ color: TEXT_DIM, fontSize: '0.75rem', mt: 0.25 }}>{hint}</Typography>
      )}
    </Box>
  </Stack>
);

export const SlotIcon = ({ type }) => {
  const map = {
    opening:     ForumOutlined,
    definition:  BuildOutlined,
    scenario:    ScienceOutlined,
    project:     DescriptionOutlined,
    situational: AutoAwesomeOutlined,
    rapid:       FlashOnOutlined,
    closing:     EmojiEventsOutlined,
  };
  const I = map[type] || AutoAwesomeOutlined;
  return <I sx={{ fontSize: 16, color: NAVY }} />;
};

export const GuidelineRow = ({ icon: Icon, title, desc }) => (
  <Stack direction="row" spacing={1.75} alignItems="flex-start" sx={{ py: 1.25 }}>
    <Box sx={{
      width: 38, height: 38, borderRadius: '10px', flexShrink: 0,
      bgcolor: '#FFFFFF', border: `1px solid ${BORDER}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: SHADOW_SM,
    }}>
      <Icon sx={{ fontSize: 19, color: NAVY }} />
    </Box>
    <Box sx={{ flex: 1, pt: 0.35 }}>
      <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: NAVY, mb: 0.3 }}>
        {title}
      </Typography>
      <Typography sx={{ fontSize: '0.8rem', color: TEXT_DIM, lineHeight: 1.55 }}>
        {desc}
      </Typography>
    </Box>
  </Stack>
);

/* ════════════════════════════════════════════════════════════════════════
   ReadyView — UNCHANGED
   ════════════════════════════════════════════════════════════════════════ */
export const ReadyView = ({ ctx }) => {
  const {
    plan, resume, config,
    requestingPerm, micPermission, parseError,
    beginInterview, fileInputRef, handleFile,
  } = ctx;

  if (!plan) return null;

  const skills      = plan.skills || [];
  const deepSlots   = plan.slots?.filter((s) => s.type === 'definition' || s.type === 'scenario') || [];
  const rapidSlots  = plan.slots?.filter((s) => s.type === 'rapid') || [];
  const projectSlot = plan.slots?.find((s) => s.type === 'project');

  const covered = new Set();
  plan.slots?.forEach((s) => (s.skills || []).forEach((k) => covered.add(String(k).toLowerCase())));
  const notCovered  = skills.filter((k) => !covered.has(String(k).toLowerCase()));
  const deepSkills  = [...new Set(deepSlots.flatMap((s) => s.skills || []))];
  const rapidSkills = [...new Set(rapidSlots.flatMap((s) => s.skills || []))];

  const yrs          = resume?.parsed?.years_of_experience;
  const isFresher    = !(typeof yrs === 'number' && yrs > 0);
  const projects     = typeof resume?.parsed?.projects_count === 'number' ? resume.parsed.projects_count : null;
  const totalQ       = plan.total_questions || plan.slots?.length || 0;
  const resumeSkills = resume?.parsed?.skills || [];

  /* ── Stat cell — equal-width column inside the stats strip. */
  const StatCell = ({ value, label, suffix, tint = NAVY }) => (
    <Box sx={{
      py: 1.5, px: 1.5, textAlign: 'center', minWidth: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0.6,
    }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 0.35 }}>
        <Typography sx={{
          fontSize: { xs: '1.4rem', sm: '1.55rem' }, fontWeight: 800, color: tint,
          lineHeight: 1, letterSpacing: '-0.025em', fontVariantNumeric: 'tabular-nums',
        }}>
          {value}
        </Typography>
        {suffix && (
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: MUTED, lineHeight: 1 }}>
            {suffix}
          </Typography>
        )}
      </Box>
      <Typography sx={{ fontSize: '0.6rem', color: MUTED, fontWeight: 800, letterSpacing: '0.14em' }}>
        {label}
      </Typography>
    </Box>
  );

  const CoverageRow = ({ icon: I, tag, tagColor, title, children }) => (
    <Box sx={{
      display: 'grid',
      gridTemplateColumns: '4px 34px 1fr',
      columnGap: 1.5, alignItems: 'start',
      py: 1.5,
      '& + &': { borderTop: '1px solid #EFF2EC' },
    }}>
      <Box sx={{ alignSelf: 'stretch', bgcolor: tagColor, borderRadius: '2px' }} />
      <Box sx={{
        width: 34, height: 34, borderRadius: '9px',
        bgcolor: 'transparent', border: `1.5px solid ${tagColor}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <I sx={{ fontSize: 17, color: tagColor }} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: '0.62rem', fontWeight: 800, color: tagColor, letterSpacing: '0.12em' }}>
          {tag}
        </Typography>
        <Typography sx={{ fontSize: '0.9rem', color: NAVY, fontWeight: 700, lineHeight: 1.35, mt: 0.15 }}>
          {title}
        </Typography>
        {children && <Box sx={{ mt: 1 }}>{children}</Box>}
      </Box>
    </Box>
  );


  const SectionBand = ({ icon: I, tag, title, subtitle, right }) => (
    <Box sx={{
      px: { xs: 2.25, md: 3 }, py: { xs: 2, md: 2.25 },
      display: 'grid',
      gridTemplateColumns: { xs: '42px 1fr', sm: '42px 1fr auto' },
      columnGap: 1.75, rowGap: 1, alignItems: 'center',
    }}>
      <Box sx={{
        width: 42, height: 42, borderRadius: '12px',
        background: `linear-gradient(145deg, ${NAVY_MID} 0%, ${NAVY} 100%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 12px rgba(2,33,36,0.22)',
      }}>
        <I sx={{ fontSize: 20, color: '#FFFFFF' }} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: '0.62rem', fontWeight: 800, color: '#7A7E76', letterSpacing: '0.14em' }}>
          {tag}
        </Typography>
        <Typography sx={{ fontSize: '1.1rem', fontWeight: 800, color: NAVY, letterSpacing: '-0.015em', lineHeight: 1.2, mt: 0.15 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography sx={{ fontSize: '0.82rem', color: TEXT_DIM, mt: 0.35, fontWeight: 500 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {right && (
        <Box sx={{ justifySelf: { xs: 'start', sm: 'end' }, gridColumn: { xs: '1 / -1', sm: 'auto' } }}>
          {right}
        </Box>
      )}
    </Box>
  );

  const replaceResumeBtn = (
    <Tooltip title="Upload a different resume" placement="top">
      <Button
        variant="contained"
        disableElevation
        size="small"
        startIcon={<UploadFileOutlined sx={{ fontSize: 16 }} />}
        onClick={() => fileInputRef.current?.click()}
        sx={{
          bgcolor: NAVY, color: '#FFFFFF', textTransform: 'none', fontWeight: 700,
          fontSize: '0.82rem', height: 36, px: 2, borderRadius: '10px',
          whiteSpace: 'nowrap',
          boxShadow: '0 2px 8px rgba(2,33,36,0.22)',
          '&:hover': { bgcolor: '#7F9E7E', boxShadow: '0 4px 12px rgba(127,158,126,0.40)' },
          transition: 'all 180ms ease',
        }}
      >
        Replace resume
      </Button>
    </Tooltip>
  );

  return (
    <Stack spacing={2}>
  
      <Box>

        {/* ─── Section 1 · RESUME identity ───────────────────────────── */}
        {resume?.parsed && (
          <>
            <Box sx={{
              px: { xs: 2.25, md: 3 }, pt: { xs: 2.25, md: 2.75 }, pb: { xs: 2, md: 2.25 },
              display: 'grid',
              gridTemplateColumns: { xs: '54px 1fr', sm: '54px 1fr auto' },
              columnGap: { xs: 1.5, sm: 2 }, rowGap: 1.25, alignItems: 'center',
            }}>
              <Box sx={{
                width: 54, height: 54, borderRadius: '15px',
                background: `linear-gradient(145deg, ${NAVY_MID} 0%, ${NAVY} 100%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 6px 18px rgba(2,33,36,0.28), 0 2px 6px rgba(2,33,36,0.16)',
              }}>
                <InsertDriveFileOutlined sx={{ color: '#FFFFFF', fontSize: 26 }} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Typography sx={{
                    fontSize: { xs: '1.05rem', md: '1.2rem' }, fontWeight: 800,
                    color: NAVY, letterSpacing: '-0.015em', lineHeight: 1.15,
                  }}>
                    {(resume.parsed.full_name || 'Your resume').toUpperCase()}
                  </Typography>
                  {typeof yrs === 'number' && yrs > 0 && (
                    <Box sx={{
                      px: 1, py: 0.35, borderRadius: '6px',
                      bgcolor: 'transparent', border: `1px solid ${NAVY}30`,
                      display: 'inline-flex', alignItems: 'center', gap: 0.4,
                    }}>
                      <TimerOutlined sx={{ fontSize: 12, color: NAVY }} />
                      <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: NAVY }}>
                        {yrs} {yrs === 1 ? 'yr' : 'yrs'}
                      </Typography>
                    </Box>
                  )}
                </Stack>
                {resume.parsed.headline && (
                  <Typography sx={{ fontSize: '0.88rem', color: TEXT_DIM, mt: 0.5, fontWeight: 500, lineHeight: 1.45 }}>
                    {resume.parsed.headline}
                  </Typography>
                )}
              </Box>
              <Box sx={{ gridColumn: { xs: '1 / -1', sm: 'auto' }, justifySelf: { xs: 'stretch', sm: 'end' } }}>
                {replaceResumeBtn}
              </Box>
            </Box>

            {/* Stats strip — no background tint; dividers do the sectioning */}
            <Divider sx={{ borderColor: '#E7EAE3' }} />
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: projects != null ? 'repeat(3, minmax(0,1fr))' : 'repeat(2, minmax(0,1fr))',
              '& > * + *': { borderLeft: '1px solid #E7EAE3' },
            }}>
              {isFresher
                ? <StatCell value="Fresher" label="ENTRY LEVEL" tint={SUCCESS} />
                : <StatCell value={yrs} label="EXPERIENCE" suffix={yrs === 1 ? 'yr' : 'yrs'} />
              }
              {projects != null && <StatCell value={projects} label={projects === 1 ? 'PROJECT' : 'PROJECTS'} />}
              <StatCell value={skills.length} label={skills.length === 1 ? 'SKILL' : 'SKILLS'} />
            </Box>

            {/* Skills chip cloud */}
            {resumeSkills.length > 0 && (
              <>
                <Divider sx={{ borderColor: '#E7EAE3' }} />
                <Box sx={{ px: { xs: 2.25, md: 3 }, py: 2.25 }}>
                  <Typography sx={{ fontSize: '0.62rem', fontWeight: 800, color: '#7A7E76', letterSpacing: '0.14em', mb: 1.5 }}>
                    SKILLS ON YOUR RESUME
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {resumeSkills.slice(0, 30).map((s) => (
                      <Chip key={s} size="small" label={s} sx={{
                        bgcolor: 'transparent', color: '#55584F', border: '1px solid #D8DDD4',
                        borderRadius: '8px', height: 30, fontSize: '0.8rem', fontWeight: 600,
                        cursor: 'default',
                        '& .MuiChip-label': { px: 1.5 },
                        '&:hover': { borderColor: NAVY, color: NAVY, bgcolor: 'transparent' },
                        transition: 'all 150ms ease',
                      }} />
                    ))}
                    {resumeSkills.length > 30 && (
                      <Chip size="small" label={`+${resumeSkills.length - 30}`} sx={{
                        bgcolor: 'transparent', color: MUTED, border: '1px dashed #D8DDD4',
                        borderRadius: '8px', height: 30, fontSize: '0.8rem', fontWeight: 700,
                        '& .MuiChip-label': { px: 1.5 },
                      }} />
                    )}
                  </Box>
                </Box>
              </>
            )}
          </>
        )}

        {/* ─── Section 2 · INTERVIEW PLAN ────────────────────────────── */}
        <Divider sx={{ borderColor: '#E7EAE3' }} />
        <SectionBand
          icon={AutoAwesomeOutlined}
          tag="INTERVIEW PLAN"
          title={`${totalQ} question${totalQ === 1 ? '' : 's'} coming up`}
          subtitle="Every skill on your resume gets scored"
          right={plan.mode && (
            <Chip
              size="small"
              label={String(plan.mode).toUpperCase()}
              sx={{
                bgcolor: 'transparent', color: NAVY, fontWeight: 800,
                height: 22, fontSize: '0.65rem', letterSpacing: '0.1em',
                border: `1px solid ${NAVY}30`,
                '& .MuiChip-label': { px: 1 },
              }}
            />
          )}
        />
        <Divider sx={{ borderColor: '#E7EAE3', mx: { xs: 2.25, md: 3 } }} />

        {/* Coverage rows — FLAT list, no card chrome */}
        <Box sx={{ px: { xs: 2.25, md: 3 }, py: 1.25 }}>
          {deepSkills.length > 0 && (
            <CoverageRow icon={BuildOutlined} tag="DEEP COVERAGE" tagColor={NAVY} title="Definition + real-world scenarios">
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {deepSkills.map((k) => (
                  <Chip key={`d-${k}`} size="small" label={k} sx={{
                    bgcolor: 'transparent', color: NAVY, fontWeight: 700,
                    height: 22, fontSize: '0.7rem', border: `1px solid ${NAVY}30`,
                  }} />
                ))}
              </Box>
            </CoverageRow>
          )}
          {projectSlot && (
            <CoverageRow icon={DescriptionOutlined} tag="PROJECT DEEP-DIVE" tagColor="#A35A2D"
              title={projectSlot.focus || 'One project from your resume'} />
          )}
          {rapidSkills.length > 0 && (
            <CoverageRow icon={FlashOnOutlined} tag="RAPID-FIRE" tagColor={WARN} title="20-second answers">
              <Box sx={{
                display: 'inline-flex', alignItems: 'center', gap: 0.75,
                px: 1.5, py: 0.55, borderRadius: '8px',
                bgcolor: 'transparent', border: `1px solid ${WARN}`,
              }}>
                <FlashOnOutlined sx={{ fontSize: 13, color: WARN }} />
                <Typography sx={{ fontSize: '0.76rem', fontWeight: 700, color: WARN }}>
                  {rapidSkills.length} skill{rapidSkills.length !== 1 ? 's' : ''} · all from your resume
                </Typography>
              </Box>
            </CoverageRow>
          )}
          {notCovered.length > 0 && (
            <CoverageRow icon={CheckCircleOutlined} tag="ALSO ON YOUR RESUME" tagColor={MUTED}
              title="Not scored — no question will be asked about these">
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {notCovered.map((k) => (
                  <Chip key={`n-${k}`} size="small" label={k} sx={{
                    bgcolor: 'transparent', color: MUTED,
                    border: `1px dashed ${MUTED}`, height: 22, fontSize: '0.7rem',
                  }} />
                ))}
              </Box>
            </CoverageRow>
          )}
        </Box>

        {/* ─── Section 3 · READY TO START (footer band of the same card) ── */}
        <Divider sx={{ borderColor: '#E7EAE3' }} />
        <Box sx={{
          px: { xs: 2.25, md: 3 }, py: { xs: 2.5, md: 2.75 },
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr auto' },
          columnGap: 3, rowGap: 2, alignItems: 'center',
        }}>
          <Box>
            <Typography sx={{ fontSize: '0.62rem', fontWeight: 800, color: '#7A7E76', letterSpacing: '0.14em' }}>
              READY TO START
            </Typography>
            <Typography sx={{ fontSize: { xs: '1.1rem', md: '1.25rem' }, fontWeight: 800, color: NAVY, letterSpacing: '-0.015em', lineHeight: 1.25, mt: 0.35 }}>
              {totalQ} questions · roughly 8–12 minutes
            </Typography>
            <Typography sx={{ fontSize: '0.82rem', color: TEXT_DIM, mt: 0.5, fontWeight: 500, lineHeight: 1.5 }}>
              Speak your answers — the AI listens, asks a follow-up when it needs one, and scores each skill on the CGPS scale (0–10).
            </Typography>
            <Box sx={{
              mt: 1.5, display: 'inline-flex', alignItems: 'center', gap: 0.75,
              px: 1.25, py: 0.5, borderRadius: '999px',
              bgcolor: 'transparent',
              border: `1px solid ${micPermission === 'granted' ? SUCCESS : (micPermission === 'denied' ? DANGER : WARN)}`,
            }}>
              <Box sx={{
                width: 7, height: 7, borderRadius: '50%',
                bgcolor: micPermission === 'granted' ? SUCCESS : (micPermission === 'denied' ? DANGER : WARN),
              }} />
              <Typography sx={{
                fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.05em',
                color: micPermission === 'granted' ? SUCCESS : (micPermission === 'denied' ? DANGER : WARN),
              }}>
                {micPermission === 'granted' ? 'MICROPHONE READY'
                  : micPermission === 'denied' ? 'MICROPHONE BLOCKED'
                  : 'MIC WILL PROMPT ON START'}
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            startIcon={requestingPerm ? <CircularProgress size={16} sx={{ color: '#FFFFFF' }} /> : <PlayArrowRounded sx={{ fontSize: 22 }} />}
            onClick={beginInterview}
            disabled={requestingPerm}
            sx={{
              justifySelf: { xs: 'stretch', sm: 'end' },
              background: `linear-gradient(135deg, ${NAVY_MID} 0%, ${NAVY} 100%)`,
              color: '#FFFFFF', textTransform: 'none',
              fontWeight: 800, fontSize: '0.95rem', letterSpacing: '0.005em',
              px: 3.25, height: { xs: 50, sm: 54 }, borderRadius: '14px',
              boxShadow: '0 6px 20px rgba(2,33,36,0.30), 0 2px 8px rgba(2,33,36,0.18)',
              minWidth: { xs: '100%', sm: 240 },
              '&:hover': {
                background: `linear-gradient(135deg, ${NAVY} 0%, #0A3A38 100%)`,
                boxShadow: '0 10px 28px rgba(2,33,36,0.36), 0 4px 12px rgba(2,33,36,0.22)',
                transform: 'translateY(-2px)',
              },
              '&.Mui-disabled': { background: `${NAVY}80`, color: '#FFFFFF', boxShadow: 'none' },
              transition: 'all 180ms ease',
            }}
          >
            {requestingPerm ? 'Requesting permission…' : (config.copy?.startCta || 'Start voice interview')}
          </Button>
        </Box>
      </Box>

      {/* Alerts sit outside the card so they don't disrupt its flow. */}
      {micPermission === 'denied' && (
        <Alert severity="warning" sx={{ borderRadius: '14px', boxShadow: '0 2px 10px rgba(163,90,45,0.10)', border: '1px solid rgba(163,90,45,0.18)' }}>
          Microphone access is blocked. Enable it in your browser's address bar to start the voice interview.
        </Alert>
      )}
      {parseError && (
        <Alert severity="error" sx={{ borderRadius: '14px', boxShadow: '0 2px 10px rgba(166,61,47,0.10)' }}>
          {parseError}
        </Alert>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={(config.supportedFileTypes || []).join(',')}
        style={{ display: 'none' }}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </Stack>
  );
};


const _buildPDF = async ({ score, verdict, summary, skills, strengths, weaknesses, transcript, attemptId, date }) => {
  try {
    const jsPDF = await _loadJsPDF();
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

 
    const _san = (s) => String(s == null ? '' : s)
      .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015]/g, '-')  // all dashes → -
      .replace(/[\u2018\u2019\u201A\u201B]/g, "'")               // curly single → '
      .replace(/[\u201C\u201D\u201E\u201F]/g, '"')               // curly double → "
      .replace(/\u2026/g, '...')                                 // ellipsis
      .replace(/\u00A0/g, ' ')                                   // nbsp → space
      .replace(/[\u2022\u25CF\u25AA]/g, '-')                     // bullets → -
      .replace(/[\u2028\u2029]/g, '\n');                         // line seps → \n
    const PW = 210, PH = 297;
    const ML = 20, MR = 20;
    const CW = PW - ML - MR;
    const BOTTOM_SAFE = 22;
    let y = 20;

    // Palette
    const INK          = [24, 32, 40];
    const INK_SOFT     = [96, 104, 112];
    const INK_MUTED    = [148, 156, 164];
    const HEADER_BG    = [16, 42, 66];
    const RULE         = [222, 226, 232];
    const CARD_BG      = [248, 250, 252];
    const CARD_BORDER  = [226, 232, 240];
    const OK           = [46, 125, 50];
    const WARN         = [201, 122, 40];
    const BAD          = [192, 57, 43];
    const ACCENT       = HEADER_BG;
    const BLUE         = [70, 110, 150];

    const setFill   = ([r, g, b]) => doc.setFillColor(r, g, b);
    const setStroke = ([r, g, b]) => doc.setDrawColor(r, g, b);
    const setColor  = ([r, g, b]) => doc.setTextColor(r, g, b);
    const bold   = (sz, rgb = INK)      => { doc.setFontSize(sz); doc.setFont('helvetica', 'bold');   setColor(rgb); };
    const norm   = (sz, rgb = INK)      => { doc.setFontSize(sz); doc.setFont('helvetica', 'normal'); setColor(rgb); };
    const italic = (sz, rgb = INK_SOFT) => { doc.setFontSize(sz); doc.setFont('helvetica', 'italic'); setColor(rgb); };

    const addPage = () => { doc.addPage(); y = 22; };
    const guard   = (mm) => { if (y + mm > PH - BOTTOM_SAFE) addPage(); };

    
    const wrap = (text, opts = {}) => {
      const { x = ML, width = CW, size = 10, lh, rgb = INK, weight = 'normal' } = opts;
      const lineH = lh || (size * 0.42 + 2.2);
      if (text == null || text === '') return;
      if (weight === 'bold') bold(size, rgb);
      else if (weight === 'italic') italic(size, rgb);
      else norm(size, rgb);
      const lines = doc.splitTextToSize(_san(String(text)), width);
      for (const line of lines) {
        guard(lineH + 1);
        doc.text(_san(line), x, y + size * 0.35);
        y += lineH;
      }
    };

    const section = (label) => {
      guard(18);
      y += 5;
      bold(9, INK_SOFT);
      doc.text(_san(String(label).toUpperCase()), ML, y + 3, { charSpace: 1.6 });
      y += 5;
      setStroke(RULE); doc.setLineWidth(0.4);
      doc.line(ML, y, PW - MR, y);
      y += 7;
    };

    // ── HEADER
    setFill(HEADER_BG);
    doc.rect(0, 0, PW, 32, 'F');
    bold(17, [255, 255, 255]);
    doc.text('AI Practice Interview Report', ML, 15);
    norm(9, [186, 200, 214]);
    const metaParts = ['iEvalx Hiring Platform', date, attemptId != null ? `Attempt #${attemptId}` : null].filter(Boolean);
    doc.text(_san(metaParts.join('   -   ')), ML, 24);
    y = 44;

    // ── SCORE CARD
    const cgps = _toCgps(score);
    const scDisp = cgps ?? 0;
    const scoreColor = scDisp >= 7 ? OK : scDisp >= 5 ? WARN : BAD;
    const CARD_H = 32;
    setFill(CARD_BG);
    doc.rect(ML, y, CW, CARD_H, 'F');
    setStroke(CARD_BORDER); doc.setLineWidth(0.3);
    doc.rect(ML, y, CW, CARD_H, 'S');

    norm(8, INK_MUTED);
    doc.text('OVERALL SCORE', ML + 9, y + 10, { charSpace: 1.4 });
    bold(30, scoreColor);
    const scoreText = cgps != null ? _fmtCgps(cgps) : '—';
    const scoreW = doc.getTextWidth(scoreText);
    doc.text(_san(scoreText), ML + 9, y + 25);
    norm(11, INK_SOFT);
    doc.text(' / 10', ML + 9 + scoreW, y + 25);

    if (verdict) {
      norm(8, INK_MUTED);
      const vLabel = 'VERDICT';
      const vLabelW = doc.getTextWidth(vLabel);
      doc.text(vLabel, PW - MR - 9 - vLabelW, y + 10, { charSpace: 1.4 });
      bold(13, ACCENT);
      const vw = doc.getTextWidth(String(verdict));
      doc.text(_san(String(verdict)), PW - MR - 9 - vw, y + 22);
    }
    y += CARD_H + 6;

    // ── SUMMARY
    if (summary) {
      section('Summary');
      wrap(summary, { size: 10, lh: 5.6, rgb: INK });
      y += 4;
    }

    // ── SKILLS
    if (skills && skills.length) {
      section('Skill Breakdown');
      skills.forEach((s) => {
        guard(28);
        const profC = _toCgps(s.proficiency);
        const rgb =
          s.level === 'strong'     ? OK :
          s.level === 'proficient' ? BLUE :
          s.level === 'developing' ? WARN :
          s.level === 'weak'       ? BAD :
          INK_MUTED;

        bold(11, INK);
        doc.text(_san(s.skill || ''), ML, y + 3);
        const rightLabel = profC != null
          ? `${_fmtCgps(profC)} / 10   ${(s.level || '').replace('_', ' ')}`
          : 'not covered';
        norm(9.5, rgb);
        const rw = doc.getTextWidth(rightLabel);
        doc.text(_san(rightLabel), PW - MR - rw, y + 3);
        y += 6;

        if (profC != null) {
          setFill(RULE); doc.rect(ML, y, CW, 2, 'F');
          setFill(rgb);  doc.rect(ML, y, CW * (profC / 10), 2, 'F');
          y += 5;
        }

        if (s.evidence && s.evidence.trim()) {
          wrap(`+  ${s.evidence.trim()}`, { size: 9, lh: 4.8, rgb: OK });
          y += 1;
        }
        if (s.gaps && s.gaps.trim()) {
          wrap(`–  ${s.gaps.trim()}`, { size: 9, lh: 4.8, rgb: WARN });
          y += 1;
        }
        y += 5;
      });
      y += 2;
    }

    // ── STRENGTHS
    if (strengths && strengths.length) {
      section('Strengths');
      strengths.forEach((s) => {
        guard(10);
        wrap(`+  ${s}`, { size: 10, lh: 5.4, rgb: OK });
        y += 2;
      });
      y += 3;
    }

    // ── WEAKNESSES
    if (weaknesses && weaknesses.length) {
      section('Areas to Improve');
      weaknesses.forEach((w) => {
        guard(10);
        wrap(`–  ${w}`, { size: 10, lh: 5.4, rgb: WARN });
        y += 2;
      });
      y += 3;
    }

    // ── TRANSCRIPT
    const txItems = (transcript || []).filter((x) => x.q);
    if (txItems.length) {
      section('Interview Transcript');
      txItems.forEach((x, i) => {
        guard(22);
        norm(8, INK_MUTED);
        const bits = [`Q${i + 1}`];
        if (x.type) bits.push(String(x.type).toUpperCase());
        if ((x.skills || []).length) bits.push(x.skills.join(', '));
        doc.text(_san(bits.join('   -   ')), ML, y + 3, { charSpace: 0.4 });
        y += 6;

        wrap(x.q, { size: 10.5, lh: 5.7, rgb: INK, weight: 'bold' });
        y += 3;

        const aText = (x.a && String(x.a).trim()) || '[no answer]';
        const answered = !!(x.a && String(x.a).trim());
        const PAD_X = 6, PAD_TOP = 4, PAD_BOT = 4;
        const LH = 5.2;
        const size = 9.5;

        if (answered) norm(size, INK);
        else italic(size, INK_MUTED);
        const lines = doc.splitTextToSize(_san(aText), CW - PAD_X * 2);
        const totalCardH_full = lines.length * LH + PAD_TOP + PAD_BOT;
        if (totalCardH_full > (PH - BOTTOM_SAFE - y) && lines.length && lines.length <= 6) {
          addPage();
        }

        let drawn = 0;
        while (drawn < lines.length) {
          const avail = PH - BOTTOM_SAFE - y;
          const canFit = Math.max(1, Math.floor((avail - PAD_TOP - PAD_BOT) / LH));
          if (canFit <= 0) { addPage(); continue; }
          const chunk = lines.slice(drawn, drawn + canFit);
          const cardH = chunk.length * LH + PAD_TOP + PAD_BOT;

          setFill(CARD_BG);
          doc.rect(ML, y, CW, cardH, 'F');
          setStroke(CARD_BORDER); doc.setLineWidth(0.2);
          doc.rect(ML, y, CW, cardH, 'S');
        
          setFill(answered ? BLUE : BAD);
          doc.rect(ML, y, 2.2, cardH, 'F');

          if (answered) norm(size, INK);
          else italic(size, INK_MUTED);
          let ty = y + PAD_TOP + size * 0.35;
          for (const line of chunk) {
            doc.text(_san(line), ML + PAD_X, ty);
            ty += LH;
          }
          y += cardH;

          drawn += chunk.length;
          if (drawn < lines.length) addPage();
        }
        y += 7;
      });
    }

    // ── FOOTER on every page
    const pages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= pages; p++) {
      doc.setPage(p);
      setStroke(RULE); doc.setLineWidth(0.2);
      doc.line(ML, PH - 14, PW - MR, PH - 14);
      norm(8, INK_MUTED);
      doc.text('iEvalx Hiring Platform  -  AI Practice Interview Report', ML, PH - 8);
      doc.text(`Page ${p} of ${pages}`, PW - MR, PH - 8, { align: 'right' });
    }

    const filename = `iEvalx-Interview-Report${attemptId != null ? `-${attemptId}` : ''}.pdf`;
    return { doc, filename };
  } catch (err) {
    console.error('[iEvalx] PDF generation failed:', err);
    return null;
  }
};

/* Save the built PDF to the user's device. */
const _generatePDF = async (data) => {
  try {
    const built = await _buildPDF(data);
    if (!built) return;
    built.doc.save(built.filename);
  } catch (err) { console.error('[iEvalx] PDF save failed:', err); }
};
const _previewPDF = async (data) => {
  try {
    const built = await _buildPDF(data);
    if (!built) return null;
    const url = built.doc.output('bloburl');
    return { url: String(url), filename: built.filename };
  } catch (err) {
    console.error('[iEvalx] PDF preview failed:', err);
    return null;
  }
};


const _PDFPreviewDialog = ({ open, onClose, data, titleSuffix }) => {
  const [urlInfo, setUrlInfo] = useState(null);   // { url, filename } | null
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!open || !data) return undefined;

    let cancelled = false;
    let builtRef  = null;
    setError(null);
    setUrlInfo(null);
    _previewPDF(data).then((built) => {
      if (cancelled) {
        if (built) { try { URL.revokeObjectURL(built.url); } catch { /* noop */ } }
        return;
      }
      if (!built) { setError('Could not build the PDF preview.'); return; }
      builtRef = built;
      setUrlInfo(built);
    });
    return () => {
      cancelled = true;
      if (builtRef) { try { URL.revokeObjectURL(builtRef.url); } catch { /* noop */ } }
      setUrlInfo(null);
    };
  }, [open, data]);

  const handleDownload = () => {
    if (!data) return;
    _generatePDF(data);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      slotProps={{
        backdrop: { sx: { bgcolor: 'rgba(2,33,36,0.55)', backdropFilter: 'blur(6px)' } },
        paper: {
          sx: {
            borderRadius: '18px',
            border: `1px solid ${BORDER}`,
            overflow: 'hidden',
            bgcolor: '#F6F8F3',
            height: { xs: '100vh', md: '90vh' },
            m: { xs: 0, md: 2 },
            boxShadow: SHADOW_XL,
          },
        },
      }}
    >
      {/* Header — matches HistoryDetailView command bar */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        alignItems: 'center', columnGap: 1.5,
        px: { xs: 2, md: 2.5 }, py: 1.5,
        bgcolor: '#FFFFFF', borderBottom: `1px solid ${BORDER}`,
      }}>
        <Box sx={{
          width: 34, height: 34, borderRadius: '9px',
          bgcolor: NAVY, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <VisibilityOutlined sx={{ fontSize: 18 }} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: '0.95rem', fontWeight: 800, color: NAVY, lineHeight: 1.2, letterSpacing: '-0.01em' }}>
            Report preview
          </Typography>
          <Typography noWrap sx={{ fontSize: '0.75rem', color: MUTED, mt: 0.15 }}>
            {titleSuffix || (urlInfo?.filename ?? 'iEvalx Interview Report')}
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          size="small"
          aria-label="Close preview"
          sx={{
            width: 34, height: 34, borderRadius: '9px',
            color: MUTED, border: `1px solid #D8DDD4`, bgcolor: '#FFFFFF',
            '&:hover': { bgcolor: '#EDF3EC', color: NAVY, borderColor: '#7F9E7E' },
          }}
        >
          <CloseRounded sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      {/* Body — cream frame around the rendered PDF */}
      <DialogContent sx={{ p: 0, bgcolor: '#F6F8F3', display: 'flex', flexDirection: 'column' }}>
        {error && (
          <Alert severity="error" sx={{ m: 2, borderRadius: '10px' }}>{error}</Alert>
        )}
        {!error && !urlInfo && (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1.5, py: 8 }}>
            <CircularProgress sx={{ color: NAVY }} size={30} thickness={3.5} />
            <Typography sx={{ fontSize: '0.85rem', color: MUTED, fontWeight: 500 }}>Rendering report…</Typography>
          </Box>
        )}
        {urlInfo && !error && (
          <Box sx={{ flex: 1, position: 'relative', bgcolor: '#F6F8F3', p: { xs: 0, md: 1.5 } }}>
            <Box
              component="iframe"
              src={`${urlInfo.url}#toolbar=1&navpanes=0&view=FitH`}
              title="Interview report preview"
              sx={{
                display: 'block',
                width: '100%', height: '100%',
                border: `1px solid ${BORDER}`,
                borderRadius: { xs: 0, md: '10px' },
                bgcolor: '#FFFFFF',
                boxShadow: { xs: 'none', md: SHADOW_CARD },
              }}
            />
          </Box>
        )}
      </DialogContent>

      {/* Footer — Close + Download */}
      <DialogActions sx={{
        px: { xs: 2, md: 2.5 }, py: 1.5,
        bgcolor: '#FFFFFF', borderTop: `1px solid ${BORDER}`, gap: 1,
      }}>
        <Button
          onClick={onClose}
          sx={{
            textTransform: 'none', fontWeight: 600, color: MUTED,
            border: `1px solid #D8DDD4`, borderRadius: '9px',
            fontSize: '0.82rem', px: 2, height: 36, bgcolor: '#FFFFFF',
            '&:hover': { bgcolor: '#EDF3EC', color: NAVY, borderColor: '#7F9E7E' },
          }}
        >
          Close
        </Button>
        <Button
          onClick={handleDownload}
          disabled={!urlInfo}
          variant="contained"
          disableElevation
          startIcon={<FileDownloadOutlined sx={{ fontSize: 17 }} />}
          sx={{
            bgcolor: NAVY, color: '#fff', textTransform: 'none',
            fontWeight: 700, fontSize: '0.82rem', borderRadius: '999px',
            px: 2.25, height: 36,
            boxShadow: '0 2px 8px rgba(2,33,36,0.22)',
            '&:hover': { bgcolor: '#7F9E7E', boxShadow: '0 4px 12px rgba(127,158,126,0.4)' },
            '&.Mui-disabled': { bgcolor: `${NAVY}66`, color: '#fff' },
          }}
        >
          Download PDF
        </Button>
      </DialogActions>
    </Dialog>
  );
};

/* ════════════════════════════════════════════════════════════════════════
   CompleteView
   ════════════════════════════════════════════════════════════════════════ */
export const CompleteView = ({ ctx }) => {
  const { report, qas, attemptId, config, restart } = ctx;
  const [previewOpen, setPreviewOpen] = useState(false);

  const answered = qas.filter((x) => x.a).length;
  const skills = (report?.skills || []).filter(
    (s) => s.source === 'answered' && s.proficiency != null
  );
  const sortedSkills = [...skills].sort((a, b) => (b.proficiency ?? -1) - (a.proficiency ?? -1));
  const txItems = qas.filter((x) => x.q);

  /* Single source of truth for Preview and Download. */
  const pdfData = {
    score:      report?.overall_score,
    verdict:    report?.verdict,
    summary:    report?.summary,
    skills:     sortedSkills,
    strengths:  report?.strengths  || [],
    weaknesses: report?.weaknesses || [],
    transcript: txItems.map((x) => ({ q: x.q, a: x.a, type: x.type, skills: x.skills })),
    attemptId,
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  };

  return (
    <Stack spacing={2.5}>
      {/* ── Score hero — ring gauge | verdict + summary (CGPS 0–10) ──── */}
      <Box sx={{ borderRadius: '18px', border: `1px solid ${BORDER}`, bgcolor: '#FFFFFF', boxShadow: SHADOW_CARD, overflow: 'hidden' }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '170px 1fr' }, alignItems: 'stretch' }}>
          <Box sx={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
            py: { xs: 2.5, sm: 3 }, px: 2, bgcolor: '#FBFCFA',
            borderBottom: { xs: `1px solid ${BORDER}`, sm: 'none' },
            borderRight:  { xs: 'none', sm: `1px solid ${BORDER}` },
          }}>
            <_ScoreRing raw={report?.overall_score} size={118} />
            <Typography sx={{ fontSize: '0.62rem', fontWeight: 800, color: MUTED, letterSpacing: '0.12em' }}>
              OVERALL SCORE
            </Typography>
          </Box>
          <Box sx={{ p: { xs: 2.25, sm: 2.75 }, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            {report?.verdict && (
              <Typography sx={{ fontSize: { xs: '1.1rem', sm: '1.2rem' }, fontWeight: 800, color: NAVY, letterSpacing: '-0.015em', lineHeight: 1.3 }}>
                {report.verdict}
              </Typography>
            )}
            {report?.summary && (
              <Typography sx={{ fontSize: '0.87rem', color: TEXT_DIM, lineHeight: 1.65, mt: report?.verdict ? 0.75 : 0 }}>
                {report.summary}
              </Typography>
            )}
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 'auto', pt: 1.75 }}>
              {attemptId && (
                <Typography sx={{ fontSize: '0.78rem', color: NAVY, fontWeight: 700 }}>
                  Attempt #{attemptId}
                </Typography>
              )}
              <Stack direction="row" spacing={0.5} alignItems="center">
                <QuizOutlined sx={{ fontSize: 15, color: '#7A7E76' }} />
                <Typography sx={{ fontSize: '0.78rem', color: MUTED, fontWeight: 500 }}>
                  {answered}/{qas.length} answered
                </Typography>
              </Stack>
              <Typography sx={{ fontSize: '0.78rem', color: '#7A7E76', fontWeight: 500 }}>
                CGPS scale · 0–10
              </Typography>
            </Stack>
          </Box>
        </Box>
      </Box>

      {sortedSkills.length > 0 && (
        <Box sx={{ p: 2.5, borderRadius: '16px', border: `1px solid ${BORDER}`, bgcolor: '#FFFFFF', boxShadow: SHADOW_CARD }}>
          <SectionTitle icon={BuildOutlined} label="Skill breakdown" hint="Skills directly asked about in this interview" />
          <_SkillRows skills={sortedSkills} />
        </Box>
      )}

      <_ProsConsGrid strengths={report?.strengths || []} weaknesses={report?.weaknesses || []} />

      {txItems.length > 0 && (
        <Box sx={{ p: 2.5, borderRadius: '16px', border: `1px solid ${BORDER}`, bgcolor: '#FFFFFF', boxShadow: SHADOW_CARD }}>
          <SectionTitle icon={DescriptionOutlined} label="Transcript" />
          <_TranscriptList items={txItems} />
        </Box>
      )}

      <Stack direction="row" spacing={1.5} justifyContent="center" flexWrap="wrap" useFlexGap>
        <Button
          variant="outlined"
          startIcon={<VisibilityOutlined />}
          onClick={() => setPreviewOpen(true)}
          sx={{
            borderColor: `${NAVY}40`, color: NAVY, textTransform: 'none',
            fontWeight: 700, px: 3, py: 1.15, borderRadius: '12px',
            bgcolor: '#FFFFFF', boxShadow: SHADOW_SM,
            '&:hover': { borderColor: NAVY, bgcolor: NAVY_SOFTER, boxShadow: SHADOW_MD, transform: 'translateY(-1px)' },
            transition: 'all 180ms ease',
          }}
        >
          Preview
        </Button>

        {/* 🔧 CHANGE 3/4 — Download PDF button */}
        <Button
          variant="outlined"
          startIcon={<FileDownloadOutlined />}
          onClick={() => _generatePDF(pdfData)}
          sx={{
            borderColor: `${NAVY}40`, color: NAVY, textTransform: 'none',
            fontWeight: 700, px: 3, py: 1.15, borderRadius: '12px',
            bgcolor: '#FFFFFF', boxShadow: SHADOW_SM,
            '&:hover': { borderColor: NAVY, bgcolor: NAVY_SOFTER, boxShadow: SHADOW_MD, transform: 'translateY(-1px)' },
            transition: 'all 180ms ease',
          }}
        >
          Download PDF
        </Button>

        <Button
          variant="contained"
          startIcon={<RestartAltOutlined />}
          onClick={restart}
          sx={{
            bgcolor: NAVY, color: '#FFFFFF', textTransform: 'none',
            fontWeight: 700, px: 3.5, py: 1.15, borderRadius: '12px', boxShadow: SHADOW_MD,
            '&:hover': { bgcolor: NAVY_MID, boxShadow: SHADOW_LG, transform: 'translateY(-1px)' },
            transition: 'all 180ms ease',
          }}
        >
          {config.copy?.replayCta || 'Practice again'}
        </Button>
      </Stack>

      {/* ── PDF Preview modal ──────────────────────────────────────────── */}
      <_PDFPreviewDialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        data={pdfData}
        titleSuffix={attemptId ? `Attempt #${attemptId}` : 'Interview report'}
      />
    </Stack>
  );
};

// ============================================================================
// 🔧 CHANGE 2/3 — History helpers (module-level, not exported)
// ============================================================================
const _fmtDuration = (secs) => {
  if (!secs || secs <= 0) return null;
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
};

const _fmtDate = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch { return '—'; }
};

const _toCgps = (raw) => {
  if (raw == null) return null;
  const n = Number(raw);
  if (Number.isNaN(n)) return null;
  const v = n > 10 ? n / 10 : n;
  return Math.round(Math.min(Math.max(v, 0), 10) * 10) / 10;   // 1 dp, clamped 0–10
};
const _fmtCgps = (v) =>
  v == null ? '—' : (Number.isInteger(v) ? String(v) : v.toFixed(1));

/* Score → colour, on the CGPS 0–10 scale (was 70/50 on the raw scale). */
const _scoreColor = (score) => {
  const c = _toCgps(score);
  if (c == null) return MUTED;
  if (c >= 7) return SUCCESS;
  if (c >= 5) return WARN;
  return DANGER;
};


const _ScoreRing = ({ raw, size = 118, stroke = 8 }) => {
  const cgps = _toCgps(raw);
  const sc   = _scoreColor(raw);
  const R    = (size - stroke) / 2 - 2;
  const CIRC = 2 * Math.PI * R;
  const pct  = cgps != null ? cgps / 10 : 0;
  return (
    <Box sx={{ width: size, height: size, position: 'relative', flexShrink: 0 }}>
      <Box component="svg" viewBox={`0 0 ${size} ${size}`} sx={{ width: '100%', height: '100%', transform: 'rotate(-90deg)', overflow: 'visible' }}>
        <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke={BORDER} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={R} fill="none"
          stroke={sc} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 600ms cubic-bezier(0.22,1,0.36,1)' }}
        />
      </Box>
      <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <Typography sx={{ fontSize: size >= 110 ? '2rem' : '1.5rem', fontWeight: 800, color: sc, lineHeight: 1, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
          {_fmtCgps(cgps)}
        </Typography>
        <Typography sx={{ fontSize: '0.56rem', fontWeight: 800, color: cgps != null ? sc : MUTED, letterSpacing: '0.16em', mt: 0.4, fontFamily: "'JetBrains Mono','SFMono-Regular',monospace" }}>
          / 10
        </Typography>
      </Box>
    </Box>
  );
};


const _SkillRows = ({ skills }) => (
  <Stack spacing={0}>
    {skills.map((s) => {
      const color    = LEVEL_COLOR[s.level] || MUTED;
      const cgps     = _toCgps(s.proficiency);
      const barPct   = cgps != null ? cgps * 10 : 0;
      const showEvid = (s.evidence?.length > 0) || (s.gaps?.length > 0);
      return (
        <Accordion
          key={s.skill}
          disableGutters elevation={0}
          sx={{ bgcolor: 'transparent', borderBottom: `1px solid ${BORDER}`, '&:before': { display: 'none' }, '&:last-of-type': { borderBottom: 'none' } }}
        >
          <AccordionSummary
            expandIcon={showEvid ? <ExpandMoreRounded sx={{ color: MUTED }} /> : <Box sx={{ width: 24 }} />}
            sx={{ px: 0, minHeight: 48, '& .MuiAccordionSummary-content': { my: 1 } }}
          >
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'minmax(0,1fr) 44px', sm: 'minmax(120px, 0.9fr) minmax(0, 1.4fr) 44px 96px' },
              alignItems: 'center',
              columnGap: { xs: 1, sm: 2 },
              rowGap: 0.75,
              width: '100%', pr: 1,
            }}>
              <Typography noWrap sx={{ fontSize: '0.88rem', fontWeight: 600, color: NAVY }}>
                {s.skill}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={barPct}
                sx={{
                  height: 8, borderRadius: 4, bgcolor: BORDER,
                  order: { xs: 3, sm: 0 },
                  gridColumn: { xs: '1 / -1', sm: 'auto' },
                  '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 4 },
                }}
              />
              <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {_fmtCgps(cgps)}
              </Typography>
              <Chip
                size="small"
                label={(s.level || 'unknown').replace('_', ' ')}
                sx={{
                  bgcolor: `${color}18`, color, fontWeight: 700, height: 22,
                  fontSize: '0.66rem', letterSpacing: '0.03em', justifySelf: 'end',
                  display: { xs: 'none', sm: 'inline-flex' },
                  '& .MuiChip-label': { px: 1 },
                }}
              />
            </Box>
          </AccordionSummary>
          {showEvid && (
            <AccordionDetails sx={{ px: 0, pt: 0, pb: 1.5 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.5 }}>
                {s.evidence && (
                  <Box sx={{ borderLeft: `2.5px solid ${SUCCESS}`, pl: 1.5 }}>
                    <Typography sx={{ fontSize: '0.68rem', color: SUCCESS, fontWeight: 800, letterSpacing: '0.08em', mb: 0.4 }}>WHAT WENT WELL</Typography>
                    <Typography sx={{ fontSize: '0.82rem', color: TEXT_DIM, lineHeight: 1.6 }}>{s.evidence}</Typography>
                  </Box>
                )}
                {s.gaps && (
                  <Box sx={{ borderLeft: `2.5px solid ${WARN}`, pl: 1.5 }}>
                    <Typography sx={{ fontSize: '0.68rem', color: WARN, fontWeight: 800, letterSpacing: '0.08em', mb: 0.4 }}>GAPS</Typography>
                    <Typography sx={{ fontSize: '0.82rem', color: TEXT_DIM, lineHeight: 1.6 }}>{s.gaps}</Typography>
                  </Box>
                )}
              </Box>
            </AccordionDetails>
          )}
        </Accordion>
      );
    })}
  </Stack>
);

/* Strengths / Areas — equal-width, equal-height pair via CSS grid. */
const _ProsConsGrid = ({ strengths = [], weaknesses = [] }) => {
  if (!strengths.length && !weaknesses.length) return null;
  const both = strengths.length > 0 && weaknesses.length > 0;
  return (
    <Box sx={{
      display: 'grid',
      gridTemplateColumns: { xs: '1fr', md: both ? '1fr 1fr' : '1fr' },
      gap: 2, alignItems: 'stretch',
    }}>
      {strengths.length > 0 && (
        <Box sx={{ p: 2.5, borderRadius: '16px', border: `1px solid ${BORDER}`, bgcolor: '#FFFFFF', boxShadow: SHADOW_CARD, display: 'flex', flexDirection: 'column' }}>
          <SectionTitle icon={CheckCircleOutlined} label="Strengths" />
          <Stack spacing={1}>
            {strengths.map((s, i) => (
              <Box key={i} sx={{ display: 'grid', gridTemplateColumns: '14px 1fr', columnGap: 1, alignItems: 'start' }}>
                <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: SUCCESS, mt: '7px', justifySelf: 'center' }} />
                <Typography sx={{ fontSize: '0.86rem', color: TEXT_DIM, lineHeight: 1.6 }}>{s}</Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      )}
      {weaknesses.length > 0 && (
        <Box sx={{ p: 2.5, borderRadius: '16px', border: `1px solid ${BORDER}`, bgcolor: '#FFFFFF', boxShadow: SHADOW_CARD, display: 'flex', flexDirection: 'column' }}>
          <SectionTitle icon={TipsAndUpdatesOutlined} label="Areas to improve" />
          <Stack spacing={1}>
            {weaknesses.map((w, i) => (
              <Box key={i} sx={{ display: 'grid', gridTemplateColumns: '14px 1fr', columnGap: 1, alignItems: 'start' }}>
                <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: WARN, mt: '7px', justifySelf: 'center' }} />
                <Typography sx={{ fontSize: '0.86rem', color: TEXT_DIM, lineHeight: 1.6 }}>{w}</Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  );
};


const _TranscriptList = ({ items }) => (
  <Stack spacing={2}>
    {items.map((x, i) => (
      <Box key={i} sx={{ display: 'grid', gridTemplateColumns: '38px 1fr', columnGap: 1.5 }}>
        {/* Rail: number badge + hairline that spans the entry */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Box sx={{
            width: 30, height: 30, borderRadius: '9px', flexShrink: 0,
            bgcolor: NAVY, color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.72rem', fontWeight: 800, fontFamily: "'Jost','DM Sans',sans-serif",
          }}>
            Q{i + 1}
          </Box>
          {i < items.length - 1 && (
            <Box sx={{ width: '2px', flex: 1, bgcolor: BORDER, mt: 1, borderRadius: 1 }} />
          )}
        </Box>
        {/* Entry */}
        <Box sx={{ minWidth: 0, pb: i < items.length - 1 ? 0.5 : 0 }}>
          <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 0.6, minHeight: 30 }}>
            {x.type && (
              <Chip size="small" label={x.type.toUpperCase()} sx={{ bgcolor: 'transparent', color: MUTED, fontWeight: 700, height: 20, fontSize: '0.62rem', letterSpacing: '0.05em', border: `1px solid ${BORDER}` }} />
            )}
            {(x.skills || []).map((k) => (
              <Chip key={k} size="small" label={k} sx={{ bgcolor: '#EDF3EC', color: '#5E815D', fontWeight: 700, height: 20, fontSize: '0.66rem' }} />
            ))}
          </Stack>
          <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: NAVY, lineHeight: 1.5 }}>
            {x.q}
          </Typography>
          <Box sx={{
            mt: 0.75, px: 1.5, py: 1.1, borderRadius: '10px',
            bgcolor: x.a ? '#F6F8F3' : '#FFFFFF',
            border: `1px ${x.a ? 'solid' : 'dashed'} ${BORDER}`,
          }}>
            <Typography sx={{ fontSize: '0.84rem', color: x.a ? TEXT_DIM : MUTED, lineHeight: 1.6, fontStyle: x.a ? 'normal' : 'italic' }}>
              {x.a || 'No answer recorded'}
            </Typography>
          </Box>
        </Box>
      </Box>
    ))}
  </Stack>
);

const HISTORY_PAGE_SIZE_OPTIONS = [5, 10, 25, 50, 'all'];  // FindJobs values
const HISTORY_DEFAULT_PAGE_SIZE = 10;

export const HistoryListView = ({ ctx }) => {
  const { attempts, loading, error, onView, onClose, onDelete, onRefresh } = ctx;

  /* ── FindJobs card palette (verbatim from FindJobs/JobCard.jsx) ── */
  const C = {
    pine: '#022124', pineDark: '#0A3A38',
    sage: '#7F9E7E', sageText: '#5E815D', sageSoft: '#EDF3EC',
    ink: '#101210', inkSoft: '#2F332E',
    surface: '#FFFFFF', page: '#F6F8F3',
    border: '#E7EAE3', borderStrong: '#D8DDD4',
    muted: '#55584F', faint: '#7A7E76',
    chipBg: '#EDF3EC',
    applied: '#3E6E3E', appliedSoft: '#EAF2E9', appliedBdr: 'rgba(127,158,126,0.45)',
    amber: '#A35A2D', amberSoft: '#FBF0E7',
  };
  const FJ_FONT = "'Jost','DM Sans',sans-serif";

  // ── UI-local state (hooks declared unconditionally, before any early return) ──
  const [selectedIds,   setSelectedIds]   = useState([]);
  const [page,          setPage]          = useState(1);
  const [pendingDelete, setPendingDelete] = useState(null);  // id[] awaiting confirm | null
  const [deleting,      setDeleting]      = useState(false);
  const [deleteError,   setDeleteError]   = useState(null);
  // 🔧 FindJobs-style controls
  const [searchQuery,   setSearchQuery]   = useState('');
  const [statusFilter,  setStatusFilter]  = useState('all');   // all | completed | other
  const [sortBy,        setSortBy]        = useState('newest'); // newest | oldest | score_high | score_low
  const [viewMode,      setViewMode]      = useState('grid');   // grid | list
  const [pageSize,      setPageSize]      = useState(HISTORY_DEFAULT_PAGE_SIZE); // FindJobs page-size selector

  const rawList = Array.isArray(attempts) ? attempts : [];

  /* ── Filter → search → sort pipeline (FindJobs pattern) ── */
  const list = useMemo(() => {
    let out = rawList;
    if (statusFilter === 'completed') out = out.filter((a) => a.status === 'completed');
    if (statusFilter === 'other')     out = out.filter((a) => a.status !== 'completed');
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      out = out.filter((a) => {
        const hay = [
          `attempt #${a.attempt_id}`, String(a.attempt_id),
          a.verdict || '',
          ...(a.skill_scores || []).map((s) => s.skill || ''),
        ].join(' ').toLowerCase();
        return hay.includes(q);
      });
    }
    const score = (a) => (a.overall_score != null ? a.overall_score : -1);
    const time  = (a) => new Date(a.created_at || 0).getTime();
    out = [...out];
    if (sortBy === 'newest')     out.sort((a, b) => time(b) - time(a));
    if (sortBy === 'oldest')     out.sort((a, b) => time(a) - time(b));
    if (sortBy === 'score_high') out.sort((a, b) => score(b) - score(a));
    if (sortBy === 'score_low')  out.sort((a, b) => score(a) - score(b));
    return out;
  }, [rawList, statusFilter, searchQuery, sortBy]);

  const total       = list.length;
  const allCount       = rawList.length;
  const completedCount = rawList.filter((a) => a.status === 'completed').length;
  const otherCount     = allCount - completedCount;
  const effectivePageSize = pageSize === 'all' ? Math.max(total, 1) : pageSize;
  const pageCount   = Math.max(1, Math.ceil(total / effectivePageSize));

  // Clamp the current page if the list shrinks (deletion / filter change).
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);
  useEffect(() => { setPage(1); }, [statusFilter, searchQuery, sortBy, pageSize]);

  // Drop any selected ids that no longer exist (after delete / reload).
  useEffect(() => {
    setSelectedIds((prev) => {
      const valid = prev.filter((id) => rawList.some((a) => a.attempt_id === id));
      return valid.length === prev.length ? prev : valid;
    });
  }, [attempts]); // eslint-disable-line react-hooks/exhaustive-deps

  const safePage  = Math.min(page, pageCount);
  const pageStart = (safePage - 1) * effectivePageSize;
  const pageItems = list.slice(pageStart, pageStart + effectivePageSize);

  const allIds       = useMemo(() => list.map((a) => a.attempt_id), [list]);
  const allSelected  = total > 0 && selectedIds.length === total && allIds.every((id) => selectedIds.includes(id));
  const someSelected = selectedIds.length > 0 && !allSelected;
  const isSelected   = (id) => selectedIds.includes(id);

  const toggleOne = (id) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleAll     = () => setSelectedIds(allSelected ? [] : allIds);
  const clearSelection = () => setSelectedIds([]);

  const askDeleteOne      = (id) => { setDeleteError(null); setPendingDelete([id]); };
  const askDeleteSelected = () => { if (selectedIds.length) { setDeleteError(null); setPendingDelete([...selectedIds]); } };
  const cancelDelete      = () => { if (!deleting) { setPendingDelete(null); setDeleteError(null); } };

  const confirmDelete = async () => {
    if (!pendingDelete || !pendingDelete.length) return;
    setDeleting(true);
    setDeleteError(null);
    const res = onDelete
      ? await onDelete(pendingDelete)
      : { ok: false, error: 'Delete is not available.' };
    setDeleting(false);
    if (res?.ok) {
      setSelectedIds((prev) => prev.filter((id) => !pendingDelete.includes(id)));
      setPendingDelete(null);
    } else {
      setDeleteError(res?.error || 'Could not delete. Please try again.');
    }
  };

  const pendingCount = pendingDelete?.length || 0;

  const STATUS_PILLS = [
    { value: 'all',       label: 'All',        count: allCount },
    { value: 'completed', label: 'Completed',  count: completedCount },
    { value: 'other',     label: 'Incomplete', count: otherCount },
  ];
  const SORT_OPTS = [
    { value: 'newest',     label: 'Newest first' },
    { value: 'oldest',     label: 'Oldest first' },
    { value: 'score_high', label: 'Highest score' },
    { value: 'score_low',  label: 'Lowest score' },
  ];

  // ── early returns (after hooks, so hook order stays stable) ──
  if (loading) return (
    <Box sx={{ py: 10, textAlign: 'center' }}>
      <CircularProgress sx={{ color: NAVY }} size={36} thickness={3.5} />
      <Typography sx={{ mt: 2, color: MUTED, fontSize: '0.85rem' }}>Loading history…</Typography>
    </Box>
  );

  if (error) return (
    <Alert severity="error" sx={{ borderRadius: '12px' }}>{error}</Alert>
  );

  if (!allCount) return (
    <Box sx={{ py: 10, textAlign: 'center' }}>
      <Box sx={{
        width: 60, height: 60, borderRadius: '16px', bgcolor: NAVY_SOFT,
        mx: 'auto', mb: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <HistoryOutlined sx={{ fontSize: 30, color: NAVY }} />
      </Box>
      <Typography sx={{ fontWeight: 800, color: NAVY, fontSize: '1.05rem', mb: 0.5 }}>
        No past attempts yet
      </Typography>
      <Typography sx={{ color: TEXT_DIM, fontSize: '0.85rem', maxWidth: 340, mx: 'auto', lineHeight: 1.6 }}>
        Complete your first practice interview to see your history here.
      </Typography>
      <Button
        onClick={onClose}
        variant="outlined"
        sx={{
          mt: 3, textTransform: 'none', fontWeight: 700, borderRadius: '10px',
          borderColor: `${NAVY}40`, color: NAVY, px: 3, py: 1,
          '&:hover': { borderColor: NAVY, bgcolor: NAVY_SOFTER },
        }}
      >
        Back to interview
      </Button>
    </Box>
  );

  /* ── JobCard-style building blocks ────────────────────────────────── */


  const ScoreAvatar = ({ att, size = 42 }) => {
    const cgps = _toCgps(att.overall_score);
    const sc = _scoreColor(att.overall_score);
    return (
      <Box sx={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0,
        bgcolor: `${sc}12`, border: `2px solid ${sc}35`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <Typography sx={{ fontSize: size >= 42 ? '0.95rem' : '0.82rem', fontWeight: 800, color: sc, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
          {_fmtCgps(cgps)}
        </Typography>
      </Box>
    );
  };

  /* Top-right action icons — the analog of JobCard's bookmark + eye */
  const ActionIcons = ({ att, compact = false }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexShrink: 0 }}>
      <Tooltip title="View report" arrow>
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); onView(att.attempt_id); }}
          sx={{ color: C.faint, '&:hover': { bgcolor: C.sageSoft, color: C.pine } }}>
          <Visibility sx={{ fontSize: compact ? 17 : 19 }} />
        </IconButton>
      </Tooltip>
      <Tooltip title="Delete attempt" arrow>
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); askDeleteOne(att.attempt_id); }}
          sx={{ color: C.faint, '&:hover': { bgcolor: `${DANGER}0A`, color: DANGER } }}>
          <DeleteOutlineOutlined sx={{ fontSize: compact ? 17 : 19 }} />
        </IconButton>
      </Tooltip>
    </Box>
  );

  /* Status pill — analog of JobCard's Applied pill */
  const StatusPill = ({ att, height = 34 }) => (
    att.status === 'completed' ? (
      <Box sx={{
        display: 'inline-flex', alignItems: 'center', gap: 0.5, flexShrink: 0,
        bgcolor: C.appliedSoft, color: C.applied, border: `1px solid ${C.appliedBdr}`,
        borderRadius: '999px', px: 1.6, height, fontSize: '0.76rem', fontWeight: 700,
        whiteSpace: 'nowrap',
      }}>
        <CheckCircle sx={{ fontSize: 15 }} />Completed
      </Box>
    ) : (
      <Box sx={{
        display: 'inline-flex', alignItems: 'center', gap: 0.5, flexShrink: 0,
        bgcolor: C.amberSoft, color: C.amber, borderRadius: '999px', px: 1.6, height,
        fontSize: '0.76rem', fontWeight: 600, whiteSpace: 'nowrap',
      }}>
        <Schedule sx={{ fontSize: 15 }} />{att.status || 'Incomplete'}
      </Box>
    )
  );

  const attemptMeta = (att) => {
    const dur = _fmtDuration(att.duration_seconds);
    return {
      date: _fmtDate(att.created_at),
      dur,
      questions: att.answered_count != null ? `${att.answered_count}/${att.total_questions ?? '?'} questions` : null,
      answeredSkills: (att.skill_scores || []).filter(
        (sk) => sk.source !== 'inferred' && sk.source !== 'not_covered' && sk.proficiency != null
      ),
    };
  };

  const GridCard = ({ att }) => {
    const m         = attemptMeta(att);
    const topSkills = m.answeredSkills.slice(0, 3);
    const extra     = m.answeredSkills.length - 3;
    const selected  = isSelected(att.attempt_id);
    const cgps    = _toCgps(att.overall_score);
    const sc      = _scoreColor(att.overall_score);
    const R       = 40;
    const CIRC    = 2 * Math.PI * R;                       // ≈ 251.33
    const pct     = cgps != null ? cgps / 10 : 0;
    const dashOff = CIRC * (1 - pct);

    return (
      <Card onClick={() => onView(att.attempt_id)} elevation={0} sx={{
        position: 'relative', cursor: 'pointer', height: '100%',
        display: 'flex', flexDirection: 'column',
        borderRadius: '18px',
        bgcolor: selected ? C.sageSoft : C.surface,
        overflow: 'hidden',
        border: `1px solid ${selected ? C.sage : C.border}`,
        fontFamily: FJ_FONT,
        '& .MuiTypography-root, & .MuiButton-root': { fontFamily: FJ_FONT },
        boxShadow: '0 10px 26px rgba(2,33,36,0.06)',
        transition: 'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 22px 48px -18px rgba(2,33,36,0.16)',
          borderColor: C.sage,
        },
      }}>
        {/* Corner controls: selection top-left, view/delete top-right */}
        <Box onClick={(e) => e.stopPropagation()} sx={{
          position: 'absolute', top: 10, left: 12, zIndex: 2,
        }}>
          <Checkbox
            checked={selected}
            onChange={() => toggleOne(att.attempt_id)}
            size="small"
            sx={{ p: 0.25, color: C.faint, '&.Mui-checked': { color: C.pine } }}
            slotProps={{ input: { 'aria-label': `Select attempt ${att.attempt_id}` } }}
          />
        </Box>
        <Box onClick={(e) => e.stopPropagation()} sx={{
          position: 'absolute', top: 10, right: 8, zIndex: 2,
          display: 'flex', alignItems: 'center', gap: 0.25,
        }}>
          <ActionIcons att={att} />
        </Box>

        <Box sx={{ px: 2.25, pt: 2.25, pb: 2, display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>

          {/* ── Ring Gauge ────────────────────────────────────────── */}
          <Box sx={{
            width: 96, height: 96, mx: 'auto', mt: 0.5, position: 'relative',
          }}>
            <Box component="svg" viewBox="0 0 96 96" sx={{
              width: '100%', height: '100%',
              transform: 'rotate(-90deg)',
              overflow: 'visible',
            }}>
              {/* Track */}
              <circle cx="48" cy="48" r={R} fill="none" stroke={C.border} strokeWidth="7" />
              {/* Filled arc — colored by score */}
              <circle
                cx="48" cy="48" r={R} fill="none"
                stroke={sc}
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={CIRC}
                strokeDashoffset={dashOff}
                style={{ transition: 'stroke-dashoffset 600ms cubic-bezier(0.22,1,0.36,1)' }}
              />
            </Box>
            {/* Number + "SCORE" caption sit centered inside the ring */}
            <Box sx={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Typography sx={{
                fontSize: '1.55rem', fontWeight: 800, color: sc,
                lineHeight: 1, letterSpacing: '-0.02em',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {_fmtCgps(cgps)}
              </Typography>
              <Typography sx={{
                fontSize: '0.5rem', fontWeight: 800,
                color: cgps != null ? sc : C.faint,
                letterSpacing: '0.14em', mt: 0.25,
                fontFamily: "'JetBrains Mono','SFMono-Regular',monospace",
              }}>
                / 10
              </Typography>
            </Box>
          </Box>

          {/* ── Title + Date (centered) ───────────────────────────── */}
          <Typography sx={{
            textAlign: 'center', mt: 1.5,
            fontSize: '1.02rem', fontWeight: 800, color: C.ink,
            letterSpacing: '-0.015em', lineHeight: 1.2,
          }}>
            Attempt #{att.attempt_id}
          </Typography>
          <Typography sx={{
            textAlign: 'center', mt: 0.25,
            fontSize: '0.72rem', color: C.muted, fontWeight: 500,
          }}>
            {m.date}
          </Typography>

          {/* ── Skill chips (centered) ────────────────────────────── */}
          {topSkills.length > 0 && (
            <Box sx={{
              display: 'flex', justifyContent: 'center', flexWrap: 'wrap',
              gap: 0.5, mt: 1.25,
            }}>
              {topSkills.map((sk) => {
                const lc = LEVEL_COLOR[sk.level] || C.muted;
                return (
                  <Box key={sk.skill} sx={{
                    display: 'inline-flex', alignItems: 'center',
                    bgcolor: `${lc}10`, color: lc, border: `1px solid ${lc}25`,
                    px: 0.9, py: 0.3, borderRadius: '7px',
                    fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.05em',
                    textTransform: 'uppercase', whiteSpace: 'nowrap',
                  }}>
                    {sk.skill}{sk.proficiency != null ? ` · ${_fmtCgps(_toCgps(sk.proficiency))}` : ''}
                  </Box>
                );
              })}
              {extra > 0 && (
                <Box sx={{
                  display: 'inline-flex', alignItems: 'center',
                  bgcolor: C.chipBg, color: C.muted,
                  px: 0.9, py: 0.3, borderRadius: '7px',
                  fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.05em',
                }}>
                  +{extra}
                </Box>
              )}
            </Box>
          )}

          {/* ── Meta row: duration · questions (bordered) ─────────── */}
          <Box sx={{
            display: 'flex', justifyContent: 'center', gap: 2.5,
            mt: 1.5, pt: 1.25,
            borderTop: `1px solid ${C.border}`,
            color: C.muted, fontSize: '0.74rem', fontWeight: 500,
          }}>
            {m.dur && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Schedule sx={{ fontSize: 14, color: C.faint }} />
                <span>{m.dur}</span>
              </Box>
            )}
            {m.questions && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <QuizOutlined sx={{ fontSize: 14, color: C.faint }} />
                <span>{m.questions}</span>
              </Box>
            )}
          </Box>

          {/* ── Footer: verdict + status pill ─────────────────────── */}
          <Box sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 1, mt: 'auto', pt: 1.5,
          }}>
            <Tooltip arrow placement="top" title={att.verdict || 'No verdict recorded'}>
              <Typography noWrap sx={{
                fontSize: '0.82rem', fontWeight: 800,
                color: att.verdict ? C.sageText : C.faint,
                letterSpacing: '-0.01em', minWidth: 0, cursor: 'default',
              }}>
                {att.verdict || <Box component="span" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>No verdict</Box>}
              </Typography>
            </Tooltip>
            <StatusPill att={att} height={28} />
          </Box>
        </Box>
      </Card>
    );
  };

  /* ── LIST ROW — verbatim JobCard ledger-row chrome ────────────────── */
  const ListRow = ({ att }) => {
    const m = attemptMeta(att);
    const selected = isSelected(att.attempt_id);
    return (
      <Card onClick={() => onView(att.attempt_id)} elevation={0} sx={{
        cursor: 'pointer', fontFamily: FJ_FONT,
        '& .MuiTypography-root': { fontFamily: FJ_FONT },
        borderRadius: '14px', bgcolor: selected ? C.sageSoft : C.surface,
        border: `1px solid ${selected ? C.sage : C.border}`,
        transition: 'all 0.2s ease',
        '&:hover': {
          borderColor: C.sage,
          boxShadow: '0 6px 20px rgba(2,33,36,0.08)',
        },
      }}>
        {/* ── Desktop: table row (md+) ───────────────────────────────── */}
        <Box sx={{
          display: { xs: 'none', md: 'grid' },
          gridTemplateColumns: '2.4fr 1fr 1fr 1.1fr 140px',
          alignItems: 'center',
          px: 2.5, py: 1.75,
          gap: 2,
        }}>
          {/* Col 1: Attempt */}
          <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'center', minWidth: 0 }}>
            <Checkbox
              checked={selected}
              onClick={(e) => e.stopPropagation()}
              onChange={() => toggleOne(att.attempt_id)}
              size="small"
              sx={{ p: 0.25, ml: -0.75, flexShrink: 0, color: C.faint, '&.Mui-checked': { color: C.pine } }}
              slotProps={{ input: { 'aria-label': `Select attempt ${att.attempt_id}` } }}
            />
            <ScoreAvatar att={att} size={38} />
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography noWrap sx={{ fontSize: '0.95rem', fontWeight: 800, color: C.ink, lineHeight: 1.25, letterSpacing: '-0.01em' }}>
                Attempt #{att.attempt_id}
              </Typography>
              <Typography noWrap sx={{ fontSize: '0.75rem', color: C.muted, fontWeight: 500, mt: 0.2 }}>
                {att.verdict || 'No verdict recorded'}
              </Typography>
            </Box>
          </Box>

          {/* Col 2: Date */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CalendarMonthOutlined sx={{ fontSize: 14, color: C.faint }} />
            <Typography noWrap sx={{ fontSize: '0.82rem', color: C.inkSoft, fontWeight: 500 }}>
              {m.date}
            </Typography>
          </Box>

          {/* Col 3: Duration + questions */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
            <Typography sx={{ fontSize: '0.82rem', color: C.inkSoft, fontWeight: 500 }}>
              {m.dur || '—'}
            </Typography>
            {m.questions && (
              <Typography sx={{ fontSize: '0.7rem', color: C.faint, fontWeight: 500 }}>
                {m.questions}
              </Typography>
            )}
          </Box>

          {/* Col 4: Status pill (salary slot) */}
          <Box><StatusPill att={att} height={28} /></Box>

          {/* Col 5: Action */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.75 }}>
            <Button size="small" disableElevation variant="contained"
              onClick={(e) => { e.stopPropagation(); onView(att.attempt_id); }}
              sx={{
                bgcolor: C.pine, color: '#fff', fontFamily: FJ_FONT,
                '&:hover': { bgcolor: C.pineDark },
                borderRadius: '9px', fontWeight: 700, textTransform: 'none',
                fontSize: '0.78rem', px: 2, py: 0.6,
              }}>
              View
            </Button>
            <Box onClick={(e) => e.stopPropagation()}>
              <Tooltip title="Delete attempt" arrow>
                <IconButton size="small" onClick={() => askDeleteOne(att.attempt_id)}
                  sx={{ color: C.faint, '&:hover': { bgcolor: `${DANGER}0A`, color: DANGER } }}>
                  <DeleteOutlineOutlined sx={{ fontSize: 17 }} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Box>

        {/* ── Mobile: stacked card (xs–sm) ───────────────────────────── */}
        <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', p: 2 }}>
          <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start', mb: 1.25 }}>
            <Checkbox
              checked={selected}
              onClick={(e) => e.stopPropagation()}
              onChange={() => toggleOne(att.attempt_id)}
              size="small"
              sx={{ p: 0.25, flexShrink: 0, color: C.faint, '&.Mui-checked': { color: C.pine } }}
            />
            <ScoreAvatar att={att} size={36} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: '0.92rem', fontWeight: 800, color: C.ink, lineHeight: 1.25, mb: 0.2 }}>
                Attempt #{att.attempt_id}
              </Typography>
              <Typography sx={{ fontSize: '0.72rem', color: C.muted, fontWeight: 500 }}>
                {m.date}
              </Typography>
            </Box>
            <Box onClick={(e) => e.stopPropagation()}>
              <ActionIcons att={att} compact />
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1, alignItems: 'center' }}>
            {m.dur && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                <Schedule sx={{ fontSize: 13, color: C.faint }} />
                <Typography sx={{ fontSize: '0.72rem', color: C.muted, fontWeight: 500 }}>{m.dur}</Typography>
              </Box>
            )}
            {m.dur && m.questions && <Typography sx={{ fontSize: '0.72rem', color: C.faint }}>·</Typography>}
            {m.questions && <Typography sx={{ fontSize: '0.72rem', color: C.muted, fontWeight: 500 }}>{m.questions}</Typography>}
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography noWrap sx={{ fontSize: '0.82rem', fontWeight: 800, color: att.verdict ? C.sageText : C.faint, minWidth: 0, mr: 1 }}>
              {att.verdict || 'No verdict'}
            </Typography>
            <StatusPill att={att} height={28} />
          </Box>
        </Box>
      </Card>
    );
  };

  return (
    <Stack spacing={2} sx={{ fontFamily: FJ_FONT, '& .MuiTypography-root, & .MuiButton-root, & .MuiToggleButton-root, & .MuiChip-root, & .MuiInputBase-root, & .MuiMenuItem-root, & .MuiPaginationItem-root': { fontFamily: FJ_FONT } }}>

      {/* ── FindJobs "Clean Board" command header ──────────────────────
          Title + live count subline, one search row, then status pills
          with sort and view toggle on the right. */}
      <Paper
        elevation={0}
        sx={{
          bgcolor: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: { xs: '14px', sm: '16px' },
          p: { xs: 2, sm: 2.5, md: 3 },
          boxShadow: '0 1px 2px rgba(16,18,16,0.04)',
        }}
      >
        {/* Row 1 — title with subline underneath + back action (refresh slot) */}
        <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5, mb: { xs: 2, md: 2.25 } }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography component="h2" sx={{
              fontWeight: 700, color: C.ink,
              letterSpacing: '-0.02em', lineHeight: 1.15,
              fontSize: { xs: '1.3rem', sm: '1.45rem', md: '1.6rem' },
            }}>
              Practice History
            </Typography>
            <Typography sx={{ color: C.muted, fontSize: { xs: '0.82rem', sm: '0.9rem' }, fontWeight: 500, mt: 0.5 }}>
              <Box component="span" sx={{ color: C.sageText, fontWeight: 700 }}>
                {allCount} {allCount === 1 ? 'attempt' : 'attempts'}
              </Box>
              {' '}recorded · most recent first
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} sx={{ flexShrink: 0, mt: 0.5, alignItems: 'center' }}>
            <Button
              onClick={onClose}
              startIcon={<ArrowBackOutlined sx={{ fontSize: 16 }} />}
              size="small"
              sx={{
                color: C.muted,
                border: `1px solid ${C.borderStrong}`,
                borderRadius: '9px', textTransform: 'none',
                fontWeight: 600, fontSize: '0.8rem', px: 1.5,
                '&:hover': { bgcolor: C.sageSoft, color: C.pine, borderColor: C.sage },
              }}
            >
              Back to interview
            </Button>
            {/* Refresh — same styling as FindJobs' refresh IconButton */}
            <Tooltip title="Refresh" arrow>
              <span>
                <IconButton
                  onClick={onRefresh}
                  disabled={loading || !onRefresh}
                  size="small"
                  sx={{
                    color: C.muted,
                    border: `1px solid ${C.borderStrong}`,
                    borderRadius: '9px',
                    '&:hover': { bgcolor: C.sageSoft, color: C.pine, borderColor: C.sage },
                  }}
                >
                  <RefreshOutlined sx={{ fontSize: 18 }} />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </Stack>

        {/* Row 2 — search */}
        <Stack direction="row" spacing={1} sx={{ alignItems: 'stretch', flexWrap: 'wrap', gap: 1 }}>
          <TextField
            placeholder="Search by attempt, skill, or verdict"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: C.muted, fontSize: 20 }} />
                  </InputAdornment>
                ),
                endAdornment: searchQuery ? (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => setSearchQuery('')}
                      aria-label="Clear search"
                      sx={{ color: C.muted, '&:hover': { color: C.ink, bgcolor: 'rgba(16,18,16,0.05)' } }}
                    >
                      <ClearRounded sx={{ fontSize: 18 }} />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              },
            }}
            sx={{
  flex: '1 1 300px',
  minWidth: { xs: '100%', sm: 260 },

  '& .MuiOutlinedInput-root': {
    bgcolor: BRAND.bg,
    borderRadius: '25px',
    fontSize: { xs: '0.88rem', sm: '0.92rem' },
    height: { xs: 46, md: 48 },
    color: BRAND.ink,
    fontFamily: FONT,
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',

    '& input::placeholder': {
      color: BRAND.muted,
      opacity: 0.85,
    },

    '& fieldset': {
      borderColor: '#B0BEC5',
      borderWidth: '1.5px',
    },

    '&:hover fieldset': {
      borderColor: '#78909C',
      borderWidth: '2px',
    },

    '&.Mui-focused': {
      boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
    },

    '&.Mui-focused fieldset': {
      borderColor: BRAND.sage,
      borderWidth: '2px',
    },
  },
}}
          />
        </Stack>

        {/* Row 3 — status pills (left) + sort & view toggle (right) */}
        <Stack direction="row" sx={{ alignItems: 'center', mt: { xs: 1.75, md: 2 }, gap: 1, flexWrap: 'wrap' }}>
          <Box sx={{
            display: 'flex', gap: 0.75, alignItems: 'center',
            flexWrap: { xs: 'nowrap', sm: 'wrap' },
            overflowX: { xs: 'auto', sm: 'visible' },
            pb: { xs: 0.5, sm: 0 }, mr: 'auto',
            '&::-webkit-scrollbar': { display: 'none' },
          }}>
            {STATUS_PILLS.map((opt) => {
              const selected = statusFilter === opt.value;
              return (
                <Box
                  key={opt.value}
                  onClick={() => setStatusFilter(opt.value)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setStatusFilter(opt.value)}
                  sx={{
                    cursor: 'pointer', userSelect: 'none',
                    display: 'inline-flex', alignItems: 'center', gap: 0.6,
                    px: 1.5, py: 0.65, borderRadius: 999, flexShrink: 0,
                    fontSize: '0.8rem', fontWeight: selected ? 700 : 600,
                    fontFamily: FJ_FONT,
                    bgcolor: selected ? C.pine : C.surface,
                    color: selected ? '#fff' : C.muted,
                    border: `1px solid ${selected ? C.pine : C.borderStrong}`,
                    transition: 'all 0.16s ease',
                    '&:hover': {
                      bgcolor: selected ? C.pine : C.page,
                      borderColor: selected ? C.pine : C.muted,
                    },
                  }}
                >
                  {opt.label}
                  <Box component="span" sx={{
                    fontSize: '0.68rem', fontWeight: 800, lineHeight: 1.6,
                    px: 0.7, borderRadius: 999,
                    bgcolor: selected ? 'rgba(255,255,255,0.22)' : C.page,
                    color: selected ? '#fff' : C.muted,
                  }}>
                    {opt.count}
                  </Box>
                </Box>
              );
            })}
          </Box>

          {/* Sort */}
          <TextField
            select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            sx={{
              minWidth: 150, flexShrink: 0,
              '& .MuiOutlinedInput-root': {
                bgcolor: C.surface,
                borderRadius: '10px',
                fontSize: '0.82rem',
                height: 38,
                color: C.ink,
                fontFamily: FJ_FONT,
                '& fieldset': { borderColor: C.borderStrong },
                '&:hover fieldset': { borderColor: C.muted },
                '&.Mui-focused fieldset': { borderColor: C.sage, borderWidth: 1.5 },
                '& .MuiSvgIcon-root': { color: C.muted },
              },
            }}
          >
            {SORT_OPTS.map((option) => (
              <MenuItem key={option.value} value={option.value} sx={{ fontSize: '0.85rem', fontFamily: FJ_FONT }}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>

          {/* View toggle */}
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(e, newMode) => newMode && setViewMode(newMode)}
            sx={{
              height: 38, flexShrink: 0,
              bgcolor: C.page,
              border: `1px solid ${C.border}`,
              borderRadius: '10px', p: '3px',
              '& .MuiToggleButton-root': {
                border: 0, borderRadius: '7px !important', m: 0,
                color: C.muted, px: 1.25, height: 30,
                '&:hover': { bgcolor: 'rgba(16,18,16,0.04)' },
                '&.Mui-selected': {
                  bgcolor: C.surface, color: C.pine,
                  boxShadow: '0 1px 3px rgba(16,18,16,0.12)',
                  '&:hover': { bgcolor: C.surface },
                },
              },
            }}
          >
            <ToggleButton value="grid" aria-label="grid view"><ViewModule sx={{ fontSize: 18 }} /></ToggleButton>
            <ToggleButton value="list" aria-label="list view"><ViewList sx={{ fontSize: 18 }} /></ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Paper>

      {/* Selection bar — always visible so everything can be selected at
          once. Delete actions appear as soon as anything is selected. */}
      {total > 0 && (
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          flexWrap="wrap"
          useFlexGap
          sx={{
            gap: 1,
            px: 1.25, py: 0.5,
            borderRadius: '12px',
            border: `1px solid ${selectedIds.length > 0 ? C.sage : C.border}`,
            bgcolor: selectedIds.length > 0 ? C.sageSoft : C.surface,
            transition: 'all 0.16s ease',
          }}
        >
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Checkbox
              checked={allSelected}
              indeterminate={someSelected}
              onChange={toggleAll}
              sx={{ color: C.muted, p: 0.75, '&.Mui-checked': { color: C.pine }, '&.MuiCheckbox-indeterminate': { color: C.pine } }}
              slotProps={{ input: { 'aria-label': 'Select all attempts' } }}
            />
            <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: C.pine }}>
              {selectedIds.length > 0
                ? `${selectedIds.length} of ${total} selected`
                : `Select all (${total})`}
            </Typography>
          </Stack>

          {selectedIds.length > 0 && (
            <Stack direction="row" alignItems="center" spacing={1}>
              <Button
                onClick={clearSelection}
                sx={{ textTransform: 'none', fontWeight: 700, color: TEXT_DIM, fontSize: '0.78rem', borderRadius: '8px', px: 1.25, py: 0.5, '&:hover': { bgcolor: '#FFFFFF' } }}
              >
                Clear
              </Button>
              <Button
                variant="contained"
                startIcon={<DeleteSweepOutlined sx={{ fontSize: 18 }} />}
                onClick={askDeleteSelected}
                sx={{
                  bgcolor: DANGER, color: '#FFFFFF', textTransform: 'none',
                  fontWeight: 700, fontSize: '0.78rem', borderRadius: '8px',
                  px: 1.75, py: 0.55, boxShadow: `0 4px 12px ${DANGER}44`,
                  '&:hover': { bgcolor: '#7A2E24', boxShadow: `0 6px 16px ${DANGER}55` },
                }}
              >
                Delete ({selectedIds.length})
              </Button>
            </Stack>
          )}
        </Stack>
      )}

      {/* No results for the current filter/search */}
      {!total && (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <Typography sx={{ fontWeight: 700, color: C.ink, fontSize: '0.95rem' }}>No attempts match</Typography>
          <Typography sx={{ color: C.muted, fontSize: '0.82rem', mt: 0.5 }}>
            Try clearing the search or switching the status filter.
          </Typography>
        </Box>
      )}

      {/* Attempt cards — grid or ledger list (current page only) */}
      {viewMode === 'grid' ? (
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, minmax(0, 1fr))',
            md: 'repeat(3, minmax(0, 1fr))',
            lg: 'repeat(4, minmax(0, 1fr))',
            xl: 'repeat(4, minmax(0, 1fr))',
          },
          gap: { xs: 1.5, sm: 1.75, md: 2 },
          width: '100%',
        }}>
          {pageItems.map((att) => (
            <Box key={att.attempt_id} sx={{ minWidth: 0, width: '100%' }}>
              <GridCard att={att} />
            </Box>
          ))}
        </Box>
      ) : (
        <Stack spacing={1.25}>
          {pageItems.map((att) => <ListRow key={att.attempt_id} att={att} />)}
        </Stack>
      )}

      {/* ── Pagination bar — FindJobs verbatim: always visible below cards ── */}
      {total > 0 && (
        <Box sx={{
          mt: { xs: 3, sm: 3.5, md: 4 },
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', sm: 'center' },
          gap: { xs: 1.5, sm: 2 },
        }}>
          {/* Left: count + page-size selector */}
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={{ xs: 1, sm: 2 }}
            sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, flex: 1, minWidth: 0 }}
          >
            <Typography sx={{
              fontSize: { xs: '0.78rem', sm: '0.82rem' },
              color: C.muted,
              fontWeight: 500,
              whiteSpace: 'nowrap',
            }}>
              Showing{' '}
              <Box component="span" sx={{ color: C.ink, fontWeight: 700 }}>
                {pageStart + 1}–{Math.min(pageStart + effectivePageSize, total)}
              </Box>
              {' '}of{' '}
              <Box component="span" sx={{ color: C.ink, fontWeight: 700 }}>
                {total}
              </Box>
              {' '}attempts
            </Typography>

            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
              <Typography sx={{
                fontSize: { xs: '0.78rem', sm: '0.82rem' },
                color: C.muted, fontWeight: 500,
              }}>
                Show
              </Typography>
              <Select
                size="small"
                value={pageSize}
                onChange={(e) => {
                  const v = e.target.value;
                  setPageSize(v === 'all' ? 'all' : Number(v));
                }}
                renderValue={(v) => (v === 'all' ? 'All' : v)}
                MenuProps={{
                  slotProps: { paper: {
                    sx: {
                      borderRadius: '12px',
                      mt: 0.5,
                      border: `1px solid ${C.border}`,
                      boxShadow: '0 8px 24px rgba(2,33,36,0.12)',
                      '& .MuiMenuItem-root': {
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        fontFamily: FJ_FONT,
                        color: C.ink,
                        minHeight: { xs: 40, sm: 36 },
                        '&.Mui-selected': {
                          bgcolor: 'rgba(127,158,126,0.10)',
                          color: C.pine,
                          '&:hover': { bgcolor: 'rgba(127,158,126,0.10)' },
                        },
                      },
                    },
                  },
                } }}
                sx={{
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  fontFamily: FJ_FONT,
                  color: C.pine,
                  bgcolor: C.page,
                  borderRadius: '10px',
                  minWidth: { xs: 76, sm: 80 },
                  height: { xs: 38, sm: 36 },
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: C.border,
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: C.pine,
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: C.pine,
                    borderWidth: '1px',
                  },
                  '& .MuiSelect-select': {
                    py: 0.75,
                    pl: 1.25,
                    pr: '28px !important',
                  },
                  '& .MuiSvgIcon-root': { color: C.pine },
                }}
              >
                {HISTORY_PAGE_SIZE_OPTIONS.map((opt) => (
                  <MenuItem key={opt} value={opt}>{opt === 'all' ? 'All' : opt}</MenuItem>
                ))}
              </Select>
              <Typography sx={{
                fontSize: { xs: '0.78rem', sm: '0.82rem' },
                color: C.muted, fontWeight: 500,
              }}>
                per page
              </Typography>
            </Stack>
          </Stack>

          {/* Right: page buttons */}
          <Pagination
            count={pageCount}
            page={safePage}
            onChange={(_e, p) => setPage(p)}
            shape="rounded"
            siblingCount={1}
            boundaryCount={1}
            size="small"
            sx={{
              '& .MuiPaginationItem-root': {
                fontSize: { xs: '0.75rem', sm: '0.82rem' },
                fontWeight: 600,
                fontFamily: FJ_FONT,
                color: C.ink,
                borderRadius: '8px',
                border: `1px solid ${C.border}`,
                bgcolor: C.page,
                minWidth: { xs: 32, sm: 36 },
                height: { xs: 32, sm: 36 },
                '&:hover': {
                  bgcolor: 'rgba(127,158,126,0.10)',
                  borderColor: C.sage,
                },
                '&.Mui-selected': {
                  bgcolor: C.pine,
                  color: '#fff',
                  borderColor: C.pine,
                  fontWeight: 700,
                  boxShadow: '0 4px 12px rgba(2,33,36,0.2)',
                  '&:hover': { bgcolor: C.pineDark },
                },
              },
              '& .MuiPaginationItem-ellipsis': {
                border: 'none',
                bgcolor: 'transparent',
              },
            }}
          />
        </Box>
      )}

      {/* 🔧 CHANGE — Shared delete confirmation dialog (single + multi) */}
      <Dialog
        open={!!pendingDelete}
        onClose={cancelDelete}
        maxWidth="xs"
        fullWidth
        slotProps={{
          backdrop: { sx: { bgcolor: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(6px)' } },
          paper: { sx: { borderRadius: '20px', boxShadow: SHADOW_XL, border: `1px solid ${BORDER}`, overflow: 'hidden', background: '#FFFFFF' } },
        }}
      >
        <Box aria-hidden sx={{ height: 4, width: '100%', background: `linear-gradient(90deg, ${DANGER} 0%, #C97B4A 50%, ${DANGER} 100%)` }} />
        <DialogTitle sx={{ px: 3, pt: 3, pb: 1.25 }}>
          <Stack direction="column" spacing={1.75} alignItems="flex-start">
            <Box sx={{ width: 52, height: 52, borderRadius: '14px', background: `linear-gradient(180deg, ${DANGER}18 0%, ${DANGER}0A 100%)`, border: `1px solid ${DANGER}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 4px 12px ${DANGER}22` }}>
              <WarningAmberOutlined sx={{ color: DANGER, fontSize: 28 }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: '1.25rem', fontWeight: 800, color: NAVY, letterSpacing: '-0.015em', lineHeight: 1.25 }}>
                {pendingCount > 1 ? `Delete ${pendingCount} attempts?` : 'Delete this attempt?'}
              </Typography>
              <Typography sx={{ fontSize: '0.82rem', color: TEXT_DIM, mt: 0.5, fontWeight: 500 }}>
                This action can&apos;t be undone.
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ px: 3, pt: 0.5, pb: 1 }}>
          <Typography sx={{ fontSize: '0.9rem', color: TEXT_DIM, lineHeight: 1.65 }}>
            {pendingCount > 1
              ? `The ${pendingCount} selected practice attempts — including their scores, skill breakdowns, and transcripts — will be permanently removed from your history.`
              : 'This practice attempt — including its score, skill breakdown, and transcript — will be permanently removed from your history.'}
          </Typography>
          {deleteError && (
            <Alert severity="error" sx={{ borderRadius: '10px', mt: 2, boxShadow: SHADOW_SM }}>{deleteError}</Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.75, pt: 2, gap: 1.25, borderTop: `1px solid ${BORDER}`, mt: 1.5, bgcolor: '#FBFCFA' }}>
          <Button
            onClick={cancelDelete}
            disabled={deleting}
            fullWidth
            sx={{ textTransform: 'none', fontWeight: 700, color: NAVY, fontSize: '0.88rem', px: 2, py: 1.1, borderRadius: '10px', bgcolor: '#FFFFFF', border: `1px solid ${BORDER}`, boxShadow: SHADOW_SM, '&:hover': { bgcolor: NAVY_SOFTER, borderColor: `${NAVY}33`, boxShadow: SHADOW_MD } }}
          >
            Cancel
          </Button>
          <Button
            onClick={confirmDelete}
            disabled={deleting}
            fullWidth
            variant="contained"
            startIcon={deleting ? <CircularProgress size={16} thickness={4} sx={{ color: '#FFFFFF' }} /> : <DeleteOutlineOutlined sx={{ fontSize: 18 }} />}
            sx={{ bgcolor: DANGER, color: '#FFFFFF', textTransform: 'none', fontWeight: 700, fontSize: '0.88rem', px: 2, py: 1.1, borderRadius: '10px', boxShadow: `0 6px 16px ${DANGER}55, 0 2px 6px ${DANGER}33`, '&:hover': { bgcolor: '#7A2E24', boxShadow: `0 8px 22px ${DANGER}66, 0 3px 8px ${DANGER}44` }, '&.Mui-disabled': { bgcolor: `${DANGER}66`, color: '#FFFFFF' } }}
          >
            {deleting ? 'Deleting…' : (pendingCount > 1 ? `Delete ${pendingCount}` : 'Delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

export const HistoryDetailView = ({ ctx }) => {
  const { attempt, loading, onBack } = ctx;

  // 🔧 Preview modal state — mount the shared _PDFPreviewDialog when open.
  const [previewOpen, setPreviewOpen] = useState(false);

  if (loading || !attempt) return (
    <Box sx={{ py: 10, textAlign: 'center' }}>
      <CircularProgress sx={{ color: NAVY }} size={36} thickness={3.5} />
      <Typography sx={{ mt: 2, color: MUTED, fontSize: '0.85rem' }}>Loading result…</Typography>
    </Box>
  );

  const cgps = _toCgps(attempt.overall_score);

  const skills = ((attempt.skills_detail && attempt.skills_detail.length > 0)
    ? attempt.skills_detail
    : (attempt.skill_scores || [])
  ).filter((s) => s.source !== 'inferred' && s.source !== 'not_covered' && s.proficiency != null);
  const sortedSkills = [...skills].sort(
    (a, b) => (b.proficiency ?? -1) - (a.proficiency ?? -1)
  );

  const transcript    = (attempt.transcript || []).filter((x) => x.q);
  const answeredCount = transcript.filter((x) => x.a).length;
  const dur           = _fmtDuration(attempt.duration_seconds);

  /* Single source of truth — Preview and Download both build from this. */
  const pdfData = {
    score:      attempt.overall_score,
    verdict:    attempt.verdict,
    summary:    attempt.summary,
    skills:     sortedSkills,
    strengths:  attempt.strengths  || [],
    weaknesses: attempt.weaknesses || [],
    transcript,
    attemptId:  attempt.attempt_id,
    date:       _fmtDate(attempt.created_at),
  };
  const downloadPdf = () => _generatePDF(pdfData);
  const openPreview = () => setPreviewOpen(true);

  return (
    <Stack spacing={2}>

      {/* ── Command bar — back (left) · identity (center) · PDF (right) ── */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr auto', sm: 'auto 1fr auto' },
        alignItems: 'center', columnGap: 1.5, rowGap: 1,
      }}>
        <Button
          startIcon={<ArrowBackOutlined sx={{ fontSize: 17 }} />}
          onClick={onBack}
          size="small"
          sx={{
            justifySelf: 'start',
            color: MUTED, border: `1px solid #D8DDD4`,
            borderRadius: '9px', textTransform: 'none',
            fontWeight: 600, fontSize: '0.8rem', px: 1.5,
            '&:hover': { bgcolor: '#EDF3EC', color: NAVY, borderColor: '#7F9E7E' },
          }}
        >
          Back to history
        </Button>

        <Stack
          direction="row" spacing={0.75} alignItems="center"
          sx={{ justifySelf: { xs: 'start', sm: 'center' }, gridColumn: { xs: '1 / -1', sm: 'auto' }, order: { xs: 3, sm: 0 }, minWidth: 0 }}
        >
          <Typography noWrap sx={{ fontSize: '0.8rem', fontWeight: 700, color: NAVY }}>
            Attempt #{attempt.attempt_id}
          </Typography>
          <Typography sx={{ fontSize: '0.78rem', color: MUTED }}>· {_fmtDate(attempt.created_at)}</Typography>
          {dur && (
            <Chip
              size="small"
              icon={<Schedule sx={{ fontSize: 12 }} />}
              label={dur}
              sx={{ bgcolor: NAVY_SOFT, color: NAVY, fontWeight: 700, height: 22, fontSize: '0.66rem', '& .MuiChip-label': { px: 0.75 } }}
            />
          )}
        </Stack>

        {/* Preview + Download — paired action group */}
        <Stack direction="row" spacing={1} sx={{ justifySelf: 'end', alignItems: 'center' }}>
          <Tooltip title="Preview the report" arrow>
            <Button
              variant="outlined"
              size="small"
              startIcon={<VisibilityOutlined sx={{ fontSize: 16 }} />}
              onClick={openPreview}
              sx={{
                borderColor: `${NAVY}35`, color: NAVY, textTransform: 'none',
                fontWeight: 700, fontSize: '0.78rem', borderRadius: '999px',
                px: 2, height: 32, bgcolor: '#FFFFFF',
                '&:hover': { borderColor: NAVY, bgcolor: '#EDF3EC' },
              }}
            >
              Preview
            </Button>
          </Tooltip>
          <Button
            variant="contained"
            size="small"
            disableElevation
            startIcon={<FileDownloadOutlined sx={{ fontSize: 16 }} />}
            onClick={downloadPdf}
            sx={{
              bgcolor: NAVY, color: '#fff', textTransform: 'none',
              fontWeight: 700, fontSize: '0.78rem', borderRadius: '999px',
              px: 2, height: 32,
              boxShadow: '0 2px 8px rgba(2,33,36,0.22)',
              '&:hover': { bgcolor: '#7F9E7E', boxShadow: '0 4px 12px rgba(127,158,126,0.4)' },
            }}
          >
            Download PDF
          </Button>
        </Stack>
      </Box>

      {/* ── Score hero — ring gauge | verdict + summary, on one grid ───── */}
      <Box sx={{
        borderRadius: '18px', border: `1px solid ${BORDER}`,
        bgcolor: '#FFFFFF', boxShadow: SHADOW_CARD, overflow: 'hidden',
      }}>
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '170px 1fr' },
          alignItems: 'stretch',
        }}>
          {/* Left cell: ring centered, cream backing, divider on sm+ */}
          <Box sx={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 1,
            py: { xs: 2.5, sm: 3 }, px: 2,
            bgcolor: '#FBFCFA',
            borderBottom: { xs: `1px solid ${BORDER}`, sm: 'none' },
            borderRight:  { xs: 'none', sm: `1px solid ${BORDER}` },
          }}>
            <_ScoreRing raw={attempt.overall_score} size={118} />
            <Typography sx={{
              fontSize: '0.62rem', fontWeight: 800, color: MUTED,
              letterSpacing: '0.12em',
            }}>
              OVERALL SCORE
            </Typography>
          </Box>

          {/* Right cell: verdict headline · summary · meta footer */}
          <Box sx={{ p: { xs: 2.25, sm: 2.75 }, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            {attempt.verdict && (
              <Typography sx={{
                fontSize: { xs: '1.1rem', sm: '1.2rem' }, fontWeight: 800,
                color: NAVY, letterSpacing: '-0.015em', lineHeight: 1.3,
              }}>
                {attempt.verdict}
              </Typography>
            )}
            {attempt.summary && (
              <Typography sx={{ fontSize: '0.87rem', color: TEXT_DIM, lineHeight: 1.65, mt: attempt.verdict ? 0.75 : 0 }}>
                {attempt.summary}
              </Typography>
            )}
            <Stack
              direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap
              sx={{ mt: 'auto', pt: 1.75 }}
            >
              <Stack direction="row" spacing={0.5} alignItems="center">
                <QuizOutlined sx={{ fontSize: 15, color: '#7A7E76' }} />
                <Typography sx={{ fontSize: '0.78rem', color: MUTED, fontWeight: 500 }}>
                  {answeredCount}/{transcript.length || attempt.total_questions || '?'} answered
                </Typography>
              </Stack>
              {dur && (
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <Schedule sx={{ fontSize: 15, color: '#7A7E76' }} />
                  <Typography sx={{ fontSize: '0.78rem', color: MUTED, fontWeight: 500 }}>{dur}</Typography>
                </Stack>
              )}
              <Typography sx={{ fontSize: '0.78rem', color: '#7A7E76', fontWeight: 500 }}>
                CGPS scale · 0–10
              </Typography>
            </Stack>
          </Box>
        </Box>
      </Box>

      {/* ── Skill breakdown ──────────────────────────────────────────── */}
      {sortedSkills.length > 0 && (
        <Box sx={{ p: 2.5, borderRadius: '16px', border: `1px solid ${BORDER}`, bgcolor: '#FFFFFF', boxShadow: SHADOW_CARD }}>
          <SectionTitle
            icon={BuildOutlined}
            label="Skill breakdown"
            hint="Skills directly asked about in this interview"
          />
          <_SkillRows skills={sortedSkills} />
        </Box>
      )}

      {/* ── Strengths + Areas to improve — equal pair ─────────────────── */}
      <_ProsConsGrid strengths={attempt.strengths || []} weaknesses={attempt.weaknesses || []} />

      {/* ── Transcript ───────────────────────────────────────────────── */}
      {transcript.length > 0 && (
        <Box sx={{ p: 2.5, borderRadius: '16px', border: `1px solid ${BORDER}`, bgcolor: '#FFFFFF', boxShadow: SHADOW_CARD }}>
          <SectionTitle icon={DescriptionOutlined} label="Transcript" />
          <_TranscriptList items={transcript} />
        </Box>
      )}

      {/* ── PDF Preview modal ──────────────────────────────────────────── */}
      <_PDFPreviewDialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        data={pdfData}
        titleSuffix={`Attempt #${attempt.attempt_id} · ${_fmtDate(attempt.created_at)}`}
      />
    </Stack>
  );
};