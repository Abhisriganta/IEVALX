import React, { useMemo, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Chip, Stack, Divider, Card, CardContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Dialog, DialogContent, DialogActions, IconButton,
  TextField, MenuItem, Skeleton, Alert, Radio, RadioGroup, FormControlLabel,
  useTheme, useMediaQuery,
} from '@mui/material';
import {
  Verified, TrendingUp, CalendarMonth, CreditCard, Download,
  Bolt, WorkspacePremium, EmojiEvents, Diamond as DiamondIcon,
  AutoAwesome, Cancel, CheckCircle, Close, Delete, Add,
  Assessment, Group, VideoCall, Description, Analytics,
  Groups, RecordVoiceOver, School, Shield, Api,
  ArrowForward, Warning, Star, Print,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';

/* ─── Design tokens ─────────────────────────────────────────────────────── */
const T = {
  primary: '#7F9E7E', primaryDark: '#5E815D', primarySoft: '#EDF3EC',
  textDark: '#101210', textMid: '#55584F', textLight: '#7A7E76',
  bg: '#F6F8F3', card: '#FFFFFF', border: '#E7EAE3', borderSoft: '#F0F2ED',
  accent: '#7F9E7E', accentSoft: '#F6ECDF',
  success: '#5E815D', successBg: '#EDF3EC',
  warn: '#A35A2D', warnBg: '#F6ECDF', warnTx: '#8A4B26',
  danger: '#B4462F', dangerBg: '#FBECEA',
  neutralBg: '#E8EFEF',
};

const FONT = "'Jost','DM Sans',sans-serif";

/* ─── Shared style constants ────────────────────────────────────────────── */
const CARD_SHADOW = '0 1px 3px rgba(2,33,36,0.04), 0 4px 12px rgba(2,33,36,0.05)';
const CARD_HOVER  = '0 4px 8px rgba(2,33,36,0.06), 0 12px 28px rgba(2,33,36,0.09)';
const DIALOG_SHADOW = '0 20px 60px rgba(2,33,36,0.20)';
const BTN_SHADOW = `0 2px 6px ${T.primary}30, 0 4px 12px ${T.primary}40`;
const BTN_SHADOW_HOVER = `0 4px 10px ${T.primary}40, 0 8px 22px ${T.primary}55`;

const inputSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '10px', bgcolor: T.card,
    color: T.textDark, fontFamily: FONT,
    '& fieldset': { borderColor: T.border },
    '&:hover fieldset': { borderColor: T.accent },
    '&.Mui-focused fieldset': { borderColor: T.primary, borderWidth: 2 },
  },
  '& input::placeholder, & textarea::placeholder': { color: T.textLight, opacity: 0.9 },
  '& .MuiInputLabel-root': { color: T.textLight, fontFamily: FONT },
  '& .MuiInputLabel-root.Mui-focused': { color: T.primary },
  '& .MuiSelect-icon': { color: T.textMid },
};

const BTN_PRIMARY_SX = {
  textTransform: 'none', fontWeight: 700, borderRadius: '10px',
  bgcolor: T.primary, color: '#fff',
  boxShadow: BTN_SHADOW,
  transition: 'box-shadow .2s ease, background-color .2s ease',
  '&:hover': { bgcolor: T.primaryDark, boxShadow: BTN_SHADOW_HOVER },
};

const BTN_OUTLINED_SX = {
  textTransform: 'none', fontWeight: 700, borderRadius: '10px',
  borderColor: T.primary, color: T.primary,
  '&:hover': { borderColor: T.primaryDark, bgcolor: T.primarySoft },
};

const BTN_TEXT_SX = {
  textTransform: 'none', fontWeight: 600, color: T.textMid,
  fontSize: { xs: '0.78rem', sm: '0.86rem' },
};

/* ─── Plan tier metadata ────────────────────────────────────────────────── */
const PLAN_META = {
  silver:   { color: '#A8ADA8', tint: '#E8EFEF' },
  gold:     { color: '#A35A2D', tint: '#F6ECDF' },
  platinum: { color: '#7F9E7E', tint: '#EDF3EC' },
  diamond:  { color: '#5E815D', tint: '#EAF2E9' },
  ruby:     { color: '#B4462F', tint: '#FBECEA' },
};

const iconMap = {
  Bolt: <Bolt />, WorkspacePremium: <WorkspacePremium />, EmojiEvents: <EmojiEvents />,
  DiamondIcon: <DiamondIcon />, AutoAwesome: <AutoAwesome />,
  Assessment: <Assessment />, Group: <Group />, VideoCall: <VideoCall />,
  Description: <Description />, Analytics: <Analytics />, Groups: <Groups />,
  RecordVoiceOver: <RecordVoiceOver />, School: <School />, Shield: <Shield />, Api: <Api />,
};

const iconColorMap = {
  Assessment: T.primary, Description: T.primary, Groups: T.danger,
  School: T.warn, Shield: T.primary, Api: T.primary, Group: T.primary,
  VideoCall: T.warn, Analytics: T.danger, RecordVoiceOver: T.primary,
};

/* ─── Data (unchanged) ──────────────────────────────────────────────────── */
const currentPlanData = {
  planName: 'Platinum Plan', planCode: 'platinum', status: 'active',
  renewalDate: '2026-08-08', daysRemaining: 15, monthlyPrice: 999,
  billingCycle: 'monthly', autoRenew: true,
  usage: [
    { label: 'AI Assessments',     used: 245, limit: 500, icon: 'Assessment' },
    { label: 'Interview Rounds',   used: 78,  limit: 200, icon: 'VideoCall' },
    { label: 'Live Interviews',    used: 32,  limit: 100, icon: 'Groups' },
    { label: 'Document Interviews',used: 15,  limit: 50,  icon: 'Description' },
  ],
};

const plans = [
  { code: 'silver', name: 'Silver', icon: 'Bolt', monthlyPrice: 199, yearlyPrice: 1990,
    tagline: 'Perfect for getting started', description: 'Essential features for small teams',
    features: [
      { name: '50 AI Assessments/month', included: true },
      { name: '20 Interview Rounds/month', included: true },
      { name: '10 Live Interviews/month', included: true },
      { name: 'Basic Analytics', included: true },
      { name: 'Email Support', included: true },
      { name: 'Advanced Reporting', included: false },
      { name: 'Priority Support', included: false },
      { name: 'API Access', included: false },
    ] },
  { code: 'gold', name: 'Gold', icon: 'WorkspacePremium', monthlyPrice: 499, yearlyPrice: 4990,
    tagline: 'Great for growing teams', description: 'Enhanced features with priority support',
    features: [
      { name: '200 AI Assessments/month', included: true },
      { name: '80 Interview Rounds/month', included: true },
      { name: '40 Live Interviews/month', included: true },
      { name: 'Advanced Analytics', included: true },
      { name: 'Priority Email Support', included: true },
      { name: 'Advanced Reporting', included: true },
      { name: 'Phone Support', included: false },
      { name: 'API Access', included: false },
    ] },
  { code: 'platinum', name: 'Platinum', icon: 'EmojiEvents', monthlyPrice: 999, yearlyPrice: 9990,
    tagline: 'Most popular choice', description: 'Comprehensive features for larger teams',
    features: [
      { name: '500 AI Assessments/month', included: true },
      { name: '200 Interview Rounds/month', included: true },
      { name: '100 Live Interviews/month', included: true },
      { name: 'Premium Analytics', included: true },
      { name: 'Priority Phone & Email', included: true },
      { name: 'Advanced Reporting', included: true },
      { name: 'Dedicated Account Manager', included: true },
      { name: 'API Access', included: false },
    ] },
  { code: 'diamond', name: 'Diamond', icon: 'DiamondIcon', monthlyPrice: 1999, yearlyPrice: 19990,
    tagline: 'For enterprise teams', description: 'Enterprise-grade solution with full features',
    features: [
      { name: 'Unlimited AI Assessments', included: true },
      { name: 'Unlimited Interview Rounds', included: true },
      { name: 'Unlimited Live Interviews', included: true },
      { name: 'Enterprise Analytics', included: true },
      { name: '24/7 Priority Support', included: true },
      { name: 'Custom Reporting', included: true },
      { name: 'Dedicated Account Manager', included: true },
      { name: 'Full API Access', included: true },
    ] },
  { code: 'ruby', name: 'Ruby', icon: 'AutoAwesome', monthlyPrice: 4999, yearlyPrice: 49990,
    tagline: 'Ultimate power & customization', description: 'White-glove enterprise experience',
    features: [
      { name: 'Everything in Diamond', included: true },
      { name: 'Custom AI Model Training', included: true },
      { name: 'On-Premise Deployment Option', included: true },
      { name: 'SLA Guarantees', included: true },
      { name: 'Custom Integrations', included: true },
      { name: 'Executive Business Reviews', included: true },
      { name: 'Dedicated Solution Architect', included: true },
      { name: 'White-Label Options', included: true },
    ] },
];

