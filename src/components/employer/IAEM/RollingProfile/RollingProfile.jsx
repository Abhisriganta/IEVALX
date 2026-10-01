// BUILD: 2026-08-24-iaem-gaps-v1 — Appendix §7 COMPLETE with Recharts
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box, Typography, Paper, Grid, Chip, ToggleButtonGroup, ToggleButton, Skeleton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine, ReferenceArea,
} from 'recharts';
import { rollingProfileService } from '@/services/api/iaem';
import { SignalBadge, SeverityBadge } from '@/components/common/iaem';
import { PROFILE_WINDOWS, RESOLUTION_TYPES } from '@/constants/iaem';

const StatCard = ({ label, value, sub, color }) => (
  <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid #E8E8E8', textAlign: 'center' }}>
    <Typography variant="caption" sx={{ color: '#888' }}>{label}</Typography>
    <Typography variant="h5" sx={{ fontWeight: 800, color: color || '#2C2C2A' }}>{value}</Typography>
    {sub && <Typography variant="caption" sx={{ color: '#AAA' }}>{sub}</Typography>}
  </Paper>
);

const RollingProfile = () => {
  const { interviewerId } = useParams();
  const [window, setWindow] = useState(60);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    rollingProfileService.getRollingProfile(interviewerId, window)
      .then(r => setData(r.data)).catch(console.error).finally(() => setLoading(false));
  }, [interviewerId, window]);

  if (loading) return <Box sx={{ p: 3 }}><Skeleton height={400} /></Box>;
  const s = data?.summary;

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>{data?.interviewer_name} — Rolling Profile</Typography>
          <Typography variant="body2" sx={{ color: '#888' }}>
            {data?.employee_id} • {data?.department} • {data?.seniority} • {data?.state}
            {data?.bar_raiser && <Chip label="Bar Raiser" size="small" sx={{ ml: 1, bgcolor: '#E8F5E9', color: '#2E7D32', fontWeight: 600, height: 20 }} />}
          </Typography>
        </Box>
        <ToggleButtonGroup value={window} exclusive onChange={(_, v) => { if (v) setWindow(v); }} size="small">
          {PROFILE_WINDOWS.map(w => <ToggleButton key={w} value={w} sx={{ textTransform: 'none', px: 2, fontWeight: 600 }}>{w} days</ToggleButton>)}
        </ToggleButtonGroup>
      </Box>

      {/* Summary cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 4, md: 2.4 }}><StatCard label="Interviews" value={s?.total_interviews} /></Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2.4 }}><StatCard label="Hire Rate" value={`${s?.hire_rate}%`} sub={`Peer median: ${s?.peer_median_hire_rate}%`} color={s?.hire_rate < s?.peer_median_hire_rate ? '#E65100' : '#4CAF50'} /></Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2.4 }}><StatCard label="Avg Divergence" value={s?.avg_score_divergence?.toFixed(1)} /></Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2.4 }}><StatCard label="Signals" value={s?.signals_surfaced} color={s?.signals_surfaced > 0 ? '#E65100' : '#4CAF50'} /></Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2.4 }}><StatCard label="Calibration" value={data?.calibration?.status} color={data?.calibration?.status === 'OVERDUE' ? '#F44336' : '#4CAF50'} /></Grid>
      </Grid>

      {/* Score Divergence Trend — LINE CHART */}
      <Paper elevation={0} sx={{ p: 2.5, mb: 3, borderRadius: 2.5, border: '1px solid #E8E8E8' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>Score Divergence Trend</Typography>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data?.divergence_trend || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
            <XAxis dataKey="interview_date" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <ReferenceLine y={0} stroke="#999" strokeDasharray="4 4" label={{ value: 'Zero', fontSize: 10, fill: '#999' }} />
            {/* Calibration baseline band */}
            <ReferenceArea y1={-data?.divergence_trend?.[0]?.calibration_baseline || -5} y2={data?.divergence_trend?.[0]?.calibration_baseline || 5}
              fill="#E8F5E9" fillOpacity={0.3} label={{ value: 'Calibration baseline', fontSize: 10, fill: '#4CAF50' }} />
            <Line type="monotone" dataKey="divergence" stroke="#04282B" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} name="Divergence" />
          </LineChart>
        </ResponsiveContainer>
      </Paper>

      {/* Question Distribution — STACKED BAR CHART */}
      <Paper elevation={0} sx={{ p: 2.5, mb: 3, borderRadius: 2.5, border: '1px solid #E8E8E8' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>Question Distribution</Typography>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data?.question_distribution || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
            <XAxis dataKey="interview_date" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="in_scope" stackId="q" fill="#4CAF50" name="In-Scope" />
            <Bar dataKey="adjacent" stackId="q" fill="#FF9800" name="Adjacent" />
            <Bar dataKey="out_of_scope" stackId="q" fill="#F44336" name="Out-of-Scope" />
          </BarChart>
        </ResponsiveContainer>
      </Paper>

      {/* AI Narrative */}
      <Paper elevation={0} sx={{ p: 2.5, mb: 3, borderRadius: 2.5, border: '1px solid #E3F2FD', bgcolor: '#FAFCFF' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>AI-Generated Summary</Typography>
        <Typography variant="body2" sx={{ color: '#555', lineHeight: 1.7 }}>{data?.ai_narrative}</Typography>
      </Paper>

      {/* Signals History */}
      <Paper elevation={0} sx={{ p: 2.5, mb: 3, borderRadius: 2.5, border: '1px solid #E8E8E8' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>Signals History</Typography>
        {data?.signals_history?.length === 0 ? (
          <Typography variant="body2" sx={{ color: '#888' }}>No signals in this window.</Typography>
        ) : (
          <TableContainer><Table size="small"><TableHead><TableRow sx={{ bgcolor: '#FAFAFA' }}>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.78rem' }}>Date</TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.78rem' }}>Signal</TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.78rem' }}>Severity</TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.78rem' }}>Resolution</TableCell>
          </TableRow></TableHead><TableBody>
            {data.signals_history.map((sh, i) => (
              <TableRow key={i}>
                <TableCell>{sh.date}</TableCell>
                <TableCell><SignalBadge code={sh.signal_code} /></TableCell>
                <TableCell><SeverityBadge severity={sh.severity} /></TableCell>
                <TableCell><Chip label={RESOLUTION_TYPES[sh.resolution]?.label || sh.resolution} size="small" sx={{ fontWeight: 600, fontSize: '0.72rem' }} /></TableCell>
              </TableRow>
            ))}
          </TableBody></Table></TableContainer>
        )}
      </Paper>

      {/* Calibration Status */}
      <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2.5, border: '1px solid #E8E8E8' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>Calibration Status</Typography>
        <Typography variant="body2" sx={{ color: '#555', mb: 1 }}>Last calibration: {data?.calibration?.last_calibration_date}</Typography>
        <Chip label={data?.calibration?.status} sx={{ bgcolor: data?.calibration?.status === 'OVERDUE' ? '#FFEBEE' : data?.calibration?.status === 'DUE' ? '#FFF3E0' : '#E8F5E9', color: data?.calibration?.status === 'OVERDUE' ? '#C62828' : data?.calibration?.status === 'DUE' ? '#E65100' : '#2E7D32', fontWeight: 700, mb: 2 }} />
        <TableContainer><Table size="small"><TableHead><TableRow sx={{ bgcolor: '#FAFAFA' }}>
          <TableCell sx={{ fontWeight: 600, fontSize: '0.78rem' }}>Competency</TableCell>
          <TableCell sx={{ fontWeight: 600, fontSize: '0.78rem' }}>Deviation</TableCell>
        </TableRow></TableHead><TableBody>
          {data?.calibration?.baselines?.map(b => (
            <TableRow key={b.competency}>
              <TableCell>{b.competency}</TableCell>
              <TableCell><Typography variant="body2" sx={{ fontWeight: 700, color: b.deviation > 0.3 ? '#E65100' : b.deviation < -0.3 ? '#1976D2' : '#4CAF50' }}>
                {b.deviation > 0 ? '+' : ''}{b.deviation.toFixed(1)}
              </Typography></TableCell>
            </TableRow>
          ))}
        </TableBody></Table></TableContainer>
      </Paper>
    </Box>
  );
};

export default RollingProfile;
