import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Typography, CircularProgress, Alert,
  InputAdornment, IconButton,
} from '@mui/material';
import { CheckCircle, ArrowBack, Visibility, VisibilityOff } from '@mui/icons-material';
import authService from '@/services/api/authService';
import { AC, FONT, InkButton, PillField, Eyebrow } from '../authTheme';

const STEPS = { EMAIL: 1, ROLE: 2, OTP: 3, NEW_PASSWORD: 4, SUCCESS: 5 };

const ROLE_META = {
  COMPANY:   { icon: '🏢', title: 'Company account',   desc: 'Reset your organization admin password.' },
  EMPLOYER:  { icon: '💼', title: 'Employer account',  desc: 'Reset your recruiter login.' },
  JOBSEEKER: { icon: '👤', title: 'Jobseeker account', desc: 'Reset your candidate login.' },
  ALL:       { icon: '🔒', title: 'All accounts',      desc: 'Reset every account under this email with one password.' },
};

/* ── Shared bits ──────────────────────────────────────────────────────────── */
const headingSx = { fontFamily: FONT, color: AC.ink, mb: 0.75, fontSize: 34, lineHeight: 1.05, fontWeight: 800, letterSpacing: '-1px' };
const subSx     = { fontFamily: FONT, color: AC.muted, mb: 3, fontSize: 13, lineHeight: 1.6 };

const errorAlertSx = { mb: 2.5, borderRadius: '12px', fontSize: '0.83rem' };

/* Ghost back / secondary button */
const GhostButton = ({ children, onClick, disabled, startIcon }) => (
  <Box
    component="button"
    type="button"
    onClick={onClick}
    disabled={disabled}
    sx={{
      width: '100%', mt: 1.5, cursor: disabled ? 'default' : 'pointer',
      border: `1px solid ${AC.line}`, background: '#fff', borderRadius: '999px',
      height: 46, fontFamily: FONT, fontSize: 14, fontWeight: 500, color: AC.muted,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      transition: 'all .2s',
      '&:hover': disabled ? {} : { borderColor: AC.sage, color: AC.ink, background: AC.sageSoft },
    }}
  >
    {startIcon}{children}
  </Box>
);

/* Step progress bar (sage) */
const StepBadge = ({ current, total }) => (
  <Box sx={{ display: 'flex', gap: 0.75, mb: 3 }}>
    {Array.from({ length: total }).map((_, i) => (
      <Box
        key={i}
        sx={{
          height: 4, borderRadius: 4, flex: 1,
          background: i < current ? AC.sage : AC.line,
          transition: 'background 0.4s ease',
        }}
      />
    ))}
  </Box>
);

