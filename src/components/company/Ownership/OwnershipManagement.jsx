import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Paper, Typography, Button, TextField, MenuItem,
  CircularProgress, Alert, Dialog, DialogTitle, DialogContent,
  DialogActions, Select, InputLabel, FormControl,
  InputAdornment, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Pagination,
  useTheme, useMediaQuery,
} from '@mui/material';
import {
  Search as SearchIcon,
  SwapHoriz as SwapHorizIcon,
  Person as PersonIcon,
  Add as AddIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
  WorkOutlined as WorkOutlineIcon,
  RefreshOutlined,
} from '@mui/icons-material';
import jobPost from '@/services/api/company/jobPost';
import adminService from '@/services/api/company/adminService';

/* ── Brand tokens ───────────────────────────────────────────────── */
const BRAND = {
  navy:        '#022124',
  navyHover:   '#043438',
  sage:        '#7F9E7E',
  sageLight:   '#9FB39E',
  sageSoft:    '#EDF3EC',
  sageText:    '#5E815D',
  border:      '#E7EAE3',
  bgCard:      '#FAFBF9',
  warning:     '#F59E0B',
  warningSoft: '#FEF3C7',
  warningText: '#B45309',
  error:       '#EF4444',
  errorSoft:   '#FEE2E2',
  textMain:    '#1C2B2B',
  textMuted:   '#6B736B',
  textFaint:   '#9AA39A',
  rowZebra:    '#FAFBF9',
  rowDivider:  '#EEF1EB',
};

const PAGE_SIZE = 10;

