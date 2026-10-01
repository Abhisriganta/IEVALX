

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Box, Paper, Typography, Stack, Chip, CircularProgress, Alert,
  Button, IconButton, Menu, MenuItem, Tooltip, Slide,
  Table, TableHead, TableRow, TableCell, TableBody,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Grid,
} from '@mui/material';
import {
  ReceiptLongOutlined, CreditCardOutlined, CheckCircleOutlined,
  AddCardOutlined, MoreVert, Close, HistoryOutlined,
} from '@mui/icons-material';

const PRIMARY      = '#1E3358';
const PRIMARY_SOFT = 'rgba(30,51,88,0.08)';
const PRIMARY_GRAD = 'linear-gradient(135deg, #1E3358 0%, #2A4574 100%)';
const ACCENT       = '#6D28D9';                    // popular plan purple
const ACCENT_SOFT  = 'rgba(109,40,217,0.10)';
const ACCENT_TINT  = 'rgba(109,40,217,0.04)';
const SUCCESS      = '#1A7A4A';
const SUCCESS_SOFT = 'rgba(26,122,74,0.10)';
const WARN         = '#B45309';
const WARN_SOFT    = 'rgba(180,83,9,0.10)';
const DANGER       = '#B91C1C';
const TEXT_BODY    = '#1A1A18';
const TEXT_MUTED   = '#9CA3AF';
const TEXT_SUBTLE  = '#6B7280';
const BORDER       = '#E5E7EB';
const BORDER_SOFT  = '#F3F4F6';
const CARD_BG      = '#fff';

// Card brand visual identity
const BRAND_STYLE = {
  Visa:       { bg: 'linear-gradient(135deg, #1A1F71 0%, #2A3FAB 100%)', label: 'VISA' },
  Mastercard: { bg: 'linear-gradient(135deg, #EB001B 0%, #F79E1B 100%)', label: 'MASTERCARD' },
  Amex:       { bg: 'linear-gradient(135deg, #2E77BB 0%, #3D8EE0 100%)', label: 'AMEX' },
  Default:    { bg: 'linear-gradient(135deg, #4B5563 0%, #6B7280 100%)', label: 'CARD' },
};

// ── MOCK DATA ────────────────────────────────────────────────────────────
const MOCK_CURRENT_PLAN = {
  id:               'free',
  name:             'Free tier',
  badge:            'STANDARD',
  price:            0,
  cycle:            'forever',
  status:           'active',
  nextBillingOn:    'June 12, 2026',
};

const MOCK_PLANS = [
  {
    id: 'free', name: 'Free tier', price: 0, cycle: 'month',
    accent: PRIMARY,
    features: [
      '3 AI Mock Interviews',
      'Basic Career Coaching',
      'Community Support',
      'Standard Job Alerts',
    ],
  },
  {
    id: 'pro', name: 'Premium Pro', price: 499, cycle: 'month',
    accent: ACCENT, popular: true,
    features: [
      'Unlimited AI Interviews',
      'Deep Skills Analytics',
      'Priority Support',
      'Advanced Job Matching',
      'Direct Chat with Mentors',
    ],
  },
  {
    id: 'enterprise', name: 'Enterprise', price: 1999, cycle: 'month',
    accent: PRIMARY,
    features: [
      'Customized Career Roadmap',
      'Dedicated Career Coach',
      'Resume Review by Experts',
      'Interview Guarantee',
      'White-glove placement',
    ],
  },
];

const MOCK_PAYMENT_METHODS = [
  { id: 'pm_1', brand: 'Visa',       last4: '4242', expMonth: 12, expYear: 27, isDefault: true,  holder: 'Akhil Job Seeker' },
  { id: 'pm_2', brand: 'Mastercard', last4: '8801', expMonth: 8,  expYear: 26, isDefault: false, holder: 'Akhil Job Seeker' },
];

const MOCK_TRANSACTIONS = [
  { id: '#TX-8291', date: 'April 12, 2026',  description: 'Premium Pro Monthly Sub', amount:  499, status: 'success'  },
  { id: '#TX-8104', date: 'March 12, 2026',  description: 'Premium Pro Monthly Sub', amount:  499, status: 'success'  },
  { id: '#TX-7922', date: 'Feb 12, 2026',    description: 'Refund - Service Credit', amount: -199, status: 'refunded' },
];

const mockReturn = (data, ms = 350) =>
  new Promise((resolve) => setTimeout(() => resolve(data), ms));

