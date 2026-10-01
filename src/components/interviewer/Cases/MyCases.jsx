// // BUILD: 2026-08-29-iaem-mycases-v2 — pine/sage themed (no blue)
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, Card, Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination, Chip, Button } from '@mui/material';
import { Visibility } from '@mui/icons-material';
import { interviewerCaseService } from '@/services/api/iaem';
import { SignalBadge, SeverityBadge } from '@/components/common/iaem';
import { RESOLUTION_TYPES, APPEAL_WINDOW_DAYS } from '@/constants/iaem';

/* ── App-native tokens ─────────────────────────────────────────────── */
const T = {
  sage:      '#7F9E7E',
  sageText:  '#5E815D',
  sageSoft:  '#EDF3EC',
  pine:      '#04282B',
  pineMid:   '#0a3d40',
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
const CARD_SX = { bgcolor: T.surface, border: `1px solid ${T.line}`, borderRadius: '14px', boxShadow: 'none' };

const TH_ROW_SX = {
  bgcolor: `${T.cream} !important`,
  '& .MuiTableCell-head': {
    backgroundColor: `${T.cream} !important`,
    color: `${T.muted} !important`,
    fontWeight: 800, fontSize: '0.72rem', fontFamily: FONT,
    borderBottom: `1px solid ${T.line} !important`,
    letterSpacing: '0.05em', textTransform: 'uppercase',
  },
};
const TD_ROW_SX = {
  '&:hover': { bgcolor: T.cream },
  '& .MuiTableCell-root': { borderBottom: `1px solid ${T.line} !important` },
  '&:last-child .MuiTableCell-root': { borderBottom: '0 !important' },
};

const MyCases = () => {
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  useEffect(() => {
    interviewerCaseService.getMyCases().then(r => setCases(r.data.cases || [])).catch(console.error).finally(() => setLoading(false));
  }, []);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
          <Box sx={{ width: 4, height: 26, bgcolor: T.sage, borderRadius: '2px' }} />
          <Typography sx={{ fontWeight: 800, color: T.ink, fontFamily: FONT, letterSpacing: '-0.01em', fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
            My Cases & Appeals
          </Typography>
        </Box>
        <Typography sx={{ color: T.faint, fontFamily: FONT, fontSize: '0.88rem', ml: '20px' }}>
          Cases resolved against you and your appeal options.
        </Typography>
      </Box>

      <Card elevation={0} sx={{ ...CARD_SX, overflow: 'hidden' }}>
        {loading ? <Box sx={{ p: 3 }}><Skeleton height={120} /></Box> : cases.length === 0 ? (
          <Box sx={{ p: 5, textAlign: 'center' }}>
            <Typography sx={{ color: T.faint, fontFamily: FONT, fontSize: '0.88rem' }}>No cases. This is a good thing.</Typography>
          </Box>
        ) : (
          <>
          <TableContainer><Table size="small">
            <TableHead><TableRow sx={TH_ROW_SX}>
              <TableCell>Case</TableCell>
              <TableCell>Signal</TableCell>
              <TableCell>Severity</TableCell>
              <TableCell>Resolution</TableCell>
              <TableCell>Appeal</TableCell>
              <TableCell align="right">Action</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {cases.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map(c => (
                <TableRow key={c.case_id} sx={TD_ROW_SX}>
                  <TableCell>
                    <Typography sx={{ fontWeight: 700, color: T.ink, fontFamily: FONT, fontSize: '0.88rem' }}>{c.case_id}</Typography>
                    <Typography sx={{ color: T.faint, fontFamily: FONT, fontSize: '0.78rem' }}>{c.job_title} • {c.interview_date}</Typography>
                  </TableCell>
                  <TableCell>
                    {(c.signals && c.signals.length > 0) ? (
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {c.signals.map((s, i) => (
                          <SignalBadge key={i} code={s.signal_code} />
                        ))}
                      </Box>
                    ) : (
                      <SignalBadge code={c.signal_code} />
                    )}
                  </TableCell>
                  <TableCell><SeverityBadge severity={c.severity} /></TableCell>
                  <TableCell>
                    {c.state === 'AWAITING_RESPONSE'
                      ? <Chip label="Response Needed" size="small" sx={{
                          bgcolor: T.amberBg, color: T.amber, fontWeight: 700, fontSize: '0.72rem', fontFamily: FONT,
                          border: '1px solid rgba(163,90,45,0.25)',
                        }} />
                      : <Chip label={RESOLUTION_TYPES[c.resolution]?.label || c.resolution} size="small" sx={{
                          fontWeight: 600, fontSize: '0.72rem', fontFamily: FONT,
                          bgcolor: T.lineSoft, color: T.muted, border: `1px solid ${T.line}`,
                        }} />}
                  </TableCell>
                  <TableCell>
                    {c.state === 'AWAITING_RESPONSE'
                      ? <Chip label="Respond" size="small" sx={{
                          bgcolor: T.amberBg, color: T.amber, fontWeight: 700, fontFamily: FONT,
                          border: '1px solid rgba(163,90,45,0.25)',
                        }} />
                      : c.appeal_filed ? <Chip label="Filed" size="small" clickable onClick={() => navigate(`/interviewer/appeals/${c.appeal_id}`)} sx={{
                          bgcolor: T.sageSoft, color: T.sageText, fontWeight: 700, fontFamily: FONT, cursor: 'pointer',
                          border: `1px solid rgba(127,158,126,0.22)`,
                        }} /> :
                        c.appeal_deadline && new Date(c.appeal_deadline) > new Date() ? <Typography sx={{ color: T.amber, fontFamily: FONT, fontSize: '0.78rem', fontWeight: 600 }}>Due by {c.appeal_deadline}</Typography> :
                        <Typography sx={{ color: T.faint, fontFamily: FONT, fontSize: '0.78rem' }}>—</Typography>}
                  </TableCell>
                  <TableCell align="right">
                    <Button size="small" startIcon={<Visibility />} onClick={() => navigate(`/interviewer/cases/${c.case_id}`)}
                      sx={{
                        textTransform: 'none', fontWeight: 700, color: T.pine, fontSize: '0.78rem', fontFamily: FONT,
                        borderRadius: '10px',
                        '&:hover': { bgcolor: T.sageSoft },
                      }}>
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
                    </Table></TableContainer>
          <TablePagination
            component="div"
            count={cases.length}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[5, 10]}
            sx={{
              borderTop: `1px solid ${T.line}`,
              '.MuiTablePagination-toolbar': { fontFamily: FONT },
              '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
                fontFamily: FONT, fontSize: '0.82rem', color: T.muted,
              },
              '.MuiTablePagination-select': { fontFamily: FONT, fontWeight: 600 },
              '.MuiTablePagination-actions button': { color: T.pine },
            }}
          />
          </>
        )}
      </Card>
    </Box>
  );
};

export default MyCases;