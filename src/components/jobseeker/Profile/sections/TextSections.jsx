

import React from 'react';
import { Box, Card, Typography, Stack, Button, Tooltip } from '@mui/material';
import EditOutlined from '@mui/icons-material/EditOutlined';
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined';
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import AddOutlined from '@mui/icons-material/AddOutlined';

import { SectionCard, EmptyState, FormDialog, ConfirmDialog, TextInput } from '../parts';
import useProfileTextEditor from '@/hooks/jobseeker/useProfileTextEditor';
import { PALETTE, FONTS } from '@/constants/profileConstants';


function TextSection({
  id, kind, candidateId, record, loading, onRefresh,
  title, description, placeholder, rows, emptyMessage, addLabel, guidance,
  bodyFontFamily,
  monoFontFamily,
}) {
  const _body = bodyFontFamily || FONTS.body;
  const editor = useProfileTextEditor({ kind, candidateId, record, onSaved: onRefresh });
  const hasText = Boolean(editor.stored);

  return (
    <>
      <SectionCard
        id={id}
        title={title}
        description={description}
        complete={hasText}
        loading={loading}
        onAdd={hasText ? undefined : editor.openEditor}
        addLabel={addLabel}
        addFilled
        actions={
          hasText && (
            <Stack direction="row" gap={0.5}>
              <Button
                onClick={editor.openEditor}
                size="small"
                startIcon={<EditOutlined sx={{ fontSize: 17 }} />}
                sx={{
                  fontFamily: _body, textTransform: 'none',
                  fontWeight: 600, fontSize: '0.8125rem', color: '#F7F7F7',
                  bgcolor: '#273238', borderRadius: 2, px: 1.75, py: 0.75,
                  '&:hover': { bgcolor: 'rgba(39,50,56,0.85)' },
                }}
              >
                Edit
              </Button>
              <Button
                onClick={() => editor.setConfirmClear(true)}
                size="small"
                startIcon={<DeleteOutlineOutlined sx={{ fontSize: 17 }} />}
                sx={{
                  fontFamily: _body, textTransform: 'none',
                  fontWeight: 600, fontSize: '0.8125rem', color: '#F7F7F7',
                  bgcolor: '#273238', borderRadius: 2, px: 1.75, py: 0.75,
                  '&:hover': { bgcolor: '#D94D4D' },
                }}
              >
                Clear
              </Button>
            </Stack>
          )
        }
      >
        {hasText ? (
          <Typography
            sx={{
              fontFamily: _body,
              fontSize: '0.875rem',
              color: '#374151',
              lineHeight: 1.65,
              whiteSpace: 'pre-wrap',
              overflowWrap: 'anywhere',
              wordBreak: 'break-word',
            }}
          >
            {editor.stored}
          </Typography>
        ) : (
          <EmptyState
            message={emptyMessage}
          />
        )}
      </SectionCard>

      <FormDialog
        open={editor.open}
        onClose={editor.close}
        title={hasText ? `Edit ${editor.label.toLowerCase()}` : `Add ${editor.label.toLowerCase()}`}
        subtitle={guidance}
        onSubmit={editor.save}
        submitLabel="Save"
        saving={editor.saving}
        formError={editor.formError}
        submitColor="#7F9E7E"
        maxWidth="sm"
      >
        <Box sx={{ pt: 1 }}>
          <TextInput
            label={editor.label}
            value={editor.value}
            onChange={editor.onChange}
            error={editor.error}
            required
            multiline
            rows={rows}
            maxLength={editor.max}
            placeholder={placeholder}
          />
          <Typography
            sx={{
              fontFamily: FONTS.body,
              fontSize: '0.75rem',
              color: editor.error ? PALETTE.danger : PALETTE.muted,
              mt: 1,
            }}
          >
            {editor.helper}
          </Typography>
        </Box>
      </FormDialog>

      <ConfirmDialog
        open={editor.confirmClear}
        onClose={() => editor.setConfirmClear(false)}
        onConfirm={editor.clear}
        busy={editor.clearing}
        title={`Clear your ${editor.label.toLowerCase()}?`}
        message="This removes it from your profile. You can write a new one at any time."
        confirmLabel="Clear"
      />
    </>
  );
}

