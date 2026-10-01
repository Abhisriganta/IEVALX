import { useLayoutEffect, useRef, useState, useEffect } from "react";
import { gsap } from "gsap";
import { GoArrowUpRight } from "react-icons/go";
import { useNavigate, useLocation } from "react-router-dom";
import { Box, Typography, Stack, GlobalStyles } from "@mui/material";
import { Close, ArrowForward, Facebook, Twitter, LinkedIn, YouTube, WhatsApp } from "@mui/icons-material";
import { C, FONT, REDUCED, CAN_HOVER } from "./theme";

export const CARD_NAV_CSS = `
.card-nav-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  width: 100%;
  max-width: none;
  z-index: 1000;
  box-sizing: border-box;
  font-family: 'Jost', 'DM Sans', sans-serif;
}

.card-nav {
  display: block;
  height: 76px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 0 0 0.75rem 0.75rem;
  box-shadow: none;
  position: relative;
  overflow: hidden;
  will-change: height;
  transition: background 0.3s ease, box-shadow 0.3s ease;
}

.card-nav.scrolled,
.card-nav.open {
  background: rgba(212, 226, 227, 0.97);
  border-bottom: 0.5px solid rgba(31, 31, 31, 0.08);
  box-shadow: 0 10px 34px rgba(2, 33, 36, 0.10);
}

@media (prefers-reduced-motion: reduce) {
  .card-nav {
    transition: none;
  }
}

.card-nav-top {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 76px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.65rem 1rem 0.7rem 1.5rem;
  z-index: 2;
}

.hamburger-menu {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  gap: 6px;
}

.hamburger-menu:hover .hamburger-line {
  opacity: 0.75;
}

.hamburger-line {
  width: 30px;
  height: 2px;
  background-color: currentColor;
  transition:
    transform 0.25s ease,
    opacity 0.2s ease,
    margin 0.3s ease;
  transform-origin: 50% 50%;
}

.hamburger-menu.open .hamburger-line:first-child {
  transform: translateY(4px) rotate(45deg);
}

.hamburger-menu.open .hamburger-line:last-child {
  transform: translateY(-4px) rotate(-45deg);
}

.logo-container {
  display: flex;
  align-items: center;
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
}

.card-nav-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.card-nav-logo-mark {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #7e9e7e;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 800;
}

.card-nav-logo-word {
  font-size: 23px;
  font-weight: 600;
  color: #1f1f1f;
  letter-spacing: -0.4px;
}

.card-nav-cta-button {
  position: relative;
  overflow: hidden;
  background-color: #1f1f1f;
  border: 1.5px solid #1f1f1f;
  border-radius: 999px;
  padding: 0 2.75rem;
  min-width: 190px;
  height: 100%;
  font-weight: 500;
  font-size: 15.5px;
  font-family: 'Jost', 'DM Sans', sans-serif;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-nav-cta-button .cta-label {
  position: relative;
  z-index: 2;
  color: #fff;
  transition: color 0.45s cubic-bezier(0.22, 1, 0.36, 1);
}

.card-nav-cta-button .cta-bloom {
  position: absolute;
  z-index: 1;
  left: 100%;
  top: 100%;
  width: 480px;
  height: 480px;
  margin: -240px 0 0 -240px;
  border-radius: 50%;
  background: #fff;
  transform: scale(0);
  transition: transform 0.55s cubic-bezier(0.22, 1, 0.36, 1);
  pointer-events: none;
}

.card-nav-cta-button:hover .cta-bloom {
  transform: scale(1);
}

.card-nav-cta-button:hover .cta-label {
  color: #1f1f1f;
}

@media (prefers-reduced-motion: reduce) {
  .card-nav-cta-button .cta-bloom,
  .card-nav-cta-button .cta-label {
    transition: none;
  }
}

.card-nav-content {
  position: absolute;
  left: 0;
  right: 0;
  top: 76px;
  bottom: 0;
  padding: 0.5rem 1rem 0.75rem;
  display: flex;
  align-items: stretch;
  gap: 12px;
  visibility: hidden;
  pointer-events: none;
  z-index: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  scrollbar-color: rgba(31,31,31,0.25) transparent;
}
.card-nav-content::-webkit-scrollbar { width: 5px; }
.card-nav-content::-webkit-scrollbar-thumb {
  background: rgba(31,31,31,0.25);
  border-radius: 999px;
}

.card-nav.open .card-nav-content {
  visibility: visible;
  pointer-events: auto;
}

.nav-card {
  height: auto;
  min-height: 100%;
  flex: 1 1 0;
  min-width: 0;
  border-radius: calc(0.75rem - 0.2rem);
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 12px 16px;
  gap: 8px;
  user-select: none;
}

.nav-card-label {
  font-weight: 400;
  font-size: 22px;
  letter-spacing: -0.5px;
}

.nav-card-links {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.nav-card-link {
  font-size: 16px;
  cursor: pointer;
  text-decoration: none;
  color: inherit;
  transition: opacity 0.3s ease;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.nav-card-link:hover {
  opacity: 0.75;
}

.card-nav-right {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 100%;
}

.card-nav-dots {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: #fff;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  box-shadow: 0 6px 18px rgba(2, 33, 36, 0.14);
  padding: 0;
}

@media (max-width: 768px) {
  .card-nav-container {
    width: 100%;
    top: 0;
  }

  .card-nav-dots {
    display: none;
  }

  .card-nav-top {
    padding: 0.5rem 1rem;
    justify-content: space-between;
  }

  .hamburger-menu {
    order: 2;
  }

  .logo-container {
    position: static;
    transform: none;
    order: 1;
  }

  .card-nav-cta-button {
    display: none;
  }

  .card-nav-content {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
    padding: 0.5rem;
    bottom: 0;
    justify-content: flex-start;
  }

  .nav-card {
    height: auto;
    min-height: 0;
    flex: 0 0 auto;   /* natural height; NEVER compress — the panel scrolls instead */
    max-height: none;
  }

  .nav-card-links {
    margin-top: 8px;
    gap: 8px;         /* larger touch targets on phones */
  }

  .nav-card-link {
    padding: 2px 0;
    min-height: 30px; /* comfortable tap height */
  }

  .nav-card-label {
    font-size: 18px;
  }

  .nav-card-link {
    font-size: 15px;
  }
}
@media (min-width: 769px) and (max-width: 1024px) {
  .card-nav-content {
    flex-wrap: wrap;
  }
  .nav-card {
    flex: 1 1 calc(50% - 6px);
    min-width: calc(50% - 6px);
    min-height: 150px;
  }
}

@media (max-width: 480px) {
  .card-nav-cta-button {
    min-width: 0 !important;
    padding: 0 1.1rem !important;
    font-size: 13px !important;
    height: 40px !important;
  }
  .card-nav-logo-word { font-size: 17px !important; }
  .card-nav-top { padding: 0 0.75rem !important; }
}
`;

