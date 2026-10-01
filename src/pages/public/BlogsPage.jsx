import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography, Stack, Container, Paper, CircularProgress } from "@mui/material";
import { ArrowForward } from "@mui/icons-material";
import { C, FONT, REDUCED, CAN_HOVER } from "../landing/theme";
import { FadeUp } from "../landing/primitives";
import PublicLayout, { PageHero } from "./PublicLayout";
import { BLOG_TAGS } from "./publicData";
import { publicBlogsService } from "@/services/api/publicBlogsService";

/* ══════════════════════════════════════════════════════════════════════════
   READ BLOGS — /blogs
   Featured latest post + tag filter + card grid; every card opens its own
   readable article at /blogs/:slug (Unstop-style content hub).
   ══════════════════════════════════════════════════════════════════════════ */

export default function BlogsPage() {
  const navigate = useNavigate();
  const [tag, setTag] = useState("All");

  const [posts, setPosts] = useState([]);
  const [tags, setTags] = useState(BLOG_TAGS);
  const [loading, setLoading] = useState(true);

  /* Filtering happens server-side so a tag with fifty posts doesn't ship all
     fifty to the browser just to show four. */
  useEffect(() => {
    let alive = true;
    setLoading(true);
    publicBlogsService.list({ tag, limit: 24 }).then(({ posts: rows, tags: rail }) => {
      if (!alive) return;
      setPosts(rows);
      // Only take the rail from the unfiltered request — a filtered response
      // can't tell us which other tags exist.
      if (tag === "All" && rail?.length) setTags(rail);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [tag]);

  const featured = posts[0];
  const rest     = posts.slice(1);

  const openPost = (slug) => navigate(`/blogs/${slug}`);

  return (
    <PublicLayout>
      <PageHero
        eyebrow="News & Blog"
        title="Read Our Latest Blogs"
        subtitle="Insights on AI hiring, verified assessments, CIR scores and building a career on proof — from the IEvalx team."
        back={{ label: "Back to Home", to: "/" }}
      >
        {/* tag filter chips */}
        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1 }}>
          {tags.map(t => {
            const on = t === tag;
            return (
              <Box
                key={t}
                onClick={() => setTag(t)}
                role="button" tabIndex={0}
                onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setTag(t); } }}
                sx={{
                  borderRadius: "999px", px: 1.875, py: 0.625, cursor: "pointer", outline: "none",
                  fontFamily: FONT, fontSize: 13, fontWeight: 600,
                  bgcolor: on ? C.ink : "rgba(255,255,255,0.7)",
                  color: on ? "#fff" : C.ink,
                  border: `1px solid ${on ? C.ink : "rgba(31,31,31,0.12)"}`,
                  transition: "all .25s ease",
                  "&:hover": { bgcolor: on ? C.ink : C.sage, borderColor: on ? C.ink : C.sage, color: "#fff" },
                }}
              >
                {t}
              </Box>
            );
          })}
        </Stack>
      </PageHero>

     <Container maxWidth="lg" sx={{ mt: { xs: 4.5, md: 6 }, mb: { xs: 6, md: 9 } }}>
        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
            <CircularProgress sx={{ color: C.sage }} />
          </Box>
        )}

        {!loading && posts.length === 0 && (
          <Typography sx={{
            fontFamily: FONT, fontSize: 15, color: C.muted,
            textAlign: "center", py: 10,
          }}>
            No posts published under this topic yet.
          </Typography>
        )}

        {!loading && featured && (
          /* ── featured post — split card ── */
          <FadeUp>
            <Paper
              elevation={0}
              onClick={() => openPost(featured.slug)}
              role="button" tabIndex={0}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openPost(featured.slug); } }}
              sx={{
                display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.15fr 1fr" },
                bgcolor: "#fff", borderRadius: "22px", overflow: "hidden", cursor: "pointer", outline: "none",
                border: `1px solid ${C.line}`,
                boxShadow: "0 16px 44px rgba(2,33,36,0.07)",
                transition: "transform .3s cubic-bezier(0.22,1,0.36,1), box-shadow .3s ease",
                "&:hover": CAN_HOVER ? {
                  transform: "translateY(-5px)",
                  boxShadow: "0 28px 64px rgba(2,33,36,0.13)",
                  "& .feat-img": { transform: "scale(1.04)" },
                  "& .feat-arrow": { transform: "translateX(4px)" },
                } : {},
              }}
            >
              <Box sx={{ overflow: "hidden", minHeight: { xs: 220, md: 340 }, position: "relative" }}>
                {featured.imgKind === "video" && (
                  <Box sx={{
                    position: "absolute", top: 14, left: 14, zIndex: 1,
                    display: "flex", alignItems: "center", gap: 0.75,
                    px: 1.25, py: 0.5, borderRadius: "999px",
                    bgcolor: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
                    color: "#fff", fontFamily: FONT, fontSize: 11.5, fontWeight: 600,
                  }}>
                    <Box component="span" sx={{
                      width: 0, height: 0, ml: 0.25,
                      borderTop: "5px solid transparent",
                      borderBottom: "5px solid transparent",
                      borderLeft: "8px solid #fff",
                    }} />
                    Video
                  </Box>
                )}
                <Box
                  component={featured.imgKind === "video" ? "video" : "img"}
                  className="feat-img"
                  src={featured.img}
                  alt=""
                  muted
                  playsInline
                  preload="metadata"
                  loading="lazy"
                  {...(featured.imgKind === "video" && {
                    controls: true,
                    // The whole card navigates on click; without this, pressing
                    // play would open the article instead of playing anything.
                    onClick: (e) => e.stopPropagation(),
                  })}
                  onError={e => { e.currentTarget.style.display = "none"; }}
                  sx={{
                    width: "100%", height: "100%", objectFit: "cover", display: "block",
                    bgcolor: C.sageSoft,
                    transition: REDUCED ? "none" : "transform .6s cubic-bezier(0.22,1,0.36,1)",
                  }}
                />
              </Box>
              <Box sx={{ p: { xs: "22px 22px 24px", md: "36px 38px" }, display: "flex", flexDirection: "column" }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <Box sx={{
                    bgcolor: C.sageSoft, color: C.sageDark, borderRadius: "999px",
                    px: 1.5, py: 0.375, fontFamily: FONT, fontSize: 11.5, fontWeight: 700,
                  }}>
                    Featured
                  </Box>
                  <Typography sx={{ fontFamily: FONT, fontSize: 12, color: C.muted }}>
                    {featured.tag} · {featured.date} · {featured.read}
                  </Typography>
                </Stack>
                <Typography sx={{
                  fontFamily: FONT, fontSize: { xs: 21, md: 26 }, fontWeight: 700, color: C.ink,
                  mt: 1.75, lineHeight: 1.3, letterSpacing: "-0.3px",
                }}>
                  {featured.title}
                </Typography>
                <Typography sx={{ fontFamily: FONT, fontSize: 14, color: C.muted, mt: 1.5, lineHeight: 1.75 }}>
                  {featured.excerpt}
                </Typography>
                <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", mt: "auto", pt: 3 }}>
                  <Typography sx={{
                    fontFamily: FONT, fontSize: 14, fontWeight: 700, color: C.ink,
                    borderBottom: `1.5px solid ${C.ink}`, pb: 0.25,
                  }}>
                    Read Blog
                  </Typography>
                  <ArrowForward className="feat-arrow" sx={{ fontSize: 15, color: C.ink, transition: "transform .25s" }} />
                </Stack>
              </Box>
            </Paper>
          </FadeUp>
        )}

        {/* ── grid of remaining posts ── */}
        {!loading && rest.length > 0 && (
          <Box sx={{
            display: "grid", gap: 3, mt: 4,
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "repeat(3, 1fr)" },
          }}>
            {rest.map((a, i) => (
              <FadeUp key={a.slug} delay={(i % 3) * 0.08}>
                <Box
                  onClick={() => openPost(a.slug)}
                  role="button" tabIndex={0}
                  onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openPost(a.slug); } }}
                  sx={{
                    cursor: "pointer", height: "100%", outline: "none",
                    "&:hover .blogImg": { transform: CAN_HOVER ? "scale(1.05)" : "none" },
                    "&:hover .blogArrow": { transform: "translateX(4px)" },
                  }}
                >
                  <Box sx={{ position: "relative", borderRadius: "14px", overflow: "hidden", aspectRatio: "1 / 0.72", bgcolor: C.sageSoft }}>
                    {a.imgKind === "video" && a.img ? (
                      <Box
                        component="video"
                        className="blogImg"
                        controls
                        muted
                        playsInline
                        preload="metadata"
                        onClick={e => e.stopPropagation()}
                        sx={{
                          width: "100%", height: "100%", objectFit: "cover", display: "block",
                          bgcolor: "#000",
                        }}
                      >
                        <source src={a.img} />
                      </Box>
                    ) : a.img ? (
                      <Box
                        component="img"
                        className="blogImg"
                        src={a.img}
                        alt={a.title}
                        loading="lazy"
                        onError={e => { e.currentTarget.style.display = "none"; }}
                        sx={{
                          width: "100%", height: "100%", objectFit: "cover",
                          bgcolor: C.sageSoft,
                          transition: REDUCED ? "none" : "transform .55s cubic-bezier(0.22,1,0.36,1)",
                        }}
                      />
                    ) : null}
                  </Box>
                  <Box sx={{ pt: 2 }}>
                    <Typography sx={{ fontFamily: FONT, fontSize: 12, color: C.muted, letterSpacing: "0.3px" }}>
                      {a.tag} · {a.date} · {a.read}
                    </Typography>
                    <Typography sx={{
                      fontFamily: FONT, fontSize: 16.5, fontWeight: 600, color: C.ink,
                      mt: 0.75, lineHeight: 1.4,
                    }}>
                      {a.title}
                    </Typography>
                    <Typography sx={{
                      fontFamily: FONT, fontSize: 13, color: C.muted, mt: 0.875, lineHeight: 1.7,
                      display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                    }}>
                      {a.excerpt}
                    </Typography>
                    <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", mt: 1.75 }}>
                      <Typography sx={{
                        fontFamily: FONT, fontSize: 13.5, fontWeight: 600, color: C.ink,
                        borderBottom: `1.5px solid ${C.ink}`, pb: 0.25,
                      }}>
                        Read Blog
                      </Typography>
                      <ArrowForward className="blogArrow" sx={{ fontSize: 14, color: C.ink, transition: "transform .25s" }} />
                    </Stack>
                  </Box>
                </Box>
              </FadeUp>
            ))}
          </Box>
        )}
      </Container>
    </PublicLayout>
  );
}