const paymentMethodsData = [
  { id: 1, type: 'Visa', last4: '4242', expiry: '12/25', isDefault: true, cardholderName: 'John Doe' },
  { id: 2, type: 'Mastercard', last4: '8888', expiry: '08/26', isDefault: false, cardholderName: 'John Doe' },
];

const billingHistoryData = [
  { id: 1, date: '2026-07-08', invoiceNumber: 'INV-2026-078', amount: 999, plan: 'Platinum', status: 'paid', method: 'Visa •••• 4242' },
  { id: 5, date: '2026-03-08', invoiceNumber: 'INV-2026-034', amount: 999, plan: 'Platinum', status: 'failed', method: 'Visa •••• 4242' },
];

const featureComparison = [
  { feature: 'AI Assessments/month',     silver: '50', gold: '200', platinum: '500', diamond: 'Unlimited', ruby: 'Unlimited', icon: 'Assessment' },
  { feature: 'Interview Rounds/month',   silver: '20', gold: '80',  platinum: '200', diamond: 'Unlimited', ruby: 'Unlimited', icon: 'Group' },
  { feature: 'Live Interviews/month',    silver: '10', gold: '40',  platinum: '100', diamond: 'Unlimited', ruby: 'Unlimited', icon: 'VideoCall' },
  { feature: 'Document Interviews',      silver: '5',  gold: '20',  platinum: '50',  diamond: 'Unlimited', ruby: 'Unlimited', icon: 'Description' },
  { feature: 'Analytics Level',          silver: 'Basic', gold: 'Advanced', platinum: 'Premium', diamond: 'Enterprise', ruby: 'Enterprise+', icon: 'Analytics' },
  { feature: 'Team Members',             silver: '5',  gold: '20',  platinum: '50',  diamond: 'Unlimited', ruby: 'Unlimited', icon: 'Groups' },
  { feature: 'Voice AI Analysis',        silver: '—',  gold: '✓',   platinum: '✓',   diamond: '✓',         ruby: '✓',         icon: 'RecordVoiceOver' },
  { feature: 'Training Resources',       silver: 'Basic', gold: 'Standard', platinum: 'Premium', diamond: 'Enterprise', ruby: 'Custom', icon: 'School' },
  { feature: 'Security & Compliance',    silver: 'Standard', gold: 'Enhanced', platinum: 'Advanced', diamond: 'Enterprise', ruby: 'Custom', icon: 'Shield' },
  { feature: 'API Access',               silver: '—',  gold: '—',   platinum: '—',   diamond: '✓',         ruby: '✓',         icon: 'Api' },
];

/* ─── Utilities ─────────────────────────────────────────────────────────── */
const formatMoney = (amt, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amt);
const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const usagePct = (used, limit) => Math.round((used / limit) * 100);

/* ─── Helper components ─────────────────────────────────────────────────── */
// 🔧 REDESIGN 1/6 — Extracted Panel, StatusPill, SectionHeader, UsageTile,
//   DialogShell helpers to reduce repetition and centralize the palette usage.

const Panel = ({ children, sx = {}, hover = false }) => (
  <Paper elevation={0} sx={{
    bgcolor: T.card, border: `1px solid ${T.border}`,
    borderRadius: { xs: '12px', md: '14px' },
    boxShadow: CARD_SHADOW,
    transition: 'box-shadow .25s ease, transform .25s cubic-bezier(0.22,1,0.36,1), border-color .18s ease',
    ...(hover && {
      '&:hover': { boxShadow: CARD_HOVER, transform: 'translateY(-3px)', borderColor: T.primary },
      '@media (prefers-reduced-motion: reduce)': { transition: 'none', '&:hover': { transform: 'none' } },
    }),
    ...sx,
  }}>
    {children}
  </Paper>
);

const StatusPill = ({ label, tone = 'success', icon }) => {
  const map = {
    success: { bg: T.successBg, tx: T.success },
    warn:    { bg: T.warnBg,    tx: T.warnTx },
    danger:  { bg: T.dangerBg,  tx: T.danger },
    neutral: { bg: T.neutralBg, tx: T.textMid },
  };
  const s = map[tone];
  return (
    <Chip icon={icon} label={label} size="small" sx={{
      bgcolor: s.bg, color: s.tx, fontWeight: 700,
      height: { xs: 20, sm: 22 },
      fontSize: { xs: '0.62rem', sm: '0.7rem' },
      borderRadius: '999px',
      boxShadow: '0 1px 2px rgba(2,33,36,0.05)',
      '& .MuiChip-icon': { color: s.tx, ml: '4px' },
    }} />
  );
};

const SectionHeader = ({ title, subtitle, action }) => (
  <Box sx={{
    mb: { xs: 1.75, md: 2.5 },
    display: 'flex', justifyContent: 'space-between',
    alignItems: { xs: 'flex-start', sm: 'flex-end' },
    flexDirection: { xs: 'column', sm: 'row' },
    gap: { xs: 1.25, sm: 1.5 },
  }}>
    <Box sx={{ display: 'flex', gap: 1.25, minWidth: 0 }}>
      <Box sx={{
        width: 4, borderRadius: '4px', bgcolor: T.primary, flexShrink: 0,
        alignSelf: 'stretch', my: 0.4,
      }} />
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{
          fontSize: { xs: '1.05rem', sm: '1.2rem', md: '1.4rem' },
          fontWeight: 700, color: T.textDark, letterSpacing: '-0.3px', lineHeight: 1.25,
          fontFamily: FONT,
        }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography sx={{
            fontSize: { xs: '0.72rem', sm: '0.82rem', md: '0.9rem' },
            color: T.textLight, mt: 0.4, fontFamily: FONT,
          }}>
            {subtitle}
          </Typography>
        )}
      </Box>
    </Box>
    {action}
  </Box>
);

const UsageTile = ({ item }) => {
  const percent = usagePct(item.used, item.limit);
  const iconColor = iconColorMap[item.icon] || T.primary;
  return (
    <Panel sx={{ p: { xs: 1.5, md: 2 } }}>
      <Stack direction="row" spacing={1} alignItems="center" mb={{ xs: 0.75, md: 1 }}>
        {React.cloneElement(iconMap[item.icon], {
          sx: { color: iconColor, fontSize: { xs: 16, md: 18 } },
        })}
        <Typography sx={{
          fontSize: { xs: '0.58rem', md: '0.66rem' },
          color: T.textLight, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.04em',
        }}>
          {item.label}
        </Typography>
      </Stack>
      <Typography sx={{
        fontSize: { xs: '1.1rem', md: '1.4rem' },
        fontWeight: 700, color: T.textDark, mb: { xs: 0.75, md: 1 }, lineHeight: 1.1,
      }}>
        {item.used}
        <Box component="span" sx={{
          fontSize: { xs: '0.68rem', md: '0.8rem' },
          color: T.textLight, fontWeight: 500,
        }}>
          {' '}/ {item.limit}
        </Box>
      </Typography>
      <Box sx={{ height: { xs: 4, md: 6 }, bgcolor: T.borderSoft, borderRadius: 999, overflow: 'hidden' }}>
        <Box sx={{
          width: `${percent}%`, height: '100%', bgcolor: T.primary,
          transition: 'width .6s ease',
        }} />
      </Box>
    </Panel>
  );
};

