import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  Collapse,
  IconButton,
  Tooltip,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  Dashboard,
  Search,
  Assignment,
  BookmarkBorder,
  Quiz,
  SmartToy,
  Person,
  AddBox,
  Work,
  People,
  PersonSearch,
  CalendarMonth,
  BarChart,
  Group,
  Business,
  CreditCard,
  Shield,
  Leaderboard,
  HourglassEmpty,
  HowToReg,
  AutoAwesome,
  Chat,
  ExpandLess,
  ExpandMore,
  FiberManualRecord,
  Description,
  Close,
  ChevronLeft,
  ChevronRight,
  ContactSupport,
  EventAvailable,  
  Verified,       
  VerifiedUser,  
  Gavel,          
  Assessment,   
  MenuBook,        
  Security,        
  Timeline,        
  ViewModule,     
  Schedule,        
  RateReview,      
  CheckCircle, 
  SwapHoriz,  
} from "@mui/icons-material";
import { useAuth } from "@/hooks/useAuth";
import useSidebarCounts from "@/hooks/useSidebarCounts";
import { ROLES } from "@/constants";
import { getInitials } from "@/utils/formatters";

const AMBER_BG   = "#F7F7F7";
const AMBER_DARK = "#04282B";
const AMBER_RING = "rgba(247,247,247,0.35)";

const CountPill = ({ count, collapsed = false, activePill = false }) => {
  const n = Number(count) || 0;
  if (n <= 0) return null;
  if (collapsed) {
    // Dot only — positioned by the ListItemIcon wrapper via absolute in caller.
    return (
      <Box
        aria-label={`${n} pending`}
        sx={{
          position: "absolute",
          top: 4,
          right: 4,
          width: 8,
          height: 8,
          borderRadius: "50%",
          bgcolor: AMBER_BG,
          boxShadow: `0 0 0 2px ${AMBER_RING}`,
        }}
      />
    );
  }
  return (
    <Box
      component="span"
      aria-label={`${n} pending`}
      sx={{
        ml: "auto",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 20,
        height: 18,
        px: 0.75,
        borderRadius: "999px",
        bgcolor: AMBER_BG,
        color: AMBER_DARK,
        fontFamily: "'Jost','DM Sans',sans-serif",
        fontSize: "0.68rem",
        fontWeight: 800,
        letterSpacing: "0.01em",
        lineHeight: 1,
        flexShrink: 0,
        // Slightly softer on an active (sage) pill so it doesn't shout.
        boxShadow: activePill ? "none" : `0 0 0 2px ${AMBER_RING}`,
      }}
    >
      {n > 99 ? "99+" : n}
    </Box>
  );
};

/* ── Responsive constants ──────────────────────────────────────────────── */
export const SIDEBAR_WIDTH           = 290;
export const SIDEBAR_WIDTH_COLLAPSED = 88;
export const SIDEBAR_WIDTH_MOBILE    = 280;
export const MOBILE_BP               = "md";

const PAPER_FULL      = SIDEBAR_WIDTH - 24;        // 266
const PAPER_COLLAPSED = SIDEBAR_WIDTH_COLLAPSED - 24; // 64
const TRANSITION      = "all 0.22s cubic-bezier(.4,0,.2,1)";

