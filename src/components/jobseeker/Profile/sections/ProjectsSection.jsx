import React, { useState } from 'react';
import {
  Grid, Box, Stack, Link, Typography, Button, TextField, Popover, InputAdornment,
} from '@mui/material';
import LaunchOutlined from '@mui/icons-material/LaunchOutlined';
import CodeOutlined from '@mui/icons-material/CodeOutlined';
import ArrowDropDown from '@mui/icons-material/ArrowDropDown';
import EditOutlined from '@mui/icons-material/EditOutlined';
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined';
import KeyboardArrowDown from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRight from '@mui/icons-material/KeyboardArrowRight';

import {
  SectionCard, EmptyState, FormDialog, ConfirmDialog,
  TextInput,
} from '../parts';

import useProfileListEditor from '@/hooks/jobseeker/useProfileListEditor';

import {
  PROJECT_STATUS,
  PROJECT_SITE,
  PROJECT_NATURE_OF_EMPLOYMENT,
  PROJECT_FIELD_LIMITS,
  MONTHS,
  monthLabel,
  yearOptions,
} from '@/constants/profileConstants';

// ── Scoped palette (matches Employment / Education dialog theming) ─────────
const PROJ_SAGE          = '#7F9E7E';
const PROJ_SAGE_HOVER    = '#5E815D';
const PROJ_SAGE_TINT     = 'rgba(127,158,126,0.15)';
const PROJ_SAGE_WASH     = 'rgba(127,158,126,0.05)';
const PROJ_SAGE_EDGE     = 'rgba(127,158,126,0.4)';
const PROJ_SAGE_TEXT     = '#3F5E3E';
const PROJ_CHARCOAL      = '#273238';
const PROJ_OFF_WHITE     = '#F7F7F7';
const PROJ_DANGER        = '#D94D4D';
const PROJ_FONT          = "'DM Sans', system-ui, sans-serif";
const PROJ_TEXT_MUTED    = 'rgba(39,50,56,0.6)';
const PROJ_TEXT_FAINT    = 'rgba(39,50,56,0.55)';
const PROJ_BORDER        = 'rgba(39,50,56,0.1)';
const PROJ_HAIRLINE      = 'rgba(39,50,56,0.08)';
const PROJ_FIELD_BG      = '#FFFFFF';

// Status → colour. Falls back to sage for any value the backend adds later.
const STATUS_STYLES = {
  'In progress': { dot: '#BA7517', bg: 'rgba(186,117,23,0.14)', text: '#854F0B' },
  Finished:      { dot: '#639922', bg: 'rgba(99,153,34,0.14)',  text: '#3B6D11' },
};
const statusStyle = (status) =>
  STATUS_STYLES[status] || { dot: PROJ_SAGE, bg: PROJ_SAGE_TINT, text: PROJ_SAGE_TEXT };
const ADD_BUTTON_SX = {
  '& .MuiButton-root': {
    bgcolor: PROJ_CHARCOAL,
    color: '#FFFFFF',
    borderRadius: 5,
    px: 2,
    py: 0.75,
    '& .MuiButton-startIcon': { color: '#FFFFFF' },
    '&:hover': { bgcolor: 'rgba(39,50,56,0.88)' },
  },
};

const DIALOG_THEME_SX = {
  '& .MuiOutlinedInput-root': {
    bgcolor: `${PROJ_FIELD_BG} !important`,
    '&:hover fieldset': { borderColor: `${PROJ_SAGE} !important` },
    '&.Mui-focused fieldset': { borderColor: `${PROJ_SAGE} !important`, borderWidth: '1.5px !important' },
  },
  '& .MuiInputLabel-root.Mui-focused': { color: `${PROJ_SAGE} !important` },
  '& .MuiFormLabel-asterisk': { color: PROJ_DANGER },
};

