import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Typography, TextField, Button, Select, MenuItem, FormControl, InputLabel,
  Alert, CircularProgress, IconButton, InputAdornment, Stack, Chip,
  FormHelperText, Dialog, DialogContent, DialogTitle, Popover, Autocomplete,
} from '@mui/material';
import {
  Visibility, VisibilityOff, CheckCircle, Edit,
  Business, Person, Description, Image as ImageIcon, Celebration,
  Warning, ArrowBack, InsertDriveFile, Close, Error as ErrorIcon,
  LocationOn, ZoomIn, Download, PictureAsPdf, KeyboardArrowDown,
} from '@mui/icons-material';
import api from '@/services/api/axiosInstance';
import {
  parsePhoneNumberFromString,
  getCountries,
  getCountryCallingCode,
  getExampleNumber,
} from 'libphonenumber-js/max';
import phoneExamples from 'libphonenumber-js/examples.mobile.json';

const INDUSTRY_TYPES = [
  'IT Services', 'Software Product', 'BFSI', 'Healthcare', 'E-Commerce',
  'Manufacturing', 'Education', 'Consulting', 'Logistics', 'Media & Entertainment',
  'Real Estate', 'Retail', 'Telecom', 'Automotive', 'Government', 'Other'
];

const EMPLOYEE_RANGES = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5000+'];
const REGION_NAMES =
  typeof Intl !== 'undefined' && Intl.DisplayNames
    ? new Intl.DisplayNames(['en'], { type: 'region' })
    : null;

const PRIORITY_ISO = ['IN', 'US', 'GB', 'AE', 'SG', 'AU', 'CA'];

const COUNTRY_CODES = (() => {
  const list = getCountries().map((iso2) => ({
    value: iso2,
    iso:   iso2.toLowerCase(),
    code:  `+${getCountryCallingCode(iso2)}`,
    name:  REGION_NAMES?.of(iso2) || iso2,
  }));
  const rank = (c) => {
    const i = PRIORITY_ISO.indexOf(c.value);
    return i === -1 ? PRIORITY_ISO.length : i;
  };
  return list.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
})();

const DEFAULT_COUNTRY_CODE = 'IN';

const getCountry = (value) =>
  COUNTRY_CODES.find(c => c.value === value) || COUNTRY_CODES[0];

/* Dialling code for the API payload — the DB column stores '+91', not 'IN' */
const dialCode = (value) => getCountry(value).code;

/* Sample mobile number for placeholders, cached per country */
const _exampleCache = {};
const phoneExample = (iso) => {
  if (_exampleCache[iso] === undefined) {
    const ex = getExampleNumber(iso, phoneExamples);
    _exampleCache[iso] = ex ? ex.nationalNumber : '';
  }
  return _exampleCache[iso];
};

const PHONE_MAX_DIGITS = 15;   // E.164 ceiling — the validator does the real work

const DEPARTMENTS = [
  'Engineering', 'Human Resources', 'Talent Acquisition', 'Operations',
  'Sales', 'Marketing', 'Finance', 'Product', 'Design', 'Customer Success',
  'Legal', 'Administration', 'Other'
];

const DOCUMENT_CONFIGS = [
  { key: 'mca',     type: 'MCA',     title: 'MCA / Company Registration',     required: true  },
  { key: 'pan',     type: 'PAN',     title: 'Company PAN Card',               required: true  },
  { key: 'aadhaar', type: 'AADHAAR', title: 'Aadhaar (Proprietor/Director)',  required: true  },
  { key: 'gst',     type: 'GST',     title: 'GST Certificate',                required: true  },
  { key: 'msme',    type: 'MSME',   title: 'MSME Certificate',                required: true  },
  { key: 'award',   type: 'AWARD',  title: 'Awards & Recognitions',           required: false },
  { key: 'proof',   type: 'PROOF',  title: 'Other Supporting Proof',          required: false },
];
const FILE_ACCEPT       = '.pdf,.jpg,.jpeg,.png';
const FILE_ACCEPTED_EXT = ['pdf', 'jpg', 'jpeg', 'png'];
const FILE_MAX_MB       = 5;
const IMG_ACCEPT        = '.jpg,.jpeg,.png,.webp';
const IMG_ACCEPTED_EXT  = ['jpg', 'jpeg', 'png', 'webp'];

const ABOUT_MIN = 20;
const ABOUT_MAX = 500;

const OTP_SECONDS = 5 * 60;

const PINCODE_API_URL = 'https://api.postalpincode.in/pincode';
const PINCODE_DEBOUNCE_MS = 450;

const FIELD_LABELS = {
  company_name: 'Company Name', company_domain: 'Company Domain', industry_type: 'Industry Type',
  full_name: 'Full Name', department: 'Department', designation: 'Designation',
  email: 'Personal Email', confirm_email: 'Confirm Email',
  country_code: 'Country Code', phone: 'Contact Number',
  password: 'Password', confirm_password: 'Confirm Password',
  profile_image_file: 'Profile Photo',
  address_line1: 'Address Line 1', city: 'City', state: 'State', pincode: 'Pincode', country: 'Country',
  office_email: 'Office Email', secondary_email: 'Secondary Email',
  primary_contact: 'Primary Contact', secondary_contact: 'Secondary Contact',
  about: 'About Company', employee_count_range: 'Employee Count',
  established_year: 'Established Year', locations: 'Office Locations',
  website_url: 'Official Website', linkedin_url: 'LinkedIn', twitter_url: 'Twitter / X',
  facebook_url: 'Facebook', instagram_url: 'Instagram', company_logo_file: 'Company Logo',
};

const PATTERNS = {
  email:       /^[a-zA-Z0-9._%+-]+@[a-zA-Z][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}$/,
  phone10:     /^\d{10}$/,
  pincode6:    /^\d{6}$/,
  domain:      /^(?!-)([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/,
  companyName: /^[a-zA-Z0-9](?:[a-zA-Z0-9 .&()\-]*[a-zA-Z0-9.)])?$/,
  alphaSpace:  /^[a-zA-Z][a-zA-Z ]*[a-zA-Z]$|^[a-zA-Z]$/,
  cityName:    /^[a-zA-Z][a-zA-Z .\-]*[a-zA-Z]$|^[a-zA-Z]$/,
  urlStrict:   /^https?:\/\/[^\s]+\.[^\s]+$/i,
  upper:       /[A-Z]/,
  lower:       /[a-z]/,
  digit:       /\d/,
  special:     /[!@#$%^&*(),.?":{}|<>_\-+=/\\[\]~`';]/,
  allSameDigit:/^(\d)\1+$/,
  year:        /^(18|19|20)\d{2}$/,
  countryCode: /^\+\d{1,4}$/,
};

/* ============================================================================
 * PATTERN DETECTORS (unchanged)
 * ========================================================================== */
const hasSequentialChars = (str, minLen = 4) => {
  if (!str || str.length < minLen) return false;
  const s = str.toLowerCase();
  for (let i = 0; i <= s.length - minLen; i++) {
    let asc = true, desc = true;
    for (let j = 1; j < minLen; j++) {
      const diff = s.charCodeAt(i + j) - s.charCodeAt(i + j - 1);
      if (diff !== 1)  asc  = false;
      if (diff !== -1) desc = false;
      if (!asc && !desc) break;
    }
    if (asc || desc) return true;
  }
  return false;
};

const KEYBOARD_ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm', '1234567890'];
const hasKeyboardSequence = (str, minLen = 4) => {
  if (!str || str.length < minLen) return false;
  const s = str.toLowerCase();
  for (const row of KEYBOARD_ROWS) {
    for (let i = 0; i <= row.length - minLen; i++) {
      const seq = row.slice(i, i + minLen);
      if (s.includes(seq) || s.includes([...seq].reverse().join(''))) return true;
    }
  }
  return false;
};

const hasRepeatedChars = (str, minLen = 3) => {
  if (!str || str.length < minLen) return false;
  return new RegExp(`(.)\\1{${minLen - 1},}`).test(str);
};

const containsSubstring = (haystack, needle, minLen = 4) => {
  if (!haystack || !needle) return false;
  const n = String(needle).trim().toLowerCase();
  if (n.length < minLen) return false;
  return String(haystack).toLowerCase().includes(n);
};

const COMMON_WEAK = [
  'password', 'passw0rd', 'welcome', 'admin', 'qwerty', 'letmein',
  'lanciere', 'anusol', '12345678', 'iloveyou', 'abc12345',
];

/* ============================================================================
 * VALIDATORS (unchanged)
 * ========================================================================== */
const V = {
  required: (v, label = 'This field') =>
    (!v || !String(v).trim()) ? `${label} is required` : '',

  companyName: (v) => {
    if (!v || !v.trim()) return 'Company name is required';
    const t = v.trim();
    if (t.length < 3)   return 'Minimum 3 characters';
    if (t.length > 255) return 'Maximum 255 characters';
    if (!PATTERNS.companyName.test(t))
      return 'Only letters, numbers, spaces, and . & - ( ) allowed';
    return '';
  },

  domain: (v) => {
    if (!v || !v.trim()) return 'Company domain is required';
    const cleaned = v.trim().toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '')
      .replace(/^www\./, '');
    if (cleaned.length < 4)   return 'Domain too short';
    if (cleaned.length > 253) return 'Domain too long';
    if (!PATTERNS.domain.test(cleaned))
      return 'Invalid domain (e.g. example.com)';
    return '';
  },

  industryType: (v) => {
    if (!v) return 'Industry type is required';
    if (!INDUSTRY_TYPES.includes(v)) return 'Invalid industry type';
    return '';
  },

  industryTypeOther: (v, industryType) => {
    if (industryType !== 'Other') return '';
    if (!v || !v.trim()) return 'Please specify your industry type';
    const t = v.trim();
    if (t.length < 1)   return 'Minimum 1 character';
    if (t.length > 100) return 'Maximum 100 characters';
    return '';
  },

  departmentOther: (v, department) => {
    if (department !== 'Other') return '';
    if (!v || !v.trim()) return 'Please specify your department';
    const t = v.trim();
    if (t.length < 1)   return 'Minimum 1 character';
    if (t.length > 100) return 'Maximum 100 characters';
    return '';
  },

  fullName: (v) => {
    if (!v || !v.trim()) return 'Full name is required';
    const t = v.trim();
    if (t.length < 2)  return 'Minimum 2 characters';
    if (t.length > 100) return 'Maximum 100 characters';
    if (!PATTERNS.alphaSpace.test(t))
      return 'Only alphabets and single spaces allowed';
    return '';
  },

  department:  (v) => !v ? 'Department is required'  : (!DEPARTMENTS.includes(v) ? 'Invalid department'  : ''),
  designation: (v) => {
    if (!v || !v.trim()) return 'Designation is required';
    if (v.trim().length < 2) return 'Minimum 2 characters';
    if (v.trim().length > 100) return 'Maximum 100 characters';
    return '';
  },

  email: (v, label = 'Email') => {
    if (!v || !v.trim()) return `${label} is required`;
    const t = v.trim();
    if (t.length > 150) return 'Email too long';
    if (!PATTERNS.email.test(t)) return 'Invalid email format';
    return '';
  },

  phone: (v, countryIso = DEFAULT_COUNTRY_CODE) => {
    if (!v) return 'Phone is required';
    const digits = String(v).replace(/\D/g, '');
    if (!digits) return 'Phone is required';
    const parsed = parsePhoneNumberFromString(digits, countryIso);
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
  },

 countryCode: (v) => {
    if (!v || !String(v).trim()) return 'Country is required';
    if (!COUNTRY_CODES.some(c => c.value === v)) return 'Select a country from the list';
    return '';
  },

  pincode: (v) => {
    if (!v) return 'Pincode is required';
    const d = String(v).replace(/\D/g, '');
    if (!PATTERNS.pincode6.test(d)) return 'Must be exactly 6 digits';
    return '';
  },

  cityName: (v) => {
    if (!v || !v.trim()) return 'City is required';
    if (!PATTERNS.cityName.test(v.trim())) return 'Only letters, spaces, - allowed';
    return '';
  },

  addressLine1: (v) => {
    if (!v || !v.trim()) return 'Address is required';
    if (v.trim().length < 5) return 'Minimum 5 characters';
    if (v.trim().length > 255) return 'Maximum 255 characters';
    return '';
  },

  stateName: (v) => {
    if (!v || !v.trim()) return 'State is required';
    if (v.trim().length < 2) return 'Minimum 2 characters';
    return '';
  },

  country: (v) => {
    if (!v || !v.trim()) return 'Country is required';
    return '';
  },

  url: (v, { required = false, domain = null, domainLabel = null } = {}) => {
    if (!v || !v.trim()) return required ? 'URL is required' : '';
    const t = v.trim();
    if (!PATTERNS.urlStrict.test(t)) return 'Must start with http:// or https://';
    try { new URL(t); } catch { return 'Invalid URL format'; }
    if (domain && !new RegExp(domain, 'i').test(t))
      return `Must be a ${domainLabel || domain} URL`;
    return '';
  },

  establishedYear: (v) => {
    if (!v) return '';
    const s = String(v).trim();
    if (!PATTERNS.year.test(s)) return 'Invalid year (e.g. 2005)';
    const y = parseInt(s, 10);
    const current = new Date().getFullYear();
    if (y < 1800 || y > current) return `Must be between 1800 and ${current}`;
    return '';
  },

  about: (v) => {
    if (!v || !v.trim()) return 'About company is required';
    if (v.trim().length < ABOUT_MIN) return `Minimum ${ABOUT_MIN} characters`;
    if (v.length > ABOUT_MAX)        return `Maximum ${ABOUT_MAX} characters`;
    return '';
  },

  locations: (v) => {
    if (!v || !v.trim()) return '';
    const parts = v.split(',').map(s => s.trim()).filter(Boolean);
    if (parts.some(p => !PATTERNS.cityName.test(p)))
      return 'Locations must only contain letters, spaces, -';
    if (new Set(parts.map(p => p.toLowerCase())).size !== parts.length)
      return 'Duplicate locations';
    return '';
  },

  employeeRange: (v) => {
    if (!v) return 'Employee count is required';
    if (!EMPLOYEE_RANGES.includes(v)) return 'Invalid employee range';
    return '';
  },

  password: (v, ctx = {}) => {
    const { fullName = '', companyName = '', email = '' } = ctx;
    if (!v) return 'Password is required';
    if (v.length < 8)   return 'Minimum 8 characters';
    if (v.length > 128) return 'Maximum 128 characters';
    if (!PATTERNS.upper.test(v))   return 'Must contain an uppercase letter';
    if (!PATTERNS.lower.test(v))   return 'Must contain a lowercase letter';
    if (!PATTERNS.digit.test(v))   return 'Must contain a number';
    if (!PATTERNS.special.test(v)) return 'Must contain a special character';
    if (hasSequentialChars(v, 4))  return 'Cannot contain sequences like 1234 or abcd';
    if (hasKeyboardSequence(v, 4)) return 'Cannot contain keyboard patterns like qwerty';
    if (hasRepeatedChars(v, 3))    return 'Cannot contain 3+ repeated characters';
    if (fullName) {
      const first = fullName.trim().split(/\s+/)[0];
      if (containsSubstring(v, first, 3)) return 'Cannot contain your name';
    }
    if (containsSubstring(v, companyName, 3)) return 'Cannot contain company name';
    if (email) {
      const local = email.split('@')[0];
      if (containsSubstring(v, local, 3)) return 'Cannot contain your email address';
    }
    if (COMMON_WEAK.some(c => v.toLowerCase().includes(c)))
      return 'Password is too common, please choose a stronger one';
    return '';
  },

  file: (file, { maxMB = FILE_MAX_MB, accepted = FILE_ACCEPTED_EXT } = {}) => {
    if (!file) return '';
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxMB) return `File exceeds ${maxMB}MB (yours: ${sizeMB.toFixed(1)}MB)`;
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!accepted.includes(ext))
      return `Invalid type. Allowed: ${accepted.join(', ').toUpperCase()}`;
    return '';
  },
};

