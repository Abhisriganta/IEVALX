import { useEffect, useState } from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { Box, Typography, Stack, Container, Button, CircularProgress } from "@mui/material";
import { ArrowBack, ArrowForward } from "@mui/icons-material";
import { C, FONT, REDUCED, CAN_HOVER } from "../landing/theme";
import { FadeUp, Eyebrow } from "../landing/primitives";
import PublicLayout from "./PublicLayout";
import { publicBlogsService } from "@/services/api/publicBlogsService";
import useEmblaCarousel from "embla-carousel-react";

function GalleryCarousel({ images }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setCurrent(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    return () => emblaApi.off("select", onSelect);
  }, [emblaApi]);

  return (
    <Box sx={{ mt: { xs: 4, md: 5 }, maxWidth: 720, mx: "auto", position: "relative" }}>
      <Box ref={emblaRef} sx={{ overflow: "hidden", borderRadius: "20px",
        boxShadow: "0 24px 60px rgba(2,33,36,0.12)" }}>
        <Box sx={{ display: "flex" }}>
          {images.map((m, i) => (
            <Box key={i} sx={{ flex: "0 0 100%", minWidth: 0,
              aspectRatio: "16 / 8", bgcolor: C.sageSoft }}>
              {m.kind === "video" ? (
                <Box
                  component="video"
                  controls
                  playsInline
                  preload="metadata"
                  sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block", bgcolor: "#000" }}
                >
                  <source src={m.url} />
                </Box>
              ) : (
                <Box component="img" src={m.url} alt={m.name || ""} loading="eager"
                  onError={e => { e.currentTarget.style.display = "none"; }}
                  sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              )}
            </Box>
          ))}
        </Box>
      </Box>

      {images.length > 1 && (
        <>
          <Box onClick={() => emblaApi?.scrollPrev()} role="button" aria-label="Previous"
            sx={{ position: "absolute", top: "50%", left: -18, transform: "translateY(-50%)",
              width: 38, height: 38, borderRadius: "50%", bgcolor: "#fff",
              boxShadow: "0 4px 14px rgba(2,33,36,0.18)", display: "flex",
              alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 2,
              "&:hover": { bgcolor: C.sage, "& svg": { color: "#fff" } }, transition: "background .2s" }}>
            <ArrowBack sx={{ fontSize: 17, color: C.ink }} />
          </Box>
          <Box onClick={() => emblaApi?.scrollNext()} role="button" aria-label="Next"
            sx={{ position: "absolute", top: "50%", right: -18, transform: "translateY(-50%)",
              width: 38, height: 38, borderRadius: "50%", bgcolor: "#fff",
              boxShadow: "0 4px 14px rgba(2,33,36,0.18)", display: "flex",
              alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 2,
              "&:hover": { bgcolor: C.sage, "& svg": { color: "#fff" } }, transition: "background .2s" }}>
            <ArrowForward sx={{ fontSize: 17, color: C.ink }} />
          </Box>
          <Stack direction="row" spacing={0.75} sx={{ justifyContent: "center", mt: 2 }}>
            {images.map((_, i) => (
              <Box key={i} onClick={() => emblaApi?.scrollTo(i)}
                sx={{ width: i === current ? 20 : 7, height: 7, borderRadius: "999px",
                  cursor: "pointer", bgcolor: i === current ? C.sage : C.sageSoft,
                  transition: "all .3s ease" }} />
            ))}
          </Stack>
        </>
      )}
    </Box>
  );
}

