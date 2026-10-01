// BUILD: 2026-08-29-iaem-slots-v5 — pine/sage themed (no blue)
// Guide §2 Section B + Step 7 — Slot requests + submission + booked view
// 3-tab layout: Slot Requests | Booked Interviews | My Submitted Slots
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Tabs, Tab, Button, Chip, Skeleton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton,
  Alert, Grid,
} from '@mui/material';
import { Add, Close, CalendarMonth, Check, Schedule } from '@mui/icons-material';
import { interviewerService } from '@/services/api/iaem';

/* ── App-native tokens (same as InterviewerDashboard) ──────────────── */
const T = {
  sage:      '#7F9E7E',
  sageText:  '#5E815D',
  sageDark:  '#6C8B6B',
  sageSoft:  '#EDF3EC',
  pine:      '#04282B',
  pineMid:   '#0a3d40',
  pine2:     '#24433E',
  cream:     '#F6F8F3',
  ink:       '#101210',
  body:      '#2F332E',
  muted:     '#55584F',
  faint:     '#7A7E76',
  line:      '#E7EAE3',
  lineSoft:  '#F0F2ED',
  surface:   '#FFFFFF',
  green:     '#3E6E3E',
  greenBg:   '#EAF2E9',
  amber:     '#A35A2D',
  amberBg:   '#F6ECDF',
};

const FONT = "'Jost','DM Sans',sans-serif";

