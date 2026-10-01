

import React, { useState, useCallback, useRef } from 'react';
import {
  Grid, Box, Stack, Link, Typography, Chip, FormControlLabel, Checkbox,
  Popover, IconButton,
} from '@mui/material';
import LaunchOutlined from '@mui/icons-material/LaunchOutlined';
import VerifiedOutlined from '@mui/icons-material/VerifiedOutlined';
import CalendarMonthOutlined from '@mui/icons-material/CalendarMonthOutlined';
import ChevronLeftOutlined from '@mui/icons-material/ChevronLeftOutlined';
import ChevronRightOutlined from '@mui/icons-material/ChevronRightOutlined';

import {
  SectionCard, EntryRow, EmptyState, FormDialog, ConfirmDialog,
  TextInput, SelectInput,
} from '../parts';

import useAccomplishmentEditor from '@/hooks/jobseeker/useAccomplishmentEditor';

import {
  ACCOMPLISHMENT_TYPES,
  ACCOMPLISHMENT_TYPE_OPTIONS,
  ACCOMPLISHMENT_TYPE_LABELS,
  ACCOMPLISHMENT_FIELD_LIMITS,
  PATENT_STATUS,
  monthLabel,
  PALETTE,
  FONTS,
} from '@/constants/profileConstants';

const T = ACCOMPLISHMENT_TYPES;

/* ── Year picker: 4-column decade grid with nav ──────────────────────── */

const CURRENT_YEAR = new Date().getFullYear();
const DP_A = {
  sage:     PALETTE.sage     || '#7F9E7E',
  sageTint: PALETTE.sageTint || 'rgba(127,158,126,0.1)',
  charcoal: PALETTE.charcoal || '#273238',
};

function YearPickerGrid({ label, value, onChange, error, disabled }) {
  const anchorRef = useRef(null);
  const [open, setOpen] = useState(false);
  const selYear = value ? Number(value) : null;
  const [decadeStart, setDecadeStart] = useState(() => {
    const y = selYear || CURRENT_YEAR;
    return y - (y % 10);
  });

  const handleOpen = useCallback(() => {
    if (disabled) return;
    const y = selYear || CURRENT_YEAR;
    setDecadeStart(y - (y % 10));
    setOpen(true);
  }, [selYear, disabled]);

  const isAtCurrentDecade = decadeStart + 9 >= CURRENT_YEAR;

  const years = Array.from({ length: 10 }, (_, i) => decadeStart + i);

  return (
    <Box>
      <Typography sx={{ fontFamily: FONTS.body, fontSize: '0.75rem', color: PALETTE.charcoal || '#273238', fontWeight: 500, mb: 0.5 }}>
        {label}
      </Typography>
      <Box
        ref={anchorRef}
        onClick={handleOpen}
        sx={{
          display: 'inline-flex', alignItems: 'center', gap: 1,
          border: `1px solid ${error ? PALETTE.danger : PALETTE.border}`,
          borderRadius: 2, px: 1.5, py: 0.875, cursor: disabled ? 'default' : 'pointer',
          minWidth: 140, bgcolor: PALETTE.surface,
          opacity: disabled ? 0.5 : 1,
          '&:hover': disabled ? {} : { borderColor: DP_A.sage },
        }}
      >
        <CalendarMonthOutlined sx={{ fontSize: 18, color: DP_A.sage }} />
        <Typography sx={{
          fontFamily: FONTS.body, fontSize: '0.875rem', flex: 1,
          color: selYear ? DP_A.charcoal : PALETTE.muted,
        }}>
          {selYear || 'Year'}
        </Typography>
      </Box>
      {error && (
        <Typography sx={{ fontFamily: FONTS.body, fontSize: '0.75rem', color: PALETTE.danger, mt: 0.5 }}>
          {error}
        </Typography>
      )}

      <Popover
        open={open}
        anchorEl={anchorRef.current}
        onClose={() => setOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: {
          sx: { borderRadius: 3, mt: 0.5, p: 2, minWidth: 260, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' },
        }}}
      >
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <IconButton onClick={() => setDecadeStart((d) => d - 10)} size="small">
            <ChevronLeftOutlined sx={{ fontSize: 20, color: DP_A.charcoal }} />
          </IconButton>
          <Typography sx={{ fontFamily: FONTS.body, fontSize: '0.875rem', fontWeight: 500, color: DP_A.charcoal }}>
            {decadeStart} – {decadeStart + 9}
          </Typography>
          <IconButton
            onClick={() => { if (!isAtCurrentDecade) setDecadeStart((d) => d + 10); }}
            size="small"
            disabled={isAtCurrentDecade}
          >
            <ChevronRightOutlined sx={{ fontSize: 20, color: isAtCurrentDecade ? PALETTE.muted : DP_A.charcoal }} />
          </IconButton>
        </Stack>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
          {years.map((yr) => {
            const sel = yr === selYear;
            const future = yr > CURRENT_YEAR;
            return (
              <Box
                key={yr}
                onClick={future ? undefined : () => { onChange(String(yr)); setOpen(false); }}
                sx={{
                  py: 1, borderRadius: 2, textAlign: 'center',
                  cursor: future ? 'not-allowed' : 'pointer',
                  fontFamily: FONTS.body, fontSize: '0.8125rem',
                  fontWeight: sel ? 600 : 400,
                  opacity: future ? 0.35 : 1,
                  color: sel ? '#fff' : DP_A.charcoal,
                  bgcolor: sel ? DP_A.sage : 'transparent',
                  '&:hover': future ? {} : { bgcolor: sel ? DP_A.sage : DP_A.sageTint },
                  transition: 'background-color 0.15s',
                }}
              >
                {yr}
              </Box>
            );
          })}
        </Box>
      </Popover>
    </Box>
  );
}

