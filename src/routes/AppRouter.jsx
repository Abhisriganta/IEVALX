import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useSearchParams } from 'react-router-dom';

import PrivateRoute       from '@/routes/PrivateRoute';
import DashboardLayout    from '@/components/layout/DashboardLayout';
import RouteFallback      from '@/components/common/RouteFallback';
import { useAuth }        from '@/hooks/useAuth';
import { ROLES, ROLE_HOME } from '@/constants';



// Eager — cold-start surfaces
import LandingPage   from '@/pages/LandingPage';
import NotFoundPage  from '@/pages/NotFoundPage';

const AuthPage = lazy(() => import('@/pages/auth/AuthPage'));

/* ── Public pages ─────────────────────────────────────────────────────── */
const BrowseJobsPage      = lazy(() => import('@/pages/public/BrowseJobsPage'));
const JobDetailPage       = lazy(() => import('@/pages/public/JobDetailPage'));
const PricingPage         = lazy(() => import('@/pages/public/PricingPage'));
const WhatWeOfferPage     = lazy(() => import('@/pages/public/WhatWeOfferPage'));
const OurStoryPage        = lazy(() => import('@/pages/public/OurStoryPage'));
const PrivacyPolicyPage   = lazy(() => import('@/pages/public/PrivacyPolicyPage'));
const TermsPage           = lazy(() => import('@/pages/public/TermsPage'));
const CategoriesPage      = lazy(() => import('@/pages/public/CategoriesPage'));
const BlogsPage           = lazy(() => import('@/pages/public/BlogsPage'));
const BlogPostPage        = lazy(() => import('@/pages/public/BlogPostPage'));
const SupportPage         = lazy(() => import('@/pages/public/SupportPage'));

/* ── Jobseeker ────────────────────────────────────────────────────────── */
const JobseekerDashboard       = lazy(() => import('@/components/jobseeker/Overview/JobseekerDashboard'));
const CandidatePerformance     = lazy(() => import('@/components/jobseeker/Career/CandidatePerformance'));
const FindJobs                 = lazy(() => import('@/components/jobseeker/FindJobs/FindJobs'));
const JobDetails               = lazy(() => import('@/components/jobseeker/FindJobs/JobDetails'));
const Applications             = lazy(() => import('@/components/jobseeker/Applications/Applications'));
const SavedJobs                = lazy(() => import('@/components/jobseeker/SavedJobs/SavedJobs'));
const JobseekerFeed            = lazy(() => import('@/components/jobseeker/Feed/JobseekerFeed'));
const JobseekerNotifications   = lazy(() => import('@/components/jobseeker/Notifications/JobseekerNotifications'));
const AIAssessments            = lazy(() => import('@/components/jobseeker/AIAssessments/AIAssessments'));
const AIAssessmentTest         = lazy(() => import('@/components/jobseeker/AIAssessments/AIAssessmentTest'));
const AIInterview              = lazy(() => import('@/components/jobseeker/SmartInterviews/AIInterview'));
const DocumentBasedInterview   = lazy(() => import('@/components/jobseeker/SmartInterviews/DocumentBasedInterview'));
const DocumentRealtimeSession  = lazy(() => import('@/components/jobseeker/SmartInterviews/DocumentRealtimeSession'));
const DocumentInterviewResults = lazy(() => import('@/components/jobseeker/SmartInterviews/DocumentInterviewResults'));
const LiveInterview            = lazy(() => import('@/components/jobseeker/SmartInterviews/LiveInterview'));
const AIRealtimeSession        = lazy(() => import('@/components/jobseeker/SmartInterviews/AIRealtimeSession'));
const AIRealtimeResults        = lazy(() => import('@/components/jobseeker/SmartInterviews/AIRealtimeResults'));
const CampusDrive              = lazy(() => import('@/components/jobseeker/SmartInterviews/CampusDrive'));
const LiveRoom                 = lazy(() => import('@/components/jobseeker/SmartInterviews/LiveRoom'));
const WaitingRoom              = lazy(() => import('@/components/jobseeker/SmartInterviews/WaitingRoom'));
const AIPracticeInterview      = lazy(() => import('@/components/jobseeker/Career/AIPracticeInterview'));
const WorkspaceHome            = lazy(() => import('@/components/jobseeker/Workspace/WorkspaceHome'));
const BuilderPage              = lazy(() => import('@/components/jobseeker/Workspace/BuilderPage'));
const Billing                  = lazy(() => import('@/components/jobseeker/Billing/Billing'));
const Settings                 = lazy(() => import('@/components/jobseeker/Settings/Settings'));
const Profile                  = lazy(() => import('@/components/jobseeker/Profile/Profile'));

