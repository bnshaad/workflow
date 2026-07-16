import { useEffect, useMemo, useState, type ComponentType, type SVGProps } from 'react'
import {
  CheckCircle2,
  ClipboardList,
  Clock,
  ListFilter,
  Plus,
  RefreshCcw,
  UserPlus,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader, StatusBadge } from '@/components'
import { useAuth } from '@/hooks'
import { canCreateJob } from '@/permissions'
import { workflowCoordinator } from '@/services/coordinator'
import {
  getDashboardSummary,
  type DashboardOperationalJob,
  type DashboardSummary,
  type RecentDashboardActivity,
} from '@/services/dashboard'
import { assignmentRecommendationService } from '@/services/recommendations'
import { type JobPriority, type JobStatus } from '@/types'
import { getJobAttentionReason, sortOperationalJobs } from '@/utils'
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

const summaryItems: Array<{
  icon: ComponentType<SVGProps<SVGSVGElement>>
  label: string
  status: JobStatus
}> = [
  { icon: ClipboardList, label: 'Open', status: 'open' },
  { icon: UserPlus, label: 'Assigned', status: 'assigned' },
  { icon: RefreshCcw, label: 'In progress', status: 'in_progress' },
  { icon: CheckCircle2, label: 'Completed', status: 'completed' },
]

const operationsCommands: Array<{
  intent: Exclude<OperationsIntent, 'explain_job_attention_flag'>
  label: string
  message: string
}> = [
  { intent: 'show_jobs_requiring_attention', label: 'Needs attention', message: 'Show jobs requiring attention' },
  { intent: 'show_overdue_jobs', label: 'Overdue', message: 'Show overdue jobs' },
  { intent: 'show_workload_distribution', label: 'Workload', message: 'Show workload distribution' },
  { intent: 'summarize_open_operations', label: 'Open summary', message: 'Summarize open operations' },
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
            job.status === 'open' && job.assignedEmployeeIds.length === 0,
        ),
      ).slice(0, 5),
    [summary],
  )
  const canCreateJobs = profile ? canCreateJob(profile) : false

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
      <PageHeader title="Overview" description={formatDashboardContext(new Date())} />

      <QuickActions canCreateJobs={canCreateJobs} />

      {isLoading ? (
        <DashboardLoadingState />
      ) : errorMessage ? (
        <section className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">{errorMessage}</section>
      ) : summary ? (
        <>
          <NeedsAttention jobs={attentionJobs} />
          <PendingAssignments
            generatedRecommendationJobIds={generatedRecommendationJobIds}
            jobs={pendingAssignments}
          />
          <OperationalSummary summary={summary} />
          <EmployeeWorkload summary={summary} />
          <OperationsInsightPanel
            errorMessage={operationsError}
            insight={operationsInsight}
            loadingIntent={operationsIntent}
            onSelect={loadOperationsInsight}
          />
          <RecentActivity summary={summary} />
        </>
      ) : null}
    </div>
  )
}

function QuickActions({ canCreateJobs }: { canCreateJobs: boolean }) {
  return (
    <section aria-labelledby="quick-actions-heading" className="space-y-2">
      <h2 className="text-sm font-semibold text-foreground" id="quick-actions-heading">Quick actions</h2>
      <div className="grid gap-2 sm:grid-cols-3">
        {canCreateJobs ? (
          <Link className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/30" to="/jobs/create">
            <Plus aria-hidden="true" className="size-4" />Create Job
          </Link>
        ) : null}
        <Link className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/30" to="/assignments">
          <UserPlus aria-hidden="true" className="size-4 text-muted-foreground" />Review Unassigned Jobs
        </Link>
        <Link className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/30" to="/jobs?view=overdue">
          <Clock aria-hidden="true" className="size-4 text-muted-foreground" />Review Overdue Jobs
        </Link>
      </div>
    </section>
  )
}

function NeedsAttention({ jobs }: { jobs: DashboardOperationalJob[] }) {
  return (
    <section aria-labelledby="needs-attention-heading" className="overflow-hidden rounded-lg border border-border bg-card">
      <SectionHeader action={<Link className="text-sm font-medium text-primary focus:outline-none focus:ring-2 focus:ring-primary/30" to="/jobs?view=overdue">View queue</Link>} description="Urgent and overdue work requiring a decision." title="Needs attention" titleId="needs-attention-heading" />
      {jobs.length > 0 ? (
        <div className="divide-y divide-border">
          {jobs.map((job) => {
            const reason = getJobAttentionReason(job)
            const needsAssignment = job.status === 'open' && job.assignedEmployeeIds.length === 0
            return (
              <div className="flex flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between" key={job.id}>
                <div className="min-w-0">
                  <Link className="font-medium text-foreground hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/30" to={`/jobs/${job.id}`}>{job.title}</Link>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <StatusBadge tone={priorityTone[job.priority]}>{job.priority}</StatusBadge>
                    <span>{reason}</span><span aria-hidden="true">·</span><span>{formatDueDate(job)}</span>
                  </div>
                </div>
                <Link className={needsAssignment ? 'inline-flex h-8 shrink-0 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground focus:outline-none focus:ring-2 focus:ring-primary/30' : 'inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-border px-3 text-sm font-medium text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/30'} to={needsAssignment ? `/jobs/${job.id}#assignment-controls` : `/jobs/${job.id}`}>
                  {needsAssignment ? 'Assign' : 'Open Job'}
                </Link>
              </div>
            )
          })}
        </div>
      ) : <EmptyRow>No urgent or overdue jobs need attention.</EmptyRow>}
    </section>
  )
}

function PendingAssignments({
  generatedRecommendationJobIds,
  jobs,
}: {
  generatedRecommendationJobIds: Set<string> | null
  jobs: DashboardOperationalJob[]
}) {
  return (
    <section aria-labelledby="pending-assignments-heading" className="overflow-hidden rounded-lg border border-border bg-card">
      <SectionHeader action={<Link className="text-sm font-medium text-primary focus:outline-none focus:ring-2 focus:ring-primary/30" to="/assignments">View all</Link>} description="Open jobs waiting for an employee." title="Pending assignments" titleId="pending-assignments-heading" />
      {jobs.length > 0 ? (
        <div className="divide-y divide-border">
          {jobs.map((job) => {
            const recommendationIsReady = generatedRecommendationJobIds?.has(job.id)
            const recommendationStatus =
              generatedRecommendationJobIds === null
                ? 'Recommendation status unavailable'
                : recommendationIsReady
                  ? 'Recommendation ready'
                  : 'Not reviewed'

            return (
            <div className="grid gap-2 px-4 py-2.5 md:grid-cols-[minmax(0,1.5fr)_auto_auto_minmax(130px,auto)] md:items-center" key={job.id}>
              <div className="min-w-0">
                <Link className="font-medium text-foreground hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/30" to={`/jobs/${job.id}`}>{job.title}</Link>
                <p className="text-xs text-muted-foreground">Due {formatDueDate(job)}</p>
              </div>
              <StatusBadge tone={priorityTone[job.priority]}>{job.priority}</StatusBadge>
              <span className="text-xs text-muted-foreground">{recommendationStatus}</span>
              <div className="flex flex-wrap gap-3 md:justify-end">
                <Link className="text-sm font-medium text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" to={`/jobs/${job.id}#assignment-controls`}>{recommendationIsReady ? 'Review recommendation' : 'Open assignment'}</Link>
                <Link className="text-sm font-medium text-primary hover:text-primary/80 focus:outline-none focus:ring-2 focus:ring-primary/30" to={`/jobs/${job.id}#assignment-controls`}>Assign employee</Link>
              </div>
            </div>
            )
          })}
        </div>
      ) : <EmptyRow>No jobs are waiting for assignment.</EmptyRow>}
    </section>
  )
}

function OperationalSummary({ summary }: { summary: DashboardSummary }) {
  return (
    <section aria-labelledby="operational-summary-heading" className="space-y-2">
      <h2 className="text-sm font-semibold text-foreground" id="operational-summary-heading">Operational summary</h2>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border lg:grid-cols-4">
        {summaryItems.map(({ icon: Icon, label, status }) => (
          <div className="flex items-center justify-between gap-3 bg-card px-3 py-3" key={status}>
            <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-0.5 text-xl font-semibold tabular-nums text-foreground">{summary.jobMetrics.statusCounts[status]}</p></div>
            <Icon aria-hidden="true" className="size-4 text-muted-foreground" />
          </div>
        ))}
      </div>
    </section>
  )
}

function EmployeeWorkload({ summary }: { summary: DashboardSummary }) {
  const workload = summary.employeeWorkload.slice(0, 6)
  return (
    <section aria-labelledby="workload-heading" className="overflow-hidden rounded-lg border border-border bg-card">
      <SectionHeader action={<Link className="text-sm font-medium text-primary focus:outline-none focus:ring-2 focus:ring-primary/30" to="/team">View team</Link>} description="Current assigned and in-progress work." title="Workload distribution" titleId="workload-heading" />
      {workload.length > 0 ? <div className="divide-y divide-border">{workload.map((employee) => (
        <div className="flex items-center justify-between gap-4 px-4 py-2.5" key={employee.employeeId}>
          <p className="truncate text-sm font-medium text-foreground">{employee.displayName}</p>
          <p className="shrink-0 text-sm tabular-nums text-muted-foreground">{employee.assignedJobCount} assigned / {employee.inProgressJobCount} in progress</p>
        </div>
      ))}</div> : <EmptyRow>No active assignments.</EmptyRow>}
    </section>
  )
}

function OperationsInsightPanel({ errorMessage, insight, loadingIntent, onSelect }: {
  errorMessage: string
  insight: OperationsIntelligenceResult | null
  loadingIntent: OperationsIntent | null
  onSelect: (intent: Exclude<OperationsIntent, 'explain_job_attention_flag'>, message: string) => void
}) {
  const attentionItems = insight ? getAttentionItems(insight) : []
  return (
    <details className="rounded-lg border border-border bg-card">
      <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/30">
        <ListFilter aria-hidden="true" className="size-4 text-muted-foreground" />Operational views
      </summary>
      <div className="border-t border-border">
        <div className="flex flex-wrap gap-2 px-4 py-3" role="group" aria-label="Operations views">
          {operationsCommands.map((command) => (
            <button className="inline-flex h-8 items-center rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-wait disabled:opacity-60" disabled={loadingIntent !== null} key={command.intent} onClick={() => onSelect(command.intent, command.message)} type="button">{loadingIntent === command.intent ? 'Loading…' : command.label}</button>
          ))}
        </div>
        {errorMessage ? <p className="border-t border-border px-4 py-3 text-sm text-destructive" role="alert">{errorMessage}</p> : null}
        {insight ? (
          <div className="border-t border-border">
            <div className="space-y-1 px-4 py-3 text-sm text-foreground">{insight.summary.map((line) => <p key={line}>{line}</p>)}</div>
            {attentionItems.length > 0 ? <div className="divide-y divide-border border-t border-border">{attentionItems.map((item) => <OperationsAttentionRow item={item} key={item.jobId} />)}</div> : null}
            {insight.data.intent === 'show_workload_distribution' ? <div className="divide-y divide-border border-t border-border">{insight.data.employees.map((employee) => <div className="flex items-center justify-between gap-4 px-4 py-2.5" key={employee.employeeId}><span className="truncate text-sm font-medium text-foreground">{employee.displayName}</span><span className="text-sm tabular-nums text-muted-foreground">{employee.assignedJobCount} assigned / {employee.inProgressJobCount} in progress</span></div>)}</div> : null}
          </div>
        ) : null}
      </div>
    </details>
  )
}

