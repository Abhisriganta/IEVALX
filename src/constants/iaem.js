// ═══════════════════════════════════════════════════════════════════════════
// BUILD: 2026-08-24-iaem-constants-v1
// All IAEM enums in one place. No component should hardcode these strings.
// ═══════════════════════════════════════════════════════════════════════════

// ── Signals ─────────────────────────────────────────────────────────────
export const SIGNALS = {
  A1: { code: 'A1', name: 'Score Divergence',            cadence: 'per-interview', minSample: 1, severityRange: ['LOW', 'MEDIUM'] },
  A2: { code: 'A2', name: 'Selection Outcome Quality',   cadence: 'per-interview', minSample: 1, severityRange: ['MEDIUM', 'HIGH'] },
  A3: { code: 'A3', name: 'JD Question Alignment',       cadence: 'per-interview', minSample: 1, severityRange: ['LOW', 'MEDIUM'] },
  A4: { code: 'A4', name: 'Experience-Level Calibration', cadence: 'per-interview', minSample: 1, severityRange: ['LOW', 'MEDIUM'] },
  A5: { code: 'A5', name: 'Differential Difficulty',     cadence: 'per-interview', minSample: 1, severityRange: ['MEDIUM', 'HIGH'] },
  A6: { code: 'A6', name: 'Professional Conduct',        cadence: 'per-interview', minSample: 1, severityRange: ['HIGH', 'CRITICAL'] },
  A7: { code: 'A7', name: 'Misconduct',                  cadence: 'per-interview', minSample: 1, severityRange: ['CRITICAL'] },
  A8: { code: 'A8', name: 'Coverage & Duration',         cadence: 'per-interview', minSample: 1, severityRange: ['LOW', 'MEDIUM'] },
};

// ── Severity ────────────────────────────────────────────────────────────
export const SEVERITY = {
  LOW:      { label: 'Low',      color: '#4CAF50', bg: '#E8F5E9' },
  MEDIUM:   { label: 'Medium',   color: '#FF9800', bg: '#FFF3E0' },
  HIGH:     { label: 'High',     color: '#F44336', bg: '#FFEBEE' },
  CRITICAL: { label: 'Critical', color: '#B71C1C', bg: '#FFCDD2' },
};

// ── SLA deadlines (hours) ───────────────────────────────────────────────
export const SLA_HOURS = {
  CRITICAL: 24,
  HIGH:     72,
  MEDIUM:   168,
  LOW:      336,
};

// ── Case states ─────────────────────────────────────────────────────────
export const CASE_STATES = {
  OPEN:               { label: 'Open',                color: '#1976D2', bg: '#E3F2FD' },
  IN_REVIEW:          { label: 'In Review',           color: '#FF9800', bg: '#FFF3E0' },
  AWAITING_RESPONSE:  { label: 'Awaiting Response',   color: '#9C27B0', bg: '#F3E5F5' },
  PENDING_COSIGN:     { label: 'Pending Co-Sign',     color: '#E65100', bg: '#FFF3E0' },
  RESOLVED:           { label: 'Resolved',            color: '#4CAF50', bg: '#E8F5E9' },
};

// ── Resolution types ────────────────────────────────────────────────────
export const RESOLUTION_TYPES = {
  NO_ACTION:              { label: 'No Action',              requiresRationale: true,  requiresCoSigner: false, notifiesCompliance: false },
  COACHING_CONVERSATION:  { label: 'Coaching Conversation',  requiresRationale: true,  requiresCoSigner: false, notifiesCompliance: false },
  FORMAL_ACTION:          { label: 'Formal Action',          requiresRationale: true,  requiresCoSigner: false, notifiesCompliance: true  },
  IGNORED:                { label: 'Ignored',                requiresRationale: true,  requiresCoSigner: false, notifiesCompliance: false },
  // Note: IGNORED on A7 evidence requires Compliance co-sign — handled in ResolutionForm logic
};

