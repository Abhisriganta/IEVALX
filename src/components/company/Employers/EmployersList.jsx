import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Paper, Card, TextField, InputAdornment,
  Button, Avatar, IconButton, Chip,
  ToggleButton, ToggleButtonGroup,
  CircularProgress, Tooltip, Badge,
  Menu, MenuItem, ListItemIcon, ListItemText, Divider,
  Dialog, DialogContent, DialogActions,
  Pagination, Select,
  useTheme, useMediaQuery,
} from '@mui/material';
import {
  Add, Search, MoreVert, Delete, Block, CheckCircle,
  EditOutlined, ViewModule, ViewList,
  GroupOutlined, WorkOutlineOutlined, HourglassEmptyOutlined,
  BusinessCenterOutlined, ApartmentOutlined, LocationOnOutlined,
  PhoneOutlined, ClearRounded, RefreshOutlined,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useEmployers } from '@/hooks/company';
import { getInitials, formatDate } from '@/utils/formatters';
import AddEmployerDialog from './AddEmployers';

/* ── Brand tokens — EXACT mirror of FindJobs.jsx BRAND.* ───────────────
   Canonical source: src/components/jobseeker/LiveChat/theme.js
   ───────────────────────────────────────────────────────────────────── */
const BRAND = {
  navy:          '#022124',
  navyDark:      '#0A3A38',
  navySoft:      'rgba(127,158,126,0.10)',
  navySoftHover: 'rgba(127,158,126,0.18)',
  sage:          '#7F9E7E',
  sageDark:      '#6C8B6B',
  sageText:      '#5E815D',
  sageSoft:      '#EDF3EC',
  border:        '#E7EAE3',
  borderStrong:  '#D8DDD4',
  muted:         '#55584F',
  ink:           '#101210',
  bg:            '#F6F8F3',
  surface:       '#FFFFFF',
};

const FONT = "'Jost','DM Sans',sans-serif";

/* ── Status tokens ───────────────────────────────────────────────────── */
const STATUS_STYLE = {
  ACTIVE:   { bg: '#EAF2E9', tx: '#3E6E3E', dot: '#3E6E3E', label: 'Active'   },
  INACTIVE: { bg: '#E8EFEF', tx: BRAND.muted, dot: '#A8ADA8', label: 'Inactive' },
  PENDING:  { bg: '#F6ECDF', tx: '#A35A2D',  dot: '#A35A2D',  label: 'Pending'  },
};
const statusStyle = (s) => STATUS_STYLE[s] || STATUS_STYLE.PENDING;

/* ── Status filter options — mirrors FindJobs APPLIED_FILTER_OPTIONS ── */
const STATUS_FILTER_OPTIONS = [
  { value: 'ALL',      label: 'All'      },
  { value: 'ACTIVE',   label: 'Active'   },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'PENDING',  label: 'Pending'  },
];

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50, 'all'];
const DEFAULT_PAGE_SIZE = 10;

const AVATAR_COLORS = ['#7F9E7E', '#4E6E4D', '#A35A2D', '#0A3F42', '#55584F'];
const avatarColor = (emp) => {
  const key = String(emp.id ?? emp.employer_id ?? emp.full_name ?? '');
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
};

const resolveRole = (e) => (e.role === 'Other' && e.role_other ? e.role_other : e.role) || '—';
const resolveDept = (e) =>
  (e.department === 'Other' && e.department_other ? e.department_other : e.department) || '—';

/* ── StatusBadge ─────────────────────────────────────────────────────── */
const StatusBadge = ({ status }) => {
  const s = statusStyle(status);
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex', alignItems: 'center',
        gap: 0.6, height: 24, px: 1.1,
        borderRadius: '8px',
        bgcolor: s.bg, color: s.tx,
        fontSize: '0.72rem', fontWeight: 700,
        fontFamily: FONT, whiteSpace: 'nowrap',
        border: `1px solid ${s.bg}`,
      }}
    >
      <Box component="span" sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: s.dot }} />
      {s.label}
    </Box>
  );
};

/* ── InfoRow — meta data line ────────────────────────────────────────── */
const InfoRow = ({ icon, children }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: BRAND.muted, minWidth: 0 }}>
    {icon}
    <Typography sx={{
      fontSize: { xs: '0.7rem', sm: '0.74rem' },
      fontWeight: 500, fontFamily: FONT,
      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      maxWidth: { xs: 140, sm: 180 },
    }}>{children}</Typography>
  </Box>
);

/* ═══════════════════════════════════════════════════════════════════════
   EmployersList — FindJobs visual system
   ═══════════════════════════════════════════════════════════════════════ */
