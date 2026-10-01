// ============================================================================
// PageWriterDialog.jsx — Slide-over panel for writing and editing content
//                        on blank pages added to the resume.
// Location: src/components/jobseeker/Workspace/AIResumeBuilder/PageWriterDialog.jsx
// ============================================================================

import React, { useState, useEffect, useRef } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { Edit2, X, Check, Trash2 } from "lucide-react";
import { SpinnerEl, Ico } from "./atoms";

function PageWriterDialog({ open, onWrite, onClose, writing, pageFields, onSaveField, onDeleteField, deleting }) {
  const [text,            setText]            = React.useState("");
  const [editingId,       setEditingId]       = React.useState(null);
  const [editingText,     setEditingText]     = React.useState("");
  const [confirmDeleteId, setConfirmDeleteId] = React.useState(null);
  const textareaRef = React.useRef(null);
  const editRef     = React.useRef(null);

  React.useEffect(() => {
    if (!open) return;
    setText(""); setEditingId(null); setEditingText(""); setConfirmDeleteId(null);
    const t = setTimeout(() => textareaRef.current?.focus(), 160);
    return () => clearTimeout(t);
  }, [open]);

  React.useEffect(() => {
    if (editingId && editRef.current) { editRef.current.focus(); editRef.current.select(); }
  }, [editingId]);

  React.useEffect(() => {
    if (!pageFields) return;
    if (confirmDeleteId && !pageFields.find(f => f.id === confirmDeleteId)) setConfirmDeleteId(null);
    if (editingId     && !pageFields.find(f => f.id === editingId))          setEditingId(null);
  }, [pageFields, confirmDeleteId, editingId]);

  const linesCount = text ? text.split("\n").length : 0;
  const words      = text.trim() ? text.trim().split(/\s+/).length : 0;
  const chars      = text.length;

  const handleSubmit  = () => { if (text.trim() && !writing) onWrite(text); };
  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); handleSubmit(); }
    if (e.key === "Escape") { editingId ? cancelEdit() : onClose(); }
  };

  const startEdit  = (field) => { setEditingId(field.id); setEditingText(field.text); setConfirmDeleteId(null); };
  const cancelEdit = () => { setEditingId(null); setEditingText(""); };
  const saveEdit   = (field) => {
    const t = editingText.trim();
    if (!t) { setEditingId(null); setConfirmDeleteId(field.id); return; }
    if (t !== field.text) onSaveField(field, t, null);
    setEditingId(null); setEditingText("");
  };

  if (!open) return null;

  const hasExisting = pageFields && pageFields.length > 0;

  /* ── shared button style helpers ── */
  const baseBtn = (extra = {}) => ({
    border: "1px solid #E7EAE3", borderRadius: 7, background: "#F8FAF6",
    color: "#3A3D37", cursor: "pointer", fontFamily: "'Jost',sans-serif",
    fontSize: 11.5, fontWeight: 600, padding: "5px 13px",
    display: "inline-flex", alignItems: "center", gap: 5, transition: "all .12s", ...extra,
  });
  const redBtn = (extra = {}) => ({
    ...baseBtn({ border: "1px solid rgba(239,68,68,0.35)", background: "rgba(239,68,68,0.07)", color: "#ef4444" }),
    ...extra,
  });

  return (
    /* ── Side panel — NO backdrop, slides over the editor column only ── */
    <div
      style={{
        position: "fixed",
        top: 0, right: 0, bottom: 0,
        /* Match the editor column width exactly (55 vw) */
        width: "55vw",
        zIndex: 300,
        background: "#fff",
        borderLeft: "2px solid #E7EFEC",
        boxShadow: "-10px 0 48px rgba(29,90,80,0.10), -2px 0 12px rgba(0,0,0,0.06)",
        display: "flex", flexDirection: "column",
        fontFamily: "'Jost',sans-serif",
        animation: "panelSlide .28s cubic-bezier(.34,1.4,.64,1)",
        overflow: "hidden",
      }}
    >

      {/* ── Header ── */}
      <div style={{ padding: "18px 22px 14px", borderBottom: "1.5px solid #F1F6F4", display: "flex", alignItems: "center", gap: 13, flexShrink: 0, background: "#FAFCFB" }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#1D5A50,#2E6E62)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 3px 12px rgba(29,90,80,0.28)" }}>
          <Edit2 size={15} color="#fff" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Jost',sans-serif", fontWeight: 800, fontSize: 15, color: "#101210", letterSpacing: "-.02em", display: "flex", alignItems: "center", gap: 8 }}>
            Page Content
            {hasExisting && (
              <span style={{ fontSize: 11.5, fontWeight: 600, color: "#1D5A50", background: "rgba(29,90,80,0.09)", border: "1px solid rgba(29,90,80,0.22)", borderRadius: 99, padding: "1px 9px" }}>
                {pageFields.length} line{pageFields.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: "#7A8073", marginTop: 1 }}>
            Preview visible on the left — click ✏ to edit any letter, word or line
          </div>
        </div>
        <button
          onClick={onClose}
          title="Close (Esc)"
          style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid #E7EAE3", background: "#F8FAF6", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#55584F", flexShrink: 0, transition: "all .12s" }}
          onMouseEnter={e => { e.currentTarget.style.background = "#F0F2ED"; e.currentTarget.style.borderColor = "#D8DDD4"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "#F8FAF6"; e.currentTarget.style.borderColor = "#E7EAE3"; }}
        >
          <X size={13} />
        </button>
      </div>

      {/* ── Scrollable body ── */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>

        {/* Existing lines */}
        {hasExisting && (
          <div style={{ padding: "14px 22px", borderBottom: "1.5px solid #F1F6F4" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: "#1D5A50", textTransform: "uppercase", letterSpacing: ".07em" }}>Written Lines</span>
              <span style={{ fontSize: 10.5, color: "#7A8073" }}>Double-click or ✏ to edit any part</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {pageFields.map((field) => {
                const isEditing  = editingId === field.id;
                const isConfirm  = confirmDeleteId === field.id;
                const isDeleting = deleting && isConfirm;

                /* ── INLINE EDIT ── */
                if (isEditing) return (
                  <div key={field.id} style={{ borderRadius: 10, border: "1.5px solid #1D5A50", background: "#fff", boxShadow: "0 0 0 3px rgba(29,90,80,0.10)", padding: "10px 12px", animation: "fadeIn .14s ease" }}>
                    <div style={{ fontSize: 10, color: "#1D5A50", fontWeight: 700, marginBottom: 7, display: "flex", alignItems: "center", gap: 5 }}>
                      <Edit2 size={10} /> Select any text and replace, or retype the entire line
                    </div>
                    <textarea
                      ref={editRef}
                      value={editingText}
                      onChange={e => setEditingText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Escape") { e.preventDefault(); cancelEdit(); }
                        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); saveEdit(field); }
                      }}
                      rows={Math.min(7, Math.max(2, editingText.split("\n").length + 1))}
                      style={{ width: "100%", padding: "9px 11px", borderRadius: 8, border: "1.5px solid #A9C7C0", fontFamily: "'Jost',sans-serif", fontSize: 13, lineHeight: 1.7, color: "#101210", background: "#F8FAF6", resize: "vertical", outline: "none", boxSizing: "border-box", boxShadow: "0 0 0 2px rgba(29,90,80,0.08)" }}
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                      <span style={{ fontSize: 10, color: "#7A8073" }}>{editingText.length} chars · Ctrl+Enter to save · Esc to cancel</span>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={cancelEdit} style={baseBtn({ fontSize: 11, padding: "3px 11px" })}><X size={11} /> Cancel</button>
                        <button onClick={() => saveEdit(field)} disabled={deleting} style={baseBtn({ fontSize: 11, padding: "3px 13px", background: "#1D5A50", color: "#fff", border: "none", boxShadow: "0 2px 8px rgba(29,90,80,0.3)", opacity: deleting ? .5 : 1 })}>
                          <Check size={11} /> Save
                        </button>
                      </div>
                    </div>
                  </div>
                );

                /* ── DELETE CONFIRM ── */
                if (isConfirm) return (
                  <div key={field.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 9, background: "rgba(239,68,68,0.06)", border: "1.5px solid rgba(239,68,68,0.3)", animation: "fadeIn .14s ease" }}>
                    <Trash2 size={13} color="#ef4444" style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 12.5, color: "#ef4444", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      Delete: "{field.text?.slice(0, 42)}{field.text?.length > 42 ? "…" : ""}"?
                    </span>
                    <button onClick={() => setConfirmDeleteId(null)} style={baseBtn({ fontSize: 11, padding: "3px 10px" })}>Cancel</button>
                    <button onClick={() => onDeleteField(field)} disabled={isDeleting} style={redBtn({ fontSize: 11, padding: "3px 11px", opacity: isDeleting ? .55 : 1 })}>
                      {isDeleting ? <SpinnerEl size={10} color="#ef4444" /> : <><Trash2 size={11} /> Delete</>}
                    </button>
                  </div>
                );

                /* ── NORMAL ROW ── */
                return (
                  <div
                    key={field.id}
                    onDoubleClick={() => startEdit(field)}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 9, background: "#F8FAF6", border: "1.5px solid #E7EAE3", transition: "all .12s", cursor: "default" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "#A9C7C0"; e.currentTarget.style.background = "#F1F6F4"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "#E7EAE3";  e.currentTarget.style.background = "#F8FAF6"; }}
                  >
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#A9C7C0", flexShrink: 0, width: 18, textAlign: "right", fontFamily: "monospace" }}>
                      {pageFields.indexOf(field) + 1}
                    </span>
                    <span style={{ flex: 1, fontSize: 13, color: field.text?.trim() ? "#3A3D37" : "#C9CEC4", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontStyle: field.text?.trim() ? "normal" : "italic" }}>
                      {field.text?.trim() || "empty line"}
                    </span>
                    {/* Edit btn */}
                    <button
                      onClick={e => { e.stopPropagation(); startEdit(field); }}
                      title="Edit — change any letter, word or paragraph"
                      style={{ width: 27, height: 27, borderRadius: 7, border: "1px solid rgba(29,90,80,0.28)", background: "rgba(29,90,80,0.07)", color: "#1D5A50", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all .12s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(29,90,80,0.18)"}
                      onMouseLeave={e => e.currentTarget.style.background = "rgba(29,90,80,0.07)"}
                    >
                      <Edit2 size={12} />
                    </button>
                    {/* Delete btn */}
                    <button
                      onClick={e => { e.stopPropagation(); setConfirmDeleteId(field.id); setEditingId(null); }}
                      disabled={deleting}
                      title="Delete this line"
                      style={{ width: 27, height: 27, borderRadius: 7, border: "1px solid #fecaca", background: "rgba(239,68,68,0.06)", color: "#f87171", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all .12s", opacity: deleting ? .4 : 1 }}
                      onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.14)"; e.currentTarget.style.color = "#ef4444"; e.currentTarget.style.borderColor = "#f87171"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "rgba(239,68,68,0.06)"; e.currentTarget.style.color = "#f87171";  e.currentTarget.style.borderColor = "#fecaca"; }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Add more content ── */}
        <div style={{ padding: "16px 22px", flex: 1, display: "flex", flexDirection: "column" }}>
          {hasExisting && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
              <div style={{ flex: 1, height: 1, background: "#EFF2EC" }} />
              <span style={{ fontSize: 10.5, fontWeight: 700, color: "#7A8073", textTransform: "uppercase", letterSpacing: ".06em" }}>Add more content</span>
              <div style={{ flex: 1, height: 1, background: "#EFF2EC" }} />
            </div>
          )}
          {!hasExisting && (
            <div style={{ marginBottom: 12, padding: "9px 13px", background: "rgba(29,90,80,0.06)", border: "1px solid rgba(29,90,80,0.2)", borderRadius: 8, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 15, flexShrink: 0 }}>💡</span>
              <span style={{ fontSize: 11.5, color: "#1D5A50", lineHeight: 1.55 }}>
                Paste from Word, Notion, or any text source. <b>Blank lines</b> add spacing. <b>Ctrl+Enter</b> to write.
              </span>
            </div>
          )}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={hasExisting
              ? "Type additional lines to append to this page…"
              : "Type your content here, or paste from another document…\n\nEach line becomes a separate paragraph.\nBlank lines add spacing."}
            style={{ width: "100%", flex: 1, minHeight: hasExisting ? 120 : 240, padding: "13px 14px", borderRadius: 10, border: "1.5px solid #E7EAE3", fontFamily: "'Jost',sans-serif", fontSize: 13.5, lineHeight: 1.8, color: "#101210", background: "#F8FAF6", resize: "none", outline: "none", boxSizing: "border-box", transition: "border-color .15s, box-shadow .15s" }}
            onFocus={e => { e.target.style.borderColor = "#1D5A50"; e.target.style.boxShadow = "0 0 0 3px rgba(29,90,80,0.1)"; }}
            onBlur={e  => { e.target.style.borderColor = "#E7EAE3"; e.target.style.boxShadow = "none"; }}
          />
          <div style={{ display: "flex", gap: 16, padding: "7px 2px", fontSize: 11, color: "#7A8073" }}>
            <span><b style={{ color: text ? "#55584F" : "#7A8073" }}>{linesCount}</b> line{linesCount !== 1 ? "s" : ""}</span>
            <span><b style={{ color: text ? "#55584F" : "#7A8073" }}>{words}</b> word{words !== 1 ? "s" : ""}</span>
            <span><b style={{ color: text ? "#55584F" : "#7A8073" }}>{chars}</b> char{chars !== 1 ? "s" : ""}</span>
            {text.trim() && <span style={{ marginLeft: "auto", color: "#6FA095", fontWeight: 500, fontSize: 10.5 }}>Ctrl+Enter ↵</span>}
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{ padding: "12px 22px 18px", borderTop: "1.5px solid #F1F6F4", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, flexShrink: 0, background: "#FAFCFB" }}>
        <button onClick={onClose} style={baseBtn({ padding: "8px 18px", fontSize: 12.5, borderRadius: 8 })}>
          {hasExisting && !text.trim() ? "Done" : "Cancel"}
        </button>
        <button
          onClick={handleSubmit}
          disabled={!text.trim() || writing}
          style={{ padding: "9px 20px", fontSize: 12.5, fontWeight: 700, borderRadius: 8, cursor: (!text.trim() || writing) ? "not-allowed" : "pointer", background: (!text.trim() || writing) ? "#E7EAE3" : "linear-gradient(135deg,#1D5A50,#1D5A50)", color: (!text.trim() || writing) ? "#7A8073" : "#fff", border: "none", boxShadow: (!text.trim() || writing) ? "none" : "0 4px 14px rgba(29,90,80,0.32)", transition: "all .2s", display: "inline-flex", alignItems: "center", gap: 7, fontFamily: "'Jost',sans-serif" }}
        >
          {writing ? <><SpinnerEl size={12} color="#7A8073" /> Writing…</> : <><Edit2 size={13} /> {hasExisting ? "Append to Page" : "Write to Page"}</>}
        </button>
      </div>

    </div>
  );
}


/* ══════════════════════════════════════════════════════════════════════
   STEP LABELS
══════════════════════════════════════════════════════════════════════ */
export default PageWriterDialog;