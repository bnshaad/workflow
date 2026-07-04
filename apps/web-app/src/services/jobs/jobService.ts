import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit as limitResults,
  orderBy,
  query,
  setDoc,
  Timestamp,
  where,
  writeBatch,
  type DocumentData,
  type Query,
  type QuerySnapshot,
} from 'firebase/firestore'
import { FirebaseError } from 'firebase/app'
import { firestore } from '@/services/firestore'
import { requireActiveProfile, requireTenantAccess } from '@/services/common'
import { DEFAULT_JOB_STATUS } from '@/constants/jobConstants'
import { canAssignWorker, canEditJob, Roles } from '@/permissions'
import type {
  CreateJobInput,
  Job,
  JobActivity,
  UpdateJobInput,
} from '@/types/job'
import { JobPriorities, type JobPriority } from '@/types/jobPriority'
import {
  canTransitionJobStatus,
  JobStatuses,
  JOB_STATUS_LABELS,
  type JobStatus,
} from '@/types/jobStatus'
import type { UserProfile } from '@/types/user'
import {
  validateCreateJob,
  validateJobStatus,
} from '@/validators/jobValidator'

export interface JobService {
  createJob(profile: UserProfile, input: CreateJobInput): Promise<Job>
  getJobActivities(
    profile: UserProfile,
    jobId: string,
    organizationId: string,
    options?: ListJobActivitiesOptions,
  ): Promise<JobActivity[]>
  getJob(
    profile: UserProfile,
    jobId: string,
    organizationId: string,
  ): Promise<Job | null>
  listAssignableEmployees(
    profile: UserProfile,
    organizationId: string,
  ): Promise<UserProfile[]>
  listJobs(
    profile: UserProfile,
    organizationId: string,
    options?: ListJobsOptions,
  ): Promise<Job[]>
  listAssignedJobs(
    profile: UserProfile,
    organizationId: string,
    options?: ListJobsOptions,
  ): Promise<Job[]>
  getAssignedJob(
    profile: UserProfile,
    jobId: string,
    organizationId: string,
  ): Promise<Job | null>
  getAssignedJobsForEmployee(
    profile: UserProfile,
    organizationId: string,
    employeeId: string,
    options?: ListJobsOptions,
  ): Promise<Job[]>
  updateJob(
    profile: UserProfile,
    jobId: string,
    organizationId: string,
    updates: UpdateJobInput,
  ): Promise<Job>
  updateJobStatus(
    profile: UserProfile,
    jobId: string,
    organizationId: string,
    status: JobStatus,
  ): Promise<JobStatusUpdateResult>
  assignEmployeesToJob(
    profile: UserProfile,
    jobId: string,
    organizationId: string,
    employeeIds: string[],
  ): Promise<JobAssignmentResult>
  updateAssignedEmployees(
    profile: UserProfile,
    jobId: string,
    organizationId: string,
    employeeIds: string[],
  ): Promise<JobAssignmentResult>
  unassignEmployeesFromJob(
    profile: UserProfile,
    jobId: string,
    organizationId: string,
  ): Promise<JobAssignmentResult>
  assignEmployees(
    profile: UserProfile,
    jobId: string,
    organizationId: string,
    employeeIds: string[],
  ): Promise<Job>
  updateStatus(
    profile: UserProfile,
    jobId: string,
    organizationId: string,
    status: JobStatus,
  ): Promise<Job>
  startAssignedJob(
    profile: UserProfile,
    organizationId: string,
    jobId: string,
    employeeId: string,
  ): Promise<JobStatusUpdateResult>
  completeAssignedJob(
    profile: UserProfile,
    organizationId: string,
    jobId: string,
    employeeId: string,
  ): Promise<JobStatusUpdateResult>
}

const JOBS_COLLECTION = 'jobs'
const JOB_ACTIVITIES_COLLECTION = 'jobActivities'
const AUDIT_LOGS_COLLECTION = 'auditLogs'
const USERS_COLLECTION = 'users'
const DEFAULT_JOBS_LIMIT = 25
const DEFAULT_JOB_ACTIVITIES_LIMIT = 25

export type ListJobsOptions = {
  limit?: number
}

export type ListJobActivitiesOptions = {
  limit?: number
}

export type JobStatusUpdateResult = {
  activity: JobActivity
  job: Job
}

export type JobAssignmentResult = {
  activity: JobActivity
  assignedEmployees: UserProfile[]
  job: Job
}

export class JobValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'JobValidationError'
  }
}

