import { Box, Typography } from "@mui/material";
import { C, FONT, REDUCED, CAN_HOVER } from "./theme";
import { PARTNERS } from "./data";

export default function PartnerMarquee({  }) {
  return (
    <>
      {/* ══ DARK PARTNER LOGO STRIP — seamless infinite marquee ══
           Two identical groups inside one track; the track translates −50%
           (exactly one group width) and loops, so the seam is invisible.
           Pauses on hover; edge-fade mask; static wrap under reduced motion. */}
      <Box sx={{
        bgcolor: C.ink, transform: { md: "skewY(-1.6deg)" }, mt: { md: -7 },
        position: "relative", zIndex: 4, py: 3.5, overflow: "hidden",
      }}>
        <Box sx={{
          transform: { md: "skewY(1.6deg)" },
          maskImage: "linear-gradient(to right, transparent, #000 8%, #000 92%, transparent)",
          WebkitMaskImage: "linear-gradient(to right, transparent, #000 8%, #000 92%, transparent)",
          overflow: "hidden",
        }}>
          <Box
            sx={{
              display: "flex", width: "max-content",
              animation: REDUCED ? "none" : "partnerMarquee 30s linear infinite",
              "@keyframes partnerMarquee": {
                from: { transform: "translateX(0)" },
                to:   { transform: "translateX(-50%)" },
              },
              ...(CAN_HOVER && !REDUCED
                ? { "&:hover": { animationPlayState: "paused" } }
                : {}),
              ...(REDUCED
                ? { width: "100%", flexWrap: "wrap", justifyContent: "center" }
                : {}),
            }}
          >
            {[0, 1].map(dup => (
              <Box
                key={dup}
                aria-hidden={dup === 1}
                sx={{ display: "flex", alignItems: "center", flexShrink: 0 }}
              >
                {PARTNERS.map((p, i) => (
                  <Typography key={`${dup}-${p}`} sx={{
                    px: { xs: 4.5, md: 7 },
                    fontSize: { xs: 16, md: 19 },
                    fontFamily: i % 3 === 0 ? "'DM Serif Display',serif" : FONT,
                    fontStyle:  i === 5 ? "italic" : "normal",
                    fontWeight: i % 2 ? 600 : 400,
                    letterSpacing: i === 3 ? "2px" : 0,
                    whiteSpace: "nowrap",
                    background: "linear-gradient(90deg, #FFFFFF 0%, #BED58F 100%)",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    color: "transparent",
                    opacity: 0.92,
                    transition: "opacity .25s ease",
                    "&:hover": CAN_HOVER ? { opacity: 1 } : {},
                  }}>
                    {p}
                  </Typography>
                ))}
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </>
  );
}
