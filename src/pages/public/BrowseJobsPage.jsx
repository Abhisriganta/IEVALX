import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Box, Typography, Stack, Container, Button, Paper, Checkbox,
  Select, MenuItem, Drawer, Chip, Collapse, Skeleton,
} from "@mui/material";
import {
  PlaceOutlined, AccessTime, Close, ArrowForward,
  TuneOutlined, KeyboardArrowDown, SearchOff, CheckCircle,
} from "@mui/icons-material";
import { C, FONT, REDUCED, CAN_HOVER, APPLIED } from "../landing/theme";
import { FadeUp } from "../landing/primitives";
import JobSearchBar from "../landing/JobSearchBar";
import PublicLayout, { PageHero } from "./PublicLayout";
import { EXPERIENCE_OPTIONS } from "../landing/data";
import {
  usePublicJobs, uniqueIndustries, industryKeyOf,
  uniqueLocations, uniqueJobTypes, popularSearches, SALARY_BANDS,
} from "@/services/api/publicJobsService";
import useApplyNavigation from "@/hooks/useApplyNavigation";
import useAppliedStatus from "@/hooks/useAppliedStatus";
import NetworkError from "@/components/common/NetworkError";


function FilterGroup({ title, options, selected, onToggle }) {
  const [open, setOpen] = useState(true);
  if (!options || options.length === 0) return null;
  return (
    <Box sx={{ py: 1.25, borderBottom: `1px solid ${C.line}` }}>
      {/* dropdown header — title + per-group count on the left, chevron right */}
      <Stack
        direction="row"
        onClick={() => setOpen(o => !o)}
        role="button" tabIndex={0} aria-expanded={open} aria-label={`${title} filters`}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(o => !o); } }}
        sx={{ justifyContent: "space-between", alignItems: "center",
          cursor: "pointer", outline: "none", userSelect: "none", py: 1,
          borderRadius: "8px",
          "&:hover .flt-title, &:focus-visible .flt-title": { color: C.sageDark },
          "&:hover .flt-chevron": { color: C.sageDark },
        }}
      >
        <Stack direction="row" spacing={0.875} sx={{ alignItems: "center" }}>
          <Typography className="flt-title" sx={{
            fontFamily: FONT, fontSize: 13.5, fontWeight: 700, color: C.ink,
            transition: "color .2s",
          }}>
            {title}
          </Typography>
          {selected.length > 0 && (
            <Box sx={{
              minWidth: 19, height: 19, px: 0.5, borderRadius: "999px",
              bgcolor: C.sageSoft, color: C.sageDark,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: FONT, fontSize: 11, fontWeight: 700,
            }}>
              {selected.length}
            </Box>
          )}
        </Stack>
        <KeyboardArrowDown className="flt-chevron" sx={{
          fontSize: 20, color: C.muted,
          transform: open ? "rotate(180deg)" : "none",
          transition: REDUCED ? "none" : "transform .3s cubic-bezier(0.22,1,0.36,1), color .2s",
        }} />
      </Stack>

      <Collapse in={open} timeout={REDUCED ? 0 : 280}>
        <Stack spacing={0.25} sx={{ pb: 1, pt: 0.25 }}>
          {options.map(o => {
            const on = selected.includes(o);
            return (
              <Stack
                key={o} direction="row" spacing={0.75}
                onClick={() => onToggle(o)}
                sx={{ alignItems: "center", cursor: "pointer", "&:hover .flt-label": { color: C.sageDark } }}
              >
                <Checkbox
                  checked={on} size="small" disableRipple tabIndex={-1}
                  sx={{
                    p: 0.5, color: "rgba(31,31,31,0.3)",
                    "&.Mui-checked": { color: C.sage },
                  }}
                />
                <Typography className="flt-label" sx={{
                  fontFamily: FONT, fontSize: 13.5, transition: "color .2s",
                  color: on ? C.ink : C.muted, fontWeight: on ? 600 : 400,
                }}>
                  {o}
                </Typography>
              </Stack>
            );
          })}
        </Stack>
      </Collapse>
    </Box>
  );
}

