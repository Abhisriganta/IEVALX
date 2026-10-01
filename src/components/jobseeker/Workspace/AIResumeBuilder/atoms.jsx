// ============================================================================
// atoms.jsx — Shared micro-components: Ico, SpinnerEl, PillEl, RippleBtn,
//             Toast, ScoreRing, TBtn, DownloadDropdown.
// Location: src/components/jobseeker/Workspace/AIResumeBuilder/atoms.jsx
// ============================================================================

import React, { useState, useEffect, useRef } from "react";
import { Box, Button, Typography, Menu, MenuItem } from "@mui/material";
import {
  Edit2, Check, X, RotateCcw, Search, Plus, Trash2, Layers,
  Zap, FileText, Activity, AlignLeft, AlignCenter, AlignRight,
  AlignJustify, ChevronDown,
} from "lucide-react";

const Ico = {
  Dl:    () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  Ed:    () => <Edit2 size={13} />,
  Ok:    () => <Check size={13} />,
  X:     () => <X size={13} />,
  Rst:   () => <RotateCcw size={14} />,
  Srch:  () => <Search size={14} />,
  Plus:  () => <Plus size={11} />,
  Trash: () => <Trash2 size={12} />,
  Layers:() => <Layers size={14} />,
  Zap:   () => <Zap size={13} />,
  Grip:  () => <svg width="6" height="20" viewBox="0 0 6 20" fill="currentColor"><circle cx="1.5" cy="2" r="1.2"/><circle cx="4.5" cy="2" r="1.2"/><circle cx="1.5" cy="7" r="1.2"/><circle cx="4.5" cy="7" r="1.2"/><circle cx="1.5" cy="12" r="1.2"/><circle cx="4.5" cy="12" r="1.2"/><circle cx="1.5" cy="17" r="1.2"/><circle cx="4.5" cy="17" r="1.2"/></svg>,
  JD:    () => <FileText size={14} />,
  Match: () => <Activity size={14} />,
  AlL:   () => <AlignLeft size={11} />,
  AlC:   () => <AlignCenter size={11} />,
  AlR:   () => <AlignRight size={11} />,
  AlJ:   () => <AlignJustify size={11} />,
};

const SpinnerEl = ({ size = 14, color = "#5E815D" }) => (
  <span style={{ width: size, height: size, border: `2px solid ${color}30`, borderTop: `2px solid ${color}`, borderRadius: "50%", animation: "spin .7s linear infinite", display: "inline-block", flexShrink: 0 }} />
);

const PillEl = ({ children, bg = "#F0F2ED", color = "#3A3D37", border = "#E7EAE3", style: sx }) => (
  <span style={{ fontSize: 10, padding: "3px 9px", borderRadius: 99, background: bg, color, border: `1px solid ${border}`, fontWeight: 600, letterSpacing: ".03em", fontFamily: "'Jost',sans-serif", ...sx }}>{children}</span>
);