const SIDEBAR_NAV = {
  [ROLES.JOBSEEKER]: [
    {
      id: "overview",
      label: "Overview",
      icon: Dashboard,
      path: "/jobseeker/overview",
    },
    {
      id: "find-jobs",
      label: "Find Jobs",
      icon: Search,
      path: "/jobseeker/find-jobs",
    },
    {
      id: "applications",
      label: "Applied Jobs",
      icon: Assignment,
      path: "/jobseeker/applications",
      countKey: "appliedJobs",
    },
    {
      id: "saved-jobs",
      label: "Saved Jobs",
      icon: BookmarkBorder,
      path: "/jobseeker/saved-jobs",
      countKey: "savedJobs",
    },
    {
      id: "ai-assessments",
      label: "Assessments",
      icon: Quiz,
      path: "/jobseeker/ai-assessments",
      countKey: "aiAssessments",
    },
    {
      id: "smart-interviews",
      label: "Smart Interviews",
      icon: AutoAwesome,
      countKey: "smartInterviewsTotal",
      children: [
        {
          id: "document-based-interview",
          label: "Document-Based Interview",
          path: "/jobseeker/smart-interviews/document-based",
          countKey: "docInterviews",
        },
        {
          id: "ai-interview",
          label: "AI Interview",
          path: "/jobseeker/smart-interviews/ai",
          countKey: "aiInterviews",
        },
        {
          id: "live-interview",
          label: "Book Interview",
          path: "/jobseeker/smart-interviews/live",
          countKey: "bookInterview",
        },
        {
          id: "campus-drive",
          label: "Campus Drive",
          path: "/jobseeker/smart-interviews/campus-drive",
          countKey: "campusDrive",
        },
      ],
    },

    {
     
      id: "ai-practice-interview",
      label: "AI Practice Interview",
      icon: SmartToy,
      children: [
        {
          id: "ai-practice-interview-session",
          label: "AI Practice Interview",
          path: "/jobseeker/career/ai-practice-interview",
        },
        {
          id: "ai-practice-history",
          label: "Interview History",
          path: "/jobseeker/career/interview-history",
        },
        {
          id: "candidate-performance",
          label: "Candidate Performance",
          path: "/jobseeker/career/candidate-performance",
        },
      ],
    },

    {
      id: "workspace",
      label: "Resume Builder",
      icon: Chat,
      path: "/jobseeker/workspace/resume-builder",
    },
    {
      id: "support",
      label: "Help & Support",
      icon: ContactSupport,
      path: "/jobseeker/support",
    },
    {
      id: "profile",
      label: "Profile",
      icon: Person,
      path: "/jobseeker/profile",
    },
  ],

  [ROLES.EMPLOYER]: [
    
    { label: "Overview",             path: "/employer/overview",           icon: Dashboard },
    { label: "Jobs & Applicants",    path: "/employer/my-jobs",            icon: Work },

    { label: "Scheduling Hub",       path: "/employer/candidates",         icon: EventAvailable },

    { label: "Scheduled Rounds",     path: "/employer/interview-rounds",    icon: CalendarMonth },
    { label: "Round Approvals",      path: "/employer/ranked-results",     icon: Verified },

    { label: "Pending Candidates",   path: "/employer/pending-candidates",  icon: HourglassEmpty, countKey: "pendingCandidates" },
    { label: "Final Hire",           path: "/employer/final-hire",          icon: HowToReg },
    { label: "Question Bank",        path: "/employer/question-bank",      icon: Description },
    { label: "Analytics",            path: "/employer/analytics",           icon: BarChart },

    // BUILD: 2026-08-24-iaem-sidebar-v1 — Interviewer Audit group
    {
      id: "interviewer-audit",
      label: "Interviewer Audit",
      icon: VerifiedUser,
      countKey: "iaemTotal",
      children: [
        { id: "iaem-interviewers",       label: "Interviewers",       path: "/employer/interviewers", exact: true },
        { id: "iaem-approval-queue",     label: "Approval Queue",     path: "/employer/interviewers/approvals", countKey: "pendingApprovals" },
        { id: "iaem-scheduling",         label: "IAEM Scheduling",    path: "/employer/iaem-scheduling" },
        { id: "iaem-case-queue",         label: "Case Queue",         path: "/employer/cases",                  countKey: "openCases" },
        { id: "iaem-appeals",            label: "Appeals",            path: "/employer/appeals",                countKey: "pendingAppeals" },
        { id: "iaem-calibration",        label: "Calibration",        path: "/employer/iaem-calibration" },
        { id: "iaem-signal-guidelines",  label: "Signal Guidelines",  path: "/employer/signal-guidelines" },
      ],
    },

    { label: "Help & Support",       path: "/employer/support",             icon: ContactSupport  },
  ],

  // BUILD: 2026-08-24-iaem-sidebar-v1 — Interviewer role nav
  [ROLES.INTERVIEWER]: [
    { id: "iv-overview",       label: "Overview",            icon: Dashboard,     path: "/interviewer/overview" },
    { id: "iv-slots",          label: "My Available Slots",  icon: Schedule,      path: "/interviewer/slots",     countKey: "pendingSlotRequests" },
        { id: "iv-completed",      label: "Completed Interviews", icon: CheckCircle, path: "/interviewer/completed" },
   
    {
      id: "iv-cases",
      label: "My Cases & Appeals",
      icon: Gavel,
      children: [
        { id: "iv-my-cases",     label: "My Cases",      path: "/interviewer/cases",   countKey: "openCases" },
        { id: "iv-my-appeals",   label: "Appeal Status", path: "/interviewer/appeals" },
      ],
    },
     {
      id: "iv-calibration",
      label: "Calibration",
      icon: Assessment,
      children: [
        { id: "iv-cal-sessions", label: "My Sessions",  path: "/interviewer/calibration",          countKey: "calibrationDue", exact: true },
        { id: "iv-cal-baseline", label: "My Baseline",  path: "/interviewer/calibration/baseline" },
      ],
    },
    { id: "iv-guidelines",     label: "Signal Guidelines",   icon: MenuBook,      path: "/interviewer/signal-guidelines" },
    { id: "iv-profile",        label: "Profile",             icon: Person,        path: "/interviewer/profile" },
  ],

  // BUILD: 2026-08-24-iaem-sidebar-v1 — Compliance role nav
  [ROLES.COMPLIANCE]: [
    { id: "cp-alerts",         label: "Critical Alerts",     icon: Security,      path: "/compliance/alerts" },
    { id: "cp-cases",          label: "Case Oversight",      icon: Gavel,         path: "/compliance/cases" },
    { id: "cp-co-sign",        label: "Co-Sign Requests",    icon: Verified,      path: "/compliance/co-sign",      countKey: "pendingCoSigns" },
    { id: "cp-audit-trail",    label: "Audit Trail",         icon: Timeline,      path: "/compliance/audit-trail" },
    { id: "cp-guidelines",     label: "Signal Guidelines",   icon: MenuBook,      path: "/compliance/signal-guidelines" },
    { id: "cp-profile",        label: "Profile",             icon: Person,        path: "/compliance/profile" },
  ],

  [ROLES.COMPANY]: [
    { label: "Overview",               path: "/company/overview",       icon: Dashboard },
    { label: "Employers",              path: "/company/employers",      icon: Group },
    { label: "Job Postings",           path: "/company/job-postings",   icon: AddBox },
    { label: "Jobs & Approvals",       path: "/company/jobs-approvals", icon: Work, countKey: "jobsPending" },
    { label: "Assign Jobs",            path: "/company/ownership",      icon: SwapHoriz },
    {
      id: "employer-requests",
      label: "Employer Requests",
      icon: HowToReg,
      countKey: "employerRequestsTotal",
      children: [
        {
          id: "edit-requests",
          label: "Edit Requests",
          path: "/company/employer-requests/edit",
          countKey: "editRequests",
        },
        {
          id: "republish-requests",
          label: "Republish",
          path: "/company/employer-requests/republish",
          countKey: "republishRequests",
        },
      ],
    },
    { label: "Compliance Officers",    path: "/company/compliance-officers", icon: Security },
    { label: "Analytics",              path: "/company/analytics",      icon: BarChart },
    { label: "Company Engagement",     path: "/company/engagement",     icon: Business },
    { label: "Billing & Subscription", path: "/company/subscription",   icon: CreditCard },
    { label: "Help & Support",         path: "/company/support",        icon: ContactSupport  },
  ],
};

