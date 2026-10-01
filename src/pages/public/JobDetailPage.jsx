import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Box, Typography, Stack, Container, Button, Paper, Skeleton } from "@mui/material";
import {
  PlaceOutlined, AccessTime, WorkOutlineOutlined, PaymentsOutlined,
  CalendarMonthOutlined, ArrowBack, ArrowForward, CheckCircleOutlined,
  BookmarkBorder, Bookmark, ContentCopy, Check, SearchOff,
  GroupsOutlined, LaptopChromebookOutlined, CheckCircle,
} from "@mui/icons-material";
import { C, FONT, REDUCED, CAN_HOVER, APPLIED } from "../landing/theme";
import { FadeUp, Eyebrow } from "../landing/primitives";
import PublicLayout from "./PublicLayout";
import { JobCard } from "./BrowseJobsPage";
import { usePublicJobs, usePublicJobDetail } from "@/services/api/publicJobsService";
import useApplyNavigation from "@/hooks/useApplyNavigation";
import useAppliedStatus from "@/hooks/useAppliedStatus";
import NetworkError from "@/components/common/NetworkError";



/* ── small labelled row for the overview card ─────────────────────────── */
function OverviewRow({ icon, label, value }) {
  if (value == null || value === "") return null;
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start", py: 1.375 }}>
      <Box sx={{
        width: 36, height: 36, borderRadius: "10px", bgcolor: C.sageSoft, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center", color: C.sageDark,
      }}>
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontFamily: FONT, fontSize: 11.5, color: C.muted, letterSpacing: ".3px", textTransform: "uppercase", fontWeight: 600 }}>
          {label}
        </Typography>
        <Typography sx={{ fontFamily: FONT, fontSize: 14, color: C.ink, fontWeight: 600, mt: 0.125 }}>
          {value}
        </Typography>
      </Box>
    </Stack>
  );
}

/* ── section heading used across the body ─────────────────────────────── */
function SectionTitle({ children }) {
  return (
    <Typography sx={{
      fontFamily: FONT, fontSize: { xs: 19, md: 21 }, fontWeight: 700, color: C.ink,
      position: "relative", display: "inline-block", mb: 2,
      "&::after": {
        content: '""', position: "absolute", left: 0, bottom: -6,
        width: 34, height: 3, borderRadius: 2, bgcolor: C.sage,
      },
    }}>
      {children}
    </Typography>
  );
}

