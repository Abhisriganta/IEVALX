

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Stack, Typography, Button, IconButton, Chip, CircularProgress, Tooltip,
} from '@mui/material';

import { QuickInterviewReportDialog } from './IdentitySections';
import { ConfirmDialog } from '../parts';
import quickInterviewService from '@/services/api/jobseeker/quickInterviewService';
import { QUICK_INTERVIEW_ROUTE, PHOTO_ACCEPT_ATTRIBUTE } from '@/constants/profileConstants';

// ── Scoped palette ─────────────────────────────────────────────────────────
const HERO_SAGE          = '#7F9E7E';
const HERO_SAGE_HOVER    = '#5E815D';
const HERO_SAGE_STRONG   = 'rgba(127,158,126,0.35)';
const HERO_SAGE_TINT     = 'rgba(127,158,126,0.15)';
const HERO_SAGE_BG       = 'rgba(127,158,126,0.15)';
const HERO_CHARCOAL      = '#273238';
const HERO_CHARCOAL_HOV  = 'rgba(39,50,56,0.85)';
const HERO_OFF_WHITE     = '#F7F7F7';
const HERO_WHITE         = '#FFFFFF';
const HERO_TEXT_MUTED    = 'rgba(39,50,56,0.6)';
const HERO_TEXT_DIM      = 'rgba(39,50,56,0.5)';
const HERO_BORDER        = 'rgba(39,50,56,0.1)';
const HERO_BORDER_STRONG = 'rgba(39,50,56,0.2)';
const HERO_ROW_DIVIDER   = 'rgba(39,50,56,0.12)';
const HERO_FONT          = "'DM Sans', system-ui, sans-serif";

const Icon = ({ children, size = 14, color = 'currentColor', strokeWidth = 2 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ flexShrink: 0 }}
  >
    {children}
  </svg>
);

