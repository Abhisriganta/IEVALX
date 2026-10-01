// BUILD: 2026-09-29-readonly-dialog
import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Paper, Grid, Chip, Skeleton, Button,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
} from '@mui/material';
import {
  Person, Work, Code, Language, MoreHoriz, VerifiedUser,
  CameraAlt, DeleteOutlined as DeleteOutline,
} from '@mui/icons-material';
import { interviewerService } from '@/services/api/iaem';

/* ── Palette ─────────────────────────────────────────────────────────── */
const T = {
  pine:      '#04282B',
  pineHov:   '#0a3d40',
  pineSoft:  '#0E3538',
  sage:      '#8FB08E',
  sageDark:  '#7F9E7E',
  sageSoft:  '#EDF3EC',
  sageText:  '#5E815D',
  cream:     '#F6F8F3',
  ink:       '#101210',
  body:      '#2F332E',
  muted:     '#55584F',
  faint:     '#7A7E76',
  line:      '#E7EAE3',
  lineSoft:  '#F0F2ED',
  surface:   '#FFFFFF',
  white:     '#FFFFFF',
  whiteSoft: 'rgba(255,255,255,0.72)',
};
const FONT = "'Jost','DM Sans',sans-serif";

/* ── Small field row (read mode) ─────────────────────────────────────── */
const ReadField = ({ label, value }) => (
  <Box>
    <Typography sx={{
      fontSize: '0.7rem', fontWeight: 600, color: T.faint, fontFamily: FONT,
      textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.5,
    }}>
      {label}
    </Typography>
    <Typography sx={{
      fontSize: '0.92rem', fontWeight: 500, color: T.body, fontFamily: FONT,
      wordBreak: 'break-word',
    }}>
      {value || '—'}
    </Typography>
  </Box>
);

/* ── Section card wrapper (read-only) ────────────────────────────────── */
const SectionCard = ({ icon, title, children }) => (
  <Paper elevation={0} sx={{
    borderRadius: '14px', border: `1px solid ${T.line}`, bgcolor: T.surface,
    overflow: 'hidden', mb: 2,
  }}>
    <Box sx={{
      px: 2.5, py: 1.75, display: 'flex', alignItems: 'center',
      borderBottom: `1px solid ${T.lineSoft}`,
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ color: T.sageText, display: 'flex' }}>{icon}</Box>
        <Typography sx={{
          fontSize: '0.95rem', fontWeight: 700, color: T.pine, fontFamily: FONT,
        }}>
          {title}
        </Typography>
      </Box>
    </Box>
    <Box sx={{ p: 2.5 }}>{children}</Box>
  </Paper>
);