function NumberGridPicker({
  label, value, onChange, options, error, required, placeholder, helper, cols = 6,
}) {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  // Support primitive options AND { value, label } objects — same as SelectInput.
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
    onChange(v);        // ← same call signature as SelectInput
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
                  color: open ? PROJ_SAGE : 'rgba(39,50,56,0.5)',
                  transition: 'transform 0.15s ease',
                  transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              />
            </InputAdornment>
          ),
          sx: { cursor: 'pointer', fontFamily: PROJ_FONT },
        }}
        InputLabelProps={{ sx: { fontFamily: PROJ_FONT } }}
        FormHelperTextProps={{ sx: { fontFamily: PROJ_FONT } }}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: 2,
            bgcolor: PROJ_FIELD_BG,
            '& fieldset': { borderColor: 'rgba(39,50,56,0.2)' },
            '&:hover fieldset': { borderColor: PROJ_SAGE },
            '&.Mui-focused fieldset': { borderColor: PROJ_SAGE, borderWidth: '1.5px' },
          },
          '& .MuiInputLabel-root.Mui-focused': { color: PROJ_SAGE },
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
              border: `1px solid ${PROJ_BORDER}`,
              boxShadow: '0 8px 24px rgba(39,50,56,0.15)',
              p: 1.5,
              width: popoverWidth,
              maxHeight: 320,
              overflowY: 'auto',
              // Popover is its own scroll container, so this one CAN be
              // hidden locally. Scrolling still works.
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              '&::-webkit-scrollbar': { display: 'none' },
            },
          },
        }}
      >
        <Typography
          sx={{
            fontFamily: PROJ_FONT,
            fontSize: '0.6875rem',
            fontWeight: 700,
            color: PROJ_TEXT_MUTED,
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
                  fontFamily: PROJ_FONT,
                  fontSize: '0.8125rem',
                  fontWeight: selected ? 700 : 500,
                  color: selected ? '#FFFFFF' : 'rgba(39,50,56,0.75)',
                  bgcolor: selected ? PROJ_SAGE : 'transparent',
                  borderRadius: 1.5,
                  textTransform: 'none',
                  lineHeight: 1.2,
                  '&:hover': {
                    bgcolor: selected ? PROJ_SAGE_HOVER : PROJ_SAGE_TINT,
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

// ── Helpers (tenure + skillChips unchanged) ────────────────────────────────
function tenure(project) {
  if (!project.worked_from_year) return '';
  const start = project.worked_from_month
    ? `${monthLabel(project.worked_from_month)} ${project.worked_from_year}`
    : String(project.worked_from_year);
  return project.project_status === 'Finished' ? `Completed, from ${start}` : `Since ${start}`;
}

function skillChips(project) {
  if (Array.isArray(project.skills_used_list)) return project.skills_used_list.slice(0, 6);
  if (!project.skills_used) return [];
  return String(project.skills_used).split(',').map((s) => s.trim()).filter(Boolean).slice(0, 6);
}

// Same composition the old EntryRow tertiary used — extracted so both the
// featured card and the expanded rows read from one place.
function metaLine(project) {
  return [
    tenure(project),
    project.project_site,
    project.project_location,
    project.team_size && `Team of ${project.team_size}`,
  ].filter(Boolean).join(' · ');
}

// The dialog captures `details_of_project` (1000 chars) and `role_description`.
// Neither was rendered before; prefer the fuller one.
function summaryText(project) {
  return project.details_of_project || project.role_description || '';
}

// One-line preview for a collapsed row: "React, TensorFlow.js · 2023".
function condensedMeta(project) {
  const skills = skillChips(project).join(', ');
  return [skills, project.worked_from_year].filter(Boolean).join(' · ');
}

// ── Small presentational pieces (local to this file) ───────────────────────
function StatusPill({ status }) {
  if (!status) return null;
  const s = statusStyle(status);
  return (
    <Box
      component="span"
      sx={{
        fontFamily: PROJ_FONT,
        fontSize: '0.6875rem',
        fontWeight: 500,
        bgcolor: s.bg,
        color: s.text,
        px: 1,
        py: 0.25,
        borderRadius: 5,
        whiteSpace: 'nowrap',
        lineHeight: 1.5,
      }}
    >
      {status}
    </Box>
  );
}

function SkillChipRow({ project, tint }) {
  const chips = skillChips(project);
  if (chips.length === 0) return null;
  return (
    <Stack direction="row" gap={0.625} sx={{ flexWrap: 'wrap', mt: 1.25 }}>
      {chips.map((skill) => (
        <Box
          key={skill}
          component="span"
          sx={{
            fontFamily: PROJ_FONT,
            fontSize: '0.71875rem',
            bgcolor: tint || PROJ_SAGE_TINT,
            color: PROJ_SAGE_TEXT,
            px: 1.125,
            py: 0.375,
            borderRadius: 5,
            lineHeight: 1.4,
          }}
        >
          {skill}
        </Box>
      ))}
    </Stack>
  );
}

function ProjectLinks({ project, emphasise }) {
  const hasCode = Boolean(project.github_url);
  const hasLive = Boolean(project.live_link);
  if (!hasCode && !hasLive) return null;

  const baseSx = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 0.5,
    fontFamily: PROJ_FONT,
    fontSize: '0.78125rem',
    textDecoration: 'none',
    px: 1.625,
    py: 0.75,
    borderRadius: 1.5,
    lineHeight: 1.4,
  };

  return (
    <Stack direction="row" gap={2} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
      {hasLive && (
        <Link
          href={project.live_link}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          sx={{
            ...baseSx,
            ...(emphasise
              ? { bgcolor: PROJ_SAGE_HOVER, color: '#FFFFFF', '&:hover': { bgcolor: PROJ_SAGE } }
              : {
                  color: PROJ_CHARCOAL,
                  border: '1px solid rgba(39,50,56,0.18)',
                  '&:hover': { borderColor: PROJ_SAGE, color: PROJ_SAGE_HOVER },
                }),
          }}
        >
          <LaunchOutlined sx={{ fontSize: 14 }} /> Live
        </Link>
      )}
      {hasCode && (
        <Link
          href={project.github_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          sx={{
            ...baseSx,
            color: PROJ_CHARCOAL,
            border: '1px solid rgba(39,50,56,0.18)',
            '&:hover': { borderColor: PROJ_SAGE, color: PROJ_SAGE_HOVER },
          }}
        >
          <CodeOutlined sx={{ fontSize: 14 }} /> Code
        </Link>
      )}
    </Stack>
  );
}

function RowActions({ onEdit, onDelete, iconOnly }) {
  const stop = (fn) => (e) => { e.stopPropagation(); fn(); };
  if (iconOnly) {
    return (
      <Stack direction="row" gap={1.25} sx={{ flex: 'none', color: 'rgba(39,50,56,0.35)' }}>
        <EditOutlined
          onClick={stop(onEdit)}
          sx={{ fontSize: 17, cursor: 'pointer', '&:hover': { color: PROJ_SAGE_HOVER } }}
        />
        <DeleteOutlineOutlined
          onClick={stop(onDelete)}
          sx={{ fontSize: 17, cursor: 'pointer', '&:hover': { color: PROJ_DANGER } }}
        />
      </Stack>
    );
  }
  const textSx = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 0.375,
    fontFamily: PROJ_FONT,
    fontSize: '0.78125rem',
    cursor: 'pointer',
  };
  return (
    <Stack direction="row" gap={1.75} sx={{ alignItems: 'center' }}>
      <Box component="span" onClick={stop(onEdit)} sx={{ ...textSx, color: PROJ_SAGE_HOVER }}>
        <EditOutlined sx={{ fontSize: 15 }} /> Edit
      </Box>
      <Box component="span" onClick={stop(onDelete)} sx={{ ...textSx, color: PROJ_DANGER }}>
        <DeleteOutlineOutlined sx={{ fontSize: 15 }} /> Delete
      </Box>
    </Stack>
  );
}

// ============================================================================

export default function ProjectsSection({ candidateId, projects = [], loading, onRefresh, dateOfBirth }) {
  const editor = useProfileListEditor({
    kind: 'projects', candidateId, items: projects, onSaved: onRefresh, dateOfBirth,
  });

  const { form, fieldErrors: err, setField } = editor;
  const isOnsite = form.project_site === 'Onsite';

  // Display-only state: which condensed row is open. Never leaves this file.
  const [expandedId, setExpandedId] = useState(null);

  const featured = editor.sorted[0] || null;
  const rest     = editor.sorted.slice(1);

  return (
    <>{/* ── Display card — featured most-recent project + condensed rest ── */}
      <Box sx={ADD_BUTTON_SX}>
      <SectionCard
        id="projects"
        title="Projects"
        description="Work you can point at. A live link or repository carries more weight than a description."
        complete={projects.length > 0}
        loading={loading}
        onAdd={editor.atLimit ? undefined : editor.openCreate}
        addLabel="Add project"
        titleColor={PROJ_CHARCOAL}
        accentColor={PROJ_SAGE}
        sx={ADD_BUTTON_SX}
      >
        {editor.sorted.length === 0 ? (
          <EmptyState
            message="No projects yet. Add something you built, at work or on your own."
          />
        ) : (
          <Box>
            {/* ── Featured: the most recent project ────────────────────── */}
            {featured && (
              <Box
                sx={{
                  border: `1px solid ${PROJ_SAGE_EDGE}`,
                  bgcolor: PROJ_SAGE_WASH,
                  borderRadius: 2.5,
                  p: { xs: 1.75, sm: 2.125 },
                }}
              >
                <Stack
                  direction="row"
                  sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1.25 }}
                >
                  <Typography
                    sx={{
                      fontFamily: PROJ_FONT,
                      fontSize: '0.65625rem',
                      letterSpacing: '0.7px',
                      textTransform: 'uppercase',
                      color: PROJ_SAGE_HOVER,
                    }}
                  >
                    Most recent
                  </Typography>
                  <RowActions
                    iconOnly
                    onEdit={() => editor.openEdit(featured)}
                    onDelete={() => editor.setPendingDelete(featured)}
                  />
                </Stack>

                <Stack
                  direction="row"
                  gap={1.125}
                  sx={{ alignItems: 'center', flexWrap: 'wrap', mt: 0.875 }}
                >
                  <Typography
                    sx={{
                      fontFamily: PROJ_FONT,
                      fontSize: '1.0625rem',
                      fontWeight: 500,
                      color: PROJ_CHARCOAL,
                      lineHeight: 1.3,
                    }}
                  >
                    {featured.project_title}
                  </Typography>
                  <StatusPill status={featured.project_status} />
                </Stack>

                {[featured.client, featured.role].filter(Boolean).length > 0 && (
                  <Typography
                    sx={{
                      fontFamily: PROJ_FONT,
                      fontSize: '0.8125rem',
                      color: 'rgba(39,50,56,0.7)',
                      mt: 0.625,
                    }}
                  >
                    {[featured.client, featured.role].filter(Boolean).join(' · ')}
                  </Typography>
                )}

                {summaryText(featured) && (
                  <Typography
                    sx={{
                      fontFamily: PROJ_FONT,
                      fontSize: '0.8125rem',
                      color: 'rgba(39,50,56,0.72)',
                      lineHeight: 1.6,
                      mt: 1.25,
                      whiteSpace: 'pre-line',
                    }}
                  >
                    {summaryText(featured)}
                  </Typography>
                )}

                {metaLine(featured) && (
                  <Typography
                    sx={{
                      fontFamily: PROJ_FONT,
                      fontSize: '0.78125rem',
                      color: PROJ_TEXT_FAINT,
                      mt: 1.375,
                    }}
                  >
                    {metaLine(featured)}
                  </Typography>
                )}

                <SkillChipRow project={featured} tint="rgba(127,158,126,0.2)" />

                <Box sx={{ mt: 1.625 }}>
                  <ProjectLinks project={featured} emphasise />
                </Box>
              </Box>
            )}

            {/* ── Condensed: every older project, expandable in place ──── */}
            {rest.length > 0 && (
              <Box sx={{ mt: 2 }}>
                {rest.map((project) => {
                  const open = expandedId === project.project_id;
                  const s = statusStyle(project.project_status);
                  return (
                    <Box
                      key={project.project_id}
                      sx={{ borderBottom: `1px solid ${PROJ_HAIRLINE}` }}
                    >
                      <Stack
                        direction="row"
                        gap={1}
                        onClick={() =>
                          setExpandedId(open ? null : project.project_id)
                        }
                        sx={{
                          alignItems: 'center',
                          py: 1.375,
                          cursor: 'pointer',
                          '&:hover .proj-title': { color: PROJ_SAGE_HOVER },
                        }}
                      >
                        <Box
                          component="span"
                          sx={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            bgcolor: s.dot,
                            flex: 'none',
                          }}
                        />
                        <Typography
                          className="proj-title"
                          sx={{
                            fontFamily: PROJ_FONT,
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            color: PROJ_CHARCOAL,
                            flex: 'none',
                            transition: 'color 0.15s ease',
                          }}
                        >
                          {project.project_title}
                        </Typography>
                        <Typography
                          sx={{
                            fontFamily: PROJ_FONT,
                            fontSize: '0.78125rem',
                            color: PROJ_TEXT_FAINT,
                            flex: 1,
                            minWidth: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {condensedMeta(project)}
                        </Typography>
                        {project.github_url && !open && (
                          <CodeOutlined
                            sx={{ fontSize: 16, color: PROJ_SAGE_HOVER, flex: 'none' }}
                          />
                        )}
                        {open
                          ? <KeyboardArrowDown sx={{ fontSize: 18, color: 'rgba(39,50,56,0.4)', flex: 'none' }} />
                          : <KeyboardArrowRight sx={{ fontSize: 18, color: 'rgba(39,50,56,0.4)', flex: 'none' }} />}
                      </Stack>

                      {open && (
                        <Box sx={{ pl: 1.875, pb: 1.75 }}>
                          {[project.client, project.role].filter(Boolean).length > 0 && (
                            <Typography
                              sx={{
                                fontFamily: PROJ_FONT,
                                fontSize: '0.8125rem',
                                color: 'rgba(39,50,56,0.7)',
                              }}
                            >
                              {[project.client, project.role].filter(Boolean).join(' · ')}
                            </Typography>
                          )}

                          {summaryText(project) && (
                            <Typography
                              sx={{
                                fontFamily: PROJ_FONT,
                                fontSize: '0.8125rem',
                                color: 'rgba(39,50,56,0.72)',
                                lineHeight: 1.6,
                                mt: 0.875,
                                whiteSpace: 'pre-line',
                              }}
                            >
                              {summaryText(project)}
                            </Typography>
                          )}

                          {metaLine(project) && (
                            <Typography
                              sx={{
                                fontFamily: PROJ_FONT,
                                fontSize: '0.78125rem',
                                color: PROJ_TEXT_FAINT,
                                mt: 1,
                              }}
                            >
                              {metaLine(project)}
                            </Typography>
                          )}

                          <SkillChipRow project={project} />

                          <Stack
                            direction="row"
                            gap={1.5}
                            sx={{
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              flexWrap: 'wrap',
                              mt: 1.625,
                              pt: 1.375,
                              borderTop: `1px solid ${PROJ_HAIRLINE}`,
                            }}
                          >
                            <ProjectLinks project={project} />
                            <RowActions
                              onEdit={() => editor.openEdit(project)}
                              onDelete={() => editor.setPendingDelete(project)}
                            />
                          </Stack>
                        </Box>
                      )}
                    </Box>
                  );
                })}
              </Box>
            )}

            <Typography
              sx={{
                fontFamily: PROJ_FONT,
                fontSize: '0.78125rem',
                color: PROJ_TEXT_FAINT,
                mt: 1.625,
              }}
            >
              {editor.sorted.length === 1
                ? '1 project'
                : `${editor.sorted.length} projects`}
            </Typography>
          </Box>
        )}
     </SectionCard>
      </Box>

      <FormDialog
        open={editor.open}
        onClose={editor.close}
        title={editor.isEditing ? 'Edit project' : 'Add project'}
        onSubmit={editor.save}
        submitLabel={editor.isEditing ? 'Save changes' : 'Add project'}
        submitColor={PROJ_CHARCOAL}
        titleColor={PROJ_CHARCOAL}
        saving={editor.saving}
        formError={editor.formError}
        maxWidth="md"
        hideScrollbar
      >
        <Box
          sx={{
            ...DIALOG_THEME_SX,
            '.MuiDialog-paper .MuiDialogActions-root .MuiButton-contained': {
              bgcolor: `${PROJ_CHARCOAL} !important`,
              color: `${PROJ_OFF_WHITE} !important`,
              boxShadow: 'none !important',
              '&:hover': {
                bgcolor: 'rgba(39,50,56,0.9) !important',
                boxShadow: 'none !important',
              },
            },
          }}
        >
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid size={{ xs: 12, sm: 7 }}>
              <TextInput
                label="Project title"
                value={form.project_title}
                onChange={(v) => setField('project_title', v)}
                error={err.project_title}
                required
                maxLength={PROJECT_FIELD_LIMITS.project_title}
                placeholder="iEvalx recruitment platform"
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 5 }}>
              <TextInput
                label="Client or organisation"
                value={form.client}
                onChange={(v) => setField('client', v)}
                error={err.client}
                required
                maxLength={PROJECT_FIELD_LIMITS.client}
                placeholder="Lanciere Technologies"
              />
            </Grid>

            {/* ── Status — grid popover, 1 col (2 short options) ──────── */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <NumberGridPicker
                label="Status"
                value={form.project_status}
                onChange={(v) => setField('project_status', v)}
                options={PROJECT_STATUS}
                error={err.project_status}
                cols={1}
              />
            </Grid>

            {/* ── Started month — grid popover, 3 cols × 4 rows ──────── */}
            <Grid size={{ xs: 6, sm: 3 }}>
              <NumberGridPicker
                label="Started month"
                value={form.worked_from_month}
                onChange={(v) => setField('worked_from_month', v)}
                options={MONTHS}
                error={err.worked_from_month}
                placeholder="Month"
                cols={3}
              />
            </Grid>

            {/* ── Started year — grid popover, 5 cols, scrollable ────── */}
            <Grid size={{ xs: 6, sm: 3 }}>
              <NumberGridPicker
                label="Started year"
                value={form.worked_from_year}
                onChange={(v) => setField('worked_from_year', v)}
                options={yearOptions()}
                error={err.worked_from_year}
                placeholder="Year"
                cols={5}
              />
            </Grid>

            {/* ── Site — grid popover, 1 col (Offsite/Onsite) ────────── */}
            <Grid size={{ xs: 6, sm: 3 }}>
              <NumberGridPicker
                label="Site"
                value={form.project_site}
                onChange={(v) => setField('project_site', v)}
                options={PROJECT_SITE}
                error={err.project_site}
                placeholder="Select"
                cols={1}
              />
            </Grid>

            {/* ── Engagement — grid popover, 1 col (3 options) ────────── */}
            <Grid size={{ xs: 6, sm: 3 }}>
              <NumberGridPicker
                label="Engagement"
                value={form.nature_of_employment}
                onChange={(v) => setField('nature_of_employment', v)}
                options={PROJECT_NATURE_OF_EMPLOYMENT}
                error={err.nature_of_employment}
                placeholder="Select"
                cols={1}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextInput
                label="Location"
                value={form.project_location}
                onChange={(v) => setField('project_location', v)}
                error={err.project_location}
                required={isOnsite}
                maxLength={PROJECT_FIELD_LIMITS.project_location}
                placeholder="Hyderabad"
                helper={isOnsite ? 'Required for an onsite project' : 'Optional'}
              />
            </Grid>

            <Grid size={{ xs: 6, sm: 3 }}>
              <TextInput
                label="Team size"
                value={form.team_size}
                onChange={(v) => setField('team_size', v)}
                error={err.team_size}
                type="number"
                placeholder="8"
              />
            </Grid>

            <Grid size={{ xs: 6, sm: 3 }}>
              <TextInput
                label="Your role"
                value={form.role}
                onChange={(v) => setField('role', v)}
                error={err.role}
                maxLength={PROJECT_FIELD_LIMITS.role}
                placeholder="Backend lead"
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextInput
                label="What you did"
                value={form.role_description}
                onChange={(v) => setField('role_description', v)}
                error={err.role_description}
                maxLength={PROJECT_FIELD_LIMITS.role_description}
                placeholder="Designed the assessment engine and its scoring pipeline."
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextInput
                label="Skills used"
                value={form.skills_used}
                onChange={(v) => setField('skills_used', v)}
                error={err.skills_used}
                maxLength={PROJECT_FIELD_LIMITS.skills_used}
                placeholder="Python, Django, MySQL, AWS"
                helper="Separate each skill with a comma."
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextInput
                label="Project details"
                value={form.details_of_project}
                onChange={(v) => setField('details_of_project', v)}
                error={err.details_of_project}
                multiline
                rows={4}
                maxLength={PROJECT_FIELD_LIMITS.details_of_project}
                placeholder="What the project was for, what you built, and what changed as a result."
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextInput
                label="Repository URL"
                value={form.github_url}
                onChange={(v) => setField('github_url', v)}
                error={err.github_url}
                placeholder="https://github.com/you/project"
                helper="Include https://"
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextInput
                label="Live link"
                value={form.live_link}
                onChange={(v) => setField('live_link', v)}
                error={err.live_link}
                placeholder="https://yourproject.com"
                helper="Include https://"
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
        title={`Remove ${editor.pendingDelete?.project_title || 'this project'}?`}
        message="This permanently removes the project from your profile."
        confirmLabel="Remove"
      />
    </>
  );
}