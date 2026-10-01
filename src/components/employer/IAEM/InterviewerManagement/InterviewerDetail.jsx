import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box, Typography, Paper, Grid, Chip, Button, Skeleton,
  TextField, MenuItem, Tab, Tabs, Fade, Avatar,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  ToggleButtonGroup, ToggleButton, LinearProgress,
  Dialog, DialogContent, DialogActions,
} from '@mui/material';
import {
  ArrowBack, Person, BarChart, Email as EmailIcon,
  Phone as PhoneIcon, AccessTime, Speed, WorkHistory,
  CalendarMonth, VerifiedUser, PictureAsPdf, CheckCircle, ErrorOutlined as ErrorOutline, WarningAmber,
} from '@mui/icons-material';
import {
  LineChart, Line, BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as ReTooltip, Legend, ResponsiveContainer, ReferenceLine, ReferenceArea, Cell,
} from 'recharts';
import { hrInterviewerService, rollingProfileService } from '@/services/api/iaem';
import { LIFECYCLE_STATES, PROFILE_WINDOWS, RESOLUTION_TYPES } from '@/constants/iaem';
import { SignalBadge, SeverityBadge } from '@/components/common/iaem';

/* ── Pine theme tokens ─────────────────────────────────────────────────── */
const P = '#04282B';
const SAGE = '#8FB08E';
const MUTED = '#6F7470';
const HINT = '#A0A8A0';
const LINE = '#E7EAE3';
const INK = '#1F1F1F';
const SUBTLE = '#F0F3EE';
const ACCENT_BG = '#EDF3EC';

const SIG_COLORS = {
  A1: { bg: '#E6F1FB', color: '#0C447C' }, A2: { bg: '#EEEDFE', color: '#3C3489' },
  A3: { bg: '#E1F5EE', color: '#085041' }, A4: { bg: '#FAEEDA', color: '#633806' },
  A5: { bg: '#FBEAF0', color: '#72243E' }, A6: { bg: '#FAECE7', color: '#712B13' },
  A7: { bg: '#FCEBEB', color: '#791F1F' }, A8: { bg: '#F1EFE8', color: '#444441' },
};
const SIG_NAMES = {
  A1: 'Score Divergence', A2: 'Selection Outcome', A3: 'JD Question Alignment',
  A4: 'Experience-Level Calibration', A5: 'Differential Difficulty',
  A6: 'Professional Conduct', A7: 'Misconduct', A8: 'Coverage & Duration',
};
const SIG_KEYS = ['A1','A2','A3','A4','A5','A6','A7','A8'];

