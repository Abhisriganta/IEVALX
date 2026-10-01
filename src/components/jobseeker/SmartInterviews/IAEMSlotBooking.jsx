// BUILD: 2026-08-24-iaem-phase2-v1
// Guide Step 8 + Appendix §8 — Jobseeker sees pooled slots and books a time
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Button, Chip, Skeleton, ToggleButtonGroup, ToggleButton,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import { CalendarMonth, ViewList, Close, CheckCircle, EventAvailable } from '@mui/icons-material';
import { jobseekerSlotService } from '@/services/api/iaem';

const IAEMSlotBooking = () => {
  const { releaseId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list');
  const [confirmSlot, setConfirmSlot] = useState(null);
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState(null);

  useEffect(() => {
    jobseekerSlotService.getAvailableSlots(releaseId)
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [releaseId]);

  const handleBook = async () => {
    if (!confirmSlot) return;
    setBooking(true);
    try {
      const res = await jobseekerSlotService.bookSlot(releaseId, confirmSlot.date, confirmSlot.time);
      setBooked(res.data);
      setConfirmSlot(null);
    } catch (err) { console.error(err); }
    finally { setBooking(false); }
  };

  if (loading) return <Box sx={{ p: 3 }}><Skeleton height={300} /></Box>;

  // Success state — booking confirmed
  if (booked) {
    return (
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 600, mx: 'auto' }}>
        <Paper elevation={0} sx={{ p: 4, borderRadius: 3, border: '1px solid #E8E8E8', textAlign: 'center' }}>
          <CheckCircle sx={{ fontSize: 64, color: '#4CAF50', mb: 2 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#2C2C2A', mb: 1 }}>Interview Confirmed</Typography>
          <Typography variant="body1" sx={{ color: '#555', mb: 3, lineHeight: 1.7 }}>
            Your interview is confirmed! You will receive an email with the joining link.
          </Typography>
          <Paper elevation={0} sx={{ p: 2, bgcolor: '#FAFAFA', borderRadius: 2, mb: 3, textAlign: 'left' }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>{booked.job_title}</Typography>
            <Typography variant="body2" sx={{ color: '#555' }}>{booked.company_name}</Typography>
            <Typography variant="body2" sx={{ color: '#555', mt: 1 }}>
              {booked.date} at {booked.time} ({booked.timezone}) • {booked.duration}
            </Typography>
          </Paper>
          <Button variant="contained" onClick={() => navigate('/jobseeker/smart-interviews/live')}
            sx={{ textTransform: 'none', fontWeight: 600, bgcolor: '#04282B', '&:hover': { bgcolor: '#0a3d40' } }}>
            Back to Interviews
          </Button>
        </Paper>
      </Box>
    );
  }

  const slots = (data?.slots || []).filter(s => {
    if (s.remaining <= 0) return false;
    // Filter out past slots (safety net — backend already filters, but
    // covers the gap between fetch and render)
    const now = new Date();
    const [hh, mm] = (s.time.match(/(\d+):(\d+)/) || [, '0', '0']).slice(1);
    const isPM = /PM/i.test(s.time);
    const isAM = /AM/i.test(s.time);
    let hours = parseInt(hh, 10);
    if (isPM && hours !== 12) hours += 12;
    if (isAM && hours === 12) hours = 0;
    const slotDate = new Date(s.date + 'T' + String(hours).padStart(2, '0') + ':' + mm + ':00');
    return slotDate > now;
  });

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header — Appendix §8 */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 2.5, border: '1px solid #E8E8E8' }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#2C2C2A', mb: 0.5 }}>{data?.job_title}</Typography>
        <Typography variant="body2" sx={{ color: '#888', mb: 1 }}>{data?.company_name}</Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 1.5 }}>
          <Chip label={data?.level} size="small" sx={{ bgcolor: '#E3F2FD', color: '#1976D2', fontWeight: 600 }} />
          <Chip icon={<EventAvailable sx={{ fontSize: 14 }} />} label={data?.expected_duration} size="small" sx={{ bgcolor: '#F5F5F5', fontWeight: 500, '& .MuiChip-icon': { color: '#888' } }} />
        </Box>
        <Typography variant="body2" sx={{ color: '#555', lineHeight: 1.7 }}>{data?.jd_excerpt}</Typography>
      </Paper>

      {/* View toggle */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#2C2C2A' }}>
          Available Slots ({slots.length})
        </Typography>
        <ToggleButtonGroup value={view} exclusive onChange={(_, v) => { if (v) setView(v); }} size="small">
          <ToggleButton value="list" sx={{ textTransform: 'none', px: 2 }}><ViewList sx={{ fontSize: 18, mr: 0.5 }} /> List</ToggleButton>
          <ToggleButton value="calendar" sx={{ textTransform: 'none', px: 2 }}><CalendarMonth sx={{ fontSize: 18, mr: 0.5 }} /> Calendar</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {slots.length === 0 ? (
        <Paper elevation={0} sx={{ p: 4, textAlign: 'center', borderRadius: 2.5, border: '1px solid #E8E8E8' }}>
          <Typography variant="body2" sx={{ color: '#888' }}>No available slots at the moment. Please check back later.</Typography>
        </Paper>
      ) : view === 'list' ? (
        /* ── List View ── */
        <Paper elevation={0} sx={{ borderRadius: 2.5, border: '1px solid #E8E8E8', overflow: 'hidden' }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#FAFAFA' }}>
                  <TableCell sx={{ fontWeight: 600, color: '#666', fontSize: '0.78rem' }}>Day</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#666', fontSize: '0.78rem' }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#666', fontSize: '0.78rem' }}>Time</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#666', fontSize: '0.78rem' }}>Timezone</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#666', fontSize: '0.78rem' }}>Available</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, color: '#666', fontSize: '0.78rem' }}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {slots.map((slot, i) => (
                  <TableRow key={i} hover>
                    <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{slot.day}</Typography></TableCell>
                    <TableCell><Typography variant="body2">{slot.date}</Typography></TableCell>
                    <TableCell><Typography variant="body2">{slot.time}</Typography></TableCell>
                    <TableCell><Typography variant="body2" sx={{ color: '#888' }}>{slot.timezone}</Typography></TableCell>
                    <TableCell>
                      <Chip label={`${slot.remaining} slot${slot.remaining > 1 ? 's' : ''}`} size="small"
                        sx={{ bgcolor: '#E8F5E9', color: '#2E7D32', fontWeight: 700, fontSize: '0.72rem' }} />
                    </TableCell>
                    <TableCell align="right">
                      <Button size="small" variant="contained" onClick={() => setConfirmSlot(slot)}
                        sx={{ textTransform: 'none', fontWeight: 600, bgcolor: '#04282B', '&:hover': { bgcolor: '#0a3d40' } }}>
                        Book
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      ) : (
        /* ── Calendar View (simple card grid) ── */
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
          {slots.map((slot, i) => (
            <Paper key={i} elevation={0} sx={{
              p: 2.5, borderRadius: 2, border: '1px solid #E8E8E8',
              cursor: 'pointer', transition: 'all 0.15s',
              '&:hover': { borderColor: '#04282B', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
            }} onClick={() => setConfirmSlot(slot)}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#2C2C2A', mb: 0.5 }}>
                {slot.day}, {slot.date}
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#04282B', mb: 1 }}>{slot.time}</Typography>
              <Chip label={`${slot.remaining} available`} size="small"
                sx={{ bgcolor: '#E8F5E9', color: '#2E7D32', fontWeight: 700, fontSize: '0.72rem' }} />
            </Paper>
          ))}
        </Box>
      )}

      {/* Booking Confirmation Dialog — Appendix §8 */}
      <Dialog open={!!confirmSlot} onClose={() => setConfirmSlot(null)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
  <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between' }}>
    <Typography variant="subtitle1" component="span" sx={{ fontWeight: 700 }}>Confirm Booking</Typography>
          <IconButton size="small" onClick={() => setConfirmSlot(null)}><Close fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent>
          {confirmSlot && (
            <>
              <Typography variant="body1" sx={{ color: '#333', lineHeight: 1.7, mb: 2 }}>
                You are booking an interview for <strong>{data?.job_title}</strong> on{' '}
                <strong>{confirmSlot.date}</strong> at <strong>{confirmSlot.time}</strong>.
              </Typography>
              <Alert severity="warning" sx={{ borderRadius: 2 }}>
                This cannot be changed once confirmed.
              </Alert>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmSlot(null)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" disabled={booking} onClick={handleBook}
            sx={{ textTransform: 'none', fontWeight: 600, bgcolor: '#04282B', '&:hover': { bgcolor: '#0a3d40' } }}>
            {booking ? 'Booking...' : 'Confirm Booking'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default IAEMSlotBooking;