const IconPin      = (p) => <Icon {...p}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></Icon>;
const IconBriefcase= (p) => <Icon {...p}><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></Icon>;
const IconPhone    = (p) => <Icon {...p}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></Icon>;
const IconMail     = (p) => <Icon {...p}><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/></Icon>;
const IconPencil   = (p) => <Icon {...p}><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></Icon>;
const IconCamera   = (p) => <Icon {...p}><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></Icon>;
const IconAlert    = (p) => <Icon {...p} strokeWidth={2.5}><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></Icon>;
const IconSparkle  = (p) => <Icon {...p}><path d="M12 2l1.9 5.8h6.1l-4.9 3.6 1.9 5.8-5-3.7-5 3.7 1.9-5.8-4.9-3.6h6.1z"/></Icon>;
const IconCheck    = (p) => <Icon {...p}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></Icon>;
const IconPlay     = (p) => <Icon {...p} strokeWidth={2.5}><polygon points="5 3 19 12 5 21 5 3"/></Icon>;
const IconReport   = (p) => <Icon {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></Icon>;
const IconTrash    = (p) => <Icon {...p}><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z"/></Icon>;


function totalExperienceLabel(employment = []) {
  const months = (employment || []).reduce(
    (sum, e) =>
      sum +
      (Number(e.total_experience_years)  || 0) * 12 +
      (Number(e.total_experience_months) || 0),
    0,
  );
  if (!months) return null;
  const yrs = Math.floor(months / 12);
  const mos = months % 12;
  const parts = [];
  if (yrs) parts.push(`${yrs} ${yrs === 1 ? 'yr' : 'yrs'}`);
  if (mos) parts.push(`${mos} mo`);
  return `${parts.join(' ')} exp`;
}

function locationLabel(basic) {
  const parts = [
    basic?.current_city || basic?.hometown,
    basic?.current_state,
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

function fullPhone(basic) {
  const p = basic?.phone_number;
  if (!p) return null;
  return `${basic?.country_code || ''} ${p}`.trim();
}


function formatUpdated(basic) {
  const raw = basic?.updated_at || basic?.last_updated;
  const d = raw ? new Date(raw) : null;
  if (d && !Number.isNaN(d.getTime())) {
    return `Updated ${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;
  }
  return null;
}

// ── Initials fallback for the avatar ───────────────────────────────────────
function computeInitials(basic) {
  const first = String(basic?.first_name || '').trim();
  const last  = String(basic?.last_name  || '').trim();
  const parts = [first, last].filter(Boolean);
  if (!parts.length) return '?';
  return parts.map((p) => p[0]?.toUpperCase() || '').join('').slice(0, 2);
}

// ============================================================================
// Component
// ============================================================================

export default function ProfileHeroCard({
  candidateId,
  basic,
  photoUrl,
  employment = [],
  quickInterview: quickInterviewProp,
  completion,
  personalEditor,
  photoEditor,
  scrollToSection,
}) {
  const navigate = useNavigate();

  // ── Derived identity ────────────────────────────────────────────────────
  const percent  = Math.max(0, Math.min(100, Number(completion?.percent) || 0));
  const missing  = Array.isArray(completion?.missing) ? completion.missing.slice(0, 3) : [];
  const initials = computeInitials(basic);
  const name     = [basic?.first_name, basic?.last_name].filter(Boolean).join(' ') || 'Complete your profile';
  const email    = basic?.email;
  const phone    = fullPhone(basic);
  const location = locationLabel(basic);
  const expLabel = totalExperienceLabel(employment);
  const updated  = formatUpdated(basic);

  // ── Ring stroke math ────────────────────────────────────────────────────
  const R  = 56;
  const C  = 2 * Math.PI * R;                        // 351.86…
  const dashOffset = C * (1 - percent / 100);

  const [quickInterview, setQuickInterview] = useState(quickInterviewProp);
  const [reportOpen,      setReportOpen]    = useState(false);
  const pollRef      = useRef(null);
  const pollCountRef = useRef(0);

  useEffect(() => {
    if (!quickInterviewProp) return;
    setQuickInterview((prev) => {
      // Don't regress a completed row we already fetched via polling
      if (prev?.status === 'completed' && quickInterviewProp?.status !== 'completed') {
        return prev;
      }
      return quickInterviewProp;
    });
  }, [quickInterviewProp]);

  const status     = quickInterview?.status || null;
  const isComplete = status === 'completed';
  const inProgress = status === 'started' || status === 'in_progress';
  const scores     = quickInterview?.scores || {};
  const overall    = scores.overall ?? null;
  const qiCandId   = quickInterview?.candidate_id ?? candidateId ?? null;

  // Poll every 5s while scoring. Cap at 30 attempts (~2.5 min) then give up.
  useEffect(() => {
    clearInterval(pollRef.current);
    pollCountRef.current = 0;
    if (!inProgress || !qiCandId) return undefined;

    const tick = async () => {
      pollCountRef.current += 1;
      if (pollCountRef.current > 60) {
        clearInterval(pollRef.current);
        return;
      }
      try {
        const history = await quickInterviewService.getHistory(qiCandId);
        const latest  = Array.isArray(history) ? history[0] : null;
        if (latest) setQuickInterview(latest);
      } catch { /* transient — keep polling */ }
    };
    pollRef.current = setInterval(tick, 5000);
    return () => clearInterval(pollRef.current);
  }, [inProgress, qiCandId]);

  const fmtScore     = (v) => (v == null ? '—' : Number(v).toFixed(1));
  const strengths    = Array.isArray(quickInterview?.ai_strengths)    ? quickInterview.ai_strengths    : [];
  const improvements = Array.isArray(quickInterview?.ai_improvements) ? quickInterview.ai_improvements : [];
  const summary      = quickInterview?.ai_summary || '';
  const pdfUrl       = quickInterview?.pdf_download_url || quickInterview?.pdf_url || '';
  const durationMin  = quickInterview?.duration_seconds
    ? Math.round(quickInterview.duration_seconds / 60)
    : null;
  const answered     = quickInterview?.answered_count ?? null;
  const totalQ       = quickInterview?.total_questions ?? null;

  // Enable View report as soon as the row is completed — even if PDF upload
  // failed, the on-screen breakdown still has value.
  const canViewReport = isComplete && (
    overall != null || summary || strengths.length || improvements.length || pdfUrl
  );

  const startInterview = () => navigate(`${QUICK_INTERVIEW_ROUTE}?quick=1`);

  // ── Renders ────────────────────────────────────────────────────────────

  return (
    <>
      {/* Hidden file input so the camera button on the ring works whether or
          not the standalone PhotoSection is on the page. Same editor ref → */}
      {/*  same onChange handler, no duplicate upload. */}
      {photoEditor && (
        <input
          ref={photoEditor.inputRef}
          type="file"
          accept={PHOTO_ACCEPT_ATTRIBUTE}
          onChange={photoEditor.onInputChange}
          style={{ display: 'none' }}
          aria-hidden="true"
        />
      )}

      <Box
        id="profile-hero"
        sx={{
          background: 'linear-gradient(135deg, #1C3A2D 0%, #3A5645 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
          borderRadius: 4,
          px: { xs: 3, sm: 4 },
          py: { xs: 3, sm: 3.5 },
          mb: { xs: 3, sm: 4 },
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Identity row */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          gap={{ xs: 2.5, sm: 3 }}
          sx={{ alignItems: { xs: 'center', sm: 'flex-start' }, position: 'relative' }}
        >
          {/* Avatar with completion ring */}
          <Box sx={{ position: 'relative', width: 120, height: 120, flexShrink: 0 }}>
            <svg
              width="120"
              height="120"
              style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }}
            >
              <circle
                cx="60" cy="60" r={R}
                fill="none"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="3"
              />
              <circle
                cx="60" cy="60" r={R}
                fill="none"
                stroke={HERO_OFF_WHITE}
                strokeWidth="3"
                strokeDasharray={C}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.4s ease' }}
              />
            </svg>

            <Box
              sx={{
                position: 'absolute', top: 8, left: 8,
                width: 104, height: 104, borderRadius: '50%',
                bgcolor: HERO_CHARCOAL,
                color: HERO_OFF_WHITE,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: HERO_FONT,
                fontSize: '2.25rem',
                fontWeight: 700,
                letterSpacing: '-0.5px',
                overflow: 'hidden',
                backgroundImage: photoUrl ? `url(${photoUrl})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              {photoUrl ? null : initials}
            </Box>

            {/* Percent chip anchored to the bottom of the ring */}
            <Box
              sx={{
                position: 'absolute',
                bottom: -4, left: '50%',
                transform: 'translateX(-50%)',
                bgcolor: HERO_CHARCOAL,
                color: HERO_OFF_WHITE,
                px: 1.25, py: 0.25,
                borderRadius: 12,
                fontFamily: HERO_FONT,
                fontSize: '0.75rem',
                fontWeight: 700,
                lineHeight: 1.4,
              }}
            >
              {percent}%
            </Box>
          </Box>

          {/* Name + updated + contact chips */}
          <Box sx={{ flex: 1, minWidth: 0, textAlign: { xs: 'center', sm: 'left' } }}>
            <Stack
              direction="row"
              gap={0.75}
              sx={{
                alignItems: 'center',
                justifyContent: { xs: 'center', sm: 'flex-start' },
              }}
            >
              <Typography
                component="h1"
                sx={{
                  fontFamily: HERO_FONT,
                  fontSize: { xs: '1.375rem', sm: '1.625rem' },
                  fontWeight: 700,
                  color: HERO_OFF_WHITE,
                  letterSpacing: '-0.5px',
                  lineHeight: 1.2,
                  wordBreak: 'break-word',
                }}
              >
                {name}
              </Typography>
              {personalEditor && (
                <Tooltip title="Edit personal details">
                  <IconButton
                    onClick={personalEditor.openEditor}
                    size="small"
                    aria-label="Edit personal details"
                    sx={{
                      color: 'rgba(247,247,247,0.6)',
                      p: 0.75,
                      '&:hover': { color: HERO_SAGE, bgcolor: 'rgba(127,158,126,0.2)' },
                    }}
                  >
                    <IconPencil size={14} />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>

            {updated && (
              <Typography
                sx={{
                  fontFamily: HERO_FONT,
                  fontSize: '0.75rem',
                  color: 'rgba(247,247,247,0.6)',
                  mt: 0.25,
                }}
              >
                {updated}
              </Typography>
            )}

            {/* Contact chips */}
            <Stack
              direction="row"
              sx={{
                mt: 1.75,
                flexWrap: 'wrap',
                columnGap: 2,
                rowGap: 1.5,
                justifyContent: { xs: 'center', sm: 'flex-start' },
              }}
            >
              {location && <ContactChip Icon={IconPin}       label={location} />}
              {expLabel && <ContactChip Icon={IconBriefcase} label={expLabel} />}
              {phone    && <ContactChip Icon={IconPhone}     label={phone} />}
            </Stack>
            {email && (
              <Stack
                direction="row"
                sx={{
                  mt: 1,
                  flexWrap: 'wrap',
                  justifyContent: { xs: 'center', sm: 'flex-start' },
                }}
              >
                <ContactChip Icon={IconMail} label={email} />
              </Stack>
            )}

            {/* Photo actions — Change / Remove — right-aligned, above the divider */}
            {photoEditor && (
              <Stack
                direction="row"
                gap={2}
                sx={{
                  mt: 2,
                  justifyContent: { xs: 'center', sm: 'flex-end' },
                  flexWrap: 'wrap',
                }}
              >
                <Button
                  onClick={photoEditor.pick}
                  disabled={photoEditor.uploading}
                  startIcon={<IconCamera size={13} />}
                  sx={{
                    fontFamily: HERO_FONT,
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    color: HERO_OFF_WHITE,
                    bgcolor: 'rgba(255,255,255,0.18)',
                    borderRadius: 2,
                    px: 1.75, py: 0.85,
                    whiteSpace: 'nowrap',
                    boxShadow: 'none',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.28)', boxShadow: 'none' },
                    '&.Mui-disabled': { color: HERO_OFF_WHITE, bgcolor: 'rgba(255,255,255,0.12)' },
                  }}
                >
                  {photoEditor.hasPhoto ? 'Change photo' : 'Add photo'}
                </Button>

                {photoEditor.hasPhoto && (
                  <Button
                    onClick={() => photoEditor.setConfirmRemove(true)}
                    disabled={photoEditor.uploading}
                    startIcon={<IconTrash size={12} />}
                    sx={{
                      fontFamily: HERO_FONT,
                      textTransform: 'none',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      color: HERO_OFF_WHITE,
                      bgcolor: 'transparent',
                      border: '1px solid rgba(255,255,255,0.25)',
                      borderRadius: 2,
                      px: 1.5, py: 0.75,
                      whiteSpace: 'nowrap',
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.08)',
                        borderColor: HERO_OFF_WHITE,
                      },
                    }}
                  >
                    Remove
                  </Button>
                )}
              </Stack>
            )}
          </Box>
        </Stack>

        {/* ── Missing-section nudges ──────────────────────────────────── */}
        {missing.length > 0 && (
          <Box
            sx={{
              mt: 2.75,
              pt: 2.25,
              borderTop: '1px dashed rgba(255,255,255,0.15)',
            }}
          >
            <Stack direction="row" gap={1.25} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.6,
                  bgcolor: 'rgba(255,255,255,0.1)',
                  color: HERO_OFF_WHITE,
                  px: 1.25, py: 0.6,
                  borderRadius: 1,
                  fontFamily: HERO_FONT,
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  letterSpacing: '0.4px',
                }}
              >
                <IconAlert size={10} color={HERO_SAGE} />
                {missing.length} MISSING
              </Box>
              {missing.map((section) => (
                <Button
                  key={section.id}
                  onClick={() => scrollToSection?.(section.id)}
                  sx={{
                    fontFamily: HERO_FONT,
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                    color: HERO_OFF_WHITE,
                    bgcolor: 'rgba(127,158,126,0.12)',
                    border: `1px solid ${HERO_SAGE_STRONG}`,
                    borderRadius: 16,
                    px: 1.5,
                    py: 0.6,
                    textTransform: 'none',
                    lineHeight: 1,
                    minWidth: 0,
                    '&:hover': { bgcolor: 'rgba(127,158,126,0.2)', borderColor: HERO_SAGE },
                  }}
                >
                  {section.label}
                  <Box component="span" sx={{ color: HERO_SAGE_HOVER, fontWeight: 700, ml: 0.75 }}>
                    +{section.weight}%
                  </Box>
                </Button>
              ))}
            </Stack>
          </Box>
        )}

        {/* ── Quick interview module ──────────────────────────────────── */}
        <Box
          sx={{
            mt: 2.5,
            p: 2,
            bgcolor: HERO_WHITE,
            border: `1px solid ${HERO_BORDER}`,
            borderRadius: 2.5,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2,
          }}
        >
          <Stack
            direction="row"
            gap={1.75}
            sx={{ alignItems: 'center', flex: 1, minWidth: 0 }}
          >
            <Box
              sx={{
                width: 44, height: 44,
                borderRadius: 1.5,
                bgcolor: HERO_SAGE_TINT,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {isComplete
                ? <IconCheck   size={22} color={HERO_SAGE} />
                : <IconSparkle size={22} color={HERO_SAGE} />}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Stack
                direction="row"
                gap={1}
                sx={{ alignItems: 'center', flexWrap: 'wrap' }}
              >
                <Typography
                  sx={{
                    fontFamily: HERO_FONT,
                    fontSize: '0.9375rem',
                    fontWeight: 700,
                    color: HERO_CHARCOAL,
                  }}
                >
                  10-minute quick interview
                </Typography>

                {isComplete && overall != null && (
                  <Chip
                    label={`Score ${fmtScore(overall)} / 10`}
                    size="small"
                    sx={{
                      height: 22,
                      fontSize: '0.6875rem',
                      fontFamily: HERO_FONT,
                      fontWeight: 700,
                      bgcolor: HERO_SAGE_TINT,
                      color: HERO_SAGE_HOVER,
                      border: `1px solid ${HERO_SAGE_STRONG}`,
                    }}
                  />
                )}
                {!isComplete && !inProgress && (
                  <Chip
                    label="10 min"
                    size="small"
                    sx={{
                      height: 22,
                      fontSize: '0.6875rem',
                      fontFamily: HERO_FONT,
                      fontWeight: 700,
                      bgcolor: HERO_SAGE_TINT,
                      color: HERO_SAGE_HOVER,
                      border: `1px solid ${HERO_SAGE_STRONG}`,
                    }}
                  />
                )}
                {inProgress && <CircularProgress size={14} sx={{ color: HERO_SAGE }} />}
              </Stack>
              <Typography
                sx={{
                  fontFamily: HERO_FONT,
                  fontSize: '0.75rem',
                  color: HERO_TEXT_MUTED,
                  mt: 0.4,
                  lineHeight: 1.5,
                }}
              >
                {isComplete
                  ? 'Completed · Retake at any time — the most recent result is the one shown.'
                  : inProgress
                  ? 'Scoring your interview… this usually takes 1–2 minutes.'
                  : 'A free, resume-based AI practice interview. Get a score and detailed feedback in 10 minutes.'}
              </Typography>
            </Box>
          </Stack>

          {/* Button cluster */}
          <Stack
            direction="row"
            gap={1}
            sx={{ flexShrink: 0, flexWrap: 'wrap' }}
          >
            {canViewReport && (
              <Button
                onClick={() => setReportOpen(true)}
                startIcon={<IconReport size={13} />}
                sx={{
                  fontFamily: HERO_FONT,
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  color: HERO_CHARCOAL,
                  border: `1px solid ${HERO_BORDER_STRONG}`,
                  bgcolor: 'transparent',
                  borderRadius: 2,
                  px: 1.75, py: 0.75,
                  whiteSpace: 'nowrap',
                  '&:hover': {
                    bgcolor: 'rgba(39,50,56,0.04)',
                    borderColor: HERO_CHARCOAL,
                  },
                }}
              >
                View report
              </Button>
            )}

            <Button
              onClick={startInterview}
              startIcon={<IconPlay size={12} />}
              sx={{
                fontFamily: HERO_FONT,
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '0.75rem',
                color: HERO_OFF_WHITE,
                bgcolor: HERO_SAGE,
                borderRadius: 2,
                px: 2.25, py: 0.85,
                whiteSpace: 'nowrap',
                boxShadow: 'none',
                '&:hover': { bgcolor: HERO_SAGE_HOVER, boxShadow: 'none' },
              }}
            >
              {isComplete ? 'Retake' : inProgress ? 'Continue' : 'Start interview'}
            </Button>
          </Stack>
        </Box>
      </Box>

      {/* Same shared report dialog the standalone QuickInterviewSection uses */}
      <QuickInterviewReportDialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        overall={overall}
        scores={scores}
        summary={summary}
        strengths={strengths}
        improvements={improvements}
        pdfUrl={pdfUrl}
        durationMin={durationMin}
        answered={answered}
        totalQ={totalQ}
        completedAt={quickInterview?.completed_at}
      />

      {/* Photo remove confirmation — same dialog PhotoSection uses.
          Reads/writes the same editor state, calls the same editor.remove. */}
      {photoEditor && (
        <ConfirmDialog
          open={photoEditor.confirmRemove}
          onClose={() => photoEditor.setConfirmRemove(false)}
          onConfirm={photoEditor.remove}
          busy={photoEditor.removing}
          title="Remove your photo?"
          message="Your profile will show your initials instead. You can upload a new photo at any time."
          confirmLabel="Remove"
        />
      )}
    </>
  );
}

// ── Small helper for the contact chips ─────────────────────────────────────
function ContactChip({ Icon, label }) {
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        bgcolor: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.15)',
        color: HERO_OFF_WHITE,
        px: 1.5, py: 0.75,
        borderRadius: 20,
        fontFamily: HERO_FONT,
        fontSize: '0.75rem',
        fontWeight: 500,
        maxWidth: '100%',
        overflow: 'hidden',
      }}
    >
      <Icon size={13} color="#9EC59C" />
      <Box
        component="span"
        sx={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: 260,
        }}
      >
        {label}
      </Box>
    </Box>
  );
}