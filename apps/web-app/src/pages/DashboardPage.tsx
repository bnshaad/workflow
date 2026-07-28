import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ClipboardList,
  ListFilter,
  Plus,
  RefreshCcw,
  UserPlus,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { CreateJobDrawer, JobDetailsDrawer, MetricCard, QuickAssignModal, StatusBadge } from '@/components'

import { useAuth } from '@/hooks'
import { workflowCoordinator } from '@/services/coordinator'
import {
  getDashboardSummary,
  type DashboardOperationalJob,
  type DashboardSummary,
  type RecentDashboardActivity,
} from '@/services/dashboard'
import { jobService } from '@/services/jobs'
import { assignmentRecommendationService } from '@/services/recommendations'
import { type Job, type JobPriority } from '@/types'
import { cn, getJobAttentionReason, sortOperationalJobs } from '@/utils'
import type {
  OperationsAttentionItem,
  OperationsIntelligenceResult,
  OperationsIntent,
} from '../../../../shared/operationsIntelligence.ts'

const priorityTone: Record<JobPriority, 'danger' | 'default' | 'warning'> = {
  High: 'danger',
  Low: 'default',
  Medium: 'warning',
  Urgent: 'danger',
}

const operationsCommands: Array<{
  intent: Exclude<OperationsIntent, 'explain_job_attention_flag'>
  label: string
  message: string
}> = [
  { intent: 'show_jobs_requiring_attention', label: 'Flagged Jobs', message: 'Show jobs requiring attention' },
  { intent: 'show_overdue_jobs', label: 'Past Due', message: 'Show overdue jobs' },
  { intent: 'show_workload_distribution', label: 'Who\'s Busy', message: 'Show workload distribution' },
  { intent: 'summarize_open_operations', label: 'Today\'s Snapshot', message: 'Summarize open operations' },
]

