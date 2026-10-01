import React, { useState, useMemo, useEffect, useRef } from 'react';
import NoiseSuppressionService from '@/services/noiseSupression';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Stack,
  IconButton,
  LinearProgress,
  Chip,
  Radio,
  RadioGroup,
  FormControl,
  FormControlLabel,
  Checkbox,
  FormGroup,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Drawer,
  Grid,
  Alert,
  Skeleton,
  Tooltip,
  CircularProgress,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  ArrowBackOutlined,
  ArrowForwardOutlined,
  TimerOutlined,
  CheckCircleOutlined,
  MenuOutlined,
  CloseOutlined,
  SendOutlined,
  WarningAmberOutlined,
  ErrorOutlined,
  RadioButtonUncheckedOutlined,
  BoltOutlined,
  ArrowUpwardOutlined,
  ArrowDownwardOutlined,
  TaskAltOutlined,
  LockOutlined,
  DragIndicatorOutlined,
  ReplayOutlined,
  AssignmentTurnedInOutlined,
  CloudDoneOutlined,
  CloudSyncOutlined,
  CloudOffOutlined,
  WifiOffOutlined,
  RestoreOutlined,
} from '@mui/icons-material';

import { useAIAssessmentTest, isAnswerAttempted } from '@/hooks/jobseeker/useAIAssessmentTest';

import CodeEditor from './CodeEditor';
import TestWatermark from './TestWatermark';
import AssessmentInstructions from './AssessmentInstructions';
import ManualTestInstructions from './ManualtestInstructions';
import useAssessmentProctoring from '@/hooks/jobseeker/useAssessmentProctoring';

const FONT    = "'Jost','DM Sans',sans-serif";
const NAVY    = '#022124';   
const NAVY_DK = '#0A3A38';   
const MUTED   = '#7A7E76';   
const PAGE_BG = '#F6F8F3';   
const SIDEBAR_WIDTH = 340;

const BRAND = {
  pine:         '#022124',
  pineDark:     '#0A3A38',
  sage:         '#7F9E7E',
  sageDark:     '#6C8B6B',
  sageText:     '#5E815D',
  sageSoft:     '#EDF3EC',
  sageHover:    '#DDE9DC',
  border:       '#E7EAE3',
  borderStrong: '#D8DDD4',
  cream:        '#F6F8F3',
  surface:      '#FFFFFF',
  ink:          '#1F1F1F',
  muted:        '#55584F',
  faint:        '#7A7E76',
  amber:        '#A35A2D',
  amberDark:    '#8A4A24',
  amberSoft:    '#FBF0E7',
  amberSoft2:   '#F0E0B8',
  done:         '#3E6E3E',
  doneSoft:     '#EAF2E9',
  danger:       '#A63D2F',
  dangerSoft:   '#FAEAE8',
};

const DIFFICULTY_META = {
  easy:   { color: BRAND.done,   bg: BRAND.doneSoft,   label: 'Easy'   },
  medium: { color: BRAND.amber,  bg: BRAND.amberSoft,  label: 'Medium' },
  hard:   { color: BRAND.danger, bg: BRAND.dangerSoft, label: 'Hard'   },
};

const TYPE_LABEL = {
  mcq:          'MCQ',
  multi_select: 'Multi-Select',
  true_false:   'True / False',
  fill_blank:   'Fill in the Blank',
  short_answer: 'Short Answer',
  coding:       'Coding',
  match:        'Match',
  sequence:     'Sequence',
  scenario:     'Scenario',
  custom:       'Custom',
};

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}


const STEM_LABELS = [
  'Problem Statement',
  'Input Format',
  'Output Format',
  'Sample Input',
  'Sample Output',
  'Explanation',
  'Database Schema',
  'Table Structure',
  'Sample Data',
  'Requirements',
  'Expected Output',
];
const STEM_PRE_LABELS = new Set(['Sample Input', 'Sample Output']);
const STEM_TABLE_LABELS = new Set(['Table Structure', 'Sample Data', 'Expected Output']);
const _escapeHtml = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function _splitTableSections(bodyLines) {
  const sections = [];
  let current = null;
  for (const raw of bodyLines) {
    const line = raw.replace(/\r$/, '');
    if (!line.trim()) {
      if (current) { sections.push(current); current = null; }
      continue;
    }
    const isIndentedRow = /^ {2,}\S/.test(line);
    if (!isIndentedRow) {
      // New section header
      if (current) sections.push(current);
      current = { header: line.trim(), rows: [] };
    } else if (current) {
      current.rows.push(line.replace(/^\s+/, ''));
    } else {
    
      sections.push({ header: null, rows: [line.trim()] });
    }
  }
  if (current) sections.push(current);
  return sections;
}


const COL_DEF_RE = new RegExp(
  '(?:^|\\s)' +
  '([A-Za-z_]\\w*)' +               // column name
  '\\s*:\\s*' +
  '([A-Za-z]+(?:\\(\\s*\\d+(?:\\s*,\\s*\\d+)?\\s*\\))?)' +  // TYPE or TYPE(n)
  '((?:\\s*,\\s*(?:PK|FK|KEY|UNIQUE|NOT NULL|NULL|PRIMARY KEY|FOREIGN KEY))*)',
  'gi',
);

function _parseStructureBlock(bodyText) {
  const groups = [];
  let currentTable = null;
  let currentTableRows = null;

  let cursor = 0;
  const re = new RegExp(COL_DEF_RE.source, 'gi');
  let m;
  while ((m = re.exec(bodyText)) !== null) {
    const between = bodyText.slice(cursor, m.index);
    const idents = between.match(/[A-Za-z_]\w*/g) || [];
    if (idents.length) {
      const candidate = idents[idents.length - 1];

      if (candidate && candidate !== currentTable && !/^(NOT|NULL|PK|FK|KEY|UNIQUE|INT|VARCHAR|TEXT|BOOL|DATE|DATETIME|DECIMAL|FLOAT|BIGINT|SMALLINT|CHAR)$/i.test(candidate)) {
        currentTable = candidate;
        currentTableRows = [];
        groups.push({ name: currentTable, rows: currentTableRows });
      }
    }
    if (!currentTableRows) {
      currentTable = '(table)';
      currentTableRows = [];
      groups.push({ name: currentTable, rows: currentTableRows });
    }
    const name = m[1];
    const type = m[2];
    const flags = (m[3] || '').split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
    let key = '';
    let nullable = '';
    for (const f of flags) {
      if (['PK', 'FK', 'KEY', 'UNIQUE', 'PRIMARY KEY', 'FOREIGN KEY'].includes(f)) key = f;
      else if (f === 'NOT NULL' || f === 'NULL') nullable = f;
    }
    currentTableRows.push([name, type, key, nullable]);
    cursor = re.lastIndex;
  }
  return groups;
}

function _parseSampleDataBlock(bodyText) {
  const groups = [];
  const tableBoundaries = [];
  const boundaryRe = /(?:^|\s)([A-Za-z_]\w*)(?=\s+[A-Za-z_]\w*\s*=)/g;
  // Find bare words followed by "col=" — those are candidate table names
  let bm;
  const found = [];
  while ((bm = boundaryRe.exec(bodyText)) !== null) {
    found.push({ index: bm.index + bm[0].indexOf(bm[1]), name: bm[1] });
  }
  // Fallback: no boundaries → single unnamed group
  if (!found.length) {
    const rows = _extractKvRecords(bodyText);
    if (rows.length) groups.push({ name: '(rows)', headers: rows.headers, rows: rows.rows });
    return groups;
  }

  for (let i = 0; i < found.length; i += 1) {
    const start = found[i].index + found[i].name.length;
    const end = i + 1 < found.length ? found[i + 1].index : bodyText.length;
    const run = bodyText.slice(start, end);
    const rows = _extractKvRecords(run);
    if (rows.rows.length) groups.push({ name: found[i].name, headers: rows.headers, rows: rows.rows });
  }
  return groups;
}


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
  const seenInFirst = new Set();
  let firstRecordDone = false;
  for (const t of tokens) {
    if (t.key === firstKey && Object.keys(current).length) {
      records.push(current);
      firstRecordDone = true;
      current = {};
    }
    current[t.key] = t.value;
    if (!firstRecordDone && !seenInFirst.has(t.key)) {
      seenInFirst.add(t.key);
      headers.push(t.key);
    }
  }
  if (Object.keys(current).length) records.push(current);
  const rows = records.map((rec) => headers.map((h) => rec[h] ?? ''));
  return { headers, rows };
}

function _renderTable(headers, rows) {
  if (!headers.length && !rows.length) return '';
  const thead =
    '<thead><tr>' +
    headers.map((h) => `<th>${_escapeHtml(h)}</th>`).join('') +
    '</tr></thead>';
  const tbody =
    '<tbody>' +
    rows
      .map(
        (r) =>
          '<tr>' +
          r.map((cell) => `<td>${_escapeHtml(cell)}</td>`).join('') +
          '</tr>',
      )
      .join('') +
    '</tbody>';
  return `<table>${thead}${tbody}</table>`;
}


function _formatTableBlock(label, bodyLines) {
  const body = bodyLines.join('\n');

  if (label === 'Table Structure') {
   
    const groups = _parseStructureBlock(body);
    if (!groups.length) return `<p>${_escapeHtml(body)}</p>`;

    const tableNames = new Set(groups.map((g) => g.name.toLowerCase()));
    const pkByTable = {};
    for (const g of groups) {
      const pkRow = g.rows.find(([, , k]) => /PK|PRIMARY/i.test(k));
      if (pkRow) pkByTable[g.name.toLowerCase()] = pkRow[0];
    }
    const _resolveFkTarget = (colName, ownTable) => {
      const own = ownTable.toLowerCase();
      const nm = colName.toLowerCase();
      // Strip trailing _id / _fk to get the base name
      const base = nm.replace(/_id$|_fk$/i, '');
      if (!base || base === own) return null;
      // Try exact, plural s, plural es, y→ies plural
      const candidates = [base, base + 's', base + 'es'];
      if (base.endsWith('y')) candidates.push(base.slice(0, -1) + 'ies');
      for (const c of candidates) {
        if (tableNames.has(c) && c !== own) return c;
      }
      return null;
    };

    const cards = groups.map((g) => {
      const cols = g.rows.map(([cname, ctype, ckey, cnul]) => {
        const isPk = /PK|PRIMARY/i.test(ckey);
        const isFk = /FK|FOREIGN/i.test(ckey);
        const badge =
          isPk ? '<span class="pk-tag">PK</span>' :
          isFk ? '<span class="fk-tag">FK</span>' : '';
        const nulLabel = /NOT NULL/i.test(cnul) ? '' : '<span class="nul-tag">NULL</span>';
        const nameCls = isPk ? 'col-name pk' : (isFk ? 'col-name fk' : 'col-name');
        // FK reference annotation (heuristic)
        let refAnnotation = '';
        if (isFk) {
          const target = _resolveFkTarget(cname, g.name);
          if (target) {
            const targetPk = pkByTable[target] || 'id';
            refAnnotation = ` <span class="fk-ref">&rarr; ${_escapeHtml(target)}.${_escapeHtml(targetPk)}</span>`;
          }
        }
        return (
          '<div class="schema-col">' +
            `<span class="${nameCls}">${_escapeHtml(cname)}${badge}</span>` +
            `<span class="col-type">${_escapeHtml(ctype)}${nulLabel}${refAnnotation}</span>` +
          '</div>'
        );
      }).join('');
      return (
        '<div class="schema-card">' +
          `<div class="schema-card-head"><span class="schema-card-name">${_escapeHtml(g.name)}</span>` +
          '<span class="schema-card-tag">table</span></div>' +
          `<div class="schema-card-body">${cols}</div>` +
        '</div>'
      );
    }).join('');
    return `<div class="schema-cards">${cards}</div>`;
  }

  if (label === 'Sample Data') {
    const groups = _parseSampleDataBlock(body);
    if (!groups.length) return `<p>${_escapeHtml(body)}</p>`;
    const out = [];
    for (const g of groups) {
      out.push(`<p><strong>${_escapeHtml(g.name)}</strong></p>`);
      out.push(_renderTable(g.headers, g.rows));
    }
    return out.join('\n');
  }

  if (label === 'Expected Output') {
    const colMatch = body.match(/columns\s*:\s*(.*?)(?=(?:\n)|(?:[,\s]+[A-Za-z_]\w*\s*=)|$)/is);
    let declared = null;
    let rest = body;
    if (colMatch) {
      declared = colMatch[1].split(',').map((s) => s.trim()).filter(Boolean);
      rest = body.slice(colMatch.index + colMatch[0].length);
    }
    const parsed = _extractKvRecords(rest);
    let headers = declared || parsed.headers;
    let rows = parsed.rows;
    if (declared && parsed.headers.length) {
      // Align parsed rows to declared header order
      rows = parsed.rows.map((r) =>
        declared.map((h) => {
          const idx = parsed.headers.indexOf(h);
          return idx >= 0 ? r[idx] : '';
        }),
      );
    }
    if (!headers.length || !rows.length) {
      return `<p>${_escapeHtml(body)}</p>`;
    }
    return _renderTable(headers, rows);
  }

  return `<p>${_escapeHtml(body)}</p>`;
}

