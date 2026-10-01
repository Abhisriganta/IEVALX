import React, { useState } from 'react';
import {
  Grid, Box, Card, Stack, Typography, Button, IconButton, Tooltip, Chip,
  TextField, Popover, InputAdornment,
} from '@mui/material';
import EditOutlined from '@mui/icons-material/EditOutlined';
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined';
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import AddOutlined from '@mui/icons-material/AddOutlined';
import ArrowDropDown from '@mui/icons-material/ArrowDropDown';
import WorkOutlined from '@mui/icons-material/WorkOutlined';

import {
  FormDialog, ConfirmDialog, TextInput, SwitchInput,
} from '../parts';

import useEmploymentEditor from '@/hooks/jobseeker/useEmploymentEditor';

import {
  EMPLOYMENT_TYPES,
  NOTICE_PERIODS,
  EMPLOYMENT_FIELD_LIMITS,
  EXPERIENCE_YEARS,
  EXPERIENCE_MONTHS,
  CURRENCIES,
  MONTHS,
  monthLabel,
  yearOptions,
} from '@/constants/profileConstants';

// ── Scoped palette (matches Profile summary / Key skills / Education) ─────
const EMP_SAGE          = '#7F9E7E';
const EMP_SAGE_HOVER    = '#5E815D';
const EMP_SAGE_TINT     = 'rgba(127,158,126,0.15)';
const EMP_SAGE_BG       = 'rgba(127,158,126,0.08)';
const EMP_SAGE_STRONG   = 'rgba(127,158,126,0.35)';
const EMP_CHARCOAL      = '#273238';
const EMP_CHARCOAL_HOV  = 'rgba(39,50,56,0.85)';
const EMP_OFF_WHITE     = '#F7F7F7';
const EMP_DANGER        = '#D94D4D';
const EMP_DANGER_BG     = 'rgba(217,77,77,0.08)';
const EMP_FONT          = "'DM Sans', system-ui, sans-serif";
const EMP_TEXT_MUTED    = 'rgba(39,50,56,0.6)';
const EMP_TEXT_SUB      = 'rgba(39,50,56,0.72)';
const EMP_BORDER        = 'rgba(39,50,56,0.1)';

const DIALOG_THEME_SX = {
  '& .MuiOutlinedInput-root': {
    '&:hover fieldset': { borderColor: `${EMP_SAGE} !important` },
    '&.Mui-focused fieldset': { borderColor: `${EMP_SAGE} !important`, borderWidth: '1.5px !important' },
  },
  '& .MuiInputLabel-root.Mui-focused': { color: `${EMP_SAGE} !important` },
  '& .MuiFormLabel-asterisk': { color: EMP_DANGER },
  // Switch (SwitchInput) — tint the "on" state to sage
  '& .MuiSwitch-switchBase.Mui-checked': { color: EMP_SAGE },
  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: EMP_SAGE },
};


