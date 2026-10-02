import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CheckCircle2,
  ClipboardList,
  ListFilter,
  MessageSquare,
  RefreshCcw,
  UserPlus,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  CreateJobDrawer,
  JobDetailsDrawer,
  LoadingSkeleton,
  MetricCard,
  QuickAssignModal,
} from '@/components'

import { useAuth } from '@/hooks'
import { toJsDate } from '@/services/common'
import { workflowCoordinator } from '@/services/coordinator'
import {
  getDashboardSummary,
  type DashboardOperationalJob,
  type DashboardSummary,
  type RecentDashboardActivity,
} from '@/services/dashboard'
import { jobService } from '@/services/jobs'
import { incidentService } from '@/services/incidents/incidentService'
import { assignmentRecommendationService } from '@/services/recommendations'
import { whatsappDemoService } from '@/services/whatsapp/whatsappDemoService'
import { type Job } from '@/types'
import { cn, getJobAttentionReason, sortOperationalJobs } from '@/utils'
import type {
  OperationsAttentionItem,
  OperationsIntelligenceResult,
  OperationsIntent,
} from '../../../../shared/operationsIntelligence.ts'


const operationsCommands: Array<{
  intent: Exclude<OperationsIntent, 'explain_job_attention_flag'>
  label: string
  message: string
}> = [
  { intent: 'show_jobs_requiring_attention', label: 'Flagged jobs', message: 'Show jobs requiring attention' },
  { intent: 'show_overdue_jobs', label: 'Past due', message: 'Show overdue jobs' },
  { intent: 'show_workload_distribution', label: 'Who\'s busy', message: 'Show workload distribution' },
  { intent: 'summarize_open_operations', label: 'Today\'s snapshot', message: 'Summarize open operations' },
]

