

import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Typography, Button, Card, IconButton, TextField, InputAdornment, Chip,
  Avatar,
  Stack, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Divider,
  CircularProgress, Menu, MenuItem, Paper, ToggleButton,
  ToggleButtonGroup, Drawer, Badge, Slider, Pagination, Select, Alert,
} from '@mui/material';
import {
  ArrowBackRounded, Search, Email, Phone, LocationOn, Work as WorkIcon,
  School, OpenInNew, Close as CloseIcon, ErrorOutlineRounded, RefreshOutlined,
  LinkedIn as LinkedInIcon, GitHub as GitHubIcon, Public as PublicIcon,
  KeyboardArrowDown, ViewList, ViewModule, TuneRounded, ClearRounded,
  LocationOnOutlined, WorkHistoryOutlined, StarRounded, TimerOutlined,
  ArrowForwardRounded, CheckCircleRounded, GroupsRounded, PersonSearchRounded,
} from '@mui/icons-material';
import { useJobApplicants } from '@/hooks/employer/useJobApplicants';
import applicantService from '@/services/api/employer/applicantService';

const FONT = "'Jost','DM Sans',sans-serif";

/* ── Pine / sage brand (same tokens as MyJobs & FindJobs) ─────────────── */
const BRAND = {
  navy:          '#022124',   // pine
  navyDark:      '#0A3A38',
  navySoft:      'rgba(127,158,126,0.10)',
  navySoftHover: 'rgba(127,158,126,0.18)',
  sage:          '#7F9E7E',
  sageDark:      '#6C8B6B',
  sageText:      '#5E815D',
  sageSoft:      '#EDF3EC',
  border:        '#E7EAE3',
  borderStrong:  '#D8DDD4',
  muted:         '#55584F',
  ink:           '#101210',
  faint:         '#7A7E76',
  bg:            '#F6F8F3',
  surface:       '#FFFFFF',
  amber:         '#A35A2D',
  amberSoft:     '#FBF0E7',
  err:           '#B4462F',
  errSoft:       '#FBECEA',
  ok:            '#3E6E3E',
  okSoft:        '#EAF2E9',
};


const APPLICATION_STATUS_CONFIG = {
  APPLIED:      { label: 'Applied',       bg: BRAND.sageSoft,  color: BRAND.sageText, bdr: 'rgba(127,158,126,0.35)' },
  SHORTLISTED:  { label: 'Shortlisted',   bg: BRAND.okSoft,    color: BRAND.ok,       bdr: 'rgba(62,110,62,0.28)'   },
  AI_INTERVIEW: { label: 'AI Interview',  bg: BRAND.amberSoft, color: BRAND.amber,    bdr: 'rgba(163,90,45,0.30)'   },
  SELECTED:     { label: 'Selected',      bg: BRAND.okSoft,    color: BRAND.ok,       bdr: 'rgba(62,110,62,0.35)'   },
  REJECTED:     { label: 'Rejected',      bg: BRAND.errSoft,   color: BRAND.err,      bdr: 'rgba(180,70,47,0.28)'   },
  ON_HOLD:      { label: 'On Hold',       bg: BRAND.amberSoft, color: BRAND.amber,    bdr: 'rgba(163,90,45,0.28)'   },
  WITHDRAWN:    { label: 'Withdrawn',     bg: '#F0F2ED',       color: BRAND.muted,    bdr: BRAND.border             },
};
const getStatusConfig = (status) =>
  APPLICATION_STATUS_CONFIG[status] || { label: status || 'Unknown', bg: BRAND.sageSoft, color: BRAND.sageText, bdr: BRAND.border };

/* ── Progress menu options (drives updateStatus) — unchanged semantics */
const ACTION_MENU_OPTIONS = [
  { type: 'view',   label: 'View Profile' },
  { type: 'status', label: 'Shortlist',   value: 'SHORTLISTED'  },
  { type: 'status', label: 'On Hold',     value: 'ON_HOLD'      },
  { type: 'status', label: 'Reject',      value: 'REJECTED'     },
];


const STATUS_FILTER_OPTIONS = [
  { value: 'all',          label: 'All'          },
  { value: 'APPLIED',      label: 'Applied'      },
  { value: 'SHORTLISTED',  label: 'Shortlisted'  },
  { value: 'ON_HOLD',      label: 'On Hold'      },
  { value: 'REJECTED',     label: 'Rejected'     },
  { value: 'WITHDRAWN',    label: 'Withdrawn'    },
];

const SORT_OPTIONS = [
  { value: 'recent',     label: 'Most Recent'        },
  { value: 'oldest',     label: 'Oldest First'       },
  { value: 'match-high', label: 'Match Score (high)' },
  { value: 'exp-high',   label: 'Experience (high)'  },
  { value: 'exp-low',    label: 'Experience (low)'   },
];

const NOTICE_PERIODS = ['Immediate', '15 days', '30 days', '60 days', '90 days'];

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 'all'];
const DEFAULT_PAGE_SIZE = 10;

const LS_APPL_VIEW_MODE_KEY = 'ievalx_job_applicants_view_mode';
const APPL_VIEW_DEFAULT     = 'list';

/* ── Sage-tinted avatar palette (mono-tone, keeps the deck cohesive) ── */
const AVATAR_PALETTE = [
  { bg: '#EDF3EC', fg: '#4E6E4D' },
  { bg: '#E4EDE2', fg: '#3E5C3D' },
  { bg: '#DFEBDE', fg: '#3B593A' },
  { bg: '#F1F5F0', fg: '#5E815D' },
  { bg: '#E9F0E8', fg: '#4B6A4A' },
  { bg: '#E1EAE0', fg: '#436042' },
];
const getAvatarColor = (str) => {
  if (!str) return AVATAR_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
};

const getInitials = (name) => {
  if (!name) return '?';
  return name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
};

const formatRelativeTime = (dateStr) => {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '—';
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  const startOfDate  = new Date(date); startOfDate.setHours(0, 0, 0, 0);
  const days = Math.round((startOfToday - startOfDate) / 86400000);
  if (days < 0)   return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7)   return `${days} days ago`;
  if (days < 30)  return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatExperience = (years) => {
  if (years == null) return '—';
  const y = Number(years); if (isNaN(y)) return '—';
  if (y < 1)   return '< 1 year';
  if (y === 1) return '1 year';
  return `${y % 1 === 0 ? y : y.toFixed(1)} years`;
};

const formatLocation = (a) => ([a?.city, a?.state].filter(Boolean).join(', ') || '—');

const formatINR = (v) => {
  if (v == null) return null;
  const n = Number(v); if (isNaN(n)) return null;
  return `₹${n.toLocaleString('en-IN')}`;
};

/* Match / interview score tint — same 70/50 breakpoints as before */
const scoreTint = (n) => (
  n >= 70 ? { bg: BRAND.okSoft,    fg: BRAND.ok }    :
  n >= 50 ? { bg: BRAND.amberSoft, fg: BRAND.amber } :
            { bg: BRAND.errSoft,   fg: BRAND.err }
);


const toScore10 = (n) => {
  if (n === null || n === undefined) return '—';
  const v = n / 10;
  return v % 1 === 0 ? String(v) : v.toFixed(1);
};

/* Drawer section helper — mirrors FindJobs' */
const DrawerSection = ({ icon, title, children, last }) => (
  <Box sx={{ mb: last ? 0 : 3.5 }}>
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.75 }}>
      <Box sx={{
        width: 28, height: 28, borderRadius: 1,
        bgcolor: BRAND.navySoft, color: BRAND.navy,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{icon}</Box>
      <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: BRAND.ink, letterSpacing: '-0.005em' }}>
        {title}
      </Typography>
    </Stack>
    {children}
  </Box>
);

const pillSx = (active) => ({
  cursor: 'pointer', px: 1.75, py: 0.85, borderRadius: 999,
  border: `1px solid ${active ? BRAND.navy : BRAND.border}`,
  bgcolor: active ? BRAND.navy : '#fff',
  color:   active ? '#fff'     : BRAND.ink,
  fontSize: '0.8125rem', fontWeight: active ? 600 : 500,
  transition: 'all 0.18s ease', userSelect: 'none',
  '&:hover': { borderColor: BRAND.navy, bgcolor: active ? BRAND.navyDark : BRAND.navySoft },
});