/* ── CertDatePicker: full date (ISO yyyy-mm-dd) for certification dates ── */

const WEEKDAYS_A = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function CertDatePicker({ label, value, onChange, error, disabled }) {
  const anchorRef = useRef(null);
  const [open, setOpen] = useState(false);

  const parsed = value ? new Date(String(value).slice(0, 10) + 'T00:00:00') : null;
  const selDay   = parsed && !isNaN(parsed) ? parsed.getDate()     : null;
  const selMonth = parsed && !isNaN(parsed) ? parsed.getMonth()    : null;
  const selYear  = parsed && !isNaN(parsed) ? parsed.getFullYear() : null;

  const [viewMonth, setViewMonth] = useState(() => selMonth ?? new Date().getMonth());
  const [viewYear,  setViewYear]  = useState(() => selYear  ?? CURRENT_YEAR);

  const handleOpen = useCallback(() => {
    if (disabled) return;
    setViewMonth(selMonth ?? new Date().getMonth());
    setViewYear(selYear ?? CURRENT_YEAR);
    setOpen(true);
  }, [selMonth, selYear, disabled]);

  const prevMonth = useCallback(() => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  }, [viewMonth, viewYear]);

  const nextMonth = useCallback(() => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  }, [viewMonth, viewYear]);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDow    = new Date(viewYear, viewMonth, 1).getDay();

  const selectDay = useCallback((d) => {
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    onChange(`${viewYear}-${mm}-${dd}`);
    setOpen(false);
  }, [viewMonth, viewYear, onChange]);

  const displayText = (selDay && selMonth !== null && selYear)
    ? `${selDay} ${MONTH_SHORT_A[selMonth]} ${selYear}`
    : '';

  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isSelected = (d) => d === selDay && viewMonth === selMonth && viewYear === selYear;

  return (
    <Box>
      <Typography sx={{ fontFamily: FONTS.body, fontSize: '0.75rem', color: PALETTE.charcoal || '#273238', fontWeight: 500, mb: 0.5 }}>
        {label}
      </Typography>
      <Box
        ref={anchorRef}
        onClick={handleOpen}
        sx={{
          display: 'inline-flex', alignItems: 'center', gap: 1,
          border: `1px solid ${error ? PALETTE.danger : PALETTE.border}`,
          borderRadius: 2, px: 1.5, py: 0.875, cursor: disabled ? 'default' : 'pointer',
          minWidth: 180, bgcolor: PALETTE.surface,
          opacity: disabled ? 0.5 : 1,
          '&:hover': disabled ? {} : { borderColor: DP_A.sage },
        }}
      >
        <CalendarMonthOutlined sx={{ fontSize: 18, color: DP_A.sage }} />
        <Typography sx={{
          fontFamily: FONTS.body, fontSize: '0.875rem', flex: 1,
          color: displayText ? DP_A.charcoal : PALETTE.muted,
        }}>
          {displayText || 'Select date'}
        </Typography>
      </Box>
      {error && (
        <Typography sx={{ fontFamily: FONTS.body, fontSize: '0.75rem', color: PALETTE.danger, mt: 0.5 }}>
          {error}
        </Typography>
      )}

      <Popover
        open={open}
        anchorEl={anchorRef.current}
        onClose={() => setOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: {
          sx: { borderRadius: 3, mt: 0.5, p: 2, minWidth: 300, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' },
        }}}
      >
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <IconButton onClick={prevMonth} size="small">
            <ChevronLeftOutlined sx={{ fontSize: 20, color: DP_A.charcoal }} />
          </IconButton>
          <Typography sx={{ fontFamily: FONTS.body, fontSize: '0.9375rem', fontWeight: 500, color: DP_A.charcoal }}>
            {MONTH_SHORT_A[viewMonth]} {viewYear}
          </Typography>
          <IconButton onClick={nextMonth} size="small">
            <ChevronRightOutlined sx={{ fontSize: 20, color: DP_A.charcoal }} />
          </IconButton>
        </Stack>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', mb: 0.5 }}>
          {WEEKDAYS_A.map((wd) => (
            <Typography key={wd} sx={{
              fontFamily: FONTS.body, fontSize: '0.75rem', color: PALETTE.muted,
              textAlign: 'center', py: 0.25, fontWeight: 500,
            }}>
              {wd}
            </Typography>
          ))}
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
          {cells.map((d, i) => {
            if (d === null) return <Box key={`e-${i}`} />;
            const sel = isSelected(d);
            return (
              <Box
                key={d}
                onClick={() => selectDay(d)}
                sx={{
                  width: 36, height: 36, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', borderRadius: '50%', cursor: 'pointer',
                  mx: 'auto',
                  fontFamily: FONTS.body, fontSize: '0.8125rem',
                  fontWeight: sel ? 600 : 400,
                  color: sel ? '#fff' : DP_A.charcoal,
                  bgcolor: sel ? DP_A.sage : 'transparent',
                  '&:hover': { bgcolor: sel ? DP_A.sage : DP_A.sageTint },
                  transition: 'background-color 0.15s',
                }}
              >
                {d}
              </Box>
            );
          })}
        </Box>
      </Popover>
    </Box>
  );
}

