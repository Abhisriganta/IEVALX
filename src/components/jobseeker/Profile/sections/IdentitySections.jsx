import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Card, Grid, Stack, Typography, Button, Avatar, Chip, Link, Alert, CircularProgress,
  LinearProgress, FormControlLabel, Checkbox, InputAdornment, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Popover,
} from '@mui/material';
import EditOutlined from '@mui/icons-material/EditOutlined';
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined';
import PhotoCameraOutlined from '@mui/icons-material/PhotoCameraOutlined';
import LaunchOutlined from '@mui/icons-material/LaunchOutlined';
import SearchOutlined from '@mui/icons-material/SearchOutlined';
import PlayArrowOutlined from '@mui/icons-material/PlayArrowOutlined';
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined';
import DownloadOutlined from '@mui/icons-material/DownloadOutlined';
import CloseOutlined from '@mui/icons-material/CloseOutlined';
import ArrowDropDown from '@mui/icons-material/ArrowDropDown';
import AddOutlined from '@mui/icons-material/AddOutlined';

import quickInterviewService from '@/services/api/jobseeker/quickInterviewService';

import {
  SectionCard, EmptyState, FormDialog, ConfirmDialog,
  TextInput, SelectInput,
} from '../parts';

import {
  usePersonalDetailsEditor,
  usePhotoEditor,
  useOnlineProfilesEditor,
} from '@/hooks/jobseeker/usePersonalDetailsEditor';

import {
  GENDER_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  CATEGORY_OPTIONS,
  MORE_INFORMATION_OPTIONS,
  PERSONAL_FIELD_LIMITS,
  COUNTRY_CODES,
  PHOTO_ACCEPT_ATTRIBUTE,
  PHOTO_MAX_FILE_SIZE,
  ONLINE_PLATFORMS,
  MAX_ONLINE_PROFILES,
  QUICK_INTERVIEW_ROUTE,
  PALETTE,
  FONTS,
} from '@/constants/profileConstants';

const actionSx = {
  fontFamily: FONTS.body, textTransform: 'none',
  fontWeight: 600, fontSize: '0.8125rem',
};

