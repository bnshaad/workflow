import {
  JOB_PRIORITY_OPTIONS,
  JOB_STATUS_OPTIONS,
} from '@/constants/jobConstants'
import type { CreateJobValidationInput } from '@/types/job'
import type { JobPriority } from '@/types/jobPriority'
import type { JobStatus } from '@/types/jobStatus'
import {
  isJobPriority,
  validateJobCreation,
} from '../../../../shared/jobCreation.ts'

export interface JobValidationResult {
  isValid: boolean
  errors: string[]
}

export function validateJobStatus(status: unknown): status is JobStatus {
  return (
    typeof status === 'string' &&
    JOB_STATUS_OPTIONS.includes(status as JobStatus)
  )
}

export function validatePriority(priority: unknown): priority is JobPriority {
  return isJobPriority(priority) && JOB_PRIORITY_OPTIONS.includes(priority)
}

export function validateCreateJob(
  input: Partial<CreateJobValidationInput>,
): JobValidationResult {
  return validateJobCreation(input)
}