// ── Competencies (v2 — Excel feedback form, weighted) ───────────────────
export const COMPETENCIES = [
  { key: 'domain_technical',   label: 'Domain / Technical Competency',     description: 'Depth and accuracy in the core skill the role needs. Explains own project work with specifics.',                                  weightage: 25 },
  { key: 'problem_solving',    label: 'Problem Solving & Reasoning',       description: 'Structured, logical approach to unfamiliar or troubleshooting problems. States assumptions.',                                     weightage: 20 },
  { key: 'communication',      label: 'Communication',                     description: 'Clarity and structure of explanation. Answers the question actually asked.',                                                       weightage: 15 },
  { key: 'role_relevance',     label: 'Role / Job Relevance',              description: 'Fit of past projects and responsibilities against the job description.',                                                           weightage: 15 },
  { key: 'behavioural',        label: 'Behavioural & Professional Skills', description: 'Ownership, teamwork, handling pressure, response to feedback, professional ethics.',                                               weightage: 15 },
  { key: 'confidence_conduct', label: 'Confidence & Interview Conduct',    description: 'Composure, honesty about gaps, professional conduct. Rate behaviour observed, not accent or manner.',                              weightage: 10 },
];

export const COMPETENCY_LABELS = Object.fromEntries(COMPETENCIES.map(c => [c.key, c.label]));
export const COMPETENCY_WEIGHTAGES = Object.fromEntries(COMPETENCIES.map(c => [c.key, c.weightage]));

// Legacy key → v2 key mapping (display-time compat for old submissions)
export const LEGACY_COMPETENCY_MAP = {
  technical_knowledge:  'domain_technical',
  problem_solving:      'problem_solving',
  communication:        'communication',
  leadership_ownership: 'behavioural',
  cultural_role_fit:    'role_relevance',
  adaptability:         'confidence_conduct',
};

// Valid rating values
export const VALID_RATINGS = ['NA', 1, 2, 3, 4, 5];

export const SCORE_LABELS = {
  NA: 'Not Assessed',
  1: 'Poor',
  2: 'Basic',
  3: 'Good (meets expectation)',
  4: 'Strong (exceeds)',
  5: 'Outstanding',
};

// ── Score bands + compute helpers ───────────────────────────────────────
export const BAND_THRESHOLDS = { A: 85, B: 70, C: 55 };
export const SCORE_BANDS = {
  A: 'Band A - Exceptional',
  B: 'Band B - Strong',
  C: 'Band C - Moderate',
  D: 'Band D - Below Bar',
};

export const computeWeightedScore = (ratings) => {
  let totalScore = 0, applicableWeight = 0;
  COMPETENCIES.forEach(({ key, weightage }) => {
    const r = ratings[key];
    if (r == null || r === 'NA' || r === '' || r === 0) return;
    const v = parseInt(r);
    if (isNaN(v) || v < 1 || v > 5) return;
    totalScore += weightage * v / 5;
    applicableWeight += weightage;
  });
  if (applicableWeight === 0) return null;
  return Math.round((totalScore / applicableWeight) * 1000) / 10; // 1 decimal
};

export const computeScoreBand = (score) => {
  if (score == null) return null;
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  return 'D';
};

export const computeIndicativeRecommendation = (score) => {
  if (score == null) return null;
  if (score >= 85) return 'STRONG_HIRE';
  if (score >= 70) return 'HIRE';
  if (score >= 55) return 'ON_HOLD';
  return 'NOT_SELECTED';
};

export const computeAlignmentCheck = (rec, score) => {
  if (!rec || score == null) return null;
  const recRank = { STRONG_HIRE: 4, HIRE: 3, ON_HOLD: 2, NOT_SELECTED: 1 };
  const bandRank = score >= 85 ? 4 : score >= 70 ? 3 : score >= 55 ? 2 : 1;
  const diff = Math.abs((recRank[rec] || 0) - bandRank);
  if (diff === 0) return 'Aligned with score';
  if (diff === 1) return 'Minor variance - explain in Section 5';
  return 'MISMATCH - written justification required';
};

