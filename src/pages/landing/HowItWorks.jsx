import { Box, Typography, Stack, Container } from "@mui/material";
import { C, FONT, REDUCED, CAN_HOVER } from "./theme";
import { FadeUp, Eyebrow } from "./primitives";
import { STEPS } from "./data";

export default function HowItWorks({ howRef }) {
  return (
    <>
      {/* ══ HOW IT WORKS — white band so the card gap-channel reads like the
             reference (white page · cream card body · white channel between) ══ */}
      <Box sx={{ bgcolor: "#fff", mt: { xs: 8, md: 11 }, py: { xs: 6, md: 8 } }}>
      <Container maxWidth="lg" ref={howRef} sx={{ scrollMarginTop: 90 }}>
        <FadeUp>
          <Eyebrow>Working Process</Eyebrow>
          <Typography sx={{
            fontFamily: FONT, fontSize: { xs: 30, md: 38 }, fontWeight: 700,
            color: C.ink, textAlign: "center", mt: 1,
          }}>
            How It Works!
          </Typography>
        </FadeUp>

        {/* Layered-paper cards: offset cream backplate behind each white card,
             sage top-border accent, outlined watermark number, sage circle icon. */}
        <Stack direction={{ xs: "column", md: "row" }} spacing={4} sx={{ mt: 5 }}>
          {STEPS.map((s, i) => (
            <FadeUp key={s.num} delay={i * 0.12} sx={{ flex: 1 }}>
              <Box sx={{
                position: "relative", height: "100%",
                transition: "transform .3s ease",
                "&:hover": CAN_HOVER ? { transform: "translateY(-6px)" } : {},
                "&:hover .paper-back": { transform: "translate(4px, 4px)" },
              }}>
                {/* offset cream backplate */}
                <Box className="paper-back" sx={{
                  position: "absolute", top: 12, left: 12, right: -8, bottom: -8,
                  bgcolor: "#EDF3EC", borderRadius: "20px",
                  transition: REDUCED ? "none" : "transform .3s ease",
                }} />
                {/* white card */}
                <Box sx={{
                  position: "relative", height: "100%",
                  bgcolor: "#fff", borderRadius: "20px",
                  borderTop: `3px solid ${C.sage}`,
                  boxShadow: "0 18px 40px rgba(2,33,36,0.08)",
                  p: "26px 26px 28px",
                }}>
                  {/* outlined watermark number */}
                  <Typography aria-hidden="true" sx={{
                    position: "absolute", top: 10, right: 18,
                    fontFamily: FONT, fontSize: 66, fontWeight: 800, lineHeight: 1,
                    color: "transparent", WebkitTextStroke: "1.4px #E2E8E0",
                    userSelect: "none", pointerEvents: "none",
                  }}>
                    {s.num}
                  </Typography>

                  {/* sage circle icon */}
                  <Box sx={{
                    position: "relative", width: 58, height: 58, borderRadius: "50%",
                    bgcolor: C.sage, color: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    mb: 2, "& svg": { fontSize: 27 },
                  }}>
                    {s.icon}
                  </Box>

                  <Typography sx={{
                    position: "relative", fontFamily: FONT,
                    fontSize: 20, fontWeight: 700, color: C.ink, lineHeight: 1.3,
                  }}>
                    {s.t1} {s.t2}
                  </Typography>
                  <Typography sx={{
                    position: "relative", fontFamily: FONT,
                    fontSize: 14, color: C.muted, mt: 1.25, lineHeight: 1.75,
                  }}>
                    {s.desc}
                  </Typography>
                </Box>
              </Box>
            </FadeUp>
          ))}
        </Stack>
      </Container>
      </Box>
    </>
  );
}
