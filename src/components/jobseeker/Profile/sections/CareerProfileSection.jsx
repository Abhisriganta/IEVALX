

import React from 'react';
import {
  Box, Grid, Stack, Chip, Typography, Button, Autocomplete, TextField,
} from '@mui/material';
import EditOutlined from '@mui/icons-material/EditOutlined';
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined';

import {
  SectionCard, EmptyState, FormDialog, ConfirmDialog,
  TextInput, SelectInput, ComboInput,
} from '../parts';

import useCareerProfileEditor from '@/hooks/jobseeker/useCareerProfileEditor';

import {
  DESIRED_JOB_TYPES,
  DESIRED_EMPLOYMENT_TYPES,
  PREFERRED_SHIFTS,
  CAREER_FIELD_LIMITS,
  MAX_PREFERRED_LOCATIONS,
  INDUSTRY_SUGGESTIONS,
  DEPARTMENT_SUGGESTIONS,
  LOCATION_SUGGESTIONS,
  CURRENCIES,
  PALETTE,
  FONTS,
} from '@/constants/profileConstants';

import { splitCsv } from '@/utils/profileValidation';

/* ── Chip group for the SET columns ────────────────────────────────────── */

function ChipSelect({ label, options, selected = [], onToggle, error, helper }) {
  return (
    <Box>
      <Typography
       sx={{ fontFamily: FONTS.body, fontSize: '0.8125rem', color: PALETTE.charcoal || '#273238', mb: 1 }}
      >
        {label}
      </Typography>
      <Stack direction="row" gap={1.5} sx={{ flexWrap: 'wrap' }}>
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <Chip
              key={option}
              label={option}
              onClick={() => onToggle(option)}
              variant={active ? 'filled' : 'outlined'}
             sx={{
                fontFamily: FONTS.body,
                fontSize: '0.8125rem',
                cursor: 'pointer',
                bgcolor: active ? (PALETTE.sage || '#7F9E7E') : 'transparent',
                color: active ? '#fff' : (PALETTE.charcoal || '#273238'),
                borderColor: active ? (PALETTE.sage || '#7F9E7E') : PALETTE.border,
                '&:hover': {
                  bgcolor: active ? '#6B8A6A' : (PALETTE.sageTint || 'rgba(127,158,126,0.1)'),
                } }}
            />
          );
        })}
      </Stack>
      {(error || helper) && (
        <Typography
         sx={{
            fontFamily: FONTS.body,
            fontSize: '0.75rem',
            color: error ? PALETTE.danger : PALETTE.muted,
            mt: 0.75 }}
        >
          {error || helper}
        </Typography>
      )}
    </Box>
  );
}

/* ── Read-only row ─────────────────────────────────────────────────────── */

