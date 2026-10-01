import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Box, TextField, Button, Select, MenuItem, Paper } from "@mui/material";
import { Search, KeyboardArrowDown } from "@mui/icons-material";
import { C, FONT, REDUCED } from "./theme";
import { JOB_SUGGESTIONS, EXPERIENCE_OPTIONS } from "./data";

/* ══════════════════════════════════════════════════════════════════════════
   JOB SEARCH BAR — the sage pill bar (skills / experience / location).
   Extracted from HeroSection so both the landing hero and the /jobs page
   share ONE implementation. No popup: submitting calls onSearch(filters);
   callers decide what to do (hero navigates to /jobs, /jobs re-filters).
   ══════════════════════════════════════════════════════════════════════════ */

export default function JobSearchBar({ onSearch, initial = {} }) {
  const [query,      setQuery]      = useState(initial.query      || "");
  const [experience, setExperience] = useState(initial.experience || "");
  const [location,   setLocation]   = useState(initial.location   || "");
  const [showSugg,   setShowSugg]   = useState(false);
  const [rect,       setRect]       = useState(null);
  const wrapRef = useRef(null);
  const suggRef = useRef(null);

  // Measure the bar so the portalled dropdown sits exactly under it. Recompute
  // on open, and on scroll/resize while open (it lives on document.body, so it
  // must follow the bar rather than move with it).
  useEffect(() => {
    if (!showSugg) return;
    const measure = () => {
      if (wrapRef.current) setRect(wrapRef.current.getBoundingClientRect());
    };
    measure();
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [showSugg]);

  // Keep in sync when the parent (e.g. /jobs URL params) changes the seed.
  useEffect(() => { setQuery(initial.query || ""); },           [initial.query]);
  useEffect(() => { setExperience(initial.experience || ""); }, [initial.experience]);
  useEffect(() => { setLocation(initial.location || ""); },     [initial.location]);

  const filtered = query.length > 0
    ? JOB_SUGGESTIONS.filter(s => s.toLowerCase().includes(query.toLowerCase()))
    : [];

  useEffect(() => {
    const handler = (e) => {
      if (
        wrapRef.current && !wrapRef.current.contains(e.target) &&
        (!suggRef.current || !suggRef.current.contains(e.target))
      ) setShowSugg(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const submit = (q = query) => {
    setShowSugg(false);
    onSearch?.({ query: q.trim(), experience, location: location.trim() });
  };

  const divider = (
    <Box sx={{
      width: "1px", height: 26, bgcolor: "rgba(31,31,31,0.12)",
      flexShrink: 0, display: { xs: "none", md: "block" },
    }} />
  );

  return (
    <Paper
      ref={wrapRef}
      elevation={0}
      sx={{
        position: "relative",
        display: "flex", alignItems: "center",
        flexWrap: { xs: "wrap", md: "nowrap" },
        width: "100%", maxWidth: 780,
        bgcolor: "#fff",
        borderRadius: { xs: "26px", md: "999px" },
        boxShadow: "0 18px 50px rgba(2,33,36,0.10)",
        pl: { xs: 2, sm: 2.75 }, pr: { xs: 1.5, md: 1 }, py: { xs: 1.25, md: 1 },
        gap: { xs: 1, md: 1.75 },
        zIndex: 10,
      }}
    >
      {/* ⌕ Skills / designations / companies */}
      <Search sx={{ color: "#6F7470", fontSize: 21, flexShrink: 0 }} />
      <TextField
        fullWidth
        variant="standard"
        placeholder="Job title or skill"
        value={query}
        onChange={e => { setQuery(e.target.value); setShowSugg(true); }}
        onFocus={() => setShowSugg(true)}
        onKeyDown={e => e.key === "Enter" && submit()}
        slotProps={{
          input: {
            disableUnderline: true,
            sx: {
              fontFamily: FONT, fontSize: { xs: 14, md: 15 }, color: C.ink, py: 0.875,
              "& input::placeholder": { color: "#8A8F8B", opacity: 1 },
              "&::before, &::after": { display: "none" },
            },
          },
        }}
        sx={{
          flex: { xs: "1 1 100%", md: 2 }, minWidth: 0,
          borderBottom: { xs: "1px solid rgba(31,31,31,0.08)", md: "none" },
          pb: { xs: 0.5, md: 0 },
        }}
      />

      {divider}

      {/* Select experience ⌄ */}
      <Select
        value={experience}
        onChange={e => setExperience(e.target.value)}
        displayEmpty
        variant="standard"
        disableUnderline
        IconComponent={KeyboardArrowDown}
        renderValue={v => v || "Select experience"}
        sx={{
          fontFamily: FONT, fontSize: { xs: 14, md: 15 }, flexShrink: 0,
          display: "flex",
          width: { xs: "100%", md: "auto" },
          color: experience ? C.ink : "#8A8F8B",
          minWidth: { xs: 0, md: 140 }, bgcolor: "transparent",
          "&::before, &::after": { display: "none" },
          "& .MuiSelect-select": {
            py: 0.875, pr: "26px !important",
            bgcolor: "transparent !important",
          },
          "& .MuiSvgIcon-root": { color: "#8A8F8B", fontSize: 20 },
        }}
        MenuProps={{
          PaperProps: {
            sx: {
              mt: 1, borderRadius: 3,
              boxShadow: "0 18px 50px rgba(2,33,36,0.14)",
              "& .MuiMenuItem-root": { fontFamily: FONT, fontSize: 14 },
            },
          },
        }}
      >
        <MenuItem value="">Any experience</MenuItem>
        {EXPERIENCE_OPTIONS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
      </Select>

      {divider}

      {/* Enter location */}
      <TextField
        variant="standard"
        placeholder="Enter location"
        value={location}
        onChange={e => setLocation(e.target.value)}
        onKeyDown={e => e.key === "Enter" && submit()}
        slotProps={{
          input: {
            disableUnderline: true,
            sx: {
              fontFamily: FONT, fontSize: 15, color: C.ink, py: 0.875,
              "& input::placeholder": { color: "#8A8F8B", opacity: 1 },
              "&::before, &::after": { display: "none" },
            },
          },
        }}
        sx={{ flex: 1, minWidth: 110, width: { xs: "100%", md: "auto" } }}
      />

      {/* Search — bloom hover, same family as SageButton */}
      <Button
        onClick={() => submit()}
        disableElevation
        sx={{
          position: "relative", overflow: "hidden",
          fontFamily: FONT, textTransform: "none",
          bgcolor: C.sage,
          borderRadius: "999px", px: 3.5, py: 0,
          height: 48, lineHeight: 1, flexShrink: 0,
          width: { xs: "100%", md: "auto" }, minWidth: 0, mt: { xs: 0.5, md: 0 },
          fontSize: 15.5, fontWeight: 500,
          "& .search-btn-label": {
            position: "relative", zIndex: 2, color: "#fff",
            transition: REDUCED ? "none" : "color .45s cubic-bezier(0.22,1,0.36,1)",
          },
          "&::before": {
            content: '""',
            position: "absolute", zIndex: 1,
            left: "100%", top: "100%",
            width: 560, height: 560, ml: "-280px", mt: "-280px",
            borderRadius: "50%", bgcolor: C.ink,
            transform: "scale(0)",
            transition: REDUCED ? "none" : "transform .55s cubic-bezier(0.22,1,0.36,1)",
            pointerEvents: "none",
          },
          "&:hover::before": { transform: "scale(1)" },
        }}
      >
        <Box component="span" className="search-btn-label">Search</Box>
      </Button>

      {/* Suggestions dropdown — picking a suggestion searches immediately */}
      {/* Suggestions — portalled to <body> so the hero's clip-path and the
          partner strip below can never cover or clip it. Positioned to the
          measured bar rect. */}
      {showSugg && filtered.length > 0 && rect && createPortal(
        <Paper
          ref={suggRef}
          elevation={6}
          onMouseDown={e => e.preventDefault()}
          sx={{
            position: "fixed",
            top: rect.bottom + 10, left: rect.left, width: rect.width,
            borderRadius: 4, overflow: "hidden", zIndex: 3000,
            border: "1px solid rgba(31,31,31,0.06)",
          }}
        >
          {filtered.slice(0, 6).map((s, i) => (
            <Box
              key={i}
              onMouseDown={() => { setQuery(s); submit(s); }}
              sx={{
                p: "11px 22px", fontFamily: FONT, fontSize: 14, color: C.text,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 1.25,
                "&:hover": { bgcolor: C.sageSoft },
              }}
            >
              <Search sx={{ color: C.sage, fontSize: 15 }} />
              {s}
            </Box>
          ))}
        </Paper>,
        document.body
      )}
    </Paper>
  );
}