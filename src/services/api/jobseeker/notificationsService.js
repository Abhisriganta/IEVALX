

import axiosInstance from '../axiosInstance';

/* ── Frontend → backend role translation ─────────────────────────────── */
const frontendRoleToBackend = {
  jobseeker: 'jobseeker',
  employer:  'employer',
  company:   'company_admin',
};

const backendRole = (frontendRole) =>
  frontendRoleToBackend[frontendRole] || frontendRole;

export const normalizeNotification = (row) => {
  return {
    id:         row.id,
    kind:       resolveKind(row.type_code, row.category),
    unread:     !row.is_read,
    time:       formatRelativeTime(row.created_at),
    title:      row.title,
    body:       row.message,
    actionUrl:  row.action_url || null,
    priority:   row.priority || 'info',
    requiresAction: !!row.requires_action,
    createdAt:  row.created_at,
    typeCode:   row.type_code,
    entityType: row.related_entity_type,
    entityId:   row.related_entity_id,
    extra:      row.extra_data || null,
  };
};


const TYPE_TO_KIND = {
  // interviews
  INTERVIEW_SCHEDULED_EMPLOYER:      'interview',
  INTERVIEW_SCHEDULED_CANDIDATE:     'interview',
  INTERVIEW_REMINDER_EMPLOYER:       'interview',
  INTERVIEW_REMINDER_CANDIDATE:      'interview',
  INTERVIEW_ROOM_READY_EMPLOYER:     'interview',
  INTERVIEW_ROOM_READY_CANDIDATE:    'interview',
  INTERVIEW_CANDIDATE_NO_SHOW:       'interview',
  INTERVIEW_EMPLOYER_NO_SHOW:        'interview',
   INTERVIEW_RESCHEDULED_EMPLOYER:    'interview',
  INTERVIEW_RESCHEDULED_CANDIDATE:   'interview',
  RESCHEDULE_REQUESTED_EMPLOYER:     'interview',
  RESCHEDULE_APPLIED_CANDIDATE:      'interview',
  INTERVIEW_CANCELLED_EMPLOYER:      'interview',
  INTERVIEW_CANCELLED_CANDIDATE:     'interview',
  INTERVIEW_SLOT_INVITE:             'interview',
  INTERVIEW_SLOT_BOOKED_EMPLOYER:    'interview',
  INTERVIEW_SLOT_BOOKED_CANDIDATE:   'interview',
  CANDIDATE_ROUND_ADVANCED:          'interview',
  ROUND_COMPLETED_EMPLOYER:          'candidate',

  // assessments
  ASSESSMENT_ASSIGNED:               'assessment',
  ASSESSMENT_DUE_REMINDER:           'assessment',
  ASSESSMENT_SUBMITTED_CONFIRM:      'assessment',
  ASSESSMENT_SUBMISSION_RECEIVED:    'assessment',
  ASSESSMENT_EXPIRED_CANDIDATE:      'assessment',
  ASSESSMENT_EXPIRED_EMPLOYER:       'assessment',
  ASSESSMENT_RESULTS_AVAILABLE:      'assessment',
  PROCTORING_ANOMALY:                'assessment',

  // application (candidate-visible)
  APPLICATION_SHORTLISTED:           'application',
  APPLICATION_IN_REVIEW:             'application',
  APPLICATION_INTERVIEWING:          'application',
  APPLICATION_REJECTED:              'application',
  APPLICATION_ON_HOLD:               'application',
  JOB_CLOSED_TO_APPLICANT:           'application',

  // offers (both sides)
  APPLICATION_HIRED:                 'offer',
  OFFER_SENT:                        'offer',

  // employer-facing candidate signals
  NEW_APPLICATION_RECEIVED:          'candidate',
  APPLICATION_WITHDRAWN:             'candidate',

  // jobs (employer/company)
  JOB_PENDING_APPROVAL:              'job',
  JOB_APPROVED:                      'job',
  JOB_REJECTED:                      'job',
  JOB_EDIT_APPROVED:                 'job',
  JOB_EDIT_DENIED:                   'job',
  JOB_REPUBLISH_APPROVED:            'job',
  JOB_REPUBLISH_DENIED:              'job',

  // company-side requests
  JOB_EDIT_REQUEST_PENDING:          'request',
  JOB_REPUBLISH_REQUEST_PENDING:     'request',

  // tenant management
  EMPLOYER_SIGNUP_REQUEST:           'employer',
  EMPLOYER_ACCESS_GRANTED:           'employer',
  EMPLOYER_ACCESS_REVOKED:           'employer',
  EMPLOYER_ROLE_CHANGED:             'employer',

  // billing
  BILLING_RENEWAL_REMINDER:          'billing',
  BILLING_PAYMENT_SUCCESS:           'billing',
  BILLING_PAYMENT_FAILED:            'billing',
  BILLING_SEAT_LIMIT_REACHED:        'billing',
  BILLING_PLAN_CHANGED:              'billing',

  // announcements & posts
  COMPANY_ANNOUNCEMENT_EMPLOYER:     'announcement',
  COMPANY_ANNOUNCEMENT_JOBSEEKER:    'announcement',
  POST_COMMENT_ON_YOUR_POST:         'post',
  POST_COMMENT_ON_COMPANY_POST:      'post',
  POST_COMMENT_ON_FOLLOWED_POST:     'post',
  POST_COMMENT_ON_FOLLOWED_POST_JS:  'post',
  POST_LIKE_ON_YOUR_POST:            'post',
  POST_LIKE_ON_COMPANY_POST:         'post',

  // jobseeker self
  PROFILE_MILESTONE_REACHED:         'profile',
  NEW_JOB_MATCH:                     'job_match',
  RESUME_READY:                      'profile',
  PRACTICE_INTERVIEW_REPORT_READY:   'profile',

  // messaging
  DIRECT_MESSAGE_JOBSEEKER:          'message',
  DIRECT_MESSAGE_EMPLOYER:           'message',
};

