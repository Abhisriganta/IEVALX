import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ROLES } from '@/constants';

import approvalService         from '@/services/api/company/approvalService';
import pendingCandidateService from '@/services/api/employer/pendingCandidateService';
import jobService              from '@/services/api/jobseeker/jobService';
import { aiAssessmentService } from '@/services/api/jobseeker/aiAssessmentService';
import smartInterviewService   from '@/services/api/jobseeker/smartInterviewService';
import campusDriveService      from '@/services/api/jobseeker/Campusdriveservice';
import interviewerService      from '@/services/api/iaem/interviewerService';
import interviewerCaseService  from '@/services/api/iaem/interviewerCaseService';
import calibrationService      from '@/services/api/iaem/calibrationService';
import complianceService       from '@/services/api/iaem/complianceService';
import hrInterviewerService    from '@/services/api/iaem/hrInterviewerService';
import caseService             from '@/services/api/iaem/caseService';
import appealService           from '@/services/api/iaem/appealService';

const UPCOMING_STATUSES = new Set(['scheduled', 'invited', 'in_progress']);
const isUpcoming = (iv) => UPCOMING_STATUSES.has(iv?.status);

const ACTOR_COMPANY = 'COMPANY';

// Mirrors the resolution used in useJobsApprovals.js — company id can live
// on several keys, and for a company login the user's own id IS the company id.
const resolveCompanyId = (user) => {
  const rawRole      = user?.role || user?.User_Role || user?.user_role || '';
  const rawActorType = user?.actor_type || user?.Actor_Type || '';
  const isCompanyLogin =
    rawActorType.toUpperCase() === ACTOR_COMPANY ||
    rawRole.toLowerCase()      === 'company';
  return (
    user?.company_id ??
    user?.companyId  ??
    user?.Company_Id ??
    (isCompanyLogin ? (user?.id ?? user?.User_Id ?? user?.user_id) : null)
  );
};

export default function useSidebarCounts() {
  const { role, user } = useAuth();
  const location = useLocation();
  const [counts, setCounts] = useState({});
  const inflightRef = useRef(false);

  const fetchAll = useCallback(async () => {
    if (!role || !user) return;
    if (inflightRef.current) return;
    inflightRef.current = true;

    const safe = async (fn) => { try { return await fn(); } catch { return null; } };
    const next = {};

    try {
      if (role === ROLES.COMPANY) {
        const companyId = resolveCompanyId(user);
        const [stats, edits, republish] = await Promise.all([
          safe(() => (companyId != null ? approvalService.getStats(companyId) : null)),
          safe(() => approvalService.listEditRequests('PENDING')),
          safe(() => approvalService.listRepublishRequests('PENDING')),
        ]);
        if (stats && typeof stats.pending === 'number') next.jobsPending = stats.pending;
        if (Array.isArray(edits))     next.editRequests      = edits.length;
        if (Array.isArray(republish)) next.republishRequests = republish.length;
        next.employerRequestsTotal =
          (next.editRequests || 0) + (next.republishRequests || 0);
      } else if (role === ROLES.EMPLOYER) {
        const [pending, approvals, cases, appeals] = await Promise.all([
          safe(() => pendingCandidateService.getPendingCandidates()),
          safe(() => hrInterviewerService.getApprovalQueue().then(r => r.data)),
          safe(() => caseService.getCaseQueue({ state: 'OPEN' }).then(r => r.data)),
          safe(() => appealService.getAppealsQueue({ status: 'PENDING' }).then(r => r.data)),
        ]);
        if (Array.isArray(pending)) next.pendingCandidates = pending.length;
        const approvalList = approvals?.registrations;
        if (Array.isArray(approvalList)) next.pendingApprovals = approvalList.length;
        const caseList = cases?.cases;
        if (Array.isArray(caseList)) next.openCases = caseList.length;
        const appealList = appeals?.appeals;
        if (Array.isArray(appealList)) next.pendingAppeals = appealList.length;
        next.iaemTotal =
          (next.pendingApprovals || 0) +
          (next.openCases || 0) +
          (next.pendingAppeals || 0);

      } else if (role === ROLES.INTERVIEWER) {
        const [dashboard, myCases, mySlots] = await Promise.all([
          safe(() =>
            interviewerService.getDashboardSummary({ page_size: 1 }).then(r => r.data),
          ),
          safe(() =>
            interviewerCaseService.getMyCases().then(r => r.data),
          ),
          safe(() =>
            interviewerService.getSlotRequests().then(r => r.data),
          ),
        ]);
        if (dashboard) {
          if (typeof dashboard.calibration_due === 'number')
            next.calibrationDue = dashboard.calibration_due;
          if (typeof dashboard.pending_submissions === 'number')
            next.pendingSubmissions = dashboard.pending_submissions;
        }
        // Trust actual list endpoints over dashboard summary counts
        const caseList = myCases?.cases;
        next.openCases = Array.isArray(caseList) ? caseList.length : (dashboard?.open_cases || 0);
        const slotList = mySlots?.requests;
        next.pendingSlotRequests = Array.isArray(slotList)
  ? slotList.filter(r => !r.deadline || new Date(r.deadline) >= new Date()).length
  : (dashboard?.pending_slot_requests || 0);

      } else if (role === ROLES.COMPLIANCE) {
        const [alerts, cosigns] = await Promise.all([
          safe(() => complianceService.getAlerts({ unread: 'true', page_size: 1 }).then(r => r.data)),
          safe(() => complianceService.getCoSignQueue().then(r => r.data)),
        ]);
        if (typeof alerts?.total === 'number') next.criticalAlerts = alerts.total;
        const cosignList = cosigns?.pending;
        if (Array.isArray(cosignList)) next.pendingCoSigns = cosignList.length;

      } else if (role === ROLES.JOBSEEKER) {
        const [apps, saved, assess, docSess, aiSess, liveSlots, campus] =
          await Promise.all([
            safe(() => jobService.getApplications()),
            safe(() => jobService.getSavedJobs()),
            safe(() => aiAssessmentService.getAssessments()),
            safe(() => smartInterviewService.getDocumentBasedSessions()),
            safe(() => smartInterviewService.getAIInterviewSessions()),
            safe(() => smartInterviewService.getLiveInterviewSlots()),
            safe(() => campusDriveService.getUpcoming()),
          ]);
        if (Array.isArray(apps))  next.appliedJobs = apps.length;
        if (Array.isArray(saved)) next.savedJobs   = saved.length;
        if (Array.isArray(assess)) {
          next.aiAssessments = assess.filter((a) => a?.status === 'not_started').length;
        }
        if (Array.isArray(docSess))    next.docInterviews = docSess.filter(isUpcoming).length;
        if (Array.isArray(aiSess))     next.aiInterviews  = aiSess.filter(isUpcoming).length;
        if (Array.isArray(liveSlots))  next.bookInterview = liveSlots.length; // service already filters upcoming
        if (Array.isArray(campus))     next.campusDrive   = campus.length;    // getUpcoming() already filters
        next.smartInterviewsTotal =
          (next.docInterviews || 0) +
          (next.aiInterviews  || 0) +
          (next.bookInterview || 0) +
          (next.campusDrive   || 0);
      }

      setCounts(next);
    } finally {
      inflightRef.current = false;
    }
  }, [role, user]);

  useEffect(() => { fetchAll(); }, [fetchAll, location.pathname]);

  return counts;
}