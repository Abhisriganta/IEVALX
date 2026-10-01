// Application and Job status maps with label + MUI color.
export const APP_STATUS = {
  APPLIED:      { label: 'Applied',      color: 'default'  },
  REVIEWING:    { label: 'Reviewing',    color: 'info'     },
  SHORTLISTED:  { label: 'Shortlisted',  color: 'warning'  },
  ON_HOLD:      { label: 'On Hold',      color: 'warning'  },
  INTERVIEW:    { label: 'Interview',    color: 'primary'  },
  OFFERED:      { label: 'Offered',      color: 'success'  },
  REJECTED:     { label: 'Rejected',     color: 'error'    },
  WITHDRAWN:    { label: 'Withdrawn',    color: 'default'  },
};

export const JOB_STATUS = {
  LIVE:   { label: 'Live',   color: 'success' },
  DRAFT:  { label: 'Draft',  color: 'default' },
  CLOSED: { label: 'Closed', color: 'error'   },
  PAUSED: { label: 'Paused', color: 'warning' },
};