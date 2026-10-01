// import { useEffect, useRef, useState } from "react";
// import { useLocation } from "react-router-dom";
// import { GlobalStyles } from "@mui/material";
// import { GoArrowUpRight } from "react-icons/go";
// import { C, FONT, REDUCED } from "./theme";

// /* ══════════════════════════════════════════════════════════════════════════
//    MEGA NAV — full-width hover mega panel (desktop) + LEFT DRAWER (≤1024px)

//    Desktop (>1024px)
//    - transparent bar over the hero → hero tint on scroll (no blur) → white
//      while the shared mega panel is open
//    - Company / Platform / Jobs / Services (no caret icons) open ONE panel on
//      hover; content swaps in place; sage pill + underline mark the open one
//    - hover intent 60/180ms, click toggles, Escape, focus opens, full ARIA

//    Tablet + mobile (≤1024px)
//    - 3-line hamburger (animates to ✕) that opens a drawer FROM THE LEFT with
//      a dim scrim behind it; Sign Up stays visible in the bar at every width
//    - drawer: logo header + close, the four sections as tap-to-expand
//      accordions (＋ rotates), CTA pinned at the bottom, internal scroll,
//      safe-area aware, body scroll-locked, Escape / scrim-tap / route-change
//      close, auto-closes when resized up to desktop
//    ══════════════════════════════════════════════════════════════════════════ */

// const NAV_CSS = {
//   ".mega-nav-shell": {
//     position: "fixed", top: 0, left: 0, right: 0, zIndex: 1200,
//     fontFamily: FONT,
//   },
//   ".mega-nav": {
//     position: "relative", width: "100%",
//     background: "transparent",
//     transition: REDUCED ? "none" : "background .3s ease, box-shadow .3s ease",
//   },
//   ".mega-nav.scrolled": {
//     background: "rgba(212, 226, 227, 0.97)",
//     borderBottom: "0.5px solid rgba(31,31,31,0.08)",
//     boxShadow: "0 10px 34px rgba(2,33,36,0.10)",
//   },
//   ".mega-nav.panel-open": {
//     background: "#fff", borderBottom: "none",
//     boxShadow: "0 26px 54px rgba(2,33,36,0.14)",
//   },
//   ".mega-bar": {
//     height: 76, display: "flex", alignItems: "center",
//     justifyContent: "space-between", gap: 18, padding: "0 24px",
//     position: "relative", zIndex: 2, background: "transparent",
//     maxWidth: 1200, margin: "0 auto",
//   },
//   ".mega-logo": {
//     display: "flex", alignItems: "center", gap: 9, cursor: "pointer",
//     fontWeight: 700, fontSize: 21, color: C.ink, flexShrink: 0, outline: "none",
//   },
//   ".mega-logo-mark": {
//     width: 36, height: 36, borderRadius: "50%", background: C.sage, color: "#fff",
//     display: "flex", alignItems: "center", justifyContent: "center",
//     fontSize: 13, fontWeight: 700,
//   },
//   ".mega-links": { display: "flex", alignItems: "center", gap: 6 },
//   ".mega-link": {
//     appearance: "none", background: "none", border: "none", cursor: "pointer",
//     fontFamily: FONT, fontSize: 17, fontWeight: 500, color: C.ink,
//     padding: "11px 16px", borderRadius: 12, position: "relative",
//     whiteSpace: "nowrap",
//     transition: REDUCED ? "none" : "color .2s ease, background .2s ease",
//   },
//   ".mega-link:hover, .mega-link:focus-visible": {
//     background: C.sageSoft, color: C.sageDark, outline: "none",
//   },
//   ".mega-link.on": { background: C.sageSoft, color: C.sageDark, fontWeight: 600 },
//   ".mega-link.on::after, .mega-link.active-route::after": {
//     content: '""', position: "absolute", left: 16, right: 16, bottom: 5,
//     height: 2.5, borderRadius: 2, background: C.sage,
//   },
//   ".mega-link.active-route": { color: C.sageDark, fontWeight: 600 },
//   ".mega-cta": {
//     appearance: "none", border: "none", cursor: "pointer", flexShrink: 0,
//     fontFamily: FONT, fontSize: 15.5, fontWeight: 600, color: "#fff",
//     background: C.ink, borderRadius: 999, height: 46, padding: "0 26px",
//     transition: REDUCED ? "none" : "background .25s ease",
//   },
//   ".mega-cta:hover, .mega-cta:focus-visible": { background: C.sage, outline: "none" },
//   ".mega-dots": {
//     width: 46, height: 46, borderRadius: "50%", background: "#fff",
//     border: `1px solid ${C.line}`, cursor: "pointer", flexShrink: 0,
//     display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
//     transition: REDUCED ? "none" : "all .25s ease",
//   },
//   ".mega-dots:hover, .mega-dots:focus-visible": { background: C.ink, borderColor: C.ink, outline: "none" },
//   ".mega-dots:hover svg circle, .mega-dots:focus-visible svg circle": { fill: "#fff" },

//   /* ── shared mega panel (desktop only) ── */
//   ".mega-panel": {
//     position: "absolute", left: 0, right: 0, top: "100%", zIndex: 1,
//     background: "#fff", borderTop: `1px solid ${C.line}`,
//     boxShadow: "0 26px 54px rgba(2,33,36,0.14)",
//     overflow: "hidden",
//     maxHeight: 0, opacity: 0, pointerEvents: "none",
//     transition: REDUCED ? "none" : "max-height .35s cubic-bezier(0.22,1,0.36,1), opacity .25s ease",
//   },
//   ".mega-panel.open": { maxHeight: 420, opacity: 1, pointerEvents: "auto" },
//   ".mega-panel-inner": {
//     display: "grid", gridTemplateColumns: "1fr 1fr 1.15fr", gap: 22,
//     padding: "22px 24px 24px", maxWidth: 1200, margin: "0 auto",
//     animation: REDUCED ? "none" : "megaSwap .28s cubic-bezier(0.22,1,0.36,1)",
//   },
//   "@keyframes megaSwap": {
//     from: { opacity: 0, transform: "translateY(8px)" },
//     to:   { opacity: 1, transform: "translateY(0)" },
//   },
//   ".mega-col-head": {
//     fontSize: 11.5, fontWeight: 700, letterSpacing: "1.6px",
//     textTransform: "uppercase", color: C.sage, marginBottom: 10,
//   },
//   ".mega-col-link": {
//     display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
//     fontSize: 15, color: C.ink, padding: "8px 9px", marginLeft: -9,
//     borderRadius: 9, border: "none", background: "none", width: "calc(100% + 9px)",
//     fontFamily: FONT, textAlign: "left",
//     transition: REDUCED ? "none" : "all .2s ease",
//   },
//   ".mega-col-link:hover, .mega-col-link:focus-visible": {
//     background: C.sageSoft, color: C.sageDark, fontWeight: 600, outline: "none",
//   },
//   ".mega-col-link svg": { fontSize: 14, opacity: 0.55, flexShrink: 0 },
//   ".mega-featured": {
//     background: `linear-gradient(120deg, ${C.pine} 0%, ${C.pine2} 100%)`,
//     borderRadius: 14, padding: "18px 20px", color: "#fff", cursor: "pointer",
//     display: "flex", flexDirection: "column", border: "none",
//     fontFamily: FONT, textAlign: "left",
//     transition: REDUCED ? "none" : "transform .3s cubic-bezier(0.22,1,0.36,1), box-shadow .3s ease",
//   },
//   ".mega-featured:hover, .mega-featured:focus-visible": {
//     transform: "translateY(-3px)", boxShadow: "0 18px 40px rgba(2,33,36,0.28)", outline: "none",
//   },
//   ".mega-featured .ft-title": { fontSize: 16.5, fontWeight: 700, lineHeight: 1.35 },
//   ".mega-featured .ft-desc":  { fontSize: 13.5, color: "rgba(255,255,255,0.68)", marginTop: 6, lineHeight: 1.6 },
//   ".mega-featured .ft-cta":   { fontSize: 14, fontWeight: 600, color: "#9FE1CB", marginTop: "auto", paddingTop: 14 },

