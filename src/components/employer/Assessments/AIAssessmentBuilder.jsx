import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  Button,
  Stack,
  TextField,
  IconButton,
  Tooltip,
  Chip,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  ArrowBack,
  AutoAwesome,
  Delete,
  Refresh,
  Edit,
  CheckCircle,
  Save,
  ExpandMore,
  DescriptionOutlined,
  Search,
  ArrowForward,
  UploadFileOutlined,
  TimerOutlined,
  StarOutlineRounded,
  TextSnippetOutlined,
  ListAltOutlined,
  ViewModuleOutlined,
  WarningAmberRounded,
  CloseRounded,
  CheckCircleOutlined,
  DownloadRounded,
  LightbulbOutlined,
} from "@mui/icons-material";
import { useNavigate, useSearchParams } from "react-router-dom";

import { T } from "./Extendedbuilder";
import useAssessmentConfig from "../../../hooks/employer/useAssessmentConfig";
import useAssessmentGeneration from "../../../hooks/employer/useAssessmentGeneration";
import usePaperRepository from "../../../hooks/employer/usePaperRepository";
import ConfigurePage from "./ConfigurePage";
import ReviewApprovePage from "./ReviewApprovePage";


import {
  AI_STEPS,
  QTYPE_LABEL,
  sectionCard,
  navyBtn,
  ghostBtn,
  formatStem,
} from "./AIBuilderShared";


// ─────────────────────────────────────────────────────────────────────────────
// INSTRUCTIONS PAGE — shown once before the builder on first open.
// ─────────────────────────────────────────────────────────────────────────────

/* ── Shared styles ── */
const _INS = {
  hero: {
    display: 'flex', alignItems: 'center', gap: { xs: '12px', sm: '20px' },
    bgcolor: '#FFFFFF', border: '0.5px solid #E7EAE3', borderRadius: '14px',
    p: { xs: '16px', sm: '20px 24px' }, mb: 1.5,
  },
  badge: {
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    fontSize: '10.5px', fontWeight: 600, px: 1.1, py: 0.3,
    borderRadius: 999, bgcolor: 'rgba(127,158,126,0.10)', color: '#6C8B6B', mb: 0.5,
  },
  stepRow: {
    display: 'flex', gap: { xs: 0.75, sm: 1 }, mb: 1.5,
    flexDirection: { xs: 'column', sm: 'row' },
  },
  step: {
    flex: 1, display: 'flex', alignItems: 'center', gap: '10px',
    bgcolor: '#FFFFFF', border: '0.5px solid #E7EAE3', borderRadius: '10px',
    p: '11px 14px',
  },
  stepNum: (bg, color) => ({
    width: 22, height: 22, borderRadius: '50%', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    fontSize: '0.65rem', fontWeight: 700, flexShrink: 0, bgcolor: bg, color,
  }),
  dlStrip: {
    display: 'flex', alignItems: 'center', gap: { xs: '10px', sm: '16px' },
    bgcolor: 'rgba(127,158,126,0.08)', border: '0.5px solid rgba(127,158,126,0.22)',
    borderRadius: '12px', p: '12px 18px', mb: 1,
    flexDirection: { xs: 'column', sm: 'row' },
  },
  acc: {
    bgcolor: '#FFFFFF', border: '0.5px solid #E7EAE3', borderRadius: '12px',
    mb: 1, overflow: 'hidden',
  },
  accHead: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    p: '13px 18px', cursor: 'pointer', userSelect: 'none',
    transition: 'background 0.15s ease',
    '&:hover': { bgcolor: '#FAFCF9' },
  },
  accTitle: { fontSize: '0.82rem', fontWeight: 600, color: '#022124' },
  accBody: { px: '18px', pb: '16px' },
  tipGrid: {
    display: 'grid',
    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
    gap: '4px 16px',
  },
  tip: {
    display: 'flex', gap: '7px', py: '5px',
    fontSize: '0.76rem', lineHeight: 1.5, color: '#6F7470',
  },
  tipBold: { color: '#022124', fontWeight: 600 },
  exGrid: {
    display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
    gap: 1, mt: 1.25,
  },
  pill: {
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    px: 1.1, py: 0.4, borderRadius: 999, fontSize: '0.7rem', fontWeight: 600,
    bgcolor: '#F4F7F2', color: '#022124', border: '0.5px solid #E7EAE3',
  },
};

const _STEP_CFG = [
  { n: '1', label: 'Configure', bg: 'rgba(127,158,126,0.10)', color: '#6C8B6B', sub: 'Role, sections, topics' },
  { n: '2', label: 'Generate and review', bg: 'rgba(75,158,154,0.10)', color: '#4B9E9A', sub: 'AI writes, you edit' },
  { n: '3', label: 'Approve and assign', bg: '#F7EFE6', color: '#C08A5B', sub: 'Lock, assign, auto-grade' },
];

const _QTYPES_DISPLAY = [
  { icon: ListAltOutlined, label: 'MCQ' },
  { icon: CheckCircleOutlined, label: 'Multi select' },
  { icon: CheckCircleOutlined, label: 'True / false' },
  { icon: TextSnippetOutlined, label: 'Fill in blank' },
  { icon: ViewModuleOutlined, label: 'Match following' },
  { icon: ListAltOutlined, label: 'Sequencing' },
  { icon: TextSnippetOutlined, label: 'Short answer' },
  { icon: DescriptionOutlined, label: 'Coding challenge' },
  { icon: DescriptionOutlined, label: 'SQL query' },
  { icon: AutoAwesome, label: 'Scenario' },
];

/* ── Sample document content for download ── */
const _SAMPLE_DOC_CONTENT = `SAMPLE TOPIC DOCUMENT — Backend Developer (Senior Level)
=========================================================

This is a sample document showing the ideal format for the AI Assessment Builder.
Use this as a template when writing your own topic document. The AI reads this
to understand what concepts to test — it never quotes from it directly.

───────────────────────────────────────────────────────────

SECTION 1 — Core Technical Topics
───────────────────────────────────
These are the primary topics the assessment should focus on.
Topics listed with more detail will receive more questions.

Python Fundamentals
  • Decorators — writing custom decorators, decorator chaining, functools.wraps
  • Generators and iterators — yield, generator expressions, memory efficiency
  • Context managers — __enter__/__exit__, contextlib, resource cleanup
  • Type hints — typing module, Optional, Union, Protocol, runtime checking

Django & Database Layer
  • ORM queries vs raw SQL — when to use each, QuerySet evaluation, N+1 problem
  • Database transactions — ACID properties, atomic blocks, isolation levels
  • Database indexing — B-tree vs hash indexes, composite indexes, EXPLAIN plans
  • Migration strategies — zero-downtime migrations, data migrations, squashing

REST API Design
  • API versioning strategies — URL path, header, query parameter approaches
  • Authentication — JWT tokens, OAuth 2.0 flows, refresh token rotation
  • Pagination patterns — cursor-based vs offset, keyset pagination
  • Rate limiting — token bucket, sliding window, per-user vs per-endpoint
  • Error handling — RFC 7807 problem details, consistent error response format

Caching & Performance
  • Redis caching patterns — cache-aside, write-through, cache invalidation
  • Application-level caching — query caching, view caching, fragment caching
  • CDN and static asset optimization

DevOps & Deployment
  • Docker — multi-stage builds, layer optimization, security scanning
  • CI/CD pipelines — GitHub Actions YAML, automated testing gates
  • Container orchestration basics — pods, services, deployments

───────────────────────────────────────────────────────────

SECTION 2 — Testing & Code Quality
────────────────────────────────────
Questions from this section should evaluate the candidate's approach
to writing maintainable, testable code.

  • Unit testing with pytest — fixtures, parametrize, mocking with unittest.mock
  • Integration testing — database fixtures, API endpoint testing, test isolation
  • Code review practices — identifying code smells, suggesting refactors
  • SOLID principles — practical application, trade-offs in real systems
  • Design patterns — Repository, Factory, Observer, Strategy — when to use each

───────────────────────────────────────────────────────────

SECTION 3 — Problem Solving & Aptitude
────────────────────────────────────────
This section name tells the AI to generate reasoning and analytical
questions rather than technical ones — even though it reads the same document.

  • Logical reasoning — pattern recognition, sequence completion
  • Data interpretation — reading charts, tables, drawing conclusions
  • Algorithmic thinking — time/space complexity analysis, Big-O notation
  • System design reasoning — trade-off analysis, scalability decisions

───────────────────────────────────────────────────────────

WHY THIS DOCUMENT WORKS:
It lists specific, testable topics (not vague responsibilities). It structures
content by section name so the AI knows what type of questions to generate.
Topics mentioned in more detail (like REST API design with 5 sub-topics) will
naturally receive more questions than topics with fewer details (like CDN
optimization). The AI uses this as a map — it never copies text from here
into questions.

Generated by iEvalX — AI Assessment Builder
`;

