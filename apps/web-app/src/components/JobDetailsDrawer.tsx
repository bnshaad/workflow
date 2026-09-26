import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  RefreshCcw,
  Sparkles,
  X,
} from 'lucide-react'

import { PriorityBadge, StatusBadge } from '@/components'
import { useAuth } from '@/hooks'
import { canEditJob } from '@/permissions'
import {
  ASSIGNMENT_OVERRIDE_REASONS,
  assignmentRecommendationService,
} from '@/services/recommendations'
import { jobService } from '@/services/jobs'
import {
  incidentService,
  INCIDENT_CATEGORY_LABELS,
  type Incident,
} from '@/services/incidents/incidentService'
import {
  type AssignmentRecommendation,
  type AssignmentRecommendationCandidate,
  type AssignmentOverrideReason,
  JOB_STATUS_LABELS,
  type Job,
  type JobActivity,
  type UserProfile,
} from '@/types'

import { cn, summarizeCandidateExplanation } from '@/utils'

type JobDetailsDrawerProps = {
  isOpen: boolean
  jobId: string | null
  onClose: () => void
  onJobUpdated?: (updatedJob: Job) => void
}

export function JobDetailsDrawer({
  isOpen,
  jobId,
  onClose,
  onJobUpdated,
}: JobDetailsDrawerProps) {
  const { profile } = useAuth()
  const [job, setJob] = useState<Job | null>(null)
  const [activities, setActivities] = useState<JobActivity[]>([])
  const [assignableEmployees, setAssignableEmployees] = useState<UserProfile[]>([])
  const [recommendation, setRecommendation] = useState<AssignmentRecommendation | null>(null)
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [isResolvingIncident, setIsResolvingIncident] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [actionErrorMessage, setActionErrorMessage] = useState('')
  const [actionSuccessMessage, setActionSuccessMessage] = useState('')
  const [isGeneratingRecommendation, setIsGeneratingRecommendation] = useState(false)
  const [isDeciding, setIsDeciding] = useState(false)
  const [overrideMode, setOverrideMode] = useState(false)
  const [selectedOverrideEmployeeId, setSelectedOverrideEmployeeId] = useState('')
  const [overrideReason, setOverrideReason] = useState<AssignmentOverrideReason | ''>('')
  const [overrideNote, setOverrideNote] = useState('')
  const [showWhyMatch, setShowWhyMatch] = useState(false)
  const [isActivityExpanded, setIsActivityExpanded] = useState(false)
  const [isOpeningDraft, setIsOpeningDraft] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const loadJobData = useCallback(async () => {
    if (!profile || !jobId || !isOpen) {
      return
    }

    setIsLoading(true)
    setErrorMessage('')
    setActionErrorMessage('')
    setActionSuccessMessage('')
    setRecommendation(null)
    setShowWhyMatch(false)
    setOverrideMode(false)
    setSelectedOverrideEmployeeId('')
    setOverrideReason('')
    setOverrideNote('')
    setIncidents([])

    try {
      const [loadedJob, loadedActivities, loadedEmployees, loadedIncidents] = await Promise.all([
        jobService.getJob(profile, jobId, profile.organizationId, { bypassCache: true }),
        jobService.getJobActivities(profile, jobId, profile.organizationId),
        jobService.listAssignableEmployees(profile, profile.organizationId),
        incidentService.getIncidentsByJob(profile, jobId, profile.organizationId),
      ])

      if (!loadedJob) {
        setErrorMessage('Job not found.')
        setJob(null)
        return
      }

      setJob(loadedJob)
      setActivities(loadedActivities)
      setAssignableEmployees(loadedEmployees)
      setIncidents(loadedIncidents)

      if (loadedJob.status === 'open' || loadedJob.status === 'assigned') {
        assignmentRecommendationService
          .generateAssignmentRecommendations(profile, profile.organizationId, loadedJob.id)
          .then((recResult) => {
            setRecommendation(recResult.recommendation)
          })
          .catch(() => {
            // fallback silent
          })
      }
    } catch {
      setErrorMessage('Unable to load job details.')
    } finally {
      setIsLoading(false)
    }
  }, [isOpen, jobId, profile])

  useEffect(() => {
    if (!isOpen || !jobId || !profile) return
    let isMounted = true

    async function fetchJob() {
      const currentProfile = profile
      const currentJobId = jobId
      if (!currentProfile || !currentJobId) return

      setIsLoading(true)
      setErrorMessage('')
      setActionErrorMessage('')
      setActionSuccessMessage('')
      setRecommendation(null)
      setShowWhyMatch(false)
      setOverrideMode(false)
      setSelectedOverrideEmployeeId('')
      setOverrideReason('')
      setOverrideNote('')
      setIncidents([])

      try {
        const [loadedJob, loadedActivities, loadedEmployees, loadedIncidents] = await Promise.all([
          jobService.getJob(currentProfile, currentJobId, currentProfile.organizationId, { bypassCache: true }),
          jobService.getJobActivities(currentProfile, currentJobId, currentProfile.organizationId),
          jobService.listAssignableEmployees(currentProfile, currentProfile.organizationId),
          incidentService.getIncidentsByJob(currentProfile, currentJobId, currentProfile.organizationId),
        ])

        if (!isMounted) return

        if (!loadedJob) {
          setErrorMessage('Job not found.')
          setJob(null)
          return
        }

        setJob(loadedJob)
        setActivities(loadedActivities)
        setAssignableEmployees(loadedEmployees)
        setIncidents(loadedIncidents)

        if (loadedJob.status === 'open' || loadedJob.status === 'assigned') {
          assignmentRecommendationService
            .generateAssignmentRecommendations(currentProfile, currentProfile.organizationId, loadedJob.id)
            .then((recResult) => {
              if (isMounted) {
                setRecommendation(recResult.recommendation)
              }
            })
            .catch(() => {
              // fallback silent
            })
        }
      } catch {
        if (isMounted) {
          setErrorMessage('Unable to load job details.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void fetchJob()

    return () => {
      isMounted = false
    }
  }, [isOpen, jobId, profile])

  const assignedEmployeeNames = useMemo(() => {
    if (!job || job.assignedEmployeeIds.length === 0) return []
    return job.assignedEmployeeIds.map(
      (id) => assignableEmployees.find((e) => e.id === id)?.displayName || 'Field technician',
    )
  }, [job, assignableEmployees])

  const handleGenerateRecommendation = async () => {
    if (!profile || !job) return
    setIsGeneratingRecommendation(true)
    setActionErrorMessage('')

    try {
      const result = await assignmentRecommendationService.generateAssignmentRecommendations(
        profile,
        profile.organizationId,
        job.id,
      )
      setRecommendation(result.recommendation)
    } catch {
      setActionErrorMessage('Unable to generate worker recommendation.')
    } finally {
      setIsGeneratingRecommendation(false)
    }
  }

  const handleAcceptRecommendation = async (candidate: AssignmentRecommendationCandidate) => {
    if (!profile || !job) return
    setIsDeciding(true)
    setActionErrorMessage('')
    setActionSuccessMessage('')

    try {
      if (recommendation && recommendation.status === 'generated') {
        const result = await assignmentRecommendationService.decideAssignmentRecommendation(
          profile,
          profile.organizationId,
          {
            decision: 'accepted',
            recommendationId: recommendation.id,
            selectedEmployeeId: candidate.employeeId,
          },
        )
        setJob(result.job)
        setRecommendation(result.recommendation)
        setActionSuccessMessage(`Successfully assigned ${candidate.employeeName}.`)
        if (onJobUpdated) onJobUpdated(result.job)
      } else {
        const result = await jobService.assignEmployeesToJob(
          profile,
          job.id,
          profile.organizationId,
          [candidate.employeeId],
        )
        setJob(result.job)
        setActionSuccessMessage(`Successfully assigned ${candidate.employeeName}.`)
        if (onJobUpdated) onJobUpdated(result.job)
      }

      const updatedActivities = await jobService.getJobActivities(
        profile,
        job.id,
        profile.organizationId,
      )
      setActivities(updatedActivities)
    } catch (err: unknown) {
      setActionErrorMessage(err instanceof Error ? err.message : 'Failed to confirm assignment.')
    } finally {
      setIsDeciding(false)
    }
  }

  const handleConfirmAssignmentChange = async () => {
    if (!profile || !job || !selectedOverrideEmployeeId) return
    setIsDeciding(true)
    setActionErrorMessage('')

    try {
      if (job.status === 'assigned') {
        const result = await jobService.updateAssignedEmployees(
          profile,
          job.id,
          profile.organizationId,
          [selectedOverrideEmployeeId],
        )
        setJob(result.job)
        setOverrideMode(false)
        setActionSuccessMessage('Technician reassigned successfully.')
        if (onJobUpdated) onJobUpdated(result.job)
      } else if (
        recommendation &&
        recommendation.status === 'generated' &&
        recommendation.candidates &&
        recommendation.candidates.length > 0
      ) {
        const isTopMatch = recommendation.candidates[0]?.employeeId === selectedOverrideEmployeeId
        if (isTopMatch) {
          const result = await assignmentRecommendationService.decideAssignmentRecommendation(
            profile,
            profile.organizationId,
            {
              decision: 'accepted',
              recommendationId: recommendation.id,
              selectedEmployeeId: selectedOverrideEmployeeId,
            },
          )
          setJob(result.job)
          setRecommendation(result.recommendation)
          setOverrideMode(false)
          setActionSuccessMessage('Technician assigned successfully.')
          if (onJobUpdated) onJobUpdated(result.job)
        } else {
          const effectiveReason = overrideReason || 'Manager preference'
          const result = await assignmentRecommendationService.decideAssignmentRecommendation(
            profile,
            profile.organizationId,
            {
              decision: 'overridden',
              overrideNote: effectiveReason === 'Other' ? overrideNote.trim() : undefined,
              overrideReason: effectiveReason,
              recommendationId: recommendation.id,
              selectedEmployeeId: selectedOverrideEmployeeId,
            },
          )
          setJob(result.job)
          setRecommendation(result.recommendation)
          setOverrideMode(false)
          setActionSuccessMessage('Technician assigned with manager override.')
          if (onJobUpdated) onJobUpdated(result.job)
        }
      } else {
        const result = await jobService.assignEmployeesToJob(
          profile,
          job.id,
          profile.organizationId,
          [selectedOverrideEmployeeId],
        )
        setJob(result.job)
        setOverrideMode(false)
        setActionSuccessMessage('Technician assigned successfully.')
        if (onJobUpdated) onJobUpdated(result.job)
      }

      const updatedActivities = await jobService.getJobActivities(
        profile,
        job.id,
        profile.organizationId,
      )
      setActivities(updatedActivities)
    } catch (err: unknown) {
      setActionErrorMessage(err instanceof Error ? err.message : 'Failed to update assignment.')
    } finally {
      setIsDeciding(false)
    }
  }

  async function handleOpenDraftJob() {
    if (!profile || !job) return
    setIsOpeningDraft(true)
    setActionErrorMessage('')
    setActionSuccessMessage('')

    try {
      const result = await jobService.updateJobStatus(
        profile,
        job.id,
        job.organizationId,
        'open',
      )
      setJob(result.job)
      setActionSuccessMessage('Job is now open and ready for technician matching.')
      if (onJobUpdated) onJobUpdated(result.job)

      const updatedActivities = await jobService.getJobActivities(
        profile,
        job.id,
        profile.organizationId,
      )
      setActivities(updatedActivities)
    } catch {
      setActionErrorMessage('Failed to open job. Please try again.')
    } finally {
      setIsOpeningDraft(false)
    }
  }

  async function handleResolveIncident(incidentId: string) {
    if (!profile || !job) return
    setIsResolvingIncident(true)
    setActionErrorMessage('')
    setActionSuccessMessage('')

    try {
      await incidentService.resolveIncident(profile, {
        incidentId,
        organizationId: job.organizationId,
      })
      const updatedIncidents = await incidentService.getIncidentsByJob(
        profile,
        job.id,
        profile.organizationId,
      )
      setIncidents(updatedIncidents)
      setActionSuccessMessage('Field blocker marked as resolved.')
    } catch {
      setActionErrorMessage('Failed to resolve field blocker.')
    } finally {
      setIsResolvingIncident(false)
    }
  }

  if (!isOpen) return null

  const canEdit = profile ? canEditJob(profile) : false
  const topCandidate = recommendation?.candidates[0] ?? null
  const openIncidents = incidents.filter((i) => i.status === 'open')

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity">
      <div
        className="fixed inset-0"
        onClick={onClose}
      />
      <div className="relative z-10 flex h-full w-full max-w-2xl flex-col border-l border-wf-border bg-wf-surface shadow-2xl">
        {/* Drawer Header */}
        <div className="flex items-start justify-between border-b border-wf-border px-5 py-4">
          <div className="min-w-0 flex-1 pr-4">
            <h2 className="text-[17px] font-semibold text-wf-ink leading-snug truncate">
              {isLoading ? 'Loading job...' : job?.title || 'Job details'}
            </h2>
            {job ? (
              <div className="mt-1 space-y-0.5">
                <p className="text-sm font-medium text-wf-ink-2 truncate">
                  {job.customerName}
                </p>
                {job.serviceAddress ? (
                  <p className="text-xs text-wf-ink-3 truncate">
                    {job.serviceAddress}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
            <button
              aria-label="Refresh job details"
              className="flex size-8 items-center justify-center rounded-control border border-wf-border bg-wf-surface text-wf-ink-3 hover:bg-wf-surface-sunken hover:text-wf-ink transition-colors"
              disabled={isLoading}
              onClick={() => void loadJobData()}
              type="button"
            >
              <RefreshCcw className={cn('size-3.5', isLoading && 'animate-spin')} />
            </button>
            <button
              aria-label="Close drawer"
              className="flex size-8 items-center justify-center rounded-control border border-wf-border bg-wf-surface text-wf-ink-3 hover:bg-wf-surface-sunken hover:text-wf-ink transition-colors"
              onClick={onClose}
              type="button"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {isLoading ? (
            <div className="py-12 text-center text-sm text-wf-ink-3">
              Loading job operational data...
            </div>
          ) : errorMessage ? (
            <div className="rounded-card border border-wf-danger/30 bg-wf-danger-wash p-4 text-sm text-wf-danger">
              {errorMessage}
            </div>
          ) : job ? (
            <>
              {/* Active Field Blocker Alert Banner (Decision first: sits above everything else) */}
              {openIncidents.length > 0 ? (
                <div className="rounded-card border border-wf-danger/30 bg-wf-danger-wash p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="size-4 text-wf-danger shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-semibold text-wf-danger">
                          Active field blocker flagged
                        </h4>
                        <p className="text-xs text-wf-danger/90 mt-0.5">
                          Reported by <span className="font-medium">{openIncidents[0].reportedByUserName}</span>: {INCIDENT_CATEGORY_LABELS[openIncidents[0].category] || openIncidents[0].category}
                        </p>
                        {openIncidents[0].description ? (
                          <p className="text-xs text-wf-danger/80 mt-1.5 rounded-control border border-wf-danger/20 bg-wf-surface/70 p-2 italic">
                            "{openIncidents[0].description}"
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isResolvingIncident}
                      onClick={() => handleResolveIncident(openIncidents[0].id)}
                      className="shrink-0 rounded-control border border-wf-danger/40 bg-wf-surface px-3 py-1.5 text-xs font-medium text-wf-danger hover:bg-wf-danger-wash disabled:opacity-50 transition-colors"
                    >
                      {isResolvingIncident ? 'Resolving...' : 'Mark resolved'}
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Action Alert Messages */}
              {actionErrorMessage ? (
                <div className="rounded-control border border-wf-danger/30 bg-wf-danger-wash p-3 text-xs font-medium text-wf-danger">
                  {actionErrorMessage}
                </div>
              ) : null}
              {actionSuccessMessage ? (
                <div className="rounded-control border border-wf-done/30 bg-wf-surface-sunken p-3 text-xs font-medium text-wf-done">
                  {actionSuccessMessage}
                </div>
              ) : null}

              {/* Assigned Technician Card (Decision state: If already assigned) */}
              {job.assignedEmployeeIds.length > 0 && !overrideMode ? (
                <section className="rounded-card border border-wf-border bg-wf-surface p-4 space-y-2 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-wf-ink-3">
                        Assigned field technician
                      </p>
                      <h3 className="text-[15px] font-semibold text-wf-ink mt-0.5">
                        {assignedEmployeeNames.join(', ')}
                      </h3>
                    </div>
                    {canEdit && (
                      <button
                        className="inline-flex h-8 items-center justify-center rounded-control border border-wf-border bg-wf-surface px-3 text-xs font-medium text-wf-ink-2 hover:bg-wf-surface-sunken hover:text-wf-ink transition-colors"
                        onClick={() => {
                          setOverrideMode(true)
                          if (job.status === 'open' && !recommendation) {
                            void handleGenerateRecommendation()
                          }
                        }}
                        type="button"
                      >
                        Reassign
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-wf-ink-2">
                    {job.status === 'in_progress'
                      ? 'Work is currently in progress by technician in the field.'
                      : job.status === 'completed'
                        ? 'Work completed by technician.'
                        : 'Waiting for the technician to start work.'}
                  </p>
                </section>
              ) : null}

              {/* Status Row: Priority (8px dot + text) and Status chip (neutral by default) */}
              <div className="flex items-center gap-3">
                <PriorityBadge priority={job.priority} />
                <StatusBadge tone={job.status === 'completed' ? 'success' : 'default'}>
                  {JOB_STATUS_LABELS[job.status]}
                </StatusBadge>
              </div>

              {/* Draft Status Banner with One-Click Publish/Open */}
              {job.status === 'draft' && (
                <section className="rounded-card border border-wf-warn/30 bg-wf-warn-wash p-4 space-y-2.5">
                  <div className="flex items-center gap-2 text-wf-ink">
                    <AlertTriangle className="size-4 text-wf-warn shrink-0" />
                    <h4 className="text-xs font-semibold">Job in draft status</h4>
                  </div>
                  <p className="text-xs text-wf-ink-2 leading-relaxed">
                    This job is currently saved as a draft. Open this job to enable worker matching and assign field technicians.
                  </p>
                  {canEdit && (
                    <button
                      className="inline-flex h-8 items-center justify-center rounded-control border border-wf-border bg-wf-surface px-3 text-xs font-medium text-wf-ink hover:bg-wf-surface-sunken disabled:opacity-50 transition-colors"
                      disabled={isOpeningDraft}
                      onClick={() => void handleOpenDraftJob()}
                      type="button"
                    >
                      {isOpeningDraft ? 'Opening job...' : 'Open job for assignment'}
                    </button>
                  )}
                </section>
              )}

              {/* Smart Technician Match / Recommendation Section (Open jobs or Reassignment) */}
              {(job.status === 'open' || overrideMode) && (
                <section className="rounded-card border border-wf-border bg-wf-surface p-4 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="size-4 text-wf-ink-2" />
                      <h3 className="text-sm font-semibold text-wf-ink">
                        {overrideMode ? 'Reassign technician' : 'Smart technician match'}
                      </h3>
                    </div>
                    {canEdit && (
                      <button
                        className="inline-flex h-8 items-center gap-1.5 rounded-control border border-wf-border bg-wf-surface px-3 text-xs font-medium text-wf-ink-2 hover:bg-wf-surface-sunken hover:text-wf-ink disabled:opacity-50 transition-colors"
                        disabled={isGeneratingRecommendation}
                        onClick={handleGenerateRecommendation}
                        type="button"
                      >
                        {isGeneratingRecommendation ? 'Scoring...' : recommendation ? 'Refresh match' : 'Smart match'}
                      </button>
                    )}
                  </div>

                  {recommendation ? (
                    !topCandidate || recommendation.candidates.length === 0 ? (
                      /* Zero Candidates Found State */
                      <div className="rounded-card border border-wf-warn/30 bg-wf-warn-wash p-3.5 space-y-2.5">
                        <div className="flex items-center gap-2 text-wf-ink">
                          <AlertTriangle className="size-4 text-wf-warn shrink-0" />
                          <h4 className="text-xs font-semibold">No available technician found</h4>
                        </div>
                        <p className="text-xs text-wf-ink-2 leading-relaxed">
                          No active technician currently meets all required trade skills and schedule availability for this time slot.
                        </p>
                        <div className="flex gap-2 pt-1">
                          <button
                            className="inline-flex h-8 items-center justify-center rounded-control border border-wf-border bg-wf-surface px-3 text-xs font-medium text-wf-ink hover:bg-wf-surface-sunken transition-colors"
                            onClick={() => setOverrideMode(true)}
                            type="button"
                          >
                            Select technician manually
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Top Candidate Hero Card */
                      <div className="rounded-card border border-wf-border bg-wf-surface-sunken p-3.5 space-y-3">
                        {(() => {
                          const summary = summarizeCandidateExplanation(topCandidate)
                          const primaryReason = summary.highlights[0] || 'Matches trade skills and availability'
                          const isLowConfidence = topCandidate.totalScore < 0.40

                          return (
                            <>
                              <div className="flex items-start justify-between">
                                <div>
                                  <span
                                    className={cn(
                                      'inline-block rounded-control px-2 py-0.5 text-[11px] font-medium',
                                      isLowConfidence
                                        ? 'border border-wf-warn/30 bg-wf-warn-wash text-wf-warn'
                                        : 'border border-wf-border bg-wf-surface text-wf-ink-2'
                                    )}
                                  >
                                    {summary.confidenceBadgeText}
                                  </span>
                                  <h4 className="mt-1 text-base font-semibold text-wf-ink">
                                    {topCandidate.employeeName}
                                  </h4>
                                  <p className="mt-0.5 text-xs text-wf-ink-2 leading-relaxed">
                                    {isLowConfidence
                                      ? `Low calculated match score (${Math.round(topCandidate.totalScore * 100)}%). Review trade skills or select an alternative.`
                                      : primaryReason}
                                  </p>
                                </div>
                              </div>

                              {job.status === 'open' && (
                                <div className="pt-2 flex flex-col gap-2 sm:flex-row">
                                  <button
                                    className="flex-1 inline-flex h-9 items-center justify-center gap-1.5 rounded-control bg-wf-accent px-3 text-xs font-medium text-white hover:bg-wf-accent-hover disabled:opacity-50 transition-colors"
                                    disabled={isDeciding}
                                    onClick={() => void handleAcceptRecommendation(topCandidate)}
                                    type="button"
                                  >
                                    Assign {topCandidate.employeeName}
                                  </button>
                                  <button
                                    className="inline-flex h-9 items-center justify-center rounded-control border border-wf-border bg-wf-surface px-3 text-xs font-medium text-wf-ink-2 hover:bg-wf-surface-sunken hover:text-wf-ink transition-colors"
                                    onClick={() => setOverrideMode(!overrideMode)}
                                    type="button"
                                  >
                                    Choose other
                                  </button>
                                </div>
                              )}

                              {/* Progressive Disclosure Expander: Why this recommendation? */}
                              <div className="border-t border-wf-border pt-2.5">
                                <button
                                  className="inline-flex items-center gap-1 text-[11px] font-medium text-wf-ink-2 hover:text-wf-ink hover:underline transition-colors"
                                  onClick={() => setShowWhyMatch((prev) => !prev)}
                                  type="button"
                                >
                                  <span>{showWhyMatch ? 'Hide recommendation reasoning' : 'Why this recommendation?'}</span>
                                </button>

                                {showWhyMatch && (
                                  <div className="mt-2 rounded-control border border-wf-border bg-wf-surface p-2.5 space-y-2 text-xs">
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium text-wf-ink-3">Calculated match score</span>
                                      <span className="rounded-control border border-wf-border bg-wf-surface-sunken px-2 py-0.5 text-xs font-mono tabular-nums text-wf-ink">
                                        {summary.displayScoreText}
                                      </span>
                                    </div>
                                    <ul className="space-y-1 text-xs text-wf-ink-2">
                                      {summary.highlights.map((r) => (
                                        <li className="flex items-center gap-2" key={r}>
                                          <span className="size-1.5 rounded-full bg-wf-ink-3 shrink-0" />
                                          {r}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </>
                          )
                        })()}
                      </div>
                    )
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs text-wf-ink-2">
                        Select <strong>Smart match</strong> to score and find the best available technician for this job.
                      </p>
                      {canEdit && !overrideMode && (
                        <button
                          className="inline-flex h-8 items-center justify-center rounded-control border border-wf-border bg-wf-surface px-3 text-xs font-medium text-wf-ink-2 hover:bg-wf-surface-sunken hover:text-wf-ink transition-colors"
                          onClick={() => setOverrideMode(true)}
                          type="button"
                        >
                          Select technician manually
                        </button>
                      )}
                    </div>
                  )}

                  {/* Manual / Override Selection Drawer Dropdown */}
                  {overrideMode && (
                    <div className="rounded-card border border-wf-border bg-wf-surface p-3.5 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-semibold text-wf-ink">
                          {job.status === 'open' && recommendation && recommendation.status === 'generated' && recommendation.candidates.length > 0
                            ? 'Select alternative technician'
                            : job.status === 'assigned'
                              ? 'Reassign technician'
                              : 'Select technician'}
                        </h4>
                        <button
                          className="text-[11px] font-medium text-wf-ink-3 hover:text-wf-ink hover:underline transition-colors"
                          onClick={() => setOverrideMode(false)}
                          type="button"
                        >
                          Cancel
                        </button>
                      </div>
                      <select
                        className="h-9 w-full rounded-control border border-wf-border bg-wf-surface px-3 text-xs text-wf-ink outline-none focus:border-wf-accent focus:ring-1 focus:ring-wf-accent/20"
                        onChange={(e) => setSelectedOverrideEmployeeId(e.target.value)}
                        value={selectedOverrideEmployeeId}
                      >
                        <option value="">Select technician</option>
                        {assignableEmployees.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.displayName} ({emp.skills.join(', ') || 'General'})
                          </option>
                        ))}
                      </select>

                      <select
                        className="h-9 w-full rounded-control border border-wf-border bg-wf-surface px-3 text-xs text-wf-ink outline-none focus:border-wf-accent focus:ring-1 focus:ring-wf-accent/20"
                        onChange={(e) => setOverrideReason(e.target.value as AssignmentOverrideReason)}
                        value={overrideReason}
                      >
                        <option value="">
                          {job.status === 'open' && recommendation && recommendation.status === 'generated' && recommendation.candidates.length > 0
                            ? 'Select override reason (required)'
                            : 'Select reason (optional)'}
                        </option>
                        {ASSIGNMENT_OVERRIDE_REASONS.map((reason) => (
                          <option key={reason} value={reason}>
                            {reason}
                          </option>
                        ))}
                      </select>

                      <input
                        className="h-9 w-full rounded-control border border-wf-border bg-wf-surface px-3 text-xs text-wf-ink outline-none focus:border-wf-accent focus:ring-1 focus:ring-wf-accent/20 placeholder:text-wf-ink-3"
                        onChange={(e) => setOverrideNote(e.target.value)}
                        placeholder="Optional notes for audit log (e.g. customer request)..."
                        type="text"
                        value={overrideNote}
                      />

                      <button
                        className="w-full inline-flex h-8 items-center justify-center rounded-control bg-wf-accent text-xs font-medium text-white hover:bg-wf-accent-hover disabled:opacity-50 transition-colors"
                        disabled={!selectedOverrideEmployeeId || isDeciding}
                        onClick={() => void handleConfirmAssignmentChange()}
                        type="button"
                      >
                        {isDeciding
                          ? 'Assigning...'
                          : job.status === 'assigned'
                          ? 'Confirm reassignment'
                          : recommendation && recommendation.status === 'generated' && recommendation.candidates.length > 0 && selectedOverrideEmployeeId !== recommendation.candidates[0]?.employeeId
                            ? 'Confirm override assignment'
                            : 'Confirm assignment'}
                      </button>
                    </div>
                  )}
                </section>
              )}

              {/* Job Details Card (No monospace formatting) */}
              <section className="rounded-card border border-wf-border bg-wf-surface p-4 space-y-3 shadow-xs">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-wf-ink-3">
                  Job information
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 text-xs">
                  <div>
                    <span className="text-wf-ink-3">Phone</span>
                    <p className="font-medium text-wf-ink mt-0.5">{job.customerPhone || 'Not provided'}</p>
                  </div>
                  <div>
                    <span className="text-wf-ink-3">Address</span>
                    <p className="font-medium text-wf-ink mt-0.5">{job.serviceAddress || 'Not provided'}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-wf-ink-3">Description</span>
                    <p className="mt-0.5 text-wf-ink leading-relaxed">{job.description || 'No description provided.'}</p>
                  </div>
                  {job.requiredSkills && job.requiredSkills.length > 0 && (
                    <div className="sm:col-span-2">
                      <span className="text-wf-ink-3">Required skills</span>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {job.requiredSkills.map((sk) => (
                          <span className="rounded-control border border-wf-border bg-wf-surface-sunken px-2.5 py-0.5 text-xs font-medium text-wf-ink-2" key={sk}>
                            {sk}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Activity History Log (Collapsed by default) */}
              <section className="rounded-card border border-wf-border bg-wf-surface p-4 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-wf-ink-3">
                    Activity ({activities.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsActivityExpanded((prev) => !prev)}
                    className="text-xs font-medium text-wf-ink-2 hover:text-wf-ink hover:underline transition-colors"
                  >
                    {isActivityExpanded ? 'Collapse' : 'Expand'}
                  </button>
                </div>
                {isActivityExpanded && (
                  activities.length === 0 ? (
                    <p className="text-xs text-wf-ink-3">No recent activity recorded.</p>
                  ) : (
                    <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1 pt-1">
                      {activities.map((act) => (
                        <div className="flex items-start gap-2.5 text-xs border-b border-wf-border/60 pb-2 last:border-b-0" key={act.id}>
                          <span className="mt-1 size-1.5 rounded-full bg-wf-ink-3 shrink-0" />
                          <div className="flex-1">
                            <p className="font-medium text-wf-ink">{act.description}</p>
                            <span className="text-[11px] text-wf-ink-3">
                              {act.performedAt ? new Date(act.performedAt.toMillis()).toLocaleString() : 'Just now'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </section>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}

