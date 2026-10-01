import React, { useState, useMemo } from "react";
import { Box, Typography, Stack } from "@mui/material";
import { Plus, X, Link, RotateCcw, Edit2, Check } from "lucide-react";
import { RippleBtn, SpinnerEl } from "./atoms";
import { FaLinkedin, FaGithub, FaEnvelope, FaLink, FaPhone, FaGlobe } from "react-icons/fa";
import resumeAiService from "@/services/api/jobseeker/resumeAiService";

// ── Platform definitions ────────────────────────────────────────────────────
const PLATFORMS = [
  { key: "linkedin",  label: "LinkedIn",  icon: FaLinkedin, color: "#3F6C63", placeholder: "https://linkedin.com/in/yourprofile",  prefix: "https://linkedin.com/in/" },
  { key: "github",    label: "GitHub",    icon: FaGithub,   color: "#1B1E1A", placeholder: "https://github.com/yourprofile",       prefix: "https://github.com/" },
  { key: "portfolio", label: "Portfolio", icon: FaLink,     color: "#059669", placeholder: "https://yourportfolio.com",            prefix: "https://" },
  { key: "website",   label: "Website",   icon: FaGlobe,    color: "#5E815D", placeholder: "https://yourwebsite.com",              prefix: "https://" },
  { key: "email",     label: "Email",     icon: FaEnvelope, color: "#ea4335", placeholder: "you@example.com",                      prefix: "mailto:" },
];

// Fallback descriptors for platforms not in PLATFORMS (used by detectLinkPlatform).
const PORTFOLIO_DESCRIPTOR = { key: "portfolio", label: "Portfolio", icon: FaLink,  color: "#059669" };
const GENERIC_LINK_DESCRIPTOR = { key: "website", label: "Link", icon: FaLink, color: "#5E815D" };

// ── Detect which platforms are already present ──────────────────────────────
function detectPresent(headerFields) {
  const present = new Set();
  for (const f of headerFields) {
    const txt = (f.text || "").toLowerCase();
    const links = f.inlineLinks || [];
    for (const lnk of links) {
      const url = (lnk.url || "").toLowerCase();
      if (url.includes("linkedin") || lnk.label === "LinkedIn") present.add("linkedin");
      if (url.includes("github")   || lnk.label === "GitHub")   present.add("github");
      if (url.startsWith("mailto:") || lnk.label === "Mail")    present.add("email");
      // ── [FIX] detect portfolio & website from inline links ─────────────────
      if (lnk.label === "Portfolio" || url.includes("portfolio")) present.add("portfolio");
      if (lnk.label === "Website")                                 present.add("website");
    }
    if (f.fieldRole === "linkedin") present.add("linkedin");
    if (f.fieldRole === "github")   present.add("github");
    if (f.fieldRole === "email")    present.add("email");
    // ── [FIX] detect portfolio & website from fieldRole & isSplitField ───────
    if (f.fieldRole === "portfolio" || (f.isSplitField && f.fieldRole === "portfolio")) present.add("portfolio");
    if (f.fieldRole === "website"   || (f.isSplitField && f.fieldRole === "website"))   present.add("website");
    if (/linkedin/i.test(txt)) present.add("linkedin");
    if (/github/i.test(txt))   present.add("github");
  }
  return present;
}

// ── Find the paraIndex of the contact paragraph ─────────────────────────────
function findContactParaIndex(headerFields) {
  const splitField = headerFields.find(f => f.isSplitField);
  if (splitField) return { paraIndex: splitField.paraIndex, source: splitField.source || "body" };

  const candidates = headerFields.filter(f =>
    !f.isHeader && f.type !== "image" && f.section?.key === "header"
  );
  if (candidates.length > 0) {
    const last = candidates[candidates.length - 1];
    return { paraIndex: last.paraIndex, source: last.source || "body" };
  }

  if (headerFields.length > 0) {
    const last = headerFields[headerFields.length - 1];
    return { paraIndex: last.paraIndex ?? 0, source: last.source || "body" };
  }

  return { paraIndex: 0, source: "body" };
}

