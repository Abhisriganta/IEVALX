import { useState } from "react";
import { Box, Typography, Stack, Paper, Container } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ROLES } from "@/constants";
import { C, FONT } from "./theme";
import { FadeUp, SageButton } from "./primitives";
import { CTA40_ART } from "./data";

export default function Cta40({  }) {
  const [artSrc, setArtSrc] = useState(CTA40_ART.src);
  const navigate = useNavigate();
  const { isAuthenticated, role } = useAuth();

  const handlePostJobClick = () => {
    if (!isAuthenticated) {
      navigate("/auth?view=register-company");
      return;
    }
    if (role === ROLES.COMPANY)  { navigate("/company/job-postings"); return; }
    if (role === ROLES.EMPLOYER) { navigate("/employer/my-jobs");     return; }
    navigate("/jobseeker/overview");
  };

  return (
    <>

      <Box sx={{
        position: "relative", mt: { xs: 8, md: 12 }, py: { xs: 6, md: 8 },
        overflow: "hidden",
        backgroundImage: `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><rect width='240' height='240' fill='%23F5F5F2'/><polygon points='0,0 120,0 60,90' fill='%23E9E9E5'/><polygon points='120,0 240,0 190,70' fill='%23EEEEE9'/><polygon points='60,90 120,0 190,70' fill='%23F1F1EC'/><polygon points='0,0 60,90 0,140' fill='%23EBEBE6'/><polygon points='240,0 190,70 240,120' fill='%23E6E6E1'/><polygon points='0,140 60,90 110,170' fill='%23F3F3EF'/><polygon points='60,90 190,70 110,170' fill='%23E9E9E5'/><polygon points='190,70 240,120 110,170' fill='%23EFEFEA'/><polygon points='0,140 110,170 0,240' fill='%23EAEAE5'/><polygon points='0,240 110,170 130,240' fill='%23F1F1EC'/><polygon points='110,170 240,120 240,240 130,240' fill='%23EBEBE6'/></svg>")`,
        backgroundSize: "240px 240px",
      }}>
        
        <Box sx={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "linear-gradient(to right, rgba(252,252,250,0) 0%, rgba(252,252,250,0.65) 26%, #FCFCFA 52%)",
        }} />

        <Container maxWidth="lg" sx={{ position: "relative" }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={{ xs: 6, md: 8 }} sx={{ alignItems: "center" }}>

            {/* ─ left copy ─ */}
            <Box sx={{ flex: 1.6, minWidth: 0 }}>
              <FadeUp>
                <Typography sx={{
                  fontFamily: FONT, fontSize: { xs: 27, sm: 32, md: 52 }, fontWeight: 700,
                  color: C.ink, lineHeight: 1.12, letterSpacing: "-0.8px",
                }}>
                  Get Over 40,000+ Talented And Expert Job Holders!
                </Typography>
                <Typography sx={{ fontFamily: FONT, fontSize: 14.5, color: C.muted, mt: 2, maxWidth: 460, lineHeight: 1.75 }}>
                  Employers post jobs and track applicants through AI-scored pipelines —
                  every candidate arrives with verified skills, assessment scores and a CIR rating.
                </Typography>
                <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mt: 2.5 }}>
                  <Box sx={{
                    width: 22, height: 22, borderRadius: "50%", bgcolor: C.sage, flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Box component="svg" viewBox="0 0 24 24" sx={{ width: 13, height: 13 }}>
                      <path d="M5 12.5 L10 17 L19 7.5" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </Box>
                  </Box>
                  <Typography sx={{ fontFamily: FONT, fontSize: 14.5, fontWeight: 600, color: C.ink }}>
                    Get top assessment-verified experts for your project
                  </Typography>
                </Stack>
                <SageButton onClick={handlePostJobClick} sx={{ mt: 4, px: 3.5 }}>
                  + Post A Job
                </SageButton>
              </FadeUp>
            </Box>

            <FadeUp delay={0.15} sx={{ flex: 1, display: "flex", justifyContent: "center", width: "100%" }}>
              <Box sx={{ position: "relative", width: { xs: 340, md: 560 }, height: { xs: 400, md: 540 }, maxWidth: "100%" }}>
                
                <Box sx={{
                  position: "absolute", left: 0, right: 0, bottom: 0,
                  top: { xs: 40, md: 56 },
                  bgcolor: C.sage,
                  borderRadius: "28px 28px 28px 28px",
                  clipPath: "polygon(0 0, 100% 0, 100% 74%, 82% 100%, 0 100%)",
                }} />

             
                <Box
                  component="img"
                  src={artSrc}
                  onError={() => { if (artSrc !== CTA40_ART.fallback) setArtSrc(CTA40_ART.fallback); }}
                  alt={CTA40_ART.alt}
                  sx={{
                    position: "absolute", zIndex: 2,
                    left: "50%", bottom: 0, transform: "translateX(-50%)",
                    height: "100%", width: "auto", maxWidth: "108%",
                    objectFit: "contain", objectPosition: "bottom center",
                    display: "block",
                  }}
                />

            
                <Box sx={{ position: "absolute", top: { xs: "6%", md: "10%" }, right: { xs: "2%", md: "4%" }, width: "38%", zIndex: 3 }}>
                  <Box component="svg" viewBox="0 0 200 150">
                    <path d="M60 40 Q52 14 84 12 Q100 0 120 10 Q150 2 156 30 Q186 30 184 60 Q196 84 168 92 Q166 118 132 110 Q108 122 88 108 Q56 116 54 88 Q28 84 34 58 Q28 42 60 40 Z"
                      fill="rgba(246,248,243,0.62)" />
                    <text x="112" y="52" textAnchor="middle" fill={C.pine} fontFamily="Jost" fontSize="15" fontWeight="400">We Are</text>
                    <text x="112" y="76" textAnchor="middle" fill={C.ink} fontFamily="Jost" fontSize="20" fontWeight="700">HIRING</text>
                    <ellipse cx="46" cy="120" rx="9" ry="7" fill="rgba(246,248,243,0.62)" />
                    <ellipse cx="30" cy="134" rx="6" ry="4.5" fill="rgba(246,248,243,0.62)" />
                    <ellipse cx="18" cy="145" rx="3.6" ry="2.8" fill="rgba(246,248,243,0.62)" />
                  </Box>
                </Box>

                {/* 10K+ card overlapping the shape's bottom-left edge */}
                <Paper elevation={0} sx={{
                  position: "absolute", bottom: "12%", left: { xs: -10, md: "-6%" }, zIndex: 4,
                  bgcolor: "#fff", borderRadius: "18px", p: "16px 24px",
                  boxShadow: "0 20px 46px rgba(2,33,36,0.16)", textAlign: "center",
                }}>
                  <Typography sx={{ fontFamily: FONT, fontSize: 28, fontWeight: 800, color: C.sageDark, lineHeight: 1 }}>
                    10K+
                  </Typography>
                  <Typography sx={{ fontFamily: FONT, fontSize: 12, color: C.muted, mt: 0.75, lineHeight: 1.45 }}>
                    Our Happy Job<br />Candidates
                  </Typography>
                </Paper>
              </Box>
            </FadeUp>
          </Stack>
        </Container>
      </Box>
    </>
  );
}