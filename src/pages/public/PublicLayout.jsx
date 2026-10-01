import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Box, Typography, Container, GlobalStyles, Stack } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import publicSageTheme from "@/theme/publicSageTheme";
import { ArrowBack } from "@mui/icons-material";
import { C, FONT, REDUCED, CAN_HOVER } from "../landing/theme";
import { OffcanvasPanel } from "../landing/CardNav";
import MegaNav from "../landing/MegaNav";
import { usePublicJobs } from "@/services/api/publicJobsService";
import useApplyNavigation from "@/hooks/useApplyNavigation";
import FooterSection from "../landing/Footer";
import { FadeUp, Eyebrow } from "../landing/primitives";


export default function PublicLayout({ children, hero }) {
  const navigate  = useNavigate();
  const { pathname } = useLocation();
  const [panelOpen, setPanelOpen] = useState(false);

  
  const { goToAIInterview, goToAssessments } = useApplyNavigation();

  // Live PUBLISHED + APPROVED job count for the MegaNav "Jobs" featured tile
  // (shared cached fetch — the same request the landing sections use).
  const { jobs: liveJobs } = usePublicJobs();
  const liveCount = liveJobs ? liveJobs.length : null;

  // Fresh page = start at the top (react-router keeps scroll otherwise).
  useEffect(() => { window.scrollTo({ top: 0, behavior: "auto" }); }, [pathname]);

  const SECTIONS = [
    {
      label: "Company", match: ["/our-story", "/what-we-offer", "/blogs", "/support", "/pricing"],
      groups: [
        { head: "Know us", links: [
          { label: "Our Story",     onClick: () => navigate("/our-story") },
          { label: "What we Offer", onClick: () => navigate("/what-we-offer") },
        ]},
        { head: "Resources", links: [
          { label: "Blog",    onClick: () => navigate("/blogs") },
          { label: "Pricing", onClick: () => navigate("/pricing") },
          { label: "Support", onClick: () => navigate("/support") },
        ]},
      ],
      featured: {
        title: "Built on proof, not promises",
        desc: "Read how the CIR score is changing hiring for both sides of the table.",
        cta: "Our Story", onClick: () => navigate("/our-story"),
      },
    },
    {
      label: "Platform", match: ["/", "/categories"],
      groups: [
        { head: "Product", links: [
          { label: "Home",       onClick: () => navigate("/") },
          { label: "Categories", onClick: () => navigate("/categories") },
        ]},
        { head: "Explore", links: [
          { label: "Browse jobs",   onClick: () => navigate("/jobs") },
          { label: "Pricing plans", onClick: () => navigate("/pricing") },
        ]},
      ],
      featured: {
        title: "One score. Every employer.",
        desc: "Verified assessments, AI interviews and smart matching in a single pipeline.",
        cta: "What we Offer", onClick: () => navigate("/what-we-offer"),
      },
    },
    {
      label: "Jobs", match: ["/jobs"],
      groups: [
        { head: "Find work", links: [
          { label: "Browse jobs",    onClick: () => navigate("/jobs") },
          { label: "All categories", onClick: () => navigate("/categories") },
        ]},
        { head: "Employers", links: [
          { label: "Post a job", onClick: () => navigate("/auth") },
        ]},
      ],
      featured: {
        title: liveCount == null
          ? "Verified openings live"
          : `${liveCount} verified opening${liveCount === 1 ? "" : "s"} live`,
        desc: "Every role is screened, every employer replies — filter by skill, city and salary.",
        cta: "Browse jobs", onClick: () => navigate("/jobs"),
      },
    },
    {
      label: "Services", match: [],
      groups: [
        { head: "For candidates", links: [
          { label: "AI Interviews", onClick: goToAIInterview },
          { label: "Assessments",   onClick: goToAssessments },
        ]},
        { head: "For employers", links: [
          { label: "Employer suite",  onClick: () => navigate("/auth") },
          { label: "Talk to support", onClick: () => navigate("/support") },
        ]},
      ],
      featured: {
        title: "Cut time-to-hire to 12 days",
        desc: "CIR-based shortlisting and interview analytics for hiring teams.",
        cta: "Get started", onClick: () => navigate("/auth"),
      },
    },
  ];

  return (
    /* Scoped sage theme — replaces the app-wide BLUE dashboard theme for
       every public page (/jobs drawer, checkboxes, inputs, selects). */
    <ThemeProvider theme={publicSageTheme}>
    <Box sx={{ fontFamily: FONT, color: C.text, bgcolor: C.cream, minHeight: "100vh" }}>
      <GlobalStyles
        styles={{
         
          "html, body": {
            overflowX: "clip",
            "@supports not (overflow: clip)": { overflowX: "hidden" },
          },
        }}
      />

      <MegaNav
        sections={SECTIONS}
        onLogoClick={() => navigate("/")}
        ctaLabel="Sign Up"
        onCtaClick={() => navigate("/auth")}
        onDotsClick={() => setPanelOpen(true)}
      />
      <OffcanvasPanel open={panelOpen} onClose={() => setPanelOpen(false)} />

      {children}

      <FooterSection />
    </Box>
    </ThemeProvider>
  );
}

