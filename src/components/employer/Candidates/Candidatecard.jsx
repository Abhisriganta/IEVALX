import React from 'react';
import {
  Box, Typography, Chip, Avatar, Stack, Divider,
  Dialog, DialogContent, DialogActions, Button, IconButton,
  CircularProgress, TextField, Select, MenuItem, FormControl,
  InputLabel, InputAdornment,
} from '@mui/material';
import {
  Close as CloseIcon, Email, Phone, LocationOn,
  Work as WorkIcon, School, OpenInNew, Search,
} from '@mui/icons-material';
import { getInitials } from '@/utils/formatters';

// ── Status config (unchanged — imported by Pipeline, Candidates) ──────────────
export const STATUS_CONFIG = {
  SHORTLISTED:  { label: 'Shortlisted',  bgcolor: '#FEF9EC', color: '#B45309', border: '#FDE68A' },
  AI_INTERVIEW: { label: 'Interviewing', bgcolor: '#EEF2FF', color: '#4338CA', border: '#C7D2FE' },
  SELECTED:     { label: 'Hired',        bgcolor: '#ECFDF5', color: '#065F46', border: '#A7F3D0' },
  REJECTED:     { label: 'Rejected',     bgcolor: '#FEF2F2', color: '#991B1B', border: '#FECACA' },
  ON_HOLD:      { label: 'On Hold',      bgcolor: '#F5F3FF', color: '#5B21B6', border: '#DDD6FE' },
  WITHDRAWN:    { label: 'Withdrawn',    bgcolor: '#F8FAFC', color: '#475569', border: '#CBD5E1' },
};

export const ACTIONED_STATUSES = Object.keys(STATUS_CONFIG);

// ── Helpers (signatures unchanged) ───────────────────────────────────────────
export const formatRelativeTime = (dateStr) => {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '—';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(date); d.setHours(0, 0, 0, 0);
  const days = Math.round((today - d) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7)  return `${days}d ago`;
  if (days < 30) { const w = Math.floor(days / 7); return `${w}w ago`; }
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

export const formatLocation   = (c) => [c?.city, c?.state].filter(Boolean).join(', ') || '—';

export const formatExperience = (years) => {
  if (years == null) return '—';
  const y = Number(years);
  if (isNaN(y)) return '—';
  if (y < 1) return '< 1 yr';
  if (y === 1) return '1 yr';
  return `${y % 1 === 0 ? y : y.toFixed(1)} yrs`;
};

export const formatINR = (v) => {
  if (v == null) return null;
  const n = Number(v);
  return isNaN(n) ? null : `₹${n.toLocaleString('en-IN')}`;
};

// ── Avatar colour palette ─────────────────────────────────────────────────────
const AVATAR_COLORS = ['#1E3358','#4338CA','#0369A1','#065F46','#B45309','#7C3AED','#0284C7','#DC2626'];
const avatarBg = (name = '') =>
  AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length];

