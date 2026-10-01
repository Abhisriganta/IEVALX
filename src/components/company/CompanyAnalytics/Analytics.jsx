import React, { useState } from 'react';
import {
  Box, Typography, Button, Menu, MenuItem, Skeleton, Avatar,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  useTheme, useMediaQuery,
} from '@mui/material';
import {
  Download as DownloadIcon,
  PictureAsPdf as PdfIcon,
  TableView as CsvIcon,
  Work as WorkIcon,
  Groups as GroupsIcon,
  CheckCircle as CheckIcon,
  Speed as SpeedIcon,
  People as PeopleIcon,
  Assessment as AssessmentIcon,
  EmojiEvents as TrophyIcon,
  Category as DeptIcon,
} from '@mui/icons-material';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, Cell,
  PieChart, Pie, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, Legend,
} from 'recharts';
import { ThemeProvider } from '@mui/material/styles';
import { useSnackbar } from 'notistack';
import { useCompanyAnalytics } from '@/hooks/company/useCompanyAnalytics';
import analyticsService from '@/services/api/company/analyticsService';
import publicSageTheme from '@/theme/publicSageTheme';

/* ═══════════════════════════════════════════════════════════════════
   BRAND — pine / sage / cream (Sample 3 · Bento Grid)
   ═══════════════════════════════════════════════════════════════════ */
const BRAND = {
  navy:         '#022124',
  navyDark:     '#0A3A38',
  navySoft:     'rgba(127,158,126,0.10)',
  sage:         '#7F9E7E',
  sageDark:     '#6C8B6B',
  sageText:     '#5E815D',
  sageSoft:     '#EDF3EC',
  border:       '#E7EAE3',
  borderStrong: '#D8DDD4',
  muted:        '#55584F',
  ink:          '#101210',
  bg:           '#F6F8F3',
  surface:      '#FFFFFF',
  amber:        '#A35A2D',
  amberSoft:    '#F6ECDF',
  done:         '#3E6E3E',
  doneSoft:     '#EAF2E9',
  err:          '#B4462F',
  inactive:     '#A8ADA8',
  inactiveSoft: '#E8EFEF',
};
const FONT = "'Jost','DM Sans',sans-serif";
const PINE_GRADIENT = 'linear-gradient(160deg, #08302F 0%, #0E1E1D 70%, #121615 100%)';
const TILE_SHADOW = '0 1px 3px rgba(2,33,36,0.05), 0 4px 12px rgba(2,33,36,0.04)';
const TILE_SHADOW_HOVER = '0 8px 24px rgba(2,33,36,0.08), 0 2px 6px rgba(127,158,126,0.10)';

const CHART = [BRAND.navy, BRAND.sage, BRAND.amber, BRAND.done, BRAND.sageDark, BRAND.inactive];
const FUNNEL_COLORS = [BRAND.sage, BRAND.sageText, BRAND.amber, BRAND.navy];
const RANGE_LABEL = { '1m': 'Last Month', '3m': 'Last 3 Months', '6m': 'Last 6 Months', '1y': 'Last Year', all: 'All Time' };
const RANGE_PILLS = [
  { v: '1m', l: '1M' }, { v: '3m', l: '3M' }, { v: '6m', l: '6M' },
  { v: '1y', l: '1Y' }, { v: 'all', l: 'All' },
];
const SECTIONS = [
  { id: 'overview',   label: 'Overview' },
  { id: 'jobs',       label: 'Jobs & Departments' },
  { id: 'applicants', label: 'Applicants' },
  { id: 'employers',  label: 'Employers' },
];

const EMP_STATUS = {
  ACTIVE:   { bg: BRAND.doneSoft,     fg: BRAND.done,     label: 'Active' },
  INACTIVE: { bg: BRAND.inactiveSoft, fg: BRAND.inactive, label: 'Inactive' },
  PENDING:  { bg: BRAND.amberSoft,    fg: BRAND.amber,    label: 'Pending' },
};

/* ═══════════════════════════════════════════════════════════════════
   Animation helpers
   ═══════════════════════════════════════════════════════════════════ */
const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

