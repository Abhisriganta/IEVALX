// ============================================================================
//  src/mocks/jobseeker/aiAssessmentTestMock.js
// ----------------------------------------------------------------------------
//  Mock test paper + questions for the AIAssessmentTest page.
//  Covers MCQ, true_false, multi_select, short_answer so all AnswerInput
//  variants are exercisable in mock mode.
// ============================================================================

export const mockTestPaper = {
  id:            1,
  assignment_id: 'aia_2002',
  question_ids:  [101, 102, 103, 104],
  generated_at:  new Date().toISOString(),
};

// Full question objects (MySQL metadata + MongoDB content merged)
// Used by mock getTestPaper (metadata shape) and getQuestion (full shape).
export const mockQuestions = [
  {
    id: 101,
    question_type: 'mcq',
    difficulty:    'medium',
    marks:          2.5,
    display_order:  1,
    mongo_id:      'mongo_101',
    content: {
      _id:            'mongo_101',
      question_type:  'mcq',
      stem:           'What does `typeof null` return in JavaScript?',
      options: [
        { key: 'A', text: 'null' },
        { key: 'B', text: 'object' },
        { key: 'C', text: 'undefined' },
        { key: 'D', text: 'number' },
      ],
      correct_answer: 'B',
      explanation:
        'A long-standing bug in JavaScript: null was encoded as 000 in the original type-tag system, ' +
        'which matched the object tag.',
    },
  },
  {
    id: 102,
    question_type: 'true_false',
    difficulty:    'easy',
    marks:          1,
    display_order:  2,
    mongo_id:      'mongo_102',
    content: {
      _id:            'mongo_102',
      question_type:  'true_false',
      stem:           '`const` variables in JavaScript cannot be reassigned, but the properties of a `const` object can still be mutated.',
      options: [
        { key: 'true',  text: 'True' },
        { key: 'false', text: 'False' },
      ],
      correct_answer: 'true',
    },
  },
  {
    id: 103,
    question_type: 'multi_select',
    difficulty:    'hard',
    marks:          3,
    display_order:  3,
    mongo_id:      'mongo_103',
    content: {
      _id:            'mongo_103',
      question_type:  'multi_select',
      stem:           'Which of the following are valid static methods of the `Promise` object? (Select all that apply)',
      options: [
        { key: 'A', text: 'Promise.all()' },
        { key: 'B', text: 'Promise.collect()' },
        { key: 'C', text: 'Promise.race()' },
        { key: 'D', text: 'Promise.settle()' },
        { key: 'E', text: 'Promise.allSettled()' },
      ],
      correct_answer: ['A', 'C', 'E'],
    },
  },
  {
    id: 104,
    question_type: 'short_answer',
    difficulty:    'medium',
    marks:          4,
    display_order:  4,
    mongo_id:      'mongo_104',
    content: {
      _id:           'mongo_104',
      question_type: 'short_answer',
      stem:
        'Explain the difference between `==` and `===` in JavaScript. ' +
        'Give one example where they produce different results.',
      explanation: 'Subjective — evaluated by AI reviewer.',
    },
  },
];

export default mockQuestions;