// ═══════════════════════════════════════════════════════════════════════════════
// CandidateCard — clean list-row design
// ═══════════════════════════════════════════════════════════════════════════════
export const CandidateCard = ({ candidate, onClick }) => {
  const statusCfg = STATUS_CONFIG[candidate.application_status]
    || { label: candidate.application_status, bgcolor: '#F8FAFC', color: '#64748B', border: '#CBD5E1' };

  return (
    <Box
      onClick={() => onClick(candidate)}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: { xs: 1.2, sm: 1.8, md: 2 },
        px: { xs: 1.5, sm: 2, md: 2.5 },
        py: { xs: 1.2, sm: 1.4 },
        cursor: 'pointer',
        borderBottom: '1px solid #F1F5F9',
        transition: 'background 0.15s',
        '&:hover': { bgcolor: '#F8FAFC' },
        '&:last-child': { borderBottom: 'none' },
        // ⌚ smartwatch
        '@media (max-width: 240px)': { px: 1, py: 0.8, gap: 1 },
      }}
    >
      {/* Avatar */}
      <Avatar
        sx={{
          width:    { xs: 34, sm: 38, md: 42 },
          height:   { xs: 34, sm: 38, md: 42 },
          fontSize: { xs: '0.72rem', sm: '0.82rem', md: '0.9rem' },
          fontWeight: 700,
          bgcolor: avatarBg(candidate.full_name),
          flexShrink: 0,
          '@media (max-width: 240px)': { width: 26, height: 26, fontSize: '0.6rem' },
        }}
      >
        {getInitials(candidate.full_name)}
      </Avatar>

      {/* Name + role */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{
            fontWeight: 600,
            color: '#0F172A',
            fontSize: { xs: '0.78rem', sm: '0.85rem', md: '0.88rem' },
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            '@media (max-width: 240px)': { fontSize: '0.65rem' },
          }}
        >
          {candidate.full_name || '—'}
        </Typography>
        <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mt: 0.2, flexWrap: 'nowrap', overflow: 'hidden' }}>
          <Typography
            sx={{
              fontSize: { xs: '0.67rem', sm: '0.72rem' },
              color: '#64748B',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              '@media (max-width: 240px)': { fontSize: '0.58rem' },
            }}
          >
            {candidate.job_title || '—'}
          </Typography>
          <Box
            sx={{
              width: 3, height: 3, borderRadius: '50%', bgcolor: '#CBD5E1', flexShrink: 0,
              display: { xs: 'none', sm: 'block' },
            }}
          />
          <Typography
            sx={{
              fontSize: '0.67rem',
              color: '#94A3B8',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              display: { xs: 'none', sm: 'block' },
            }}
          >
            {formatRelativeTime(candidate.applied_at)}
          </Typography>
        </Stack>
      </Box>

      {/* Status chip */}
      <Chip
        label={statusCfg.label}
        size="small"
        sx={{
          bgcolor: statusCfg.bgcolor,
          color: statusCfg.color,
          border: `1px solid ${statusCfg.border}`,
          fontWeight: 700,
          fontSize: { xs: '0.58rem', sm: '0.62rem', md: '0.65rem' },
          height: { xs: 18, sm: 20, md: 22 },
          flexShrink: 0,
          borderRadius: '6px',
          display: { xs: 'none', sm: 'flex' },
          '@media (max-width: 240px)': { display: 'none' },
        }}
      />

      {/* Arrow indicator */}
      <Box
        sx={{
          width: { xs: 18, sm: 20 },
          height: { xs: 18, sm: 20 },
          borderRadius: '50%',
          bgcolor: '#F1F5F9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: '#94A3B8',
          fontSize: '0.7rem',
          fontWeight: 700,
          '@media (max-width: 240px)': { display: 'none' },
        }}
      >
        ›
      </Box>
    </Box>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// CandidateDetailDialog — professional modal