const CATEGORY_FALLBACK = {
  interview:    'interview',
  application:  'application',
  job:          'job',
  company:      'post',
  registration: 'employer',
  admin:        'system',
  system:       'system',
};

const resolveKind = (typeCode, category) => {
  if (typeCode && TYPE_TO_KIND[typeCode]) return TYPE_TO_KIND[typeCode];
  if (category && CATEGORY_FALLBACK[category]) return CATEGORY_FALLBACK[category];
  return 'system';
};

/* ── Relative time formatting (matches the mock's "Just now", "2 hr ago") ── */
const formatRelativeTime = (isoLike) => {
  if (!isoLike) return '';
  const t = new Date(isoLike.replace(' ', 'T'));
  if (isNaN(t.getTime())) return '';
  const diffSec = Math.max(0, (Date.now() - t.getTime()) / 1000);
  if (diffSec < 60)         return 'Just now';
  const m = Math.floor(diffSec / 60);
  if (m < 60)               return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24)               return `${h} hr ago`;
  const d = Math.floor(h / 24);
  if (d === 1)              return 'Yesterday';
  if (d < 7)                return `${d} days ago`;
  return t.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};

/* ── API surface ─────────────────────────────────────────────────────── */
export const notificationsApi = {
  // BUILD: 2026-08-07-notif-pagination-v1
  list: async ({ role, recipientId, limit = 50, offset = 0, unreadOnly = false }) => {
    const bRole = backendRole(role);
    const url = `/notifications/${bRole}/${recipientId}/list`;
    const { data } = await axiosInstance.get(url, {
      params: { limit, offset, unread_only: unreadOnly ? 1 : 0 },
    });
    // Server returns { Notifications: [...], Total_Notifications, ... };
    // support both shapes for resilience.
    const rows = Array.isArray(data) ? data
               : data?.Notifications || data?.notifications || data?.data || [];
    const total = data?.Total_Notifications ?? data?.total ?? rows.length;
    return { items: rows.map(normalizeNotification), total };
  },

  unreadCount: async ({ role, recipientId }) => {
    const bRole = backendRole(role);
    const url = `/notifications/${bRole}/${recipientId}/unread-count`;
    const { data } = await axiosInstance.get(url);
    return data?.unread_count ?? data?.count ?? 0;
  },

  markRead: async (id) => {
    const url = `/notifications/${id}/read`;
    await axiosInstance.post(url);
    return true;
  },

  markAllRead: async ({ role, recipientId }) => {
    const bRole = backendRole(role);
    const url = `/notifications/${bRole}/${recipientId}/read-all`;
    await axiosInstance.post(url);
    return true;
  },

  markActed: async (id) => {
    const url = `/notifications/${id}/acted`;
    await axiosInstance.post(url);
    return true;
  },

  delete: async (id) => {
    const url = `/notifications/delete/${id}`;
    await axiosInstance.delete(url);
    return true;
  },

  clearRead: async ({ role, recipientId }) => {
    const bRole = backendRole(role);
    const url = `/notifications/${bRole}/${recipientId}/clear-read`;
    await axiosInstance.delete(url);
    return true;
  },

  // BUILD: 2026-08-07-notif-clearall-v1
  clearAll: async ({ role, recipientId }) => {
    const bRole = backendRole(role);
    const url = `/notifications/${bRole}/${recipientId}/clear-all`;
    await axiosInstance.delete(url);
    return true;
  },
};

export default notificationsApi;