/* ── Row copy ──────────────────────────────────────────────────────────── */

const MONTH_SHORT_A = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function MonthPickerGrid({ label, value, onChange, error, disabled, yearValue }) {
  const anchorRef = useRef(null);
  const [open, setOpen] = useState(false);
  const selMonth = value ? Number(value) : null;

  const handleOpen = useCallback(() => {
    if (disabled) return;
    setOpen(true);
  }, [disabled]);

  const currentYear  = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const selectedYear = yearValue ? Number(yearValue) : null;

  return (
    <Box>
      <Typography sx={{ fontFamily: FONTS.body, fontSize: '0.75rem', color: PALETTE.charcoal || '#273238', fontWeight: 500, mb: 0.5 }}>
        {label}
      </Typography>
      <Box
        ref={anchorRef}
        onClick={handleOpen}
        sx={{
          display: 'inline-flex', alignItems: 'center', gap: 1,
          border: `1px solid ${error ? PALETTE.danger : PALETTE.border}`,
          borderRadius: 2, px: 1.5, py: 0.875, cursor: disabled ? 'default' : 'pointer',
          minWidth: 130, bgcolor: PALETTE.surface,
          opacity: disabled ? 0.5 : 1,
          '&:hover': disabled ? {} : { borderColor: DP_A.sage },
        }}
      >
        <CalendarMonthOutlined sx={{ fontSize: 18, color: DP_A.sage }} />
        <Typography sx={{
          fontFamily: FONTS.body, fontSize: '0.875rem', flex: 1,
          color: selMonth ? DP_A.charcoal : PALETTE.muted,
        }}>
          {selMonth ? MONTH_SHORT_A[selMonth - 1] : 'Month'}
        </Typography>
      </Box>
      {error && (
        <Typography sx={{ fontFamily: FONTS.body, fontSize: '0.75rem', color: PALETTE.danger, mt: 0.5 }}>
          {error}
        </Typography>
      )}

      <Popover
        open={open}
        anchorEl={anchorRef.current}
        onClose={() => setOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: {
          sx: { borderRadius: 3, mt: 0.5, p: 2, minWidth: 260, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' },
        }}}
      >
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
          {MONTH_SHORT_A.map((m, idx) => {
            const sel = (idx + 1) === selMonth;
            const future = selectedYear === currentYear && idx > currentMonth;
            return (
              <Box
                key={m}
                onClick={future ? undefined : () => { onChange(String(idx + 1)); setOpen(false); }}
                sx={{
                  py: 1, borderRadius: 2, textAlign: 'center',
                  cursor: future ? 'not-allowed' : 'pointer',
                  fontFamily: FONTS.body, fontSize: '0.8125rem',
                  fontWeight: sel ? 600 : 400,
                  opacity: future ? 0.35 : 1,
                  color: sel ? '#fff' : DP_A.charcoal,
                  bgcolor: sel ? DP_A.sage : 'transparent',
                  '&:hover': future ? {} : { bgcolor: sel ? DP_A.sage : DP_A.sageTint },
                  transition: 'background-color 0.15s',
                }}
              >
                {m}
              </Box>
            );
          })}
        </Box>
      </Popover>
    </Box>
  );
}