/* ── the full filter rail (desktop sidebar + mobile drawer content) ────── */
function FilterRail({ f, setF, onReset, activeCount, opts }) {
  const toggle = (key) => (val) =>
    setF(prev => ({
      ...prev,
      [key]: prev[key].includes(val) ? prev[key].filter(x => x !== val) : [...prev[key], val],
    }));

  return (
    <Paper elevation={0} sx={{
      bgcolor: "#fff", borderRadius: "16px", p: "18px 20px 8px",
      border: `1px solid ${C.line}`,
      boxShadow: "0 12px 30px rgba(2,33,36,0.05)",
    }}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", pb: 1.25, borderBottom: `1px solid ${C.line}` }}>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
          <TuneOutlined sx={{ fontSize: 17, color: C.sageDark }} />
          <Typography sx={{ fontFamily: FONT, fontSize: 15, fontWeight: 700, color: C.ink }}>
            All Filters
          </Typography>
          {activeCount > 0 && (
            <Box sx={{
              minWidth: 20, height: 20, px: 0.5, borderRadius: "999px", bgcolor: C.sage, color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: FONT, fontSize: 11.5, fontWeight: 700,
            }}>
              {activeCount}
            </Box>
          )}
        </Stack>
        <Box
          onClick={onReset}
          role="button" tabIndex={0} aria-label="Reset all filters"
          onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onReset(); } }}
          sx={{
            display: "inline-flex", alignItems: "center", gap: 0.5,
            px: 1.5, height: 30, borderRadius: "999px", flexShrink: 0, ml: 1,
            bgcolor: activeCount > 0 ? C.sageSoft : "transparent",
            border: `1.5px solid ${activeCount > 0 ? "rgba(127,158,126,0.45)" : C.line}`,
            cursor: "pointer", outline: "none", userSelect: "none",
            fontFamily: FONT, fontSize: 12.5, fontWeight: 700,
            color: activeCount > 0 ? C.sageDark : C.muted,
            transition: REDUCED ? "none" : "all .25s ease",
            "&:hover, &:focus-visible": { bgcolor: C.ink, borderColor: C.ink, color: "#fff" },
          }}
        >
          Reset
        </Box>
      </Stack>

      <FilterGroup title="Experience" options={EXPERIENCE_OPTIONS} selected={f.exp}  onToggle={toggle("exp")} />
      <FilterGroup title="Job Type"   options={opts.types}         selected={f.type} onToggle={toggle("type")} />
      <FilterGroup title="Location"   options={opts.locs}          selected={f.loc}  onToggle={toggle("loc")} />
      <FilterGroup title="Industry"   options={opts.industries}    selected={f.industry} onToggle={toggle("industry")} />
      <FilterGroup title="Salary (per annum)" options={SALARY_BANDS.map(b => b.label)} selected={f.sal} onToggle={toggle("sal")} />
    </Paper>
  );
}


