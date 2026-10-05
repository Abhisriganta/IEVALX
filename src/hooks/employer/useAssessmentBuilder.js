import { useState, useCallback, useEffect, useRef } from 'react';
import { useSnackbar } from 'notistack';
import assessmentService from '../../services/api/employer/assessmentService';

// ═════════════════════════════════════════════════════════════════════════════
// ── CONSTANTS ─────────────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════

export const QUESTION_TYPES = [
  { value: 'mcq',          label: 'MCQ',               desc: 'Single correct answer',          color: '#1D6FBF' },
  { value: 'multi_select', label: 'Multi Select',      desc: 'Multiple correct answers',       color: '#7C3AED' },
  { value: 'true_false',   label: 'True / False',      desc: 'Binary choice',                  color: '#15803D' },
  { value: 'fill_blank',   label: 'Fill in Blank',     desc: 'Text-based answer',              color: '#D97706' },
  { value: 'match',        label: 'Match Following',   desc: 'Pair items from two columns',    color: '#0284C7' },
  { value: 'sequence',     label: 'Sequencing',        desc: 'Arrange items in correct order', color: '#EA580C' },
  { value: 'short_answer', label: 'Short Answer',      desc: 'Open text (manual eval)',        color: '#4666B8' },
  { value: 'coding',       label: 'Coding',            desc: 'Write code (manual eval)',       color: '#DC2626' },
  { value: 'scenario',     label: 'Scenario',          desc: 'Case-based (manual eval)',       color: '#6D28D9' },
];

export const SECTION_PRESETS = [
  { value: 'aptitude',  label: 'Aptitude',          color: '#EA580C' },
  { value: 'technical', label: 'Technical',         color: '#1D6FBF' },
  { value: 'custom',    label: 'Custom Section',    color: '#64748B' },
];

export const LANGUAGES = ['python', 'javascript', 'java', 'c', 'cpp', 'sql'];

export const SUBJECTIVE_TYPES = new Set(['short_answer', 'coding', 'scenario']);

// ═════════════════════════════════════════════════════════════════════════════
// ── FACTORIES ─────────────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════

const makeId = () => `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

export const blankQuestion = (type = 'mcq') => ({
  id:             makeId(),
  type,
  text:           '',
  stemImages:     [],
  // FIX: coding/sql should get 10pts — they were being caught by SUBJECTIVE_TYPES (5pts) before
   points:         type === 'coding' ? 10
                    : SUBJECTIVE_TYPES.has(type) ? 5
                    : 1,
  difficulty:     'medium',
  required:       true,
  customType:     '',
  options:        type === 'true_false'
                    ? [{ text: 'True', isCorrect: true, image: null }, { text: 'False', isCorrect: false, image: null }]
                    : ['mcq', 'multi_select'].includes(type)
                    ? [{ text: '', isCorrect: false, image: null }, { text: '', isCorrect: false, image: null },
                       { text: '', isCorrect: false, image: null }, { text: '', isCorrect: false, image: null }]
                    : [],
  expectedAnswer: '',
  caseSensitive:  false,
  pairs:          type === 'match' ? [{ left: '', right: '' }, { left: '', right: '' }] : [],
  items:          type === 'sequence' ? ['', '', ''] : [],
  codeSnippet:    '',
  language:       'python',
  testCases:      type === 'coding' ? [{ input: '', expectedOutput: '', isHidden: false, weightage: 1 }] : [],
  // 🔧 SQL question fields (only meaningful when language === 'sql').
  // Backend keys (must match what manual_coding_compiler and manual_evaluation read):
  //   sqlSchemaDdl         → content.sql_schema_ddl
  //   sqlSeedData          → content.sql_seed_data
  //   sqlExpectedResultset → content.sql_expected_resultset
  //   sqlOrderSensitive    → content.sql_order_sensitive
  sqlSchemaDdl:         '',
  sqlSeedData:          '',
  sqlExpectedResultset: '',
  sqlOrderSensitive:    false,
  description:    '',
  explanation:    '',
  _savedId:       null,
  _dirty:         true,
});

export const blankSection = (type = 'aptitude') => {
  const preset = SECTION_PRESETS.find(s => s.value === type) || SECTION_PRESETS[0];
  return {
    id:        `sec_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    type,
    title:     preset.label,
    questions: [blankQuestion('mcq')],
    expanded:  true,
    _savedId:  null,
    _dirty:    true,

    // 🔧 Per-section distribution config (Step 3)
    questionCount:     0,
    distribution:      {},
    durationMinutes:   0,      
    _configSaved:      false,
    _validated:        false,
    _validationErrors: [],
    _savingConfig:     false,
    _validatingSec:    false,
  };
};

// ═════════════════════════════════════════════════════════════════════════════
// ── PAYLOAD BUILDER ───────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════

export const buildQuestionPayload = (q, assessmentId, section = null) => {
  const base = {
    assessment_id: assessmentId,
    section_id:    section?._savedId || null,   // 🔧 NEW — required by backend
    question_type: q.type,
    stem:          q.text.trim(),
    stem_images:   Array.isArray(q.stemImages) ? q.stemImages : [],
    difficulty:    q.difficulty || 'medium',
    marks:         q.points,
    explanation:   q.explanation || null,
    section_title: section?.title || '',
    section_type:  section?.type  || '',
  };
  if (q.type === 'custom') {
    base.custom_type = (q.customType || '').trim();
  }

  if (['mcq', 'multi_select', 'true_false'].includes(q.type)) {
    const KEYS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const correctKeys = [];
    base.options = q.options.map((o, i) => {
      const key = KEYS[i];
      if (o.isCorrect) correctKeys.push(key);
      return { key, text: o.text, image: o.image || null };
    });
    base.correct_answer = q.type === 'mcq' ? (correctKeys[0] || null) : correctKeys;
  }

  if (q.type === 'fill_blank') {
    base.fill_blank_answer = q.expectedAnswer;
    base.correct_answer    = q.expectedAnswer;
  }

  if (q.type === 'match') {
    base.match_pairs    = q.pairs;
    base.correct_answer = q.pairs;
  }

  if (q.type === 'sequence') {
    base.sequence_items = q.items;
    base.correct_answer = q.items;
  }

  if (q.type === 'coding') {
    base.code_snippet = q.codeSnippet;
    base.language     = q.language || 'python';
    // 🔧 SQL questions take a completely different shape than subprocess
    // languages: instead of {input, expected_output, ...} test cases, the
    // recruiter authors schema DDL + (optional) seed data + an expected
    // result-set query. The backend compares the candidate's SELECT against
    // the expected query inside an ephemeral MySQL schema. Skip test_cases
    // entirely for SQL — the backend ignores them for this language.
    if (q.language === 'sql') {
      base.sql_schema_ddl         = q.sqlSchemaDdl         || '';
      base.sql_seed_data          = q.sqlSeedData          || '';
      base.sql_expected_resultset = q.sqlExpectedResultset || '';
      base.sql_order_sensitive    = !!q.sqlOrderSensitive;
    } else {
      base.test_cases = (q.testCases || []).map((tc, i) => ({
        label:           `Test ${i + 1}`,
        input:           tc.input ?? '',
        expected_output: tc.expectedOutput ?? '',
        is_hidden:       !!tc.isHidden,
        weight:          Number(tc.weightage ?? 1),
      }));
    }
  }

  return base;
};