/* ── Lazy jsPDF loader ── */
let _jsPDFPromise = null;
const _loadJsPDF = () => {
  if (!_jsPDFPromise) {
    _jsPDFPromise = import('jspdf')
      .then((m) => m.jsPDF)
      .catch((err) => { _jsPDFPromise = null; throw err; });
  }
  return _jsPDFPromise;
};

async function _downloadSampleDoc() {
  try {
    const jsPDF = await _loadJsPDF();
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const PAGE_W = doc.internal.pageSize.getWidth();
    const PAGE_H = doc.internal.pageSize.getHeight();
    const MARGIN_X = 18, MARGIN_TOP = 20, MARGIN_BOT = 18;
    const MAX_W = PAGE_W - MARGIN_X * 2;
    let y = MARGIN_TOP;

    const ensureRoom = (n) => { if (y + n > PAGE_H - MARGIN_BOT) { doc.addPage(); y = MARGIN_TOP; } };
    const write = (text, { size = 10, style = 'normal', color = [55,55,55], indent = 0, gap = 4.6 } = {}) => {
      doc.setFont('helvetica', style); doc.setFontSize(size);
      doc.setTextColor(color[0], color[1], color[2]);
      for (const l of doc.splitTextToSize(text, MAX_W - indent)) {
        ensureRoom(gap); doc.text(l, MARGIN_X + indent, y); y += gap;
      }
    };
    const rule = () => {
      ensureRoom(3);
      doc.setDrawColor(210,210,210); doc.setLineWidth(0.2);
      doc.line(MARGIN_X, y, PAGE_W - MARGIN_X, y); y += 3;
    };

    for (const raw of _SAMPLE_DOC_CONTENT.split('\n')) {
      const line = raw.replace(/\t/g, '  ');
      const t = line.trim();
      if (!t) { y += 2; continue; }
      if (/^[\u2500\u2550]{3,}$/.test(t)) { rule(); continue; }
      if (/^SAMPLE TOPIC DOCUMENT/i.test(t)) { write(t, { size:15, style:'bold', color:[2,33,36], gap:6 }); continue; }
      if (/^SECTION\s+\d+/i.test(t))        { y += 2; write(t, { size:12, style:'bold', color:[2,33,36], gap:5.5 }); continue; }
      if (/^WHY THIS DOCUMENT WORKS:/i.test(t)) { y += 2; write(t, { size:10.5, style:'bold', color:[108,139,107], gap:5 }); continue; }
      if (/^Generated by iEvalX/i.test(t))  { y += 2; write(t, { size:8.5, style:'italic', color:[150,150,150], gap:4 }); continue; }
      if (/^\u2022/.test(t))                { write(t, { size:9.5, color:[70,70,70], indent:4, gap:4.4 }); continue; }
      if (!/^\s/.test(raw) && /^[A-Z]/.test(t)) { y += 1; write(t, { size:10.5, style:'bold', color:[40,60,55], gap:5 }); continue; }
      write(t, { size:10, color:[60,60,60], gap:4.6 });
    }

    doc.save('Sample_Topic_Document_Backend_Developer.pdf');
  } catch (err) {
    console.error('Sample PDF generation failed:', err);
  }
}

/* ── Accordion section component ── */
function _AccSection({ icon: Icon, title, defaultOpen, children }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <Box sx={_INS.acc}>
      <Box sx={_INS.accHead} onClick={() => setOpen(!open)}>
        <Stack direction="row" alignItems="center" spacing={0.75}>
          <Icon sx={{ fontSize: 16, color: '#A8ADA8' }} />
          <Typography sx={_INS.accTitle}>{title}</Typography>
        </Stack>
        <ExpandMore sx={{
          fontSize: 18, color: '#A8ADA8',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease',
        }} />
      </Box>
      {open && <Box sx={_INS.accBody}>{children}</Box>}
    </Box>
  );
}

/* ── Tip row (compact) ── */
function _Tip({ icon: Icon, children }) {
  return (
    <Box sx={_INS.tip}>
      <Icon sx={{ fontSize: 14, color: '#A8ADA8', mt: '2px', flexShrink: 0 }} />
      <Typography sx={{ fontSize: 'inherit', lineHeight: 'inherit', color: 'inherit' }}>{children}</Typography>
    </Box>
  );
}

/* ── Full-screen card style — used across the 2-column grid ── */
const _INS_CARD = {
  bgcolor: '#FFFFFF',
  border: '0.5px solid #E7EAE3',
  borderRadius: '14px',
  overflow: 'hidden',
};

