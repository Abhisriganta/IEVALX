import React, { useState } from 'react';
import {
  Box, Typography, Button, Stack, TextField, IconButton, Menu,
  Tooltip, Select, MenuItem, FormControl, InputLabel, Chip, Alert,
  Card, CardContent, Switch, FormControlLabel, Avatar,
  CircularProgress, Collapse, Divider, Stepper, Step, StepLabel,
  Dialog, DialogTitle, DialogContent, DialogActions,
  InputAdornment,
} from '@mui/material';
import {
    Add, Close, Delete, ArrowBack, ArrowForward, ContentCopy, DragIndicator,
    ExpandMore, ExpandLess, CheckCircle, Settings, InfoOutlined,
    Publish, Link as LinkIcon, BookmarkAdd, BookmarkAdded, Warning, Save,
    Description, MenuBook, Send as SendIcon, AccessTime, BarChart, Refresh,
  } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';

import useAssessmentBuilder, {
  QUESTION_TYPES, SECTION_PRESETS, LANGUAGES, blankQuestion, SUBJECTIVE_TYPES,
} from '../../../hooks/employer/useAssessmentBuilder';
import assessmentService from '../../../services/api/employer/assessmentService';


import {
  T, fSx, labelSx, STEPS, CustomStepIcon,
  QuestionEditor, SectionDistributionStep, PaperRepositoryPanel,
  SaveAsPaperDialog, InstructionsDialog, MissingCorrectDialog,
} from './Extendedbuilder';

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE — split-pane layout
// ─────────────────────────────────────────────────────────────────────────────
// BUILD: 2026-07-27-wizard-assessmentid-v1
export default function AssessmentBuilder({ open, job, onClose, onComplete, companyId: companyIdProp, origin, paperId }) {
  const navigate  = useNavigate();
  const companyId = companyIdProp
    ?? JSON.parse(localStorage.getItem('ievalx_user') || '{}')?.company_id
    ?? null;
  // ── All hook destructuring — completely unchanged ──────────────────────────
  const {
    step, setStep, assessmentId,
    title, setTitle,
    description, setDescription,
    randomize, setRandomize,
    showResults, setShowResults,
    creating, settingsOpen, setSettingsOpen,
    handleCreateAssessment,
    sections, totalQuestions, totalPoints, totalSavedQ, unsavedCount, poolCounts,customCategories,
    updateSection, addSection, removeSection,
    updateQuestion, addQuestion, removeQuestion, duplicateQuestion,
    handleSaveQuestion, handleProceedToDistribution,setSectionQuestionCount,
    setSectionDist,setSectionDuration,handleSaveSectionConfig,handleValidateSection,
    handleSaveAndValidateAllSections,computeSectionPoolCounts,allSectionsReady,
    finalCount, setFinalCount,
    distribution, distTotal, setDist,
    configSaved, savingConfig, validating, valResult, publishing,
    handleSaveConfig, handleValidate, handlePublish,
    paperDialogOpen, setPaperDialogOpen,
    savingPaper, paperName, setPaperName, paperDesc, setPaperDesc,
    handleSaveAsPaper,
    papersOpen,
    papers,
    papersLoading,
    loadingPaperId,
    deletingPaperId,
    handleTogglePapers,
    handleLoadFromPaper,
    handleDeletePaper,
    fetchPapers,
    handleRemoveImportedSection,handleHideSection,
    sourcePapers,
    handleUpdateExistingPaper,
  } = useAssessmentBuilder({ open, onClose: () => navigate(-1), job, companyId, paperId });

  // ── UI-only split-pane navigation state ───────────────────────────────────
  const [selectedSec, setSelectedSec] = useState(0);
  const [selectedQ,   setSelectedQ]   = useState(0); 
  const [openPickerSec, setOpenPickerSec] = useState(null);
  const [paperSaveMode, setPaperSaveMode] = useState('new');
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [missingCorrectDialog, setMissingCorrectDialog] = useState({ open: false, type: 'mcq' });
  const [questionFilter, setQuestionFilter] = useState('all');
  const { enqueueSnackbar } = useSnackbar();

  // Auto-open instructions the first time the user enters Step 1
  React.useEffect(() => {
    if (step === 1 && !localStorage.getItem('ievalx_mtb_instructions_seen')) {
      setInstructionsOpen(true);
      localStorage.setItem('ievalx_mtb_instructions_seen', '1');
    }
  }, [step]);

  const openPaperDialog = () => {
    setPaperSaveMode(sourcePapers.length > 0 ? 'choose' : 'new');
    setPaperDialogOpen(true);
  };

  const returnAfterSaveRef  = React.useRef(false);
  const prevSavingPaperRef  = React.useRef(false);
  React.useEffect(() => {
    if (
      returnAfterSaveRef.current &&
      prevSavingPaperRef.current &&
      !savingPaper &&
      !paperDialogOpen
    ) {
      returnAfterSaveRef.current = false;
      navigate('/employer/question-bank');
    }
    prevSavingPaperRef.current = savingPaper;
  }, [savingPaper, paperDialogOpen, navigate]);

  if (!open) return null;

  // Safe derived values (guards against out-of-bounds after remove operations)
  const safeSec      = Math.min(selectedSec, Math.max(0, sections.length - 1));
  const curSection   = sections[safeSec];
  const safeQ        = selectedQ !== null
    ? Math.min(selectedQ, Math.max(0, (curSection?.questions.length || 0) - 1))
    : null;
  const curQuestion  = safeQ !== null ? curSection?.questions[safeQ] ?? null : null;

  // ── Wrappers that keep selection in sync ──────────────────────────────────
  const handleAddSectionAndSelect = (type) => {
    addSection(type);
    setSelectedSec(sections.length); // new section will be appended at sections.length
    setSelectedQ(0);
  };

  const handleAddQuestionAndSelect = (secIdx, type) => {
    addQuestion(secIdx, type);
    setSelectedSec(secIdx);
    setSelectedQ(sections[secIdx]?.questions.length ?? 0); // new question index
  };

  const handleRemoveQuestionAndSelect = (secIdx, qIdx) => {
    const curLen = sections[secIdx]?.questions.length ?? 0;
    removeQuestion(secIdx, qIdx);
    if (curLen <= 1) {
      setSelectedQ(null); // section now empty → show section settings
    } else {
      setSelectedQ(Math.min(qIdx, curLen - 2));
    }
  };

  const handleRemoveSectionAndSelect = (secIdx) => {
    removeSection(secIdx);
    const newIdx = Math.max(0, secIdx - 1);
    setSelectedSec(newIdx);
    setSelectedQ(0);
  };

  const handleDuplicateAndSelect = (secIdx, qIdx) => {
    duplicateQuestion(secIdx, qIdx);
    setSelectedSec(secIdx);
    setSelectedQ(qIdx + 1);
  };

  // ── Stepper step meta ──────────────────────────────────────────────────────
  const stepMeta = [
    { label: 'Step 1 of 3', title: 'Name your assessment', subtitle: 'Give your test a clear title.' },
    { label: 'Step 2 of 3', title: 'Build the question pool', subtitle: null },
    { label: 'Step 3 of 3', title: 'Set distribution and publish', subtitle: 'Set how many questions each candidate receives and the per-type breakdown. Save the config, validate, then publish.' },
  ][step] || {};

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ height: '100vh', bgcolor: T.pageBg, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ══ TOP BAR ══════════════════════════════════════════════════════════ */}
      <Box sx={{
        height: 56, px: { xs: 2, sm: 3 },
        bgcolor: T.surface, borderBottom: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', gap: 2,
        flexShrink: 0, zIndex: 100,
        boxShadow: '0 1px 0 #E7EAE3',
      }}>
        <IconButton size="small" onClick={() => onClose ? onClose() : navigate(-1)}
          sx={{ color: T.textSecond, borderRadius: '8px', p: '6px', '&:hover': { bgcolor: T.pageBg, color: T.textPrimary } }}>
          <ArrowBack sx={{ fontSize: 18 }} />
        </IconButton>

        <Box sx={{ width: 34, height: 34, borderRadius: '8px', bgcolor: T.navy, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Description sx={{ fontSize: 17, color: '#FFFFFF' }} />
        </Box>

        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: '0.88rem', fontWeight: 700, color: T.textPrimary, lineHeight: 1.25 }}>
            Manual Test Builder
          </Typography>
          <Typography sx={{ fontSize: '0.67rem', color: T.textMuted, lineHeight: 1.3 }}>
            {title || 'Untitled Assessment'}{assessmentId ? ` · ID #${assessmentId}` : ''}
          </Typography>
        </Box>

        <Box sx={{ flex: 1 }} />

        {/* Pool stats — shown from step 1 */}
        {step >= 1 && (
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Chip label={`${totalSavedQ} saved`} size="small"
              sx={{ height: 22, fontSize: '0.67rem', fontWeight: 700, bgcolor: '#E8F4F3', color: '#4B9E9A', borderRadius: '6px' }} />
            <Chip label={`${totalPoints} pts`} size="small"
              sx={{ height: 22, fontSize: '0.67rem', fontWeight: 700, bgcolor: T.warnBg, color: T.warn, borderRadius: '6px' }} />
            {unsavedCount > 0 && (
              <Chip label={`${unsavedCount} unsaved`} size="small"
                sx={{ height: 22, fontSize: '0.67rem', fontWeight: 700, bgcolor: T.errorBg, color: T.error, borderRadius: '6px' }} />
            )}
          </Stack>
        )}

        {/* Save as paper — step 1 only */}
        {step === 1 && assessmentId && totalSavedQ > 0 && (
          <Tooltip title="Save this question pool to your library so you can reuse it in other assessments.">
            <Button size="small" startIcon={<BookmarkAdd sx={{ fontSize: 14 }} />}
              onClick={openPaperDialog}
              sx={{ textTransform: 'none', fontSize: '0.73rem', borderRadius: '8px', border: `1px solid ${T.border}`, color: T.textSecond, '&:hover': { bgcolor: T.navyLight, borderColor: T.navy, color: T.navy } }}>
              Save as paper
            </Button>
          </Tooltip>
        )}
        {step === 1 && (
          <Tooltip title="How to build your test — quick guide">
            <Button
              size="small"
              onClick={() => setInstructionsOpen(true)}
              startIcon={<InfoOutlined sx={{ fontSize: 15 }} />}
              sx={{
                textTransform: 'none',
                fontSize: '0.73rem',
                borderRadius: '8px',
                border: `1px solid ${T.border}`,
                color: T.textSecond,
                bgcolor: T.surface,
                '&:hover': { bgcolor: T.navyLight, borderColor: T.navy, color: T.navy },
              }}
            >
              Instructions
            </Button>
          </Tooltip>
        )}
        {step === 1 && assessmentId && (
  <Tooltip title={papersOpen ? 'Close repository' : 'Browse saved papers'}>
    <Button
      size="small"
      onClick={handleTogglePapers}
      startIcon={<MenuBook sx={{ fontSize: 14 }} />}
      sx={{
        textTransform: 'none',
        fontSize: '0.73rem',
        borderRadius: '8px',
        border: `1px solid ${papersOpen ? T.navy : T.border}`,
        color: papersOpen ? T.navy : T.textSecond,
        bgcolor: papersOpen ? T.navyLight : T.surface,
        '&:hover': { bgcolor: T.navyLight, borderColor: T.navy, color: T.navy },
      }}
    >
      Papers {papers.length > 0 && `(${papers.length})`}
    </Button>
  </Tooltip>
)}

        {/* Settings gear — step 0 only */}
        {step === 0 && (
          <Tooltip title="Additional settings">
            <IconButton size="small" onClick={() => setSettingsOpen(!settingsOpen)}
              sx={{ borderRadius: '8px', border: `1px solid ${settingsOpen ? T.navy : T.border}`, color: settingsOpen ? T.navy : T.textSecond, bgcolor: settingsOpen ? T.navyLight : T.surface, '&:hover': { bgcolor: T.navyLight, borderColor: T.navy } }}>
              <Settings sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>

     {/* ══ STEPPER BAR (hidden on step 1 — moved into sidebar) ══════════════ */}
      {step !== 1 && (
      <Box sx={{ bgcolor: T.surface, borderBottom: `1px solid ${T.border}`, px: { xs: 2, sm: 3 }, py: 1.25, flexShrink: 0 }}>
        <Stepper activeStep={step} alternativeLabel sx={{ maxWidth: 480, mx: 'auto' }}>
          {/* 🔧 QB mode: hide "Distribution & publish" — user just saves and returns */}
          {(origin === 'question-bank' ? STEPS.slice(0, 2) : STEPS).map((label, i) => (
            <Step key={i} completed={step > i}>
              <StepLabel
                slots={{ stepIcon: CustomStepIcon }}
                sx={{
                  '& .MuiStepLabel-label': {
                    fontSize: '0.7rem',
                    fontWeight: step === i ? 700 : 400,
                    color: step === i ? T.navy : T.textMuted,
                    mt: 0.5,
                  },
                }}>
                {label}
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>
      )}

      {/* ══ MAIN CONTENT ═════════════════════════════════════════════════════ */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ─── STEP 0: Assessment details — centered card ────────────────── */}
        {step === 0 && (
          <Box sx={{ flex: 1, overflow: 'auto', p: { xs: 2, sm: 3 } }}>
            <Box sx={{ maxWidth: 720, mx: 'auto' }}>

              <Box sx={{ mb: 3 }}>
                <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: T.navy, textTransform: 'uppercase', letterSpacing: '0.1em', mb: 0.5 }}>
                  {stepMeta.label}
                </Typography>
                <Typography sx={{ fontSize: '1.45rem', fontWeight: 800, color: T.textPrimary, lineHeight: 1.25, mb: 0.5 }}>
                  {stepMeta.title}
                </Typography>
                {stepMeta.subtitle && (
                  <Typography sx={{ fontSize: '0.875rem', color: T.textSecond, lineHeight: 1.65 }}>
                    {stepMeta.subtitle}
                  </Typography>
                )}
              </Box>

              <Card elevation={0} sx={{ border: `1px solid ${T.border}`, borderTop: `3px solid ${T.navy}`, borderRadius: '12px', mb: 2 }}>
                {origin === 'question-bank' && (
                <Alert severity="info" icon={<BookmarkAdd sx={{ fontSize: 17 }} />}
                  sx={{ mb: 2, borderRadius: '10px', fontSize: '0.78rem', bgcolor: T.navyLight, color: T.textSecond, border: `1px solid ${T.border}`, '& .MuiAlert-icon': { color: T.navy } }}>
                  This paper isn't tied to a job or candidates. Build your question pool below,
                  then use <strong>Save as paper</strong> in the top bar — that's the finish line.
                  Steps 2 and 3 are only needed if you're scheduling this as a live test.
                </Alert>
              )}
                <CardContent sx={{ p: { xs: '20px', sm: '28px' }, '&:last-child': { pb: { xs: '20px', sm: '28px' } } }}>
                  <Stack spacing={2.5}>

                    <Box>
                      <Typography sx={{ ...labelSx, mb: 0.75 }}>
                        Assessment title{' '}
                        <Box component="span" sx={{ color: T.error, textTransform: 'none', fontSize: '0.75rem' }}>*</Box>
                      </Typography>
                      <TextField fullWidth size="small"
                        placeholder="e.g. Frontend Developer — Manual Assessment"
                        value={title} onChange={e => setTitle(e.target.value)}
                        sx={{ ...fSx, '& .MuiInputBase-input': { fontSize: '0.9rem', fontWeight: 600, py: '10px' } }}
                      />
                    </Box>


                        </Stack>
                </CardContent>
              </Card>

              {/* Additional settings collapse */}
              <Collapse in={settingsOpen}>
                <Card elevation={0} sx={{ border: `1px solid ${T.border}`, borderRadius: '12px', mb: 2 }}>
                  <CardContent sx={{ p: { xs: '20px', sm: '24px' }, '&:last-child': { pb: { xs: '20px', sm: '24px' } } }}>
                    <Typography sx={{ ...labelSx, mb: 1.75 }}>Additional settings</Typography>
                     <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ flexWrap: 'wrap' }} alignItems={{ sm: 'center' }}>
                      <FormControlLabel
                        control={<Switch size="small" checked={randomize} onChange={e => setRandomize(e.target.checked)}
                          sx={{ '& .MuiSwitch-thumb': { bgcolor: T.navy }, '& .Mui-checked + .MuiSwitch-track': { bgcolor: T.navy + '80' } }} />}
                        label={<Typography sx={{ fontSize: '0.8rem', color: T.textPrimary }}>Randomize questions</Typography>}
                      />
                      <FormControlLabel
                        control={<Switch size="small" checked={showResults} onChange={e => setShowResults(e.target.checked)} />}
                        label={<Typography sx={{ fontSize: '0.8rem', color: T.textPrimary }}>Show results to candidate</Typography>}
                      />
                    </Stack>
                  </CardContent>
                </Card>
              </Collapse>

              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="contained" onClick={handleCreateAssessment} disabled={creating}
                  endIcon={creating ? <CircularProgress size={15} color="inherit" /> : <ArrowForward sx={{ fontSize: 16 }} />}
                  sx={{ textTransform: 'none', borderRadius: '9px', fontSize: '0.88rem', px: 3.5, py: 1.1, bgcolor: T.navy, boxShadow: 'none', '&:hover': { bgcolor: T.navyHover, boxShadow: '0 2px 10px rgba(127,158,126,0.28)' }, '&.Mui-disabled': { bgcolor: '#E7EAE3', color: T.textMuted } }}>
                  {creating ? 'Creating…' : 'Create & add questions'}
                </Button>
              </Box>

            </Box>
          </Box>
        )}

        {/* ─── STEP 1: Split-pane — sidebar + editor ─────────────────────── */}
        {step === 1 && (
          <>
            {/* ── LEFT SIDEBAR ── */}
            <Box sx={{
              width: 300, flexShrink: 0,
              borderRight: `1px solid ${T.border}`,
              bgcolor: T.surface,
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
            }}>

              {/* Sidebar stepper (moved from top) */}
              <Box sx={{ px: 1.25, py: 1.5, borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
                <Stepper activeStep={step} alternativeLabel sx={{ width: '100%' }}>
  {/* 🔧 QB mode: hide "Distribution & publish" — user just saves and returns */}
  {(origin === 'question-bank' ? STEPS.slice(0, 2) : STEPS).map((label, i) => (
    <Step key={i} completed={step > i}>
      <StepLabel
        slots={{ stepIcon: CustomStepIcon }}
        sx={{
          '& .MuiStepLabel-label': {
            fontSize: '0.58rem',
            fontWeight: step === i ? 700 : 400,
            color: step === i ? T.navy : T.textMuted,
            mt: 0.4,
            lineHeight: 1.2,
          },
          '& .MuiStepConnector-line': { minWidth: 0 },
        }}>
        {label}
      </StepLabel>
    </Step>
  ))}
</Stepper>
              </Box>

              {/* Sidebar header */}
              <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
                <Typography sx={{ ...labelSx }}>Question pool</Typography>
                <Typography sx={{ fontSize: '0.68rem', color: T.textMuted, mt: 0.3 }}>
                  {sections.length} section{sections.length !== 1 ? 's' : ''} · {totalQuestions} question{totalQuestions !== 1 ? 's' : ''}
                </Typography>
              </Box>

              {/* Section + question list */}
              <Box sx={{ flex: 1, overflow: 'auto', py: 0.75 }}>
                {sections.map((sec, si) => {
                  const preset      = SECTION_PRESETS.find(s => s.value === sec.type) || SECTION_PRESETS[SECTION_PRESETS.length - 1];
                  const isSecSel    = safeSec === si && safeQ === null;
                  const isExpanded  = sec.expanded !== false;
                  const secPts      = sec.questions.reduce((s, q) => s + (q.points || 0), 0);

                  return (
                    <Box key={sec.id}>
                      {/* Section header row */}
                      <Box
                        onClick={() => { setSelectedSec(si); setSelectedQ(null); }}
                        sx={{
                          display: 'flex', alignItems: 'center', gap: 0.75,
                          px: 1.25, py: 0.875, mx: 0.75, borderRadius: '8px',
                          cursor: 'pointer',
                          bgcolor: isSecSel ? T.navyLight : preset.color + '12',
                          '&:hover': { bgcolor: isSecSel ? T.navyLight : preset.color + '22' },
                          transition: 'background-color 0.12s',
                        }}
                      >
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: preset.color, flexShrink: 0 }} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography sx={{ fontSize: '0.77rem', fontWeight: 600, color: isSecSel ? T.navy : T.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {sec.title || 'Untitled'}
                          </Typography>
                          {sec._importedFromPaper && (
                            <Typography sx={{ fontSize: '0.68rem', fontWeight: 500, color: T.textSecond, lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              from {sec._importedFromPaper}
                            </Typography>
                          )}
                        </Box>
                        <Typography sx={{ fontSize: '0.62rem', color: T.textMuted, flexShrink: 0 }}>
                          {sec.questions.length}Q
                        </Typography>
                        <Tooltip title={sec._importedFromPaper ? 'Remove this imported section' : 'Delete section'}>
                          <IconButton size="small"
                            onClick={e => {
                              e.stopPropagation();
                              handleHideSection(sec.id);
                              setSelectedSec(s => Math.max(0, s - (si <= s ? 1 : 0)));
                              setSelectedQ(0);
                            }}
                            sx={{ p: '2px', color: T.error, flexShrink: 0, '&:hover': { color: T.error, bgcolor: T.errorBg } }}>
                            <Delete sx={{ fontSize: 12 }} />
                          </IconButton>
                        </Tooltip>
                        <IconButton size="small"
                          onClick={e => { e.stopPropagation(); updateSection(si, { ...sec, expanded: !isExpanded }); }}
                          sx={{ p: '2px', color: T.textMuted, ml: 0.25, flexShrink: 0 }}>
                          {isExpanded ? <ExpandLess sx={{ fontSize: 13 }} /> : <ExpandMore sx={{ fontSize: 13 }} />}
                        </IconButton>
                      </Box>

                      {/* Question items */}
                      <Collapse in={isExpanded}>
                        <Box>
                          {sec.questions.map((q, qi) => {
                            const qCfg  = QUESTION_TYPES.find(t => t.value === q.type) || QUESTION_TYPES[0];
                            const isQSel = safeSec === si && safeQ === qi;
                            return (
                              <Box key={q.id}
                                onClick={() => { setSelectedSec(si); setSelectedQ(qi); }}
                                sx={{
                                  display: 'flex', alignItems: 'center', gap: 0.75,
                                  pl: 2.75, pr: 1.25, py: 0.6,
                                  mx: 0.75, borderRadius: '7px',
                                  cursor: 'pointer',
                                  bgcolor: isQSel ? `${T.navy}10` : 'transparent',
                                  borderLeft: isQSel ? `2px solid ${T.navy}` : '2px solid transparent',
                                  '&:hover': { bgcolor: `${T.navy}07` },
                                  transition: 'background-color 0.1s',
                                }}
                              >
                                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: qCfg.color, flexShrink: 0 }} />
                                <Typography sx={{ flex: 1, fontSize: '0.7rem', color: isQSel ? T.navy : T.textSecond, fontWeight: isQSel ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  Q{qi + 1} · {(q.text || '').trim()
                                    ? (q.text || '').trim()
                                    : <Box component="span" sx={{ fontStyle: 'italic', color: T.textMuted }}>(Untitled question)</Box>}
                                </Typography>
                                {q._saving && <CircularProgress size={9} sx={{ color: T.blue, flexShrink: 0 }} />}
                                {!q._dirty && q._savedId && !q._saving && <CheckCircle sx={{ fontSize: 11, color: T.success, flexShrink: 0 }} />}
                                {q._dirty && !q._saving && <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: T.error, flexShrink: 0 }} />}
                              </Box>
                            );
                          })}

                         <Box
                            onClick={e => { e.stopPropagation(); setOpenPickerSec(openPickerSec === si ? null : si); }}
                            sx={{
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.8,
                              mx: 0.75, my: 0.75, py: 1.4, px: 1.25,
                              borderRadius: '10px',
                              cursor: 'pointer',
                              border: `1.5px dashed ${openPickerSec === si ? T.navy : T.borderHover}`,
                              bgcolor: openPickerSec === si ? T.navyLight : 'transparent',
                              color: openPickerSec === si ? T.navy : T.textSecond,
                              fontWeight: 600,
                              '&:hover': {
                                bgcolor: T.navyLight,
                                borderColor: T.navy,
                                color: T.navy,
                              },
                              transition: 'all 0.12s',
                            }}
                          >
                            <Add sx={{ fontSize: 19, flexShrink: 0 }} />
                            <Typography sx={{ fontSize: '0.88rem', fontWeight: 700, letterSpacing: '0.01em' }}>
                              Add Question
                            </Typography>
                            {openPickerSec === si
                              ? <ExpandLess sx={{ fontSize: 18, flexShrink: 0, ml: 0.25 }} />
                              : <ExpandMore sx={{ fontSize: 18, flexShrink: 0, ml: 0.25 }} />}
                          </Box>

                          <Collapse in={openPickerSec === si}>
                            <Box sx={{
                              mx: 0.75, mb: 1, p: '12px 14px',
                              bgcolor: T.pageBg, borderRadius: '10px',
                              border: `1px solid ${T.border}`,
                            }}>
                              <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', mb: 1 }}>
                                Question type
                              </Typography>
                              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px' }}>
                                {QUESTION_TYPES.map(t => (
                                  <Box key={t.value}
                                    onClick={() => { handleAddQuestionAndSelect(si, t.value); setOpenPickerSec(null); }}
                                    sx={{
                                      display: 'flex', alignItems: 'center', gap: 0.75,
                                      px: 1.25, py: 0.85,
                                      cursor: 'pointer',
                                      bgcolor: t.color + '12',
                                      color: t.color,
                                      border: `1px solid ${t.color}30`,
                                      borderRadius: '8px',
                                      fontSize: '0.78rem',
                                      fontWeight: 600,
                                      transition: 'all 0.12s',
                                      '&:hover': { bgcolor: t.color + '25', borderColor: t.color + '60' },
                                    }}>
                                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: t.color, flexShrink: 0 }} />
                                    <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: t.color }}>
                                      {t.label}
                                    </Typography>
                                  </Box>
                                ))}
                              </Box>
                            </Box>
                          </Collapse>
                        </Box>
                      </Collapse>
                    </Box>
                  );
                })}
              </Box>

              {/* Add section footer */}
              <Box sx={{ borderTop: `1px solid ${T.border}`, p: 2, flexShrink: 0 }}>
                <Typography sx={{ ...labelSx, fontSize: '0.7rem', mb: 1.25 }}>+ Add Section</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {SECTION_PRESETS.map(s => (
                    <Box key={s.value}
                      onClick={() => handleAddSectionAndSelect(s.value)}
                      sx={{
                        display: 'flex', alignItems: 'center', gap: 0.75,
                        px: 1.25, py: 0.85,
                        cursor: 'pointer',
                        bgcolor: s.color + '12',
                        color: s.color,
                        border: `1px solid ${s.color}40`,
                        borderRadius: '8px',
                        transition: 'all 0.12s',
                        '&:hover': { bgcolor: s.color + '25', borderColor: s.color + '70' },
                      }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: s.color, flexShrink: 0 }} />
                      <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: s.color }}>
                        {s.label}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>

            {/* ── RIGHT PANEL ── */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', bgcolor: T.pageBg }}>

              {/* Scrollable editor area */}
              <Box sx={{ flex: 1, overflow: 'auto', p: { xs: 2, sm: 3 } }}>

                {/* ── Section settings view (no question selected) ── */}
                {safeQ === null && curSection && (
                  <Box>
                    <Box sx={{ mb: 2.5 }}>
                      <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: T.navy, textTransform: 'uppercase', letterSpacing: '0.1em', mb: 0.4 }}>
                        Section settings
                      </Typography>
                      <Typography sx={{ fontSize: '1.2rem', fontWeight: 700, color: T.textPrimary }}>
                        {curSection.title || 'Untitled Section'}
                      </Typography>
                    </Box>

                    {/* Section title + category fields */}
                    <Card elevation={0} sx={{ border: `1px solid ${T.border}`, borderRadius: '10px', mb: 2.5 }}>
                      <CardContent sx={{ p: '20px', '&:last-child': { pb: '20px' } }}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }} sx={{ mb: 0 }}>
                          <TextField size="small" label="Section title"
                            value={curSection.title}
                            onChange={e => updateSection(safeSec, {
                              ...curSection,
                              title: e.target.value,
                              _dirty: true,  
                            })}
                            onBlur={async () => {
                              if (curSection._savedId && curSection._dirty && curSection.title?.trim()) {
                                try {
                                  await assessmentService.updateSection(curSection._savedId, {
                                    name: curSection.title.trim(),
                                  });
                                  updateSection(safeSec, { ...curSection, _dirty: false });
                                } catch (err) {
                                  console.error('[Section rename] failed:', err);
                                }
                              }
                            }}
                            sx={{ width: { xs: '100%', sm: 360 }, flexShrink: 0, ...fSx }}
                          />
                          <FormControl size="small" sx={{ width: { xs: '100%', sm: 200 }, flexShrink: 0 }}>
                            <InputLabel sx={{ fontSize: '0.78rem' }}>Section</InputLabel>
                            <Select
                              value="__CUR__"
                              label="Section"
                             onChange={e => {
                                const val = e.target.value;

                                // 🔧 Jump to existing section by index
                                if (typeof val === 'string' && val.startsWith('__JUMP_')) {
                                  const idx = parseInt(val.replace('__JUMP_', '').replace(/__$/, ''), 10);
                                  if (!Number.isNaN(idx) && idx >= 0 && idx < sections.length) {
                                    setSelectedSec(idx);
                                    setSelectedQ(null);
                                  }
                                  return;
                                }

                                // ── "+ New custom section" sentinel — rename current to a fresh custom name ──
                                if (val === '__NEW_CUSTOM__') {
                                  const existing = new Set(
                                    sections.map(s => (s.title || '').trim().toLowerCase())
                                  );
                                  let candidate = 'Custom Section';
                                  let n = 2;
                                  while (existing.has(candidate.toLowerCase())) {
                                    candidate = `Custom Section ${n++}`;
                                  }
                                  updateSection(safeSec, {
                                    ...curSection,
                                    type:   'custom',
                                    title:  candidate,
                                    _dirty: true,
                                  });
                                  return;
                                }
                              }}
                              renderValue={() => curSection.title?.trim() || 'Untitled'}
                              MenuProps={{
                                disableScrollLock: true,
                                sx: { zIndex: 1500, '& .MuiPaper-root': { mt: '4px', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.12)' } },
                              }}
                              sx={{ fontSize: '0.78rem', borderRadius: '8px' }}
                            >
                              {/* Hidden anchor for current section — keeps Select value resolved without warnings */}
                              <MenuItem value="__CUR__" sx={{ display: 'none' }}>
                                {curSection.title?.trim() || 'Untitled'}
                              </MenuItem>

                              {/* Every other section in the pool — click to navigate to it */}
                              {(() => {
                                const seen = new Set();
                                const items = [];
                                sections.forEach((s, i) => {
                                  if (i === safeSec) return;
                                  const t = (s.title || '').trim();
                                  if (!t) return;
                                  const key = t.toLowerCase();
                                  if (seen.has(key)) return;
                                  seen.add(key);
                                  items.push(
                                    <MenuItem key={`jump-${i}`} value={`__JUMP_${i}__`} sx={{ fontSize: '0.78rem' }}>
                                      <Stack direction="row" alignItems="center" spacing={1} sx={{ width: '100%' }}>
                                        <span>{t}</span>
                                        <Box sx={{ flex: 1 }} />
                                        <ArrowForward sx={{ fontSize: 13, color: T.textMuted }} />
                                      </Stack>
                                    </MenuItem>
                                  );
                                });
                                return items;
                              })()}

                              <Divider sx={{ my: 0.5, borderColor: T.border }} />
                              <MenuItem
                                value="__NEW_CUSTOM__"
                                sx={{ fontSize: '0.78rem', color: T.navy, fontWeight: 600 }}
                              >
                                + New custom section
                              </MenuItem>
                            </Select>
                          </FormControl>
                        {sections.length > 1 && (
                            <Button size="small" startIcon={<Delete sx={{ fontSize: 14 }} />}
                              onClick={() => handleRemoveSectionAndSelect(safeSec)}
                              sx={{
                                 textTransform: 'none', fontSize: '0.74rem', color: T.error,
                                borderRadius: '7px', flexShrink: 0, whiteSpace: 'nowrap',
                                px: 1.25, py: 0.6, border: `1px solid ${T.errorBdr}`,
                                ml: { sm: 2 },
                                '&:hover': { bgcolor: T.errorBg, borderColor: T.error },
                              }}>
                              Remove section
                            </Button>
                          )}
                        </Stack>
                      </CardContent>
                    </Card>

                    {/* Full question-type palette */}
                    <Box sx={{ p: '14px 18px', bgcolor: T.surface, borderRadius: '10px', border: `1px dashed ${T.borderHover}`, mb: 2.5 }}>
                      <Typography sx={{ ...labelSx, mb: 1 }}>Add question to this section</Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {QUESTION_TYPES.map(t => (
                          <Button key={t.value} size="small" onClick={() => handleAddQuestionAndSelect(safeSec, t.value)}
                            sx={{
                              textTransform: 'none', fontSize: '0.7rem', borderRadius: '7px', px: 1.25, py: 0.4,
                              border: `1px solid ${t.color}30`, color: t.color, bgcolor: t.color + '08',
                              '&:hover': { bgcolor: t.color + '18', borderColor: t.color + '60' },
                            }}>
                            <Box component="span" sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: t.color, display: 'inline-block', mr: 0.75 }} />
                            {t.label}
                          </Button>
                        ))}
                      </Box>
                    </Box>

                    {/* Question list for this section */}
                    {curSection.questions.length === 0 ? (
                      <Box sx={{ textAlign: 'center', py: 6 }}>
                        <Description sx={{ fontSize: 36, color: T.textMuted, opacity: 0.35, mb: 1 }} />
                        <Typography sx={{ fontSize: '0.85rem', color: T.textMuted }}>
                          No questions yet — add one above.
                        </Typography>
                      </Box>
                    ) : (
                      <Box>
                        <Typography sx={{ ...labelSx, mb: 1 }}>Questions in this section</Typography>

                        {/* 🔧 Per-type filter chips — compute counts inline from current section */}
                        {(() => {
                          const counts = {};
                          curSection.questions.forEach(q => {
                            counts[q.type] = (counts[q.type] || 0) + 1;
                          });
                          const totalAll   = curSection.questions.length;
                          const activeTypes = QUESTION_TYPES.filter(t => counts[t.value]);
                          return (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '6px', mb: 1.5 }}>
                              {/* All chip */}
                              <Box
                                onClick={() => setQuestionFilter('all')}
                                sx={{
                                  display: 'inline-flex', alignItems: 'center', gap: 0.5,
                                  px: 1.25, py: 0.4, borderRadius: '7px', cursor: 'pointer',
                                  fontSize: '0.72rem', fontWeight: 600,
                                  bgcolor: questionFilter === 'all' ? T.navy : T.surface,
                                  color:   questionFilter === 'all' ? '#FFFFFF' : T.textSecond,
                                  border:  `1px solid ${questionFilter === 'all' ? T.navy : T.border}`,
                                  transition: 'all 0.12s',
                                  '&:hover': {
                                    borderColor: T.navy,
                                    color: questionFilter === 'all' ? '#FFFFFF' : T.navy,
                                  },
                                }}
                              >
                                All
                                <Box component="span" sx={{
                                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                  minWidth: 18, px: 0.6, height: 16, borderRadius: '8px',
                                  bgcolor: questionFilter === 'all' ? 'rgba(255,255,255,0.22)' : T.pageBg,
                                  color:   questionFilter === 'all' ? '#FFFFFF' : T.textMuted,
                                  fontSize: '0.62rem', fontWeight: 700,
                                }}>{totalAll}</Box>
                              </Box>

                              {/* Per-type chips — only types that actually exist in this section */}
                              {activeTypes.map(t => {
                                const active = questionFilter === t.value;
                                return (
                                  <Box key={t.value}
                                    onClick={() => setQuestionFilter(t.value)}
                                    sx={{
                                      display: 'inline-flex', alignItems: 'center', gap: 0.5,
                                      px: 1.25, py: 0.4, borderRadius: '7px', cursor: 'pointer',
                                      fontSize: '0.72rem', fontWeight: 600,
                                      bgcolor: active ? t.color : T.surface,
                                      color:   active ? '#FFFFFF' : t.color,
                                      border:  `1px solid ${active ? t.color : t.color + '40'}`,
                                      transition: 'all 0.12s',
                                      '&:hover': {
                                        borderColor: t.color,
                                        bgcolor: active ? t.color : t.color + '15',
                                      },
                                    }}
                                  >
                                    <Box component="span" sx={{
                                      width: 7, height: 7, borderRadius: '50%',
                                      bgcolor: active ? '#FFFFFF' : t.color,
                                    }} />
                                    {t.label}
                                    <Box component="span" sx={{
                                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                      minWidth: 18, px: 0.6, height: 16, borderRadius: '8px',
                                      bgcolor: active ? 'rgba(255,255,255,0.22)' : t.color + '15',
                                      color:   active ? '#FFFFFF' : t.color,
                                      fontSize: '0.62rem', fontWeight: 700,
                                    }}>{counts[t.value]}</Box>
                                  </Box>
                                );
                              })}
                            </Box>
                          );
                        })()}

                        <Stack spacing={0.75}>
                          {curSection.questions.map((q, qi) => {
                            if (questionFilter !== 'all' && q.type !== questionFilter) return null;
                            const qCfg = QUESTION_TYPES.find(t => t.value === q.type) || QUESTION_TYPES[0];
                            return (
                              <Box key={q.id}
                                onClick={() => setSelectedQ(qi)}
                                sx={{
                                  display: 'flex', alignItems: 'center', gap: 1.5,
                                  px: 2, py: 1.25, bgcolor: T.surface,
                                  border: `1px solid ${T.border}`, borderRadius: '8px',
                                  cursor: 'pointer',
                                  '&:hover': { borderColor: T.borderHover, boxShadow: '0 1px 6px rgba(127,158,126,0.10)' },
                                  transition: 'all 0.12s',
                                }}
                              >
                                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: qCfg.color, flexShrink: 0 }} />
                                <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: T.textSecond, flexShrink: 0 }}>
                                  Q{qi + 1}
                                </Typography>
                                <Typography sx={{ flex: 1, fontSize: '0.8rem', color: T.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {q.text || <Box component="span" sx={{ color: T.textMuted, fontStyle: 'italic' }}>Empty question…</Box>}
                                </Typography>
                                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
                                  <Chip label={qCfg.label} size="small" sx={{ height: 18, fontSize: '0.58rem', bgcolor: qCfg.color + '15', color: qCfg.color }} />
                                  <Chip label={`${q.points}pt`} size="small" sx={{ height: 18, fontSize: '0.58rem', bgcolor: T.warnBg, color: T.warn }} />
                                  {!q._dirty && q._savedId && <CheckCircle sx={{ fontSize: 14, color: T.success }} />}
                                  {q._dirty && !q._saving && <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: T.error }} />}
                                </Stack>
                              </Box>
                            );
                          })}
                        </Stack>
                      </Box>
                    )}
                  </Box>
                )}

                {/* ── Question editor view ── */}
                {safeQ !== null && curQuestion && (
                  <Box>
                    {/* Breadcrumb navigation */}
                    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 2 }}>
                      <Typography
                        onClick={() => setSelectedQ(null)}
                        sx={{ fontSize: '0.75rem', color: T.textMuted, cursor: 'pointer', '&:hover': { color: T.navy, textDecoration: 'underline' } }}
                      >
                        {curSection?.title || 'Section'}
                      </Typography>
                      <Typography sx={{ fontSize: '0.75rem', color: T.textMuted }}>›</Typography>
                      <Typography sx={{ fontSize: '0.75rem', color: T.textSecond, fontWeight: 600 }}>
                        Question {safeQ + 1}
                      </Typography>
                    </Stack>

                    {/* QuestionEditor — completely unchanged component */}
                    <QuestionEditor
                      question={curQuestion}
                      index={safeQ}
                  onChange={updatedQ => updateQuestion(safeSec, safeQ, updatedQ)}
                      onRemove={() => handleRemoveQuestionAndSelect(safeSec, safeQ)}
                      onDuplicate={() => handleDuplicateAndSelect(safeSec, safeQ)}
                      onSave={() => {
                        // Alert #1 — block save and show MUI Dialog if no correct option chosen
                        const q = curQuestion;
                        if (q && ['mcq', 'multi_select', 'true_false'].includes(q.type)) {
                          const hasCorrect = q.options?.some(o => o.isCorrect);
                          if (!hasCorrect) {
                            setMissingCorrectDialog({ open: true, type: q.type });
                            return;
                          }
                        }
                        handleSaveQuestion(safeSec, safeQ);
                      }}
                    />

                    {/* Prev / Next question navigation */}
                    <Stack direction="row" alignItems="center" sx={{ mt: 2 }}>
                      <Button size="small"
                        disabled={safeQ === 0 && safeSec === 0}
                        onClick={() => {
                          if (safeQ > 0) {
                            setSelectedQ(safeQ - 1);
                          } else if (safeSec > 0) {
                            const prev = safeSec - 1;
                            setSelectedSec(prev);
                            setSelectedQ(Math.max(0, (sections[prev]?.questions.length ?? 1) - 1));
                          }
                        }}
                        startIcon={<ArrowBack sx={{ fontSize: 13 }} />}
                        sx={{ textTransform: 'none', fontSize: '0.75rem', color: T.textSecond, borderRadius: '7px', '&:hover': { bgcolor: T.pageBg } }}>
                        Prev
                      </Button>
                      <Box sx={{ flex: 1 }} />
                      <Button size="small"
                        disabled={safeQ >= (curSection?.questions.length || 0) - 1 && safeSec >= sections.length - 1}
                        onClick={() => {
                          const maxQ = (curSection?.questions.length || 0) - 1;
                          if (safeQ < maxQ) {
                            setSelectedQ(safeQ + 1);
                          } else if (safeSec < sections.length - 1) {
                            setSelectedSec(safeSec + 1);
                            setSelectedQ(0);
                          }
                        }}
                        endIcon={<ArrowForward sx={{ fontSize: 13 }} />}
                        sx={{ textTransform: 'none', fontSize: '0.75rem', color: T.textSecond, borderRadius: '7px', '&:hover': { bgcolor: T.pageBg } }}>
                        Next
                      </Button>
                    </Stack>
                  </Box>
                )}

                {/* Pool-ready banner */}
                {totalSavedQ > 0 && (
                  <Box sx={{ mt: 2.5, p: '12px 16px', bgcolor: T.successBg, border: `1px solid ${T.successBdr}`, borderRadius: '10px' }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <CheckCircle sx={{ fontSize: 16, color: T.success }} />
                      <Typography sx={{ fontSize: '0.8rem', color: T.success, fontWeight: 600 }}>
                        Pool ready — {totalSavedQ} questions saved · {totalPoints} total marks
                      </Typography>
                    </Stack>
                  </Box>
                )}
                </Box>

              {/* ── Footer action bar — compact warning pill + button ── */}
              <Box sx={{
                flexShrink: 0, px: 3, py: 1.5,
                borderTop: `1px solid ${T.border}`,
                bgcolor: T.surface,
                display: 'flex', alignItems: 'center', gap: 1.25,
              }}>
                {(totalSavedQ === 0 || unsavedCount > 0) && (
                  <Tooltip
                    title={
                      unsavedCount > 0
                        ? `${unsavedCount} unsaved question${unsavedCount > 1 ? 's' : ''} — click Save on each card to add them to the pool. Configure distribution stays disabled until every question is saved.`
                        : 'Save at least one question to continue. Configure distribution unlocks once you have a saved question in the pool.'
                    }
                    placement="top"
                    arrow
                  >
                    <Stack direction="row" spacing={0.75} alignItems="center" sx={{
                      px: 1.25, py: 0.5,
                      bgcolor: unsavedCount > 0 ? T.errorBg : T.warnBg,
                      border: `1px solid ${unsavedCount > 0 ? T.errorBdr : T.warnBdr}`,
                      borderRadius: '7px',
                      cursor: 'help',
                      maxWidth: { xs: 200, sm: 360 },
                    }}>
                      <Warning sx={{
                        fontSize: 14,
                        color: unsavedCount > 0 ? T.error : T.warn,
                        flexShrink: 0,
                      }} />
                      <Typography sx={{
                        fontSize: '0.72rem', fontWeight: 600,
                        color: unsavedCount > 0 ? T.error : '#C08A5B',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {unsavedCount > 0
                          ? `${unsavedCount} unsaved — save each to continue`
                          : 'Save at least one question'}
                      </Typography>
                    </Stack>
                  </Tooltip>
                )}

                <Box sx={{ flex: 1 }} />

                {origin !== 'question-bank' && (
  <Button variant="contained" onClick={handleProceedToDistribution}
    disabled={totalSavedQ === 0 || unsavedCount > 0}
    endIcon={<ArrowForward sx={{ fontSize: 16 }} />}
    sx={{ textTransform: 'none', borderRadius: '9px', fontSize: '0.82rem', px: 2.5, py: 0.9, bgcolor: T.navy, boxShadow: 'none', '&:hover': { bgcolor: T.navyHover, boxShadow: '0 2px 10px rgba(127,158,126,0.28)' }, '&.Mui-disabled': { bgcolor: '#E7EAE3', color: T.textMuted } }}>
    Configure distribution
  </Button>
)}
                {/* 🔧 QB mode: finish button — save paper and return to Question Bank */}
                {origin === 'question-bank' && (
                  <Button variant="contained"
                    onClick={() => { returnAfterSaveRef.current = true; openPaperDialog(); }}
                    disabled={totalSavedQ === 0 || unsavedCount > 0}
                    startIcon={<BookmarkAdd sx={{ fontSize: 16 }} />}
                    sx={{ textTransform: 'none', borderRadius: '9px', fontSize: '0.82rem', px: 2.5, py: 0.9, bgcolor: T.navy, boxShadow: 'none', '&:hover': { bgcolor: T.navyHover, boxShadow: '0 2px 10px rgba(127,158,126,0.28)' }, '&.Mui-disabled': { bgcolor: '#E7EAE3', color: T.textMuted } }}>
                    Save paper &amp; return to Question Bank
                  </Button>
                )}
              </Box>
            </Box>
            {papersOpen && (
  <PaperRepositoryPanel
    papers={papers}
    loading={papersLoading}
    loadingPaperId={loadingPaperId}
    deletingPaperId={deletingPaperId}
    onLoad={handleLoadFromPaper}
    onDelete={handleDeletePaper}
    onClose={handleTogglePapers}
    onRefresh={fetchPapers}
  />
)}
          </>
          
        )}

        {step === 2 && (
  <Box sx={{ flex: 1, overflow: 'auto', p: { xs: 2, sm: 3 } }}>
    <Box sx={{ maxWidth: 820, mx: 'auto' }}>
 
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: T.navy, textTransform: 'uppercase', letterSpacing: '0.1em', mb: 0.5 }}>
          {stepMeta.label}
        </Typography>
        <Typography sx={{ fontSize: '1.45rem', fontWeight: 800, color: T.textPrimary, lineHeight: 1.25, mb: 0.5 }}>
          Configure each section and publish
        </Typography>
        <Typography sx={{ fontSize: '0.875rem', color: T.textSecond, lineHeight: 1.65 }}>
          Set how many questions each section will serve and the per-type breakdown.
          Save and validate each section, then publish the assessment.
        </Typography>
      </Box>
      <SectionDistributionStep
        sections={sections}
        computeSectionPoolCounts={computeSectionPoolCounts}
        setSectionQuestionCount={setSectionQuestionCount}
        setSectionDist={setSectionDist}
        setSectionDuration={setSectionDuration}
        handleSaveSectionConfig={handleSaveSectionConfig}
        handleValidateSection={handleValidateSection}
        handleSaveAndValidateAllSections={handleSaveAndValidateAllSections}
        allSectionsReady={allSectionsReady}
        validating={validating}
        valResult={valResult}
        publishing={publishing}
        handlePublish={() => handlePublish((publishedId) => {
          // BUILD: 2026-07-27-wizard-assessmentid-v1
          if (onComplete && publishedId) onComplete(publishedId);
          return onClose ? onClose() : navigate(origin === 'question-bank' ? '/employer/question-bank' : '/employer/candidates');
        })}
        onBack={() => setStep(1)}
      />
 
    </Box>
  </Box>
)}
 
    </Box>


      {/* ══ SAVE AS PAPER DIALOG ═══════════════════════════════════════════ */}
      <SaveAsPaperDialog
        paperDialogOpen={paperDialogOpen}
        setPaperDialogOpen={setPaperDialogOpen}
        paperSaveMode={paperSaveMode}
        setPaperSaveMode={setPaperSaveMode}
        sourcePapers={sourcePapers}
        savingPaper={savingPaper}
        handleUpdateExistingPaper={handleUpdateExistingPaper}
        totalSavedQ={totalSavedQ}
        totalPoints={totalPoints}
        paperName={paperName}
        setPaperName={setPaperName}
        paperDesc={paperDesc}
        setPaperDesc={setPaperDesc}
        handleSaveAsPaper={handleSaveAsPaper}
      />

      {/* ══ INSTRUCTIONS DIALOG ═══════════════════════════════════════════ */}
      <InstructionsDialog
        instructionsOpen={instructionsOpen}
        setInstructionsOpen={setInstructionsOpen}
      />

      {/* ══ MISSING CORRECT ANSWER DIALOG (Alert #1) ═══════════════════════ */}
      <MissingCorrectDialog
        missingCorrectDialog={missingCorrectDialog}
        setMissingCorrectDialog={setMissingCorrectDialog}
      />

      </Box>
  );
}