/* ============================================================================
 * PASSWORD STRENGTH (unchanged logic)
 * ========================================================================== */
const getStrength = (pwd) => {
  if (!pwd) return 0;
  let s = 0;
  if (pwd.length >= 8)  s++;
  if (pwd.length >= 12) s++;
  if (PATTERNS.upper.test(pwd) && PATTERNS.lower.test(pwd)) s++;
  if (PATTERNS.digit.test(pwd))   s++;
  if (PATTERNS.special.test(pwd)) s++;
  if (hasSequentialChars(pwd) || hasRepeatedChars(pwd) || hasKeyboardSequence(pwd))
    s = Math.max(0, s - 2);
  return Math.min(5, s);
};
const S_COLOR = ['', '#D9534F', '#E8A13C', '#B7C48E', '#7F9E7E', '#6C8B6B'];
const S_LABEL = ['', 'Very weak', 'Weak', 'Fair', 'Good', 'Strong'];

const PWD_RULES = [
  { key: 'len',     label: 'At least 8 characters',          test: (p) => p.length >= 8 },
  { key: 'upper',   label: 'One uppercase letter (A–Z)',     test: (p) => PATTERNS.upper.test(p) },
  { key: 'lower',   label: 'One lowercase letter (a–z)',     test: (p) => PATTERNS.lower.test(p) },
  { key: 'number',  label: 'One number (0–9)',               test: (p) => PATTERNS.digit.test(p) },
  { key: 'special', label: 'One special character (!@#$…)',  test: (p) => PATTERNS.special.test(p) },
  { key: 'noseq',   label: 'No sequences (1234, abcd)',      test: (p) => !hasSequentialChars(p) && !hasKeyboardSequence(p) },
  { key: 'norep',   label: 'No repeated characters (aaa)',   test: (p) => !hasRepeatedChars(p) },
];

const INK        = '#1F1F1F';
const INK_DEEP   = '#000000';
const SAGE       = '#7F9E7E';
const SAGE_DARK  = '#6C8B6B';
const MUTED      = '#6F7470';
const FAINT      = '#A8ACA6';
const SUCCESS    = '#2E7D32';
const DANGER     = '#C62828';
const WARN       = '#E65100';

const LINE       = '#E1E5DE';   // resting hairline — fields, rules, rail track
const LINE_HOVER = '#BFC8BC';   // hover hairline
const TRACK      = '#E7EBE5';   // inactive progress segment
const SAGE_WASH  = 'rgba(127,158,126,0.07)';   // the one permitted tint

const SERIF = "'DM Serif Display', Georgia, 'Times New Roman', serif";

const COLS_2 = 'repeat(auto-fit, minmax(210px, 1fr))';
const COLS_3 = 'repeat(auto-fit, minmax(165px, 1fr))';
const COLS_PHONE = 'minmax(150px, 190px) 1fr';

const inputSx = {
  '&& .MuiOutlinedInput-root': {
    borderRadius: 0,
    backgroundColor: 'transparent',
    boxShadow: 'none',
    paddingLeft: 0,
    paddingRight: 0,
    fontSize: 15,
    borderBottom: `1px solid ${LINE}`,
    transition: 'border-color .2s ease',
    '& fieldset': { border: 'none' },
    '&:hover':        { backgroundColor: 'transparent', borderBottomColor: LINE_HOVER },
    '&.Mui-focused':  { backgroundColor: 'transparent', boxShadow: 'none',
                        borderBottomColor: SAGE, borderBottomWidth: '1.5px' },
    '&.Mui-disabled': { backgroundColor: 'transparent', borderBottomStyle: 'dashed' },
    '&.Mui-error':    { backgroundColor: 'transparent', boxShadow: 'none',
                        borderBottomColor: DANGER },
  },
  // Flush to both ends of the line. Select keeps its own right padding via
  // MUI's `&&&` rule, so the dropdown arrow cannot collide with the text.
  '&& .MuiOutlinedInput-input': { paddingLeft: 0, paddingRight: 0, color: INK },
  '&& .MuiInputBase-multiline': { paddingLeft: 0, paddingRight: 0 },
  '&& .MuiInputBase-input[type="password"]': { fontSize: 17, letterSpacing: '0.08em' },

  // Label rests on the line and rises above it — no notch, no background.
  '&& .MuiInputLabel-outlined': {
    transform: 'translate(0, 9px) scale(1)', color: MUTED, fontSize: 14,
  },
  '&& .MuiInputLabel-outlined.MuiInputLabel-shrink': {
    transform: 'translate(0, -9px) scale(0.78)', letterSpacing: '0.02em',
  },
  '&& .MuiInputLabel-root.Mui-focused': { color: SAGE_DARK },
  '&& .MuiFormHelperText-root': { fontSize: 11, marginLeft: 0, marginTop: '6px' },
};

// Auto-filled from the pincode lookup — a sage LINE, not a sage fill.
const inputSxAutoFilled = {
  ...inputSx,
  '&& .MuiOutlinedInput-root': {
    ...inputSx['&& .MuiOutlinedInput-root'],
    backgroundColor: 'transparent',
    borderBottom: `1.5px solid ${SAGE}`,
    '&:hover':       { backgroundColor: 'transparent', borderBottomColor: SAGE_DARK },
    '&.Mui-focused': { backgroundColor: 'transparent', borderBottomColor: SAGE_DARK },
  },
};

/* 🔧 CO-REDESIGN 4/16 — Section header: was a sage bullet with a glow ring
 * plus a gradient rule fading to the right. Now letterspaced caps on a plain
 * hairline — the same header the jobseeker form's FormSection uses. Kept as an
 * sx object so all ~10 call sites stay untouched. */
const sectionHeaderSx = {
  display: 'block',
  fontSize: 11.5,
  fontWeight: 700,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: INK,
  mt: 4.5,
  mb: 2.5,
  pb: 1.25,
  borderBottom: `1px solid ${LINE}`,
};

// Ink pill — the sign-in page's primary button.
const primaryBtnSx = {
  flex: 1,
  py: 1.625,
  bgcolor: INK,
  color: '#fff',
  borderRadius: '999px',
  fontSize: 15,
  fontWeight: 700,
  textTransform: 'none',
  boxShadow: 'none',
  transition: 'background-color .2s ease, box-shadow .2s ease',
  '&:hover': { bgcolor: INK_DEEP, boxShadow: '0 8px 24px rgba(31,31,31,0.18)' },
  '&:disabled': { bgcolor: '#D3D6D1', color: '#fff', boxShadow: 'none' },
};

// Quiet companion to the pill: hairline outline, no fill, no lift.
const secondaryBtnSx = {
  py: 1.625,
  px: 3,
  bgcolor: 'transparent',
  color: MUTED,
  border: `1px solid ${LINE}`,
  borderRadius: '999px',
  fontSize: 14.5,
  fontWeight: 600,
  textTransform: 'none',
  boxShadow: 'none',
  flexShrink: 0,
  transition: 'border-color .2s ease, color .2s ease',
  '&:hover': { borderColor: LINE_HOVER, bgcolor: 'transparent', color: INK },
};

// Every tertiary action: resend, remove, back links.
const textLinkSx = {
  textTransform: 'none', fontSize: 12.5, fontWeight: 600,
  color: MUTED, p: 0, minWidth: 0, flexShrink: 0,
  '&:hover': { bgcolor: 'transparent', color: SAGE_DARK },
  '&.Mui-disabled': { color: FAINT },
};

// Alerts keep their semantics but lose the frame — no border, softer radius.
const alertSx = { borderRadius: '12px', border: 'none', fontSize: 12.5 };

// Small caps label used above the composite (non-TextField) controls.
const fieldLabelSx = { fontSize: 12, fontWeight: 600, color: MUTED, mb: 0.75 };

/* 🔧 CO-REDESIGN 5/16 — Upload zone: dashed hairline on nothing, instead of a
 * 2px dashed border around a filled #F6F8F3 panel. */
const dropZoneSx = (hasError) => ({
  p: 2.5,
  textAlign: 'center',
  cursor: 'pointer',
  position: 'relative',
  border: `1px dashed ${hasError ? DANGER : LINE_HOVER}`,
  bgcolor: 'transparent',
  borderRadius: '12px',
  transition: 'border-color .2s ease, background-color .2s ease',
  '&:hover': { borderColor: SAGE, bgcolor: SAGE_WASH },
});

/* ============================================================================
 * 🔧 CO-REDESIGN 6/16 — Header furniture shared with the jobseeker form:
 * corner-bracket eyebrow, headline with one italic serif word, progress rail.
 * ========================================================================== */
const Eyebrow = ({ children }) => (
  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.25, mb: 1.5 }}>
    <Box sx={{ width: 9, height: 9, borderLeft: `1.5px solid ${SAGE}`,
               borderTop: `1.5px solid ${SAGE}` }} />
    <Typography component="span"
      sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em',
            color: SAGE, textTransform: 'uppercase', lineHeight: 1 }}>
      {children}
    </Typography>
    <Box sx={{ width: 9, height: 9, borderRight: `1.5px solid ${SAGE}`,
               borderBottom: `1.5px solid ${SAGE}` }} />
  </Box>
);

const Headline = ({ lead, accent, sub }) => (
  <>
    <Typography component="h1" sx={{
      fontWeight: 800, color: INK, letterSpacing: '-0.025em',
      fontSize: { xs: '1.9rem', sm: '2.35rem' }, lineHeight: 1.12, mb: 1.25,
    }}>
      {lead}{' '}
      <Box component="span" sx={{
        fontFamily: SERIF, fontStyle: 'italic', fontWeight: 400,
        color: SAGE, letterSpacing: 0,
      }}>
        {accent}
      </Box>
      .
    </Typography>
    <Typography sx={{ fontSize: 14, color: MUTED, lineHeight: 1.6, mb: { xs: 3, sm: 4 } }}>
      {sub}
    </Typography>
  </>
);


const StepRail = ({ steps, step, onStepClick }) => (
  <Box sx={{ mb: { xs: 3.5, sm: 4.5 } }}>
    <Box sx={{ display: 'flex', alignItems: 'baseline',
               justifyContent: 'space-between', gap: 2, mb: 2 }}>
      <Typography sx={{ fontSize: 13, fontWeight: 700, color: INK, letterSpacing: '-0.01em' }}>
        {steps[step]}
      </Typography>
      <Typography sx={{ fontSize: 11.5, color: MUTED, whiteSpace: 'nowrap', flexShrink: 0 }}>
        Step {step + 1} of {steps.length}
      </Typography>
    </Box>

    <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
      {steps.map((label, i) => {
        const done    = i < step;
        const current = i === step;
        return (
          <Box key={label} sx={{ display: 'contents' }}>
            {i > 0 && (
              <Box sx={{
                flex: 1, minWidth: 10, height: 2, borderRadius: 2, mt: '13px',
                bgcolor: i <= step ? SAGE : TRACK,
                transition: 'background-color .35s ease',
              }} />
            )}
            <Box sx={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              flexShrink: 0, width: { xs: 'auto', sm: 82 },
            }}>
              <Box
                component="button"
                type="button"
                title={label}
                aria-label={`Step ${i + 1}: ${label}`}
                aria-current={current ? 'step' : undefined}
                onClick={() => onStepClick(i)}
                sx={{
                  width: 28, height: 28, p: 0, flexShrink: 0,
                  borderRadius: '50%', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 12, lineHeight: 1,
                  fontWeight: current ? 700 : 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1px solid',
                  borderColor: done ? SAGE : current ? INK : LINE,
                  bgcolor: done ? SAGE : current ? INK : 'transparent',
                  color: i <= step ? '#fff' : FAINT,
                  boxShadow: current ? `0 0 0 4px ${SAGE_WASH}` : 'none',
                  transition: 'background-color .25s ease, border-color .25s ease, color .25s ease, box-shadow .25s ease',
                  '&:hover': {
                    borderColor: done ? SAGE_DARK : current ? INK_DEEP : LINE_HOVER,
                    bgcolor: done ? SAGE_DARK : current ? INK_DEEP : SAGE_WASH,
                    color: i <= step ? '#fff' : INK,
                  },
                  '&:focus-visible': { outline: `2px solid ${SAGE}`, outlineOffset: 3 },
                }}
              >
                {i + 1}
              </Box>
              <Typography sx={{
                display: { xs: 'none', sm: 'block' },
                mt: 1, maxWidth: '100%', textAlign: 'center',
                fontSize: 10.5, lineHeight: 1.3, letterSpacing: '0.01em',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                fontWeight: current ? 700 : 500,
                color: current ? INK : done ? MUTED : FAINT,
                transition: 'color .25s ease',
              }}>
                {label}
              </Typography>
            </Box>
          </Box>
        );
      })}
    </Box>
  </Box>
);