function DetailRow({ label, value }) {
  if (!value || (Array.isArray(value) && !value.length)) return null;
  return (
    <Grid size={{ xs: 12, sm: 6 }}>
      <Typography sx={{ fontFamily: FONTS.body, fontSize: '0.75rem', color: PALETTE.muted }}>
        {label}
      </Typography>
      <Typography
       sx={{
          fontFamily: FONTS.body, fontSize: '0.875rem',
          color: PALETTE.navy, fontWeight: 500, mt: 0.25 }}
      >
        {Array.isArray(value) ? value.join(', ') : value}
      </Typography>
    </Grid>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   PROFILE PHOTO
   ══════════════════════════════════════════════════════════════════════════ */

export function PhotoSection({
  candidateId, basic, photoUrl, loading, onRefresh, onPhotoChanged,
  editor: externalEditor, completionPercent = 0,
}) {
  const ownEditor = usePhotoEditor({
    candidateId, basic, photoUrl, onSaved: onRefresh, onPhotoChanged,
  });
  const editor = externalEditor || ownEditor;

  return (
    <>
      <SectionCard
        id="photo"
        title="Profile photo"
        description="Profiles with a photo get opened more often."
        complete={editor.hasPhoto}
        loading={loading}
      >
        <input
          ref={editor.inputRef}
          type="file"
          accept={PHOTO_ACCEPT_ATTRIBUTE}
          onChange={editor.onInputChange}
          style={{ display: 'none' }}
          aria-hidden="true"
        />

        {editor.error && (
          <Alert
            severity="error"
            onClose={() => editor.setError('')}
           sx={{ mb: 2, fontFamily: FONTS.body, fontSize: '0.8125rem' }}
          >
            {editor.error}
          </Alert>
        )}

        {editor.uploading && (
          <LinearProgress
           sx={{
              mb: 2, height: 4, borderRadius: 2, bgcolor: PALETTE.border,
              '& .MuiLinearProgress-bar': { bgcolor: PALETTE.accent } }}
          />
        )}

        <Stack direction="row" gap={2.5} sx={{ alignItems: 'center' }}>
          <Box sx={{ position: 'relative', width: 100, height: 100 }}>
            {/* Track ring (grey background) */}
            <CircularProgress
              variant="determinate"
              value={100}
              size={100}
              thickness={3}
              sx={{
                position: 'absolute', top: 0, left: 0,
                color: PALETTE.border,
              }}
            />
            {/* Progress ring (accent / success) */}
            <CircularProgress
              variant="determinate"
              value={Math.max(0, Math.min(100, Number(completionPercent) || 0))}
              size={100}
              thickness={3}
              sx={{
                position: 'absolute', top: 0, left: 0,
                color: (Number(completionPercent) || 0) >= 80 ? PALETTE.success : PALETTE.accent,
                '& .MuiCircularProgress-circle': { strokeLinecap: 'round' },
              }}
            />
            {/* Percent label at the bottom */}
            <Typography
              sx={{
                position: 'absolute',
                bottom: -6, left: '50%',
                transform: 'translateX(-50%)',
                fontFamily: FONTS.display,
                fontSize: '0.6875rem',
                color: '#fff',
                bgcolor: (Number(completionPercent) || 0) >= 80 ? PALETTE.success : PALETTE.accent,
                px: 0.75, py: 0.1, borderRadius: 999,
                lineHeight: 1.4,
              }}
            >
              {Math.round(Number(completionPercent) || 0)}%
            </Typography>
            <Avatar
              src={editor.hasPhoto ? editor.photoUrl : undefined}
             sx={{
                position: 'absolute', top: 8, left: 8,
                width: 84, height: 84,
                bgcolor: PALETTE.navy,
                fontFamily: FONTS.display,
                fontSize: '1.75rem' }}
            >
              {editor.initials}
            </Avatar>
            <IconButton
              onClick={editor.pick}
              disabled={editor.uploading}
              aria-label={editor.hasPhoto ? 'Change photo' : 'Add photo'}
              size="small"
             sx={{
                position: 'absolute', right: -4, bottom: -4,
                bgcolor: PALETTE.surface,
                border: `1px solid ${PALETTE.border}`,
                '&:hover': { bgcolor: PALETTE.offWhite } }}
            >
              <PhotoCameraOutlined sx={{ fontSize: 17, color: PALETTE.accent }} />
            </IconButton>
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
             sx={{
                fontFamily: FONTS.body, fontSize: '0.875rem',
                color: PALETTE.navy, fontWeight: 500 }}
            >
              {editor.hasPhoto ? 'Your photo is set' : 'No photo yet'}
            </Typography>
            <Typography
             sx={{ fontFamily: FONTS.body, fontSize: '0.75rem', color: PALETTE.muted, mt: 0.25 }}
            >
              JPG, PNG, GIF or WEBP, up to {Math.round(PHOTO_MAX_FILE_SIZE / (1024 * 1024))}MB.
              A clear head-and-shoulders shot works best.
            </Typography>

            <Stack direction="row" gap={0.5} sx={{ mt: 1 }}>
              <Button
                onClick={editor.pick}
                disabled={editor.uploading}
                size="small"
               sx={{ ...actionSx, color: PALETTE.accent }}
              >
                {editor.hasPhoto ? 'Change photo' : 'Add photo'}
              </Button>
              {editor.hasPhoto && (
                <Button
                  onClick={() => editor.setConfirmRemove(true)}
                  disabled={editor.uploading}
                  size="small"
                  startIcon={<DeleteOutlineOutlined sx={{ fontSize: 17 }} />}
                 sx={{
                    ...actionSx, color: PALETTE.muted,
                    '&:hover': { color: PALETTE.danger, bgcolor: `${PALETTE.danger}0F` } }}
                >
                  Remove
                </Button>
              )}
            </Stack>
          </Box>
        </Stack>
      </SectionCard>

      <ConfirmDialog
        open={editor.confirmRemove}
        onClose={() => editor.setConfirmRemove(false)}
        onConfirm={editor.remove}
        busy={editor.removing}
        title="Remove your photo?"
        message="Your profile will show your initials instead. You can upload a new photo at any time."
        confirmLabel="Remove"
      />
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   PERSONAL DETAILS
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * @param {object} [editor] Optional. Pass the editor in when something outside
 *   this section needs to open the same dialog — the rail's edit pencil does.
 *   Two independent copies of the hook would mean two dialogs and two sets of
 *   form state, and the rail's would silently do nothing.
 */


// ── Scoped palette (matches every other redesigned section) ────────────────
const PD_SAGE          = '#7F9E7E';
const PD_SAGE_HOVER    = '#5E815D';
const PD_SAGE_TINT     = 'rgba(127,158,126,0.15)';
const PD_CHARCOAL      = '#273238';
const PD_CHARCOAL_HOV  = 'rgba(39,50,56,0.85)';
const PD_OFF_WHITE     = '#F7F7F7';
const PD_DANGER        = '#D94D4D';
const PD_FONT          = "'DM Sans', system-ui, sans-serif";
const PD_TEXT_MUTED    = 'rgba(39,50,56,0.6)';
const PD_BORDER        = 'rgba(39,50,56,0.1)';
const PD_ROW_DIVIDER   = 'rgba(39,50,56,0.06)';

// ── Scoped dialog theming ──────────────────────────────────────────────────
// Nested selectors on a wrapper Box; nothing leaks into other dialogs.
const PD_DIALOG_THEME_SX = {
  // Field focus / hover — sage instead of blue
  '& .MuiOutlinedInput-root': {
    '&:hover fieldset': { borderColor: `${PD_SAGE} !important` },
    '&.Mui-focused fieldset': { borderColor: `${PD_SAGE} !important`, borderWidth: '1.5px !important' },
  },
  '& .MuiInputLabel-root.Mui-focused': { color: `${PD_SAGE} !important` },
  '& .MuiFormLabel-asterisk': { color: PD_DANGER },
  // Checkbox "Same as current" — sage instead of blue
  '& .MuiCheckbox-root.Mui-checked': { color: `${PD_SAGE} !important` },
  // Force the shared FormDialog's contained submit button to be flat charcoal.
  '.MuiDialog-paper .MuiDialogActions-root .MuiButton-contained': {
    bgcolor: `${PD_CHARCOAL} !important`,
    color: `${PD_OFF_WHITE} !important`,
    boxShadow: 'none !important',
    '&:hover': {
      bgcolor: `${PD_CHARCOAL_HOV} !important`,
      boxShadow: 'none !important',
    },
  },
};

// Hide dialog scrollbar chrome while keeping wheel / touch / keyboard scroll.
const PD_HIDE_SCROLLBAR_SX = {
  '& *::-webkit-scrollbar': { width: 0, height: 0, background: 'transparent' },
  scrollbarWidth: 'none',
  msOverflowStyle: 'none',
  '.MuiDialog-paper &, .MuiDialogContent-root': {
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    '&::-webkit-scrollbar': { width: 0, height: 0, background: 'transparent' },
  },
};


function PDNumberGridPicker({
  label, value, onChange, options, error, required, placeholder, helper, cols = 6,
}) {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const findLabelFor = (v) => {
    if (v === '' || v == null) return '';
    const match = options.find((opt) => {
      const optValue = typeof opt === 'object' ? opt.value : opt;
      return String(optValue) === String(v);
    });
    if (!match) return String(v);
    return typeof match === 'object' ? String(match.label) : String(match);
  };
  const displayValue = findLabelFor(value);

  const handleOpen  = (e) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);
  const handlePick  = (v) => {
    onChange(v);
    setAnchorEl(null);
  };

  const popoverWidth =
    cols === 1 ? 260 :
    cols === 2 ? 240 :
    cols === 3 ? 220 :
    cols === 4 ? 220 :
    cols === 5 ? 280 : 300;

  return (
    <>
      <TextField
        fullWidth
        size="small"
        label={label}
        required={required}
        error={Boolean(error)}
        helperText={error || helper || ' '}
        value={displayValue}
        placeholder={placeholder}
        onClick={handleOpen}
        InputProps={{
          readOnly: true,
          endAdornment: (
            <InputAdornment position="end" sx={{ mr: -0.5 }}>
              <ArrowDropDown
                sx={{
                  color: open ? PD_SAGE : 'rgba(39,50,56,0.5)',
                  transition: 'transform 0.15s ease',
                  transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              />
            </InputAdornment>
          ),
          sx: { cursor: 'pointer', fontFamily: PD_FONT },
        }}
        InputLabelProps={{ sx: { fontFamily: PD_FONT } }}
        FormHelperTextProps={{ sx: { fontFamily: PD_FONT } }}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: 2,
            '& fieldset': { borderColor: 'rgba(39,50,56,0.2)' },
            '&:hover fieldset': { borderColor: PD_SAGE },
            '&.Mui-focused fieldset': { borderColor: PD_SAGE, borderWidth: '1.5px' },
          },
          '& .MuiInputLabel-root.Mui-focused': { color: PD_SAGE },
          '& .MuiInputBase-input': { cursor: 'pointer' },
        }}
      />
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              mt: 0.75,
              borderRadius: 2.5,
              border: `1px solid ${PD_BORDER}`,
              boxShadow: '0 8px 24px rgba(39,50,56,0.15)',
              p: 1.5,
              width: popoverWidth,
              maxHeight: 320,
              overflowY: 'auto',
              // Popover keeps its own scrollbar hidden too
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              '&::-webkit-scrollbar': { width: 0, height: 0, background: 'transparent' },
            },
          },
        }}
      >
        <Typography
          sx={{
            fontFamily: PD_FONT,
            fontSize: '0.6875rem',
            fontWeight: 700,
            color: PD_TEXT_MUTED,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            mb: 1.25,
            px: 0.5,
          }}
        >
          {label}
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 0.5 }}>
          {options.map((opt) => {
            const optValue = typeof opt === 'object' ? opt.value : opt;
            const optLabel = typeof opt === 'object' ? String(opt.label) : String(opt);
            const selected = String(optValue) === String(value);
            return (
              <Button
                key={optValue}
                onClick={() => handlePick(optValue)}
                sx={{
                  minWidth: 0,
                  py: 1,
                  px: 0.5,
                  fontFamily: PD_FONT,
                  fontSize: '0.8125rem',
                  fontWeight: selected ? 700 : 500,
                  color: selected ? '#FFFFFF' : 'rgba(39,50,56,0.75)',
                  bgcolor: selected ? PD_SAGE : 'transparent',
                  borderRadius: 1.5,
                  textTransform: 'none',
                  lineHeight: 1.2,
                  '&:hover': {
                    bgcolor: selected ? PD_SAGE_HOVER : PD_SAGE_TINT,
                  },
                }}
              >
                {optLabel}
              </Button>
            );
          })}
        </Box>
      </Popover>
    </>
  );
}

