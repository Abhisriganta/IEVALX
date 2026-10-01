// BUILD: 2026-08-28-iaem-casequeue-v3 — pine theme, fixed-layout table
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, TextField, InputAdornment, Skeleton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination,
  ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Search } from '@mui/icons-material';
import { caseService } from '@/services/api/iaem';
import { SignalBadge, SeverityBadge, CaseStateBadge, SLACountdown } from '@/components/common/iaem';
import { CASE_STATES } from '@/constants/iaem';

const P = '#04282B';
const SAGE = '#8FB08E';
const INK = '#1F1F1F';
const MUTED = '#6F7470';
const HINT = '#A0A8A0';
const LINE = '#E7EAE3';
const SUBTLE = '#F0F3EE';

const thSx = {
  fontWeight: 600, fontSize: '0.68rem', color: MUTED, textTransform: 'uppercase',
  letterSpacing: '0.05em', py: 1.2, whiteSpace: 'nowrap',
};

const CaseQueue = () => {
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stateFilter, setStateFilter] = useState('OPEN');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  useEffect(() => { caseService.getCaseQueue().then(r => setCases(r.data.cases || [])).catch(console.error).finally(() => setLoading(false)); }, []);

  const filtered = cases.filter(c => {
    if (stateFilter !== 'ALL' && c.state !== stateFilter) return false;
    if (search && !c.interviewer_name.toLowerCase().includes(search.toLowerCase()) && !c.job_title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Reset to first page when filters change
  useEffect(() => { setPage(0); }, [stateFilter, search]);

  const stateCounts = React.useMemo(() => {
    const base = { ALL: cases.length };
    Object.keys(CASE_STATES).forEach(k => { base[k] = 0; });
    cases.forEach(c => { if (base[c.state] !== undefined) base[c.state] += 1; });
    return base;
  }, [cases]);

  const filterOptions = [
    ['ALL', 'All'],
    ...Object.entries(CASE_STATES).map(([k, v]) => [k, v.label]),
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: 'auto' }}>
      <Typography sx={{ fontFamily: "'DM Serif Display', serif", fontWeight: 700, fontSize: '1.4rem', color: INK, mb: 0.3 }}>
        Case Queue
      </Typography>
      <Typography sx={{ fontSize: '0.82rem', color: MUTED, mb: 2.5 }}>
        Review audit cases — each requires written rationale before resolution.
      </Typography>

      {/* Filters */}
      <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 2.5, border: `1px solid ${LINE}` }}>
        <TextField size="small" placeholder="Search interviewer or job" value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ width: { xs: '100%', sm: 300 }, mb: 1.5, '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: '0.82rem' } }}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 16, color: HINT }} /></InputAdornment> }}
        />
        <ToggleButtonGroup value={stateFilter} exclusive onChange={(_, v) => { if (v !== null) setStateFilter(v); }}
          sx={{
            display: 'flex', flexWrap: 'wrap', gap: 0.75,
            '& .MuiToggleButtonGroup-grouped': { border: `1px solid ${LINE}`, borderRadius: '999px !important', m: 0 },
          }}>
          {filterOptions.map(([k, label]) => {
            const active = stateFilter === k;
            return (
              <ToggleButton key={k} value={k} disableRipple
                sx={{
                  textTransform: 'none', px: 1.5, py: 0.5, gap: 0.75,
                  fontWeight: 600, fontSize: '0.78rem', color: MUTED,
                  '&:hover': { bgcolor: alpha(P, 0.06) },
                  '&.Mui-selected': { color: '#fff', bgcolor: P, borderColor: P,
                    boxShadow: `0 3px 10px ${alpha(P, 0.3)}`,
                    '&:hover': { bgcolor: '#0a3d40' },
                  },
                }}>
                {label}
                <Box component="span" sx={{
                  minWidth: 18, height: 16, px: 0.5, display: 'inline-flex', alignItems: 'center',
                  justifyContent: 'center', borderRadius: 10, fontSize: '0.62rem', fontWeight: 700,
                  bgcolor: active ? 'rgba(255,255,255,0.22)' : SUBTLE, color: active ? '#fff' : MUTED,
                }}>
                  {stateCounts[k] ?? 0}
                </Box>
              </ToggleButton>
            );
          })}
        </ToggleButtonGroup>
      </Paper>

      {/* Table */}
      <Paper elevation={0} sx={{ borderRadius: 2.5, border: `1px solid ${LINE}`, overflow: 'hidden' }}>
        {loading ? <Box sx={{ p: 3 }}><Skeleton height={120} sx={{ borderRadius: 2 }} /></Box> : (
          <>
          <TableContainer>
            <Table sx={{ tableLayout: 'fixed', '& .MuiTableCell-root': { borderBottom: `1px solid ${LINE} !important` } }}>
              <TableHead>
                 <TableRow sx={{
                  '& .MuiTableCell-head': {
                    backgroundColor: `${SUBTLE} !important`,
                    color: `${MUTED} !important`,
                    borderBottom: `1px solid ${LINE} !important`,
                  },
                }}>
                  <TableCell sx={{ ...thSx, width: '9%' }}>Case</TableCell>
                  <TableCell sx={{ ...thSx, width: '13%' }}>Interviewer</TableCell>
                  <TableCell sx={{ ...thSx, width: '28%' }}>Signals</TableCell>
                  <TableCell sx={{ ...thSx, width: '10%' }}>Severity</TableCell>
                  <TableCell sx={{ ...thSx, width: '10%' }}>State</TableCell>
                  <TableCell sx={{ ...thSx, width: '12%' }}>SLA</TableCell>
                  <TableCell sx={{ ...thSx, width: '18%' }}>Job / Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map(c => (
                  <TableRow key={c.case_id} hover
                    sx={{
                      cursor: 'pointer',
                      '&:hover': { bgcolor: SUBTLE },
                      '& td': { py: 1.5, verticalAlign: 'middle', borderBottom: `1px solid ${LINE}` },
                      '&:last-child td': { borderBottom: 0 },
                    }}
                    onClick={() => navigate(`/employer/cases/${c.case_id}`)}>
                    <TableCell><Typography sx={{ fontWeight: 700, fontSize: '0.8rem', color: P }}>{c.case_id}</Typography></TableCell>
                    <TableCell><Typography sx={{ fontSize: '0.8rem', color: INK, fontWeight: 500 }}>{c.interviewer_name}</Typography></TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {(c.signals && c.signals.length > 0)
                          ? c.signals.map((s, i) => <SignalBadge key={i} code={s.signal_code} />)
                          : <SignalBadge code={c.signal_code} />}
                      </Box>
                    </TableCell>
                    <TableCell><SeverityBadge severity={c.severity} /></TableCell>
                    <TableCell><CaseStateBadge state={c.state} /></TableCell>
                    <TableCell><SLACountdown deadline={c.sla_deadline} /></TableCell>
                    <TableCell>
                      <Box>
                        <Typography sx={{ fontSize: '0.78rem', color: INK, fontWeight: 500, lineHeight: 1.3 }}>{c.job_title}</Typography>
                        <Typography sx={{ fontSize: '0.7rem', color: HINT, mt: 0.2 }}>{c.interview_date}</Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={7} sx={{ textAlign: 'center', py: 4, color: HINT, fontSize: '0.85rem' }}>No cases match your filters.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={filtered.length}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[5, 10]}
            sx={{
              borderTop: `1px solid ${LINE}`,
              '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
                fontSize: '0.82rem', color: MUTED,
              },
              '.MuiTablePagination-select': { fontWeight: 600 },
              '.MuiTablePagination-actions button': { color: P },
            }}
          />
          </>
        )}
      </Paper>
    </Box>
  );
};

export default CaseQueue;