import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  InputAdornment,
  IconButton,
  CircularProgress,
  MenuItem,
  Grid,
  Avatar,
  Paper,
  Popover,
  Menu,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  CheckCircleOutlined,
  PersonOutlined,
  DeleteOutlined,
  ChevronLeft,
  ChevronRight,
  ArrowDropDown,
  CalendarTodayOutlined,
  CheckOutlined,
  AddPhotoAlternateOutlined,
  KeyboardArrowDown,
} from "@mui/icons-material";
import { useSnackbar } from "notistack";
import axios from "axios";
import api from "@/services/api/axiosInstance";
import {
  parsePhoneNumberFromString,
  getCountries,
  getCountryCallingCode,
  getExampleNumber,
} from 'libphonenumber-js/max';
import phoneExamples from 'libphonenumber-js/examples.mobile.json';

const publicApi = axios.create({ baseURL: "/api" });

// BUILD: 2026-09-16-jp-biometric-v1 — biometric steps
import FaceCaptureStep from "./register/FaceCaptureStep";
import VoiceRecordStep from "./register/VoiceRecordStep";
import VoiceCheckStep from "./register/VoiceCheckStep";

// ── Backend-mandated enum values ─────────────────────────────────────────────
const GENDER_CHOICES         = ["Male", "Female", "Transgender"];
const CATEGORY_CHOICES       = [
  "General",
  "Scheduled Caste (SC)",
  "Scheduled Tribe (ST)",
  "OBC - Creamy",
  "OBC - Non creamy",
  "Other",
];
const MARITAL_STATUS_CHOICES = [
  "Single/Unmarried",
  "Married",
  "Widowed",
  "Divorced",
  "Separated",
  "Other",
];

const REGION_NAMES =
  typeof Intl !== 'undefined' && Intl.DisplayNames
    ? new Intl.DisplayNames(['en'], { type: 'region' })
    : null;

const _flagFor = (iso) => {
  if (!iso || iso.length !== 2) return '';
  const A = 0x1F1E6;
  return String.fromCodePoint(A + iso.charCodeAt(0) - 65) +
         String.fromCodePoint(A + iso.charCodeAt(1) - 65);
};

const PRIORITY_ISO = ['IN', 'AE', 'US', 'GB', 'SG', 'AU', 'CA', 'SA', 'QA', 'KW'];

const COUNTRY_CODES = (() => {
  const list = getCountries().map((iso2) => ({
    code: iso2,
    name: REGION_NAMES?.of(iso2) || iso2,
    dial: `+${getCountryCallingCode(iso2)}`,
    flag: _flagFor(iso2),
  }));
  const rank = (c) => {
    const i = PRIORITY_ISO.indexOf(c.code);
    return i === -1 ? PRIORITY_ISO.length : i;
  };
  return list.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
})();

const _exampleCache = {};
const phoneExample = (iso) => {
  if (_exampleCache[iso] === undefined) {
    const ex = getExampleNumber(iso, phoneExamples);
    _exampleCache[iso] = ex ? ex.nationalNumber : '';
  }
  return _exampleCache[iso];
};

const validatePhoneFor = (iso, digits) => {
  if (!digits) return { ok: false, msg: 'Required' };
  const parsed = parsePhoneNumberFromString(digits, iso);
  if (!parsed || !parsed.isValid()) {
    const c = COUNTRY_CODES.find(x => x.code === iso);
    const ex = phoneExample(iso);
    return { ok: false, msg: `Not a valid ${c?.name || iso} number${ex ? ` — e.g. ${ex}` : ''}` };
  }
  const type = parsed.getType();
  if (type && !['MOBILE', 'FIXED_LINE_OR_MOBILE', 'PERSONAL_NUMBER'].includes(type)) {
    return { ok: false, msg: 'Please enter a mobile number' };
  }
  return { ok: true, msg: '' };
};

const PHONE_MAX_DIGITS = 15;
// Country-specific national number length from libphonenumber-js example data
// (India → 10, UAE → 9, US → 10, etc.). Falls back to E.164 max (15).
const _maxDigitsCache = {};
const phoneMaxDigitsFor = (iso) => {
  if (_maxDigitsCache[iso] === undefined) {
    const ex = phoneExample(iso);
    _maxDigitsCache[iso] = ex ? ex.length : PHONE_MAX_DIGITS;
  }
  return _maxDigitsCache[iso];
};
const dialForIso = (iso) => COUNTRY_CODES.find(c => c.code === iso)?.dial || "+91";
/* Searchable country picker — 245 options need a filter box, so this is a
 * dropdown that opens a searchable menu (mirrors the CompanyRegisterForm). */
const CountrySelect = ({ value, onChange, error = false, ariaLabel = 'Country' }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const anchorRef = useRef(null);

  const selectedIso = (value || 'IN:+91').split(':')[0] || 'IN';
  const selected = COUNTRY_CODES.find(c => c.code === selectedIso) || COUNTRY_CODES[0];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRY_CODES;
    const bare = q.replace(/^\+/, '');
    return COUNTRY_CODES.filter(o =>
      o.name.toLowerCase().includes(q) ||
      o.dial.replace('+', '').startsWith(bare) ||
      o.code.toLowerCase() === q
    );
  }, [query]);

  const handleClose = () => { setOpen(false); setQuery(''); };
  const pick = (iso) => { onChange(iso); handleClose(); };

  const HOVER_TINT = 'rgba(127,158,126,0.10)';
  const DANGER = '#c62828';

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
          '&:hover':         { borderBottomColor: error ? DANGER : LINE_HOVER },
          '&:focus-visible': { outline: 'none', borderBottomColor: HEADING, borderBottomWidth: '1.5px' },
        }}
      >
        <FlagImg code={selected.code} emoji={selected.flag} size={18} />
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: HEADING }}>
          {selected.dial}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <KeyboardArrowDown sx={{
          color: MUTED, transition: 'transform .18s',
          transform: open ? 'rotate(180deg)' : 'none',
        }} />
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
              overflow: 'hidden',
            },
          },
        }}
      >
        <Box sx={{ p: 1, borderBottom: `1px solid ${LINE}` }}>
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
            <Box sx={{ px: 2, py: 2, fontSize: 13, color: MUTED }}>No countries match.</Box>
          ) : filtered.map((o) => {
            const isSelected = o.code === selected.code;
            return (
              <Box
                key={o.code}
                role="option"
                aria-selected={isSelected}
                onClick={() => pick(o.code)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1.25,
                  px: 1.5, py: 1, cursor: 'pointer',
                  bgcolor: isSelected ? HOVER_TINT : 'transparent',
                  '&:hover': { bgcolor: HOVER_TINT },
                }}
              >
                <FlagImg code={o.code} emoji={o.flag} size={20} />
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: HEADING, minWidth: 46 }}>
                  {o.dial}
                </Typography>
                <Typography sx={{
                  fontSize: 13, color: MUTED, overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {o.name}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Popover>
    </>
  );
};
// BUILD: 2026-09-16-jp-biometric-v1 — added Face, Voice Record, and Voice Check steps
const STEPS = ["Email & Password", "Verify OTP", "Your Details", "Face Capture", "Voice Recording", "Voice Check", "Review"];

const DRAFT_KEY = "ievalx_jobseeker_draft_v1";

// ── Calendar constants (for the custom date-of-birth picker) ─────────────────
const MONTH_NAMES     = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAY_LABELS  = ["S", "M", "T", "W", "T", "F", "S"];

// ── Field defaults ───────────────────────────────────────────────────────────
const INITIAL_FORM = {
  email:            "",
  password:         "",
  confirm_password: "",
  first_name:    "",
  middle_name:   "",
  last_name:     "",
  phone_number:  "",
  country_code:  "IN:+91",   
  date_of_birth: "",
  gender:        "",
  category:      "",
  marital_status: "",
  current_address_line:   "",
  current_city:           "",
  current_state:          "",
  current_pincode:        "",
  permanent_address_line: "",
  permanent_city:         "",
  permanent_state:        "",
  permanent_pincode:      "",
};


const PRIMARY       = "#7F9E7E";   // sage — accents, focus, valid state
const PRIMARY_DARK  = "#6C8B6B";
const HEADING       = "#1F1F1F";   // ink — headings and the pill button
const MUTED         = "#6F7470";   // labels, helper text, secondary copy
const FAINT         = "#A8ACA6";   // placeholder-weight text, empty values
const SUCCESS_COLOR = "#2E7D32";
const ERROR_COLOR   = "#C62828";
const WARN_COLOR    = "#E65100";

const LINE       = "#E1E5DE";   // resting hairline — fields, rules, rail track
const LINE_HOVER = "#BFC8BC";   // hover hairline
const TRACK      = "#E7EBE5";   // inactive progress segment

const SERIF = "'DM Serif Display', Georgia, 'Times New Roman', serif";