// ── Small local field-row helper for the display card ─────────────────────
// Renders nothing when value is empty, same behaviour as the shared DetailRow.
function PDFieldRow({ label, value, span = 1 }) {
  if (!value || (Array.isArray(value) && !value.length)) return null;
  return (
    <Box
      sx={{
        gridColumn: span === 2 ? { xs: 'auto', sm: 'span 2' } : 'auto',
        py: 1.5,
        borderBottom: `1px solid ${PD_ROW_DIVIDER}`,
      }}
    >
      <Typography
        sx={{
          fontFamily: PD_FONT,
          fontSize: '0.625rem',
          color: PD_TEXT_MUTED,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.4px',
          mb: 0.375,
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontFamily: PD_FONT,
          fontSize: '0.875rem',
          color: PD_CHARCOAL,
          fontWeight: 600,
          lineHeight: 1.55,
          wordBreak: 'break-word',
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

export function PersonalDetailsSection({ basic, loading, onRefresh, editor: externalEditor }) {
  const ownEditor = usePersonalDetailsEditor({ basic, onSaved: onRefresh });
  const editor = externalEditor || ownEditor;
  const { form, fieldErrors: err, setField } = editor;

  const address = (prefix) => [
    basic?.[`${prefix}_address_line`],
    basic?.[`${prefix}_city`],
    basic?.[`${prefix}_state`],
    basic?.[`${prefix}_pincode`],
  ].filter(Boolean).join(', ');

  const phoneValue = basic?.phone_number
    ? `${basic.country_code || ''} ${basic.phone_number}`.trim()
    : null;

  const genderValue = basic?.gender === 'Other' ? basic?.gender_other : basic?.gender;

  return (
    <>
      {/* ── Display card — 2-column labelled grid, no icons ──────────── */}
      <Card
        id="basic"
        elevation={0}
        sx={{
          border: `1px solid ${PD_BORDER}`,
          borderRadius: 3,
          bgcolor: '#FFFFFF',
          overflow: 'visible',
          scrollMarginTop: 88,
          mb: { xs: 3, sm: 4 },
        }}
      >
        {/* Header row */}
        <Box
          sx={{
            px: { xs: 2.5, sm: 3.5 },
            pt: { xs: 2.5, sm: 3 },
            pb: 2,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1.5,
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" gap={1} sx={{ alignItems: 'center' }}>
              <Typography
                component="h2"
                sx={{
                  fontFamily: PD_FONT,
                  fontSize: { xs: '1.0625rem', sm: '1.125rem' },
                  fontWeight: 700,
                  color: PD_CHARCOAL,
                  letterSpacing: '-0.2px',
                  lineHeight: 1.3,
                }}
              >
                Personal details
              </Typography>
              {editor.hasAnything && (
                <Tooltip title="Section complete">
                  <CheckCircleOutlined
                    sx={{ fontSize: 18, color: PD_SAGE }}
                    aria-label="Section complete"
                  />
                </Tooltip>
              )}
            </Stack>
            <Typography
              sx={{
                fontFamily: PD_FONT,
                fontSize: '0.8125rem',
                color: PD_TEXT_MUTED,
                mt: 0.75,
                lineHeight: 1.5,
              }}
            >
              Your name and contact details. Recruiters see these when you apply.
            </Typography>
          </Box>

          <Button
            onClick={editor.openEditor}
            size="small"
            startIcon={
              editor.hasAnything
                ? <EditOutlined sx={{ fontSize: 15 }} />
                : <AddOutlined sx={{ fontSize: 16 }} />
            }
            sx={{
              fontFamily: PD_FONT,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.75rem',
              color: PD_OFF_WHITE,
              bgcolor: PD_CHARCOAL,
              borderRadius: 2,
              px: 1.75,
              py: 0.75,
              whiteSpace: 'nowrap',
              flexShrink: 0,
              '&:hover': { bgcolor: PD_CHARCOAL_HOV },
            }}
          >
            {editor.hasAnything ? 'Edit' : 'Add details'}
          </Button>
        </Box>

        {/* Body */}
        <Box sx={{ px: { xs: 2.5, sm: 3.5 }, pb: { xs: 2.5, sm: 3 } }}>
          {!editor.hasAnything ? (
            <Box
              sx={{
                py: 3,
                px: 2,
                textAlign: 'center',
                border: `1px dashed ${PD_BORDER}`,
                borderRadius: 2,
              }}
            >
              <Typography
                sx={{
                  fontFamily: PD_FONT,
                  fontSize: '0.875rem',
                  color: PD_TEXT_MUTED,
                }}
              >
                No details yet. Start with your name and contact number.
              </Typography>
            </Box>
          ) : (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                columnGap: 4,
              }}
            >
              <PDFieldRow label="Name" value={editor.fullName} />
              <PDFieldRow label="Email" value={basic?.email} />
              <PDFieldRow label="Phone" value={phoneValue} />
              <PDFieldRow label="Date of birth" value={basic?.date_of_birth} />
              <PDFieldRow label="Gender" value={genderValue} />
              <PDFieldRow label="Marital status" value={basic?.marital_status} />
              <PDFieldRow label="Category" value={basic?.category} />
              <PDFieldRow label="Hometown" value={basic?.hometown} />
              <PDFieldRow label="Current address"   value={address('current')}   span={2} />
              <PDFieldRow label="Permanent address" value={address('permanent')} span={2} />
            </Box>
          )}
        </Box>
      </Card>

      {/* ── Edit dialog — same shared FormDialog, scoped sage theme ──── */}
      <FormDialog
        open={editor.open}
        onClose={editor.close}
        title="Personal details"
        subtitle="Your email is tied to your account and cannot be changed here."
        onSubmit={editor.save}
        submitLabel="Save"
        submitColor={PD_CHARCOAL}
        titleColor={PD_CHARCOAL}
        saving={editor.saving}
        formError={editor.formError}
        maxWidth="md"
      >
        <Box sx={{ ...PD_DIALOG_THEME_SX, ...PD_HIDE_SCROLLBAR_SX }}>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextInput
                label="First name"
                value={form.first_name}
                onChange={(v) => setField('first_name', v)}
                error={err.first_name}
                required
                maxLength={PERSONAL_FIELD_LIMITS.first_name}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextInput
                label="Middle name"
                value={form.middle_name}
                onChange={(v) => setField('middle_name', v)}
                error={err.middle_name}
                maxLength={PERSONAL_FIELD_LIMITS.middle_name}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextInput
                label="Last name"
                value={form.last_name}
                onChange={(v) => setField('last_name', v)}
                error={err.last_name}
                required
                maxLength={PERSONAL_FIELD_LIMITS.last_name}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextInput
                label="Email"
                value={form.email}
                onChange={() => {}}
                disabled
                helper="Tied to your account"
              />
            </Grid>

            <Grid size={{ xs: 4, sm: 2 }}>
              <PDNumberGridPicker
                label="Code"
                value={form.country_code}
                onChange={(v) => setField('country_code', v)}
                options={COUNTRY_CODES}
                cols={3}
              />
            </Grid>
            <Grid size={{ xs: 8, sm: 4 }}>
              <TextInput
                label="Phone"
                value={form.phone_number}
                onChange={(v) => setField('phone_number', v)}
                error={err.phone_number}
                maxLength={PERSONAL_FIELD_LIMITS.phone_number}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <TextInput
                label="Date of birth"
                value={form.date_of_birth}
                onChange={(v) => setField('date_of_birth', v)}
                error={err.date_of_birth}
                type="date"
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <PDNumberGridPicker
                label="Gender"
                value={form.gender}
                onChange={(v) => setField('gender', v)}
                options={GENDER_OPTIONS}
                error={err.gender}
                placeholder="Prefer not to say"
                cols={1}
              />
            </Grid>
            {form.gender === 'Other' && (
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextInput
                  label="How do you describe it?"
                  value={form.gender_other}
                  onChange={(v) => setField('gender_other', v)}
                  error={err.gender_other}
                  required
                  maxLength={PERSONAL_FIELD_LIMITS.gender_other}
                />
              </Grid>
            )}

            <Grid size={{ xs: 12, sm: 4 }}>
              <PDNumberGridPicker
                label="Marital status"
                value={form.marital_status}
                onChange={(v) => setField('marital_status', v)}
                options={MARITAL_STATUS_OPTIONS}
                error={err.marital_status}
                placeholder="Select"
                cols={1}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <PDNumberGridPicker
                label="Category"
                value={form.category}
                onChange={(v) => setField('category', v)}
                options={CATEGORY_OPTIONS}
                error={err.category}
                placeholder="Select"
                cols={1}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextInput
                label="Hometown"
                value={form.hometown}
                onChange={(v) => setField('hometown', v)}
                error={err.hometown}
                maxLength={PERSONAL_FIELD_LIMITS.hometown}
              />
            </Grid>

            {/* ── Current address ──────────────────────────────────────── */}
            <Grid size={{ xs: 12 }}>
              <Typography
                sx={{ fontFamily: PD_FONT, fontSize: '0.9375rem', fontWeight: 700, color: PD_CHARCOAL, mt: 1 }}
              >
                Current address
              </Typography>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextInput
                label="Address"
                value={form.current_address_line}
                onChange={(v) => setField('current_address_line', v)}
                error={err.current_address_line}
                maxLength={PERSONAL_FIELD_LIMITS.current_address_line}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextInput
                label="Pincode"
                value={form.current_pincode}
                onChange={(v) => setField('current_pincode', v)}
                error={err.current_pincode}
                maxLength={PERSONAL_FIELD_LIMITS.current_pincode}
                helper={editor.pincodeBusy === 'current' ? 'Looking up…' : 'Fills city and state'}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => editor.lookupPincode('current')}
                          disabled={editor.pincodeBusy === 'current'}
                          aria-label="Look up pincode"
                        >
                          <SearchOutlined sx={{ fontSize: 17, color: PD_SAGE }} />
                        </IconButton>
                      </InputAdornment>
                    ),
                  } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextInput
                label="City"
                value={form.current_city}
                onChange={(v) => setField('current_city', v)}
                error={err.current_city}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextInput
                label="District"
                value={form.current_district}
                onChange={(v) => setField('current_district', v)}
                error={err.current_district}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextInput
                label="State"
                value={form.current_state}
                onChange={(v) => setField('current_state', v)}
                error={err.current_state}
              />
            </Grid>

            {/* ── Permanent address ───────────────────────────────────────── */}
            <Grid size={{ xs: 12 }}>
              <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
                <Typography
                  sx={{ fontFamily: PD_FONT, fontSize: '0.9375rem', fontWeight: 700, color: PD_CHARCOAL }}
                >
                  Permanent address
                </Typography>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={editor.sameAsCurrent}
                      onChange={(e) => editor.copyCurrentToPermanent(e.target.checked)}
                      size="small"
                      sx={{
                        color: 'rgba(39,50,56,0.35)',
                        '&.Mui-checked': { color: PD_SAGE },
                      }}
                    />
                  }
                  label={
                    <Typography sx={{ fontFamily: PD_FONT, fontSize: '0.8125rem', color: PD_CHARCOAL }}>
                      Same as current
                    </Typography>
                  }
                />
              </Stack>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextInput
                label="Address"
                value={form.permanent_address_line}
                onChange={(v) => setField('permanent_address_line', v)}
                error={err.permanent_address_line}
                maxLength={PERSONAL_FIELD_LIMITS.permanent_address_line}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextInput
                label="Pincode"
                value={form.permanent_pincode}
                onChange={(v) => setField('permanent_pincode', v)}
                error={err.permanent_pincode}
                maxLength={PERSONAL_FIELD_LIMITS.permanent_pincode}
                helper={editor.pincodeBusy === 'permanent' ? 'Looking up…' : ' '}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => editor.lookupPincode('permanent')}
                          disabled={editor.pincodeBusy === 'permanent'}
                          aria-label="Look up pincode"
                        >
                          <SearchOutlined sx={{ fontSize: 17, color: PD_SAGE }} />
                        </IconButton>
                      </InputAdornment>
                    ),
                  } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextInput
                label="City"
                value={form.permanent_city}
                onChange={(v) => setField('permanent_city', v)}
                error={err.permanent_city}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextInput
                label="District"
                value={form.permanent_district}
                onChange={(v) => setField('permanent_district', v)}
                error={err.permanent_district}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextInput
                label="State"
                value={form.permanent_state}
                onChange={(v) => setField('permanent_state', v)}
                error={err.permanent_state}
              />
            </Grid>
          </Grid>
        </Box>
      </FormDialog>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   ONLINE PROFILES
   ══════════════════════════════════════════════════════════════════════════ */

