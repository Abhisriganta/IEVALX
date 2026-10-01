import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography, Stack, Container, Paper, TextField, Skeleton } from "@mui/material";
import {
  Search, ArrowForward, WorkOutlineOutlined,
  DesignServices, Code, Campaign, HealthAndSafety, Payments,
  AccountBalance, SupportAgent, Memory, School, Factory,
  ShoppingCartOutlined, LocalShippingOutlined,
} from "@mui/icons-material";
import { C, FONT, REDUCED, CAN_HOVER } from "../landing/theme";
import { FadeUp } from "../landing/primitives";
import PublicLayout, { PageHero } from "./PublicLayout";
import { usePublicIndustries } from "@/services/api/publicJobsService";


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

const blurbFor = (ind) =>
  ind.name.toLowerCase() === "other"
    ? "Openings whose employers haven't specified an industry yet — still fully verified and live."
    : `${ind.count} live ${ind.name} opening${ind.count === 1 ? "" : "s"} from verified employers on IEvalx.`;

/* skeleton card while the backend responds */
function CardSkeleton() {
  return (
    <Paper elevation={0} sx={{
      bgcolor: "#fff", borderRadius: "18px", p: "24px 24px 22px",
      border: `1px solid ${C.line}`, boxShadow: "0 12px 30px rgba(2,33,36,0.05)",
    }}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
        <Skeleton variant="rounded" width={52} height={52} sx={{ borderRadius: "14px" }} />
        <Skeleton variant="text" width={82} sx={{ fontSize: 12.75 }} />
      </Stack>
      <Skeleton variant="text" width="60%" sx={{ fontSize: 18.5, mt: 2 }} />
      <Skeleton variant="text" width="95%" sx={{ fontSize: 13.25 }} />
      <Skeleton variant="text" width="45%" sx={{ fontSize: 13.5, mt: 2.5 }} />
    </Paper>
  );
}

