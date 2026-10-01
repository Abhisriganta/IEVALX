import React, { useState, useMemo } from 'react';
import {
  Box, Paper, Typography, Button, TextField, MenuItem, Card,
  IconButton, Avatar, CircularProgress, Alert, InputAdornment,
  Dialog, DialogContent, DialogActions,
  ToggleButton, ToggleButtonGroup, Pagination, Select, Tooltip,
  LinearProgress,
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  Refresh as RefreshIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  ViewModule as ViewModuleIcon,
  ViewList as ViewListIcon,
  EditOutlined as EditReqIcon,
  Replay as RepublishIcon,
  Schedule as ScheduleIcon,
  WorkOutlineOutlined as JobIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useJobsApprovals } from '@/hooks/company/useJobsApprovals';

/* ── Brand tokens — EXACT mirror of FindJobs BRAND.* ───────────────── */
const BRAND = {
  navy:         '#022124',
  navyDark:     '#0A3A38',
  navySoft:     'rgba(127,158,126,0.10)',
  sage:         '#7F9E7E',
  sageDark:     '#6C8B6B',
  sageText:     '#5E815D',
  sageSoft:     '#EDF3EC',
  border:       '#E7EAE3',
  borderStrong: '#D8DDD4',
  muted:        '#55584F',
  ink:          '#101210',
  bg:           '#F6F8F3',
  surface:      '#FFFFFF',
};
const FONT = "'Jost','DM Sans',sans-serif";
const PAGE_SIZE_OPTIONS = [5, 10, 25, 50, 'all'];

const formatRequestedAt = (iso) => {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return String(iso); }
};