/**
 * Jobs are stored in the approved Firestore jobs collection. Every method
 * scopes access by organizationId before reading or writing business data.
 */
export const jobService: JobService = {
  async createJob(profile, input) {
    const activeProfile = requireActiveProfile(profile)
    const organizationId = requireTenantAccess(
      activeProfile,
      activeProfile.organizationId,
    )

    const validation = validateCreateJob({
      ...input,
      createdBy: activeProfile.id,
      organizationId,
    })

    if (!validation.isValid) {
      throw new JobValidationError(validation.errors.join(' '))
    }

    const jobReference = doc(collection(firestore, JOBS_COLLECTION))
    const timestamp = Timestamp.now()
    const job: Job = {
      id: jobReference.id,
      organizationId,
      title: input.title.trim(),
      description: input.description.trim(),
      customerName: input.customerName.trim(),
      customerPhone: input.customerPhone.trim(),
      serviceAddress: input.serviceAddress.trim(),
      location: input.location.trim(),
      priority: input.priority,
      status: DEFAULT_JOB_STATUS,
      statusUpdatedAt: null,
      statusUpdatedBy: null,
      requiredSkills: input.requiredSkills,
      assignedEmployeeIds: [],
      assignedAt: null,
      assignedBy: null,
      startedAt: null,
      startedBy: null,
      createdBy: activeProfile.id,
      createdAt: timestamp,
      updatedAt: timestamp,
      dueDate: input.dueDate ? Timestamp.fromDate(input.dueDate) : null,
      attachments: [],
      workProofCount: 0,
      issueCount: 0,
      aiRecommendation: null,
      manualOverride: false,
      overrideReason: null,
      completedAt: null,
      completedBy: null,
      isActive: true,
    }

    // Future: add audit log entry, notification fan-out, and AI Job Understanding hooks.
    await setDoc(jobReference, job)

    return job
  },

  async listAssignableEmployees(profile, organizationId) {
    requireTenantAccess(profile, organizationId)

    const employeesQuery = query(
      collection(firestore, USERS_COLLECTION),
      where('organizationId', '==', organizationId),
      where('isActive', '==', true),
      where('role', '==', 'employee'),
    )
    const snapshot = await getDocs(employeesQuery)

    return snapshot.docs
      .map((employeeDocument) => employeeDocument.data() as UserProfile)
      .sort((firstEmployee, secondEmployee) =>
        firstEmployee.displayName.localeCompare(secondEmployee.displayName),
      )
  },

  async getJobActivities(profile, jobId, organizationId, options) {
    requireTenantAccess(profile, organizationId)
    requireJobId(jobId)

    const activitiesQuery = query(
      collection(firestore, JOB_ACTIVITIES_COLLECTION),
      where('organizationId', '==', organizationId),
      where('jobId', '==', jobId),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc'),
      limitResults(options?.limit ?? DEFAULT_JOB_ACTIVITIES_LIMIT),
    )
    const snapshot = await getDocs(activitiesQuery)

    return snapshot.docs.map(
      (activityDocument) => mapJobActivity(activityDocument.data()),
    )
  },

  async getJob(profile, jobId, organizationId) {
    requireTenantAccess(profile, organizationId)
    requireJobId(jobId)

    const jobSnapshot = await getDoc(doc(firestore, JOBS_COLLECTION, jobId))

    if (!jobSnapshot.exists()) {
      return null
    }

    const job = mapJob(jobSnapshot.id, jobSnapshot.data())

    if (!job.isActive || job.organizationId !== organizationId) {
      return null
    }

    requireTenantAccess(profile, job.organizationId)

    return job
  },

  async listJobs(profile, organizationId, options) {
    requireTenantAccess(profile, organizationId)

    const jobsQuery = query(
      collection(firestore, JOBS_COLLECTION),
      where('organizationId', '==', organizationId),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc'),
      limitResults(options?.limit ?? DEFAULT_JOBS_LIMIT),
    )
    const snapshot = await getJobsSnapshotWithMissingIndexFallback(
      jobsQuery,
      organizationId,
      options?.limit ?? DEFAULT_JOBS_LIMIT,
    )

    return snapshot.docs
      .map((jobDocument) => {
        return mapJob(jobDocument.id, jobDocument.data())
      })
      .sort((firstJob, secondJob) => {
        return secondJob.createdAt.toMillis() - firstJob.createdAt.toMillis()
      })
      .slice(0, options?.limit ?? DEFAULT_JOBS_LIMIT)
  },

  async listAssignedJobs(profile, organizationId, options) {
    const activeProfile = requireEmployeeProfile(profile)
    requireTenantAccess(activeProfile, organizationId)

    const assignedJobsQuery = query(
      collection(firestore, JOBS_COLLECTION),
      where('organizationId', '==', organizationId),
      where('isActive', '==', true),
      where('assignedEmployeeIds', 'array-contains', activeProfile.id),
      orderBy('createdAt', 'desc'),
      limitResults(options?.limit ?? DEFAULT_JOBS_LIMIT),
    )
    const snapshot = await getEmployeeJobsSnapshotWithMissingIndexFallback(
      assignedJobsQuery,
      organizationId,
      activeProfile.id,
      options?.limit ?? DEFAULT_JOBS_LIMIT,
    )

    return snapshot.docs
      .map((jobDocument) => {
        return mapJob(jobDocument.id, jobDocument.data())
      })
      .filter((job) => isAssignedToEmployee(job, activeProfile.id))
      .sort((firstJob, secondJob) => {
        return secondJob.createdAt.toMillis() - firstJob.createdAt.toMillis()
      })
      .slice(0, options?.limit ?? DEFAULT_JOBS_LIMIT)
  },

  async getAssignedJob(profile, jobId, organizationId) {
    const activeProfile = requireEmployeeProfile(profile)
    requireTenantAccess(activeProfile, organizationId)
    requireJobId(jobId)

    const jobSnapshot = await getDoc(doc(firestore, JOBS_COLLECTION, jobId))

    if (!jobSnapshot.exists()) {
      return null
    }

    const job = mapJob(jobSnapshot.id, jobSnapshot.data())

    if (
      !job.isActive ||
      job.organizationId !== organizationId ||
      !isAssignedToEmployee(job, activeProfile.id)
    ) {
      return null
    }

    return job
  },

  async getAssignedJobsForEmployee(profile, organizationId, employeeId, options) {
    const activeProfile = requireEmployeeProfile(profile)
    requireEmployeeIdentity(activeProfile, employeeId)

    return jobService.listAssignedJobs(activeProfile, organizationId, options)
  },

  async updateJob(profile, jobId, organizationId, updates) {
    requireTenantAccess(profile, organizationId)
    requireJobId(jobId)
    requireUpdates(updates)

    return throwNotImplemented()
  },

  async updateJobStatus(profile, jobId, organizationId, status) {
    return updateJobStatus(profile, jobId, organizationId, status)
  },

  async assignEmployeesToJob(profile, jobId, organizationId, employeeIds) {
    return assignEmployeesToJob(profile, jobId, organizationId, employeeIds)
  },

  async updateAssignedEmployees(profile, jobId, organizationId, employeeIds) {
    return updateAssignedEmployees(profile, jobId, organizationId, employeeIds)
  },

  async unassignEmployeesFromJob(profile, jobId, organizationId) {
    return updateAssignedEmployees(profile, jobId, organizationId, [])
  },

  async assignEmployees(profile, jobId, organizationId, employeeIds) {
    const result = await assignEmployeesToJob(
      profile,
      jobId,
      organizationId,
      employeeIds,
    )

    return result.job
  },

  async updateStatus(profile, jobId, organizationId, status) {
    const result = await updateJobStatus(profile, jobId, organizationId, status)

    return result.job
  },

  async startAssignedJob(profile, organizationId, jobId, employeeId) {
    return updateEmployeeJobStatus(
      profile,
      jobId,
      organizationId,
      employeeId,
      JobStatuses.InProgress,
    )
  },

  async completeAssignedJob(profile, organizationId, jobId, employeeId) {
    return updateEmployeeJobStatus(
      profile,
      jobId,
      organizationId,
      employeeId,
      JobStatuses.Completed,
    )
  },
}

