// BUILD: 2026-08-29-iaem-dashboard-v3 — app-native pine/sage (no blue)
// Interviewer landing page — summary cards + upcoming interviews + pending items
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Card, CardContent, Grid, Chip, Button, Skeleton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, IconButton, Tooltip,
} from '@mui/material';
import {
  Schedule, Gavel, Assessment, CalendarMonth,
  OpenInNew, VideoCall, ArrowForward,
} from '@mui/icons-material';
import { interviewerService } from '@/services/api/iaem';

/* ── App-native tokens (matched from Employer/Company dashboards) ──── */
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
  /* status — earthy, no blue */
  green:     '#3E6E3E',
  greenBg:   '#EAF2E9',
  amber:     '#A35A2D',
  amberBg:   '#F6ECDF',
};

const FONT = "'Jost','DM Sans',sans-serif";

/* ── Shared card styles — matches Employer/Company dashboards ────────── */
const CARD_SX = {
  bgcolor:      T.surface,
  border:       `1px solid ${T.line}`,
  borderRadius: '14px',
  boxShadow:    'none',
};

const HOVER_LIFT_SX = {
  transition: 'transform 0.25s cubic-bezier(0.22,1,0.36,1), box-shadow 0.25s ease',
  cursor: 'pointer',
  '&:hover': {
    transform: 'translateY(-3px)',
    boxShadow: '0 8px 24px rgba(2,33,36,0.08)',
  },
  '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
};

// ── Summary stat card (same pattern as Company/Employer dashboards) ──
const StatCard = ({ icon: Icon, label, value, accent = T.sage, iconBg = T.sageSoft, onClick }) => (
  <Card
    elevation={0}
    onClick={onClick}
    sx={{
      ...CARD_SX,
      ...(onClick ? HOVER_LIFT_SX : {}),
      cursor: onClick ? 'pointer' : 'default',
      height: '100%', width: '100%', display: 'flex', flexDirection: 'column',
    }}
  >
    <CardContent sx={{
      p: { xs: 2, sm: 2.25, md: 2.5 }, flex: 1,
      display: 'flex', flexDirection: 'column',
      '&:last-child': { pb: { xs: 2, sm: 2.25, md: 2.5 } },
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
        <Typography sx={{
          fontSize: { xs: '0.68rem', sm: '0.72rem', md: '0.75rem' },
          color: T.muted, fontWeight: 800, fontFamily: FONT,
          letterSpacing: '0.05em', textTransform: 'uppercase',
        }}>
          {label}
        </Typography>
        <Box sx={{
          width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: '10px', bgcolor: iconBg, color: accent,
          flexShrink: 0, '& svg': { fontSize: 18 },
        }}>
          <Icon />
        </Box>
      </Box>
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'flex-start' }}>
        <Typography sx={{
          fontFamily: FONT, fontWeight: 800, color: T.ink, lineHeight: 1,
          letterSpacing: '-0.02em',
          fontSize: { xs: '1.75rem', sm: '2rem', md: '2.15rem' },
        }}>
          {value}
        </Typography>
      </Box>
      {onClick && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
          <ArrowForward sx={{ fontSize: 14, color: T.sageText }} />
        </Box>
      )}
    </CardContent>
  </Card>
);

// ── Section heading with sage accent bar ────────────────────────────────
const SectionHeading = ({ children }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
    <Box sx={{ width: 4, height: 22, bgcolor: T.sage, borderRadius: '2px' }} />
    <Typography sx={{
      fontFamily: FONT, fontWeight: 800, color: T.ink,
      letterSpacing: '-0.01em', lineHeight: 1.2,
      fontSize: { xs: '1rem', sm: '1.1rem' },
    }}>
      {children}
    </Typography>
  </Box>
);

// ── Status chip — earthy palette only ───────────────────────────────────
const StatusChip = ({ status }) => {
  const map = {
    UPCOMING:      { label: 'Upcoming',      color: T.pine,   bg: '#E8EFEF', border: `1px solid ${T.line}` },
    LIVE:          { label: 'Live',           color: T.green,  bg: T.greenBg, border: '1px solid rgba(62,110,62,0.25)' },
    COMPLETED:     { label: 'Completed',      color: T.green,  bg: T.greenBg, border: '1px solid rgba(62,110,62,0.25)' },
    NOT_ATTEMPTED: { label: 'Not Attempted',  color: T.faint,  bg: T.lineSoft, border: `1px solid ${T.line}` },
  };
  const s = map[status] || map.UPCOMING;
  return (
    <Chip
      label={s.label}
      size="small"
      sx={{
        bgcolor: s.bg, color: s.color, border: s.border,
        fontWeight: 600, fontSize: '0.72rem', fontFamily: FONT,
      }}
    />
  );
};

