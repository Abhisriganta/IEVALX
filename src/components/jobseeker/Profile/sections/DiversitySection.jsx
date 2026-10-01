

import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  Grid, Box, Stack, Chip, Typography, Button, Divider, Popover,
  IconButton,
} from '@mui/material';
import EditOutlined from '@mui/icons-material/EditOutlined';
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined';
import CheckCircleOutlineOutlined from '@mui/icons-material/CheckCircleOutlineOutlined';
import CalendarMonthOutlined from '@mui/icons-material/CalendarMonthOutlined';
import ChevronLeftOutlined from '@mui/icons-material/ChevronLeftOutlined';
import ChevronRightOutlined from '@mui/icons-material/ChevronRightOutlined';
import CloudUploadOutlined from '@mui/icons-material/CloudUploadOutlined';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';

import {
  SectionCard, EmptyState, FormDialog, ConfirmDialog,
  TextInput, SelectInput, ComboInput,
} from '../parts';

import useDiversityEditor from '@/hooks/jobseeker/useDiversityEditor';

import {
  DISABILITY_STATUS,
  DISABILITY_TYPE_SUGGESTIONS,
  DISABILITY_REASON_SUGGESTIONS,
  CERTIFICATE_TYPES,
  MILITARY_STATUS,
  CAREER_BREAK_STATUS,
  BREAK_REASONS,
  DIVERSITY_FIELD_LIMITS,
  DIVERSITY_MAX_DOC_SIZE,
  DIVERSITY_ACCEPT_ATTRIBUTE,
  monthLabel,
  PALETTE,
  FONTS,
} from '@/constants/profileConstants';

// ── Diversity-specific palette ──────────────────────────────────────────
const DP = {
  sage:      PALETTE.sage      || '#7F9E7E',
  sageTint:  PALETTE.sageTint  || 'rgba(127,158,126,0.1)',
  charcoal:  PALETTE.charcoal  || '#273238',
  skin:      PALETTE.skin      || '#F2BC9A',
  offWhite:  PALETTE.offWhite2 || '#F7F7F7',
};

// ── Year options ───────────────────────────────────────────────────────────
const CURRENT_YEAR = new Date().getFullYear();
const YEARS_FROM_1960 = Array.from(
  { length: CURRENT_YEAR - 1960 + 1 },
  (_, i) => CURRENT_YEAR - i,
);

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const MONTH_SHORT = [
  'Jan','Feb','Mar','Apr','May','Jun',
  'Jul','Aug','Sep','Oct','Nov','Dec',
];

// ── Read-only display helpers ──────────────────────────────────────────────

function formatMonthYear(month, year) {
  if (!month && !year) return '';
  const m = month ? monthLabel(Number(month)) : '';
  return [m, year].filter(Boolean).join(' ');
}

function formatDayMonthYear(day, month, year) {
  if (!day && !month && !year) return '';
  const m = month ? monthLabel(Number(month)) : '';
  return [day, m, year].filter(Boolean).join(' ');
}

function DetailRow({ label, value }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <Grid size={{ xs: 12, sm: 6 }}>
      <Typography sx={{ fontFamily: FONTS.body, fontSize: '0.75rem', color: PALETTE.muted }}>
        {label}
      </Typography>
      <Typography
       sx={{
          fontFamily: FONTS.body, fontSize: '0.875rem',
          color: DP.charcoal, fontWeight: 500, mt: 0.25 }}
      >
        {value}
      </Typography>
    </Grid>
  );
}

// ── Chip selector ───────────────────────────────────────────────────────