export function DashboardPage() {
  const { profile } = useAuth()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [generatedRecommendationJobIds, setGeneratedRecommendationJobIds] =
    useState<Set<string> | null>(null)
  const [pendingWhatsAppCount, setPendingWhatsAppCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [operationsError, setOperationsError] = useState('')
  const [operationsInsight, setOperationsInsight] = useState<OperationsIntelligenceResult | null>(null)
  const [operationsIntent, setOperationsIntent] = useState<OperationsIntent | null>(null)

  const [quickAssignJob, setQuickAssignJob] = useState<Job | null>(null)
  const [selectedDrawerJobId, setSelectedDrawerJobId] = useState<string | null>(null)
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false)


  const handleQuickAssignOpJob = async (opJob: DashboardOperationalJob) => {
    if (!profile) return
    try {
      const fullJob = await jobService.getJob(profile, opJob.id, profile.organizationId)
      if (fullJob) {
        setQuickAssignJob(fullJob)
      }
    } catch {
      // fallback
    }
  }

  const [isRefreshing, setIsRefreshing] = useState(false)
  const isFetchingRef = useRef(false)

  const handleDashboardJobAssigned = async () => {
    if (!profile) return
    try {
      const updatedSummary = await getDashboardSummary(profile, profile.organizationId, { bypassCache: true })
      setSummary(updatedSummary)
    } catch {
      // ignore
    }
  }

  const handleRefresh = useCallback(
    async (bypassCache = true, silent = false) => {
      if (!profile || isFetchingRef.current) return
      isFetchingRef.current = true
      if (!silent) setIsRefreshing(true)
      try {
        const [dashboardSummary, recommendationJobIds, waProposals] = await Promise.all([
          getDashboardSummary(profile, profile.organizationId, { bypassCache }),
          assignmentRecommendationService
            .getGeneratedRecommendationJobIds(profile, profile.organizationId)
            .catch(() => null),
          whatsappDemoService
            .listWhatsAppProposals(profile)
            .catch(() => []),
        ])
        setSummary(dashboardSummary)
        setGeneratedRecommendationJobIds(recommendationJobIds)
        const pendingCount = waProposals.filter(
          (p) =>
            p.whatsappMetadata?.threadState === 'pending_review' ||
            p.whatsappMetadata?.threadState === 'drafting',
        ).length
        setPendingWhatsAppCount(pendingCount)
      } catch {
        // ignore
      } finally {
        isFetchingRef.current = false
        if (!silent) setIsRefreshing(false)
      }
    },
    [profile],
  )

  useEffect(() => {
    let isMounted = true

    async function loadDashboard() {
      if (!profile) return

      setIsLoading(true)
      setErrorMessage('')

      try {
        const [dashboardSummary, recommendationJobIds, waProposals] = await Promise.all([
          getDashboardSummary(profile, profile.organizationId),
          assignmentRecommendationService
            .getGeneratedRecommendationJobIds(profile, profile.organizationId)
            .catch((error: unknown) => {
              if (import.meta.env.DEV) {
                console.error('Failed to load recommendation state.', error)
              }
              return null
            }),
          whatsappDemoService
            .listWhatsAppProposals(profile)
            .catch(() => []),
        ])

        if (isMounted) {
          setSummary(dashboardSummary)
          setGeneratedRecommendationJobIds(recommendationJobIds)
          const pendingCount = waProposals.filter(
            (p) =>
              p.whatsappMetadata?.threadState === 'pending_review' ||
              p.whatsappMetadata?.threadState === 'drafting',
          ).length
          setPendingWhatsAppCount(pendingCount)
        }
      } catch (error) {
        if (import.meta.env.DEV) console.error('Dashboard failed to load.', error)
        if (isMounted) {
          setErrorMessage('Unable to load current operations. Please try again.')
          setSummary(null)
          setGeneratedRecommendationJobIds(null)
        }
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    void loadDashboard()
    return () => {
      isMounted = false
    }
  }, [profile])

  // Live sync: Firestore real-time listener for jobs and open incidents
  useEffect(() => {
    if (!profile) return

    const unsubJobs = jobService.subscribeToJobs(
      profile,
      profile.organizationId,
      () => {
        void handleRefresh(true, true)
      },
      (error) => {
        if (import.meta.env.DEV) {
          console.error('Failed to subscribe to live dashboard jobs.', error)
        }
      },
    )

    const unsubIncidents = incidentService.subscribeToOpenIncidents(
      profile,
      profile.organizationId,
      () => {
        void handleRefresh(true, true)
      },
      (error) => {
        if (import.meta.env.DEV) {
          console.error('Failed to subscribe to live dashboard incidents.', error)
        }
      },
    )

    return () => {
      unsubJobs()
      unsubIncidents()
    }
  }, [profile, handleRefresh])

  // Focus check when tab gains focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && profile) {
        void handleRefresh(true, true)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleVisibilityChange)
    }
  }, [profile, handleRefresh])

  const attentionJobs = useMemo(
    () =>
      sortOperationalJobs(
        (summary?.operationalJobs ?? []).filter(
          (job) => getJobAttentionReason(job) !== null,
        ),
      ).slice(0, 5),
    [summary],
  )
  const pendingAssignments = useMemo(
    () =>
      sortOperationalJobs(
        (summary?.operationalJobs ?? []).filter(
          (job) =>
            job.status === 'open' &&
            job.assignedEmployeeIds.length === 0 &&
            getJobAttentionReason(job) === null,
        ),
      ).slice(0, 5),
    [summary],
  )
  async function loadOperationsInsight(
    intent: Exclude<OperationsIntent, 'explain_job_attention_flag'>,
    message: string,
  ) {
    if (!profile) return
    setOperationsIntent(intent)
    setOperationsError('')

    try {
      const response = await workflowCoordinator.handle(profile, {
        message,
        uiContext: 'dashboard',
      })

      if (response.kind !== 'result' || !isOperationsIntelligenceResult(response.data, intent)) {
        throw new Error('The operations request was not completed.')
      }

      setOperationsInsight(response.data)
    } catch (error) {
      if (import.meta.env.DEV) console.error('Operations insight failed to load.', error)
      setOperationsError('Unable to load this operations view. Try again.')
    } finally {
      setOperationsIntent(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Page Header Fold */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[24px] font-semibold leading-[30px] tracking-tight text-wf-ink">
            Dashboard
          </h1>
          <p className="mt-0.5 text-[13px] font-normal leading-[18px] text-wf-ink-3">
            {formatDashboardContext(new Date())}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            aria-label="Refresh dashboard data"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-control border border-wf-border bg-wf-surface px-3 text-[13px] font-medium text-wf-ink-2 shadow-card transition-colors hover:bg-wf-surface-sunken focus:outline-none focus:ring-2 focus:ring-wf-accent/30"
            disabled={isRefreshing}
            onClick={() => void handleRefresh(true)}
            type="button"
          >
            <RefreshCcw aria-hidden="true" className={cn('size-3.5', isRefreshing && 'animate-spin')} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <DashboardLoadingState />
      ) : errorMessage ? (
        <section className="rounded-card border border-wf-danger/30 bg-wf-danger-wash px-4 py-3 text-xs font-medium text-wf-danger" role="alert">
          {errorMessage}
        </section>
      ) : summary ? (
        <>
          {/* Top Fold 4 KPI Metrics Grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCard
              label="Open jobs"
              value={String(summary.jobMetrics.statusCounts.open)}
            />
            <MetricCard
              label="Assigned & active"
              value={String(summary.jobMetrics.statusCounts.assigned + summary.jobMetrics.statusCounts.in_progress)}
            />
            <MetricCard
              label="Needs attention"
              tone={attentionJobs.length > 0 ? 'danger' : 'default'}
              value={String(attentionJobs.length)}
            />
            <MetricCard
              label="Completed"
              value={String(summary.jobMetrics.statusCounts.completed)}
            />
          </div>

          {/* Desktop 2-Column Responsive Layout */}
          <div className="grid gap-4 lg:grid-cols-12">
            {/* Left Column (Main Queues — 8 Cols) */}
            <div className="space-y-3.5 lg:col-span-8">
              {/* WhatsApp Intake Banner if pending requests */}
              {pendingWhatsAppCount > 0 ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-card border border-emerald-200 bg-emerald-50/70 p-3.5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-control bg-emerald-100 text-emerald-700">
                      <MessageSquare className="size-5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-emerald-950">
                        {pendingWhatsAppCount} WhatsApp {pendingWhatsAppCount === 1 ? 'request' : 'requests'} pending review
                      </p>
                      <p className="text-xs text-emerald-800">
                        Incoming customer messages drafted by Gemini with technician match recommendations.
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <Link
                      to="/jobs?tab=whatsapp"
                      className="rounded-control bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-800 transition-colors inline-block"
                    >
                      Review Requests
                    </Link>
                  </div>
                </div>
              ) : null}

              <NeedsAttention
                jobs={attentionJobs}
                onQuickAssign={handleQuickAssignOpJob}
                onSelectJob={(id) => setSelectedDrawerJobId(id)}
              />
              <PendingAssignments
                generatedRecommendationJobIds={generatedRecommendationJobIds}
                jobs={pendingAssignments}
                onQuickAssign={handleQuickAssignOpJob}
                onSelectJob={(id) => setSelectedDrawerJobId(id)}
              />

              <RecentActivity summary={summary} />
            </div>

            {/* Right Column (Widgets & AI Intelligence — 4 Cols) */}
            <div className="space-y-3.5 lg:col-span-4">
              <OperationsInsightPanel
                errorMessage={operationsError}
                insight={operationsInsight}
                loadingIntent={operationsIntent}
                onSelect={loadOperationsInsight}
              />
              <EmployeeWorkload summary={summary} />
            </div>
          </div>
        </>
      ) : null}

      <QuickAssignModal
        isOpen={Boolean(quickAssignJob)}
        job={quickAssignJob}
        onAssigned={handleDashboardJobAssigned}
        onClose={() => setQuickAssignJob(null)}
      />

      <JobDetailsDrawer
        isOpen={Boolean(selectedDrawerJobId)}
        jobId={selectedDrawerJobId}
        onClose={() => setSelectedDrawerJobId(null)}
        onJobUpdated={handleDashboardJobAssigned}
      />

      <CreateJobDrawer
        isOpen={isCreateDrawerOpen}
        onClose={() => setIsCreateDrawerOpen(false)}
        onJobCreated={(newJob) => {
          setSelectedDrawerJobId(newJob.id)
          void handleDashboardJobAssigned()
        }}
      />
    </div>
  )
}