function OperationsAttentionRow({ item }: { item: OperationsAttentionItem }) {
  return <div className="flex items-center justify-between gap-3 px-4 py-2.5"><div className="min-w-0"><Link className="truncate text-sm font-medium text-foreground hover:text-primary" to={`/jobs/${item.jobId}`}>{item.title}</Link><p className="text-xs text-muted-foreground">{item.attentionReasons.map(formatAttentionReason).join(' · ')}</p></div><Link className="shrink-0 text-sm font-medium text-primary" to={`/jobs/${item.jobId}`}>Open job</Link></div>
}

function RecentActivity({ summary }: { summary: DashboardSummary }) {
  const activities = summary.recentActivities.slice(0, 5)
  return (
    <section aria-labelledby="recent-activity-heading" className="overflow-hidden rounded-lg border border-border bg-card">
      <SectionHeader action={<Link className="text-sm font-medium text-primary focus:outline-none focus:ring-2 focus:ring-primary/30" to="/jobs">View jobs</Link>} description="Latest job changes." title="Recent activity" titleId="recent-activity-heading" />
      {activities.length > 0 ? <div className="divide-y divide-border">{activities.map((activity) => <CompactActivityItem activity={activity} key={activity.id} />)}</div> : <EmptyRow>No recent activity.</EmptyRow>}
    </section>
  )
}

function CompactActivityItem({ activity }: { activity: RecentDashboardActivity }) {
  return <div className="flex items-center gap-3 px-4 py-2.5"><span className="inline-flex size-7 shrink-0 items-center justify-center text-muted-foreground"><ActivityIcon type={activity.activityType} /></span><div className="min-w-0"><Link className="block truncate text-sm font-medium text-foreground hover:text-primary" to={`/jobs/${activity.jobId}`}>{formatActivityType(activity.activityType)}: {activity.jobTitle}</Link><p className="text-xs text-muted-foreground">{formatActivityTime(activity.performedAt)} · {activity.performerName}</p></div></div>
}

function ActivityIcon({ type }: { type: RecentDashboardActivity['activityType'] }) {
  if (type === 'employee_completed_job') return <CheckCircle2 aria-hidden="true" className="size-4" />
  if (type === 'employee_started_job') return <RefreshCcw aria-hidden="true" className="size-4" />
  if (type.startsWith('employees_')) return <UserPlus aria-hidden="true" className="size-4" />
  return <ClipboardList aria-hidden="true" className="size-4" />
}

function SectionHeader({ action, description, title, titleId }: { action?: React.ReactNode; description: string; title: string; titleId: string }) {
  return <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3"><div><h2 className="text-sm font-semibold text-foreground" id={titleId}>{title}</h2><p className="mt-0.5 text-xs text-muted-foreground">{description}</p></div>{action}</div>
}

function EmptyRow({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-4 text-sm text-muted-foreground">{children}</p>
}

function DashboardLoadingState() {
  return <section aria-label="Loading operations" className="space-y-3"><div className="h-32 animate-pulse rounded-lg border border-border bg-card" /><div className="h-40 animate-pulse rounded-lg border border-border bg-card" /><div className="grid grid-cols-2 gap-2 lg:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div className="h-20 animate-pulse rounded-lg border border-border bg-card" key={index} />)}</div></section>
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

function getAttentionItems(insight: OperationsIntelligenceResult) {
  const data = insight.data
  if ('items' in data) return data.items
  if (data.intent === 'summarize_open_operations') return data.attentionItems
  if (data.intent === 'explain_job_attention_flag') return [data.item]
  return []
}

function isOperationsIntelligenceResult(value: unknown, intent: OperationsIntent): value is OperationsIntelligenceResult {
  if (!value || typeof value !== 'object') return false
  const result = value as OperationsIntelligenceResult
  return result.intent === intent && result.data?.intent === intent && Array.isArray(result.summary)
}
