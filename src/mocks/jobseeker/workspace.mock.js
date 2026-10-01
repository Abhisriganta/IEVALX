// ============================================================================
// workspace.mock.js - Mock data for Workspace section
// (Resume Builder + My Projects)
// Location: src/mocks/jobseeker/workspace.mock.js
// ============================================================================

export const careerProfileMock = {
  currentRole: 'Full Stack Developer',
  expertise: 'React, Node.js, AWS',
};

export const recentResumesMock = [
  {
    id: 'res-001',
    filename: 'Software_Engineer_v3.pdf',
    createdAt: '2026-04-20T10:00:00Z',
    atsScore: 92,
  },
  {
    id: 'res-002',
    filename: 'Full_Stack_Dev_Google.pdf',
    createdAt: '2026-04-12T14:30:00Z',
    atsScore: 88,
  },
  {
    id: 'res-003',
    filename: 'General_Tech_Resume.pdf',
    createdAt: '2026-03-25T09:15:00Z',
    atsScore: 75,
  },
];

export const myProjectsMock = [
  {
    id: 'proj-001',
    title: 'iEvalx - Recruitment Platform',
    description: 'Full-stack job recruitment and evaluation platform with three user roles.',
    technologies: ['React 19', 'Vite', 'MUI v9', 'Django', 'MySQL', 'MongoDB', 'AWS S3'],
    status: 'in_progress',
    startDate: '2026-01-15',
    endDate: null,
    role: 'Lead Developer',
    githubUrl: 'https://github.com/akhilreddy/ievalx',
    liveUrl: 'https://ievalx.demo',
    coverColor: '#1E3358',
    highlights: [
      'Designed three-role architecture (jobseeker / employer / company admin)',
      'Built reusable JobFormDialog with 4-tab editor',
      'Integrated S3 file proxying via Django backend endpoints',
    ],
  },
  {
    id: 'proj-002',
    title: 'Solar Lead Manager',
    description: 'Google Sheets + Apps Script CRM for solar energy leads in Telangana region.',
    technologies: ['Google Sheets', 'Apps Script', 'JavaScript'],
    status: 'completed',
    startDate: '2026-02-01',
    endDate: '2026-03-20',
    role: 'Solo Developer',
    githubUrl: '',
    liveUrl: '',
    coverColor: '#395B8C',
    highlights: [
      'Automated lead routing and follow-up reminders',
      'Daily and weekly reporting via custom triggers',
    ],
  },
  {
    id: 'proj-003',
    title: 'Portfolio Website',
    description: 'Personal portfolio with project case studies and blog.',
    technologies: ['React', 'Next.js', 'Tailwind CSS'],
    status: 'completed',
    startDate: '2025-11-10',
    endDate: '2025-12-22',
    role: 'Solo Developer',
    githubUrl: 'https://github.com/akhilreddy/portfolio',
    liveUrl: 'https://akhilreddy.dev',
    coverColor: '#2A4A7F',
    highlights: [
      'Sub-1s page loads with static generation',
      'Case-study format for each major project',
    ],
  },
];