/* ── Reusable ──────────────────────────────────────────────────────────── */
const SectionTitle = ({ children }) => (
  <Typography sx={{ fontWeight: 600, fontSize: '0.9rem', color: INK, mb: 2 }}>{children}</Typography>
);
const InfoField = ({ icon: Icon, label, value }) => (
  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, py: 1 }}>
    {Icon && <Box sx={{ width: 32, height: 32, borderRadius: 2, bgcolor: ACCENT_BG, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, mt: 0.2 }}><Icon sx={{ fontSize: 16, color: P }} /></Box>}
    <Box sx={{ minWidth: 0 }}>
      <Typography sx={{ fontSize: '0.65rem', color: HINT, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</Typography>
      <Typography sx={{ fontSize: '0.84rem', color: INK, mt: 0.15, fontWeight: 500, wordBreak: 'break-word' }}>{value || '—'}</Typography>
    </Box>
  </Box>
);
const StatCard = ({ label, value, sub, color }) => (
  <Paper elevation={0} sx={{ p: 1.5, borderRadius: 2.5, border: `1px solid ${LINE}`, textAlign: 'center', '&:hover': { borderColor: SAGE } }}>
    <Typography sx={{ fontSize: '0.65rem', color: HINT, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</Typography>
    <Typography sx={{ fontSize: '0.88rem', fontWeight: 700, color: color || INK, mt: 0.3, lineHeight: 1.3 }}>{value ?? '—'}</Typography>
    {sub && <Typography sx={{ fontSize: '0.62rem', color: HINT, mt: 0.2 }}>{sub}</Typography>}
  </Paper>
);
const cardSx = { p: 2.5, borderRadius: 2.5, border: `1px solid ${LINE}`, mb: 2 };
const thSx = { fontWeight: 600, fontSize: '0.68rem', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.05em', py: 1, borderBottom: `1px solid ${LINE}` };

/* ── Data Table ────────────────────────────────────────────────────────── */
const DataTable = ({ columns, rows, emptyMsg }) => {
  if (!rows || rows.length === 0) return <Typography sx={{ fontSize: '0.82rem', color: HINT, py: 2, textAlign: 'center' }}>{emptyMsg || 'No data available'}</Typography>;
  return (
    <TableContainer sx={{ borderRadius: 2, border: `1px solid ${LINE}`, overflow: 'hidden' }}>
      <Table size="small">
        <TableHead><TableRow sx={{ bgcolor: SUBTLE }}>
          {columns.map((c) => <TableCell key={c.key} sx={thSx}>{c.label}</TableCell>)}
        </TableRow></TableHead>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i} sx={{ '&:hover': { bgcolor: SUBTLE } }}>
              {columns.map((c) => (
                <TableCell key={c.key} sx={{ fontSize: '0.78rem', color: c.color?.(r) || INK, fontWeight: c.bold?.(r) ? 600 : 400 }}>
                  {c.render ? c.render(r) : r[c.key] ?? '—'}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

/* ── Signal content panels ─────────────────────────────────────────────── */

const A1Content = ({ panel, trend }) => {
  const cols = [
    { key: 'date', label: 'Date' },
    { key: 'job_title', label: 'Job' },
    { key: 'interviewer_score', label: 'Your score' },
    { key: 'ai_score', label: 'AI score' },
    { key: 'divergence', label: 'Divergence', render: (r) => `${r.divergence > 0 ? '+' : ''}${r.divergence}`, color: (r) => Math.abs(r.divergence) >= 15 ? '#E65100' : INK, bold: (r) => Math.abs(r.divergence) >= 15 },
  ];
  return (
    <Box>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={trend || []}>
          <CartesianGrid strokeDasharray="3 3" stroke={LINE} />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: MUTED }} tickFormatter={(d) => d?.slice(5)} />
          <YAxis tick={{ fontSize: 10, fill: MUTED }} />
          <ReTooltip contentStyle={{ borderRadius: 8, border: `1px solid ${LINE}`, fontSize: 12 }} />
          <ReferenceLine y={0} stroke={MUTED} strokeDasharray="4 4" />
          <ReferenceArea y1={-15} y2={15} fill={ACCENT_BG} fillOpacity={0.6} />
          <Line type="monotone" dataKey="divergence" stroke={P} strokeWidth={2} dot={{ r: 3, fill: P, stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 5 }} name="Divergence" />
        </LineChart>
      </ResponsiveContainer>
      <Box sx={{ mt: 2 }}><DataTable columns={cols} rows={panel?.table} emptyMsg="No AI scores available yet" /></Box>
    </Box>
  );
};

const A2Content = ({ panel }) => {
  const cols = [
    { key: 'date', label: 'Date' },
    { key: 'job_title', label: 'Job' },
    { key: 'recommendation', label: 'Recommendation' },
    { key: 'outcome', label: 'Candidate outcome', color: (r) => r.outcome === 'SELECTED' ? '#2E7D32' : r.outcome === 'REJECTED' ? '#C62828' : INK },
  ];
  // Use per-interview details from backend (preferred), fall back to aggregate rows
  const rows = panel?.details?.length > 0
    ? panel.details
    : [];
  const ha = panel?.hire_accuracy;
  const na = panel?.nohire_accuracy;
  return (
    <Box>
      {(ha != null || na != null) && (
        <Box sx={{ display: 'flex', gap: 3, mb: 2, flexWrap: 'wrap' }}>
          {ha != null && <Chip label={`Hire accuracy: ${ha}%`} sx={{ bgcolor: ha >= 70 ? '#E1F5EE' : '#FAEEDA', color: ha >= 70 ? '#085041' : '#633806', fontWeight: 600, fontSize: '0.78rem' }} />}
          {na != null && <Chip label={`No-hire accuracy: ${na}%`} sx={{ bgcolor: na >= 70 ? '#E1F5EE' : '#FAEEDA', color: na >= 70 ? '#085041' : '#633806', fontWeight: 600, fontSize: '0.78rem' }} />}
        </Box>
      )}
      <DataTable columns={cols} rows={rows.length > 0 ? rows : null} emptyMsg="Not enough outcome data available yet" />
    </Box>
  );
};

const A3Content = ({ panel, distribution }) => {
  const chartData = panel?.distribution || distribution || [];
  const cols = [
    { key: 'date', label: 'Date' },
    { key: 'in_scope', label: 'In-scope', color: () => '#2E7D32' },
    { key: 'adjacent', label: 'Adjacent', color: () => '#E65100' },
    { key: 'out_of_scope', label: 'Out-of-scope', color: () => '#C62828' },
    { key: 'total', label: 'Total', render: (r) => (r.in_scope || 0) + (r.adjacent || 0) + (r.out_of_scope || 0) },
  ];
  return (
    <Box>
      {chartData.length > 0 && (
        <ResponsiveContainer width="100%" height={180}>
          <ReBarChart data={chartData} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke={LINE} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: MUTED }} tickFormatter={(d) => d?.slice(5)} />
            <YAxis tick={{ fontSize: 10, fill: MUTED }} />
            <ReTooltip contentStyle={{ borderRadius: 8, border: `1px solid ${LINE}`, fontSize: 11 }} />
            <Legend wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />
            <Bar dataKey="in_scope" stackId="q" fill="#4CAF50" name="In-scope" />
            <Bar dataKey="adjacent" stackId="q" fill="#FF9800" name="Adjacent" />
            <Bar dataKey="out_of_scope" stackId="q" fill="#EF5350" name="Out-of-scope" radius={[3, 3, 0, 0]} />
          </ReBarChart>
        </ResponsiveContainer>
      )}
      <Box sx={{ mt: 2 }}><DataTable columns={cols} rows={chartData} emptyMsg="No question analysis data available" /></Box>
    </Box>
  );
};

const A4Content = ({ panel }) => {
  const dist = panel?.distribution || [];
  const cols = [
    { key: 'date', label: 'Date' },
    { key: 'level', label: 'Level' },
    { key: 'L0', label: 'L0 Basic' },
    { key: 'L1', label: 'L1 Mid' },
    { key: 'L2', label: 'L2 Advanced' },
    { key: 'L3', label: 'L3 Senior' },
  ];
  return (
    <Box>
      {dist.length > 0 && (
        <ResponsiveContainer width="100%" height={180}>
          <ReBarChart data={dist} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke={LINE} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: MUTED }} tickFormatter={(d) => d?.slice(5)} />
            <YAxis tick={{ fontSize: 10, fill: MUTED }} />
            <ReTooltip contentStyle={{ borderRadius: 8, border: `1px solid ${LINE}`, fontSize: 11 }} />
            <Legend wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />
            <Bar dataKey="L0" stackId="d" fill="#85B7EB" name="L0 Basic" />
            <Bar dataKey="L1" stackId="d" fill="#378ADD" name="L1 Mid" />
            <Bar dataKey="L2" stackId="d" fill="#185FA5" name="L2 Advanced" />
            <Bar dataKey="L3" stackId="d" fill="#042C53" name="L3 Senior" radius={[3, 3, 0, 0]} />
          </ReBarChart>
        </ResponsiveContainer>
      )}
      <Box sx={{ mt: 2 }}><DataTable columns={cols} rows={dist} emptyMsg="No difficulty data available" /></Box>
    </Box>
  );
};

const A5Content = ({ panel }) => {
  const candidates = panel?.candidates || [];
  const cols = [
    { key: 'date', label: 'Date' },
    { key: 'job_title', label: 'Job' },
    { key: 'avg_difficulty', label: 'Avg difficulty', render: (r) => r.avg_difficulty?.toFixed(2) },
    { key: 'L0', label: 'L0', render: (r) => r.distribution?.L0 ?? '—' },
    { key: 'L1', label: 'L1', render: (r) => r.distribution?.L1 ?? '—' },
    { key: 'L2', label: 'L2', render: (r) => r.distribution?.L2 ?? '—' },
    { key: 'L3', label: 'L3', render: (r) => r.distribution?.L3 ?? '—' },
  ];
  return (
    <Box>
      {panel?.consistency && panel.consistency !== 'NO_DATA' && (
        <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Chip label={`Consistency: ${panel.consistency}`} sx={{
            bgcolor: panel.consistency === 'HIGH' ? '#E1F5EE' : panel.consistency === 'LOW' ? '#FCEBEB' : '#FAEEDA',
            color: panel.consistency === 'HIGH' ? '#085041' : panel.consistency === 'LOW' ? '#791F1F' : '#633806',
            fontWeight: 600, fontSize: '0.78rem',
          }} />
          {panel.std_deviation != null && <Chip label={`Std dev: ${panel.std_deviation}`} variant="outlined" sx={{ fontSize: '0.74rem' }} />}
          {panel.level && <Chip label={`Level: ${panel.level}`} variant="outlined" sx={{ fontSize: '0.74rem' }} />}
        </Box>
      )}
      <DataTable columns={cols} rows={candidates} emptyMsg="Not enough same-level interviews to analyze" />
    </Box>
  );
};

const A6Content = ({ panel }) => {
  const findings = panel?.findings || [];
  const cols = [
    { key: 'date', label: 'Date' },
    { key: 'summary', label: 'Description', render: (r) => (r.summary || '—').slice(0, 80) },
    { key: 'confidence', label: 'Confidence', render: (r) => r.confidence?.toFixed(2) },
    { key: 'severity', label: 'Severity', render: (r) => <SeverityBadge severity={r.severity} /> },
    { key: 'case_id', label: 'Case' },
  ];
  return <DataTable columns={cols} rows={findings} emptyMsg="No professional conduct concerns" />;
};

const A7Content = ({ panel }) => {
  const findings = panel?.findings || [];
  const cols = [
    { key: 'date', label: 'Date' },
    { key: 'summary', label: 'Description', render: (r) => (r.summary || '—').slice(0, 80) },
    { key: 'confidence', label: 'Confidence', render: (r) => r.confidence?.toFixed(2) },
    { key: 'severity', label: 'Severity', render: (r) => <SeverityBadge severity={r.severity} /> },
    { key: 'case_id', label: 'Case' },
  ];
  return <DataTable columns={cols} rows={findings} emptyMsg="No misconduct findings" />;
};

const A8Content = ({ panel }) => {
  const interviews = panel?.interviews || [];
  const cols = [
    { key: 'date', label: 'Date' },
    { key: 'duration_mins', label: 'Duration (min)' },
    { key: 'recommendation', label: 'Recommendation' },
    { key: 'type', label: 'Type', color: (r) => r.type === 'hire' ? '#2E7D32' : '#C62828' },
  ];
  return (
    <Box>
      {interviews.length > 0 && (
        <>
          <ResponsiveContainer width="100%" height={160}>
            <ReBarChart data={interviews} barCategoryGap="15%">
              <CartesianGrid strokeDasharray="3 3" stroke={LINE} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: MUTED }} tickFormatter={(d) => d?.slice(5)} />
              <YAxis tick={{ fontSize: 10, fill: MUTED }} />
              <ReTooltip contentStyle={{ borderRadius: 8, border: `1px solid ${LINE}`, fontSize: 11 }} formatter={(v) => [`${v} min`]} />
              <Bar dataKey="duration_mins" name="Duration">
                {interviews.map((e, i) => <Cell key={i} fill={e.type === 'hire' ? '#4CAF50' : '#EF5350'} />)}
              </Bar>
            </ReBarChart>
          </ResponsiveContainer>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', my: 1 }}>
            {[{ label: 'Hire', c: '#4CAF50' }, { label: 'No-hire', c: '#EF5350' }].map((d) => (
              <Box key={d.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: 0.5, bgcolor: d.c }} />
                <Typography sx={{ fontSize: '0.68rem', color: HINT }}>{d.label}</Typography>
              </Box>
            ))}
          </Box>
          {panel?.avg_hire_mins != null && (
            <Typography sx={{ fontSize: '0.76rem', color: MUTED, textAlign: 'center', mb: 1 }}>
              Avg hire: <b>{panel.avg_hire_mins} min</b> · Avg no-hire: <b>{panel.avg_nohire_mins} min</b> · Ratio: <b style={{ color: panel.ratio_pct < 60 ? '#C62828' : INK }}>{panel.ratio_pct}%</b>
            </Typography>
          )}
        </>
      )}
      <DataTable columns={cols} rows={interviews} emptyMsg="No recording duration data available" />
    </Box>
  );
};

