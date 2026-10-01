import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Card, TextField, InputAdornment,
  Button, Avatar, IconButton,
  CircularProgress, Tooltip,
  Menu, MenuItem, ListItemIcon, ListItemText,
  Dialog, DialogContent, DialogActions,
  useTheme, useMediaQuery,
} from '@mui/material';
import {
  Add, Search, MoreVert, Delete, Block, CheckCircle,
  EmailOutlined, PhoneOutlined, VerifiedUserOutlined,
  ClearRounded, RefreshOutlined, WarningAmberRounded,
  ViewListRounded, GridViewRounded, EditOutlined,
} from '@mui/icons-material';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow as MuiTableRow,
  ToggleButton, ToggleButtonGroup, Chip,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { getInitials, formatDate } from '@/utils/formatters';
import useComplianceOfficers from '@/hooks/company/useComplianceOfficers';
import AddComplianceOfficerDialog from './AddComplianceOfficer';

/* ── Brand tokens — EXACT mirror of EmployersList.jsx BRAND.* ─────────── */
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

const STATUS_STYLE = {
  ACTIVE:   { bg: '#EAF2E9', tx: '#3E6E3E', dot: '#3E6E3E', label: 'Active'   },
  INACTIVE: { bg: '#E8EFEF', tx: BRAND.muted, dot: '#A8ADA8', label: 'Inactive' },
};
const normStatus = (o) => {
  // Backend may send `status: 'ACTIVE'|'INACTIVE'` or `is_active: bool`.
  if (o.status) return String(o.status).toUpperCase() === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE';
  return (o.is_active === true || o.is_active === 1) ? 'ACTIVE' : 'INACTIVE';
};
const statusStyle = (s) => STATUS_STYLE[s] || STATUS_STYLE.INACTIVE;

const AVATAR_COLORS = ['#7F9E7E', '#4E6E4D', '#A35A2D', '#0A3F42', '#55584F'];
const avatarColor = (o) => {
  const key = String(o.id ?? o.email ?? o.first_name ?? '');
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
};

const fullName = (o) =>
  o.full_name
  || [o.first_name, o.last_name].filter(Boolean).join(' ').trim()
  || o.name
  || '—';

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
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, color: BRAND.muted, minWidth: 0 }}>
    {icon}
    <Typography sx={{
      fontSize: { xs: '0.72rem', sm: '0.76rem' },
      fontWeight: 500, fontFamily: FONT,
      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    }}>{children}</Typography>
  </Box>
);

/* ═══════════════════════════════════════════════════════════════════════
   ComplianceOfficersList
   ═══════════════════════════════════════════════════════════════════════ */