//   /* ── 3-line hamburger (≤1024px) ── */
//   ".mega-burger": {
//     display: "none", appearance: "none", background: "none", border: "none",
//     width: 46, height: 46, borderRadius: 10, cursor: "pointer", padding: "12px 10px",
//     flexDirection: "column", justifyContent: "space-between",
//   },
//   ".mega-burger:focus-visible": { outline: `2px solid ${C.sage}` },
//   ".mega-burger span": {
//     display: "block", height: 2.5, width: "100%", background: C.ink, borderRadius: 2,
//     transformOrigin: "center",
//     transition: REDUCED ? "none" : "transform .3s cubic-bezier(0.22,1,0.36,1), opacity .2s ease",
//   },
//   ".mega-burger.x span:nth-of-type(1)": { transform: "translateY(9.75px) rotate(45deg)" },
//   ".mega-burger.x span:nth-of-type(2)": { opacity: 0, transform: "scaleX(0.4)" },
//   ".mega-burger.x span:nth-of-type(3)": { transform: "translateY(-9.75px) rotate(-45deg)" },

//   /* ── scrim + LEFT drawer (≤1024px) ── */
//   ".mega-scrim": {
//     display: "none", position: "fixed", inset: 0, zIndex: 1290,
//     background: "rgba(2,33,36,0.45)",
//     opacity: 0, pointerEvents: "none",
//     transition: REDUCED ? "none" : "opacity .3s ease",
//   },
//   ".mega-scrim.open": { opacity: 1, pointerEvents: "auto" },
//   ".mega-drawer": {
//     display: "none", position: "fixed", top: 0, bottom: 0, left: 0, zIndex: 1300,
//     width: "min(330px, 86vw)", background: "#fff",
//     boxShadow: "12px 0 44px rgba(2,33,36,0.22)",
//     transform: "translateX(-105%)",
//     transition: REDUCED ? "none" : "transform .38s cubic-bezier(0.22,1,0.36,1)",
//     flexDirection: "column",
//     paddingBottom: "env(safe-area-inset-bottom, 0px)",
//   },
//   ".mega-drawer.open": { transform: "translateX(0)" },
//   ".mega-drawer-head": {
//     display: "flex", alignItems: "center", justifyContent: "space-between",
//     padding: "14px 16px 14px 20px", borderBottom: `1px solid ${C.line}`,
//     flexShrink: 0,
//   },
//   ".mega-drawer-close": {
//     width: 42, height: 42, borderRadius: "50%", cursor: "pointer",
//     appearance: "none", background: "none", border: `1.5px solid rgba(31,31,31,0.16)`,
//     display: "flex", alignItems: "center", justifyContent: "center",
//     fontSize: 17, color: C.ink, fontFamily: FONT, lineHeight: 1,
//     transition: REDUCED ? "none" : "all .25s ease",
//   },
//   ".mega-drawer-close:hover, .mega-drawer-close:focus-visible": {
//     background: C.ink, borderColor: C.ink, color: "#fff", outline: "none",
//   },
//   ".mega-drawer-body": {
//     flex: 1, minHeight: 0, overflowY: "auto", overscrollBehavior: "contain",
//     WebkitOverflowScrolling: "touch", scrollbarWidth: "thin",
//   },
//   ".mega-acc": { borderBottom: `1px solid ${C.line}` },
//   ".mega-acc-head": {
//     width: "100%", appearance: "none", background: "none", border: "none",
//     display: "flex", alignItems: "center", justifyContent: "space-between",
//     padding: "16px 20px", cursor: "pointer", fontFamily: FONT,
//     fontSize: 17.5, fontWeight: 600, color: C.ink, minHeight: 56,
//   },
//   ".mega-acc-head:focus-visible": { outline: `2px solid ${C.sage}`, outlineOffset: -2 },
//   ".mega-acc-head .plus": {
//     fontSize: 21, fontWeight: 400, color: C.muted, lineHeight: 1,
//     transition: REDUCED ? "none" : "transform .3s cubic-bezier(0.22,1,0.36,1), color .2s",
//   },
//   ".mega-acc.on .mega-acc-head": { color: C.sageDark },
//   ".mega-acc.on .mega-acc-head .plus": { transform: "rotate(45deg)", color: C.sageDark },
//   ".mega-acc-body": {
//     overflow: "hidden", maxHeight: 0,
//     transition: REDUCED ? "none" : "max-height .35s cubic-bezier(0.22,1,0.36,1)",
//   },
//   ".mega-acc.on .mega-acc-body": { maxHeight: 560 },
//   ".mega-acc-link": {
//     display: "flex", alignItems: "center", gap: 9, width: "100%",
//     appearance: "none", background: "none", border: "none", textAlign: "left",
//     fontFamily: FONT, fontSize: 15.5, color: "#3E443F", cursor: "pointer",
//     padding: "12px 20px 12px 28px", minHeight: 46,
//   },
//   ".mega-acc-link:active, .mega-acc-link:focus-visible": { background: C.sageSoft, outline: "none" },
//   ".mega-acc-link svg": { fontSize: 14, color: C.sage, flexShrink: 0 },
//   ".mega-drawer-cta": {
//     display: "block", flexShrink: 0,
//     width: "calc(100% - 40px)", margin: "14px 20px 18px",
//     appearance: "none", border: "none", cursor: "pointer",
//     fontFamily: FONT, fontSize: 16.5, fontWeight: 600, color: "#fff",
//     background: C.ink, borderRadius: 999, height: 52,
//     transition: REDUCED ? "none" : "background .25s ease",
//   },
//   ".mega-drawer-cta:hover, .mega-drawer-cta:active, .mega-drawer-cta:focus-visible": {
//     background: C.sage, outline: "none",
//   },

//   /* ── tablet + mobile: burger + left drawer replace inline links ── */
//   "@media (max-width: 1024px)": {
//     ".mega-links": { display: "none" },
//     ".mega-dots":  { display: "none" },
//     ".mega-panel": { display: "none" },
//     ".mega-burger": { display: "flex" },
//     ".mega-scrim": { display: "block" },
//     ".mega-drawer": { display: "flex" },
//     ".mega-bar": { height: 70, padding: "0 16px", gap: 12 },
//     ".mega-logo": { fontSize: 20 },
//     ".mega-logo-mark": { width: 34, height: 34, fontSize: 12 },
//     ".mega-cta": { height: 44, padding: "0 20px", fontSize: 14.5 },
//   },
//   "@media (max-width: 480px)": {
//     ".mega-bar": { height: 64, padding: "0 12px", gap: 8 },
//     ".mega-logo": { fontSize: 18 },
//     ".mega-logo-mark": { width: 31, height: 31, fontSize: 11 },
//     ".mega-cta": { height: 40, padding: "0 15px", fontSize: 13.5 },
//   },
// };

