import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, IconButton,
  Dialog, DialogContent, DialogActions,
  TextField, Select, MenuItem, FormControl, InputLabel,
  CircularProgress, FormHelperText, useTheme, useMediaQuery,
} from '@mui/material';
import {
  Close, InfoOutlined, Visibility, VisibilityOff, EditOutlined,
  GroupOutlined, BusinessCenterOutlined, PhoneOutlined,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';

/* ── Brand tokens — mirrors FindJobs / EmployersList BRAND.* ─────────── */
const BRAND = {
  navy:          '#022124',
  navyDark:      '#0A3A38',
  navySoft:      'rgba(127,158,126,0.10)',
  sage:          '#7F9E7E',
  sageDark:      '#6C8B6B',
  sageText:      '#5E815D',
  sageSoft:      '#EDF3EC',
  border:        '#E7EAE3',
  borderStrong:  '#D8DDD4',
  muted:         '#55584F',
  ink:           '#101210',
  bg:            '#F6F8F3',
  surface:       '#FFFFFF',
};

const FONT = "'Jost','DM Sans',sans-serif";

const HIDDEN_SCROLLBAR = {
  scrollbarWidth: 'none',
  msOverflowStyle: 'none',
  '&::-webkit-scrollbar': { width: 0, height: 0, display: 'none' },
};

const ROLES = ['Recruiter', 'Senior Recruiter', 'Hiring Manager', 'HR Admin', 'Viewer', 'Other'];
const DEPARTMENTS = [
  'Human Resources', 'Engineering', 'Sales', 'Marketing', 'Operations',
  'Finance', 'Product', 'Customer Success', 'Legal', 'Other',
];

const INIT = {
  full_name: '', email: '', employer_id: '',
  role: 'Recruiter', role_other: '',
  department: '', department_other: '',
  contact_number: '', location: '', password: '',
};

/* ── Shared input style ──────────────────────────────────────────────── */
const inputSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '12px',
    bgcolor: BRAND.surface,
    fontSize: { xs: '0.82rem', sm: '0.88rem', md: '0.92rem' },
    fontFamily: FONT,
    transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
    '& fieldset':             { borderColor: BRAND.border, borderWidth: '1.5px' },
    '&:hover fieldset':       { borderColor: BRAND.borderStrong },
    '&.Mui-focused':          { boxShadow: '0 0 0 3px rgba(127,158,126,0.12)' },
    '&.Mui-focused fieldset': { borderColor: BRAND.sage, borderWidth: '2px' },
  },
  '& .MuiInputLabel-root': {
    fontSize: { xs: '0.82rem', sm: '0.88rem', md: '0.92rem' },
    fontFamily: FONT, color: BRAND.muted,
  },
  '& .MuiInputLabel-root.Mui-focused': { color: BRAND.sageText },
  '& .MuiFormHelperText-root': {
    fontSize: { xs: '0.65rem', sm: '0.7rem' },
    fontFamily: FONT, ml: { xs: 0.5, sm: 1.5 },
  },
};

const gridSx = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
  columnGap: { xs: 1.5, sm: 2, md: 2.5 },
  rowGap: { xs: 0.75, sm: 1 },
};
const fullSpan = { gridColumn: { sm: '1 / -1' } };

const menuPaperSx = {
  boxShadow: '0 8px 24px rgba(2,33,36,0.12)',
  borderRadius: '12px',
  border: `1px solid ${BRAND.border}`,
  mt: 0.5,
  ...HIDDEN_SCROLLBAR,
  '& .MuiMenuItem-root': {
    fontSize: { xs: '0.82rem', sm: '0.88rem' },
    fontFamily: FONT,
    '&:hover': { bgcolor: BRAND.sageSoft },
    '&.Mui-selected': { bgcolor: BRAND.navySoft, color: BRAND.ink },
    '&.Mui-selected:hover': { bgcolor: 'rgba(127,158,126,0.18)' },
  },
};

