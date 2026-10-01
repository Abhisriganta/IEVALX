

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Box, Paper, Typography, Stack, Switch, CircularProgress, Alert, Divider,
  Button, IconButton, Radio, RadioGroup, FormControlLabel, Slide,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Chip,
  useMediaQuery, useTheme,
} from '@mui/material';
import {
  ShieldOutlined, NotificationsOutlined, VisibilityOutlined,
  StorageOutlined, DeleteForeverOutlined, MailOutlined, WorkOutlined,
  CalendarTodayOutlined, CampaignOutlined, DownloadOutlined,
  ExitToAppOutlined, WarningAmberRounded, Close, CheckCircleOutlined,
  PublicOutlined, BusinessOutlined, LockOutlined,
  TuneOutlined, DevicesOutlined, MarkEmailReadOutlined,
  KeyboardArrowRightOutlined, FiberManualRecord, AutoAwesomeOutlined,
} from '@mui/icons-material';

const PRIMARY      = '#1E3358';
const PRIMARY_SOFT = 'rgba(30,51,88,0.08)';
const PRIMARY_GRAD = 'linear-gradient(135deg, #1E3358 0%, #2A4574 100%)';
const SUCCESS      = '#1A7A4A';
const SUCCESS_SOFT = 'rgba(26,122,74,0.10)';
const ACCENT       = '#6D28D9';
const DANGER       = '#B91C1C';
const DANGER_SOFT  = 'rgba(185,28,28,0.08)';
const TEXT_MUTED   = '#9CA3AF';
const BORDER       = '#E5E7EB';
const BORDER_SOFT  = '#F3F4F6';

// ── MOCK DATA ────────────────────────────────────────────────────────────
const MOCK_SETTINGS = {
  notifications: {
    emailDigest:        true,
    applicationUpdates: true,
    interviewReminders: true,
    newJobMatches:      true,
    productUpdates:     false,
    marketingEmails:    false,
  },
  visibility: {
    profileVisibility: 'employers',
    showInSearch:      true,
    showContactInfo:   false,
  },
  activeSessions: 2,
  accountEmail:   'akhil@example.com',
};

const mockReturn = (data, ms = 350) =>
  new Promise((resolve) => setTimeout(() => resolve(data), ms));

const ACTIVITY_NOTIFS = [
  { key: 'applicationUpdates', label: 'Application updates',  description: 'When your application status changes',          icon: WorkOutlined          },
  { key: 'interviewReminders', label: 'Interview reminders',  description: 'Reminders before your scheduled interviews',    icon: CalendarTodayOutlined },
  { key: 'newJobMatches',      label: 'New job matches',      description: 'Daily roundup of jobs matching your profile',   icon: AutoAwesomeOutlined   },
  { key: 'emailDigest',        label: 'Weekly email digest',  description: 'Summary of your activity every Monday',         icon: MarkEmailReadOutlined },
];

const MARKETING_NOTIFS = [
  { key: 'productUpdates',  label: 'Product updates',  description: 'New features and improvements',         icon: CampaignOutlined },
  { key: 'marketingEmails', label: 'Marketing emails', description: 'Tips, guides, and offers from iEvalX',  icon: MailOutlined     },
];

const VISIBILITY_OPTIONS = [
  {
    value: 'public', label: 'Public',
    description: 'Anyone can find your profile',
    icon: PublicOutlined,
    accent: '#0EA5E9',
  },
  {
    value: 'employers', label: 'Employers only',
    description: 'Verified employers can view your profile',
    icon: BusinessOutlined,
    accent: PRIMARY,
  },
  {
    value: 'hidden', label: 'Hidden',
    description: 'Your profile is invisible to everyone',
    icon: LockOutlined,
    accent: '#6B7280',
  },
];

const SECTIONS = [
  { id: 'notifications', label: 'Notifications', icon: NotificationsOutlined },
  { id: 'visibility',    label: 'Visibility',    icon: VisibilityOutlined    },
  { id: 'data',          label: 'Data & Privacy', icon: StorageOutlined      },
  { id: 'danger',        label: 'Danger Zone',   icon: WarningAmberRounded   },
];

