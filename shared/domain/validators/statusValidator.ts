import type { Job, JobStatus } from '../models/job'

export const ALLOWED_STATUS_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  draft: ['open', 'cancelled'],
  open: ['assigned', 'cancelled'],
  assigned: ['open', 'in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
}

export function canTransitionJobStatus(
  currentStatus: JobStatus,
  targetStatus: JobStatus,
): boolean {
  const allowed = ALLOWED_STATUS_TRANSITIONS[currentStatus] || []
  return allowed.includes(targetStatus)
}

export function validateEmployeeStatusTransition(
  job: Job,
  targetStatus: JobStatus,
  employeeUid: string,
): { reason?: string; valid: boolean } {
  if (!job.isActive) {
    return { valid: false, reason: 'Job is not active' }
  }

  if (!job.assignedEmployeeIds.includes(employeeUid)) {
    return { valid: false, reason: 'Employee is not assigned to this job' }
  }

  if (!canTransitionJobStatus(job.status, targetStatus)) {
    return {
      valid: false,
      reason: `Invalid status transition from ${job.status} to ${targetStatus}`,
    }
  }

  if (targetStatus === 'in_progress' && job.status !== 'assigned') {
    return { valid: false, reason: 'Job can only be started when assigned' }
  }

  if (targetStatus === 'completed' && job.status !== 'in_progress') {
    return { valid: false, reason: 'Job can only be completed when in progress' }
  }

  return { valid: true }
}
