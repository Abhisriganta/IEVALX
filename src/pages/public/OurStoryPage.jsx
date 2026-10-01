import { useNavigate } from "react-router-dom";
import { Box, Typography, Stack, Container, Button, Paper } from "@mui/material";
import {
  FlagOutlined, VisibilityOutlined, HandshakeOutlined, ShieldOutlined, ArrowForward,
} from "@mui/icons-material";
import { C, FONT, CAN_HOVER } from "../landing/theme";
import { FadeUp, Eyebrow } from "../landing/primitives";
import PublicLayout, { PageHero } from "./PublicLayout";

/* ══════════════════════════════════════════════════════════════════════════
   OUR STORY — /our-story
   The footer "Our Story" link: editorial mission block, a sage-dot journey
   timeline, a values grid, an ink stats band and the pine CTA.
   ══════════════════════════════════════════════════════════════════════════ */

const TIMELINE = [
  { year: "2023", title: "The idea",
    desc: "Two hiring teams, one shared frustration: résumés said everything and proved nothing. We sketched a platform where skills are verified before the first interview." },
  { year: "2024", title: "First assessments live",
    desc: "Launched anti-cheat monitored skill assessments and the first version of the CIR score with a small group of partner employers in Hyderabad and Bangalore." },
  { year: "2025", title: "AI interviews at scale",
    desc: "Rolled out natural-language AI interviews and smart matching — candidates started hearing back in days, not weeks, and employers cut screening time by 70%." },
  { year: "2026", title: "A career built on proof",
    desc: "Today IEvalx connects verified candidates with screened employers across India, with every opening, interview and offer tracked in one place." },
];

const VALUES = [
  { icon: <ShieldOutlined />,     title: "Proof over promises",
    desc: "Every badge, score and shortlist on IEvalx is backed by a verified assessment — never by keywords alone." },
  { icon: <VisibilityOutlined />, title: "Radical transparency",
    desc: "Candidates see exactly how they're scored; employers see exactly what was tested. No black boxes." },
  { icon: <HandshakeOutlined />,  title: "Both sides win",
    desc: "We only build features that make hiring better for the candidate and the employer at the same time." },
  { icon: <FlagOutlined />,       title: "Every applicant hears back",
    desc: "Silence is the worst interview outcome. On IEvalx, feedback is part of the pipeline, not an afterthought." },
];

const STATS = [
  { n: "1.2L+", label: "Verified candidates" },
  { n: "850+",  label: "Screened employers" },
  { n: "4.6L+", label: "Assessments completed" },
  { n: "12 days", label: "Average time-to-hire" },
];