// export default function MegaNav({ sections, onLogoClick, ctaLabel = "Sign Up", onCtaClick, onDotsClick }) {
//   const [openIdx, setOpenIdx] = useState(null);        /* desktop panel */
//   const [drawerOpen, setDrawerOpen] = useState(false); /* left drawer */
//   const [accIdx, setAccIdx] = useState(0);             /* drawer accordion */
//   const [scrolled, setScrolled] = useState(false);
//   const openTimer = useRef(null);
//   const closeTimer = useRef(null);
//   const closeBtnRef = useRef(null);
//   const burgerRef = useRef(null);
//   const { pathname } = useLocation();

//   useEffect(() => {
//     const onScroll = () => setScrolled(window.scrollY > 8);
//     onScroll();
//     window.addEventListener("scroll", onScroll, { passive: true });
//     return () => window.removeEventListener("scroll", onScroll);
//   }, []);

//   /* route change → everything closed, nav self-heals on every page */
//   useEffect(() => { setOpenIdx(null); setDrawerOpen(false); }, [pathname]);

//   /* Escape closes panel + drawer */
//   useEffect(() => {
//     const onKey = (e) => { if (e.key === "Escape") { setOpenIdx(null); setDrawerOpen(false); } };
//     window.addEventListener("keydown", onKey);
//     return () => window.removeEventListener("keydown", onKey);
//   }, []);

//   /* body scroll-lock while the drawer is open; move focus into the drawer,
//      return it to the burger on close */
//   useEffect(() => {
//     if (!drawerOpen) return;
//     const prev = document.body.style.overflow;
//     document.body.style.overflow = "hidden";
//     const t = setTimeout(() => closeBtnRef.current?.focus(), REDUCED ? 0 : 120);
//     return () => {
//       document.body.style.overflow = prev;
//       clearTimeout(t);
//       burgerRef.current?.focus?.();
//     };
//   }, [drawerOpen]);

//   /* resized up to desktop while the drawer is open → auto-close */
//   useEffect(() => {
//     const onResize = () => { if (window.innerWidth > 1024 && drawerOpen) setDrawerOpen(false); };
//     window.addEventListener("resize", onResize);
//     return () => window.removeEventListener("resize", onResize);
//   }, [drawerOpen]);

//   /* ── hover intent (desktop panel) ── */
//   const scheduleOpen = (i) => {
//     clearTimeout(closeTimer.current);
//     clearTimeout(openTimer.current);
//     openTimer.current = setTimeout(() => setOpenIdx(i), openIdx === null ? 60 : 0);
//   };
//   const scheduleClose = () => {
//     clearTimeout(openTimer.current);
//     clearTimeout(closeTimer.current);
//     closeTimer.current = setTimeout(() => setOpenIdx(null), 180);
//   };
//   const cancelClose = () => clearTimeout(closeTimer.current);
//   useEffect(() => () => { clearTimeout(openTimer.current); clearTimeout(closeTimer.current); }, []);

//   const runLink = (fn) => {
//     setOpenIdx(null);
//     setDrawerOpen(false);
//     if (fn) fn();
//   };

//   const isActiveRoute = (s) =>
//     (s.match || []).some(m => (m === "/" ? pathname === "/" : pathname.startsWith(m)));

//   const active = openIdx !== null ? sections[openIdx] : null;

//   return (
//     <div className="mega-nav-shell">
//       <GlobalStyles styles={NAV_CSS} />
//       <nav
//         className={`mega-nav ${scrolled ? "scrolled" : ""} ${openIdx !== null ? "panel-open" : ""}`}
//         onMouseLeave={scheduleClose}
//         aria-label="Main navigation"
//       >
//         <div className="mega-bar">
//           {/* 3-line burger → ✕ */}
//           <button
//             ref={burgerRef}
//             type="button"
//             className={`mega-burger ${drawerOpen ? "x" : ""}`}
//             aria-label={drawerOpen ? "Close menu" : "Open menu"}
//             aria-expanded={drawerOpen}
//             aria-controls="mega-drawer"
//             onClick={() => setDrawerOpen(o => !o)}
//           >
//             <span /><span /><span />
//           </button>

//           <div
//             className="mega-logo"
//             onClick={() => runLink(onLogoClick)}
//             role="link" tabIndex={0} aria-label="IEvalx home"
//             onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); runLink(onLogoClick); } }}
//           >
//             <span className="mega-logo-mark">IE</span>
//             IEvalx
//           </div>

//           {/* desktop section links — hover opens the shared panel */}
//           <div className="mega-links" role="menubar">
//             {sections.map((s, i) => (
//               <button
//                 key={s.label}
//                 type="button"
//                 className={`mega-link ${openIdx === i ? "on" : ""} ${isActiveRoute(s) ? "active-route" : ""}`}
//                 aria-haspopup="true"
//                 aria-expanded={openIdx === i}
//                 aria-current={isActiveRoute(s) ? "page" : undefined}
//                 onMouseEnter={() => scheduleOpen(i)}
//                 onFocus={() => scheduleOpen(i)}
//                 onClick={() => setOpenIdx(o => (o === i ? null : i))}
//               >
//                 {s.label}
//               </button>
//             ))}
//           </div>

//           {/* Sign Up — present in the bar at EVERY width, including with the
//               burger active */}
//           <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
//             <button type="button" className="mega-cta" onClick={() => runLink(onCtaClick)}>
//               {ctaLabel}
//             </button>
//             {onDotsClick && (
//               <button type="button" className="mega-dots" aria-label="Open company panel" onClick={() => runLink(onDotsClick)}>
//                 <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true">
//                   {[6, 12, 18].map(y => [6, 12, 18].map(x => (
//                     <circle key={`${x}${y}`} cx={x} cy={y} r="1.7" fill={C.ink} />
//                   )))}
//                 </svg>
//               </button>
//             )}
//           </div>
//         </div>

//         {/* ── shared mega panel (desktop) ── */}
//         <div
//           className={`mega-panel ${openIdx !== null ? "open" : ""}`}
//           onMouseEnter={cancelClose}
//           onMouseLeave={scheduleClose}
//           role="menu"
//           aria-hidden={openIdx === null}
//         >
//           {active && (
//             <div className="mega-panel-inner" key={active.label}>
//               {active.groups.map(g => (
//                 <div key={g.head}>
//                   <div className="mega-col-head">{g.head}</div>
//                   {g.links.map(l => (
//                     <button key={l.label} type="button" className="mega-col-link" onClick={() => runLink(l.onClick)}>
//                       <GoArrowUpRight aria-hidden="true" />
//                       {l.label}
//                     </button>
//                   ))}
//                 </div>
//               ))}
//               {active.featured && (
//                 <button type="button" className="mega-featured" onClick={() => runLink(active.featured.onClick)}>
//                   <span className="ft-title">{active.featured.title}</span>
//                   <span className="ft-desc">{active.featured.desc}</span>
//                   <span className="ft-cta">{active.featured.cta} →</span>
//                 </button>
//               )}
//             </div>
//           )}
//         </div>
//       </nav>

