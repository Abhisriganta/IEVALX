// BUILD: 2026-08-28-iaem-list-v2
// Guide §1 Section A — List all interviewers with filters
// Eye icon removed; row click → merged detail page with tabs
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, TextField, MenuItem, InputAdornment,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Button, Skeleton, Avatar, Tooltip,
} from '@mui/material';
import { Search, PersonAdd } from '@mui/icons-material';
import { hrInterviewerService } from '@/services/api/iaem';
import { LIFECYCLE_STATES } from '@/constants/iaem';

const StateChip = ({ state }) => {
  const s = LIFECYCLE_STATES[state] || LIFECYCLE_STATES.ACTIVE;
  return (
    <Chip label={s.label} size="small" sx={{
      bgcolor: s.bg, color: s.color, fontWeight: 700, fontSize: '0.72rem',
      borderRadius: '8px', height: 26,
    }} />
  );
};

const InterviewerList = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('ALL');

  useEffect(() => {
    hrInterviewerService.getInterviewers()
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = (data?.interviewers || []).filter((iv) => {
    if (stateFilter !== 'ALL' && iv.state !== stateFilter) return false;
    if (search && !iv.name.toLowerCase().includes(search.toLowerCase()) &&
        !iv.department.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1100, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: '1.4rem', color: '#2C2C2A' }}>Interviewers</Typography>
          <Typography sx={{ fontSize: '0.85rem', color: '#55584F', mt: 0.25 }}>Manage interviewer profiles, levels, and lifecycle states.</Typography>
        </Box>
        <Button variant="outlined" startIcon={<PersonAdd />} onClick={() => navigate('/employer/interviewers/approvals')}
          sx={{
            textTransform: 'none', fontWeight: 600, borderColor: '#04282B', color: '#04282B',
            borderRadius: '10px', px: 2.5,
            '&:hover': { bgcolor: '#F0F7F7', borderColor: '#04282B' },
          }}>
          Approval Queue
        </Button>
      </Box>

      {/* Filters */}
     <Paper elevation={0} sx={{ p: 2, mb: 2.5, borderRadius: 2.5, border: '1px solid #E7EAE3', display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField size="small" placeholder="Search by name or department" value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 280, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18, color: '#7A7E76' }} /></InputAdornment> }} />
        <TextField select size="small" label="Status" value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          sx={{ minWidth: 180, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}>
          <MenuItem value="ALL">All States</MenuItem>
          {Object.entries(LIFECYCLE_STATES).map(([k, v]) => (
            <MenuItem key={k} value={k}>{v.label}</MenuItem>
          ))}
        </TextField>
      </Paper>

      {/* Table */}
      <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #E7EAE3', overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ p: 3 }}>{[1,2,3].map((i) => <Skeleton key={i} height={56} sx={{ mb: 1, borderRadius: 2 }} />)}</Box>
        ) : (
          <TableContainer>
            <Table sx={{ '& .MuiTableCell-root': { borderBottom: '1px solid #E7EAE3 !important' } }}>
              <TableHead>
                <TableRow sx={{
                  '& .MuiTableCell-head': {
                    backgroundColor: '#F0F3EE !important',
                    color: '#55584F !important',
                    borderBottom: '1px solid #E7EAE3 !important',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    py: 1.5,
                  },
                }}>
                  <TableCell>Name</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell>Seniority</TableCell>
                  <TableCell>Interviews / Cap</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((iv) => (
                  <TableRow key={iv.interviewer_id} hover
                    sx={{
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease',
                      '&:hover': { bgcolor: '#EDF3EC' },
                      '&:last-child td': { border: 0 },
                    }}
                    onClick={() => navigate(`/employer/interviewers/${iv.interviewer_id}`)}>
                    <TableCell sx={{ py: 1.8 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar src={iv.profile_photo_url || undefined} sx={{ width: 34, height: 34, bgcolor: '#04282B', fontSize: '0.78rem', fontWeight: 700 }}>
                          {iv.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography sx={{ fontWeight: 600, fontSize: '0.88rem', color: '#2C2C2A' }}>{iv.name}</Typography>
                          {iv.bar_raiser && (
                            <Chip label="Bar Raiser" size="small" sx={{
                              bgcolor: '#E8F5E9', color: '#2E7D32', fontWeight: 600,
                              fontSize: '0.65rem', height: 18, mt: 0.25, borderRadius: '6px',
                            }} />
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell><Typography sx={{ fontSize: '0.85rem', color: '#55584F' }}>{iv.department}</Typography></TableCell>
                    <TableCell><Typography sx={{ fontSize: '0.85rem', color: '#55584F', textTransform: 'capitalize' }}>{iv.seniority}</Typography></TableCell>
                    <TableCell>
                      <Typography sx={{
                        fontSize: '0.85rem', fontWeight: 600,
                        color: iv.interviews_this_week >= iv.weekly_cap ? '#E65100' : '#55584F',
                      }}>
                        {iv.interviews_this_week} / {iv.weekly_cap}
                      </Typography>
                    </TableCell>
                    <TableCell><StateChip state={iv.state} /></TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} sx={{ textAlign: 'center', py: 5, color: '#7A7E76', fontSize: '0.9rem' }}>
                      No interviewers match your filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
};

export default InterviewerList;