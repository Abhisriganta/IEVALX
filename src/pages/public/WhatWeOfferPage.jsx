import { useNavigate } from "react-router-dom";
import { Box, Typography, Stack, Container, Button, Paper } from "@mui/material";
import {
  FactCheckOutlined, SmartToyOutlined, WorkspacePremiumOutlined,
  JoinFullOutlined, VideocamOutlined, BusinessCenterOutlined, ArrowForward,
} from "@mui/icons-material";
import { C, FONT, CAN_HOVER } from "../landing/theme";
import { FadeUp, Eyebrow } from "../landing/primitives";
import PublicLayout, { PageHero } from "./PublicLayout";
import { STEPS } from "../landing/data";

/* ══════════════════════════════════════════════════════════════════════════
   WHAT WE OFFER — /what-we-offer
   The footer "What we Offer" link: six offer cards on the corner-fold-card
   family, the landing 3-step journey re-rendered as a compact strip, and the
   pine CTA band.
   ══════════════════════════════════════════════════════════════════════════ */

const OFFERS = [
  { icon: <FactCheckOutlined />,        title: "Verified Skill Assessments",
    desc: "Anti-cheat monitored tests that turn your skills into badges employers actually trust — proof, not claims." },
  { icon: <SmartToyOutlined />,         title: "AI Interviews",
    desc: "Practice or complete real screening rounds with a natural AI interviewer and get detailed feedback in minutes." },
  { icon: <WorkspacePremiumOutlined />, title: "CIR Score",
    desc: "One shareable Candidate Interview Readiness score that summarises your verified abilities across every assessment." },
  { icon: <JoinFullOutlined />,         title: "Smart Job Matching",
    desc: "Openings ranked against your verified skills and preferences — apply where you genuinely stand out." },
  { icon: <VideocamOutlined />,         title: "Live Interviews",
    desc: "Structured live rounds with recruiters, scheduled, recorded and scored inside one pipeline." },
  { icon: <BusinessCenterOutlined />,   title: "Employer Hiring Suite",
    desc: "Screening, CIR-based shortlisting and interview analytics that cut time-to-hire from weeks to days." },
];

