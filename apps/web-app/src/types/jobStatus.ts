export const JobStatuses = {
  Pending: 'Pending',
  Assigned: 'Assigned',
  Accepted: 'Accepted',
  InProgress: 'In Progress',
  Completed: 'Completed',
  Cancelled: 'Cancelled',
} as const

export type JobStatus = (typeof JobStatuses)[keyof typeof JobStatuses]

export const JOB_STATUS_VALUES = Object.values(JobStatuses) as JobStatus[]