/* ── PAGE HERO — pale sage band with breadcrumb-style eyebrow + title.
      Shared by all four public pages so their headers stay identical.  ──── */
export function PageHero({ eyebrow, title, subtitle, back, children }) {
  const navigate = useNavigate();
  return (
    <Box sx={{
      bgcolor: C.hero, position: "relative", overflow: "hidden",
      pt: { xs: 13, md: 16 }, pb: { xs: 4.5, md: 6.5 },
      clipPath: { md: "polygon(0 0, 100% 0, 100% 94%, 0 100%)" },
    }}>
      {/* soft background geometry echoing the landing hero */}
      <Box sx={{
        position: "absolute", inset: 0, pointerEvents: "none",
        display: { xs: "none", md: "block" },
      }}>
        <Box sx={{
          position: "absolute", inset: 0, bgcolor: "rgba(126,158,126,0.28)",
          clipPath: "polygon(72% 0, 100% 0, 100% 100%, 55% 100%)",
        }} />
        <Box sx={{
          position: "absolute", inset: 0, bgcolor: "rgba(127,158,126,0.5)",
          clipPath: "polygon(82% 0, 100% 0, 100% 68%, 66% 100%, 62% 100%)",
        }} />
      </Box>

      <Container maxWidth="lg" sx={{ position: "relative" }}>
        <FadeUp>
          {back && (
            <Box
              onClick={() => navigate(back.to)}
              role="link" tabIndex={0} aria-label={back.label}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(back.to); } }}
              sx={{
                display: "inline-flex", alignItems: "center", gap: 0.75,
                mb: 2.5, px: 1.75, height: 36, borderRadius: "999px",
                border: "1.5px solid rgba(31,31,31,0.22)", cursor: "pointer",
                outline: "none", userSelect: "none", bgcolor: "rgba(255,255,255,0.45)",
                fontFamily: FONT, fontSize: 13, fontWeight: 600, color: C.ink,
                transition: REDUCED ? "none" : "all .25s ease",
                "& svg": { transition: REDUCED ? "none" : "transform .25s cubic-bezier(0.22,1,0.36,1)" },
                "&:hover": CAN_HOVER ? {
                  bgcolor: C.ink, borderColor: C.ink, color: "#fff",
                  "& svg": { transform: "translateX(-3px)" },
                } : {},
                "&:focus-visible": { borderColor: C.ink },
              }}
            >
              <ArrowBack sx={{ fontSize: 15 }} />
              {back.label}
            </Box>
          )}
          <Eyebrow align="left">{eyebrow}</Eyebrow>
          <Typography component="h1" sx={{
            fontFamily: FONT, fontWeight: 800, color: C.ink,
            fontSize: { xs: 30, sm: 38, md: 48 },
            lineHeight: 1.1, letterSpacing: "-0.5px", mt: 1.5,
          }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography sx={{
              fontFamily: FONT, fontSize: { xs: 14, sm: 15.5 }, color: "#4A524C",
              mt: 1.75, maxWidth: 620, lineHeight: 1.75,
            }}>
              {subtitle}
            </Typography>
          )}
        </FadeUp>
        {children && <Box sx={{ mt: 3.5 }}>{children}</Box>}
      </Container>
    </Box>
  );
}