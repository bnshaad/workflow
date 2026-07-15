import { useEffect, useMemo, useState, type ComponentType, type SVGProps } from 'react'
import {
  ArrowRight,
  AlertTriangle,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardList,
  Clock,
  ListFilter,
  Plus,
  RefreshCcw,
  UserPlus,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  MetricCard,
  PageHeader,
  StatusBadge,
} from '@/components'
import { useAuth } from '@/hooks'
import { canCreateJob } from '@/permissions'
import {
  getDashboardSummary,
  type DashboardSummary,
  type RecentDashboardActivity,
} from '@/services/dashboard'
import { workflowCoordinator } from '@/services/coordinator'
import { JobStatuses, JOB_STATUS_LABELS, type JobStatus } from '@/types'
import type {
  OperationsAttentionItem,
  OperationsIntelligenceResult,
  OperationsIntent,
} from '../../../../shared/operationsIntelligence.ts'

type MetricItem = {
  icon: ComponentType<SVGProps<SVGSVGElement>>
  label: string
  tone?: 'default' | 'primary' | 'success' | 'danger'
  value: string
}

type ActionNeededItem = {
  actionHref?: string
  actionLabel: string
  actionTo?: string
  count: number
  description: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  label: string
  tone: 'danger' | 'default' | 'primary' | 'warning'
}

const statusMetricOrder: JobStatus[] = [
  JobStatuses.Open,
  JobStatuses.Assigned,
  JobStatuses.InProgress,
  JobStatuses.Completed,
  JobStatuses.Cancelled,
]

const statusMetricIcons: Record<
  JobStatus,
  ComponentType<SVGProps<SVGSVGElement>>
> = {
  assigned: UserPlus,
  cancelled: AlertTriangle,
  completed: CheckCircle2,
  draft: ClipboardList,
  in_progress: RefreshCcw,
  open: ClipboardList,
}

const statusMetricTone: Partial<
  Record<JobStatus, 'default' | 'primary' | 'success' | 'danger'>
> = {
  assigned: 'primary',
  cancelled: 'danger',
  completed: 'success',
  in_progress: 'primary',
}

export function DashboardPage() {
  const { profile } = useAuth()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [operationsError, setOperationsError] = useState('')
  const [operationsInsight, setOperationsInsight] =
    useState<OperationsIntelligenceResult | null>(null)
  const [operationsIntent, setOperationsIntent] =
    useState<OperationsIntent | null>(null)

  useEffect(() => {
    let isMounted = true

    async function loadDashboardSummary() {
      if (!profile) {
        return
      }

      setIsLoading(true)
      setErrorMessage('')

      try {
        const dashboardSummary = await getDashboardSummary(
          profile,
          profile.organizationId,
        )

        if (isMounted) {
          setSummary(dashboardSummary)
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Dashboard metrics failed to load.', error)
        }

        if (isMounted) {
          setErrorMessage('Unable to load dashboard metrics. Please try again.')
          setSummary(null)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadDashboardSummary()

    return () => {
      isMounted = false
    }
  }, [profile])

  const metrics = useMemo(() => {
    return summary ? buildMetricItems(summary) : []
  }, [summary])
  const actionNeededItems = useMemo(() => {
    return summary ? buildActionNeededItems(summary) : []
  }, [summary])
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

      if (
        response.kind !== 'result' ||
        !isOperationsIntelligenceResult(response.data, intent)
      ) {
        throw new Error('The operations request was not completed.')
      }

      setOperationsInsight(response.data)
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Operations insight failed to load.', error)
      }
      setOperationsError('Unable to load this operations view. Try again.')
    } finally {
      setOperationsIntent(null)
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Today"
        description={formatDashboardContext(new Date())}
        actions={
          <>
            {canCreateJobs ? (
              <Link
                className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/30 sm:w-auto"
                to="/jobs/create"
              >
                <Plus aria-hidden="true" className="size-4" />
                Create Job
              </Link>
            ) : null}
            <Link
              className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/30 sm:w-auto"
              to="/jobs"
            >
              Open jobs
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </>
        }
      />

      {isLoading ? (
        <DashboardLoadingState />
      ) : errorMessage ? (
        <section className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </section>
      ) : summary ? (
        <>
          <ActionNeededPanel items={actionNeededItems} />

          <OperationsInsightPanel
            errorMessage={operationsError}
            insight={operationsInsight}
            loadingIntent={operationsIntent}
            onSelect={loadOperationsInsight}
          />

          <section
            aria-labelledby="job-status-overview-heading"
            className="space-y-2.5"
          >
            <div>
              <h2
                className="text-base font-semibold text-foreground"
                id="job-status-overview-heading"
              >
                Jobs
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
              {metrics.map((metric) => (
                <MetricCard key={metric.label} {...metric} />
              ))}
            </div>
          </section>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <EmployeeWorkload summary={summary} />
            <RecentActivity summary={summary} />
          </div>
        </>
      ) : (
        <section className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          Dashboard data is not available.
        </section>
      )}
    </div>
  )
}

const operationsCommands: Array<{
  intent: Exclude<OperationsIntent, 'explain_job_attention_flag'>
  label: string
  message: string
}> = [
  {
    intent: 'show_jobs_requiring_attention',
    label: 'Needs attention',
    message: 'Show jobs requiring attention',
  },
  {
    intent: 'show_overdue_jobs',
    label: 'Overdue',
    message: 'Show overdue jobs',
  },
  {
    intent: 'show_workload_distribution',
    label: 'Workload',
    message: 'Show workload distribution',
  },
  {
    intent: 'summarize_open_operations',
    label: 'Open summary',
    message: 'Summarize open operations',
  },
]

function OperationsInsightPanel({
  errorMessage,
  insight,
  loadingIntent,
  onSelect,
}: {
  errorMessage: string
  insight: OperationsIntelligenceResult | null
  loadingIntent: OperationsIntent | null
  onSelect: (
    intent: Exclude<OperationsIntent, 'explain_job_attention_flag'>,
    message: string,
  ) => void
}) {
  const attentionItems = insight ? getAttentionItems(insight) : []

  return (
    <section
      aria-labelledby="operations-insight-heading"
      className="overflow-hidden rounded-lg border border-border bg-card"
    >
      <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ListFilter aria-hidden="true" className="size-4 text-muted-foreground" />
            <h2
              className="text-base font-semibold text-foreground"
              id="operations-insight-heading"
            >
              Operations insight
            </h2>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Read-only views from current job data.
          </p>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Operations views">
          {operationsCommands.map((command) => (
            <button
              className="inline-flex h-8 items-center rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-wait disabled:opacity-60"
              disabled={loadingIntent !== null}
              key={command.intent}
              onClick={() => onSelect(command.intent, command.message)}
              type="button"
            >
              {loadingIntent === command.intent ? 'Loading…' : command.label}
            </button>
          ))}
        </div>
      </div>

      {errorMessage ? (
        <p className="border-t border-border px-4 py-3 text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : insight ? (
        <div className="border-t border-border">
          <div className="space-y-1 px-4 py-3 text-sm text-foreground">
            {insight.summary.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
          {attentionItems.length > 0 ? (
            <div className="divide-y divide-border border-t border-border">
              {attentionItems.map((item) => (
                <OperationsAttentionRow item={item} key={item.jobId} />
              ))}
            </div>
          ) : null}
          {insight.data.intent === 'show_workload_distribution' ? (
            <div className="divide-y divide-border border-t border-border">
              {insight.data.employees.map((employee) => (
                <div
                  className="flex items-center justify-between gap-4 px-4 py-2.5"
                  key={employee.employeeId}
                >
                  <span className="truncate text-sm font-medium text-foreground">
                    {employee.displayName}
                  </span>
                  <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                    {employee.assignedJobCount} assigned / {employee.inProgressJobCount} in progress
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <p className="border-t border-border px-4 py-3 text-sm text-muted-foreground">
          Choose a view to inspect current operations.
        </p>
      )}
    </section>
  )
}

function OperationsAttentionRow({ item }: { item: OperationsAttentionItem }) {
  return (
    <div className="flex flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <Link
          className="truncate text-sm font-medium text-foreground hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          to={`/jobs/${item.jobId}`}
        >
          {item.title}
        </Link>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {item.attentionReasons.map((reason) => (
            <span
              className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
              key={reason}
            >
              {formatAttentionReason(reason)}
            </span>
          ))}
        </div>
      </div>
      <Link
        className="shrink-0 text-sm font-medium text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        to={`/jobs/${item.jobId}`}
      >
        Open job
      </Link>
    </div>
  )
}

function getAttentionItems(insight: OperationsIntelligenceResult) {
  const data = insight.data
  if ('items' in data) return data.items
  if (data.intent === 'summarize_open_operations') return data.attentionItems
  if (data.intent === 'explain_job_attention_flag') return [data.item]
  return []
}

function formatAttentionReason(reason: OperationsAttentionItem['attentionReasons'][number]) {
  switch (reason) {
    case 'urgent_unassigned':
      return 'Priority · unassigned'
    case 'assigned_not_started_after_due':
      return 'Assigned · past due'
    case 'in_progress_overdue':
      return 'In progress · past due'
    case 'overdue':
      return 'Overdue'
  }
}

function isOperationsIntelligenceResult(
  value: unknown,
  intent: OperationsIntent,
): value is OperationsIntelligenceResult {
  if (!value || typeof value !== 'object') return false
  const result = value as OperationsIntelligenceResult
  return (
    result.intent === intent &&
    result.data?.intent === intent &&
    Array.isArray(result.summary)
  )
}

function buildMetricItems(summary: DashboardSummary): MetricItem[] {
  const metrics: MetricItem[] = [
    {
      icon: BriefcaseBusiness,
      label: 'Total Jobs',
      value: String(summary.jobMetrics.totalJobs),
    },
    ...statusMetricOrder.map((status) => ({
      icon: statusMetricIcons[status],
      label: JOB_STATUS_LABELS[status],
      tone: statusMetricTone[status],
      value: String(summary.jobMetrics.statusCounts[status]),
    })),
  ]

  if (summary.jobMetrics.dueDateJobCount > 0) {
    metrics.push({
      icon: Clock,
      label: 'Overdue Jobs',
      tone: summary.jobMetrics.overdueJobs > 0 ? 'danger' : 'default',
      value: String(summary.jobMetrics.overdueJobs),
    })
  }

  return metrics
}

function buildActionNeededItems(summary: DashboardSummary): ActionNeededItem[] {
  const items: ActionNeededItem[] = [
    {
      actionLabel: 'View Jobs',
      actionTo: '/jobs',
      count: summary.actionNeeded.highPriorityOpenUnassignedJobs,
      description: 'Urgent or high-priority jobs are open with no employee assigned.',
      icon: AlertTriangle,
      label: 'Priority jobs need assignment',
      tone: 'warning',
    },
    {
      actionLabel: 'View Jobs',
      actionTo: '/jobs',
      count: summary.actionNeeded.overdueActiveJobs,
      description: 'Active jobs are past their due date.',
      icon: Clock,
      label: 'Overdue active jobs',
      tone: 'danger',
    },
    {
      actionLabel: 'View Jobs',
      actionTo: '/jobs',
      count: summary.actionNeeded.openUnassignedJobs,
      description: 'Open jobs are waiting for assignment.',
      icon: UserPlus,
      label: 'Open jobs need employees',
      tone: 'default',
    },
  ]

  return items.filter((item) => item.count > 0)
}

function ActionNeededPanel({ items }: { items: ActionNeededItem[] }) {
  return (
    <section
      aria-labelledby="action-needed-heading"
      className="rounded-lg border border-border bg-card"
    >
      <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2
            className="text-base font-semibold text-foreground"
            id="action-needed-heading"
          >
            Action Needed
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Jobs that need a decision.</p>
        </div>
        <StatusBadge tone={items.length > 0 ? 'warning' : 'success'}>
          {items.length > 0 ? `${items.length} active` : 'Clear'}
        </StatusBadge>
      </div>

      {items.length > 0 ? (
        <div className="divide-y divide-border border-t border-border">
          {items.map((item) => (
            <ActionNeededCard item={item} key={item.label} />
          ))}
        </div>
      ) : (
        <div className="border-t border-border px-4 py-3 text-sm text-muted-foreground">
          Nothing needs attention right now.
        </div>
      )}
    </section>
  )
}

function ActionNeededCard({ item }: { item: ActionNeededItem }) {
  const Icon = item.icon
  const toneClass = {
    danger: 'text-destructive',
    default: 'text-muted-foreground',
    primary: 'text-primary',
    warning: 'text-amber-600',
  }[item.tone]

  return (
    <article
      className={`grid gap-3 px-4 py-3 hover:bg-background sm:grid-cols-[40px_minmax(0,1fr)_auto] sm:items-center ${toneClass}`}
    >
      <div className="flex items-center gap-3 sm:block">
        <span className="inline-flex size-8 shrink-0 items-center justify-center text-lg font-semibold tracking-tight">
          {item.count}
        </span>
        <div className="min-w-0 sm:hidden">
          <h3 className="text-sm font-semibold text-foreground">
            {item.label}
          </h3>
        </div>
      </div>
      <div className="min-w-0">
        <div className="hidden items-center gap-2 sm:flex">
          <Icon aria-hidden="true" className="size-4 shrink-0" />
          <h3 className="truncate text-sm font-semibold text-foreground">
            {item.label}
          </h3>
        </div>
        <p className="text-sm leading-5 text-muted-foreground sm:mt-1 sm:truncate">
          {item.description}
        </p>
      </div>
      <ActionNeededLink item={item} />
    </article>
  )
}

function ActionNeededLink({ item }: { item: ActionNeededItem }) {
  const className =
    'inline-flex h-8 w-fit items-center justify-center gap-1.5 rounded-md px-2 text-sm font-medium text-primary transition-colors hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary/30'

  if (item.actionHref) {
    return (
      <a className={className} href={item.actionHref}>
        {item.actionLabel}
        <ArrowRight aria-hidden="true" className="size-4" />
      </a>
    )
  }

  return (
    <Link className={className} to={item.actionTo ?? '/jobs'}>
      {item.actionLabel}
      <ArrowRight aria-hidden="true" className="size-4" />
    </Link>
  )
}

function EmployeeWorkload({ summary }: { summary: DashboardSummary }) {
  const workload = summary.employeeWorkload.slice(0, 4)

  return (
    <section
      className="overflow-hidden rounded-lg border border-border bg-card"
      id="employee-workload"
    >
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Employee Workload
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Assigned and in progress.</p>
        </div>
        <Link
          className="shrink-0 text-sm font-medium text-primary transition hover:text-primary/80 focus:outline-none focus:ring-2 focus:ring-primary/30"
          to="/analytics"
        >
          View analytics
        </Link>
      </div>

      <div className="divide-y divide-border">
        {workload.length > 0 ? (
          workload.map((employee) => (
            <div
              className="flex items-center justify-between gap-4 px-4 py-2.5 hover:bg-background"
              key={employee.employeeId}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {employee.displayName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {employee.assignedJobCount} assigned /{' '}
                  {employee.inProgressJobCount} in progress
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                {employee.activeJobCount}
              </span>
            </div>
          ))
        ) : (
          <p className="px-4 py-3 text-sm text-muted-foreground">
            No active assignments.
          </p>
        )}
      </div>
    </section>
  )
}

function RecentActivity({ summary }: { summary: DashboardSummary }) {
  const recentActivities = summary.recentActivities.slice(0, 5)

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Recent Activity
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Latest job changes.</p>
        </div>
        <Link
          className="shrink-0 text-sm font-medium text-primary transition hover:text-primary/80 focus:outline-none focus:ring-2 focus:ring-primary/30"
          to="/jobs"
        >
          View Jobs
        </Link>
      </div>

      <div className="divide-y divide-border">
        {recentActivities.length > 0 ? (
          recentActivities.map((activity) => (
            <CompactActivityItem activity={activity} key={activity.id} />
          ))
        ) : (
          <p className="px-4 py-3 text-sm text-muted-foreground">
            No recent activity.
          </p>
        )}
      </div>
    </section>
  )
}

function CompactActivityItem({
  activity,
}: {
  activity: RecentDashboardActivity
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-background">
      <span className="inline-flex size-7 shrink-0 items-center justify-center text-muted-foreground">
        <ActivityIcon type={activity.activityType} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">
          {formatActivityType(activity.activityType)}: {activity.jobTitle}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatActivityTime(activity.performedAt)} - {activity.performerName}
        </p>
      </div>
    </div>
  )
}

function ActivityIcon({
  type,
}: {
  type: RecentDashboardActivity['activityType']
}) {
  switch (type) {
    case 'employees_assigned':
    case 'employees_reassigned':
    case 'employees_unassigned':
      return <UserPlus aria-hidden="true" className="size-4" />
    case 'employee_completed_job':
      return <CheckCircle2 aria-hidden="true" className="size-4" />
    case 'employee_started_job':
      return <RefreshCcw aria-hidden="true" className="size-4" />
    default:
      return <ClipboardList aria-hidden="true" className="size-4" />
  }
}

function DashboardLoadingState() {
  return (
    <section className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
      {Array.from({ length: 6 }, (_, index) => (
        <div
          className="min-h-[100px] animate-pulse bg-card p-3.5"
          key={index}
        >
          <div className="h-4 w-28 rounded-full bg-muted" />
          <div className="mt-6 h-8 w-16 rounded-full bg-muted" />
        </div>
      ))}
    </section>
  )
}

function formatActivityType(type: RecentDashboardActivity['activityType']) {
  switch (type) {
    case 'employee_completed_job':
      return 'Completed'
    case 'employee_started_job':
      return 'Started'
    case 'employees_assigned':
      return 'Assigned'
    case 'employees_reassigned':
      return 'Reassigned'
    case 'employees_unassigned':
      return 'Unassigned'
    default:
      return 'Status changed'
  }
}

function formatActivityTime(timestamp: { toDate: () => Date }) {
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
  }).format(timestamp.toDate())
}

function formatDashboardContext(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'full',
  }).format(date)
}