const ComplianceOfficersList = () => {
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [dialogOpen, setDialogOpen] = useState(false);

  const {
    officers,
    loading,
    error,
    addOfficer,
    editOfficer,
    toggleStatus,
    removeOfficer,
    refetch,
  } = useComplianceOfficers({ formOpen: dialogOpen });

  const [search, setSearch] = useState('');

  // Row menu
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuOfficer, setMenuOfficer] = useState(null);

  // Delete confirm
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [viewMode, setViewMode] = useState('table');
  const [editingOfficer, setEditingOfficer] = useState(null);
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', contact_number: '' });
  const [editErrors, setEditErrors] = useState({});
  const [editSaving, setEditSaving] = useState(false);

  const openEdit = (officer) => {
    setEditForm({
      first_name: officer.first_name || '',
      last_name: officer.last_name || '',
      contact_number: officer.phone || officer.contact_number || '',
    });
    setEditErrors({});
    setEditingOfficer(officer);
  };

  const handleEditChange = (field) => (e) => {
    let value = e.target.value;
    if (field === 'contact_number') value = value.replace(/\D/g, '').slice(0, 10);
    if (field === 'first_name' || field === 'last_name') value = value.replace(/[^a-zA-Z ]/g, '');
    setEditForm((prev) => ({ ...prev, [field]: value }));
    if (editErrors[field]) setEditErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleEditSave = async () => {
    const errs = {};
    if (!editForm.first_name.trim()) errs.first_name = 'Required';
    if (!editForm.last_name.trim()) errs.last_name = 'Required';
    if (editForm.contact_number && !/^\d{10}$/.test(editForm.contact_number.replace(/\D/g, '')))
      errs.contact_number = 'Must be 10 digits';
    if (Object.keys(errs).length) { setEditErrors(errs); return; }

    setEditSaving(true);
    try {
      await editOfficer(editingOfficer.id, editForm);
      enqueueSnackbar(`${editForm.first_name} ${editForm.last_name} updated.`, { variant: 'success' });
      setEditingOfficer(null);
    } catch (err) {
      enqueueSnackbar(err.friendlyMessage || 'Failed to update.', { variant: 'error' });
    } finally { setEditSaving(false); }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return officers;
    return officers.filter((o) =>
      fullName(o).toLowerCase().includes(q)
      || String(o.email || '').toLowerCase().includes(q)
    );
  }, [officers, search]);

  const openMenu = (e, officer) => { setMenuAnchor(e.currentTarget); setMenuOfficer(officer); };
  const closeMenu = () => { setMenuAnchor(null); setMenuOfficer(null); };

  const handleToggle = async (officer) => {
    closeMenu();
    setBusyId(officer.id);
    try {
      const newStatus = await toggleStatus(officer);
      enqueueSnackbar(
        `${fullName(officer)} is now ${String(newStatus).toLowerCase()}.`,
        { variant: 'success' },
      );
    } catch (err) {
      enqueueSnackbar(err.friendlyMessage || 'Failed to update status.', { variant: 'error' });
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    const officer = confirmDelete;
    if (!officer) return;
    setBusyId(officer.id);
    try {
      await removeOfficer(officer.id);
      enqueueSnackbar(`${fullName(officer)} removed.`, { variant: 'success' });
      setConfirmDelete(null);
    } catch (err) {
      enqueueSnackbar(err.friendlyMessage || 'Failed to remove officer.', { variant: 'error' });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Box sx={{
      minHeight: '100%', bgcolor: BRAND.bg, fontFamily: FONT,
      px: { xs: 1.5, sm: 2.5, md: 3.5 }, py: { xs: 2, sm: 2.5, md: 3 },
    }}>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <Box sx={{
        display: 'flex', flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between',
        gap: { xs: 1.5, sm: 2 }, mb: { xs: 2, sm: 2.5, md: 3 },
      }}>
        <Box>
          <Typography sx={{
            fontSize: { xs: '1.2rem', sm: '1.4rem', md: '1.55rem' },
            fontWeight: 800, color: BRAND.navy, fontFamily: FONT,
            letterSpacing: '-0.02em', lineHeight: 1.15,
          }}>
            Compliance Officers
          </Typography>
          <Typography sx={{
            fontSize: { xs: '0.78rem', sm: '0.85rem' }, color: BRAND.muted,
            fontFamily: FONT, mt: 0.25,
          }}>
            Create and manage compliance officers for your organization.
          </Typography>
        </Box>

        <Button
          variant="contained" disableElevation
          startIcon={<Add sx={{ fontSize: 20 }} />}
          onClick={() => setDialogOpen(true)}
          sx={{
            bgcolor: BRAND.navy, color: '#fff', borderRadius: '12px',
            fontWeight: 700, fontFamily: FONT, textTransform: 'none',
            fontSize: { xs: '0.85rem', sm: '0.9rem' },
            px: { xs: 2, sm: 2.5 }, py: { xs: 1.1, sm: 1.15 },
            minHeight: { xs: 46, sm: 'auto' },
            whiteSpace: 'nowrap',
            '&:hover': { bgcolor: BRAND.navyDark },
          }}
        >
          Add Compliance Officer
        </Button>
      </Box>

      {/* ── Search ──────────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', gap: 1, mb: { xs: 2, sm: 2.5 } }}>
        <TextField
          fullWidth size="small" placeholder="Search by name or email…"
          value={search} onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ fontSize: 18, color: BRAND.muted }} />
              </InputAdornment>
            ),
            endAdornment: search ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearch('')}>
                  <ClearRounded sx={{ fontSize: 16, color: BRAND.muted }} />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
          sx={{
            maxWidth: { sm: 380 },
            '& .MuiOutlinedInput-root': {
              borderRadius: '12px', bgcolor: BRAND.surface, fontFamily: FONT,
              fontSize: { xs: '0.82rem', sm: '0.88rem' },
              '& fieldset': { borderColor: BRAND.border, borderWidth: '1.5px' },
              '&:hover fieldset': { borderColor: BRAND.borderStrong },
              '&.Mui-focused fieldset': { borderColor: BRAND.sage, borderWidth: '2px' },
            },
          }}
        />
        <Tooltip title="Refresh">
          <IconButton
            onClick={() => refetch().catch(() => {})}
            sx={{
              border: `1.5px solid ${BRAND.border}`, borderRadius: '12px',
              bgcolor: BRAND.surface, color: BRAND.muted,
              '&:hover': { borderColor: BRAND.sage, color: BRAND.sageText },
            }}
          >
            <RefreshOutlined sx={{ fontSize: 20 }} />
          </IconButton>
        </Tooltip>

        {/* ── View toggle ── */}
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, v) => { if (v) setViewMode(v); }}
          size="small"
          sx={{
            '& .MuiToggleButton-root': {
              border: `1px solid ${BRAND.border}`, px: 1, py: 0.6,
              color: BRAND.muted, fontFamily: FONT,
              '&.Mui-selected': { bgcolor: BRAND.navy, color: '#fff', '&:hover': { bgcolor: BRAND.navyDark } },
              '&:hover': { bgcolor: BRAND.navySoft },
            },
            borderRadius: '10px', overflow: 'hidden',
          }}
        >
          <ToggleButton value="table"><ViewListRounded sx={{ fontSize: 19 }} /></ToggleButton>
          <ToggleButton value="cards"><GridViewRounded sx={{ fontSize: 19 }} /></ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* ── Body ────────────────────────────────────────────────────── */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: BRAND.sage }} />
        </Box>
      ) : error ? (
        <Card sx={{
          p: 4, textAlign: 'center', borderRadius: '16px',
          border: `1px solid ${BRAND.border}`, boxShadow: 'none', bgcolor: BRAND.surface,
        }}>
          <Typography sx={{ color: BRAND.muted, fontFamily: FONT, mb: 2 }}>{error}</Typography>
          <Button onClick={() => refetch().catch(() => {})} sx={{ textTransform: 'none', fontFamily: FONT, color: BRAND.sageText }}>
            Try again
          </Button>
        </Card>
      ) : filtered.length === 0 ? (
        <Card sx={{
          p: { xs: 4, sm: 6 }, textAlign: 'center', borderRadius: '16px',
          border: `1px dashed ${BRAND.borderStrong}`, boxShadow: 'none', bgcolor: BRAND.surface,
        }}>
          <Box sx={{
            width: 56, height: 56, borderRadius: '14px', mx: 'auto', mb: 2,
            bgcolor: BRAND.sageSoft, color: BRAND.sageText,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <VerifiedUserOutlined sx={{ fontSize: 28 }} />
          </Box>
          <Typography sx={{ fontWeight: 700, color: BRAND.ink, fontFamily: FONT, mb: 0.5 }}>
            {search ? 'No officers match your search' : 'No compliance officers yet'}
          </Typography>
          <Typography sx={{ fontSize: '0.82rem', color: BRAND.muted, fontFamily: FONT, mb: search ? 0 : 2 }}>
            {search ? 'Try a different name or email.' : 'Add your first compliance officer to get started.'}
          </Typography>
          {!search && (
            <Button
              variant="contained" disableElevation startIcon={<Add />}
              onClick={() => setDialogOpen(true)}
              sx={{
                bgcolor: BRAND.navy, color: '#fff', borderRadius: '12px',
                fontWeight: 700, fontFamily: FONT, textTransform: 'none',
                '&:hover': { bgcolor: BRAND.navyDark },
              }}
            >
              Add Compliance Officer
            </Button>
          )}
        </Card>
      ) : viewMode === 'table' ? (
        /* ── Table view (default) ── */
        <TableContainer component={Card} sx={{
          borderRadius: '16px', border: `1px solid ${BRAND.border}`,
          boxShadow: 'none', bgcolor: BRAND.surface, overflow: 'hidden',
        }}>
          <Table size="small">
            <TableHead>
              <MuiTableRow sx={{ bgcolor: BRAND.sageSoft }}>
                {['Name', 'Email', 'Phone', 'Status', 'Added', ''].map((h) => (
                  <TableCell key={h} sx={{
                    fontFamily: FONT, fontWeight: 700, fontSize: '0.76rem',
                    color: BRAND.navy, py: 1.4, borderBottom: `1px solid ${BRAND.border}`,
                    ...(h === '' ? { width: 48 } : {}),
                  }}>{h}</TableCell>
                ))}
              </MuiTableRow>
            </TableHead>
            <TableBody>
              {filtered.map((o) => {
                const status = normStatus(o);
                const s = statusStyle(status);
                const isBusy = busyId === o.id;
                return (
                  <MuiTableRow key={o.id} hover sx={{
                    opacity: isBusy ? 0.6 : 1,
                    '&:hover': { bgcolor: BRAND.navySoft },
                    '& td': { borderBottom: `1px solid ${BRAND.border}`, py: 1.3 },
                  }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                        <Avatar sx={{
                          width: 34, height: 34, bgcolor: avatarColor(o),
                          fontSize: '0.78rem', fontWeight: 700, fontFamily: FONT,
                        }}>
                          {getInitials(fullName(o))}
                        </Avatar>
                        <Typography sx={{
                          fontWeight: 700, fontSize: '0.88rem', color: BRAND.ink,
                          fontFamily: FONT, whiteSpace: 'nowrap',
                        }}>
                          {fullName(o)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontFamily: FONT, fontSize: '0.82rem', color: BRAND.muted }}>
                      {o.email || '—'}
                    </TableCell>
                    <TableCell sx={{ fontFamily: FONT, fontSize: '0.82rem', color: BRAND.muted }}>
                      {o.phone || o.contact_number || '—'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={s.label}
                        size="small"
                        icon={<Box component="span" sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: s.dot, ml: '8px !important' }} />}
                        sx={{
                          bgcolor: s.bg, color: s.tx, fontWeight: 700,
                          fontSize: '0.72rem', fontFamily: FONT, height: 24, borderRadius: '8px',
                          border: `1px solid ${s.bg}`, '& .MuiChip-icon': { mr: 0 },
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontFamily: FONT, fontSize: '0.76rem', color: BRAND.muted, whiteSpace: 'nowrap' }}>
                      {(o.created_at || o.joined) ? formatDate(o.created_at || o.joined) : '—'}
                    </TableCell>
                    <TableCell align="right" sx={{ pr: 1 }}>
                      <IconButton
                        size="small" onClick={(e) => openMenu(e, o)} disabled={isBusy}
                        sx={{ color: BRAND.muted }}
                      >
                        {isBusy ? <CircularProgress size={16} sx={{ color: BRAND.sage }} /> : <MoreVert sx={{ fontSize: 20 }} />}
                      </IconButton>
                    </TableCell>
                  </MuiTableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        /* ── Cards view ── */
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' },
          gap: { xs: 1.5, sm: 2 },
        }}>
          {filtered.map((o) => {
            const status = normStatus(o);
            const isBusy = busyId === o.id;
            return (
              <Card key={o.id} sx={{
                position: 'relative', p: { xs: 1.75, sm: 2 },
                borderRadius: '16px', border: `1px solid ${BRAND.border}`,
                boxShadow: '0 1px 2px rgba(2,33,36,0.04)', bgcolor: BRAND.surface,
                transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
                '&:hover': { boxShadow: '0 8px 24px rgba(2,33,36,0.08)', borderColor: BRAND.borderStrong },
                opacity: isBusy ? 0.6 : 1,
              }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
                  <Avatar sx={{
                    width: 44, height: 44, bgcolor: avatarColor(o),
                    fontSize: '0.95rem', fontWeight: 700, fontFamily: FONT, flexShrink: 0,
                  }}>
                    {getInitials(fullName(o))}
                  </Avatar>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography sx={{
                      fontWeight: 700, color: BRAND.ink, fontFamily: FONT,
                      fontSize: { xs: '0.9rem', sm: '0.95rem' }, lineHeight: 1.3,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {fullName(o)}
                    </Typography>
                    <Box sx={{ mt: 0.5 }}><StatusBadge status={status} /></Box>
                  </Box>
                  <IconButton
                    size="small" onClick={(e) => openMenu(e, o)} disabled={isBusy}
                    sx={{ color: BRAND.muted, mt: -0.5, mr: -0.5 }}
                  >
                    {isBusy ? <CircularProgress size={16} sx={{ color: BRAND.sage }} /> : <MoreVert sx={{ fontSize: 20 }} />}
                  </IconButton>
                </Box>

                <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                  <InfoRow icon={<EmailOutlined sx={{ fontSize: 15 }} />}>{o.email || '—'}</InfoRow>
                  <InfoRow icon={<PhoneOutlined sx={{ fontSize: 15 }} />}>
                    {o.phone || o.contact_number || '—'}
                  </InfoRow>
                </Box>

                {(o.created_at || o.joined) && (
                  <Typography sx={{
                    mt: 1.25, fontSize: '0.68rem', color: BRAND.muted, fontFamily: FONT,
                  }}>
                    Added {formatDate(o.created_at || o.joined)}
                  </Typography>
                )}
              </Card>
            );
          })}
        </Box>
      )}

      {/* ── Row menu ────────────────────────────────────────────────── */}
      <Menu
        anchorEl={menuAnchor}
        open={!!menuAnchor}
        onClose={closeMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: {
          borderRadius: '12px', border: `1px solid ${BRAND.border}`,
          boxShadow: '0 8px 24px rgba(2,33,36,0.12)', mt: 0.5, minWidth: 180,
          '& .MuiMenuItem-root': { fontFamily: FONT, fontSize: '0.85rem', py: 1 },
        } } }}
      >
        {menuOfficer && normStatus(menuOfficer) === 'ACTIVE' ? (
          <MenuItem onClick={() => handleToggle(menuOfficer)}>
            <ListItemIcon><Block sx={{ fontSize: 18, color: BRAND.muted }} /></ListItemIcon>
            <ListItemText>Deactivate</ListItemText>
          </MenuItem>
        ) : (
          <MenuItem onClick={() => handleToggle(menuOfficer)}>
            <ListItemIcon><CheckCircle sx={{ fontSize: 18, color: '#3E6E3E' }} /></ListItemIcon>
            <ListItemText>Activate</ListItemText>
          </MenuItem>
        )}
        <MenuItem onClick={() => { const o = menuOfficer; closeMenu(); openEdit(o); }}>
          <ListItemIcon><EditOutlined sx={{ fontSize: 18, color: BRAND.navy }} /></ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { const o = menuOfficer; closeMenu(); setConfirmDelete(o); }}>
          <ListItemIcon><Delete sx={{ fontSize: 18, color: '#B4433B' }} /></ListItemIcon>
          <ListItemText sx={{ '& .MuiTypography-root': { color: '#B4433B' } }}>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* ── Delete confirm ──────────────────────────────────────────── */}
      <Dialog
        open={!!confirmDelete}
        onClose={busyId ? undefined : () => setConfirmDelete(null)}
        maxWidth="xs" fullWidth
        slotProps={{ paper: { sx: { borderRadius: '16px', fontFamily: FONT } } }}
      >
        <DialogContent sx={{ pt: 3, px: 3, textAlign: 'center' }}>
          <Box sx={{
            width: 52, height: 52, borderRadius: '14px', mx: 'auto', mb: 1.75,
            bgcolor: '#FBEAE8', color: '#B4433B',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <WarningAmberRounded sx={{ fontSize: 28 }} />
          </Box>
          <Typography sx={{ fontWeight: 700, color: BRAND.ink, fontFamily: FONT, fontSize: '1.05rem', mb: 0.5 }}>
            Remove compliance officer?
          </Typography>
          <Typography sx={{ fontSize: '0.85rem', color: BRAND.muted, fontFamily: FONT }}>
            {confirmDelete ? fullName(confirmDelete) : ''} will lose access immediately. This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, pt: 2, gap: 1 }}>
          <Button
            onClick={() => setConfirmDelete(null)} disabled={!!busyId}
            fullWidth
            sx={{
              color: BRAND.muted, fontWeight: 600, fontFamily: FONT, textTransform: 'none',
              borderRadius: '12px', border: `1px solid ${BRAND.border}`, py: 1.1,
              '&:hover': { bgcolor: BRAND.navySoft },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDelete} disabled={!!busyId}
            fullWidth variant="contained" disableElevation
            startIcon={busyId ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : null}
            sx={{
              bgcolor: '#B4433B', color: '#fff', fontWeight: 700, fontFamily: FONT,
              textTransform: 'none', borderRadius: '12px', py: 1.1,
              '&:hover': { bgcolor: '#9A362F' },
            }}
          >
            {busyId ? 'Removing…' : 'Remove'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Edit dialog ─────────────────────────────────────────────── */}
      <Dialog
        open={!!editingOfficer}
        onClose={editSaving ? undefined : () => setEditingOfficer(null)}
        maxWidth="xs" fullWidth
        slotProps={{ paper: { sx: { borderRadius: '16px', fontFamily: FONT } } }}
      >
        <Box sx={{
          px: 3, pt: 2.5, pb: 1.5,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <Typography sx={{ fontWeight: 700, fontSize: '1.05rem', color: BRAND.ink, fontFamily: FONT }}>
            Edit Compliance Officer
          </Typography>
          <IconButton size="small" onClick={() => setEditingOfficer(null)} disabled={editSaving}
            sx={{ color: BRAND.muted }}>
            <ClearRounded sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
        <DialogContent sx={{ px: 3, pt: 1, pb: 2 }}>
          {editingOfficer && (
            <Typography sx={{ fontSize: '0.78rem', color: BRAND.muted, fontFamily: FONT, mb: 2 }}>
              Email: <b>{editingOfficer.email}</b> (cannot be changed)
            </Typography>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField fullWidth size="small" label="First Name *"
              value={editForm.first_name}
              onChange={handleEditChange('first_name')}
              error={!!editErrors.first_name}
              helperText={editErrors.first_name || ''}
              sx={{
                '& .MuiOutlinedInput-root': { borderRadius: '12px', fontFamily: FONT, fontSize: '0.88rem' },
                '& .MuiInputLabel-root': { fontFamily: FONT, fontSize: '0.88rem' },
              }}
            />
            <TextField fullWidth size="small" label="Last Name *"
              value={editForm.last_name}
              onChange={handleEditChange('last_name')}
              error={!!editErrors.last_name}
              helperText={editErrors.last_name || ''}
              sx={{
                '& .MuiOutlinedInput-root': { borderRadius: '12px', fontFamily: FONT, fontSize: '0.88rem' },
                '& .MuiInputLabel-root': { fontFamily: FONT, fontSize: '0.88rem' },
              }}
            />
            <TextField fullWidth size="small" label="Phone Number"
              value={editForm.contact_number}
              onChange={handleEditChange('contact_number')}
              error={!!editErrors.contact_number}
              helperText={editErrors.contact_number || ''}
              inputProps={{ inputMode: 'numeric', maxLength: 10 }}
              sx={{
                '& .MuiOutlinedInput-root': { borderRadius: '12px', fontFamily: FONT, fontSize: '0.88rem' },
                '& .MuiInputLabel-root': { fontFamily: FONT, fontSize: '0.88rem' },
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, gap: 1 }}>
          <Button
            onClick={() => setEditingOfficer(null)} disabled={editSaving}
            fullWidth
            sx={{
              color: BRAND.muted, fontWeight: 600, fontFamily: FONT, textTransform: 'none',
              borderRadius: '12px', border: `1px solid ${BRAND.border}`, py: 1.1,
              '&:hover': { bgcolor: BRAND.navySoft },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleEditSave} disabled={editSaving}
            fullWidth variant="contained" disableElevation
            startIcon={editSaving ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : null}
            sx={{
              bgcolor: BRAND.navy, color: '#fff', fontWeight: 700, fontFamily: FONT,
              textTransform: 'none', borderRadius: '12px', py: 1.1,
              '&:hover': { bgcolor: BRAND.navyDark },
            }}
          >
            {editSaving ? 'Saving…' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Add dialog ──────────────────────────────────────────────── */}
      <AddComplianceOfficerDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        addOfficer={addOfficer}
      />
    </Box>
  );
};

export default ComplianceOfficersList;