export function JobCard({ j, saved, onSave, navigate }) {
 
  const { goToJob, goToApply } = useApplyNavigation();
  
  const { appliedLabelFor } = useAppliedStatus();
  const appliedLabel = appliedLabelFor(j.id);
  const open = () => goToJob(j.id);
  return (
    <Paper
      elevation={0}
      onClick={open}
      role="link" tabIndex={0} aria-label={`View ${j.title} at ${j.co}`}
      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); open(); } }}
      sx={{
        position: "relative", cursor: "pointer", outline: "none",
        borderRadius: "16px", bgcolor: "#fff", overflow: "hidden",
        boxShadow: "0 12px 28px rgba(2,33,36,0.08)",
        p: "18px 20px 20px", height: "100%",
        display: "flex", flexDirection: "column",
        transition: "all .3s ease",
        "&:hover": CAN_HOVER ? {
          transform: "translateY(-6px)",
          boxShadow: "0 24px 56px rgba(2,33,36,0.13)",
        } : {},
        "&:focus-visible": { boxShadow: `0 0 0 2px ${C.sage}, 0 12px 28px rgba(2,33,36,0.08)` },
        "&:hover .dogear": { borderTopWidth: "46px", borderLeftWidth: "46px" },
        "&:hover .dogear-shadow": { width: 46, height: 46 },
      }}
    >
      {/* dog-ear fold — the save action (sage = unsaved, ink = saved) */}
      <Box
        role="button" tabIndex={0}
        aria-label={saved ? `Unsave ${j.title}` : `Save ${j.title}`}
        aria-pressed={saved}
        onClick={e => { e.stopPropagation(); onSave(j.id); }}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onSave(j.id); } }}
        sx={{ position: "absolute", top: 0, right: 0, cursor: "pointer", zIndex: 2, outline: "none" }}
      >
        <Box className="dogear" sx={{
          width: 0, height: 0,
          borderLeft: "40px solid #EDF3EC",
          borderTop: `40px solid ${saved ? C.ink : C.sage}`,
          borderRadius: "0 16px 0 0",
          transition: REDUCED ? "none" : "border-width .25s ease, border-top-color .25s ease",
        }} />
        <Box className="dogear-shadow" sx={{
          position: "absolute", top: 0, right: 0, width: 40, height: 40,
          background: "linear-gradient(225deg, transparent 50%, rgba(2,33,36,0.16) 50%, transparent 64%)",
          pointerEvents: "none",
          transition: REDUCED ? "none" : "all .25s ease",
        }} />
      </Box>

      {/* header row: avatar (logo when available) + title + company/posted */}
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", pr: 4.5 }}>
        {j.logoUrl ? (
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
        ) : (
          <Box sx={{
            width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
            bgcolor: j.color, color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: FONT, fontSize: 15, fontWeight: 700,
          }}>
            {j.initials}
          </Box>
        )}
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontFamily: FONT, fontSize: 16.5, fontWeight: 700, color: C.ink, lineHeight: 1.25 }}>
            {j.title}
          </Typography>
          <Typography sx={{ fontFamily: FONT, fontSize: 12, color: C.muted, mt: 0.375 }}>
            {j.co} · {j.daysAgo === 0 ? "today" : `${j.daysAgo}d ago`}
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
          <Button
            onClick={e => { e.stopPropagation(); goToApply(j.id); }}
            sx={{
              fontFamily: FONT, textTransform: "none", fontSize: 12.5, fontWeight: 500,
              bgcolor: C.sageSoft, color: C.sageDark, borderRadius: "999px", px: 2, py: 0,
              height: 34, minWidth: 0, lineHeight: 1, flexShrink: 0, ml: "auto",
              "&:hover": { bgcolor: C.sage, color: "#fff" },
            }}
          >
            Apply Now
          </Button>
        )}
      </Stack>
    </Paper>
  );
}

/* ── skeleton card while the live list loads ───────────────────────────── */
function CardSkeleton() {
  return (
    <Paper elevation={0} sx={{
      borderRadius: "16px", bgcolor: "#fff", p: "18px 20px 20px",
      boxShadow: "0 12px 28px rgba(2,33,36,0.08)", height: "100%",
    }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
        <Skeleton variant="circular" width={40} height={40} />
        <Box sx={{ flex: 1 }}>
          <Skeleton variant="text" width="72%" sx={{ fontSize: 16 }} />
          <Skeleton variant="text" width="46%" sx={{ fontSize: 12 }} />
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


function useDirectionalSticky({ topOffset = 92, bottomGap = 24 } = {}) {
  const spacerRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    const el = panelRef.current;
    const spacer = spacerRef.current;
    if (!el || !spacer) return undefined;
    const cell = spacer.parentElement;

    let mode = "up"; // which edge we are pinning toward
    let lastY = window.scrollY;
    let frame = 0;

    const clampSpacer = (h) => {
      const max = Math.max(0, cell.offsetHeight - el.offsetHeight);
      return Math.min(Math.max(0, Math.round(h)), max);
    };

    const applyTop = () => {
      const viewH = window.innerHeight;
      const panelH = el.offsetHeight;
      const fits = panelH + topOffset + bottomGap <= viewH;
      const top = fits || mode === "up"
        ? topOffset
        : viewH - panelH - bottomGap; // negative when tall — that IS the bottom pin
      el.style.top = `${Math.round(top)}px`;
      return fits;
    };

    /* Make static position == current visual position, so a `top` flip can
       never move the panel on screen. */
    const freeze = () => {
      const delta = el.getBoundingClientRect().top - cell.getBoundingClientRect().top;
      spacer.style.height = `${clampSpacer(delta)}px`;
    };

    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!el.offsetParent) return; // display:none (mobile) — do nothing
        const y = window.scrollY;
        const dir = y > lastY ? "down" : y < lastY ? "up" : mode;
        lastY = y;

        const fits = el.offsetHeight + topOffset + bottomGap <= window.innerHeight;
        if (fits) {
          if (spacer.style.height !== "0px") spacer.style.height = "0px";
          if (mode !== "up") mode = "up";
          el.style.top = `${topOffset}px`;
          return;
        }
        if (dir !== mode) {
          freeze();   // jump-free handoff FIRST…
          mode = dir; // …then re-pin toward the new edge
          applyTop();
        }
      });
    };

    const onMeasure = () => {
      /* Height changed (group collapsed / viewport resized): keep the spacer
         legal and re-derive the pin for the current mode. */
      spacer.style.height = `${clampSpacer(parseFloat(spacer.style.height) || 0)}px`;
      applyTop();
    };

    el.style.position = "sticky";
    el.style.willChange = "top";
    spacer.style.height = "0px";
    applyTop();

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onMeasure);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(onMeasure) : null;
    ro?.observe(el);
    ro?.observe(cell);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onMeasure);
      ro?.disconnect();
      el.style.position = "";
      el.style.top = "";
      el.style.willChange = "";
      spacer.style.height = "";
    };
  }, [topOffset, bottomGap]);

  return { spacerRef, panelRef };
}

