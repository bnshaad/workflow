import { FirebaseError } from 'firebase/app'
import {
  collection,
  getDocs,
  limit as limitResults,
  orderBy,
  query,
  Timestamp,
  where,
  type DocumentData,
  type Query,
  type QuerySnapshot,
} from 'firebase/firestore'
import { JOB_PRIORITY_OPTIONS, JOB_STATUS_OPTIONS } from '@/constants/jobConstants'
import { canViewDashboard } from '@/permissions'
import { requireActiveProfile, requireTenantAccess } from '@/services/common'
import { firestore } from '@/services/firestore'
import type { JobActivityType, UserProfile } from '@/types'
import type { JobPriority } from '@/types/jobPriority'
import { JobStatuses, type JobStatus } from '@/types/jobStatus'
import { validateJobStatus } from '@/validators/jobValidator'

const JOBS_COLLECTION = 'jobs'
const JOB_ACTIVITIES_COLLECTION = 'jobActivities'
const USERS_COLLECTION = 'users'
const DEFAULT_JOBS_LIMIT = 200
const DEFAULT_ACTIVITY_LIMIT = 12

type DashboardJobRecord = {
  assignedEmployeeIds: string[]
  dueDate: Timestamp | null
  id: string
  isActive: boolean
  organizationId: string
  priority: JobPriority
  status: JobStatus
  title: string
}

type DashboardEmployeeRecord = {
  displayName: string
  id: string
}

type DashboardActivityRecord = {
  createdAt: Timestamp
  createdBy: string
  id: string
  jobId: string
  performedBy?: string
  type: JobActivityType
}

export type DashboardJobMetrics = {
  dueDateJobCount: number
  overdueJobs: number
  priorityCounts: Record<JobPriority, number>
  statusCounts: Record<JobStatus, number>
  totalJobs: number
}

export type DashboardActionNeededSummary = {
  highPriorityOpenUnassignedJobs: number
  openUnassignedJobs: number
  overdueActiveJobs: number
}

export type EmployeeWorkloadSummary = {
  activeJobCount: number
  assignedJobCount: number
  displayName: string
  employeeId: string
  inProgressJobCount: number
}

export type RecentDashboardActivity = {
  activityType: JobActivityType
  id: string
  jobId: string
  jobTitle: string
  performedAt: Timestamp
  performerName: string
}

export type DashboardSummary = {
  actionNeeded: DashboardActionNeededSummary
  employeeWorkload: EmployeeWorkloadSummary[]
  jobMetrics: DashboardJobMetrics
  recentActivities: RecentDashboardActivity[]
}

export async function getDashboardSummary(
  profile: UserProfile,
  organizationId: string,
): Promise<DashboardSummary> {
  const activeProfile = requireDashboardAccess(profile, organizationId)
  const [jobs, employees, activities] = await Promise.all([
    readDashboardJobs(activeProfile.organizationId),
    readActiveEmployees(activeProfile.organizationId),
    readRecentActivities(activeProfile.organizationId, DEFAULT_ACTIVITY_LIMIT),
  ])

  return {
    actionNeeded: buildDashboardActionNeededSummary(jobs),
    employeeWorkload: buildEmployeeWorkloadSummary(employees, jobs),
    jobMetrics: buildDashboardJobMetrics(jobs),
    recentActivities: buildRecentActivitySummary(activities, jobs, employees),
  }
}

export async function getDashboardJobMetrics(
  profile: UserProfile,
  organizationId: string,
) {
  const activeProfile = requireDashboardAccess(profile, organizationId)
  const jobs = await readDashboardJobs(activeProfile.organizationId)

  return buildDashboardJobMetrics(jobs)
}

export async function getEmployeeWorkloadSummary(
  profile: UserProfile,
  organizationId: string,
) {
  const activeProfile = requireDashboardAccess(profile, organizationId)
  const [jobs, employees] = await Promise.all([
    readDashboardJobs(activeProfile.organizationId),
    readActiveEmployees(activeProfile.organizationId),
  ])

  return buildEmployeeWorkloadSummary(employees, jobs)
}

export async function getRecentJobActivities(
  profile: UserProfile,
  organizationId: string,
  activityLimit = DEFAULT_ACTIVITY_LIMIT,
) {
  const activeProfile = requireDashboardAccess(profile, organizationId)
  const [jobs, employees, activities] = await Promise.all([
    readDashboardJobs(activeProfile.organizationId),
    readActiveEmployees(activeProfile.organizationId),
    readRecentActivities(activeProfile.organizationId, activityLimit),
  ])

  return buildRecentActivitySummary(activities, jobs, employees)
}