// ── Detect platform for a link (for icon / colour in existing links) ─────────
// [PLATFORM CLASSIFICATION] Trust backend-supplied fieldRole / lnk.label first;
// fall back to URL-string heuristics only when nothing usable came from the
// backend. Polymorphic: accepts either a legacy string OR an item object.
function detectLinkPlatform(input) {
  // 1. Backend-supplied classification — most reliable path.
  if (input && typeof input === "object") {
    const role = (input?.field?.fieldRole || input?.lnk?.label || "").toLowerCase();
    if (role) {
      const fromMap = PLATFORMS.find(p => p.key === role);
      if (fromMap) return fromMap;
      if (role === "mail") return PLATFORMS.find(p => p.key === "email");
    }
  }

  // 2. Derive URL/text strings for the heuristic fallback.
  let s = "";
  if (typeof input === "string") {
    s = input.toLowerCase();
  } else if (input && typeof input === "object") {
    s = (
      input?.lnk?.targetUrl ??
      input?.lnk?.url ??
      input?.lnk?.text ??
      input?.lnk?.label ??
      input?.field?.text ??
      ""
    ).toLowerCase();
  }

  // 3. URL-string heuristics — only when backend didn't classify.
  if (s.includes("linkedin")) return PLATFORMS.find(p => p.key === "linkedin");
  if (s.includes("github"))   return PLATFORMS.find(p => p.key === "github");
  if (s.startsWith("mailto:") || s.includes("@")) return PLATFORMS.find(p => p.key === "email");
  // github.com/user/portfolio is a GitHub repo, not a Portfolio platform.
  if ((s.includes("portfolio") && !s.includes("github.com")) ||
      s.includes("behance") || s.includes("dribbble"))
    return PORTFOLIO_DESCRIPTOR;
  if (s.startsWith("http"))   return PLATFORMS.find(p => p.key === "website");
  return GENERIC_LINK_DESCRIPTOR;
}

// ── Unique key for an item in the "current links" list ───────────────────────
// hyperlink items  → rId
// split / noid     → field.id + optional index suffix
function itemKey(item) {
  if (item.kind === "hyperlink") return item.lnk.rId;
  if (item.kind === "noid")      return `noid-${item.field.id}-${item.idx}`;
  return `split-${item.field.id}`;
}


