import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Button, Skeleton, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions,
} from '@mui/material';
import { caseService } from '@/services/api/iaem';
import { CheckCircle, ErrorOutlined as ErrorOutline, WarningAmber } from '@mui/icons-material';

const P = '#04282B';

const ApprovalQueue = () => {
  const navigate = useNavigate();
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectDialog, setRejectDialog] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [notifDialog, setNotifDialog] = useState({ open: false, message: '', type: 'success' });

  const fetchQueue = () => {
    setLoading(true);
    caseService.getCoSignQueue()
      .then(r => setQueue(r.data.cosign_requests || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchQueue(); }, []);

  const handleApprove = async (id) => {
    if (!confirm('Approve this Formal Action? The case will be resolved and the interviewer notified.')) return;
    try {
      await caseService.approveCoSign(id);
      setNotifDialog({ open: true, message: 'Co-sign approved. Case resolved.', type: 'success' });
      fetchQueue();
    } catch (err) {
      setNotifDialog({ open: true, message: err?.response?.data?.detail || 'Approve failed.', type: 'error' });
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    try {
      await caseService.rejectCoSign(rejectDialog, rejectReason);
      setNotifDialog({ open: true, message: 'Co-sign rejected. Case reopened.', type: 'success' });
      setRejectDialog(null);
      setRejectReason('');
      fetchQueue();
    } catch (err) {
      setNotifDialog({ open: true, message: err?.response?.data?.detail || 'Reject failed.', type: 'error' });
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1100, mx: 'auto' }}>
      <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#1F1F1F', mb: 0.5 }}>Approval Queue</Typography>
      <Typography sx={{ fontSize: '0.82rem', color: '#6F7470', mb: 3 }}>
        Formal Action resolutions that need your co-sign before they take effect.
      </Typography>

      <Paper elevation={0} sx={{ borderRadius: 2.5, border: '1px solid #E7EAE3', overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ p: 3 }}><Skeleton height={80} /><Skeleton height={80} /></Box>
        ) : queue.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography sx={{ color: '#A0A8A0', fontSize: '0.88rem' }}>No pending co-sign requests.</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#F0F3EE' }}>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#6F7470' }}>Case</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#6F7470' }}>Interviewer</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#6F7470' }}>Signal</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#6F7470' }}>Requested By</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#6F7470' }}>Rationale</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#6F7470' }}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {queue.map(q => (
                  <TableRow key={q.request_pk} hover sx={{ cursor: 'pointer' }}>
                    <TableCell onClick={() => navigate(`/employer/cases/${q.case_pk}`)} sx={{ fontWeight: 600, fontSize: '0.82rem', color: P }}>{q.case_id}</TableCell>
                    <TableCell sx={{ fontSize: '0.82rem' }}>{q.interviewer_name}</TableCell>
                    <TableCell><Chip label={q.signal_code} size="small" sx={{ fontWeight: 700, fontSize: '0.65rem' }} /></TableCell>
                    <TableCell sx={{ fontSize: '0.82rem' }}>{q.requested_by}</TableCell>
                    <TableCell><Typography sx={{ fontSize: '0.75rem', color: '#6F7470', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.rationale}</Typography></TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                        <Button size="small" variant="contained" onClick={() => handleApprove(q.request_pk)}
                          sx={{ textTransform: 'none', fontWeight: 600, bgcolor: P, borderRadius: 2, '&:hover': { bgcolor: '#0a3d40' } }}>
                          Approve
                        </Button>
                        <Button size="small" variant="outlined" color="error" onClick={() => setRejectDialog(q.request_pk)}
                          sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}>
                          Reject
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog open={!!rejectDialog} onClose={() => setRejectDialog(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '0.92rem' }}>Reject Formal Action</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: '0.8rem', color: '#6F7470', mb: 2 }}>The case will reopen so the original reviewer can choose a different resolution.</Typography>
          <TextField fullWidth multiline rows={2} size="small" label="Reason for rejection"
            value={rejectReason} onChange={e => setRejectReason(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRejectDialog(null)} sx={{ textTransform: 'none', color: '#6F7470' }}>Cancel</Button>
          <Button variant="contained" disabled={!rejectReason.trim()} onClick={handleReject}
            sx={{ textTransform: 'none', fontWeight: 600, bgcolor: '#C62828', borderRadius: 2, '&:hover': { bgcolor: '#B71C1C' } }}>Reject</Button>
        </DialogActions>
      </Dialog>

      {/* Notification Dialog */}
      <Dialog open={notifDialog.open} onClose={() => setNotifDialog({ ...notifDialog, open: false })} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
        <Box sx={{ bgcolor: notifDialog.type === 'success' ? '#EDF7ED' : notifDialog.type === 'error' ? '#FDEDED' : '#FFF4E5', px: 3, py: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {notifDialog.type === 'success' ? <CheckCircle sx={{ color: '#2E7D32', fontSize: 28 }} /> : notifDialog.type === 'error' ? <ErrorOutline sx={{ color: '#C62828', fontSize: 28 }} /> : <WarningAmber sx={{ color: '#E65100', fontSize: 28 }} />}
          <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: notifDialog.type === 'success' ? '#2E7D32' : notifDialog.type === 'error' ? '#C62828' : '#E65100' }}>
            {notifDialog.type === 'success' ? 'Success' : notifDialog.type === 'error' ? 'Error' : 'Warning'}
          </Typography>
        </Box>
        <DialogContent sx={{ px: 3, py: 2.5 }}>
          <Typography sx={{ fontSize: '0.92rem', color: '#1F1F1F', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{notifDialog.message}</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setNotifDialog({ ...notifDialog, open: false })} variant="contained" disableElevation
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, px: 4, bgcolor: notifDialog.type === 'success' ? '#2E7D32' : notifDialog.type === 'error' ? '#C62828' : '#E65100', '&:hover': { filter: 'brightness(0.9)', bgcolor: notifDialog.type === 'success' ? '#2E7D32' : notifDialog.type === 'error' ? '#C62828' : '#E65100' } }}>
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ApprovalQueue;