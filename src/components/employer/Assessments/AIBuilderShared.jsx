


import React from "react";
import { Box, TextField, InputAdornment } from "@mui/material";
import { Tune, AutoAwesome, Send as SendIcon } from "@mui/icons-material";

import { T, fSx } from "./Extendedbuilder";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
export const AI_STEPS = ["Configure", "Generate & review", "Approve & assign"];
export const STEP_ICONS = [Tune, AutoAwesome, SendIcon];

export const LEVELS = [
  { value: "fresher", label: "Fresher (0-2 years)" },
  { value: "junior", label: "Junior (2-5 years)" },
  { value: "senior", label: "Senior (5-8 years)" },
  { value: "expert", label: "Expert (8+ years)" },
];

export const QTYPES = [
  { value: "mcq", label: "Multiple Choice (MCQ)" },
  { value: "multi_select", label: "Multi Select" },
  { value: "true_false", label: "True / False" },
  { value: "fill_blank", label: "Fill in Blank" },
  { value: "match", label: "Match Following" },
  { value: "sequence", label: "Sequencing" },
  { value: "short_answer", label: "Short Answer" },
  { value: "coding", label: "Coding Challenge" },
  { value: "sql", label: "SQL Query" },
  { value: "scenario", label: "Scenario" },
];
export const QTYPE_LABEL = Object.fromEntries(
  QTYPES.map((q) => [q.value, q.label]),
);

export const DEFAULT_MARKS = {
  mcq:          1,
  multi_select: 2,
  true_false:   1,
  fill_blank:   1,
  match:        3,
  sequence:     2,
  short_answer: 5,
  scenario:     8,
  coding:       15,
  sql:          5,
};

// human-readable labels for the validation summary Alerts
export const FIELD_LABELS = {
  role: "Job role",
  name: "Assessment name",
  docText: "Topic document",
  sections: "Sections",
};

// section header — small caps, muted, tracked. matches the reference.
export const sectionHeaderSx = {
  fontSize: "0.7rem",
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: T.textMuted,
};

