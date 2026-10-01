// BUILD: 2026-08-25-iaem-registerform-v3
import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, TextField, MenuItem, Button, Chip, Autocomplete,
  CircularProgress, Alert, Grid, Checkbox, FormControlLabel, FormGroup, FormLabel,
} from '@mui/material';
import { interviewerAuthService } from '@/services/api/iaem';
import { SENIORITY_OPTIONS } from '@/constants/iaem';
import {
  parsePhoneNumberFromString,
  getCountries,
  getCountryCallingCode,
  getExampleNumber,
} from 'libphonenumber-js/max';
import phoneExamples from 'libphonenumber-js/examples.mobile.json';

const SKILL_OPTIONS = ['JavaScript', 'TypeScript', 'React', 'Angular', 'Vue', 'Node.js', 'Python', 'Django', 'Java', 'Spring', 'Go', 'Rust', 'C++', 'SQL', 'PostgreSQL', 'MongoDB', 'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'System Design', 'ML', 'Data Science', 'DevOps', 'iOS', 'Android', 'Flutter', 'UX Research', 'Figma', 'Product Strategy', 'Analytics'];
const LANGUAGE_OPTIONS = ['English', 'Hindi', 'Telugu', 'Tamil', 'Kannada', 'Malayalam', 'Marathi', 'Bengali', 'Gujarati', 'Punjabi', 'Urdu', 'French', 'German', 'Spanish', 'Japanese', 'Korean', 'Mandarin'];
const TIMEZONE_OPTIONS = ['Asia/Kolkata', 'America/New_York', 'America/Los_Angeles', 'America/Chicago', 'Europe/London', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Singapore', 'Australia/Sydney', 'Pacific/Auckland'];

// ── Country phone code dropdown data ──
const REGION_NAMES =
  typeof Intl !== 'undefined' && Intl.DisplayNames
    ? new Intl.DisplayNames(['en'], { type: 'region' })
    : null;
const PRIORITY_ISO = ['IN', 'US', 'GB', 'AE', 'SG', 'AU', 'CA'];
const COUNTRY_CODES = (() => {
  const list = getCountries().map((iso2) => ({
    value: iso2,
    iso: iso2.toLowerCase(),
    code: `+${getCountryCallingCode(iso2)}`,
    name: REGION_NAMES?.of(iso2) || iso2,
  }));
  const rank = (c) => {
    const i = PRIORITY_ISO.indexOf(c.value);
    return i === -1 ? PRIORITY_ISO.length : i;
  };
  return list.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
})();
const getCountry = (v) => COUNTRY_CODES.find((c) => c.value === v) || COUNTRY_CODES[0];
const _exampleCache = {};
const phoneExample = (iso) => {
  if (_exampleCache[iso] === undefined) {
    const ex = getExampleNumber(iso, phoneExamples);
    _exampleCache[iso] = ex ? ex.nationalNumber : '';
  }
  return _exampleCache[iso];
};

// ── Validators ──
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const validateEmail = (v) => {
  if (!v) return '';
  if (!EMAIL_RE.test(v.trim())) return 'Enter a valid email address';
  return '';
};
const validatePhone = (digits, countryIso) => {
  if (!digits) return '';
  const cleaned = String(digits).replace(/\D/g, '');
  if (!cleaned) return 'Enter a valid phone number';
  const parsed = parsePhoneNumberFromString(cleaned, countryIso);
  if (!parsed || !parsed.isValid()) {
    const c = getCountry(countryIso);
    const ex = phoneExample(countryIso);
    return `Not a valid ${c.name} number${ex ? ` — e.g. ${ex}` : ''}`;
  }
  const type = parsed.getType();
  if (type && !['MOBILE', 'FIXED_LINE_OR_MOBILE', 'PERSONAL_NUMBER'].includes(type)) {
    return 'Please enter a mobile number';
  }
  return '';
};

const InterviewerRegisterForm = ({ onSwitch }) => {
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    company_id: '', department: '', designation: '', seniority: '',
        skills: [], languages: [], timezone: 'Asia/Kolkata', showOtherSkill: false,
  });
  const [countryIso, setCountryIso] = useState('IN');
  const [fieldErrors, setFieldErrors] = useState({ email: '', phone: '' });
  const [companyOptions, setCompanyOptions] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // ── Email OTP verification state ──
  const [emailVerified, setEmailVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpBusy, setOtpBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const otpRefs = useRef([]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const update = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    // Live validation for email — show error while typing (but not on empty field)
    if (field === 'email') {
      setFieldErrors(prev => ({
        ...prev,
        email: value ? validateEmail(value) : '',
      }));
      setEmailVerified(false);
      setOtpSent(false);
      setOtp('');
      setOtpError('');
    }
    // Live validation for phone — show error while typing (skip while empty)
    if (field === 'phone') {
      setFieldErrors(prev => ({
        ...prev,
        phone: value ? validatePhone(value, countryIso) : '',
      }));
    }
  };

  const handleRequestOtp = async () => {
    const emailErr = validateEmail(form.email);
    if (emailErr) { setFieldErrors(prev => ({ ...prev, email: emailErr })); return; }
    setOtpBusy(true);
    setOtpError('');
    try {
      await interviewerAuthService.requestEmailOtp(form.email.trim().toLowerCase());
      setOtpSent(true);
      setOtp('');
      setResendIn(300);
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Failed to send code. Please try again.';
      setFieldErrors(prev => ({ ...prev, email: msg }));
    } finally {
      setOtpBusy(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) { setOtpError('Enter the 6-digit code'); return; }
    setOtpBusy(true);
    setOtpError('');
    try {
      await interviewerAuthService.verifyEmailOtp(form.email.trim().toLowerCase(), otp);
      setEmailVerified(true);
      setOtpSent(false);
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Invalid code.';
      setOtpError(msg);
    } finally {
      setOtpBusy(false);
    }
  };

  // Load companies on mount (shows first 50)
  useEffect(() => {
    interviewerAuthService.getCompanies()
      .then(r => setCompanyOptions(r.data.companies || []))
      .catch(() => {});
  }, []);

  // Search companies as user types
  const fetchCompanies = (search) => {
    interviewerAuthService.getCompanies(search)
      .then(r => setCompanyOptions(r.data.companies || []))
      .catch(() => {});
  };

  const canSubmit = form.first_name && form.last_name && form.email && form.phone &&
    emailVerified &&
    form.company_id && form.department && form.designation && form.seniority &&
        form.skills.length > 0 && form.languages.length > 0 &&
        !fieldErrors.email && !fieldErrors.phone;

  const handleSubmit = async () => {
    // Run validation before submit
    const emailErr = validateEmail(form.email);
    const phoneErr = validatePhone(form.phone, countryIso);
    if (emailErr || phoneErr) {
      setFieldErrors({ email: emailErr, phone: phoneErr });
      return;
    }
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      const { showOtherSkill, ...rest } = form;
      const dialCode = getCountry(countryIso).code;
      await interviewerAuthService.register({
        ...rest,
        phone: `${dialCode}${form.phone}`,
      });
      setSuccess(true);
    } catch (err) {
      const d = err?.response?.data;
      if (d && typeof d === 'object' && !d.message) {
        const msgs = Object.entries(d).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`);
        setError(msgs.join(' | '));
      } else {
        setError(d?.message || d?.detail || 'Registration failed. Please try again.');
      }
    } finally { setSubmitting(false); }
  };

  if (success) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: '#2C2C2A', mb: 1 }}>Registration Submitted</Typography>
        <Typography variant="body2" sx={{ color: '#888', mb: 3, maxWidth: 400, mx: 'auto', lineHeight: 1.7 }}>
          Your registration has been submitted for review. Two HR reviewers must independently approve your profile before you can activate your account. You will receive an email once approved.
        </Typography>
        <Button onClick={() => onSwitch('login')} sx={{ textTransform: 'none', fontWeight: 600, color: '#04282B' }}>
          Back to Sign In
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Typography sx={{ fontSize: 26, fontWeight: 700, color: '#2C2C2A', mb: 0.5, letterSpacing: '-0.5px' }}>
        Interviewer Registration
      </Typography>
      <Typography sx={{ fontSize: 13, color: '#888', mb: 3 }}>
        Register as an interviewer on iEvalX. Your details will be reviewed by HR before activation.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      <Grid container spacing={2}>
        <Grid size={{ xs: 6 }}>
          <TextField fullWidth size="small" label="First Name" value={form.first_name} onChange={e => update('first_name', e.target.value)} required />
        </Grid>
        <Grid size={{ xs: 6 }}>
          <TextField fullWidth size="small" label="Last Name" value={form.last_name} onChange={e => update('last_name', e.target.value)} required />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TextField fullWidth size="small" label="Email" type="email"
            value={form.email}
            onChange={e => update('email', e.target.value)}
            onBlur={() => { if (form.email) setFieldErrors(prev => ({ ...prev, email: validateEmail(form.email) })); }}
            error={!!fieldErrors.email}
            helperText={fieldErrors.email}
            disabled={emailVerified}
            required
            slotProps={{
              input: {
                endAdornment: emailVerified ? (
                  <Chip
                    size="small"
                    label="✓ Verified"
                    sx={{
                      bgcolor: '#E1F5EE', color: '#0F6E56',
                      fontWeight: 700, fontSize: '0.7rem',
                      height: 22, mr: -0.5,
                    }}
                  />
                ) : (!otpSent && (
                  <Button
                    size="small"
                    onClick={handleRequestOtp}
                    disabled={otpBusy || !form.email || !!validateEmail(form.email)}
                    sx={{
                      textTransform: 'none', fontWeight: 600,
                      bgcolor: '#04282B', color: '#fff',
                      fontSize: '0.72rem', minWidth: 0, px: 1.5, py: 0.4,
                      mr: -0.5, boxShadow: 'none',
                      '&:hover': { bgcolor: '#0a3d40', boxShadow: 'none' },
                      '&.Mui-disabled': { bgcolor: '#E6E7E2', color: '#999' },
                    }}
                  >
                    {otpBusy ? <CircularProgress size={12} sx={{ color: '#fff' }} /> : 'Verify'}
                  </Button>
                )),
              },
            }}
          />
        </Grid>
        {otpSent && !emailVerified && (
          <Grid size={{ xs: 12 }}>
            <Box sx={{ bgcolor: '#F1F5EF', border: '1px solid #D9E3D2', borderRadius: 2, p: 1.5 }}>
              <Typography sx={{ fontSize: 12, color: '#273238', mb: 1 }}>
                Enter the 6-digit code sent to <b>{form.email}</b>
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', mb: 1 }}>
                {[0, 1, 2, 3, 4, 5].map(i => (
                  <Box
                    key={i}
                    component="input"
                    ref={(el) => { otpRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    autoComplete="one-time-code"
                    aria-label={`Digit ${i + 1}`}
                    value={otp[i] || ''}
                    onChange={(e) => {
                      const v = (e.target.value || '').replace(/\D/g, '').slice(0, 1);
                      const arr = otp.padEnd(6, ' ').split('').slice(0, 6);
                      arr[i] = v || ' ';
                      const next = arr.join('').replace(/\s/g, '');
                      setOtp(next);
                      setOtpError('');
                      if (v && i < 5) otpRefs.current[i + 1]?.focus();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace' && !otp[i] && i > 0) {
                        otpRefs.current[i - 1]?.focus();
                      }
                      if (e.key === 'ArrowLeft' && i > 0) otpRefs.current[i - 1]?.focus();
                      if (e.key === 'ArrowRight' && i < 5) otpRefs.current[i + 1]?.focus();
                    }}
                    onPaste={(e) => {
                      e.preventDefault();
                      const pasted = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
                      if (pasted) {
                        setOtp(pasted);
                        setOtpError('');
                        otpRefs.current[Math.min(pasted.length, 5)]?.focus();
                      }
                    }}
                    onFocus={(e) => e.target.select()}
                    sx={{
                      width: 32, height: 38, border: 'none', outline: 'none',
                      borderBottom: `2px solid ${otpError ? '#D9534F' : '#5DCAA5'}`,
                      background: 'transparent', textAlign: 'center',
                      fontSize: 18, fontWeight: 600, color: '#273238',
                      caretColor: '#5DCAA5', transition: 'border-color .2s',
                      '&:focus': { borderBottomColor: otpError ? '#D9534F' : '#0F6E56' },
                    }}
                  />
                ))}
              </Box>
              {otpError && (
                <Typography sx={{ fontSize: 11, color: '#D9534F', textAlign: 'center', mb: 1 }}>
                  {otpError}
                </Typography>
              )}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Button
                  size="small"
                  onClick={handleRequestOtp}
                  disabled={resendIn > 0 || otpBusy}
                  sx={{
                    textTransform: 'none', fontSize: '0.72rem', fontWeight: 600,
                    color: resendIn > 0 ? '#999' : '#04282B', p: 0, minWidth: 0,
                  }}
                >
                  {resendIn > 0
                    ? `Resend in ${Math.floor(resendIn / 60)}:${String(resendIn % 60).padStart(2, '0')}`
                    : 'Resend code'}
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  onClick={handleVerifyOtp}
                  disabled={otp.length !== 6 || otpBusy}
                  sx={{
                    textTransform: 'none', fontSize: '0.72rem', fontWeight: 700,
                    bgcolor: '#04282B', px: 2, py: 0.5, boxShadow: 'none',
                    '&:hover': { bgcolor: '#0a3d40', boxShadow: 'none' },
                  }}
                >
                  {otpBusy ? <CircularProgress size={12} sx={{ color: '#fff' }} /> : 'Verify code'}
                </Button>
              </Box>
            </Box>
          </Grid>
        )}
        <Grid size={{ xs: 12 }}>
          <TextField fullWidth size="small" label="Phone"
            value={form.phone}
            onChange={e => {
              const raw = e.target.value.replace(/[^\d]/g, '').slice(0, 15);
              update('phone', raw);
            }}
            onBlur={() => { if (form.phone) setFieldErrors(prev => ({ ...prev, phone: validatePhone(form.phone, countryIso) })); }}
            error={!!fieldErrors.phone}
            helperText={fieldErrors.phone || `e.g. ${phoneExample(countryIso) || '9876543210'}`}
            required
            placeholder={phoneExample(countryIso) || '9876543210'}
            slotProps={{
              input: {
                startAdornment: (
                  <Box sx={{ display: 'flex', alignItems: 'center', mr: 0.5 }}>
                    <TextField
                      select size="small" variant="standard"
                      value={countryIso}
                      onChange={(e) => {
                        const iso = e.target.value;
                        setCountryIso(iso);
                        setFieldErrors(prev => ({
                          ...prev,
                          phone: form.phone ? validatePhone(form.phone, iso) : '',
                        }));
                      }}
                      sx={{
                        minWidth: 80, '& .MuiInput-underline:before': { border: 'none' },
                        '& .MuiInput-underline:after': { border: 'none' },
                        '& .MuiInput-underline:hover:not(.Mui-disabled):before': { border: 'none' },
                        '& .MuiSelect-select': { fontSize: '0.85rem', py: 0, pr: '20px !important' },
                      }}
                      SelectProps={{ MenuProps: { PaperProps: { sx: { maxHeight: 250 } } } }}
                    >
                      {COUNTRY_CODES.map(c => (
                        <MenuItem key={c.value} value={c.value} sx={{ fontSize: '0.82rem' }}>
                          {c.code} {c.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Box>
                ),
              },
            }}
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Autocomplete
            options={companyOptions}
            getOptionLabel={(opt) => typeof opt === 'string' ? opt : (opt.name || '')}
            isOptionEqualToValue={(opt, val) => opt.id === val.id}
            value={companyOptions.find(c => c.id === form.company_id) || null}
            onChange={(_, v) => update('company_id', v ? v.id : '')}
            onInputChange={(_, v, reason) => { if (reason === 'input' && v.length >= 2) fetchCompanies(v); }}
            renderInput={(params) => <TextField {...params} size="small" label="Company" placeholder="Search your company..." required />}
          />
        </Grid>
        <Grid size={{ xs: 6 }}>
          <TextField fullWidth size="small" label="Department" value={form.department} onChange={e => update('department', e.target.value)} required />
        </Grid>
        <Grid size={{ xs: 6 }}>
          <TextField fullWidth size="small" label="Job Role / Designation" value={form.designation} onChange={e => update('designation', e.target.value)} required />
        </Grid>
        <Grid size={{ xs: 6 }}>
          <TextField select fullWidth size="small" label="Seniority" value={form.seniority} onChange={e => update('seniority', e.target.value)} required>
            {SENIORITY_OPTIONS.map(s => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid size={{ xs: 6 }}>
          <TextField select fullWidth size="small" label="Timezone" value={form.timezone} onChange={e => update('timezone', e.target.value)}>
            {TIMEZONE_OPTIONS.map(tz => <MenuItem key={tz} value={tz}>{tz}</MenuItem>)}
          </TextField>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Autocomplete multiple freeSolo disableCloseOnSelect options={[...SKILL_OPTIONS, 'Other']} value={form.skills} onChange={(_, v) => {
            if (v.includes('Other') && !form.showOtherSkill) { update('showOtherSkill', true); update('skills', v.filter(s => s !== 'Other')); }
            else { update('skills', v); }
          }}
            renderOption={(props, option, { selected }) => (
              <li {...props} key={option}>
                <Checkbox size="small" checked={selected} sx={{ mr: 1 }} />
                {option}
              </li>
            )}
            renderTags={(val, getProps) => val.map((opt, i) => <Chip key={i} label={opt} size="small" {...getProps({ index: i })} sx={{ bgcolor: '#F5F5F5' }} />)}
            renderInput={(params) => <TextField {...params} size="small" label="Technical Skills" placeholder="Add skills..." required />} />
          {form.showOtherSkill && (
            <TextField fullWidth size="small" label="Enter your skill" placeholder="Type a skill and press Enter" sx={{ mt: 1 }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target.value.trim()) {
                  e.preventDefault();
                  update('skills', [...form.skills, e.target.value.trim()]);
                  e.target.value = '';
                  update('showOtherSkill', false);
                }
              }} />
          )}
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Autocomplete
            multiple
            disableCloseOnSelect
            options={LANGUAGE_OPTIONS}
            value={form.languages}
            onChange={(_, v) => update('languages', v)}
            renderOption={(props, option, { selected }) => (
              <li {...props} key={option}>
                <Checkbox size="small" checked={selected} sx={{ mr: 1 }} />
                {option}
              </li>
            )}
            renderTags={(val, getProps) => val.map((opt, i) => <Chip key={i} label={opt} size="small" {...getProps({ index: i })} sx={{ bgcolor: '#F5F5F5' }} />)}
            renderInput={(params) => <TextField {...params} size="small" label="Languages" placeholder="Select languages..." required />}
          />
        </Grid>
      </Grid>

      <Button fullWidth variant="contained" disabled={!canSubmit || submitting} onClick={handleSubmit}
        sx={{ mt: 3, py: 1.2, textTransform: 'none', fontWeight: 700, bgcolor: '#04282B', fontSize: '0.95rem', borderRadius: 2, '&:hover': { bgcolor: '#0a3d40' } }}>
        {submitting ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'Submit Registration'}
      </Button>
    </Box>
  );
};

export default InterviewerRegisterForm;