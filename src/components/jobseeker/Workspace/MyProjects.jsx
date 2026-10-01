// ============================================================================
// MyProjects.jsx
// Workspace > My Projects
// Location: src/components/jobseeker/Workspace/MyProjects.jsx
// ============================================================================

import React, { useState } from 'react';
import {
  Box, Paper, Typography, Stack, Grid, Avatar, Chip, Button, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  CircularProgress, Alert, Snackbar, MenuItem, Divider, Tooltip,
} from '@mui/material';
import {
  Add, Edit, Delete, Launch, GitHub, FolderSpecial,
} from '@mui/icons-material';
import useMyProjects from '@/hooks/jobseeker/useMyProjects';

const PRIMARY       = '#1E3358';
const PRIMARY_DARK  = '#162848';
const PRIMARY_SOFT  = 'rgba(30,51,88,0.08)';

const STATUS_CFG = {
  in_progress: { label: 'In Progress', color: '#1558A8', bg: 'rgba(21,88,168,0.10)',  dot: '#1558A8' },
  completed:   { label: 'Completed',   color: '#1A7A4A', bg: 'rgba(26,122,74,0.10)',  dot: '#1A7A4A' },
  on_hold:     { label: 'On Hold',     color: '#B45309', bg: 'rgba(180,83,9,0.10)',   dot: '#B45309' },
};

const EMPTY = {
  title: '', description: '', technologies: '',
  status: 'in_progress', startDate: '', endDate: '',
  role: '', githubUrl: '', liveUrl: '',
  coverColor: '#1E3358',
};

const COVER_COLORS = ['#1E3358','#0F6E56','#3C3489','#993C1D','#0C447C','#3B6D11','#854F0B'];

/* ── Stat badge ── */
const StatBadge = ({ label, value }) => (
  <Box sx={{
    px: 1.5, py: 0.5,
    bgcolor: PRIMARY_SOFT,
    borderRadius: 6,
    display: 'inline-flex', alignItems: 'center', gap: 0.5,
  }}>
    <Typography variant="caption" sx={{ color: PRIMARY, fontWeight: 700, fontSize: '0.78rem' }}>{value}</Typography>
    <Typography variant="caption" sx={{ color: '#6B7280', fontSize: '0.72rem' }}>{label}</Typography>
  </Box>
);

