// ============================================================================
// LandingSteps.jsx — All landing / onboarding screens:
//   LandingNav, NightScene, HeroStep, FeaturesSection, ChoiceStep,
//   UploadStep, ProcessingStep, SuccessStep.
// Location: src/components/jobseeker/Workspace/AIResumeBuilder/LandingSteps.jsx
// ============================================================================

import React, { useState, useRef, useEffect } from "react";
import {
  Box, Button, Typography, Paper, CircularProgress, Stack,
} from "@mui/material";
import {
  ArrowLeft, CheckCircle2, Sparkles, ChevronRight, Zap,
  ShieldCheck, Clock, FileText, Upload, FileDown, Edit2,
} from "lucide-react";
import { SpinnerEl, RippleBtn } from "./atoms";
import { alpha } from "@mui/material/styles";

function LandingNav({ onLogoClick, onBack, isDark, onToggleDark }) {
  const line = isDark ? "rgba(255,255,255,0.08)" : "#E7EAE3";
  return (
    <Box component="nav" sx={{
      height: 60, px: { xs: 2, sm: 2.5 },
      display: "flex", alignItems: "center",
      borderBottom: `1px solid ${line}`,
      bgcolor: isDark ? "#04241F" : "#FFFFFF",
      position: "sticky", top: 0, zIndex: 50,
      transition: "background .4s, border-color .4s",
    }}>
      <Box sx={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5 }}>
        {/* Left cluster: back + divider + brand */}
        <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1, sm: 1.75 }, minWidth: 0 }}>
          {onBack && (
            <Box
              onClick={onBack}
              role="button"
              title="Back to iEvalx"
              sx={{
                display: "flex", alignItems: "center", gap: 0.75,
                height: 36, px: { xs: 1.1, sm: 1.6 },
                borderRadius: "10px", cursor: "pointer", flexShrink: 0,
                color: isDark ? "#C0D2BF" : "#3A3D37",
                transition: "all .15s ease",
                "&:hover": {
                  bgcolor: isDark ? "rgba(159,184,158,.1)" : "#F1F4EE",
                  color: isDark ? "#E7EFE6" : "#022124",
                },
              }}
            >
              <ArrowLeft size={16} strokeWidth={2.25} />
              <Typography sx={{
                fontFamily: "'Jost',sans-serif", fontWeight: 700, fontSize: 13,
                letterSpacing: "-.01em", color: "inherit", whiteSpace: "nowrap",
                display: { xs: "none", sm: "block" },
              }}>
                Back to iEvalx
              </Typography>
            </Box>
          )}

          {onBack && (
            <Box sx={{ width: "1px", height: 24, bgcolor: line, flexShrink: 0, display: { xs: "none", sm: "block" } }} />
          )}

          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, cursor: "pointer", minWidth: 0 }} onClick={onLogoClick}>
            <Box sx={{
              width: 34, height: 34, flexShrink: 0,
              bgcolor: isDark ? "rgba(127,158,126,.16)" : "#EDF3EC",
              border: `1px solid ${isDark ? "rgba(159,184,158,.25)" : "#D7E3D6"}`,
              borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Sparkles size={17} color={isDark ? "#9FB89E" : "#5E815D"} />
            </Box>
            <Box sx={{ minWidth: 0, display: "flex", alignItems: "baseline", gap: 1 }}>
              <Typography noWrap sx={{
                fontFamily: "'Jost',sans-serif", fontWeight: 800, fontSize: 16.5,
                color: isDark ? "#E7EFE6" : "#101210", letterSpacing: "-0.02em",
                lineHeight: 1, transition: "color .4s",
              }}>
                ResumeAI
              </Typography>
              <Typography noWrap sx={{
                fontFamily: "'Jost',sans-serif", fontWeight: 600, fontSize: 11,
                color: isDark ? "rgba(168,191,167,.55)" : "#7A8073",
                letterSpacing: ".02em", lineHeight: 1,
                display: { xs: "none", md: "block" },
              }}>
                AI resume builder
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Right: theme toggle — quiet, neutral chip */}
        <Box onClick={onToggleDark} role="button" title={isDark ? "Switch to light mode" : "Switch to night mode"}
          sx={{
            width: 36, height: 36, flexShrink: 0, borderRadius: "10px",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            color: isDark ? "#C0D2BF" : "#55584F",
            border: `1px solid ${line}`,
            bgcolor: isDark ? "rgba(159,184,158,.06)" : "#F8FAF6",
            transition: "all .15s ease",
            "&:hover": {
              bgcolor: isDark ? "rgba(159,184,158,.14)" : "#EDF3EC",
              color: isDark ? "#E7EFE6" : "#022124",
              borderColor: isDark ? "rgba(159,184,158,.35)" : "#D7E3D6",
            },
          }}>
          {isDark ? (
            /* Moon SVG — neutral, inherits chip color */
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            /* Sun SVG — neutral, inherits chip color */
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="4.25" fill="none" stroke="currentColor" strokeWidth="1.8"/>
              <line x1="12" y1="2.5" x2="12" y2="5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              <line x1="12" y1="19" x2="12" y2="21.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              <line x1="4.6" y1="4.6" x2="6.4" y2="6.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              <line x1="17.6" y1="17.6" x2="19.4" y2="19.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              <line x1="2.5" y1="12" x2="5" y2="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              <line x1="19" y1="12" x2="21.5" y2="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              <line x1="4.6" y1="19.4" x2="6.4" y2="17.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              <line x1="17.6" y1="6.4" x2="19.4" y2="4.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          )}
        </Box>
      </Box>
    </Box>
  );
}