function formatSeverity(job: DashboardOperationalJob): { text: string; tone: 'danger' | 'warn' | 'neutral' } {
  const date = toJsDate(job.dueDate)
  if (!date) {
    return { text: 'No due date', tone: 'neutral' }
  }
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays > 0) {
    if (diffDays >= 7) {
      return { text: `${diffDays} days overdue`, tone: 'danger' }
    }
    return { text: `${diffDays} day${diffDays === 1 ? '' : 's'} overdue`, tone: 'warn' }
  } else {
    const remainingDays = Math.abs(diffDays)
    if (remainingDays === 0) {
      return { text: 'Due today', tone: 'warn' }
    }
    return { text: `Due in ${remainingDays} day${remainingDays === 1 ? '' : 's'}`, tone: 'neutral' }
  }
}

function NeedsAttention({
  jobs,
  onQuickAssign,
  onSelectJob,
}: {
  jobs: DashboardOperationalJob[]
  onQuickAssign: (job: DashboardOperationalJob) => void
  onSelectJob: (jobId: string) => void
}) {
  return (
    <section aria-labelledby="needs-attention-heading" className="overflow-hidden rounded-card border border-wf-border bg-wf-surface shadow-card">
      <SectionHeader
        action={
          <Link className="text-[13px] font-medium text-wf-accent hover:underline focus:outline-none focus:ring-2 focus:ring-wf-accent/30" to="/jobs?view=overdue">
            View queue
          </Link>
        }
        title="Needs attention"
        titleId="needs-attention-heading"
      />
      {jobs.length > 0 ? (
        <div className="divide-y divide-wf-border">
          {jobs.map((job) => {
            const severity = formatSeverity(job)
            const needsAssignment = job.status === 'open' && job.assignedEmployeeIds.length === 0
            const isUrgent = job.priority === 'Urgent'
            const isHigh = job.priority === 'High'

            return (
              <div
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between transition-colors hover:bg-wf-surface-sunken cursor-pointer"
                key={job.id}
                onClick={() => onSelectJob(job.id)}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {isUrgent ? (
                      <span
                        aria-label="Urgent priority"
                        className="size-2 rounded-full bg-wf-danger shrink-0"
                      />
                    ) : null}
                    <button
                      className="text-left text-[15px] font-medium leading-[22px] text-wf-ink hover:text-wf-accent focus:outline-none"
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelectJob(job.id)
                      }}
                      type="button"
                    >
                      {job.title}
                    </button>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[13px] font-normal leading-[18px]">
                    <span
                      className={cn(
                        severity.tone === 'danger' && 'text-wf-danger font-medium',
                        severity.tone === 'warn' && 'text-wf-warn font-medium',
                        severity.tone === 'neutral' && 'text-wf-ink-3',
                      )}
                    >
                      {severity.text}
                    </span>
                    {isHigh ? (
                      <>
                        <span className="text-wf-ink-3">,</span>
                        <span className="text-wf-warn">high priority</span>
                      </>
                    ) : null}
                    <span className="text-wf-ink-3">,</span>
                    <span className="text-wf-ink-3">{formatDueDate(job)}</span>
                  </div>
                </div>

                <div onClick={(e) => e.stopPropagation()}>
                  {needsAssignment ? (
                    <button
                      type="button"
                      onClick={() => onQuickAssign(job)}
                      className="inline-flex h-8 shrink-0 items-center justify-center rounded-control border border-wf-border bg-wf-surface px-3 text-[13px] font-medium text-wf-ink-2 shadow-card transition-colors hover:bg-wf-surface-sunken hover:text-wf-accent focus:outline-none focus:ring-2 focus:ring-wf-accent/30"
                    >
                      Assign
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSelectJob(job.id)}
                      className="inline-flex h-8 shrink-0 items-center justify-center rounded-control border border-wf-border bg-wf-surface px-3 text-[13px] font-medium text-wf-ink-2 shadow-card transition-colors hover:bg-wf-surface-sunken hover:text-wf-accent focus:outline-none focus:ring-2 focus:ring-wf-accent/30"
                    >
                      Open
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <EmptyRow>No urgent or overdue jobs need attention.</EmptyRow>
      )}
    </section>
  )
}

function PendingAssignments({
  generatedRecommendationJobIds,
  jobs,
  onQuickAssign,
  onSelectJob,
}: {
  generatedRecommendationJobIds: Set<string> | null
  jobs: DashboardOperationalJob[]
  onQuickAssign: (job: DashboardOperationalJob) => void
  onSelectJob: (jobId: string) => void
}) {
  return (
    <section aria-labelledby="pending-assignments-heading" className="overflow-hidden rounded-card border border-wf-border bg-wf-surface shadow-card">
      <SectionHeader
        action={
          <Link className="text-[13px] font-medium text-wf-accent hover:underline focus:outline-none focus:ring-2 focus:ring-wf-accent/30" to="/jobs?view=needs-assignment">
            View all
          </Link>
        }
        title="Pending assignments"
        titleId="pending-assignments-heading"
      />
      {jobs.length > 0 ? (
        <div className="divide-y divide-wf-border">
          {jobs.map((job) => {
            const isUrgent = job.priority === 'Urgent'
            const recommendationIsReady = generatedRecommendationJobIds?.has(job.id)
            const recommendationStatus =
              generatedRecommendationJobIds === null
                ? 'Recommendation status unavailable'
                : recommendationIsReady
                  ? 'Recommendation ready'
                  : 'Not reviewed'

            return (
              <div
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between transition-colors hover:bg-wf-surface-sunken cursor-pointer"
                key={job.id}
                onClick={() => onSelectJob(job.id)}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {isUrgent ? (
                      <span
                        aria-label="Urgent priority"
                        className="size-2 rounded-full bg-wf-danger shrink-0"
                      />
                    ) : null}
                    <button
                      className="text-left text-[15px] font-medium leading-[22px] text-wf-ink hover:text-wf-accent focus:outline-none"
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelectJob(job.id)
                      }}
                      type="button"
                    >
                      {job.title}
                    </button>
                  </div>
                  <p className="mt-1 text-[13px] font-normal leading-[18px] text-wf-ink-3">
                    Due {formatDueDate(job)}, {recommendationStatus}
                  </p>
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => onQuickAssign(job)}
                    className="inline-flex h-8 shrink-0 items-center justify-center rounded-control border border-wf-border bg-wf-surface px-3 text-[13px] font-medium text-wf-ink-2 shadow-card transition-colors hover:bg-wf-surface-sunken hover:text-wf-accent focus:outline-none focus:ring-2 focus:ring-wf-accent/30"
                  >
                    Assign
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <EmptyRow>No jobs are waiting for assignment.</EmptyRow>
      )}
    </section>
  )
}

function EmployeeWorkload({ summary }: { summary: DashboardSummary }) {
  const workload = summary.employeeWorkload.slice(0, 5)
  return (
    <section aria-labelledby="workload-heading" className="overflow-hidden rounded-card border border-wf-border bg-wf-surface shadow-card">
      <SectionHeader
        action={
          <Link className="text-[13px] font-medium text-wf-accent hover:underline focus:outline-none focus:ring-2 focus:ring-wf-accent/30" to="/team">
            View team
          </Link>
        }
        description="Assigned & in-progress work by employee."
        title="Workload distribution"
        titleId="workload-heading"
      />
      {workload.length > 0 ? (
        <div className="divide-y divide-wf-border">
          {workload.map((employee) => (
            <div className="flex items-center justify-between gap-3 p-3.5 transition-colors hover:bg-wf-surface-sunken" key={employee.employeeId}>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-wf-ink">{employee.displayName}</p>
                <p className="text-[11px] font-normal text-wf-ink-3">Field operations</p>
              </div>
              <span className="shrink-0 rounded-control bg-wf-surface-sunken px-2.5 py-1 text-[12px] font-normal tabular-nums text-wf-ink-2">
                {employee.assignedJobCount} assigned / {employee.inProgressJobCount} active
              </span>
            </div>
          ))}
        </div>
      ) : (
        <EmptyRow>No active assignments.</EmptyRow>
      )}
    </section>
  )
}

function OperationsInsightPanel({
  errorMessage,
  insight,
  loadingIntent,
  onSelect,
}: {
  errorMessage: string
  insight: OperationsIntelligenceResult | null
  loadingIntent: OperationsIntent | null
  onSelect: (intent: Exclude<OperationsIntent, 'explain_job_attention_flag'>, message: string) => void
}) {
  return (
    <section className="overflow-hidden rounded-card border border-wf-border bg-wf-surface shadow-card">
      <div className="border-b border-wf-border px-4 py-3">
        <h2 className="flex items-center gap-2 text-[17px] font-semibold leading-[24px] text-wf-ink">
          <ListFilter aria-hidden="true" className="size-4 text-wf-accent" />
          Quick views
        </h2>
      </div>

      <div className="p-3.5 space-y-3">
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Operations views">
          {operationsCommands.map((command) => (
            <button
              className={cn(
                'inline-flex h-8 items-center justify-center rounded-control border px-2.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-wf-accent/30 disabled:cursor-wait disabled:opacity-60',
                insight?.intent === command.intent
                  ? 'border-wf-accent/40 bg-wf-accent-wash text-wf-accent font-semibold'
                  : 'border-wf-border bg-wf-surface text-wf-ink-2 hover:bg-wf-surface-sunken'
              )}
              disabled={loadingIntent !== null}
              key={command.intent}
              onClick={() => onSelect(command.intent, command.message)}
              type="button"
            >
              {loadingIntent === command.intent ? 'Loading...' : command.label}
            </button>
          ))}
        </div>

        {errorMessage ? (
          <p className="rounded-control border border-wf-danger/30 bg-wf-danger-wash p-2.5 text-xs text-wf-danger" role="alert">
            {errorMessage}
          </p>
        ) : null}

        {insight ? (
          <div className="overflow-hidden rounded-control border border-wf-border bg-wf-surface">
            {insight.data.intent === 'show_workload_distribution' ? (
              insight.data.employees.length > 0 ? (
                <div className="divide-y divide-wf-border">
                  {insight.data.employees.map((emp) => (
                    <div key={emp.employeeId} className="flex items-center justify-between gap-3 p-2.5 text-xs hover:bg-wf-surface-sunken">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-wf-ink">{emp.displayName}</p>
                        <p className="text-[11px] text-wf-ink-3">Field operations</p>
                      </div>
                      <span className="shrink-0 rounded-control bg-wf-surface-sunken px-2 py-0.5 text-[11px] font-normal tabular-nums text-wf-ink-2">
                        {emp.assignedJobCount} assigned / {emp.inProgressJobCount} active
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="p-3 text-center text-xs text-wf-ink-3">
                  No active team workload items.
                </p>
              )
            ) : insight.data.intent === 'summarize_open_operations' ? (
              <div className="divide-y divide-wf-border">
                <div className="grid grid-cols-3 gap-2 p-2 text-center bg-wf-surface-sunken">
                  <div className="rounded-control bg-wf-surface p-1.5 border border-wf-border">
                    <p className="text-[10px] font-medium text-wf-ink-3">Open</p>
                    <p className="text-xs font-semibold text-wf-ink tabular-nums">{insight.data.counts.open}</p>
                  </div>
                  <div className="rounded-control bg-wf-danger-wash p-1.5 border border-wf-danger/20">
                    <p className="text-[10px] font-medium text-wf-danger">Overdue</p>
                    <p className="text-xs font-semibold text-wf-danger tabular-nums">{insight.data.counts.overdue}</p>
                  </div>
                  <div className="rounded-control bg-wf-surface p-1.5 border border-wf-warn/30">
                    <p className="text-[10px] font-medium text-wf-warn">Urgent</p>
                    <p className="text-xs font-semibold text-wf-warn tabular-nums">{insight.data.counts.urgentUnassigned}</p>
                  </div>
                </div>
                {insight.data.attentionItems.length > 0 ? (
                  insight.data.attentionItems.map((item) => (
                    <OperationsAttentionRow item={item} key={item.jobId} />
                  ))
                ) : (
                  <p className="p-3 text-center text-xs text-wf-ink-3">
                    No open jobs requiring immediate attention.
                  </p>
                )}
              </div>
            ) : 'items' in insight.data && insight.data.items.length > 0 ? (
              <div className="divide-y divide-wf-border">
                {insight.data.items.map((item) => (
                  <OperationsAttentionRow item={item} key={item.jobId} />
                ))}
              </div>
            ) : (
              <p className="p-3 text-center text-xs text-wf-ink-3">
                No active jobs match this query view.
              </p>
            )}
          </div>
        ) : null}
      </div>
    </section>
  )
}

function OperationsAttentionRow({ item }: { item: OperationsAttentionItem }) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 transition-colors hover:bg-wf-surface-sunken">
      <div className="min-w-0">
        <Link className="truncate text-xs font-medium text-wf-ink hover:text-wf-accent" to={`/jobs/${item.jobId}`}>
          {item.title}
        </Link>
        <p className="text-[11px] text-wf-ink-3">{item.attentionReasons.map(formatAttentionReason).join(', ')}</p>
      </div>
      <Link className="shrink-0 text-xs font-medium text-wf-accent hover:underline" to={`/jobs/${item.jobId}`}>
        Open
      </Link>
    </div>
  )
}

function RecentActivity({ summary }: { summary: DashboardSummary }) {
  const activities = summary.recentActivities.slice(0, 5)
  return (
    <section aria-labelledby="recent-activity-heading" className="overflow-hidden rounded-card border border-wf-border bg-wf-surface shadow-card">
      <SectionHeader
        action={
          <Link className="text-[13px] font-medium text-wf-accent hover:underline focus:outline-none focus:ring-2 focus:ring-wf-accent/30" to="/jobs">
            View jobs
          </Link>
        }
        description="Latest job changes and status transitions."
        title="Recent activity"
        titleId="recent-activity-heading"
      />
      {activities.length > 0 ? (
        <div className="divide-y divide-wf-border">
          {activities.map((activity) => (
            <CompactActivityItem activity={activity} key={activity.id} />
          ))}
        </div>
      ) : (
        <EmptyRow>No recent activity.</EmptyRow>
      )}
    </section>
  )
}

function CompactActivityItem({ activity }: { activity: RecentDashboardActivity }) {
  return (
    <div className="flex items-center gap-3.5 p-3.5 transition-colors hover:bg-wf-surface-sunken">
      <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-control bg-wf-surface-sunken text-wf-ink-3">
        <ActivityIcon type={activity.activityType} />
      </span>
      <div className="min-w-0 flex-1">
        <Link className="block truncate text-[13px] font-medium text-wf-ink hover:text-wf-accent" to={`/jobs/${activity.jobId}`}>
          {formatActivityType(activity.activityType)}: {activity.jobTitle}
        </Link>
        <p className="mt-0.5 text-[11px] text-wf-ink-3">
          {formatActivityTime(activity.performedAt)}, {activity.performerName}
        </p>
      </div>
    </div>
  )
}

function ActivityIcon({ type }: { type: RecentDashboardActivity['activityType'] }) {
  if (type === 'employee_completed_job') return <CheckCircle2 aria-hidden="true" className="size-4 text-wf-done" />
  if (type === 'employee_started_job') return <RefreshCcw aria-hidden="true" className="size-4 text-wf-accent" />
  if (type.startsWith('employees_')) return <UserPlus aria-hidden="true" className="size-4 text-wf-accent" />
  return <ClipboardList aria-hidden="true" className="size-4 text-wf-ink-3" />
}

function SectionHeader({ action, description, title, titleId }: { action?: React.ReactNode; description?: string; title: string; titleId?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-wf-border px-4 py-3">
      <div>
        <h2 className="text-[17px] font-semibold leading-[24px] text-wf-ink" id={titleId}>{title}</h2>
        {description ? <p className="mt-0.5 text-[13px] font-normal leading-[18px] text-wf-ink-3">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}

function EmptyRow({ children }: { children: React.ReactNode }) {
  return <p className="p-6 text-center text-[13px] font-normal text-wf-ink-3">{children}</p>
}

function DashboardLoadingState() {
  return (
    <section aria-label="Loading operations" className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <LoadingSkeleton count={4} variant="card" />
      </div>
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <LoadingSkeleton className="h-48" variant="card" />
          <LoadingSkeleton className="h-48" variant="card" />
        </div>
        <div className="space-y-6 lg:col-span-4">
          <LoadingSkeleton className="h-40" variant="card" />
          <LoadingSkeleton className="h-56" variant="card" />
        </div>
      </div>
    </section>
  )
}

function formatDueDate(job: Pick<DashboardOperationalJob, 'dueDate'>) {
  const date = toJsDate(job.dueDate)
  if (!date) return 'No due date'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date)
}

function formatActivityType(type: RecentDashboardActivity['activityType']) {
  switch (type) {
    case 'employee_completed_job': return 'Completed'
    case 'employee_started_job': return 'Started'
    case 'employees_assigned': return 'Assigned'
    case 'employees_reassigned': return 'Reassigned'
    case 'employees_unassigned': return 'Unassigned'
    default: return 'Status changed'
  }
}

function formatActivityTime(timestamp: unknown) {
  const date = toJsDate(timestamp)
  if (!date) return 'Recent'
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', hour: 'numeric', minute: '2-digit', month: 'short' }).format(date)
}

function formatDashboardContext(date: Date) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'full' }).format(date)
}

function formatAttentionReason(reason: OperationsAttentionItem['attentionReasons'][number]) {
  switch (reason) {
    case 'urgent_unassigned': return 'Priority, unassigned'
    case 'assigned_not_started_after_due': return 'Assigned, past due'
    case 'in_progress_overdue': return 'In progress, past due'
    case 'overdue': return 'Overdue'
  }
}

function isOperationsIntelligenceResult(value: unknown, intent: OperationsIntent): value is OperationsIntelligenceResult {
  if (!value || typeof value !== 'object') return false
  const result = value as OperationsIntelligenceResult
  return result.intent === intent && result.data?.intent === intent && Array.isArray(result.summary)
}
