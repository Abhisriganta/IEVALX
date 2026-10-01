import React, { useState, useMemo, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Avatar,
  Chip,
  Button,
  IconButton,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Pagination,
  ToggleButton,
  ToggleButtonGroup,
  Checkbox,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Divider,
  Stack,
  Menu,
  Alert,
  CircularProgress,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  ViewModule as ViewModuleIcon,
  ViewList as ViewListIcon,
  Download as DownloadIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Edit as EditIcon,
  VisibilityOff as UnpublishIcon,
  Visibility as ViewIcon,
  MoreVert as MoreVertIcon,
  Work as WorkIcon,
  LocationOn as LocationIcon,
  AttachMoney as SalaryIcon,
  Schedule as ScheduleIcon,
  Flag as FlagIcon,
  Business as BusinessIcon,
  Assignment as AssignmentIcon,
  HourglassEmpty as HourglassIcon,
  Public as PublicIcon,
  VisibilityOff as HiddenIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Badge as RoleIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Replay as ReplayIcon,
} from "@mui/icons-material";
import { useSnackbar } from "notistack";
import { useJobsApprovals } from "@/hooks/company/useJobsApprovals";
import { jobPost } from "@/services/api/company/jobPost";

// 🔁 Adjust the path below to wherever your employer JobForm lives.
import JobForm from "@/components/employer/MyJobs/JobForm";

/* ------------------------------------------------------------------ */
/* Display helpers                                                     */
/* ------------------------------------------------------------------ */
const statusColor = (s) => {
  switch (s) {
    case "Active":
      return "success";
    case "Pending Approval":
      return "warning";
    case "Draft":
      return "default";
    case "Rejected":
      return "error";
    case "Removed":
      return "error";
    default:
      return "default";
  }
};

const isLiveToStudents = (status) => status === "Active";
const isApprovedJob = (job) => job?.rawApprovalStatus === "APPROVED";
const isPending = (job) => job?.status === "Pending Approval";
const dash = (v) => (v == null || v === "" ? "—" : v);

const SAGE = "#7F9E7E"; 
const SAGE_DARK = "#6C8B6B";
const SAGE_SOFT = "#EDF3EC";
const CHARCOAL = "#101210"; 
const CHARCOAL_SOFT = "#55584F"; 
const SKIN = "#D8DDD4"; 
const SKIN_DARK = "#A35A2D"; 
const SKIN_SOFT = "#F6ECDF"; 
const OFF_WHITE = "#F6F8F3"; 

/* Shared design tokens — mapped to the new palette                    */
const C = {
  crystal: "#A35A2D",              
  muted: SAGE,                 
  casper: "#F0F2ED",           
  white: "#FFFFFF",
  pageBg: "#F6F8F3",
  cardBg: "#FFFFFF",
  tableHead: "#022124", // pine         
  rowHover: "#EDF3EC",
  border: "#E7EAE3",           
  borderSoft: "#F0F2ED",
  textDark: "#101210",
  textMid: "#55584F",
  textLight: "#7A7E76",
  danger: "#B4462F",
};

/* Shared elevations */
const SHADOW_SM = "0 1px 3px rgba(2,33,36,0.05)";
const SHADOW_MD = "0 8px 24px rgba(2,33,36,0.08)";
const SHADOW_LG = "0 24px 64px rgba(2,33,36,0.18)";
const SHADOW_CARD = "0 1px 3px rgba(2,33,36,0.05), 0 4px 12px rgba(2,33,36,0.04)";
const SHADOW_HEAD = "0 1px 2px rgba(16,18,16,0.04)";

const APPROVAL_STATUS = {
  Active:            { bg: "#EAF2E9", tx: "#3E6E3E", dot: SAGE },
  "Pending Approval":{ bg: "#F6ECDF", tx: "#A35A2D", dot: "#A35A2D" },
  Draft:             { bg: "#E8EFEF", tx: "#55584F", dot: "#A8ADA8" },
  Rejected:          { bg: "#FBECEA", tx: "#B4462F", dot: "#B4462F" },
  Removed:           { bg: "#FBECEA", tx: "#B4462F", dot: "#B4462F" },
};

const ACTION_ACCENT = {
  approve:   { c: SAGE,        h: SAGE_DARK },
  publish:   { c: SAGE,        h: SAGE_DARK },
  reject:    { c: "#B4462F",   h: "#8A3522" },
  unpublish: { c: "#A35A2D",   h: "#7A4422" },
  delete:    { c: "#B4462F",   h: "#8A3522" },
};

const inputSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "12px",
    bgcolor: C.white,
    boxShadow: SHADOW_SM,
    "& fieldset": { borderColor: C.border },
    "&:hover fieldset": { borderColor: SAGE },
    "&.Mui-focused fieldset": { borderColor: SAGE_DARK, borderWidth: 2 },
  },
  "& .MuiInputLabel-root.Mui-focused": { color: SAGE_DARK },
};

const StatusBadge = ({ status }) => {
  const s = APPROVAL_STATUS[status] || APPROVAL_STATUS.Draft;
  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.75,
        height: { xs: 22, sm: 24 },
        px: { xs: 1, sm: 1.25 },
        borderRadius: "999px",
        bgcolor: s.bg,
        color: s.tx,
        fontSize: { xs: "0.66rem", sm: "0.72rem" },
        fontWeight: 700,
        whiteSpace: "nowrap",
        boxShadow: "inset 0 0 0 1px rgba(39,50,56,0.04)",
      }}
    >
      <Box
        component="span"
        sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: s.dot }}
      />
      {status}
    </Box>
  );
};


/* ------------------------------------------------------------------ */
/* Edit-Requests Panel (inline subcomponent)                           */
/* ------------------------------------------------------------------ */
const formatRequestedAt = (iso) => {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(iso);
  }
};

const initials = (name) => {
  if (!name) return "?";
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};


