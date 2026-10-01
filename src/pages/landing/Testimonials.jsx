import { useState } from "react";
import { Box, Typography, Stack, Container } from "@mui/material";
import { ArrowForward } from "@mui/icons-material";
import { C, FONT, REDUCED, CAN_HOVER } from "./theme";
import { FadeUp, Eyebrow } from "./primitives";
import { TESTIMONIALS } from "./data";

function TestiAvatar({ t, active, onClick }) {
  const [failed, setFailed] = useState(false);
  const size = active ? 64 : 50;
  return (
    <Box
      onClick={onClick}
      role="button" tabIndex={0} aria-label={`Show testimonial from ${t.name}`}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
      sx={{
        width: size, height: size, borderRadius: "50%", flexShrink: 0,
        cursor: "pointer", overflow: "hidden", outline: "none",
        border: active ? `3px solid ${C.sage}` : "3px solid #fff",
        boxShadow: active ? "0 10px 26px rgba(2,33,36,0.22)" : "0 6px 16px rgba(2,33,36,0.12)",
        bgcolor: t.color, color: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: FONT, fontSize: active ? 20 : 16, fontWeight: 700,
        transition: REDUCED ? "none" : "all .35s cubic-bezier(0.22,1,0.36,1)",
        "&:hover": CAN_HOVER && !active ? { transform: "translateY(-4px)" } : {},
      }}
    >
      {failed ? t.name[0] : (
        <Box component="img" src={t.img} alt={t.name} loading="lazy"
          onError={() => setFailed(true)}
          sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
      )}
    </Box>
  );
}

