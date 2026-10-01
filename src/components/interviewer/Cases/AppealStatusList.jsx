// BUILD: 2026-08-27-iaem-appeals-list-v2 — appeal-centric columns
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination, Chip, Button } from '@mui/material';
import { Visibility } from '@mui/icons-material';
import { interviewerCaseService } from '@/services/api/iaem';
import { SignalBadge } from '@/components/common/iaem';
import { RESOLUTION_TYPES, APPEAL_OUTCOMES } from '@/constants/iaem';

const STATUS_STYLE = {
  PENDING:    { label: 'Pending',    bg: '#FFF8E1', color: '#E65100' },
  UPHELD:     { label: 'Upheld',     bg: '#FFEBEE', color: '#C62828' },
  MODIFIED:   { label: 'Modified',   bg: '#FFF3E0', color: '#EF6C00' },
  OVERTURNED: { label: 'Overturned', bg: '#E8F5E9', color: '#2E7D32' },
};

const AppealStatusList = () => {
  const navigate = useNavigate();
  const [appeals, setAppeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  useEffect(() => {
    interviewerCaseService.getMyCases()
      .then(r => setAppeals((r.data.cases || []).filter(c => c.appeal_filed)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" sx={{ fontWeight: 700, color: '#2C2C2A', mb: 0.5 }}>Appeal Status</Typography>
      <Typography variant="body2" sx={{ color: '#888', mb: 3 }}>Appeals you have filed and their current review status.</Typography>
      <Paper elevation={0} sx={{ borderRadius: 2.5, border: '1px solid #E8E8E8', overflow: 'hidden' }}>
        {loading ? <Box sx={{ p: 3 }}><Skeleton height={120} /></Box> : appeals.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}><Typography variant="body2" sx={{ color: '#888' }}>You have not filed any appeals.</Typography></Box>
        ) : (
          <>
          <TableContainer><Table size="small">
            <TableHead><TableRow sx={{ bgcolor: '#FAFAFA' }}>
              <TableCell sx={{ fontWeight: 600, color: '#666', fontSize: '0.78rem' }}>Appeal</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#666', fontSize: '0.78rem' }}>Case / Signal</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#666', fontSize: '0.78rem' }}>Original Resolution</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#666', fontSize: '0.78rem' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#666', fontSize: '0.78rem' }}>Filed On</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, color: '#666', fontSize: '0.78rem' }}>Action</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {appeals.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map(c => {
                const st = STATUS_STYLE[c.appeal_status] || STATUS_STYLE.PENDING;
                return (
                  <TableRow key={c.case_id} hover>
                    <TableCell><Typography variant="body2" sx={{ fontWeight: 700, color: '#04282B' }}>{c.appeal_id || '—'}</Typography></TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{c.case_id}</Typography>
                      <Box sx={{ mt: 0.5 }}><SignalBadge code={c.signal_code} /></Box>
                    </TableCell>
                    <TableCell>
                      <Chip label={RESOLUTION_TYPES[c.resolution]?.label || c.resolution} size="small" sx={{ fontWeight: 600, fontSize: '0.72rem' }} />
                    </TableCell>
                    <TableCell>
                      <Chip label={st.label} size="small" sx={{ bgcolor: st.bg, color: st.color, fontWeight: 700, fontSize: '0.72rem' }} />
                    </TableCell>
                    <TableCell><Typography variant="caption" sx={{ color: '#888' }}>{c.appeal_filed_on || '—'}</Typography></TableCell>
                    <TableCell align="right">
                      <Button size="small" startIcon={<Visibility />}
                        disabled={!c.appeal_id}
                        onClick={() => navigate(`/interviewer/appeals/${c.appeal_id}`)}
                        sx={{ textTransform: 'none', fontWeight: 600, color: '#04282B', fontSize: '0.78rem' }}>View</Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table></TableContainer>
          <TablePagination
            component="div"
            count={appeals.length}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[5, 10]}
            sx={{
              borderTop: '1px solid #E8E8E8',
              '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
                fontSize: '0.82rem', color: '#888',
              },
              '.MuiTablePagination-select': { fontWeight: 600 },
              '.MuiTablePagination-actions button': { color: '#04282B' },
            }}
          />
          </>
        )}
      </Paper>
    </Box>
  );
};

export default AppealStatusList;