// ── Recommendations (v2 — four-tier) ────────────────────────────────────
export const RECOMMENDATIONS = [
  { value: 'STRONG_HIRE',  label: 'Strong Hire' },
  { value: 'HIRE',         label: 'Hire' },
  { value: 'ON_HOLD',      label: 'On Hold' },
  { value: 'NOT_SELECTED', label: 'Not Selected' },
];

// ── Question log metric options ─────────────────────────────────────────
export const QUESTION_METRICS = [
  { value: 'domain_technical',   label: 'Domain / Technical' },
  { value: 'problem_solving',    label: 'Problem Solving' },
  { value: 'communication',      label: 'Communication' },
  { value: 'role_relevance',     label: 'Role Relevance' },
  { value: 'behavioural',        label: 'Behavioural' },
  { value: 'confidence_conduct', label: 'Confidence & Conduct' },
];

// ── Self-reflection questions (v1 — kept for backward compat) ───────────
export const SELF_REFLECTION_QUESTIONS = [
  { key: 'q1', question: 'What did the candidate demonstrate most clearly in this interview?',                         minChars: 100, required: true  },
  { key: 'q2', question: 'What is your primary concern about this candidate, if any?',                                 minChars: 0,   required: false },
  { key: 'q3', question: 'If a peer challenged your recommendation, what specific evidence from the interview would you point them to?', minChars: 100, required: true  },
];

// ── Interview levels ────────────────────────────────────────────────────
export const INTERVIEW_LEVELS = [
  { value: 'L0', label: 'L0 — Screening' },
  { value: 'L1', label: 'L1 — Core Technical' },
  { value: 'L2', label: 'L2 — Deep Technical' },
  { value: 'L3', label: 'L3 — Architecture / System Design' },
  { value: 'PM', label: 'PM — Product Management' },
  { value: 'HR', label: 'HR — Culture & Fit' },
];

// ── Seniority ───────────────────────────────────────────────────────────
export const SENIORITY_OPTIONS = [
  { value: 'junior',    label: 'Junior' },
  { value: 'mid',       label: 'Mid' },
  { value: 'senior',    label: 'Senior' },
  { value: 'lead',      label: 'Lead' },
  { value: 'principal', label: 'Principal' },
  { value: 'director',  label: 'Director' },
];

// ── Interviewer lifecycle states ────────────────────────────────────────
export const LIFECYCLE_STATES = {
  PENDING_APPROVAL:         { label: 'Pending Approval',          color: '#FF9800', bg: '#FFF3E0' },
  AWAITING_SECOND_APPROVAL: { label: 'Awaiting Second Approval',  color: '#2196F3', bg: '#E3F2FD' },
  APPROVED:                 { label: 'Approved',                   color: '#00BCD4', bg: '#E0F7FA' },
  ACTIVE:                   { label: 'Active',                     color: '#4CAF50', bg: '#E8F5E9' },
  INACTIVE:                 { label: 'Inactive',                   color: '#9E9E9E', bg: '#F5F5F5' },
  OFFBOARDED:               { label: 'Offboarded',                 color: '#795548', bg: '#EFEBE9' },
  DELETED:                  { label: 'Deleted',                    color: '#F44336', bg: '#FFEBEE' },
};

// ── Rejection reasons (Appendix §10) ────────────────────────────────────
export const REJECTION_REASONS = [
  { value: 'SKILLS_MISMATCH',    label: 'Skills do not match current needs' },
  { value: 'SENIORITY_MISMATCH', label: 'Seniority level mismatch' },
  { value: 'INCOMPLETE_INFO',    label: 'Incomplete or inaccurate information' },
  { value: 'DUPLICATE',          label: 'Duplicate registration' },
  { value: 'OTHER',              label: 'Other' },
];

// ── Appeal form enums (Appendix §9) ─────────────────────────────────────
export const APPEAL_DISAGREE_OPTIONS = [
  { value: 'EVIDENCE',       label: 'The evidence itself' },
  { value: 'CLASSIFICATION', label: 'The AI classification' },
  { value: 'SEVERITY',       label: 'The severity assessment' },
  { value: 'RESOLUTION',     label: 'The resolution outcome' },
  { value: 'OTHER',          label: 'Other' },
];

