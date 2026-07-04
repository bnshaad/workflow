import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  Timestamp,
  where,
} from 'firebase/firestore'
import { firestore } from '@/services/firestore'
import { requireActiveProfile, requireTenantAccess } from '@/services/common'
import { DEFAULT_JOB_STATUS } from '@/constants/jobConstants'
import type { CreateJobInput, Job, UpdateJobInput } from '@/types/job'
import type { JobStatus } from '@/types/jobStatus'
import type { UserProfile } from '@/types/user'
import {
  validateCreateJob,
  validateJobStatus,
} from '@/validators/jobValidator'

export interface JobService {
  createJob(profile: UserProfile, input: CreateJobInput): Promise<Job>
  getJob(
    profile: UserProfile,
    jobId: string,
    organizationId: string,
  ): Promise<Job | null>
  listJobs(profile: UserProfile, organizationId: string): Promise<Job[]>
  updateJob(
    profile: UserProfile,
    jobId: string,
    organizationId: string,
    updates: UpdateJobInput,
  ): Promise<Job>
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

  async getJob(profile, jobId, organizationId) {
    requireTenantAccess(profile, organizationId)
    requireJobId(jobId)

    return throwNotImplemented()
  },

  async listJobs(profile, organizationId) {
    requireTenantAccess(profile, organizationId)

    const jobsQuery = query(
      collection(firestore, JOBS_COLLECTION),
      where('organizationId', '==', organizationId),
      where('isActive', '==', true),
    )
    const snapshot = await getDocs(jobsQuery)

    return snapshot.docs
      .map((jobDocument) => jobDocument.data() as Job)
      .sort((firstJob, secondJob) => {
        return secondJob.createdAt.toMillis() - firstJob.createdAt.toMillis()
      })
  },

  async updateJob(profile, jobId, organizationId, updates) {
    requireTenantAccess(profile, organizationId)
    requireJobId(jobId)
    requireUpdates(updates)

    return throwNotImplemented()
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
    requireTenantAccess(profile, organizationId)
    requireJobId(jobId)

    if (!validateJobStatus(status)) {
      throw new Error('Job status is invalid.')
    }

    return throwNotImplemented()
  },
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
