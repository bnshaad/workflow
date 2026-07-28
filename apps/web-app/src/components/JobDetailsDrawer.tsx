import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ClipboardList,
  Sparkles,
  X,
} from 'lucide-react'

import { StatusBadge } from '@/components'
import { useAuth } from '@/hooks'
import { canEditJob } from '@/permissions'
import {
  ASSIGNMENT_OVERRIDE_REASONS,
  assignmentRecommendationService,
} from '@/services/recommendations'
import { jobService } from '@/services/jobs'
import {
  type AssignmentRecommendation,
  type AssignmentRecommendationCandidate,
  type AssignmentOverrideReason,
  JOB_STATUS_LABELS,
  type Job,
  type JobActivity,
  type JobPriority,
  type JobStatus,
  type UserProfile,
} from '@/types'

import { cn, summarizeCandidateExplanation } from '@/utils'



const priorityTone: Record<JobPriority, 'danger' | 'default' | 'warning'> = {
  High: 'danger',
  Low: 'default',
  Medium: 'warning',
  Urgent: 'danger',
}

const statusTone: Record<JobStatus, 'default' | 'primary' | 'success' | 'warning'> = {
  assigned: 'warning',
  cancelled: 'default',
  completed: 'success',
  draft: 'default',
  in_progress: 'primary',
  open: 'primary',
}

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





  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  useEffect(() => {
    let isMounted = true

    async function loadJobData() {
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


      try {
        const [loadedJob, loadedActivities, loadedEmployees] = await Promise.all([
          jobService.getJob(profile, jobId, profile.organizationId),
          jobService.getJobActivities(profile, jobId, profile.organizationId),
          jobService.listAssignableEmployees(profile, profile.organizationId),
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

        // Pre-fetch recommendations if job is open or assigned
        if (loadedJob.status === 'open' || loadedJob.status === 'assigned') {
          assignmentRecommendationService
            .generateAssignmentRecommendations(profile, profile.organizationId, loadedJob.id)
            .then((recResult) => {
              if (isMounted && recResult.recommendation) setRecommendation(recResult.recommendation)
            })
            .catch(() => {
              // fallback silent
            })
        }
      } catch {
        if (isMounted) setErrorMessage('Unable to load job details.')
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    void loadJobData()

    return () => {
      isMounted = false
    }
  }, [isOpen, jobId, profile])

  const assignedEmployeeNames = useMemo(() => {
    if (!job || job.assignedEmployeeIds.length === 0) return []
    return job.assignedEmployeeIds.map(
      (id) => assignableEmployees.find((e) => e.id === id)?.displayName || 'Field Technician',
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
    if (!profile || !job || !recommendation) return
    setIsDeciding(true)
    setActionErrorMessage('')
    setActionSuccessMessage('')

    try {
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

      const updatedActivities = await jobService.getJobActivities(
        profile,
        job.id,
        profile.organizationId,
      )
      setActivities(updatedActivities)
    } catch {
      setActionErrorMessage('Failed to confirm assignment.')
    } finally {
      setIsDeciding(false)
    }
  }

  const handleConfirmOverride = async () => {
    if (!profile || !job || !recommendation || !selectedOverrideEmployeeId || !overrideReason) return
    setIsDeciding(true)
    setActionErrorMessage('')

    const recommendedCandidate = recommendation.candidates[0]
    if (!recommendedCandidate) return

    try {
      const result = await assignmentRecommendationService.decideAssignmentRecommendation(
        profile,
        profile.organizationId,
        {
          decision: 'overridden',
          overrideNote,
          overrideReason,
          recommendationId: recommendation.id,
          selectedEmployeeId: selectedOverrideEmployeeId,
        },
      )

      setJob(result.job)
      setRecommendation(result.recommendation)
      setOverrideMode(false)
      setActionSuccessMessage('Assignment decision updated.')
      if (onJobUpdated) onJobUpdated(result.job)

      const updatedActivities = await jobService.getJobActivities(
        profile,
        job.id,
        profile.organizationId,
      )
      setActivities(updatedActivities)
    } catch {
      setActionErrorMessage('Failed to save override decision.')
    } finally {
      setIsDeciding(false)
    }
  }



  if (!isOpen) return null

  const canEdit = profile ? canEditJob(profile) : false
  const topCandidate = recommendation?.candidates[0] ?? null

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity">
      <div
        className="fixed inset-0"
        onClick={onClose}
      />
      <div className="relative z-10 flex h-full w-full max-w-2xl flex-col border-l border-border bg-card shadow-2xl">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ClipboardList className="size-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-foreground">
                {isLoading ? 'Loading Job...' : job?.title || 'Job Details'}
              </h2>
              {job ? (
                <p className="text-xs text-muted-foreground">
                  Customer: <span className="font-medium text-foreground">{job.customerName}</span>
                </p>
              ) : null}
            </div>
          </div>
          <button
            className="flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Loading job operational data...
            </div>
          ) : errorMessage ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              {errorMessage}
            </div>
          ) : job ? (
            <>
              {/* Operational Status Badges */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/20 p-4">
                <div className="flex items-center gap-2">
                  <StatusBadge tone={statusTone[job.status]}>
                    {JOB_STATUS_LABELS[job.status]}
                  </StatusBadge>
                  <StatusBadge tone={priorityTone[job.priority]}>
                    {`${job.priority} Priority`}
                  </StatusBadge>

                </div>
                {assignedEmployeeNames.length > 0 ? (
                  <span className="text-xs font-semibold text-foreground">
                    Assigned to: <span className="font-bold text-primary">{assignedEmployeeNames.join(', ')}</span>
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-amber-600">
                    Needs Assignment
                  </span>
                )}
              </div>

              {/* Action Alert Messages */}
              {actionErrorMessage ? (
                <div className="rounded-lg bg-destructive/10 p-3 text-xs font-medium text-destructive">
                  {actionErrorMessage}
                </div>
              ) : null}
              {actionSuccessMessage ? (
                <div className="rounded-lg bg-emerald-500/10 p-3 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  {actionSuccessMessage}
                </div>
              ) : null}

              {/* Assigned Technician Card (If already assigned) */}
              {job.assignedEmployeeIds.length > 0 && !overrideMode ? (
                <section className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                        Assigned Field Technician
                      </span>
                      <h3 className="text-base font-bold text-foreground mt-0.5">
                        {assignedEmployeeNames.join(', ')}
                      </h3>
                    </div>
                    {canEdit && (
                      <button
                        className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-card px-3 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
                        onClick={() => {
                          setOverrideMode(true)
                          if (!recommendation) void handleGenerateRecommendation()
                        }}
                        type="button"
                      >
                        Reassign Technician
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {job.status === 'in_progress'
                      ? '⚡ Work is currently in progress by technician on field.'
                      : job.status === 'completed'
                        ? '✅ Work completed by technician.'
                        : '⌛ Work assigned. Waiting for technician to start work on mobile app.'}
                  </p>
                </section>
              ) : null}

              {/* Smart Dispatch / AI Recommendation Section (Shown for Open jobs or Reassignment) */}
              {(job.status === 'open' || overrideMode) && (
                <section className="rounded-xl border border-primary/20 bg-card p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="size-4 text-primary" />
                      <h3 className="text-sm font-bold text-foreground">
                        {overrideMode ? 'Reassign Technician' : 'Smart Technician Match'}
                      </h3>
                    </div>
                    {canEdit && (
                      <button
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary/10 px-3 text-xs font-semibold text-primary hover:bg-primary/20 disabled:opacity-50"
                        disabled={isGeneratingRecommendation}
                        onClick={handleGenerateRecommendation}
                        type="button"
                      >
                        {isGeneratingRecommendation ? 'Scoring...' : recommendation ? 'Refresh Match' : 'Smart Match'}
                      </button>
                    )}
                  </div>

                  {recommendation ? (
                    !topCandidate || recommendation.candidates.length === 0 ? (
                      /* Zero Candidates Found State */
                      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3.5 space-y-3">
                        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                          <AlertTriangle className="size-4 shrink-0" />
                          <h4 className="text-xs font-bold">No Available Technician Found</h4>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          No active technician currently meets all required trade skills and schedule availability for this time slot.
                        </p>
                        <div className="flex gap-2 pt-1">
                          <button
                            className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground hover:bg-muted"
                            onClick={() => setOverrideMode(true)}
                            type="button"
                          >
                            Select Technician Manually
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Hero Card (High, Medium, or Low Confidence) */
                      <div className="rounded-lg border border-border bg-muted/10 p-3.5 space-y-3">
                        {(() => {
                          const summary = summarizeCandidateExplanation(topCandidate)
                          const primaryReason = summary.highlights[0] || 'Matches trade skills & availability'
                          const isLowConfidence = topCandidate.totalScore < 0.40

                          return (
                            <>
                              <div className="flex items-start justify-between">
                                <div>
                                  <span
                                    className={cn(
                                      'inline-block rounded-full px-2 py-0.5 text-[10px] font-bold',
                                      isLowConfidence
                                        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                                        : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                    )}
                                  >
                                    {summary.confidenceBadgeText}
                                  </span>
                                  <h4 className="mt-1 text-base font-bold text-foreground">
                                    {topCandidate.employeeName}
                                  </h4>
                                  <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                                    {isLowConfidence
                                      ? `Low calculated match score (${Math.round(topCandidate.totalScore * 100)}%). Review trade skills or select an alternative.`
                                      : primaryReason}
                                  </p>
                                </div>
                              </div>

                              {job.status === 'open' && (
                                <div className="pt-2 flex flex-col gap-2 sm:flex-row">
                                  <button
                                    className="flex-1 inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                                    disabled={isDeciding}
                                    onClick={() => void handleAcceptRecommendation(topCandidate)}
                                    type="button"
                                  >
                                    ⚡ Assign {topCandidate.employeeName}
                                  </button>
                                  <button
                                    className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-card px-3 text-xs font-semibold text-muted-foreground hover:bg-muted"
                                    onClick={() => setOverrideMode(!overrideMode)}
                                    type="button"
                                  >
                                    Choose Other
                                  </button>
                                </div>
                              )}


                              {/* Progressive Disclosure Expander: "Why this recommendation?" */}
                              <div className="border-t border-border/60 pt-2.5">
                                <button
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                                  onClick={() => setShowWhyMatch((prev) => !prev)}
                                  type="button"
                                >
                                  <span>{showWhyMatch ? 'Hide recommendation reasoning ▲' : 'Why this recommendation? ▾'}</span>
                                </button>

                                {showWhyMatch && (
                                  <div className="mt-2 rounded-md border border-border bg-background p-2.5 space-y-2 text-xs">
                                    <div className="flex items-center justify-between">
                                      <span className="font-semibold text-muted-foreground">Calculated Match Score</span>
                                      <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                                        {summary.displayScoreText}
                                      </span>
                                    </div>
                                    <ul className="space-y-1 text-xs text-muted-foreground">
                                      {summary.highlights.map((r) => (
                                        <li className="flex items-center gap-2" key={r}>
                                          <span className="size-1.5 rounded-full bg-primary" />
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
                    <p className="text-xs text-muted-foreground">
                      Click <strong>Smart Match</strong> to score and find the best available technician for this job.
                    </p>
                  )}

                  {/* Override Options Drawer Dropdown */}
                  {overrideMode && (
                    <div className="rounded-lg border border-border bg-background p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-foreground">Select Alternative Technician</h4>
                        <button
                          className="text-[11px] text-muted-foreground hover:underline"
                          onClick={() => setOverrideMode(false)}
                          type="button"
                        >
                          Cancel
                        </button>
                      </div>
                      <select
                        className="h-9 w-full rounded-md border border-border bg-card px-3 text-xs"
                        onChange={(e) => setSelectedOverrideEmployeeId(e.target.value)}
                        value={selectedOverrideEmployeeId}
                      >
                        <option value="">Select Technician</option>
                        {assignableEmployees.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.displayName} ({emp.skills.join(', ') || 'General'})
                          </option>
                        ))}
                      </select>

                      <select
                        className="h-9 w-full rounded-md border border-border bg-card px-3 text-xs"
                        onChange={(e) => setOverrideReason(e.target.value as AssignmentOverrideReason)}
                        value={overrideReason}
                      >
                        <option value="">Select Override Reason (Required)</option>
                        {ASSIGNMENT_OVERRIDE_REASONS.map((reason) => (
                          <option key={reason} value={reason}>
                            {reason}
                          </option>
                        ))}
                      </select>

                      <input
                        className="h-9 w-full rounded-md border border-border bg-card px-3 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                        onChange={(e) => setOverrideNote(e.target.value)}
                        placeholder="Optional notes for audit log (e.g. Client requested Rahul)..."
                        type="text"
                        value={overrideNote}
                      />

                      <button
                        className="w-full inline-flex h-8 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground disabled:opacity-50"
                        disabled={!selectedOverrideEmployeeId || !overrideReason || isDeciding}
                        onClick={() => void handleConfirmOverride()}
                        type="button"
                      >
                        Confirm Assignment Change
                      </button>
                    </div>
                  )}

                </section>
              )}

              {/* Field Execution Guidance */}
              <section className="rounded-xl border border-border bg-card p-4 space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Field Work Progression
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Job status (<code>Assigned</code> ➔ <code>In Progress</code> ➔ <code>Completed</code>) is updated automatically in real-time as the assigned technician executes work on their mobile field application.
                </p>
              </section>


              {/* Job Details Card */}
              <section className="rounded-xl border border-border bg-card p-4 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Job Information
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Customer Phone</span>
                    <p className="font-semibold text-foreground mt-0.5">{job.customerPhone || 'Not provided'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Service Address</span>
                    <p className="font-semibold text-foreground mt-0.5">{job.serviceAddress || 'Not provided'}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-muted-foreground">Description</span>
                    <p className="mt-1 text-foreground leading-relaxed">{job.description || 'No description provided.'}</p>
                  </div>
                  {job.requiredSkills && job.requiredSkills.length > 0 && (
                    <div className="sm:col-span-2">
                      <span className="text-muted-foreground">Required Trade Skills</span>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {job.requiredSkills.map((sk) => (
                          <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground" key={sk}>
                            {sk}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Activity History Log */}
              <section className="rounded-xl border border-border bg-card p-4 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Activity Timeline ({activities.length})
                </h3>
                {activities.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No recent activity recorded.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {activities.map((act) => (
                      <div className="flex items-start gap-2.5 text-xs border-b border-border/50 pb-2 last:border-b-0" key={act.id}>
                        <span className="mt-0.5 size-2 rounded-full bg-primary shrink-0" />
                        <div>
                          <p className="font-medium text-foreground">{act.description}</p>
                          <span className="text-[10px] text-muted-foreground">
                            {act.performedAt ? new Date(act.performedAt.toMillis()).toLocaleString() : 'Just now'}
                          </span>

                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
