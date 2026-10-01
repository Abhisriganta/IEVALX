// ============================================================================
// SectionPage.jsx — Section editor page: header, progress bar, 2-col grid
//                   of FieldRow cards, and AddLineForm expansion.
// Location: src/components/jobseeker/Workspace/AIResumeBuilder/SectionPage.jsx
//
// FIX: Pass `showToast` to ProfilePhotoCard so upload success/failure toasts
// are surfaced to the user.
// ADDED: Photo undo banner — shown after addProfilePhoto succeeds.
//        Self-contained: calls removeProfilePhoto directly, no parent changes needed.
// [PHOTO ALIGNMENT] headerLayout detection + always-show photo area with fallback anchor.
//
// [MERGE 2026-06] Removed the duplicate standalone "Profile Photo" card that
// rendered inside the field grid (FieldRow image branch). The blue Profile
// Photo strip is now the SINGLE place to manage the photo (Replace / Remove /
// Undo). See the CHANGE marker in the field .map below.
//
// [ADD SECTION 2026-06] Added "Add New Section" button at the bottom of every
// non-header, non-page section. Expands inline to a name input, calls
// onAddSection(title, afterParaIndex) on confirm. Zero changes to existing logic.
// ============================================================================

import React, { useState, useRef } from "react";
import { Box, Divider, Typography, Button } from "@mui/material";
import { Edit2, CheckCircle, X as XIcon, Camera, RotateCcw, Trash2, Upload, Plus } from "lucide-react";
import { SECTION_META } from "@/constants/resumeAiConstants";
import resumeAiService from "@/services/api/jobseeker/resumeAiService";
import FieldRow from "./FieldRow";
import AddLineForm from "./AddLineForm";
import AddContactPanel from "./AddContactPanel";
import ProfilePhotoCard from "./ProfilePhotoCard";
import PhotoEditorModal from "./PhotoEditorModal";

function SectionPage({
  sectionKey,
  fields,
  onSave,
  undoHistories = {},
  onPushUndo,
  onPopUndo,
  saving,
  sessionId,
  onAddLine,
  onDeleteLine,
  onDeleteField,
  addingAfter,
  setAddingAfter,
  onAddLineSubmit,
  onAddPage,
  isLastSection,
  onEditStart,
  onEditEnd,
  onAddContent,
  onLinkSave,
  onRelinkDone,
  isDark = false,
  isReadOnly = false,
  onNextSection = null,
  hasPageBreak = false,
  onMoveToNextPage = null,
  onAddBlankLine = null,
  onReplaceImage = null,
  onUndoImage = null,
  photoCanUndo = false,
  // ── New props for Add Contact Info feature ──
  showToast = null,
  onContactLinkDone = null,
  // ── [ADD SECTION] New prop ──
  // Called with (sectionTitle: string, afterParaIndex: number)
  // Parent (AIResumeBuilderApp) handles the API call and fields refresh.
  onAddSection = null,
  footerSlot = null,
  headerSlot = null,
}) {
  // ── [ADD SECTION] Local state for inline name input ──────────────────────
  const [addSectionOpen,  setAddSectionOpen]  = useState(false);
  const [addSectionTitle, setAddSectionTitle] = useState("");
  const [addingSectionBusy, setAddingSectionBusy] = useState(false);

  // ── Photo undo state ────────────────────────────────────────────────────
  // Tracked locally — resets naturally when user navigates away (SectionPage
  // is keyed, so it remounts on section change).
  const [photoJustAdded,   setPhotoJustAdded]   = useState(false);
  const [undoingPhoto,     setUndoingPhoto]     = useState(false);
  const [photoJustRemoved, setPhotoJustRemoved] = useState(false);
  const [undoingRemove,    setUndoingRemove]    = useState(false);
  // Stores the removed photo's original paraIndex + source so the undo call
  // can pass position hints to the backend and restore it to the exact location.
  const removedPhotoFieldRef = useRef(null);

  // ── Existing-photo management state (Replace / Remove / Undo replace) ───
  const replaceFileInputRef               = useRef(null);
  const [replacePickedImage, setReplacePickedImage] = useState(null);
  const [replaceModalOpen,   setReplaceModalOpen]   = useState(false);
  const [replaceBusy,        setReplaceBusy]        = useState(false);
  const [confirmRemovePhoto, setConfirmRemovePhoto] = useState(false);
  const [removingPhoto,      setRemovingPhoto]      = useState(false);

  const isPageSection = sectionKey.startsWith("__page_");
  const pageNum = isPageSection
    ? sectionKey.replace("__page_", "").replace(/__/g, "")
    : null;
  const meta = isPageSection
    ? {
        label: `Page ${pageNum}`,
        desc: "Content you've added to this page — click any line to edit, or use 'Add Content' to write more.",
      }
    : SECTION_META[sectionKey.toLowerCase()] || SECTION_META.other;
  const nonHeaderFields = fields.filter((f) => !f.isHeader);
  const filledCount = nonHeaderFields.filter(
    (f) => f.text && f.text.trim(),
  ).length;
  const totalCount = nonHeaderFields.length;
  const pct =
    totalCount > 0 ? Math.round((filledCount / totalCount) * 100) : 100;

  const isHeaderSection = sectionKey.toLowerCase() === "header";

  // ── [PHOTO ALIGNMENT] Detect header layout from backend fields ──────────
  // Reads the headerLayout hint that the backend attaches to every header
  // field via extract_fields → _detect_header_layout. Used to:
  //   1. Always show the photo upload card (even for NONE layouts)
  //   2. Pass the hint to ProfilePhotoCard → addProfilePhoto API so the
  //      backend can choose the correct injection strategy.
  const headerLayout = (() => {
    if (!isHeaderSection) return "NONE";
    const hdrField = fields.find(
      (f) => f.headerLayout && f.section?.key === "header"
    );
    return hdrField?.headerLayout || "NONE";
  })();

  // ── [PROFILE PHOTO] Decide whether to show the upload card ──────────────
  // [PHOTO ALIGNMENT] Always show in header section when no photo exists —
  // regardless of whether the original DOCX had space for one. The
  // headerLayout hint tells the backend HOW to inject the photo on download.
  // Previously this returned null when no suitable anchor field existed,
  // hiding the upload card for resumes with no photo space (centered/split).
  const profilePhotoAnchor = (() => {
    if (!isHeaderSection || isReadOnly) return null;
    const hasPhoto = fields.some(
      (f) =>
        f.type === "image" &&
        !f.isIcon &&
        (f.imageIndex === 0 || f.imageIndex == null),
    );
    if (hasPhoto) return null;

    // Find the best anchor paragraph — prefer the first non-header text field
    const anchor = fields.find(
      (f) =>
        !f.isHeader &&
        f.text &&
        f.text.trim() &&
        f.paraIndex != null,
    );

    if (anchor) {
      return {
        paraIndex: anchor.paraIndex,
        source: anchor.source,
        headerLayout,
      };
    }

    // [PHOTO ALIGNMENT] Fallback: use the first field with a valid paraIndex
    // so the upload card ALWAYS renders. Without this, resumes with no
    // non-header text fields in the header section would hide the photo area.
    const fallback = fields.find((f) => f.paraIndex != null && f.paraIndex >= 0);
    return {
      paraIndex: fallback?.paraIndex ?? 0,
      source: fallback?.source ?? "body",
      headerLayout,
    };
  })();

  // ── Detect existing profile photo for management strip ──────────────────
  // When a photo exists, profilePhotoAnchor is null (upload card hides).
  // existingPhotoField drives the Replace / Remove / Undo strip instead.
  const existingPhotoField = (() => {
    if (!isHeaderSection || isReadOnly) return null;
    return fields.find(
      (f) =>
        f.type === "image" &&
        !f.isIcon &&
        (f.imageIndex === 0 || f.imageIndex == null),
    ) || null;
  })();
  const onPhotoFieldsUpdated = (newFields) => {
    if (onContactLinkDone) onContactLinkDone(newFields);
    else if (onRelinkDone) onRelinkDone(newFields);
  };

  // Called by ProfilePhotoCard.onPhotoAdded — triggers the undo banner
  const onPhotoAdded = (newFields) => {
    setPhotoJustAdded(true);
    if (onContactLinkDone) onContactLinkDone(newFields);
    else if (onRelinkDone) onRelinkDone(newFields);
  };

  // Undo: remove the just-added photo via removeProfilePhoto
  const handleUndoPhotoAdd = async () => {
    setUndoingPhoto(true);
    try {
      const d = await resumeAiService.removeProfilePhoto({ session_id: sessionId, image_index: 0 });
      if (d.success) {
        setPhotoJustAdded(false);
        const freshFields = d.fields || [];
        if (onContactLinkDone) onContactLinkDone(freshFields);
        else if (onRelinkDone) onRelinkDone(freshFields);
        showToast?.("Photo removed ✓", "info");
      } else {
        showToast?.(d.error || "Undo failed", "error");
      }
    } catch (e) {
      showToast?.("Undo failed: " + e.message, "error");
    }
    setUndoingPhoto(false);
  };

  // ── Replace photo handlers ───────────────────────────────────────────────
  const handleReplacePickFile = () => replaceFileInputRef.current?.click();

  const handleReplaceFileChange = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) { showToast?.("Please choose a PNG or JPG image.", "error"); return; }
    if (f.size > 5 * 1024 * 1024) { showToast?.("Image too large — max 5 MB.", "error"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      const probe = new Image();
      probe.onload = () => { setReplacePickedImage(dataUrl); setReplaceModalOpen(true); };
      probe.onerror = () => showToast?.("Unsupported image format. Try a PNG or JPG.", "error");
      probe.src = dataUrl;
    };
    reader.readAsDataURL(f);
  };

  const handleReplaceModalSave = async ({ blob }) => {
    if (!existingPhotoField || !onReplaceImage) return;
    setReplaceBusy(true);
    try {
      const file = new File([blob], "profile.png", { type: "image/png" });
      await onReplaceImage(existingPhotoField, file);
      // photoCanUndo is set to true in AIResumeBuilderApp after onReplaceImage
      setReplaceModalOpen(false);
      setReplacePickedImage(null);
    } catch (e) {
      showToast?.("Replace failed: " + e.message, "error");
    }
    setReplaceBusy(false);
  };

  // ── Remove photo handler ─────────────────────────────────────────────────
  const handleRemovePhoto = async () => {
    setRemovingPhoto(true);
    try {
      // [FIX] Snapshot the field's paraIndex + source BEFORE deletion so
      // handleUndoRemove can pass exact position to the backend restore call.
      if (existingPhotoField) {
        removedPhotoFieldRef.current = {
          paraIndex: existingPhotoField.paraIndex,
          source:    existingPhotoField.source || "body",
        };
      }
      const d = await resumeAiService.removeProfilePhoto({ session_id: sessionId, image_index: 0 });
      if (d.success) {
        setConfirmRemovePhoto(false);
        // [FIX] Track removal so the undo banner appears above the upload card
        setPhotoJustRemoved(true);
        const freshFields = d.fields || [];
        if (onContactLinkDone) onContactLinkDone(freshFields);
        else if (onRelinkDone) onRelinkDone(freshFields);
        showToast?.("Profile photo removed ✓", "info");
      } else {
        removedPhotoFieldRef.current = null; // clear ref on failure
        showToast?.(d.error || "Remove failed", "error");
      }
    } catch (e) {
      removedPhotoFieldRef.current = null;
      showToast?.("Remove failed: " + e.message, "error");
    }
    setRemovingPhoto(false);
  };

  // ── Undo remove handler ──────────────────────────────────────────────────
  // Passes original_para_index + original_source to the backend so it can
  // restore the photo to the exact table-cell / paragraph it came from,
  // instead of reinsert it at a default body paragraph (wrong position).
  const handleUndoRemove = async () => {
    setUndoingRemove(true);
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";
      const token    = localStorage.getItem("ievalx_token");
      const body     = { image_index: 0 };

      // Attach original position from snapshot taken at deletion time
      if (removedPhotoFieldRef.current) {
        body.original_para_index = removedPhotoFieldRef.current.paraIndex;
        body.original_source     = removedPhotoFieldRef.current.source;
      }

      const r = await fetch(
        `${API_BASE}/resume-builder/sessions/${sessionId}/undo-image-replace`,
        {
          method:  "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(body),
        }
      );
      const d = await r.json();
      // Normalise to the same shape as other service responses
      const freshFields = resumeAiService.segmentsToFields(d.fields || d.segments || []);

      if (r.ok && d.success) {
        setPhotoJustRemoved(false);
        removedPhotoFieldRef.current = null;
        if (onContactLinkDone) onContactLinkDone(freshFields);
        else if (onRelinkDone) onRelinkDone(freshFields);
        showToast?.("Photo restored ✓", "success");
      } else if (r.status === 404) {
        setPhotoJustRemoved(false);
        showToast?.("Nothing to restore", "info");
      } else {
        showToast?.(d.error || d.detail || "Restore failed", "error");
      }
    } catch (e) {
      showToast?.("Restore failed: " + e.message, "error");
    }
    setUndoingRemove(false);
  };

  // ── [ADD SECTION] Submit handler ─────────────────────────────────────────
  // Finds the paraIndex of the last field in this section and calls
  // onAddSection(title, afterParaIndex). The parent handles the API + refresh.
  const handleAddSectionSubmit = async () => {
    const title = addSectionTitle.trim();
    if (!title || !onAddSection) return;
    const lastField = nonHeaderFields[nonHeaderFields.length - 1];
    const afterIdx  = lastField?.paraIndex ?? -1;
    setAddingSectionBusy(true);
    try {
      await onAddSection(title, afterIdx);
      setAddSectionOpen(false);
      setAddSectionTitle("");
    } catch (e) {
      showToast?.("Add section failed: " + e.message, "error");
    }
    setAddingSectionBusy(false);
  };

  const dk = (d, v) => isDark ? d : v;

  return (
    <>
    <Box
      sx={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}
    >
      {/* [REMOVED] Section title card (label + description + progress bar
          + divider) — the stepper above already names the active section,
          so this block was redundant and cost ~140px of editing space. */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          px: 4,
          py: 2.5,
          pb: 6,
          bgcolor: isDark ? "rgba(8,16,55,.92)" : "transparent",
          scrollbarWidth: "thin",
          scrollbarColor: isDark ? "rgba(159,184,158,.45) transparent" : "#C9CEC4 transparent",
          "&::-webkit-scrollbar": { width: 8 },
          "&::-webkit-scrollbar-track": { background: "transparent" },
          "&::-webkit-scrollbar-thumb": {
            background: isDark ? "rgba(159,184,158,.45)" : "#C9CEC4",
            borderRadius: 99,
            "&:hover": { background: isDark ? "rgba(159,184,158,.7)" : "#7F9E7E" },
          },
        }}
      >
        {/* Integrated section tabs — scroll WITH the form content,
            mirroring the integrated footer below. */}
        {headerSlot}

        {/* Empty-page placeholder — only shown for blank page sections */}
        {isPageSection && fields.length === 0 && (
          <Box
            onClick={onAddContent}
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: 220,
              gap: 2,
              bgcolor: "#FAFCFB",
              border: "1.5px dashed #D6E4E0",
              borderRadius: 3,
              cursor: "pointer",
              transition: "all .18s",
              "&:hover": {
                bgcolor: "#F1F6F4",
                borderColor: "#6FA095",
                borderStyle: "solid",
                "& .page-edit-icon": { transform: "scale(1.15)" },
              },
            }}
          >
            <Box
              className="page-edit-icon"
              sx={{
                width: 52,
                height: 52,
                bgcolor: "#F1F6F4",
                borderRadius: 2.5,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "transform .18s",
                boxShadow: "0 2px 12px rgba(29,90,80,0.12)",
              }}
            >
              <Edit2 size={22} color="#1D5A50" />
            </Box>
            <Box sx={{ textAlign: "center" }}>
              <Typography
                sx={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#3A3D37",
                  mb: 0.5,
                }}
              >
                This page is empty
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: "#7A8073" }}>
                Click here to start writing on this page
              </Typography>
            </Box>
          </Box>
        )}

        {/* ── Photo undo banner ─────────────────────────────────────────
            Shown immediately after addProfilePhoto succeeds. Dismissed by
            clicking Undo (removes photo) or the × (dismisses without undo).
            Disappears automatically when user navigates to another section
            because SectionPage remounts (it is keyed). ──────────────── */}
        {photoJustAdded && !profilePhotoAnchor && (
          <Box sx={{
            display: "flex", alignItems: "center", gap: 1.5, mb: 1.5,
            px: 2, py: 1.25, borderRadius: 2,
            bgcolor: dk("rgba(22,163,74,.1)", "#f0fdf4"),
            border: dk("1px solid rgba(22,163,74,.25)", "1px solid #bbf7d0"),
          }}>
            <CheckCircle size={15} color={dk("#4ade80", "#16a34a")} style={{ flexShrink: 0 }} />
            <Typography sx={{
              flex: 1, fontSize: 12.5, fontWeight: 600,
              color: dk("#4ade80", "#15803d"), fontFamily: "'Jost',sans-serif",
            }}>
              Profile photo added to resume
            </Typography>
            <Button
              onClick={handleUndoPhotoAdd}
              disabled={undoingPhoto}
              size="small"
              sx={{
                fontSize: 11, fontWeight: 700, textTransform: "none",
                borderRadius: 99, px: 1.5, py: 0.375, minWidth: 0,
                color: dk("#f87171", "#dc2626"),
                border: dk("1px solid rgba(248,113,113,.3)", "1px solid #fecaca"),
                bgcolor: dk("rgba(220,38,38,.08)", "#fff5f5"),
                "&:hover": { bgcolor: dk("rgba(220,38,38,.16)", "#fee2e2") },
                "&.Mui-disabled": { opacity: 0.55 },
              }}
            >
              {undoingPhoto ? "Removing…" : "↩ Undo"}
            </Button>
            <Box
              component="button"
              onClick={() => setPhotoJustAdded(false)}
              sx={{
                width: 22, height: 22, borderRadius: "50%", border: "none",
                bgcolor: "transparent", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: dk("rgba(74,222,128,.4)", "#7A8073"),
                "&:hover": { bgcolor: dk("rgba(255,255,255,.07)", "#F0F2ED") },
              }}
            >
              <XIcon size={11} />
            </Box>
          </Box>
        )}

        {/* ── Profile photo upload — header section, only when no photo exists ── */}
        {/* [FIX] showToast is now forwarded so upload errors/success are toasted */}

        {/* ── Photo removed undo banner ─────────────────────────────────────
            Shown after removeProfilePhoto succeeds. Lets the user restore
            the photo via undoImageReplace without re-uploading. ────────── */}
        {photoJustRemoved && profilePhotoAnchor && (
          <Box sx={{
            display: "flex", alignItems: "center", gap: 1.5, mb: 1.5,
            px: 2, py: 1.25, borderRadius: 2,
            bgcolor: dk("rgba(245,158,11,.1)", "#fffbeb"),
            border: dk("1px solid rgba(245,158,11,.25)", "1px solid #fde68a"),
          }}>
            <Typography sx={{ fontSize: 15, lineHeight: 1, flexShrink: 0 }}>📷</Typography>
            <Typography sx={{
              flex: 1, fontSize: 12.5, fontWeight: 600,
              color: dk("#fbbf24", "#d97706"), fontFamily: "'Jost',sans-serif",
            }}>
              Profile photo removed
            </Typography>
            <Button
              onClick={handleUndoRemove}
              disabled={undoingRemove}
              size="small"
              sx={{
                fontSize: 11, fontWeight: 700, textTransform: "none",
                borderRadius: 99, px: 1.5, py: 0.375, minWidth: 0,
                color: dk("#fbbf24", "#d97706"),
                border: dk("1px solid rgba(251,191,36,.35)", "1px solid #fde68a"),
                bgcolor: dk("rgba(245,158,11,.1)", "#fefce8"),
                "&:hover": { bgcolor: dk("rgba(245,158,11,.18)", "#fef9c3") },
                "&.Mui-disabled": { opacity: 0.55 },
              }}
            >
              {undoingRemove ? "Restoring…" : "↩ Undo"}
            </Button>
            <Box
              component="button"
              onClick={() => setPhotoJustRemoved(false)}
              sx={{
                width: 22, height: 22, borderRadius: "50%", border: "none",
                bgcolor: "transparent", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: dk("rgba(251,191,36,.4)", "#7A8073"),
                "&:hover": { bgcolor: dk("rgba(255,255,255,.07)", "#F0F2ED") },
              }}
            >
              <XIcon size={11} />
            </Box>
          </Box>
        )}

        {profilePhotoAnchor && (
          <ProfilePhotoCard
            sessionId={sessionId}
            anchorField={profilePhotoAnchor}
            onFieldsUpdated={onPhotoFieldsUpdated}
            onPhotoAdded={onPhotoAdded}
            showToast={showToast}
          />
        )}

        {/* ── Photo management strip — shown when a profile photo already exists ──
            SINGLE source of truth for photo management. Provides:
              • Replace      (→ pick a new file, then crop modal)
              • Remove       (with confirm)
              • Undo replace (when photoCanUndo is true after a replace op)
            Mutually exclusive with ProfilePhotoCard (which only shows when
            no photo exists). The old duplicate FieldRow photo card has been
            removed from the grid below — see the CHANGE marker there. ───── */}
        {existingPhotoField && !profilePhotoAnchor && (
          <Box sx={{
            mb: 1.5, borderRadius: 2, overflow: "hidden",
            border: `1px solid ${dk("rgba(60,96,88,.18)", "#E7EAE3")}`,
            bgcolor: dk("rgba(8,16,55,.7)", "#F8FAF6"),
          }}>
            {/* Header band */}
            <Box sx={{
              px: 2, py: 1.125,
              background: dk(
                "linear-gradient(135deg,rgba(2,33,36,.95),rgba(94,129,93,.7))",
                "linear-gradient(135deg,#022124 0%,#5E815D 100%)",
              ),
              display: "flex", alignItems: "center", gap: 1.25,
            }}>
              <Camera size={14} color="#fff" />
              <Typography sx={{
                fontSize: 12.5, fontWeight: 700, color: "#fff",
                fontFamily: "'Jost',sans-serif", flex: 1,
              }}>
                Profile Photo
              </Typography>
              <Typography sx={{ fontSize: 10, color: "rgba(255,255,255,.55)", fontFamily: "'Jost',sans-serif" }}>
                Header section
              </Typography>
            </Box>

            {/* Action row */}
            <Box sx={{ px: 2, py: 1.25, display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>

              {/* Replace button */}
              {!confirmRemovePhoto && (
                <Box
                  component="button"
                  onClick={handleReplacePickFile}
                  disabled={replaceBusy || removingPhoto}
                  sx={{
                    display: "inline-flex", alignItems: "center", gap: 0.75,
                    px: 1.5, py: 0.625, borderRadius: 1.5, border: "none",
                    background: dk("linear-gradient(135deg,#022124,#5E815D)", "linear-gradient(135deg,#022124,#5E815D)"),
                    color: "#fff", fontSize: 11.5, fontWeight: 700,
                    cursor: replaceBusy || removingPhoto ? "not-allowed" : "pointer",
                    fontFamily: "'Jost',sans-serif",
                    boxShadow: "0 2px 8px rgba(94,129,93,.3)",
                    opacity: replaceBusy || removingPhoto ? 0.6 : 1,
                    transition: "all .15s",
                    "&:hover": replaceBusy || removingPhoto ? {} : { filter: "brightness(1.1)" },
                  }}
                >
                  <Upload size={11} />
                  {replaceBusy ? "Replacing…" : "Replace Photo"}
                </Box>
              )}

              {/* Undo replace button — only shown after a successful replace */}
              {photoCanUndo && onUndoImage && !confirmRemovePhoto && (
                <Box
                  component="button"
                  onClick={() => onUndoImage(existingPhotoField)}
                  disabled={replaceBusy || removingPhoto}
                  sx={{
                    display: "inline-flex", alignItems: "center", gap: 0.75,
                    px: 1.5, py: 0.625, borderRadius: 1.5,
                    border: dk("1px solid rgba(251,191,36,.3)", "1px solid #fde68a"),
                    bgcolor: dk("rgba(251,191,36,.08)", "#fffbeb"),
                    color: dk("#fbbf24", "#d97706"),
                    fontSize: 11.5, fontWeight: 700,
                    cursor: replaceBusy || removingPhoto ? "not-allowed" : "pointer",
                    fontFamily: "'Jost',sans-serif",
                    opacity: replaceBusy || removingPhoto ? 0.55 : 1,
                    transition: "all .15s",
                    "&:hover": replaceBusy || removingPhoto ? {} : { bgcolor: dk("rgba(251,191,36,.14)", "#fef3c7") },
                  }}
                >
                  <RotateCcw size={11} />
                  Undo Replace
                </Box>
              )}

              {/* Spacer */}
              <Box sx={{ flex: 1 }} />

              {/* Remove / Confirm strip */}
              {!confirmRemovePhoto ? (
                <Box
                  component="button"
                  onClick={() => setConfirmRemovePhoto(true)}
                  disabled={replaceBusy || removingPhoto}
                  sx={{
                    display: "inline-flex", alignItems: "center", gap: 0.75,
                    px: 1.5, py: 0.625, borderRadius: 1.5,
                    border: dk("1px solid rgba(248,113,113,.25)", "1px solid #fecaca"),
                    bgcolor: dk("rgba(220,38,38,.07)", "#fff5f5"),
                    color: dk("#f87171", "#dc2626"),
                    fontSize: 11.5, fontWeight: 700,
                    cursor: replaceBusy || removingPhoto ? "not-allowed" : "pointer",
                    fontFamily: "'Jost',sans-serif",
                    opacity: replaceBusy || removingPhoto ? 0.55 : 1,
                    transition: "all .15s",
                    "&:hover": replaceBusy || removingPhoto ? {} : { bgcolor: dk("rgba(220,38,38,.14)", "#fee2e2") },
                  }}
                >
                  <Trash2 size={11} />
                  Remove Photo
                </Box>
              ) : (
                /* Confirm strip */
                <Box sx={{
                  display: "flex", alignItems: "center", gap: 0.75,
                  px: 1.5, py: 0.375, borderRadius: 99,
                  bgcolor: dk("rgba(220,38,38,.1)", "#fff1f1"),
                  border: dk("1.5px solid rgba(248,113,113,.35)", "1.5px solid #fca5a5"),
                }}>
                  <Trash2 size={11} color={dk("#f87171", "#dc2626")} />
                  <Typography sx={{
                    fontSize: 11.5, fontWeight: 700,
                    color: dk("#f87171", "#dc2626"),
                    fontFamily: "'Jost',sans-serif", whiteSpace: "nowrap",
                  }}>
                    Remove profile photo?
                  </Typography>
                  <Box
                    component="button"
                    onClick={() => setConfirmRemovePhoto(false)}
                    sx={{
                      px: 1.25, py: 0.25, border: "none", bgcolor: "transparent",
                      cursor: "pointer", fontSize: 11, fontWeight: 500,
                      color: dk("rgba(168,191,167,.6)", "#7A8073"),
                      fontFamily: "'Jost',sans-serif", borderRadius: 99,
                      "&:hover": { bgcolor: dk("rgba(255,255,255,.07)", "#F0F2ED") },
                    }}
                  >Cancel</Box>
                  <Box
                    component="button"
                    onClick={handleRemovePhoto}
                    disabled={removingPhoto}
                    sx={{
                      px: 1.5, py: 0.375, border: "none", borderRadius: 99,
                      bgcolor: dk("#dc2626", "#dc2626"),
                      color: "#fff", fontSize: 11, fontWeight: 700,
                      cursor: removingPhoto ? "not-allowed" : "pointer",
                      fontFamily: "'Jost',sans-serif",
                      opacity: removingPhoto ? 0.6 : 1,
                      "&:hover": removingPhoto ? {} : { bgcolor: "#b91c1c" },
                    }}
                  >
                    {removingPhoto ? "Removing…" : "Remove"}
                  </Box>
                </Box>
              )}
            </Box>
          </Box>
        )}

        {/* Hidden file input for Replace flow */}
        <input
          ref={replaceFileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          style={{ display: "none" }}
          onChange={handleReplaceFileChange}
        />

        <Box
          sx={{
            /* [FULL WIDTH] Every field spans the entire panel — display,
               editing, and saved states alike. The old 2-column grid
               confined the editing card to half the panel, which cramped
               the toolbar and looked broken. Single column, full width. */
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: 1.5,
          }}
        >
          {fields.map((f) => {
            // 🔧 CHANGE — the blue "Profile Photo" strip above is now the single
            // place to manage the profile photo (Replace / Remove / Undo). Skip
            // rendering the duplicate standalone photo card here so only the
            // strip is shown.
            if (existingPhotoField && f.id === existingPhotoField.id) {
              return null;
            }
            const isWide =
              f.isHeader ||
              (f.text && f.text.length > 55) ||
              f.type === "progress-bar" ||
              f.type === "image" ||
              f.type === "link" ||
              f.fieldRole === "linkedin" ||
              f.fieldRole === "github" ||
              f.fieldRole === "website" ||
              (f.format &&
                [
                  "SUMMARY",
                  "OBJECTIVE",
                  "BIO",
                  "DESCRIPTION",
                  "BULLET",
                ].includes((f.format || "").toUpperCase()));
            return (
              <Box key={f.id} sx={{ gridColumn: isWide ? "1 / -1" : "auto" }}>
                <FieldRow
                  field={f}
                  onSave={onSave}
                  saving={saving}
                  sessionId={sessionId}
                  onLinkSave={onLinkSave}
                  onRelinkDone={onRelinkDone}
                  undoStack={undoHistories[f.id] || []}
                  onPushUndo={onPushUndo}
                  onPopUndo={onPopUndo}
                  isDark={isDark}
                  isReadOnly={isReadOnly}
                  onNextSection={onNextSection}
                  onAddBlankLine={
                    onAddBlankLine
                      ? () => onAddBlankLine(f)
                      : () => onAddLine(f)
                  }
                  onAddLine={(x) =>
                    setAddingAfter(addingAfter?.id === x.id ? null : x)
                  }
                  onDeleteLine={onDeleteLine}
                  onDeleteField={onDeleteField}
                  onReplaceImage={onReplaceImage || (() => {})}
                  onUndoImage={onUndoImage}
                  photoCanUndo={photoCanUndo}
                  onEditBar={() => {}}
                  isAddingAfter={addingAfter?.id === f.id}
                  onCancelAdd={() => setAddingAfter(null)}
                  onEditStart={onEditStart}
                  onEditEnd={onEditEnd}
                />
                {addingAfter?.id === f.id && (
                  <Box sx={{ mt: 0.5 }}>
                    <AddLineForm
                      field={f}
                      adding={saving}
                      sectionFields={fields}
                      onAdd={(x, d) => {
                        onAddLineSubmit(x, d);
                        setAddingAfter(null);
                      }}
                      onCancel={() => setAddingAfter(null)}
                    />
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>

        {/* ── Add Contact Info panel — header section, non-read-only ── */}
        {isHeaderSection && !isReadOnly && (
          <AddContactPanel
            headerFields={fields}
            sessionId={sessionId}
            saving={saving}
            showToast={showToast}
            onFieldsUpdated={(newFields) => {
              // Uses onContactLinkDone (no duplicate toast) if available,
              // otherwise falls back to onRelinkDone (which has its own toast).
              if (onContactLinkDone) {
                onContactLinkDone(newFields);
              } else if (onRelinkDone) {
                onRelinkDone(newFields);
              }
            }}
          />
        )}

        {/* ── [ADD SECTION] Button + inline input ──────────────────────────────
            Shown at the bottom of every non-header, non-page, non-readonly
            section when the parent provides onAddSection.

            UX flow:
              1. User clicks "Add New Section"
              2. Inline input expands (no modal / no route change)
              3. User types section name → Enter or "Add Section" button
              4. onAddSection(title, afterParaIndex) fires → parent calls
                 the backend and refreshes fields
              5. Input collapses; new section header appears in the preview

            The button is intentionally placed BELOW the field grid so it
            never interferes with existing field editing flows. ──────────── */}
        {!isHeaderSection && !isPageSection && !isReadOnly && onAddSection && (
          <Box sx={{ mt: 2.5 }}>
            {!addSectionOpen ? (
              /* ── Collapsed state: dashed "Add New Section" button ── */
              <Box
                component="button"
                onClick={() => {
                  setAddSectionOpen(true);
                  setAddSectionTitle("");
                }}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 0.875,
                  width: "100%",
                  px: 2,
                  py: 1.375,
                  borderRadius: 2,
                  border: dk(
                    "1.5px dashed rgba(111,160,149,.35)",
                    "1.5px dashed #D6E4E0"
                  ),
                  bgcolor: "transparent",
                  cursor: "pointer",
                  color: dk("#6FA095", "#1D5A50"),
                  fontFamily: "'Jost',sans-serif",
                  fontSize: 12.5,
                  fontWeight: 600,
                  transition: "all .15s",
                  "&:hover": {
                    bgcolor: dk("rgba(29,90,80,.08)", "#F1F6F4"),
                    borderColor: dk("rgba(111,160,149,.6)", "#6FA095"),
                    borderStyle: "solid",
                  },
                }}
              >
                <Plus size={14} />
                Add New Section
              </Box>
            ) : (
              /* ── Expanded state: title input + Cancel / Add Section ── */
              <Box
                sx={{
                  p: 1.75,
                  borderRadius: 2,
                  border: dk(
                    "1.5px solid rgba(111,160,149,.3)",
                    "1.5px solid #D6E4E0"
                  ),
                  bgcolor: dk("rgba(29,90,80,.06)", "#FAFCFB"),
                  animation: "fadeUp .18s ease",
                }}
              >
                {/* Label */}
                <Typography
                  sx={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    color: dk("#6FA095", "#1D5A50"),
                    textTransform: "uppercase",
                    letterSpacing: ".07em",
                    mb: 1,
                    fontFamily: "'Jost',sans-serif",
                  }}
                >
                  New Section Name
                </Typography>

                {/* Text input */}
                <input
                  autoFocus
                  value={addSectionTitle}
                  onChange={(e) => setAddSectionTitle(e.target.value)}
                  placeholder="e.g. Languages, Volunteer Work, Awards…"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddSectionSubmit();
                    if (e.key === "Escape") {
                      setAddSectionOpen(false);
                      setAddSectionTitle("");
                    }
                  }}
                  style={{
                    width: "100%",
                    padding: "9px 13px",
                    borderRadius: 8,
                    border: "1.5px solid #D6E4E0",
                    fontFamily: "'Jost',sans-serif",
                    fontSize: 13,
                    color: "#3A3D37",
                    outline: "none",
                    background: isDark ? "rgba(5,40,35,.7)" : "#fff",
                    boxSizing: "border-box",
                    boxShadow: "0 0 0 3px rgba(29,90,80,0.07)",
                    transition: "border-color .12s, box-shadow .12s",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#6FA095";
                    e.target.style.boxShadow = "0 0 0 3px rgba(29,90,80,0.13)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#D6E4E0";
                    e.target.style.boxShadow = "0 0 0 3px rgba(29,90,80,0.07)";
                  }}
                />

                {/* Hint */}
                <Typography
                  sx={{
                    fontSize: 10,
                    color: dk("rgba(111,160,149,.55)", "#A9AEA2"),
                    mt: 0.75,
                    fontFamily: "'Jost',sans-serif",
                  }}
                >
                  Press Enter to confirm · Esc to cancel
                </Typography>

                {/* Action buttons */}
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 0.75,
                    mt: 1.25,
                  }}
                >
                  {/* Cancel */}
                  <Box
                    component="button"
                    onClick={() => {
                      setAddSectionOpen(false);
                      setAddSectionTitle("");
                    }}
                    disabled={addingSectionBusy}
                    sx={{
                      px: 1.5,
                      py: 0.5,
                      border: "none",
                      bgcolor: "transparent",
                      color: dk("rgba(168,191,167,.6)", "#7A8073"),
                      fontSize: 11,
                      fontWeight: 500,
                      cursor: "pointer",
                      fontFamily: "'Jost',sans-serif",
                      borderRadius: 99,
                      "&:hover": {
                        color: dk("#E7EFE6", "#3A3D37"),
                        bgcolor: dk("rgba(255,255,255,.07)", "#F0F2ED"),
                      },
                    }}
                  >
                    Cancel
                  </Box>

                  {/* Confirm */}
                  <Box
                    component="button"
                    onClick={handleAddSectionSubmit}
                    disabled={!addSectionTitle.trim() || addingSectionBusy || saving}
                    sx={{
                      px: 1.875,
                      py: 0.625,
                      border: "none",
                      borderRadius: 99,
                      bgcolor:
                        addSectionTitle.trim() && !addingSectionBusy && !saving
                          ? "#1D5A50"
                          : dk("rgba(29,90,80,.25)", "#D8DDD4"),
                      color: "#fff",
                      fontSize: 11.5,
                      fontWeight: 700,
                      cursor:
                        addSectionTitle.trim() && !addingSectionBusy && !saving
                          ? "pointer"
                          : "not-allowed",
                      fontFamily: "'Jost',sans-serif",
                      boxShadow:
                        addSectionTitle.trim() && !addingSectionBusy
                          ? "0 2px 8px rgba(29,90,80,.35)"
                          : "none",
                      transition: "all .15s",
                      "&:hover":
                        addSectionTitle.trim() && !addingSectionBusy && !saving
                          ? { bgcolor: "#0A3A34", boxShadow: "0 4px 14px rgba(29,90,80,.45)" }
                          : {},
                    }}
                  >
                    {addingSectionBusy || saving ? "Adding…" : "Add Section"}
                  </Box>
                </Box>
              </Box>
            )}
          </Box>
        )}
        {/* ── End Add Section ── */}


        {/* Integrated navigation (Back / pages / Save & Next) — scrolls
            WITH the form content, reference-style, instead of a fixed bar. */}
        {footerSlot}
      </Box>
    </Box>

    {/* ── PhotoEditorModal for Replace flow ─────────────────────────────────
        Mounted here (at SectionPage level) so it inherits the same z-index
        context as the rest of the editor. ─────────────────────────────── */}
    {replaceModalOpen && (
      <PhotoEditorModal
        open={replaceModalOpen}
        initialImageUrl={replacePickedImage}
        initialShape="circle"
        busy={replaceBusy}
        title="Replace Profile Photo"
        onCancel={() => { if (!replaceBusy) { setReplaceModalOpen(false); setReplacePickedImage(null); } }}
        onSave={handleReplaceModalSave}
      />
    )}
  </>
  );
}

export default SectionPage;