function requireDashboardAccess(profile: UserProfile, organizationId: string) {
  const activeProfile = requireActiveProfile(profile)
  requireTenantAccess(activeProfile, organizationId)

  if (!canViewDashboard(activeProfile)) {
    throw new Error('You do not have permission to view dashboard metrics.')
  }

  return activeProfile
}

async function readDashboardJobs(organizationId: string) {
  const jobsQuery = query(
    collection(firestore, JOBS_COLLECTION),
    where('organizationId', '==', organizationId),
    where('isActive', '==', true),
    limitResults(DEFAULT_JOBS_LIMIT),
  )
  const snapshot = await getDocs(jobsQuery)

  return snapshot.docs.map((jobDocument) =>
    mapDashboardJob(jobDocument.id, jobDocument.data()),
  )
}

async function readActiveEmployees(organizationId: string) {
  const employeesQuery = query(
    collection(firestore, USERS_COLLECTION),
    where('organizationId', '==', organizationId),
    where('isActive', '==', true),
    where('role', '==', 'employee'),
  )
  const snapshot = await getDocs(employeesQuery)

  return snapshot.docs
    .map((employeeDocument) => mapDashboardEmployee(employeeDocument.data()))
    .sort((firstEmployee, secondEmployee) =>
      firstEmployee.displayName.localeCompare(secondEmployee.displayName),
    )
}

async function readRecentActivities(
  organizationId: string,
  activityLimit: number,
) {
  const activitiesQuery = query(
    collection(firestore, JOB_ACTIVITIES_COLLECTION),
    where('organizationId', '==', organizationId),
    where('isActive', '==', true),
    orderBy('createdAt', 'desc'),
    limitResults(activityLimit),
  )
  const snapshot = await getActivitiesSnapshotWithMissingIndexFallback(
    activitiesQuery,
    organizationId,
    activityLimit,
  )

  return snapshot.docs
    .map((activityDocument) => mapDashboardActivity(activityDocument.data()))
    .sort((firstActivity, secondActivity) => {
      return (
        secondActivity.createdAt.toMillis() - firstActivity.createdAt.toMillis()
      )
    })
    .slice(0, activityLimit)
}

function buildDashboardJobMetrics(
  jobs: DashboardJobRecord[],
): DashboardJobMetrics {
  const statusCounts = createStatusCounts()
  const priorityCounts = createPriorityCounts()
  const now = Timestamp.now().toMillis()
  let dueDateJobCount = 0
  let overdueJobs = 0

  for (const job of jobs) {
    statusCounts[job.status] += 1
    priorityCounts[job.priority] += 1

    if (job.dueDate) {
      dueDateJobCount += 1
    }

    if (
      job.dueDate &&
      job.dueDate.toMillis() < now &&
      job.status !== JobStatuses.Completed &&
      job.status !== JobStatuses.Cancelled
    ) {
      overdueJobs += 1
    }
  }

  return {
    dueDateJobCount,
    overdueJobs,
    priorityCounts,
    statusCounts,
    totalJobs: jobs.length,
  }
}

function buildDashboardActionNeededSummary(
  jobs: DashboardJobRecord[],
): DashboardActionNeededSummary {
  const now = Timestamp.now().toMillis()
  let highPriorityOpenUnassignedJobs = 0
  let openUnassignedJobs = 0
  let overdueActiveJobs = 0

  for (const job of jobs) {
    const isOpenUnassigned =
      job.status === JobStatuses.Open && job.assignedEmployeeIds.length === 0

    if (isOpenUnassigned) {
      openUnassignedJobs += 1
    }

    if (
      isOpenUnassigned &&
      (job.priority === 'Urgent' || job.priority === 'High')
    ) {
      highPriorityOpenUnassignedJobs += 1
    }

    if (
      job.dueDate &&
      job.dueDate.toMillis() < now &&
      job.status !== JobStatuses.Completed &&
      job.status !== JobStatuses.Cancelled
    ) {
      overdueActiveJobs += 1
    }
  }

  return {
    highPriorityOpenUnassignedJobs,
    openUnassignedJobs,
    overdueActiveJobs,
  }
}

function buildEmployeeWorkloadSummary(
  employees: DashboardEmployeeRecord[],
  jobs: DashboardJobRecord[],
) {
  return employees
    .map((employee) => {
      const assignedJobs = jobs.filter((job) =>
        job.assignedEmployeeIds.includes(employee.id),
      )

      return {
        activeJobCount: assignedJobs.filter(
          (job) =>
            job.status === JobStatuses.Assigned ||
            job.status === JobStatuses.InProgress,
        ).length,
        assignedJobCount: assignedJobs.filter(
          (job) => job.status === JobStatuses.Assigned,
        ).length,
        displayName: employee.displayName,
        employeeId: employee.id,
        inProgressJobCount: assignedJobs.filter(
          (job) => job.status === JobStatuses.InProgress,
        ).length,
      }
    })
    .sort((firstEmployee, secondEmployee) => {
      return secondEmployee.activeJobCount - firstEmployee.activeJobCount
    })
}

