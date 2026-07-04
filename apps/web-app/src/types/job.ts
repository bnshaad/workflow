import type { Timestamp } from 'firebase/firestore'

import type { TenantDocument } from './common'
import type { JobPriority } from './jobPriority'
import type { JobStatus } from './jobStatus'

export interface JobAttachment {
  id: string
  name: string
  url: string
  contentType: string
  uploadedBy: string
  uploadedAt: Timestamp
}

export interface JobAiRecommendation {
  recommendationId: string
  suggestedEmployeeIds: string[]
  confidenceScore: number
  summary: string
}

export type JobActivityType = 'employees_assigned' | 'status_changed'

export interface JobActivity extends TenantDocument {
  jobId: string
  type: JobActivityType
  fromStatus?: JobStatus
  toStatus?: JobStatus
  employeeIds?: string[]
  employeeNames?: string[]
  createdBy: string
  description: string
}

/**
 * Job is the central business entity in Workflow.
 *
 * Every job belongs to exactly one organization through organizationId. Future
 * AI modules extend this model through recommendation fields, and the Employee
 * Mobile app uses the same shared shape for assigned work.
 */
export interface Job extends TenantDocument {
  title: string
  description: string
  customerName: string
  customerPhone: string
  serviceAddress: string
  location: string
  priority: JobPriority
  status: JobStatus
  statusUpdatedAt: Timestamp | null
  statusUpdatedBy: string | null
  requiredSkills: string[]
  assignedEmployeeIds: string[]
  assignedAt: Timestamp | null
  assignedBy: string | null
  createdBy: string
  dueDate: Timestamp | null
  attachments: JobAttachment[]
  workProofCount: number
  issueCount: number
  aiRecommendation: JobAiRecommendation | null
  manualOverride: boolean
  overrideReason: string | null
  completedAt: Timestamp | null
}

export type CreateJobInput = Pick<
  Job,
  | 'title'
  | 'description'
  | 'customerName'
  | 'customerPhone'
  | 'serviceAddress'
  | 'location'
  | 'priority'
  | 'requiredSkills'
  | 'attachments'
> & {
  dueDate: Date | null
}

export type CreateJobValidationInput = CreateJobInput &
  Pick<Job, 'createdBy' | 'organizationId'>

export type UpdateJobInput = Partial<
  Pick<
    Job,
    | 'title'
    | 'description'
    | 'customerName'
    | 'customerPhone'
    | 'serviceAddress'
    | 'location'
    | 'priority'
    | 'requiredSkills'
    | 'dueDate'
    | 'attachments'
    | 'manualOverride'
    | 'overrideReason'
  >
>
