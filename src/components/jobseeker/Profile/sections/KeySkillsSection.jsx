import React, { useState } from 'react';
import {
  Box, Grid, Card, Stack, Typography, Button, IconButton, Tooltip,
  TextField, Popover, InputAdornment,
} from '@mui/material';
import AddOutlined from '@mui/icons-material/AddOutlined';
import CloseOutlined from '@mui/icons-material/CloseOutlined';
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import ArrowDropDown from '@mui/icons-material/ArrowDropDown';

import { FormDialog, ConfirmDialog, TextInput } from '../parts';

import useProfileListEditor from '@/hooks/jobseeker/useProfileListEditor';

import {
  SKILL_FIELD_LIMITS,
  EXPERIENCE_YEARS,
  EXPERIENCE_MONTHS,
  yearOptions,
} from '@/constants/profileConstants';

// ── Scoped palette (matches Profile summary) ────────────────────────────────
const SKILLS_SAGE           = '#7F9E7E';
const SKILLS_SAGE_HOVER     = '#5E815D';
const SKILLS_SAGE_TINT      = 'rgba(127,158,126,0.15)';
const SKILLS_SAGE_TINT_HOV  = 'rgba(127,158,126,0.22)';
const SKILLS_SAGE_BORDER    = 'rgba(127,158,126,0.3)';
const SKILLS_CHARCOAL       = '#273238';
const SKILLS_CHARCOAL_HOV   = 'rgba(39,50,56,0.85)';
const SKILLS_OFF_WHITE      = '#F7F7F7';
const SKILLS_FONT           = "'DM Sans', system-ui, sans-serif";
const SKILLS_TEXT_MUTED     = 'rgba(39,50,56,0.6)';
const SKILLS_BORDER         = 'rgba(39,50,56,0.1)';
const SKILLS_DIVIDER        = 'rgba(39,50,56,0.15)';