// ── Platform brand config: original logos with original colors ─────────
const PLATFORM_BRANDS = {
  linkedin:      { color: '#0A66C2', icon: 'https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/linkedin.svg' },
  github:        { color: '#181717', icon: 'https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/github.svg' },
  portfolio:     { color: '#7F9E7E', icon: null },
  behance:       { color: '#1769FF', icon: 'https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/behance.svg' },
  dribbble:      { color: '#EA4C89', icon: 'https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/dribbble.svg' },
  stackoverflow: { color: '#F58025', icon: 'https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/stackoverflow.svg' },
  medium:        { color: '#000000', icon: 'https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/medium.svg' },
  kaggle:        { color: '#20BEFF', icon: 'https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/kaggle.svg' },
  leetcode:      { color: '#FFA116', icon: 'https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/leetcode.svg' },
  other:         { color: '#7F9E7E', icon: null },
};

function PlatformIcon({ platformKey, size = 20 }) {
  const brand = PLATFORM_BRANDS[platformKey];
  if (!brand || !brand.icon) {
    return <LaunchOutlined sx={{ fontSize: size, color: brand?.color || '#7F9E7E' }} />;
  }
  return (
    <Box
      sx={{
        width: size,
        height: size,
        bgcolor: brand.color,
        WebkitMaskImage: `url(${brand.icon})`,
        WebkitMaskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskImage: `url(${brand.icon})`,
        maskSize: 'contain',
        maskRepeat: 'no-repeat',
        maskPosition: 'center',
        flexShrink: 0,
      }}
    />
  );
}

