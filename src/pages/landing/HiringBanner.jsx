import { Box, Typography, Stack, Container } from "@mui/material";
import { useNavigate } from "react-router-dom";
import useApplyNavigation from "@/hooks/useApplyNavigation";
import { C, FONT } from "./theme";
import { FadeUp, SageButton } from "./primitives";
import HiringImg from "../../assets/images/hiring.png";

export default function HiringBanner({  }) {
  const navigate = useNavigate();
  /* Generic Apply (no job attached): logged-in jobseeker → Find Jobs in
     the dashboard; guest → /auth; employer/company → public /jobs. */
  const { goToApplyGeneric } = useApplyNavigation();
  return (
    <>
      {/* ══ WE ARE HIRING BANNER — Ghost typographic ══
           Hairline-bordered white banner; a huge faint outlined HIRING
           watermark floats behind the content layer. */}
      <Container maxWidth="lg" sx={{ mt: { xs: 6, md: 9 } }}>
        <FadeUp>
          <Box sx={{
            position: "relative", overflow: "hidden",
            bgcolor: "#fff", borderRadius: "18px",
            border: `1.5px solid ${C.line}`,
            minHeight: { md: 148 },
            display: "flex", alignItems: "center",
          }}>
            {/* watermark */}
            <Typography aria-hidden="true" sx={{
              position: "absolute", left: "50%", top: "50%",
              transform: "translate(-50%, -50%)",
              fontFamily: FONT, fontWeight: 800,
              fontSize: { xs: 42, sm: 64, md: 104 }, letterSpacing: { xs: "2px", sm: "4px", md: "10px" },
              lineHeight: 1, whiteSpace: "nowrap",
              color: "transparent", WebkitTextStroke: "1.2px #EDF0EA",
              userSelect: "none", pointerEvents: "none",
            }}>
              HIRING
            </Typography>

            {/* content layer */}
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={{ xs: 2, md: 3.5 }}
              sx={{
                alignItems: { xs: "flex-start", md: "center" },
                position: "relative", width: "100%", px: { xs: 3, md: 4.5 }, py: { xs: 3, md: 3 },
              }}
            >
              <Box
                component="img"
                src={HiringImg}
                alt="We are hiring"
                onError={e => { e.currentTarget.style.display = "none"; }}
                sx={{
                  flexShrink: 0,
                  height: { xs: 80, md: 112 }, width: "auto",
                  objectFit: "contain", display: "block",
                }}
              />
              <Box sx={{ flexShrink: 0 }}>
                <Typography sx={{ fontFamily: FONT, fontSize: 12, letterSpacing: "2.5px", fontWeight: 600, color: C.muted }}>
                  WE ARE
                </Typography>
                <Typography sx={{ fontFamily: FONT, fontSize: { xs: 22, sm: 26, md: 30 }, fontWeight: 800, color: C.ink, lineHeight: 1 }}>
                  HIRING
                </Typography>
              </Box>
              <Typography sx={{ fontFamily: FONT, fontSize: 15.5, fontWeight: 500, color: C.text, flex: 1, minWidth: 0 }}>
                Your Next Career Move Starts With a Single Assessment
              </Typography>
              <SageButton onClick={goToApplyGeneric} sx={{ flexShrink: 0 }}>
                Apply Now
              </SageButton>
            </Stack>
          </Box>
        </FadeUp>
      </Container>
    </>
  );
}