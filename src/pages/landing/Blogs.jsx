import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography, Stack, Container, useMediaQuery } from "@mui/material";
import { ArrowForward } from "@mui/icons-material";
import { C, FONT, REDUCED, CAN_HOVER } from "./theme";
import { FadeUp, Eyebrow } from "./primitives";
import { ARTICLES } from "./data";
import { publicBlogsService } from "@/services/api/publicBlogsService";

export default function BlogsSection({ blogRef }) {
  const navigate = useNavigate();
  const [blogPage, setBlogPage] = useState(0);
  const mdUp = useMediaQuery("(min-width:900px)");
  const smUp = useMediaQuery("(min-width:600px)");
  const perView = mdUp ? 3.3 : smUp ? 2.2 : 1.15;

  const [articles, setArticles] = useState(ARTICLES);

  useEffect(() => {
    let alive = true;
    publicBlogsService.list({ limit: 8 }).then(({ posts }) => {
      if (alive && posts.length) setArticles(posts);
    });
    return () => { alive = false; };
  }, []);

  const maxPage = Math.max(0, articles.length - Math.floor(perView));
  return (
    <>
      {/* ══ LATEST BLOGS — reference replica: heading + square prev/next,
           borderless floating-image cards with a peeking 4th, dot pagination ══ */}
      <Container maxWidth="lg" ref={blogRef} sx={{ mt: { xs: 8, md: 11 }, scrollMarginTop: 90 }}>
        <Box sx={{ position: "relative" }}>
          <FadeUp>
            <Eyebrow align="left">News &amp; Blog</Eyebrow>
            <Typography sx={{
              fontFamily: FONT, fontSize: { xs: 34, md: 44 }, fontWeight: 700,
              color: C.ink, mt: 1, lineHeight: 1.1, letterSpacing: "-0.5px",
            }}>
              Our Latest Blogs
            </Typography>
          </FadeUp>

          <Stack direction="row" spacing={1.25}
            sx={{ alignItems: "center", position: { sm: "absolute" }, right: { sm: 0 }, bottom: { sm: 4 }, mt: { xs: 3, sm: 0 } }}>
            {/* ── "All Blogs" ink link (Option 2) → /blogs ── */}
            <Box
              onClick={() => navigate("/blogs")}
              role="link" tabIndex={0} aria-label="View all blogs"
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate("/blogs"); } }}
              sx={{
                display: "flex", alignItems: "center", gap: 0.75, cursor: "pointer",
                outline: "none", mr: { xs: 0.5, sm: 1 }, userSelect: "none",
                fontFamily: FONT, fontWeight: 600, fontSize: 15.5, color: C.ink,
                transition: REDUCED ? "none" : "color .25s ease",
                "& .allBlogsLabel": {
                  borderBottom: `2px solid ${C.sage}`, pb: "2px",
                },
                "& .allBlogsArrow": {
                  transition: REDUCED ? "none" : "transform .25s cubic-bezier(0.22,1,0.36,1)",
                },
                "&:hover": CAN_HOVER ? {
                  color: C.sage,
                  "& .allBlogsArrow": { transform: "translateX(4px)" },
                } : {},
                "&:focus-visible": { color: C.sage },
                "&:active .allBlogsArrow": { transform: "translateX(2px)" },
              }}
            >
              <Box component="span" className="allBlogsLabel">All Blogs</Box>
              <ArrowForward className="allBlogsArrow" sx={{ fontSize: 17 }} />
            </Box>

            {(() => {
              const go = d => setBlogPage(p => Math.min(Math.max(0, p + d), maxPage));
              const btn = (dir, label, rot) => (
                <Box
                  onClick={() => go(dir)}
                  role="button" tabIndex={0} aria-label={label}
                  onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(dir); } }}
                  sx={{
                    width: 46, height: 46, borderRadius: "10px", cursor: "pointer", outline: "none",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    bgcolor: C.sage, border: `1.5px solid ${C.sage}`, color: "#fff",
                    boxShadow: "0 8px 20px rgba(127,158,126,0.28)",
                    transition: "background .3s cubic-bezier(0.22,1,0.36,1), border-color .3s ease, transform .3s cubic-bezier(0.22,1,0.36,1), box-shadow .3s ease",
                    "& svg": { transition: "transform .3s cubic-bezier(0.22,1,0.36,1)" },
                    "&:hover": {
                      bgcolor: C.ink, borderColor: C.ink,
                      transform: CAN_HOVER ? "translateY(-3px)" : "none",
                      boxShadow: "0 14px 28px rgba(31,31,31,0.32)",
                      "& svg": { transform: `rotate(${rot}deg) translateX(3px)` },
                    },
                    "&:active": { transform: "translateY(-1px) scale(0.97)" },
                  }}
                >
                  <ArrowForward sx={{ fontSize: 18, transform: `rotate(${rot}deg)` }} />
                </Box>
              );
              return (<>{btn(-1, "Previous blogs", 180)}{btn(1, "Next blogs", 0)}</>);
            })()}
          </Stack>
        </Box>

        {/* viewport shows ~3.3 cards so the next one peeks in (reference) */}
        <Box sx={{ overflow: "hidden", mt: 5, mx: { xs: 0, md: -1 } }}>
          <Box sx={{
            display: "flex",
            transform: `translateX(calc(-${Math.min(blogPage, maxPage)} * (100% + 24px) / ${perView}))`,
            transition: REDUCED ? "none" : "transform .55s cubic-bezier(0.22,1,0.36,1)",
          }}>
            {articles.map(a => (
              <Box key={a.slug || a.title} sx={{
                flex: `0 0 calc((100% - 3 * 24px) / ${perView})`,
                mr: "24px", minWidth: 0,
              }}>
                <Box
                  onClick={() => navigate(a.slug ? `/blogs/${a.slug}` : "/blogs")}
                  sx={{
                    cursor: "pointer", height: "100%",
                    "&:hover .blogImg": { transform: CAN_HOVER ? "scale(1.05)" : "none" },
                    "&:hover .blogArrow": { transform: "translateX(4px)" },
                  }}
                >
                  {/* floating image — no card border */}
                  <Box sx={{
                    position: "relative", borderRadius: "14px", overflow: "hidden",
                    aspectRatio: "1 / 0.82", bgcolor: C.sageSoft,
                  }}>


                    {a.imgKind === "video" && a.img ? (
                      <Box
                        component="video"
                        className="blogImg"
                        controls
                        muted
                        playsInline
                        preload="metadata"
                        onClick={e => e.stopPropagation()}
                        onMouseDown={e => e.stopPropagation()}
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
                        alt=""
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

                  {/* minimal text below the image */}
                  <Box sx={{ pt: 2 }}>
                    <Typography sx={{ fontFamily: FONT, fontSize: 12, color: C.muted, letterSpacing: "0.3px" }}>
                      {a.tag}
                    </Typography>
                    <Typography sx={{
                      fontFamily: FONT, fontSize: 16.5, fontWeight: 600, color: C.ink,
                      mt: 0.75, lineHeight: 1.4,
                    }}>
                      {a.title}
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
              </Box>
            ))}
          </Box>
        </Box>

        {/* dot pagination (reference) */}
        <Stack direction="row" spacing={1} sx={{ justifyContent: "center", mt: 4.5 }}>
          {Array.from({ length: maxPage + 1 }).map((_, i) => (
            <Box
              key={i}
              onClick={() => setBlogPage(i)}
              role="button" tabIndex={0} aria-label={`Go to blog page ${i + 1}`}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setBlogPage(i); } }}
              sx={{
                cursor: "pointer", outline: "none",
                width: i === blogPage ? 9 : 7, height: i === blogPage ? 9 : 7,
                borderRadius: i === blogPage ? "2px" : "50%",
                bgcolor: i === blogPage ? C.ink : "rgba(31,31,31,0.25)",
                transition: "all .25s ease",
              }}
            />
          ))}
        </Stack>
      </Container>
    </>
  );
}