const SIGNAL_CONTENT = { A1: A1Content, A2: A2Content, A3: A3Content, A4: A4Content, A5: A5Content, A6: A6Content, A7: A7Content, A8: A8Content };

/* ── Profile Tab ───────────────────────────────────────────────────────── */
const ProfileTab = ({ data }) => (
  <Fade in timeout={300}>
    <Box>
      <Paper elevation={0} sx={cardSx}>
        <SectionTitle>Contact information</SectionTitle>
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}><InfoField icon={EmailIcon} label="Email" value={data.email} /></Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}><InfoField icon={PhoneIcon} label="Phone" value={data.phone} /></Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}><InfoField icon={WorkHistory} label="Seniority" value={data.seniority} /></Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}><InfoField icon={AccessTime} label="Timezone" value={data.timezone} /></Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}><InfoField icon={Speed} label="Weekly Cap" value={`${data.interviews_this_week ?? 0} / ${data.weekly_cap ?? '—'}`} /></Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}><InfoField icon={BarChart} label="Total Interviews" value={data.total_interviews} /></Grid>
        </Grid>
      </Paper>
      <Paper elevation={0} sx={cardSx}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <Typography sx={{ fontSize: '0.65rem', color: HINT, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1 }}>Skills</Typography>
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
              {data.skills?.length > 0 ? data.skills.map((s) => (
                <Chip key={s} label={s} size="small" sx={{ bgcolor: ACCENT_BG, color: P, fontWeight: 600, fontSize: '0.74rem', border: `1px solid ${LINE}`, borderRadius: 2, height: 26 }} />
              )) : <Typography sx={{ fontSize: '0.82rem', color: HINT }}>—</Typography>}
            </Box>
          </Grid>

        </Grid>
      </Paper>
      <Paper elevation={0} sx={cardSx}>
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12, sm: 4 }}><InfoField icon={VerifiedUser} label="Consent Version" value={data.consent_version} /></Grid>
          <Grid size={{ xs: 12, sm: 4 }}><InfoField icon={CalendarMonth} label="Registered" value={data.registered_at ? new Date(data.registered_at).toLocaleDateString() : '—'} /></Grid>
          <Grid size={{ xs: 12, sm: 4 }}><InfoField icon={CalendarMonth} label="Activated" value={data.activated_at ? new Date(data.activated_at).toLocaleDateString() : '—'} /></Grid>
        </Grid>
      </Paper>
    </Box>
  </Fade>
);