/* ── Employer ─────────────────────────────────────────────────────────── */
const EmployerDashboard     = lazy(() => import('@/components/employer/Overview/EmployerDashboard'));
const EmployerFeed          = lazy(() => import('@/components/employer/Feed/EmployerFeed'));
const EmployerNotifications = lazy(() => import('@/components/employer/Notifications/EmployerNotifications'));
const MyJobs                = lazy(() => import('@/components/employer/MyJobs/MyJobs'));
const JobApplicants         = lazy(() => import('@/components/employer/MyJobs/JobApplicants'));
const Candidates            = lazy(() => import('@/components/employer/Candidates/Candidates'));
const InterviewRounds       = lazy(() => import('@/components/employer/InterviewRounds/InterviewRounds'));
const OnlineInterview       = lazy(() => import('@/components/employer/InterviewRounds/OnlineInterview'));
const RankedResults         = lazy(() => import('@/components/employer/RankedResults/RankedResults'));
const PendingCandidates     = lazy(() => import('@/components/employer/PendingCandidates/PendingCandidates'));
const FinalHire             = lazy(() => import('@/components/employer/FinalHire/FinalHire'));
const Analytics             = lazy(() => import('@/components/employer/Analytics/Analytics'));
const EmployerProfile       = lazy(() => import('@/components/employer/Profile/Profile'));
const AssessmentBuilder     = lazy(() => import('@/components/employer/Assessments/AssessmentBuilder'));
const AIAssessmentBuilder   = lazy(() => import('@/components/employer/Assessments/AIAssessmentBuilder'));
const QuestionBank          = lazy(() => import('@/components/employer/Assessments/QuestionBank'));

/* ── Company Admin ────────────────────────────────────────────────────── */
const CompanyDashboard        = lazy(() => import('@/components/company/Overview/CompanyDashboard'));
const CompanyNotifications    = lazy(() => import('@/components/company/Notifications/CompanyNotifications'));
const JobPostings             = lazy(() => import('@/components/company/JobPostings/JobPostings'));
const JobsApprovals           = lazy(() => import('@/components/company/JobsApprovals/JobsApprovals'));
const CompanyAnalytics        = lazy(() => import('@/components/company/CompanyAnalytics/Analytics'));
const CompanyEngagement       = lazy(() => import('@/components/company/CompanyEngagement/CompanyEngagement'));
const BillingAndSubscription  = lazy(() => import('@/components/company/BillingAndSubscription/BillingAndSubscription'));
const Employers               = lazy(() => import('@/components/company/Employers/EmployersList'));
const ComplianceOfficers      = lazy(() => import('@/components/company/ComplianceOfficers/ComplianceOfficersList'));
const CompanyProfile          = lazy(() => import('@/components/company/CompanyProfile/CompanyProfile'));
const OwnershipManagement     = lazy(() => import('@/components/company/Ownership/OwnershipManagement'));
const DocumentReupload        = lazy(() => import('@/components/company/DocumentReupload/DocumentReupload'));

/* EmployerRequestsPage exports two NAMED components, not a default — React.lazy
   requires a module whose default export is the component, so remap here. */
const EditRequestsPage = lazy(() =>
  import('@/components/company/EmployerRequests/EmployerRequestsPage')
    .then((m) => ({ default: m.EditRequestsPage })),
);
const RepublishRequestsPage = lazy(() =>
  import('@/components/company/EmployerRequests/EmployerRequestsPage')
    .then((m) => ({ default: m.RepublishRequestsPage })),
);

/* ── Shared ───────────────────────────────────────────────────────────── */
const SupportTickets = lazy(() => import('@/components/common/SupportTickets'));

/* ═══════════════════════════════════════════════════════════════════════════
   BUILD: 2026-08-24-iaem-router-v1 — IAEM lazy imports
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── Interviewer ──────────────────────────────────────────────────────── */
const ConsentAcknowledgment      = lazy(() => import('@/components/interviewer/Consent/ConsentAcknowledgment'));
const ActivateAccount            = lazy(() => import('@/components/interviewer/Activation/ActivateAccount')); // BUILD: 2026-08-24-iaem-gaps-v1
const InterviewerDashboard       = lazy(() => import('@/components/interviewer/Overview/InterviewerDashboard'));
const MySlots                    = lazy(() => import('@/components/interviewer/Slots/MySlots'));
const PostInterviewSubmission    = lazy(() => import('@/components/interviewer/PostInterview/PostInterviewSubmission'));
const InterviewerProfilePage     = lazy(() => import('@/components/interviewer/Profile/InterviewerProfile'));
const MyCalibration              = lazy(() => import('@/components/interviewer/Calibration/MyCalibration'));
const CalibrationSessionRunner   = lazy(() => import('@/components/interviewer/Calibration/CalibrationSessionRunner'));
const MyBaseline                 = lazy(() => import('@/components/interviewer/Calibration/MyBaseline'));
const MyCases                    = lazy(() => import('@/components/interviewer/Cases/MyCases'));
const MyCaseDetail               = lazy(() => import('@/components/interviewer/Cases/MyCaseDetail'));
const AppealForm                 = lazy(() => import('@/components/interviewer/Cases/AppealForm'));
const AppealStatus               = lazy(() => import('@/components/interviewer/Cases/AppealStatus'));
const AppealStatusList           = lazy(() => import('@/components/interviewer/Cases/AppealStatusList'));
const InterviewerNotifications   = lazy(() => import('@/components/interviewer/Notifications/InterviewerNotifications'));
const CompletedInterviews        = lazy(() => import('@/components/interviewer/CompletedInterviews/CompletedInterviews'));