// ── Password strength (module-level) ─────────────────────────────────────────
const getPasswordStrength = (pwd) => {
  if (!pwd) return 0;
  let s = 0;
  if (pwd.length >= 8)                          s++;
  if (pwd.length >= 12)                         s++;
  if (/[A-Z]/.test(pwd))                        s++;
  if (/[a-z]/.test(pwd))                        s++;
  if (/\d/.test(pwd))                           s++;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(pwd))      s++;
  return Math.min(s, 5);
};
const PWD_LABELS = ["", "Very Weak", "Weak", "Fair", "Good", "Strong"];
const PWD_COLORS = ["", "#D9534F", "#E8A13C", "#B7C48E", "#7F9E7E", "#6C8B6B"];

// ── Flag image with emoji fallback (module-level) ─────────────────────────────
const FlagImg = ({ code, emoji, size = 18 }) => {
  const [imgErr, setImgErr] = React.useState(false);
  if (imgErr) {
    return <span style={{ fontSize: size * 0.9, lineHeight: 1, display: "block" }}>{emoji}</span>;
  }
  return (
    <img
      src={`https://flagcdn.com/${code.toLowerCase()}.svg`}
      width={size}
      height={Math.round(size * 0.72)}
      alt={emoji}
      onError={() => setImgErr(true)}
      style={{ borderRadius: 2, objectFit: "cover", display: "block", flexShrink: 0 }}
    />
  );
};

const Eyebrow = ({ children }) => (
  <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1.25, mb: 1.5 }}>
    <Box sx={{ width: 9, height: 9, borderLeft: `1.5px solid ${PRIMARY}`,
               borderTop: `1.5px solid ${PRIMARY}` }} />
    <Typography component="span"
      sx={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.18em",
            color: PRIMARY, textTransform: "uppercase", lineHeight: 1 }}>
      {children}
    </Typography>
    <Box sx={{ width: 9, height: 9, borderRight: `1.5px solid ${PRIMARY}`,
               borderBottom: `1.5px solid ${PRIMARY}` }} />
  </Box>
);

const StepRail = ({ steps, activeStep }) => (
  <Box sx={{ mb: { xs: 3.5, sm: 4.5 } }}>
    <Box sx={{ display: "flex", alignItems: "baseline",
               justifyContent: "space-between", gap: 2, mb: 1.25 }}>
      <Typography sx={{ fontSize: 13, fontWeight: 700, color: HEADING, letterSpacing: "-0.01em" }}>
        {steps[activeStep]}
      </Typography>
      <Typography sx={{ fontSize: 11.5, color: MUTED, whiteSpace: "nowrap", flexShrink: 0 }}>
        Step {activeStep + 1} of {steps.length}
      </Typography>
    </Box>
    <Box sx={{ display: "flex", gap: "5px" }}>
      {steps.map((label, i) => (
        <Box key={label} sx={{
          flex: 1, height: 3, borderRadius: 3,
          bgcolor: i <= activeStep ? PRIMARY : TRACK,
          transition: "background-color .35s ease",
        }} />
      ))}
    </Box>
  </Box>
);

