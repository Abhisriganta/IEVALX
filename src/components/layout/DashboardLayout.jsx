import React, { useState, useCallback } from 'react';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import { useLocation } from 'react-router-dom';
import Sidebar, { SIDEBAR_WIDTH, SIDEBAR_WIDTH_COLLAPSED, MOBILE_BP } from '@/components/layout/Sidebar';
import Topbar, {
  TOPBAR_HEIGHT,
  TOPBAR_HEIGHT_SM,
  TOPBAR_HEIGHT_XS,
} from '@/components/layout/Topbar';

const DASHBOARD_TITLES = {
  jobseeker: 'Jobseeker Dashboard',
  employer:  'Employer Dashboard',
  company:   'Company Administration',
};

const PAGE_BG = '#F6F8F3';
const LS_KEY  = 'ievalx_sidebar_collapsed';

const Layout = ({ children }) => {
  const location = useLocation();
  const role     = location.pathname.split('/')[1];
  const title    = DASHBOARD_TITLES[role] || 'IEvalx';

  const theme     = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up(MOBILE_BP));
  const isXs      = useMediaQuery(theme.breakpoints.down('sm'));

  /* ── Mobile drawer state ─────────────────────────────────────────────── */
  const [mobileOpen, setMobileOpen] = useState(false);
  const handleMenuClick   = useCallback(() => setMobileOpen(true), []);
  const handleMobileClose = useCallback(() => setMobileOpen(false), []);

  /* ── Sidebar collapse state (persisted) ──────────────────────────────── */
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem(LS_KEY) === '1'; } catch { return false; }
  });
  const handleToggleCollapse = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem(LS_KEY, next ? '1' : '0'); } catch {}
      return next;
    });
  }, []);

  /* ── Responsive topbar height ────────────────────────────────────────── */
  const barH = isDesktop ? TOPBAR_HEIGHT : isXs ? TOPBAR_HEIGHT_XS : TOPBAR_HEIGHT_SM;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: PAGE_BG }}>
      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={handleMobileClose}
        collapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleCollapse}
      />

      <Box
        sx={{
          flexGrow: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          overflow: 'hidden',
        }}
      >
        <Topbar
          title={title}
          onMenuClick={handleMenuClick}
          sidebarCollapsed={sidebarCollapsed}
        />

        <Box
          component="main"
          sx={{
            marginTop: `${barH}px`,
            flex: 1,
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            bgcolor: PAGE_BG,
            overflowX: 'hidden',
            overflowY: 'auto',
            boxSizing: 'border-box',
          }}
        >
          <Box
            sx={{
              width: '100%',
              maxWidth: '1400px',
              px: { xs: 1.25, sm: 2, [MOBILE_BP]: 3 },
              py: { xs: 1, sm: 1.5, [MOBILE_BP]: 0 },
            }}
          >
            {children}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;