// ═════════════════════════════════════════════════════════════════════════════
// ── REVERSE MAPPER: backend question → frontend question ─────────────────────
// ═════════════════════════════════════════════════════════════════════════════

const OPTION_KEYS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const backendToFrontendQuestion = (bq) => {
  if (bq && typeof bq.content === 'object' && bq.content !== null && !Array.isArray(bq.content)) {
    bq = { ...bq.content, ...bq };
  }

  const rawType    = bq.question_type || bq.type || 'mcq';
  const knownTypes = QUESTION_TYPES.map(t => t.value);
  const type       = knownTypes.includes(rawType) ? rawType : 'mcq';
  const customType = type === 'custom'
    ? (bq.custom_type || bq.content?.custom_type || (knownTypes.includes(rawType) ? '' : rawType) || '')
    : '';

  // ── Question text — try every common Django field name variant ────────────
  let questionText =
  bq.stem || bq.question_text || bq.text || bq.question || '';
if (typeof questionText !== 'string') questionText = '';


  // ── Points/marks ──────────────────────────────────────────────────────────
  const points = Number(bq.marks ?? bq.points ?? bq.score ?? bq.max_marks ?? 1) || 1;

  // ── Correct answer ────────────────────────────────────────────────────────
  const correctAnswer =
    bq.correct_answer ??
    bq.answer         ??
    bq.correct_option ??
    bq.right_answer   ??
    null;

  // ── MCQ / multi-select / true-false options ───────────────────────────────
  const rawOptions =
    bq.options          ||
    bq.choices          ||
    bq.answer_options   ||
    bq.question_options ||
    [];

  let options = [];
  if (['mcq', 'multi_select', 'true_false'].includes(type) && Array.isArray(rawOptions) && rawOptions.length > 0) {
    const correctKeys = (
      Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer].filter(v => v != null)
    ).map(String);
    const hasDirectFlag = rawOptions.some(
      o => 'is_correct' in o || 'correct' in o || 'isCorrect' in o
    );

    options = rawOptions.map((o, i) => {
      const optionText = o.text || o.option_text || o.value || o.label || '';

      let isCorrect = false;

      if (hasDirectFlag) {
        // Backend stores correctness directly on each option object
        isCorrect = !!(o.is_correct ?? o.correct ?? o.isCorrect);
      } else {
        const resolvedKey = String(
          o.key        ??
          o.option_key ??
          OPTION_KEYS[i] ??
          i
        );

        // Also try matching by numeric id in case correctAnswer is stored as "1", "2", etc.
        const resolvedIdStr = String(o.id ?? '');

        isCorrect = correctKeys.includes(resolvedKey) ||
                    (resolvedIdStr !== '' && correctKeys.includes(resolvedIdStr));
      }

      return { text: optionText, isCorrect, image: o.image || o.image_url || null };
    });
  }

  // Fallback: true/false with no stored options
  if (options.length === 0 && type === 'true_false') {
    options = [{ text: 'True', isCorrect: true, image: null }, { text: 'False', isCorrect: false, image: null }];
  }

  // ── Fill in blank ─────────────────────────────────────────────────────────
  const expectedAnswer =
    bq.fill_blank_answer                                          ||
    (type === 'fill_blank' && typeof correctAnswer === 'string'
      ? correctAnswer : '')                                       ||
    bq.expected_answer                                            || '';

  // ── Matching pairs ────────────────────────────────────────────────────────
  const pairs = bq.match_pairs || bq.pairs || bq.matching_pairs || [];

  // ── Sequencing items ──────────────────────────────────────────────────────
  const items = bq.sequence_items || bq.items || bq.sequencing_items || [];

  return {
    id:             makeId(),
    type,
    text:           questionText,
    stemImages:     Array.isArray(bq.stem_images) ? bq.stem_images
                      : Array.isArray(bq.stemImages) ? bq.stemImages
                      : [],
    points,
    difficulty:     bq.difficulty || 'medium',
    required:       true,
    customType,
    options,
    expectedAnswer,
    caseSensitive:  bq.case_sensitive || false,
    pairs,
    items,
    codeSnippet:    bq.code_snippet || bq.code      || '',
    language:       bq.language     || 'python',
    testCases:      bq.test_cases   || bq.test_case || [],
    // 🔧 SQL fields — restored from backend content. Empty defaults are
    // safe: the SQL editor UI only renders them when language === 'sql'.
    sqlSchemaDdl:         bq.sql_schema_ddl         || '',
    sqlSeedData:          bq.sql_seed_data          || '',
    sqlExpectedResultset: bq.sql_expected_resultset || '',
    sqlOrderSensitive:    !!bq.sql_order_sensitive,
    description:    bq.description  || '',
    explanation:    bq.explanation  || '',
    _savedId:       null,   // always null — imported questions need fresh saves in this assessment
    _dirty:         true,
  };
};

// ═════════════════════════════════════════════════════════════════════════════
// ── HELPER: extract array from any common response shape ─────────────────────
// ═════════════════════════════════════════════════════════════════════════════

const extractArray = (data, ...keys) => {
  if (Array.isArray(data)) return data;
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
};

const isPristineBlankQuestion = (q) => {
  if (!q) return false;
  if (q._savedId) return false;
  if ((q.text || '').trim() !== '') return false;
  const optionsEmpty = !q.options || q.options.every(o => !(o.text || '').trim());
  const noExpected   = !(q.expectedAnswer || '').trim();
  const noPairs      = !q.pairs || q.pairs.every(p => !(p.left || '').trim() && !(p.right || '').trim());
  const noItems      = !q.items || q.items.every(it => !(it || '').trim());
  const noCode       = !(q.codeSnippet || '').trim();
  return optionsEmpty && noExpected && noPairs && noItems && noCode;
};
const isPristineBlankSection = (s) => {
  if (!s) return false;
  if (s._savedId) return false;
  return (s.questions || []).every(isPristineBlankQuestion);
};

// 🔧 Compute pool counts for ONE section (only saved questions)
const computeSectionPoolCounts = (section) => {
  const counts = {};
  section.questions.forEach(q => {
    if (q._savedId) counts[q.type] = (counts[q.type] || 0) + 1;
  });
  return counts;
};