// ── Resume headline ─────────────────────────────────────────────────────────
//
// Scoped font stack — techy / developer-forward look. Space Grotesk for the
// title (geometric sans), JetBrains Mono for the description meta line,
// Space Grotesk for content + buttons. Loaded via the extended @import in
// src/index.css.
const HEADLINE_DISPLAY_FONT = "'Space Grotesk', system-ui, sans-serif";
const HEADLINE_BODY_FONT    = "'Space Grotesk', system-ui, sans-serif";
const HEADLINE_MONO_FONT    = "'JetBrains Mono', 'Courier New', monospace";

export function HeadlineSection({ candidateId, headline, loading, onRefresh }) {
  return (
    <TextSection
      id="headline"
      kind="headline"
      candidateId={candidateId}
      record={headline}
      loading={loading}
      onRefresh={onRefresh}
      title={
        <span style={{ fontFamily: HEADLINE_DISPLAY_FONT, fontWeight: 700, letterSpacing: '-0.6px' }}>
          Resume headline
        </span>
      }
      description={
        <span style={{ fontFamily: HEADLINE_MONO_FONT, fontSize: '0.75rem' }}>
        </span>
      }
      bodyFontFamily={HEADLINE_BODY_FONT}
      monoFontFamily={HEADLINE_MONO_FONT}
      emptyMessage="No headline yet. This is the first thing a recruiter reads."
      addLabel="Add headline"
      guidance="At least five words. Name your role and your strongest skills."
      placeholder="Backend Developer specialising in Python, Django and REST APIs"
      rows={2}
    />
  );
}


const SUMMARY_SAGE          = '#7F9E7E';
const SUMMARY_CHARCOAL      = '#273238';
const SUMMARY_CHARCOAL_HOV  = 'rgba(39,50,56,0.85)';
const SUMMARY_OFF_WHITE     = '#F7F7F7';
const SUMMARY_DANGER        = '#D94D4D';
const SUMMARY_FONT          = "'DM Sans', system-ui, sans-serif";
const SUMMARY_TEXT_MUTED    = 'rgba(39,50,56,0.6)';
const SUMMARY_TEXT_META     = 'rgba(39,50,56,0.55)';
const SUMMARY_TEXT_META_STR = 'rgba(39,50,56,0.7)';
const SUMMARY_BORDER        = 'rgba(39,50,56,0.1)';
const SUMMARY_DIVIDER       = 'rgba(39,50,56,0.08)';


const SUMMARY_DIALOG_THEME_SX = {
  '& .MuiOutlinedInput-root': {
    '&:hover fieldset': { borderColor: `${SUMMARY_SAGE} !important` },
    '&.Mui-focused fieldset': { borderColor: `${SUMMARY_SAGE} !important`, borderWidth: '1.5px !important' },
  },
  '& .MuiInputLabel-root.Mui-focused': { color: `${SUMMARY_SAGE} !important` },
};


function formatReadTime(words) {
  const seconds = Math.max(5, Math.round(words * 0.3));
  if (seconds < 60) return `~${seconds}s read`;
  return `~${Math.round(seconds / 60)}m read`;
}