function NightScene() {
  const sceneRef = React.useRef(null);
  React.useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    // Stars
    for (let i = 0; i < 130; i++) {
      const s = document.createElement("div");
      const sz = Math.random() * 2 + 0.4;
      const dur = 2 + Math.random() * 5;
      const del = Math.random() * 7;
      s.style.cssText = `position:absolute;border-radius:50%;background:#fff;width:${sz}px;height:${sz}px;left:${Math.random()*100}%;top:${Math.random()*80}%;opacity:${0.1+Math.random()*0.4};animation:twinkle-star ${dur}s ${del}s ease-in-out infinite;pointer-events:none`;
      scene.appendChild(s);
    }
    // Birds
    const birdPaths = [
      "M0,5 C4,1 8,1 12,5 C16,1 20,1 24,5",
      "M0,4 C3,0 7,0 10,4 C13,0 17,0 20,4",
      "M0,3 C2,0 5,0 8,3 C11,0 14,0 16,3",
    ];
    const birds = [
      {top:"11%",dur:24,del:0,sz:1,dir:1},{top:"17%",dur:32,del:7,sz:.7,dir:-1},
      {top:"7%",dur:27,del:13,sz:.9,dir:1},{top:"21%",dur:36,del:2,sz:.6,dir:-1},
      {top:"5%",dur:21,del:19,sz:1.1,dir:1},{top:"14%",dur:29,del:25,sz:.65,dir:1},
      {top:"9%",dur:33,del:10,sz:.8,dir:-1},{top:"19%",dur:25,del:28,sz:.55,dir:1},
    ];
    birds.forEach(({top,dur,del,sz,dir}) => {
      const b = document.createElement("div");
      const p = birdPaths[Math.floor(Math.random()*birdPaths.length)];
      b.innerHTML = `<svg width="${24*sz}" height="${10*sz}" viewBox="0 0 24 10" fill="none"><path d="${p}" stroke="rgba(170,195,255,0.65)" stroke-width="1.4" stroke-linecap="round" fill="none"/></svg>`;
      b.style.cssText = `position:absolute;top:${top};pointer-events:none;z-index:3;opacity:.7;animation:${dir===1?"fly-right":"fly-left"} ${dur}s ${del}s linear infinite`;
      scene.appendChild(b);
    });
    // Shooting stars
    let timer;
    const shoot = () => {
      const s = document.createElement("div");
      s.style.cssText = `position:absolute;top:${4+Math.random()*28}%;left:${10+Math.random()*45}%;width:2px;height:2px;border-radius:50%;background:#fff;pointer-events:none;z-index:4;animation:shoot-star ${0.7+Math.random()*0.5}s ease-out forwards`;
      scene.appendChild(s);
      setTimeout(()=>s.remove(), 1400);
      timer = setTimeout(shoot, 5000 + Math.random()*9000);
    };
    timer = setTimeout(shoot, 2500);
    return () => { clearTimeout(timer); };
  }, []);
  return (
    <Box ref={sceneRef} sx={{ position:"fixed", inset:0, zIndex:0, overflow:"hidden", pointerEvents:"none",
      background:"radial-gradient(ellipse 90% 65% at 50% 0%, #0A3A34 0%, #03201C 60%)" }}>
      {/* Lamp glow source at top-center */}
      <Box sx={{ position:"absolute", top:"-10px", left:"50%", transform:"translateX(-50%)",
        width:32, height:32, borderRadius:"50%",
        background:"radial-gradient(circle,#ffe07a 0%,#ffd040 45%,transparent 70%)",
        animation:"lamp-glow 4s ease-in-out infinite", zIndex:6 }} />
      {/* Wide beam */}
      <Box sx={{ position:"absolute", top:0, left:"50%", transform:"translateX(-50%)",
        width:0, height:0,
        borderLeft:"260px solid transparent", borderRight:"260px solid transparent",
        borderTop:"820px solid rgba(255,215,75,.038)",
        filter:"blur(22px)", zIndex:1, animation:"beam-blink 4s ease-in-out infinite" }} />
      {/* Tight inner beam */}
      <Box sx={{ position:"absolute", top:0, left:"50%", transform:"translateX(-50%)",
        width:0, height:0,
        borderLeft:"100px solid transparent", borderRight:"100px solid transparent",
        borderTop:"550px solid rgba(255,228,110,.05)",
        filter:"blur(10px)", zIndex:2, animation:"beam-blink 4s ease-in-out infinite" }} />
      {/* Moon */}
      <Box sx={{ position:"absolute", top:28, right:"11%", width:36, height:36,
        borderRadius:"50%", background:"#f0e880",
        boxShadow:"0 0 18px rgba(240,232,128,.38)", zIndex:3 }}>
        <Box sx={{ position:"absolute", top:4, right:-3, width:28, height:28,
          borderRadius:"50%", background:"#03201C" }} />
      </Box>
      {/* Laptop at beam bottom */}
      <Box sx={{ position:"absolute", bottom:36, left:"50%", transform:"translateX(-50%)", zIndex:5, opacity:.8 }}>
        <Box sx={{ width:108, height:68, background:"#0A3A34", border:"2.5px solid #0F4A42",
          borderRadius:"5px 5px 0 0", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", position:"relative" }}>
          <Box sx={{ position:"absolute", inset:0, background:"linear-gradient(150deg,rgba(255,218,75,.14) 0%,transparent 55%)", animation:"screen-pulse 4s ease-in-out infinite" }} />
          <Stack spacing={0.75} sx={{ width:"78%", opacity:.45 }}>
            {[1,.7,.55].map((w,i)=><Box key={i} sx={{ height:"2.5px", bgcolor:"#7F9E7E", borderRadius:2, width:`${w*100}%` }} />)}
          </Stack>
        </Box>
        <Box sx={{ width:126, height:5, background:"#083630", borderRadius:"0 0 3px 3px" }} />
        <Box sx={{ width:140, height:2.5, background:"#062C26", borderRadius:2, mt:"1px", mx:"auto" }} />
      </Box>
    </Box>
  );
}

function HeroStep({ onNext, isDark = true }) {
  return (
    <Box sx={{ position:"relative", minHeight:"calc(100vh - 60px)", display:"flex", alignItems:"center" }}>
      <Box sx={{ maxWidth:1200, mx:"auto", px:{xs:2,sm:3,lg:4}, py:{xs:6,sm:8,lg:10}, width:"100%",
        display:"flex", flexDirection:{xs:"column",lg:"row"}, alignItems:"center", gap:{xs:6,lg:10},
        animation:"night-fade-up .7s ease", position:"relative", zIndex:5 }}>

        {/* LEFT text */}
        <Box sx={{ flex:1, textAlign:{xs:"center",lg:"left"} }}>
          {/* Badge */}
          <Box sx={{ display:"inline-flex", alignItems:"center", gap:1, bgcolor:"rgba(255,255,255,0.07)",
            border:"1px solid rgba(255,255,255,0.12)", borderRadius:99, px:1.75, py:0.75, mb:3.5 }}>
            <Box sx={{ width:7, height:7, borderRadius:"50%", bgcolor:"#5dff90",
              animation:"badge-dot-night 2s infinite", boxShadow:"0 0 8px rgba(93,255,144,.6)" }} />
            <Typography sx={{ fontFamily:"'Jost',sans-serif", fontSize:12, fontWeight:600,
              color: isDark ? "rgba(255,255,255,.65)" : "#15803d", letterSpacing:".02em" }}>48,834 resumes crafted today</Typography>
          </Box>

          <Typography sx={{ fontFamily:"'Jost',sans-serif", fontWeight:800,
            fontSize:{xs:"2.4rem",sm:"3.2rem",lg:"4.2rem"}, lineHeight:1.06,
            color: isDark ? "#f0efeb" : "#101210", letterSpacing:"-.03em", mb:2.5, transition:"color .4s" }}>
            Your resume,<br/>built for the<br/>
            <Box component="span" sx={{ color: isDark ? "#9FB89E" : "#5E815D" }}>night shift</Box>
          </Typography>

          <Typography sx={{ fontFamily:"'Jost',sans-serif", fontSize:{xs:15,sm:17},
            color: isDark ? "rgba(190,205,255,.52)" : "#55584F", maxWidth:440, mx:{xs:"auto",lg:0},
            mb:4, lineHeight:1.7 }}>
            The first step to a better job? A better CV. Only 2% of CVs win — and yours will be one of them.
          </Typography>

          <Stack direction={{xs:"column",sm:"row"}} spacing={2}
            justifyContent={{xs:"center",lg:"flex-start"}} alignItems="center" sx={{ mb:5 }}>
            <Button variant="contained" size="large"
              endIcon={<ChevronRight size={18} style={{transition:"transform .2s"}} />}
              onClick={onNext}
              sx={{ px:4, py:1.5, fontSize:16, borderRadius:50,
                background:"#5E815D",
                boxShadow:"0 4px 24px rgba(94,129,93,.5), 0 0 0 1px rgba(100,150,255,.3)",
                "&:hover":{ background:"#7F9E7E", boxShadow:"0 6px 32px rgba(94,129,93,.65)", "& svg":{transform:"translateX(4px)"} },
                width:{xs:"100%",sm:"auto"} }}>
              Create Resume
            </Button>
            <Stack direction="row" spacing={2} alignItems="center">
              <Stack direction="row" spacing={0.5} alignItems="center">
                <ShieldCheck size={14} color="#5dff90" />
                <Typography sx={{fontSize:13,color:"rgba(180,200,255,.5)",fontWeight:500}}>ATS Friendly</Typography>
              </Stack>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Clock size={14} color="#9FB89E" />
                <Typography sx={{fontSize:13,color:"rgba(180,200,255,.5)",fontWeight:500}}>5 Min Setup</Typography>
              </Stack>
            </Stack>
          </Stack>

          <Stack direction="row" spacing={{xs:5,sm:10}} justifyContent={{xs:"center",lg:"flex-start"}}
            sx={{ pt:4, borderTop:"1px solid rgba(255,255,255,0.08)" }}>
            {[{val:"48%",desc:"more likely to get hired"},{val:"12%",desc:"better pay with next job"}].map(s=>(
              <Box key={s.val}>
                <Typography sx={{ fontSize:{xs:22,sm:28}, fontWeight:800, color: isDark ? "#e8eeff" : "#101210",
                  fontFamily:"'Jost',sans-serif" }}>{s.val}</Typography>
                <Typography sx={{ fontSize:12, color: isDark ? "rgba(170,190,255,.45)" : "#55584F" }}>{s.desc}</Typography>
              </Box>
            ))}
          </Stack>
        </Box>

        {/* RIGHT card */}
        <Box sx={{ flex:1, maxWidth:{xs:420,lg:"none"}, width:"100%", position:"relative" }}>
          {/* Floating check badge */}
          <Box sx={{ display:{xs:"none",sm:"flex"}, position:"absolute", top:-18, right:-14,
            width:72, height:72, bgcolor:"rgba(13,32,80,.8)", borderRadius:3,
            border:"1px solid rgba(100,140,255,.25)", transform:"rotate(12deg)", zIndex:2,
            alignItems:"center", justifyContent:"center",
            boxShadow:"0 8px 32px rgba(0,0,0,.4)" }}>
            <Box sx={{ width:"72%", height:"72%", bgcolor:"rgba(93,255,144,.1)", borderRadius:2,
              display:"flex", alignItems:"center", justifyContent:"center" }}>
              <CheckCircle2 size={26} color="#5dff90" />
            </Box>
          </Box>
          <Box sx={{ borderRadius:3, p:{xs:2.5,sm:3.5},
            background: isDark ? "rgba(13,25,72,.65)" : "#fff",
            border: isDark ? "1px solid rgba(127,158,126,.18)" : "1px solid #E7EAE3",
            boxShadow:"0 0 64px rgba(94,129,93,.12), inset 0 1px 0 rgba(255,255,255,.06)" }}>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb:3 }}>
              <Box sx={{ width:{xs:48,sm:58}, height:{xs:48,sm:58}, borderRadius:3, overflow:"hidden",
                border:"2px solid rgba(100,150,255,.3)", flexShrink:0,
                background:"linear-gradient(135deg,#0F4A42,#0A3A34)",
                display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Typography sx={{ fontFamily:"'Jost',sans-serif", fontWeight:800, fontSize:20, color:"rgba(255,255,255,.9)" }}>SW</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontWeight:700, fontSize:{xs:15,sm:18}, color: isDark ? "#dde8ff" : "#101210" }}>Samantha Williams</Typography>
                <Typography sx={{ fontSize:13, color: isDark ? "rgba(150,175,255,.5)" : "#55584F" }}>Senior Data Analyst</Typography>
              </Box>
            </Stack>
            <Stack spacing={1.25} sx={{ mb:3 }}>
              {[1,.78,.88].map((w,i)=>(
                <Box key={i} sx={{ height:{xs:9,sm:11}, bgcolor: isDark ? "rgba(127,158,126,.12)" : "#EFF2EC",
                  borderRadius:99, width:`${w*100}%` }} />
              ))}
            </Stack>
            <Box sx={{ pt:2.5, borderTop:"1px solid rgba(255,255,255,.07)" }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb:1.5 }}>
                <Zap size={13} color="#9FB89E" fill="#9FB89E" />
                <Typography sx={{ fontSize:10, fontWeight:700, color:"#9FB89E",
                  letterSpacing:".09em", textTransform:"uppercase" }}>AI Enhancement Active</Typography>
              </Stack>
              <Box sx={{ bgcolor: isDark ? "rgba(94,129,93,.1)" : "#EDF3EC", p:{xs:1.5,sm:2}, borderRadius:2.5,
                border: isDark ? "1px solid rgba(94,129,93,.2)" : "1px solid #D7E3D6" }}>
                <Typography sx={{ fontSize:{xs:12,sm:13}, color: isDark ? "rgba(168,191,167,.6)" : "#4A4E45", lineHeight:1.6, fontStyle:"italic" }}>
                  "Optimized your experience section by highlighting 3 key technical achievements that match top-tier job descriptions."
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}



