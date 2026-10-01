// BUILD: 2026-08-24-iaem-phase2-v1
// Guide Steps 2-3 — Two-HR approval queue with four-eyes rule
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Button, Chip, Skeleton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  Alert, IconButton,
} from '@mui/material';
import { CheckCircle, Cancel, Close, VerifiedUser } from '@mui/icons-material';
import { hrInterviewerService } from '@/services/api/iaem';
import { LIFECYCLE_STATES, REJECTION_REASONS } from '@/constants/iaem';

const StateChip = ({ state }) => {
  const s = LIFECYCLE_STATES[state] || LIFECYCLE_STATES.PENDING_APPROVAL;
  return <Chip label={s.label} size="small" sx={{ bgcolor: s.bg, color: s.color, fontWeight: 700, fontSize: '0.72rem' }} />;
};

const ApprovalQueue = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedReg, setSelectedReg] = useState(null);
  const [rejectDialog, setRejectDialog] = useState(false);
  const [rejReason, setRejReason] = useState('');
  const [rejNotes, setRejNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [infoDialog, setInfoDialog] = useState({ open: false, title: '', message: '', variant: 'success' });

  const load = () => {
    setLoading(true);
    hrInterviewerService.getApprovalQueue()
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleApprove = async (reg) => {
    setActionLoading(true);
    try {
      const res = await hrInterviewerService.approveRegistration(reg.interviewer_id);
      setInfoDialog({
        open: true,
        title: 'Approval recorded',
        message: res.data.message,
        variant: 'success',
      });
      load();
    } catch (err) { console.error(err); }
    finally { setActionLoading(false); }
  };

  const handleReject = async () => {
    if (!rejReason) return;
    setActionLoading(true);
    try {
      const res = await hrInterviewerService.rejectRegistration(selectedReg.interviewer_id, rejReason, rejNotes);
      setInfoDialog({
        open: true,
        title: 'Registration rejected',
        message: res.data.message,
        variant: 'info',
      });
      setRejectDialog(false);
      setSelectedReg(null);
      setRejReason('');
      setRejNotes('');
      load();
    } catch (err) { console.error(err); }
    finally { setActionLoading(false); }
  };

  const regs = data?.registrations || [];

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" sx={{ fontWeight: 700, color: '#2C2C2A', mb: 0.5 }}>Approval Queue</Typography>
      <Typography variant="body2" sx={{ color: '#888', mb: 3 }}>
        Interviewer registrations requiring your review. Two different HR reviewers must independently approve each registration (four-eyes rule).
      </Typography>

      <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
        Registrations you have already approved will not appear here. A different HR must provide the second approval.
      </Alert>

      <Paper elevation={0} sx={{ borderRadius: 2.5, border: '1px solid #E8E8E8', overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ p: 3 }}>{[1,2].map(i => <Skeleton key={i} height={56} sx={{ mb: 1 }} />)}</Box>
        ) : regs.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: '#888' }}>No pending registrations in the queue.</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#FAFAFA' }}>
                  <TableCell sx={{ fontWeight: 600, color: '#666', fontSize: '0.78rem' }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#666', fontSize: '0.78rem' }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#666', fontSize: '0.78rem' }}>Department</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#666', fontSize: '0.78rem' }}>State</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#666', fontSize: '0.78rem' }}>First Approver</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, color: '#666', fontSize: '0.78rem' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {regs.map((reg) => (
                  <TableRow key={reg.interviewer_id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#2C2C2A' }}>{reg.name}</Typography>
                      <Typography variant="caption" sx={{ color: '#888' }}>{reg.designation} • {reg.seniority}</Typography>
                    </TableCell>
                    <TableCell><Typography variant="body2" sx={{ color: '#555', fontSize: '0.85rem' }}>{reg.email}</Typography></TableCell>
                    <TableCell><Typography variant="body2" sx={{ color: '#555' }}>{reg.department}</Typography></TableCell>
                    <TableCell><StateChip state={reg.state} /></TableCell>
                    <TableCell>
                      {reg.first_approver ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <VerifiedUser sx={{ fontSize: 14, color: '#4CAF50' }} />
                          <Typography variant="caption" sx={{ color: '#555' }}>{reg.first_approver.name}</Typography>
                        </Box>
                      ) : (
                        <Typography variant="caption" sx={{ color: '#AAA' }}>None yet</Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                        <Button size="small" variant="contained" startIcon={<CheckCircle />} disabled={actionLoading}
                          onClick={() => handleApprove(reg)}
                          sx={{ textTransform: 'none', fontWeight: 600, bgcolor: '#04282B', fontSize: '0.78rem', '&:hover': { bgcolor: '#0a3d40' } }}>
                          Approve
                        </Button>
                        <Button size="small" variant="outlined" color="error" startIcon={<Cancel />} disabled={actionLoading}
                          onClick={() => { setSelectedReg(reg); setRejectDialog(true); }}
                          sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.78rem' }}>
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

      {/* Rejection Dialog — Appendix §10 */}
      <Dialog open={rejectDialog} onClose={() => setRejectDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Reject Registration</Typography>
          <IconButton size="small" onClick={() => setRejectDialog(false)}><Close fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedReg && (
            <Box sx={{ mb: 2, p: 1.5, bgcolor: '#FAFAFA', borderRadius: 1.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedReg.name}</Typography>
              <Typography variant="caption" sx={{ color: '#888' }}>{selectedReg.email} • {selectedReg.department}</Typography>
            </Box>
          )}
          <TextField select fullWidth label="Rejection Reason" value={rejReason} onChange={(e) => setRejReason(e.target.value)}
            size="small" sx={{ mb: 2 }} required>
            {REJECTION_REASONS.map(r => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
          </TextField>
          <TextField fullWidth multiline rows={3} label="Additional Notes (optional)" value={rejNotes}
            onChange={(e) => setRejNotes(e.target.value)} size="small"
            placeholder="Free-form explanation for the interviewer" />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRejectDialog(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" color="error" disabled={!rejReason || actionLoading} onClick={handleReject}
            sx={{ textTransform: 'none', fontWeight: 600 }}>
            Reject Registration
          </Button>
        </DialogActions>
      </Dialog>

      {/* Info dialog — replaces window.alert for approve/reject feedback */}
      <Dialog
        open={infoDialog.open}
        onClose={() => setInfoDialog(prev => ({ ...prev, open: false }))}
        PaperProps={{ sx: { borderRadius: 3, minWidth: 380 } }}
      >
        <DialogTitle sx={{
          display: 'flex', alignItems: 'center', gap: 1.25,
          fontWeight: 700, color: '#2C2C2A', pb: 1,
        }}>
          {infoDialog.variant === 'success'
            ? <CheckCircle sx={{ color: '#2E7D32', fontSize: 24 }} />
            : <VerifiedUser sx={{ color: '#04282B', fontSize: 24 }} />}
          {infoDialog.title}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: '#4A4A48', fontSize: '0.92rem', lineHeight: 1.55 }}>
            {infoDialog.message}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setInfoDialog(prev => ({ ...prev, open: false }))}
            variant="contained"
            sx={{
              textTransform: 'none', fontWeight: 600,
              bgcolor: '#04282B', color: '#fff',
              '&:hover': { bgcolor: '#0a3d40' },
              borderRadius: 2, px: 3,
            }}
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ApprovalQueue;
