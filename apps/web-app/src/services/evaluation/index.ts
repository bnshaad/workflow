import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit as limitResults,
  query,
  Timestamp,
  where,
  type DocumentData,
} from 'firebase/firestore'
import { canViewDashboard } from '@/permissions'
import { requireActiveProfile, requireTenantAccess } from '@/services/common'
import { firestore } from '@/services/firestore'
import type { UserProfile } from '@/types'
import { JobStatuses, type JobStatus } from '@/types/jobStatus'
import { validateJobStatus } from '@/validators/jobValidator'

const AUDIT_LOGS_COLLECTION = 'auditLogs'
const JOBS_COLLECTION = 'jobs'
const USERS_COLLECTION = 'users'
const DEFAULT_MANUAL_ASSIGNMENT_LIMIT = 200

type ManualAssignmentAuditRecord = {
  assignedEmployeeIds: string[]
  createdAt: Timestamp
  jobId: string
}

type BaselineJobRecord = {
  assignedAt: Timestamp | null
  assignedEmployeeIds: string[]
  completedAt: Timestamp | null
  dueDate: Timestamp | null
  id: string
  organizationId: string
  startedAt: Timestamp | null
  status: JobStatus
}

type EmployeeRecord = {
  displayName: string
  id: string
}

export type ManualAssignmentEmployeeCount = {
  assignmentCount: number
  displayName: string
  employeeId: string
}

export type AssignmentDistributionSummary = {
  average: number
  highest: number
  lowest: number
}

export type ManualAssignmentBaselineMetrics = {
  assignmentCountByEmployee: ManualAssignmentEmployeeCount[]
  assignmentDistribution: AssignmentDistributionSummary
  averageAssignedToCompletedHours: number | null
  averageAssignedToStartedHours: number | null
  completedJobs: number
  completionRate: number
  jobsCompletedOverdue: number
  jobsWithDueDate: number
  overdueCompletionRate: number | null
  jobsStarted: number
  totalManualAssignments: number
}

export async function getManualAssignmentBaselineMetrics(
  profile: UserProfile,
  organizationId: string,
): Promise<ManualAssignmentBaselineMetrics> {
  const activeProfile = requireEvaluationAccess(profile, organizationId)
  const [manualAssignmentAudits, employees] = await Promise.all([
    readManualAssignmentAudits(activeProfile.organizationId),
    readActiveEmployees(activeProfile.organizationId),
  ])
  const jobs = await readLinkedJobs(
    activeProfile.organizationId,
    manualAssignmentAudits.map((audit) => audit.jobId),
  )

  return buildManualAssignmentBaselineMetrics(
    manualAssignmentAudits,
    jobs,
    employees,
  )
}

function requireEvaluationAccess(profile: UserProfile, organizationId: string) {
  const activeProfile = requireActiveProfile(profile)
  requireTenantAccess(activeProfile, organizationId)

  if (!canViewDashboard(activeProfile)) {
    throw new Error('You do not have permission to view assignment metrics.')
  }

  return activeProfile
}

async function readManualAssignmentAudits(organizationId: string) {
  const auditsQuery = query(
    collection(firestore, AUDIT_LOGS_COLLECTION),
    where('organizationId', '==', organizationId),
    where('isActive', '==', true),
    where('entityType', '==', 'job'),
    where('action', '==', 'job_employees_assigned'),
    where('metadata.assignmentMode', '==', 'manual'),
    limitResults(DEFAULT_MANUAL_ASSIGNMENT_LIMIT),
  )
  const snapshot = await getDocs(auditsQuery)

  return snapshot.docs
    .map((auditDocument) => mapManualAssignmentAudit(auditDocument.data()))
    .filter((audit) => audit.jobId.length > 0)
}

async function readLinkedJobs(organizationId: string, jobIds: string[]) {
  const uniqueJobIds = Array.from(new Set(jobIds.filter(Boolean)))
  const jobs = await Promise.all(
    uniqueJobIds.map(async (jobId) => {
      const jobSnapshot = await getDoc(doc(firestore, JOBS_COLLECTION, jobId))

      if (!jobSnapshot.exists()) {
        return null
      }

      const job = mapBaselineJob(jobSnapshot.id, jobSnapshot.data())

      return job.organizationId === organizationId ? job : null
    }),
  )

  return jobs.filter((job): job is BaselineJobRecord => job !== null)
}

async function readActiveEmployees(organizationId: string) {
  const employeesQuery = query(
    collection(firestore, USERS_COLLECTION),
    where('organizationId', '==', organizationId),
    where('isActive', '==', true),
    where('role', '==', 'employee'),
  )
  const snapshot = await getDocs(employeesQuery)

  return snapshot.docs.map((employeeDocument) =>
    mapEmployee(employeeDocument.data()),
  )
}

