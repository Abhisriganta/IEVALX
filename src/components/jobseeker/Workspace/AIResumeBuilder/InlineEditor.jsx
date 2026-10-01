import React, { useState, useRef, useEffect } from "react";
import { SpinnerEl, RippleBtn, Ico } from "./atoms";
import { FONTS, SIZES, saveFontMemory, loadFontMemory } from "@/constants/resumeAiConstants";

import resumeAiService from "@/services/api/jobseeker/resumeAiService";

import { AlignLeft, AlignCenter, AlignRight, AlignJustify } from "lucide-react";

function InlineEditor({ field, sc, saving, onApply, onCancel, onDelete, initialSegments = null, autoFocus = false, onUndo = null, onNextSection = null, onAddBlankLine = null, readOnly = false }) {
  const ref      = useRef(null);
  const colorRef = useRef(null);
  const rangeRef = useRef(null);
  const formattingTouched = useRef(false);
  const [fmt, setFmt] = useState({ bold: false, italic: false, underline: false, strike: false });
  const [align, setAlign] = useState("left");
  const [lastFont, setLastFont] = useState(() => loadFontMemory().fontFamily || "");
  const [lastSize, setLastSize] = useState(() => loadFontMemory().fontSize ? loadFontMemory().fontSize.replace("pt", "") : "");
  const [lineSpacing, setLineSpacing] = useState("");
  const [aiPanel, setAiPanel] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null);

  useEffect(() => {
    if (!ref.current) return;
    const esc = t => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    if (initialSegments && initialSegments.length > 0) {
      const html = initialSegments.map(s => {
        if (s.text === "\t") return `<span data-tab="1" style="display:inline-block;min-width:3em;white-space:pre">\t</span>`;
        let inner = esc(s.text);
        if (s.color)      inner = `<span style="color:${s.color}">${inner}</span>`;
        if (s.fontFamily) inner = `<font face="${esc(s.fontFamily)}">${inner}</font>`;
        if (s.fontSize)   inner = `<span data-pt="${s.fontSize}" style="font-size:${s.fontSize}">${inner}</span>`;
        if (s.strike)     inner = `<s>${inner}</s>`;
        if (s.underline)  inner = `<u>${inner}</u>`;
        if (s.italic)     inner = `<i>${inner}</i>`;
        if (s.bold)       inner = `<b>${inner}</b>`;
        return inner;
      }).join("");
      const hadFocus = document.activeElement === ref.current;
      ref.current.innerHTML = html;
      if (!readOnly) {
        const sel = window.getSelection(), r = document.createRange();
        r.selectNodeContents(ref.current); r.collapse(false);
        sel.removeAllRanges(); sel.addRange(r);
        rangeRef.current = r.cloneRange();
        if (hadFocus || initialSegments) ref.current.focus();
      }
    } else if (!initialSegments) {
      ref.current.innerHTML = field.isBold ? `<b>${esc(field.text)}</b>` : esc(field.text);
      if (!readOnly) {
        const sel = window.getSelection(), r = document.createRange();
        r.selectNodeContents(ref.current); r.collapse(false);
        sel.removeAllRanges(); sel.addRange(r);
        ref.current.focus();
      }
    }
    if (autoFocus && !readOnly) {
      setTimeout(() => {
        if (!ref.current) return;
        ref.current.focus();
        const sel = window.getSelection(), r = document.createRange();
        r.selectNodeContents(ref.current); r.collapse(false);
        sel.removeAllRanges(); sel.addRange(r);
      }, 80);
    }
  }, [initialSegments]);

  const saveRange = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && ref.current?.contains(sel.anchorNode)) rangeRef.current = sel.getRangeAt(0).cloneRange();
  };
  const syncFmt = () => {
    saveRange();
    setFmt({ bold: document.queryCommandState("bold"), italic: document.queryCommandState("italic"), underline: document.queryCommandState("underline"), strike: document.queryCommandState("strikeThrough") });
  };
  /* [FIX] Set formattingTouched when user uses any formatting command */
  const execCmd = (cmd, val = null) => {
    formattingTouched.current = true;
    ref.current?.focus();
    const sel = window.getSelection();
    if (rangeRef.current) { sel.removeAllRanges(); sel.addRange(rangeRef.current); }
    document.execCommand(cmd, false, val);
    const newFmt = { bold: document.queryCommandState("bold"), italic: document.queryCommandState("italic"), underline: document.queryCommandState("underline"), strike: document.queryCommandState("strikeThrough") };
    setFmt(newFmt);
    const formatCmds = ["bold", "italic", "underline", "strikeThrough"];
    if (formatCmds.includes(cmd) && !val) {
      const sel2 = window.getSelection();
      const isCollapsed = sel2 && sel2.rangeCount > 0 && sel2.getRangeAt(0).collapsed;
      const stillOn = document.queryCommandState(cmd);
      if (!stillOn && isCollapsed) {
        const markId = "__fmt_escape_" + Date.now();
        document.execCommand("insertHTML", false, `<span id="${markId}" style="font-weight:normal;font-style:normal;text-decoration:none">&#8203;</span>`);
        const mark = document.getElementById(markId);
        if (mark) {
          const r = document.createRange(); r.setStart(mark.firstChild || mark, mark.firstChild ? 1 : 0); r.collapse(true);
          sel2.removeAllRanges(); sel2.addRange(r);
          const txt = document.createTextNode(mark.textContent || ""); mark.replaceWith(txt);
          const r2 = document.createRange(); r2.setStart(txt, txt.length); r2.collapse(true);
          sel2.removeAllRanges(); sel2.addRange(r2);
        }
      }
    }
    const sel3 = window.getSelection();
    if (sel3 && sel3.rangeCount > 0) rangeRef.current = sel3.getRangeAt(0).cloneRange();
  };
  const tbClick = (e, cmd, val = null) => { e.preventDefault(); execCmd(cmd, val); };
  const onDropDown = e => { e.stopPropagation(); saveRange(); };
  const ensureSelection = () => {
    const sel = window.getSelection();
    const hasSelection = sel && sel.rangeCount > 0 && !sel.getRangeAt(0).collapsed;
    if (!hasSelection) {
      if (rangeRef.current && !rangeRef.current.collapsed) { sel.removeAllRanges(); sel.addRange(rangeRef.current); }
      else { const r = document.createRange(); r.selectNodeContents(ref.current); sel.removeAllRanges(); sel.addRange(r); }
    }
  };
  /* [FIX] Set formattingTouched when user changes font */
  const applyFont = val => {
    if (!val) return;
    formattingTouched.current = true;
    ref.current?.focus();
    const sel = window.getSelection();
    if (rangeRef.current) { sel.removeAllRanges(); sel.addRange(rangeRef.current); }
    ensureSelection();
    const range2 = sel.getRangeAt(0);
    if (range2 && !range2.collapsed) {
      const frag2 = range2.extractContents();
      const span2 = document.createElement("span");
      span2.style.fontFamily = val;
      span2.appendChild(frag2);
      range2.insertNode(span2);
      const nr2 = document.createRange();
      nr2.setStartAfter(span2); nr2.collapse(true);
      sel.removeAllRanges(); sel.addRange(nr2);
      rangeRef.current = nr2.cloneRange();
    } else {
      document.execCommand("fontName", false, val);
      if (sel.rangeCount > 0) rangeRef.current = sel.getRangeAt(0).cloneRange();
    }
    saveFontMemory(val, null); setLastFont(val);
  };
  /* [FIX] Set formattingTouched when user changes size */
  const applySize = val => {
    if (!val) return;
    formattingTouched.current = true;
    ref.current?.focus();
    const sel = window.getSelection();
    if (rangeRef.current) { sel.removeAllRanges(); sel.addRange(rangeRef.current); }
    ensureSelection();
    const ptVal = parseInt(val, 10);
    if (!ptVal) return;
    const ptStr = ptVal + "pt";
    const range = sel.getRangeAt(0);
    if (!range.collapsed) {
      const frag = range.extractContents();
      const span = document.createElement("span");
      span.setAttribute("data-pt", ptStr);
      span.style.fontSize = ptStr;
      span.appendChild(frag);
      range.insertNode(span);
      const newRange = document.createRange();
      newRange.setStartAfter(span);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
      rangeRef.current = newRange.cloneRange();
    } else {
      const PT_SCALE = { "8": 1, "9": 1, "10": 2, "11": 2, "12": 3, "14": 4, "16": 4, "18": 5, "20": 5, "22": 6, "24": 6, "28": 7, "32": 7, "36": 7 };
      document.execCommand("fontSize", false, PT_SCALE[val] || 3);
      if (sel.rangeCount > 0) rangeRef.current = sel.getRangeAt(0).cloneRange();
    }
    saveFontMemory(null, ptStr); setLastSize(val);
  };
  /* [FIX] Set formattingTouched when user changes color */
  const applyColor = hex => {
    formattingTouched.current = true;
    ref.current?.focus();
    const sel = window.getSelection();
    if (rangeRef.current) { sel.removeAllRanges(); sel.addRange(rangeRef.current); }
    ensureSelection(); document.execCommand("foreColor", false, hex);
    if (sel.rangeCount > 0) rangeRef.current = sel.getRangeAt(0).cloneRange();
  };
  const applyAlign = al => {
    setAlign(al);
    const map = { left: "justifyLeft", center: "justifyCenter", right: "justifyRight", justify: "justifyFull" };
    ref.current?.focus();
    const sel = window.getSelection();
    if (rangeRef.current) { sel.removeAllRanges(); sel.addRange(rangeRef.current); }
    document.execCommand(map[al]);
  };
  const _toHex = col => {
    if (!col || col === "inherit" || col === "") return "";
    const m = col.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (m) return "#" + [m[1], m[2], m[3]].map(n => parseInt(n).toString(16).padStart(2, "0")).join("").toUpperCase();
    if (/^#[0-9a-fA-F]{3,6}$/.test(col)) return col.toUpperCase();
    return "";
  };
  const SCALE_PT = { 1: 8, 2: 10, 3: 12, 4: 14, 5: 18, 6: 24, 7: 36 };
  const getSegments = () => {
    const el = ref.current; if (!el) return [{ text: field.text, bold: false }];
    const segs = [];
    const walk = (node, p, depth) => {
      if (node.nodeType === 3) { if (node.textContent) segs.push({ text: node.textContent, ...p }); return; }
      if (node.nodeType === 1 && node.dataset && node.dataset.tab) {
        segs.push({ text: "\t", bold: false, italic: false, underline: false, strike: false, color: "", fontFamily: "", fontSize: "" });
        return;
      }
      if (node.nodeType !== 1) return;
      const tag = node.tagName.toLowerCase();
      const st = (depth === 0) ? {} : (node.style || {});
      const np = { ...p };
      const fw = st.fontWeight || "";
      np.bold      = np.bold || tag === "b" || tag === "strong" || fw === "bold" || parseInt(fw) >= 700;
      np.italic    = np.italic || tag === "i" || tag === "em" || st.fontStyle === "italic";
      const td = st.textDecoration || "";
      np.underline = np.underline || tag === "u" || td.includes("underline");
      np.strike    = np.strike || tag === "s" || tag === "strike" || td.includes("line-through");
      if (tag === "font") {
        const ca = node.getAttribute("color") || "";
        if (ca && ca !== "inherit") { const h = _toHex(ca) || ca; if (h) np.color = h; }
        const sa = node.getAttribute("size") || "";
        if (sa) { const pt = SCALE_PT[parseInt(sa)]; if (pt) np.fontSize = pt + "pt"; }
        const fa = node.getAttribute("face") || "";
        if (fa) np.fontFamily = fa.split(",")[0].replace(/['"]/g, "").trim();
      }
      if (st.color && st.color !== "inherit") { const h = _toHex(st.color); if (h) np.color = h; }
      if (st.fontFamily && st.fontFamily !== "inherit") np.fontFamily = st.fontFamily.replace(/['"]/g, "").split(",")[0].trim();
      if (st.fontSize && st.fontSize !== "inherit") np.fontSize = st.fontSize;
      const dpt = node.getAttribute && node.getAttribute("data-pt");
      if (dpt) np.fontSize = dpt;
      for (const c of node.childNodes) walk(c, np, depth + 1);
    };
    walk(el, { bold: false, italic: false, underline: false, strike: false, color: "", fontFamily: "", fontSize: "" }, 0);
    const m = [];
    for (const s of segs) {
      const l = m[m.length - 1];
      if (l && l.bold === s.bold && l.italic === s.italic && l.underline === s.underline && l.strike === s.strike && l.color === s.color && l.fontFamily === s.fontFamily && l.fontSize === s.fontSize) l.text += s.text;
      else m.push({ ...s });
    }
    return m.map(s => ({ ...s, text: s.text.replace(/\u200B/g, "") })).filter(s => s.text);
  };

  const getSelectedOrAllText = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.getRangeAt(0).collapsed &&
        ref.current?.contains(sel.anchorNode)) {
      return { text: sel.toString(), isSelection: true };
    }
    return { text: ref.current?.innerText || "", isSelection: false };
  };

  const runAiRewrite = async (mode) => {
    const { text } = getSelectedOrAllText();
    if (!text.trim()) return;
    setAiLoading(true); setAiSuggestion(null);
    try {
      const data = await resumeAiService.aiRewrite(text.trim(), mode);
      setAiSuggestion({ text: data.suggestion, mode });
    } catch (err) {
      setAiSuggestion({ text: "AI request failed. Please try again.", mode: "error" });
    } finally {
      setAiLoading(false);
    }
  };

  const useAiSuggestion = () => {
    if (!aiSuggestion?.text) return;
    if (ref.current) {
      ref.current.innerText = aiSuggestion.text;
      const r = document.createRange();
      r.selectNodeContents(ref.current); r.collapse(false);
      const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
      rangeRef.current = r.cloneRange();
    }
    setAiSuggestion(null); setAiPanel(false);
  };

  const apply = () => {
    if (readOnly) return;
    const s = getSegments();
    /* [FIX] Attach the formatting-touched flag so handleFieldSave knows
       the user explicitly interacted with a formatting control */
    s._formattingTouched = formattingTouched.current;
    const paraFmt = {};
    if (align && align !== "left") paraFmt.alignment = align;
    if (lineSpacing) paraFmt.line_spacing = parseFloat(lineSpacing);
    const hasFmt = Object.keys(paraFmt).length > 0;
    if (s.some(x => x.text.trim())) onApply(s, hasFmt ? paraFmt : null);
  };

  const kd = e => {
    if (readOnly) {
      if (e.key === "Escape") onCancel();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "b") { e.preventDefault(); execCmd("bold"); }
    if ((e.ctrlKey || e.metaKey) && e.key === "i") { e.preventDefault(); execCmd("italic"); }
    if ((e.ctrlKey || e.metaKey) && e.key === "u") { e.preventDefault(); execCmd("underline"); }
    if ((e.ctrlKey || e.metaKey) && e.key === "z") {
      if (onUndo) { e.preventDefault(); onUndo(); return; }
    }
    if (e.key === "Escape") onCancel();
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      apply();
      if (onAddBlankLine) setTimeout(() => onAddBlankLine(), 100);
    }
    if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      apply();
      if (onNextSection) setTimeout(() => onNextSection(), 80);
    }
  };

  const Btn = ({ active, title, onMD, children, sx: bsx }) => (
    <button onMouseDown={onMD} title={title} className={`tb-btn${active ? " active" : ""}`} style={bsx}>{children}</button>
  );
  const Sep = () => <span style={{ width: 1, height: 16, background: "#E7EAE3", margin: "0 1px", flexShrink: 0, alignSelf: "center" }} />;

  return (
    <div>
      {/* ── Formatting toolbar — HIDDEN when readOnly ── */}
      {!readOnly && (
        <div style={{ display: "flex", alignItems: "center", gap: 3, rowGap: 4, flexWrap: "wrap", padding: "7px 10px", background: "#F6F8F3", border: "1px solid #E7EAE3", borderRadius: "10px 10px 0 0", borderBottom: "none" }}>
          <Btn active={fmt.bold}      title="Bold (Ctrl+B)"      onMD={e => tbClick(e, "bold")}          sx={{ fontWeight: 900, flexShrink: 0 }}>B</Btn>
          <Btn active={fmt.italic}    title="Italic (Ctrl+I)"    onMD={e => tbClick(e, "italic")}        sx={{ fontStyle: "italic", flexShrink: 0 }}>I</Btn>
          <Btn active={fmt.underline} title="Underline (Ctrl+U)" onMD={e => tbClick(e, "underline")}     sx={{ textDecoration: "underline", flexShrink: 0 }}>U</Btn>
          <Btn active={fmt.strike}    title="Strikethrough"      onMD={e => tbClick(e, "strikeThrough")} sx={{ textDecoration: "line-through", flexShrink: 0 }}>S</Btn>
          <Sep />
          <button title="Text color" onMouseDown={e => { e.preventDefault(); saveRange(); setTimeout(() => colorRef.current?.click(), 0); }}
            style={{ flexShrink: 0, padding: "2px 7px", background: "#F8FAF6", border: "1px solid #E7EAE3", borderRadius: 4, cursor: "pointer", position: "relative", fontSize: 13, fontWeight: 700, color: "#101210", userSelect: "none" }}>
            A<span style={{ position: "absolute", bottom: 3, left: 4, right: 4, height: 3, borderRadius: 1, background: "#e11d48" }} />
            <input ref={colorRef} type="color" defaultValue="#e11d48" onChange={e => applyColor(e.target.value)} style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }} />
          </button>
          <Sep />
          <select onMouseDown={onDropDown} onChange={e => applyFont(e.target.value)} style={{ flex: "1 1 60px", minWidth: 0, maxWidth: 110, height: 26, padding: "0 6px", background: "#FFFFFF", border: "1px solid #E7EAE3", borderRadius: 6, color: "#55584F", fontSize: 11, cursor: "pointer" }}>
            <option value="">Font…</option>
            {FONTS.map(f => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
          </select>
          <select onMouseDown={onDropDown} onChange={e => applySize(e.target.value)} style={{ flexShrink: 0, width: 52, height: 26, padding: "0 6px", background: "#FFFFFF", border: "1px solid #E7EAE3", borderRadius: 6, color: "#55584F", fontSize: 11, cursor: "pointer" }}>
            <option value="">pt…</option>
            {SIZES.map(s => <option key={s} value={String(s)}>{s}</option>)}
          </select>
          {(lastFont || lastSize) && (
            <span title={`Re-apply: ${[lastFont, lastSize ? lastSize + "pt" : ""].filter(Boolean).join(" · ")}`}
              onClick={() => { if (lastFont) applyFont(lastFont); if (lastSize) applySize(lastSize); }}
              style={{ flexShrink: 0, marginLeft: 2, fontSize: 9, color: "#7F9E7E", background: "rgba(94,129,93,0.15)", border: "1px solid rgba(94,129,93,0.3)", borderRadius: 4, padding: "2px 5px", cursor: "pointer", whiteSpace: "nowrap", userSelect: "none" }}>
              ↺ {[lastFont, lastSize ? lastSize + "pt" : ""].filter(Boolean).join("·")}
            </span>
          )}
        </div>
      )}

      {/* ── Alignment + AI toolbar — HIDDEN when readOnly ── */}
      {!readOnly && (
        <div style={{ display: "flex", alignItems: "center", gap: 3, rowGap: 4, flexWrap: "wrap", padding: "7px 10px", background: "#F8FAF6", border: "1px solid #E7EAE3", borderBottom: "none" }}>
          <Btn active={align === "left"}    title="Align left"    onMD={e => { e.preventDefault(); applyAlign("left"); }}   ><Ico.AlL /></Btn>
          <Btn active={align === "center"}  title="Center"        onMD={e => { e.preventDefault(); applyAlign("center"); }} ><Ico.AlC /></Btn>
          <Btn active={align === "right"}   title="Align right"   onMD={e => { e.preventDefault(); applyAlign("right"); }}  ><Ico.AlR /></Btn>
          <Btn active={align === "justify"} title="Justify"       onMD={e => { e.preventDefault(); applyAlign("justify"); }}><Ico.AlJ /></Btn>
          <Sep />
          <select title="Line spacing" value={lineSpacing} onChange={e => setLineSpacing(e.target.value)}
            style={{ flexShrink: 0, width: 84, fontSize: 10.5, height: 26, border: "1px solid #E7EAE3", borderRadius: 6, background: "#FFFFFF", color: "#55584F", padding: "0 6px", cursor: "pointer" }}>
            <option value="">≡ Spacing</option>
            <option value="1">Single</option>
            <option value="1.15">1.15×</option>
            <option value="1.5">1.5×</option>
            <option value="2">Double</option>
          </select>
          <span style={{ fontSize: 9, color: "#7A8073", marginLeft: "auto", flexShrink: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>Ctrl+B/I/U • ↵</span>
          <Sep />
          <button
            onMouseDown={e => { e.preventDefault(); saveRange(); setAiPanel(p => !p); setAiSuggestion(null); }}
            style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 6, border: "1.5px solid #1D5A50", background: aiPanel ? "#E7EFEC" : "#F1F6F4", color: "#1D5A50", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "'Jost',sans-serif", transition: "all .12s" }}
          >
            ✦ AI Rewrite
          </button>
        </div>
      )}

      {/* ── AI Rewrite Panel — HIDDEN when readOnly ── */}
      {!readOnly && aiPanel && (
        <div style={{ padding: "10px 12px", background: "#F1F6F4", border: "1.5px solid #E7EFEC", borderBottom: "none", display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#1D5A50", letterSpacing: ".05em", textTransform: "uppercase" }}>AI Rewrite</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {["Polish", "Elaborate", "Formalise", "Condense", "Quantify", "Action Verbs"].map(mode => (
              <button key={mode}
                onMouseDown={e => { e.preventDefault(); runAiRewrite(mode); }}
                disabled={aiLoading}
                style={{ padding: "5px 13px", borderRadius: 99, border: "1.5px solid #E7EFEC", background: "#fff", color: "#1D5A50", fontSize: 11.5, fontWeight: 600, cursor: aiLoading ? "not-allowed" : "pointer", fontFamily: "'Jost',sans-serif", opacity: aiLoading ? 0.5 : 1, transition: "all .12s", display: "inline-flex", alignItems: "center", gap: 5 }}
              >
                {mode === "Polish" && "✨"}
                {mode === "Elaborate" && "📝"}
                {mode === "Formalise" && "💼"}
                {mode === "Condense" && "✂️"}
                {mode === "Quantify" && "📊"}
                {mode === "Action Verbs" && "⚡"}
                {mode}
              </button>
            ))}
          </div>
          {aiLoading && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#1D5A50" }}>
              <span style={{ width: 12, height: 12, border: "2px solid #E7EFEC", borderTop: "2px solid #1D5A50", borderRadius: "50%", animation: "spin .7s linear infinite", display: "inline-block" }} />
              Rewriting with AI…
            </div>
          )}
          {aiSuggestion && aiSuggestion.mode !== "error" && (
            <div style={{ marginTop: 4, padding: "12px 14px", background: "#fff", border: "1.5px solid #E7EFEC", borderRadius: 10, fontSize: 13, color: "#04241F", lineHeight: 1.7, fontFamily: "'Jost',sans-serif" }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, color: "#1D5A50", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>AI Suggestion</div>
              {aiSuggestion.text}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
                <button onMouseDown={e => { e.preventDefault(); setAiSuggestion(null); }}
                  style={{ padding: "5px 14px", borderRadius: 8, border: "1px solid #E7EAE3", background: "#fff", color: "#55584F", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Jost',sans-serif" }}>
                  Discard
                </button>
                <button onMouseDown={e => { e.preventDefault(); useAiSuggestion(); }}
                  style={{ padding: "5px 16px", borderRadius: 8, border: "none", background: "#1D5A50", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Jost',sans-serif", boxShadow: "0 2px 8px rgba(29,90,80,0.25)" }}>
                  ✓ Use This
                </button>
              </div>
            </div>
          )}
          {aiSuggestion?.mode === "error" && (
            <div style={{ fontSize: 12, color: "#dc2626", padding: "6px 10px", background: "#fef2f2", borderRadius: 6, border: "1px solid #fecaca" }}>{aiSuggestion.text}</div>
          )}
        </div>
      )}

      {/* ── Read-only info banner ── */}
      {readOnly && (
        <div style={{
          padding: "8px 12px",
          background: "rgba(94,129,93,0.04)",
          border: "1px solid rgba(94,129,93,0.15)",
          borderRadius: "6px 6px 0 0",
          borderBottom: "none",
          display: "flex", alignItems: "center", gap: 6,
          fontSize: 11, color: "#7F9E7E", fontWeight: 600,
          fontFamily: "'Jost',sans-serif",
        }}>
          <span>ℹ</span>
          <span>This field has hyperlinks — edit them using the <b>Name</b> / <b>URL</b> fields below</span>
        </div>
      )}

      {/* ── Content area ── */}
      <div ref={ref}
        contentEditable={!readOnly}
        suppressContentEditableWarning
        onKeyDown={kd}
        onKeyUp={readOnly ? undefined : syncFmt}
        onMouseUp={readOnly ? undefined : syncFmt}
        onSelect={readOnly ? undefined : syncFmt}
        className="glow-input"
        style={{
          minHeight: readOnly ? 48 : 80,
          padding: "14px 16px",
          border: "1px solid #E7EAE3",
          borderRadius: readOnly ? "0 0 10px 10px" : "0 0 10px 10px",
          fontSize: 14,
          fontFamily: "'Jost',sans-serif",
          background: readOnly ? "#F0F2ED" : "#F6F8F3",
          outline: "none",
          lineHeight: 1.9,
          color: readOnly ? "#55584F" : "#101210",
          cursor: readOnly ? "default" : "text",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          opacity: readOnly ? 0.75 : 1,
          userSelect: readOnly ? "text" : "auto",
        }}
      />

      {/* ── Action buttons ── */}
      <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "flex-end", alignItems: "center", paddingTop: 12, borderTop: "1px solid #EFF2EC" }}>
        <RippleBtn variant="ghost" onClick={onCancel} style={{ fontSize: 12, padding: "6px 14px", gap: 4 }}><Ico.X /> Esc</RippleBtn>
        {!readOnly && (
          <>
            <RippleBtn onClick={onDelete} style={{ background: "rgba(220,38,38,0.08)", color: "#ef4444", border: "1px solid rgba(220,38,38,0.3)", fontSize: 12, padding: "6px 14px", gap: 4 }}><Ico.Trash /> Delete</RippleBtn>
            <RippleBtn onClick={apply} disabled={saving} style={{ background: saving ? "#E7EAE3" : "#5E815D", color: saving ? "#55584F" : "#fff", border: "none", fontSize: 12, padding: "6px 16px", gap: 4, fontWeight: 700, boxShadow: saving ? "none" : "0 4px 16px rgba(94,129,93,0.25)" }}>
              <Ico.Ok /> {saving ? "Saving…" : "Apply"}
            </RippleBtn>
          </>
        )}
      </div>
    </div>
  );
}

export default InlineEditor;