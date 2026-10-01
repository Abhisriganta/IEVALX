import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSnackbar } from "notistack";
import {
  Box,
  Button,
  Typography,
  Divider,
  Stack,
  Menu,
  MenuItem,
  CircularProgress,
} from "@mui/material";
import {
  FileText,
  Sparkles,
  Trash2,
  Edit2,
  Plus,
  RotateCcw,
  Eye,
  ChevronDown,
  X,
  ArrowLeft,
  Lock,
  Check,
} from "lucide-react";
import { ThemeProvider } from "@mui/material/styles";

import {
  resumeAiTheme,
  GLOBAL_CSS,
  STEP_LABELS,
} from "@/constants/resumeAiConstants";
import resumeAiService, {
  segmentsToFields,
  getCandidateId,
} from "@/services/api/jobseeker/resumeAiService";
import useSparkle from "@/hooks/jobseeker/useSparkle";

import {
  Ico,
  Toast,
  RippleBtn,
  TBtn,
  DownloadDropdown,
  SpinnerEl,
  PillEl,
} from "./atoms";
import {
  LandingNav,
  NightScene,
  HeroStep,
  FeaturesSection,
  ChoiceStep,
  ProcessingStep,
  SuccessStep,
} from "./LandingSteps";
import SectionPage from "./SectionPage";
import JDManagerPanel from "./JDManagerPanel";
import AIChatPanel from "./AIChatPanel";
import MatchPanel from "./MatchPanel";
import PDFViewer from "./PDFViewer";
import PageWriterDialog from "./PageWriterDialog";

/* ── Extracted helpers & style constants ────────────────────────────── */

const dk = (isDark, darkVal, lightVal) => (isDark ? darkVal : lightVal);

const SEG_DEFAULT = {
  bold: false, italic: false, underline: false,
  strike: false, color: "", fontFamily: "", fontSize: "",
};

const mkSeg = (text, overrides = {}) => ({ ...SEG_DEFAULT, text, ...overrides });
const BLANK_SEG = [mkSeg(" ")];

const ShareIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
);

const CompareIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="6" height="18" rx="1" />
    <rect x="9" y="3" width="6" height="18" rx="1" />
    <rect x="16" y="3" width="6" height="18" rx="1" />
  </svg>
);

const PageSvgIcon = () => (
  <svg width="11" height="13" viewBox="0 0 11 13" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="0.5" y="0.5" width="10" height="12" rx="1.5" stroke="rgba(255,255,255,0.45)" strokeWidth="1" />
    {[3.5, 5.5].map(y => (
      <line key={y} x1="2.5" y1={y} x2="8.5" y2={y} stroke="rgba(255,255,255,0.45)" strokeWidth="1" strokeLinecap="round" />
    ))}
    <line x1="2.5" y1="7.5" x2="6" y2="7.5" stroke="rgba(255,255,255,0.45)" strokeWidth="1" strokeLinecap="round" />
  </svg>
);