async function updateJobStatus(
  profile: UserProfile,
  jobId: string,
  organizationId: string,
  status: JobStatus,
) {
  const activeProfile = requireActiveProfile(profile)
  requireTenantAccess(activeProfile, organizationId)
  requireJobId(jobId)

  if (!canEditJob(activeProfile)) {
    throw new Error('You do not have permission to update job status.')
  }

  if (!validateJobStatus(status)) {
    throw new Error('Job status is invalid.')
  }

  if (status === JobStatuses.Assigned) {
    throw new Error('Use job assignment to move a job to assigned status.')
  }

  const jobReference = doc(firestore, JOBS_COLLECTION, jobId)
  const jobSnapshot = await getDoc(jobReference)

  if (!jobSnapshot.exists()) {
    throw new Error('Job not found.')
  }

  const currentJob = jobSnapshot.data() as Job

  if (!currentJob.isActive || currentJob.organizationId !== organizationId) {
    throw new Error('Job not found.')
  }

  requireTenantAccess(activeProfile, currentJob.organizationId)

  if (currentJob.status === status) {
    throw new Error('Job already has this status.')
  }

  if (!canTransitionJobStatus(currentJob.status, status)) {
    throw new Error('This status transition is not allowed.')
  }

  const timestamp = Timestamp.now()
  const activityReference = doc(collection(firestore, JOB_ACTIVITIES_COLLECTION))
  const auditLogReference = doc(collection(firestore, AUDIT_LOGS_COLLECTION))
  const activity: JobActivity = {
    id: activityReference.id,
    organizationId,
    isActive: true,
    createdAt: timestamp,
    updatedAt: timestamp,
    jobId,
    type: 'status_changed',
    fromStatus: currentJob.status,
    toStatus: status,
    createdBy: activeProfile.id,
    description: `Status changed from ${JOB_STATUS_LABELS[currentJob.status]} to ${JOB_STATUS_LABELS[status]}.`,
  }
  const updatedJob: Job = {
    ...currentJob,
    status,
    statusUpdatedAt: timestamp,
    statusUpdatedBy: activeProfile.id,
    updatedAt: timestamp,
  }
  const auditLog = {
    id: auditLogReference.id,
    organizationId,
    isActive: true,
    createdAt: timestamp,
    updatedAt: timestamp,
    actorId: activeProfile.id,
    action: 'job.status_updated',
    entityId: jobId,
    entityType: 'job',
    metadata: {
      fromStatus: currentJob.status,
      toStatus: status,
    },
  }
  const batch = writeBatch(firestore)

  batch.update(jobReference, {
    status,
    statusUpdatedAt: timestamp,
    statusUpdatedBy: activeProfile.id,
    updatedAt: timestamp,
  })
  batch.set(activityReference, activity)
  batch.set(auditLogReference, auditLog)

  await batch.commit()

  return {
    activity,
    job: updatedJob,
  }
}

