import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Box,
  Typography,
  Card,
  CircularProgress,
  Button,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
  Paper,
  Stack,
  IconButton,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
  useMediaQuery,
  useTheme,
  Alert,
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import {
  Search, WorkOutlineRounded, ClearRounded,
  ViewList, ViewModule, EventRounded, UpdateRounded, Visibility, RefreshOutlined,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "notistack";
import jobService from "@/services/api/jobseeker/jobService";
import { formatDate, formatRelativeTime } from "@/utils/formatters";
import { APP_STATUS } from "@/constants";

const STATUS_STYLE = {
  APPLIED: { bgcolor: "#F0EEE9", color: "#5A5752" },
  REVIEWING: { bgcolor: "#EBF1F6", color: "#3D6B8E" },
  SHORTLISTED: { bgcolor: "#FBF5E6", color: "#9C7A2E" },
  ON_HOLD: { bgcolor: "#FEF3C7", color: "#92400E" },
  INTERVIEW: { bgcolor: "#EDF0FB", color: "#3D518E" },
  OFFERED: { bgcolor: "#EDF4EF", color: "#4A7C59" },
  REJECTED: { bgcolor: "#FAEAE8", color: "#A63D2F" },
  WITHDRAWN: { bgcolor: "#F0EEE9", color: "#807C74" },
};


const FONT = "'Jost','DM Sans',sans-serif";
const BRAND = {
  navy: '#022124', navyDark: '#0A3A38',
  sage: '#7F9E7E', sageText: '#5E815D', sageSoft: '#EDF3EC',
  border: '#E7EAE3', borderStrong: '#D8DDD4',
  muted: '#55584F', ink: '#101210',
  bg: '#F6F8F3', surface: '#FFFFFF',
};

/* Status chips shown in the hero — All plus every application status. */
const STATUS_CHIPS = [
  ['', 'All'],
  ['APPLIED', 'Applied'],
  ['REVIEWING', 'Reviewing'],
  ['SHORTLISTED', 'Shortlisted'],
  ['ON_HOLD', 'On Hold'],
  ['INTERVIEW', 'Interview'],
  ['OFFERED', 'Offered'],
  ['REJECTED', 'Rejected'],
  ['WITHDRAWN', 'Withdrawn'],
];

// An application can be withdrawn only while it's still active.
const canWithdraw = (app) =>
  ["APPLIED", "REVIEWING", "SHORTLISTED", "ON_HOLD", "INTERVIEW"].includes(
    app?.status || app,
  );


const PAGE_SIZE_OPTIONS = [5, 10, 25, 50, 'all'];
const DEFAULT_PAGE_SIZE = 10;

const Applications = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [withdrawing, setWithdrawing] = useState(null); // application id in-flight
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [viewMode, setViewMode] = useState("grid"); // grid = cards (Find Jobs look), list = table

  const [confirmApp, setConfirmApp] = useState(null);

  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down("sm")); // < 600px

  const loadApplications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await jobService.getApplications();
      // Service returns { applications, total }; also tolerate older shapes.
      const list = Array.isArray(res)
        ? res
        : res?.applications || res?.data?.results || res?.data || [];
      setApps(Array.isArray(list) ? list : []);
      console.log(
        "[Applications] loaded:",
        Array.isArray(list) ? list.length : 0,
        "items. First:",
        Array.isArray(list) ? list[0] : list,
      );
    } catch (err) {
      console.error("Failed to load applications:", err);
      setError(
        err?.message || "We couldn’t load your applications. Please try again.",
      );
      setApps([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const openWithdrawDialog = (app) => {
    if (!app?.id || withdrawing) return;
    if (app.status === "WITHDRAWN") return;
    setConfirmApp(app);
  };

  const closeWithdrawDialog = () => {
    // Don't allow closing while the request is in-flight (avoids state races).
    if (withdrawing) return;
    setConfirmApp(null);
  };

  const performWithdraw = async () => {
    const app = confirmApp;
    if (!app?.id || withdrawing) return;
    if (app.status === "WITHDRAWN") {
      setConfirmApp(null);
      return;
    }
    const prevStatus = app.status;
    setWithdrawing(app.id);
    // Optimistic update.
    setApps((prev) =>
      prev.map((a) => (a.id === app.id ? { ...a, status: "WITHDRAWN" } : a)),
    );
    try {
      await jobService.withdrawApplication(app.id);
      enqueueSnackbar("Application withdrawn", { variant: "success" });
    } catch (err) {
      const msg = err?.response?.data?.Error || err?.message || "";
      const alreadyWithdrawn = /already withdrawn/i.test(msg);
      if (alreadyWithdrawn) {
        jobService.recordLocalApplication({
          applicationId: app.id,
          jobId: app.jobId,
          jobTitle: app.job?.title,
          companyName: app.job?.company_name,
          status: "WITHDRAWN",
          appliedAt: app.applied_at,
        });
        enqueueSnackbar(
          "This application was already withdrawn. You can re-apply from Find Jobs.",
          { variant: "info" },
        );
      } else {
        // Real error — revert
        setApps((prev) =>
          prev.map((a) => (a.id === app.id ? { ...a, status: prevStatus } : a)),
        );
        enqueueSnackbar(msg || "Could not withdraw application", {
          variant: "error",
        });
      }
    } finally {
      setWithdrawing(null);
      setConfirmApp(null);
    }
  };

  const filtered = useMemo(
    () =>
      apps.filter((a) => {
        const title = (a.job?.title || "").toLowerCase();
        const company = (a.job?.company_name || "").toLowerCase();
        const q = search.toLowerCase();
        const matchSearch = !search || title.includes(q) || company.includes(q);
        const matchStatus = !status || a.status === status;
        return matchSearch && matchStatus;
      }),
    [apps, search, status],
  );

  // Reset to page 1 when filters change or the user picks a new page size
  useEffect(() => {
    setPage(1);
  }, [search, status, pageSize]);

  const effectivePageSize = pageSize === 'all' ? Math.max(filtered.length, 1) : pageSize;
  const pageCount = Math.max(1, Math.ceil(filtered.length / effectivePageSize));
  const currentPage = Math.min(page, pageCount);
  const paged = useMemo(() => {
    const start = (currentPage - 1) * effectivePageSize;
    return filtered.slice(start, start + effectivePageSize);
  }, [filtered, currentPage, effectivePageSize]);

  const counts = Object.keys(STATUS_STYLE).reduce((acc, k) => {
    acc[k] = apps.filter((a) => a.status === k).length;
    return acc;
  }, {});

  if (loading)
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          py: { xs: 4, sm: 6, md: 8 },
        }}
      >
        <CircularProgress sx={{ color: "#2C2C2A" }} thickness={3} />
      </Box>
    );

  const renderAppCard = (app) => {
    const title    = app.job?.title || "Untitled role";
    const company  = app.job?.company_name || "—";
    const initials = company.split(" ").filter(Boolean).slice(0, 2)
      .map((w) => w[0]).join("").toUpperCase() || "CO";
    const style = STATUS_STYLE[app.status] || STATUS_STYLE.APPLIED;
    const clickable = Boolean(app.jobId);
    const logoUrl = jobService.companyLogoUrlFor(app.job?.company_id)
                 || app.job?.company_logo_url
                 || null;
    return (
      <Card
        key={app.id}
        elevation={0}
        onClick={clickable ? () => navigate(`/jobseeker/job/${app.jobId}`) : undefined}
        sx={{
          position: "relative", height: "100%",
          display: "flex", flexDirection: "column",
          borderRadius: "16px", bgcolor: BRAND.surface, overflow: "hidden",
          border: `1px solid ${BRAND.border}`, fontFamily: FONT,
          "& .MuiTypography-root, & .MuiButton-root": { fontFamily: FONT },
          boxShadow: "0 10px 26px rgba(2,33,36,0.06)",
          cursor: clickable ? "pointer" : "default",
          transition: "transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease",
          "&:hover": {
            transform: "translateY(-4px)",
            boxShadow: "0 22px 48px -18px rgba(2,33,36,0.16)",
            borderColor: BRAND.sage,
          },
        }}
      >
        {/* View details — same eye action as the Find Jobs cards */}
        {clickable && (
          <Tooltip title="View details" arrow>
            <IconButton
              size="small"
              aria-label={`View ${title}`}
              onClick={(e) => { e.stopPropagation(); navigate(`/jobseeker/job/${app.jobId}`); }}
              sx={{
                position: "absolute", top: 8, right: 6, zIndex: 2,
                color: "#7A7E76",
                "&:hover": { bgcolor: BRAND.sageSoft, color: BRAND.navy },
              }}
            >
              <Visibility sx={{ fontSize: 19 }} />
            </IconButton>
          </Tooltip>
        )}

        <Box sx={{ p: "18px 20px 20px", display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
          {/* Identity */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, pr: 3, minWidth: 0 }}>
            <Box sx={{
              position: "relative", width: 42, height: 42, borderRadius: "50%",
              flexShrink: 0, overflow: "hidden",
              bgcolor: BRAND.navy, color: BRAND.sage,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, fontSize: "0.9rem", fontFamily: FONT,
            }}>
              {initials}
              {logoUrl && (
                <Box
                  component="img"
                  src={logoUrl}
                  alt={company}
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                  sx={{
                    position: "absolute", inset: 0, width: "100%", height: "100%",
                    objectFit: "cover", bgcolor: "#fff", display: "block",
                  }}
                />
              )}
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{
                fontSize: "1.02rem", fontWeight: 800, color: BRAND.ink, lineHeight: 1.25,
                letterSpacing: "-0.015em",
                display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
              }}>
                {title}
              </Typography>
              <Typography noWrap sx={{ fontSize: "0.74rem", color: BRAND.muted, mt: 0.3, fontWeight: 500 }}>
                {company}
              </Typography>
            </Box>
          </Box>

          {/* Meta: applied date + last updated */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 1.75, flexWrap: "wrap", rowGap: 0.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, minWidth: 0 }}>
              <EventRounded sx={{ fontSize: 15, color: "#7A7E76", flexShrink: 0 }} />
              <Typography noWrap sx={{ fontSize: "0.78rem", color: BRAND.muted, fontWeight: 500 }}>
                Applied {formatDate(app.applied_at)}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, minWidth: 0 }}>
              <UpdateRounded sx={{ fontSize: 15, color: "#7A7E76", flexShrink: 0 }} />
              <Typography noWrap sx={{ fontSize: "0.78rem", color: BRAND.muted, fontWeight: 500 }}>
                {formatRelativeTime(app.updated_at)}
              </Typography>
            </Box>
          </Box>

          {/* Footer: status chip + Withdraw */}
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, mt: "auto", pt: 2.25 }}>
            <Box sx={{
              display: "inline-flex", alignItems: "center",
              bgcolor: style.bgcolor, color: style.color,
              borderRadius: "999px", px: 1.5, height: 30,
              fontSize: "0.74rem", fontWeight: 700, whiteSpace: "nowrap",
              fontFamily: FONT,
            }}>
              {APP_STATUS[app.status]?.label || app.status}
            </Box>

            {canWithdraw(app) && (
              <Button
                onClick={(e) => { e.stopPropagation(); openWithdrawDialog(app); }}
                disabled={withdrawing === app.id}
                sx={{
                  textTransform: "none", fontSize: "0.78rem", fontWeight: 700,
                  color: "#A63D2F", bgcolor: "transparent",
                  border: "1px solid rgba(166,61,47,0.35)",
                  borderRadius: "999px", px: 1.75, height: 30, minWidth: 0,
                  lineHeight: 1, flexShrink: 0,
                  "&:hover": { bgcolor: "#FAEAE8", borderColor: "#A63D2F" },
                }}
              >
                {withdrawing === app.id ? "Withdrawing…" : "Withdraw"}
              </Button>
            )}
          </Box>
        </Box>
      </Card>
    );
  };

  const renderAppRow = (app) => {
    const title    = app.job?.title || "Untitled role";
    const company  = app.job?.company_name || "—";
    const initials = company.split(" ").filter(Boolean).slice(0, 2)
      .map((w) => w[0]).join("").toUpperCase() || "CO";
    const style = STATUS_STYLE[app.status] || STATUS_STYLE.APPLIED;
    const clickable = Boolean(app.jobId);
    // BUILD: 2026-08-05-company-logo-proxy — same proxy-first pattern
    const logoUrl = jobService.companyLogoUrlFor(app.job?.company_id)
                 || app.job?.company_logo_url
                 || null;

    const avatar = (size) => (
      <Box sx={{
        position: "relative", width: size, height: size, borderRadius: "50%",
        flexShrink: 0, overflow: "hidden",
        bgcolor: BRAND.navy, color: BRAND.sage,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 700, fontSize: "0.8rem", fontFamily: FONT,
      }}>
        {initials}
        {logoUrl && (
          <Box component="img" src={logoUrl} alt={company}
            onError={(e) => { e.currentTarget.style.display = "none"; }}
            sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", bgcolor: "#fff", display: "block" }}
          />
        )}
      </Box>
    );

    const statusPill = (
      <Box sx={{
        display: "inline-flex", alignItems: "center", alignSelf: "center",
        bgcolor: style.bgcolor, color: style.color,
        borderRadius: "999px", px: 1.4, height: 28,
        fontSize: "0.72rem", fontWeight: 700, whiteSpace: "nowrap", fontFamily: FONT,
      }}>
        {APP_STATUS[app.status]?.label || app.status}
      </Box>
    );

    const actions = (
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 0.5 }}>
        {canWithdraw(app) && (
          <Button
            onClick={(e) => { e.stopPropagation(); openWithdrawDialog(app); }}
            disabled={withdrawing === app.id}
            sx={{
              textTransform: "none", fontSize: "0.74rem", fontWeight: 700,
              color: "#A63D2F", border: "1px solid rgba(166,61,47,0.35)",
              borderRadius: "999px", px: 1.5, height: 28, minWidth: 0,
              lineHeight: 1, flexShrink: 0, fontFamily: FONT,
              "&:hover": { bgcolor: "#FAEAE8", borderColor: "#A63D2F" },
            }}
          >
            {withdrawing === app.id ? "…" : "Withdraw"}
          </Button>
        )}
        {clickable && (
          <Tooltip title="View details" arrow>
            <IconButton size="small" aria-label={`View ${title}`}
              onClick={(e) => { e.stopPropagation(); navigate(`/jobseeker/job/${app.jobId}`); }}
              sx={{ color: "#7A7E76", "&:hover": { bgcolor: BRAND.sageSoft, color: BRAND.navy } }}>
              <Visibility sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    );

    return (
      <Card
        key={app.id}
        elevation={0}
        onClick={clickable ? () => navigate(`/jobseeker/job/${app.jobId}`) : undefined}
        sx={{
          fontFamily: FONT,
          "& .MuiTypography-root": { fontFamily: FONT },
          borderRadius: "14px", bgcolor: BRAND.surface,
          border: `1px solid ${BRAND.border}`,
          cursor: clickable ? "pointer" : "default",
          transition: "all 0.2s ease",
          "&:hover": { borderColor: BRAND.sage, boxShadow: "0 6px 20px rgba(2,33,36,0.08)" },
        }}
      >
        {/* Desktop: ledger row (md+) */}
        <Box sx={{
          display: { xs: "none", md: "grid" },
          gridTemplateColumns: "2.2fr 1fr 1fr 1fr 170px",
          alignItems: "center",
          px: 2.5, py: 1.75, gap: 2,
        }}>
          <Box sx={{ display: "flex", gap: 1.25, alignItems: "center", minWidth: 0 }}>
            {avatar(38)}
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography noWrap sx={{ fontSize: "0.95rem", fontWeight: 800, color: BRAND.ink, lineHeight: 1.25, letterSpacing: "-0.01em" }}>
                {title}
              </Typography>
              <Typography noWrap sx={{ fontSize: "0.75rem", color: BRAND.muted, fontWeight: 500, mt: 0.2 }}>
                {company}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, minWidth: 0 }}>
            <EventRounded sx={{ fontSize: 14, color: "#7A7E76", flexShrink: 0 }} />
            <Typography noWrap sx={{ fontSize: "0.8rem", color: "#2F332E", fontWeight: 500 }}>
              {formatDate(app.applied_at)}
            </Typography>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, minWidth: 0 }}>
            <UpdateRounded sx={{ fontSize: 14, color: "#7A7E76", flexShrink: 0 }} />
            <Typography noWrap sx={{ fontSize: "0.8rem", color: "#2F332E", fontWeight: 500 }}>
              {formatRelativeTime(app.updated_at)}
            </Typography>
          </Box>

          <Box>{statusPill}</Box>
          {actions}
        </Box>

        {/* Mobile: stacked (xs–sm) */}
        <Box sx={{ display: { xs: "flex", md: "none" }, flexDirection: "column", p: 2 }}>
          <Box sx={{ display: "flex", gap: 1.25, alignItems: "flex-start", mb: 1.25 }}>
            {avatar(36)}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: "0.92rem", fontWeight: 800, color: BRAND.ink, lineHeight: 1.25, mb: 0.2 }}>
                {title}
              </Typography>
              <Typography sx={{ fontSize: "0.72rem", color: BRAND.muted, fontWeight: 500 }}>
                {company} · Applied {formatDate(app.applied_at)}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1 }}>
            {statusPill}
            {actions}
          </Box>
        </Box>
      </Card>
    );
  };

  return (
    <Box className="page-fade-in" sx={{
      p: { xs: 1.5, sm: 2, md: 3, lg: 4 },
      maxWidth: 1440, mx: 'auto', bgcolor: BRAND.bg, minHeight: '100vh',
      fontFamily: FONT,
      '& .MuiTypography-root, & .MuiButton-root, & .MuiToggleButton-root, & .MuiChip-root, & .MuiInputBase-root, & .MuiMenuItem-root, & .MuiPaginationItem-root': {
        fontFamily: FONT,
      },
    }}>
      {/* ── Clean Board · light command header — same as Find Jobs ───── */}
      <Paper
        elevation={0}
        sx={{
          bgcolor: BRAND.surface,
          border: `1px solid ${BRAND.border}`,
          borderRadius: { xs: "14px", sm: "16px" },
          p: { xs: 2, sm: 2.5, md: 3 },
          mb: { xs: 2, md: 2.5 },
          boxShadow: "0 1px 2px rgba(16,18,16,0.04)",
          fontFamily: FONT,
          "& .MuiTypography-root, & .MuiButton-root, & .MuiInputBase-root, & .MuiMenuItem-root": { fontFamily: FONT },
        }}
      >
        {/* Row 1 — title with subline underneath + refresh */}
        <Stack
          direction="row"
         
         
          sx={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5, mb: { xs: 2, md: 2.25 } }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography component="h1" sx={{
              fontWeight: 700, color: BRAND.ink,
              letterSpacing: "-0.02em", lineHeight: 1.15,
              fontSize: { xs: "1.3rem", sm: "1.45rem", md: "1.6rem" },
            }}>
              Applied Jobs
            </Typography>
            <Typography sx={{ color: BRAND.muted, fontSize: { xs: "0.82rem", sm: "0.9rem" }, fontWeight: 500, mt: 0.5 }}>
              <Box component="span" sx={{ color: BRAND.sageText, fontWeight: 700 }}>
                {apps.length} {apps.length === 1 ? "application" : "applications"}
              </Box>
              {" "}— track every stage in one place
            </Typography>
          </Box>
          <Tooltip title="Refresh" arrow>
            <span>
              <IconButton
                onClick={loadApplications}
                disabled={loading}
                size="small"
                sx={{
                  color: BRAND.muted, flexShrink: 0, mt: 0.5,
                  border: `1px solid ${BRAND.borderStrong}`,
                  borderRadius: "9px",
                  "&:hover": { bgcolor: BRAND.sageSoft, color: BRAND.navy, borderColor: BRAND.sage },
                }}
              >
                <RefreshOutlined sx={{ fontSize: 18 }} />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>

        {/* Row 2 — search + Search button */}
        <Stack direction="row" spacing={1} sx={{ alignItems: 'stretch', flexWrap: "wrap", gap: 1 }}>
          <TextField
            placeholder="Search by job title or company"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: BRAND.muted, fontSize: 20 }} />
                  </InputAdornment>
                ),
                endAdornment: search ? (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => setSearch("")}
                      aria-label="Clear search"
                      sx={{ color: BRAND.muted, "&:hover": { color: BRAND.ink, bgcolor: "rgba(16,18,16,0.05)" } }}
                    >
                      <ClearRounded sx={{ fontSize: 18 }} />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              },
            }}
           sx={{
  flex: '1 1 300px',
  minWidth: { xs: '100%', sm: 260 },

  '& .MuiOutlinedInput-root': {
    bgcolor: BRAND.bg,
    borderRadius: '25px',
    fontSize: { xs: '0.88rem', sm: '0.92rem' },
    height: { xs: 46, md: 48 },
    color: BRAND.ink,
    fontFamily: FONT,
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',

    '& input::placeholder': {
      color: BRAND.muted,
      opacity: 0.85,
    },

    '& fieldset': {
      borderColor: '#B0BEC5',
      borderWidth: '1.5px',
    },

    '&:hover fieldset': {
      borderColor: '#78909C',
      borderWidth: '2px',
    },

    '&.Mui-focused': {
      boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
    },

    '&.Mui-focused fieldset': {
      borderColor: BRAND.sage,
      borderWidth: '2px',
    },
  },
}}
          />

        
        </Stack>

        {/* Row 3 — status chips (left) + view toggle (right) */}
        <Stack direction="row" sx={{ alignItems: 'center', mt: { xs: 1.75, md: 2 }, gap: 1, flexWrap: "wrap" }}>
        <Box sx={{
          display: "flex", gap: 0.75, alignItems: "center",
          flexWrap: { xs: "nowrap", md: "wrap" },
          overflowX: { xs: "auto", md: "visible" },
          pb: { xs: 0.5, md: 0 }, mr: "auto", minWidth: 0,
          "&::-webkit-scrollbar": { display: "none" },
        }}>
          {STATUS_CHIPS.map(([key, label]) => {
            const chipCount = key === "" ? apps.length : (counts[key] || 0);
            const selected = status === key;
            return (
              <Box
                key={key || "all"}
                onClick={() => setStatus(key)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setStatus(key)}
                sx={{
                  cursor: "pointer", userSelect: "none",
                  display: "inline-flex", alignItems: "center", gap: 0.6,
                  px: 1.5, py: 0.65, borderRadius: 999, flexShrink: 0,
                  fontSize: "0.8rem", fontWeight: selected ? 700 : 600,
                  fontFamily: FONT,
                  bgcolor: selected ? BRAND.navy : BRAND.surface,
                  color: selected ? "#fff" : BRAND.muted,
                  border: `1px solid ${selected ? BRAND.navy : BRAND.borderStrong}`,
                  transition: "all 0.16s ease",
                  "&:hover": {
                    bgcolor: selected ? BRAND.navy : BRAND.bg,
                    borderColor: selected ? BRAND.navy : BRAND.muted,
                  },
                }}
              >
                {label}
                <Box component="span" sx={{
                  fontSize: "0.68rem", fontWeight: 800, lineHeight: 1.6,
                  px: 0.7, borderRadius: 999,
                  bgcolor: selected ? "rgba(255,255,255,0.22)" : BRAND.bg,
                  color: selected ? "#fff" : BRAND.muted,
                }}>
                  {chipCount}
                </Box>
              </Box>
            );
          })}
        </Box>

          {/* View toggle — cards (Find Jobs look) vs table */}
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(e, m) => m && setViewMode(m)}
            sx={{
              height: 38, flexShrink: 0,
              bgcolor: BRAND.bg,
              border: `1px solid ${BRAND.border}`,
              borderRadius: "10px", p: "3px",
              "& .MuiToggleButton-root": {
                border: 0, borderRadius: "7px !important", m: 0,
                color: BRAND.muted, px: 1.25, height: 30,
                "&:hover": { bgcolor: "rgba(16,18,16,0.04)" },
                "&.Mui-selected": {
                  bgcolor: BRAND.surface, color: BRAND.navy,
                  boxShadow: "0 1px 3px rgba(16,18,16,0.12)",
                  "&:hover": { bgcolor: BRAND.surface },
                },
              },
            }}
          >
            <ToggleButton value="grid" aria-label="card view"><ViewModule sx={{ fontSize: 18 }} /></ToggleButton>
            <ToggleButton value="list" aria-label="table view"><ViewList sx={{ fontSize: 18 }} /></ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Paper>

      {/* Error banner with retry */}
      {error && (
        <Alert
          severity="error"
          sx={{ mb: { xs: 2, sm: 2.5 }, borderRadius: "8px" }}
          action={
            <Button color="inherit" size="small" onClick={loadApplications}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {/* Empty state — candidate hasn't applied to anything yet */}
      {!error && apps.length === 0 ? (
        <Box
          sx={{
            textAlign: "center",
            py: { xs: 6, sm: 8 },
            px: 2,
            border: "1px dashed #E0DCD3",
            borderRadius: "12px",
            bgcolor: "#FFFFFF",
          }}
        >
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              bgcolor: "#F0EEE9",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              mb: 2,
            }}
          >
            <WorkOutlineRounded sx={{ color: "#5A5752", fontSize: 26 }} />
          </Box>
          <Typography
            sx={{
              fontWeight: 600,
              fontSize: { xs: "0.95rem", sm: "1.05rem" },
              mb: 0.5,
            }}
          >
            No applications yet
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 2.5, fontSize: { xs: "0.78rem", sm: "0.875rem" } }}
          >
            Jobs you apply to will appear here so you can track their progress.
          </Typography>
          <Button
            variant="contained"
            disableElevation
            onClick={() => navigate("/jobseeker/find-jobs")}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              borderRadius: "8px",
              bgcolor: "#2C2C2A",
              "&:hover": { bgcolor: "#1A1A18" },
            }}
          >
            Browse jobs
          </Button>
        </Box>
      ) : (
        <>
          {viewMode === "grid" ? (
            /* ── Card grid — the Find Jobs look, one card per application ── */
            paged.length === 0 ? (
              <Box sx={{
                textAlign: "center", py: { xs: 5, sm: 7 }, px: 2,
                bgcolor: BRAND.surface, borderRadius: "16px",
                border: `1px dashed ${BRAND.borderStrong}`,
              }}>
                <Typography sx={{ mb: 1, color: BRAND.ink, fontWeight: 700, fontSize: { xs: "0.95rem", sm: "1.05rem" }, fontFamily: FONT }}>
                  No applications match
                </Typography>
                <Typography sx={{ mb: 2.5, color: BRAND.muted, fontSize: { xs: "0.78rem", sm: "0.875rem" }, fontFamily: FONT }}>
                  Try a different search or switch the status filter back to All.
                </Typography>
                <Button
                  variant="outlined"
                  onClick={() => { setSearch(""); setStatus(""); }}
                  sx={{
                    borderColor: BRAND.borderStrong, color: BRAND.ink, fontFamily: FONT,
                    textTransform: "none", fontWeight: 600, borderRadius: "10px",
                    "&:hover": { borderColor: BRAND.sage, bgcolor: BRAND.sageSoft },
                  }}
                >
                  Clear search & filters
                </Button>
              </Box>
            ) : (
              <Box sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, minmax(0, 1fr))",
                  md: "repeat(3, minmax(0, 1fr))",
                  lg: "repeat(4, minmax(0, 1fr))",
                },
                gap: { xs: 1.5, sm: 1.75, md: 2 },
                width: "100%",
              }}>
                {paged.map((app) => (
                  <Box key={app.id} sx={{ minWidth: 0, width: "100%" }}>
                    {renderAppCard(app)}
                  </Box>
                ))}
              </Box>
            )
          ) : (
            /* ── List — Find Jobs ledger-row style, one row per application ── */
            paged.length === 0 ? (
              <Box sx={{
                textAlign: "center", py: { xs: 5, sm: 7 }, px: 2,
                bgcolor: BRAND.surface, borderRadius: "16px",
                border: `1px dashed ${BRAND.borderStrong}`,
              }}>
                <Typography sx={{ mb: 1, color: BRAND.ink, fontWeight: 700, fontSize: { xs: "0.95rem", sm: "1.05rem" }, fontFamily: FONT }}>
                  No applications match
                </Typography>
                <Typography sx={{ mb: 2.5, color: BRAND.muted, fontSize: { xs: "0.78rem", sm: "0.875rem" }, fontFamily: FONT }}>
                  Try a different search or switch the status filter back to All.
                </Typography>
                <Button
                  variant="outlined"
                  onClick={() => { setSearch(""); setStatus(""); }}
                  sx={{
                    borderColor: BRAND.borderStrong, color: BRAND.ink, fontFamily: FONT,
                    textTransform: "none", fontWeight: 600, borderRadius: "10px",
                    "&:hover": { borderColor: BRAND.sage, bgcolor: BRAND.sageSoft },
                  }}
                >
                  Clear search & filters
                </Button>
              </Box>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: { xs: 1, sm: 1.25 } }}>
                {paged.map((app) => renderAppRow(app))}
              </Box>
            )
          )}

          {filtered.length > 0 && (
            /* ── Pagination bar — identical to Find Jobs / Saved Jobs /
                  AI Assessments: white card, pine accents, Jost. ── */
            <Box sx={{
              mt: { xs: 3, sm: 3.5 },
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              justifyContent: "space-between",
              alignItems: { xs: "stretch", sm: "center" },
              gap: { xs: 1.5, sm: 2 },
              fontFamily: FONT,
            }}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={{ xs: 1, sm: 2 }}
               
                sx={{ alignItems: { xs: "flex-start", sm: "center" }, flex: 1, minWidth: 0 }}
              >
                <Typography sx={{
                  fontSize: { xs: "0.78rem", sm: "0.82rem" },
                  color: BRAND.muted, fontWeight: 500, whiteSpace: "nowrap", fontFamily: FONT,
                }}>
                  Showing{" "}
                  <Box component="span" sx={{ color: BRAND.ink, fontWeight: 700 }}>
                    {(currentPage - 1) * effectivePageSize + 1}–
                    {Math.min(currentPage * effectivePageSize, filtered.length)}
                  </Box>
                  {" "}of{" "}
                  <Box component="span" sx={{ color: BRAND.ink, fontWeight: 700 }}>
                    {filtered.length}
                  </Box>
                  {" "}application{filtered.length === 1 ? "" : "s"}
                </Typography>

                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                  <Typography sx={{ fontSize: { xs: "0.78rem", sm: "0.82rem" }, color: BRAND.muted, fontWeight: 500, fontFamily: FONT }}>
                    Show
                  </Typography>
                  <Select
                    size="small"
                    value={pageSize}
                    onChange={(e) => {
                      const v = e.target.value;
                      setPageSize(v === "all" ? "all" : Number(v));
                    }}
                    renderValue={(v) => (v === "all" ? "All" : v)}
                    MenuProps={{
                      slotProps: { paper: {
                        sx: {
                          borderRadius: "12px",
                          mt: 0.5,
                          border: `1px solid ${BRAND.border}`,
                          boxShadow: "0 8px 24px rgba(2,33,36,0.12)",
                          "& .MuiMenuItem-root": {
                            fontSize: "0.82rem",
                            fontWeight: 600,
                            fontFamily: FONT,
                            color: BRAND.ink,
                            minHeight: { xs: 40, sm: 36 },
                            "&.Mui-selected": {
                              bgcolor: BRAND.sageSoft,
                              color: BRAND.navy,
                              "&:hover": { bgcolor: BRAND.sageSoft },
                            },
                          },
                        },
                      } } }}
                    sx={{
                      fontSize: "0.82rem", fontWeight: 700, fontFamily: FONT,
                      color: BRAND.navy, bgcolor: BRAND.bg,
                      borderRadius: "10px", minWidth: { xs: 76, sm: 80 },
                      height: { xs: 38, sm: 36 },
                      "& .MuiOutlinedInput-notchedOutline": { borderColor: BRAND.border },
                      "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: BRAND.borderStrong },
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: BRAND.sage, borderWidth: "1px" },
                      "& .MuiSelect-select": { py: 0.75, pl: 1.25, pr: "28px !important" },
                      "& .MuiSvgIcon-root": { color: BRAND.navy },
                    }}
                  >
                    {PAGE_SIZE_OPTIONS.map((n) => (
                      <MenuItem key={n} value={n}>{n === "all" ? "All" : n}</MenuItem>
                    ))}
                  </Select>
                  <Typography sx={{ fontSize: { xs: "0.78rem", sm: "0.82rem" }, color: BRAND.muted, fontWeight: 500, fontFamily: FONT }}>
                    per page
                  </Typography>
                </Stack>
              </Stack>

              <Pagination
                count={pageCount}
                page={currentPage}
                onChange={(_, value) => setPage(value)}
                size={isXs ? "small" : "medium"}
                shape="rounded"
                siblingCount={isXs ? 0 : 1}
                sx={{
                  "& .MuiPaginationItem-root": {
                    fontWeight: 700, fontFamily: FONT, borderRadius: "9px",
                    "&.Mui-selected": {
                      bgcolor: BRAND.navy, color: "#fff",
                      "&:hover": { bgcolor: BRAND.navyDark },
                    },
                  },
                }}
              />
            </Box>
          )}
        </>
      )}

      {/* 🔧 CHANGE 4/4 (cont.) — Withdraw confirmation dialog.
            Mounted once at the root; visibility driven by `confirmApp`.
            Cancel closes without side-effects. "Yes, Withdraw" runs the
            same optimistic-update flow that was previously called directly
            from the button. */}
      <Dialog
        open={Boolean(confirmApp)}
        onClose={closeWithdrawDialog}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: "12px",
              p: { xs: 0.5, sm: 1 },
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 600,
            fontSize: { xs: "1rem", sm: "1.1rem" },
            color: "#2C2C2A",
            pb: 1,
          }}
        >
          Withdraw application?
        </DialogTitle>
        <DialogContent sx={{ pb: 1.5 }}>
          <DialogContentText
            sx={{
              fontSize: { xs: "0.82rem", sm: "0.875rem" },
              color: "#5A5752",
              lineHeight: 1.5,
            }}
          >
            You’re about to withdraw your application
            {confirmApp?.job?.title ? (
              <>
                {" "}
                for{" "}
                <Box
                  component="span"
                  sx={{ fontWeight: 600, color: "#2C2C2A" }}
                >
                  {confirmApp.job.title}
                </Box>
              </>
            ) : null}
            {confirmApp?.job?.company_name ? (
              <>
                {" "}
                at{" "}
                <Box
                  component="span"
                  sx={{ fontWeight: 600, color: "#2C2C2A" }}
                >
                  {confirmApp.job.company_name}
                </Box>
              </>
            ) : null}
            . This action cannot be undone, but you can re-apply later from
            Find Jobs if the role is still open.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            onClick={closeWithdrawDialog}
            disabled={Boolean(withdrawing)}
            sx={{
              textTransform: "none",
              fontWeight: 500,
              color: "#5A5752",
              borderRadius: "8px",
              px: 2,
              "&:hover": { bgcolor: "#F0EEE9" },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={performWithdraw}
            disabled={Boolean(withdrawing)}
            variant="contained"
            disableElevation
            sx={{
              textTransform: "none",
              fontWeight: 600,
              bgcolor: "#A63D2F",
              color: "#FFFFFF",
              borderRadius: "8px",
              px: 2,
              "&:hover": { bgcolor: "#8B3327" },
              "&.Mui-disabled": {
                bgcolor: "#D8B4AE",
                color: "#FFFFFF",
              },
            }}
          >
            {withdrawing ? "Withdrawing…" : "Yes, Withdraw"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Applications;