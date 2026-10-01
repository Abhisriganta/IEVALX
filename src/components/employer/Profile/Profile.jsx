import React, { useState, useRef, useEffect } from "react";
import {
  Box, Paper, Avatar, Typography, Button, IconButton, TextField,
  Chip, LinearProgress, CircularProgress, Dialog,
  DialogTitle, DialogContent, DialogActions, MenuItem,
  Alert, Snackbar, Tooltip, InputAdornment, Stack,
} from "@mui/material";
import {
  Edit, Save, Cancel, Lock, CameraAlt, Visibility, VisibilityOff,
  Work, Person, ContactEmergency, Settings,
} from "@mui/icons-material";
import { useEmployerProfile } from "@/hooks/employer/useEmployerProfile";
import profileService from "@/services/api/employer/profileService";

const FONT = "'Jost','DM Sans',sans-serif";
const B = {
  pine:'#022124', pineHover:'#0A3F42',
  sage:'#7F9E7E', sageText:'#5E815D', sageSoft:'#EDF3EC', sageDark:'#6C8B6B',
  border:'#E7EAE3', borderS:'#D8DDD4',
  muted:'#55584F', faint:'#7A7E76', ink:'#101210', body:'#2F332E',
  bg:'#F6F8F3', surface:'#FFFFFF',
  done:'#3E6E3E', doneSoft:'#EAF2E9',
  amber:'#A35A2D', amberSoft:'#F6ECDF',
  danger:'#A63D2F', dangerSoft:'#FAEAE8',
};

// ─── Static option lists ───
const GENDER_OPTIONS = ["Male", "Female", "Other", "Prefer not to say"];


const ALL_SAME_RE = /^(\d)\1+$/;

const validateDOB = (dob) => {
  if (!dob) return null; // optional field
  const d = new Date(dob);
  if (isNaN(d.getTime())) return "Invalid date";
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (d >= today) return "Date of birth must be in the past";
  const age = today.getFullYear() - d.getFullYear() -
    (today < new Date(today.getFullYear(), d.getMonth(), d.getDate()) ? 1 : 0);
  if (age < 18) return "You must be at least 18 years old";
  if (age > 100) return "Please enter a valid date of birth";
  return null;
};

const validateYears = (val, dob = null) => {
  if (val === "" || val === null || val === undefined) return null; // optional
  if (!/^\d+$/.test(String(val))) return "Years of experience must be a whole number";
  const n = Number(val);
  if (n < 0 || n > 70) return "Years of experience must be between 0 and 70";
  if (dob) {
    const birthYear = new Date(dob).getFullYear();
    if (!isNaN(birthYear)) {
      const currentYear = new Date().getFullYear();
      const age = currentYear - birthYear;
      const maxExp = Math.max(0, age - 18);
      if (n > maxExp) return `Cannot exceed ${maxExp} years (based on your date of birth)`;
    }
  }
  return null;
};

const validatePhone = (phone, label = "Phone number") => {
  if (!phone) return null; // optional at field level
  const digits = phone.replace(/\D/g, "");
  if (digits.length !== 10) return `${label} must be exactly 10 digits`;
  if (ALL_SAME_RE.test(digits)) return `${label} cannot be all same digits`;
  if (/^[0-5]/.test(digits)) return `${label} must start with 6-9`;
  return null;
};
const validateLinkedIn = (url) => {
  if (!url) return null; // optional
  if (!/^https?:\/\//i.test(url)) return "Must start with http:// or https://";
  try { new URL(url); } catch { return "Invalid URL format"; }
  if (!/linkedin\.com/i.test(url)) return "Must be a linkedin.com URL";
  return null;
};
const fetchPincodeDetails = async (pincode) => {
  if (!pincode || pincode.length !== 6) return null;
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
    const data = await res.json();
    if (data?.[0]?.Status === 'Success' && data[0].PostOffice?.length > 0) {
      const po = data[0].PostOffice[0];
      return { city: po.District || '', state: po.State || '', country: po.Country || 'India' };
    }
    return null;
  } catch {
    return null;
  }
};
// ─── Profile completion by section (all-or-nothing per section) ───
const COMPLETION_SECTIONS = [
  {
    label: "Personal Information",
    weight: 50,
    fields: ["full_name", "date_of_birth", "gender", "languages_known", "linkedin_url", "years_of_experience"],
  },
  {
    label: "Contact Information",
    weight: 42,
    fields: ["phone", "alternate_contact_number", "personal_address", "city", "country"],
  },
  {
    label: "Profile Photo",
    weight: 8,
    fields: ["profile_image_url"],
  },
];

const isFilled = (val) => (Array.isArray(val) ? val.length > 0 : Boolean(val));

