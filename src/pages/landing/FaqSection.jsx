import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography, Stack, Container } from "@mui/material";
import { ArrowForward } from "@mui/icons-material";
import { C, FONT, REDUCED } from "./theme";
import { FadeUp, Eyebrow } from "./primitives";
import { FAQS } from "./data";

export default function FaqSection({  }) {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState(0);
  return (
    <>
      {/* ══ FAQ — F2 split: heading + support card left, accordion right ══ */}
      <Container maxWidth="lg" sx={{ mt: { xs: 9, md: 13 } }}>
        <Box sx={{
          display: "grid", gap: { xs: 4, md: 8 },
          gridTemplateColumns: { xs: "1fr", md: "0.9fr 1.1fr" },
          alignItems: "start",
        }}>
          <FadeUp>
            <Eyebrow align="left">FAQ</Eyebrow>
            <Typography sx={{
              fontFamily: FONT, fontSize: { xs: 26, sm: 30, md: 38 }, fontWeight: 700,
              color: C.ink, mt: 1, lineHeight: 1.2,
            }}>
              Frequently Asked Questions
            </Typography>
            <Typography sx={{ fontFamily: FONT, fontSize: 14.5, color: C.muted, mt: 2, lineHeight: 1.75, maxWidth: 380 }}>
              Everything about AI interviews, CIR scores and how verified hiring
              works on IEvalx.
            </Typography>
            <Box sx={{
              mt: 3.5, bgcolor: "#fff", border: `1px solid ${C.line}`, borderRadius: "16px",
              p: "22px 24px", maxWidth: 340,
              boxShadow: "0 14px 40px rgba(2,33,36,0.05)",
            }}>
              <Typography sx={{ fontFamily: FONT, fontSize: 15.5, fontWeight: 600, color: C.ink }}>
                Still have questions?
              </Typography>
              <Typography sx={{ fontFamily: FONT, fontSize: 13, color: C.muted, mt: 0.75, lineHeight: 1.65 }}>
                Our team replies within a day — usually much faster.
              </Typography>
              <Stack
                direction="row" spacing={0.75}
                onClick={() => navigate("/support")}
                role="button" tabIndex={0}
                onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate("/support"); } }}
                sx={{ alignItems: "center",
                  mt: 1.75, cursor: "pointer", width: "fit-content", outline: "none",
                  "&:hover .faqArrow": { transform: "translateX(4px)" },
                }}
              >
                <Typography sx={{ fontFamily: FONT, fontSize: 13.5, fontWeight: 700, color: C.sageDark }}>
                  Talk to support
                </Typography>
                <ArrowForward className="faqArrow" sx={{ fontSize: 15, color: C.sageDark, transition: "transform .25s" }} />
              </Stack>
            </Box>
          </FadeUp>

          <FadeUp delay={0.12}>
            <Box>
              {FAQS.map((f, i) => {
                const open = openFaq === i;
                return (
                  <Box key={f.q} sx={{ borderBottom: `1px solid ${C.line}` }}>
                    <Box
                      onClick={() => setOpenFaq(open ? -1 : i)}
                      role="button" tabIndex={0} aria-expanded={open}
                      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpenFaq(open ? -1 : i); } }}
                      sx={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        gap: 2, py: 2.5, cursor: "pointer", outline: "none",
                        "&:hover .faqQ": { color: C.sageDark },
                      }}
                    >
                      <Typography className="faqQ" sx={{
                        fontFamily: FONT, fontSize: { xs: 14.5, sm: 16 }, fontWeight: 600,
                        color: open ? C.sageDark : C.ink,
                        transition: "color .25s ease",
                      }}>
                        {f.q}
                      </Typography>
                      <Box sx={{
                        width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                        border: `1.5px solid ${open ? C.sage : C.line}`,
                        bgcolor: open ? C.sage : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "background .3s ease, border-color .3s ease, transform .35s cubic-bezier(0.22,1,0.36,1)",
                        transform: open ? "rotate(45deg)" : "rotate(0deg)",
                      }}>
                        <Box component="svg" viewBox="0 0 24 24" sx={{ width: 13, height: 13 }}>
                          <path d="M12 5 V19 M5 12 H19" fill="none"
                            stroke={open ? "#fff" : "#8A8F8B"}
                            strokeWidth="2.5" strokeLinecap="round" />
                        </Box>
                      </Box>
                    </Box>
                    {/* smooth height: grid-rows 0fr → 1fr */}
                    <Box sx={{
                      display: "grid",
                      gridTemplateRows: open ? "1fr" : "0fr",
                      transition: REDUCED ? "none" : "grid-template-rows .45s cubic-bezier(0.22,1,0.36,1)",
                    }}>
                      <Box sx={{ overflow: "hidden" }}>
                        <Typography sx={{
                          fontFamily: FONT, fontSize: 14, color: C.muted,
                          lineHeight: 1.75, pb: 2.5, pr: { md: 6 },
                          opacity: open ? 1 : 0,
                          transition: REDUCED ? "none" : "opacity .4s ease .1s",
                        }}>
                          {f.a}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </FadeUp>
        </Box>
      </Container>
    </>
  );
}