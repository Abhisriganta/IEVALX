// ============================================================================
// smartInterviews.mock.js — Mock data for Smart Interviews section
// Location: src/mocks/jobseeker/smartInterviews.mock.js
// ============================================================================

export const documentBasedSessionsMock = [
  {
    id: 'doc-001',
    title: 'Resume-driven Interview',
    documentName: 'Akhil_Reddy_Resume.pdf',
    uploadedOn: '2026-04-20',
    status: 'completed',
    questionsGenerated: 12,
    score: 84,
    summary: 'Questions tailored to your React, Django, and AWS experience.',
  },
  {
    id: 'doc-002',
    title: 'Job Description Match',
    documentName: 'Senior_FullStack_JD.pdf',
    uploadedOn: '2026-04-18',
    status: 'in_progress',
    questionsGenerated: 10,
    score: null,
    summary: 'Targeted JD analysis: skills gap + matching experience.',
  },
  {
    id: 'doc-003',
    title: 'Project Portfolio Walk-through',
    documentName: 'Portfolio_Akhil.pdf',
    uploadedOn: '2026-04-10',
    status: 'completed',
    questionsGenerated: 8,
    score: 91,
    summary: 'Deep-dive into iEvalx, design choices, and scaling decisions.',
  },
];

export const liveInterviewSlotsMock = [
  {
    id: 'live-001',
    interviewerName: 'Priya Sharma',
    interviewerTitle: 'Senior Engineering Manager',
    expertise: 'React, System Design',
    rating: 4.9,
    nextSlot: '2026-05-02T14:00:00Z',
    duration: 45,
    price: 0,
    avatarBg: '#1E3358',
  },
  {
    id: 'live-002',
    interviewerName: 'Rajesh Kumar',
    interviewerTitle: 'Principal Backend Engineer',
    expertise: 'Django, PostgreSQL, AWS',
    rating: 4.8,
    nextSlot: '2026-05-03T10:30:00Z',
    duration: 60,
    price: 0,
    avatarBg: '#2A4A7F',
  },
  {
    id: 'live-003',
    interviewerName: 'Sneha Patel',
    interviewerTitle: 'Tech Lead — Frontend',
    expertise: 'React, TypeScript, MUI',
    rating: 5.0,
    nextSlot: '2026-05-05T16:00:00Z',
    duration: 45,
    price: 0,
    avatarBg: '#395B8C',
  },
];

export const liveInterviewHistoryMock = [
  {
    id: 'lh-001',
    interviewerName: 'Vikram Iyer',
    role: 'React Developer',
    completedOn: '2026-04-15',
    duration: 50,
    score: 86,
    feedback: 'Excellent communication. Sharpen your knowledge of React 18 concurrent features.',
  },
  {
    id: 'lh-002',
    interviewerName: 'Anjali Desai',
    role: 'Full Stack Developer',
    completedOn: '2026-04-02',
    duration: 60,
    score: 78,
    feedback: 'Good problem-solving. Practice describing trade-offs more clearly.',
  },
];