import { Box, Typography, Container, Skeleton } from "@mui/material";
import { useNavigate } from "react-router-dom";
import {
  DesignServices, Code, Campaign, HealthAndSafety, Payments,
  AccountBalance, SupportAgent, Memory, School, Factory,
  ShoppingCartOutlined, LocalShippingOutlined, WorkOutlineOutlined,
} from "@mui/icons-material";
import { C, FONT, REDUCED, CAN_HOVER } from "./theme";
import { FadeUp, Eyebrow, SageButton } from "./primitives";
import { usePublicIndustries } from "@/services/api/publicJobsService";

/* ══════════════════════════════════════════════════════════════════════════
   BROWSE BY INDUSTRY — landing section (replaces the derived categories).
   Tiles RENDER FROM THE BACKEND: usePublicIndustries() calls
   GET /api/jobs/industries, which groups every PUBLISHED + APPROVED job
   from every company by the employer-entered Industry Type
   (industry_preference) — case-insensitive, majority-casing display names,
   blank industry bucketed as "Other". Whatever the backend returns is what
   renders: names, counts, order (count desc, Other last).
   The frontend's only contribution is cosmetic — a keyword-matched icon per
   industry name (icons can't travel over JSON), briefcase default.
   The landing grid shows the top 8 buckets; "Browse All Industries" opens
   the full list. Falls back to locally-derived buckets (same algorithm)
   if the endpoint isn't deployed yet, so the section never breaks.
   ══════════════════════════════════════════════════════════════════════════ */

const MAX_TILES = 8;

/* keyword → icon matcher (cosmetic only; data comes from the backend) */
const ICON_RULES = [
  { kw: ["design", "creative", "media"],                                icon: <DesignServices /> },
  { kw: ["software", "information technology", "tech", " it", "it ", "saas", "computer"], icon: <Code /> },
  { kw: ["market", "sales", "advertis", "e-commerce", "ecommerce", "retail"], icon: <Campaign /> },
  { kw: ["health", "medical", "pharma", "hospital", "care", "wellness"], icon: <HealthAndSafety /> },
  { kw: ["finance", "fintech", "account", "insurance", "invest"],       icon: <Payments /> },
  { kw: ["bank", "nbfc", "lending"],                                    icon: <AccountBalance /> },
  { kw: ["support", "bpo", "service", "call cent", "customer"],         icon: <SupportAgent /> },
  { kw: ["data", "ai", "cloud", "telecom", "network", "cyber"],         icon: <Memory /> },
  { kw: ["educat", "school", "training", "edtech"],                     icon: <School /> },
  { kw: ["manufactur", "industrial", "engineering", "automo"],          icon: <Factory /> },
  { kw: ["shopping", "consumer", "fmcg"],                               icon: <ShoppingCartOutlined /> },
  { kw: ["logistic", "transport", "supply", "shipping"],                icon: <LocalShippingOutlined /> },
];

const iconFor = (name) => {
  const n = ` ${String(name || "").toLowerCase()} `;
  for (const rule of ICON_RULES) {
    if (rule.kw.some((k) => n.includes(k))) return rule.icon;
  }
  return <WorkOutlineOutlined />;
};

/* skeleton tile while the backend responds */
function TileSkeleton() {
  return (
    <Box sx={{
      bgcolor: C.inkCard, borderRadius: "14px", p: "18px 20px",
      display: "flex", alignItems: "center", gap: 1.75,
      border: "1px solid rgba(255,255,255,0.05)",
    }}>
      <Skeleton variant="rounded" width={44} height={44}
        sx={{ bgcolor: "rgba(255,255,255,0.08)", borderRadius: "11px", flexShrink: 0 }} />
      <Box sx={{ flex: 1 }}>
        <Skeleton variant="text" width="70%" sx={{ bgcolor: "rgba(255,255,255,0.12)", fontSize: 14.5 }} />
        <Skeleton variant="text" width="55%" sx={{ bgcolor: "rgba(255,255,255,0.08)", fontSize: 12 }} />
      </Box>
    </Box>
  );
}

