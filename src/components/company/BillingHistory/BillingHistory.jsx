import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TablePagination, TableSortLabel,
  TextField, InputAdornment, MenuItem, Select, FormControl, InputLabel,
  Chip, IconButton, Tooltip, Stack, Dialog, DialogContent, DialogActions,
  Button, Divider, useTheme, useMediaQuery,
} from '@mui/material';
import {
  Search as SearchIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  Print as PrintIcon,
  Close as CloseIcon,
  ReceiptLong as ReceiptIcon,
  CheckCircle,
  Cancel,
  Schedule,
  Refresh as RetryIcon,
  RestartAlt as ResetIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';

// ── Design tokens (Sage/Charcoal/Skin/Off-White) ─────────────────────────
const T = {
  pageBg:      '#F6F8F3',
  cardBg:      '#FFFFFF',
  textDark:    '#101210',
  textMid:     '#55584F',
  textLight:   '#7A7E76',
  border:      '#E7EAE3',
  borderSoft:  '#F0F2ED',
  primary:     '#7F9E7E',
  primaryDark: '#5E815D',
  primarySoft: '#EDF3EC',
  accent:      '#7F9E7E',
  success:     '#5E815D',
  successBg:   '#EDF3EC',
  danger:      '#B4462F',
  dangerBg:    '#FBECEA',
  warn:        '#A35A2D',
  warnBg:      '#F6ECDF',
  neutralBg:   '#E8EFEF',
  neutralTx:   '#55584F',
};

const FONT = "'Jost','DM Sans',sans-serif";

const inputSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '10px', bgcolor: T.cardBg,
    color: T.textDark, fontFamily: FONT,
    '& fieldset': { borderColor: T.border },
    '&:hover fieldset': { borderColor: T.accent },
    '&.Mui-focused fieldset': { borderColor: T.primary, borderWidth: 2 },
  },
  '& input::placeholder': { color: T.textLight, opacity: 0.9 },
  '& .MuiInputLabel-root': { color: T.textLight, fontFamily: FONT },
  '& .MuiInputLabel-root.Mui-focused': { color: T.primary },
  '& .MuiSelect-icon': { color: T.textMid },
};

// ── Status → chip config ─────────────────────────────────────────────────
const STATUS_CONFIG = {
  paid:     { label: 'Paid',     bg: T.successBg, tx: T.success,   icon: <CheckCircle sx={{ fontSize: 12 }} /> },
  failed:   { label: 'Failed',   bg: T.dangerBg,  tx: T.danger,    icon: <Cancel sx={{ fontSize: 12 }} /> },
  pending:  { label: 'Pending',  bg: T.warnBg,    tx: '#8A4B26',   icon: <Schedule sx={{ fontSize: 12 }} /> },
  refunded: { label: 'Refunded', bg: T.neutralBg, tx: T.neutralTx, icon: <RetryIcon sx={{ fontSize: 12 }} /> },
};

