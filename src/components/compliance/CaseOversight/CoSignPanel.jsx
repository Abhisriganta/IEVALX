// BUILD: 2026-08-24-iaem-final-v1 — Guide §3B co-sign
import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Button, Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip } from '@mui/material';
import { complianceService } from '@/services/api/iaem';

const CoSignPanel = () => {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { complianceService.getCoSignQueue().then(r => setQueue(r.data.pending || [])).catch(console.error).finally(() => setLoading(false)); }, []);
  const handle = async (id, approve) => {
    try { approve ? await complianceService.approveCoSign(id) : await complianceService.rejectCoSign(id, 'Rejected'); alert('Done.');
      complianceService.getCoSignQueue().then(r => setQueue(r.data.pending || [])); } catch (err) { console.error(err); }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>Co-Sign Requests</Typography>
      <Typography variant="body2" sx={{ color: '#888', mb: 3 }}>Requests that need Compliance sign-off before HR can proceed.</Typography>
      <Paper elevation={0} sx={{ borderRadius: 2.5, border: '1px solid #E8E8E8', overflow: 'hidden' }}>
        {loading ? <Box sx={{ p: 3 }}><Skeleton height={80} /></Box> : queue.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}><Typography variant="body2" sx={{ color: '#888' }}>No pending co-sign requests.</Typography></Box>
        ) : (
          <TableContainer><Table size="small"><TableHead><TableRow sx={{ bgcolor: '#FAFAFA' }}>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.78rem' }}>Type</TableCell><TableCell sx={{ fontWeight: 600, fontSize: '0.78rem' }}>Case</TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.78rem' }}>Requested By</TableCell><TableCell sx={{ fontWeight: 600, fontSize: '0.78rem' }}>Rationale</TableCell>
            <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.78rem' }}>Action</TableCell>
          </TableRow></TableHead><TableBody>
            {queue.map(q => (
              <TableRow key={q.request_id} hover>
                <TableCell><Chip label={q.type.replace('_', ' ')} size="small" sx={{ bgcolor: '#FFCDD2', color: '#B71C1C', fontWeight: 700, fontSize: '0.7rem' }} /></TableCell>
                <TableCell>{q.case_id}</TableCell><TableCell>{q.requested_by}</TableCell>
                <TableCell><Typography variant="caption" sx={{ color: '#555' }}>{q.rationale?.substring(0, 100)}...</Typography></TableCell>
                <TableCell align="right"><Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                  <Button size="small" variant="contained" onClick={() => handle(q.request_id, true)} sx={{ textTransform: 'none', fontWeight: 600, bgcolor: '#04282B' }}>Approve</Button>
                  <Button size="small" variant="outlined" color="error" onClick={() => handle(q.request_id, false)} sx={{ textTransform: 'none', fontWeight: 600 }}>Reject</Button>
                </Box></TableCell>
              </TableRow>
            ))}
          </TableBody></Table></TableContainer>
        )}
      </Paper>
    </Box>
  );
};
export default CoSignPanel;