function buildRecentActivitySummary(
  activities: DashboardActivityRecord[],
  jobs: DashboardJobRecord[],
  employees: DashboardEmployeeRecord[],
) {
  const jobMap = new Map(jobs.map((job) => [job.id, job]))
  const employeeMap = new Map(
    employees.map((employee) => [employee.id, employee.displayName]),
  )

  return activities.map((activity) => {
    const performerId = activity.performedBy ?? activity.createdBy

    return {
      activityType: activity.type,
      id: activity.id,
      jobId: activity.jobId,
      jobTitle: jobMap.get(activity.jobId)?.title ?? activity.jobId,
      performedAt: activity.createdAt,
      performerName: employeeMap.get(performerId) ?? performerId,
    }
  })
}

async function getActivitiesSnapshotWithMissingIndexFallback(
  activitiesQuery: Query<DocumentData>,
  organizationId: string,
  activityLimit: number,
): Promise<QuerySnapshot<DocumentData>> {
  try {
    return await getDocs(activitiesQuery)
  } catch (error) {
    if (!isMissingIndexError(error)) {
      throw error
    }

    if (import.meta.env.DEV) {
      console.error(
        'Dashboard activity query requires a Firestore composite index. Falling back to a tenant-scoped activity query in development.',
        error,
      )
    }

    const fallbackQuery = query(
      collection(firestore, JOB_ACTIVITIES_COLLECTION),
      where('organizationId', '==', organizationId),
      where('isActive', '==', true),
      limitResults(activityLimit),
    )

    return getDocs(fallbackQuery)
  }
}

function createStatusCounts() {
  return JOB_STATUS_OPTIONS.reduce(
    (counts, status) => ({
      ...counts,
      [status]: 0,
    }),
    {} as Record<JobStatus, number>,
  )
}

function createPriorityCounts() {
  return JOB_PRIORITY_OPTIONS.reduce(
    (counts, priority) => ({
      ...counts,
      [priority]: 0,
    }),
    {} as Record<JobPriority, number>,
  )
}

function mapDashboardJob(
  id: string,
  data: DocumentData,
): DashboardJobRecord {
  return {
    assignedEmployeeIds: readStringArray(data.assignedEmployeeIds),
    dueDate: readTimestampOrNull(data.dueDate),
    id: readString(data, 'id', id),
    isActive: readBoolean(data, 'isActive'),
    organizationId: readString(data, 'organizationId'),
    priority: readJobPriority(data.priority),
    status: validateJobStatus(data.status) ? data.status : JobStatuses.Draft,
    title: readString(data, 'title', 'Untitled job'),
  }
}

function mapDashboardEmployee(data: DocumentData): DashboardEmployeeRecord {
  return {
    displayName: readString(data, 'displayName', 'Workflow employee'),
    id: readString(data, 'id'),
  }
}

function mapDashboardActivity(
  data: DocumentData,
): DashboardActivityRecord {
  return {
    createdAt: readTimestamp(data.createdAt),
    createdBy: readString(data, 'createdBy'),
    id: readString(data, 'id'),
    jobId: readString(data, 'jobId'),
    performedBy: readStringOrUndefined(data.performedBy),
    type: readJobActivityType(data.type),
  }
}

function readJobActivityType(value: unknown): JobActivityType {
  if (
    value === 'employees_assigned' ||
    value === 'employees_reassigned' ||
    value === 'employees_unassigned' ||
    value === 'employee_completed_job' ||
    value === 'employee_started_job' ||
    value === 'status_changed'
  ) {
    return value
  }

  return 'status_changed'
}

function readJobPriority(value: unknown): JobPriority {
  return JOB_PRIORITY_OPTIONS.includes(value as JobPriority)
    ? (value as JobPriority)
    : 'Medium'
}

function isMissingIndexError(error: unknown) {
  return (
    error instanceof FirebaseError &&
    error.code === 'failed-precondition' &&
    error.message.toLowerCase().includes('index')
  )
}

function readString(data: DocumentData, key: string, fallback = '') {
  const value = data[key]

  return typeof value === 'string' ? value : fallback
}

function readStringOrUndefined(value: unknown) {
  return typeof value === 'string' ? value : undefined
}

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

function readBoolean(data: DocumentData, key: string) {
  const value = data[key]

  return typeof value === 'boolean' ? value : false
}

function readTimestamp(value: unknown) {
  return value instanceof Timestamp ? value : Timestamp.fromMillis(0)
}

function readTimestampOrNull(value: unknown) {
  return value instanceof Timestamp ? value : null
}
