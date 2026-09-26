import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState, type AppStateStatus } from 'react-native'
import type { Job } from '../domain'
import { firestore } from '../config/firebase'
import { FirestoreJobRepository } from '../repositories/FirestoreJobRepository'

// Singleton repository instance to share in-memory cache across screens
export const jobRepository = new FirestoreJobRepository(firestore)

export function useAssignedJobs(organizationId?: string, employeeUid?: string) {
  // Synchronously initialize from cache if available to eliminate loading lag
  const [jobs, setJobs] = useState<Job[]>(() => {
    if (organizationId && employeeUid) {
      return jobRepository.getCachedJobs(organizationId, employeeUid) || []
    }
    return []
  })

  const [loading, setLoading] = useState<boolean>(() => {
    if (organizationId && employeeUid) {
      const cached = jobRepository.getCachedJobs(organizationId, employeeUid)
      return !cached || cached.length === 0
    }
    return true
  })

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const isMounted = useRef(true)
  const isFetchingRef = useRef(false)
  const hasJobsRef = useRef(jobs.length > 0)
  hasJobsRef.current = jobs.length > 0

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  const fetchJobs = useCallback(
    async (forceRefresh = false) => {
      if (!organizationId || !employeeUid) {
        setJobs([])
        setLoading(false)
        return
      }

      if (isFetchingRef.current) return
      isFetchingRef.current = true

      // Only show full loading skeleton if there are no cached or loaded jobs
      const cached = jobRepository.getCachedJobs(organizationId, employeeUid)
      if (!cached && !hasJobsRef.current) {
        setLoading(true)
      }
      setError(null)

      try {
        const fetchedJobs = await jobRepository.getAssignedJobs(
          organizationId,
          employeeUid,
          forceRefresh
        )
        if (isMounted.current) {
          setJobs(fetchedJobs)
        }
      } catch (err: any) {
        if (isMounted.current) {
          setError(err.message || 'Unable to load assigned jobs. Please check network.')
        }
      } finally {
        isFetchingRef.current = false
        if (isMounted.current) {
          setLoading(false)
        }
      }
    },
    [organizationId, employeeUid]
  )

  useEffect(() => {
    fetchJobs(false)
  }, [fetchJobs])

  // Foreground synchronization: auto-refresh when app comes to active foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active' && organizationId && employeeUid) {
        void fetchJobs(true)
      }
    })
    return () => subscription.remove()
  }, [fetchJobs, organizationId, employeeUid])

  // Periodic background polling every 15s while app is active to catch new assignments
  useEffect(() => {
    if (!organizationId || !employeeUid) return

    const interval = setInterval(() => {
      if (AppState.currentState === 'active') {
        void fetchJobs(true)
      }
    }, 15000)

    return () => clearInterval(interval)
  }, [fetchJobs, organizationId, employeeUid])

  const startJob = async (jobId: string) => {
    if (!organizationId || !employeeUid || isSubmitting) return

    setIsSubmitting(true)
    setError(null)

    try {
      await jobRepository.startJob({ jobId, employeeUid, organizationId })
      const cached = jobRepository.getCachedJobs(organizationId, employeeUid)
      if (cached && isMounted.current) {
        setJobs([...cached])
      }
    } catch (err: any) {
      const message = err.message || 'Failed to start job. Please try again.'
      if (isMounted.current) {
        setError(message)
      }
      throw new Error(message)
    } finally {
      if (isMounted.current) {
        setIsSubmitting(false)
      }
    }
  }

  const completeJob = async (jobId: string) => {
    if (!organizationId || !employeeUid || isSubmitting) return

    setIsSubmitting(true)
    setError(null)

    try {
      await jobRepository.completeJob({ jobId, employeeUid, organizationId })
      const cached = jobRepository.getCachedJobs(organizationId, employeeUid)
      if (cached && isMounted.current) {
        setJobs([...cached])
      }
    } catch (err: any) {
      const message = err.message || 'Failed to complete job. Please try again.'
      if (isMounted.current) {
        setError(message)
      }
      throw new Error(message)
    } finally {
      if (isMounted.current) {
        setIsSubmitting(false)
      }
    }
  }

  return {
    jobs,
    loading,
    isSubmitting,
    error,
    refreshJobs: () => fetchJobs(true), // Force refresh on manual pull
    startJob,
    completeJob,
  }
}
