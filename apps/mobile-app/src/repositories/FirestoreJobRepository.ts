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

export class FirestoreJobRepository implements JobRepository {
  constructor(private db: Firestore) {}

  async getAssignedJobs(organizationId: string, employeeUid: string): Promise<Job[]> {
    const jobsRef = collection(this.db, 'jobs')
    const q = query(
      jobsRef,
      where('organizationId', '==', organizationId),
      where('assignedEmployeeIds', 'array-contains', employeeUid),
      where('isActive', '==', true)
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map((docSnap) => docSnap.data() as Job)
  }

  async startJob(params: {
    employeeUid: string
    jobId: string
    organizationId: string
  }): Promise<void> {
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

      transaction.update(jobRef, {
        status: 'in_progress',
        startedAt: now,
        startedBy: params.employeeUid,
        statusUpdatedAt: now,
        statusUpdatedBy: params.employeeUid,
        updatedAt: now,
      })

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
  }

  async completeJob(params: {
    employeeUid: string
    jobId: string
    organizationId: string
  }): Promise<void> {
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

      transaction.update(jobRef, {
        status: 'completed',
        completedAt: now,
        completedBy: params.employeeUid,
        statusUpdatedAt: now,
        statusUpdatedBy: params.employeeUid,
        updatedAt: now,
      })

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
  }
}
