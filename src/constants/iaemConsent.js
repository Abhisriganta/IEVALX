

export const CONSENT_VERSION = 'v1.0';

export const CONSENT_CLAUSES = [
  {
    no: 1,
    title: 'Interview Recording & Transcription',
    body: 'All interviews you conduct on iEvalX are recorded (audio and screen) and transcribed with speaker separation. This recording is part of iEvalX\'s standard interview infrastructure and is used for candidate evaluation, quality assurance, and — when audit is enabled — interviewer evaluation.',
  },
  {
    no: 2,
    title: 'AI-Assisted Candidate Scoring',
    body: 'iEvalX generates an AI-based candidate score (CIR pipeline) for every interview. This score is computed independently of your evaluation. You will be asked to submit your own score before the AI score is revealed to you.',
  },
  {
    no: 3,
    title: 'Interviewer Score Submission',
    body: 'After each audited interview, you will be asked to submit a structured evaluation including per-competency scores, an overall score, a hiring recommendation, a written rationale, and answers to three self-reflection questions. Your submission is final once submitted.',
  },
  {
    no: 4,
    title: 'Score Comparison & Divergence Analysis',
    body: 'Your submitted scores may be compared against the AI-generated scores to identify patterns of divergence. This comparison is adjusted for your personal calibration baseline and any bar-raiser designation. Divergence alone does not trigger adverse action — it surfaces patterns for HR review.',
  },
  {
    no: 5,
    title: 'Question Quality Analysis',
    body: 'The questions you ask during interviews may be analyzed to assess whether they align with the job description scope and whether their difficulty level is appropriate for the interview level. This analysis is performed by AI classifiers after the interview ends, not during it.',
  },
  {
    no: 6,
    title: 'Professional Conduct Review',
    body: 'Interview transcripts may be analyzed for professional conduct. The system looks for patterns of dismissiveness, intimidation, or personal attacks. Single instances of moderate concern are noted; findings are only surfaced to HR when they meet defined confidence thresholds.',
  },
  {
    no: 7,
    title: 'Protected-Group Misconduct Detection',
    body: 'Transcripts may be analyzed for language that constitutes harassment, discrimination, or quid-pro-quo behavior. This classifier operates at the highest confidence threshold in the system (≥0.90). Any finding in this category is automatically shared with the Compliance Officer.',
  },
  {
    no: 8,
    title: 'HR Review & Case Resolution',
    body: 'If any audit signal meets its threshold, a case is created for HR review. HR examines the evidence and records a resolution. Possible outcomes include No Action, Coaching Conversation, Manager Discussion, or Formal Action. Every resolution requires written rationale. No automated adverse actions are taken — a human HR reviewer must examine and decide.',
  },
  {
    no: 9,
    title: 'Your Right to View Evidence',
    body: 'If a case is resolved against you (any outcome beyond No Action), you have the right to view the specific evidence that produced the finding, including the relevant transcript segments, audio, and the AI classification with its confidence score and alternative explanation.',
  },
  {
    no: 10,
    title: 'Your Right to Appeal',
    body: 'You have the right to file a structured written appeal within 21 calendar days of being notified of a case resolution. Your appeal will be reviewed by a different HR person than the one who made the original decision. Filing an appeal will never be used against you in any evaluation, assignment, or employment decision.',
  },
  {
    no: 11,
    title: 'AI Transparency — Model Cards',
    body: 'Every AI component used in your evaluation has a published model card documenting its purpose, precision and recall targets, confidence thresholds, and known limitations. You have the right to view the model card for any AI component that produced a finding in your case.',
  },
  {
    no: 12,
    title: 'Data Retention & Deletion',
    body: 'Your interview evaluation data (recordings, transcripts, AI outputs, audit notes) is retained for 180 days and then automatically deleted unless a legal hold is in place. After deletion, only skeleton metadata remains (date, level, recommendation, signals fired — no evidence detail). You may request information about what data is held about you at any time.',
  },
];