// ─────────────────────────────────────────────────────────────────────────────
// Custom stepper icon — mirrors CustomStepIcon look from Extendedbuilder
// ─────────────────────────────────────────────────────────────────────────────
export function AIStepIcon({ active, completed, icon }) {
  const IconComp = STEP_ICONS[Number(icon) - 1] || Tune;
  const bg = active ? T.navy : completed ? T.success : "#EEF2F7";
  const bdr = active ? T.navy : completed ? T.success : "#D1DCE8";
  const clr = active || completed ? "#FFFFFF" : T.textMuted;
  return (
    <Box
      sx={{
        width: 36,
        height: 36,
        borderRadius: "50%",
        bgcolor: bg,
        border: `2px solid ${bdr}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.2s ease",
      }}
    >
      <IconComp sx={{ fontSize: 16, color: clr }} />
    </Box>
  );
}

export const sectionCard = {
  borderRadius: "14px",
  border: `1px solid ${T.border}`,
  boxShadow: "none",
  bgcolor: T.surface,
};
export const navyBtn = {
  textTransform: "none",
  fontSize: "0.8rem",
  fontWeight: 600,
  borderRadius: "8px",
  bgcolor: T.navy,
  color: "#fff",
  px: 2.5,
  py: 0.9,
  "&:hover": { bgcolor: T.navyHover },
  "&.Mui-disabled": { bgcolor: "#CBD5E1", color: "#fff" },
};
export const ghostBtn = {
  textTransform: "none",
  fontSize: "0.78rem",
  borderRadius: "8px",
  border: `1px solid ${T.border}`,
  color: T.textSecond,
  bgcolor: T.surface,
  "&:hover": { bgcolor: T.navyLight, borderColor: T.navy, color: T.navy },
};

// icon-prefixed field style — larger padding, subtle border, rounded
export const iconFieldSx = {
  ...fSx,

  "& .MuiOutlinedInput-root": {
    ...(fSx["& .MuiOutlinedInput-root"] || {}),
    borderRadius: "12px",
    bgcolor: "#FAFBFD",
    minHeight: 62,
    alignItems: "center",
    "& fieldset": { borderColor: T.border },
    "&:hover fieldset": { borderColor: T.navy },
    "&.Mui-focused fieldset": { borderColor: T.navy },

    "& .MuiOutlinedInput-notchedOutline legend": {
      fontSize: "0.75rem",
      "& > span": { px: "4px" },
    },
  },
  "& .MuiInputLabel-root": {
    fontSize: "1rem",
    color: T.textMuted,
    fontWeight: 500,
    transform: "translate(14px, 20px) scale(1)",
    "&.MuiInputLabel-shrink": {
      transform: "translate(14px, -8px) scale(0.75)",
    },
    "&.Mui-focused": { color: T.textMuted },
  },
  "& .MuiOutlinedInput-input": {
    fontSize: "0.9rem",
    fontWeight: 600,
    color: T.textPrimary,
    padding: "16px 14px 16px 0 !important",
  },
  "& .MuiSelect-select": {
    fontSize: "0.9rem",
    fontWeight: 600,
    color: T.textPrimary,
    // 🔧 CHANGE — same rebalance for the Select control.
    padding: "16px 14px 16px 0 !important",
  },
};

// small icon adornment (left)
export const leftIcon = (Icon) => (
  <InputAdornment
    position="start"
    sx={{ ml: 0.5, mr: 1.25, mt: "0 !important" }}
  >
    <Box
      sx={{
        width: 34,
        height: 34,
        borderRadius: "9px",
        bgcolor: T.surface,
        border: `1px solid ${T.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon sx={{ fontSize: 17, color: T.textSecond }} />
    </Box>
  </InputAdornment>
);

// ─────────────────────────────────────────────────────────────────────────────
// Stem formatting (shared by ReviewApprovePage's StemEditor and the shell's
// renderRepoPreview)
// ─────────────────────────────────────────────────────────────────────────────
const STEM_LABELS = [
  "Problem Statement",
  "Input Format",
  "Output Format",
  "Sample Input",
  "Sample Output",
  "Explanation",
  "Database Schema",
  "Table Structure",
  "Sample Data",
  "Requirements",
  "Expected Output",
];
const STEM_PRE_LABELS = new Set(["Sample Input", "Sample Output"]);
const STEM_TABLE_LABELS = new Set([
  "Table Structure",
  "Sample Data",
  "Expected Output",
]);
const _escapeStemHtml = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const _COL_DEF_RE = new RegExp(
  "(?:^|\\s)" +
    "([A-Za-z_]\\w*)" +
    "\\s*:\\s*" +
    "([A-Za-z]+(?:\\(\\s*\\d+(?:\\s*,\\s*\\d+)?\\s*\\))?)" +
    "((?:\\s*,\\s*(?:PK|FK|KEY|UNIQUE|NOT NULL|NULL|PRIMARY KEY|FOREIGN KEY))*)",
  "gi",
);
function _parseStructureBlock(bodyText) {
  const groups = [];
  let currentTable = null;
  let currentTableRows = null;
  let cursor = 0;
  const re = new RegExp(_COL_DEF_RE.source, "gi");
  let m;
  while ((m = re.exec(bodyText)) !== null) {
    const between = bodyText.slice(cursor, m.index);
    const idents = between.match(/[A-Za-z_]\w*/g) || [];
    if (idents.length) {
      const candidate = idents[idents.length - 1];
      if (
        candidate &&
        candidate !== currentTable &&
        !/^(NOT|NULL|PK|FK|KEY|UNIQUE|INT|VARCHAR|TEXT|BOOL|DATE|DATETIME|DECIMAL|FLOAT|BIGINT|SMALLINT|CHAR)$/i.test(
          candidate,
        )
      ) {
        currentTable = candidate;
        currentTableRows = [];
        groups.push({ name: currentTable, rows: currentTableRows });
      }
    }
    if (!currentTableRows) {
      currentTable = "(table)";
      currentTableRows = [];
      groups.push({ name: currentTable, rows: currentTableRows });
    }
    const flags = (m[3] || "")
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    let key = "",
      nullable = "";
    for (const f of flags) {
      if (
        ["PK", "FK", "KEY", "UNIQUE", "PRIMARY KEY", "FOREIGN KEY"].includes(f)
      )
        key = f;
      else if (f === "NOT NULL" || f === "NULL") nullable = f;
    }
    currentTableRows.push([m[1], m[2], key, nullable]);
    cursor = re.lastIndex;
  }
  return groups;
}

// Extract "col=val, col=val" tokens into records. A new record starts when
// the first key repeats. Used for Sample Data and Expected Output rows.
function _extractKvRecords(text) {
  const tokens = [];
  const kvRe = /([A-Za-z_]\w*)\s*=\s*(.*?)(?=(?:[,\s]+[A-Za-z_]\w*\s*=)|\s*$)/g;
  let m;
  while ((m = kvRe.exec(text)) !== null) {
    tokens.push({ key: m[1], value: m[2].trim() });
  }
  if (!tokens.length) return { headers: [], rows: [] };
  const firstKey = tokens[0].key;
  const records = [];
  let current = {};
  const headers = [];
  const seen = new Set();
  let firstDone = false;
  for (const t of tokens) {
    if (t.key === firstKey && Object.keys(current).length) {
      records.push(current);
      firstDone = true;
      current = {};
    }
    current[t.key] = t.value;
    if (!firstDone && !seen.has(t.key)) {
      seen.add(t.key);
      headers.push(t.key);
    }
  }
  if (Object.keys(current).length) records.push(current);
  const rows = records.map((rec) => headers.map((h) => rec[h] ?? ""));
  return { headers, rows };
}

// Sample Data: identify table-name boundaries (bare word followed by
// "word="), then parse each run into records.
function _parseSampleDataBlock(bodyText) {
  const groups = [];
  const boundaryRe = /(?:^|\s)([A-Za-z_]\w*)(?=\s+[A-Za-z_]\w*\s*=)/g;
  const found = [];
  let bm;
  while ((bm = boundaryRe.exec(bodyText)) !== null) {
    found.push({ index: bm.index + bm[0].indexOf(bm[1]), name: bm[1] });
  }
  if (!found.length) {
    const rows = _extractKvRecords(bodyText);
    if (rows.rows.length)
      groups.push({ name: "(rows)", headers: rows.headers, rows: rows.rows });
    return groups;
  }
  for (let i = 0; i < found.length; i += 1) {
    const start = found[i].index + found[i].name.length;
    const end = i + 1 < found.length ? found[i + 1].index : bodyText.length;
    const run = bodyText.slice(start, end);
    const rows = _extractKvRecords(run);
    if (rows.rows.length)
      groups.push({
        name: found[i].name,
        headers: rows.headers,
        rows: rows.rows,
      });
  }
  return groups;
}

function _renderTable(headers, rows) {
  if (!headers.length && !rows.length) return "";
  const thead =
    "<thead><tr>" +
    headers.map((h) => `<th>${_escapeStemHtml(h)}</th>`).join("") +
    "</tr></thead>";
  const tbody =
    "<tbody>" +
    rows
      .map(
        (r) =>
          "<tr>" +
          r.map((c) => `<td>${_escapeStemHtml(c)}</td>`).join("") +
          "</tr>",
      )
      .join("") +
    "</tbody>";
  return `<table>${thead}${tbody}</table>`;
}

function _formatTableBlock(label, bodyLines) {
  const body = bodyLines.join("\n");
  if (label === "Table Structure") {
    const groups = _parseStructureBlock(body);
    if (!groups.length) return `<p>${_escapeStemHtml(body)}</p>`;

    const tableNames = new Set(groups.map((g) => g.name.toLowerCase()));
    const pkByTable = {};
    for (const g of groups) {
      const pkRow = g.rows.find(([, , k]) => /PK|PRIMARY/i.test(k));
      if (pkRow) pkByTable[g.name.toLowerCase()] = pkRow[0];
    }
    const _resolveFkTarget = (colName, ownTable) => {
      const own = ownTable.toLowerCase();
      const nm = colName.toLowerCase();
      const base = nm.replace(/_id$|_fk$/i, "");
      if (!base || base === own) return null;
      const candidates = [base, base + "s", base + "es"];
      if (base.endsWith("y")) candidates.push(base.slice(0, -1) + "ies");
      for (const c of candidates) {
        if (tableNames.has(c) && c !== own) return c;
      }
      return null;
    };

    const cards = groups
      .map((g) => {
        const cols = g.rows
          .map(([cname, ctype, ckey, cnul]) => {
            const isPk = /PK|PRIMARY/i.test(ckey);
            const isFk = /FK|FOREIGN/i.test(ckey);
            const badge = isPk
              ? '<span class="pk-tag">PK</span>'
              : isFk
                ? '<span class="fk-tag">FK</span>'
                : "";
            const nulLabel = /NOT NULL/i.test(cnul)
              ? ""
              : '<span class="nul-tag">NULL</span>';
            const nameCls = isPk
              ? "col-name pk"
              : isFk
                ? "col-name fk"
                : "col-name";
            let refAnnotation = "";
            if (isFk) {
              const target = _resolveFkTarget(cname, g.name);
              if (target) {
                const targetPk = pkByTable[target] || "id";
                refAnnotation = ` <span class="fk-ref">&rarr; ${_escapeStemHtml(target)}.${_escapeStemHtml(targetPk)}</span>`;
              }
            }
            return (
              '<div class="schema-col">' +
              `<span class="${nameCls}">${_escapeStemHtml(cname)}${badge}</span>` +
              `<span class="col-type">${_escapeStemHtml(ctype)}${nulLabel}${refAnnotation}</span>` +
              "</div>"
            );
          })
          .join("");
        return (
          '<div class="schema-card">' +
          `<div class="schema-card-head"><span class="schema-card-name">${_escapeStemHtml(g.name)}</span>` +
          '<span class="schema-card-tag">table</span></div>' +
          `<div class="schema-card-body">${cols}</div>` +
          "</div>"
        );
      })
      .join("");
    return `<div class="schema-cards">${cards}</div>`;
  }
  if (label === "Sample Data") {
    const groups = _parseSampleDataBlock(body);
    if (!groups.length) return `<p>${_escapeStemHtml(body)}</p>`;
    const out = [];
    for (const g of groups) {
      out.push(`<p><strong>${_escapeStemHtml(g.name)}</strong></p>`);
      out.push(_renderTable(g.headers, g.rows));
    }
    return out.join("\n");
  }
  if (label === "Expected Output") {
    const colMatch = body.match(
      /columns\s*:\s*(.*?)(?=(?:\n)|(?:[,\s]+[A-Za-z_]\w*\s*=)|$)/is,
    );
    let declared = null;
    let rest = body;
    if (colMatch) {
      declared = colMatch[1]
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      rest = body.slice(colMatch.index + colMatch[0].length);
    }
    const parsed = _extractKvRecords(rest);
    let headers = declared || parsed.headers;
    let rows = parsed.rows;
    if (declared && parsed.headers.length) {
      rows = parsed.rows.map((r) =>
        declared.map((h) => {
          const idx = parsed.headers.indexOf(h);
          return idx >= 0 ? r[idx] : "";
        }),
      );
    }
    if (!headers.length || !rows.length)
      return `<p>${_escapeStemHtml(body)}</p>`;
    return _renderTable(headers, rows);
  }
  return `<p>${_escapeStemHtml(body)}</p>`;
}

export function formatStem(raw) {
  if (raw == null) return "";
  const stem = String(raw).trim();
  if (!stem) return "";
  if (stem.startsWith("<")) return stem;

  const labelPattern = new RegExp(
    `^(${STEM_LABELS.map((l) => l.replace(/ /g, "\\s*")).join("|")})\\s*:?\\s*$`,
    "i",
  );
  const lines = stem.split(/\r?\n/);

  // Pass 1: bucket by label
  const buckets = {};
  const order = [];
  let preamble = "";
  let i = 0;
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    const m = trimmed.match(labelPattern);
    if (m) {
      const canonical =
        STEM_LABELS.find(
          (l) => l.toLowerCase() === m[1].trim().toLowerCase(),
        ) || m[1];
      i += 1;
      const bodyLines = [];
      while (i < lines.length) {
        const next = lines[i];
        if (next.trim().match(labelPattern)) break;
        bodyLines.push(next);
        i += 1;
      }
      while (bodyLines.length && !bodyLines[0].trim()) bodyLines.shift();
      while (bodyLines.length && !bodyLines[bodyLines.length - 1].trim())
        bodyLines.pop();
      buckets[canonical] = bodyLines;
      if (!order.includes(canonical)) order.push(canonical);
    } else {
      const preambleLines = [];
      while (i < lines.length && !lines[i].trim().match(labelPattern)) {
        preambleLines.push(lines[i]);
        i += 1;
      }
      const p = preambleLines.join("\n").trim();
      if (p && !preamble) preamble = p;
    }
  }

  const isSql =
    Object.prototype.hasOwnProperty.call(buckets, "Database Schema") ||
    Object.prototype.hasOwnProperty.call(buckets, "Table Structure");

  const styleTag =
    "<style>" +
    "details.view-schema{margin:12px 0 6px;border:1px solid #CBD5E1;" +
    "border-radius:10px;background:#F8FAFC;overflow:hidden}" +
    "details.view-schema[open]{background:#fff}" +
    "details.view-schema>summary{cursor:pointer;list-style:none;" +
    "user-select:none;padding:8px 14px;font-size:13px;font-weight:700;" +
    "color:#1D4ED8;background:#EFF6FF;display:flex;align-items:center;gap:6px}" +
    "details.view-schema>summary::-webkit-details-marker{display:none}" +
    'details.view-schema>summary::before{content:"\u25B8";display:inline-block;' +
    "transition:transform .15s;font-size:.9em}" +
    "details.view-schema[open]>summary::before{transform:rotate(90deg)}" +
    "details.view-schema>summary:hover{background:#DBEAFE}" +
    "details.view-schema .view-schema-body{padding:10px 14px 14px;" +
    "border-top:1px solid #E2E8F0}" +
    "details.view-schema h5{font-size:12px;font-weight:700;color:#0F172A;" +
    "text-transform:uppercase;letter-spacing:.04em;margin:12px 0 5px}" +
    "details.view-schema h5:first-of-type{margin-top:0}" +
    "details.view-schema table{border-collapse:collapse;margin:5px 0 8px;" +
    "background:#fff;border:1px solid #CBD5E1;border-radius:6px;overflow:hidden;" +
    "font-size:12.5px}" +
    "details.view-schema thead{background:#F1F5F9}" +
    "details.view-schema th{text-align:left;font-weight:700;color:#0F172A;" +
    "border-bottom:1px solid #CBD5E1;border-right:1px solid #E2E8F0;" +
    "padding:5px 10px}" +
    "details.view-schema th:last-child{border-right:none}" +
    "details.view-schema td{border-bottom:1px solid #E2E8F0;" +
    "border-right:1px solid #E2E8F0;color:#1E293B;padding:4px 10px;" +
    "vertical-align:top}" +
    "details.view-schema td:last-child{border-right:none}" +
    "details.view-schema tbody tr:last-child td{border-bottom:none}" +
    "details.view-schema code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;" +
    "font-size:.9em;background:#F1F5F9;border-radius:4px;padding:1px 5px;color:#0F172A}" +
    "table.sql-out-header{border-collapse:collapse;margin:8px 0;" +
    "border:2px solid #0F172A;background:#fff}" +
    "table.sql-out-header th{font-weight:700;color:#0F172A;background:#fff;" +
    "border-right:1px solid #0F172A;text-align:center;padding:7px 14px;font-size:13px}" +
    "table.sql-out-header th:last-child{border-right:none}" +
    // ── Schema-card (ER-style) styling ────────────────────────────
    ".schema-cards{display:flex;flex-wrap:wrap;gap:12px;margin:5px 0 10px}" +
    ".schema-card{flex:0 0 auto;min-width:220px;max-width:320px;" +
    "border:1px solid #94A3B8;border-radius:8px;overflow:hidden;" +
    "background:#fff;box-shadow:0 1px 2px rgba(15,23,42,0.06);font-size:12.5px;" +
    "font-family:ui-sans-serif,system-ui,sans-serif}" +
    ".schema-card-head{background:#FEF3C7;padding:5px 10px;" +
    "display:flex;align-items:center;justify-content:space-between;" +
    "border-bottom:1px solid #94A3B8}" +
    ".schema-card-name{font-weight:700;color:#78350F;font-size:13px}" +
    ".schema-card-tag{font-size:10px;font-weight:600;color:#92400E;" +
    "text-transform:lowercase;letter-spacing:.04em;opacity:.75}" +
    ".schema-card-body{padding:5px 0}" +
    ".schema-col{display:flex;align-items:center;justify-content:space-between;" +
    "padding:3px 10px;gap:10px}" +
    ".schema-col+.schema-col{border-top:1px dashed #E2E8F0}" +
    ".col-name{font-weight:600;color:#0F172A;display:flex;align-items:center;gap:5px}" +
    ".col-name.pk{color:#1D4ED8;text-decoration:underline;text-decoration-color:#1D4ED8;" +
    "text-decoration-thickness:1px;text-underline-offset:2px}" +
    ".col-name.fk{color:#7C3AED}" +
    ".col-type{color:#475569;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;" +
    "font-size:11.5px;display:flex;align-items:center;gap:5px}" +
    ".pk-tag{display:inline-block;font-size:9px;font-weight:700;" +
    "background:#1D4ED8;color:#fff;border-radius:3px;padding:1px 5px}" +
    ".fk-tag{display:inline-block;font-size:9px;font-weight:700;" +
    "background:#7C3AED;color:#fff;border-radius:3px;padding:1px 5px}" +
    ".nul-tag{display:inline-block;font-size:9px;font-weight:600;" +
    "background:#F1F5F9;color:#64748B;border-radius:3px;padding:1px 5px}" +
    ".fk-ref{color:#7C3AED;font-size:10.5px;font-weight:600;" +
    "font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;" +
    "padding-left:4px;white-space:nowrap}" +
    // ── Sample Data section (always visible, compact) ─────────────
    ".sample-data-body{margin:4px 0 10px;padding:10px 12px;" +
    "background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px}" +
    ".sample-data-body p{margin:5px 0 3px;font-weight:600;font-size:12.5px;color:#0F172A}" +
    ".sample-data-body p:first-child{margin-top:0}" +
    ".sample-data-body table{border-collapse:collapse;background:#fff;" +
    "border:1px solid #CBD5E1;border-radius:6px;overflow:hidden;" +
    "font-size:12px;margin:3px 0 8px}" +
    ".sample-data-body thead{background:#F1F5F9}" +
    ".sample-data-body th{text-align:left;font-weight:700;color:#0F172A;" +
    "border-bottom:1px solid #CBD5E1;border-right:1px solid #E2E8F0;padding:4px 9px}" +
    ".sample-data-body th:last-child{border-right:none}" +
    ".sample-data-body td{border-bottom:1px solid #E2E8F0;border-right:1px solid #E2E8F0;" +
    "color:#1E293B;padding:3px 9px;vertical-align:top}" +
    ".sample-data-body td:last-child{border-right:none}" +
    ".sample-data-body tbody tr:last-child td{border-bottom:none}" +
    "</style>";

  if (isSql) {
    const out = [styleTag];
    if (preamble) out.push(`<p>${_escapeStemHtml(preamble)}</p>`);
    if (buckets["Problem Statement"]) {
      out.push("<h4>Problem Statement</h4>");
      out.push(
        `<p>${_escapeStemHtml(buckets["Problem Statement"].join("\n"))}</p>`,
      );
    }
    if (buckets["Requirements"]) {
      out.push("<h4>Requirements</h4>");
      out.push(`<p>${_escapeStemHtml(buckets["Requirements"].join("\n"))}</p>`);
    }
    if (buckets["Expected Output"]) {
      const eoBody = buckets["Expected Output"].join("\n");
      const colMatch = eoBody.match(
        /columns\s*:\s*(.*?)(?=(?:\n)|(?:[,\s]+[A-Za-z_]\w*\s*=)|$)/is,
      );
      if (colMatch) {
        const cols = colMatch[1]
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        if (cols.length) {
          out.push("<h4>Expected Output</h4>");
          out.push(
            `<p>Your output should have ${cols.length} column${cols.length === 1 ? "" : "s"} as shown below:</p>`,
          );
          out.push(
            '<table class="sql-out-header"><thead><tr>' +
              cols.map((c) => `<th>${_escapeStemHtml(c)}</th>`).join("") +
              "</tr></thead></table>",
          );
        } else {
          out.push("<h4>Expected Output</h4>");
          out.push(
            _formatTableBlock("Expected Output", buckets["Expected Output"]),
          );
        }
      } else {
        out.push("<h4>Expected Output</h4>");
        out.push(
          _formatTableBlock("Expected Output", buckets["Expected Output"]),
        );
      }
    }
    const schemaSectionParts = [];
    if (buckets["Database Schema"]) {
      const body = buckets["Database Schema"].join("\n");
      const shownAsCode = body
        .split(/\n+/)
        .map((ln) => ln.trim())
        .filter(Boolean)
        .map((ln) => `<p><code>${_escapeStemHtml(ln)}</code></p>`)
        .join("");
      if (shownAsCode) schemaSectionParts.push(shownAsCode);
    }
    if (buckets["Table Structure"]) {
      schemaSectionParts.push(
        _formatTableBlock("Table Structure", buckets["Table Structure"]),
      );
    }

    if (schemaSectionParts.length) {
      out.push("<h4>Schema</h4>");
      out.push(schemaSectionParts.join("\n"));
    }

    if (buckets["Sample Data"]) {
      out.push("<h4>Sample Data</h4>");
      out.push(
        '<div class="sample-data-body">' +
          _formatTableBlock("Sample Data", buckets["Sample Data"]) +
          "</div>",
      );
    }
    return out.join("\n");
  }

  // Non-SQL: inline flow
  const out = [];
  if (preamble) out.push(`<p>${_escapeStemHtml(preamble)}</p>`);
  for (const canonical of order) {
    const bodyLines = buckets[canonical] || [];
    out.push(`<h4>${_escapeStemHtml(canonical)}</h4>`);
    if (bodyLines.length) {
      if (STEM_PRE_LABELS.has(canonical)) {
        out.push(`<pre>${_escapeStemHtml(bodyLines.join("\n"))}</pre>`);
      } else if (STEM_TABLE_LABELS.has(canonical)) {
        out.push(_formatTableBlock(canonical, bodyLines));
      } else {
        out.push(`<p>${_escapeStemHtml(bodyLines.join("\n"))}</p>`);
      }
    }
  }
  return out.join("\n");
}

export function StemEditor({ initial, onCommit, disabled }) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(initial ?? "");

  React.useEffect(() => {
    setDraft(initial ?? "");
  }, [initial]);

  const commit = () => {
    setEditing(false);
    const next = (draft ?? "").trim();
    const prev = (initial ?? "").trim();
    if (next && next !== prev) onCommit(next);
  };

  if (editing) {
    return (
      <TextField
        autoFocus
        fullWidth
        multiline
        variant="outlined"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setDraft(initial ?? "");
            setEditing(false);
          }
        }}
        disabled={disabled}
        minRows={4}
        InputProps={{
          sx: {
            fontSize: "0.85rem",
            fontFamily:
              'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
            color: T.textPrimary,
            lineHeight: 1.55,
            p: 1.25,
            borderRadius: "10px",
            bgcolor: "#FAFBFD",
          },
        }}
        sx={{ mb: 1.5 }}
      />
    );
  }

  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={() => !disabled && setEditing(true)}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !disabled) {
          e.preventDefault();
          setEditing(true);
        }
      }}
      title="Click to edit"
      sx={{
        cursor: disabled ? "default" : "text",
        borderRadius: "10px",
        border: "1px solid transparent",
        p: 1.25,
        mb: 1.5,
        transition: "background 0.15s, border-color 0.15s",
        "&:hover": disabled
          ? {}
          : { bgcolor: "#F8FAFC", borderColor: T.border },
        fontSize: "0.95rem",
        color: T.textPrimary,
        lineHeight: 1.6,
        "& h4": {
          fontSize: "0.78rem",
          fontWeight: 700,
          color: T.textPrimary,
          textTransform: "uppercase",
          letterSpacing: "0.03em",
          mt: 1.5,
          mb: 0.5,
        },
        "& h4:first-of-type": { mt: 0 },
        "& p": { m: 0, mb: 0.75, fontWeight: 500, whiteSpace: "pre-wrap" },
        "& ul, & ol": { m: 0, mb: 0.75, pl: 3 },
        "& li": { mb: 0.15 },
        "& code": {
          fontFamily:
            'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
          fontSize: "0.85em",
          background: "#F1F5F9",
          borderRadius: "4px",
          px: 0.6,
          py: 0.15,
          color: T.textPrimary,
        },
        "& pre": {
          fontFamily:
            'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
          fontSize: "0.82em",
          background: "#0F172A",
          color: "#E2E8F0",
          borderRadius: "6px",
          px: 1.25,
          py: 1,
          m: 0,
          mb: 1,
          overflowX: "auto",
          whiteSpace: "pre",
        },
        "& table": {
          borderCollapse: "collapse",
          width: "auto",
          minWidth: "50%",
          maxWidth: "100%",
          my: 0.75,
          fontSize: "0.82rem",
          background: "#FFFFFF",
          border: `1px solid ${T.border}`,
          borderRadius: "6px",
          overflow: "hidden",
          display: "table",
        },
        "& thead": { background: "#F1F5F9" },
        "& th": {
          textAlign: "left",
          fontWeight: 700,
          color: T.textPrimary,
          borderBottom: `1px solid ${T.border}`,
          borderRight: "1px solid #E2E8F0",
          px: 1.25,
          py: 0.6,
        },
        "& th:last-child": { borderRight: "none" },
        "& td": {
          borderBottom: "1px solid #E2E8F0",
          borderRight: "1px solid #E2E8F0",
          color: "#1E293B",
          px: 1.25,
          py: 0.5,
          verticalAlign: "top",
        },
        "& td:last-child": { borderRight: "none" },
        "& tbody tr:last-child td": { borderBottom: "none" },
        "& strong": { fontWeight: 700, color: T.textPrimary },
      }}
      dangerouslySetInnerHTML={{
        __html: initial
          ? formatStem(initial)
          : '<p style="color:#94A3B8;font-style:italic">(empty stem — click to edit)</p>',
      }}
    />
  );
}