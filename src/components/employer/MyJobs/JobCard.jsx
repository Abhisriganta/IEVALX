

import React, { useState } from 'react';
import {
  Card, Box, Typography, Button, Tooltip, IconButton, Menu, MenuItem, Chip, Stack,
} from '@mui/material';
import {
  MoreVert, LocationOn, Schedule, GroupsRounded, VerifiedRounded,
  Visibility, Edit, Send, Publish as PublishIcon, Block, LockOutlined,
  Replay as ReplayIcon, PeopleOutlined, ErrorOutlineRounded, HourglassTopRounded,
  Work as WorkIcon,
} from '@mui/icons-material';

const FONT = "'Jost','DM Sans',sans-serif";

/* ── Pine / sage palette — same tokens as FindJobs/JobCard ─────────── */
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
  muted:       '#55584F',
  faint:       '#7A7E76',
  chipBg:      '#EDF3EC',
  chipText:    '#3E5C3D',
  applied:     '#3E6E3E',      
  appliedSoft: '#EAF2E9',
  appliedBdr:  'rgba(127,158,126,0.45)',
  amber:       '#A35A2D',     
  amberSoft:   '#FBF0E7',
  amberBdr:    'rgba(163,90,45,0.35)',
  err:         '#B4462F',    
  errSoft:     '#FBECEA',
  errBdr:      'rgba(180,70,47,0.28)',
  slate:       '#55584F',
  slateSoft:   '#F0F2ED',
};

/* ── Status → color config (pine/sage translation of the old palette) ─ */
const STATUS_STYLE = {
  'Active':           { fg: C.applied,   bg: C.appliedSoft, bdr: C.appliedBdr },
  'Draft':            { fg: C.slate,     bg: C.slateSoft,   bdr: C.border    },
  'Offline':          { fg: C.amber,     bg: C.amberSoft,   bdr: C.amberBdr  },
  'Pending Approval': { fg: C.amber,     bg: C.amberSoft,   bdr: C.amberBdr  },
  'Rejected':         { fg: C.err,       bg: C.errSoft,     bdr: C.errBdr    },
  'Closed':           { fg: C.err,       bg: C.errSoft,     bdr: C.errBdr    },
  'Removed':          { fg: C.slate,     bg: C.slateSoft,   bdr: C.border    },
};


const formatSalary = (min, max) => {
  const toL = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) return null;
    if (n >= 100000) {
      const l = n / 100000;
      return `₹${l % 1 === 0 ? l.toFixed(0) : l.toFixed(1)}L`;
    }
    return `₹${n.toLocaleString('en-IN')}`;
  };
  const a = toL(min), b = toL(max);
  if (a && b) return a === b ? a : `${a} – ${b}`;
  return a || b || null;
};

/* ── Posted-ago from any timestamp field the API might expose ───── */
const postedAgoFrom = (job) => {
  const raw = job?.posted_at || job?.created_at || job?.createdAt || job?.posted_date;
  if (!raw) return null;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return null;
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0)  return 'today';
  if (days === 1) return '1d ago';
  if (days < 21)  return `${days}d ago`;
  if (days < 60)  return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
};

