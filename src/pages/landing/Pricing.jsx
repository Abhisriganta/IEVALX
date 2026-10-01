import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ROLES } from "@/constants/roles";
import { Box, Typography, Button, Stack, Container } from "@mui/material";
import { C, FONT, REDUCED, CAN_HOVER } from "./theme";
import { FadeUp, Eyebrow } from "./primitives";
import { PLANS } from "./data";

export default function PricingSection({ pricingRef, hideHeader = false }) {
  const navigate = useNavigate();
  const { isAuthenticated, role } = useAuth();
  const [yearly, setYearly] = useState(false);
  return (
    <>
      <Container
        maxWidth="lg"
        ref={pricingRef}
        sx={{ mt: { xs: 9, md: 13 }, scrollMarginTop: 90 }}
      >
        <FadeUp>
          {!hideHeader && (
            <>
              <Eyebrow>Pricing</Eyebrow>
              <Typography
                sx={{
                  fontFamily: FONT,
                  fontSize: { xs: 26, sm: 30, md: 38 },
                  fontWeight: 700,
                  color: C.ink,
                  textAlign: "center",
                  mt: 1,
                }}
              >
                Simple Plans, Verified Results
              </Typography>
            </>
          )}

          {/* billing toggle */}
          <Box sx={{ display: "flex", justifyContent: "center", mt: 3.5 }}>
            <Box
              sx={{
                display: "inline-flex",
                bgcolor: "#fff",
                border: `1px solid ${C.line}`,
                borderRadius: "999px",
                p: "4px",
              }}
            >
              {[
                { label: "Monthly", isY: false },
                { label: "Yearly", isY: true, chip: "save 20%" },
              ].map((opt) => (
                <Box
                  key={opt.label}
                  onClick={() => setYearly(opt.isY)}
                  role="button"
                  tabIndex={0}
                  aria-pressed={yearly === opt.isY}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setYearly(opt.isY);
                    }
                  }}
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 0.875,
                    px: 2.25,
                    py: 0.875,
                    borderRadius: "999px",
                    cursor: "pointer",
                    outline: "none",
                    fontFamily: FONT,
                    fontSize: 13.5,
                    fontWeight: 600,
                    bgcolor: yearly === opt.isY ? C.sage : "transparent",
                    color: yearly === opt.isY ? "#fff" : C.muted,
                    transition:
                      "background .3s cubic-bezier(0.22,1,0.36,1), color .3s ease",
                  }}
                >
                  {opt.label}
                  {opt.chip && (
                    <Box
                      component="span"
                      sx={{
                        bgcolor:
                          yearly === opt.isY ? "rgba(255,255,255,0.2)" : C.lime,
                        color: yearly === opt.isY ? "#fff" : "#3F4A33",
                        borderRadius: "999px",
                        px: 1,
                        py: 0.25,
                        fontSize: 10.5,
                        fontWeight: 700,
                        transition: "background .3s ease, color .3s ease",
                      }}
                    >
                      {opt.chip}
                    </Box>
                  )}
                </Box>
              ))}
            </Box>
          </Box>
        </FadeUp>

        {/* plan cards */}
        <Box
          sx={{
            display: "grid",
            gap: { xs: 2.5, md: 3 },
            mt: { xs: 4, md: 6 },
            gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
            alignItems: "center",
          }}
        >
          {PLANS.map((p, i) => (
            <FadeUp key={p.name} delay={i * 0.12}>
              <Box
                sx={{
                  position: "relative",
                  bgcolor: p.popular ? C.sage : "#fff",
                  border: p.popular
                    ? `1.5px solid ${C.sage}`
                    : `1.5px solid ${C.line}`,
                  borderRadius: "20px",
                  p: {
                    xs: "28px 26px",
                    md: p.popular ? "38px 30px" : "30px 28px",
                  },
                  transform: { md: p.popular ? "scale(1.05)" : "none" },
                  boxShadow: p.popular
                    ? "0 30px 70px rgba(126,158,126,0.42)"
                    : "0 14px 40px rgba(2,33,36,0.05)",
                  zIndex: p.popular ? 2 : 1,
                  transition:
                    "transform .35s cubic-bezier(0.22,1,0.36,1), box-shadow .35s ease",
                  "&:hover": CAN_HOVER
                    ? {
                        transform: {
                          md: p.popular
                            ? "scale(1.05) translateY(-6px)"
                            : "translateY(-6px)",
                        },
                        boxShadow: p.popular
                          ? "0 40px 84px rgba(126,158,126,0.5)"
                          : "0 24px 56px rgba(2,33,36,0.1)",
                      }
                    : {},
                }}
              >
                {p.popular && (
                  <Box
                    sx={{
                      position: "absolute",
                      top: -14,
                      left: "50%",
                      transform: "translateX(-50%)",
                      bgcolor: C.ink,
                      color: "#fff",
                      borderRadius: "999px",
                      px: 1.75,
                      py: 0.5,
                      fontFamily: FONT,
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "1px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    MOST POPULAR
                  </Box>
                )}
                <Typography
                  sx={{
                    fontFamily: FONT,
                    fontSize: 13,
                    fontWeight: 700,
                    letterSpacing: "2px",
                    textTransform: "uppercase",
                    color: p.popular ? "rgba(255,255,255,0.85)" : C.sageDark,
                  }}
                >
                  {p.name}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: FONT,
                    fontSize: 12.5,
                    mt: 0.5,
                    color: p.popular ? "rgba(255,255,255,0.75)" : C.muted,
                  }}
                >
                  {p.tagline}
                </Typography>

                {/* animated price swap */}
                <Stack
                  key={yearly ? "y" : "m"}
                  direction="row"
                  spacing={0.75}
                  sx={{
                    alignItems: "baseline",
                    mt: 2,
                    animation: REDUCED
                      ? "none"
                      : "quoteFade .4s cubic-bezier(0.22,1,0.36,1)",
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: FONT,
                      fontSize: { xs: 34, sm: 40 },
                      fontWeight: 800,
                      lineHeight: 1,
                      color: p.popular ? "#fff" : C.ink,
                    }}
                  >
                    ₹{yearly ? p.y : p.m}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: FONT,
                      fontSize: 13,
                      color: p.popular ? "rgba(255,255,255,0.7)" : C.muted,
                    }}
                  >
                    /mo{yearly && p.m > 0 ? " · billed yearly" : ""}
                  </Typography>
                </Stack>

                <Stack spacing={1.25} sx={{ mt: 3 }}>
                  {p.features.map((f) => (
                    <Stack
                      key={f}
                      direction="row"
                      spacing={1.25}
                      sx={{ alignItems: "center" }}
                    >
                      <Box
                        sx={{
                          width: 18,
                          height: 18,
                          borderRadius: "50%",
                          flexShrink: 0,
                          bgcolor: p.popular
                            ? "rgba(255,255,255,0.22)"
                            : C.sageSoft,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Box
                          component="svg"
                          viewBox="0 0 24 24"
                          sx={{ width: 10, height: 10 }}
                        >
                          <path
                            d="M5 12.5 L10 17 L19 7.5"
                            fill="none"
                            stroke={p.popular ? "#fff" : C.sageDark}
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </Box>
                      </Box>
                      <Typography
                        sx={{
                          fontFamily: FONT,
                          fontSize: 13.5,
                          color: p.popular
                            ? "rgba(255,255,255,0.92)"
                            : "#3A413C",
                        }}
                      >
                        {f}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>

                <Button
                  onClick={() => {
                    if (p.cta === "Contact Sales") return navigate("/support");
                    if (!isAuthenticated) return navigate("/auth");
                    if (role === ROLES.COMPANY)
                      return navigate("/company/subscription");
                    if (role === ROLES.JOBSEEKER)
                      return navigate("/jobseeker/billing");
                    navigate("/auth");
                  }}
                  fullWidth
                  sx={{
                    fontFamily: FONT,
                    textTransform: "none",
                    mt: 3.5,
                    height: 48,
                    borderRadius: "999px",
                    fontSize: 14.5,
                    fontWeight: 600,
                    bgcolor: p.popular ? "#fff" : C.sageSoft,
                    color: p.popular ? C.ink : C.sageDark,
                    transition: "background .25s ease, color .25s ease",
                    "&:hover": {
                      bgcolor: p.popular ? C.ink : C.sage,
                      color: "#fff",
                    },
                  }}
                >
                  {p.cta}
                </Button>
              </Box>
            </FadeUp>
          ))}
        </Box>
      </Container>
    </>
  );
}