/* ══════════════════════════════════════════════════════════════════════
   FEATURES SECTION  — shown on the hero/landing page
══════════════════════════════════════════════════════════════════════ */
function FeaturesSection({ isDark }) {
  const features = [
    {
      icon: "◎",
      color: "#7F9E7E",
      bg: "rgba(127,158,126,0.10)",
      title: "Live PDF Preview",
      desc: "Every edit reflects instantly in the PDF preview. Click any line in the preview to jump directly to that field.",
    },
    {
      icon: "✦",
      color: "#1D5A50",
      bg: "rgba(29,90,80,0.10)",
      title: "AI Rewrite & Coach",
      desc: "6 rewrite modes (Polish, Elaborate, Quantify…) + an AI chat coach that knows your full resume context.",
    },
    {
      icon: "⚡",
      color: "#f59e0b",
      bg: "rgba(245,158,11,0.10)",
      title: "IRS — Intellectual Resume Search",
      desc: "Goes beyond keyword matching. AI deeply analyzes each JD's roles & responsibilities against your resume, scores every JD individually, then averages them into one final match score.",
    },
    {
      icon: "⧉",
      color: "#3F8C7F",
      bg: "rgba(6,182,212,0.10)",
      title: "3-Variant Compare",
      desc: "Create up to 3 independent variants of your resume and compare them side-by-side — perfect for targeting different roles.",
    },
    {
      icon: "↓",
      color: "#16a34a",
      bg: "rgba(22,163,74,0.10)",
      title: "Download DOCX or PDF",
      desc: "Export your edited resume as a perfectly formatted Word document or PDF, preserving all original formatting.",
    },
    {
      icon: "🔗",
      color: "#e11d48",
      bg: "rgba(225,29,72,0.10)",
      title: "Hyperlink & URL Editor",
      desc: "Edit LinkedIn, GitHub and any inline URLs directly — display name and target URL separately, no reformatting needed.",
    },
  ];

  const steps = [
    { num: "01", title: "Upload", desc: "Drop your existing .pdf or .docx resume. We preserve every font, spacing and layout detail." },
    { num: "02", title: "Edit", desc: "Click any field in the live preview or use the section editor. Apply rich formatting, AI rewrites, or add lines." },
    { num: "03", title: "Download", desc: "Export as DOCX or PDF. Your edits are injected surgically — no template, no reformatting." },
  ];

  const cardBg = isDark ? "rgba(13,25,72,.65)" : "#fff";
  const cardBdr = isDark ? "rgba(127,158,126,.15)" : "#E7EAE3";
  const headCol = isDark ? "#E7EFE6" : "#101210";
  const subCol  = isDark ? "rgba(180,205,255,.55)" : "#55584F";

  return (
    <Box sx={{ position:"relative", zIndex:5, pb:{ xs:8, lg:14 } }}>

      {/* ── HOW IT WORKS ── */}
      <Box sx={{ maxWidth:1200, mx:"auto", px:{ xs:2, sm:3, lg:4 }, pt:{ xs:8, lg:12 }, pb:{ xs:6, lg:8 } }}>
        <Box sx={{ textAlign:"center", mb:{ xs:5, lg:7 } }}>
          <Box sx={{ display:"inline-flex", alignItems:"center", gap:1, mb:2, px:1.75, py:0.75,
            borderRadius:99, bgcolor:isDark?"rgba(94,129,93,.12)":"#EDF3EC",
            border:isDark?"1px solid rgba(94,129,93,.28)":"1px solid #D7E3D6" }}>
            <Box sx={{ width:6, height:6, borderRadius:"50%", bgcolor:"#7F9E7E", boxShadow:"0 0 8px #7F9E7E" }}/>
            <Typography sx={{ fontSize:12, fontWeight:700, color:isDark?"#9FB89E":"#5E815D", letterSpacing:".04em", textTransform:"uppercase" }}>How it works</Typography>
          </Box>
          <Typography sx={{ fontFamily:"'Jost',sans-serif", fontWeight:800,
            fontSize:{ xs:"1.8rem", sm:"2.4rem" }, letterSpacing:"-.03em",
            color:headCol, mb:1.5 }}>
            From upload to download in 3 steps
          </Typography>
          <Typography sx={{ fontSize:{ xs:14, sm:16 }, color:subCol, maxWidth:500, mx:"auto", lineHeight:1.7 }}>
            No templates. No reformatting. Your resume — surgically improved.
          </Typography>
        </Box>

        {/* Steps row */}
        <Box sx={{ display:"grid", gridTemplateColumns:{ xs:"1fr", md:"repeat(3,1fr)" }, gap:{ xs:3, md:2 }, position:"relative" }}>
          {/* Connector line on md+ */}
          <Box sx={{ display:{ xs:"none", md:"block" }, position:"absolute", top:28, left:"16.5%", right:"16.5%", height:2,
            background:isDark?"linear-gradient(90deg,#7F9E7E,#1D5A50)":"linear-gradient(90deg,#D7E3D6,#D6E4E0)",
            borderRadius:99, zIndex:0 }} />

          {steps.map((s, i) => (
            <Box key={i} sx={{ position:"relative", zIndex:1, display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center", px:{ xs:2, md:3 } }}>
              <Box sx={{ width:56, height:56, borderRadius:"50%", mb:3, display:"flex", alignItems:"center", justifyContent:"center",
                background:isDark?"linear-gradient(135deg,#5E815D,#1D5A50)":"linear-gradient(135deg,#5E815D,#1D5A50)",
                boxShadow:isDark?"0 0 0 6px rgba(94,129,93,.15),0 8px 24px rgba(94,129,93,.35)":"0 0 0 6px #EDF3EC,0 4px 16px rgba(94,129,93,.22)" }}>
                <Typography sx={{ fontFamily:"'Jost',sans-serif", fontWeight:800, fontSize:18, color:"#fff" }}>{s.num}</Typography>
              </Box>
              <Typography sx={{ fontFamily:"'Jost',sans-serif", fontWeight:800, fontSize:{ xs:17, md:19 }, color:headCol, mb:1 }}>{s.title}</Typography>
              <Typography sx={{ fontSize:13.5, color:subCol, lineHeight:1.7, maxWidth:280 }}>{s.desc}</Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* ── FEATURES GRID ── */}
      <Box sx={{ maxWidth:1200, mx:"auto", px:{ xs:2, sm:3, lg:4 }, pt:2 }}>
        <Box sx={{ textAlign:"center", mb:{ xs:5, lg:7 } }}>
          <Box sx={{ display:"inline-flex", alignItems:"center", gap:1, mb:2, px:1.75, py:0.75,
            borderRadius:99, bgcolor:isDark?"rgba(29,90,80,.12)":"#F1F6F4",
            border:isDark?"1px solid rgba(111,160,149,.28)":"1px solid #D6E4E0" }}>
            <Box sx={{ width:6, height:6, borderRadius:"50%", bgcolor:"#1D5A50", boxShadow:"0 0 8px #1D5A50" }}/>
            <Typography sx={{ fontSize:12, fontWeight:700, color:isDark?"#6FA095":"#1D5A50", letterSpacing:".04em", textTransform:"uppercase" }}>Features</Typography>
          </Box>
          <Typography sx={{ fontFamily:"'Jost',sans-serif", fontWeight:800,
            fontSize:{ xs:"1.8rem", sm:"2.4rem" }, letterSpacing:"-.03em", color:headCol, mb:1.5 }}>
            Everything your resume needs
          </Typography>
          <Typography sx={{ fontSize:{ xs:14, sm:16 }, color:subCol, maxWidth:480, mx:"auto", lineHeight:1.7 }}>
            Built for job hunters who already have a great resume — and want to make it perfect.
          </Typography>
        </Box>

        <Box sx={{ display:"grid", gridTemplateColumns:{ xs:"1fr", sm:"repeat(2,1fr)", lg:"repeat(3,1fr)" }, gap:{ xs:2, md:2.5 } }}>
          {features.map((f, i) => (
            <Box key={i} sx={{
              p:{ xs:2.5, md:3 }, borderRadius:3,
              bgcolor:cardBg,
              border:`1px solid ${cardBdr}`,
              transition:"all .2s",
              boxShadow:isDark?"0 2px 16px rgba(0,0,0,.25)":"0 2px 12px rgba(0,0,0,.05)",
              "&:hover":{ borderColor:f.color+"55", transform:"translateY(-3px)", boxShadow:isDark?`0 8px 32px rgba(0,0,0,.4)`:
                `0 8px 28px rgba(0,0,0,.10)` }
            }}>
              <Box sx={{ width:44, height:44, borderRadius:2.5, bgcolor:f.bg, display:"flex", alignItems:"center", justifyContent:"center", mb:2.25, flexShrink:0 }}>
                <Typography sx={{ fontSize:18, color:f.color, fontWeight:700, lineHeight:1 }}>{f.icon}</Typography>
              </Box>
              <Typography sx={{ fontFamily:"'Jost',sans-serif", fontWeight:700, fontSize:15.5, color:headCol, mb:1 }}>{f.title}</Typography>
              <Typography sx={{ fontSize:13.5, color:subCol, lineHeight:1.75 }}>{f.desc}</Typography>
            </Box>
          ))}
        </Box>

        {/* ── BOTTOM CTA ── */}
        <Box sx={{ mt:{ xs:8, lg:10 }, textAlign:"center" }}>
          <Box sx={{
            display:"inline-flex", flexDirection:"column", alignItems:"center", gap:2.5,
            px:{ xs:3, sm:6 }, py:{ xs:4, sm:5 }, borderRadius:4,
            background:isDark?"linear-gradient(135deg,rgba(94,129,93,.18),rgba(29,90,80,.18))":"linear-gradient(135deg,#EDF3EC,#F1F6F4)",
            border:isDark?"1px solid rgba(159,184,158,.22)":"1px solid #D6E4E0",
            maxWidth:480, mx:"auto"
          }}>
            <Typography sx={{ fontFamily:"'Jost',sans-serif", fontWeight:800, fontSize:{ xs:18, sm:22 }, color:headCol, lineHeight:1.3 }}>
              Ready to edit your resume?
            </Typography>
            <Typography sx={{ fontSize:14, color:subCol, lineHeight:1.6, maxWidth:360 }}>
              Upload your existing PDF or DOCX and start editing in seconds — no account required.
            </Typography>
            <Box sx={{ display:"flex", alignItems:"center", gap:1.5, flexWrap:"wrap", justifyContent:"center" }}>
              {["IRS Powered","AI-Powered","Free to start"].map(tag => (
                <Box key={tag} sx={{ display:"flex", alignItems:"center", gap:0.75, px:1.25, py:0.5, borderRadius:99, bgcolor:isDark?"rgba(255,255,255,.07)":"rgba(94,129,93,.07)", border:isDark?"1px solid rgba(255,255,255,.12)":"1px solid rgba(94,129,93,.2)" }}>
                  <Box sx={{ width:5, height:5, borderRadius:"50%", bgcolor:isDark?"#5dff90":"#16a34a" }}/>
                  <Typography sx={{ fontSize:11.5, fontWeight:600, color:isDark?"rgba(200,220,255,.8)":"#5E815D" }}>{tag}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

function ChoiceStep({ onUpload, onBack, isDark }) {
  const features = [
    { icon: "◎", color: "#7F9E7E", title: "Live PDF Preview",            desc: "Click any line in the preview to jump directly to that field and start editing." },
    { icon: "✦", color: "#1D5A50", title: "AI Rewrite & Coach",          desc: "6 rewrite modes (Polish, Quantify, Condense…) + a context-aware AI coach." },
    { icon: "⚡", color: "#f59e0b", title: "IRS — Intellectual Resume Search", desc: "Deep per-JD analysis of roles & responsibilities — each JD scored individually, averaged into one final score." },
    { icon: "⧉", color: "#3F8C7F", title: "3-Variant Compare",           desc: "Create 3 independent variants and compare them side-by-side to pick the best." },
    { icon: "↓", color: "#16a34a", title: "DOCX & PDF Export",           desc: "Surgical edits injected directly — preserves every font, spacing and layout." },
    { icon: "🔗", color: "#e11d48", title: "Hyperlink & URL Editor",      desc: "Edit LinkedIn, GitHub and any inline URL — display name and target separately." },
  ];

  const headCol  = isDark ? "#E7EFE6" : "#101210";
  const subCol   = isDark ? "rgba(180,205,255,.52)" : "#55584F";
  const panelBg  = isDark ? "rgba(3,32,28,.82)"     : "rgba(255,255,255,0.94)";
  const panelBdr = isDark ? "rgba(60,96,88,.14)"  : "rgba(0,0,0,.07)";

  return (
    <Box sx={{ minHeight:"calc(100vh - 72px)", display:"flex", alignItems:"stretch",
      position:"relative", zIndex:5,
      animation: isDark ? "night-fade-up .5s ease" : "fadeUp .5s ease" }}>

      {/* ══ LEFT PANEL — Features ══ */}
      <Box sx={{ flex:"1 1 55%", px:{ xs:3, sm:5, lg:8 }, py:{ xs:5, sm:7 },
        display:"flex", flexDirection:"column", justifyContent:"center",
        borderRight:isDark?"1px solid rgba(60,96,88,.1)":"1px solid #E7EAE3" }}>

        {/* Badge */}
        <Box sx={{ display:"inline-flex", alignItems:"center", gap:1, mb:2.5, px:1.5, py:0.6,
          borderRadius:99, width:"fit-content",
          bgcolor:isDark?"rgba(94,129,93,.12)":"#EDF3EC",
          border:isDark?"1px solid rgba(94,129,93,.25)":"1px solid #D7E3D6" }}>
          <Box sx={{ width:6, height:6, borderRadius:"50%", bgcolor:"#7F9E7E", boxShadow:"0 0 8px #7F9E7E" }}/>
          <Typography sx={{ fontSize:11.5, fontWeight:700, color:isDark?"#9FB89E":"#5E815D", letterSpacing:".04em", textTransform:"uppercase" }}>
            What you get
          </Typography>
        </Box>

        <Typography sx={{ fontFamily:"'Jost',sans-serif", fontWeight:800,
          fontSize:{ xs:"1.7rem", sm:"2.2rem", lg:"2.6rem" }, letterSpacing:"-.03em",
          color:headCol, mb:1, lineHeight:1.12 }}>
          Everything your<br/>resume needs
        </Typography>
        <Typography sx={{ fontSize:{ xs:14, sm:15.5 }, color:subCol, mb:4.5, lineHeight:1.7, maxWidth:480 }}>
          Upload once, edit everything — AI-powered, formatting preserved, no templates.
        </Typography>

        {/* 2-column feature grid */}
        <Box sx={{ display:"grid", gridTemplateColumns:{ xs:"1fr", sm:"1fr 1fr" }, gap:{ xs:1.5, sm:2 } }}>
          {features.map((f, i) => (
            <Box key={i} sx={{ display:"flex", alignItems:"flex-start", gap:1.5,
              p:"14px 16px", borderRadius:3,
              bgcolor:isDark?"rgba(13,25,72,.55)":"#F8FAF6",
              border:isDark?"1px solid rgba(60,96,88,.12)":"1px solid #edf0f7",
              transition:"all .18s",
              "&:hover":{ borderColor:f.color+"66",
                bgcolor:isDark?"rgba(20,38,95,.7)":"#fff",
                boxShadow:isDark?`0 6px 24px rgba(0,0,0,.3)`:`0 6px 20px rgba(0,0,0,.07)`,
                transform:"translateY(-2px)" } }}>
              <Box sx={{ width:36, height:36, borderRadius:2.5, flexShrink:0,
                bgcolor:`${f.color}18`,
                display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Typography sx={{ fontSize:16, color:f.color, fontWeight:700, lineHeight:1 }}>{f.icon}</Typography>
              </Box>
              <Box sx={{ minWidth:0 }}>
                <Typography sx={{ fontFamily:"'Jost',sans-serif", fontWeight:700,
                  fontSize:13, color:headCol, mb:0.4, lineHeight:1.3 }}>{f.title}</Typography>
                <Typography sx={{ fontSize:11.5, color:subCol, lineHeight:1.6 }}>{f.desc}</Typography>
              </Box>
            </Box>
          ))}
        </Box>

        <Button startIcon={<ArrowLeft size={14} />} onClick={onBack}
          sx={{ mt:4, color:isDark?"rgba(150,175,255,.45)":"text.disabled",
            fontWeight:500, fontSize:13, alignSelf:"flex-start", pl:0 }}>
          Go Back
        </Button>
      </Box>

      {/* ══ RIGHT PANEL — Upload ══ */}
      <Box sx={{ flex:"1 1 45%", maxWidth:{ lg:520 }, display:"flex", flexDirection:"column",
        justifyContent:"center", px:{ xs:3, sm:5, lg:8 }, py:{ xs:5, sm:7 },
        bgcolor:isDark?"rgba(6,10,38,.6)":"#F8FAF6" }}>

        <Typography sx={{ fontFamily:"'Jost',sans-serif", fontWeight:800,
          fontSize:{ xs:"1.6rem", sm:"2rem", lg:"2.3rem" }, letterSpacing:"-.03em",
          color:headCol, mb:1, lineHeight:1.15 }}>
          Start editing<br/>your resume
        </Typography>
        <Typography sx={{ fontSize:{ xs:14, sm:15 }, color:subCol, mb:3.5, lineHeight:1.7 }}>
          Upload your existing file — we preserve every detail and extract all fields for editing.
        </Typography>

        {/* Upload card */}
        <Paper elevation={0} onClick={onUpload} sx={{
          p:{ xs:3, sm:4 }, mb:3,
          border:"2px solid",
          borderColor:isDark?"rgba(94,129,93,.22)":"#E7EAE3",
          borderRadius:4, cursor:"pointer",
          bgcolor:isDark?"rgba(13,25,72,.7)":"#fff",
          transition:"all .22s",
          "&:hover":{ borderColor:isDark?"#9FB89E":"#5E815D",
            boxShadow:isDark?"0 12px 48px rgba(94,129,93,.25)":"0 12px 40px rgba(94,129,93,.12)",
            transform:"translateY(-4px)" } }}>

          <Box sx={{ display:"flex", alignItems:"center", gap:2, mb:2.5 }}>
            <Box sx={{ width:54, height:54, borderRadius:3,
              bgcolor:isDark?"rgba(94,129,93,.18)":"#EDF3EC",
              display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
              boxShadow:isDark?"0 0 0 6px rgba(94,129,93,.08)":"0 0 0 6px #E7EFE6" }}>
              <Upload size={24} color="#5E815D" />
            </Box>
            <Box>
              <Typography sx={{ fontWeight:800, fontSize:{ xs:16, sm:18 }, color:isDark?"#dde8ff":"#101210" }}>
                I already have a resume
              </Typography>
              <Typography sx={{ fontSize:12.5, color:subCol }}>PDF or DOCX — drag & drop or browse</Typography>
            </Box>
          </Box>

          <Typography sx={{ fontSize:13.5, color:subCol, lineHeight:1.7, mb:2.5 }}>
            We preserve every font, spacing, and layout detail. Our AI extracts all fields so you can edit section by section.
          </Typography>

          <Box sx={{ display:"flex", flexWrap:"wrap", gap:1 }}>
            {[
              { label:"PDF", color:"#ef4444" },
              { label:"DOCX", color:"#5E815D" },
              { label:"Formatting preserved", color:"#16a34a" },
              { label:"IRS Powered", color:"#1D5A50" },
            ].map(tag => (
              <Box key={tag.label} sx={{ px:1.5, py:0.4, borderRadius:99, fontSize:11, fontWeight:700,
                bgcolor:`${tag.color}12`, border:`1px solid ${tag.color}33`, color:tag.color }}>{tag.label}</Box>
            ))}
          </Box>
        </Paper>

        {/* Trust list */}
        <Box sx={{ display:"flex", flexDirection:"column", gap:1.5,
          p:"16px 18px", borderRadius:3,
          bgcolor:isDark?"rgba(13,25,72,.45)":"#EFF2EC",
          border:isDark?"1px solid rgba(60,96,88,.1)":"1px solid #E7EAE3" }}>
          {[
            { icon:"🔒", text:"Your file is session-only — never stored permanently" },
            { icon:"⚡", text:"Processed in seconds using Adobe PDF Services + AI field extraction" },
            { icon:"✓",  text:"Every edit reflects instantly in the live PDF preview on the right" },
          ].map((b,i) => (
            <Box key={i} sx={{ display:"flex", alignItems:"flex-start", gap:1.5 }}>
              <Typography sx={{ fontSize:14, flexShrink:0, lineHeight:1.4 }}>{b.icon}</Typography>
              <Typography sx={{ fontSize:12.5, color:subCol, lineHeight:1.6 }}>{b.text}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

function UploadStep({ onBack, onFile, uploading, isDark }) {
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  const headCol = isDark ? "#E7EFE6" : "#101210";
  const subCol  = isDark ? "rgba(180,205,255,.55)" : "#55584F";

  return (
    <Box sx={{
      minHeight: "calc(100vh - 72px)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      zIndex: 5,
      px: { xs: 3, sm: 5, lg: 8 },
      py: { xs: 5, sm: 7 },
      animation: isDark ? "night-fade-up .5s ease" : "fadeUp .5s ease",
    }}>

      {/* Go Back button */}
      <Box sx={{ width: "100%", maxWidth: 520, mb: 3 }}>
        <Button
          startIcon={<ArrowLeft size={15} />}
          onClick={onBack}
          sx={{
            color: isDark ? "#9FB89E" : "#5E815D",
            fontWeight: 700, pl: 0, fontSize: 13,
            "&:hover": { bgcolor: "transparent", opacity: .75 },
            position: "relative",   
      left: "-440px", 
          }}>
          Go Back
        </Button>
      </Box>

      {/* Badge + Title */}
      <Box sx={{ width: "100%", maxWidth: 520, mb: 3.5, textAlign: "center" }}>
        <Box sx={{
          display: "inline-flex", alignItems: "center", gap: 1,
          mb: 2, px: 1.5, py: 0.6, borderRadius: 99,
          bgcolor: isDark ? "rgba(94,129,93,.12)" : "#EDF3EC",
          border: isDark ? "1px solid rgba(94,129,93,.25)" : "1px solid #D7E3D6",
        }}>
          <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "#7F9E7E",
            animation: "pulse 1.5s infinite", boxShadow: "0 0 8px #7F9E7E" }} />
          <Typography sx={{ fontSize: 11.5, fontWeight: 700,
            color: isDark ? "#9FB89E" : "#5E815D",
            letterSpacing: ".04em", textTransform: "uppercase" }}>
            Step 2 of 3 \u2014 Upload
          </Typography>
        </Box>

        <Typography sx={{
          fontFamily: "'Jost',sans-serif",
          fontWeight: 800,
          fontSize: { xs: "1.8rem", sm: "2.2rem" },
          letterSpacing: "-.03em",
          color: headCol, mb: 1, lineHeight: 1.15,
        }}>
          Upload your existing resume
        </Typography>
        <Typography sx={{ fontSize: { xs: 14, sm: 15.5 }, color: subCol, lineHeight: 1.7 }}>
          We support PDF and DOCX \u2014 every font, spacing and layout detail is preserved.
        </Typography>
      </Box>

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.docx"
        style={{ display: "none" }}
        onChange={e => onFile(e.target.files?.[0])}
      />

      {/* Centered drop zone */}
      <Box
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); onFile(e.dataTransfer?.files?.[0]); }}
        onClick={() => !uploading && fileRef.current?.click()}
        sx={{
          width: "100%",
          maxWidth: 520,
          border: "2px dashed",
          borderColor: dragOver
            ? (isDark ? "#9FB89E" : "#5E815D")
            : (isDark ? "rgba(60,96,88,.28)" : "#D8DDD4"),
          borderRadius: 4,
          p: { xs: 4, sm: 6 },
          textAlign: "center",
          cursor: uploading ? "not-allowed" : "pointer",
          bgcolor: dragOver
            ? (isDark ? "rgba(94,129,93,.09)" : "rgba(94,129,93,.04)")
            : (isDark ? "rgba(13,25,72,.5)" : "#fff"),
          transform: dragOver ? "scale(1.02)" : "scale(1)",
          boxShadow: dragOver
            ? (isDark ? "0 0 0 6px rgba(94,129,93,.12)" : "0 0 0 6px rgba(94,129,93,.08)")
            : "none",
          transition: "all .22s",
        }}>

        {uploading ? (
          <Stack spacing={2.5} alignItems="center">
            <Box sx={{
              width: 72, height: 72, borderRadius: "50%",
              bgcolor: isDark ? "rgba(94,129,93,.15)" : "#EDF3EC",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: isDark ? "0 0 0 10px rgba(94,129,93,.08)" : "0 0 0 10px #E7EFE6",
            }}>
              <CircularProgress size={32} sx={{ color: "#5E815D" }} />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: 17, color: headCol, mb: 0.5 }}>
                Processing your resume...
              </Typography>
              <Typography sx={{ fontSize: 13, color: subCol }}>
                AI is extracting all fields and sections
              </Typography>
            </Box>
          </Stack>
        ) : (
          <Stack spacing={3} alignItems="center">
            {/* Upload icon centered */}
            <Box sx={{
              width: 80, height: 80, borderRadius: 3,
              bgcolor: dragOver
                ? (isDark ? "rgba(94,129,93,.2)" : "rgba(94,129,93,.08)")
                : (isDark ? "rgba(94,129,93,.1)" : "#EDF3EC"),
              border: dragOver ? "2px solid #5E815D" : "2px solid transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              animation: "float 3s ease-in-out infinite",
              transition: "all .2s",
              position: "relative",   
              left: "150px",
             
            }}>
              <Upload
                size={36}
                color={dragOver ? "#5E815D" : isDark ? "#9FB89E" : "#7F9E7E"}
                strokeWidth={1.5}
              />
            </Box>

            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: { xs: 18, sm: 21 }, color: headCol, mb: 0.75 }}>
                {dragOver ? "Drop it here!" : "Drag & drop your resume"}
              </Typography>
              <Typography sx={{ fontSize: 14, color: subCol }}>
                PDF or DOCX -- up to 10MB
              </Typography>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 2, width: "100%" }}>
              <Box sx={{ flex: 1, height: "1px", bgcolor: isDark ? "rgba(60,96,88,.15)" : "#E7EAE3" }} />
              <Typography sx={{ fontSize: 12, color: isDark ? "rgba(168,191,167,.35)" : "#7A8073", fontWeight: 500 }}>or</Typography>
              <Box sx={{ flex: 1, height: "1px", bgcolor: isDark ? "rgba(60,96,88,.15)" : "#E7EAE3" }} />
            </Box>

            <Button
              variant="contained"
              size="large"
              sx={{
                px: 6, py: 1.5, borderRadius: 99, fontSize: 15, fontWeight: 700,
                background: "linear-gradient(135deg,#5E815D,#7F9E7E)",
                boxShadow: "0 6px 24px rgba(94,129,93,.35)",
                "&:hover": { boxShadow: "0 8px 32px rgba(94,129,93,.5)", filter: "brightness(1.08)" },
              }}>
              Browse Files
            </Button>

            {/* Format chips */}
            <Box sx={{ display: "flex", gap: 1.25, flexWrap: "wrap", justifyContent: "center" }}>
              {[
                { label: ".PDF",  color: "#ef4444" },
                { label: ".DOCX", color: "#5E815D" },
              ].map(f => (
                <Box key={f.label} sx={{
                  display: "flex", alignItems: "center", gap: 0.75,
                  px: 1.5, py: 0.5, borderRadius: 99, fontSize: 12, fontWeight: 700,
                  bgcolor: `${f.color}10`, border: `1.5px solid ${f.color}30`, color: f.color,
                }}>
                  <FileText size={12} />{f.label}
                </Box>
              ))}
            </Box>
          </Stack>
        )}
      </Box>

      {/* Security note */}
      <Box sx={{
        display: "flex", alignItems: "center", gap: 1.25,
        mt: 3, px: 2, py: 1.25, borderRadius: 2,
        width: "100%", maxWidth: 520,
        bgcolor: isDark ? "rgba(22,163,74,.08)" : "rgba(22,163,74,.06)",
        border: isDark ? "1px solid rgba(22,163,74,.2)" : "1px solid rgba(22,163,74,.18)",
      }}>
        <Typography sx={{ fontSize: 14 }}>🔒</Typography>
        <Typography sx={{ fontSize: 12, color: isDark ? "rgba(134,239,172,.8)" : "#15803d", lineHeight: 1.5 }}>
          Your file is processed in your session only -- never stored permanently on our servers.
        </Typography>
      </Box>
    </Box>
  );
}

function ProcessingStep({ progress, fileName, isDark }) {
  // Layered ring geometry: outer static track + inner progress arc + pulse.
  const R_OUTER = 58;
  const R_INNER = 46;
  const C_OUTER = 2 * Math.PI * R_OUTER;
  const C_INNER = 2 * Math.PI * R_INNER;
  const clamped = Math.max(0, Math.min(100, Number(progress) || 0));

  // Staged status copy — the message evolves so the wait feels intentional
  // rather than stuck. Thresholds chosen to hit each once during a typical
  // upload+parse cycle.
  const STAGES = [
    { at:  0, label: "Uploading your resume"      },
    { at: 30, label: "Extracting text and layout" },
    { at: 55, label: "Detecting sections"          },
    { at: 78, label: "Mapping fields"              },
    { at: 92, label: "Finalising your workspace"   },
  ];
  const currentStage = [...STAGES].reverse().find((s) => clamped >= s.at) || STAGES[0];

  const bgTrack   = isDark ? "rgba(159,184,158,.14)" : "#EFF2EC";
  const bgTrack2  = isDark ? "rgba(159,184,158,.08)" : "#F6F8F3";
  const stroke1   = isDark ? "#9FB89E" : "#5E815D";
  const stroke2   = isDark ? "#6FA095" : "#7F9E7E";
  const titleColor= isDark ? "#E4EDE3" : "#101210";
  const subColor  = isDark ? "rgba(168,191,167,.65)" : "#55584F";
  const cardBg    = isDark ? "rgba(5,40,35,.65)" : "#FFFFFF";
  const cardBorder= isDark ? "rgba(159,184,158,.18)" : "#E7EAE3";
  const chipBg    = isDark ? "rgba(127,158,126,.14)" : "#EDF3EC";
  const chipText  = isDark ? "#9FB89E" : "#5E815D";

  return (
    <Box sx={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", minHeight: "70vh", px: 2,
      fontFamily: "'Jost','DM Sans',sans-serif",
      animation: isDark ? "night-fade-up .4s ease" : "fadeIn .4s ease",
    }}>
      {/* Local keyframes for the spinning outer ring + pulse halo.
          Scoped inline so the component is self-contained.          */}
      <style>{`
        @keyframes rs-spin-slow { to { transform: rotate(360deg); } }
        @keyframes rs-pulse {
          0%, 100% { transform: scale(1);   opacity: .55; }
          50%      { transform: scale(1.06); opacity: .95; }
        }
        @keyframes rs-dot-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: .35; }
          40%           { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>

      <Box sx={{
        width: { xs: "92%", sm: 480 }, maxWidth: 520,
        px: { xs: 2, sm: 3 }, py: { xs: 2, sm: 3 },
        textAlign: "center",
      }}>
        {/* Layered rings */}
        <Box sx={{
          position: "relative",
          width: { xs: 140, sm: 168 }, height: { xs: 140, sm: 168 },
          mx: "auto", mb: 3.5,
        }}>
          {/* Pulsing halo behind everything */}
          <Box sx={{
            position: "absolute", inset: 12,
            borderRadius: "50%",
            bgcolor: bgTrack2,
            animation: "rs-pulse 2.4s ease-in-out infinite",
          }} />

          {/* Slow-rotating decorative outer ring — gives the sense of
              activity without competing with the real progress arc.  */}
          <svg
            viewBox="0 0 140 140"
            style={{
              position: "absolute", inset: 0,
              width: "100%", height: "100%",
              animation: "rs-spin-slow 8s linear infinite",
              transformOrigin: "center",
            }}
          >
            <circle cx="70" cy="70" r={R_OUTER}
              fill="none" stroke={bgTrack} strokeWidth="2" />
            <circle cx="70" cy="70" r={R_OUTER}
              fill="none" stroke={stroke2} strokeWidth="2"
              strokeDasharray={`${C_OUTER * 0.12} ${C_OUTER * 0.88}`}
              strokeLinecap="round" opacity="0.7" />
          </svg>

          {/* Real progress arc */}
          <svg
            viewBox="0 0 140 140"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          >
            <circle cx="70" cy="70" r={R_INNER}
              fill="none" stroke={bgTrack} strokeWidth="8" />
            <circle
              cx="70" cy="70" r={R_INNER}
              fill="none"
              stroke={stroke1} strokeWidth="8" strokeLinecap="round"
              strokeDasharray={C_INNER}
              strokeDashoffset={C_INNER - (C_INNER * clamped) / 100}
              style={{
                transformOrigin: "center",
                transform: "rotate(-90deg)",
                transition: "stroke-dashoffset .25s cubic-bezier(.4,0,.2,1)",
              }}
            />
          </svg>

          {/* Centre readout — big % in ink, small "complete" caption */}
          <Box sx={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
          }}>
            <Typography sx={{
              color: titleColor,
              fontFamily: "'Jost','DM Sans',sans-serif",
              fontWeight: 800, fontSize: { xs: 26, sm: 30 },
              letterSpacing: "-0.03em", lineHeight: 1,
            }}>
              {Math.round(clamped)}%
            </Typography>
            <Typography sx={{
              color: subColor, fontSize: 10, fontWeight: 700,
              letterSpacing: ".14em", textTransform: "uppercase",
              mt: 0.75,
            }}>
              Complete
            </Typography>
          </Box>
        </Box>

        {/* Title + animated dots */}
        <Stack direction="row" spacing={0.4} alignItems="baseline" justifyContent="center">
          <Typography sx={{
            fontFamily: "'Jost','DM Sans',sans-serif",
            fontWeight: 800, fontSize: { xs: "1.5rem", sm: "1.85rem" },
            color: titleColor, letterSpacing: "-0.025em", lineHeight: 1.15,
          }}>
            Preparing your resume
          </Typography>
          {[0, 1, 2].map((i) => (
            <Box key={i} component="span" sx={{
              display: "inline-block", width: 4, height: 4, borderRadius: "50%",
              bgcolor: stroke1,
              animation: `rs-dot-bounce 1.4s ease-in-out ${i * 0.16}s infinite`,
              ml: i === 0 ? 0.5 : 0,
            }} />
          ))}
        </Stack>

        {/* Live stage line — swaps out as progress hits each threshold */}
        <Typography sx={{
          mt: 1.5,
          fontSize: { xs: 13, sm: 14 },
          color: subColor, fontWeight: 500, lineHeight: 1.6,
          maxWidth: 420, mx: "auto",
          fontFamily: "'Jost','DM Sans',sans-serif",
        }}>
          {currentStage.label} — hang tight while we set everything up.
        </Typography>

        {/* Filename chip — grounds the wait to what's actually being processed */}
        {fileName && (
          <Box sx={{
            mt: 3, mx: "auto",
            display: "inline-flex", alignItems: "center", gap: 0.75,
            px: 1.5, py: 0.75,
            bgcolor: chipBg, color: chipText,
            border: `1px solid ${isDark ? "rgba(159,184,158,.22)" : "#D8DDD4"}`,
            borderRadius: "999px",
            maxWidth: "100%",
            fontFamily: "'Jost','DM Sans',sans-serif",
          }}>
            <FileText size={13} />
            <Typography noWrap sx={{
              fontSize: 12.5, fontWeight: 700, letterSpacing: "-0.005em",
              color: "inherit", maxWidth: 280,
            }}>
              {fileName}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}

function SuccessStep({ fileName, onEdit, isDark }) {
  const ink    = isDark ? "#E4EDE3" : "#101210";
  const muted  = isDark ? "rgba(168,191,167,.65)" : "#55584F";
  const soft   = isDark ? "rgba(168,191,167,.45)" : "#7A8073";
  const line   = isDark ? "rgba(159,184,158,.18)" : "#E7EAE3";
  const cardBg = isDark ? "rgba(5,40,35,.65)" : "#FFFFFF";

  return (
    <Box sx={{
      maxWidth: 540, mx: "auto", px: 2, py: { xs: 5, sm: 8 },
      textAlign: "center", fontFamily: "'Jost','DM Sans',sans-serif",
      animation: isDark ? "night-fade-up .5s ease" : "fadeUp .5s ease",
    }}>
      {/* Check badge with soft ring */}
      <Box sx={{
        width: 88, height: 88, mx: "auto", mb: 3.5,
        borderRadius: "50%",
        bgcolor: isDark ? "rgba(127,158,126,.12)" : "#EDF3EC",
        border: `1px solid ${isDark ? "rgba(159,184,158,.25)" : "#D7E3D6"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: isDark
          ? "0 0 0 10px rgba(127,158,126,.06)"
          : "0 0 0 10px rgba(127,158,126,.08)",
      }}>
        <CheckCircle2 size={40} color={isDark ? "#9FB89E" : "#5E815D"} strokeWidth={1.75} />
      </Box>

      {/* Title + copy */}
      <Typography sx={{
        fontFamily: "'Jost','DM Sans',sans-serif",
        fontSize: { xs: "1.6rem", sm: "1.95rem" }, fontWeight: 800,
        color: ink, letterSpacing: "-0.025em", lineHeight: 1.15,
      }}>
        Your resume is ready
      </Typography>
      <Typography sx={{
        fontSize: { xs: 13.5, sm: 14.5 }, color: muted, lineHeight: 1.65,
        maxWidth: 440, mx: "auto", mt: 1.5, mb: 4,
        fontFamily: "'Jost','DM Sans',sans-serif",
      }}>
        We've analysed the document and extracted every section — experience,
        skills, education — with the original formatting preserved.
      </Typography>

      {/* File card */}
      <Box
        onClick={onEdit}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onEdit(); } }}
        sx={{
          p: { xs: 1.75, sm: 2 },
          border: `1px solid ${line}`,
          borderRadius: "16px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 1.5, mb: 3, cursor: "pointer", outline: "none",
          bgcolor: cardBg,
          transition: "all .2s ease",
          "&:hover": {
            borderColor: isDark ? "rgba(159,184,158,.45)" : "#7F9E7E",
            bgcolor: isDark ? "rgba(8,48,42,.75)" : "#F8FAF6",
            transform: "translateY(-1px)",
            boxShadow: isDark ? "0 8px 24px rgba(0,0,0,.3)" : "0 8px 24px rgba(2,33,36,.08)",
          },
          "&:focus-visible": { borderColor: "#7F9E7E", boxShadow: "0 0 0 3px rgba(127,158,126,.2)" },
        }}
      >
        <Stack direction="row" spacing={1.75} alignItems="center" sx={{ minWidth: 0 }}>
          <Box sx={{
            width: 44, height: 44, flexShrink: 0,
            bgcolor: isDark ? "rgba(94,129,93,.15)" : "#EDF3EC",
            borderRadius: "12px",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <FileText size={20} color={isDark ? "#9FB89E" : "#5E815D"} />
          </Box>
          <Box sx={{ textAlign: "left", minWidth: 0 }}>
            <Typography noWrap sx={{
              fontWeight: 700, color: ink, fontSize: { xs: 13, sm: 14 },
              letterSpacing: "-.01em", fontFamily: "'Jost','DM Sans',sans-serif",
            }}>
              {fileName || "resume.docx"}
            </Typography>
            <Stack direction="row" spacing={0.6} alignItems="center" sx={{ mt: 0.25 }}>
              <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "#16a34a", flexShrink: 0 }} />
              <Typography sx={{ fontSize: 11.5, color: soft, fontWeight: 600, fontFamily: "'Jost','DM Sans',sans-serif" }}>
                Parsed and ready for editing
              </Typography>
            </Stack>
          </Box>
        </Stack>
        <Box sx={{
          width: 32, height: 32, flexShrink: 0, borderRadius: "50%",
          bgcolor: isDark ? "rgba(127,158,126,.15)" : "#F6F8F3",
          border: `1px solid ${isDark ? "rgba(159,184,158,.25)" : "#E7EAE3"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <ChevronRight size={16} color={isDark ? "#9FB89E" : "#5E815D"} />
        </Box>
      </Box>

      {/* Primary CTA — pine filled */}
      <Button
        onClick={onEdit}
        startIcon={<Edit2 size={16} />}
        sx={{
          width: "100%", py: 1.4,
          textTransform: "none",
          fontFamily: "'Jost','DM Sans',sans-serif",
          fontSize: 14.5, fontWeight: 700, letterSpacing: "-.01em",
          color: "#fff",
          bgcolor: isDark ? "#5E815D" : "#022124",
          borderRadius: "14px",
          boxShadow: isDark ? "0 8px 24px rgba(94,129,93,.3)" : "0 8px 24px rgba(2,33,36,.22)",
          transition: "all .2s ease",
          "&:hover": {
            bgcolor: isDark ? "#6F906E" : "#0A3A38",
            boxShadow: isDark ? "0 10px 28px rgba(94,129,93,.4)" : "0 10px 28px rgba(2,33,36,.3)",
          },
        }}
      >
        Open in the editor
      </Button>

      <Typography sx={{
        fontSize: 11.5, color: soft, fontWeight: 600, mt: 2,
        fontFamily: "'Jost','DM Sans',sans-serif",
      }}>
        Live preview · AI rewrites · JD match — all in the next screen
      </Typography>
    </Box>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   INLINE EDITOR
══════════════════════════════════════════════════════════════════════ */
export {
  LandingNav, NightScene, HeroStep, FeaturesSection,
  ChoiceStep, UploadStep, ProcessingStep, SuccessStep,
};