export default function OurStoryPage() {
  const navigate = useNavigate();
  return (
    <PublicLayout>
      <PageHero
        eyebrow="Our Story"
        title="Hiring Was Broken. We Started With Proof."
        subtitle="IEvalx began with a simple belief — careers should be built on verified ability, not keyword-matched résumés."
        back={{ label: "Back to Home", to: "/" }}
      />

      {/* ── mission editorial ── */}
      <Container maxWidth="md" sx={{ mt: { xs: 4.5, md: 6.5 } }}>
        <FadeUp>
          <Typography sx={{
            fontFamily: FONT, fontSize: { xs: 19, md: 24 }, fontWeight: 600,
            color: C.ink, lineHeight: 1.6, textAlign: "center",
          }}>
            "Our mission is to make every hire a{" "}
            <Box component="span" sx={{ color: C.sageDark }}>verified</Box>{" "}
            one — so great candidates stop being filtered out by software, and great
            teams stop gambling on paper."
          </Typography>
          <Typography sx={{
            fontFamily: FONT, fontSize: 13.5, color: C.muted, textAlign: "center", mt: 2,
          }}>
            — The IEvalx founding team
          </Typography>
        </FadeUp>
      </Container>

      {/* ── journey timeline ── */}
      <Container maxWidth="md" sx={{ mt: { xs: 6, md: 9 } }}>
        <FadeUp>
          <Eyebrow>The Journey</Eyebrow>
          <Typography sx={{
            fontFamily: FONT, fontSize: { xs: 26, md: 32 }, fontWeight: 700,
            color: C.ink, textAlign: "center", mt: 1,
          }}>
            From One Frustration to a Platform
          </Typography>
        </FadeUp>
        <Box sx={{ mt: 4.5, position: "relative", pl: { xs: 3.25, sm: 4 } }}>
          {/* rail */}
          <Box sx={{
            position: "absolute", left: { xs: 7, sm: 10 }, top: 6, bottom: 6,
            width: 2, borderRadius: 1, bgcolor: "rgba(127,158,126,0.35)",
          }} />
          <Stack spacing={4}>
            {TIMELINE.map((t, i) => (
              <FadeUp key={t.year} delay={i * 0.08}>
                <Box sx={{ position: "relative" }}>
                  {/* dot */}
                  <Box sx={{
                    position: "absolute", left: { xs: -26.5, sm: -32 }, top: 5,
                    width: 16, height: 16, borderRadius: "50%",
                    bgcolor: C.sage, border: "3px solid #fff",
                    boxShadow: "0 0 0 2px rgba(127,158,126,0.4)",
                  }} />
                  <Stack direction="row" spacing={1.25} sx={{ alignItems: "baseline" }}>
                    <Typography sx={{ fontFamily: FONT, fontSize: 14, fontWeight: 800, color: C.sageDark, letterSpacing: ".5px" }}>
                      {t.year}
                    </Typography>
                    <Typography sx={{ fontFamily: FONT, fontSize: 17, fontWeight: 700, color: C.ink }}>
                      {t.title}
                    </Typography>
                  </Stack>
                  <Typography sx={{ fontFamily: FONT, fontSize: 13.75, color: C.muted, mt: 0.875, lineHeight: 1.8, maxWidth: 620 }}>
                    {t.desc}
                  </Typography>
                </Box>
              </FadeUp>
            ))}
          </Stack>
        </Box>
      </Container>

      {/* ── values grid ── */}
      <Container maxWidth="lg" sx={{ mt: { xs: 7, md: 10 } }}>
        <FadeUp>
          <Eyebrow>What We Stand For</Eyebrow>
          <Typography sx={{
            fontFamily: FONT, fontSize: { xs: 26, md: 32 }, fontWeight: 700,
            color: C.ink, textAlign: "center", mt: 1,
          }}>
            The Values Behind the Product
          </Typography>
        </FadeUp>
        <Box sx={{
          display: "grid", gap: 2.5, mt: 4.5,
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
        }}>
          {VALUES.map((v, i) => (
            <FadeUp key={v.title} delay={(i % 2) * 0.1} sx={{ height: "100%" }}>
              <Paper elevation={0} sx={{
                bgcolor: "#fff", borderRadius: "18px", p: "24px", height: "100%",
                border: `1px solid ${C.line}`,
                boxShadow: "0 12px 30px rgba(2,33,36,0.05)",
                transition: "all .3s cubic-bezier(0.22,1,0.36,1)",
                "&:hover": CAN_HOVER ? {
                  transform: "translateY(-5px)",
                  boxShadow: "0 22px 50px rgba(2,33,36,0.11)",
                  borderColor: "rgba(127,158,126,0.5)",
                  "& .val-icon": { bgcolor: C.sage, color: "#fff" },
                } : {},
              }}>
                <Stack direction="row" spacing={2} sx={{ alignItems: "flex-start" }}>
                  <Box className="val-icon" sx={{
                    width: 48, height: 48, borderRadius: "13px", flexShrink: 0,
                    bgcolor: C.sageSoft, color: C.sageDark,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all .35s ease", "& svg": { fontSize: 23 },
                  }}>
                    {v.icon}
                  </Box>
                  <Box>
                    <Typography sx={{ fontFamily: FONT, fontSize: 16.5, fontWeight: 700, color: C.ink }}>
                      {v.title}
                    </Typography>
                    <Typography sx={{ fontFamily: FONT, fontSize: 13.25, color: C.muted, mt: 0.75, lineHeight: 1.75 }}>
                      {v.desc}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            </FadeUp>
          ))}
        </Box>
      </Container>

      {/* ── ink stats band ── */}
      <Container maxWidth="lg" sx={{ mt: { xs: 7, md: 10 } }}>
        <FadeUp>
          <Box sx={{
            borderRadius: "22px", bgcolor: C.ink,
            px: { xs: 3, md: 5 }, py: { xs: 4, md: 5 },
            display: "grid", gap: { xs: 3, md: 2 },
            gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
          }}>
            {STATS.map(s => (
              <Box key={s.label} sx={{ textAlign: "center" }}>
                <Typography sx={{ fontFamily: FONT, fontSize: { xs: 26, md: 32 }, fontWeight: 800, color: "#fff", lineHeight: 1 }}>
                  {s.n}
                </Typography>
                <Typography sx={{ fontFamily: FONT, fontSize: 12.5, color: "rgba(255,255,255,0.6)", mt: 1 }}>
                  {s.label}
                </Typography>
              </Box>
            ))}
          </Box>
        </FadeUp>
      </Container>

      {/* ── pine CTA ── */}
      <Container maxWidth="lg" sx={{ mt: { xs: 5, md: 7 }, mb: { xs: 6, md: 9 } }}>
        <FadeUp>
          <Box sx={{
            borderRadius: "22px", overflow: "hidden",
            background: `linear-gradient(120deg, ${C.pine} 0%, ${C.pine2} 100%)`,
            px: { xs: 3, md: 5 }, py: { xs: 4, md: 5 },
          }}>
            <Typography sx={{ fontFamily: FONT, fontSize: { xs: 21, md: 26 }, fontWeight: 700, color: "#fff", lineHeight: 1.3 }}>
              Be part of the next chapter
            </Typography>
            <Typography sx={{ fontFamily: FONT, fontSize: 14, color: C.mutedOnDark, mt: 1, maxWidth: 460, lineHeight: 1.75 }}>
              Whether you're proving your skills or hiring on proof — IEvalx was built for you.
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
              Join IEvalx
            </Button>
          </Box>
        </FadeUp>
      </Container>
    </PublicLayout>
  );
}