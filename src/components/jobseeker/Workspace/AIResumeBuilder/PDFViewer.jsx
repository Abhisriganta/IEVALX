// ============================================================================
// PDFViewer.jsx — PDF rendering pipeline:
//   findTextBoxes  — text-level highlight coordinate finder
//   PDFPage        — single page canvas + hover zones + link overlays
//   PDFViewer      — multi-page viewer with IntersectionObserver page tracking
// Location: src/components/jobseeker/Workspace/AIResumeBuilder/PDFViewer.jsx
//
// [POSITION] Removed freehand photo drag/resize. Photo positioning is now
// handled exclusively by the placeholder selector in PhotoEditorModal.
// ============================================================================

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { FileText } from "lucide-react";
import { SpinnerEl } from "./atoms";

async function findTextBoxes(page, viewport, needle) {
  if (!needle?.trim()) return [];
  try {
    const tc = await page.getTextContent();
    const items = tc.items.filter(i => i.str);
    if (!items.length) return [];

    const SEP = "\x00";
    let full = "";
    const itemFullStart = [];
    items.forEach((item, idx) => {
      itemFullStart.push(full.length);
      full += item.str;
      if (idx < items.length - 1) full += SEP;
    });

    const fullCharToItem = new Int32Array(full.length).fill(-1);
    items.forEach((item, idx) => {
      const s = itemFullStart[idx];
      for (let c = 0; c < item.str.length; c++) fullCharToItem[s + c] = idx;
    });

    let fullClean = "";
    const cleanToFull = [];
    for (let fi = 0; fi < full.length; fi++) {
      if (full[fi] !== SEP) { cleanToFull.push(fi); fullClean += full[fi]; }
    }

    const fullToClean = new Int32Array(full.length).fill(-1);
    cleanToFull.forEach((fi, ci) => { fullToClean[fi] = ci; });

    const itemCleanStart = new Int32Array(items.length).fill(-1);
    items.forEach((item, idx) => {
      const fi = itemFullStart[idx];
      if (fi < full.length) itemCleanStart[idx] = fullToClean[fi];
    });

    const needleTrim = needle.trim();
    let cleanPos = fullClean.indexOf(needleTrim);
    if (cleanPos === -1) cleanPos = fullClean.toLowerCase().indexOf(needleTrim.toLowerCase());
    if (cleanPos === -1 && needleTrim.length > 25) {
      cleanPos = fullClean.toLowerCase().indexOf(needleTrim.slice(0, 50).toLowerCase());
    }
    if (cleanPos === -1) return [];

    const matchEnd = cleanPos + Math.min(needleTrim.length, fullClean.length - cleanPos);

    const itemMatchRange = new Map();
    for (let ci = cleanPos; ci < matchEnd; ci++) {
      const fi = cleanToFull[ci];
      if (fi == null) continue;
      const iIdx = fullCharToItem[fi];
      if (iIdx < 0) continue;
      const offset = ci - itemCleanStart[iIdx];
      if (!itemMatchRange.has(iIdx)) {
        itemMatchRange.set(iIdx, { first: offset, last: offset });
      } else {
        itemMatchRange.get(iIdx).last = offset;
      }
    }
    if (!itemMatchRange.size) return [];

    const rawBoxes = [];
    itemMatchRange.forEach(({ first, last }, idx) => {
      const item = items[idx];
      if (!item.transform) return;
      try {
        const [vx, vy] = viewport.convertToViewportPoint(item.transform[4], item.transform[5]);
        const totalW  = Math.abs(item.width  || 0) * viewport.scale;
        const rawH    = Math.abs(item.height || item.transform[3] || 12);
        const h       = rawH * viewport.scale;
        if (totalW <= 0 || h <= 0) return;
        const totalChars = item.str.length;
        const xLeft  = vx + (first / totalChars) * totalW;
        const xRight = vx + ((last + 1) / totalChars) * totalW;
        const matchW = xRight - xLeft;
        if (matchW <= 0) return;
        const padTop  = h * 0.12;
        const padBot  = -(h * 0.12);
        const padSide = 2;
        const boxTop  = vy - h - padTop;
        const boxBot  = vy + padBot;
        const boxH    = boxBot - boxTop;
        const left   = Math.max(0,       (xLeft  - padSide) / viewport.width  * 100);
        const top    = Math.max(0,       boxTop              / viewport.height * 100);
        const width  = Math.min(100 - left, (matchW + padSide * 2) / viewport.width  * 100);
        const height = Math.min(100 - top,  boxH              / viewport.height * 100);
        if (width > 0.1 && height > 0.1) rawBoxes.push({ left, top, width, height, h, vy });
      } catch {}
    });

    if (!rawBoxes.length) return [];

    const avgH = rawBoxes.reduce((s, b) => s + b.h, 0) / rawBoxes.length;
    const LINE_THRESH = avgH * 0.30;
    rawBoxes.sort((a, b) => a.vy - b.vy || a.left - b.left);
    const lines = [];
    rawBoxes.forEach(box => {
      const last = lines[lines.length - 1];
      if (last && Math.abs(box.vy - last._vy) < LINE_THRESH) {
        const right    = Math.max(last.left + last.width, box.left + box.width);
        last.left      = Math.min(last.left, box.left);
        last.top       = Math.min(last.top,  box.top);
        last.width     = right - last.left;
        last.height    = Math.max(last.height, box.height);
        last._vy       = (last._vy + box.vy) / 2;
      } else {
        lines.push({ left: box.left, top: box.top, width: box.width, height: box.height, _vy: box.vy });
      }
    });

    return lines.map(({ left, top, width, height }) => ({ left, top, width, height }));
  } catch (e) {
    console.warn("[findTextBoxes]", e);
    return [];
  }
}