function ChipSelect({ options, value, onChange }) {
  return (
    <Stack direction="row" gap={1} sx={{ flexWrap: 'wrap' }}>
      {options.map((opt) => {
        const selected = value === opt;
        return (
          <Chip
            key={opt}
            label={opt}
            icon={selected ? <CheckCircleOutlineOutlined sx={{ fontSize: 16 }} /> : undefined}
            onClick={() => onChange(opt)}
            sx={{
              fontFamily: FONTS.body,
              fontSize: '0.8125rem',
              fontWeight: selected ? 600 : 400,
              height: 36, px: 0.5, borderRadius: '20px',
              border: `1.5px solid ${selected ? DP.sage : PALETTE.border}`,
              bgcolor: selected ? DP.sageTint : 'transparent',
              color: selected ? DP.sage : DP.charcoal,
              cursor: 'pointer',
              '& .MuiChip-icon': { color: DP.sage },
              '&:hover': {
                bgcolor: selected ? DP.sageTint : DP.offWhite,
                borderColor: selected ? DP.sage : PALETTE.muted,
              },
            }}
          />
        );
      })}
    </Stack>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CalendarPicker — full date (day + month + year) in one calendar popup
// ═══════════════════════════════════════════════════════════════════════════

function CalendarPicker({ label, day, month, year, onChangeDay, onChangeMonth, onChangeYear, error }) {
  const anchorRef = useRef(null);
  const [open, setOpen] = useState(false);

  const selDay   = day   ? Number(day)   : null;
  const selMonth = month ? Number(month) : null;
  const selYear  = year  ? Number(year)  : null;

  const [viewMonth, setViewMonth] = useState(() => (selMonth || new Date().getMonth() + 1) - 1);
  const [viewYear,  setViewYear]  = useState(() => selYear  || CURRENT_YEAR);

  const handleOpen = useCallback(() => {
    setViewMonth((selMonth || new Date().getMonth() + 1) - 1);
    setViewYear(selYear || CURRENT_YEAR);
    setOpen(true);
  }, [selMonth, selYear]);

  const prevMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 0) { setViewYear((y) => y - 1); return 11; }
      return m - 1;
    });
  }, []);

  const nextMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 11) { setViewYear((y) => y + 1); return 0; }
      return m + 1;
    });
  }, []);

  const daysInMonth = useMemo(
    () => new Date(viewYear, viewMonth + 1, 0).getDate(),
    [viewYear, viewMonth],
  );
  const firstDow = useMemo(
    () => new Date(viewYear, viewMonth, 1).getDay(),
    [viewYear, viewMonth],
  );

  const selectDay = useCallback((d) => {
    onChangeDay(String(d));
    onChangeMonth(String(viewMonth + 1));
    onChangeYear(String(viewYear));
    setOpen(false);
  }, [viewMonth, viewYear, onChangeDay, onChangeMonth, onChangeYear]);

  const displayText = (selDay && selMonth && selYear)
    ? `${selDay} ${MONTH_SHORT[(selMonth || 1) - 1]} ${selYear}`
    : '';

  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isSelected = (d) =>
    d === selDay && viewMonth === (selMonth || 0) - 1 && viewYear === selYear;

  const isFuture = (d) => {
    const now = new Date();
    const viewDate = new Date(viewYear, viewMonth, d);
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return viewDate > todayMidnight;
  };

  return (
    <Box>
      <Typography sx={{ fontFamily: FONTS.body, fontSize: '0.75rem', color: PALETTE.muted, mb: 0.5 }}>
        {label}
      </Typography>
      <Box
        ref={anchorRef}
        onClick={handleOpen}
        sx={{
          display: 'inline-flex', alignItems: 'center', gap: 1,
          border: `1px solid ${error ? PALETTE.danger : PALETTE.border}`,
          borderRadius: 2, px: 1.5, py: 0.875, cursor: 'pointer',
          minWidth: 180, bgcolor: PALETTE.surface,
          '&:hover': { borderColor: DP.sage },
        }}
      >
        <CalendarMonthOutlined sx={{ fontSize: 18, color: DP.sage }} />
        <Typography sx={{
          fontFamily: FONTS.body, fontSize: '0.875rem', flex: 1,
          color: displayText ? DP.charcoal : PALETTE.muted,
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
        {/* Month/Year header with nav arrows */}
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <IconButton onClick={prevMonth} size="small">
            <ChevronLeftOutlined sx={{ fontSize: 20, color: DP.charcoal }} />
          </IconButton>
          <Typography sx={{ fontFamily: FONTS.body, fontSize: '0.9375rem', fontWeight: 600, color: DP.charcoal }}>
            {MONTH_NAMES[viewMonth]} {viewYear}
          </Typography>
          <IconButton onClick={nextMonth} size="small">
            <ChevronRightOutlined sx={{ fontSize: 20, color: DP.charcoal }} />
          </IconButton>
        </Stack>

        {/* Weekday headers */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', mb: 0.5 }}>
          {WEEKDAYS.map((wd) => (
            <Typography key={wd} sx={{
              fontFamily: FONTS.body, fontSize: '0.75rem', color: PALETTE.muted,
              textAlign: 'center', py: 0.25, fontWeight: 500,
            }}>
              {wd}
            </Typography>
          ))}
        </Box>

        {/* Day grid */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
          {cells.map((d, i) => {
            if (d === null) return <Box key={`e-${i}`} />;
            const sel = isSelected(d);
            const future = isFuture(d);
            return (
              <Box
                key={d}
                onClick={future ? undefined : () => selectDay(d)}
                sx={{
                  width: 36, height: 36, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', borderRadius: '50%',
                  cursor: future ? 'not-allowed' : 'pointer',
                  mx: 'auto',
                  fontFamily: FONTS.body, fontSize: '0.8125rem',
                  fontWeight: sel ? 600 : 400,
                  opacity: future ? 0.35 : 1,
                  color: sel ? '#fff' : DP.charcoal,
                  bgcolor: sel ? DP.sage : 'transparent',
                  '&:hover': future ? {} : { bgcolor: sel ? DP.sage : DP.sageTint },
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

// ═══════════════════════════════════════════════════════════════════════════
// MonthYearPicker — month + year in a grid popup (no day)
// ═══════════════════════════════════════════════════════════════════════════

function MonthYearPicker({ label, month, year, onChangeMonth, onChangeYear, error }) {
  const anchorRef = useRef(null);
  const [open, setOpen] = useState(false);

  const selMonth = month ? Number(month) : null;
  const selYear  = year  ? Number(year)  : null;

  const [viewYear, setViewYear] = useState(() => selYear || CURRENT_YEAR);

  const handleOpen = useCallback(() => {
    setViewYear(selYear || CURRENT_YEAR);
    setOpen(true);
  }, [selYear]);

  const selectMonth = useCallback((m) => {
    onChangeMonth(String(m + 1));
    onChangeYear(String(viewYear));
    setOpen(false);
  }, [viewYear, onChangeMonth, onChangeYear]);

  const displayText = (selMonth && selYear)
    ? `${MONTH_SHORT[(selMonth || 1) - 1]} ${selYear}`
    : '';

  return (
    <Box>
      <Typography sx={{ fontFamily: FONTS.body, fontSize: '0.75rem', color: PALETTE.muted, mb: 0.5 }}>
        {label}
      </Typography>
      <Box
        ref={anchorRef}
        onClick={handleOpen}
        sx={{
          display: 'inline-flex', alignItems: 'center', gap: 1,
          border: `1px solid ${error ? PALETTE.danger : PALETTE.border}`,
          borderRadius: 2, px: 1.5, py: 0.875, cursor: 'pointer',
          minWidth: 160, bgcolor: PALETTE.surface,
          '&:hover': { borderColor: DP.sage },
        }}
      >
        <CalendarMonthOutlined sx={{ fontSize: 18, color: DP.sage }} />
        <Typography sx={{
          fontFamily: FONTS.body, fontSize: '0.875rem', flex: 1,
          color: displayText ? DP.charcoal : PALETTE.muted,
        }}>
          {displayText || 'Select'}
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
          sx: { borderRadius: 3, mt: 0.5, p: 2, minWidth: 280, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' },
        }}}
      >
        {/* Year nav */}
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <IconButton onClick={() => setViewYear((y) => y - 1)} size="small">
            <ChevronLeftOutlined sx={{ fontSize: 20, color: DP.charcoal }} />
          </IconButton>
          <Typography sx={{ fontFamily: FONTS.body, fontSize: '0.9375rem', fontWeight: 600, color: DP.charcoal }}>
            {viewYear}
          </Typography>
          <IconButton onClick={() => setViewYear((y) => y + 1)} size="small">
            <ChevronRightOutlined sx={{ fontSize: 20, color: DP.charcoal }} />
          </IconButton>
        </Stack>

        {/* Month grid — 4 columns × 3 rows */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
          {MONTH_SHORT.map((m, idx) => {
            const sel = (idx + 1) === selMonth && viewYear === selYear;
            const now = new Date();
            const future = viewYear > now.getFullYear() ||
              (viewYear === now.getFullYear() && idx > now.getMonth());
            return (
              <Box
                key={m}
                onClick={future ? undefined : () => selectMonth(idx)}
                sx={{
                  py: 1, borderRadius: 2, textAlign: 'center',
                  cursor: future ? 'not-allowed' : 'pointer',
                  fontFamily: FONTS.body, fontSize: '0.8125rem',
                  fontWeight: sel ? 600 : 400,
                  opacity: future ? 0.35 : 1,
                  color: sel ? '#fff' : DP.charcoal,
                  bgcolor: sel ? DP.sage : 'transparent',
                  border: `1px solid ${sel ? DP.sage : 'transparent'}`,
                  '&:hover': future ? {} : { bgcolor: sel ? DP.sage : DP.sageTint },
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

// ── Section group header ────────────────────────────────────────────────

function GroupHeader({ text }) {
  return (
    <Grid size={{ xs: 12 }}>
      <Typography
       sx={{ fontFamily: FONTS.display, fontSize: '0.9375rem', color: DP.charcoal, mt: 0.5, mb: 0.5 }}
      >
        {text}
      </Typography>
      <Divider sx={{ borderColor: PALETTE.border }} />
    </Grid>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function DiversitySection({ candidateId, diversity, loading, onRefresh, dateOfBirth }) {
  const editor = useDiversityEditor({ candidateId, diversity, onSaved: onRefresh, dateOfBirth });
  const { form, fieldErrors: err, setField, shows } = editor;

  // ── Summary values ───────────────────────────────────────────────────────
  const src = diversity || {};
  const pick = (group, key) => {
    if (src[key] !== undefined && src[key] !== null && src[key] !== '') return src[key];
    const nested = src[group]?.[key];
    return nested === undefined ? null : nested;
  };

  const dStatus  = pick('disability', 'disability_status');
  const dType    = pick('disability', 'disability_type');
  const dPct     = pick('disability', 'disability_percentage');
  const dReason  = pick('disability', 'disability_reason');
  const dCert    = pick('disability', 'certificate_type');

  const mStatus  = pick('military', 'military_status');
  const mService = pick('military', 'service_type');
  const mEnrolD  = pick('military', 'enrolment_day');
  const mEnrolM  = pick('military', 'enrolment_month');
  const mEnrolY  = pick('military', 'enrolment_year');
  const mDischD  = pick('military', 'discharge_day');
  const mDischM  = pick('military', 'discharge_month');
  const mDischY  = pick('military', 'discharge_year');
  const mNumber  = pick('military', 'service_number');

  const cStatus  = pick('career_break', 'career_break_status');
  const cReason  = pick('career_break', 'break_reason');
  const cFromM   = pick('career_break', 'break_from_month');
  const cFromY   = pick('career_break', 'break_from_year');
  const cTillM   = pick('career_break', 'break_till_month');
  const cTillY   = pick('career_break', 'break_till_year');
  const cOnBreak = Boolean(
    src.currently_on_break !== undefined
      ? src.currently_on_break
      : src.career_break?.currently_on_break,
  );

  const enrolmentDisplay = formatDayMonthYear(mEnrolD, mEnrolM, mEnrolY);
  const dischargeDisplay = formatDayMonthYear(mDischD, mDischM, mDischY);
  const breakFromDisplay = formatMonthYear(cFromM, cFromY);
  const breakTillDisplay = cOnBreak
    ? 'Currently on break'
    : formatMonthYear(cTillM, cTillY);

  return (
    <>
      <SectionCard
        id="diversity"
        title="Diversity & inclusion"
        description="Share what you're comfortable sharing. Recruiters running inclusive hiring programmes use these fields to find you."
        complete={editor.hasAnything}
        loading={loading}
        onAdd={editor.hasAnything ? undefined : editor.openEditor}
        addLabel="Add details"
        addFilled
        titleColor={DP.charcoal}
        accentColor={DP.sage}
        actions={
          editor.hasAnything && (
            <Stack direction="row" gap={0.5}>
              <Button
                onClick={editor.openEditor}
                size="small"
                startIcon={<EditOutlined sx={{ fontSize: 17 }} />}
               sx={{
                  fontFamily: FONTS.body, textTransform: 'none', fontWeight: 600,
                  fontSize: '0.8125rem', color: '#FFFFFF',
                  bgcolor: DP.charcoal, px: 1.5, borderRadius: 2,
                  '&:hover': { bgcolor: '#1E2A30' } }}
              >
                Edit
              </Button>
              <Button
                onClick={() => editor.setConfirmClear(true)}
                size="small"
                startIcon={<DeleteOutlineOutlined sx={{ fontSize: 17 }} />}
               sx={{
                  fontFamily: FONTS.body, textTransform: 'none', fontWeight: 600,
                  fontSize: '0.8125rem', color: '#FFFFFF',
                  bgcolor: DP.charcoal, px: 1.5, borderRadius: 2,
                  '&:hover': { bgcolor: PALETTE.danger || '#C62828' } }}
              >
                Clear
              </Button>
            </Stack>
          )
        }
      >
        {!editor.hasAnything ? (
          <EmptyState
            message="Nothing added yet. This whole section is optional — share only what you're comfortable with."
            accentColor={DP.sage}
          />
        ) : (
          <Box sx={{ px: { xs: 0, sm: 1 }, py: 1 }}>
            {dStatus && (
              <Box sx={{ mb: 2.5 }}>
                <Typography sx={{ fontFamily: FONTS.body, fontSize: '0.75rem', color: PALETTE.muted, mb: 0.75 }}>
                  Disability status
                </Typography>
                <Chip
                  label={dStatus}
                  size="small"
                  sx={{
                    fontFamily: FONTS.body, fontSize: '0.8125rem', fontWeight: 500,
                    bgcolor: DP.sageTint, color: DP.sage,
                    border: `1px solid ${DP.sage}`, borderRadius: '16px', height: 30,
                  }}
                />
                {dStatus === 'Have disability' && (
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    <DetailRow label="Type" value={dType} />
                    <DetailRow
                      label="Percentage"
                      value={dPct !== null && dPct !== undefined && dPct !== '' ? `${dPct}%` : ''}
                    />
                    <DetailRow label="Reason" value={dReason} />
                    <DetailRow label="Certificate" value={dCert} />
                    {editor.hasDocument && (
                      <Grid size={{ xs: 12 }}>
                        <Stack direction="row" gap={1} sx={{ alignItems: 'center' }}>
                          <DescriptionOutlined sx={{ fontSize: 18, color: DP.sage }} />
                          <Typography sx={{ fontFamily: FONTS.body, fontSize: '0.8125rem', color: DP.charcoal }}>
                            {editor.documentName || 'Uploaded proof document'}
                          </Typography>
                          <Button
                            component="a"
                            href={editor.documentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            size="small"
                            startIcon={<VisibilityOutlined sx={{ fontSize: 15 }} />}
                            sx={{
                              fontFamily: FONTS.body, textTransform: 'none',
                              fontSize: '0.75rem', fontWeight: 600, color: DP.sage,
                            }}
                          >
                            View
                          </Button>
                        </Stack>
                      </Grid>
                    )}
                  </Grid>
                )}
              </Box>
            )}

            {mStatus && (
              <Box sx={{ mb: 2.5 }}>
                <Typography sx={{ fontFamily: FONTS.display, fontSize: '0.875rem', color: DP.charcoal, mb: 1 }}>
                  Military service
                </Typography>
                <Divider sx={{ borderColor: PALETTE.border, mb: 1.5 }} />
                <Grid container spacing={2}>
                  <DetailRow label="Status" value={mStatus} />
                  <DetailRow label="Service type" value={mService} />
                  <DetailRow label="Enrolment date" value={enrolmentDisplay} />
                  {mStatus === 'Previously served' && (
                    <DetailRow label="Discharge date" value={dischargeDisplay} />
                  )}
                  <DetailRow label="Service number" value={mNumber} />
                </Grid>
              </Box>
            )}

            {cStatus && (
              <Box>
                <Typography sx={{ fontFamily: FONTS.display, fontSize: '0.875rem', color: DP.charcoal, mb: 1 }}>
                  Career break
                </Typography>
                <Divider sx={{ borderColor: PALETTE.border, mb: 1.5 }} />
                <Grid container spacing={2}>
                  <DetailRow label="Status" value={cStatus} />
                  {cStatus === 'Have taken' && (
                    <>
                      <DetailRow label="Reason" value={cReason} />
                      <DetailRow label="From" value={breakFromDisplay} />
                      <DetailRow label="Until" value={breakTillDisplay} />
                    </>
                  )}
                </Grid>
              </Box>
            )}
          </Box>
        )}
      </SectionCard>

      {/* ── Edit dialog ─────────────────────────────────────────────────── */}
      <FormDialog
        open={editor.open}
        onClose={editor.close}
        title={editor.hasAnything ? 'Edit diversity & inclusion' : 'Add diversity & inclusion'}
        onSubmit={editor.save}
        submitLabel="Save"
        saving={editor.saving}
        formError={editor.formError}
        maxWidth="md"
        submitColor={DP.sage}
        titleColor={DP.charcoal}
        hideScrollbar
        useSpinner
      >
        <Grid container spacing={2} sx={{ pt: 1 }}>

          {/* ─── DISABILITY ─────────────────────────────────────────── */}
          <GroupHeader text="Disability" />

          <Grid size={{ xs: 12 }}>
            <Typography sx={{ fontFamily: FONTS.body, fontSize: '0.75rem', color: PALETTE.muted, mb: 1 }}>
              Disability status
            </Typography>
            <ChipSelect
              options={DISABILITY_STATUS}
              value={form.disability_status}
              onChange={(v) => setField('disability_status', v)}
            />
            {err.disability_status && (
              <Typography sx={{ fontFamily: FONTS.body, fontSize: '0.75rem', color: PALETTE.danger, mt: 0.5 }}>
                {err.disability_status}
              </Typography>
            )}
          </Grid>

          {shows.disabilityDetails && (
            <>
              <Grid size={{ xs: 12, sm: 6 }}>
                <ComboInput
                  label="Type of disability"
                  value={form.disability_type}
                  onChange={(v) => setField('disability_type', v)}
                  options={DISABILITY_TYPE_SUGGESTIONS}
                  error={err.disability_type}
                  placeholder="Visual impairment"
                />
              </Grid>

              <Grid size={{ xs: 6, sm: 3 }}>
                <TextInput
                  label="Percentage"
                  value={form.disability_percentage}
                  onChange={(v) => setField('disability_percentage', v)}
                  error={err.disability_percentage}
                  type="number"
                  placeholder="0-100"
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 9 }}>
                <ComboInput
                  label="Reason"
                  value={form.disability_reason}
                  onChange={(v) => setField('disability_reason', v)}
                  options={DISABILITY_REASON_SUGGESTIONS}
                  error={err.disability_reason}
                  placeholder="Genetic"
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <SelectInput
                  label="Certificate type"
                  value={form.certificate_type}
                  onChange={(v) => setField('certificate_type', v)}
                  options={CERTIFICATE_TYPES}
                  error={err.certificate_type}
                  placeholder="Select"
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Box>
                  <Typography
                   sx={{ fontFamily: FONTS.body, fontSize: '0.75rem', color: PALETTE.muted, mb: 0.5 }}
                  >
                    Proof document (optional)
                  </Typography>
                  <input
                    ref={editor.fileInputRef}
                    type="file"
                    accept={DIVERSITY_ACCEPT_ATTRIBUTE}
                    onChange={editor.onFileChange}
                    style={{ display: 'none' }}
                    aria-hidden="true"
                  />
                  <Stack direction="row" gap={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                    <Button
                      onClick={editor.pickFile}
                      size="small"
                      startIcon={<CloudUploadOutlined sx={{ fontSize: 17 }} />}
                      variant="outlined"
                     sx={{
                        fontFamily: FONTS.body, textTransform: 'none',
                        fontSize: '0.8125rem', fontWeight: 600,
                        borderColor: DP.sage, color: DP.sage,
                        '&:hover': { borderColor: DP.sage, bgcolor: DP.sageTint } }}
                    >
                      {editor.hasDocument || editor.pendingFile ? 'Replace' : 'Upload'}
                    </Button>
                    {editor.pendingFile && (
                      <Chip
                        label={editor.pendingFile.name}
                        onDelete={editor.clearPendingFile}
                        size="small"
                       sx={{ fontFamily: FONTS.body, fontSize: '0.75rem', bgcolor: DP.offWhite }}
                      />
                    )}
                    {!editor.pendingFile && editor.hasDocument && (
                      <Chip
                        label={editor.documentName || 'Document on file'}
                        size="small"
                        icon={<DescriptionOutlined sx={{ fontSize: 14 }} />}
                       sx={{ fontFamily: FONTS.body, fontSize: '0.75rem', bgcolor: DP.offWhite }}
                      />
                    )}
                  </Stack>
                  <Typography
                   sx={{ fontFamily: FONTS.body, fontSize: '0.6875rem', color: PALETTE.muted, mt: 0.5 }}
                  >
                    PDF, JPG, PNG, DOC or DOCX — up to {Math.round(DIVERSITY_MAX_DOC_SIZE / (1024 * 1024))}MB
                  </Typography>
                </Box>
              </Grid>
            </>
          )}

          {/* ─── MILITARY ───────────────────────────────────────────── */}
          <GroupHeader text="Military service" />

          <Grid size={{ xs: 12 }}>
            <Typography sx={{ fontFamily: FONTS.body, fontSize: '0.75rem', color: PALETTE.muted, mb: 1 }}>
              Military status
            </Typography>
            <ChipSelect
              options={MILITARY_STATUS}
              value={form.military_status}
              onChange={(v) => setField('military_status', v)}
            />
            {err.military_status && (
              <Typography sx={{ fontFamily: FONTS.body, fontSize: '0.75rem', color: PALETTE.danger, mt: 0.5 }}>
                {err.military_status}
              </Typography>
            )}
          </Grid>

          {shows.serviceDates && (
            <>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextInput
                  label="Service type"
                  value={form.service_type}
                  onChange={(v) => setField('service_type', v)}
                  error={err.service_type}
                  maxLength={DIVERSITY_FIELD_LIMITS.service_type}
                  placeholder="Indian Army"
                />
              </Grid>

              {/* ── Enrolment date — calendar picker ──────────────────── */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <CalendarPicker
                  label="Enrolment date"
                  day={form.enrolment_day}
                  month={form.enrolment_month}
                  year={form.enrolment_year}
                  onChangeDay={(v) => setField('enrolment_day', v)}
                  onChangeMonth={(v) => setField('enrolment_month', v)}
                  onChangeYear={(v) => setField('enrolment_year', v)}
                  error={err.enrolment_day || err.enrolment_month || err.enrolment_year}
                />
              </Grid>

              {/* ── Discharge date — calendar picker ─────────────────── */}
              {shows.dischargeDates && (
                <Grid size={{ xs: 12, sm: 6 }}>
                  <CalendarPicker
                    label="Discharge date"
                    day={form.discharge_day}
                    month={form.discharge_month}
                    year={form.discharge_year}
                    onChangeDay={(v) => setField('discharge_day', v)}
                    onChangeMonth={(v) => setField('discharge_month', v)}
                    onChangeYear={(v) => setField('discharge_year', v)}
                    error={err.discharge_day || err.discharge_month || err.discharge_year}
                  />
                </Grid>
              )}

              <Grid size={{ xs: 12 }}>
                <TextInput
                  label="Service number"
                  value={form.service_number}
                  onChange={(v) => setField('service_number', v)}
                  error={err.service_number}
                  maxLength={DIVERSITY_FIELD_LIMITS.service_number}
                  placeholder="Optional"
                />
              </Grid>
            </>
          )}

          {/* ─── CAREER BREAK ───────────────────────────────────────── */}
          <GroupHeader text="Career break" />

          <Grid size={{ xs: 12 }}>
            <Typography sx={{ fontFamily: FONTS.body, fontSize: '0.75rem', color: PALETTE.muted, mb: 1 }}>
              Career break status
            </Typography>
            <ChipSelect
              options={CAREER_BREAK_STATUS}
              value={form.career_break_status}
              onChange={(v) => setField('career_break_status', v)}
            />
            {err.career_break_status && (
              <Typography sx={{ fontFamily: FONTS.body, fontSize: '0.75rem', color: PALETTE.danger, mt: 0.5 }}>
                {err.career_break_status}
              </Typography>
            )}
          </Grid>

          {shows.breakDetails && (
            <>
              <Grid size={{ xs: 12, sm: 6 }}>
                <SelectInput
                  label="Reason"
                  value={form.break_reason}
                  onChange={(v) => setField('break_reason', v)}
                  options={BREAK_REASONS}
                  error={err.break_reason}
                  placeholder="Select"
                />
              </Grid>

              {/* ── From month/year — month-year picker ──────────────── */}
              <Grid size={{ xs: 6, sm: 3 }}>
                <MonthYearPicker
                  label="From"
                  month={form.break_from_month}
                  year={form.break_from_year}
                  onChangeMonth={(v) => setField('break_from_month', v)}
                  onChangeYear={(v) => setField('break_from_year', v)}
                  error={err.break_from_month || err.break_from_year}
                />
              </Grid>

              {/* ── Until month/year — month-year picker ─────────────── */}
              {!form.currently_on_break && (
                <Grid size={{ xs: 6, sm: 3 }}>
                  <MonthYearPicker
                    label="Until"
                    month={form.break_till_month}
                    year={form.break_till_year}
                    onChangeMonth={(v) => setField('break_till_month', v)}
                    onChangeYear={(v) => setField('break_till_year', v)}
                    error={err.break_till_month || err.break_till_year}
                  />
                </Grid>
              )}

              <Grid size={{ xs: 12 }}>
                <Box
                  onClick={() => setField('currently_on_break', !form.currently_on_break)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setField('currently_on_break', !form.currently_on_break);
                    }
                  }}
                 sx={{
                    display: 'inline-flex', alignItems: 'center', gap: 1,
                    px: 1.5, py: 0.75, borderRadius: 1,
                    border: `1px solid ${form.currently_on_break ? DP.sage : PALETTE.border}`,
                    bgcolor: form.currently_on_break ? DP.sageTint : 'transparent',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: DP.sageTint } }}
                >
                  <Typography
                   sx={{
                      fontFamily: FONTS.body, fontSize: '0.8125rem',
                      color: form.currently_on_break ? DP.sage : DP.charcoal,
                      fontWeight: 500 }}
                  >
                    {form.currently_on_break ? '✓ Currently on break' : 'I am currently on break'}
                  </Typography>
                </Box>
              </Grid>
            </>
          )}
        </Grid>
      </FormDialog>

      <ConfirmDialog
        open={editor.confirmClear}
        onClose={() => editor.setConfirmClear(false)}
        onConfirm={editor.clear}
        busy={editor.clearing}
        title="Clear diversity & inclusion?"
        message="This removes every value in this section from your profile. You can add them again later."
        confirmLabel="Clear"
      />
    </>
  );
}