export default function BrowseJobsPage() {
  /* Direction-aware sticky for the tall filter rail — no inner scrollbar. */
  const { spacerRef, panelRef } = useDirectionalSticky({ topOffset: 92, bottomGap: 24 });
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  /* live jobs — shared cached fetch with the landing sections */
  const { jobs, loading, error, reload } = usePublicJobs();
  const allJobs = jobs || [];

  /* filter option lists derived from the live dataset */
  const opts = useMemo(() => {

    const industries = uniqueIndustries(allJobs);
    return {
      locs:    uniqueLocations(allJobs),
      types:   uniqueJobTypes(allJobs),
      industries,
      popular: popularSearches(allJobs),
    };
  }, [allJobs]);

  const q         = params.get("q")   || "";
  const expQ      = params.get("exp") || "";
  const locQ      = params.get("loc") || "";
  const industryQ = params.get("industry") || params.get("cat") || "";

  // Rail filters (multi-select) are local state, seeded from URL params.
  const [f, setF] = useState({
    exp:  expQ ? [expQ] : [],
    type: [],
    loc:  locQ ? [locQ] : [],
    industry: industryQ ? [industryQ] : [],
    sal:  [],
  });
  const [sort, setSort]           = useState("relevance");
  const [savedIds, setSavedIds]   = useState([]);
  const [drawerOpen, setDrawer]   = useState(false);

  /* once the live location list arrives, canonicalise a URL-seeded location
     (e.g. ?loc=hyderabad) onto the exact value the rail offers */
  useEffect(() => {
    if (!locQ || opts.locs.length === 0) return;
    const canon = opts.locs.find(l => l.toLowerCase() === locQ.toLowerCase());
    if (canon && !f.loc.includes(canon)) {
      setF(prev => ({ ...prev, loc: [canon] }));
    }
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [opts.locs, locQ]);


  const resultsTopRef = useRef(null);

  const activeCount = f.exp.length + f.type.length + f.loc.length + f.industry.length + f.sal.length;

  const onSearch = ({ query, experience, location }) => {
    const next = {};
    if (query)      next.q   = query;
    if (experience) next.exp = experience;
    if (location)   next.loc = location;
    if (industryQ)  next.industry = industryQ;
    setParams(next);
    setF(prev => ({
      ...prev,
      exp: experience ? [experience] : [],
      loc: location
        ? [opts.locs.find(l => l.toLowerCase() === location.toLowerCase()) || location]
        : [],
    }));
  };

  const resetAll = () => {
    setF({ exp: [], type: [], loc: [], industry: [], sal: [] });
    setParams(q ? { q } : {});
  };

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    let out = allJobs.filter(j => {
      const okQ = !query
        || j.title.toLowerCase().includes(query)
        || j.co.toLowerCase().includes(query)
        || j.skills.some(s => s.toLowerCase().includes(query))
        || j.industry.toLowerCase().includes(query)
        || j.loc.toLowerCase().includes(query);
      const okE = f.exp.length  === 0 || f.exp.includes(j.exp);
      const okT = f.type.length === 0 || f.type.includes(j.type);
      const okL = f.loc.length  === 0 || f.loc.some(l => j.loc.toLowerCase().includes(l.toLowerCase()));
      const okC = f.industry.length === 0
        || f.industry.some(name => industryKeyOf(name) === j.industryKey);
      const okS = f.sal.length  === 0 || f.sal.some(label => {
        const band = SALARY_BANDS.find(b => b.label === label);
        return band && j.salMax >= band.min && j.salMin < band.max;
      });
      return okQ && okE && okT && okL && okC && okS;
    });
    if (sort === "salary-desc") out = [...out].sort((a, b) => b.salMax - a.salMax);
    if (sort === "salary-asc")  out = [...out].sort((a, b) => a.salMin - b.salMin);
    if (sort === "newest")      out = [...out].sort((a, b) => a.daysAgo - b.daysAgo);
    return out;
  }, [allJobs, q, f, sort]);

  /* ALL matching jobs render — no slicing, no page window */
  const pageJobs = results;

  // Removable chips summarising everything currently applied.
  const chips = [
    ...(q ? [{ label: `"${q}"`, clear: () => { const n = {}; if (industryQ) n.industry = industryQ; setParams(n); } }] : []),
    ...f.exp.map(v  => ({ label: v, clear: () => setF(p => ({ ...p, exp:  p.exp.filter(x => x !== v) })) })),
    ...f.type.map(v => ({ label: v, clear: () => setF(p => ({ ...p, type: p.type.filter(x => x !== v) })) })),
    ...f.loc.map(v  => ({ label: v, clear: () => setF(p => ({ ...p, loc:  p.loc.filter(x => x !== v) })) })),
    ...f.industry.map(v => ({ label: v, clear: () => setF(p => ({ ...p, industry: p.industry.filter(x => x !== v) })) })),
    ...f.sal.map(v  => ({ label: v, clear: () => setF(p => ({ ...p, sal:  p.sal.filter(x => x !== v) })) })),
  ];

  return (
    <PublicLayout>
      <PageHero
        eyebrow="Find Jobs"
        title="Explore Verified Openings"
        subtitle="Search across every role on IEvalx — filter by experience, location, category and salary, exactly the way you'd expect."
        back={industryQ
          ? { label: "Back to Industries", to: "/categories" }
          : { label: "Back to Home", to: "/" }}
      >
        <JobSearchBar onSearch={onSearch} initial={{ query: q, experience: expQ, location: locQ }} />
        {/* popular searches strip — top skills across live openings */}
        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", mt: 2, rowGap: 1, alignItems: "center" }}>
          <Typography sx={{ fontFamily: FONT, fontSize: 12.5, color: "#4A524C", fontWeight: 600 }}>
            Popular:
          </Typography>
          {opts.popular.map(p => (
            <Box
              key={p}
              onClick={() => onSearch({ query: p, experience: "", location: "" })}
              sx={{
                bgcolor: "rgba(255,255,255,0.7)", border: "1px solid rgba(31,31,31,0.1)",
                borderRadius: "999px", px: 1.5, py: 0.5, cursor: "pointer",
                fontFamily: FONT, fontSize: 12.5, color: C.ink, fontWeight: 500,
                transition: "all .25s ease",
                "&:hover": { bgcolor: C.sage, borderColor: C.sage, color: "#fff" },
              }}
            >
              {p}
            </Box>
          ))}
        </Stack>
      </PageHero>

      <Container maxWidth="lg" sx={{ mt: { xs: 4, md: 5.5 }, mb: { xs: 6, md: 9 } }}>
        <Box sx={{
          display: "grid", gap: 3.5, alignItems: "start",
          gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "278px minmax(0, 1fr)" },
        }}>
          
          <Box sx={{ display: { xs: "none", md: "block" }, minWidth: 0, alignSelf: "stretch" }}>
            <Box ref={spacerRef} aria-hidden />
            <Box ref={panelRef}>
              <FadeUp>
                <FilterRail f={f} setF={setF} onReset={resetAll} activeCount={activeCount} opts={opts} />
              </FadeUp>
            </Box>
          </Box>

          {/* ── results column ── */}
          <Box sx={{ minWidth: 0 }}>
            <Box ref={resultsTopRef} sx={{ scrollMarginTop: 96 }} />

            {/* ── loading state ── */}
            {loading && (
              <>
                <Skeleton variant="text" width={180} sx={{ fontSize: 19 }} />
                <Box sx={{
                  display: "grid", gap: 2.5, mt: 2.5,
                  gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))", md: "minmax(0, 1fr)", lg: "repeat(2, minmax(0, 1fr))" },
                }}>
                  {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
                </Box>
              </>
            )}

            {/* ── error state — server unreachable → app-themed Connection-lost screen ── */}
            {!loading && error && (
              <FadeUp>
                <NetworkError
                  variant="embedded"
                  onRetry={() => reload().catch(() => {})}
                />
              </FadeUp>
            )}

            {/* ── live results ── */}
            {!loading && !error && (
            <>
            <FadeUp>
              <Stack direction="row" spacing={1.5} sx={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", rowGap: 1.5 }}>
                <Box>
                  <Typography sx={{ fontFamily: FONT, fontSize: { xs: 17, sm: 19 }, fontWeight: 700, color: C.ink }}>
                    {results.length} job{results.length !== 1 ? "s" : ""} found
                  </Typography>
                  {results.length > 0 && (
                    <Typography sx={{ fontFamily: FONT, fontSize: 12, color: C.muted, mt: 0.25 }}>
                      Showing all {results.length} opening{results.length !== 1 ? "s" : ""} from every company
                    </Typography>
                  )}
                </Box>
                <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
                  {/* mobile filter button */}
                  <Button
                    onClick={() => setDrawer(true)}
                    startIcon={<TuneOutlined sx={{ fontSize: "16px !important" }} />}
                    sx={{
                      display: { xs: "inline-flex", md: "none" },
                      fontFamily: FONT, textTransform: "none", fontSize: 13, fontWeight: 600,
                      color: C.ink, bgcolor: "#fff", border: `1px solid ${C.line}`,
                      borderRadius: "999px", px: 1.75, height: 38, minWidth: 0,
                    }}
                  >
                    Filters{activeCount > 0 ? ` (${activeCount})` : ""}
                  </Button>
                  <Select
                    value={sort}
                    onChange={e => setSort(e.target.value)}
                    variant="standard" disableUnderline
                    IconComponent={KeyboardArrowDown}
                    sx={{
                      fontFamily: FONT, fontSize: 13, fontWeight: 600, color: C.ink,
                      bgcolor: "#fff", border: `1px solid ${C.line}`, borderRadius: "999px",
                      pl: 1.75, height: 38, display: "flex", alignItems: "center",
                      "& .MuiSelect-select": { py: 0, pr: "30px !important", bgcolor: "transparent !important", display: "flex", alignItems: "center" },
                      "& .MuiSvgIcon-root": { color: C.muted, fontSize: 19, right: 8 },
                    }}
                    MenuProps={{ PaperProps: { sx: { mt: 1, borderRadius: 3, boxShadow: "0 18px 50px rgba(2,33,36,0.14)", "& .MuiMenuItem-root": { fontFamily: FONT, fontSize: 13.5 } } } }}
                  >
                    <MenuItem value="relevance">Sort: Relevance</MenuItem>
                    <MenuItem value="newest">Sort: Newest</MenuItem>
                    <MenuItem value="salary-desc">Salary: High → Low</MenuItem>
                    <MenuItem value="salary-asc">Salary: Low → High</MenuItem>
                  </Select>
                </Stack>
              </Stack>

              {/* applied filter chips */}
              {chips.length > 0 && (
                <Stack direction="row" spacing={0.75} sx={{ flexWrap: "wrap", mt: 1.75, rowGap: 0.75 }}>
                  {chips.map((c, i) => (
                    <Chip
                      key={`${c.label}-${i}`}
                      label={c.label}
                      onDelete={c.clear}
                      deleteIcon={<Close sx={{ fontSize: "14px !important" }} />}
                      sx={{
                        bgcolor: C.sageSoft, color: C.sageDark, fontFamily: FONT,
                        fontSize: 12.5, fontWeight: 600, height: 28, borderRadius: "999px",
                        "& .MuiChip-deleteIcon": { color: C.sageDark, "&:hover": { color: C.ink } },
                      }}
                    />
                  ))}
                  <Typography
                    onClick={resetAll}
                    sx={{
                      fontFamily: FONT, fontSize: 12.5, fontWeight: 600, color: C.muted,
                      alignSelf: "center", cursor: "pointer", ml: 0.5,
                      "&:hover": { color: C.ink },
                    }}
                  >
                    Clear all
                  </Typography>
                </Stack>
              )}
            </FadeUp>

            {/* result cards — exact landing corner-fold cards, 2-up grid.
                ALL matching jobs render in one continuous grid — no pager. */}
            {results.length > 0 ? (
              <Box sx={{
                display: "grid", gap: 2.5, mt: 2.5, alignItems: "stretch",
                gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))", md: "minmax(0, 1fr)", lg: "repeat(2, minmax(0, 1fr))" },
              }}>
                {pageJobs.map((j, i) => (
                  <FadeUp key={j.id} delay={Math.min(i, 6) * 0.05} sx={{ height: "100%", minWidth: 0 }}>
                    <JobCard
                      j={j}
                      saved={savedIds.includes(j.id)}
                      onSave={(id) => setSavedIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])}
                      navigate={navigate}
                    />
                  </FadeUp>
                ))}
              </Box>
            ) : (
              /* empty state — either no matches, or no jobs published yet */
              <FadeUp sx={{ mt: 2.5 }}>
                <Paper elevation={0} sx={{
                  bgcolor: "#fff", borderRadius: "20px", border: `1px solid ${C.line}`,
                  textAlign: "center", py: 7, px: 3,
                }}>
                  <Box sx={{
                    width: 68, height: 68, borderRadius: "50%", bgcolor: C.sageSoft,
                    display: "flex", alignItems: "center", justifyContent: "center", mx: "auto",
                  }}>
                    <SearchOff sx={{ fontSize: 28, color: C.sage }} />
                  </Box>
                  <Typography sx={{ fontFamily: FONT, fontSize: 17, fontWeight: 700, color: C.ink, mt: 2.25 }}>
                    {allJobs.length === 0 ? "No openings published yet" : "Nothing matches those filters"}
                  </Typography>
                  <Typography sx={{ fontFamily: FONT, fontSize: 13.5, color: C.muted, mt: 0.75, lineHeight: 1.7, maxWidth: 340, mx: "auto" }}>
                    {allJobs.length === 0
                      ? "Verified employers are onboarding right now — check back soon or create your profile to get notified."
                      : "Try a broader title, a different city, or clear a few filters to widen the search."}
                  </Typography>
                  {allJobs.length > 0 && (
                    <Button
                      onClick={resetAll}
                      sx={{
                        fontFamily: FONT, textTransform: "none", mt: 2.75,
                        bgcolor: C.sage, color: "#fff", borderRadius: "999px",
                        px: 3, py: 0, height: 44, minWidth: 0, lineHeight: 1,
                        fontSize: 14, fontWeight: 500,
                        "&:hover": { bgcolor: C.sageDark },
                      }}
                    >
                      Clear all filters
                    </Button>
                  )}
                </Paper>
              </FadeUp>
            )}
            </>
            )}
          </Box>
        </Box>
      </Container>

      {/* ── mobile filter drawer ── */}
      <Drawer
        anchor="bottom"
        open={drawerOpen}
        onClose={() => setDrawer(false)}
        PaperProps={{ sx: { borderRadius: "20px 20px 0 0", maxHeight: "82vh", bgcolor: C.cream } }}
      >
        <Box sx={{ p: 2, overflowY: "auto" }}>
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 1.5, px: 0.5 }}>
            <Typography sx={{ fontFamily: FONT, fontSize: 16, fontWeight: 700, color: C.ink }}>Filters</Typography>
            <Box
              onClick={() => setDrawer(false)}
              sx={{
                width: 34, height: 34, borderRadius: "50%", cursor: "pointer",
                border: "1.5px solid rgba(31,31,31,0.18)",
                display: "flex", alignItems: "center", justifyContent: "center",
                "&:hover": { bgcolor: C.ink, "& svg": { color: "#fff" } },
              }}
            >
              <Close sx={{ fontSize: 16, color: C.ink }} />
            </Box>
          </Stack>
          <FilterRail f={f} setF={setF} onReset={resetAll} activeCount={activeCount} opts={opts} />
          <Button
            fullWidth
            onClick={() => setDrawer(false)}
            sx={{
              fontFamily: FONT, textTransform: "none", mt: 2, mb: 1,
              bgcolor: C.sage, color: "#fff", borderRadius: "999px",
              height: 48, fontSize: 14.5, fontWeight: 600,
              "&:hover": { bgcolor: C.sageDark },
            }}
          >
            Show {results.length} job{results.length !== 1 ? "s" : ""}
          </Button>
        </Box>
      </Drawer>
    </PublicLayout>
  );
}