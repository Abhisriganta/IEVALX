// ============================================================================
// overview.mock.js — Mock data for Overview section
// Location: src/mocks/jobseeker/overview.mock.js
// ============================================================================

export const candidatePerformanceMock = {
  candidateId: 'CAND-2026-001',
  overallScore: 84,
  rank: 12,
  totalCandidates: 458,
  percentile: 97,
  metrics: [
    { id: 'profile',    label: 'Profile Completeness',  value: 92, target: 100 },
    { id: 'readiness',  label: 'Interview Readiness',   value: 78, target: 100 },
    { id: 'skillMatch', label: 'Avg. Skill Match',      value: 81, target: 100 },
    { id: 'response',   label: 'Response Rate',         value: 95, target: 100 },
  ],
  recentActivity: [
    { id: 1, action: 'Completed mock interview',                date: '2026-04-28', score: 88 },
    { id: 2, action: 'Updated resume',                          date: '2026-04-25', score: null },
    { id: 3, action: 'Applied to Senior React Developer',       date: '2026-04-22', score: null },
    { id: 4, action: 'Completed skills analysis',               date: '2026-04-20', score: 76 },
    { id: 5, action: 'Document-based interview — Frontend',     date: '2026-04-18', score: 82 },
  ],
  monthlyTrend: [
    { month: 'Nov', score: 65 },
    { month: 'Dec', score: 70 },
    { month: 'Jan', score: 73 },
    { month: 'Feb', score: 76 },
    { month: 'Mar', score: 81 },
    { month: 'Apr', score: 84 },
  ],
};