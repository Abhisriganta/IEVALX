import { Box, Typography, Button, Stack, Paper, Container, Skeleton } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { PlaceOutlined, AccessTime, ArrowForward, WorkOutlineOutlined, CheckCircle } from "@mui/icons-material";
import { C, FONT, REDUCED, CAN_HOVER, APPLIED } from "./theme";
import { FadeUp, Eyebrow, SageButton } from "./primitives";
import { usePublicJobs } from "@/services/api/publicJobsService";
import useApplyNavigation from "@/hooks/useApplyNavigation";
import useAppliedStatus from "@/hooks/useAppliedStatus";
import NetworkError from "@/components/common/NetworkError";

/* ══════════════════════════════════════════════════════════════════════════
   FEATURE JOB OFFERS — landing section.
   CHANGE: the six cards are now LIVE — the newest six PUBLISHED + APPROVED
   jobs from the database (the /js/jobs/list response is already ordered by
   created_at DESC). Real company logos render when the company has uploaded
   one; otherwise the deterministic initials avatar is shown. Cards navigate
   straight to /jobs/:id (real ids — the old title-matching lookup against
   mock ALL_JOBS is gone). Loading skeletons + an honest empty state cover
   the fetch window and a zero-jobs database.
   ══════════════════════════════════════════════════════════════════════════ */

const FEATURED_COUNT = 6;

/* company avatar — logo when available, initials disc otherwise */
function CompanyAvatar({ j }) {
  if (j.logoUrl) {
    return (
      <Box
        component="img"
        src={j.logoUrl}
        alt={`${j.co} logo`}
        onError={(e) => { e.currentTarget.style.display = "none"; }}
        sx={{
          width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
          objectFit: "cover", bgcolor: "#fff", border: `1px solid ${C.line}`,
        }}
      />
    );
  }
  return (
    <Box sx={{
      width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
      bgcolor: j.color, color: "#fff",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: FONT, fontSize: 15, fontWeight: 700,
    }}>
      {j.initials}
    </Box>
  );
}