function formatStem(raw) {
  if (raw == null) return '';
  const stem = String(raw).trim();
  if (!stem) return '';
  if (stem.startsWith('<')) return stem;

  const labelPattern = new RegExp(
    `^(${STEM_LABELS.map((l) => l.replace(/ /g, '\\s*')).join('|')})\\s*:?\\s*$`,
    'i',
  );
  const lines = stem.split(/\r?\n/);

  const buckets = {};     
  const order = [];      
  let preamble = '';
  let i = 0;
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    const m = trimmed.match(labelPattern);
    if (m) {
      const canonical =
        STEM_LABELS.find((l) => l.toLowerCase() === m[1].trim().toLowerCase()) || m[1];
      i += 1;
      const bodyLines = [];
      while (i < lines.length) {
        const next = lines[i];
        if (next.trim().match(labelPattern)) break;
        bodyLines.push(next);
        i += 1;
      }
      while (bodyLines.length && !bodyLines[0].trim()) bodyLines.shift();
      while (bodyLines.length && !bodyLines[bodyLines.length - 1].trim()) bodyLines.pop();
      buckets[canonical] = bodyLines;
      if (!order.includes(canonical)) order.push(canonical);
    } else {
      const preambleLines = [];
      while (i < lines.length && !lines[i].trim().match(labelPattern)) {
        preambleLines.push(lines[i]);
        i += 1;
      }
      const p = preambleLines.join('\n').trim();
      if (p && !preamble) preamble = p;
    }
  }

  const isSql =
    Object.prototype.hasOwnProperty.call(buckets, 'Database Schema') ||
    Object.prototype.hasOwnProperty.call(buckets, 'Table Structure');

  if (isSql) {
    const out = [];
    if (preamble) out.push(`<p>${_escapeHtml(preamble)}</p>`);

    // Problem Statement
    if (buckets['Problem Statement']) {
      out.push('<h4>Problem Statement</h4>');
      out.push(`<p>${_escapeHtml(buckets['Problem Statement'].join('\n'))}</p>`);
    }

    // Requirements
    if (buckets['Requirements']) {
      out.push('<h4>Requirements</h4>');
      out.push(`<p>${_escapeHtml(buckets['Requirements'].join('\n'))}</p>`);
    }

    // Expected Output — Cognizant-style: intro line + header-only table
    if (buckets['Expected Output']) {
      const eoBody = buckets['Expected Output'].join('\n');
      const colMatch = eoBody.match(
        /columns\s*:\s*(.*?)(?=(?:\n)|(?:[,\s]+[A-Za-z_]\w*\s*=)|$)/is,
      );
      if (colMatch) {
        const cols = colMatch[1].split(',').map((s) => s.trim()).filter(Boolean);
        if (cols.length) {
          out.push('<h4>Expected Output</h4>');
          out.push(
            `<p>Your output should have ${cols.length} column${cols.length === 1 ? '' : 's'} as shown below:</p>`,
          );
          out.push(
            '<table class="sql-out-header"><thead><tr>' +
              cols.map((c) => `<th>${_escapeHtml(c)}</th>`).join('') +
              '</tr></thead></table>',
          );
        } else {
          out.push('<h4>Expected Output</h4>');
          out.push(_formatTableBlock('Expected Output', buckets['Expected Output']));
        }
      } else {
        out.push('<h4>Expected Output</h4>');
        out.push(_formatTableBlock('Expected Output', buckets['Expected Output']));
      }
    }

    const schemaSectionParts = [];
    if (buckets['Database Schema']) {
      const body = buckets['Database Schema'].join('\n');
      const shownAsCode = body
        .split(/\n+/)
        .map((ln) => ln.trim())
        .filter(Boolean)
        .map((ln) => `<p><code>${_escapeHtml(ln)}</code></p>`)
        .join('');
      if (shownAsCode) schemaSectionParts.push(shownAsCode);
    }
    if (buckets['Table Structure']) {
      schemaSectionParts.push(_formatTableBlock('Table Structure', buckets['Table Structure']));
    }

    if (schemaSectionParts.length || buckets['Sample Data']) {
      out.push(
        '<style>' +
          'details.view-schema{margin:14px 0 8px;border:1px solid #D8DDD4;' +
          'border-radius:10px;background:#F6F8F3;overflow:hidden}' +
          'details.view-schema[open]{background:#fff}' +
          'details.view-schema>summary{cursor:pointer;list-style:none;' +
          'user-select:none;padding:10px 16px;font-size:14px;font-weight:700;' +
          'color:#5E815D;background:#EDF3EC;display:flex;align-items:center;gap:6px}' +
          'details.view-schema>summary::-webkit-details-marker{display:none}' +
          'details.view-schema>summary::before{content:"\u25B8";display:inline-block;' +
          'transition:transform .15s;font-size:.9em}' +
          'details.view-schema[open]>summary::before{transform:rotate(90deg)}' +
          'details.view-schema>summary:hover{background:#DDE9DC}' +
          'details.view-schema .view-schema-body{padding:12px 16px 16px;' +
          'border-top:1px solid #E7EAE3}' +
          'details.view-schema h5{font-size:13px;font-weight:700;color:#1F1F1F;' +
          'text-transform:uppercase;letter-spacing:.04em;margin:14px 0 6px}' +
          'details.view-schema h5:first-of-type{margin-top:0}' +
          'details.view-schema table{border-collapse:collapse;margin:6px 0 10px;' +
          'background:#fff;border:1px solid #D8DDD4;border-radius:6px;overflow:hidden;' +
          'font-size:13.5px}' +
          'details.view-schema thead{background:#F6F8F3}' +
          'details.view-schema th{text-align:left;font-weight:700;color:#1F1F1F;' +
          'border-bottom:1px solid #D8DDD4;border-right:1px solid #E7EAE3;' +
          'padding:6px 12px}' +
          'details.view-schema th:last-child{border-right:none}' +
          'details.view-schema td{border-bottom:1px solid #E7EAE3;' +
          'border-right:1px solid #E7EAE3;color:#1F1F1F;padding:5px 12px;' +
          'vertical-align:top}' +
          'details.view-schema td:last-child{border-right:none}' +
          'details.view-schema tbody tr:last-child td{border-bottom:none}' +
          'details.view-schema code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;' +
          'font-size:.9em;background:#F6F8F3;border-radius:4px;padding:2px 6px;color:#1F1F1F}' +
          // Expected Output header table
          'table.sql-out-header{border-collapse:collapse;margin:10px 0;' +
          'border:2px solid #1F1F1F;background:#fff}' +
          'table.sql-out-header th{font-weight:700;color:#1F1F1F;background:#fff;' +
          'border-right:1px solid #1F1F1F;text-align:center;padding:8px 16px;font-size:14px}' +
          'table.sql-out-header th:last-child{border-right:none}' +
          // Preamble text next to Database Schema code chip
          'p code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;' +
          'font-size:.9em;background:#F6F8F3;border-radius:4px;padding:2px 8px;color:#1F1F1F}' +
          // ── Schema-card (ER-style) styling — always visible ────────────
          '.schema-cards{display:flex;flex-wrap:wrap;gap:14px;margin:6px 0 12px}' +
          '.schema-card{flex:0 0 auto;min-width:240px;max-width:340px;' +
          'border:1px solid #7A7E76;border-radius:8px;overflow:hidden;' +
          'background:#fff;box-shadow:0 1px 2px rgba(15,23,42,0.06);font-size:13px;' +
          'font-family:ui-sans-serif,system-ui,sans-serif}' +
          '.schema-card-head{background:#FBF0E7;padding:6px 12px;' +
          'display:flex;align-items:center;justify-content:space-between;' +
          'border-bottom:1px solid #7A7E76}' +
          '.schema-card-name{font-weight:700;color:#8A4A24;font-size:14px}' +
          '.schema-card-tag{font-size:10px;font-weight:600;color:#A35A2D;' +
          'text-transform:lowercase;letter-spacing:.04em;opacity:.75}' +
          '.schema-card-body{padding:6px 0}' +
          '.schema-col{display:flex;align-items:center;justify-content:space-between;' +
          'padding:4px 12px;gap:12px}' +
          '.schema-col+.schema-col{border-top:1px dashed #E7EAE3}' +
          '.col-name{font-weight:600;color:#1F1F1F;display:flex;align-items:center;gap:6px}' +
          '.col-name.pk{color:#5E815D;text-decoration:underline;text-decoration-color:#5E815D;' +
          'text-decoration-thickness:1px;text-underline-offset:2px}' +
          '.col-name.fk{color:#A35A2D}' +
          '.col-type{color:#55584F;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;' +
          'font-size:12px;display:flex;align-items:center;gap:6px}' +
          '.pk-tag{display:inline-block;font-size:9px;font-weight:700;' +
          'background:#5E815D;color:#fff;border-radius:3px;padding:1px 5px;letter-spacing:.03em}' +
          '.fk-tag{display:inline-block;font-size:9px;font-weight:700;' +
          'background:#A35A2D;color:#fff;border-radius:3px;padding:1px 5px;letter-spacing:.03em}' +
          '.nul-tag{display:inline-block;font-size:9px;font-weight:600;' +
          'background:#F6F8F3;color:#6F7470;border-radius:3px;padding:1px 5px}' +
          '.fk-ref{color:#A35A2D;font-size:11px;font-weight:600;' +
          'font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;' +
          'padding-left:4px;white-space:nowrap}' +
          // ── Sample Data section (always visible, compact) ─────────────
          '.sample-data-body{margin:4px 0 12px;padding:12px 14px;' +
          'background:#F6F8F3;border:1px solid #E7EAE3;border-radius:8px}' +
          '.sample-data-body p{margin:6px 0 4px;font-weight:600;font-size:13px;color:#1F1F1F}' +
          '.sample-data-body p:first-child{margin-top:0}' +
          '.sample-data-body table{border-collapse:collapse;background:#fff;' +
          'border:1px solid #D8DDD4;border-radius:6px;overflow:hidden;' +
          'font-size:12.5px;margin:4px 0 10px}' +
          '.sample-data-body thead{background:#F6F8F3}' +
          '.sample-data-body th{text-align:left;font-weight:700;color:#1F1F1F;' +
          'border-bottom:1px solid #D8DDD4;border-right:1px solid #E7EAE3;padding:5px 10px}' +
          '.sample-data-body th:last-child{border-right:none}' +
          '.sample-data-body td{border-bottom:1px solid #E7EAE3;border-right:1px solid #E7EAE3;' +
          'color:#1F1F1F;padding:4px 10px;vertical-align:top}' +
          '.sample-data-body td:last-child{border-right:none}' +
          '.sample-data-body tbody tr:last-child td{border-bottom:none}' +
        '</style>',
      );

      if (schemaSectionParts.length) {
        out.push('<h4>Schema</h4>');
        out.push(schemaSectionParts.join('\n'));
      }

      if (buckets['Sample Data']) {
        out.push('<h4>Sample Data</h4>');
        out.push(
          '<div class="sample-data-body">' +
            _formatTableBlock('Sample Data', buckets['Sample Data']) +
          '</div>',
        );
      }
    }

    return out.join('\n');
  }

  const out = [];
  if (preamble) out.push(`<p>${_escapeHtml(preamble)}</p>`);
  for (const canonical of order) {
    const bodyLines = buckets[canonical] || [];
    out.push(`<h4>${_escapeHtml(canonical)}</h4>`);
    if (bodyLines.length) {
      if (STEM_PRE_LABELS.has(canonical)) {
        out.push(`<pre>${_escapeHtml(bodyLines.join('\n'))}</pre>`);
      } else if (STEM_TABLE_LABELS.has(canonical)) {
        out.push(_formatTableBlock(canonical, bodyLines));
      } else {
        out.push(`<p>${_escapeHtml(bodyLines.join('\n'))}</p>`);
      }
    }
  }
  return out.join('\n');
}

function MatchInput({ question, value, onChange }) {
  const content  = question.content ?? {};
  const rawPairs = content.match_pairs ?? content.correct_answer ?? [];
  const pairs    = Array.isArray(rawPairs) ? rawPairs : [];
  const lefts    = pairs.map((p) => p?.left ?? '');

  const shuffledRights = useMemo(() => {
    const rights = pairs.map((p) => p?.right ?? '').filter(Boolean);
    return [...rights].sort(() => Math.random() - 0.5);
  }, [question.id]);

  const selected = Array.isArray(value) ? value : [];

  const updatePair = (left, right) => {
    const others = selected.filter((p) => p.left !== left);
    const next   = right ? [...others, { left, right }] : others;
    onChange(next.length ? next : null);
  };

  if (pairs.length === 0) {
    return (
      <Alert severity="warning" sx={{ mt: 3, borderRadius: 2 }}>
        No pairs configured for this question.
      </Alert>
    );
  }

  return (
    <Stack spacing={1.5} sx={{ mt: 3 }}>
      <Typography
        sx={{
          fontSize: 11.5, color: MUTED, mb: 0.5,
          fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6,
        }}
      >
        Match each item on the left with the correct option on the right
      </Typography>

      {lefts.map((left, i) => {
        const current = selected.find((p) => p.left === left)?.right ?? '';
        return (
          <Stack key={`${question.id}-${i}`} direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{
                flex: 1, p: '12px 14px', borderRadius: 2,
                border: '1.5px solid #E7EAE3', bgcolor: '#F6F8F3',
                fontSize: 14.5, color: '#1F1F1F', fontWeight: 500,
              }}
            >
              {left}
            </Box>
            <Typography sx={{ color: MUTED, flexShrink: 0, fontSize: 18 }}>→</Typography>
            <Box sx={{ flex: 1 }}>
              <select
                value={current}
                onChange={(e) => updatePair(left, e.target.value)}
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: 8,
                  border: `1.5px solid ${current ? NAVY : '#E7EAE3'}`,
                  fontSize: 14.5, color: '#1F1F1F',
                  backgroundColor: current ? `${NAVY}0A` : '#fff',
                  cursor: 'pointer', outline: 'none',
                  boxShadow: current ? `0 0 0 3px ${NAVY}14` : 'none',
                  transition: 'all .15s ease',
                }}
              >
                <option value="">— Select match —</option>
                {shuffledRights.map((r, ri) => (
                  <option key={ri} value={r}>{r}</option>
                ))}
              </select>
            </Box>
          </Stack>
        );
      })}
    </Stack>
  );
}