//       {/* ── scrim + LEFT drawer (tablet + mobile) ── */}
//       <div className={`mega-scrim ${drawerOpen ? "open" : ""}`} onClick={() => setDrawerOpen(false)} aria-hidden="true" />
//       <aside
//         id="mega-drawer"
//         className={`mega-drawer ${drawerOpen ? "open" : ""}`}
//         role="dialog" aria-modal="true" aria-label="Navigation menu"
//         aria-hidden={!drawerOpen}
//       >
//         <div className="mega-drawer-head">
//           <div
//             className="mega-logo"
//             onClick={() => runLink(onLogoClick)}
//             role="link" tabIndex={drawerOpen ? 0 : -1} aria-label="IEvalx home"
//             onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); runLink(onLogoClick); } }}
//             style={{ fontSize: 19 }}
//           >
//             <span className="mega-logo-mark" style={{ width: 33, height: 33, fontSize: 11.5 }}>IE</span>
//             IEvalx
//           </div>
//           <button
//             ref={closeBtnRef}
//             type="button"
//             className="mega-drawer-close"
//             aria-label="Close menu"
//             tabIndex={drawerOpen ? 0 : -1}
//             onClick={() => setDrawerOpen(false)}
//           >
//             ✕
//           </button>
//         </div>

//         <div className="mega-drawer-body">
//           {sections.map((s, i) => (
//             <div key={s.label} className={`mega-acc ${accIdx === i ? "on" : ""}`}>
//               <button
//                 type="button"
//                 className="mega-acc-head"
//                 aria-expanded={accIdx === i}
//                 tabIndex={drawerOpen ? 0 : -1}
//                 onClick={() => setAccIdx(a => (a === i ? -1 : i))}
//               >
//                 {s.label}
//                 <span className="plus" aria-hidden="true">＋</span>
//               </button>
//               <div className="mega-acc-body">
//                 {s.groups.flatMap(g => g.links).map(l => (
//                   <button
//                     key={l.label} type="button" className="mega-acc-link"
//                     tabIndex={drawerOpen && accIdx === i ? 0 : -1}
//                     onClick={() => runLink(l.onClick)}
//                   >
//                     <GoArrowUpRight aria-hidden="true" />
//                     {l.label}
//                   </button>
//                 ))}
//               </div>
//             </div>
//           ))}
//         </div>

//         <button
//           type="button"
//           className="mega-drawer-cta"
//           tabIndex={drawerOpen ? 0 : -1}
//           onClick={() => runLink(onCtaClick)}
//         >
//           {ctaLabel}
//         </button>
//       </aside>
//     </div>
//   );
// }



import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { GlobalStyles } from "@mui/material";
import { GoArrowUpRight } from "react-icons/go";
import { C, FONT, REDUCED } from "./theme";
import { useAuth } from "@/hooks/useAuth";
import { ROLES, ROLE_HOME } from "@/constants/roles";
import api, { onLogout } from "@/services/api/axiosInstance";
import employerProfileService from "@/services/api/employer/profileService";

/* ══════════════════════════════════════════════════════════════════════════
   MEGA NAV — full-width hover mega panel (desktop) + LEFT DRAWER (≤1024px)

   Desktop (>1024px)
   - transparent bar over the hero → hero tint on scroll (no blur) → white
     while the shared mega panel is open
   - Company / Platform / Jobs / Services (no caret icons) open ONE panel on
     hover; content swaps in place; sage pill + underline mark the open one
   - hover intent 60/180ms, click toggles, Escape, focus opens, full ARIA

   Tablet + mobile (≤1024px)
   - 3-line hamburger (animates to ✕) that opens a drawer FROM THE LEFT with
     a dim scrim behind it; Sign Up stays visible in the bar at every width
   - drawer: logo header + close, the four sections as tap-to-expand
     accordions (＋ rotates), CTA pinned at the bottom, internal scroll,
     safe-area aware, body scroll-locked, Escape / scrim-tap / route-change
     close, auto-closes when resized up to desktop
   ══════════════════════════════════════════════════════════════════════════ */

