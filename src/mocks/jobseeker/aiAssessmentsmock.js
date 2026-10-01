// ============================================================================
//  src/mocks/jobseeker/aiAssessments.mock.js
// ----------------------------------------------------------------------------
//  Mock dataset for the Job Seeker "AI Assessments" page (single page, no
//  dropdown). Defines the canonical shape; when the Django endpoint is ready,
//  normalise the backend response to this shape (see aiAssessmentService.js).
//
//  status : 'not_started' | 'in_progress'
//  type   : 'mcq' | 'coding' | 'mixed'
//  level  : 'Beginner' | 'Intermediate' | 'Advanced'
// ============================================================================

export const mockAIAssessments = [
  {
    id: 'aia_2001',
    title: 'React Fundamentals',
    skill: 'React',
    level: 'Intermediate',
    type: 'mcq',
    questionCount: 25,
    durationMinutes: 30,
    aiProctored: true,
    attemptsAllowed: 2,
    attemptsUsed: 0,
    status: 'not_started',
    description:
      'Covers components, hooks, state management and rendering behaviour in React 19. '
      + 'AI-graded with instant scoring.',
    tags: ['Hooks', 'JSX', 'State'],
  },
  {
    id: 'aia_2002',
    title: 'JavaScript Coding Challenge',
    skill: 'JavaScript',
    level: 'Advanced',
    type: 'coding',
    questionCount: 4,
    durationMinutes: 60,
    aiProctored: true,
    attemptsAllowed: 1,
    attemptsUsed: 0,
    status: 'in_progress',
    description:
      'Solve four open-ended problems on closures, async flow and data structures. '
      + 'An AI evaluator scores correctness, readability and edge-case handling.',
    tags: ['Async', 'Algorithms', 'ES2024'],
  },
  {
    id: 'aia_2003',
    title: 'SQL & Data Modelling',
    skill: 'SQL',
    level: 'Beginner',
    type: 'mixed',
    questionCount: 18,
    durationMinutes: 25,
    aiProctored: false,
    attemptsAllowed: 3,
    attemptsUsed: 1,
    status: 'not_started',
    description:
      'Joins, aggregations and basic normalisation. Mix of multiple-choice and '
      + 'short query-writing questions.',
    tags: ['Joins', 'Indexing'],
  },
  {
    id: 'aia_2004',
    title: 'System Design Basics',
    skill: 'System Design',
    level: 'Advanced',
    type: 'mixed',
    questionCount: 12,
    durationMinutes: 45,
    aiProctored: true,
    attemptsAllowed: 1,
    attemptsUsed: 0,
    status: 'not_started',
    description:
      'Scalability, caching and trade-off reasoning. The AI evaluator scores the '
      + 'quality of your written justifications.',
    tags: ['Scalability', 'Caching', 'Trade-offs'],
  },
];

export default mockAIAssessments;