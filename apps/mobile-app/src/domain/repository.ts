// Repository interface — local copy from shared/domain/repositories/JobRepository.ts

import type { Job } from './models'

export interface JobRepository {
  completeJob(params: {
    employeeUid: string
    jobId: string
    organizationId: string
  }): Promise<void>
  getAssignedJobs(organizationId: string, employeeUid: string): Promise<Job[]>
  startJob(params: {
    employeeUid: string
    jobId: string
    organizationId: string
  }): Promise<void>
}