export function DashboardPage() {
  const { profile } = useAuth()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [generatedRecommendationJobIds, setGeneratedRecommendationJobIds] =
    useState<Set<string> | null>(null)
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

  const handleDashboardJobAssigned = async () => {
    if (!profile) return
    try {
      const updatedSummary = await getDashboardSummary(profile, profile.organizationId)
      setSummary(updatedSummary)
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    let isMounted = true

    async function loadDashboard() {
      if (!profile) return

      setIsLoading(true)
      setErrorMessage('')

      try {
        const [dashboardSummary, recommendationJobIds] = await Promise.all([
          getDashboardSummary(profile, profile.organizationId),
          assignmentRecommendationService
            .getGeneratedRecommendationJobIds(profile, profile.organizationId)
            .catch((error: unknown) => {
              if (import.meta.env.DEV) {
                console.error('Failed to load recommendation state.', error)
              }
              return null
            }),
        ])

        if (isMounted) {
          setSummary(dashboardSummary)
          setGeneratedRecommendationJobIds(recommendationJobIds)
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

  const userFirstName = profile?.displayName ? profile.displayName.split(' ')[0] : ''
  const greeting = userFirstName ? `Welcome back, ${userFirstName}` : 'Dashboard'

  return (
    <div className="space-y-3.5">
      {/* Page Header Fold */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {greeting}
          </h1>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Calendar aria-hidden="true" className="size-3.5 text-primary" />
            {formatDashboardContext(new Date())}
          </p>
        </div>
        <button
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/30"
          onClick={() => setIsCreateDrawerOpen(true)}
          type="button"
        >
          <Plus aria-hidden="true" className="size-4" />
          <span>New Job</span>
        </button>

      </div>

      {isLoading ? (
        <DashboardLoadingState />
      ) : errorMessage ? (
        <section className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-xs font-medium text-destructive" role="alert">
          {errorMessage}
        </section>
      ) : summary ? (
        <>
          {/* Top Fold 4 KPI Metrics Grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCard
              icon={ClipboardList}
              label="Open Jobs"
              tone="primary"
              value={String(summary.jobMetrics.statusCounts.open)}
            />
            <MetricCard
              icon={UserPlus}
              label="Assigned & Active"
              tone="primary"
              value={String(summary.jobMetrics.statusCounts.assigned + summary.jobMetrics.statusCounts.in_progress)}
            />
            <MetricCard
              icon={AlertTriangle}
              label="Needs Attention"
              tone={attentionJobs.length > 0 ? 'danger' : 'default'}
              value={String(attentionJobs.length)}
            />
            <MetricCard
              icon={CheckCircle2}
              label="Completed"
              tone="success"
              value={String(summary.jobMetrics.statusCounts.completed)}
            />
          </div>

          {/* Desktop 2-Column Responsive Layout */}
          <div className="grid gap-4 lg:grid-cols-12">
            {/* Left Column (Main Queues — 8 Cols) */}
            <div className="space-y-3.5 lg:col-span-8">
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
    <section aria-labelledby="needs-attention-heading" className="overflow-hidden rounded-xl border border-border bg-card shadow-2xs">
      <SectionHeader
        action={
          <Link className="text-xs font-semibold text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary/30" to="/jobs?view=overdue">
            View queue
          </Link>
        }
        title="Needs attention"
        titleId="needs-attention-heading"
      />
      {jobs.length > 0 ? (
        <div className="divide-y divide-border">
          {jobs.map((job) => {
            const reason = getJobAttentionReason(job)
            const needsAssignment = job.status === 'open' && job.assignedEmployeeIds.length === 0
            return (
              <div
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between transition-colors hover:bg-muted/30 cursor-pointer"
                key={job.id}
                onClick={() => onSelectJob(job.id)}
              >
                <div className="min-w-0 flex-1">
                  <button
                    className="text-left text-sm font-semibold text-foreground hover:text-primary focus:outline-none"
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelectJob(job.id)
                    }}
                    type="button"
                  >
                    {job.title}
                  </button>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <StatusBadge tone={priorityTone[job.priority]}>{job.priority}</StatusBadge>
                    <span className="font-semibold text-rose-600">{reason}</span>
                    <span aria-hidden="true">·</span>
                    <span>Due {formatDueDate(job)}</span>
                  </div>
                </div>
                {needsAssignment ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onQuickAssign(job)
                    }}
                    className="inline-flex h-8 shrink-0 items-center justify-center rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    ⚡ Quick Assign
                  </button>
                ) : (
                  <button
                    className="inline-flex h-8 shrink-0 items-center justify-center rounded-lg border border-border px-3 text-xs font-medium text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelectJob(job.id)
                    }}
                    type="button"
                  >
                    Open Job
                  </button>
                )}
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
    <section aria-labelledby="pending-assignments-heading" className="overflow-hidden rounded-xl border border-border bg-card shadow-2xs">
      <SectionHeader
        action={
          <Link className="text-xs font-semibold text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary/30" to="/assignments">
            View all
          </Link>
        }
        title="Pending assignments"
        titleId="pending-assignments-heading"
      />
      {jobs.length > 0 ? (
        <div className="divide-y divide-border">
          {jobs.map((job) => {
            const recommendationIsReady = generatedRecommendationJobIds?.has(job.id)
            const recommendationStatus =
              generatedRecommendationJobIds === null
                ? 'Recommendation status unavailable'
                : recommendationIsReady
                  ? 'AI Recommendation Ready'
                  : 'Not reviewed'

            return (
              <div
                className="grid gap-2.5 p-4 md:grid-cols-[minmax(0,1.5fr)_auto_auto_minmax(140px,auto)] md:items-center transition-colors hover:bg-muted/30 cursor-pointer"
                key={job.id}
                onClick={() => onSelectJob(job.id)}
              >
                <div className="min-w-0">
                  <button
                    className="text-left text-sm font-semibold text-foreground hover:text-primary focus:outline-none"
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelectJob(job.id)
                    }}
                    type="button"
                  >
                    {job.title}
                  </button>
                  <p className="text-xs text-muted-foreground">Due {formatDueDate(job)}</p>
                </div>
                <StatusBadge tone={priorityTone[job.priority]}>{job.priority}</StatusBadge>
                <span className={recommendationIsReady ? 'text-xs font-semibold text-primary' : 'text-xs text-muted-foreground'}>
                  {recommendationStatus}
                </span>
                <div className="flex flex-wrap gap-2 md:justify-end" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => onQuickAssign(job)}
                    className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    ⚡ {recommendationIsReady ? 'Review Match' : 'Assign Employee'}
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
    <section aria-labelledby="workload-heading" className="overflow-hidden rounded-xl border border-border bg-card shadow-2xs">
      <SectionHeader
        action={
          <Link className="text-xs font-semibold text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary/30" to="/team">
            View team
          </Link>
        }
        description="Assigned & in-progress work by employee."
        title="Workload distribution"
        titleId="workload-heading"
      />
      {workload.length > 0 ? (
        <div className="divide-y divide-border">
          {workload.map((employee) => (
            <div className="flex items-center justify-between gap-3 p-3.5 transition-colors hover:bg-muted/30" key={employee.employeeId}>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-foreground">{employee.displayName}</p>
                <p className="text-[11px] text-muted-foreground">Field Operations</p>
              </div>
              <span className="shrink-0 rounded-md bg-muted px-2.5 py-1 text-xs font-semibold tabular-nums text-foreground">
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
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-2xs">
      <div className="border-b border-border px-3.5 py-2.5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
          <ListFilter aria-hidden="true" className="size-4 text-primary" />
          Quick Views
        </h2>
      </div>

      <div className="p-3 space-y-3">
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Operations views">
          {operationsCommands.map((command) => (
            <button
              className={cn(
                'inline-flex h-8 items-center justify-center rounded-lg border px-2.5 text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-wait disabled:opacity-60',
                insight?.intent === command.intent
                  ? 'border-primary/40 bg-primary/10 text-primary font-semibold'
                  : 'border-border bg-background text-foreground hover:bg-muted'
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
          <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-2.5 text-xs text-destructive" role="alert">
            {errorMessage}
          </p>
        ) : null}

        {insight ? (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            {insight.data.intent === 'show_workload_distribution' ? (
              insight.data.employees.length > 0 ? (
                <div className="divide-y divide-border">
                  {insight.data.employees.map((emp) => (
                    <div key={emp.employeeId} className="flex items-center justify-between gap-3 p-2.5 text-xs hover:bg-muted/30">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">{emp.displayName}</p>
                        <p className="text-[11px] text-muted-foreground">Field Operations</p>
                      </div>
                      <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold tabular-nums text-foreground">
                        {emp.assignedJobCount} assigned / {emp.inProgressJobCount} active
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="p-3 text-center text-xs text-muted-foreground">
                  No active team workload items.
                </p>
              )
            ) : insight.data.intent === 'summarize_open_operations' ? (
              <div className="divide-y divide-border">
                <div className="grid grid-cols-3 gap-2 p-2 text-center bg-muted/30">
                  <div className="rounded-md bg-card p-1.5 border border-border">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Open</p>
                    <p className="text-xs font-bold text-foreground">{insight.data.counts.open}</p>
                  </div>
                  <div className="rounded-md bg-rose-500/10 p-1.5 border border-rose-500/20">
                    <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase">Overdue</p>
                    <p className="text-xs font-bold text-rose-600 dark:text-rose-400">{insight.data.counts.overdue}</p>
                  </div>
                  <div className="rounded-md bg-amber-500/10 p-1.5 border border-amber-500/20">
                    <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase">Urgent</p>
                    <p className="text-xs font-bold text-amber-700 dark:text-amber-400">{insight.data.counts.urgentUnassigned}</p>
                  </div>
                </div>
                {insight.data.attentionItems.length > 0 ? (
                  insight.data.attentionItems.map((item) => (
                    <OperationsAttentionRow item={item} key={item.jobId} />
                  ))
                ) : (
                  <p className="p-3 text-center text-xs text-muted-foreground">
                    No open jobs requiring immediate attention.
                  </p>
                )}
              </div>
            ) : 'items' in insight.data && insight.data.items.length > 0 ? (
              <div className="divide-y divide-border">
                {insight.data.items.map((item) => (
                  <OperationsAttentionRow item={item} key={item.jobId} />
                ))}
              </div>
            ) : (
              <p className="p-3 text-center text-xs text-muted-foreground">
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
    <div className="flex items-center justify-between gap-3 p-3 transition-colors hover:bg-muted/30">
      <div className="min-w-0">
        <Link className="truncate text-xs font-semibold text-foreground hover:text-primary" to={`/jobs/${item.jobId}`}>
          {item.title}
        </Link>
        <p className="text-[11px] text-muted-foreground">{item.attentionReasons.map(formatAttentionReason).join(' · ')}</p>
      </div>
      <Link className="shrink-0 text-xs font-semibold text-primary hover:underline" to={`/jobs/${item.jobId}`}>
        Open
      </Link>
    </div>
  )
}

function RecentActivity({ summary }: { summary: DashboardSummary }) {
  const activities = summary.recentActivities.slice(0, 5)
  return (
    <section aria-labelledby="recent-activity-heading" className="overflow-hidden rounded-xl border border-border bg-card shadow-2xs">
      <SectionHeader
        action={
          <Link className="text-xs font-semibold text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary/30" to="/jobs">
            View jobs
          </Link>
        }
        description="Latest job changes and status transitions."
        title="Recent activity"
        titleId="recent-activity-heading"
      />
      {activities.length > 0 ? (
        <div className="divide-y divide-border">
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
    <div className="flex items-center gap-3.5 p-3.5 transition-colors hover:bg-muted/30">
      <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-primary">
        <ActivityIcon type={activity.activityType} />
      </span>
      <div className="min-w-0 flex-1">
        <Link className="block truncate text-xs font-semibold text-foreground hover:text-primary" to={`/jobs/${activity.jobId}`}>
          {formatActivityType(activity.activityType)}: {activity.jobTitle}
        </Link>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {formatActivityTime(activity.performedAt)} · {activity.performerName}
        </p>
      </div>
    </div>
  )
}

function ActivityIcon({ type }: { type: RecentDashboardActivity['activityType'] }) {
  if (type === 'employee_completed_job') return <CheckCircle2 aria-hidden="true" className="size-4 text-emerald-600" />
  if (type === 'employee_started_job') return <RefreshCcw aria-hidden="true" className="size-4 text-primary" />
  if (type.startsWith('employees_')) return <UserPlus aria-hidden="true" className="size-4 text-primary" />
  return <ClipboardList aria-hidden="true" className="size-4 text-muted-foreground" />
}

function SectionHeader({ action, description, title, titleId }: { action?: React.ReactNode; description?: string; title: string; titleId?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border px-3.5 py-2.5">
      <div>
        <h2 className="text-sm font-bold text-foreground" id={titleId}>{title}</h2>
        {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}

function EmptyRow({ children }: { children: React.ReactNode }) {
  return <p className="p-6 text-center text-xs text-muted-foreground">{children}</p>
}

function DashboardLoadingState() {
  return (
    <section aria-label="Loading operations" className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="h-24 animate-pulse rounded-xl border border-border bg-card" key={index} />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <div className="h-48 animate-pulse rounded-xl border border-border bg-card" />
          <div className="h-48 animate-pulse rounded-xl border border-border bg-card" />
        </div>
        <div className="space-y-6 lg:col-span-4">
          <div className="h-40 animate-pulse rounded-xl border border-border bg-card" />
          <div className="h-56 animate-pulse rounded-xl border border-border bg-card" />
        </div>
      </div>
    </section>
  )
}

function formatDueDate(job: Pick<DashboardOperationalJob, 'dueDate'>) {
  if (!job.dueDate) return 'No due date'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(job.dueDate.toDate())
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

function formatActivityTime(timestamp: { toDate: () => Date }) {
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', hour: 'numeric', minute: '2-digit', month: 'short' }).format(timestamp.toDate())
}

function formatDashboardContext(date: Date) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'full' }).format(date)
}

function formatAttentionReason(reason: OperationsAttentionItem['attentionReasons'][number]) {
  switch (reason) {
    case 'urgent_unassigned': return 'Priority · unassigned'
    case 'assigned_not_started_after_due': return 'Assigned · past due'
    case 'in_progress_overdue': return 'In progress · past due'
    case 'overdue': return 'Overdue'
  }
}

function isOperationsIntelligenceResult(value: unknown, intent: OperationsIntent): value is OperationsIntelligenceResult {
  if (!value || typeof value !== 'object') return false
  const result = value as OperationsIntelligenceResult
  return result.intent === intent && result.data?.intent === intent && Array.isArray(result.summary)
}