function buildManualAssignmentBaselineMetrics(
  audits: ManualAssignmentAuditRecord[],
  jobs: BaselineJobRecord[],
  employees: EmployeeRecord[],
): ManualAssignmentBaselineMetrics {
  const jobsById = new Map(jobs.map((job) => [job.id, job]))
  const employeeNamesById = new Map(
    employees.map((employee) => [employee.id, employee.displayName]),
  )
  const assignmentCounts = new Map(
    employees.map((employee) => [employee.id, 0]),
  )
  const assignedToStartedHours: number[] = []
  const assignedToCompletedHours: number[] = []
  let jobsStarted = 0
  let completedJobs = 0
  let jobsWithDueDate = 0
  let jobsCompletedOverdue = 0

  for (const audit of audits) {
    for (const employeeId of audit.assignedEmployeeIds) {
      assignmentCounts.set(employeeId, (assignmentCounts.get(employeeId) ?? 0) + 1)
    }

    const job = jobsById.get(audit.jobId)

    if (!job) {
      continue
    }

    if (job.startedAt) {
      jobsStarted += 1
    }

    if (job.status === JobStatuses.Completed && job.completedAt) {
      completedJobs += 1
    }

    const assignedToStarted = getValidHoursBetween(job.assignedAt, job.startedAt)

    if (assignedToStarted !== null) {
      assignedToStartedHours.push(assignedToStarted)
    }

    const assignedToCompleted = getValidHoursBetween(
      job.assignedAt,
      job.completedAt,
    )

    if (assignedToCompleted !== null) {
      assignedToCompletedHours.push(assignedToCompleted)
    }

    if (job.dueDate) {
      jobsWithDueDate += 1
    }

    if (job.dueDate && job.completedAt && job.completedAt.toMillis() > job.dueDate.toMillis()) {
      jobsCompletedOverdue += 1
    }
  }

  const assignmentCountByEmployee = Array.from(assignmentCounts.entries())
    .map(([employeeId, assignmentCount]) => ({
      assignmentCount,
      displayName: employeeNamesById.get(employeeId) ?? employeeId,
      employeeId,
    }))
    .sort((firstEmployee, secondEmployee) => {
      return secondEmployee.assignmentCount - firstEmployee.assignmentCount
    })

  return {
    assignmentCountByEmployee,
    assignmentDistribution: summarizeAssignmentDistribution(
      assignmentCountByEmployee,
    ),
    averageAssignedToCompletedHours: averageOrNull(assignedToCompletedHours),
    averageAssignedToStartedHours: averageOrNull(assignedToStartedHours),
    completedJobs,
    completionRate: rate(completedJobs, audits.length),
    jobsCompletedOverdue,
    jobsStarted,
    jobsWithDueDate,
    overdueCompletionRate:
      jobsWithDueDate > 0 ? rate(jobsCompletedOverdue, jobsWithDueDate) : null,
    totalManualAssignments: audits.length,
  }
}

function summarizeAssignmentDistribution(
  assignmentCountByEmployee: ManualAssignmentEmployeeCount[],
) {
  if (assignmentCountByEmployee.length === 0) {
    return {
      average: 0,
      highest: 0,
      lowest: 0,
    }
  }

  const counts = assignmentCountByEmployee.map(
    (employee) => employee.assignmentCount,
  )

  return {
    average: averageOrNull(counts) ?? 0,
    highest: Math.max(...counts),
    lowest: Math.min(...counts),
  }
}

function mapManualAssignmentAudit(
  data: DocumentData,
): ManualAssignmentAuditRecord {
  return {
    assignedEmployeeIds: readStringArray(data.metadata?.newEmployeeIds),
    createdAt: readTimestamp(data.createdAt),
    jobId: readString(data.metadata ?? {}, 'jobId', readString(data, 'entityId')),
  }
}

function mapBaselineJob(id: string, data: DocumentData): BaselineJobRecord {
  return {
    assignedAt: readTimestampOrNull(data.assignedAt),
    assignedEmployeeIds: readStringArray(data.assignedEmployeeIds),
    completedAt: readTimestampOrNull(data.completedAt),
    dueDate: readTimestampOrNull(data.dueDate),
    id: readString(data, 'id', id),
    organizationId: readString(data, 'organizationId'),
    startedAt: readTimestampOrNull(data.startedAt),
    status: validateJobStatus(data.status) ? data.status : JobStatuses.Draft,
  }
}

function mapEmployee(data: DocumentData): EmployeeRecord {
  return {
    displayName: readString(data, 'displayName', 'Workflow employee'),
    id: readString(data, 'id'),
  }
}

function getValidHoursBetween(
  start: Timestamp | null,
  end: Timestamp | null,
) {
  if (!start || !end || end.toMillis() < start.toMillis()) {
    return null
  }

  return (end.toMillis() - start.toMillis()) / 3_600_000
}

function averageOrNull(values: number[]) {
  if (values.length === 0) {
    return null
  }

  return values.reduce((total, value) => total + value, 0) / values.length
}

function rate(value: number, total: number) {
  return total > 0 ? value / total : 0
}

function readString(data: DocumentData, key: string, fallback = '') {
  const value = data[key]

  return typeof value === 'string' ? value : fallback
}

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

function readTimestamp(value: unknown) {
  return value instanceof Timestamp ? value : Timestamp.fromMillis(0)
}

function readTimestampOrNull(value: unknown) {
  return value instanceof Timestamp ? value : null
}