export default function WhatWeOfferPage() {
  const navigate = useNavigate();
  return (
    <PublicLayout>
      <PageHero
        eyebrow="What we Offer"
        title="Everything You Need to Get Hired on Proof"
        subtitle="IEvalx replaces claims with verification — assessments, AI interviews and a single score that carries weight with every employer on the platform."
        back={{ label: "Back to Home", to: "/" }}
      />

      {/* ── offer cards ── */}
      <Container maxWidth="lg" sx={{ mt: { xs: 4.5, md: 6 } }}>
        <Box sx={{
          display: "grid", gap: 2.5,
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" },
        }}>
          {OFFERS.map((o, i) => (
            <FadeUp key={o.title} delay={(i % 3) * 0.1} sx={{ height: "100%" }}>
              <Paper elevation={0} sx={{
                bgcolor: "#fff", borderRadius: "18px", p: "24px 24px 26px", height: "100%",
                border: `1px solid ${C.line}`,
                boxShadow: "0 12px 30px rgba(2,33,36,0.05)",
                display: "flex", flexDirection: "column",
                transition: "all .3s cubic-bezier(0.22,1,0.36,1)",
                "&:hover": CAN_HOVER ? {
                  transform: "translateY(-6px)",
                  boxShadow: "0 24px 56px rgba(2,33,36,0.12)",
                  borderColor: "rgba(127,158,126,0.5)",
                  "& .offer-icon": { bgcolor: C.sage, color: "#fff" },
                } : {},
              }}>
                <Box className="offer-icon" sx={{
                  width: 52, height: 52, borderRadius: "14px",
                  bgcolor: C.sageSoft, color: C.sageDark,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all .35s ease", "& svg": { fontSize: 25 },
                }}>
                  {o.icon}
                </Box>
                <Typography sx={{ fontFamily: FONT, fontSize: 17.5, fontWeight: 700, color: C.ink, mt: 2.25 }}>
                  {o.title}
                </Typography>
                <Typography sx={{ fontFamily: FONT, fontSize: 13.5, color: C.muted, mt: 1, lineHeight: 1.75 }}>
                  {o.desc}
                </Typography>
              </Paper>
            </FadeUp>
          ))}
        </Box>
      </Container>

      {/* ── how it fits together — 3-step strip from the landing journey ── */}
      <Container maxWidth="lg" sx={{ mt: { xs: 7, md: 10 } }}>
        <FadeUp>
          <Eyebrow>How It Works</Eyebrow>
          <Typography sx={{
            fontFamily: FONT, fontSize: { xs: 26, md: 32 }, fontWeight: 700,
            color: C.ink, textAlign: "center", mt: 1,
          }}>
            Three Steps From Profile to Offer
          </Typography>
        </FadeUp>
        <Box sx={{
          display: "grid", gap: 2.5, mt: 4.5,
          gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
        }}>
          {STEPS.map((s, i) => (
            <FadeUp key={s.num} delay={i * 0.12}>
              <Stack direction="row" spacing={2} sx={{ alignItems: "flex-start" }}>
                <Box sx={{
                  width: 56, height: 56, borderRadius: "16px", flexShrink: 0,
                  bgcolor: C.sageSoft, color: C.sageDark, position: "relative",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {s.icon}
                  <Box sx={{
                    position: "absolute", top: -8, right: -8, minWidth: 22, height: 22,
                    borderRadius: "999px", bgcolor: C.sage, color: "#fff", px: 0.5,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: FONT, fontSize: 11, fontWeight: 700,
                  }}>
                    {s.num}
                  </Box>
                </Box>
                <Box>
                  <Typography sx={{ fontFamily: FONT, fontSize: 16, fontWeight: 700, color: C.ink }}>
                    {s.t1} {s.t2}
                  </Typography>
                  <Typography sx={{ fontFamily: FONT, fontSize: 13, color: C.muted, mt: 0.625, lineHeight: 1.7 }}>
                    {s.desc}
                  </Typography>
                </Box>
              </Stack>
            </FadeUp>
          ))}
        </Box>
      </Container>

      {/* ── pine CTA ── */}
      <Container maxWidth="lg" sx={{ mt: { xs: 7, md: 10 }, mb: { xs: 6, md: 9 } }}>
        <FadeUp>
          <Box sx={{
            borderRadius: "22px", overflow: "hidden",
            background: `linear-gradient(120deg, ${C.pine} 0%, ${C.pine2} 100%)`,
            px: { xs: 3, md: 5 }, py: { xs: 4, md: 5 },
          }}>
            <Typography sx={{ fontFamily: FONT, fontSize: { xs: 21, md: 26 }, fontWeight: 700, color: "#fff", lineHeight: 1.3 }}>
              Start proving your skills today
            </Typography>
            <Typography sx={{ fontFamily: FONT, fontSize: 14, color: C.mutedOnDark, mt: 1, maxWidth: 460, lineHeight: 1.75 }}>
              Create a free profile, take your first assessment and unlock every verified opening on IEvalx.
            </Typography>
            <Button
              onClick={() => navigate("/auth")}
              endIcon={<ArrowForward sx={{ fontSize: "16px !important" }} />}
              sx={{
                fontFamily: FONT, textTransform: "none", borderRadius: "999px",
                mt: 3, px: 3, height: 48, fontSize: 14.5, fontWeight: 600,
                bgcolor: C.sage, color: "#fff", minWidth: 0, lineHeight: 1,
                transition: "all .3s cubic-bezier(0.22,1,0.36,1)",
                "&:hover": { bgcolor: "#fff", color: C.pine },
              }}
            >
              Get Started Free
            </Button>
          </Box>
        </FadeUp>
      </Container>
    </PublicLayout>
  );
}