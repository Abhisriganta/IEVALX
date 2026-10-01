import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ROLES } from '@/constants';

// ============================================================================
// useApplyNavigation — the ONE decision point for every public "Apply Now"
// ----------------------------------------------------------------------------
// THE BUG THIS FIXES: every Apply CTA on the landing/public pages hard-coded
// its destination and never consulted auth state. A LOGGED-IN JOBSEEKER
// clicking "Apply Now" was sent to /auth, whose route guard bounced them to
// ROLE_HOME → /jobseeker/overview — the job they clicked was completely lost.
//
// THE RULES (per surface, per auth state):
//
//   goToJob(jobId)      — view/open intent (card click, title click)
//     · jobseeker (logged in) → /jobseeker/job/:id  — the DASHBOARD job
//       details page, apply-capable, wrapped in DashboardLayout. The route
//       already exists in AppRouter; JobDetails reads useParams().id and
//       fetches the job itself, so a cold deep-link works.
//     · everyone else         → /jobs/:id           — public detail page.
//
//   goToApply(jobId)    — explicit Apply intent on a SPECIFIC job
//     · jobseeker             → /jobseeker/job/:id  (apply lives there)
//     · guest                 → /auth carrying state.from = the DASHBOARD
//       job path, so LoginForm can land them ON THE JOB after login
//       (mirrors the exact state shape PrivateRoute already produces)
//     · employer / company    → /jobs/:id — they may look, not apply.
//
//   goToApplyGeneric()  — Apply CTAs with no job attached (hero banners)
//     · jobseeker             → /jobseeker/find-jobs
//     · guest                 → /auth
//     · employer / company    → /jobs
//
// The public and dashboard pages share the same backend id space — both
// resolve through GET /api/jobs/<id> — so the id can cross the boundary
// unchanged (verified in publicJobsService.mapPublicJob and
// jobService.getJobDetails).
// ============================================================================

export const dashboardJobPath = (jobId) => `/jobseeker/job/${jobId}`;
export const publicJobPath = (jobId) => `/jobs/${jobId}`;

/* Dashboard route for the AI Practice Interview feature (registered in
   AppRouter under Career). Public "AI Interviews" service links resolve
   here for logged-in jobseekers instead of dead-ending at /auth (which
   bounces authenticated users to ROLE_HOME, losing the intent). */
export const aiPracticePath = '/jobseeker/career/ai-practice-interview';

/* Dashboard route for AI Assessments (registered in AppRouter). The public
   "Assessments" service link resolves here for logged-in jobseekers. */
export const aiAssessmentsPath = '/jobseeker/ai-assessments';

export default function useApplyNavigation() {
  const navigate = useNavigate();
  const { isAuthenticated, role } = useAuth();
  const isJobseeker = isAuthenticated && role === ROLES.JOBSEEKER;

  const goToJob = useCallback(
    (jobId) => {
      if (jobId === null || jobId === undefined || jobId === '') return;
      navigate(isJobseeker ? dashboardJobPath(jobId) : publicJobPath(jobId));
    },
    [navigate, isJobseeker],
  );

  const goToApply = useCallback(
    (jobId) => {
      if (jobId === null || jobId === undefined || jobId === '') return;
      if (isJobseeker) {
        navigate(dashboardJobPath(jobId));
        return;
      }
      if (!isAuthenticated) {
        /* Same state shape PrivateRoute emits, so LoginForm handles both
           bounce sources with one code path. */
        navigate('/auth', {
          state: { from: { pathname: dashboardJobPath(jobId) } },
        });
        return;
      }
      navigate(publicJobPath(jobId));
    },
    [navigate, isJobseeker, isAuthenticated],
  );

  /* goToAIInterview() — the "AI Interviews" service CTA on public pages.
       · jobseeker (logged in) → the AI Practice Interview dashboard page.
       · guest                 → /auth carrying state.from = the practice
         path, so LoginForm lands them ON the practice page after login
         (same state shape PrivateRoute / goToApply already emit).
       · employer / company    → /what-we-offer — informational page; going
         to /auth would just bounce them to their own overview. */
  const goToAIInterview = useCallback(() => {
    if (isJobseeker) {
      navigate(aiPracticePath);
      return;
    }
    if (!isAuthenticated) {
      navigate('/auth', { state: { from: { pathname: aiPracticePath } } });
      return;
    }
    navigate('/what-we-offer');
  }, [navigate, isJobseeker, isAuthenticated]);

  /* goToAssessments() — the "Assessments" service CTA on public pages.
       Same decision shape as goToAIInterview:
       · jobseeker (logged in) → the AI Assessments dashboard page.
       · guest                 → /auth carrying state.from = the assessments
         path, so LoginForm lands them ON assessments after login.
       · employer / company    → /what-we-offer (informational). */
  const goToAssessments = useCallback(() => {
    if (isJobseeker) {
      navigate(aiAssessmentsPath);
      return;
    }
    if (!isAuthenticated) {
      navigate('/auth', { state: { from: { pathname: aiAssessmentsPath } } });
      return;
    }
    navigate('/what-we-offer');
  }, [navigate, isJobseeker, isAuthenticated]);

  const goToApplyGeneric = useCallback(() => {
    if (isJobseeker) {
      navigate('/jobseeker/find-jobs');
      return;
    }
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }
    navigate('/jobs');
  }, [navigate, isJobseeker, isAuthenticated]);

  return { goToJob, goToApply, goToApplyGeneric, goToAIInterview, goToAssessments, isJobseeker, isAuthenticated, role };
}