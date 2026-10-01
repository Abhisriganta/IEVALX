import React from 'react';
import { Box, Paper } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import publicSageTheme from '@/theme/publicSageTheme';
import { CreditCard, Receipt } from '@mui/icons-material';
import useBillingAndSubscription from '@/hooks/company/useBillingAndSubscription';
import Subscription from '@/components/company/Subscription/Subscription';
import BillingHistory from '@/components/company/BillingHistory/BillingHistory';

/* ── Brand tokens — pine / sage / cream ─────────────────────────────── */
const C = {
  pageBg: '#F6F8F3', white: '#FFFFFF',
  border: '#E7EAE3', borderStrong: '#D8DDD4',
  pine: '#022124', muted: '#55584F',
};
const FONT = "'Jost','DM Sans',sans-serif";

const TABS = [
  { label: 'Subscription',    icon: <CreditCard sx={{ fontSize: 16 }} /> },
  { label: 'Billing History', icon: <Receipt sx={{ fontSize: 16 }} /> },
];

const BillingAndSubscriptionInner = () => {
  const { tab, changeTab } = useBillingAndSubscription();

  return (
    <Box sx={{
      bgcolor: C.pageBg,
      minHeight: '100%',
      width: '100%',
      maxWidth: '100vw',
      overflowX: 'clip',
      fontFamily: FONT,
    }}>
      {/* Pill tab switcher — brand pill pattern, scrolls on tiny screens */}
      <Box sx={{
        maxWidth: 1400, mx: 'auto',
        px: { xs: 1, sm: 1.5, md: 3, lg: 3.5, xl: 4 },
        pt: { xs: 1, sm: 1.5, md: 2.5 },
      }}>
        <Paper elevation={0} sx={{
          bgcolor: C.white,
          border: `1px solid ${C.border}`,
          borderRadius: { xs: '12px', sm: '14px' },
          p: { xs: 0.75, sm: 1 },
          display: 'inline-flex',
          gap: 0.75,
          maxWidth: '100%',
          overflowX: 'auto',
          boxShadow: '0 1px 2px rgba(16,18,16,0.04)',
          '&::-webkit-scrollbar': { display: 'none' },
        }}>
          {TABS.map((t, i) => {
            const on = tab === i;
            return (
              <Box key={t.label} onClick={() => changeTab(i)} role="tab" tabIndex={0}
                aria-selected={on}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && changeTab(i)}
                sx={{
                  cursor: 'pointer', userSelect: 'none', flexShrink: 0,
                  display: 'inline-flex', alignItems: 'center', gap: 0.75,
                  px: { xs: 1.5, sm: 2 }, py: { xs: 0.7, sm: 0.85 },
                  minHeight: { xs: 38, sm: 40 },
                  borderRadius: 999,
                  fontSize: { xs: '0.78rem', sm: '0.84rem' },
                  fontWeight: on ? 700 : 600, fontFamily: FONT,
                  bgcolor: on ? C.pine : 'transparent',
                  color: on ? '#fff' : C.muted,
                  border: `1px solid ${on ? C.pine : 'transparent'}`,
                  transition: 'all 0.16s ease',
                  '& svg': { color: on ? '#7F9E7E' : C.muted, transition: 'color 0.16s ease' },
                  '&:hover': on ? {} : { bgcolor: C.pageBg, color: C.pine },
                }}
              >
                {t.icon}
                {t.label}
              </Box>
            );
          })}
        </Paper>
      </Box>

      <Box sx={{ display: tab === 0 ? 'block' : 'none' }}><Subscription /></Box>
      <Box sx={{ display: tab === 1 ? 'block' : 'none' }}><BillingHistory /></Box>
    </Box>
  );
};

const BillingAndSubscription = () => (
  <ThemeProvider theme={publicSageTheme}>
    <BillingAndSubscriptionInner />
  </ThemeProvider>
);

export default BillingAndSubscription;