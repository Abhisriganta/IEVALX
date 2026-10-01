import { createTheme } from "@mui/material/styles";


export const API_BASE = import.meta.env.VITE_API_URL || "";

// ── MUI Theme ─────────────────────────────────────────────────────────────────
export const resumeAiTheme = createTheme({
  palette: {
    primary:    { main: "#2563eb", light: "#3b82f6", dark: "#1d4ed8", contrastText: "#fff" },
    success:    { main: "#16a34a", light: "#22c55e", contrastText: "#fff" },
    error:      { main: "#dc2626", light: "#ef4444", contrastText: "#fff" },
    warning:    { main: "#d97706", light: "#f59e0b" },
    background: { default: "#f5f6fa", paper: "#ffffff" },
    text:       { primary: "#111827", secondary: "#6b7280", disabled: "#9ca3af" },
  },
  typography: {
    fontFamily: "'Inter', sans-serif",
    h1: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, letterSpacing: "-0.04em" },
    h2: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, letterSpacing: "-0.03em" },
    h3: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 },
    h4: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 },
    h5: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600 },
    h6: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiButton:    { styleOverrides: { root: { textTransform: "none", fontWeight: 600, fontFamily: "'Inter', sans-serif" } } },
    MuiPaper:     { styleOverrides: { root: { backgroundImage: "none" } } },
    MuiChip:      { styleOverrides: { root: { fontFamily: "'Inter', sans-serif", fontWeight: 600 } } },
    MuiTextField: { styleOverrides: { root: { fontFamily: "'Inter', sans-serif" } } },
    MuiTab:       { styleOverrides: { root: { textTransform: "none", fontFamily: "'Inter', sans-serif", fontWeight: 500, minHeight: 40 } } },
  },
});

