export const JobStatuses = {
  Draft: 'draft',
  Open: 'open',
  Assigned: 'assigned',
  InProgress: 'in_progress',
  Completed: 'completed',
  Cancelled: 'cancelled',
} as const

export type JobStatus = (typeof JobStatuses)[keyof typeof JobStatuses]

export const JOB_STATUS_VALUES = Object.values(JobStatuses) as JobStatus[]

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  assigned: 'Assigned',
  cancelled: 'Cancelled',
  completed: 'Completed',
  draft: 'Draft',
  in_progress: 'In progress',
  open: 'Open',
}

export const JOB_STATUS_TRANSITIONS: Record<JobStatus, readonly JobStatus[]> = {
  assigned: [JobStatuses.Open, JobStatuses.InProgress, JobStatuses.Cancelled],
  cancelled: [],
  completed: [],
  draft: [JobStatuses.Open, JobStatuses.Cancelled],
  in_progress: [JobStatuses.Completed, JobStatuses.Cancelled],
  open: [JobStatuses.Assigned, JobStatuses.Cancelled],
}

export function getAllowedJobStatusTransitions(status: JobStatus) {
  return JOB_STATUS_TRANSITIONS[status]
}

export function canTransitionJobStatus(
  currentStatus: JobStatus,
  nextStatus: JobStatus,
) {
  return JOB_STATUS_TRANSITIONS[currentStatus].includes(nextStatus)
}