const NAV_CSS = {
  ".mega-nav-shell": {
    position: "fixed", top: 0, left: 0, right: 0, zIndex: 1200,
    fontFamily: FONT,
  },
  ".mega-nav": {
    position: "relative", width: "100%",
    background: "transparent",
    transition: REDUCED ? "none" : "background .3s ease, box-shadow .3s ease",
  },
  ".mega-nav.scrolled": {
    background: "rgba(212, 226, 227, 0.97)",
    borderBottom: "0.5px solid rgba(31,31,31,0.08)",
    boxShadow: "0 10px 34px rgba(2,33,36,0.10)",
  },
  ".mega-nav.panel-open": {
    background: "#fff", borderBottom: "none",
    boxShadow: "0 26px 54px rgba(2,33,36,0.14)",
  },
  ".mega-bar": {
    height: 76, display: "flex", alignItems: "center",
    justifyContent: "space-between", gap: 18, padding: "0 24px",
    position: "relative", zIndex: 2, background: "transparent",
    maxWidth: 1200, margin: "0 auto",
  },
  ".mega-logo": {
    display: "flex", alignItems: "center", gap: 9, cursor: "pointer",
    fontWeight: 700, fontSize: 21, color: C.ink, flexShrink: 0, outline: "none",
  },
  ".mega-logo-mark": {
    width: 36, height: 36, borderRadius: "50%", background: C.sage, color: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 13, fontWeight: 700,
  },
  ".mega-links": { display: "flex", alignItems: "center", gap: 6 },
  ".mega-link": {
    appearance: "none", background: "none", border: "none", cursor: "pointer",
    fontFamily: FONT, fontSize: 17, fontWeight: 500, color: C.ink,
    padding: "11px 16px", borderRadius: 12, position: "relative",
    whiteSpace: "nowrap",
    transition: REDUCED ? "none" : "color .2s ease, background .2s ease",
  },
  ".mega-link:hover, .mega-link:focus-visible": {
    background: C.sageSoft, color: C.sageDark, outline: "none",
  },
  ".mega-link.on": { background: C.sageSoft, color: C.sageDark, fontWeight: 600 },
  ".mega-link.on::after, .mega-link.active-route::after": {
    content: '""', position: "absolute", left: 16, right: 16, bottom: 5,
    height: 2.5, borderRadius: 2, background: C.sage,
  },
  ".mega-link.active-route": { color: C.sageDark, fontWeight: 600 },
  ".mega-cta": {
    appearance: "none", border: "none", cursor: "pointer", flexShrink: 0,
    fontFamily: FONT, fontSize: 15.5, fontWeight: 600, color: "#fff",
    background: C.ink, borderRadius: 999, height: 46, padding: "0 26px",
    transition: REDUCED ? "none" : "background .25s ease",
  },
  ".mega-cta:hover, .mega-cta:focus-visible": { background: C.sage, outline: "none" },
  ".mega-dots": {
    width: 46, height: 46, borderRadius: "50%", background: "#fff",
    border: `1px solid ${C.line}`, cursor: "pointer", flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
    transition: REDUCED ? "none" : "all .25s ease",
  },
  ".mega-dots:hover, .mega-dots:focus-visible": { background: C.ink, borderColor: C.ink, outline: "none" },
  ".mega-dots:hover svg circle, .mega-dots:focus-visible svg circle": { fill: "#fff" },

  /* ── profile button (logged-in state) ── */
  ".mega-profile-btn": {
    width: 46, height: 46, borderRadius: "50%", cursor: "pointer", flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
    appearance: "none", border: `2px solid ${C.line}`, background: "#fff",
    position: "relative",
    transition: REDUCED ? "none" : "border-color .25s ease, box-shadow .25s ease",
  },
  ".mega-profile-btn:hover, .mega-profile-btn:focus-visible": {
    borderColor: C.sage, boxShadow: `0 0 0 3px ${C.sage}22`, outline: "none",
  },
  ".mega-profile-avatar": {
    width: 38, height: 38, borderRadius: "50%", objectFit: "cover",
    display: "block",
  },
  ".mega-profile-initials": {
    width: 38, height: 38, borderRadius: "50%",
    background: `linear-gradient(135deg, ${C.sage} 0%, ${C.sageDark} 100%)`,
    color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: FONT, fontSize: 14, fontWeight: 700, letterSpacing: "0.5px",
    textTransform: "uppercase",
  },
  ".mega-profile-dot": {
    position: "absolute", bottom: 1, right: 1, width: 10, height: 10,
    borderRadius: "50%", background: "#4ADE80", border: "2px solid #fff",
  },
  /* profile dropdown */
  ".mega-profile-drop": {
    position: "absolute", top: "calc(100% + 10px)", right: 0,
    background: "#fff", borderRadius: 16,
    boxShadow: "0 20px 50px rgba(2,33,36,0.14), 0 2px 8px rgba(0,0,0,0.06)",
    border: `1px solid ${C.line}`,
    minWidth: 240, padding: "8px 0",
    opacity: 0, pointerEvents: "none", transform: "translateY(-8px) scale(0.97)",
    transformOrigin: "top right",
    transition: REDUCED ? "none" : "opacity .2s ease, transform .25s cubic-bezier(0.22,1,0.36,1)",
    zIndex: 100,
  },
  ".mega-profile-drop.open": {
    opacity: 1, pointerEvents: "auto", transform: "translateY(0) scale(1)",
  },
  ".mega-profile-drop-header": {
    padding: "14px 18px 12px", borderBottom: `1px solid ${C.line}`,
    display: "flex", alignItems: "center", gap: 12,
  },
  ".mega-profile-drop-name": {
    fontFamily: FONT, fontSize: 15, fontWeight: 700, color: C.ink, lineHeight: 1.3,
  },
  ".mega-profile-drop-role": {
    fontFamily: FONT, fontSize: 12, fontWeight: 500, color: C.sage,
    textTransform: "capitalize", lineHeight: 1,
  },
  ".mega-profile-drop-item": {
    display: "flex", alignItems: "center", gap: 10, width: "100%",
    appearance: "none", background: "none", border: "none", textAlign: "left",
    fontFamily: FONT, fontSize: 14.5, color: C.ink, cursor: "pointer",
    padding: "11px 18px", minHeight: 42,
    transition: REDUCED ? "none" : "all .15s ease",
  },
  ".mega-profile-drop-item:hover, .mega-profile-drop-item:focus-visible": {
    background: C.sageSoft, color: C.sageDark, outline: "none",
  },
  ".mega-profile-drop-item.danger": { color: "#DC2626" },
  ".mega-profile-drop-item.danger:hover": { background: "#FEF2F2", color: "#B91C1C" },
  ".mega-profile-drop-divider": {
    height: 1, background: C.line, margin: "4px 14px",
  },

  /* ── shared mega panel (desktop only) ── */
  ".mega-panel": {
    position: "absolute", left: 0, right: 0, top: "100%", zIndex: 1,
    background: "#fff", borderTop: `1px solid ${C.line}`,
    boxShadow: "0 26px 54px rgba(2,33,36,0.14)",
    overflow: "hidden",
    maxHeight: 0, opacity: 0, pointerEvents: "none",
    transition: REDUCED ? "none" : "max-height .35s cubic-bezier(0.22,1,0.36,1), opacity .25s ease",
  },
  ".mega-panel.open": { maxHeight: 420, opacity: 1, pointerEvents: "auto" },
  ".mega-panel-inner": {
    display: "grid", gridTemplateColumns: "1fr 1fr 1.15fr", gap: 22,
    padding: "22px 24px 24px", maxWidth: 1200, margin: "0 auto",
    animation: REDUCED ? "none" : "megaSwap .28s cubic-bezier(0.22,1,0.36,1)",
  },
  "@keyframes megaSwap": {
    from: { opacity: 0, transform: "translateY(8px)" },
    to:   { opacity: 1, transform: "translateY(0)" },
  },
  ".mega-col-head": {
    fontSize: 11.5, fontWeight: 700, letterSpacing: "1.6px",
    textTransform: "uppercase", color: C.sage, marginBottom: 10,
  },
  ".mega-col-link": {
    display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
    fontSize: 15, color: C.ink, padding: "8px 9px", marginLeft: -9,
    borderRadius: 9, border: "none", background: "none", width: "calc(100% + 9px)",
    fontFamily: FONT, textAlign: "left",
    transition: REDUCED ? "none" : "all .2s ease",
  },
  ".mega-col-link:hover, .mega-col-link:focus-visible": {
    background: C.sageSoft, color: C.sageDark, fontWeight: 600, outline: "none",
  },
  ".mega-col-link svg": { fontSize: 14, opacity: 0.55, flexShrink: 0 },
  ".mega-featured": {
    background: `linear-gradient(120deg, ${C.pine} 0%, ${C.pine2} 100%)`,
    borderRadius: 14, padding: "18px 20px", color: "#fff", cursor: "pointer",
    display: "flex", flexDirection: "column", border: "none",
    fontFamily: FONT, textAlign: "left",
    transition: REDUCED ? "none" : "transform .3s cubic-bezier(0.22,1,0.36,1), box-shadow .3s ease",
  },
  ".mega-featured:hover, .mega-featured:focus-visible": {
    transform: "translateY(-3px)", boxShadow: "0 18px 40px rgba(2,33,36,0.28)", outline: "none",
  },
  ".mega-featured .ft-title": { fontSize: 16.5, fontWeight: 700, lineHeight: 1.35 },
  ".mega-featured .ft-desc":  { fontSize: 13.5, color: "rgba(255,255,255,0.68)", marginTop: 6, lineHeight: 1.6 },
  ".mega-featured .ft-cta":   { fontSize: 14, fontWeight: 600, color: "#9FE1CB", marginTop: "auto", paddingTop: 14 },

  /* ── 3-line hamburger (≤1024px) ── */
  ".mega-burger": {
    display: "none", appearance: "none", background: "none", border: "none",
    width: 46, height: 46, borderRadius: 10, cursor: "pointer", padding: "12px 10px",
    flexDirection: "column", justifyContent: "space-between",
  },
  ".mega-burger:focus-visible": { outline: `2px solid ${C.sage}` },
  ".mega-burger span": {
    display: "block", height: 2.5, width: "100%", background: C.ink, borderRadius: 2,
    transformOrigin: "center",
    transition: REDUCED ? "none" : "transform .3s cubic-bezier(0.22,1,0.36,1), opacity .2s ease",
  },
  ".mega-burger.x span:nth-of-type(1)": { transform: "translateY(9.75px) rotate(45deg)" },
  ".mega-burger.x span:nth-of-type(2)": { opacity: 0, transform: "scaleX(0.4)" },
  ".mega-burger.x span:nth-of-type(3)": { transform: "translateY(-9.75px) rotate(-45deg)" },

  /* ── scrim + LEFT drawer (≤1024px) ── */
  ".mega-scrim": {
    display: "none", position: "fixed", inset: 0, zIndex: 1290,
    background: "rgba(2,33,36,0.45)",
    opacity: 0, pointerEvents: "none",
    transition: REDUCED ? "none" : "opacity .3s ease",
  },
  ".mega-scrim.open": { opacity: 1, pointerEvents: "auto" },
  ".mega-drawer": {
    display: "none", position: "fixed", top: 0, bottom: 0, left: 0, zIndex: 1300,
    width: "min(330px, 86vw)", background: "#fff",
    boxShadow: "12px 0 44px rgba(2,33,36,0.22)",
    transform: "translateX(-105%)",
    transition: REDUCED ? "none" : "transform .38s cubic-bezier(0.22,1,0.36,1)",
    flexDirection: "column",
    paddingBottom: "env(safe-area-inset-bottom, 0px)",
  },
  ".mega-drawer.open": { transform: "translateX(0)" },
  ".mega-drawer-head": {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "14px 16px 14px 20px", borderBottom: `1px solid ${C.line}`,
    flexShrink: 0,
  },
  ".mega-drawer-close": {
    width: 42, height: 42, borderRadius: "50%", cursor: "pointer",
    appearance: "none", background: "none", border: `1.5px solid rgba(31,31,31,0.16)`,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 17, color: C.ink, fontFamily: FONT, lineHeight: 1,
    transition: REDUCED ? "none" : "all .25s ease",
  },
  ".mega-drawer-close:hover, .mega-drawer-close:focus-visible": {
    background: C.ink, borderColor: C.ink, color: "#fff", outline: "none",
  },
  ".mega-drawer-body": {
    flex: 1, minHeight: 0, overflowY: "auto", overscrollBehavior: "contain",
    WebkitOverflowScrolling: "touch", scrollbarWidth: "thin",
  },
  ".mega-acc": { borderBottom: `1px solid ${C.line}` },
  ".mega-acc-head": {
    width: "100%", appearance: "none", background: "none", border: "none",
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "16px 20px", cursor: "pointer", fontFamily: FONT,
    fontSize: 17.5, fontWeight: 600, color: C.ink, minHeight: 56,
  },
  ".mega-acc-head:focus-visible": { outline: `2px solid ${C.sage}`, outlineOffset: -2 },
  ".mega-acc-head .plus": {
    fontSize: 21, fontWeight: 400, color: C.muted, lineHeight: 1,
    transition: REDUCED ? "none" : "transform .3s cubic-bezier(0.22,1,0.36,1), color .2s",
  },
  ".mega-acc.on .mega-acc-head": { color: C.sageDark },
  ".mega-acc.on .mega-acc-head .plus": { transform: "rotate(45deg)", color: C.sageDark },
  ".mega-acc-body": {
    overflow: "hidden", maxHeight: 0,
    transition: REDUCED ? "none" : "max-height .35s cubic-bezier(0.22,1,0.36,1)",
  },
  ".mega-acc.on .mega-acc-body": { maxHeight: 560 },
  ".mega-acc-link": {
    display: "flex", alignItems: "center", gap: 9, width: "100%",
    appearance: "none", background: "none", border: "none", textAlign: "left",
    fontFamily: FONT, fontSize: 15.5, color: "#3E443F", cursor: "pointer",
    padding: "12px 20px 12px 28px", minHeight: 46,
  },
  ".mega-acc-link:active, .mega-acc-link:focus-visible": { background: C.sageSoft, outline: "none" },
  ".mega-acc-link svg": { fontSize: 14, color: C.sage, flexShrink: 0 },
  ".mega-drawer-cta": {
    display: "block", flexShrink: 0,
    width: "calc(100% - 40px)", margin: "14px 20px 18px",
    appearance: "none", border: "none", cursor: "pointer",
    fontFamily: FONT, fontSize: 16.5, fontWeight: 600, color: "#fff",
    background: C.ink, borderRadius: 999, height: 52,
    transition: REDUCED ? "none" : "background .25s ease",
  },
  ".mega-drawer-cta:hover, .mega-drawer-cta:active, .mega-drawer-cta:focus-visible": {
    background: C.sage, outline: "none",
  },

  /* ── tablet + mobile: burger + left drawer replace inline links ── */
  "@media (max-width: 1024px)": {
    ".mega-links": { display: "none" },
    ".mega-dots":  { display: "none" },
    ".mega-panel": { display: "none" },
    ".mega-burger": { display: "flex" },
    ".mega-scrim": { display: "block" },
    ".mega-drawer": { display: "flex" },
    ".mega-bar": { height: 70, padding: "0 16px", gap: 12 },
    ".mega-logo": { fontSize: 20 },
    ".mega-logo-mark": { width: 34, height: 34, fontSize: 12 },
    ".mega-cta": { height: 44, padding: "0 20px", fontSize: 14.5 },
  },
  "@media (max-width: 480px)": {
    ".mega-bar": { height: 64, padding: "0 12px", gap: 8 },
    ".mega-logo": { fontSize: 18 },
    ".mega-logo-mark": { width: 31, height: 31, fontSize: 11 },
    ".mega-cta": { height: 40, padding: "0 15px", fontSize: 13.5 },
  },
};

