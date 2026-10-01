import React, { useState } from 'react';
import {
  Grid, Box, Card, Stack, Typography, Alert, Button, IconButton, Tooltip,
  TextField, Popover, InputAdornment,
} from '@mui/material';
import EditOutlined from '@mui/icons-material/EditOutlined';
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined';
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import AddOutlined from '@mui/icons-material/AddOutlined';
import ArrowDropDown from '@mui/icons-material/ArrowDropDown';

import {
  FormDialog, ConfirmDialog,
  TextInput, SelectInput, ComboInput,
} from '../parts';

import useEducationEditor from '@/hooks/jobseeker/useEducationEditor';

import {
  SCHOOL_LEVELS,
  UNIVERSITY_LEVELS,
  COURSE_TYPES,
  GRADING_SYSTEM_OPTIONS,
  SCHOOL_MEDIUMS,
  EDUCATION_FIELD_LIMITS,
  EDUCATION_LEVEL_OPTIONS,
    yearOptions,
  MIN_YEAR,
} from '@/constants/profileConstants';

import {
  educationFieldsFor,
  marksBoundsFor,
} from '@/utils/profileValidation';

// ── Scoped palette (matches Profile summary / Key skills) ──────────────────
const EDU_SAGE          = '#7F9E7E';
const EDU_SAGE_HOVER    = '#5E815D';
const EDU_SAGE_TINT     = 'rgba(127,158,126,0.15)';
const EDU_SAGE_BG       = 'rgba(127,158,126,0.08)';
const EDU_CHARCOAL      = '#273238';
const EDU_CHARCOAL_HOV  = 'rgba(39,50,56,0.85)';
const EDU_OFF_WHITE     = '#F7F7F7';
const EDU_DANGER        = '#D94D4D';
const EDU_DANGER_BG     = 'rgba(217,77,77,0.08)';
const EDU_FONT          = "'DM Sans', system-ui, sans-serif";
const EDU_TEXT_MUTED    = 'rgba(39,50,56,0.6)';
const EDU_TEXT_SUB      = 'rgba(39,50,56,0.72)';
const EDU_BORDER        = 'rgba(39,50,56,0.1)';
const EDU_DIVIDER       = 'rgba(39,50,56,0.15)';


const DIALOG_THEME_SX = {
  '& .MuiOutlinedInput-root': {
    '&:hover fieldset': { borderColor: `${EDU_SAGE} !important` },
    '&.Mui-focused fieldset': { borderColor: `${EDU_SAGE} !important`, borderWidth: '1.5px !important' },
  },
  '& .MuiInputLabel-root.Mui-focused': { color: `${EDU_SAGE} !important` },
  '& .MuiFormLabel-asterisk': { color: `${EDU_DANGER}` },
  '& .MuiAutocomplete-inputRoot': {
    '&:hover fieldset': { borderColor: `${EDU_SAGE} !important` },
    '&.Mui-focused fieldset': { borderColor: `${EDU_SAGE} !important` },
  },
};