const MyProjects = () => {
  const { projects, loading, saving, error, createProject, updateProject, deleteProject } =
    useMyProjects();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm]             = useState(EMPTY);
  const [editingId, setEditingId]   = useState(null);
  const [toast, setToast]           = useState(null);

  const openCreate = () => { setForm(EMPTY); setEditingId(null); setDialogOpen(true); };
  const openEdit   = (p) => {
    setForm({
      ...p,
      technologies: Array.isArray(p.technologies) ? p.technologies.join(', ') : (p.technologies || ''),
      startDate: p.startDate || '',
      endDate:   p.endDate   || '',
    });
    setEditingId(p.id);
    setDialogOpen(true);
  };
  const handleClose = () => setDialogOpen(false);

  const handleSubmit = async () => {
    const payload = {
      ...form,
      technologies: form.technologies.split(',').map(s => s.trim()).filter(Boolean),
      highlights: form.highlights || [],
    };
    try {
      if (editingId) { await updateProject(editingId, payload); setToast({ severity: 'success', message: 'Project updated.' }); }
      else           { await createProject(payload);             setToast({ severity: 'success', message: 'Project added.'   }); }
      setDialogOpen(false);
    } catch { setToast({ severity: 'error', message: 'Save failed.' }); }
  };

  const handleDelete = async (p) => {
    if (!window.confirm(`Delete "${p.title}"?`)) return;
    try { await deleteProject(p.id); setToast({ severity: 'success', message: 'Project deleted.' }); }
    catch { setToast({ severity: 'error', message: 'Delete failed.' }); }
  };

  /* counts */
  const total      = projects.length;
  const completed  = projects.filter(p => p.status === 'completed').length;
  const inProgress = projects.filter(p => p.status === 'in_progress').length;

  return (
    <Box>
      {/* ── Header ── */}
      <Box sx={{
        mb: 3.5,
        pb: 3,
        borderBottom: '1px solid #E5E7EB',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 2,
      }}>
        <Box>
          <Stack direction="row" alignItems="center" spacing={1.25} mb={0.5}>
            <Box sx={{
              width: 36, height: 36, borderRadius: 2,
              bgcolor: PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <FolderSpecial sx={{ color: '#fff', fontSize: 18 }} />
            </Box>
            <Typography variant="h5" fontWeight={700} sx={{ color: PRIMARY, letterSpacing: '-0.3px' }}>
              My Projects
            </Typography>
          </Stack>
          <Typography variant="body2" sx={{ color: '#9CA3AF', ml: 0.5 }}>
            Showcase your work and track progress
          </Typography>
          {total > 0 && (
            <Stack direction="row" spacing={1} mt={1.5}>
              <StatBadge value={total}      label="total"       />
              <StatBadge value={completed}  label="completed"   />
              <StatBadge value={inProgress} label="in progress" />
            </Stack>
          )}
        </Box>

        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={openCreate}
          sx={{
            bgcolor: PRIMARY, textTransform: 'none', borderRadius: 2,
            px: 2.5, py: 1.1, fontWeight: 600, fontSize: '0.875rem',
            boxShadow: '0 2px 8px rgba(30,51,88,0.25)',
            '&:hover': { bgcolor: PRIMARY_DARK, boxShadow: '0 4px 14px rgba(30,51,88,0.35)' },
          }}
        >
          Add Project
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      {/* ── Loading ── */}
      {loading && !projects.length ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress sx={{ color: PRIMARY }} />
        </Box>

      /* ── Empty state ── */
      ) : projects.length === 0 ? (
        <Box sx={{
          textAlign: 'center', py: 10, px: 4,
          border: '1.5px dashed #D1D5DB', borderRadius: 3,
          bgcolor: '#FAFAFA',
        }}>
          <Box sx={{
            width: 64, height: 64, borderRadius: '50%',
            bgcolor: PRIMARY_SOFT, display: 'flex', alignItems: 'center',
            justifyContent: 'center', mx: 'auto', mb: 2,
          }}>
            <FolderSpecial sx={{ fontSize: 30, color: PRIMARY }} />
          </Box>
          <Typography fontWeight={600} sx={{ color: PRIMARY, mb: 0.5 }}>
            No projects yet
          </Typography>
          <Typography variant="body2" sx={{ color: '#9CA3AF', mb: 2.5 }}>
            Add your first project to start building your portfolio.
          </Typography>
          <Button
            variant="contained" startIcon={<Add />} onClick={openCreate}
            sx={{
              bgcolor: PRIMARY, textTransform: 'none', borderRadius: 2,
              fontWeight: 600, '&:hover': { bgcolor: PRIMARY_DARK },
            }}
          >
            Add your first project
          </Button>
        </Box>

      /* ── Cards grid ── */
      ) : (
        <Grid container spacing={2.5}>
          {projects.map((p) => {
            const cfg = STATUS_CFG[p.status] || STATUS_CFG.in_progress;
            const techs = (p.technologies || []).slice(0, 4);
            const extraTechs = (p.technologies || []).length - 4;

            return (
              <Grid key={p.id} size={{ xs: 12, md: 6 }}>
                <Paper
                  elevation={0}
                  sx={{
                    borderRadius: 3,
                    border: '1px solid #E5E7EB',
                    overflow: 'hidden',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'box-shadow 0.2s ease, transform 0.2s ease',
                    '&:hover': {
                      boxShadow: '0 8px 24px rgba(30,51,88,0.10)',
                      transform: 'translateY(-2px)',
                    },
                  }}
                >
                  {/* Color bar */}
                  <Box sx={{ height: 5, bgcolor: p.coverColor || PRIMARY, flexShrink: 0 }} />

                  <Box sx={{ p: 2.5, flex: 1, display: 'flex', flexDirection: 'column' }}>

                    {/* Title row */}
                    <Stack direction="row" alignItems="flex-start" spacing={1.5} mb={1.5}>
                      <Avatar sx={{
                        bgcolor: `${p.coverColor || PRIMARY}18`,
                        color: p.coverColor || PRIMARY,
                        width: 42, height: 42, borderRadius: 2,
                        fontSize: 18,
                      }}>
                        <FolderSpecial fontSize="inherit" />
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography fontWeight={700} sx={{ color: PRIMARY, lineHeight: 1.3, mb: 0.25 }} noWrap>
                          {p.title}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#9CA3AF', display: 'block' }}>
                          {[p.role, p.startDate && `${p.startDate} – ${p.endDate || 'Present'}`].filter(Boolean).join('  ·  ')}
                        </Typography>
                      </Box>
                      {/* Status chip */}
                      <Chip
                        size="small"
                        label={
                          <Stack direction="row" alignItems="center" spacing={0.5}>
                            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: cfg.dot, flexShrink: 0 }} />
                            <span>{cfg.label}</span>
                          </Stack>
                        }
                        sx={{
                          bgcolor: cfg.bg, color: cfg.color,
                          fontWeight: 600, fontSize: '0.72rem',
                          height: 24, flexShrink: 0,
                          '& .MuiChip-label': { px: 1 },
                        }}
                      />
                    </Stack>

                    {/* Description */}
                    <Typography
                      variant="body2"
                      sx={{
                        color: '#4B5563', mb: 1.75, lineHeight: 1.65,
                        display: '-webkit-box', WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}
                    >
                      {p.description}
                    </Typography>

                    {/* Tech chips */}
                    {techs.length > 0 && (
                      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap mb={1.5}>
                        {techs.map(t => (
                          <Chip
                            key={t} label={t} size="small"
                            sx={{
                              bgcolor: '#F3F4F6', color: '#374151',
                              fontSize: '0.7rem', fontWeight: 500,
                              borderRadius: 1.5, height: 22,
                              '& .MuiChip-label': { px: 1 },
                            }}
                          />
                        ))}
                        {extraTechs > 0 && (
                          <Chip
                            label={`+${extraTechs}`} size="small"
                            sx={{
                              bgcolor: PRIMARY_SOFT, color: PRIMARY,
                              fontSize: '0.7rem', fontWeight: 600,
                              borderRadius: 1.5, height: 22,
                              '& .MuiChip-label': { px: 1 },
                            }}
                          />
                        )}
                      </Stack>
                    )}

                    {/* Highlights */}
                    {p.highlights?.length > 0 && (
                      <Box sx={{ mb: 1.5 }}>
                        {p.highlights.slice(0, 2).map((h, idx) => (
                          <Stack key={idx} direction="row" spacing={1} alignItems="flex-start" mb={0.5}>
                            <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: p.coverColor || PRIMARY, mt: '7px', flexShrink: 0 }} />
                            <Typography variant="caption" sx={{ color: '#4B5563', lineHeight: 1.5 }}>{h}</Typography>
                          </Stack>
                        ))}
                      </Box>
                    )}

                    <Box sx={{ flex: 1 }} />

                    <Divider sx={{ my: 1.5, borderColor: '#F3F4F6' }} />

                    {/* Footer actions */}
                    <Stack direction="row" alignItems="center">
                      <Stack direction="row" spacing={0.5}>
                        {p.githubUrl && (
                          <Tooltip title="GitHub repo">
                            <IconButton size="small" href={p.githubUrl} target="_blank" rel="noreferrer"
                              sx={{
                                color: '#6B7280', bgcolor: '#F9FAFB',
                                border: '1px solid #E5E7EB', borderRadius: 1.5,
                                width: 30, height: 30,
                                '&:hover': { color: PRIMARY, bgcolor: PRIMARY_SOFT, borderColor: PRIMARY },
                              }}
                            >
                              <GitHub sx={{ fontSize: 15 }} />
                            </IconButton>
                          </Tooltip>
                        )}
                        {p.liveUrl && (
                          <Tooltip title="Live demo">
                            <IconButton size="small" href={p.liveUrl} target="_blank" rel="noreferrer"
                              sx={{
                                color: '#6B7280', bgcolor: '#F9FAFB',
                                border: '1px solid #E5E7EB', borderRadius: 1.5,
                                width: 30, height: 30,
                                '&:hover': { color: PRIMARY, bgcolor: PRIMARY_SOFT, borderColor: PRIMARY },
                              }}
                            >
                              <Launch sx={{ fontSize: 15 }} />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>

                      <Box sx={{ flex: 1 }} />

                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => openEdit(p)}
                            sx={{
                              color: '#6B7280', bgcolor: '#F9FAFB',
                              border: '1px solid #E5E7EB', borderRadius: 1.5,
                              width: 30, height: 30,
                              '&:hover': { color: PRIMARY, bgcolor: PRIMARY_SOFT, borderColor: PRIMARY },
                            }}
                          >
                            <Edit sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" onClick={() => handleDelete(p)}
                            sx={{
                              color: '#9CA3AF', bgcolor: '#F9FAFB',
                              border: '1px solid #E5E7EB', borderRadius: 1.5,
                              width: 30, height: 30,
                              '&:hover': { color: '#C62828', bgcolor: 'rgba(198,40,40,0.06)', borderColor: '#C62828' },
                            }}
                          >
                            <Delete sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Stack>
                  </Box>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* ── Dialog ── */}
      <Dialog
        open={dialogOpen}
        onClose={handleClose}
        fullWidth maxWidth="sm"
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1.25}>
            <Box sx={{
              width: 32, height: 32, borderRadius: 1.5,
              bgcolor: PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <FolderSpecial sx={{ color: '#fff', fontSize: 16 }} />
            </Box>
            <Typography fontWeight={700} sx={{ color: PRIMARY, fontSize: '1.05rem' }}>
              {editingId ? 'Edit project' : 'Add a new project'}
            </Typography>
          </Stack>
        </DialogTitle>

        <DialogContent dividers sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <TextField
              label="Project title" fullWidth size="small"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            />
            <TextField
              label="Description" fullWidth size="small" multiline minRows={2}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
            <TextField
              label="Technologies (comma-separated)" fullWidth size="small"
              placeholder="e.g. React, Node.js, PostgreSQL"
              value={form.technologies}
              onChange={e => setForm(f => ({ ...f, technologies: e.target.value }))}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Your role" fullWidth size="small"
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              />
              <TextField
                select label="Status" fullWidth size="small"
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              >
                <MenuItem value="in_progress">In Progress</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="on_hold">On Hold</MenuItem>
              </TextField>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Start date" type="date" fullWidth size="small"
                InputLabelProps={{ shrink: true }}
                value={form.startDate || ''}
                onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
              />
              <TextField
                label="End date" type="date" fullWidth size="small"
                InputLabelProps={{ shrink: true }}
                value={form.endDate || ''}
                onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="GitHub URL" fullWidth size="small"
                value={form.githubUrl}
                onChange={e => setForm(f => ({ ...f, githubUrl: e.target.value }))}
              />
              <TextField
                label="Live URL" fullWidth size="small"
                value={form.liveUrl}
                onChange={e => setForm(f => ({ ...f, liveUrl: e.target.value }))}
              />
            </Stack>

            {/* Cover color picker */}
            <Box>
              <Typography variant="caption" sx={{ color: '#6B7280', fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase', display: 'block', mb: 1 }}>
                Card accent color
              </Typography>
              <Stack direction="row" spacing={1}>
                {COVER_COLORS.map(c => (
                  <Box
                    key={c}
                    onClick={() => setForm(f => ({ ...f, coverColor: c }))}
                    sx={{
                      width: 26, height: 26, borderRadius: '50%', bgcolor: c,
                      cursor: 'pointer',
                      outline: form.coverColor === c ? `2.5px solid ${c}` : 'none',
                      outlineOffset: 2,
                      transition: 'transform 0.15s',
                      '&:hover': { transform: 'scale(1.15)' },
                    }}
                  />
                ))}
              </Stack>
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleClose}
            sx={{ color: '#6B7280', textTransform: 'none', borderRadius: 2, fontWeight: 500 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={saving || !form.title.trim()}
            onClick={handleSubmit}
            sx={{
              bgcolor: PRIMARY, textTransform: 'none', borderRadius: 2,
              px: 2.5, fontWeight: 600,
              '&:hover': { bgcolor: PRIMARY_DARK },
            }}
          >
            {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add project'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Toast ── */}
      <Snackbar
        open={!!toast}
        autoHideDuration={3500}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        {toast && (
          <Alert severity={toast.severity} onClose={() => setToast(null)} variant="filled"
            sx={{ borderRadius: 2 }}>
            {toast.message}
          </Alert>
        )}
      </Snackbar>
    </Box>
  );
};

export default MyProjects;