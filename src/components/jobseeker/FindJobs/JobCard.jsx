import React, { useState } from 'react';
import {
  Card, Box, Typography, Button, Tooltip, IconButton,
} from '@mui/material';
import {
  Visibility, BookmarkRounded, BookmarkBorderRounded,
  LocationOn, Schedule, GroupsRounded,
  VerifiedRounded, CheckCircle,
  EventBusyOutlined,
} from '@mui/icons-material';

const FONT = "'Jost','DM Sans',sans-serif";

/* ── Landing-page palette ──────────────────────────────────────────────── */
const C = {
  pine:        '#022124',
  pineDark:    '#0A3A38',
  sage:        '#7F9E7E',
  sageText:    '#5E815D',
  sageSoft:    '#EDF3EC',
  ink:         '#101210',
  inkSoft:     '#2F332E',
  surface:     '#FFFFFF',
  page:        '#F6F8F3',
  border:      '#E7EAE3',
  borderSoft:  '#EFF2EC',
  lineSoft:    '#F0F2ED',
  muted:       '#55584F',
  faint:       '#7A7E76',
  chipBg:      '#EDF3EC',
  chipText:    '#3E5C3D',
  applied:     '#3E6E3E',
  appliedSoft: '#EAF2E9',
  appliedBdr:  'rgba(127,158,126,0.45)',
  amber:       '#A35A2D',
  amberSoft:   '#FBF0E7',
};

