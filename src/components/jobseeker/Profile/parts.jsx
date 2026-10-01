

import React from 'react';
import {
  Box, Card, Typography, IconButton, Button, Chip, Stack, TextField,
  MenuItem, Autocomplete, Dialog, DialogTitle, DialogContent, DialogActions,
  Skeleton, Tooltip, LinearProgress, CircularProgress, Divider, FormControlLabel, Switch,
  Alert, useMediaQuery, useTheme,
} from '@mui/material';
import AddOutlined from '@mui/icons-material/AddOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined';
import CloseOutlined from '@mui/icons-material/CloseOutlined';
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';

import { PALETTE, FONTS } from '@/constants/profileConstants';

/* ══════════════════════════════════════════════════════════════════════════
   SECTION CARD
   ══════════════════════════════════════════════════════════════════════════ */

export function SectionCard({
  id,
  title,
  description,
  complete = false,
  onAdd,
  addLabel = 'Add',
  addFilled = false,
  actions,
  children,
  loading = false,
  titleColor,
  accentColor,
}) {
  const _title  = titleColor  || PALETTE.navy;
  const _accent = accentColor || PALETTE.accent;
  return (
    <Card
      id={id}
      elevation={0}
     sx={{
        border: `1px solid ${PALETTE.border}`,
        borderRadius: 2,
        bgcolor: PALETTE.surface,
        overflow: 'visible',
        scrollMarginTop: 88 }}
    >
      <Box
       sx={{
          px: { xs: 2, sm: 3 },
          pt: { xs: 2, sm: 2.5 },
          pb: 1.5,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 1.5 }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" gap={1} sx={{ alignItems: 'center' }}>
            <Typography
              component="h2"
             sx={{
                fontFamily: FONTS.display,
                fontSize: { xs: '1.0625rem', sm: '1.1875rem' },
                color: _title,
                lineHeight: 1.3 }}
            >
              {title}
            </Typography>
            {complete && (
              <Tooltip title="Section complete">
                <CheckCircleOutlined
                 sx={{ fontSize: 18, color: PALETTE.success }}
                  aria-label="Section complete"
                />
              </Tooltip>
            )}
          </Stack>
          {description && (
            <Typography
             sx={{
                fontFamily: FONTS.body,
                fontSize: '0.8125rem',
                color: PALETTE.muted,
                mt: 0.5 }}
            >
              {description}
            </Typography>
          )}
        </Box>

        <Stack direction="row" gap={0.5} sx={{ flexShrink: 0 }}>
          {actions}
          {onAdd && (
            <Button
              onClick={onAdd}
              startIcon={<AddOutlined sx={{ fontSize: 18 }} />}
              size="small"
             sx={{
                fontFamily: FONTS.body,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.8125rem',
                whiteSpace: 'nowrap',
                ...(addFilled
                  ? {
                      bgcolor: PALETTE.charcoal || '#273238',
                      color: '#FFFFFF',
                      px: 1.5,
                      borderRadius: 2,
                      '&:hover': { bgcolor: '#1E2A30' },
                    }
                  : {
                      color: _accent,
                      '&:hover': { bgcolor: `${_accent}0F` },
                    }),
              }}
            >
              {addLabel}
            </Button>
          )}
        </Stack>
      </Box>

      <Divider sx={{ borderColor: PALETTE.border }} />

      <Box sx={{ px: { xs: 2, sm: 3 }, py: { xs: 2, sm: 2.5 } }}>
        {loading ? <SectionSkeleton /> : children}
      </Box>
    </Card>
  );
}

export function SectionSkeleton({ rows = 2 }) {
  return (
    <Stack gap={1.5}>
      {Array.from({ length: rows }).map((_, i) => (
        <Box key={i}>
          <Skeleton variant="text" width="45%" height={22} />
          <Skeleton variant="text" width="70%" height={18} />
        </Box>
      ))}
    </Stack>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   EMPTY STATE — an invitation to act, not a shrug
   ══════════════════════════════════════════════════════════════════════════ */

export function EmptyState({ message, actionLabel, onAction, accentColor }) {
  const _accent = accentColor || PALETTE.accent;
  return (
    <Box sx={{ textAlign: 'center', py: 3 }}>
      <Typography
       sx={{
          fontFamily: FONTS.body,
          fontSize: '0.875rem',
          color: PALETTE.muted,
          mb: actionLabel ? 1.5 : 0 }}
      >
        {message}
      </Typography>
      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          variant="outlined"
          size="small"
          startIcon={<AddOutlined sx={{ fontSize: 18 }} />}
         sx={{
            fontFamily: FONTS.body,
            textTransform: 'none',
            fontWeight: 600,
            borderColor: PALETTE.border,
            color: _accent,
            '&:hover': { borderColor: _accent, bgcolor: `${_accent}0A` } }}
        >
          {actionLabel}
        </Button>
      )}
    </Box>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   ENTRY ROW — one saved item inside a section
   ══════════════════════════════════════════════════════════════════════════ */

export function EntryRow({
  primary,
  secondary,
  tertiary,
  chips = [],
  onEdit,
  onDelete,
  busy = false,
  last = false,
}) {
  return (
    <Box
     sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1,
        py: 1.75,
        borderBottom: last ? 'none' : `1px solid ${PALETTE.border}`,
        '&:first-of-type': { pt: 0 },
        opacity: busy ? 0.55 : 1,
        transition: 'opacity 120ms ease' }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {/* component="div": primary/secondary/tertiary accept JSX, and callers
            pass a <Stack> for chips and links. Typography renders <p> by
            default, and a <div> inside <p> is invalid DOM — React warns and
            the browser silently reparents the nodes. */}
        <Typography
          component="div"
         sx={{
            fontFamily: FONTS.body,
            fontWeight: 600,
            fontSize: '0.9375rem',
            color: PALETTE.navy,
            lineHeight: 1.4 }}
        >
          {primary}
        </Typography>

        {secondary && (
          <Typography
            component="div"
           sx={{
              fontFamily: FONTS.body,
              fontSize: '0.8438rem',
              color: '#4B5563',
              mt: 0.25 }}
          >
            {secondary}
          </Typography>
        )}

        {tertiary && (
          <Typography
            component="div"
           sx={{
              fontFamily: FONTS.body,
              fontSize: '0.8125rem',
              color: PALETTE.muted,
              mt: 0.25 }}
          >
            {tertiary}
          </Typography>
        )}

        {chips.length > 0 && (
          <Stack direction="row" gap={1.5} sx={{ flexWrap: 'wrap', mt: 1 }}>
            {chips.map((chip, i) => (
              <Chip
                key={`${chip}-${i}`}
                label={chip}
                size="small"
               sx={{
                  fontFamily: FONTS.body,
                  fontSize: '0.75rem',
                  height: 24,
                  bgcolor: PALETTE.offWhite,
                  border: `1px solid ${PALETTE.border}`,
                  color: '#4B5563' }}
              />
            ))}
          </Stack>
        )}
      </Box>

      <Stack direction="row" gap={0.25} sx={{ flexShrink: 0 }}>
        {onEdit && (
          <Tooltip title="Edit">
            <span>
              <IconButton size="small" onClick={onEdit} disabled={busy} aria-label="Edit entry">
                <EditOutlined sx={{ fontSize: 18, color: PALETTE.muted }} />
              </IconButton>
            </span>
          </Tooltip>
        )}
        {onDelete && (
          <Tooltip title="Delete">
            <span>
              <IconButton size="small" onClick={onDelete} disabled={busy} aria-label="Delete entry">
                <DeleteOutlineOutlined sx={{ fontSize: 18, color: PALETTE.muted }} />
              </IconButton>
            </span>
          </Tooltip>
        )}
      </Stack>
    </Box>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   FORM FIELDS
   ══════════════════════════════════════════════════════════════════════════ */

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    fontFamily: FONTS.body,
    fontSize: '0.875rem',
    bgcolor: PALETTE.surface,
    '& fieldset': { borderColor: PALETTE.border },
    '&:hover fieldset': { borderColor: PALETTE.muted },
    '&.Mui-focused fieldset': { borderColor: PALETTE.accent, borderWidth: 1.5 },
  },
  '& .MuiInputLabel-root': {
    fontFamily: FONTS.body,
    fontSize: '0.875rem',
    '&.Mui-focused': { color: PALETTE.accent },
  },
  '& .MuiFormHelperText-root': {
    fontFamily: FONTS.body,
    fontSize: '0.75rem',
    marginLeft: 0,
  },
};

export function TextInput({
  label, value, onChange, error, required, helper,
  maxLength, multiline, rows, placeholder, type = 'text',
  disabled, startAdornment, ...rest
}) {
  const length = typeof value === 'string' ? value.length : 0;
  const showCount = Boolean(maxLength) && (multiline || length > maxLength * 0.7);

  const helperText =
    error ||
    (showCount ? `${length} / ${maxLength}` : helper) ||
    ' ';

  return (
    <TextField
      fullWidth
      size="small"
      label={label}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      error={Boolean(error)}
      required={required}
      multiline={multiline}
      minRows={multiline ? rows || 3 : undefined}
      placeholder={placeholder}
      type={type}
      disabled={disabled}
      helperText={helperText}
      slotProps={{
        input: startAdornment ? { startAdornment } : undefined,
        htmlInput: maxLength ? { maxLength } : undefined }}
      sx={fieldSx}
      {...rest}
    />
  );
}

export function SelectInput({
  label, value, onChange, options, error, required,
  helper, disabled, getLabel, getValue, placeholder,
}) {
  const toLabel = getLabel || ((o) => (typeof o === 'object' ? o.label : o));
  const toValue = getValue || ((o) => (typeof o === 'object' ? o.value : o));

  return (
    <TextField
      select
      fullWidth
      size="small"
      label={label}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      error={Boolean(error)}
      required={required}
      disabled={disabled}
      helperText={error || helper || ' '}
      sx={fieldSx}
    >
      {placeholder && (
        <MenuItem value="" sx={{ fontFamily: FONTS.body, color: PALETTE.muted }}>
          {placeholder}
        </MenuItem>
      )}
      {options.map((option) => (
        <MenuItem
          key={toValue(option)}
          value={toValue(option)}
         sx={{ fontFamily: FONTS.body, fontSize: '0.875rem' }}
        >
          {toLabel(option)}
        </MenuItem>
      ))}
    </TextField>
  );
}

/** Free-text with suggestions — for boards, institutes, skills. */
export function ComboInput({
  label, value, onChange, options, error, required, helper, disabled, placeholder, paperSx,
}) {
  return (
    <Autocomplete
      freeSolo
      size="small"
      options={options}
      value={value ?? ''}
      onInputChange={(_, next) => onChange(next)}
      disabled={disabled}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          required={required}
          error={Boolean(error)}
          helperText={error || helper || ' '}
          placeholder={placeholder}
          sx={fieldSx}
        />
      )}
      slotProps={{
        paper: {
          sx: {
            fontFamily: FONTS.body,
            fontSize: '0.875rem',
            border: `1px solid ${PALETTE.border}`,
            ...paperSx,
          },
        } }}
    />
  );
}

export function SwitchInput({ label, checked, onChange, helper, disabled }) {
  return (
    <Box>
      <FormControlLabel
        control={
          <Switch
            checked={Boolean(checked)}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
            size="small"
           sx={{
              '& .Mui-checked': { color: PALETTE.accent },
              '& .Mui-checked + .MuiSwitch-track': { bgcolor: PALETTE.accent } }}
          />
        }
        label={
          <Typography sx={{ fontFamily: FONTS.body, fontSize: '0.875rem', color: PALETTE.navy }}>
            {label}
          </Typography>
        }
      />
      {helper && (
        <Typography
         sx={{ fontFamily: FONTS.body, fontSize: '0.75rem', color: PALETTE.muted, ml: 6, mt: -0.5 }}
        >
          {helper}
        </Typography>
      )}
    </Box>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   FORM DIALOG
   ══════════════════════════════════════════════════════════════════════════ */

export function FormDialog({
  open, onClose, title, subtitle, onSubmit, submitLabel = 'Save',
  saving = false, formError, children, maxWidth = 'sm',
  submitColor, titleColor, hideScrollbar = false, useSpinner = false,
}) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const _submitBg    = submitColor || PALETTE.navy;
  const _submitHover = submitColor ? `${submitColor}CC` : PALETTE.accent;
  const _titleColor  = titleColor  || PALETTE.navy;

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      maxWidth={maxWidth}
      fullWidth
      fullScreen={fullScreen}
      slotProps={{
        paper: {
          sx: {
            borderRadius: fullScreen ? 0 : 2,
            fontFamily: FONTS.body,
          },
        } }}
    >
      {saving && !useSpinner && (
        <LinearProgress
         sx={{
            position: 'absolute', top: 0, left: 0, right: 0,
            '& .MuiLinearProgress-bar': { bgcolor: PALETTE.accent } }}
        />
      )}
      {saving && useSpinner && (
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1.5 }}>
          <CircularProgress size={24} sx={{ color: _submitBg }} />
        </Box>
      )}

      <DialogTitle
       sx={{
          fontFamily: FONTS.display,
          fontSize: '1.1875rem',
          color: _titleColor,
          pr: 6,
          pb: subtitle ? 0.5 : 2 }}
      >
        {title}
        {subtitle && (
          <Typography
           sx={{ fontFamily: FONTS.body, fontSize: '0.8125rem', color: PALETTE.muted, mt: 0.5 }}
          >
            {subtitle}
          </Typography>
        )}
        <IconButton
          onClick={onClose}
          disabled={saving}
          aria-label="Close"
         sx={{ position: 'absolute', right: 12, top: 12 }}
        >
          <CloseOutlined sx={{ fontSize: 20, color: PALETTE.muted }} />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{
        borderColor: PALETTE.border,
        ...(hideScrollbar && {
          '&::-webkit-scrollbar': { display: 'none' },
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }),
      }}>
        {formError && (
          <Alert
            severity="error"
           sx={{ mb: 2, fontFamily: FONTS.body, fontSize: '0.8125rem' }}
          >
            {formError}
          </Alert>
        )}
        {children}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button
          onClick={onClose}
          disabled={saving}
         sx={{
            fontFamily: FONTS.body, textTransform: 'none',
            fontWeight: 600, color: PALETTE.muted }}
        >
          Cancel
        </Button>
        <Button
          onClick={onSubmit}
          disabled={saving}
          variant="contained"
          disableElevation
         sx={{
            fontFamily: FONTS.body, textTransform: 'none', fontWeight: 600,
            bgcolor: _submitBg, px: 3,
            '&:hover': { bgcolor: _submitHover } }}
        >
          {saving ? 'Saving…' : submitLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   CONFIRM DIALOG
   ══════════════════════════════════════════════════════════════════════════ */

export function ConfirmDialog({
  open, onClose, onConfirm, title, message,
  confirmLabel = 'Delete', busy = false, destructive = true,
}) {
  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: 2 } } }}
    >
      <DialogTitle sx={{ fontFamily: FONTS.display, fontSize: '1.0625rem', color: PALETTE.navy }}>
        {title}
      </DialogTitle>
      <DialogContent>
        <Typography sx={{ fontFamily: FONTS.body, fontSize: '0.875rem', color: '#4B5563' }}>
          {message}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button
          onClick={onClose}
          disabled={busy}
         sx={{ fontFamily: FONTS.body, textTransform: 'none', fontWeight: 600, color: PALETTE.muted }}
        >
          Keep
        </Button>
        <Button
          onClick={onConfirm}
          disabled={busy}
          variant="contained"
          disableElevation
         sx={{
            fontFamily: FONTS.body, textTransform: 'none', fontWeight: 600,
            bgcolor: destructive ? PALETTE.danger : PALETTE.navy,
            '&:hover': { bgcolor: destructive ? '#A31F1F' : PALETTE.accent } }}
        >
          {busy ? 'Working…' : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export { PALETTE, FONTS };