function NumberGridPicker({
  label, value, onChange, options, error, required, placeholder, cols = 6,
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
        helperText={error || ' '}
        value={displayValue}
        placeholder={placeholder}
        onClick={handleOpen}
        InputProps={{
          readOnly: true,
          endAdornment: (
            <InputAdornment position="end" sx={{ mr: -0.5 }}>
              <ArrowDropDown
                sx={{
                  color: open ? SKILLS_SAGE : 'rgba(39,50,56,0.5)',
                  transition: 'transform 0.15s ease',
                  transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              />
            </InputAdornment>
          ),
          sx: { cursor: 'pointer', fontFamily: SKILLS_FONT },
        }}
        InputLabelProps={{ sx: { fontFamily: SKILLS_FONT } }}
        FormHelperTextProps={{ sx: { fontFamily: SKILLS_FONT } }}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: 2,
            '& fieldset': { borderColor: 'rgba(39,50,56,0.2)' },
            '&:hover fieldset': { borderColor: SKILLS_SAGE },
            '&.Mui-focused fieldset': { borderColor: SKILLS_SAGE, borderWidth: '1.5px' },
          },
          '& .MuiInputLabel-root.Mui-focused': { color: SKILLS_SAGE },
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
              border: `1px solid ${SKILLS_BORDER}`,
              boxShadow: '0 8px 24px rgba(39,50,56,0.15)',
              p: 1.5,
              width: popoverWidth,
              maxHeight: 340,
              overflowY: 'auto',
            },
          },
        }}
      >
        <Typography
          sx={{
            fontFamily: SKILLS_FONT,
            fontSize: '0.6875rem',
            fontWeight: 700,
            color: SKILLS_TEXT_MUTED,
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
                  fontFamily: SKILLS_FONT,
                  fontSize: '0.8125rem',
                  fontWeight: selected ? 700 : 500,
                  color: selected ? '#FFFFFF' : 'rgba(39,50,56,0.75)',
                  bgcolor: selected ? SKILLS_SAGE : 'transparent',
                  borderRadius: 1.5,
                  textTransform: 'none',
                  lineHeight: 1.2,
                  '&:hover': {
                    bgcolor: selected ? SKILLS_SAGE_HOVER : SKILLS_SAGE_TINT,
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

// ── Helpers ────────────────────────────────────────────────────────────────
function experienceLabel(skill) {
  const years = Number(skill.experience_years) || 0;
  const months = Number(skill.experience_months) || 0;
  if (!years && !months) return '';
  return [years && `${years}y`, months && `${months}m`].filter(Boolean).join(' ');
}

function skillMeta(skill) {
  const exp = experienceLabel(skill);
  return [
    exp,
    skill.software_version && `v${skill.software_version}`,
  ].filter(Boolean).join(' · ');
}

// ── Section ────────────────────────────────────────────────────────────────
export default function KeySkillsSection({ candidateId, skills = [], loading, onRefresh }) {
  const editor = useProfileListEditor({
    kind: 'skills', candidateId, items: skills, onSaved: onRefresh,
  });
  const { form, fieldErrors: err, setField } = editor;
  const hasSkills = editor.sorted.length > 0;

  return (
    <>
      <Card
        id="skills"
        elevation={0}
        sx={{
          border: `1px solid ${SKILLS_BORDER}`,
          borderRadius: 3,
          bgcolor: '#FFFFFF',
          overflow: 'visible',
          scrollMarginTop: 88,
          mb: { xs: 3, sm: 4 },
        }}
      >
        {/* ── Header row: title + description + Add skill CTA (top) ──── */}
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
                  fontFamily: SKILLS_FONT,
                  fontSize: { xs: '1.0625rem', sm: '1.125rem' },
                  fontWeight: 700,
                  color: SKILLS_CHARCOAL,
                  letterSpacing: '-0.2px',
                  lineHeight: 1.3,
                }}
              >
                Key skills
              </Typography>
              {hasSkills && (
                <Tooltip title="Section complete">
                  <CheckCircleOutlined
                    sx={{ fontSize: 18, color: SKILLS_SAGE }}
                    aria-label="Section complete"
                  />
                </Tooltip>
              )}
            </Stack>
            <Typography
              sx={{
                fontFamily: SKILLS_FONT,
                fontSize: '0.8125rem',
                color: SKILLS_TEXT_MUTED,
                mt: 0.75,
                lineHeight: 1.5,
              }}
            >
              The strongest signal recruiters filter on. Add the ones you would be happy to be tested on.
            </Typography>
          </Box>

          {/* ── Sole Add-skill CTA (top-right, when not at limit) ────── */}
          {!editor.atLimit && (
            <Button
              onClick={editor.openCreate}
              size="small"
              startIcon={<AddOutlined sx={{ fontSize: 18 }} />}
              sx={{
                fontFamily: SKILLS_FONT,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.8125rem',
                color: SKILLS_OFF_WHITE,
                bgcolor: SKILLS_CHARCOAL,
                borderRadius: 2,
                px: 2,
                py: 0.75,
                whiteSpace: 'nowrap',
                flexShrink: 0,
                '&:hover': { bgcolor: SKILLS_CHARCOAL_HOV },
              }}
            >
              Add skill
            </Button>
          )}
        </Box>

        {/* ── Body: sage-tinted chips or empty state (no inline pill) ── */}
        <Box sx={{ px: { xs: 2.5, sm: 3.5 }, pb: { xs: 2.5, sm: 3 }, pt: 0 }}>
          {!hasSkills ? (
            <Box
              sx={{
                py: 3,
                px: 2,
                textAlign: 'center',
                border: `1px dashed ${SKILLS_BORDER}`,
                borderRadius: 2,
              }}
            >
              <Typography
                sx={{
                  fontFamily: SKILLS_FONT,
                  fontSize: '0.875rem',
                  color: SKILLS_TEXT_MUTED,
                }}
              >
                No skills yet. Use the button above to add your first one.
              </Typography>
            </Box>
          ) : (
            <>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25 }}>
                {editor.sorted.map((skill) => {
                  const meta = skillMeta(skill);
                  const tooltipText = [
                    meta,
                    skill.last_used && `last used ${skill.last_used}`,
                  ].filter(Boolean).join(' · ') || 'Click to edit';

                  return (
                    <Tooltip key={skill.skill_id} title={tooltipText}>
                      <Box
                        onClick={() => editor.openEdit(skill)}
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 1.25,
                          pl: 2.25,
                          pr: 1,
                          py: 1,
                          borderRadius: 24,
                          bgcolor: SKILLS_SAGE_TINT,
                          border: `1px solid ${SKILLS_SAGE_BORDER}`,
                          cursor: 'pointer',
                          transition: 'background-color 0.15s ease',
                          '&:hover': { bgcolor: SKILLS_SAGE_TINT_HOV },
                        }}
                      >
                        <Typography
                          component="span"
                          sx={{
                            fontFamily: SKILLS_FONT,
                            fontSize: '0.8125rem',
                            fontWeight: 600,
                            color: SKILLS_CHARCOAL,
                            lineHeight: 1,
                          }}
                        >
                          {skill.skill_name}
                        </Typography>
                        {meta && (
                          <Typography
                            component="span"
                            sx={{
                              fontFamily: SKILLS_FONT,
                              fontSize: '0.6875rem',
                              color: SKILLS_TEXT_MUTED,
                              pl: 1,
                              borderLeft: `1px solid ${SKILLS_DIVIDER}`,
                              lineHeight: 1,
                            }}
                          >
                            {meta}
                          </Typography>
                        )}
                        <IconButton
                          onClick={(e) => {
                            e.stopPropagation();
                            editor.setPendingDelete(skill);
                          }}
                          size="small"
                          aria-label={`Remove ${skill.skill_name}`}
                          sx={{
                            width: 20,
                            height: 20,
                            bgcolor: SKILLS_SAGE,
                            color: SKILLS_OFF_WHITE,
                            p: 0,
                            ml: 0.25,
                            '&:hover': { bgcolor: SKILLS_SAGE_HOVER },
                          }}
                        >
                          <CloseOutlined sx={{ fontSize: 12 }} />
                        </IconButton>
                      </Box>
                    </Tooltip>
                  );
                })}
              </Box>

              <Typography
                sx={{
                  fontFamily: SKILLS_FONT,
                  fontSize: '0.75rem',
                  color: SKILLS_TEXT_MUTED,
                  mt: 2,
                }}
              >
                {editor.atLimit
                  ? `You have reached the limit of ${editor.max} skills.`
                  : `${skills.length} of ${editor.max} · Click a chip to edit`}
              </Typography>
            </>
          )}
        </Box>
      </Card>

      {/* ── Edit dialog — SAME shared FormDialog + fields as before ──── */}
      {/* Same field names, same validation, same save endpoint. Only the */}
      {/* years / months / last-used pickers changed — same value emitted. */}
      <FormDialog
        open={editor.open}
        onClose={editor.close}
        title={editor.isEditing ? `Edit ${form.skill_name || 'skill'}` : 'Add skill'}
        onSubmit={editor.save}
        submitLabel={editor.isEditing ? 'Save changes' : 'Add skill'}
        submitColor={SKILLS_CHARCOAL}
        titleColor={SKILLS_CHARCOAL}
        saving={editor.saving}
        formError={editor.formError}
      >
        <Grid container spacing={2} sx={{ pt: 1 }}>
          <Grid size={{ xs: 12, sm: 7 }}>
            <TextInput
              label="Skill"
              value={form.skill_name}
              onChange={(v) => setField('skill_name', v)}
              error={err.skill_name}
              required
              placeholder="Python"
              maxLength={SKILL_FIELD_LIMITS.skill_name}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 5 }}>
            <TextInput
              label="Version"
              value={form.software_version}
              onChange={(v) => setField('software_version', v)}
              error={err.software_version}
              maxLength={SKILL_FIELD_LIMITS.software_version}
              placeholder="3.12"
              helper="Optional"
            />
          </Grid>

          {/* ── Experience (years) — grid popover ────────────────────── */}
          <Grid size={{ xs: 6, sm: 4 }}>
            <NumberGridPicker
              label="Experience (years)"
              value={form.experience_years}
              onChange={(v) => setField('experience_years', v)}
              options={EXPERIENCE_YEARS}
              error={err.experience_years}
              placeholder="0"
              cols={6}
            />
          </Grid>

          {/* ── and months — grid popover — 12 values 0 through 11 ────── */}
          <Grid size={{ xs: 6, sm: 4 }}>
            <NumberGridPicker
              label="and months"
              value={form.experience_months}
              onChange={(v) => setField('experience_months', v)}
              options={EXPERIENCE_MONTHS}
              error={err.experience_months}
              placeholder="0"
              cols={4}
            />
          </Grid>

          {/* ── Last used — grid popover ─────────────────────────────── */}
          <Grid size={{ xs: 12, sm: 4 }}>
            <NumberGridPicker
              label="Last used"
              value={form.last_used}
              onChange={(v) => setField('last_used', v)}
              options={yearOptions(undefined, new Date().getFullYear())}
              error={err.last_used}
              placeholder="Year"
              cols={5}
            />
          </Grid>
        </Grid>
      </FormDialog>

      {/* ── Confirm-delete dialog — untouched shared component ──────── */}
      <ConfirmDialog
        open={Boolean(editor.pendingDelete)}
        onClose={() => editor.setPendingDelete(null)}
        onConfirm={editor.confirmDelete}
        busy={editor.deleting}
        title={`Remove ${editor.pendingDelete?.skill_name || 'this skill'}?`}
        message="This removes it from your profile. You can add it again at any time."
        confirmLabel="Remove"
      />
    </>
  );
}