export default function TestimonialsSection({ testiRef }) {
  const [activeTesti, setActiveTesti] = useState(0);
  return (
    <>
      {/* ══ TESTIMONIALS ══ */}
      <Container maxWidth="lg" ref={testiRef} sx={{ mt: { xs: 8, md: 11 }, scrollMarginTop: 90 }}>
        <FadeUp>
          <Eyebrow>Testimonials</Eyebrow>
          <Typography sx={{
            fontFamily: FONT, fontSize: { xs: 30, md: 38 }, fontWeight: 700,
            color: C.ink, textAlign: "center", mt: 1, lineHeight: 1.2,
          }}>
            What Our Customers<br />Say About Us
          </Typography>
        </FadeUp>

        {/* Reference construction: quote card whose bottom edge BULGES down
             in the center to cradle the avatars (S-curve fillets join bulge to
             card bottom), and a full pill-outline pod below whose top border
             passes behind the bulge. */}
        <Box sx={{ maxWidth: 960, mx: "auto", mt: 5 }}>
          {/* quote card */}
          <Box sx={{
            position: "relative", zIndex: 2,
            bgcolor: "#FFFFFF", borderRadius: "36px",
            boxShadow: "0 24px 60px rgba(2,33,36,0.07)",
            p: { xs: "28px 18px 30px", sm: "34px 24px 30px", md: "44px 64px 36px" },
            textAlign: "center",
          }}>
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 0.5, width: "100%" }}>
              {[...Array(5)].map((_, s) => (
                <Box key={s} component="svg" viewBox="0 0 24 24" sx={{ width: 20, height: 20, flexShrink: 0 }}>
                  <path d="M12 2.5 L14.9 8.6 L21.5 9.4 L16.6 14 L17.9 20.6 L12 17.3 L6.1 20.6 L7.4 14 L2.5 9.4 L9.1 8.6 Z" fill="#F0B429" />
                </Box>
              ))}
            </Box>

            <Typography key={activeTesti} sx={{
              fontFamily: FONT, fontSize: { xs: 14, sm: 15.5, md: 17.5 }, color: "#3A413C",
              lineHeight: 1.9, mt: 2.5, maxWidth: 760, mx: "auto",
              animation: REDUCED ? "none" : "quoteFade .45s cubic-bezier(0.22,1,0.36,1)",
              "@keyframes quoteFade": {
                from: { opacity: 0, transform: "translateY(10px)" },
                to:   { opacity: 1, transform: "translateY(0)" },
              },
            }}>
              {TESTIMONIALS[activeTesti].quote}
            </Typography>

            {/* bulge — card bottom swells down around the avatar row */}
            <Box sx={{
              position: "absolute", left: 0, right: 0, bottom: -36,
              mx: "auto",
              width: { xs: "72%", md: 340 }, height: 72,
              bgcolor: "#FFFFFF",
              borderRadius: "0 0 44px 44px",
              zIndex: 2,
              "&::before": {
                content: '""', position: "absolute",
                left: -28, top: 0, width: 28, height: 28,
                background: `radial-gradient(circle at 0 100%, transparent 27.5px, #FFFFFF 28px)`,
              },
              "&::after": {
                content: '""', position: "absolute",
                right: -28, top: 0, width: 28, height: 28,
                background: `radial-gradient(circle at 100% 100%, transparent 27.5px, #FFFFFF 28px)`,
              },
            }}>
              <Box sx={{
                position: "absolute", inset: 0,
                display: "flex", justifyContent: "center", alignItems: "center", gap: 2,
              }}>
                {TESTIMONIALS.map((t, i) => (
                  <TestiAvatar key={t.name} t={t} active={i === activeTesti}
                    onClick={() => setActiveTesti(i)} />
                ))}
              </Box>
            </Box>
          </Box>

          {/* pod — outline drawn as one SVG path: rounded rect whose top edge
              rises in a wide arch around the avatar cluster. The bulge (above,
              z2) hides the arch plateau; its curved shoulders stay visible
              climbing on both sides — the reference's continuous lining. */}
          <Box sx={{
            position: "relative", zIndex: 1,
            maxWidth: 760, mx: "auto", mt: "-8px",
            pt: 6, pb: 2.75, px: { xs: 4, md: 8 },
          }}>
            <Box component="svg" viewBox="0 0 760 170" preserveAspectRatio="none"
              aria-hidden="true"
              sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
              <path
                d="M 80 37 H 120 Q 172 37 206 19 Q 240 2 330 2 H 430 Q 520 2 554 19 Q 588 37 640 37 H 680 Q 720 37 720 77 V 129 Q 720 169 680 169 H 80 Q 40 169 40 129 V 77 Q 40 37 80 37 Z"
                fill="none" stroke="#DCE1D8" strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
              />
            </Box>
            <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
              <Box
                onClick={() => setActiveTesti((activeTesti - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)}
                role="button" tabIndex={0} aria-label="Previous testimonial"
                onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setActiveTesti((activeTesti - 1 + TESTIMONIALS.length) % TESTIMONIALS.length); } }}
                sx={{
                  width: { xs: 40, sm: 46 }, height: { xs: 40, sm: 46 }, borderRadius: "50%", flexShrink: 0,
                  border: "1.5px solid #DCE1D8", bgcolor: "#fff",
                  color: "#A9B1A6", cursor: "pointer", outline: "none",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "background .25s ease, border-color .25s ease, color .25s ease, transform .25s ease",
                  "&:hover": {
                    bgcolor: C.sage, borderColor: C.sage, color: "#fff",
                    transform: CAN_HOVER ? "scale(1.06)" : "none",
                  },
                }}
              >
                <ArrowForward sx={{ fontSize: 19, transform: "rotate(180deg)" }} />
              </Box>
              <Box sx={{ flex: 1, height: "1.5px", bgcolor: "#DCE1D8" }} />
              <Box key={`n-${activeTesti}`} sx={{
                textAlign: "center", px: 1,
                animation: REDUCED ? "none" : "quoteFade .45s cubic-bezier(0.22,1,0.36,1)",
              }}>
                <Typography sx={{ fontFamily: FONT, fontSize: { xs: 17, sm: 20 }, fontWeight: 700, color: C.ink, lineHeight: 1.2 }}>
                  {TESTIMONIALS[activeTesti].name}
                </Typography>
                <Typography sx={{ fontFamily: FONT, fontSize: 12, color: C.muted, mt: 0.375 }}>
                  {TESTIMONIALS[activeTesti].role}
                </Typography>
              </Box>
              <Box sx={{ flex: 1, height: "1.5px", bgcolor: "#DCE1D8" }} />
              <Box
                onClick={() => setActiveTesti((activeTesti + 1) % TESTIMONIALS.length)}
                role="button" tabIndex={0} aria-label="Next testimonial"
                onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setActiveTesti((activeTesti + 1) % TESTIMONIALS.length); } }}
                sx={{
                  width: { xs: 40, sm: 46 }, height: { xs: 40, sm: 46 }, borderRadius: "50%", flexShrink: 0,
                  border: "1.5px solid #DCE1D8", bgcolor: "#fff",
                  color: "#A9B1A6", cursor: "pointer", outline: "none",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "background .25s ease, border-color .25s ease, color .25s ease, transform .25s ease",
                  "&:hover": {
                    bgcolor: C.sage, borderColor: C.sage, color: "#fff",
                    transform: CAN_HOVER ? "scale(1.06)" : "none",
                  },
                }}
              >
                <ArrowForward sx={{ fontSize: 19 }} />
              </Box>
            </Stack>
          </Box>
        </Box>
      </Container>
    </>
  );
}