/* ── 6-cell OTP input — editorial underline style matching the LineField. */
function OtpInputLine({ value, onChange, error }) {
  const refs = useRef([]);
  const digits = value.padEnd(6, ' ').split('').slice(0, 6);

  const focusIdx = useCallback((i) => {
    if (i >= 0 && i < 6) refs.current[i]?.focus();
  }, []);

  const handleKey = useCallback((e, i) => {
    const k = e.key;
    if (k === 'Backspace') {
      e.preventDefault();
      const arr = value.split('');
      if (arr[i]) { arr[i] = ''; onChange(arr.join('')); }
      else if (i > 0) { arr[i - 1] = ''; onChange(arr.join('')); focusIdx(i - 1); }
      return;
    }
    if (k === 'ArrowLeft')  { e.preventDefault(); focusIdx(i - 1); return; }
    if (k === 'ArrowRight') { e.preventDefault(); focusIdx(i + 1); return; }
    if (/^\d$/.test(k)) {
      e.preventDefault();
      const arr = value.padEnd(6, ' ').split('').slice(0, 6);
      arr[i] = k;
      const next = arr.join('').replace(/\s/g, '');
      onChange(next);
      if (i < 5) focusIdx(i + 1);
    }
  }, [value, onChange, focusIdx]);

  const handlePaste = useCallback((e) => {
    e.preventDefault();
    const pasted = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
    if (pasted) { onChange(pasted); focusIdx(Math.min(pasted.length, 5)); }
  }, [onChange, focusIdx]);

  return (
    <Box sx={{ display: 'flex', gap: { xs: 1, sm: 1.5 }, mb: 2.5, justifyContent: 'center' }}>
      {digits.map((d, i) => (
        <Box key={i} sx={{ position: 'relative', flex: '0 0 46px' }}>
          <Box
            component="input"
            ref={(el) => { refs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            autoComplete="one-time-code"
            aria-label={`Digit ${i + 1}`}
            value={d.trim()}
            onKeyDown={(e) => handleKey(e, i)}
            onPaste={handlePaste}
            onFocus={(e) => e.target.select()}
            onChange={() => {}}
            sx={{
              width: '100%', height: 52, border: 'none', outline: 'none',
              borderBottom: `2px solid ${error ? '#D9534F' : AC.line}`,
              background: 'transparent', textAlign: 'center',
              fontFamily: FONT, fontSize: 22, fontWeight: 600, color: AC.ink,
              caretColor: AC.sage, transition: 'border-color .2s',
              '&:focus': { borderBottomColor: error ? '#D9534F' : AC.sage },
            }}
          />
        </Box>
      ))}
    </Box>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */

const ForgotPasswordForm = ({ onSwitch, backRef }) => {
  const [step,        setStep]        = useState(STEPS.EMAIL);
  const [email,       setEmail]       = useState('');
  const [otp,         setOtp]         = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [loading,          setLoading]          = useState(false);
  const [error,            setError]            = useState('');
  const [showNewPass,      setShowNewPass]      = useState(false);
  const [showConfirmPass,  setShowConfirmPass]  = useState(false);
  const [availableRoles,   setAvailableRoles]   = useState([]);
  const [selectedRole,     setSelectedRole]     = useState(null);

  /* ── Step-aware back — exposed to the AuthPage top bar via backRef so the
        global Back button walks the flow: New password -> OTP -> Email -> Sign in. */
  useEffect(() => {
    if (!backRef) return undefined;
    backRef.current = () => {
      setError('');
      if (step === STEPS.NEW_PASSWORD) {
        setNewPassword(''); setConfirmPass('');
        setStep(STEPS.OTP);
      } else if (step === STEPS.OTP) {
        setOtp('');
        // If user had only 1 role, they never saw the picker — go to EMAIL.
        setStep(availableRoles.length > 1 ? STEPS.ROLE : STEPS.EMAIL);
      } else if (step === STEPS.ROLE) {
        setSelectedRole(null);
        setStep(STEPS.EMAIL);
      } else {
        onSwitch('login');
      }
    };
    return () => { backRef.current = null; };
  }, [backRef, step, onSwitch]);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid email address'); return;
    }
    setLoading(true); setError('');
    try {
      const res = await authService.resetRolesForEmail(email);
      const roles = res.data?.Roles || [];

      if (roles.length === 0) {
        setError('No account found for this email.');
        return;
      }

      setAvailableRoles(roles);

      if (roles.length === 1) {
        const only = roles[0];
        setSelectedRole(only);
        await authService.forgotPassword(email, only);
        setStep(STEPS.OTP);
      } else {
        setStep(STEPS.ROLE);
      }
    } catch (err) {
      setError(err.response?.data?.Error || 'Could not look up your accounts. Try again.');
    } finally { setLoading(false); }
  };

  // Step 2 (ROLE) → Step 3 (OTP): send OTP with the chosen scope.
  const handlePickRole = async (role) => {
    setSelectedRole(role);
    setLoading(true); setError('');
    try {
      await authService.forgotPassword(email, role);
      setStep(STEPS.OTP);
    } catch (err) {
      setError(err.response?.data?.Error || 'Failed to send OTP. Please try again.');
    } finally { setLoading(false); }
  };

  const handleResendOtp = async () => {
    setLoading(true); setError('');
    try { await authService.resendResetOtp(email, selectedRole); }
    catch (err) { setError(err.response?.data?.Error || 'Failed to resend OTP.'); }
    finally { setLoading(false); }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp.trim() || otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      setError('OTP must be a 6-digit number'); return;
    }
    setLoading(true); setError('');
    try {
      await authService.verifyResetOtp(email, otp);
      setStep(STEPS.NEW_PASSWORD);
    } catch (err) {
      const msg = err.response?.data?.Error || 'Invalid OTP. Please try again.';
      const rem = err.response?.data?.Attempts_Remaining;
      setError(rem !== undefined ? `${msg} (${rem} attempts left)` : msg);
    } finally { setLoading(false); }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (newPassword !== confirmPass) { setError('Passwords do not match'); return; }
    setLoading(true); setError('');
    try {
      await authService.resetPassword(email, otp, newPassword);
      setStep(STEPS.SUCCESS);
    } catch (err) {
      setError(err.response?.data?.Error || 'Failed to reset password. Please try again.');
    } finally { setLoading(false); }
  };

  /* ── Success ────────────────────────────────────────────────────────────── */
  if (step === STEPS.SUCCESS) return (
    <Box sx={{ textAlign: 'center', py: 3 }}>
      <Box sx={{
        width: 72, height: 72, borderRadius: '50%', mx: 'auto', mb: 2.5,
        bgcolor: AC.sageSoft, border: `1px solid rgba(127,158,126,0.35)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <CheckCircle sx={{ fontSize: 40, color: AC.sage }} />
      </Box>
      <Eyebrow label="ALL SET" sx={{ mx: 'auto' }} />
      <Typography sx={{ ...headingSx, fontSize: 28, mb: 1 }}>Password reset!</Typography>
      <Typography sx={{ ...subSx, mb: 3 }}>
        Your password has been updated. You can now sign in with your new credentials.
      </Typography>
      <InkButton fullWidth startIcon={<ArrowBack sx={{ fontSize: '1rem' }} />} onClick={() => onSwitch('login')}>
        Back to Sign In
      </InkButton>
    </Box>
  );

 /* ── Step 1: Email ──────────────────────────────────────────────────────── */
  if (step === STEPS.EMAIL) return (
    <Box component="form" onSubmit={handleSendOtp} noValidate>
      <Eyebrow label="RESET PASSWORD" />
      <StepBadge current={1} total={4} />
      <Typography sx={headingSx}>Reset password</Typography>
      <Typography sx={subSx}>Enter your email and we'll show you which accounts can be reset</Typography>

      {error && <Alert severity="error" sx={errorAlertSx}>{error}</Alert>}

      <PillField
        placeholder="Email address" type="email" value={email}
        onChange={(e) => { setEmail(e.target.value); setError(''); }}
        sx={{ mb: 2 }}
      />

      <InkButton fullWidth type="submit" disabled={loading}>
        {loading ? <CircularProgress size={19} sx={{ color: '#fff' }} /> : 'Continue'}
      </InkButton>

      <GhostButton onClick={() => onSwitch('login')} startIcon={<ArrowBack sx={{ fontSize: '1rem' }} />}>
        Back to Sign In
      </GhostButton>
    </Box>
  );

  /* ── Step 2: Role picker (only reached when 2+ roles exist) ─────────────── */
  if (step === STEPS.ROLE) {
    const singleRoles = availableRoles.filter((r) =>
      ['COMPANY', 'EMPLOYER', 'JOBSEEKER'].includes(r)
    );
    const showAll = singleRoles.length >= 2;
    const options = [...singleRoles, ...(showAll ? ['ALL'] : [])];

    return (
      <Box>
        <Eyebrow label="RESET PASSWORD" />
        <StepBadge current={2} total={4} />
        <Typography sx={headingSx}>Which account?</Typography>
        <Typography sx={subSx}>
          <Box component="span" sx={{ color: AC.ink, fontWeight: 600 }}>{email}</Box>{' '}
          — pick the account you'd like to reset.
        </Typography>

        {error && <Alert severity="error" sx={errorAlertSx}>{error}</Alert>}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, mb: 2 }}>
          {options.map((role) => {
            const meta = ROLE_META[role];
            return (
              <Box
                key={role}
                role="button"
                tabIndex={0}
                onClick={() => !loading && handlePickRole(role)}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && !loading) {
                    e.preventDefault(); handlePickRole(role);
                  }
                }}
                sx={{
                  border: `1px solid ${AC.line}`,
                  borderRadius: '14px',
                  p: 1.75,
                  cursor: loading ? 'default' : 'pointer',
                  bgcolor: AC.white,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  opacity: loading && selectedRole !== role ? 0.55 : 1,
                  transition: 'all 0.2s',
                  '&:hover, &:focus-visible': loading ? {} : {
                    borderColor: AC.sage,
                    bgcolor: AC.sageSoft,
                    transform: 'translateY(-1px)',
                  },
                }}
              >
                <Box sx={{
                  width: 44, height: 44, borderRadius: '12px', flexShrink: 0,
                  bgcolor: AC.sageSoft, border: `1px solid rgba(127,158,126,0.3)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20,
                }}>
                  {meta.icon}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{
                    fontFamily: FONT, fontSize: 14, fontWeight: 600, color: AC.ink,
                  }}>
                    {meta.title}
                  </Typography>
                  <Typography sx={{
                    fontFamily: FONT, fontSize: 12, color: AC.muted, mt: 0.25, lineHeight: 1.45,
                  }}>
                    {meta.desc}
                  </Typography>
                </Box>
                {loading && selectedRole === role
                  ? <CircularProgress size={16} sx={{ color: AC.sage }} />
                  : <Typography sx={{ fontSize: 16, color: AC.sage }}>→</Typography>}
              </Box>
            );
          })}
        </Box>

        <GhostButton
          onClick={() => { setStep(STEPS.EMAIL); setAvailableRoles([]); setError(''); }}
          startIcon={<ArrowBack sx={{ fontSize: '1rem' }} />}
          disabled={loading}
        >
          Change email
        </GhostButton>
      </Box>
    );
  }

 /* ── Step 3: OTP ─────────────────────────────────────────────────────────── */
  if (step === STEPS.OTP) return (
    <Box component="form" onSubmit={handleVerifyOtp} noValidate>
      <Eyebrow label="RESET PASSWORD" />
      <StepBadge current={3} total={4} />
      <Typography sx={headingSx}>Enter OTP</Typography>
      <Typography sx={subSx}>
        We sent a 6-digit code to <Box component="span" sx={{ color: AC.ink, fontWeight: 600 }}>{email}</Box>
        {selectedRole && selectedRole !== 'ALL' && ` for your ${selectedRole.toLowerCase()} account`}
        {selectedRole === 'ALL' && ' — this OTP resets all your accounts'}.
        It expires in 10 minutes.
      </Typography>

      {error && <Alert severity="error" sx={errorAlertSx}>{error}</Alert>}

      <OtpInputLine
        value={otp}
        onChange={(v) => { setOtp(v); setError(''); }}
        error={!!error}
      />

      <InkButton fullWidth type="submit" disabled={loading}>
        {loading ? <CircularProgress size={19} sx={{ color: '#fff' }} /> : 'Verify OTP'}
      </InkButton>

      <GhostButton onClick={handleResendOtp} disabled={loading}>Resend OTP</GhostButton>
      <GhostButton
        onClick={() => {
          setOtp(''); setError('');
          // Go to picker only if user actually had a choice.
          setStep(availableRoles.length > 1 ? STEPS.ROLE : STEPS.EMAIL);
        }}
        startIcon={<ArrowBack sx={{ fontSize: '1rem' }} />}
      >
        {availableRoles.length > 1 ? 'Change account' : 'Change email'}
      </GhostButton>
    </Box>
  );

 /* ── Step 4: New password ───────────────────────────────────────────────── */
  if (step === STEPS.NEW_PASSWORD) return (
    <Box component="form" onSubmit={handleResetPassword} noValidate>
      <Eyebrow label="RESET PASSWORD" />
      <StepBadge current={4} total={4} />
      <Typography sx={headingSx}>New password</Typography>
      <Typography sx={subSx}>
        {selectedRole === 'ALL'
          ? 'This password will be applied to all your accounts.'
          : 'Choose a strong password for your account.'}
      </Typography>

      {error && <Alert severity="error" sx={errorAlertSx}>{error}</Alert>}

      <PillField
        placeholder="New password"
        type={showNewPass ? 'text' : 'password'}
        value={newPassword}
        onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
        sx={{ mb: 1.5 }}
        slotProps={{
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => setShowNewPass((p) => !p)} edge="end" size="small" sx={{ color: AC.hint }}>
                  {showNewPass ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
      />

      <PillField
        placeholder="Confirm new password"
        type={showConfirmPass ? 'text' : 'password'}
        value={confirmPass}
        onChange={(e) => { setConfirmPass(e.target.value); setError(''); }}
        sx={{ mb: 2 }}
        slotProps={{
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => setShowConfirmPass((p) => !p)} edge="end" size="small" sx={{ color: AC.hint }}>
                  {showConfirmPass ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
      />

      <InkButton fullWidth type="submit" disabled={loading}>
        {loading ? <CircularProgress size={19} sx={{ color: '#fff' }} /> : 'Reset Password'}
      </InkButton>
    </Box>
  );

  return null;
};

export default ForgotPasswordForm;