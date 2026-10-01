// BUILD: 2026-08-24-iaem-final-v1
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination, Button, Chip } from '@mui/material';
import { appealService } from '@/services/api/iaem';
import { SignalBadge } from '@/components/common/iaem';
import { RESOLUTION_TYPES, APPEAL_DESIRED_OUTCOMES } from '@/constants/iaem';

const AppealsQueue = () => {
  const navigate = useNavigate();
  const [appeals, setAppeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
 useEffect(() => { appealService.getAppealsQueue().then(r => {
    const list = r.data.appeals || [];
    list.sort((a, b) => {
      if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
      if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;
      return (b.filed_on || '').localeCompare(a.filed_on || '');
    });
    setAppeals(list);
  }).catch(console.error).finally(() => setLoading(false)); }, []);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" sx={{ fontWeight: 700, color: '#2C2C2A', mb: 0.5 }}>Appeals Queue</Typography>
       <Typography variant="body2" sx={{ color: '#55584F', mb: 3 }}>Appeals assigned to you. You were not the original reviewer on any of these cases.</Typography>
      <Paper elevation={0} sx={{ borderRadius: 2.5, border: '1px solid #E7EAE3', overflow: 'hidden' }}>
        {loading ? <Box sx={{ p: 3 }}><Skeleton height={100} /></Box> : appeals.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}><Typography variant="body2" sx={{ color: '#7A7E76' }}>No pending appeals.</Typography></Box>
        ) : (
          <><TableContainer><Table size="small" sx={{ '& .MuiTableCell-root': { borderBottom: '1px solid #E7EAE3 !important' } }}><TableHead><TableRow sx={{
            '& .MuiTableCell-head': {
              backgroundColor: '#F0F3EE !important',
              color: '#55584F !important',
              borderBottom: '1px solid #E7EAE3 !important',
              fontWeight: 600,
              fontSize: '0.78rem',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            },
          }}>
            <TableCell>Appeal</TableCell><TableCell>Interviewer</TableCell>
            <TableCell>Signal</TableCell><TableCell>Original Resolution</TableCell>
            <TableCell>Desired Outcome</TableCell><TableCell>Status</TableCell><TableCell align="right">Action</TableCell>
          </TableRow></TableHead><TableBody>
            {appeals.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map(a => (
              <TableRow key={a.appeal_id} hover>
                
                <TableCell><Typography variant="body2" sx={{ fontWeight: 700 }}>{a.appeal_id}</Typography><Typography variant="caption" sx={{ color: '#7A7E76' }}>Filed {a.filed_on}</Typography></TableCell>
                <TableCell>{a.interviewer_name}</TableCell>
                <TableCell><SignalBadge code={a.signal_code} /></TableCell>
                <TableCell><Chip label={RESOLUTION_TYPES[a.original_resolution]?.label} size="small" sx={{ fontWeight: 600, fontSize: '0.72rem' }} /></TableCell>
                <TableCell>{APPEAL_DESIRED_OUTCOMES.find(o => o.value === a.desired_outcome)?.label}</TableCell>
                <TableCell><Chip label={a.status === 'PENDING' ? 'Pending' : a.status === 'UPHELD' ? 'Upheld' : a.status === 'MODIFIED' ? 'Modified' : a.status === 'OVERTURNED' ? 'Overturned' : a.status} size="small" sx={{
                  fontWeight: 700, fontSize: '0.72rem', borderRadius: '8px',
                  bgcolor: a.status === 'PENDING' ? '#FFF3E0' : a.status === 'UPHELD' ? '#FAEAE8' : a.status === 'OVERTURNED' ? '#EAF2E9' : a.status === 'MODIFIED' ? '#EDF3EC' : '#F0F2ED',
                  color: a.status === 'PENDING' ? '#E65100' : a.status === 'UPHELD' ? '#8B2E2E' : a.status === 'OVERTURNED' ? '#3E6E3E' : a.status === 'MODIFIED' ? '#5E815D' : '#55584F',
                }} /></TableCell>
                <TableCell align="right"><Button size="small" variant="contained" onClick={() => navigate(`/employer/appeals/${a.appeal_id}`)}
                  sx={{ textTransform: 'none', fontWeight: 600, bgcolor: '#04282B', '&:hover': { bgcolor: '#0a3d40' } }}>view</Button></TableCell>
              </TableRow> 
            ))}
                    </TableBody></Table></TableContainer>
          <TablePagination
            component="div"
            count={appeals.length}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[5, 10]}
            sx={{
              borderTop: '1px solid #E7EAE3',
              '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
                fontSize: '0.82rem', color: '#55584F',
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
export default AppealsQueue;