/* ── Section header inside a card ── */
function _CardHeader({ icon: Icon, title, subtitle }) {
  return (
    <Box sx={{
      display: 'flex', alignItems: 'flex-start', gap: 1.25,
      px: { xs: 2, sm: 2.5 }, pt: { xs: 2, sm: 2.25 }, pb: 1.5,
    }}>
      <Box sx={{
        width: 32, height: 32, borderRadius: '9px', flexShrink: 0,
        bgcolor: 'rgba(127,158,126,0.10)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon sx={{ fontSize: 17, color: '#6C8B6B' }} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: '#022124', lineHeight: 1.3 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography sx={{ fontSize: '0.72rem', color: '#6F7470', mt: 0.25 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

function InstructionsPage({ onStart }) {
  return (
    <Box sx={{ py: 0 }}>

      {/* ══════════ FULL-WIDTH HERO BAND ══════════ */}
      <Box sx={{
        bgcolor: '#022124', color: '#fff',
        borderRadius: '16px',
        px: { xs: 2.5, sm: 4 }, py: { xs: 2.5, sm: 3 },
        mb: 2,
        position: 'relative', overflow: 'hidden',
        display: 'flex', alignItems: 'center', gap: 2,
        flexDirection: { xs: 'column', sm: 'row' },
      }}>
        {/* subtle glow */}
        <Box sx={{
          position: 'absolute', right: -50, top: -40,
          width: 220, height: 220, borderRadius: '50%',
          bgcolor: 'rgba(127,158,126,0.14)',
        }} />
        <Box sx={{
          position: 'absolute', right: 80, bottom: -60,
          width: 140, height: 140, borderRadius: '50%',
          bgcolor: 'rgba(127,158,126,0.08)',
        }} />

        <Box sx={{ flex: 1, position: 'relative', width: '100%' }}>
          <Box sx={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            fontSize: '10.5px', fontWeight: 700, px: 1.2, py: 0.35,
            borderRadius: 999, bgcolor: 'rgba(127,158,126,0.20)',
            color: '#B9CFB8', mb: 0.75,
            letterSpacing: '0.5px', textTransform: 'uppercase',
          }}>
            <AutoAwesome sx={{ fontSize: 12 }} /> Before you begin
          </Box>
          <Typography sx={{
            fontSize: { xs: '1.35rem', sm: '1.65rem' }, fontWeight: 700,
            color: '#fff', lineHeight: 1.2,
          }}>
            AI assessment builder
          </Typography>
          <Typography sx={{
            fontSize: '0.85rem', color: 'rgba(255,255,255,0.72)', mt: 0.5,
          }}>
            Read the guide or jump straight in — everything you need is on this page.
          </Typography>
        </Box>
        <Button
          onClick={onStart}
          variant="contained"
          disableElevation
          endIcon={<ArrowForward sx={{ fontSize: 16 }} />}
          sx={{
            bgcolor: '#7F9E7E', color: '#022124', textTransform: 'none',
            fontWeight: 700, fontSize: '0.88rem', borderRadius: '11px',
            px: 3, py: 1.25, flexShrink: 0, position: 'relative',
            width: { xs: '100%', sm: 'auto' },
            '&:hover': { bgcolor: '#8FAE8D' },
          }}
        >
          Start building
        </Button>
      </Box>

      {/* ══════════ FULL-WIDTH 3-STEP STRIP ══════════ */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
        gap: 1.25, mb: 2,
      }}>
        {_STEP_CFG.map((s) => (
          <Box key={s.n} sx={{
            display: 'flex', alignItems: 'center', gap: '12px',
            bgcolor: '#FFFFFF', border: '0.5px solid #E7EAE3', borderRadius: '12px',
            p: '14px 16px',
          }}>
            <Box sx={_INS.stepNum(s.bg, s.color)}>{s.n}</Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: '#022124' }}>
                {s.label}
              </Typography>
              <Typography sx={{ fontSize: '0.72rem', color: '#6F7470' }}>
                {s.sub}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>

      {/* ══════════ TWO-COLUMN BODY ══════════ */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 2fr) minmax(0, 1fr)' },
        gap: { xs: 1.5, md: 2 },
        alignItems: 'start',
      }}>

        {/* ═════════ LEFT COLUMN — main guide ═════════ */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, minWidth: 0 }}>

          {/* How to write your topic document */}
          <Box sx={_INS_CARD}>
            <_CardHeader
              icon={DescriptionOutlined}
              title="How to write your topic document"
              subtitle="Six rules to follow before you upload."
            />
            <Box sx={{ px: { xs: 2, sm: 2.5 }, pb: 2.5 }}>
              <Box sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: '6px 20px',
              }}>
                <_Tip icon={DescriptionOutlined}>
                  <Box component="span" sx={_INS.tipBold}>PDF, DOCX, or TXT. </Box>
                  Max 10 MB, first ~20k characters are read.
                </_Tip>
                <_Tip icon={ListAltOutlined}>
                  <Box component="span" sx={_INS.tipBold}>List specific topics. </Box>
                  "JWT auth, rate limiting" not "backend development".
                </_Tip>
                <_Tip icon={ViewModuleOutlined}>
                  <Box component="span" sx={_INS.tipBold}>More detail = more questions </Box>
                  on that topic.
                </_Tip>
                <_Tip icon={TextSnippetOutlined}>
                  <Box component="span" sx={_INS.tipBold}>One doc, all sections. </Box>
                  AI routes topics by section name.
                </_Tip>
                <_Tip icon={WarningAmberRounded}>
                  <Box component="span" sx={_INS.tipBold}>Not a job description. </Box>
                  List what to test, not responsibilities.
                </_Tip>
                <_Tip icon={CloseRounded}>
                  <Box component="span" sx={_INS.tipBold}>Candidates never see it. </Box>
                  AI writes original questions only.
                </_Tip>
              </Box>

              {/* Good vs Weak */}
              <Box sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 1.25, mt: 2,
              }}>
                <Box sx={{
                  borderRadius: '10px', p: '12px 14px', fontSize: '0.75rem', lineHeight: 1.6,
                  bgcolor: 'rgba(127,158,126,0.06)', border: '0.5px solid rgba(127,158,126,0.22)',
                  color: '#022124',
                }}>
                  <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.75 }}>
                    <CheckCircle sx={{ fontSize: 13, color: '#6C8B6B' }} />
                    <Typography sx={{
                      fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase',
                      letterSpacing: '0.06em', color: '#6C8B6B',
                    }}>Good</Typography>
                  </Stack>
                  1. Python decorators<br />
                  2. ORM vs raw SQL<br />
                  3. API versioning<br />
                  4. DB indexing<br />
                  5. Redis caching
                </Box>
                <Box sx={{
                  borderRadius: '10px', p: '12px 14px', fontSize: '0.75rem', lineHeight: 1.6,
                  bgcolor: 'rgba(192,57,43,0.04)', border: '0.5px solid rgba(192,57,43,0.14)',
                  color: '#6F7470',
                }}>
                  <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.75 }}>
                    <CloseRounded sx={{ fontSize: 13, color: '#C0392B' }} />
                    <Typography sx={{
                      fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase',
                      letterSpacing: '0.06em', color: '#C0392B',
                    }}>Weak</Typography>
                  </Stack>
                  Backend dev who writes clean code, works with databases, understands APIs.
                </Box>
              </Box>
            </Box>
          </Box>

          {/* Section and question tips */}
          <Box sx={_INS_CARD}>
            <_CardHeader
              icon={LightbulbOutlined}
              title="Section and question tips"
              subtitle="Small details that change the shape of what the AI generates."
            />
            <Box sx={{ px: { xs: 2, sm: 2.5 }, pb: 2.5 }}>
              <Box sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: '6px 20px',
              }}>
                <_Tip icon={TimerOutlined}>
                  <Box component="span" sx={_INS.tipBold}>Duration = timer. </Box>
                  Auto-submits at zero.
                </_Tip>
                <_Tip icon={StarOutlineRounded}>
                  <Box component="span" sx={_INS.tipBold}>Marks vary. </Box>
                  MCQ=1, Short=5, Coding=15.
                </_Tip>
                <_Tip icon={Refresh}>
                  <Box component="span" sx={_INS.tipBold}>Regenerate freely. </Box>
                  No duplicates ever.
                </_Tip>
                <_Tip icon={Edit}>
                  <Box component="span" sx={_INS.tipBold}>Name drives type. </Box>
                  "Aptitude" → reasoning.
                </_Tip>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* ═════════ RIGHT COLUMN — sidebar ═════════ */}
        <Box sx={{
          display: 'flex', flexDirection: 'column', gap: 1.5, minWidth: 0,
          position: { md: 'sticky' },
          top: { md: 8 },
        }}>

          {/* Sample document card */}
          <Box sx={{
            ..._INS_CARD,
            bgcolor: 'rgba(127,158,126,0.06)',
            borderColor: 'rgba(127,158,126,0.28)',
          }}>
            <Box sx={{ px: { xs: 2, sm: 2.5 }, pt: { xs: 2, sm: 2.25 }, pb: 0.5 }}>
              <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 1 }}>
                <Box sx={{
                  width: 32, height: 32, borderRadius: '9px', flexShrink: 0,
                  bgcolor: '#6C8B6B',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <DownloadRounded sx={{ fontSize: 17, color: '#fff' }} />
                </Box>
                <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: '#022124' }}>
                  Sample topic document
                </Typography>
              </Stack>
              <Typography sx={{ fontSize: '0.78rem', color: '#4E5651', lineHeight: 1.55 }}>
                Backend Developer (Senior). Download this to see the exact format the AI expects.
              </Typography>
            </Box>
            <Box sx={{ px: { xs: 2, sm: 2.5 }, pb: 2.25, pt: 1.5 }}>
              <Button
                onClick={_downloadSampleDoc}
                variant="contained"
                disableElevation
                fullWidth
                startIcon={<DownloadRounded sx={{ fontSize: 15 }} />}
                sx={{
                  bgcolor: '#6C8B6B', color: '#fff', textTransform: 'none',
                  fontWeight: 700, fontSize: '0.82rem', borderRadius: '9px',
                  py: 1,
                  '&:hover': { bgcolor: '#5A7A59' },
                }}
              >
                Download sample
              </Button>
            </Box>
          </Box>

          {/* 10 question types */}
          <Box sx={_INS_CARD}>
            <_CardHeader
              icon={ViewModuleOutlined}
              title="10 question types"
              subtitle="The AI can pick from any of these."
            />
            <Box sx={{ px: { xs: 2, sm: 2.5 }, pb: 2.25 }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.65 }}>
                {_QTYPES_DISPLAY.map((q) => (
                  <Box key={q.label} sx={_INS.pill}>
                    <q.icon sx={{ fontSize: 13, color: '#7F9E7E' }} /> {q.label}
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>

          {/* Sticky primary CTA */}
          <Box sx={{
            ..._INS_CARD,
            bgcolor: '#F6F8F3',
            borderColor: '#E7EAE3',
            p: { xs: 2, sm: 2.25 },
          }}>
            <Typography sx={{
              fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em',
              textTransform: 'uppercase', color: '#6F7470', mb: 0.75,
            }}>
              Ready?
            </Typography>
            <Typography sx={{ fontSize: '0.8rem', color: '#4E5651', mb: 1.5, lineHeight: 1.5 }}>
              You can revisit these instructions anytime from the builder.
            </Typography>
            <Button
              onClick={onStart}
              variant="contained"
              disableElevation
              fullWidth
              endIcon={<ArrowForward sx={{ fontSize: 15 }} />}
              sx={{
                bgcolor: '#022124', color: '#fff', textTransform: 'none',
                fontWeight: 700, fontSize: '0.88rem', borderRadius: '11px',
                py: 1.15,
                '&:hover': { bgcolor: '#0a3a3f' },
              }}
            >
              Start building
            </Button>
          </Box>
        </Box>
      </Box>

    </Box>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN — shell: chrome (top bar + stepper), repository dialogs, page routing.
// ─────────────────────────────────────────────────────────────────────────────
export default function AIAssessmentBuilder({
  embedded = false,
  open = true,
  job = null,
  companyId: companyIdProp = null,
  onClose = null,
  onComplete = null,
  paperId: paperIdProp = null,
  origin = null,
} = {}) {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const companyId = useMemo(
    () =>
      companyIdProp ??
      JSON.parse(localStorage.getItem("ievalx_user") || "{}")?.company_id ??
      null,
    [companyIdProp],
  );


  const jobId = embedded ? (job?.id ?? null) : params.get("jobId") || null;
  const jobTitle = embedded ? (job?.title ?? "") : params.get("jobTitle") || "";

  const [showInstructions, setShowInstructions] = useState(true);

  const closeBuilder = () => {
    if (onClose) onClose();
    else navigate(-1);
  };

  // hooks (config = Step-0 form; gen = wizard/generation; repo = repository)
  const config = useAssessmentConfig({ jobTitle });
  const gen = useAssessmentGeneration(
    { companyId, jobId, jobTitle, embedded, onComplete },
    config,
  );
  const repo = usePaperRepository({ companyId, jobId, jobTitle }, config, gen);

  // 🔧 Auto-load paper when paperId is provided (from Question Bank "Open Paper" on an AI-generated paper)
  const paperId = embedded ? (paperIdProp ?? null) : (params.get("paperId") || paperIdProp || null);
  const autoLoadedRef = useRef(false);
  useEffect(() => {
    if (!paperId || autoLoadedRef.current) return;
    autoLoadedRef.current = true;
    setShowInstructions(false);         
    repo.onLoadPaper(paperId);          
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paperId]);


  const { name } = config;
  const { step, configId, version, busy } = gen;
  const {
    savePaperOpen,
    setSavePaperOpen,
    savePaperName,
    setSavePaperName,
    savePaperDesc,
    setSavePaperDesc,
    savingPaper,
    loadRepoOpen,
    setLoadRepoOpen,
    repoPapers,
    repoLoading,
    repoSearch,
    setRepoSearch,

   renameOpen,
    setRenameOpen,
    renameName,
    setRenameName,
    renameDesc,
    setRenameDesc,
    renamingPaper,
    // 🔧 Delete-confirm dialog state + handlers (replaces window.confirm)
    deleteTarget,
    deletingPaper,
    closeDeleteConfirm,
    confirmDeleteRepoPaper,
    previewPaperId,
    previewSnapshot,
    previewLoading,
    regenFromPreview,
    onSavePaper,
    confirmSavePaper,
    loadRepoList,
    onDeleteRepoPaper,
    onPreviewPaper,
    onUsePreviewedPaper,
    onRegenerateFromPreviewedPaper,
    onOpenRenamePaper,
    onSaveRenamePaper,
  } = repo;

  // 🔧 QB mode: after a successful "Save paper" from the Review page, return to QB.
  // Success = savingPaper transitioned true→false AND the save dialog is now closed.
  const aiReturnAfterSaveRef  = useRef(false);
  const aiPrevSavingPaperRef  = useRef(false);
  useEffect(() => {
    if (
      aiReturnAfterSaveRef.current &&
      aiPrevSavingPaperRef.current &&
      !savingPaper &&
      !savePaperOpen
    ) {
      aiReturnAfterSaveRef.current = false;
      navigate('/employer/question-bank');
    }
    aiPrevSavingPaperRef.current = savingPaper;
  }, [savingPaper, savePaperOpen, navigate]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <Box
      sx={{
        height: "100vh",
        bgcolor: T.pageBg,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* TOP BAR (title left · stepper center · actions right) */}
      <Box
        sx={{
          minHeight: 64,
          px: { xs: 2, sm: 3 },
          bgcolor: T.surface,
          borderBottom: `1px solid ${T.border}`,
          display: "flex",
          alignItems: "center",
          gap: 2,
          flexShrink: 0,
          zIndex: 100,
          boxShadow: "0 1px 0 #E2E8F0",
        }}
      >
        {/* left: back + title */}
        <Stack
          direction="row"
          alignItems="center"
          spacing={2}
          sx={{ minWidth: 0, flex: "0 0 auto" }}
        >
          <IconButton
            size="small"
            onClick={closeBuilder}
            sx={{
              color: T.textSecond,
              borderRadius: "8px",
              p: "6px",
              "&:hover": { bgcolor: T.pageBg, color: T.textPrimary },
            }}
          >
            <ArrowBack sx={{ fontSize: 18 }} />
          </IconButton>
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: "8px",
              bgcolor: T.navy,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AutoAwesome sx={{ fontSize: 17, color: "#fff" }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                fontSize: "0.88rem",
                fontWeight: 700,
                color: T.textPrimary,
                lineHeight: 1.25,
              }}
            >
              AI Assessment Builder
            </Typography>
            <Typography
              sx={{
                fontSize: "0.67rem",
                color: T.textMuted,
                lineHeight: 1.3,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: 260,
              }}
            >
              {name || "Untitled assessment"}
              {configId ? ` · ID #${configId}` : ""}
            </Typography>
          </Box>
        </Stack>

        {/* center: pill stepper */}
        <Box
          sx={{
            flex: 1,
            display: "flex",
            justifyContent: "center",
            minWidth: 0,
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            spacing={1.25}
            sx={{ flexWrap: "nowrap" }}
          >
            {/* 🔧 QB mode: hide "Approve & assign" — user saves and returns instead */}
            {(origin === 'question-bank' ? AI_STEPS.slice(0, 2) : AI_STEPS).map((label, i, arr) => {
              const isCompleted = i < step;
              const isActive = i === step;
              const isPending = i > step;

              // pill container styling
              const pillSx = {
                display: "inline-flex",
                alignItems: "center",
                gap: 0.9,
                px: isActive ? 1.4 : 0,
                py: isActive ? 0.55 : 0,
                borderRadius: "999px",
                bgcolor: isActive ? T.navyLight : "transparent",
                transition: "all 0.2s ease",
              };

              // circle styling per state
              const circleBg = isActive
                ? T.navy
                : isCompleted
                  ? T.navy
                  : "#FFFFFF";
              const circleBdr = isActive
                ? T.navy
                : isCompleted
                  ? T.navy
                  : "#D1DCE8";
              const circleClr =
                isActive || isCompleted ? "#FFFFFF" : T.textMuted;

              const labelClr = isActive
                ? T.navy
                : isCompleted
                  ? T.textPrimary
                  : T.textMuted;

              return (
                <React.Fragment key={label}>
                  <Box sx={pillSx}>
                    <Box
                      sx={{
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        bgcolor: circleBg,
                        border: `1.5px solid ${circleBdr}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {isCompleted ? (
                        <CheckCircle
                          sx={{
                            fontSize: 22,
                            color: T.navy,
                            bgcolor: "#fff",
                            borderRadius: "50%",
                          }}
                        />
                      ) : (
                        <Typography
                          sx={{
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            color: circleClr,
                            lineHeight: 1,
                          }}
                        >
                          {i + 1}
                        </Typography>
                      )}
                    </Box>
                    <Typography
                      sx={{
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        color: labelClr,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {label}
                    </Typography>
                  </Box>
                  {i < arr.length - 1 && (
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        color: T.textMuted,
                        opacity: 0.55,
                      }}
                    >
                      <ExpandMore
                        sx={{ fontSize: 18, transform: "rotate(-90deg)" }}
                      />
                    </Box>
                  )}
                </React.Fragment>
              );
            })}
          </Stack>
        </Box>

        <Stack
          direction="row"
          alignItems="center"
          spacing={1.5}
          sx={{ flex: "0 0 auto" }}
        >
          {version && (
            <Chip
              label={`version ${version.version_no}`}
              size="small"
              sx={{
                height: 22,
                fontSize: "0.67rem",
                fontWeight: 700,
                bgcolor: "#DBEAFE",
                color: "#1D4ED8",
                borderRadius: "6px",
              }}
            />
          )}
          {step === 1 && version && (
            <Button
              size="small"
              startIcon={
                savingPaper ? (
                  <CircularProgress size={13} sx={{ color: "inherit" }} />
                ) : (
                  <Save sx={{ fontSize: 14 }} />
                )
              }
              onClick={() => {
                const base = (name || '').trim() || 'AI Paper';
                const ts = new Date().toLocaleString('en-IN', {
                  day: '2-digit', month: 'short', hour: '2-digit',
                  minute: '2-digit', hour12: false,
                });
                setSavePaperName(`${base} — ${ts}`);
                setSavePaperDesc('');
                setSavePaperOpen(true);
              }}
              disabled={busy || savingPaper}
              sx={ghostBtn}
            >
              {savingPaper ? "Saving…" : "Save paper"}
            </Button>
          )}
        </Stack>
      </Box>

      {/* BODY — step 0 → ConfigurePage; steps 1 & 2 → ReviewApprovePage */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          px: { xs: 2, sm: 4 },
          py: 3,
        }}
      >
        <Box sx={{
          maxWidth: step === 0 ? 'none' : 1200,
          mx: "auto",
          px: { xs: 0.5, sm: 1 },
        }}>
          {step === 0 && showInstructions ? (
            <InstructionsPage onStart={() => setShowInstructions(false)} />
          ) : step === 0 ? (
            <ConfigurePage config={config} gen={gen} repo={repo} />
          ) : (
            <ReviewApprovePage
              gen={gen}
              embedded={embedded}
              onComplete={onComplete}
              closeBuilder={closeBuilder}
              navigate={navigate}
              origin={origin}
              onSaveAndReturn={() => {
                aiReturnAfterSaveRef.current = true;
                const base = (name || '').trim() || 'AI Paper';
                const ts = new Date().toLocaleString('en-IN', {
                  day: '2-digit', month: 'short', hour: '2-digit',
                  minute: '2-digit', hour12: false,
                });
                setSavePaperName(`${base} — ${ts}`);
                setSavePaperDesc('');
                setSavePaperOpen(true);
              }}
            />
          )}
        </Box>
      </Box>

      {/* ── Save Paper dialog ────────────────────────────────────────────── */}
      <Dialog
        open={savePaperOpen}
        onClose={() => !savingPaper && setSavePaperOpen(false)}
        fullWidth
        maxWidth="sm"
        sx={{ zIndex: 100000 }}
        PaperProps={{
          sx: { borderRadius: "14px", border: `1px solid ${T.border}` },
        }}
        slotProps={{
          paper: {
            sx: { borderRadius: "14px", border: `1px solid ${T.border}` },
          },
        }}
      >
        <DialogTitle
          sx={{ fontSize: "1rem", fontWeight: 700, color: T.textPrimary }}
        >
          Save to AI Paper Repository
        </DialogTitle>
        <DialogContent>
          {savingPaper ? (
            <Stack alignItems="center" spacing={1.5} sx={{ py: 5 }}>
              <CircularProgress size={36} sx={{ color: T.navy }} />
              <Typography
                sx={{ fontSize: "0.95rem", fontWeight: 700, color: T.navy }}
              >
                Saving to AI Paper Repository…
              </Typography>
              <Typography
                sx={{
                  fontSize: "0.76rem",
                  color: T.textMuted,
                  textAlign: "center",
                  maxWidth: 340,
                }}
              >
                Writing the paper snapshot to MongoDB and the metadata row to
                MySQL. Do not close this dialog — it will close by itself when
                the save completes.
              </Typography>
            </Stack>
          ) : (
            <Stack spacing={2} sx={{ mt: 0.5 }}>
              <TextField
                label="Paper name"
                value={savePaperName}
                onChange={(e) => setSavePaperName(e.target.value)}
                fullWidth
                autoFocus
                size="small"
              />
              <TextField
                label="Description (optional)"
                value={savePaperDesc}
                onChange={(e) => setSavePaperDesc(e.target.value)}
                fullWidth
                multiline
                minRows={2}
                size="small"
              />
              <Typography
                sx={{
                  fontSize: "0.75rem",
                  color: T.textMuted,
                  lineHeight: 1.55,
                }}
              >
                The current generated paper —{" "}
                {version?.paper?.sections?.reduce(
                  (a, s) => a + (s.questions?.length || 0),
                  0,
                ) || 0}{" "}
                questions across {version?.paper?.sections?.length || 0}{" "}
                section(s) — will be snapshotted and made available for reuse
                from this repository.
              </Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setSavePaperOpen(false)}
            disabled={savingPaper}
            sx={ghostBtn}
          >
            Cancel
          </Button>
          <Button
            onClick={confirmSavePaper}
            disabled={savingPaper}
            sx={navyBtn}
            startIcon={
              savingPaper ? (
                <CircularProgress size={14} sx={{ color: "#fff" }} />
              ) : (
                <Save sx={{ fontSize: 14 }} />
              )
            }
          >
            Save paper
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={renameOpen}
        onClose={() => !renamingPaper && setRenameOpen(false)}
        fullWidth
        maxWidth="sm"
        sx={{ zIndex: 100010 }}
        slotProps={{
          paper: {
            sx: { borderRadius: "14px", border: `1px solid ${T.border}` },
          },
        }}
      >
        <DialogTitle


          sx={{ fontSize: "1rem", fontWeight: 700, color: T.textPrimary }}
        >
          Rename paper
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <TextField
              label="Paper name"
              value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
              fullWidth
              autoFocus
              size="small"
              disabled={renamingPaper}
            />
            <TextField
              label="Description (optional)"
              value={renameDesc}
              onChange={(e) => setRenameDesc(e.target.value)}
              fullWidth
              multiline
              minRows={2}
              size="small"
              disabled={renamingPaper}
            />
            <Typography sx={{ fontSize: "0.76rem", color: T.textMuted }}>
              Only the name and description can be edited. To change the
              questions, load this paper into a config, regenerate, and save as a
              new paper.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setRenameOpen(false)}
            disabled={renamingPaper}
            sx={ghostBtn}
          >
            Cancel
          </Button>
<Button
            onClick={onSaveRenamePaper}
            disabled={renamingPaper}
            sx={navyBtn}
            startIcon={
              renamingPaper ? (
                <CircularProgress size={14} sx={{ color: "#fff" }} />
              ) : (
                <Save sx={{ fontSize: 14 }} />
              )
            }
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* 🔧 Delete-paper confirmation dialog (replaces window.confirm).
          zIndex 100010 to sit above the repo dialog (99999) — same tier as
          the rename dialog, since only one of {rename, delete} can be open
          at a time. */}
      <Dialog
        open={!!deleteTarget}
        onClose={closeDeleteConfirm}
        fullWidth
        maxWidth="xs"
        sx={{ zIndex: 100010 }}
        slotProps={{
          paper: {
            sx: { borderRadius: "14px", border: `1px solid ${T.border}` },
          },
        }}
      >
        <DialogTitle
          sx={{ fontSize: "1rem", fontWeight: 700, color: T.textPrimary }}
        >
          Delete paper?
        </DialogTitle>
        <DialogContent>
          <Typography
            sx={{
              fontSize: "0.88rem",
              color: T.textSecond,
              lineHeight: 1.6,
            }}
          >
            This will permanently remove{" "}
            <Box
              component="span"
              sx={{ fontWeight: 700, color: T.textPrimary }}
            >
              "{deleteTarget?.name}"
            </Box>{" "}
            from the AI Paper Repository. This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={closeDeleteConfirm}
            disabled={deletingPaper}
            sx={ghostBtn}
          >
            Cancel
          </Button>
          <Button
            onClick={confirmDeleteRepoPaper}
            disabled={deletingPaper}
            sx={{
              ...navyBtn,
              bgcolor: T.error || "#DC2626",
              "&:hover": { bgcolor: "#B91C1C" },
            }}
            startIcon={
              deletingPaper ? (
                <CircularProgress size={14} sx={{ color: "#fff" }} />
              ) : (
                <Delete sx={{ fontSize: 14 }} />
              )
            }
          >
            {deletingPaper ? "Deleting…" : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={loadRepoOpen}
        onClose={() => setLoadRepoOpen(false)}
        fullWidth
        maxWidth="lg"
        sx={{ zIndex: 99999 }}



        PaperProps={{
          sx: {
            borderRadius: "14px",
            border: `4px solid #154b90`,
            height: "85vh",
            maxHeight: 900,
            minHeight: 500,
            display: "flex",
            flexDirection: "column",
            bgcolor: "#fff",
            boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
          },
        }}
        slotProps={{
          paper: {
            sx: {
              borderRadius: "14px",
              border: `4px solid #d7dfe8`,
              height: "85vh",
              maxHeight: 900,
              minHeight: 500,
              display: "flex",
              flexDirection: "column",
              bgcolor: "#fff",
              boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            fontSize: "1rem",
            fontWeight: 700,
            color: T.textPrimary,
            borderBottom: `1px solid ${T.border}`,
            pb: 1.5,
            flex: "0 0 auto",
          }}
        >
          AI Paper Repository
          <Typography
            component="span"
            sx={{
              ml: 1,
              fontSize: "0.76rem",
              fontWeight: 500,
              color: T.textMuted,
            }}
          >
            Click a paper on the right to preview. Nothing is saved until you
            choose an action below.
          </Typography>
        </DialogTitle>

        <DialogContent
          sx={{ p: 0, flex: "1 1 auto", minHeight: 400, overflow: "hidden" }}
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1.6fr 1fr" },
              height: "100%",
              minHeight: 400,
            }}
          >{/* ── LEFT: PREVIEW PANE ─────────────────────────────────── */}
            <Box
              sx={{
                borderRight: { md: `1px solid ${T.border}` },
                overflowY: "auto",
                p: 3,
                bgcolor: '#F9FAF7',
                display: "flex",
                flexDirection: "column",
                minHeight: 0,
              }}
            >{!previewPaperId && (
                <Stack
                  alignItems="center"
                  justifyContent="center"
                  spacing={1.25}
                  sx={{ flex: 1, minHeight: 520, textAlign: "center" }}
                >
                  <DescriptionOutlined
                    sx={{ fontSize: 42, color: T.textMuted }}
                  />
                  <Typography
                    sx={{
                      fontSize: "0.95rem",
                      fontWeight: 700,
                      color: T.textSecond,
                    }}
                  >
                    Select a paper to preview
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "0.78rem",
                      color: T.textMuted,
                      maxWidth: 340,
                      mx: "auto",
                      textAlign: "center",
                    }}
                  >
                    Click a paper card on the right side to see its questions,
                    schema, and settings here.
                  </Typography>
                </Stack>
              )}

              {previewPaperId && previewLoading && (
                <Stack alignItems="center" spacing={1.25} sx={{ py: 8 }}>
                  <CircularProgress size={32} sx={{ color: T.navy }} />
                  <Typography
                    sx={{ fontSize: "0.9rem", fontWeight: 700, color: T.navy }}
                  >
                    Loading paper preview…
                  </Typography>
                </Stack>
              )}

              {previewPaperId &&
                !previewLoading &&
                previewSnapshot &&
                renderRepoPreview(previewSnapshot)}
            </Box>

            {/* ── RIGHT: PAPER LIST PANE ─────────────────────────────── */}
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                minHeight: 0,
                bgcolor: "#fff",
              }}
            >
              <Box sx={{ p: 2, borderBottom: `1px solid ${T.border}` }}>
                <TextField
                  value={repoSearch}
                  onChange={(e) => setRepoSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") loadRepoList();
                  }}
                  placeholder="Search by name or description…"
                  size="small"
                  fullWidth
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search sx={{ fontSize: 18, color: T.textMuted }} />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
                <Typography
                  sx={{ fontSize: "0.7rem", color: T.textMuted, mt: 0.5 }}
                >
                  {repoLoading
                    ? "Fetching…"
                    : `${repoPapers.length} saved paper${repoPapers.length === 1 ? "" : "s"}`}
                </Typography>
              </Box>

              <Box sx={{ flex: 1, overflowY: "auto", p: 1.5 }}>
                {repoLoading && (
                  <Stack alignItems="center" spacing={1} sx={{ py: 4 }}>
                    <CircularProgress size={24} sx={{ color: T.navy }} />
                    <Typography sx={{ fontSize: "0.78rem", color: T.textMuted }}>
                      Loading…
                    </Typography>
                  </Stack>
                )}

                {!repoLoading && repoPapers.length === 0 && (
                  <Box sx={{ textAlign: "center", py: 4, px: 2 }}>
                    <Typography
                      sx={{
                        fontSize: "0.82rem",
                        color: T.textMuted,
                        lineHeight: 1.55,
                      }}
                    >
                      No saved papers yet. Generate a paper and click "Save
                      paper" on the review step to add one here.
                    </Typography>
                  </Box>
                )}

                <Stack spacing={1}>
                  {!repoLoading &&
                    repoPapers.map((p) => {
                      const isSelected = previewPaperId === p.id;
                      return (
                        <Card
                          key={p.id}
                          sx={{
                            ...sectionCard,
                            cursor: "pointer",
                            borderColor: isSelected ? T.navy : T.border,
                            bgcolor: isSelected ? T.navyLight : "#fff",
                            boxShadow: isSelected
                              ? `0 0 0 2px ${T.navy}22`
                              : "none",
                            "&:hover": isSelected
                              ? {}
                              : { borderColor: T.navy, bgcolor: T.navyLight },
                            transition: "border-color 0.12s, background 0.12s",
                          }}
                          onClick={() => onPreviewPaper(p.id)}
                        >
                          <CardContent
                            sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}
                          >
                            <Stack
                              direction="row"
                              alignItems="flex-start"
                              spacing={0.75}
                            >
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography
                                  sx={{
                                    fontSize: "0.86rem",
                                    fontWeight: 700,
                                    color: T.textPrimary,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    display: "-webkit-box",
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: "vertical",
                                    lineHeight: 1.3,
                                  }}
                                >
                                  {p.paper_name}
                                </Typography>
                                {p.description && (
                                  <Typography
                                    sx={{
                                      fontSize: "0.72rem",
                                      color: T.textMuted,
                                      mt: 0.4,
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      display: "-webkit-box",
                                      WebkitLineClamp: 1,
                                      WebkitBoxOrient: "vertical",
                                    }}
                                  >
                                    {p.description}
                                  </Typography>
                                )}
                                <Stack
                                  direction="row"
                                  spacing={0.5}
                                  sx={{
                                    mt: 0.75,
                                    flexWrap: "wrap",
                                    gap: 0.4,
                                  }}
                                >
                                  <Chip
                                    label={`${p.total_questions} Q`}
                                    size="small"
                                    sx={{
                                      height: 18,
                                      fontSize: "0.64rem",
                                      fontWeight: 600,
                                      bgcolor: T.warnBg,
                                      color: T.warn,
                                      border: `1px solid ${T.warnBdr || T.warn}`,
                                    }}
                                  />
                                  <Chip
                                    label={`${p.total_marks} pts`}
                                    size="small"
                                    sx={{
                                      height: 18,
                                      fontSize: "0.64rem",
                                      fontWeight: 600,
                                      bgcolor: T.navyLight,
                                      color: T.navy,
                                    }}
                                  />
                                  {p.experience_level && (
                                    <Chip
                                      label={p.experience_level}
                                      size="small"
                                      sx={{
                                        height: 18,
                                        fontSize: "0.64rem",
                                        bgcolor: "#EEF2F7",
                                        color: T.textSecond,
                                      }}
                                    />
                                  )}
                                  {p.created_at && (
                                    <Chip
                                      label={String(p.created_at).slice(0, 10)}
                                      size="small"
                                      sx={{
                                        height: 18,
                                        fontSize: "0.64rem",
                                        bgcolor: "transparent",
                                        color: T.textMuted,
                                        border: `1px solid ${T.border}`,
                                      }}
                                    />
                                  )}
                                </Stack>
                              </Box>
                              <Stack direction="row" spacing={0}>
                                <Tooltip title="Rename">
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onOpenRenamePaper(p);
                                    }}
                                    sx={{
                                      p: 0.5,
                                      color: T.textMuted,
                                      "&:hover": {
                                        color: T.navy,
                                        bgcolor: T.navyLight,
                                      },
                                    }}
                                  >
                                    <Edit sx={{ fontSize: 14 }} />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete">
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDeleteRepoPaper(p.id, p.paper_name);
                                    }}
                                    sx={{
                                      p: 0.5,
                                      color: T.textMuted,
                                      "&:hover": { color: T.error },
                                    }}
                                  >
                                    <Delete sx={{ fontSize: 14 }} />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            </Stack>
                          </CardContent>
                        </Card>
                      );
                    })}
                </Stack>
              </Box>
            </Box>
          </Box>
        </DialogContent>

        {/* ── FOOTER ACTION BAR ────────────────────────────────────── */}
        <DialogActions
          sx={{
            px: 3,
            py: 1.75,
            borderTop: `1px solid ${T.border}`,
            bgcolor: "#fff",
          }}
        >
          <Button onClick={() => setLoadRepoOpen(false)} sx={ghostBtn}>
            Close
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button
            onClick={onRegenerateFromPreviewedPaper}
            disabled={!previewSnapshot || regenFromPreview || busy}
            sx={ghostBtn}
            startIcon={
              regenFromPreview ? (
                <CircularProgress size={13} sx={{ color: "inherit" }} />
              ) : (
                <Refresh sx={{ fontSize: 15 }} />
              )
            }
          >
            Regenerate with same config
          </Button>
          <Button
            onClick={onUsePreviewedPaper}
            disabled={!previewSnapshot || busy}
            sx={navyBtn}
            startIcon={
              busy ? (
                <CircularProgress size={13} sx={{ color: "#fff" }} />
              ) : (
                <CheckCircle sx={{ fontSize: 15 }} />
              )
            }
          >
            Use this paper
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );

  function renderRepoPreview(snap) {
    const cfg = snap?.config_snapshot || {};
    const paper = snap?.paper || {};
    const sections = Array.isArray(paper?.sections) ? paper.sections : [];
    const totalQ = sections.reduce((a, s) => a + (s.questions || []).length, 0);
    const totalM = sections.reduce(
      (a, s) =>
        a + (s.questions || []).reduce((b, q) => b + (Number(q.marks) || 0), 0),
      0,
    );

    const chip = (label, kind = "muted") => {
      const styles = {
        warn: {
          bgcolor: T.warnBg,
          color: T.warn,
          border: `1px solid ${T.warnBdr || T.warn}`,
        },
        navy: { bgcolor: T.navyLight, color: T.navy },
        muted: { bgcolor: "#EEF2F7", color: T.textSecond },
        ghost: {
          bgcolor: "transparent",
          color: T.textMuted,
          border: `1px solid ${T.border}`,
        },
      }[kind];
      return (
        <Chip
          label={label}
          size="small"
          sx={{ height: 20, fontSize: "0.66rem", fontWeight: 600, ...styles }}
        />
      );
    };

    return (
      <Stack spacing={2}>
        {/* header — paper name + high-level facts */}
        <Box>
          <Typography
            sx={{
              fontSize: "1rem",
              fontWeight: 800,
              color: T.textPrimary,
              lineHeight: 1.35,
            }}
          >
            {snap.paper_name || "Untitled paper"}
          </Typography>
          {snap.description && (
            <Typography
              sx={{ fontSize: "0.8rem", color: T.textSecond, mt: 0.5 }}
            >
              {snap.description}
            </Typography>
          )}
          <Stack
            direction="row"
            spacing={0.5}
            sx={{ mt: 1.25, flexWrap: "wrap", gap: 0.5 }}
          >
            {chip(`${totalQ} questions`, "warn")}
            {chip(`${totalM} marks total`, "navy")}
            {cfg.role && chip(cfg.role, "muted")}
            {cfg.experience_level && chip(cfg.experience_level, "muted")}
            {snap.model_used && chip(`model: ${snap.model_used}`, "ghost")}
            {snap.source_version != null &&
              chip(`v${snap.source_version}`, "ghost")}
          </Stack>
        </Box>

        {/* config summary — role, level, sections, ai instructions */}
        <Card sx={{ ...sectionCard, bgcolor: "#fff" }}>
          <CardContent sx={{ p: 2 }}>
            <Typography
              sx={{
                fontSize: "0.72rem",
                fontWeight: 700,
                color: T.textSecond,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                mb: 1,
              }}
            >
              Configuration snapshot
            </Typography>
            <Stack
              spacing={0.75}
              sx={{ fontSize: "0.82rem", color: T.textPrimary }}
            >
              {cfg.name && (
                <div>
                  <strong>Assessment:</strong> {cfg.name}
                </div>
              )}
              {cfg.role && (
                <div>
                  <strong>Role:</strong> {cfg.role}
                  {cfg.experience_level ? ` · ${cfg.experience_level}` : ""}
                </div>
              )}
              {cfg.passing_marks != null && (
                <div>
                  <strong>Passing marks:</strong> {cfg.passing_marks}%
                </div>
              )}
              {Array.isArray(cfg.sections) && cfg.sections.length > 0 && (
                <div>
                  <strong>Sections:</strong>{" "}
                  {cfg.sections
                    .map(
                      (s, i) =>
                        `${s.name}${s.duration_minutes ? ` (${s.duration_minutes}m)` : ""}`,
                    )
                    .join(" · ")}
                </div>
              )}
              {cfg.ai_instructions && (
                <div>
                  <strong>AI instructions:</strong>{" "}
                  <Typography
                    component="span"
                    sx={{
                      fontSize: "0.78rem",
                      color: T.textSecond,
                      fontStyle: "italic",
                    }}
                  >
                    {cfg.ai_instructions.length > 300
                      ? `${cfg.ai_instructions.slice(0, 300)}…`
                      : cfg.ai_instructions}
                  </Typography>
                </div>
              )}
            </Stack>
          </CardContent>
        </Card>

        {/* sections + questions */}
        {sections.length === 0 && (
          <Card sx={sectionCard}>
            <CardContent sx={{ p: 3, textAlign: "center" }}>
              <Typography sx={{ fontSize: "0.85rem", color: T.textMuted }}>
                This paper has no sections. It may have been saved in an
                incomplete state.
              </Typography>
            </CardContent>
          </Card>
        )}

        {sections.map((sec) => (
          <Card key={sec.id || sec.name} sx={sectionCard}>
            <CardContent sx={{ p: 2 }}>
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{ mb: 1 }}
              >
                <Typography
                  sx={{
                    fontSize: "0.95rem",
                    fontWeight: 700,
                    color: T.textPrimary,
                  }}
                >
                  {sec.name || "Untitled section"}
                </Typography>
                {chip(
                  `${(sec.questions || []).length} question${(sec.questions || []).length === 1 ? "" : "s"}`,
                  "warn",
                )}
                {sec.duration_minutes != null &&
                  chip(`${sec.duration_minutes} min`, "ghost")}
              </Stack>

              <Stack
                spacing={0}
                divider={<Divider sx={{ my: 0.75, borderColor: T.border }} />}
              >
                {(sec.questions || []).map((q, idx) => (
                  <Box key={q.id || idx} sx={{ py: 1.25 }}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={0.75}
                      sx={{ mb: 0.75 }}
                    >
                      {chip(
                        `${QTYPE_LABEL[q.question_type] || q.question_type} · ${q.marks} mark${q.marks > 1 ? "s" : ""}`,
                        "navy",
                      )}
                    </Stack>
                    <Box
                      sx={{
                        fontSize: "0.85rem",
                        color: T.textPrimary,
                        lineHeight: 1.55,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        "& code, & pre": {
                          fontFamily:
                            'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
                          fontSize: "0.82em",
                        },
                      }}
                      dangerouslySetInnerHTML={{
                        __html: formatStem(q.stem || ""),
                      }}
                    />
                    {/* MCQ / multi-select / true-false options */}
                    {Array.isArray(q.options) && q.options.length > 0 && (
                      <Stack spacing={0.4} sx={{ mt: 1, pl: 1.5 }}>
                        {q.options.map((opt, i) => {
                          const key = opt.key || String.fromCharCode(65 + i);
                          const isCorrect = Array.isArray(q.correct_answer)
                            ? q.correct_answer.includes(key)
                            : String(q.correct_answer).toLowerCase() ===
                              String(key).toLowerCase();
                          return (
                            <Box
                              key={i}
                              sx={{
                                fontSize: "0.8rem",
                                color: isCorrect ? T.success : T.textPrimary,
                                fontWeight: isCorrect ? 700 : 500,
                              }}
                            >
                              {isCorrect ? "✓ " : "  "}
                              <strong>{key}.</strong>{" "}
                              {typeof opt === "string"
                                ? opt
                                : opt.text || opt.label || ""}
                            </Box>
                          );
                        })}
                      </Stack>
                    )}
                    {/* Fill blank / short answer expected answer */}
                    {q.expected_answer && (
                      <Typography
                        sx={{
                          mt: 0.75,
                          fontSize: "0.76rem",
                          color: T.textSecond,
                          fontStyle: "italic",
                        }}
                      >
                        Expected: {q.expected_answer}
                      </Typography>
                    )}
                    {/* Coding: sample test count */}
                    {q.question_type === "coding" &&
                      Array.isArray(q.test_cases) && (
                        <Typography
                          sx={{
                            mt: 0.5,
                            fontSize: "0.72rem",
                            color: T.textMuted,
                          }}
                        >
                          {q.test_cases.length} test case
                          {q.test_cases.length === 1 ? "" : "s"} (
                          {q.test_cases.filter((t) => t.hidden).length} hidden)
                        </Typography>
                      )}
                    {/* SQL: expected resultset preview */}
                    {q.question_type === "sql" && q.sql_expected_resultset && (
                      <Box
                        sx={{
                          mt: 0.75,
                          fontSize: "0.74rem",
                          color: T.textSecond,
                          fontFamily:
                            'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
                          bgcolor: "#F1F5F9",
                          p: 1,
                          borderRadius: "6px",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          maxHeight: 90,
                          overflow: "auto",
                        }}
                      >
                        {q.sql_expected_resultset}
                      </Box>
                    )}
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>
    );
  }
}