const DateOfBirthPicker = ({ value, onChange, error, helperText, minDate, maxDate }) => {
  const [anchorEl, setAnchorEl]         = useState(null);
  const [viewMonth, setViewMonth]       = useState(() => (value ? new Date(`${value}T00:00:00`).getMonth() : new Date().getMonth()));
  const [viewYear, setViewYear]         = useState(() => (value ? new Date(`${value}T00:00:00`).getFullYear() : new Date().getFullYear()));
  const [monthMenuAnchor, setMonthMenuAnchor] = useState(null);
  const [yearMenuAnchor, setYearMenuAnchor]   = useState(null);

  const open    = Boolean(anchorEl);
  const minYear = new Date(`${minDate}T00:00:00`).getFullYear();
  const maxYear = new Date(`${maxDate}T00:00:00`).getFullYear();

  const openPicker = (e) => {
    const d = value ? new Date(`${value}T00:00:00`) : new Date();
    setViewMonth(d.getMonth());
    setViewYear(d.getFullYear());
    setAnchorEl(e.currentTarget);
  };
  const closePicker = () => { setAnchorEl(null); setMonthMenuAnchor(null); setYearMenuAnchor(null); };

  const goPrevMonth = () => setViewMonth((m) => { if (m === 0) { setViewYear((y) => y - 1); return 11; } return m - 1; });
  const goNextMonth = () => setViewMonth((m) => { if (m === 11) { setViewYear((y) => y + 1); return 0; } return m + 1; });
  const goPrevYear  = () => setViewYear((y) => Math.max(minYear, y - 1));
  const goNextYear  = () => setViewYear((y) => Math.min(maxYear, y + 1));

  const pickDate = (y, m, d) => {
    const iso = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    if (iso < minDate || iso > maxDate) return;
    onChange(iso);
    closePicker();
  };

  // Build the 6×7 day grid, including faded leading/trailing adjacent-month days
  const firstWeekday    = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth     = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstWeekday; i++) {
    cells.push({ day: daysInPrevMonth - firstWeekday + 1 + i, adjacent: "prev" });
  }
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, adjacent: "current" });
  let nextDay = 1;
  while (cells.length < 42) cells.push({ day: nextDay++, adjacent: "next" });

  const todayStr    = new Date().toISOString().split("T")[0];
  const years       = [];
  for (let y = maxYear; y >= minYear; y--) years.push(y);

  const displayLabel = value
    ? new Date(`${value}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "Enter date";
  const fieldLabel = value
    ? new Date(`${value}T00:00:00`).toLocaleDateString("en-GB")
    : "";

  return (
    <>
      <TextField
        fullWidth size="small" label="Date of birth *" placeholder="DD/MM/YYYY"
        value={fieldLabel} onClick={openPicker} error={error}
        helperText={helperText || "Must be 18+ years old"}
        slotProps={{
          input: {
            readOnly: true,
            // Trailing, so it clears the resting label on the left.
            endAdornment: (
              <InputAdornment position="end">
                <CalendarTodayOutlined sx={{ fontSize: 15, color: value ? PRIMARY : FAINT }} />
              </InputAdornment>
            ),
          },
        }}
        sx={{ "& .MuiInputBase-input": { cursor: "pointer" },
              "&& .MuiOutlinedInput-root": { cursor: "pointer" } }}
      />

      <Popover
        open={open} anchorEl={anchorEl} onClose={closePicker}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{ paper: { sx: { borderRadius: "18px",
                                    boxShadow: "0 18px 50px rgba(31,31,31,0.14)", mt: 1 } } }}
      >
        <Box sx={{ width: 336, p: 3, bgcolor: "#fff" }}>
          <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em",
                            color: MUTED, textTransform: "uppercase", mb: 1 }}>
            Select date
          </Typography>
          <Typography sx={{ fontSize: 28, fontWeight: 700, color: HEADING, mb: 2.5,
                            lineHeight: 1.1, letterSpacing: "-0.02em" }}>
            {displayLabel}
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.75 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
              <IconButton size="small" onClick={goPrevMonth} sx={{ color: MUTED }}>
                <ChevronLeft fontSize="small" />
              </IconButton>
              <Button
                size="small" onClick={(e) => setMonthMenuAnchor(e.currentTarget)}
                endIcon={<ArrowDropDown />}
                sx={{ textTransform: "none", color: HEADING, fontWeight: 700,
                      fontSize: 14.5, minWidth: 0, px: 0.75 }}
              >
                {MONTH_NAMES[viewMonth]}
              </Button>
              <IconButton size="small" onClick={goNextMonth} sx={{ color: MUTED }}>
                <ChevronRight fontSize="small" />
              </IconButton>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
              <IconButton size="small" onClick={goPrevYear} disabled={viewYear <= minYear} sx={{ color: MUTED }}>
                <ChevronLeft fontSize="small" />
              </IconButton>
              <Button
                size="small" onClick={(e) => setYearMenuAnchor(e.currentTarget)}
                endIcon={<ArrowDropDown />}
                sx={{ textTransform: "none", color: HEADING, fontWeight: 700,
                      fontSize: 14.5, minWidth: 0, px: 0.75 }}
              >
                {viewYear}
              </Button>
              <IconButton size="small" onClick={goNextYear} disabled={viewYear >= maxYear} sx={{ color: MUTED }}>
                <ChevronRight fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          <Menu
            anchorEl={monthMenuAnchor} open={Boolean(monthMenuAnchor)}
            onClose={() => setMonthMenuAnchor(null)}
            slotProps={{ paper: { sx: { maxHeight: 280, borderRadius: "12px" } } }}
          >
            {MONTH_NAMES.map((m, i) => (
              <MenuItem key={m} selected={i === viewMonth}
                onClick={() => { setViewMonth(i); setMonthMenuAnchor(null); }}>
                {m}
              </MenuItem>
            ))}
          </Menu>
          <Menu
            anchorEl={yearMenuAnchor} open={Boolean(yearMenuAnchor)}
            onClose={() => setYearMenuAnchor(null)}
            slotProps={{ paper: { sx: { maxHeight: 280, borderRadius: "12px" } } }}
          >
            {years.map((y) => (
              <MenuItem key={y} selected={y === viewYear}
                onClick={() => { setViewYear(y); setYearMenuAnchor(null); }}>
                {y}
              </MenuItem>
            ))}
          </Menu>

          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
            {WEEKDAY_LABELS.map((w, i) => (
              <Typography key={i} sx={{ textAlign: "center", fontSize: 12,
                                        fontWeight: 700, color: FAINT, py: 0.5 }}>
                {w}
              </Typography>
            ))}
          </Box>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", rowGap: 0.5 }}>
            {cells.map((c, idx) => {
              const y = c.adjacent === "prev" ? (viewMonth === 0 ? viewYear - 1 : viewYear)
                      : c.adjacent === "next" ? (viewMonth === 11 ? viewYear + 1 : viewYear)
                      : viewYear;
              const m = c.adjacent === "prev" ? (viewMonth === 0 ? 11 : viewMonth - 1)
                      : c.adjacent === "next" ? (viewMonth === 11 ? 0 : viewMonth + 1)
                      : viewMonth;
              const iso        = `${y}-${String(m + 1).padStart(2, "0")}-${String(c.day).padStart(2, "0")}`;
              const isToday    = iso === todayStr;
              const isSelected = iso === value;
              const isOutOfRange = iso < minDate || iso > maxDate;
              return (
                <Box key={idx} sx={{ display: "flex", justifyContent: "center", py: 0.25 }}>
                  <Box
                    component="button" type="button" disabled={isOutOfRange}
                    onClick={() => pickDate(y, m, c.day)}
                    sx={{
                      width: 34, height: 34, borderRadius: "50%", fontFamily: "inherit",
                      border: isToday && !isSelected ? `1.5px solid ${PRIMARY}` : "1.5px solid transparent",
                      bgcolor: isSelected ? PRIMARY : "transparent",
                      color: isSelected
                        ? "#fff"
                        : c.adjacent !== "current" || isOutOfRange
                          ? "#C7CCC5"
                          : HEADING,
                      fontWeight: isSelected || isToday ? 700 : 500,
                      fontSize: 13.5, cursor: isOutOfRange ? "not-allowed" : "pointer",
                      transition: "background-color .15s, color .15s",
                      "&:hover": !isOutOfRange
                        ? { bgcolor: isSelected ? PRIMARY_DARK : "rgba(127,158,126,0.12)" }
                        : {},
                    }}
                  >
                    {c.day}
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      </Popover>
    </>
  );
};

// ────────────────────────────────────────────────────────────────────────────
const JobseekerRegisterForm = ({ onSwitch }) => {
  const { enqueueSnackbar } = useSnackbar();

  // ── Flow state ─────────────────────────────────────────────────────────────
  const [activeStep, setActiveStep] = useState(0);
  const [loading,    setLoading]    = useState(false);

  // ── Form state ─────────────────────────────────────────────────────────────
  const [form,          setForm]          = useState(INITIAL_FORM);
  const [fieldErrors,   setFieldErrors]   = useState({});
  const [showPass,      setShowPass]      = useState(false);
  const [showPass2,     setShowPass2]     = useState(false);
  const [sameAsCurrent, setSameAsCurrent] = useState(false);

  // ── OTP state ──────────────────────────────────────────────────────────────
  const [otpCode,      setOtpCode]      = useState("");
  const [otpExpiresIn, setOtpExpiresIn] = useState(0);

  const isSendingOtpRef   = useRef(false);
  const isVerifyingOtpRef = useRef(false);
  const isRegisteringRef  = useRef(false);

  // ── OTP box refs (one per digit) ───────────────────────────────────────────
  const otpRefs = useRef([]);

  // ── File / photo ───────────────────────────────────────────────────────────
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const photoInputRef = useRef(null);

  // BUILD: 2026-09-16-jp-biometric-v1 — Biometric state (captured in steps 3, 4 & 5)
  const [biometricPhotoBase64, setBiometricPhotoBase64] = useState(null);
  const [biometricFaceValid,   setBiometricFaceValid]   = useState(false);
  const [biometricVoiceBase64, setBiometricVoiceBase64] = useState(null);
  const [biometricVoiceSentence, setBiometricVoiceSentence] = useState(null);
  const [biometricVoiceCheckPassed, setBiometricVoiceCheckPassed] = useState(false);

  // ── Pincode auto-fill ──────────────────────────────────────────────────────
  const [pinLoading, setPinLoading] = useState({ current: false, permanent: false });
  const [pinSuccess, setPinSuccess] = useState({ current: false, permanent: false });
  const [pinInfo,    setPinInfo]    = useState({ current: "", permanent: "" });

  // ── Saved draft banner ──────────────────────────────────────────────────────
  const [draftBanner, setDraftBanner] = useState(null); // { form, savedAt } | null

  const sectionRefs = {
    photo:     useRef(null),
    personal:  useRef(null),
    current:   useRef(null),
    permanent: useRef(null),
  };
  const pendingScrollRef = useRef(null);

  // ── OTP countdown ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (otpExpiresIn <= 0) return;
    const t = setInterval(
      () => setOtpExpiresIn((s) => Math.max(0, s - 1)),
      1000,
    );
    return () => clearInterval(t);
  }, [otpExpiresIn]);

  // ── Photo preview cleanup ──────────────────────────────────────────────────
  useEffect(() => {
    return () => { if (photoPreview) URL.revokeObjectURL(photoPreview); };
  }, [photoPreview]);

  // ── Check for a saved draft on mount ───────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.form && parsed?.savedAt) setDraftBanner(parsed);
      }
    } catch {
    }
  }, []);

  // Runs the deferred scroll once step 3 has painted.
  useEffect(() => {
    if (activeStep !== 2 || !pendingScrollRef.current) return;
    const key = pendingScrollRef.current;
    pendingScrollRef.current = null;
    const frame = requestAnimationFrame(() => {
      sectionRefs[key]?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => cancelAnimationFrame(frame);
  }, [activeStep]);

  // ── Generic field setter ───────────────────────────────────────────────────
  const setField = (name) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((p) => ({ ...p, [name]: value }));
    setFieldErrors((p) => ({ ...p, [name]: "" }));
  };

  const clearMessages = () => {};   

  const formatTime = (s) => {
    const m = Math.floor(s / 60), r = s % 60;
    return `${m}:${r.toString().padStart(2, "0")}`;
  };
  const handleOtpChange = (index) => (e) => {
    const digit = e.target.value.replace(/\D/g, "").slice(-1);
    const arr = otpCode.padEnd(6, " ").split("");
    arr[index] = digit || " ";
    const next = arr.join("").replace(/\s+$/, "").slice(0, 6);
    setOtpCode(next);
    clearMessages();
    if (digit && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index) => (e) => {
    if (e.key === "Backspace") {
      if (otpCode[index]) {
        setOtpCode(otpCode.slice(0, index) + otpCode.slice(index + 1));
      } else if (index > 0) {
        setOtpCode(otpCode.slice(0, index - 1) + otpCode.slice(index));
        otpRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft"  && index > 0) {
      otpRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  // Paste anywhere on the 6 boxes — fill from first box
  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    setOtpCode(pasted);
    clearMessages();
    otpRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  // ── Pincode auto-fill via India Post API ───────────────────────────────────
  const fetchPincodeDetails = async (pincode, type) => {
    setPinLoading((p) => ({ ...p, [type]: true }));
    setPinSuccess((p) => ({ ...p, [type]: false }));
    setPinInfo((p)    => ({ ...p, [type]: "" }));
    try {
      const res  = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
      const data = await res.json();
      if (data[0]?.Status === "Success" && data[0]?.PostOffice?.length > 0) {
        const post   = data[0].PostOffice[0];
        const city   = post.District || post.Block || "";
        const state  = post.State    || "";
        const poName = post.Name     || "";
        setForm((p) => {
          const u = { ...p };
          if (type === "current") {
            u.current_city  = city;
            u.current_state = state;
            if (sameAsCurrent) { u.permanent_city = city; u.permanent_state = state; }
          } else {
            u.permanent_city  = city;
            u.permanent_state = state;
          }
          return u;
        });
        setFieldErrors((e) => {
          const u = { ...e };
          if (type === "current") { u.current_city = ""; u.current_state = ""; }
          else                    { u.permanent_city = ""; u.permanent_state = ""; }
          return u;
        });
        setPinInfo((p)    => ({ ...p, [type]: `${poName}, ${city}, ${state}` }));
        setPinSuccess((p) => ({ ...p, [type]: true }));
      } else {
        setPinInfo((p) => ({ ...p, [type]: "Pincode not found — enter city & state manually" }));
      }
    } catch {
      setPinInfo((p) => ({ ...p, [type]: "Could not fetch details — enter manually" }));
    } finally {
      setPinLoading((p) => ({ ...p, [type]: false }));
    }
  };


const onPhoneChange = (e) => {
  const iso = form.country_code.split(":")[0] || "IN";
  const max = phoneMaxDigitsFor(iso);
  const val = e.target.value.replace(/\D/g, "").slice(0, max);
  setForm((p) => ({ ...p, phone_number: val }));
  if (val.length === max) {
    const { ok, msg } = validatePhoneFor(iso, val);
    setFieldErrors((p) => ({ ...p, phone_number: ok ? "" : msg }));
  } else {
    setFieldErrors((p) => ({ ...p, phone_number: "" }));
  }
};
const onCountryCodeChange = (iso) => {
  const max = phoneMaxDigitsFor(iso);
  setForm((p) => ({
    ...p,
    country_code: `${iso}:${dialForIso(iso)}`,
    // Trim already-typed digits down to the new country's cap.
    phone_number: (p.phone_number || "").slice(0, max),
  }));
  setFieldErrors((p) => ({ ...p, country_code: "", phone_number: "" }));
};
  const onPincodeChange = (type) => (e) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
    setForm((p)        => ({ ...p, [`${type}_pincode`]: val }));
    setFieldErrors((p) => ({ ...p, [`${type}_pincode`]: "" }));
    setPinSuccess((p)  => ({ ...p, [type]: false }));
    setPinInfo((p)     => ({ ...p, [type]: "" }));
    if (val.length === 6) fetchPincodeDetails(val, type);
  };

  // ── Age helper (used by onChange live-check and by final-submit validation) ─
  const calcAge = (dobStr) => {
    const dob   = new Date(dobStr);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const md = today.getMonth() - dob.getMonth();
    if (md < 0 || (md === 0 && today.getDate() < dob.getDate())) age--;
    return age;
  };

  // ── Date of birth change — live age check + toast on under-18 ───────────────
  const applyDateOfBirth = (value) => {
    setForm((p) => ({ ...p, date_of_birth: value }));
    setFieldErrors((p) => ({ ...p, date_of_birth: "" }));

    if (!value) return;

    const age = calcAge(value);
    if (age < 18) {
      setFieldErrors((p) => ({ ...p, date_of_birth: "Must be at least 18 years old" }));
      enqueueSnackbar("You must be at least 18 years old to register.", {
        variant: "warning",
        anchorOrigin: { vertical: "top", horizontal: "right" },
      });
    }
  };

  // ── Validation ─────────────────────────────────────────────────────────────
  const validateEmailStep = () => {
    const errs = {};
    if (!form.email.trim())
      errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = "Invalid email format";

    if (!form.password)
      errs.password = "Password is required";
    else if (form.password.length < 8)
      errs.password = "Minimum 8 characters";
    else if (!/[A-Z]/.test(form.password))
      errs.password = "Must contain at least one uppercase letter";
    else if (!/[a-z]/.test(form.password))
      errs.password = "Must contain at least one lowercase letter";
    else if (!/\d/.test(form.password))
      errs.password = "Must contain at least one number";
    else if (!/[!@#$%^&*(),.?":{}|<>]/.test(form.password))
      errs.password = 'Must contain at least one special character (!@#$%^&*…)';

    if (!form.confirm_password)
      errs.confirm_password = "Please confirm your password";
    else if (form.password !== form.confirm_password)
      errs.confirm_password = "Passwords do not match";

    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      enqueueSnackbar("Please fix the highlighted errors before continuing.", {
        variant: "warning",
        anchorOrigin: { vertical: "top", horizontal: "right" },
      });
      return false;
    }
    return true;
  };

  const validateOtpStep = () => {
    if (!/^\d{6}$/.test(otpCode)) {
      enqueueSnackbar("OTP must be exactly 6 digits.", {
        variant: "error",
        anchorOrigin: { vertical: "top", horizontal: "right" },
      });
      return false;
    }
    return true;
  };

  const validateDetailsStep = () => {
    const errs = {};

    if (!form.first_name.trim())
      errs.first_name = "Required";
    else if (!/^[a-zA-Z\s'-]+$/.test(form.first_name.trim()))
      errs.first_name = "Only letters, spaces, hyphens allowed";

    if (form.middle_name.trim() && !/^[a-zA-Z\s'-]+$/.test(form.middle_name.trim()))
      errs.middle_name = "Only letters, spaces, hyphens allowed";

    if (!form.last_name.trim())
      errs.last_name = "Required";
    else if (!/^[a-zA-Z\s'-]+$/.test(form.last_name.trim()))
      errs.last_name = "Only letters, spaces, hyphens allowed";

    const iso = form.country_code.split(":")[0] || "IN";
    if (!form.phone_number.trim()) {
      errs.phone_number = "Required";
    } else {
      const { ok, msg } = validatePhoneFor(iso, form.phone_number.replace(/\D/g, ""));
      if (!ok) errs.phone_number = msg;
    }

    if (!form.date_of_birth) {
      errs.date_of_birth = "Required";
    } else {
      const age = calcAge(form.date_of_birth);
      if (age < 18) {
        errs.date_of_birth = "Must be at least 18 years old";
        enqueueSnackbar("You must be at least 18 years old to register.", {
          variant: "warning",
          anchorOrigin: { vertical: "top", horizontal: "right" },
        });
      }
    }

    if (!form.gender) errs.gender = "Required";

    if (!form.current_city.trim())    errs.current_city    = "Required";
    if (!form.current_state.trim())   errs.current_state   = "Required";
    if (!form.current_pincode.trim()) errs.current_pincode = "Required";
    else if (!/^\d{6}$/.test(form.current_pincode))
      errs.current_pincode = "Must be 6 digits";

    if (!form.permanent_city.trim())    errs.permanent_city    = "Required";
    if (!form.permanent_state.trim())   errs.permanent_state   = "Required";
    if (!form.permanent_pincode.trim()) errs.permanent_pincode = "Required";
    else if (!/^\d{6}$/.test(form.permanent_pincode))
      errs.permanent_pincode = "Must be 6 digits";

    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      enqueueSnackbar("Please fill in all required fields correctly.", {
        variant: "warning",
        anchorOrigin: { vertical: "top", horizontal: "right" },
      });
      return false;
    }
    return true;
  };

  // ── "Same as current" toggle ───────────────────────────────────────────────
  const toggleSameAsCurrent = (checked) => {
    setSameAsCurrent(checked);
    if (checked) {
      setForm((p) => ({
        ...p,
        permanent_address_line: p.current_address_line,
        permanent_city:         p.current_city,
        permanent_state:        p.current_state,
        permanent_pincode:      p.current_pincode,
      }));
      if (pinSuccess.current) {
        setPinSuccess((p) => ({ ...p, permanent: true }));
        setPinInfo((p)    => ({ ...p, permanent: p.current }));
      }
    }
  };

  // ── File picker ────────────────────────────────────────────────────────────
  const onPickPhoto = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!["image/jpeg", "image/png", "image/jpg", "image/webp"].includes(f.type)) {
      enqueueSnackbar("Invalid photo type. Allowed: JPEG, PNG, WEBP", {
        variant: "error",
        anchorOrigin: { vertical: "top", horizontal: "right" },
      });
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      enqueueSnackbar("Photo must be under 5 MB", {
        variant: "error",
        anchorOrigin: { vertical: "top", horizontal: "right" },
      });
      return;
    }
    setProfilePhoto(f);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(URL.createObjectURL(f));
  };

  // ── Remove selected photo ────────────────────────────────────────────────────
  const onRemovePhoto = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setProfilePhoto(null);
    setPhotoPreview(null);
    if (photoInputRef.current) photoInputRef.current.value = "";
    enqueueSnackbar("Photo removed.", {
      variant: "info",
      anchorOrigin: { vertical: "top", horizontal: "right" },
    });
  };

  // ── Draft save / restore / discard ─────────────────────────────────────────
  // Password fields are intentionally excluded — never persisted to storage.
  const saveDraft = () => {
    try {
      const { password, confirm_password, ...safeForm } = form;
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ form: safeForm, savedAt: Date.now() }));
      enqueueSnackbar("Draft saved. You can resume it later on this device.", {
        variant: "success",
        anchorOrigin: { vertical: "top", horizontal: "right" },
      });
    } catch {
      enqueueSnackbar("Couldn't save a draft on this device.", {
        variant: "error",
        anchorOrigin: { vertical: "top", horizontal: "right" },
      });
    }
  };

  const restoreDraft = () => {
    if (!draftBanner?.form) return;
    setForm((p) => ({ ...p, ...draftBanner.form }));
    setDraftBanner(null);
    enqueueSnackbar("Draft restored. Pick up where you left off.", {
      variant: "success",
      anchorOrigin: { vertical: "top", horizontal: "right" },
    });
  };

  const discardDraft = () => {
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
    setDraftBanner(null);
  };

  // ── Backend calls ──────────────────────────────────────────────────────────

  // Step 1 → POST /api/jobseeker/send-otp
  const sendOtp = async () => {
    if (isSendingOtpRef.current) return;
    isSendingOtpRef.current = true;
    if (!validateEmailStep()) { isSendingOtpRef.current = false; return; }
    setLoading(true);
    try {
      await publicApi.post("/jobseeker/send-otp", {
        email:    form.email.trim().toLowerCase(),
        otp_type: "registration",
      });
      enqueueSnackbar(`OTP sent to ${form.email}. Valid for 10 minutes.`, {
        variant: "success",
        anchorOrigin: { vertical: "top", horizontal: "right" },
      });
      setOtpExpiresIn(10 * 60);
      setActiveStep(1);
    } catch (err) {
      enqueueSnackbar(
        err?.response?.data?.Error || "Failed to send OTP. Please try again.",
        { variant: "error", anchorOrigin: { vertical: "top", horizontal: "right" } },
      );
    } finally {
      setLoading(false);
      isSendingOtpRef.current = false;
    }
  };

  // Resend — same endpoint; backend auto-deletes previous OTP
  const resendOtp = async () => {
    setLoading(true);
    try {
      await publicApi.post("/jobseeker/send-otp", {
        email:    form.email.trim().toLowerCase(),
        otp_type: "registration",
      });
      enqueueSnackbar("New OTP sent. Check your email.", {
        variant: "success",
        anchorOrigin: { vertical: "top", horizontal: "right" },
      });
      setOtpExpiresIn(10 * 60);
      setOtpCode("");
    } catch (err) {
      enqueueSnackbar(
        err?.response?.data?.Error || "Failed to resend OTP.",
        { variant: "error", anchorOrigin: { vertical: "top", horizontal: "right" } },
      );
    } finally {
      setLoading(false);
    }
  };

  // Step 2 → POST /api/jobseeker/verify-otp
  const verifyOtp = async () => {
    if (isVerifyingOtpRef.current) return;
    isVerifyingOtpRef.current = true;
    if (!validateOtpStep()) { isVerifyingOtpRef.current = false; return; }
    setLoading(true);
    try {
      await publicApi.post("/jobseeker/verify-otp", {
        email:    form.email.trim().toLowerCase(),
        otp_code: otpCode,
        otp_type: "registration",
      });
      enqueueSnackbar("Email verified! Fill in your details to complete registration.", {
        variant: "success",
        anchorOrigin: { vertical: "top", horizontal: "right" },
      });
      setActiveStep(2);
    } catch (err) {
      enqueueSnackbar(
        err?.response?.data?.Error || "OTP verification failed. Please try again.",
        { variant: "error", anchorOrigin: { vertical: "top", horizontal: "right" } },
      );
    } finally {
      setLoading(false);
      isVerifyingOtpRef.current = false;
    }
  };

  // Step 4 → POST /api/jobseeker/register  (multipart/form-data)
  const registerCandidate = async () => {
    if (isRegisteringRef.current) return;
    isRegisteringRef.current = true;
    if (!validateDetailsStep()) { isRegisteringRef.current = false; return; }
    setLoading(true);
    try {
      const fd = new FormData();

      fd.append("email",        form.email.trim().toLowerCase());
      fd.append("password",     form.password);
      fd.append("first_name",   form.first_name.trim());
      fd.append("last_name",    form.last_name.trim());
      fd.append("phone_number", form.phone_number.replace(/\D/g, ""));
      // country_code stored as "CC:+dial" internally; backend only needs "+dial"
      fd.append("country_code", form.country_code.split(":")[1] || "+91");

      if (form.middle_name.trim())     fd.append("middle_name",    form.middle_name.trim());
      if (form.date_of_birth)          fd.append("date_of_birth",  form.date_of_birth);
      if (form.gender)                 fd.append("gender",         form.gender);
      if (form.category)               fd.append("category",       form.category);
      if (form.marital_status)         fd.append("marital_status", form.marital_status);

      if (form.current_address_line)
        fd.append("current_address_line", form.current_address_line);
      fd.append("current_city",    form.current_city);
      fd.append("current_state",   form.current_state);
      fd.append("current_pincode", form.current_pincode);

      if (form.permanent_address_line)
        fd.append("permanent_address_line", form.permanent_address_line);
      fd.append("permanent_city",    form.permanent_city);
      fd.append("permanent_state",   form.permanent_state);
      fd.append("permanent_pincode", form.permanent_pincode);

      // BUILD: 2026-09-16-jp-biometric-v1 — biometric fields (all optional)
      if (biometricPhotoBase64) {
        fd.append("photo_base64", biometricPhotoBase64);
      }
      if (biometricVoiceBase64) {
        fd.append("voice_base64", biometricVoiceBase64);
        fd.append("voice_sentence", biometricVoiceSentence || "");
        fd.append("voice_content_type", "audio/webm");
      }

      await publicApi.post("/jobseeker/register", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      enqueueSnackbar("Account created successfully! Please log in.", {
        variant: "success",
        anchorOrigin: { vertical: "top", horizontal: "right" },
      });
      if (typeof onSwitch === "function") onSwitch("login");
    } catch (err) {
      const d   = err?.response?.data;
      const msg =
        (Array.isArray(d?.errors) && d.errors.join(", ")) ||
        d?.Error || "";
      const field = d?.field;

      if (field === "phone_number" || field === "email") {
        setFieldErrors((p) => ({ ...p, [field]: msg }));
        setActiveStep(2);
        window.scrollTo({ top: 0, behavior: "smooth" });
        enqueueSnackbar(msg, {
          variant: "error",
          anchorOrigin: { vertical: "top", horizontal: "right" },
        });
        return;
      }

      // BUILD: 2026-09-16-jp-biometric-v1 — jump back to the failing biometric step
      if (msg && /face|photo|liveness/i.test(msg)) {
        setBiometricPhotoBase64(null);
        setBiometricFaceValid(false);
        setActiveStep(3);
        window.scrollTo({ top: 0, behavior: "smooth" });
        enqueueSnackbar(msg, { variant: "error", anchorOrigin: { vertical: "top", horizontal: "right" } });
        return;
      }
      if (msg && /voice|recording|silent/i.test(msg)) {
        setBiometricVoiceBase64(null);
        setBiometricVoiceSentence(null);
        setActiveStep(4);
        window.scrollTo({ top: 0, behavior: "smooth" });
        enqueueSnackbar(msg, { variant: "error", anchorOrigin: { vertical: "top", horizontal: "right" } });
        return;
      }

      enqueueSnackbar(
        msg || "Registration failed. Please try again.",
        { variant: "error", anchorOrigin: { vertical: "top", horizontal: "right" } },
      );
    } finally {
      setLoading(false);
      isRegisteringRef.current = false;
    }
  };

  // Step 3 validates, then advances to the review screen.
  const goToReview = () => {
    if (!validateDetailsStep()) return;
    setActiveStep(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Jump back to step 3 and land on the section the user asked to change.
  const editSection = (key) => {
    pendingScrollRef.current = key;
    setActiveStep(2);
  };

  // ── Shared address block ───────────────────────────────────────────────────
  const renderAddressFields = (type) => {
    const isDisabled = type === "permanent" && sameAsCurrent;
    const hasErr     = !!fieldErrors[`${type}_pincode`];
    return (
      <Grid container spacing={{ xs: 1.5, sm: 2.5 }}>
        <Grid size={{ xs: 12 }}>
          <TextField
            fullWidth size="small" label="Address line"
            multiline rows={1} disabled={isDisabled}
            placeholder="House no., street, area, landmark"
            value={form[`${type}_address_line`]}
            onChange={setField(`${type}_address_line`)}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            fullWidth size="small" label="Pincode *" placeholder="e.g. 500001"
            disabled={isDisabled}
            value={form[`${type}_pincode`]}
            onChange={onPincodeChange(type)}
            error={hasErr}
            helperText={
              hasErr
                ? fieldErrors[`${type}_pincode`]
                : pinInfo[type] || "Enter 6-digit pincode"
            }
            slotProps={{
              input: {
                endAdornment: pinLoading[type] ? (
                  <InputAdornment position="end">
                    <CircularProgress size={13} sx={{ color: MUTED }} />
                  </InputAdornment>
                ) : pinSuccess[type] ? (
                  <InputAdornment position="end">
                    <CheckCircleOutlined sx={{ fontSize: 16, color: SUCCESS_COLOR }} />
                  </InputAdornment>
                ) : null,
              },
              formHelperText: !hasErr ? {
                sx: {
                  color: pinSuccess[type] ? SUCCESS_COLOR
                       : pinInfo[type]    ? WARN_COLOR
                       : MUTED,
                  fontSize: "11px", mt: 0.5,
                },
              } : {},
            }}
            sx={pinSuccess[type] && !hasErr ? verifiedFieldSx : undefined}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            fullWidth size="small" label="City *"
            disabled={isDisabled}
            value={form[`${type}_city`]}
            onChange={setField(`${type}_city`)}
            error={!!fieldErrors[`${type}_city`]}
            helperText={fieldErrors[`${type}_city`]}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            fullWidth size="small" label="State *"
            disabled={isDisabled}
            value={form[`${type}_state`]}
            onChange={setField(`${type}_state`)}
            error={!!fieldErrors[`${type}_state`]}
            helperText={fieldErrors[`${type}_state`]}
          />
        </Grid>
      </Grid>
    );
  };

  // ── Derived values ─────────────────────────────────────────────────────────
  const pwdStrength = getPasswordStrength(form.password);
  const currentIso  = form.country_code.split(":")[0] || "IN";
  const dialCode    = form.country_code.split(":")[1] || "+91";
  const phoneDigits = form.phone_number.replace(/\D/g, "");
  const phoneValid  = validatePhoneFor(currentIso, phoneDigits).ok;
  const emailValid  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);

  const maxDobStr = "2035-12-31";
  const minDobStr = "1940-01-01";

  // Selected country entry (for renderValue)
  const selectedCountry = COUNTRY_CODES.find(
    (x) => `${x.code}:${x.dial}` === form.country_code,
  ) || COUNTRY_CODES[0];
  const renderEmailStep = () => (
    <Box
      component="form"
      onSubmit={(e) => { e.preventDefault(); sendOtp(); }}
      noValidate
    >
      <TextField
        label="Email address" type="email"
        fullWidth value={form.email} onChange={setField("email")}
        error={!!fieldErrors.email} helperText={fieldErrors.email}
        slotProps={{
          input: {
            endAdornment: emailValid && !fieldErrors.email ? (
              <InputAdornment position="end">
                <CheckCircleOutlined sx={{ fontSize: 17, color: SUCCESS_COLOR }} />
              </InputAdornment>
            ) : null,
          },
        }}
        sx={emailValid && !fieldErrors.email
          ? { ...largeFieldSx, ...verifiedFieldSx }
          : largeFieldSx}
      />

      <TextField
        label="Password" type={showPass ? "text" : "password"}
        fullWidth value={form.password} onChange={setField("password")}
        error={!!fieldErrors.password}
        helperText={
          fieldErrors.password ||
          "Min 8 chars · uppercase · lowercase · number · special char"
        }
        slotProps={{
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowPass((s) => !s)}
                  edge="end" size="small"
                  aria-label="toggle password visibility"
                  sx={{ color: FAINT, "&:hover": { color: PRIMARY, bgcolor: "transparent" } }}
                >
                  {showPass ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
        sx={{ ...largeFieldSx, mb: form.password ? 1 : 2.75 }}
      />

      {/* Password strength segments */}
      {form.password && (
        <Box sx={{ mb: 2.75 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.625 }}>
            <Typography sx={{ fontSize: 11, color: MUTED, fontWeight: 500 }}>
              Password strength
            </Typography>
            <Typography sx={{ fontSize: 11, color: PWD_COLORS[pwdStrength], fontWeight: 700 }}>
              {PWD_LABELS[pwdStrength]}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: "4px" }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Box key={i} sx={{
                flex: 1, height: 3, borderRadius: 3,
                bgcolor: i <= pwdStrength ? PWD_COLORS[pwdStrength] : TRACK,
                transition: "background-color 0.3s ease",
              }} />
            ))}
          </Box>
        </Box>
      )}

      <TextField
        label="Confirm password" type={showPass2 ? "text" : "password"}
        fullWidth value={form.confirm_password}
        onChange={setField("confirm_password")}
        error={!!fieldErrors.confirm_password}
        helperText={fieldErrors.confirm_password}
        slotProps={{
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowPass2((s) => !s)}
                  edge="end" size="small"
                  aria-label="toggle confirm password"
                  sx={{ color: FAINT, "&:hover": { color: PRIMARY, bgcolor: "transparent" } }}
                >
                  {showPass2 ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
        sx={{ ...largeFieldSx, mb: 3 }}
      />

      <Button type="submit" fullWidth variant="contained" disabled={loading} sx={pillButtonSx}>
        {loading
          ? <><CircularProgress size={17} sx={{ color: "#fff", mr: 1.25 }} />Sending code…</>
          : "Send verification code"}
      </Button>
    </Box>
  );

  // ── Render: Step 2 ─────────────────────────────────────────────────────────
  // 🔧 REDESIGN 5/14 — The tinted "OTP sent to" panel is gone. On a cardless
  // page a filled rounded block is the loudest thing on screen, and it was
  // announcing something the user just typed. One line of prose does it.
  const renderOtpStep = () => (
    <Box
      component="form"
      onSubmit={(e) => { e.preventDefault(); verifyOtp(); }}
      noValidate
    >
      <Typography sx={{ fontSize: 14, color: MUTED, lineHeight: 1.65, mb: 3 }}>
        We sent a 6-digit code to{" "}
        <Box component="span" sx={{ color: HEADING, fontWeight: 700 }}>{form.email}</Box>.
        {otpExpiresIn > 0 && (
          <> It expires in{" "}
            <Box component="span"
              sx={{ color: otpExpiresIn < 60 ? ERROR_COLOR : PRIMARY_DARK, fontWeight: 700 }}>
              {formatTime(otpExpiresIn)}
            </Box>.
          </>
        )}
      </Typography>

      {/* ── 6 OTP digit boxes — underlines, left-aligned with the fields ── */}
      <Box sx={{ display: "flex", gap: { xs: 1, sm: 1.5 }, mb: 2 }}>
        {[0, 1, 2, 3, 4, 5].map((idx) => (
          <Box
            key={idx}
            component="input"
            ref={(el) => { otpRefs.current[idx] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={otpCode[idx] || ""}
            onChange={handleOtpChange(idx)}
            onKeyDown={handleOtpKeyDown(idx)}
            onPaste={handleOtpPaste}
            onFocus={(e) => e.target.select()}
            sx={{
              flex: 1, minWidth: 0, maxWidth: 56,
              height: { xs: 52, sm: 58 },
              border: "none",
              borderBottom: `1.5px solid ${otpCode[idx] ? PRIMARY : LINE}`,
              borderRadius: 0,
              fontSize: { xs: 22, sm: 26 },
              fontWeight: 700,
              textAlign: "center",
              color: HEADING,
              bgcolor: "transparent",
              outline: "none",
              transition: "border-color 0.18s",
              cursor: "text",
              fontFamily: "inherit",
              caretColor: PRIMARY,
              "&:hover": { borderBottomColor: otpCode[idx] ? PRIMARY : LINE_HOVER },
              "&:focus": { borderBottomColor: PRIMARY, borderBottomWidth: "2px" },
            }}
          />
        ))}
      </Box>

      <Box sx={{ display: "flex", justifyContent: "space-between",
                 alignItems: "center", mb: 3 }}>
        <Button type="button" onClick={() => { setActiveStep(0); clearMessages(); }}
          sx={textLinkSx}>
          ← Change email
        </Button>
        <Button type="button" onClick={resendOtp}
          disabled={loading || otpExpiresIn > 0}
          sx={{ ...textLinkSx, color: PRIMARY_DARK, fontWeight: 700 }}>
          {otpExpiresIn > 0 ? `Resend in ${formatTime(otpExpiresIn)}` : "Resend code"}
        </Button>
      </Box>

      <Button type="submit" fullWidth variant="contained"
        disabled={loading || otpCode.length !== 6} sx={pillButtonSx}>
        {loading
          ? <><CircularProgress size={17} sx={{ color: "#fff", mr: 1.25 }} />Verifying…</>
          : "Verify & continue"}
      </Button>
    </Box>
  );

  // ── Render: Step 3 ─────────────────────────────────────────────────────────
  const renderDetailsStep = () => (
    <Box
      component="form"
      onSubmit={(e) => { e.preventDefault(); goToReview(); }}
      noValidate
    >
      {/* 🔧 REDESIGN 6/14 — The success Alert became a one-line note. MUI's
          Alert brings its own fill, radius and icon chrome — three things this
          page no longer has anywhere else. */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3.5 }}>
        <CheckOutlined sx={{ fontSize: 16, color: SUCCESS_COLOR, flexShrink: 0 }} />
        <Typography sx={{ fontSize: 13, color: MUTED }}>
          <Box component="span" sx={{ color: SUCCESS_COLOR, fontWeight: 700 }}>
            Email verified.
          </Box>{" "}
          A few details and you're done.
        </Typography>
      </Box>



      {/* ── Personal Information ── */}
      <FormSection innerRef={sectionRefs.personal} title="Personal information">
        <Grid container spacing={{ xs: 1.5, sm: 2.5 }}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth size="small" label="First name *"
              value={form.first_name} onChange={setField("first_name")}
              error={!!fieldErrors.first_name} helperText={fieldErrors.first_name} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth size="small" label="Middle name"
              value={form.middle_name} onChange={setField("middle_name")}
              error={!!fieldErrors.middle_name} helperText={fieldErrors.middle_name} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth size="small" label="Last name *"
              value={form.last_name} onChange={setField("last_name")}
              error={!!fieldErrors.last_name} helperText={fieldErrors.last_name} />
          </Grid>

          {/* ── Country code — searchable picker over all 245 territories ── */}
          <Grid size={{ xs: 5, sm: 3 }}>
            <Typography sx={{ fontSize: 12, color: MUTED, mb: 0.25 }}>Code</Typography>
            <CountrySelect
              value={form.country_code}
              onChange={onCountryCodeChange}
              error={!!fieldErrors.country_code}
              ariaLabel="Country dialling code"
            />
          </Grid>

          {/* ── Phone number — own Grid column ── */}
          <Grid size={{ xs: 7, sm: 4 }}>
            <TextField
              fullWidth size="small" label="Phone number *"
              placeholder={phoneExample(currentIso) || "Enter number"}
              value={form.phone_number} onChange={onPhoneChange}
              error={!!fieldErrors.phone_number} helperText={fieldErrors.phone_number}
              slotProps={{
                htmlInput: { inputMode: "numeric", maxLength: phoneMaxDigitsFor(currentIso) },
                input: {
                  endAdornment: phoneValid && !fieldErrors.phone_number ? (
                    <InputAdornment position="end">
                      <CheckCircleOutlined sx={{ fontSize: 16, color: SUCCESS_COLOR }} />
                    </InputAdornment>
                  ) : null,
                },
              }}
              sx={phoneValid && !fieldErrors.phone_number ? verifiedFieldSx : undefined}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 5 }}>
            <DateOfBirthPicker
              value={form.date_of_birth}
              onChange={applyDateOfBirth}
              error={!!fieldErrors.date_of_birth}
              helperText={fieldErrors.date_of_birth}
              minDate={minDobStr}
              maxDate={maxDobStr}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField select fullWidth size="small" label="Gender *"
              value={form.gender} onChange={setField("gender")}
              error={!!fieldErrors.gender} helperText={fieldErrors.gender}>
              <MenuItem value=""><em>— Select —</em></MenuItem>
              {GENDER_CHOICES.map((g) => <MenuItem key={g} value={g}>{g}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField select fullWidth size="small" label="Category"
              value={form.category} onChange={setField("category")}>
              <MenuItem value=""><em>— Select —</em></MenuItem>
              {CATEGORY_CHOICES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField select fullWidth size="small" label="Marital status"
              value={form.marital_status} onChange={setField("marital_status")}>
              <MenuItem value=""><em>— Select —</em></MenuItem>
              {MARITAL_STATUS_CHOICES.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
            </TextField>
          </Grid>
        </Grid>
      </FormSection>

      {/* ── Current Address ── */}
      <FormSection innerRef={sectionRefs.current} title="Current address">
        {renderAddressFields("current")}
      </FormSection>

      <FormSection
        innerRef={sectionRefs.permanent}
        title="Permanent address"
        action={
          <Box
            component="button" type="button"
            onClick={() => toggleSameAsCurrent(!sameAsCurrent)}
            sx={{
              display: "inline-flex", alignItems: "center", gap: 0.875,
              border: "none", bgcolor: "transparent", p: 0,
              cursor: "pointer", fontFamily: "inherit",
              color: sameAsCurrent ? HEADING : MUTED,
              "&:hover": { color: PRIMARY_DARK },
            }}
          >
            <Box sx={{
              width: 15, height: 15, borderRadius: "4px", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              border: sameAsCurrent ? `1.5px solid ${PRIMARY}` : `1.5px solid ${LINE_HOVER}`,
              bgcolor: sameAsCurrent ? PRIMARY : "transparent",
              transition: "background-color .18s, border-color .18s",
            }}>
              {sameAsCurrent && <CheckOutlined sx={{ fontSize: 11, color: "#fff" }} />}
            </Box>
            <Box component="span" sx={{ fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
              Same as current
            </Box>
          </Box>
        }
      >
        {renderAddressFields("permanent")}
      </FormSection>

      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 2, mt: 4 }}>
        <Button
          type="button"
          variant="outlined"
          onClick={() => { setActiveStep(1); clearMessages(); }}
          sx={{
            py: 1.25, px: 3, minWidth: 160, fontSize: 14, fontWeight: 700,
            textTransform: "none", borderRadius: "999px",
            borderColor: LINE_HOVER, color: HEADING,
            "&:hover": { borderColor: HEADING, bgcolor: "transparent" },
          }}
        >
          Back
        </Button>
        <Button
          type="submit"
          variant="contained"
          sx={{
            py: 1.25, px: 3, minWidth: 160, fontSize: 14, fontWeight: 700,
            textTransform: "none", borderRadius: "999px",
            bgcolor: HEADING, color: "#fff", boxShadow: "none",
            "&:hover": { bgcolor: "#000", boxShadow: "0 8px 24px rgba(31,31,31,0.18)" },
            "&.Mui-disabled": { bgcolor: "#D3D6D1", color: "#fff" },
          }}
        >
          Next
        </Button>
      </Box>
    </Box>
  );

  const renderReviewStep = () => {
    const fullName = [form.first_name, form.middle_name, form.last_name]
      .map((n) => n.trim()).filter(Boolean).join(" ");
    const dobLabel = form.date_of_birth
      ? new Date(`${form.date_of_birth}T00:00:00`).toLocaleDateString("en-GB")
      : "";
    const cityState = (type) =>
      [form[`${type}_city`], form[`${type}_state`]].filter(Boolean).join(", ");

    return (
      <Box
        component="form"
        onSubmit={(e) => { e.preventDefault(); registerCandidate(); }}
        noValidate
      >
        <Typography sx={{ fontSize: 14, color: MUTED, lineHeight: 1.65, mb: 3.5 }}>
          One last look. Anything that needs changing has an{" "}
          <Box component="span" sx={{ color: PRIMARY_DARK, fontWeight: 700 }}>Edit</Box>{" "}
          link beside its heading.
        </Typography>



        <FormSection title="Personal information"
          action={<EditLink onClick={() => editSection("personal")} />}>
          <ReviewRow label="Full name"      value={fullName} />
          <ReviewRow label="Email"          value={form.email} verified />
          <ReviewRow label="Phone"          value={`${dialCode} ${form.phone_number}`} />
          <ReviewRow label="Date of birth"  value={dobLabel} />
          <ReviewRow label="Gender"         value={form.gender} />
          <ReviewRow label="Category"       value={form.category} />
          <ReviewRow label="Marital status" value={form.marital_status} last />
        </FormSection>

        <FormSection title="Current address"
          action={<EditLink onClick={() => editSection("current")} />}>
          <ReviewRow label="Address line" value={form.current_address_line} />
          <ReviewRow label="City, state"  value={cityState("current")} />
          <ReviewRow label="Pincode"      value={form.current_pincode} last />
        </FormSection>

        <FormSection title="Permanent address"
          action={<EditLink onClick={() => editSection("permanent")} />}>
          {sameAsCurrent ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 1.25 }}>
              <CheckOutlined sx={{ fontSize: 15, color: SUCCESS_COLOR }} />
              <Typography sx={{ fontSize: 13.5, color: SUCCESS_COLOR }}>
                Same as current address
              </Typography>
            </Box>
          ) : (
            <ReviewRow label="Address line" value={form.permanent_address_line} />
          )}
          <ReviewRow label="City, state" value={cityState("permanent")} />
          <ReviewRow label="Pincode"     value={form.permanent_pincode} last />
        </FormSection>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 4 }}>
          <Button type="button" onClick={saveDraft} sx={textLinkSx}>
            Save draft
          </Button>
          <Button type="submit" variant="contained" disabled={loading}
            sx={{ ...pillButtonSx, flex: 1 }}>
            {loading
              ? <><CircularProgress size={17} sx={{ color: "#fff", mr: 1.25 }} />Creating account…</>
              : "Create account"}
          </Button>
        </Box>

        <Box sx={{ mt: 2, textAlign: "center" }}>
          <Button type="button" onClick={() => { setActiveStep(2); clearMessages(); }}
            sx={textLinkSx}>
            ← Back to your details
          </Button>
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ width: "100%", maxWidth: 620, mx: "auto", textAlign: "left" }}>
      <Eyebrow>Jobseeker registration</Eyebrow>

      <Typography
        component="h1"
        sx={{
          fontWeight: 800, color: HEADING, letterSpacing: "-0.025em",
          fontSize: { xs: "2rem", sm: "2.5rem" }, lineHeight: 1.12, mb: 1.5,
        }}
      >
        Let&apos;s get you{" "}
        <Box component="span" sx={{
          fontFamily: SERIF, fontStyle: "italic", fontWeight: 400,
          color: PRIMARY, letterSpacing: 0,
        }}>
          started
        </Box>
        .
      </Typography>

      <Typography sx={{ fontSize: 14.5, color: MUTED, lineHeight: 1.6, mb: { xs: 3, sm: 4 } }}>
        Create your jobseeker account with{" "}
        <Box component="span" sx={{ color: HEADING, fontWeight: 700 }}>IEvalx</Box>{" "}
        and get matched with the right opportunities.
      </Typography>

      {draftBanner && (
        <Box sx={{
          display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1,
          borderTop: `1px solid ${LINE}`, borderBottom: `1px solid ${LINE}`,
          py: 1.5, mb: 3.5,
        }}>
          <Typography sx={{ fontSize: 12.5, color: MUTED, flex: 1, minWidth: 180 }}>
            Saved draft from {new Date(draftBanner.savedAt).toLocaleString()}
          </Typography>
          <Button size="small" onClick={restoreDraft}
            sx={{ ...textLinkSx, color: PRIMARY_DARK, fontWeight: 700 }}>
            Restore
          </Button>
          <Button size="small" onClick={discardDraft} sx={textLinkSx}>
            Discard
          </Button>
        </Box>
      )}

      <StepRail steps={STEPS} activeStep={activeStep} />

      {activeStep === 0 && renderEmailStep()}
      {activeStep === 1 && renderOtpStep()}
      {activeStep === 2 && renderDetailsStep()}
      {/* BUILD: 2026-09-16-jp-biometric-v1 — biometric steps (mandatory) */}
      {activeStep === 3 && (
        <FaceCaptureStep
          onPhotoBase64Change={setBiometricPhotoBase64}
          onFaceValidChange={setBiometricFaceValid}
          onContinue={() => setActiveStep(4)}
        />
      )}
      {activeStep === 4 && (
        <VoiceRecordStep
          onVoiceBase64Change={setBiometricVoiceBase64}
          onSentenceChange={setBiometricVoiceSentence}
          onContinue={() => setActiveStep(5)}
          onBack={() => setActiveStep(3)}
        />
      )}
      {activeStep === 5 && (
        <VoiceCheckStep
          voiceReferenceBase64={biometricVoiceBase64}
          voiceReferenceContentType="audio/webm"
          onCheckPassed={setBiometricVoiceCheckPassed}
          onContinue={() => setActiveStep(6)}
          onBack={() => setActiveStep(4)}
        />
      )}
      {activeStep === 6 && renderReviewStep()}

      <Box sx={{ display: "flex", alignItems: "center", gap: 2, my: 4 }}>
        <Box sx={{ flex: 1, height: "1px", bgcolor: LINE }} />
        <Typography sx={{ fontSize: 12.5, color: FAINT }}>or</Typography>
        <Box sx={{ flex: 1, height: "1px", bgcolor: LINE }} />
      </Box>

      <Typography sx={{ textAlign: "center", fontSize: 13.5, color: MUTED }}>
        Already a member?{" "}
        <Box component="span" onClick={() => onSwitch?.("login")}
          sx={{ color: PRIMARY_DARK, fontWeight: 700, cursor: "pointer",
                "&:hover": { color: HEADING, textDecoration: "underline",
                             textUnderlineOffset: "3px" } }}>
          Sign in
        </Box>
      </Typography>
    </Box>
  );
};

const FormSection = ({ title, children, action, innerRef, optional }) => (
  <Paper elevation={0} ref={innerRef}
    sx={{ bgcolor: "transparent", borderRadius: 0, mb: 4, scrollMarginTop: "28px" }}>
    <Box sx={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: 2, pb: 1.25, borderBottom: `1px solid ${LINE}`,
    }}>
      <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, minWidth: 0 }}>
        <Typography sx={{
          fontSize: 11.5, fontWeight: 700, letterSpacing: "0.14em",
          color: HEADING, textTransform: "uppercase", whiteSpace: "nowrap",
        }}>
          {title}
        </Typography>
        {optional && (
          <Typography sx={{ fontSize: 11, color: FAINT, letterSpacing: "0.04em" }}>
            optional
          </Typography>
        )}
      </Box>
      {action ?? null}
    </Box>
    <Box sx={{ pt: 2.5, ...fieldGroupSx }}>{children}</Box>
  </Paper>
);

const ReviewRow = ({ label, value, verified, last }) => (
  <Box sx={{
    display: "flex", alignItems: "flex-start", py: 1.25,
    borderBottom: last ? "none" : `1px solid ${LINE}`,
  }}>
    <Typography sx={{ fontSize: 12.5, color: MUTED, flexShrink: 0,
                      width: { xs: 108, sm: 150 }, lineHeight: 1.55 }}>
      {label}
    </Typography>
    <Typography sx={{ fontSize: 13.5, flex: 1, minWidth: 0, lineHeight: 1.55,
                      wordBreak: "break-word",
                      color: value ? HEADING : FAINT }}>
      {value || "—"}
    </Typography>
    {verified && (
      <CheckCircleOutlined sx={{ fontSize: 15, color: SUCCESS_COLOR, ml: 1,
                                 mt: 0.25, flexShrink: 0 }} />
    )}
  </Box>
);

// Was a filled sage pill; now a plain underlined text link.
const EditLink = ({ onClick }) => (
  <Button size="small" onClick={onClick}
    sx={{
      textTransform: "none", fontSize: 12, fontWeight: 700,
      minWidth: 0, p: 0, color: PRIMARY_DARK, flexShrink: 0,
      textDecoration: "underline", textUnderlineOffset: "3px",
      "&:hover": { bgcolor: "transparent", color: HEADING },
    }}>
    Edit
  </Button>
);


const fieldGroupSx = {
  "& .MuiTextField-root": { marginTop: "6px" },   // headroom for the shrunk label

  "& .MuiTextField-root .MuiOutlinedInput-root": {
    borderRadius: 0,
    backgroundColor: "transparent",
    boxShadow: "none",
    paddingLeft: 0,
    paddingRight: 0,
    borderBottom: `1px solid ${LINE}`,
    transition: "border-color .2s ease",
    "& fieldset": { border: "none" },
    "&:hover":        { backgroundColor: "transparent", borderBottomColor: LINE_HOVER },
    "&.Mui-focused":  { backgroundColor: "transparent", boxShadow: "none",
                        borderBottomColor: PRIMARY, borderBottomWidth: "1.5px" },
    "&.Mui-disabled": { backgroundColor: "transparent", borderBottomStyle: "dashed" },
    "&.Mui-error":    { backgroundColor: "transparent", boxShadow: "none",
                        borderBottomColor: ERROR_COLOR },
  },

  "& .MuiTextField-root .MuiOutlinedInput-input": {
    paddingLeft: 0, paddingRight: 0, fontSize: 14,
  },
  "& .MuiTextField-root .MuiInputBase-multiline": { paddingLeft: 0, paddingRight: 0 },

  // Label rests on the line and rises above it — no notch, no background.
  "& .MuiTextField-root .MuiInputLabel-outlined": {
    transform: "translate(0, 9px) scale(1)", color: MUTED, fontSize: 14,
  },
  "& .MuiTextField-root .MuiInputLabel-outlined.MuiInputLabel-shrink": {
    transform: "translate(0, -9px) scale(0.78)", letterSpacing: "0.02em",
  },
  "& .MuiTextField-root .MuiInputLabel-root.Mui-focused": { color: PRIMARY_DARK },

  "& .MuiTextField-root .MuiFormHelperText-root": {
    fontSize: 11, marginLeft: 0, marginTop: "6px",
  },
};

// Step-1 fields: same recipe, one size up, to match the sign-in card's inputs.
const largeFieldSx = {
  mb: 2.75,
  "&& .MuiOutlinedInput-root": {
    borderRadius: 0,
    backgroundColor: "transparent",
    boxShadow: "none",
    paddingLeft: 0,
    paddingRight: 0,
    borderBottom: `1px solid ${LINE}`,
    transition: "border-color .2s ease",
    "& fieldset": { border: "none" },
    "&:hover":       { backgroundColor: "transparent", borderBottomColor: LINE_HOVER },
    "&.Mui-focused": { backgroundColor: "transparent", boxShadow: "none",
                       borderBottomColor: PRIMARY, borderBottomWidth: "1.5px" },
    "&.Mui-error":   { backgroundColor: "transparent", boxShadow: "none",
                       borderBottomColor: ERROR_COLOR },
  },
  "&& .MuiOutlinedInput-input": {
    paddingLeft: 0, paddingRight: 0, fontSize: 16, paddingBottom: "10px",
  },
  "&& .MuiInputBase-input[type='password']": { fontSize: 17, letterSpacing: "0.08em" },
  "&& .MuiInputLabel-outlined": {
    transform: "translate(0, 16px) scale(1)", color: MUTED, fontSize: 16,
  },
  "&& .MuiInputLabel-outlined.MuiInputLabel-shrink": {
    transform: "translate(0, -6px) scale(0.75)", letterSpacing: "0.02em",
  },
  "&& .MuiInputLabel-root.Mui-focused": { color: PRIMARY_DARK },
  "&& .MuiFormHelperText-root": { fontSize: 11, marginLeft: 0, marginTop: "7px" },
};

const verifiedFieldSx = {
  "&& .MuiOutlinedInput-root": {
    backgroundColor: "transparent",
    borderBottom: `1.5px solid ${PRIMARY}`,
    "& fieldset": { border: "none" },
    "&:hover": { backgroundColor: "transparent", borderBottomColor: PRIMARY_DARK },
  },
};

// Ink pill — the sign-in page's primary button.
const pillButtonSx = {
  py: 1.625, fontSize: 15, fontWeight: 700, textTransform: "none",
  bgcolor: HEADING, color: "#FFFFFF", borderRadius: "999px",
  boxShadow: "none",
  "&:hover": { bgcolor: "#000000", boxShadow: "0 8px 24px rgba(31,31,31,0.18)" },
  "&.Mui-disabled": { bgcolor: "#D3D6D1", color: "#FFFFFF" },
};

const textLinkSx = {
  textTransform: "none", fontSize: 12.5, fontWeight: 600,
  color: MUTED, p: 0, minWidth: 0, flexShrink: 0,
  "&:hover": { bgcolor: "transparent", color: PRIMARY_DARK },
  "&.Mui-disabled": { color: FAINT },
};

export default JobseekerRegisterForm;