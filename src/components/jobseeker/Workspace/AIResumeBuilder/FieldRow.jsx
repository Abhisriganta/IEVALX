// ============================================================================
// FieldRow.jsx — Single editable resume field. Handles all field types:
//   text, icon-link, image, progress-bar, headers. Contains inline
//   hyperlink editor, undo history display, and confirm-delete flow.
// Location: src/components/jobseeker/Workspace/AIResumeBuilder/FieldRow.jsx
// ============================================================================

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Box, Stack, Typography, Tooltip, TextField, Button } from "@mui/material";
import {
  Trash2, Plus, Edit2, Check, X, RotateCcw, Link,
} from "lucide-react";
import { SpinnerEl, PillEl, RippleBtn, Ico } from "./atoms";
import { API_BASE } from "@/constants/resumeAiConstants";
import useSparkle from "@/hooks/jobseeker/useSparkle";
import InlineEditor from "./InlineEditor";
import resumeAiService from "@/services/api/jobseeker/resumeAiService";
import PhotoEditorModal from "./PhotoEditorModal";
import { FaLinkedin, FaGithub, FaEnvelope, FaLink, FaPhone, FaMapMarkerAlt } from "react-icons/fa";

/* ── Advanced full-text editor (toggle-gated with warning) ────────────────── */
function AdvancedTextEditor({ fieldId, fieldText, saving, onSave }) {
  const [open, setOpen] = React.useState(false);
  const inputId = `adv-text-${fieldId}`;

  if (!open) {
    return (
      <Box sx={{ mt: 1.25, pt: 1, borderTop: "1px dashed #E7EAE3", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Box component="button" onClick={() => setOpen(true)}
          sx={{ display: "inline-flex", alignItems: "center", gap: 0.75,
            px: 1.5, py: 0.5, border: "none", bgcolor: "transparent",
            color: "#7A8073", fontSize: 10.5, fontWeight: 600,
            cursor: "pointer", fontFamily: "'Jost',sans-serif",
            borderRadius: 99, transition: "all .15s",
            "&:hover": { color: "#f59e0b", bgcolor: "rgba(245,158,11,0.06)" } }}>
          <Edit2 size={10} /> Edit full text (advanced)
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 1.25, pt: 1.25, borderTop: "1px dashed #fde68a" }}>
      {/* Warning banner */}
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.75, p: 1,
        bgcolor: "#fffbeb", border: "1.5px solid #fde68a", borderRadius: 1.5, mb: 1 }}>
        <Typography sx={{ fontSize: 13, lineHeight: 1, mt: "1px" }}>⚠️</Typography>
        <Box>
          <Typography sx={{ fontSize: 10, fontWeight: 700, color: "#92400e", mb: 0.25 }}>
            Formatting warning
          </Typography>
          <Typography sx={{ fontSize: 9.5, color: "#a16207", lineHeight: 1.5 }}>
            Editing the full text may disrupt icon positions, fonts, and hyperlinks in the document.
            Only use this if the link editors above don't cover what you need to change.
          </Typography>
        </Box>
      </Box>
      <input
        id={inputId}
        defaultValue={fieldText}
        placeholder="Full display text…"
        style={{
          width: "100%", padding: "8px 12px", borderRadius: 8,
          border: "1.5px solid #fde68a", fontFamily: "'Jost',sans-serif",
          fontSize: 12.5, color: "#3A3D37", outline: "none",
          background: "#fffdf5", boxSizing: "border-box",
        }}
        onKeyDown={e => {
          if (e.key === "Enter" && !saving) {
            const val = e.target.value.trim();
            if (val) onSave(val);
          }
        }}
      />
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 0.75 }}>
        <Box component="button" onClick={() => setOpen(false)}
          sx={{ border: "none", bgcolor: "transparent", color: "#7A8073",
            fontSize: 10, cursor: "pointer", fontFamily: "'Jost',sans-serif",
            "&:hover": { color: "#3A3D37" } }}>
          ← Hide
        </Box>
        <Box component="button"
          onClick={() => {
            const val = document.getElementById(inputId)?.value.trim();
            if (val) onSave(val);
          }}
          disabled={saving}
          sx={{ px: 1.75, py: 0.625, borderRadius: 1.5, border: "none",
            bgcolor: saving ? "#D8DDD4" : "#f59e0b",
            color: "#fff", fontSize: 11, fontWeight: 700,
            cursor: saving ? "not-allowed" : "pointer",
            fontFamily: "'Jost',sans-serif", whiteSpace: "nowrap",
            opacity: saving ? 0.6 : 1,
            "&:hover": { opacity: saving ? 0.6 : 0.85 } }}>
          {saving ? "Saving…" : "Save Text"}
        </Box>
      </Box>
    </Box>
  );
}
function FieldRow({ field, onSave, onAddLine, onDeleteLine, onDeleteField, saving, onReplaceImage, onUndoImage, photoCanUndo = false, onEditBar, sessionId, isAddingAfter, onCancelAdd, onEditStart, onEditEnd, onLinkSave, onRelinkDone, undoStack = [], onPushUndo, onPopUndo, isDark = false, isReadOnly = false, onNextSection = null, onAddBlankLine = null }) {
  const [editing, setEditing]       = useState(false);
  const [value, setValue]           = useState(field.text);
  const [hovered, setHovered]       = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [fieldSegs, setFieldSegs]   = useState(null);
  const [segsLoading, setSegsLoading] = useState(false);
  const [photoEditorOpen, setPhotoEditorOpen] = useState(false);
  // Keep inlineLinks in local state so the URL editor persists after a field refresh
  const [localInlineLinks, setLocalInlineLinks] = useState(field.inlineLinks || null);
  React.useEffect(() => {
    if (field.inlineLinks?.length) {
      setLocalInlineLinks(field.inlineLinks);
    }
  }, [field.inlineLinks]);

  // ── [FIX] Serialise hyperlink saves ──────────────────────────────────────
  // ROOT CAUSE: Editing email → Save → then immediately editing LinkedIn →
  // Save fires a second /edit-hyperlink request that reads the DOCX from S3
  // BEFORE the first request's S3 write has landed. The second write
  // overwrites the first, reverting the email.
  //
  // Fix: every saveName / saveUrl chains onto a shared promise queue so they
  // execute strictly one-after-another. linkSaving disables all Save buttons
  // while any save is in flight.
  const [linkSaving, setLinkSaving] = useState(false);
  const linkQueueRef = useRef(Promise.resolve());

  const enqueueLinkSave = useCallback((asyncFn) => {
    setLinkSaving(true);
    linkQueueRef.current = linkQueueRef.current
      .then(() => asyncFn())
      .catch(e => console.error("[FieldRow] link save error:", e))
      .finally(() => setLinkSaving(false));
  }, []);

  const imgRef  = useRef(null);
  const sparkle = useSparkle();

  const sc       = field.section?.color || "#5E815D";
  const mod      = field.text !== field.originalText;
  const isInserted = field.isInserted || false;
  const hasValue   = !!(field.text && field.text.trim());

  useEffect(() => { setValue(field.text); }, [field.text]);

  const openEdit = useCallback(() => {
    if (isReadOnly) return; // Original variant — read-only
    setEditing(true);
    onEditStart?.(field);
  }, [field, onEditStart, isReadOnly]);

  const closeEdit = useCallback(() => {
    setEditing(false);
    onEditEnd?.();
  }, [onEditEnd]);

 useEffect(() => {
    if (!editing) return;
    setFieldSegs(null);

    // [FIX] Skip getParaSegments for contact/header fields that have inlineLinks
    // (mailto:, LinkedIn, GitHub hyperlinks). These fields always save via new_text
    // (handleFieldSave's hasIcons=true blocks the segments path), so fetched segments
    // are never used in the actual DOCX write. But if the fetch resolves BEFORE a
    // concurrent email edit has finished saving to S3, the InlineEditor initialises
    // with the OLD email — and when the user then applies any other change (e.g.
    // LinkedIn URL), the old email gets written back, reverting it. Skipping the
    // fetch forces InlineEditor to use field.text directly (always the latest value
    // from setFields), preventing the revert entirely.
    if (field.inlineLinks && field.inlineLinks.length > 0) return;

    if (field.paraIndex >= 0 && field.source && sessionId) {
      setSegsLoading(true);
      resumeAiService
        .getParaSegments(sessionId, field.paraIndex, field.source || "body")
        .then(d => {
          if (d.success && d.segments && d.segments.length > 0) {
            const segText = d.segments.map(s => s.text).join("");
            // Only use if the extracted text matches the field text closely
            // (guards against stale paraIndex after edits shifted paragraphs)
            if (
              (field.text || "").length === 0 ||
              segText.length >= (field.text || "").length * 0.9
            ) {
              setFieldSegs(d.segments);
            }
          }
        })
        .catch(() => {})
        .finally(() => setSegsLoading(false));
    }
  }, [editing]);

  const save   = (e) => { if (value.trim() && value !== field.text) { onSave(field, value.trim() || field.text, null); if (e) sparkle(e.clientX || 200, e.clientY || 200, sc); } closeEdit(); };
  const cancel = () => { setValue(field.text); closeEdit(); };

  if (field.isHeader) {
    if (editing) return (
      <Box sx={{ p: 1, bgcolor: `${sc}0e`, borderRadius: 2, mt: 1.5, mb: 0.5, border: `1px solid ${sc}28`, animation: "fadeUp .2s ease" }}>
        <TextField fullWidth size="small" value={value} onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") save(e.nativeEvent); if (e.key === "Escape") cancel(); }}
          inputProps={{ style: { fontSize: 10.5, fontWeight: 800, color: sc, textTransform: "uppercase", letterSpacing: "0.1em" } }}
          sx={{ mb: 1, "& .MuiOutlinedInput-root": { bgcolor: "transparent" } }} />
        <Stack direction="row" spacing={0.75} justifyContent="flex-end">
          <Button size="small" onClick={cancel} sx={{ fontSize: 10 }}>Cancel</Button>
          <Button size="small" variant="contained" onClick={save} disabled={saving} sx={{ fontSize: 10, bgcolor: sc, "&:hover": { bgcolor: sc } }}>{saving ? "…" : "Apply"}</Button>
        </Stack>
      </Box>
    );
    return (
      <Box onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
        sx={{ display: "flex", alignItems: "center", gap: 1, p: "5px 8px", mt: 1.75, mb: 0.375, borderRadius: 1, cursor: "pointer", transition: "all .2s", bgcolor: hovered ? "rgba(94,129,93,0.06)" : "transparent", border: `1px solid ${hovered ? "rgba(94,129,93,0.25)" : "transparent"}` }}>
        <Box sx={{ width: 2, borderRadius: 99, bgcolor: "#5E815D", flexShrink: 0, alignSelf: "stretch", minHeight: 14 }} />
        <Typography onClick={openEdit} sx={{ fontSize: 10, fontWeight: 700, color: "#5E815D", textTransform: "uppercase", letterSpacing: "0.1em", flex: 1, fontFamily: "'Jost',sans-serif" }}>{field.text}</Typography>
        <button onClick={() => onAddLine(field)} style={{ background: "none", border: "1px solid #E7EAE3", borderRadius: 4, cursor: "pointer", padding: "2px 6px", color: "#7A8073", opacity: hovered ? 1 : 0, transition: "opacity .2s", fontSize: 9, fontWeight: 600, display: "flex", alignItems: "center", gap: 2 }}>
          <Plus size={9} /> add
        </button>
      </Box>
    );
  }

  if (field.type === "image") {
    // [FIX] Hide decorative icons (LinkedIn, GitHub, location pin, email/phone icons)
    // using the isIcon flag set by the backend extract_fields(). Only true profile
    // photos (isIcon=false) should display the Replace option.
    if (field.isIcon === true) return null;

    // [FIX] Backward-compat fallback: imageIndex > 0 also indicates a decorative
    // icon (for older resumes processed before the backend's isIcon flag was added).
    // Only imageIndex === 0 (or null when backend couldn't resolve the index) is the
    // actual profile photo and should display the Replace option.
    if (field.imageIndex != null && field.imageIndex > 0) return null;
return (
      <>
        <Box className="field-card" sx={{ p: 1.25, display: "flex", gap: 1, alignItems: "center" }}>
          <Box sx={{ width: 32, height: 32, borderRadius: 1, bgcolor: "#F8FAF6", border: "1px solid #E7EAE3", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 14 }}>📷</Box>
          <Typography sx={{ fontSize: 11.5, color: "text.secondary", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{field.text}</Typography>
          <RippleBtn variant="ghost" onClick={() => setPhotoEditorOpen(true)} disabled={saving} style={{ padding: "3px 9px", fontSize: 10, color: "#7F9E7E", borderColor: "rgba(94,129,93,0.25)" }}>Edit</RippleBtn>
          {photoCanUndo && onUndoImage && (
            <RippleBtn variant="ghost" onClick={() => onUndoImage(field)} disabled={saving}
              style={{ padding: "3px 9px", fontSize: 10, color: "#1D5A50", borderColor: "rgba(29,90,80,0.25)" }}>
              Undo
            </RippleBtn>
          )}
        </Box>
        <PhotoEditorModal
          open={photoEditorOpen}
          initialImageUrl={field.imageData}
          initialShape={field.photoShape || "circle"}
          busy={saving}
          onCancel={() => setPhotoEditorOpen(false)}
          onSave={async ({ blob, shape }) => {
            const file = new File([blob], "profile.png", { type: "image/png" });
            try {
              const d = await resumeAiService.replaceImage(sessionId, field, file, { shape, preserveStyle: true });
              if (d?.success) onRelinkDone?.(d.fields);
            } catch (e) {
              console.error("[FieldRow] replaceImage failed", e);
            }
            setPhotoEditorOpen(false);
          }}
        />
      </>
    );
  }

  if (field.type === "progress-bar") return (
    <Box className="field-card" sx={{ p: 1.25, border: `1px solid ${mod ? `${sc}35` : "#E7EAE3"}` }}>
      <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.75 }}>
        <Typography sx={{ fontSize: 11, color: "text.secondary", fontWeight: 600, flex: 1 }}>{field.barLabel}</Typography>
        <Typography sx={{ fontSize: 12, fontWeight: 800, color: sc }}>{value}</Typography>
      </Stack>
      <Stack direction="row" alignItems="center" spacing={0.75}>
        <Box sx={{ flex: 1, height: 6, bgcolor: "#E7EAE3", borderRadius: 99, overflow: "hidden" }}>
          <Box sx={{ height: "100%", width: `${parseInt(value) || 0}%`, background: `linear-gradient(90deg,${sc},${sc}cc)`, borderRadius: 99, transition: "width .4s" }} />
        </Box>
        <RippleBtn onClick={e => { onEditBar(field, parseInt(value) || 0); sparkle(e.clientX, e.clientY, sc); }} disabled={saving || value === field.text}
          style={{ padding: "3px 8px", fontSize: 10, background: value !== field.text ? sc : "#F0F2ED", color: value !== field.text ? "#fff" : "#7A8073", border: "none" }}>{saving ? "…" : "Set"}</RippleBtn>
      </Stack>
      <input type="range" min="1" max="100" value={parseInt(value) || 0} onChange={e => setValue(e.target.value + "%")}
        style={{ width: "100%", accentColor: sc, cursor: "pointer", marginTop: 4, opacity: .7 }} />
    </Box>
  );

  // ── Dedicated URL editor for icon-link fields (LinkedIn, GitHub, etc.) ──
  if (editing && field.type === "icon-link") {
    const platform = field.linkLabel || "Link";
    const platformColor = platform.toLowerCase().includes("linkedin") ? "#3F6C63"
                        : platform.toLowerCase().includes("github")   ? "#1B1E1A"
                        : platform.toLowerCase() === "mail"           ? "#ea4335"
                        : "#5E815D";
    const platformIcon = platform.toLowerCase().includes("linkedin") ? "in"
                       : platform.toLowerCase().includes("github")   ? "gh"
                       : platform.toLowerCase() === "mail"           ? "✉"
                       : "🔗";
    return (
      <Box className="field-card editing" data-field-id={field.id} sx={{ p: 1.75, bgcolor: "#fff", borderRadius: "12px", border: "1.5px solid #7F9E7E", boxShadow: "0 0 0 3px rgba(127,158,126,.15), 0 4px 18px rgba(2,33,36,.08)", animation: "fadeUp .18s ease" }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5, pb: 1.125, borderBottom: "1px solid #E7EAE3" }}>
          <Box sx={{ width: 26, height: 26, borderRadius: 1.5, bgcolor: platformColor, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {platform.toLowerCase().includes("linkedin") ? <FaLinkedin color="#fff" size={13} /> :
             platform.toLowerCase().includes("github")   ? <FaGithub   color="#fff" size={13} /> :
             platform.toLowerCase() === "mail"           ? <FaEnvelope color="#fff" size={12} /> :
             platform.toLowerCase().includes("phone")    ? <FaPhone    color="#fff" size={11} /> :
                                                           <FaLink      color="#fff" size={11} />}
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: "#3A3D37", letterSpacing: ".01em" }}>{platform} URL</Typography>
            <Typography sx={{ fontSize: 9.5, color: "#7A8073" }}>Paste the full URL below</Typography>
          </Box>
          <RippleBtn variant="ghost" onClick={cancel} style={{ fontSize: 11, padding: "3px 10px", color: "#7A8073" }}>Cancel</RippleBtn>
        </Stack>

        {/* URL input */}
        <Box sx={{ position: "relative", mb: 1.25 }}>
          <Box sx={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#7A8073", pointerEvents: "none", display: "flex" }}>
            <Link size={13} />
          </Box>
          <input
            autoFocus
            defaultValue={field.text}
            id={`url-input-${field.id}`}
            placeholder={`https://www.${platform.toLowerCase()}.com/in/yourprofile`}
            onKeyDown={e => {
              if (e.key === "Escape") cancel();
              if (e.key === "Enter") {
                const val = e.target.value.trim();
                if (val) { onSave(field, [{ text: val, bold: false }], null, null); closeEdit(); }
              }
            }}
            style={{
              width: "100%",
              padding: "9px 12px 9px 34px",
              borderRadius: 8,
              border: "1.5px solid #D6E4E0",
              fontFamily: "'Jost',sans-serif",
              fontSize: 12.5,
              color: "#1B1E1A",
              outline: "none",
              boxSizing: "border-box",
              background: "#F8FAF6",
              boxShadow: "0 0 0 3px rgba(29,90,80,0.07)",
            }}
          />
        </Box>

        {/* Preview + Save */}
        <Stack direction="row" spacing={0.75} justifyContent="flex-end" alignItems="center">
          <Typography sx={{ fontSize: 10, color: "#7A8073", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {field.text && <><span style={{ color: "#A9C7C0" }}>current: </span>{field.text.slice(0, 50)}{field.text.length > 50 ? "…" : ""}</>}
          </Typography>
          <RippleBtn
            onClick={() => {
              const val = document.getElementById(`url-input-${field.id}`)?.value.trim();
              if (val) { onSave(field, [{ text: val, bold: false }], null, null); closeEdit(); }
            }}
            disabled={saving}
            style={{ background: platformColor, color: "#fff", border: "none", fontSize: 11.5, fontWeight: 700, padding: "6px 16px", borderRadius: 7, boxShadow: `0 2px 8px ${platformColor}55` }}
          >
            {saving ? "Saving…" : "Save URL"}
          </RippleBtn>
        </Stack>
      </Box>
    );
  }

  if (editing) return (
    <Box className="field-card editing" sx={{ p: 1.75, bgcolor: "#fff", borderRadius: "12px", border: "1.5px solid #7F9E7E", boxShadow: "0 0 0 3px rgba(127,158,126,.15), 0 4px 18px rgba(2,33,36,.08)", animation: "fadeUp .18s ease" }}>
      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1.25, pb: 1.125, borderBottom: "1px solid #E7EAE3", flexWrap: "wrap" }}>
        <Stack direction="row" alignItems="center" spacing={0.75} sx={{ flex: 1 }}>
          <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: sc, flexShrink: 0 }} />
          <Typography sx={{ fontSize: 9.5, fontWeight: 700, color: "text.primary", letterSpacing: ".06em", textTransform: "uppercase", fontFamily: "'Jost',sans-serif" }}>{field.format || "TEXT"}</Typography>
        </Stack>
        {/* [FIX] Use isBoldDisplay so pill shows for format-string bold too */}
        {(field.isBold || (typeof field.format === "string" && field.format.toLowerCase().includes("bold"))) && (
          <PillEl bg="#fefce8" color="#ca8a04" border="transparent" style={{ fontSize: 8, padding: "1px 6px" }}>BOLD</PillEl>
        )}
        {isInserted && <PillEl bg="rgba(22,163,74,0.08)" color="#22c55e" border="transparent" style={{ fontSize: 8 }}>NEW</PillEl>}
        {segsLoading && <span style={{ fontSize: 9, color: "#7F9E7E", display: "flex", alignItems: "center", gap: 4 }}><SpinnerEl size={8} color="#7F9E7E" />Loading…</span>}
        {!segsLoading && fieldSegs && <span style={{ fontSize: 9, color: "#16a34a", fontWeight: 600 }}>✓ formatted</span>}
      </Stack>
      <InlineEditor field={field} sc={sc} saving={saving}
        readOnly={false}
        initialSegments={
          fieldSegs ?? (field.text
            ? [{ text: field.text, bold: field.isBold || false, italic: false,
                 underline: false, strike: false, color: "",
                 fontFamily: "", fontSize: "" }]
            : null)
        }
        onNextSection={onNextSection}
        onAddBlankLine={onAddBlankLine}
        onUndo={undoStack.length > 0 ? async () => {
          const top = undoStack[undoStack.length - 1];
          if (!top) return;
          closeEdit();
          if (top.segs && top.segs.length > 0) { await onSave(field, top.segs, null, null); }
          else { await onSave(field, top.text, null, null); }
          if (onPopUndo) onPopUndo(field.id);
        } : null}
        onApply={(segs, paraFmt) => {
          const snapSegs = fieldSegs && fieldSegs.length > 0 ? fieldSegs : null;
          if (onPushUndo) onPushUndo(field.id, field.text, snapSegs);
          onSave(field, segs, null, paraFmt); closeEdit();
        }}
        onCancel={cancel}
        onDelete={() => { closeEdit(); setConfirmDel(true); }} />

      {/* ── Inline hyperlink URL editor (for fields with embedded links) ── */}
      {localInlineLinks && localInlineLinks.length > 0 && (
        <Box sx={{ mt: 1.5, pt: 1.25, borderTop: "1px solid #EFF2EC" }}>
          <Typography sx={{ fontSize: 9.5, fontWeight: 700, color: "#7A8073", textTransform: "uppercase", letterSpacing: ".07em", mb: 1 }}>
            URLs in this field
          </Typography>
          {/* [FIX] Visual feedback when a hyperlink save is in progress */}
          {linkSaving && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1, px: 0.5, py: 0.5, bgcolor: "rgba(94,129,93,0.06)", borderRadius: 1, border: "1px solid rgba(94,129,93,0.15)" }}>
              <SpinnerEl size={10} color="#7F9E7E" />
              <Typography sx={{ fontSize: 10, color: "#7F9E7E", fontWeight: 600 }}>Saving link…</Typography>
            </Box>
          )}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
            {localInlineLinks.map((lnk, li) => {
              const isLI = lnk.label === "LinkedIn";
              const isGH = lnk.label === "GitHub";
              const isMA = lnk.label === "Mail";
              const dotColor = isLI ? "#3F6C63" : isGH ? "#1B1E1A" : isMA ? "#ea4335" : "#5E815D";
              const nameId = `hl-name-${field.id}-${li}`;
              const urlId  = `hl-url-${field.id}-${li}`;

              const inputStyle = (color) => ({
                width: "100%", padding: "6px 10px", borderRadius: 7,
                border: `1.5px solid #E7EAE3`, fontFamily: "'Jost',sans-serif",
                fontSize: 12, color: "#3A3D37", outline: "none",
                background: "#F8FAF6", boxSizing: "border-box",
                transition: "border-color .12s, box-shadow .12s",
              });

              // [FIX] saveName — queued via enqueueLinkSave so concurrent saves
              // are serialised. Each save awaits the previous one's S3 write,
              // preventing the read-modify-write race that reverted earlier edits.
              const saveName = () => enqueueLinkSave(async () => {
                const newName = document.getElementById(nameId)?.value.trim();
                if (!newName) return;
                // Plain-text email: replace the email address directly in the field text
                if (lnk.rId === "__plain_email__" || lnk.rId === "__noid__") {
                  const newText = field.text.replace(/[\w.+-]+@[\w-]+\.\w+/, newName);
                  await onSave(field, newText, null); return;
                }
                if (!lnk.rId) return;

                // 1. Update display text
                let d = await resumeAiService.editHyperlinkText({
                  session_id:      sessionId,
                  para_index:      field.paraIndex ?? -1,
                  r_id:            lnk.rId,
                  source:          field.source ?? "body",
                  new_text:        newName,
                  hyperlink_index: li,
                });

                // 2. [FIX] For Mail links where the new name is an email, ALSO
                //    sync the mailto: URL so the tooltip stops showing the old
                //    email. This is what makes Mail behave like LinkedIn/GitHub.
                const looksLikeEmail = /^[\w.+-]+@[\w-]+\.\w+$/.test(newName);
                if (isMA && looksLikeEmail) {
                  const d2 = await resumeAiService.editHyperlinkText({
                    session_id:      sessionId,
                    para_index:      field.paraIndex ?? -1,
                    r_id:            lnk.rId,
                    source:          field.source ?? "body",
                    new_url:         "mailto:" + newName,
                    hyperlink_index: li,
                  });
                  if (d2 && d2.success) d = d2;   // use latest field state
                }

                if (d.success) {
                  onRelinkDone?.(d.fields);
                  const uf = d.fields?.find(f => f.paraIndex === field.paraIndex && f.source === field.source && f.inlineLinks);
                  if (uf?.inlineLinks) setLocalInlineLinks(uf.inlineLinks);
                }
              });

              // [FIX] saveUrl — also queued via enqueueLinkSave for serialisation.
              const saveUrl = () => enqueueLinkSave(async () => {
                let newUrl = document.getElementById(urlId)?.value.trim();
                if (!newUrl) return;
                // Auto-prefix mailto: if user typed a bare email for a Mail link
                if (isMA && !newUrl.startsWith("mailto:") && newUrl.includes("@")) {
                  newUrl = "mailto:" + newUrl;
                }
                // Plain-text email or no-rId hyperlink — just update field text
                if (lnk.rId === "__plain_email__" || lnk.rId === "__noid__") {
                  const emailAddr = newUrl.replace("mailto:", "");
                  const newText = field.text.replace(/[\w.+-]+@[\w-]+\.\w+/, emailAddr);
                  await onSave(field, newText, null);
                  return;
                }
                // Real hyperlink with rId — call backend to update URL
                await onLinkSave?.(field, lnk.rId, newUrl, li);

                // [FIX] For Mail links, also push the new email as the display text
                // so visible text and mailto: stay in sync.
                if (isMA && newUrl.startsWith("mailto:")) {
                  const newEmail = newUrl.replace("mailto:", "");
                  try {
                    const d = await resumeAiService.editHyperlinkText({
                      session_id:      sessionId,
                      para_index:      field.paraIndex ?? -1,
                      r_id:            lnk.rId,
                      source:          field.source ?? "body",
                      new_text:        newEmail,
                      hyperlink_index: li,
                    });
                    if (d.success) {
                      onRelinkDone?.(d.fields);
                      const uf = d.fields?.find(f => f.paraIndex === field.paraIndex && f.source === field.source && f.inlineLinks);
                      if (uf?.inlineLinks) setLocalInlineLinks(uf.inlineLinks);
                    }
                  } catch(e) {}
                }
              });

              // [FIX] Combined save — saves both Name and URL in one click.
              // Uses the existing enqueueLinkSave queue so both operations
              // are serialised and don't race against each other.
              const saveBoth = () => {
                saveName();
                saveUrl();
              };

              // [FIX] isBusy disables individual Save buttons while any link op is pending
              const isBusy = linkSaving || saving;

              return (
                <Box key={`${lnk.rId || li}`} sx={{ p: 1.25, border: "1.5px solid #E7EFEC", borderRadius: 2, bgcolor: "#FAFCFB", display: "flex", flexDirection: "column", gap: 0.75 }}>
                  {/* Platform header */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.25 }}>
                    <Box sx={{ width: 20, height: 20, borderRadius: 1, bgcolor: dotColor, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {isLI ? <FaLinkedin color="#fff" size={11} /> :
                       isGH ? <FaGithub   color="#fff" size={11} /> :
                       isMA ? <FaEnvelope color="#fff" size={10} /> :
                              <FaLink     color="#fff" size={10} />}
                    </Box>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: "#3A3D37" }}>{lnk.label || "Link"}</Typography>
                  </Box>

                  {/* Display name row — NO individual Save button */}
                  <Box sx={{ display: "flex", gap: 0.625, alignItems: "center" }}>
                    <Typography sx={{ fontSize: 10, color: "#7A8073", width: 38, flexShrink: 0 }}>Name</Typography>
                    <input id={nameId} defaultValue={lnk.text || ""} placeholder="Display text…"
                      style={inputStyle(dotColor)}
                      onFocus={e => { e.target.style.borderColor = dotColor; e.target.style.boxShadow = `0 0 0 2px ${dotColor}22`; }}
                      onBlur={e  => { e.target.style.borderColor = "#E7EAE3"; e.target.style.boxShadow = "none"; }}
                      onKeyDown={e => { if (e.key === "Enter" && !isBusy) saveBoth(); }}
                    />
                  </Box>

                  {/* URL row — NO individual Save button */}
                  <Box sx={{ display: "flex", gap: 0.625, alignItems: "center" }}>
                    <Typography sx={{ fontSize: 10, color: "#7A8073", width: 38, flexShrink: 0 }}>URL</Typography>
                    <input id={urlId} defaultValue={lnk.url || ""} placeholder="https://…"
                      style={inputStyle(dotColor)}
                      onFocus={e => { e.target.style.borderColor = dotColor; e.target.style.boxShadow = `0 0 0 2px ${dotColor}22`; }}
                      onBlur={e  => { e.target.style.borderColor = "#E7EAE3"; e.target.style.boxShadow = "none"; }}
                      onKeyDown={e => { if (e.key === "Enter" && !isBusy) saveBoth(); }}
                    />
                  </Box>

                  {/* ── Single Save button for both Name + URL ── */}
                  <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 0.5 }}>
                    <Box component="button" onClick={saveBoth}
                      disabled={isBusy}
                      sx={{ px: 1.75, py: 0.625, borderRadius: 1.5, border: "none",
                        bgcolor: isBusy ? "#D8DDD4" : dotColor,
                        color: "#fff", fontSize: 11, fontWeight: 700,
                        cursor: isBusy ? "not-allowed" : "pointer",
                        fontFamily: "'Jost',sans-serif", whiteSpace: "nowrap",
                        opacity: isBusy ? 0.6 : 1,
                        boxShadow: isBusy ? "none" : `0 2px 8px ${dotColor}40`,
                        "&:hover": { opacity: isBusy ? 0.6 : 0.85 } }}>
                      {linkSaving ? "Saving…" : "Save"}
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Box>
          <Typography sx={{ fontSize: 9.5, color: "#A9AEA2", mt: 0.75 }}>Edit name or URL — then hit Save</Typography>

          {/* ── Other contact info (phone, location) — read-only display ── */}
          {(() => {
            // Extract non-link text portions from field.text
            let remaining = (field.text || "").trim();
            (localInlineLinks || []).forEach(lnk => {
              if (lnk.text) remaining = remaining.replace(lnk.text, "|||");
            });
            const parts = remaining.split("|||").map(p => p.replace(/[|]/g, "").trim()).filter(Boolean);
            // Detect phone vs location
            const phonePart = parts.find(p => /\+?\d[\d\s\-().]{5,}/.test(p));
            const otherParts = parts.filter(p => p !== phonePart && p.length > 1);
            const hasExtras = phonePart || otherParts.length > 0;

            if (!hasExtras) return null;
            return (
              <Box sx={{ mt: 1.25, pt: 1.25, borderTop: "1px solid #E9ECE4" }}>
                <Typography sx={{ fontSize: 9.5, fontWeight: 700, color: "#7A8073", textTransform: "uppercase", letterSpacing: ".07em", mb: 0.75 }}>
                  Other info in this field
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                  {phonePart && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, p: 1, border: "1.5px solid #E7EAE3", borderRadius: 2, bgcolor: "#F8FAF6" }}>
                      <Box sx={{ width: 20, height: 20, borderRadius: 1, bgcolor: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <FaPhone color="#fff" size={9} />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontSize: 9.5, color: "#7A8073", fontWeight: 600 }}>Phone</Typography>
                        <Typography sx={{ fontSize: 12, color: "#3A3D37", fontWeight: 500 }}>{phonePart}</Typography>
                      </Box>
                    </Box>
                  )}
                  {otherParts.map((part, pi) => (
                    <Box key={pi} sx={{ display: "flex", alignItems: "center", gap: 1, p: 1, border: "1.5px solid #E7EAE3", borderRadius: 2, bgcolor: "#F8FAF6" }}>
                      <Box sx={{ width: 20, height: 20, borderRadius: 1, bgcolor: "#5E815D", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <FaMapMarkerAlt color="#fff" size={10} />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontSize: 9.5, color: "#7A8073", fontWeight: 600 }}>Location / Other</Typography>
                        <Typography sx={{ fontSize: 12, color: "#3A3D37", fontWeight: 500 }}>{part}</Typography>
                      </Box>
                    </Box>
                  ))}
                  <Typography sx={{ fontSize: 9, color: "#A9AEA2", mt: 0.25, lineHeight: 1.5 }}>
                    These fields are displayed from the document. To edit phone or location, use the full-text editor below.
                  </Typography>
                </Box>
              </Box>
            );
          })()}

          {/* ── Advanced full-text editor (hidden behind toggle due to formatting risk) ── */}
          <AdvancedTextEditor fieldId={field.id} fieldText={field.text || ""} saving={saving} onSave={(newText) => { if (newText && newText !== field.text) onSave(field, newText, null); }} />

          {/* ── Restore broken / add new hyperlink ── */}
          <Box sx={{ mt: 1.25, pt: 1.25, borderTop: "1px dashed #f1d0b5" }}>
            <Typography sx={{ fontSize: 9.5, fontWeight: 700, color: "#f59e0b", textTransform: "uppercase", letterSpacing: ".07em", mb: 0.75 }}>
              ⚠ Restore a broken link
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.625 }}>
              <input
                id={`relink-text-${field.id}`}
                placeholder="Display text to re-link (e.g. gh chvamsi)"
                style={{ padding: "5px 9px", borderRadius: 6, border: "1.5px solid #fde68a", fontFamily: "'Jost',sans-serif", fontSize: 11.5, color: "#3A3D37", outline: "none", background: "#fffbeb", width: "100%", boxSizing: "border-box" }}
              />
              <input
                id={`relink-url-${field.id}`}
                placeholder="URL (e.g. https://github.com/yourprofile)"
                style={{ padding: "5px 9px", borderRadius: 6, border: "1.5px solid #fde68a", fontFamily: "'Jost',sans-serif", fontSize: 11.5, color: "#3A3D37", outline: "none", background: "#fffbeb", width: "100%", boxSizing: "border-box" }}
              />
              <Box
                component="button"
                onClick={async () => {
                  const text = document.getElementById(`relink-text-${field.id}`)?.value.trim();
                  const url  = document.getElementById(`relink-url-${field.id}`)?.value.trim();
                  if (!text || !url) return;
                  try {
                    const r = await fetch(`${API_BASE}/relink-text`, {
                      method: "POST", headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ session_id: sessionId, para_index: field.paraIndex ?? -1, source: field.source ?? "body", text, url }),
                    });
                    const d = await r.json();
                    if (d.success) {
                      // Update global fields state + preview + localInlineLinks
                      onRelinkDone?.(d.fields);
                      // Refresh localInlineLinks with the NEW rId
                      if (d.fields) {
                        const updatedField = d.fields.find(f => f.paraIndex === field.paraIndex && f.source === field.source && f.inlineLinks);
                        if (updatedField?.inlineLinks) setLocalInlineLinks(updatedField.inlineLinks);
                      }
                    } else {
                      alert("Re-link failed: " + (d.message || "unknown error"));
                    }
                  } catch(e) { alert("Re-link error: " + e.message); }
                }}
                sx={{ px: 1.5, py: 0.625, borderRadius: 1, border: "none", bgcolor: "#f59e0b", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'Jost',sans-serif", textAlign: "center", "&:hover": { bgcolor: "#d97706" } }}
              >
                🔗 Restore Link
              </Box>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );

  if (confirmDel) return (
    <Box className="field-card" sx={{ p: 1.25, bgcolor: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.25)", animation: "fadeUp .18s ease" }}>
      <Typography sx={{ fontSize: 12, color: "#ef4444", fontWeight: 700, mb: 0.625 }}>Delete this line?</Typography>
      <Typography sx={{ fontSize: 11, color: "text.secondary", mb: 1.25, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", opacity: .7 }}>{field.text}</Typography>
      <Stack direction="row" spacing={0.75} justifyContent="flex-end">
        <RippleBtn variant="ghost" onClick={() => setConfirmDel(false)} style={{ fontSize: 11, padding: "4px 12px" }}>Cancel</RippleBtn>
        <RippleBtn onClick={() => { setConfirmDel(false); isInserted ? onDeleteLine(field) : onDeleteField(field); }} disabled={saving}
          style={{ background: "#dc2626", color: "#fff", border: "none", fontSize: 11, padding: "4px 12px" }}>{saving ? "…" : "Delete"}</RippleBtn>
      </Stack>
    </Box>
  );

  const fieldLabel = field.label || (field.format && field.format !== "TEXT" ? field.format : null);

  // ── [FIX] Derive bold from isBold flag OR from format string ─────────────
  // Backend sets format = "bold, 11pt, Calibri" for bold runs, and isBold may
  // lag behind on some parsed fields. Checking both ensures the card displays
  // bold text whenever the resume preview does.
  const isBoldDisplay =
    field.isBold ||
    (typeof field.format === "string" && field.format.toLowerCase().includes("bold"));

  // ── Smart form label (reference UI: label above a rounded input) ──
  // Uses the explicit label when the backend provides one; otherwise
  // detects Email / Phone / LinkedIn / GitHub / Link from the content,
  // then falls back to Heading (bold lines) or Text.
  const smartLabel = (() => {
    if (field.label) return field.label;
    const t = (field.text || "").trim();
    if (/\S+@\S+\.\S+/.test(t)) return "Email";
    if (/linkedin\.com/i.test(t)) return "LinkedIn";
    if (/github\.com/i.test(t)) return "GitHub";
    if (/(https?:\/\/|www\.)/i.test(t)) return "Link";
    const digits = t.replace(/\D/g, "");
    if (digits.length >= 8 && /^[\d\s+\-()./]+$/.test(t)) return "Phone";
    if (field.format && field.format !== "TEXT" && !/pt|calibri|arial|times|bold|italic/i.test(field.format)) return field.format;
    if (isBoldDisplay) return "Heading";
    return "Text";
  })();

  const cardCls = [
    "field-input-card",
    hasValue   ? "has-value" : "",
    mod        ? "modified"  : "",
    isInserted ? "inserted"  : "",
    isReadOnly ? "field-readonly" : "",
  ].filter(Boolean).join(" ");

  return (
    <>
    {undoStack.length > 0 && !isReadOnly && (
      <Box sx={{ display:"flex", alignItems:"center", gap:0.75, mb:0.5, px:0.5 }}>
        <Box sx={{ width:6, height:6, borderRadius:"50%", bgcolor:"#1D5A50", flexShrink:0, boxShadow:"0 0 6px #1D5A5080" }} />
        <Typography sx={{ fontSize:10.5, color:"#1D5A50", fontWeight:600, fontFamily:"'Jost',sans-serif", flex:1 }}>Undo last edit</Typography>
        <Box component="button"
          onClick={async e => {
            e.stopPropagation();
            const top = undoStack[undoStack.length - 1];
            if (!top) return;
            if (top.segs && top.segs.length > 0) { await onSave(field, top.segs, null, null); }
            else { await onSave(field, top.text, null, null); }
            if (onPopUndo) onPopUndo(field.id);
          }}
          sx={{ display:"inline-flex", alignItems:"center", gap:0.5, px:1.25, py:0.375, borderRadius:99,
            border:"1px solid rgba(29,90,80,.35)", bgcolor:"rgba(29,90,80,.08)", color:"#1D5A50",
            cursor:"pointer", fontSize:11, fontWeight:700, fontFamily:"'Jost',sans-serif",
            "&:hover":{ bgcolor:"rgba(29,90,80,.18)" }, transition:"all .15s" }}>
          <Ico.Rst /> Undo {undoStack.length > 1 ? `(${undoStack.length})` : ""}
        </Box>
      </Box>
    )}
    <Box
      data-field-id={field.id}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => { if (!isAddingAfter && onCancelAdd) onCancelAdd(); openEdit(); }}
      sx={{ opacity: saving ? .5 : 1, mb: 1.5, userSelect: "none", cursor: isReadOnly ? "not-allowed" : "pointer" }}
    >
      {/* Label ABOVE the input (reference form style) */}
      <Typography sx={{
        fontSize: 11.5, fontWeight: 600, mb: 0.5, ml: 0.25, letterSpacing: ".01em",
        fontFamily: "'Jost',sans-serif",
        color: mod ? (isDark ? "#9FB89E" : "#5E815D") : isInserted ? "#16a34a" : (isDark ? "rgba(168,191,167,.55)" : "#7A8073"),
        display: "flex", alignItems: "center", gap: 0.5,
      }}>
        {smartLabel}
        {isInserted && <Box component="span" sx={{ fontSize: 8, fontWeight: 700, color: "#16a34a", bgcolor: "rgba(22,163,74,0.1)", px: 0.6, py: 0.1, borderRadius: 0.5, ml: 0.25 }}>NEW</Box>}
        {mod && !isInserted && <Box component="span" sx={{ fontSize: 8, fontWeight: 700, color: "#5E815D", bgcolor: "rgba(94,129,93,0.1)", px: 0.6, py: 0.1, borderRadius: 0.5, ml: 0.25 }}>EDITED</Box>}
      </Typography>
      {/* Rounded input-style box (reference form style) */}
      <Box className={cardCls} sx={{
        position: "relative", minHeight: 48, px: 1.75, py: 1,
        display: "flex", alignItems: "center",
        bgcolor: isDark ? undefined : "#fff",
        border: `1.5px solid ${hovered && !isReadOnly ? "#7F9E7E" : (isDark ? "rgba(159,184,158,.2)" : "#E7EAE3")}`,
        borderRadius: "12px",
        transition: "border-color .15s ease, box-shadow .15s ease",
        boxShadow: hovered && !isReadOnly ? "0 2px 12px rgba(127,158,126,.14)" : "none",
      }}>
        <Box sx={{ pr: "88px", flex: 1, minWidth: 0 }}>
          <Typography sx={{
            fontSize: isBoldDisplay ? 13.5 : 13,
            fontWeight: isBoldDisplay ? 700 : 400,
            color: hasValue ? (field.type === "icon-link" ? (isDark ? "#9FB89E" : "#5E815D") : (isDark ? "#C9D8C8" : "#101210")) : (isDark ? "rgba(60,96,88,.35)" : "#C9CEC4"),
            lineHeight: 1.55,
            overflow: "hidden", textOverflow: "ellipsis",
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
            wordBreak: "break-word",
            fontStyle: hasValue ? "normal" : "italic",
          }}>
            {hasValue ? field.text : "Click to add…"}
          </Typography>
        </Box>
        <Box sx={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", width: 80, display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
          <Box sx={{
            position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)",
            display: "flex", alignItems: "center", gap: 0.375,
            opacity: hovered && !isReadOnly ? 1 : 0,
            transition: "opacity .15s",
            pointerEvents: hovered && !isReadOnly ? "auto" : "none",
          }}>
            {!isInserted && (
              <Tooltip title="Add line below" placement="top">
                <Box component="button"
                  onMouseDown={e => { e.stopPropagation(); e.preventDefault(); onAddLine(field); }}
                  sx={{ width: 24, height: 24, borderRadius: 1, border: "1px solid #E7EAE3", bgcolor: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#7A8073", flexShrink: 0, "&:hover": { borderColor: "#5E815D", color: "#5E815D", bgcolor: "#EDF3EC" }, transition: "all .12s" }}>
                  <Plus size={11} />
                </Box>
              </Tooltip>
            )}
            <Tooltip title="Delete" placement="top">
              <Box component="button"
                onMouseDown={e => { e.stopPropagation(); e.preventDefault(); setConfirmDel(true); }}
                sx={{ width: 24, height: 24, borderRadius: 1, border: "1px solid rgba(220,38,38,0.25)", bgcolor: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#ef4444", flexShrink: 0, "&:hover": { bgcolor: "rgba(220,38,38,0.06)" }, transition: "all .12s" }}>
                <Trash2 size={11} />
              </Box>
            </Tooltip>
            <Tooltip title="Edit" placement="top">
              <Box sx={{ width: 24, height: 24, borderRadius: 1, border: "1px solid rgba(94,129,93,0.3)", bgcolor: "#EDF3EC", display: "flex", alignItems: "center", justifyContent: "center", color: "#5E815D", flexShrink: 0 }}>
                <Edit2 size={11} />
              </Box>
            </Tooltip>
          </Box>
          <Box sx={{
            position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)",
            width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
            bgcolor: hasValue ? "#22c55e" : "#EFF2EC",
            border: hasValue ? "none" : "1.5px dashed #D8DDD4",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: hasValue ? "0 1px 4px rgba(34,197,94,0.28)" : "none",
            opacity: hovered ? 0 : 1, transition: "opacity .15s", pointerEvents: "none",
          }}>
            {hasValue ? <Check size={12} color="#fff" strokeWidth={3} /> : <Box sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: "#D8DDD4" }} />}
          </Box>
        </Box>
      </Box>
    </Box>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   SECTION PAGE
══════════════════════════════════════════════════════════════════════ */
export default FieldRow;