const InterviewerDashboard = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const initialLoadDone = useRef(false);

  const fetchDashboard = (pg, size, filter) => {
    const params = { page: pg + 1, page_size: size };
    if (filter && filter !== 'ALL') params.status_filter = filter;
    interviewerService.getDashboardSummary(params)
      .then((res) => {
        setSummary(res.data);
        if (!initialLoadDone.current) {
          initialLoadDone.current = true;
          if (res.data?.upcoming_interviews > 0) {
            setStatusFilter('UPCOMING');
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDashboard(page, rowsPerPage, statusFilter);
  }, [page, rowsPerPage, statusFilter]);

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width={240} height={40} sx={{ mb: 3 }} />
        <Grid container spacing={2}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Grid key={i} size={{ xs: 6, sm: 4, md: 2.4 }}>
              <Skeleton variant="rounded" height={110} sx={{ borderRadius: '14px' }} />
            </Grid>
          ))}
        </Grid>
        <Skeleton variant="rounded" height={200} sx={{ mt: 3, borderRadius: '14px' }} />
      </Box>
    );
  }

  const stats = [
    { icon: CalendarMonth, label: 'Upcoming Interviews', value: summary?.upcoming_interviews ?? 0, accent: T.sageText, iconBg: T.sageSoft, nav: null },
    { icon: Schedule,      label: 'Pending Slot Requests', value: summary?.pending_slot_requests ?? 0, accent: T.amber, iconBg: T.amberBg, nav: '/interviewer/slots' },
    { icon: Assessment,    label: 'Pending Submissions', value: summary?.pending_submissions ?? 0, accent: T.sageText, iconBg: T.sageSoft, nav: null },
    { icon: Gavel,         label: 'Open Cases', value: summary?.open_cases ?? 0, accent: T.amber, iconBg: T.amberBg, nav: '/interviewer/cases' },
    { icon: Assessment,    label: 'Calibration Due', value: summary?.calibration_due ?? 0, accent: T.sage, iconBg: T.sageSoft, nav: '/interviewer/calibration' },
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ mb: 3.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
          <Box sx={{ width: 4, height: 26, bgcolor: T.sage, borderRadius: '2px' }} />
          <Typography sx={{
            fontWeight: 800, color: T.ink,
            fontFamily: FONT, letterSpacing: '-0.01em',
            fontSize: { xs: '1.25rem', sm: '1.5rem' },
          }}>
            Interviewer Dashboard
          </Typography>
        </Box>
        <Typography sx={{
          color: T.muted, fontFamily: FONT,
          fontSize: '0.88rem', ml: '20px',
        }}>
          Your interviews, submissions, and audit activity at a glance.
        </Typography>
      </Box>

      {/* Summary cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {stats.map((s) => (
          <Grid key={s.label} size={{ xs: 6, sm: 4, md: 2.4 }}>
            <StatCard {...s} onClick={s.nav ? () => navigate(s.nav) : undefined} />
          </Grid>
        ))}
      </Grid>

      {/* Upcoming interviews table */}
      <Card elevation={0} sx={{ ...CARD_SX, overflow: 'hidden' }}>
        {/* Section header */}
        <Box sx={{
          px: 2.5, py: 2,
          borderBottom: `1px solid ${T.line}`,
          display: 'flex', alignItems: 'center', gap: 1.5,
        }}>
          <Box sx={{ width: 4, height: 20, bgcolor: T.sage, borderRadius: '2px' }} />
          <Typography sx={{
            fontWeight: 800, color: T.ink, fontFamily: FONT,
            fontSize: '1.05rem', letterSpacing: '-0.01em',
          }}>
            Upcoming Interviews
          </Typography>
        </Box>

        {/* Filter chips */}
        <Box sx={{ px: 2.5, py: 1.5, display: 'flex', gap: 0.8, flexWrap: 'wrap', bgcolor: T.cream }}>
          {[
            { key: 'ALL',           label: 'All' },
            { key: 'UPCOMING',      label: 'Upcoming' },
            { key: 'LIVE',          label: 'Live' },
            { key: 'COMPLETED',     label: 'Completed' },
            { key: 'NOT_ATTEMPTED', label: 'Not Attempted' },
          ].map((f) => (
            <Chip
              key={f.key}
              label={f.label}
              size="small"
              onClick={() => { setStatusFilter(f.key); setPage(0); }}
              sx={{
                fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer',
                fontFamily: FONT,
                bgcolor: statusFilter === f.key ? T.pine : 'transparent',
                color: statusFilter === f.key ? '#fff' : T.faint,
                border: statusFilter === f.key ? 'none' : `1px solid ${T.line}`,
                transition: 'all 0.15s ease',
                '&:hover': {
                  bgcolor: statusFilter === f.key ? T.pineMid : T.sageSoft,
                },
              }}
            />
          ))}
        </Box>

        {summary?.recent_interviews?.length > 0 ? (
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
                    py: 1.4,
                  },
                }}>
                  {['Job Title', 'Candidate', 'Date & Time', 'Level', 'Audit', 'Status'].map((h) => (
                    <TableCell key={h}>{h}</TableCell>
                  ))}
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {summary.recent_interviews.map((iv) => (
                  <TableRow key={iv.booking_id} sx={{
                    '&:last-child td': { borderBottom: '0 !important' },
                    '&:hover': { bgcolor: T.cream },
                    transition: 'background 0.15s ease',
                    '& .MuiTableCell-root': {
                      borderBottom: `1px solid ${T.line} !important`,
                    },
                  }}>
                    <TableCell>
                      <Typography sx={{
                        fontWeight: 700, color: T.ink, fontSize: '0.85rem', fontFamily: FONT,
                      }}>
                        {iv.job_title}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{
                        color: T.body, fontSize: '0.85rem', fontFamily: FONT,
                      }}>
                        {iv.candidate_name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{
                        color: T.muted, fontSize: '0.85rem', fontFamily: FONT,
                      }}>
                        {iv.date} at {iv.time} {iv.timezone}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={iv.level} size="small" sx={{
                        bgcolor: T.sageSoft, color: T.sageText,
                        fontWeight: 700, fontSize: '0.72rem', fontFamily: FONT,
                        border: `1px solid rgba(127,158,126,0.22)`,
                      }} />
                    </TableCell>
                    <TableCell>
                      {iv.audit_enabled ? (
                        <Chip label="Audit ON" size="small" sx={{
                          bgcolor: T.amberBg, color: T.amber,
                          fontWeight: 600, fontSize: '0.72rem', fontFamily: FONT,
                          border: '1px solid rgba(163,90,45,0.25)',
                        }} />
                      ) : (
                        <Chip label="OFF" size="small" variant="outlined" sx={{
                          fontSize: '0.72rem', borderColor: T.line, color: T.faint, fontFamily: FONT,
                        }} />
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusChip status={iv.status} />
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<VideoCall />}
                        disabled={!iv.is_joinable}
                        onClick={() => window.open(iv.join_link, '_blank')}
                        sx={{
                          textTransform: 'none', fontWeight: 700, fontSize: '0.75rem',
                          fontFamily: FONT,
                          bgcolor: T.pine, px: 2, py: 0.6,
                          borderRadius: '10px', boxShadow: 'none',
                          '&:hover': { bgcolor: T.pineMid, boxShadow: 'none' },
                          '&.Mui-disabled': { bgcolor: T.lineSoft, color: T.faint },
                        }}
                      >
                        Join Meeting
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box sx={{ p: 5, textAlign: 'center' }}>
            <Typography sx={{ color: T.faint, fontFamily: FONT, fontSize: '0.88rem' }}>
              No upcoming interviews. When HR releases a schedule and you submit slots, booked interviews will appear here.
            </Typography>
          </Box>
        )}
        {summary?.pagination?.total > 0 && (
          <TablePagination
            component="div"
            count={summary.pagination.total}
            page={page}
            onPageChange={(e, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[5, 10]}
            sx={{
              borderTop: `1px solid ${T.line}`,
              '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
                fontFamily: FONT, color: T.faint, fontSize: '0.82rem',
              },
            }}
          />
        )}
      </Card>
    </Box>
  );
};

export default InterviewerDashboard;