/* ── Validation helpers ──────────────────────────────────────────────── */
const buildValidators = (isEdit) => ({
  full_name: (v) => {
    if (!v.trim()) return 'Full name is required';
    if (v.trim().length < 2) return 'Minimum 2 characters';
    if (v.trim().length > 100) return 'Maximum 100 characters';
    if (!/^[a-zA-Z][a-zA-Z ]*[a-zA-Z]$|^[a-zA-Z]$/.test(v.trim()))
      return 'Only alphabets and single spaces allowed';
    return '';
  },
  email: (v) => {
    if (!v.trim()) return 'Email is required';
    if (v.trim().length > 150) return 'Email too long';
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}$/.test(v.trim()))
      return 'Invalid email format';
    return '';
  },
  employer_id: (v) => {
    if (!v.trim()) return 'Employer ID is required';
    if (v.trim().length < 3) return 'Must be at least 3 characters';
    return '';
  },
  role:             (v) => !v ? 'Role is required' : '',
  role_other:       () => '',
  department:       (v) => !v ? 'Department is required' : '',
  department_other: () => '',
  contact_number: (v) => {
    if (!v.trim()) return 'Contact number is required';
    const d = String(v).replace(/\D/g, '');
    if (!/^\d{10}$/.test(d)) return 'Must be exactly 10 digits';
    if (/^(\d)\1+$/.test(d)) return 'Phone cannot be all same digits';
    if (!/^[6-9]/.test(d)) return 'Indian mobile must start with 6, 7, 8, or 9';
    return '';
  },
  location: (v) => {
    if (!v.trim()) return 'Location is required';
    if (v.trim().length < 3) return 'Minimum 3 characters';
    if (v.trim().length > 200) return 'Maximum 200 characters';
    return '';
  },
  password: (v) => {
    if (isEdit) return '';
    if (!v) return 'Password is required';
    if (v.length < 8)   return 'Minimum 8 characters';
    if (v.length > 128) return 'Maximum 128 characters';
    if (!/[A-Z]/.test(v)) return 'Must contain an uppercase letter';
    if (!/[a-z]/.test(v)) return 'Must contain a lowercase letter';
    if (!/\d/.test(v))    return 'Must contain a number';
    if (!/[!@#$%^&*(),.?":{}|<>_\-+=/\\[\]~`';]/.test(v))
      return 'Must contain a special character';
    if (/(.)\1{2,}/.test(v)) return 'Cannot contain 3+ repeated characters';
    if (/(?:0123|1234|2345|3456|4567|5678|6789|abcd|bcde|cdef|qwer|wert|erty|asdf|sdfg)/i.test(v))
      return 'Cannot contain sequences like 1234, abcd, or qwerty';
    return '';
  },
});

const validateAll = (form, isEdit) => {
  const validators = buildValidators(isEdit);
  const errs = {};
  Object.keys(validators).forEach((key) => {
    if (isEdit && key === 'password') return;
    if (key === 'role_other' || key === 'department_other') return;
    const msg = validators[key](form[key] || '');
    if (msg) errs[key] = msg;
  });
  if (form.role === 'Other' && !form.role_other.trim()) errs.role_other = 'Please specify the role';
  if (form.department === 'Other' && !form.department_other.trim()) errs.department_other = 'Please specify the department';
  return errs;
};

