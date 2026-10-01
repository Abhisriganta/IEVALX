import { Box, Typography, Button, Stack, Container } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { CloudUploadOutlined } from "@mui/icons-material";
import { C, FONT } from "./theme";
import { FadeUp } from "./primitives";
import { UPLOADCV_ART } from "./data";

export default function UploadCv({  }) {
  const navigate = useNavigate();
  return (
    <>
  
      <Box sx={{
        mt: { xs: 8, md: 12 }, position: "relative", overflow: "hidden",
        background: `linear-gradient(115deg, ${C.pine} 0%, ${C.pine2} 100%)`,
        py: { xs: 6, md: 8 },
      }}>
        {/* topographic contour lines */}
        <Box component="svg" viewBox="0 0 1440 420" preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
          sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
          <g fill="none" stroke="rgba(190,213,143,0.10)" strokeWidth="1.5">
            <ellipse cx="240" cy="440" rx="170" ry="130" />
            <ellipse cx="240" cy="440" rx="260" ry="200" />
            <ellipse cx="240" cy="440" rx="350" ry="270" />
            <ellipse cx="240" cy="440" rx="440" ry="340" />
            <ellipse cx="240" cy="440" rx="530" ry="410" />
            <ellipse cx="1180" cy="-30" rx="150" ry="115" />
            <ellipse cx="1180" cy="-30" rx="240" ry="185" />
            <ellipse cx="1180" cy="-30" rx="330" ry="255" />
            <ellipse cx="1180" cy="-30" rx="420" ry="325" />
          </g>
        </Box>

        <Container maxWidth="lg" sx={{ position: "relative" }}>
          <FadeUp>
            <Stack direction={{ xs: "column", md: "row" }} spacing={{ xs: 5, md: 8 }} sx={{ alignItems: "center" }}>
              <Box sx={{ flex: 1.5, minWidth: 0 }}>
                <Typography sx={{
                  fontFamily: FONT, fontSize: { xs: 26, sm: 32, md: 50 }, fontWeight: 700,
                  color: "#fff", lineHeight: 1.14, letterSpacing: "-0.8px",
                }}>
                  Get Your Dream Job, Just By Uploading Your CV
                </Typography>
                <Button
                  onClick={() => navigate("/jobseeker/profile?section=resume&action=upload")}
                  startIcon={<CloudUploadOutlined sx={{ fontSize: 18 }} />}
                  sx={{
                    fontFamily: FONT, textTransform: "none", mt: 3.5,
                    bgcolor: "transparent", color: "#fff",
                    border: `1.5px solid ${C.sage}`, borderRadius: "999px",
                    px: 3.25, py: 0, height: 50, minWidth: 0, lineHeight: 1,
                    fontSize: 14.5, fontWeight: 500,
                    transition: "background .25s ease",
                    "&:hover": { bgcolor: C.sage },
                  }}
                >
                  Upload CV
                </Button>
              </Box>

           
              <Box sx={{ flex: 0.8, display: "flex", justifyContent: "center" }}>
                <Box sx={{
                  position: "relative",
                  borderRadius: "20px",
                  overflow: "hidden",
                  boxShadow: "0 24px 60px rgba(0,0,0,0.28)",
                }}>
                  <Box
                    component="img"
                    src={UPLOADCV_ART.src}
                    alt={UPLOADCV_ART.alt}
                    loading="lazy"
                    onError={e => { e.currentTarget.style.display = "none"; }}
                    sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                </Box>
              </Box>
            </Stack>
          </FadeUp>
        </Container>
      </Box>
    </>
  );
}