function period(fromYear, fromMonth, toYear, toMonth, ongoing, ongoingLabel) {
  if (!fromYear && !toYear) return '';
  const start = fromYear
    ? `${fromMonth ? `${monthLabel(fromMonth)} ` : ''}${fromYear}`
    : '';
  if (ongoing) return start ? `${start} – ${ongoingLabel}` : ongoingLabel;
  const end = toYear ? `${toMonth ? `${monthLabel(toMonth)} ` : ''}${toYear}` : '';
  return [start, end].filter(Boolean).join(' – ');
}

function describe(entry) {
  const kind = entry.accomplishment_type;

  if (kind === T.CERTIFICATION) {
    const _from = entry.validity_from_date ? String(entry.validity_from_date).slice(0, 10) : '';
    const _to = entry.validity_to_date ? String(entry.validity_to_date).slice(0, 10) : '';
    return {
      primary: entry.certification_name || 'Certification',
      secondary: entry.issuing_organisation || '',
      tertiary: entry.does_not_expire
        ? (_from ? `${_from} – no expiry` : 'no expiry')
        : [_from, _to].filter(Boolean).join(' – '),
      link: entry.certification_url,
      linkLabel: 'Certificate',
    };
  }

  if (kind === T.ONLINE_PROFILE) {
    return {
      primary: entry.social_profile || 'Online profile',
      secondary: entry.description,
      tertiary: '',
      link: entry.url,
      linkLabel: 'Visit',
    };
  }

  if (kind === T.WORK_SAMPLE) {
    return {
      primary: entry.title,
      secondary: entry.description,
      tertiary: period(entry.duration_from_year, entry.duration_from_month,
        entry.duration_to_year, entry.duration_to_month,
        entry.currently_working, 'ongoing'),
      link: entry.url,
      linkLabel: 'View',
    };
  }

  if (kind === T.WHITE_PAPER) {
    return {
      primary: entry.title,
      secondary: entry.description,
      tertiary: entry.published_on_year
        ? `Published ${entry.published_on_month ? `${monthLabel(entry.published_on_month)} ` : ''}${entry.published_on_year}`
        : '',
      link: entry.url,
      linkLabel: 'Read',
    };
  }

  if (kind === T.PATENT) {
    return {
      primary: entry.title,
      secondary: [entry.patent_office, entry.application_number].filter(Boolean).join(' · '),
      tertiary: [
        entry.patent_status,
        entry.issue_date_year &&
          `Issued ${entry.issue_date_month ? `${monthLabel(entry.issue_date_month)} ` : ''}${entry.issue_date_year}`,
      ].filter(Boolean).join(' · '),
      link: entry.url,
      linkLabel: 'View',
    };
  }

  return {
    primary: entry.title,
    secondary: entry.description,
    tertiary: '',
    link: entry.url,
    linkLabel: 'View',
  };
}


/* ── Shared shell ──────────────────────────────────────────────────────── */

