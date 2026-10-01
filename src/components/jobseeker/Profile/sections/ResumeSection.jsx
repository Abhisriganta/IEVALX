import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box, Stack, Typography, Button, Alert, LinearProgress, IconButton,
  Tooltip,
} from '@mui/material';
import CloudUploadOutlined from '@mui/icons-material/CloudUploadOutlined';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import DownloadOutlined from '@mui/icons-material/DownloadOutlined';
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined';

import { SectionCard, ConfirmDialog } from '../parts';
import useResumeEditor from '@/hooks/jobseeker/useResumeEditor';
import {
  RESUME_ACCEPT_ATTRIBUTE,
  RESUME_MAX_FILE_SIZE,
  FONTS,
} from '@/constants/profileConstants';


const RESUME_COLORS = {
  sage:        '#7F9E7E',   
  sageHover:   '#6B896A',   
  sageTint:    '#7F9E7E1A', 
  sageSoft:    '#7F9E7E66', 

  charcoal:    '#273238',   
  charcoalMid: '#27323880', 
  charcoalSub: '#273238B3', 
  border:      '#2732381F', 

  offWhite:    '#F7F7F7',   
  surface:     '#FFFFFF',   
};

const megabytes = (bytes) => Math.round(bytes / (1024 * 1024));

function formatDate(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString(undefined, {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch {
    return '';
  }
}

/** Extract extension label ("PDF", "DOCX", "DOC") from a filename. */
function extLabel(filename) {
  if (!filename) return 'FILE';
  const m = String(filename).match(/\.([a-z0-9]+)$/i);
  return m ? m[1].toUpperCase() : 'FILE';
}

/* ── Small pieces ─────────────────────────────────────────────────────── */

function ActionIconButton({ tooltip, href, target, rel, onClick, disabled, children }) {
  const btn = (
    <IconButton
      href={href}
      target={target}
      rel={rel}
      onClick={onClick}
      disabled={disabled}
      size="small"
      aria-label={tooltip}
      sx={{
        width: 36,
        height: 36,
        borderRadius: 1.5,
        border: `1px solid ${RESUME_COLORS.border}`,
        bgcolor: RESUME_COLORS.surface,
        color: RESUME_COLORS.charcoalSub,
        transition: 'all 140ms ease',
        '&:hover': {
          borderColor: RESUME_COLORS.sage,
          bgcolor: RESUME_COLORS.sageTint,
          color: RESUME_COLORS.sage,
          transform: 'translateY(-1px)',
        },
        '&:active': { transform: 'translateY(0)' },
        '&:focus-visible': {
          outline: `2px solid ${RESUME_COLORS.sage}`,
          outlineOffset: 2,
        },
        '&.Mui-disabled': {
          bgcolor: RESUME_COLORS.offWhite,
          borderColor: RESUME_COLORS.border,
        },
      }}
    >
      {children}
    </IconButton>
  );
  return <Tooltip title={tooltip} arrow placement="top">{btn}</Tooltip>;
}

/* ── Main component ───────────────────────────────────────────────────── */

export default function ResumeSection({ candidateId, resume, loading, onRefresh }) {
  const editor = useResumeEditor({ candidateId, resume, onSaved: onRefresh });

  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    if (searchParams.get('section') !== 'resume') return;
    if (searchParams.get('action') !== 'upload') return;
    const t = setTimeout(() => {
      document.getElementById('resume')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      editor.pickFile?.();
    }, 350);
    const next = new URLSearchParams(searchParams);
    next.delete('action');
    setSearchParams(next, { replace: true });
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const metaText = [
    editor.sizeDisplay,
    formatDate(editor.updatedAt) && `Updated ${formatDate(editor.updatedAt)}`,
  ].filter(Boolean).join('  ·  ');

  const fileExt = extLabel(editor.filename);

  return (
    <>
      <SectionCard
        id="resume"
        title="Resume"
        description="Most recruiters open this first. Keep it current."
        complete={editor.hasResume}
        loading={loading}
      >
        {/* Hidden input — the one true source for file selection */}
        <input
          ref={editor.inputRef}
          type="file"
          accept={RESUME_ACCEPT_ATTRIBUTE}
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
              mb: 2, height: 4, borderRadius: 2,
              bgcolor: RESUME_COLORS.border,
              '& .MuiLinearProgress-bar': { bgcolor: RESUME_COLORS.sage },
            }}
          />
        )}

        {editor.hasResume ? (
          <Stack gap={2}>
            {/* ── File row ─────────────────────────────────────────── */}
            <Stack
              direction="row"
              alignItems="center"
              gap={2.25}
              sx={{
                p: 2.25,
                border: `1px solid ${RESUME_COLORS.border}`,
                borderRadius: 2,
                bgcolor: RESUME_COLORS.offWhite,
                transition: 'border-color 140ms ease',
                '&:hover': { borderColor: RESUME_COLORS.sageSoft },
              }}
            >
              {/* File-type badge — 40×40 */}
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 1.25,
                  bgcolor: RESUME_COLORS.surface,
                  border: `1px solid ${RESUME_COLORS.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Typography
                  sx={{
                    fontFamily: FONTS.body,
                    fontSize: '0.625rem',
                    fontWeight: 700,
                    color: RESUME_COLORS.sage,
                    letterSpacing: '0.05em',
                    lineHeight: 1,
                  }}
                >
                  {fileExt}
                </Typography>
              </Box>

              {/* Filename + meta */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  title={editor.filename}
                  sx={{
                    fontFamily: FONTS.body,
                    fontWeight: 600,
                    fontSize: '0.9375rem',
                    color: RESUME_COLORS.charcoal,
                    lineHeight: 1.35,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {editor.filename}
                </Typography>

                {metaText && (
                  <Typography
                    sx={{
                      fontFamily: FONTS.body,
                      fontSize: '0.8125rem',
                      color: RESUME_COLORS.charcoalMid,
                      lineHeight: 1.4,
                      mt: 0.5,
                    }}
                  >
                    {metaText}
                  </Typography>
                )}
              </Box>

              {/* Actions — view / download / remove */}
              <Stack direction="row" gap={1.25} sx={{ flexShrink: 0 }}>
                <ActionIconButton
                  tooltip="View resume"
                  href={editor.viewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <VisibilityOutlined sx={{ fontSize: 18 }} />
                </ActionIconButton>
                <ActionIconButton
                  tooltip="Download"
                  href={editor.downloadUrl}
                >
                  <DownloadOutlined sx={{ fontSize: 18 }} />
                </ActionIconButton>
                <ActionIconButton
                  tooltip="Remove resume"
                  onClick={() => editor.setConfirmRemove(true)}
                  disabled={editor.uploading}
                >
                  <DeleteOutlineOutlined sx={{ fontSize: 18 }} />
                </ActionIconButton>
              </Stack>
            </Stack>

            {/* ── Replace zone (drop target + button) ──────────────── */}
            <Box
              onClick={editor.pickFile}
              onDrop={editor.onDrop}
              onDragOver={editor.onDragOver}
              onDragLeave={editor.onDragLeave}
              role="button"
              tabIndex={0}
              aria-label="Replace resume"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  editor.pickFile();
                }
              }}
              sx={{
                py: 3.5,
                px: 2,
                textAlign: 'center',
                border: `1.5px dashed ${editor.dragActive ? RESUME_COLORS.sage : RESUME_COLORS.sageSoft}`,
                borderRadius: 2,
                bgcolor: editor.dragActive ? RESUME_COLORS.sageTint : RESUME_COLORS.offWhite,
                cursor: 'pointer',
                transition: 'border-color 140ms ease, background-color 140ms ease',
                '&:hover': {
                  borderColor: RESUME_COLORS.sage,
                  bgcolor: RESUME_COLORS.sageTint,
                },
                '&:focus-visible': {
                  outline: `2px solid ${RESUME_COLORS.sage}`,
                  outlineOffset: 2,
                },
              }}
            >
              {/* Cloud upload glyph in a tinted circle */}
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  mx: 'auto',
                  mb: 1.5,
                  borderRadius: '50%',
                  bgcolor: RESUME_COLORS.sageTint,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CloudUploadOutlined sx={{ fontSize: 22, color: RESUME_COLORS.sage }} />
              </Box>

              <Button
                onClick={(e) => { e.stopPropagation(); editor.pickFile(); }}
                disabled={editor.uploading}
                variant="contained"
                disableElevation
                sx={{
                  fontFamily: FONTS.body,
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  bgcolor: RESUME_COLORS.sage,
                  color: RESUME_COLORS.surface,
                  px: 3,
                  py: 0.9,
                  borderRadius: 1.25,
                  minWidth: 160,
                  boxShadow: 'none',
                  transition: 'all 140ms ease',
                  '&:hover': {
                    bgcolor: RESUME_COLORS.sageHover,
                    boxShadow: `0 4px 12px ${RESUME_COLORS.sage}33`,
                  },
                  '&.Mui-disabled': {
                    bgcolor: RESUME_COLORS.sageSoft,
                    color: RESUME_COLORS.surface,
                  },
                }}
              >
                Replace resume
              </Button>

              <Typography
                sx={{
                  fontFamily: FONTS.body,
                  fontSize: '0.75rem',
                  color: RESUME_COLORS.charcoalMid,
                  mt: 1.5,
                }}
              >
                DOC, DOCX or PDF  ·  up to {megabytes(RESUME_MAX_FILE_SIZE)} MB
              </Typography>
            </Box>
          </Stack>
        ) : (
          /* ── Empty state (unchanged behavior, new colors) ───────── */
          <Box
            onClick={editor.pickFile}
            onDrop={editor.onDrop}
            onDragOver={editor.onDragOver}
            onDragLeave={editor.onDragLeave}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                editor.pickFile();
              }
            }}
            sx={{
              p: 4,
              textAlign: 'center',
              border: `1.5px dashed ${editor.dragActive ? RESUME_COLORS.sage : RESUME_COLORS.border}`,
              borderRadius: 2,
              bgcolor: editor.dragActive ? RESUME_COLORS.sageTint : RESUME_COLORS.offWhite,
              cursor: 'pointer',
              transition: 'border-color 140ms ease, background-color 140ms ease',
              '&:hover': { borderColor: RESUME_COLORS.sage },
              '&:focus-visible': {
                outline: `2px solid ${RESUME_COLORS.sage}`,
                outlineOffset: 2,
              },
            }}
          >
            <CloudUploadOutlined sx={{ fontSize: 36, color: RESUME_COLORS.charcoalMid, mb: 1 }} />
            <Typography
              sx={{
                fontFamily: FONTS.body,
                fontWeight: 600,
                fontSize: '0.9375rem',
                color: RESUME_COLORS.charcoal,
              }}
            >
              Drop your resume here, or click to choose one
            </Typography>
            <Typography
              sx={{
                fontFamily: FONTS.body,
                fontSize: '0.8125rem',
                color: RESUME_COLORS.charcoalMid,
                mt: 0.5,
              }}
            >
              PDF or DOCX, up to {megabytes(RESUME_MAX_FILE_SIZE)}MB
            </Typography>
          </Box>
        )}
      </SectionCard>

      <ConfirmDialog
        open={editor.confirmRemove}
        onClose={() => editor.setConfirmRemove(false)}
        onConfirm={editor.remove}
        busy={editor.removing}
        title="Remove your resume?"
        message="Recruiters will not be able to see it, and applications that need a resume will ask you to upload one again."
        confirmLabel="Remove"
      />
    </>
  );
}