/* ── sage-check bullet list ───────────────────────────────────────────── */
function CheckList({ items }) {
  return (
    <Stack spacing={1.375}>
      {items.map((it, i) => (
        <Stack key={i} direction="row" spacing={1.25} sx={{ alignItems: "flex-start" }}>
          <CheckCircleOutlined sx={{ fontSize: 18, color: C.sage, mt: "3px", flexShrink: 0 }} />
          <Typography sx={{ fontFamily: FONT, fontSize: 14.5, color: "#3E443F", lineHeight: 1.75 }}>
            {it}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}

/* ── company avatar — real logo when uploaded, initials disc otherwise ── */
function CompanyAvatar({ job, size = 68, radius = "18px", fontSize = 26 }) {
  if (job.logoUrl) {
    return (
      <Box
        component="img"
        src={job.logoUrl}
        alt={`${job.co} logo`}
        onError={(e) => { e.currentTarget.style.display = "none"; }}
        sx={{
          width: size, height: size, borderRadius: radius, flexShrink: 0,
          objectFit: "cover", bgcolor: "#fff", border: `1px solid ${C.line}`,
          boxShadow: "0 14px 32px rgba(2,33,36,0.18)",
        }}
      />
    );
  }
  return (
    <Box sx={{
      width: size, height: size, borderRadius: radius, flexShrink: 0,
      bgcolor: job.color, color: "#fff",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: FONT, fontSize, fontWeight: 700,
      boxShadow: "0 14px 32px rgba(2,33,36,0.18)",
    }}>
      {job.initials}
    </Box>
  );
}

/* ── full-page loading skeleton ───────────────────────────────────────── */
function DetailSkeleton() {
  return (
    <>
      <Box sx={{ bgcolor: C.hero, pt: { xs: 13, md: 15 }, pb: { xs: 4.5, md: 6 } }}>
        <Container maxWidth="lg">
          <Skeleton variant="rounded" width={150} height={36} sx={{ borderRadius: "999px", mb: 3 }} />
          <Stack direction="row" spacing={2.25} sx={{ alignItems: "center" }}>
            <Skeleton variant="rounded" width={68} height={68} sx={{ borderRadius: "18px" }} />
            <Box>
              <Skeleton variant="text" width={320} sx={{ fontSize: 34 }} />
              <Skeleton variant="text" width={200} sx={{ fontSize: 15 }} />
            </Box>
          </Stack>
          <Stack direction="row" spacing={1} sx={{ mt: 3 }}>
            {[0, 1, 2, 3].map(i => (
              <Skeleton key={i} variant="rounded" width={110} height={32} sx={{ borderRadius: "999px" }} />
            ))}
          </Stack>
        </Container>
      </Box>
      <Container maxWidth="lg" sx={{ mt: { xs: 4, md: 6 }, mb: 8 }}>
        <Box sx={{ display: "grid", gap: 4.5, gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(0, 1fr) 340px" } }}>
          <Box>
            <Skeleton variant="text" width={180} sx={{ fontSize: 21 }} />
            {[0, 1, 2, 3, 4].map(i => <Skeleton key={i} variant="text" sx={{ fontSize: 14.5 }} />)}
            <Skeleton variant="text" width={220} sx={{ fontSize: 21, mt: 4 }} />
            {[0, 1, 2].map(i => <Skeleton key={i} variant="text" sx={{ fontSize: 14.5 }} />)}
          </Box>
          <Skeleton variant="rounded" height={420} sx={{ borderRadius: "20px" }} />
        </Box>
      </Container>
    </>
  );
}

/* ── description text → paragraphs (splits on blank lines / newlines) ── */
const toParagraphs = (text) => {
  if (!text) return [];
  return String(text)
    .split(/\n{2,}|\r\n{2,}/)
    .flatMap(block => block.split(/\n|\r\n/))
    .map(p => p.trim())
    .filter(Boolean);
};

/* Default perks shown when the employer added no benefit rows — labelled as
   platform-level, so the page stays honest about what came from the post. */
const DEFAULT_PERKS = [
  "Verified employer — every applicant hears back",
  "One-click apply with your IEvalx profile",
  "Skill-first screening via verified assessments",
  "Transparent interview pipeline tracking",
];

export default function JobDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { goToApply } = useApplyNavigation();
  const { appliedLabelFor } = useAppliedStatus();
  const [saved, setSaved]       = useState(false);
  const [copied, setCopied]     = useState(false);
  const [relSaved, setRelSaved] = useState([]);

  /* live detail + shared cached list (for related jobs) */
  const { job, loading, notFound, error, reload } = usePublicJobDetail(id);
  const { jobs: allJobs } = usePublicJobs();
  const appliedLabel = job ? appliedLabelFor(job.id) : null;

  const related = useMemo(() => {
    if (!job || !allJobs) return [];
    return allJobs.filter(j => j.industryKey === job.industryKey && String(j.id) !== String(job.id)).slice(0, 3);
  }, [job, allJobs]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      /* clipboard unavailable (http / permissions) — select-free fallback */
      const ta = document.createElement("textarea");
      ta.value = window.location.href;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const pillBtn = (props) => ({
    fontFamily: FONT, textTransform: "none", borderRadius: "999px",
    minWidth: 0, lineHeight: 1, fontWeight: 600, flexShrink: 0,
    transition: "all .3s cubic-bezier(0.22,1,0.36,1)",
    ...props,
  });

  /* ── loading ── */
  if (loading) {
    return <PublicLayout><DetailSkeleton /></PublicLayout>;
  }


  if (error && !notFound) {
    return (
      <PublicLayout>
        <Container maxWidth="sm" sx={{ pt: { xs: 12, md: 14 }, pb: 8 }}>
          <NetworkError onRetry={reload} />
        </Container>
      </PublicLayout>
    );
  }

  /* ── not found — the job was removed/unpublished (server DID respond) ── */
  if (notFound || !job) {
    return (
      <PublicLayout>
        <Container maxWidth="sm" sx={{ pt: { xs: 16, md: 20 }, pb: 10, textAlign: "center" }}>
          <Box sx={{
            width: 68, height: 68, borderRadius: "50%", bgcolor: C.sageSoft,
            display: "flex", alignItems: "center", justifyContent: "center", mx: "auto",
          }}>
            <SearchOff sx={{ fontSize: 28, color: C.sage }} />
          </Box>
          <Typography sx={{ fontFamily: FONT, fontSize: 22, fontWeight: 700, color: C.ink, mt: 2.5 }}>
            This opening is no longer live
          </Typography>
          <Typography sx={{ fontFamily: FONT, fontSize: 14, color: C.muted, mt: 1, lineHeight: 1.75 }}>
            It may have been filled, closed by the employer, or unpublished. Plenty more verified roles are waiting.
          </Typography>
          <Button
            onClick={() => navigate("/jobs")}
            endIcon={<ArrowForward sx={{ fontSize: "16px !important" }} />}
            sx={pillBtn({
              mt: 3, px: 3, height: 46, fontSize: 14, bgcolor: C.sage, color: "#fff",
              "&:hover": { bgcolor: C.sageDark },
            })}
          >
            Browse all jobs
          </Button>
        </Container>
      </PublicLayout>
    );
  }

  const aboutParas = toParagraphs(job.desc);
  const perks      = job.perks && job.perks.length > 0 ? job.perks : DEFAULT_PERKS;
  const usingDefaultPerks = !(job.perks && job.perks.length > 0);

  /* "What we're looking for" — composed from the job's REAL fields */
  const requirements = [
    job.expDisplay ? `${job.expDisplay} of relevant experience.` : null,
    job.skills.length ? `Strong working command of ${job.skills.join(", ")}.` : null,
    job.education ? `Education: ${job.education}.` : null,
    job.languages && job.languages.length ? `Languages: ${job.languages.join(", ")}.` : null,
    job.additional ? job.additional : null,
  ].filter(Boolean);

  return (
    <PublicLayout>
      {/* ══ hero band — company + title + meta + actions ══ */}
      <Box sx={{
        bgcolor: C.hero, position: "relative", overflow: "hidden",
        pt: { xs: 13, md: 15 }, pb: { xs: 4.5, md: 6 },
        clipPath: { md: "polygon(0 0, 100% 0, 100% 94%, 0 100%)" },
      }}>
        <Box sx={{ position: "absolute", inset: 0, pointerEvents: "none", display: { xs: "none", md: "block" } }}>
          <Box sx={{ position: "absolute", inset: 0, bgcolor: "rgba(126,158,126,0.28)", clipPath: "polygon(72% 0, 100% 0, 100% 100%, 55% 100%)" }} />
          <Box sx={{ position: "absolute", inset: 0, bgcolor: "rgba(127,158,126,0.5)", clipPath: "polygon(82% 0, 100% 0, 100% 68%, 66% 100%, 62% 100%)" }} />
        </Box>

        <Container maxWidth="lg" sx={{ position: "relative" }}>
          <FadeUp>
            {/* back to results */}
            <Box
              onClick={() => navigate("/jobs")}
              role="link" tabIndex={0} aria-label="Back to all jobs"
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate("/jobs"); } }}
              sx={{
                display: "inline-flex", alignItems: "center", gap: 0.75,
                mb: 3, px: 1.75, height: 36, borderRadius: "999px",
                border: "1.5px solid rgba(31,31,31,0.22)", cursor: "pointer",
                outline: "none", userSelect: "none", bgcolor: "rgba(255,255,255,0.45)",
                fontFamily: FONT, fontSize: 13, fontWeight: 600, color: C.ink,
                transition: REDUCED ? "none" : "all .25s ease",
                "& svg": { transition: REDUCED ? "none" : "transform .25s cubic-bezier(0.22,1,0.36,1)" },
                "&:hover": CAN_HOVER ? { bgcolor: C.ink, borderColor: C.ink, color: "#fff", "& svg": { transform: "translateX(-3px)" } } : {},
                "&:focus-visible": { borderColor: C.ink },
              }}
            >
              <ArrowBack sx={{ fontSize: 15 }} />
              Back to all jobs
            </Box>

            <Stack direction={{ xs: "column", md: "row" }} spacing={{ xs: 2.5, md: 3 }} sx={{ justifyContent: "space-between", alignItems: { xs: "flex-start", md: "center" } }}>
              {/* identity */}
              <Stack direction="row" spacing={2.25} sx={{ alignItems: "center", minWidth: 0 }}>
                <CompanyAvatar job={job} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography component="h1" sx={{
                    fontFamily: FONT, fontWeight: 800, color: C.ink,
                    fontSize: { xs: 24, sm: 30, md: 36 }, lineHeight: 1.15, letterSpacing: "-0.5px",
                  }}>
                    {job.title}
                  </Typography>
                  <Typography sx={{ fontFamily: FONT, fontSize: { xs: 13.5, md: 15 }, color: "#4A524C", mt: 0.5, fontWeight: 500 }}>
                    {job.co} · {job.industry}
                  </Typography>
                </Box>
              </Stack>

              {/* actions */}
              <Stack direction="row" spacing={1.25} sx={{ flexShrink: 0 }}>
                <Button
                  onClick={() => setSaved(s => !s)}
                  startIcon={saved ? <Bookmark sx={{ fontSize: "18px !important" }} /> : <BookmarkBorder sx={{ fontSize: "18px !important" }} />}
                  sx={pillBtn({
                    px: 2.25, height: 46, fontSize: 14,
                    bgcolor: saved ? C.ink : "rgba(255,255,255,0.65)",
                    color: saved ? "#fff" : C.ink,
                    border: `1.5px solid ${saved ? C.ink : "rgba(31,31,31,0.22)"}`,
                    "&:hover": { bgcolor: C.ink, borderColor: C.ink, color: "#fff" },
                  })}
                >
                  {saved ? "Saved" : "Save"}
                </Button>
                {appliedLabel ? (
                  /* Already applied — status pill replaces the hero CTA,
                     matching the dashboard JobDetails treatment. */
                  <Box sx={{
                    display: "inline-flex", alignItems: "center", gap: 0.75,
                    px: 3, height: 46, borderRadius: "999px",
                    bgcolor: APPLIED.soft, color: APPLIED.text,
                    border: `1.5px solid ${APPLIED.bdr}`,
                    fontFamily: FONT, fontSize: 14, fontWeight: 700,
                    whiteSpace: "nowrap",
                  }}>
                    <CheckCircle sx={{ fontSize: 18 }} />{appliedLabel}
                  </Box>
                ) : (
                  <Button
                    onClick={() => goToApply(job.id)}
                    sx={pillBtn({
                      px: 3.25, height: 46, fontSize: 14.5, bgcolor: C.sage, color: "#fff",
                      boxShadow: "0 10px 24px rgba(127,158,126,0.35)",
                      "&:hover": { bgcolor: C.ink, transform: CAN_HOVER ? "translateY(-2px)" : "none" },
                    })}
                  >
                    Apply Now
                  </Button>
                )}
              </Stack>
            </Stack>

            {/* meta chip strip — every value is the job's real data */}
            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", mt: 3, rowGap: 1 }}>
              {[
                { ic: <PlaceOutlined sx={{ fontSize: 15 }} />,         txt: job.loc },
                { ic: <WorkOutlineOutlined sx={{ fontSize: 15 }} />,   txt: job.expDisplay },
                { ic: <AccessTime sx={{ fontSize: 15 }} />,            txt: job.type },
                { ic: <PaymentsOutlined sx={{ fontSize: 15 }} />,      txt: job.sal },
                { ic: <CalendarMonthOutlined sx={{ fontSize: 15 }} />, txt: job.daysAgo === 0 ? "Posted today" : `Posted ${job.daysAgo}d ago` },
                ...(job.workMode ? [{ ic: <LaptopChromebookOutlined sx={{ fontSize: 15 }} />, txt: job.workMode }] : []),
                ...(job.applicants > 0 ? [{ ic: <GroupsOutlined sx={{ fontSize: 15 }} />, txt: `${job.applicants} applicant${job.applicants === 1 ? "" : "s"}` }] : []),
              ].filter(m => m.txt).map((m, i) => (
                <Stack key={i} direction="row" spacing={0.625} sx={{ alignItems: "center",
                  bgcolor: "rgba(255,255,255,0.7)", border: "1px solid rgba(31,31,31,0.1)",
                  borderRadius: "999px", px: 1.5, height: 32, color: C.ink,
                }}>
                  {m.ic}
                  <Typography sx={{ fontFamily: FONT, fontSize: 12.75, fontWeight: 600 }}>{m.txt}</Typography>
                </Stack>
              ))}
            </Stack>
          </FadeUp>
        </Container>
      </Box>

      {/* ══ body: description + sticky sidebar ══ */}
      <Container maxWidth="lg" sx={{ mt: { xs: 4, md: 6 }, mb: { xs: 6, md: 9 } }}>
        <Box sx={{
          display: "grid", gap: { xs: 3.5, md: 4.5 }, alignItems: "start",
          gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(0, 1fr) 340px" },
        }}>
          {/* ── main column ── */}
          <Box sx={{ minWidth: 0 }}>
            {aboutParas.length > 0 && (
              <FadeUp>
                <SectionTitle>About the role</SectionTitle>
                <Stack spacing={1.75}>
                  {aboutParas.map((p, i) => (
                    <Typography key={i} sx={{ fontFamily: FONT, fontSize: 14.75, color: "#3E443F", lineHeight: 1.85 }}>
                      {p}
                    </Typography>
                  ))}
                </Stack>
              </FadeUp>
            )}

            {job.responsibilities && job.responsibilities.length > 0 && (
              <FadeUp sx={{ mt: aboutParas.length > 0 ? 5 : 0 }}>
                <SectionTitle>What you'll do</SectionTitle>
                <CheckList items={job.responsibilities} />
              </FadeUp>
            )}

            {requirements.length > 0 && (
              <FadeUp sx={{ mt: 5 }}>
                <SectionTitle>What we're looking for</SectionTitle>
                <CheckList items={requirements} />
              </FadeUp>
            )}

            <FadeUp sx={{ mt: 5 }}>
              <SectionTitle>{usingDefaultPerks ? "Why apply on IEvalx" : "Perks & benefits"}</SectionTitle>
              <Box sx={{
                display: "grid", gap: 1.5,
                gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))" },
              }}>
                {perks.map((p, i) => (
                  <Stack key={i} direction="row" spacing={1.25} sx={{ alignItems: "center",
                    bgcolor: "#fff", border: `1px solid ${C.line}`, borderRadius: "14px",
                    px: 2, py: 1.5,
                    transition: "all .25s ease",
                    "&:hover": CAN_HOVER ? { borderColor: "rgba(127,158,126,0.5)", transform: "translateY(-2px)", boxShadow: "0 12px 26px rgba(2,33,36,0.07)" } : {},
                  }}>
                    <CheckCircleOutlined sx={{ fontSize: 18, color: C.sage, flexShrink: 0 }} />
                    <Typography sx={{ fontFamily: FONT, fontSize: 13.5, color: C.ink, fontWeight: 500 }}>{p}</Typography>
                  </Stack>
                ))}
              </Box>
            </FadeUp>

            {/* pine CTA band — same language as the blog reader */}
            <FadeUp sx={{ mt: 6 }}>
              <Box sx={{
                borderRadius: "22px", overflow: "hidden", position: "relative",
                background: `linear-gradient(120deg, ${C.pine} 0%, ${C.pine2} 100%)`,
                px: { xs: 3, md: 5 }, py: { xs: 4, md: 5 },
              }}>
                <Typography sx={{ fontFamily: FONT, fontSize: { xs: 21, md: 26 }, fontWeight: 700, color: "#fff", lineHeight: 1.3 }}>
                  Ready to apply as a {job.title}?
                </Typography>
                <Typography sx={{ fontFamily: FONT, fontSize: 14, color: C.mutedOnDark, mt: 1, maxWidth: 460, lineHeight: 1.75 }}>
                  Create your IEvalx profile, verify your skills once, and apply to {job.co} — and every other verified opening — in a single click.
                </Typography>
                {appliedLabel ? (
                  <Box sx={{
                    display: "inline-flex", alignItems: "center", gap: 0.75,
                    mt: 3, px: 3, height: 48, borderRadius: "999px",
                    bgcolor: "rgba(255,255,255,0.14)", color: "#fff",
                    border: "1.5px solid rgba(255,255,255,0.35)",
                    fontFamily: FONT, fontSize: 14.5, fontWeight: 700,
                    whiteSpace: "nowrap",
                  }}>
                    <CheckCircle sx={{ fontSize: 18 }} />{appliedLabel}
                  </Box>
                ) : (
                  <Button
                    onClick={() => goToApply(job.id)}
                    endIcon={<ArrowForward sx={{ fontSize: "16px !important" }} />}
                    sx={pillBtn({
                      mt: 3, px: 3, height: 48, fontSize: 14.5, bgcolor: C.sage, color: "#fff",
                      "&:hover": { bgcolor: "#fff", color: C.pine },
                    })}
                  >
                    Apply with IEvalx
                  </Button>
                )}
              </Box>
            </FadeUp>
          </Box>

          {/* ── sidebar — sticky overview ── */}
          <Box sx={{ position: { md: "sticky" }, top: { md: 92 }, minWidth: 0 }}>
            <FadeUp>
              <Paper elevation={0} sx={{
                bgcolor: "#fff", borderRadius: "20px", border: `1px solid ${C.line}`,
                boxShadow: "0 14px 34px rgba(2,33,36,0.06)", p: 2.75,
              }}>
                <Typography sx={{ fontFamily: FONT, fontSize: 16, fontWeight: 700, color: C.ink, mb: 0.75 }}>
                  Job overview
                </Typography>
                <OverviewRow icon={<WorkOutlineOutlined sx={{ fontSize: 17 }} />}   label="Experience" value={job.expDisplay} />
                <OverviewRow icon={<AccessTime sx={{ fontSize: 17 }} />}            label="Job type"   value={job.type} />
                <OverviewRow icon={<PlaceOutlined sx={{ fontSize: 17 }} />}         label="Location"   value={job.loc} />
                <OverviewRow icon={<PaymentsOutlined sx={{ fontSize: 17 }} />}      label="Salary"     value={job.sal} />
                <OverviewRow icon={<CalendarMonthOutlined sx={{ fontSize: 17 }} />} label="Posted"     value={job.daysAgo === 0 ? "Today" : `${job.daysAgo} days ago`} />
                {job.openings != null && (
                  <OverviewRow icon={<GroupsOutlined sx={{ fontSize: 17 }} />} label="Openings" value={String(job.openings)} />
                )}
                {job.daysLeft != null && (
                  <OverviewRow icon={<CalendarMonthOutlined sx={{ fontSize: 17 }} />} label="Apply within"
                    value={job.daysLeft === 0 ? "Last day today" : `${job.daysLeft} day${job.daysLeft === 1 ? "" : "s"} left`} />
                )}

                {/* skills */}
                {job.skills.length > 0 && (
                  <Box sx={{ mt: 1.75, pt: 2, borderTop: `1px solid ${C.line}` }}>
                    <Typography sx={{ fontFamily: FONT, fontSize: 12, color: C.muted, fontWeight: 600, letterSpacing: ".3px", textTransform: "uppercase" }}>
                      Key skills
                    </Typography>
                    <Stack direction="row" spacing={0.75} sx={{ flexWrap: "wrap", mt: 1.25, rowGap: 0.75 }}>
                      {job.skills.map(s => (
                        <Box key={s} sx={{
                          bgcolor: C.sageSoft, color: C.sageDark, borderRadius: "999px",
                          px: 1.5, py: 0.5, fontFamily: FONT, fontSize: 12, fontWeight: 600,
                        }}>
                          {s}
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                )}

                {/* share */}
                <Button
                  fullWidth
                  onClick={copyLink}
                  startIcon={copied
                    ? <Check sx={{ fontSize: "17px !important" }} />
                    : <ContentCopy sx={{ fontSize: "16px !important" }} />}
                  sx={pillBtn({
                    mt: 2.5, height: 44, fontSize: 13.5,
                    bgcolor: copied ? C.sage : "transparent",
                    color: copied ? "#fff" : C.ink,
                    border: `1.5px solid ${copied ? C.sage : "rgba(31,31,31,0.2)"}`,
                    "&:hover": { borderColor: C.ink, bgcolor: copied ? C.sage : "rgba(31,31,31,0.04)" },
                  })}
                >
                  {copied ? "Link copied" : "Copy job link"}
                </Button>
              </Paper>

              {/* company mini card */}
              <Paper elevation={0} sx={{
                mt: 2.5, bgcolor: "#fff", borderRadius: "20px", border: `1px solid ${C.line}`,
                boxShadow: "0 14px 34px rgba(2,33,36,0.06)", p: 2.75,
              }}>
                <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                  <CompanyAvatar job={job} size={44} radius="12px" fontSize={17} />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontFamily: FONT, fontSize: 15, fontWeight: 700, color: C.ink }}>
                      {job.co}
                    </Typography>
                    <Typography sx={{ fontFamily: FONT, fontSize: 12, color: C.muted }}>
                      {job.industry} · {job.loc}
                    </Typography>
                  </Box>
                </Stack>
                <Typography sx={{ fontFamily: FONT, fontSize: 13, color: C.muted, mt: 1.75, lineHeight: 1.7 }}>
                  {job.co} is a verified employer on IEvalx. All openings are screened, and every applicant hears back.
                </Typography>
                <Button
                  fullWidth
                  onClick={() => navigate(`/jobs?q=${encodeURIComponent(job.co)}`)}
                  sx={pillBtn({
                    mt: 2, height: 42, fontSize: 13.5,
                    bgcolor: C.sageSoft, color: C.sageDark,
                    "&:hover": { bgcolor: C.sage, color: "#fff" },
                  })}
                >
                  More jobs at {job.co}
                </Button>
              </Paper>
            </FadeUp>
          </Box>
        </Box>

        {/* ══ related jobs — landing corner-fold cards, same live category ══ */}
        {related.length > 0 && (
          <Box sx={{ mt: { xs: 7, md: 10 } }}>
            <FadeUp>
              <Eyebrow align="left">Similar openings</Eyebrow>
              <Typography sx={{ fontFamily: FONT, fontSize: { xs: 24, md: 30 }, fontWeight: 700, color: C.ink, mt: 1 }}>
                More in {job.industry}
              </Typography>
            </FadeUp>
            <Box sx={{
              display: "grid", gap: 2.5, mt: 3.5, alignItems: "stretch",
              gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))", md: "repeat(3, minmax(0, 1fr))" },
            }}>
              {related.map((j, i) => (
                <FadeUp key={j.id} delay={i * 0.1} sx={{ height: "100%", minWidth: 0 }}>
                  <JobCard
                    j={j}
                    saved={relSaved.includes(j.id)}
                    onSave={(rid) => setRelSaved(p => p.includes(rid) ? p.filter(x => x !== rid) : [...p, rid])}
                    navigate={navigate}
                  />
                </FadeUp>
              ))}
            </Box>
          </Box>
        )}
      </Container>
    </PublicLayout>
  );
}