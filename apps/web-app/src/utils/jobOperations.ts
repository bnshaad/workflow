import type { Job } from '../types/index.ts'
import { toJsDate } from '../services/common/documentReaders.ts'

type OperationalJob = Pick<
  Job,
  'assignedEmployeeIds' | 'dueDate' | 'id' | 'priority' | 'status'
>

export const JOB_QUICK_FILTERS = [
  'all',
  'needs-assignment',
  'urgent',
  'overdue',
  'assigned',
  'in-progress',
] as const

export type JobQuickFilter = (typeof JOB_QUICK_FILTERS)[number]

export type JobPrimaryAction = {
  href: string
  label: 'Assign' | 'Reassign' | 'Review' | 'Track' | 'View'
}

export type JobAttentionReason =
  | 'In progress and overdue'
  | 'Urgent and unassigned'
  | 'Overdue'

export function filterOperationalJobs<T extends OperationalJob>(
  jobs: T[],
  filter: JobQuickFilter,
  now = new Date(),
) {
  switch (filter) {
    case 'all':
      return jobs
    case 'needs-assignment':
      return jobs.filter(
        (job) => job.status === 'open' && job.assignedEmployeeIds.length === 0,
      )
    case 'urgent':
      return jobs.filter((job) => job.priority === 'Urgent')
    case 'overdue':
      return jobs.filter((job) => isJobOverdue(job, now))
    case 'assigned':
      return jobs.filter((job) => job.status === 'assigned')
    case 'in-progress':
      return jobs.filter((job) => job.status === 'in_progress')
    default:
      return jobs
  }
}

export function parseJobQuickFilter(value: string | null): JobQuickFilter {
  return JOB_QUICK_FILTERS.includes(value as JobQuickFilter)
    ? (value as JobQuickFilter)
    : 'all'
}

export function matchesJobQuickFilter(
  job: OperationalJob,
  filter: JobQuickFilter,
  now = new Date(),
) {
  switch (filter) {
    case 'all':
      return true
    case 'needs-assignment':
      return job.status === 'open' && job.assignedEmployeeIds.length === 0
    case 'urgent':
      return (
        job.priority === 'Urgent' &&
        job.status !== 'completed' &&
        job.status !== 'cancelled'
      )
    case 'overdue':
      return isJobOverdue(job, now)
    case 'assigned':
      return job.status === 'assigned'
    case 'in-progress':
      return job.status === 'in_progress'
    default:
      return true
  }
}

export function isJobOverdue(job: OperationalJob, now = new Date()) {
  if (
    !job.dueDate ||
    job.status === 'completed' ||
    job.status === 'cancelled'
  ) {
    return false
  }

  const due = toJsDate(job.dueDate)
  if (!due) return false
  return due.getTime() < now.getTime()
}

export function getJobPrimaryAction(job: OperationalJob): JobPrimaryAction {
  const assignmentHref = `/jobs/${job.id}#assignment-controls`

  if (job.status === 'open' && job.assignedEmployeeIds.length === 0) {
    return { href: assignmentHref, label: 'Assign' }
  }

  if (job.status === 'assigned') {
    return { href: assignmentHref, label: 'Reassign' }
  }

  if (job.status === 'draft') {
    return { href: `/jobs/${job.id}`, label: 'Review' }
  }

  if (job.status === 'in_progress') {
    return { href: `/jobs/${job.id}`, label: 'Track' }
  }

  return { href: `/jobs/${job.id}`, label: 'View' }
}

export function getJobAttentionReason(
  job: OperationalJob,
  now = new Date(),
): JobAttentionReason | null {
  if (job.status === 'in_progress' && isJobOverdue(job, now)) {
    return 'In progress and overdue'
  }

  if (
    job.status === 'open' &&
    job.assignedEmployeeIds.length === 0 &&
    (job.priority === 'Urgent' || job.priority === 'High')
  ) {
    return 'Urgent and unassigned'
  }

  if (isJobOverdue(job, now)) {
    return 'Overdue'
  }

  return null
}

export function sortOperationalJobs<T extends OperationalJob>(jobs: T[]) {
  return [...jobs].sort((first, second) => {
    const priorityDifference =
      getPriorityRank(second.priority) - getPriorityRank(first.priority)

    if (priorityDifference !== 0) {
      return priorityDifference
    }

    const firstDue = toJsDate(first.dueDate)?.getTime() ?? Number.MAX_SAFE_INTEGER
    const secondDue = toJsDate(second.dueDate)?.getTime() ?? Number.MAX_SAFE_INTEGER
    return firstDue - secondDue
  })
}

function getPriorityRank(priority: Job['priority']) {
  switch (priority) {
    case 'Urgent':
      return 4
    case 'High':
      return 3
    case 'Medium':
      return 2
    default:
      return 1
  }
}