function RippleBtn({ children, variant = "default", disabled, onClick, style: sx, className = "", ...rest }) {
  const ref = useRef(null);
  const fire = (e) => {
    if (disabled) return;
    const btn = ref.current; if (!btn) return;
    const rect = btn.getBoundingClientRect(); const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2; const y = e.clientY - rect.top - size / 2;
    const rip = document.createElement("span"); rip.className = "ripple-effect";
    rip.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px`;
    btn.appendChild(rip); setTimeout(() => rip.remove(), 600);
    if (onClick) onClick(e);
  };
  const base = { padding: "6px 13px", borderRadius: 7, border: "none", cursor: disabled ? "not-allowed" : "pointer", fontSize: 11.5, fontWeight: 600, fontFamily: "'Jost',sans-serif", display: "flex", alignItems: "center", gap: 5, transition: "all .15s", opacity: disabled ? .45 : 1 };
  const variants = {
    default: { background: "#F8FAF6", color: "#3A3D37", border: "1px solid #E7EAE3" },
    accent:  { background: "#5E815D", color: "#fff", boxShadow: "0 2px 8px rgba(94,129,93,0.25)" },
    green:   { background: "#16a34a", color: "#fff" },
    ghost:   { background: "transparent", color: "#3A3D37", border: "1px solid #E7EAE3" },
    teal:    { background: "#2E6E62", color: "#fff" },
  };
  return <button ref={ref} onClick={fire} disabled={disabled} className={`ripple-container ${className}`} style={{ ...base, ...variants[variant], ...sx }} {...rest}>{children}</button>;
}

function Toast({ message, type = "info", onDone }) {
  const [exiting, setExiting] = useState(false);
  const [progress, setProgress] = useState(100);
  useEffect(() => {
    const dur = 2600; const start = performance.now();
    const tick = (now) => { const p = Math.max(0, 100 - ((now - start) / dur) * 100); setProgress(p); if (p > 0) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    const t1 = setTimeout(() => setExiting(true), dur); const t2 = setTimeout(() => onDone?.(), dur + 380);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);
  const C = { info: { bg: "#EDF3EC", border: "#D7E3D6", color: "#022124", bar: "#5E815D", icon: "ℹ" }, success: { bg: "#f0fdf4", border: "#bbf7d0", color: "#15803d", bar: "#16a34a", icon: "✓" }, error: { bg: "#fef2f2", border: "#fecaca", color: "#dc2626", bar: "#ef4444", icon: "✗" } }[type] || { bg: "#EDF3EC", border: "#D7E3D6", color: "#022124", bar: "#5E815D", icon: "ℹ" };
  return (
    <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, borderRadius: 12, background: C.bg, border: `1px solid ${C.border}`, boxShadow: "0 8px 30px rgba(0,0,0,.12)", animation: exiting ? "none" : "fadeIn .3s ease", overflow: "hidden", minWidth: 230, opacity: exiting ? 0 : 1, transition: "opacity .3s" }}>
      <div style={{ padding: "12px 18px", display: "flex", alignItems: "center", gap: 9, color: C.color, fontSize: 12.5, fontWeight: 600, fontFamily: "'Jost',sans-serif" }}>
        <span style={{ fontSize: 14, lineHeight: 1 }}>{C.icon}</span>{message}
      </div>
      <div style={{ height: 2, background: `${C.bar}30` }}><div style={{ height: "100%", width: `${progress}%`, background: C.bar, transition: "width .1s linear" }} /></div>
    </div>
  );
}


function ScoreRing({ score, size = 80, strokeWidth = 6 }) {
  const r = size / 2 - strokeWidth; const circ = 2 * Math.PI * r; const offset = circ - (score / 100) * circ;
  const color = "#16a34a";
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E7EAE3" strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className="score-ring" />
      <text x={size / 2} y={size / 2 + 1} textAnchor="middle" dominantBaseline="middle"
        style={{ transform: `rotate(90deg)`, transformOrigin: `${size / 2}px ${size / 2}px`, fill: color, fontSize: size * .22, fontWeight: 800, fontFamily: "'Jost',sans-serif" }}>
        {score}%
      </text>
    </svg>
  );
}

function TBtn({ icon, label, hoverBg, hoverColor, hoverBorder, active, onClick, isNight = false }) {
  const [hov, setHov] = useState(false);
  const on = active || hov;
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{
      display:"inline-flex", alignItems:"center", gap:5, height:30, padding:"0 11px",
      borderRadius:7, border:`1px solid ${on ? hoverBorder : (isNight ? "rgba(127,158,126,.18)" : "#E7EAE3")}`,
      background: on ? (isNight ? "rgba(5,40,35,.95)" : "#fff") : (isNight ? "rgba(255,255,255,0.04)" : "transparent"),
      color: on ? hoverColor : (isNight ? "rgba(190,210,255,.82)" : "#3A3D37"),
      cursor:"pointer", fontSize:11.5, fontWeight:600, fontFamily:"'Jost',sans-serif",
      transition:"all .18s", whiteSpace:"nowrap", flexShrink:0,
      boxShadow: on && isNight ? `0 0 14px ${hoverBg}44` : (on && !isNight ? "0 2px 8px rgba(0,0,0,.06)" : "none"),
    }}>
      <span style={{ display:"inline-flex", alignItems:"center", opacity: isNight && !on ? 0.8 : 1 }}>{icon}</span>
      {label}
    </button>
  );
}


function DownloadDropdown({ onDocx, onPdf }) {
  const [open, setOpen] = useState(false);
  // [FIX] Use a ref to anchor the Menu instead of e.currentTarget.
  // e.currentTarget becomes null in React's synthetic event system by the
  // time the state update is processed, so anchorEl was always null and
  // the Menu never opened. A ref to the button element is always stable.
  const btnRef = useRef(null);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const handleDocx = (e) => {
    handleClose();
    if (onDocx) onDocx(e);
  };

  const handlePdf = (e) => {
    handleClose();
    if (onPdf) onPdf(e);
  };

  return (
    <>
      <Button
        ref={btnRef}
        variant="contained"
        endIcon={<ChevronDown size={12} style={{ transition: "transform .2s", transform: open ? "rotate(180deg)" : "none" }} />}
        startIcon={<Ico.Dl />}
        onClick={handleOpen}
        sx={{
          gap: 0.75, height: 32, px: 1.5, fontSize: 11.5, borderRadius: "8px",
          bgcolor: "#022124", color: "#fff",
          fontFamily: "'Jost','DM Sans',sans-serif", fontWeight: 700, textTransform: "none",
          boxShadow: "0 2px 10px rgba(2,33,36,0.25)",
          "&:hover": { bgcolor: "#0A3A38", boxShadow: "0 4px 14px rgba(2,33,36,0.32)" },
        }}
      >
        Download
      </Button>

      {/* [FIX] zIndex: 1500 is required because the entire ResumeStudio app
          sits inside a <Box sx={{ position:"fixed", zIndex: 1400 }}>.
          MUI Menu renders via a Portal to document.body with default
          zIndex of 1300, which puts it BEHIND the app overlay.
          Bumping to 1500 ensures the dropdown appears on top. */}
      <Menu
        anchorEl={btnRef.current}
        open={open}
        onClose={handleClose}
        sx={{ zIndex: 1500 }}
        PaperProps={{ sx: { mt: 0.75, borderRadius: 2, boxShadow: "0 8px 30px rgba(0,0,0,.12)", border: "1px solid #E7EAE3", minWidth: 180 } }}
      >
        <MenuItem
          onClick={handleDocx}
          sx={{ display: "flex", alignItems: "center", gap: 1.25, px: 1.75, py: 1.25, borderBottom: "1px solid #E7EAE3" }}
        >
          <Box sx={{ width: 30, height: 30, borderRadius: 1.75, bgcolor: "rgba(94,129,93,0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "#7F9E7E", fontSize: 13, fontWeight: 800, flexShrink: 0 }}>W</Box>
          <Box>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: "text.primary" }}>Word Document</Typography>
            <Typography sx={{ fontSize: 10, color: "text.disabled" }}>.docx</Typography>
          </Box>
        </MenuItem>

        <MenuItem
          onClick={handlePdf}
          sx={{ display: "flex", alignItems: "center", gap: 1.25, px: 1.75, py: 1.25 }}
        >
          <Box sx={{ width: 30, height: 30, borderRadius: 1.75, bgcolor: "rgba(220,38,38,0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "#ef4444", fontSize: 13, fontWeight: 800, flexShrink: 0 }}>P</Box>
          <Box>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: "text.primary" }}>PDF File</Typography>
            <Typography sx={{ fontSize: 10, color: "text.disabled" }}>.pdf</Typography>
          </Box>
        </MenuItem>
      </Menu>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   JD MANAGER PANEL
══════════════════════════════════════════════════════════════════════ */

export { Ico, SpinnerEl, PillEl, RippleBtn, Toast, ScoreRing, TBtn, DownloadDropdown };