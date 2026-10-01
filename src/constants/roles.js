// Role identifiers and their default landing routes.
export const ROLES = {
  JOBSEEKER:   'jobseeker',
  EMPLOYER:    'employer',
  COMPANY:     'company',
  INTERVIEWER: 'interviewer',   // BUILD: 2026-08-24-iaem-roles-v1
  COMPLIANCE:  'compliance',    // BUILD: 2026-08-24-iaem-roles-v1
};

export const ROLE_HOME = {
  [ROLES.JOBSEEKER]:   '/jobseeker/overview',
  [ROLES.EMPLOYER]:    '/employer/overview',
  [ROLES.COMPANY]:     '/company/overview',
  [ROLES.INTERVIEWER]: '/interviewer/overview',   // BUILD: 2026-08-24-iaem-roles-v1
  [ROLES.COMPLIANCE]:  '/compliance/alerts',      // BUILD: 2026-08-24-iaem-roles-v1
};