/* ═══════════════════════════════════════════════════════════════════════ */
const JobCard = ({
  job, onClick, viewMode = 'grid',
  onSave, isSaved = false,
  appliedLabel = null, isExpired = false,
}) => {
  const isApplied   = Boolean(appliedLabel);
  const showExpired = isExpired && !isApplied;

  const [logoErrored, setLogoErrored] = useState(false);

  const handleViewClick  = (e) => { e.stopPropagation(); if (onClick) onClick(); };
  const handleSaveClick  = (e) => { e.stopPropagation(); if (onSave) onSave(job.id); };
  const handleApplyClick = (e) => { e.stopPropagation(); if (onClick) onClick(); };

  /* ── Safe data ──────────────────────────────────────────────────────── */
  const companyName    = job?.companyName    || 'Company';
  const companyLogoUrl = job?.companyLogoUrl || job?.company_logo_url || null;
  const jobTitle       = job?.jobTitle       || 'Job Position';
  const jobLocation    = job?.jobLocation    || 'Location';
  const jobType        = job?.jobType        || 'Full-time';
  const workMode       = job?.workModeDisplay || job?.workMode || '';
  const salaryDisplay  = job?.salaryDisplay  || null;
  const skills         = job?.skills         || [];
  const openings       = job?.openings ?? job?.numberOfOpenings ?? 1;
  const displayStatus  = job?.displayStatus  || job?.status || 'ACTIVE';
  const skillMatch     = typeof job?.skillMatch === 'number' ? Math.round(job.skillMatch) : null;
  const isActive       = String(displayStatus).toUpperCase() === 'ACTIVE';

  const companyInitials = companyName
    .split(' ').filter(Boolean).slice(0, 2)
    .map((w) => w[0]).join('').toUpperCase() || 'CO';
  const showLogo = Boolean(companyLogoUrl) && !logoErrored;

  /* Days until deadline */
  const daysLeft = (() => {
    const raw = job?.applicationDeadline;
    if (!raw) return null;
    const d = new Date(raw);
    if (isNaN(d.getTime())) return null;
    const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
    return Math.max(0, Math.ceil((endOfDay - new Date()) / 86400000));
  })();
  const urgent = daysLeft !== null && daysLeft <= 7;

  /* ── Shared: Logo / Monogram ─────────────────────────────────────────── */
  const LogoBox = ({ size = 42, radius = '10px', showSavedBadge = true }) => (
    <Box sx={{
      width: size, height: size, borderRadius: radius, flexShrink: 0,
      overflow: 'hidden', position: 'relative',
      bgcolor: showLogo ? '#fff' : C.pine,
      border: showLogo ? `1px solid ${C.border}` : 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {showLogo ? (
        <Box component="img" src={companyLogoUrl} alt={companyName}
          onError={() => setLogoErrored(true)}
          sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <Typography sx={{ color: C.sage, fontWeight: 700, fontSize: size * 0.022 + 'rem' }}>
          {companyInitials}
        </Typography>
      )}
      {isSaved && showSavedBadge && (
        <Box sx={{
          position: 'absolute', bottom: -2, right: -2,
          width: 14, height: 14, borderRadius: '50%', bgcolor: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `1.5px solid ${C.surface}`, boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
        }}>
          <BookmarkRounded sx={{ fontSize: 9, color: C.pine }} />
        </Box>
      )}
    </Box>
  );

  /* ── Shared: direct action icons — bookmark (save) + eye (view) ───────── */
  const ActionIcons = ({ compact = false } = {}) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexShrink: 0 }}>
      <Tooltip title={isSaved ? 'Unsave job' : 'Save job'} arrow>
        <IconButton onClick={handleSaveClick} size="small"
          aria-label={isSaved ? `Unsave ${jobTitle}` : `Save ${jobTitle}`}
          sx={{
            color: isSaved ? C.pine : C.faint,
            '&:hover': { bgcolor: C.sageSoft, color: C.pine },
          }}>
          {isSaved
            ? <BookmarkRounded sx={{ fontSize: compact ? 17 : 19 }} />
            : <BookmarkBorderRounded sx={{ fontSize: compact ? 17 : 19 }} />}
        </IconButton>
      </Tooltip>
      <Tooltip title="View details" arrow>
        <IconButton onClick={handleViewClick} size="small"
          aria-label={`View ${jobTitle}`}
          sx={{ color: C.faint, '&:hover': { bgcolor: C.sageSoft, color: C.pine } }}>
          <Visibility sx={{ fontSize: compact ? 17 : 19 }} />
        </IconButton>
      </Tooltip>
    </Box>
  );

  /* ── Shared: Days pill ───────────────────────────────────────────────── */
  const DaysPill = ({ compact }) => (
    !showExpired && daysLeft !== null ? (
      <Box sx={{
        display: 'inline-flex', alignItems: 'center', gap: 0.4,
        bgcolor: urgent ? C.amberSoft : C.chipBg,
        color: urgent ? C.amber : C.muted,
        px: compact ? 0.7 : 0.9, py: 0.3, borderRadius: '7px', flexShrink: 0,
      }}>
        <Schedule sx={{ fontSize: 11 }} />
        <Typography sx={{ fontSize: compact ? '0.58rem' : '0.6rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {daysLeft === 0 ? 'Last day' : `${daysLeft}d left`}
        </Typography>
      </Box>
    ) : null
  );

  /* ══════════════════════════════════════════════════════════════════════
     LIST VIEW — Professional Ledger Row
     Dense table-like row: logo + role | location | type | salary | action
     Collapses to stacked card on xs.
  ═══════════════════════════════════════════════════════════════════════ */
  if (viewMode === 'list') {
    return (
      <Card onClick={onClick} elevation={0} sx={{
        cursor: 'pointer', fontFamily: FONT,
        '& .MuiTypography-root': { fontFamily: FONT },
        borderRadius: '14px', bgcolor: C.surface,
        border: `1px solid ${C.border}`,
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
          {/* Col 1: Role */}
          <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'center', minWidth: 0 }}>
            {LogoBox({ size: 38 })}
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography noWrap sx={{ fontSize: '0.95rem', fontWeight: 800, color: C.ink, lineHeight: 1.25, letterSpacing: '-0.01em' }}>
                {jobTitle}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.2 }}>
                <Typography noWrap sx={{ fontSize: '0.75rem', color: C.muted, fontWeight: 500 }}>
                  {companyName}
                </Typography>
                <VerifiedRounded sx={{ fontSize: 12, color: C.sageText, opacity: 0.6, flexShrink: 0 }} />
                <Typography sx={{ fontSize: '0.7rem', color: C.faint, fontWeight: 500 }}>
                  · {openings} {openings === 1 ? 'opening' : 'openings'}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Col 2: Location */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <LocationOn sx={{ fontSize: 14, color: C.faint }} />
            <Typography noWrap sx={{ fontSize: '0.82rem', color: C.inkSoft, fontWeight: 500 }}>
              {jobLocation}
            </Typography>
          </Box>

          {/* Col 3: Type + mode + days */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
            <Typography sx={{ fontSize: '0.82rem', color: C.inkSoft, fontWeight: 500 }}>
              {jobType}{workMode ? ` · ${workMode}` : ''}
            </Typography>
            {DaysPill({ compact: true })}
          </Box>

          {/* Col 4: Salary */}
          <Typography noWrap sx={{
            fontSize: '1rem', fontWeight: 800, color: C.sageText,
            letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums',
          }}>
            {salaryDisplay || <Box component="span" sx={{ color: C.faint, fontWeight: 500, fontSize: '0.82rem' }}>On request</Box>}
          </Typography>

          {/* Col 5: Action */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.75 }}>
            {isApplied ? (
              <Box sx={{
                display: 'inline-flex', alignItems: 'center', gap: 0.5,
                fontSize: '0.78rem', fontWeight: 700, color: C.applied,
              }}>
                <CheckCircle sx={{ fontSize: 16 }} />
                Applied
              </Box>
            ) : showExpired ? (
              <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: C.muted }}>
                Expired
              </Typography>
            ) : (
              <Button size="small" disableElevation variant="contained"
                onClick={handleApplyClick}
                sx={{
                  bgcolor: C.pine, color: '#fff', fontFamily: FONT,
                  '&:hover': { bgcolor: C.pineDark },
                  borderRadius: '9px', fontWeight: 700, textTransform: 'none',
                  fontSize: '0.78rem', px: 2, py: 0.6,
                }}>
                Apply
              </Button>
            )}
            {ActionIcons({ compact: true })}
          </Box>
        </Box>

        {/* ── Mobile: stacked card (xs–sm) ───────────────────────────── */}
        <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', p: 2 }}>
          <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start', mb: 1.25 }}>
            {LogoBox({ size: 36 })}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: '0.92rem', fontWeight: 800, color: C.ink, lineHeight: 1.25, mb: 0.2 }}>
                {jobTitle}
              </Typography>
              <Typography sx={{ fontSize: '0.72rem', color: C.muted, fontWeight: 500 }}>
                {companyName} · {openings} {openings === 1 ? 'opening' : 'openings'}
              </Typography>
            </Box>
            {ActionIcons({ compact: true })}
          </Box>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1, alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
              <LocationOn sx={{ fontSize: 13, color: C.faint }} />
              <Typography sx={{ fontSize: '0.72rem', color: C.muted, fontWeight: 500 }}>{jobLocation}</Typography>
            </Box>
            <Typography sx={{ fontSize: '0.72rem', color: C.faint }}>·</Typography>
            <Typography sx={{ fontSize: '0.72rem', color: C.muted, fontWeight: 500 }}>{jobType}</Typography>
            {workMode && <>
              <Typography sx={{ fontSize: '0.72rem', color: C.faint }}>·</Typography>
              <Typography sx={{ fontSize: '0.72rem', color: C.muted, fontWeight: 500 }}>{workMode}</Typography>
            </>}
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography sx={{ fontSize: '1.1rem', fontWeight: 800, color: C.sageText, fontVariantNumeric: 'tabular-nums' }}>
              {salaryDisplay || <Box component="span" sx={{ color: C.faint, fontWeight: 500, fontSize: '0.82rem' }}>On request</Box>}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              {DaysPill({ compact: true })}
              {isApplied ? (
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, fontSize: '0.72rem', fontWeight: 700, color: C.applied }}>
                  <CheckCircle sx={{ fontSize: 14 }} /> Applied
                </Box>
              ) : showExpired ? (
                <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: C.muted }}>Expired</Typography>
              ) : (
                <Button size="small" disableElevation variant="contained" onClick={handleApplyClick}
                  sx={{ bgcolor: C.pine, color: '#fff', fontFamily: FONT, '&:hover': { bgcolor: C.pineDark },
                    borderRadius: '8px', fontWeight: 700, textTransform: 'none', fontSize: '0.72rem', px: 1.5, py: 0.5, minWidth: 0 }}>
                  Apply
                </Button>
              )}
            </Box>
          </Box>
        </Box>
      </Card>
    );
  }


  const postedAgo = (() => {
    const rawDate = job?.postedDate || job?.created_at || job?.createdAt;
    if (!rawDate) return null;
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return null;
    const days = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (days <= 0) return 'today';
    if (days === 1) return '1d ago';
    if (days < 21) return `${days}d ago`;
    if (days < 60) return `${Math.floor(days / 7)}w ago`;
    return `${Math.floor(days / 30)}mo ago`;
  })();

  return (
    <Card onClick={onClick} elevation={0} sx={{
      position: 'relative', cursor: 'pointer', height: '100%',
      display: 'flex', flexDirection: 'column',
      borderRadius: '16px', bgcolor: C.surface, overflow: 'hidden',
      border: `1px solid ${C.border}`, fontFamily: FONT,
      '& .MuiTypography-root, & .MuiButton-root, & .MuiMenuItem-root': { fontFamily: FONT },
      boxShadow: '0 10px 26px rgba(2,33,36,0.06)',
      transition: 'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: '0 22px 48px -18px rgba(2,33,36,0.16)',
        borderColor: C.sage,
      },
    }}>
      {/* Top-right actions: quick Save (bookmark) + menu (stops card-click bubbling) */}
      <Box onClick={(e) => e.stopPropagation()} sx={{
        position: 'absolute', top: 8, right: 6, zIndex: 2,
        display: 'flex', alignItems: 'center', gap: 0.25,
      }}>
        {ActionIcons()}
      </Box>

      <Box sx={{ p: '18px 20px 20px', display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>

        {/* Header: circular avatar + title + company / posted-ago / openings */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pr: 7, minWidth: 0 }}>
          {LogoBox({ size: 42, radius: '50%' })}
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography sx={{
              fontSize: '1.02rem', fontWeight: 800, color: C.ink, lineHeight: 1.25,
              letterSpacing: '-0.015em',
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              {jobTitle}
            </Typography>
            <Typography noWrap sx={{ fontSize: '0.74rem', color: C.muted, mt: 0.3, fontWeight: 500 }}>
              {companyName}{postedAgo ? ` · ${postedAgo}` : ''}
            </Typography>
          </Box>
        </Box>

        {/* Meta: location + type */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1.75, flexWrap: 'wrap', rowGap: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
            <LocationOn sx={{ fontSize: 15, color: C.faint, flexShrink: 0 }} />
            <Typography noWrap sx={{ fontSize: '0.78rem', color: C.muted, fontWeight: 500 }}>{jobLocation}</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
            <Schedule sx={{ fontSize: 15, color: C.faint, flexShrink: 0 }} />
            <Typography noWrap sx={{ fontSize: '0.78rem', color: C.muted, fontWeight: 500 }}>
              {workMode ? `${jobType} · ${workMode}` : jobType}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
            <GroupsRounded sx={{ fontSize: 15, color: C.faint, flexShrink: 0 }} />
            <Typography sx={{ fontSize: '0.78rem', color: C.muted, fontWeight: 500, whiteSpace: 'nowrap' }}>
              {openings} {openings === 1 ? 'opening' : 'openings'}
            </Typography>
          </Box>
          <Box sx={{ ml: 'auto' }}>{DaysPill({ compact: true })}</Box>
        </Box>

        {/* Footer: salary + action, pinned to bottom */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mt: 'auto', pt: 2.25 }}>
          <Tooltip
            arrow placement="top"
            title={salaryDisplay ? `Compensation: ${salaryDisplay} · ${jobType}` : 'Compensation shared on request'}
          >
            <Typography noWrap sx={{
              fontSize: '0.95rem', fontWeight: 800, color: salaryDisplay ? C.sageText : C.faint,
              letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums', minWidth: 0,
              cursor: 'default',
            }}>
              {salaryDisplay || <Box component="span" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>On request</Box>}
            </Typography>
          </Tooltip>

          {isApplied ? (
            <Box sx={{
              display: 'inline-flex', alignItems: 'center', gap: 0.5, flexShrink: 0,
              bgcolor: C.appliedSoft, color: C.applied, border: `1px solid ${C.appliedBdr}`,
              borderRadius: '999px', px: 1.6, height: 34, fontSize: '0.76rem', fontWeight: 700,
              whiteSpace: 'nowrap',
            }}>
              <CheckCircle sx={{ fontSize: 15 }} />{appliedLabel}
            </Box>
          ) : showExpired ? (
            <Box sx={{
              display: 'inline-flex', alignItems: 'center', gap: 0.5, flexShrink: 0,
              bgcolor: C.chipBg, color: C.muted, borderRadius: '999px', px: 1.6, height: 34,
              fontSize: '0.76rem', fontWeight: 600, whiteSpace: 'nowrap',
            }}>
              <EventBusyOutlined sx={{ fontSize: 15 }} />Expired
            </Box>
          ) : (
            <Button onClick={handleApplyClick} disableElevation sx={{
              textTransform: 'none', fontSize: '0.8rem', fontWeight: 700,
              bgcolor: C.pine, color: '#fff', borderRadius: '999px',
              px: 2.25, height: 34, minWidth: 0, lineHeight: 1, flexShrink: 0,
              boxShadow: '0 2px 8px rgba(2,33,36,0.22)',
              '&:hover': { bgcolor: C.sage, boxShadow: '0 4px 12px rgba(127,158,126,0.4)' },
            }}>
              Apply Now
            </Button>
          )}
        </Box>
      </Box>
    </Card>
  );
};

export default JobCard;