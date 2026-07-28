// Domain models — local copy from shared/domain/models/job.ts
// This is a local copy to avoid Metro bundler cross-boundary resolution issues.
// If the shared domain models change, update this file to match.

export type JobStatus =
  | 'draft'
  | 'open'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

export type JobPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface JobAttachment {
  contentType: string
  id: string
  name: string
  uploadedAt: unknown
  uploadedBy: string
  url: string
}

export interface Job {
  aiRecommendation: {
    confidenceScore: number
    recommendationId: string
    suggestedEmployeeIds: string[]
    summary: string
  } | null
  assignedAt: unknown | null
  assignedBy: string | null
  assignedEmployeeIds: string[]
  attachments: JobAttachment[]
  completedAt: unknown | null
  completedBy: string | null
  createdAt: unknown
  createdBy: string
  customerName: string
  customerPhone: string
  description: string
  dueDate: unknown | null
  id: string
  isActive: boolean
  issueCount: number
  location: string
  manualOverride: boolean
  organizationId: string
  overrideReason: string | null
  priority: JobPriority
  requiredSkills: string[]
  serviceAddress: string
  startedAt: unknown | null
  startedBy: string | null
  status: JobStatus
  statusUpdatedAt: unknown | null
  statusUpdatedBy: string | null
  title: string
  updatedAt: unknown
  workProofCount: number
}

export type JobActivityType =
  | 'employees_assigned'
  | 'employees_reassigned'
  | 'employees_unassigned'
  | 'employee_completed_job'
  | 'employee_started_job'
  | 'status_changed'

export interface JobActivity {
  createdAt: unknown
  createdBy: string
  description: string
  employeeId?: string
  employeeIds?: string[]
  employeeNames?: string[]
  fromStatus?: JobStatus
  id: string
  isActive: boolean
  jobId: string
  organizationId: string
  performedAt?: unknown
  performedBy?: string
  toStatus?: JobStatus
  type: JobActivityType
  updatedAt: unknown
}

export interface UserProfile {
  availability: 'available' | 'busy' | 'leave'
  createdAt: unknown
  email: string
  id: string
  isActive: boolean
  name?: string
  displayName?: string
  organizationId: string
  role: 'admin' | 'manager' | 'employee'
  skills: string[]
  updatedAt: unknown
}