const EditPenSvg = ({ color }) => (
  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
    <path d="M8.5 1.5a1.5 1.5 0 0 1 2.12 2.12L4 10.25l-2.75.5.5-2.75L8.5 1.5Z"
      stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Shared topbar style factory
const topbarSx = (isDark) => ({
  height: 54, px: 2, display: "flex", alignItems: "center",
  bgcolor: dk(isDark, "rgba(3,32,28,.98)", "#fff"),
  borderBottom: dk(isDark, "1px solid rgba(60,96,88,.12)", "1px solid #E7EAE3"),
  flexShrink: 0, backdropFilter: "blur(14px)", transition: "background .4s",
  boxShadow: dk(isDark, "0 2px 20px rgba(0,0,0,.35)", "0 1px 6px rgba(0,0,0,.06)"),
});

// Pill-group button factory for page actions
const PillBtn = ({ onClick, icon, label, color, isDark, borderRight = true, bold = false }) => (
  <Box component="button" onClick={onClick} sx={{
    px: 1.75, display: "flex", alignItems: "center", gap: 0.75,
    border: "none", bgcolor: "transparent", cursor: "pointer",
    fontSize: 12, fontWeight: bold ? 700 : 600, color,
    fontFamily: "'Jost',sans-serif", whiteSpace: "nowrap",
    transition: "background .12s",
    ...(borderRight ? { borderRight: "1.5px solid #E7EFEC" } : {}),
    "&:hover": {
      bgcolor: dk(isDark, "rgba(3,32,28,1)", "#fff"),
      boxShadow: dk(isDark, "0 4px 16px rgba(0,0,0,.4)", `0 2px 8px ${color}15`),
    },
  }}>
    {icon} {label}
  </Box>
);

// Confirm strip component
const ConfirmStrip = ({ label, onCancel, onConfirm, confirmLabel, isDanger }) => (
  <Box sx={{
    display: "flex", alignItems: "center", gap: 0.75,
    pl: 1.5, pr: 0.75, py: 0.375, borderRadius: 99,
    bgcolor: isDanger ? "#fff1f1" : "#fff5f5",
    border: `1.5px solid ${isDanger ? "#fca5a5" : "#fecaca"}`,
    animation: "fadeIn .15s ease",
  }}>
    <Trash2 size={12} color={isDanger ? "#dc2626" : "#ef4444"} />
    <Typography sx={{ fontSize: 12, fontWeight: isDanger ? 700 : 600, color: isDanger ? "#dc2626" : "#ef4444", whiteSpace: "nowrap" }}>
      {label}
    </Typography>
    <Button size="small" onClick={onCancel} sx={{
      minWidth: 0, px: 1.25, py: 0.25, fontSize: 11, fontWeight: 500,
      color: "#7A8073", textTransform: "none", borderRadius: 99,
    }}>Cancel</Button>
    <Button size="small" onClick={onConfirm} sx={{
      minWidth: 0, px: 1.5, py: 0.375, fontSize: 11, fontWeight: 700,
      color: "#fff", textTransform: "none", borderRadius: 99,
      bgcolor: isDanger ? "#dc2626" : "#ef4444",
      "&:hover": { bgcolor: isDanger ? "#b91c1c" : "#dc2626" },
    }}>{confirmLabel}</Button>
  </Box>
);

function _parseMarkdownLine(line) {
  const trimmed = line.trim();
  const headings = [
    { re: /^# (.+)/, size: "20pt" },
    { re: /^## (.+)/, size: "16pt" },
    { re: /^### (.+)/, size: "13pt" },
  ];
  for (const h of headings) {
    const m = trimmed.match(h.re);
    if (m) return [mkSeg(m[1].trim(), { bold: true, fontSize: h.size })];
  }
  if (/^[-=]{3,}$/.test(trimmed)) return [mkSeg(" ")];

  let processedLine = trimmed;
  if (/^[*-] .+/.test(trimmed)) processedLine = "\u2022 " + trimmed.slice(2);

  const segments = [];
  const re = /\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let last = 0, m;
  while ((m = re.exec(processedLine)) !== null) {
    if (m.index > last) segments.push(mkSeg(processedLine.slice(last, m.index)));
    segments.push(m[1] !== undefined
      ? mkSeg(m[1], { bold: true })
      : mkSeg(m[2], { italic: true })
    );
    last = m.index + m[0].length;
  }
  if (last < processedLine.length) segments.push(mkSeg(processedLine.slice(last)));
  return segments.length > 0 ? segments : [mkSeg(processedLine)];
}

/* ══════════════════════════════════════════════════════════════════════
  SHARE MODAL
══════════════════════════════════════════════════════════════════════ */
function ShareModal({ shareLink, onClose, isDark, showToast }) {
  const [copied, setCopied] = React.useState(false);
  const [showPreview, setShowPreview] = React.useState(false);
  React.useEffect(() => { if (shareLink) { setCopied(false); setShowPreview(false); } }, [shareLink]);
  if (!shareLink) return null;

  const doCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      showToast("Link copied ✓", "success");
      setTimeout(() => setCopied(false), 2500);
    } catch { showToast("Copy failed — select the link manually", "error"); }
  };

  const encoded = encodeURIComponent(shareLink);
  const msg = encodeURIComponent("Check out my resume: ");
  const platforms = [
    { name: "WhatsApp", color: "#25D366", href: `https://wa.me/?text=${msg}${encoded}`,
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M17.5 14.4c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.5 0 1.47 1.07 2.9 1.22 3.1.15.2 2.1 3.2 5.1 4.49.71.31 1.27.49 1.7.63.72.23 1.37.2 1.88.12.57-.09 1.76-.72 2.01-1.42.25-.7.25-1.29.17-1.42-.07-.12-.27-.2-.57-.35zM12.05 21.8h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.9-9.88 2.64 0 5.13 1.03 7 2.9a9.82 9.82 0 0 1 2.89 7c0 5.45-4.44 9.88-9.9 9.88z"/></svg> },
    { name: "LinkedIn", color: "#0A66C2", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`,
      icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="#fff"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.55V9h3.57v11.45z"/></svg> },
    { name: "X", color: "#101210", href: `https://twitter.com/intent/tweet?text=${msg}&url=${encoded}`,
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff"><path d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.58-6.64 7.58H.47l8.6-9.83L0 1.15h7.6l5.24 6.93 6.06-6.93zm-1.29 19.5h2.04L6.49 3.24H4.3l13.31 17.4z"/></svg> },
    { name: "Email", color: "#5E815D", href: `mailto:?subject=${encodeURIComponent("My Resume")}&body=${msg}${encoded}`,
      icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg> },
  ];

  const nativeShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: "My Resume", text: "Check out my resume", url: shareLink }); }
      catch { /* user dismissed */ }
    } else {
      doCopy();
    }
  };

  return (
    <>
      {/* Centering wrapper — flex centering instead of transform, so the
          fadeUp translateY animation can't fight the positioning */}
      <Box sx={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", p: 2 }}>
      <Box onClick={onClose} sx={{ position: "absolute", inset: 0, bgcolor: "rgba(2,33,36,.45)", backdropFilter: "blur(3px)", animation: "fadeIn .15s ease" }} />
      <Box sx={{
        position: "relative",
        width: "min(520px, 92vw)", maxHeight: "88vh", overflowY: "auto",
        bgcolor: dk(isDark, "rgba(5,40,35,.98)", "#fff"),
        border: dk(isDark, "1px solid rgba(111,160,149,.3)", "1px solid #E7EAE3"),
        borderRadius: "18px", p: 3,
        boxShadow: dk(isDark, "0 20px 60px rgba(0,0,0,.6)", "0 20px 60px rgba(2,33,36,.2)"),
        animation: "fadeUp .2s ease", fontFamily: "'Jost',sans-serif",
      }}>
        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.75 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
            <Box sx={{ width: 36, height: 36, borderRadius: "11px", background: "linear-gradient(135deg,#1D5A50,#2E6E62)", display: "flex", alignItems: "center", justifyContent: "center" }}><ShareIcon /></Box>
            <Box>
              <Typography sx={{ fontSize: 16, fontWeight: 800, color: dk(isDark, "#E7EFE6", "#101210"), letterSpacing: "-.02em", fontFamily: "'Jost',sans-serif" }}>Share your resume</Typography>
              <Typography sx={{ fontSize: 11.5, color: dk(isDark, "rgba(168,191,167,.6)", "#7A8073"), fontFamily: "'Jost',sans-serif" }}>Anyone with the link can view it as a PDF</Typography>
            </Box>
          </Box>
          <Box component="button" onClick={onClose} sx={{ width: 30, height: 30, borderRadius: "50%", border: "none", bgcolor: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: dk(isDark, "rgba(168,191,167,.5)", "#7A8073"), "&:hover": { bgcolor: dk(isDark, "rgba(255,255,255,.08)", "#F0F2ED") } }}><X size={15} /></Box>
        </Box>

        {/* Link + Copy */}
        <Box sx={{
          display: "flex", alignItems: "center", gap: 1, p: "10px 12px", borderRadius: "12px",
          bgcolor: dk(isDark, "rgba(255,255,255,.04)", "#F8FAF6"),
          border: dk(isDark, "1px solid rgba(111,160,149,.2)", "1px solid #E7EAE3"),
          mt: 2, mb: 2,
        }}>
          <Typography sx={{ fontSize: 12, fontFamily: "monospace", flex: 1, color: dk(isDark, "#6FA095", "#1D5A50"), overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{shareLink}</Typography>
          <Box component="button" onClick={doCopy} sx={{
            flexShrink: 0, display: "flex", alignItems: "center", gap: 0.6,
            px: 1.75, py: 0.8, borderRadius: "9px", border: "none",
            bgcolor: copied ? "#16a34a" : "#022124", color: "#fff",
            fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Jost',sans-serif",
            transition: "background .2s",
            "&:hover": { bgcolor: copied ? "#15803d" : "#0A3A38" },
          }}>
            {copied ? <Check size={13} strokeWidth={3} /> : null}
            {copied ? "Copied" : "Copy link"}
          </Box>
        </Box>

        {/* Platform share */}
        <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: dk(isDark, "rgba(168,191,167,.5)", "#7A8073"), letterSpacing: ".08em", textTransform: "uppercase", mb: 1, fontFamily: "'Jost',sans-serif" }}>Share to</Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 1 }}>
          {platforms.map((pf) => (
            <Box key={pf.name} component="a" href={pf.href} target="_blank" rel="noopener noreferrer"
              onClick={() => showToast(`Opening ${pf.name}…`, "info")}
              sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.6, py: 1.1, borderRadius: "12px", textDecoration: "none", border: dk(isDark, "1px solid rgba(159,184,158,.15)", "1px solid #EFF2EC"), transition: "all .15s", "&:hover": { bgcolor: dk(isDark, "rgba(159,184,158,.08)", "#F8FAF6"), borderColor: dk(isDark, "rgba(159,184,158,.35)", "#D8DDD4"), transform: "translateY(-1px)" } }}>
              <Box sx={{ width: 38, height: 38, borderRadius: "50%", bgcolor: pf.color, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 4px 12px ${pf.color}45` }}>{pf.icon}</Box>
              <Typography sx={{ fontSize: 10.5, fontWeight: 600, color: dk(isDark, "rgba(168,191,167,.75)", "#55584F"), fontFamily: "'Jost',sans-serif" }}>{pf.name}</Typography>
            </Box>
          ))}
          <Box component="button" onClick={nativeShare}
            sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.6, py: 1.1, borderRadius: "12px", border: dk(isDark, "1px solid rgba(159,184,158,.15)", "1px solid #EFF2EC"), bgcolor: "transparent", cursor: "pointer", transition: "all .15s", "&:hover": { bgcolor: dk(isDark, "rgba(159,184,158,.08)", "#F8FAF6"), borderColor: dk(isDark, "rgba(159,184,158,.35)", "#D8DDD4"), transform: "translateY(-1px)" } }}>
            <Box sx={{ width: 38, height: 38, borderRadius: "50%", bgcolor: dk(isDark, "rgba(159,184,158,.15)", "#EDF3EC"), border: dk(isDark, "1px solid rgba(159,184,158,.3)", "1px solid #D7E3D6"), display: "flex", alignItems: "center", justifyContent: "center", color: dk(isDark, "#9FB89E", "#5E815D") }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" y1="10.5" x2="15.4" y2="6.5"/><line x1="8.6" y1="13.5" x2="15.4" y2="17.5"/></svg>
            </Box>
            <Typography sx={{ fontSize: 10.5, fontWeight: 600, color: dk(isDark, "rgba(168,191,167,.75)", "#55584F"), fontFamily: "'Jost',sans-serif" }}>More…</Typography>
          </Box>
        </Box>

        {/* Preview — renders INSIDE the dialog (same tab). A separate
            "Open in new tab" affordance handles the redirect explicitly. */}
        <Box component="button" onClick={() => setShowPreview((v) => !v)} sx={{
          mt: 2, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 0.75,
          px: 2, py: 1, borderRadius: "12px", cursor: "pointer",
          bgcolor: dk(isDark, "rgba(29,90,80,.12)", "#F1F6F4"),
          border: dk(isDark, "1px solid rgba(111,160,149,.25)", "1px solid #D6E4E0"),
          color: dk(isDark, "#A9C7C0", "#1D5A50"),
          fontSize: 12.5, fontWeight: 600, fontFamily: "'Jost',sans-serif",
          transition: "background .15s ease",
          "&:hover": { bgcolor: dk(isDark, "rgba(29,90,80,.22)", "#E7EFEC") },
        }}><Eye size={13} /> {showPreview ? "Hide preview" : "Show preview"}</Box>

        {showPreview && (
          <Box sx={{ mt: 1.5, animation: "fadeIn .2s ease" }}>
            <Box component="iframe" src={shareLink} title="Resume preview" sx={{
              width: "100%", height: 340, border: dk(isDark, "1px solid rgba(111,160,149,.25)", "1px solid #E7EAE3"),
              borderRadius: "12px", bgcolor: "#fff", display: "block",
            }} />
            <Box component="a" href={shareLink} target="_blank" rel="noopener noreferrer" sx={{
              mt: 1, display: "inline-flex", alignItems: "center", gap: 0.6,
              fontSize: 11.5, fontWeight: 700, fontFamily: "'Jost',sans-serif",
              color: dk(isDark, "#9FB89E", "#5E815D"), textDecoration: "none",
              "&:hover": { textDecoration: "underline" },
            }}>
              Open in a new tab
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </Box>
          </Box>
        )}
      </Box>
      </Box>
    </>
  );
}

/* ── Reset confirmation dialog ─────────────────────────────────────── */
function ResetConfirm({ open, isDark, onCancel, onConfirm }) {
  if (!open) return null;
  return (
    <>
      <Box sx={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", p: 2 }}>
      <Box onClick={onCancel} sx={{ position: "absolute", inset: 0, bgcolor: "rgba(2,33,36,.45)", backdropFilter: "blur(3px)", animation: "fadeIn .15s ease" }} />
      <Box sx={{
        position: "relative",
        width: "min(400px, 90vw)",
        bgcolor: dk(isDark, "rgba(5,40,35,.98)", "#fff"),
        border: dk(isDark, "1px solid rgba(111,160,149,.3)", "1px solid #E7EAE3"),
        borderRadius: "18px", p: 3, textAlign: "center",
        boxShadow: dk(isDark, "0 20px 60px rgba(0,0,0,.6)", "0 20px 60px rgba(2,33,36,.2)"),
        animation: "fadeUp .2s ease", fontFamily: "'Jost',sans-serif",
      }}>
        <Box sx={{ width: 52, height: 52, borderRadius: "16px", bgcolor: "rgba(220,38,38,.08)", border: "1px solid rgba(220,38,38,.2)", display: "flex", alignItems: "center", justifyContent: "center", mx: "auto", mb: 2 }}>
          <RotateCcw size={22} color="#dc2626" />
        </Box>
        <Typography sx={{ fontSize: 17, fontWeight: 800, color: dk(isDark, "#E7EFE6", "#101210"), letterSpacing: "-.02em", fontFamily: "'Jost',sans-serif" }}>
          Reset this version?
        </Typography>
        <Typography sx={{ fontSize: 13, color: dk(isDark, "rgba(168,191,167,.65)", "#55584F"), lineHeight: 1.6, mt: 1, mb: 2.5, fontFamily: "'Jost',sans-serif" }}>
          This restores the current version to your original upload and discards
          every edit made in it. This can't be undone.
        </Typography>
        <Box sx={{ display: "flex", gap: 1.25, justifyContent: "center" }}>
          <Box component="button" onClick={onCancel} sx={{
            px: 2.5, py: 1, borderRadius: 99, cursor: "pointer", fontFamily: "'Jost',sans-serif",
            fontSize: 13, fontWeight: 700, color: dk(isDark, "rgba(168,191,167,.8)", "#55584F"),
            bgcolor: "transparent", border: dk(isDark, "1px solid rgba(159,184,158,.3)", "1px solid #E7EAE3"),
            "&:hover": { bgcolor: dk(isDark, "rgba(159,184,158,.08)", "#F6F8F3") },
          }}>Cancel</Box>
          <Box component="button" onClick={onConfirm} sx={{
            px: 2.5, py: 1, borderRadius: 99, cursor: "pointer", fontFamily: "'Jost',sans-serif",
            fontSize: 13, fontWeight: 700, color: "#fff", border: "none",
            bgcolor: "#dc2626", boxShadow: "0 6px 18px rgba(220,38,38,.3)",
            "&:hover": { bgcolor: "#b91c1c" },
          }}>Yes, reset</Box>
        </Box>
      </Box>
      </Box>
    </>
  );
}


/* ══════════════════════════════════════════════════════════════════════
  MAIN APP
══════════════════════════════════════════════════════════════════════ */
/* ── Session-ended card — shown when the builder has no file handoff and
   no restorable session (e.g. a very old tab). Replaces the removed
   upload page: resumes always start from the Workspace. ─────────────── */
function SessionEnded({ isDark, onClose }) {
  return (
    <Box sx={{
      minHeight: "70vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", px: 2, textAlign: "center",
      fontFamily: "'Jost','DM Sans',sans-serif",
    }}>
      <Box sx={{
        width: 72, height: 72, borderRadius: "22px",
        bgcolor: isDark ? "rgba(127,158,126,.12)" : "#EDF3EC",
        border: `1px solid ${isDark ? "rgba(159,184,158,.25)" : "#D7E3D6"}`,
        display: "flex", alignItems: "center", justifyContent: "center", mb: 2.5,
      }}>
        <FileText size={30} color={isDark ? "#9FB89E" : "#5E815D"} />
      </Box>
      <Typography sx={{
        fontSize: { xs: "1.35rem", sm: "1.6rem" }, fontWeight: 800,
        color: isDark ? "#E4EDE3" : "#101210", letterSpacing: "-0.025em",
        fontFamily: "'Jost','DM Sans',sans-serif",
      }}>
        This editing session has ended
      </Typography>
      <Typography sx={{
        fontSize: 14, color: isDark ? "rgba(168,191,167,.65)" : "#55584F",
        lineHeight: 1.65, maxWidth: 420, mt: 1.25, mb: 3.5,
        fontFamily: "'Jost','DM Sans',sans-serif",
      }}>
        Resumes are started from your Workspace — upload a file there and the
        builder opens in a fresh tab with everything ready.
      </Typography>
      <Button
        onClick={() => (onClose ? onClose() : window.close())}
        sx={{
          textTransform: "none", fontFamily: "'Jost','DM Sans',sans-serif",
          fontSize: 14, fontWeight: 700, color: "#fff",
          bgcolor: "#022124", px: 3.5, py: 1.2, borderRadius: 99,
          boxShadow: "0 8px 24px rgba(2,33,36,.22)",
          "&:hover": { bgcolor: "#0A3A38" },
        }}
      >
        Open your Workspace
      </Button>
    </Box>
  );
}

function AIResumeBuilderApp({ onClose, initialFile = null }) {
  // ── URL-driven navigation (replaces the old history.pushState trap) ──
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Read initial view/step from URL; fall back to defaults
  const [appView, setAppView] = useState(() => searchParams.get("rsView") || "landing");
  const [landingStep, setLandingStep] = useState(() => searchParams.get("rsStep") || "hero");

  // Sync state when the user presses browser Back / Forward
  useEffect(() => {
    const view = searchParams.get("rsView") || "landing";
    const step = searchParams.get("rsStep") || "hero";
    setAppView(view);
    setLandingStep(step);
  }, [searchParams]);

  // Navigate to a top-level view (optionally with a landing step)
  const navTo = useCallback((view, step = null) => {
    const params = new URLSearchParams(searchParams);
    params.set("rsView", view);
    if (step) params.set("rsStep", step);
    else params.delete("rsStep");
    navigate(`?${params.toString()}`, { replace: false });
    setAppView(view);
    if (step !== null) setLandingStep(step);
  }, [navigate, searchParams]);

  // Navigate between landing steps only
  const navStep = useCallback((step) => {
    const params = new URLSearchParams(searchParams);
    params.set("rsView", "landing");
    params.set("rsStep", step);
    navigate(`?${params.toString()}`, { replace: false });
    setLandingStep(step);
  }, [navigate, searchParams]);

  const [uploadProgress, setUploadProgress] = useState(0);
  const [landingUploading, setLandingUploading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [sessionId, setSessionId] = useState("");

  // ── Session persistence + refresh restore (NEW) ──
  // sessionStorage is PER-TAB, which matches the one-tab-per-resume
  // model: each builder tab remembers its own session. On refresh at
  // rsView=editor we rebuild the full editing state from the saved
  // snapshot instead of bouncing to a (now removed) upload page.
  const RB_SESSION_KEY = "rb_session_v1";
  const [sessionGone, setSessionGone] = useState(false);
  const restoreAttempted = useRef(false);
  const restoringRef = useRef(false);

  const [saving, setSaving] = useState(false);
  const [editCount, setEditCount] = useState(0);
  const [pendingSection, setPendingSection] = useState(null);
  const [fields, setFields] = useState([]);
  const [undoHistories, setUndoHistories] = useState({});
  const [photoCanUndo, setPhotoCanUndo] = useState(false);
  const lastEditedFieldId = useRef(null);
  const [backendOk, setBackendOk] = useState(null);
  const [addingAfter, setAddingAfter] = useState(null);
  const [activeSection, setActiveSection] = useState("");
  const [isPdf, setIsPdf] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewVer, setPreviewVer] = useState(0);
  const [showJDManager, setShowJDManager] = useState(false);
  const [showMatchPanel, setShowMatchPanel] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [originalPreviewUrl, setOriginalPreviewUrl] = useState(null);
  const [variantPreviews, setVariantPreviews] = useState({});
  const [variants, setVariants] = useState([]);
  const [fieldsCache, setFieldsCache] = useState({});
  const [activeVariantId, setActiveVariantId] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameVal, setRenameVal] = useState("");
  const [cloningVariant, setCloningVariant] = useState(false);
  const [shareLink, setShareLink] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [sectionPageBreaks, setSectionPageBreaks] = useState({});
  const [showPageWriter, setShowPageWriter] = useState(false);
  const [pageWriterParaIdx, setPageWriterParaIdx] = useState(-1);
  const [writingPage, setWritingPage] = useState(false);
  const [confirmClearPage, setConfirmClearPage] = useState(false);
  const [confirmDeletePage, setConfirmDeletePage] = useState(false);
  const [allPageBreaks, setAllPageBreaks] = useState([]);
  const [pagePickerEl, setPagePickerEl] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [previewPage, setPreviewPage] = useState(1);
  const [previewTotal, setPreviewTotal] = useState(0);

  const sparkle = useSparkle();
  const previewScrollRef = useRef(null);

  const refreshPageBreaks = useCallback(async (sid) => {
    try {
      const d = await resumeAiService.getPageBreaks(sid);
      if (d.success) { const breaks = d.page_breaks || []; setAllPageBreaks(breaks); return breaks; }
    } catch {}
    return [];
  }, []);

  // ── Toasts now route through the APPLICATION's toast system ──
  // (notistack SnackbarProvider in App.jsx, anchored bottom-right and
  // rendered by the themed AppToast component). The studio's private
  // Toast overlay is no longer rendered — every showToast(msg, type)
  // call across the studio and its panels lands in the app-wide stack.
  const { enqueueSnackbar } = useSnackbar();
  const showToast = useCallback((msg, type = "info") => {
    const variant = ["success", "error", "warning", "info"].includes(type) ? type : "default";
    enqueueSnackbar(msg, { variant });
  }, [enqueueSnackbar]);

  useEffect(() => { setBackendOk(true); }, []);

  // ── NOTE: The old history.pushState trap useEffect has been intentionally
  // removed. Browser back/forward now work correctly via URL search params
  // (rsView, rsStep) managed by navTo() and navStep() above. ──

  const renderPreview = useCallback(async (sid) => {
    if (!sid) return;
    setPreviewLoading(true);
    try {
      const r = await resumeAiService.getPreviewPdf(sid);
      if (!r.ok) throw new Error(`Preview ${r.status}`);
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      setPreviewUrl((prev) => {
        const cached = Object.values(variantPreviewsRef.current || {});
        if (prev && !cached.includes(prev) && prev !== url) { try { URL.revokeObjectURL(prev); } catch {} }
        return url;
      });
      setPreviewVer((v) => v + 1);
      setPreviewPage(1);
    } catch {
      showToast("PDF preview unavailable — ensure LibreOffice is installed on the server.", "error");
    }
    setPreviewLoading(false);
  }, []);

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    const ext = file.name.toLowerCase();
    if (!ext.endsWith(".docx") && !ext.endsWith(".pdf")) {
      showToast("Only .docx and .pdf files are supported.", "error"); return;
    }
    setFileName(file.name);
    setIsPdf(ext.endsWith(".pdf"));
    setLandingUploading(true);
    // ── navigate to processing step so Back works from here ──
    navStep("processing");
    setUploadProgress(0);
    setPreviewPage(1);
    setPreviewTotal(0);

    let processingTimer = null, processingP = 0;
    const tick = () => {
      const step = processingP < 35 ? 1.5 : processingP < 55 ? 0.9 : processingP < 72 ? 0.5 : processingP < 84 ? 0.22 : processingP < 93 ? 0.1 : 0.03;
      const delay = processingP < 35 ? 80 : processingP < 55 ? 110 : processingP < 72 ? 180 : processingP < 84 ? 300 : processingP < 93 ? 480 : 720;
      processingP = Math.min(processingP + step, 98);
      setUploadProgress(parseFloat(processingP.toFixed(1)));
      if (processingP < 98) processingTimer = setTimeout(tick, delay);
    };
    processingTimer = setTimeout(tick, 60);

    try {
      const d = await resumeAiService.uploadResume(file, (e) => {
        if (e.lengthComputable && processingP < 35) {
          processingP = Math.max(processingP, (e.loaded / e.total) * 35);
          setUploadProgress(parseFloat(processingP.toFixed(1)));
        }
      });
      if (!d.success) throw new Error(d.error || d.detail || "Upload failed");

      clearTimeout(processingTimer);
      const sweepTo100 = () => {
        processingP = Math.min(processingP + 3, 100);
        setUploadProgress(Math.round(processingP));
        if (processingP < 100) processingTimer = setTimeout(sweepTo100, 28);
      };
      sweepTo100();
      await new Promise((r) => setTimeout(r, 320));

      const origSessionId = d.session_id;
      let v1SessionId = origSessionId, v2SessionId = origSessionId;
      try {
        const d1 = await resumeAiService.cloneSession(origSessionId);
        if (d1.success) v1SessionId = d1.session_id;
        const d2 = await resumeAiService.cloneSession(origSessionId);
        if (d2.success) v2SessionId = d2.session_id;
      } catch {}

      const initVariants = [
        { id: "original", name: "Original", sessionId: origSessionId, readOnly: true },
        { id: "v1", name: "Variant 1", sessionId: v1SessionId, readOnly: false },
        { id: "v2", name: "Variant 2", sessionId: v2SessionId, readOnly: false },
      ];
      setVariants(initVariants);
      setActiveVariantId("v1");

      const activeSession = v1SessionId !== origSessionId ? v1SessionId : origSessionId;
      let initialFields = [];
      try {
        const fd2 = await resumeAiService.getFields(activeSession);
        initialFields = fd2.fields || [];
        setFieldsCache((prev) => ({
          ...prev, [origSessionId]: initialFields,
          [v1SessionId]: initialFields, [v2SessionId]: initialFields,
        }));
      } catch {}

      setFields(initialFields);
      setSessionId(activeSession);
      setEditCount(0);
      setActiveSection(initialFields[0]?.section?.key || "other");

      try {
        const op = await resumeAiService.getPreviewPdf(origSessionId);
        if (op.ok) { const blob = await op.blob(); setOriginalPreviewUrl(URL.createObjectURL(blob)); }
      } catch {}

      await renderPreview(activeSession);
      await refreshPageBreaks(activeSession);

      setTimeout(() => {
        // ── navigate to success step (adds to browser history) ──
        navStep("success");
        setLandingUploading(false);
        showToast("Resume uploaded ✓", "success");
      }, 400);
    } catch (e) {
      clearTimeout(processingTimer);
      showToast(e.message || "Upload failed", "error");
      // ── navigate back to upload step on failure ──
      navStep("upload");
      setLandingUploading(false);
    }
  }, [renderPreview, refreshPageBreaks, navStep]);

  // ── Auto-upload a file handed off from WorkspaceHome (NEW) ──
  // WorkspaceHome passes the dropped/picked File via BuilderPage →
  // initialFile prop. Consume it exactly once, only from a fresh landing.
  const initialFileConsumed = useRef(false);
  useEffect(() => {
    if (
      initialFile &&
      !initialFileConsumed.current &&
      !sessionId &&
      appView === "landing"
    ) {
      initialFileConsumed.current = true;
      handleFile(initialFile);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFile, handleFile]);

  // ── Refresh restore ──
  // Editor with no in-memory session: rebuild from the per-tab snapshot.
  // If there's nothing to restore, show the SessionEnded card (the
  // upload page no longer exists in the builder).
  useEffect(() => {
    if (appView !== "editor" || sessionId || restoreAttempted.current) return;
    restoreAttempted.current = true;
    let raw = null;
    try { raw = sessionStorage.getItem(RB_SESSION_KEY); } catch {}
    if (!raw) { setSessionGone(true); return; }

    restoringRef.current = true;
    (async () => {
      try {
        const s = JSON.parse(raw);
        if (!s?.variants?.length) throw new Error("empty snapshot");
        const activeId = s.activeVariantId || "v1";
        const active =
          s.sessionId ||
          s.variants.find((v) => v.id === activeId)?.sessionId ||
          s.variants[0].sessionId;

        setVariants(s.variants);
        setActiveVariantId(activeId);
        setFileName(s.fileName || "");
        if (typeof s.isPdf === "boolean") setIsPdf(s.isPdf);

        const fd = await resumeAiService.getFields(active);
        const flds = fd.fields || [];
        setFields(flds);
        setFieldsCache((prev) => ({ ...prev, [active]: flds }));
        setSessionId(active);
        setActiveSection(flds[0]?.section?.key || "other");

        try {
          const op = await resumeAiService.getPreviewPdf(s.variants[0].sessionId);
          if (op.ok) { const blob = await op.blob(); setOriginalPreviewUrl(URL.createObjectURL(blob)); }
        } catch {}

        await renderPreview(active);
        await refreshPageBreaks(active);
      } catch (err) {
        // Snapshot stale (backend session pruned, etc.)
        try { sessionStorage.removeItem(RB_SESSION_KEY); } catch {}
        setSessionGone(true);
      } finally {
        restoringRef.current = false;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appView, sessionId]);

  // ── Snapshot writer ──
  // Whenever a live editing session exists, keep the per-tab snapshot
  // fresh (variant switches, renames, deletes included).
  useEffect(() => {
    if (!sessionId || variants.length === 0) return;
    try {
      sessionStorage.setItem(RB_SESSION_KEY, JSON.stringify({
        sessionId, activeVariantId, variants, fileName, isPdf,
      }));
    } catch {}
  }, [sessionId, activeVariantId, variants, fileName, isPdf]);

  const pushUndo = useCallback((fieldId, text, segs) => {
    lastEditedFieldId.current = fieldId;
    setUndoHistories((prev) => ({ ...prev, [fieldId]: [...(prev[fieldId] || []), { text, segs }] }));
  }, []);

  const popUndo = useCallback((fieldId) => {
    setUndoHistories((prev) => {
      const stack = prev[fieldId] || [];
      return stack.length ? { ...prev, [fieldId]: stack.slice(0, -1) } : prev;
    });
  }, []);

  /* ════════════════════════════════════════════════════════════════════
    SHARED HELPERS — eliminate the 17 duplicate state-update blocks
  ════════════════════════════════════════════════════════════════════ */

  /** Update fields + cache + bump edit count. Does NOT render preview. */
  const applyFieldUpdate = useCallback((newFields, toastMsg) => {
    setFields(newFields);
    setFieldsCache((prev) => ({ ...prev, [sessionId]: newFields }));
    setEditCount((c) => c + 1);
    if (toastMsg) showToast(toastMsg, "success");
  }, [sessionId]);

  /**
   * Apply a backend mutation response: validate success, update fields +
   * cache + page breaks + edit count, re-render preview, show toast.
   * Returns true on success so callers can chain extra state updates.
   */
  const applyResult = useCallback(async (d, toastMsg, failMsg) => {
    if (!d.success) {
      showToast(d.error || d.detail || failMsg || "Failed", "error");
      return false;
    }
    const nf = d.fields || [];
    setFields(nf);
    setFieldsCache((prev) => ({ ...prev, [sessionId]: nf }));
    if (Array.isArray(d.page_breaks)) setAllPageBreaks(d.page_breaks);
    setEditCount((c) => c + 1);
    if (toastMsg) showToast(toastMsg, "success");
    await renderPreview(sessionId);
    return true;
  }, [sessionId, renderPreview]);

  /* ════════════════════════════════════════════════════════════════════
    HANDLERS
  ════════════════════════════════════════════════════════════════════ */

  const handleFieldSave = useCallback(async (field, newTextOrSegs, formatting, paraFmt = null) => {
    setSaving(true);
    try {
      const isSegs = Array.isArray(newTextOrSegs);
      const plainText = isSegs ? newTextOrSegs.map((s) => s.text || "").join("") : String(newTextOrSegs ?? "");
      if (!plainText.trim() && !isSegs) { setSaving(false); return; }

      const formattingWasTouched = isSegs && newTextOrSegs._formattingTouched === true;
      const hasExplicitFormatting = formattingWasTouched || (isSegs && newTextOrSegs.some((s) =>
        s.italic || s.underline || s.strike ||
        (s.color && s.color !== "") || (s.fontFamily && s.fontFamily !== "") ||
        (s.fontSize && s.fontSize !== "")
      ));
      const hasIcons = field.inlineLinks && field.inlineLinks.length > 0;

      const d = await resumeAiService.editField({
        session_id: sessionId, para_index: field.paraIndex ?? -1, source: field.source ?? "body",
        ...((field.isSplitField || (field.section?.key === "header" && !field.isHeader)) ? { old_text: field.text } : {}),
        ...(isSegs && hasExplicitFormatting && !hasIcons
          ? { segments: newTextOrSegs, new_text: plainText }
          : { new_text: plainText }),
      });
      if (d.success) {
        let latestFields = d.fields || [];
        applyFieldUpdate(latestFields);

        const links = field.inlineLinks || field.hyperlinks || [];
        if (!field.isSplitField && links.length > 0 && plainText.trim()) {
          const trimmed = plainText.trim();
          const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
          const isUrl   = /^https?:\/\//i.test(trimmed);
          let autoUrl = null;
          if (isEmail) autoUrl = `mailto:${trimmed}`;
          else if (isUrl) autoUrl = trimmed;

          if (autoUrl) {
            for (let li = 0; li < links.length; li++) {
              const lnk = links[li];
              const curUrl = lnk.url || lnk.href || "";
              if (curUrl === autoUrl) continue;
              try {
                const ld = await resumeAiService.editHyperlinkText({
                  session_id: sessionId,
                  para_index: field.paraIndex ?? -1,
                  r_id: lnk.rId || lnk.r_id || "",
                  new_url: autoUrl,
                  source: field.source ?? "body",
                  hyperlink_index: lnk.hyperlinkIndex ?? lnk.hyperlink_index ?? li,
                });
                if (ld.success && ld.fields) {
                  latestFields = ld.fields;
                  setFields(latestFields);
                  setFieldsCache((prev) => ({ ...prev, [sessionId]: latestFields }));
                }
              } catch { /* link sync is best-effort */ }
            }
          }
        }

        showToast("Edit applied ✓", "success");
        await renderPreview(sessionId);
      } else {
        showToast(d.error || d.detail || "Edit failed", "error");
      }
    } catch (e) { showToast("Edit failed: " + e.message, "error"); }
    setSaving(false);
  }, [sessionId, renderPreview, applyFieldUpdate]);

  const handleLinkSave = useCallback(async (field, rId, newUrl, hlIndex) => {
    if (!newUrl?.trim()) return;
    setSaving(true);
    try {
      const d = await resumeAiService.editHyperlinkText({
        session_id: sessionId, para_index: field.paraIndex ?? -1, r_id: rId,
        new_url: newUrl, source: field.source ?? "body", hyperlink_index: hlIndex ?? 0,
      });
      await applyResult(d, "URL updated ✓", "URL save failed");
    } catch { showToast("URL save failed", "error"); }
    setSaving(false);
  }, [sessionId, applyResult]);

  // Generic line/field API wrapper
  const apiAction = useCallback(async (apiFn, params, successMsg) => {
    setSaving(true);
    try {
      const d = await apiFn(params);
      await applyResult(d, successMsg);
    } catch (e) { showToast("Failed: " + e.message, "error"); }
    setSaving(false);
  }, [applyResult]);

  const handleAddLine = useCallback(async (field, data) => {
    const segs = data.segments && data.segments.length > 0
      ? data.segments
      : data.text
        ? [{ text: data.text, bold: false, italic: false, underline: false,
              strike: false, color: "", fontFamily: "", fontSize: "" }]
        : [];
    await apiAction(resumeAiService.addLine, {
      session_id: sessionId, after_para_index: field.paraIndex ?? -1,
      segments: segs, source: field.source ?? "body",
    }, "Line added ✓");
    setAddingAfter(null);
  }, [sessionId, apiAction]);

  const handleDeleteLine = useCallback(async (field) => {
    await apiAction(resumeAiService.deleteLine, {
      session_id: sessionId, para_index: field.paraIndex ?? -1,
    }, "Line deleted ✓");
  }, [sessionId, apiAction]);

  const handleDeleteField = useCallback(async (field) => {
    await apiAction(resumeAiService.deleteField, {
      session_id: sessionId, para_index: field.paraIndex ?? -1,
    }, "Deleted ✓");
  }, [sessionId, apiAction]);

  const handleImageReplace = useCallback(async (field, file) => {
    setSaving(true);
    try {
      const d = await resumeAiService.replaceImage(sessionId, field.imageTarget || "", file);
      if (await applyResult(d, "Image replaced ✓", "Replace failed")) {
        setPhotoCanUndo(d.can_undo === true);
      }
    } catch { showToast("Replace failed", "error"); }
    setSaving(false);
  }, [sessionId, applyResult]);

  const handleImageUndo = useCallback(async (field) => {
    setSaving(true);
    try {
      const d = await resumeAiService.undoImageReplace(sessionId, field.imageIndex ?? 0);
      if (d.ok && d.success) {
        applyFieldUpdate(d.fields || [], "Photo restored ✓");
        setPhotoCanUndo(false);
        await renderPreview(sessionId);
      } else if (d.status === 404) { setPhotoCanUndo(false); showToast("Nothing to undo", "info"); }
      else showToast(d.error || "Undo failed", "error");
    } catch { showToast("Undo failed", "error"); }
    setSaving(false);
  }, [sessionId, renderPreview, applyFieldUpdate]);

  const handlePhotoAdjusted = useCallback(async (newFields) => {
    applyFieldUpdate(newFields);
    await renderPreview(sessionId);
  }, [applyFieldUpdate, sessionId, renderPreview]);

  const handleEditBar = useCallback(async (field, pct) => {
    setSaving(true);
    try {
      const d = await resumeAiService.editField({
        session_id: sessionId, para_index: field.paraIndex ?? -1, new_text: String(pct) + "%",
      });
      await applyResult(d, null);
    } catch {}
    setSaving(false);
  }, [sessionId, applyResult]);

  // Refs for global Ctrl+Z handler
  const undoHistoriesRef = useRef(undoHistories);
  const variantPreviewsRef = useRef(variantPreviews);
  const fieldsRef = useRef(fields);
  const handleFieldSaveRef = useRef(handleFieldSave);
  const popUndoRef = useRef(popUndo);
  useEffect(() => { variantPreviewsRef.current = variantPreviews; }, [variantPreviews]);
  useEffect(() => { undoHistoriesRef.current = undoHistories; }, [undoHistories]);
  useEffect(() => { fieldsRef.current = fields; }, [fields]);
  useEffect(() => { handleFieldSaveRef.current = handleFieldSave; }, [handleFieldSave]);
  useEffect(() => { popUndoRef.current = popUndo; }, [popUndo]);

  useEffect(() => {
    const handler = async (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        const tag = document.activeElement?.tagName?.toLowerCase();
        const isEditing = document.activeElement?.contentEditable === "true" || tag === "input" || tag === "textarea";
        if (isEditing) return;
        e.preventDefault();
        const fieldId = lastEditedFieldId.current;
        if (!fieldId) return;
        const stack = undoHistoriesRef.current[fieldId];
        if (!stack?.length) return;
        const top = stack[stack.length - 1];
        const field = fieldsRef.current.find((f) => f.id === fieldId);
        if (!field) return;
        await handleFieldSaveRef.current(field, top.segs?.length > 0 ? top.segs : top.text, null, null);
        popUndoRef.current(fieldId);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const resetDoc = useCallback(async () => {
    try {
      const d = await resumeAiService.resetSession(sessionId);
      if (d.success) {
        const fd2 = await resumeAiService.getFields(sessionId);
        setFields(fd2.fields || []);
        setEditCount(0); setAddingAfter(null); setEditingField(null); setPhotoCanUndo(false);
        showToast("Reset to original ✓", "success");
        await renderPreview(sessionId);
      }
    } catch { showToast("Reset failed", "error"); }
  }, [sessionId, renderPreview]);

  const handleAddPage = useCallback(async () => {
    setSaving(true);
    try {
      const d = await resumeAiService.addPage(sessionId);
      if (await applyResult(d, "Page added ✓", "Add page failed")) {
        const breaks = d.page_breaks || [];
        if (breaks.length > 0) { setPageWriterParaIdx(breaks[breaks.length - 1]); setShowPageWriter(true); }
      }
    } catch (e) { showToast("Add page failed: " + e.message, "error"); }
    setSaving(false);
  }, [sessionId, applyResult]);

  const handleWritePageBlock = useCallback(async (text) => {
    if (!text?.trim() || pageWriterParaIdx < 0) return;
    setWritingPage(true);
    try {
      const sortedBreaks = [...allPageBreaks].sort((a, b) => a - b);
      const myIdx = sortedBreaks.indexOf(pageWriterParaIdx);
      const nextBreak = myIdx >= 0 && myIdx < sortedBreaks.length - 1 ? sortedBreaks[myIdx + 1] : Infinity;
      const pageContentFields = fields.filter((f) =>
        f.source === "body" && f.paraIndex > pageWriterParaIdx && f.paraIndex < nextBreak && !f.isHeader
      );
      let afterPara = pageContentFields.length > 0
        ? pageContentFields[pageContentFields.length - 1].paraIndex : pageWriterParaIdx;

      const lines = text.split("\n");
      let lastFields = null;
      for (const line of lines) {
        const segments = !line.trim() ? BLANK_SEG : _parseMarkdownLine(line);
        const d = await resumeAiService.addLine({
          session_id: sessionId, after_para_index: afterPara, segments, source: "body",
        });
        if (d.success) {
          afterPara = d.inserted_at ?? afterPara + 1;
          lastFields = d.fields || lastFields;
        } else { showToast(d.error || "Write failed on one line", "error"); break; }
      }
      if (lastFields) applyFieldUpdate(lastFields, "Content added ✓");
      await refreshPageBreaks(sessionId);
      await renderPreview(sessionId);
    } catch (e) { showToast("Write failed: " + e.message, "error"); }
    setWritingPage(false);
  }, [sessionId, pageWriterParaIdx, allPageBreaks, fields, renderPreview, refreshPageBreaks, applyFieldUpdate]);

  const handleClearPageBlock = useCallback(async () => {
    if (pageWriterParaIdx < 0) return;
    setSaving(true);
    try {
      const d = await resumeAiService.clearPage(sessionId, pageWriterParaIdx);
      if (await applyResult(d, "Page cleared ✓", "Clear failed")) {
        setConfirmClearPage(false);
      }
    } catch (e) { showToast("Clear failed: " + e.message, "error"); }
    setSaving(false);
  }, [sessionId, pageWriterParaIdx, applyResult]);

  const handleDeletePage = useCallback(async () => {
    if (pageWriterParaIdx < 0) return;
    setSaving(true);
    try {
      const d = await resumeAiService.deletePage(sessionId, pageWriterParaIdx);
      if (await applyResult(d, "Page deleted ✓", "Delete failed")) {
        const breaks = d.page_breaks || [];
        setPageWriterParaIdx(breaks.length > 0 ? breaks[breaks.length - 1] : -1);
        setShowPageWriter(false); setConfirmDeletePage(false);
      }
    } catch (e) { showToast("Delete failed: " + e.message, "error"); }
    setSaving(false);
  }, [sessionId, pageWriterParaIdx, applyResult]);

  const handleShare = useCallback(async () => {
    setShareLoading(true);
    try {
      // inline=true → browser renders the PDF instead of downloading it,
      // both for "Open preview" and for anyone the link is shared with.
      const link = `${resumeAiService.getDownloadPdfUrl(sessionId)}?inline=true`;
      setShareLink(link);   // opens the Share dialog — copying happens there
    } catch (e) { showToast("Share failed: " + e.message, "error"); }
    setShareLoading(false);
  }, [sessionId]);

  const handleAddSkillToResume = useCallback(async (skillName) => {
    const techField = fields.find((f) => /technical skills/i.test(f.text || "")) ||
      fields.find((f) => (f.section?.key || "").toLowerCase().includes("skill"));
    if (!techField) throw new Error("Skills section not found");
    const newText = techField.text ? `${techField.text}, ${skillName}` : skillName;
    const d = await resumeAiService.editField({
      session_id: sessionId, para_index: techField.paraIndex ?? -1, new_text: newText,
    });
    if (await applyResult(d, null, "Failed to update skills")) {
      setPendingSection("skills"); setShowMatchPanel(false);
    } else throw new Error(d.error || "Failed to update skills");
  }, [sessionId, fields, applyResult]);

  const downloadFile = useCallback(async (urlFn, ext, sparkColor, e) => {
    try {
      const token = localStorage.getItem("ievalx_token");
      const r = await fetch(urlFn(sessionId), { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!r.ok) throw new Error(`Server error ${r.status}`);
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url;
      a.download = fileName.replace(/\.(docx|pdf)$/i, `_edited.${ext}`);
      a.click(); URL.revokeObjectURL(url);
      sparkle(e?.clientX || 300, e?.clientY || 300, sparkColor);
      showToast(`Downloading .${ext} ✓`, "success");
    } catch (err) { showToast("Download failed: " + err.message, "error"); }
  }, [sessionId, fileName, sparkle]);

  const downloadDocx = useCallback((e) => downloadFile(resumeAiService.getDownloadDocxUrl, "docx", "#7F9E7E", e), [downloadFile]);
  const downloadPdf = useCallback((e) => downloadFile(resumeAiService.getDownloadPdfUrl, "pdf", "#5DAF9E", e), [downloadFile]);

  const switchVariant = useCallback(async (variantId) => {
    const v = variants.find((x) => x.id === variantId);
    if (!v || v.sessionId === sessionId) return;
    if (previewUrl) setVariantPreviews((prev) => ({ ...prev, [sessionId]: previewUrl }));
    setFieldsCache((prev) => ({ ...prev, [sessionId]: fields }));
    setActiveVariantId(variantId); setSessionId(v.sessionId);
    setEditCount(0); setAddingAfter(null); setEditingField(null);
    setUndoHistories({}); setPhotoCanUndo(false);

    const cachedFields = fieldsCache[v.sessionId];
    if (cachedFields?.length) setFields(cachedFields);
    else {
      try {
        const fd = await resumeAiService.getFields(v.sessionId);
        if (fd.fields) { setFields(fd.fields); setFieldsCache((prev) => ({ ...prev, [v.sessionId]: fd.fields })); }
      } catch {}
    }
    const cachedPrev = variantPreviews[v.sessionId];
    if (cachedPrev) { setPreviewUrl(cachedPrev); setPreviewVer((x) => x + 1); }
    else { setPreviewUrl(null); await renderPreview(v.sessionId); }
  }, [variants, sessionId, fields, previewUrl, fieldsCache, variantPreviews, renderPreview]);

  const cloneVariant = useCallback(async () => {
    if (!sessionId || cloningVariant) return;
    setCloningVariant(true);
    try {
      const d = await resumeAiService.cloneSession(sessionId);
      if (d.success) {
        const newId = "v" + (variants.length + 1) + "_" + Date.now();
        const srcName = variants.find((v) => v.id === activeVariantId)?.name || "Variant";
        const newVariant = { id: newId, name: srcName + " (copy)", sessionId: d.session_id };
        setVariants((prev) => [...prev, newVariant]);
        setActiveVariantId(newId); setSessionId(d.session_id);
        try { const fd = await resumeAiService.getFields(d.session_id); setFields(fd.fields || []); } catch {}
        setEditCount(0); setAddingAfter(null); setEditingField(null); setUndoHistories({});
        showToast("New variant created ✓", "success");
        await renderPreview(d.session_id);
      } else showToast(d.error || "Clone failed", "error");
    } catch (e) { showToast("Clone failed: " + e.message, "error"); }
    setCloningVariant(false);
  }, [sessionId, variants, activeVariantId, cloningVariant, renderPreview]);

  const deleteVariant = useCallback((variantId) => {
    if (variants.length <= 1) { showToast("Can't delete the only variant", "error"); return; }
    const remaining = variants.filter((v) => v.id !== variantId);
    setVariants(remaining);
    if (activeVariantId === variantId) switchVariant(remaining[remaining.length - 1].id);
  }, [variants, activeVariantId, switchVariant]);

  const handleAddBlankLine = useCallback(async (field) => {
    try {
      const d = await resumeAiService.addLine({
        session_id: sessionId, after_para_index: field.paraIndex ?? -1, segments: BLANK_SEG,
      });
      await applyResult(d, null);
    } catch {}
  }, [sessionId, applyResult]);

  const handleAddSection = useCallback(async (sectionTitle, afterParaIndex) => {
    setSaving(true);
    try {
      const d = await resumeAiService.addSection({
        session_id:       sessionId,
        after_segment_id: afterParaIndex,
        section_title:    sectionTitle,
        source:           "body",
      });
      await applyResult(d, `"${sectionTitle}" section added ✓`, "Add section failed");
    } catch (e) {
      showToast("Add section failed: " + e.message, "error");
    }
    setSaving(false);
  }, [sessionId, applyResult]);

  const handleMoveToNextPage = useCallback(async (sectionKey, sectionFields, enable) => {
    const secFields = sectionFields.filter((f) => (f.section?.key || "other") === sectionKey && f.source === "body");
    if (!secFields.length) return;
    const firstParaIdx = Math.min(...secFields.map((f) => f.paraIndex));
    setSaving(true);
    try {
      if (enable) {
        const insertAfter = firstParaIdx > 0 ? firstParaIdx - 1 : 0;
        const d = await resumeAiService.addPage(sessionId, insertAfter);
        if (await applyResult(d, "Moved to next page ✓")) {
          setSectionPageBreaks((prev) => ({ ...prev, [sectionKey]: true }));
        }
      } else {
        const breaks = [...allPageBreaks].sort((a, b) => a - b);
        const breakBefore = breaks.filter((b) => b < firstParaIdx).pop();
        if (breakBefore !== undefined) {
          const d = await resumeAiService.deletePage(sessionId, breakBefore);
          if (await applyResult(d, "Page break removed ✓")) {
            setSectionPageBreaks((prev) => ({ ...prev, [sectionKey]: false }));
          }
        }
      }
    } catch (e) { showToast("Failed: " + e.message, "error"); }
    setSaving(false);
  }, [sessionId, applyResult, allPageBreaks]);

  const handleContactLinkDone = useCallback(async (newFields) => {
    applyFieldUpdate(newFields);
    await renderPreview(sessionId);
  }, [applyFieldUpdate, sessionId, renderPreview]);

  const handleRelinkDone = useCallback(async (newFields) => {
    setFields(newFields);
    setEditCount((c) => c + 1);
    await renderPreview(sessionId);
    showToast("Link restored ✓", "success");
  }, [sessionId, renderPreview]);

  const goNew = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    // ── navigate to landing/hero and add a history entry ──
    navTo("landing", "hero");
    setFileName(""); setEditCount(0); setAddingAfter(null); setIsPdf(false);
    setShowJDManager(false); setShowMatchPanel(false); setEditingField(null);
    setPreviewPage(1); setPreviewTotal(0); setVariants([]); setActiveVariantId(null);
  }, [previewUrl, navTo]);

  const pageFields = React.useMemo(() => {
    if (pageWriterParaIdx < 0) return [];
    const sortedBreaks = [...allPageBreaks].sort((a, b) => a - b);
    const myIdx = sortedBreaks.indexOf(pageWriterParaIdx);
    const nextBreak = myIdx >= 0 && myIdx < sortedBreaks.length - 1 ? sortedBreaks[myIdx + 1] : Infinity;
    return fields.filter((f) => f.source === "body" && f.paraIndex > pageWriterParaIdx && f.paraIndex < nextBreak && !f.isHeader);
  }, [fields, pageWriterParaIdx, allPageBreaks]);

  const grouped = {};
  fields.forEach((f) => { const k = f.section?.key || "other"; if (!grouped[k]) grouped[k] = []; grouped[k].push(f); });

  const sortedPageBreaksList = [...allPageBreaks].sort((a, b) => a - b);
  sortedPageBreaksList.forEach((breakIdx, i) => {
    const pageKey = `__page_${i + 1}__`;
    const nextBreak = sortedPageBreaksList[i + 1] ?? Infinity;
    grouped[pageKey] = fields.filter((f) => f.source === "body" && f.paraIndex > breakIdx && f.paraIndex < nextBreak && !f.isHeader);
  });

  const getSectionLabel = (k) => {
    if (k.startsWith("__page_")) return `Page ${k.replace("__page_", "").replace(/__/g, "")}`;
    return STEP_LABELS[k] || k.replace(/_/g, " ");
  };

  useEffect(() => {
    if (!pendingSection) return;
    const keys = Object.keys(grouped);
    const target = keys.find((k) => k.toLowerCase().includes(pendingSection.toLowerCase())) || keys[0];
    if (target) { setActiveSection(target); setAddingAfter(null); setEditingField(null); }
    setPendingSection(null);
  }, [pendingSection]);

  useEffect(() => {
    if (!compareMode || variants.length === 0) return;
    const load = async () => {
      const map = {};
      for (const v of variants) {
        if (v.readOnly) continue;
        if (v.sessionId === sessionId) { map[v.sessionId] = previewUrl; continue; }
        try {
          const r = await resumeAiService.getPreviewPdf(v.sessionId);
          if (r.ok) { const blob = await r.blob(); map[v.sessionId] = URL.createObjectURL(blob); }
        } catch {}
      }
      setVariantPreviews(map);
    };
    load();
  }, [compareMode]);

  const highlightText = (() => {
    const raw = editingField?.text || "";
    const noBullet = raw.replace(/^[\s•◦▪▸–\-*·○■□\u2022\u25E6\u25AA\u25B8]+\s*/, "");
    const preTabs = noBullet.split("\t")[0].trim();
    return preTabs.replace(/\s{2,}/g, " ").trim() || null;
  })();

  // Status pill (Live / Updating)
  const StatusPill = ({ loading }) => (
    <Box sx={{
      display: "flex", alignItems: "center", gap: 0.625, px: 1.25, py: 0.375, borderRadius: 99,
      bgcolor: dk(isDark, loading ? "rgba(245,158,11,.1)" : "rgba(22,163,74,.1)", loading ? "rgba(245,158,11,.08)" : "rgba(22,163,74,.08)"),
      border: dk(isDark, loading ? "1px solid rgba(245,158,11,.25)" : "1px solid rgba(22,163,74,.25)", loading ? "1px solid rgba(245,158,11,.2)" : "1px solid rgba(22,163,74,.2)"),
    }}>
      <Box sx={{
        width: 6, height: 6, borderRadius: "50%",
        bgcolor: loading ? "#f59e0b" : "#22c55e",
        boxShadow: loading ? "0 0 7px #f59e0b" : "0 0 7px #22c55e",
        animation: loading ? "pulse 1s infinite" : "none",
      }} />
      <Typography sx={{
        fontSize: 10.5, fontWeight: 600, fontFamily: "'Jost',sans-serif",
        color: dk(isDark, loading ? "#fbbf24" : "#4ade80", loading ? "#d97706" : "#16a34a"),
      }}>{loading ? "Updating…" : "Live"}</Typography>
    </Box>
  );


  // ── Hoisted section navigation (consumed by the full-width tabs bar;
  //    the section-content IIFE below re-derives identical values in its
  //    own scope for the footer) ──
  const sectionKeys = Object.keys(grouped);
  const currentKey = activeSection && grouped[activeSection] ? activeSection : sectionKeys[0] || "";
  const currentIdx = sectionKeys.indexOf(currentKey);
  const goTo = (k) => {
    setActiveSection(k); setAddingAfter(null); setEditingField(null);
    if (k.startsWith("__page_")) {
      const sortedBrks = [...allPageBreaks].sort((a, b) => a - b);
      const num = parseInt(k.replace("__page_", "").replace(/__/g, "")) - 1;
      if (sortedBrks[num] !== undefined) setPageWriterParaIdx(sortedBrks[num]);
    }
  };

  /* ════════════════════════════════════════════════════════════════════
    RENDER
  ════════════════════════════════════════════════════════════════════ */

  return (
    <ThemeProvider theme={resumeAiTheme}>
      <style>{GLOBAL_CSS}</style>
      <Box sx={{ position: "fixed", inset: 0, zIndex: 1400, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* [REMOVED] The floating "← Back to iEvalx" pill is gone entirely.
            The landing keeps its integrated back button in LandingNav; in
            the editor, spawned tabs are closed via the browser tab itself. */}

        <ShareModal shareLink={shareLink} onClose={() => setShareLink(null)} isDark={isDark} showToast={showToast} />
        <ResetConfirm open={confirmReset} isDark={isDark}
          onCancel={() => setConfirmReset(false)}
          onConfirm={() => { setConfirmReset(false); resetDoc(); }} />

        {/* Session-ended takeover (refresh with nothing to restore) */}
        {sessionGone && (
          <Box sx={{ position: "absolute", inset: 0, zIndex: 400, bgcolor: dk(isDark, "#03201C", "#F6F8F3"), display: "flex", alignItems: "center", justifyContent: "center" }}>
            <SessionEnded isDark={isDark} onClose={onClose} />
          </Box>
        )}

        {/* Restoring overlay — editor refresh while the snapshot rebuilds */}
        {!sessionGone && appView === "editor" && !sessionId && (
          <Box sx={{ position: "absolute", inset: 0, zIndex: 400, bgcolor: dk(isDark, "#03201C", "#F6F8F3"), display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
            <SpinnerEl size={28} color={dk(isDark, "#9FB89E", "#5E815D")} />
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: dk(isDark, "rgba(168,191,167,.7)", "#55584F"), fontFamily: "'Jost',sans-serif" }}>
              Restoring your editing session…
            </Typography>
          </Box>
        )}

        {/* ══ LANDING ══ */}
        {appView === "landing" && (
          <Box sx={{
            minHeight: "100%", height: "100%", fontFamily: "'Jost',sans-serif", position: "relative",
            overflowY: "auto", overflowX: "hidden",
            background: dk(isDark, "#03201C", "linear-gradient(135deg,#F6F8F3 0%,#ffffff 60%,#F6F8F3 100%)"),
            transition: "background .5s ease",
          }}>
            {isDark && <NightScene />}
            {!isDark && (
              <Box sx={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
                <Box sx={{ position: "absolute", top: "-8%", left: "-8%", width: "38%", height: "38%", bgcolor: "rgba(94,129,93,0.06)", borderRadius: "50%", filter: "blur(100px)" }} />
                <Box sx={{ position: "absolute", bottom: "-8%", right: "-8%", width: "38%", height: "38%", bgcolor: "rgba(22,163,74,0.05)", borderRadius: "50%", filter: "blur(100px)" }} />
              </Box>
            )}
            <Box sx={{ position: "relative", zIndex: 5 }}>
              {/* ── Logo click goes back to hero via navStep ── */}
              <LandingNav onLogoClick={() => navStep("upload")} onBack={onClose} isDark={isDark} onToggleDark={() => setIsDark((d) => !d)} />
              <Box component="main" sx={{
                ...(landingStep === "choice" || landingStep === "upload" ? {} :
                  landingStep !== "hero" ? {
                    maxWidth: 600, mx: "auto", my: 4,
                    bgcolor: dk(isDark, "rgba(10,20,60,0.78)", "rgba(255,255,255,0.92)"),
                    backdropFilter: "blur(20px)",
                    border: dk(isDark, "1px solid rgba(127,158,126,.15)", "1px solid rgba(0,0,0,0.07)"),
                    borderRadius: 4,
                    boxShadow: dk(isDark, "0 16px 64px rgba(0,0,0,.4)", "0 8px 40px rgba(0,0,0,.08)"),
                    transition: "background .4s, border-color .4s",
                  } : {}),
              }}>
                {/* ── All step transitions now use navStep() so each push lands in history ── */}
                {landingStep === "hero" && <HeroStep onNext={() => navStep("choice")} isDark={isDark} />}
                {landingStep === "choice" && <ChoiceStep onUpload={() => navStep("upload")} onBack={() => navStep("hero")} isDark={isDark} />}
                {/* [REMOVED] The builder's own upload page is gone — files
                    only arrive via the Workspace handoff (initialFile).
                    While the handoff kicks in, show a brief starting state;
                    with no file at all, show the session-ended card. */}
                {landingStep === "upload" && (
                  initialFile ? (
                    <Box sx={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
                      <SpinnerEl size={26} color={dk(isDark, "#9FB89E", "#5E815D")} />
                      <Typography sx={{ fontSize: 14, fontWeight: 600, color: dk(isDark, "rgba(168,191,167,.7)", "#55584F"), fontFamily: "'Jost',sans-serif" }}>
                        Starting your upload…
                      </Typography>
                    </Box>
                  ) : (
                    <SessionEnded isDark={isDark} onClose={onClose} />
                  )
                )}
                {landingStep === "processing" && <ProcessingStep progress={uploadProgress} fileName={fileName} isDark={isDark} />}
                {/* ── SuccessStep onEdit uses navTo("editor") so Back from editor returns here ── */}
                {landingStep === "success" && <SuccessStep fileName={fileName} onEdit={() => navTo("editor")} isDark={isDark} />}
              </Box>
            </Box>
          </Box>
        )}

        {/* ══ EDITOR ══ */}
        {appView === "editor" && (
          <>
            {/* ══ COMPARE MODE ══ */}
            {compareMode && (
              <Box sx={{ height: "100%", minHeight: 0, display: "flex", flexDirection: "column", bgcolor: dk(isDark, "#03201C", "#F3F5F0"), fontFamily: "'Jost',sans-serif" }}>
                <Box sx={{ ...topbarSx(isDark), height: 58, px: 3, justifyContent: "space-between" }}>
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Box sx={{ width: 30, height: 30, borderRadius: 2, background: "linear-gradient(135deg,#5E815D,#9FB89E)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Eye size={14} color="#fff" />
                    </Box>
                    <Typography sx={{ fontFamily: "'Jost',sans-serif", fontWeight: 800, fontSize: 14, color: dk(isDark, "#E7EFE6", "#101210"), letterSpacing: "-.02em" }}>
                      Compare Variants
                    </Typography>
                    <Box sx={{ px: 1.25, py: 0.375, borderRadius: 99, bgcolor: dk(isDark, "rgba(22,163,74,.1)", "#f0fdf4"), border: dk(isDark, "1px solid rgba(22,163,74,.25)", "1px solid #bbf7d0") }}>
                      <Typography sx={{ fontSize: 10.5, fontWeight: 600, color: dk(isDark, "#4ade80", "#16a34a") }}>3 versions · side by side</Typography>
                    </Box>
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography sx={{ fontSize: 11, color: dk(isDark, "rgba(168,191,167,.5)", "#7A8073") }}>Click Edit → to edit a variant</Typography>
                    <RippleBtn variant="ghost" onClick={() => setCompareMode(false)} style={{ fontSize: 12, padding: "5px 14px" }}><X size={13} /> Exit</RippleBtn>
                  </Stack>
                </Box>
                <Box sx={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", overflow: "hidden", minHeight: 0 }}>
                  {[
                    { label: "Original", sublabel: "Uploaded resume · Read-only", vId: "original", color: "#55584F" },
                    { label: variants.find((v) => v.id === "v1")?.name || "Variant 1", sublabel: "Independent copy · Editable", vId: "v1", color: "#5E815D" },
                    { label: variants.find((v) => v.id === "v2")?.name || "Variant 2", sublabel: "Independent copy · Editable", vId: "v2", color: "#1D5A50" },
                  ].map((col, ci) => {
                    const variant = variants.find((v) => v.id === col.vId);
                    const isOriginal = col.vId === "original";
                    const pUrl = isOriginal ? originalPreviewUrl : variant?.sessionId === sessionId ? previewUrl : variantPreviews[variant?.sessionId];
                    const handleClick = isOriginal ? undefined : async () => { if (variant) await switchVariant(variant.id); setCompareMode(false); };
                    return (
                      <Box key={ci} sx={{ display: "flex", flexDirection: "column", overflow: "hidden", borderRight: ci < 2 ? dk(isDark, "1px solid rgba(60,96,88,.12)", "1px solid #E7EAE3") : "none" }}>
                        <Box sx={{
                          px: 2, py: 1.25, flexShrink: 0, bgcolor: dk(isDark, "rgba(3,32,28,.98)", "#fff"),
                          borderBottom: dk(isDark, "1px solid rgba(60,96,88,.1)", "1px solid #E7EAE3"),
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          cursor: isOriginal ? "default" : "pointer",
                        }} onClick={handleClick}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: col.color, boxShadow: `0 0 8px ${col.color}80`, flexShrink: 0 }} />
                            <Box>
                              <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: dk(isDark, "#E7EFE6", "#101210"), lineHeight: 1.2 }}>{col.label}</Typography>
                              <Typography sx={{ fontSize: 10, color: dk(isDark, "rgba(168,191,167,.45)", "#7A8073") }}>{col.sublabel}</Typography>
                            </Box>
                          </Box>
                          {isOriginal ? (
                            <Box sx={{ px: 1.25, py: 0.375, borderRadius: 99, bgcolor: "rgba(107,114,128,.1)", border: "1px solid rgba(107,114,128,.25)", fontSize: 10, fontWeight: 700, color: dk(isDark, "#7A8073", "#55584F"), fontFamily: "'Jost',sans-serif" }}>🔒 Original</Box>
                          ) : (
                            <RippleBtn variant="accent" onClick={handleClick} style={{ fontSize: 10.5, padding: "4px 12px", background: col.color, boxShadow: `0 2px 10px ${col.color}55` }}>Edit →</RippleBtn>
                          )}
                        </Box>
                        <Box onClick={handleClick} sx={{
                          flex: 1, overflowY: "auto", p: 1.5, bgcolor: dk(isDark, "#04241F", "#ECEFE9"),
                          cursor: isOriginal ? "default" : "pointer", position: "relative",
                          "&:hover .compare-edit-overlay": { opacity: isOriginal ? 0 : 1 },
                        }}>
                          {!isOriginal && (
                            <Box className="compare-edit-overlay" sx={{
                              position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)", zIndex: 10,
                              opacity: 0, transition: "opacity .2s", pointerEvents: "none",
                              display: "flex", alignItems: "center", gap: 0.75, px: 1.75, py: 0.75, borderRadius: 99,
                              bgcolor: "rgba(0,0,0,.65)", backdropFilter: "blur(6px)", border: `1px solid ${col.color}55`, boxShadow: "0 4px 16px rgba(0,0,0,.4)",
                            }}>
                              <EditPenSvg color={col.color} />
                              <Typography sx={{ fontSize: 11, fontWeight: 700, color: "#fff", fontFamily: "'Jost',sans-serif", whiteSpace: "nowrap" }}>Click to edit this variant</Typography>
                            </Box>
                          )}
                          {pUrl ? (
                            <PDFViewer url={pUrl} version={previewVer} highlightText={null} scrollContainerRef={{ current: null }} onPageChange={() => {}} fields={[]} onFieldClick={() => {}} />
                          ) : (
                            <Box sx={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1.5, bgcolor: dk(isDark, "rgba(12,22,65,.6)", "#fff"), borderRadius: 2, border: dk(isDark, "1.5px dashed rgba(60,96,88,.3)", "1.5px dashed #dde1ea"), minHeight: 300 }}>
                              <SpinnerEl size={20} color={col.color} />
                              <Typography sx={{ fontSize: 12, color: dk(isDark, "rgba(168,191,167,.5)", "#7A8073") }}>Loading preview…</Typography>
                            </Box>
                          )}
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            )}

            {/* ══ MAIN EDITOR ══ */}
            <Box className={isDark ? "night-editor" : ""} sx={{
              display: compareMode ? "none" : "flex", flexDirection: "column", height: "100%", minHeight: 0, fontFamily: "'Jost',sans-serif",
              bgcolor: dk(isDark, "#03201C", "#F3F5F0"), color: "text.primary", transition: "background .4s",
            }}>
              {showJDManager && <JDManagerPanel onClose={() => setShowJDManager(false)} showToast={showToast} />}
              {showMatchPanel && <MatchPanel sessionId={sessionId} onClose={() => setShowMatchPanel(false)} showToast={showToast} onGoToSection={(sec) => { setShowMatchPanel(false); setPendingSection(sec); }} onAddSkill={handleAddSkillToResume} />}
              {showAIChat && <AIChatPanel onClose={() => setShowAIChat(false)} sessionId={sessionId} fields={fields} activeSection={activeSection} editingField={editingField} showToast={showToast} isDark={isDark} />}
              <PageWriterDialog open={showPageWriter} onWrite={handleWritePageBlock} onClose={() => setShowPageWriter(false)} writing={writingPage} pageFields={pageFields} onSaveField={handleFieldSave} onDeleteField={handleDeleteField} deleting={saving} />

              {/* ══ DARK BRAND BAR (full width, reference style) ══ */}
                {/* Topbar */}
                <Box sx={{ height: 56, px: 2, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5, flexShrink: 0, bgcolor: dk(isDark, "rgba(3,32,28,.98)", "#FFFFFF"), borderBottom: dk(isDark, "1px solid rgba(60,96,88,.12)", "1px solid #E7EAE3"), transition: "background .4s, border-color .4s" }}>
                  <Stack direction="row" alignItems="center" spacing={0.875} sx={{ flexShrink: 0 }}>
                    <Box sx={{
                      width: 30, height: 30, borderRadius: 1.75, background: "linear-gradient(135deg,#5E815D,#9FB89E)",
                      display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14,
                      flexShrink: 0, boxShadow: "0 2px 10px rgba(94,129,93,.4)",
                    }}>✦</Box>
                    <Box>
                      <Typography sx={{ fontFamily: "'Jost',sans-serif", fontWeight: 800, fontSize: 13, letterSpacing: "-.02em", color: dk(isDark, "#E7EFE6", "#101210"), lineHeight: 1.1 }}>ResumeAI</Typography>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <Typography sx={{ fontSize: 9, color: dk(isDark, "rgba(168,191,167,.4)", "#7A8073"), maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fileName || "no file loaded"}</Typography>
                        {isPdf && <Box sx={{ fontSize: 8, px: 0.5, py: "1px", borderRadius: 0.5, bgcolor: "rgba(6,182,212,.12)", color: "#3F8C7F", border: "1px solid rgba(6,182,212,.25)", fontWeight: 700, flexShrink: 0 }}>PDF</Box>}
                        {editCount > 0 && <Box sx={{ fontSize: 8, px: 0.5, py: "1px", borderRadius: 0.5, fontWeight: 700, flexShrink: 0, bgcolor: dk(isDark, "rgba(94,129,93,.14)", "rgba(94,129,93,.08)"), color: dk(isDark, "#9FB89E", "#5E815D"), border: dk(isDark, "1px solid rgba(94,129,93,.28)", "1px solid rgba(94,129,93,.22)") }}>{editCount} edits</Box>}
                      </Box>
                    </Box>
                  </Stack>

                  {/* Variant tabs */}
                  {variants.length > 0 && (
                    <Box sx={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 0.75, overflow: "hidden" }}>
                      <Typography sx={{ fontSize: 10, fontWeight: 800, color: dk(isDark, "rgba(168,191,167,.55)", "#7A8073"), textTransform: "uppercase", letterSpacing: ".09em", flexShrink: 0, fontFamily: "'Jost',sans-serif" }}>Versions</Typography>
                      {variants.map((v) => {
                        const isActive = v.id === activeVariantId;
                        const c = v.id === "original" ? "#55584F" : v.id === "v1" ? "#5E815D" : "#2E6E62";
                        return (
                          <Box key={v.id} sx={{ display: "flex", alignItems: "center", gap: 0.25, flexShrink: isActive ? 0 : 1, minWidth: 0, overflow: "hidden" }}>
                            {renamingId === v.id ? (
                              <input autoFocus value={renameVal} onChange={(e) => setRenameVal(e.target.value)}
                                onBlur={() => { if (renameVal.trim()) setVariants((prev) => prev.map((x) => x.id === v.id ? { ...x, name: renameVal.trim() } : x)); setRenamingId(null); }}
                                onKeyDown={(e) => { if (e.key === "Enter") { if (renameVal.trim()) setVariants((prev) => prev.map((x) => x.id === v.id ? { ...x, name: renameVal.trim() } : x)); setRenamingId(null); } if (e.key === "Escape") setRenamingId(null); }}
                                style={{ width: 84, height: 28, padding: "0 10px", borderRadius: 99, border: `1.5px solid ${c}`, fontFamily: "'Jost',sans-serif", fontSize: 11.5, fontWeight: 600, background: dk(isDark, "#062C26", "#fff"), color: dk(isDark, "#E7EFE6", "#101210"), outline: "none" }}
                              />
                            ) : (
                              <Box onClick={() => switchVariant(v.id)}
                                onDoubleClick={() => { if (!v.readOnly) { setRenamingId(v.id); setRenameVal(v.name); } }}
                                title={v.readOnly ? "Original upload — read-only safe copy" : "Click to switch · Double-click to rename"}
                                sx={{
                                  display: "flex", alignItems: "center", gap: 0.6, height: 28, px: 1.25, borderRadius: 99,
                                  cursor: "pointer", userSelect: "none",
                                  flexShrink: isActive ? 0 : 1, minWidth: 0, overflow: "hidden",
                                  border: `1px solid ${isActive ? c : dk(isDark, "rgba(159,184,158,.18)", "#E7EAE3")}`,
                                  bgcolor: isActive ? dk(isDark, "rgba(159,184,158,.14)", "#EDF3EC") : dk(isDark, "transparent", "#FFFFFF"),
                                  transition: "all .15s ease",
                                  "&:hover": { borderColor: c, bgcolor: isActive ? dk(isDark, "rgba(159,184,158,.14)", "#EDF3EC") : dk(isDark, "rgba(159,184,158,.06)", "#F8FAF6") },
                                }}>
                                {v.readOnly
                                  ? <Lock size={10} color={isActive ? c : dk(isDark, "rgba(168,191,167,.5)", "#7A8073")} strokeWidth={2.25} style={{ flexShrink: 0 }} />
                                  : <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: isActive ? c : dk(isDark, "rgba(168,191,167,.25)", "#D8DDD4"), flexShrink: 0 }} />}
                                <Typography sx={{ fontSize: 11.5, fontWeight: isActive ? 700 : 600, color: isActive ? dk(isDark, "#E7EFE6", c) : dk(isDark, "rgba(180,205,255,.55)", "#55584F"), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontFamily: "'Jost',sans-serif" }}>
                                  {v.name}
                                </Typography>
                              </Box>
                            )}
                            {variants.length > 1 && !v.readOnly && (
                              <Box component="button" onClick={(e) => { e.stopPropagation(); deleteVariant(v.id); }}
                                title="Delete this version"
                                sx={{ width: 16, height: 16, borderRadius: "50%", border: "none", bgcolor: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: dk(isDark, "rgba(168,191,167,.3)", "#C9CEC4"), p: 0, flexShrink: 0, transition: "all .15s", "&:hover": { color: "#ef4444", bgcolor: dk(isDark, "rgba(239,68,68,.12)", "#FDECEC") } }}>
                                <X size={9} />
                              </Box>
                            )}
                          </Box>
                        );
                      })}
                    </Box>
                  )}


                  <Stack direction="row" alignItems="center" spacing={0.5} sx={{ flexShrink: 0 }}>
                    <TBtn icon={<Ico.JD />} label="JD Manager" hoverBg={dk(isDark, "rgba(22,163,74,.12)", "#f0fdf4")} hoverColor={dk(isDark, "#4ade80", "#15803d")} hoverBorder={dk(isDark, "rgba(22,163,74,.3)", "#bbf7d0")} active={showJDManager} isNight={isDark} onClick={() => { setShowJDManager((v) => !v); setShowMatchPanel(false); setShowAIChat(false); setCompareMode(false); }} />
                    <TBtn icon={<Ico.Match />} label="Match" hoverBg={dk(isDark, "rgba(94,129,93,.15)", "#EDF3EC")} hoverColor={dk(isDark, "#fff", "#5E815D")} hoverBorder={dk(isDark, "rgba(94,129,93,.35)", "#D7E3D6")} active={showMatchPanel} isNight={isDark} onClick={() => { setShowMatchPanel((v) => !v); setShowJDManager(false); setShowAIChat(false); setCompareMode(false); }} />
                    <Divider orientation="vertical" sx={{ height: 16, borderColor: dk(isDark, "rgba(159,184,158,.2)", "#E7EAE3") }} />
                    <TBtn icon={<Ico.Rst />} label="Reset" hoverBg={dk(isDark, "rgba(220,38,38,.12)", "#fef2f2")} hoverColor={dk(isDark, "#f87171", "#dc2626")} hoverBorder={dk(isDark, "rgba(220,38,38,.3)", "#fecaca")} isNight={isDark} onClick={() => setConfirmReset(true)} />
                    <TBtn icon={shareLoading ? <SpinnerEl size={10} color={dk(isDark, "#6FA095", "#1D5A50")} /> : <ShareIcon />} label="Share" hoverBg={dk(isDark, "rgba(29,90,80,.14)", "#F1F6F4")} hoverColor={dk(isDark, "#fff", "#1D5A50")} hoverBorder={dk(isDark, "rgba(111,160,149,.35)", "#D6E4E0")} isNight={isDark} onClick={handleShare} />
                    <TBtn icon={<CompareIcon />} label={compareMode ? "Exit" : "Compare"} active={compareMode} hoverBg={dk(isDark, "rgba(22,163,74,.12)", "#f0fdf4")} hoverColor={dk(isDark, "#4ade80", "#15803d")} hoverBorder={dk(isDark, "rgba(22,163,74,.3)", "#bbf7d0")} isNight={isDark} onClick={() => { setCompareMode((v) => !v); setShowJDManager(false); setShowMatchPanel(false); setShowAIChat(false); }} />
                    <Divider orientation="vertical" sx={{ height: 16, borderColor: dk(isDark, "rgba(159,184,158,.2)", "#E7EAE3") }} />
                    <Box onClick={() => setIsDark((d) => !d)} sx={{
                      width: 30, height: 30, borderRadius: "9px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      color: dk(isDark, "#C0D2BF", "#55584F"),
                      bgcolor: dk(isDark, "rgba(159,184,158,.07)", "#F8FAF6"), border: dk(isDark, "1px solid rgba(159,184,158,.22)", "1px solid #E7EAE3"),
                      transition: "all .18s", "&:hover": { bgcolor: dk(isDark, "rgba(159,184,158,.15)", "#EDF3EC"), color: dk(isDark, "#E7EFE6", "#022124") },
                    }}>
                      {isDark ? (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      ) : (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
                          {[[12,2.5,12,5],[12,19,12,21.5],[4.6,4.6,6.4,6.4],[17.6,17.6,19.4,19.4],[2.5,12,5,12],[19,12,21.5,12]].map(([x1,y1,x2,y2], i) => (
                            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                          ))}
                        </svg>
                      )}
                    </Box>
                    <DownloadDropdown onDocx={downloadDocx} onPdf={downloadPdf} />
                  </Stack>
                </Box>


              {/* ══ CONTENT ROW: form left · paper right ══ */}
              <Box sx={{ display: "flex", flex: 1, minHeight: 0 }}>

              {/* ── RIGHT: Preview 45% (reference layout: form left, paper right) ── */}
              <div style={{
                width: "45%", minWidth: 340, flexShrink: 1, height: "100%", position: "relative",
                order: 1,
                borderLeft: dk(isDark, "1.5px solid rgba(60,96,88,.15)", "1.5px solid #E7EAE3"),
                background: dk(isDark, "#052823", "#ECEFE9"),
                backgroundImage: dk(isDark, "none", "radial-gradient(#D8DDD4 1px, transparent 1px)"),
                backgroundSize: dk(isDark, "auto", "18px 18px"),
                transition: "background .4s, border-color .4s",
              }}>
{/* [REMOVED] Live status pill */}

                {/* Preview scroll area */}
                <div ref={previewScrollRef} className="rb-scroll"
                  onClick={(e) => { if (e.target === previewScrollRef.current || e.target.dataset?.bgClear) setEditingField(null); }}
                  style={{
                    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                    overflowY: "auto", overflowX: "hidden", padding: 12, boxSizing: "border-box",
                    background: dk(isDark, "#04241F", "#ECEFE9"), transition: "background .4s",
                  }}>
                  {previewUrl ? (
                    <PDFViewer url={previewUrl} version={previewVer} highlightText={highlightText} scrollContainerRef={previewScrollRef}
                      onPageChange={(cur, tot) => { setPreviewPage(cur); setPreviewTotal(tot); }}
                      fields={fields}
                      sessionId={sessionId}
                      onPhotoAdjusted={handlePhotoAdjusted}
                      onFieldClick={(field) => {
                        if (!field) { setEditingField(null); return; }
                        const sKey = field.section?.key;
                        if (sKey) setActiveSection(sKey);
                        setTimeout(() => {
                          const el = document.querySelector(`[data-field-id="${field.id}"]`);
                          if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); setTimeout(() => el.click(), 80); }
                        }, 120);
                      }}
                    />
                  ) : (
                    <div style={{
                      height: "100%", background: dk(isDark, "rgba(12,22,65,.6)", "#fff"), borderRadius: 10,
                      border: dk(isDark, "1.5px dashed rgba(60,96,88,.3)", "1.5px dashed #dde1ea"),
                      display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12,
                    }}>
                      {previewLoading ? (
                        <>
                          <SpinnerEl size={22} color="#5E815D" />
                          <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, fontWeight: 700, color: "#3A3D37" }}>Generating preview…</span>
                          <span style={{ fontSize: 11.5, color: "#7A8073" }}>DOCX → PDF converting</span>
                        </>
                      ) : (
                        <>
                          <FileText size={24} strokeWidth={1.3} color="#C9CEC4" />
                          <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, fontWeight: 700, color: "#3A3D37" }}>Preview will appear here</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {previewLoading && previewUrl && (
                  <div style={{
                    position: "absolute", bottom: 52, left: "50%", transform: "translateX(-50%)",
                    padding: "7px 16px", borderRadius: 99, background: "#fff", border: "1px solid #D7E3D6",
                    fontSize: 11.5, color: "#5E815D", fontWeight: 600, display: "flex", alignItems: "center",
                    gap: 7, boxShadow: "0 4px 16px rgba(94,129,93,.15)", whiteSpace: "nowrap", zIndex: 10,
                  }}><SpinnerEl size={11} color="#5E815D" /> Updating preview…</div>
                )}

                {/* Page indicator badge */}
                {previewUrl && previewTotal > 0 && (
                  <div style={{
                    position: "absolute", bottom: 14, left: 14, zIndex: 10,
                    display: "flex", alignItems: "center", gap: 6, padding: "5px 13px", borderRadius: 99,
                    background: "rgba(15,23,42,0.78)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
                    border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 4px 16px rgba(0,0,0,0.22)",
                    animation: "pageBadgeIn .25s cubic-bezier(.34,1.56,.64,1)", pointerEvents: "none", userSelect: "none",
                  }}>
                    <PageSvgIcon />
                    <span style={{ fontSize: 12.5, fontWeight: 800, fontFamily: "'Jost',sans-serif", color: "#fff", lineHeight: 1, minWidth: "1ch", textAlign: "right" }}>{previewPage}</span>
                    <span style={{ fontSize: 11, fontWeight: 400, color: "rgba(255,255,255,0.35)", fontFamily: "'Jost',sans-serif", lineHeight: 1 }}>/</span>
                    <span style={{ fontSize: 12.5, fontWeight: 500, fontFamily: "'Jost',sans-serif", color: "rgba(255,255,255,0.55)", lineHeight: 1 }}>{previewTotal}</span>
                  </div>
                )}
              </div>

              {/* ── LEFT: Editor 55% (reference layout) ── */}
              <Box sx={{
                width: "55%", flex: 1, minWidth: 0, display: "flex", flexDirection: "column",
                order: 0,
                bgcolor: dk(isDark, "rgba(5,40,35,1)", "#fff"), overflow: "hidden",
                transition: "background .4s", backdropFilter: isDark ? "blur(20px)" : "none",
              }}>
                {/* Section nav + page */}
                {(() => {
                  const sectionKeys = Object.keys(grouped);
                  const currentKey = activeSection && grouped[activeSection] ? activeSection : sectionKeys[0] || "";
                  const currentIdx = sectionKeys.indexOf(currentKey);
                  const currentFields = grouped[currentKey] || [];
                  const goTo = (k) => {
                    setActiveSection(k); setAddingAfter(null); setEditingField(null);
                    if (k.startsWith("__page_")) {
                      const sortedBrks = [...allPageBreaks].sort((a, b) => a - b);
                      const num = parseInt(k.replace("__page_", "").replace(/__/g, "")) - 1;
                      if (sortedBrks[num] !== undefined) setPageWriterParaIdx(sortedBrks[num]);
                    }
                  };

                  return (
                    <Box sx={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
                      {/* Read-only banner */}
                      {variants.find((v) => v.id === activeVariantId)?.readOnly && (
                        <Box sx={{ mx: 4, mt: 2, mb: -1, px: 2, py: 1, borderRadius: 2, bgcolor: "rgba(107,114,128,.08)", border: "1px solid rgba(107,114,128,.2)", display: "flex", alignItems: "center", gap: 1 }}>
                          <Typography sx={{ fontSize: 11, color: dk(isDark, "#7A8073", "#55584F") }}>🔒</Typography>
                          <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: dk(isDark, "#7A8073", "#55584F") }}>Original — read-only. Switch to Variant 1 or 2 to edit.</Typography>
                        </Box>
                      )}

                      {/* Section page */}
                      <Box sx={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                        <SectionPage key={currentKey} sectionKey={currentKey} fields={currentFields}
                          onSave={handleFieldSave} undoHistories={undoHistories} onPushUndo={pushUndo} onPopUndo={popUndo}
                          isReadOnly={variants.find((v) => v.id === activeVariantId)?.readOnly || false}
                          onNextSection={currentIdx < sectionKeys.length - 1 ? () => goTo(sectionKeys[currentIdx + 1]) : null}
                          saving={saving} sessionId={sessionId}
                          onAddLine={(f) => setAddingAfter(addingAfter?.id === f.id ? null : f)}
                          onDeleteLine={handleDeleteLine} onDeleteField={handleDeleteField}
                          addingAfter={addingAfter} setAddingAfter={setAddingAfter}
                          onAddLineSubmit={handleAddLine} onAddPage={handleAddPage}
                          isLastSection={currentIdx === sectionKeys.length - 1}
                          onEditStart={(f) => setEditingField(f)} onEditEnd={() => setEditingField(null)}
                          onAddContent={() => setShowPageWriter(true)} onLinkSave={handleLinkSave}
                          onRelinkDone={handleRelinkDone}
                          isDark={isDark} hasPageBreak={!!sectionPageBreaks[currentKey]}
                          onMoveToNextPage={(enable) => handleMoveToNextPage(currentKey, fields, enable)}
                          onAddBlankLine={handleAddBlankLine} onReplaceImage={handleImageReplace}
                          onUndoImage={handleImageUndo} photoCanUndo={photoCanUndo} showToast={showToast}
                          onContactLinkDone={handleContactLinkDone}
                          onAddSection={handleAddSection}
                          headerSlot={(
                            <>
              {/* Integrated section tabs (moved into SectionPage content) */}
                      {/* Step progress bar */}
                      <Box sx={{
                        mb: 2.5, pb: 0.5,
                        borderBottom: dk(isDark, "1px solid rgba(60,96,88,.12)", "1px solid #EFF2EC"),
                        overflowX: "auto",
                        scrollbarWidth: "thin", scrollbarColor: dk(isDark, "rgba(159,184,158,.45) transparent", "#C9CEC4 transparent"),
                        "&::-webkit-scrollbar": { height: 7 },
                        "&::-webkit-scrollbar-track": { background: "transparent" },
                        "&::-webkit-scrollbar-thumb": { background: dk(isDark, "rgba(159,184,158,.45)", "#C9CEC4"), borderRadius: 99, "&:hover": { background: dk(isDark, "rgba(159,184,158,.7)", "#7F9E7E") } },
                      }}>
                        {/* Arrow-chip step tabs (reference style) — centered,
                            chevron-separated, click to jump. Completion shown
                            with a check; pages get a diamond marker. */}
                        <Box sx={{ px: 2, py: 1.25, minWidth: "max-content", display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5 }}>
                          {sectionKeys.map((k, idx) => {
                            const isActive = k === currentKey, isDone = idx < currentIdx;
                            const isPage = k.startsWith("__page_");
                            const sf = grouped[k] || [];
                            const allFilled = sf.filter((f) => !f.isHeader).length > 0 && sf.filter((f) => !f.isHeader && f.text?.trim()).length === sf.filter((f) => !f.isHeader).length;
                            const showCheck = (isDone || allFilled) && !isActive;
                            const accent = isPage ? "#2E6E62" : "#5E815D";
                            return (
                              <React.Fragment key={k}>
                                <Box onClick={() => goTo(k)} sx={{
                                  display: "flex", alignItems: "center", gap: 0.7,
                                  height: 34, px: 1.75, borderRadius: 99, cursor: "pointer",
                                  whiteSpace: "nowrap", userSelect: "none", flexShrink: 0,
                                  border: `1.5px solid ${isActive ? accent : dk(isDark, "rgba(159,184,158,.16)", "#E7EAE3")}`,
                                  bgcolor: isActive ? dk(isDark, "rgba(159,184,158,.14)", "#FFFFFF") : dk(isDark, "rgba(159,184,158,.04)", "#F6F8F3"),
                                  boxShadow: isActive ? dk(isDark, "0 0 14px rgba(159,184,158,.15)", "0 2px 8px rgba(94,129,93,.12)") : "none",
                                  transition: "all .15s ease",
                                  "&:hover": { borderColor: accent, bgcolor: isActive ? undefined : dk(isDark, "rgba(159,184,158,.08)", "#FFFFFF") },
                                }}>
                                  {showCheck ? (
                                    <Box sx={{ width: 15, height: 15, borderRadius: "50%", bgcolor: "#5E815D", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><polyline points="1.5,4 3.2,5.8 6.5,2" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                    </Box>
                                  ) : isPage ? (
                                    <Box sx={{ width: 9, height: 9, borderRadius: "2px", transform: "rotate(45deg)", bgcolor: isActive ? accent : dk(isDark, "rgba(111,160,149,.5)", "#A9C7C0"), flexShrink: 0 }} />
                                  ) : (
                                    <Box sx={{
                                      width: 15, height: 15, borderRadius: "50%", flexShrink: 0,
                                      display: "flex", alignItems: "center", justifyContent: "center",
                                      fontSize: 9, fontWeight: 800, fontFamily: "'Jost',sans-serif",
                                      color: isActive ? "#fff" : dk(isDark, "rgba(168,191,167,.6)", "#7A8073"),
                                      bgcolor: isActive ? accent : dk(isDark, "rgba(159,184,158,.12)", "#EFF2EC"),
                                    }}>{idx + 1}</Box>
                                  )}
                                  <Typography sx={{
                                    fontSize: 12.5, fontWeight: isActive ? 700 : 600,
                                    fontFamily: "'Jost',sans-serif", letterSpacing: "-.01em",
                                    color: isActive ? dk(isDark, "#E7EFE6", "#101210") : dk(isDark, "rgba(168,191,167,.6)", "#55584F"),
                                  }}>{getSectionLabel(k)}</Typography>
                                </Box>
                                {idx < sectionKeys.length - 1 && (
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, opacity: 0.45 }}>
                                    <polyline points="9 6 15 12 9 18" stroke={dk(isDark, "#9FB89E", "#A9AEA2")} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </Box>
                      </Box>



                            </>
                          )}
                          footerSlot={(
                            <>
                      {/* Integrated nav (moved into SectionPage content) */}
                      <Box sx={{
                        mt: 3, pt: 2.5, pb: 1,
                        borderTop: dk(isDark, "1px solid rgba(60,96,88,.15)", "1px solid #EFF2EC"),
                        display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", columnGap: 2,
                      }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Button onClick={() => currentIdx > 0 && goTo(sectionKeys[currentIdx - 1])} disabled={currentIdx === 0} variant="outlined" sx={{
                            borderRadius: 99, px: 2.25, height: 36, fontWeight: 600, fontSize: 12.5, textTransform: "none",
                            borderColor: dk(isDark, "rgba(60,96,88,.3)", "#E7EAE3"), color: dk(isDark, "rgba(168,191,167,.7)", "#55584F"),
                            minWidth: 0, bgcolor: "transparent",
                            "&:hover": { borderColor: dk(isDark, "rgba(159,184,158,.5)", "#5E815D"), color: dk(isDark, "#ffffff", "#5E815D"), bgcolor: dk(isDark, "rgba(3,32,28,1)", "#fff"), boxShadow: dk(isDark, "0 4px 16px rgba(0,0,0,.4)", "0 2px 8px rgba(94,129,93,.1)") },
                            "&.Mui-disabled": { opacity: 0.25 },
                          }}>← Back</Button>

                          <Button onClick={handleAddPage} variant="outlined" startIcon={<Plus size={12} />} sx={{
                            borderRadius: 99, px: 2, height: 36, fontWeight: 600, fontSize: 12, textTransform: "none", gap: 0.5,
                            borderColor: dk(isDark, "rgba(46,110,98,.3)", "#D6E4E0"), color: dk(isDark, "#6FA095", "#1D5A50"), bgcolor: "transparent",
                            "&:hover": { borderColor: dk(isDark, "rgba(111,160,149,.6)", "#1D5A50"), color: dk(isDark, "#ffffff", "#0A3A34"), bgcolor: dk(isDark, "rgba(3,32,28,1)", "#fff"), boxShadow: dk(isDark, "0 4px 16px rgba(0,0,0,.4)", "0 2px 8px rgba(29,90,80,.1)") },
                          }}>Add Page</Button>

                          {/* Page section controls (when on a page section) */}
                          {currentKey.startsWith("__page_") && !confirmClearPage && !confirmDeletePage && (
                            <Box sx={{ display: "flex", alignItems: "stretch", border: "1.5px solid #E7EFEC", borderRadius: 99, overflow: "hidden", bgcolor: "#FAFCFB", height: 34 }}>
                              <PillBtn onClick={() => setShowPageWriter(true)} icon={<Plus size={12} />} label="Add Content" color="#1D5A50" isDark={isDark} />
                              <PillBtn onClick={() => setConfirmClearPage(true)} icon={<Trash2 size={12} />} label="Clear" color="#ef4444" isDark={isDark} />
                              <PillBtn onClick={() => setConfirmDeletePage(true)} icon={<Trash2 size={12} />} label="Delete Page" color="#dc2626" isDark={isDark} bold borderRight={false} />
                            </Box>
                          )}

                          {/* Page action group (when NOT on a page section but pages exist) */}
                          {pageWriterParaIdx >= 0 && !confirmClearPage && !confirmDeletePage && !currentKey.startsWith("__page_") && (() => {
                            const sortedBreaks = [...allPageBreaks].sort((a, b) => a - b);
                            const multiPage = sortedBreaks.length > 1;
                            const openPicker = (e, action) => { setPendingAction(action); setPagePickerEl(e.currentTarget); };
                            const doWrite = () => setShowPageWriter(true);
                            const doClear = () => setConfirmClearPage(true);
                            const doDelete = () => setConfirmDeletePage(true);

                            return (
                              <>
                                <Menu anchorEl={pagePickerEl} open={Boolean(pagePickerEl)}
                                  onClose={() => { setPagePickerEl(null); setPendingAction(null); }}
                                  anchorOrigin={{ vertical: "top", horizontal: "left" }} transformOrigin={{ vertical: "bottom", horizontal: "left" }}
                                  PaperProps={{ sx: { mb: 0.5, borderRadius: 2.5, boxShadow: "0 8px 32px rgba(0,0,0,.14)", border: "1px solid #E7EFEC", minWidth: 200, py: 0.75, overflow: "hidden" } }}>
                                  <Box sx={{ px: 2, pt: 0.5, pb: 1.25, borderBottom: "1px solid #F1F6F4" }}>
                                    <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: "#1D5A50", textTransform: "uppercase", letterSpacing: ".06em" }}>
                                      {pendingAction === "write" && "Write on which page?"}
                                      {pendingAction === "clear" && "Clear which page?"}
                                      {pendingAction === "delete" && "Delete which page?"}
                                    </Typography>
                                  </Box>
                                  {sortedBreaks.map((breakIdx, i) => {
                                    const linesOnPage = fields.filter((f) => {
                                      const next = sortedBreaks[i + 1] ?? Infinity;
                                      return f.source === "body" && f.paraIndex > breakIdx && f.paraIndex < next && !f.isHeader;
                                    }).length;
                                    return (
                                      <MenuItem key={breakIdx} onClick={() => {
                                        setPageWriterParaIdx(breakIdx); setPagePickerEl(null);
                                        if (pendingAction === "write") setShowPageWriter(true);
                                        if (pendingAction === "clear") setConfirmClearPage(true);
                                        if (pendingAction === "delete") setConfirmDeletePage(true);
                                        setPendingAction(null);
                                      }} sx={{ px: 2, py: 1, minHeight: 0, "&:hover": { bgcolor: "rgba(29,90,80,0.07)" } }}>
                                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, width: "100%" }}>
                                          <Box sx={{ width: 26, height: 26, borderRadius: 1.5, bgcolor: "#F1F6F4", border: "1.5px solid #D6E4E0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                            <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: "#1D5A50" }}>{i + 1}</Typography>
                                          </Box>
                                          <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#3A3D37" }}>Page {i + 1}</Typography>
                                            <Typography sx={{ fontSize: 11, color: "#7A8073" }}>{linesOnPage === 0 ? "empty" : `${linesOnPage} line${linesOnPage !== 1 ? "s" : ""}`}</Typography>
                                          </Box>
                                        </Box>
                                      </MenuItem>
                                    );
                                  })}
                                </Menu>

                                <Box sx={{ display: "flex", alignItems: "stretch", border: "1.5px solid #E7EFEC", borderRadius: 99, overflow: "hidden", bgcolor: "#FAFCFB", height: 34 }}>
                                  <Box component="button" onClick={(e) => multiPage ? openPicker(e, "write") : doWrite()} sx={{
                                    px: 1.75, display: "flex", alignItems: "center", gap: 0.75, border: "none", bgcolor: "transparent",
                                    cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#1D5A50", fontFamily: "'Jost',sans-serif",
                                    borderRight: "1.5px solid #E7EFEC", whiteSpace: "nowrap", transition: "background .12s",
                                    "&:hover": { bgcolor: "rgba(29,90,80,0.09)" },
                                  }}>
                                    <Edit2 size={12} /> Write {multiPage && <ChevronDown size={9} style={{ marginLeft: 2, opacity: 0.7 }} />}
                                  </Box>
                                  <Box component="button" onClick={(e) => multiPage ? openPicker(e, "clear") : doClear()} sx={{
                                    px: 1.75, display: "flex", alignItems: "center", gap: 0.75, border: "none", bgcolor: "transparent",
                                    cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#ef4444", fontFamily: "'Jost',sans-serif",
                                    borderRight: "1.5px solid #E7EFEC", whiteSpace: "nowrap", transition: "background .12s",
                                    "&:hover": { bgcolor: "rgba(239,68,68,0.07)" },
                                  }}>
                                    <Trash2 size={12} /> Clear {multiPage && <ChevronDown size={9} style={{ marginLeft: 2, opacity: 0.7 }} />}
                                  </Box>
                                  <Box component="button" onClick={(e) => multiPage ? openPicker(e, "delete") : doDelete()} sx={{
                                    px: 1.75, display: "flex", alignItems: "center", gap: 0.75, border: "none", bgcolor: "transparent",
                                    cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#dc2626", fontFamily: "'Jost',sans-serif",
                                    whiteSpace: "nowrap", transition: "background .12s", "&:hover": { bgcolor: "rgba(220,38,38,0.07)" },
                                  }}>
                                    <Trash2 size={12} /> Delete {multiPage && <ChevronDown size={9} style={{ marginLeft: 2, opacity: 0.7 }} />}
                                  </Box>
                                </Box>
                              </>
                            );
                          })()}

                          {/* Confirm strips */}
                          {pageWriterParaIdx >= 0 && confirmClearPage && (
                            <ConfirmStrip
                              label={allPageBreaks.length > 1 ? `Clear Page ${[...allPageBreaks].sort((a, b) => a - b).indexOf(pageWriterParaIdx) + 1}?` : "Clear page content?"}
                              onCancel={() => setConfirmClearPage(false)} onConfirm={handleClearPageBlock} confirmLabel="Clear" isDanger={false}
                            />
                          )}
                          {pageWriterParaIdx >= 0 && confirmDeletePage && (
                            <ConfirmStrip
                              label={allPageBreaks.length > 1 ? `Delete Page ${[...allPageBreaks].sort((a, b) => a - b).indexOf(pageWriterParaIdx) + 1}?` : "Delete this page?"}
                              onCancel={() => setConfirmDeletePage(false)} onConfirm={handleDeletePage} confirmLabel="Delete" isDanger
                            />
                          )}
                        </Stack>

                        <Typography sx={{ fontSize: 12, color: dk(isDark, "rgba(130,160,255,.45)", "#7A8073"), fontWeight: 600, textAlign: "center", whiteSpace: "nowrap", fontFamily: "'Jost',sans-serif" }}>
                          {currentIdx + 1} / {sectionKeys.length}
                        </Typography>

                        {currentIdx < sectionKeys.length - 1 ? (
                          <Button onClick={() => goTo(sectionKeys[currentIdx + 1])} variant="contained"
                            title={`Next: ${getSectionLabel(sectionKeys[currentIdx + 1])}`}
                            sx={{
                            justifySelf: "end",
                            borderRadius: 99, px: 3, height: 40, fontWeight: 700, fontSize: 13, textTransform: "none", whiteSpace: "nowrap",
                            background: dk(isDark, "linear-gradient(135deg,#5E815D,#9FB89E)", "linear-gradient(135deg,#5E815D,#7F9E7E)"),
                            boxShadow: dk(isDark, "0 4px 18px rgba(94,129,93,.45)", "0 4px 14px rgba(94,129,93,.28)"),
                            "&:hover": { boxShadow: dk(isDark, "0 6px 26px rgba(94,129,93,.6)", "0 6px 20px rgba(94,129,93,.38)"), filter: "brightness(1.1)" },
                          }}>Save & Next →</Button>
                        ) : (
                          <Box sx={{
                            justifySelf: "end",
                            "& .MuiButton-root": {
                              borderRadius: "99px !important", px: 3, height: 40, fontWeight: 700, fontSize: 13,
                              background: "linear-gradient(135deg,#16a34a,#22c55e) !important",
                              boxShadow: dk(isDark, "0 4px 18px rgba(22,163,74,.4)", "0 4px 14px rgba(22,163,74,.28)"),
                              "&:hover": { boxShadow: dk(isDark, "0 6px 26px rgba(22,163,74,.55)", "0 6px 20px rgba(22,163,74,.38)"), filter: "brightness(1.06)" },
                            },
                          }}>
                            <DownloadDropdown onDocx={downloadDocx} onPdf={downloadPdf} />
                          </Box>
                        )}
                      </Box>

                            </>
                          )}
                        />
                      </Box>

                    </Box>
                  );
                })()}
              </Box>
              </Box>
            </Box>
          </>
        )}

        {/* AI Chat FAB — sits ABOVE the footer bar so it never covers
            the Next/Download button. */}
        {appView === "editor" && !showAIChat && (
          <Box onClick={() => { setShowAIChat(true); setShowJDManager(false); setShowMatchPanel(false); setCompareMode(false); }} title="AI Resume Coach" sx={{
            position: "fixed", bottom: 12, right: 16, zIndex: 250, width: 44, height: 44, borderRadius: "50%",
            background: "linear-gradient(135deg,#1D5A50,#2E6E62)",
            boxShadow: "0 4px 20px rgba(29,90,80,.45)",
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
            transition: "all .2s", "&:hover": { transform: "scale(1.08)", boxShadow: "0 6px 28px rgba(29,90,80,.65)" },
          }}>
            <Sparkles size={18} color="#fff" />
          </Box>
        )}
      </Box>
    </ThemeProvider>
  );
}
export default AIResumeBuilderApp;