const calcSectionCompletion = (profile) =>
  COMPLETION_SECTIONS.map((sec) => {
    const filled = sec.fields.filter((f) => isFilled(profile[f])).length;
    const total = sec.fields.length;
    const complete = filled === total;
    return { ...sec, filled, total, complete, earned: complete ? sec.weight : 0 };
  });

// "SENIOR_RECRUITER" -> "Senior Recruiter"
const formatRole = (role) => {
  if (!role) return "";
  return role
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
};


const Row = ({ cols = 2, mb = 2, children }) => (
  <Box
    sx={{
      display: "grid",
      gridTemplateColumns: { xs: "1fr", sm: cols > 2 ? "repeat(2, 1fr)" : "1fr", md: `repeat(${cols}, minmax(0, 1fr))` },
      gap: { xs: 1.5, sm: 2 },
      mb,
    }}
  >
    {children}
  </Box>
);

const Profile = () => {
  const {
    profile, loading, saving,
    updateProfile, uploadAvatar, changePassword, changeFirstLoginPassword,
    refetch: refetchProfile,   // pull refetch if the hook exposes it; undefined otherwise
  } = useEmployerProfile();

  const [editingPersonal, setEditingPersonal] = useState(false);
  const [editingContact, setEditingContact] = useState(false);

  const [personalForm, setPersonalForm] = useState({});
  const [contactForm, setContactForm] = useState({});

  const [pwdModalOpen, setPwdModalOpen] = useState(false);
  const [firstLoginOpen, setFirstLoginOpen] = useState(false);

  const [toast, setToast] = useState({ open: false, severity: "success", message: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [previewOpen, setPreviewOpen] = useState(false);
  const [removePhotoOpen, setRemovePhotoOpen] = useState(false);

  const fileInputRef = useRef();

  useEffect(() => {
    if (!profile) return;
    setPersonalForm({
      full_name: profile.full_name || "",
      date_of_birth: profile.date_of_birth || "",
      gender: profile.gender || "",
      languages_known: (profile.languages_known || []).join(", "),
      linkedin_url: profile.linkedin_url || "",
      years_of_experience: profile.years_of_experience ?? "",
    });
    setContactForm({
      phone: profile.phone || "",
      alternate_contact_number: profile.alternate_contact_number || "",
      country: profile.country || "",
      state: profile.state || "",
      city: profile.city || "",
      postal_code: profile.postal_code || "",
      personal_address: profile.personal_address || "",
    });
  }, [profile]);

  useEffect(() => {
    if (localStorage.getItem("must_change_password") === "true") {
      setFirstLoginOpen(true);
    }
  }, []);

  // Sync profile image to localStorage + notify Topbar whenever profile loads or refreshes
  useEffect(() => {
  if (profile?.profile_image_url) {
    localStorage.setItem("user_profile_image_url", profile.profile_image_url);
    localStorage.setItem("user_profile_image_url_ts", String(Date.now())); // ← ADD
    window.dispatchEvent(
      new CustomEvent("profile-image-updated", {
        detail: { url: profile.profile_image_url },
      })
    );
  }
}, [profile?.profile_image_url]);

  const showToast = (severity, message) =>
    setToast({ open: true, severity, message });

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await uploadAvatar(file);
    if (result.success) {
      showToast("success", "Profile picture updated");
      // The useEffect on profile.profile_image_url handles Topbar sync automatically
    } else {
      showToast("error", result.error);
    }
  };

  // BUILD: 2026-08-05-remove-photo-fix
  const handleRemovePhoto = async () => {
    setRemovePhotoOpen(false);
    try {
      await profileService.removeAvatar();
      localStorage.removeItem("user_profile_image_url");
      localStorage.removeItem("user_profile_image_url_ts");
      window.dispatchEvent(new CustomEvent("profile-image-updated", { detail: {} }));
      showToast("success", "Profile photo removed");
  
      if (typeof refetchProfile === "function") {
        await refetchProfile();
      } else {
        // Fallback: reload so avatar + completion % re-render correctly
        window.location.reload();
      }
    } catch {
      showToast("error", "Failed to remove photo");
    }
  };

  const handlePersonalSave = async () => {
    const errors = {};
    const dobErr = validateDOB(personalForm.date_of_birth);
    if (dobErr) errors.date_of_birth = dobErr;
    const yrsErr = validateYears(personalForm.years_of_experience, personalForm.date_of_birth);
    if (yrsErr) errors.years_of_experience = yrsErr;
    const linkErr = validateLinkedIn(personalForm.linkedin_url);
    if (linkErr) errors.linkedin_url = linkErr;
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      showToast("error", Object.values(errors)[0]);
      return;
    }
    setFieldErrors({});

    const payload = {
      ...personalForm,
      languages_known: personalForm.languages_known
        ? personalForm.languages_known.split(",").map((l) => l.trim()).filter(Boolean)
        : [],
      years_of_experience:
        personalForm.years_of_experience !== ""
          ? Number(personalForm.years_of_experience)
          : null,
    };
    const result = await updateProfile(payload);
    if (result.success) {
      setEditingPersonal(false);
      // Topbar listens for this and syncs user.full_name in AuthContext
      window.dispatchEvent(
        new CustomEvent("profile-updated", {
          detail: { full_name: payload.full_name },
        })
      );
      showToast("success", "Personal info updated");
    } else showToast("error", result.error);
  };

  const handleContactSave = async () => {
    // BUILD: 2026-08-05-profile-validation
    const errors = {};
    const phoneErr = validatePhone(contactForm.phone, "Phone number");
    if (contactForm.phone && phoneErr) errors.phone = phoneErr;
    const altErr = validatePhone(contactForm.alternate_contact_number, "Alternate contact");
    if (contactForm.alternate_contact_number && altErr) errors.alternate_contact_number = altErr;
    if (contactForm.phone && contactForm.alternate_contact_number &&
        contactForm.phone.replace(/\D/g, "") === contactForm.alternate_contact_number.replace(/\D/g, "")) {
      errors.alternate_contact_number = "Alternate contact must differ from primary";
    }
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      showToast("error", Object.values(errors)[0]);
      return;
    }
    setFieldErrors({});

    const result = await updateProfile(contactForm);
    if (result.success) {
      setEditingContact(false);
      showToast("success", "Contact info updated");
    } else showToast("error", result.error);
  };

  if (loading) {
    return (
      <Box className="page-fade-in" sx={{ display: "flex", justifyContent: "center", p: 8, bgcolor: B.bg, minHeight: "100vh" }}>
        <CircularProgress sx={{ color: B.sage }} />
      </Box>
    );
  }

  if (!profile) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error" sx={{ bgcolor: B.dangerSoft, color: B.danger, borderRadius: "10px", "& .MuiAlert-icon": { color: B.danger } }}>Profile could not be loaded</Alert>
      </Box>
    );
  }

  // SectionHeader using raw flexbox via Box — guaranteed layout
  const SectionHeader = ({ icon, title, editing, onEdit, onCancel, onSave, locked }) => (
    <Box
      sx={{
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        width: "100%",
        mb: 3,
        gap: 2,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
        {icon}
        <Typography noWrap sx={{ fontSize: "1.05rem", fontWeight: 700, color: B.ink }}>{title}</Typography>
      </Box>
      <Box sx={{ flexShrink: 0 }}>
        {locked ? (
          <Tooltip title="These fields are managed by your Company Admin">
            <Chip icon={<Lock fontSize="small" />} label="Admin-managed" size="small" sx={{ bgcolor: B.bg, color: B.faint, fontWeight: 600, fontSize: "0.72rem", border: `1px solid ${B.border}`, borderRadius: "7px" }} />
          </Tooltip>
        ) : !editing ? (
          <Button startIcon={<Edit />} size="small" onClick={onEdit}
            sx={{ textTransform: "none", fontWeight: 700, color: B.sageText, borderRadius: "10px",
              border: `1px solid ${B.border}`, "&:hover": { bgcolor: B.sageSoft, borderColor: B.sage } }}>
            Edit
          </Button>
        ) : (
          <Stack direction="row" spacing={1}>
            <Button startIcon={<Cancel />} size="small" onClick={onCancel}
              sx={{ textTransform: "none", fontWeight: 700, color: B.muted, borderRadius: "10px" }}>
              Cancel
            </Button>
            <Button
              startIcon={saving ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : <Save />}
              variant="contained"
              size="small"
              onClick={onSave}
              disabled={saving}
              disableElevation
              sx={{ textTransform: "none", fontWeight: 700, borderRadius: "10px", bgcolor: B.pine, "&:hover": { bgcolor: B.pineHover } }}
            >
              Save
            </Button>
          </Stack>
        )}
      </Box>
    </Box>
  );

  const lockedSlotProps = {
    input: {
      endAdornment: (
        <InputAdornment position="end">
          <Lock fontSize="small" sx={{ color: B.faint }} />
        </InputAdornment>
      ),
    },
  };

  return (
    <Box className="page-fade-in" sx={{ p: { xs: 1.5, sm: 2, md: 3, lg: 4 }, maxWidth: 1200, mx: "auto", bgcolor: B.bg, minHeight: "100vh", fontFamily: FONT,
      '& .MuiTypography-root, & .MuiButton-root, & .MuiChip-root, & .MuiInputBase-root, & .MuiMenuItem-root': { fontFamily: FONT },
      '& .MuiOutlinedInput-root': { borderRadius: '12px', '& fieldset': { borderColor: B.border }, '&:hover fieldset': { borderColor: B.borderS }, '&.Mui-focused fieldset': { borderColor: B.sage, borderWidth: '2px' }, '&.Mui-disabled': { bgcolor: B.bg, '& fieldset': { borderColor: B.border } } },
      '& .MuiInputLabel-root': { fontFamily: FONT, color: B.faint, '&.Mui-focused': { color: B.sageText } },
      '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: B.body } }}>
      {/* HEADER */}
      <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5, md: 3 }, mb: { xs: 2, md: 2.5 }, border: `1px solid ${B.border}`, borderRadius: { xs: "14px", sm: "16px" }, boxShadow: "0 1px 2px rgba(16,18,16,0.04)", bgcolor: B.surface }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={3} alignItems="center">
          {/* BUILD: 2026-08-05-completion-ring */}
          {(() => {
            const sections = calcSectionCompletion(profile);
            const overallPct = sections.reduce((s, sec) => s + sec.earned, 0);
            const ringColor = overallPct === 100 ? B.done : B.sage;
            return (
              <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                <Box sx={{ position: "relative", width: 120, height: 120, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {/* Background track */}
                  <CircularProgress
                    variant="determinate"
                    value={100}
                    size={120}
                    thickness={3}
                    sx={{ position: "absolute", top: 0, left: 0, color: B.border }}
                  />
                  {/* Completion ring */}
                  <CircularProgress
                    variant="determinate"
                    value={overallPct}
                    size={120}
                    thickness={3}
                    sx={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      color: ringColor,
                      "& .MuiCircularProgress-circle": { strokeLinecap: "round" },
                    }}
                  />
                  <Avatar
                    src={profile.profile_image_url}
                    sx={{
                      width: 100,
                      height: 100,
                      fontSize: 36,
                      cursor: profile.profile_image_url ? "pointer" : "default",
                    }}
                    onClick={() => { if (profile.profile_image_url) setPreviewOpen(true); }}
                  >
                    {profile.full_name?.[0]?.toUpperCase()}
                  </Avatar>
                  <IconButton
                    size="small"
                    sx={{
                      position: "absolute",
                      bottom: 2,
                      right: 2,
                      bgcolor: B.pine,
                      color: "#fff",
                      "&:hover": { bgcolor: B.pineHover },
                    }}
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    disabled={saving}
                  >
                    <CameraAlt fontSize="small" />
                  </IconButton>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={handleAvatarChange}
                  />
                </Box>
                <Typography sx={{ fontSize: "0.78rem", fontWeight: 800, color: ringColor, mt: 0.25 }}>
                  {overallPct}% complete
                </Typography>
                {profile.profile_image_url && (
                  <Button size="small" onClick={() => setRemovePhotoOpen(true)} disabled={saving}
                    sx={{ textTransform: "none", fontSize: "0.68rem", fontWeight: 600, color: B.danger, minWidth: 0, px: 1, borderRadius: "7px", "&:hover": { bgcolor: B.dangerSoft } }}>
                    Remove photo
                  </Button>
                )}
              </Box>
            );
          })()}

          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: { xs: "1.3rem", md: "1.5rem" }, fontWeight: 800, color: B.ink, letterSpacing: "-0.02em" }}>
              {profile.full_name}
            </Typography>
            <Typography sx={{ fontSize: "0.88rem", color: B.muted, fontWeight: 500, mt: 0.3 }}>
  {profile.designation
    || profile.role_other
    || formatRole(profile.role)
    || "—"}
</Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.5 }}>
              <Chip
                label={profile.is_activated ? "Active" : "Inactive"}
                sx={{ bgcolor: profile.is_activated ? B.doneSoft : B.bg, color: profile.is_activated ? B.done : B.faint, fontWeight: 700, fontSize: "0.72rem", borderRadius: "7px" }}
                size="small"
              />
              <Chip
                label={`ID: ${profile.employer_code || "—"}`}
                size="small"
                sx={{ bgcolor: B.bg, color: B.muted, fontWeight: 600, fontSize: "0.72rem", borderRadius: "7px", border: `1px solid ${B.border}` }}
              />
              {profile.company_name && (
                <Tooltip title="Your company (managed by Company Admin)">
                  <Chip
                    icon={<Work fontSize="small" />}
                    label={profile.company_name}
                    size="small"
                    sx={{ bgcolor: B.sageSoft, color: B.sageText, fontWeight: 700, fontSize: "0.72rem", borderRadius: "7px", border: `1px solid ${B.sage}40` }}
                  />
                </Tooltip>
              )}
            </Stack>

            <Box sx={{ mt: 2, display: "flex", flexWrap: "wrap", gap: 0.5 }}>
              {calcSectionCompletion(profile).map((sec) => (
                <Chip
                  key={sec.label}
                  label={`${sec.label} — ${sec.complete ? `${sec.weight}%` : `${sec.filled}/${sec.total} fields`}`}
                  size="small"
                  sx={{
                    fontSize: "0.65rem", fontWeight: 700, height: 24, borderRadius: "7px",
                    bgcolor: sec.complete ? B.doneSoft : B.dangerSoft,
                    color: sec.complete ? B.done : B.danger,
                    border: `1px solid ${sec.complete ? B.done : B.danger}25`,
                  }}
                />
              ))}
            </Box>
          </Box>
        </Stack>
      </Paper>

      {/* SECTION 1: PERSONAL INFO */}
      <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5, md: 3 }, mb: { xs: 2, md: 2.5 }, border: `1px solid ${B.border}`, borderRadius: { xs: "14px", sm: "16px" }, boxShadow: "0 1px 2px rgba(16,18,16,0.04)", bgcolor: B.surface }}>
        <SectionHeader
          icon={<Person sx={{ color: B.sageText }} />}
          title="Personal Information"
          editing={editingPersonal}
          onEdit={() => setEditingPersonal(true)}
          onCancel={() => setEditingPersonal(false)}
          onSave={handlePersonalSave}
        />
        <Row cols={2} mb={0}>
          <TextField
            fullWidth
            label="Full Name"
            value={editingPersonal ? personalForm.full_name : profile.full_name || ""}
            onChange={(e) => setPersonalForm({ ...personalForm, full_name: e.target.value })}
            disabled={!editingPersonal}
          />
          <TextField
            fullWidth
            label="LinkedIn URL"
            placeholder="https://linkedin.com/in/..."
            value={editingPersonal ? personalForm.linkedin_url : profile.linkedin_url || ""}
            onChange={(e) => {
              setPersonalForm({ ...personalForm, linkedin_url: e.target.value });
              const err = validateLinkedIn(e.target.value);
              setFieldErrors((prev) => ({ ...prev, linkedin_url: err || undefined }));
            }}
            disabled={!editingPersonal}
            error={Boolean(fieldErrors.linkedin_url)}
            helperText={fieldErrors.linkedin_url || ""}
          />
          <Box>
            <Typography
              variant="caption"
              sx={{ display: "block", mb: 0.5, ml: 1.5, fontSize: "0.75rem", color: fieldErrors.date_of_birth ? B.danger : B.faint }}
            >
              Date of Birth
            </Typography>
            <TextField
              fullWidth
              type="date"
              value={editingPersonal ? personalForm.date_of_birth : profile.date_of_birth || ""}
              onChange={(e) => {
                const newDob = e.target.value;
                setPersonalForm({ ...personalForm, date_of_birth: newDob });
                const dobErr = validateDOB(newDob);
                const yrsErr = personalForm.years_of_experience !== "" ? validateYears(personalForm.years_of_experience, newDob) : undefined;
                setFieldErrors((prev) => ({ ...prev, date_of_birth: dobErr || undefined, years_of_experience: yrsErr || undefined }));
              }}
              disabled={!editingPersonal}
              error={Boolean(fieldErrors.date_of_birth)}
              helperText={fieldErrors.date_of_birth || ""}
              inputProps={{ max: new Date().toISOString().split("T")[0] }}
            />
          </Box>
          <TextField
            fullWidth
            select
            label="Gender"
            value={editingPersonal ? personalForm.gender : profile.gender || ""}
            onChange={(e) => setPersonalForm({ ...personalForm, gender: e.target.value })}
            disabled={!editingPersonal}
          >
            <MenuItem value="">— Select —</MenuItem>
            {GENDER_OPTIONS.map((g) => (
              <MenuItem key={g} value={g}>
                {g}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth
            label="Years of Experience"
            placeholder="e.g. 4"
            value={
              editingPersonal
                ? personalForm.years_of_experience
                : profile.years_of_experience ?? ""
            }
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 2);
              setPersonalForm({ ...personalForm, years_of_experience: v });
              const err = validateYears(v, personalForm.date_of_birth);
              setFieldErrors((prev) => ({ ...prev, years_of_experience: err || undefined }));
            }}
            disabled={!editingPersonal}
            error={Boolean(fieldErrors.years_of_experience)}
            helperText={fieldErrors.years_of_experience || ""}
            slotProps={{
              htmlInput: { inputMode: "numeric", pattern: "[0-9]*", maxLength: 2 },
            }}
          />
          <TextField
            fullWidth
            label="Languages (comma-separated)"
            placeholder="English, Hindi, Telugu"
            value={
              editingPersonal
                ? personalForm.languages_known
                : (profile.languages_known || []).join(", ")
            }
            onChange={(e) =>
              setPersonalForm({ ...personalForm, languages_known: e.target.value })
            }
            disabled={!editingPersonal}
          />
        </Row>
      </Paper>

      {/* SECTION 2: WORK INFO (locked) */}
      <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5, md: 3 }, mb: { xs: 2, md: 2.5 }, border: `1px solid ${B.border}`, borderRadius: { xs: "14px", sm: "16px" }, boxShadow: "0 1px 2px rgba(16,18,16,0.04)", bgcolor: B.surface }}>
        <SectionHeader icon={<Work sx={{ color: B.sageText }} />} title="Work Information" locked />
        <Row cols={3} mb={0}>
          {[
            ["Employer ID", profile.employer_code],
            [
              "Department",
              profile.department === "Other" ? profile.department_other : profile.department,
            ],
            ["Role", profile.role_other || profile.role],
            ["Office Location", profile.address],
            [
              "Date of Joining",
              profile.date_of_joining
                ? new Date(profile.date_of_joining).toLocaleDateString()
                : "—",
            ],
          ].map(([label, value]) => (
            <TextField
              key={label}
              fullWidth
              label={label}
              value={value || "—"}
              disabled
              slotProps={lockedSlotProps}
            />
          ))}
        </Row>
      </Paper>

      {/* SECTION 3: CONTACT INFO */}
      <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5, md: 3 }, mb: { xs: 2, md: 2.5 }, border: `1px solid ${B.border}`, borderRadius: { xs: "14px", sm: "16px" }, boxShadow: "0 1px 2px rgba(16,18,16,0.04)", bgcolor: B.surface }}>
        <SectionHeader
          icon={<ContactEmergency sx={{ color: B.sageText }} />}
          title="Contact Information"
          editing={editingContact}
          onEdit={() => setEditingContact(true)}
          onCancel={() => setEditingContact(false)}
          onSave={handleContactSave}
        />
        <Row cols={2}>
          <TextField
            fullWidth
            label="Email"
            disabled
            value={profile.email || ""}
            slotProps={lockedSlotProps}
          />
          <TextField
            fullWidth
            label="Phone Number"
            value={editingContact ? contactForm.phone : profile.phone || ""}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 10);
              setContactForm({ ...contactForm, phone: v });
              const err = validatePhone(v, "Phone number");
              setFieldErrors((prev) => ({ ...prev, phone: v ? (err || undefined) : undefined }));
            }}
            disabled={!editingContact}
            error={Boolean(fieldErrors.phone)}
            helperText={fieldErrors.phone || ""}
            slotProps={{
              htmlInput: { maxLength: 10, inputMode: "numeric", pattern: "[0-9]*" },
            }}
          />
          <TextField
            fullWidth
            label="Alternate Contact"
            value={
              editingContact
                ? contactForm.alternate_contact_number
                : profile.alternate_contact_number || ""
            }
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 10);
              setContactForm({ ...contactForm, alternate_contact_number: v });
              const err = validatePhone(v, "Alternate contact");
              setFieldErrors((prev) => ({ ...prev, alternate_contact_number: v ? (err || undefined) : undefined }));
            }}
            disabled={!editingContact}
            error={Boolean(fieldErrors.alternate_contact_number)}
            helperText={fieldErrors.alternate_contact_number || ""}
            slotProps={{
              htmlInput: { maxLength: 10, inputMode: "numeric", pattern: "[0-9]*" },
            }}
          />
        </Row>
        <Row cols={4}>
          <TextField
            fullWidth
            label="Country"
            value={editingContact ? contactForm.country : profile.country || ""}
            onChange={(e) => setContactForm({ ...contactForm, country: e.target.value })}
            disabled={!editingContact}
          />
          <TextField
            fullWidth
            label="State"
            value={editingContact ? contactForm.state : profile.state || ""}
            onChange={(e) => setContactForm({ ...contactForm, state: e.target.value })}
            disabled={!editingContact}
          />
          <TextField
            fullWidth
            label="City"
            value={editingContact ? contactForm.city : profile.city || ""}
            onChange={(e) => setContactForm({ ...contactForm, city: e.target.value })}
            disabled={!editingContact}
          />
          <TextField
            fullWidth
            label="Postal Code"
            value={editingContact ? contactForm.postal_code : profile.postal_code || ""}
            onChange={async (e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 6);
              setContactForm((prev) => ({ ...prev, postal_code: v }));
              setFieldErrors((prev) => ({ ...prev, postal_code: undefined }));
              if (v.length === 6) {
                const details = await fetchPincodeDetails(v);
                if (details) {
                  setContactForm((prev) => ({
                    ...prev,
                    city: details.city,
                    state: details.state,
                    country: details.country,
                  }));
                } else {
                  setFieldErrors((prev) => ({ ...prev, postal_code: "Pincode not found" }));
                }
              }
            }}
            disabled={!editingContact}
            error={Boolean(fieldErrors.postal_code)}
            helperText={fieldErrors.postal_code || ""}
            slotProps={{
              htmlInput: { inputMode: "numeric", maxLength: 6 },
            }}
          />
        </Row>
        <Box>
          <TextField
            fullWidth
            multiline
            rows={2}
            label="Personal Address"
            placeholder="Your home / permanent address"
            value={
              editingContact ? contactForm.personal_address : profile.personal_address || ""
            }
            onChange={(e) =>
              setContactForm({ ...contactForm, personal_address: e.target.value })
            }
            disabled={!editingContact}
          />
        </Box>
      </Paper>

      {/* SECTION 4: ACCOUNT SETTINGS */}
      <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5, md: 3 }, mb: { xs: 2, md: 2.5 }, border: `1px solid ${B.border}`, borderRadius: { xs: "14px", sm: "16px" }, boxShadow: "0 1px 2px rgba(16,18,16,0.04)", bgcolor: B.surface }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <Settings sx={{ color: B.sageText }} />
          <Typography sx={{ fontSize: "1.05rem", fontWeight: 700, color: B.ink }}>Account Settings</Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Lock />}
          onClick={() => setPwdModalOpen(true)}
          sx={{ textTransform: "none", fontWeight: 700, color: B.pine, borderColor: B.border, borderRadius: "10px",
            "&:hover": { bgcolor: B.sageSoft, borderColor: B.sage } }}
        >
          Change Password
        </Button>
      </Paper>

      <ChangePasswordDialog
        open={pwdModalOpen}
        onClose={() => setPwdModalOpen(false)}
        onSubmit={async (data) => {
          const result = await changePassword(data);
          if (result.success) {
            setPwdModalOpen(false);
            showToast("success", "Password changed successfully");
          } else showToast("error", result.error);
        }}
        saving={saving}
      />

      <FirstLoginDialog
        open={firstLoginOpen}
        onSubmit={async (newPassword) => {
          const result = await changeFirstLoginPassword(newPassword);
          if (result.success) {
            setFirstLoginOpen(false);
            localStorage.removeItem("must_change_password");
            showToast("success", "Password set. Welcome!");
          } else showToast("error", result.error);
        }}
        saving={saving}
      />

      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity={toast.severity} onClose={() => setToast({ ...toast, open: false })} sx={{ fontFamily: FONT, borderRadius: "10px", ...(toast.severity === "success" ? { bgcolor: B.doneSoft, color: B.done, "& .MuiAlert-icon": { color: B.done } } : toast.severity === "error" ? { bgcolor: B.dangerSoft, color: B.danger, "& .MuiAlert-icon": { color: B.danger } } : {}) }}>
          {toast.message}
        </Alert>
      </Snackbar>

      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="sm"
        slotProps={{ paper: { sx: { borderRadius: "16px", overflow: "hidden", bgcolor: "#000" } } }}>
        <Box sx={{ position: "relative" }}>
          <IconButton onClick={() => setPreviewOpen(false)}
            sx={{ position: "absolute", top: 8, right: 8, color: "#fff", bgcolor: "rgba(0,0,0,0.5)", "&:hover": { bgcolor: "rgba(0,0,0,0.7)" } }}>
            <Cancel fontSize="small" />
          </IconButton>
          <Box component="img" src={profile?.profile_image_url} alt="Profile"
            sx={{ display: "block", maxWidth: "100%", maxHeight: "80vh", objectFit: "contain", mx: "auto" }} />
        </Box>
      </Dialog>

      <Dialog open={removePhotoOpen} onClose={() => setRemovePhotoOpen(false)} maxWidth="xs" fullWidth
        slotProps={{ paper: { sx: { borderRadius: "16px", p: 0.5 } } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: "1rem", color: B.ink, pb: 1 }}>
          Remove profile photo?
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: "0.85rem", color: B.muted, lineHeight: 1.5 }}>
            Your photo will be removed and replaced with your initials. You can upload a new one anytime.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setRemovePhotoOpen(false)}
            sx={{ textTransform: "none", fontWeight: 600, color: B.muted, borderRadius: "8px" }}>
            Cancel
          </Button>
          <Button onClick={handleRemovePhoto} variant="contained" disableElevation disabled={saving}
            sx={{ textTransform: "none", fontWeight: 700, bgcolor: B.danger, borderRadius: "8px", "&:hover": { bgcolor: "#8B3327" } }}>
            {saving ? "Removing…" : "Yes, Remove"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

const ChangePasswordDialog = ({ open, onClose, onSubmit, saving }) => {
  const [form, setForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [showPwd, setShowPwd] = useState({ current: false, new: false, confirm: false });
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (!open) {
      setForm({ current_password: "", new_password: "", confirm_password: "" });
      setLocalError("");
    }
  }, [open]);

  const handleSubmit = async () => {
    setLocalError("");
    if (!form.current_password) {
      setLocalError("Current password is required");
      return;
    }
    if (!form.new_password) {
      setLocalError("New password is required");
      return;
    }
    if (form.new_password.length < 8) {
      setLocalError("Password must be at least 8 characters");
      return;
    }
    if (form.current_password === form.new_password) {
      setLocalError("New password must be different from current password");
      return;
    }
    if (form.new_password !== form.confirm_password) {
      setLocalError("Passwords do not match");
      return;
    }
    await onSubmit({
      current_password: form.current_password,
      new_password: form.new_password,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: "16px", overflow: "hidden" } }}>
      <Box sx={{ background: `linear-gradient(135deg, ${B.pine} 0%, #0A3F42 100%)`, px: 3, py: 2 }}><Typography sx={{ color: "#fff", fontWeight: 800, fontSize: "1rem", fontFamily: FONT }}>Change Password</Typography></Box>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {localError && <Alert severity="error" sx={{ bgcolor: B.dangerSoft, color: B.danger, borderRadius: "10px", "& .MuiAlert-icon": { color: B.danger }, fontFamily: FONT }}>{localError}</Alert>}
          {[
            ["current_password", "Current Password", "current"],
            ["new_password", "New Password", "new"],
            ["confirm_password", "Confirm New Password", "confirm"],
          ].map(([field, label, key]) => (
            <TextField
              key={field}
              fullWidth
              label={label}
              type={showPwd[key] ? "text" : "password"}
              value={form[field]}
              onChange={(e) => setForm({ ...form, [field]: e.target.value })}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={() => setShowPwd({ ...showPwd, [key]: !showPwd[key] })}
                        onMouseDown={(e) => e.preventDefault()}
                        tabIndex={-1}
                        edge="end"
                      >
                        {showPwd[key] ? <VisibilityOff fontSize="small" sx={{ color: B.faint }} /> : <Visibility fontSize="small" sx={{ color: B.faint }} />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
          ))}
          <Typography variant="caption" sx={ { color: B.faint, fontSize: "0.72rem" } }>
            Min 8 characters with uppercase, lowercase, number, and special character.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: "none", color: B.muted, fontFamily: FONT }}>Cancel</Button>
        <Button variant="contained" disableElevation onClick={handleSubmit} disabled={saving} sx={{ bgcolor: B.pine, "&:hover": { bgcolor: B.pineHover }, textTransform: "none", fontWeight: 700, borderRadius: "10px", px: 2.5, fontFamily: FONT }}>
          {saving ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "Change Password"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const FirstLoginDialog = ({ open, onSubmit, saving }) => {
  const [form, setForm] = useState({ new_password: "", confirm_password: "" });
  const [showPwd, setShowPwd] = useState({ new: false, confirm: false });
  const [localError, setLocalError] = useState("");

  const handleSubmit = async () => {
    setLocalError("");
    if (form.new_password !== form.confirm_password) {
      setLocalError("Passwords do not match");
      return;
    }
    if (form.new_password.length < 8) {
      setLocalError("Password must be at least 8 characters");
      return;
    }
    await onSubmit(form.new_password);
  };

  return (
    <Dialog
      open={open}
      disableEscapeKeyDown
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: "16px", overflow: "hidden" } }}
      onClose={(_, reason) => {
        if (reason === "backdropClick") return;
      }}
    >
      <Box sx={{ background: `linear-gradient(135deg, ${B.pine} 0%, #0A3F42 100%)`, px: 3, py: 2 }}><Typography sx={{ color: "#fff", fontWeight: 800, fontSize: "1rem", fontFamily: FONT }}>Set Your Password</Typography></Box>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Alert severity="info" sx={{ bgcolor: B.sageSoft, color: B.sageText, borderRadius: "10px", "& .MuiAlert-icon": { color: B.sage }, fontFamily: FONT }}>
            Welcome! For security, please change the temporary password your admin sent you.
          </Alert>
          {localError && <Alert severity="error" sx={{ bgcolor: B.dangerSoft, color: B.danger, borderRadius: "10px", "& .MuiAlert-icon": { color: B.danger }, fontFamily: FONT }}>{localError}</Alert>}
          {[
            ["new_password", "New Password", "new"],
            ["confirm_password", "Confirm Password", "confirm"],
          ].map(([field, label, key]) => (
            <TextField
              key={field}
              fullWidth
              label={label}
              type={showPwd[key] ? "text" : "password"}
              value={form[field]}
              onChange={(e) => setForm({ ...form, [field]: e.target.value })}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        edge="end"
                        onClick={() => setShowPwd({ ...showPwd, [key]: !showPwd[key] })}
                      >
                        {showPwd[key] ? <VisibilityOff sx={{ color: B.faint }} /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
          ))}
          <Typography variant="caption" sx={ { color: B.faint, fontSize: "0.72rem" } }>
            Min 8 characters with uppercase, lowercase, number, and special character.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="contained" fullWidth disableElevation onClick={handleSubmit} disabled={saving} sx={{ bgcolor: B.pine, "&:hover": { bgcolor: B.pineHover }, textTransform: "none", fontWeight: 700, borderRadius: "10px", fontFamily: FONT }}>
          {saving ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "Set Password & Continue"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default Profile;