const MySlots = () => {
  const [tab, setTab] = useState(0);
  const [requests, setRequests] = useState([]);
  const [submittedSlots, setSubmittedSlots] = useState([]);
  const [loading, setLoading] = useState(true);

  // Submit dialog
  const [submitDialog, setSubmitDialog] = useState(null); // the request object
  const [newSlots, setNewSlots] = useState([{ date: '', time: '' }]);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState(null); // success dialog message

  useEffect(() => {
    // Load slot requests — submitted slots are already included in each request
    interviewerService.getSlotRequests()
      .then((reqRes) => {
        const reqs = reqRes.data.requests || [];
        setRequests(reqs);
        // Collect all submitted slots across all requests
        const allSlots = reqs.flatMap(r => (r.submitted_slots || []).map(s => ({
          ...s,
          job_title: r.job_title,
          release_id: r.release_id,
        })));
        setSubmittedSlots(allSlots);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const addSlotRow = () => setNewSlots([...newSlots, { date: '', time: '' }]);
  const removeSlotRow = (i) => setNewSlots(newSlots.filter((_, idx) => idx !== i));
  const updateSlotRow = (i, field, val) => {
    const next = [...newSlots];
    next[i] = { ...next[i], [field]: val };
    setNewSlots(next);
  };

  const handleSubmitSlots = async () => {
    const valid = newSlots.filter(s => s.date && s.time);
    if (valid.length === 0) return;
    setSubmitting(true);
    try {
      const res = await interviewerService.submitSlots(submitDialog.release_id, valid);
      setSubmitDialog(null);
      setSubmitSuccessMsg(res.data.message);
      setNewSlots([{ date: '', time: '' }]);
      // Reload — get fresh data from slot requests (includes submitted_slots)
      const reqRes = await interviewerService.getSlotRequests();
      const reqs = reqRes.data.requests || [];
      setRequests(reqs);
      const allSlots = reqs.flatMap(r => (r.submitted_slots || []).map(s => ({
        ...s,
        job_title: r.job_title,
        release_id: r.release_id,
      })));
      setSubmittedSlots(allSlots);
    } catch (err) {
      console.error(err);
      const detail = err?.response?.data?.detail || 'Failed to submit slots. Please try again.';
      alert(detail);
    }
    finally { setSubmitting(false); }
  };

  // ── Derived filtered lists ────────────────────────────────────────────

  // Slot Requests tab: releases where the employer's deadline has not passed yet
  // Interviewer can keep submitting slots until deadline — booking status doesn't matter
  const activeRequests = requests.filter((req) => {
    const deadlinePassed = req.deadline && new Date(req.deadline) < new Date();
    return !deadlinePassed;
  });

  // Booked Interviews tab: releases where at least one slot is BOOKED (past or upcoming)
  const bookedRequests = requests.filter((req) => {
    const slots = req.submitted_slots || [];
    return slots.some(s => s.status === 'BOOKED');
  });

  // My Submitted Slots tab: all upcoming slots (not past)
  const upcomingSlots = submittedSlots.filter(s => !s.is_past);

  /* ── Tab styling — override blue theme indicator ────────────────────── */
  const TAB_SX = {
    px: 2, bgcolor: T.cream,
    '& .MuiTab-root': {
      textTransform: 'none', fontWeight: 600, fontFamily: FONT,
      color: T.faint,
      '&.Mui-selected': { color: T.pine, fontWeight: 700 },
    },
    '& .MuiTabs-indicator': {
      backgroundColor: T.pine,
    },
  };

  /* ── Request card shared renderer ───────────────────────────────────── */
  const RequestCard = ({ req, action }) => (
    <Paper elevation={0} sx={{ p: 2.5, borderRadius: '14px', border: `1px solid ${T.line}` }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography sx={{ fontWeight: 700, color: T.ink, fontFamily: FONT, fontSize: '1rem' }}>{req.job_title}</Typography>
          <Typography sx={{ color: T.faint, fontFamily: FONT, fontSize: '0.85rem', mb: 1 }}>{req.department} • {req.level}</Typography>
          <Typography sx={{ color: T.muted, fontFamily: FONT, fontSize: '0.88rem', lineHeight: 1.6, maxWidth: 600 }}>{req.jd_summary}</Typography>
          <Typography sx={{ color: T.amber, mt: 1, display: 'block', fontWeight: 600, fontFamily: FONT, fontSize: '0.78rem' }}>
            Deadline: {req.deadline ? new Date(req.deadline).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
          </Typography>
        </Box>
        {action}
      </Box>
    </Paper>
  );

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
          <Box sx={{ width: 4, height: 26, bgcolor: T.sage, borderRadius: '2px' }} />
          <Typography sx={{
            fontWeight: 800, color: T.ink, fontFamily: FONT,
            letterSpacing: '-0.01em', fontSize: { xs: '1.25rem', sm: '1.5rem' },
          }}>
            My Available Slots
          </Typography>
        </Box>
        <Typography sx={{ color: T.faint, fontFamily: FONT, fontSize: '0.88rem', ml: '20px' }}>
          When HR releases a schedule, you'll receive a request here. Submit your available times for each job.
        </Typography>
      </Box>

      <Paper elevation={0} sx={{ borderRadius: '14px', border: `1px solid ${T.line}`, overflow: 'hidden' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={TAB_SX}>
          <Tab label={`Slot Requests (${activeRequests.length})`} />
          <Tab label={`Booked Interviews (${bookedRequests.length})`} />
          <Tab label={`My Submitted Slots (${upcomingSlots.length})`} />
        </Tabs>

        {loading ? <Box sx={{ p: 3 }}><Skeleton height={120} /></Box> : tab === 0 ? (
          /* ── Tab 1: Slot Requests (active/upcoming only) ── */
          activeRequests.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography sx={{ color: T.faint, fontFamily: FONT, fontSize: '0.88rem' }}>No pending slot requests. When HR releases a schedule that matches your profile, it will appear here.</Typography>
            </Box>
          ) : (
            <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {activeRequests.map((req) => (
                <RequestCard key={req.release_id} req={req} action={
                  <Button variant="contained" startIcon={<CalendarMonth />} onClick={() => setSubmitDialog(req)}
                    sx={{
                      textTransform: 'none', fontWeight: 700, fontFamily: FONT,
                      bgcolor: T.pine, borderRadius: '10px', boxShadow: 'none', flexShrink: 0,
                      '&:hover': { bgcolor: T.pineMid, boxShadow: 'none' },
                    }}>
                    Submit Slots
                  </Button>
                } />
              ))}
            </Box>
          )
        ) : tab === 1 ? (
          /* ── Tab 2: Booked Interviews (same card layout, disabled button) ── */
          bookedRequests.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography sx={{ color: T.faint, fontFamily: FONT, fontSize: '0.88rem' }}>No booked interviews yet. When a candidate books one of your open slots, it will appear here.</Typography>
            </Box>
          ) : (
            <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {bookedRequests.map((req) => (
                <RequestCard key={req.release_id} req={req} action={
                  <Button variant="contained" disabled startIcon={<Check />}
                    sx={{
                      textTransform: 'none', fontWeight: 700, fontFamily: FONT,
                      borderRadius: '10px', boxShadow: 'none', flexShrink: 0,
                      '&.Mui-disabled': { bgcolor: T.greenBg, color: T.green },
                    }}>
                    Slots Booked
                  </Button>
                } />
              ))}
            </Box>
          )
        ) : (
          /* ── Tab 3: My Submitted Slots (upcoming only) ── */
          upcomingSlots.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography sx={{ color: T.faint, fontFamily: FONT, fontSize: '0.88rem' }}>You haven't submitted any slots yet.</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{
                    bgcolor: `${T.cream} !important`,
                    '& .MuiTableCell-head': {
                      backgroundColor: `${T.cream} !important`,
                      color: `${T.muted} !important`,
                      fontWeight: 800,
                      fontSize: '0.72rem',
                      fontFamily: FONT,
                      borderBottom: `1px solid ${T.line} !important`,
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                    },
                  }}>
                    <TableCell>Date</TableCell>
                    <TableCell>Time</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Candidate</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {upcomingSlots.map((slot) => (
                    <TableRow key={slot.slot_id} sx={{
                      '&:hover': { bgcolor: T.cream },
                      '& .MuiTableCell-root': { borderBottom: `1px solid ${T.line} !important` },
                    }}>
                      <TableCell><Typography sx={{ fontWeight: 700, color: T.ink, fontFamily: FONT, fontSize: '0.85rem' }}>{slot.date}</Typography></TableCell>
                      <TableCell><Typography sx={{ color: T.body, fontFamily: FONT, fontSize: '0.85rem' }}>{slot.time}</Typography></TableCell>
                      <TableCell>
                        <Chip label={slot.status} size="small" icon={slot.status === 'BOOKED' ? <Check sx={{ fontSize: 14 }} /> : <Schedule sx={{ fontSize: 14 }} />}
                          sx={{
                            bgcolor: slot.status === 'BOOKED' ? T.greenBg : T.sageSoft,
                            color: slot.status === 'BOOKED' ? T.green : T.sageText,
                            fontWeight: 700, fontSize: '0.72rem', fontFamily: FONT,
                            border: slot.status === 'BOOKED' ? '1px solid rgba(62,110,62,0.25)' : `1px solid rgba(127,158,126,0.22)`,
                            '& .MuiChip-icon': { color: 'inherit' },
                          }} />
                      </TableCell>
                      <TableCell><Typography sx={{ color: T.muted, fontFamily: FONT, fontSize: '0.85rem' }}>{slot.candidate_name || '—'}</Typography></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )
        )}
      </Paper>

      {/* Slot Submission Dialog */}
      <Dialog open={!!submitDialog} onClose={() => setSubmitDialog(null)} maxWidth="sm" fullWidth
        slotProps={{ paper: { sx: { borderRadius: '14px', border: `1px solid ${T.line}` } } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: FONT }}>
          <Typography sx={{ fontWeight: 800, fontFamily: FONT, color: T.ink, fontSize: '1.05rem' }}>Submit Available Slots</Typography>
          <IconButton size="small" onClick={() => setSubmitDialog(null)} sx={{ color: T.faint }}><Close fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent>
          {submitDialog && (
            <Alert icon={false} sx={{
              mb: 2, borderRadius: '10px',
              bgcolor: T.sageSoft, border: `1px solid rgba(127,158,126,0.22)`,
              '& .MuiAlert-message': { width: '100%' },
            }}>
              <Typography sx={{ fontWeight: 700, color: T.ink, fontFamily: FONT, fontSize: '0.9rem' }}>{submitDialog.job_title}</Typography>
              <Typography sx={{ color: T.muted, fontFamily: FONT, fontSize: '0.78rem' }}>
                {submitDialog.level} • Deadline: {submitDialog.deadline ? new Date(submitDialog.deadline).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
              </Typography>
            </Alert>
          )}

          {submitDialog?.interview_start && (
            <Alert icon={false} severity="warning" sx={{
              mb: 2, borderRadius: '10px',
              bgcolor: '#FFFBEB', border: '1px solid rgba(245,158,11,0.25)',
              '& .MuiAlert-message': { width: '100%' },
            }}>
              <Typography sx={{ fontWeight: 700, color: '#92400E', fontFamily: FONT, fontSize: '0.82rem' }}>
                Interview Window
              </Typography>
              <Typography sx={{ color: '#92400E', fontFamily: FONT, fontSize: '0.78rem' }}>
                Slots must be between {new Date(submitDialog.interview_start).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} and {new Date(submitDialog.interview_end).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
              </Typography>
            </Alert>
          )}
          <Typography sx={{ color: T.faint, fontFamily: FONT, fontSize: '0.88rem', mb: 2 }}>
            Add the date and time slots when you are available for this interview. You can add multiple slots.
          </Typography>

          {newSlots.map((slot, i) => (
            <Box key={i} sx={{ display: 'flex', gap: 1.5, mb: 1.5, alignItems: 'center' }}>
              <TextField size="small" type="date" label="Date" value={slot.date}
                onChange={(e) => updateSlotRow(i, 'date', e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                sx={{
                  flex: 1,
                  '& .MuiOutlinedInput-root': {
                    fontFamily: FONT,
                    '& fieldset': { borderColor: T.line },
                    '&:hover fieldset': { borderColor: T.sage },
                    '&.Mui-focused fieldset': { borderColor: T.pine },
                  },
                  '& .MuiInputLabel-root': { fontFamily: FONT, color: T.faint, '&.Mui-focused': { color: T.pine } },
                }} />
              <TextField size="small" type="time" label="Time" value={slot.time}
                onChange={(e) => updateSlotRow(i, 'time', e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                sx={{
                  flex: 1,
                  '& .MuiOutlinedInput-root': {
                    fontFamily: FONT,
                    '& fieldset': { borderColor: T.line },
                    '&:hover fieldset': { borderColor: T.sage },
                    '&.Mui-focused fieldset': { borderColor: T.pine },
                  },
                  '& .MuiInputLabel-root': { fontFamily: FONT, color: T.faint, '&.Mui-focused': { color: T.pine } },
                }} />
              {newSlots.length > 1 && (
                <IconButton size="small" onClick={() => removeSlotRow(i)} sx={{ color: T.faint }}>
                  <Close fontSize="small" />
                </IconButton>
              )}
            </Box>
          ))}

          <Button size="small" startIcon={<Add />} onClick={addSlotRow}
            sx={{ textTransform: 'none', color: T.pine, fontWeight: 700, fontFamily: FONT }}>
            Add Another Slot
          </Button>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setSubmitDialog(null)}
            sx={{ textTransform: 'none', fontFamily: FONT, color: T.faint, fontWeight: 600 }}>Cancel</Button>
          <Button variant="contained" disabled={submitting || newSlots.every(s => !s.date || !s.time)}
            onClick={handleSubmitSlots}
            sx={{
              textTransform: 'none', fontWeight: 700, fontFamily: FONT,
              bgcolor: T.pine, borderRadius: '10px', boxShadow: 'none',
              '&:hover': { bgcolor: T.pineMid, boxShadow: 'none' },
              '&.Mui-disabled': { bgcolor: T.lineSoft, color: T.faint },
            }}>
            {submitting ? 'Submitting...' : `Submit ${newSlots.filter(s => s.date && s.time).length} Slot(s)`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Slot submission success dialog ── */}
      <Dialog open={!!submitSuccessMsg} onClose={() => setSubmitSuccessMsg(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: FONT }}>
          Slots Submitted
          <IconButton onClick={() => setSubmitSuccessMsg(null)}><Close /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Alert severity="success" icon={<Check />} sx={{ borderRadius: 2, fontFamily: FONT }}>
            {submitSuccessMsg}
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="contained" onClick={() => setSubmitSuccessMsg(null)}
            sx={{
              textTransform: 'none', fontWeight: 700, fontFamily: FONT,
              bgcolor: T.pine, borderRadius: '10px', boxShadow: 'none',
              '&:hover': { bgcolor: T.pineMid, boxShadow: 'none' },
            }}>
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MySlots;