export default function CategoriesPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  // Backend-driven industry directory — same endpoint that powers the
  // landing tiles, so both surfaces always show identical names + numbers.
  const { industries, loading } = usePublicIndustries();

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return industries;
    return industries.filter(ind => ind.name.toLowerCase().includes(query));
  }, [industries, q]);

  const openIndustry = (name) =>
    navigate(`/jobs?industry=${encodeURIComponent(name)}`);

  return (
    <PublicLayout>
      <PageHero
        eyebrow="Industries"
        title="Browse All Industries"
        subtitle="Every industry hiring on IEvalx right now — exactly as employers list them. Pick one to jump straight into its live, filterable openings."
        back={{ label: "Back to Home", to: "/" }}
      >
        {/* quick industry search */}
        <Paper elevation={0} sx={{
          display: "flex", alignItems: "center", gap: 1.25,
          width: "100%", maxWidth: 520,
          bgcolor: "#fff", borderRadius: "999px",
          boxShadow: "0 18px 50px rgba(2,33,36,0.10)",
          pl: 2.5, pr: 2.5, py: 1.375,
        }}>
          <Search sx={{ color: "#6F7470", fontSize: 20, flexShrink: 0 }} />
          <TextField
            fullWidth variant="standard"
            placeholder="Search industries…"
            value={q}
            onChange={e => setQ(e.target.value)}
            slotProps={{
              input: {
                disableUnderline: true,
                sx: {
                  fontFamily: FONT, fontSize: 14.5, color: C.ink,
                  "& input::placeholder": { color: "#8A8F8B", opacity: 1 },
                  "&::before, &::after": { display: "none" },
                },
              },
            }}
          />
        </Paper>
      </PageHero>

      <Container maxWidth="lg" sx={{ mt: { xs: 4.5, md: 6 }, mb: { xs: 6, md: 9 } }}>
        {/* ── loading skeletons ── */}
        {loading && (
          <Box sx={{
            display: "grid", gap: 2.5,
            gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "minmax(0, 1fr) minmax(0, 1fr)", lg: "repeat(3, minmax(0, 1fr))" },
          }}>
            {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
          </Box>
        )}

        {!loading && filtered.length > 0 && (
          <Box sx={{
            display: "grid", gap: 2.5,
            gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "minmax(0, 1fr) minmax(0, 1fr)", lg: "repeat(3, minmax(0, 1fr))" },
          }}>
            {filtered.map((ind, i) => (
              <FadeUp key={ind.name} delay={(i % 3) * 0.08} sx={{ minWidth: 0 }}>
                <Paper
                  elevation={0}
                  onClick={() => openIndustry(ind.name)}
                  role="button" tabIndex={0}
                  aria-label={`Browse ${ind.name} jobs`}
                  onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openIndustry(ind.name); } }}
                  sx={{
                    position: "relative", overflow: "hidden", cursor: "pointer", outline: "none",
                    bgcolor: "#fff", borderRadius: "18px", p: "24px 24px 22px",
                    border: `1px solid ${C.line}`, height: "100%",
                    display: "flex", flexDirection: "column",
                    boxShadow: "0 12px 30px rgba(2,33,36,0.05)",
                    transition: "transform .3s cubic-bezier(0.22,1,0.36,1), box-shadow .3s ease, border-color .3s ease",
                   
                    "&::before": {
                      content: '""',
                      position: "absolute", zIndex: 1,
                      left: "100%", top: "100%",
                      width: 1300, height: 1300, ml: "-650px", mt: "-650px",
                      borderRadius: "50%", bgcolor: C.sage,
                      transform: "scale(0)",
                      transition: REDUCED ? "none" : "transform .5s cubic-bezier(0.22,1,0.36,1)",
                      pointerEvents: "none",
                    },
                    "&:hover, &:focus-visible": CAN_HOVER ? {
                      transform: "translateY(-5px)",
                      boxShadow: "0 24px 56px rgba(2,33,36,0.13)",
                      borderColor: C.sage,
                      "&::before": { transform: "scale(1)" },
                      "& .cat-icon":  { bgcolor: "rgba(255,255,255,0.2)", color: "#fff" },
                      "& .cat-name, & .cat-arrow-txt": { color: "#fff" },
                      "& .cat-blurb": { color: "rgba(255,255,255,0.85)" },
                      "& .cat-count": { color: "rgba(255,255,255,0.9)" },
                      "& .cat-arrow": { transform: "translateX(4px)", color: "#fff" },
                    } : { "&::before": { transform: "scale(1)" } },
                  }}
                >
                  <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 2 }}>
                    <Box className="cat-icon" sx={{
                      width: 52, height: 52, borderRadius: "14px",
                      bgcolor: C.sageSoft, color: C.sageDark,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: REDUCED ? "none" : "background .4s ease, color .4s ease",
                      "& svg": { fontSize: 25 },
                    }}>
                      {iconFor(ind.name)}
                    </Box>
                    <Stack direction="row" spacing={0.5} className="cat-count" sx={{ alignItems: "center",
                      color: C.sageDark, transition: REDUCED ? "none" : "color .4s ease",
                    }}>
                      <WorkOutlineOutlined sx={{ fontSize: 15 }} />
                      <Typography sx={{ fontFamily: FONT, fontSize: 12.75, fontWeight: 700, color: "inherit" }}>
                        {`${ind.count} opening${ind.count === 1 ? "" : "s"}`}
                      </Typography>
                    </Stack>
                  </Stack>

                  <Typography className="cat-name" sx={{
                    position: "relative", zIndex: 2, wordBreak: "break-word",
                    fontFamily: FONT, fontSize: 18.5, fontWeight: 700, color: C.ink, mt: 2,
                    transition: REDUCED ? "none" : "color .4s ease",
                  }}>
                    {ind.name}
                  </Typography>
                  <Typography className="cat-blurb" sx={{
                    position: "relative", zIndex: 2,
                    fontFamily: FONT, fontSize: 13.25, color: C.muted, mt: 0.875, lineHeight: 1.7,
                    transition: REDUCED ? "none" : "color .4s ease",
                  }}>
                    {blurbFor(ind)}
                  </Typography>

                  <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", position: "relative", zIndex: 2, mt: "auto", pt: 2.5 }}>
                    <Typography className="cat-arrow-txt" sx={{
                      fontFamily: FONT, fontSize: 13.5, fontWeight: 700, color: C.sageDark,
                      transition: REDUCED ? "none" : "color .4s ease",
                    }}>
                      View jobs
                    </Typography>
                    <ArrowForward className="cat-arrow" sx={{
                      fontSize: 15, color: C.sageDark,
                      transition: REDUCED ? "none" : "transform .3s cubic-bezier(0.22,1,0.36,1), color .4s ease",
                    }} />
                  </Stack>
                </Paper>
              </FadeUp>
            ))}
          </Box>
        )}

        {/* ── empty states ── */}
        {!loading && filtered.length === 0 && (
          <FadeUp>
            <Paper elevation={0} sx={{
              bgcolor: "#fff", borderRadius: "20px", border: `1px solid ${C.line}`,
              textAlign: "center", py: 7, px: 3,
            }}>
              <Typography sx={{ fontFamily: FONT, fontSize: 17, fontWeight: 700, color: C.ink }}>
                {industries.length === 0
                  ? "No industries yet"
                  : `No industry matches “${q}”`}
              </Typography>
              <Typography sx={{ fontFamily: FONT, fontSize: 13.5, color: C.muted, mt: 0.75 }}>
                {industries.length === 0
                  ? "Industries appear here automatically as verified employers publish openings."
                  : "Try a broader term, or search jobs directly instead."}
              </Typography>
              {industries.length > 0 && q.trim() && (
                <Typography
                  onClick={() => navigate(`/jobs?q=${encodeURIComponent(q.trim())}`)}
                  sx={{
                    fontFamily: FONT, fontSize: 13.5, fontWeight: 700, color: C.sageDark,
                    mt: 2, cursor: "pointer", "&:hover": { color: C.ink },
                  }}
                >
                  Search “{q}” across all jobs →
                </Typography>
              )}
            </Paper>
          </FadeUp>
        )}
      </Container>
    </PublicLayout>
  );
}