/* ── Compliance ───────────────────────────────────────────────────────── */
const SignalGuidelines              = lazy(() => import('@/components/common/SignalGuidelines'));
const ComplianceAlerts           = lazy(() => import('@/components/compliance/Alerts/ComplianceAlerts'));
const ComplianceCaseList         = lazy(() => import('@/components/compliance/CaseOversight/ComplianceCaseList'));
const ComplianceCaseDetail       = lazy(() => import('@/components/compliance/CaseOversight/ComplianceCaseDetail'));
const CoSignPanel                = lazy(() => import('@/components/compliance/CaseOversight/CoSignPanel'));
const ChangeLogViewer            = lazy(() => import('@/components/compliance/AuditTrail/ChangeLogViewer'));
const ModelCardBrowser           = lazy(() => import('@/components/compliance/ModelCards/ModelCardBrowser'));
const ComplianceNotifications    = lazy(() => import('@/components/compliance/Notifications/ComplianceNotifications'));
const ComplianceProfile          = lazy(() => import('@/components/compliance/Profile/ComplianceProfile'));

/* ── Employer IAEM ────────────────────────────────────────────────────── */
const InterviewerList            = lazy(() => import('@/components/employer/IAEM/InterviewerManagement/InterviewerList'));
const ApprovalQueue              = lazy(() => import('@/components/employer/IAEM/InterviewerManagement/ApprovalQueue'));
const HRApprovalQueue            = lazy(() => import('@/components/employer/IAEM/CaseQueue/ApprovalQueue'));
const InterviewerDetail          = lazy(() => import('@/components/employer/IAEM/InterviewerManagement/InterviewerDetail'));
// const IAEMRollingProfile      = lazy(() => import('@/components/employer/IAEM/RollingProfile/RollingProfile')); // Merged into InterviewerDetail tabs
const IAEMScheduling             = lazy(() => import('@/components/employer/IAEM/Scheduling/IAEMScheduling'));
const SlotDashboard              = lazy(() => import('@/components/employer/IAEM/Scheduling/SlotDashboard'));
const CaseQueue                  = lazy(() => import('@/components/employer/IAEM/CaseQueue/CaseQueue'));
const CaseDetail                 = lazy(() => import('@/components/employer/IAEM/CaseQueue/CaseDetail'));
const AppealsQueue               = lazy(() => import('@/components/employer/IAEM/Appeals/AppealsQueue'));
const AppealReview               = lazy(() => import('@/components/employer/IAEM/Appeals/AppealReview'));
const CalibrationManagement      = lazy(() => import('@/components/employer/IAEM/Calibration/CalibrationManagement'));
const CalibrationTracking        = lazy(() => import('@/components/employer/IAEM/Calibration/CalibrationTracking'));


/* ── Jobseeker IAEM ───────────────────────────────────────────────────── */
const IAEMSlotBooking            = lazy(() => import('@/components/jobseeker/SmartInterviews/IAEMSlotBooking'));

// 🔧 CHANGE 1/6 — Wrapper: reads ?jobId=&jobTitle=&origin=&paperId= and feeds AssessmentBuilder the props it needs
const ManualTestBuilderPage = () => {
  const [params] = useSearchParams();
  const jobId    = params.get('jobId') || null;
  const jobTitle = params.get('jobTitle') || '';
  const job      = React.useMemo(() => ({ id: jobId, title: jobTitle }), [jobId, jobTitle]);
  const origin   = params.get('origin') || null;
  const paperId  = params.get('paperId') || null;
  return <AssessmentBuilder open job={job} origin={origin} paperId={paperId} />;
};

// 🔧 CHANGE 2/6 — Wrapper for AI Assessment Builder so ?origin= is honored
const AIAssessmentBuilderPage = () => {
  const [params] = useSearchParams();
  const origin = params.get('origin') || null;
  return <AIAssessmentBuilder origin={origin} />;
};