function AddContactPanel({ headerFields = [], sessionId, saving, showToast, onFieldsUpdated }) {
  // ── Add-new state ──────────────────────────────────────────────────────────
  const [addingKey, setAddingKey]   = useState(null);
  const [urlValue, setUrlValue]     = useState("");
  const [nameValue, setNameValue]   = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded]     = useState(false);

  // ── Undo last-added ────────────────────────────────────────────────────────
  const [lastAdded, setLastAdded] = useState(null);
  const [undoing, setUndoing]     = useState(false);

  // ── Edit-existing state (shared for all 3 item kinds) ─────────────────────
  // editingKey  : itemKey() value of the item currently being edited, or null
  // editUrl / editName : controlled inputs
  // editSubmitting : in-flight save indicator
  // linkHistory : { [itemKey]: { url, name } } snapshot before each save → for undo
  // undoingKey  : itemKey() of the item whose undo is in flight
  const [editingKey, setEditingKey]           = useState(null);
  const [editUrl, setEditUrl]                 = useState("");
  const [editName, setEditName]               = useState("");
  const [editSubmitting, setEditSubmitting]   = useState(false);
  const [linkHistory, setLinkHistory]         = useState({});
  const [undoingKey, setUndoingKey]           = useState(null);

  const present       = useMemo(() => detectPresent(headerFields), [headerFields]);
  const missing       = PLATFORMS.filter(p => !present.has(p.key));
  const contactTarget = useMemo(() => findContactParaIndex(headerFields), [headerFields]);

  // ── Build unified list of current-link items ──────────────────────────────
  //
  // kind: "hyperlink"  → has a real rId; edit via editHyperlinkText
  // kind: "noid"       → inlineLink with __noid__; edit via editField (text-replace)
  // kind: "split"      → isSplitField with fieldRole portfolio/website; edit via editField
  //
  const currentItems = useMemo(() => {
    const items = [];
    const seenFieldIds = new Set();
    // [FIX] Deduplicate by rId — split fields all share the same contact
    // paragraph's inlineLinks, so the same rId appears once per split field.
    // Without this guard React warns about duplicate keys and links render twice.
    const seenRIds = new Set();

    for (const f of headerFields) {
      // ── hyperlink entries ──────────────────────────────────────────────────
      for (const lnk of (f.inlineLinks || [])) {
        if (!lnk.rId) continue;

        if (lnk.rId !== "__noid__" && lnk.rId !== "__plain_email__") {
          if (!seenRIds.has(lnk.rId)) {
            seenRIds.add(lnk.rId);
            // Only show portfolio / website in this panel.
            // LinkedIn, GitHub, and Email are managed via the header field editor.
            // [PLATFORM CLASSIFICATION] pass the full item so backend fieldRole/
            // label is used before URL-string heuristics.
            const plt = detectLinkPlatform({ field: f, lnk });
            const HIDDEN = new Set(["linkedin", "github", "email"]);
            if (!HIDDEN.has(plt.key)) {
              items.push({ kind: "hyperlink", field: f, lnk });
            }
          }
        } else if (
          lnk.rId === "__noid__" &&
          (f.fieldRole === "portfolio" || f.fieldRole === "website" ||
            detectLinkPlatform({ field: f, lnk }).key === "portfolio" ||
            detectLinkPlatform({ field: f, lnk }).key === "website")
        ) {
          const noidKey = `noid:${lnk.url || lnk.text || ""}`;
          if (!seenRIds.has(noidKey)) {
            seenRIds.add(noidKey);
            const idx = (f.inlineLinks || []).indexOf(lnk);
            items.push({ kind: "noid", field: f, lnk, idx });
          }
        }
      }

      // ── split-field entries (portfolio / website without inlineLinks) ──────
      if (
        f.isSplitField &&
        (f.fieldRole === "portfolio" || f.fieldRole === "website") &&
        !seenFieldIds.has(f.id)
      ) {
        // only add if not already represented by an inlineLinks entry above
        const alreadyCovered = (f.inlineLinks || []).some(
          l => l.rId && l.rId !== "__noid__" && l.rId !== "__plain_email__"
        );
        if (!alreadyCovered) {
          seenFieldIds.add(f.id);
          items.push({ kind: "split", field: f });
        }
      }
    }
    return items;
  }, [headerFields]);

  // ── Helpers: open / close edit form ──────────────────────────────────────
  const openEditFor = (item) => {
    const k    = itemKey(item);
    // [TWO-FIELD LINK API] Prefer the new explicit displayText / targetUrl
    // keys when the backend supplies them; fall back to legacy text / url.
    // Pure additive change — old payloads still work via the ?? chain.
    const url  = item.kind === "split"     ? (item.field.text || "")
               : item.kind === "noid"      ? (item.lnk.targetUrl ?? item.lnk.url ?? item.lnk.text ?? "")
               : (item.lnk.targetUrl ?? item.lnk.url ?? "");
    const name = item.kind === "split"     ? ""
               : item.kind === "noid"      ? (item.lnk.displayText ?? item.lnk.text ?? "")
               : (item.lnk.displayText ?? item.lnk.text ?? item.lnk.label ?? "");
    setEditingKey(k);
    setEditUrl(url);
    setEditName(name);
  };

  const cancelEdit = () => { setEditingKey(null); setEditUrl(""); setEditName(""); };

  // ── Save edits ────────────────────────────────────────────────────────────
  const handleEditSave = async (item) => {
    const k       = itemKey(item);
    const newUrl  = editUrl.trim();
    const newName = editName.trim();
    if (!newUrl && !newName) return;

    // Snapshot for undo
    const prevUrl  = item.kind === "split" ? (item.field.text || "") : (item.lnk?.targetUrl ?? item.lnk?.url  ?? "");
    const prevName = item.kind === "split" ? ""                      : (item.lnk?.displayText ?? item.lnk?.text ?? item.lnk?.label ?? "");
    setLinkHistory(prev => ({ ...prev, [k]: { url: prevUrl, name: prevName } }));

    setEditSubmitting(true);
    try {
      // ── kind: "hyperlink" — use editHyperlinkText ──────────────────────────
      if (item.kind === "hyperlink") {
        const lnk = item.lnk;
        let latestFields = null;

        const currentLnkUrl  = lnk.targetUrl ?? lnk.url ?? "";
        const currentLnkName = lnk.displayText ?? lnk.text ?? lnk.label ?? "";

        if (newUrl && newUrl !== currentLnkUrl) {
          let finalUrl = newUrl;
          if (currentLnkUrl.startsWith("mailto:") && finalUrl.includes("@") && !finalUrl.startsWith("mailto:"))
            finalUrl = "mailto:" + finalUrl;
          else if (!finalUrl.startsWith("http") && !finalUrl.startsWith("mailto:"))
            finalUrl = "https://" + finalUrl;

          // [TWO-FIELD LINK API] Send both new (target_url) and legacy (new_url)
          // names — backend accepts either; this stays compatible across versions.
          const d = await resumeAiService.editHyperlinkText({
            session_id: sessionId,
            para_index: item.field.paraIndex ?? -1,
            r_id: lnk.rId,
            target_url: finalUrl,
            new_url:    finalUrl,
            source: item.field.source ?? "body",
            hyperlink_index: lnk.hyperlinkIndex ?? 0,
          });
          if (d.success) latestFields = d.fields;
          else { showToast?.(d.error || "URL update failed", "error"); setEditSubmitting(false); return; }
        }

        if (newName && newName !== currentLnkName) {
          // [TWO-FIELD LINK API] Same dual-name shape for the display text.
          const d = await resumeAiService.editHyperlinkText({
            session_id: sessionId,
            para_index: item.field.paraIndex ?? -1,
            r_id: lnk.rId,
            display_text: newName,
            new_text:     newName,
            source: item.field.source ?? "body",
            hyperlink_index: lnk.hyperlinkIndex ?? 0,
          });
          if (d.success) latestFields = d.fields;
          else { showToast?.(d.error || "Name update failed", "error"); setEditSubmitting(false); return; }
        }

        if (latestFields) { onFieldsUpdated?.(latestFields); showToast?.("Link updated ✓", "success"); }
        cancelEdit();
        return;
      }

      // ── kind: "split" — use editField with old_text / new_text ────────────
      if (item.kind === "split") {
        const finalUrl = newUrl.startsWith("http") ? newUrl : newUrl ? "https://" + newUrl : item.field.text;
        const d = await resumeAiService.editField({
          session_id: sessionId,
          para_index: item.field.paraIndex ?? -1,
          source:     item.field.source ?? "body",
          old_text:   item.field.text,
          new_text:   finalUrl,
        });
        if (d.success) { onFieldsUpdated?.(d.fields); showToast?.("Updated ✓", "success"); cancelEdit(); }
        else { showToast?.(d.error || "Update failed", "error"); }
        setEditSubmitting(false);
        return;
      }

      // ── kind: "noid" — text-replace via editField ─────────────────────────
      if (item.kind === "noid") {
        const oldText  = item.field.text || "";
        const oldChunk = (item.lnk.displayText ?? item.lnk.text ?? item.lnk.targetUrl ?? item.lnk.url) || "";
        const newChunk = newUrl || oldChunk;
        const newText  = oldChunk ? oldText.replace(oldChunk, newChunk) : oldText;
        const d = await resumeAiService.editField({
          session_id: sessionId,
          para_index: item.field.paraIndex ?? -1,
          source:     item.field.source ?? "body",
          old_text:   oldText,
          new_text:   newText,
        });
        if (d.success) { onFieldsUpdated?.(d.fields); showToast?.("Updated ✓", "success"); cancelEdit(); }
        else { showToast?.(d.error || "Update failed", "error"); }
        setEditSubmitting(false);
        return;
      }
    } catch (e) {
      showToast?.("Edit failed: " + e.message, "error");
    }
    setEditSubmitting(false);
  };

  // ── Undo last edit on a specific item ─────────────────────────────────────
  const handleItemUndo = async (item) => {
    const k    = itemKey(item);
    const prev = linkHistory[k];
    if (!prev) return;
    setUndoingKey(k);
    try {
      if (item.kind === "hyperlink") {
        let latestFields = null;
        if (prev.url !== undefined) {
          // [TWO-FIELD LINK API] dual-name URL undo.
          const d = await resumeAiService.editHyperlinkText({
            session_id: sessionId,
            para_index: item.field.paraIndex ?? -1,
            r_id: item.lnk.rId,
            target_url: prev.url,
            new_url:    prev.url,
            source: item.field.source ?? "body",
            hyperlink_index: item.lnk.hyperlinkIndex ?? 0,
          });
          if (d.success) latestFields = d.fields;
        }
        if (prev.name !== undefined) {
          // [TWO-FIELD LINK API] dual-name display-text undo.
          const d = await resumeAiService.editHyperlinkText({
            session_id: sessionId,
            para_index: item.field.paraIndex ?? -1,
            r_id: item.lnk.rId,
            display_text: prev.name,
            new_text:     prev.name,
            source: item.field.source ?? "body",
            hyperlink_index: item.lnk.hyperlinkIndex ?? 0,
          });
          if (d.success) latestFields = d.fields;
        }
        if (latestFields) {
          onFieldsUpdated?.(latestFields);
          showToast?.("Undo applied ✓", "success");
          setLinkHistory(p => { const n = { ...p }; delete n[k]; return n; });
        }
      } else {
        // split / noid: restore old text via editField
        const d = await resumeAiService.editField({
          session_id: sessionId,
          para_index: item.field.paraIndex ?? -1,
          source:     item.field.source ?? "body",
          old_text:   item.field.text,
          new_text:   prev.url,
        });
        if (d.success) {
          onFieldsUpdated?.(d.fields);
          showToast?.("Undo applied ✓", "success");
          setLinkHistory(p => { const n = { ...p }; delete n[k]; return n; });
        } else showToast?.(d.error || "Undo failed", "error");
      }
    } catch (e) {
      showToast?.("Undo failed: " + e.message, "error");
    }
    setUndoingKey(null);
  };

  // ── Remove (hyperlink only — split/noid do not support remove here) ────────
  const handleRemove = async (item) => {
    if (item.kind !== "hyperlink") return;
    const { lnk } = item;
    setSubmitting(true);
    try {
      // [FIX] Use contactTarget.paraIndex (the actual DOCX contact paragraph index),
      // NOT field.paraIndex (split-field virtual index). The backend's remove-contact-link
      // validates target_segment_id the same way add-contact-link does — it must point
      // to the real paragraph, otherwise it returns 400.
      const d = await resumeAiService.removeContactLink({
        session_id:        sessionId,
        target_segment_id: contactTarget.paraIndex,
        source:            contactTarget.source,
        r_id:              lnk.rId,
      });
      if (d.success) {
        onFieldsUpdated?.(d.fields);
        showToast?.("Removed ✓", "success");
        if (editingKey === lnk.rId) cancelEdit();
      } else showToast?.(d.error || "Remove failed", "error");
    } catch (e) { showToast?.("Remove failed: " + e.message, "error"); }
    setSubmitting(false);
  };

  // ── Submit new contact link ───────────────────────────────────────────────
  const handleAdd = async () => {
    if (!urlValue.trim()) return;
    const platform = PLATFORMS.find(p => p.key === addingKey);
    if (!platform) return;

    // ── [FIX] Block duplicate adds — show toast and abort ──────────────────
    // present is derived from headerFields via detectPresent() above.
    // This catches any edge case where the button was visible but the link
    // already exists (e.g. detected mid-session after a re-render race).
    if (present.has(addingKey)) {
      showToast?.(
        `${platform.label} link already exists. Edit it in the Current Links section below.`,
        "error"
      );
      setAddingKey(null);
      setUrlValue("");
      setNameValue("");
      return;
    }
    // ───────────────────────────────────────────────────────────────────────

    let finalUrl = urlValue.trim();
    if (addingKey === "email" && !finalUrl.startsWith("mailto:") && finalUrl.includes("@"))
      finalUrl = "mailto:" + finalUrl;
    if (addingKey !== "email" && !finalUrl.startsWith("http"))
      finalUrl = "https://" + finalUrl;

    const displayText = nameValue.trim() || (addingKey === "email" ? finalUrl.replace("mailto:", "") : platform.label);

    setSubmitting(true);
    try {
      const prevRIds = new Set();
      for (const f of headerFields)
        for (const lnk of (f.inlineLinks || []))
          if (lnk.rId) prevRIds.add(lnk.rId);

      const d = await resumeAiService.addContactLink({
        session_id:        sessionId,
        target_segment_id: contactTarget.paraIndex,
        source:            contactTarget.source,
        contact_type:      addingKey,
        label:             platform.label,
        url:               finalUrl,
        display_text:      displayText,
      });
      if (d.success) {
        onFieldsUpdated?.(d.fields);
        showToast?.(`${platform.label} added ✓`, "success");

        let newRId = null;
        for (const f of (d.fields || []))
          for (const lnk of (f.inlineLinks || []))
            if (lnk.rId && !prevRIds.has(lnk.rId)) { newRId = lnk.rId; break; }

        if (newRId)
          setLastAdded({ rId: newRId, paraIndex: contactTarget.paraIndex, source: contactTarget.source, label: platform.label });

        setAddingKey(null); setUrlValue(""); setNameValue("");
      } else showToast?.(d.error || "Add failed", "error");
    } catch (e) { showToast?.("Add failed: " + e.message, "error"); }
    setSubmitting(false);
  };

  // ── Undo last-added link ──────────────────────────────────────────────────
  const handleUndo = async () => {
    if (!lastAdded) return;
    setUndoing(true);
    try {
      const d = await resumeAiService.removeContactLink({
        session_id:        sessionId,
        target_segment_id: lastAdded.paraIndex,
        source:            lastAdded.source,
        r_id:              lastAdded.rId,
      });
      if (d.success) {
        onFieldsUpdated?.(d.fields);
        showToast?.(`${lastAdded.label} removed (undo) ✓`, "success");
        setLastAdded(null);
      } else showToast?.(d.error || "Undo failed", "error");
    } catch (e) { showToast?.("Undo failed: " + e.message, "error"); }
    setUndoing(false);
  };

  // ── Shared undo-last-added banner ─────────────────────────────────────────
  const UndoBanner = () => !lastAdded ? null : (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 1.5, py: 1, mb: 1, borderRadius: 2, bgcolor: "#f0fdf4", border: "1.5px solid #bbf7d0", animation: "fadeUp .15s ease" }}>
      <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "#22c55e", flexShrink: 0, boxShadow: "0 0 6px #22c55e80" }} />
      <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: "#15803d", flex: 1, fontFamily: "'Jost',sans-serif" }}>
        {lastAdded.label} added
      </Typography>
      <Box component="button" onClick={handleUndo} disabled={undoing}
        sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, px: 1.25, py: 0.375, borderRadius: 99, border: "1px solid rgba(29,90,80,.35)", bgcolor: "rgba(29,90,80,.08)", color: "#1D5A50", cursor: undoing ? "not-allowed" : "pointer", fontSize: 11, fontWeight: 700, fontFamily: "'Jost',sans-serif", opacity: undoing ? 0.6 : 1, "&:hover": { bgcolor: "rgba(29,90,80,.18)" }, transition: "all .15s" }}>
        {undoing ? <SpinnerEl size={9} color="#1D5A50" /> : <RotateCcw size={10} />}
        {undoing ? "Undoing…" : "Undo"}
      </Box>
      <Box component="button" onClick={() => setLastAdded(null)}
        sx={{ border: "none", bgcolor: "transparent", cursor: "pointer", color: "#7A8073", display: "flex", p: 0.25, "&:hover": { color: "#3A3D37" } }}>
        <X size={12} />
      </Box>
    </Box>
  );

  // ── Collapsed ─────────────────────────────────────────────────────────────
  if (!expanded) return (
    <Box sx={{ mt: 2, mb: 1 }}>
      <UndoBanner />
      <Box component="button" onClick={() => setExpanded(true)}
        sx={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 1, py: 1.25, px: 2, borderRadius: 2.5, border: "1.5px dashed #D6E4E0", bgcolor: "#FAFCFB", cursor: "pointer", transition: "all .15s", "&:hover": { borderColor: "#6FA095", bgcolor: "#F1F6F4", borderStyle: "solid" } }}>
        <Plus size={14} color="#1D5A50" />
        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: "#1D5A50", fontFamily: "'Jost',sans-serif" }}>Add Contact Info</Typography>
        {missing.length > 0 && (
          <Typography sx={{ fontSize: 10, color: "#6FA095", fontWeight: 500 }}>({missing.length} available)</Typography>
        )}
      </Box>
    </Box>
  );

  // ── Expanded ──────────────────────────────────────────────────────────────
  return (
    <Box sx={{ mt: 2, mb: 1, p: 2, borderRadius: 3, border: "1.5px solid #E7EFEC", bgcolor: "#FAFCFB", animation: "fadeUp .18s ease" }}>

      {/* Header row */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box sx={{ width: 28, height: 28, borderRadius: 1.5, background: "linear-gradient(135deg,#1D5A50,#2E6E62)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Plus size={14} color="#fff" />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#3A3D37" }}>Add-Links</Typography>
            <Typography sx={{ fontSize: 10, color: "#7A8073" }}>Add missing links to your header</Typography>
          </Box>
        </Stack>
        <Box component="button" onClick={() => { setExpanded(false); setAddingKey(null); cancelEdit(); }}
          sx={{ width: 24, height: 24, borderRadius: "50%", border: "none", bgcolor: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#7A8073", "&:hover": { bgcolor: "#F0F2ED", color: "#3A3D37" } }}>
          <X size={13} />
        </Box>
      </Stack>

      {/* Undo last-added banner */}
      {lastAdded && !addingKey && <UndoBanner />}

      {/* Platform add buttons */}
      {missing.length > 0 && !addingKey && (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mb: 1.5 }}>
          {missing.map(p => {
            const Icon = p.icon;
            return (
              <Box key={p.key} component="button"
                onClick={() => { setAddingKey(p.key); setUrlValue(""); setNameValue(""); setLastAdded(null); }}
                disabled={submitting}
                sx={{ display: "inline-flex", alignItems: "center", gap: 0.75, px: 1.5, py: 0.75, borderRadius: 99, border: "1.5px solid #E7EAE3", bgcolor: "#fff", cursor: submitting ? "not-allowed" : "pointer", fontSize: 11.5, fontWeight: 600, color: "#3A3D37", fontFamily: "'Jost',sans-serif", transition: "all .12s", "&:hover": { borderColor: p.color, bgcolor: `${p.color}08`, color: p.color } }}>
                <Icon size={12} color={p.color} /> {p.label}
              </Box>
            );
          })}
        </Box>
      )}

      {missing.length === 0 && !addingKey && (
        <Typography sx={{ fontSize: 11, color: "#7A8073", textAlign: "center", py: 1 }}>
          All common platforms are already added
        </Typography>
      )}

      {/* ── Add form ── */}
      {addingKey && (() => {
        const platform = PLATFORMS.find(p => p.key === addingKey);
        if (!platform) return null;
        const Icon = platform.icon;
        return (
          <Box sx={{ p: 1.5, border: `1.5px solid ${platform.color}30`, borderRadius: 2, bgcolor: `${platform.color}04`, animation: "fadeUp .15s ease" }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.25 }}>
              <Box sx={{ width: 24, height: 24, borderRadius: 1, bgcolor: platform.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon color="#fff" size={12} />
              </Box>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#3A3D37", flex: 1 }}>Add {platform.label}</Typography>
              <Box component="button" onClick={() => setAddingKey(null)}
                sx={{ border: "none", bgcolor: "transparent", cursor: "pointer", color: "#7A8073", fontSize: 10, fontFamily: "'Jost',sans-serif", "&:hover": { color: "#3A3D37" } }}>
                Cancel
              </Box>
            </Stack>

            <Box sx={{ mb: 0.75 }}>
              <Typography sx={{ fontSize: 10, color: "#55584F", fontWeight: 600, mb: 0.375 }}>
                {addingKey === "email" ? "Email address" : "URL"}
              </Typography>
              <Box sx={{ position: "relative" }}>
                <Box sx={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#7A8073", pointerEvents: "none", display: "flex" }}>
                  <Link size={12} />
                </Box>
                <input autoFocus value={urlValue} onChange={e => setUrlValue(e.target.value)}
                  placeholder={platform.placeholder}
                  onKeyDown={e => { if (e.key === "Enter" && !submitting) handleAdd(); if (e.key === "Escape") setAddingKey(null); }}
                  style={{ width: "100%", padding: "8px 12px 8px 32px", borderRadius: 8, border: `1.5px solid ${platform.color}35`, fontFamily: "'Jost',sans-serif", fontSize: 12.5, color: "#1B1E1A", outline: "none", boxSizing: "border-box", background: "#fff" }} />
              </Box>
            </Box>

            <Box sx={{ mb: 1.25 }}>
              <Typography sx={{ fontSize: 10, color: "#55584F", fontWeight: 600, mb: 0.375 }}>
                Display text <span style={{ fontWeight: 400, color: "#A9AEA2" }}>(optional — defaults to "{platform.label}")</span>
              </Typography>
              <input value={nameValue} onChange={e => setNameValue(e.target.value)} placeholder={platform.label}
                onKeyDown={e => { if (e.key === "Enter" && !submitting) handleAdd(); if (e.key === "Escape") setAddingKey(null); }}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1.5px solid #E7EAE3", fontFamily: "'Jost',sans-serif", fontSize: 12.5, color: "#1B1E1A", outline: "none", boxSizing: "border-box", background: "#fff" }} />
            </Box>

            <Stack direction="row" justifyContent="flex-end">
              <Box component="button" onClick={handleAdd} disabled={submitting || !urlValue.trim()}
                sx={{ display: "inline-flex", alignItems: "center", gap: 0.75, px: 2, py: 0.75, borderRadius: 1.5, border: "none", bgcolor: (submitting || !urlValue.trim()) ? "#D8DDD4" : platform.color, color: "#fff", fontSize: 12, fontWeight: 700, cursor: (submitting || !urlValue.trim()) ? "not-allowed" : "pointer", fontFamily: "'Jost',sans-serif", boxShadow: (submitting || !urlValue.trim()) ? "none" : `0 2px 10px ${platform.color}40`, opacity: (submitting || !urlValue.trim()) ? 0.6 : 1, "&:hover": { opacity: (submitting || !urlValue.trim()) ? 0.6 : 0.85 } }}>
                {submitting ? <><SpinnerEl size={10} color="#fff" /> Adding…</> : <><Plus size={12} /> Add {platform.label}</>}
              </Box>
            </Stack>
          </Box>
        );
      })()}

      {/* ── Current links — all three kinds ── */}
      {currentItems.length > 0 && !addingKey && (
        <Box sx={{ mt: 1.5, pt: 1.25, borderTop: "1px solid #E7EFEC" }}>
          <Typography sx={{ fontSize: 9.5, fontWeight: 700, color: "#7A8073", textTransform: "uppercase", letterSpacing: ".07em", mb: 0.75 }}>
            Current links
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
            {currentItems.map(item => {
              const k = itemKey(item);

              // ── Derive display values per kind ──────────────────────────────
              // [TWO-FIELD LINK API] Prefer displayText / targetUrl when present,
              // fall back to the legacy text / url. No behaviour change when the
              // backend still sends only the legacy keys.
              const displayUrl  = item.kind === "split" ? (item.field.text  || "")
                                : item.kind === "noid"  ? (item.lnk.targetUrl ?? item.lnk.url ?? item.lnk.text ?? "")
                                : (item.lnk.targetUrl ?? item.lnk.url ?? "");
              const displayName = item.kind === "split" ? (
                                    item.field.fieldRole === "portfolio" ? "Portfolio"
                                    : item.field.fieldRole === "website" ? "Website" : "Link"
                                  )
                                : item.kind === "noid"  ? (item.lnk.displayText ?? item.lnk.text ?? item.lnk.label ?? "Link")
                                : (item.lnk.displayText ?? item.lnk.text ?? item.lnk.label ?? "Link");

              // [PLATFORM CLASSIFICATION] Pass the full item so the backend's
              // fieldRole / label drives the icon, not URL string matching.
              const platform  = detectLinkPlatform(item);
              const Icon      = platform.icon;
              const dotColor  = platform.color;

              const isEditing  = editingKey === k;
              const hasHistory = !!linkHistory[k];
              const isUndoing  = undoingKey === k;
              const canRemove  = item.kind === "hyperlink";
              const isBusy     = submitting || editSubmitting || !!undoingKey;

              return (
                <Box key={k} sx={{ border: isEditing ? `1.5px solid ${dotColor}50` : "1px solid #E7EAE3", borderRadius: 1.75, bgcolor: isEditing ? `${dotColor}04` : "#F8FAF6", overflow: "hidden", transition: "border-color .15s, background .15s" }}>

                  {/* ── Item row ── */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 1.25, py: 0.875 }}>
                    <Box sx={{ width: 20, height: 20, borderRadius: 0.75, bgcolor: dotColor, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon color="#fff" size={10} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                      <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: "#3A3D37", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {displayName}
                      </Typography>
                      <Typography sx={{ fontSize: 9.5, color: "#7A8073", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {displayUrl.replace("mailto:", "")}
                      </Typography>
                    </Box>

                    {/* Action buttons */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0 }}>
                      {/* Undo (visible only after at least one edit on this item) */}
                      {hasHistory && !isEditing && (
                        <Box component="button" onClick={() => handleItemUndo(item)} disabled={isBusy} title="Undo last edit"
                          sx={{ width: 24, height: 24, borderRadius: 1, border: "1px solid rgba(29,90,80,0.3)", bgcolor: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: isBusy ? "not-allowed" : "pointer", color: "#1D5A50", "&:hover": { bgcolor: "rgba(29,90,80,0.07)" }, transition: "all .12s" }}>
                          {isUndoing ? <SpinnerEl size={9} color="#1D5A50" /> : <RotateCcw size={10} />}
                        </Box>
                      )}

                      {/* Edit toggle */}
                      <Box component="button" onClick={() => isEditing ? cancelEdit() : openEditFor(item)} disabled={isBusy && !isEditing} title={isEditing ? "Cancel edit" : "Edit"}
                        sx={{ width: 24, height: 24, borderRadius: 1, border: isEditing ? `1px solid ${dotColor}60` : "1px solid rgba(94,129,93,0.25)", bgcolor: isEditing ? `${dotColor}12` : "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: isEditing ? dotColor : "#5E815D", "&:hover": { bgcolor: isEditing ? `${dotColor}20` : "#EDF3EC" }, transition: "all .12s" }}>
                        {isEditing ? <X size={10} /> : <Edit2 size={10} />}
                      </Box>

                      {/* Remove — hyperlink only */}
                      {canRemove && (
                        <Box component="button" onClick={() => handleRemove(item)} disabled={isBusy} title="Remove"
                          sx={{ width: 24, height: 24, borderRadius: 1, border: "1px solid rgba(220,38,38,0.2)", bgcolor: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: isBusy ? "not-allowed" : "pointer", color: "#ef4444", "&:hover": { bgcolor: "rgba(220,38,38,0.06)" }, transition: "all .12s" }}>
                          <X size={10} />
                        </Box>
                      )}
                    </Box>
                  </Box>

                  {/* ── Inline edit form ── */}
                  {isEditing && (
                    <Box sx={{ px: 1.25, pb: 1.25, pt: 0.25, borderTop: `1px solid ${dotColor}20`, animation: "fadeUp .15s ease" }}>

                      {/* Name — not shown for split fields (URL is the full text) */}
                      {item.kind !== "split" && (
                        <Box sx={{ mb: 0.75 }}>
                          <Typography sx={{ fontSize: 9.5, color: "#55584F", fontWeight: 600, mb: 0.3 }}>Display name</Typography>
                          <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Display text…"
                            onKeyDown={e => { if (e.key === "Enter" && !editSubmitting) handleEditSave(item); if (e.key === "Escape") cancelEdit(); }}
                            style={{ width: "100%", padding: "6px 10px", borderRadius: 7, border: `1.5px solid ${dotColor}40`, fontFamily: "'Jost',sans-serif", fontSize: 12, color: "#1B1E1A", outline: "none", boxSizing: "border-box", background: "#fff" }} />
                        </Box>
                      )}

                      {/* URL */}
                      <Box sx={{ mb: 0.875 }}>
                        <Typography sx={{ fontSize: 9.5, color: "#55584F", fontWeight: 600, mb: 0.3 }}>
                          {item.kind === "split" ? "URL / Link" : "URL"}
                        </Typography>
                        <Box sx={{ position: "relative" }}>
                          <Box sx={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "#7A8073", pointerEvents: "none", display: "flex" }}>
                            <Link size={11} />
                          </Box>
                          <input value={editUrl} onChange={e => setEditUrl(e.target.value)} placeholder="https://…"
                            autoFocus
                            onKeyDown={e => { if (e.key === "Enter" && !editSubmitting) handleEditSave(item); if (e.key === "Escape") cancelEdit(); }}
                            style={{ width: "100%", padding: "6px 10px 6px 28px", borderRadius: 7, border: `1.5px solid ${dotColor}40`, fontFamily: "'Jost',sans-serif", fontSize: 12, color: "#1B1E1A", outline: "none", boxSizing: "border-box", background: "#fff" }} />
                        </Box>
                      </Box>

                      <Stack direction="row" justifyContent="flex-end" spacing={0.75}>
                        <Box component="button" onClick={cancelEdit}
                          sx={{ px: 1.5, py: 0.5, borderRadius: 1.25, border: "1px solid #E7EAE3", bgcolor: "#fff", color: "#55584F", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'Jost',sans-serif", "&:hover": { bgcolor: "#F0F2ED" } }}>
                          Cancel
                        </Box>
                        <Box component="button" onClick={() => handleEditSave(item)} disabled={editSubmitting}
                          sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, px: 1.75, py: 0.5, borderRadius: 1.25, border: "none", bgcolor: editSubmitting ? "#D8DDD4" : dotColor, color: "#fff", fontSize: 11, fontWeight: 700, cursor: editSubmitting ? "not-allowed" : "pointer", fontFamily: "'Jost',sans-serif", opacity: editSubmitting ? 0.6 : 1, boxShadow: editSubmitting ? "none" : `0 2px 8px ${dotColor}40`, "&:hover": { opacity: editSubmitting ? 0.6 : 0.85 } }}>
                          {editSubmitting ? <><SpinnerEl size={9} color="#fff" /> Saving…</> : <><Check size={11} /> Save</>}
                        </Box>
                      </Stack>
                    </Box>
                  )}
                </Box>
              );
            })}
          </Box>
        </Box>
      )}
    </Box>
  );
}

export default AddContactPanel;