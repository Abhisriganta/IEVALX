import React, { useState, useEffect } from 'react';
import {
  AppBar, Toolbar, Box, Typography, IconButton,
  Avatar, Badge, Menu, MenuItem, Tooltip,
  useMediaQuery, useTheme,
} from '@mui/material';
import {
  NotificationsNone, Menu as MenuIcon, CampaignOutlined,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { onLogout } from '@/services/api/axiosInstance';
import { SIDEBAR_WIDTH, SIDEBAR_WIDTH_COLLAPSED, MOBILE_BP } from '@/components/layout/Sidebar';
import { getInitials } from '@/utils/formatters';
import { ROLES } from '@/constants';
import api from '@/services/api/axiosInstance';
import useAnnouncementFeed from '@/hooks/jobseeker/useAnnouncementFeed';
import useNotifications from '@/hooks/jobseeker/useNotifications';
// BUILD: 2026-09-11-topbar-notif-multi-role-v1
import useCompanyNotifications from '@/hooks/company/useCompanyNotifications';
import useEmployerNotifications from '@/hooks/employer/useEmployerNotifications';
import iaemNotificationService from '@/services/api/iaem/iaemNotificationService';

/* ── Role chips — sage-tinted ─────────────────────────────────────────── */
const ROLE_CHIP = {
  [ROLES.JOBSEEKER]: { bg: 'rgba(127,158,126,0.10)', color: '#4A6E49', border: 'rgba(127,158,126,0.22)' },
  [ROLES.EMPLOYER]:  { bg: 'rgba(127,158,126,0.10)', color: '#3A5E3A', border: 'rgba(127,158,126,0.25)' },
  [ROLES.COMPANY]:   { bg: 'rgba(127,158,126,0.10)', color: '#4A6E49', border: 'rgba(127,158,126,0.22)' },
};

const PROFILE_ROUTE = {
  [ROLES.JOBSEEKER]:   '/jobseeker/profile',
  [ROLES.EMPLOYER]:    '/employer/profile',
  [ROLES.COMPANY]:     '/company/profile',
  [ROLES.INTERVIEWER]: '/interviewer/profile',
  [ROLES.COMPLIANCE]:  '/compliance/profile',
};

/* ── Tokens — landing palette ─────────────────────────────────────────── */
const T = {
  ink:         '#101210',
  sage:        '#7F9E7E',
  sageText:    '#5E815D',  // darker sage for TEXT on light backgrounds
  sageDark:    '#6C8B6B',
  sageSoft:    '#EDF3EC',
  pine:        '#022124',
  cream:       '#F6F8F3',
  white:       '#FFFFFF',
  muted:       '#55584F',
  line:        '#E7EAE3',
  lineSoft:    '#D8DDD4',
  hoverTint:   'rgba(127,158,126,0.06)',
};

/* ── Responsive heights ───────────────────────────────────────────────── */
export const TOPBAR_HEIGHT        = 84;   // md+
export const TOPBAR_HEIGHT_SM     = 64;   // sm (<md)
export const TOPBAR_HEIGHT_XS     = 56;   // xs (<sm, watches/tiny phones)

const Topbar = ({ title = '', onMenuClick, sidebarCollapsed = false }) => {
  const { user, role, logout } = useAuth();
  const navigate  = useNavigate();
  const theme     = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up(MOBILE_BP));
  const isXs      = useMediaQuery(theme.breakpoints.down('sm'));

  const [anchorEl, setAnchorEl] = useState(null);
  const [avatarSrc, setAvatarSrc] = useState(
    localStorage.getItem("user_profile_image_url") ||
      user?.profile_image_url ||
      null
  );
  
  const [photoVersion, setPhotoVersion] = useState(0);

  /* 🔧 Badge counts only — no popovers. Icons navigate on click. */
  // BUILD: 2026-09-11-employer-announcements-parity-v1
  const isJobseeker = role === ROLES.JOBSEEKER;
  const isEmployer  = role === ROLES.EMPLOYER;
  const { unreadCount: unreadAnnCount, markAllRead: markAllAnnRead } =
    useAnnouncementFeed(isJobseeker || isEmployer);

  const { unreadCount: jsUnreadCount }  = useNotifications();
  const { unreadCount: coUnreadCount }  = useCompanyNotifications();
  const { unreadCount: empUnreadCount } = useEmployerNotifications();

  const unreadNotifCount =
    role === ROLES.COMPANY  ? coUnreadCount  :
    role === ROLES.EMPLOYER ? empUnreadCount :
    jsUnreadCount;

  const isIAEMRole = [ROLES.INTERVIEWER, ROLES.COMPLIANCE].includes(role);
  const [iaemUnreadCount, setIaemUnreadCount] = useState(0);
  useEffect(() => {
    if (!isIAEMRole) return;
    let cancelled = false;
    const fetchIaemCount = () => {
      iaemNotificationService.getUnreadCount()
        .then((r) => { if (!cancelled) setIaemUnreadCount(r.data?.unread_count || 0); })
        .catch(() => {});
    };
    fetchIaemCount();
    const timer = setInterval(fetchIaemCount, 30_000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [isIAEMRole]);

  const NOTIF_ROUTES = {
    [ROLES.INTERVIEWER]: '/interviewer/notifications',
    [ROLES.COMPLIANCE]:  '/compliance/notifications',
    [ROLES.EMPLOYER]:    '/employer/notifications',
    [ROLES.JOBSEEKER]:   '/jobseeker/notifications',
    [ROLES.COMPANY]:     '/company/notifications',
  };

  const handleOpenNotifications = () => {
    const dest = NOTIF_ROUTES[role];
    if (dest) navigate(dest);
  };

  // BUILD: 2026-09-11-employer-announcements-parity-v1
  const ANN_ROUTES = {
    [ROLES.JOBSEEKER]: '/jobseeker/feed',
    [ROLES.EMPLOYER]:  '/employer/feed',
  };

  const handleOpenAnnouncements = () => {
    const dest = ANN_ROUTES[role];
    if (!dest) return;
    // Opening the feed page counts as "seen" — clears the megaphone badge.
    markAllAnnRead();
    navigate(dest);
  };

  // ── Avatar fetching effect ──────────────────────────────────────────────
  useEffect(() => {
    if (role === ROLES.JOBSEEKER && user?.id) {
    
      if (user?.profile_image_url === null) {
        setAvatarSrc(null);
        return;
      }
     
      setAvatarSrc(`/api/jobseeker/photo/${user.id}/?v=${photoVersion}`);
      return;
    }

    const fromStorage = localStorage.getItem("user_profile_image_url");
    const storedAt = localStorage.getItem("user_profile_image_url_ts");
    const isExpired = !storedAt || (Date.now() - Number(storedAt)) > 50 * 60 * 1000;
    if (fromStorage && !isExpired) {
      setAvatarSrc(fromStorage);
      return;
    }
    if (role === ROLES.EMPLOYER) {
      import("@/services/api/employer/profileService").then(({ default: profileService }) => {
        profileService.getProfile().then(res => {
          const url = res?.data?.profile_image_url;
          if (url) {
            localStorage.setItem("user_profile_image_url", url);
            localStorage.setItem("user_profile_image_url_ts", String(Date.now()));
            setAvatarSrc(url);
          }
        }).catch(() => {});
      });
    } else if (role === ROLES.COMPANY) {
      const companyId = user?.id || localStorage.getItem('currentCompanyId');
      if (companyId) {
        api.get(`/companies/${companyId}/full-profile`).then(res => {
          const url = res?.data?.account?.profile_image_url || null;
          if (url) {
            localStorage.setItem("user_profile_image_url", url);
            localStorage.setItem("user_profile_image_url_ts", String(Date.now()));
            setAvatarSrc(url);
          }
        }).catch(() => {});
      }
    } else if (role === ROLES.JOBSEEKER) {
      const candidateId = user?.id;
      if (candidateId) {
        api.get(`/jobseeker/profile/${candidateId}`).then(res => {
          const url = res?.data?.Profile_Image_URL || res?.data?.profile_image_url;
          if (url) {
            localStorage.setItem("user_profile_image_url", url);
            localStorage.setItem("user_profile_image_url_ts", String(Date.now()));
            setAvatarSrc(url);
          }
        }).catch(() => {});
      }
    } else if (role === ROLES.INTERVIEWER) {
      api.get('/iaem/interviewer/profile/').then(res => {
        const url = res?.data?.profile_photo_url;
        if (url) {
          localStorage.setItem("user_profile_image_url", url);
          localStorage.setItem("user_profile_image_url_ts", String(Date.now()));
          setAvatarSrc(url);
        }
      }).catch(() => {});
    } else if (role === ROLES.COMPLIANCE) {
      api.get('/iaem/compliance/profile/').then(res => {
        const url = res?.data?.profile_photo_url;
        if (url) {
          localStorage.setItem("user_profile_image_url", url);
          localStorage.setItem("user_profile_image_url_ts", String(Date.now()));
          setAvatarSrc(url);
        }
      }).catch(() => {});
    }
  }, [user?.id, user?.profile_image_url, role, photoVersion]);

  useEffect(() => {
    const handler = (e) => {
      setPhotoVersion((v) => v + 1);           // always bump — new photo bytes
      if (e.detail?.removed) {
        setAvatarSrc(null);
        return;
      }
      if (e.detail?.url) setAvatarSrc(e.detail.url);
    };
    window.addEventListener('profile-image-updated', handler);
    return () => window.removeEventListener('profile-image-updated', handler);
  }, []);

  const roleLabel = {
    [ROLES.JOBSEEKER]: 'Jobseeker',
    [ROLES.EMPLOYER]:  'Employer',
    [ROLES.COMPANY]:   'Company Admin',
  }[role] || '';

  const handleProfileClick = () => {
    setAnchorEl(null);
    const target = PROFILE_ROUTE[role] || '/';
    navigate(target);
  };

  const handleLogoutClick = () => {
    setAnchorEl(null);
    localStorage.removeItem("user_profile_image_url");
    localStorage.removeItem("user_profile_image_url_ts");
    onLogout();
  };

  const displayName = user?.full_name || user?.email?.split('@')[0] || 'User';
  const displayEmail = user?.email || '';

  /* Title renderer — comma-accent splits "Welcome Back, Akhil" into ink + sage */
  const renderTitle = () => {
    if (!title) return null;
    const commaIdx = title.lastIndexOf(',');
    if (commaIdx === -1 || commaIdx >= title.length - 1) {
      return <span>{title}</span>;
    }
    const head = title.slice(0, commaIdx + 1);
    const tail = title.slice(commaIdx + 1).trim();
    return (
      <>
        <span>{head}</span>
        <span style={{ color: T.sageText, marginLeft: 6, fontWeight: 700 }}>{tail}</span>
      </>
    );
  };

  /* Responsive bar height */
  const barHeight = isDesktop ? TOPBAR_HEIGHT : isXs ? TOPBAR_HEIGHT_XS : TOPBAR_HEIGHT_SM;

  /* Desktop sidebar offset — follows collapsed/expanded reservation */
  const sidebarOffset = sidebarCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH;

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        position: 'fixed',
        top: 0,
        /* Desktop: offset by sidebar reservation. Mobile: full width */
        left: { xs: 0, [MOBILE_BP]: `${sidebarOffset}px` },
        width: { xs: '100%', [MOBILE_BP]: `calc(100% - ${sidebarOffset}px)` },
        bgcolor: T.cream,
        backgroundImage: 'none',
        borderRadius: 0,
        border: 'none',
        borderBottom: `1px solid ${T.line}`,
        boxShadow: 'none',
        zIndex: (theme) => theme.zIndex.drawer - 1,
        transition: 'left 0.22s ease, width 0.22s ease',
        '&.MuiAppBar-root': {
          backgroundColor: T.cream,
          backgroundImage: 'none',
          boxShadow: 'none',
          borderRadius: 0,
        },
        '& .MuiPaper-root': {
          backgroundColor: T.cream,
          borderRadius: 0,
        },
      }}
    >
      <Toolbar
        sx={{
          gap: { xs: 1, sm: 1.5, [MOBILE_BP]: 2 },
          minHeight: `${barHeight}px !important`,
          height: `${barHeight}px`,
          px: { xs: 1.25, sm: 2, [MOBILE_BP]: 3 },
        }}
      >
        {/* ── Hamburger (mobile only) ────────────────────────────────────── */}
        {!isDesktop && (
          <IconButton
            aria-label="Open navigation"
            onClick={onMenuClick}
            disableRipple
            sx={{
              width: { xs: 36, sm: 40 },
              height: { xs: 36, sm: 40 },
              color: T.pine,
              bgcolor: 'transparent',
              border: `1px solid ${T.line}`,
              borderRadius: '10px',
              mr: { xs: 0.5, sm: 1 },
              transition: 'all 0.18s ease',
              '&:hover': {
                bgcolor: T.sageSoft,
                borderColor: T.lineSoft,
                color: T.sage,
              },
            }}
          >
            <MenuIcon sx={{ fontSize: { xs: 20, sm: 22 } }} />
          </IconButton>
        )}

        {/* ── Page title + role subtitle ────────────────────────────────── */}
        <Box sx={{
          display: 'flex', flexDirection: 'column',
          flex: '0 1 auto', minWidth: 0, overflow: 'hidden',
        }}>
          <Typography
            component="div"
            sx={{
              fontWeight: 700,
              fontSize: { xs: '0.95rem', sm: '1.1rem', [MOBILE_BP]: '1.25rem' },
              color: T.ink,
              letterSpacing: '-0.015em',
              lineHeight: 1.2,
              fontFamily: "'Jost','DM Sans',sans-serif",
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {renderTitle()}
          </Typography>
          {/* Role subtitle: hide on xs (watches/tiny phones) */}
          {roleLabel && (
            <Typography sx={{
              fontSize: '0.65rem',
              color: T.muted,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              fontWeight: 600,
              lineHeight: 1,
              mt: 0.5,
              display: { xs: 'none', sm: 'block' },
            }}>
              {roleLabel} Workspace
              {role === ROLES.EMPLOYER && user?.company_name && ` · ${user.company_name}`}
            </Typography>
          )}
        </Box>

        <Box sx={{ flex: 1 }} />

        {/* ── Notification bell ──────────────────────────────────────────── */}
        <Tooltip title="Notifications" arrow placement="bottom">
          <IconButton
            size="small"
            onClick={handleOpenNotifications}
            disableRipple
            sx={{
              width: { xs: 36, sm: 38, [MOBILE_BP]: 42 },
              height: { xs: 36, sm: 38, [MOBILE_BP]: 42 },
              color: T.muted,
              bgcolor: 'transparent',
              border: `1px solid ${T.line}`,
              borderRadius: '50%',
              transition: 'all 0.18s ease',
              '&:hover': {
                bgcolor: T.sageSoft,
                color: T.sage,
                borderColor: T.lineSoft,
              },
            }}
          >
            <Badge
              badgeContent={isIAEMRole ? iaemUnreadCount : unreadNotifCount}
              sx={{
                '& .MuiBadge-badge': {
                  fontSize: '0.6rem',
                  minWidth: 16,
                  height: 16,
                  fontWeight: 700,
                  bgcolor: '#EF4444',
                  color: '#fff',
                  border: `1.5px solid ${T.cream}`,
                  top: 1,
                  right: 1,
                  padding: '0 4px',
                },
              }}
            >
              <NotificationsNone sx={{ fontSize: { xs: 19, sm: 20, [MOBILE_BP]: 22 } }} />
            </Badge>
          </IconButton>
        </Tooltip>

        {/* ── Announcements ──────────────────────────────────────────────── */}
        <Tooltip title="Announcements" arrow placement="bottom">
          <IconButton
            size="small"
            onClick={handleOpenAnnouncements}
            disableRipple
            sx={{
              width: { xs: 36, sm: 38, [MOBILE_BP]: 42 },
              height: { xs: 36, sm: 38, [MOBILE_BP]: 42 },
              color: T.muted,
              bgcolor: 'transparent',
              border: `1px solid ${T.line}`,
              borderRadius: '50%',
              transition: 'all 0.18s ease',
              ml: { xs: 0.5, sm: 0.75 },
              '&:hover': {
                bgcolor: T.sageSoft,
                color: T.sage,
                borderColor: T.lineSoft,
              },
            }}
          >
            <Badge
              badgeContent={unreadAnnCount}
              sx={{
                '& .MuiBadge-badge': {
                  fontSize: '0.6rem',
                  minWidth: 16,
                  height: 16,
                  fontWeight: 700,
                  bgcolor: T.sage,
                  color: '#fff',
                  border: `1.5px solid ${T.cream}`,
                  top: 1,
                  right: 1,
                  padding: '0 4px',
                },
              }}
            >
              <CampaignOutlined sx={{ fontSize: { xs: 19, sm: 20, [MOBILE_BP]: 22 } }} />
            </Badge>
          </IconButton>
        </Tooltip>

        {/* ── Profile row ─────────────────────────────────────────────────── */}
        <Box
          onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: { xs: 0, sm: 1.25 },
            cursor: 'pointer',
            pl: { xs: 0, sm: 0.75 },
            pr: { xs: 0, sm: 1.25 },
            py: 0.75,
            borderRadius: '12px',
            transition: 'background 0.18s ease',
            '&:hover': { bgcolor: T.sageSoft },
          }}
        >
          <Avatar
            key={avatarSrc}
            src={avatarSrc || undefined}
            onError={() => setAvatarSrc(null)}
            sx={{
              width: { xs: 34, sm: 38, [MOBILE_BP]: 40 },
              height: { xs: 34, sm: 38, [MOBILE_BP]: 40 },
              bgcolor: T.sage,
              fontSize: '0.85rem',
              fontWeight: 700,
              color: '#FFFFFF',
              fontFamily: "'Jost','DM Sans',sans-serif",
            }}
          >
            {getInitials(user?.full_name || user?.email)}
          </Avatar>

          {/* Name + email: hidden xs, name-only sm, full md+ */}
          <Box sx={{
            display: { xs: 'none', sm: 'block' },
            minWidth: 0,
            maxWidth: { sm: 140, [MOBILE_BP]: 220 },
            lineHeight: 1.2,
          }}>
            <Typography noWrap sx={{
              fontSize: { sm: '0.82rem', [MOBILE_BP]: '0.88rem' },
              fontWeight: 700,
              lineHeight: 1.25,
              color: T.ink,
              fontFamily: "'Jost','DM Sans',sans-serif",
              letterSpacing: '-0.005em',
            }}>
              {displayName}
            </Typography>
            {/* Email: hidden below md */}
            <Typography noWrap sx={{
              fontSize: '0.72rem',
              color: T.muted,
              lineHeight: 1.2,
              fontWeight: 500,
              mt: 0.25,
              display: { xs: 'none', [MOBILE_BP]: 'block' },
            }}>
              {displayEmail || roleLabel}
            </Typography>
          </Box>
        </Box>

        {/* ── Dropdown menu ───────────────────────────────────────────────── */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          slotProps={{
            paper: {
              sx: {
                mt: 1,
                width: { xs: 200, sm: 240 },
                minWidth: { xs: 180, sm: 240 },
                maxWidth: 'none',
                borderRadius: '14px',
                border: `1px solid ${T.line}`,
                boxShadow: '0 16px 48px rgba(2,33,36,0.10), 0 2px 6px rgba(2,33,36,0.05)',
                p: 0.5,
                overflow: 'hidden',
              },
            },
          }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <Box sx={{
            px: 1.5, py: 1.25,
            display: 'flex', alignItems: 'center', gap: 1.25,
            borderBottom: `1px solid ${T.line}`,
            mb: 0.5,
          }}>
            <Avatar
              src={avatarSrc || undefined}
              sx={{
                width: 38, height: 38,
                bgcolor: T.sage,
                fontSize: '0.85rem',
                fontWeight: 700,
                color: '#FFFFFF',
                fontFamily: "'Jost','DM Sans',sans-serif",
              }}
            >
              {getInitials(user?.full_name || user?.email)}
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography noWrap sx={{
                fontSize: '0.85rem', fontWeight: 700, color: T.ink,
                fontFamily: "'Jost','DM Sans',sans-serif", lineHeight: 1.2,
              }}>
                {displayName}
              </Typography>
              <Typography noWrap sx={{
                fontSize: '0.7rem', color: T.muted, lineHeight: 1.2,
              }}>
                {user?.email || roleLabel}
              </Typography>
            </Box>
          </Box>

          <MenuItem
            onClick={handleProfileClick}
            sx={{
              fontSize: '0.875rem',
              borderRadius: '8px',
              color: T.ink,
              py: 1,
              fontFamily: "'Jost','DM Sans',sans-serif",
              fontWeight: 500,
              '&:hover': { bgcolor: T.hoverTint },
            }}
          >
            View Profile
          </MenuItem>
          <MenuItem
            onClick={handleLogoutClick}
            sx={{
              fontSize: '0.875rem',
              color: '#C0392B',
              borderRadius: '8px',
              py: 1,
              fontFamily: "'Jost','DM Sans',sans-serif",
              fontWeight: 500,
              '&:hover': { bgcolor: 'rgba(192,57,43,0.06)' },
            }}
          >
            Logout
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default Topbar;