const EmployersList = () => {
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [dialogOpen, setDialogOpen] = useState(false);

  const {
    employers,
    loading,
    error,
    addEmployer,
    updateEmployer,
    toggleStatus,
    removeEmployer,
    refetch,
  } = useEmployers({ formOpen: dialogOpen });

  const [search,     setSearch]     = useState('');
  const [statusTab,  setStatusTab]  = useState('ALL');
  const [editingEmp, setEditingEmp] = useState(null);

  const [viewMode, setViewMode] = useState('grid');

  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const [menuAnchor, setMenuAnchor] = useState(null);
  const [selected,   setSelected]   = useState(null);
  const menuOpen = Boolean(menuAnchor);

  useEffect(() => {
    setMenuAnchor(null);
    setSelected(null);
  }, [employers]);

  const [confirm,     setConfirm]     = useState(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  /* ── Stats ─────────────────────────────────────────────────────────── */
  const stats = useMemo(() => ({
    total:    employers.length,
    active:   employers.filter((e) => e.status === 'ACTIVE').length,
    inactive: employers.filter((e) => e.status === 'INACTIVE').length,
    pending:  employers.filter((e) => e.status === 'PENDING').length,
    openJobs: employers.reduce((sum, e) => sum + (Number(e.active_jobs) || 0), 0),
  }), [employers]);

  /* ── Filter + search ───────────────────────────────────────────────── */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employers.filter((e) => {
      if (statusTab !== 'ALL' && e.status !== statusTab) return false;
      if (!q) return true;
      return (
        (e.full_name        || '').toLowerCase().includes(q) ||
        (e.email            || '').toLowerCase().includes(q) ||
        (e.employer_id      || '').toLowerCase().includes(q) ||
        (e.department       || '').toLowerCase().includes(q) ||
        (e.department_other || '').toLowerCase().includes(q) ||
        (e.role             || '').toLowerCase().includes(q) ||
        (e.role_other       || '').toLowerCase().includes(q) ||
        (e.location         || '').toLowerCase().includes(q)
      );
    });
  }, [employers, search, statusTab]);

  /* ── Pagination (mirrors FindJobs exactly) ─────────────────────────── */
  const effectivePageSize = pageSize === 'all' ? Math.max(filtered.length, 1) : pageSize;
  const totalPages = Math.max(1, Math.ceil(filtered.length / effectivePageSize));

  useEffect(() => { if (page > totalPages) setPage(1); }, [totalPages, page]);
  useEffect(() => { setPage(1); }, [search, statusTab, pageSize]);

  const paginated = useMemo(() => {
    const start = (page - 1) * effectivePageSize;
    return filtered.slice(start, start + effectivePageSize);
  }, [filtered, page, effectivePageSize]);

  const handlePageChange = (_e, value) => setPage(value);

  /* ── Status filter counts ──────────────────────────────────────────── */
  const statusCount = (key) =>
    key === 'ALL' ? stats.total :
    key === 'ACTIVE' ? stats.active :
    key === 'INACTIVE' ? stats.inactive : stats.pending;

  /* ── Dialog / menu handlers ────────────────────────────────────────── */
  const openAddDialog  = () => { setEditingEmp(null); setDialogOpen(true); };
  const openEditDialog = (emp) => { setEditingEmp(emp); setDialogOpen(true); closeMenu(); };
  const closeDialog    = () => { setDialogOpen(false); setEditingEmp(null); };

  const openMenu  = (e, emp) => { setMenuAnchor(e.currentTarget); setSelected(emp); };
  const closeMenu = () => setMenuAnchor(null);

  const requestConfirm = (type) => {
    if (!selected) return;
    setConfirm({ type, emp: selected });
    closeMenu();
  };
  const closeConfirm = () => { if (!confirmBusy) setConfirm(null); };

  const executeConfirm = async () => {
    if (!confirm) return;
    const { type, emp } = confirm;
    setConfirmBusy(true);
    try {
      if (type === 'toggle') {
        const newStatus = await toggleStatus(emp);
        enqueueSnackbar(`${emp.full_name} is now ${newStatus.toLowerCase()}.`, { variant: 'success' });
      } else if (type === 'remove') {
        await removeEmployer(emp.id);
        enqueueSnackbar('Employer removed.', { variant: 'info' });
      }
      setConfirm(null);
    } catch (err) {
      const fallback = type === 'remove' ? 'Failed to remove employer.' : 'Failed to update status.';
      enqueueSnackbar(err.friendlyMessage || fallback, { variant: 'error' });
    } finally {
      setConfirmBusy(false);
    }
  };

  const confirmCfg = (() => {
    if (!confirm) return null;
    const { type, emp } = confirm;
    const name = emp?.full_name || 'this employer';
    if (type === 'remove') {
      return {
        icon: <Delete sx={{ color: '#E8897A', fontSize: { xs: 24, sm: 28 } }} />,
        gradient: 'linear-gradient(160deg, #4A1A12 0%, #331210 70%, #250E0B 100%)',
        title: 'Remove employer?',
        subtitle: 'This cannot be undone',
        body: <>This will permanently remove <strong>{name}</strong> from your company and revoke all their access. This action cannot be reversed.</>,
        confirmLabel: 'Remove',
        btnBg: '#B4462F', btnHover: '#8A3522',
      };
    }
    const deactivating = emp?.status === 'ACTIVE';
    return deactivating
      ? {
          icon: <Block sx={{ color: '#D4A574', fontSize: { xs: 24, sm: 28 } }} />,
          gradient: 'linear-gradient(160deg, #3D2A1A 0%, #2A1D12 70%, #1F1610 100%)',
          title: 'Deactivate employer?',
          subtitle: 'Temporarily suspend access',
          body: <><strong>{name}</strong> will be set to inactive and won't be able to access their account until you reactivate them.</>,
          confirmLabel: 'Deactivate',
          btnBg: '#A35A2D', btnHover: '#7A4422',
        }
      : {
          icon: <CheckCircle sx={{ color: BRAND.sage, fontSize: { xs: 24, sm: 28 } }} />,
          gradient: 'linear-gradient(160deg, #08302F 0%, #0E1E1D 70%, #121615 100%)',
          title: 'Activate employer?',
          subtitle: 'Restore account access',
          body: <><strong>{name}</strong> will be set to active and regain full access to their employer dashboard.</>,
          confirmLabel: 'Activate',
          btnBg: BRAND.sage, btnHover: BRAND.sageDark,
        };
  })();

  /* ── Loading ───────────────────────────────────────────────────────── */
  if (loading) return (
    <Paper elevation={0} sx={{
      display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
      minHeight: 420, borderRadius: '14px', border: `1px solid ${BRAND.border}`, bgcolor: BRAND.surface,
      my: 4, mx: 'auto', maxWidth: 1440,
    }}>
      <CircularProgress size={36} sx={{ color: BRAND.sage }} />
      <Typography sx={{ mt: 2, color: BRAND.muted, fontSize: '0.875rem', fontFamily: FONT }}>
        Loading employers…
      </Typography>
    </Paper>
  );

  if (error) return (
    <Paper elevation={0} sx={{
      textAlign: 'center', py: 8, px: 3,
      borderRadius: '14px', border: `1px solid ${BRAND.border}`, bgcolor: BRAND.surface,
      my: 4, mx: 'auto', maxWidth: 1440,
    }}>
      <Typography sx={{ color: '#B4462F', mb: 2, fontFamily: FONT }}>{error}</Typography>
      <Button variant="outlined" onClick={refetch} sx={{
        textTransform: 'none', fontWeight: 600, borderRadius: '12px',
        borderColor: BRAND.navy, color: BRAND.navy, fontFamily: FONT,
        '&:hover': { borderColor: BRAND.navyDark, bgcolor: BRAND.navySoft },
      }}>Retry</Button>
    </Paper>
  );

  /* ═══ Render ═══════════════════════════════════════════════════════ */
  return (
    <Box className="page-fade-in" sx={{
      p: { xs: 1.5, sm: 2, md: 3, lg: 4 },
      maxWidth: 1440, mx: 'auto', bgcolor: BRAND.bg, minHeight: '100vh',
      fontFamily: FONT,
      '& .MuiTypography-root, & .MuiButton-root, & .MuiToggleButton-root, & .MuiChip-root, & .MuiInputBase-root, & .MuiMenuItem-root, & .MuiPaginationItem-root': {
        fontFamily: FONT,
      },
    }}>
      {/* ── Command header (FindJobs Paper pattern) ──────────────────── */}
      <Paper
        elevation={0}
        sx={{
          bgcolor: BRAND.surface,
          border: `1px solid ${BRAND.border}`,
          borderRadius: { xs: '14px', sm: '16px' },
          p: { xs: 2, sm: 2.5, md: 3 },
          mb: { xs: 2, md: 2.5 },
          boxShadow: '0 1px 2px rgba(16,18,16,0.04)',
        }}
      >
        {/* Row 1 — Title + count + actions */}
        <Box sx={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          gap: 1.5, mb: { xs: 2, md: 2.25 },
        }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography component="h1" sx={{
              fontWeight: 700, color: BRAND.ink,
              letterSpacing: '-0.02em', lineHeight: 1.15,
              fontSize: { xs: '1.3rem', sm: '1.45rem', md: '1.6rem' },
            }}>
              Employers
            </Typography>
            <Typography sx={{
              color: BRAND.muted, fontSize: { xs: '0.82rem', sm: '0.9rem' },
              fontWeight: 500, mt: 0.5,
            }}>
              <Box component="span" sx={{ color: BRAND.sageText, fontWeight: 700 }}>
                {stats.total} team member{stats.total === 1 ? '' : 's'}
              </Box>
              {' '}across your organisation
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexShrink: 0, mt: 0.5 }}>
            <Tooltip title="Refresh" arrow>
              <span>
                <IconButton
                  onClick={refetch}
                  size="small"
                  sx={{
                    color: BRAND.muted,
                    border: `1px solid ${BRAND.borderStrong}`,
                    borderRadius: '9px',
                    '&:hover': { bgcolor: BRAND.sageSoft, color: BRAND.navy, borderColor: BRAND.sage },
                  }}
                >
                  <RefreshOutlined sx={{ fontSize: 18 }} />
                </IconButton>
              </span>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<Add sx={{ fontSize: 18 }} />}
              onClick={openAddDialog}
              disableElevation
              sx={{
                bgcolor: BRAND.navy, color: '#fff',
                textTransform: 'none', fontWeight: 700,
                borderRadius: '12px', fontSize: { xs: '0.82rem', sm: '0.88rem' },
                px: { xs: 1.75, sm: 2.25 }, py: { xs: 0.85, sm: 0.95 },
                letterSpacing: '0.005em',
                '&:hover': { bgcolor: BRAND.navyDark },
              }}
            >
              Add Employer
            </Button>
          </Box>
        </Box>

        {/* Row 2 — Search (pill style) */}
        <Box sx={{ mb: { xs: 1.75, md: 2 } }}>
          <TextField
            placeholder={isMobile ? 'Search employers…' : 'Search by name, email, ID, department or location…'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: BRAND.muted, fontSize: 20 }} />
                  </InputAdornment>
                ),
                endAdornment: search ? (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => setSearch('')}
                      aria-label="Clear search"
                      sx={{ color: BRAND.muted, '&:hover': { color: BRAND.ink, bgcolor: 'rgba(16,18,16,0.05)' } }}
                    >
                      <ClearRounded sx={{ fontSize: 18 }} />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              },
            }}
            sx={{
              width: '100%',
              '& .MuiOutlinedInput-root': {
                bgcolor: BRAND.bg,
                borderRadius: '25px',
                fontSize: { xs: '0.88rem', sm: '0.92rem' },
                height: { xs: 46, md: 48 },
                color: BRAND.ink,
                fontFamily: FONT,
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                '& input::placeholder': { color: BRAND.muted, opacity: 0.85 },
                '& fieldset': { borderColor: '#B0BEC5', borderWidth: '1.5px' },
                '&:hover fieldset': { borderColor: '#78909C', borderWidth: '2px' },
                '&.Mui-focused': { boxShadow: '0 6px 18px rgba(0,0,0,0.12)' },
                '&.Mui-focused fieldset': { borderColor: BRAND.sage, borderWidth: '2px' },
              },
            }}
          />
        </Box>

        {/* Row 3 — Status pills (left) + view toggle (right) */}
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap',
        }}>
          <Box sx={{
            display: 'flex', gap: 0.75, alignItems: 'center',
            flexWrap: { xs: 'nowrap', sm: 'wrap' },
            overflowX: { xs: 'auto', sm: 'visible' },
            pb: { xs: 0.5, sm: 0 }, mr: 'auto',
            '&::-webkit-scrollbar': { display: 'none' },
          }}>
            {STATUS_FILTER_OPTIONS.map((opt) => {
              const chipCount = statusCount(opt.value);
              const sel = statusTab === opt.value;
              return (
                <Box
                  key={opt.value}
                  onClick={() => setStatusTab(opt.value)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setStatusTab(opt.value)}
                  sx={{
                    cursor: 'pointer', userSelect: 'none',
                    display: 'inline-flex', alignItems: 'center', gap: 0.6,
                    px: 1.5, py: 0.65, borderRadius: 999, flexShrink: 0,
                    fontSize: '0.8rem', fontWeight: sel ? 700 : 600,
                    fontFamily: FONT,
                    bgcolor: sel ? BRAND.navy : BRAND.surface,
                    color: sel ? '#fff' : BRAND.muted,
                    border: `1px solid ${sel ? BRAND.navy : BRAND.borderStrong}`,
                    transition: 'all 0.16s ease',
                    '&:hover': {
                      bgcolor: sel ? BRAND.navy : BRAND.bg,
                      borderColor: sel ? BRAND.navy : BRAND.muted,
                    },
                  }}
                >
                  {opt.label}
                  <Box component="span" sx={{
                    fontSize: '0.68rem', fontWeight: 800, lineHeight: 1.6,
                    px: 0.7, borderRadius: 999,
                    bgcolor: sel ? 'rgba(255,255,255,0.22)' : BRAND.bg,
                    color: sel ? '#fff' : BRAND.muted,
                  }}>
                    {chipCount}
                  </Box>
                </Box>
              );
            })}
          </Box>

          {/* View toggle */}
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(e, newMode) => newMode && setViewMode(newMode)}
            sx={{
              height: 38, flexShrink: 0,
              bgcolor: BRAND.bg,
              border: `1px solid ${BRAND.border}`,
              borderRadius: '10px', p: '3px',
              '& .MuiToggleButton-root': {
                border: 0, borderRadius: '7px !important', m: 0,
                color: BRAND.muted, px: 1.25, height: 30,
                '&:hover': { bgcolor: 'rgba(16,18,16,0.04)' },
                '&.Mui-selected': {
                  bgcolor: BRAND.surface, color: BRAND.navy,
                  boxShadow: '0 1px 3px rgba(16,18,16,0.12)',
                  '&:hover': { bgcolor: BRAND.surface },
                },
              },
            }}
          >
            <ToggleButton value="grid" aria-label="grid view"><ViewModule sx={{ fontSize: 18 }} /></ToggleButton>
            <ToggleButton value="list" aria-label="list view"><ViewList sx={{ fontSize: 18 }} /></ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Paper>

      {/* ── Results ──────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <Paper elevation={0} sx={{
          textAlign: 'center', py: 8, px: 3,
          borderRadius: '14px', border: `1px solid ${BRAND.border}`, bgcolor: BRAND.surface,
        }}>
          <Box sx={{
            width: 64, height: 64, borderRadius: '50%',
            bgcolor: BRAND.sageSoft, mx: 'auto', mb: 2.5,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Search sx={{ fontSize: 30, color: BRAND.sage }} />
          </Box>
          <Typography sx={{ fontWeight: 700, color: BRAND.ink, mb: 0.75, fontSize: '1.0625rem' }}>
            {search || statusTab !== 'ALL' ? 'No matching employers' : 'No employers yet'}
          </Typography>
          <Typography sx={{ color: BRAND.muted, mb: 3, fontSize: '0.875rem' }}>
            {search || statusTab !== 'ALL'
              ? 'Try adjusting your search or clearing the status filter'
              : 'Add your first employer to start building your hiring team'}
          </Typography>
          {statusTab !== 'ALL' && stats.total > 0 ? (
            <Button variant="outlined" onClick={() => setStatusTab('ALL')} sx={{
              borderColor: BRAND.navy, color: BRAND.navy,
              textTransform: 'none', fontWeight: 500, px: 3, borderRadius: '10px',
              '&:hover': { borderColor: BRAND.navyDark, bgcolor: BRAND.navySoft },
            }}>
              Show all employers
            </Button>
          ) : (
            <Button variant="contained" disableElevation startIcon={<Add />} onClick={openAddDialog} sx={{
              bgcolor: BRAND.navy, color: '#fff',
              textTransform: 'none', fontWeight: 600, px: 3, borderRadius: '10px',
              '&:hover': { bgcolor: BRAND.navyDark },
            }}>
              Add Employer
            </Button>
          )}
        </Paper>
      ) : (
        <>
          {/* Grid / List */}
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: viewMode === 'grid' ? 'repeat(2, minmax(0, 1fr))' : '1fr',
              md: viewMode === 'grid' ? 'repeat(3, minmax(0, 1fr))' : '1fr',
              lg: viewMode === 'grid' ? 'repeat(4, minmax(0, 1fr))' : '1fr',
            },
            gap: { xs: 1.5, sm: 1.75, md: 2 },
            width: '100%',
          }}>
            {paginated.map((emp) => {
              const aColor = avatarColor(emp);
              const st = statusStyle(emp.status);
              return (
                <Card
                  key={emp.id}
                  elevation={0}
                  sx={{
                    borderRadius: '14px',
                    border: `1px solid ${BRAND.border}`,
                    bgcolor: BRAND.surface,
                    p: { xs: 1.75, sm: 2, md: 2.25 },
                    boxShadow: '0 1px 3px rgba(2,33,36,0.05), 0 4px 12px rgba(2,33,36,0.04)',
                    transition: 'transform 0.25s cubic-bezier(0.22,1,0.36,1), box-shadow 0.25s ease, border-color 0.18s ease',
                    '&:hover': {
                      transform: 'translateY(-3px)',
                      borderColor: BRAND.sage,
                      boxShadow: '0 8px 24px rgba(2,33,36,0.08), 0 2px 6px rgba(127,158,126,0.10)',
                    },
                    '@media (prefers-reduced-motion: reduce)': {
                      transition: 'none',
                      '&:hover': { transform: 'none' },
                    },
                  }}
                >
                  {/* Top — avatar + name + status */}
                  <Box sx={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'flex-start', gap: 1.5,
                    mb: { xs: 1.25, sm: 1.5 },
                  }}>
                    <Box sx={{ display: 'flex', gap: 1.5, minWidth: 0, flex: 1 }}>
                      <Avatar
                        src={emp.profile_image_url || undefined}
                        sx={{
                          width: { xs: 38, sm: 42 }, height: { xs: 38, sm: 42 }, flexShrink: 0,
                          bgcolor: aColor, color: '#fff',
                          fontWeight: 700, fontSize: { xs: '0.9rem', sm: '1rem' },
                          fontFamily: "'DM Serif Display', serif",
                          borderRadius: '10px',
                        }}
                        variant="rounded"
                      >
                        {getInitials(emp.full_name)}
                      </Avatar>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Tooltip title={emp.full_name} arrow enterDelay={300} placement="top-start">
                          <Typography sx={{
                            fontWeight: 700, mb: 0.25, fontFamily: FONT,
                            fontSize: { xs: '0.88rem', sm: '0.95rem', md: '1rem' },
                            color: BRAND.ink, overflow: 'hidden', textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap', lineHeight: 1.3,
                          }}>
                            {emp.full_name}
                          </Typography>
                        </Tooltip>
                        <Tooltip title={emp.email} arrow enterDelay={300} placement="bottom-start">
                          <Typography sx={{
                            fontSize: { xs: '0.74rem', sm: '0.8rem' },
                            color: BRAND.muted, fontFamily: FONT,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {emp.email}
                          </Typography>
                        </Tooltip>
                      </Box>
                    </Box>
                    <StatusBadge status={emp.status} />
                  </Box>

                  {/* Meta rows */}
                  <Box sx={{
                    display: 'flex', gap: { xs: 1.25, sm: 2, md: 2.25 },
                    mb: { xs: 1.25, sm: 1.5 }, flexWrap: 'wrap',
                  }}>
                    <Tooltip title={resolveRole(emp)} arrow enterDelay={300}>
                      <Box><InfoRow icon={<BusinessCenterOutlined sx={{ fontSize: { xs: 13, sm: 14 } }} />}>{resolveRole(emp)}</InfoRow></Box>
                    </Tooltip>
                    <Tooltip title={resolveDept(emp)} arrow enterDelay={300}>
                      <Box><InfoRow icon={<ApartmentOutlined sx={{ fontSize: { xs: 13, sm: 14 } }} />}>{resolveDept(emp)}</InfoRow></Box>
                    </Tooltip>
                    {emp.location && (
                      <Tooltip title={emp.location} arrow enterDelay={300}>
                        <Box><InfoRow icon={<LocationOnOutlined sx={{ fontSize: { xs: 13, sm: 14 } }} />}>{emp.location}</InfoRow></Box>
                      </Tooltip>
                    )}
                  </Box>

                  {/* Bottom — chips + actions */}
                  <Box sx={{ display: 'flex', gap: { xs: 0.5, sm: 0.6, md: 0.75 }, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Chip
                      label={`${emp.active_jobs || 0} active job${emp.active_jobs === 1 ? '' : 's'}`}
                      size="small"
                      sx={{
                        bgcolor: BRAND.sageSoft, color: '#4A6E49',
                        border: `1px solid ${BRAND.border}`,
                        borderRadius: '8px', fontFamily: FONT,
                        fontSize: { xs: '0.64rem', sm: '0.7rem' },
                        fontWeight: 500, height: { xs: 24, sm: 26 },
                        '& .MuiChip-label': { px: { xs: 0.8, sm: 1 } },
                      }}
                    />
                    {emp.contact_number && (
                      <Chip
                        label={emp.contact_number}
                        size="small"
                        icon={<PhoneOutlined sx={{ fontSize: '13px !important' }} />}
                        sx={{
                          bgcolor: BRAND.sageSoft, color: '#4A6E49',
                          border: `1px solid ${BRAND.border}`,
                          borderRadius: '8px', fontFamily: FONT,
                          fontSize: { xs: '0.64rem', sm: '0.7rem' },
                          fontWeight: 500, height: { xs: 24, sm: 26 },
                          '& .MuiChip-label': { px: { xs: 0.8, sm: 1 } },
                          '& .MuiChip-icon': { color: '#4A6E49', ml: '6px' },
                        }}
                      />
                    )}
                    {emp.employer_id && (
                      <Chip
                        label={emp.employer_id}
                        size="small"
                        sx={{
                          bgcolor: '#F0F2ED', color: BRAND.muted,
                          borderRadius: '8px', fontFamily: FONT,
                          fontSize: { xs: '0.64rem', sm: '0.7rem' },
                          fontWeight: 600, height: { xs: 24, sm: 26 },
                          fontVariant: 'tabular-nums',
                          '& .MuiChip-label': { px: { xs: 0.8, sm: 1 } },
                        }}
                      />
                    )}
                    <Box sx={{ ml: 'auto' }}>
                      <Tooltip title="More actions">
                        <IconButton
                          size="small"
                          onClick={(e) => openMenu(e, emp)}
                          sx={{
                            color: BRAND.muted,
                            '&:hover': { bgcolor: BRAND.navySoft, color: BRAND.navy },
                          }}
                        >
                          <MoreVert sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                </Card>
              );
            })}
          </Box>

          {/* ── Pagination bar (FindJobs pattern) ────────────────────── */}
          {filtered.length > 0 && (
            <Box sx={{
              mt: { xs: 3, sm: 3.5, md: 4 },
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'stretch', sm: 'center' },
              gap: { xs: 1.5, sm: 2 },
            }}>
              {/* Left: count + page-size selector */}
              <Box sx={{
                display: 'flex', flexDirection: { xs: 'column', sm: 'row' },
                gap: { xs: 1, sm: 2 }, alignItems: { xs: 'flex-start', sm: 'center' },
                flex: 1, minWidth: 0,
              }}>
                <Typography sx={{
                  fontSize: { xs: '0.78rem', sm: '0.82rem' },
                  color: BRAND.muted, fontWeight: 500, whiteSpace: 'nowrap',
                }}>
                  Showing{' '}
                  <Box component="span" sx={{ color: BRAND.ink, fontWeight: 700 }}>
                    {(page - 1) * effectivePageSize + 1}–{Math.min(page * effectivePageSize, filtered.length)}
                  </Box>
                  {' '}of{' '}
                  <Box component="span" sx={{ color: BRAND.ink, fontWeight: 700 }}>
                    {filtered.length}
                  </Box>
                  {' '}employers
                </Typography>

                <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
                  <Typography sx={{ fontSize: { xs: '0.78rem', sm: '0.82rem' }, color: BRAND.muted, fontWeight: 500 }}>
                    Show
                  </Typography>
                  <Select
                    size="small"
                    value={pageSize}
                    onChange={(e) => {
                      const v = e.target.value;
                      setPageSize(v === 'all' ? 'all' : Number(v));
                    }}
                    renderValue={(v) => (v === 'all' ? 'All' : v)}
                    MenuProps={{
                      slotProps: { paper: { sx: {
                        borderRadius: '12px', mt: 0.5,
                        border: `1px solid ${BRAND.border}`,
                        boxShadow: '0 8px 24px rgba(2,33,36,0.12)',
                        '& .MuiMenuItem-root': {
                          fontSize: '0.82rem', fontWeight: 600, fontFamily: FONT,
                          color: BRAND.ink, minHeight: { xs: 40, sm: 36 },
                          '&.Mui-selected': { bgcolor: BRAND.navySoft, color: BRAND.navy, '&:hover': { bgcolor: BRAND.navySoft } },
                        },
                      } } },
                    }}
                    sx={{
                      fontSize: '0.82rem', fontWeight: 700, fontFamily: FONT,
                      color: BRAND.navy, bgcolor: BRAND.bg, borderRadius: '10px',
                      minWidth: { xs: 76, sm: 80 }, height: { xs: 38, sm: 36 },
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: BRAND.border },
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: BRAND.navy },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: BRAND.navy, borderWidth: '1px' },
                      '& .MuiSelect-select': { py: 0.75, pl: 1.25, pr: '28px !important' },
                      '& .MuiSvgIcon-root': { color: BRAND.navy },
                    }}
                  >
                    {PAGE_SIZE_OPTIONS.map((opt) => (
                      <MenuItem key={opt} value={opt}>{opt === 'all' ? 'All' : opt}</MenuItem>
                    ))}
                  </Select>
                  <Typography sx={{ fontSize: { xs: '0.78rem', sm: '0.82rem' }, color: BRAND.muted, fontWeight: 500 }}>
                    per page
                  </Typography>
                </Box>
              </Box>

              {/* Right: page buttons */}
              <Pagination
                count={totalPages}
                page={page}
                onChange={handlePageChange}
                shape="rounded"
                siblingCount={1}
                boundaryCount={1}
                size="small"
                sx={{
                  '& .MuiPaginationItem-root': {
                    fontSize: { xs: '0.75rem', sm: '0.82rem' },
                    fontWeight: 600, fontFamily: FONT, color: BRAND.ink,
                    borderRadius: '8px', border: `1px solid ${BRAND.border}`,
                    bgcolor: BRAND.bg,
                    minWidth: { xs: 32, sm: 36 }, height: { xs: 32, sm: 36 },
                    '&:hover': { bgcolor: BRAND.navySoft, borderColor: BRAND.sage },
                    '&.Mui-selected': {
                      bgcolor: BRAND.navy, color: '#fff',
                      borderColor: BRAND.navy, fontWeight: 700,
                      boxShadow: '0 4px 12px rgba(2,33,36,0.2)',
                      '&:hover': { bgcolor: BRAND.navyDark },
                    },
                  },
                  '& .MuiPaginationItem-ellipsis': { border: 'none', bgcolor: 'transparent' },
                }}
              />
            </Box>
          )}
        </>
      )}

      {/* ── Row action menu ─────────────────────────────────────────── */}
      <Menu
        anchorEl={menuAnchor}
        open={menuOpen}
        onClose={closeMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            elevation: 0,
            sx: {
              mt: 0.5, minWidth: { xs: 160, sm: 180 },
              bgcolor: BRAND.surface,
              border: `1px solid ${BRAND.border}`,
              borderRadius: '12px',
              boxShadow: '0 10px 36px rgba(2,33,36,0.12), 0 2px 6px rgba(2,33,36,0.06)',
              overflow: 'hidden',
              '& .MuiMenuItem-root': {
                fontSize: { xs: '0.8rem', sm: '0.875rem' },
                py: { xs: 1, sm: 1.15 }, px: { xs: 1.5, sm: 2 },
              },
            },
          },
        }}
      >
        <MenuItem onClick={() => openEditDialog(selected)} sx={{ color: BRAND.muted, '&:hover': { bgcolor: BRAND.navySoft } }}>
          <ListItemIcon sx={{ minWidth: '28px !important', color: 'inherit' }}><EditOutlined sx={{ fontSize: 18 }} /></ListItemIcon>
          <ListItemText slotProps={{ primary: { fontSize: '0.875rem', fontWeight: 500 } }}>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => requestConfirm('toggle')} sx={{ color: BRAND.muted, '&:hover': { bgcolor: BRAND.navySoft } }}>
          <ListItemIcon sx={{ minWidth: '28px !important', color: 'inherit' }}>
            {selected?.status === 'ACTIVE' ? <Block sx={{ fontSize: 18 }} /> : <CheckCircle sx={{ fontSize: 18 }} />}
          </ListItemIcon>
          <ListItemText slotProps={{ primary: { fontSize: '0.875rem', fontWeight: 500 } }}>
            {selected?.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
          </ListItemText>
        </MenuItem>
        <Divider sx={{ borderColor: BRAND.border, my: '0 !important' }} />
        <MenuItem onClick={() => requestConfirm('remove')} sx={{ color: '#B4462F', '&:hover': { bgcolor: '#FBECEA' } }}>
          <ListItemIcon sx={{ minWidth: '28px !important', color: 'inherit' }}><Delete sx={{ fontSize: 18 }} /></ListItemIcon>
          <ListItemText slotProps={{ primary: { fontSize: '0.875rem', fontWeight: 500 } }}>Remove</ListItemText>
        </MenuItem>
      </Menu>

      {/* ── Confirmation dialog ─────────────────────────────────────── */}
      <Dialog
        open={Boolean(confirm)}
        onClose={closeConfirm}
        maxWidth="xs" fullWidth fullScreen={isMobile}
        slotProps={{ paper: { sx: {
          borderRadius: isMobile ? 0 : '18px',
          overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(2,33,36,0.22)',
          fontFamily: FONT,
        } } }}
      >
        {confirmCfg && (
          <>
            <Box sx={{
              background: confirmCfg.gradient,
              px: { xs: 2.5, sm: 3 }, pt: { xs: 2.5, sm: 3 }, pb: { xs: 2.25, sm: 2.75 },
              position: 'relative', overflow: 'hidden', textAlign: 'center',
            }}>
              <Box sx={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />
              <Box sx={{ position: 'absolute', bottom: -20, left: -20, width: 100, height: 100, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.02)', pointerEvents: 'none' }} />
              <Box sx={{
                width: { xs: 48, sm: 56 }, height: { xs: 48, sm: 56 },
                borderRadius: '16px', mx: 'auto', mb: 2,
                bgcolor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(8px)',
              }}>
                {confirmCfg.icon}
              </Box>
              <Typography sx={{
                fontWeight: 700, color: 'rgba(255,255,255,0.97)', lineHeight: 1.2,
                fontSize: { xs: '1.05rem', sm: '1.15rem', md: '1.2rem' },
                mb: 0.5,
              }}>
                {confirmCfg.title}
              </Typography>
              <Typography sx={{
                color: 'rgba(255,255,255,0.45)',
                fontSize: { xs: '0.74rem', sm: '0.8rem' }, fontWeight: 500,
              }}>
                {confirmCfg.subtitle}
              </Typography>
            </Box>
            <DialogContent sx={{
              pt: { xs: 2.5, sm: 3 }, pb: { xs: 1.5, sm: 2 },
              px: { xs: 2.5, sm: 3 }, bgcolor: BRAND.surface,
            }}>
              <Typography sx={{
                color: BRAND.muted, lineHeight: 1.65,
                fontSize: { xs: '0.82rem', sm: '0.88rem' },
                fontFamily: FONT,
              }}>
                {confirmCfg.body}
              </Typography>
            </DialogContent>
            <DialogActions sx={{
              px: { xs: 2.5, sm: 3 }, py: { xs: 1.75, sm: 2 },
              gap: 1, bgcolor: BRAND.surface, borderTop: `1px solid ${BRAND.border}`,
              flexDirection: { xs: 'column-reverse', sm: 'row' }, alignItems: 'stretch',
            }}>
              <Button onClick={closeConfirm} disabled={confirmBusy} sx={{
                borderRadius: '12px', textTransform: 'none', fontWeight: 600,
                color: BRAND.muted, fontSize: { xs: '0.82rem', sm: '0.88rem' },
                fontFamily: FONT, border: `1px solid ${BRAND.border}`,
                width: { xs: '100%', sm: 'auto' }, minHeight: { xs: 44, sm: 'auto' },
                '&:hover': { bgcolor: BRAND.navySoft, borderColor: BRAND.borderStrong },
              }}>Cancel</Button>
              <Button
                variant="contained" onClick={executeConfirm} disabled={confirmBusy}
                disableElevation
                startIcon={confirmBusy ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : null}
                sx={{
                  borderRadius: '12px', textTransform: 'none', fontWeight: 700,
                  px: { xs: 2, sm: 3 }, fontSize: { xs: '0.82rem', sm: '0.88rem' },
                  fontFamily: FONT,
                  width: { xs: '100%', sm: 'auto' }, minHeight: { xs: 48, sm: 'auto' },
                  bgcolor: confirmCfg.btnBg, color: '#fff',
                  '&:hover': { bgcolor: confirmCfg.btnHover },
                  '&.Mui-disabled': { bgcolor: confirmCfg.btnBg, color: 'rgba(255,255,255,0.6)', opacity: 0.85 },
                }}
              >
                {confirmBusy ? 'Working…' : confirmCfg.confirmLabel}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ── Add / Edit dialog ──────────────────────────────────────── */}
      <AddEmployerDialog
        open={dialogOpen}
        onClose={closeDialog}
        editingEmployer={editingEmp}
        addEmployer={addEmployer}
        updateEmployer={updateEmployer}
      />
    </Box>
  );
};

export default EmployersList;