async function updateEmployeeJobStatus(
  profile: UserProfile,
  jobId: string,
  organizationId: string,
  employeeId: string,
  status: JobStatus,
) {
  const activeProfile = requireEmployeeProfile(profile)
  requireEmployeeIdentity(activeProfile, employeeId)
  requireTenantAccess(activeProfile, organizationId)
  requireJobId(jobId)

  if (
    status !== JobStatuses.InProgress &&
    status !== JobStatuses.Completed
  ) {
    throw new Error('Employee status transition is not allowed.')
  }

  const jobReference = doc(firestore, JOBS_COLLECTION, jobId)
  const jobSnapshot = await getDoc(jobReference)

  if (!jobSnapshot.exists()) {
    throw new Error('Job not found.')
  }

  const currentJob = mapJob(jobSnapshot.id, jobSnapshot.data())

  if (
    !currentJob.isActive ||
    currentJob.organizationId !== organizationId ||
    !isAssignedToEmployee(currentJob, activeProfile.id)
  ) {
    throw new Error('Job not found.')
  }

  requireTenantAccess(activeProfile, currentJob.organizationId)

  if (!isAllowedEmployeeStatusTransition(currentJob.status, status)) {
    throw new Error('This employee status transition is not allowed.')
  }

  const timestamp = Timestamp.now()
  const activityReference = doc(collection(firestore, JOB_ACTIVITIES_COLLECTION))
  const auditLogReference = doc(collection(firestore, AUDIT_LOGS_COLLECTION))
  const isCompletion = status === JobStatuses.Completed
  const activityType = isCompletion
    ? 'employee_completed_job'
    : 'employee_started_job'
  const auditAction = isCompletion
    ? 'job_completed_by_employee'
    : 'job_started_by_employee'
  const description = isCompletion
    ? 'Employee completed the job.'
    : 'Employee started the job.'
  const activity: JobActivity = {
    id: activityReference.id,
    organizationId,
    isActive: true,
    createdAt: timestamp,
    updatedAt: timestamp,
    jobId,
    type: activityType,
    fromStatus: currentJob.status,
    toStatus: status,
    employeeId: activeProfile.id,
    performedAt: timestamp,
    performedBy: activeProfile.id,
    createdBy: activeProfile.id,
    description,
  }
  const updatedJob: Job = {
    ...currentJob,
    status,
    statusUpdatedAt: timestamp,
    statusUpdatedBy: activeProfile.id,
    startedAt: isCompletion ? currentJob.startedAt : timestamp,
    startedBy: isCompletion ? currentJob.startedBy : activeProfile.id,
    updatedAt: timestamp,
    completedAt: isCompletion ? timestamp : currentJob.completedAt,
    completedBy: isCompletion ? activeProfile.id : currentJob.completedBy,
  }
  const auditLog = {
    id: auditLogReference.id,
    organizationId,
    isActive: true,
    createdAt: timestamp,
    updatedAt: timestamp,
    actorId: activeProfile.id,
    action: auditAction,
    entityId: jobId,
    entityType: 'job',
    metadata: {
      employeeId: activeProfile.id,
      fromStatus: currentJob.status,
      jobId,
      organizationId,
      performedAt: timestamp,
      performedBy: activeProfile.id,
      toStatus: status,
    },
  }
  const batch = writeBatch(firestore)

  batch.update(jobReference, {
    status,
    statusUpdatedAt: timestamp,
    statusUpdatedBy: activeProfile.id,
    updatedAt: timestamp,
    ...(isCompletion
      ? { completedAt: timestamp, completedBy: activeProfile.id }
      : { startedAt: timestamp, startedBy: activeProfile.id }),
  })
  batch.set(activityReference, activity)
  batch.set(auditLogReference, auditLog)

  await batch.commit()

  return {
    activity,
    job: updatedJob,
  }
}