const SkillsTooltip = ({ skills = [], children }) => {
  if (!skills.length) return children;
  return (
    <Tooltip
      arrow placement="top"
      slotProps={{
        popper: {
          modifiers: [{ name: 'offset', options: { offset: [0, 4] } }],
        },
        tooltip: {
          sx: {
            bgcolor: BRAND.navy, color: '#fff',
            fontFamily: FONT, maxWidth: 300,
            p: 1.25, borderRadius: '10px',
            boxShadow: '0 12px 32px rgba(2,33,36,0.28)',
          },
        },
        arrow: { sx: { color: BRAND.navy } },
      }}
      title={
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          <Typography sx={{
            fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: BRAND.sage,
          }}>
            Skills · {skills.length}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {skills.map((s) => (
              <Box key={s} sx={{
                px: 0.85, py: 0.3, borderRadius: '6px',
                bgcolor: 'rgba(127,158,126,0.22)', color: '#fff',
                fontSize: '0.7rem', fontWeight: 600, whiteSpace: 'nowrap',
              }}>
                {s}
              </Box>
            ))}
          </Box>
        </Box>
      }
    >
      {children}
    </Tooltip>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   Applicant Detail Dialog — full rebuild in pine/sage
   ══════════════════════════════════════════════════════════════════════════ */
const ApplicantDetailDialog = ({ open, onClose, applicant, detailLoading }) => {
  if (!applicant) return null;

  const avatarColor = getAvatarColor(applicant.full_name || applicant.email);
  const statusCfg   = getStatusConfig(applicant.application_status);
  const skills      = Array.isArray(applicant.custom_skills) ? applicant.custom_skills : [];
  const education   = Array.isArray(applicant.education)     ? applicant.education     : [];
  const expectedCtc = formatINR(applicant.expected_ctc);
  const matchScore  = typeof applicant.match_score === 'number' ? applicant.match_score : null;
  const qiScore     = typeof applicant.quick_interview_score === 'number' ? applicant.quick_interview_score : null;
  const hasAnyScore = matchScore !== null || qiScore !== null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      slotProps={{ paper: { sx: { borderRadius: '16px', overflow: 'hidden', fontFamily: FONT } } }}>

      {/* Hero band — pine on cream, echoing the JobForm header pattern */}
      <Box sx={{
        position: 'relative', bgcolor: BRAND.navy, color: '#fff',
        px: 3, py: 2.5, display: 'flex', alignItems: 'center', gap: 1.5,
      }}>
        <Box sx={{
          width: 36, height: 36, borderRadius: '10px',
          bgcolor: 'rgba(127,158,126,0.22)', color: BRAND.sage,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <PersonSearchRounded sx={{ fontSize: 20 }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '1.05rem', lineHeight: 1.2 }}>
            Applicant Profile
          </Typography>
          <Typography sx={{ fontSize: '0.75rem', opacity: 0.75, mt: 0.25 }}>
            Full history &amp; contact info
          </Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ color: 'inherit', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}>
          <CloseIcon />
        </IconButton>
      </Box>

      <DialogContent sx={{ pt: 3, pb: 2, bgcolor: BRAND.bg, fontFamily: FONT }}>
        {/* Header — avatar + name + status pill */}
        <Paper elevation={0} sx={{
          p: 2.5, borderRadius: '14px', border: `1px solid ${BRAND.border}`, bgcolor: '#fff', mb: 2,
        }}>
          <Stack direction="row" spacing={2} alignItems="center">
            {applicant.application_photo_url ? (
              <Avatar src={applicant.application_photo_url}
                sx={{ width: 64, height: 64, border: `2px solid ${BRAND.sageSoft}` }} />
            ) : (
              <Avatar sx={{
                bgcolor: avatarColor.bg, color: avatarColor.fg,
                width: 64, height: 64, fontSize: '1.35rem', fontWeight: 700,
                fontFamily: "'DM Serif Display', serif",
              }}>
                {getInitials(applicant.full_name)}
              </Avatar>
            )}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: '1.35rem', fontWeight: 400, color: BRAND.navy, lineHeight: 1.2,
              }}>
                {applicant.full_name || '—'}
              </Typography>
              <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.75 }} flexWrap="wrap" useFlexGap>
                <Box sx={{
                  display: 'inline-flex', alignItems: 'center', gap: 0.4,
                  px: 0.85, py: 0.25, borderRadius: '999px',
                  bgcolor: statusCfg.bg, color: statusCfg.color,
                  border: `1px solid ${statusCfg.bdr}`,
                  fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}>
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: statusCfg.color }} />
                  {statusCfg.label}
                </Box>
                {matchScore !== null && (() => {
                  const t = scoreTint(matchScore);
                  return (
                    <Tooltip title="How closely this candidate's resume matches the job description" arrow>
                      <Box sx={{
                        display: 'inline-flex', alignItems: 'center', gap: 0.4,
                        px: 0.85, py: 0.25, borderRadius: '999px',
                        bgcolor: t.bg, color: t.fg,
                        fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                      }}>
                        <StarRounded sx={{ fontSize: 12 }} />
                        {toScore10(matchScore)} match
                      </Box>
                    </Tooltip>
                  );
                })()}
                <Typography sx={{ fontSize: '0.75rem', color: BRAND.muted }}>
                  Applied {formatRelativeTime(applicant.applied_at)}
                </Typography>
              </Stack>
            </Box>
          </Stack>
        </Paper>

        {/* Scores — always shown so employer sees the scoring state */}
        <Paper elevation={0} sx={{
          p: 2.5, borderRadius: '14px', border: `1px solid ${BRAND.border}`, bgcolor: '#fff', mb: 2,
        }}>
          <Typography sx={{
            fontSize: '0.68rem', fontWeight: 700, color: BRAND.muted,
            textTransform: 'uppercase', letterSpacing: '0.08em', mb: 1.5,
          }}>Scores</Typography>
          <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
            {/* Resume ↔ JD Match */}
            {(() => {
              const hasVal = matchScore !== null;
              const t = hasVal ? scoreTint(matchScore) : { bg: '#F0F2ED', fg: BRAND.faint };
              return (
                <Box sx={{ textAlign: 'center' }}>
                  <Typography sx={{
                    fontSize: '0.62rem', color: BRAND.muted,
                    textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.5,
                  }}>
                    Resume ↔ JD Match
                  </Typography>
                  <Box sx={{
                    position: 'relative', width: 72, height: 72,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Box component="svg" viewBox="0 0 72 72" sx={{
                      position: 'absolute', inset: 0, width: '100%', height: '100%',
                      transform: 'rotate(-90deg)',
                    }}>
                      <circle cx="36" cy="36" r="32" fill="none" stroke="#EDEFE9" strokeWidth="3" />
                      {hasVal && (
                        <circle
                          cx="36" cy="36" r="32" fill="none"
                          stroke={t.fg} strokeWidth="3" strokeLinecap="round"
                          strokeDasharray={`${(matchScore / 100) * 2 * Math.PI * 32} ${2 * Math.PI * 32}`}
                        />
                      )}
                    </Box>
                    <Typography sx={{
                      position: 'relative',
                      fontSize: hasVal ? '1.1rem' : '0.9rem', fontWeight: 800, color: t.fg,
                      fontVariantNumeric: 'tabular-nums',
                      display: 'inline-flex', alignItems: 'baseline', lineHeight: 1,
                    }}>
                      {hasVal ? toScore10(matchScore) : '—'}
                      {hasVal && (
                        <Box component="span" sx={{
                          fontSize: '0.62rem', fontWeight: 600, ml: '1px', opacity: 0.55,
                        }}>
                          /10
                        </Box>
                      )}
                    </Typography>
                  </Box>
                </Box>
              );
            })()}
            {/* Quick Interview Score */}
            {(() => {
              const hasVal = qiScore !== null;
              const t = hasVal ? scoreTint(qiScore) : { bg: '#F0F2ED', fg: BRAND.faint };
              return (
                <Box sx={{ textAlign: 'center' }}>
                  <Typography sx={{
                    fontSize: '0.62rem', color: BRAND.muted,
                    textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.5,
                  }}>
                    Quick Interview Score
                  </Typography>
                  <Box sx={{
                    position: 'relative', width: 72, height: 72,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Box component="svg" viewBox="0 0 72 72" sx={{
                      position: 'absolute', inset: 0, width: '100%', height: '100%',
                      transform: 'rotate(-90deg)',
                    }}>
                      <circle cx="36" cy="36" r="32" fill="none" stroke="#EDEFE9" strokeWidth="3" />
                      {hasVal && (
                        <circle
                          cx="36" cy="36" r="32" fill="none"
                          stroke={t.fg} strokeWidth="3" strokeLinecap="round"
                          strokeDasharray={`${(qiScore / 100) * 2 * Math.PI * 32} ${2 * Math.PI * 32}`}
                        />
                      )}
                    </Box>
                    <Typography sx={{
                      position: 'relative',
                      fontSize: hasVal ? '1.1rem' : '0.9rem', fontWeight: 800, color: t.fg,
                      fontVariantNumeric: 'tabular-nums',
                      display: 'inline-flex', alignItems: 'baseline', lineHeight: 1,
                    }}>
                      {hasVal ? qiScore : '—'}
                      {hasVal && (
                        <Box component="span" sx={{
                          fontSize: '0.62rem', fontWeight: 600, ml: '1px', opacity: 0.55,
                        }}>
                          /10
                        </Box>
                      )}
                    </Typography>
                  </Box>
                </Box>
              );
            })()}
          </Stack>
        </Paper>

        {/* Quick contact */}
        <Paper elevation={0} sx={{
          p: 2.5, borderRadius: '14px', border: `1px solid ${BRAND.border}`, bgcolor: '#fff', mb: 2,
        }}>
          <Typography sx={{
            fontSize: '0.68rem', fontWeight: 700, color: BRAND.muted,
            textTransform: 'uppercase', letterSpacing: '0.08em', mb: 1.25,
          }}>Contact</Typography>
          <Stack spacing={1.2}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Email sx={{ fontSize: 16, color: BRAND.sageText }} />
              <Typography sx={{ fontSize: '0.85rem', color: BRAND.ink }}>{applicant.email || '—'}</Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <Phone sx={{ fontSize: 16, color: BRAND.sageText }} />
              <Typography sx={{ fontSize: '0.85rem', color: BRAND.ink }}>
                {applicant.mobile_number || '—'}
                {applicant.alternate_mobile && (
                  <Box component="span" sx={{ color: BRAND.muted, ml: 1 }}>
                    (alt: {applicant.alternate_mobile})
                  </Box>
                )}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <LocationOn sx={{ fontSize: 16, color: BRAND.sageText }} />
              <Typography sx={{ fontSize: '0.85rem', color: BRAND.ink }}>{formatLocation(applicant)}</Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <WorkIcon sx={{ fontSize: 16, color: BRAND.sageText }} />
              <Typography sx={{ fontSize: '0.85rem', color: BRAND.ink }}>
                {formatExperience(applicant.years_of_experience)} of experience
              </Typography>
            </Stack>
            {(applicant.linkedin || applicant.github || applicant.behance) && (
              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ pt: 0.75, borderTop: `1px dashed ${BRAND.border}`, mt: 0.5 }}>
                {applicant.linkedin && (
                  <IconButton size="small" component="a" href={applicant.linkedin}
                    target="_blank" rel="noopener noreferrer"
                    sx={{ color: BRAND.sageText, '&:hover': { color: BRAND.navy, bgcolor: BRAND.sageSoft } }}>
                    <LinkedInIcon fontSize="small" />
                  </IconButton>
                )}
                {applicant.github && (
                  <IconButton size="small" component="a" href={applicant.github}
                    target="_blank" rel="noopener noreferrer"
                    sx={{ color: BRAND.sageText, '&:hover': { color: BRAND.navy, bgcolor: BRAND.sageSoft } }}>
                    <GitHubIcon fontSize="small" />
                  </IconButton>
                )}
                {applicant.behance && (
                  <IconButton size="small" component="a" href={applicant.behance}
                    target="_blank" rel="noopener noreferrer"
                    sx={{ color: BRAND.sageText, '&:hover': { color: BRAND.navy, bgcolor: BRAND.sageSoft } }}>
                    <PublicIcon fontSize="small" />
                  </IconButton>
                )}
              </Stack>
            )}
          </Stack>
        </Paper>

        {/* Skills */}
        {skills.length > 0 && (
          <Paper elevation={0} sx={{
            p: 2.5, borderRadius: '14px', border: `1px solid ${BRAND.border}`, bgcolor: '#fff', mb: 2,
          }}>
            <Typography sx={{
              fontSize: '0.68rem', fontWeight: 700, color: BRAND.muted,
              textTransform: 'uppercase', letterSpacing: '0.08em', mb: 1.25,
            }}>Skills</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6 }}>
              {skills.map((skill) => (
                <Chip key={skill} label={skill} size="small"
                  sx={{
                    bgcolor: BRAND.sageSoft, color: BRAND.sageText,
                    fontSize: '0.72rem', fontWeight: 600, height: 24, borderRadius: '8px',
                    border: `1px solid rgba(127,158,126,0.28)`, fontFamily: FONT,
                  }} />
              ))}
            </Box>
          </Paper>
        )}

        {/* Education */}
        {detailLoading ? (
          <Paper elevation={0} sx={{
            p: 2, borderRadius: '14px', border: `1px solid ${BRAND.border}`, bgcolor: '#fff', mb: 2,
          }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <CircularProgress size={14} sx={{ color: BRAND.sage }} />
              <Typography sx={{ fontSize: '0.78rem', color: BRAND.muted }}>Loading more details…</Typography>
            </Stack>
          </Paper>
        ) : education.length > 0 && (
          <Paper elevation={0} sx={{
            p: 2.5, borderRadius: '14px', border: `1px solid ${BRAND.border}`, bgcolor: '#fff', mb: 2,
          }}>
            <Typography sx={{
              fontSize: '0.68rem', fontWeight: 700, color: BRAND.muted,
              textTransform: 'uppercase', letterSpacing: '0.08em', mb: 1.25,
            }}>Education</Typography>
            <Stack spacing={1.5}>
              {education.map((edu, idx) => (
                <Stack key={idx} direction="row" spacing={1} alignItems="flex-start">
                  <School sx={{ fontSize: 18, color: BRAND.sageText, mt: 0.15, flexShrink: 0 }} />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: '0.88rem', color: BRAND.navy, fontWeight: 600 }}>
                      {edu.degree_level || '—'}
                      {edu.field_of_study && <span> · {edu.field_of_study}</span>}
                    </Typography>
                    <Typography sx={{ fontSize: '0.76rem', color: BRAND.muted, mt: 0.25 }}>
                      {edu.university || '—'}
                      {edu.graduation_year && <span> · {edu.graduation_year}</span>}
                    </Typography>
                  </Box>
                </Stack>
              ))}
            </Stack>
          </Paper>
        )}

        {/* Cover letter */}
        {applicant.cover_letter && (
          <Paper elevation={0} sx={{
            p: 2.5, borderRadius: '14px', border: `1px solid ${BRAND.border}`, bgcolor: '#fff', mb: 2,
          }}>
            <Typography sx={{
              fontSize: '0.68rem', fontWeight: 700, color: BRAND.muted,
              textTransform: 'uppercase', letterSpacing: '0.08em', mb: 1.25,
            }}>Cover Letter</Typography>
            <Typography sx={{
              fontSize: '0.86rem', color: BRAND.ink, lineHeight: 1.6, whiteSpace: 'pre-wrap',
            }}>
              {applicant.cover_letter}
            </Typography>
          </Paper>
        )}

        {/* Application meta */}
        {(applicant.notice_period || applicant.available_to_join || expectedCtc) && (
          <Paper elevation={0} sx={{
            p: 2.5, borderRadius: '14px', border: `1px solid ${BRAND.border}`, bgcolor: '#fff', mb: 1,
          }}>
            <Typography sx={{
              fontSize: '0.68rem', fontWeight: 700, color: BRAND.muted,
              textTransform: 'uppercase', letterSpacing: '0.08em', mb: 1.5,
            }}>Application details</Typography>
            <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
              {applicant.notice_period && (
                <Box>
                  <Typography sx={{ fontSize: '0.66rem', color: BRAND.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Notice
                  </Typography>
                  <Typography sx={{ fontSize: '0.9rem', color: BRAND.navy, fontWeight: 700, mt: 0.4 }}>
                    {applicant.notice_period}
                  </Typography>
                </Box>
              )}
              {applicant.available_to_join && (
                <Box>
                  <Typography sx={{ fontSize: '0.66rem', color: BRAND.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Available
                  </Typography>
                  <Typography sx={{ fontSize: '0.9rem', color: BRAND.navy, fontWeight: 700, mt: 0.4 }}>
                    {applicant.available_to_join}
                  </Typography>
                </Box>
              )}
              {expectedCtc && (
                <Box>
                  <Typography sx={{ fontSize: '0.66rem', color: BRAND.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Expected CTC
                  </Typography>
                  <Typography sx={{ fontSize: '0.9rem', color: BRAND.sageText, fontWeight: 700, mt: 0.4 }}>
                    {expectedCtc}
                  </Typography>
                </Box>
              )}
            </Stack>
          </Paper>
        )}
      </DialogContent>

      <DialogActions sx={{
        px: 3, py: 2, borderTop: `1px solid ${BRAND.border}`, bgcolor: '#fff',
        justifyContent: 'space-between',
      }}>
        <Button onClick={onClose}
          sx={{
            textTransform: 'none', color: BRAND.muted, fontFamily: FONT,
            fontWeight: 600, borderRadius: '10px', px: 2,
            '&:hover': { bgcolor: BRAND.sageSoft, color: BRAND.navy },
          }}>
          Close
        </Button>
        {(applicant.resume_url || applicant.resume_s3_key) && (
          <Button variant="contained" disableElevation startIcon={<OpenInNew />}
            onClick={() => window.open(`/api/jobs/application/${applicant.id}/document/resume`, '_blank')}
            sx={{
              textTransform: 'none', bgcolor: BRAND.navy, color: '#fff', fontFamily: FONT,
              '&:hover': { bgcolor: BRAND.navyDark },
              borderRadius: '10px', px: 2.5, fontWeight: 700,
              boxShadow: '0 4px 12px rgba(2,33,36,0.22)',
            }}>
            View Resume
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   Applicant CARD (grid view)
   ══════════════════════════════════════════════════════════════════════════ */
const ApplicantCard = ({ applicant, onView, onMenuOpen }) => {
  const avatarColor = getAvatarColor(applicant.full_name || applicant.email);
  const statusCfg   = getStatusConfig(applicant.application_status);
  const skills      = Array.isArray(applicant.custom_skills) ? applicant.custom_skills : [];
  const matchScore  = typeof applicant.match_score === 'number' ? applicant.match_score : null;
  const withdrawn   = applicant.application_status === 'WITHDRAWN';

  return (
    <Card
      onClick={() => onView(applicant)}
      elevation={0}
      sx={{
        position: 'relative', cursor: 'pointer', height: '100%',
        display: 'flex', flexDirection: 'column',
        borderRadius: '16px', bgcolor: BRAND.surface, overflow: 'hidden',
        border: `1px solid ${BRAND.border}`, fontFamily: FONT,
        boxShadow: '0 10px 26px rgba(2,33,36,0.06)',
        transition: 'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 22px 48px -18px rgba(2,33,36,0.16)',
          borderColor: BRAND.sage,
        },
      }}
    >
      <Box sx={{ p: '18px 20px 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header — avatar + name (with skill tooltip) + applied-time */}
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', pr: 5 }}>
          {applicant.application_photo_url ? (
            <Avatar src={applicant.application_photo_url} sx={{ width: 46, height: 46 }} />
          ) : (
            <Avatar sx={{
              bgcolor: avatarColor.bg, color: avatarColor.fg,
              width: 46, height: 46, fontSize: '1rem', fontWeight: 700, fontFamily: FONT,
            }}>
              {getInitials(applicant.full_name)}
            </Avatar>
          )}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography noWrap sx={{
              fontSize: '1rem', fontWeight: 800, color: BRAND.ink,
              letterSpacing: '-0.015em', lineHeight: 1.25,
              display: 'inline-block', maxWidth: '100%',
            }}>
              {applicant.full_name || '—'}
            </Typography>
            <Typography noWrap sx={{ fontSize: '0.75rem', color: BRAND.muted, mt: 0.2, fontWeight: 500 }}>
              {formatRelativeTime(applicant.applied_at)}
            </Typography>
          </Box>
        </Stack>

        {/* Status + match score */}
        <Stack direction="row" spacing={0.6} sx={{ mt: 1.25, flexWrap: 'wrap' }}>
          <Box sx={{
            display: 'inline-flex', alignItems: 'center', gap: 0.4,
            px: 0.85, py: 0.25, borderRadius: '999px',
            bgcolor: statusCfg.bg, color: statusCfg.color,
            border: `1px solid ${statusCfg.bdr}`,
            fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: statusCfg.color }} />
            {statusCfg.label}
          </Box>
          {matchScore !== null && (() => {
            const t = scoreTint(matchScore);
            return (
              <Box sx={{
                display: 'inline-flex', alignItems: 'center', gap: 0.4,
                px: 0.85, py: 0.25, borderRadius: '999px',
                bgcolor: t.bg, color: t.fg,
                fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}>
                <StarRounded sx={{ fontSize: 11 }} />
                {toScore10(matchScore)} match
              </Box>
            );
          })()}
        </Stack>

     
        <Stack spacing={0.85} sx={{ mt: 1.5 }}>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
            <LocationOn sx={{ fontSize: 15, color: BRAND.faint, flexShrink: 0 }} />
            <Typography noWrap sx={{ fontSize: '0.8rem', color: BRAND.muted, fontWeight: 500, minWidth: 0 }}>
              {formatLocation(applicant)}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
            <WorkIcon sx={{ fontSize: 15, color: BRAND.faint, flexShrink: 0 }} />
            <Typography sx={{ fontSize: '0.8rem', color: BRAND.muted, fontWeight: 500 }}>
              {formatExperience(applicant.years_of_experience)}
            </Typography>
          </Stack>
          {applicant.notice_period && (
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
              <TimerOutlined sx={{ fontSize: 15, color: BRAND.faint, flexShrink: 0 }} />
              <Typography sx={{ fontSize: '0.8rem', color: BRAND.muted, fontWeight: 500 }}>
                Notice: {applicant.notice_period}
              </Typography>
            </Stack>
          )}
        </Stack>

        <Box sx={{ mt: 'auto', pt: 2.25 }}>
          <Box sx={{
            pt: 1.5, borderTop: `1px dashed ${BRAND.border}`,
            display: 'flex', flexDirection: 'column', gap: 1.5,
          }}>
            <Stack direction="row" spacing={0.6} sx={{ alignItems: 'center', minWidth: 0 }}>
              <Email sx={{ fontSize: 14, color: BRAND.sageText, flexShrink: 0 }} />
              <Typography noWrap sx={{ fontSize: '0.75rem', color: BRAND.muted, fontWeight: 500, minWidth: 0 }}>
                {applicant.email || '—'}
              </Typography>
            </Stack>
            {withdrawn ? (
              <Chip label="Withdrawn by candidate" size="small"
                sx={{
                  bgcolor: '#F0F2ED', color: BRAND.muted, fontWeight: 700,
                  fontSize: '0.68rem', height: 28, cursor: 'default',
                  alignSelf: 'flex-start',
                }} />
            ) : (
              <Button
                fullWidth
                endIcon={<KeyboardArrowDown sx={{ fontSize: 16 }} />}
                onClick={(e) => {
                  e.stopPropagation();
                 
                  onMenuOpen(e.currentTarget, applicant);
                }}
                sx={{
                  textTransform: 'none', color: '#fff', bgcolor: BRAND.navy,
                  borderRadius: '999px', fontFamily: FONT,
                  fontSize: '0.78rem', fontWeight: 700, height: 36,
                  boxShadow: '0 2px 8px rgba(2,33,36,0.22)',
                  '&:hover': { bgcolor: BRAND.sage, boxShadow: '0 4px 12px rgba(127,158,126,0.4)' },
                }}>
                Progress
              </Button>
            )}
          </Box>
        </Box>
      </Box>
    </Card>
  );
};

const ListRowProgressButton = ({ withdrawn, applicant, onMenuOpen, compact = false }) => (
  withdrawn ? (
    <Chip label="Withdrawn" size="small"
      sx={{
        bgcolor: '#F0F2ED', color: BRAND.muted,
        fontWeight: 700, fontSize: '0.65rem', height: 26, cursor: 'default',
      }} />
  ) : (
    <Button
      endIcon={<KeyboardArrowDown sx={{ fontSize: 16 }} />}
      onClick={(e) => {
        e.stopPropagation();
        onMenuOpen(e.currentTarget, applicant);
      }}
      sx={{
        textTransform: 'none', color: '#fff', bgcolor: BRAND.navy,
        borderRadius: '999px', fontFamily: FONT,
        fontSize: compact ? '0.72rem' : '0.78rem', fontWeight: 700,
        px: compact ? 1.5 : 2, height: compact ? 30 : 32, minWidth: 0,
        boxShadow: '0 2px 8px rgba(2,33,36,0.22)',
        '&:hover': { bgcolor: BRAND.sage, boxShadow: '0 4px 12px rgba(127,158,126,0.4)' },
      }}>
      Progress
    </Button>
  )
);

const ApplicantListRow = ({ applicant, onView, onMenuOpen }) => {
  const avatarColor = getAvatarColor(applicant.full_name || applicant.email);
  const statusCfg   = getStatusConfig(applicant.application_status);
  const skills      = Array.isArray(applicant.custom_skills) ? applicant.custom_skills : [];
  const matchScore  = typeof applicant.match_score === 'number' ? applicant.match_score : null;
  const qiScore     = typeof applicant.quick_interview_score === 'number' ? applicant.quick_interview_score : null;
  const withdrawn   = applicant.application_status === 'WITHDRAWN';

  const StatusPill = () => (
    <Box sx={{
      display: 'inline-flex', alignItems: 'center', gap: 0.4,
      px: 0.85, py: 0.25, borderRadius: '999px',
      bgcolor: statusCfg.bg, color: statusCfg.color,
      border: `1px solid ${statusCfg.bdr}`,
      fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.04em',
      textTransform: 'uppercase', whiteSpace: 'nowrap',
    }}>
      <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: statusCfg.color }} />
      {statusCfg.label}
    </Box>
  );

  const ScoreChip = ({ label, n }) => {
    if (n === null || n === undefined) {
      return <Typography sx={{ fontSize: '0.85rem', color: BRAND.faint }}>—</Typography>;
    }
    const t = scoreTint(n);
    return (
      <Box sx={{
        display: 'inline-flex', alignItems: 'center', gap: 0.3,
        px: 0.85, py: 0.3, borderRadius: '8px',
        bgcolor: t.bg, color: t.fg,
        fontSize: '0.72rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap',
      }}>
        {label === 'match' && <StarRounded sx={{ fontSize: 11 }} />}
        {label === 'match' ? toScore10(n) : n}
      </Box>
    );
  };


  return (
    <Card onClick={() => onView(applicant)} elevation={0} sx={{
      cursor: 'pointer', fontFamily: FONT,
      borderRadius: '14px', bgcolor: BRAND.surface,
      border: `1px solid ${BRAND.border}`,
      transition: 'all 0.2s ease',
      '&:hover': { borderColor: BRAND.sage, boxShadow: '0 6px 20px rgba(2,33,36,0.08)' },
      '& .MuiTypography-root': { fontFamily: FONT },
    }}>
      {/* ── Desktop grid (md+) — 7 columns ─────────────────────── */}
      <Box sx={{
        display: { xs: 'none', md: 'grid' },
        gridTemplateColumns: '2.3fr 1.5fr 1fr 0.7fr 0.7fr 0.85fr 130px',
        alignItems: 'center', px: 2.5, py: 1.75, gap: 2,
      }}>
        {/* Col 1: Avatar + name (skill tooltip) + city */}
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minWidth: 0 }}>
          {applicant.application_photo_url ? (
            <Avatar src={applicant.application_photo_url} sx={{ width: 42, height: 42, flexShrink: 0 }} />
          ) : (
            <Avatar sx={{
              bgcolor: avatarColor.bg, color: avatarColor.fg,
              width: 42, height: 42, fontSize: '0.9rem', fontWeight: 700, fontFamily: FONT,
              flexShrink: 0,
            }}>
              {getInitials(applicant.full_name)}
            </Avatar>
          )}
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography noWrap sx={{
              fontSize: '0.95rem', fontWeight: 800, color: BRAND.ink,
              letterSpacing: '-0.01em', lineHeight: 1.25,
              display: 'inline-block', maxWidth: '100%',
            }}>
              {applicant.full_name || '—'}
            </Typography>
            <Stack direction="row" spacing={0.4} sx={{ alignItems: 'center', mt: 0.2 }}>
              <LocationOn sx={{ fontSize: 12, color: BRAND.faint, flexShrink: 0 }} />
              <Typography noWrap sx={{ fontSize: '0.72rem', color: BRAND.muted, fontWeight: 500 }}>
                {formatLocation(applicant)}
              </Typography>
            </Stack>
          </Box>
        </Stack>

        {/* Col 2: Contact — email + phone */}
        <Box sx={{ minWidth: 0 }}>
          <Typography noWrap sx={{ fontSize: '0.8rem', color: BRAND.ink, fontWeight: 500 }}>
            {applicant.email || '—'}
          </Typography>
          <Typography noWrap sx={{ fontSize: '0.72rem', color: BRAND.muted, mt: 0.25 }}>
            {applicant.mobile_number || '—'}
          </Typography>
        </Box>

        {/* Col 3: Experience + notice period */}
        <Box>
          <Typography sx={{ fontSize: '0.85rem', color: BRAND.navy, fontWeight: 700 }}>
            {formatExperience(applicant.years_of_experience)}
          </Typography>
          {applicant.notice_period && (
            <Typography sx={{ fontSize: '0.72rem', color: BRAND.muted, mt: 0.25 }}>
              Notice: {applicant.notice_period}
            </Typography>
          )}
        </Box>

        {/* Col 4: Match score (resume ↔ JD) */}
        <Tooltip title="Resume ↔ JD match score" arrow placement="top">
          <Box><ScoreChip label="match" n={matchScore} /></Box>
        </Tooltip>

        {/* Col 5: Quick interview score */}
        <Box>
          {qiScore !== null ? (
            <Tooltip title="Quick interview score" arrow placement="top">
              <Box><ScoreChip label="quick" n={qiScore} /></Box>
            </Tooltip>
          ) : (
            <Typography sx={{ fontSize: '0.85rem', color: BRAND.faint }}>—</Typography>
          )}
        </Box>

        {/* Col 6: Status + applied time */}
        <Stack spacing={0.5} sx={{ alignItems: 'flex-start' }}>
          <StatusPill />
          <Tooltip title={applicant.applied_at ? new Date(applicant.applied_at).toLocaleString('en-IN') : ''} arrow>
            <Typography sx={{ fontSize: '0.72rem', color: BRAND.muted, fontWeight: 500 }}>
              {formatRelativeTime(applicant.applied_at)}
            </Typography>
          </Tooltip>
        </Stack>

        {/* Col 7: Progress button */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <ListRowProgressButton withdrawn={withdrawn} applicant={applicant} onMenuOpen={onMenuOpen} />
        </Box>
      </Box>

      {/* ── Mobile / small (xs–sm) — stacked card layout ───────────── */}
      <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', p: 2, gap: 1.25 }}>
        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'flex-start' }}>
          {applicant.application_photo_url ? (
            <Avatar src={applicant.application_photo_url} sx={{ width: 40, height: 40, flexShrink: 0 }} />
          ) : (
            <Avatar sx={{
              bgcolor: avatarColor.bg, color: avatarColor.fg,
              width: 40, height: 40, fontSize: '0.9rem', fontWeight: 700, flexShrink: 0,
            }}>
              {getInitials(applicant.full_name)}
            </Avatar>
          )}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography noWrap sx={{
              fontSize: '0.95rem', fontWeight: 800, color: BRAND.ink,
              letterSpacing: '-0.01em', lineHeight: 1.25,
            }}>
              {applicant.full_name || '—'}
            </Typography>
            <Typography noWrap sx={{ fontSize: '0.72rem', color: BRAND.muted, mt: 0.2 }}>
              {formatLocation(applicant)} · {formatExperience(applicant.years_of_experience)}
            </Typography>
          </Box>
          <StatusPill />
        </Stack>

        <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
          {matchScore !== null && <ScoreChip label="match" n={matchScore} />}
          {qiScore !== null && <ScoreChip label="quick" n={qiScore} />}
          {applicant.notice_period && (
            <Box sx={{
              px: 0.85, py: 0.3, borderRadius: '8px',
              bgcolor: BRAND.sageSoft, color: BRAND.sageText,
              fontSize: '0.7rem', fontWeight: 600, whiteSpace: 'nowrap',
            }}>
              Notice: {applicant.notice_period}
            </Box>
          )}
        </Stack>

        <Box sx={{
          pt: 1, borderTop: `1px dashed ${BRAND.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1,
        }}>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', minWidth: 0 }}>
            <Email sx={{ fontSize: 13, color: BRAND.sageText, flexShrink: 0 }} />
            <Typography noWrap sx={{ fontSize: '0.72rem', color: BRAND.muted, fontWeight: 500 }}>
              {applicant.email || '—'}
            </Typography>
          </Stack>
          <ListRowProgressButton withdrawn={withdrawn} applicant={applicant} onMenuOpen={onMenuOpen} compact />
        </Box>
      </Box>
    </Card>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════════════════════════════════ */
const JobApplicants = () => {
  const { jobId } = useParams();
  const navigate  = useNavigate();
  const location  = useLocation();

  const jobInfo = location.state?.job || null;
  const stateJobName =
    jobInfo?.job_title || jobInfo?.title || jobInfo?.jobTitle || jobInfo?.Job_Title || '';

  const [search, setSearch]                       = useState('');
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [detailLoading, setDetailLoading]         = useState(false);
  const [menuAnchor, setMenuAnchor]               = useState(null);
  const [menuApplicant, setMenuApplicant]         = useState(null);

  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy]             = useState('recent');
  const [viewMode, setViewMode]         = useState(() => {
    
    try {
      const v = localStorage.getItem(LS_APPL_VIEW_MODE_KEY);
      return v === 'grid' || v === 'list' ? v : APPL_VIEW_DEFAULT;
    } catch {
      return APPL_VIEW_DEFAULT;
    }
  });
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  const [filters, setFilters] = useState({
    city: '',
    experienceRange: [0, 20],
    matchMin: 0,
    noticePeriods: [],
  });
  const [expDraft, setExpDraft] = useState(filters.experienceRange);
  const [matchDraft, setMatchDraft] = useState(filters.matchMin);
  useEffect(() => { setExpDraft(filters.experienceRange); }, [filters.experienceRange]);
  useEffect(() => { setMatchDraft(filters.matchMin); }, [filters.matchMin]);

  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const { applicants, jobTitle, loading, error, refresh, updateStatus } = useJobApplicants(jobId);

  /* ── Client-side filter + sort ─────────────────────────────────── */
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    const cityQ = filters.city.trim().toLowerCase();
    return applicants.filter((a) => {
      if (s) {
        const skills = Array.isArray(a.custom_skills) ? a.custom_skills : [];
        const hay = `${a.full_name || ''} ${a.email || ''} ${a.mobile_number || ''} ${skills.join(' ')}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      if (statusFilter !== 'all' && a.application_status !== statusFilter) return false;
      if (cityQ && !(`${a.city || ''} ${a.state || ''}`.toLowerCase().includes(cityQ))) return false;

      const exp = Number(a.years_of_experience ?? 0);
      if (exp < filters.experienceRange[0] || exp > filters.experienceRange[1]) return false;

      const m = typeof a.match_score === 'number' ? a.match_score : null;
      if (filters.matchMin > 0 && (m === null || m < filters.matchMin)) return false;

      if (filters.noticePeriods.length && !filters.noticePeriods.includes(a.notice_period)) return false;

      return true;
    });
  }, [applicants, search, statusFilter, filters]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    switch (sortBy) {
      case 'oldest':
        arr.sort((a, b) => new Date(a.applied_at || 0) - new Date(b.applied_at || 0));
        break;
      case 'match-high':
        arr.sort((a, b) => (Number(b.match_score ?? -1)) - (Number(a.match_score ?? -1)));
        break;
      case 'exp-high':
        arr.sort((a, b) => (Number(b.years_of_experience ?? 0)) - (Number(a.years_of_experience ?? 0)));
        break;
      case 'exp-low':
        arr.sort((a, b) => (Number(a.years_of_experience ?? 0)) - (Number(b.years_of_experience ?? 0)));
        break;
      case 'recent':
      default:
        arr.sort((a, b) => new Date(b.applied_at || 0) - new Date(a.applied_at || 0));
        break;
    }
    return arr;
  }, [filtered, sortBy]);

  /* Status pill counts computed over the full applicants list — every pill
     always shows its accurate count regardless of what the active pill is. */
  const counts = useMemo(() => {
    const acc = { all: applicants.length };
    STATUS_FILTER_OPTIONS.slice(1).forEach((o) => {
      acc[o.value] = applicants.filter((a) => a.application_status === o.value).length;
    });
    return acc;
  }, [applicants]);

  const effectivePageSize = pageSize === 'all' ? Math.max(sorted.length, 1) : pageSize;
  const totalPages        = Math.max(1, Math.ceil(sorted.length / effectivePageSize));

  useEffect(() => { if (page > totalPages) setPage(1); }, [totalPages, page]);
  useEffect(() => { setPage(1); }, [search, statusFilter, sortBy, filters, pageSize]);

  const paginated = useMemo(() => {
    const start = (page - 1) * effectivePageSize;
    return sorted.slice(start, start + effectivePageSize);
  }, [sorted, page, effectivePageSize]);

  const handlePageChange = (_, v) => {
    setPage(v);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack       = () => navigate('/employer/my-jobs');
  const handleClearSearch = () => setSearch('');

  const handleClearFilters = () => {
    setFilters({ city: '', experienceRange: [0, 20], matchMin: 0, noticePeriods: [] });
    setFilterDrawerOpen(false);
  };

  const activeFilterCount =
    (filters.city ? 1 : 0)
    + (filters.experienceRange[0] !== 0 || filters.experienceRange[1] !== 20 ? 1 : 0)
    + (filters.matchMin > 0 ? 1 : 0)
    + filters.noticePeriods.length;

  const toggleNotice = (v) => setFilters((prev) => ({
    ...prev,
    noticePeriods: prev.noticePeriods.includes(v)
      ? prev.noticePeriods.filter((x) => x !== v)
      : [...prev.noticePeriods, v],
  }));

  /* ── Detail dialog + progress menu ─────────────────────────────── */
  const handleViewDetail = async (summary) => {
    setSelectedApplicant(summary);
    setDetailLoading(true);
    try {
      const detail = await applicantService.getDetail(summary.id);
      setSelectedApplicant({
        ...summary,
        ...detail,
        // Preserve scores from summary if detail doesn't have them
        match_score: detail.match_score ?? summary.match_score,
        quick_interview_score: detail.quick_interview_score ?? summary.quick_interview_score,
        application_photo_url: detail.application_photo_url || summary.application_photo_url,
      });
    } catch { /* silent fallback — summary data stays */ }
    finally { setDetailLoading(false); }
  };
  const handleCloseDialog = () => { setSelectedApplicant(null); setDetailLoading(false); };

 const handleMenuOpen = (anchorEl, applicant) => {
    // anchorEl is the DOM node captured inside the Progress button's own onClick.
    setMenuAnchor(anchorEl);
    setMenuApplicant(applicant);
  };
  const handleMenuClose = () => { setMenuAnchor(null); setMenuApplicant(null); };

  const handleStatusChange = async (value) => {
    const applicant = menuApplicant;
    handleMenuClose();
    try { await updateStatus(applicant.id, value); }
    catch { /* hook handles refresh */ }
  };

  const filterChipSx = {
    bgcolor: BRAND.navySoft, color: BRAND.navy,
    border: `1px solid ${BRAND.navySoft}`,
    fontWeight: 500, fontSize: '0.8125rem', height: 30, borderRadius: 1,
    '& .MuiChip-deleteIcon': {
      color: BRAND.navy, opacity: 0.65, fontSize: 16,
      '&:hover': { opacity: 1, color: BRAND.navy },
    },
    '&:hover': { bgcolor: BRAND.navySoftHover },
  };

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      bgcolor: '#fff', borderRadius: 1.25, fontSize: '0.875rem',
      '& fieldset':                { borderColor: BRAND.border },
      '&:hover fieldset':          { borderColor: BRAND.borderStrong },
      '&.Mui-focused fieldset':    { borderColor: BRAND.navy, borderWidth: 1.5 },
    },
    '& .MuiInputLabel-root':       { fontSize: '0.875rem', color: BRAND.muted,
                                     '&.Mui-focused':      { color: BRAND.navy } },
  };

  const sliderSx = {
    color: BRAND.sage,
    '& .MuiSlider-thumb': {
      width: 18, height: 18, border: `2px solid #fff`,
      boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
      '&:hover, &.Mui-focusVisible': { boxShadow: `0 0 0 8px ${BRAND.navySoft}` },
    },
    '& .MuiSlider-rail':  { color: BRAND.border, opacity: 1, height: 4 },
    '& .MuiSlider-track': { height: 4 },
  };

  const displayTitle = stateJobName || jobTitle || `Applicants for Job #${jobId}`;

  return (
    <Box sx={{
      p: { xs: 1.5, sm: 2, md: 3, lg: 4 },
      maxWidth: 1440, mx: 'auto', bgcolor: BRAND.bg, minHeight: '100vh',
      fontFamily: FONT,
      '& .MuiTypography-root, & .MuiButton-root, & .MuiToggleButton-root, & .MuiChip-root, & .MuiInputBase-root, & .MuiMenuItem-root, & .MuiPaginationItem-root': {
        fontFamily: FONT,
      },
    }}>

      {/* Back link */}
      <Button
        startIcon={<ArrowBackRounded sx={{ fontSize: 18 }} />}
        onClick={handleBack}
        sx={{
          color: BRAND.muted, textTransform: 'none',
          fontSize: '0.85rem', fontWeight: 600, mb: 1.5, ml: -1,
          borderRadius: '999px', px: 1.5,
          '&:hover': { bgcolor: BRAND.sageSoft, color: BRAND.navy },
        }}>
        Back to My Jobs
      </Button>

      {/* ══ COMMAND HEADER — mirrors MyJobs / FindJobs shape ═══════════ */}
      <Paper elevation={0} sx={{
        bgcolor: BRAND.surface, border: `1px solid ${BRAND.border}`,
        borderRadius: { xs: '14px', sm: '16px' },
        p: { xs: 2, sm: 2.5, md: 3 },
        mb: { xs: 2, md: 2.5 },
        boxShadow: '0 1px 2px rgba(16,18,16,0.04)',
      }}>
        {/* Row 1 — title + subline + refresh */}
        <Stack direction="row"
          sx={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5, mb: { xs: 2, md: 2.25 } }}>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography component="h1" sx={{
              fontFamily: "'DM Serif Display', serif",
              fontWeight: 400, color: BRAND.navy,
              letterSpacing: '-0.015em', lineHeight: 1.15,
              fontSize: { xs: '1.5rem', sm: '1.7rem', md: '1.9rem' },
            }}>
              {displayTitle}
            </Typography>
            <Stack direction="row" spacing={1.75} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 0.75 }}>
              {jobInfo?.job_location && (
                <Stack direction="row" spacing={0.4} alignItems="center">
                  <LocationOn sx={{ fontSize: 14, color: BRAND.faint }} />
                  <Typography sx={{ color: BRAND.muted, fontSize: '0.85rem', fontWeight: 500 }}>
                    {jobInfo.job_location}
                  </Typography>
                </Stack>
              )}
              {jobInfo?.job_type && (
                <Stack direction="row" spacing={0.4} alignItems="center">
                  <WorkIcon sx={{ fontSize: 14, color: BRAND.faint }} />
                  <Typography sx={{ color: BRAND.muted, fontSize: '0.85rem', fontWeight: 500 }}>
                    {jobInfo.job_type}
                  </Typography>
                </Stack>
              )}
              <Stack direction="row" spacing={0.4} alignItems="center">
                <GroupsRounded sx={{ fontSize: 14, color: BRAND.sageText }} />
                <Typography sx={{ fontSize: '0.85rem', fontWeight: 500, color: BRAND.muted }}>
                  <Box component="span" sx={{ color: BRAND.sageText, fontWeight: 800 }}>
                    {applicants.length}
                  </Box>
                  {' '}applicant{applicants.length !== 1 ? 's' : ''}
                </Typography>
              </Stack>
            </Stack>
          </Box>
          <Tooltip title="Refresh" arrow>
            <span>
              <IconButton
                onClick={refresh} disabled={loading} size="small"
                sx={{
                  color: BRAND.muted, border: `1px solid ${BRAND.borderStrong}`,
                  borderRadius: '9px', flexShrink: 0, mt: 0.25,
                  '&:hover': { bgcolor: BRAND.sageSoft, color: BRAND.navy, borderColor: BRAND.sage },
                }}>
                <RefreshOutlined sx={{ fontSize: 18 }} />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>

        {/* Row 2 — search + Filters */}
        <Stack direction="row" spacing={1} sx={{ alignItems: 'stretch', flexWrap: 'wrap', gap: 1 }}>
          <TextField
            placeholder="Search by name, email, phone, or skill"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: BRAND.muted, fontSize: 20 }} />
                  </InputAdornment>
                ),
                endAdornment: search ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={handleClearSearch}
                      sx={{ color: BRAND.muted, '&:hover': { color: BRAND.ink, bgcolor: 'rgba(16,18,16,0.05)' } }}>
                      <ClearRounded sx={{ fontSize: 18 }} />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              },
            }}
            sx={{
              flex: '1 1 300px', minWidth: { xs: '100%', sm: 260 },
              '& .MuiOutlinedInput-root': {
                bgcolor: BRAND.bg, borderRadius: '25px',
                fontSize: { xs: '0.88rem', sm: '0.92rem' },
                height: { xs: 46, md: 48 },
                color: BRAND.ink, fontFamily: FONT,
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                '& input::placeholder':        { color: BRAND.muted, opacity: 0.85 },
                '& fieldset':                   { borderColor: '#B0BEC5', borderWidth: '1.5px' },
                '&:hover fieldset':             { borderColor: '#78909C', borderWidth: '2px' },
                '&.Mui-focused':                { boxShadow: '0 6px 18px rgba(0,0,0,0.12)' },
                '&.Mui-focused fieldset':       { borderColor: BRAND.sage, borderWidth: '2px' },
              },
            }}
          />
          <Button
            variant="outlined"
            startIcon={
              <Badge badgeContent={activeFilterCount}
                sx={{ '& .MuiBadge-badge': {
                  bgcolor: BRAND.sage, color: '#fff',
                  fontSize: '0.65rem', height: 16, minWidth: 16, right: -3, top: -2, fontWeight: 800,
                } }}>
                <TuneRounded sx={{ fontSize: 18 }} />
              </Badge>
            }
            onClick={() => setFilterDrawerOpen(true)}
            sx={{
              bgcolor: BRAND.surface, borderColor: BRAND.borderStrong, color: BRAND.ink,
              textTransform: 'none', fontWeight: 600, fontSize: '0.9rem', px: 2.25,
              height: { xs: 46, md: 48 }, borderRadius: '12px', flexShrink: 0,
              '&:hover': { borderColor: BRAND.sage, bgcolor: BRAND.sageSoft },
            }}>
            Filters
          </Button>
        </Stack>

        {/* Row 3 — status pills + sort + view */}
        <Stack direction="row"
          sx={{ alignItems: 'center', mt: { xs: 1.75, md: 2 }, gap: 1, flexWrap: 'wrap' }}>
          <Box sx={{
            display: 'flex', gap: 0.75, alignItems: 'center',
            flexWrap: { xs: 'nowrap', sm: 'wrap' },
            overflowX: { xs: 'auto', sm: 'visible' },
            pb: { xs: 0.5, sm: 0 }, mr: 'auto',
            '&::-webkit-scrollbar': { display: 'none' },
          }}>
            {STATUS_FILTER_OPTIONS.map((opt) => {
              const chipCount = counts[opt.value] ?? 0;
              const selected  = statusFilter === opt.value;
              return (
                <Box
                  key={opt.value}
                  onClick={() => setStatusFilter(opt.value)}
                  role="button" tabIndex={0}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setStatusFilter(opt.value)}
                  sx={{
                    cursor: 'pointer', userSelect: 'none',
                    display: 'inline-flex', alignItems: 'center', gap: 0.6,
                    px: 1.5, py: 0.65, borderRadius: 999, flexShrink: 0,
                    fontSize: '0.8rem', fontWeight: selected ? 700 : 600,
                    fontFamily: FONT,
                    bgcolor: selected ? BRAND.navy : BRAND.surface,
                    color:   selected ? '#fff'     : BRAND.muted,
                    border: `1px solid ${selected ? BRAND.navy : BRAND.borderStrong}`,
                    transition: 'all 0.16s ease',
                    '&:hover': {
                      bgcolor: selected ? BRAND.navy : BRAND.bg,
                      borderColor: selected ? BRAND.navy : BRAND.muted,
                    },
                  }}>
                  {opt.label}
                  <Box component="span" sx={{
                    fontSize: '0.68rem', fontWeight: 800, lineHeight: 1.6,
                    px: 0.7, borderRadius: 999,
                    bgcolor: selected ? 'rgba(255,255,255,0.22)' : BRAND.bg,
                    color:   selected ? '#fff' : BRAND.muted,
                  }}>
                    {chipCount}
                  </Box>
                </Box>
              );
            })}
          </Box>

          <TextField
            select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
            sx={{
              minWidth: 180, flexShrink: 0,
              '& .MuiOutlinedInput-root': {
                bgcolor: BRAND.surface, borderRadius: '10px',
                fontSize: '0.82rem', height: 38, color: BRAND.ink, fontFamily: FONT,
                '& fieldset':                { borderColor: BRAND.borderStrong },
                '&:hover fieldset':          { borderColor: BRAND.muted },
                '&.Mui-focused fieldset':    { borderColor: BRAND.sage, borderWidth: 1.5 },
                '& .MuiSvgIcon-root':        { color: BRAND.muted },
              },
            }}>
            {SORT_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value} sx={{ fontSize: '0.85rem', fontFamily: FONT }}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>

          <ToggleButtonGroup
            value={viewMode} exclusive
            onChange={(e, newMode) => {
            
              if (!newMode) return;
              setViewMode(newMode);
              try { localStorage.setItem(LS_APPL_VIEW_MODE_KEY, newMode); } catch {}
            }}
            sx={{
              height: 38, flexShrink: 0,
              bgcolor: BRAND.bg, border: `1px solid ${BRAND.border}`,
              borderRadius: '10px', p: '3px',
              '& .MuiToggleButton-root': {
                border: 0, borderRadius: '7px !important', m: 0,
                color: BRAND.muted, px: 1.25, height: 30,
                '&:hover': { bgcolor: 'rgba(16,18,16,0.04)' },
                '&.Mui-selected': {
                  bgcolor: BRAND.surface, color: BRAND.navy,
                  boxShadow: '0 1px 3px rgba(16,18,16,0.12)',
                  '&:hover': { bgcolor: BRAND.surface },
                },
              },
            }}>
            <ToggleButton value="grid" aria-label="grid view"><ViewModule sx={{ fontSize: 18 }} /></ToggleButton>
            <ToggleButton value="list" aria-label="list view"><ViewList  sx={{ fontSize: 18 }} /></ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Paper>

      {/* ══ ERROR ══════════════════════════════════════════════ */}
      {error && (
        <Alert severity="error"
          sx={{ mb: 3, borderRadius: '12px', border: '1px solid', borderColor: 'error.light', fontFamily: FONT }}>
          {error}
          <Button size="small" onClick={refresh} startIcon={<RefreshOutlined sx={{ fontSize: 16 }} />}
            sx={{ ml: 1.5, textTransform: 'none', color: BRAND.navy, fontWeight: 700 }}>
            Try again
          </Button>
        </Alert>
      )}

      {/* ══ ACTIVE FILTER CHIPS ═══════════════════════════════ */}
      {activeFilterCount > 0 && (
        <Stack direction="row" spacing={1} sx={{ mb: 2.5, flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
          <Typography variant="caption" sx={{ color: BRAND.muted, fontWeight: 500, mr: 0.5 }}>
            Active filters:
          </Typography>
          {filters.city && (
            <Chip label={`City: ${filters.city}`} onDelete={() => setFilters((p) => ({ ...p, city: '' }))} sx={filterChipSx} />
          )}
          {(filters.experienceRange[0] !== 0 || filters.experienceRange[1] !== 20) && (
            <Chip label={`Exp: ${filters.experienceRange[0]}–${filters.experienceRange[1]} yrs`}
              onDelete={() => setFilters((p) => ({ ...p, experienceRange: [0, 20] }))} sx={filterChipSx} />
          )}
          {filters.matchMin > 0 && (
            <Chip label={`Match ≥ ${toScore10(filters.matchMin)}`}
              onDelete={() => setFilters((p) => ({ ...p, matchMin: 0 }))} sx={filterChipSx} />
          )}
          {filters.noticePeriods.map((n) => (
            <Chip key={n} label={`Notice: ${n}`}
              onDelete={() => setFilters((p) => ({ ...p, noticePeriods: p.noticePeriods.filter((x) => x !== n) }))}
              sx={filterChipSx} />
          ))}
          <Button size="small" onClick={handleClearFilters}
            sx={{
              textTransform: 'none', color: BRAND.muted,
              fontSize: '0.8125rem', fontWeight: 500, minWidth: 'auto',
              '&:hover': { color: BRAND.navy, bgcolor: 'transparent' },
            }}>
            Clear all
          </Button>
        </Stack>
      )}

      {/* ══ RESULTS ══════════════════════════════════════════ */}
      {loading ? (
        <Paper elevation={0} sx={{
          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
          minHeight: 420, borderRadius: 1.5, border: `1px solid ${BRAND.border}`, bgcolor: '#fff',
        }}>
          <CircularProgress size={36} sx={{ color: BRAND.sage }} />
          <Typography variant="body2" sx={{ mt: 2, color: BRAND.muted, fontSize: '0.875rem' }}>
            Loading applicants…
          </Typography>
        </Paper>
      ) : sorted.length === 0 ? (
        <Paper elevation={0} sx={{
          textAlign: 'center', py: 8, px: 3,
          borderRadius: 1.5, border: `1px solid ${BRAND.border}`, bgcolor: '#fff',
        }}>
          <Box sx={{
            width: 64, height: 64, borderRadius: '50%',
            bgcolor: BRAND.sageSoft, mx: 'auto', mb: 2.5,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <PersonSearchRounded sx={{ fontSize: 30, color: BRAND.sage }} />
          </Box>
          {search || activeFilterCount > 0 || statusFilter !== 'all' ? (
            <>
              <Typography variant="h6" sx={{ fontWeight: 700, color: BRAND.ink, mb: 0.75, fontSize: '1.0625rem' }}>
                No applicants match
              </Typography>
              <Typography variant="body2" sx={{ color: BRAND.muted, mb: 3, fontSize: '0.875rem' }}>
                Try adjusting your search, filters, or status pill
              </Typography>
              <Button variant="outlined"
                onClick={() => { setSearch(''); setStatusFilter('all'); handleClearFilters(); }}
                sx={{
                  borderColor: BRAND.navy, color: BRAND.navy,
                  textTransform: 'none', fontWeight: 600, px: 3, borderRadius: '10px',
                  '&:hover': { borderColor: BRAND.navyDark, bgcolor: BRAND.navySoft },
                }}>
                Clear everything
              </Button>
            </>
          ) : (
            <>
              <Typography variant="h6" sx={{ fontWeight: 700, color: BRAND.ink, mb: 0.75, fontSize: '1.0625rem' }}>
                No applicants yet
              </Typography>
              <Typography variant="body2" sx={{ color: BRAND.muted, mb: 3, fontSize: '0.875rem' }}>
                Once candidates start applying, they'll appear here
              </Typography>
            </>
          )}
        </Paper>
      ) : viewMode === 'grid' ? (
        /* ── GRID ── */
        <>
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, minmax(0, 1fr))',
              md: 'repeat(3, minmax(0, 1fr))',
              lg: 'repeat(4, minmax(0, 1fr))',
            },
            gap: { xs: 1.5, sm: 1.75, md: 2 },
          }}>
            {paginated.map((a) => (
              <Box key={a.id} sx={{ minWidth: 0 }}>
                <ApplicantCard applicant={a} onView={handleViewDetail} onMenuOpen={handleMenuOpen} />
              </Box>
            ))}
          </Box>
        </>
      ) : (
        /* ── LIST — card-per-row, mirrors jobseeker FindJobs list view ── */
        <>
          {/* ── Column header row (desktop only) ───────────────────── */}
          <Box sx={{
            display: { xs: 'none', md: 'grid' },
            gridTemplateColumns: '2.3fr 1.5fr 1fr 0.7fr 0.7fr 0.85fr 130px',
            alignItems: 'center', px: 2.5, py: 1, gap: 2, mb: 0.5,
          }}>
            {['Candidate', 'Contact', 'Experience', 'Resume-JD\nMatch Score', 'Quick Interview', 'Status', ''].map((h) => (
              <Typography key={h} sx={{
                fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.1em',
                textTransform: 'uppercase', color: BRAND.faint, fontFamily: FONT,
                ...(h === '' ? { textAlign: 'right' } : {}),
              }}>
                {h}
              </Typography>
            ))}
          </Box>
          <Stack spacing={1.25}>
            {paginated.map((a) => (
              <ApplicantListRow
                key={a.id}
                applicant={a}
                onView={handleViewDetail}
                onMenuOpen={handleMenuOpen}
              />
            ))}
          </Stack>
        </>
      )}

      {/* ══ PAGINATION ══════════════════════════════════════ */}
      {sorted.length > 0 && (
        <Box sx={{
          mt: { xs: 3, sm: 3.5, md: 4 },
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', sm: 'center' },
          gap: { xs: 1.5, sm: 2 },
        }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1, sm: 2 }}
            sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, flex: 1 }}>
            <Typography sx={{
              fontSize: { xs: '0.78rem', sm: '0.82rem' },
              color: BRAND.muted, fontWeight: 500, whiteSpace: 'nowrap',
            }}>
              Showing{' '}
              <Box component="span" sx={{ color: BRAND.ink, fontWeight: 700 }}>
                {(page - 1) * effectivePageSize + 1}–{Math.min(page * effectivePageSize, sorted.length)}
              </Box>
              {' '}of{' '}
              <Box component="span" sx={{ color: BRAND.ink, fontWeight: 700 }}>
                {sorted.length}
              </Box>
              {' '}applicant{sorted.length === 1 ? '' : 's'}
            </Typography>

            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
              <Typography sx={{ fontSize: { xs: '0.78rem', sm: '0.82rem' }, color: BRAND.muted, fontWeight: 500 }}>Show</Typography>
              <Select
                size="small" value={pageSize}
                onChange={(e) => { const v = e.target.value; setPageSize(v === 'all' ? 'all' : Number(v)); }}
                renderValue={(v) => (v === 'all' ? 'All' : v)}
                MenuProps={{ slotProps: { paper: { sx: {
                  borderRadius: '12px', mt: 0.5,
                  border: `1px solid ${BRAND.border}`,
                  boxShadow: '0 8px 24px rgba(2,33,36,0.12)',
                } } } }}
                sx={{
                  fontSize: '0.82rem', fontWeight: 700, fontFamily: FONT,
                  color: BRAND.navy, bgcolor: BRAND.bg, borderRadius: '10px',
                  minWidth: 80, height: 36,
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: BRAND.border },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: BRAND.navy },
                  '& .MuiSelect-select': { py: 0.75, pl: 1.25, pr: '28px !important' },
                  '& .MuiSvgIcon-root':  { color: BRAND.navy },
                }}>
                {PAGE_SIZE_OPTIONS.map((opt) => (
                  <MenuItem key={opt} value={opt}>{opt === 'all' ? 'All' : opt}</MenuItem>
                ))}
              </Select>
              <Typography sx={{ fontSize: { xs: '0.78rem', sm: '0.82rem' }, color: BRAND.muted, fontWeight: 500 }}>per page</Typography>
            </Stack>
          </Stack>

          <Pagination
            count={totalPages} page={page} onChange={handlePageChange}
            shape="rounded" siblingCount={1} boundaryCount={1} size="small"
            sx={{
              '& .MuiPaginationItem-root': {
                fontSize: '0.82rem', fontWeight: 600, fontFamily: FONT, color: BRAND.ink,
                borderRadius: '8px', border: `1px solid ${BRAND.border}`, bgcolor: BRAND.bg,
                minWidth: 36, height: 36,
                '&:hover':      { bgcolor: BRAND.navySoft, borderColor: BRAND.sage },
                '&.Mui-selected': {
                  bgcolor: BRAND.navy, color: '#fff', borderColor: BRAND.navy,
                  fontWeight: 700, boxShadow: '0 4px 12px rgba(2,33,36,0.2)',
                  '&:hover': { bgcolor: BRAND.navyDark },
                },
              },
              '& .MuiPaginationItem-ellipsis': { border: 'none', bgcolor: 'transparent' },
            }}
          />
        </Box>
      )}

      {/* ══ PROGRESS MENU ═══════════════════════════════════ */}
      <Menu
        anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        disableScrollLock
        slotProps={{ paper: { sx: {
          borderRadius: '12px', mt: 0.5, minWidth: 180,
          border: `1px solid ${BRAND.border}`,
          boxShadow: '0 12px 32px rgba(2,33,36,0.14)',
        } } }}
      >
        {ACTION_MENU_OPTIONS.map((opt) => (
          <MenuItem key={opt.label}
            onClick={() => {
              if (opt.type === 'view') { handleMenuClose(); handleViewDetail(menuApplicant); }
              else { handleStatusChange(opt.value); }
            }}
            sx={{
              fontSize: '0.85rem', color: BRAND.navy, py: 1, fontFamily: FONT,
              '&:hover': { bgcolor: BRAND.sageSoft },
            }}>
            {opt.label}
          </MenuItem>
        ))}
      </Menu>

      {/* ══ DETAIL DIALOG ═══════════════════════════════════ */}
      <ApplicantDetailDialog
        open={!!selectedApplicant}
        onClose={handleCloseDialog}
        applicant={selectedApplicant}
        detailLoading={detailLoading}
      />

      {/* ══ FILTER DRAWER ═══════════════════════════════════ */}
      <Drawer
        anchor="right" open={filterDrawerOpen} onClose={() => setFilterDrawerOpen(false)}
        slotProps={{ paper: { sx: {
          width: { xs: '100%', sm: 420 },
          bgcolor: '#fff', borderRadius: { xs: 0, sm: '20px 0 0 20px' },
          fontFamily: FONT,
        } } }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box sx={{
            px: 3, py: 2.5, borderBottom: `1px solid ${BRAND.border}`,
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
            bgcolor: BRAND.bg,
          }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Box sx={{
                width: 38, height: 38, borderRadius: 1.25,
                bgcolor: BRAND.navy,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(2,33,36,0.22)',
              }}>
                <TuneRounded sx={{ color: BRAND.sage, fontSize: 20 }} />
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: BRAND.ink, letterSpacing: '-0.01em' }}>
                  Refine Applicants
                </Typography>
                <Typography sx={{ fontSize: '0.75rem', color: BRAND.muted, mt: 0.25 }}>
                  {activeFilterCount > 0
                    ? `${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''} applied`
                    : 'Narrow down the results'}
                </Typography>
              </Box>
            </Stack>
            <IconButton size="small" onClick={() => setFilterDrawerOpen(false)}
              sx={{
                color: BRAND.muted, bgcolor: '#fff', border: `1px solid ${BRAND.border}`,
                '&:hover': { bgcolor: BRAND.navySoft, color: BRAND.navy, borderColor: BRAND.navy },
              }}>
              <CloseIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>

          <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 3 }}>
            <DrawerSection icon={<LocationOnOutlined sx={{ fontSize: 16 }} />} title="City">
              <TextField
                fullWidth placeholder="e.g. Hyderabad, Bengaluru"
                value={filters.city}
                onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                sx={inputSx}
              />
            </DrawerSection>

            <DrawerSection icon={<WorkHistoryOutlined sx={{ fontSize: 16 }} />} title="Experience">
              <Box sx={{ px: 0.5 }}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 1.5 }}>
                  <Box sx={{ px: 1.25, py: 0.5, borderRadius: 1, bgcolor: BRAND.navySoft, color: BRAND.navy, fontSize: '0.75rem', fontWeight: 600 }}>
                    {expDraft[0]} yrs
                  </Box>
                  <Typography sx={{ fontSize: '0.75rem', color: BRAND.muted, alignSelf: 'center' }}>to</Typography>
                  <Box sx={{ px: 1.25, py: 0.5, borderRadius: 1, bgcolor: BRAND.navySoft, color: BRAND.navy, fontSize: '0.75rem', fontWeight: 600 }}>
                    {expDraft[1]} yrs
                  </Box>
                </Stack>
                <Slider
                  value={expDraft}
                  onChange={(_, v) => setExpDraft(v)}
                  onChangeCommitted={(_, v) => setFilters((prev) => ({ ...prev, experienceRange: v }))}
                  valueLabelDisplay="auto" min={0} max={20} sx={sliderSx} />
              </Box>
            </DrawerSection>

            <DrawerSection icon={<StarRounded sx={{ fontSize: 16 }} />} title="Minimum match score">
              <Box sx={{ px: 0.5 }}>
                <Box sx={{
                  display: 'inline-block', px: 1.25, py: 0.5, borderRadius: 1,
                  bgcolor: BRAND.navySoft, color: BRAND.navy,
                  fontSize: '0.75rem', fontWeight: 600, mb: 1.5,
                }}>
                  {matchDraft === 0 ? 'Any' : `≥ ${toScore10(matchDraft)}`}
                </Box>
                <Slider
                  value={matchDraft}
                  onChange={(_, v) => setMatchDraft(v)}
                  onChangeCommitted={(_, v) => setFilters((prev) => ({ ...prev, matchMin: v }))}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(v) => toScore10(v)}
                  min={0} max={100} step={10} sx={sliderSx} />
              </Box>
            </DrawerSection>

            <Divider sx={{ borderColor: BRAND.border, mb: 3 }} />

            <DrawerSection icon={<TimerOutlined sx={{ fontSize: 16 }} />} title="Notice period" last>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                {NOTICE_PERIODS.map((n) => (
                  <Box key={n} onClick={() => toggleNotice(n)} sx={pillSx(filters.noticePeriods.includes(n))}>
                    {n}
                  </Box>
                ))}
              </Stack>
            </DrawerSection>
          </Box>

          <Box sx={{
            px: { xs: 2, sm: 3 }, py: { xs: 1.75, sm: 2.25 },
            pb: { xs: 'calc(1.75rem + env(safe-area-inset-bottom, 0px))', sm: 2.25 },
            borderTop: `1px solid ${BRAND.border}`, bgcolor: '#fff',
            display: 'flex', flexDirection: { xs: 'column-reverse', sm: 'row' },
            gap: { xs: 1, sm: 1.5 }, alignItems: 'stretch',
          }}>
            <Button
              onClick={handleClearFilters}
              sx={{
                textTransform: 'none', fontWeight: 600, color: BRAND.muted,
                fontSize: { xs: '0.82rem', sm: '0.875rem' },
                borderRadius: '12px', border: `1px solid ${BRAND.border}`,
                px: { xs: 2, sm: 2.5 }, py: { xs: 1.1, sm: 1.15 },
                minHeight: { xs: 44, sm: 'auto' },
                width: { xs: '100%', sm: 'auto' },
                '&:hover': { bgcolor: BRAND.navySoft, color: BRAND.navy, borderColor: BRAND.navy },
              }}>
              Reset all
            </Button>
            <Button
              variant="contained" fullWidth disableElevation
              onClick={() => setFilterDrawerOpen(false)}
              endIcon={<ArrowForwardRounded sx={{ fontSize: 16 }} />}
              sx={{
                textTransform: 'none', fontWeight: 700,
                bgcolor: BRAND.navy, color: '#fff',
                borderRadius: '12px',
                py: { xs: 1.15, sm: 1.2 },
                minHeight: { xs: 48, sm: 'auto' },
                fontSize: { xs: '0.88rem', sm: '0.9rem' },
                '&:hover': { bgcolor: BRAND.navyDark },
              }}>
              Apply filters
              {activeFilterCount > 0 && (
                <Box component="span" sx={{
                  ml: 1, px: 0.85, py: 0.1, borderRadius: 999,
                  bgcolor: 'rgba(127,158,126,0.3)', color: '#fff',
                  fontSize: '0.7rem', fontWeight: 800,
                }}>
                  {activeFilterCount}
                </Box>
              )}
            </Button>
          </Box>
        </Box>
      </Drawer>
    </Box>
  );
};

export default JobApplicants;