export function SummarySection({ candidateId, summary, loading, onRefresh }) {
  const editor = useProfileTextEditor({
    kind: 'summary',
    candidateId,
    record: summary,
    onSaved: onRefresh,
  });
  const hasText = Boolean(editor.stored);

  // Derived from editor.stored — no state, no fetch, no backend touch.
  const wordCount = hasText
    ? (editor.stored || '').trim().split(/\s+/).filter(Boolean).length
    : 0;
  const readLabel = formatReadTime(wordCount);

  return (
    <>
      <Card
        id="summary"
        elevation={0}
        sx={{
          border: `1px solid ${SUMMARY_BORDER}`,
          borderRadius: 3,
          bgcolor: '#FFFFFF',
          overflow: 'visible',
          scrollMarginTop: 88,
          mb: { xs: 3, sm: 4 },
        }}
      >
        {/* ── Header row: title + description + charcoal action buttons ── */}
        <Box
          sx={{
            px: { xs: 2.5, sm: 3.5 },
            pt: { xs: 2.5, sm: 3 },
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
                  fontFamily: SUMMARY_FONT,
                  fontSize: { xs: '1.0625rem', sm: '1.125rem' },
                  fontWeight: 700,
                  color: SUMMARY_CHARCOAL,
                  letterSpacing: '-0.2px',
                  lineHeight: 1.3,
                }}
              >
                Profile summary
              </Typography>
              {hasText && (
                <Tooltip title="Section complete">
                  <CheckCircleOutlined
                    sx={{ fontSize: 18, color: SUMMARY_SAGE }}
                    aria-label="Section complete"
                  />
                </Tooltip>
              )}
            </Stack>
            <Typography
              sx={{
                fontFamily: SUMMARY_FONT,
                fontSize: '0.75rem',
                color: SUMMARY_TEXT_MUTED,
                mt: 0.75,
                lineHeight: 1.5,
              }}
            >
              A short paragraph on your experience, strengths and what you are looking for.
            </Typography>
          </Box>

          <Stack direction="row" gap={1} sx={{ flexShrink: 0 }}>
            {hasText ? (
              <>
                <Button
                  onClick={editor.openEditor}
                  size="small"
                  startIcon={<EditOutlined sx={{ fontSize: 15 }} />}
                  sx={{
                    fontFamily: SUMMARY_FONT,
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    color: SUMMARY_OFF_WHITE,
                    bgcolor: SUMMARY_CHARCOAL,
                    borderRadius: 2,
                    px: 1.75,
                    py: 0.75,
                    '&:hover': { bgcolor: SUMMARY_CHARCOAL_HOV },
                  }}
                >
                  Edit
                </Button>
                <Button
                  onClick={() => editor.setConfirmClear(true)}
                  size="small"
                  startIcon={<DeleteOutlineOutlined sx={{ fontSize: 15 }} />}
                  sx={{
                    fontFamily: SUMMARY_FONT,
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    color: SUMMARY_OFF_WHITE,
                    bgcolor: SUMMARY_CHARCOAL,
                    borderRadius: 2,
                    px: 1.75,
                    py: 0.75,
                    '&:hover': { bgcolor: SUMMARY_DANGER },
                  }}
                >
                  Clear
                </Button>
              </>
            ) : (
              <Button
                onClick={editor.openEditor}
                startIcon={<AddOutlined sx={{ fontSize: 16 }} />}
                size="small"
                sx={{
                  fontFamily: SUMMARY_FONT,
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  color: SUMMARY_OFF_WHITE,
                  bgcolor: SUMMARY_CHARCOAL,
                  borderRadius: 2,
                  px: 1.75,
                  py: 0.75,
                  whiteSpace: 'nowrap',
                  '&:hover': { bgcolor: SUMMARY_CHARCOAL_HOV },
                }}
              >
                Add summary
              </Button>
            )}
          </Stack>
        </Box>

        {/* ── Body: paragraph + meta strip, or empty state ─────────────── */}
        <Box sx={{ px: { xs: 2.5, sm: 3.5 }, pb: { xs: 2.5, sm: 3 } }}>
          {hasText ? (
            <>
              {/* Hairline divider under the header */}
              <Box
                sx={{
                  height: '1px',
                  bgcolor: SUMMARY_DIVIDER,
                  mt: 1.75,
                  mb: 2.75,
                }}
              />

              <Typography
                sx={{
                  fontFamily: SUMMARY_FONT,
                  fontSize: '0.9375rem',
                  color: SUMMARY_CHARCOAL,
                  lineHeight: 1.8,
                  whiteSpace: 'pre-wrap',
                  overflowWrap: 'anywhere',
                  wordBreak: 'break-word',
                  letterSpacing: '-0.1px',
                }}
              >
                {editor.stored}
              </Typography>

              {/* Meta strip: word count · read time · public indicator */}
              <Box
                sx={{
                  mt: 2.75,
                  px: 2,
                  py: 1.5,
                  bgcolor: SUMMARY_OFF_WHITE,
                  borderRadius: 2,
                  display: 'flex',
                  gap: 1.25,
                  flexWrap: 'wrap',
                  alignItems: 'center',
                }}
              >
                <Typography
                  component="span"
                  sx={{
                    fontFamily: SUMMARY_FONT,
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                    color: SUMMARY_TEXT_META_STR,
                  }}
                >
                  {wordCount} {wordCount === 1 ? 'word' : 'words'}
                </Typography>
                <Typography
                  component="span"
                  sx={{
                    fontFamily: SUMMARY_FONT,
                    fontSize: '0.6875rem',
                    color: SUMMARY_TEXT_META,
                  }}
                >
                  ·
                </Typography>
                <Typography
                  component="span"
                  sx={{
                    fontFamily: SUMMARY_FONT,
                    fontSize: '0.6875rem',
                    color: SUMMARY_TEXT_META,
                  }}
                >
                  {readLabel}
                </Typography>
                <Typography
                  component="span"
                  sx={{
                    fontFamily: SUMMARY_FONT,
                    fontSize: '0.6875rem',
                    color: SUMMARY_TEXT_META,
                  }}
                >
                  ·
                </Typography>
                <Typography
                  component="span"
                  sx={{
                    fontFamily: SUMMARY_FONT,
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                    color: SUMMARY_SAGE,
                  }}
                >
                  ● Visible to recruiters
                </Typography>
              </Box>
            </>
          ) : (
            <Box
              sx={{
                mt: 2,
                py: 3,
                px: 2,
                textAlign: 'center',
                border: `1px dashed ${SUMMARY_BORDER}`,
                borderRadius: 2,
              }}
            >
              <Typography
                sx={{
                  fontFamily: SUMMARY_FONT,
                  fontSize: '0.875rem',
                  color: SUMMARY_TEXT_MUTED,
                }}
              >
                No summary yet. A few sentences here give recruiters context your resume cannot.
              </Typography>
            </Box>
          )}
        </Box>
      </Card>

      <FormDialog
        open={editor.open}
        onClose={editor.close}
        title={hasText ? 'Edit profile summary' : 'Add profile summary'}
        subtitle="Write for someone reading twenty profiles. Lead with what you have built."
        onSubmit={editor.save}
        submitLabel="Save"
        submitColor={SUMMARY_CHARCOAL}
        titleColor={SUMMARY_CHARCOAL}
        saving={editor.saving}
        formError={editor.formError}
        maxWidth="sm"
      >
        <Box sx={{ ...SUMMARY_DIALOG_THEME_SX, pt: 1 }}>
          <TextInput
            label={editor.label}
            value={editor.value}
            onChange={editor.onChange}
            error={editor.error}
            required
            multiline
            rows={7}
            maxLength={editor.max}
            placeholder="Backend developer with three years building Django services on AWS. Led the migration of a monolith to a service-based architecture serving 40,000 daily users…"
          />
          <Typography
            sx={{
              fontFamily: SUMMARY_FONT,
              fontSize: '0.75rem',
              color: editor.error ? PALETTE.danger : SUMMARY_TEXT_MUTED,
              mt: 1,
            }}
          >
            {editor.helper}
          </Typography>
        </Box>
      </FormDialog>

      {/* ── Confirm-clear dialog — untouched shared component ────────── */}
      <ConfirmDialog
        open={editor.confirmClear}
        onClose={() => editor.setConfirmClear(false)}
        onConfirm={editor.clear}
        busy={editor.clearing}
        title="Clear your profile summary?"
        message="This removes it from your profile. You can write a new one at any time."
        confirmLabel="Clear"
      />
    </>
  );
}

export default TextSection;