/* ── helper ─── */
const getInitials = (name = "") => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "U";
  return parts.length === 1
    ? parts[0][0].toUpperCase()
    : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const PROFILE_ROUTE = {
  [ROLES.JOBSEEKER]: "/jobseeker/profile",
  [ROLES.EMPLOYER]:  "/employer/profile",
  [ROLES.COMPANY]:   "/company/profile",
};

export default function MegaNav({ sections, onLogoClick, ctaLabel = "Sign Up", onCtaClick, onDotsClick }) {
  const [openIdx, setOpenIdx] = useState(null);        /* desktop panel */
  const [drawerOpen, setDrawerOpen] = useState(false); /* left drawer */
  const [accIdx, setAccIdx] = useState(0);             /* drawer accordion */
  const [scrolled, setScrolled] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false); /* profile dropdown */
  const openTimer = useRef(null);
  const closeTimer = useRef(null);
  const closeBtnRef = useRef(null);
  const burgerRef = useRef(null);
  const profileRef = useRef(null);
  const { pathname } = useLocation();
  const navigate = useNavigate();

  /* ── Auth ── */
  const { user, isAuthenticated, role, logout } = useAuth();
  const userName = user?.full_name || user?.name || user?.email?.split("@")[0] || "User";
  const userEmail = user?.email || "";

  /* ── Avatar resolution — mirrors Topbar exactly ──
     Priority:
       1. Jobseeker → direct API endpoint /api/jobseeker/photo/:id/
       2. localStorage cache (50-min TTL)
       3. Employer → profileService.getProfile()
       4. Company  → /companies/:id/full-profile
       5. user.profile_image_url from AuthContext
     Also listens for the "profile-image-updated" custom event so
     any in-app photo change propagates instantly to the navbar.    */
  const [avatarSrc, setAvatarSrc] = useState(() => {
    if (role === ROLES.JOBSEEKER && user?.id) return `/api/jobseeker/photo/${user.id}/`;
    return localStorage.getItem("user_profile_image_url") || user?.profile_image_url || null;
  });

  useEffect(() => {
    if (!isAuthenticated || !user?.id) { setAvatarSrc(null); return; }

    /* Jobseeker — direct photo endpoint, no presigned URL needed */
    if (role === ROLES.JOBSEEKER) {
      setAvatarSrc(`/api/jobseeker/photo/${user.id}/`);
      return;
    }

    /* Check localStorage cache first (50-min TTL) */
    const fromStorage = localStorage.getItem("user_profile_image_url");
    const storedAt    = localStorage.getItem("user_profile_image_url_ts");
    const isExpired   = !storedAt || (Date.now() - Number(storedAt)) > 50 * 60 * 1000;
    if (fromStorage && !isExpired) {
      setAvatarSrc(fromStorage);
      return;
    }

    /* Employer — profileService is a thin axios wrapper; a static import keeps
       it in the shared services chunk instead of forcing a redundant split. */
    if (role === ROLES.EMPLOYER) {
      employerProfileService.getProfile().then(res => {
        const url = res?.data?.profile_image_url;
        if (url) {
          localStorage.setItem("user_profile_image_url", url);
          localStorage.setItem("user_profile_image_url_ts", String(Date.now()));
          setAvatarSrc(url);
        }
      }).catch(() => {});
    }

    /* Company — full-profile endpoint */
    if (role === ROLES.COMPANY) {
      const companyId = user?.id || localStorage.getItem("currentCompanyId");
      if (companyId) {
        api.get(`/companies/${companyId}/full-profile`).then(res => {
          const url = res?.data?.account?.profile_image_url || null;
          if (url) {
            localStorage.setItem("user_profile_image_url", url);
            localStorage.setItem("user_profile_image_url_ts", String(Date.now()));
            setAvatarSrc(url);
          }
        }).catch(() => {});
      }
    }
  }, [user?.id, user?.profile_image_url, role, isAuthenticated]);

  /* Listen for in-app photo updates (e.g. user uploads new avatar) */
  useEffect(() => {
    const handler = (e) => { if (e.detail?.url) setAvatarSrc(e.detail.url); };
    window.addEventListener("profile-image-updated", handler);
    return () => window.removeEventListener("profile-image-updated", handler);
  }, []);

  /* Full logout — clear cached avatar + call onLogout for token cleanup */
  const handleLogout = () => {
    setProfileOpen(false);
    localStorage.removeItem("user_profile_image_url");
    localStorage.removeItem("user_profile_image_url_ts");
    logout();
    onLogout();
  };

  /* Close profile dropdown on outside click */
  useEffect(() => {
    if (!profileOpen) return;
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [profileOpen]);

  /* Close profile dropdown on route change */
  useEffect(() => { setProfileOpen(false); }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* route change → everything closed, nav self-heals on every page */
  useEffect(() => { setOpenIdx(null); setDrawerOpen(false); }, [pathname]);

  /* Escape closes panel + drawer */
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") { setOpenIdx(null); setDrawerOpen(false); setProfileOpen(false); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* body scroll-lock while the drawer is open; move focus into the drawer,
     return it to the burger on close */
  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => closeBtnRef.current?.focus(), REDUCED ? 0 : 120);
    return () => {
      document.body.style.overflow = prev;
      clearTimeout(t);
      burgerRef.current?.focus?.();
    };
  }, [drawerOpen]);

  /* resized up to desktop while the drawer is open → auto-close */
  useEffect(() => {
    const onResize = () => { if (window.innerWidth > 1024 && drawerOpen) setDrawerOpen(false); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [drawerOpen]);

  /* ── hover intent (desktop panel) ── */
  const scheduleOpen = (i) => {
    clearTimeout(closeTimer.current);
    clearTimeout(openTimer.current);
    openTimer.current = setTimeout(() => setOpenIdx(i), openIdx === null ? 60 : 0);
  };
  const scheduleClose = () => {
    clearTimeout(openTimer.current);
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenIdx(null), 180);
  };
  const cancelClose = () => clearTimeout(closeTimer.current);
  useEffect(() => () => { clearTimeout(openTimer.current); clearTimeout(closeTimer.current); }, []);

  const runLink = (fn) => {
    setOpenIdx(null);
    setDrawerOpen(false);
    if (fn) fn();
  };

  const isActiveRoute = (s) =>
    (s.match || []).some(m => (m === "/" ? pathname === "/" : pathname.startsWith(m)));

  const active = openIdx !== null ? sections[openIdx] : null;

  return (
    <div className="mega-nav-shell">
      <GlobalStyles styles={NAV_CSS} />
      <nav
        className={`mega-nav ${scrolled ? "scrolled" : ""} ${openIdx !== null ? "panel-open" : ""}`}
        onMouseLeave={scheduleClose}
        aria-label="Main navigation"
      >
        <div className="mega-bar">
          {/* 3-line burger → ✕ */}
          <button
            ref={burgerRef}
            type="button"
            className={`mega-burger ${drawerOpen ? "x" : ""}`}
            aria-label={drawerOpen ? "Close menu" : "Open menu"}
            aria-expanded={drawerOpen}
            aria-controls="mega-drawer"
            onClick={() => setDrawerOpen(o => !o)}
          >
            <span /><span /><span />
          </button>

          <div
            className="mega-logo"
            onClick={() => runLink(onLogoClick)}
            role="link" tabIndex={0} aria-label="IEvalx home"
            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); runLink(onLogoClick); } }}
          >
            <span className="mega-logo-mark">IE</span>
            IEvalx
          </div>

          {/* desktop section links — hover opens the shared panel */}
          <div className="mega-links" role="menubar">
            {sections.map((s, i) => (
              <button
                key={s.label}
                type="button"
                className={`mega-link ${openIdx === i ? "on" : ""} ${isActiveRoute(s) ? "active-route" : ""}`}
                aria-haspopup="true"
                aria-expanded={openIdx === i}
                aria-current={isActiveRoute(s) ? "page" : undefined}
                onMouseEnter={() => scheduleOpen(i)}
                onFocus={() => scheduleOpen(i)}
                onClick={() => setOpenIdx(o => (o === i ? null : i))}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Right section — auth-aware:
              • Logged OUT → Sign Up CTA + dots grid
              • Logged IN  → profile avatar button with dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            {!isAuthenticated ? (
              <>
                <button type="button" className="mega-cta" onClick={() => runLink(onCtaClick)}>
                  {ctaLabel}
                </button>
                {onDotsClick && (
                  <button type="button" className="mega-dots" aria-label="Open company panel" onClick={() => runLink(onDotsClick)}>
                    <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true">
                      {[6, 12, 18].map(y => [6, 12, 18].map(x => (
                        <circle key={`${x}${y}`} cx={x} cy={y} r="1.7" fill={C.ink} />
                      )))}
                    </svg>
                  </button>
                )}
              </>
            ) : (
              <div ref={profileRef} style={{ position: "relative" }}>
                <button
                  type="button"
                  className="mega-profile-btn"
                  aria-label="Profile menu"
                  aria-expanded={profileOpen}
                  onClick={() => setProfileOpen(o => !o)}
                >
                  {avatarSrc ? (
                    <img
                      key={avatarSrc}
                      src={avatarSrc}
                      alt={userName}
                      className="mega-profile-avatar"
                      onError={() => setAvatarSrc(null)}
                    />
                  ) : (
                    <span className="mega-profile-initials">
                      {getInitials(userName)}
                    </span>
                  )}
                  <span className="mega-profile-dot" />
                </button>

                {/* ── Profile dropdown ── */}
                <div className={`mega-profile-drop ${profileOpen ? "open" : ""}`} role="menu">
                  {/* Header — avatar + name + role */}
                  <div className="mega-profile-drop-header">
                    <span style={{ flexShrink: 0 }}>
                      {avatarSrc ? (
                        <img
                          key={avatarSrc}
                          src={avatarSrc}
                          alt=""
                          style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }}
                          onError={() => setAvatarSrc(null)}
                        />
                      ) : (
                        <span
                          className="mega-profile-initials"
                          style={{ width: 40, height: 40, fontSize: 15 }}
                        >
                          {getInitials(userName)}
                        </span>
                      )}
                    </span>
                    <div>
                      <div className="mega-profile-drop-name">{userName}</div>
                      <div className="mega-profile-drop-role">{role || "Member"}</div>
                    </div>
                  </div>

                  {/* Menu items */}
                  <button
                    type="button"
                    className="mega-profile-drop-item"
                    onClick={() => { setProfileOpen(false); navigate(ROLE_HOME[role] || "/"); }}
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={C.ink} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
                    </svg>
                    Dashboard
                  </button>
                  <button
                    type="button"
                    className="mega-profile-drop-item"
                    onClick={() => { setProfileOpen(false); navigate(PROFILE_ROUTE[role] || "/"); }}
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={C.ink} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
                    </svg>
                    My Profile
                  </button>
                  <button
                    type="button"
                    className="mega-profile-drop-item"
                    onClick={() => { setProfileOpen(false); navigate("/jobs"); }}
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={C.ink} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                    </svg>
                    Browse Jobs
                  </button>

                  <div className="mega-profile-drop-divider" />

                  <button
                    type="button"
                    className="mega-profile-drop-item danger"
                    onClick={handleLogout}
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── shared mega panel (desktop) ── */}
        <div
          className={`mega-panel ${openIdx !== null ? "open" : ""}`}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
          role="menu"
          aria-hidden={openIdx === null}
        >
          {active && (
            <div className="mega-panel-inner" key={active.label}>
              {active.groups.map(g => (
                <div key={g.head}>
                  <div className="mega-col-head">{g.head}</div>
                  {g.links.map(l => (
                    <button key={l.label} type="button" className="mega-col-link" onClick={() => runLink(l.onClick)}>
                      <GoArrowUpRight aria-hidden="true" />
                      {l.label}
                    </button>
                  ))}
                </div>
              ))}
              {active.featured && (
                <button type="button" className="mega-featured" onClick={() => runLink(active.featured.onClick)}>
                  <span className="ft-title">{active.featured.title}</span>
                  <span className="ft-desc">{active.featured.desc}</span>
                  <span className="ft-cta">{active.featured.cta} →</span>
                </button>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* ── scrim + LEFT drawer (tablet + mobile) ── */}
      <div className={`mega-scrim ${drawerOpen ? "open" : ""}`} onClick={() => setDrawerOpen(false)} aria-hidden="true" />
      <aside
        id="mega-drawer"
        className={`mega-drawer ${drawerOpen ? "open" : ""}`}
        role="dialog" aria-modal="true" aria-label="Navigation menu"
        aria-hidden={!drawerOpen}
      >
        <div className="mega-drawer-head">
          <div
            className="mega-logo"
            onClick={() => runLink(onLogoClick)}
            role="link" tabIndex={drawerOpen ? 0 : -1} aria-label="IEvalx home"
            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); runLink(onLogoClick); } }}
            style={{ fontSize: 19 }}
          >
            <span className="mega-logo-mark" style={{ width: 33, height: 33, fontSize: 11.5 }}>IE</span>
            IEvalx
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            className="mega-drawer-close"
            aria-label="Close menu"
            tabIndex={drawerOpen ? 0 : -1}
            onClick={() => setDrawerOpen(false)}
          >
            ✕
          </button>
        </div>

        <div className="mega-drawer-body">
          {sections.map((s, i) => (
            <div key={s.label} className={`mega-acc ${accIdx === i ? "on" : ""}`}>
              <button
                type="button"
                className="mega-acc-head"
                aria-expanded={accIdx === i}
                tabIndex={drawerOpen ? 0 : -1}
                onClick={() => setAccIdx(a => (a === i ? -1 : i))}
              >
                {s.label}
                <span className="plus" aria-hidden="true">＋</span>
              </button>
              <div className="mega-acc-body">
                {s.groups.flatMap(g => g.links).map(l => (
                  <button
                    key={l.label} type="button" className="mega-acc-link"
                    tabIndex={drawerOpen && accIdx === i ? 0 : -1}
                    onClick={() => runLink(l.onClick)}
                  >
                    <GoArrowUpRight aria-hidden="true" />
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {!isAuthenticated ? (
          <button
            type="button"
            className="mega-drawer-cta"
            tabIndex={drawerOpen ? 0 : -1}
            onClick={() => runLink(onCtaClick)}
          >
            {ctaLabel}
          </button>
        ) : (
          <div style={{ flexShrink: 0, padding: "12px 20px 18px", borderTop: `1px solid ${C.line}` }}>
            {/* Profile summary row */}
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              marginBottom: 12, padding: "4px 0",
            }}>
              <span style={{ flexShrink: 0 }}>
                {avatarSrc ? (
                  <img
                    key={avatarSrc}
                    src={avatarSrc} alt=""
                    style={{ width: 42, height: 42, borderRadius: "50%", objectFit: "cover" }}
                    onError={() => setAvatarSrc(null)}
                  />
                ) : (
                  <span className="mega-profile-initials" style={{ width: 42, height: 42, fontSize: 15 }}>
                    {getInitials(userName)}
                  </span>
                )}
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: FONT, fontSize: 15, fontWeight: 700, color: C.ink, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {userName}
                </div>
                <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, color: C.sage, textTransform: "capitalize" }}>
                  {role || "Member"}
                </div>
              </div>
            </div>
            {/* Go to dashboard */}
            <button
              type="button"
              className="mega-drawer-cta"
              tabIndex={drawerOpen ? 0 : -1}
              style={{ marginTop: 0, marginLeft: 0, marginRight: 0, marginBottom: 6, width: "100%" }}
              onClick={() => { setDrawerOpen(false); navigate(ROLE_HOME[role] || "/"); }}
            >
              Go to Dashboard
            </button>
            {/* Sign out */}
            <button
              type="button"
              tabIndex={drawerOpen ? 0 : -1}
              onClick={() => { setDrawerOpen(false); handleLogout(); }}
              style={{
                display: "block", width: "100%", appearance: "none",
                background: "none", border: `1.5px solid ${C.line}`,
                borderRadius: 999, height: 48, cursor: "pointer",
                fontFamily: FONT, fontSize: 15, fontWeight: 600,
                color: "#DC2626",
                transition: REDUCED ? "none" : "all .2s ease",
              }}
              onMouseEnter={(e) => { e.target.style.background = "#FEF2F2"; e.target.style.borderColor = "#FECACA"; }}
              onMouseLeave={(e) => { e.target.style.background = "none"; e.target.style.borderColor = C.line; }}
            >
              Sign Out
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}