const C = {
  /* Background gradient — Pine to Graphite */
  bgGradient: "linear-gradient(180deg, #08302F 0%, #0E1E1D 55%, #121615 100%)",
  bgSolid:    "#0E1E1D",                    // fallback / midpoint
  pineDeep:   "#04282B",                    // active pill text/icon

  /* Accent */
  sage:       "#8FB08E",                    // active pill (brightened)
  sageDark:   "#7DA07C",                    // active pill hover
  icon:       "#9DBE9C",                    // inactive icons — clearly visible

  /* Text — high contrast whites */
  text:       "rgba(255,255,255,0.94)",     // nav labels
  textHi:     "rgba(255,255,255,0.97)",     // brand / emphasized
  textSub:    "rgba(255,255,255,0.62)",     // brand subtitle
  sectionLbl: "rgba(255,255,255,0.55)",     // NAVIGATION label

  /* Surfaces */
  hoverBg:    "rgba(255,255,255,0.08)",
  divider:    "rgba(255,255,255,0.14)",
  childDot:   "rgba(255,255,255,0.45)",
  // 🔧 Active-child pill — bumped from 0.16 to 0.30 opacity so the selected
  // dropdown item is clearly visible against the pine sidebar background.
  childActive:      "rgba(143,176,142,0.30)",
  childActiveHover: "rgba(143,176,142,0.38)",
  childActiveText: "rgba(255,255,255,0.97)",
  childAccentBar:  "#8FB08E",  // vertical stripe on the active child

  /* Logo tile — inverted cream */
  tileBg:     "#F6F8F3",
  tileText:   "#04282B",

  /* Toggle / close buttons */
  btnBorder:  "rgba(255,255,255,0.28)",
  btnColor:   "rgba(255,255,255,0.85)",

  /* Shadows */
  glowOuter:  "0 20px 56px rgba(2,33,36,0.5), 0 2px 8px rgba(0,0,0,0.25)",
  glowHover:  "0 24px 64px rgba(2,33,36,0.6), 0 4px 12px rgba(0,0,0,0.3)",
  pillShadow: "0 4px 16px rgba(143,176,142,0.4)",
  tileShadow: "0 2px 10px rgba(0,0,0,0.25)",
};