export default function OwnershipManagement() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [jobs, setJobs]             = useState([]);
  const [employers, setEmployers]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | assigned | unassigned
  const [page, setPage]             = useState(1);
  const [reassignDialog, setReassignDialog] = useState(null);
  const [reassigning, setReassigning]       = useState(false);
  const [successMsg, setSuccessMsg]         = useState(null);

  // ── Fetch jobs + employers ─────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [jobsRes, empRes] = await Promise.all([
        jobPost.getAllCompanyJobs(),
        adminService.getEmployers(),
      ]);
      const jobList = jobsRes?.data?.Jobs ?? jobsRes?.data?.jobs ?? [];
      setJobs(Array.isArray(jobList) ? jobList : []);

      const empList = empRes?.data?.results ?? empRes?.data?.employers ?? empRes?.data?.Employers ?? [];
      setEmployers(Array.isArray(empList) ? empList : []);
    } catch (err) {
      setError(err?.response?.data?.Error || err?.message || 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Counts ─────────────────────────────────────────────────────
  const assignedCount   = useMemo(() => jobs.filter(j => j.employer_id).length, [jobs]);
  const unassignedCount = useMemo(() => jobs.filter(j => !j.employer_id).length, [jobs]);

  // ── Filter (status + search) + paginate ────────────────────────
  const filtered = useMemo(() => {
    let list = jobs;
    if (statusFilter === 'assigned')   list = list.filter(j => j.employer_id);
    if (statusFilter === 'unassigned') list = list.filter(j => !j.employer_id);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(j =>
        (j.job_title || '').toLowerCase().includes(q) ||
        (j.employer?.name || '').toLowerCase().includes(q) ||
        String(j.id || '').includes(q)
      );
    }
    return list;
  }, [jobs, search, statusFilter]);

  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const rangeStart = filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd   = Math.min(page * PAGE_SIZE, filtered.length);

  // ── Employer lookup map ────────────────────────────────────────
  const empMap = useMemo(() => {
    const m = {};
    employers.forEach(e => { m[e.id] = e; });
    return m;
  }, [employers]);

  const getOwnerName = (job) => {
    if (!job.employer_id) return 'Unassigned';
    const emp = empMap[job.employer_id];
    if (emp) return emp.full_name || emp.name || emp.email || `ID: ${job.employer_id}`;
    return job.employer?.name || `Employee #${job.employer_id}`;
  };

  const getInitial = (name) => (name && name.trim() ? name.trim()[0].toUpperCase() : '?');

  // ── Reassign handler ───────────────────────────────────────────
  const handleReassign = async () => {
    if (!reassignDialog?.jobId || !reassignDialog?.newEmployeeId) return;
    setReassigning(true);
    try {
      const res = await jobPost.reassignJobOwner(reassignDialog.jobId, reassignDialog.newEmployeeId);
      const cascade = res?.data?.cascade || {};
      setSuccessMsg(
        `Job #${reassignDialog.jobId} reassigned. ` +
        `Pipelines: ${cascade.pipelines_updated || 0}, ` +
        `Releases: ${cascade.releases_updated || 0}, ` +
        `Assessments: ${cascade.assessments_updated || 0}`
      );
      setReassignDialog(null);
      await fetchData();
    } catch (err) {
      setError(err?.response?.data?.Error || err?.response?.data?.detail || 'Reassignment failed.');
    } finally {
      setReassigning(false);
    }
  };

  const changeFilter = (f) => { setStatusFilter(f); setPage(1); };

  // ── Tab style helper ───────────────────────────────────────────
  const tabSx = (key) => {
    const active = statusFilter === key;
    return {
      cursor: 'pointer',
      userSelect: 'none',
      display: 'flex',
      alignItems: 'center',
      gap: 1,
      borderRadius: 999,
      px: 2,
      py: 0.9,
      fontSize: 13,
      fontWeight: 500,
      transition: 'all .15s',
      bgcolor: active ? BRAND.navy : 'transparent',
      color: active ? '#fff' : BRAND.textMuted,
      border: `1px solid ${active ? BRAND.navy : BRAND.border}`,
      '&:hover': { borderColor: active ? BRAND.navy : BRAND.sage },
      '& .badge': {
        bgcolor: active ? 'rgba(255,255,255,.18)' : BRAND.bgCard,
        color: active ? '#fff' : BRAND.textMuted,
        borderRadius: 999,
        px: 1,
        py: '1px',
        fontSize: 12,
      },
    };
  };

  // ── Render ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress sx={{ color: BRAND.sage }} />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, md: 3 }, py: 3 }}>
      {/* Panel header */}
      <Paper
        elevation={0}
        sx={{ border: `1px solid ${BRAND.border}`, borderRadius: '18px', p: { xs: 2, md: 2.75 }, mb: 2 }}
      >
        {/* Title row */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.25, flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography sx={{ fontWeight: 600, color: BRAND.navy, fontSize: 26, lineHeight: 1.2 }}>
              Assign Jobs
            </Typography>
            <Typography variant="body2" sx={{ color: BRAND.sageText, mt: 0.25 }}>
              <Box component="span" sx={{ fontWeight: 600 }}>{jobs.length} jobs</Box> across your organisation
            </Typography>
          </Box>
          <IconButton
            onClick={fetchData}
            sx={{
              width: 38, height: 38, borderRadius: '10px',
              border: `1px solid ${BRAND.border}`, color: BRAND.sageText,
              '&:hover': { bgcolor: BRAND.sageSoft },
            }}
          >
            <RefreshOutlined fontSize="small" />
          </IconButton>
        </Box>

        {/* Search */}
        <TextField
          placeholder="Search by job title, owner or ID..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          fullWidth
          sx={{
            mb: 2,
            '& .MuiOutlinedInput-root': {
              bgcolor: BRAND.sageSoft,
              borderRadius: '12px',
              height: 48,
              '& fieldset': { border: 'none' },
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: BRAND.sage, fontSize: 20 }} />
              </InputAdornment>
            ),
          }}
        />

        {/* Filter pills */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <Box onClick={() => changeFilter('all')} sx={tabSx('all')}>
            All jobs <span className="badge">{jobs.length}</span>
          </Box>
          <Box onClick={() => changeFilter('assigned')} sx={tabSx('assigned')}>
            Assigned <span className="badge">{assignedCount}</span>
          </Box>
          <Box onClick={() => changeFilter('unassigned')} sx={tabSx('unassigned')}>
            Unassigned <span className="badge">{unassignedCount}</span>
          </Box>
        </Box>
      </Paper>

      {/* Alerts */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {successMsg && (
        <Alert severity="success" onClose={() => setSuccessMsg(null)} sx={{ mb: 2 }}>
          {successMsg}
        </Alert>
      )}

      {/* Table card */}
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{ borderRadius: '14px', border: `1px solid ${BRAND.border}`, overflow: 'hidden' }}
      >
        <Table
          size={isMobile ? 'small' : 'medium'}
          sx={{
            /* Sage-green header — !important beats the app theme's blue */
            '& .MuiTableHead-root, & .MuiTableHead-root .MuiTableRow-root': {
              backgroundColor: `${BRAND.sageSoft} !important`,
            },
            '& .MuiTableCell-head': {
              backgroundColor: `${BRAND.sageSoft} !important`,
              color: `${BRAND.sageText} !important`,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: .6,
              textTransform: 'uppercase',
              borderBottom: `1px solid ${BRAND.border} !important`,
            },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell>Job</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Current owner</TableCell>
              <TableCell align="right">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4, color: BRAND.textMuted }}>
                  {search || statusFilter !== 'all' ? 'No jobs match your filters.' : 'No job postings found.'}
                </TableCell>
              </TableRow>
            ) : (
              paged.map((job, idx) => {
                const jobId = job.id || job.job_id;
                const ownerName = getOwnerName(job);
                const isUnassigned = !job.employer_id;

                return (
                  <TableRow
                    key={jobId}
                    hover
                    sx={{
                      bgcolor: idx % 2 === 1 ? BRAND.rowZebra : '#fff',
                      '& td': { borderBottom: `1px solid ${BRAND.rowDivider}` },
                    }}
                  >
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500, color: BRAND.navy }}>
                        {job.job_title || 'Untitled'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: BRAND.textFaint }}>
                        ID: {jobId} · {job.job_location || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box
                        component="span"
                        sx={{
                          display: 'inline-block',
                          bgcolor: job.display_status === 'Active' ? BRAND.sageSoft : BRAND.bgCard,
                          color: job.display_status === 'Active' ? BRAND.sageText : BRAND.textMuted,
                          fontWeight: 500,
                          fontSize: 12,
                          borderRadius: 1.5,
                          px: 1.25,
                          py: 0.4,
                        }}
                      >
                        {job.display_status || job.status || '—'}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {isUnassigned ? (
                          <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: BRAND.warningSoft, color: BRAND.warningText, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <PersonIcon sx={{ fontSize: 17 }} />
                          </Box>
                        ) : (
                          <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: BRAND.sage, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 500 }}>
                            {getInitial(ownerName)}
                          </Box>
                        )}
                        <Typography variant="body2" sx={{ color: isUnassigned ? BRAND.warningText : BRAND.textMain, fontWeight: isUnassigned ? 500 : 400 }}>
                          {ownerName}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      {isUnassigned ? (
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<AddIcon />}
                          disableElevation
                          onClick={() => setReassignDialog({ jobId, jobTitle: job.job_title, currentOwner: ownerName, currentOwnerId: job.employer_id, newEmployeeId: '' })}
                          sx={{
                            textTransform: 'none',
                            bgcolor: BRAND.navy,
                            '&:hover': { bgcolor: BRAND.navyHover },
                          }}
                        >
                          Assign
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<SwapHorizIcon />}
                          onClick={() => setReassignDialog({ jobId, jobTitle: job.job_title, currentOwner: ownerName, currentOwnerId: job.employer_id, newEmployeeId: '' })}
                          sx={{
                            textTransform: 'none',
                            color: BRAND.sageText,
                            borderColor: BRAND.border,
                            '&:hover': { borderColor: BRAND.sage, bgcolor: BRAND.sageSoft },
                          }}
                        >
                          Reassign
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Pagination footer (inside the card) */}
        {filtered.length > 0 && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 1,
              px: 2.25,
              py: 1.5,
              bgcolor: BRAND.bgCard,
              borderTop: `1px solid ${BRAND.rowDivider}`,
            }}
          >
            <Typography variant="caption" sx={{ color: BRAND.textFaint }}>
              Showing {rangeStart}–{rangeEnd} of {filtered.length}
            </Typography>
            {pageCount > 1 && (
              <Pagination
                count={pageCount}
                page={page}
                onChange={(_, p) => setPage(p)}
                size="small"
                shape="rounded"
                sx={{
                  '& .MuiPaginationItem-root': { color: BRAND.navy, borderRadius: '7px' },
                  '& .MuiPaginationItem-root.Mui-selected': {
                    bgcolor: BRAND.sage,
                    color: '#fff',
                    '&:hover': { bgcolor: BRAND.sageText },
                  },
                }}
              />
            )}
          </Box>
        )}
      </TableContainer>

      {/* Reassign Dialog */}
      <Dialog
        open={!!reassignDialog}
        onClose={() => !reassigning && setReassignDialog(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '16px', overflow: 'hidden' } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.75, borderBottom: `1px solid ${BRAND.rowDivider}` }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Box sx={{ width: 32, height: 32, borderRadius: '9px', bgcolor: BRAND.sageSoft, color: BRAND.sageText, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <SwapHorizIcon fontSize="small" />
            </Box>
            <Typography sx={{ fontSize: 17, fontWeight: 600, color: BRAND.navy }}>
              {reassignDialog?.currentOwnerId ? 'Reassign ownership' : 'Assign ownership'}
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => !reassigning && setReassignDialog(null)} sx={{ color: BRAND.textFaint }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 2.5 }}>
          {/* Warning */}
          <Box sx={{ display: 'flex', gap: 1.25, bgcolor: '#FEF8E7', border: '1px solid #F6E8C0', borderRadius: '10px', p: 1.5, mb: 2 }}>
            <WarningIcon sx={{ color: BRAND.warning, fontSize: 19, mt: '1px', flexShrink: 0 }} />
            <Typography sx={{ fontSize: 12.5, color: '#92400E', lineHeight: 1.5 }}>
              This transfers full control. The original owner keeps read-only access. Changes cascade to all linked pipelines, releases, and assessments.
            </Typography>
          </Box>

          {/* Job info */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75, bgcolor: BRAND.bgCard, border: `1px solid ${BRAND.border}`, borderRadius: '12px', p: 2, mb: 2 }}>
            <Box sx={{ width: 44, height: 44, borderRadius: '11px', bgcolor: BRAND.navy, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <WorkOutlineIcon sx={{ fontSize: 20 }} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: 11, color: BRAND.textFaint, textTransform: 'uppercase', letterSpacing: .5 }}>Job</Typography>
              <Typography sx={{ fontSize: 16, fontWeight: 500, color: BRAND.navy, mt: '1px' }} noWrap>
                {reassignDialog?.jobTitle || '—'}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.5 }}>
                <Typography sx={{ fontSize: 12, color: BRAND.textFaint }}>Current owner:</Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 500, color: reassignDialog?.currentOwnerId ? BRAND.sageText : BRAND.warningText }}>
                  {reassignDialog?.currentOwner || 'Unassigned'}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Employee selector */}
          <Typography sx={{ fontSize: 12, color: BRAND.textMuted, mb: 0.75 }}>
            {reassignDialog?.currentOwnerId ? 'Reassign to' : 'Assign to'}
          </Typography>
          <FormControl
            fullWidth
            size="small"
            sx={{
              '& .MuiOutlinedInput-root': { borderRadius: '10px' },
              '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: BRAND.sage },
            }}
          >
            <Select
              value={reassignDialog?.newEmployeeId || ''}
              onChange={(e) => setReassignDialog(prev => ({ ...prev, newEmployeeId: e.target.value }))}
              displayEmpty
              renderValue={(val) => {
                if (!val) return <Box component="span" sx={{ color: BRAND.textFaint }}>Select employee...</Box>;
                const e = empMap[val];
                return e ? (e.full_name || e.name || e.email) : 'Selected';
              }}
            >
              <MenuItem value="" disabled>Select employee...</MenuItem>
              {employers
                .filter(e => e.id !== reassignDialog?.currentOwnerId && e.is_activated !== false)
                .map(e => (
                  <MenuItem key={e.id} value={e.id}>
                    {e.full_name || e.name || e.email} — {e.role || 'Employee'}
                  </MenuItem>
                ))
              }
            </Select>
          </FormControl>
        </DialogContent>

        <DialogActions sx={{ px: 2.5, py: 1.75, borderTop: `1px solid ${BRAND.rowDivider}`, bgcolor: BRAND.bgCard }}>
          <Button onClick={() => setReassignDialog(null)} disabled={reassigning} sx={{ textTransform: 'none', color: BRAND.textMuted }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleReassign}
            disabled={!reassignDialog?.newEmployeeId || reassigning}
            disableElevation
            startIcon={reassigning ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <CheckCircleIcon />}
            sx={{
              textTransform: 'none',
              bgcolor: BRAND.navy,
              '&:hover': { bgcolor: BRAND.navyHover },
            }}
          >
            {reassigning
              ? (reassignDialog?.currentOwnerId ? 'Reassigning...' : 'Assigning...')
              : (reassignDialog?.currentOwnerId ? 'Confirm reassignment' : 'Confirm assignment')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}