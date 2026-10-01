// ============================================================================
// AddLineForm.jsx — Form for inserting a new paragraph below an existing field.
// Location: src/components/jobseeker/Workspace/AIResumeBuilder/AddLineForm.jsx
// ============================================================================

import React, { useState } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { Plus } from "lucide-react";
import { SpinnerEl, RippleBtn } from "./atoms";
import { BULLET_OPTIONS } from "@/constants/resumeAiConstants";
import InlineEditor from "./InlineEditor";



function AddLineForm({ field, onAdd, onCancel, adding, sectionFields = [] }) {
  const sn = field.text.slice(0, 32) + (field.text.length > 32 ? "…" : "");
  const TEXT_BULLET_RE = /^(–\s|•\s|▪\s|›\s|→\s)/;
  const hasTextBullets = [field, ...sectionFields].some(f => TEXT_BULLET_RE.test(f.text || ""));
  const [bullet, setBullet] = useState(() => {
    if (!hasTextBullets) return "";
    const sources = [field, ...sectionFields];
    for (const f of sources) {
      const t = f.text || "";
      if (t.startsWith("– ")) return "– ";
      if (t.startsWith("• ")) return "• ";
      if (t.startsWith("▪ ")) return "▪ ";
      if (t.startsWith("› ")) return "› ";
      if (t.startsWith("→ ")) return "→ ";
    }
    return "";
  });
  const stub = { text: "", isBold: false };
  const handleApply = (segs) => {
    if (!bullet) { onAdd(field, { segments: segs, inherit_list_format: true }); return; }
    const first = segs[0] || {};
    const bulletSeg = { text: bullet, bold: false, italic: false, underline: false, strike: false, color: "", fontFamily: first.fontFamily || "", fontSize: first.fontSize || "" };
    onAdd(field, { segments: [bulletSeg, ...segs], inherit_list_format: false });
  };
  return (
    <Box sx={{ p: 1.25, bgcolor: "#fff", borderRadius: 2, border: "1px solid rgba(94,129,93,0.25)", mb: 0.5, boxShadow: "0 4px 20px rgba(94,129,93,0.06)", animation: "expandIn .3s ease" }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.25 }}>
        <Box sx={{ px: 1, py: 0.25, borderRadius: 99, bgcolor: "rgba(94,129,93,0.08)", border: "1px solid rgba(94,129,93,0.25)", fontSize: 9, fontWeight: 700, color: "#5E815D" }}>+ NEW LINE</Box>
        <Typography sx={{ fontSize: 10.5, color: "text.disabled", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>after: {sn}</Typography>
      </Stack>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1.25, p: "7px 10px", bgcolor: "#F6F8F3", borderRadius: 1, border: "1px solid #E7EAE3", flexWrap: "wrap" }}>
        <Typography sx={{ fontSize: 10, fontWeight: 700, color: "text.secondary", flexShrink: 0 }}>Bullet:</Typography>
        {BULLET_OPTIONS.map(opt => (
          <button key={opt.label} onClick={() => setBullet(opt.value)}
            style={{ padding: "3px 10px", borderRadius: 99, border: `1px solid ${bullet === opt.value ? "#5E815D" : "#E7EAE3"}`, background: bullet === opt.value ? "rgba(94,129,93,0.08)" : "transparent", color: bullet === opt.value ? "#5E815D" : "#55584F", fontSize: 13, cursor: "pointer", fontWeight: 600, transition: "all .12s", lineHeight: 1.2, minWidth: 32, textAlign: "center" }}>
            {opt.label}
          </button>
        ))}
      </Box>
      <InlineEditor field={stub} sc="#5E815D" saving={adding} onApply={handleApply} onCancel={onCancel} onDelete={onCancel} autoFocus={true} />
    </Box>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   FIELD ROW
══════════════════════════════════════════════════════════════════════ */
export default AddLineForm;