export const CardNav = ({
  renderLogo,
  items,
  className = "",
  ease = "power3.out",
  menuColor,
  ctaLabel = "Sign Up",
  onCtaClick,
  onDotsClick,
}) => {
  const [isHamburgerOpen, setIsHamburgerOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  /* mirror of isExpanded readable inside effects without dep loops */
  const isExpandedRef = useRef(false);
  useEffect(() => { isExpandedRef.current = isExpanded; }, [isExpanded]);
  /* content-stable key: parents recreate the items ARRAY every render, so
     depending on identity rebuilt (and visually reset) the timeline on every
     re-render — including while the menu was open. Key on content instead. */
  const itemsKey = (items || [])
    .map(it => `${it.label}:${(it.links || []).map(l => l.label).join(",")}`)
    .join("|");
  const { pathname } = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const navRef = useRef(null);
  const cardsRef = useRef([]);
  const tlRef = useRef(null);

  const calculateHeight = () => {
    const navEl = navRef.current;
    if (!navEl) return 276;

    /* Measure the real content height on EVERY viewport (the old code only
       measured on mobile and hardcoded 276px on desktop, which clipped any
       card with more than ~3 links). The content is briefly made static +
       auto-height so .nav-card { height:100% } resolves to natural size,
       measured, then restored. */
    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    const contentEl = navEl.querySelector(".card-nav-content");
    if (!contentEl) return 276;

    const wasVisible = contentEl.style.visibility;
    const wasPointerEvents = contentEl.style.pointerEvents;
    const wasPosition = contentEl.style.position;
    const wasHeight = contentEl.style.height;

    contentEl.style.visibility = "visible";
    contentEl.style.pointerEvents = "auto";
    contentEl.style.position = "static";
    contentEl.style.height = "auto";

    contentEl.offsetHeight;

    const topBar = 76;
    const padding = 16;
    const contentHeight = contentEl.scrollHeight;

    contentEl.style.visibility = wasVisible;
    contentEl.style.pointerEvents = wasPointerEvents;
    contentEl.style.position = wasPosition;
    contentEl.style.height = wasHeight;

    const measured = topBar + contentHeight + padding;
    /* desktop keeps its designed minimum so short cards look unchanged */
    const floored = isMobile ? measured : Math.max(276, measured);
    /* never taller than the REAL visible viewport (visualViewport accounts
       for mobile URL bars / keyboards) — beyond this the content scrolls */
    const viewportH = window.visualViewport?.height || window.innerHeight;
    return Math.min(floored, viewportH - 16);
  };

  const createTimeline = () => {
    const navEl = navRef.current;
    if (!navEl) return null;

    gsap.set(navEl, { height: 76, overflow: "hidden" });
    gsap.set(cardsRef.current, { y: REDUCED ? 0 : 50, opacity: REDUCED ? 1 : 0 });

    const tl = gsap.timeline({ paused: true });

    tl.to(navEl, {
      height: calculateHeight,
      duration: REDUCED ? 0 : 0.4,
      ease,
    });

    tl.to(
      cardsRef.current,
      { y: 0, opacity: 1, duration: REDUCED ? 0 : 0.4, ease, stagger: REDUCED ? 0 : 0.08 },
      "-=0.1"
    );

    return tl;
  };

  useLayoutEffect(() => {
    const tl = createTimeline();
    tlRef.current = tl;

    /* if a rebuild happens while the menu is open (content change on an open
       menu), restore the open visual state instead of silently collapsing */
    if (tl && isExpandedRef.current) {
      tl.progress(1);
      if (navRef.current) gsap.set(navRef.current, { height: calculateHeight() });
    }

    return () => {
      tl?.kill();
      tlRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ease, itemsKey]);

  useLayoutEffect(() => {
    const handleResize = () => {
      if (!tlRef.current) return;

      if (isExpanded) {
        const newHeight = calculateHeight();
        gsap.set(navRef.current, { height: newHeight });

        tlRef.current.kill();
        const newTl = createTimeline();
        if (newTl) {
          newTl.progress(1);
          tlRef.current = newTl;
        }
      } else {
        tlRef.current.kill();
        const newTl = createTimeline();
        if (newTl) {
          tlRef.current = newTl;
        }
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExpanded]);

  const toggleMenu = () => {
    const tl = tlRef.current;
    if (!tl) return;
    if (!isExpanded) {
      setIsHamburgerOpen(true);
      setIsExpanded(true);
      tl.play(0);
    } else {
      setIsHamburgerOpen(false);
      if (tl.progress() === 0) {
        /* nothing to reverse — snap the state closed */
        closeMenuImmediate();
      } else {
        tl.eventCallback("onReverseComplete", () => setIsExpanded(false));
        tl.reverse();
      }
    }
  };

  const closeMenu = () => {
    if (isExpanded) toggleMenu();
  };

  /* Close instantly and deterministically: rewind the timeline, force the
     collapsed geometry, and sync both states. Used before navigation (so we
     never unmount mid-animation) and on every route change (so a nav that
     arrives in ANY broken state self-heals to closed). */
  const closeMenuImmediate = () => {
    const tl = tlRef.current;
    if (tl) tl.pause(0);
    if (navRef.current) gsap.set(navRef.current, { height: 76, overflow: "hidden" });
    if (cardsRef.current.length) {
      gsap.set(cardsRef.current, { y: REDUCED ? 0 : 50, opacity: REDUCED ? 1 : 0 });
    }
    setIsHamburgerOpen(false);
    setIsExpanded(false);
  };

  /* route changed → whatever was happening, land closed and functional */
  useEffect(() => {
    closeMenuImmediate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  /* on phones/tablets the open panel can cover most of the screen — lock the
     page behind it so only the panel scrolls; restored on close/unmount */
  useEffect(() => {
    if (!isExpanded) return;
    if (!window.matchMedia("(max-width: 1024px)").matches) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [isExpanded]);

  const setCardRef = i => el => {
    if (el) cardsRef.current[i] = el;
  };

  return (
    <div className={`card-nav-container ${className}`}>
      <GlobalStyles styles={CARD_NAV_CSS} />
      <nav
        ref={navRef}
        className={`card-nav ${isExpanded ? "open" : ""} ${scrolled ? "scrolled" : ""}`}
      >
        <div className="card-nav-top">
          <div
            className={`hamburger-menu ${isHamburgerOpen ? "open" : ""}`}
            onClick={toggleMenu}
            onKeyDown={e => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggleMenu();
              }
            }}
            role="button"
            aria-label={isExpanded ? "Close menu" : "Open menu"}
            aria-expanded={isExpanded}
            tabIndex={0}
            style={{ color: menuColor || "#000" }}
          >
            <div className="hamburger-line" />
            <div className="hamburger-line" />
          </div>

          <div className="logo-container">{renderLogo}</div>

          <div className="card-nav-right">
            <button
              type="button"
              className="card-nav-cta-button"
              onClick={onCtaClick}
            >
              <span className="cta-label">{ctaLabel}</span>
              <span className="cta-bloom" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="card-nav-dots"
              aria-label="Open company panel"
              onClick={onDotsClick}
            >
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                {[4, 12, 20].map(y =>
                  [4, 12, 20].map(x => (
                    <circle key={`${x}-${y}`} cx={x} cy={y} r="2.3" fill="#1F1F1F" />
                  ))
                )}
              </svg>
            </button>
          </div>
        </div>

        <div className="card-nav-content" aria-hidden={!isExpanded}>
          {(items || []).map((item, idx) => (
            <div
              key={`${item.label}-${idx}`}
              className="nav-card"
              ref={setCardRef(idx)}
              style={{ backgroundColor: item.bgColor, color: item.textColor }}
            >
              <div className="nav-card-label">{item.label}</div>
              <div className="nav-card-links">
                {item.links?.map((lnk, i) => (
                  <a
                    key={`${lnk.label}-${i}`}
                    className="nav-card-link"
                    href={lnk.href || "#"}
                    aria-label={lnk.ariaLabel}
                    onClick={e => {
                      if (lnk.onClick) {
                        e.preventDefault();
                        closeMenuImmediate();
                        lnk.onClick();
                      }
                    }}
                  >
                    <GoArrowUpRight className="nav-card-link-icon" aria-hidden="true" />
                    {lnk.label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </nav>
    </div>
  );
};

export function OffcanvasPanel({ open, onClose }) {
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

  return (
    <>
      {/* Dim overlay */}
      <Box
        onClick={onClose}
        sx={{
          position: "fixed", inset: 0, zIndex: 1100,
          bgcolor: "rgba(2,33,36,0.5)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: REDUCED ? "none" : `opacity .4s ${EASE}`,
        }}
      />

      {/* Sliding panel */}
      <Box
        role="dialog"
        aria-modal="true"
        aria-label="About IEvalx"
        aria-hidden={!open}
        sx={{
          position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 1200,
          width: { xs: "88vw", sm: 400 },
          bgcolor: "#fff",
          boxShadow: "-24px 0 60px rgba(2,33,36,0.22)",
          transform: open ? "translateX(0)" : "translateX(104%)",
          visibility: open ? "visible" : "hidden",
          transition: REDUCED ? "none"
            : `transform .5s ${EASE}, visibility 0s linear ${open ? "0s" : ".5s"}`,
          overflowY: "auto",
          fontFamily: FONT,
          p: { xs: 3, sm: 4 },
          "&::-webkit-scrollbar": { display: "none" },
          scrollbarWidth: "none",
        }}
      >
        {/* Close */}
        <Box
          onClick={onClose}
          role="button"
          aria-label="Close panel"
          tabIndex={0}
          onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClose(); } }}
          sx={{
            width: 44, height: 44, borderRadius: "50%", ml: "auto",
            border: "1.5px solid rgba(31,31,31,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", transition: "all .25s ease",
            "&:hover": { bgcolor: C.ink, borderColor: C.ink, "& svg": { color: "#fff" } },
          }}
        >
          <Close sx={{ fontSize: 20, color: C.ink, transition: "color .25s" }} />
        </Box>

        {/* About Company */}
        <Typography sx={{ fontFamily: FONT, fontSize: 24, fontWeight: 600, color: C.ink, mt: 1 }}>
          About Company
        </Typography>
        <Box sx={{ width: 38, height: 3, bgcolor: C.sage, borderRadius: "2px", mt: 1, mb: 2.25 }} />
        <Typography sx={{ fontFamily: FONT, fontSize: 14, color: C.muted, lineHeight: 1.85 }}>
          IEvalx is the AI hiring platform where verified skills meet real
          opportunities — AI interviews, monitored assessments, CIR scoring and
          smart matching bring employers and job seekers together in one place.
        </Typography>

        {/* Socials */}
        <Stack direction="row" spacing={1.25} sx={{ mt: 2.75 }}>
          {[<Facebook key="f" />, <Twitter key="t" />, <LinkedIn key="l" />, <WhatsApp key="w" />, <YouTube key="y" />].map((ic, i) => (
            <Box key={i} sx={{
              width: 40, height: 40, borderRadius: "50%",
              border: "1px solid rgba(31,31,31,0.15)", color: C.ink,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", transition: "all .25s ease",
              "& svg": { fontSize: 17 },
              "&:hover": { bgcolor: C.sage, borderColor: C.sage, color: "#fff" },
            }}>
              {ic}
            </Box>
          ))}
        </Stack>

        {/* Get In Touch */}
        <Typography sx={{ fontFamily: FONT, fontSize: 21, fontWeight: 600, color: C.ink, mt: 4.5 }}>
          Get In Touch
        </Typography>
        <Box sx={{ width: 38, height: 3, bgcolor: C.sage, borderRadius: "2px", mt: 1, mb: 2.25 }} />
        <Typography sx={{ fontFamily: FONT, fontSize: 14, color: C.muted, lineHeight: 1.85 }}>
          Lanciere Technologies,<br />Hyderabad, Telangana, India
        </Typography>
        <Typography sx={{ fontFamily: FONT, fontSize: 14, color: C.sageDark, fontWeight: 500, mt: 1.75, lineHeight: 1.8 }}>
          info@ievalx.com<br />support@ievalx.com
        </Typography>
        <Typography sx={{ fontFamily: FONT, fontSize: 14, color: C.muted, mt: 1.75 }}>
          +91 40 1234 5678
        </Typography>
      </Box>
    </>
  );
}