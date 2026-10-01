import React, { useState } from 'react';
import {
  Paper, Typography, Stack, Box, Avatar, IconButton, Tooltip,
  Menu, MenuItem, ListItemIcon, ListItemText,
} from '@mui/material';
import {
  Description, History, MoreVert, Edit, DeleteOutlined,
  Download,
} from '@mui/icons-material';

const PRIMARY      = '#1E3358';
const PRIMARY_SOFT = 'rgba(30, 51, 88, 0.10)';

const formatDate = (iso) => {
  try {
    const d = new Date(iso);
    return d
      .toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
      .toUpperCase();
  } catch {
    return '';
  }
};

const scoreColor = (score) => {
  if (score >= 85) return '#2E7D32';
  if (score >= 70) return '#ED6C02';
  return '#C62828';
};

const RecentResumes = ({ resumes = [], onDelete, onEdit, onDownload }) => {
  const [anchorEl,     setAnchorEl]     = useState(null);
  const [activeResume, setActiveResume] = useState(null);

  const handleMenuOpen = (e, resume) => {
    setAnchorEl(e.currentTarget);
    setActiveResume(resume);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setActiveResume(null);
  };

  const handleAction = (action) => {
    const resume = activeResume;
    handleMenuClose();
    if (action === 'edit'   && onEdit)   onEdit(resume);
    if (action === 'delete' && onDelete) onDelete(resume);
  };

  return (
    <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #E5E7EB' }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2.5 }}>
        <History sx={{ color: PRIMARY }} />
        <Typography variant="h6" fontWeight={700} sx={{ color: PRIMARY }}>
          Recent Resumes
        </Typography>
      </Stack>

      {resumes.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6, color: '#9CA3AF' }}>
          <Description sx={{ fontSize: 40, mb: 1 }} />
          <Typography variant="body2">
            No resumes yet. Launch the AI Builder to upload your first resume.
          </Typography>
        </Box>
      ) : (
        <Stack spacing={1.5}>
          {resumes.map((r) => (
            <Paper
              key={r.id}
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 2,
                border: '1px solid #F3F4F6',
                transition: 'all 0.15s ease',
                '&:hover': { borderColor: '#E5E7EB', bgcolor: '#FAFAFA' },
              }}
            >
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar sx={{ bgcolor: PRIMARY_SOFT, color: PRIMARY, width: 44, height: 44 }}>
                  <Description />
                </Avatar>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography fontWeight={600} sx={{ color: PRIMARY }} noWrap>
                    {r.filename}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#9CA3AF', letterSpacing: 0.5 }}>
                    {formatDate(r.createdAt)}
                  </Typography>
                </Box>

                {/* ATS Score — only shown when backend provides it */}
                {r.atsScore != null && (
                  <Box sx={{ textAlign: 'right', mr: 0.5 }}>
                    <Typography
                      variant="caption"
                      sx={{ color: '#9CA3AF', display: 'block', letterSpacing: 0.5, textTransform: 'uppercase' }}
                    >
                      ATS Score
                    </Typography>
                    <Typography variant="h6" fontWeight={700} sx={{ color: scoreColor(r.atsScore) }}>
                      {r.atsScore}%
                    </Typography>
                  </Box>
                )}

                <Tooltip title="Download DOCX">
                  <IconButton size="small" sx={{ color: PRIMARY }} onClick={() => onDownload?.(r)}>
                    <Download fontSize="small" />
                  </IconButton>
                </Tooltip>

                <Tooltip title="More options">
                  <IconButton size="small" sx={{ color: '#6B7280' }} onClick={(e) => handleMenuOpen(e, r)}>
                    <MoreVert fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}

      {/* Shared menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              minWidth: 160,
              borderRadius: 2,
              boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
              mt: 0.5,
            },
          },
        }}
      >
        <MenuItem onClick={() => handleAction('edit')} sx={{ py: 1 }}>
          <ListItemIcon><Edit fontSize="small" sx={{ color: PRIMARY }} /></ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: 14 }}>Edit in AI Builder</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleAction('delete')} sx={{ py: 1 }}>
          <ListItemIcon><DeleteOutlined fontSize="small" sx={{ color: '#C62828' }} /></ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: 14, color: '#C62828' }}>Delete</ListItemText>
        </MenuItem>
      </Menu>
    </Paper>
  );
};

export default RecentResumes;