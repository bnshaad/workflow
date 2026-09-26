import {
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  Timestamp,
  where,
  type Firestore,
  type Transaction,
} from 'firebase/firestore'
import type { Job, JobActivity, JobRepository } from '../domain'
import { validateEmployeeStatusTransition } from '../domain'

interface CacheEntry {
  jobs: Job[]
  timestamp: number
}

export class FirestoreJobRepository implements JobRepository {
  private cache = new Map<string, CacheEntry>()
  private readonly CACHE_TTL_MS = 15_000 // 15 seconds memory cache to keep assignments responsive while minimizing redundant reads

  constructor(private db: Firestore) {}

  private getCacheKey(organizationId: string, employeeUid: string): string {
    return `${organizationId}:${employeeUid}`
  }

  /**
   * Returns cached jobs if available and fresh.
   * Decreases database reading and loading time dramatically.
   */
  getCachedJobs(organizationId: string, employeeUid: string): Job[] | null {
    const key = this.getCacheKey(organizationId, employeeUid)
    const entry = this.cache.get(key)
    if (entry && Date.now() - entry.timestamp < this.CACHE_TTL_MS) {
      return entry.jobs
    }
    return null
  }

  /**
   * Updates in-memory cache optimistically without triggering a new Firestore read.
   */
  updateCachedJob(organizationId: string, employeeUid: string, updatedJob: Job): void {
    const key = this.getCacheKey(organizationId, employeeUid)
    const entry = this.cache.get(key)
    if (entry) {
      const index = entry.jobs.findIndex((j) => j.id === updatedJob.id)
      let newJobs: Job[]
      if (index >= 0) {
        newJobs = [...entry.jobs]
        newJobs[index] = updatedJob
      } else {
        newJobs = [updatedJob, ...entry.jobs]
      }
      this.cache.set(key, { jobs: newJobs, timestamp: Date.now() })
    }
  }

  async getAssignedJobs(
    organizationId: string,
    employeeUid: string,
    forceRefresh = false
  ): Promise<Job[]> {
    const key = this.getCacheKey(organizationId, employeeUid)

    if (!forceRefresh) {
      const cached = this.getCachedJobs(organizationId, employeeUid)
      if (cached) {
        return cached
      }
    }

    const jobsRef = collection(this.db, 'jobs')
    const q = query(
      jobsRef,
      where('organizationId', '==', organizationId),
      where('assignedEmployeeIds', 'array-contains', employeeUid),
      where('isActive', '==', true)
    )

    const snapshot = await getDocs(q)
    const jobs = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Job),
    }))

    this.cache.set(key, { jobs, timestamp: Date.now() })
    return jobs
  }

  async startJob(params: {
    employeeUid: string
    jobId: string
    organizationId: string
  }): Promise<void> {
    let updatedJobData: Job | null = null

    await runTransaction(this.db, async (transaction: Transaction) => {
      const jobRef = doc(this.db, 'jobs', params.jobId)
      const jobSnap = await transaction.get(jobRef)

      if (!jobSnap.exists()) {
        throw new Error('Job not found')
      }

      const job = jobSnap.data() as Job

      if (job.organizationId !== params.organizationId) {
        throw new Error('Tenant isolation violation: Job belongs to another organization')
      }

      const validation = validateEmployeeStatusTransition(job, 'in_progress', params.employeeUid)
      if (!validation.valid) {
        throw new Error(validation.reason || 'Invalid status transition')
      }

      const now = Timestamp.now()

      const updates = {
        status: 'in_progress' as const,
        startedAt: now,
        startedBy: params.employeeUid,
        statusUpdatedAt: now,
        statusUpdatedBy: params.employeeUid,
        updatedAt: now,
      }

      transaction.update(jobRef, updates)

      updatedJobData = {
        ...job,
        ...updates,
      }

      const activityRef = doc(collection(this.db, 'jobActivities'))
      const activityData: JobActivity = {
        id: activityRef.id,
        jobId: params.jobId,
        organizationId: params.organizationId,
        type: 'employee_started_job',
        fromStatus: 'assigned',
        toStatus: 'in_progress',
        employeeId: params.employeeUid,
        performedAt: now,
        performedBy: params.employeeUid,
        createdBy: params.employeeUid,
        description: 'Employee started job',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      }

      transaction.set(activityRef, activityData)
    })

    if (updatedJobData) {
      this.updateCachedJob(params.organizationId, params.employeeUid, updatedJobData)
      return
    }

    throw new Error('Failed to update job status')
  }

  async completeJob(params: {
    employeeUid: string
    jobId: string
    organizationId: string
  }): Promise<void> {
    let updatedJobData: Job | null = null

    await runTransaction(this.db, async (transaction: Transaction) => {
      const jobRef = doc(this.db, 'jobs', params.jobId)
      const jobSnap = await transaction.get(jobRef)

      if (!jobSnap.exists()) {
        throw new Error('Job not found')
      }

      const job = jobSnap.data() as Job

      if (job.organizationId !== params.organizationId) {
        throw new Error('Tenant isolation violation: Job belongs to another organization')
      }

      const validation = validateEmployeeStatusTransition(job, 'completed', params.employeeUid)
      if (!validation.valid) {
        throw new Error(validation.reason || 'Invalid status transition')
      }

      const now = Timestamp.now()

      const updates = {
        status: 'completed' as const,
        completedAt: now,
        completedBy: params.employeeUid,
        statusUpdatedAt: now,
        statusUpdatedBy: params.employeeUid,
        updatedAt: now,
      }

      transaction.update(jobRef, updates)

      updatedJobData = {
        ...job,
        ...updates,
      }

      const activityRef = doc(collection(this.db, 'jobActivities'))
      const activityData: JobActivity = {
        id: activityRef.id,
        jobId: params.jobId,
        organizationId: params.organizationId,
        type: 'employee_completed_job',
        fromStatus: 'in_progress',
        toStatus: 'completed',
        employeeId: params.employeeUid,
        performedAt: now,
        performedBy: params.employeeUid,
        createdBy: params.employeeUid,
        description: 'Employee completed job',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      }

      transaction.set(activityRef, activityData)
    })

    if (updatedJobData) {
      this.updateCachedJob(params.organizationId, params.employeeUid, updatedJobData)
      return
    }

    throw new Error('Failed to update job status')
  }
}