async function assignEmployeesToJob(
  profile: UserProfile,
  jobId: string,
  organizationId: string,
  employeeIds: string[],
) {
  const activeProfile = requireActiveProfile(profile)
  requireTenantAccess(activeProfile, organizationId)
  requireJobId(jobId)

  if (!canAssignWorker(activeProfile)) {
    throw new Error('You do not have permission to assign employees.')
  }

  if (!Array.isArray(employeeIds)) {
    throw new Error('Employee IDs must be a list.')
  }

  const uniqueEmployeeIds = Array.from(
    new Set(employeeIds.map((employeeId) => employeeId.trim()).filter(Boolean)),
  )

  if (uniqueEmployeeIds.length === 0) {
    throw new Error('Select at least one employee.')
  }

  const jobReference = doc(firestore, JOBS_COLLECTION, jobId)
  const jobSnapshot = await getDoc(jobReference)

  if (!jobSnapshot.exists()) {
    throw new Error('Job not found.')
  }

  const currentJob = jobSnapshot.data() as Job

  if (!currentJob.isActive || currentJob.organizationId !== organizationId) {
    throw new Error('Job not found.')
  }

  requireTenantAccess(activeProfile, currentJob.organizationId)

  if (currentJob.status !== JobStatuses.Open) {
    throw new Error('Only open jobs can be assigned.')
  }

  const assignedEmployees = await getEligibleEmployeesById(
    activeProfile,
    organizationId,
    uniqueEmployeeIds,
  )

  const timestamp = Timestamp.now()
  const activityReference = doc(collection(firestore, JOB_ACTIVITIES_COLLECTION))
  const auditLogReference = doc(collection(firestore, AUDIT_LOGS_COLLECTION))
  const employeeNames = assignedEmployees.map((employee) => employee.displayName)
  const activity: JobActivity = {
    id: activityReference.id,
    organizationId,
    isActive: true,
    createdAt: timestamp,
    updatedAt: timestamp,
    jobId,
    type: 'employees_assigned',
    fromStatus: currentJob.status,
    toStatus: JobStatuses.Assigned,
    employeeIds: uniqueEmployeeIds,
    employeeNames,
    createdBy: activeProfile.id,
    description: `Assigned ${employeeNames.join(', ')}.`,
  }
  const updatedJob: Job = {
    ...currentJob,
    assignedEmployeeIds: uniqueEmployeeIds,
    assignedAt: timestamp,
    assignedBy: activeProfile.id,
    status: JobStatuses.Assigned,
    statusUpdatedAt: timestamp,
    statusUpdatedBy: activeProfile.id,
    updatedAt: timestamp,
  }
  const auditLog = {
    id: auditLogReference.id,
    organizationId,
    isActive: true,
    createdAt: timestamp,
    updatedAt: timestamp,
    actorId: activeProfile.id,
    action: 'job_employees_assigned',
    entityId: jobId,
    entityType: 'job',
    metadata: {
      assignmentMode: 'manual',
      employeeIds: uniqueEmployeeIds,
      employeeNames,
      fromStatus: currentJob.status,
      jobId,
      previousEmployeeIds: currentJob.assignedEmployeeIds,
      newEmployeeIds: uniqueEmployeeIds,
      newEmployeeNames: employeeNames,
      toStatus: JobStatuses.Assigned,
    },
  }
  const batch = writeBatch(firestore)

  batch.update(jobReference, {
    assignedEmployeeIds: uniqueEmployeeIds,
    assignedAt: timestamp,
    assignedBy: activeProfile.id,
    status: JobStatuses.Assigned,
    statusUpdatedAt: timestamp,
    statusUpdatedBy: activeProfile.id,
    updatedAt: timestamp,
  })
  batch.set(activityReference, activity)
  batch.set(auditLogReference, auditLog)

  await batch.commit()

  return {
    activity,
    assignedEmployees,
    job: updatedJob,
  }
}