export default function CategoriesSection({ catRef }) {
  const navigate = useNavigate();
  const { industries, loading } = usePublicIndustries();

  const tiles = industries.slice(0, MAX_TILES);

  const openIndustry = (name) =>
    navigate(`/jobs?industry=${encodeURIComponent(name)}`);

  return (
    <>
      {/* ══ BROWSE BY INDUSTRY — full-bleed dark band ══ */}
      <Box ref={catRef} sx={{
        mt: { xs: 8, md: 11 }, scrollMarginTop: 90,
        bgcolor: C.ink, py: { xs: 5, md: 7 },
      }}>
        <Container maxWidth="lg">
        <FadeUp>
          <Box>
            <Box sx={{ position: "relative", mb: 4.5 }}>
              <Eyebrow onDark>Browse by Industry</Eyebrow>
              <Typography sx={{
                fontFamily: FONT, fontSize: { xs: 24, sm: 28, md: 36 }, fontWeight: 700, color: "#fff",
                mt: 2, maxWidth: { md: "70%" },
              }}>
                Explore Openings by Industry
              </Typography>
              <SageButton onClick={() => navigate("/categories")}
                sx={{ position: { md: "absolute" }, top: { md: 0 }, right: { md: 0 },
                      mt: { xs: 2.5, md: 0 }, flexShrink: 0 }}>
                Browse All Industries
              </SageButton>
            </Box>

            <Box sx={{
              display: "grid", gap: 2,
              gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "minmax(0, 1fr) minmax(0, 1fr)", md: "repeat(4, minmax(0, 1fr))" },
            }}>
              {/* ── loading: skeleton tiles until the backend responds ── */}
              {loading && Array.from({ length: MAX_TILES }).map((_, i) => (
                <TileSkeleton key={i} />
              ))}

              {/* ── live tiles — exactly what the backend returned ── */}
              {!loading && tiles.map((ind, i) => (
                <FadeUp key={ind.name} delay={(i % 4) * 0.08} sx={{ minWidth: 0 }}>
                  {/* Corner-bloom tile: a sage circle anchored at the bottom-right
                      corner scales up on hover, washing the tile — same geometry,
                      easing and duration as the Sign Up / SageButton hover family. */}
                  <Box
                    onClick={() => openIndustry(ind.name)}
                    role="button" tabIndex={0}
                    title={ind.name}
                    aria-label={`Browse ${ind.name} jobs`}
                    onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openIndustry(ind.name); } }}
                    sx={{
                      position: "relative", overflow: "hidden", minWidth: 0,
                      bgcolor: C.inkCard, borderRadius: "14px", p: "18px 20px",
                      display: "flex", alignItems: "center", gap: 1.75, cursor: "pointer",
                      border: "1px solid rgba(255,255,255,0.05)", outline: "none",
                      transition: "transform .25s ease, border-color .25s ease",
                      "&::before": {
                        content: '""',
                        position: "absolute", zIndex: 1,
                        left: "100%", top: "100%",
                        width: 480, height: 480, ml: "-240px", mt: "-240px",
                        borderRadius: "50%", bgcolor: C.sage,
                        transform: "scale(0)",
                        transition: REDUCED ? "none" : "transform .55s cubic-bezier(0.22,1,0.36,1)",
                        pointerEvents: "none",
                      },
                      "&:hover, &:focus-visible": CAN_HOVER ? {
                        transform: "translateY(-3px)",
                        borderColor: "rgba(255,255,255,0.12)",
                        "&::before": { transform: "scale(1)" },
                        "& .catIcon": { bgcolor: "rgba(255,255,255,0.18)", color: "#fff" },
                        "& .catName": { color: "#fff" },
                        "& .catCount": { color: "rgba(255,255,255,0.85)" },
                      } : {
                        "&::before": { transform: "scale(1)" },
                      },
                    }}>
                    <Box className="catIcon" sx={{
                      position: "relative", zIndex: 2,
                      width: 44, height: 44, borderRadius: "11px", flexShrink: 0,
                      bgcolor: "rgba(127,158,126,0.16)", color: C.sage,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: REDUCED ? "none" : "background .4s ease, color .4s ease",
                      "& svg": { fontSize: 22 },
                    }}>
                      {iconFor(ind.name)}
                    </Box>
                    <Box sx={{ position: "relative", zIndex: 2, minWidth: 0 }}>
                      <Typography className="catName" sx={{
                        fontFamily: FONT, fontSize: 14.5, fontWeight: 600, color: "#fff",
                        transition: REDUCED ? "none" : "color .4s ease",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {ind.name}
                      </Typography>
                      <Typography className="catCount" sx={{
                        fontFamily: FONT, fontSize: 12, color: C.mutedOnDark, mt: 0.25,
                        transition: REDUCED ? "none" : "color .4s ease",
                      }}>
                        {`${ind.count} Job${ind.count === 1 ? "" : "s"} Available`}
                      </Typography>
                    </Box>
                  </Box>
                </FadeUp>
              ))}

              {/* ── no live jobs at all — honest placeholder tile ── */}
              {!loading && tiles.length === 0 && (
                <Box sx={{
                  gridColumn: "1 / -1", textAlign: "center", py: 4,
                  color: C.mutedOnDark, fontFamily: FONT, fontSize: 14,
                }}>
                  Industries will appear here as soon as verified employers publish their first openings.
                </Box>
              )}
            </Box>
          </Box>
        </FadeUp>
        </Container>
      </Box>
    </>
  );
}