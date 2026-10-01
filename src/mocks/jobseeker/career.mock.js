// ============================================================================
// career.mock.js — Mock data for Career section
// Location: src/mocks/jobseeker/career.mock.js
// ============================================================================

export const skillsAnalysisMock = {
  candidateId: 'CAND-2026-001',
  lastAnalyzed: '2026-04-25',
  overallStrength: 78,
  topRoleMatch: {
    role: 'Senior Full Stack Developer',
    matchPercentage: 87,
  },
  skills: [
    { id: 1, name: 'React',     proficiency: 90, demand: 'High',     category: 'Frontend',  recommended: false },
    { id: 2, name: 'Django',    proficiency: 82, demand: 'High',     category: 'Backend',   recommended: false },
    { id: 3, name: 'JavaScript',proficiency: 88, demand: 'High',     category: 'Language',  recommended: false },
    { id: 4, name: 'Python',    proficiency: 80, demand: 'High',     category: 'Language',  recommended: false },
    { id: 5, name: 'MUI',       proficiency: 85, demand: 'Medium',   category: 'Frontend',  recommended: false },
    { id: 6, name: 'AWS',       proficiency: 60, demand: 'High',     category: 'Cloud',     recommended: true  },
    { id: 7, name: 'Docker',    proficiency: 55, demand: 'High',     category: 'DevOps',    recommended: true  },
    { id: 8, name: 'TypeScript',proficiency: 50, demand: 'Very High',category: 'Language',  recommended: true  },
    { id: 9, name: 'GraphQL',   proficiency: 35, demand: 'Medium',   category: 'API',       recommended: true  },
  ],
  gaps: [
    { id: 1, skill: 'TypeScript',   importance: 'Critical', estimatedHours: 40 },
    { id: 2, skill: 'AWS Lambda',   importance: 'High',     estimatedHours: 25 },
    { id: 3, skill: 'CI/CD',        importance: 'High',     estimatedHours: 20 },
    { id: 4, skill: 'GraphQL',      importance: 'Medium',   estimatedHours: 30 },
  ],
};