const initials = (name) => {
  if (!name) return '?';
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/* ═══════════════════════════════════════════════════════════════════
   Shared FindJobs-format page for employer requests
   mode: 'edit' | 'republish'
   ═══════════════════════════════════════════════════════════════════ */
const RequestsPage = ({ mode }) => {
  const isEdit = mode === 'edit';
  const { enqueueSnackbar } = useSnackbar();

  const {
    editRequests,
    editRequestsLoading,
    editRequestsError,
    refetchEditRequests,
    approveEditRequest,
    rejectEditRequest,
    republishRequests = [],
    republishRequestsLoading = false,
    republishRequestsError = null,
    refetchRepublishRequests = () => {},
    approveRepublishRequest = async () => {},
    rejectRepublishRequest = async () => {},
  } = useJobsApprovals();

  const requests  = isEdit ? editRequests : republishRequests;
  const loading   = isEdit ? editRequestsLoading : republishRequestsLoading;
  const error     = isEdit ? editRequestsError : republishRequestsError;
  const onRefresh = isEdit ? refetchEditRequests : refetchRepublishRequests;
  const onApprove = isEdit ? approveEditRequest : approveRepublishRequest;
  const onReject  = isEdit ? rejectEditRequest : rejectRepublishRequest;

  const title    = isEdit ? 'Edit Requests' : 'Republish Requests';
  const subtitle = isEdit
    ? 'Approving lets the employer save changes once. After they save, they need to request again.'
    : 'Approving puts the job back live on the student portal.';
  const HeaderIcon = isEdit ? EditReqIcon : RepublishIcon;

  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [rejectDialog, setRejectDialog] = useState(null);
  const [approveDialog, setApproveDialog] = useState(null);
  const [adminNote, setAdminNote] = useState('');
  const [busy, setBusy] = useState(false);

  /* ── Filter + paginate (FindJobs pattern) ── */
  const filtered = useMemo(() => {
    const lc = search.trim().toLowerCase();
    if (!lc) return requests;
    return requests.filter((r) => {
      const haystack = [
        r.requester_name, r.requester_email, r.requester_role,
        r.job_title, r.reason,
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(lc);
    });
  }, [requests, search]);

  const effectivePageSize = pageSize === 'all' ? Math.max(filtered.length, 1) : pageSize;
  const totalPages = Math.max(1, Math.ceil(filtered.length / effectivePageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = useMemo(() => {
    const start = (safePage - 1) * effectivePageSize;
    return filtered.slice(start, start + effectivePageSize);
  }, [filtered, safePage, effectivePageSize]);

  /* ── Actions ── */
  const confirmApprove = async () => {
    if (!approveDialog) return;
    setBusy(true);
    try {
      await onApprove(approveDialog.id);
      enqueueSnackbar(
        isEdit
          ? `Edit access granted to ${approveDialog.requester_name || 'employer'} for "${approveDialog.job_title || 'job'}"`
          : `"${approveDialog.job_title || 'Job'}" republished — now live on the student portal`,
        { variant: 'success' },
      );
      setApproveDialog(null);
    } catch (err) {
      enqueueSnackbar(err?.message || 'Failed to approve request', { variant: 'error' });
    } finally { setBusy(false); }
  };

  const confirmReject = async () => {
    if (!rejectDialog) return;
    setBusy(true);
    try {
      await onReject(rejectDialog.id, adminNote.trim());
      enqueueSnackbar(
        `${isEdit ? 'Edit' : 'Republish'} request from ${rejectDialog.requester_name || 'employer'} rejected`,
        { variant: 'info' },
      );
      setRejectDialog(null);
    } catch (err) {
      enqueueSnackbar(err?.message || 'Failed to reject request', { variant: 'error' });
    } finally { setBusy(false); }
  };

  /* ═══ Render ═══ */
  return (
    <Box className="page-fade-in" sx={{
      p: { xs: 1.5, sm: 2, md: 3, lg: 4 },
      maxWidth: 1440, mx: 'auto', bgcolor: BRAND.bg, minHeight: '100vh',
      fontFamily: FONT,
      '& .MuiTypography-root, & .MuiButton-root, & .MuiChip-root, & .MuiInputBase-root, & .MuiMenuItem-root, & .MuiPaginationItem-root': { fontFamily: FONT },
    }}>
      {/* ── Command header (FindJobs Paper) ─────────────────────────── */}
      <Paper elevation={0} sx={{
        bgcolor: BRAND.surface, border: `1px solid ${BRAND.border}`,
        borderRadius: { xs: '14px', sm: '16px' },
        p: { xs: 2, sm: 2.5, md: 3 }, mb: { xs: 2, md: 2.5 },
        boxShadow: '0 1px 2px rgba(16,18,16,0.04)',
      }}>
        {/* Row 1 — Title + refresh */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5, mb: { xs: 2, md: 2.25 } }}>
          <Box sx={{ display: 'flex', gap: 1.5, minWidth: 0, alignItems: 'flex-start' }}>
            <Box sx={{
              width: 42, height: 42, borderRadius: '12px', flexShrink: 0,
              bgcolor: BRAND.sageSoft, color: BRAND.sageText,
              display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 0.25,
            }}>
              <HeaderIcon sx={{ fontSize: 22 }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography component="h1" sx={{
                fontWeight: 700, color: BRAND.ink, letterSpacing: '-0.02em',
                lineHeight: 1.15, fontSize: { xs: '1.3rem', sm: '1.45rem', md: '1.6rem' },
              }}>
                {title}
              </Typography>
              <Typography sx={{ color: BRAND.muted, fontSize: { xs: '0.82rem', sm: '0.9rem' }, fontWeight: 500, mt: 0.5 }}>
                <Box component="span" sx={{ color: BRAND.sageText, fontWeight: 700 }}>
                  {filtered.length} pending
                </Box>
                {' · '}{subtitle}
              </Typography>
            </Box>
          </Box>
          <Tooltip title="Refresh" arrow>
            <span>
              <IconButton onClick={onRefresh} disabled={loading} size="small" sx={{
                color: BRAND.muted, border: `1px solid ${BRAND.borderStrong}`, borderRadius: '9px',
                '&:hover': { bgcolor: BRAND.sageSoft, color: BRAND.navy, borderColor: BRAND.sage },
              }}>
                <RefreshIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </span>
          </Tooltip>
        </Box>

        {/* Row 2 — Search pill + view toggle */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            placeholder="Search by employer, job title or reason…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: BRAND.muted, fontSize: 20 }} /></InputAdornment>,
                endAdornment: search ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearch('')} sx={{ color: BRAND.muted, '&:hover': { color: BRAND.ink } }}>
                      <ClearIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              },
            }}
            sx={{
              flex: '1 1 300px', minWidth: { xs: '100%', sm: 260 },
              '& .MuiOutlinedInput-root': {
                bgcolor: BRAND.bg, borderRadius: '25px',
                fontSize: { xs: '0.88rem', sm: '0.92rem' }, height: { xs: 46, md: 48 },
                color: BRAND.ink, fontFamily: FONT,
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                '& input::placeholder': { color: BRAND.muted, opacity: 0.85 },
                '& fieldset': { borderColor: '#B0BEC5', borderWidth: '1.5px' },
                '&:hover fieldset': { borderColor: '#78909C', borderWidth: '2px' },
                '&.Mui-focused': { boxShadow: '0 6px 18px rgba(0,0,0,0.12)' },
                '&.Mui-focused fieldset': { borderColor: BRAND.sage, borderWidth: '2px' },
              },
            }}
          />
          <ToggleButtonGroup value={viewMode} exclusive onChange={(e, v) => v && setViewMode(v)} sx={{
            height: 38, flexShrink: 0, bgcolor: BRAND.bg,
            border: `1px solid ${BRAND.border}`, borderRadius: '10px', p: '3px',
            '& .MuiToggleButton-root': {
              border: 0, borderRadius: '7px !important', m: 0, color: BRAND.muted, px: 1.25, height: 30,
              '&:hover': { bgcolor: 'rgba(16,18,16,0.04)' },
              '&.Mui-selected': { bgcolor: BRAND.surface, color: BRAND.navy, boxShadow: '0 1px 3px rgba(16,18,16,0.12)', '&:hover': { bgcolor: BRAND.surface } },
            },
          }}>
            <ToggleButton value="grid"><ViewModuleIcon sx={{ fontSize: 18 }} /></ToggleButton>
            <ToggleButton value="list"><ViewListIcon sx={{ fontSize: 18 }} /></ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: '12px' }}
          action={<Button size="small" onClick={onRefresh} sx={{ color: '#B4462F', fontWeight: 700, textTransform: 'none' }}>Retry</Button>}
        >
          {typeof error === 'string' ? error : error?.message || 'Failed to load requests.'}
        </Alert>
      )}

      {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1, '& .MuiLinearProgress-bar': { bgcolor: BRAND.sage } }} />}

      {/* ── Results ─────────────────────────────────────────────────── */}
      {filtered.length === 0 && !loading ? (
        <Paper elevation={0} sx={{
          textAlign: 'center', py: 8, px: 3, borderRadius: '14px',
          border: `1px solid ${BRAND.border}`, bgcolor: BRAND.surface,
        }}>
          <Box sx={{ width: 64, height: 64, borderRadius: '50%', bgcolor: BRAND.sageSoft, mx: 'auto', mb: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <HeaderIcon sx={{ fontSize: 30, color: BRAND.sage }} />
          </Box>
          <Typography sx={{ fontWeight: 700, color: BRAND.ink, mb: 0.75, fontSize: '1.0625rem' }}>
            {search ? 'No matching requests' : `No pending ${isEdit ? 'edit' : 'republish'} requests`}
          </Typography>
          <Typography sx={{ color: BRAND.muted, mb: search ? 3 : 0, fontSize: '0.875rem' }}>
            {search ? 'Try adjusting your search.' : 'New requests from employers will appear here.'}
          </Typography>
          {search && (
            <Button variant="outlined" onClick={() => setSearch('')} sx={{
              borderColor: BRAND.navy, color: BRAND.navy, textTransform: 'none', fontWeight: 500, px: 3, borderRadius: '10px',
              '&:hover': { borderColor: BRAND.navyDark, bgcolor: BRAND.navySoft },
            }}>Clear search</Button>
          )}
        </Paper>
      ) : (
        <>
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: viewMode === 'grid' ? 'repeat(2, minmax(0, 1fr))' : '1fr',
              lg: viewMode === 'grid' ? 'repeat(3, minmax(0, 1fr))' : '1fr',
            },
            gap: { xs: 1.5, sm: 1.75, md: 2 }, width: '100%',
          }}>
            {paginated.map((r) => (
              <Card key={r.id} elevation={0} sx={{
                borderRadius: '14px', border: `1px solid ${BRAND.border}`,
                bgcolor: BRAND.surface, p: { xs: 1.75, sm: 2, md: 2.25 },
                boxShadow: '0 1px 3px rgba(2,33,36,0.05), 0 4px 12px rgba(2,33,36,0.04)',
                transition: 'transform 0.25s cubic-bezier(0.22,1,0.36,1), box-shadow 0.25s ease, border-color 0.18s ease',
                display: 'flex', flexDirection: 'column',
                '&:hover': {
                  transform: 'translateY(-3px)', borderColor: BRAND.sage,
                  boxShadow: '0 8px 24px rgba(2,33,36,0.08), 0 2px 6px rgba(127,158,126,0.10)',
                },
                '@media (prefers-reduced-motion: reduce)': { transition: 'none', '&:hover': { transform: 'none' } },
              }}>
                {/* Top — requester */}
                <Box sx={{ display: 'flex', gap: 1.5, minWidth: 0, mb: { xs: 1.25, sm: 1.5 } }}>
                  <Avatar variant="rounded" sx={{
                    width: { xs: 38, sm: 42 }, height: { xs: 38, sm: 42 }, flexShrink: 0,
                    bgcolor: BRAND.navy, color: BRAND.sage,
                    fontWeight: 700, fontSize: { xs: '0.85rem', sm: '0.95rem' },
                    borderRadius: '10px',
                  }}>
                    {initials(r.requester_name)}
                  </Avatar>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Tooltip title={r.requester_name || '—'} arrow enterDelay={300} placement="top-start">
                      <Typography sx={{
                        fontWeight: 700, mb: 0.25, fontFamily: FONT,
                        fontSize: { xs: '0.88rem', sm: '0.95rem' },
                        color: BRAND.ink, overflow: 'hidden', textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap', lineHeight: 1.3,
                      }}>
                        {r.requester_name || '—'}
                      </Typography>
                    </Tooltip>
                    {(() => {
                      const roleLabel =
                        String(r.requester_role || '').toUpperCase() === 'OTHER' && r.requester_role_other
                          ? r.requester_role_other
                          : (r.requester_role || '—');
                      return (
                        <Tooltip title={`${roleLabel}${r.requester_email ? ' · ' + r.requester_email : ''}`} arrow enterDelay={300} placement="bottom-start">
                          <Typography sx={{
                            fontSize: { xs: '0.72rem', sm: '0.78rem' }, color: BRAND.muted,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {roleLabel}{r.requester_email ? ` · ${r.requester_email}` : ''}
                          </Typography>
                        </Tooltip>
                      );
                    })()}
                  </Box>
                </Box>

                {/* Job */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1, minWidth: 0 }}>
                  <JobIcon sx={{ fontSize: 15, color: BRAND.sageText, flexShrink: 0 }} />
                  <Tooltip title={`${r.job_title || '—'} · Job #${r.job_id}`} arrow enterDelay={300}>
                    <Typography sx={{
                      fontWeight: 600, fontSize: { xs: '0.8rem', sm: '0.85rem' }, color: BRAND.ink,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {r.job_title || '—'} <Box component="span" sx={{ color: BRAND.muted, fontWeight: 500, fontSize: '0.74rem' }}>· #{r.job_id}</Box>
                    </Typography>
                  </Tooltip>
                </Box>

                {/* Reason */}
                <Tooltip title={r.reason || ''} arrow enterDelay={300} disableHoverListener={!r.reason}>
                  <Typography sx={{
                    fontSize: { xs: '0.78rem', sm: '0.82rem' }, color: BRAND.muted, lineHeight: 1.55,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    overflow: 'hidden', mb: 1.25, flexGrow: 1,
                  }}>
                    {r.reason || 'No reason provided.'}
                  </Typography>
                </Tooltip>

                {/* Requested at */}
                <Tooltip title={`Requested on ${formatRequestedAt(r.requested_at)}`} arrow enterDelay={300}>
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: BRAND.muted, mb: 1.5, cursor: 'default' }}>
                    <ScheduleIcon sx={{ fontSize: 13 }} />
                    <Typography sx={{ fontSize: '0.72rem', fontWeight: 500 }}>{formatRequestedAt(r.requested_at)}</Typography>
                  </Box>
                </Tooltip>

                {/* Footer — actions */}
                <Box sx={{
                  display: 'flex', gap: 1, pt: { xs: 1.25, sm: 1.5 },
                  mt: 'auto', borderTop: `1px solid ${BRAND.border}`,
                }}>
                  <Button
                    size="small" variant="outlined" fullWidth
                    startIcon={<RejectIcon sx={{ fontSize: 15 }} />}
                    onClick={() => { setRejectDialog(r); setAdminNote(''); }}
                    disabled={busy}
                    sx={{
                      textTransform: 'none', fontWeight: 600, borderRadius: '10px',
                      color: '#B4462F', borderColor: 'rgba(180,70,47,0.4)',
                      '&:hover': { bgcolor: '#FBECEA', borderColor: '#B4462F' },
                    }}
                  >
                    Reject
                  </Button>
                  <Button
                    size="small" variant="contained" fullWidth disableElevation
                    startIcon={<ApproveIcon sx={{ fontSize: 15 }} />}
                    onClick={() => setApproveDialog(r)}
                    disabled={busy}
                    sx={{
                      textTransform: 'none', fontWeight: 700, borderRadius: '10px',
                      bgcolor: BRAND.sage, color: '#fff',
                      '&:hover': { bgcolor: BRAND.sageDark },
                    }}
                  >
                    Approve
                  </Button>
                </Box>
              </Card>
            ))}
          </Box>

          {/* ── Pagination bar (FindJobs exact) ─────────────────────── */}
          {filtered.length > 0 && (
            <Box sx={{
              mt: { xs: 3, sm: 3.5, md: 4 }, display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between',
              alignItems: { xs: 'stretch', sm: 'center' }, gap: { xs: 1.5, sm: 2 },
            }}>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 1, sm: 2 }, alignItems: { xs: 'flex-start', sm: 'center' }, flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: { xs: '0.78rem', sm: '0.82rem' }, color: BRAND.muted, fontWeight: 500, whiteSpace: 'nowrap' }}>
                  Showing{' '}<Box component="span" sx={{ color: BRAND.ink, fontWeight: 700 }}>{(safePage - 1) * effectivePageSize + 1}–{Math.min(safePage * effectivePageSize, filtered.length)}</Box>
                  {' '}of{' '}<Box component="span" sx={{ color: BRAND.ink, fontWeight: 700 }}>{filtered.length}</Box>{' '}requests
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
                  <Typography sx={{ fontSize: { xs: '0.78rem', sm: '0.82rem' }, color: BRAND.muted, fontWeight: 500 }}>Show</Typography>
                  <Select size="small" value={pageSize}
                    onChange={(e) => { const v = e.target.value; setPageSize(v === 'all' ? 'all' : Number(v)); setPage(1); }}
                    renderValue={(v) => (v === 'all' ? 'All' : v)}
                    MenuProps={{ slotProps: { paper: { sx: {
                      borderRadius: '12px', mt: 0.5, border: `1px solid ${BRAND.border}`, boxShadow: '0 8px 24px rgba(2,33,36,0.12)',
                      '& .MuiMenuItem-root': { fontSize: '0.82rem', fontWeight: 600, fontFamily: FONT, color: BRAND.ink, minHeight: { xs: 40, sm: 36 },
                        '&.Mui-selected': { bgcolor: BRAND.navySoft, color: BRAND.navy, '&:hover': { bgcolor: BRAND.navySoft } },
                      },
                    } } } }}
                    sx={{
                      fontSize: '0.82rem', fontWeight: 700, fontFamily: FONT, color: BRAND.navy,
                      bgcolor: BRAND.bg, borderRadius: '10px', minWidth: { xs: 76, sm: 80 }, height: { xs: 38, sm: 36 },
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: BRAND.border },
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: BRAND.navy },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: BRAND.navy, borderWidth: '1px' },
                      '& .MuiSelect-select': { py: 0.75, pl: 1.25, pr: '28px !important' },
                      '& .MuiSvgIcon-root': { color: BRAND.navy },
                    }}
                  >
                    {PAGE_SIZE_OPTIONS.map((opt) => <MenuItem key={opt} value={opt}>{opt === 'all' ? 'All' : opt}</MenuItem>)}
                  </Select>
                  <Typography sx={{ fontSize: { xs: '0.78rem', sm: '0.82rem' }, color: BRAND.muted, fontWeight: 500 }}>per page</Typography>
                </Box>
              </Box>
              <Pagination count={totalPages} page={safePage} onChange={(_e, v) => setPage(v)} shape="rounded" siblingCount={1} boundaryCount={1} size="small"
                sx={{
                  '& .MuiPaginationItem-root': {
                    fontSize: { xs: '0.75rem', sm: '0.82rem' }, fontWeight: 600, fontFamily: FONT, color: BRAND.ink,
                    borderRadius: '8px', border: `1px solid ${BRAND.border}`, bgcolor: BRAND.bg,
                    minWidth: { xs: 32, sm: 36 }, height: { xs: 32, sm: 36 },
                    '&:hover': { bgcolor: BRAND.navySoft, borderColor: BRAND.sage },
                    '&.Mui-selected': { bgcolor: BRAND.navy, color: '#fff', borderColor: BRAND.navy, fontWeight: 700, boxShadow: '0 4px 12px rgba(2,33,36,0.2)', '&:hover': { bgcolor: BRAND.navyDark } },
                  },
                  '& .MuiPaginationItem-ellipsis': { border: 'none', bgcolor: 'transparent' },
                }}
              />
            </Box>
          )}
        </>
      )}

      {/* ── Approve confirm dialog (rich gradient) ──────────────────── */}
      <Dialog open={Boolean(approveDialog)} onClose={() => !busy && setApproveDialog(null)} maxWidth="xs" fullWidth
        slotProps={{ paper: { sx: { borderRadius: '18px', overflow: 'hidden', boxShadow: '0 24px 64px rgba(2,33,36,0.22)', fontFamily: FONT } } }}
      >
        {approveDialog && (<>
          <Box sx={{
            background: 'linear-gradient(160deg, #08302F 0%, #0E1E1D 70%, #121615 100%)',
            px: { xs: 2.5, sm: 3 }, pt: { xs: 2.5, sm: 3 }, pb: { xs: 2.25, sm: 2.75 },
            position: 'relative', overflow: 'hidden', textAlign: 'center',
          }}>
            <Box sx={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />
            <Box sx={{
              width: 56, height: 56, borderRadius: '16px', mx: 'auto', mb: 2,
              bgcolor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <ApproveIcon sx={{ color: BRAND.sage, fontSize: 28 }} />
            </Box>
            <Typography sx={{ fontWeight: 700, color: 'rgba(255,255,255,0.97)', fontSize: { xs: '1.1rem', sm: '1.2rem' }, lineHeight: 1.2, mb: 0.5 }}>
              Approve this request?
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: { xs: '0.76rem', sm: '0.82rem' }, fontWeight: 500 }}>
              {isEdit ? 'Grants a one-time edit window' : 'The job goes live for students'}
            </Typography>
          </Box>
          <DialogContent sx={{ pt: { xs: 2.5, sm: 3 }, pb: { xs: 1.5, sm: 2 }, px: { xs: 2.5, sm: 3 }, bgcolor: BRAND.surface }}>
            <Typography sx={{ color: BRAND.muted, lineHeight: 1.65, fontSize: { xs: '0.82rem', sm: '0.88rem' } }}>
              {isEdit
                ? <><strong>{approveDialog.requester_name || 'The employer'}</strong> will be able to save changes to <strong>"{approveDialog.job_title || 'this job'}"</strong> once. After saving, they will need to request access again.</>
                : <><strong>"{approveDialog.job_title || 'This job'}"</strong> will be republished to the student portal immediately, and <strong>{approveDialog.requester_name || 'the employer'}</strong> will be notified.</>}
            </Typography>
          </DialogContent>
          <DialogActions sx={{
            px: { xs: 2.5, sm: 3 }, py: { xs: 1.75, sm: 2 }, gap: 1,
            bgcolor: BRAND.surface, borderTop: `1px solid ${BRAND.border}`,
            flexDirection: { xs: 'column-reverse', sm: 'row' }, alignItems: 'stretch',
          }}>
            <Button onClick={() => setApproveDialog(null)} disabled={busy} sx={{
              borderRadius: '12px', textTransform: 'none', fontWeight: 600, color: BRAND.muted,
              border: `1px solid ${BRAND.border}`,
              width: { xs: '100%', sm: 'auto' }, minHeight: { xs: 44, sm: 'auto' },
              '&:hover': { bgcolor: BRAND.navySoft },
            }}>Cancel</Button>
            <Button variant="contained" onClick={confirmApprove} disabled={busy} disableElevation
              startIcon={busy ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <ApproveIcon sx={{ fontSize: 16 }} />}
              sx={{
                borderRadius: '12px', textTransform: 'none', fontWeight: 700, px: 3,
                width: { xs: '100%', sm: 'auto' }, minHeight: { xs: 48, sm: 'auto' },
                bgcolor: BRAND.sage, color: '#fff',
                '&:hover': { bgcolor: BRAND.sageDark },
                '&.Mui-disabled': { bgcolor: BRAND.sage, color: 'rgba(255,255,255,0.6)', opacity: 0.85 },
              }}
            >{busy ? 'Approving…' : 'Approve'}</Button>
          </DialogActions>
        </>)}
      </Dialog>

      {/* ── Reject dialog (rich gradient) ───────────────────────────── */}
      <Dialog open={Boolean(rejectDialog)} onClose={() => !busy && setRejectDialog(null)} maxWidth="xs" fullWidth
        slotProps={{ paper: { sx: { borderRadius: '18px', overflow: 'hidden', boxShadow: '0 24px 64px rgba(2,33,36,0.22)', fontFamily: FONT } } }}
      >
        {rejectDialog && (<>
          <Box sx={{
            background: 'linear-gradient(160deg, #4A1A12 0%, #331210 70%, #250E0B 100%)',
            px: { xs: 2.5, sm: 3 }, pt: { xs: 2.5, sm: 3 }, pb: { xs: 2.25, sm: 2.75 },
            position: 'relative', overflow: 'hidden', textAlign: 'center',
          }}>
            <Box sx={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />
            <Box sx={{
              width: 56, height: 56, borderRadius: '16px', mx: 'auto', mb: 2,
              bgcolor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <RejectIcon sx={{ color: '#E8897A', fontSize: 28 }} />
            </Box>
            <Typography sx={{ fontWeight: 700, color: 'rgba(255,255,255,0.97)', fontSize: { xs: '1.1rem', sm: '1.2rem' }, lineHeight: 1.2, mb: 0.5 }}>
              Reject this request?
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: { xs: '0.76rem', sm: '0.82rem' }, fontWeight: 500 }}>
              The employer will be notified
            </Typography>
          </Box>
          <DialogContent sx={{ pt: { xs: 2.5, sm: 3 }, pb: { xs: 1.5, sm: 2 }, px: { xs: 2.5, sm: 3 }, bgcolor: BRAND.surface }}>
            <Typography sx={{ mb: 2, color: BRAND.muted, lineHeight: 1.65, fontSize: { xs: '0.82rem', sm: '0.88rem' } }}>
              Rejecting <strong>{rejectDialog.requester_name || 'this request'}</strong>'s request for{' '}
              <strong>"{rejectDialog.job_title || 'this job'}"</strong>. They can submit a new request afterwards.
            </Typography>
            <TextField
              fullWidth multiline rows={3}
              label="Note for the employer (optional)"
              placeholder="e.g. Please coordinate with HR before changing the salary range."
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              disabled={busy}
              inputProps={{ maxLength: 2000 }}
              helperText={`${adminNote.length}/2000`}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px', bgcolor: BRAND.surface, fontFamily: FONT,
                  '& fieldset': { borderColor: BRAND.border },
                  '&:hover fieldset': { borderColor: BRAND.borderStrong },
                  '&.Mui-focused fieldset': { borderColor: BRAND.sage, borderWidth: 2 },
                },
                '& .MuiInputLabel-root': { fontFamily: FONT },
                '& .MuiInputLabel-root.Mui-focused': { color: BRAND.sageText },
                '& .MuiFormHelperText-root': { fontFamily: FONT },
              }}
            />
          </DialogContent>
          <DialogActions sx={{
            px: { xs: 2.5, sm: 3 }, py: { xs: 1.75, sm: 2 }, gap: 1,
            bgcolor: BRAND.surface, borderTop: `1px solid ${BRAND.border}`,
            flexDirection: { xs: 'column-reverse', sm: 'row' }, alignItems: 'stretch',
          }}>
            <Button onClick={() => setRejectDialog(null)} disabled={busy} sx={{
              borderRadius: '12px', textTransform: 'none', fontWeight: 600, color: BRAND.muted,
              border: `1px solid ${BRAND.border}`,
              width: { xs: '100%', sm: 'auto' }, minHeight: { xs: 44, sm: 'auto' },
              '&:hover': { bgcolor: BRAND.navySoft },
            }}>Cancel</Button>
            <Button variant="contained" onClick={confirmReject} disabled={busy} disableElevation
              startIcon={busy ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <RejectIcon sx={{ fontSize: 16 }} />}
              sx={{
                borderRadius: '12px', textTransform: 'none', fontWeight: 700, px: 3,
                width: { xs: '100%', sm: 'auto' }, minHeight: { xs: 48, sm: 'auto' },
                bgcolor: '#B4462F', color: '#fff',
                '&:hover': { bgcolor: '#8A3522' },
                '&.Mui-disabled': { bgcolor: '#B4462F', color: 'rgba(255,255,255,0.6)', opacity: 0.85 },
              }}
            >{busy ? 'Rejecting…' : 'Reject Request'}</Button>
          </DialogActions>
        </>)}
      </Dialog>
    </Box>
  );
};

export const EditRequestsPage = () => <RequestsPage mode="edit" />;
export const RepublishRequestsPage = () => <RequestsPage mode="republish" />;
export default RequestsPage;