// ── Global CSS ────────────────────────────────────────────────────────────────
export const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
*{box-sizing:border-box;transition:background-color .35s ease,border-color .35s ease,color .25s ease}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
@keyframes ripple{to{transform:scale(4);opacity:0}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes panelSlide{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
@keyframes sparkle{0%{transform:scale(0) rotate(0);opacity:1}100%{transform:scale(0) rotate(180deg);opacity:0}}
@keyframes expandIn{from{opacity:0;max-height:0}to{opacity:1;max-height:800px}}
@keyframes hlFadeIn{from{opacity:0;transform:scaleX(0.95)}to{opacity:1;transform:scaleX(1)}}
@keyframes pageBadgeIn{from{opacity:0;transform:translateY(6px) scale(0.9)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes fly-right{from{transform:translateX(-80px)}to{transform:translateX(calc(100vw + 100px))}}
@keyframes fly-left{from{transform:translateX(calc(100vw + 80px)) scaleX(-1)}to{transform:translateX(-80px) scaleX(-1)}}
@keyframes twinkle-star{0%,100%{opacity:.15}50%{opacity:.9}}
@keyframes beam-blink{0%,70%,100%{opacity:1}76%{opacity:.25}82%{opacity:.75}87%{opacity:.4}93%{opacity:.85}}
@keyframes lamp-glow{0%,70%,100%{opacity:1;box-shadow:0 0 22px 8px rgba(255,218,80,.35)}76%{opacity:.3;box-shadow:0 0 6px 2px rgba(255,218,80,.1)}87%{opacity:.5;box-shadow:0 0 12px 4px rgba(255,218,80,.2)}}
@keyframes night-fade-up{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes shoot-star{0%{transform:translate(0,0) scale(1);opacity:.9}100%{transform:translate(180px,90px) scale(0);opacity:0}}
@keyframes screen-pulse{0%,70%,100%{opacity:.85}76%{opacity:.15}87%{opacity:.55}}
@keyframes badge-dot-night{0%,100%{box-shadow:0 0 8px rgba(93,255,144,.6)}50%{box-shadow:0 0 18px rgba(93,255,144,1)}}
.night-editor .field-input-card{border-color:rgba(80,120,255,.22)!important;background:rgba(18,30,85,.65)!important}
.night-editor .field-input-card:hover{border-color:rgba(120,160,255,.5)!important;background:rgba(25,40,100,.75)!important;box-shadow:0 2px 14px rgba(61,107,255,.15)!important}
.night-editor .field-input-card.has-value{border-color:rgba(80,120,255,.28)!important;background:rgba(15,28,80,.7)!important}
.night-editor .field-input-card.modified{border-color:#4a7aff!important;background:rgba(20,40,130,.6)!important}
.night-editor .field-input-card.editing-open{border-color:#7ca1ff!important;background:rgba(10,20,65,.98)!important;box-shadow:0 0 0 3px rgba(124,161,255,.12)!important}
.night-editor .field-card{background:rgba(15,28,80,.7)!important;border-color:rgba(80,120,255,.22)!important}
.night-editor .sec-accordion{background:rgba(15,28,80,.7)!important;border-color:rgba(80,120,255,.22)!important}
.night-editor .sec-accordion.open{border-color:rgba(120,160,255,.45)!important}
.night-editor ::-webkit-scrollbar-track{background:rgba(8,15,45,.9)}
.night-editor ::-webkit-scrollbar-thumb{background:rgba(80,110,220,.45);border-radius:99px}
.night-editor .field-input-card [class*="MuiTypography"]{color:#c8d8ff!important}
.night-editor .sec-accordion-hdr{background:rgba(15,28,80,.7)!important}
.night-editor .sec-accordion-body{background:rgba(10,20,60,.6)!important;border-top-color:rgba(80,110,220,.2)!important}
::-webkit-scrollbar{width:4px}
::-webkit-scrollbar-track{background:#f1f3f5}
::-webkit-scrollbar-thumb{background:#d1d5db;border-radius:99px}
::-webkit-scrollbar-thumb:hover{background:#9ca3af}
.ripple-container{position:relative;overflow:hidden}
.ripple-effect{position:absolute;border-radius:50%;background:rgba(37,99,235,.1);animation:ripple .5s linear;pointer-events:none}
.glow-input:focus{box-shadow:0 0 0 3px rgba(37,99,235,0.15)!important;border-color:#2563eb!important;outline:none}
.panel-overlay{position:fixed;inset:0;background:rgba(0,0,0,.35);backdrop-filter:blur(4px);z-index:200;animation:fadeIn .2s ease}
.side-panel{position:fixed;top:0;right:0;height:100vh;width:520px;max-width:95vw;background:#fff;border-left:1px solid #e2e4ea;z-index:201;display:flex;flex-direction:column;animation:panelSlide .28s cubic-bezier(.34,1.4,.64,1);box-shadow:-8px 0 40px rgba(0,0,0,.1)}
.field-card{border-radius:10px;border:1px solid #e5e7eb;background:#fff;transition:all .14s;margin-bottom:5px;overflow:hidden}
.field-card:hover{border-color:#c8cbd6;box-shadow:0 2px 12px rgba(0,0,0,.07)}
.field-card.editing{border-color:#2563eb55;box-shadow:0 0 0 3px rgba(37,99,235,0.1),0 4px 20px rgba(37,99,235,.07)}
.score-ring{transition:stroke-dashoffset .8s cubic-bezier(.34,1.56,.64,1)}
.tb-btn{display:inline-flex;align-items:center;justify-content:center;height:32px;padding:0 12px;gap:5px;border-radius:7px;border:1px solid #e5e7eb;background:#fff;color:#374151;cursor:pointer;font-size:12px;font-weight:500;transition:all .12s;user-select:none;flex-shrink:0;font-family:'Inter',sans-serif;white-space:nowrap}
.tb-btn:hover{background:#f9fafb;border-color:#c8cbd6;color:#111827}
.tb-btn.active{background:rgba(37,99,235,0.08);border-color:rgba(37,99,235,0.3);color:#2563eb}
.field-input-card{border-radius:12px;border:1.5px solid #e8eaef;background:#f8f9fb;transition:all .18s;margin-bottom:0;overflow:hidden;cursor:pointer;position:relative}
.field-input-card:hover{border-color:#c5cad6;background:#f3f5f9;box-shadow:0 2px 10px rgba(0,0,0,.06)}
.field-input-card.has-value{border-color:#e2e6ec;background:#f5f7fa}
.field-input-card.modified{border-color:#93c5fd;background:#f0f6ff}
.field-input-card.inserted{border-color:#86efac;background:#f0fdf4}
.field-input-card.editing-open{border-color:#2563eb;background:#fff;box-shadow:0 0 0 3px rgba(37,99,235,0.1),0 4px 20px rgba(37,99,235,.08)}
.sec-accordion{border-radius:14px;border:1.5px solid #e8eaef;background:#fff;margin-bottom:10px;overflow:hidden;transition:all .18s}
.sec-accordion:hover{border-color:#d0d5e0}
.sec-accordion.open{border-color:#dbe4f5;box-shadow:0 2px 16px rgba(37,99,235,0.06)}
.sec-accordion-hdr{display:flex;align-items:center;gap:10px;padding:14px 16px;cursor:pointer;user-select:none;transition:background .12s}
.sec-accordion-hdr:hover{background:#fafbff}
.sec-accordion-body{padding:12px 14px 14px;border-top:1.5px solid #f0f2f7}
.field-readonly,.field-readonly *{cursor:not-allowed!important}
.field-readonly:hover{border-color:#e8eaef!important;box-shadow:none!important;background:#f8f9fb!important}

/* ════════════════════════════════════════════════════════════════════════════
   CANVA WHITE-TEXT FIX
   Resumes from Canva (and other dark-sidebar templates) have w:color="FFFFFF"
   on their sidebar runs. When InlineEditor renders those segments into the
   contenteditable, each one becomes a span with inline style="color:#FFFFFF",
   which makes the text invisible against the editor's white background —
   even though the field clearly displays in the read-only card just fine.

   This rule forces a readable text color inside InlineEditor's contenteditable
   area only. The PDF preview canvas, the read-only field cards (which use
   <Typography>), the toolbar, and the underlying segment data are all
   untouched — so saved DOCX files keep the original Canva white-on-dark
   styling and the next preview re-renders identically.

   Two layers:
     1. Broad: any span inside an editing field-card's contenteditable.
        Catches the most common case where InlineEditor applies color to
        per-segment spans.
     2. Targeted: any contenteditable descendant whose inline style sets
        a near-white color. Belt-and-braces, in case layer 1 doesn't match
        the exact DOM InlineEditor produces.

   night-editor block: the editor goes deep-blue in dark mode, so forcing
   black text there would re-create the invisibility bug in reverse. We
   set a light slate color (#e6edff) so dark mode stays readable too.
   ════════════════════════════════════════════════════════════════════════════ */
.field-card.editing [contenteditable="true"],
.field-card.editing [contenteditable="true"] *,
[contenteditable="true"] [style*="color:#fff" i],
[contenteditable="true"] [style*="color: #fff" i],
[contenteditable="true"] [style*="color:white" i],
[contenteditable="true"] [style*="color: white" i],
[contenteditable="true"] [style*="color:rgb(255" i],
[contenteditable="true"] [style*="color: rgb(255" i]{
  color:#1f2937!important;
}
.night-editor .field-card.editing [contenteditable="true"],
.night-editor .field-card.editing [contenteditable="true"] *{
  color:#e6edff!important;
}
`;

// ── InlineEditor ──────────────────────────────────────────────────────────────
export const FONTS = ["Calibri","Arial","Times New Roman","Georgia","Verdana","Trebuchet MS","Garamond","Cambria","Tahoma"];
export const SIZES = [8,9,10,11,12,14,16,18,20,22,24,28,32,36];

export const _fontMemory = { fontFamily: "", fontSize: "", updated: null };
export const saveFontMemory = (ff, fs) => {
  if (ff) _fontMemory.fontFamily = ff;
  if (fs) _fontMemory.fontSize   = fs;
  _fontMemory.updated = new Date().toLocaleTimeString();
};
export const loadFontMemory = () => ({ ..._fontMemory });

// ── AddLineForm ───────────────────────────────────────────────────────────────
export const BULLET_OPTIONS = [
  { label: "None", value: "" }, { label: "–", value: "– " }, { label: "•", value: "• " },
  { label: "▪", value: "▪ " }, { label: "›", value: "› " }, { label: "→", value: "→ " },
];

// ── AIChatPanel ───────────────────────────────────────────────────────────────
export const SUGGESTED_PROMPTS = [
  { icon: "⚡", text: "Make this more impactful" },
  { icon: "📝", text: "Write bullet points for this role" },
  { icon: "🎯", text: "Improve my experience section" },
  { icon: "📊", text: "Add metrics and numbers" },
  { icon: "💼", text: "Make this more professional" },
  { icon: "✂️", text: "Make this more concise" },
  { icon: "🔍", text: "Tailor this to the job description" },
  { icon: "🚀", text: "Start with stronger action verbs" },
];

// ── SectionPage ───────────────────────────────────────────────────────────────
export const SECTION_META = {
  header:         { label: "Header",         desc: "Your name, title, and contact details at the top of your resume." },
  contact:        { label: "Contacts",       desc: "Add your up-to-date contact information." },
  personal:       { label: "Personal",       desc: "Tell employers a bit about yourself." },
  experience:     { label: "Experience",     desc: "List your work history, starting with your most recent position." },
  work:           { label: "Experience",     desc: "List your work history, starting with your most recent position." },
  education:      { label: "Education",      desc: "Add your educational background, degrees, and certifications." },
  skills:         { label: "Skills",         desc: "Highlight your key skills and proficiencies relevant to the role." },
  summary:        { label: "Summary",        desc: "Write a short professional summary that captures your experience and goals." },
  objective:      { label: "Objective",      desc: "State your career objective and what you bring to the table." },
  projects:       { label: "Projects",       desc: "Showcase notable projects you've worked on." },
  languages:      { label: "Languages",      desc: "List the languages you speak and your proficiency level." },
  certifications: { label: "Certifications", desc: "Add any relevant certifications or licenses you hold." },
  awards:         { label: "Awards",         desc: "Highlight any awards or recognitions you've received." },
  achievements:   { label: "Achievements",   desc: "Showcase your key achievements, honors, and accomplishments." },
  interests:      { label: "Interests",      desc: "Share your extra-curricular activities, hobbies, and interests." },
  volunteer:      { label: "Volunteer Work", desc: "Highlight your community service and volunteer experience." },
  publications:   { label: "Publications",   desc: "List your research papers, journal articles, and publications." },
  references:     { label: "References",     desc: "Provide professional references who can vouch for your work." },
  other:          { label: "Other",          desc: "Any additional information relevant to your application." },
};

// ── App ───────────────────────────────────────────────────────────────────────
export const STEP_LABELS = {
    header:"Header", contact:"Contacts", personal:"Personal", experience:"Experience",
    work:"Experience", education:"Education", skills:"Skills",
    summary:"Summary", objective:"Objective", projects:"Projects",
    languages:"Languages", certifications:"Certifications",
    awards:"Awards", achievements:"Achievements", interests:"Interests",
    volunteer:"Volunteer Work", publications:"Publications",
    references:"References", other:"Other",
  };

export const CONTACT_FIELD_TYPES = [
  {
    key:           "linkedin",
    label:         "LinkedIn",
    color:         "#0a66c2",
    placeholder:   "linkedin.com/in/yourname",
    urlPrefix:     "https://",
    urlPattern:    /linkedin\.com/i,
    hint:          "Paste your LinkedIn profile URL",
  },
  {
    key:           "github",
    label:         "GitHub",
    color:         "#24292e",
    placeholder:   "github.com/yourname",
    urlPrefix:     "https://",
    urlPattern:    /github\.com/i,
    hint:          "Paste your GitHub profile URL",
  },
  {
    key:           "portfolio",
    label:         "Portfolio",
    color:         "#6366f1",
    placeholder:   "yourname.dev",
    urlPrefix:     "https://",
    urlPattern:    null,            // catch-all
    hint:          "Paste your portfolio or personal website URL",
  },
];


export const detectContactType = (link) => {
  if (!link) return null;
  const label = (link.label || "").toLowerCase();
  if (label === "linkedin") return "linkedin";
  if (label === "github")   return "github";
  if (label === "mail")     return "mail";

  const url = (link.url || "").toLowerCase();
  if (/linkedin\.com/.test(url)) return "linkedin";
  if (/github\.com/.test(url))   return "github";
  if (/^mailto:/.test(url))      return "mail";
  if (/(twitter|x)\.com/.test(url)) return "twitter";
  // Anything else with http(s) is treated as a portfolio link
  if (/^https?:\/\//.test(url))  return "portfolio";
  return null;
};