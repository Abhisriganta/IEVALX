import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Paper, Grid, Avatar, Button, CircularProgress, Chip,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
} from '@mui/material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import DeleteIcon from '@mui/icons-material/Delete';
import complianceService from '../../../services/api/iaem/complianceService';

/* ── theme tokens (pine / sage from sidebar palette) ── */
const C = {
  pine:      '#04282B',
  pine2:     '#24433E',
  sage:      '#8FB08E',
  sageDark:  '#6C8B6B',
  sageSoft:  '#EDF3EC',
  card:      '#FFFFFF',
  border:    '#E7EAE3',
  text:      '#1A2A4A',
  muted:     '#6F7470',
  success:   '#2E7D32',
  successBg: '#E8F5E9',
  danger:    '#C0392B',
};

const bannerGradient = `linear-gradient(135deg, ${C.pine} 0%, ${C.pine2} 50%, ${C.sage} 100%)`;

/* ── reusable field ── */
const Field = ({ label, value, sx = {} }) => (
  <Box sx={sx}>
    <Typography
      variant="caption"
      sx={{ color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}
    >
      {label}
    </Typography>
    <Typography variant="body2" sx={{ color: C.text, mt: 0.25, fontWeight: 500 }}>
      {value || '—'}
    </Typography>
  </Box>
);

const ComplianceProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [photoLoading, setPhotoLoading] = useState(false);
  const fileRef = useRef(null);

  const fetchProfile = async () => {
    try {
      const res = await complianceService.getProfile();
      setProfile(res.data);
    } catch (e) {
      console.error('Failed to load profile', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfile(); }, []);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoLoading(true);
    try {
      const res = await complianceService.uploadProfilePhoto(file);
      const newUrl = res.data.profile_photo_url;
      setProfile(prev => ({ ...prev, profile_photo_url: newUrl }));
      localStorage.setItem("user_profile_image_url", newUrl);
      localStorage.setItem("user_profile_image_url_ts", String(Date.now()));
      window.dispatchEvent(new CustomEvent('profile-image-updated', { detail: { url: newUrl } }));
    } catch (err) {
      console.error('Upload failed', err);
      alert(err?.response?.data?.detail || 'Upload failed');
    } finally {
      setPhotoLoading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleDelete = async () => {
    setDeleteDialogOpen(false);
    setPhotoLoading(true);
    try {
      await complianceService.deleteProfilePhoto();
      setProfile(prev => ({ ...prev, profile_photo_url: null }));
      localStorage.removeItem("user_profile_image_url");
      localStorage.removeItem("user_profile_image_url_ts");
      window.dispatchEvent(new CustomEvent('profile-image-updated', { detail: { removed: true } }));
    } catch (err) {
      console.error('Delete failed', err);
    } finally {
      setPhotoLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!profile) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">Could not load profile.</Typography>
      </Box>
    );
  }

  const initials =
    `${(profile.first_name || '')[0] || ''}${(profile.last_name || '')[0] || ''}`.toUpperCase();
  const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>Compliance Profile</Typography>

      <Paper elevation={0} sx={{ borderRadius: 3.5, border: `1px solid ${C.border}`, overflow: 'hidden' }}>

        {/* ── Banner gradient ── */}
        <Box sx={{ height: 72, background: bannerGradient }} />

        {/* ── Card body ── */}
        <Box sx={{ px: 3, pb: 3 }}>

          {/* ── Avatar row ── */}
          <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 2, mt: '-34px', mb: 2.5 }}>
            <Box sx={{ position: 'relative', flexShrink: 0 }}>
              <Avatar
                src={profile.profile_photo_url || undefined}
                sx={{
                  width: 72, height: 72, fontSize: 24, fontWeight: 700,
                  bgcolor: C.pine, color: C.sage,
                  border: `3px solid ${C.card}`,
                  boxShadow: '0 2px 8px rgba(4,40,43,0.18)',
                }}
              >
                {initials}
              </Avatar>
              {photoLoading && (
                <CircularProgress
                  size={22}
                  sx={{ position: 'absolute', bottom: 0, right: 0, bgcolor: '#fff', borderRadius: '50%', p: '2px' }}
                />
              )}
            </Box>

            <Box sx={{ pt: 5, minWidth: 0 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2, color: C.text }}>
                {fullName}
              </Typography>
              <Typography variant="caption" sx={{ color: C.muted, display: 'block', mt: 0.25 }}>
                Compliance Officer · {profile.email}
              </Typography>
            </Box>

            <Box sx={{ ml: 'auto', alignSelf: 'center' }}>
              <Chip
                label={profile.is_active ? 'Active' : 'Inactive'}
                size="small"
                sx={{
                  fontWeight: 600, fontSize: 11,
                  bgcolor: profile.is_active ? C.successBg : '#FFF3E0',
                  color: profile.is_active ? C.success : '#E65100',
                  '& .MuiChip-label': { px: 1.2 },
                }}
                icon={
                  <Box
                    sx={{
                      width: 6, height: 6, borderRadius: '50%', ml: 1,
                      bgcolor: profile.is_active ? C.success : '#E65100',
                    }}
                  />
                }
              />
            </Box>
          </Box>

          {/* ── Photo action buttons (labeled) ── */}
          <Box sx={{ display: 'flex', gap: 1, mb: 2.5 }}>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              hidden
              onChange={handleUpload}
            />
            <Button
              variant="outlined"
              size="small"
              startIcon={<PhotoCameraIcon sx={{ fontSize: '16px !important' }} />}
              onClick={() => fileRef.current?.click()}
              disabled={photoLoading}
              sx={{
                textTransform: 'none', fontWeight: 500, fontSize: 12,
                borderColor: C.border, color: C.text, borderRadius: 2,
                '&:hover': { bgcolor: C.sageSoft, borderColor: C.sageDark, color: C.sageDark },
              }}
            >
              Change Photo
            </Button>
            {profile.profile_photo_url && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<DeleteIcon sx={{ fontSize: '16px !important' }} />}
                onClick={() => setDeleteDialogOpen(true)}
                disabled={photoLoading}
                sx={{
                  textTransform: 'none', fontWeight: 500, fontSize: 12,
                  borderColor: C.border, color: C.muted, borderRadius: 2,
                  '&:hover': { bgcolor: '#FDEDEC', borderColor: '#E8B4AE', color: C.danger },
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
            PaperProps={{ sx: { borderRadius: '14px', px: 1, py: 0.5 } }}
          >
            <DialogTitle sx={{ fontWeight: 700, fontSize: '1.1rem', color: C.pine }}>
              Remove profile photo?
            </DialogTitle>
            <DialogContent>
              <DialogContentText sx={{ fontSize: '0.9rem', color: C.muted }}>
                Your profile photo will be removed. You can upload a new one anytime.
              </DialogContentText>
            </DialogContent>
            <DialogActions sx={{ px: 2.5, pb: 2 }}>
              <Button
                onClick={() => setDeleteDialogOpen(false)}
                sx={{ textTransform: 'none', fontWeight: 600, color: C.muted, borderRadius: '8px' }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDelete}
                sx={{
                  textTransform: 'none', fontWeight: 700,
                  color: '#fff', bgcolor: C.danger, borderRadius: '8px',
                  px: 2, '&:hover': { bgcolor: '#A93226' },
                }}
              >
                Remove
              </Button>
            </DialogActions>
          </Dialog>

          {/* ── Divider ── */}
          <Box sx={{ height: '1px', bgcolor: C.border, mb: 2.5 }} />

          {/* ── Profile fields ── */}
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Field label="Full Name" value={fullName} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Field label="Email Address" value={profile.email} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Field label="Role" value="Compliance Officer" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Field label="Phone" value={profile.phone} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Field
                label="Status"
                value={profile.is_active ? 'Active' : 'Inactive'}
                sx={{
                  '& .MuiTypography-body2': {
                    color: profile.is_active ? C.success : '#E65100',
                    fontWeight: 600,
                  },
                }}
              />
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Box>
  );
};

export default ComplianceProfile;