/* ------------------------------------------------------------------ */
/* Detail-dialog section helpers                                       */
/* ------------------------------------------------------------------ */
const SectionHead = ({ icon, title }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 1.5 }}>
    <Box
      sx={{
        width: 32,
        height: 32,
        borderRadius: "10px",
        bgcolor: SAGE_SOFT,
        color: SAGE_DARK,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {icon}
    </Box>
    <Typography
      sx={{
        fontWeight: 700,
        color: C.textDark,
        fontSize: { xs: "0.95rem", sm: "1rem" },
      }}
    >
      {title}
    </Typography>
  </Box>
);

const InfoTile = ({ label, value }) => (
  <Box
    sx={{
      p: 1.25,
      borderRadius: "10px",
      bgcolor: OFF_WHITE,
      border: `1px solid ${C.borderSoft}`,
      minHeight: 64,
    }}
  >
    <Typography
      sx={{
        fontSize: "0.66rem",
        fontWeight: 700,
        color: C.textLight,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        mb: 0.5,
        display: "block",
      }}
    >
      {label}
    </Typography>
    <Typography
      sx={{
        fontSize: { xs: "0.82rem", sm: "0.875rem" },
        color: C.textDark,
        fontWeight: 600,
        lineHeight: 1.45,
        wordBreak: "break-word",
      }}
    >
      {value == null || value === "" ? "—" : value}
    </Typography>
  </Box>
);

const sectionPaperSx = {
  p: { xs: 1.75, sm: 2.25 },
  mt: 2.25,
  borderRadius: "14px",
  border: `1px solid ${C.border}`,
  boxShadow: SHADOW_SM,
  bgcolor: "#fff",
};

const tilesGridSx = {
  display: "grid",
  gridTemplateColumns: {
    xs: "1fr",
    sm: "repeat(2, minmax(0, 1fr))",
    md: "repeat(3, minmax(0, 1fr))",
  },
  gap: 1.25,
};

/* ------------------------------------------------------------------ */
/* MAIN COMPONENT                                                      */
/* ------------------------------------------------------------------ */
const JobsApprovals = () => {
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const {
    loading,
    error,

    search,
    setSearch,
    employerFilter,
    setEmployerFilter,
    statusFilter,
    setStatusFilter,
    tab,
    setTab,

    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,

    selected,
    toggleSelectAll,
    toggleSelect,
    clearSelection,

    approveJob,
    rejectJob,
    publishJob,
    unpublishJob,
    updateJob,
    deleteJob,
    bulkApprove,

    stats,
    uniqueEmployers,
    jobs = [],
    filtered,
    paginated,

    refetch,

    isCompanyLogin,
    viewerCompanyId,
  } = useJobsApprovals();
    const [detailDialog, setDetailDialog] = useState(null);
  const [detailExtra, setDetailExtra] = useState(null);
  const [actionDialog, setActionDialog] = useState(null);
  useEffect(() => {
    if (!detailDialog?.id) {
      setDetailExtra(null);
      return;
    }
    let cancelled = false;
    setDetailExtra(null);
    jobPost
      .getJobPosting(detailDialog.id)
      .then((res) => {
        if (!cancelled) setDetailExtra(res?.data ?? res ?? null);
      })
      .catch(() => {
        if (!cancelled) setDetailExtra(null);
      });
    return () => { cancelled = true; };
  }, [detailDialog?.id]);
  const [editDialog, setEditDialog] = useState(null);
  const [bulkApproveConfirm, setBulkApproveConfirm] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuJob, setMenuJob] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleAction = (job, action) => {
        if (action === "publish" && job.daysLeft != null && job.daysLeft <= 0) {
      enqueueSnackbar(
                "Deadline has passed — update it to a future date, then publish.",
        { variant: "warning" },
      );
      return;
    }
    setActionDialog({ job, action });
    setRejectReason("");
  };

  const confirmAction = async () => {
    const { job, action } = actionDialog;
    setSubmitting(true);
    try {
      let msg = "";
      let variant = "success";

      switch (action) {
        case "approve":
          await approveJob(job);
          msg = `"${job.title}" approved — now live on the student portal`;
          break;
        case "reject":
          await rejectJob(job, rejectReason);
          msg = `"${job.title}" rejected — ${job.employer.name} has been notified`;
          variant = "warning";
          break;
        case "publish":
          await publishJob(job);
          msg = `"${job.title}" is now live on the student portal`;
          break;
        case "unpublish":
          await unpublishJob(job);
          msg = `"${job.title}" is no longer visible to students`;
          variant = "info";
          break;
        case "delete":
          await deleteJob(job);
          msg = `"${job.title}" has been permanently deleted`;
          variant = "info";
          break;
        default:
          break;
      }
      enqueueSnackbar(msg, { variant });
      setActionDialog(null);
    } catch (err) {
      enqueueSnackbar(
        err?.friendlyMessage || err?.message || "Action failed.",
        { variant: "error" },
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkApprove = async () => {
    setSubmitting(true);
    try {
      const { approvedCount, skipped } = await bulkApprove();
      let message = `${approvedCount} job(s) approved and published to student portal`;
      if (skipped?.length) message += ` — ${skipped.length} skipped`;
      enqueueSnackbar(message, {
        variant: approvedCount > 0 ? "success" : "warning",
      });
      setBulkApproveConfirm(false);
    } catch (err) {
      enqueueSnackbar(
        err?.friendlyMessage || err?.message || "Bulk approve failed.",
        { variant: "error" },
      );
    } finally {
      setSubmitting(false);
    }
  };

  const openMenu = (e, j) => {
    setMenuAnchor(e.currentTarget);
    setMenuJob(j);
  };
  const closeMenu = () => {
    setMenuAnchor(null);
    setMenuJob(null);
  };
  const openEdit = (job) => {
    setEditDialog(job);
  };

  const handleEditSubmit = async (payload) => {
    if (!editDialog) return;
    try {
      await updateJob(editDialog.id, payload);
      enqueueSnackbar(`"${editDialog.title}" updated successfully`, {
        variant: "success",
      });
      setEditDialog(null);
    } catch (err) {
      throw err;
    }
  };

  const dialogTitle = (action) => {
    switch (action) {
      case "approve":
        return "Approve & Publish to Students";
      case "reject":
        return "Reject Job Posting";
      case "publish":
        return "Make Job Live";
      case "unpublish":
        return "Move Job to Draft";
      case "delete":
        return "Delete Job";
      default:
        return "";
    }
  };

  const dialogVerb = (action) => {
    switch (action) {
      case "approve":
        return "approve and publish";
      case "reject":
        return "reject";
      case "publish":
        return "make live";
      case "unpublish":
        return "take offline";
      case "delete":
        return "permanently delete";
      default:
        return "";
    }
  };

  const confirmButtonLabel = (action) => {
    switch (action) {
      case "approve":
        return "Approve & Publish";
      case "reject":
        return "Confirm Rejection";
      case "publish":
        return "Make Live";
      case "unpublish":
        return "Take Offline";
      case "delete":
        return "Delete Permanently";
      default:
        return "Confirm";
    }
  };

  const confirmButtonColor = (action) => {
    switch (action) {
      case "approve":
        return "success";
      case "reject":
        return "error";
      case "publish":
        return "success";
      case "unpublish":
        return "warning";
      case "delete":
        return "error";
      default:
        return "primary";
    }
  };


  const FONT = "'Jost','DM Sans',sans-serif";

  /* ── FindJobs-style view + pagination adapters ── */
  const [viewMode, setViewMode] = useState('grid');
  const pageSizeChoice = rowsPerPage >= 100000 ? 'all' : rowsPerPage;
  const effectivePageSize = pageSizeChoice === 'all' ? Math.max(filtered.length, 1) : rowsPerPage;
  const totalPages = Math.max(1, Math.ceil(filtered.length / effectivePageSize));

  const localCounts = useMemo(() => ({
    all:     jobs.length,
    pending: jobs.filter((j) => j.status === 'Pending Approval').length,
    live:    jobs.filter((j) => j.status === 'Active').length,
    draft:   jobs.filter((j) => j.status === 'Draft').length,
    flagged: jobs.filter((j) => j.flagged).length,
  }), [jobs]);

  return (
    <Box
      className="page-fade-in"
      sx={{
        p: { xs: 1.5, sm: 2, md: 3, lg: 4 },
        maxWidth: 1440, mx: 'auto',
        bgcolor: C.pageBg,
        minHeight: "100vh",
        fontFamily: FONT,
        '& .MuiTypography-root, & .MuiButton-root, & .MuiTab-root, & .MuiChip-root, & .MuiInputBase-root, & .MuiMenuItem-root': { fontFamily: FONT },
      }}
    >
      {/* ── Command header (FindJobs exact) ──────────────────── */}
      <Paper
        elevation={0}
        sx={{
          bgcolor: C.white,
          border: `1px solid ${C.border}`,
          borderRadius: { xs: '14px', sm: '16px' },
          p: { xs: 2, sm: 2.5, md: 3 },
          mb: { xs: 2, md: 2.5 },
          boxShadow: SHADOW_HEAD,
        }}
      >
        {/* Row 1 — Title + actions */}
        <Box sx={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          gap: 1.5, mb: { xs: 2, md: 2.25 }, flexWrap: 'wrap',
        }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography component="h1" sx={{
              fontWeight: 700, color: C.textDark,
              letterSpacing: '-0.02em', lineHeight: 1.15,
              fontSize: { xs: '1.3rem', sm: '1.45rem', md: '1.6rem' },
            }}>
              Jobs &amp; Approvals
            </Typography>
            <Typography sx={{
              color: C.textMid, mt: 0.5,
              fontSize: { xs: '0.82rem', sm: '0.9rem' }, fontWeight: 500,
            }}>
              <Box component="span" sx={{ color: SAGE_DARK, fontWeight: 700 }}>
                {localCounts.pending} pending
              </Box>
              {' · '}{localCounts.all} total jobs · {localCounts.live} live
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexShrink: 0, mt: 0.5 }}>
            <Tooltip title="Refresh" arrow>
              <span>
                <IconButton onClick={refetch} size="small" sx={{
                  color: C.textMid, border: `1px solid #D8DDD4`, borderRadius: '9px',
                  '&:hover': { bgcolor: SAGE_SOFT, color: '#022124', borderColor: SAGE },
                }}>
                  <RefreshIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </span>
            </Tooltip>
            {localCounts.pending > 0 && (
              <Button
                variant="contained"
                startIcon={<HourglassIcon sx={{ fontSize: 18 }} />}
                onClick={() => { setTab(1); setPage(0); }}
                disableElevation
                sx={{
                  bgcolor: '#022124', color: '#fff',
                  fontWeight: 700, borderRadius: '12px',
                  px: { xs: 1.75, sm: 2.25 }, py: { xs: 0.85, sm: 0.95 },
                  textTransform: 'none',
                  fontSize: { xs: '0.82rem', sm: '0.88rem' },
                  letterSpacing: '0.005em',
                  '&:hover': { bgcolor: '#0A3A38' },
                }}
              >
                Review {localCounts.pending} Pending
              </Button>
            )}
          </Box>
        </Box>

        {/* Row 2 — Search pill + employer + status selects */}
        <Box sx={{ display: 'flex', gap: 1, mb: { xs: 1.75, md: 2 }, flexWrap: 'wrap', alignItems: 'stretch' }}>
          <TextField
            placeholder="Search by job title, employer, location, skill…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: C.textMid, fontSize: 20 }} /></InputAdornment>,
                endAdornment: search ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearch('')} sx={{ color: C.textMid, '&:hover': { color: C.textDark } }}>
                      <ClearIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              },
            }}
            sx={{
              flex: '1 1 300px', minWidth: { xs: '100%', sm: 260 },
              '& .MuiOutlinedInput-root': {
                bgcolor: C.pageBg, borderRadius: '25px',
                fontSize: { xs: '0.88rem', sm: '0.92rem' }, height: { xs: 46, md: 48 },
                color: C.textDark, fontFamily: FONT,
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                '& input::placeholder': { color: C.textMid, opacity: 0.85 },
                '& fieldset': { borderColor: '#B0BEC5', borderWidth: '1.5px' },
                '&:hover fieldset': { borderColor: '#78909C', borderWidth: '2px' },
                '&.Mui-focused': { boxShadow: '0 6px 18px rgba(0,0,0,0.12)' },
                '&.Mui-focused fieldset': { borderColor: SAGE, borderWidth: '2px' },
              },
            }}
          />
          <FormControl size="small" sx={{
            minWidth: { xs: '100%', sm: 190 }, flexShrink: 0,
            '& .MuiOutlinedInput-root': {
              bgcolor: C.white, borderRadius: '10px',
              fontSize: '0.82rem', height: { xs: 46, md: 48 }, color: C.textDark, fontFamily: FONT,
              '& fieldset': { borderColor: '#D8DDD4' },
              '&:hover fieldset': { borderColor: C.textMid },
              '&.Mui-focused fieldset': { borderColor: SAGE, borderWidth: 1.5 },
            },
            '& .MuiInputLabel-root': { fontSize: '0.82rem' },
            '& .MuiInputLabel-root.Mui-focused': { color: SAGE_DARK },
          }}>
            <InputLabel>Employer</InputLabel>
            <Select
              value={employerFilter}
              label="Employer"
              onChange={(e) => { setEmployerFilter(e.target.value); setPage(0); }}
            >
              <MenuItem value="all">All Employers</MenuItem>
              {uniqueEmployers.map((e) => (
                <MenuItem key={e.id} value={e.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar src={e.avatarUrl || undefined} sx={{ bgcolor: e.avatarColor || SAGE, width: 24, height: 24, fontSize: 11, color: '#fff' }}>
                      {e.avatar}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" sx={{ color: C.textDark }}>{e.name}</Typography>
                      <Typography variant="caption" sx={{ color: C.textLight }}>{dash(e.location)}</Typography>
                    </Box>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Row 3 — Tab pills + view toggle */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Box sx={{
            display: 'flex', gap: 0.75, alignItems: 'center',
            flexWrap: { xs: 'nowrap', sm: 'wrap' },
            overflowX: { xs: 'auto', sm: 'visible' },
            pb: { xs: 0.5, sm: 0 }, mr: 'auto',
            '&::-webkit-scrollbar': { display: 'none' },
          }}>
            {[
              { label: 'All', count: localCounts.all },
              { label: 'Pending', count: localCounts.pending },
              { label: 'Live', count: localCounts.live },
              { label: 'Drafts', count: localCounts.draft },
            ].map((opt, i) => {
              const sel = tab === i;
              return (
                <Box key={opt.label} onClick={() => { setTab(i); setPage(0); }} role="button" tabIndex={0}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (setTab(i), setPage(0))}
                  sx={{
                    cursor: 'pointer', userSelect: 'none',
                    display: 'inline-flex', alignItems: 'center', gap: 0.6,
                    px: 1.5, py: 0.65, borderRadius: 999, flexShrink: 0,
                    fontSize: '0.8rem', fontWeight: sel ? 700 : 600, fontFamily: FONT,
                    bgcolor: sel ? '#022124' : C.white,
                    color: sel ? '#fff' : C.textMid,
                    border: `1px solid ${sel ? '#022124' : '#D8DDD4'}`,
                    transition: 'all 0.16s ease',
                    '&:hover': { bgcolor: sel ? '#022124' : C.pageBg, borderColor: sel ? '#022124' : C.textMid },
                  }}
                >
                  {opt.label}
                  <Box component="span" sx={{
                    fontSize: '0.68rem', fontWeight: 800, lineHeight: 1.6, px: 0.7, borderRadius: 999,
                    bgcolor: sel ? 'rgba(255,255,255,0.22)' : C.pageBg,
                    color: sel ? '#fff' : C.textMid,
                  }}>
                    {opt.count}
                  </Box>
                </Box>
              );
            })}
          </Box>

          <ToggleButtonGroup value={viewMode} exclusive onChange={(e, v) => v && setViewMode(v)} sx={{
            height: 38, flexShrink: 0, bgcolor: C.pageBg,
            border: `1px solid ${C.border}`, borderRadius: '10px', p: '3px',
            '& .MuiToggleButton-root': {
              border: 0, borderRadius: '7px !important', m: 0, color: C.textMid, px: 1.25, height: 30,
              '&:hover': { bgcolor: 'rgba(16,18,16,0.04)' },
              '&.Mui-selected': { bgcolor: C.white, color: '#022124', boxShadow: '0 1px 3px rgba(16,18,16,0.12)', '&:hover': { bgcolor: C.white } },
            },
          }}>
            <ToggleButton value="grid"><ViewModuleIcon sx={{ fontSize: 18 }} /></ToggleButton>
            <ToggleButton value="list"><ViewListIcon sx={{ fontSize: 18 }} /></ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Paper>

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2, borderRadius: '12px' }}
          action={<Button size="small" onClick={refetch} sx={{ color: '#B4462F', fontWeight: 700, textTransform: 'none' }}>Retry</Button>}
        >
          {error.friendlyMessage || 'Failed to load jobs.'}
        </Alert>
      )}

      {localCounts.flagged > 0 && (
        <Alert
          severity="warning"
          sx={{
            mb: 2, borderRadius: '12px',
            bgcolor: '#F6ECDF', color: C.textDark,
            border: `1px solid ${C.border}`,
            '& .MuiAlert-icon': { color: '#A35A2D' },
          }}
          icon={<FlagIcon />}
        >
          <strong>{localCounts.flagged} job(s) flagged</strong> for policy review. Please inspect before approving.
        </Alert>
      )}

      {/* ── Body ──────────────────────────────────────── */}
      {(
        <>
          {/* Select-all / bulk approve bar */}
          {filtered.length > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: { xs: 1.5, md: 2 }, minHeight: 36, flexWrap: 'wrap' }}>
              <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
                <Checkbox
                  indeterminate={selected.length > 0 && selected.length < paginated.length}
                  checked={paginated.length > 0 && selected.length === paginated.length}
                  onChange={(e) => toggleSelectAll(paginated, e.target.checked)}
                  size="small"
                  sx={{ color: '#D8DDD4', '&.Mui-checked, &.MuiCheckbox-indeterminate': { color: SAGE } }}
                />
                <Typography sx={{ color: C.textMid, fontSize: '0.82rem', fontWeight: 500 }}>Select all</Typography>
              </Box>
              {selected.length > 0 && (
                <>
                  <Chip
                    label={`${selected.length} selected`}
                    onDelete={clearSelection}
                    size="small"
                    sx={{
                      fontWeight: 700, bgcolor: SAGE_SOFT, color: SAGE_DARK,
                      border: `1px solid ${SAGE}`, fontFamily: FONT,
                      '& .MuiChip-deleteIcon': { color: SAGE_DARK },
                    }}
                  />
                  <Button
                    size="small" variant="contained" disableElevation
                    startIcon={<ApproveIcon sx={{ fontSize: 16 }} />}
                    onClick={() => setBulkApproveConfirm(true)}
                    disabled={submitting}
                    sx={{
                      textTransform: 'none', fontWeight: 700, borderRadius: '10px',
                      bgcolor: '#022124', color: '#fff', fontFamily: FONT,
                      '&:hover': { bgcolor: '#0A3A38' },
                    }}
                  >
                    Approve &amp; Publish
                  </Button>
                </>
              )}
            </Box>
          )}

          {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1, '& .MuiLinearProgress-bar': { bgcolor: SAGE } }} />}

          {/* ── Results ──────────────────────────────── */}
          {filtered.length === 0 ? (
            <Paper elevation={0} sx={{
              textAlign: 'center', py: 8, px: 3, borderRadius: '14px',
              border: `1px solid ${C.border}`, bgcolor: C.white,
            }}>
              <Box sx={{ width: 64, height: 64, borderRadius: '50%', bgcolor: SAGE_SOFT, mx: 'auto', mb: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <SearchIcon sx={{ fontSize: 30, color: SAGE }} />
              </Box>
              <Typography sx={{ fontWeight: 700, color: C.textDark, mb: 0.75, fontSize: '1.0625rem' }}>
                No matching jobs
              </Typography>
              <Typography sx={{ color: C.textMid, mb: 3, fontSize: '0.875rem' }}>
                Try adjusting your search or filters.
              </Typography>
              {(statusFilter !== 'all' || employerFilter !== 'all' || search) && (
                <Button variant="outlined" onClick={() => { setSearch(''); setStatusFilter('all'); setEmployerFilter('all'); }} sx={{
                  borderColor: '#022124', color: '#022124', textTransform: 'none', fontWeight: 500, px: 3, borderRadius: '10px',
                  '&:hover': { borderColor: '#0A3A38', bgcolor: SAGE_SOFT },
                }}>Reset filters</Button>
              )}
            </Paper>
          ) : (
            <>
              <Box sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: viewMode === 'grid' ? 'repeat(2, minmax(0, 1fr))' : '1fr',
                  md: viewMode === 'grid' ? 'repeat(3, minmax(0, 1fr))' : '1fr',
                  lg: viewMode === 'grid' ? 'repeat(4, minmax(0, 1fr))' : '1fr',
                },
                gap: { xs: 1.5, sm: 1.75, md: 2 }, width: '100%',
              }}>
                {paginated.map((j) => {
                  const live = isLiveToStudents(j.status);
                  const isSel = selected.includes(j.id);
                  return (
                    <Card
                      key={j.id}
                      elevation={0}
                      onClick={() => setDetailDialog(j)}
                      sx={{
                        borderRadius: '14px',
                        border: `1px solid ${isSel ? SAGE : C.border}`,
                        bgcolor: C.white,
                        p: { xs: 1.75, sm: 2, md: 2.25 },
                        boxShadow: '0 1px 3px rgba(2,33,36,0.05), 0 4px 12px rgba(2,33,36,0.04)',
                        transition: 'transform 0.25s cubic-bezier(0.22,1,0.36,1), box-shadow 0.25s ease, border-color 0.18s ease',
                        cursor: 'pointer',
                        display: 'flex', flexDirection: 'column',
                        '&:hover': {
                          transform: 'translateY(-3px)',
                          borderColor: SAGE,
                          boxShadow: '0 8px 24px rgba(2,33,36,0.08), 0 2px 6px rgba(127,158,126,0.10)',
                        },
                        '@media (prefers-reduced-motion: reduce)': {
                          transition: 'none',
                          '&:hover': { transform: 'none' },
                        },
                      }}
                    >
                      {/* Top — checkbox + avatar + title + menu */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, mb: { xs: 1.25, sm: 1.5 } }}>
                        <Box sx={{ display: 'flex', gap: 1.25, minWidth: 0, flex: 1, alignItems: 'flex-start' }}>
                          <Checkbox
                            checked={isSel}
                            onClick={(e) => { e.stopPropagation(); toggleSelect(j.id); }}
                            size="small"
                            sx={{ p: 0.25, mt: 0.25, color: '#D8DDD4', '&.Mui-checked': { color: SAGE } }}
                          />
                          <Avatar
                            src={j.employer.avatarUrl || j.employer.company_logo_url || j.company_logo_url || undefined}
                            variant="rounded"
                            sx={{
                              width: { xs: 38, sm: 42 }, height: { xs: 38, sm: 42 }, flexShrink: 0,
                              bgcolor: j.employer.avatarColor || SAGE, color: '#fff',
                              fontWeight: 700, fontSize: { xs: '0.85rem', sm: '0.95rem' },
                              borderRadius: '10px',
                            }}
                          >
                            {j.employer.avatar}
                          </Avatar>
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Tooltip title={j.title || '—'} arrow enterDelay={300} placement="top-start">
                              <Typography sx={{
                                fontWeight: 700, mb: 0.25, fontFamily: FONT,
                                fontSize: { xs: '0.88rem', sm: '0.95rem', md: '1rem' },
                                color: C.textDark, overflow: 'hidden', textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap', lineHeight: 1.3,
                              }}>
                                {j.title || '—'}
                              </Typography>
                            </Tooltip>
                            <Tooltip title={`${j.employer.name}${j.employer.location ? ' · ' + j.employer.location : ''}`} arrow enterDelay={300} placement="bottom-start">
                              <Typography sx={{
                                fontSize: { xs: '0.74rem', sm: '0.8rem' },
                                color: C.textMid, fontFamily: FONT,
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              }}>
                                {j.employer.name}{j.employer.location ? ` · ${j.employer.location}` : ''}
                              </Typography>
                            </Tooltip>
                          </Box>
                        </Box>
                        <IconButton
                          size="small"
                          onClick={(e) => { e.stopPropagation(); openMenu(e, j); }}
                          sx={{ color: C.textMid, '&:hover': { bgcolor: 'rgba(127,158,126,0.10)', color: '#022124' } }}
                        >
                          <MoreVertIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Box>

                      {/* Status + visibility row */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: { xs: 1.25, sm: 1.5 }, flexWrap: 'wrap' }}>
                        <StatusBadge status={j.status} />
                        {live ? (
                          <Box component="span" sx={{
                            display: 'inline-flex', alignItems: 'center', gap: 0.5,
                            height: 24, px: 1, borderRadius: '8px',
                            bgcolor: SAGE_SOFT, color: SAGE_DARK,
                            fontSize: '0.7rem', fontWeight: 700, fontFamily: FONT,
                            border: `1px solid ${C.border}`,
                          }}>
                            <PublicIcon sx={{ fontSize: 13 }} /> Live
                          </Box>
                        ) : (
                          <Box component="span" sx={{
                            display: 'inline-flex', alignItems: 'center', gap: 0.5,
                            height: 24, px: 1, borderRadius: '8px',
                            bgcolor: '#F0F2ED', color: C.textLight,
                            fontSize: '0.7rem', fontWeight: 600, fontFamily: FONT,
                          }}>
                            <HiddenIcon sx={{ fontSize: 13 }} /> Hidden
                          </Box>
                        )}
                        {j.flagged && (
                          <Tooltip title={j.flagReason || 'Flagged for review'} arrow>
                            <Box component="span" sx={{
                              display: 'inline-flex', alignItems: 'center', gap: 0.5,
                              height: 24, px: 1, borderRadius: '8px',
                              bgcolor: '#FBECEA', color: '#B4462F',
                              fontSize: '0.7rem', fontWeight: 700, fontFamily: FONT,
                            }}>
                              <FlagIcon sx={{ fontSize: 12 }} /> Flagged
                            </Box>
                          </Tooltip>
                        )}
                      </Box>

                      {/* Meta row — submitted date + applicants */}
                      <Box sx={{
                        display: 'flex', gap: { xs: 1.25, sm: 2 },
                        mb: { xs: 1.25, sm: 1.5 }, flexWrap: 'wrap',
                      }}>
                        {j.submittedOn && (
                          <Tooltip title={`Submitted on ${j.submittedOn}`} arrow enterDelay={300}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: C.textMid, minWidth: 0, cursor: 'default' }}>
                              <ScheduleIcon sx={{ fontSize: { xs: 13, sm: 14 } }} />
                              <Typography sx={{
                                fontSize: { xs: '0.7rem', sm: '0.74rem' }, fontWeight: 500, fontFamily: FONT,
                              }}>
                                {j.submittedOn}
                              </Typography>
                            </Box>
                          </Tooltip>
                        )}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: C.textMid, minWidth: 0 }}>
                          <AssignmentIcon sx={{ fontSize: { xs: 13, sm: 14 } }} />
                          <Typography sx={{
                            fontSize: { xs: '0.7rem', sm: '0.74rem' }, fontWeight: 600, fontFamily: FONT,
                          }}>
                            {j.applicants ?? 0} applicant{(j.applicants ?? 0) === 1 ? '' : 's'}
                          </Typography>
                        </Box>
                      </Box>

                      {/* Footer — view */}
                      <Box sx={{
                        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                        pt: { xs: 1.25, sm: 1.5 }, mt: 'auto', borderTop: `1px solid ${C.border}`,
                      }}>
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: SAGE_DARK, fontWeight: 700, fontSize: '0.74rem', fontFamily: FONT }}>
                          View <ViewIcon sx={{ fontSize: 14 }} />
                        </Box>
                      </Box>
                    </Card>
                  );
                })}
              </Box>

              {/* ── Pagination bar (FindJobs exact) ────────────── */}
              <Box sx={{
                mt: { xs: 3, sm: 3.5, md: 4 }, display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between',
                alignItems: { xs: 'stretch', sm: 'center' }, gap: { xs: 1.5, sm: 2 },
              }}>
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 1, sm: 2 }, alignItems: { xs: 'flex-start', sm: 'center' }, flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: { xs: '0.78rem', sm: '0.82rem' }, color: C.textMid, fontWeight: 500, whiteSpace: 'nowrap' }}>
                    Showing{' '}<Box component="span" sx={{ color: C.textDark, fontWeight: 700 }}>{page * effectivePageSize + 1}–{Math.min((page + 1) * effectivePageSize, filtered.length)}</Box>
                    {' '}of{' '}<Box component="span" sx={{ color: C.textDark, fontWeight: 700 }}>{filtered.length}</Box>{' '}jobs
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
                    <Typography sx={{ fontSize: { xs: '0.78rem', sm: '0.82rem' }, color: C.textMid, fontWeight: 500 }}>Show</Typography>
                    <Select size="small" value={pageSizeChoice}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === 'all') { setRowsPerPage(100000); } else { setRowsPerPage(Number(v)); }
                        setPage(0);
                      }}
                      renderValue={(v) => (v === 'all' ? 'All' : v)}
                      MenuProps={{ slotProps: { paper: { sx: {
                        borderRadius: '12px', mt: 0.5, border: `1px solid ${C.border}`, boxShadow: '0 8px 24px rgba(2,33,36,0.12)',
                        '& .MuiMenuItem-root': { fontSize: '0.82rem', fontWeight: 600, fontFamily: FONT, color: C.textDark, minHeight: { xs: 40, sm: 36 },
                          '&.Mui-selected': { bgcolor: 'rgba(127,158,126,0.10)', color: '#022124', '&:hover': { bgcolor: 'rgba(127,158,126,0.10)' } },
                        },
                      } } } }}
                      sx={{
                        fontSize: '0.82rem', fontWeight: 700, fontFamily: FONT, color: '#022124',
                        bgcolor: C.pageBg, borderRadius: '10px', minWidth: { xs: 76, sm: 80 }, height: { xs: 38, sm: 36 },
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: C.border },
                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#022124' },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#022124', borderWidth: '1px' },
                        '& .MuiSelect-select': { py: 0.75, pl: 1.25, pr: '28px !important' },
                        '& .MuiSvgIcon-root': { color: '#022124' },
                      }}
                    >
                      {[5, 10, 25, 50, 'all'].map((opt) => <MenuItem key={opt} value={opt}>{opt === 'all' ? 'All' : opt}</MenuItem>)}
                    </Select>
                    <Typography sx={{ fontSize: { xs: '0.78rem', sm: '0.82rem' }, color: C.textMid, fontWeight: 500 }}>per page</Typography>
                  </Box>
                </Box>
                <Pagination count={totalPages} page={page + 1} onChange={(_e, v) => setPage(v - 1)} shape="rounded" siblingCount={1} boundaryCount={1} size="small"
                  sx={{
                    '& .MuiPaginationItem-root': {
                      fontSize: { xs: '0.75rem', sm: '0.82rem' }, fontWeight: 600, fontFamily: FONT, color: C.textDark,
                      borderRadius: '8px', border: `1px solid ${C.border}`, bgcolor: C.pageBg,
                      minWidth: { xs: 32, sm: 36 }, height: { xs: 32, sm: 36 },
                      '&:hover': { bgcolor: 'rgba(127,158,126,0.10)', borderColor: SAGE },
                      '&.Mui-selected': { bgcolor: '#022124', color: '#fff', borderColor: '#022124', fontWeight: 700, boxShadow: '0 4px 12px rgba(2,33,36,0.2)', '&:hover': { bgcolor: '#0A3A38' } },
                    },
                    '& .MuiPaginationItem-ellipsis': { border: 'none', bgcolor: 'transparent' },
                  }}
                />
              </Box>
            </>
          )}
        </>
      )}

      {/* State-aware Action Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={closeMenu}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: {
            sx: {
              minWidth: 220,
              mt: 0.5,
              borderRadius: "12px",
              boxShadow: SHADOW_LG,
              border: `1px solid ${C.border}`,
            },
          },
        }}
      >
        <MenuItem
          onClick={() => {
            setDetailDialog(menuJob);
            closeMenu();
          }}
          sx={{ color: C.textDark, "&:hover": { bgcolor: SAGE_SOFT } }}
        >
          <ViewIcon
            fontSize="small"
            sx={{ mr: 1.25, color: C.textMid }}
          />
          View Details
        </MenuItem>

        <MenuItem
          onClick={() => {
            openEdit(menuJob);
            closeMenu();
          }}
          sx={{ color: C.textDark, "&:hover": { bgcolor: SAGE_SOFT } }}
        >
          <EditIcon
            fontSize="small"
            sx={{ mr: 1.25, color: C.textMid }}
          />
          Edit
        </MenuItem>

        {menuJob && isPending(menuJob) && <Divider sx={{ my: 0.5 }} />}
        {menuJob && isPending(menuJob) && (
          <MenuItem
            onClick={() => {
              handleAction(menuJob, "approve");
              closeMenu();
            }}
            sx={{ color: SAGE_DARK, "&:hover": { bgcolor: SAGE_SOFT } }}
          >
            <ApproveIcon fontSize="small" sx={{ mr: 1.25 }} />
            Approve & Publish
          </MenuItem>
        )}
        {menuJob && isPending(menuJob) && (
          <MenuItem
            onClick={() => {
              handleAction(menuJob, "reject");
              closeMenu();
            }}
            sx={{ color: "#B4462F", "&:hover": { bgcolor: "#FBECEA" } }}
          >
            <RejectIcon fontSize="small" sx={{ mr: 1.25 }} />
            Reject
          </MenuItem>
        )}

        {menuJob && !isPending(menuJob) && isApprovedJob(menuJob) && (
          <Divider sx={{ my: 0.5 }} />
        )}
        {menuJob &&
          !isPending(menuJob) &&
          isApprovedJob(menuJob) &&
          (isLiveToStudents(menuJob.status) ? (
            <MenuItem
              onClick={() => {
                handleAction(menuJob, "unpublish");
                closeMenu();
              }}
              sx={{ color: "#A35A2D", "&:hover": { bgcolor: "#F6ECDF" } }}
            >
              <UnpublishIcon fontSize="small" sx={{ mr: 1.25 }} />
              Move to Draft
            </MenuItem>
          ) : (
            <MenuItem
              onClick={() => {
                handleAction(menuJob, "publish");
                closeMenu();
              }}
              sx={{ color: SAGE_DARK, "&:hover": { bgcolor: SAGE_SOFT } }}
            >
              <PublicIcon fontSize="small" sx={{ mr: 1.25 }} />
              Make Live
            </MenuItem>
          ))}

        <Divider sx={{ my: 0.5 }} />
        <MenuItem
          onClick={() => {
            handleAction(menuJob, "delete");
            closeMenu();
          }}
          sx={{ color: "#B4462F", "&:hover": { bgcolor: "#FBECEA" } }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1.25 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Job Detail Dialog */}
      <Dialog
        open={Boolean(detailDialog)}
        onClose={() => setDetailDialog(null)}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
        slotProps={{
          paper: {
            sx: {
              borderRadius: isMobile ? 0 : { sm: "16px", md: "18px" },
              overflow: "hidden",
              boxShadow: SHADOW_LG,
            },
          },
        }}
      >
        {detailDialog && (
          <>
            <Box
              sx={{
                background: `linear-gradient(135deg, ${CHARCOAL} 0%, ${CHARCOAL_SOFT} 55%, ${SAGE_DARK} 100%)`,
                px: { xs: 2, sm: 3, md: 3.5 },
                pt: { xs: 2.5, sm: 3 },
                pb: { xs: 2, sm: 2.5 },
                boxShadow: SHADOW_HEAD,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "flex-start", gap: { xs: 1.5, sm: 2 } }}>
                <Box
                  sx={{
                    width: { xs: 44, sm: 52 },
                    height: { xs: 44, sm: 52 },
                    borderRadius: "14px",
                    flex: "none",
                    bgcolor: "rgba(242,188,154,0.22)",
                    color: SKIN,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.14)",
                  }}
                >
                  <WorkIcon sx={{ color: SKIN, fontSize: { xs: 24, sm: 28 } }} />
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      flexWrap: "wrap",
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: { xs: "1.05rem", sm: "1.25rem", md: "1.4rem" },
                        fontWeight: 800,
                        color: "#fff",
                        lineHeight: 1.25,
                      }}
                    >
                      {detailDialog.title}
                    </Typography>
                    {detailDialog.flagged && (
                      <Chip
                        label="Flagged"
                        size="small"
                        icon={<FlagIcon sx={{ fontSize: 14 }} />}
                        sx={{
                          bgcolor: "rgba(255,255,255,0.92)",
                          color: C.danger,
                          fontWeight: 700,
                          "& .MuiChip-icon": { color: C.danger },
                        }}
                      />
                    )}
                  </Box>
                  <Typography
                    sx={{
                      fontSize: { xs: "0.72rem", sm: "0.85rem" },
                      color: "rgba(255,255,255,0.78)",
                      mt: 0.5,
                    }}
                  >
                    #{detailDialog.id} · {dash(detailDialog.openings)}{" "}
                    opening(s) · Submitted {dash(detailDialog.submittedOn)}
                  </Typography>
                  <Box
                    sx={{ display: "flex", gap: 1, mt: 1.5, flexWrap: "wrap" }}
                  >
                    <Box
                      component="span"
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 0.6,
                        height: 26,
                        px: 1.25,
                        borderRadius: "999px",
                        bgcolor: "#fff",
                        color: (
                          APPROVAL_STATUS[detailDialog.status] ||
                          APPROVAL_STATUS.Draft
                        ).tx,
                        fontSize: "0.74rem",
                        fontWeight: 700,
                        boxShadow: SHADOW_SM,
                      }}
                    >
                      <Box
                        component="span"
                        sx={{
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          bgcolor: (
                            APPROVAL_STATUS[detailDialog.status] ||
                            APPROVAL_STATUS.Draft
                          ).dot,
                        }}
                      />
                      {detailDialog.status}
                    </Box>
                    <Box
                      component="span"
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 0.6,
                        height: 26,
                        px: 1.25,
                        borderRadius: "999px",
                        bgcolor: "rgba(242,188,154,0.22)",
                        color: SKIN,
                        fontSize: "0.74rem",
                        fontWeight: 600,
                        border: "1px solid rgba(242,188,154,0.35)",
                      }}
                    >
                      {isLiveToStudents(detailDialog.status) ? (
                        <>
                          <PublicIcon sx={{ fontSize: 14 }} /> Live on student
                          portal
                        </>
                      ) : (
                        <>
                          <HiddenIcon sx={{ fontSize: 14 }} /> Not visible to
                          students
                        </>
                      )}
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Box>
            <DialogContent dividers sx={{ p: { xs: 2, sm: 3 }, bgcolor: OFF_WHITE }}>
              {detailDialog.flagged && (
                <Alert
                  severity="warning"
                  sx={{
                    mb: 2,
                    borderRadius: "12px",
                    bgcolor: "#F6ECDF",
                    color: C.textDark,
                    "& .MuiAlert-icon": { color: "#A35A2D" },
                  }}
                >
                  {detailDialog.flagReason ||
                    "This job has been flagged for review."}
                </Alert>
              )}

              <Paper
                variant="outlined"
                sx={{
                  p: { xs: 1.5, sm: 2 },
                  mb: 3,
                  borderRadius: "14px",
                  border: `1px solid ${C.border}`,
                  boxShadow: SHADOW_SM,
                  bgcolor: "#fff",
                }}
              >
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}
                >
                  <Avatar
                    src={
                      detailDialog.employer.avatarUrl ||
                      detailDialog.employer.company_logo_url ||
                      detailDialog.company_logo_url ||
                      undefined
                    }
                    sx={{
                      bgcolor: detailDialog.employer.avatarColor || SAGE,
                      width: { xs: 48, sm: 56 },
                      height: { xs: 48, sm: 56 },
                      fontSize: { xs: 18, sm: 20 },
                      fontWeight: 700,
                      color: "#fff",
                      boxShadow: SHADOW_SM,
                    }}
                  >
                    {detailDialog.employer.avatar}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: C.textDark, fontSize: { xs: "0.9rem", sm: "1rem" } }}>
                      {detailDialog.employer.name}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: C.textLight }}
                      display="block"
                    >
                      Posted by this employer
                    </Typography>
                  </Box>
                </Box>

                <Grid container spacing={1.5}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <RoleIcon fontSize="small" sx={{ color: SAGE_DARK }} />
                      <Typography variant="body2" sx={{ color: C.textDark, fontSize: { xs: "0.78rem", sm: "0.875rem" } }}>
                        <strong>Role:</strong>{" "}
                        {dash(detailDialog.employer.role)}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <LocationIcon fontSize="small" sx={{ color: SAGE_DARK }} />
                      <Typography variant="body2" sx={{ color: C.textDark, fontSize: { xs: "0.78rem", sm: "0.875rem" } }}>
                        <strong>Location:</strong>{" "}
                        {dash(detailDialog.employer.location)}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <EmailIcon fontSize="small" sx={{ color: SAGE_DARK }} />
                      <Typography variant="body2" sx={{ color: C.textDark, fontSize: { xs: "0.78rem", sm: "0.875rem" }, wordBreak: "break-all" }}>
                        {dash(detailDialog.employer.email)}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <PhoneIcon fontSize="small" sx={{ color: SAGE_DARK }} />
                      <Typography variant="body2" sx={{ color: C.textDark, fontSize: { xs: "0.78rem", sm: "0.875rem" } }}>
                        {dash(detailDialog.employer.phone)}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                <Divider sx={{ my: 2, borderColor: C.borderSoft }} />

                <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 1.5, sm: 3 }} flexWrap="wrap">
                  <Box>
                    <Typography variant="caption" sx={{ color: C.textLight }}>
                      Jobs submitted
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: C.textDark }}>
                      {detailDialog.employer.jobsPostedTotal}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: C.textLight }}>
                      Currently live
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: SAGE_DARK }}>
                      {detailDialog.employer.jobsLiveCount}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: C.textLight }}>
                      Joined on
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: C.textDark }}>
                      {dash(detailDialog.employer.joinedOn)}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>

              <Typography variant="subtitle2" gutterBottom sx={{ color: C.textDark, fontWeight: 700 }}>
                Job Description
              </Typography>
              <Typography
                variant="body2"
                sx={{ mb: 3, whiteSpace: "pre-wrap", color: C.textMid, fontSize: { xs: "0.8rem", sm: "0.875rem" } }}
              >
                {detailDialog.description || "No description provided."}
              </Typography>

                                          <Grid container spacing={{ xs: 2, sm: 3 }}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" gutterBottom sx={{ color: C.textDark, fontWeight: 700 }}>
                    Job Details
                  </Typography>
                  <Stack spacing={1}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <LocationIcon fontSize="small" sx={{ color: SAGE_DARK }} />
                      <Typography variant="body2" sx={{ color: C.textDark, fontSize: { xs: "0.78rem", sm: "0.875rem" } }}>
                        {dash(detailDialog.location)}
                        {detailDialog.workMode
                          ? ` • ${detailDialog.workMode}`
                          : ""}
                      </Typography>
                    </Box>
                                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography component="span" sx={{ color: SAGE_DARK, fontSize: "1.1rem", fontWeight: 700, lineHeight: 1, minWidth: 20, textAlign: "center" }}>₹</Typography>
                      <Typography variant="body2" sx={{ color: C.textDark, fontSize: { xs: "0.78rem", sm: "0.875rem" } }}>
                        {dash(detailDialog.salary)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <AssignmentIcon fontSize="small" sx={{ color: SAGE_DARK }} />
                      <Typography variant="body2" sx={{ color: C.textDark, fontSize: { xs: "0.78rem", sm: "0.875rem" } }}>
                        {dash(detailDialog.experience)} •{" "}
                        {dash(detailDialog.openings)} opening(s)
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <ScheduleIcon fontSize="small" sx={{ color: SAGE_DARK }} />
                      <Typography variant="body2" sx={{ color: C.textDark, fontSize: { xs: "0.78rem", sm: "0.875rem" } }}>
                        Submitted on {dash(detailDialog.submittedOn)}
                      </Typography>
                    </Box>
                  </Stack>
                </Grid>

                                                <Grid size={{ xs: 12, md: 6 }} sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle2" gutterBottom sx={{ color: C.textDark, fontWeight: 700 }}>
                    Required Skills
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {(detailDialog.skills || []).length === 0 ? (
                      <Typography variant="caption" sx={{ color: C.textLight }}>
                        —
                      </Typography>
                    ) : (
                      detailDialog.skills.map((s) => (
                        <Chip
                          key={s}
                          label={s}
                          size="small"
                          variant="outlined"
                          sx={{
                            borderColor: SAGE,
                            color: SAGE_DARK,
                            bgcolor: SAGE_SOFT,
                            fontWeight: 500,
                          }}
                        />
                      ))
                    )}
                  </Box>

                  <Divider sx={{ my: 2, borderColor: C.borderSoft }} />

                  <Typography variant="subtitle2" gutterBottom sx={{ color: C.textDark, fontWeight: 700 }}>
                    Applicants
                  </Typography>
                  <Typography variant="h6" sx={{ color: SAGE_DARK, fontWeight: 800 }}>
                    {detailDialog.applicants ?? 0}
                  </Typography>
                </Grid>
              </Grid>

              {/* ── More Details ─────────────────────────────────────── */}
              <Paper elevation={0} sx={sectionPaperSx}>
                <SectionHead
                  icon={<WorkIcon sx={{ fontSize: 18 }} />}
                  title="More Details"
                />
                <Box sx={tilesGridSx}>
                  <InfoTile
                    label="Job Type"
                    value={detailExtra?.job_type || detailDialog.raw?.job_type}
                  />
                  <InfoTile
                    label="Shift"
                    value={detailExtra?.job_shift || detailDialog.raw?.job_shift}
                  />
                  <InfoTile
                    label="Application Deadline"
                    value={(() => {
                      const dl = detailExtra?.application_deadline || detailDialog.raw?.application_deadline;
                      if (!dl) return null;
                      return detailDialog.daysLeft != null
                        ? `${dl} (${detailDialog.daysLeft}d left)`
                        : dl;
                    })()}
                  />
                  <InfoTile
                    label="Interview Location"
                    value={detailExtra?.preferred_interview_location || detailDialog.raw?.preferred_interview_location}
                  />
                  <Box sx={{ gridColumn: { xs: "auto", sm: "span 2" } }}>
                    <InfoTile
                      label="Address"
                      value={detailExtra?.job_address_line1 || detailDialog.raw?.job_address_line1}
                    />
                  </Box>
                </Box>
              </Paper>

              {/* ── Roles & Responsibilities ─────────────────────────── */}
              {(() => {
                const resp =
                  (Array.isArray(detailExtra?.responsibilities) && detailExtra.responsibilities) ||
                  (Array.isArray(detailDialog.raw?.responsibilities) && detailDialog.raw.responsibilities) ||
                  [];
                if (!resp.length) return null;
                return (
                  <Paper elevation={0} sx={sectionPaperSx}>
                    <SectionHead
                      icon={<AssignmentIcon sx={{ fontSize: 18 }} />}
                      title="Roles & Responsibilities"
                    />
                    <Stack spacing={1}>
                      {resp.map((r, i) => (
                        <Box key={i} sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                          <ApproveIcon sx={{ fontSize: 17, color: SAGE_DARK, mt: "3px", flexShrink: 0 }} />
                          <Typography
                            sx={{
                              color: C.textMid,
                              fontSize: { xs: "0.82rem", sm: "0.88rem" },
                              lineHeight: 1.6,
                            }}
                          >
                            {r}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  </Paper>
                );
              })()}

              {/* ── Eligibility ──────────────────────────────────────── */}
              <Paper elevation={0} sx={sectionPaperSx}>
                <SectionHead
                  icon={<RoleIcon sx={{ fontSize: 18 }} />}
                  title="Eligibility"
                />
                <Box sx={tilesGridSx}>
                  <InfoTile
                    label="Education"
                    value={detailExtra?.education_requirements || detailDialog.raw?.education_requirements}
                  />
                  <InfoTile
                    label="Languages"
                    value={(() => {
                      const langs = detailExtra?.languages || detailDialog.raw?.languages;
                      return Array.isArray(langs) && langs.length ? langs.join(", ") : null;
                    })()}
                  />
                  <InfoTile
                    label="Gender"
                    value={detailExtra?.gender || detailDialog.raw?.gender}
                  />
                  <InfoTile
                    label="Candidate Category"
                    value={detailExtra?.candidate_category || detailDialog.raw?.candidate_category}
                  />
                  <InfoTile
                    label="Industry Preference"
                    value={detailExtra?.industry_preference || detailDialog.raw?.industry_preference}
                  />
                  {(() => {
                    const cc = detailExtra?.candidate_category || detailDialog.raw?.candidate_category;
                    if (cc !== "Persons with Disabilities (PwD)") return null;
                    const dt = detailExtra?.disability_type || detailDialog.raw?.disability_type;
                    return <InfoTile label="Disability Type" value={dt} />;
                  })()}
                </Box>
              </Paper>

              {/* ── Company ──────────────────────────────────────────── */}
              <Paper elevation={0} sx={sectionPaperSx}>
                <SectionHead
                  icon={<BusinessIcon sx={{ fontSize: 18 }} />}
                  title="Company"
                />
                <Box sx={tilesGridSx}>
                  <InfoTile
                    label="Company Name"
                    value={detailExtra?.company_name || detailDialog.raw?.company_name}
                  />
                  <InfoTile
                    label="Company Type"
                    value={detailExtra?.company_type || detailDialog.raw?.company_type}
                  />
                </Box>
              </Paper>

              {/* ── Benefits & Perks (from lazy fetch) ───────────────── */}
              {(() => {
                const benefits = detailExtra?.benefits;
                if (!benefits || typeof benefits !== "object" || !Object.keys(benefits).length) return null;
                const groups = Object.entries(benefits).filter(
                  ([, items]) => Array.isArray(items) && items.length
                );
                if (!groups.length) return null;
                return (
                  <Paper elevation={0} sx={sectionPaperSx}>
                    <SectionHead
                      icon={<SalaryIcon sx={{ fontSize: 18 }} />}
                      title="Benefits & Perks"
                    />
                    <Stack spacing={1.5}>
                      {groups.map(([category, items]) => (
                        <Box key={category}>
                          <Typography
                            sx={{
                              fontSize: "0.66rem",
                              fontWeight: 700,
                              color: C.textLight,
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                              mb: 0.75,
                              display: "block",
                            }}
                          >
                            {category}
                          </Typography>
                          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                            {items.map((it) => (
                              <Chip
                                key={it}
                                label={it}
                                size="small"
                                variant="outlined"
                                sx={{
                                  borderColor: SAGE,
                                  color: SAGE_DARK,
                                  bgcolor: SAGE_SOFT,
                                  fontWeight: 500,
                                }}
                              />
                            ))}
                          </Box>
                        </Box>
                      ))}
                    </Stack>
                  </Paper>
                );
              })()}
            </DialogContent>
            <DialogActions
              sx={{
                px: { xs: 2, sm: 3 },
                py: 2,
                gap: 1,
                flexWrap: "wrap",
                bgcolor: "#fff",
                borderTop: `1px solid ${C.borderSoft}`,
              }}
            >
              <Button
                onClick={() => setDetailDialog(null)}
                sx={{ color: C.textMid, textTransform: "none", fontWeight: 600 }}
              >
                Close
              </Button>

              {isPending(detailDialog) && (
                <>
                  <Button
                    variant="outlined"
                    startIcon={<RejectIcon />}
                    onClick={() => {
                      handleAction(detailDialog, "reject");
                      setDetailDialog(null);
                    }}
                    sx={{
                      textTransform: "none",
                      color: "#B4462F",
                      borderColor: "#B4462F",
                      "&:hover": { bgcolor: "#FBECEA", borderColor: "#8A3522" },
                    }}
                  >
                    Reject
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<ApproveIcon />}
                    onClick={() => {
                      handleAction(detailDialog, "approve");
                      setDetailDialog(null);
                    }}
                    sx={{
                      textTransform: "none",
                      bgcolor: SAGE,
                      boxShadow: SHADOW_SM,
                      "&:hover": { bgcolor: SAGE_DARK, boxShadow: SHADOW_MD },
                    }}
                  >
                    Approve & Publish
                  </Button>
                </>
              )}

              {!isPending(detailDialog) &&
                isApprovedJob(detailDialog) &&
                (isLiveToStudents(detailDialog.status) ? (
                  <Button
                    variant="outlined"
                    startIcon={<UnpublishIcon />}
                    onClick={() => {
                      handleAction(detailDialog, "unpublish");
                      setDetailDialog(null);
                    }}
                    sx={{
                      textTransform: "none",
                      color: "#A35A2D",
                      borderColor: SKIN_DARK,
                      "&:hover": { bgcolor: "#F6ECDF", borderColor: "#B7825F" },
                    }}
                  >
                    Move to Draft
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    startIcon={<PublicIcon />}
                    onClick={() => {
                      handleAction(detailDialog, "publish");
                      setDetailDialog(null);
                    }}
                    sx={{
                      textTransform: "none",
                      bgcolor: SAGE,
                      boxShadow: SHADOW_SM,
                      "&:hover": { bgcolor: SAGE_DARK, boxShadow: SHADOW_MD },
                    }}
                  >
                    Make Live
                  </Button>
                ))}

              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => {
                  openEdit(detailDialog);
                  setDetailDialog(null);
                }}
                sx={{
                  textTransform: "none",
                  color: SAGE_DARK,
                  borderColor: SAGE,
                  "&:hover": { bgcolor: SAGE_SOFT, borderColor: SAGE_DARK },
                }}
              >
                Edit
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Action Confirm Dialog */}
      <Dialog
        open={Boolean(actionDialog)}
        onClose={() => !submitting && setActionDialog(null)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: { sx: { borderRadius: { xs: "14px", sm: "18px" }, overflow: "hidden", boxShadow: SHADOW_LG } },
        }}
      >
        {actionDialog &&
          (() => {
            const acc = ACTION_ACCENT[actionDialog.action] || {
              c: SAGE,
              h: SAGE_DARK,
            };
            const gradientMap = {
              approve:   'linear-gradient(160deg, #08302F 0%, #0E1E1D 70%, #121615 100%)',
              publish:   'linear-gradient(160deg, #08302F 0%, #0E1E1D 70%, #121615 100%)',
              reject:    'linear-gradient(160deg, #4A1A12 0%, #331210 70%, #250E0B 100%)',
              unpublish: 'linear-gradient(160deg, #3D2A1A 0%, #2A1D12 70%, #1F1610 100%)',
              delete:    'linear-gradient(160deg, #4A1A12 0%, #331210 70%, #250E0B 100%)',
            };
            const iconColorMap = {
              approve: SAGE, publish: SAGE,
              reject: '#E8897A', unpublish: '#D4A574', delete: '#E8897A',
            };
            const subtitleMap = {
              approve: 'This will make the job live for students',
              publish: 'This will make the job live for students',
              reject: 'The employer will be notified',
              unpublish: 'Temporarily hide from students',
              delete: 'This cannot be undone',
            };
            const hdrIcon = {
              approve: <ApproveIcon sx={{ color: iconColorMap.approve, fontSize: 28 }} />,
              publish: <PublicIcon sx={{ color: iconColorMap.publish, fontSize: 28 }} />,
              reject: <RejectIcon sx={{ color: iconColorMap.reject, fontSize: 28 }} />,
              unpublish: <UnpublishIcon sx={{ color: iconColorMap.unpublish, fontSize: 28 }} />,
              delete: <DeleteIcon sx={{ color: iconColorMap.delete, fontSize: 28 }} />,
            }[actionDialog.action] || (
              <WorkIcon sx={{ color: SAGE, fontSize: 28 }} />
            );
            return (
              <>
                <Box sx={{
                  background: gradientMap[actionDialog.action] || gradientMap.approve,
                  px: { xs: 2.5, sm: 3 }, pt: { xs: 2.5, sm: 3 }, pb: { xs: 2.25, sm: 2.75 },
                  position: 'relative', overflow: 'hidden', textAlign: 'center',
                }}>
                  <Box sx={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />
                  <Box sx={{
                    width: 56, height: 56, borderRadius: '16px', mx: 'auto', mb: 2,
                    bgcolor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {hdrIcon}
                  </Box>
                  <Typography sx={{ fontWeight: 700, color: 'rgba(255,255,255,0.97)', fontSize: { xs: '1.1rem', sm: '1.2rem' }, lineHeight: 1.2, mb: 0.5 }}>
                    {dialogTitle(actionDialog.action)}
                  </Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: { xs: '0.76rem', sm: '0.82rem' }, fontWeight: 500 }}>
                    {subtitleMap[actionDialog.action] || ''}
                  </Typography>
                </Box>
                <DialogContent sx={{ pt: 3, pb: 2, px: { xs: 2, sm: 3 } }}>
                  <Typography variant="body2" sx={{ mb: 2, color: C.textMid, fontSize: { xs: "0.8rem", sm: "0.875rem" } }}>
                    You're about to{" "}
                    <strong>{dialogVerb(actionDialog.action)}</strong> the job{" "}
                    <strong>"{actionDialog.job.title}"</strong> submitted by{" "}
                    <strong>{actionDialog.job.employer.name}</strong>
                    {actionDialog.job.employer.location
                      ? ` (${actionDialog.job.employer.location})`
                      : ""}
                    .
                  </Typography>

                  {actionDialog.action === "approve" && (
                    <Alert
                      severity="success"
                      icon={<PublicIcon />}
                      sx={{
                        borderRadius: "12px",
                        bgcolor: SAGE_SOFT,
                        color: C.textDark,
                        "& .MuiAlert-icon": { color: SAGE_DARK },
                      }}
                    >
                      The job will go{" "}
                      <strong>live on the student portal immediately</strong>{" "}
                      and students can start applying. The employer will be
                      notified.
                    </Alert>
                  )}
                  {actionDialog.action === "reject" && (
                    <>
                      <Alert
                        severity="warning"
                        sx={{
                          mb: 2,
                          borderRadius: "12px",
                          bgcolor: "#F6ECDF",
                          color: C.textDark,
                          "& .MuiAlert-icon": { color: "#A35A2D" },
                        }}
                      >
                        The job will not be visible to students.{" "}
                        <strong>{actionDialog.job.employer.name}</strong> will
                        be notified with your reason.
                      </Alert>
                      <TextField
                        multiline
                        rows={3}
                        fullWidth
                        label="Reason for rejection"
                        placeholder="e.g. Salary outside company band, description incomplete, missing required fields…"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        sx={inputSx}
                      />
                    </>
                  )}
                  {actionDialog.action === "publish" && (
                    <Alert
                      severity="success"
                      icon={<PublicIcon />}
                      sx={{
                        borderRadius: "12px",
                        bgcolor: SAGE_SOFT,
                        color: C.textDark,
                        "& .MuiAlert-icon": { color: SAGE_DARK },
                      }}
                    >
                      The job will be{" "}
                      <strong>live on the student portal immediately</strong>.
                      You can take it offline again at any time.
                    </Alert>
                  )}
                  {actionDialog.action === "unpublish" && (
                    <Alert
                      severity="info"
                      icon={<HiddenIcon />}
                      sx={{
                        borderRadius: "12px",
                        bgcolor: "#F6ECDF",
                        color: C.textDark,
                        "& .MuiAlert-icon": { color: "#A35A2D" },
                      }}
                    >
                      The job will be{" "}
                      <strong>hidden from students immediately</strong>.
                      Students already in the pipeline will not be affected. You
                      can make it live again later.
                    </Alert>
                  )}
                  {actionDialog.action === "delete" && (
                    <Alert
                      severity="error"
                      icon={<DeleteIcon />}
                      sx={{ borderRadius: "12px" }}
                    >
                      This will <strong>permanently delete</strong> the job
                      posting and cannot be undone. All associated data will be
                      removed.
                    </Alert>
                  )}
                </DialogContent>
                <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: 2, gap: 1, bgcolor: "#fff" }}>
                  <Button
                    onClick={() => setActionDialog(null)}
                    disabled={submitting}
                    sx={{
                      textTransform: "none",
                      fontWeight: 600,
                      borderRadius: "8px",
                      color: C.textMid,
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    onClick={confirmAction}
                    disabled={
                      submitting ||
                      (actionDialog.action === "reject" && !rejectReason.trim())
                    }
                    startIcon={
                      submitting ? (
                        <CircularProgress size={16} sx={{ color: "#fff" }} />
                      ) : null
                    }
                    sx={{
                      textTransform: "none",
                      fontWeight: 700,
                      borderRadius: "12px",
                      px: 2.5,
                      bgcolor: acc.c,
                      color: "#fff",
                      boxShadow: SHADOW_SM,
                      "&:hover": { bgcolor: acc.h, boxShadow: SHADOW_MD },
                      "&.Mui-disabled": {
                        bgcolor: acc.c,
                        color: "rgba(255,255,255,0.7)",
                        opacity: 0.85,
                      },
                    }}
                  >
                    {confirmButtonLabel(actionDialog.action)}
                  </Button>
                </DialogActions>
              </>
            );
          })()}
      </Dialog>

      {/* ── Bulk Approve Confirm Dialog ─────────────────────────────── */}
      <Dialog
        open={bulkApproveConfirm}
        onClose={() => !submitting && setBulkApproveConfirm(false)}
        maxWidth="xs" fullWidth
        slotProps={{ paper: { sx: { borderRadius: '18px', overflow: 'hidden', boxShadow: '0 24px 64px rgba(2,33,36,0.22)', fontFamily: FONT } } }}
      >
        <Box sx={{
          background: 'linear-gradient(160deg, #08302F 0%, #0E1E1D 70%, #121615 100%)',
          px: { xs: 2.5, sm: 3 }, pt: { xs: 2.5, sm: 3 }, pb: { xs: 2.25, sm: 2.75 },
          position: 'relative', overflow: 'hidden', textAlign: 'center',
        }}>
          <Box sx={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />
          <Box sx={{ position: 'absolute', bottom: -20, left: -20, width: 100, height: 100, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.02)', pointerEvents: 'none' }} />
          <Box sx={{
            width: 56, height: 56, borderRadius: '16px', mx: 'auto', mb: 2,
            bgcolor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(8px)',
          }}>
            <ApproveIcon sx={{ color: SAGE, fontSize: 28 }} />
          </Box>
          <Typography sx={{ fontWeight: 700, color: 'rgba(255,255,255,0.97)', fontSize: { xs: '1.1rem', sm: '1.2rem' }, lineHeight: 1.2, mb: 0.5 }}>
            Approve {selected.length} job{selected.length > 1 ? 's' : ''}?
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: { xs: '0.76rem', sm: '0.82rem' }, fontWeight: 500 }}>
            They will go live for students immediately
          </Typography>
        </Box>
        <DialogContent sx={{ pt: { xs: 2.5, sm: 3 }, pb: { xs: 1.5, sm: 2 }, px: { xs: 2.5, sm: 3 }, bgcolor: C.white }}>
          <Typography sx={{ color: C.textMid, lineHeight: 1.65, fontSize: { xs: '0.82rem', sm: '0.88rem' }, fontFamily: FONT }}>
            This will approve and publish <strong>{selected.length} selected job{selected.length > 1 ? 's' : ''}</strong> to the student portal. Students can start applying immediately, and each employer will be notified. Jobs with passed deadlines will be skipped automatically.
          </Typography>
        </DialogContent>
        <DialogActions sx={{
          px: { xs: 2.5, sm: 3 }, py: { xs: 1.75, sm: 2 }, gap: 1,
          bgcolor: C.white, borderTop: `1px solid ${C.border}`,
          flexDirection: { xs: 'column-reverse', sm: 'row' }, alignItems: 'stretch',
        }}>
          <Button onClick={() => setBulkApproveConfirm(false)} disabled={submitting} sx={{
            borderRadius: '12px', textTransform: 'none', fontWeight: 600, color: C.textMid,
            fontFamily: FONT, border: `1px solid ${C.border}`,
            width: { xs: '100%', sm: 'auto' }, minHeight: { xs: 44, sm: 'auto' },
            '&:hover': { bgcolor: 'rgba(127,158,126,0.10)', borderColor: '#D8DDD4' },
          }}>Cancel</Button>
          <Button
            variant="contained" onClick={handleBulkApprove} disabled={submitting} disableElevation
            startIcon={submitting ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <ApproveIcon sx={{ fontSize: 16 }} />}
            sx={{
              borderRadius: '12px', textTransform: 'none', fontWeight: 700, px: 3,
              width: { xs: '100%', sm: 'auto' }, minHeight: { xs: 48, sm: 'auto' },
              bgcolor: SAGE, color: '#fff', fontFamily: FONT,
              '&:hover': { bgcolor: SAGE_DARK },
              '&.Mui-disabled': { bgcolor: SAGE, color: 'rgba(255,255,255,0.6)', opacity: 0.85 },
            }}
          >{submitting ? 'Approving…' : `Approve ${selected.length}`}</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog (reuses JobForm) */}
      {editDialog && (
        <JobForm
          open={Boolean(editDialog)}
          onClose={() => setEditDialog(null)}
          onSubmit={handleEditSubmit}
          initialData={editDialog.raw || editDialog}
          isEditing={true}
          companyId={viewerCompanyId}
          companyName={editDialog.raw?.company_name || ""}
          currentUserRole={isCompanyLogin ? "COMPANY_ADMIN" : "COMPANY_ADMIN"}
        />
      )}
    </Box>
  );
};

export default JobsApprovals;