// ═══════════════════════════════════════════════════════════════════════════════
export const CandidateDetailDialog = ({ open, onClose, candidate, detailLoading }) => {
  if (!candidate) return null;

  const statusCfg   = STATUS_CONFIG[candidate.application_status]
    || { label: candidate.application_status || 'Unknown', bgcolor: '#F8FAFC', color: '#64748B', border: '#CBD5E1' };
  const skills      = Array.isArray(candidate.custom_skills) ? candidate.custom_skills : [];
  const education   = Array.isArray(candidate.education)     ? candidate.education     : [];
  const expectedCtc = formatINR(candidate.expected_ctc);

  const InfoRow = ({ icon: Icon, value, color = '#64748B' }) => (
    <Stack direction="row" spacing={1.5} alignItems="center">
      <Box
        sx={{
          width: { xs: 26, sm: 30 },
          height: { xs: 26, sm: 30 },
          borderRadius: '8px',
          bgcolor: '#F8FAFC',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon sx={{ fontSize: { xs: 13, sm: 15 }, color }} />
      </Box>
      <Typography sx={{ fontSize: { xs: '0.78rem', sm: '0.83rem' }, color: '#374151' }}>
        {value || '—'}
      </Typography>
    </Stack>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: { xs: 0, sm: '16px' },
          m: { xs: 0, sm: 2 },
          maxHeight: { xs: '100dvh', sm: '90vh' },
          width: { xs: '100%', sm: 'auto' },
          // ⌚ smartwatch
          '@media (max-width: 240px)': { m: 0, borderRadius: 0 },
        },
      }}
    >
      {/* ── Gradient header ── */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #1E3358 0%, #2D4E80 100%)',
          px: { xs: 2, sm: 2.5 },
          pt: { xs: 2.5, sm: 3 },
          pb: { xs: 2, sm: 2.5 },
          '@media (max-width: 240px)': { px: 1.5, pt: 1.5, pb: 1.5 },
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Stack direction="row" spacing={{ xs: 1.5, sm: 2 }} alignItems="center">
            {candidate.application_photo_url ? (
              <Avatar
                src={candidate.application_photo_url}
                sx={{
                  width: { xs: 44, sm: 56 },
                  height: { xs: 44, sm: 56 },
                  border: '2.5px solid rgba(255,255,255,0.35)',
                  '@media (max-width: 240px)': { width: 34, height: 34 },
                }}
              />
            ) : (
              <Avatar
                sx={{
                  width: { xs: 44, sm: 56 },
                  height: { xs: 44, sm: 56 },
                  bgcolor: 'rgba(255,255,255,0.18)',
                  color: 'white',
                  fontSize: { xs: '1rem', sm: '1.25rem' },
                  fontWeight: 800,
                  border: '2.5px solid rgba(255,255,255,0.35)',
                  '@media (max-width: 240px)': { width: 34, height: 34, fontSize: '0.78rem' },
                }}
              >
                {getInitials(candidate.full_name)}
              </Avatar>
            )}
            <Box>
              <Typography
                sx={{
                  color: 'white',
                  fontWeight: 800,
                  fontSize: { xs: '0.95rem', sm: '1.1rem' },
                  lineHeight: 1.2,
                  '@media (max-width: 240px)': { fontSize: '0.78rem' },
                }}
              >
                {candidate.full_name || '—'}
              </Typography>
              <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mt: 0.6 }} flexWrap="wrap" useFlexGap>
                <Chip
                  label={statusCfg.label}
                  size="small"
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.18)',
                    color: 'white',
                    fontSize: { xs: '0.6rem', sm: '0.65rem' },
                    fontWeight: 700,
                    height: { xs: 18, sm: 20 },
                    border: '1px solid rgba(255,255,255,0.25)',
                  }}
                />
                <Typography sx={{ color: 'rgba(255,255,255,0.65)', fontSize: { xs: '0.65rem', sm: '0.7rem' } }}>
                  Applied {formatRelativeTime(candidate.applied_at)}
                </Typography>
              </Stack>
            </Box>
          </Stack>
          <IconButton
            size="small"
            onClick={onClose}
            sx={{
              color: 'rgba(255,255,255,0.7)',
              mt: -0.5,
              '&:hover': { color: 'white', bgcolor: 'rgba(255,255,255,0.12)' },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Box>

      <DialogContent
        sx={{
          p: 0,
          overflowY: 'auto',
          '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-thumb': { bgcolor: '#E2E8F0', borderRadius: 2 },
        }}
      >
        {/* Applied for */}
        {candidate.job_title && (
          <Box
            sx={{
              px: { xs: 2, sm: 2.5 },
              py: { xs: 1.2, sm: 1.5 },
              bgcolor: '#F8FAFC',
              borderBottom: '1px solid #E2E8F0',
              '@media (max-width: 240px)': { px: 1.5, py: 1 },
            }}
          >
            <Typography
              sx={{
                fontSize: { xs: '0.62rem', sm: '0.68rem' },
                color: '#94A3B8',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                mb: 0.4,
              }}
            >
              Applied For
            </Typography>
            <Typography
              sx={{ fontSize: { xs: '0.82rem', sm: '0.88rem' }, color: '#1E293B', fontWeight: 700 }}
            >
              {candidate.job_title}
              {candidate.job_type && (
                <Box component="span" sx={{ fontWeight: 400, color: '#64748B', ml: 1, fontSize: '0.82rem' }}>
                  · {candidate.job_type}
                </Box>
              )}
            </Typography>
          </Box>
        )}

        <Box sx={{ px: { xs: 2, sm: 2.5 }, py: { xs: 2, sm: 2.5 }, '@media (max-width: 240px)': { px: 1.5, py: 1.5 } }}>
          {/* Contact */}
          <Stack spacing={{ xs: 1, sm: 1.2 }}>
            <InfoRow icon={Email}      value={candidate.email}          color="#4338CA" />
            <InfoRow icon={Phone}      value={candidate.mobile_number}  color="#0284C7" />
            <InfoRow icon={LocationOn} value={formatLocation(candidate)} color="#DC2626" />
            <InfoRow icon={WorkIcon}   value={`${formatExperience(candidate.years_of_experience)} experience`} color="#D97706" />
          </Stack>

          {/* Loading shimmer */}
          {detailLoading && (
            <>
              <Divider sx={{ my: { xs: 1.8, sm: 2.2 }, borderColor: '#F1F5F9' }} />
              <Stack direction="row" spacing={1} alignItems="center">
                <CircularProgress size={13} sx={{ color: '#4338CA' }} />
                <Typography sx={{ fontSize: '0.75rem', color: '#94A3B8' }}>Loading details…</Typography>
              </Stack>
            </>
          )}

          {!detailLoading && (
            <>
              {/* Skills */}
              {skills.length > 0 && (
                <>
                  <Divider sx={{ my: { xs: 1.8, sm: 2.2 }, borderColor: '#F1F5F9' }} />
                  <Typography
                    sx={{
                      fontSize: { xs: '0.62rem', sm: '0.68rem' },
                      fontWeight: 700,
                      color: '#64748B',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      mb: { xs: 0.8, sm: 1 },
                    }}
                  >
                    Skills
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 0.5, sm: 0.6 } }}>
                    {skills.map(skill => (
                      <Chip
                        key={skill}
                        label={skill}
                        size="small"
                        sx={{
                          bgcolor: '#EEF2FF',
                          color: '#4338CA',
                          border: '1px solid #C7D2FE',
                          fontSize: { xs: '0.62rem', sm: '0.68rem' },
                          height: { xs: 20, sm: 22 },
                          fontWeight: 500,
                        }}
                      />
                    ))}
                  </Box>
                </>
              )}

              {/* Education */}
              {education.length > 0 && (
                <>
                  <Divider sx={{ my: { xs: 1.8, sm: 2.2 }, borderColor: '#F1F5F9' }} />
                  <Typography
                    sx={{
                      fontSize: { xs: '0.62rem', sm: '0.68rem' },
                      fontWeight: 700,
                      color: '#64748B',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      mb: { xs: 0.8, sm: 1.2 },
                    }}
                  >
                    Education
                  </Typography>
                  <Stack spacing={{ xs: 1, sm: 1.2 }}>
                    {education.map((edu, idx) => (
                      <Stack key={idx} direction="row" spacing={1.5} alignItems="flex-start">
                        <Box
                          sx={{
                            width: { xs: 26, sm: 30 },
                            height: { xs: 26, sm: 30 },
                            borderRadius: '8px',
                            bgcolor: '#F0FDF4',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            mt: 0.2,
                          }}
                        >
                          <School sx={{ fontSize: { xs: 13, sm: 15 }, color: '#16A34A' }} />
                        </Box>
                        <Box>
                          <Typography sx={{ fontSize: { xs: '0.8rem', sm: '0.85rem' }, color: '#1E293B', fontWeight: 600 }}>
                            {edu.degree_level || '—'}
                            {edu.field_of_study && (
                              <span style={{ fontWeight: 400, color: '#64748B' }}> · {edu.field_of_study}</span>
                            )}
                          </Typography>
                          <Typography sx={{ fontSize: { xs: '0.68rem', sm: '0.73rem' }, color: '#94A3B8' }}>
                            {edu.university || '—'}
                            {edu.graduation_year && <span> · {edu.graduation_year}</span>}
                          </Typography>
                        </Box>
                      </Stack>
                    ))}
                  </Stack>
                </>
              )}

              {/* Cover letter */}
              {candidate.cover_letter && (
                <>
                  <Divider sx={{ my: { xs: 1.8, sm: 2.2 }, borderColor: '#F1F5F9' }} />
                  <Typography
                    sx={{
                      fontSize: { xs: '0.62rem', sm: '0.68rem' },
                      fontWeight: 700,
                      color: '#64748B',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      mb: { xs: 0.8, sm: 1 },
                    }}
                  >
                    Cover Letter
                  </Typography>
                  <Box
                    sx={{
                      p: { xs: 1.2, sm: 1.5 },
                      bgcolor: '#F8FAFC',
                      borderRadius: '10px',
                      border: '1px solid #E2E8F0',
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: { xs: '0.78rem', sm: '0.83rem' },
                        color: '#475569',
                        lineHeight: 1.65,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {candidate.cover_letter}
                    </Typography>
                  </Box>
                </>
              )}

              {/* Availability pills */}
              {(candidate.notice_period || candidate.available_to_join || expectedCtc) && (
                <>
                  <Divider sx={{ my: { xs: 1.8, sm: 2.2 }, borderColor: '#F1F5F9' }} />
                  <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                    {[
                      { label: 'Notice',    value: candidate.notice_period },
                      { label: 'Available', value: candidate.available_to_join },
                      { label: 'Expected CTC', value: expectedCtc },
                    ].filter(x => x.value).map(({ label, value }) => (
                      <Box
                        key={label}
                        sx={{
                          p: { xs: 1, sm: 1.2 },
                          bgcolor: '#F8FAFC',
                          borderRadius: '10px',
                          border: '1px solid #E2E8F0',
                          minWidth: { xs: 90, sm: 100 },
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: { xs: '0.58rem', sm: '0.63rem' },
                            color: '#94A3B8',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                          }}
                        >
                          {label}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: { xs: '0.78rem', sm: '0.83rem' },
                            color: '#1E293B',
                            fontWeight: 700,
                            mt: 0.3,
                          }}
                        >
                          {value}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </>
              )}
            </>
          )}
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          px: { xs: 2, sm: 2.5 },
          py: { xs: 1.5, sm: 2 },
          borderTop: '1px solid #E2E8F0',
          gap: 1,
          '@media (max-width: 240px)': { px: 1.5, py: 1 },
        }}
      >
        <Button
          onClick={onClose}
          sx={{
            textTransform: 'none',
            color: '#64748B',
            fontSize: { xs: '0.78rem', sm: '0.85rem' },
          }}
        >
          Close
        </Button>
        {(candidate.resume_url || candidate.resume_s3_key) && (
          <Button
            variant="contained"
            startIcon={<OpenInNew sx={{ fontSize: { xs: 13, sm: 15 } }} />}
            onClick={() =>
              window.open(`/api/jobs/application/${candidate.id}/document/resume`, '_blank')
            }
            sx={{
              textTransform: 'none',
              bgcolor: '#1E3358',
              '&:hover': { bgcolor: '#152540' },
              borderRadius: '10px',
              px: { xs: 1.8, sm: 2.5 },
              fontSize: { xs: '0.78rem', sm: '0.85rem' },
            }}
          >
            View Resume
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// CandidateFilters — search + status filter bar
// ═══════════════════════════════════════════════════════════════════════════════
export const CandidateFilters = ({ search, statusFilter, onSearchChange, onStatusChange }) => (
  <Stack
    direction={{ xs: 'column', sm: 'row' }}
    spacing={{ xs: 1, sm: 1.5 }}
    sx={{
      '@media (max-width: 240px)': { spacing: 0.8 },
    }}
  >
    <TextField
      placeholder="Search by name or email…"
      value={search}
      onChange={(e) => onSearchChange(e.target.value)}
      size="small"
      sx={{
        flex: 1,
        '& .MuiOutlinedInput-root': {
          borderRadius: '10px',
          bgcolor: '#FAFAFA',
          fontSize: { xs: '0.78rem', sm: '0.83rem' },
          '& fieldset': { borderColor: '#E2E8F0' },
          '&:hover fieldset': { borderColor: '#CBD5E1' },
          '&.Mui-focused fieldset': { borderColor: '#1E3358', borderWidth: '1.5px' },
        },
        '& .MuiInputBase-input': {
          py: { xs: '7px', sm: '8px' },
          '@media (max-width: 240px)': { py: '5px', fontSize: '0.7rem' },
        },
      }}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <Search sx={{ fontSize: { xs: 14, sm: 16 }, color: '#94A3B8' }} />
          </InputAdornment>
        ),
      }}
    />
    <FormControl
      size="small"
      sx={{
        minWidth: { xs: '100%', sm: 160 },
        '& .MuiOutlinedInput-root': {
          borderRadius: '10px',
          bgcolor: '#FAFAFA',
          fontSize: { xs: '0.78rem', sm: '0.83rem' },
          '& fieldset': { borderColor: '#E2E8F0' },
          '&.Mui-focused fieldset': { borderColor: '#1E3358', borderWidth: '1.5px' },
        },
        '& .MuiSelect-select': {
          py: { xs: '7px', sm: '8px' },
          '@media (max-width: 240px)': { py: '5px', fontSize: '0.7rem' },
        },
      }}
    >
      <InputLabel sx={{ fontSize: { xs: '0.78rem', sm: '0.83rem' } }}>Status</InputLabel>
      <Select
        value={statusFilter}
        label="Status"
        onChange={(e) => onStatusChange(e.target.value)}
      >
        <MenuItem value="" sx={{ fontSize: { xs: '0.78rem', sm: '0.83rem' } }}>
          All Statuses
        </MenuItem>
        {Object.entries(STATUS_CONFIG).map(([k, v]) => (
          <MenuItem key={k} value={k} sx={{ fontSize: { xs: '0.78rem', sm: '0.83rem' } }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: v.color,
                  flexShrink: 0,
                }}
              />
              {v.label}
            </Stack>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  </Stack>
);