function SequenceInput({ question, value, onChange }) {
  const content     = question.content ?? {};
  const sourceItems = content.sequence_items ?? content.correct_answer ?? [];
  const items       = Array.isArray(sourceItems) ? sourceItems : [];

  const shuffled = useMemo(() => {
    return [...items].sort(() => Math.random() - 0.5);
  }, [question.id]);

  useEffect(() => {
    if (!Array.isArray(value) || value.length !== items.length) {
      onChange(shuffled);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id]);

  const currentOrder =
    Array.isArray(value) && value.length === items.length ? value : shuffled;

  const rowRefs = useRef({});
  const [dragState, setDragState] = useState(null);

  const move = (from, to) => {
    if (to < 0 || to >= currentOrder.length) return;
    const itemA = currentOrder[from];
    const itemB = currentOrder[to];
    const elA   = rowRefs.current[itemA];
    const elB   = rowRefs.current[itemB];
    const topA  = elA ? elA.getBoundingClientRect().top : null;
    const topB  = elB ? elB.getBoundingClientRect().top : null;
    const next = [...currentOrder];
    [next[from], next[to]] = [next[to], next[from]];
    onChange(next);
    window.requestAnimationFrame(() => {
      const slide = (el, prevTop) => {
        if (!el || prevTop == null || typeof el.animate !== 'function') return;
        const newTop = el.getBoundingClientRect().top;
        const dy = prevTop - newTop;
        if (dy === 0) return;
        el.animate(
          [{ transform: `translateY(${dy}px)` }, { transform: 'translateY(0px)' }],
          { duration: 260, easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)' },
        );
      };
      slide(elA, topA);
      slide(elB, topB);
    });
  };

  const handleDragStart = (e, item, index) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    const el = rowRefs.current[item];
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const rowStep = rect.height + 10;
    setDragState({
      item, originalIndex: index, hoverIndex: index,
      startY: e.clientY, currentY: e.clientY, rowStep, pointerId: e.pointerId,
    });
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
  };

  const handleDragMove = (e) => {
    setDragState((prev) => {
      if (!prev || e.pointerId !== prev.pointerId) return prev;
      const dy = e.clientY - prev.startY;
      const shift = Math.round(dy / prev.rowStep);
      const nextHover = Math.max(0, Math.min(currentOrder.length - 1, prev.originalIndex + shift));
      if (e.clientY === prev.currentY && nextHover === prev.hoverIndex) return prev;
      return { ...prev, currentY: e.clientY, hoverIndex: nextHover };
    });
  };

  const handleDragEnd = (e) => {
    setDragState((prev) => {
      if (!prev) return null;
      try { e.currentTarget.releasePointerCapture(prev.pointerId); } catch (_) {}
      if (prev.hoverIndex !== prev.originalIndex) {
        const next = [...currentOrder];
        const [moved] = next.splice(prev.originalIndex, 1);
        next.splice(prev.hoverIndex, 0, moved);
        Promise.resolve().then(() => onChange(next));
      }
      return null;
    });
  };

  if (items.length === 0) {
    return (
      <Alert severity="warning" sx={{ mt: 3, borderRadius: 2 }}>
        No items configured for this question.
      </Alert>
    );
  }

  return (
    <Stack spacing={1.25} sx={{ mt: 3 }}>
      <Typography
        sx={{
          fontSize: 11.5, color: MUTED, mb: 0.5,
          fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6,
        }}
      >
        Drag the handle or use the arrows to arrange — top is first
      </Typography>

      {currentOrder.map((item, i) => {
        let translateY = 0;
        let isDragging = false;
        if (dragState) {
          if (item === dragState.item) {
            isDragging = true;
            translateY = dragState.currentY - dragState.startY;
          } else {
            const o = dragState.originalIndex;
            const h = dragState.hoverIndex;
            if (h > o && i > o && i <= h) translateY = -dragState.rowStep;
            else if (h < o && i >= h && i < o) translateY = dragState.rowStep;
          }
        }

        return (
          <Stack
            key={`${question.id}-${item}`}
            ref={(el) => {
              if (el) rowRefs.current[item] = el;
              else delete rowRefs.current[item];
            }}
            direction="row" spacing={1} alignItems="center"
            sx={{
              p: '10px 14px',
              borderRadius: 2,
              border: '1.5px solid',
              borderColor: isDragging ? NAVY : '#E7EAE3',
              bgcolor: '#fff',
              position: 'relative',
              transform: `translateY(${translateY}px)`,
              transition: isDragging
                ? 'none'
                : 'transform .2s cubic-bezier(0.22, 0.61, 0.36, 1), box-shadow .15s ease, border-color .15s ease',
              zIndex: isDragging ? 10 : 'auto',
              boxShadow: isDragging ? '0 14px 32px rgba(30, 51, 88, 0.28)' : 'none',
              opacity: isDragging ? 0.96 : 1,
              willChange: dragState ? 'transform' : 'auto',
              '&:hover': isDragging ? {} : { borderColor: NAVY, boxShadow: `0 0 0 3px ${NAVY}10` },
            }}
          >
            <Box
              role="button"
              aria-label={`Drag to reorder ${item}`}
              title="Drag to reorder"
              onPointerDown={(e) => handleDragStart(e, item, i)}
              onPointerMove={handleDragMove}
              onPointerUp={handleDragEnd}
              onPointerCancel={handleDragEnd}
              sx={{
                display: 'flex', alignItems: 'center',
                color: isDragging ? NAVY : MUTED,
                cursor: isDragging ? 'grabbing' : 'grab',
                touchAction: 'none', userSelect: 'none', px: 0.25,
                '&:hover': { color: NAVY },
              }}
            >
              <DragIndicatorOutlined fontSize="small" />
            </Box>

            <Box
              sx={{
                width: 28, height: 28, borderRadius: '50%',
                bgcolor: NAVY, color: '#fff',
                display: 'grid', placeItems: 'center',
                fontWeight: 700, fontSize: 13, flexShrink: 0,
              }}
            >
              {i + 1}
            </Box>

            <Typography sx={{ flex: 1, fontSize: 14.5, color: '#1F1F1F' }}>
              {item}
            </Typography>

            <IconButton
              size="small" disabled={i === 0 || Boolean(dragState)}
              onClick={() => move(i, i - 1)}
              sx={{ color: NAVY, '&.Mui-disabled': { color: '#D8DDD4' } }}
            >
              <ArrowUpwardOutlined fontSize="small" />
            </IconButton>
            <IconButton
              size="small" disabled={i === currentOrder.length - 1 || Boolean(dragState)}
              onClick={() => move(i, i + 1)}
              sx={{ color: NAVY, '&.Mui-disabled': { color: '#D8DDD4' } }}
            >
              <ArrowDownwardOutlined fontSize="small" />
            </IconButton>
          </Stack>
        );
      })}
    </Stack>
  );
}

function AnswerInput({
  question,
  value,
  onChange,
  timeLeft,
  goPrev,
  goNext,
  submitTest,
  currentIdx,
  questionsLength,
  assignmentId,
  currentSectionTimeLeft,
  sectionExpired,
  sectionPos,
  sectionTotal,
  allQuestions,
  onQuestionJump,
  apiQuestionNumber,
}) {
  const { question_type, content } = question;
  const options = content?.options ?? [];

  const formattedStem = useMemo(
    () => formatStem(question?.content?.stem ?? ''),
    [question?.id, question?.content?.stem],
  );

  if (question_type === 'mcq' || question_type === 'true_false') {
    return (
      <FormControl component="fieldset" sx={{ width: '100%', mt: 3 }}>
        <RadioGroup value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
          {options.map((opt) => {
            const selected = value === opt.key;
            return (
              <FormControlLabel
                key={opt.key}
                value={opt.key}
                control={<Radio sx={{ color: '#D8DDD4', '&.Mui-checked': { color: NAVY } }} />}
                label={
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, py: 0.25 }}>
                    <Typography sx={{ fontSize: 14.5, color: '#55584F' }}>
                      {question_type !== 'true_false' && (
                        <span style={{ fontWeight: 700, color: NAVY, marginRight: 8 }}>{opt.key}.</span>
                      )}
                      {opt.text}
                    </Typography>
                    {/* 🔧 NEW — option image */}
                    {(() => {
                      const src = typeof opt.image === 'string' ? opt.image : (opt.image?.url || '');
                      if (!src) return null;
                      return (
                        <Box
                          component="img"
                          src={src}
                          alt={`Option ${opt.key}`}
                          sx={{
                            maxWidth: 240, maxHeight: 180,
                            borderRadius: 1, border: '1px solid #E7EAE3',
                            bgcolor: '#FFFFFF', objectFit: 'contain',
                            display: 'block', 
                           
                          }}
                         
                        />
                      );
                    })()}
                  </Box>
                }
                sx={{
                  alignItems: 'flex-start',
                  border: '1.5px solid',
                  borderColor: selected ? NAVY : '#E7EAE3',
                  borderRadius: 2,
                  mb: 1.25, mx: 0, px: 2, py: 1,
                  bgcolor: selected ? `${NAVY}0A` : '#fff',
                  transition: 'all .15s ease',
                  boxShadow: selected ? `0 0 0 3px ${NAVY}14` : 'none',
                  '&:hover': { borderColor: NAVY, bgcolor: `${NAVY}06` },
                  '& .MuiFormControlLabel-label': { width: '100%' },
                }}
              />
            );
          })}
        </RadioGroup>
      </FormControl>
    );
  }

  if (question_type === 'multi_select') {
    const selected = Array.isArray(value) ? value : [];
    return (
      <FormGroup sx={{ mt: 3 }}>
        <Typography
          sx={{
            fontSize: 11.5, color: MUTED, mb: 1.5,
            fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6,
          }}
        >
          Select all that apply
        </Typography>
        {options.map((opt) => {
          const checked = selected.includes(opt.key);
          return (
           <FormControlLabel
              key={opt.key}
              control={
                <Checkbox
                  checked={checked}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...selected, opt.key]
                      : selected.filter((k) => k !== opt.key);
                    onChange(next.length ? next : null);
                  }}
                  sx={{ color: '#D8DDD4', '&.Mui-checked': { color: NAVY } }}
                />
              }
              label={
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, py: 0.25 }}>
                  <Typography sx={{ fontSize: 14.5, color: '#55584F' }}>
                    <span style={{ fontWeight: 700, color: NAVY, marginRight: 8 }}>{opt.key}.</span>
                    {opt.text}
                  </Typography>
                  {/* 🔧 NEW — option image */}
                  {(() => {
                    const src = typeof opt.image === 'string' ? opt.image : (opt.image?.url || '');
                    if (!src) return null;
                    return (
                      <Box
                        component="img"
                        src={src}
                        alt={`Option ${opt.key}`}
                        sx={{
                          maxWidth: 240, maxHeight: 180,
                          borderRadius: 1, border: '1px solid #E7EAE3',
                          bgcolor: '#FFFFFF', objectFit: 'contain',
                         display: 'block',
                        }}
                      />
                    );
                  })()}
                </Box>
              }
              sx={{
                alignItems: 'flex-start',
                border: '1.5px solid',
                borderColor: checked ? NAVY : '#E7EAE3',
                borderRadius: 2,
                mb: 1.25, mx: 0, px: 2, py: 1,
                bgcolor: checked ? `${NAVY}0A` : '#fff',
                transition: 'all .15s ease',
                boxShadow: checked ? `0 0 0 3px ${NAVY}14` : 'none',
                '&:hover': { borderColor: NAVY, bgcolor: `${NAVY}06` },
                '& .MuiFormControlLabel-label': { width: '100%' },
              }}
            />
          );
        })}
      </FormGroup>
    );
  }

  const _content = question?.content || {};
  const isSqlQuestion =
    question_type === 'sql' ||
    (question_type === 'coding' && (
      _content.language === 'sql' ||
      _content.validation_strategy === 'query' ||
      Boolean(_content.sql_schema_ddl)
    ));

  if (isSqlQuestion) {
    const coding =
      value && typeof value === 'object' && !Array.isArray(value)
        ? value
        : { code: typeof value === 'string' ? value : '', language: 'sql' };

    return (
      <Box sx={{ mt: 3 }}>
      <CodeEditor
          value={coding.code || ''}
          onChange={(code) =>
            onChange({ ...coding, code: code || '', language: 'sql' })
          }
          language="sql"
          lockLanguage
          boilerplate={question?.content?.boilerplate || question?.boilerplate || ''}
          questionNumber={sectionPos ?? (currentIdx ?? 0) + 1}
          apiQuestionNumber={apiQuestionNumber}
          questionTitle={`Question ${sectionPos ?? (currentIdx ?? 0) + 1} / ${sectionTotal ?? questionsLength}`}
          questionHtml={formattedStem}
          testId={assignmentId}
          timeLeft={timeLeft}
          onPrevious={goPrev}
          onSkip={goNext}
          onNext={
            currentIdx === (questionsLength ?? 1) - 1 ? submitTest : goNext
          }
          canGoPrevious={(currentIdx ?? 0) > 0}
          isLastQuestion={currentIdx === (questionsLength ?? 1) - 1}
          hasAnswer={isAnswerAttempted(question, coding)}
          isAnswered={isAnswerAttempted(question, coding)}
          startFullscreen
          lockFullscreen
          sectionTimeLeft={currentSectionTimeLeft}
          sectionExpired={sectionExpired}
          allQuestions={allQuestions}
          onQuestionJump={onQuestionJump}
        />
      </Box>
    );
  }

  if (question_type === 'coding') {
    const coding =
      value && typeof value === 'object' && !Array.isArray(value)
        ? value
        : { code: typeof value === 'string' ? value : '', language: 'python' };

    return (
      <Box sx={{ mt: 3 }}>
       <CodeEditor
          value={coding.code || ''}
          onChange={(code) =>
            onChange({ ...coding, code: code || '', language: coding.language || 'python' })
          }
          language={coding.language || 'python'}
          onLanguageChange={(lang) => onChange({ ...coding, language: lang })}
          boilerplate={question?.content?.boilerplate || question?.boilerplate || ''}
          questionNumber={sectionPos ?? (currentIdx ?? 0) + 1}
          apiQuestionNumber={apiQuestionNumber}
          questionTitle={`Question ${sectionPos ?? (currentIdx ?? 0) + 1} / ${sectionTotal ?? questionsLength}`}
          questionHtml={formattedStem}
          testId={assignmentId}
          timeLeft={timeLeft}
          onPrevious={goPrev}
          onSkip={goNext}
          onNext={
            currentIdx === (questionsLength ?? 1) - 1 ? submitTest : goNext
          }
          canGoPrevious={(currentIdx ?? 0) > 0}
          isLastQuestion={currentIdx === (questionsLength ?? 1) - 1}
          hasAnswer={isAnswerAttempted(question, coding)}
          isAnswered={isAnswerAttempted(question, coding)}
          startFullscreen
          lockFullscreen
          sectionTimeLeft={currentSectionTimeLeft}
          sectionExpired={sectionExpired}
          allQuestions={allQuestions}
          onQuestionJump={onQuestionJump}
        />
      </Box>
    );
  }

  if (question_type === 'match') {
    return <MatchInput question={question} value={value} onChange={onChange} />;
  }

  if (question_type === 'sequence') {
    return <SequenceInput question={question} value={value} onChange={onChange} />;
  }

  const isLong = ['short_answer', 'scenario', 'custom'].includes(question_type);
  return (
    <TextField
      fullWidth
      multiline={isLong}
      minRows={isLong ? 5 : 1}
      placeholder="Type your answer here…"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      sx={{
        mt: 3,
        '& .MuiOutlinedInput-root': {
          bgcolor: '#fff',
          borderRadius: 2,
          fontSize: 15,
          '& fieldset': { borderColor: '#E7EAE3' },
          '&:hover fieldset': { borderColor: NAVY },
          '&.Mui-focused fieldset': { borderColor: NAVY, borderWidth: 2 },
        },
      }}
    />
  );
}

