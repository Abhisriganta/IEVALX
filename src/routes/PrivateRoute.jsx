import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '@/hooks/useAuth';
import { ROLE_HOME, ROLES } from '@/constants';
import { isDocGateSet } from '@/hooks/company/useDocumentReupload';
import { isConsentGateSet } from '@/hooks/interviewer/useConsentGate'; // BUILD: 2026-08-24-iaem-consent-gate-v1
import { PATHS } from '@/routes/routePaths';

const PrivateRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', bgcolor: '#F5F4F0' }}>
        <CircularProgress sx={{ color: '#2C2C2A' }} size={36} thickness={3} />
      </Box>
    );
  }

  if (!isAuthenticated) {
   
    if (location.pathname === PATHS.CO_DOC_REUPLOAD) return children;
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

 
  if (
    role === ROLES.COMPANY &&
    isDocGateSet() &&
    location.pathname !== PATHS.CO_DOC_REUPLOAD
  ) {
    return <Navigate to={PATHS.CO_DOC_REUPLOAD} replace />;
  }

  // BUILD: 2026-08-24-iaem-consent-gate-v1
  // Consent gate for interviewers — same pattern as company doc re-upload gate above.
  if (
    role === ROLES.INTERVIEWER &&
    isConsentGateSet() &&
    location.pathname !== PATHS.IV_CONSENT
  ) {
    return <Navigate to={PATHS.IV_CONSENT} replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to={ROLE_HOME[role] || '/auth'} replace />;
  }

  return children;
};

export default PrivateRoute;