/* ── SectionHead — sage icon + label ─────────────────────────────────── */
const SectionHead = ({ icon, title }) => (
  <Box sx={{
    display: 'flex', alignItems: 'center',
    gap: { xs: 0.75, sm: 1 }, mb: { xs: 1.25, sm: 1.5, md: 1.75 },
  }}>
    <Box sx={{
      width: { xs: 28, sm: 30 }, height: { xs: 28, sm: 30 },
      borderRadius: '9px', bgcolor: BRAND.sageSoft, color: BRAND.sageText,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      {icon}
    </Box>
    <Typography sx={{
      fontSize: { xs: '0.82rem', sm: '0.9rem', md: '0.95rem' },
      fontWeight: 700, color: BRAND.ink, fontFamily: FONT,
      letterSpacing: '-0.005em',
    }}>
      {title}
    </Typography>
  </Box>
);

/* ═══════════════════════════════════════════════════════════════════════
   AddEmployerDialog — FindJobs visual system
   ═══════════════════════════════════════════════════════════════════════ */
const AddEmployerDialog = ({
  open, onClose, editingEmployer, addEmployer, updateEmployer,
}) => {
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const isEdit = !!editingEmployer;

  const [form,    setForm]    = useState(INIT);
  const [errors,  setErrors]  = useState({});
  const [saving,  setSaving]  = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  useEffect(() => {
    if (open && editingEmployer) {
      setForm({
        full_name:        editingEmployer.full_name        || '',
        email:            editingEmployer.email            || '',
        employer_id:      editingEmployer.employer_id      || '',
        role:             editingEmployer.role             || 'Recruiter',
        role_other:       editingEmployer.role_other       || '',
        department:       editingEmployer.department       || '',
        department_other: editingEmployer.department_other || '',
        contact_number:   editingEmployer.contact_number   || '',
        location:         editingEmployer.location         || editingEmployer.address || '',
        password:         '',
      });
      setErrors({});
    } else if (open && !editingEmployer) {
      setForm(INIT);
      setErrors({});
    }
  }, [open, editingEmployer]);

  const handleChange = (field) => (e) => {
    let value = e.target.value;
    if (field === 'contact_number') value = value.replace(/\D/g, '').slice(0, 10);
    if (field === 'employer_id')    value = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (field === 'full_name')      value = value.replace(/[^a-zA-Z ]/g, '');
    if (field === 'location')       value = value.replace(/[^a-zA-Z0-9 ,.\-/#]/g, '');
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleBlur = (field) => () => {
    const validators = buildValidators(isEdit);
    const msg = validators[field](form[field] || '');
    setErrors((prev) => ({ ...prev, [field]: msg }));
  };

  const resetAndClose = () => {
    setForm(INIT); setErrors({}); setShowPwd(false); onClose();
  };

  const handleSubmit = async () => {
    const errs = validateAll(form, isEdit);
    if (Object.keys(errs).length) {
      setErrors(errs);
      enqueueSnackbar('Please fix the highlighted fields.', { variant: 'warning' });
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        const { password, ...updatePayload } = form;
        await updateEmployer(editingEmployer.id, updatePayload);
        enqueueSnackbar('Employer updated successfully.', { variant: 'success' });
      } else {
        const { emailSent } = await addEmployer(form);
        if (emailSent === false) {
          enqueueSnackbar(
            `Employer added, but email delivery to ${form.email} failed. Share credentials manually.`,
            { variant: 'warning' },
          );
        } else {
          enqueueSnackbar(`Invitation email sent to ${form.email}`, { variant: 'success' });
        }
      }
      resetAndClose();
    } catch (err) {
      enqueueSnackbar(
        err.friendlyMessage || (isEdit ? 'Failed to update employer.' : 'Failed to add employer.'),
        { variant: 'error' },
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : resetAndClose}
      maxWidth="md"
      fullWidth
      fullScreen={fullScreen}
      slotProps={{
        paper: { sx: {
          borderRadius: fullScreen ? 0 : { xs: '14px', sm: '16px', md: '18px' },
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(2,33,36,0.18)',
          bgcolor: BRAND.bg,
          fontFamily: FONT,
          ...(fullScreen ? {} : { maxHeight: '92vh' }),
          '@media (min-width: 1281px)': { maxWidth: '820px' },
          '@media (min-width: 1600px)': { maxWidth: '880px' },
        } },
      }}
    >
      {/* ── Pine header (mirrors FindJobs drawer header) ───────────── */}
      <Box sx={{
        background: `linear-gradient(160deg, #08302F 0%, #0E1E1D 70%, #121615 100%)`,
        px: { xs: 2, sm: 2.5, md: 3 },
        py: { xs: 1.75, sm: 2, md: 2.5 },
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        gap: { xs: 1, sm: 1.5 },
        position: 'relative', overflow: 'hidden',
      }}>
        <Box sx={{
          position: 'absolute', top: -30, right: -30,
          width: 120, height: 120, borderRadius: '50%',
          bgcolor: 'rgba(127,158,126,0.06)', pointerEvents: 'none',
        }} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.25 }, minWidth: 0, position: 'relative' }}>
          <Box sx={{
            width: { xs: 36, sm: 40, md: 44 }, height: { xs: 36, sm: 40, md: 44 },
            borderRadius: { xs: '10px', sm: '12px' }, flex: 'none',
            bgcolor: 'rgba(127,158,126,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {isEdit
              ? <EditOutlined sx={{ color: BRAND.sage, fontSize: { xs: 18, sm: 22 } }} />
              : <GroupOutlined sx={{ color: BRAND.sage, fontSize: { xs: 18, sm: 22 } }} />}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{
              fontWeight: 700, color: 'rgba(255,255,255,0.97)', lineHeight: 1.2,
              fontSize: { xs: '0.95rem', sm: '1.1rem', md: '1.2rem' },
              fontFamily: FONT,
            }}>
              {isEdit ? 'Edit Employer' : 'Add Employer'}
            </Typography>
            <Typography sx={{
              color: 'rgba(255,255,255,0.55)',
              display: { xs: 'none', sm: 'block' },
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              fontSize: { sm: '0.75rem', md: '0.8rem' }, fontFamily: FONT,
            }}>
              {isEdit
                ? `Update details for ${editingEmployer?.full_name || 'this employer'}.`
                : 'An invitation email will be sent to the employer.'}
            </Typography>
          </Box>
        </Box>
        <IconButton
          size="small" onClick={resetAndClose} disabled={saving}
          sx={{
            flex: 'none', color: 'rgba(255,255,255,0.7)',
            width: { xs: 34, sm: 38 }, height: { xs: 34, sm: 38 },
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '10px',
            '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.1)' },
          }}
        >
          <Close sx={{ fontSize: { xs: 16, sm: 18 } }} />
        </IconButton>
      </Box>

      {/* ── Body ─────────────────────────────────────────────────────── */}
      <DialogContent sx={{
        pt: { xs: 2, sm: 2.5, md: 3 },
        pb: { xs: 1.5, sm: 2 },
        px: { xs: 2, sm: 2.5, md: 3 },
        bgcolor: BRAND.bg,
        overflowY: 'auto', overflowX: 'hidden',
        ...HIDDEN_SCROLLBAR,
      }}>
        {/* Info banner (add mode only) */}
        {!isEdit && (
          <Box sx={{
            display: 'flex', gap: { xs: 1, sm: 1.25 }, alignItems: 'flex-start',
            bgcolor: BRAND.sageSoft, border: `1px solid ${BRAND.border}`,
            borderRadius: '12px',
            px: { xs: 1.5, sm: 1.75 }, py: { xs: 1.25, sm: 1.5 },
            mb: { xs: 2, sm: 2.5, md: 3 },
          }}>
            <InfoOutlined sx={{ fontSize: { xs: 16, sm: 18 }, color: BRAND.sageText, mt: '2px', flex: 'none' }} />
            <Typography sx={{
              color: BRAND.muted, lineHeight: 1.55, fontFamily: FONT,
              fontSize: { xs: '0.72rem', sm: '0.76rem', md: '0.8rem' },
            }}>
              The employer will receive an email with their credentials. They can continue with the
              provided password or reset it before accessing the employer dashboard.
            </Typography>
          </Box>
        )}

        {/* ── Personal details ──────────────────────────────────────── */}
        <Box sx={{ mb: { xs: 2, sm: 2.5, md: 3 } }}>
          <SectionHead icon={<GroupOutlined sx={{ fontSize: { xs: 16, sm: 18 } }} />} title="Personal Details" />
          <Box sx={gridSx}>
            <TextField fullWidth size="small"
              label="Full Name *"
              value={form.full_name}
              onChange={handleChange('full_name')}
              onBlur={handleBlur('full_name')}
              error={!!errors.full_name}
              helperText={errors.full_name || ' '}
              sx={{ ...fullSpan, ...inputSx }}
            />
            <TextField fullWidth size="small" type="email"
              label="Email Address *"
              value={form.email}
              onChange={handleChange('email')}
              onBlur={handleBlur('email')}
              error={!!errors.email}
              helperText={errors.email || ' '}
              sx={inputSx}
            />
            <TextField fullWidth size="small"
              label="Employer ID *"
              placeholder="e.g. TCS001"
              value={form.employer_id}
              onChange={handleChange('employer_id')}
              onBlur={handleBlur('employer_id')}
              error={!!errors.employer_id}
              helperText={errors.employer_id || 'Unique within your company'}
              sx={inputSx}
            />
          </Box>
        </Box>

        {/* ── Role & Department ─────────────────────────────────────── */}
        <Box sx={{ mb: { xs: 2, sm: 2.5, md: 3 } }}>
          <SectionHead icon={<BusinessCenterOutlined sx={{ fontSize: { xs: 16, sm: 18 } }} />} title="Role & Department" />
          <Box sx={gridSx}>
            <FormControl fullWidth size="small" error={!!errors.role} sx={inputSx}>
              <InputLabel>Designation / Role *</InputLabel>
              <Select
                value={form.role} label="Designation / Role *"
                onChange={handleChange('role')} onBlur={handleBlur('role')}
                MenuProps={{ slotProps: { paper: { sx: menuPaperSx } } }}
              >
                {ROLES.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
              </Select>
              <FormHelperText>{errors.role || ' '}</FormHelperText>
            </FormControl>

            <FormControl fullWidth size="small" error={!!errors.department} sx={inputSx}>
              <InputLabel>Department *</InputLabel>
              <Select
                value={form.department} label="Department *"
                onChange={handleChange('department')} onBlur={handleBlur('department')}
                MenuProps={{ slotProps: { paper: { sx: menuPaperSx } } }}
              >
                {DEPARTMENTS.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
              </Select>
              <FormHelperText>{errors.department || ' '}</FormHelperText>
            </FormControl>

            {form.role === 'Other' && (
              <TextField fullWidth size="small"
                label="Specify Role *" placeholder="Enter role / designation"
                value={form.role_other}
                onChange={handleChange('role_other')} onBlur={handleBlur('role_other')}
                error={!!errors.role_other} helperText={errors.role_other || ' '}
                sx={inputSx}
              />
            )}
            {form.department === 'Other' && (
              <TextField fullWidth size="small"
                label="Specify Department *" placeholder="Enter department"
                value={form.department_other}
                onChange={handleChange('department_other')} onBlur={handleBlur('department_other')}
                error={!!errors.department_other} helperText={errors.department_other || ' '}
                sx={inputSx}
              />
            )}
          </Box>
        </Box>

        {/* ── Contact ──────────────────────────────────────────────── */}
        <Box sx={{ mb: !isEdit ? { xs: 2, sm: 2.5, md: 3 } : 0 }}>
          <SectionHead icon={<PhoneOutlined sx={{ fontSize: { xs: 16, sm: 18 } }} />} title="Contact" />
          <Box sx={gridSx}>
            <TextField fullWidth size="small"
              label="Contact Number *" placeholder="10-digit mobile number"
              value={form.contact_number}
              onChange={handleChange('contact_number')} onBlur={handleBlur('contact_number')}
              error={!!errors.contact_number} helperText={errors.contact_number || ' '}
              inputProps={{ inputMode: 'numeric', maxLength: 10, pattern: '[0-9]*' }}
              sx={inputSx}
            />
            <TextField fullWidth size="small"
              label="Address *" placeholder="Street, City, State / Country"
              value={form.location}
              onChange={handleChange('location')} onBlur={handleBlur('location')}
              error={!!errors.location} helperText={errors.location || ' '}
              sx={inputSx}
            />
          </Box>
        </Box>

        {/* ── Account Security (add mode only) ─────────────────────── */}
        {!isEdit && (
          <Box>
            <SectionHead icon={<InfoOutlined sx={{ fontSize: { xs: 16, sm: 18 } }} />} title="Account Security" />
            <Box sx={gridSx}>
              <Box sx={{ ...fullSpan, position: 'relative' }}>
                <TextField fullWidth size="small"
                  type={showPwd ? 'text' : 'password'}
                  label="Temporary Password *"
                  value={form.password}
                  onChange={handleChange('password')} onBlur={handleBlur('password')}
                  error={!!errors.password}
                  helperText={
                    errors.password ||
                    'Min 8 chars with uppercase, lowercase, number & symbol. Employer can change it after first login.'
                  }
                  sx={{
                    ...inputSx,
                    '& .MuiOutlinedInput-root': {
                      ...inputSx['& .MuiOutlinedInput-root'],
                      paddingRight: { xs: '40px', sm: '46px' },
                    },
                  }}
                />
                <IconButton
                  onClick={() => setShowPwd((v) => !v)}
                  onMouseDown={(e) => e.preventDefault()}
                  tabIndex={-1}
                  sx={{
                    position: 'absolute',
                    right: { xs: 6, sm: 8 }, top: 20,
                    transform: 'translateY(-50%)',
                    color: BRAND.muted,
                    padding: { xs: '4px', sm: '6px' },
                    '&:hover': { bgcolor: BRAND.navySoft },
                  }}
                >
                  {showPwd
                    ? <VisibilityOff sx={{ fontSize: { xs: 16, sm: 18 } }} />
                    : <Visibility   sx={{ fontSize: { xs: 16, sm: 18 } }} />}
                </IconButton>
              </Box>
            </Box>
          </Box>
        )}
      </DialogContent>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <DialogActions sx={{
        px: { xs: 2, sm: 2.5, md: 3 },
        py: { xs: 1.5, sm: 2 },
        pb: { xs: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))', sm: 2 },
        gap: { xs: 0.75, sm: 1 },
        bgcolor: BRAND.surface,
        borderTop: `1px solid ${BRAND.border}`,
        flexDirection: { xs: 'column-reverse', sm: 'row' },
        alignItems: 'stretch',
        justifyContent: { sm: 'flex-end' },
      }}>
        <Button
          onClick={resetAndClose} disabled={saving}
          sx={{
            color: BRAND.muted, fontWeight: 600, fontFamily: FONT,
            textTransform: 'none', borderRadius: '12px',
            width: { xs: '100%', sm: 'auto' },
            fontSize: { xs: '0.82rem', sm: '0.88rem' },
            px: { xs: 2, sm: 2.5 }, py: { xs: 1.1, sm: 1.15 },
            minHeight: { xs: 44, sm: 'auto' },
            border: `1px solid ${BRAND.border}`,
            '&:hover': { bgcolor: BRAND.navySoft, borderColor: BRAND.sage, color: BRAND.navy },
          }}
        >
          Cancel
        </Button>
        <Button
          variant="contained" onClick={handleSubmit} disabled={saving}
          disableElevation
          startIcon={saving ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : null}
          sx={{
            bgcolor: BRAND.navy, color: '#fff',
            borderRadius: '12px', fontWeight: 700, fontFamily: FONT,
            textTransform: 'none', letterSpacing: '0.005em',
            px: { xs: 2, sm: 3 }, py: { xs: 1.15, sm: 1.2 },
            minHeight: { xs: 48, sm: 'auto' },
            fontSize: { xs: '0.88rem', sm: '0.9rem' },
            width: { xs: '100%', sm: 'auto' },
            '&:hover': { bgcolor: BRAND.navyDark },
            '&:disabled': { bgcolor: '#0A3A38', color: 'rgba(255,255,255,0.6)' },
          }}
        >
          {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Employer & Send Invite'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddEmployerDialog;