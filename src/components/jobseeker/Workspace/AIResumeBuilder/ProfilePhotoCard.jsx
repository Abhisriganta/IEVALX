// ============================================================================
// ProfilePhotoCard.jsx — "Add a profile photo" card for the header section.
// Professional redesigned UI — iEvalx blue palette, no pink.
// Location: src/components/jobseeker/Workspace/AIResumeBuilder/ProfilePhotoCard.jsx
//
// [PHOTO ALIGNMENT] Now forwards anchorField.headerLayout to addProfilePhoto
// so the backend can choose the correct injection strategy (inline vs
// create-table) based on the original DOCX header structure.
//
// [POSITION] Forwards position ("top-left" | "top-right" | "center-top")
// from PhotoEditorModal to the backend via addProfilePhoto.
// ============================================================================

import React, { useRef, useState, useCallback } from "react";
import { Box, Typography } from "@mui/material";
import { Upload, UserCircle2 } from "lucide-react";
import PhotoEditorModal from "./PhotoEditorModal";
import resumeAiService from "@/services/api/jobseeker/resumeAiService";

const MAX_BYTES = 5 * 1024 * 1024;

export default function ProfilePhotoCard({
  sessionId,
  anchorField,
  onFieldsUpdated,
  onPhotoAdded = null,   // optional extra callback after successful add
  showToast    = null,
  disabled     = false,
}) {
  const fileInputRef = useRef(null);

  const [pickedImage, setPickedImage] = useState(null);
  const [modalOpen,   setModalOpen]   = useState(false);
  const [busy,        setBusy]        = useState(false);
  const [dragOver,    setDragOver]    = useState(false);
  const [error,       setError]       = useState(null);
  const [modalError,  setModalError]  = useState(null);

  const handleChoosePhoto = useCallback(() => {
    if (disabled || busy) return;
    setError(null);
    fileInputRef.current?.click();
  }, [disabled, busy]);

  const ingestFile = useCallback((file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Please choose a PNG or JPG image file."); return; }
    const lt = file.type.toLowerCase();
    if (lt === "image/heic" || lt === "image/heif") { setError("HEIC/HEIF not supported — convert to JPG or PNG first."); return; }
    if (file.size > MAX_BYTES) { setError("Image too large — max 5 MB."); return; }
    setError(null);
    setModalError(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      const probe = new Image();
      probe.onload = () => { setPickedImage(dataUrl); setModalOpen(true); };
      probe.onerror = () => setError("This image format isn't supported. Try a PNG or JPG.");
      probe.src = dataUrl;
    };
    reader.onerror = () => setError("Could not read the file.");
    reader.readAsDataURL(file);
  }, []);

  const handleFileChange = (e) => { const f = e.target.files?.[0]; e.target.value = ""; ingestFile(f); };

  const handleDragOver  = (e) => { e.preventDefault(); if (!disabled && !busy) setDragOver(true); };
  const handleDragLeave = ()  => setDragOver(false);
  const handleDrop      = (e) => { e.preventDefault(); setDragOver(false); if (disabled || busy) return; ingestFile(e.dataTransfer?.files?.[0]); };

  const handleModalSave = async ({ blob, shape, position }) => {
    if (!sessionId)                          { setModalError("Missing session — please reload."); return; }
    if (!anchorField || anchorField.paraIndex == null) { setModalError("No anchor paragraph found."); return; }
    if (!blob)                               { setModalError("No image data generated."); return; }

    setBusy(true);
    setModalError(null);
    try {
      const file = new File([blob], "profile.png", { type: "image/png" });
      const response = await resumeAiService.addProfilePhoto({
        session_id:        sessionId,
        target_segment_id: anchorField.paraIndex,
        source:            anchorField.source || "body",
        file,
        // [FIX] Always send "square" so backend inserts the PNG as-is without
        // re-applying circular masking. The correct shape (circle / rounded /
        // square) is already baked into the PNG by the canvas clip in
        // PhotoEditorModal. Sending "circle" or "roundRect" causes the backend
        // to override the pre-shaped PNG with its own circle mask.
        shape: "square",
        size_inches: 1.2,
        align: "right",
        // [PHOTO ALIGNMENT] Forward the layout hint so the backend can choose
        // the correct injection strategy (inline insert vs create header table).
        header_layout: anchorField.headerLayout || null,
        // [POSITION] Forward placement choice from PhotoEditorModal
        position: position || "top-right",
      });

      if (response?.success) {
        // Always fetch fresh fields so the image field is guaranteed present
        let freshFields = response.fields || [];
        try {
          const fd = await resumeAiService.getFields(sessionId);
          if (fd.fields?.length) freshFields = fd.fields;
        } catch {}

        onFieldsUpdated?.(freshFields);
        onPhotoAdded?.(freshFields);        // triggers undo banner in SectionPage
        showToast?.("Profile photo added ✓", "success");
        setModalOpen(false);
        setPickedImage(null);
        setModalError(null);
      } else {
        const msg = response?.message || response?.error || "Upload failed — check server logs.";
        setModalError(msg);
        showToast?.("Photo upload failed", "error");
      }
    } catch (e) {
      const status   = e?.response?.status;
      const respData = e?.response?.data;
      const msg = (status ? `HTTP ${status}: ` : "") + (respData?.message || respData?.error || e?.message || "Upload failed.");
      setModalError(msg);
      showToast?.("Photo upload failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleModalCancel = () => {
    if (busy) return;
    setModalOpen(false);
    setPickedImage(null);
    setModalError(null);
  };

  const isDraggingActive = dragOver && !disabled && !busy;

  return (
    <>
      <Box
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        sx={{
          mb: 2, borderRadius: 2.5, overflow: "hidden",
          border: `1.5px ${isDraggingActive ? "solid #5E815D" : "solid #E7EAE3"}`,
          bgcolor: isDraggingActive ? "rgba(94,129,93,0.03)" : "#fff",
          boxShadow: "0 1px 6px rgba(0,0,0,.06)",
          transition: "all .18s ease",
          opacity: disabled ? 0.55 : 1,
        }}
      >
        {/* ── Header band ─────────────────────────────────────────────── */}
        <Box sx={{
          px: 2.5, py: 1.5,
          background: "linear-gradient(135deg, #022124 0%, #5E815D 100%)",
          display: "flex", alignItems: "center", gap: 1.5,
        }}>
          <Box sx={{
            width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
            bgcolor: "rgba(255,255,255,.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "1.5px solid rgba(255,255,255,.25)",
          }}>
            <UserCircle2 size={18} color="#fff" />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#fff", fontFamily: "'Jost',sans-serif", lineHeight: 1.2 }}>
              Add Profile Photo
            </Typography>
            <Typography sx={{ fontSize: 10.5, color: "rgba(255,255,255,.65)", fontFamily: "'Jost',sans-serif" }}>
              A photo makes your resume 14× more likely to be viewed
            </Typography>
          </Box>
        </Box>

        {/* ── Body ────────────────────────────────────────────────────── */}
        <Box sx={{ p: 2, display: "flex", alignItems: "center", gap: 2 }}>
          {/* Circular drop-zone */}
          <Box
            onClick={handleChoosePhoto}
            sx={{
              width: 82, height: 82, borderRadius: "50%", flexShrink: 0,
              border: `2.5px dashed ${isDraggingActive ? "#5E815D" : "#D8DDD4"}`,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 0.5,
              cursor: disabled || busy ? "not-allowed" : "pointer",
              bgcolor: isDraggingActive ? "rgba(94,129,93,.05)" : "#F8FAF6",
              transition: "all .18s",
              "&:hover": disabled || busy ? {} : { borderColor: "#5E815D", bgcolor: "rgba(94,129,93,.04)", "& .drop-icon": { color: "#5E815D" } },
            }}
          >
            <Box className="drop-icon" sx={{ color: isDraggingActive ? "#5E815D" : "#7A8073", transition: "color .18s" }}>
              <Upload size={20} />
            </Box>
            <Typography sx={{
              fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em",
              color: isDraggingActive ? "#5E815D" : "#7A8073", fontFamily: "'Jost',sans-serif",
              transition: "color .18s",
            }}>
              {isDraggingActive ? "Drop now" : "Drop here"}
            </Typography>
          </Box>

          {/* Instructions */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{
              fontSize: 12.5, fontWeight: 700, color: "#101210",
              fontFamily: "'Jost',sans-serif", mb: 0.5,
            }}>
              PNG or JPG · up to 5 MB
            </Typography>
            <Typography sx={{ fontSize: 11, color: "#55584F", lineHeight: 1.55, fontFamily: "'Jost',sans-serif", mb: 1.25 }}>
              You can crop, zoom, and choose a frame shape (circle, rounded, or square) after selecting.
            </Typography>
            <Box
              component="button"
              type="button"
              onClick={handleChoosePhoto}
              disabled={disabled || busy}
              sx={{
                display: "inline-flex", alignItems: "center", gap: 0.75,
                px: 1.875, py: 0.75, borderRadius: 1.5, border: "none",
                background: disabled || busy ? "#E7EAE3" : "linear-gradient(135deg, #022124, #5E815D)",
                color: disabled || busy ? "#7A8073" : "#fff",
                fontSize: 12, fontWeight: 700,
                cursor: disabled || busy ? "not-allowed" : "pointer",
                fontFamily: "'Jost',sans-serif", whiteSpace: "nowrap",
                boxShadow: disabled || busy ? "none" : "0 2px 10px rgba(94,129,93,.35)",
                transition: "all .15s",
                "&:hover": disabled || busy ? {} : { filter: "brightness(1.08)", transform: "translateY(-1px)" },
              }}
            >
              <Upload size={12} />
              {busy ? "Uploading…" : "Choose Photo"}
            </Box>
          </Box>
        </Box>

        {/* Error */}
        {error && (
          <Box sx={{ px: 2.5, pb: 1.5 }}>
            <Typography sx={{ fontSize: 10.5, color: "#dc2626", fontWeight: 600, fontFamily: "'Jost',sans-serif" }}>
              {error}
            </Typography>
          </Box>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
      </Box>

      {modalOpen && (
        <PhotoEditorModal
          open={modalOpen}
          initialImageUrl={pickedImage}
          initialShape="circle"
          busy={busy}
          title="Crop & Position Photo"
          externalError={modalError}
          onCancel={handleModalCancel}
          onSave={handleModalSave}
        />
      )}
    </>
  );
}