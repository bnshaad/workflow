import {
  JOB_ADDRESS_MAX_LENGTH,
  JOB_CUSTOMER_NAME_MAX_LENGTH,
  JOB_DESCRIPTION_MAX_LENGTH,
  JOB_PHONE_MAX_LENGTH,
  JOB_PRIORITY_OPTIONS,
  JOB_STATUS_OPTIONS,
  JOB_TITLE_MAX_LENGTH,
} from '@/constants/jobConstants'
import type { CreateJobValidationInput } from '@/types/job'
import type { JobPriority } from '@/types/jobPriority'
import type { JobStatus } from '@/types/jobStatus'

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
  return (
    typeof priority === 'string' &&
    JOB_PRIORITY_OPTIONS.includes(priority as JobPriority)
  )
}

export function validateCreateJob(
  input: Partial<CreateJobValidationInput>,
): JobValidationResult {
  const errors: string[] = []

  validateRequiredText(
    input.organizationId,
    'Organization is required.',
    errors,
  )
  validateRequiredText(input.title, 'Job title is required.', errors)
  validateRequiredText(
    input.description,
    'Job description is required.',
    errors,
  )
  validateRequiredText(
    input.customerName,
    'Customer name is required.',
    errors,
  )
  validateRequiredText(
    input.customerPhone,
    'Customer phone is required.',
    errors,
  )
  validateRequiredText(
    input.serviceAddress,
    'Service address is required.',
    errors,
  )
  validateRequiredText(input.createdBy, 'Created by is required.', errors)

  validateMaxLength(input.title, JOB_TITLE_MAX_LENGTH, 'Job title', errors)
  validateMaxLength(
    input.description,
    JOB_DESCRIPTION_MAX_LENGTH,
    'Job description',
    errors,
  )
  validateMaxLength(
    input.customerName,
    JOB_CUSTOMER_NAME_MAX_LENGTH,
    'Customer name',
    errors,
  )
  validateMaxLength(
    input.customerPhone,
    JOB_PHONE_MAX_LENGTH,
    'Customer phone',
    errors,
  )
  validateMaxLength(
    input.serviceAddress,
    JOB_ADDRESS_MAX_LENGTH,
    'Service address',
    errors,
  )

  if (!validatePriority(input.priority)) {
    errors.push('Job priority is invalid.')
  }

  if (!Array.isArray(input.requiredSkills)) {
    errors.push('Required skills must be provided.')
  }

  if (input.attachments && !Array.isArray(input.attachments)) {
    errors.push('Attachments must be a list.')
  }

  if (
    input.dueDate instanceof Date &&
    Number.isNaN(input.dueDate.getTime())
  ) {
    errors.push('Due date is invalid.')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

function validateRequiredText(
  value: unknown,
  message: string,
  errors: string[],
) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    errors.push(message)
  }
}

function validateMaxLength(
  value: unknown,
  maxLength: number,
  label: string,
  errors: string[],
) {
  if (typeof value === 'string' && value.length > maxLength) {
    errors.push(`${label} must be ${maxLength} characters or fewer.`)
  }
}
