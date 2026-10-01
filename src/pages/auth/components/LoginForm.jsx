
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Typography, Alert, InputAdornment,
  IconButton, CircularProgress,
} from '@mui/material';
import { Visibility, VisibilityOff, Warning } from '@mui/icons-material';
import { useAuth } from '@/hooks/useAuth';
import { ROLE_HOME, ROLES } from '@/constants';
import api, { onLoginSuccess } from '@/services/api/axiosInstance';
import {
  AC, FONT, InkButton, PillField, Eyebrow,
} from '../authTheme';
import RoleChoiceDialog from './RoleChoiceDialog';
import { checkDocumentGate, setDocGate } from '@/hooks/company/useDocumentReupload';
import { PATHS } from '@/routes/routePaths';

// Mapping used only for the picker → /auth/login call and for the
// front-end ROLES enum lookup.
const BACKEND_TO_LOWER = {
  COMPANY:     'company',
  EMPLOYER:    'employer',
  JOBSEEKER:   'jobseeker',
  INTERVIEWER: 'interviewer',  // BUILD: 2026-08-24-iaem-gaps-v1
  COMPLIANCE:  'compliance',   // BUILD: 2026-08-24-iaem-gaps-v1
};

const LoginForm = ({ onSwitch }) => {
  const { updateUser, refreshUser } = useAuth();
  const navigate   = useNavigate();
  const location   = useLocation();
  const successMsg = location.state?.message || '';

  const [email,           setEmail]           = useState('');
  const [password,        setPassword]        = useState('');
  const [showPass,        setShowPass]        = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState('');
  const [success,         setSuccess]         = useState('');
  const [fieldErrors,     setFieldErrors]     = useState({});
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [unverifiedRole,  setUnverifiedRole]  = useState('company');

  // Multi-role picker state
  const [multiRoles,      setMultiRoles]      = useState(null);   // null | ["COMPANY","JOBSEEKER"]
  const [pickerEmail,     setPickerEmail]     = useState('');
  const [submittingRole,  setSubmittingRole]  = useState('');     // "COMPANY" while its request is inflight

  // ── Resend OTP endpoint per role ───────────────────────────────────────────
  const resendOtpEndpointFor = (role) => {
    if (role === 'company')  return '/companies/resend-email-otp';
    if (role === 'employer') return '/employers/resend-email-otp';
    return '/jobseeker/send-otp';
  };

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = () => {
    const errs = {};
    if (!email.trim())
      errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errs.email = 'Enter a valid email';
    if (!password)
      errs.password = 'Password is required';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  
  const finalizeLoginResponse = async (loginRes, normalizedEmail) => {
    const realToken = loginRes.data?.Token;
    const u         = loginRes.data?.User || {};
    if (!realToken) throw new Error('Login response missing token');

    const backendRole = (u.User_Role || '').toUpperCase();
    const loginType   = BACKEND_TO_LOWER[backendRole];
    if (!loginType) throw new Error(`Unexpected role from server: ${u.User_Role}`);

    // ── Best-effort profile-image enrichment (same as legacy flow) ────────
    try {
      if (loginType === 'company') {
        const cid = u.Company_Id || u.User_Id;
        if (cid) {
          const profileRes = await api.get(`/companies/${cid}/full-profile`);
          const imgUrl = profileRes?.data?.account?.profile_image_url
                      || profileRes?.data?.profile?.company_logo_url;
          if (imgUrl) {
            localStorage.setItem('user_profile_image_url', imgUrl);
            localStorage.setItem('user_profile_image_url_ts', String(Date.now()));
          }
        }
      } else if (loginType === 'employer') {
        const profileRes = await api.get('/employer/profile', {
          headers: { Authorization: `Bearer ${realToken}` },
        });
        const imgUrl = profileRes?.data?.profile_image_url;
        if (imgUrl) {
          localStorage.setItem('user_profile_image_url', imgUrl);
          localStorage.setItem('user_profile_image_url_ts', String(Date.now()));
        }
      } else if (loginType === 'jobseeker') {
        // Best-effort: hit friend's /jobseeker/login to grab the profile
        // image URL. If it fails, we still have a valid session — the
        // avatar just falls back to the initials.
        try {
          const jsRes = await api.post('/jobseeker/login', {
            Credential: normalizedEmail,
            Password:   password,
          });
          const imgUrl = jsRes?.data?.Profile_Image_URL;
          if (imgUrl) {
            localStorage.setItem('user_profile_image_url', imgUrl);
            localStorage.setItem('user_profile_image_url_ts', String(Date.now()));
          }
        } catch { /* enrichment is best-effort */ }
      }
    } catch { /* enrichment failure never blocks login */ }

    // ── Build the userObj that the app-wide auth context expects ─────────
    let userObj;
    if (loginType === 'company') {
      userObj = {
        id:                  u.User_Id,
        full_name:           u.Full_Name,
        company_name:        u.Company_Name,
        email:               u.Email,
        phone:               u.Phone,
        role:                ROLES.COMPANY,
        verification_status: u.Verification_Status,
      };
    } else if (loginType === 'employer') {
      userObj = {
        id:                u.User_Id,
        company_id:        u.Company_Id,
        company_name:      u.Company_Name,
        company_logo_url:  u.Company_Logo_URL,
        full_name:         u.Full_Name,
        email:             u.Email,
        phone:             u.Phone,
        role:              ROLES.EMPLOYER,
        backend_role:      u.Employer_Role,
      };
    } else if (loginType === 'interviewer') {
      // BUILD: 2026-08-24-iaem-gaps-v1 — interviewer login
      userObj = {
        id:                u.User_Id,
        full_name:         u.Name || '',
        email:             u.Email || normalizedEmail,
        phone:             u.Phone || '',
        role:              ROLES.INTERVIEWER,
        consent_pending:   u.consent_pending || false,
      };
      if (u.consent_pending) {
        const { setConsentGate } = await import('@/hooks/interviewer/useConsentGate');
        setConsentGate();
      }
    } else if (loginType === 'compliance') {
      // BUILD: 2026-08-24-iaem-gaps-v1 — compliance login
      userObj = {
        id:                u.User_Id,
        full_name:         u.Name || '',
        email:             u.Email || normalizedEmail,
        role:              ROLES.COMPLIANCE,
      };
    } else {
      // jobseeker
      userObj = {
        id:                u.User_Id,
        full_name:         u.Name || '',
        email:             u.Email || normalizedEmail,
        phone:             u.Phone || '',
        role:              ROLES.JOBSEEKER,
        is_email_verified: true,
      };
    }

    // ── Persist + hydrate context ────────────────────────────────────────
    onLoginSuccess(realToken);
    localStorage.setItem('ievalx_user', JSON.stringify(userObj));

    const companyIdToStore =
      loginType === 'company'  ? userObj.id :
      loginType === 'employer' ? userObj.company_id :
      null;
    if (companyIdToStore) {
      localStorage.setItem('currentCompanyId', String(companyIdToStore));
    }

    let companyDestination = 'dashboard';
    if (loginType === 'company') {
      const gate = await checkDocumentGate(userObj.id);
      companyDestination = gate.destination;
    } else {
      setDocGate('dashboard');
    }

    updateUser(userObj);

    if (loginType === 'company') {
      await refreshUser(userObj);
      if (companyDestination !== 'dashboard') {
        navigate(PATHS.CO_DOC_REUPLOAD, { replace: true });
        return;
      }
    }

    // Honor deep-link bounce from PrivateRoute / public Apply CTAs.
    const from = location.state?.from?.pathname;
    const home = ROLE_HOME[userObj.role] || '/auth';
    const target =
      typeof from === 'string' && from.startsWith(`/${userObj.role}/`)
        ? from
        : home;
    navigate(target, { replace: true });
  };


  const normalizeLoginError = (err, fallbackEmail, roleHintLower) => {
    const errData = err.response?.data;
    const status  = err.response?.status;
    const message =
      errData?.Error   ||
      errData?.detail  ||
      errData?.message ||
      err?.message     ||
      'Invalid email or password';

    const isUnverified =
      errData?.Requires_Verification === true ||
      (roleHintLower === 'jobseeker' &&
        status === 403 &&
        typeof message === 'string' &&
        message.toLowerCase().includes('verif'));

    return {
      message,
      isUnverified,
      email: isUnverified ? (errData?.Email || fallbackEmail) : '',
      role:  roleHintLower || 'company',
    };
  };

  // ─────────────────────────────────────────────────────────────────────────
  //  Initial submit — call /auth/login-discover
  // ─────────────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setError(''); setSuccess(''); setUnverifiedEmail('');

    const normalizedEmail = email.trim().toLowerCase();

    // ── BUILD: 2026-08-24-iaem-mock-login-v1 ─────────────────────────────
    // Mock login for interviewer and compliance roles (no backend yet).
    // Remove this block once backend auth supports these roles.
    const MOCK_LOGINS = {
      'interviewer@ievalx.com': {
        token: 'mock-interviewer-jwt-token',
        user: { id: 45, full_name: 'Ravi Kumar', email: 'interviewer@ievalx.com', phone: '+91-9876543210', role: 'interviewer' },
      },
      'compliance@ievalx.com': {
        token: 'mock-compliance-jwt-token',
        user: { id: 99, full_name: 'Compliance Officer', email: 'compliance@ievalx.com', role: 'compliance' },
      },
    };
    const mockEntry = MOCK_LOGINS[normalizedEmail];
    if (mockEntry && password === 'Test@1234') {
      localStorage.setItem('ievalx_token', mockEntry.token);
      localStorage.setItem('ievalx_user', JSON.stringify(mockEntry.user));
      updateUser(mockEntry.user);
      navigate(ROLE_HOME[mockEntry.user.role], { replace: true });
      setLoading(false);
      return;
    }
    // ── END mock login block ─────────────────────────────────────────────

    try {
      const res = await api.post('/auth/login-discover', {
        email:    normalizedEmail,
        password,
      });

      // Multi-role match → open picker, do NOT navigate.
      if (res.data?.Multiple_Roles) {
        setMultiRoles(Array.isArray(res.data.Roles) ? res.data.Roles : []);
        setPickerEmail(res.data.Email || normalizedEmail);
        setLoading(false);
        return;
      }

      // Single-role match → server already returned a full login response.
      await finalizeLoginResponse(res, normalizedEmail);
    } catch (err) {
  
      const errData    = err.response?.data;
      const roleHint   = (errData?.User_Role || '').toLowerCase() || 'company';
      const normalized = normalizeLoginError(err, normalizedEmail, roleHint);
      // A rejected/pending company gets a 401 with no token. Drive the
      // token-less re-upload gate off the Company_Id the backend returns.
      const gateCode = errData?.code;
      const gateCid  = errData?.Company_Id;
      if ((gateCode === 'company_rejected' || gateCode === 'company_pending') && gateCid) {
        localStorage.setItem('currentCompanyId', String(gateCid));
        setDocGate('reupload');
        navigate(PATHS.CO_DOC_REUPLOAD, { replace: true });
        return;
      }
      setError(normalized.message);
      setUnverifiedEmail(normalized.email);
      setUnverifiedRole(normalized.role);
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  //  Picker click — call the existing /auth/login with the chosen role.
  // ─────────────────────────────────────────────────────────────────────────
  const handleRoleChoice = async (chosenBackendRole) => {
    setSubmittingRole(chosenBackendRole);
    setError(''); setSuccess(''); setUnverifiedEmail('');

    const normalizedEmail = pickerEmail || email.trim().toLowerCase();

    try {
      const res = await api.post('/auth/login', {
        email:    normalizedEmail,
        password,
        role:     chosenBackendRole,
      });
      // Close the picker before finalize so we don't flash it during
      // profile-fetch / navigate.
      setMultiRoles(null);
      setPickerEmail('');
      await finalizeLoginResponse(res, normalizedEmail);
    } catch (err) {
      const roleHint   = BACKEND_TO_LOWER[chosenBackendRole] || 'company';
      const normalized = normalizeLoginError(err, normalizedEmail, roleHint);
      const gateCode = err.response?.data?.code;
      const gateCid  = err.response?.data?.Company_Id;
      if ((gateCode === 'company_rejected' || gateCode === 'company_pending') && gateCid) {
        localStorage.setItem('currentCompanyId', String(gateCid));
        setDocGate('reupload');
        navigate(PATHS.CO_DOC_REUPLOAD, { replace: true });
        return;
      }
      setError(normalized.message);
      setUnverifiedEmail(normalized.email);
      setUnverifiedRole(normalized.role);
      // Close picker so the user can see the error banner on the main form.
      setMultiRoles(null);
      setPickerEmail('');
    } finally {
      setSubmittingRole('');
    }
  };

  const closePicker = () => {
    if (submittingRole) return;
    setMultiRoles(null);
    setPickerEmail('');
  };

  // ── Resend OTP ─────────────────────────────────────────────────────────────
  const handleResendOtp = async () => {
    try {
      const body = unverifiedRole === 'jobseeker'
        ? { email: unverifiedEmail, otp_type: 'registration' }
        : { email: unverifiedEmail };

      await api.post(resendOtpEndpointFor(unverifiedRole), body);
      setError('');
      setUnverifiedEmail('');
      setSuccess('OTP sent! Check your email, verify, then sign in again.');
    } catch {
      setError('Failed to resend OTP. Please try again.');
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Box>
      <Eyebrow label="SIGN IN" />
      <Typography sx={{ fontFamily: FONT, fontSize: 35, fontWeight: 700, letterSpacing: '-1.2px', lineHeight: 1.08, color: AC.ink, mb: 1.25 }}>
        Welcome{' '}
        <Box component="span" sx={{ fontStyle: 'italic', fontWeight: 500, color: AC.sage }}>back</Box>
        , let's get you in.
      </Typography>
      <Typography sx={{ fontFamily: FONT, fontSize: 12.5, color: AC.muted, mb: 2.25, lineHeight: 1.6 }}>
        Sign in to manage your hiring with{' '}
        <Box component="span" sx={{ color: AC.ink, fontWeight: 600 }}>IEvalx</Box>. Get started for free.
      </Typography>

      {(successMsg || success) && (
        <Alert severity="success" sx={{ mb: 2, borderRadius: '12px' }}>{successMsg || success}</Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: '12px' }}>{error}</Alert>
      )}

      {unverifiedEmail && (
        <Alert
          severity="info"
          icon={<Warning fontSize="inherit" />}
          sx={{ mb: 2, borderRadius: '12px' }}
          action={
            <Box
              component="button"
              onClick={handleResendOtp}
              sx={{
                border: 0, background: 'transparent', cursor: 'pointer',
                fontFamily: FONT, fontWeight: 600, fontSize: 13, color: AC.sageDark,
              }}
            >
              Resend OTP →
            </Box>
          }
        >
          Email not verified. Please verify your email to continue.
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit} noValidate>
        <PillField
          placeholder="Username or email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setFieldErrors((p) => ({ ...p, email: '' }));
          }}
          error={!!fieldErrors.email}
          helperText={fieldErrors.email}
          sx={{ mb: 1.5 }}
        />

        <PillField
          placeholder="Password"
          type={showPass ? 'text' : 'password'}
          autoComplete="current-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setFieldErrors((p) => ({ ...p, password: '' }));
          }}
          error={!!fieldErrors.password}
          helperText={fieldErrors.password}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPass((prev) => !prev)}
                    onMouseDown={(e) => e.preventDefault()}
                    edge="end"
                    size="small"
                    aria-label="toggle password visibility"
                    sx={{ color: AC.hint }}
                  >
                    {showPass ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
          sx={{ mb: 0.75 }}
        />

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Box
            component="button"
            type="button"
            onClick={() => onSwitch('forgot')}
            sx={{
              border: 0, background: 'transparent', cursor: 'pointer', p: 0,
              fontFamily: FONT, fontSize: 12, color: AC.muted, fontWeight: 500,
              '&:hover': { color: AC.ink },
            }}
          >
            Forgot Password?
          </Box>
        </Box>

        <InkButton type="submit" fullWidth disabled={loading} sx={{ mb: 2 }}>
          {loading
            ? <><CircularProgress size={17} sx={{ color: '#fff', mr: 1 }} /> Signing in…</>
            : 'Sign in'}
        </InkButton>
      </Box>

      <Typography sx={{ fontFamily: FONT, textAlign: 'center', fontSize: 12.5, color: AC.muted, mt: 2.75 }}>
        Not a member?{' '}
        <Box
          component="span"
          onClick={() => onSwitch('register')}
          sx={{ color: AC.sageDark, fontWeight: 600, cursor: 'pointer', '&:hover': { color: AC.sage } }}
        >
          Register now
        </Box>
      </Typography>

      <RoleChoiceDialog
        open={Array.isArray(multiRoles) && multiRoles.length > 0}
        email={pickerEmail}
        roles={multiRoles || []}
        submittingRole={submittingRole}
        onChoose={handleRoleChoice}
        onClose={closePicker}
      />
    </Box>
  );
};

export default LoginForm;