/* Count-up: animates a number from 0 → value on mount / value change */
const useCountUp = (value, duration = 900) => {
  const target = Number(value) || 0;
  const [display, setDisplay] = React.useState(prefersReducedMotion() ? target : 0);
  React.useEffect(() => {
    if (prefersReducedMotion()) { setDisplay(target); return undefined; }
    let raf; const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplay(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  const isFloat = !Number.isInteger(target);
  return isFloat ? display.toFixed(1) : Math.round(display).toLocaleString();
};

const AnimatedNumber = ({ value }) => {
  const text = useCountUp(value);
  return <>{text}</>;
};

/* ═══════════════════════════════════════════════════════════════════
   Small building blocks
   ═══════════════════════════════════════════════════════════════════ */
const StatusBadge = ({ status }) => {
  const s = EMP_STATUS[status] || EMP_STATUS.PENDING;
  return (
    <Box component="span" sx={{
      display: 'inline-flex', alignItems: 'center',
      px: 1.1, height: 22, borderRadius: 999,
      bgcolor: s.bg, color: s.fg,
      fontSize: '0.66rem', fontWeight: 700, fontFamily: FONT,
    }}>
      {s.label}
    </Box>
  );
};

/* Tiny SVG sparkline built from ov.trend — draws itself in on mount */
const Sparkline = ({ data = [], dataKey, color = BRAND.sage, w = 84, h = 20 }) => {
  const vals = data.map((d) => Number(d?.[dataKey]) || 0);
  if (vals.length < 2) return <Box sx={{ height: h }} />;
  const max = Math.max(...vals, 1);
  const min = Math.min(...vals, 0);
  const span = Math.max(max - min, 1);
  const pts = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * (w - 4) + 2;
    const y = h - 3 - ((v - min) / span) * (h - 6);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <Box component="span" sx={{
      display: 'block',
      '@keyframes sparkDraw': { from: { strokeDashoffset: 100 }, to: { strokeDashoffset: 0 } },
      '& polyline': { animation: 'sparkDraw 1s 0.25s ease-out both' },
      '@media (prefers-reduced-motion: reduce)': { '& polyline': { animation: 'none' } },
    }}>
      <svg width={w} height={h} style={{ display: 'block' }}>
        <polyline points={pts} pathLength="100" strokeDasharray="100" fill="none"
          stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Box>
  );
};

/* Bento tile — col span responsive; accent = pine gradient variant */
const Tile = ({ span = 1, accent = false, children, sx }) => (
  <Box sx={{
    gridColumn: {
      xs: `span ${Math.min(span, 2)}`,
      md: `span ${span}`,
    },
    bgcolor: accent ? 'transparent' : BRAND.surface,
    background: accent ? PINE_GRADIENT : undefined,
    border: accent ? 'none' : `1px solid ${BRAND.border}`,
    borderRadius: '16px',
    p: { xs: 1.75, sm: 2, md: 2.25 },
    boxShadow: TILE_SHADOW,
    minWidth: 0,
    overflow: 'hidden',
    transition: 'transform 0.25s cubic-bezier(0.22,1,0.36,1), box-shadow 0.25s ease, border-color 0.18s ease',
    '&:hover': {
      transform: 'translateY(-3px)',
      boxShadow: TILE_SHADOW_HOVER,
      borderColor: accent ? undefined : BRAND.sage,
    },
    '@media (prefers-reduced-motion: reduce)': {
      transition: 'none',
      '&:hover': { transform: 'none' },
    },
    ...sx,
  }}>
    {children}
  </Box>
);

const TileTitle = ({ children, right }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: { xs: 1.25, sm: 1.75 }, gap: 1 }}>
    <Box sx={{ display: 'flex', gap: 1.1, alignItems: 'center', minWidth: 0 }}>
      <Box sx={{ width: 4, height: 17, borderRadius: '4px', bgcolor: BRAND.sage, flexShrink: 0 }} />
      <Typography sx={{
        fontWeight: 700, fontSize: { xs: '0.85rem', sm: '0.92rem' },
        color: BRAND.ink, fontFamily: FONT,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {children}
      </Typography>
    </Box>
    {right}
  </Box>
);

/* KPI sparkline tile */
const KpiTile = ({ label, value, suffix = '', spark, sparkKey, sparkColor, accent = false, icon }) => (
  <Tile span={1} accent={accent}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{
          fontSize: '0.64rem', fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.05em', fontFamily: FONT,
          color: accent ? 'rgba(255,255,255,0.5)' : BRAND.muted,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {label}
        </Typography>
        <Typography sx={{
          fontSize: { xs: '1.55rem', sm: '1.8rem' }, fontWeight: 800,
          lineHeight: 1.15, mt: 0.25, fontFamily: FONT, letterSpacing: '-0.02em',
          color: accent ? '#fff' : BRAND.ink,
        }}>
          {typeof value === 'number' ? <AnimatedNumber value={value} /> : value}
          {suffix && (
            <Box component="span" sx={{
              fontSize: '0.85rem', fontWeight: 700, ml: 0.25,
              color: accent ? 'rgba(255,255,255,0.55)' : BRAND.muted,
            }}>{suffix}</Box>
          )}
        </Typography>
      </Box>
      {icon && (
        <Box sx={{
          width: 34, height: 34, borderRadius: '10px', flexShrink: 0,
          bgcolor: accent ? 'rgba(127,158,126,0.18)' : BRAND.sageSoft,
          color: accent ? BRAND.sage : BRAND.sageText,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          '& svg': { fontSize: 18 },
        }}>
          {icon}
        </Box>
      )}
    </Box>
    <Box sx={{ mt: 0.75 }}>
      {spark?.length >= 2
        ? <Sparkline data={spark} dataKey={sparkKey} color={sparkColor || (accent ? BRAND.sage : BRAND.sage)} />
        : <Box sx={{ height: 20 }} />}
    </Box>
  </Tile>
);

/* Progress row (funnel / status / skills) — fill animates in with stagger */
const ProgressRow = ({ label, count, pct, color, countSuffix = '', index = 0 }) => (
  <Box sx={{ mb: 1.4, '&:last-of-type': { mb: 0 } }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, gap: 0.75, alignItems: 'baseline' }}>
      <Typography sx={{
        fontWeight: 600, color: BRAND.muted, fontFamily: FONT,
        fontSize: { xs: '0.74rem', sm: '0.8rem' },
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{label}</Typography>
      <Box sx={{ display: 'flex', gap: 0.9, alignItems: 'baseline', flexShrink: 0 }}>
        <Typography sx={{ fontWeight: 800, color: BRAND.ink, fontFamily: FONT, fontSize: { xs: '0.74rem', sm: '0.8rem' } }}>
          {count}{countSuffix}
        </Typography>
        <Typography sx={{ color: BRAND.muted, fontWeight: 700, fontFamily: FONT, fontSize: '0.66rem', minWidth: 30, textAlign: 'right' }}>
          {pct}%
        </Typography>
      </Box>
    </Box>
    <Box sx={{ height: 8, borderRadius: 999, bgcolor: '#F0F2ED', overflow: 'hidden' }}>
      <Box sx={{
        height: '100%', borderRadius: 999, bgcolor: color,
        width: `${Math.min(pct ?? 0, 100)}%`,
        transformOrigin: 'left center',
        '@keyframes barGrow': { from: { transform: 'scaleX(0)' }, to: { transform: 'scaleX(1)' } },
        animation: 'barGrow 0.85s cubic-bezier(0.22,1,0.36,1) both',
        animationDelay: `${0.15 + index * 0.09}s`,
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
      }} />
    </Box>
  </Box>
);

/* Recharts tooltip — brand-styled */
const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <Box sx={{
      bgcolor: BRAND.surface, border: `1px solid ${BRAND.border}`, borderRadius: '10px',
      boxShadow: '0 8px 24px rgba(2,33,36,0.12)', p: 1.25, fontFamily: FONT,
    }}>
      {label != null && (
        <Typography sx={{ fontWeight: 700, fontSize: '0.74rem', color: BRAND.ink, mb: 0.5, fontFamily: FONT }}>{label}</Typography>
      )}
      {payload.map((p, i) => (
        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '2px', bgcolor: p.color || p.fill, flexShrink: 0 }} />
          <Typography sx={{ fontSize: '0.72rem', color: BRAND.muted, fontFamily: FONT }}>
            {p.name}: <Box component="span" sx={{ fontWeight: 800, color: BRAND.ink }}>{p.value}</Box>
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

const EmptyState = ({ label = 'No data yet', h = 160 }) => (
  <Box sx={{ height: h, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
    <Box sx={{ width: 44, height: 44, borderRadius: '50%', bgcolor: BRAND.sageSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <AssessmentIcon sx={{ fontSize: 22, color: BRAND.sage }} />
    </Box>
    <Typography sx={{ color: BRAND.muted, fontSize: '0.8rem', fontFamily: FONT }}>{label}</Typography>
  </Box>
);

const SkeletonTiles = ({ spans = [1, 1, 1, 1, 2, 2] }) => (
  <>
    {spans.map((s, i) => (
      <Box key={i} sx={{ gridColumn: { xs: `span ${Math.min(s, 2)}`, md: `span ${s}` } }}>
        <Skeleton variant="rounded" height={s > 1 ? 240 : 110} sx={{ borderRadius: '16px' }} />
      </Box>
    ))}
  </>
);

/* ═══════════════════════════════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════════════════════════════ */
const AnalyticsInner = () => {
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  const [section, setSection] = useState('overview');
  const [range, setRange] = useState('all');
  const [exportAnchor, setExportAnchor] = useState(null);

  const {
    overview, loadingOv,
    applicants, loadingAp,
    jobs, loadingJb,
    employers, loadingEmp,
  } = useCompanyAnalytics(range);

  const handleExport = async (fmt) => {
    setExportAnchor(null);
    try {
      const res = fmt === 'pdf'
        ? await analyticsService.exportPDF(range)
        : await analyticsService.exportCSV(range);
      const mimeType = fmt === 'pdf' ? 'application/pdf' : 'text/csv';
      const blob = res.data;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-report-${range}.${fmt}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      enqueueSnackbar(`Report exported as ${fmt.toUpperCase()}`, { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(err?.friendlyMessage || err?.message || 'Export failed.', { variant: 'error' });
    }
  };

  const chartH = isMobile ? 200 : isTablet ? 230 : 250;

  const ov = overview || {};
  const ap = applicants || {};
  const jb = jobs || {};
  const emp = employers || {};

  const ovCards = ov.statsCards || {};
  const apCards = ap.statsCards || {};
  const jbCards = jb.statsCards || {};
  const empCards = emp.statsCards || {};

  const totalEmployers = empCards.total_employers ?? 0;
  const totalJobsPosted = ovCards.total_jobs_posted ?? 0;

  const empStatusData = [
    { name: 'Active',   value: empCards.active_employers   ?? 0, color: BRAND.done },
    { name: 'Inactive', value: empCards.inactive_employers ?? 0, color: BRAND.inactive },
    { name: 'Pending',  value: empCards.pending_employers  ?? 0, color: BRAND.amber },
  ].filter((d) => d.value > 0);

  const show = (id) => section === id;

  /* Initial full-page skeleton */
  if (loadingOv && loadingAp && loadingJb && loadingEmp && !overview) return (
    <Box sx={{ bgcolor: BRAND.bg, minHeight: '100%', p: { xs: 1.5, sm: 2, md: 3, lg: 4 }, maxWidth: 1440, mx: 'auto' }}>
      <Skeleton variant="text" width="40%" height={44} sx={{ mb: 2, maxWidth: 320 }} />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4,1fr)' }, gap: 1.75, mb: 2 }}>
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} variant="rounded" height={110} sx={{ borderRadius: '16px' }} />)}
      </Box>
      <Skeleton variant="rounded" height={300} sx={{ borderRadius: '16px' }} />
    </Box>
  );

  return (
    <Box className="page-fade-in" sx={{
      bgcolor: BRAND.bg, minHeight: '100%', width: '100%',
      maxWidth: 1440, mx: 'auto',
      p: { xs: 1.5, sm: 2, md: 3, lg: 4 },
      fontFamily: FONT,
      '& .MuiTypography-root, & .MuiButton-root, & .MuiMenuItem-root': { fontFamily: FONT },
    }}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <Box sx={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: { xs: 'stretch', md: 'center' },
        flexDirection: { xs: 'column', md: 'row' },
        gap: { xs: 1.25, md: 2 }, mb: { xs: 1.75, md: 2.25 },
      }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography component="h1" sx={{
            fontWeight: 700, color: BRAND.ink, letterSpacing: '-0.02em', lineHeight: 1.15,
            fontSize: { xs: '1.3rem', sm: '1.45rem', md: '1.6rem' },
          }}>
            Analytics &amp; Reports
          </Typography>
          <Typography sx={{ color: BRAND.muted, mt: 0.5, fontSize: { xs: '0.82rem', sm: '0.9rem' }, fontWeight: 500 }}>
            Live view across <Box component="span" sx={{ color: BRAND.sageText, fontWeight: 700 }}>{totalJobsPosted} job{totalJobsPosted === 1 ? '' : 's'}</Box>
            {' · '}{(ovCards.total_applications ?? 0)} application{(ovCards.total_applications ?? 0) === 1 ? '' : 's'}
            {' · '}{totalEmployers} employer{totalEmployers === 1 ? '' : 's'}
            {' · '}{RANGE_LABEL[range]}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Range pills */}
          <Box sx={{ display: 'flex', gap: 0.6 }}>
            {RANGE_PILLS.map((r) => {
              const on = range === r.v;
              return (
                <Box key={r.v} onClick={() => setRange(r.v)} role="button" tabIndex={0}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setRange(r.v)}
                  sx={{
                    cursor: 'pointer', userSelect: 'none', px: 1.4, py: 0.55, borderRadius: 999,
                    fontSize: '0.72rem', fontWeight: on ? 700 : 600, fontFamily: FONT,
                    bgcolor: on ? BRAND.sageSoft : BRAND.surface,
                    color: on ? BRAND.sageText : BRAND.muted,
                    border: `1px solid ${on ? BRAND.sage : BRAND.borderStrong}`,
                    transition: 'all 0.16s ease',
                    '&:hover': { borderColor: BRAND.sage },
                  }}
                >{r.l}</Box>
              );
            })}
          </Box>
          <Button variant="contained" disableElevation startIcon={<DownloadIcon sx={{ fontSize: 17 }} />}
            onClick={(e) => setExportAnchor(e.currentTarget)}
            sx={{
              textTransform: 'none', fontWeight: 700, borderRadius: '12px',
              px: 2, py: 0.85, fontSize: '0.84rem',
              bgcolor: BRAND.navy, color: '#fff',
              '&:hover': { bgcolor: BRAND.navyDark },
            }}>
            Export
          </Button>
          <Menu anchorEl={exportAnchor} open={Boolean(exportAnchor)} onClose={() => setExportAnchor(null)}
            slotProps={{ paper: { sx: {
              borderRadius: '12px', border: `1px solid ${BRAND.border}`,
              boxShadow: '0 10px 36px rgba(2,33,36,0.14)', mt: 0.5, p: 0.5, minWidth: 160,
              '& .MuiMenuItem-root': { borderRadius: '8px', fontSize: '0.85rem', color: BRAND.ink, fontFamily: FONT, '&:hover': { bgcolor: BRAND.sageSoft } },
            } } }}>
            <MenuItem onClick={() => handleExport('pdf')}><PdfIcon fontSize="small" sx={{ mr: 1, color: BRAND.sageText }} /> Export as PDF</MenuItem>
            <MenuItem onClick={() => handleExport('csv')}><CsvIcon fontSize="small" sx={{ mr: 1, color: BRAND.sageText }} /> Export as CSV</MenuItem>
          </Menu>
        </Box>
      </Box>

      {/* ── Section pills ──────────────────────────────────────────── */}
      <Box sx={{
        display: 'flex', gap: 0.75, mb: { xs: 1.75, md: 2 },
        flexWrap: { xs: 'nowrap', sm: 'wrap' },
        overflowX: { xs: 'auto', sm: 'visible' }, pb: { xs: 0.5, sm: 0 },
        '&::-webkit-scrollbar': { display: 'none' },
      }}>
        {SECTIONS.map((s) => {
          const on = section === s.id;
          return (
            <Box key={s.id} onClick={() => setSection(s.id)} role="button" tabIndex={0}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSection(s.id)}
              sx={{
                cursor: 'pointer', userSelect: 'none', flexShrink: 0,
                px: 1.6, py: 0.7, borderRadius: 999,
                fontSize: '0.8rem', fontWeight: on ? 700 : 600, fontFamily: FONT,
                bgcolor: on ? BRAND.navy : BRAND.surface,
                color: on ? '#fff' : BRAND.muted,
                border: `1px solid ${on ? BRAND.navy : BRAND.borderStrong}`,
                transition: 'all 0.16s ease',
                '&:hover': { bgcolor: on ? BRAND.navy : BRAND.bg, borderColor: on ? BRAND.navy : BRAND.muted },
              }}
            >{s.label}</Box>
          );
        })}
      </Box>

      {/* ═══ BENTO BOARD ═══════════════════════════════════════════── */}
      <Box key={`${section}-${range}`} sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' },
        gap: { xs: 1.5, sm: 1.75, md: 2 },
        '@keyframes tileIn': {
          from: { opacity: 0, transform: 'translateY(14px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        '& > *': { animation: 'tileIn 0.5s ease-out both' },
        ...Object.fromEntries(
          Array.from({ length: 16 }, (_, i) => [
            `& > *:nth-of-type(${i + 1})`,
            { animationDelay: `${i * 0.055}s` },
          ]),
        ),
        '@media (prefers-reduced-motion: reduce)': { '& > *': { animation: 'none' } },
      }}>

        {/* ── OVERVIEW group ─────────────────────────────────────── */}
        {show('overview') && (loadingOv ? <SkeletonTiles /> : (
          <>
            <KpiTile label="Jobs Posted" value={ovCards.total_jobs_posted ?? 0}
              icon={<WorkIcon />} spark={ov.trend} sparkKey="jobs" />
            <KpiTile label="Applications" value={ovCards.total_applications ?? 0}
              icon={<GroupsIcon />} spark={ov.trend} sparkKey="applications" accent />
            <KpiTile label="Active Jobs" value={ovCards.active_jobs ?? 0}
              icon={<CheckIcon />} spark={ov.trend} sparkKey="live" />
            <KpiTile label="Avg Applicants / Job" value={ovCards.avg_applicants_per_job ?? 0}
              icon={<SpeedIcon />} spark={ov.trend} sparkKey="applications" sparkColor={BRAND.amber} />

            {/* Trend — span 2 */}
            <Tile span={2}>
              <TileTitle right={
                <Box component="span" sx={{
                  fontSize: '0.66rem', fontWeight: 700, fontFamily: FONT, flexShrink: 0,
                  color: BRAND.sageText, bgcolor: BRAND.sageSoft,
                  border: `1px solid ${BRAND.border}`, borderRadius: 999, px: 1.1, py: 0.3,
                }}>{RANGE_LABEL[range]}</Box>
              }>Applications &amp; Hiring Trend</TileTitle>
              {!ov.trend?.length ? <EmptyState label="No dated activity in this range" h={chartH} /> : (
                <Box sx={{ height: chartH, minWidth: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={ov.trend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gApp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={BRAND.sage} stopOpacity={0.35} /><stop offset="95%" stopColor={BRAND.sage} stopOpacity={0} /></linearGradient>
                        <linearGradient id="gJob" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={BRAND.navy} stopOpacity={0.16} /><stop offset="95%" stopColor={BRAND.navy} stopOpacity={0} /></linearGradient>
                        <linearGradient id="gLive" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={BRAND.amber} stopOpacity={0.28} /><stop offset="95%" stopColor={BRAND.amber} stopOpacity={0} /></linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0F2ED" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: isMobile ? 9 : 11, fill: BRAND.muted, fontFamily: FONT }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: isMobile ? 9 : 11, fill: BRAND.muted, fontFamily: FONT }} axisLine={false} tickLine={false} />
                      <RTooltip content={<ChartTip />} />
                      <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: isMobile ? 10 : 12, fontFamily: FONT, fontWeight: 600 }} />
                      <Area type="monotone" dataKey="applications" name="Applications" stroke={BRAND.sage} strokeWidth={3} fill="url(#gApp)"
                        dot={{ r: 3, fill: BRAND.sage, strokeWidth: 0 }} activeDot={{ r: 5 }}
                        isAnimationActive animationDuration={1100} animationEasing="ease-out" />
                      <Area type="monotone" dataKey="jobs" name="Jobs Posted" stroke={BRAND.navy} strokeWidth={2} strokeDasharray="6 4" fill="url(#gJob)"
                        dot={{ r: 3, fill: BRAND.navy, strokeWidth: 0 }} activeDot={{ r: 5 }}
                        isAnimationActive animationDuration={1100} animationBegin={250} animationEasing="ease-out" />
                      <Area type="monotone" dataKey="live" name="Live Jobs" stroke={BRAND.amber} strokeWidth={2.5} fill="url(#gLive)"
                        dot={{ r: 3.5, fill: BRAND.amber, strokeWidth: 0 }} activeDot={{ r: 5 }}
                        isAnimationActive animationDuration={1100} animationBegin={500} animationEasing="ease-out" />
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </Tile>

            {/* Funnel */}
            <Tile span={1}>
              <TileTitle>Hiring Funnel</TileTitle>
              {!ov.funnelData?.length || ov.funnelData[0]?.count === 0
                ? <EmptyState label="No applicants in this range" h={chartH} />
                : ov.funnelData.map((s, i) => (
                  <ProgressRow key={s.stage} index={i} label={s.stage} count={(s.count || 0).toLocaleString()}
                    pct={s.rate ?? s.pct ?? 0} color={FUNNEL_COLORS[i % FUNNEL_COLORS.length]} />
                ))}
            </Tile>

            {/* Jobs by Dept pie */}
            <Tile span={1}>
              <TileTitle>Jobs by Department</TileTitle>
              {!ov.jobsByDept?.length ? <EmptyState h={chartH} /> : (
                <Box sx={{ height: chartH, minWidth: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                                            <Pie data={ov.jobsByDept} dataKey="jobs" nameKey="name" cx="50%" cy="50%"
                        outerRadius={isMobile ? 48 : 58} label={(e) => e.jobs} stroke="none"
                        isAnimationActive animationDuration={1000} animationEasing="ease-out">
                        {ov.jobsByDept.map((_, i) => <Cell key={i} fill={CHART[i % CHART.length]} />)}
                      </Pie>
                      <RTooltip content={<ChartTip />} position={{ x: 4, y: 4 }} wrapperStyle={{ zIndex: 5, pointerEvents: 'none' }} />
                      <Legend verticalAlign="bottom" iconSize={9} wrapperStyle={{ fontSize: isMobile ? 10 : 11, fontFamily: FONT }} />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </Tile>

            {/* Dept grouped bars — span 4 */}
            <Tile span={4}>
              <TileTitle>Jobs &amp; Applicants by Department</TileTitle>
              {!ov.deptData?.length ? <EmptyState h={chartH} /> : (
                <Box sx={{ height: chartH, minWidth: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ov.deptData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} barGap={4}>
                      <XAxis dataKey="name" tick={{ fontSize: isMobile ? 8 : 10, fill: BRAND.muted, fontFamily: FONT }} axisLine={false} tickLine={false}
                        interval={0} angle={-35} textAnchor="end" height={80} />
                      <YAxis tick={{ fontSize: isMobile ? 9 : 11, fill: BRAND.muted, fontFamily: FONT }} axisLine={false} tickLine={false} />
                      <RTooltip cursor={{ fill: 'rgba(127,158,126,0.08)' }} content={<ChartTip />} />
                      <Legend wrapperStyle={{ fontSize: isMobile ? 10 : 12, fontFamily: FONT }} />
                      <Bar dataKey="jobs" name="Jobs" fill={BRAND.navy} radius={[5, 5, 0, 0]} maxBarSize={34} isAnimationActive animationDuration={950} animationEasing="ease-out" />
                      <Bar dataKey="applicants" name="Applicants" fill={BRAND.sage} radius={[5, 5, 0, 0]} maxBarSize={34} isAnimationActive animationDuration={950} animationBegin={200} animationEasing="ease-out" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </Tile>
          </>
        ))}

        {/* ── JOBS & DEPARTMENTS group ───────────────────────────── */}
        {show('jobs') && (loadingJb ? <SkeletonTiles /> : (
          <>
            <KpiTile label="Active Jobs" value={jbCards.active_jobs ?? 0} icon={<CheckIcon />} />
            <KpiTile label="Total Postings" value={jbCards.total_postings ?? 0} icon={<WorkIcon />} accent />
            <KpiTile label="Departments" value={jbCards.departments ?? 0} icon={<DeptIcon />} />
            <KpiTile label="Job Fill Rate" value={jbCards.job_fill_rate ?? 0} suffix="%" icon={<TrophyIcon />} />

            <Tile span={2}>
              <TileTitle>Applicants by Department</TileTitle>
              {!jb.deptData?.length ? <EmptyState h={chartH} /> : (
                <Box sx={{ height: chartH, minWidth: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={jb.deptData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                      <XAxis dataKey="name" tick={{ fontSize: isMobile ? 8 : 10, fill: BRAND.muted, fontFamily: FONT }} axisLine={false} tickLine={false}
                        interval={0} angle={-35} textAnchor="end" height={80} />
                      <YAxis tick={{ fontSize: isMobile ? 9 : 11, fill: BRAND.muted, fontFamily: FONT }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <RTooltip cursor={{ fill: 'rgba(127,158,126,0.08)' }} content={<ChartTip />} />
                      <Bar dataKey="applicants" name="Applicants" radius={[6, 6, 0, 0]} maxBarSize={40} isAnimationActive animationDuration={950} animationEasing="ease-out">
                        {jb.deptData.map((_, i) => <Cell key={i} fill={CHART[i % CHART.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </Tile>

            <Tile span={1}>
              <TileTitle>Quick Stats</TileTitle>
              {[
                { k: 'Total Jobs', v: jb.quickStats?.total_jobs ?? 0 },
                { k: 'Active Jobs', v: jb.quickStats?.active_jobs ?? 0 },
                { k: 'Pending Approval', v: jb.quickStats?.pending_approval ?? 0 },
                { k: 'Flagged Jobs', v: jb.quickStats?.flagged_jobs ?? 0 },
                { k: 'Total Applicants', v: (jb.quickStats?.total_applicants ?? 0).toLocaleString() },
                { k: 'Busiest Dept', v: jb.quickStats?.busiest_dept ?? '—' },
              ].map((r) => (
                <Box key={r.k} sx={{
                  display: 'flex', justifyContent: 'space-between', gap: 1, py: 0.8,
                  borderBottom: `1px solid ${BRAND.border}`, '&:last-of-type': { borderBottom: 0 },
                }}>
                  <Typography sx={{ color: BRAND.muted, fontSize: '0.78rem', fontFamily: FONT }}>{r.k}</Typography>
                  <Typography sx={{
                    fontWeight: 700, color: BRAND.ink, fontSize: '0.78rem', fontFamily: FONT,
                    textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '55%',
                  }}>{r.v}</Typography>
                </Box>
              ))}
            </Tile>

            <Tile span={1}>
              <TileTitle>Jobs by Status</TileTitle>
              {!jb.statusData?.length ? <EmptyState h={chartH} /> : jb.statusData.map((s, i) => (
                <ProgressRow key={s.stage} index={i} label={s.stage}
                  count={s.count} countSuffix={` job${s.count === 1 ? '' : 's'}`}
                  pct={s.rate} color={BRAND.sage} />
              ))}
            </Tile>
          </>
        ))}

        {/* ── APPLICANTS group ───────────────────────────────────── */}
        {show('applicants') && (loadingAp ? <SkeletonTiles /> : (
          <>
            <KpiTile label="Total Applications" value={apCards.total_applications ?? 0} icon={<GroupsIcon />} />
            <KpiTile label="Candidates in Pool" value={apCards.candidates_in_pool ?? 0} icon={<PeopleIcon />} />
            <KpiTile label="Avg Candidate Score" value={apCards.avg_candidate_score ?? 0} suffix="/100" icon={<AssessmentIcon />} accent />
            <KpiTile label="Shortlist Rate" value={apCards.shortlist_rate ?? 0} suffix="%" icon={<TrophyIcon />} />

            <Tile span={2}>
              <TileTitle right={
                <Box component="span" sx={{
                  fontSize: '0.66rem', fontWeight: 700, fontFamily: FONT, flexShrink: 0,
                  color: BRAND.sageText, bgcolor: BRAND.sageSoft,
                  border: `1px solid ${BRAND.border}`, borderRadius: 999, px: 1.1, py: 0.3,
                }}>{apCards.candidates_in_pool ?? 0} candidate{(apCards.candidates_in_pool ?? 0) === 1 ? '' : 's'}</Box>
              }>Candidate Score Distribution</TileTitle>
              {!ap.scoreDist?.some((b) => b.candidates > 0) ? <EmptyState label="No candidates in this range" h={chartH} /> : (
                <Box sx={{ height: chartH, minWidth: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ap.scoreDist} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                      <XAxis dataKey="range" tick={{ fontSize: isMobile ? 9 : 11, fill: BRAND.muted, fontFamily: FONT }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: isMobile ? 9 : 11, fill: BRAND.muted, fontFamily: FONT }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <RTooltip cursor={{ fill: 'rgba(127,158,126,0.08)' }} content={<ChartTip />} />
                      <Bar dataKey="candidates" name="Candidates" radius={[6, 6, 0, 0]} maxBarSize={56} isAnimationActive animationDuration={950} animationEasing="ease-out">
                        {(ap.scoreDist || []).map((_, i) => <Cell key={i} fill={[BRAND.done, BRAND.sage, BRAND.sageText, BRAND.amber, BRAND.err][i % 5]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </Tile>

            <Tile span={1}>
              <TileTitle>Top Candidate Skills</TileTitle>
              {!ap.topSkills?.length ? <EmptyState label="No skills data" h={chartH} /> : ap.topSkills.map((s, i) => (
                <ProgressRow key={s.skill} index={i} label={s.skill}
                  count={s.count} countSuffix={` cand.`}
                  pct={s.pct} color={BRAND.sage} />
              ))}
            </Tile>

            <Tile span={1}>
              <TileTitle>Applicants by Department</TileTitle>
              {!ap.deptData?.length ? <EmptyState h={chartH} /> : (
                <Box sx={{ height: chartH, minWidth: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ap.deptData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 9, fill: BRAND.muted, fontFamily: FONT }} axisLine={false} tickLine={false}
                        interval={0} angle={-35} textAnchor="end" height={80} />
                      <YAxis tick={{ fontSize: isMobile ? 9 : 11, fill: BRAND.muted, fontFamily: FONT }} axisLine={false} tickLine={false} />
                      <RTooltip cursor={{ fill: 'rgba(127,158,126,0.08)' }} content={<ChartTip />} />
                      <Bar dataKey="applicants" name="Applicants" radius={[6, 6, 0, 0]} maxBarSize={40} isAnimationActive animationDuration={950} animationEasing="ease-out">
                        {(ap.deptData || []).map((_, i) => <Cell key={i} fill={CHART[i % CHART.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </Tile>
          </>
        ))}

        {/* ── EMPLOYERS group ────────────────────────────────────── */}
        {show('employers') && (loadingEmp ? <SkeletonTiles /> : (
          <>
            <KpiTile label="Total Employers" value={empCards.total_employers ?? 0} icon={<PeopleIcon />} accent />
            <KpiTile label="Active Employers" value={empCards.active_employers ?? 0} icon={<CheckIcon />} />
            <KpiTile label="Inactive" value={empCards.inactive_employers ?? 0} icon={<WorkIcon />} />
            <KpiTile label="Pending" value={empCards.pending_employers ?? 0} icon={<SpeedIcon />} />

            <Tile span={2} sx={{ p: { xs: 0, sm: 0, md: 0 }, overflow: 'hidden' }}>
              <Box sx={{ p: { xs: 1.75, sm: 2, md: 2.25 }, pb: 0 }}>
                <TileTitle right={
                  <Box component="span" sx={{
                    fontSize: '0.66rem', fontWeight: 700, fontFamily: FONT, flexShrink: 0,
                    color: BRAND.sageText, bgcolor: BRAND.sageSoft,
                    border: `1px solid ${BRAND.border}`, borderRadius: 999, px: 1.1, py: 0.3,
                  }}>{emp.workload?.length ?? 0}</Box>
                }>Employer Performance Leaderboard</TileTitle>
              </Box>
              {!emp.workload?.length ? <EmptyState label="No employers yet" h={200} /> : (
                <TableContainer sx={{ scrollbarWidth: 'thin', overflowX: 'auto', maxWidth: '100%' }}>
                  <Table size="small" sx={{
                    minWidth: 420,
                    '& tbody tr:hover': { backgroundColor: `${BRAND.sageSoft} !important` },
                    '& tbody td': { borderBottom: `1px solid ${BRAND.border}` },
                    '& tbody tr:last-child td': { borderBottom: 0 },
                    '& th, & td': { px: { xs: 1.25, sm: 2 }, py: 1, fontFamily: FONT },
                  }}>
                    <TableHead>
                      <TableRow sx={{
                        bgcolor: BRAND.navy,
                        '& th': {
                          color: 'rgba(255,255,255,0.85)', fontWeight: 700,
                          fontSize: '0.62rem', letterSpacing: '0.06em',
                          textTransform: 'uppercase', borderBottom: 'none',
                        },
                      }}>
                        <TableCell>Employer</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="center">Active Jobs</TableCell>
                        <TableCell align="center">Applicants</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {emp.workload.map((e) => (
                        <TableRow key={e.id}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                              <Avatar src={e.photo || undefined} variant="rounded" sx={{
                                bgcolor: BRAND.navy, color: BRAND.sage,
                                width: 30, height: 30, fontSize: 11, fontWeight: 700, borderRadius: '8px',
                              }}>{e.avatar}</Avatar>
                              <Box sx={{ minWidth: 0 }}>
                                <Typography sx={{ fontWeight: 700, color: BRAND.ink, fontSize: '0.8rem', fontFamily: FONT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.name}</Typography>
                                <Typography sx={{ color: BRAND.muted, fontSize: '0.68rem', fontFamily: FONT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.role}</Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell><StatusBadge status={e.status} /></TableCell>
                          <TableCell align="center">
                            <Typography sx={{ fontWeight: 800, color: BRAND.ink, fontSize: '0.8rem', fontFamily: FONT }}>{e.jobs}</Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography sx={{ fontWeight: 800, color: BRAND.sageText, fontSize: '0.8rem', fontFamily: FONT }}>{(e.applicants || 0).toLocaleString()}</Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Tile>

            <Tile span={2}>
              <TileTitle>Employers by Status</TileTitle>
              {!empStatusData.length ? <EmptyState label="No employers yet" h={chartH} /> : (
                <Box sx={{ height: chartH, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={empStatusData} dataKey="value" nameKey="name" cx="50%" cy="46%"
                        innerRadius={isMobile ? 40 : 56}
                        outerRadius={isMobile ? 62 : 84}
                        paddingAngle={3} stroke="none"
                        isAnimationActive animationDuration={1000} animationEasing="ease-out">
                        {empStatusData.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <RTooltip content={<ChartTip />} position={{ x: 4, y: 4 }} wrapperStyle={{ zIndex: 5, pointerEvents: 'none' }} />
                      <Legend verticalAlign="bottom" iconSize={9} wrapperStyle={{ fontSize: isMobile ? 10 : 11, fontFamily: FONT }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <Box sx={{ position: 'absolute', top: '42%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none' }}>
                    <Typography sx={{ fontSize: { xs: '1.2rem', sm: '1.6rem' }, fontWeight: 800, color: BRAND.ink, lineHeight: 1, fontFamily: FONT }}>
                      <AnimatedNumber value={empCards.total_employers ?? 0} />
                    </Typography>
                    <Typography sx={{ fontSize: '0.58rem', color: BRAND.muted, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', fontFamily: FONT }}>
                      Total
                    </Typography>
                  </Box>
                </Box>
              )}
            </Tile>
          </>
        ))}
      </Box>
    </Box>
  );
};

/* Scoped pine/sage MUI theme — fully replaces the app-wide blue theme for
   this subtree so no MUI default (ripples, focus rings, Skeleton tint,
   menu selection, dividers) can leak navy. */
const Analytics = () => (
  <ThemeProvider theme={publicSageTheme}>
    <AnalyticsInner />
  </ThemeProvider>
);

export default Analytics;