export const APPEAL_DESIRED_OUTCOMES = [
  { value: 'OVERTURN',        label: 'Overturn entirely (No Action)' },
  { value: 'REDUCE_SEVERITY', label: 'Reduce severity' },
  { value: 'CHANGE_TYPE',     label: 'Change resolution type' },
];

export const APPEAL_OUTCOMES = {
  UPHELD:     { label: 'Upheld',     color: '#F44336', description: 'Original resolution stands as-is' },
  MODIFIED:   { label: 'Modified',   color: '#FF9800', description: 'Resolution changed' },
  OVERTURNED: { label: 'Overturned', color: '#4CAF50', description: 'Original resolution rescinded' },
};

// ── Coaching library (Appendix §6) ──────────────────────────────────────
export const COACHING_CATEGORIES = [
  { value: 'QUESTION_FRAMING',           label: 'Question Framing' },
  { value: 'BIAS_AWARENESS',             label: 'Bias Awareness' },
  { value: 'JD_SCOPE_ALIGNMENT',         label: 'JD-Scope Alignment' },
  { value: 'LEVEL_APPROPRIATE',          label: 'Level-Appropriate Questioning' },
  { value: 'PROFESSIONAL_CONDUCT',       label: 'Professional Conduct' },
  { value: 'INTERVIEW_STRUCTURE',        label: 'Interview Structure' },
];

export const COACHING_FORMATS = [
  { value: 'ARTICLE',            label: 'Article' },
  { value: 'VIDEO',              label: 'Video' },
  { value: 'DOCUMENT',           label: 'Document' },
  { value: 'INTERACTIVE_MODULE', label: 'Interactive Module' },
];

// ── Validation limits ───────────────────────────────────────────────────
export const VALIDATION = {
  RATIONALE_MIN:       200,   // v1 backward compat
  REFLECTION_Q1_MIN:   100,   // v1 backward compat
  REFLECTION_Q3_MIN:   100,   // v1 backward compat
  APPEAL_MIN:          200,
  EVIDENCE_MIN:          100,   // v2: per-competency evidence
  OVERALL_REMARKS_MIN:   100,   // v2: overall remarks / justification
  KEY_STRENGTHS_MIN:     100,   // v2: key strengths observed
  AREAS_OF_CONCERN_MIN:  100,   // v2: areas of concern / development needs
  ALIGNMENT_JUSTIFICATION_MIN: 100, // v2: justification when recommendation mismatches score band
  QUESTION_LOG_MIN:      3,     // v2: minimum questions logged
};

// ── Time limits ─────────────────────────────────────────────────────────
export const APPEAL_WINDOW_DAYS = 21;
export const RETENTION_DAYS     = 180;

// ── Model card fields (Appendix §5) ─────────────────────────────────────
export const MODEL_CARD_FIELDS = [
  'component_name', 'purpose', 'input', 'output',
  'confidence_threshold', 'precision_target', 'recall_target',
  'known_limitations', 'bias_evaluation', 'model_version',
  'prompt_hash', 'last_updated', 'next_review',
];

// ── Audit note sections (Appendix §4) ───────────────────────────────────
export const AUDIT_NOTE_SECTIONS = [
  'score_comparison',
  'question_analysis',
  'self_reflection_summary',
  'signals',
  'evidence_pointers',
];

// ── Rolling profile time windows ────────────────────────────────────────
export const PROFILE_WINDOWS = [30, 60, 90];

// ── Question scope categories (A3/A4) ───────────────────────────────────
export const QUESTION_SCOPE = {
  IN_SCOPE:     { label: 'In-Scope',     color: '#4CAF50' },
  ADJACENT:     { label: 'Adjacent',      color: '#FF9800' },
  OUT_OF_SCOPE: { label: 'Out-of-Scope',  color: '#F44336' },
};

export const DIFFICULTY_LEVELS = [
  { value: 'L0', label: 'L0 — Basic' },
  { value: 'L1', label: 'L1 — Intermediate' },
  { value: 'L2', label: 'L2 — Advanced' },
  { value: 'L3', label: 'L3 — Senior / Expert' },
];