function NumberGridPicker({
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
    onChange(v);          // ← same call signature as SelectInput
    setAnchorEl(null);
  };

  const popoverWidth =
    cols === 1 ? 260 :
    cols === 2 ? 240 :
    cols === 3 ? 260 :
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
                  color: open ? EMP_SAGE : 'rgba(39,50,56,0.5)',
                  transition: 'transform 0.15s ease',
                  transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              />
            </InputAdornment>
          ),
          sx: { cursor: 'pointer', fontFamily: EMP_FONT },
        }}
        InputLabelProps={{ sx: { fontFamily: EMP_FONT } }}
        FormHelperTextProps={{ sx: { fontFamily: EMP_FONT } }}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: 2,
            '& fieldset': { borderColor: 'rgba(39,50,56,0.2)' },
            '&:hover fieldset': { borderColor: EMP_SAGE },
            '&.Mui-focused fieldset': { borderColor: EMP_SAGE, borderWidth: '1.5px' },
          },
          '& .MuiInputLabel-root.Mui-focused': { color: EMP_SAGE },
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
              border: `1px solid ${EMP_BORDER}`,
              boxShadow: '0 8px 24px rgba(39,50,56,0.15)',
              p: 1.5,
              width: popoverWidth,
              maxHeight: 320,
              overflowY: 'auto',
            },
          },
        }}
      >
        <Typography
          sx={{
            fontFamily: EMP_FONT,
            fontSize: '0.6875rem',
            fontWeight: 700,
            color: EMP_TEXT_MUTED,
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
                  fontFamily: EMP_FONT,
                  fontSize: '0.8125rem',
                  fontWeight: selected ? 700 : 500,
                  color: selected ? '#FFFFFF' : 'rgba(39,50,56,0.75)',
                  bgcolor: selected ? EMP_SAGE : 'transparent',
                  borderRadius: 1.5,
                  textTransform: 'none',
                  lineHeight: 1.2,
                  '&:hover': {
                    bgcolor: selected ? EMP_SAGE_HOVER : EMP_SAGE_TINT,
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

// ── Row copy (unchanged behaviour) ─────────────────────────────────────────

function formatTenure(entry) {
  if (!entry.joining_date_year) return '';
  const start = entry.joining_date_month
    ? `${monthLabel(entry.joining_date_month)} ${entry.joining_date_year}`
    : String(entry.joining_date_year);
  return entry.is_current_employment ? `${start} – Present` : `From ${start}`;
}

function formatSalaryLine(entry) {
  const raw = entry.current_salary;
  if (raw === null || raw === undefined || raw === '') return '';
  const amount = Number(raw);
  if (!Number.isFinite(amount)) return '';
  return `${entry.salary_currency || '₹'}${amount.toLocaleString('en-IN')} per year`;
}

function skillChips(entry) {
  if (Array.isArray(entry.skills_used_list)) return entry.skills_used_list.slice(0, 6);
  if (!entry.skills_used) return [];
  return String(entry.skills_used)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 6);
}

// ============================================================================

export default function EmploymentSection({
  candidateId, employment = [], loading, onRefresh, dateOfBirth,
}) {
  const editor = useEmploymentEditor({ candidateId, employment, onSaved: onRefresh });

  const { form, fieldErrors: err, setField, isCurrent } = editor;
  const hasEntries = editor.sorted.length > 0;

  // BUILD: 2026-08-01-dob-year-guard
  const birthYear = (() => {
    const y = parseInt(String(dateOfBirth || '').slice(0, 4), 10);
    return Number.isFinite(y) && y > 1900 ? y : null;
  })();

  const joiningYearOptions = birthYear
    ? yearOptions().filter((y) => y > birthYear)
    : yearOptions();

  // BUILD: 2026-08-01-employment-autoexp
  const autoFillExperience = (month, year) => {
    const y = Number(year);
    if (!y) return;
    const m = Number(month) || 1;
    const now = new Date();
    let months = (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m);
    if (months < 0) months = 0;
    const maxMonths = 50 * 12 + 11;
    if (months > maxMonths) months = maxMonths;
    setField('total_experience_years', Math.floor(months / 12));
    setField('total_experience_months', months % 12);
  };

  return (
    <>
      {/* ── Display card — vertical sage-rail timeline (design #1) ────── */}
      <Card
        id="employment"
        elevation={0}
        sx={{
          border: `1px solid ${EMP_BORDER}`,
          borderRadius: 3,
          bgcolor: '#FFFFFF',
          overflow: 'visible',
          scrollMarginTop: 88,
          mb: { xs: 4, sm: 5 },
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
            <Stack direction="row" gap={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <Typography
                component="h2"
                sx={{
                  fontFamily: EMP_FONT,
                  fontSize: { xs: '1.0625rem', sm: '1.125rem' },
                  fontWeight: 700,
                  color: EMP_CHARCOAL,
                  letterSpacing: '-0.2px',
                  lineHeight: 1.3,
                }}
              >
                Employment
              </Typography>
              {hasEntries && (
                <Tooltip title="Section complete">
                  <CheckCircleOutlined
                    sx={{ fontSize: 18, color: EMP_SAGE }}
                    aria-label="Section complete"
                  />
                </Tooltip>
              )}
              {editor.totalExperience && (
                <Chip
                  icon={<WorkOutlined sx={{ fontSize: 14, color: `${EMP_SAGE_HOVER} !important` }} />}
                  label={editor.totalExperience}
                  size="small"
                  sx={{
                    fontFamily: EMP_FONT,
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    height: 22,
                    bgcolor: EMP_SAGE_TINT,
                    color: EMP_SAGE_HOVER,
                    border: 'none',
                    letterSpacing: '0.3px',
                    '& .MuiChip-label': { px: 1 },
                  }}
                />
              )}
            </Stack>
            <Typography
              sx={{
                fontFamily: EMP_FONT,
                fontSize: '0.8125rem',
                color: EMP_TEXT_MUTED,
                mt: 0.75,
                lineHeight: 1.5,
              }}
            >
              Add each role separately. Recruiters read the most recent one first.
            </Typography>
          </Box>

          <Button
            onClick={editor.openCreate}
            size="small"
            startIcon={<AddOutlined sx={{ fontSize: 18 }} />}
            sx={{
              fontFamily: EMP_FONT,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.8125rem',
              color: EMP_OFF_WHITE,
              bgcolor: EMP_CHARCOAL,
              borderRadius: 2,
              px: 2,
              py: 0.75,
              whiteSpace: 'nowrap',
              flexShrink: 0,
              '&:hover': { bgcolor: EMP_CHARCOAL_HOV },
            }}
          >
            Add employment
          </Button>
        </Box>

        {/* Body: timeline entries or empty state */}
        <Box sx={{ px: { xs: 2.5, sm: 3.5 }, pb: { xs: 2.5, sm: 3 }, pt: 0 }}>
          {!hasEntries ? (
            <Box
              sx={{
                py: 3,
                px: 2,
                textAlign: 'center',
                border: `1px dashed ${EMP_BORDER}`,
                borderRadius: 2,
              }}
            >
              <Typography
                sx={{
                  fontFamily: EMP_FONT,
                  fontSize: '0.875rem',
                  color: EMP_TEXT_MUTED,
                }}
              >
                No employment added yet. Add your current or most recent role.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ position: 'relative', pl: { xs: 2.5, sm: 3.25 } }}>
              {/* Vertical rail */}
              <Box
                sx={{
                  position: 'absolute',
                  left: { xs: 6, sm: 6.5 },
                  top: 10,
                  bottom: 10,
                  width: '2px',
                  bgcolor: 'rgba(127,158,126,0.3)',
                }}
              />

              {editor.sorted.map((entry, index) => {
                const chips = skillChips(entry);
                const tenure = formatTenure(entry);
                const salary = formatSalaryLine(entry);
                const notice = entry.is_current_employment && entry.notice_period
                  ? `Notice: ${entry.notice_period}`
                  : '';
                const tertiary = [tenure, salary, notice].filter(Boolean).join(' · ');
                const isLast = index === editor.sorted.length - 1;
                const isCurrentRole = Boolean(entry.is_current_employment);

                return (
                  <Box
                    key={entry.employment_id}
                    sx={{
                      position: 'relative',
                      mb: isLast ? 0 : 3,
                    }}
                  >
                    {/* Timeline dot */}
                    <Box
                      sx={{
                        position: 'absolute',
                        left: { xs: -19, sm: -22 },
                        top: 4,
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        bgcolor: isCurrentRole ? EMP_SAGE : '#FFFFFF',
                        border: isCurrentRole ? '3px solid #FFFFFF' : `2px solid ${EMP_SAGE}`,
                        boxShadow: isCurrentRole
                          ? `0 0 0 2px ${EMP_SAGE_STRONG}`
                          : 'none',
                      }}
                    />

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Stack direction="row" gap={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                          <Typography
                            sx={{
                              fontFamily: EMP_FONT,
                              fontSize: '0.9375rem',
                              fontWeight: 700,
                              color: EMP_CHARCOAL,
                              letterSpacing: '-0.1px',
                              lineHeight: 1.35,
                            }}
                          >
                            {entry.job_title}
                          </Typography>
                          {isCurrentRole && (
                            <Chip
                              label="CURRENT"
                              size="small"
                              sx={{
                                fontFamily: EMP_FONT,
                                fontSize: '0.625rem',
                                fontWeight: 700,
                                height: 18,
                                bgcolor: EMP_SAGE_TINT,
                                color: EMP_SAGE_HOVER,
                                letterSpacing: '0.3px',
                                '& .MuiChip-label': { px: 1 },
                              }}
                            />
                          )}
                        </Stack>

                        {[entry.company_name, entry.employment_type].filter(Boolean).length > 0 && (
                          <Typography
                            sx={{
                              fontFamily: EMP_FONT,
                              fontSize: '0.8125rem',
                              color: EMP_TEXT_SUB,
                              mt: 0.4,
                            }}
                          >
                            {[entry.company_name, entry.employment_type].filter(Boolean).join(' · ')}
                          </Typography>
                        )}

                        {tertiary && (
                          <Typography
                            sx={{
                              fontFamily: EMP_FONT,
                              fontSize: '0.75rem',
                              color: EMP_TEXT_MUTED,
                              mt: 0.5,
                              lineHeight: 1.5,
                            }}
                          >
                            {tertiary}
                          </Typography>
                        )}

                        {chips.length > 0 && (
                          <Stack
                            direction="row"
                            gap={0.75}
                            sx={{ mt: 1.25, flexWrap: 'wrap' }}
                          >
                            {chips.map((skill) => (
                              <Chip
                                key={skill}
                                label={skill}
                                size="small"
                                sx={{
                                  fontFamily: EMP_FONT,
                                  fontSize: '0.6875rem',
                                  fontWeight: 500,
                                  height: 22,
                                  bgcolor: EMP_SAGE_BG,
                                  color: EMP_CHARCOAL,
                                  border: 'none',
                                  '& .MuiChip-label': { px: 1.25 },
                                }}
                              />
                            ))}
                          </Stack>
                        )}
                      </Box>

                      <Stack direction="row" gap={0.25} sx={{ flexShrink: 0 }}>
                        <Tooltip title="Edit">
                          <IconButton
                            onClick={() => editor.openEdit(entry)}
                            size="small"
                            aria-label={`Edit ${entry.job_title}`}
                            sx={{
                              color: EMP_TEXT_MUTED,
                              '&:hover': { color: EMP_SAGE, bgcolor: EMP_SAGE_BG },
                            }}
                          >
                            <EditOutlined sx={{ fontSize: 17 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            onClick={() => editor.setPendingDelete(entry)}
                            size="small"
                            aria-label={`Delete ${entry.job_title}`}
                            sx={{
                              color: EMP_TEXT_MUTED,
                              '&:hover': { color: EMP_DANGER, bgcolor: EMP_DANGER_BG },
                            }}
                          >
                            <DeleteOutlineOutlined sx={{ fontSize: 17 }} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>
      </Card>

      {/* ── Add / Edit dialog — same shared FormDialog, scoped sage theme ── */}
      {/* Same fields, same validation, same autoFillExperience, same DOB   */}
      {/* year guard, same save endpoint. All dropdowns swapped to grid      */}
      {/* popovers — same value type emitted through same setters.           */}
      <FormDialog
        open={editor.open}
        onClose={editor.close}
        title={editor.isEditing ? 'Edit employment' : 'Add employment'}
        onSubmit={editor.save}
        submitLabel={editor.isEditing ? 'Save changes' : 'Add employment'}
        submitColor={EMP_CHARCOAL}
        titleColor={EMP_CHARCOAL}
        saving={editor.saving}
        formError={editor.formError}
        maxWidth="md"
      >
        <Box sx={DIALOG_THEME_SX}>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <SwitchInput
                label="This is my current job"
                checked={isCurrent}
                onChange={(v) => setField('is_current_employment', v)}
                helper={
                  isCurrent
                    ? 'Marking this as current will move any other role to past.'
                    : 'Notice period does not apply to a past role.'
                }
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <NumberGridPicker
                label="Employment type"
                value={form.employment_type}
                onChange={(v) => setField('employment_type', v)}
                options={EMPLOYMENT_TYPES}
                error={err.employment_type}
                required
                cols={2}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextInput
                label="Company name"
                value={form.company_name}
                onChange={(v) => setField('company_name', v)}
                error={err.company_name}
                required
                maxLength={EMPLOYMENT_FIELD_LIMITS.company_name}
                placeholder="Lanciere Technologies"
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextInput
                label="Job title"
                value={form.job_title}
                onChange={(v) => setField('job_title', v)}
                error={err.job_title}
                required
                maxLength={EMPLOYMENT_FIELD_LIMITS.job_title}
                placeholder="Backend Developer"
              />
            </Grid>

            {/* BUILD: 2026-08-01-employment-autoexp — changing either joining
                field recomputes the experience dropdowns below.
                BUILD: 2026-08-01-dob-year-guard — joining year floor is the
                candidate's birth year. */}
            <Grid size={{ xs: 6, sm: 3 }}>
              <NumberGridPicker
                label="Joining month"
                value={form.joining_date_month}
                onChange={(v) => {
                  setField('joining_date_month', v);
                  autoFillExperience(v, form.joining_date_year);
                }}
                options={MONTHS}
                error={err.joining_date_month}
                placeholder="Month"
                cols={3}
              />
            </Grid>

            <Grid size={{ xs: 6, sm: 3 }}>
              <NumberGridPicker
                label="Joining year"
                value={form.joining_date_year}
                onChange={(v) => {
                  setField('joining_date_year', v);
                  autoFillExperience(form.joining_date_month, v);
                }}
                options={joiningYearOptions}
                error={err.joining_date_year}
                placeholder="Year"
                helper={birthYear ? `After ${birthYear} (your birth year)` : undefined}
                cols={5}
              />
            </Grid>

            <Grid size={{ xs: 6, sm: 3 }}>
              <NumberGridPicker
                label="Total experience (years)"
                value={form.total_experience_years}
                onChange={(v) => setField('total_experience_years', v)}
                options={EXPERIENCE_YEARS}
                error={err.total_experience_years}
                placeholder="0"
                helper="Auto-filled from joining date"
                cols={6}
              />
            </Grid>

            <Grid size={{ xs: 6, sm: 3 }}>
              <NumberGridPicker
                label="and months"
                value={form.total_experience_months}
                onChange={(v) => setField('total_experience_months', v)}
                options={EXPERIENCE_MONTHS}
                error={err.total_experience_months}
                placeholder="0"
                helper="Adjust for past roles"
                cols={4}
              />
            </Grid>

            <Grid size={{ xs: 4, sm: 2 }}>
              <NumberGridPicker
                label="Currency"
                value={form.salary_currency}
                onChange={(v) => setField('salary_currency', v)}
                options={CURRENCIES}
                cols={3}
              />
            </Grid>

            <Grid size={{ xs: 8, sm: 4 }}>
              <TextInput
                label="Annual salary"
                value={form.current_salary}
                onChange={(v) => setField('current_salary', v)}
                error={err.current_salary}
                type="number"
                helper="Optional. Only shown to recruiters you apply to."
              />
            </Grid>

            {isCurrent && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <NumberGridPicker
                  label="Notice period"
                  value={form.notice_period}
                  onChange={(v) => setField('notice_period', v)}
                  options={NOTICE_PERIODS}
                  error={err.notice_period}
                  placeholder="Select notice period"
                  cols={1}
                />
              </Grid>
            )}

            <Grid size={{ xs: 12 }}>
              <TextInput
                label="Skills used"
                value={form.skills_used}
                onChange={(v) => setField('skills_used', v)}
                error={err.skills_used}
                required
                maxLength={EMPLOYMENT_FIELD_LIMITS.skills_used}
                placeholder="Python, Django, REST APIs, MySQL"
                helper="Separate each skill with a comma."
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextInput
                label="What you did in this role"
                value={form.job_profile}
                onChange={(v) => setField('job_profile', v)}
                error={err.job_profile}
                multiline
                rows={4}
                maxLength={EMPLOYMENT_FIELD_LIMITS.job_profile}
                placeholder="Describe your responsibilities and what you delivered."
              />
            </Grid>
          </Grid>
        </Box>
      </FormDialog>

      <ConfirmDialog
        open={Boolean(editor.pendingDelete)}
        onClose={() => editor.setPendingDelete(null)}
        onConfirm={editor.confirmDelete}
        busy={editor.deleting}
        title="Remove this role?"
        message={
          editor.pendingDelete
            ? `This removes ${editor.pendingDelete.job_title} at ${editor.pendingDelete.company_name} from your profile.`
            : ''
        }
        confirmLabel="Remove"
      />
    </>
  );
}