function AccomplishmentTab({
  id, variant, candidateId, accomplishments, loading, onRefresh,
  title, description, emptyMessage, addLabel, dateOfBirth, addFilled = false,
  hideEmptyAction = false,
}) {
  const editor = useAccomplishmentEditor({
    variant, candidateId, items: accomplishments, onSaved: onRefresh, dateOfBirth,
  });

  const { form, fieldErrors: err, setField, shows } = editor;
  const chosen = form.accomplishment_type;

  return (
    <>
      <SectionCard
        id={id}
        title={title}
        description={description}
        complete={editor.sorted.length > 0}
        loading={loading}
        onAdd={editor.atLimit ? undefined : editor.openCreate}
        addLabel={addLabel}
        addFilled={addFilled}
        titleColor={PALETTE.charcoal || '#273238'}
        accentColor={PALETTE.sage || '#7F9E7E'}
      >
        {editor.sorted.length === 0 ? (
          <EmptyState
            message={emptyMessage}
            {...(hideEmptyAction ? {} : { actionLabel: addLabel, onAction: editor.openCreate })}
            accentColor={PALETTE.sage || '#7F9E7E'}
          />
        ) : (
          <Box>
            {editor.sorted.map((entry, index) => {
              const view = describe(entry);
              return (
                <EntryRow
                  key={entry.accomplishment_id}
                  primary={
                    <Stack direction="row" gap={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                      <span>{view.primary}</span>
                      {entry.accomplishment_type === T.CERTIFICATION &&
                        entry.does_not_expire && (
                          <Chip
                            icon={<VerifiedOutlined sx={{ fontSize: 13 }} />}
                            label="No expiry"
                            size="small"
                           sx={{
                              height: 20, fontSize: '0.6875rem',
                              fontFamily: FONTS.body, fontWeight: 600,
                              bgcolor: `${PALETTE.success}14`,
                              color: PALETTE.success,
                              border: `1px solid ${PALETTE.success}33` }}
                          />
                        )}
                      {variant !== 'certifications' && (
                        <Chip
                          label={ACCOMPLISHMENT_TYPE_LABELS[entry.accomplishment_type]}
                          size="small"
                         sx={{
                            height: 20, fontSize: '0.6875rem', fontFamily: FONTS.body,
                            bgcolor: PALETTE.offWhite,
                            border: `1px solid ${PALETTE.border}`,
                            color: PALETTE.muted }}
                        />
                      )}
                    </Stack>
                  }
                  secondary={view.secondary}
                  tertiary={
                    <Stack
                      direction="row"
                      gap={1.5}
                      component="span" sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                      {view.tertiary && <span>{view.tertiary}</span>}
                      {view.link && (
                        <Link
                          href={view.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                         sx={{
                            display: 'inline-flex', alignItems: 'center', gap: 0.25,
                            fontFamily: FONTS.body, fontSize: '0.8125rem',
                            color: PALETTE.sage || '#7F9E7E', textDecoration: 'none',
                            '&:hover': { textDecoration: 'underline' } }}
                        >
                          <LaunchOutlined sx={{ fontSize: 14 }} /> {view.linkLabel}
                        </Link>
                      )}
                    </Stack>
                  }
                  onEdit={() => editor.openEdit(entry)}
                  onDelete={() => editor.setPendingDelete(entry)}
                  last={index === editor.sorted.length - 1}
                />
              );
            })}
          </Box>
        )}
      </SectionCard>

      <FormDialog
        open={editor.open}
        onClose={editor.close}
        title={editor.isEditing ? 'Edit entry' : addLabel}
        subtitle={
          editor.isEditing
            ? 'The type cannot be changed. Delete this entry to add a different kind.'
            : undefined
        }
        onSubmit={editor.save}
        submitLabel={editor.isEditing ? 'Save changes' : 'Add'}
        saving={editor.saving}
        formError={editor.formError}
        maxWidth="sm"
        submitColor={PALETTE.sage || '#7F9E7E'}
        titleColor={PALETTE.charcoal || '#273238'}
        hideScrollbar
      >
        <Box sx={{
          '& .MuiOutlinedInput-root.Mui-focused fieldset': {
            borderColor: `${PALETTE.sage || '#7F9E7E'} !important`,
            borderWidth: '1.5px !important',
          },
          '& .MuiInputLabel-root': {
            color: `${PALETTE.charcoal || '#273238'} !important`,
          },
          '& .MuiInputLabel-root.Mui-focused': {
            color: `${PALETTE.sage || '#7F9E7E'} !important`,
          },
          '& .MuiSelect-root:focus': {
            borderColor: `${PALETTE.sage || '#7F9E7E'} !important`,
          },
          '& .MuiFormLabel-root': {
            color: `${PALETTE.charcoal || '#273238'} !important`,
          },
          '& .MuiFormLabel-root.Mui-focused': {
            color: `${PALETTE.sage || '#7F9E7E'} !important`,
          },
        }}>
        <Grid container spacing={3} sx={{ pt: 1 }}>
          {!editor.isCertificationTab && (
            <Grid size={{ xs: 12 }}>
              <SelectInput
                label="What are you adding?"
                value={chosen}
                onChange={(v) => setField('accomplishment_type', v)}
                options={ACCOMPLISHMENT_TYPE_OPTIONS}
                getLabel={(o) => ACCOMPLISHMENT_TYPE_LABELS[o] || o}
                getValue={(o) => o}
                error={err.accomplishment_type}
                required
                disabled={editor.isEditing}
                placeholder={editor.isEditing ? undefined : 'Choose a type'}
              />
            </Grid>
          )}

          {shows('social_profile') && (
            <Grid size={{ xs: 12 }}>
              <TextInput
                label="Profile name"
                value={form.social_profile}
                onChange={(v) => setField('social_profile', v)}
                error={err.social_profile}
                required
                maxLength={ACCOMPLISHMENT_FIELD_LIMITS.social_profile}
                placeholder="GitHub, Behance, Stack Overflow…"
              />
            </Grid>
          )}

          {shows('title') && (
            <Grid size={{ xs: 12 }}>
              <TextInput
                label="Title"
                value={form.title}
                onChange={(v) => setField('title', v)}
                error={err.title}
                required
                maxLength={ACCOMPLISHMENT_FIELD_LIMITS.title}
              />
            </Grid>
          )}

          {shows('certification_name') && (
            <Grid size={{ xs: 12, sm: 7 }}>
              <TextInput
                label="Certification name"
                value={form.certification_name}
                onChange={(v) => setField('certification_name', v)}
                error={err.certification_name}
                required
                maxLength={ACCOMPLISHMENT_FIELD_LIMITS.certification_name}
                placeholder="AWS Solutions Architect – Associate"
              />
            </Grid>
          )}

          {shows('issuing_organisation') && (
            <Grid size={{ xs: 12, sm: 5 }}>
              <TextInput
                label="Issuing organisation"
                value={form.issuing_organisation}
                onChange={(v) => setField('issuing_organisation', v)}
                error={err.issuing_organisation}
                maxLength={ACCOMPLISHMENT_FIELD_LIMITS.issuing_organisation}
                placeholder="Amazon Web Services"
              />
            </Grid>
          )}

          {shows('patent_office') && (
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextInput
                label="Patent office"
                value={form.patent_office}
                onChange={(v) => setField('patent_office', v)}
                error={err.patent_office}
                maxLength={ACCOMPLISHMENT_FIELD_LIMITS.patent_office}
              />
            </Grid>
          )}

          {shows('patent_status') && (
            <Grid size={{ xs: 12, sm: 6 }}>
              <SelectInput
                label="Status"
                value={form.patent_status}
                onChange={(v) => setField('patent_status', v)}
                options={PATENT_STATUS}
                error={err.patent_status}
                placeholder="Select status"
              />
            </Grid>
          )}

          {shows('application_number') && (
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextInput
                label="Application number"
                value={form.application_number}
                onChange={(v) => setField('application_number', v)}
                error={err.application_number}
                maxLength={ACCOMPLISHMENT_FIELD_LIMITS.application_number}
              />
            </Grid>
          )}

          {shows('issue_date_month') && (
            <>
              <Grid size={{ xs: 6, sm: 3 }}>
                <MonthPickerGrid
                  label="Issued month"
                  value={form.issue_date_month}
                  onChange={(v) => setField('issue_date_month', v)}
                  error={err.issue_date_month}
                  yearValue={form.issue_date_year}
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <YearPickerGrid
                  label="Issued year"
                  value={form.issue_date_year}
                  onChange={(v) => setField('issue_date_year', v)}
                  error={err.issue_date_year}
                />
              </Grid>
            </>
          )}

          {shows('published_on_month') && (
            <>
              <Grid size={{ xs: 6 }}>
                <MonthPickerGrid
                  label="Published month"
                  value={form.published_on_month}
                  onChange={(v) => setField('published_on_month', v)}
                  error={err.published_on_month}
                  yearValue={form.published_on_year}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <YearPickerGrid
                  label="Published year"
                  value={form.published_on_year}
                  onChange={(v) => setField('published_on_year', v)}
                  error={err.published_on_year}
                />
              </Grid>
            </>
          )}

          {shows('currently_working') && (
            <>
              <Grid size={{ xs: 6, sm: 3 }}>
                <MonthPickerGrid
                  label="From month"
                  value={form.duration_from_month}
                  onChange={(v) => setField('duration_from_month', v)}
                  error={err.duration_from_month}
                  yearValue={form.duration_from_year}
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <YearPickerGrid
                  label="From year"
                  value={form.duration_from_year}
                  onChange={(v) => setField('duration_from_year', v)}
                  error={err.duration_from_year}
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <MonthPickerGrid
                  label="To month"
                  value={form.duration_to_month}
                  onChange={(v) => setField('duration_to_month', v)}
                  error={err.duration_to_month}
                  disabled={form.currently_working}
                  yearValue={form.duration_to_year}
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <YearPickerGrid
                  label="To year"
                  value={form.duration_to_year}
                  onChange={(v) => setField('duration_to_year', v)}
                  error={err.duration_to_year}
                  disabled={form.currently_working}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={Boolean(form.currently_working)}
                      onChange={(e) => setField('currently_working', e.target.checked)}
                      size="small"
                     sx={{ color: PALETTE.border, '&.Mui-checked': { color: PALETTE.sage || '#7F9E7E' } }}
                    />
                  }
                  label={
                    <Typography sx={{ fontFamily: FONTS.body, fontSize: '0.875rem' }}>
                      I am still working on this
                    </Typography>
                  }
                />
              </Grid>
            </>
          )}

          {shows('does_not_expire') && (
            <>
              <Grid size={{ xs: 12, sm: 6 }}>
                <CertDatePicker
                  label="Completion date"
                  value={form.validity_from_date}
                  onChange={(v) => setField('validity_from_date', v)}
                  error={err.validity_from_date}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <CertDatePicker
                  label="Expiry date"
                  value={form.validity_to_date}
                  onChange={(v) => setField('validity_to_date', v)}
                  error={err.validity_to_date}
                  disabled={form.does_not_expire}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={Boolean(form.does_not_expire)}
                      onChange={(e) => setField('does_not_expire', e.target.checked)}
                      size="small"
                     sx={{ color: PALETTE.border, '&.Mui-checked': { color: PALETTE.sage || '#7F9E7E' } }}
                    />
                  }
                  label={
                    <Typography sx={{ fontFamily: FONTS.body, fontSize: '0.875rem' }}>
                      This certification does not expire
                    </Typography>
                  }
                />
              </Grid>
            </>
          )}

          {shows('certification_url') && (
            <Grid size={{ xs: 12 }}>
              <TextInput
                label="Certificate URL"
                value={form.certification_url}
                onChange={(v) => setField('certification_url', v)}
                error={err.certification_url}
                placeholder="https://coursera.org/verify/ABC123"
                helper="Include https://"
              />
            </Grid>
          )}

          {shows('url') && (
            <Grid size={{ xs: 12 }}>
              <TextInput
                label="URL"
                value={form.url}
                onChange={(v) => setField('url', v)}
                error={err.url}
                placeholder="https://…"
                helper="Optional. Include https://"
              />
            </Grid>
          )}

          {shows('description') && (
            <Grid size={{ xs: 12 }}>
              <TextInput
                label="Description"
                value={form.description}
                onChange={(v) => setField('description', v)}
                error={err.description}
                multiline
                rows={3}
                maxLength={ACCOMPLISHMENT_FIELD_LIMITS.description}
                placeholder="Optional"
              />
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
        title="Remove this entry?"
        message="This permanently removes it from your profile."
        confirmLabel="Remove"
      />
    </>
  );
}

/* ── Public sections ───────────────────────────────────────────────────── */

export function CertificationsSection(props) {
  return (
    <AccomplishmentTab
      {...props}
      id="certifications"
      variant="certifications"
      title="Certifications"
      description="Credentials you have earned. A verification link makes them checkable."
      emptyMessage="No certifications yet. Add any credential a recruiter could verify."
      addLabel="Add certification"
      addFilled
      hideEmptyAction
    />
  );
}

export function AccomplishmentsSection(props) {
  return (
    <AccomplishmentTab
      {...props}
      id="accomplishments"
      variant="accomplishments"
      title="Accomplishments"
      description="Work samples, publications, patents, talks and profiles worth pointing at."
      emptyMessage="Nothing here yet. Add a work sample, publication, patent or talk."
      addLabel="Add accomplishment"
      addFilled
      hideEmptyAction
    />
  );
}

export default AccomplishmentTab;