export const useAssessmentBuilder = ({ open, onClose, job, companyId, paperId }) => {
  const { enqueueSnackbar } = useSnackbar();

  const [step,         setStep]         = useState(0);
  const [assessmentId, setAssessmentId] = useState(null);
  const [title,        setTitle]        = useState('');
  const [description,  setDescription]  = useState('');
  const [randomize,    setRandomize]    = useState(true);
  const [showResults,  setShowResults]  = useState(false);
  const [creating,     setCreating]     = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [scheduledStartAt,  setScheduledStartAt]  = useState(''); 
  const [expiresAt,         setExpiresAt]         = useState('');
  // Pass Percentage (0–100). Recruiter enters this once — the report
  // computes candidate% = obtained/total×100 and compares against it.
  // Backend column: tbl_manual_assessment.pass_percentage (TINYINT UNSIGNED).
  const [passPercentage,    setPassPercentage]    = useState('');
  


  // Step 1
  const [sections,     setSections]     = useState([blankSection('aptitude')]);

  // Step 2
  const [finalCount,     setFinalCount]     = useState(30);
  const [distribution,   setDistribution]   = useState({});
  const [configSaved,    setConfigSaved]    = useState(false);
  const [validating,     setValidating]     = useState(false);
  const [valResult,      setValResult]      = useState(null);
  const [publishing,     setPublishing]     = useState(false);
  const [savingConfig,   setSavingConfig]   = useState(false);

  // Paper repo — save dialog
  const [paperDialogOpen, setPaperDialogOpen] = useState(false);
  const [savingPaper,     setSavingPaper]     = useState(false);
  const [paperName,       setPaperName]       = useState('');
  const [paperDesc,       setPaperDesc]       = useState('');

  // Paper repo — sidebar / list
  const [papersOpen,     setPapersOpen]     = useState(false);
  const [papers,         setPapers]         = useState([]);
  const [papersLoading,  setPapersLoading]  = useState(false);
  const [loadingPaperId, setLoadingPaperId] = useState(null);
  const [deletingPaperId,setDeletingPaperId]= useState(null);
  const creatingRef   = useRef(false);
  const publishingRef = useRef(false);
  const savingKeysRef = useRef(new Set()); 
  const sectionCreatingRef = useRef(new Map());
  const removingSectionRef = useRef(new Set());
  const autoSyncPaperIdRef = useRef(null);
  const autoLoadPaperRef   = useRef(false);

  // ── Computed ──────────────────────────────────────────────────────────────
  const totalQuestions = sections.reduce((sum, s) => sum + s.questions.length, 0);
  const totalPoints    = sections.reduce((sum, s) =>
    sum + s.questions.reduce((qs, q) => qs + (q.points || 0), 0), 0);

  const poolCounts = (() => {
    const counts = {};
    sections.forEach(s =>
      s.questions.forEach(q => {
        if (q._savedId) counts[q.type] = (counts[q.type] || 0) + 1;
      })
    );
    return counts;
  })();

  const totalSavedQ  = Object.values(poolCounts).reduce((s, v) => s + v, 0);
  const unsavedCount = sections.reduce((s, sec) =>
    s + sec.questions.filter(q => q._dirty).length, 0);
  const customCategories = (() => {
    const seen        = new Set();
    const fixedLabels = new Set(SECTION_PRESETS.map(p => p.label.toLowerCase()));
    const out         = [];
    sections.forEach(s => {
      if (s.type !== 'custom') return;
      const t = (s.title || '').trim();
      if (!t) return;
      const key = t.toLowerCase();
      if (fixedLabels.has(key) || seen.has(key)) return;
      seen.add(key);
      out.push(t);
    });
    return out;
  })();

  const sourcePapers = (() => {
    const seen = new Map();
    sections.forEach(s => {
      if (s._sourcePaperId && !seen.has(s._sourcePaperId)) {
        seen.set(s._sourcePaperId, {
          id:   s._sourcePaperId,
          name: s._sourcePaperName || 'Imported Paper',
        });
      }
    });
    return Array.from(seen.values());
  })();
  useEffect(() => {
    autoSyncPaperIdRef.current = sourcePapers.length > 0 ? sourcePapers[0].id : null;
  }, [sourcePapers]);

  const allSectionsReady = sections.length > 0 && sections.every(
    s => s._savedId && s._validated && (parseInt(s.durationMinutes) || 0) > 0
  );

  // ── Reset on open ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    setStep(0);
    setAssessmentId(null);
    setTitle(job?.title ? `${job.title} — Manual Assessment` : '');
    setDescription('');
    setScheduledStartAt('');
    setExpiresAt('');
    setRandomize(true);
    setShowResults(false);
    setCreating(false);
    setSettingsOpen(false);
    setSections([blankSection('aptitude')]);
    setFinalCount(30);
    setDistribution({});
    setConfigSaved(false);
    setValResult(null);
    setPaperName('');
    setPaperDesc('');
    creatingRef.current   = false;
    publishingRef.current = false;
  }, [open, job]);

  // 🔧 Auto-load paper when paperId is provided (from Question Bank "Open paper")
  useEffect(() => {
    if (!open || !paperId || autoLoadPaperRef.current) return;
    autoLoadPaperRef.current = true;

    const autoLoad = async () => {
      // 1. Fetch papers to find the paper object (we need paper_name etc.)
      let paper = null;
      try {
        const res = await assessmentService.listPapers(companyId);
        const allPapers = extractArray(res.data, 'papers', 'results', 'paper_list', 'data');
        paper = allPapers.find(p => String(p.id) === String(paperId));
      } catch {
        // ignore — paper will be null
      }

      if (!paper) {
        enqueueSnackbar('Paper not found — starting a blank assessment.', { variant: 'warning' });
        return;
      }

      const paperTitle = paper.paper_name || paper.name || 'Untitled Paper';

      // 2. Auto-create an assessment (title from paper name)
      setTitle(paperTitle);
      setCreating(true);
      try {
        const createRes = await assessmentService.create({
          company_id:   companyId,
          job_id:       job?.id || null,
          job_title:    job?.title || null,
          title:        paperTitle,
          description:  paper.description || null,
          instructions: paper.description || null,
          // Only send when set (0-100). Backend accepts null/omitted.
          pass_percentage: passPercentage !== '' && !Number.isNaN(Number(passPercentage))
            ? Math.max(0, Math.min(100, Number(passPercentage)))
            : null,
        });
        const newId = createRes.data?.assessment?.id;
        if (!newId) {
          enqueueSnackbar('Failed to create assessment for this paper.', { variant: 'error' });
          return;
        }
        setAssessmentId(newId);
        setStep(1);

        // 3. Auto-import the paper's questions into the new assessment
        setLoadingPaperId(paper.id);
        try {
          const importRes = await assessmentService.importPaperInto(paper.id, newId);
          const imported = extractArray(importRes.data, 'questions');

          if (imported.length === 0) {
            enqueueSnackbar('Paper has no questions — you can add them manually.', { variant: 'info' });
            return;
          }

          const paperLabel = paperTitle;
          const groups = new Map();
          imported.forEach(bq => {
            const sectionTitle = (bq.section_title || '').trim() || 'Imported';
            const sectionType  = (bq.section_type  || '').trim() || 'custom';
            const sectionId    = bq.section_id ?? null;
            const key = sectionId != null
              ? `id:${sectionId}`
              : `name:${sectionType}::${sectionTitle}`;
            if (!groups.has(key)) {
              groups.set(key, {
                title:            sectionTitle,
                type:             sectionType,
                backendSectionId: sectionId,
                questions:        [],
              });
            }
            const mapped = backendToFrontendQuestion(bq);
            mapped._savedId = bq.id;
            mapped._dirty   = false;
            groups.get(key).questions.push(mapped);
          });

          const newSections = [];
          groups.forEach(g => {
            newSections.push({
              id:                 `sec_import_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
              type:               g.type,
              title:              g.title,
              questions:          g.questions,
              expanded:           true,
              _savedId:           g.backendSectionId,
              _dirty:             false,
              questionCount:      0,
              distribution:       {},
              _configSaved:       false,
              _validated:         false,
              _validationErrors:  [],
              _savingConfig:      false,
              _validatingSec:     false,
              _importedFromPaper: paperLabel,
              _sourcePaperId:     paper.id,
              _sourcePaperName:   paperLabel,
            });
          });

          setSections(newSections);
          enqueueSnackbar(
            `${imported.length} question(s) loaded from "${paperLabel}".`,
            { variant: 'success', autoHideDuration: 5000 },
          );
        } finally {
          setLoadingPaperId(null);
        }
      } catch (err) {
        enqueueSnackbar(err?.response?.data?.Error || 'Failed to auto-load paper.', { variant: 'error' });
      } finally {
        setCreating(false);
      }
    };

    autoLoad();
  }, [open, paperId, companyId, job, enqueueSnackbar]);

  // 🔧 Seed each section's questionCount
  useEffect(() => {
    if (step !== 2) return;
    setSections(prev => prev.map(sec => {
      // Already configured? Leave it alone so user-entered values survive re-entry.
      if (sec.questionCount > 0 && Object.keys(sec.distribution || {}).length > 0) {
        return sec;
      }
      const pool      = computeSectionPoolCounts(sec);
      const seedDist  = {};
      let   seedCount = 0;
      Object.entries(pool).forEach(([type, count]) => {
        seedDist[type] = count;
        seedCount     += count;
      });
      return {
        ...sec,
        questionCount:     seedCount,
        distribution:      seedDist,
        _configSaved:      false,
        _validated:        false,
        _validationErrors: [],
      };
    }));
  }, [step]);

  // ── Section operations ────────────────────────────────────────────────────
  const updateSection = useCallback((idx, updated) =>
    setSections(prev => prev.map((s, i) => i === idx ? updated : s)), []);

  const addSection = useCallback((type = 'technical') =>
    setSections(prev => [...prev, blankSection(type)]), []);

 const removeSection = useCallback(async (idx) => {
    const target = sections[idx];
    if (target?._savedId) {
      const sharedByOther = sections.some(
        (s, i) => i !== idx && s._savedId === target._savedId
      );
      if (!sharedByOther) {
        try {
          await assessmentService.deleteSection(target._savedId);
        } catch (err) {
          const msg =
            err?.response?.data?.Error ||
            err?.response?.data?.error ||
            'Failed to delete section on server.';
          enqueueSnackbar(msg, { variant: 'error' });
          return;
        }
      }
    }
    setSections(prev => prev.filter((_, i) => i !== idx));
  }, [sections, enqueueSnackbar]);

  // ── Question operations ───────────────────────────────────────────────────
  const updateQuestion = useCallback((secIdx, qIdx, updatedQ) =>
    setSections(prev => prev.map((s, si) => {
      if (si !== secIdx) return s;
      const qs = [...s.questions];
      qs[qIdx] = updatedQ;
      return { ...s, questions: qs };
    })), []);

  const addQuestion = useCallback((secIdx, type = 'mcq') =>
    setSections(prev => prev.map((s, si) =>
      si !== secIdx ? s : { ...s, questions: [...s.questions, blankQuestion(type)] }
    )), []);
  const triggerPaperAutoSync = useCallback(() => {
    const paperId = autoSyncPaperIdRef.current;
    if (!paperId || !assessmentId) return;
    assessmentService
      .updatePaperFromAssessment(paperId, { assessment_id: assessmentId })
      .catch(err =>
        console.warn('[AutoSync] Paper sync failed (non-fatal):', err?.response?.data || err)
      );
  }, [assessmentId]);

  const removeQuestion = useCallback((secIdx, qIdx) => {
    setSections(prev => {
      const sec    = prev[secIdx];
      const target = sec?.questions[qIdx];

      if (target?._savedId) {
        assessmentService.deleteQuestion(target._savedId)
          .then(() => {
            triggerPaperAutoSync(); 
          })
          .catch(err => {
            console.warn('[RemoveQuestion] backend delete failed:', err?.response?.data || err);
            triggerPaperAutoSync(); 
          });
      }

      return prev.map((s, si) => {
        if (si !== secIdx) return s;
        return { ...s, questions: s.questions.filter((_, i) => i !== qIdx) };
      });
    });
  }, [triggerPaperAutoSync]);

  const duplicateQuestion = useCallback((secIdx, qIdx) =>
    setSections(prev => prev.map((s, si) => {
      if (si !== secIdx) return s;
      const qs = [...s.questions];
      qs.splice(qIdx + 1, 0, { ...qs[qIdx], id: makeId(), _savedId: null, _dirty: true });
      return { ...s, questions: qs };
    })), []);

  // ── Step 0: create assessment ─────────────────────────────────────────────
 const handleCreateAssessment = useCallback(async () => {
    if (creatingRef.current) return;
    if (!title.trim()) {
      enqueueSnackbar('Assessment title is required.', { variant: 'warning' });
      return;                       
    }
    creatingRef.current = true;      
    setCreating(true);
    try {
      const res = await assessmentService.create({
        company_id:   companyId,
        job_id:       job?.id || null,
        job_title:    job?.title || null,
        title:        title.trim(),
        description:  description.trim() || null,
        instructions: description.trim() || null,
        // Only send when set (0-100). Backend accepts null/omitted.
        pass_percentage: passPercentage !== '' && !Number.isNaN(Number(passPercentage))
          ? Math.max(0, Math.min(100, Number(passPercentage)))
          : null,
      });
      const id = res.data?.assessment?.id;
      setAssessmentId(id);
      setStep(1);
      enqueueSnackbar('Assessment created — now add questions to the pool.', { variant: 'success' });
    } catch (err) {
      creatingRef.current = false; 
      enqueueSnackbar(err?.response?.data?.Error || 'Failed to create assessment.', { variant: 'error' });
    } finally {
      setCreating(false);
    }
  }, [title, description, passPercentage, companyId, job, enqueueSnackbar]);
  
// ── Step 1: save a single question ───────────────────────────────────────
  const handleSaveQuestion = useCallback(async (secIdx, qIdx) => {
    const q = sections[secIdx]?.questions[qIdx];
    if (!q) return;

    // ── Double-click guard ────────────────────────────────────────────────
    const saveKey = `${secIdx}-${qIdx}`;
    if (savingKeysRef.current.has(saveKey)) return;

    // ── Common validation ─────────────────────────────────────────────────
    if (!q.text.trim()) {
      enqueueSnackbar('⚠ Question text is required — type your question before saving.', { variant: 'warning', autoHideDuration: 5000 });
      return;
    }

    if (q.type === 'custom' && !q.customType?.trim()) {
      enqueueSnackbar('Enter a name for your custom question type.', { variant: 'warning' });
      return;
    }

    // ── Per-type validation ───────────────────────────────────────────────
    if (['mcq', 'multi_select'].includes(q.type)) {
      const emptyOpts = q.options.filter(o => !(o.text || '').trim() && !o.image);
      if (emptyOpts.length > 0) {
        enqueueSnackbar('Each option needs text or an image — fill the empty ones before saving.', { variant: 'warning' });
        return;
      }
      const hasCorrect = q.options.some(o => o.isCorrect);
      if (!hasCorrect) {
        enqueueSnackbar(
          q.type === 'mcq'
            ? '⚠ Select the correct answer — click the circle next to the right option.'
            : '⚠ Mark at least one correct answer before saving.',
          { variant: 'warning', autoHideDuration: 5000 }
        );
        return;
      }
    }

    if (q.type === 'true_false') {
      const hasCorrect = q.options.some(o => o.isCorrect);
      if (!hasCorrect) {
        enqueueSnackbar('⚠ Select True or False as the correct answer.', { variant: 'warning', autoHideDuration: 5000 });
        return;
      }
    }

    if (q.type === 'fill_blank' && !q.expectedAnswer.trim()) {
      enqueueSnackbar('Expected answer is required for Fill in Blank.', { variant: 'warning' });
      return;
    }

    if (q.type === 'match') {
      const hasEmpty = q.pairs.some(p => !p.left.trim() || !p.right.trim());
      if (hasEmpty) {
        enqueueSnackbar('All matching pair fields must be filled in.', { variant: 'warning' });
        return;
      }
    }

    if (q.type === 'sequence') {
      const hasEmpty = q.items.some(item => !item.trim());
      if (hasEmpty) {
        enqueueSnackbar('All sequence items must be filled in.', { variant: 'warning' });
        return;
      }
    }

    // ── Mark saving ───────────────────────────────────────────────────────
    savingKeysRef.current.add(saveKey);

    setSections(prev => prev.map((s, si) => {
      if (si !== secIdx) return s;
      const qs = [...s.questions];
      qs[qIdx] = { ...qs[qIdx], _saving: true };
      return { ...s, questions: qs };
    }));
   let parentSection = sections[secIdx];
    if (!parentSection._savedId) {
      const secKey = parentSection.id;
      if (!sectionCreatingRef.current.has(secKey)) {
        const createPromise = (async () => {
          try {
            const secRes = await assessmentService.createSection({
              assessment_id: assessmentId,
              name:          parentSection.title || 'Untitled Section',
              position:      secIdx,
            });
            return secRes.data?.section?.id;
          } catch (err) {
            const status = err?.response?.status;
            const emsg   =
              err?.response?.data?.Error || err?.response?.data?.error || '';
            if (status === 409 || /already exists/i.test(emsg)) {
              const listRes = await assessmentService.listSections(assessmentId);
              const list    = extractArray(listRes.data, 'sections', 'results', 'data');
              const wanted  = (parentSection.title || '').trim().toLowerCase();
              const match   = list.find(
                s => (s.name || '').trim().toLowerCase() === wanted
              );
              if (match?.id) return match.id;
            }
            throw err;
          }
        })();
        sectionCreatingRef.current.set(secKey, createPromise);
      }

      try {
        const newSectionId = await sectionCreatingRef.current.get(secKey);
        parentSection = { ...parentSection, _savedId: newSectionId, _dirty: false };

        setSections(prev => prev.map((s, si) =>
          si !== secIdx ? s : { ...s, _savedId: newSectionId, _dirty: false }
        ));
      } catch (err) {
        savingKeysRef.current.delete(saveKey);
        setSections(prev => prev.map((s, si) => {
          if (si !== secIdx) return s;
          const qs = [...s.questions];
          qs[qIdx] = { ...qs[qIdx], _saving: false };
          return { ...s, questions: qs };
        }));
        const msg =
          err?.response?.data?.Error ||
          err?.response?.data?.error ||
          'Failed to create section.';
        enqueueSnackbar(msg, { variant: 'error' });
        return;
      } finally {
        sectionCreatingRef.current.delete(secKey);
      }
    }
    const payload = buildQuestionPayload(q, assessmentId, parentSection);

    try {
      let res;
      if (q._savedId) {
        res = await assessmentService.updateQuestion(q._savedId, payload);
      } else {
        res = await assessmentService.addQuestion(payload);
      }

      const savedId =
        res.data?.question?.id ??
        res.data?.id           ??
        res.data?.question_id  ??
        q._savedId;

      setSections(prev => prev.map((s, si) => {
        if (si !== secIdx) return s;
        const qs = [...s.questions];
        qs[qIdx] = { ...qs[qIdx], _savedId: savedId, _dirty: false, _saving: false };
        return { ...s, questions: qs };
      }));
      enqueueSnackbar('Question saved.', { variant: 'success', autoHideDuration: 1500 });
      triggerPaperAutoSync();
    } catch (err) {
      // Log full response so you can see exactly what the backend rejected
      console.error('[SaveQuestion] 400 payload:', payload);
      console.error('[SaveQuestion] backend error:', err?.response?.data);

      setSections(prev => prev.map((s, si) => {
        if (si !== secIdx) return s;
        const qs = [...s.questions];
        qs[qIdx] = { ...qs[qIdx], _saving: false };
        return { ...s, questions: qs };
      }));

      const msg =
        err?.response?.data?.Error   ||
        err?.response?.data?.error   ||
        err?.response?.data?.detail  ||
        JSON.stringify(err?.response?.data) ||
        'Failed to save question.';
    if (/section.*not.*found.*or.*inactive/i.test(msg)) {
        setSections(prev => prev.map((s, si) =>
          si !== secIdx
            ? s
            : {
                ...s,
                _savedId: null,
                questions: s.questions.map(qq => ({
                  ...qq, _savedId: null, _dirty: true, _saving: false,
                })),
              }
        ));
        enqueueSnackbar(
          `Section "${parentSection.title || 'Untitled'}" no longer exists on the server. It and its questions have been marked unsaved — click Save on each to restore them.`,
          { variant: 'warning', autoHideDuration: 7000 }
        );
      } else {
        enqueueSnackbar(msg, { variant: 'error' });
      }
    } finally {
      savingKeysRef.current.delete(saveKey);
    }
  }, [sections, assessmentId, enqueueSnackbar]);
  // ── Step 1 → Step 2 gate ──────────────────────────────────────────────────
  const handleProceedToDistribution = useCallback(() => {
    if (totalSavedQ === 0) {
      enqueueSnackbar('Save at least one question before configuring distribution.', { variant: 'warning' });
      return;
    }
    if (unsavedCount > 0) {
      enqueueSnackbar(`${unsavedCount} question(s) have unsaved changes. Save them first.`, { variant: 'warning' });
      return;
    }
    setStep(2);
  }, [totalSavedQ, unsavedCount, enqueueSnackbar]);
  // ═══════════════════════════════════════════════════════════════════════
  // 🔧 PER-SECTION DISTRIBUTION HANDLERS
  // ═══════════════════════════════════════════════════════════════════════

  const setSectionQuestionCount = useCallback((secIdx, val) => {
    setSections(prev => prev.map((s, i) => {
      if (i !== secIdx) return s;
      return {
        ...s,
        questionCount:     Math.max(0, parseInt(val) || 0),
        _configSaved:      false,
        _validated:        false,
        _validationErrors: [],
      };
    }));
  }, []);

  const setSectionDist = useCallback((secIdx, qType, val) => {
    setSections(prev => prev.map((s, i) => {
      if (i !== secIdx) return s;
      const next = { ...(s.distribution || {}) };
      const n    = Math.max(0, parseInt(val) || 0);
      if (n === 0) delete next[qType];
      else         next[qType] = n;
      return {
        ...s,
        distribution:      next,
        _configSaved:      false,
        _validated:        false,
        _validationErrors: [],
      };
    }));
  }, []);

  // 🔧 NEW — Set per-section timer duration (in minutes). 0 = no timer.
  const setSectionDuration = useCallback((secIdx, val) => {
    setSections(prev => prev.map((s, i) => {
      if (i !== secIdx) return s;
      return {
        ...s,
        durationMinutes:   Math.max(0, parseInt(val) || 0),
        _configSaved:      false,
        _validated:        false,
        _validationErrors: [],
      };
    }));
  }, []);

  const handleSaveSectionConfig = useCallback(async (secIdx) => {
    const sec = sections[secIdx];
    if (!sec) return;
    if (!sec._savedId) {
      enqueueSnackbar(
        `Section "${sec.title}" hasn't been saved yet — save a question in it first.`,
        { variant: 'warning' }
      );
      return;
    }
    if (!sec.questionCount || sec.questionCount <= 0) {
      enqueueSnackbar('Question count must be > 0 for each section.', { variant: 'warning' });
      return;
    }

    setSections(prev => prev.map((s, i) =>
      i !== secIdx ? s : { ...s, _savingConfig: true }
    ));

    try {
      await assessmentService.updateSection(sec._savedId, {
        question_count:   sec.questionCount,
        distribution:     sec.distribution || {},
        duration_minutes: sec.durationMinutes || 0,   // 🔧 NEW
      });
      setSections(prev => prev.map((s, i) =>
        i !== secIdx
          ? s
          : { ...s, _configSaved: true, _validated: false,
              _validationErrors: [], _savingConfig: false }
      ));
      enqueueSnackbar(`Section "${sec.title}" config saved.`, { variant: 'success', autoHideDuration: 1500 });
    } catch (err) {
      setSections(prev => prev.map((s, i) =>
        i !== secIdx ? s : { ...s, _savingConfig: false }
      ));
      const msg =
        err?.response?.data?.Error ||
        err?.response?.data?.error ||
        'Failed to save section config.';
      enqueueSnackbar(msg, { variant: 'error' });
    }
  }, [sections, enqueueSnackbar]);

  const handleValidateSection = useCallback(async (secIdx) => {
    const sec = sections[secIdx];
    if (!sec || !sec._savedId) return;
    if (!sec._configSaved) {
      enqueueSnackbar('Save section config first.', { variant: 'warning' });
      return;
    }

    setSections(prev => prev.map((s, i) =>
      i !== secIdx ? s : { ...s, _validatingSec: true }
    ));

    try {
      const res  = await assessmentService.validateSection(sec._savedId);
      const ok   = !!res.data?.valid;
      const errs = res.data?.errors || [];
      setSections(prev => prev.map((s, i) =>
        i !== secIdx
          ? s
          : { ...s, _validated: ok, _validationErrors: errs, _validatingSec: false }
      ));
      if (ok) {
        enqueueSnackbar(`Section "${sec.title}" validated ✓`, { variant: 'success', autoHideDuration: 1500 });
      } else {
        enqueueSnackbar(`Section "${sec.title}" validation failed.`, { variant: 'error' });
      }
    } catch (err) {
      setSections(prev => prev.map((s, i) =>
        i !== secIdx ? s : { ...s, _validatingSec: false }
      ));
      enqueueSnackbar(
        err?.response?.data?.Error || 'Validation request failed.',
        { variant: 'error' }
      );
    }
  }, [sections, enqueueSnackbar]);

  const handleSaveAndValidateAllSections = useCallback(async () => {
    setValidating(true);
    setValResult(null);
    try {
      for (let i = 0; i < sections.length; i++) {
        const sec = sections[i];
        if (!sec?._savedId) continue;
        if (!sec.questionCount || sec.questionCount <= 0) {
          enqueueSnackbar(
            `Section "${sec.title}" — set question count > 0.`,
            { variant: 'warning' }
          );
          continue;
        }

        // Save
        try {
          await assessmentService.updateSection(sec._savedId, {
            question_count:   sec.questionCount,
            distribution:     sec.distribution || {},
            duration_minutes: sec.durationMinutes || 0,   // 🔧 NEW
          });
          setSections(prev => prev.map((s, idx) =>
            idx !== i
              ? s
              : { ...s, _configSaved: true, _validationErrors: [] }
          ));
        } catch (err) {
          enqueueSnackbar(
            `Section "${sec.title}" save failed: ${err?.response?.data?.Error || err.message}`,
            { variant: 'error' }
          );
          continue;
        }

        // Validate immediately after save (backend is now in sync)
        try {
          const res  = await assessmentService.validateSection(sec._savedId);
          const ok   = !!res.data?.valid;
          const errs = res.data?.errors || [];
          setSections(prev => prev.map((s, idx) =>
            idx !== i
              ? s
              : { ...s, _validated: ok, _validationErrors: errs }
          ));
        } catch (err) {
          enqueueSnackbar(
            `Section "${sec.title}" validation failed: ${err?.response?.data?.Error || err.message}`,
            { variant: 'error' }
          );
        }
      }

      // Assessment-level roll-up
      const res = await assessmentService.validateConfig(assessmentId);
      setValResult(res.data);
      if (res.data?.valid) {
        enqueueSnackbar('All sections validated — ready to publish.', { variant: 'success' });
      }
    } catch (err) {
      enqueueSnackbar(
        err?.response?.data?.Error || 'Validation failed.',
        { variant: 'error' }
      );
    } finally {
      setValidating(false);
    }
  }, [sections, assessmentId, enqueueSnackbar]);

  // ── Step 2: save distribution config ─────────────────────────────────────
  //
  // Pass Percentage sync — the recruiter can edit passPercentage at any
  // point after the assessment is created (from step 0 details, step 2
  // finalization, or a settings dialog). This helper pushes the current
  // value to /manual-assessment/<id>/update/ so the backend row stays in
  // sync. Called on blur of any Pass % input in the builder.
  const savePassPercentage = useCallback(async () => {
    if (!assessmentId) return;
    if (passPercentage === '' || passPercentage === null || passPercentage === undefined) {
      // Recruiter cleared the field — send null to remove the criterion.
      try {
        await assessmentService.update(assessmentId, { pass_percentage: null });
      } catch (err) {
        enqueueSnackbar(
          err?.response?.data?.Error || 'Could not clear pass percentage.',
          { variant: 'error' },
        );
      }
      return;
    }
    const n = Number(passPercentage);
    if (Number.isNaN(n) || n < 0 || n > 100) {
      enqueueSnackbar('Pass percentage must be a number between 0 and 100.', { variant: 'warning' });
      return;
    }
    try {
      await assessmentService.update(assessmentId, {
        pass_percentage: Math.round(n),
      });
    } catch (err) {
      enqueueSnackbar(
        err?.response?.data?.Error || 'Could not save pass percentage.',
        { variant: 'error' },
      );
    }
  }, [assessmentId, passPercentage, enqueueSnackbar]);

  const handleSaveConfig = useCallback(async () => {
    setSavingConfig(true);
    setValResult(null);
    try {
      const dist = {};
      Object.entries(distribution).forEach(([k, v]) => {
        const n = parseInt(v) || 0;
        if (n > 0) dist[k] = n;
      });
      await assessmentService.saveConfig({
        assessment_id:        assessmentId,
        final_question_count: parseInt(finalCount),
        distribution:         dist,
      });
      setConfigSaved(true);
      enqueueSnackbar('Distribution config saved.', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.Error || 'Failed to save config.', { variant: 'error' });
    } finally {
      setSavingConfig(false);
    }
  }, [assessmentId, finalCount, distribution, enqueueSnackbar]);

  // ── Step 2: validate ──────────────────────────────────────────────────────
  const handleValidate = useCallback(async () => {
    setValidating(true);
    setValResult(null);
    try {
      const res = await assessmentService.validateConfig(assessmentId);
      setValResult(res.data);
      if (res.data?.valid) {
        enqueueSnackbar('Validation passed — ready to publish!', { variant: 'success' });
      }
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.Error || 'Validation failed.', { variant: 'error' });
    } finally {
      setValidating(false);
    }
  }, [assessmentId, enqueueSnackbar]);

  // ── Step 2: publish ───────────────────────────────────────────────────────
  const handlePublish = useCallback(async (onPublished) => {
    if (publishingRef.current) return;
    publishingRef.current = true;
    setPublishing(true);
    try {
      await assessmentService.publish(assessmentId, {
        scheduled_start_at: scheduledStartAt || null,
        expires_at:         expiresAt        || null,
      });
      enqueueSnackbar('Assessment published successfully!', { variant: 'success' });
      if (onPublished) onPublished(assessmentId);
    } catch (err) {
      const msg = err?.response?.data?.Error || err?.response?.data?.error || '';
      if (/already.*published/i.test(msg)) {
        enqueueSnackbar('Assessment is already published.', { variant: 'info' });
        if (onPublished) onPublished(assessmentId);
      } else {
        publishingRef.current = false;
        enqueueSnackbar(msg || 'Publish failed.', { variant: 'error' });
      }
    } finally {
      setPublishing(false);
    }
  }, [assessmentId, scheduledStartAt, expiresAt, enqueueSnackbar]);

  // ── Paper repo: fetch list ─────────────────────────────────────────────────
  const fetchPapers = useCallback(async () => {
    if (!companyId) {
      enqueueSnackbar('No company ID found — cannot load paper repository.', { variant: 'warning' });
      return;
    }
    setPapersLoading(true);
    try {
      const res = await assessmentService.listPapers(companyId);
      const list = extractArray(
        res.data,
        'papers', 'results', 'paper_list', 'data',
      );
      setPapers(list);
    } catch (err) {
      console.error('[PaperRepo] fetch failed:', err);
      enqueueSnackbar('Failed to load paper repository.', { variant: 'error' });
    } finally {
      setPapersLoading(false);
    }
  }, [companyId, enqueueSnackbar]);

  // ── Paper repo: save as paper ─────────────────────────────────────────────
  // REPLACE WITH
  const handleSaveAsPaper = useCallback(async () => {
    if (!paperName.trim()) {
      enqueueSnackbar('Paper name is required.', { variant: 'warning' });
      return;
    }
    if (!companyId) {
      enqueueSnackbar('Cannot save paper — company ID missing from session. Please refresh the page.', { variant: 'error' });
      console.error('[SavePaper] companyId is null. ievalx_user:', localStorage.getItem('ievalx_user'));
      return;
    }
    if (!assessmentId) {
      enqueueSnackbar('No assessment found — create the assessment in Step 1 first.', { variant: 'error' });
      return;
    }

    // Compute accurate pool snapshot directly from saved questions in state
    const savedQuestions = sections.flatMap(s => s.questions.filter(q => q._savedId));
    const savedQ   = savedQuestions.length;
    const savedPts = savedQuestions.reduce((sum, q) => sum + (q.points || 0), 0);

    setSavingPaper(true);
    try {
      await assessmentService.saveAsPaper({
        company_id:      companyId,
        assessment_id:   assessmentId,
        paper_name:      paperName.trim(),
        description:     paperDesc.trim() || undefined,
        total_questions: savedQ,
        total_marks:     savedPts,
      });
      enqueueSnackbar(`"${paperName}" saved to repository. You can keep editing — it stays as a draft snapshot until you publish.`, { variant: 'success' });
      setPaperDialogOpen(false);
      setPaperName('');
      setPaperDesc('');
      if (papersOpen && companyId) fetchPapers();
    } catch (err) {
      const msg =
        err?.response?.data?.Error  ||
        err?.response?.data?.error  ||
        err?.response?.data?.detail ||
        'Failed to save paper.';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setSavingPaper(false);
    }
  }, [sections, companyId, assessmentId, paperName, paperDesc, papersOpen, fetchPapers, enqueueSnackbar]);
  // ── Paper repo: update an EXISTING paper from current pool ───────────────
  const handleUpdateExistingPaper = useCallback(async (paperId) => {
    if (!paperId) {
      enqueueSnackbar('No paper selected to update.', { variant: 'warning' });
      return;
    }
    if (!assessmentId) {
      enqueueSnackbar('No assessment found.', { variant: 'error' });
      return;
    }

    setSavingPaper(true);
    try {
      const res = await assessmentService.updatePaperFromAssessment(paperId, {
        assessment_id: assessmentId,
        // Only send description if the user actually typed one — otherwise the
        // backend will preserve whatever the paper currently has.
        ...(paperDesc.trim() ? { description: paperDesc.trim() } : {}),
      });
      const updatedName = res?.data?.paper?.paper_name || 'Paper';
      enqueueSnackbar(
        `"${updatedName}" updated in repository with your latest changes.`,
        { variant: 'success' },
      );
      setPaperDialogOpen(false);
      setPaperName('');
      setPaperDesc('');
      if (papersOpen && companyId) fetchPapers();
    } catch (err) {
      const msg =
        err?.response?.data?.Error  ||
        err?.response?.data?.error  ||
        err?.response?.data?.detail ||
        'Failed to update paper.';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setSavingPaper(false);
    }
  }, [assessmentId, paperDesc, papersOpen, companyId, fetchPapers, enqueueSnackbar]);

  // ── Paper repo: toggle sidebar ────────────────────────────────────────────
  const handleTogglePapers = useCallback(() => {

  
    const opening = !papersOpen;
    setPapersOpen(opening);
    if (opening) fetchPapers();
  }, [papersOpen, fetchPapers]);

  // ── Paper repo: delete ────────────────────────────────────────────────────
  const handleDeletePaper = useCallback(async (paperId, paperDisplayName) => {
    setDeletingPaperId(paperId);
    try {
      await assessmentService.deletePaper(paperId, companyId);
      setPapers(prev => prev.filter(p => p.id !== paperId));
      enqueueSnackbar(`"${paperDisplayName}" deleted from repository.`, { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.Error || 'Failed to delete paper.', { variant: 'error' });
    } finally {
      setDeletingPaperId(null);
    }
  }, [enqueueSnackbar]);

  // ── Paper repo: load into current pool ───────────────────────────────────
  const handleLoadFromPaper = useCallback(async (paper) => {
    if (!assessmentId) {
      enqueueSnackbar('Create an assessment first (Step 1) before importing a paper.', { variant: 'warning' });
      return;
    }

    setLoadingPaperId(paper.id);
    try {
      const res = await assessmentService.importPaperInto(paper.id, assessmentId);
      const imported = extractArray(res.data, 'questions');

      if (imported.length === 0) {
        enqueueSnackbar('This paper has no questions to import.', { variant: 'info' });
        return;
      }

      const paperLabel = paper.paper_name || paper.name || 'Imported Paper';
      const groups = new Map();   // key: `id:<section_id>` (fallback: name)
      imported.forEach(bq => {
        const sectionTitle = (bq.section_title || '').trim() || 'Imported';
        const sectionType  = (bq.section_type  || '').trim() || 'custom';
        const sectionId    = bq.section_id ?? null;
        const key = sectionId != null
          ? `id:${sectionId}`
          : `name:${sectionType}::${sectionTitle}`;
        if (!groups.has(key)) {
          groups.set(key, {
            title:            sectionTitle,
            type:             sectionType,
            backendSectionId: sectionId,
            questions:        [],
          });
        }
        const mapped = backendToFrontendQuestion(bq);
        mapped._savedId = bq.id;
        mapped._dirty   = false;
        groups.get(key).questions.push(mapped);
      });
      setSections(prev => {
        const next        = prev.map(s => ({ ...s, questions: [...s.questions] }));
        const newSections = [];

        groups.forEach(g => {
          const gName = (g.title || '').trim().toLowerCase();

          let idx = g.backendSectionId != null
            ? next.findIndex(s => s._savedId === g.backendSectionId)
            : -1;
          if (idx === -1) {
            idx = next.findIndex(s => (s.title || '').trim().toLowerCase() === gName);
          }

          if (idx !== -1) {
            const existing = next[idx];
            if (g.backendSectionId != null) {
              existing._savedId = g.backendSectionId;
              existing._dirty   = false;
            }
            // 🔧 Drop the untouched starter question(s) so imported Q1 lands at position 1
            existing.questions = existing.questions.filter(q => !isPristineBlankQuestion(q));
            const haveIds = new Set(
              existing.questions.map(q => q._savedId).filter(Boolean)
            );
            const toAdd = g.questions.filter(q => !haveIds.has(q._savedId));
            existing.questions = [...existing.questions, ...toAdd];
            if (!existing._sourcePaperId) {
              existing._sourcePaperId   = paper.id;
              existing._sourcePaperName = paperLabel;
            }
            // 🔧 Show "from <paper>" label in sidebar for merged imports too
            if (!existing._importedFromPaper) {
              existing._importedFromPaper = paperLabel;
            }
          } else {
            newSections.push({
              id:                 `sec_import_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
              type:               g.type,
              title:              g.title,
              questions:          g.questions,
              expanded:           true,
              _savedId:           g.backendSectionId,
              _dirty:             false,
              questionCount:      0,
              distribution:       {},
              _configSaved:       false,
              _validated:         false,
              _validationErrors:  [],
              _savingConfig:      false,
              _validatingSec:     false,
              _importedFromPaper: paperLabel,
              _sourcePaperId:     paper.id,
              _sourcePaperName:   paperLabel,
            });
          }
        });

        const cleanedNext = next.filter(s => !isPristineBlankSection(s));
        return [...cleanedNext, ...newSections];
      });

      enqueueSnackbar(
        `${imported.length} question(s) imported from "${paperLabel}" and added to your pool.`,
        { variant: 'success', autoHideDuration: 5000 }
      );
    } catch (err) {
      const msg =
        err?.response?.data?.Error  ||
        err?.response?.data?.error  ||
        err?.response?.data?.detail ||
        'Failed to import paper.';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setLoadingPaperId(null);
    }
  }, [assessmentId, enqueueSnackbar]);
  // ── Paper repo: remove an imported section in one click ──────────────────
   const handleHideSection = useCallback((sectionId) => {
    setSections(prev => prev.filter(s => s.id !== sectionId));
  }, []);

  const handleRemoveImportedSection = useCallback(async (sectionId) => {
    const target = sections.find(s => s.id === sectionId);
    if (!target) return;

    // Guard against a rapid double-click firing two deletes for one section.
    if (removingSectionRef.current.has(sectionId)) return;
    removingSectionRef.current.add(sectionId);
    const reResolveAndDelete = async () => {
      if (!assessmentId) return false;
      try {
        const listRes = await assessmentService.listSections(assessmentId);
        const live    = extractArray(listRes.data, 'sections', 'results', 'data');
        const wanted  = (target.title || '').trim().toLowerCase();
        const match   = live.find(
          s => (s.name || '').trim().toLowerCase() === wanted
        );
        if (match?.id) {
          await assessmentService.deleteSection(match.id);
        }
        // Matched-and-deleted, or genuinely absent → section is gone server-side.
        return true;
      } catch {
        return false;
      }
    };

    try {
      if (target._savedId) {
        const sharedByOther = sections.some(
          s => s.id !== sectionId && s._savedId === target._savedId
        );
        if (!sharedByOther) {
          try {
            await assessmentService.deleteSection(target._savedId);
          } catch (err) {
            const status = err?.response?.status;
            const msg =
              err?.response?.data?.Error ||
              err?.response?.data?.error ||
              '';
            const notFound = status === 404 || /not found|already deleted/i.test(msg);
            if (notFound) {
              const ok = await reResolveAndDelete();
              if (!ok) {
                enqueueSnackbar(
                  'Could not confirm the section was removed on the server — this assessment may not exist in the database your backend is using. Please retry.',
                  { variant: 'error', autoHideDuration: 6000 },
                );
                return;
              }
            } else {
              enqueueSnackbar(msg || 'Failed to delete section on server.', { variant: 'error' });
              return;
            }
          }
        }
      }
      setSections(prev => prev.filter(s => s.id !== sectionId));
      enqueueSnackbar(
        `Section "${target.title}" removed.`,
        { variant: 'success', autoHideDuration: 2000 },
      );
    } finally {
      removingSectionRef.current.delete(sectionId);
    }
  }, [sections, assessmentId, enqueueSnackbar]);

  // Distribution helpers
  const distTotal = Object.values(distribution).reduce((s, v) => s + (parseInt(v) || 0), 0);

   const setDist   = useCallback((type, val) => {
    setDistribution(prev => ({ ...prev, [type]: parseInt(val) || 0 }));
    setConfigSaved(false);
    setValResult(null);
  }, []);

  // ── Return ────────────────────────────────────────────────────────────────
  return {
    step, setStep,
    assessmentId,
    title, setTitle,
    description, setDescription,
    scheduledStartAt, setScheduledStartAt,
    expiresAt,        setExpiresAt,
    passPercentage,   setPassPercentage,
    savePassPercentage,
    randomize, setRandomize,
    showResults, setShowResults,
    creating,
    settingsOpen, setSettingsOpen,
    handleCreateAssessment,
    sections,
    totalQuestions,
    totalPoints,
    totalSavedQ,
    unsavedCount,
    poolCounts,
    customCategories,
    updateSection,
    addSection,
    removeSection,
    updateQuestion,
    addQuestion,
    removeQuestion,
    duplicateQuestion,
    handleSaveQuestion,
    handleProceedToDistribution,
    setSectionQuestionCount,
    setSectionDist,
    setSectionDuration,          
    handleSaveSectionConfig,
    handleValidateSection,
    handleSaveAndValidateAllSections,
    computeSectionPoolCounts,
    allSectionsReady,
    finalCount, setFinalCount,
    distribution,
    distTotal,
    setDist,
    configSaved,
    savingConfig,
    validating,
    valResult,
    publishing,
    handleSaveConfig,
    handleValidate,
    handlePublish,
    paperDialogOpen, setPaperDialogOpen,
    savingPaper,
    paperName, setPaperName,
    paperDesc, setPaperDesc,
    handleSaveAsPaper,
    papersOpen,
    papers,
    papersLoading,
    loadingPaperId,
    deletingPaperId,
    handleTogglePapers,
    fetchPapers,
    handleDeletePaper,
    handleLoadFromPaper,
    handleRemoveImportedSection, handleHideSection,
    sourcePapers,
    handleUpdateExistingPaper,
  };
};

export default useAssessmentBuilder;