async function updateAssignedEmployees(
  profile: UserProfile,
  jobId: string,
  organizationId: string,
  employeeIds: string[],
) {
  const activeProfile = requireActiveProfile(profile)
  requireTenantAccess(activeProfile, organizationId)
  requireJobId(jobId)

  if (!canAssignWorker(activeProfile)) {
    throw new Error('You do not have permission to update assignments.')
  }

  if (!Array.isArray(employeeIds)) {
    throw new Error('Employee IDs must be a list.')
  }

  const uniqueEmployeeIds = normalizeEmployeeIds(employeeIds)
  const jobReference = doc(firestore, JOBS_COLLECTION, jobId)
  const jobSnapshot = await getDoc(jobReference)

  if (!jobSnapshot.exists()) {
    throw new Error('Job not found.')
  }

  const currentJob = mapJob(jobSnapshot.id, jobSnapshot.data())

  if (!currentJob.isActive || currentJob.organizationId !== organizationId) {
    throw new Error('Job not found.')
  }

  requireTenantAccess(activeProfile, currentJob.organizationId)

  if (currentJob.status !== JobStatuses.Assigned) {
    throw new Error('Only assigned jobs can have assignment changes.')
  }

  const assignedEmployees =
    uniqueEmployeeIds.length > 0
      ? await getEligibleEmployeesById(
          activeProfile,
          organizationId,
          uniqueEmployeeIds,
        )
      : []
  const timestamp = Timestamp.now()
  const nextStatus =
    uniqueEmployeeIds.length > 0 ? JobStatuses.Assigned : JobStatuses.Open
  const activityType =
    uniqueEmployeeIds.length > 0
      ? 'employees_reassigned'
      : 'employees_unassigned'
  const employeeNames = assignedEmployees.map((employee) => employee.displayName)
  const description =
    uniqueEmployeeIds.length > 0
      ? `Updated assigned employees to ${employeeNames.join(', ')}.`
      : 'Removed all assigned employees.'
  const activityReference = doc(collection(firestore, JOB_ACTIVITIES_COLLECTION))
  const auditLogReference = doc(collection(firestore, AUDIT_LOGS_COLLECTION))
  const activity: JobActivity = {
    id: activityReference.id,
    organizationId,
    isActive: true,
    createdAt: timestamp,
    updatedAt: timestamp,
    jobId,
    type: activityType,
    fromStatus: currentJob.status,
    toStatus: nextStatus,
    employeeIds: uniqueEmployeeIds,
    employeeNames,
    createdBy: activeProfile.id,
    description,
  }
  const updatedJob: Job = {
    ...currentJob,
    assignedEmployeeIds: uniqueEmployeeIds,
    assignedAt: uniqueEmployeeIds.length > 0 ? timestamp : null,
    assignedBy: uniqueEmployeeIds.length > 0 ? activeProfile.id : null,
    status: nextStatus,
    statusUpdatedAt: timestamp,
    statusUpdatedBy: activeProfile.id,
    updatedAt: timestamp,
  }
  const auditLog = {
    id: auditLogReference.id,
    organizationId,
    isActive: true,
    createdAt: timestamp,
    updatedAt: timestamp,
    actorId: activeProfile.id,
    action:
      uniqueEmployeeIds.length > 0
        ? 'job_employees_reassigned'
        : 'job_employees_unassigned',
    entityId: jobId,
    entityType: 'job',
    metadata: {
      fromStatus: currentJob.status,
      jobId,
      previousEmployeeIds: currentJob.assignedEmployeeIds,
      newEmployeeIds: uniqueEmployeeIds,
      newEmployeeNames: employeeNames,
      toStatus: nextStatus,
    },
  }
  const batch = writeBatch(firestore)

  batch.update(jobReference, {
    assignedEmployeeIds: uniqueEmployeeIds,
    assignedAt: uniqueEmployeeIds.length > 0 ? timestamp : null,
    assignedBy: uniqueEmployeeIds.length > 0 ? activeProfile.id : null,
    status: nextStatus,
    statusUpdatedAt: timestamp,
    statusUpdatedBy: activeProfile.id,
    updatedAt: timestamp,
  })
  batch.set(activityReference, activity)
  batch.set(auditLogReference, auditLog)

  await batch.commit()

  return {
    activity,
    assignedEmployees,
    job: updatedJob,
  }
}