function DetailRow({ label, value }) {
  if (!value || (Array.isArray(value) && !value.length)) return null;
  const text = Array.isArray(value) ? value.join(', ') : value;
  return (
    <Grid size={{ xs: 12, sm: 6 }}>
      <Typography sx={{ fontFamily: FONTS.body, fontSize: '0.75rem', color: PALETTE.muted }}>
        {label}
      </Typography>
      <Typography
       sx={{
          fontFamily: FONTS.body, fontSize: '0.875rem',
          color: PALETTE.charcoal || '#273238', fontWeight: 500, mt: 0.25 }}
      >
        {text}
      </Typography>
    </Grid>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */

export default function CareerProfileSection({ candidateId, career, loading, onRefresh }) {
  const editor = useCareerProfileEditor({ candidateId, career, onSaved: onRefresh });
  const { form, fieldErrors: err, setField, toggleValue } = editor;

  const salaryDisplay =
    career?.expected_salary != null
      ? `${career.salary_currency || '₹'}${Number(career.expected_salary).toLocaleString('en-IN')} per year`
      : null;

  return (
    <>
      <SectionCard
        id="career"
        title="Career preferences"
        description="What you are looking for next. Recruiters match against this."
        complete={editor.hasAnything}
        loading={loading}
        onAdd={editor.hasAnything ? undefined : editor.openEditor}
        addLabel="Add preferences"
        addFilled
        titleColor={PALETTE.charcoal || '#273238'}
        accentColor={PALETTE.sage || '#7F9E7E'}
        actions={
          editor.hasAnything && (
            <Stack direction="row" gap={0.5}>
              <Button
                onClick={editor.openEditor}
                size="small"
                startIcon={<EditOutlined sx={{ fontSize: 17 }} />}
               sx={{
                  fontFamily: FONTS.body, textTransform: 'none', fontWeight: 600,
                  fontSize: '0.8125rem', color: PALETTE.sage || '#7F9E7E',
                  '&:hover': { bgcolor: PALETTE.sageTint || 'rgba(127,158,126,0.1)' } }}
              >
                Edit
              </Button>
              <Button
                onClick={() => editor.setConfirmClear(true)}
                size="small"
                startIcon={<DeleteOutlineOutlined sx={{ fontSize: 17 }} />}
               sx={{
                  fontFamily: FONTS.body, textTransform: 'none', fontWeight: 600,
                  fontSize: '0.8125rem', color: PALETTE.muted,
                  '&:hover': { bgcolor: `${PALETTE.danger}0F`, color: PALETTE.danger } }}
              >
                Clear
              </Button>
            </Stack>
          )
        }
      >
        {!editor.hasAnything ? (
          <EmptyState
            message="No preferences set. Tell recruiters the roles and locations you want."
            accentColor={PALETTE.sage || '#7F9E7E'}
          />
        ) : (
          <Grid container spacing={3}>
            <DetailRow label="Current industry" value={career?.current_industry} />
            <DetailRow label="Department" value={career?.department} />
            <DetailRow label="Role category" value={career?.role_category} />
            <DetailRow label="Job role" value={career?.job_role} />
            <DetailRow label="Job type" value={splitCsv(career?.desired_job_type)} />
            <DetailRow label="Employment type" value={splitCsv(career?.desired_employment_type)} />
            <DetailRow label="Preferred shift" value={career?.preferred_shift} />
            <DetailRow label="Expected salary" value={salaryDisplay} />

            {splitCsv(career?.preferred_work_location).length > 0 && (
              <Grid size={{ xs: 12 }}>
                <Typography
                 sx={{ fontFamily: FONTS.body, fontSize: '0.75rem', color: PALETTE.muted, mb: 0.75 }}
                >
                  Preferred locations
                </Typography>
                <Stack direction="row" gap={0.75} sx={{ flexWrap: 'wrap' }}>
                  {splitCsv(career.preferred_work_location).map((loc) => (
                    <Chip
                      key={loc}
                      label={loc}
                      size="small"
                     sx={{
                        fontFamily: FONTS.body, fontSize: '0.75rem', height: 24,
                        bgcolor: PALETTE.sageTint || 'rgba(127,158,126,0.1)',
                        border: `1px solid ${PALETTE.sage || '#7F9E7E'}`,
                        color: PALETTE.charcoal || '#273238' }}
                    />
                  ))}
                </Stack>
              </Grid>
            )}
          </Grid>
        )}
      </SectionCard>

      <FormDialog
        open={editor.open}
        onClose={editor.close}
        title="Career preferences"
        subtitle="Everything here is optional. Fill in what matters to you."
        onSubmit={editor.save}
        submitLabel="Save preferences"
        saving={editor.saving}
        formError={editor.formError}
        maxWidth="md"
        submitColor={PALETTE.sage || '#7F9E7E'}
        titleColor={PALETTE.charcoal || '#273238'}
        hideScrollbar
      >
        <Box sx={{
          '& .MuiOutlinedInput-root.Mui-focused fieldset': {
            borderColor: `${PALETTE.sage || '#7F9E7E'} !important`,
            borderWidth: '1.5px !important',
          },
          '& .MuiInputLabel-root.Mui-focused': {
            color: `${PALETTE.sage || '#7F9E7E'} !important`,
          },
          '& .MuiAutocomplete-listbox': {
            '&::-webkit-scrollbar': { display: 'none' },
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          },
        }}>
        <Grid container spacing={3} sx={{ pt: 1 }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <ComboInput
              label="Current industry"
              value={form.current_industry}
              onChange={(v) => setField('current_industry', v)}
              options={INDUSTRY_SUGGESTIONS}
              error={err.current_industry}
              placeholder="IT Services & Consulting"
              paperSx={{ '& .MuiAutocomplete-listbox': { '&::-webkit-scrollbar': { display: 'none' }, scrollbarWidth: 'none' } }}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <ComboInput
              label="Department"
              value={form.department}
              onChange={(v) => setField('department', v)}
              options={DEPARTMENT_SUGGESTIONS}
              error={err.department}
              placeholder="Engineering - Software"
              paperSx={{ '& .MuiAutocomplete-listbox': { '&::-webkit-scrollbar': { display: 'none' }, scrollbarWidth: 'none' } }}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <TextInput
              label="Role category"
              value={form.role_category}
              onChange={(v) => setField('role_category', v)}
              error={err.role_category}
              maxLength={CAREER_FIELD_LIMITS.role_category}
              placeholder="Software Development"
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <TextInput
              label="Job role"
              value={form.job_role}
              onChange={(v) => setField('job_role', v)}
              error={err.job_role}
              maxLength={CAREER_FIELD_LIMITS.job_role}
              placeholder="Backend Developer"
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <ChipSelect
              label="Job type"
              options={DESIRED_JOB_TYPES}
              selected={form.desired_job_type}
              onToggle={(v) => setField('desired_job_type', [v])}
              error={err.desired_job_type}
              helper="Choose one."
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <ChipSelect
              label="Employment type"
              options={DESIRED_EMPLOYMENT_TYPES}
              selected={form.desired_employment_type}
              onToggle={(v) => setField('desired_employment_type', [v])}
              error={err.desired_employment_type}
              helper="Choose one."
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <SelectInput
              label="Preferred shift"
              value={form.preferred_shift}
              onChange={(v) => setField('preferred_shift', v)}
              options={PREFERRED_SHIFTS}
              error={err.preferred_shift}
              placeholder="No preference"
            />
          </Grid>

          <Grid size={{ xs: 4, sm: 2 }}>
            <SelectInput
              label="Currency"
              value={form.salary_currency}
              onChange={(v) => setField('salary_currency', v)}
              options={CURRENCIES}
            />
          </Grid>

          <Grid size={{ xs: 8, sm: 4 }}>
            <TextInput
              label="Expected salary"
              value={form.expected_salary}
              onChange={(v) => setField('expected_salary', v)}
              error={err.expected_salary}
              type="number"
              helper="Per year"
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Autocomplete
              multiple
              freeSolo
              size="small"
              options={LOCATION_SUGGESTIONS}
              value={form.preferred_work_location}
              onChange={(_, next) => setField('preferred_work_location', next)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Preferred work locations"
                  error={Boolean(err.preferred_work_location)}
                  helperText={
                    err.preferred_work_location ||
                    `Up to ${MAX_PREFERRED_LOCATIONS}. ${editor.locationsRemaining} remaining.`
                  }
                  placeholder={
                    form.preferred_work_location.length ? '' : 'Hyderabad, Bengaluru…'
                  }
                 sx={{
                    '& .MuiOutlinedInput-root': {
                      fontFamily: FONTS.body,
                      fontSize: '0.875rem',
                      '& fieldset': { borderColor: PALETTE.border },
                      '&.Mui-focused fieldset': { borderColor: PALETTE.sage || '#7F9E7E' },
                    },
                    '& .MuiInputLabel-root': {
                      fontFamily: FONTS.body, fontSize: '0.875rem',
                      '&.Mui-focused': { color: PALETTE.sage || '#7F9E7E' },
                    },
                    '& .MuiFormHelperText-root': {
                      fontFamily: FONTS.body, fontSize: '0.75rem', marginLeft: 0,
                    } }}
                />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => {
                  const { key, ...tagProps } = getTagProps({ index });
                  return (
                    <Chip
                      key={key}
                      label={option}
                      size="small"
                      {...tagProps}
                     sx={{
                        fontFamily: FONTS.body, fontSize: '0.75rem',
                        bgcolor: PALETTE.sageTint || 'rgba(127,158,126,0.1)',
                        border: `1px solid ${PALETTE.sage || '#7F9E7E'}` }}
                    />
                  );
                })
              }
              slotProps={{
                paper: {
                  sx: {
                    fontFamily: FONTS.body,
                    fontSize: '0.875rem',
                    border: `1px solid ${PALETTE.border}`,
                    '& .MuiAutocomplete-listbox': {
                      '&::-webkit-scrollbar': { display: 'none' },
                      scrollbarWidth: 'none',
                      msOverflowStyle: 'none',
                    },
                  },
                } }}
            />
          </Grid>
        </Grid>
        </Box>
      </FormDialog>

      <ConfirmDialog
        open={editor.confirmClear}
        onClose={() => editor.setConfirmClear(false)}
        onConfirm={editor.clear}
        busy={editor.clearing}
        title="Clear your career preferences?"
        message="This removes all of them from your profile. You can set them again at any time."
        confirmLabel="Clear"
      />
    </>
  );
}