const ROLE_HOME_PRELOAD = {
  [ROLES.JOBSEEKER]:   () => import('@/components/jobseeker/Overview/JobseekerDashboard'),
  [ROLES.EMPLOYER]:    () => import('@/components/employer/Overview/EmployerDashboard'),
  [ROLES.COMPANY]:     () => import('@/components/company/Overview/CompanyDashboard'),
  [ROLES.INTERVIEWER]: () => import('@/components/interviewer/Overview/InterviewerDashboard'),   // BUILD: 2026-08-24-iaem
  [ROLES.COMPLIANCE]:  () => import('@/components/compliance/Alerts/ComplianceAlerts'),          // BUILD: 2026-08-24-iaem
};

const useIdlePrefetch = (isAuthenticated, role, loading) => {
  React.useEffect(() => {
    if (loading) return undefined;

    const run = () => {
      const load = isAuthenticated
        ? ROLE_HOME_PRELOAD[role]
        : () => import('@/pages/auth/AuthPage');
      if (typeof load === 'function') load().catch(() => {});
    };

    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(run, { timeout: 3000 });
      return () => window.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(run, 1500);
    return () => window.clearTimeout(id);
  }, [isAuthenticated, role, loading]);
};

const SmartRedirect = () => {
  const { isAuthenticated, role, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/auth" replace />;
  return <Navigate to={ROLE_HOME[role] || '/auth'} replace />;
};


const Protected = ({ children, roles }) => (
  <PrivateRoute allowedRoles={roles}>
    <DashboardLayout>
      <Suspense fallback={<RouteFallback />}>{children}</Suspense>
    </DashboardLayout>
  </PrivateRoute>
);

/* Full-screen routes (live room, resume builder, proctored test) render with
   no dashboard shell, so they get the full-viewport fallback. */
const Fullscreen = ({ children, roles = [] }) => (
  <PrivateRoute allowedRoles={roles}>
    <Suspense fallback={<RouteFallback variant="fullscreen" />}>{children}</Suspense>
  </PrivateRoute>
);

/* Redirect legacy /employer/interviewers/:id/profile → merged detail ?tab=performance */
const ProfileRedirect = () => {
  const p = window.location.pathname.match(/\/employer\/interviewers\/([^/]+)\/profile/);
  return <Navigate to={`/employer/interviewers/${p?.[1]}?tab=performance`} replace />;
};

const AppRouter = () => {
  const { isAuthenticated, role, loading } = useAuth();
  useIdlePrefetch(isAuthenticated, role, loading);
  return (
    /* Outer boundary covers the public lazy routes, which render outside both
       wrappers above. */
    <Suspense fallback={<RouteFallback variant="fullscreen" />}>
      <Routes>
        {/* Public */}
        <Route path="/"         element={<LandingPage />} />
        <Route path="/auth"     element={isAuthenticated ? <Navigate to={ROLE_HOME[role]} replace /> : <AuthPage />} />
        <Route path="/redirect" element={<SmartRedirect />} />

        {/* 🔧 Public pages — landing search redirects to /jobs (no popup);
            Browse All Categories → /categories; blogs hub + article reader;
            Talk to support → /support. */}
        <Route path="/jobs"        element={<BrowseJobsPage />} />
        <Route path="/jobs/:id"    element={<JobDetailPage />} />
        <Route path="/categories"  element={<CategoriesPage />} />
        <Route path="/blogs"       element={<BlogsPage />} />
        <Route path="/blogs/:slug" element={<BlogPostPage />} />
        <Route path="/support"     element={<SupportPage />} />
        <Route path="/pricing"     element={<PricingPage />} />
        <Route path="/what-we-offer" element={<WhatWeOfferPage />} />
        <Route path="/our-story"   element={<OurStoryPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/terms-and-conditions" element={<TermsPage />} />

        {/* ── Jobseeker — Overview ── */}
        <Route path="/jobseeker/overview"              element={<Protected roles={[ROLES.JOBSEEKER]}><JobseekerDashboard /></Protected>} />
        {/* 🔧 CHANGE 6/6 — Removed /jobseeker/overview/verification route (Candidate Verification hidden). */}
        {/* 🔧 CHANGE 8/8 — Route path relocated: /jobseeker/overview/performance → /jobseeker/career/candidate-performance (matches its new Skills Analysis dropdown placement). */}
        <Route path="/jobseeker/career/candidate-performance"  element={<Protected roles={[ROLES.JOBSEEKER]}><CandidatePerformance /></Protected>} />

        {/* ── Jobseeker — Jobs ── */}
        <Route path="/jobseeker/find-jobs"    element={<Protected roles={[ROLES.JOBSEEKER]}><FindJobs /></Protected>} />
        <Route path="/jobseeker/job/:id"      element={<Protected roles={[ROLES.JOBSEEKER]}><JobDetails /></Protected>} />
        <Route path="/jobseeker/applications" element={<Protected roles={[ROLES.JOBSEEKER]}><Applications /></Protected>} />
        <Route path="/jobseeker/saved-jobs"   element={<Protected roles={[ROLES.JOBSEEKER]}><SavedJobs /></Protected>} />
        {/* 🔧 Company Feed — jobseeker-facing feed of company posts. Backed by
            /api/jobseeker/feed (see core/jobseekers/job_seeker_feed.py). */}
        <Route path="/jobseeker/feed"         element={<Protected roles={[ROLES.JOBSEEKER]}><JobseekerFeed /></Protected>} />
        {/* 🔧 Notifications — replaces the Topbar dropdown. Mock-driven until
            the notifications endpoint lands (see useNotifications hook). */}
        <Route path="/jobseeker/notifications" element={<Protected roles={[ROLES.JOBSEEKER]}><JobseekerNotifications /></Protected>} />

        {/* ── Jobseeker — AI Assessments ── */}
        {/* 🔧 CHANGE 3/6 — Removed duplicate /jobseeker/ai-assessments route (was declared twice) */}
        <Route path="/jobseeker/ai-assessments" element={<Protected roles={[ROLES.JOBSEEKER]}><AIAssessments /></Protected>} />
        {/* 🔧 CHANGE 4/6 — Added role gate to fullscreen proctored test route (was previously unprotected) */}
        <Route path="/jobseeker/ai-assessments/:assignmentId/test" element={<Fullscreen roles={[ROLES.JOBSEEKER]}><AIAssessmentTest /></Fullscreen>} />

        {/* ── Jobseeker — Smart Interviews ── */}
        <Route path="/jobseeker/ai-interview"                            element={<Protected roles={[ROLES.JOBSEEKER]}><AIInterview /></Protected>} />
        <Route path="/jobseeker/smart-interviews/document-based"         element={<Protected roles={[ROLES.JOBSEEKER]}><DocumentBasedInterview /></Protected>} />
        <Route path="/jobseeker/smart-interviews/ai"                     element={<Protected roles={[ROLES.JOBSEEKER]}><AIInterview /></Protected>} />
        <Route path="/jobseeker/smart-interviews/live"                   element={<Protected roles={[ROLES.JOBSEEKER]}><LiveInterview /></Protected>} />
        {/* 🔧 CHANGE 5/6 — Removed duplicate /redirect route that was stranded inside this block */}
        {/* OLD: /jobseeker/book-slot/:token route removed — IAEM handles booking via /jobseeker/smart-interviews/book/:releaseId */}
        <Route path="/jobseeker/smart-interviews/ai/session/:configId"   element={<Protected roles={[ROLES.JOBSEEKER]}><AIRealtimeSession /></Protected>} />
        <Route path="/jobseeker/quick-interview/session"                 element={<Fullscreen roles={[ROLES.JOBSEEKER]}><AIRealtimeSession /></Fullscreen>} />
        <Route path="/jobseeker/smart-interviews/ai/results/:sessionId"  element={<Protected roles={[ROLES.JOBSEEKER]}><AIRealtimeResults /></Protected>} />
        <Route path="/jobseeker/smart-interviews/document/session/:id"   element={<Protected roles={[ROLES.JOBSEEKER]}><DocumentRealtimeSession /></Protected>} />
        <Route path="/jobseeker/smart-interviews/document/results/:id"   element={<Protected roles={[ROLES.JOBSEEKER]}><DocumentInterviewResults /></Protected>} />
        <Route path="/jobseeker/smart-interviews/campus-drive"           element={<Protected roles={[ROLES.JOBSEEKER]}><CampusDrive /></Protected>} />

        {/* Live / Waiting rooms — fullscreen, no DashboardLayout; kept allowedRoles={[]} as in original.
            LiveRoom pulls in livekit-client (~830 kB) — lazy loading keeps that
            entirely out of every other route. */}
        <Route path="/live-room/:roomName"    element={<Fullscreen><LiveRoom /></Fullscreen>} />
        <Route path="/waiting-room/:roomName" element={<Fullscreen><WaitingRoom /></Fullscreen>} />

        {/* 🔧 CHANGE 2/2 — Added AI Practice Interview route under Career, matching the new sidebar child entry above Candidate Performance. */}
        <Route path="/jobseeker/career/ai-practice-interview" element={<Protected roles={[ROLES.JOBSEEKER]}><AIPracticeInterview /></Protected>} />

        <Route path="/jobseeker/career/interview-history" element={<Protected roles={[ROLES.JOBSEEKER]}><AIPracticeInterview /></Protected>} />

        {/* ── Jobseeker — Workspace ── */}
        {/* Surface 1: inline home (upload CTA + recent resumes) inside DashboardLayout */}
        <Route path="/jobseeker/workspace/resume-builder" element={<Protected roles={[ROLES.JOBSEEKER]}><WorkspaceHome /></Protected>} />
        {/* Surface 2: full-screen AI builder — no DashboardLayout (same pattern as /live-room) */}
        <Route path="/jobseeker/workspace/builder" element={<Fullscreen roles={[ROLES.JOBSEEKER]}><BuilderPage /></Fullscreen>} />

        {/* ── Jobseeker — Other ── */}
        <Route path="/jobseeker/support"  element={<Protected roles={[ROLES.JOBSEEKER]}><SupportTickets /></Protected>} />
        <Route path="/jobseeker/billing"  element={<Protected roles={[ROLES.JOBSEEKER]}><Billing /></Protected>} />
        <Route path="/jobseeker/settings" element={<Protected roles={[ROLES.JOBSEEKER]}><Settings /></Protected>} />
        <Route path="/jobseeker/profile"  element={<Protected roles={[ROLES.JOBSEEKER]}><Profile /></Protected>} />

        {/* ── Employer ── */}
        <Route path="/employer/overview"                  element={<Protected roles={[ROLES.EMPLOYER]}><EmployerDashboard /></Protected>} />
        {/* 🔧 Employer Feed — announcements & company posts, employer-facing.
            Backed by /api/employers/<id>/feed (see company_post.py). */}
        <Route path="/employer/feed"                      element={<Protected roles={[ROLES.EMPLOYER]}><EmployerFeed /></Protected>} />
        <Route path="/employer/notifications"              element={<Protected roles={[ROLES.EMPLOYER]}><EmployerNotifications /></Protected>} />
        <Route path="/employer/my-jobs"                   element={<Protected roles={[ROLES.EMPLOYER]}><MyJobs /></Protected>} />
        <Route path="/employer/my-jobs/:jobId/applicants" element={<Protected roles={[ROLES.EMPLOYER]}><JobApplicants /></Protected>} />
        <Route path="/employer/candidates"                element={<Protected roles={[ROLES.EMPLOYER]}><Candidates /></Protected>} />
        <Route path="/employer/interview-rounds"          element={<Protected roles={[ROLES.EMPLOYER]}><InterviewRounds /></Protected>} />
        <Route path="/employer/live-interview"             element={<Protected roles={[ROLES.EMPLOYER]}><OnlineInterview /></Protected>} />
        {/* Ranked Results — three levels (multi-pipeline rebuild):
              /employer/ranked-results              → jobs
              /employer/ranked-results/job/:jobId   → that job's pipelines (R1: many per job)
              /employer/ranked-results/:processId   → one pipeline's candidates
            The job route MUST be declared as its own path: the old
            ":processId?" pattern matches a SINGLE optional segment, so
            "/job/111" (two segments) fell through to the 404 route. */}
        <Route path="/employer/ranked-results"             element={<Protected roles={[ROLES.EMPLOYER]}><RankedResults /></Protected>} />
        <Route path="/employer/ranked-results/job/:jobId"  element={<Protected roles={[ROLES.EMPLOYER]}><RankedResults /></Protected>} />
        <Route path="/employer/ranked-results/:processId"  element={<Protected roles={[ROLES.EMPLOYER]}><RankedResults /></Protected>} />
        <Route path="/employer/pending-candidates"        element={<Protected roles={[ROLES.EMPLOYER]}><PendingCandidates /></Protected>} />
        <Route path="/employer/final-hire"                element={<Protected roles={[ROLES.EMPLOYER]}><FinalHire /></Protected>} />
        <Route path="/employer/analytics"                 element={<Protected roles={[ROLES.EMPLOYER]}><Analytics /></Protected>} />
        <Route path="/employer/profile"                   element={<Protected roles={[ROLES.EMPLOYER]}><EmployerProfile /></Protected>} />
        <Route path="/employer/manual-test-builder"       element={<Protected roles={[ROLES.EMPLOYER]}><ManualTestBuilderPage /></Protected>} />
        {/* 🔧 CHANGE 6/6 — Use AIAssessmentBuilderPage wrapper so ?origin= is honored (was calling AIAssessmentBuilder directly) */}
        <Route path="/employer/ai-assessment-builder"     element={<Protected roles={[ROLES.EMPLOYER]}><AIAssessmentBuilderPage /></Protected>} />
        <Route path="/employer/question-bank"             element={<Protected roles={[ROLES.EMPLOYER]}><QuestionBank /></Protected>} />
        <Route path="/employer/support"                   element={<Protected roles={[ROLES.EMPLOYER]}><SupportTickets /></Protected>} />

        {/* ── Company Admin ── */}
        <Route path="/company/overview"       element={<Protected roles={[ROLES.COMPANY]}><CompanyDashboard /></Protected>} />
        <Route path="/company/documents/re-upload" element={<Fullscreen roles={[ROLES.COMPANY]}><DocumentReupload /></Fullscreen>}/>
        <Route path="/company/employers"      element={<Protected roles={[ROLES.COMPANY]}><Employers /></Protected>} />
        <Route path="/company/compliance-officers" element={<Protected roles={[ROLES.COMPANY]}><ComplianceOfficers /></Protected>} />
        <Route path="/company/job-postings"   element={<Protected roles={[ROLES.COMPANY]}><JobPostings /></Protected>} />
        <Route path="/company/jobs-approvals" element={<Protected roles={[ROLES.COMPANY]}><JobsApprovals /></Protected>} />
        <Route path="/company/ownership"      element={<Protected roles={[ROLES.COMPANY]}><OwnershipManagement /></Protected>} />
        <Route path="/company/employer-requests/edit" element={<Protected roles={[ROLES.COMPANY]}><EditRequestsPage /></Protected>} />
        <Route path="/company/employer-requests/republish" element={<Protected roles={[ROLES.COMPANY]}><RepublishRequestsPage /></Protected>} />
        <Route path="/company/analytics"      element={<Protected roles={[ROLES.COMPANY]}><CompanyAnalytics /></Protected>} />
        <Route path="/company/engagement"     element={<Protected roles={[ROLES.COMPANY]}><CompanyEngagement /></Protected>} />
        <Route path="/company/notifications"   element={<Protected roles={[ROLES.COMPANY]}><CompanyNotifications /></Protected>} />

        <Route path="/company/subscription"   element={<Protected roles={[ROLES.COMPANY]}><BillingAndSubscription /></Protected>} />

        <Route path="/company/billing"        element={<Navigate to="/company/subscription?tab=billing" replace />} />
        <Route path="/company/support"        element={<Protected roles={[ROLES.COMPANY]}><SupportTickets /></Protected>} />
        <Route path="/company/profile"        element={<Protected roles={[ROLES.COMPANY]}><CompanyProfile /></Protected>} />

        {/* ═══════════════════════════════════════════════════════════════════
            BUILD: 2026-08-24-iaem-router-v1 — IAEM Routes
            ═══════════════════════════════════════════════════════════════════ */}

        {/* ── Interviewer — Activation (public, no auth) ── */}
        <Route path="/interviewer/activate/:token" element={<Suspense fallback={<RouteFallback variant="fullscreen" />}><ActivateAccount /></Suspense>} />

        {/* ── Interviewer — Consent (fullscreen, no dashboard shell) ── */}
        <Route path="/interviewer/consent" element={<Fullscreen roles={[ROLES.INTERVIEWER]}><ConsentAcknowledgment /></Fullscreen>} />

        {/* ── Interviewer — Dashboard ── */}
        <Route path="/interviewer/overview"                    element={<Protected roles={[ROLES.INTERVIEWER]}><InterviewerDashboard /></Protected>} />
        <Route path="/interviewer/slots"                       element={<Protected roles={[ROLES.INTERVIEWER]}><MySlots /></Protected>} />
        <Route path="/interviewer/submission/:bookingId"       element={<Fullscreen roles={[ROLES.INTERVIEWER]}><PostInterviewSubmission /></Fullscreen>} />
        <Route path="/interviewer/submission/si/:siId"         element={<Fullscreen roles={[ROLES.INTERVIEWER]}><PostInterviewSubmission /></Fullscreen>} />
        <Route path="/interviewer/profile"                     element={<Protected roles={[ROLES.INTERVIEWER]}><InterviewerProfilePage /></Protected>} />
        <Route path="/interviewer/calibration"                 element={<Protected roles={[ROLES.INTERVIEWER]}><MyCalibration /></Protected>} />
        <Route path="/interviewer/calibration/baseline"        element={<Protected roles={[ROLES.INTERVIEWER]}><MyBaseline /></Protected>} />
        <Route path="/interviewer/calibration/:sessionId"      element={<Protected roles={[ROLES.INTERVIEWER]}><CalibrationSessionRunner /></Protected>} />
        <Route path="/interviewer/cases"                       element={<Protected roles={[ROLES.INTERVIEWER]}><MyCases /></Protected>} />
        <Route path="/interviewer/cases/:caseId"               element={<Protected roles={[ROLES.INTERVIEWER]}><MyCaseDetail /></Protected>} />
        <Route path="/interviewer/cases/:caseId/appeal"        element={<Protected roles={[ROLES.INTERVIEWER]}><AppealForm /></Protected>} />
        <Route path="/interviewer/appeals"                     element={<Protected roles={[ROLES.INTERVIEWER]}><AppealStatusList /></Protected>} />
        <Route path="/interviewer/appeals/:appealId"           element={<Protected roles={[ROLES.INTERVIEWER]}><AppealStatus /></Protected>} />
        <Route path="/interviewer/notifications"               element={<Protected roles={[ROLES.INTERVIEWER]}><InterviewerNotifications /></Protected>} />
        <Route path="/interviewer/completed"                   element={<Protected roles={[ROLES.INTERVIEWER]}><CompletedInterviews /></Protected>} />
        <Route path="/interviewer/signal-guidelines"           element={<Protected roles={[ROLES.INTERVIEWER]}><SignalGuidelines /></Protected>} />

        {/* ── Compliance ── */}
        <Route path="/compliance/alerts"                       element={<Protected roles={[ROLES.COMPLIANCE]}><ComplianceAlerts /></Protected>} />
        <Route path="/compliance/cases"                        element={<Protected roles={[ROLES.COMPLIANCE]}><ComplianceCaseList /></Protected>} />
        <Route path="/compliance/cases/:caseId"                element={<Protected roles={[ROLES.COMPLIANCE]}><ComplianceCaseDetail /></Protected>} />
        <Route path="/compliance/co-sign"                      element={<Protected roles={[ROLES.COMPLIANCE]}><CoSignPanel /></Protected>} />
        <Route path="/compliance/audit-trail"                  element={<Protected roles={[ROLES.COMPLIANCE]}><ChangeLogViewer /></Protected>} />
        <Route path="/compliance/audit-trail/:caseId"          element={<Protected roles={[ROLES.COMPLIANCE]}><ChangeLogViewer /></Protected>} />
        <Route path="/compliance/model-cards"                  element={<Protected roles={[ROLES.COMPLIANCE]}><ModelCardBrowser /></Protected>} />
        <Route path="/compliance/notifications"                element={<Protected roles={[ROLES.COMPLIANCE]}><ComplianceNotifications /></Protected>} />
        <Route path="/compliance/profile"                      element={<Protected roles={[ROLES.COMPLIANCE]}><ComplianceProfile /></Protected>} />
        <Route path="/compliance/signal-guidelines"            element={<Protected roles={[ROLES.COMPLIANCE]}><SignalGuidelines /></Protected>} />

        {/* ── Employer — IAEM sections ── */}
        <Route path="/employer/interviewers"                   element={<Protected roles={[ROLES.EMPLOYER]}><InterviewerList /></Protected>} />
        <Route path="/employer/interviewers/approvals"         element={<Protected roles={[ROLES.EMPLOYER]}><ApprovalQueue /></Protected>} />
        <Route path="/employer/interviewers/:interviewerId"    element={<Protected roles={[ROLES.EMPLOYER]}><InterviewerDetail /></Protected>} />
        {/* Redirect old rolling-profile URL → merged detail page with performance tab */}
        <Route path="/employer/interviewers/:interviewerId/profile" element={<ProfileRedirect />} />
        <Route path="/employer/iaem-scheduling"                element={<Protected roles={[ROLES.EMPLOYER]}><IAEMScheduling /></Protected>} />
        <Route path="/employer/iaem-scheduling/:releaseId/slots" element={<Protected roles={[ROLES.EMPLOYER]}><SlotDashboard /></Protected>} />
        <Route path="/employer/approval-queue"                 element={<Protected roles={[ROLES.EMPLOYER]}><HRApprovalQueue /></Protected>} />
        <Route path="/employer/cases"                          element={<Protected roles={[ROLES.EMPLOYER]}><CaseQueue /></Protected>} />
        <Route path="/employer/cases/:caseId"                  element={<Protected roles={[ROLES.EMPLOYER]}><CaseDetail /></Protected>} />
        <Route path="/employer/appeals"                        element={<Protected roles={[ROLES.EMPLOYER]}><AppealsQueue /></Protected>} />
        <Route path="/employer/appeals/:appealId"              element={<Protected roles={[ROLES.EMPLOYER]}><AppealReview /></Protected>} />
        <Route path="/employer/iaem-calibration"               element={<Protected roles={[ROLES.EMPLOYER]}><CalibrationManagement /></Protected>} />
        <Route path="/employer/iaem-calibration/:sessionId"    element={<Protected roles={[ROLES.EMPLOYER]}><CalibrationTracking /></Protected>} />
        <Route path="/employer/signal-guidelines"              element={<Protected roles={[ROLES.EMPLOYER]}><SignalGuidelines /></Protected>} />


        {/* ── Jobseeker — IAEM pooled slot booking ── */}
        <Route path="/jobseeker/smart-interviews/book/:releaseId" element={<Protected roles={[ROLES.JOBSEEKER]}><IAEMSlotBooking /></Protected>} />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
};

export default AppRouter;