// ============================================================================
// aipracticeinterview.mock.js — Mock data for the AI Practice Interview page
// Location: src/mocks/jobseeker/aipracticeinterview.mock.js
// ----------------------------------------------------------------------------
// Only used when aiPracticeInterviewService.USE_MOCK === true. When wired to
// the real Django backend, this file is inert. The config here still ships
// (it's the source of truth for tips / file limits / target counts even in
// production).
// ============================================================================

/* ── Static page config (used by both mock and real modes) ─────────────── */
export const practiceInterviewConfigMock = {
  targetQuestions: 8,
  maxFileSizeMB: 5,
  supportedFileTypes: ['.pdf', '.docx', '.txt'],

  /* Coverage mode is picked server-side but the toggle can appear in the UI. */
  supportedModes: ['smart', 'exhaustive'],

  /* Shown in the empty-state and setup screens. */
  defaultSuggestedSkills: ['React', 'Python', 'SQL', 'AWS', 'Docker', 'Git'],

  /* Tips displayed on the side panel while the interview runs. */
  tips: [
    'Speak clearly and pace yourself — the AI is listening, not judging your speed.',
    'Anchor every answer to a concrete example from your resume.',
    'When a question targets a skill, name the technology and one tradeoff.',
    'It is fine to say "I would look that up" — hiring managers respect honesty.',
    'End each answer with what you learned, not what you did.',
  ],

  /* Copy shown around the resume upload dropzone. */
  copy: {
    heroTitle:  'AI Practice Interview',
    heroLead:   'Speak your answers. Get a scored report per skill on your resume.',
    uploadTitle:'Upload your resume to begin',
    uploadHint: 'PDF · DOCX · TXT · up to 5 MB. The AI reads it and tailors every question to your background.',
    parseError: 'Could not read that file — try a PDF or DOCX.',
    micError:   'Please allow microphone access to continue.',
    startCta:   'Start voice interview',
    replayCta:  'Practice again',
  },
};

/* ── Skill-keyword → tailored question pool (mock service only) ────────── */
export const skillQuestionBank = {
  react: [
    'I noticed React on your resume. Walk me through how you decide between lifting state up versus reaching for a context or a store.',
    'Tell me about a time you tracked down a subtle re-render performance issue in a React app. How did you approach it?',
  ],
  javascript: [
    'Describe a JavaScript debugging story where the root cause surprised you. What did you learn from it?',
  ],
  typescript: [
    'How has TypeScript changed the way you design component APIs, and where do you still find it gets in the way?',
  ],
  node: [
    'Talk me through a Node.js service you built. How did you think about error handling and observability?',
  ],
  python: [
    "Describe a Python project you're proud of. What was the hardest engineering trade-off you had to make?",
  ],
  django: [
    'In a Django project, how do you decide between the ORM and raw SQL? Walk me through a case where you chose raw.',
  ],
  sql: [
    'Tell me about a query you had to optimise. How did you diagnose the slowness and what changed?',
  ],
  mysql: [
    'Talk about a schema you designed in MySQL. What would you revisit if you started that project again today?',
  ],
  mongodb: [
    "When would you reach for MongoDB over a relational store? Ground your answer in a project you've built.",
  ],
  aws: [
    'Describe an AWS deployment you owned end-to-end. How did you approach cost, security, and reliability?',
  ],
  docker: [
    'How do you structure a Dockerfile for a production service? Walk me through the trade-offs you consider.',
  ],
  git: [
    "Describe a difficult merge or rebase you handled. What did you learn about your team's workflow from it?",
  ],
  html: [
    "Walk me through your approach to accessible, semantic HTML in a real project you've shipped.",
  ],
  css: [
    'Tell me about a layout that was harder than it looked. How did you land the final CSS approach?',
  ],
  ui: [
    "Describe a UI you're proud of. What informed the decisions users never saw?",
  ],
  ux: [
    'Walk me through a moment when user feedback made you throw work away. How did you handle it?',
  ],
  data: [
    'Tell me about a data-heavy problem you solved. How did you turn raw data into something useful?',
  ],
  machine: [
    'Describe a machine learning project — end to end — including how you evaluated whether it was actually working.',
  ],
  ai: [
    'Where have you used AI in a real project, and what surprised you about integrating it into a product?',
  ],
  cloud: [
    'Describe your approach to designing a cloud-native service. What are the first three decisions you make?',
  ],
  api: [
    'Walk me through an API you designed. How did you think about versioning and backwards compatibility?',
  ],
  testing: [
    'Talk about your testing philosophy. Where do you invest, and where do you deliberately pull back?',
  ],
};

/* ── Behavioural fillers (mock only) ───────────────────────────────────── */
export const behavioralQuestions = [
  "Let's begin. Tell me about yourself and walk me through the highlights of your resume.",
  'Describe a project you led end-to-end. What decisions turned out to matter most?',
  'Tell me about a time you disagreed with a teammate on a technical direction. How did you resolve it?',
  'Walk me through a recent failure — what happened and how did you handle it?',
  'What is a technology you got wrong at first, and what changed your mind?',
];

/* ── Closing (mock only) ───────────────────────────────────────────────── */
export const closingQuestions = [
  'To wrap up: what is motivating your next move, and what would make the next role a great fit?',
];