// ── Sample data (REPLACE with your real data source: hook / prop / API) ──
const billingHistoryData = [
  { id: 1,  date: '2026-07-08', invoiceNumber: 'INV-2026-078', amount: 999,  plan: 'Platinum', status: 'paid',     method: 'Visa •••• 4242' },
  { id: 2,  date: '2026-06-08', invoiceNumber: 'INV-2026-067', amount: 999,  plan: 'Platinum', status: 'paid',     method: 'Visa •••• 4242' },
  { id: 3,  date: '2026-05-08', invoiceNumber: 'INV-2026-056', amount: 999,  plan: 'Platinum', status: 'paid',     method: 'Visa •••• 4242' },
  { id: 4,  date: '2026-04-08', invoiceNumber: 'INV-2026-045', amount: 999,  plan: 'Platinum', status: 'paid',     method: 'Visa •••• 4242' },
  { id: 5,  date: '2026-03-08', invoiceNumber: 'INV-2026-034', amount: 999,  plan: 'Platinum', status: 'failed',   method: 'Visa •••• 4242' },
  { id: 6,  date: '2026-02-08', invoiceNumber: 'INV-2026-023', amount: 499,  plan: 'Gold',     status: 'paid',     method: 'Visa •••• 4242' },
  { id: 7,  date: '2026-01-08', invoiceNumber: 'INV-2026-012', amount: 499,  plan: 'Gold',     status: 'paid',     method: 'Visa •••• 4242' },
  { id: 8,  date: '2025-12-08', invoiceNumber: 'INV-2025-234', amount: 499,  plan: 'Gold',     status: 'paid',     method: 'MC •••• 8888' },
  { id: 9,  date: '2025-11-08', invoiceNumber: 'INV-2025-215', amount: 199,  plan: 'Silver',   status: 'paid',     method: 'MC •••• 8888' },
  { id: 10, date: '2025-10-08', invoiceNumber: 'INV-2025-198', amount: 199,  plan: 'Silver',   status: 'refunded', method: 'MC •••• 8888' },
  { id: 11, date: '2025-09-08', invoiceNumber: 'INV-2025-178', amount: 199,  plan: 'Silver',   status: 'paid',     method: 'MC •••• 8888' },
  { id: 12, date: '2025-08-08', invoiceNumber: 'INV-2025-159', amount: 199,  plan: 'Silver',   status: 'pending',  method: 'Visa •••• 4242' },
  { id: 13, date: '2025-07-08', invoiceNumber: 'INV-2025-140', amount: 199,  plan: 'Silver',   status: 'paid',     method: 'Visa •••• 4242' },
  { id: 14, date: '2025-06-08', invoiceNumber: 'INV-2025-121', amount: 199,  plan: 'Silver',   status: 'paid',     method: 'Visa •••• 4242' },
  { id: 15, date: '2025-05-08', invoiceNumber: 'INV-2025-102', amount: 199,  plan: 'Silver',   status: 'paid',     method: 'Visa •••• 4242' },
];

// ── Formatters ──────────────────────────────────────────────────────────
const formatMoney = (amount, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);

const formatDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

