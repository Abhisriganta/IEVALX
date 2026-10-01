import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, GlobalStyles } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import publicSageTheme from "@/theme/publicSageTheme";

import { C, FONT, REDUCED } from "./landing/theme";
import { OffcanvasPanel } from "./landing/CardNav";
import MegaNav from "./landing/MegaNav";
import { usePublicJobs } from "@/services/api/publicJobsService";
import useApplyNavigation from "@/hooks/useApplyNavigation";

import HeroSection from "./landing/HeroSection";
import PartnerMarquee from "./landing/PartnerMarquee";
import HiringBanner from "./landing/HiringBanner";
import HowItWorks from "./landing/HowItWorks";
import CategoriesSection from "./landing/Categories";
import EasyFind from "./landing/EasyFind";
import FeatureJobs from "./landing/FeatureJobs";
import Cta40 from "./landing/Cta40";
import TestimonialsSection from "./landing/Testimonials";
import PricingSection from "./landing/Pricing";
import FaqSection from "./landing/FaqSection";
import UploadCv from "./landing/UploadCv";
import BlogsSection from "./landing/Blogs";
import FooterSection from "./landing/Footer";



const LandingPage = () => {
  const navigate = useNavigate();
  const [panelOpen, setPanelOpen] = useState(false);

 
  const { goToAIInterview, goToAssessments } = useApplyNavigation();

  // Live PUBLISHED + APPROVED job count for the MegaNav "Jobs" featured tile
  // (shared cached fetch — same request Feature Jobs / Categories use).
  const { jobs: liveJobs } = usePublicJobs();
  const liveCount = liveJobs ? liveJobs.length : null;

  const howRef     = useRef(null);
  const catRef     = useRef(null);
  const jobsRef    = useRef(null);
  const blogRef    = useRef(null);
  const pricingRef = useRef(null);
  const testiRef   = useRef(null);

  const scrollTo = (ref) =>
    ref?.current?.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "start" });

  const SECTIONS = [
    {
      label: "Company", match: ["/our-story", "/what-we-offer", "/blogs", "/pricing"],
      groups: [
        { head: "Know us", links: [
          { label: "Our Story",     onClick: () => navigate("/our-story") },
          { label: "What we Offer", onClick: () => navigate("/what-we-offer") },
          { label: "Testimonials",  onClick: () => scrollTo(testiRef) },
        ]},
        { head: "Resources", links: [
          { label: "Blog",    onClick: () => scrollTo(blogRef) },
          { label: "Pricing", onClick: () => scrollTo(pricingRef) },
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
      label: "Platform", match: ["/categories"],
      groups: [
        { head: "Product", links: [
          { label: "How it works", onClick: () => scrollTo(howRef) },
          { label: "Categories",   onClick: () => scrollTo(catRef) },
        ]},
        { head: "Explore", links: [
          { label: "All categories", onClick: () => navigate("/categories") },
          { label: "Pricing plans",  onClick: () => navigate("/pricing") },
        ]},
      ],
      featured: {
        title: "One score. Every employer.",
        desc: "Verified assessments, AI interviews and smart matching in a single pipeline.",
        cta: "See how it works", onClick: () => scrollTo(howRef),
      },
    },
    {
      label: "Jobs", match: ["/jobs"],
      groups: [
        { head: "Find work", links: [
          { label: "Browse jobs",        onClick: () => navigate("/jobs") },
          { label: "Feature job offers", onClick: () => scrollTo(jobsRef) },
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
      label: "Services", match: ["/support"],
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
    /* Scoped sage theme — replaces the app-wide BLUE dashboard theme for the
       whole public landing subtree (drawers, checkboxes, inputs, selects). */
    <ThemeProvider theme={publicSageTheme}>
    <Box sx={{ fontFamily: FONT, color: C.text, bgcolor: C.cream }}>
    
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
        onLogoClick={() => window.scrollTo({ top: 0, behavior: REDUCED ? "auto" : "smooth" })}
        ctaLabel="Sign Up"
        onCtaClick={() => navigate("/auth")}
        onDotsClick={() => setPanelOpen(true)}
      />

      {/* ── OFFCANVAS (fixed; outside the clip-path hero wrapper) ── */}
      <OffcanvasPanel open={panelOpen} onClose={() => setPanelOpen(false)} />

      <HeroSection />
      <PartnerMarquee />
      <HiringBanner />
      <HowItWorks howRef={howRef} />
      <CategoriesSection catRef={catRef} />
      <EasyFind />
      <FeatureJobs jobsRef={jobsRef} />
      <Cta40 />
      <TestimonialsSection testiRef={testiRef} />
      <PricingSection pricingRef={pricingRef} />
      <FaqSection />
      <UploadCv />
      <BlogsSection blogRef={blogRef} />
      <FooterSection />
    </Box>
    </ThemeProvider>
  );
};

export default LandingPage;