function SectionTabs({ sections, activeSectionId, lockedSectionIds, onSelect, sx = {} }) {
  if (!Array.isArray(sections) || sections.length <= 1) return null;
  return (
    <Box
      sx={{
        display: 'inline-flex',
        maxWidth: '100%',
        border: '1px solid #E7EAE3',
        borderRadius: 2,
        bgcolor: '#fff',
        overflowX: 'auto',
        flexShrink: 1,
        scrollbarWidth: 'thin',
        '&::-webkit-scrollbar': { height: 4 },
        '&::-webkit-scrollbar-thumb': { background: '#E7EAE3', borderRadius: 4 },
        ...sx,
      }}
    >
      {sections.map((s, i) => {
        const isActive = s.section_id === activeSectionId;
        const isLocked = lockedSectionIds?.has?.(s.section_id);
        return (
          <Box
            key={s.section_id ?? i}
            onClick={() => onSelect?.(s)}
            title={s.name}
            sx={{
              display: 'flex', alignItems: 'center', gap: 0.625,
              whiteSpace: 'nowrap', px: 1.75, py: 0.875,
              cursor: 'pointer', userSelect: 'none',
              borderLeft: i > 0 ? '1px solid #E7EAE3' : 'none',
              bgcolor: isActive ? NAVY : '#fff',
              color:   isActive ? '#fff' : isLocked ? '#7A7E76' : NAVY,
              fontSize: 12, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase',
              transition: 'background-color .15s ease, color .15s ease',
              '&:hover': isActive ? {} : { bgcolor: '#F6F8F3' },
            }}
          >
            {isLocked && <LockOutlined sx={{ fontSize: 13 }} />}
            {s.name}
          </Box>
        );
      })}
    </Box>
  );
}