const ChipGridSelect = ({
  label,
  required = false,
  options = [],
  value = '',
  onChange,
  onBlur,
  error = false,
  helperText = '',
  hint = '',
}) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleOpen = (e) => setAnchorEl(e.currentTarget);
  const handleClose = () => {
    setAnchorEl(null);
    if (onBlur) onBlur();
  };
  const handlePick = (opt) => {
    if (onBlur) onBlur();
    onChange(opt);
    setAnchorEl(null);
  };

  const triggerBorderColor = error ? DANGER : open ? SAGE : LINE;

  return (
    <Box sx={{ mb: 1.5 }}>
      {/* Label row */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
        <Typography sx={{ fontSize: 14, color: value ? MUTED : MUTED, transition: 'font-size .15s' }}>
          {label} {required && <Box component="span" sx={{ color: DANGER }}>*</Box>}
        </Typography>
        {value && (
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <CheckCircle sx={{ fontSize: 13, color: SUCCESS }} />
            <Typography sx={{ fontSize: 11, color: SUCCESS, fontWeight: 600 }}>
              Selected
            </Typography>
          </Stack>
        )}
      </Stack>

      {/* Trigger — same hairline as every TextField */}
      <Box
        component="button"
        type="button"
        onClick={handleOpen}
        aria-haspopup="listbox"
        aria-expanded={open}
        sx={{
          width: '100%',
          minHeight: 40,
          textAlign: 'left',
          background: 'transparent',
          border: 'none',
          borderBottom: `${open ? 1.5 : 1}px solid ${triggerBorderColor}`,
          padding: '4px 0 8px',
          fontFamily: 'inherit',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          transition: 'border-color .2s',
          '&:hover': { borderBottomColor: error ? DANGER : LINE_HOVER },
          '&:focus-visible': { outline: 'none', borderBottomColor: SAGE },
        }}
      >
        {value ? (
          <Typography sx={{ fontSize: 15, color: INK, fontWeight: 500 }}>
            {value}
          </Typography>
        ) : (
          <Typography sx={{ fontSize: 15, color: FAINT }}>
            Select {label ? label.toLowerCase() : 'option'}…
          </Typography>
        )}
        <KeyboardArrowDown
          sx={{
            fontSize: 20,
            color: MUTED,
            transition: 'transform .2s',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            flexShrink: 0,
          }}
        />
      </Box>

      {/* Helper text below trigger */}
      {(helperText || hint) && (
        <Typography sx={{ fontSize: 11, color: error ? DANGER : MUTED, mt: 0.75 }}>
          {helperText || hint}
        </Typography>
      )}

      {/* Popover with the chip grid */}
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              mt: 1,
              width: anchorEl ? anchorEl.clientWidth : 'auto',
              minWidth: 240,
              maxWidth: '100%',
              borderRadius: '14px',
              border: 'none',
              boxShadow: '0 14px 40px rgba(31,31,31,0.12)',
              overflow: 'hidden',
            },
          },
        }}
      >
        <Box sx={{
          px: 1.75, py: 1.125,
          borderBottom: `1px solid ${LINE}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <Typography sx={{
            fontSize: 10.5, color: MUTED, fontWeight: 700,
            letterSpacing: '0.12em', textTransform: 'uppercase',
          }}>
            Choose one
          </Typography>
          <Typography sx={{ fontSize: 10.5, color: value ? SUCCESS : FAINT, fontWeight: 600 }}>
            {value ? `1 of ${options.length} selected` : `${options.length} options`}
          </Typography>
        </Box>

        <Box sx={{
          p: 1.75, display: 'flex', flexWrap: 'wrap', gap: 0.75,
          maxHeight: 320, overflowY: 'auto',
        }}>
          {options.map((opt) => {
            const selected = value === opt;
            return (
              <Box
                key={opt}
                component="button"
                type="button"
                onClick={() => handlePick(opt)}
                aria-pressed={selected}
                sx={{
                  px: 1.5,
                  py: 0.75,
                  borderRadius: '999px',
                  border: '1px solid',
                  borderColor: selected ? SAGE : LINE,
                  bgcolor: selected ? SAGE : 'transparent',
                  color: selected ? '#fff' : INK,
                  fontSize: 12.5,
                  fontWeight: selected ? 700 : 500,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  lineHeight: 1.2,
                  boxShadow: 'none',
                  transition: 'background-color .15s, border-color .15s, color .15s',
                  '&:hover': {
                    borderColor: SAGE,
                    bgcolor: selected ? SAGE_DARK : SAGE_WASH,
                  },
                  '&:focus-visible': { outline: `2px solid ${SAGE}`, outlineOffset: 2 },
                }}
              >
                {opt}
              </Box>
            );
          })}
        </Box>
      </Popover>
    </Box>
  );
};

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg'];

const getFileExt = (file) =>
  file?.name ? (file.name.split('.').pop() || '').toLowerCase() : '';

const FilePreviewModal = ({ open, file, title, onClose }) => {
  const [objectUrl, setObjectUrl] = useState(null);

  useEffect(() => {
    if (!open || !file) { setObjectUrl(null); return; }
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [open, file]);

  if (!file) return null;

  const ext     = getFileExt(file);
  const isImage = IMAGE_EXTS.includes(ext);
  const isPdf   = ext === 'pdf';
  const sizeMB  = (file.size / 1024 / 1024).toFixed(2);

  const handleDownload = () => {
    if (!objectUrl) return;
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: '18px',
            boxShadow: '0 24px 64px rgba(31,31,31,.20)',
            overflow: 'hidden',
          },
        },
        backdrop: {
          sx: { bgcolor: 'rgba(31,31,31,.45)', backdropFilter: 'blur(4px)' },
        },
      }}
    >
      <DialogTitle sx={{
        p: 2.5, pb: 2,
        borderBottom: `1px solid ${LINE}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2,
      }}>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0, flex: 1 }}>
          <Box sx={{
            width: 38, height: 38, borderRadius: '11px',
            border: `1px solid ${LINE}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            {isPdf
              ? <PictureAsPdf sx={{ fontSize: 19, color: DANGER }} />
              : isImage
                ? <ImageIcon sx={{ fontSize: 19, color: SAGE }} />
                : <InsertDriveFile sx={{ fontSize: 19, color: MUTED }} />}
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography sx={{
              fontSize: 14.5, fontWeight: 700, color: INK, lineHeight: 1.35,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {title || file.name}
            </Typography>
            <Typography sx={{ fontSize: 11.5, color: MUTED, mt: 0.25 }}>
              {ext.toUpperCase()} · {sizeMB} MB
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
          <IconButton
            size="small" onClick={handleDownload} title="Download"
            sx={{ width: 32, height: 32, color: MUTED, '&:hover': { color: INK, bgcolor: SAGE_WASH } }}
          >
            <Download sx={{ fontSize: 18 }} />
          </IconButton>
          <IconButton
            size="small" onClick={onClose} title="Close"
            sx={{ width: 32, height: 32, color: MUTED, '&:hover': { color: DANGER, bgcolor: 'transparent' } }}
          >
            <Close sx={{ fontSize: 18 }} />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{
        p: 0, bgcolor: '#FAFAF8', minHeight: 420,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {!objectUrl ? (
          <CircularProgress size={26} sx={{ color: SAGE }} />
        ) : isImage ? (
          <Box sx={{ p: 3, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Box
              component="img" src={objectUrl} alt={file.name}
              sx={{
                display: 'block', maxWidth: '100%', maxHeight: '68vh',
                objectFit: 'contain', borderRadius: '12px', bgcolor: '#fff',
                boxShadow: '0 4px 20px rgba(31,31,31,.08)',
              }}
            />
          </Box>
        ) : isPdf ? (
          <Box
            component="iframe" src={objectUrl} title={file.name}
            sx={{ width: '100%', height: '72vh', border: 'none', bgcolor: '#fff', display: 'block' }}
          />
        ) : (
          <Stack alignItems="center" spacing={2} sx={{ py: 8, px: 4, textAlign: 'center' }}>
            <InsertDriveFile sx={{ fontSize: 56, color: FAINT }} />
            <Typography sx={{ fontSize: 14, color: MUTED }}>
              Preview not available for .{ext} files
            </Typography>
            <Button onClick={handleDownload} startIcon={<Download />}
              sx={{ ...textLinkSx, fontSize: 13.5, color: SAGE_DARK, fontWeight: 700 }}>
              Download to view
            </Button>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
};

const FlagIcon = ({ iso, size = 22, alt }) => {
  if (!iso) {
    return (
      <Box sx={{
        width: size, height: size * 0.72,
        borderRadius: '2px', bgcolor: LINE,
        display: 'inline-block',
      }} />
    );
  }
  return (
    <Box
      component="img"
      src={`https://flagcdn.com/w40/${iso}.png`}
      srcSet={`https://flagcdn.com/w40/${iso}.png 1x, https://flagcdn.com/w80/${iso}.png 2x`}
      alt={alt || iso.toUpperCase()}
      loading="lazy"
      sx={{
        width: size,
        height: 'auto',
        maxHeight: size * 0.75,
        display: 'inline-block',
        verticalAlign: 'middle',
        borderRadius: '2px',
        objectFit: 'cover',
        flexShrink: 0,
      }}
    />
  );
};

const FlagChip = ({ iso, code, showName = false, name }) => (
  <Stack direction="row" alignItems="center" spacing={0.75} sx={{ minWidth: 0 }}>
    <FlagIcon iso={iso} size={22} />
    <Box component="span" sx={{
      fontWeight: 700, fontSize: 13.5, color: INK, lineHeight: 1, whiteSpace: 'nowrap',
    }}>
      {code}
    </Box>
    {showName && name && (
      <Box component="span" sx={{
        fontSize: 12.5, color: MUTED, lineHeight: 1,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {name}
      </Box>
    )}
  </Stack>
);

/* Searchable country picker — 245 options need a filter box, so this is a
 * dropdown that opens a searchable menu, NOT a plain text input. */
const CountrySelect = ({ value, onChange, onBlur, error = false, ariaLabel = 'Country' }) => {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const anchorRef = React.useRef(null);
  const selected = getCountry(value);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRY_CODES;
    const bare = q.replace(/^\+/, '');
    return COUNTRY_CODES.filter(o =>
      o.name.toLowerCase().includes(q) ||
      o.code.replace('+', '').startsWith(bare) ||
      o.value.toLowerCase() === q
    );
  }, [query]);

  const handleClose = () => {
    setOpen(false);
    setQuery('');
    onBlur?.();
  };

  const pick = (iso) => {
    onChange(iso);
    handleClose();
  };

  const SAGE_TINT = 'rgba(127,158,126,0.10)';   

  return (
    <>
      <Box
        ref={anchorRef}
        role="button"
        tabIndex={0}
        aria-label={ariaLabel}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
          }
        }}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 0,
          height: 40,
          bgcolor: 'transparent',
          borderBottom: `1px solid ${error ? DANGER : LINE}`,
          cursor: 'pointer',
          transition: 'border-color .2s ease',
          '&:hover': { borderBottomColor: error ? DANGER : LINE_HOVER },
          '&:focus-visible': {
            outline: 'none',
            borderBottomColor: SAGE,
            borderBottomWidth: '1.5px',
          },
        }}
      >
        <FlagIcon iso={selected.iso} size={22} />
        <Box component="span" sx={{ fontWeight: 700, fontSize: 13.5, color: 'text.primary', minWidth: 42 }}>
          {selected.code}
        </Box>
        <Box sx={{ flex: 1 }} />
        <KeyboardArrowDown
          sx={{
            color: 'text.secondary',
            transition: 'transform .18s',
            transform: open ? 'rotate(180deg)' : 'none',
          }}
        />
      </Box>

      <Popover
        open={open}
        anchorEl={anchorRef.current}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              mt: 0.75,
              width: anchorRef.current?.offsetWidth ?? 280,
              minWidth: 280,
              borderRadius: '14px',
              boxShadow: '0 14px 40px rgba(31,31,31,.14)',
              border: 'none',
              overflow: 'hidden',
            },
          },
        }}
      >
        <Box sx={{ p: 1, borderBottom: '1px solid #E7EAE3' }}>
          <TextField
            size="small"
            fullWidth
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search country or code…"
          />
        </Box>
        <Box sx={{ maxHeight: 320, overflowY: 'auto', py: 0.5 }}>
          {filtered.length === 0 ? (
            <Box sx={{ px: 2, py: 2, fontSize: 13, color: 'text.secondary' }}>
              No countries match.
            </Box>
          ) : (
            filtered.map((o) => {
              const isSelected = o.value === selected.value;
              return (
                <Box
                  key={o.value}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => pick(o.value)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.25,
                    px: 1.5,
                    py: 1,
                    cursor: 'pointer',
                    bgcolor: isSelected ? SAGE_TINT : 'transparent',
                    '&:hover': { bgcolor: SAGE_TINT },
                  }}
                >
                  <FlagIcon iso={o.iso} size={22} />
                  <Box component="span" sx={{ fontWeight: 700, fontSize: 13.5, color: 'text.primary', minWidth: 46 }}>
                    {o.code}
                  </Box>
                  <Box component="span" sx={{
                    fontSize: 13,
                    color: 'text.secondary',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {o.name}
                  </Box>
                </Box>
              );
            })
          )}
        </Box>
      </Popover>
    </>
  );
};

const ErrorSummary = ({ errors, title = 'Please fix these issues before continuing:' }) => {
  const entries = Object.entries(errors).filter(([, v]) => !!v);
  if (entries.length === 0) return null;
  return (
    <Alert severity="error" icon={<Warning />} sx={{ ...alertSx, mt: 2.5 }}>
      <Typography sx={{ fontWeight: 700, mb: 0.75, fontSize: 12.5 }}>{title}</Typography>
      <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
        {entries.map(([field, msg]) => (
          <Box component="li" key={field} sx={{ mb: 0.4, lineHeight: 1.5 }}>
            <strong>{FIELD_LABELS[field] || field}:</strong> {msg}
          </Box>
        ))}
      </Box>
    </Alert>
  );
};

const StrengthBar = ({ password }) => {
  const score = getStrength(password);
  if (!password) return null;
  return (
    <Box sx={{ mt: 1.25 }}>
      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.625 }}>
        <Typography sx={{ fontSize: 11, color: MUTED, fontWeight: 500 }}>
          Password strength
        </Typography>
        <Typography sx={{ fontSize: 11, color: S_COLOR[score], fontWeight: 700 }}>
          {S_LABEL[score]}
        </Typography>
      </Stack>
      <Stack direction="row" spacing="4px">
        {[1, 2, 3, 4, 5].map(i => (
          <Box key={i} sx={{
            flex: 1, height: 3, borderRadius: 3,
            bgcolor: i <= score ? S_COLOR[score] : TRACK,
            transition: 'background 0.3s',
          }} />
        ))}
      </Stack>
    </Box>
  );
};

const PasswordRules = ({ password }) => {
  if (!password) return null;
  const allPassed = PWD_RULES.every(rule => rule.test(password));
  if (allPassed) return null;
  return (
    <Stack spacing={0.5} sx={{ mt: 1.25 }}>
      {PWD_RULES.map(rule => {
        const passed = rule.test(password);
        return (
          <Stack key={rule.key} direction="row" spacing={0.875} alignItems="center">
            <Box sx={{
              width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
              bgcolor: passed ? SUCCESS : FAINT,
            }} />
            <Typography sx={{ fontSize: 11.5, color: passed ? SUCCESS : MUTED }}>
              {rule.label}
            </Typography>
          </Stack>
        );
      })}
    </Stack>
  );
};

/* 🔧 CO-REDESIGN 10/16 — TagInput: was a filled, rounded, bordered box with a
 * focus ring. Now a hairline row, so it sits in line with every other field. */
const TagInput = ({ value, onChange, placeholder, hasError }) => {
  const [input, setInput] = useState('');
  const tags = value ? value.split(',').map(t => t.trim()).filter(Boolean) : [];

  const addTag = (val) => {
    const trimmed = val.trim();
    if (!trimmed) return;
    if (!tags.includes(trimmed)) onChange([...tags, trimmed].join(', '));
    setInput('');
  };
  const removeTag = (tag) => onChange(tags.filter(t => t !== tag).join(', '));

  return (
    <Box sx={{
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 0.75,
      py: 1,
      minHeight: 40,
      cursor: 'text',
      borderBottom: `1px solid ${hasError ? DANGER : LINE}`,
      transition: 'border-color .2s',
      '&:hover': { borderBottomColor: hasError ? DANGER : LINE_HOVER },
      '&:focus-within': { borderBottomColor: SAGE, borderBottomWidth: '1.5px' },
    }}>
      {tags.map(tag => (
        <Chip
          key={tag}
          label={tag}
          size="small"
          onDelete={() => removeTag(tag)}
          deleteIcon={<Close />}
          sx={{
            bgcolor: SAGE_WASH,
            color: INK,
            border: 'none',
            fontSize: 12,
            fontWeight: 500,
            height: 24,
            '& .MuiChip-deleteIcon': {
              color: MUTED, fontSize: 14,
              '&:hover': { color: DANGER },
            },
          }}
        />
      ))}
      <Box
        component="input"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(input); }
          if (e.key === 'Backspace' && !input && tags.length) removeTag(tags[tags.length - 1]);
        }}
        onBlur={() => addTag(input)}
        placeholder={tags.length === 0 ? placeholder : ''}
        sx={{
          border: 'none',
          outline: 'none',
          background: 'transparent',
          fontSize: 15,
          fontFamily: 'inherit',
          color: INK,
          minWidth: 120,
          flex: 1,
          '&::placeholder': { color: FAINT },
        }}
      />
    </Box>
  );
};

/* 🔧 CO-REDESIGN 11/16 — Shared selected-file row.
 * Six copies of this markup existed inline (profile photo, logo, seven
 * document slots), each with its own `bgcolor: '#f0f4ff'` blue-grey panel.
 * One component, one hairline, no fill. */