function NumberGridPicker({
  label, value, onChange, options, error, required, placeholder, helper, cols = 6,
}) {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const displayValue = (value === '' || value == null) ? '' : String(value);

  const handleOpen  = (e) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);
  const handlePick  = (v) => {
    onChange(v);          // ← same call signature as SelectInput
    setAnchorEl(null);
  };

  const popoverWidth =
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
                  color: open ? EDU_SAGE : 'rgba(39,50,56,0.5)',
                  transition: 'transform 0.15s ease',
                  transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              />
            </InputAdornment>
          ),
          sx: { cursor: 'pointer', fontFamily: EDU_FONT },
        }}
        InputLabelProps={{ sx: { fontFamily: EDU_FONT } }}
        FormHelperTextProps={{ sx: { fontFamily: EDU_FONT } }}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: 2,
            '& fieldset': { borderColor: 'rgba(39,50,56,0.2)' },
            '&:hover fieldset': { borderColor: EDU_SAGE },
            '&.Mui-focused fieldset': { borderColor: EDU_SAGE, borderWidth: '1.5px' },
          },
          '& .MuiInputLabel-root.Mui-focused': { color: EDU_SAGE },
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
              border: `1px solid ${EDU_BORDER}`,
              boxShadow: '0 8px 24px rgba(39,50,56,0.15)',
              p: 1.5,
              width: popoverWidth,
              maxHeight: 260,     // ← was 340; ~6 rows of 6 years visible, rest scrolls
              overflowY: 'auto',
            },
          },
        }}
      >
        <Typography
          sx={{
            fontFamily: EDU_FONT,
            fontSize: '0.6875rem',
            fontWeight: 700,
            color: EDU_TEXT_MUTED,
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
            const optLabel = typeof opt === 'object' ? opt.label : String(opt);
            const selected = String(optValue) === String(value);
            return (
              <Button
                key={optValue}
                onClick={() => handlePick(optValue)}
                sx={{
                  minWidth: 0,
                  py: 1,
                  px: 0.5,
                  fontFamily: EDU_FONT,
                  fontSize: '0.8125rem',
                  fontWeight: selected ? 700 : 500,
                  color: selected ? '#FFFFFF' : 'rgba(39,50,56,0.75)',
                  bgcolor: selected ? EDU_SAGE : 'transparent',
                  borderRadius: 1.5,
                  textTransform: 'none',
                  lineHeight: 1.2,
                  '&:hover': {
                    bgcolor: selected ? EDU_SAGE_HOVER : EDU_SAGE_TINT,
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

const BOARD_SUGGESTIONS = [
  'CBSE', 'ICSE', 'State Board', 'IB', 'NIOS',
  'Andhra Pradesh Board', 'Telangana Board', 'Maharashtra Board',
  'Tamil Nadu Board', 'Karnataka Board', 'Kerala Board',
];

const COURSE_SUGGESTIONS = [
  'B.Tech/B.E.', 'B.Sc', 'B.Com', 'BCA', 'BBA', 'B.A.', 'Diploma',
  'M.Tech/M.E.', 'M.Sc', 'M.Com', 'MCA', 'MBA/PGDM', 'M.A.', 'Ph.D',
];

// ── Row copy (unchanged) ────────────────────────────────────────────────────

function formatMarks(entry) {
  if (entry.marks === null || entry.marks === undefined || entry.marks === '') return '';
  const bounds = marksBoundsFor(entry.grading_system);
  if (!bounds.label) return '';
  return bounds.label === 'Percentage' ? `${entry.marks}%` : `${entry.marks} ${bounds.label}`;
}

function describeEntry(entry) {
  const level = entry.education_level;

  if (SCHOOL_LEVELS.includes(level)) {
    return {
      primary: level,
      secondary: [entry.board, entry.school_medium && `${entry.school_medium} medium`]
        .filter(Boolean).join(' · '),
      tertiary: [
        entry.passing_out_year && `Passed in ${entry.passing_out_year}`,
        formatMarks(entry),
      ].filter(Boolean).join(' · '),
    };
  }

  if (UNIVERSITY_LEVELS.includes(level)) {
    const course = [entry.course, entry.specialization].filter(Boolean).join(' — ');
    const duration =
      entry.course_duration_start_year && entry.course_duration_end_year
        ? `${entry.course_duration_start_year} – ${entry.course_duration_end_year}`
        : '';
    return {
      primary: course || level,
      secondary: entry.university_institute,
      tertiary: [entry.course_type, duration, formatMarks(entry)].filter(Boolean).join(' · '),
    };
  }

  return {
    primary: 'Other qualification',
    secondary: entry.other_education_details,
    tertiary: '',
  };
}

// ============================================================================

export default function EducationSection({ candidateId, education = [], loading, onRefresh, dateOfBirth }) {
  const editor = useEducationEditor({ candidateId, education, onSaved: onRefresh, dateOfBirth });

  const { form, fieldErrors: err, setField } = editor;
  const shape = educationFieldsFor(form.education_level);
  const marks = marksBoundsFor(form.grading_system);
  const hasEntries = editor.sorted.length > 0;


    const startYearNum = Number(form.course_duration_start_year) || null;
  const endYearNum   = Number(form.course_duration_end_year)   || null;


  const nowYear = new Date().getFullYear();
  const MIN_UNI_YEAR = nowYear - 50;   // ← adjust if you need older
  const MAX_END_YEAR = nowYear + 6;    // reasonable future cap for ongoing courses

  // Birth-year-aware floor: can't start graduation before ~15, masters ~18, etc.
  const birthYear = (() => {
    if (!dateOfBirth) return null;
    const d = new Date(String(dateOfBirth).slice(0, 10));
    return Number.isNaN(d.getTime()) ? null : d.getFullYear();
  })();
  const MIN_AGE_AT_START = { 'Graduation/Diploma': 15, 'Masters/Post-Graduation': 18, 'Doctorate/PhD': 21 };
  const minStartAge = MIN_AGE_AT_START[form.education_level] || 0;
  const birthFloor = birthYear ? birthYear + minStartAge : MIN_UNI_YEAR;
  const effectiveMinYear = Math.max(MIN_UNI_YEAR, birthFloor);

  const inRange = (y) => y >= effectiveMinYear;

  // Start year: capped at current year (can't start in the future)
  const startYearOptions = (endYearNum
    ? yearOptions(MIN_YEAR, nowYear).filter((y) => y <= endYearNum)
    : yearOptions(MIN_YEAR, nowYear)
  ).filter(inRange);

  // End year: capped at now + 6 (reasonable future for ongoing courses)
  const endYearOptions = (startYearNum
    ? yearOptions(MIN_YEAR, MAX_END_YEAR).filter((y) => y >= startYearNum)
    : yearOptions(MIN_YEAR, MAX_END_YEAR)
  ).filter(inRange);

  const handleStartYearChange = (v) => {
    setField('course_duration_start_year', v);
    if (form.course_duration_end_year && Number(form.course_duration_end_year) < Number(v)) {
      setField('course_duration_end_year', '');
    }
  };

  return (
    <>
      {/* ── Display card — minimal list with divider lines (design #5) ── */}
      <Card
        id="education"
        elevation={0}
        sx={{
          border: `1px solid ${EDU_BORDER}`,
          borderRadius: 3,
          bgcolor: '#FFFFFF',
          overflow: 'visible',
          scrollMarginTop: 88,
          mb: { xs: 4, sm: 5 },
        }}
      >
        {/* Header row: title + description + Add education CTA */}
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
                  fontFamily: EDU_FONT,
                  fontSize: { xs: '1.0625rem', sm: '1.125rem' },
                  fontWeight: 700,
                  color: EDU_CHARCOAL,
                  letterSpacing: '-0.2px',
                  lineHeight: 1.3,
                }}
              >
                Education
              </Typography>
              {hasEntries && (
                <Tooltip title="Section complete">
                  <CheckCircleOutlined
                    sx={{ fontSize: 18, color: EDU_SAGE }}
                    aria-label="Section complete"
                  />
                </Tooltip>
              )}
            </Stack>
            <Typography
              sx={{
                fontFamily: EDU_FONT,
                fontSize: '0.8125rem',
                color: EDU_TEXT_MUTED,
                mt: 0.75,
                lineHeight: 1.5,
              }}
            >
              Recruiters filter by qualification, so add every level you have completed.
            </Typography>
          </Box>

          {editor.canAdd && (
            <Button
              onClick={editor.openCreate}
              size="small"
              startIcon={<AddOutlined sx={{ fontSize: 18 }} />}
              sx={{
                fontFamily: EDU_FONT,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.8125rem',
                color: EDU_OFF_WHITE,
                bgcolor: EDU_CHARCOAL,
                borderRadius: 2,
                px: 2,
                py: 0.75,
                whiteSpace: 'nowrap',
                flexShrink: 0,
                '&:hover': { bgcolor: EDU_CHARCOAL_HOV },
              }}
            >
              Add education
            </Button>
          )}
        </Box>

        {/* Body: divider-line list or empty state */}
        <Box sx={{ px: { xs: 2.5, sm: 3.5 }, pb: { xs: 2.5, sm: 3 }, pt: 0 }}>
          {!hasEntries ? (
            <Box
              sx={{
                py: 3,
                px: 2,
                textAlign: 'center',
                border: `1px dashed ${EDU_BORDER}`,
                borderRadius: 2,
              }}
            >
              <Typography
                sx={{
                  fontFamily: EDU_FONT,
                  fontSize: '0.875rem',
                  color: EDU_TEXT_MUTED,
                }}
              >
                No education added yet. Start with your highest qualification.
              </Typography>
            </Box>
          ) : (
            <>
              {editor.sorted.map((entry, index) => {
                const view = describeEntry(entry);
                const isLast = index === editor.sorted.length - 1;
                return (
                  <Box
                    key={entry.education_id}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: 2,
                      py: 2,
                      borderBottom: isLast ? 'none' : `1px dashed ${EDU_DIVIDER}`,
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        sx={{
                          fontFamily: EDU_FONT,
                          fontSize: '0.9375rem',
                          fontWeight: 700,
                          color: EDU_CHARCOAL,
                          letterSpacing: '-0.1px',
                          lineHeight: 1.35,
                        }}
                      >
                        {view.primary}
                      </Typography>
                      {view.secondary && (
                        <Typography
                          sx={{
                            fontFamily: EDU_FONT,
                            fontSize: '0.8125rem',
                            color: EDU_TEXT_SUB,
                            mt: 0.5,
                            lineHeight: 1.45,
                          }}
                        >
                          {view.secondary}
                        </Typography>
                      )}
                      {view.tertiary && (
                        <Typography
                          sx={{
                            fontFamily: EDU_FONT,
                            fontSize: '0.75rem',
                            color: EDU_TEXT_MUTED,
                            mt: 0.5,
                            lineHeight: 1.45,
                          }}
                        >
                          {view.tertiary}
                        </Typography>
                      )}
                    </Box>

                    <Stack direction="row" gap={0.25} sx={{ flexShrink: 0 }}>
                      <Tooltip title="Edit">
                        <IconButton
                          onClick={() => editor.openEdit(entry)}
                          size="small"
                          aria-label={`Edit ${view.primary}`}
                          sx={{
                            color: EDU_TEXT_MUTED,
                            '&:hover': { color: EDU_SAGE, bgcolor: EDU_SAGE_BG },
                          }}
                        >
                          <EditOutlined sx={{ fontSize: 17 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          onClick={() => editor.setPendingDelete(entry)}
                          size="small"
                          aria-label={`Delete ${view.primary}`}
                          sx={{
                            color: EDU_TEXT_MUTED,
                            '&:hover': { color: EDU_DANGER, bgcolor: EDU_DANGER_BG },
                          }}
                        >
                          <DeleteOutlineOutlined sx={{ fontSize: 17 }} />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Box>
                );
              })}

              <Typography
                sx={{
                  fontFamily: EDU_FONT,
                  fontSize: '0.75rem',
                  color: EDU_TEXT_MUTED,
                  mt: 2,
                }}
              >
                {!editor.canAdd
                  ? 'You have added an entry for every education level.'
                  : `${editor.sorted.length} qualification${editor.sorted.length !== 1 ? 's' : ''}`}
              </Typography>
            </>
          )}
        </Box>
      </Card>

      {/* ── Add / Edit dialog — SAME shared FormDialog, scoped sage theme ── */}
      {/* Same fields, same branching, same year-pair live validation, same */}
      {/* validation, same save endpoint. Only colours + start/end year      */}
      {/* pickers changed — same values emitted through same setters.        */}
      <FormDialog
        open={editor.open}
        onClose={editor.close}
        title={editor.isEditing ? `Edit ${form.education_level}` : 'Add education'}
        subtitle={
          editor.isEditing
            ? 'Education level cannot be changed. Delete this entry to add a different level.'
            : undefined
        }
        onSubmit={editor.save}
        submitLabel={editor.isEditing ? 'Save changes' : 'Add education'}
        submitColor={EDU_CHARCOAL}
        titleColor={EDU_CHARCOAL}
        saving={editor.saving}
        formError={editor.formError}
      >
        <Box sx={DIALOG_THEME_SX}>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <SelectInput
                label="Education level"
                value={form.education_level}
                onChange={(v) => setField('education_level', v)}
                options={editor.isEditing ? [form.education_level] : editor.availableLevels}
                error={err.education_level}
                required
                disabled={editor.isEditing}
                placeholder={editor.isEditing ? undefined : 'Select a level'}
                helper={
                  !editor.isEditing &&
                  editor.availableLevels.length < EDUCATION_LEVEL_OPTIONS.length
                    ? 'Levels you have already added are not listed.'
                    : undefined
                }
              />
            </Grid>

            {shape.school && (
              <>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <ComboInput
                    label="Board"
                    value={form.board}
                    onChange={(v) => setField('board', v)}
                    options={BOARD_SUGGESTIONS}
                    error={err.board}
                    required
                    placeholder="CBSE, State Board…"
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <NumberGridPicker
                    label="Passing out year"
                    value={form.passing_out_year}
                    onChange={(v) => setField('passing_out_year', v)}
                    options={yearOptions()}
                    error={err.passing_out_year}
                    required
                    placeholder="Select year"
                    cols={6}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <SelectInput
                    label="School medium"
                    value={form.school_medium}
                    onChange={(v) => setField('school_medium', v)}
                    options={SCHOOL_MEDIUMS}
                    error={err.school_medium}
                    required
                    placeholder="Select medium"
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <SelectInput
                    label="Marking system"
                    value={form.grading_system}
                    onChange={(v) => setField('grading_system', v)}
                    options={GRADING_SYSTEM_OPTIONS}
                    error={err.grading_system}
                    placeholder="Percentage"
                    helper="Changes what counts as a valid score."
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextInput
                    label={marks.label ? `Overall ${marks.label.toLowerCase()}` : 'Marks'}
                    value={form.marks}
                    onChange={(v) => setField('marks', v)}
                    error={err.marks}
                    required
                    type="number"
                    disabled={marks.min === null}
                    helper={
                      marks.min === null
                        ? 'Not needed for a pass-only course'
                        : `Between ${marks.min} and ${marks.max}`
                    }
                  />
                </Grid>
              </>
            )}

            {shape.university && (
              <>
                <Grid size={{ xs: 12 }}>
                  <TextInput
                    label="University or institute"
                    value={form.university_institute}
                    onChange={(v) => setField('university_institute', v)}
                    error={err.university_institute}
                    required
                    maxLength={EDUCATION_FIELD_LIMITS.university_institute}
                    placeholder="JNTU Hyderabad"
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <ComboInput
                    label="Course"
                    value={form.course}
                    onChange={(v) => setField('course', v)}
                    options={COURSE_SUGGESTIONS}
                    error={err.course}
                    required
                    placeholder="B.Tech/B.E."
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextInput
                    label="Specialization"
                    value={form.specialization}
                    onChange={(v) => setField('specialization', v)}
                    error={err.specialization}
                    required
                    maxLength={EDUCATION_FIELD_LIMITS.specialization}
                    placeholder="Computer Science"
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <SelectInput
                    label="Course type"
                    value={form.course_type}
                    onChange={(v) => setField('course_type', v)}
                    options={COURSE_TYPES}
                    error={err.course_type}
                    required
                    placeholder="Select type"
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <SelectInput
                    label="Marking system"
                    value={form.grading_system}
                    onChange={(v) => setField('grading_system', v)}
                    options={GRADING_SYSTEM_OPTIONS}
                    error={err.grading_system}
                    placeholder="Select system"
                  />
                </Grid>

                {/* BUILD: 2026-08-01-edu-year-live-validation — coupled year
                    pickers: start is capped by end, end starts at start, and a
                    start later than the chosen end clears the end.
                    Rendered via NumberGridPicker so the user sees a compact
                    grid popover instead of a long vertical list. The filtered
                    startYearOptions / endYearOptions arrays are passed as
                    options unchanged, so the picker only shows valid years. */}
                <Grid size={{ xs: 6, sm: 4 }}>
                  <NumberGridPicker
                    label="Start year"
                    value={form.course_duration_start_year}
                    onChange={handleStartYearChange}
                    options={startYearOptions}
                    error={err.course_duration_start_year}
                    required
                    placeholder="From"
                    helper={endYearNum ? `Up to ${endYearNum}` : undefined}
                    cols={6}
                  />
                </Grid>

                <Grid size={{ xs: 6, sm: 4 }}>
                  <NumberGridPicker
                    label="End year"
                    value={form.course_duration_end_year}
                    onChange={(v) => setField('course_duration_end_year', v)}
                    options={endYearOptions}
                    error={err.course_duration_end_year}
                    required
                    placeholder="To"
                    helper={startYearNum ? `${startYearNum} or later` : undefined}
                    cols={6}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextInput
                    label={marks.label || 'Marks'}
                    value={form.marks}
                    onChange={(v) => setField('marks', v)}
                    error={err.marks}
                    type="number"
                    disabled={marks.min === null}
                    helper={
                      marks.min === null ? 'Not needed' : `Between ${marks.min} and ${marks.max}`
                    }
                  />
                </Grid>
              </>
            )}

            {shape.other && (
              <Grid size={{ xs: 12 }}>
                <TextInput
                  label="Education details"
                  value={form.other_education_details}
                  onChange={(v) => setField('other_education_details', v)}
                  error={err.other_education_details}
                  required
                  maxLength={EDUCATION_FIELD_LIMITS.other_education_details}
                  multiline
                  rows={2}
                  placeholder="Certificate course in Data Analytics, 2023"
                />
              </Grid>
            )}

            {!form.education_level && (
              <Grid size={{ xs: 12 }}>
                <Alert
                  severity="info"
                  icon={false}
                  sx={{
                    fontFamily: EDU_FONT,
                    fontSize: '0.8125rem',
                    bgcolor: EDU_SAGE_TINT,
                    color: EDU_CHARCOAL,
                    border: `1px solid ${EDU_SAGE}`,
                    borderRadius: 2,
                    '& .MuiAlert-message': { fontFamily: EDU_FONT },
                  }}
                >
                  Choose an education level to see the fields for it.
                </Alert>
              </Grid>
            )}
          </Grid>
        </Box>
      </FormDialog>

      <ConfirmDialog
        open={Boolean(editor.pendingDelete)}
        onClose={() => editor.setPendingDelete(null)}
        onConfirm={editor.confirmDelete}
        busy={editor.deleting}
        title={`Remove ${editor.pendingDelete?.education_level || 'this entry'}?`}
        message="This permanently removes the entry from your profile. You can add it again later, but the details will need to be re-entered."
        confirmLabel="Remove"
      />
    </>
  );
}