async function getEligibleEmployeesById(
  profile: UserProfile,
  organizationId: string,
  employeeIds: string[],
) {
  const eligibleEmployees = await jobService.listAssignableEmployees(
    profile,
    organizationId,
  )
  const eligibleEmployeeMap = new Map(
    eligibleEmployees.map((employee) => [employee.id, employee]),
  )

  return employeeIds.map((employeeId) => {
    const employee = eligibleEmployeeMap.get(employeeId)

    if (!employee) {
      throw new Error('One or more selected employees are not eligible.')
    }

    return employee
  })
}

function normalizeEmployeeIds(employeeIds: string[]) {
  return Array.from(
    new Set(employeeIds.map((employeeId) => employeeId.trim()).filter(Boolean)),
  )
}

function requireEmployeeProfile(profile: UserProfile) {
  const activeProfile = requireActiveProfile(profile)

  if (activeProfile.role !== Roles.Employee) {
    throw new Error('Employee profile is required.')
  }

  return activeProfile
}

function requireEmployeeIdentity(profile: UserProfile, employeeId: string) {
  if (profile.id !== employeeId) {
    throw new Error('Employee identity does not match the authenticated user.')
  }
}

function isAssignedToEmployee(job: Job, employeeId: string) {
  return job.assignedEmployeeIds.includes(employeeId)
}

function isAllowedEmployeeStatusTransition(
  currentStatus: JobStatus,
  nextStatus: JobStatus,
) {
  return (
    (currentStatus === JobStatuses.Assigned &&
      nextStatus === JobStatuses.InProgress) ||
    (currentStatus === JobStatuses.InProgress &&
      nextStatus === JobStatuses.Completed)
  )
}

function requireJobId(jobId: string) {
  if (jobId.trim().length === 0) {
    throw new Error('Job ID is required.')
  }
}

function requireUpdates(updates: UpdateJobInput) {
  if (Object.keys(updates).length === 0) {
    throw new Error('At least one job update is required.')
  }
}

async function getJobsSnapshotWithMissingIndexFallback(
  jobsQuery: Query<DocumentData>,
  organizationId: string,
  resultLimit: number,
): Promise<QuerySnapshot<DocumentData>> {
  try {
    return await getDocs(jobsQuery)
  } catch (error) {
    if (!isMissingIndexError(error)) {
      throw error
    }

    if (import.meta.env.DEV) {
      console.error(
        'Jobs list query requires a Firestore composite index. Falling back to a tenant-scoped unordered query in development.',
        error,
      )
    }

    const fallbackQuery = query(
      collection(firestore, JOBS_COLLECTION),
      where('organizationId', '==', organizationId),
      where('isActive', '==', true),
      limitResults(resultLimit),
    )

    return getDocs(fallbackQuery)
  }
}

async function getEmployeeJobsSnapshotWithMissingIndexFallback(
  jobsQuery: Query<DocumentData>,
  organizationId: string,
  employeeId: string,
  resultLimit: number,
): Promise<QuerySnapshot<DocumentData>> {
  try {
    return await getDocs(jobsQuery)
  } catch (error) {
    if (!isMissingIndexError(error)) {
      throw error
    }

    if (import.meta.env.DEV) {
      console.error(
        'Assigned jobs query requires a Firestore composite index. Falling back to a tenant-scoped assigned-jobs query in development.',
        error,
      )
    }

    const fallbackQuery = query(
      collection(firestore, JOBS_COLLECTION),
      where('organizationId', '==', organizationId),
      where('isActive', '==', true),
      where('assignedEmployeeIds', 'array-contains', employeeId),
      limitResults(resultLimit),
    )

    return getDocs(fallbackQuery)
  }
}

