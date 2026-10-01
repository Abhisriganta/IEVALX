// BUILD: 2026-08-24-iaem-gaps-v1
// Guide Step 4 — Activation: confirm email, set password, then redirect to consent
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, TextField, Button, CircularProgress, Alert, InputAdornment, IconButton } from '@mui/material';
import { CheckCircle, Visibility, VisibilityOff } from '@mui/icons-material';
import { interviewerAuthService } from '@/services/api/iaem';
import { setConsentGate } from '@/hooks/interviewer/useConsentGate';

const ActivateAccount = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  // BUILD: 2026-09-25-activate-password-visibility-v1
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [activated, setActivated] = useState(false);

  const passwordValid = password.length >= 8;
  const passwordsMatch = password === confirm;
  const canSubmit = passwordValid && passwordsMatch;

  const handleActivate = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await interviewerAuthService.activate(token, password);
      if (res.data.consent_pending) {
        setConsentGate(); // Set the gate so PrivateRoute redirects to consent
      }
      setActivated(true);
    } catch (err) {
      setError(err?.response?.data?.message || 'Activation failed. The link may have expired.');
    } finally { setSubmitting(false); }
  };

  if (activated) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#F5F4F0', display: 'flex', alignItems: 'center', justifyContent: 'center', px: 2 }}>
        <Paper elevation={0} sx={{ maxWidth: 480, width: '100%', p: 4, borderRadius: 3, border: '1px solid #E8E8E8', textAlign: 'center' }}>
          <CheckCircle sx={{ fontSize: 56, color: '#4CAF50', mb: 2 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>Account Activated</Typography>
          <Typography variant="body2" sx={{ color: '#888', mb: 3, lineHeight: 1.7 }}>
            Your account is now active. Before you can access your dashboard, you need to review and acknowledge 12 consent clauses.
          </Typography>
          <Button variant="contained" onClick={() => navigate('/auth')}
            sx={{ textTransform: 'none', fontWeight: 600, bgcolor: '#04282B', px: 4, py: 1, '&:hover': { bgcolor: '#0a3d40' } }}>
            Sign In to Continue
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F5F4F0', display: 'flex', alignItems: 'center', justifyContent: 'center', px: 2 }}>
      <Paper elevation={0} sx={{ maxWidth: 480, width: '100%', p: 4, borderRadius: 3, border: '1px solid #E8E8E8' }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>Activate Your Account</Typography>
        <Typography variant="body2" sx={{ color: '#888', mb: 3, lineHeight: 1.7 }}>
          Your interviewer registration has been approved. Set your password below to activate your account.
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

        <TextField fullWidth size="small" type={showPassword ? 'text' : 'password'} label="Password" value={password}
          onChange={e => setPassword(e.target.value)} sx={{ mb: 2 }}
          error={password.length > 0 && !passwordValid}
                    helperText={password.length > 0 && !passwordValid ? 'Minimum 8 characters' : ''}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword(v => !v)}
                    onMouseDown={e => e.preventDefault()}
                    edge="end"
                    size="small"
                  >
                    {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            },
          }} />
        <TextField fullWidth size="small" type={showConfirm ? 'text' : 'password'} label="Confirm Password" value={confirm}
          onChange={e => setConfirm(e.target.value)} sx={{ mb: 3 }}
          error={confirm.length > 0 && !passwordsMatch}
          helperText={confirm.length > 0 && !passwordsMatch ? 'Passwords do not match' : ''}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                    onClick={() => setShowConfirm(v => !v)}
                    onMouseDown={e => e.preventDefault()}
                    edge="end"
                    size="small"
                  >
                    {showConfirm ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            },
          }} />

        <Button fullWidth variant="contained" disabled={!canSubmit || submitting} onClick={handleActivate}
          sx={{ py: 1.2, textTransform: 'none', fontWeight: 700, bgcolor: '#04282B', borderRadius: 2, '&:hover': { bgcolor: '#0a3d40' } }}>
          {submitting ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'Activate Account'}
        </Button>
      </Paper>
    </Box>
  );
};

export default ActivateAccount;
