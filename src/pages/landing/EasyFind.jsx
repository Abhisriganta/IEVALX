import { useState } from "react";
import { Box, Typography, Stack, Container } from "@mui/material";
import { C, FONT, REDUCED } from "./theme";
import { FadeUp, Eyebrow } from "./primitives";
import { EASYFIND_ART, GUIDELINES } from "./data";

export default function EasyFind({  }) {
  const [activeGuide, setActiveGuide] = useState(0);
  return (
    <>
      {/* ══ IT'S EASY TO FIND SOMEONE — reference replica ══
           Full-bleed faceted low-poly background (reference's folded-paper
           texture): SVG facet tile behind, radial white wash keeping the
           center clean so the content reads over quiet paper. */}
      <Box sx={{
        position: "relative", mt: { xs: 8, md: 12 }, py: { xs: 7, md: 10 },
        backgroundImage: `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><rect width='240' height='240' fill='%23F3F3EF'/><polygon points='0,0 120,0 60,90' fill='%23E9E9E5'/><polygon points='120,0 240,0 190,70' fill='%23EEEEE9'/><polygon points='60,90 120,0 190,70' fill='%23F1F1EC'/><polygon points='0,0 60,90 0,140' fill='%23EBEBE6'/><polygon points='240,0 190,70 240,120' fill='%23E6E6E1'/><polygon points='0,140 60,90 110,170' fill='%23F3F3EF'/><polygon points='60,90 190,70 110,170' fill='%23E9E9E5'/><polygon points='190,70 240,120 110,170' fill='%23EFEFEA'/><polygon points='0,140 110,170 0,240' fill='%23EAEAE5'/><polygon points='0,240 110,170 130,240' fill='%23F1F1EC'/><polygon points='110,170 240,120 240,240 130,240' fill='%23EBEBE6'/></svg>")`,
        backgroundSize: "240px 240px",
      }}>
        {/* radial white wash — pattern strongest at the edges like the reference */}
        <Box sx={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "radial-gradient(ellipse 60% 75% at 50% 50%, rgba(252,252,250,0.45) 0%, rgba(252,252,250,0.18) 55%, rgba(252,252,250,0) 85%)",
        }} />
      <Container maxWidth="lg" sx={{ position: "relative" }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={{ xs: 6, md: 10 }} sx={{ alignItems: "center" }}>

          {/* ─ left visual ─ */}
          <FadeUp sx={{ flex: 1, display: "flex", justifyContent: "center" }}>
            <Box sx={{ position: "relative", width: { xs: 320, md: 480 }, pt: { xs: 6, md: 9 } }}>
              {/* squiggle doodles */}
              <Box component="svg" viewBox="0 0 120 160" sx={{
                position: "absolute", left: { xs: -34, md: -58 }, bottom: "8%",
                width: { xs: 70, md: 100 }, opacity: 0.9,
              }}>
                <path d="M112 12 Q60 30 78 62 Q92 88 52 92 Q4 96 22 132 Q30 148 12 152"
                  fill="none" stroke={C.ink} strokeWidth="2" strokeLinecap="round" />
                <circle cx="14" cy="152" r="3" fill={C.ink} />
              </Box>
              <Box component="svg" viewBox="0 0 120 200" sx={{
                position: "absolute", right: { xs: -30, md: -56 }, top: "22%",
                width: { xs: 66, md: 96 }, opacity: 0.9,
              }}>
                <path d="M8 6 Q66 26 46 66 Q28 100 74 104 Q112 108 96 142 Q84 166 108 192"
                  fill="none" stroke={C.ink} strokeWidth="2" strokeLinecap="round" />
              </Box>

              {/* image only — no frame, no shape, no shadow */}
              <Box
                component="img"
                src={EASYFIND_ART.src}
                alt={EASYFIND_ART.alt}
                loading="lazy"
                onError={e => { e.currentTarget.style.display = "none"; }}
                sx={{
                  width: "100%", height: "auto",
                  minHeight: { xs: 300, md: 460 },
                  objectFit: "contain",
                  display: "block",
                }}
              />
            </Box>
          </FadeUp>

          {/* ─ right guideline list ─ */}
          <Box sx={{ flex: 1.1, minWidth: 0 }}>
            <FadeUp>
              <Eyebrow align="left">Some Guideline</Eyebrow>
              <Typography sx={{
                fontFamily: FONT, fontSize: { xs: 26, sm: 30, md: 40 }, fontWeight: 700,
                color: C.ink, mt: 1.25, lineHeight: 1.15,
              }}>
                It's Easy To Find Someone
              </Typography>
              <Typography sx={{
                fontFamily: FONT, fontSize: 14, color: C.muted, mt: 2, lineHeight: 1.8, maxWidth: 500,
              }}>
                Job seekers search relevant opportunities using filters for location,
                industry, job type, salary range and keywords — while verified AI
                assessment scores and CIR ratings help employers find people who are
                genuinely ready.
              </Typography>
            </FadeUp>

            <Box sx={{ mt: 4, maxWidth: 480 }}
              onMouseLeave={() => setActiveGuide(0)}>
              {GUIDELINES.map((g, i) => {
                const active = i === activeGuide;
                return (
                  <FadeUp key={i} delay={i * 0.08}>
                    <Box
                      onMouseEnter={() => setActiveGuide(i)}
                      onFocus={() => setActiveGuide(i)}
                      tabIndex={0}
                      sx={{
                        display: "flex", alignItems: "center", gap: 2.25,
                        p: active ? "16px 22px" : "14px 22px",
                        mb: active ? 2 : 0.5,
                        borderRadius: active ? "16px" : "0px",
                        background: active
                          ? "linear-gradient(180deg, #E3E7E0 0%, #CFD5CC 100%)"
                          : "transparent",
                        boxShadow: active ? "6px 7px 0 rgba(31,31,31,0.88)" : "none",
                        borderBottom: active
                          ? "1.5px solid transparent"
                          : "1.5px solid rgba(31,31,31,0.55)",
                        outline: "none", cursor: "default",
                        transition: REDUCED ? "none"
                          : "background .35s cubic-bezier(0.22,1,0.36,1), box-shadow .35s cubic-bezier(0.22,1,0.36,1), border-radius .35s cubic-bezier(0.22,1,0.36,1), border-color .35s ease, padding .35s ease, margin .35s ease",
                      }}
                    >
                      <Box sx={{
                        width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
                        bgcolor: C.sage, color: "#fff",
                        border: "3px solid rgba(255,255,255,0.45)",
                        boxShadow: "0 0 0 1.5px rgba(84,112,79,0.35)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontFamily: FONT, fontSize: 16, fontWeight: 600,
                        transition: REDUCED ? "none" : "transform .35s cubic-bezier(0.22,1,0.36,1)",
                        transform: active ? "scale(1.06)" : "scale(1)",
                      }}>
                        {i + 1}
                      </Box>
                      <Typography sx={{
                        fontFamily: FONT, fontSize: active ? 16.5 : 16,
                        fontWeight: active ? 600 : 500, color: C.ink,
                        transition: REDUCED ? "none" : "font-weight .2s, font-size .2s",
                      }}>
                        {g}
                      </Typography>
                    </Box>
                  </FadeUp>
                );
              })}
            </Box>
          </Box>
        </Stack>
      </Container>
      </Box>
    </>
  );
}