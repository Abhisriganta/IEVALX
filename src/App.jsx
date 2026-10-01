import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { SnackbarProvider } from 'notistack';

import ThemeProvider from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { useAuth } from '@/hooks/useAuth';
import AppRouter from '@/routes/AppRouter';
// 🔧 Themed toast — pill-shaped "minimal line" style matching the sage/cream
// palette. Registered for every variant below so all existing
// enqueueSnackbar(msg, { variant }) calls upgrade automatically.
import AppToast from '@/components/common/AppToast';
// 🔧 Application boot loader — "Wordmark Reveal" (approved Demo 2). Renders a
// full-screen branded overlay while the session restores, then fades out and
// unmounts. Plays the full reveal once per browser session; instant on
// same-session re-mounts. See AppLoader.jsx for the behaviour contract.
import AppLoader from '@/components/common/AppLoader';
// 🔧 Global connection-lost screen — full-screen sage-themed "Connection
// lost" overlay whenever the browser goes offline, over every route/role.
// Auto-dismisses the moment connectivity returns. See NetworkError.jsx.
import { OfflineGate } from '@/components/common/NetworkError';

/* BootGate must live INSIDE AuthProvider — it reads the auth `loading` flag
   (localStorage session restore) as the "application is booting" signal. The
   app tree renders underneath the overlay so routes, providers and layout
   warm up while the reveal plays; PrivateRoute's own loading guard prevents
   any wrong-route flash beneath it. */
const BootGate = ({ children }) => {
  const { loading } = useAuth();
  return (
    <>
      <AppLoader active={loading} />
      {children}
    </>
  );
};

const App = () => (
  <ThemeProvider>
    <AuthProvider>
      <SnackbarProvider
        maxSnack={3}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        autoHideDuration={3500}
        Components={{
          default: AppToast,
          success: AppToast,
          error:   AppToast,
          warning: AppToast,
          info:    AppToast,
        }}
      >
        <BootGate>
          <OfflineGate>
            <Router>
              <AppRouter />
            </Router>
          </OfflineGate>
        </BootGate>
      </SnackbarProvider>
    </AuthProvider>
  </ThemeProvider>
);

export default App;