/* ══════════════════════════════════════════════════════════════════ */
const JobCard = ({
  job,
  viewMode = 'grid',
  isAdmin  = false,
  onView,               
  onEdit,               
  onViewApplicants,     
  onSubmitApproval,     
  onPublish,            
  onUnpublish,          
  onRequestRepublish,   
}) => {
  const [menuEl, setMenuEl] = useState(null);
  const openMenu   = (e) => { e.stopPropagation(); setMenuEl(e.currentTarget); };
  const closeMenu  = () => setMenuEl(null);

  /* ── Safe data ─────────────────────────────────────────────── */
  const jobTitle       = job?.job_title    || 'Untitled Role';
  const jobLocation    = job?.job_location || 'Location TBD';
  const jobType        = job?.job_type     || 'Full-time';
  const workMode       = job?.work_mode    || '';
  const openings       = job?.openings ?? 1;
  const applicants     = Number(job?.applicants ?? 0);
  const daysLeft       = job?.days_left != null ? Number(job.days_left) : null;
  const salaryDisplay  = formatSalary(job?.salary_min, job?.salary_max);
  const postedAgo      = postedAgoFrom(job);

  const displayStatus  = job?.display_status || job?.status_display || 'Draft';
  const statusCfg      = STATUS_STYLE[displayStatus] || STATUS_STYLE.Draft;

  const editAccessState = job?.edit_access_state ?? (isAdmin ? 'admin' : 'none');
  const editAccessNote  = job?.edit_access_note ?? null;
  const republishState  = job?.republish_request_state ?? (isAdmin ? 'admin' : 'none');
  const republishNote   = job?.republish_request_note ?? null;

  /* ── Capability gating (same rules as the old JobRow) ─────── */
  const canSubmitForApproval =
    (displayStatus === 'Draft' || displayStatus === 'Rejected')
    && job?.approval_status !== 'APPROVED';

  const canRequestRepublish =
    !isAdmin
    && displayStatus === 'Draft'
    && job?.approval_status === 'APPROVED'
    && republishState !== 'pending';

  const canPublishDirectly =
    isAdmin
    && (job?.status === 'DRAFT' || job?.status === 'UNPUBLISHED')
    && job?.approval_status === 'APPROVED'
    && displayStatus !== 'Active';

  const canUnpublish = isAdmin && displayStatus === 'Active';

  const deadlinePassed = job?.application_deadline
    && new Date(job.application_deadline) < new Date(new Date().toDateString());

  const showRejectionReason = displayStatus === 'Rejected' && job?.rejection_reason;
  const showPendingMessage  = displayStatus === 'Pending Approval';
  const showOfflineMessage  = displayStatus === 'Draft'
    && job?.status === 'UNPUBLISHED'
    && job?.approval_status === 'APPROVED'
    && !isAdmin
    && republishState !== 'pending';
  const showExpiredMessage  = displayStatus === 'Draft'
    && job?.status === 'DRAFT'
    && job?.approval_status === 'APPROVED'
    && !isAdmin
    && republishState !== 'pending'
    && deadlinePassed;

  const showEditPill      = !isAdmin && editAccessState && editAccessState !== 'none' && editAccessState !== 'admin';
  const showRepublishPill = !isAdmin && republishState && republishState !== 'none' && republishState !== 'admin';

  const monogram = (jobTitle.split(' ').filter(Boolean).slice(0, 2)
    .map((w) => w[0]).join('') || 'JB').toUpperCase();

  /* ── Days pill — same shape as jobseeker card, urgent tier at ≤7d ─ */
  const urgent = daysLeft !== null && daysLeft <= 7 && daysLeft >= 0;
  const DaysPill = ({ compact }) => (
    daysLeft !== null ? (
      <Box sx={{
        display: 'inline-flex', alignItems: 'center', gap: 0.4,
        bgcolor: urgent ? C.amberSoft : C.chipBg,
        color:   urgent ? C.amber     : C.muted,
        px: compact ? 0.7 : 0.9, py: 0.3, borderRadius: '7px', flexShrink: 0,
      }}>
        <Schedule sx={{ fontSize: 11 }} />
        <Typography sx={{
          fontSize: compact ? '0.58rem' : '0.6rem',
          fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>
          {daysLeft === 0 ? 'Last day' : `${daysLeft}d left`}
        </Typography>
      </Box>
    ) : null
  );

  /* ── Adaptive primary CTA ─────────────────────────────────── */
  const primaryAction = (() => {
    if (displayStatus === 'Active')
      return { label: 'View Applicants', variant: 'primary', onClick: () => onViewApplicants?.(job) };
    if (displayStatus === 'Closed')
      return { label: 'View Applicants', variant: 'ghost',   onClick: () => onViewApplicants?.(job) };
    if (displayStatus === 'Pending Approval')
      return { label: 'View Details',    variant: 'ghost',   onClick: () => onView?.(job) };
    if (displayStatus === 'Rejected')
      return { label: 'Edit & Resubmit', variant: 'primary', onClick: () => onEdit?.(job) };
    if (displayStatus === 'Draft' && canSubmitForApproval)
      return { label: 'Submit for Approval', variant: 'amber', onClick: () => onSubmitApproval?.(job) };
    if (canPublishDirectly)
      return { label: 'Publish Now',     variant: 'primary', onClick: () => onPublish?.(job) };
    if (canRequestRepublish)
      return { label: 'Request Republish', variant: 'amber', onClick: () => onRequestRepublish?.(job) };
    return   { label: 'View Details',    variant: 'ghost',   onClick: () => onView?.(job) };
  })();

  const PrimaryButton = ({ compact = false, fullWidth = false } = {}) => {
    const stopAnd = (fn) => (e) => { e.stopPropagation(); fn?.(); };
    const height  = compact ? 30 : 36;
    const px      = compact ? 1.7 : 2.25;
    const fontSize = compact ? '0.74rem' : '0.82rem';
    const widthSx = fullWidth
      ? { width: '100%', flexShrink: 1 }
      : { minWidth: 0, flexShrink: 0 };

    if (primaryAction.variant === 'primary') {
      return (
        <Button onClick={stopAnd(primaryAction.onClick)} disableElevation
          sx={{
            textTransform: 'none', fontSize, fontWeight: 700, fontFamily: FONT,
            bgcolor: C.pine, color: '#fff', borderRadius: '999px',
            px, height, lineHeight: 1, ...widthSx,
            boxShadow: '0 2px 8px rgba(2,33,36,0.22)',
            '&:hover': { bgcolor: C.sage, boxShadow: '0 4px 12px rgba(127,158,126,0.4)' },
          }}>
          {primaryAction.label}
        </Button>
      );
    }
    if (primaryAction.variant === 'amber') {
      return (
        <Button onClick={stopAnd(primaryAction.onClick)} disableElevation
          sx={{
            textTransform: 'none', fontSize, fontWeight: 700, fontFamily: FONT,
            bgcolor: C.amber, color: '#fff', borderRadius: '999px',
            px, height, lineHeight: 1, ...widthSx,
            boxShadow: '0 2px 8px rgba(163,90,45,0.28)',
            '&:hover': { bgcolor: '#8A4A22', boxShadow: '0 4px 12px rgba(163,90,45,0.4)' },
          }}>
          {primaryAction.label}
        </Button>
      );
    }
    /* ghost */
    return (
      <Button onClick={stopAnd(primaryAction.onClick)} disableElevation
        sx={{
          textTransform: 'none', fontSize, fontWeight: 600, fontFamily: FONT,
          color: C.pine, borderRadius: '999px', bgcolor: 'transparent',
          border: `1px solid ${C.border}`,
          px, height, lineHeight: 1, ...widthSx,
          '&:hover': { borderColor: C.sage, bgcolor: C.sageSoft },
        }}>
        {primaryAction.label}
      </Button>
    );
  };

  /* ── Status chip (small, header row) ───────────────────────── */
  const StatusChip = () => (
    <Box sx={{
      display: 'inline-flex', alignItems: 'center', gap: 0.4,
      px: 0.85, py: 0.25, borderRadius: '999px',
      bgcolor: statusCfg.bg, color: statusCfg.fg,
      border: `1px solid ${statusCfg.bdr}`,
      fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.04em',
      textTransform: 'uppercase', flexShrink: 0,
    }}>
      <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: statusCfg.fg }} />
      {displayStatus}
    </Box>
  );

  /* ── Small pending-flow pills (edit / republish) ───────────── */
  const FlowPill = ({ kind, state }) => {
    if (!state || state === 'none' || state === 'admin') return null;
    const style = state === 'pending'
      ? { bg: C.amberSoft, fg: C.amber, icon: <HourglassTopRounded sx={{ fontSize: 11 }} /> }
      : state === 'rejected'
        ? { bg: C.errSoft, fg: C.err, icon: <Block sx={{ fontSize: 11 }} /> }
        : { bg: C.appliedSoft, fg: C.applied, icon: <Edit sx={{ fontSize: 11 }} /> };
    const label = `${kind} ${state[0].toUpperCase()}${state.slice(1)}`;
    /* ⓘ Tooltip only shows the label now — the admin's rejection NOTE moved
       to an inline NoteBanner at the bottom of the card body so it's always
       visible instead of hover-hidden. */
    return (
      <Tooltip title={label} arrow placement="top">
        <Box sx={{
          display: 'inline-flex', alignItems: 'center', gap: 0.4,
          px: 0.85, py: 0.2, borderRadius: '999px',
          bgcolor: style.bg, color: style.fg,
          fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}>
          {style.icon}
          {label}
        </Box>
      </Tooltip>
    );
  };

  const NoteBanner = () => {
    let severity = null, msg = null, prefix = null;
    if (showRejectionReason) {
      severity = 'err'; msg = job.rejection_reason; prefix = 'Rejected';
    } else if (!isAdmin && editAccessState === 'rejected' && editAccessNote) {
      severity = 'err'; msg = editAccessNote; prefix = 'Edit request denied';
    } else if (!isAdmin && republishState === 'rejected' && republishNote) {
      severity = 'err'; msg = republishNote; prefix = 'Republish denied';
    } else if (showPendingMessage) {
      severity = 'amber'; msg = "Waiting for your Company Admin to review this job.";
    } else if (showOfflineMessage) {
      severity = 'amber'; msg = "This job was taken offline by your Company Admin.";
    } else if (showExpiredMessage) {
      severity = 'amber'; msg = "This job is offline because its application deadline has passed.";
    }
    if (!msg) return null;
    const palette = severity === 'err'
      ? { bg: C.errSoft, fg: C.err, bdr: C.errBdr }
      : { bg: C.amberSoft, fg: C.amber, bdr: C.amberBdr };
    return (
      <Box sx={{
        display: 'flex', alignItems: 'flex-start', gap: 0.75,
        mb: 1.5, px: 1.25, py: 0.9,
        bgcolor: palette.bg, color: palette.fg,
        border: `1px solid ${palette.bdr}`, borderRadius: '9px',
      }}>
        <ErrorOutlineRounded sx={{ fontSize: 14, mt: '2px', flexShrink: 0 }} />
        <Typography sx={{
          fontSize: '0.72rem', fontWeight: 500, lineHeight: 1.5,
          display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
          overflow: 'hidden', wordBreak: 'break-word',
        }}>
          {prefix ? <><b>{prefix}: </b>{msg}</> : msg}
        </Typography>
      </Box>
    );
  };


  const menuTrigger = () => (
    <Tooltip title="More actions" arrow>
      <IconButton onClick={openMenu} size="small"
        sx={{
          color: C.faint, bgcolor: 'transparent',
          '&:hover': { bgcolor: C.sageSoft, color: C.pine },
        }}>
        <MoreVert sx={{ fontSize: 19 }} />
      </IconButton>
    </Tooltip>
  );

  const menuContent = () => (
    <Menu
      anchorEl={menuEl}
      open={Boolean(menuEl)}
      onClose={closeMenu}
      onClick={(e) => e.stopPropagation()}
     
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      disableScrollLock
      keepMounted={false}
      slotProps={{
        paper: {
          sx: {
            borderRadius: '12px', mt: 0.5, minWidth: 220,
            border: `1px solid ${C.border}`,
            boxShadow: '0 12px 32px rgba(2,33,36,0.14)',
            overflow: 'visible',
            '& .MuiMenuItem-root': {
              fontSize: '0.85rem', fontFamily: FONT, py: 1,
              '&:hover': { bgcolor: C.sageSoft },
            },
          },
        },
      }}
    >
      <MenuItem onClick={() => { onView?.(job); closeMenu(); }}>
        <Visibility fontSize="small" sx={{ mr: 1.5, color: C.muted }} /> View Details
      </MenuItem>
      <MenuItem onClick={() => { onViewApplicants?.(job); closeMenu(); }}>
        <PeopleOutlined fontSize="small" sx={{ mr: 1.5, color: C.muted }} /> View Applicants
      </MenuItem>
      <MenuItem onClick={() => { onEdit?.(job); closeMenu(); }}>
        {isAdmin || editAccessState === 'approved'
          ? <Edit fontSize="small" sx={{ mr: 1.5, color: C.muted }} />
          : <LockOutlined fontSize="small" sx={{ mr: 1.5, color: C.muted }} />}
        {isAdmin || editAccessState === 'approved'
          ? 'Edit'
          : editAccessState === 'pending'
            ? 'Edit (Awaiting Approval)'
            : 'Request Edit Access'}
      </MenuItem>
      {canSubmitForApproval && (
        <MenuItem onClick={() => { onSubmitApproval?.(job); closeMenu(); }}
          sx={{ color: C.amber }}>
          <Send fontSize="small" sx={{ mr: 1.5 }} />
          {displayStatus === 'Rejected' ? 'Re-submit for Approval' : 'Submit for Approval'}
        </MenuItem>
      )}
      {canRequestRepublish && (
        <MenuItem onClick={() => { onRequestRepublish?.(job); closeMenu(); }}
          sx={{ color: C.amber }}>
          <ReplayIcon fontSize="small" sx={{ mr: 1.5 }} />
          {republishState === 'rejected' ? 'Re-request Republish' : 'Request to Republish'}
        </MenuItem>
      )}
      {!isAdmin && displayStatus === 'Draft' && republishState === 'pending' && (
        <MenuItem disabled sx={{ color: C.amber }}>
          <LockOutlined fontSize="small" sx={{ mr: 1.5 }} />
          Republish (Awaiting Approval)
        </MenuItem>
      )}
      {canPublishDirectly && (
        <MenuItem onClick={() => { onPublish?.(job); closeMenu(); }}
          sx={{ color: C.applied }}>
          <PublishIcon fontSize="small" sx={{ mr: 1.5 }} />
          {job?.status === 'UNPUBLISHED' ? 'Make Live Again' : 'Publish Now'}
        </MenuItem>
      )}
      {canUnpublish && (
        <MenuItem onClick={() => { onUnpublish?.(job); closeMenu(); }}
          sx={{ color: C.err }}>
          <Block fontSize="small" sx={{ mr: 1.5 }} /> Unpublish
        </MenuItem>
      )}
    </Menu>
  );

  /* ── Monogram box — sage-on-pine circular tile, matches jobseeker card ─ */
  const LogoBox = ({ size = 42, radius = '50%' }) => (
    <Box sx={{
      width: size, height: size, borderRadius: radius, flexShrink: 0,
      bgcolor: C.pine, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Typography sx={{
        color: C.sage, fontWeight: 700, letterSpacing: '0.02em',
        fontSize: size <= 36 ? '0.78rem' : '0.9rem',
      }}>
        {monogram}
      </Typography>
    </Box>
  );

  /* ══════════════════════════════════════════════════════════════════════
     LIST VIEW — table-like row with employer columns
     ══════════════════════════════════════════════════════════════════════ */
  if (viewMode === 'list') {
    return (
      <Card onClick={() => onView?.(job)} elevation={0} sx={{
        cursor: 'pointer', fontFamily: FONT,
        '& .MuiTypography-root': { fontFamily: FONT },
        borderRadius: '14px', bgcolor: C.surface,
        border: `1px solid ${C.border}`,
        transition: 'all 0.2s ease',
        '&:hover': { borderColor: C.sage, boxShadow: '0 6px 20px rgba(2,33,36,0.08)' },
      }}>
        {/* Desktop (md+) — table row */}
        <Box sx={{
          display: { xs: 'none', md: 'grid' },
          gridTemplateColumns: '2.4fr 1.1fr 1fr 0.9fr 1.1fr 150px',
          alignItems: 'center', px: 2.5, py: 1.75, gap: 2,
        }}>
          <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'center', minWidth: 0 }}>
            <LogoBox size={38} radius="10px" />
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography noWrap sx={{
                fontSize: '0.95rem', fontWeight: 800, color: C.ink,
                lineHeight: 1.25, letterSpacing: '-0.01em',
              }}>
                {jobTitle}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.2, flexWrap: 'wrap' }}>
                <StatusChip />
                <Typography sx={{ fontSize: '0.7rem', color: C.faint }}>·</Typography>
                <Typography sx={{ fontSize: '0.72rem', color: C.muted, fontWeight: 500 }}>
                  {openings} {openings === 1 ? 'opening' : 'openings'}
                </Typography>
                {postedAgo && (
                  <>
                    <Typography sx={{ fontSize: '0.7rem', color: C.faint }}>·</Typography>
                    <Typography sx={{ fontSize: '0.72rem', color: C.faint, fontWeight: 500 }}>
                      {postedAgo}
                    </Typography>
                  </>
                )}
                
                {showRepublishPill && <FlowPill kind="Republish" state={republishState} />}
              </Box>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <LocationOn sx={{ fontSize: 14, color: C.faint }} />
            <Typography noWrap sx={{ fontSize: '0.82rem', color: C.inkSoft, fontWeight: 500 }}>
              {jobLocation}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
            <Typography sx={{ fontSize: '0.82rem', color: C.inkSoft, fontWeight: 500 }}>
              {jobType}{workMode ? ` · ${workMode}` : ''}
            </Typography>
            <DaysPill compact />
          </Box>

          <Tooltip title="Open applicants" arrow>
            <Box
              onClick={(e) => { e.stopPropagation(); onViewApplicants?.(job); }}
              sx={{
                display: 'flex', alignItems: 'center', gap: 0.5,
                cursor: 'pointer',
                '&:hover .num': { color: C.pine },
              }}>
              <GroupsRounded sx={{ fontSize: 16, color: C.sageText }} />
              <Typography className="num" sx={{
                fontSize: '0.98rem', fontWeight: 800, color: C.sageText,
                fontVariantNumeric: 'tabular-nums', transition: 'color 0.15s',
              }}>
                {applicants}
              </Typography>
              <Typography sx={{ fontSize: '0.7rem', color: C.faint, fontWeight: 500 }}>
                {applicants === 1 ? 'applicant' : 'applicants'}
              </Typography>
            </Box>
          </Tooltip>

          <Typography noWrap sx={{
            fontSize: '0.88rem', fontWeight: 700, color: salaryDisplay ? C.sageText : C.faint,
            letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums',
          }}>
            {salaryDisplay || <Box component="span" sx={{ fontWeight: 500, fontSize: '0.78rem' }}>On request</Box>}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.75 }}>
            <PrimaryButton compact />
            {menuTrigger()}
          </Box>
        </Box>

        <Box sx={{ display: { xs: 'none', md: 'block' }, px: 2.5 }}>
          <NoteBanner />
        </Box>

        {/* Mobile (xs–sm) — stacked */}
        <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', p: 2 }}>
          <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start', mb: 1.25 }}>
            <LogoBox size={36} radius="10px" />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{
                fontSize: '0.92rem', fontWeight: 800, color: C.ink,
                lineHeight: 1.25, mb: 0.3,
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}>
                {jobTitle}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                <StatusChip />
                {showEditPill && <FlowPill kind="Edit" state={editAccessState} />}
                {showRepublishPill && <FlowPill kind="Republish" state={republishState} />}
              </Box>
            </Box>
            {menuTrigger()}
          </Box>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1, alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
              <LocationOn sx={{ fontSize: 13, color: C.faint }} />
              <Typography sx={{ fontSize: '0.72rem', color: C.muted, fontWeight: 500 }}>{jobLocation}</Typography>
            </Box>
            <Typography sx={{ fontSize: '0.72rem', color: C.faint }}>·</Typography>
            <Typography sx={{ fontSize: '0.72rem', color: C.muted, fontWeight: 500 }}>
              {workMode ? `${jobType} · ${workMode}` : jobType}
            </Typography>
            <Typography sx={{ fontSize: '0.72rem', color: C.faint }}>·</Typography>
            <Typography sx={{ fontSize: '0.72rem', color: C.muted, fontWeight: 500 }}>
              {openings} {openings === 1 ? 'opening' : 'openings'}
            </Typography>
          </Box>

          <NoteBanner />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5, gap: 1 }}>
            <Box
              onClick={(e) => { e.stopPropagation(); onViewApplicants?.(job); }}
              sx={{
                display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer',
              }}>
              <GroupsRounded sx={{ fontSize: 16, color: C.sageText }} />
              <Typography sx={{
                fontSize: '0.98rem', fontWeight: 800, color: C.sageText,
                fontVariantNumeric: 'tabular-nums',
              }}>
                {applicants}
              </Typography>
              <Typography sx={{ fontSize: '0.7rem', color: C.faint, fontWeight: 500 }}>
                applicants
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <DaysPill compact />
              <PrimaryButton compact />
            </Box>
          </Box>
        </Box>
   
        {menuContent()}
      </Card>
    );
  }

  /* ══════════════════════════════════════════════════════════════════════
     GRID VIEW — the "Featured Jobs" landing look, mirroring jobseeker card
     ══════════════════════════════════════════════════════════════════════ */
  return (
    <Card onClick={() => onView?.(job)} elevation={0} sx={{
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
      {/* Top-right menu (stops card-click bubbling) */}
      <Box onClick={(e) => e.stopPropagation()} sx={{
        position: 'absolute', top: 8, right: 6, zIndex: 2,
      }}>
        {menuTrigger()}
      </Box>

      <Box sx={{ p: '18px 20px 20px', display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>

        {/* Header: monogram + title + status/openings/posted-ago */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pr: 4, minWidth: 0 }}>
          <LogoBox size={42} radius="50%" />
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography sx={{
              fontSize: '1.02rem', fontWeight: 800, color: C.ink, lineHeight: 1.25,
              letterSpacing: '-0.015em',
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              {jobTitle}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.4, flexWrap: 'wrap' }}>
              <StatusChip />
              {postedAgo && (
                <Typography noWrap sx={{ fontSize: '0.7rem', color: C.faint, fontWeight: 500 }}>
                  · {postedAgo}
                </Typography>
              )}
            </Box>
          </Box>
        </Box>

        {/* Flow pills (Edit Pending / Republish Pending) — only when relevant */}
        {(showEditPill || showRepublishPill) && (
          <Box sx={{ display: 'flex', gap: 0.6, mt: 1.25, flexWrap: 'wrap' }}>
            {showEditPill && <FlowPill kind="Edit" state={editAccessState} />}
            {showRepublishPill && <FlowPill kind="Republish" state={republishState} />}
          </Box>
        )}

        {/* ── Meta — vertical stack, one attribute per row ──────────
             Was a wrap-flex row; now each fact gets its own line so cards
             read the same at every breakpoint. The final row combines the
             openings count with the days-left pill, right-aligned, so the
             "how urgent" signal stays visually anchored to the bottom of
             the meta group. */}
        <Stack spacing={0.9} sx={{ mt: 1.75 }}>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
            <LocationOn sx={{ fontSize: 15, color: C.faint, flexShrink: 0 }} />
            <Typography noWrap sx={{
              fontSize: '0.8rem', color: C.muted, fontWeight: 500, minWidth: 0,
            }}>
              {jobLocation}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
            <WorkIcon sx={{ fontSize: 15, color: C.faint, flexShrink: 0 }} />
            <Typography noWrap sx={{
              fontSize: '0.8rem', color: C.muted, fontWeight: 500, minWidth: 0,
            }}>
              {workMode ? `${jobType} · ${workMode}` : jobType}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
              <GroupsRounded sx={{ fontSize: 15, color: C.faint, flexShrink: 0 }} />
              <Typography sx={{
                fontSize: '0.8rem', color: C.muted, fontWeight: 500, whiteSpace: 'nowrap',
              }}>
                {openings} {openings === 1 ? 'opening' : 'openings'}
              </Typography>
            </Stack>
            <DaysPill compact />
          </Stack>
        </Stack>

        <Box sx={{ mt: 'auto', pt: 2.25 }}>
          <NoteBanner />

   
          <Box sx={{
            pt: 1.75,
            borderTop: `1px dashed ${C.border}`,
            display: 'flex', flexDirection: 'column', gap: 1.5,
          }}>
            {(displayStatus === 'Active' || displayStatus === 'Closed') ? (
              <Tooltip title="Total applicants received" arrow placement="top">
                <Box
                  onClick={(e) => { e.stopPropagation(); onViewApplicants?.(job); }}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 0.75, cursor: 'pointer',
                    alignSelf: 'flex-start',
                    '&:hover .num, &:hover .lbl, &:hover .ico': { color: C.pine },
                  }}>
                  <GroupsRounded className="ico" sx={{
                    fontSize: 18, color: C.sageText, transition: 'color 0.15s',
                  }} />
                  <Typography className="num" sx={{
                    fontSize: '1.1rem', fontWeight: 800, color: C.sageText,
                    fontVariantNumeric: 'tabular-nums', transition: 'color 0.15s', lineHeight: 1,
                  }}>
                    {applicants}
                  </Typography>
                  <Typography className="lbl" sx={{
                    fontSize: '0.78rem', color: C.muted, fontWeight: 500,
                    transition: 'color 0.15s',
                  }}>
                    total {applicants === 1 ? 'applicant' : 'applicants'}
                  </Typography>
                </Box>
              </Tooltip>
            ) : (
              <Tooltip
                arrow placement="top"
                title={salaryDisplay ? `Compensation: ${salaryDisplay} · ${jobType}` : 'Compensation shared on request'}
              >
                <Typography sx={{
                  fontSize: '0.95rem', fontWeight: 800,
                  color: salaryDisplay ? C.sageText : C.faint,
                  letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums',
                  cursor: 'default', alignSelf: 'flex-start',
                }}>
                  {salaryDisplay || <Box component="span" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>Compensation on request</Box>}
                </Typography>
              </Tooltip>
            )}

            {/* Primary CTA — full width for prominence & thumb-friendly tap area */}
            <PrimaryButton fullWidth />
          </Box>
        </Box>
      </Box>
      {/* Menu rendered once per card (see the split comment). */}
      {menuContent()}
    </Card>
  );
};

export default JobCard;