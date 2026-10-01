// Flat, typo-safe route path registry. Prefer these over hard-coded strings.
export const PATHS = {
  // Public
  HOME:          '/',
  AUTH:          '/auth',
  REDIRECT:      '/redirect',

  // Jobseeker
  JS_OVERVIEW:      '/jobseeker/overview',
  JS_FIND_JOBS:     '/jobseeker/find-jobs',
  JS_FEED:          '/jobseeker/feed',
  JS_NOTIFICATIONS: '/jobseeker/notifications',
  JS_APPLICATIONS:  '/jobseeker/applications',
  JS_SAVED_JOBS:    '/jobseeker/saved-jobs',
  JS_ASSESSMENTS:   '/jobseeker/assessments',
  JS_AI_INTERVIEW:          '/jobseeker/ai-interview',
  JS_AI_REALTIME_SESSION:   '/jobseeker/smart-interviews/ai/session/:configId',
  JS_AI_REALTIME_RESULTS:   '/jobseeker/smart-interviews/ai/results/:sessionId',
  JS_PROFILE:               '/jobseeker/profile',
  JS_CAMPUS_DRIVE:  '/jobseeker/smart-interviews/campus-drive',

  // Employer
  EM_OVERVIEW:      '/employer/overview',
  EM_FEED:          '/employer/feed',
  EM_NOTIFICATIONS: '/employer/notifications',
  CO_NOTIFICATIONS: '/company/notifications',
  EM_POST_JOB:      '/employer/my-jobs',
  EM_MY_JOBS:       '/employer/my-jobs',
  EM_CANDIDATES:    '/employer/candidates',
  EM_SEARCH_TALENT: '/employer/search-talent',
  EM_SCHEDULE:      '/employer/schedule',
  EM_ANALYTICS:     '/employer/analytics',

  // Company
  CO_OVERVIEW:         '/company/overview',
  CO_EMPLOYERS:        '/company/employers',
  CO_JOB_POSTINGS:     '/company/job-postings',
  CO_JOBS_APPROVALS:   '/company/jobs-approvals',
  CO_EDIT_REQUESTS:    '/company/employer-requests/edit',
  CO_REPUBLISH_REQUESTS: '/company/employer-requests/republish',
  CO_CANDIDATE_POOL:   '/company/candidate-pool',
  CO_ANALYTICS:        '/company/analytics',
  CO_ENGAGEMENT:       '/company/engagement',
  CO_SUBSCRIPTION:     '/company/subscription',
  CO_BILLING:          '/company/billing',
  CO_ACTIVITY_LOG:     '/company/activity-log',
  CO_DOC_REUPLOAD:     '/company/documents/re-upload',

  // Support Tickets (all roles)
  JS_SUPPORT: '/jobseeker/support',
  EM_SUPPORT: '/employer/support',
  CO_SUPPORT: '/company/support',

  // ═══════════════════════════════════════════════════════════════════════
  // BUILD: 2026-08-24-iaem-routes-v1  —  IAEM route paths
  // ═══════════════════════════════════════════════════════════════════════

  // Interviewer — activation / consent (fullscreen / public)
  IV_ACTIVATE:                '/interviewer/activate/:token',
  IV_CONSENT:                 '/interviewer/consent',

  // Interviewer — dashboard
  IV_OVERVIEW:                '/interviewer/overview',
  IV_SLOTS:                   '/interviewer/slots',
  IV_SUBMISSION:              '/interviewer/submission/:bookingId',
  IV_PROFILE:                 '/interviewer/profile',
  IV_CALIBRATION:             '/interviewer/calibration',
  IV_CALIBRATION_SESSION:     '/interviewer/calibration/:sessionId',
  IV_CALIBRATION_BASELINE:    '/interviewer/calibration/baseline',
  IV_CASES:                   '/interviewer/cases',
  IV_CASE_DETAIL:             '/interviewer/cases/:caseId',
  IV_CASE_APPEAL:             '/interviewer/cases/:caseId/appeal',
  IV_APPEAL_STATUS:           '/interviewer/appeals/:appealId',
  IV_NOTIFICATIONS:           '/interviewer/notifications',

  // Compliance
  CP_ALERTS:                  '/compliance/alerts',
  CP_CASES:                   '/compliance/cases',
  CP_CASE_DETAIL:             '/compliance/cases/:caseId',
  CP_CO_SIGN:                 '/compliance/co-sign',
  CP_AUDIT_TRAIL:             '/compliance/audit-trail',
  CP_AUDIT_TRAIL_CASE:        '/compliance/audit-trail/:caseId',
  CP_MODEL_CARDS:             '/compliance/model-cards',
  CP_NOTIFICATIONS:           '/compliance/notifications',
  CP_PROFILE:                 '/compliance/profile',

  // Employer — IAEM sections
  EM_INTERVIEWERS:            '/employer/interviewers',
  EM_INTERVIEWERS_APPROVALS:  '/employer/interviewers/approvals',
  EM_INTERVIEWER_DETAIL:      '/employer/interviewers/:interviewerId',
  EM_INTERVIEWER_PROFILE:     '/employer/interviewers/:interviewerId/profile',
  EM_IAEM_SCHEDULING:         '/employer/iaem-scheduling',
  EM_IAEM_SLOT_DASHBOARD:     '/employer/iaem-scheduling/:releaseId/slots',
  EM_CASES:                   '/employer/cases',
  EM_CASE_DETAIL:             '/employer/cases/:caseId',
  EM_APPEALS:                 '/employer/appeals',
  EM_APPEAL_REVIEW:           '/employer/appeals/:appealId',
  EM_AUDIT_NOTES:             '/employer/audit-notes',
  EM_AUDIT_NOTE_DETAIL:       '/employer/audit-notes/:noteId',
  EM_IAEM_CALIBRATION:        '/employer/iaem-calibration',
  EM_IAEM_CALIBRATION_SESSION:'/employer/iaem-calibration/:sessionId',
  EM_COACHING_LIBRARY:        '/employer/coaching-library',
  EM_SIGNAL_GUIDELINES:       '/employer/signal-guidelines',

  IV_SIGNAL_GUIDELINES:       '/interviewer/signal-guidelines',

  CP_SIGNAL_GUIDELINES:       '/compliance/signal-guidelines',

  // Jobseeker — IAEM pooled booking
  JS_IAEM_BOOK:               '/jobseeker/smart-interviews/book/:releaseId',
};