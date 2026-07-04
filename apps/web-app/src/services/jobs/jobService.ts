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
} from 'firebase/firestore'
import { firestore } from '@/services/firestore'
import { requireActiveProfile, requireTenantAccess } from '@/services/common'
import { DEFAULT_JOB_STATUS } from '@/constants/jobConstants'
import { canEditJob } from '@/permissions'
import type {
  CreateJobInput,
  Job,
  JobActivity,
  UpdateJobInput,
} from '@/types/job'
import {
  canTransitionJobStatus,
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
  listJobs(
    profile: UserProfile,
    organizationId: string,
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
}

const JOBS_COLLECTION = 'jobs'
const JOB_ACTIVITIES_COLLECTION = 'jobActivities'
const AUDIT_LOGS_COLLECTION = 'auditLogs'
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
      isActive: true,
    }

    // Future: add audit log entry, notification fan-out, and AI Job Understanding hooks.
    await setDoc(jobReference, job)

    return job
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
      (activityDocument) => activityDocument.data() as JobActivity,
    )
  },

  async getJob(profile, jobId, organizationId) {
    requireTenantAccess(profile, organizationId)
    requireJobId(jobId)

    const jobSnapshot = await getDoc(doc(firestore, JOBS_COLLECTION, jobId))

    if (!jobSnapshot.exists()) {
      return null
    }

    const job = jobSnapshot.data() as Job

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
    const snapshot = await getDocs(jobsQuery)

    return snapshot.docs.map((jobDocument) => jobDocument.data() as Job)
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

  async assignEmployees(profile, jobId, organizationId, employeeIds) {
    requireTenantAccess(profile, organizationId)
    requireJobId(jobId)

    if (!Array.isArray(employeeIds)) {
      throw new Error('Employee IDs must be a list.')
    }

    return throwNotImplemented()
  },

  async updateStatus(profile, jobId, organizationId, status) {
    const result = await updateJobStatus(profile, jobId, organizationId, status)

    return result.job
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

function throwNotImplemented(): never {
  throw new Error('Not implemented')
}