function QuestionNavigator({
  questions, currentIdx, answers, onGoTo,
  compact = false, activeSectionId = null, sectionName = null,
}) {
  const tileSize = { xs: compact ? 3 : 2.4 };
  const allItems = questions.map((q, idx) => ({ q, idx }));
  // eslint-disable-next-line eqeqeq
  const items = activeSectionId == null
    ? allItems
    : allItems.filter(({ q }) => q.section_id == activeSectionId);
  const sectionAnswered = items.filter(
    ({ q }) => answers[q.id] !== undefined && answers[q.id] !== null,
  ).length;

  // Pagination — chunk the palette so long tests don't fill the sidebar
  const PAGE_SIZE = 20;
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const currentLocalIdx = items.findIndex(({ idx }) => idx === currentIdx);
  const [page, setPage] = useState(
    currentLocalIdx >= 0 ? Math.floor(currentLocalIdx / PAGE_SIZE) : 0,
  );
  // Auto-jump to the page that contains the current question
  useEffect(() => {
    if (currentLocalIdx >= 0) {
      setPage(Math.floor(currentLocalIdx / PAGE_SIZE));
    }
  }, [currentLocalIdx]);
  const safePage = Math.min(page, totalPages - 1);
  const start = safePage * PAGE_SIZE;
  const end = Math.min(start + PAGE_SIZE, items.length);
  const visibleItems = items.slice(start, end);

  return (
    <Box>
      <Typography
        sx={{
          fontSize: 11, fontWeight: 700, color: MUTED,
          mb: activeSectionId != null ? 0.75 : 2,
          textTransform: 'uppercase', letterSpacing: 0.6,
        }}
      >
        Question Palette
      </Typography>
      {activeSectionId != null && (
        <Stack
          direction="row" alignItems="center" justifyContent="space-between"
          spacing={1} sx={{ mb: 2 }}
        >
          <Typography
            title={sectionName ?? ''}
            sx={{
              fontSize: 12.5, fontWeight: 700, color: NAVY, minWidth: 0,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
          >
            {sectionName ?? 'Current section'}
          </Typography>
          <Typography sx={{ fontSize: 11.5, color: MUTED, flexShrink: 0 }}>
            {sectionAnswered}/{items.length}
          </Typography>
        </Stack>
      )}
      {totalPages > 1 && (
        <Stack
          direction="row" alignItems="center" justifyContent="space-between"
          sx={{
            mb: 1.5, px: 1.25, py: 0.75,
            bgcolor: '#F6F8F3', borderRadius: 1.25,
            border: '1px solid #E7EAE3',
          }}
        >
          <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: NAVY }}>
            Showing {start + 1}–{end}
          </Typography>
          <Typography sx={{ fontSize: 11, color: MUTED, fontWeight: 600 }}>
            {safePage + 1} / {totalPages}
          </Typography>
        </Stack>
      )}
      <Grid container spacing={1}>
        {visibleItems.map(({ q, idx }, sliceIdx) => {
          const localIdx   = start + sliceIdx;
          const isAnswered = answers[q.id] !== undefined && answers[q.id] !== null;
          const isCurrent  = idx === currentIdx;
          const label      = activeSectionId != null ? localIdx + 1 : idx + 1;
          return (
            <Grid key={q.id} size={tileSize}>
              <Box
                onClick={() => onGoTo(idx)}
                sx={{
                  width: '100%', aspectRatio: '1',
                  display: 'grid', placeItems: 'center',
                  borderRadius: 1.5,
                  border: '2px solid',
                  borderColor: isCurrent ? NAVY : isAnswered ? '#8FA88E' : '#E7EAE3',
                  bgcolor:     isCurrent ? NAVY : isAnswered ? '#EAF2E9' : '#fff',
                  color:       isCurrent ? '#fff' : isAnswered ? '#3E6E3E' : '#6F7470',
                  fontWeight: 700, fontSize: 13,
                  cursor: 'pointer',
                  transition: 'all .15s ease',
                  boxShadow: isCurrent ? `0 4px 12px ${NAVY}33` : 'none',
                  '&:hover': {
                    borderColor: NAVY,
                    bgcolor: isCurrent ? NAVY : `${NAVY}0A`,
                    transform: 'translateY(-1px)',
                  },
                }}
              >
                {label}
              </Box>
            </Grid>
          );
        })}
      </Grid>
      {totalPages > 1 && (
        <Stack
          direction="row" spacing={1} alignItems="center" justifyContent="space-between"
          sx={{ mt: 1.5 }}
        >
          <Button
            size="small"
            startIcon={<ArrowBackOutlined sx={{ fontSize: 14 }} />}
            disabled={safePage === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            sx={{
              textTransform: 'none', fontWeight: 700, fontSize: 11.5,
              color: NAVY, borderRadius: 1.5, px: 1.25, py: 0.5, minWidth: 0,
              border: '1px solid #E7EAE3', bgcolor: '#fff',
              '&:hover': { bgcolor: `${NAVY}0A`, borderColor: NAVY },
              '&.Mui-disabled': { color: '#B8BDB4', borderColor: '#EEF1EB' },
            }}
          >
            Prev
          </Button>
          <Button
            size="small"
            endIcon={<ArrowForwardOutlined sx={{ fontSize: 14 }} />}
            disabled={safePage >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            sx={{
              textTransform: 'none', fontWeight: 700, fontSize: 11.5,
              color: NAVY, borderRadius: 1.5, px: 1.25, py: 0.5, minWidth: 0,
              border: '1px solid #E7EAE3', bgcolor: '#fff',
              '&:hover': { bgcolor: `${NAVY}0A`, borderColor: NAVY },
              '&.Mui-disabled': { color: '#B8BDB4', borderColor: '#EEF1EB' },
            }}
          >
            Next
          </Button>
        </Stack>
      )}
      <Stack spacing={0.75} sx={{ mt: 2.5 }}>
        {[
          { borderColor: NAVY,      bgcolor: NAVY,      label: 'Current'    },
          { borderColor: '#8FA88E', bgcolor: '#EAF2E9', label: 'Answered'   },
          { borderColor: '#E7EAE3', bgcolor: '#fff',    label: 'Unanswered' },
        ].map((item) => (
          <Stack key={item.label} direction="row" spacing={0.75} alignItems="center">
            <Box
              sx={{
                width: 14, height: 14, borderRadius: 0.75,
                bgcolor: item.bgcolor,
                border: `2px solid ${item.borderColor}`,
              }}
            />
            <Typography sx={{ fontSize: 11.5, color: MUTED }}>{item.label}</Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}

// Legacy TimerCard kept for back-compat (not rendered).
// eslint-disable-next-line no-unused-vars
function TimerCard({ timeLeft }) {
  const isLow      = timeLeft > 0 && timeLeft < 300;
  const isCritical = timeLeft > 0 && timeLeft < 60;
  const accent = isCritical ? '#A63D2F' : isLow ? '#A35A2D' : NAVY;
  const bgTint = isCritical ? '#FAEAE8' : isLow ? '#FBF0E7' : '#fff';
  return (
    <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: '#E7EAE3', bgcolor: bgTint, textAlign: 'center', p: 2.5 }}>
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
        <TimerOutlined sx={{ fontSize: 16, color: accent }} />
        <Typography sx={{ fontSize: 11, color: accent, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>
          Time Remaining
        </Typography>
      </Stack>
      <Typography sx={{ fontSize: 40, fontWeight: 800, color: accent, lineHeight: 1, mt: 1 }}>
        {formatTime(timeLeft)}
      </Typography>
      {isLow && (
        <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center" sx={{ mt: 1.25 }}>
          <BoltOutlined sx={{ fontSize: 14, color: accent }} />
          <Typography sx={{ fontSize: 11.5, color: accent, fontWeight: 600 }}>
            {isCritical ? 'Less than a minute left' : 'Less than 5 minutes left'}
          </Typography>
        </Stack>
      )}
    </Card>
  );
}

function ProgressRing({ size, stroke, progress, color, trackColor = '#F6F8F3', children }) {
  const radius        = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset        = circumference * (1 - Math.max(0, Math.min(1, progress)));
  return (
    <Box sx={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}
      >
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={trackColor} strokeWidth={stroke}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset .4s ease' }}
        />
      </svg>
      <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
        {children}
      </Box>
    </Box>
  );
}

function ReviewPage({
  title,
  reviewSummary,
  visitedReviewSections,  
  lockedSectionIds,       
  onEnterSection,
  onFinalSubmit,
  submitting,
  error,
}) {
  const sections        = reviewSummary?.by_section ?? [];
  const totalAnswered   = sections.reduce((a, s) => a + (s.answered ?? 0), 0);
  const totalQuestions  = sections.reduce((a, s) => a + (s.total    ?? 0), 0);
  const totalUnanswered = totalQuestions - totalAnswered;
  const overallProgress = totalQuestions > 0 ? totalAnswered / totalQuestions : 0;

  const openSectionCount = sections.filter((s) => {
    const banked        = s.review_seconds_banked ?? 0;
    const backendLocked = s.status === 'review_locked' || s.status === 'locked';
    return banked > 0 && !backendLocked;
  }).length;

  return (
    <Box sx={{ bgcolor: PAGE_BG, fontFamily: FONT, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* ─── Header ─── */}
      <Box
        sx={{
          bgcolor: NAVY, color: '#fff',
          px: { xs: 2, md: 4 }, py: 2.5,
          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.08)',
        }}
      >
        <Container maxWidth="md" sx={{ px: 0 }}>
          <Stack direction="row" spacing={1.75} alignItems="center">
            <Box
              sx={{
                width: 44, height: 44, borderRadius: '50%',
                bgcolor: 'rgba(255,255,255,0.16)', color: '#fff',
                display: 'grid', placeItems: 'center', flexShrink: 0,
              }}
            >
              <AssignmentTurnedInOutlined sx={{ fontSize: 24 }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{
                  fontSize: 10.5, fontWeight: 700, opacity: 0.8,
                  textTransform: 'uppercase', letterSpacing: 1, lineHeight: 1,
                }}
              >
                Review your assessment
              </Typography>
              <Typography
                sx={{ fontSize: { xs: 18, md: 22 }, fontWeight: 700, mt: 0.5, lineHeight: 1.2 }}
              >
                {title}
              </Typography>
            </Box>
          </Stack>
        </Container>
      </Box>

      {/* ─── Body ─── */}
      <Container maxWidth="md" sx={{ flex: 1, py: { xs: 3, md: 4 } }}>

        {/* Hero progress card */}
        <Card
          elevation={0}
          sx={{
            borderRadius: 3, border: '1px solid #E7EAE3',
            p: { xs: 2.5, md: 3 }, mb: 2, bgcolor: '#fff',
          }}
        >
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={{ xs: 2.5, md: 3 }}
            alignItems={{ xs: 'flex-start', md: 'center' }}
          >
            <ProgressRing size={80} stroke={8} progress={overallProgress} color={NAVY}>
              <Box sx={{ textAlign: 'center', lineHeight: 1 }}>
                <Typography sx={{ fontSize: 18, fontWeight: 800, color: NAVY }}>
                  {totalAnswered}
                </Typography>
                <Typography sx={{ fontSize: 10, color: MUTED, mt: 0.25 }}>
                  of {totalQuestions}
                </Typography>
              </Box>
            </ProgressRing>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: 15, fontWeight: 700, color: NAVY, mb: 0.5 }}>
                {openSectionCount > 0
                  ? `${openSectionCount} section${openSectionCount !== 1 ? 's' : ''} still open`
                  : 'All sections closed'}
              </Typography>
              <Typography sx={{ fontSize: 13, color: MUTED, lineHeight: 1.55 }}>
                {openSectionCount > 0
                  ? 'You can go back to any section with time remaining and revise your answers. Locked sections cannot be reopened.'
                  : 'You can finalize your submission now.'}
              </Typography>
            </Box>

            <Stack
              direction="row" spacing={1}
              sx={{ flexShrink: 0, alignSelf: { xs: 'stretch', md: 'center' } }}
            >
              <Box
                sx={{
                  bgcolor: '#EAF2E9', border: '1px solid #EAF2E9',
                  borderRadius: 2, px: 1.75, py: 1.25, minWidth: 72, textAlign: 'center', flex: 1,
                }}
              >
                <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#3E6E3E', lineHeight: 1 }}>
                  {totalAnswered}
                </Typography>
                <Typography
                  sx={{
                    fontSize: 10, color: '#3E6E3E', mt: 0.5, fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: 0.4,
                  }}
                >
                  Answered
                </Typography>
              </Box>
              <Box
                sx={{
                  bgcolor: '#FAEAE8', border: '1px solid #FAEAE8',
                  borderRadius: 2, px: 1.75, py: 1.25, minWidth: 72, textAlign: 'center', flex: 1,
                }}
              >
                <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#A63D2F', lineHeight: 1 }}>
                  {totalUnanswered}
                </Typography>
                <Typography
                  sx={{
                    fontSize: 10, color: '#A63D2F', mt: 0.5, fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: 0.4,
                  }}
                >
                  Pending
                </Typography>
              </Box>
            </Stack>
          </Stack>
        </Card>

        {error && (
          <Alert severity="error" icon={<ErrorOutlined />} sx={{ borderRadius: 2, mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* ─── Per-section cards ─── */}
        <Stack spacing={1.5}>
          {sections.length === 0 && (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              No section data available.
            </Alert>
          )}

          {sections.map((s) => {
            const banked          = s.review_seconds_banked ?? 0;
            const total           = s.total    ?? 0;
            const answered        = s.answered ?? 0;
            const unanswered      = s.unanswered ?? Math.max(0, total - answered);
            const sectionProgress = total > 0 ? answered / total : 0;
            const backendLocked   = s.status === 'review_locked' || s.status === 'locked';
            const hasTime         = banked > 0;
            const canEnter        = hasTime && !backendLocked && !submitting;

            const ringColor       = canEnter ? NAVY : '#7A7E76';
            const ringTextColor   = canEnter ? NAVY : '#6F7470';

            return (
              <Card
                key={s.section_id ?? s.name}
                elevation={0}
                sx={{
                  borderRadius: 3,
                  border: '1px solid #E7EAE3',
                  borderLeft: canEnter ? '3px solid #3E6E3E' : '1px solid #E7EAE3',
                  p: { xs: 2, md: 2.5 },
                  bgcolor: '#fff',
                  opacity: backendLocked ? 0.65 : 1,
                  transition: 'box-shadow .2s ease',
                  '&:hover': canEnter
                    ? { boxShadow: '0 4px 16px rgba(30, 51, 88, 0.08)' }
                    : {},
                }}
              >
                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  spacing={{ xs: 2, md: 2 }}
                  alignItems={{ xs: 'flex-start', md: 'center' }}
                >
                  {/* Progress ring */}
                  <ProgressRing
                    size={56} stroke={5}
                    progress={sectionProgress} color={ringColor}
                  >
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: ringTextColor }}>
                      {answered}/{total}
                    </Typography>
                  </ProgressRing>

                  {/* Name + status + meta */}
                  <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
                    <Stack
                      direction="row" spacing={1} alignItems="center"
                      sx={{ mb: 0.75 }} flexWrap="wrap" useFlexGap
                    >
                      <Typography
                        sx={{
                          fontSize: 16, fontWeight: 700, color: NAVY,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}
                        title={s.name}
                      >
                        {s.name}
                      </Typography>
                      {backendLocked ? (
                        <Chip
                          icon={<LockOutlined sx={{ fontSize: '12px !important' }} />}
                          label="Locked"
                          size="small"
                          sx={{
                            height: 20, borderRadius: 999,
                            bgcolor: '#F6F8F3', color: '#55584F',
                            fontSize: 9.5, fontWeight: 700,
                            letterSpacing: 0.4, textTransform: 'uppercase',
                            '& .MuiChip-icon': { color: '#55584F', ml: '6px', mr: '-4px' },
                            '& .MuiChip-label': { px: 1 },
                          }}
                        />
                      ) : hasTime ? (
                        <Chip
                          label="Open"
                          size="small"
                          sx={{
                            height: 20, borderRadius: 999,
                            bgcolor: '#EAF2E9', color: '#3E6E3E',
                            fontSize: 9.5, fontWeight: 700,
                            letterSpacing: 0.4, textTransform: 'uppercase',
                            '& .MuiChip-label': { px: 1.25 },
                          }}
                        />
                      ) : (
                        <Chip
                          label="No time"
                          size="small"
                          sx={{
                            height: 20, borderRadius: 999,
                            bgcolor: '#F6F8F3', color: '#55584F',
                            fontSize: 9.5, fontWeight: 700,
                            letterSpacing: 0.4, textTransform: 'uppercase',
                            '& .MuiChip-label': { px: 1.25 },
                          }}
                        />
                      )}
                    </Stack>
                    <Stack
                      direction="row" spacing={1.75} alignItems="center"
                      flexWrap="wrap" useFlexGap
                    >
                      <Typography sx={{ fontSize: 12.5, color: MUTED }}>
                        {answered} answered · {unanswered} unanswered
                      </Typography>
                      {hasTime && (
                        <Stack direction="row" spacing={0.625} alignItems="center">
                          <TimerOutlined sx={{ fontSize: 14, color: '#3E6E3E' }} />
                          <Typography
                            sx={{
                              fontSize: 17, fontWeight: 800, color: '#3E6E3E',
                              fontVariantNumeric: 'tabular-nums', lineHeight: 1,
                            }}
                          >
                            {formatTime(banked)}
                          </Typography>
                          <Typography sx={{ fontSize: 11, color: MUTED }}>
                            remaining
                          </Typography>
                        </Stack>
                      )}
                    </Stack>
                  </Box>

                  {/* Action button */}
                  <Button
                    variant="contained"
                    startIcon={canEnter ? <ReplayOutlined /> : null}
                    disabled={!canEnter}
                    onClick={() => canEnter && onEnterSection(s.section_id)}
                    sx={{
                      textTransform: 'none', fontWeight: 700, borderRadius: 2,
                      bgcolor: NAVY, color: '#fff',
                      px: 2.25, py: 1.125, fontSize: 13,
                      minWidth: { xs: '100%', md: 200 },
                      whiteSpace: 'nowrap',
                      boxShadow: 'none',
                      '&:hover': { bgcolor: NAVY_DK, boxShadow: '0 4px 12px rgba(30, 51, 88, 0.20)' },
                      '&.Mui-disabled': { bgcolor: '#F6F8F3', color: '#7A7E76' },
                    }}
                  >
                    {canEnter
                      ? 'Go back to this section'
                      : backendLocked
                        ? 'Section closed'
                        : 'No time remaining'}
                  </Button>
                </Stack>
              </Card>
            );
          })}
        </Stack>

        {/* ─── Final Submit ─── */}
        <Card
          elevation={0}
          sx={{
            mt: 2.5, borderRadius: 3, border: '1px solid #E7EAE3',
            p: { xs: 2, md: 2.5 }, bgcolor: '#fff',
          }}
        >
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems={{ xs: 'stretch', sm: 'center' }}
            justifyContent="space-between"
          >
            <Box>
              <Typography sx={{ fontSize: 15, fontWeight: 700, color: NAVY, mb: 0.5 }}>
                Done reviewing?
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: MUTED, lineHeight: 1.55 }}>
                This locks all sections and submits your assessment.
              </Typography>
            </Box>
            <Button
              variant="contained"
              size="large"
              startIcon={submitting ? null : <SendOutlined />}
              disabled={submitting}
              onClick={onFinalSubmit}
              sx={{
                textTransform: 'none', fontWeight: 700, borderRadius: 2,
                bgcolor: '#3E6E3E', px: 3.5, py: 1.375, fontSize: 14,
                whiteSpace: 'nowrap', boxShadow: 'none',
                '&:hover': { bgcolor: '#3E6E3E', boxShadow: '0 4px 14px rgba(22, 163, 74, 0.35)' },
                '&.Mui-disabled': { bgcolor: '#D8DDD4', color: '#fff' },
              }}
            >
              {submitting ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'Final Submit'}
            </Button>
          </Stack>
        </Card>

      </Container>
    </Box>
  );
}

export default function AIAssessmentTest() {
  const { assignmentId }  = useParams();
  const location          = useLocation();
  const navigate          = useNavigate();
  const theme             = useTheme();
  const isDesktop         = useMediaQuery(theme.breakpoints.up('md'));

  const { title = 'Assessment', durationMinutes = 30, aiProctored = true, questionTypes = '' } = location.state ?? {};

  const {
    questions, currentQuestion, currentIdx,
    answers, timeLeft,
    loading, submitting, submitted, error,
    answeredCount, unansweredCount,
    goTo, goPrev, goNext,
    answerQuestion, submitTest,
    

    // BUILD: 2026-08-12-AUTOSAVE-DEBOUNCE-v1 — pick up save-state + flush.
    saveStatus       = {},
    flushPendingSaves,

    // BUILD: 2026-08-12-RESUME-ON-DISCONNECT-v1 — pick up resume + online state.
    resumeInfo             = { isResuming: false },
    isOnline               = true,
    dismissResumeBanner,

    currentSection,
    sectionsSummary,
    pendingSectionComplete,
    confirmSectionComplete,
    dismissSectionComplete,

    currentSectionTimeLeft,
    lockedSectionIds,

    // Phase 2 review-page API
    reviewSummary          = null,
    openReviewSummary      = null,
    enterReviewSection     = null,
    exitReviewSection      = null,
    finalSubmit            = null,
    inReattemptPhase       = false,
    visitedReviewSections  = new Set(),
    preparingReview        = false,
  } = useAIAssessmentTest(assignmentId, durationMinutes);

  const currentQuestionStem = useMemo(
    () => formatStem(currentQuestion?.content?.stem ?? 'Question content unavailable.'),
    [currentQuestion?.id, currentQuestion?.content?.stem],
  );

  const hasSectionTimer      = currentSectionTimeLeft !== null;
  const currentSectionLocked = currentSection && lockedSectionIds.has(currentSection.section_id);

  const sectionFirstIndex = useMemo(() => {
    const map = {};
    questions.forEach((q, idx) => {
      const sid = q.section_id;
      if (sid != null && map[sid] === undefined) map[sid] = idx;
    });
    return map;
  }, [questions]);

  const goToSection = (s) => {
    if (!s) return;
    const idx = sectionFirstIndex[s.section_id];
    if (idx != null) goTo(idx);
  };

    const [navOpen, setNavOpen] = useState(false);
  const [instructionsAccepted, setInstructionsAccepted] = useState(false);

  // BUILD: 2026-09-17-proctor-assessment-v1 — during-test proctoring
  const proctorVideoRef = useRef(null);
  const [proctorStream, setProctorStream] = useState(null);
  const [proctorBanner, setProctorBanner] = useState(null);
  const proctorRawStreamRef = useRef(null);
  const proctorAudioCtxRef = useRef(null);
  const proctorNoiseSuppressionRef = useRef(null);

  // Acquire camera + mic when the test actually starts
  useEffect(() => {
    if (!instructionsAccepted || submitted || proctorStream) return;
    let cancelled = false;
    (async () => {
      // Small delay to let useFaceGate release the camera hardware
      await new Promise(r => setTimeout(r, 500));
      if (cancelled) return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' },
          audio: true,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        proctorRawStreamRef.current = stream;

        let deliverStream = stream;
        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 48000 });
          const ns = new NoiseSuppressionService();
          const exitNode = await ns.createNode(ctx);
          const micOnly = new MediaStream(stream.getAudioTracks());
          const src = ctx.createMediaStreamSource(micOnly);
          const dest = ctx.createMediaStreamDestination();
          src.connect(ns.getEntryNode());
          exitNode.connect(dest);
          proctorAudioCtxRef.current = ctx;
          proctorNoiseSuppressionRef.current = ns;
          deliverStream = new MediaStream([
            ...stream.getVideoTracks(),
            ...dest.stream.getAudioTracks(),
          ]);
          console.log('[AssessmentProctor] RNNoise noise suppression attached');
        } catch (nsErr) {
          console.warn('[AssessmentProctor] Noise suppression unavailable, using raw mic:', nsErr?.message);
        }
        // ──────────────────────────────────────────────────────────────────

        setProctorStream(deliverStream);
      } catch (err) {
        console.error('[AssessmentProctor] Camera/mic acquisition failed:', err?.name, err?.message);
      }
    })();
    return () => { cancelled = true; };
  }, [instructionsAccepted, submitted, proctorStream]);

  // Release camera + mic on unmount only
  useEffect(() => () => {
    try { proctorNoiseSuppressionRef.current?.destroy(); } catch { /* ignore */ }
    proctorNoiseSuppressionRef.current = null;
    try { proctorAudioCtxRef.current?.close?.(); } catch { /* ignore */ }
    try {
      proctorRawStreamRef.current?.getTracks().forEach((t) => t.stop());
    } catch { /* noop */ }
    proctorRawStreamRef.current = null;
  }, []);

  // Attach stream to video element once both are available
  useEffect(() => {
    if (proctorStream && proctorVideoRef.current) {
      proctorVideoRef.current.srcObject = proctorStream;
      proctorVideoRef.current.play().catch(() => {});
    }
  }, [proctorStream]);

  const proctor = useAssessmentProctoring({
    assignmentId,
    moduleCode: aiProctored ? 'AI-ASM' : 'MAN-ASM',
    videoRef: proctorVideoRef,
    mediaStream: proctorStream,
    isActive: instructionsAccepted && !submitted,
    onWarning: (w) => {
      setProctorBanner({ kind: 'warn', ...w });
      setTimeout(() => setProctorBanner((prev) => prev?.kind === 'warn' ? null : prev), 5000);
    },
    onTerminate: (evt, msg) => {
      setProctorBanner({ kind: 'terminate', message: msg });
      // Auto-submit on terminate
      try { submitTest && submitTest(); } catch {}
    },
  });
  

  const [isFs, setIsFs] = useState(
    typeof document !== 'undefined' && Boolean(document.fullscreenElement),
  );

  useEffect(() => {
    const onChange = () => setIsFs(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const enterFullscreen = () => {
    const el = document.documentElement;
    if (el?.requestFullscreen && !document.fullscreenElement) {
      el.requestFullscreen().catch(() => {});
    }
  };

  useEffect(() => {
    if (loading || questions.length === 0 || isFs) return;
    const reenter = () => enterFullscreen();
    window.addEventListener('pointerdown', reenter, { once: true });
    window.addEventListener('keydown', reenter, { once: true });
    return () => {
      window.removeEventListener('pointerdown', reenter);
      window.removeEventListener('keydown', reenter);
    };
  }, [isFs, loading, questions.length]);

  
  useEffect(() => {
    return () => {
      if (typeof document !== 'undefined' && document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      }
    };
  }, []);

  const progress = questions.length
    ? Math.round((answeredCount / questions.length) * 100)
    : 0;

  const isLastQuestion =
    questions.length > 0 && currentIdx === questions.length - 1;

  const sectionIndex = currentSection
    ? sectionsSummary.findIndex((s) => s.section_id === currentSection.section_id)
    : -1;
  const sectionLabel = currentSection?.name
    ? (sectionIndex >= 0 && sectionsSummary.length > 1
        ? `Section ${sectionIndex + 1} of ${sectionsSummary.length} · ${currentSection.name}`
        : currentSection.name)
    : null;

  const sectionProgress = useMemo(() => {
    if (!currentSection || sectionsSummary.length <= 1)
      return { pos: currentIdx + 1, total: questions.length };
    const indices = questions.reduce((acc, q, i) => {
      if (q.section_id === currentSection.section_id) acc.push(i);
      return acc;
    }, []);
    const pos = indices.length
      ? Math.max(indices.indexOf(currentIdx) + 1, 1)
      : currentIdx + 1;
    return { pos, total: indices.length || questions.length };
  }, [questions, currentIdx, currentSection, sectionsSummary]);

  const apiQuestionNumber =
    currentQuestion?.question_number ?? (currentIdx + 1);

  // ─── Submitted screen ────────────────────────────────────────────────────
    if (!instructionsAccepted && !submitted && !loading) {
    const InstructionsPage = aiProctored ? AssessmentInstructions : ManualTestInstructions;
    return (
      <InstructionsPage
        title={title}
        durationMinutes={durationMinutes}
        totalQuestions={questions.length}
        sectionCount={sectionsSummary?.length ?? 0}
        questionTypes={questionTypes}
        onStart={() => {
          setInstructionsAccepted(true);
          enterFullscreen();
        }}
      />
    );
  }

  // ─── Submitted screen ────────────────────────────────────────────────────
  if (submitted) {
    return (
      <Box
        sx={{
          bgcolor: PAGE_BG, fontFamily: FONT, minHeight: '100vh',
          display: 'flex', alignItems: 'center', justifyContent: 'center', px: 2,
        }}
      >
        <Container maxWidth="sm">
          <Card
            elevation={0}
            sx={{
              borderRadius: 4, border: '1px solid #E7EAE3', textAlign: 'center',
              px: { xs: 3, md: 6 }, py: { xs: 5, md: 7 },
              boxShadow: '0 4px 24px rgba(15, 23, 42, 0.06)',
            }}
          >
            <Box
              sx={{
                width: 76, height: 76, mx: 'auto', mb: 3,
                borderRadius: '50%',
                bgcolor: '#EAF2E9', color: '#3E6E3E',
                display: 'grid', placeItems: 'center',
              }}
            >
              <TaskAltOutlined sx={{ fontSize: 40 }} />
            </Box>

            <Typography sx={{ fontSize: { xs: 22, md: 26 }, fontWeight: 800, color: NAVY, mb: 1.25 }}>
              Test submitted successfully
            </Typography>

            <Typography
              sx={{
                fontSize: 15, color: MUTED, lineHeight: 1.7,
                mb: 4, maxWidth: 420, mx: 'auto',
              }}
            >
              Thank you for completing <strong style={{ color: NAVY }}>{title}</strong>.
              Your responses have been recorded. We appreciate your time and effort —
              the recruiter will be in touch with the next steps.
            </Typography>

            <Button
              variant="contained"
              onClick={() => navigate('/jobseeker/ai-assessments')}
              sx={{
                textTransform: 'none', fontWeight: 700, borderRadius: 2,
                bgcolor: NAVY, px: 4, py: 1.25,
                '&:hover': { bgcolor: NAVY_DK },
              }}
            >
              Back to Assessments
            </Button>
          </Card>
        </Container>
      </Box>
    );
  }

  if (preparingReview && !reviewSummary) {
    return (
      <Box
        sx={{
          bgcolor: PAGE_BG, fontFamily: FONT, minHeight: '100vh',
          display: 'flex', alignItems: 'center', justifyContent: 'center', px: 2,
        }}
      >
        <Container maxWidth="sm">
          <Card
            elevation={0}
            sx={{
              borderRadius: 4, border: '1px solid #E7EAE3', textAlign: 'center',
              px: { xs: 3, md: 6 }, py: { xs: 5, md: 7 },
              boxShadow: '0 4px 24px rgba(15, 23, 42, 0.06)',
            }}
          >
            <CircularProgress size={40} sx={{ color: NAVY, mb: 3 }} />
            <Typography sx={{ fontSize: { xs: 18, md: 20 }, fontWeight: 700, color: NAVY, mb: 1 }}>
              Preparing your review
            </Typography>
            <Typography sx={{ fontSize: 14, color: MUTED, lineHeight: 1.6 }}>
              Saving your progress and loading the review summary…
            </Typography>
          </Card>
        </Container>
      </Box>
    );
  }

  if (reviewSummary && !loading) {
    return (
      <Box sx={{ bgcolor: PAGE_BG, fontFamily: FONT, minHeight: '100vh', isolation: 'isolate' }}>
        {/* BUILD: 2026-09-17-proctor-assessment-v1 — proctoring UI */}
        <video ref={proctorVideoRef} autoPlay muted playsInline
          style={{ position: 'fixed', width: 320, height: 240, opacity: 0.001, pointerEvents: 'none', zIndex: -1, top: -9999, left: -9999 }}
        />
        {proctorBanner && (
          <Box sx={{
            position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)',
            zIndex: 1400, minWidth: 320, maxWidth: 560,
            px: 3, py: 1.5, borderRadius: 8,
            bgcolor: proctorBanner.kind === 'terminate' ? 'rgba(211,47,47,0.95)' : 'rgba(237,108,2,0.95)',
            color: '#fff', fontWeight: 600, fontSize: 14, textAlign: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          }}>
            {proctorBanner.message}
            {proctorBanner.strike && proctorBanner.maxStrikes && (
              <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.9 }}>
                ({proctorBanner.strike} of {proctorBanner.maxStrikes})
              </span>
            )}
          </Box>
        )}
        <TestWatermark assignmentId={assignmentId} />
        <ReviewPage
          title={title}
          reviewSummary={reviewSummary}
          visitedReviewSections={visitedReviewSections}
          lockedSectionIds={lockedSectionIds}
          onEnterSection={(secId) => enterReviewSection && enterReviewSection(secId)}
          onFinalSubmit={() => finalSubmit && finalSubmit()}
          submitting={submitting}
          error={error}
        />
      </Box>
    );
  }

  const isCodingQuestion = currentQuestion?.question_type === 'coding';

  const codingSectionQs = isCodingQuestion && currentSection
    ? questions.filter((q) => q.section_id == currentSection.section_id)
    : [];

  const codingSectionAnswered = codingSectionQs.filter(
    (q) => answers[q.id] !== undefined && answers[q.id] !== null,
  ).length;

  const sourceQs = codingSectionQs.length > 0 ? codingSectionQs : questions;
  const allCodingQuestions = isCodingQuestion
    ? sourceQs.map((q, idx) => ({
        id: q.id,
        questionNumber: idx + 1,
        title: `Problem ${idx + 1}`,
        isAnswered: answers[q.id] !== undefined && answers[q.id] !== null,
      }))
    : [];

  const handleCodingQuestionJump = (sectionIdx) => {
    const targetQ = sourceQs[sectionIdx];
    if (!targetQ) return;
    const globalIdx = questions.findIndex((q) => q.id === targetQ.id);
    if (globalIdx >= 0) goTo(globalIdx);
  };

  const handleRequestSubmit = () => {
    if (typeof openReviewSummary === 'function') {
      openReviewSummary();
    } else {
      // fallback if hook isn't wired
      submitTest();
    }
  };

  const sidebarContents = (
    <Stack spacing={2}>
      <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid #E7EAE3', p: 2.5 }}>
        {isCodingQuestion ? (
          <Box>
            <Typography
              sx={{
                fontSize: 11, fontWeight: 700, color: MUTED,
                mb: 1.25, textTransform: 'uppercase', letterSpacing: 0.6,
              }}
            >
              Question Palette
            </Typography>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.75 }}>
              <Typography
                sx={{
                  fontSize: 12.5, fontWeight: 700, color: NAVY,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}
              >
                {currentSection?.name ?? 'Coding'}
              </Typography>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: NAVY }}>
                {codingSectionAnswered}
                <Typography component="span" sx={{ fontSize: 11.5, color: MUTED, fontWeight: 500 }}>
                  {' '}/ {codingSectionQs.length}
                </Typography>
              </Typography>
            </Stack>
            <Box
              sx={{
                borderRadius: 2, bgcolor: '#F6F8F3',
                border: '1px solid #E7EAE3', px: 1.5, py: 1.25,
              }}
            >
              <Typography sx={{ fontSize: 11.5, color: MUTED, textAlign: 'center', lineHeight: 1.55 }}>
                Coding editor is active.
                <br />
                Use the editor's built-in controls to navigate.
              </Typography>
            </Box>
          </Box>
        ) : (
          <QuestionNavigator
            questions={questions}
            currentIdx={currentIdx}
            answers={answers}
            onGoTo={(idx) => { goTo(idx); setNavOpen(false); }}
            compact={!isDesktop}
            activeSectionId={sectionsSummary.length > 1 ? (currentSection?.section_id ?? null) : null}
            sectionName={currentSection?.name ?? null}
          />
        )}
      </Card>

      <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid #E7EAE3', p: 2.5 }}>
        <Stack
          direction="row" spacing={0.75} alignItems="center" justifyContent="center"
          sx={{ mb: isLastQuestion ? 1.5 : 0 }}
        >
          <CheckCircleOutlined sx={{ fontSize: 16, color: '#3E6E3E' }} />
          <Typography sx={{ fontSize: 13, color: '#55584F', fontWeight: 600 }}>
            {answeredCount} of {questions.length} answered
          </Typography>
        </Stack>

        {inReattemptPhase ? (
          <Button
            fullWidth
            variant="contained"
            startIcon={<AssignmentTurnedInOutlined />}
            disabled={submitting}
            onClick={() => { setNavOpen(false); exitReviewSection && exitReviewSection(); }}
            sx={{
              textTransform: 'none', fontWeight: 700, borderRadius: 2,
              bgcolor: NAVY, py: 1.25,
              '&:hover': { bgcolor: NAVY_DK },
            }}
          >
            Back to review page
          </Button>
        ) : isLastQuestion ? (
          <Button
            fullWidth
            variant="contained"
            endIcon={<SendOutlined />}
            disabled={submitting}
            onClick={() => { setNavOpen(false); handleRequestSubmit(); }}
            sx={{
              textTransform: 'none', fontWeight: 700, borderRadius: 2,
              bgcolor: NAVY, py: 1.25,
              '&:hover': { bgcolor: NAVY_DK },
            }}
          >
            {submitting
              ? <CircularProgress size={16} sx={{ color: '#fff' }} />
              : 'Submit Test'
            }
          </Button>
        ) : (
          <Typography sx={{ fontSize: 11.5, color: MUTED, textAlign: 'center', mt: 1 }}>
            Submit unlocks on the last question.
          </Typography>
        )}
      </Card>
    </Stack>
  );

  return (
    <Box
      sx={{
        bgcolor: PAGE_BG, fontFamily: FONT, minHeight: '100vh',
        display: 'flex', flexDirection: 'column',
        isolation: 'isolate',
      }}
    >
      {/* Proctoring: camera preview + status badge + warning banner */}
      <video ref={proctorVideoRef} autoPlay muted playsInline
        style={{ position: 'fixed', width: 320, height: 240, opacity: 0.001, pointerEvents: 'none', zIndex: -1, top: -9999, left: -9999 }}
      />
      {proctorBanner && (
        <Box sx={{
          position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)',
          zIndex: 1400, minWidth: 320, maxWidth: 560,
          px: 3, py: 1.5, borderRadius: 8,
          bgcolor: proctorBanner.kind === 'terminate' ? 'rgba(211,47,47,0.95)' : 'rgba(237,108,2,0.95)',
          color: '#fff', fontWeight: 600, fontSize: 14, textAlign: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}>
          {proctorBanner.message}
          {proctorBanner.strike && proctorBanner.maxStrikes && (
            <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.9 }}>
              ({proctorBanner.strike} of {proctorBanner.maxStrikes})
            </span>
          )}
        </Box>
      )}
      <TestWatermark assignmentId={assignmentId} />
      <Box
        component="header"
        sx={{
          bgcolor: NAVY, color: '#fff',
          px: { xs: 2, md: 4 }, py: 1.5,
          position: 'sticky', top: 0, zIndex: 1200,
          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.08)',
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
            <Tooltip title="Exit test">
              <IconButton
                size="small"
                onClick={() => navigate('/jobseeker/ai-assessments')}
                sx={{
                  color: 'rgba(255,255,255,0.85)', flexShrink: 0,
                  bgcolor: 'rgba(255,255,255,0.08)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.16)' },
                }}
              >
                <ArrowBackOutlined fontSize="small" />
              </IconButton>
            </Tooltip>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{
                  fontSize: 10.5, fontWeight: 700, opacity: 0.75,
                  textTransform: 'uppercase', letterSpacing: 1, lineHeight: 1,
                  display: { xs: 'none', sm: 'block' },
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  maxWidth: 480,
                }}
                title={sectionLabel ?? 'Manual Assessment'}
              >
                {inReattemptPhase
                  ? `Reviewing · ${sectionLabel ?? 'Manual Assessment'}`
                  : (sectionLabel ?? 'Manual Assessment')}
              </Typography>
              <Typography
                sx={{
                  fontSize: { xs: 14, sm: 15.5 }, fontWeight: 700,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  mt: { xs: 0, sm: 0.25 },
                }}
              >
                {title}
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1.5} alignItems="center" flexShrink={0}>
            {/* 🔧 REVIEW PHASE — quick "Back to review" button in the top bar */}
            {inReattemptPhase && (
              <Tooltip title="Back to the review page">
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<AssignmentTurnedInOutlined sx={{ fontSize: 16 }} />}
                  onClick={() => exitReviewSection && exitReviewSection()}
                  disabled={submitting}
                  sx={{
                    textTransform: 'none', fontWeight: 600, borderRadius: 2,
                    borderColor: 'rgba(255,255,255,0.4)', color: '#fff',
                    bgcolor: 'rgba(255,255,255,0.08)',
                    px: 1.5, height: 30, fontSize: 12,
                    '&:hover': {
                      borderColor: '#fff',
                      bgcolor: 'rgba(255,255,255,0.16)',
                    },
                  }}
                >
                  Review
                </Button>
              </Tooltip>
            )}

            {hasSectionTimer && (
              <Box
                sx={{
                  display: { xs: 'none', sm: 'flex' },
                  alignItems: 'center',
                  gap: 1.25,
                  bgcolor: currentSectionTimeLeft < 60
                    ? 'rgba(230, 90, 90, 0.18)'
                    : currentSectionTimeLeft < 300
                      ? 'rgba(255, 180, 60, 0.16)'
                      : 'rgba(242, 188, 154, 0.15)',
                  border: '1px solid',
                  borderColor: currentSectionTimeLeft < 60
                    ? 'rgba(230, 90, 90, 0.5)'
                    : currentSectionTimeLeft < 300
                      ? 'rgba(255, 180, 60, 0.5)'
                      : 'rgba(242, 188, 154, 0.4)',
                  borderRadius: 2,
                  px: 1.5, py: 0.75,
                  animation: currentSectionTimeLeft < 60
                    ? 'pulseTimer 1.8s ease-in-out infinite'
                    : 'none',
                  '@keyframes pulseTimer': {
                    '0%, 100%': { boxShadow: '0 0 0 0 rgba(230, 90, 90, 0)' },
                    '50%':      { boxShadow: '0 0 0 6px rgba(230, 90, 90, 0.18)' },
                  },
                }}
              >
                <Box
                  sx={{
                    width: 28, height: 28, borderRadius: '50%',
                    display: 'grid', placeItems: 'center',
                    bgcolor: currentSectionTimeLeft < 60 ? '#E65A5A'
                           : currentSectionTimeLeft < 300 ? '#FFB43C'
                           : '#F2BC9A',
                    color: currentSectionTimeLeft < 60 ? '#fff' : '#273238',
                    flexShrink: 0,
                  }}
                >
                  <TimerOutlined sx={{ fontSize: 16 }} />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
                  <Typography
                    sx={{
                      fontSize: 9, fontWeight: 700, opacity: 0.75,
                      textTransform: 'uppercase', letterSpacing: 1,
                    }}
                  >
                    {inReattemptPhase ? 'Review time' : 'Section time'}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: 18, fontWeight: 800, mt: 0.5,
                      fontVariantNumeric: 'tabular-nums', letterSpacing: 0.5,
                      color: currentSectionTimeLeft < 60 ? '#FF7C7C'
                           : currentSectionTimeLeft < 300 ? '#FFB43C'
                           : '#F2BC9A',
                    }}
                  >
                    {formatTime(currentSectionTimeLeft)}
                  </Typography>
                </Box>
              </Box>
            )}

            <Box
              sx={{
                display: { xs: 'none', sm: 'flex' },
                flexDirection: 'column',
                alignItems: 'center',
                bgcolor: 'rgba(255,255,255,0.13)',
                borderRadius: 2,
                px: 1.75, py: 0.5,
                minWidth: 56,
              }}
            >
              <Typography
                sx={{
                  fontSize: 13, fontWeight: 700,
                  lineHeight: 1.25, fontVariantNumeric: 'tabular-nums',
                }}
              >
                {loading ? '—' : `${sectionProgress.pos} / ${sectionProgress.total}`}
              </Typography>
              {!loading && currentSection?.name && sectionsSummary.length > 1 && (
                <Typography
                  sx={{
                    fontSize: 9.5, lineHeight: 1.1, opacity: 0.72,
                    textTransform: 'uppercase', letterSpacing: 0.5,
                    maxWidth: 72, overflow: 'hidden',
                    textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}
                >
                  {currentSection.name}
                </Typography>
              )}
            </Box>

            {!isDesktop && (
              <Tooltip title="Question navigator">
                <IconButton
                  size="small"
                  onClick={() => setNavOpen(true)}
                  sx={{
                    color: 'rgba(255,255,255,0.9)',
                    bgcolor: 'rgba(255,255,255,0.08)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.16)' },
                  }}
                >
                  <MenuOutlined fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </Stack>

        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            mt: 1.5, height: 4, borderRadius: 4,
            bgcolor: 'rgba(255,255,255,0.18)',
            '& .MuiLinearProgress-bar': {
              bgcolor: '#7F9E7E',
              borderRadius: 4,
              backgroundImage: 'linear-gradient(90deg, #7F9E7E 0%, #B8CFB7 100%)',
            },
          }}
        />
      </Box>

      {error && (
        <Container maxWidth="xl" sx={{ mt: 2 }}>
          <Alert severity="error" icon={<ErrorOutlined />} sx={{ borderRadius: 2 }}>
            {error}
          </Alert>
        </Container>
      )}

      <Box sx={{ flexGrow: 1, py: { xs: 2.5, md: 3 } }}>
        <Container maxWidth="xl">
          <Box sx={{ display: 'flex', gap: { xs: 0, md: 3 }, alignItems: 'flex-start' }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              {loading && (
                <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid #E7EAE3', overflow: 'hidden' }}>
                  <Box sx={{ height: 4, bgcolor: '#E7EAE3' }} />
                  <CardContent sx={{ p: { xs: 3, md: 4.5 } }}>
                    <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                      <Skeleton variant="rounded" width={48} height={26} sx={{ borderRadius: 1.5 }} />
                      <Skeleton variant="rounded" width={100} height={26} sx={{ borderRadius: 1.5 }} />
                      <Skeleton variant="rounded" width={70} height={26} sx={{ borderRadius: 1.5 }} />
                    </Stack>
                    <Skeleton width="85%" height={26} />
                    <Skeleton width="70%" height={22} sx={{ mt: 1 }} />
                    {[0, 1, 2, 3].map((i) => (
                      <Skeleton key={i} variant="rounded" height={52} sx={{ mt: 1.5, borderRadius: 2 }} />
                    ))}
                  </CardContent>
                </Card>
              )}

              {!loading && questions.length === 0 && !error && (
                <Card elevation={0} sx={{ borderRadius: 3, border: '1px dashed #D8DDD4', py: 8 }}>
                  <Stack alignItems="center" spacing={1.5}>
                    <RadioButtonUncheckedOutlined sx={{ fontSize: 48, color: NAVY, opacity: 0.4 }} />
                    <Typography sx={{ fontWeight: 700, color: NAVY, fontSize: 16 }}>
                      No questions in this test.
                    </Typography>
                    <Typography sx={{ fontSize: 13.5, color: MUTED }}>
                      Please contact the recruiter.
                    </Typography>
                  </Stack>
                </Card>
              )}

              {!loading && currentQuestion && (
                <Card
                  elevation={0}
                  sx={{
                    borderRadius: 3,
                    border: '1px solid #E7EAE3',
                    overflow: 'hidden',
                    boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
                  }}
                >
                  <Box
                    sx={{
                      height: 4,
                      bgcolor: DIFFICULTY_META[currentQuestion.difficulty]?.color ?? NAVY,
                    }}
                  />

                  <CardContent sx={{ p: { xs: 3, md: 4.5 } }}>
                    <SectionTabs
                      sections={sectionsSummary}
                      activeSectionId={currentSection?.section_id}
                      lockedSectionIds={lockedSectionIds}
                      onSelect={goToSection}
                      sx={{ mb: 2.5 }}
                    />

                    <Stack
                      direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap
                      sx={{ mb: 3 }}
                    >
                      <Chip
                        label={`Q ${currentIdx + 1}`}
                        size="small"
                        sx={{
                          bgcolor: NAVY, color: '#fff', fontWeight: 700, fontSize: 12,
                          height: 26, borderRadius: 1.5,
                        }}
                      />
                      {currentSection?.name && (
                        <Chip
                          label={
                            currentSection.pass_marks != null
                              ? `${currentSection.name} · pass ${currentSection.pass_marks}`
                              : currentSection.name
                          }
                          size="small"
                          sx={{
                            bgcolor: '#EDF3EC', color: '#5E815D',
                            fontWeight: 700, fontSize: 11.5,
                            height: 26, borderRadius: 1.5,
                            maxWidth: 260,
                            '& .MuiChip-label': {
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            },
                          }}
                        />
                      )}

                      

                      <Chip
                        label={TYPE_LABEL[currentQuestion.question_type] ?? currentQuestion.question_type}
                        size="small"
                        sx={{
                          fontSize: 11.5, height: 26, borderRadius: 1.5,
                          bgcolor: '#F6F8F3', color: '#55584F', fontWeight: 600,
                        }}
                      />
                      {DIFFICULTY_META[currentQuestion.difficulty] && (
                        <Chip
                          label={DIFFICULTY_META[currentQuestion.difficulty].label}
                          size="small"
                          sx={{
                            fontSize: 11.5, height: 26, borderRadius: 1.5, fontWeight: 600,
                            color:  DIFFICULTY_META[currentQuestion.difficulty].color,
                            bgcolor: DIFFICULTY_META[currentQuestion.difficulty].bg,
                          }}
                        />
                      )}
                      <Box sx={{ flexGrow: 1 }} />
                      <Box
                        sx={{
                          bgcolor: '#FBF0E7', color: '#A35A2D',
                          px: 1.5, py: 0.5, borderRadius: 1.5,
                          fontSize: 12, fontWeight: 700,
                          border: '1px solid #F0E0B8',
                        }}
                      >
                        {currentQuestion.marks}{' '}
                        {Number(currentQuestion.marks) === 1 ? 'Mark' : 'Marks'}
                      </Box>
                    </Stack>

                    <Box
                      sx={{
                        fontSize: { xs: 16, md: 17.5 },
                        color: '#1F1F1F',
                        lineHeight: 1.7,
                        fontWeight: 500,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        '& h4': {
                          fontSize: { xs: 14, md: 15 },
                          fontWeight: 700,
                          color: '#1F1F1F',
                          textTransform: 'uppercase',
                          letterSpacing: '0.03em',
                          mt: 2.25, mb: 0.75,
                        },
                        '& h4:first-of-type': { mt: 0 },
                        '& p': { m: 0, mb: 1, whiteSpace: 'pre-wrap' },
                        '& ul, & ol': { m: 0, mb: 1, pl: 3.5 },
                        '& li': { mb: 0.25 },
                        '& code': {
                          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
                          fontSize: '0.9em',
                          background: '#F6F8F3',
                          borderRadius: '4px',
                          px: 0.75, py: 0.25,
                          color: '#1F1F1F',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                        },
                        '& pre': {
                          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
                          fontSize: '0.9em',
                          background: '#1F1F1F',
                          color: '#E7EAE3',
                          borderRadius: '8px',
                          px: 1.5, py: 1.25,
                          m: 0, mb: 1.5,
                          overflowX: 'auto',
                          whiteSpace: 'pre',
                        },
                        '& table': {
                          borderCollapse: 'collapse',
                          width: 'auto',
                          minWidth: '50%',
                          maxWidth: '100%',
                          my: 1,
                          fontSize: { xs: 13.5, md: 14.5 },
                          background: '#FFFFFF',
                          border: '1px solid #D8DDD4',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          display: 'table',
                        },
                        '& thead': {
                          background: '#F6F8F3',
                        },
                        '& th': {
                          textAlign: 'left',
                          fontWeight: 700,
                          color: '#1F1F1F',
                          borderBottom: '1px solid #D8DDD4',
                          borderRight: '1px solid #E7EAE3',
                          px: 1.5, py: 0.9,
                        },
                        '& th:last-child': { borderRight: 'none' },
                        '& td': {
                          borderBottom: '1px solid #E7EAE3',
                          borderRight: '1px solid #E7EAE3',
                          color: '#1F1F1F',
                          px: 1.5, py: 0.75,
                          verticalAlign: 'top',
                        },
                        '& td:last-child': { borderRight: 'none' },
                        '& tbody tr:last-child td': { borderBottom: 'none' },
                        '& strong': { fontWeight: 700, color: '#1F1F1F' },
                    
                        '& details.view-schema': {
                          mt: 2, mb: 1,
                          border: '1px solid #D8DDD4',
                          borderRadius: '10px',
                          background: '#F6F8F3',
                          overflow: 'hidden',
                          '&[open]': {
                            background: '#FFFFFF',
                          },
                        },
                        '& details.view-schema > summary': {
                          cursor: 'pointer',
                          listStyle: 'none',
                          userSelect: 'none',
                          padding: '10px 16px',
                          fontSize: { xs: 13.5, md: 14 },
                          fontWeight: 700,
                          color: '#5E815D',
                          background: '#EDF3EC',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          '&::-webkit-details-marker': { display: 'none' },
                          '&::before': {
                            content: '"▸"',
                            display: 'inline-block',
                            transition: 'transform 0.15s',
                            fontSize: '0.9em',
                          },
                          '&:hover': { background: '#DDE9DC' },
                        },
                        '& details.view-schema[open] > summary::before': {
                          transform: 'rotate(90deg)',
                        },
                        '& details.view-schema .view-schema-body': {
                          padding: '12px 16px 16px',
                          borderTop: '1px solid #E7EAE3',
                        },
                        '& details.view-schema h5': {
                          fontSize: { xs: 12.5, md: 13 },
                          fontWeight: 700,
                          color: '#1F1F1F',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          mt: 2, mb: 0.75,
                        },
                        '& details.view-schema h5:first-of-type': { mt: 0 },
                       
                        '& table.sql-out-header': {
                          borderCollapse: 'collapse',
                          my: 1.25,
                          border: '2px solid #1F1F1F',
                          background: '#FFFFFF',
                          borderRadius: 0,
                          '& th': {
                            fontWeight: 700,
                            color: '#1F1F1F',
                            background: '#FFFFFF',
                            borderRight: '1px solid #1F1F1F',
                            textAlign: 'center',
                            px: 2, py: 0.9,
                          },
                          '& th:last-child': { borderRight: 'none' },
                        },
                      }}
                      dangerouslySetInnerHTML={{
                        __html: currentQuestionStem,
                      }}
                    />

                    {/* 🔧 NEW — render stem images (figure matrices, diagrams, charts) */}
                    {Array.isArray(currentQuestion.content?.stem_images) && currentQuestion.content.stem_images.length > 0 && (
                      <Box sx={{
                        mt: 2.5, mb: 1,
                        display: 'flex', flexWrap: 'wrap', gap: 1.5,
                      }}>
                        {currentQuestion.content.stem_images.map((img, ii) => {
                          const src = typeof img === 'string' ? img : (img?.url || '');
                          if (!src) return null;
                          return (
                            <Box key={ii}
                              component="img"
                              src={src}
                              alt={`Question diagram ${ii + 1}`}
                              sx={{
                                maxWidth: { xs: '100%', md: 420 },
                                maxHeight: 320,
                                borderRadius: 1.5,
                                border: '1px solid #E7EAE3',
                                bgcolor: '#FFFFFF',
                                objectFit: 'contain',
                             display: 'block',
                              }}
                            />
                          );
                        })}
                      </Box>
                    )}

                    {/* BUILD: 2026-08-12-RESUME-ON-DISCONNECT-v1 — welcome-back banner.
                        Shown once per resumed session; dismissible so the
                        candidate can hide it after acknowledging. */}
                    {resumeInfo?.isResuming && (
                      <Alert
                        severity="info"
                        icon={<RestoreOutlined />}
                        onClose={dismissResumeBanner}
                        sx={{
                          mt: 1, mb: 1, borderRadius: 2, fontSize: 13,
                          bgcolor: '#E3F2FB', color: '#0C4A6E',
                          border: '1px solid #BAE6FD',
                          '& .MuiAlert-icon': { color: '#0284c7' },
                        }}
                      >
                        <b>Welcome back —</b> your session was restored. Your
                        earlier answers are saved and we brought you back to
                        the question you were on. Your section timer has been
                        running server-side, so any time that passed while you
                        were away has already been counted.
                      </Alert>
                    )}

                
                    {!isOnline && (
                      <Alert
                        severity="warning"
                        icon={<WifiOffOutlined />}
                        sx={{
                          mt: 1, mb: 1, borderRadius: 2, fontSize: 13,
                          bgcolor: '#FEF3C7', color: '#78350F',
                          border: '1px solid #FDE68A',
                          '& .MuiAlert-icon': { color: '#B45309' },
                        }}
                      >
                        <b>You appear to be offline.</b> Your typed answers
                        are held locally and will save automatically once your
                        connection returns. The section timer keeps running,
                        so please reconnect as soon as you can.
                      </Alert>
                    )}

                    {(() => {
                      const st = saveStatus[currentQuestion.id];
                      if (!st) return null;
                      const meta = st === 'saving'
                        ? { icon: <CloudSyncOutlined sx={{ fontSize: 14 }} />,
                            text: 'Saving…',
                            bg: '#F6ECDF', fg: '#A35A2D', border: '#E5CFB0' }
                        : st === 'saved'
                        ? { icon: <CloudDoneOutlined sx={{ fontSize: 14 }} />,
                            text: 'Saved',
                            bg: '#EAF2E9', fg: '#3E6E3E', border: '#C9DEC7' }
                        : { icon: <CloudOffOutlined sx={{ fontSize: 14 }} />,
                            text: 'Not saved — will retry',
                            bg: '#FAEAE8', fg: '#A63D2F', border: '#F0C3BE' };
                      return (
                        <Box sx={{
                          display: 'inline-flex', alignItems: 'center', gap: 0.5,
                          mt: 1, px: 1, py: 0.25, borderRadius: '999px',
                          bgcolor: meta.bg, color: meta.fg,
                          border: `1px solid ${meta.border}`,
                          fontSize: 11, fontWeight: 700,
                        }}>
                          {meta.icon}
                          <span>{meta.text}</span>
                        </Box>
                      );
                    })()}

                    {currentSectionLocked ? (
                      <Alert
                        severity="warning"
                        icon={<TimerOutlined />}
                        sx={{ mt: 3, borderRadius: 2, fontSize: 14 }}
                      >
                        <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#A35A2D' }}>
                          {inReattemptPhase ? 'This section is locked' : 'Section time expired'}
                        </Typography>
                        <Typography sx={{ fontSize: 13, color: '#A35A2D', mt: 0.5 }}>
                          {inReattemptPhase
                            ? 'You can only edit answers in the section you are reviewing. Use "Back to review page" to return and pick another section.'
                            : 'You can no longer answer questions in this section. Use the question palette to continue with the next section.'}
                        </Typography>
                      </Alert>
                    ) : currentQuestion.content ? (
                      <AnswerInput
                        question={currentQuestion}
                        value={answers[currentQuestion.id] ?? null}
                        onChange={(val) => answerQuestion(currentQuestion.id, val)}
                        timeLeft={timeLeft}
                        goPrev={goPrev}
                        goNext={goNext}
                        submitTest={inReattemptPhase
                          ? (() => exitReviewSection && exitReviewSection())
                          : handleRequestSubmit
                        }
                        currentIdx={currentIdx}
                        questionsLength={questions.length}
                        assignmentId={assignmentId}
                        currentSectionTimeLeft={currentSectionTimeLeft}
                        sectionExpired={currentSectionLocked}
                        sectionPos={sectionProgress.pos}
                        sectionTotal={sectionProgress.total}
                        allQuestions={allCodingQuestions}
                        onQuestionJump={handleCodingQuestionJump}
                     
                        apiQuestionNumber={apiQuestionNumber}
                      />
                    ) : (
                      <Alert severity="warning" sx={{ mt: 2, borderRadius: 2 }}>
                        Content for this question could not be loaded.
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              )}
            </Box>

            {isDesktop && !loading && questions.length > 0 && (
              <Box
                sx={{
                  width: SIDEBAR_WIDTH, flexShrink: 0,
                  position: 'sticky', top: 88, alignSelf: 'flex-start',
                }}
              >
                {sidebarContents}
              </Box>
            )}
          </Box>
        </Container>
      </Box>

      {!loading && questions.length > 0 && (
        <Box
          sx={{
            bgcolor: '#fff', borderTop: '1px solid #E7EAE3',
            px: { xs: 2, md: 4 }, py: 1.5,
            position: 'sticky', bottom: 0, zIndex: 1100,
            boxShadow: '0 -2px 8px rgba(15, 23, 42, 0.04)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-start' }}>
              <Button
                variant="outlined"
                startIcon={<ArrowBackOutlined />}
                disabled={currentIdx === 0}
                onClick={goPrev}
                sx={{
                  textTransform: 'none', fontWeight: 600, borderRadius: 2,
                  bgcolor: NAVY, color: '#fff', px: 3,
                  boxShadow: 'none',
                  '&:hover': { bgcolor: NAVY_DK, boxShadow: 'none' },
                  '&.Mui-disabled': { bgcolor: '#D8DDD4', color: '#fff' },
                }}
              >
                Previous
              </Button>
            </Box>

            <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              {currentIdx < questions.length - 1 && !inReattemptPhase && (
                <Button
                  variant="text"
                  onClick={goNext}
                  sx={{
                    textTransform: 'none', fontWeight: 600, borderRadius: 2,
                    bgcolor: NAVY, px: 3, color: '#fff',
                    '&:hover': { bgcolor: NAVY_DK },
                  }}
                >
                  Skip for now
                </Button>
              )}
            </Box>

            <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
              {/* 🔧 REVIEW PHASE: Next at last question of the reviewed section
                  returns to the review page; otherwise Submit Test → review */}
              {inReattemptPhase ? (
                <Button
                  variant="contained"
                  endIcon={<AssignmentTurnedInOutlined />}
                  disabled={submitting}
                  onClick={() => exitReviewSection && exitReviewSection()}
                  sx={{
                    textTransform: 'none', fontWeight: 700, borderRadius: 2,
                    bgcolor: NAVY, px: 3,
                    '&:hover': { bgcolor: NAVY_DK },
                  }}
                >
                  Back to review
                </Button>
              ) : currentIdx < questions.length - 1 ? (
                <Button
                  variant="contained"
                  endIcon={<ArrowForwardOutlined />}
                  onClick={goNext}
                  sx={{
                    textTransform: 'none', fontWeight: 600, borderRadius: 2,
                    bgcolor: NAVY, px: 3,
                    '&:hover': { bgcolor: NAVY_DK },
                  }}
                >
                  Next
                </Button>
              ) : (
                <Button
                  variant="contained"
                  endIcon={submitting ? null : <SendOutlined />}
                  disabled={submitting}
                  onClick={handleRequestSubmit}
                  sx={{
                    display: { xs: 'inline-flex', md: 'none' },
                    textTransform: 'none', fontWeight: 700, borderRadius: 2,
                    bgcolor: '#3E6E3E', px: 3,
                    '&:hover': { bgcolor: '#3E6E3E' },
                  }}
                >
                  {submitting
                    ? <CircularProgress size={16} sx={{ color: '#fff' }} />
                    : 'Submit Test'
                  }
                </Button>
              )}
            </Box>
          </Box>
        </Box>
      )}

      <Drawer
        anchor="right"
        open={navOpen}
        onClose={() => setNavOpen(false)}
        slotProps={{
          paper: {
            sx: { width: { xs: '88%', sm: 320 }, p: 2.5, bgcolor: PAGE_BG, fontFamily: FONT },
          },
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Typography sx={{ fontWeight: 700, color: NAVY, fontSize: 16 }}>
            Test Navigator
          </Typography>
          <IconButton size="small" onClick={() => setNavOpen(false)}>
            <CloseOutlined fontSize="small" />
          </IconButton>
        </Stack>
        {sidebarContents}
      </Drawer>

      <Dialog
        open={Boolean(pendingSectionComplete)}
        onClose={dismissSectionComplete}
        maxWidth="xs"
        fullWidth
        sx={{ zIndex: 10000 }}
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: NAVY, pb: 1, pr: 6 }}>
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Box
              sx={{
                width: 36, height: 36, borderRadius: '50%',
                bgcolor: '#EAF2E9', color: '#3E6E3E',
                display: 'grid', placeItems: 'center', flexShrink: 0,
              }}
            >
              <TaskAltOutlined sx={{ fontSize: 20 }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: 17, fontWeight: 700, color: NAVY, lineHeight: 1.3 }}>
                Section complete
              </Typography>
              {pendingSectionComplete?.fromSection?.name && (
                <Typography sx={{ fontSize: 12.5, color: MUTED, mt: 0.25 }}>
                  {pendingSectionComplete.fromSection.name}
                </Typography>
              )}
            </Box>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ fontSize: 14, color: '#55584F', mb: 2 }}>
            You've reached the end of this section.
            {pendingSectionComplete?.toSection?.name && (
              <>
                {' '}Ready to begin{' '}
                <strong style={{ color: NAVY }}>
                  {pendingSectionComplete.toSection.name}
                </strong>
                ?
              </>
            )}
          </DialogContentText>
          <Alert severity="info" sx={{ borderRadius: 2, fontSize: 12.5, py: 0.5 }}>
            The timer keeps running. You can still revisit previous questions
            using the question palette.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button
            onClick={dismissSectionComplete}
            sx={{ textTransform: 'none', color: MUTED }}
          >
            Review again
          </Button>
          <Button
            variant="contained"
            endIcon={<ArrowForwardOutlined />}
            onClick={confirmSectionComplete}
            sx={{
              textTransform: 'none', fontWeight: 700, borderRadius: 2,
              bgcolor: NAVY,
              '&:hover': { bgcolor: NAVY_DK },
            }}
          >
            Continue
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}