/* ── Performance Tab ───────────────────────────────────────────────────── */
const PerformanceTab = ({ interviewerId }) => {
  const [window, setWindow] = useState(60);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [activeSignal, setActiveSignal] = useState('A1');

  useEffect(() => {
    setLoading(true);
    rollingProfileService.getRollingProfile(interviewerId, window)
      .then((r) => setData(r.data)).catch(console.error).finally(() => setLoading(false));
  }, [interviewerId, window]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await rollingProfileService.downloadReport(interviewerId, window);
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `IAEM_Performance_${window}d.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) { console.error('PDF download failed:', e); }
    setDownloading(false);
  };

  if (loading) {
    return (
      <Box sx={{ pt: 1 }}>
        <Grid container spacing={1.5} sx={{ mb: 2 }}>
          {[1,2,3,4,5].map((i) => <Grid key={i} size={{ xs: 6, sm: 4, md: 2.4 }}><Skeleton variant="rounded" height={68} sx={{ borderRadius: 2.5 }} /></Grid>)}
        </Grid>
        <Skeleton variant="rounded" height={44} sx={{ borderRadius: 2.5, mb: 2 }} />
        <Skeleton variant="rounded" height={300} sx={{ borderRadius: 2.5 }} />
      </Box>
    );
  }

  const s = data?.summary;
  const sp = data?.signal_panels || {};
  const activePanel = sp[activeSignal.toLowerCase()] || {};
  const findingCount = (code) => (sp[code.toLowerCase()]?.findings || []).length;

  const ContentComponent = SIGNAL_CONTENT[activeSignal];

  return (
    <Fade in timeout={300}>
      <Box>
        {/* Top bar */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Button variant="contained" size="small" startIcon={<PictureAsPdf />}
            onClick={handleDownload} disabled={downloading}
            sx={{ textTransform: 'none', fontWeight: 600, bgcolor: P, borderRadius: 2, px: 2, fontSize: '0.78rem',
              '&:hover': { bgcolor: '#0a3d40' }, '&.Mui-disabled': { bgcolor: '#ccc' } }}>
            {downloading ? 'Generating...' : 'Download PDF report'}
          </Button>
          <ToggleButtonGroup value={window} exclusive onChange={(_, v) => { if (v) setWindow(v); }} size="small"
            sx={{ '& .MuiToggleButton-root': {
              textTransform: 'none', px: 2, py: 0.4, fontWeight: 600, fontSize: '0.78rem',
              borderRadius: '8px !important', border: `1px solid ${LINE}`, color: MUTED,
              '&.Mui-selected': { bgcolor: P, color: '#fff', borderColor: P, '&:hover': { bgcolor: '#0a3d40' } },
            }}}>
            {PROFILE_WINDOWS.map((w) => <ToggleButton key={w} value={w}>{w} days</ToggleButton>)}
          </ToggleButtonGroup>
        </Box>

        {/* Summary cards */}
        <Grid container spacing={1.5} sx={{ mb: 2 }}>
          <Grid size={{ xs: 6, sm: 4, md: 2.4 }}><StatCard label="Interviews" value={s?.total_interviews} /></Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
            <StatCard label="Hire Rate" value={s?.hire_rate != null ? `${s.hire_rate}%` : null}
              sub={s?.peer_median_hire_rate != null ? `Peer: ${s.peer_median_hire_rate}%` : undefined}
              color={s?.hire_rate < s?.peer_median_hire_rate ? '#E65100' : '#2E7D32'} />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2.4 }}><StatCard label="Avg Divergence" value={s?.avg_score_divergence != null ? (typeof s.avg_score_divergence === 'number' ? s.avg_score_divergence.toFixed(1) : s.avg_score_divergence) : null} /></Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2.4 }}><StatCard label="Signals" value={s?.signals_surfaced} color={s?.signals_surfaced > 0 ? '#E65100' : '#2E7D32'} /></Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
            <StatCard label="Calibration" value={data?.calibration?.status}
              color={data?.calibration?.status === 'OVERDUE' ? '#C62828' : data?.calibration?.status === 'DUE' ? '#E65100' : '#2E7D32'} />
          </Grid>
        </Grid>

        {/* ═══ Signal Tabs ═══ */}
        <Paper elevation={0} sx={{ borderRadius: 2.5, border: `1px solid ${LINE}`, mb: 2, overflow: 'hidden' }}>
          <Tabs value={activeSignal} onChange={(_, v) => setActiveSignal(v)}
            variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile
            sx={{
              minHeight: 42, bgcolor: SUBTLE, borderBottom: `1px solid ${LINE}`,
              '& .MuiTab-root': {
                textTransform: 'none', fontWeight: 600, fontSize: '0.78rem',
                minHeight: 42, color: MUTED, px: 1.5, gap: 0.75, minWidth: 0,
                '&.Mui-selected': { color: P },
              },
              '& .MuiTabs-indicator': { bgcolor: P, height: 2.5, borderRadius: '2px 2px 0 0' },
            }}>
            {SIG_KEYS.map((code) => {
              const sc = SIG_COLORS[code];
              const count = findingCount(code);
              return (
                <Tab key={code} value={code} label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Chip label={code} size="small" sx={{ bgcolor: sc.bg, color: sc.color, fontWeight: 700, fontSize: '0.68rem', height: 20, borderRadius: 1.5, minWidth: 28 }} />
                    <span>{SIG_NAMES[code]}</span>
                    {count > 0 && (
                      <Chip label={count} size="small" sx={{
                        height: 18, minWidth: 18, fontSize: '0.62rem', fontWeight: 700, borderRadius: '9px',
                        bgcolor: count >= 3 ? '#FCEBEB' : '#FAEEDA',
                        color: count >= 3 ? '#791F1F' : '#854F0B',
                      }} />
                    )}
                  </Box>
                } />
              );
            })}
          </Tabs>

          {/* Signal content */}
          <Box sx={{ p: 2.5 }}>
            {ContentComponent && (
              <ContentComponent
                panel={activePanel}
                trend={data?.divergence_trend}
                distribution={data?.question_distribution}
              />
            )}
          </Box>
        </Paper>

        {/* Calibration */}
        <Paper elevation={0} sx={cardSx}>
          <SectionTitle>Calibration status</SectionTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography sx={{ fontSize: '0.82rem', color: MUTED }}>Last calibration: {data?.calibration?.last_calibrated || '—'}</Typography>
            <Chip label={data?.calibration?.status || '—'} size="small" sx={{
              bgcolor: data?.calibration?.status === 'OVERDUE' ? '#FFEBEE' : data?.calibration?.status === 'DUE' ? '#FFF3E0' : '#E8F5E9',
              color: data?.calibration?.status === 'OVERDUE' ? '#C62828' : data?.calibration?.status === 'DUE' ? '#E65100' : '#2E7D32',
              fontWeight: 700, fontSize: '0.72rem', borderRadius: 2,
            }} />
          </Box>
        </Paper>

        {/* AI Narrative */}
        {data?.ai_narrative && (
          <Paper elevation={0} sx={{ ...cardSx, bgcolor: SUBTLE, mb: 0 }}>
            <SectionTitle>AI-generated summary</SectionTitle>
            <Typography sx={{ fontSize: '0.84rem', color: INK, lineHeight: 1.7 }}>{data.ai_narrative}</Typography>
          </Paper>
        )}
      </Box>
    </Fade>
  );
};

/* ── Main ──────────────────────────────────────────────────────────────── */
const InterviewerDetail = () => {
  const { interviewerId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'performance' ? 1 : 0;
  const [activeTab, setActiveTab] = useState(initialTab);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lifecycleAction, setLifecycleAction] = useState('');
  const [notifDialog, setNotifDialog] = useState({ open: false, message: '', type: 'success' });

  useEffect(() => {
    hrInterviewerService.getInterviewerDetail(interviewerId)
      .then((res) => setData(res.data)).catch(console.error).finally(() => setLoading(false));
  }, [interviewerId]);

  const handleTabChange = (_, v) => { setActiveTab(v); setSearchParams(v === 1 ? { tab: 'performance' } : {}, { replace: true }); };

  const handleLifecycle = async () => {
    if (!lifecycleAction) return;
    try {
      const res = await hrInterviewerService.changeLifecycleState(interviewerId, lifecycleAction);
      setNotifDialog({ open: true, message: res.data.message, type: 'success' });
      setData({ ...data, state: lifecycleAction });
      setLifecycleAction('');
    } catch (err) { console.error(err); }
  };

  if (loading) return <Box sx={{ p: 3 }}><Skeleton variant="rounded" height={100} sx={{ borderRadius: 2.5, mb: 2 }} /><Skeleton variant="rounded" height={300} sx={{ borderRadius: 2.5 }} /></Box>;
  if (!data) return <Box sx={{ p: 3 }}><Typography>Interviewer not found.</Typography></Box>;

  const st = LIFECYCLE_STATES[data.state] || LIFECYCLE_STATES.ACTIVE;
  const initials = `${(data.first_name || '')[0] || ''}${(data.last_name || '')[0] || ''}`.toUpperCase();

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1100, mx: 'auto' }}>
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/employer/interviewers')}
        sx={{ mb: 1.5, textTransform: 'none', color: P, fontWeight: 600, fontSize: '0.84rem', '&:hover': { bgcolor: ACCENT_BG }, borderRadius: 2 }}>
        Back to Interviewers
      </Button>

      <Paper elevation={0} sx={{ borderRadius: 2.5, border: `1px solid ${LINE}`, mb: 2.5, overflow: 'hidden' }}>
        <Box sx={{ px: 3, pt: 2.5, pb: 0, bgcolor: SUBTLE }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar src={data.profile_photo_url || undefined} sx={{ width: 44, height: 44, bgcolor: P, fontSize: '0.95rem', fontWeight: 700 }}>{initials}</Avatar>
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: '1.15rem', color: INK, lineHeight: 1.2 }}>{data.first_name} {data.last_name}</Typography>
                <Typography sx={{ fontSize: '0.8rem', color: MUTED, mt: 0.15 }}>{data.designation} • {data.department}</Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
              <Chip label={st.label} size="small" sx={{ bgcolor: st.bg, color: st.color, fontWeight: 700, fontSize: '0.72rem', height: 24, borderRadius: 2 }} />
              {data.bar_raiser && <Chip label="Bar Raiser" size="small" sx={{ bgcolor: '#E8F5E9', color: '#2E7D32', fontWeight: 700, fontSize: '0.68rem', height: 24, borderRadius: 2 }} />}
            </Box>
          </Box>
          <Tabs value={activeTab} onChange={handleTabChange}
            sx={{
              minHeight: 38,
              '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: '0.84rem', minHeight: 38, color: MUTED, px: 2, gap: 0.5, '&.Mui-selected': { color: P } },
              '& .MuiTabs-indicator': { bgcolor: P, height: 2.5, borderRadius: '2px 2px 0 0' },
            }}>
            <Tab icon={<Person sx={{ fontSize: 16 }} />} iconPosition="start" label="Profile" />
            <Tab icon={<BarChart sx={{ fontSize: 16 }} />} iconPosition="start" label="Performance" />
          </Tabs>
        </Box>
        <Box sx={{ px: 3, py: 1.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', borderTop: `1px solid ${LINE}` }}>
          <Typography sx={{ fontSize: '0.76rem', color: MUTED, fontWeight: 500 }}>Change state:</Typography>
          <TextField select size="small" label="New State" value={lifecycleAction}
            onChange={(e) => setLifecycleAction(e.target.value)}
            sx={{ minWidth: 180, '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: '0.8rem' } }}>
            {Object.entries(LIFECYCLE_STATES)
              .filter(([k]) => k !== data.state && k !== 'PENDING_APPROVAL' && k !== 'AWAITING_SECOND_APPROVAL' && k !== 'APPROVED')
              .map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
          </TextField>
          <Button variant="contained" size="small" disabled={!lifecycleAction} onClick={handleLifecycle}
            sx={{ textTransform: 'none', fontWeight: 600, bgcolor: P, borderRadius: 2, px: 2, fontSize: '0.8rem',
              '&:hover': { bgcolor: '#0a3d40' }, '&.Mui-disabled': { bgcolor: '#E0E0E0' } }}>
            Apply Change
          </Button>
        </Box>
      </Paper>

      {activeTab === 0 && <ProfileTab data={data} />}
      {activeTab === 1 && <PerformanceTab interviewerId={interviewerId} />}
      {/* Notification Dialog */}
      <Dialog open={notifDialog.open} onClose={() => setNotifDialog({ ...notifDialog, open: false })} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
        <Box sx={{ bgcolor: notifDialog.type === 'success' ? '#EDF7ED' : '#FDEDED', px: 3, py: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {notifDialog.type === 'success' ? <CheckCircle sx={{ color: '#2E7D32', fontSize: 28 }} /> : <ErrorOutline sx={{ color: '#C62828', fontSize: 28 }} />}
          <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: notifDialog.type === 'success' ? '#2E7D32' : '#C62828' }}>
            {notifDialog.type === 'success' ? 'Success' : 'Error'}
          </Typography>
        </Box>
        <DialogContent sx={{ px: 3, py: 2.5 }}>
          <Typography sx={{ fontSize: '0.92rem', color: '#1F1F1F', lineHeight: 1.6 }}>{notifDialog.message}</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setNotifDialog({ ...notifDialog, open: false })} variant="contained" disableElevation
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, px: 4, bgcolor: notifDialog.type === 'success' ? '#2E7D32' : '#C62828', '&:hover': { filter: 'brightness(0.9)', bgcolor: notifDialog.type === 'success' ? '#2E7D32' : '#C62828' } }}>
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InterviewerDetail;