// ── Infer href directly from a PDF text item's string content ───────────
function inferHrefFromText(str) {
  const s = str.trim();
  if (!s || s.length < 4) return null;
  if (/^[+\d\s()\-]{7,}$/.test(s)) return null;
  if (/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(s)) return `mailto:${s}`;
  if (/^https?:\/\//i.test(s)) return s;
  if (/^linkedin\.com\//i.test(s)) return `https://www.${s}`;
  if (/^github\.com\//i.test(s)) return `https://${s}`;
  if (/^www\.[^\s]+\.[a-z]{2,}/i.test(s)) return `https://${s}`;
  return null;
}


function PDFPage({ page, viewport, annotations, highlightText, scrollContainerRef, fields, onFieldClick, sessionId, onPhotoAdjusted, isFirstPage }) {
  const canvasRef  = useRef(null);
  const renderTask = useRef(null);
  const boxRef     = useRef(null);
  const [hlBoxes,            setHlBoxes]            = useState([]);
  const [textLines,          setTextLines]           = useState([]);
  const [hoveredIdx,         setHoveredIdx]          = useState(null);
  const [linkItemZones,      setLinkItemZones]       = useState([]);
  // ── [PROJECT LINK] Icon overlays beside linked project titles ────────
  const [projectLinkOverlays, setProjectLinkOverlays] = useState([]);

  // ── Render canvas ─────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (renderTask.current) { renderTask.current.cancel(); renderTask.current = null; }
    canvas.width  = viewport.width;
    canvas.height = viewport.height;
    renderTask.current = page.render({ canvasContext: canvas.getContext("2d"), viewport });
    renderTask.current.promise.catch(() => {});
    return () => { if (renderTask.current) renderTask.current.cancel(); };
  }, [page, viewport]);

  // ── Extract text lines for hover overlay ──────────────────
  useEffect(() => {
    let active = true;
    page.getTextContent().then(tc => {
      if (!active) return;
      const groups = [];
      tc.items.forEach(item => {
        if (!item.str?.trim()) return;
        const [vx, vy] = viewport.convertToViewportPoint(item.transform[4], item.transform[5]);
        const wPx = item.width  * Math.abs(viewport.transform[0]);
        const hPx = Math.max(item.height * Math.abs(viewport.transform[3]), 10);
        const existing = groups.find(g => Math.abs(g.vy - vy) < 7);
        if (existing) {
          existing.items.push({ vx, vy, wPx, hPx, str: item.str });
          existing.x1 = Math.min(existing.x1, vx);
          existing.x2 = Math.max(existing.x2, vx + wPx);
          existing.vy = (existing.vy + vy) / 2;
          existing.hPx = Math.max(existing.hPx, hPx);
        } else {
          groups.push({ vy, x1: vx, x2: vx + wPx, hPx, items: [{ vx, vy, wPx, hPx, str: item.str }] });
        }
      });
      const lines = groups.map(g => {
        const text = g.items.sort((a, b) => a.vx - b.vx).map(i => i.str).join(" ").trim();
        const padX = 1;
        const padY = 0.5;
        return {
          left:   Math.max(0, (g.x1 - padX) / viewport.width  * 100),
          top:    Math.max(0, (g.vy - g.hPx * 1.05 - padY) / viewport.height * 100),
          width:  Math.min(100, (g.x2 - g.x1 + padX * 2) / viewport.width  * 100),
          height: Math.min(8,   (g.hPx * 1.1 + padY) / viewport.height * 100),
          text,
        };
      });
      setTextLines(lines);
    });
    return () => { active = false; };
  }, [page, viewport]);

  // ── Active-edit highlight ─────────────────────────────────────
  useEffect(() => {
    if (!highlightText?.trim()) { setHlBoxes([]); return; }
    let active = true;
    findTextBoxes(page, viewport, highlightText).then(boxes => {
      if (!active) return;
      setHlBoxes(boxes);
      if (boxes.length > 0 && scrollContainerRef?.current && boxRef.current) {
        const container = scrollContainerRef.current;
        const pageEl    = boxRef.current;
        const hlY = pageEl.offsetTop + (boxes[0].top / 100) * pageEl.offsetHeight;
        const containerHeight = container.clientHeight;
        container.scrollTo({ top: Math.max(0, hlY - containerHeight / 2), behavior: "smooth" });
      }
    });
    return () => { active = false; };
  }, [highlightText, page, viewport]);

  // ── Match a line's text to the closest field ──────────────────
  const matchField = useCallback((lineText) => {
    if (!fields?.length || !lineText) return null;
    const norm = t => t.toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim();
    const nl = norm(lineText);
    let best = null, bestScore = 0;
    for (const f of fields) {
      if (!f.text?.trim()) continue;
      const nf = norm(f.text);
      let score = 0;
      if (nf.includes(nl)) score = nl.length / nf.length;
      else if (nl.includes(nf)) score = nf.length / nl.length;
      else {
        const lw = new Set(nl.split(" ")); const fw = nf.split(" ");
        const overlap = fw.filter(w => w.length > 2 && lw.has(w)).length;
        score = overlap / Math.max(lw.size, fw.length);
      }
      if (score > bestScore && score > 0.35) { bestScore = score; best = f; }
    }
    return best;
  }, [fields]);

  const hoveredField = hoveredIdx !== null ? matchField(textLines[hoveredIdx]?.text) : null;

  // ── Link annotation processing ────────────────────────────────
  const pageWidthPt = viewport.width / viewport.scale;

  const linkAnnViewportRects = useMemo(() => {
    const filtered = annotations
      .filter(a => {
        if (a.subtype !== "Link") return false;
        const href = a.url || a.action?.url || "";
        if (!href) return false;
        const annWidthPt = Math.abs(a.rect[2] - a.rect[0]);
        if (annWidthPt > pageWidthPt * 0.22) return false;
        return true;
      })
      .sort((a, b) => {
        const areaA = Math.abs(a.rect[2] - a.rect[0]) * Math.abs(a.rect[3] - a.rect[1]);
        const areaB = Math.abs(b.rect[2] - b.rect[0]) * Math.abs(b.rect[3] - b.rect[1]);
        return areaA - areaB;
      });

    return filtered.map(ann => {
      const [sx, , , sy, tx, ty] = viewport.transform;
      const px1 = ann.rect[0] * sx + tx; const px2 = ann.rect[2] * sx + tx;
      const py1 = ann.rect[1] * sy + ty; const py2 = ann.rect[3] * sy + ty;
      return {
        href:   ann.url || ann.action?.url || "",
        left:   Math.min(px1, px2) / viewport.width  * 100,
        top:    Math.min(py1, py2) / viewport.height * 100,
        right:  Math.max(px1, px2) / viewport.width  * 100,
        bottom: Math.max(py1, py2) / viewport.height * 100,
      };
    });
  }, [annotations, viewport, pageWidthPt]);

  // ── Per-item link zones ───────────────────────────────────────
  useEffect(() => {
    let active = true;
    page.getTextContent().then(tc => {
      if (!active) return;
      const zones = [];
      tc.items.forEach(item => {
        if (!item.str?.trim()) return;
        try {
          const [vx, vy] = viewport.convertToViewportPoint(item.transform[4], item.transform[5]);
          const wPx = item.width  * Math.abs(viewport.transform[0]);
          const hPx = Math.max(item.height * Math.abs(viewport.transform[3]), 10);
          const left   = Math.max(0,         (vx - 1)               / viewport.width  * 100);
          const top    = Math.max(0,         (vy - hPx * 1.05 - 0.5) / viewport.height * 100);
          const width  = Math.min(100 - left, (wPx + 2)             / viewport.width  * 100);
          const height = Math.min(8,          (hPx * 1.1 + 0.5)     / viewport.height * 100);
          const itemRight  = left + width;
          const itemBottom = top  + height;

          let matched = false;
          for (const ann of linkAnnViewportRects) {
            const overlapX = left < ann.right  + 1 && itemRight  > ann.left   - 1;
            const overlapY = top  < ann.bottom + 1 && itemBottom > ann.top    - 1;
            if (overlapX && overlapY) {
              zones.push({ left, top, width, height, href: ann.href });
              matched = true;
              break;
            }
          }

          if (!matched) {
            const inferredHref = inferHrefFromText(item.str);
            if (inferredHref) {
              zones.push({ left, top, width, height, href: inferredHref });
            }
          }
        } catch {}
      });
      if (active) setLinkItemZones(zones);
    });
    return () => { active = false; };
  }, [page, viewport, linkAnnViewportRects]);

  // ── [PROJECT LINK] Compute link icon positions ───────────────────
  useEffect(() => {
    if (!textLines.length || !fields?.length) { setProjectLinkOverlays([]); return; }

    const _LINKABLE_SECTION_KEYS = new Set([
      "projects", "internship", "internships", "experience", "work_experience",
    ]);
    const projectTitleFields = fields.filter(f =>
      _LINKABLE_SECTION_KEYS.has(f.section?.key) &&
      !f.isHeader &&
      (
        f.isBold ||
        (typeof f.format === "string" && f.format.toLowerCase().includes("bold")) ||
        f.hasHyperlink ||
        (f.inlineLinks?.length > 0)
      ) &&
      (f.hasHyperlink || f.inlineLinks?.length > 0)
    );

    if (!projectTitleFields.length) { setProjectLinkOverlays([]); return; }

    const norm = t => t.toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim();
    const newOverlays = [];

    projectTitleFields.forEach(field => {
      let url = field.inlineLinks?.[0]?.url || null;
      const nf = norm(field.text || "");
      if (!nf || nf.length < 3) return;
      const fieldWords = nf.split(" ").filter(w => w.length > 2);
      if (!fieldWords.length) return;

      let bestLine = null, bestScore = 0;
      textLines.forEach(line => {
        if (!line.text) return;
        const nl = norm(line.text);
        const lineWordSet = new Set(nl.split(" "));
        const overlap = fieldWords.filter(w => lineWordSet.has(w)).length;
        const hasFirst = lineWordSet.has(fieldWords[0]);
        const score = (overlap / Math.max(fieldWords.length, 1)) + (hasFirst ? 0.2 : 0);
        if (score > bestScore && score > 0.38) { bestScore = score; bestLine = line; }
      });

      if (!bestLine) return;

      if (!url && linkItemZones.length) {
        for (const zone of linkItemZones) {
          const zoneCX = zone.left + zone.width  / 2;
          const zoneCY = zone.top  + zone.height / 2;
          const inX = zoneCX >= bestLine.left && zoneCX <= bestLine.left + bestLine.width;
          const inY = zoneCY >= bestLine.top  && zoneCY <= bestLine.top  + bestLine.height;
          if (inX && inY && zone.href && !zone.href.startsWith("mailto:")) {
            url = zone.href;
            break;
          }
        }
      }

      const lineMidY = bestLine.top + bestLine.height / 2;
      const alreadyCoveredByAnnotation = linkItemZones.some(zone => {
        const zoneCY = zone.top + zone.height / 2;
        const onSameLine = Math.abs(zoneCY - lineMidY) < bestLine.height * 1.5;
        const zoneRight = zone.left  + zone.width;
        const lineRight = bestLine.left + bestLine.width;
        const hOverlap  = zone.left < lineRight + 3 && zoneRight > bestLine.left - 3;
        return onSameLine && hOverlap && zone.href && !zone.href.startsWith("mailto:");
      });
      if (alreadyCoveredByAnnotation) return;

      const iconH = bestLine.height;
      const iconW = iconH * (viewport.height / viewport.width);

      newOverlays.push({
        left:   Math.min(97, bestLine.left + bestLine.width + 0.5),
        top:    bestLine.top,
        width:  iconW,
        height: iconH,
        url:    url || null,
        field,
      });
    });

    setProjectLinkOverlays(newOverlays);
  }, [textLines, linkItemZones, fields, viewport]);

  // ── Annotation overlay <a> tags ─────────────────────────────────
  const sortedLinkAnns = useMemo(() =>
    annotations
      .filter(a => {
        if (a.subtype !== "Link") return false;
        const href = a.url || a.action?.url || "";
        if (!href) return false;
        const annWidthPt = Math.abs(a.rect[2] - a.rect[0]);
        if (annWidthPt > pageWidthPt * 0.22) return false;
        return true;
      })
      .sort((a, b) => {
        const areaA = Math.abs(a.rect[2] - a.rect[0]) * Math.abs(a.rect[3] - a.rect[1]);
        const areaB = Math.abs(b.rect[2] - b.rect[0]) * Math.abs(b.rect[3] - b.rect[1]);
        return areaA - areaB;
      }),
  [annotations, pageWidthPt]);

  const linkOverlays = sortedLinkAnns.map((ann, ai) => {
    const href = ann.url || ann.action?.url || "";
    if (!href) return null;
    const [sx, , , sy, tx, ty] = viewport.transform;
    const px1 = ann.rect[0] * sx + tx; const px2 = ann.rect[2] * sx + tx;
    const py1 = ann.rect[1] * sy + ty; const py2 = ann.rect[3] * sy + ty;
    const left   = Math.min(px1, px2) / viewport.width  * 100;
    const top    = Math.min(py1, py2) / viewport.height * 100;
    const width  = Math.abs(px2 - px1) / viewport.width  * 100;
    const height = Math.abs(py2 - py1) / viewport.height * 100;
    const isMailto   = href.startsWith("mailto:");
    const displayUrl = isMailto ? href.replace("mailto:", "") : href;
    const hoverBg    = isMailto ? "rgba(234,67,53,0.13)"  : "rgba(94,129,93,0.13)";
    const hoverLine  = isMailto ? "rgba(234,67,53,0.45)"  : "rgba(94,129,93,0.45)";
    return (
      <a key={ai} href={href} target="_blank" rel="noopener noreferrer"
        title={`${isMailto ? "\u{1F4E7} " : "\u{1F517} "}${displayUrl}`}
        style={{
          position: "absolute",
          left: `${left}%`, top: `${top}%`,
          width: `${width}%`, height: `${height}%`,
          zIndex: 6 + (sortedLinkAnns.length - ai),
          cursor: "pointer", display: "block", borderRadius: 2,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = hoverBg; e.currentTarget.style.outline = `1.5px solid ${hoverLine}`; }}
        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.outline = "none"; }}
      />
    );
  }).filter(Boolean);

  const aspectPct = (viewport.height / viewport.width) * 100;

  return (
    <Box ref={boxRef} sx={{ width: "100%", bgcolor: "#fff", boxShadow: "0 2px 12px rgba(0,0,0,.15)", borderRadius: 1, overflow: "hidden" }}>
      <div style={{ position: "relative", width: "100%", paddingBottom: `${aspectPct}%`, display: "block" }}>
        <canvas ref={canvasRef}
          onClick={() => { setHoveredIdx(null); onFieldClick?.(null); }}
          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", display: "block", cursor: "default" }} />

        {/* ── Text hover zones — for field editing only ── */}
        {textLines.map((line, i) => {
          const isHov = hoveredIdx === i && hoveredField;
          return (
            <div
              key={i}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              onClick={() => { if (hoveredField) onFieldClick?.(hoveredField); }}
              style={{
                position: "absolute",
                left:   `${line.left}%`,
                top:    `${line.top}%`,
                width:  `${line.width}%`,
                height: `${line.height}%`,
                zIndex: 2,
                cursor: isHov ? "pointer" : "default",
                borderRadius: 2,
                background:  isHov ? "rgba(94,129,93,0.055)" : "transparent",
                boxShadow:   isHov ? "inset 2px 0 0 #5E815D" : "none",
                transition:  "background .12s, box-shadow .12s",
                pointerEvents: "auto",
              }}
            />
          );
        })}

        {/* ── Hover chip tooltip ── */}
        {hoveredField && hoveredIdx !== null && (() => {
          const line     = textLines[hoveredIdx];
          const section  = hoveredField.section?.label || hoveredField.section?.key || "";
          const chipLeft = Math.min(line.left, 72);
          const chipTop  = Math.max(0, line.top);
          return (
            <div style={{
              position: "absolute",
              left: `${chipLeft}%`, top: `${chipTop}%`,
              transform: "translateY(-100%) translateY(-4px)",
              pointerEvents: "none", zIndex: 20,
              display: "flex", alignItems: "center", gap: 5,
              background: "#fff", border: "1px solid #E7EAE3", borderRadius: 6,
              padding: "4px 9px 4px 7px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)",
              fontFamily: "'Jost',sans-serif", whiteSpace: "nowrap",
              animation: "hlFadeIn .14s ease",
            }}>
              <span style={{ width: 16, height: 16, borderRadius: 5, background: "rgba(94,129,93,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                  <path d="M8.5 1.5a1.5 1.5 0 0 1 2.12 2.12L4 10.25l-2.75.5.5-2.75L8.5 1.5Z" stroke="#5E815D" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
              <span style={{ fontSize: 10, fontWeight: 600, color: "#3A3D37", letterSpacing: "-.01em" }}>
                Edit
                {section && <span style={{ color: "#7A8073", fontWeight: 400, marginLeft: 4 }}>· {section}</span>}
              </span>
              <span style={{ position: "absolute", bottom: -5, left: 10, width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid #fff", filter: "drop-shadow(0 1px 0 #E7EAE3)" }} />
            </div>
          );
        })()}

        {/* ── Annotation-level link overlays ── */}
        {linkOverlays}

        {/* ── Per-item link click zones ── */}
        {linkItemZones.map((zone, zi) => {
          const isMailto   = zone.href.startsWith("mailto:");
          const displayUrl = isMailto ? zone.href.replace("mailto:", "") : zone.href;
          const hoverBg    = isMailto ? "rgba(234,67,53,0.10)"  : "rgba(94,129,93,0.10)";
          const hoverLine  = isMailto ? "rgba(234,67,53,0.40)"  : "rgba(94,129,93,0.40)";
          return (
            <a
              key={`liz-${zi}`}
              href={zone.href}
              target="_blank"
              rel="noopener noreferrer"
              title={`${isMailto ? "\u{1F4E7} " : "\u{1F517} "}${displayUrl}`}
              style={{
                position: "absolute",
                left: `${zone.left}%`, top: `${zone.top}%`,
                width: `${zone.width}%`, height: `${zone.height}%`,
                zIndex: 15,
                cursor: "pointer", display: "block", borderRadius: 2,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = hoverBg; e.currentTarget.style.outline = `1.5px solid ${hoverLine}`; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.outline = "none"; }}
            />
          );
        })}

        {/* ── [PROJECT LINK] Icon overlays ── */}
        {projectLinkOverlays.map((overlay, i) => (
          <a
            key={`proj-link-icon-${i}`}
            href={overlay.url || undefined}
            target={overlay.url ? "_blank" : undefined}
            rel="noopener noreferrer"
            title={overlay.url || "Project link"}
            onClick={e => e.stopPropagation()}
            style={{
              position: "absolute",
              left:    `${overlay.left}%`,
              top:     `${overlay.top}%`,
              width:   `${overlay.width}%`,
              height:  `${overlay.height}%`,
              zIndex:  22,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "3px",
              background:  "rgba(94,129,93,0.10)",
              border:      "1px solid rgba(94,129,93,0.30)",
              textDecoration: "none",
              cursor:  overlay.url ? "pointer" : "default",
              transition: "background .12s, border-color .12s",
              boxSizing: "border-box",
            }}
            onMouseEnter={e => {
              if (!overlay.url) return;
              e.currentTarget.style.background   = "#5E815D";
              e.currentTarget.style.borderColor  = "#5E815D";
              const svg = e.currentTarget.querySelector("svg");
              if (svg) svg.style.color = "#fff";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background   = "rgba(94,129,93,0.10)";
              e.currentTarget.style.borderColor  = "rgba(94,129,93,0.30)";
              const svg = e.currentTarget.querySelector("svg");
              if (svg) svg.style.color = "#5E815D";
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                width:  "64%",
                height: "64%",
                color:  "#5E815D",
                display: "block",
                flexShrink: 0,
                transition: "color .12s",
              }}
            >
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </a>
        ))}

        {/* ── Active-edit highlight ── */}
        {hlBoxes.map((b, i) => (
          <div key={i} style={{
            position: "absolute",
            left:   `${b.left   - 0.3}%`, top:    `${b.top    - 0.3}%`,
            width:  `${b.width  + 0.6}%`, height: `${b.height + 0.6}%`,
            background: "rgba(94,129,93,0.08)",
            boxShadow: "inset 0 0 0 1.5px rgba(94,129,93,0.5)",
            borderRadius: 2, pointerEvents: "none", zIndex: 4,
            animation: "hlFadeIn .2s ease",
          }} />
        ))}
        {hlBoxes.length > 0 && (
          <div style={{
            position: "absolute",
            top:  `${Math.max(0, hlBoxes[0].top - 0.5)}%`,
            left: `${hlBoxes[0].left}%`,
            transform: "translateY(-100%) translateY(-3px)",
            display: "flex", alignItems: "center", gap: 4,
            background: "#5E815D", color: "#fff",
            fontSize: 9.5, fontWeight: 600, fontFamily: "'Jost',sans-serif",
            padding: "3px 8px 3px 6px", borderRadius: "5px 5px 5px 0",
            pointerEvents: "none", zIndex: 5, whiteSpace: "nowrap",
            boxShadow: "0 2px 10px rgba(94,129,93,0.35)",
            animation: "hlFadeIn .2s ease", letterSpacing: "-.01em",
          }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(255,255,255,0.7)", display: "inline-block" }} />
            Editing
          </div>
        )}
      </div>
    </Box>
  );
}


/* ─────────────────────────────────────────────────────────────────────
   PDFViewer  —  multi-page viewer with IntersectionObserver page tracking
─────────────────────────────────────────────────────────────────────── */
function PDFViewer({ url, version, highlightText, scrollContainerRef, onPageChange, fields, onFieldClick, sessionId, onPhotoAdjusted }) {
  const [pages, setPages]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const pageWrapRefs = useRef([]);

  useEffect(() => {
    if (!url) return;
    const loadPdfJs = () => new Promise((resolve, reject) => {
      if (window.pdfjsLib) { resolve(window.pdfjsLib); return; }
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      script.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        resolve(window.pdfjsLib);
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });

    let cancelled = false;
    setLoading(true); setError(null); setPages([]);
    onPageChange?.(1, 0);

    loadPdfJs()
      .then(async (pdfjsLib) => {
        const pdf = await pdfjsLib.getDocument({ url, withCredentials: false }).promise;
        if (cancelled) return;
        const pagesData = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page        = await pdf.getPage(i);
          const viewport    = page.getViewport({ scale: 1.65 });
          const annotations = await page.getAnnotations();
          pagesData.push({ page, viewport, annotations });
        }
        if (!cancelled) {
          setPages(pagesData);
          setLoading(false);
          onPageChange?.(1, pagesData.length);
        }
      })
      .catch(e => { if (!cancelled) { setError(e.message); setLoading(false); } });

    return () => { cancelled = true; };
  }, [url, version]);

  useEffect(() => {
    if (!pages.length || !scrollContainerRef?.current) return;
    const container = scrollContainerRef.current;
    const ratios = new Array(pages.length).fill(0);
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          const idx = Number(entry.target.dataset.pidx);
          if (!isNaN(idx)) ratios[idx] = entry.intersectionRatio;
        });
        let bestIdx = 0, bestRatio = -1;
        ratios.forEach((r, i) => { if (r > bestRatio) { bestRatio = r; bestIdx = i; } });
        onPageChange?.(bestIdx + 1, pages.length);
      },
      {
        root: container,
        threshold: [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
      }
    );
    pageWrapRefs.current.forEach((el, i) => {
      if (el) { el.dataset.pidx = String(i); observer.observe(el); }
    });
    return () => observer.disconnect();
  }, [pages.length, scrollContainerRef]);

  if (loading) return (
    <Stack alignItems="center" justifyContent="center"
      sx={{ flex: 1, gap: 1.5, bgcolor: "#fff", borderRadius: 2.5, border: "1.5px dashed #E0E4DB" }}>
      <SpinnerEl size={22} color="#5E815D" />
      <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#3A3D37" }}>Rendering preview…</Typography>
    </Stack>
  );

  if (error) return (
    <Stack alignItems="center" justifyContent="center"
      sx={{ flex: 1, gap: 1, bgcolor: "#fff", borderRadius: 2.5, border: "1.5px dashed #fecaca" }}>
      <Typography sx={{ fontSize: 12, color: "#ef4444" }}>Preview error</Typography>
      <Typography sx={{ fontSize: 10, color: "#7A8073", px: 2, textAlign: "center" }}>{error}</Typography>
    </Stack>
  );

  if (!pages.length) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, width: "100%" }}>
      {pages.map(({ page, viewport, annotations }, idx) => (
        <div key={idx} ref={el => { pageWrapRefs.current[idx] = el; }} style={{ width: "100%" }}>
          <PDFPage
            page={page} viewport={viewport} annotations={annotations}
            highlightText={highlightText}
            scrollContainerRef={scrollContainerRef}
            fields={fields}
            onFieldClick={onFieldClick}
            sessionId={sessionId}
            onPhotoAdjusted={onPhotoAdjusted}
            isFirstPage={idx === 0}
          />
        </div>
      ))}
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════════════
   PAGE WRITER DIALOG  — type / paste content onto a new blank page
══════════════════════════════════════════════════════════════════════ */
export { PDFViewer, PDFPage, findTextBoxes };
export default PDFViewer;