// ── Component ───────────────────────────────────────────────────────────
const Billing = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [toast, setToast]     = useState(null);

  const [currentPlan, setCurrentPlan]   = useState(null);
  const [plans, setPlans]               = useState([]);
  const [paymentMethods, setPayment]    = useState([]);
  const [transactions, setTransactions] = useState([]);

  // Action menu (payment method)
  const [pmMenuAnchor, setPmMenuAnchor] = useState(null);
  const [pmMenuRow, setPmMenuRow]       = useState(null);

  // Dialogs
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradePlan, setUpgradePlan] = useState(null);
  const [upgrading, setUpgrading]     = useState(false);

  const [addCardOpen, setAddCardOpen] = useState(false);
  const [cardForm, setCardForm]       = useState({ number: '', name: '', exp: '', cvc: '' });
  const [addingCard, setAddingCard]   = useState(false);

  const toastTimer = useRef(null);

  // ── Load mock data ───────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    Promise.all([
      mockReturn(MOCK_CURRENT_PLAN),
      mockReturn(MOCK_PLANS),
      mockReturn(MOCK_PAYMENT_METHODS),
      mockReturn(MOCK_TRANSACTIONS),
    ])
      .then(([cp, pl, pm, tx]) => {
        setCurrentPlan(cp);
        setPlans(pl);
        setPayment(pm);
        setTransactions(tx);
      })
      .catch(() => setError('Failed to load billing information.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  // ── Helpers ─────────────────────────────────────────────────────────
  const flashToast = (msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  };

  // ── Handlers ─────────────────────────────────────────────────────────
  const openPmMenu  = (e, id) => { setPmMenuAnchor(e.currentTarget); setPmMenuRow(id); };
  const closePmMenu = ()       => { setPmMenuAnchor(null); setPmMenuRow(null); };

  const setDefaultCard = (id) => {
    setPayment((prev) => prev.map((p) => ({ ...p, isDefault: p.id === id })));
    closePmMenu();
    flashToast('Default card updated');
  };

  const removeCard = (id) => {
    setPayment((prev) => prev.filter((p) => p.id !== id));
    closePmMenu();
    flashToast('Card removed');
  };

  const choosePlan = (plan) => {
    if (plan.id === currentPlan.id) return;
    setUpgradePlan(plan);
    setUpgradeOpen(true);
  };

  const closeUpgrade = () => {
    if (upgrading) return;
    setUpgradeOpen(false);
    setUpgradePlan(null);
  };

  const confirmUpgrade = async () => {
    if (!upgradePlan) return;
    setUpgrading(true);
    await mockReturn(true, 600);
    setCurrentPlan((prev) => ({
      ...prev,
      id:    upgradePlan.id,
      name:  upgradePlan.name,
      badge: upgradePlan.popular ? 'PREMIUM' : 'STANDARD',
      price: upgradePlan.price,
      cycle: upgradePlan.cycle,
    }));
    setUpgrading(false);
    setUpgradeOpen(false);
    setUpgradePlan(null);
    flashToast(`Switched to ${upgradePlan.name}`);
  };

  const closeAddCard = () => {
    if (addingCard) return;
    setAddCardOpen(false);
    setCardForm({ number: '', name: '', exp: '', cvc: '' });
  };

  const submitAddCard = async () => {
    if (!cardForm.number || !cardForm.name || !cardForm.exp || !cardForm.cvc) return;
    setAddingCard(true);
    await mockReturn(true, 500);
    const last4 = cardForm.number.replace(/\s/g, '').slice(-4);
    const [m, y] = cardForm.exp.split('/').map((s) => s.trim());
    setPayment((prev) => [
      ...prev,
      {
        id:        `pm_${Date.now()}`,
        brand:     cardForm.number.startsWith('4') ? 'Visa' : 'Mastercard',
        last4,
        expMonth:  parseInt(m, 10) || 1,
        expYear:   parseInt(y, 10) || 27,
        isDefault: false,
        holder:    cardForm.name,
      },
    ]);
    setAddingCard(false);
    closeAddCard();
    flashToast('Card added successfully');
  };

  // ── Loading shell ────────────────────────────────────────────────────
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
        <CircularProgress sx={{ color: PRIMARY }} />
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative' }}>

      {/* ────────────────────────────────────────────────────────────── */}
      {/* PAGE HEADER (compact)                                          */}
      {/* ────────────────────────────────────────────────────────────── */}
      <Stack mb={3} direction="row" alignItems="center" spacing={1.5}>
        <Box sx={{
          width: 36, height: 36, borderRadius: 2,
          bgcolor: PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <ReceiptLongOutlined sx={{ color: '#fff', fontSize: 18 }} />
        </Box>
        <Box>
          <Typography variant="h5" fontWeight={700} sx={{ color: PRIMARY, letterSpacing: '-0.3px', lineHeight: 1.15 }}>
            Billing &amp; Subscription
          </Typography>
          <Typography variant="body2" sx={{ color: TEXT_MUTED, fontSize: '0.82rem' }}>
            Manage your plan, payment methods, and invoices
          </Typography>
        </Box>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      {/* ────────────────────────────────────────────────────────────── */}
      {/* CURRENT PLAN SUMMARY CARD                                      */}
      {/* ────────────────────────────────────────────────────────────── */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 4,
          bgcolor: CARD_BG,
          border: `1px solid ${BORDER}`,
          p: { xs: 2.5, md: 3.5 },
          mb: 4,
          boxShadow: '0 1px 3px rgba(30,51,88,0.04)',
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ xs: 'flex-start', md: 'center' }}
          justifyContent="space-between"
          spacing={{ xs: 2.5, md: 3 }}
        >
          {/* Left: icon + plan info */}
          <Stack direction="row" alignItems="center" spacing={2.5} sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{
              width: 64, height: 64, borderRadius: '50%',
              bgcolor: ACCENT_SOFT, color: ACCENT,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <CreditCardOutlined sx={{ fontSize: 28 }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Stack direction="row" alignItems="center" spacing={1.25} flexWrap="wrap" useFlexGap mb={0.5}>
                <Typography sx={{
                  color: TEXT_BODY,
                  fontSize: { xs: '1.15rem', md: '1.4rem' },
                  fontWeight: 800,
                  letterSpacing: '-0.4px',
                }}>
                  Current Plan:
                </Typography>
                <Typography sx={{
                  color: ACCENT,
                  fontSize: { xs: '1.15rem', md: '1.4rem' },
                  fontWeight: 800,
                  letterSpacing: '-0.4px',
                }}>
                  {currentPlan.name}
                </Typography>
                {currentPlan.badge && (
                  <Chip
                    label={currentPlan.badge}
                    size="small"
                    sx={{
                      bgcolor: '#F3F4F6', color: TEXT_SUBTLE,
                      fontWeight: 700, fontSize: '0.65rem',
                      letterSpacing: '0.08em', height: 22,
                      borderRadius: 1,
                    }}
                  />
                )}
              </Stack>
              <Typography sx={{
                color: TEXT_SUBTLE, fontSize: '0.92rem',
                fontStyle: 'italic',
              }}>
                Your next billing cycle starts on {currentPlan.nextBillingOn}
              </Typography>
            </Box>
          </Stack>

          {/* Right: action buttons */}
          <Stack
            direction="row"
            spacing={1.25}
            sx={{ width: { xs: '100%', md: 'auto' }, flexShrink: 0 }}
          >
            <Button
              fullWidth
              sx={{
                color: TEXT_BODY,
                bgcolor: '#fff',
                border: `1.5px solid ${BORDER}`,
                textTransform: 'none', fontWeight: 700,
                px: 2.75, py: 1.1, borderRadius: 50,
                fontSize: '0.88rem',
                whiteSpace: 'nowrap',
                '&:hover': { bgcolor: '#F8F7F4', borderColor: '#D1D5DB' },
              }}
            >
              Manage Billings
            </Button>
            <Button
              fullWidth
              onClick={() => {
                const popular = plans.find((p) => p.popular);
                if (popular) choosePlan(popular);
              }}
              sx={{
                bgcolor: ACCENT, color: '#fff',
                textTransform: 'none', fontWeight: 700,
                px: 2.75, py: 1.1, borderRadius: 50,
                fontSize: '0.88rem',
                boxShadow: 'none',
                whiteSpace: 'nowrap',
                '&:hover': { bgcolor: '#5B21B6', boxShadow: 'none' },
              }}
            >
              Upgrade Now
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* ────────────────────────────────────────────────────────────── */}
      {/* PRICING CARDS                                                  */}
      {/* ────────────────────────────────────────────────────────────── */}
      <Grid container spacing={2.5} mb={4}>
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlan.id;
          return (
            <Grid item xs={12} md={4} key={plan.id}>
              <Paper
                elevation={0}
                sx={{
                  position: 'relative',
                  borderRadius: 4,
                  border: plan.popular ? `1.5px solid ${ACCENT}` : `1px solid ${BORDER}`,
                  bgcolor: CARD_BG,
                  p: { xs: 2.75, md: 3.25 },
                  height: '100%',
                  display: 'flex', flexDirection: 'column',
                  overflow: 'hidden',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: plan.popular || isCurrent ? 'none' : 'translateY(-2px)',
                    boxShadow: plan.popular ? `0 8px 24px ${ACCENT}18` : '0 4px 12px rgba(30,51,88,0.06)',
                  },
                }}
              >
                {/* Best Value corner ribbon (popular) */}
                {plan.popular && (
                  <Box sx={{
                    position: 'absolute',
                    top: 0, right: 0,
                    width: 110, height: 110,
                    overflow: 'hidden',
                    pointerEvents: 'none',
                  }}>
                    <Box sx={{
                      position: 'absolute',
                      top: 18, right: -32,
                      transform: 'rotate(45deg)',
                      bgcolor: ACCENT,
                      color: '#fff',
                      width: 140,
                      py: 0.65,
                      textAlign: 'center',
                      fontSize: '0.6rem',
                      fontWeight: 800,
                      letterSpacing: '0.12em',
                      boxShadow: `0 2px 8px ${ACCENT}50`,
                    }}>
                      BEST VALUE
                    </Box>
                  </Box>
                )}

                {/* Plan name */}
                <Typography sx={{
                  color: plan.popular ? ACCENT : TEXT_MUTED,
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  mb: 1.5,
                }}>
                  {plan.name}
                </Typography>

                {/* Price */}
                <Stack direction="row" alignItems="baseline" spacing={0.5} mb={3}>
                  <Typography sx={{
                    color: TEXT_BODY,
                    fontSize: { xs: '2.4rem', md: '2.8rem' },
                    fontWeight: 800,
                    letterSpacing: '-1.5px',
                    lineHeight: 1,
                  }}>
                    ₹{plan.price.toLocaleString('en-IN')}
                  </Typography>
                  <Typography sx={{
                    color: TEXT_MUTED,
                    fontSize: '0.95rem',
                    fontWeight: 500,
                  }}>
                    /{plan.cycle}
                  </Typography>
                </Stack>

                {/* Features */}
                <Stack spacing={1.5} sx={{ flex: 1, mb: 3 }}>
                  {plan.features.map((f, i) => (
                    <Stack key={i} direction="row" alignItems="center" spacing={1.25}>
                      <Box sx={{
                        width: 20, height: 20, borderRadius: '50%',
                        border: `1.5px solid ${plan.popular ? ACCENT : SUCCESS}`,
                        color: plan.popular ? ACCENT : SUCCESS,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <CheckCircleOutlined sx={{ fontSize: 18 }} />
                      </Box>
                      <Typography sx={{
                        color: TEXT_BODY,
                        fontSize: '0.9rem',
                        fontWeight: 500,
                      }}>
                        {f}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>

                {/* CTA button */}
                <Button
                  fullWidth
                  disabled={isCurrent}
                  onClick={() => choosePlan(plan)}
                  sx={{
                    bgcolor: isCurrent ? '#F3F4F6' : PRIMARY,
                    color:   isCurrent ? TEXT_MUTED : '#fff',
                    textTransform: 'none', fontWeight: 700,
                    py: 1.4, borderRadius: 50,
                    fontSize: '0.95rem',
                    boxShadow: 'none',
                    '&:hover': {
                      bgcolor: isCurrent ? '#F3F4F6' : '#162847',
                      boxShadow: 'none',
                    },
                    '&.Mui-disabled': {
                      bgcolor: '#F3F4F6',
                      color: TEXT_MUTED,
                    },
                  }}
                >
                  {isCurrent ? 'Current Plan' : 'Choose Plan'}
                </Button>
              </Paper>
            </Grid>
          );
        })}
      </Grid>

    

      {/* ────────────────────────────────────────────────────────────── */}
      {/* RECENT TRANSACTIONS                                            */}
      {/* ────────────────────────────────────────────────────────────── */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 4,
          bgcolor: CARD_BG,
          border: `1px solid ${BORDER}`,
          overflow: 'hidden',
        }}
      >
        <Box sx={{
          px: { xs: 2.5, md: 3.5 }, py: 2.75,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 2, flexWrap: 'wrap',
        }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{
              width: 36, height: 36, borderRadius: '50%',
              bgcolor: ACCENT_SOFT, color: ACCENT,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <HistoryOutlined sx={{ fontSize: 19 }} />
            </Box>
            <Typography fontWeight={800} sx={{
              color: TEXT_BODY, fontSize: '1.15rem', letterSpacing: '-0.3px',
            }}>
              Recent Transactions
            </Typography>
          </Stack>
          <Button
            onClick={() => flashToast('Statement download started')}
            sx={{
              color: ACCENT,
              textTransform: 'none', fontWeight: 700,
              fontSize: '0.85rem',
              px: 0,
              minWidth: 0,
              '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' },
            }}
          >
            Download Statement
          </Button>
        </Box>

        {transactions.length === 0 ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: TEXT_MUTED }}>
              No transactions yet.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow sx={{
                  '& th': {
                    color: TEXT_MUTED,
                    fontWeight: 700, fontSize: '0.7rem',
                    letterSpacing: '0.12em', textTransform: 'uppercase',
                    py: 2,
                    borderTop: `1px solid ${BORDER_SOFT}`,
                    borderBottom: `1px solid ${BORDER_SOFT}`,
                  },
                }}>
                  <TableCell sx={{ pl: { xs: 2.5, md: 3.5 } }}>Transaction ID</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell align="right" sx={{ pr: { xs: 2.5, md: 3.5 } }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transactions.map((tx) => {
                  const isRefund = tx.amount < 0;
                  const statusCfg = tx.status === 'success'
                    ? { label: 'SUCCESS',  bg: SUCCESS_SOFT, color: SUCCESS }
                    : tx.status === 'refunded'
                      ? { label: 'REFUNDED', bg: WARN_SOFT,    color: WARN }
                      : { label: 'PENDING',  bg: '#F3F4F6',    color: TEXT_SUBTLE };

                  return (
                    <TableRow
                      key={tx.id}
                      sx={{
                        '&:hover': { bgcolor: '#FAFBFC' },
                        '& td': {
                          borderBottom: `1px solid ${BORDER_SOFT}`,
                          py: 2.25,
                        },
                        '&:last-child td': { borderBottom: 'none' },
                      }}
                    >
                      <TableCell sx={{ pl: { xs: 2.5, md: 3.5 } }}>
                        <Typography fontWeight={700} sx={{ color: TEXT_BODY, fontSize: '0.92rem' }}>
                          {tx.id}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ color: TEXT_BODY, fontSize: '0.88rem', fontWeight: 500 }}>
                          {tx.date}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ color: TEXT_BODY, fontSize: '0.88rem', fontWeight: 500 }}>
                          {tx.description}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight={800} sx={{
                          color: isRefund ? WARN : TEXT_BODY,
                          fontSize: '0.95rem',
                          letterSpacing: '-0.2px',
                        }}>
                          {isRefund ? '-' : ''}₹{Math.abs(tx.amount).toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ pr: { xs: 2.5, md: 3.5 } }}>
                        <Chip
                          label={statusCfg.label}
                          size="small"
                          sx={{
                            bgcolor: statusCfg.bg,
                            color: statusCfg.color,
                            fontWeight: 800,
                            fontSize: '0.65rem',
                            letterSpacing: '0.08em',
                            height: 22,
                            borderRadius: 1,
                            px: 0.5,
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        )}
      </Paper>

      {/* ────────────────────────────────────────────────────────────── */}
      {/* TOAST                                                          */}
      {/* ────────────────────────────────────────────────────────────── */}
      <Slide direction="up" in={!!toast} mountOnEnter unmountOnExit>
        <Paper
          elevation={0}
          sx={{
            position: 'fixed',
            bottom: { xs: 24, md: 32 },
            right:  { xs: 24, md: 32 },
            zIndex: 1400,
            bgcolor: PRIMARY, color: '#fff',
            borderRadius: 2.5,
            px: 2, py: 1.25,
            display: 'flex', alignItems: 'center', gap: 1,
            boxShadow: '0 12px 32px rgba(30,51,88,0.25)',
            minWidth: 200,
          }}
        >
          <Box sx={{
            width: 22, height: 22, borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CheckCircleOutlined sx={{ fontSize: 14, color: '#fff' }} />
          </Box>
          <Typography fontWeight={600} sx={{ color: '#fff', fontSize: '0.85rem' }}>
            {toast}
          </Typography>
        </Paper>
      </Slide>

      {/* ────────────────────────────────────────────────────────────── */}
      {/* UPGRADE CONFIRMATION DIALOG                                    */}
      {/* ────────────────────────────────────────────────────────────── */}
      <Dialog
        open={upgradeOpen}
        onClose={closeUpgrade}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          elevation: 0,
          sx: { borderRadius: 3, border: `1px solid ${BORDER}`, overflow: 'hidden' },
        }}
      >
        {upgradePlan && (
          <>
            <DialogContent sx={{ p: 3, pt: 4, textAlign: 'center' }}>
              <Box sx={{
                width: 64, height: 64, borderRadius: '50%',
                bgcolor: `${upgradePlan.accent}15`,
                color: upgradePlan.accent,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                mx: 'auto', mb: 2,
                border: `1px solid ${upgradePlan.accent}25`,
              }}>
                <CreditCardOutlined sx={{ fontSize: 30 }} />
              </Box>
              <Typography fontWeight={800} sx={{ color: TEXT_BODY, fontSize: '1.15rem', mb: 0.5, letterSpacing: '-0.3px' }}>
                Switch to {upgradePlan.name}?
              </Typography>
              <Typography variant="body2" sx={{ color: TEXT_SUBTLE, mb: 2.5, fontSize: '0.88rem' }}>
                You'll be charged{' '}
                <strong style={{ color: TEXT_BODY }}>
                  ₹{upgradePlan.price.toLocaleString('en-IN')}
                </strong>
                /{upgradePlan.cycle}. Changes apply immediately.
              </Typography>
              <Box sx={{
                p: 2, bgcolor: ACCENT_TINT,
                border: `1px solid ${ACCENT}20`,
                borderRadius: 2, textAlign: 'left',
              }}>
                <Typography variant="caption" sx={{ color: ACCENT, fontWeight: 800, letterSpacing: '0.12em', fontSize: '0.66rem' }}>
                  YOU'LL GET
                </Typography>
                <Stack spacing={0.85} mt={1}>
                  {upgradePlan.features.slice(0, 4).map((f, i) => (
                    <Stack key={i} direction="row" alignItems="center" spacing={1}>
                      <Box sx={{
                        width: 18, height: 18, borderRadius: '50%',
                        border: `1.5px solid ${upgradePlan.accent}`,
                        color: upgradePlan.accent,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <CheckCircleOutlined sx={{ fontSize: 14 }} />
                      </Box>
                      <Typography sx={{ color: TEXT_BODY, fontSize: '0.85rem', fontWeight: 500 }}>
                        {f}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${BORDER_SOFT}`, gap: 1 }}>
              <Button
                onClick={closeUpgrade}
                disabled={upgrading}
                fullWidth
                sx={{
                  color: TEXT_SUBTLE, textTransform: 'none', fontWeight: 700,
                  borderRadius: 50, py: 1,
                  border: `1.5px solid ${BORDER}`,
                  '&:hover': { bgcolor: '#F3F4F6' },
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={confirmUpgrade}
                disabled={upgrading}
                fullWidth
                startIcon={upgrading ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : null}
                sx={{
                  bgcolor: ACCENT, color: '#fff',
                  textTransform: 'none', fontWeight: 700,
                  borderRadius: 50, py: 1,
                  boxShadow: 'none',
                  '&:hover': { bgcolor: '#5B21B6', boxShadow: 'none' },
                }}
              >
                {upgrading ? 'Processing…' : 'Confirm'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ────────────────────────────────────────────────────────────── */}
      {/* ADD CARD DIALOG                                                */}
      {/* ────────────────────────────────────────────────────────────── */}
      <Dialog
        open={addCardOpen}
        onClose={closeAddCard}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          elevation: 0,
          sx: { borderRadius: 3, border: `1px solid ${BORDER}`, overflow: 'hidden' },
        }}
      >
        <DialogTitle sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          py: 2, px: 3, borderBottom: `1px solid ${BORDER_SOFT}`,
        }}>
          <Stack direction="row" alignItems="center" spacing={1.25}>
            <Box sx={{
              width: 32, height: 32, borderRadius: 1.5,
              bgcolor: ACCENT_SOFT, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <AddCardOutlined sx={{ color: ACCENT, fontSize: 17 }} />
            </Box>
            <Box>
              <Typography fontWeight={800} sx={{ color: TEXT_BODY, fontSize: '1rem', lineHeight: 1.2 }}>
                Add Payment Method
              </Typography>
              <Typography variant="caption" sx={{ color: TEXT_MUTED }}>
                Securely save a new card
              </Typography>
            </Box>
          </Stack>
          <IconButton
            onClick={closeAddCard}
            disabled={addingCard}
            size="small"
            sx={{ color: TEXT_MUTED, '&:hover': { color: ACCENT, bgcolor: ACCENT_SOFT } }}
          >
            <Close sx={{ fontSize: 18 }} />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 3, pt: '24px !important' }}>
          {/* Card preview */}
          <Box sx={{
            background: PRIMARY_GRAD,
            borderRadius: 2.5,
            p: 2.5,
            mb: 2.5,
            color: '#fff',
            boxShadow: '0 8px 24px rgba(30,51,88,0.18)',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <Box sx={{
              position: 'absolute', top: -40, right: -40,
              width: 140, height: 140, borderRadius: '50%',
              bgcolor: 'rgba(255,255,255,0.06)',
            }} />
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={3}>
              <CreditCardOutlined sx={{ color: '#fff', fontSize: 26 }} />
              <Typography sx={{ color: '#fff', fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.08em' }}>
                {cardForm.number.startsWith('4') ? 'VISA' : cardForm.number.startsWith('5') ? 'MASTERCARD' : 'CARD'}
              </Typography>
            </Stack>
            <Typography sx={{
              color: '#fff', fontSize: '1.1rem', fontWeight: 700,
              letterSpacing: '0.15em', mb: 2, fontFamily: 'monospace',
            }}>
              {cardForm.number || '•••• •••• •••• ••••'}
            </Typography>
            <Stack direction="row" justifyContent="space-between">
              <Box>
                <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em' }}>
                  CARDHOLDER
                </Typography>
                <Typography sx={{ color: '#fff', fontSize: '0.78rem', fontWeight: 600, mt: 0.25 }}>
                  {cardForm.name || 'YOUR NAME'}
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em' }}>
                  EXPIRES
                </Typography>
                <Typography sx={{ color: '#fff', fontSize: '0.78rem', fontWeight: 600, mt: 0.25 }}>
                  {cardForm.exp || 'MM/YY'}
                </Typography>
              </Box>
            </Stack>
          </Box>

          <Stack spacing={2}>
            <TextField
              label="Card Number"
              placeholder="1234 5678 9012 3456"
              value={cardForm.number}
              onChange={(e) => setCardForm((p) => ({ ...p, number: e.target.value }))}
              size="small" fullWidth required
              disabled={addingCard}
            />
            <TextField
              label="Cardholder Name"
              value={cardForm.name}
              onChange={(e) => setCardForm((p) => ({ ...p, name: e.target.value }))}
              size="small" fullWidth required
              disabled={addingCard}
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Expiry (MM/YY)"
                placeholder="12/27"
                value={cardForm.exp}
                onChange={(e) => setCardForm((p) => ({ ...p, exp: e.target.value }))}
                size="small" fullWidth required
                disabled={addingCard}
              />
              <TextField
                label="CVC"
                placeholder="123"
                value={cardForm.cvc}
                onChange={(e) => setCardForm((p) => ({ ...p, cvc: e.target.value }))}
                size="small" fullWidth required
                disabled={addingCard}
              />
            </Stack>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${BORDER_SOFT}`, gap: 1 }}>
          <Button
            onClick={closeAddCard}
            disabled={addingCard}
            sx={{
              color: TEXT_SUBTLE, textTransform: 'none', fontWeight: 700,
              px: 2.5, borderRadius: 50,
              '&:hover': { bgcolor: '#F3F4F6' },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={submitAddCard}
            disabled={addingCard}
            startIcon={addingCard ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : null}
            sx={{
              bgcolor: ACCENT, color: '#fff',
              textTransform: 'none', fontWeight: 700,
              px: 2.5, borderRadius: 50, boxShadow: 'none',
              '&:hover': { bgcolor: '#5B21B6', boxShadow: 'none' },
            }}
          >
            {addingCard ? 'Saving…' : 'Save Card'}
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default Billing;