/* skeleton card shown while the live list loads */
function CardSkeleton() {
  return (
    <Paper elevation={0} sx={{
      borderRadius: "16px", bgcolor: "#fff", p: "18px 20px 20px",
      boxShadow: "0 12px 28px rgba(2,33,36,0.08)", height: "100%",
    }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
        <Skeleton variant="circular" width={40} height={40} />
        <Box sx={{ flex: 1 }}>
          <Skeleton variant="text" width="70%" sx={{ fontSize: 16 }} />
          <Skeleton variant="text" width="45%" sx={{ fontSize: 12 }} />
        </Box>
      </Stack>
      <Stack direction="row" spacing={2} sx={{ mt: 1.75 }}>
        <Skeleton variant="text" width={80} sx={{ fontSize: 12 }} />
        <Skeleton variant="text" width={70} sx={{ fontSize: 12 }} />
      </Stack>
      <Stack direction="row" sx={{ justifyContent: "space-between", mt: 2.25 }}>
        <Skeleton variant="text" width={90} sx={{ fontSize: 13 }} />
        <Skeleton variant="rounded" width={92} height={34} sx={{ borderRadius: "999px" }} />
      </Stack>
    </Paper>
  );
}

export default function FeatureJobs({ jobsRef }) {
  const navigate = useNavigate();
  const { jobs, loading, error, reload } = usePublicJobs();
  /* Auth-aware routing: a logged-in jobseeker opens the DASHBOARD job
     details (/jobseeker/job/:id) — apply-capable, the exact job loaded;
     guests and other roles keep the public detail page. */
  const { goToJob, goToApply } = useApplyNavigation();

  /* ── Applied status on the landing cards (logged-in jobseekers) ──────
     Shared hook: same ledger FindJobs/JobCard read (getAppliedLabel), plus
     one session-deduped background server sync so a jobseeker landing here
     on a fresh browser still sees correct badges. Guests: no-op. */
  const { appliedLabelFor } = useAppliedStatus();

  const featured = (jobs || []).slice(0, FEATURED_COUNT);
  const openJob = (j) => goToJob(j.id);

  return (
    <>
      {/* ══ FEATURE JOB OFFERS ══ */}
      <Container maxWidth="lg" ref={jobsRef} sx={{ mt: { xs: 8, md: 12 }, scrollMarginTop: 90 }}>
        <FadeUp>
          <Eyebrow>Job Post</Eyebrow>
          <Typography sx={{
            fontFamily: FONT, fontSize: { xs: 30, md: 38 }, fontWeight: 700,
            color: C.ink, textAlign: "center", mt: 1,
          }}>
            Feature Job Offers
          </Typography>
        </FadeUp>

        {/* ── loading skeletons ── */}
        {loading && (
          <Box sx={{
            display: "grid", gap: 2.5, mt: 5,
            gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))", md: "repeat(3, minmax(0, 1fr))" },
          }}>
            {Array.from({ length: FEATURED_COUNT }).map((_, i) => <CardSkeleton key={i} />)}
          </Box>
        )}

        {/* ── fetch failed — app-themed Connection-lost screen (previously
               this fell through to the "New openings are on the way" empty
               state, which was dishonest when the server was unreachable) ── */}
        {!loading && error && (
          <FadeUp sx={{ mt: 5 }}>
            <NetworkError
              variant="embedded"
              onRetry={() => reload().catch(() => {})}
            />
          </FadeUp>
        )}

        {/* ── empty state — fetch SUCCEEDED but no published jobs yet ── */}
        {!loading && !error && featured.length === 0 && (
          <FadeUp sx={{ mt: 5 }}>
            <Paper elevation={0} sx={{
              bgcolor: "#fff", borderRadius: "20px", border: `1px solid ${C.line}`,
              textAlign: "center", py: 6, px: 3,
            }}>
              <Box sx={{
                width: 64, height: 64, borderRadius: "50%", bgcolor: C.sageSoft,
                display: "flex", alignItems: "center", justifyContent: "center", mx: "auto",
              }}>
                <WorkOutlineOutlined sx={{ fontSize: 26, color: C.sage }} />
              </Box>
              <Typography sx={{ fontFamily: FONT, fontSize: 17, fontWeight: 700, color: C.ink, mt: 2 }}>
                New openings are on the way
              </Typography>
              <Typography sx={{ fontFamily: FONT, fontSize: 13.5, color: C.muted, mt: 0.75, maxWidth: 380, mx: "auto", lineHeight: 1.7 }}>
                Verified employers are onboarding right now. Create your profile so you're first in line when roles go live.
              </Typography>
            </Paper>
          </FadeUp>
        )}

        {/* ── live cards ── */}
        {!loading && !error && featured.length > 0 && (
          <Box sx={{
            display: "grid", gap: 2.5, mt: 5, alignItems: "stretch",
            gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))", md: "repeat(3, minmax(0, 1fr))" },
          }}>
            {featured.map((j, i) => {
              const appliedLabel = appliedLabelFor(j.id);
              return (
              <FadeUp key={j.id} delay={(i % 3) * 0.1} sx={{ height: "100%", minWidth: 0 }}>
                {/* Corner-fold card: clean white card whose top-right corner is a
                    real folded dog-ear in sage — the fold IS the bookmark/save
                    action. Fold = two layers: the turned-back sage triangle and a
                    soft shadow wedge under the crease. */}
                <Paper
                  elevation={0}
                  onClick={() => openJob(j)}
                  role="link" tabIndex={0} aria-label={`View ${j.title} at ${j.co}`}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); openJob(j); } }}
                  sx={{
                  position: "relative", cursor: "pointer", outline: "none",
                  "&:focus-visible": { boxShadow: `0 0 0 2px ${C.sage}, 0 12px 28px rgba(2,33,36,0.08)` },
                  borderRadius: "16px", bgcolor: "#fff", overflow: "hidden",
                  boxShadow: "0 12px 28px rgba(2,33,36,0.08)",
                  p: "18px 20px 20px", height: "100%",
                  display: "flex", flexDirection: "column",
                  transition: "all .3s ease",
                  "&:hover": CAN_HOVER ? {
                    transform: "translateY(-6px)",
                    boxShadow: "0 24px 56px rgba(2,33,36,0.13)",
                  } : {},
                  "&:hover .dogear": { borderTopWidth: "46px", borderLeftWidth: "46px" },
                  "&:hover .dogear-shadow": { width: 46, height: 46 },
                }}>
                  {/* dog-ear fold — doubles as the save action */}
                  <Box
                    role="button"
                    tabIndex={0}
                    aria-label={`Save ${j.title}`}
                    onClick={e => e.stopPropagation()}
                    onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); } }}
                    sx={{ position: "absolute", top: 0, right: 0, cursor: "pointer", zIndex: 2, outline: "none" }}
                  >
                    <Box className="dogear" sx={{
                      width: 0, height: 0,
                      borderLeft: "40px solid #EDF3EC",
                      borderTop: `40px solid ${C.sage}`,
                      borderRadius: "0 16px 0 0",
                      transition: REDUCED ? "none" : "border-width .25s ease",
                    }} />
                    <Box className="dogear-shadow" sx={{
                      position: "absolute", top: 0, right: 0, width: 40, height: 40,
                      background: "linear-gradient(225deg, transparent 50%, rgba(2,33,36,0.16) 50%, transparent 64%)",
                      pointerEvents: "none",
                      transition: REDUCED ? "none" : "all .25s ease",
                    }} />
                  </Box>

                  {/* header row: avatar + title + company/date */}
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", pr: 4.5 }}>
                    <CompanyAvatar j={j} />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontFamily: FONT, fontSize: 16.5, fontWeight: 700, color: C.ink, lineHeight: 1.25 }}>
                        {j.title}
                      </Typography>
                      <Typography sx={{ fontFamily: FONT, fontSize: 12, color: C.muted, mt: 0.375 }}>
                        {j.co}{j.date ? ` · ${j.date}` : ""}
                      </Typography>
                    </Box>
                  </Stack>

                  {/* meta row */}
                  <Stack direction="row" spacing={2} sx={{ mt: 1.75 }}>
                    <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                      <PlaceOutlined sx={{ fontSize: 14, color: C.muted }} />
                      <Typography sx={{ fontFamily: FONT, fontSize: 12.5, color: C.muted }}>{j.loc}</Typography>
                    </Stack>
                    <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                      <AccessTime sx={{ fontSize: 14, color: C.muted }} />
                      <Typography sx={{ fontFamily: FONT, fontSize: 12.5, color: C.muted }}>{j.type}</Typography>
                    </Stack>
                  </Stack>

                  {/* footer: salary + Apply pinned to the bottom */}
                  <Stack direction="row"
                    sx={{ justifyContent: "space-between", alignItems: "center", mt: "auto", pt: 2.25, width: "100%" }}>
                    <Typography sx={{ fontFamily: FONT, fontSize: 13, color: C.sageDark, fontWeight: 700 }}>
                      {j.sal}
                    </Typography>
                    {appliedLabel ? (
                      /* Already applied — status chip replaces the CTA, same
                         treatment as FindJobs/JobCard. Not a button: clicking
                         it bubbles to the card click and opens the job. */
                      <Box sx={{
                        display: "inline-flex", alignItems: "center", gap: 0.5,
                        flexShrink: 0, ml: "auto",
                        bgcolor: APPLIED.soft, color: APPLIED.text,
                        border: `1px solid ${APPLIED.bdr}`,
                        borderRadius: "999px", px: 1.6, height: 34,
                        fontFamily: FONT, fontSize: 12, fontWeight: 700,
                        whiteSpace: "nowrap",
                      }}>
                        <CheckCircle sx={{ fontSize: 15 }} />{appliedLabel}
                      </Box>
                    ) : (
                      <Button onClick={e => { e.stopPropagation(); goToApply(j.id); }} sx={{
                        fontFamily: FONT, textTransform: "none", fontSize: 12.5, fontWeight: 500,
                        bgcolor: C.sageSoft, color: C.sageDark, borderRadius: "999px", px: 2, py: 0,
                        height: 34, minWidth: 0, lineHeight: 1, flexShrink: 0, ml: "auto",
                        "&:hover": { bgcolor: C.sage, color: "#fff" },
                      }}>
                        Apply Now
                      </Button>
                    )}
                  </Stack>
                </Paper>
              </FadeUp>
              );
            })}
          </Box>
        )}

        <FadeUp sx={{ textAlign: "center", mt: 4.5 }}>
          <SageButton onClick={() => navigate("/jobs")} startIcon={<ArrowForward sx={{ fontSize: 16 }} />}>
            See More Jobs
          </SageButton>
        </FadeUp>
      </Container>
    </>
  );
}