const DP_OP = {
  sage:     PALETTE.sage     || '#7F9E7E',
  sageTint: PALETTE.sageTint || 'rgba(127,158,126,0.1)',
  charcoal: PALETTE.charcoal || '#273238',
};

export function OnlineProfilesSection({ candidateId, onlineProfiles = [], loading, onRefresh }) {
  const editor = useOnlineProfilesEditor({
    candidateId, profiles: onlineProfiles, onSaved: onRefresh,
  });
  const { form, fieldErrors: err, setField } = editor;

  // Presentation helpers (local — no data/contract changes)
  const prettyUrl = (u = '') =>
    String(u).replace(/^https?:\/\//i, '').replace(/\/+$/, '');
  const tintOf = (hex) =>
    /^#([0-9a-f]{6})$/i.test(hex || '') ? `${hex}14` : DP_OP.sageTint;
  const labelFor = (key) =>
    ONLINE_PLATFORMS.find((p) => p.key === key)?.label || key;

  return (
    <>
      <SectionCard
        id="onlineProfiles"
        title="Online profiles"
        description="Where your work already lives — a repository or portfolio does more than a description."
        complete={onlineProfiles.length > 0}
        loading={loading}
        onAdd={editor.atLimit ? undefined : editor.openCreate}
        addLabel="Add link"
        addFilled
        titleColor={DP_OP.charcoal}
        accentColor={DP_OP.sage}
      >
        {editor.sorted.length === 0 ? (
          <EmptyState
            message="No links yet. Add your GitHub, LinkedIn or portfolio."
            accentColor={DP_OP.sage}
          />
        ) : (
          <Box>
            {editor.sorted.map((entry, index) => {
              const brand = PLATFORM_BRANDS[entry.platform_key] || {};
              const title = entry.label || labelFor(entry.platform_key);
              const isLast = index === editor.sorted.length - 1;

              return (
                <Stack
                  key={entry.profile_id}
                  direction="row"
                  sx={{
                    alignItems: 'center',
                    gap: 1.5,
                    py: 1.25,
                    borderBottom: isLast ? 'none' : `1px solid ${PALETTE.border}`,
                  }}
                >
                  {/* Brand-tinted icon circle */}
                  <Box
                    sx={{
                      width: 38,
                      height: 38,
                      borderRadius: '50%',
                      bgcolor: tintOf(brand.color),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <PlatformIcon platformKey={entry.platform_key} size={18} />
                  </Box>

                  {/* Platform name + cleaned domain */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontFamily: FONTS.body,
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        color: DP_OP.charcoal,
                        lineHeight: 1.3,
                      }}
                    >
                      {title}
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: FONTS.body,
                        fontSize: '0.8125rem',
                        color: PALETTE.muted,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {prettyUrl(entry.url)}
                    </Typography>
                  </Box>

                  {/* Ghost "Visit" (hidden on very small screens to avoid crowding) */}
                  <Link
                    href={entry.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    sx={{
                      display: { xs: 'none', sm: 'inline-flex' },
                      alignItems: 'center',
                      gap: 0.5,
                      fontFamily: FONTS.body,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: DP_OP.sage,
                      textDecoration: 'none',
                      border: `1px solid ${PALETTE.border}`,
                      borderRadius: 1.5,
                      px: 1.25,
                      py: 0.5,
                      flexShrink: 0,
                      whiteSpace: 'nowrap',
                      '&:hover': { borderColor: DP_OP.sage, bgcolor: DP_OP.sageTint },
                    }}
                  >
                    <LaunchOutlined sx={{ fontSize: 14 }} /> Visit
                  </Link>

                  {/* Edit / delete */}
                  <Stack direction="row" sx={{ gap: 0.25, flexShrink: 0 }}>
                    <IconButton
                      size="small"
                      onClick={() => editor.openEdit(entry)}
                      aria-label={`Edit ${title}`}
                    >
                      <EditOutlined sx={{ fontSize: 18, color: PALETTE.muted }} />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => editor.setPendingDelete(entry)}
                      aria-label={`Delete ${title}`}
                    >
                      <DeleteOutlineOutlined sx={{ fontSize: 18, color: PALETTE.muted }} />
                    </IconButton>
                  </Stack>
                </Stack>
              );
            })}

            <Typography
             sx={{ fontFamily: FONTS.body, fontSize: '0.75rem', color: PALETTE.muted, mt: 2 }}
            >
              {onlineProfiles.length} of {MAX_ONLINE_PROFILES}
            </Typography>
          </Box>
        )}
      </SectionCard>

      <FormDialog
        open={editor.open}
        onClose={editor.close}
        title={editor.isEditing ? 'Edit link' : 'Add link'}
        onSubmit={editor.save}
        submitLabel={editor.isEditing ? 'Save changes' : 'Add link'}
        saving={editor.saving}
        formError={editor.formError}
        submitColor={DP_OP.sage}
        titleColor={DP_OP.charcoal}
        hideScrollbar
      >
        <Grid container spacing={3} sx={{ pt: 1 }}>
          <Grid size={{ xs: 12, sm: 5 }}>
            <SelectInput
              label="Platform"
              value={form.platform_key}
              onChange={(v) => setField('platform_key', v)}
              options={editor.availablePlatforms}
              getLabel={(o) => o.label}
              getValue={(o) => o.key}
              error={err.platform_key}
              required
              placeholder="Choose one"
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 7 }}>
            <TextInput
              label="Label"
              value={form.label}
              onChange={(v) => setField('label', v)}
              error={err.label}
              required={form.platform_key === 'other'}
              maxLength={100}
              placeholder={editor.selectedPlatform?.label || 'My portfolio'}
              helper={form.platform_key === 'other'
                ? 'Required — say what this link is'
                : 'Optional'}
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TextInput
              label="Link"
              value={form.url}
              onChange={(v) => setField('url', v)}
              error={err.url}
              required
              placeholder={editor.selectedPlatform?.hint || 'https://…'}
              helper="Include https://"
            />
          </Grid>
        </Grid>
      </FormDialog>

      <ConfirmDialog
        open={Boolean(editor.pendingDelete)}
        onClose={() => editor.setPendingDelete(null)}
        onConfirm={editor.confirmDelete}
        busy={editor.deleting}
        title={`Remove ${editor.pendingDelete?.label || 'this link'}?`}
        message="This removes it from your profile. You can add it again at any time."
        confirmLabel="Remove"
      />
    </>
  );
}

