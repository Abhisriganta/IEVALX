import { useEffect, useRef, useState } from "react";
import { Box, Typography, Stack, Container, Paper } from "@mui/material";
import { C, FONT, REDUCED, CAN_HOVER } from "../landing/theme";
import { FadeUp } from "../landing/primitives";
import PublicLayout, { PageHero } from "./PublicLayout";



export default function LegalPage({ eyebrow, title, subtitle, updated, sections }) {
  const [active, setActive] = useState(sections[0]?.id);
  const observerRef = useRef(null);

  /* scrollspy — highlight the TOC entry of the section in view */
  useEffect(() => {
    observerRef.current?.disconnect();
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-96px 0px -60% 0px", threshold: 0 }
    );
    sections.forEach(s => {
      const el = document.getElementById(s.id);
      if (el) obs.observe(el);
    });
    observerRef.current = obs;
    return () => obs.disconnect();
  }, [sections]);

  const jump = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "start" });
  };

  const tocItem = (s, i, horizontal = false) => {
    const on = active === s.id;
    return (
      <Box
        key={s.id}
        onClick={() => jump(s.id)}
        role="link" tabIndex={0} aria-label={`Jump to ${s.title}`}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); jump(s.id); } }}
        sx={{
          cursor: "pointer", outline: "none", userSelect: "none", flexShrink: 0,
          display: "flex", alignItems: "center", gap: 1,
          px: horizontal ? 1.5 : 1.25, py: horizontal ? 0.75 : 0.875,
          borderRadius: horizontal ? "999px" : "10px",
          bgcolor: on ? C.sageSoft : "transparent",
          border: horizontal ? `1.5px solid ${on ? "rgba(127,158,126,0.5)" : C.line}` : "none",
          borderLeft: horizontal ? undefined : `3px solid ${on ? C.sage : "transparent"}`,
          transition: REDUCED ? "none" : "all .25s ease",
          "&:hover, &:focus-visible": { bgcolor: C.sageSoft },
        }}
      >
        {!horizontal && (
          <Typography sx={{ fontFamily: FONT, fontSize: 11.5, fontWeight: 800, color: on ? C.sageDark : "rgba(31,31,31,0.35)", minWidth: 18 }}>
            {String(i + 1).padStart(2, "0")}
          </Typography>
        )}
        <Typography sx={{
          fontFamily: FONT, fontSize: horizontal ? 12.5 : 13,
          fontWeight: on ? 700 : 500, color: on ? C.ink : C.muted,
          whiteSpace: horizontal ? "nowrap" : "normal", lineHeight: 1.4,
        }}>
          {s.title}
        </Typography>
      </Box>
    );
  };

  return (
    <PublicLayout>
      <PageHero
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        back={{ label: "Back to Home", to: "/" }}
      >
        
      </PageHero>

      <Container maxWidth="lg" sx={{ mt: { xs: 3.5, md: 5.5 }, mb: { xs: 6, md: 9 } }}>
        {/* mobile TOC — horizontal chip strip */}
        <FadeUp sx={{ display: { xs: "block", md: "none" }, mb: 3 }}>
          <Stack direction="row" spacing={1} sx={{
            overflowX: "auto", pb: 1,
            "&::-webkit-scrollbar": { display: "none" }, scrollbarWidth: "none",
          }}>
            {sections.map((s, i) => tocItem(s, i, true))}
          </Stack>
        </FadeUp>

        <Box sx={{
          display: "grid", gap: { xs: 0, md: 5 }, alignItems: "start",
          gridTemplateColumns: { xs: "1fr", md: "252px 1fr" },
        }}>
          {/* desktop TOC — sticky scrollspy rail */}
          <Box sx={{ display: { xs: "none", md: "block" }, position: "sticky", top: 96 }}>
            <FadeUp>
              <Paper elevation={0} sx={{
                bgcolor: "#fff", borderRadius: "16px", p: 1.25,
                border: `1px solid ${C.line}`,
                boxShadow: "0 12px 30px rgba(2,33,36,0.05)",
              }}>
                <Typography sx={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: ".6px", textTransform: "uppercase", px: 1.25, pt: 0.75, pb: 1 }}>
                  On this page
                </Typography>
                <Stack spacing={0.25}>
                  {sections.map((s, i) => tocItem(s, i))}
                </Stack>
              </Paper>
            </FadeUp>
          </Box>

          {/* sections */}
          <Box sx={{ minWidth: 0 }}>
            <Stack spacing={4.5}>
              {sections.map((s, i) => (
                <FadeUp key={s.id}>
                  <Box id={s.id} sx={{ scrollMarginTop: 96 }}>
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: "baseline" }}>
                      <Typography sx={{ fontFamily: FONT, fontSize: 14, fontWeight: 800, color: C.sageDark }}>
                        {String(i + 1).padStart(2, "0")}
                      </Typography>
                      <Typography component="h2" sx={{
                        fontFamily: FONT, fontSize: { xs: 18.5, md: 20 }, fontWeight: 700, color: C.ink,
                        position: "relative", display: "inline-block",
                        "&::after": {
                          content: '""', position: "absolute", left: 0, bottom: -6,
                          width: 30, height: 3, borderRadius: 2, bgcolor: C.sage,
                        },
                      }}>
                        {s.title}
                      </Typography>
                    </Stack>
                    <Stack spacing={1.5} sx={{ mt: 2.25 }}>
                      {s.body.map((b, k) =>
                        typeof b === "string" ? (
                          <Typography key={k} sx={{ fontFamily: FONT, fontSize: 14.25, color: "#3E443F", lineHeight: 1.85 }}>
                            {b}
                          </Typography>
                        ) : (
                          <Stack key={k} spacing={1} sx={{ pl: 0.5 }}>
                            {b.list.map((li, n) => (
                              <Stack key={n} direction="row" spacing={1.25} sx={{ alignItems: "flex-start" }}>
                                <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: C.sage, mt: "9px", flexShrink: 0 }} />
                                <Typography sx={{ fontFamily: FONT, fontSize: 14, color: "#3E443F", lineHeight: 1.8 }}>
                                  {li}
                                </Typography>
                              </Stack>
                            ))}
                          </Stack>
                        )
                      )}
                    </Stack>
                  </Box>
                </FadeUp>
              ))}
            </Stack>

            {/* contact card */}
            <FadeUp sx={{ mt: 5.5 }}>
              <Paper elevation={0} sx={{
                bgcolor: C.sageSoft, borderRadius: "18px", p: { xs: 2.75, md: 3.5 },
                border: "1px solid rgba(127,158,126,0.35)",
              }}>
                <Typography sx={{ fontFamily: FONT, fontSize: 16.5, fontWeight: 700, color: C.ink }}>
                  Questions about this document?
                </Typography>
                <Typography sx={{ fontFamily: FONT, fontSize: 13.75, color: "#3E443F", mt: 0.875, lineHeight: 1.75 }}>
                  Write to us at{" "}
                  <Box
                    component="a"
                    href="mailto:legal@ievalx.com"
                    sx={{
                      color: C.sageDark, fontWeight: 700, textDecoration: "none",
                      borderBottom: `2px solid ${C.sage}`,
                      "&:hover": CAN_HOVER ? { color: C.ink } : {},
                    }}
                  >
                    legal@ievalx.com
                  </Box>{" "}
                  — we reply within 2 business days.
                </Typography>
              </Paper>
            </FadeUp>
          </Box>
        </Box>
      </Container>
    </PublicLayout>
  );
}