import { useEffect, useState } from 'react'
import { Check, Loader2, Sparkles, X } from 'lucide-react'
import { StatusBadge } from '@/components'
import { useAuth } from '@/hooks'
import { jobService } from '@/services/jobs'
import { ASSIGNMENT_OVERRIDE_REASONS, assignmentRecommendationService } from '@/services/recommendations'
import type { AssignmentOverrideReason, AssignmentRecommendation, AssignmentRecommendationCandidate, Job, UserProfile } from '@/types'
import { summarizeCandidateExplanation } from '@/utils'


export function QuickAssignModal({
  job,
  isOpen,
  onClose,
  onAssigned,
}: {
  job: Job | null
  isOpen: boolean
  onClose: () => void
  onAssigned: (updatedJob: Job) => void
}) {
  const { profile } = useAuth()
  const [recommendation, setRecommendation] = useState<AssignmentRecommendation | null>(null)
  const [employees, setEmployees] = useState<UserProfile[]>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [overrideReason, setOverrideReason] = useState<AssignmentOverrideReason | ''>('')
  const [overrideNote, setOverrideNote] = useState('')
  const [showWhyMatch, setShowWhyMatch] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (!isOpen || !job || !profile) return

    let isMounted = true

    async function loadQuickAssignData() {
      if (!job || !profile) return

      try {
        const [res, emps] = await Promise.all([
          assignmentRecommendationService.generateAssignmentRecommendations(profile, profile.organizationId, job.id),
          jobService.listAssignableEmployees(profile, profile.organizationId),
        ])

        if (isMounted) {
          const rec = res.recommendation
          setRecommendation(rec)
          setEmployees(emps)
          if (rec && rec.candidates.length > 0) {
            setSelectedEmployeeId(rec.candidates[0].employeeId)
          } else if (emps.length > 0) {
            setSelectedEmployeeId(emps[0].id)
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          setErrorMessage(err instanceof Error ? err.message : 'Unable to load assignment recommendations.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadQuickAssignData()

    return () => {
      isMounted = false
    }
  }, [isOpen, job, profile])

  if (!isOpen || !job) return null

  const handleAssign = async (employeeId: string) => {
    if (!profile || !job || !employeeId) return

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      if (recommendation) {
        const isTopMatch = recommendation.candidates[0]?.employeeId === employeeId
        const reason = isTopMatch ? undefined : (overrideReason || 'Manager preference')
        const result = await assignmentRecommendationService.decideAssignmentRecommendation(
          profile,
          profile.organizationId,
          {
            decision: isTopMatch ? 'accepted' : 'overridden',
            overrideReason: reason,
            overrideNote: isTopMatch ? undefined : (overrideNote.trim() || undefined),
            recommendationId: recommendation.id,
            selectedEmployeeId: employeeId,
          },
        )
        onAssigned(result.job)
      } else {
        const result = await jobService.assignEmployeesToJob(
          profile,
          job.id,
          profile.organizationId,
          [employeeId],
        )
        onAssigned(result.job)
      }
      onClose()
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to assign technician.')
    } finally {
      setIsSubmitting(false)
    }
  }



  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-xl rounded-xl border border-border bg-card p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="size-5 text-primary" />
              Quick Assign Technician
            </h2>
            <p className="text-xs text-muted-foreground">
              Review AI recommendations and assign a field technician in 1 click.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="rounded-lg border border-border bg-muted/40 p-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-foreground text-sm">{job.title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{job.customerName} • {job.serviceAddress || job.location || 'Location N/A'}</p>
            </div>
            <StatusBadge tone={job.priority === 'Urgent' || job.priority === 'High' ? 'danger' : 'warning'}>
              {`${job.priority} Priority`}
            </StatusBadge>
          </div>
        </div>

        {errorMessage ? (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
            {errorMessage}
          </div>
        ) : null}

        {isLoading ? (
          <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-5 animate-spin text-primary" />
            Analyzing technician eligibility & AI scores...
          </div>
        ) : (
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Top AI Worker Candidates ({recommendation?.candidates.length || 0})
            </h4>

            {recommendation && recommendation.candidates.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {recommendation.candidates.map((cand: AssignmentRecommendationCandidate, idx: number) => {
                  const summary = summarizeCandidateExplanation(cand)
                  const primaryReason = summary.highlights[0] || 'Matches required trade skills & schedule availability'
                  return (
                    <div
                      key={cand.employeeId}
                      className={`p-3 rounded-lg border text-sm transition ${
                        selectedEmployeeId === cand.employeeId
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-background'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">{cand.employeeName}</span>
                            {idx === 0 ? (
                              <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                                TOP MATCH
                              </span>
                            ) : null}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                            {primaryReason}
                          </p>
                        </div>

                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => handleAssign(cand.employeeId)}
                          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                        >
                          {isSubmitting && selectedEmployeeId === cand.employeeId ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <Check className="size-3" />
                          )}
                          Assign
                        </button>
                      </div>

                      {/* Progressive Disclosure Expander */}
                      <div className="mt-2 border-t border-border/40 pt-1.5">
                        <button
                          type="button"
                          className="text-[11px] font-semibold text-primary hover:underline"
                          onClick={() => setShowWhyMatch((prev) => !prev)}
                        >
                          {showWhyMatch ? 'Hide score breakdown ▲' : 'Why this candidate? ▾'}
                        </button>

                        {showWhyMatch && (
                          <div className="mt-1.5 rounded bg-muted/40 p-2 text-xs space-y-1">
                            <div className="flex justify-between font-medium text-muted-foreground">
                              <span>Calculated Score:</span>
                              <span className="font-bold text-foreground">{summary.displayScoreText}</span>
                            </div>
                            <ul className="space-y-0.5 text-muted-foreground">
                              {summary.highlights.map((h) => (
                                <li key={h} className="flex items-center gap-1.5">
                                  <span className="size-1 rounded-full bg-primary" />
                                  {h}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="p-4 border border-dashed border-border rounded-lg text-center text-xs text-muted-foreground">
                ⚠️ No high-confidence AI candidate matches found. Select a technician manually below.
              </div>
            )}

            <div className="border-t border-border pt-3 space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Or Select Technician Manually
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="h-9 rounded-md border border-border bg-background px-3 text-xs text-foreground outline-none focus:border-primary"
                >
                  <option value="">Choose technician...</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.displayName} ({emp.skills.join(', ') || 'General'})
                    </option>
                  ))}
                </select>

                <select
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value as AssignmentOverrideReason)}
                  className="h-9 rounded-md border border-border bg-background px-3 text-xs text-foreground outline-none focus:border-primary"
                >
                  <option value="">Select Override Reason (Required)</option>
                  {ASSIGNMENT_OVERRIDE_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={overrideNote}
                  onChange={(e) => setOverrideNote(e.target.value)}
                  placeholder="Optional audit notes (e.g. Client requested Rahul)..."
                  className="h-9 flex-1 rounded-md border border-border bg-background px-3 text-xs outline-none focus:border-primary"
                />
                <button
                  type="button"
                  disabled={isSubmitting || !selectedEmployeeId}
                  onClick={() => handleAssign(selectedEmployeeId)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-card px-4 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50"
                >
                  Confirm Manual Assign
                </button>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