export function QuickInterviewSection({ quickInterview: quickInterviewProp, loading }) {
  // BUILD: 2026-08-05-quick-report — surface the full quick-interview report
  //   (overall + breakdown scores, AI summary, strengths, improvements, PDF
  //   download) on the Profile card. Also fixes two prior issues:
  //     1) Score chip was blank because the old code read `overall_score` off
  //        the row root — the /result endpoint returns `scores.overall`.
  //     2) Section stayed on "in progress" until a manual reload; parent hook
  //        loads once and FastAPI's callback lands 30-90s after WS close.
  //        A local poll flips the card to Completed automatically.
  // BUILD: 2026-08-05-quick-interview-option1 — refreshed inner layout only.
  //   Adds a leading icon square (accent-tinted), inline status + score/time
  //   chip on one line, contextual helper text below, and a right-side
  //   button cluster. No changes to data flow, polling, dialog wiring, or
  //   button handlers — purely presentational.
  const navigate = useNavigate();

  // Own the row locally so polling can update without disturbing the parent
  // useJobseekerProfile hook.
  const [quickInterview, setQuickInterview] = useState(quickInterviewProp);
  const [reportOpen, setReportOpen] = useState(false);
  const pollRef = useRef(null);
  const pollCountRef = useRef(0);

  // Follow the parent on refresh, but never revert a completed row we already
  // fetched via polling (parent's loadAll may still return the stale copy).
  useEffect(() => {
    if (!quickInterviewProp) return;
    setQuickInterview((prev) => {
      if (prev?.status === 'completed' && quickInterviewProp?.status !== 'completed') {
        return prev;
      }
      return quickInterviewProp;
    });
  }, [quickInterviewProp]);

  const status     = quickInterview?.status || null;
  const isComplete = status === 'completed';
  const inProgress = status === 'started' || status === 'in_progress';
  const scores      = quickInterview?.scores || {};
  const overall     = scores.overall ?? null;
  const candidateId = quickInterview?.candidate_id ?? null;


  useEffect(() => {
    clearInterval(pollRef.current);
    pollCountRef.current = 0;
    if (!inProgress || !candidateId) return undefined;

    const tick = async () => {
      pollCountRef.current += 1;
      if (pollCountRef.current > 30) {   // ~2.5 min, then give up quietly
        clearInterval(pollRef.current);
        return;
      }
      try {
        const history = await quickInterviewService.getHistory(candidateId);
        const latest  = Array.isArray(history) ? history[0] : null;
        if (latest) setQuickInterview(latest);
      } catch { /* transient — keep polling */ }
    };
    pollRef.current = setInterval(tick, 5000);
    return () => clearInterval(pollRef.current);
  }, [inProgress, candidateId]);

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

  // Enable the report button as soon as the row is completed — even if PDF
  // upload failed, the on-screen breakdown still has value.
  const canViewReport = isComplete && (
    overall != null || summary || strengths.length || improvements.length || pdfUrl
  );

  return (
    <SectionCard
      id="quickInterview"
      title="Quick interview"
      description="A ten-minute AI practice interview. Recruiters see the score on your profile."
      complete={isComplete}
      loading={loading}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        gap={2}
        sx={{ alignItems: { xs: 'stretch', sm: 'center' } }}
      >
        {/* Leading icon square — presentational anchor, hidden on xs */}
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 1.25,
            bgcolor: `${PALETTE.success}1A`,
            display: { xs: 'none', sm: 'flex' },
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {isComplete ? (
            <CheckCircleOutlined sx={{ fontSize: 24, color: PALETTE.success }} />
          ) : (
            <AutoAwesomeOutlined sx={{ fontSize: 22, color: PALETTE.success }} />
          )}
        </Box>

        {/* Middle: status + chip on one row, helper text below */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" gap={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography
              sx={{
                fontFamily: FONTS.body,
                fontSize: '0.9375rem',
                fontWeight: 600,
                color: PALETTE.navy,
              }}
            >
              {isComplete
                ? 'Completed'
                : inProgress
                ? 'Scoring your interview…'
                : 'Not taken yet'}
            </Typography>

            {isComplete && overall != null && (
              <Chip
                label={`Score ${fmtScore(overall)}/10`}
                size="small"
                sx={{
                  height: 22,
                  fontSize: '0.75rem',
                  fontFamily: FONTS.body,
                  fontWeight: 600,
                  bgcolor: `${PALETTE.success}14`,
                  color: PALETTE.success,
                  border: `1px solid ${PALETTE.success}33`,
                }}
              />
            )}

            {!isComplete && !inProgress && (
              <Chip
                label="10 min"
                size="small"
                sx={{
                  height: 22,
                  fontSize: '0.75rem',
                  fontFamily: FONTS.body,
                  fontWeight: 600,
                  bgcolor: `${PALETTE.success}14`,
                  color: PALETTE.success,
                  border: `1px solid ${PALETTE.success}33`,
                }}
              />
            )}

            {inProgress && <CircularProgress size={14} sx={{ color: PALETTE.accent }} />}
          </Stack>

          <Typography
            sx={{
              fontFamily: FONTS.body,
              fontSize: '0.8125rem',
              color: PALETTE.muted,
              mt: 0.5,
            }}
          >
            {isComplete
              ? 'Retake at any time — the most recent result is the one shown.'
              : inProgress
              ? 'This usually takes under a minute. The report will appear here automatically.'
              : 'Questions are drawn from your resume. Free, resume-based, with instant scoring.'}
          </Typography>
        </Box>

        {/* Right: button cluster */}
        <Stack direction="row" gap={1} sx={{ flexShrink: 0, flexWrap: 'wrap' }}>
          {canViewReport && (
            <Button
              onClick={() => setReportOpen(true)}
              variant="outlined"
              disableElevation
              startIcon={<DescriptionOutlined sx={{ fontSize: 18 }} />}
              sx={{
                ...actionSx,
                px: 2.5,
                whiteSpace: 'nowrap',
                borderColor: PALETTE.border,
                color: PALETTE.navy,
                '&:hover': { borderColor: PALETTE.accent, color: PALETTE.accent },
              }}
            >
              View report
            </Button>
          )}

       
          <Button
            onClick={() => navigate(`${QUICK_INTERVIEW_ROUTE}?quick=1`)}
            variant="contained"
            disableElevation
            startIcon={<PlayArrowOutlined sx={{ fontSize: 18 }} />}
            sx={{
              ...actionSx,
              px: 2.5,
              whiteSpace: 'nowrap',
              bgcolor: PALETTE.success,
              color: '#fff',
              '&:hover': { bgcolor: PALETTE.success, opacity: 0.9 },
            }}
          >
            {isComplete ? 'Retake' : inProgress ? 'Continue' : 'Start interview'}
          </Button>
        </Stack>
      </Stack>

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
    </SectionCard>
  );
}

export function QuickInterviewReportDialog({
  open, onClose,
  overall, scores, summary, strengths, improvements,
  pdfUrl, durationMin, answered, totalQ, completedAt,
}) {
    const fmt = (v) => (v == null ? '—' : Number(v).toFixed(1));
  const breakdown = [
    { label: 'Technical',        v: scores?.technical },
    { label: 'Communication',    v: scores?.communication },
    { label: 'Problem solving',  v: scores?.problem_solving },
    { label: 'Confidence',       v: scores?.confidence },
    { label: 'Clarity',          v: scores?.clarity },
    { label: 'Relevance',        v: scores?.relevance },
  ].filter((r) => r.v != null);

  const scoreTone = (v) => {
    if (v == null) return PALETTE.muted;
    if (v >= 8) return PALETTE.success;
    if (v >= 6) return PALETTE.accent;
    if (v >= 4) return '#B08900';
    return '#C1292E';
  };

  const completedDate = (() => {
    if (!completedAt) return '';
    try { return new Date(completedAt).toLocaleString(); } catch { return ''; }
  })();

  const renderBullet = (s) => {
    if (typeof s === 'string') return s;
    if (s && typeof s === 'object') return s.text || s.message || JSON.stringify(s);
    return String(s);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: 2, fontFamily: FONTS.body } } }}
    >
      <DialogTitle
       sx={{
          fontFamily: FONTS.display, fontSize: '1.1875rem',
          color: PALETTE.navy, pr: 6 }}
      >
        Quick interview report
        {completedDate && (
          <Typography sx={{ fontFamily: FONTS.body, fontSize: '0.8125rem', color: PALETTE.muted, mt: 0.5 }}>
            Completed {completedDate}
          </Typography>
        )}
        <IconButton
          onClick={onClose}
          aria-label="Close"
         sx={{ position: 'absolute', right: 12, top: 12 }}
        >
          <CloseOutlined sx={{ fontSize: 20, color: PALETTE.muted }} />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ borderColor: PALETTE.border }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          gap={2}
          sx={{ alignItems: { sm: 'center' }, mb: 2.5 }}
        >
          <Box
           sx={{
              width: 96, height: 96, borderRadius: '50%',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              bgcolor: `${scoreTone(overall)}14`,
              border: `2px solid ${scoreTone(overall)}55`,
              flexShrink: 0 }}
          >
            <Typography sx={{ fontFamily: FONTS.display, fontSize: '1.75rem', fontWeight: 700, color: scoreTone(overall), lineHeight: 1 }}>
              {fmt(overall)}
            </Typography>
            <Typography sx={{ fontFamily: FONTS.body, fontSize: '0.6875rem', color: PALETTE.muted, mt: 0.25 }}>
              / 10
            </Typography>
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontFamily: FONTS.body, fontSize: '0.75rem', color: PALETTE.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Overall score
            </Typography>
            <Stack direction="row" gap={1} sx={{ mt: 0.75, flexWrap: 'wrap' }}>
              {durationMin != null && (
                <Chip
                  size="small"
                  label={`${durationMin} min`}
                 sx={{ height: 22, fontFamily: FONTS.body, fontSize: '0.75rem', bgcolor: `${PALETTE.navy}10`, color: PALETTE.navy }}
                />
              )}
              {answered != null && totalQ != null && (
                <Chip
                  size="small"
                  label={`${answered} / ${totalQ} answered`}
                 sx={{ height: 22, fontFamily: FONTS.body, fontSize: '0.75rem', bgcolor: `${PALETTE.navy}10`, color: PALETTE.navy }}
                />
              )}
            </Stack>
          </Box>
        </Stack>

        {breakdown.length > 0 && (
          <>
            <Typography sx={{ fontFamily: FONTS.display, fontSize: '0.9375rem', fontWeight: 700, color: PALETTE.navy, mb: 1 }}>
              Score breakdown
            </Typography>
            <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
              {breakdown.map((row) => (
                <Grid size={{ xs: 12, sm: 6 }} key={row.label}>
                  <Box sx={{ border: `1px solid ${PALETTE.border}`, borderRadius: 1.5, px: 1.5, py: 1 }}>
                    <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography sx={{ fontFamily: FONTS.body, fontSize: '0.8125rem', color: PALETTE.navy, fontWeight: 600 }}>
                        {row.label}
                      </Typography>
                      <Typography sx={{ fontFamily: FONTS.body, fontSize: '0.8125rem', fontWeight: 700, color: scoreTone(row.v) }}>
                        {fmt(row.v)}
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(100, Math.max(0, (Number(row.v) || 0) * 10))}
                     sx={{
                        height: 6, borderRadius: 3,
                        bgcolor: `${PALETTE.muted}22`,
                        '& .MuiLinearProgress-bar': { bgcolor: scoreTone(row.v) } }}
                    />
                  </Box>
                </Grid>
              ))}
            </Grid>
          </>
        )}

        {summary && (
          <>
            <Typography sx={{ fontFamily: FONTS.display, fontSize: '0.9375rem', fontWeight: 700, color: PALETTE.navy, mb: 1 }}>
              Summary
            </Typography>
            <Typography sx={{ fontFamily: FONTS.body, fontSize: '0.875rem', color: PALETTE.navy, whiteSpace: 'pre-wrap', mb: 2.5 }}>
              {summary}
            </Typography>
          </>
        )}

        <Grid container spacing={2}>
          {strengths.length > 0 && (
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography sx={{ fontFamily: FONTS.display, fontSize: '0.9375rem', fontWeight: 700, color: PALETTE.success, mb: 1 }}>
                Strengths
              </Typography>
              <Stack component="ul" sx={{ pl: 2.25, m: 0, gap: 0.5 }}>
                {strengths.map((s, i) => (
                  <Typography
                    key={i}
                    component="li"
                   sx={{ fontFamily: FONTS.body, fontSize: '0.8125rem', color: PALETTE.navy }}
                  >
                    {renderBullet(s)}
                  </Typography>
                ))}
              </Stack>
            </Grid>
          )}
          {improvements.length > 0 && (
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography sx={{ fontFamily: FONTS.display, fontSize: '0.9375rem', fontWeight: 700, color: '#B08900', mb: 1 }}>
                Areas to improve
              </Typography>
              <Stack component="ul" sx={{ pl: 2.25, m: 0, gap: 0.5 }}>
                {improvements.map((s, i) => (
                  <Typography
                    key={i}
                    component="li"
                   sx={{ fontFamily: FONTS.body, fontSize: '0.8125rem', color: PALETTE.navy }}
                  >
                    {renderBullet(s)}
                  </Typography>
                ))}
              </Stack>
            </Grid>
          )}
        </Grid>

        {(!summary && !strengths.length && !improvements.length && !breakdown.length) && (
          <Alert severity="info" sx={{ fontFamily: FONTS.body, fontSize: '0.8125rem' }}>
            Detailed feedback is still being generated. If a PDF is available,
            you can download it below.
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button
          onClick={onClose}
         sx={{ fontFamily: FONTS.body, textTransform: 'none', fontWeight: 600, color: PALETTE.muted }}
        >
          Close
        </Button>
        {pdfUrl && (
          <Button
            component="a"
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            variant="contained"
            disableElevation
            startIcon={<DownloadOutlined sx={{ fontSize: 18 }} />}
           sx={{
              fontFamily: FONTS.body, textTransform: 'none', fontWeight: 600,
              bgcolor: PALETTE.navy, px: 3,
              '&:hover': { bgcolor: PALETTE.accent } }}
          >
            Download PDF
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default PersonalDetailsSection;