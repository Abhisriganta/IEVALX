import { interviewAPI } from './candidateService';
import axiosInstance from '../axiosInstance';

const interviewRoundService = {
  getDashboard:      ()            => interviewAPI.getInterviewDashboard(),
  getProcesses:      ()            => interviewAPI.getProcesses(),
  getScheduled:      (params)      => interviewAPI.getScheduled(params),
  getLiveInterviews: ()            => interviewAPI.getLiveInterviews(),
  sendInvite:        (id)          => interviewAPI.sendInvite(id),
  sendReminder:      (id)          => interviewAPI.sendReminder(id),
  flagFraud:         (sid, data)   => interviewAPI.flagFraud(sid, data),
  deleteScheduled:   (id)          => interviewAPI.deleteScheduled(id),
  handleMissedRound: (id)          => interviewAPI.handleMissedRound(id),
  createProcess:     (data)        => interviewAPI.createProcess(data),
  createRound:       (procId, data)=> interviewAPI.createRound(procId, data),
  closeProcess:      (id, hasVac)  => interviewAPI.closeProcess(id, hasVac),
  markCompleted:     (id)          => interviewAPI.markCompleted(id),
  syncManualAssessment: (id)       => interviewAPI.syncManualAssessment(id),
  repairManualAssignment: (id)     => interviewAPI.repairManualAssignment(id),
  startVideoSession: (id)          => interviewAPI.startVideoSession(id),
  getDocResult:      (id)          => interviewAPI.getDocResult(id),
  hideScheduled:     (ids)         => interviewAPI.hideScheduled(ids),
  unhideScheduled:   (ids)         => interviewAPI.unhideScheduled(ids),

  // ── Soft-delete for Live Interview cards ─────────────────────────────────
  hideLiveInterviews:   (ids) =>
    axiosInstance.post('/employer/interviews/live/interviews/hide/',   { ids }),
  unhideLiveInterviews: (ids) =>
    axiosInstance.post('/employer/interviews/live/interviews/unhide/', { ids }),
};

export default interviewRoundService;