const SelectedFileRow = ({ file, previewUrl, onPreview, onRemove }) => {
  const ext = getFileExt(file);
  return (
    <Stack direction="row" alignItems="center" spacing={1.5} sx={{
      py: 1.25, px: 1.5, borderRadius: '10px', border: `1px solid ${LINE}`,
      bgcolor: 'transparent',
    }}>
      <Box
        onClick={(e) => { e.stopPropagation(); onPreview?.(); }}
        sx={{
          position: 'relative', width: 38, height: 38, borderRadius: '8px',
          cursor: 'zoom-in', overflow: 'hidden', flexShrink: 0,
          border: `1px solid ${LINE}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          '&:hover .preview-overlay': { opacity: 1 },
        }}
      >
        {previewUrl ? (
          <Box component="img" src={previewUrl} alt="preview"
            sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : ext === 'pdf' ? (
          <PictureAsPdf sx={{ fontSize: 18, color: DANGER }} />
        ) : (
          <InsertDriveFile sx={{ fontSize: 18, color: MUTED }} />
        )}
        <Box className="preview-overlay" sx={{
          position: 'absolute', inset: 0, bgcolor: 'rgba(31,31,31,.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: 0, transition: 'opacity .15s',
        }}>
          <ZoomIn sx={{ fontSize: 17, color: '#fff' }} />
        </Box>
      </Box>

      <Box sx={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
        <Typography sx={{
          fontSize: 13, color: INK, fontWeight: 500,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {file?.name || 'Selected'}
        </Typography>
        {file && (
          <Typography sx={{ fontSize: 11, color: MUTED, mt: 0.125 }}>
            {(file.size / 1024 / 1024).toFixed(2)} MB
          </Typography>
        )}
      </Box>

      <Typography
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        sx={{
          cursor: 'pointer', color: MUTED, fontSize: 12, fontWeight: 600,
          flexShrink: 0, '&:hover': { color: DANGER },
        }}
      >
        Remove
      </Typography>
    </Stack>
  );
};

/* ============================================================================
 * STEP 1 — ACCOUNT SETUP
 * ========================================================================== */
const Step1Account = ({ formData, setFormData, onNext }) => {
  const [showPass,     setShowPass]     = useState(false);
  const [showConfPass, setShowConfPass] = useState(false);
  const [touched,      setTouched]      = useState({});
  const [loading,      setLoading]      = useState(false);
  const [apiError,     setApiError]     = useState('');
  const [emailAvail,   setEmailAvail]   = useState(null);
  const [nameAvail,    setNameAvail]    = useState(null);
  const [showSummary,  setShowSummary]  = useState(false);
  const [previewFile,  setPreviewFile]  = useState(null);
  const fileRef        = useRef();
  const emailTimer     = useRef(null);
  const nameTimer      = useRef(null);

  useEffect(() => {
    return () => {
      clearTimeout(emailTimer.current);
      clearTimeout(nameTimer.current);
    };
  }, []);

  const set = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setApiError('');
  };

  const touch = (field) => setTouched(prev => ({ ...prev, [field]: true }));

  const checkEmail = useCallback(async (val) => {
    const trimmed = val.trim().toLowerCase();
    if (!trimmed || V.email(trimmed)) { setEmailAvail(null); return; }
    setEmailAvail('checking');
    try {
      await api.post('/companies/validate-email', { email: trimmed });
      setEmailAvail('ok');
    } catch (err) {
      if (err.response?.status === 400) {
        setEmailAvail('taken');
      } else {
        console.error('Email availability check failed:', err);
        setEmailAvail(null); // unknown/network error — don't block the user with a false "taken"
      }
    }
  }, []);

  const checkName = useCallback(async (val) => {
    const trimmed = val.trim();
    if (!trimmed || trimmed.length < 3) { setNameAvail(null); return; }
    setNameAvail('checking');
    try {
      await api.post('/companies/validate-name', { company_name: trimmed });
      setNameAvail('ok');
    } catch (err) {
      if (err.response?.status === 400) {
        setNameAvail('taken');
      } else {
        console.error('Company name availability check failed:', err);
        setNameAvail(null); // unknown/network error — don't block the user with a false "taken"
      }
    }
  }, []);

  const validateField = useCallback((field, data = formData) => {
    switch (field) {
      case 'company_name': {
        const err = V.companyName(data.company_name);
        if (err) return err;
        if (nameAvail === 'taken') return 'This company name is already registered';
        return '';
      }
      case 'company_domain':    return V.domain(data.company_domain);
      case 'industry_type':       return V.industryType(data.industry_type);
      case 'industry_type_other': return V.industryTypeOther(data.industry_type_other, data.industry_type);
      case 'full_name':           return V.fullName(data.full_name);
      case 'department':          return V.department(data.department);
      case 'department_other':    return V.departmentOther(data.department_other, data.department);
      case 'designation':       return V.designation(data.designation);
      case 'email': {
        const err = V.email(data.email);
        if (err) return err;
        if (emailAvail === 'taken') return 'This email is already registered';
        return '';
      }
      case 'confirm_email':
        if (!data.confirm_email) return 'Please confirm email';
        if (data.email.trim().toLowerCase() !== data.confirm_email.trim().toLowerCase())
          return 'Emails do not match';
        return '';
      case 'phone':             return V.phone(data.phone, data.country_code);
      case 'country_code':      return V.countryCode(data.country_code);
      case 'password':
        return V.password(data.password, {
          fullName:    data.full_name,
          companyName: data.company_name,
          email:       data.email,
        });
      case 'confirm_password':
        if (!data.confirm_password) return 'Please confirm password';
        if (data.password !== data.confirm_password) return 'Passwords do not match';
        return '';
      case 'profile_image_file':
        return V.file(data.profile_image_file, {
          maxMB: FILE_MAX_MB, accepted: IMG_ACCEPTED_EXT,
        });
      default: return '';
    }
  }, [formData, emailAvail, nameAvail]);

  const liveErrors = useMemo(() => {
    const all = [
      'company_name','company_domain','industry_type','industry_type_other',
      'full_name','department','department_other','designation',
      'email','confirm_email','country_code','phone',
      'password','confirm_password','profile_image_file',
    ];
    const out = {};
    all.forEach(f => { const e = validateField(f); if (e) out[f] = e; });
    if (emailAvail === 'checking') out.email = 'Checking email availability…';
    if (nameAvail  === 'checking') out.company_name = 'Checking name availability…';
    return out;
  }, [validateField, emailAvail, nameAvail]);

  const isDirty = (field) => {
    const val = formData[field];
    if (val === null || val === undefined) return false;
    if (typeof val === 'string') return val.length > 0;
    return !!val;
  };
  const showErr = (f) => (touched[f] || isDirty(f)) && !!liveErrors[f];

  const onChange = (field) => (e) => {
    const raw = e.target.value;
    let val = raw;

    if (field === 'phone') val = raw.replace(/\D/g, '').slice(0, PHONE_MAX_DIGITS);
    if (field === 'full_name') val = raw.replace(/[^a-zA-Z ]/g, '');

    set(field, val);

    if (field === 'email') {
      setEmailAvail(null);
      clearTimeout(emailTimer.current);
      if (val.trim() && !V.email(val)) {
        emailTimer.current = setTimeout(() => checkEmail(val), 650);
      }
    }
    if (field === 'company_name') {
      setNameAvail(null);
      clearTimeout(nameTimer.current);
      if (val.trim() && val.trim().length >= 3) {
        nameTimer.current = setTimeout(() => checkName(val), 650);
      }
    }
  };

  const formValid = Object.keys(liveErrors).length === 0;

  const handleSubmit = async () => {
    const allFields = [
      'company_name','company_domain','industry_type','industry_type_other',
      'full_name','department','department_other','designation',
      'email','confirm_email','country_code','phone','password','confirm_password',
    ];
    const nextTouched = {};
    allFields.forEach(f => { nextTouched[f] = true; });
    setTouched(nextTouched);
    setShowSummary(true);

    if (!formValid) return;

    setLoading(true);
    setApiError('');

    try {
      const fd = new FormData();
      fd.append('company_name',   formData.company_name.trim());
      fd.append('company_domain', formData.company_domain.trim().toLowerCase()
        .replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, ''));
      fd.append('industry_type',  formData.industry_type);
      if (formData.industry_type === 'Other' && formData.industry_type_other?.trim()) {
        fd.append('industry_type_other', formData.industry_type_other.trim());
      }
      fd.append('email',          formData.email.trim().toLowerCase());
      fd.append('country_code',   dialCode(formData.country_code));
      fd.append('country_iso',    formData.country_code);
      fd.append('phone',          formData.phone);
      fd.append('password',       formData.password);

      if (formData.full_name?.trim())       fd.append('full_name',       formData.full_name.trim());
      if (formData.location_region?.trim()) fd.append('location_region', formData.location_region.trim());
      if (formData.department?.trim())      fd.append('department',      formData.department.trim());
      if (formData.department === 'Other' && formData.department_other?.trim()) {
        fd.append('department_other', formData.department_other.trim());
      }
      if (formData.designation?.trim())     fd.append('designation',     formData.designation.trim());

      if (formData.profile_image_file) {
        fd.append('profile_image', formData.profile_image_file);
      }

      const companyRes = await api.post('/companies/register', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      onNext({
        company_id:   companyRes.data.Company_Id,
        email:        formData.email.trim().toLowerCase(),
        company_name: formData.company_name.trim(),
      });
    } catch (err) {
      const msg =
        err.response?.data?.Error ||
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Registration failed. Please try again.';
      console.error('[register] error:', err.response?.status, err.response?.data);
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      {apiError && <Alert severity="error" sx={{ ...alertSx, mb: 2.5 }}>{apiError}</Alert>}

      <Typography sx={{ ...sectionHeaderSx, mt: 0 }}>Company Information</Typography>

      <TextField
        fullWidth size="small" label="Company Name *"
        placeholder="e.g. Acme Technologies Pvt. Ltd."
        value={formData.company_name}
        onChange={onChange('company_name')}
        onBlur={() => touch('company_name')}
        error={showErr('company_name')}
        helperText={
          showErr('company_name') ? liveErrors.company_name
          : (!liveErrors.company_name && nameAvail === 'checking') ? 'Checking availability…'
          : ' '
        }
        slotProps={{
          htmlInput: { maxLength: 255 },
          input: {
            endAdornment: nameAvail === 'ok' && !showErr('company_name') ? (
              <InputAdornment position="end">
                <CheckCircle sx={{ fontSize: 16, color: SUCCESS }} />
              </InputAdornment>
            ) : null,
          },
        }}
        sx={{ ...inputSx, mb: 1.5 }}
      />

      <Box sx={{ display: 'grid', gridTemplateColumns: COLS_2, gap: 2.5, mb: 1 }}>
        <TextField
          size="small" label="Company Domain *" placeholder="e.g. acmetech.com"
          value={formData.company_domain}
          onChange={onChange('company_domain')}
          onBlur={() => touch('company_domain')}
          error={showErr('company_domain')}
          helperText={showErr('company_domain') ? liveErrors.company_domain : ' '}
          sx={inputSx}
        />
        <ChipGridSelect
          label="Industry Type"
          required
          options={INDUSTRY_TYPES}
          value={formData.industry_type}
          onChange={(v) => {
            set('industry_type', v);
            if (v !== 'Other') set('industry_type_other', '');
          }}
          onBlur={() => touch('industry_type')}
          error={showErr('industry_type')}
          helperText={showErr('industry_type') ? liveErrors.industry_type : ''}
        />
      </Box>

      {formData.industry_type === 'Other' && (
        <TextField
          fullWidth size="small" label="Please specify your industry *"
          placeholder="e.g. Renewable Energy, Aerospace, etc."
          value={formData.industry_type_other}
          onChange={onChange('industry_type_other')}
          onBlur={() => touch('industry_type_other')}
          error={showErr('industry_type_other')}
          helperText={showErr('industry_type_other') ? liveErrors.industry_type_other : ' '}
          slotProps={{ htmlInput: { maxLength: 100 } }}
          sx={{ ...inputSx, mb: 1.5 }}
        />
      )}

      <Typography sx={sectionHeaderSx}>Your Details</Typography>

      <TextField
        fullWidth size="small" label="Full Name *" placeholder="As per PAN / Aadhaar"
        value={formData.full_name}
        onChange={onChange('full_name')}
        onBlur={() => touch('full_name')}
        error={showErr('full_name')}
        helperText={showErr('full_name') ? liveErrors.full_name : ' '}
        slotProps={{ htmlInput: { maxLength: 100 } }}
        sx={{ ...inputSx, mb: 1 }}
      />

      <Box sx={{ display: 'grid', gridTemplateColumns: COLS_3, gap: 2.5, mb: 1 }}>
        <TextField
          size="small" label="Location / Region" placeholder="e.g. Hyderabad"
          value={formData.location_region}
          onChange={onChange('location_region')}
          sx={inputSx}
        />
        <ChipGridSelect
          label="Department"
          required
          options={DEPARTMENTS}
          value={formData.department}
          onChange={(v) => {
            set('department', v);
            if (v !== 'Other') set('department_other', '');
          }}
          onBlur={() => touch('department')}
          error={showErr('department')}
          helperText={showErr('department') ? liveErrors.department : ''}
        />
        <TextField
          size="small" label="Designation *" placeholder="e.g. CTO"
          value={formData.designation}
          onChange={onChange('designation')}
          onBlur={() => touch('designation')}
          error={showErr('designation')}
          helperText={showErr('designation') ? liveErrors.designation : ' '}
          slotProps={{ htmlInput: { maxLength: 100 } }}
          sx={inputSx}
        />
      </Box>

      {formData.department === 'Other' && (
        <TextField
          fullWidth size="small" label="Please specify your department *"
          placeholder="e.g. Data Science, Growth, etc."
          value={formData.department_other}
          onChange={onChange('department_other')}
          onBlur={() => touch('department_other')}
          error={showErr('department_other')}
          helperText={showErr('department_other') ? liveErrors.department_other : ' '}
          slotProps={{ htmlInput: { maxLength: 100 } }}
          sx={{ ...inputSx, mb: 1.5 }}
        />
      )}

      <Typography sx={sectionHeaderSx}>Contact & Credentials</Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: COLS_2, gap: 2.5, mb: 1 }}>
        <TextField
          size="small" type="email" label="Personal Email *" placeholder="you@company.com"
          value={formData.email}
          onChange={onChange('email')}
          onBlur={() => touch('email')}
          error={showErr('email')}
          helperText={
            showErr('email') ? liveErrors.email
            : (!liveErrors.email && emailAvail === 'checking') ? 'Checking availability…'
            : ' '
          }
          slotProps={{
            input: {
              endAdornment: emailAvail === 'ok' && !showErr('email') ? (
                <InputAdornment position="end">
                  <CheckCircle sx={{ fontSize: 16, color: SUCCESS }} />
                </InputAdornment>
              ) : null,
            },
          }}
          sx={inputSx}
        />
        <TextField
          size="small" type="email" label="Confirm Email *" placeholder="Re-enter email"
          value={formData.confirm_email}
          onChange={onChange('confirm_email')}
          onBlur={() => touch('confirm_email')}
          error={showErr('confirm_email')}
          helperText={
            showErr('confirm_email') ? liveErrors.confirm_email
            : (formData.confirm_email && formData.email.toLowerCase() === formData.confirm_email.toLowerCase())
              ? 'Emails match' : ' '
          }
          slotProps={{
            formHelperText: {
              sx: (formData.confirm_email && formData.email.toLowerCase() === formData.confirm_email.toLowerCase() && !showErr('confirm_email'))
                ? { color: SUCCESS } : undefined,
            },
          }}
          sx={inputSx}
        />
      </Box>

      <Box sx={{ mb: 2 }}>
        <Typography sx={fieldLabelSx}>
          Contact Number <Box component="span" sx={{ color: DANGER }}>*</Box>
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: COLS_PHONE, gap: 1.5 }}>
          <CountrySelect
            value={formData.country_code}
            onChange={(iso) => set('country_code', iso)}
            onBlur={() => touch('country_code')}
            error={showErr('country_code')}
            ariaLabel="Country dialling code"
          />
          <TextField
            size="small"
            placeholder={`Mobile number — e.g. ${phoneExample(formData.country_code)}`}
            value={formData.phone}
            onChange={onChange('phone')}
            onBlur={() => touch('phone')}
            error={showErr('phone')}
            slotProps={{
              htmlInput: { inputMode: 'numeric', maxLength: PHONE_MAX_DIGITS, pattern: '\\d*' },
              input: {
                endAdornment: formData.phone && !V.phone(formData.phone, formData.country_code) ? (
                  <InputAdornment position="end">
                    <CheckCircle sx={{ fontSize: 16, color: SUCCESS }} />
                  </InputAdornment>
                ) : null,
              },
            }}
            sx={inputSx}
          />
        </Box>
        {(showErr('country_code') || showErr('phone')) && (
          <Typography sx={{ fontSize: 11, color: DANGER, mt: 0.75 }}>
            {liveErrors.country_code || liveErrors.phone}
          </Typography>
        )}
        
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: COLS_2, gap: 2.5 }}>
        <Box>
          <TextField
            fullWidth size="small" label="Password *"
            type={showPass ? 'text' : 'password'}
            placeholder="Min 8 chars, mixed case, number, symbol"
            value={formData.password}
            onChange={onChange('password')}
            onBlur={() => touch('password')}
            error={showErr('password')}
            helperText={showErr('password') ? liveErrors.password : ' '}
            slotProps={{
              htmlInput: { maxLength: 128 },
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowPass(!showPass)} edge="end"
                      sx={{ color: FAINT, '&:hover': { color: SAGE, bgcolor: 'transparent' } }}>
                      {showPass ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
            sx={inputSx}
          />
          <StrengthBar password={formData.password} />
          {formData.password && <PasswordRules password={formData.password} />}
        </Box>
        <Box>
          <TextField
            fullWidth size="small" label="Confirm Password *"
            type={showConfPass ? 'text' : 'password'}
            placeholder="Re-enter password"
            value={formData.confirm_password}
            onChange={onChange('confirm_password')}
            onBlur={() => touch('confirm_password')}
            error={showErr('confirm_password')}
            helperText={
              showErr('confirm_password') ? liveErrors.confirm_password
              : (formData.confirm_password && formData.password === formData.confirm_password)
                ? 'Passwords match' : ' '
            }
            slotProps={{
              htmlInput: { maxLength: 128 },
              formHelperText: {
                sx: (formData.confirm_password && formData.password === formData.confirm_password && !showErr('confirm_password'))
                  ? { color: SUCCESS } : undefined,
              },
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowConfPass(!showConfPass)} edge="end"
                      sx={{ color: FAINT, '&:hover': { color: SAGE, bgcolor: 'transparent' } }}>
                      {showConfPass ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
            sx={inputSx}
          />
        </Box>
      </Box>

      <Typography sx={sectionHeaderSx}>Profile Photo</Typography>

      <Box sx={{ mb: 2 }}>
        {!formData.profile_image_preview ? (
          <Box sx={dropZoneSx(!!liveErrors.profile_image_file)}>
            <Box
              component="input"
              type="file"
              accept={IMG_ACCEPT}
              ref={fileRef}
              onChange={e => {
                const file = e.target.files[0];
                if (!file) return;
                const err = V.file(file, { maxMB: FILE_MAX_MB, accepted: IMG_ACCEPTED_EXT });
                if (err) { touch('profile_image_file'); return; }
                setFormData(prev => ({
                  ...prev,
                  profile_image_file: file,
                  profile_image_preview: URL.createObjectURL(file),
                }));
              }}
              sx={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
            />
            <ImageIcon sx={{ fontSize: 28, color: FAINT, mb: 0.75 }} />
            <Typography sx={{ fontSize: 13, color: MUTED }}>
              <Box component="span" sx={{ color: SAGE_DARK, fontWeight: 700 }}>Click to upload</Box> or drag & drop
            </Typography>
            <Typography sx={{ fontSize: 11, color: FAINT, mt: 0.25 }}>
              JPG, PNG, WEBP up to {FILE_MAX_MB}MB · optional
            </Typography>
          </Box>
        ) : (
          <SelectedFileRow
            file={formData.profile_image_file}
            previewUrl={formData.profile_image_preview}
            onPreview={() => setPreviewFile(formData.profile_image_file)}
            onRemove={() => {
              setFormData(prev => ({ ...prev, profile_image_file: null, profile_image_preview: null }));
              if (fileRef.current) fileRef.current.value = '';
            }}
          />
        )}
        {liveErrors.profile_image_file && (
          <Typography sx={{ fontSize: 11, color: DANGER, mt: 0.75 }}>{liveErrors.profile_image_file}</Typography>
        )}
      </Box>

      <FilePreviewModal
        open={!!previewFile}
        file={previewFile}
        title="Profile Photo"
        onClose={() => setPreviewFile(null)}
      />

      {showSummary && !formValid && <ErrorSummary errors={liveErrors} />}

      <Stack direction="row" spacing={2} sx={{ mt: 4 }}>
        <Button
          variant="contained"
          disabled={loading}
          onClick={handleSubmit}
          sx={primaryBtnSx}
          startIcon={loading ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : null}
        >
          {loading ? 'Creating account…' : 'Continue to verification'}
        </Button>
      </Stack>
    </Box>
  );
};

const OTP_LENGTH = 6;

const Step2OTP = ({ email, onNext, onBack }) => {
  const [digits,     setDigits]     = useState(() => Array(OTP_LENGTH).fill(''));
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [resent,     setResent]     = useState(false);
  const [attempts,   setAttempts]   = useState(0);
  const [seconds,    setSeconds]    = useState(OTP_SECONDS);
  const [focusedIdx, setFocusedIdx] = useState(null);
  const timerRef = useRef(null);

  const inputRefs = useRef([]);
  if (inputRefs.current.length !== OTP_LENGTH) {
    inputRefs.current = Array(OTP_LENGTH).fill(null);
  }

  const otp = digits.join('');

  const startTimer = () => {
    clearInterval(timerRef.current);
    setSeconds(OTP_SECONDS);
    timerRef.current = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) { clearInterval(timerRef.current); return 0; }
        return s - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    startTimer();
    const t = setTimeout(() => inputRefs.current[0]?.focus(), 60);
    return () => { clearInterval(timerRef.current); clearTimeout(t); };
  }, []);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const focusBox = (idx) => {
    const clamped = Math.max(0, Math.min(OTP_LENGTH - 1, idx));
    inputRefs.current[clamped]?.focus();
    inputRefs.current[clamped]?.select?.();
  };

  const handleBoxChange = (idx, rawValue) => {
    setError('');
    const cleaned = String(rawValue).replace(/\D/g, '');
    if (!cleaned) {
      setDigits(prev => { const n = [...prev]; n[idx] = ''; return n; });
      return;
    }
    if (cleaned.length > 1) {
      setDigits(prev => {
        const n = [...prev];
        for (let i = 0; i < cleaned.length && idx + i < OTP_LENGTH; i++) {
          n[idx + i] = cleaned[i];
        }
        return n;
      });
      focusBox(Math.min(idx + cleaned.length, OTP_LENGTH - 1));
      return;
    }
    setDigits(prev => { const n = [...prev]; n[idx] = cleaned; return n; });
    if (idx < OTP_LENGTH - 1) focusBox(idx + 1);
  };

  const handleBoxKeyDown = (idx, e) => {
    if (e.key === 'Backspace') {
      if (digits[idx]) {
        setDigits(prev => { const n = [...prev]; n[idx] = ''; return n; });
      } else if (idx > 0) {
        setDigits(prev => { const n = [...prev]; n[idx - 1] = ''; return n; });
        focusBox(idx - 1);
      }
      e.preventDefault();
    } else if (e.key === 'ArrowLeft')  { focusBox(idx - 1); e.preventDefault(); }
    else   if (e.key === 'ArrowRight') { focusBox(idx + 1); e.preventDefault(); }
    else   if (e.key === 'Enter') {
      if (otp.length === OTP_LENGTH) handleVerify();
    }
  };

  const handleBoxPaste = (idx, e) => {
    const raw = (e.clipboardData || window.clipboardData).getData('text');
    const pasted = raw.replace(/\D/g, '').slice(0, OTP_LENGTH - idx);
    if (!pasted) return;
    e.preventDefault();
    setDigits(prev => {
      const n = [...prev];
      for (let i = 0; i < pasted.length; i++) n[idx + i] = pasted[i];
      return n;
    });
    focusBox(Math.min(idx + pasted.length, OTP_LENGTH - 1));
  };

  const clearAll = () => {
    setDigits(Array(OTP_LENGTH).fill(''));
    focusBox(0);
  };

  const handleVerify = async () => {
    if (otp.length !== OTP_LENGTH) { setError(`Please enter all ${OTP_LENGTH} digits`); return; }
    if (seconds === 0)             { setError('OTP has expired. Please resend.'); return; }
    setLoading(true); setError('');
    try {
      await api.post('/companies/verify-email-otp', { email, otp });
      onNext();
    } catch (err) {
      const msg = err.response?.data?.Error || 'Invalid or expired OTP.';
      setError(msg);
      const match = msg.match(/(\d+) attempt/);
      if (match) setAttempts(5 - parseInt(match[1], 10));
      else setAttempts(a => a + 1);
      setTimeout(() => clearAll(), 250);
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    setLoading(true); setError(''); setResent(false);
    try {
      await api.post('/companies/resend-email-otp', { email });
      setResent(true); setAttempts(0); clearAll(); startTimer();
    } catch (err) {
      setError(err.response?.data?.Error || 'Failed to resend OTP.');
    } finally { setLoading(false); }
  };

  const remaining    = Math.max(0, 5 - attempts);
  const otpComplete  = otp.length === OTP_LENGTH;
  const showBoxError = !!error && otpComplete;

  /* 🔧 CO-REDESIGN 12/16 — OTP boxes: six 12px-radius filled tiles with a 4px
   * focus halo become six underlines. Filled state is carried by line colour —
   * sage once a digit lands, grey while empty. */
  const boxSx = (idx) => {
    const hasValue  = !!digits[idx];
    const isFocused = focusedIdx === idx;
    return {
      flex: 1, minWidth: 0, maxWidth: 56,
      height: { xs: 52, sm: 58 },
      textAlign: 'center',
      fontSize: { xs: 22, sm: 26 },
      fontWeight: 700,
      fontFamily: 'inherit',
      color: INK,
      borderRadius: 0,
      border: 'none',
      borderBottom: `${isFocused ? 2 : 1.5}px solid ${
        showBoxError ? DANGER : isFocused || hasValue ? SAGE : LINE
      }`,
      bgcolor: 'transparent',
      outline: 'none',
      transition: 'border-color .18s ease',
      caretColor: SAGE,
      MozAppearance: 'textfield',
      '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': {
        WebkitAppearance: 'none', margin: 0,
      },
      '&:hover': {
        borderBottomColor: showBoxError ? DANGER : hasValue ? SAGE : LINE_HOVER,
      },
    };
  };

  return (
    <Box>
      <Typography sx={{ fontSize: 14, color: MUTED, lineHeight: 1.65, mb: 3 }}>
        We sent a 6-digit code to{' '}
        <Box component="span" sx={{ color: INK, fontWeight: 700 }}>{email}</Box>.
        {seconds > 0 && (
          <> It expires in{' '}
            <Box component="span" sx={{ color: seconds <= 30 ? DANGER : SAGE_DARK, fontWeight: 700 }}>
              {formatTime(seconds)}
            </Box>.
          </>
        )}
        {seconds === 0 && (
          <Box component="span" sx={{ color: DANGER, fontWeight: 700 }}> It has expired — resend to continue.</Box>
        )}
      </Typography>

      {error  && <Alert severity="error"   sx={{ ...alertSx, mb: 2.5 }}>{error}</Alert>}
      {resent && <Alert severity="success" sx={{ ...alertSx, mb: 2.5 }}>New code sent. Check your inbox.</Alert>}

      <Stack direction="row" spacing={{ xs: 1, sm: 1.5 }} sx={{ mb: 2 }}>
        {digits.map((digit, idx) => (
          <Box
            key={idx}
            component="input"
            type="text"
            inputMode="numeric"
            autoComplete={idx === 0 ? 'one-time-code' : 'off'}
            maxLength={1}
            value={digit}
            ref={el => { inputRefs.current[idx] = el; }}
            onChange={e => handleBoxChange(idx, e.target.value)}
            onKeyDown={e => handleBoxKeyDown(idx, e)}
            onPaste={e => handleBoxPaste(idx, e)}
            onFocus={e => { setFocusedIdx(idx); e.target.select(); }}
            onBlur={() => setFocusedIdx(null)}
            aria-label={`Digit ${idx + 1} of ${OTP_LENGTH}`}
            sx={boxSx(idx)}
          />
        ))}
      </Stack>

      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3.5 }}>
        <Button onClick={handleResend} disabled={loading}
          sx={{ ...textLinkSx, color: SAGE_DARK, fontWeight: 700 }}>
          Resend code
        </Button>
        {attempts > 0 && seconds > 0 && (
          <Typography sx={{ fontSize: 11.5, color: attempts >= 4 ? DANGER : WARN, fontWeight: 600 }}>
            {remaining} attempt{remaining !== 1 ? 's' : ''} remaining
          </Typography>
        )}
      </Stack>

      <Stack direction="row" spacing={2}>
        <Button onClick={onBack} sx={secondaryBtnSx} startIcon={<ArrowBack sx={{ fontSize: 16 }} />}>
          Back
        </Button>
        <Button
          variant="contained"
          disabled={loading || !otpComplete || seconds === 0}
          onClick={handleVerify}
          sx={primaryBtnSx}
          startIcon={loading ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : null}
        >
          {loading ? 'Verifying…' : 'Verify & continue'}
        </Button>
      </Stack>
    </Box>
  );
};

/* ============================================================================
 * STEP 3 — COMPANY PROFILE
 * ========================================================================== */
const Step3Profile = ({ companyId, existingProfileId, personalEmail, autoPhone, autoCountryCode, formData, setFormData, onNext, onBack }) => {
  const [touched,     setTouched]     = useState({});
  const [fileErrors,  setFileErrors]  = useState({});
  const [loading,     setLoading]     = useState(false);
  const [apiError,    setApiError]    = useState('');
  const [showSummary, setShowSummary] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const logoRef = useRef();

  const [pincodeLoading,   setPincodeLoading]   = useState(false);
  const [pincodeStatus,    setPincodeStatus]    = useState(null);
  const [pincodeMeta,      setPincodeMeta]      = useState(null);
  const [autoFilledFields, setAutoFilledFields] = useState({});
  const pincodeTimer   = useRef(null);
  const lastLookupRef  = useRef('');

  const set = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setApiError('');
  };
  const touch = (field) => setTouched(prev => ({ ...prev, [field]: true }));

  useEffect(() => {
    if (autoPhone && !formData.primary_contact) {
      setFormData(prev => ({ ...prev, primary_contact: autoPhone }));
    }
  }, [autoPhone, formData.primary_contact, setFormData]);

  const lookupPincode = useCallback(async (pin) => {
    if (!/^\d{6}$/.test(pin)) return;
    if (lastLookupRef.current === pin) return;
    lastLookupRef.current = pin;
    setPincodeLoading(true);
    setPincodeStatus(null);
    try {
      const res = await fetch(`${PINCODE_API_URL}/${pin}`);
      const data = await res.json();
      const record = Array.isArray(data) ? data[0] : null;
      const po     = record?.PostOffice?.[0];

      if (record?.Status === 'Success' && po) {
        const suggestedCity    = po.District || po.Block || po.Name || '';
        const suggestedState   = po.State    || '';
        const suggestedCountry = po.Country  || 'India';

        setFormData(prev => {
          const next = { ...prev };
          const filled = {};
          if (!prev.city?.trim() || autoFilledFields.city) {
            next.city = suggestedCity;
            filled.city = true;
          }
          if (!prev.state?.trim() || autoFilledFields.state) {
            next.state = suggestedState;
            filled.state = true;
          }
          if (!prev.country?.trim() || autoFilledFields.country || prev.country === 'India') {
            next.country = suggestedCountry;
            filled.country = true;
          }
          setAutoFilledFields(filled);
          return next;
        });

        setPincodeMeta({
          area:     po.Name,
          district: po.District,
          state:    po.State,
          country:  po.Country,
        });
        setPincodeStatus('ok');
      } else {
        setPincodeStatus('notfound');
        setPincodeMeta(null);
      }
    } catch (e) {
      setPincodeStatus('error');
      setPincodeMeta(null);
    } finally {
      setPincodeLoading(false);
    }
  }, [setFormData, autoFilledFields]);

  useEffect(() => {
    clearTimeout(pincodeTimer.current);
    const pin = formData.pincode;
    if (pin && /^\d{6}$/.test(pin)) {
      pincodeTimer.current = setTimeout(() => lookupPincode(pin), PINCODE_DEBOUNCE_MS);
    } else {
      setPincodeStatus(null);
      setPincodeMeta(null);
      lastLookupRef.current = '';
    }
    return () => clearTimeout(pincodeTimer.current);
  }, [formData.pincode, lookupPincode]);

  const validateField = useCallback((field, data = formData) => {
    switch (field) {
      case 'address_line1':     return V.addressLine1(data.address_line1);
      case 'city':              return V.cityName(data.city);
      case 'state':             return V.stateName(data.state);
      case 'pincode':           return V.pincode(data.pincode);
      case 'country':           return V.country(data.country);
      case 'office_email': {
        const err = V.email(data.office_email, 'Office email');
        if (err) return err;
        if (personalEmail &&
            data.office_email.trim().toLowerCase() === personalEmail.trim().toLowerCase())
          return 'Office email must be different from your personal email';
        return '';
      }
      case 'secondary_email': {
        if (!data.secondary_email) return '';
        const err = V.email(data.secondary_email, 'Secondary email');
        if (err) return err;
        if (personalEmail &&
            data.secondary_email.trim().toLowerCase() === personalEmail.trim().toLowerCase())
          return 'Cannot be same as personal email';
        if (data.office_email &&
            data.secondary_email.trim().toLowerCase() === data.office_email.trim().toLowerCase())
          return 'Secondary email cannot be the same as office email';
        return '';
      }
      case 'primary_contact':   return V.phone(data.primary_contact, autoCountryCode || DEFAULT_COUNTRY_CODE);
      case 'secondary_contact': {
        if (!data.secondary_contact) return '';
        const err = V.phone(data.secondary_contact, data.secondary_country_code || DEFAULT_COUNTRY_CODE);
        if (err) return err;
        if (data.secondary_contact === data.primary_contact)
          return 'Secondary contact must be different from primary contact';
        return '';
      }
      case 'about':             return V.about(data.about);
      case 'employee_count_range': return V.employeeRange(data.employee_count_range);
      case 'established_year':  return V.establishedYear(data.established_year);
      case 'locations':         return V.locations(data.locations);
      case 'website_url':       return V.url(data.website_url);
      case 'linkedin_url':      return V.url(data.linkedin_url, { domain: 'linkedin\\.com',          domainLabel: 'linkedin.com' });
      case 'twitter_url':       return V.url(data.twitter_url,  { domain: 'twitter\\.com|x\\.com',  domainLabel: 'twitter/x.com' });
      case 'facebook_url':      return V.url(data.facebook_url, { domain: 'facebook\\.com|fb\\.com',domainLabel: 'facebook.com' });
      case 'instagram_url':     return V.url(data.instagram_url,{ domain: 'instagram\\.com',        domainLabel: 'instagram.com' });
      case 'company_logo_file':
        return V.file(data.company_logo_file, { maxMB: FILE_MAX_MB, accepted: IMG_ACCEPTED_EXT });
      default: return '';
    }
  }, [formData, personalEmail, autoCountryCode]);

  const liveErrors = useMemo(() => {
    const all = [
      'address_line1','city','state','pincode','country',
      'office_email','secondary_email','primary_contact','secondary_contact',
      'about','employee_count_range','established_year','locations',
      'website_url','linkedin_url','twitter_url','facebook_url','instagram_url',
      'company_logo_file',
    ];
    const out = {};
    all.forEach(f => { const e = validateField(f); if (e) out[f] = e; });
    Object.entries(fileErrors).forEach(([k, v]) => { if (v) out[k] = v; });
    return out;
  }, [validateField, fileErrors]);

  const isDirty = (field) => {
    const val = formData[field];
    if (val === null || val === undefined) return false;
    if (typeof val === 'string') return val.length > 0;
    return !!val;
  };
  const showErr = (f) => (touched[f] || isDirty(f)) && !!liveErrors[f];

  const onChange = (field) => (e) => {
    let val = e.target.value;
    if (field === 'pincode')            val = val.replace(/\D/g, '').slice(0, 6);
    if (field === 'primary_contact' ||
        field === 'secondary_contact')  val = val.replace(/\D/g, '').slice(0, PHONE_MAX_DIGITS);
    if (field === 'city')               val = val.replace(/[^a-zA-Z .\-]/g, '');
    if (field === 'established_year')   val = val.replace(/\D/g, '').slice(0, 4);
    if (field === 'about' && val.length > ABOUT_MAX) return;

   if (autoFilledFields[field]) {
      setAutoFilledFields(prev => { const n = { ...prev }; delete n[field]; return n; });
    }
    set(field, val);

  };
  const formValid = Object.keys(liveErrors).length === 0;

  const handleSubmit = async () => {
    const allFields = [
      'address_line1','city','state','pincode','country',
      'office_email','secondary_email','primary_contact','secondary_contact',
      'about','employee_count_range','established_year','locations',
      'website_url','linkedin_url','twitter_url','facebook_url','instagram_url',
      'company_logo_file',
    ];
    const nextTouched = {};
    allFields.forEach(f => { nextTouched[f] = true; });
    setTouched(nextTouched);
    setShowSummary(true);

    if (!formValid) return;

    if (existingProfileId) {
      onNext({ profile_id: existingProfileId });
      return;
    }

    setLoading(true); setApiError('');

    try {
      const fd = new FormData();
      fd.append('company_id',           companyId);
      fd.append('address_line1',        formData.address_line1.trim());
      if (formData.address_line2.trim()) fd.append('address_line2', formData.address_line2.trim());
      fd.append('city',                 formData.city.trim());
      fd.append('state',                formData.state.trim());
      fd.append('pincode',              formData.pincode);
      fd.append('country',              formData.country.trim());
      fd.append('office_email',         formData.office_email.trim().toLowerCase());
      if (formData.secondary_email.trim())   fd.append('secondary_email',   formData.secondary_email.trim().toLowerCase());
      fd.append('primary_contact',      formData.primary_contact);
      fd.append('primary_country_code', dialCode(autoCountryCode || DEFAULT_COUNTRY_CODE));
      fd.append('primary_country_iso',  autoCountryCode || DEFAULT_COUNTRY_CODE);
      if (formData.secondary_contact) {
        fd.append('secondary_contact',      formData.secondary_contact);
        fd.append('secondary_country_code', dialCode(formData.secondary_country_code || DEFAULT_COUNTRY_CODE));
        fd.append('secondary_country_iso',  formData.secondary_country_code || DEFAULT_COUNTRY_CODE);
      }
      fd.append('about',                formData.about.trim());
      fd.append('employee_count_range', formData.employee_count_range);
      if (formData.established_year)         fd.append('established_year',  formData.established_year);
      if (formData.locations.trim())         fd.append('locations',         formData.locations.trim());
      if (formData.website_url.trim())       fd.append('website_url',       formData.website_url.trim());
      if (formData.linkedin_url.trim())      fd.append('linkedin_url',      formData.linkedin_url.trim());
      if (formData.twitter_url.trim())       fd.append('twitter_url',       formData.twitter_url.trim());
      if (formData.facebook_url.trim())      fd.append('facebook_url',      formData.facebook_url.trim());
      if (formData.instagram_url.trim())     fd.append('instagram_url',     formData.instagram_url.trim());
      if (formData.company_logo_file)        fd.append('company_logo',      formData.company_logo_file);

      const res = await api.post('/companies/company-profile/add', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onNext({ profile_id: res.data.Profile_Id });
    } catch (err) {
      setApiError(err.response?.data?.Error || 'Failed to save company profile.');
    } finally {
      setLoading(false);
    }
  };

  const charCounterColor =
    formData.about.length >= ABOUT_MAX ? DANGER
    : formData.about.length > ABOUT_MAX - 50 ? WARN
    : MUTED;

  const fieldSx = (field) => (autoFilledFields[field] ? inputSxAutoFilled : inputSx);

  return (
    <Box>
      {apiError && <Alert severity="error" sx={{ ...alertSx, mb: 2.5 }}>{apiError}</Alert>}

      <Typography sx={{ ...sectionHeaderSx, mt: 0 }}>Registered Address</Typography>

      <TextField
        fullWidth size="small" label="Address Line 1 *"
        placeholder="Plot / Building / Street"
        value={formData.address_line1}
        onChange={onChange('address_line1')}
        onBlur={() => touch('address_line1')}
        error={showErr('address_line1')}
        helperText={showErr('address_line1') ? liveErrors.address_line1 : ' '}
        slotProps={{ htmlInput: { maxLength: 255 } }}
        sx={{ ...inputSx, mb: 1 }}
      />

      <TextField
        fullWidth size="small" label="Address Line 2"
        placeholder="Area / Landmark (optional)"
        value={formData.address_line2}
        onChange={onChange('address_line2')}
        slotProps={{ htmlInput: { maxLength: 255 } }}
        sx={{ ...inputSx, mb: 1.5 }}
      />

      <Box sx={{ mb: 1 }}>
        <TextField
          fullWidth size="small" label="Pincode *"
          placeholder="6 digits — city, state & country auto-fill"
          value={formData.pincode}
          onChange={onChange('pincode')}
          onBlur={() => touch('pincode')}
          error={showErr('pincode') || pincodeStatus === 'notfound'}
          helperText={
            showErr('pincode') ? liveErrors.pincode
            : pincodeLoading    ? 'Looking up address…'
            : pincodeStatus === 'ok' && pincodeMeta
              ? `${pincodeMeta.area ? pincodeMeta.area + ', ' : ''}${pincodeMeta.district || ''}, ${pincodeMeta.state || ''}`
            : pincodeStatus === 'notfound' ? 'No records for this pincode — please fill address manually'
            : pincodeStatus === 'error'    ? 'Could not verify pincode (network error) — fill manually'
            : 'Enter 6-digit pincode to auto-fill address'
          }
          slotProps={{
            htmlInput: { inputMode: 'numeric', maxLength: 6, pattern: '\\d{6}' },
            formHelperText: {
              sx: pincodeStatus === 'ok' && !showErr('pincode')
                  ? { color: SUCCESS, fontWeight: 600 }
                  : pincodeStatus === 'notfound' ? { color: WARN }
                  : undefined,
            },
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  {pincodeLoading ? (
                    <CircularProgress size={14} sx={{ color: MUTED }} />
                  ) : pincodeStatus === 'ok' ? (
                    <CheckCircle sx={{ fontSize: 17, color: SUCCESS }} />
                  ) : pincodeStatus === 'notfound' ? (
                    <ErrorIcon sx={{ fontSize: 17, color: WARN }} />
                  ) : formData.pincode?.length === 6 ? null : (
                    <LocationOn sx={{ fontSize: 17, color: FAINT }} />
                  )}
                </InputAdornment>
              ),
            },
          }}
          sx={inputSx}
        />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: COLS_3, gap: 2.5, mb: 1 }}>
        <TextField
          size="small" label="City *" placeholder="e.g. Hyderabad"
          value={formData.city}
          onChange={onChange('city')}
          onBlur={() => touch('city')}
          error={showErr('city')}
          helperText={
            showErr('city') ? liveErrors.city
            : autoFilledFields.city ? 'Auto-filled from pincode' : ' '
          }
          slotProps={{
            htmlInput: { maxLength: 100 },
            formHelperText: { sx: autoFilledFields.city && !showErr('city') ? { color: SUCCESS } : undefined },
          }}
          sx={fieldSx('city')}
        />
        <TextField
          size="small" label="State *" placeholder="e.g. Telangana"
          value={formData.state}
          onChange={onChange('state')}
          onBlur={() => touch('state')}
          error={showErr('state')}
          helperText={
            showErr('state') ? liveErrors.state
            : autoFilledFields.state ? 'Auto-filled from pincode' : ' '
          }
          slotProps={{
            htmlInput: { maxLength: 100 },
            formHelperText: { sx: autoFilledFields.state && !showErr('state') ? { color: SUCCESS } : undefined },
          }}
          sx={fieldSx('state')}
        />
        <TextField
          size="small" label="Country *" placeholder="India"
          value={formData.country}
          onChange={onChange('country')}
          onBlur={() => touch('country')}
          error={showErr('country')}
          helperText={
            showErr('country') ? liveErrors.country
            : autoFilledFields.country ? 'Auto-filled from pincode' : ' '
          }
          slotProps={{
            htmlInput: { maxLength: 100 },
            formHelperText: { sx: autoFilledFields.country && !showErr('country') ? { color: SUCCESS } : undefined },
          }}
          sx={fieldSx('country')}
        />
      </Box>

      <Typography sx={sectionHeaderSx}>Contact Information</Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: COLS_2, gap: 2.5, mb: 1 }}>
        <TextField
          size="small" type="email" label="Office Email *"
          placeholder="office@company.com"
          value={formData.office_email}
          onChange={onChange('office_email')}
          onBlur={() => touch('office_email')}
          error={showErr('office_email')}
          helperText={showErr('office_email') ? liveErrors.office_email : 'Must differ from your personal email'}
          sx={inputSx}
        />
        <TextField
          size="small" type="email" label="Secondary Email"
          placeholder="hr@company.com (optional)"
          value={formData.secondary_email}
          onChange={onChange('secondary_email')}
          onBlur={() => touch('secondary_email')}
          error={showErr('secondary_email')}
          helperText={showErr('secondary_email') ? liveErrors.secondary_email : ' '}
          sx={inputSx}
        />
      </Box>

      <Box sx={{ mb: 2 }}>
        <Typography sx={fieldLabelSx}>
          Primary Contact <Box component="span" sx={{ color: DANGER }}>*</Box>
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: COLS_PHONE, gap: 1.5 }}>
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: 1,
            height: 40, borderBottom: `1px dashed ${LINE}`,
          }}>
            <FlagIcon iso={getCountry(autoCountryCode || DEFAULT_COUNTRY_CODE).iso} size={22} />
            <Box component="span" sx={{ fontSize: 13.5, fontWeight: 700, color: MUTED }}>
              {dialCode(autoCountryCode || DEFAULT_COUNTRY_CODE)}
            </Box>
          </Box>
          <TextField
            size="small"
            value={formData.primary_contact}
            disabled
            helperText="Auto-filled from account setup"
            sx={{
              ...inputSx,
              '&& .MuiInputBase-input.Mui-disabled': {
                WebkitTextFillColor: MUTED,
                fontWeight: 500,
              },
            }}
          />
        </Box>
      </Box>

      <Box sx={{ mb: 2 }}>
        <Typography sx={fieldLabelSx}>Secondary Contact</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: COLS_PHONE, gap: 1.5 }}>
          <CountrySelect
            value={formData.secondary_country_code || DEFAULT_COUNTRY_CODE}
            onChange={(iso) => set('secondary_country_code', iso)}
            ariaLabel="Secondary contact country"
          />
          <TextField
            size="small"
            placeholder={`Optional — e.g. ${phoneExample(formData.secondary_country_code || DEFAULT_COUNTRY_CODE)}`}
            value={formData.secondary_contact}
            onChange={onChange('secondary_contact')}
            onBlur={() => touch('secondary_contact')}
            error={showErr('secondary_contact')}
            helperText={
              showErr('secondary_contact') ? liveErrors.secondary_contact
              : formData.secondary_contact && !V.phone(formData.secondary_contact, formData.secondary_country_code || DEFAULT_COUNTRY_CODE)
                ? 'Valid number' : ' '
            }
            slotProps={{
              htmlInput: { inputMode: 'numeric', maxLength: PHONE_MAX_DIGITS, pattern: '\\d*' },
              formHelperText: {
                sx: formData.secondary_contact && !V.phone(formData.secondary_contact, formData.secondary_country_code || DEFAULT_COUNTRY_CODE) && !showErr('secondary_contact')
                  ? { color: SUCCESS } : undefined,
              },
              input: {
                endAdornment: formData.secondary_contact && !V.phone(formData.secondary_contact, formData.secondary_country_code || DEFAULT_COUNTRY_CODE) ? (
                  <InputAdornment position="end">
                    <CheckCircle sx={{ fontSize: 16, color: SUCCESS }} />
                  </InputAdornment>
                ) : null,
              },
            }}
            sx={inputSx}
          />
        </Box>
      </Box>

      <Typography sx={sectionHeaderSx}>Company Information</Typography>

      <Box sx={{ mb: 2.5 }}>
        <Typography sx={fieldLabelSx}>Company Logo</Typography>
        {!formData.company_logo_preview ? (
          <Box sx={dropZoneSx(!!fileErrors.company_logo_file)}>
            <Box
              component="input"
              type="file"
              accept={IMG_ACCEPT}
              ref={logoRef}
              onChange={e => {
                const file = e.target.files[0];
                if (!file) return;
                const err = V.file(file, { maxMB: FILE_MAX_MB, accepted: IMG_ACCEPTED_EXT });
                if (err) {
                  setFileErrors(p => ({ ...p, company_logo_file: err }));
                  return;
                }
                setFileErrors(p => { const n = { ...p }; delete n.company_logo_file; return n; });
                setFormData(prev => ({
                  ...prev,
                  company_logo_file: file,
                  company_logo_preview: URL.createObjectURL(file),
                }));
              }}
              sx={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
            />
            <Business sx={{ fontSize: 28, color: FAINT, mb: 0.75 }} />
            <Typography sx={{ fontSize: 13, color: MUTED }}>
              <Box component="span" sx={{ color: SAGE_DARK, fontWeight: 700 }}>Click to upload logo</Box>
            </Typography>
            <Typography sx={{ fontSize: 11, color: FAINT, mt: 0.25 }}>
              JPG, PNG, WEBP up to {FILE_MAX_MB}MB
            </Typography>
          </Box>
        ) : (
          <SelectedFileRow
            file={formData.company_logo_file}
            previewUrl={formData.company_logo_preview}
            onPreview={() => setPreviewFile(formData.company_logo_file)}
            onRemove={() => {
              setFormData(prev => ({ ...prev, company_logo_file: null, company_logo_preview: null }));
              if (logoRef.current) logoRef.current.value = '';
            }}
          />
        )}
        {fileErrors.company_logo_file && (
          <Typography sx={{ fontSize: 11, color: DANGER, mt: 0.75 }}>{fileErrors.company_logo_file}</Typography>
        )}
      </Box>

      <FilePreviewModal
        open={!!previewFile}
        file={previewFile}
        title="Company Logo"
        onClose={() => setPreviewFile(null)}
      />

      <TextField
        fullWidth multiline minRows={4} size="small"
        label="About Company *"
        placeholder={`Brief description of your company (${ABOUT_MIN}–${ABOUT_MAX} chars)…`}
        value={formData.about}
        onChange={onChange('about')}
        onBlur={() => touch('about')}
        error={showErr('about')}
        helperText={showErr('about') ? liveErrors.about : ' '}
        sx={{ ...inputSx, mb: 0.5 }}
      />
      <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={1.25} sx={{ mb: 2 }}>
        {formData.about.length > 0 && formData.about.length < ABOUT_MIN && (
          <Typography sx={{ fontSize: 11, color: DANGER }}>
            {ABOUT_MIN - formData.about.length} more needed
          </Typography>
        )}
        <Typography sx={{ fontSize: 11, color: charCounterColor, fontWeight: charCounterColor === DANGER ? 700 : 400 }}>
          {formData.about.length}/{ABOUT_MAX}
        </Typography>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: COLS_2, gap: 2.5, mb: 1 }}>
        <FormControl size="small" error={showErr('employee_count_range')} sx={inputSx}>
          <InputLabel>Employee Count *</InputLabel>
          <Select
            label="Employee Count *"
            value={formData.employee_count_range}
            onChange={onChange('employee_count_range')}
            onBlur={() => touch('employee_count_range')}
            MenuProps={{
              slotProps: {
                paper: {
                  sx: {
                    borderRadius: '14px', mt: 0.75, border: 'none',
                    boxShadow: '0 14px 40px rgba(31,31,31,.12)',
                  },
                },
              },
            }}
          >
            <MenuItem value=""><em>Select range…</em></MenuItem>
            {EMPLOYEE_RANGES.map(r => <MenuItem key={r} value={r}>{r} employees</MenuItem>)}
          </Select>
          <FormHelperText>{showErr('employee_count_range') ? liveErrors.employee_count_range : ' '}</FormHelperText>
        </FormControl>
        <TextField
          size="small" label="Established Year" placeholder="e.g. 2005"
          value={formData.established_year}
          onChange={onChange('established_year')}
          onBlur={() => touch('established_year')}
          error={showErr('established_year')}
          helperText={showErr('established_year') ? liveErrors.established_year : ' '}
          slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 4 } }}
          sx={inputSx}
        />
      </Box>

      <Box sx={{ mb: 2 }}>
        <Typography sx={fieldLabelSx}>Office Locations</Typography>
        <TagInput
          value={formData.locations}
          onChange={v => set('locations', v)}
          placeholder="Type a city and press Enter…"
          hasError={!!liveErrors.locations}
        />
        <Typography sx={{ fontSize: 11, color: liveErrors.locations ? DANGER : MUTED, mt: 0.75 }}>
          {liveErrors.locations || 'Press Enter or comma after each location'}
        </Typography>
      </Box>

      <Typography sx={sectionHeaderSx}>Online Presence</Typography>

      <TextField
        fullWidth size="small" label="Official Website"
        placeholder="https://yourcompany.com"
        value={formData.website_url}
        onChange={onChange('website_url')}
        onBlur={() => touch('website_url')}
        error={showErr('website_url')}
        helperText={showErr('website_url') ? liveErrors.website_url : ' '}
        sx={{ ...inputSx, mb: 1 }}
      />

      <Box sx={{ display: 'grid', gridTemplateColumns: COLS_2, gap: 2.5, mb: 1 }}>
        <TextField
          size="small" label="LinkedIn" placeholder="https://linkedin.com/company/…"
          value={formData.linkedin_url}
          onChange={onChange('linkedin_url')}
          onBlur={() => touch('linkedin_url')}
          error={showErr('linkedin_url')}
          helperText={showErr('linkedin_url') ? liveErrors.linkedin_url : ' '}
          sx={inputSx}
        />
        <TextField
          size="small" label="Twitter / X" placeholder="https://twitter.com/…"
          value={formData.twitter_url}
          onChange={onChange('twitter_url')}
          onBlur={() => touch('twitter_url')}
          error={showErr('twitter_url')}
          helperText={showErr('twitter_url') ? liveErrors.twitter_url : ' '}
          sx={inputSx}
        />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: COLS_2, gap: 2.5, mb: 1 }}>
        <TextField
          size="small" label="Facebook" placeholder="https://facebook.com/…"
          value={formData.facebook_url}
          onChange={onChange('facebook_url')}
          onBlur={() => touch('facebook_url')}
          error={showErr('facebook_url')}
          helperText={showErr('facebook_url') ? liveErrors.facebook_url : ' '}
          sx={inputSx}
        />
        <TextField
          size="small" label="Instagram" placeholder="https://instagram.com/…"
          value={formData.instagram_url}
          onChange={onChange('instagram_url')}
          onBlur={() => touch('instagram_url')}
          error={showErr('instagram_url')}
          helperText={showErr('instagram_url') ? liveErrors.instagram_url : ' '}
          sx={inputSx}
        />
      </Box>

      {showSummary && !formValid && <ErrorSummary errors={liveErrors} />}

      <Stack direction="row" spacing={2} sx={{ mt: 4 }}>
        <Button onClick={onBack} sx={secondaryBtnSx} startIcon={<ArrowBack sx={{ fontSize: 16 }} />}>
          Back
        </Button>
        <Button
          variant="contained"
          disabled={loading}
          onClick={handleSubmit}
          sx={primaryBtnSx}
          startIcon={loading ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : null}
        >
          {loading ? 'Saving profile…' : 'Continue to documents'}
        </Button>
      </Stack>
    </Box>
  );
};

/* ============================================================================
 * STEP 4 — DOCUMENTS
 * ========================================================================== */
const Step4Documents = ({ files, setFiles, titles, setTitles, onNext, onBack }) => {
  const [errors, setErrors] = useState({});
  const [previewFile,  setPreviewFile]  = useState(null);
  const [previewTitle, setPreviewTitle] = useState('');

  const validateFile = (key, file) =>
    V.file(file, { maxMB: FILE_MAX_MB, accepted: FILE_ACCEPTED_EXT });

  const setFile = (key, file) => {
    if (file) {
      const err = validateFile(key, file);
      if (err) { setErrors(p => ({ ...p, [key]: err })); return; }
    }
    setErrors(p => { const n = { ...p }; delete n[key]; return n; });
    setFiles(p => ({ ...p, [key]: file }));
  };

  const requiredMissing = useMemo(
    () => DOCUMENT_CONFIGS.filter(d => d.required && !files[d.key]),
    [files]
  );

  const formValid = useMemo(() => {
    if (requiredMissing.length > 0) return false;
    if (Object.keys(errors).length > 0) return false;
    for (const doc of DOCUMENT_CONFIGS) {
      if (files[doc.key] && validateFile(doc.key, files[doc.key])) return false;
    }
    return true;
  }, [files, errors, requiredMissing]);

  const handleSubmit = () => onNext();

  const uploadedCount = DOCUMENT_CONFIGS.filter(d => files[d.key]).length;

  return (
    <Box>
      {/* 🔧 CO-REDESIGN 14/16 — Progress line replaces the warning Alert.
          The old banner listed every missing required document by name, which
          duplicated the per-row "Required" markers directly below it and was
          usually five items long on arrival. A count reads faster and the rows
          already say which ones. */}
      <Stack direction="row" justifyContent="space-between" alignItems="baseline"
        sx={{ pb: 1.25, mb: 3, borderBottom: `1px solid ${LINE}` }}>
        <Typography sx={{
          fontSize: 11.5, fontWeight: 700, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: INK,
        }}>
          Identity & Registration Proofs
        </Typography>
        <Typography sx={{
          fontSize: 11.5, fontWeight: 600, flexShrink: 0,
          color: requiredMissing.length === 0 ? SUCCESS : MUTED,
        }}>
          {uploadedCount} of {DOCUMENT_CONFIGS.length} uploaded
        </Typography>
      </Stack>

      {DOCUMENT_CONFIGS.map((doc, i) => {
        const hasFile = !!files[doc.key];
        const hasErr  = !!errors[doc.key];
        return (
          <Box
            key={doc.key}
            sx={{
              py: 2.5,
              borderBottom: i === DOCUMENT_CONFIGS.length - 1 ? 'none' : `1px solid ${LINE}`,
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center"
              spacing={1.5} sx={{ mb: 1.5 }}>
              <Stack direction="row" alignItems="baseline" spacing={1} sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: INK }}>
                  {doc.title}
                </Typography>
                <Typography sx={{
                  fontSize: 11, fontWeight: 600, flexShrink: 0,
                  color: doc.required ? (hasFile ? SUCCESS : DANGER) : FAINT,
                }}>
                  {doc.required ? 'required' : 'optional'}
                </Typography>
              </Stack>
              {hasFile && !hasErr && (
                <CheckCircle sx={{ fontSize: 16, color: SUCCESS, flexShrink: 0 }} />
              )}
            </Stack>

            {hasFile ? (
              <>
                <SelectedFileRow
                  file={files[doc.key]}
                  onPreview={() => { setPreviewFile(files[doc.key]); setPreviewTitle(doc.title); }}
                  onRemove={() => setFile(doc.key, null)}
                />
                <TextField
                  fullWidth size="small"
                  label="Document title (optional)"
                  value={titles[doc.key] || ''}
                  onChange={e => setTitles(p => ({ ...p, [doc.key]: e.target.value }))}
                  slotProps={{ htmlInput: { maxLength: 255 } }}
                  sx={{ ...inputSx, mt: 2 }}
                />
              </>
            ) : (
              <Box sx={{ ...dropZoneSx(hasErr), p: '14px 16px' }}>
                <Box
                  component="input"
                  type="file"
                  accept={FILE_ACCEPT}
                  onChange={e => { if (e.target.files[0]) setFile(doc.key, e.target.files[0]); }}
                  sx={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
                />
                <Typography sx={{ fontSize: 13, color: MUTED }}>
                  <Box component="span" sx={{ color: SAGE_DARK, fontWeight: 700 }}>Click to upload</Box>
                  {' '}— PDF, JPG or PNG (max {FILE_MAX_MB}MB)
                </Typography>
              </Box>
            )}
            {hasErr && (
              <Typography sx={{ fontSize: 11, color: DANGER, mt: 1 }}>{errors[doc.key]}</Typography>
            )}
          </Box>
        );
      })}

      <Stack direction="row" spacing={2} sx={{ mt: 4 }}>
        <Button onClick={onBack} sx={secondaryBtnSx} startIcon={<ArrowBack sx={{ fontSize: 16 }} />}>
          Back
        </Button>
        <Button variant="contained" disabled={!formValid} onClick={handleSubmit} sx={primaryBtnSx}>
          Continue to review
        </Button>
      </Stack>

      <FilePreviewModal
        open={!!previewFile}
        file={previewFile}
        title={previewTitle}
        onClose={() => { setPreviewFile(null); setPreviewTitle(''); }}
      />
    </Box>
  );
};

/* ============================================================================
 * STEP 5 — REVIEW
 * ========================================================================== */
const Step5Review = ({ step1Data, step3Data, step4Files, step4Titles, onBack, onEdit, onConfirm, loading, apiError }) => {
  const [previewFile,  setPreviewFile]  = useState(null);
  const [previewTitle, setPreviewTitle] = useState('');
  const openPreview = (file, title) => { setPreviewFile(file); setPreviewTitle(title); };

  const uploadedDocs = DOCUMENT_CONFIGS.filter(d => step4Files[d.key]);

  /* 🔧 CO-REDESIGN 15/16 — Review rows: were a two-column grid of tiny caps
     labels over values, inside a filled card with a hover lift. Now a label /
     value table separated by hairlines — the same ReviewRow shape the
     jobseeker form uses, which reads far better at half-page width. */
  const reviewItem = (label, value, last = false) => (
    <Box key={label} sx={{
      display: 'flex', alignItems: 'flex-start', py: 1.25,
      borderBottom: last ? 'none' : `1px solid ${LINE}`,
    }}>
      <Typography sx={{
        fontSize: 12.5, color: MUTED, flexShrink: 0,
        width: { xs: 112, sm: 160 }, lineHeight: 1.55,
      }}>
        {label}
      </Typography>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {typeof value === 'string' || value === null || value === undefined ? (
          <Typography sx={{
            fontSize: 13.5, lineHeight: 1.55, wordBreak: 'break-word',
            color: value && String(value).trim() ? INK : FAINT,
          }}>
            {value && String(value).trim() ? value : '—'}
          </Typography>
        ) : value}
      </Box>
    </Box>
  );

  const reviewSection = (icon, title, editStep, content) => (
    <Box sx={{ mb: 4 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center"
        spacing={2} sx={{ pb: 1.25, borderBottom: `1px solid ${LINE}` }}>
        <Stack direction="row" alignItems="center" spacing={1.125} sx={{ minWidth: 0 }}>
          {icon}
          <Typography sx={{
            fontSize: 11.5, fontWeight: 700, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: INK, whiteSpace: 'nowrap',
          }}>
            {title}
          </Typography>
        </Stack>
        <Button
          size="small"
          onClick={() => onEdit(editStep)}
          disabled={loading}
          startIcon={<Edit sx={{ fontSize: 14 }} />}
          sx={{
            textTransform: 'none', fontSize: 12, fontWeight: 700,
            minWidth: 0, p: 0, color: SAGE_DARK, flexShrink: 0,
            textDecoration: 'underline', textUnderlineOffset: '3px',
            '&:hover': { bgcolor: 'transparent', color: INK },
          }}
        >
          Edit
        </Button>
      </Stack>
      <Box sx={{ pt: 1 }}>{content}</Box>
    </Box>
  );

  const thumb = (src, file, title) => (
    <Box
      onClick={() => openPreview(file, title)}
      sx={{
        position: 'relative', display: 'inline-block', cursor: 'zoom-in',
        '&:hover .preview-overlay': { opacity: 1 },
      }}
    >
      <Box component="img" src={src} alt={title}
        sx={{ width: 52, height: 52, borderRadius: '10px', objectFit: 'cover',
              border: `1px solid ${LINE}`, display: 'block' }} />
      <Box className="preview-overlay" sx={{
        position: 'absolute', inset: 0, borderRadius: '10px',
        bgcolor: 'rgba(31,31,31,.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: 0, transition: 'opacity .15s',
      }}>
        <ZoomIn sx={{ fontSize: 19, color: '#fff' }} />
      </Box>
    </Box>
  );

  return (
    <Box>
      {apiError && <Alert severity="error" sx={{ ...alertSx, mb: 2.5 }}>{apiError}</Alert>}

      {reviewSection(
        <Person sx={{ fontSize: 16, color: SAGE }} />,
        'Account & Company',
        0,
        <>
          {reviewItem('Company name', step1Data.company_name)}
          {reviewItem('Company domain', step1Data.company_domain)}
          {reviewItem(
            'Industry',
            step1Data.industry_type === 'Other' && step1Data.industry_type_other
              ? `Other — ${step1Data.industry_type_other}`
              : step1Data.industry_type
          )}
          {reviewItem('Your name', step1Data.full_name)}
          {reviewItem(
            'Department',
            step1Data.department === 'Other' && step1Data.department_other
              ? `Other — ${step1Data.department_other}`
              : step1Data.department
          )}
          {reviewItem('Designation', step1Data.designation)}
          {reviewItem('Personal email', step1Data.email)}
          {reviewItem('Contact', `${dialCode(step1Data.country_code)} ${step1Data.phone}`)}
          {reviewItem('Location', step1Data.location_region,
            !step1Data.profile_image_preview)}
          {step1Data.profile_image_preview && reviewItem(
            'Profile photo',
            thumb(step1Data.profile_image_preview, step1Data.profile_image_file, 'Profile Photo'),
            true
          )}
        </>
      )}

      {reviewSection(
        <Business sx={{ fontSize: 16, color: SAGE }} />,
        'Company Profile',
        2,
        <>
          {reviewItem('Address',
            `${step3Data.address_line1}${step3Data.address_line2 ? `, ${step3Data.address_line2}` : ''}, ${step3Data.city}, ${step3Data.state} — ${step3Data.pincode}, ${step3Data.country}`)}
          {reviewItem('Office email', step3Data.office_email)}
          {reviewItem('Secondary email', step3Data.secondary_email)}
          {reviewItem('Primary contact', `${dialCode(step1Data.country_code || DEFAULT_COUNTRY_CODE)} ${step3Data.primary_contact}`)}
          {reviewItem('Secondary contact', step3Data.secondary_contact
            ? `${dialCode(step3Data.secondary_country_code || DEFAULT_COUNTRY_CODE)} ${step3Data.secondary_contact}`
            : '')}
          {reviewItem('Employee count', step3Data.employee_count_range)}
          {reviewItem('Established', step3Data.established_year)}
          {reviewItem('About', step3Data.about)}
          {reviewItem('Office locations', step3Data.locations)}
          {reviewItem('Website', step3Data.website_url)}
          {reviewItem('LinkedIn', step3Data.linkedin_url)}
          {reviewItem('Twitter / X', step3Data.twitter_url)}
          {reviewItem('Facebook', step3Data.facebook_url)}
          {reviewItem('Instagram', step3Data.instagram_url, !step3Data.company_logo_preview)}
          {step3Data.company_logo_preview && reviewItem(
            'Company logo',
            thumb(step3Data.company_logo_preview, step3Data.company_logo_file, 'Company Logo'),
            true
          )}
        </>
      )}

      {reviewSection(
        <Description sx={{ fontSize: 16, color: SAGE }} />,
        `Documents (${uploadedDocs.length})`,
        3,
        uploadedDocs.length === 0 ? (
          <Typography sx={{ fontSize: 13.5, color: FAINT, py: 1.25 }}>
            No documents uploaded.
          </Typography>
        ) : (
          uploadedDocs.map((doc, i) => (
            <Stack
              key={doc.key}
              direction="row"
              alignItems="center"
              spacing={1.25}
              onClick={() => openPreview(step4Files[doc.key], step4Titles[doc.key] || doc.title)}
              sx={{
                py: 1.25, cursor: 'pointer',
                borderBottom: i === uploadedDocs.length - 1 ? 'none' : `1px solid ${LINE}`,
                '&:hover .doc-name': { color: SAGE_DARK },
              }}
            >
              <CheckCircle sx={{ fontSize: 15, color: SUCCESS, flexShrink: 0 }} />
              <Typography sx={{
                fontSize: 12.5, color: MUTED, flexShrink: 0,
                width: { xs: 112, sm: 160 },
              }}>
                {doc.title}
              </Typography>
              <Typography className="doc-name" sx={{
                fontSize: 13, color: INK, flex: 1, minWidth: 0,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                transition: 'color .15s',
              }}>
                {step4Titles[doc.key] || step4Files[doc.key].name}
              </Typography>
              <Typography sx={{ fontSize: 11, color: FAINT, flexShrink: 0 }}>
                {(step4Files[doc.key].size / 1024 / 1024).toFixed(2)} MB
              </Typography>
            </Stack>
          ))
        )
      )}

      <Typography sx={{ fontSize: 12.5, color: MUTED, lineHeight: 1.65, mb: 3 }}>
        Submitting confirms that everything above is accurate. Your documents will
        be uploaded and your registration finalised.
      </Typography>

      <Stack direction="row" spacing={2}>
        <Button onClick={onBack} disabled={loading} sx={secondaryBtnSx}
          startIcon={<ArrowBack sx={{ fontSize: 16 }} />}>
          Back
        </Button>
        <Button
          variant="contained"
          disabled={loading}
          onClick={onConfirm}
          sx={primaryBtnSx}
          startIcon={loading ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : null}
        >
          {loading ? 'Finalising…' : 'Confirm & submit'}
        </Button>
      </Stack>

      <FilePreviewModal
        open={!!previewFile}
        file={previewFile}
        title={previewTitle}
        onClose={() => { setPreviewFile(null); setPreviewTitle(''); }}
      />
    </Box>
  );
};


const Step6Success = ({ companyName, onSwitch, registrationComplete }) => (
  <Box sx={{ py: 2 }}>
    <Box sx={{
      width: 60, height: 60, borderRadius: '50%',
      bgcolor: registrationComplete ? SAGE : SAGE_WASH,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      mb: 3,
    }}>
      {registrationComplete
        ? <Celebration sx={{ fontSize: 28, color: '#fff' }} />
        : <Warning sx={{ fontSize: 28, color: WARN }} />}
    </Box>

    <Typography component="h2" sx={{
      fontWeight: 800, color: INK, letterSpacing: '-0.025em',
      fontSize: { xs: '1.9rem', sm: '2.35rem' }, lineHeight: 1.12, mb: 1.25,
    }}>
      {registrationComplete ? (
        <>You&apos;re{' '}
          <Box component="span" sx={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 400, color: SAGE }}>
            in
          </Box>.
        </>
      ) : (
        <>Not quite{' '}
          <Box component="span" sx={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 400, color: SAGE }}>
            finished
          </Box>.
        </>
      )}
    </Typography>

    <Typography sx={{ fontSize: 14, color: MUTED, lineHeight: 1.7, mb: 3.5 }}>
      {registrationComplete ? (
        <><Box component="span" sx={{ color: INK, fontWeight: 700 }}>{companyName}</Box>{' '}
          has been registered. Sign in to reach your dashboard.</>
      ) : (
        <>Some required steps are still incomplete. Go back and finish Account,
          Verify Email, Company Profile, Documents and Review before submitting.</>
      )}
    </Typography>

    {registrationComplete ? (
      <Button variant="contained" onClick={() => onSwitch('login')}
        sx={{ ...primaryBtnSx, flex: 'none', width: '100%', maxWidth: 300 }}>
        Go to sign in
      </Button>
    ) : (
      <Button onClick={() => onSwitch('register')} sx={secondaryBtnSx}
        startIcon={<ArrowBack sx={{ fontSize: 16 }} />}>
        Back to registration
      </Button>
    )}
  </Box>
);

/* ============================================================================
 * MAIN COMPONENT
 * ========================================================================== */
const STEP_LABELS = ['Account', 'Verify Email', 'Company Profile', 'Documents', 'Review', 'Done'];

// Per-step header copy. One headline pattern, one accent word each — the
// sign-in page's shape, carried through the whole wizard.
const STEP_HEADS = [
  { lead: 'Set up your',  accent: 'account',   sub: 'Your company, your role, and the credentials you will sign in with.' },
  { lead: 'Verify your',  accent: 'email',     sub: 'A six-digit code is on its way to the address you just entered.' },
  { lead: 'Your company', accent: 'profile',   sub: 'Address, contact routes, and where your company shows up online.' },
  { lead: 'Upload your',  accent: 'documents', sub: 'Registration and identity proofs, used for eKYC verification.' },
  { lead: 'One last',     accent: 'look',      sub: 'Check every section. Edit takes you straight back to it.' },
  null,   // step 6 owns its own heading
];

const CompanyRegisterForm = ({ onSwitch }) => {
  const [step, setStep] = useState(0);
  const [finalLoading, setFinalLoading] = useState(false);
  const [finalError,   setFinalError]   = useState('');
  const [registrationComplete, setRegistrationComplete] = useState(false);

  const [step1Data, setStep1Data] = useState({
    company_name: '', company_domain: '', industry_type: '', industry_type_other: '',
    full_name: '', location_region: '', department: '', department_other: '', designation: '',
    email: '', confirm_email: '',
    country_code: DEFAULT_COUNTRY_CODE, phone: '',
    password: '', confirm_password: '',
    profile_image_file: null, profile_image_preview: null,
  });

  const [step3Data, setStep3Data] = useState({
    address_line1: '', address_line2: '', city: '', state: '', pincode: '', country: 'India',
    office_email: '', secondary_email: '',
    primary_contact: '',
    secondary_contact: '', secondary_country_code: DEFAULT_COUNTRY_CODE,
    company_logo_file: null, company_logo_preview: null,
    about: '', established_year: '', employee_count_range: '', locations: '',
    website_url: '', linkedin_url: '', twitter_url: '', facebook_url: '', instagram_url: '',
  });

  const [step4Files,  setStep4Files]  = useState({});
  const [step4Titles, setStep4Titles] = useState({});

  const [meta, setMeta] = useState({
    company_id: null, employer_id: null, profile_id: null,
    email: '', company_name: '',
  });

  const handleFinalSubmit = async () => {
    setFinalLoading(true);
    setFinalError('');
    try {
      const companyId = meta.company_id;
      if (!companyId) {
        setFinalError('Company ID is missing. Please restart registration.');
        setFinalLoading(false);
        return;
      }

      const requiredMissing = DOCUMENT_CONFIGS.filter(d => d.required && !step4Files[d.key]);
      if (requiredMissing.length > 0) {
        setFinalError(
          `Please upload all required documents before submitting: ${requiredMissing.map(d => d.title).join(', ')}.`
        );
        setFinalLoading(false);
        return;
      }

      const uploadable = DOCUMENT_CONFIGS.filter(d => step4Files[d.key]);
      for (const doc of uploadable) {
        const fd = new FormData();
        fd.append('document_type',  doc.type);
        fd.append('document_title', step4Titles[doc.key] || doc.title);
        fd.append('document_file',  step4Files[doc.key]);
        await api.post(`/companies/${companyId}/documents`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      localStorage.setItem('currentCompanyId', String(companyId));

      setRegistrationComplete(true);
      setStep(5);
    } catch (err) {
      setFinalError(
        err.response?.data?.Error || err.message || 'Failed to complete registration.'
      );
    } finally {
      setFinalLoading(false);
    }
  };

  const head = STEP_HEADS[step];

  return (
    <Box sx={{ width: '100%', maxWidth: 620, mx: 'auto', pb: 6, textAlign: 'left' }}>

      <Eyebrow>Company registration</Eyebrow>

      {head
        ? <Headline lead={head.lead} accent={head.accent} sub={head.sub} />
        : <Box sx={{ mb: 1 }} />}

      {step < 5 && (
        <StepRail
          steps={STEP_LABELS}
          step={step}
          onStepClick={(i) => {
            if (i === 5 && !registrationComplete) return;
            setFinalError('');
            setStep(i);
          }}
        />
      )}

      {step === 0 && (
        <Step1Account
          formData={step1Data}
          setFormData={setStep1Data}
          onNext={(data) => { setMeta(m => ({ ...m, ...data })); setStep(1); }}
        />
      )}

      {step === 1 && (
        <Step2OTP
          email={meta.email}
          onNext={() => setStep(2)}
          onBack={() => setStep(0)}
        />
      )}

      {step === 2 && (
        <Step3Profile
          companyId={meta.company_id}
          existingProfileId={meta.profile_id}
          personalEmail={meta.email}
          autoPhone={step1Data.phone}
          autoCountryCode={step1Data.country_code}
          formData={step3Data}
          setFormData={setStep3Data}
          onNext={(data) => { setMeta(m => ({ ...m, ...data })); setStep(3); }}
          onBack={() => setStep(1)}
        />
      )}

      {step === 3 && (
        <Step4Documents
          files={step4Files}
          setFiles={setStep4Files}
          titles={step4Titles}
          setTitles={setStep4Titles}
          onNext={() => setStep(4)}
          onBack={() => setStep(2)}
        />
      )}

      {step === 4 && (
        <Step5Review
          step1Data={step1Data}
          step3Data={step3Data}
          step4Files={step4Files}
          step4Titles={step4Titles}
          onBack={() => setStep(3)}
          onEdit={(targetStep) => setStep(targetStep)}
          onConfirm={handleFinalSubmit}
          loading={finalLoading}
          apiError={finalError}
        />
      )}

      {step === 5 && (
        <Step6Success
          companyName={meta.company_name}
          onSwitch={onSwitch}
          registrationComplete={registrationComplete}
        />
      )}

      {step === 0 && (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, my: 4 }}>
            <Box sx={{ flex: 1, height: '1px', bgcolor: LINE }} />
            <Typography sx={{ fontSize: 12.5, color: FAINT }}>or</Typography>
            <Box sx={{ flex: 1, height: '1px', bgcolor: LINE }} />
          </Box>

          <Typography sx={{ textAlign: 'center', fontSize: 13.5, color: MUTED }}>
            Already a member?{' '}
            <Box
              component="span"
              onClick={() => onSwitch?.('login')}
              sx={{
                color: SAGE_DARK, fontWeight: 700, cursor: 'pointer',
                '&:hover': { color: INK, textDecoration: 'underline', textUnderlineOffset: '3px' },
              }}
            >
              Sign in
            </Box>
          </Typography>
        </>
      )}
    </Box>
  );
};

export default CompanyRegisterForm;