/* ══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════════════ */
const InterviewerProfile = () => {
  const [profile, setProfile]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const photoFileRef = useRef(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    interviewerService.getMyProfile()
      .then(res => { setProfile(res.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1100, mx: 'auto' }}>
        <Skeleton variant="rounded" height={160} sx={{ borderRadius: '14px', mb: 2 }} />
        <Skeleton variant="rounded" height={180} sx={{ borderRadius: '14px', mb: 2 }} />
        <Skeleton variant="rounded" height={220} sx={{ borderRadius: '14px' }} />
      </Box>
    );
  }
  if (!profile) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography sx={{ color: T.muted, fontFamily: FONT }}>Profile not found.</Typography>
      </Box>
    );
  }

  const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || '—';
  const initials = `${(profile.first_name || '?')[0] || ''}${(profile.last_name || '')[0] || ''}`.toUpperCase();
  const isActive = String(profile.state || '').toUpperCase() === 'ACTIVE';

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1100, mx: 'auto', fontFamily: FONT }}>

      {/* ═══════════ HERO CARD (pine background) ═══════════ */}
      <Paper elevation={0} sx={{
        position: 'relative', overflow: 'hidden',
        borderRadius: '16px', bgcolor: T.pine, color: T.white,
        px: { xs: 2.5, md: 3.5 }, py: { xs: 2.5, md: 3 }, mb: 2.5,
      }}>
        {/* Decorative circle top-right */}
        <Box sx={{
          position: 'absolute', top: -60, right: -60,
          width: 220, height: 220, borderRadius: '50%',
          bgcolor: T.pineSoft, opacity: 0.55, pointerEvents: 'none',
        }} />

        <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 2.5, flexWrap: 'wrap' }}>
          {/* Avatar */}
          <Box sx={{ flexShrink: 0 }}>
            <Box sx={{
              width: 84, height: 84, borderRadius: '50%',
              bgcolor: T.sage, color: T.pine,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: FONT, fontWeight: 700, fontSize: '1.75rem',
              border: '3px solid rgba(255,255,255,0.08)',
              overflow: 'hidden',
            }}>
              {profile.profile_photo_url ? (
                <img src={profile.profile_photo_url} alt={fullName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                initials || 'IV'
              )}
            </Box>
          </Box>

          {/* Name + meta + chips */}
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography sx={{
              fontFamily: FONT, fontWeight: 700, fontSize: { xs: '1.4rem', md: '1.6rem' },
              color: T.white, lineHeight: 1.15,
            }}>
              {fullName}
            </Typography>
            <Typography sx={{
              fontFamily: FONT, fontSize: '0.85rem', color: T.whiteSoft, mt: 0.5,
            }}>
              {profile.interviewer_id}
              {profile.department ? ` · ${profile.department}` : ''}
              {profile.designation ? ` · ${profile.designation}` : ''}
            </Typography>

            <Box sx={{ display: 'flex', gap: 1, mt: 1.25, flexWrap: 'wrap' }}>
              <Chip
                size="small"
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Box sx={{
                      width: 7, height: 7, borderRadius: '50%',
                      bgcolor: isActive ? '#7ED991' : T.faint,
                    }} />
                    <span>{isActive ? 'Active' : (profile.state || 'Inactive')}</span>
                  </Box>
                }
                sx={{
                  bgcolor: 'rgba(143,176,142,0.22)', color: '#D6ECC9',
                  fontWeight: 600, fontFamily: FONT, fontSize: '0.78rem',
                  border: '1px solid rgba(143,176,142,0.35)',
                  '& .MuiChip-label': { px: 1.25 },
                }}
              />
              {profile.bar_raiser && (
                <Chip
                  size="small"
                  label="Bar Raiser"
                  sx={{
                    bgcolor: 'rgba(255,215,120,0.18)', color: '#FFE7A8',
                    fontWeight: 700, fontFamily: FONT, fontSize: '0.78rem',
                    border: '1px solid rgba(255,215,120,0.35)',
                  }}
                />
              )}
            </Box>
          </Box>
        </Box>

        {/* ── Photo action buttons (labeled) ── */}
        <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', gap: 1, mt: 2 }}>
          <input
            ref={photoFileRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                const res = await interviewerService.uploadProfilePhoto(file);
                const newUrl = res.data.profile_photo_url;
                setProfile({ ...profile, profile_photo_url: newUrl });
                localStorage.setItem("user_profile_image_url", newUrl);
                localStorage.setItem("user_profile_image_url_ts", String(Date.now()));
                window.dispatchEvent(new CustomEvent('profile-image-updated', { detail: { url: newUrl } }));
              } catch (err) { console.error(err); }
              e.target.value = '';
            }}
          />
          <Button
            size="small"
            startIcon={<CameraAlt sx={{ fontSize: '15px !important' }} />}
            onClick={() => photoFileRef.current?.click()}
            sx={{
              textTransform: 'none', fontFamily: FONT, fontSize: '0.8rem', fontWeight: 600,
              color: T.white, borderRadius: '8px', px: 1.5, py: 0.5,
              border: '1px solid rgba(255,255,255,0.25)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.4)' },
            }}
          >
            Change Photo
          </Button>
          {profile.profile_photo_url && (
            <Button
              size="small"
              startIcon={<DeleteOutline sx={{ fontSize: '15px !important' }} />}
              onClick={() => setDeleteDialogOpen(true)}
              sx={{
                textTransform: 'none', fontFamily: FONT, fontSize: '0.8rem', fontWeight: 600,
                color: T.whiteSoft, borderRadius: '8px', px: 1.5, py: 0.5,
                border: '1px solid rgba(255,255,255,0.15)',
                '&:hover': { bgcolor: 'rgba(192,57,43,0.2)', borderColor: 'rgba(192,57,43,0.5)', color: '#F5B7B1' },
              }}
            >
              Remove
            </Button>
          )}
        </Box>

        {/* ── Delete photo confirmation dialog ── */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          PaperProps={{
            sx: {
              borderRadius: '14px', fontFamily: FONT, px: 1, py: 0.5,
            },
          }}
        >
          <DialogTitle sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '1.1rem', color: T.pine }}>
            Remove profile photo?
          </DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ fontFamily: FONT, fontSize: '0.9rem', color: T.muted }}>
              Your profile photo will be removed. You can upload a new one anytime.
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ px: 2.5, pb: 2 }}>
            <Button
              onClick={() => setDeleteDialogOpen(false)}
              sx={{
                textTransform: 'none', fontFamily: FONT, fontWeight: 600,
                color: T.muted, borderRadius: '8px',
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                setDeleteDialogOpen(false);
                try {
                  await interviewerService.deleteProfilePhoto();
                  setProfile({ ...profile, profile_photo_url: null });
                  localStorage.removeItem("user_profile_image_url");
                  localStorage.removeItem("user_profile_image_url_ts");
                  window.dispatchEvent(new CustomEvent('profile-image-updated', { detail: { removed: true } }));
                } catch (err) { console.error(err); }
              }}
              sx={{
                textTransform: 'none', fontFamily: FONT, fontWeight: 700,
                color: T.white, bgcolor: '#C0392B', borderRadius: '8px',
                px: 2, '&:hover': { bgcolor: '#A93226' },
              }}
            >
              Remove
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>

      {/* ═══════════ PERSONAL INFORMATION ═══════════ */}
      <SectionCard icon={<Person sx={{ fontSize: 20 }} />} title="Personal information">
        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <ReadField label="Name" value={fullName} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <ReadField label="Email" value={profile.email} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <ReadField label="Phone" value={profile.phone} />
          </Grid>
        </Grid>
      </SectionCard>

      {/* ═══════════ WORK DETAILS ═══════════ */}
      <SectionCard icon={<Work sx={{ fontSize: 20 }} />} title="Work details">
        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <ReadField label="Department" value={profile.department} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <ReadField label="Designation" value={profile.designation} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <ReadField label="Seniority" value={profile.seniority} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <ReadField label="Timezone" value={profile.timezone} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Typography sx={{
              fontSize: '0.7rem', fontWeight: 600, color: T.faint, fontFamily: FONT,
              textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.5,
            }}>
              Weekly cap
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{
                flex: 1, height: 8, borderRadius: '999px', bgcolor: T.lineSoft, overflow: 'hidden',
                minWidth: 80, maxWidth: 160,
              }}>
                <Box sx={{
                  width: `${Math.min(100, ((profile.weekly_cap || 0) / 10) * 100)}%`,
                  height: '100%', bgcolor: T.sage,
                }} />
              </Box>
              <Typography sx={{ fontSize: '0.88rem', fontWeight: 600, color: T.body, fontFamily: FONT }}>
                {profile.weekly_cap ?? '—'} interviews
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </SectionCard>

      {/* ═══════════ SKILLS (read-only) ═══════════ */}
      <Paper elevation={0} sx={{
        borderRadius: '14px', border: `1px solid ${T.line}`, bgcolor: T.surface,
        overflow: 'hidden', mb: 2,
      }}>
        <Box sx={{
          px: 2.5, py: 1.75, display: 'flex', alignItems: 'center',
          borderBottom: `1px solid ${T.lineSoft}`,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ color: T.sageText, display: 'flex' }}><Code sx={{ fontSize: 20 }} /></Box>
            <Typography sx={{
              fontSize: '0.95rem', fontWeight: 700, color: T.pine, fontFamily: FONT,
            }}>
              Skills
            </Typography>
          </Box>
        </Box>
        <Box sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
            {(profile.skills || []).length > 0 ? profile.skills.map(s => (
              <Chip key={s} label={s} size="small"
                sx={{
                  bgcolor: T.sageSoft, color: T.sageText, fontWeight: 600, fontFamily: FONT,
                  fontSize: '0.8rem', height: 26, borderRadius: '8px',
                }} />
            )) : (
              <Typography sx={{ fontSize: '0.85rem', color: T.faint, fontFamily: FONT }}>
                No skills added yet.
              </Typography>
            )}
          </Box>
        </Box>
      </Paper>

      {/* ═══════════ LANGUAGES ═══════════ */}
      <SectionCard icon={<Language sx={{ fontSize: 20 }} />} title="Languages">
        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
          {(profile.languages || []).length > 0 ? profile.languages.map(l => (
            <Chip key={l} label={l} size="small"
              sx={{
                bgcolor: T.cream, color: T.body, fontWeight: 600, fontFamily: FONT,
                fontSize: '0.8rem', height: 26, borderRadius: '8px',
                border: `1px solid ${T.line}`,
              }} />
          )) : (
            <Typography sx={{ fontSize: '0.85rem', color: T.faint, fontFamily: FONT }}>
              No languages added yet.
            </Typography>
          )}
        </Box>
      </SectionCard>

    </Box>
  );
};

export default InterviewerProfile;