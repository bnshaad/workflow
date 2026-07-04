import {
  JOB_PRIORITY_VALUES,
  JobPriorities,
  type JobPriority,
} from '@/types/jobPriority'
import {
  JOB_STATUS_VALUES,
  JobStatuses,
  type JobStatus,
} from '@/types/jobStatus'

export const DEFAULT_JOB_STATUS = JobStatuses.Draft
export const DEFAULT_JOB_PRIORITY = JobPriorities.Medium

export const JOB_STATUS_OPTIONS: readonly JobStatus[] = JOB_STATUS_VALUES
export const JOB_PRIORITY_OPTIONS: readonly JobPriority[] = JOB_PRIORITY_VALUES

export const JOB_TITLE_MAX_LENGTH = 120
export const JOB_DESCRIPTION_MAX_LENGTH = 2000
export const JOB_CUSTOMER_NAME_MAX_LENGTH = 120
export const JOB_PHONE_MAX_LENGTH = 40
export const JOB_ADDRESS_MAX_LENGTH = 240