/* ── Component ─────────────────────────────────────────────────────────── */
const Sidebar = ({
  mobileOpen = false,
  onMobileClose,
  collapsed = false,
  onToggleCollapse,
}) => {
  const { user, role, logout } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const theme     = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up(MOBILE_BP));
  const navItems  = SIDEBAR_NAV[role] || [];
  const counts    = useSidebarCounts();

  /* Overview path for logo click — derived from role */
  const overviewPath = {
    [ROLES.JOBSEEKER]: "/jobseeker/overview",
    [ROLES.EMPLOYER]:  "/employer/overview",
    [ROLES.COMPANY]:   "/company/overview",
  }[role] || "/";

    
  const expanded = !collapsed;

  const handleLogout = () => {
    logout();
    navigate("/auth");
  };

  /* Auto-open groups when the active path is one of their children */
  const initialOpenGroups = useMemo(() => {
    const open = {};
    navItems.forEach((item) => {
      if (!item.children) return;
      const childActive = item.children.some((c) =>
        location.pathname.startsWith(c.path),
      );
      if (childActive) open[item.id] = true;
    });
    return open;
  }, [navItems, location.pathname]);

  const [openGroups, setOpenGroups] = useState(initialOpenGroups);

  useEffect(() => {
    setOpenGroups((prev) => ({ ...prev, ...initialOpenGroups }));
  }, [initialOpenGroups]);

  const toggleGroup      = (id) =>
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  const openGroupIfClosed = (id) =>
    setOpenGroups((prev) => (prev[id] ? prev : { ...prev, [id]: true }));

  const isPathActive = (path, exact) =>
    exact ? location.pathname === path : location.pathname === path || location.pathname.startsWith(path + "/");

  /* Navigate + auto-close mobile drawer */
  const navTo = useCallback((path) => {
    navigate(path);
    if (!isDesktop) onMobileClose?.();
  }, [navigate, isDesktop, onMobileClose]);

  /* Auto-close on route change */
  useEffect(() => {
    if (!isDesktop && mobileOpen) onMobileClose?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  /* ── Shared text-fade sx ─────────────────────────────────────────────── */
  const textFadeSx = {
    opacity:    expanded ? 1 : 0,
    maxWidth:   expanded ? 200 : 0,
    overflow:   "hidden",
    whiteSpace: "nowrap",
    transition: "opacity 0.18s ease, max-width 0.22s ease",
  };

  /* ── Leaf button ─────────────────────────────────────────────────────── */
  const renderLeafButton = ({
    key, label, path, Icon, active, isChild = false, count = 0,
  }) => {
    /* Hide child items entirely when collapsed rail */
    if (isChild && !expanded) return null;

    return (
      <Tooltip
        key={key}
        title={!expanded ? label : ""}
        placement="right"
        arrow
        disableInteractive
      >
        <ListItemButton
          selected={active}
          onClick={() => navTo(path)}
          sx={{
            borderRadius: "999px",
            mb: 0.4,
            py: isChild ? 0.85 : 1.05,
            pl: expanded ? (isChild ? 4.4 : 1.8) : 0,
            pr: expanded ? 1.8 : 0,
            justifyContent: expanded ? "flex-start" : "center",
            gap: expanded ? 1.5 : 0,
            minHeight: 40,
            position: "relative",
            transition: TRANSITION,
            "&.Mui-selected": {
          bgcolor: isChild ? C.childActive : C.sage,
          boxShadow: isChild ? "none" : C.pillShadow,
              "&:hover": { bgcolor: isChild ? C.childActiveHover : C.sageDark },
              ...(isChild && {
                "&::before": {
                  content: '""',
                  position: "absolute",
                  left: 16,
                  top: "22%",
                  bottom: "22%",
                  width: 3,
                  borderRadius: 2,
                  backgroundColor: C.childAccentBar,
                },
              }),
            },
            "&:hover:not(.Mui-selected)": { bgcolor: C.hoverBg },
          }}
        >
          <ListItemIcon
            sx={{
              minWidth: 0,
              color: active
                ? (isChild ? C.sage : C.pineDeep)
                : C.icon,
              transition: "color 0.2s",
            }}
          >
            {Icon ? (
              <Icon sx={{ fontSize: 20 }} />
            ) : (
              <FiberManualRecord
                sx={{
                  fontSize: active ? 9 : 7,
                  opacity: active ? 1 : 0.55,
                  color: active ? C.sage : C.childDot,
                  transition: "font-size 0.18s ease, opacity 0.18s ease, color 0.18s ease",
                }}
              />
            )}
          </ListItemIcon>
          <ListItemText
            primary={label}
            sx={textFadeSx}
            slotProps={{
              primary: {
                sx: {
                  fontSize: isChild ? "0.84rem" : "0.9rem",
                  fontWeight: active ? (isChild ? 800 : 700) : 500,
                  color: active
                    ? (isChild ? C.childActiveText : C.pineDeep)
                    : C.text,
                  fontFamily: "'Jost','DM Sans',sans-serif",
                  letterSpacing: "0.005em",
                },
              },
            }}
          />
          {expanded && (
            <CountPill count={count} activePill={active && !isChild} />
          )}
        </ListItemButton>
      </Tooltip>
    );
  };

  /* ── Group button ────────────────────────────────────────────────────── */
  const renderGroup = (item) => {
    const Icon        = item.icon;
    const childActive = item.children.some((c) => isPathActive(c.path, c.exact));
    const parentActive = !!item.path && isPathActive(item.path);
    const groupActive  = parentActive || childActive;
    const isOpen       = !!openGroups[item.id];
    const parentPill   = parentActive;
  
    const groupClosedWithActiveChild = childActive && !isOpen && expanded;

    const handleParentClick = () => {
      if (!expanded) {
        /* Collapsed rail: navigate to parent path or first child */
        const target = item.path || item.children[0]?.path;
        if (target) navTo(target);
        return;
      }
      if (item.path) {
        if (location.pathname === item.path) {
          toggleGroup(item.id);
        } else {
          navTo(item.path);
          openGroupIfClosed(item.id);
        }
      } else {
        toggleGroup(item.id);
      }
    };

    return (
      <React.Fragment key={item.id}>
        <Tooltip
          title={!expanded ? item.label : ""}
          placement="right"
          arrow
          disableInteractive
        >
          <ListItemButton
            onClick={handleParentClick}
            sx={{
              borderRadius: "999px",
              mb: 0.4,
              py: 1.05,
              px: expanded ? 1.8 : 0,
              justifyContent: expanded ? "flex-start" : "center",
              gap: expanded ? 1.5 : 0,
              minHeight: 40,
              transition: TRANSITION,
              bgcolor: parentPill
                ? C.sage
                : groupClosedWithActiveChild
                  ? C.childActive
                  : (childActive && expanded)
                    ? C.hoverBg
                    : (groupActive && !expanded)
                      ? C.hoverBg
                      : "transparent",
              boxShadow: parentPill ? C.pillShadow : "none",
              "&:hover": {
                bgcolor: parentPill
                  ? C.sageDark
                  : groupClosedWithActiveChild
                    ? C.childActiveHover
                    : C.hoverBg,
              },
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 0,
                color: parentPill
                  ? C.pineDeep
                  : groupClosedWithActiveChild
                    ? C.sage
                    : groupActive
                      ? C.sage
                      : C.icon,
                transition: "color 0.2s",
              }}
            >
              <Icon sx={{ fontSize: 20 }} />
            </ListItemIcon>
            <ListItemText
              primary={item.label}
              sx={textFadeSx}
              slotProps={{
                primary: {
                  sx: {
                    fontSize: "0.9rem",
                    fontWeight: groupClosedWithActiveChild ? 800 : groupActive ? 700 : 500,
                    color: parentPill
                      ? C.pineDeep
                      : groupClosedWithActiveChild
                        ? C.childActiveText
                        : groupActive
                          ? C.childActiveText
                          : C.text,
                    fontFamily: "'Jost','DM Sans',sans-serif",
                    letterSpacing: "0.005em",
                  },
                },
              }}
            />
            {/* Group-level badge: only when collapsed rail OR when the group is
                closed (dropdown hidden) — otherwise duplicates the child badges. */}
            {expanded && !isOpen && item.countKey && (
              <CountPill count={counts[item.countKey] || 0} activePill={parentPill} />
            )}
            {!expanded && item.countKey && counts[item.countKey] > 0 && (
              <CountPill count={counts[item.countKey] || 0} collapsed />
            )}
            {expanded && (
              isOpen ? (
                <ExpandLess
                  sx={{ fontSize: 18, color: parentPill ? C.pineDeep : C.icon, flexShrink: 0 }}
                />
              ) : (
                <ExpandMore
                  sx={{
                    fontSize: 18,
                    color: parentPill
                      ? C.pineDeep
                      : groupClosedWithActiveChild
                        ? C.sage
                        : C.icon,
                    flexShrink: 0,
                  }}
                />
              )
            )}
          </ListItemButton>
        </Tooltip>

        {expanded && (
          <Collapse in={isOpen} timeout="auto" unmountOnExit>
            <List disablePadding>
              {item.children.map((child) =>
                renderLeafButton({
                  key:     child.id,
                  label:   child.label,
                  path:    child.path,
                  Icon:    null,
                  active:  isPathActive(child.path, child.exact),
                  isChild: true,
                  count:   child.countKey ? (counts[child.countKey] || 0) : 0,
                }),
              )}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  /* ── Desktop drawer content (with collapse button) ───────────────────── */
  const renderDesktopContent = () => (
    <>
      {/* Logo row */}
      <Box
        sx={{
          px: expanded ? 2.5 : 0,
          pt: 2.5, pb: expanded ? 1.75 : 1,
          display: "flex", alignItems: "center", gap: 1.5,
          justifyContent: expanded ? "flex-start" : "center",
          transition: TRANSITION,
        }}
      >
        <Box
          onClick={() => navTo(overviewPath)}
          sx={{
            width: 40, height: 40, borderRadius: "11px", flexShrink: 0,
            background: C.tileBg,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: C.tileShadow,
            cursor: "pointer",
            transition: "all 0.18s ease",
            "&:hover": {
              boxShadow: `${C.tileShadow}, 0 0 0 1.5px ${C.sage}`,
            },
          }}
        >
          <Typography
            sx={{
              color: C.tileText, fontWeight: 800, fontSize: "0.95rem",
              fontFamily: "'DM Serif Display', serif", letterSpacing: "-0.02em",
            }}
          >
            IE
          </Typography>
        </Box>

        {/* Brand text — visible when expanded */}
        <Box sx={{ minWidth: 0, flex: 1, ...textFadeSx }}>
          <Typography
            noWrap
            sx={{
              color: C.textHi, fontWeight: 700,
              fontSize: "1.15rem",
              fontFamily: "'DM Serif Display', serif",
              letterSpacing: "-0.02em", lineHeight: 1.15,
            }}
          >
            IEvalx
          </Typography>
          <Typography
            noWrap
            sx={{
              color: C.textSub, fontSize: "0.6rem",
              letterSpacing: "0.12em", textTransform: "uppercase",
            }}
          >
            Hiring Platform
          </Typography>
        </Box>

        {/* Collapse button — only when expanded */}
        {expanded && (
          <Tooltip title="Collapse navigation" placement="right" arrow>
            <IconButton
              aria-label="Collapse navigation"
              onClick={onToggleCollapse}
              disableRipple
              sx={{
                width: 30,
                height: 30,
                flexShrink: 0,
                color: C.btnColor,
                border: `1.5px solid ${C.btnBorder}`,
                borderRadius: "10px",
                transition: "all 0.18s ease",
                "&:hover": {
                  color: C.sage,
                  bgcolor: C.hoverBg,
                  borderColor: C.sage,
                },
              }}
            >
              <ChevronLeft sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Expand button — below logo, only when collapsed rail (not hover-expanded) */}
      {!expanded && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            pb: 1,
          }}
        >
          <Tooltip title="Expand navigation" placement="right" arrow>
            <IconButton
              aria-label="Expand navigation"
              onClick={onToggleCollapse}
              disableRipple
              sx={{
                width: 30,
                height: 30,
                color: C.btnColor,
                border: `1.5px solid ${C.btnBorder}`,
                borderRadius: "10px",
                transition: "all 0.18s ease",
                "&:hover": {
                  color: C.sage,
                  bgcolor: C.hoverBg,
                  borderColor: C.sage,
                },
              }}
            >
              <ChevronRight sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Box>
      )}

      <Box sx={{ mx: expanded ? 2.5 : 1, mb: 0.5, transition: TRANSITION }}>
        <Divider sx={{ borderColor: C.divider }} />
      </Box>

      {/* Section label — hidden when collapsed */}
      <Box
        sx={{
          px: 2.5,
          pt: expanded ? 1.25 : 0,
          pb: expanded ? 0.5 : 0,
          ...textFadeSx,
          maxWidth: expanded ? 999 : 0,
          height: expanded ? "auto" : 0,
        }}
      >
        <Typography
          sx={{
            color: C.sectionLbl, fontSize: "0.58rem",
            fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase",
          }}
        >
          Navigation
        </Typography>
      </Box>

      {/* Nav items */}
      <Box
        sx={{
          px: expanded ? 1.25 : 0.75,
          flex: 1, overflowY: "auto", overflowX: "hidden",
          transition: TRANSITION,
          "&::-webkit-scrollbar": { width: 0 },
        }}
      >
        <List disablePadding>
          {navItems.map((item) => {
            if (item.children) return renderGroup(item);

            const Icon   = item.icon;
            const active =
              location.pathname === item.path ||
              location.pathname.startsWith(item.path + "/");

            return (
              <Tooltip
                key={item.path}
                title={!expanded ? item.label : ""}
                placement="right"
                arrow
                disableInteractive
              >
                <ListItemButton
                  selected={active}
                  onClick={() => navTo(item.path)}
                  sx={{
                    borderRadius: "999px",
                    mb: 0.4,
                    py: 1.05,
                    px: expanded ? 1.8 : 0,
                    justifyContent: expanded ? "flex-start" : "center",
                    gap: expanded ? 1.5 : 0,
                    minHeight: 40,
                    position: "relative",
                    transition: TRANSITION,
                    "&.Mui-selected": {
                    bgcolor: C.sage,
                    boxShadow: C.pillShadow,
                      "&:hover": { bgcolor: C.sageDark },
                    },
                    "&:hover:not(.Mui-selected)": { bgcolor: C.hoverBg },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0, color: active ? C.pineDeep : C.icon,
                      transition: "color 0.2s",
                      position: "relative",
                    }}
                  >
                    <Icon sx={{ fontSize: 20 }} />
                    {!expanded && item.countKey && counts[item.countKey] > 0 && (
                      <CountPill count={counts[item.countKey] || 0} collapsed />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    sx={textFadeSx}
                    slotProps={{
                      primary: {
                        sx: {
                          fontSize: "0.9rem",
                          fontWeight: active ? 700 : 500,
                          color: active ? C.pineDeep : C.text,
                          fontFamily: "'Jost','DM Sans',sans-serif",
                          letterSpacing: "0.005em",
                        },
                      },
                    }}
                  />
                  {expanded && item.countKey && (
                    <CountPill count={counts[item.countKey] || 0} activePill={active} />
                  )}
                </ListItemButton>
              </Tooltip>
            );
          })}
        </List>
      </Box>

      {/* Footer divider */}
      <Box sx={{ mx: expanded ? 2.5 : 1, mt: 1, mb: 1.5, transition: TRANSITION }}>
        <Divider sx={{ borderColor: C.divider }} />
      </Box>
    </>
  );

  /* ── Mobile drawer content (with close button) ───────────────────────── */
  const renderMobileContent = () => (
    <>
      <Box
        sx={{
          px: 2.5, pt: 2.5, pb: 1.75,
          display: "flex", alignItems: "center", gap: 1.5,
        }}
      >
        <Box
          onClick={() => navTo(overviewPath)}
          sx={{
            width: 40, height: 40, borderRadius: "11px", flexShrink: 0,
            background: C.tileBg,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: C.tileShadow,
            cursor: "pointer",
            transition: "all 0.18s ease",
            "&:hover": {
              boxShadow: `${C.tileShadow}, 0 0 0 1.5px ${C.sage}`,
            },
          }}
        >
          <Typography
            sx={{
              color: C.tileText, fontWeight: 800, fontSize: "0.95rem",
              fontFamily: "'DM Serif Display', serif", letterSpacing: "-0.02em",
            }}
          >
            IE
          </Typography>
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            noWrap
            sx={{
              color: C.textHi, fontWeight: 700,
              fontSize: "1.15rem",
              fontFamily: "'DM Serif Display', serif",
              letterSpacing: "-0.02em", lineHeight: 1.15,
            }}
          >
            IEvalx
          </Typography>
          <Typography
            noWrap
            sx={{
              color: C.textSub, fontSize: "0.6rem",
              letterSpacing: "0.12em", textTransform: "uppercase",
            }}
          >
            Hiring Platform
          </Typography>
        </Box>
        <IconButton
          aria-label="Close navigation"
          onClick={onMobileClose}
          disableRipple
          sx={{
            width: 34, height: 34, flexShrink: 0,
            color: C.btnColor,
            border: `1.5px solid ${C.btnBorder}`,
            borderRadius: "10px",
            transition: "all 0.18s ease",
            "&:hover": {
              color: C.sage,
              bgcolor: C.hoverBg,
              borderColor: C.sage,
            },
          }}
        >
          <Close sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      <Box sx={{ mx: 2.5, mb: 0.5 }}>
        <Divider sx={{ borderColor: C.divider }} />
      </Box>

      <Box sx={{ px: 2.5, pt: 1.25, pb: 0.5 }}>
        <Typography
          sx={{
            color: C.sectionLbl, fontSize: "0.58rem",
            fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase",
          }}
        >
          Navigation
        </Typography>
      </Box>

      <Box
        sx={{
          px: 1.25, flex: 1, overflowY: "auto", overflowX: "hidden",
          "&::-webkit-scrollbar": { width: 0 },
        }}
      >
        <List disablePadding>
          {navItems.map((item) => {
            if (item.children) return renderGroup(item);

            const Icon   = item.icon;
            const active =
              location.pathname === item.path ||
              location.pathname.startsWith(item.path + "/");

            return (
              <ListItemButton
                key={item.path}
                selected={active}
                onClick={() => navTo(item.path)}
                sx={{
                  borderRadius: "999px",
                  mb: 0.4, py: 1.05, px: 1.8, gap: 1.5,
                  transition: TRANSITION,
                  "&.Mui-selected": {
                    bgcolor: C.sage,
                    boxShadow: C.pillShadow,
                    "&:hover": { bgcolor: C.sageDark },
                  },
                  "&:hover:not(.Mui-selected)": { bgcolor: C.hoverBg },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0, color: active ? C.pineDeep : C.icon,
                    transition: "color 0.2s",
                  }}
                >
                  <Icon sx={{ fontSize: 20 }} />
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  slotProps={{
                    primary: {
                      sx: {
                        fontSize: "0.9rem",
                        fontWeight: active ? 700 : 500,
                        color: active ? C.pineDeep : C.text,
                        fontFamily: "'Jost','DM Sans',sans-serif",
                        letterSpacing: "0.005em",
                      },
                    },
                  }}
                />
                {item.countKey && (
                  <CountPill count={counts[item.countKey] || 0} activePill={active} />
                )}
              </ListItemButton>
            );
          })}
        </List>
      </Box>

      <Box sx={{ mx: 2.5, mt: 1 }}>
        <Divider sx={{ borderColor: C.divider }} />
      </Box>
    </>
  );

  /* ── Shared paper styles ─────────────────────────────────────────────── */
  const paperBase = {
    boxSizing: "border-box",
    background: C.bgGradient,
    display: "flex",
    flexDirection: "column",
    border: "none",
    overflowX: "hidden",
  };

  /* Desktop paper width: full when expanded, narrow when collapsed rail */
  const desktopPaperWidth = expanded ? PAPER_FULL : PAPER_COLLAPSED;

  return (
    <>
      {/* ── Desktop: permanent drawer (md+) ────────────────────────────── */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", [MOBILE_BP]: "block" },
          /* Reservation: pushes content. Stays narrow when collapsed. */
          width: collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH,
          flexShrink: 0,
          transition: TRANSITION,
          "& .MuiDrawer-paper": {
            ...paperBase,
            width: desktopPaperWidth,
            height: "calc(100vh - 24px)",
            margin: "12px",
            borderRadius: "20px",
            boxShadow: C.glowOuter,
            transition: TRANSITION,
          },
        }}
      
      >
        {renderDesktopContent()}
      </Drawer>

      {/* ── Mobile: temporary drawer (<md) ─────────────────────────────── */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", [MOBILE_BP]: "none" },
          "& .MuiDrawer-paper": {
            ...paperBase,
            width: SIDEBAR_WIDTH_MOBILE,
            maxWidth: "85vw",
            borderRadius: "0 20px 20px 0",
            boxShadow: "0 0 60px rgba(2,33,36,0.45)",
          },
          "& .MuiBackdrop-root": {
            backdropFilter: "blur(4px)",
            backgroundColor: "rgba(2,33,36,0.35)",
          },
        }}
      >
        {renderMobileContent()}
      </Drawer>
    </>
  );
};

export default Sidebar;