export default function BlogPostPage() {
  const navigate = useNavigate();
  const { slug } = useParams();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  /* Fetching the article IS the view. The backend increments the counter as
     part of serving this record, deduped per reader per day — so a view can't
     be double-fired by a re-render or lost to an ad blocker. Keyed on slug so
     navigating between related posts counts each one. */
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setMissing(false);
    publicBlogsService.getBySlug(slug).then(({ post: found }) => {
      if (!alive) return;
      if (found) setPost(found);
      else setMissing(true);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [slug]);

  // Without this, clicking a "Keep Reading" card lands the reader mid-article.
  useEffect(() => { window.scrollTo({ top: 0, behavior: "auto" }); }, [slug]);

  if (missing) return <Navigate to="/blogs" replace />;

  if (loading || !post) {
    return (
      <PublicLayout>
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
          <CircularProgress sx={{ color: C.sage }} />
        </Box>
      </PublicLayout>
    );
  }

  const more = post.related || [];

  // All gallery items with a URL — images and videos both included.
  // The grid renderer and carousel both handle kind === "video" explicitly.
  const galleryImages = (post.gallery || []).filter(m => m.url);

  return (
    <PublicLayout>
      {/* ── article hero ── */}
      <Box sx={{
        bgcolor: C.hero, pt: { xs: 13, md: 16 }, pb: { xs: 4, md: 5.5 },
        clipPath: { md: "polygon(0 0, 100% 0, 100% 96%, 0 100%)" },
      }}>
        <Container maxWidth="md">
          <FadeUp>
            <Stack
              direction="row" spacing={0.75}
              onClick={() => navigate("/blogs")}
              role="button" tabIndex={0}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate("/blogs"); } }}
              sx={{ alignItems: "center",
                cursor: "pointer", width: "fit-content", outline: "none", mb: 2.5,
                "&:hover .back-arrow": { transform: "translateX(-4px)" },
              }}
            >
              <ArrowBack className="back-arrow" sx={{ fontSize: 16, color: C.sageDark, transition: "transform .25s" }} />
              <Typography sx={{ fontFamily: FONT, fontSize: 13.5, fontWeight: 700, color: C.sageDark }}>
                All blogs
              </Typography>
            </Stack>

            <Eyebrow align="left">{post.tag}</Eyebrow>
            <Typography component="h1" sx={{
              fontFamily: FONT, fontWeight: 800, color: C.ink,
              fontSize: { xs: 27, sm: 34, md: 42 },
              lineHeight: 1.15, letterSpacing: "-0.5px", mt: 1.5,
            }}>
              {post.title}
            </Typography>
            <Typography sx={{ fontFamily: FONT, fontSize: 13.5, color: "#4A524C", mt: 1.75 }}>
              {[post.date, post.read, post.author].filter(Boolean).join(" · ")}
            </Typography>
          </FadeUp>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ mt: { xs: 4, md: 5.5 }, mb: { xs: 6, md: 9 } }}>
        {/* body */}
        <FadeUp delay={0.08}>
          <Box sx={{ mt: { xs: 3.5, md: 5 }, maxWidth: 720, mx: "auto" }}>
            <Typography sx={{
              fontFamily: FONT, fontSize: { xs: 16, md: 17.5 }, color: C.ink, fontWeight: 500,
              lineHeight: 1.85, borderLeft: `3px solid ${C.sage}`, pl: 2.5,
            }}>
              {post.excerpt}
            </Typography>
            {(post.body || []).map((para, i) => (
              <Typography key={i} sx={{
                fontFamily: FONT, fontSize: { xs: 14.5, md: 15.5 }, color: "#3C423E",
                lineHeight: 1.95, mt: 3,
              }}>
                {para}
              </Typography>
            ))}
          </Box>
        </FadeUp>

       
        {galleryImages.length > 0 && (
          <FadeUp delay={0.09}>
            {post.galleryDisplay === "carousel" ? (
              <GalleryCarousel images={galleryImages} />
            ) : (
              <Box sx={{
                display: "grid", gap: 2, mt: { xs: 4, md: 5 },
                gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
                maxWidth: 720, mx: "auto",
              }}>
                {galleryImages.map((m, i) => (
                  <Box key={i} sx={{
                    borderRadius: "14px", overflow: "hidden",
                    aspectRatio: "16 / 9", bgcolor: C.sageSoft,
                  }}>
                    {m.kind === "video" ? (
                      <Box
                        component="video"
                        controls
                        playsInline
                        preload="metadata"
                        sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block", bgcolor: "#000" }}
                      >
                        <source src={m.url} />
                      </Box>
                    ) : (
                      <Box
                        component="img"
                        src={m.url}
                        alt={m.name || ""}
                        loading="eager"
                        onError={e => { e.currentTarget.style.display = "none"; }}
                        sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                    )}
                  </Box>
                ))}
              </Box>
            )}
          </FadeUp>
        )}

        {/* CTA band */}
        <FadeUp delay={0.1}>
          <Box sx={{
            mt: { xs: 5, md: 7 }, borderRadius: "20px", bgcolor: C.pine,
            p: { xs: "26px 24px", md: "34px 40px" },
            display: "flex", flexDirection: { xs: "column", sm: "row" },
            alignItems: { sm: "center" }, gap: 2.5, justifyContent: "space-between",
          }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontFamily: FONT, fontSize: { xs: 19, md: 23 }, fontWeight: 700, color: "#fff" }}>
                Ready to prove your skills?
              </Typography>
              <Typography sx={{ fontFamily: FONT, fontSize: 13.5, color: "rgba(255,255,255,0.7)", mt: 0.75 }}>
                Create a free profile, take an AI interview and earn your verified CIR score today.
              </Typography>
            </Box>
            <Button onClick={() => navigate("/auth")} sx={{
              fontFamily: FONT, textTransform: "none", flexShrink: 0,
              bgcolor: C.sage, color: "#fff", borderRadius: "999px",
              px: 3.25, height: 48, fontSize: 14.5, fontWeight: 600, minWidth: 0,
              "&:hover": { bgcolor: C.sageDark },
            }}>
              Get Started Free
            </Button>
          </Box>
        </FadeUp>

        {/* related posts */}
        {more.length > 0 && (
          <FadeUp delay={0.12}>
            <Typography sx={{ fontFamily: FONT, fontSize: { xs: 20, md: 24 }, fontWeight: 700, color: C.ink, mt: { xs: 5, md: 7 } }}>
              Keep Reading
            </Typography>
            <Box sx={{
              display: "grid", gap: 3, mt: 2.5,
              gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
            }}>
              {more.map(a => (
                <Box
                  key={a.slug}
                  onClick={() => navigate(`/blogs/${a.slug}`)}
                  role="button" tabIndex={0}
                  onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(`/blogs/${a.slug}`); } }}
                  sx={{
                    cursor: "pointer", outline: "none",
                    "&:hover .rel-img": { transform: CAN_HOVER ? "scale(1.05)" : "none" },
                    "&:hover .rel-arrow": { transform: "translateX(4px)" },
                  }}
                >
                  <Box sx={{ borderRadius: "12px", overflow: "hidden", aspectRatio: "1 / 0.68", bgcolor: C.sageSoft }}>
                    {a.img && a.imgKind === "video" ? (
                      <Box
                        component="video"
                        src={a.img}
                        controls
                        playsInline
                        preload="metadata"
                        onClick={e => e.stopPropagation()}
                        sx={{
                          width: "100%", height: "100%", objectFit: "cover",
                          display: "block", bgcolor: "#000",
                        }}
                      />
                    ) : a.img ? (
                      <Box
                        component="img"
                        className="rel-img"
                        src={a.img}
                        alt={a.title}
                        loading="eager"
                        onError={e => { e.currentTarget.style.display = "none"; }}
                        sx={{
                          width: "100%", height: "100%", objectFit: "cover", bgcolor: C.sageSoft,
                          transition: REDUCED ? "none" : "transform .55s cubic-bezier(0.22,1,0.36,1)",
                        }}
                      />
                    ) : null}
                  </Box>
                  <Typography sx={{ fontFamily: FONT, fontSize: 11.5, color: C.muted, mt: 1.25 }}>
                    {[a.tag, a.read].filter(Boolean).join(" · ")}
                  </Typography>
                  <Typography sx={{ fontFamily: FONT, fontSize: 14.5, fontWeight: 600, color: C.ink, mt: 0.5, lineHeight: 1.4 }}>
                    {a.title}
                  </Typography>
                  <Stack direction="row" spacing={0.625} sx={{ alignItems: "center", mt: 1 }}>
                    <Typography sx={{ fontFamily: FONT, fontSize: 12.5, fontWeight: 700, color: C.sageDark }}>
                      Read
                    </Typography>
                    <ArrowForward className="rel-arrow" sx={{ fontSize: 13, color: C.sageDark, transition: "transform .25s" }} />
                  </Stack>
                </Box>
              ))}
            </Box>
          </FadeUp>
        )}
      </Container>
    </PublicLayout>
  );
}