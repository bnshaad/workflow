import { useCallback, useEffect, useState } from 'react'
import type { Job } from '../domain'
import { firestore } from '../config/firebase'
import { FirestoreJobRepository } from '../repositories/FirestoreJobRepository'

const jobRepository = new FirestoreJobRepository(firestore)

export function useAssignedJobs(organizationId?: string, employeeUid?: string) {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const fetchJobs = useCallback(async () => {
    if (!organizationId || !employeeUid) {
      setJobs([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const fetchedJobs = await jobRepository.getAssignedJobs(organizationId, employeeUid)
      setJobs(fetchedJobs)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch assigned jobs')
    } finally {
      setLoading(false)
    }
  }, [organizationId, employeeUid])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  const startJob = async (jobId: string) => {
    if (!organizationId || !employeeUid) return
    if (isSubmitting) return

    setIsSubmitting(true)
    setError(null)
    try {
      await jobRepository.startJob({ jobId, employeeUid, organizationId })
      await fetchJobs()
    } catch (err: any) {
      const message = err.message || 'Failed to start job'
      setError(message)
      throw new Error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const completeJob = async (jobId: string) => {
    if (!organizationId || !employeeUid) return
    if (isSubmitting) return

    setIsSubmitting(true)
    setError(null)
    try {
      await jobRepository.completeJob({ jobId, employeeUid, organizationId })
      await fetchJobs()
    } catch (err: any) {
      const message = err.message || 'Failed to complete job'
      setError(message)
      throw new Error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    jobs,
    loading,
    isSubmitting,
    error,
    refreshJobs: fetchJobs,
    startJob,
    completeJob,
  }
}
