// ============================================================================
// WorkspaceHome.jsx  (v4 — intro + main flow)
//
// CHANGELOG v4:
//   • NEW: A first-time intro screen ("Meet your workspace") shows on the
//     first visit — headline, 3 feature cards, credibility strip, "Get
//     started" CTA. Clicking Get started persists a localStorage flag and
//     reveals the main view.
//   • Returning users skip straight to the main view (upload + recents).
//   • The main view gains a subtle "How it works" text link that re-opens
//     the intro on demand without clearing the flag.
//   • Everything else from v3 preserved: single-input upload flow, drag
//     support, PDF preview dialog, themed delete confirmation, Find Jobs
//     pagination, filename-first session normalizer.
//
// Location: src/components/jobseeker/Workspace/WorkspaceHome.jsx
// ============================================================================

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  Box, Stack, Typography, Button, IconButton, CircularProgress,
  Skeleton, Tooltip, Dialog, DialogContent, Select, MenuItem, Pagination,
} from '@mui/material';
import {
  AutoAwesomeRounded, UploadFileRounded, DescriptionOutlined,
  FileDownloadOutlined, DeleteOutlineRounded, HistoryRounded,
  VisibilityOutlined, CloseRounded, WarningAmberRounded,
  ArrowForwardRounded, CheckRounded, InfoOutlined, ArrowBackRounded,
  RemoveRedEyeOutlined, TuneRounded, InsightsRounded,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';

import {
  listSessions, deleteSession, getDownloadDocxUrl, getPreviewPdf, getCandidateId,
} from '@/services/api/jobseeker/resumeAiService';
import { genTransferKey, putTransferWithKey } from './resumeTransfer';

/* ── App theme tokens ────────────────────────────────────────────────── */
const T = {
  ink:      '#101210',
  sage:     '#7F9E7E',
  sageText: '#5E815D',
  pine:     '#022124',
  pineDark: '#0A3A38',
  cream:    '#F6F8F3',
  white:    '#FFFFFF',
  muted:    '#55584F',
  soft:     '#7A8073',
  line:     '#E7EAE3',
  lineSoft: '#D8DDD4',
  sageSoft: '#EDF3EC',
  sageTint: 'rgba(127,158,126,0.10)',
  hoverBg:  '#F1F4EE',
  danger:   '#EF4444',
  dangerBg: '#FDECEC',
  dividerSoft: '#F0F2ED',
};
const FONT = "'Jost','DM Sans',sans-serif";

const BUILDER_PATH = '/jobseeker/workspace/builder?rsView=landing&rsStep=upload';
const PAGE_SIZE_OPTIONS = [5, 10, 25, 50, 'all'];

/* ── Upload validation ───────────────────────────────────────────────── */
const MAX_SIZE = 5 * 1024 * 1024;
const validateResumeFile = (file) => {
  const name = (file?.name || '').toLowerCase();
  if (!name.endsWith('.pdf') && !name.endsWith('.docx')) {
    return 'Only PDF and DOCX files are supported.';
  }
  if (file.size > MAX_SIZE) return 'File must be under 5MB.';
  if (file.size === 0)      return 'File appears to be empty.';
  return null;
};

/* ── Session normaliser ──────────────────────────────────────────────── */
const normalizeSession = (raw) => {
  const id = raw.session_id ?? raw.id ?? raw.sid ?? null;
  const filename =
    raw.session_name ?? raw.sessionName ??
    raw.filename ?? raw.file_name ?? raw.original_filename ??
    raw.resume_name ?? raw.name ?? raw.title ??
    (id ? `Resume ${String(id).slice(0, 8)}` : 'Untitled resume');
  return {
    id,
    filename,
    date: raw.updated_at ?? raw.created_at ?? raw.uploaded_at ?? null,
  };
};

const formatDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

/* ══════════════════════════════════════════════════════════════════════
   INTRO SCREEN — shown on first visit; reopenable via "How it works"
   ══════════════════════════════════════════════════════════════════════ */
const IntroScreen = ({ onStart }) => {
  const features = [
    {
      icon: RemoveRedEyeOutlined,
      title: 'Live PDF preview',
      body: 'Click any line in the preview to jump straight to that field. What you see is what exports.',
    },
    {
      icon: TuneRounded,
      title: 'AI rewrites and coach',
      body: 'Six rewrite modes — polish, quantify, condense, and more — plus an AI coach for questions.',
    },
    {
      icon: InsightsRounded,
      title: 'JD match score',
      body: 'Paste a job description, get a per-section score with the exact skill gaps to close.',
    },
  ];

  return (
    <Box sx={{
      bgcolor: T.white,
      border: `1px solid ${T.line}`,
      borderRadius: '20px',
      px: { xs: 3, sm: 5 },
      py: { xs: 4.5, sm: 5.5 },
      textAlign: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Decorative soft-sage bloom in the corner */}
      <Box aria-hidden sx={{
        position: 'absolute',
        top: -60, right: -60,
        width: 220, height: 220,
        background: `radial-gradient(circle, ${T.sageSoft} 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      {/* Eyebrow pill */}
      <Box sx={{
        display: 'inline-flex', px: 1.75, py: 0.6,
        bgcolor: T.sageSoft, borderRadius: '999px', mb: 2,
      }}>
        <Typography sx={{
          fontSize: '0.7rem', fontWeight: 800, color: T.sageText,
          letterSpacing: '0.09em', textTransform: 'uppercase',
          fontFamily: FONT,
        }}>
          Meet your workspace
        </Typography>
      </Box>

      {/* Headline */}
      <Typography sx={{
        fontSize: { xs: '1.75rem', sm: '2.15rem' },
        fontWeight: 800, color: T.ink,
        letterSpacing: '-0.03em', lineHeight: 1.1,
        maxWidth: 560, mx: 'auto',
        fontFamily: FONT,
      }}>
        Your resume, rewritten by AI —
        <br />
        without losing its shape.
      </Typography>

      {/* Subhead */}
      <Typography sx={{
        fontSize: { xs: '0.92rem', sm: '1rem' },
        color: T.muted, lineHeight: 1.65,
        maxWidth: 520, mx: 'auto', mt: 1.75,
        fontFamily: FONT,
      }}>
        Upload your existing resume and edit it section by section with an AI
        coach beside you. Every font, every margin, every layout detail is
        preserved on the way out.
      </Typography>

      {/* Feature grid */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
        gap: 1.5,
        maxWidth: 720, mx: 'auto', mt: { xs: 3, sm: 4 },
        textAlign: 'left',
      }}>
        {features.map(({ icon: Icon, title, body }) => (
          <Box key={title} sx={{
            bgcolor: T.cream,
            border: `1px solid ${T.line}`,
            borderRadius: '14px',
            p: 2,
          }}>
            <Box sx={{
              width: 34, height: 34, borderRadius: '10px',
              bgcolor: T.sageSoft,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              mb: 1.25,
            }}>
              <Icon sx={{ fontSize: 18, color: T.sageText }} />
            </Box>
            <Typography sx={{
              fontSize: '0.86rem', fontWeight: 800, color: T.ink,
              letterSpacing: '-0.01em', fontFamily: FONT,
            }}>
              {title}
            </Typography>
            <Typography sx={{
              fontSize: '0.78rem', color: T.muted, lineHeight: 1.55, mt: 0.5,
              fontFamily: FONT,
            }}>
              {body}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* CTA */}
      <Button
        onClick={onStart}
        endIcon={<ArrowForwardRounded sx={{ fontSize: 18 }} />}
        sx={{
          mt: { xs: 3.5, sm: 4 },
          textTransform: 'none', fontFamily: FONT,
          fontSize: '0.95rem', fontWeight: 700, letterSpacing: '-0.01em',
          color: T.white, bgcolor: T.pine,
          px: 3.5, py: 1.25, borderRadius: '999px',
          boxShadow: '0 8px 24px rgba(2,33,36,0.2)',
          '&:hover': { bgcolor: T.pineDark, boxShadow: '0 10px 28px rgba(2,33,36,0.28)' },
        }}
      >
        Get started
      </Button>

      {/* Credibility strip */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={{ xs: 0.75, sm: 2.25 }}
        justifyContent="center"
        alignItems="center"
        sx={{ mt: 2.5 }}
      >
        {['PDF and DOCX', 'Formatting preserved', 'Session-only, never stored'].map((label) => (
          <Stack key={label} direction="row" spacing={0.5} alignItems="center">
            <CheckRounded sx={{ fontSize: 13, color: T.sage }} />
            <Typography sx={{
              fontSize: '0.72rem', color: T.soft, fontWeight: 700,
              fontFamily: FONT,
            }}>
              {label}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
};

/* ══════════════════════════════════════════════════════════════════════
   WORKSPACE HOME
   ══════════════════════════════════════════════════════════════════════ */
const WorkspaceHome = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const fileInputRef = useRef(null);

  /* ── View gate ──────────────────────────────────────────────────────
     The intro/details screen IS the Workspace tab's main page: it shows
     every time the tab is opened (and on refresh). "Get started" moves
     into the browse-files view for the session; the back arrow on the
     upload card returns here.                                          */
  const [showIntro, setShowIntro] = useState(true);

  const dismissIntro = useCallback(() => {
    setShowIntro(false);
  }, []);

  const openIntro = useCallback(() => setShowIntro(true), []);

  const [sessions,   setSessions]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [dragActive, setDragActive] = useState(false);

  /* Pagination */
  const [page,     setPage]     = useState(1);
  const [pageSize, setPageSize] = useState(5);

  /* Delete / preview dialogs */
  const [deleteTarget,   setDeleteTarget]   = useState(null);
  const [deleting,       setDeleting]       = useState(false);
  const [previewTarget,  setPreviewTarget]  = useState(null);
  const [previewUrl,     setPreviewUrl]     = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  /* ── Load recent sessions (always — the intro doesn't need to wait) */
  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const cid = getCandidateId();
      const d = await listSessions(cid);
      const raw = d?.sessions || d?.Sessions || (Array.isArray(d) ? d : []);
      setSessions(raw.map(normalizeSession).filter((s) => s.id));
    } catch (err) {
      console.warn('[WorkspaceHome] listSessions failed:', err);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const effectivePageSize = pageSize === 'all' ? Math.max(sessions.length, 1) : pageSize;
  const totalPages = Math.max(1, Math.ceil(sessions.length / effectivePageSize));
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);
  const pagedSessions = useMemo(
    () => sessions.slice((page - 1) * effectivePageSize, page * effectivePageSize),
    [sessions, page, effectivePageSize],
  );

  /* ── Upload flow — opens the builder in a NEW TAB ───────────────────
     Users can work on multiple resumes in parallel: each upload spawns
     its own builder tab while this Workspace tab stays put for the next
     one. A File can't cross tabs via router state, so it rides
     IndexedDB (shared across same-origin tabs) under a one-time key:

       1. Open a blank tab SYNCHRONOUSLY inside the click/drop gesture —
          calling window.open after an await trips popup blockers.
       2. putTransfer(file) → key (File stored in IndexedDB).
       3. Point the new tab at the builder URL with ?rbTransfer=<key>.
          BuilderPage claims the file (consume-once) and auto-uploads.

     If the popup is blocked (win === null), fall back to same-tab
     navigation with router state — the original single-tab flow.       */
  /* ── Upload flow — two beats, popup-proof ───────────────────────────
     BEAT 1 (pick/drop): validate and STAGE the file. We deliberately do
     NOT window.open here: Chrome expires user activation while the file
     dialog is open, so popups from a file-input change event get
     silently blocked (which forced the same-tab fallback).
     BEAT 2 (explicit click on "Open builder in new tab"): a fresh,
     direct click gesture — window.open from it is never blocked. The
     real builder URL opens synchronously with a pre-generated claim
     key; the IndexedDB write runs in parallel and the builder tab polls
     for it (resumeTransfer.takeTransfer retries for ~3s).              */
  const [pendingFile, setPendingFile] = useState(null);

  const stageFile = useCallback((file) => {
    const err = validateResumeFile(file);
    if (err) { enqueueSnackbar(err, { variant: 'error' }); return; }
    setPendingFile(file);
  }, [enqueueSnackbar]);

  const openBuilderTab = useCallback(() => {
    if (!pendingFile) return;
    const file = pendingFile;

    const key = genTransferKey();
    const url = `${window.location.origin}${BUILDER_PATH}&rbTransfer=${key}`;
    let win = null;
    try { win = window.open(url, '_blank'); } catch { win = null; }

    if (!win) {
      // Extremely defensive: direct-click popups aren't blocked in
      // practice, but if it happens, keep the file and go same-tab.
      navigate(BUILDER_PATH, { state: { droppedFile: file } });
      return;
    }

    setPendingFile(null);
    putTransferWithKey(key, file)
      .then(() => {
        enqueueSnackbar(
          'Builder opened in a new tab — you can start another resume here.',
          { variant: 'success' },
        );
      })
      .catch(() => {
        try { win.close(); } catch {}
        navigate(BUILDER_PATH, { state: { droppedFile: file } });
      });
  }, [pendingFile, navigate, enqueueSnackbar]);

  const openFilePicker = useCallback(() => { fileInputRef.current?.click(); }, []);
  const onFilePicked = useCallback((e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) stageFile(file);
  }, [stageFile]);

  const onDragOver  = (e) => { e.preventDefault(); setDragActive(true);  };
  const onDragLeave = (e) => { e.preventDefault(); setDragActive(false); };
  const onDrop      = (e) => {
    e.preventDefault(); setDragActive(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) stageFile(file);
  };

  /* ── Row actions ────────────────────────────────────────────────── */
  const handleDownload = useCallback((s) => {
    const url = getDownloadDocxUrl(s.id);
    const a = document.createElement('a');
    a.href = url; a.download = `${s.filename}.docx`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteSession(deleteTarget.id);
      setSessions((prev) => prev.filter((x) => x.id !== deleteTarget.id));
      enqueueSnackbar('Resume deleted.', { variant: 'success' });
      setDeleteTarget(null);
    } catch {
      enqueueSnackbar('Delete failed — try again.', { variant: 'error' });
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, enqueueSnackbar]);

  const openPreview = useCallback(async (s) => {
    setPreviewTarget(s); setPreviewLoading(true); setPreviewUrl(null);
    try {
      const res = await getPreviewPdf(s.id);
      if (!res.ok) throw new Error(`Preview failed (${res.status})`);
      const blob = await res.blob();
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (err) {
      enqueueSnackbar(err?.message || 'Could not load preview.', { variant: 'error' });
      setPreviewTarget(null);
    } finally {
      setPreviewLoading(false);
    }
  }, [enqueueSnackbar]);

  const closePreview = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null); setPreviewTarget(null);
  }, [previewUrl]);

  /* ══════════════════════════════════════════════════════════════════ */
  return (
    <Box sx={{
      p: { xs: 2, sm: 2.5, md: 3 },
      fontFamily: FONT,
      minHeight: '100%',
      bgcolor: T.cream,
    }}>
      {/* Hidden file input (only reachable from main view) */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        style={{ display: 'none' }}
        onChange={onFilePicked}
      />

      {/* Page header (shared across intro + main) */}
      <Box sx={{ mb: 2.5 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <AutoAwesomeRounded sx={{ fontSize: 22, color: T.sage }} />
          <Typography sx={{
            fontSize: { xs: '1.15rem', sm: '1.4rem' },
            fontWeight: 800, color: T.ink,
            letterSpacing: '-0.02em', lineHeight: 1.15,
          }}>
            Workspace
          </Typography>
        </Stack>
        <Typography sx={{
          fontSize: '0.7rem', color: T.muted,
          letterSpacing: '0.1em', textTransform: 'uppercase',
          fontWeight: 600, mt: 0.5,
        }}>
          Build and manage your resume with AI
        </Typography>
      </Box>

      {/* ══ INTRO ═════════════════════════════════════════════════════ */}
      {showIntro && <IntroScreen onStart={dismissIntro} />}

      {/* ══ MAIN VIEW ════════════════════════════════════════════════ */}
      {!showIntro && (
        <>
          {/* Hero upload card */}
          <Box
            role="button"
            tabIndex={0}
            onClick={openFilePicker}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openFilePicker(); } }}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            sx={{
              position: 'relative',
              bgcolor: T.white,
              border: `2px dashed ${dragActive ? T.sage : T.lineSoft}`,
              borderRadius: '18px',
              px: { xs: 2.5, sm: 4 },
              py: { xs: 4, sm: 5.5 },
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              outline: 'none',
              ...(dragActive && { bgcolor: T.sageSoft }),
              '&:hover':         { borderColor: T.sage, bgcolor: T.sageSoft },
              '&:focus-visible': { borderColor: T.sage, boxShadow: `0 0 0 3px ${T.sageSoft}` },
            }}
          >
            {/* Back → workspace details/intro page */}
            <Tooltip title="About this workspace">
              <IconButton
                onClick={(e) => { e.stopPropagation(); openIntro(); }}
                size="small"
                sx={{
                  position: 'absolute', top: 12, left: 12,
                  width: 34, height: 34,
                  bgcolor: T.cream,
                  border: `1px solid ${T.line}`,
                  borderRadius: '999px',
                  color: T.pine,
                  transition: 'all 0.18s ease',
                  '&:hover': { bgcolor: T.sageSoft, borderColor: T.sage },
                }}
              >
                <ArrowBackRounded sx={{ fontSize: 17 }} />
              </IconButton>
            </Tooltip>
            <Box sx={{
              width: 64, height: 64, borderRadius: '18px',
              bgcolor: T.sageSoft, mx: 'auto', mb: 2,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <UploadFileRounded sx={{ fontSize: 30, color: T.sageText }} />
            </Box>
            <Typography sx={{
              fontSize: '1.05rem', fontWeight: 800, color: T.ink,
              letterSpacing: '-0.015em',
            }}>
              Upload your resume
            </Typography>
            <Typography sx={{
              fontSize: '0.85rem', color: T.muted, mt: 0.75, mb: 2.5,
              maxWidth: 440, mx: 'auto', lineHeight: 1.55,
            }}>
              PDF or DOCX, up to 5MB — drop it here or browse. The AI builder opens
              full screen and starts on your file right away.
            </Typography>
            <Button
              onClick={(e) => { e.stopPropagation(); openFilePicker(); }}
              startIcon={<UploadFileRounded sx={{ fontSize: 17 }} />}
              sx={{
                textTransform: 'none', fontFamily: FONT,
                fontSize: '0.88rem', fontWeight: 700,
                color: T.white, bgcolor: T.sage,
                px: 3, py: 1, borderRadius: '999px',
                '&:hover': { bgcolor: T.pine },
              }}
            >
              Choose file
            </Button>
          </Box>

          {/* Ready-to-build bar — appears once a file is staged. The
              button click is a fresh direct gesture, so the new tab is
              never popup-blocked. */}
          {pendingFile && (
            <Box sx={{
              mt: 1.5,
              bgcolor: T.white,
              border: `1.5px solid ${T.sage}`,
              borderRadius: '14px',
              px: 2, py: 1.5,
              display: 'flex', alignItems: 'center', gap: 1.5,
              boxShadow: '0 8px 24px rgba(127,158,126,0.15)',
            }}>
              <Box sx={{
                width: 38, height: 38, borderRadius: '11px',
                bgcolor: T.sageSoft, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <DescriptionOutlined sx={{ fontSize: 19, color: T.sageText }} />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography noWrap sx={{
                  fontSize: '0.86rem', fontWeight: 700, color: T.ink,
                  letterSpacing: '-0.01em',
                }}>
                  {pendingFile.name}
                </Typography>
                <Typography sx={{ fontSize: '0.72rem', color: T.sageText, fontWeight: 700, mt: 0.1 }}>
                  Ready — opens in a new tab so you can keep working here
                </Typography>
              </Box>
              <Button
                onClick={() => setPendingFile(null)}
                sx={{
                  textTransform: 'none', fontFamily: FONT,
                  fontSize: '0.8rem', fontWeight: 700, color: T.soft,
                  px: 1.5, py: 0.6, borderRadius: '999px', flexShrink: 0,
                  '&:hover': { bgcolor: T.hoverBg, color: T.ink },
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={openBuilderTab}
                endIcon={<ArrowForwardRounded sx={{ fontSize: 16 }} />}
                sx={{
                  textTransform: 'none', fontFamily: FONT,
                  fontSize: '0.85rem', fontWeight: 700,
                  color: T.white, bgcolor: T.pine,
                  px: 2.25, py: 0.9, borderRadius: '999px', flexShrink: 0,
                  boxShadow: '0 6px 18px rgba(2,33,36,0.22)',
                  '&:hover': { bgcolor: T.pineDark },
                }}
              >
                Open builder in new tab
              </Button>
            </Box>
          )}

          {/* "How it works" reopener — subtle, right after the hero */}
          <Stack direction="row" justifyContent="center" sx={{ mt: 1.25 }}>
            <Box
              role="button"
              onClick={openIntro}
              sx={{
                display: 'inline-flex', alignItems: 'center', gap: 0.5,
                px: 1, py: 0.5, borderRadius: '8px',
                cursor: 'pointer',
                '&:hover': { bgcolor: T.hoverBg },
              }}
            >
              <InfoOutlined sx={{ fontSize: 14, color: T.soft }} />
              <Typography sx={{
                fontSize: '0.75rem', fontWeight: 700, color: T.soft,
                fontFamily: FONT,
                '&:hover': { color: T.pine },
              }}>
                How it works
              </Typography>
            </Box>
          </Stack>

          {/* Recent resumes */}
          <Box sx={{ mt: 2.5 }}>
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1.25 }}>
              <HistoryRounded sx={{ fontSize: 16, color: T.sage }} />
              <Typography sx={{
                fontSize: '0.82rem', fontWeight: 800, color: T.ink,
                letterSpacing: '-0.01em',
              }}>
                Recent resumes
              </Typography>
              {!loading && sessions.length > 0 && (
                <Typography sx={{ fontSize: '0.72rem', color: T.soft, fontWeight: 600 }}>
                  · {sessions.length}
                </Typography>
              )}
            </Stack>

            {loading && (
              <Box sx={{
                bgcolor: T.white, border: `1px solid ${T.line}`,
                borderRadius: '14px', overflow: 'hidden',
              }}>
                {[0, 1].map((i) => (
                  <Stack key={i} direction="row" spacing={1.5} alignItems="center"
                    sx={{ px: 2, py: 1.5, borderBottom: i === 0 ? `1px solid ${T.dividerSoft}` : 'none' }}>
                    <Skeleton variant="rounded" width={36} height={36} />
                    <Box sx={{ flex: 1 }}>
                      <Skeleton width="45%" height={16} />
                      <Skeleton width="25%" height={12} />
                    </Box>
                  </Stack>
                ))}
              </Box>
            )}

            {!loading && sessions.length === 0 && (
              <Box sx={{
                bgcolor: T.white, border: `1px dashed ${T.lineSoft}`,
                borderRadius: '14px', px: 3, py: 3, textAlign: 'center',
              }}>
                <DescriptionOutlined sx={{ fontSize: 28, color: T.lineSoft, mb: 0.75 }} />
                <Typography sx={{ fontSize: '0.82rem', color: T.muted, fontWeight: 600 }}>
                  No resumes yet — your uploads will appear here.
                </Typography>
              </Box>
            )}

            {!loading && pagedSessions.length > 0 && (
              <Box sx={{
                bgcolor: T.white, border: `1px solid ${T.line}`,
                borderRadius: '14px', overflow: 'hidden',
              }}>
                {pagedSessions.map((s, idx) => (
                  <Stack
                    key={s.id}
                    direction="row"
                    spacing={1.5}
                    alignItems="center"
                    sx={{
                      px: 2, py: 1.5,
                      borderBottom: idx === pagedSessions.length - 1 ? 'none' : `1px solid ${T.dividerSoft}`,
                      transition: 'background 0.12s ease',
                      '&:hover': { bgcolor: T.hoverBg },
                    }}
                  >
                    <Box sx={{
                      width: 36, height: 36, borderRadius: '10px',
                      bgcolor: T.sageSoft, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <DescriptionOutlined sx={{ fontSize: 18, color: T.sageText }} />
                    </Box>

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography noWrap sx={{
                        fontSize: '0.84rem', fontWeight: 700, color: T.ink,
                        letterSpacing: '-0.01em',
                      }}>
                        {s.filename}
                      </Typography>
                      {s.date && (
                        <Typography sx={{ fontSize: '0.7rem', color: T.soft, fontWeight: 600, mt: 0.15 }}>
                          {formatDate(s.date)}
                        </Typography>
                      )}
                    </Box>

                    <Tooltip title="Preview PDF">
                      <IconButton onClick={() => openPreview(s)} size="small"
                        sx={{ color: T.sageText, borderRadius: '10px',
                          '&:hover': { bgcolor: T.sageSoft, color: T.pine } }}>
                        <VisibilityOutlined sx={{ fontSize: 19 }} />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="Download DOCX">
                      <IconButton onClick={() => handleDownload(s)} size="small"
                        sx={{ color: T.sageText, borderRadius: '10px',
                          '&:hover': { bgcolor: T.sageSoft, color: T.pine } }}>
                        <FileDownloadOutlined sx={{ fontSize: 19 }} />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="Delete">
                      <IconButton onClick={() => setDeleteTarget(s)} size="small"
                        sx={{ color: T.soft, borderRadius: '10px',
                          '&:hover': { bgcolor: T.dangerBg, color: T.danger } }}>
                        <DeleteOutlineRounded sx={{ fontSize: 19 }} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                ))}
              </Box>
            )}

            {/* Pagination bar */}
            {!loading && sessions.length > 0 && (
              <Box sx={{
                mt: { xs: 2, sm: 2.5 },
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'space-between',
                alignItems: { xs: 'stretch', sm: 'center' },
                gap: { xs: 1.5, sm: 2 },
              }}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={{ xs: 1, sm: 2 }}
                  sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, flex: 1, minWidth: 0 }}
                >
                  <Typography sx={{
                    fontSize: { xs: '0.78rem', sm: '0.82rem' },
                    color: T.muted, fontWeight: 500, whiteSpace: 'nowrap',
                    fontFamily: FONT,
                  }}>
                    Showing{' '}
                    <Box component="span" sx={{ color: T.ink, fontWeight: 700 }}>
                      {(page - 1) * effectivePageSize + 1}–{Math.min(page * effectivePageSize, sessions.length)}
                    </Box>
                    {' '}of{' '}
                    <Box component="span" sx={{ color: T.ink, fontWeight: 700 }}>
                      {sessions.length}
                    </Box>
                    {' '}resumes
                  </Typography>

                  <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                    <Typography sx={{
                      fontSize: { xs: '0.78rem', sm: '0.82rem' },
                      color: T.muted, fontWeight: 500, fontFamily: FONT,
                    }}>
                      Show
                    </Typography>
                    <Select
                      size="small"
                      value={pageSize}
                      onChange={(e) => {
                        const v = e.target.value;
                        setPageSize(v === 'all' ? 'all' : Number(v));
                        setPage(1);
                      }}
                      renderValue={(v) => (v === 'all' ? 'All' : v)}
                      MenuProps={{
                        slotProps: { paper: {
                          sx: {
                            borderRadius: '12px', mt: 0.5,
                            border: `1px solid ${T.line}`,
                            boxShadow: '0 8px 24px rgba(2,33,36,0.12)',
                            '& .MuiMenuItem-root': {
                              fontSize: '0.82rem', fontWeight: 600, fontFamily: FONT,
                              color: T.ink, minHeight: { xs: 40, sm: 36 },
                              '&.Mui-selected': {
                                bgcolor: T.sageTint, color: T.pine,
                                '&:hover': { bgcolor: T.sageTint },
                              },
                            },
                          },
                        } },
                      }}
                      sx={{
                        fontSize: '0.82rem', fontWeight: 700, fontFamily: FONT,
                        color: T.pine, bgcolor: T.cream,
                        borderRadius: '10px',
                        minWidth: { xs: 76, sm: 80 },
                        height: { xs: 38, sm: 36 },
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: T.line },
                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: T.pine },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: T.pine, borderWidth: '1px' },
                        '& .MuiSelect-select': { py: 0.75, pl: 1.25, pr: '28px !important' },
                        '& .MuiSvgIcon-root': { color: T.pine },
                      }}
                    >
                      {PAGE_SIZE_OPTIONS.map((opt) => (
                        <MenuItem key={opt} value={opt}>{opt === 'all' ? 'All' : opt}</MenuItem>
                      ))}
                    </Select>
                    <Typography sx={{
                      fontSize: { xs: '0.78rem', sm: '0.82rem' },
                      color: T.muted, fontWeight: 500, fontFamily: FONT,
                    }}>
                      per page
                    </Typography>
                  </Stack>
                </Stack>

                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={(_e, p) => setPage(p)}
                  shape="rounded"
                  siblingCount={1}
                  boundaryCount={1}
                  size="small"
                  sx={{
                    '& .MuiPaginationItem-root': {
                      fontSize: { xs: '0.75rem', sm: '0.82rem' },
                      fontWeight: 600, fontFamily: FONT,
                      color: T.ink, borderRadius: '8px',
                      border: `1px solid ${T.line}`, bgcolor: T.cream,
                      minWidth: { xs: 32, sm: 36 }, height: { xs: 32, sm: 36 },
                      '&:hover': { bgcolor: T.sageTint, borderColor: T.sage },
                      '&.Mui-selected': {
                        bgcolor: T.pine, color: '#fff', borderColor: T.pine,
                        fontWeight: 700, boxShadow: '0 4px 12px rgba(2,33,36,0.2)',
                        '&:hover': { bgcolor: T.pineDark },
                      },
                    },
                    '& .MuiPaginationItem-ellipsis': { border: 'none', bgcolor: 'transparent' },
                  }}
                />
              </Box>
            )}
          </Box>
        </>
      )}

      {/* ══ DELETE DIALOG ═════════════════════════════════════════════ */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => !deleting && setDeleteTarget(null)}
        slotProps={{
          paper: {
            sx: {
              borderRadius: '18px', px: 1, py: 0.5,
              border: `1px solid ${T.line}`,
              boxShadow: '0 16px 48px rgba(2,33,36,0.16)',
              maxWidth: 400, width: '100%', fontFamily: FONT,
            },
          },
        }}
      >
        <DialogContent sx={{ textAlign: 'center', pt: 3.5, pb: 3 }}>
          <Box sx={{
            width: 52, height: 52, borderRadius: '16px',
            bgcolor: T.dangerBg, mx: 'auto', mb: 1.75,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <WarningAmberRounded sx={{ fontSize: 26, color: T.danger }} />
          </Box>
          <Typography sx={{
            fontSize: '1rem', fontWeight: 800, color: T.ink,
            letterSpacing: '-0.015em', fontFamily: FONT,
          }}>
            Delete this resume?
          </Typography>
          <Typography sx={{
            fontSize: '0.84rem', color: T.muted, mt: 0.75, lineHeight: 1.55,
            fontFamily: FONT,
          }}>
            "{deleteTarget?.filename}" will be permanently removed.
            This can't be undone.
          </Typography>

          <Stack direction="row" spacing={1.25} justifyContent="center" sx={{ mt: 2.75 }}>
            <Button
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
              sx={{
                textTransform: 'none', fontFamily: FONT,
                fontSize: '0.85rem', fontWeight: 700, color: T.pine,
                border: `1px solid ${T.line}`, bgcolor: T.white,
                px: 2.5, py: 0.8, borderRadius: '999px',
                '&:hover': { bgcolor: T.sageSoft, borderColor: T.lineSoft },
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDelete}
              disabled={deleting}
              startIcon={deleting
                ? <CircularProgress size={14} sx={{ color: T.white }} />
                : <DeleteOutlineRounded sx={{ fontSize: 16 }} />}
              sx={{
                textTransform: 'none', fontFamily: FONT,
                fontSize: '0.85rem', fontWeight: 700,
                color: T.white, bgcolor: T.danger,
                px: 2.5, py: 0.8, borderRadius: '999px',
                '&:hover': { bgcolor: '#C93636' },
                '&.Mui-disabled': { bgcolor: T.danger, opacity: 0.6, color: T.white },
              }}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>

      {/* ══ PREVIEW DIALOG ═════════════════════════════════════════════ */}
      <Dialog
        open={!!previewTarget}
        onClose={closePreview}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: '18px', overflow: 'hidden',
              border: `1px solid ${T.line}`,
              boxShadow: '0 16px 48px rgba(2,33,36,0.16)',
              height: '85vh', fontFamily: FONT,
              display: 'flex', flexDirection: 'column',
            },
          },
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.25} sx={{
          px: 2, py: 1.25,
          borderBottom: `1px solid ${T.dividerSoft}`,
          bgcolor: T.cream, flexShrink: 0,
        }}>
          <Box sx={{
            width: 30, height: 30, borderRadius: '8px',
            bgcolor: T.sageSoft,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <DescriptionOutlined sx={{ fontSize: 16, color: T.sageText }} />
          </Box>
          <Typography noWrap sx={{
            flex: 1, fontSize: '0.9rem', fontWeight: 700, color: T.ink,
            letterSpacing: '-0.01em', fontFamily: FONT,
          }}>
            {previewTarget?.filename}
          </Typography>
          <Tooltip title="Download DOCX">
            <IconButton
              onClick={() => previewTarget && handleDownload(previewTarget)}
              size="small"
              sx={{ color: T.sageText, '&:hover': { bgcolor: T.sageSoft, color: T.pine } }}
            >
              <FileDownloadOutlined sx={{ fontSize: 19 }} />
            </IconButton>
          </Tooltip>
          <IconButton
            onClick={closePreview}
            size="small"
            sx={{ color: T.muted, '&:hover': { bgcolor: T.hoverBg, color: T.ink } }}
          >
            <CloseRounded sx={{ fontSize: 20 }} />
          </IconButton>
        </Stack>

        <Box sx={{ flex: 1, minHeight: 0, bgcolor: '#ECEFE9', position: 'relative' }}>
          {previewLoading && (
            <Stack alignItems="center" justifyContent="center" spacing={1.25}
              sx={{ position: 'absolute', inset: 0 }}>
              <CircularProgress size={28} sx={{ color: T.sage }} />
              <Typography sx={{ fontSize: '0.8rem', color: T.muted, fontWeight: 600, fontFamily: FONT }}>
                Loading preview…
              </Typography>
            </Stack>
          )}
          {previewUrl && (
            <Box
              component="iframe"
              src={previewUrl}
              title={`Preview — ${previewTarget?.filename || ''}`}
              sx={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
            />
          )}
        </Box>
      </Dialog>
    </Box>
  );
};

export default WorkspaceHome;