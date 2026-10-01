// BUILD: 2026-08-24-iaem-final-v1 — Guide §3B (read-only)
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { complianceService } from '@/services/api/iaem';
import { SignalBadge, SeverityBadge, CaseStateBadge } from '@/components/common/iaem';

const ComplianceCaseList = () => {
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const CASES_PER_PAGE = 10;
  useEffect(() => { complianceService.getAllCases().then(r => setCases(r.data.cases || [])).catch(console.error).finally(() => setLoading(false)); }, []);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>Case Oversight</Typography>
     <Typography variant="body2" sx={{ color: '#6F7470', mb: 3 }}>Read-only view of all cases across the tenant.</Typography>
      <Paper elevation={0} sx={{ borderRadius: 2.5, border: '1px solid #E7EAE3', overflow: 'hidden' }}>
        {loading ? <Box sx={{ p: 3 }}><Skeleton height={100} /></Box> : (
          // AFTER
         <TableContainer><Table size="small" sx={{ '& .MuiTableCell-root': { borderBottom: '1px solid #E7EAE3 !important' } }}><TableHead><TableRow sx={{
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
            <TableCell>Case</TableCell><TableCell>Interviewer</TableCell>
            <TableCell>Signal</TableCell><TableCell>Severity</TableCell>
            <TableCell>State</TableCell><TableCell>Date</TableCell>
          </TableRow></TableHead><TableBody>
            {cases.slice(page * CASES_PER_PAGE, (page + 1) * CASES_PER_PAGE).map(c => (
              <TableRow key={c.case_id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/compliance/cases/${c.case_id}`)}>
                <TableCell><Typography variant="body2" sx={{ fontWeight: 700 }}>{c.case_id}</Typography></TableCell>
                <TableCell>{c.interviewer_name}</TableCell>
                <TableCell>
                  {(c.signals && c.signals.length > 0) ? (
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {c.signals.map((s, i) => <SignalBadge key={i} code={s.signal_code} />)}
                    </Box>
                  ) : (
                    <SignalBadge code={c.signal_code} />
                  )}
                </TableCell>
                <TableCell><SeverityBadge severity={c.severity} /></TableCell><TableCell><CaseStateBadge state={c.state} /></TableCell>
                <TableCell>{c.interview_date}</TableCell>
              </TableRow>
            ))}
          </TableBody></Table></TableContainer>
        )}
        {cases.length > CASES_PER_PAGE && (() => {
          const totalPages = Math.ceil(cases.length / CASES_PER_PAGE);
          return (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2.5, py: 1.5, borderTop: '1px solid #E7EAE3' }}>
              <Typography sx={{ fontSize: '0.78rem', color: '#55584F' }}>
                {page * CASES_PER_PAGE + 1}–{Math.min((page + 1) * CASES_PER_PAGE, cases.length)} of {cases.length} cases
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <Box onClick={() => page > 0 && setPage(p => p - 1)}
                  sx={{ px: 1.5, py: 0.5, fontSize: '0.78rem', fontWeight: 600,
                    color: page === 0 ? '#E7EAE3' : '#04282B', cursor: page === 0 ? 'default' : 'pointer',
                    borderRadius: 1.5, border: '1px solid #E7EAE3',
                    '&:hover': page > 0 ? { bgcolor: '#EDF3EC' } : {},
                  }}>‹ Prev</Box>
                <Box onClick={() => page < totalPages - 1 && setPage(p => p + 1)}
                  sx={{ px: 1.5, py: 0.5, fontSize: '0.78rem', fontWeight: 600,
                    color: page >= totalPages - 1 ? '#E7EAE3' : '#04282B', cursor: page >= totalPages - 1 ? 'default' : 'pointer',
                    borderRadius: 1.5, border: '1px solid #E7EAE3',
                    '&:hover': page < totalPages - 1 ? { bgcolor: '#EDF3EC' } : {},
                  }}>Next ›</Box>
              </Box>
            </Box>
          );
        })()}
      </Paper>
    </Box>
  );
};
export default ComplianceCaseList;