// ── Component ───────────────────────────────────────────────────────────
const BillingHistory = () => {
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Filter, sort, pagination state
  const [search,        setSearch]        = useState('');
  const [statusFilter,  setStatusFilter]  = useState('all');
  const [sortField,     setSortField]     = useState('date');
  const [sortOrder,     setSortOrder]     = useState('desc');
  const [page,          setPage]          = useState(0);
  const [rowsPerPage,   setRowsPerPage]   = useState(10);
  const [invoiceDialog, setInvoiceDialog] = useState(null);

  // Derived data: filter + sort
  // 🔧 Wire your real data source here (replace `billingHistoryData`)
  const filteredSortedRows = useMemo(() => {
    let rows = billingHistoryData;
    if (statusFilter !== 'all') rows = rows.filter(r => r.status === statusFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(r =>
        r.invoiceNumber.toLowerCase().includes(q) ||
        r.plan.toLowerCase().includes(q) ||
        r.method.toLowerCase().includes(q)
      );
    }
    rows = [...rows].sort((a, b) => {
      const mult = sortOrder === 'asc' ? 1 : -1;
      if (sortField === 'amount') return (a.amount - b.amount) * mult;
      return (new Date(a.date) - new Date(b.date)) * mult;
    });
    return rows;
  }, [search, statusFilter, sortField, sortOrder]);

  const paginatedRows = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredSortedRows.slice(start, start + rowsPerPage);
  }, [filteredSortedRows, page, rowsPerPage]);

  // Handlers
  const handleSort = (field) => {
    if (sortField === field) setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortOrder('desc'); }
    setPage(0);
  };

  const handleDownload = (invoice) => {
    enqueueSnackbar(`Downloading ${invoice.invoiceNumber}`, { variant: 'success' });
  };

  const handleRetry = (invoice) => {
    enqueueSnackbar(`Retrying payment for ${invoice.invoiceNumber}…`, { variant: 'info' });
  };

  const handleResetFilters = () => {
    setSearch(''); setStatusFilter('all'); setPage(0);
  };

  const hasActiveFilters = search.trim() || statusFilter !== 'all';

  // Shared header cell styling
  const headerCellSx = {
    fontWeight: 700,
    color: 'rgba(255,255,255,0.85)',
    bgcolor: '#022124',
    fontSize: { xs: '0.66rem', sm: '0.7rem', md: '0.72rem' },
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    borderBottom: 'none',
  };
  const sortLabelSx = {
    color: 'rgba(255,255,255,0.85) !important',
    '&:hover': { color: '#fff !important' },
    '&.Mui-active': { color: '#fff !important' },
    '& .MuiTableSortLabel-icon': { color: `${T.primary} !important` },
  };

  return (
    <Box className="page-fade-in" sx={{
      bgcolor: T.pageBg,
      minHeight: '100%',
      width: '100%',
      maxWidth: '100vw',
      overflowX: 'hidden',
      p: { xs: 1, sm: 1.5, md: 2.5, lg: 3, xl: 3.5 },
      fontFamily: FONT,
      '& .MuiTypography-root, & .MuiButton-root, & .MuiChip-root, & .MuiInputBase-root, & .MuiMenuItem-root, & .MuiTableCell-root': { fontFamily: FONT },
    }}>
      <Box sx={{ maxWidth: 1400, mx: 'auto' }}>

        {/* Page Header — brand sage accent bar */}
        <Box sx={{ mb: { xs: 2, sm: 2.5, md: 3 }, display: 'flex', gap: 1.25 }}>
          <Box sx={{ width: 4, borderRadius: '4px', bgcolor: T.primary, flexShrink: 0, alignSelf: 'stretch', my: 0.4 }} />
          <Box>
            <Typography sx={{
              fontWeight: 700, color: T.textDark, letterSpacing: '-0.4px', lineHeight: 1.2,
              fontSize: { xs: '1.15rem', sm: '1.4rem', md: '1.65rem', lg: '1.85rem', xl: '2rem' },
              '@media (max-width: 320px)': { fontSize: '1rem' },
            }}>
              Billing History
            </Typography>
            <Typography sx={{
              color: T.textLight, mt: 0.4,
              fontSize: { xs: '0.72rem', sm: '0.82rem', md: '0.9rem' },
              '@media (max-width: 320px)': { fontSize: '0.66rem' },
            }}>
              All invoices and payment records for your subscription
            </Typography>
          </Box>
        </Box>

        {/* Main Panel */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: { xs: '12px', sm: '14px', md: '16px' },
            border: `1px solid ${T.border}`,
            bgcolor: T.cardBg,
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(2,33,36,0.04), 0 10px 30px rgba(2,33,36,0.07)',
          }}
        >
          {/* Filter Bar */}
          <Box sx={{
            display: 'flex',
            gap: { xs: 1, sm: 1.5 },
            p: { xs: 1.25, sm: 1.75, md: 2 },
            borderBottom: `1px solid ${T.borderSoft}`,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}>
            <TextField
              placeholder="Search invoice, plan, or card…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              sx={{
                flex: 1,
                minWidth: { xs: '100%', sm: 240 },
                '& .MuiOutlinedInput-root': {
                  bgcolor: T.pageBg, borderRadius: '25px',
                  fontSize: { xs: '0.82rem', sm: '0.88rem' },
                  height: { xs: 42, md: 44 },
                  color: T.textDark, fontFamily: FONT,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  '& input::placeholder': { color: T.textMid, opacity: 0.85 },
                  '& fieldset': { borderColor: '#B0BEC5', borderWidth: '1.5px' },
                  '&:hover fieldset': { borderColor: '#78909C', borderWidth: '2px' },
                  '&.Mui-focused': { boxShadow: '0 6px 18px rgba(0,0,0,0.12)' },
                  '&.Mui-focused fieldset': { borderColor: T.primary, borderWidth: '2px' },
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: { xs: 17, sm: 19 }, color: T.textMid }} />
                  </InputAdornment>
                ),
              }}
            />
            <FormControl size="small" sx={{
              minWidth: { xs: '100%', sm: 160 },
              '& .MuiInputBase-root': { fontSize: { xs: '0.78rem', sm: '0.86rem' } },
              ...inputSx,
            }}>
              <InputLabel sx={{ fontSize: { xs: '0.78rem', sm: '0.86rem' } }}>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
              >
                <MenuItem value="all">All statuses</MenuItem>
                <MenuItem value="paid">Paid</MenuItem>
                <MenuItem value="failed">Failed</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="refunded">Refunded</MenuItem>
              </Select>
            </FormControl>
            {hasActiveFilters && (
              <Button
                variant="text"
                size="small"
                startIcon={<ResetIcon sx={{ fontSize: { xs: 14, sm: 16 } }} />}
                onClick={handleResetFilters}
                sx={{
                  textTransform: 'none', fontWeight: 600, borderRadius: '8px',
                  color: T.textMid,
                  fontSize: { xs: '0.72rem', sm: '0.8rem' },
                  '&:hover': { bgcolor: T.pageBg, color: T.textDark },
                }}
              >
                Reset
              </Button>
            )}
          </Box>

          {/* Table */}
          <TableContainer sx={{
            overflow: 'auto',
            WebkitOverflowScrolling: 'touch',
            maxHeight: { xs: '60vh', sm: 'none' },
          }}>
            <Table
              size="small"
              stickyHeader
              sx={{
                minWidth: { xs: 720, sm: 780, md: 820 },
                '& th, & td': {
                  px: { xs: 1.25, sm: 1.75, md: 2.25 },
                  py: { xs: 1.1, sm: 1.35, md: 1.6 },
                  borderBottom: `1px solid ${T.borderSoft}`,
                },
              }}
            >
              <TableHead>
                <TableRow>
                  <TableCell sx={headerCellSx}>
                    <TableSortLabel
                      active={sortField === 'date'}
                      direction={sortOrder}
                      onClick={() => handleSort('date')}
                      sx={sortLabelSx}
                    >
                      Date
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={headerCellSx}>Invoice</TableCell>
                  <TableCell sx={headerCellSx}>Plan</TableCell>
                  <TableCell sx={headerCellSx}>Method</TableCell>
                  <TableCell align="right" sx={headerCellSx}>
                    <TableSortLabel
                      active={sortField === 'amount'}
                      direction={sortOrder}
                      onClick={() => handleSort('amount')}
                      sx={sortLabelSx}
                    >
                      Amount
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="center" sx={headerCellSx}>Status</TableCell>
                  <TableCell align="right" sx={{ ...headerCellSx, width: { xs: 100, sm: 120 } }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ border: 0 }}>
                      <Box sx={{ py: { xs: 4, sm: 6, md: 8 }, textAlign: 'center' }}>
                        <Box sx={{
                          width: { xs: 48, sm: 56, md: 64 },
                          height: { xs: 48, sm: 56, md: 64 },
                          borderRadius: '50%',
                          bgcolor: T.pageBg,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mb: 1.5,
                          boxShadow: '0 1px 3px rgba(2,33,36,0.05)',
                        }}>
                          <ReceiptIcon sx={{ fontSize: { xs: 24, sm: 28, md: 32 }, color: T.textLight }} />
                        </Box>
                        <Typography sx={{
                          fontSize: { xs: '0.85rem', sm: '0.95rem' },
                          fontWeight: 700, color: T.textDark, mb: 0.5,
                        }}>
                          No invoices found
                        </Typography>
                        <Typography sx={{
                          fontSize: { xs: '0.72rem', sm: '0.8rem' },
                          color: T.textLight, mb: 2,
                        }}>
                          {hasActiveFilters
                            ? 'Try adjusting your filters to see more results'
                            : 'Your invoices will appear here once you have subscription activity'}
                        </Typography>
                        {hasActiveFilters && (
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<ResetIcon />}
                            onClick={handleResetFilters}
                            sx={{
                              textTransform: 'none', fontWeight: 600, borderRadius: '10px',
                              borderColor: T.primary, color: T.primary,
                              fontSize: { xs: '0.75rem', sm: '0.82rem' },
                              '&:hover': { borderColor: T.primaryDark, bgcolor: T.primarySoft },
                            }}
                          >
                            Reset filters
                          </Button>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedRows.map((row) => {
                    const s = STATUS_CONFIG[row.status] || STATUS_CONFIG.pending;
                    return (
                      <TableRow
                        key={row.id}
                        hover
                        sx={{
                          transition: 'background-color .18s ease',
                          '&:hover': { bgcolor: `${T.primary}0A` },
                          '&:last-child td': { borderBottom: 0 },
                        }}
                      >
                        <TableCell sx={{
                          color: T.textDark,
                          fontSize: { xs: '0.72rem', sm: '0.8rem', md: '0.86rem' },
                          fontWeight: 500,
                          whiteSpace: 'nowrap',
                        }}>
                          {formatDate(row.date)}
                        </TableCell>
                        <TableCell sx={{
                          color: T.textMid,
                          fontSize: { xs: '0.72rem', sm: '0.8rem', md: '0.86rem' },
                          fontFamily: 'monospace',
                          letterSpacing: '-0.02em',
                        }}>
                          {row.invoiceNumber}
                        </TableCell>
                        <TableCell sx={{
                          color: T.textDark,
                          fontSize: { xs: '0.72rem', sm: '0.8rem', md: '0.86rem' },
                          fontWeight: 500,
                        }}>
                          {row.plan}
                        </TableCell>
                        <TableCell sx={{
                          color: T.textMid,
                          fontSize: { xs: '0.7rem', sm: '0.78rem', md: '0.82rem' },
                          fontFamily: 'monospace',
                        }}>
                          {row.method}
                        </TableCell>
                        <TableCell align="right" sx={{
                          color: T.textDark,
                          fontSize: { xs: '0.78rem', sm: '0.86rem', md: '0.92rem' },
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                        }}>
                          {formatMoney(row.amount)}
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            icon={s.icon}
                            label={s.label}
                            size="small"
                            sx={{
                              bgcolor: s.bg,
                              color: s.tx,
                              fontWeight: 700,
                              borderRadius: '999px',
                              fontSize: { xs: '0.6rem', sm: '0.66rem', md: '0.7rem' },
                              height: { xs: 20, sm: 22, md: 24 },
                              boxShadow: '0 1px 2px rgba(2,33,36,0.06)',
                              '& .MuiChip-icon': { color: s.tx, ml: '4px' },
                              '& .MuiChip-label': { pl: '4px' },
                            }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={0.25} justifyContent="flex-end">
                            <Tooltip title="View invoice">
                              <IconButton
                                size="small"
                                onClick={() => setInvoiceDialog(row)}
                                sx={{
                                  color: T.textMid,
                                  '&:hover': { color: T.primary, bgcolor: T.primarySoft },
                                }}
                              >
                                <ViewIcon sx={{ fontSize: { xs: 15, sm: 17, md: 18 } }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Download PDF">
                              <IconButton
                                size="small"
                                onClick={() => handleDownload(row)}
                                sx={{
                                  color: T.textMid,
                                  '&:hover': { color: T.primary, bgcolor: T.primarySoft },
                                }}
                              >
                                <DownloadIcon sx={{ fontSize: { xs: 15, sm: 17, md: 18 } }} />
                              </IconButton>
                            </Tooltip>
                            {row.status === 'failed' && (
                              <Tooltip title="Retry payment">
                                <IconButton
                                  size="small"
                                  onClick={() => handleRetry(row)}
                                  sx={{
                                    color: T.danger,
                                    '&:hover': { bgcolor: T.dangerBg },
                                  }}
                                >
                                  <RetryIcon sx={{ fontSize: { xs: 15, sm: 17, md: 18 } }} />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          <TablePagination
            component="div"
            count={filteredSortedRows.length}
            page={page}
            onPageChange={(_e, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[5, 10, 25, 50]}
            labelRowsPerPage={isMobile ? 'Rows:' : 'Rows per page:'}
            sx={{
              borderTop: `1px solid ${T.borderSoft}`,
              bgcolor: T.cardBg,
              color: T.textMid,
              '& .MuiTablePagination-toolbar': {
                minHeight: { xs: 44, sm: 52 },
                px: { xs: 1, sm: 2 },
                flexWrap: 'wrap',
              },
              '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                fontSize: { xs: '0.7rem', sm: '0.78rem' },
                color: T.textLight,
                m: 0,
              },
              '& .MuiTablePagination-select': {
                fontSize: { xs: '0.72rem', sm: '0.8rem' },
                color: T.textDark,
                fontWeight: 600,
              },
              '& .MuiTablePagination-actions': {
                '& .MuiIconButton-root': {
                  color: T.textMid,
                  p: { xs: 0.5, sm: 0.75 },
                  '&:hover:not(.Mui-disabled)': {
                    color: T.primary,
                    bgcolor: T.primarySoft,
                  },
                  '&.Mui-disabled': { color: T.border },
                },
              },
            }}
          />
        </Paper>
      </Box>

      {/* Invoice Preview Dialog */}
      <Dialog
        open={Boolean(invoiceDialog)}
        onClose={() => setInvoiceDialog(null)}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
        slotProps={{ paper: { sx: {
          borderRadius: isMobile ? 0 : { sm: '16px', md: '20px' },
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(2,33,36,0.20)',
        } } }}
      >
        {invoiceDialog && (
          <>
            <Box sx={{
              background: 'linear-gradient(160deg, #08302F 0%, #0E1E1D 70%, #121615 100%)',
              display: 'flex',
              alignItems: 'center',
              gap: { xs: 1.25, sm: 1.75 },
              px: { xs: 2, sm: 3 },
              py: { xs: 1.75, sm: 2.25 },
              position: 'relative', overflow: 'hidden',
            }}>
              <Box sx={{ position: 'absolute', top: -40, right: -40, width: 130, height: 130, borderRadius: '50%', bgcolor: 'rgba(127,158,126,0.06)', pointerEvents: 'none' }} />
              <Box sx={{
                width: { xs: 38, sm: 44 }, height: { xs: 38, sm: 44 },
                borderRadius: '12px', flexShrink: 0,
                bgcolor: 'rgba(127,158,126,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative',
              }}>
                <ReceiptIcon sx={{ color: T.primary, fontSize: { xs: 19, sm: 22 } }} />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0, position: 'relative' }}>
                <Typography sx={{
                  fontWeight: 700, color: 'rgba(255,255,255,0.97)',
                  fontSize: { xs: '1rem', sm: '1.15rem' },
                }}>
                  Invoice preview
                </Typography>
                <Typography variant="body2" sx={{
                  color: 'rgba(255,255,255,0.5)', mt: 0.25, fontWeight: 500,
                  fontSize: { xs: '0.68rem', sm: '0.78rem' },
                  fontFamily: 'monospace',
                }}>
                  {invoiceDialog.invoiceNumber}
                </Typography>
              </Box>
              <IconButton onClick={() => setInvoiceDialog(null)} size="small" aria-label="Close" sx={{
                color: 'rgba(255,255,255,0.7)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '10px', width: 36, height: 36, flexShrink: 0,
                '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.1)' },
              }}>
                <CloseIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Box>

            <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Box sx={{
                p: { xs: 2, sm: 3, md: 4 },
                bgcolor: '#fff',
                border: `1px solid ${T.border}`,
                borderRadius: '12px',
                boxShadow: '0 4px 14px rgba(2,33,36,0.08)',
              }}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  justifyContent="space-between"
                  spacing={2}
                  mb={3}
                >
                  <Box>
                    <Typography sx={{
                      fontSize: { xs: '1rem', sm: '1.15rem' },
                      fontWeight: 700, color: T.textDark,
                    }}>
                      Ievalx Recruitment Platform
                    </Typography>
                    <Typography variant="body2" sx={{
                      color: T.textLight,
                      fontSize: { xs: '0.7rem', sm: '0.8rem' },
                      lineHeight: 1.55,
                      mt: 0.5,
                    }}>
                      billing@ievalx.com<br />
                      123 Business Ave, Bengaluru<br />
                      GSTIN: 29ABCDE1234F1Z5
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                    <Typography sx={{
                      fontSize: { xs: '1rem', sm: '1.15rem' },
                      fontWeight: 700, color: T.primary,
                      letterSpacing: '0.05em',
                    }}>
                      INVOICE
                    </Typography>
                    <Typography variant="body2" sx={{
                      color: T.textLight,
                      fontSize: { xs: '0.7rem', sm: '0.8rem' },
                      lineHeight: 1.55,
                      mt: 0.5,
                      fontFamily: 'monospace',
                    }}>
                      {invoiceDialog.invoiceNumber}<br />
                      Date: {formatDate(invoiceDialog.date)}
                    </Typography>
                  </Box>
                </Stack>

                <Divider sx={{ my: { xs: 2, sm: 3 }, borderColor: T.border }} />

                <Box sx={{ mb: 3 }}>
                  <Typography sx={{
                    fontWeight: 700, color: T.textDark, mb: 1,
                    fontSize: { xs: '0.78rem', sm: '0.88rem' },
                  }}>
                    Bill to
                  </Typography>
                  <Typography variant="body2" sx={{
                    color: T.textMid,
                    fontSize: { xs: '0.7rem', sm: '0.82rem' },
                    lineHeight: 1.55,
                  }}>
                    Ganta Abhisri<br />
                    Ievalx Company<br />
                    abhisri@company.com
                  </Typography>
                </Box>

                <Table sx={{ mb: 3 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{
                        fontWeight: 700, color: T.textDark,
                        borderBottom: `2px solid ${T.border}`,
                        fontSize: { xs: '0.72rem', sm: '0.82rem' },
                        p: { xs: 1, sm: 1.5 },
                      }}>
                        Description
                      </TableCell>
                      <TableCell align="right" sx={{
                        fontWeight: 700, color: T.textDark,
                        borderBottom: `2px solid ${T.border}`,
                        fontSize: { xs: '0.72rem', sm: '0.82rem' },
                        p: { xs: 1, sm: 1.5 },
                      }}>
                        Amount
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell sx={{ p: { xs: 1, sm: 1.5 } }}>
                        <Typography sx={{
                          fontWeight: 600, color: T.textDark,
                          fontSize: { xs: '0.74rem', sm: '0.86rem' },
                        }}>
                          {invoiceDialog.plan} plan subscription
                        </Typography>
                        <Typography variant="caption" sx={{
                          color: T.textLight,
                          fontSize: { xs: '0.6rem', sm: '0.7rem' },
                        }}>
                          Monthly billing · Auto-renewal enabled
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{
                        fontWeight: 700, color: T.textDark,
                        fontSize: { xs: '0.75rem', sm: '0.88rem' },
                        p: { xs: 1, sm: 1.5 },
                      }}>
                        {formatMoney(invoiceDialog.amount)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>

                <Box sx={{ maxWidth: { xs: '100%', sm: 320 }, ml: 'auto' }}>
                  <Stack direction="row" justifyContent="space-between" mb={0.75}>
                    <Typography variant="body2" sx={{ color: T.textLight, fontSize: { xs: '0.7rem', sm: '0.8rem' } }}>Subtotal</Typography>
                    <Typography sx={{ fontWeight: 700, color: T.textDark, fontSize: { xs: '0.74rem', sm: '0.84rem' } }}>{formatMoney(invoiceDialog.amount)}</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between" mb={0.75}>
                    <Typography variant="body2" sx={{ color: T.textLight, fontSize: { xs: '0.7rem', sm: '0.8rem' } }}>Tax (18% GST)</Typography>
                    <Typography sx={{ fontWeight: 700, color: T.textDark, fontSize: { xs: '0.74rem', sm: '0.84rem' } }}>{formatMoney(Math.round(invoiceDialog.amount * 0.18))}</Typography>
                  </Stack>
                  <Divider sx={{ my: 1, borderColor: T.border }} />
                  <Stack direction="row" justifyContent="space-between">
                    <Typography sx={{ fontWeight: 700, color: T.textDark, fontSize: { xs: '0.84rem', sm: '0.95rem' } }}>Total</Typography>
                    <Typography sx={{
                      fontWeight: 700, color: T.primary,
                      fontSize: { xs: '1.05rem', sm: '1.25rem' },
                    }}>
                      {formatMoney(Math.round(invoiceDialog.amount * 1.18))}
                    </Typography>
                  </Stack>
                </Box>

                {invoiceDialog.status === 'paid' && (
                  <Box sx={{
                    mt: 3,
                    p: { xs: 1.25, sm: 1.75 },
                    bgcolor: T.successBg,
                    borderRadius: '10px',
                    boxShadow: '0 1px 3px rgba(2,33,36,0.04)',
                  }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <CheckCircle sx={{ color: T.success, fontSize: { xs: 16, sm: 20 } }} />
                      <Typography sx={{
                        fontWeight: 700, color: T.success,
                        fontSize: { xs: '0.72rem', sm: '0.82rem' },
                      }}>
                        Payment received via {invoiceDialog.method}
                      </Typography>
                    </Stack>
                  </Box>
                )}

                {invoiceDialog.status === 'failed' && (
                  <Box sx={{
                    mt: 3,
                    p: { xs: 1.25, sm: 1.75 },
                    bgcolor: T.dangerBg,
                    borderRadius: '10px',
                    boxShadow: '0 1px 3px rgba(180,70,47,0.10)',
                  }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Cancel sx={{ color: T.danger, fontSize: { xs: 16, sm: 20 } }} />
                      <Typography sx={{
                        fontWeight: 700, color: T.danger,
                        fontSize: { xs: '0.72rem', sm: '0.82rem' },
                      }}>
                        Payment failed on {invoiceDialog.method}
                      </Typography>
                    </Stack>
                  </Box>
                )}
              </Box>
            </DialogContent>

            <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: { xs: 1.5, sm: 2 }, gap: 1, flexWrap: 'wrap' }}>
              <Button
                onClick={() => setInvoiceDialog(null)}
                sx={{
                  textTransform: 'none', fontWeight: 600, color: T.textMid,
                  fontSize: { xs: '0.78rem', sm: '0.86rem' },
                }}
              >
                Close
              </Button>
              <Button
                variant="outlined"
                startIcon={<PrintIcon />}
                onClick={() => window.print()}
                sx={{
                  borderColor: T.primary, color: T.primary,
                  textTransform: 'none', fontWeight: 700, borderRadius: '10px',
                  fontSize: { xs: '0.78rem', sm: '0.86rem' },
                  '&:hover': { borderColor: T.primaryDark, bgcolor: T.primarySoft },
                }}
              >
                Print
              </Button>
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={() => { handleDownload(invoiceDialog); setInvoiceDialog(null); }}
                sx={{
                  bgcolor: T.primary,
                  textTransform: 'none', fontWeight: 700, borderRadius: '10px',
                  fontSize: { xs: '0.78rem', sm: '0.86rem' },
                  boxShadow: `0 2px 6px ${T.primary}30, 0 4px 14px ${T.primary}40`,
                  '&:hover': {
                    bgcolor: T.primaryDark,
                    boxShadow: `0 4px 10px ${T.primary}40, 0 8px 22px ${T.primary}55`,
                  },
                }}
              >
                Download PDF
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default BillingHistory;