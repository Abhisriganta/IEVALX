
import { useState, useCallback } from "react"; // 🔧 CHANGE 1/6 — local state for per-section collapse
import {
  Box,
  Stack,
  Card,
  CardContent,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Button,
  Alert,
  CircularProgress,
  Collapse, // 🔧 CHANGE 2/6 — smooth expand/collapse for section body
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
} from "@mui/material";
import {
  Add,
  Close,
  Remove,
  Refresh,
  Warning,
  DeleteOutlined,
  Bolt,
  FiberManualRecord,
  DescriptionOutlined,
  WorkOutlineOutlined,
  PersonOutlineOutlined,
  AccessTimeOutlined,
  GpsFixedOutlined,
  CloudUploadOutlined,
  ExpandMore, // 🔧 CHANGE 3/6 — chevron icon for the accordion toggle
} from "@mui/icons-material";

import { T, fSx } from "./Extendedbuilder";
import {
  LEVELS,
  QTYPES,
  QTYPE_LABEL,
  FIELD_LABELS,
  DEFAULT_MARKS,
  sectionHeaderSx,
  sectionCard,
  navyBtn,
  ghostBtn,
  iconFieldSx,
  leftIcon,
} from "./AIBuilderShared";

export default function ConfigurePage({ config, gen, repo }) {
  const {
    name,
    setName,
    role,
    setRole,
    level,
    setLevel,
    docText,
    setDocText,
    docFiles,
    docBusy,
    sections,
    instructions,
    setInstructions,
    passingMarks,
    setPassingMarks,
    fieldErrors,
    sectionErrors,
    sectionQCount,
    totalRequested,
    clearFieldError,
    removeSection,
    setSectionName,
    setSectionDuration,
    addSection,
    setTypeCount,
    setTypeMarks,
    sectionMarksTotal,
    assessmentMarksTotal,
    removeTypeRow,
    setPendingType,
    commitPendingType,
    onDocFile,
    removeDocFile,
    clearAllDocs,
  } = config;
  const { busy, onGenerate } = gen;
  const { onOpenLoadRepo } = repo;

  const [collapsedUids, setCollapsedUids] = useState(() => new Set());
  const [deletePendingUid, setDeletePendingUid] = useState(null);
  const pendingDeleteSection = sections.find((s) => s._uid === deletePendingUid);

  const requestRemoveSection = useCallback((sec) => {
    const hasContent =
      !!sec.durationMinutes ||
      Object.keys(sec.typeCounts || {}).length > 0 ||
      (sec.name || "").trim() !== `Section ${sections.indexOf(sec) + 1}`;
    if (hasContent) {
      setDeletePendingUid(sec._uid);
    } else {
      removeSection(sec._uid);
    }
  }, [removeSection, sections]);

  const confirmDeleteSection = useCallback(() => {
    if (deletePendingUid) removeSection(deletePendingUid);
    setDeletePendingUid(null);
  }, [deletePendingUid, removeSection]);

  const toggleSectionCollapsed = useCallback((uid) => {
    setCollapsedUids((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  }, []);

  const _passMarksErr = (() => {
    if (passingMarks === "" || passingMarks === null || passingMarks === undefined) return "";
    const n = Number(passingMarks);
    if (Number.isNaN(n)) return "Enter a number between 0 and 100.";
    if (n < 0 || n > 100) return "Must be between 0 and 100.";
    return "";
  })();

  return (
    <Stack spacing={2.5}>
      {/* Top action strip — Load from repository */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: 1,
        }}
      >
        <Button
          onClick={onOpenLoadRepo}
          disabled={busy}
          startIcon={<DescriptionOutlined sx={{ fontSize: 15 }} />}
          sx={{
            textTransform: "none",
            fontSize: "0.78rem",
            fontWeight: 600,
            borderRadius: "10px",
            bgcolor: "rgba(127,158,126,0.10)",
            border: "1px solid rgba(127,158,126,0.30)",
            color: "#022124",
            px: 2,
            py: 0.75,
            "&:hover": {
              bgcolor: "rgba(127,158,126,0.18)",
              borderColor: "#7F9E7E",
            },
            "&.Mui-disabled": {
              color: "#9AA39A",
              borderColor: "rgba(127,158,126,0.15)",
              bgcolor: "rgba(127,158,126,0.05)",
            },
          }}
        >
          Load from repository
        </Button>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1.05fr 1fr" },
          gap: 2.5,
          alignItems: "stretch",
        }}
      >
        {/* ── LEFT COLUMN ─────────────────────────────────────────────── */}
        <Stack spacing={2.5}>
          {/* ASSESSMENT DETAILS */}
          <Card sx={sectionCard}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography sx={{ ...sectionHeaderSx, mb: 2 }}>
                Assessment details
              </Typography>

              <Stack spacing={1.5}>
                <TextField
                  label="Job role"
                  value={role}
                  onChange={(e) => {
                    setRole(e.target.value);
                    clearFieldError("role");
                  }}
                  error={!!fieldErrors.role}
                  fullWidth
                  sx={iconFieldSx}
                  slotProps={{
                    input: { startAdornment: leftIcon(WorkOutlineOutlined) },
                    inputLabel: { shrink: true },
                  }}
                />
                <TextField
                  label="Assessment name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    clearFieldError("name");
                  }}
                  error={!!fieldErrors.name}
                  placeholder="e.g. Backend Developer — AI Assessment"
                  fullWidth
                  sx={iconFieldSx}
                  slotProps={{
                    input: { startAdornment: leftIcon(DescriptionOutlined) },
                    inputLabel: { shrink: true },
                  }}
                />
                <FormControl fullWidth sx={iconFieldSx}>
                  <InputLabel shrink>Experience level</InputLabel>
                  <Select
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    displayEmpty
                    label="Experience level"
                    startAdornment={leftIcon(PersonOutlineOutlined)}
                    MenuProps={{ sx: { zIndex: 1600 } }}
                  >
                    {LEVELS.map((l) => (
                      <MenuItem
                        key={l.value}
                        value={l.value}
                        sx={{ fontSize: "0.85rem" }}
                      >
                        {l.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

              </Stack>
            </CardContent>
          </Card>
          <Stack spacing={2}>
            {sections.map((sec, secIdx) => {
              const secErr = sectionErrors[sec._uid] || {};
              const qCount = sectionQCount(sec);
              const secMarks = sectionMarksTotal(sec);
              const durInvalid = !!secErr.duration;
              const nameInvalid = !!secErr.name;
              const typesInvalid = !!secErr.typeCounts;
              const hasError = nameInvalid || durInvalid || typesInvalid;
              const isCollapsed = collapsedUids.has(sec._uid) && !hasError;
              return (
                <Card
                  key={sec._uid}
                  sx={{
                    ...sectionCard,
                    borderColor:
                      nameInvalid || durInvalid || typesInvalid
                        ? T.error
                        : T.border,
                  }}
                >
                  <CardContent sx={{ p: 2.5 }}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      sx={{
                        width: "100%",
                        mb: isCollapsed ? 0 : 1.5,
                      }}
                    >
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1.25}
                      >
                        <Typography sx={sectionHeaderSx}>
                          {`Section ${secIdx + 1}`}
                        </Typography>
                        <Chip
                          label={`${qCount} question${qCount === 1 ? "" : "s"}`}
                          size="small"
                          sx={{
                            height: 24,
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            bgcolor: qCount > 0 ? T.warnBg : "#EEF2F7",
                            color: qCount > 0 ? T.warn : T.textMuted,
                            border: `1px solid ${qCount > 0 ? T.warnBdr || T.warn : T.border}`,
                            borderRadius: "999px",
                            px: 0.75,
                            letterSpacing: "0.02em",
                          }}
                        />
                      
                        <Chip
                          label={`${secMarks} mark${secMarks === 1 ? "" : "s"}`}
                          size="small"
                          sx={{
                            height: 24,
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            bgcolor: secMarks > 0 ? T.navyLight : "#EEF2F7",
                            color: secMarks > 0 ? T.navy : T.textMuted,
                            border: `1px solid ${secMarks > 0 ? T.navy : T.border}`,
                            borderRadius: "999px",
                            px: 0.75,
                            letterSpacing: "0.02em",
                          }}
                        />
                      </Stack>
                      <Tooltip
                        title={
                          sections.length <= 1
                            ? "At least one section is required"
                            : "Delete section"
                        }
                      >
                        <span style={{ marginLeft: "auto" }}>
                          <IconButton
                            size="small"
                            onClick={() => requestRemoveSection(sec)}
                            disabled={sections.length <= 1}
                            sx={{
                              color: T.textMuted,
                              "&:hover": {
                                color: T.error || "#DC2626",
                                bgcolor: "#FEE2E2",
                              },
                              "&.Mui-disabled": { color: "#CBD5E1" },
                            }}
                          >
                            <DeleteOutlined sx={{ fontSize: 18 }} />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <IconButton
                        size="small"
                        onClick={() => toggleSectionCollapsed(sec._uid)}
                        disabled={hasError}
                        title={
                          hasError
                            ? "Fix errors to collapse"
                            : isCollapsed
                              ? "Expand section"
                              : "Collapse section"
                        }
                        sx={{
                          color: T.textMuted,
                          transition: "transform 200ms ease",
                          transform: isCollapsed
                            ? "rotate(-90deg)"
                            : "rotate(0deg)",
                          "&:hover": { color: T.navy, bgcolor: T.navyLight },
                        }}
                      >
                        <ExpandMore sx={{ fontSize: 20 }} />
                      </IconButton>
                    </Stack>

                    <Collapse in={!isCollapsed} timeout={220} unmountOnExit>
                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: "1.6fr 1fr",
                          gap: 1.5,
                          mb: 2,
                        }}
                      >
                        <TextField
                          label="Section name"
                          value={sec.name}
                          onChange={(e) =>
                            setSectionName(sec._uid, e.target.value)
                          }
                          error={nameInvalid}
                          helperText={nameInvalid ? secErr.name : ""}
                          placeholder="e.g. Technical Round, Aptitude, Coding Challenge"
                          fullWidth
                          sx={iconFieldSx}
                          slotProps={{
                            input: {
                              startAdornment: leftIcon(DescriptionOutlined),
                            },
                            inputLabel: { shrink: true },
                          }}
                        />
                        <TextField
                          label="Section duration (min) *"
                          type="number"
                          value={sec.durationMinutes}
                          onChange={(e) =>
                            setSectionDuration(sec._uid, e.target.value)
                          }
                          error={durInvalid}
                          helperText={
                            durInvalid
                              ? secErr.duration
                              : "Required — must be > 0"
                          }
                          placeholder="e.g. 20"
                          fullWidth
                          sx={iconFieldSx}
                          slotProps={{
                            htmlInput: { min: 1 },
                            input: {
                              startAdornment: leftIcon(AccessTimeOutlined),
                            },
                            inputLabel: { shrink: true },
                          }}
                        />
                      </Box>

                      <Typography
                        sx={{
                          fontSize: "0.76rem",
                          color: T.textMuted,
                          mb: 1.5,
                          lineHeight: 1.55,
                        }}
                      >
                        Pick a format, then set how many of that type the AI
                        should write for this section.
                      </Typography>

                      <Stack spacing={1.75}>
                        {Object.entries(sec.typeCounts).map(([type, tcRaw]) => {
                          const tc =
                            tcRaw && typeof tcRaw === "object"
                              ? tcRaw
                              : { count: Number(tcRaw) || 0, marks: DEFAULT_MARKS[type] ?? 1 };
                          const count = Number(tc.count) || 0;
                          const marks = Number(tc.marks) || 0;
                          const subtotal = count * marks;
                          const isCustomMarks =
                            marks !== (DEFAULT_MARKS[type] ?? 1);
                          const stepBtnSx = {
                            width: 22,
                            height: 22,
                            borderRadius: "6px",
                            border: `1px solid ${T.border}`,
                            color: T.textSecond,
                            "&:hover": {
                              bgcolor: T.navyLight,
                              color: T.navy,
                              borderColor: T.navy,
                            },
                          };
                          // 🔧 CHANGE 7/7 — Vertical card + 3-column table
                          // (Count | Marks each | Subtotal) with column headers
                          // above the steppers. Replaces the previous single-row
                          // wrapping layout. All handlers unchanged:
                          //   setTypeCount / setTypeMarks / removeTypeRow.
                          // Reusable cell sx tokens (kept local to preserve
                          // the isCustomMarks closure without prop drilling).
                          const headerCellSx = {
                            fontSize: "0.65rem",
                            fontWeight: 700,
                            color: T.textPrimary,
                            letterSpacing: 0.7,
                            textTransform: "uppercase",
                            textAlign: "center",
                            py: 1,
                            px: 2,
                          };
                          const bodyCellSx = {
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            py: 1.25,
                            px: 2,
                          };
                          return (
                            <Box
                              key={type}
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 2.5,
                                border: `1px solid ${T.border}`,
                                borderRadius: "12px",
                                px: 2,
                                py: 1.25,
                                bgcolor: "#fff",
                              }}
                            >
                              {/* Left: dot + type name */}
                              <Stack
                                direction="row"
                                alignItems="center"
                                spacing={1.25}
                                sx={{
                                  flex: "1 1 auto",
                                  minWidth: 0,
                                  pr: 1.5,
                                }}
                              >
                                <FiberManualRecord
                                  sx={{ fontSize: 9, color: T.navy }}
                                />
                                <Typography
                                  noWrap
                                  sx={{
                                    fontSize: "0.8rem",
                                    fontWeight: 600,
                                    color: T.textPrimary,
                                  }}
                                >
                                  {QTYPE_LABEL[type] || type}
                                </Typography>
                              </Stack>

                              <Box
                                sx={{
                                  display: "grid",
                                  gridTemplateColumns:
                                    "minmax(96px, auto) minmax(96px, auto) minmax(60px, auto)",
                                  border: `1px solid ${T.border}`,
                                  borderRadius: "8px",
                                  overflow: "hidden",
                                  bgcolor: "#fff",
                                }}
                              >
                                {/* Header row */}
                                <Typography sx={headerCellSx}>Count</Typography>
                                <Typography
                                  sx={{
                                    ...headerCellSx,
                                    borderLeft: `1px solid ${T.border}`,
                                    color: isCustomMarks ? T.navy : T.textMuted,
                                    fontWeight: isCustomMarks ? 700 : 600,
                                  }}
                                >
                                  Marks each
                                </Typography>
                                <Typography
                                  sx={{
                                    ...headerCellSx,
                                    borderLeft: `1px solid ${T.border}`,
                                  }}
                                >
                                  Subtotal
                                </Typography>

                                {/* Body row: Count stepper */}
                                <Box
                                  sx={{
                                    ...bodyCellSx,
                                    borderTop: `1px solid ${T.border}`,
                                    bgcolor: "#FAFBFD",
                                  }}
                                >
                                  <Stack
                                    direction="row"
                                    alignItems="center"
                                    spacing={0.6}
                                  >
                                    <IconButton
                                      size="small"
                                      onClick={() =>
                                        setTypeCount(sec._uid, type, count - 1)
                                      }
                                      disabled={count <= 0}
                                      sx={stepBtnSx}
                                    >
                                      <Remove sx={{ fontSize: 12 }} />
                                    </IconButton>
                                    <Typography
                                      sx={{
                                        minWidth: 24,
                                        textAlign: "center",
                                        fontSize: "0.85rem",
                                        fontWeight: 700,
                                        color: T.textPrimary,
                                      }}
                                    >
                                      {count}
                                    </Typography>
                                    <IconButton
                                      size="small"
                                      onClick={() =>
                                        setTypeCount(sec._uid, type, count + 1)
                                      }
                                      sx={stepBtnSx}
                                    >
                                      <Add sx={{ fontSize: 12 }} />
                                    </IconButton>
                                  </Stack>
                                </Box>

                                {/* Body row: Marks-each stepper */}
                                <Box
                                  sx={{
                                    ...bodyCellSx,
                                    borderTop: `1px solid ${T.border}`,
                                    borderLeft: `1px solid ${T.border}`,
                                    bgcolor: "#FAFBFD",
                                  }}
                                >
                                  <Stack
                                    direction="row"
                                    alignItems="center"
                                    spacing={0.6}
                                  >
                                    <IconButton
                                      size="small"
                                      onClick={() =>
                                        setTypeMarks(sec._uid, type, marks - 1)
                                      }
                                      disabled={marks <= 0}
                                      sx={stepBtnSx}
                                    >
                                      <Remove sx={{ fontSize: 12 }} />
                                    </IconButton>
                                    <Typography
                                      sx={{
                                        minWidth: 24,
                                        textAlign: "center",
                                        fontSize: "0.85rem",
                                        fontWeight: 700,
                                        color: isCustomMarks
                                          ? T.navy
                                          : T.textPrimary,
                                      }}
                                    >
                                      {marks}
                                    </Typography>
                                    <IconButton
                                      size="small"
                                      onClick={() =>
                                        setTypeMarks(sec._uid, type, marks + 1)
                                      }
                                      sx={stepBtnSx}
                                    >
                                      <Add sx={{ fontSize: 12 }} />
                                    </IconButton>
                                  </Stack>
                                </Box>

                                {/* Body row: Subtotal */}
                                <Box
                                  sx={{
                                    ...bodyCellSx,
                                    borderTop: `1px solid ${T.border}`,
                                    borderLeft: `1px solid ${T.border}`,
                                    bgcolor: "#FAFBFD",
                                  }}
                                >
                                  <Typography
                                    sx={{
                                      fontSize: "0.95rem",
                                      fontWeight: 700,
                                      color: T.textPrimary,
                                    }}
                                  >
                                    {subtotal}
                                  </Typography>
                                </Box>
                              </Box>

                              {/* Far right: remove × */}
                              <IconButton
                                size="small"
                                onClick={() => removeTypeRow(sec._uid, type)}
                                sx={{
                                  color: T.textMuted,
                                  p: 0.25,
                                  ml: 0.25,
                                  "&:hover": { color: T.error },
                                }}
                              >
                                <Close sx={{ fontSize: 14 }} />
                              </IconButton>
                            </Box>
                          );
                        })}
                        {Object.keys(sec.typeCounts).length === 0 && (
                          <Typography
                            sx={{
                              fontSize: "0.78rem",
                              color: T.textMuted,
                              py: 1,
                            }}
                          >
                            No types added yet — choose one below.
                          </Typography>
                        )}
                      </Stack>

                      {typesInvalid && (
                        <Typography
                          sx={{ fontSize: "0.75rem", color: T.error, mt: 1 }}
                        >
                          {secErr.typeCounts}
                        </Typography>
                      )}

                      <Stack direction="row" spacing={1.25} sx={{ mt: 2 }}>
                        <FormControl
                          size="small"
                          fullWidth
                          sx={{
                            ...fSx,
                            "& .MuiOutlinedInput-root": {
                              ...(fSx["& .MuiOutlinedInput-root"] || {}),
                              borderRadius: "10px",
                              bgcolor: T.surface,
                            },
                          }}
                        >
                          <Select
                            value={sec.pendingType}
                            onChange={(e) =>
                              setPendingType(sec._uid, e.target.value)
                            }
                            displayEmpty
                            renderValue={(v) =>
                              v ? (
                                QTYPE_LABEL[v] || v
                              ) : (
                                <Typography
                                  component="span"
                                  sx={{
                                    fontSize: "0.85rem",
                                    color: T.textMuted,
                                  }}
                                >
                                  Add a question type
                                </Typography>
                              )
                            }
                            MenuProps={{ sx: { zIndex: 1600 } }}
                          >
                            {QTYPES.map((qt) => {
                              const already = qt.value in sec.typeCounts;
                              return (
                                <MenuItem
                                  key={qt.value}
                                  value={qt.value}
                                  disabled={already}
                                  sx={{ fontSize: "0.85rem" }}
                                >
                                  {qt.label}
                                  {already ? "  ✓" : ""}
                                </MenuItem>
                              );
                            })}
                          </Select>
                        </FormControl>
                        <Button
                          onClick={() => commitPendingType(sec._uid)}
                          disabled={!sec.pendingType}
                          startIcon={<Add sx={{ fontSize: 16 }} />}
                          sx={{
                            ...navyBtn,
                            px: 3,
                            whiteSpace: "nowrap",
                            bgcolor: sec.pendingType ? T.navy : "#CBD5E1",
                          }}
                        >
                          Add
                        </Button>
                      </Stack>
                    </Collapse>
                  </CardContent>
                </Card>
              );
            })}

            <Button
              onClick={addSection}
              startIcon={<Add sx={{ fontSize: 18 }} />}
              sx={{
                alignSelf: "flex-start",
                textTransform: "none",
                fontWeight: 700,
                fontSize: "0.85rem",
                color: T.navy,
                borderRadius: "10px",
                border: `1.5px dashed ${T.navy}`,
                bgcolor: "transparent",
                px: 2.5,
                py: 1,
                "&:hover": { bgcolor: T.navyLight },
              }}
            >
              Add section
            </Button>
            <Typography
              sx={{ fontSize: "0.75rem", color: T.textMuted, mt: 0.5 }}
            >
              {`Total across all sections: ${totalRequested} question${totalRequested === 1 ? "" : "s"}`}
              {assessmentMarksTotal > 0 &&
                ` — ${assessmentMarksTotal} mark${assessmentMarksTotal === 1 ? "" : "s"}`}
            </Typography>

            <Card
              sx={{
                ...sectionCard,
                borderLeft: `4px solid ${T.navy}`,
                mt: 1,
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Typography sx={{ ...sectionHeaderSx, mb: 1.5 }}>
                  Pass criteria
                </Typography>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2.5}
                  alignItems={{ xs: "stretch", sm: "flex-start" }}
                >
                  <Box sx={{ minWidth: 180, flex: "0 0 auto" }}>
                    <Typography
                      sx={{
                        fontSize: "0.68rem",
                        fontWeight: 700,
                        color: T.textMuted,
                        textTransform: "uppercase",
                        letterSpacing: 0.7,
                        mb: 0.5,
                      }}
                    >
                      Total Marks (auto)
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: "1.5rem",
                        fontWeight: 700,
                        color: T.textPrimary,
                        lineHeight: 1.1,
                      }}
                    >
                      {assessmentMarksTotal || 0}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: "0.7rem",
                        color: T.textMuted,
                        mt: 0.5,
                        lineHeight: 1.4,
                      }}
                    >
                      Sum of marks across every question in every section.
                    </Typography>
                  </Box>
                  
                </Stack>
              </CardContent>
            </Card>
          </Stack>


        </Stack>

        <Card sx={{ ...sectionCard, display: "flex", flexDirection: "column" }}>
          <CardContent
            sx={{ p: 2.5, flex: 1, display: "flex", flexDirection: "column" }}
          >
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 1 }}
            >
              <Typography sx={sectionHeaderSx}>Topic documents</Typography>
              {docFiles.length > 0 && (
                <Chip
                  label={`${docFiles.length} file${docFiles.length > 1 ? "s" : ""} · ${docText.length} chars total`}
                  size="small"
                  onDelete={clearAllDocs}
                  deleteIcon={<Close sx={{ fontSize: 12 }} />}
                  sx={{
                    height: 22,
                    fontSize: "0.66rem",
                    fontWeight: 600,
                    bgcolor: T.navyLight,
                    color: T.navy,
                    borderRadius: "6px",
                  }}
                />
              )}
            </Stack>
            <Typography
              sx={{
                fontSize: "0.78rem",
                color: T.textMuted,
                mb: 2,
                lineHeight: 1.55,
              }}
            >
              Upload one or more files describing what the test should cover
              (PDF, DOCX, TXT) — or type the topics below. The AI reads all
              documents together and generates questions from the combined
              content.
            </Typography>

            {docFiles.length > 0 && (
              <Stack
                direction="row"
                spacing={0.75}
                sx={{ flexWrap: "wrap", gap: 0.75, mb: 1.5 }}
              >
                {docFiles.map((df, idx) => (
                  <Chip
                    key={`${df.name}-${idx}`}
                    label={`${df.name} · ${df.chars} chars`}
                    size="small"
                    onDelete={() => removeDocFile(idx)}
                    deleteIcon={<Close sx={{ fontSize: 12 }} />}
                    sx={{
                      height: 24,
                      fontSize: "0.68rem",
                      fontWeight: 600,
                      bgcolor: "#EEF2F7",
                      color: T.textSecond,
                      borderRadius: "6px",
                      border: `1px solid ${T.border}`,
                    }}
                  />
                ))}
              </Stack>
            )}

            <Button
              component="label"
              disabled={docBusy}
              sx={{
                textTransform: "none",
                width: "100%",
                py: 2.5,
                mb: 2,
                borderRadius: "12px",
                border: `1.5px dashed #9CA3AF`,
                bgcolor: T.surface,
                color: T.textSecond,
                fontSize: "0.88rem",
                fontWeight: 600,
                gap: 1,
                boxShadow: "0 2px 6px rgba(16, 24, 40, 0.06)",
                transition:
                  "box-shadow 180ms ease, border-color 180ms ease, background-color 180ms ease, color 180ms ease, transform 180ms ease",
                "&:hover": {
                  borderColor: T.navy,
                  bgcolor: T.navyLight,
                  color: T.navy,
                  boxShadow: "0 6px 16px rgba(30, 51, 88, 0.14)",
                  transform: "translateY(-1px)",
                },
                "&:active": {
                  boxShadow: "0 2px 4px rgba(30, 51, 88, 0.10)",
                  transform: "translateY(0)",
                },
                "&.Mui-disabled": {
                  boxShadow: "none",
                },
              }}
            >
              {docBusy ? (
                <>
                  <Refresh sx={{ fontSize: 18 }} /> Reading…
                </>
              ) : (
                <>
                  <CloudUploadOutlined sx={{ fontSize: 19 }} />
                  {docFiles.length > 0
                    ? "Add another document"
                    : "Upload document"}
                </>
              )}
              <input
                hidden
                type="file"
                accept=".pdf,.docx,.txt,.md"
                onChange={(e) => {
                  onDocFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </Button>

            <TextField
              value={docText}
              onChange={(e) => {
                setDocText(e.target.value);
                clearFieldError("docText");
              }}
              error={!!fieldErrors.docText}
              placeholder="e.g. Test the candidate on our REST API conventions, JWT auth flow, pagination, and the order-processing pipeline. Focus on practical backend scenarios rather than syntax trivia."
              multiline
              fullWidth
              sx={{
                ...fSx,
                flex: 1,
                "& .MuiOutlinedInput-root": {
                  ...(fSx["& .MuiOutlinedInput-root"] || {}),
                  height: "100%",
                  alignItems: "flex-start",
                  borderRadius: "12px",
                  bgcolor: "#FAFBFD",
                  minHeight: 360,
                },
                "& .MuiOutlinedInput-input": { height: "100% !important" },
                "& textarea": { fontSize: "0.88rem", lineHeight: 1.6 },
              }}
            />
          </CardContent>
        </Card>
      </Box>

      {Object.keys(fieldErrors).length > 0 && (
        <Stack spacing={1} sx={{ mt: 1 }}>
          <Alert
            severity="error"
            icon={<Warning sx={{ fontSize: 18 }} />}
            sx={{
              borderRadius: "10px",
              border: `1px solid ${T.errorBdr || "#FCA5A5"}`,
              fontSize: "0.8rem",
              fontWeight: 600,
              py: 0.5,
              alignItems: "center",
              "& .MuiAlert-message": { py: 0.5 },
            }}
          >
            {Object.keys(fieldErrors).length} required field
            {Object.keys(fieldErrors).length > 1 ? "s are" : " is"} missing —
            please fix the item
            {Object.keys(fieldErrors).length > 1 ? "s" : ""} below before
            continuing.
          </Alert>
          {Object.entries(fieldErrors).map(([field, msg]) => (
            <Alert
              key={field}
              severity="warning"
              icon={<Warning sx={{ fontSize: 16 }} />}
              sx={{
                borderRadius: "10px",
                border: `1px solid ${T.warnBdr || "#FDE68A"}`,
                fontSize: "0.78rem",
                py: 0.25,
                alignItems: "flex-start",
                "& .MuiAlert-message": { py: 0.5 },
              }}
            >
              <Box component="span" sx={{ fontWeight: 700, mr: 0.5 }}>
                {FIELD_LABELS[field] || field}:
              </Box>
              {msg}
            </Alert>
          ))}
        </Stack>
      )}

      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          width: "100%",
          mt: 1,
          gap: 1,
        }}
      >
        <Button
          onClick={onGenerate}
          disabled={busy}
          sx={navyBtn}
          startIcon={
            busy ? (
              <CircularProgress size={15} sx={{ color: "#fff" }} />
            ) : (
              <Bolt sx={{ fontSize: 16 }} />
            )
          }
        >
          Generate assessment
        </Button>
      </Box>

      {/* Delete-section confirmation. Only shown when the section already
          has content — empty sections are removed silently in
          requestRemoveSection above. */}
      <Dialog
        open={!!deletePendingUid}
        onClose={() => setDeletePendingUid(null)}
        fullWidth
        maxWidth="xs"
        sx={{ zIndex: 100020 }}
        slotProps={{
          paper: {
            sx: { borderRadius: "14px", border: `1px solid ${T.border}` },
          },
        }}
      >
        <DialogTitle
          sx={{ fontSize: "1rem", fontWeight: 700, color: T.textPrimary }}
        >
          Delete section?
        </DialogTitle>
        <DialogContent>
          <Typography
            sx={{ fontSize: "0.88rem", color: T.textSecond, lineHeight: 1.6 }}
          >
            This will remove{" "}
            <Box
              component="span"
              sx={{ fontWeight: 700, color: T.textPrimary }}
            >
              "{(pendingDeleteSection?.name || "").trim() || "this section"}"
            </Box>{" "}
            along with its{" "}
            {Object.keys(pendingDeleteSection?.typeCounts || {}).length} question
            type row(s) and duration. This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeletePendingUid(null)} sx={ghostBtn}>
            Cancel
          </Button>
          <Button
            onClick={confirmDeleteSection}
            sx={{
              ...navyBtn,
              bgcolor: T.error || "#DC2626",
              "&:hover": { bgcolor: "#B91C1C" },
            }}
            startIcon={<DeleteOutlined sx={{ fontSize: 14 }} />}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}