function isMissingIndexError(error: unknown) {
  return (
    error instanceof FirebaseError &&
    error.code === 'failed-precondition' &&
    error.message.toLowerCase().includes('index')
  )
}

function mapJob(id: string, data: DocumentData): Job {
  return {
    id: readString(data, 'id', id),
    organizationId: readString(data, 'organizationId'),
    title: readString(data, 'title', 'Untitled job'),
    description: readString(data, 'description'),
    customerName: readString(data, 'customerName', 'Unknown customer'),
    customerPhone: readString(data, 'customerPhone'),
    serviceAddress: readString(data, 'serviceAddress'),
    location: readString(data, 'location'),
    priority: readJobPriority(data.priority),
    status: readJobStatus(data.status),
    statusUpdatedAt: readTimestampOrNull(data.statusUpdatedAt),
    statusUpdatedBy: readStringOrNull(data.statusUpdatedBy),
    requiredSkills: readStringArray(data.requiredSkills),
    assignedEmployeeIds: readStringArray(data.assignedEmployeeIds),
    assignedAt: readTimestampOrNull(data.assignedAt),
    assignedBy: readStringOrNull(data.assignedBy),
    startedAt: readTimestampOrNull(data.startedAt),
    startedBy: readStringOrNull(data.startedBy),
    createdBy: readString(data, 'createdBy'),
    createdAt: readTimestamp(data.createdAt),
    updatedAt: readTimestamp(data.updatedAt),
    dueDate: readTimestampOrNull(data.dueDate),
    attachments: Array.isArray(data.attachments) ? data.attachments : [],
    workProofCount: readNumber(data, 'workProofCount'),
    issueCount: readNumber(data, 'issueCount'),
    aiRecommendation: data.aiRecommendation ?? null,
    manualOverride: readBoolean(data, 'manualOverride'),
    overrideReason: readStringOrNull(data.overrideReason),
    completedAt: readTimestampOrNull(data.completedAt),
    completedBy: readStringOrNull(data.completedBy),
    isActive: readBoolean(data, 'isActive'),
  }
}

function mapJobActivity(data: DocumentData): JobActivity {
  const activityType =
    data.type === 'employees_assigned' ||
    data.type === 'employees_reassigned' ||
    data.type === 'employees_unassigned' ||
    data.type === 'employee_completed_job' ||
    data.type === 'employee_started_job'
      ? data.type
      : 'status_changed'

  return {
    id: readString(data, 'id'),
    organizationId: readString(data, 'organizationId'),
    isActive: readBoolean(data, 'isActive'),
    createdAt: readTimestamp(data.createdAt),
    updatedAt: readTimestamp(data.updatedAt),
    jobId: readString(data, 'jobId'),
    type: activityType,
    fromStatus: validateJobStatus(data.fromStatus) ? data.fromStatus : undefined,
    toStatus: validateJobStatus(data.toStatus) ? data.toStatus : undefined,
    employeeId: readStringOrUndefined(data.employeeId),
    employeeIds: readStringArray(data.employeeIds),
    employeeNames: readStringArray(data.employeeNames),
    performedAt: readTimestampOrUndefined(data.performedAt),
    performedBy: readStringOrUndefined(data.performedBy),
    createdBy: readString(data, 'createdBy'),
    description: readString(data, 'description'),
  }
}

function readString(data: DocumentData, key: string, fallback = '') {
  const value = data[key]

  return typeof value === 'string' ? value : fallback
}

function readStringOrNull(value: unknown) {
  return typeof value === 'string' ? value : null
}

function readStringOrUndefined(value: unknown) {
  return typeof value === 'string' ? value : undefined
}

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

function readNumber(data: DocumentData, key: string) {
  const value = data[key]

  return typeof value === 'number' ? value : 0
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

function readTimestampOrUndefined(value: unknown) {
  return value instanceof Timestamp ? value : undefined
}

function readJobPriority(value: unknown): JobPriority {
  if (
    value === JobPriorities.Low ||
    value === JobPriorities.Medium ||
    value === JobPriorities.High ||
    value === JobPriorities.Urgent
  ) {
    return value
  }

  return JobPriorities.Medium
}

function readJobStatus(value: unknown): JobStatus {
  return validateJobStatus(value) ? value : JobStatuses.Draft
}

function throwNotImplemented(): never {
  throw new Error('Not implemented')
}