// ── Reusable: Section Card ──────────────────────────────────────────────
const SectionCard = ({ id, icon: Icon, iconColor = PRIMARY, iconBg = PRIMARY_SOFT, title, subtitle, count, danger = false, children }) => (
  <Paper
    id={id}
    elevation={0}
    sx={{
      borderRadius: 3,
      border: danger ? `1.5px solid ${DANGER}30` : `1px solid ${BORDER}`,
      bgcolor: danger ? 'rgba(185,28,28,0.015)' : '#fff',
      mb: 3,
      overflow: 'hidden',
      scrollMarginTop: 24,
      transition: 'border-color 0.2s, box-shadow 0.2s',
      '&:hover': { boxShadow: '0 1px 4px rgba(30,51,88,0.04)' },
    }}
  >
    <Box sx={{
      px: 3, py: 2.25,
      borderBottom: danger ? `1px solid ${DANGER}20` : `1px solid ${BORDER_SOFT}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 2,
    }}>
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <Box sx={{
          width: 38, height: 38, borderRadius: 2,
          bgcolor: iconBg, color: iconColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon sx={{ fontSize: 19 }} />
        </Box>
        <Box>
          <Typography fontWeight={700} sx={{
            color: danger ? DANGER : PRIMARY,
            fontSize: '1rem',
            letterSpacing: '-0.2px',
            lineHeight: 1.2,
          }}>
            {title}
          </Typography>
          <Typography variant="body2" sx={{ color: TEXT_MUTED, fontSize: '0.8rem', mt: 0.2 }}>
            {subtitle}
          </Typography>
        </Box>
      </Stack>

      {typeof count !== 'undefined' && (
        <Chip
          label={count}
          size="small"
          sx={{
            bgcolor: PRIMARY_SOFT, color: PRIMARY,
            fontWeight: 700, fontSize: '0.72rem',
            height: 24, minWidth: 32,
          }}
        />
      )}
    </Box>
    {children}
  </Paper>
);

// ── Reusable: Notification Row ──────────────────────────────────────────
const NotifRow = ({ item, on, onToggle, saving }) => {
  const Icon = item.icon;
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      spacing={2}
      sx={{
        px: 3, py: 2,
        transition: 'background-color 0.15s',
        '&:hover': { bgcolor: '#FAFBFC' },
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.75} sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{
          width: 38, height: 38, borderRadius: 1.75,
          bgcolor: on ? PRIMARY_SOFT : '#F8F9FA',
          color:   on ? PRIMARY      : '#C4C9D4',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          border: on ? `1px solid ${PRIMARY}20` : '1px solid transparent',
        }}>
          <Icon sx={{ fontSize: 18 }} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" alignItems="center" spacing={0.75}>
            <Typography fontWeight={600} sx={{ color: PRIMARY, fontSize: '0.9rem', lineHeight: 1.3 }}>
              {item.label}
            </Typography>
            {on && (
              <FiberManualRecord sx={{ fontSize: 7, color: SUCCESS, ml: 0.25 }} />
            )}
          </Stack>
          <Typography variant="caption" sx={{ color: TEXT_MUTED, fontSize: '0.76rem' }}>
            {item.description}
          </Typography>
        </Box>
      </Stack>
      <Switch
        checked={on}
        onChange={() => onToggle(item.key)}
        disabled={saving}
        sx={{
          '& .MuiSwitch-switchBase.Mui-checked':                      { color: PRIMARY },
          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track':   { bgcolor: PRIMARY, opacity: 1 },
          '& .MuiSwitch-track':                                        { bgcolor: '#D1D5DB', opacity: 1 },
        }}
      />
    </Stack>
  );
};

// ── Component ───────────────────────────────────────────────────────────
const Settings = () => {
  const theme    = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [savedFlash, setSavedFlash] = useState(false);
  const [activeSection, setActiveSection] = useState('notifications');

  const [notifications, setNotifications]   = useState({});
  const [visibility, setVisibility]         = useState({});
  const [accountEmail, setAccountEmail]     = useState('');
  const [activeSessions, setActiveSessions] = useState(0);

  // Dialogs
  const [downloadOpen, setDownloadOpen]   = useState(false);
  const [downloading, setDownloading]     = useState(false);
  const [signOutOpen, setSignOutOpen]     = useState(false);
  const [signingOutAll, setSigningOutAll] = useState(false);
  const [deleteOpen, setDeleteOpen]       = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting]           = useState(false);

  const flashTimer = useRef(null);

  // ── Load mock settings ───────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    mockReturn(MOCK_SETTINGS)
      .then((s) => {
        setNotifications(s.notifications);
        setVisibility(s.visibility);
        setAccountEmail(s.accountEmail);
        setActiveSessions(s.activeSessions);
      })
      .catch(() => setError('Failed to load settings.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => () => clearTimeout(flashTimer.current), []);

  // ── Derived counts for header ────────────────────────────────────────
  const notifsEnabled = useMemo(
    () => Object.values(notifications).filter(Boolean).length,
    [notifications]
  );
  const totalNotifs   = ACTIVITY_NOTIFS.length + MARKETING_NOTIFS.length;
  const activityOn    = useMemo(
    () => ACTIVITY_NOTIFS.filter((i) => notifications[i.key]).length,
    [notifications]
  );
  const marketingOn   = useMemo(
    () => MARKETING_NOTIFS.filter((i) => notifications[i.key]).length,
    [notifications]
  );

  const visibilityLabel = VISIBILITY_OPTIONS.find(
    (o) => o.value === visibility.profileVisibility
  )?.label || '—';

  // ── Handlers ─────────────────────────────────────────────────────────
  const flashSaved = () => {
    setSavedFlash(true);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setSavedFlash(false), 2000);
  };

  const toggleNotif = async (key) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
    setSaving(true);
    await mockReturn(true, 250);
    setSaving(false);
    flashSaved();
  };

  const onVisibilityChange = async (e) => {
    setVisibility((prev) => ({ ...prev, profileVisibility: e.target.value }));
    setSaving(true);
    await mockReturn(true, 250);
    setSaving(false);
    flashSaved();
  };

  const toggleVisibilityFlag = async (key) => {
    setVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
    setSaving(true);
    await mockReturn(true, 250);
    setSaving(false);
    flashSaved();
  };

  const handleDownloadData = async () => {
    setDownloading(true);
    await mockReturn(true, 800);
    setDownloading(false);
    setDownloadOpen(false);
  };

  const handleSignOutAll = async () => {
    setSigningOutAll(true);
    await mockReturn(true, 600);
    setActiveSessions(1);
    setSigningOutAll(false);
    setSignOutOpen(false);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm.trim().toUpperCase() !== 'DELETE') return;
    setDeleting(true);
    await mockReturn(true, 800);
    setDeleting(false);
    setDeleteOpen(false);
    setDeleteConfirm('');
  };

  const scrollTo = (id) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
      {/* HERO HEADER                                                    */}
      {/* ────────────────────────────────────────────────────────────── */}
      <Paper elevation={0} sx={{
        position: 'relative',
        borderRadius: 3,
        background: PRIMARY_GRAD,
        color: '#fff',
        p: { xs: 2.5, md: 3.5 },
        mb: 3,
        overflow: 'hidden',
      }}>
        {/* decorative blobs */}
        <Box sx={{
          position: 'absolute', top: -80, right: -80,
          width: 260, height: 260, borderRadius: '50%',
          bgcolor: 'rgba(255,255,255,0.05)',
        }} />
        <Box sx={{
          position: 'absolute', bottom: -120, left: '40%',
          width: 280, height: 280, borderRadius: '50%',
          bgcolor: 'rgba(255,255,255,0.03)',
        }} />

        <Box sx={{ position: 'relative' }}>
          <Stack direction="row" alignItems="center" spacing={1.5} mb={1.5}>
            <Box sx={{
              width: 44, height: 44, borderRadius: 2.5,
              bgcolor: 'rgba(255,255,255,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(8px)',
            }}>
              <ShieldOutlined sx={{ color: '#fff', fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={700} sx={{ color: '#fff', letterSpacing: '-0.5px', lineHeight: 1.15 }}>
                Settings
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.85rem' }}>
                Control your privacy, notifications, and account
              </Typography>
            </Box>
          </Stack>

          {/* Quick stats */}
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mt={2.5}>
            <Chip
              icon={<NotificationsOutlined sx={{ fontSize: 14, color: '#fff !important' }} />}
              label={`${notifsEnabled}/${totalNotifs} notifications on`}
              size="small"
              sx={{
                bgcolor: 'rgba(255,255,255,0.18)', color: '#fff',
                fontWeight: 600, fontSize: '0.74rem',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.12)',
                '& .MuiChip-icon': { ml: 0.75 },
              }}
            />
            <Chip
              icon={<VisibilityOutlined sx={{ fontSize: 14, color: '#fff !important' }} />}
              label={`Profile: ${visibilityLabel}`}
              size="small"
              sx={{
                bgcolor: 'rgba(255,255,255,0.18)', color: '#fff',
                fontWeight: 600, fontSize: '0.74rem',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.12)',
                '& .MuiChip-icon': { ml: 0.75 },
              }}
            />
            <Chip
              icon={<DevicesOutlined sx={{ fontSize: 14, color: '#fff !important' }} />}
              label={`${activeSessions} active ${activeSessions === 1 ? 'device' : 'devices'}`}
              size="small"
              sx={{
                bgcolor: 'rgba(255,255,255,0.18)', color: '#fff',
                fontWeight: 600, fontSize: '0.74rem',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.12)',
                '& .MuiChip-icon': { ml: 0.75 },
              }}
            />
          </Stack>
        </Box>
      </Paper>

      {/* ────────────────────────────────────────────────────────────── */}
      {/* STICKY SECTION NAV                                             */}
      {/* ────────────────────────────────────────────────────────────── */}
      <Box sx={{
        position: 'sticky',
        top: 0,
        zIndex: 5,
        bgcolor: '#FAFAFA',
        py: 1.5,
        mb: 2,
        mx: { xs: -1.5, sm: -2, md: -3 },
        px: { xs: 1.5, sm: 2, md: 3 },
        borderBottom: `1px solid ${BORDER_SOFT}`,
      }}>
        <Stack
          direction="row"
          spacing={1}
          sx={{
            overflowX: 'auto',
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const isActive = activeSection === s.id;
            const isDanger = s.id === 'danger';
            return (
              <Chip
                key={s.id}
                icon={<Icon sx={{ fontSize: 15, color: 'inherit !important' }} />}
                label={s.label}
                clickable
                onClick={() => scrollTo(s.id)}
                sx={{
                  bgcolor: isActive
                    ? (isDanger ? DANGER_SOFT : PRIMARY_SOFT)
                    : '#fff',
                  color: isActive
                    ? (isDanger ? DANGER : PRIMARY)
                    : '#6B7280',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.78rem',
                  height: 32,
                  px: 0.5,
                  border: isActive
                    ? `1.5px solid ${isDanger ? DANGER : PRIMARY}`
                    : `1.5px solid ${BORDER}`,
                  flexShrink: 0,
                  '&:hover': {
                    bgcolor: isDanger ? DANGER_SOFT : PRIMARY_SOFT,
                    color: isDanger ? DANGER : PRIMARY,
                  },
                  '& .MuiChip-icon': { ml: 0.75 },
                }}
              />
            );
          })}
        </Stack>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      {/* ────────────────────────────────────────────────────────────── */}
      {/* SECTION: NOTIFICATIONS                                         */}
      {/* ────────────────────────────────────────────────────────────── */}
      <SectionCard
        id="notifications"
        icon={NotificationsOutlined}
        title="Notifications"
        subtitle="Choose what you want to hear about"
        count={`${notifsEnabled}/${totalNotifs}`}
      >
        {/* Activity sub-group */}
        <Box sx={{ px: 3, pt: 2, pb: 0.5 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography sx={{
              fontSize: '0.7rem', fontWeight: 700,
              color: TEXT_MUTED, letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}>
              Activity &amp; Updates
            </Typography>
            <Typography sx={{ fontSize: '0.72rem', color: TEXT_MUTED, fontWeight: 600 }}>
              {activityOn} of {ACTIVITY_NOTIFS.length} on
            </Typography>
          </Stack>
        </Box>
        <Stack divider={<Divider sx={{ borderColor: BORDER_SOFT, ml: 3 }} />}>
          {ACTIVITY_NOTIFS.map((item) => (
            <NotifRow
              key={item.key}
              item={item}
              on={!!notifications[item.key]}
              onToggle={toggleNotif}
              saving={saving}
            />
          ))}
        </Stack>

        <Divider sx={{ borderColor: BORDER_SOFT }} />

        {/* Marketing sub-group */}
        <Box sx={{ px: 3, pt: 2, pb: 0.5 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography sx={{
              fontSize: '0.7rem', fontWeight: 700,
              color: TEXT_MUTED, letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}>
              Marketing &amp; Communications
            </Typography>
            <Typography sx={{ fontSize: '0.72rem', color: TEXT_MUTED, fontWeight: 600 }}>
              {marketingOn} of {MARKETING_NOTIFS.length} on
            </Typography>
          </Stack>
        </Box>
        <Stack divider={<Divider sx={{ borderColor: BORDER_SOFT, ml: 3 }} />}>
          {MARKETING_NOTIFS.map((item) => (
            <NotifRow
              key={item.key}
              item={item}
              on={!!notifications[item.key]}
              onToggle={toggleNotif}
              saving={saving}
            />
          ))}
        </Stack>
      </SectionCard>

      {/* ────────────────────────────────────────────────────────────── */}
      {/* SECTION: PROFILE VISIBILITY                                    */}
      {/* ────────────────────────────────────────────────────────────── */}
      <SectionCard
        id="visibility"
        icon={VisibilityOutlined}
        iconColor={ACCENT}
        iconBg="rgba(109,40,217,0.10)"
        title="Profile Visibility"
        subtitle="Decide who can see your profile and contact details"
      >
        <Box sx={{ p: 3 }}>
          <RadioGroup value={visibility.profileVisibility || ''} onChange={onVisibilityChange}>
            <Stack spacing={1.25}>
              {VISIBILITY_OPTIONS.map((opt) => {
                const Icon   = opt.icon;
                const active = visibility.profileVisibility === opt.value;
                return (
                  <Box
                    key={opt.value}
                    onClick={() => !saving && onVisibilityChange({ target: { value: opt.value } })}
                    sx={{
                      cursor: saving ? 'default' : 'pointer',
                      borderRadius: 2.5,
                      border: active
                        ? `1.5px solid ${opt.accent}`
                        : `1.5px solid ${BORDER}`,
                      bgcolor: active ? `${opt.accent}08` : '#fff',
                      transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
                      position: 'relative',
                      overflow: 'hidden',
                      '&:hover': {
                        borderColor: opt.accent,
                        bgcolor: `${opt.accent}06`,
                        transform: saving ? 'none' : 'translateY(-1px)',
                        boxShadow: saving ? 'none' : `0 4px 12px ${opt.accent}15`,
                      },
                    }}
                  >
                    {/* Accent stripe when active */}
                    {active && (
                      <Box sx={{
                        position: 'absolute', left: 0, top: 0, bottom: 0,
                        width: 3, bgcolor: opt.accent,
                      }} />
                    )}

                    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ p: 1.75, pl: 2 }}>
                      <Box sx={{
                        width: 42, height: 42, borderRadius: 2,
                        bgcolor: active ? opt.accent : `${opt.accent}10`,
                        color:   active ? '#fff'    : opt.accent,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                        transition: 'all 0.2s',
                        boxShadow: active ? `0 4px 10px ${opt.accent}30` : 'none',
                      }}>
                        <Icon sx={{ fontSize: 20 }} />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography fontWeight={700} sx={{
                          color: active ? opt.accent : PRIMARY,
                          fontSize: '0.92rem',
                          lineHeight: 1.25,
                        }}>
                          {opt.label}
                        </Typography>
                        <Typography variant="caption" sx={{ color: TEXT_MUTED, fontSize: '0.78rem' }}>
                          {opt.description}
                        </Typography>
                      </Box>
                      <Radio
                        value={opt.value}
                        disabled={saving}
                        sx={{
                          color: '#D1D5DB',
                          '&.Mui-checked': { color: opt.accent },
                          p: 0.5,
                        }}
                      />
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          </RadioGroup>

          <Divider sx={{ borderColor: BORDER_SOFT, my: 2.5 }} />

          {/* Sub-toggles */}
          <Stack spacing={2.5}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography fontWeight={600} sx={{ color: PRIMARY, fontSize: '0.88rem' }}>
                  Appear in search results
                </Typography>
                <Typography variant="caption" sx={{ color: TEXT_MUTED, fontSize: '0.76rem' }}>
                  Let employers find you when they search for talent
                </Typography>
              </Box>
              <Switch
                checked={!!visibility.showInSearch}
                onChange={() => toggleVisibilityFlag('showInSearch')}
                disabled={saving}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked':                    { color: PRIMARY },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: PRIMARY, opacity: 1 },
                  '& .MuiSwitch-track':                                      { bgcolor: '#D1D5DB', opacity: 1 },
                }}
              />
            </Stack>

            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography fontWeight={600} sx={{ color: PRIMARY, fontSize: '0.88rem' }}>
                  Show contact information
                </Typography>
                <Typography variant="caption" sx={{ color: TEXT_MUTED, fontSize: '0.76rem' }}>
                  Display your phone and email on your public profile
                </Typography>
              </Box>
              <Switch
                checked={!!visibility.showContactInfo}
                onChange={() => toggleVisibilityFlag('showContactInfo')}
                disabled={saving}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked':                    { color: PRIMARY },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: PRIMARY, opacity: 1 },
                  '& .MuiSwitch-track':                                      { bgcolor: '#D1D5DB', opacity: 1 },
                }}
              />
            </Stack>
          </Stack>
        </Box>
      </SectionCard>

      {/* ────────────────────────────────────────────────────────────── */}
      {/* SECTION: DATA & PRIVACY                                        */}
      {/* ────────────────────────────────────────────────────────────── */}
      <SectionCard
        id="data"
        icon={StorageOutlined}
        iconColor="#0EA5E9"
        iconBg="rgba(14,165,233,0.10)"
        title="Data & Privacy"
        subtitle="Manage your data and active sessions"
      >
        <Stack divider={<Divider sx={{ borderColor: BORDER_SOFT }} />}>
          {/* Account email */}
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2} sx={{ px: 3, py: 2.25 }}>
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{
                width: 36, height: 36, borderRadius: 1.75,
                bgcolor: SUCCESS_SOFT, color: SUCCESS,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <CheckCircleOutlined sx={{ fontSize: 18 }} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography fontWeight={600} sx={{ color: PRIMARY, fontSize: '0.9rem' }}>
                  Account email
                </Typography>
                <Typography variant="caption" sx={{ color: TEXT_MUTED, fontSize: '0.76rem', wordBreak: 'break-all' }}>
                  {accountEmail}
                </Typography>
              </Box>
            </Stack>
            <Chip
              label="Verified"
              size="small"
              sx={{
                bgcolor: SUCCESS_SOFT, color: SUCCESS,
                fontWeight: 700, fontSize: '0.7rem', height: 22,
              }}
            />
          </Stack>

          {/* Download data */}
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2} sx={{ px: 3, py: 2.25 }}>
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{
                width: 36, height: 36, borderRadius: 1.75,
                bgcolor: PRIMARY_SOFT, color: PRIMARY,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <DownloadOutlined sx={{ fontSize: 18 }} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography fontWeight={600} sx={{ color: PRIMARY, fontSize: '0.9rem' }}>
                  Download your data
                </Typography>
                <Typography variant="caption" sx={{ color: TEXT_MUTED, fontSize: '0.76rem' }}>
                  Get a copy of everything we have on you (JSON archive)
                </Typography>
              </Box>
            </Stack>
            <Button
              endIcon={<KeyboardArrowRightOutlined sx={{ fontSize: 16 }} />}
              onClick={() => setDownloadOpen(true)}
              sx={{
                color: PRIMARY,
                bgcolor: '#fff',
                border: `1px solid ${BORDER}`,
                textTransform: 'none', fontWeight: 600,
                px: 1.75, py: 0.6, borderRadius: 1.5, fontSize: '0.8rem',
                '&:hover': { bgcolor: PRIMARY_SOFT, borderColor: PRIMARY },
              }}
            >
              Request
            </Button>
          </Stack>

          {/* Active sessions */}
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2} sx={{ px: 3, py: 2.25 }}>
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{
                width: 36, height: 36, borderRadius: 1.75,
                bgcolor: 'rgba(180,83,9,0.10)', color: '#B45309',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <DevicesOutlined sx={{ fontSize: 18 }} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography fontWeight={600} sx={{ color: PRIMARY, fontSize: '0.9rem' }}>
                  Active sessions
                </Typography>
                <Typography variant="caption" sx={{ color: TEXT_MUTED, fontSize: '0.76rem' }}>
                  You're signed in on {activeSessions} {activeSessions === 1 ? 'device' : 'devices'}
                </Typography>
              </Box>
            </Stack>
            <Button
              endIcon={<KeyboardArrowRightOutlined sx={{ fontSize: 16 }} />}
              onClick={() => setSignOutOpen(true)}
              disabled={activeSessions <= 1}
              sx={{
                color: PRIMARY,
                bgcolor: '#fff',
                border: `1px solid ${BORDER}`,
                textTransform: 'none', fontWeight: 600,
                px: 1.75, py: 0.6, borderRadius: 1.5, fontSize: '0.8rem',
                '&:hover': { bgcolor: PRIMARY_SOFT, borderColor: PRIMARY },
                '&.Mui-disabled': { color: '#9CA3AF', borderColor: BORDER, bgcolor: '#FAFAFA' },
              }}
            >
              Sign out all
            </Button>
          </Stack>
        </Stack>
      </SectionCard>

      {/* ────────────────────────────────────────────────────────────── */}
      {/* SECTION: DANGER ZONE                                           */}
      {/* ────────────────────────────────────────────────────────────── */}
      <SectionCard
        id="danger"
        icon={WarningAmberRounded}
        iconColor={DANGER}
        iconBg={DANGER_SOFT}
        title="Danger Zone"
        subtitle="Irreversible actions — proceed with caution"
        danger
      >
        {/* subtle diagonal stripe pattern */}
        <Box sx={{
          position: 'relative',
          backgroundImage: `repeating-linear-gradient(
            -45deg,
            transparent,
            transparent 14px,
            rgba(185,28,28,0.025) 14px,
            rgba(185,28,28,0.025) 28px
          )`,
        }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            justifyContent="space-between"
            spacing={2}
            sx={{ px: 3, py: 2.5 }}
          >
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{
                width: 36, height: 36, borderRadius: 1.75,
                bgcolor: DANGER_SOFT, color: DANGER,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <DeleteForeverOutlined sx={{ fontSize: 18 }} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography fontWeight={700} sx={{ color: PRIMARY, fontSize: '0.92rem' }}>
                  Delete account
                </Typography>
                <Typography variant="caption" sx={{ color: TEXT_MUTED, fontSize: '0.78rem' }}>
                  Permanently remove your account and all associated data
                </Typography>
              </Box>
            </Stack>
            <Button
              startIcon={<DeleteForeverOutlined sx={{ fontSize: 16 }} />}
              onClick={() => setDeleteOpen(true)}
              sx={{
                bgcolor: DANGER, color: '#fff',
                textTransform: 'none', fontWeight: 700,
                px: 2.25, py: 0.85, borderRadius: 1.5, fontSize: '0.82rem',
                boxShadow: '0 4px 12px rgba(185,28,28,0.25)',
                whiteSpace: 'nowrap',
                '&:hover': {
                  bgcolor: '#991818',
                  boxShadow: '0 6px 16px rgba(185,28,28,0.35)',
                },
              }}
            >
              Delete Account
            </Button>
          </Stack>
        </Box>
      </SectionCard>

      {/* ────────────────────────────────────────────────────────────── */}
      {/* TOAST: "Saved" indicator                                       */}
      {/* ────────────────────────────────────────────────────────────── */}
      <Slide direction="up" in={savedFlash} mountOnEnter unmountOnExit>
        <Paper
          elevation={0}
          sx={{
            position: 'fixed',
            bottom: { xs: 24, md: 32 },
            right:  { xs: 24, md: 32 },
            zIndex: 1400,
            bgcolor: PRIMARY,
            color: '#fff',
            borderRadius: 2.5,
            px: 2, py: 1.25,
            display: 'flex', alignItems: 'center', gap: 1,
            boxShadow: '0 12px 32px rgba(30,51,88,0.25)',
            minWidth: 140,
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
            Saved
          </Typography>
        </Paper>
      </Slide>

      {/* ────────────────────────────────────────────────────────────── */}
      {/* DOWNLOAD DATA DIALOG                                           */}
      {/* ────────────────────────────────────────────────────────────── */}
      <Dialog
        open={downloadOpen}
        onClose={() => !downloading && setDownloadOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          elevation: 0,
          sx: { borderRadius: 3, border: `1px solid ${BORDER}`, overflow: 'hidden' },
        }}
      >
        <DialogContent sx={{ p: 3, pt: 4, textAlign: 'center' }}>
          <Box sx={{
            width: 56, height: 56, borderRadius: '50%',
            bgcolor: PRIMARY_SOFT, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            mx: 'auto', mb: 2,
          }}>
            <DownloadOutlined sx={{ color: PRIMARY, fontSize: 28 }} />
          </Box>
          <Typography fontWeight={700} sx={{ color: PRIMARY, fontSize: '1.05rem', mb: 0.5 }}>
            Download your data
          </Typography>
          <Typography variant="body2" sx={{ color: '#6B7280' }}>
            We'll prepare a JSON archive with your profile, applications, and settings.
            You'll receive an email when it's ready.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${BORDER_SOFT}`, gap: 1 }}>
          <Button
            onClick={() => setDownloadOpen(false)}
            disabled={downloading}
            fullWidth
            sx={{
              color: '#6B7280', textTransform: 'none', fontWeight: 600,
              borderRadius: 1.5, py: 0.9,
              border: `1px solid ${BORDER}`,
              '&:hover': { bgcolor: '#F3F4F6' },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDownloadData}
            disabled={downloading}
            fullWidth
            startIcon={downloading ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : null}
            sx={{
              bgcolor: PRIMARY, color: '#fff',
              textTransform: 'none', fontWeight: 700,
              borderRadius: 1.5, py: 0.9, boxShadow: 'none',
              '&:hover': { bgcolor: '#162847', boxShadow: 'none' },
            }}
          >
            {downloading ? 'Preparing…' : 'Request'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ────────────────────────────────────────────────────────────── */}
      {/* SIGN OUT EVERYWHERE DIALOG                                     */}
      {/* ────────────────────────────────────────────────────────────── */}
      <Dialog
        open={signOutOpen}
        onClose={() => !signingOutAll && setSignOutOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          elevation: 0,
          sx: { borderRadius: 3, border: `1px solid ${BORDER}`, overflow: 'hidden' },
        }}
      >
        <DialogContent sx={{ p: 3, pt: 4, textAlign: 'center' }}>
          <Box sx={{
            width: 56, height: 56, borderRadius: '50%',
            bgcolor: PRIMARY_SOFT, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            mx: 'auto', mb: 2,
          }}>
            <ExitToAppOutlined sx={{ color: PRIMARY, fontSize: 28 }} />
          </Box>
          <Typography fontWeight={700} sx={{ color: PRIMARY, fontSize: '1.05rem', mb: 0.5 }}>
            Sign out from all devices?
          </Typography>
          <Typography variant="body2" sx={{ color: '#6B7280' }}>
            This will end {activeSessions - 1} other {activeSessions - 1 === 1 ? 'session' : 'sessions'}.
            You'll stay signed in on this device.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${BORDER_SOFT}`, gap: 1 }}>
          <Button
            onClick={() => setSignOutOpen(false)}
            disabled={signingOutAll}
            fullWidth
            sx={{
              color: '#6B7280', textTransform: 'none', fontWeight: 600,
              borderRadius: 1.5, py: 0.9,
              border: `1px solid ${BORDER}`,
              '&:hover': { bgcolor: '#F3F4F6' },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSignOutAll}
            disabled={signingOutAll}
            fullWidth
            startIcon={signingOutAll ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : null}
            sx={{
              bgcolor: PRIMARY, color: '#fff',
              textTransform: 'none', fontWeight: 700,
              borderRadius: 1.5, py: 0.9, boxShadow: 'none',
              '&:hover': { bgcolor: '#162847', boxShadow: 'none' },
            }}
          >
            {signingOutAll ? 'Signing out…' : 'Sign out all'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ────────────────────────────────────────────────────────────── */}
      {/* DELETE ACCOUNT DIALOG                                          */}
      {/* ────────────────────────────────────────────────────────────── */}
      <Dialog
        open={deleteOpen}
        onClose={() => {
          if (deleting) return;
          setDeleteOpen(false);
          setDeleteConfirm('');
        }}
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
              bgcolor: DANGER_SOFT, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <WarningAmberRounded sx={{ color: DANGER, fontSize: 18 }} />
            </Box>
            <Typography fontWeight={700} sx={{ color: DANGER, fontSize: '1rem' }}>
              Delete account
            </Typography>
          </Stack>
          <IconButton
            onClick={() => { setDeleteOpen(false); setDeleteConfirm(''); }}
            disabled={deleting}
            size="small"
            sx={{ color: TEXT_MUTED, '&:hover': { color: DANGER, bgcolor: DANGER_SOFT } }}
          >
            <Close sx={{ fontSize: 18 }} />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 3, pt: '24px !important' }}>
          <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>
            This action <strong>cannot be undone</strong>. Your profile, applications,
            interview history, and all associated data will be permanently deleted.
          </Alert>

          <Typography variant="body2" sx={{ color: '#4B5563', mb: 2, fontSize: '0.85rem' }}>
            What will happen:
          </Typography>
          <Stack spacing={1} mb={2.5}>
            {[
              'All your applications will be withdrawn',
              'Your profile will be removed from employer searches',
              'Your interview recordings will be permanently deleted',
              'Your subscription will be cancelled (no refund)',
            ].map((point, i) => (
              <Stack key={i} direction="row" alignItems="flex-start" spacing={1}>
                <Box sx={{
                  width: 5, height: 5, borderRadius: '50%',
                  bgcolor: DANGER, mt: 0.85, flexShrink: 0,
                }} />
                <Typography variant="body2" sx={{ color: '#6B7280', fontSize: '0.82rem' }}>
                  {point}
                </Typography>
              </Stack>
            ))}
          </Stack>

          <Typography variant="body2" sx={{ color: '#4B5563', fontSize: '0.85rem', mb: 1 }}>
            Type <strong>DELETE</strong> to confirm:
          </Typography>
          <TextField
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder="DELETE"
            fullWidth
            size="small"
            disabled={deleting}
            sx={{
              '& .MuiOutlinedInput-root.Mui-focused fieldset': {
                borderColor: deleteConfirm.trim().toUpperCase() === 'DELETE' ? DANGER : '#D1D5DB',
              },
            }}
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${BORDER_SOFT}`, gap: 1 }}>
          <Button
            onClick={() => { setDeleteOpen(false); setDeleteConfirm(''); }}
            disabled={deleting}
            sx={{
              color: '#6B7280', textTransform: 'none', fontWeight: 600,
              px: 2.5, borderRadius: 1.5,
              '&:hover': { bgcolor: '#F3F4F6' },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteAccount}
            disabled={deleting || deleteConfirm.trim().toUpperCase() !== 'DELETE'}
            startIcon={deleting
              ? <CircularProgress size={14} sx={{ color: '#fff' }} />
              : <DeleteForeverOutlined sx={{ fontSize: 16 }} />}
            sx={{
              bgcolor: DANGER, color: '#fff',
              textTransform: 'none', fontWeight: 700,
              px: 2.5, borderRadius: 1.5, boxShadow: 'none',
              '&:hover': { bgcolor: '#991818', boxShadow: 'none' },
              '&.Mui-disabled': { bgcolor: '#9CA3AF', color: '#fff' },
            }}
          >
            {deleting ? 'Deleting…' : 'Permanently Delete'}
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default Settings;