// 🔧 REDESIGN 3/6 — PlanCard extracted. Cleaner: flat solid icon tile (no
//   gradient), single-color CTA, subtle top-left pill badge for current/popular.
const PlanCard = ({ plan, isCurrent, isPopular, billingCycle, onUpgrade, currentPlanIndex }) => {
  const meta = PLAN_META[plan.code];
  const price = billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
  const idx = plans.findIndex(p => p.code === plan.code);
  const ctaLabel = isCurrent ? 'Current plan' : idx < currentPlanIndex ? 'Downgrade' : 'Upgrade';
  const accent = isCurrent ? T.primary : (isPopular ? T.warn : null);

  return (
    <Panel hover sx={{
      position: 'relative',
      p: { xs: 2, md: 2.5, lg: 3 },
      display: 'flex', flexDirection: 'column',
      border: `${accent ? 2 : 1}px solid ${accent || T.border}`,
    }}>
      {(isCurrent || isPopular) && (
        <Box sx={{
          position: 'absolute', top: -10, left: { xs: 12, md: 16 },
          bgcolor: isCurrent ? T.primary : T.warn,
          color: '#fff',
          fontSize: { xs: '0.56rem', md: '0.62rem' }, fontWeight: 700,
          px: 1.25, py: 0.4, borderRadius: '999px',
          letterSpacing: '0.06em', textTransform: 'uppercase',
          boxShadow: `0 2px 6px ${isCurrent ? T.primary : T.warn}55`,
        }}>
          {isCurrent ? 'Your plan' : 'Most popular'}
        </Box>
      )}

      <Stack direction="row" spacing={1.25} alignItems="center" mb={{ xs: 1.5, md: 2 }}>
        <Box sx={{
          width: { xs: 40, md: 48 }, height: { xs: 40, md: 48 },
          borderRadius: '10px', bgcolor: meta.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 3px 8px ${meta.color}55`,
        }}>
          {React.cloneElement(iconMap[plan.icon], {
            sx: { color: '#fff', fontSize: { xs: 22, md: 26 } },
          })}
        </Box>
        <Typography sx={{
          fontSize: { xs: '1.05rem', md: '1.25rem' },
          fontWeight: 700, color: T.textDark,
        }}>
          {plan.name}
        </Typography>
      </Stack>

      <Typography sx={{
        color: T.textLight,
        fontSize: { xs: '0.72rem', md: '0.82rem' },
        mb: { xs: 1.5, md: 2 },
        minHeight: { xs: 32, md: 40 },
        lineHeight: 1.5,
      }}>
        {plan.description}
      </Typography>

      <Stack direction="row" alignItems="baseline" spacing={0.5}>
        <Typography sx={{
          fontSize: { xs: '1.5rem', md: '1.85rem' },
          fontWeight: 700, color: T.textDark, letterSpacing: '-0.5px',
        }}>
          {formatMoney(price)}
        </Typography>
        <Typography sx={{ fontSize: { xs: '0.72rem', md: '0.8rem' }, color: T.textLight }}>
          /{billingCycle === 'monthly' ? 'mo' : 'yr'}
        </Typography>
      </Stack>
      {billingCycle === 'yearly' && (
        <Typography sx={{
          color: T.success, fontWeight: 700, mt: 0.25,
          fontSize: { xs: '0.62rem', md: '0.7rem' },
        }}>
          Save {formatMoney(plan.monthlyPrice * 12 - plan.yearlyPrice)}
        </Typography>
      )}

      <Stack spacing={{ xs: 0.85, md: 1.15 }} sx={{ my: { xs: 2, md: 2.5 }, flex: 1 }}>
        {plan.features.map((f, i) => (
          <Stack key={i} direction="row" spacing={0.75} alignItems="center">
            {f.included
              ? <CheckCircle sx={{ color: T.success, fontSize: { xs: 14, md: 16 }, flexShrink: 0 }} />
              : <Cancel sx={{ color: T.textLight, fontSize: { xs: 14, md: 16 }, flexShrink: 0 }} />
            }
            <Typography sx={{
              color: f.included ? T.textMid : T.textLight,
              fontSize: { xs: '0.7rem', md: '0.78rem' },
              textDecoration: f.included ? 'none' : 'line-through',
            }}>
              {f.name}
            </Typography>
          </Stack>
        ))}
      </Stack>

      <Button
        fullWidth
        variant={isCurrent ? 'outlined' : 'contained'}
        disabled={isCurrent}
        onClick={() => onUpgrade(plan)}
        endIcon={!isCurrent && <ArrowForward sx={{ fontSize: 16 }} />}
        sx={{
          textTransform: 'none', fontWeight: 700, borderRadius: '10px',
          py: { xs: 0.85, md: 1.1 },
          fontSize: { xs: '0.78rem', md: '0.86rem' },
          ...(isCurrent
            ? { borderColor: T.border, color: T.textLight, '&.Mui-disabled': { color: T.textLight, borderColor: T.border } }
            : BTN_PRIMARY_SX),
        }}
      >
        {ctaLabel}
      </Button>
    </Panel>
  );
};

// 🔧 REDESIGN 4/6 — DialogShell centralises the 4 dialogs' common frame:
//   header (typography-only, no gradient), scrollable content, footer actions.
const DialogShell = ({ open, onClose, title, subtitle, icon, iconTone, children, actions, isMobile, maxWidth = 'sm' }) => {
  /* Gradient header by tone — pine for primary, crimson for danger, brown for accent */
  const toneGradient = {
    primary: 'linear-gradient(160deg, #08302F 0%, #0E1E1D 70%, #121615 100%)',
    danger:  'linear-gradient(160deg, #4A1A12 0%, #331210 70%, #250E0B 100%)',
    accent:  'linear-gradient(160deg, #3D2A1A 0%, #2A1D12 70%, #1F1610 100%)',
  }[iconTone || 'primary'];
  const toneIcon = {
    primary: T.primary, danger: '#E8897A', accent: '#D4A574',
  }[iconTone || 'primary'];
  return (
    <Dialog open={open} onClose={onClose} maxWidth={maxWidth} fullWidth fullScreen={isMobile}
      slotProps={{ paper: { sx: {
        borderRadius: isMobile ? 0 : '18px',
        overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(2,33,36,0.22)',
        fontFamily: FONT,
      } } }}>
      {/* Rich gradient header — brand dialog signature */}
      <Box sx={{
        background: toneGradient,
        px: { xs: 2.5, sm: 3 }, pt: { xs: 2.5, sm: 3 }, pb: { xs: 2.25, sm: 2.75 },
        position: 'relative', overflow: 'hidden', textAlign: 'center',
      }}>
        <Box sx={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />
        <Box sx={{ position: 'absolute', bottom: -20, left: -20, width: 100, height: 100, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.02)', pointerEvents: 'none' }} />
        <IconButton onClick={onClose} size="small" aria-label="Close" sx={{
          position: 'absolute', top: 12, right: 12,
          color: 'rgba(255,255,255,0.7)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '10px', width: 34, height: 34,
          '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.1)' },
        }}>
          <Close sx={{ fontSize: 17 }} />
        </IconButton>
        {icon && (
          <Box sx={{
            width: 56, height: 56, borderRadius: '16px', mx: 'auto', mb: 2,
            bgcolor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(8px)',
          }}>
            {React.cloneElement(icon, { sx: { color: toneIcon, fontSize: 28 } })}
          </Box>
        )}
        <Typography sx={{
          fontWeight: 700, color: 'rgba(255,255,255,0.97)',
          fontSize: { xs: '1.1rem', sm: '1.2rem' }, lineHeight: 1.2, mb: 0.5,
          fontFamily: FONT,
        }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography sx={{
            color: 'rgba(255,255,255,0.45)', fontWeight: 500,
            fontSize: { xs: '0.76rem', sm: '0.82rem' }, fontFamily: FONT,
          }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      <DialogContent sx={{ p: { xs: 2, sm: 3 }, bgcolor: '#fff' }}>{children}</DialogContent>
      {actions && (
        <DialogActions sx={{
          px: { xs: 2.5, sm: 3 }, py: { xs: 1.75, sm: 2 },
          gap: 1, bgcolor: '#fff',
          borderTop: `1px solid ${T.borderSoft}`,
          flexDirection: { xs: 'column-reverse', sm: 'row' },
          alignItems: 'stretch',
          '& > *': { minHeight: { xs: 44, sm: 'auto' } },
        }}>
          {actions}
        </DialogActions>
      )}
    </Dialog>
  );
};

/* ─── Main component ────────────────────────────────────────────────────── */
const Subscription = () => {
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [selectedPlan,       setSelectedPlan]       = useState(null);
  const [confirmDialog,      setConfirmDialog]      = useState(false);
  const [cancelDialog,       setCancelDialog]       = useState(false);
  const [paymentDialog,      setPaymentDialog]      = useState(false);
  const [invoiceDialog,      setInvoiceDialog]      = useState(null);
  const [billingCycle,       setBillingCycle]       = useState('monthly');
  const [loading,            setLoading]            = useState(true);
  const [paymentMethods,     setPaymentMethods]     = useState(paymentMethodsData);
  const [selectedPaymentId,  setSelectedPaymentId]  = useState(paymentMethods.find(p => p.isDefault)?.id || 1);
  const [addingPayment,      setAddingPayment]      = useState(false);
  const [newCard, setNewCard] = useState({ cardholderName: '', cardNumber: '', expiry: '', cvv: '', type: 'Visa' });

  const paymentFailed = billingHistoryData.some(h => h.status === 'failed');

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(timer);
  }, []);

  const currentPlanIndex = useMemo(
    () => plans.findIndex(p => p.code === currentPlanData.planCode),
    []
  );

  /* ── Plans carousel (blogs-carousel pattern from the landing page) ── */
  const lgUp = useMediaQuery(theme.breakpoints.up('lg'));
  const smUp2 = useMediaQuery(theme.breakpoints.up('sm'));
  const perView = lgUp ? 3.3 : smUp2 ? 2.2 : 1.15;
  const [planPage, setPlanPage] = useState(0);
  const maxPlanPage = Math.max(0, plans.length - Math.floor(perView));
  const goPlans = (d) => setPlanPage((p) => Math.min(Math.max(0, p + d), maxPlanPage));

  const handleUpgrade = (plan) => { setSelectedPlan(plan); setConfirmDialog(true); };

  const handleConfirmChange = () => {
    const newIdx = plans.findIndex(p => p.code === selectedPlan?.code);
    if (newIdx > currentPlanIndex) enqueueSnackbar(`Successfully upgraded to ${selectedPlan?.name} plan`, { variant: 'success' });
    else if (newIdx < currentPlanIndex) enqueueSnackbar(`Downgraded to ${selectedPlan?.name} plan`, { variant: 'info' });
    else enqueueSnackbar(`Continued with ${selectedPlan?.name} plan`, { variant: 'info' });
    setConfirmDialog(false); setSelectedPlan(null);
  };

  const handleCancelSubscription = () => {
    setCancelDialog(false);
    enqueueSnackbar('Subscription cancelled. Access remains active until 2026-08-08.', { variant: 'warning' });
  };

  const handleDownloadInvoice = (invoice) => {
    enqueueSnackbar(`Downloading invoice ${invoice.invoiceNumber}`, { variant: 'success' });
  };

  const handleRetryPayment = () => {
    enqueueSnackbar('Retrying failed payment…', { variant: 'info' });
    setTimeout(() => enqueueSnackbar('Payment succeeded — thank you!', { variant: 'success' }), 800);
  };

  const handleAddPayment = () => {
    setAddingPayment(true);
    setTimeout(() => {
      const id = Date.now();
      const last4 = (newCard.cardNumber || '****').replace(/\s|-/g, '').slice(-4).padStart(4, '*');
      const method = { id, type: newCard.type, last4, expiry: newCard.expiry || '01/30', isDefault: false, cardholderName: newCard.cardholderName || 'Cardholder' };
      setPaymentMethods(prev => [...prev, method]);
      setAddingPayment(false); setPaymentDialog(false);
      setNewCard({ cardholderName: '', cardNumber: '', expiry: '', cvv: '', type: 'Visa' });
      enqueueSnackbar('Payment method added', { variant: 'success' });
    }, 700);
  };

  const handleRemovePayment = (id) => {
    setPaymentMethods(prev => prev.filter(p => p.id !== id));
    enqueueSnackbar('Payment method removed', { variant: 'info' });
  };

  const handleSetDefaultPayment = (id) => {
    setPaymentMethods(prev => prev.map(p => ({ ...p, isDefault: p.id === id })));
    setSelectedPaymentId(id);
    enqueueSnackbar('Default payment method updated', { variant: 'success' });
  };

  if (loading) {
    return (
      <Box sx={{ bgcolor: T.bg, minHeight: '100vh', maxWidth: '100vw', overflowX: 'hidden', p: { xs: 1, md: 3, xl: 4 } }}>
        <Skeleton variant="text" width="35%" height={40} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={140} sx={{ mb: 3, borderRadius: '14px' }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 1.5, mb: 3 }}>
          {[1,2,3,4].map(i => <Skeleton key={i} variant="rounded" height={100} sx={{ borderRadius: '14px' }} />)}
        </Box>
        <Skeleton variant="rounded" height={360} sx={{ borderRadius: '14px' }} />
      </Box>
    );
  }

  return (
    <Box className="page-fade-in" sx={{
      bgcolor: T.bg,
      minHeight: '100vh',
      maxWidth: '100vw',
      overflowX: 'hidden',
      p: { xs: 1, sm: 1.5, md: 3, lg: 3.5, xl: 4 },
      fontFamily: FONT,
      '& .MuiTypography-root, & .MuiButton-root, & .MuiChip-root, & .MuiInputBase-root, & .MuiMenuItem-root, & .MuiTableCell-root': { fontFamily: FONT },
    }}>
      <Box sx={{ maxWidth: 1400, mx: 'auto' }}>

        {/* Payment Failed Alert */}
        {paymentFailed && (
          <Panel sx={{
            mb: { xs: 2, md: 3 },
            border: `1px solid ${T.dangerBg}`,
            bgcolor: T.dangerBg,
            p: { xs: 1.5, sm: 2, md: 2.5 },
            boxShadow: '0 1px 3px rgba(2,33,36,0.05), 0 6px 20px rgba(180,70,47,0.10)',
          }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1.5, sm: 2 }} alignItems={{ xs: 'flex-start', sm: 'center' }}>
              <Warning sx={{ color: T.danger, fontSize: { xs: 22, sm: 26 }, flexShrink: 0 }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{
                  fontSize: { xs: '0.88rem', md: '0.95rem' },
                  fontWeight: 700, color: T.danger, mb: 0.4,
                }}>
                  Payment issue requires attention
                </Typography>
                <Typography sx={{ color: T.textMid, fontSize: { xs: '0.72rem', md: '0.82rem' } }}>
                  Your last payment failed. Update your card or retry the payment to avoid service interruption.
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} sx={{ alignSelf: { xs: 'stretch', sm: 'auto' } }}>
                <Button variant="outlined" size="small" onClick={() => setPaymentDialog(true)}
                  sx={{
                    borderColor: T.danger, color: T.danger, fontWeight: 700,
                    textTransform: 'none', borderRadius: '10px',
                    fontSize: { xs: '0.72rem', sm: '0.8rem' },
                    flex: { xs: 1, sm: 'none' },
                    '&:hover': { borderColor: T.danger, bgcolor: 'rgba(180,70,47,0.08)' },
                  }}>
                  Update Card
                </Button>
                <Button variant="contained" size="small" onClick={handleRetryPayment}
                  sx={{
                    bgcolor: T.danger, textTransform: 'none', fontWeight: 700, borderRadius: '10px',
                    fontSize: { xs: '0.72rem', sm: '0.8rem' },
                    flex: { xs: 1, sm: 'none' },
                    boxShadow: '0 2px 6px rgba(180,70,47,0.30), 0 4px 14px rgba(180,70,47,0.35)',
                    '&:hover': { bgcolor: '#8A3522' },
                  }}>
                  Retry Payment
                </Button>
              </Stack>
            </Stack>
          </Panel>
        )}

        {/* Page Header */}
        <SectionHeader
          title="Subscription & Billing"
          subtitle="Manage your plan, payment methods, and billing history"
        />

        {/* Current plan card — pine gradient hero (brand signature) */}
        <Box sx={{
          mb: { xs: 2, md: 3 }, borderRadius: { xs: '14px', md: '18px' },
          overflow: 'hidden', position: 'relative',
          background: 'linear-gradient(160deg, #08302F 0%, #0E1E1D 70%, #121615 100%)',
          boxShadow: '0 8px 28px rgba(2,33,36,0.18)',
        }}>
          <Box sx={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', bgcolor: 'rgba(127,158,126,0.07)', pointerEvents: 'none' }} />
          <Box sx={{ position: 'absolute', bottom: -40, left: '30%', width: 140, height: 140, borderRadius: '50%', bgcolor: 'rgba(127,158,126,0.04)', pointerEvents: 'none' }} />
          <Box sx={{ display: 'flex', minHeight: { xs: 'auto', md: 140 }, position: 'relative' }}>
            <Box sx={{ p: { xs: 2, sm: 2.5, md: 3 }, flex: 1 }}>
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={{ xs: 2, md: 3 }}
                alignItems={{ xs: 'flex-start', md: 'center' }}
                justifyContent="space-between"
              >
                <Stack direction="row" spacing={{ xs: 1.5, md: 2.5 }} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
                  <Box sx={{
                    width: { xs: 52, sm: 60, md: 68 },
                    height: { xs: 52, sm: 60, md: 68 },
                    borderRadius: '16px',
                    bgcolor: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {React.cloneElement(iconMap.EmojiEvents, {
                      sx: { color: PLAN_META[currentPlanData.planCode].color === '#022124' ? T.primary : PLAN_META[currentPlanData.planCode].color, fontSize: { xs: 26, sm: 32, md: 36 } },
                    })}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap mb={0.5}>
                      <Typography sx={{
                        fontSize: { xs: '1.05rem', sm: '1.2rem', md: '1.4rem' },
                        fontWeight: 700, color: 'rgba(255,255,255,0.97)', lineHeight: 1.2,
                      }}>
                        {currentPlanData.planName}
                      </Typography>
                      <StatusPill
                        label="Active" tone="success"
                        icon={<CheckCircle sx={{ fontSize: 12 }} />}
                      />
                    </Stack>
                    <Typography sx={{
                      color: 'rgba(255,255,255,0.55)',
                      fontSize: { xs: '0.72rem', sm: '0.82rem', md: '0.9rem' },
                      mb: { xs: 1, md: 1.5 },
                    }}>
                      Billed {currentPlanData.billingCycle} · {formatMoney(currentPlanData.monthlyPrice)}/{currentPlanData.billingCycle === 'monthly' ? 'mo' : 'yr'}
                    </Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 0.5, sm: 2.5 }}>
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <CalendarMonth sx={{ color: T.primary, fontSize: { xs: 15, md: 17 } }} />
                        <Typography sx={{ color: 'rgba(255,255,255,0.65)', fontSize: { xs: '0.7rem', md: '0.8rem' } }}>
                          Renews {formatDate(currentPlanData.renewalDate)}
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <TrendingUp sx={{ color: T.warn, fontSize: { xs: 15, md: 17 } }} />
                        <Typography sx={{ color: 'rgba(255,255,255,0.65)', fontSize: { xs: '0.7rem', md: '0.8rem' } }}>
                          <Box component="strong" sx={{ color: '#fff' }}>{currentPlanData.daysRemaining} days</Box> remaining
                        </Typography>
                      </Stack>
                    </Stack>
                  </Box>
                </Stack>

                <Stack
                  direction="row"
                  spacing={1}
                  sx={{
                    width: { xs: '100%', md: 'auto' },
                    '& > *': { flex: { xs: 1, md: 'none' } },
                  }}
                >
                  <Button
                    variant="contained"
                    disableElevation
                    startIcon={<CreditCard />}
                    onClick={() => setPaymentDialog(true)}
                    sx={{
                      textTransform: 'none', fontWeight: 700, borderRadius: '10px',
                      bgcolor: T.primary, color: '#fff',
                      fontSize: { xs: '0.72rem', md: '0.82rem' },
                      py: { xs: 0.75, md: 0.9 },
                      '&:hover': { bgcolor: T.primaryDark },
                    }}
                  >
                    Manage Cards
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => setCancelDialog(true)}
                    sx={{
                      textTransform: 'none', fontWeight: 700, borderRadius: '10px',
                      borderColor: 'rgba(255,255,255,0.22)', color: 'rgba(255,255,255,0.8)',
                      fontSize: { xs: '0.72rem', md: '0.82rem' },
                      py: { xs: 0.75, md: 0.9 },
                      '&:hover': { borderColor: '#E8897A', color: '#E8897A', bgcolor: 'rgba(180,70,47,0.12)' },
                    }}
                  >
                    Cancel Plan
                  </Button>
                </Stack>
              </Stack>
            </Box>
          </Box>
        </Box>

        {/* Usage Section */}
        <SectionHeader title="Usage this cycle" subtitle={`Reset on ${formatDate(currentPlanData.renewalDate)}`} />
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
          gap: { xs: 1.25, sm: 1.75, md: 2 },
          mb: { xs: 3, md: 4 },
          '@media (max-width: 360px)': { gridTemplateColumns: '1fr' },
        }}>
          {currentPlanData.usage.map((item, i) => <UsageTile key={i} item={item} />)}
        </Box>

        {/* Choose Plan Section */}
        <SectionHeader
          title="Choose your plan"
          subtitle="Select the plan that best fits your team's needs"
          action={
            <Stack direction="row" spacing={1.25} alignItems="center" flexWrap="wrap" useFlexGap>
            {/* Billing cycle toggle — clean segmented pill */}
            <Box sx={{
              display: 'inline-flex',
              bgcolor: T.card,
              borderRadius: '10px',
              p: 0.4,
              border: `1px solid ${T.border}`,
              boxShadow: '0 1px 3px rgba(2,33,36,0.05)',
            }}>
              {['monthly', 'yearly'].map(cycle => (
                <Button
                  key={cycle}
                  onClick={() => setBillingCycle(cycle)}
                  sx={{
                    textTransform: 'none', fontWeight: 700, borderRadius: '8px',
                    px: { xs: 1.5, sm: 2, md: 2.5 },
                    py: { xs: 0.5, sm: 0.6 },
                    fontSize: { xs: '0.72rem', md: '0.82rem' },
                    minWidth: 0,
                    bgcolor: billingCycle === cycle ? T.primary : 'transparent',
                    color: billingCycle === cycle ? '#fff' : T.textMid,
                    boxShadow: billingCycle === cycle ? `0 1px 4px ${T.primary}55` : 'none',
                    '&:hover': {
                      bgcolor: billingCycle === cycle ? T.primaryDark : T.primarySoft,
                    },
                  }}
                >
                  {cycle === 'monthly' ? 'Monthly' : (
                    <>
                      Yearly
                      <Box component="span" sx={{
                        ml: 0.75, px: 0.75, py: 0.15,
                        fontSize: '0.58rem', bgcolor: billingCycle === 'yearly' ? 'rgba(255,255,255,0.22)' : T.successBg,
                        color: billingCycle === 'yearly' ? '#fff' : T.success,
                        borderRadius: '999px', fontWeight: 700,
                      }}>-17%</Box>
                    </>
                  )}
                </Button>
              ))}
            </Box>

              {/* Prev / Next — landing-page blogs carousel buttons */}
              {[{ d: -1, label: 'Previous plans', rot: 180 }, { d: 1, label: 'Next plans', rot: 0 }].map((b) => {
                const disabled = b.d === -1 ? planPage <= 0 : planPage >= maxPlanPage;
                return (
                  <Box key={b.label}
                    onClick={() => !disabled && goPlans(b.d)}
                    role="button" tabIndex={disabled ? -1 : 0} aria-label={b.label}
                    aria-disabled={disabled}
                    onKeyDown={(e) => { if (!disabled && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); goPlans(b.d); } }}
                    sx={{
                      width: { xs: 40, sm: 46 }, height: { xs: 40, sm: 46 },
                      borderRadius: '10px', outline: 'none', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: disabled ? 'default' : 'pointer',
                      bgcolor: disabled ? T.borderSoft : T.primary,
                      border: `1.5px solid ${disabled ? T.borderSoft : T.primary}`,
                      color: disabled ? T.textLight : '#fff',
                      boxShadow: disabled ? 'none' : '0 8px 20px rgba(127,158,126,0.28)',
                      transition: 'background .3s cubic-bezier(0.22,1,0.36,1), border-color .3s ease, transform .3s cubic-bezier(0.22,1,0.36,1), box-shadow .3s ease',
                      '& svg': { transition: 'transform .3s cubic-bezier(0.22,1,0.36,1)' },
                      '&:hover': disabled ? {} : {
                        bgcolor: '#022124', borderColor: '#022124',
                        transform: 'translateY(-3px)',
                        boxShadow: '0 14px 28px rgba(2,33,36,0.32)',
                        '& svg': { transform: `rotate(${b.rot}deg) translateX(3px)` },
                      },
                      '&:active': disabled ? {} : { transform: 'translateY(-1px) scale(0.97)' },
                      '@media (prefers-reduced-motion: reduce)': { transition: 'none', '&:hover': { transform: 'none' } },
                    }}
                  >
                    <ArrowForward sx={{ fontSize: 18, transform: `rotate(${b.rot}deg)` }} />
                  </Box>
                );
              })}
            </Stack>
          }
        />

        {/* Plans Carousel — landing-page blogs pattern: peeking track */}
        <Box sx={{ overflow: 'hidden', mb: { xs: 4, md: 5, lg: 6 }, pt: 1.5, mt: -1.5, pb: 0.5 }}>
          <Box sx={{
            display: 'flex',
            transform: `translateX(calc(-${Math.min(planPage, maxPlanPage)} * (100% + 24px) / ${perView}))`,
            transition: 'transform .55s cubic-bezier(0.22,1,0.36,1)',
            '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
          }}>
            {plans.map(plan => (
              <Box key={plan.code} sx={{
                flex: `0 0 calc((100% - 3 * 24px) / ${perView})`,
                mr: '24px', minWidth: 0, display: 'flex',
                '& > *': { width: '100%' },
              }}>
                <PlanCard
                  plan={plan}
                  isCurrent={plan.code === currentPlanData.planCode}
                  isPopular={plan.code === 'platinum' && plan.code !== currentPlanData.planCode}
                  billingCycle={billingCycle}
                  onUpgrade={handleUpgrade}
                  currentPlanIndex={currentPlanIndex}
                />
              </Box>
            ))}
          </Box>
        </Box>

        {/* Feature Comparison */}
        {/* 🔧 REDESIGN 5/6 — Comparison table: cleaner header row, sage highlight
            on current plan column, subtle row hover, mapped via generic cells. */}
        <SectionHeader title="Compare plans in detail" subtitle="See what's included in every tier" />
        <TableContainer component={Paper} elevation={0} sx={{
          borderRadius: { xs: '12px', md: '14px' },
          border: `1px solid ${T.border}`,
          boxShadow: CARD_SHADOW,
          overflow: 'auto',
          WebkitOverflowScrolling: 'touch',
          mb: { xs: 3, md: 5 },
        }}>
          <Table sx={{
            minWidth: { xs: 640, sm: 720, md: 800 },
            '& th, & td': {
              px: { xs: 1.25, sm: 1.75, md: 2 },
              py: { xs: 1.25, sm: 1.5, md: 1.75 },
              borderBottom: `1px solid ${T.borderSoft}`,
              fontSize: { xs: '0.72rem', sm: '0.8rem', md: '0.86rem' },
            },
          }}>
            <TableHead>
              <TableRow sx={{ bgcolor: T.primarySoft, '& th': { borderBottom: `2px solid ${T.primary}33` } }}>
                <TableCell sx={{
                  fontWeight: 700, color: T.primaryDark,
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                  fontSize: { xs: '0.62rem', md: '0.7rem' },
                  minWidth: { xs: 150, sm: 180, md: 210 },
                  position: 'sticky', left: 0, zIndex: 3,
                  bgcolor: T.primarySoft,
                  borderRight: `1px solid ${T.border}`,
                  verticalAlign: 'bottom', pb: { xs: 2.25, md: 2.5 },
                }}>
                  Feature
                </TableCell>
                {plans.map(plan => {
                  const isCur = plan.code === currentPlanData.planCode;
                  return (
                    <TableCell key={plan.code} align="center" sx={{
                      fontWeight: 700, color: T.primaryDark,
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                      fontSize: { xs: '0.62rem', md: '0.7rem' },
                      minWidth: { xs: 96, sm: 106, md: 118 },
                      verticalAlign: 'top',
                    }}>
                      {/* Every column reserves identical icon/name/badge slots,
                          so the tier icons sit on one perfectly aligned line
                          regardless of which column carries the Current badge. */}
                      <Stack alignItems="center" spacing={0.5}>
                        <Box sx={{
                          height: { xs: 20, md: 22 },
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {React.cloneElement(iconMap[plan.icon], {
                            sx: { color: PLAN_META[plan.code].color, fontSize: { xs: 16, md: 18 } },
                          })}
                        </Box>
                        <Typography sx={{
                          fontWeight: 700, fontSize: { xs: '0.7rem', md: '0.82rem' },
                          color: T.textDark, textTransform: 'none', letterSpacing: 0,
                          lineHeight: 1.2, whiteSpace: 'nowrap',
                        }}>
                          {plan.name}
                        </Typography>
                        <Box sx={{ height: 18, display: 'flex', alignItems: 'center' }}>
                          {isCur && (
                            <Chip label="Current" size="small" sx={{
                              height: 16, fontSize: '0.55rem', fontWeight: 700,
                              bgcolor: T.primary, color: '#fff',
                            }} />
                          )}
                        </Box>
                      </Stack>
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableHead>
            <TableBody>
              {featureComparison.map((row, i) => (
                <TableRow key={i} sx={{
                  '&:hover': { bgcolor: T.bg },
                  '&:hover td:first-of-type': { bgcolor: T.bg },
                  '&:last-child td': { border: 0 },
                }}>
                  <TableCell sx={{
                    color: T.textDark, fontWeight: 600,
                    position: 'sticky', left: 0, zIndex: 1,
                    bgcolor: T.card,
                    borderRight: `1px solid ${T.border}`,
                    transition: 'background-color .15s ease',
                  }}>
                    <Stack direction="row" spacing={{ xs: 0.75, md: 1 }} alignItems="center">
                      {React.cloneElement(iconMap[row.icon], {
                        sx: { color: iconColorMap[row.icon] || T.textLight, fontSize: { xs: 14, md: 16 } },
                      })}
                      <Box component="span">{row.feature}</Box>
                    </Stack>
                  </TableCell>
                  {plans.map(plan => {
                    const isCur = plan.code === currentPlanData.planCode;
                    const val = row[plan.code];
                    return (
                      <TableCell key={plan.code} align="center" sx={{
                        color: T.textMid,
                        bgcolor: isCur ? T.primarySoft : 'transparent',
                        fontWeight: isCur ? 700 : 500,
                      }}>
                        {val === '✓' ? (
                          <CheckCircle sx={{ color: T.success, fontSize: { xs: 16, md: 18 } }} />
                        ) : val === '—' ? (
                          <Cancel sx={{ color: T.textLight, fontSize: { xs: 16, md: 18 } }} />
                        ) : val}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* ─── Confirm Plan Change Dialog ─── */}
      <DialogShell
        open={confirmDialog}
        onClose={() => setConfirmDialog(false)}
        title={selectedPlan ? `Switch to ${selectedPlan.name}?` : ''}
        subtitle="Prorated charges apply for the remaining cycle"
        icon={selectedPlan && iconMap[selectedPlan.icon]}
        iconTone="primary"
        isMobile={isMobile}
        actions={
          <>
            <Button onClick={() => setConfirmDialog(false)} sx={BTN_TEXT_SX}>Cancel</Button>
            <Button variant="contained" onClick={handleConfirmChange}
              sx={{ ...BTN_PRIMARY_SX, px: 3, fontSize: { xs: '0.78rem', sm: '0.86rem' } }}>
              Confirm Change
            </Button>
          </>
        }
      >
        {selectedPlan && (
          <>
            <Alert severity="info" sx={{
              borderRadius: '10px', mb: 2.5,
              bgcolor: T.primarySoft, color: T.textDark, border: `1px solid ${T.primary}22`,
              '& .MuiAlert-icon': { color: T.primary },
              fontSize: { xs: '0.72rem', sm: '0.82rem' },
            }}>
              Your new plan takes effect immediately. Any unused portion of your current plan will be prorated.
            </Alert>
            <Box sx={{
              bgcolor: T.bg, borderRadius: '10px',
              p: { xs: 1.5, sm: 2 },
              boxShadow: '0 1px 3px rgba(2,33,36,0.04)',
            }}>
              {[
                ['New Plan', `${selectedPlan.name} — ${formatMoney(billingCycle === 'monthly' ? selectedPlan.monthlyPrice : selectedPlan.yearlyPrice)}/${billingCycle === 'monthly' ? 'mo' : 'yr'}`],
                ['Effective Date', 'Immediately'],
              ].map(([k, v]) => (
                <Stack key={k} direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography sx={{ color: T.textLight, fontSize: { xs: '0.72rem', sm: '0.82rem' } }}>{k}</Typography>
                  <Typography sx={{ fontWeight: 700, color: T.textDark, fontSize: { xs: '0.78rem', sm: '0.88rem' }, textAlign: 'right' }}>{v}</Typography>
                </Stack>
              ))}
              <Divider sx={{ my: 1.5, borderColor: T.border }} />
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography sx={{ fontWeight: 700, color: T.textDark, fontSize: { xs: '0.82rem', sm: '0.92rem' } }}>Prorated Amount</Typography>
                <Typography sx={{ fontWeight: 700, color: T.primary, fontSize: { xs: '1rem', sm: '1.15rem' } }}>
                  {formatMoney(Math.round((billingCycle === 'monthly' ? selectedPlan.monthlyPrice : selectedPlan.yearlyPrice) * (currentPlanData.daysRemaining / 30)))}
                </Typography>
              </Stack>
            </Box>
          </>
        )}
      </DialogShell>

      {/* ─── Cancel Subscription Dialog ─── */}
      <DialogShell
        open={cancelDialog}
        onClose={() => setCancelDialog(false)}
        title="Cancel Subscription?"
        subtitle="Access remains active until your renewal date"
        icon={<Warning />}
        iconTone="danger"
        isMobile={isMobile}
        actions={
          <>
            <Button onClick={() => setCancelDialog(false)} sx={BTN_TEXT_SX}>Keep Subscription</Button>
            <Button variant="outlined" onClick={() => { setCancelDialog(false); enqueueSnackbar('Please choose a plan to downgrade', { variant: 'info' }); }}
              sx={{ ...BTN_OUTLINED_SX, fontSize: { xs: '0.75rem', sm: '0.85rem' } }}>
              Downgrade Instead
            </Button>
            <Button variant="contained" onClick={handleCancelSubscription}
              sx={{
                textTransform: 'none', fontWeight: 700, borderRadius: '10px',
                bgcolor: T.danger,
                fontSize: { xs: '0.75rem', sm: '0.85rem' },
                boxShadow: '0 2px 6px rgba(180,70,47,0.30), 0 4px 14px rgba(180,70,47,0.35)',
                '&:hover': { bgcolor: '#8A3522', boxShadow: '0 4px 10px rgba(180,70,47,0.35), 0 8px 22px rgba(180,70,47,0.40)' },
              }}>
              Cancel Anyway
            </Button>
          </>
        }
      >
        <Typography sx={{ mb: 2, color: T.textMid, fontSize: { xs: '0.78rem', sm: '0.9rem' } }}>
          Your subscription remains active until <Box component="strong">{formatDate(currentPlanData.renewalDate)}</Box>. After that, you'll lose access to:
        </Typography>
        <Stack spacing={1.25} sx={{ mb: 2.5 }}>
          {[
            'All premium AI Assessment and Interview features',
            'Advanced analytics and reporting',
            'Priority customer support',
            'Your interview history and data',
          ].map((line, i) => (
            <Stack key={i} direction="row" spacing={1} alignItems="center">
              <Cancel sx={{ color: T.danger, fontSize: { xs: 15, sm: 18 }, flexShrink: 0 }} />
              <Typography sx={{ color: T.textMid, fontSize: { xs: '0.72rem', sm: '0.82rem' } }}>{line}</Typography>
            </Stack>
          ))}
        </Stack>
        <Alert severity="warning" sx={{
          borderRadius: '10px',
          bgcolor: T.warnBg, color: T.textDark, border: `1px solid ${T.warn}22`,
          '& .MuiAlert-icon': { color: T.warn },
          fontSize: { xs: '0.72rem', sm: '0.82rem' },
        }}>
          Would you like to downgrade to a cheaper plan instead?
        </Alert>
      </DialogShell>

      {/* ─── Payment Methods Dialog ─── */}
      <DialogShell
        open={paymentDialog}
        onClose={() => setPaymentDialog(false)}
        title="Payment Methods"
        subtitle="Manage your saved cards and default method"
        icon={<CreditCard />}
        iconTone="primary"
        isMobile={isMobile}
      >
        <Stack spacing={1.5} sx={{ mb: 2.5 }}>
          <RadioGroup value={selectedPaymentId} onChange={(e) => handleSetDefaultPayment(Number(e.target.value))}>
            {paymentMethods.map(m => (
              <Card key={m.id} variant="outlined" sx={{
                mb: 1.25,
                borderRadius: '10px',
                border: `2px solid ${m.isDefault ? T.primary : T.borderSoft}`,
                bgcolor: m.isDefault ? T.primarySoft : T.card,
                boxShadow: m.isDefault
                  ? `0 2px 8px ${T.primary}30, 0 6px 16px ${T.primary}25`
                  : '0 1px 2px rgba(2,33,36,0.04)',
                transition: 'box-shadow .2s ease',
                '&:hover': { boxShadow: '0 4px 12px rgba(2,33,36,0.08)' },
              }}>
                <CardContent sx={{ p: { xs: 1.25, sm: 1.5 }, '&:last-child': { pb: { xs: 1.25, sm: 1.5 } } }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <FormControlLabel
                      value={m.id}
                      control={<Radio sx={{ color: T.primary, '&.Mui-checked': { color: T.primary } }} />}
                      label={
                        <Stack direction="row" spacing={1.25} alignItems="center">
                          <Box sx={{
                            width: { xs: 36, sm: 42 }, height: { xs: 24, sm: 28 },
                            borderRadius: '6px',
                            background: m.type === 'Visa' ? '#1a1f71' : '#eb001b',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontWeight: 700, fontSize: { xs: '0.58rem', sm: '0.68rem' },
                            boxShadow: '0 2px 5px rgba(0,0,0,0.16)',
                          }}>
                            {m.type === 'Visa' ? 'VISA' : 'MC'}
                          </Box>
                          <Box>
                            <Typography sx={{ fontWeight: 700, color: T.textDark, fontSize: { xs: '0.78rem', sm: '0.85rem' } }}>
                              •••• {m.last4}
                            </Typography>
                            <Typography sx={{ color: T.textLight, fontSize: { xs: '0.6rem', sm: '0.7rem' } }}>
                              Expires {m.expiry} · {m.cardholderName}
                            </Typography>
                          </Box>
                        </Stack>
                      }
                    />
                    <Stack direction="row" spacing={0.5}>
                      {m.isDefault && <StatusPill label="Default" tone="success" />}
                      {!m.isDefault && (
                        <IconButton size="small" onClick={() => handleRemovePayment(m.id)}>
                          <Delete sx={{ fontSize: { xs: 16, sm: 18 }, color: T.danger }} />
                        </IconButton>
                      )}
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </RadioGroup>
        </Stack>

        <Box sx={{
          p: { xs: 1.5, sm: 2 }, bgcolor: T.bg,
          borderRadius: '10px', border: `1px dashed ${T.border}`,
        }}>
          <Typography sx={{ mb: 1.75, color: T.textMid, fontWeight: 600, fontSize: { xs: '0.72rem', sm: '0.82rem' } }}>
            Add a new card
          </Typography>
          <Stack spacing={1.5}>
            <TextField label="Cardholder Name" fullWidth size="small" value={newCard.cardholderName}
              onChange={(e) => setNewCard({ ...newCard, cardholderName: e.target.value })} sx={inputSx} />
            <TextField label="Card Number" fullWidth size="small" placeholder="1234 5678 9012 3456"
              value={newCard.cardNumber} onChange={(e) => setNewCard({ ...newCard, cardNumber: e.target.value })} sx={inputSx} />
            <Stack direction="row" spacing={1.25}>
              <TextField label="Expiry" size="small" placeholder="12/25" value={newCard.expiry}
                onChange={(e) => setNewCard({ ...newCard, expiry: e.target.value })} sx={{ ...inputSx, flex: 1 }} />
              <TextField label="CVV" size="small" type="password" placeholder="123" value={newCard.cvv}
                onChange={(e) => setNewCard({ ...newCard, cvv: e.target.value })} sx={{ ...inputSx, flex: 1 }} />
              <TextField select label="Type" size="small" value={newCard.type}
                onChange={(e) => setNewCard({ ...newCard, type: e.target.value })} sx={{ ...inputSx, flex: 1 }}>
                <MenuItem value="Visa">Visa</MenuItem>
                <MenuItem value="Mastercard">Mastercard</MenuItem>
              </TextField>
            </Stack>
            <Button variant="contained" startIcon={<Add />} disabled={addingPayment} onClick={handleAddPayment}
              sx={{ ...BTN_PRIMARY_SX, fontSize: { xs: '0.78rem', sm: '0.86rem' } }}>
              {addingPayment ? 'Adding…' : 'Add Payment Method'}
            </Button>
          </Stack>
        </Box>
      </DialogShell>

      {/* ─── Invoice Preview Dialog ─── */}
      <DialogShell
        open={Boolean(invoiceDialog)}
        onClose={() => setInvoiceDialog(null)}
        title="Invoice Preview"
        subtitle={invoiceDialog?.invoiceNumber}
        isMobile={isMobile}
        maxWidth="md"
        actions={
          <>
            <Button onClick={() => setInvoiceDialog(null)} sx={BTN_TEXT_SX}>Close</Button>
            <Button variant="outlined" startIcon={<Print />} onClick={() => window.print()}
              sx={{ ...BTN_OUTLINED_SX, fontSize: { xs: '0.78rem', sm: '0.86rem' } }}>
              Print
            </Button>
            <Button variant="contained" startIcon={<Download />}
              onClick={() => { handleDownloadInvoice(invoiceDialog); setInvoiceDialog(null); }}
              sx={{ ...BTN_PRIMARY_SX, fontSize: { xs: '0.78rem', sm: '0.86rem' } }}>
              Download PDF
            </Button>
          </>
        }
      >
        {invoiceDialog && (
          <Box sx={{
            p: { xs: 2, sm: 3, md: 4 },
            bgcolor: '#fff', border: `1px solid ${T.border}`,
            borderRadius: '10px', boxShadow: '0 4px 14px rgba(2,33,36,0.08)',
          }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2} mb={3}>
              <Box>
                <Typography sx={{ fontSize: { xs: '1rem', sm: '1.15rem' }, fontWeight: 700, color: T.textDark }}>
                  Ievalx Recruitment Platform
                </Typography>
                <Typography sx={{ color: T.textLight, fontSize: { xs: '0.7rem', sm: '0.8rem' }, mt: 0.5, lineHeight: 1.5 }}>
                  billing@ievalx.com<br />123 Business Ave, Bengaluru<br />GSTIN: 29ABCDE1234F1Z5
                </Typography>
              </Box>
              <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                <Typography sx={{ fontSize: { xs: '1rem', sm: '1.15rem' }, fontWeight: 700, color: T.primary, letterSpacing: '0.05em' }}>
                  INVOICE
                </Typography>
                <Typography sx={{ color: T.textLight, fontSize: { xs: '0.7rem', sm: '0.8rem' }, mt: 0.5, lineHeight: 1.5 }}>
                  {invoiceDialog.invoiceNumber}<br />Date: {formatDate(invoiceDialog.date)}
                </Typography>
              </Box>
            </Stack>
            <Divider sx={{ my: 2, borderColor: T.border }} />
            <Box sx={{ mb: 2.5 }}>
              <Typography sx={{ fontWeight: 700, color: T.textDark, mb: 0.75, fontSize: { xs: '0.78rem', sm: '0.88rem' } }}>Bill to</Typography>
              <Typography sx={{ color: T.textMid, fontSize: { xs: '0.7rem', sm: '0.82rem' }, lineHeight: 1.5 }}>
                Ganta Abhisri<br />Ievalx Company<br />abhisri@company.com
              </Typography>
            </Box>
            <Table sx={{ mb: 2.5 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, color: T.textDark, borderBottom: `2px solid ${T.border}`, fontSize: { xs: '0.72rem', sm: '0.82rem' } }}>Description</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: T.textDark, borderBottom: `2px solid ${T.border}`, fontSize: { xs: '0.72rem', sm: '0.82rem' } }}>Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>
                    <Typography sx={{ fontWeight: 600, color: T.textDark, fontSize: { xs: '0.74rem', sm: '0.86rem' } }}>{invoiceDialog.plan} plan subscription</Typography>
                    <Typography sx={{ color: T.textLight, fontSize: { xs: '0.62rem', sm: '0.72rem' } }}>Monthly billing · Auto-renewal enabled</Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: T.textDark, fontSize: { xs: '0.78rem', sm: '0.88rem' } }}>
                    {formatMoney(invoiceDialog.amount)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <Box sx={{ maxWidth: { xs: '100%', sm: 300 }, ml: 'auto' }}>
              {[
                ['Subtotal', formatMoney(invoiceDialog.amount)],
                ['Tax (18% GST)', formatMoney(Math.round(invoiceDialog.amount * 0.18))],
              ].map(([k, v]) => (
                <Stack key={k} direction="row" justifyContent="space-between" mb={0.75}>
                  <Typography sx={{ color: T.textLight, fontSize: { xs: '0.7rem', sm: '0.8rem' } }}>{k}</Typography>
                  <Typography sx={{ fontWeight: 700, color: T.textDark, fontSize: { xs: '0.75rem', sm: '0.85rem' } }}>{v}</Typography>
                </Stack>
              ))}
              <Divider sx={{ my: 1, borderColor: T.border }} />
              <Stack direction="row" justifyContent="space-between">
                <Typography sx={{ fontWeight: 700, color: T.textDark, fontSize: { xs: '0.85rem', sm: '0.95rem' } }}>Total</Typography>
                <Typography sx={{ fontWeight: 700, color: T.primary, fontSize: { xs: '1.05rem', sm: '1.25rem' } }}>
                  {formatMoney(Math.round(invoiceDialog.amount * 1.18))}
                </Typography>
              </Stack>
            </Box>
            <Box sx={{
              mt: 2.5, p: { xs: 1.25, sm: 1.75 },
              bgcolor: invoiceDialog.status === 'failed' ? T.dangerBg : T.successBg,
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(2,33,36,0.04)',
            }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                {invoiceDialog.status === 'failed'
                  ? <Cancel sx={{ color: T.danger, fontSize: { xs: 16, sm: 20 } }} />
                  : <CheckCircle sx={{ color: T.success, fontSize: { xs: 16, sm: 20 } }} />}
                <Typography sx={{
                  fontWeight: 700,
                  color: invoiceDialog.status === 'failed' ? T.danger : T.success,
                  fontSize: { xs: '0.72rem', sm: '0.82rem' },
                }}>
                  {invoiceDialog.status === 'failed' ? 'Payment failed' : 'Payment received'} via {invoiceDialog.method}
                </Typography>
              </Stack>
            </Box>
          </Box>
        )}
      </DialogShell>
    </Box>
  );
};

export default Subscription;