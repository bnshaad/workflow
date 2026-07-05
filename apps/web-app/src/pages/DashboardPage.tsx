import { useEffect, useMemo, useState, type ComponentType, type SVGProps } from 'react'
import {
  ArrowRight,
  AlertTriangle,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock,
  ListChecks,
  Percent,
  Plus,
  RefreshCcw,
  Timer,
  UserPlus,
  UsersRound,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  MetricCard,
  PageHeader,
  RecentActivityItem,
  StatusBadge,
} from '@/components'
import { JOB_PRIORITY_OPTIONS } from '@/constants/jobConstants'
import { useAuth } from '@/hooks'
import { canCreateJob } from '@/permissions'
import {
  getDashboardSummary,
  type DashboardSummary,
  type RecentDashboardActivity,
} from '@/services/dashboard'
import {
  getManualAssignmentBaselineMetrics,
  type ManualAssignmentBaselineMetrics,
} from '@/services/evaluation'
import { JobStatuses, JOB_STATUS_LABELS, type JobStatus } from '@/types'
import type { JobPriority } from '@/types/jobPriority'

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

const HIGH_WORKLOAD_THRESHOLD = 3

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

const priorityTone: Record<JobPriority, 'danger' | 'default' | 'warning'> = {
  High: 'warning',
  Low: 'default',
  Medium: 'default',
  Urgent: 'danger',
}

export function DashboardPage() {
  const { profile } = useAuth()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [baseline, setBaseline] =
    useState<ManualAssignmentBaselineMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadDashboardSummary() {
      if (!profile) {
        return
      }

      setIsLoading(true)
      setErrorMessage('')

      try {
        const [dashboardSummary, baselineMetrics] = await Promise.all([
          getDashboardSummary(profile, profile.organizationId),
          getManualAssignmentBaselineMetrics(profile, profile.organizationId),
        ])

        if (isMounted) {
          setSummary(dashboardSummary)
          setBaseline(baselineMetrics)
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Dashboard metrics failed to load.', error)
        }

        if (isMounted) {
          setErrorMessage('Unable to load dashboard metrics. Please try again.')
          setSummary(null)
          setBaseline(null)
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

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description={formatDashboardContext(new Date())}
        actions={
          <>
            {canCreateJobs ? (
              <Link
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/30 sm:w-auto"
                to="/jobs/create"
              >
                <Plus aria-hidden="true" className="size-4" />
                Create Job
              </Link>
            ) : null}
            <Link
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-5 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/30 sm:w-auto"
              to="/jobs"
            >
              View Open Jobs
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

          <section
            aria-labelledby="job-status-overview-heading"
            className="space-y-4"
          >
            <div>
              <h2
                className="text-base font-semibold text-foreground"
                id="job-status-overview-heading"
              >
                Job Status Overview
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Current job counts by operational state.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
              {metrics.map((metric) => (
                <MetricCard key={metric.label} {...metric} />
              ))}
            </div>
          </section>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <EmployeeWorkload summary={summary} />
            <PriorityBreakdown summary={summary} />
            <RecentActivity summary={summary} />
          </div>

          {baseline ? <ManualAssignmentBaseline baseline={baseline} /> : null}
        </>
      ) : (
        <section className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
          No dashboard data is available yet.
        </section>
      )}
    </div>
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
  const overloadedEmployeeCount = summary.employeeWorkload.filter(
    (employee) => employee.activeJobCount >= HIGH_WORKLOAD_THRESHOLD,
  ).length

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
      actionHref: '#employee-workload',
      actionLabel: 'Review Workload',
      count: overloadedEmployeeCount,
      description: `Employees have ${HIGH_WORKLOAD_THRESHOLD} or more active jobs.`,
      icon: UsersRound,
      label: 'High employee workload',
      tone: 'primary',
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
      className="rounded-xl border border-border bg-card p-5 shadow-sm"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2
            className="text-base font-semibold text-foreground"
            id="action-needed-heading"
          >
            Action Needed
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Operational items that may need manager attention.
          </p>
        </div>
        <StatusBadge tone={items.length > 0 ? 'warning' : 'success'}>
          {items.length > 0 ? `${items.length} active` : 'Clear'}
        </StatusBadge>
      </div>

      {items.length > 0 ? (
        <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-4">
          {items.map((item) => (
            <ActionNeededCard item={item} key={item.label} />
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-lg border border-border bg-background px-4 py-5 text-sm text-muted-foreground">
          No urgent operational issues right now.
        </div>
      )}
    </section>
  )
}

function ActionNeededCard({ item }: { item: ActionNeededItem }) {
  const Icon = item.icon
  const toneClass = {
    danger: 'border-destructive/20 bg-destructive/5 text-destructive',
    default: 'border-border bg-background text-foreground',
    primary: 'border-primary/20 bg-primary/5 text-primary',
    warning: 'border-amber-500/20 bg-amber-500/5 text-amber-600',
  }[item.tone]

  return (
    <article className={`rounded-lg border p-4 ${toneClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-2xl font-semibold tracking-tight">{item.count}</p>
          <h3 className="mt-1 text-sm font-semibold text-foreground">
            {item.label}
          </h3>
        </div>
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-card/80">
          <Icon aria-hidden="true" className="size-4" />
        </span>
      </div>
      <p className="mt-3 text-sm leading-5 text-muted-foreground">
        {item.description}
      </p>
      <ActionNeededLink item={item} />
    </article>
  )
}

function ActionNeededLink({ item }: { item: ActionNeededItem }) {
  const className =
    'mt-4 inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/30'

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

function PriorityBreakdown({ summary }: { summary: DashboardSummary }) {
  return (
    <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Priority Breakdown
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Jobs grouped by service urgency.
          </p>
        </div>
        <ListChecks aria-hidden="true" className="size-5 text-muted-foreground" />
      </div>

      <div className="mt-6 space-y-3">
        {JOB_PRIORITY_OPTIONS.map((priority) => (
          <div
            className="flex items-center justify-between gap-4 rounded-md border border-border bg-background px-4 py-3"
            key={priority}
          >
            <StatusBadge tone={priorityTone[priority]}>{priority}</StatusBadge>
            <span className="text-lg font-semibold text-foreground">
              {summary.jobMetrics.priorityCounts[priority]}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

function EmployeeWorkload({ summary }: { summary: DashboardSummary }) {
  const workload = summary.employeeWorkload.slice(0, 8)

  return (
    <section
      className="rounded-lg border border-border bg-card p-6 shadow-sm"
      id="employee-workload"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Employee Workload
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Assigned and in-progress jobs.
          </p>
        </div>
        <UsersRound aria-hidden="true" className="size-5 text-muted-foreground" />
      </div>

      <div className="mt-6 space-y-3">
        {workload.length > 0 ? (
          workload.map((employee) => (
            <div
              className="flex items-center justify-between gap-4 rounded-md border border-border bg-background px-4 py-3"
              key={employee.employeeId}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {employee.displayName}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {employee.assignedJobCount} assigned /{' '}
                  {employee.inProgressJobCount} in progress
                </p>
              </div>
              <span className="shrink-0 text-lg font-semibold text-foreground">
                {employee.activeJobCount}
              </span>
            </div>
          ))
        ) : (
          <p className="rounded-md border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
            No active employee workload yet.
          </p>
        )}
      </div>
    </section>
  )
}

function RecentActivity({ summary }: { summary: DashboardSummary }) {
  return (
    <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Recent Activity
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Latest job lifecycle events.
          </p>
        </div>
        <Check aria-hidden="true" className="size-5 text-muted-foreground" />
      </div>

      <div className="relative mt-6 space-y-6 pl-5 before:absolute before:inset-y-0 before:left-[11px] before:w-px before:bg-border">
        {summary.recentActivities.length > 0 ? (
          summary.recentActivities.map((activity) => (
            <RecentActivityItem
              icon={getActivityIcon(activity.activityType)}
              key={activity.id}
              meta={`${formatActivityTime(activity.performedAt)} - ${activity.performerName}`}
              text={`${formatActivityType(activity.activityType)}: ${activity.jobTitle}`}
              tone={getActivityTone(activity.activityType)}
            />
          ))
        ) : (
          <p className="-ml-5 rounded-md border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
            No recent job activity yet.
          </p>
        )}
      </div>
    </section>
  )
}

function ManualAssignmentBaseline({
  baseline,
}: {
  baseline: ManualAssignmentBaselineMetrics
}) {
  const topEmployees = baseline.assignmentCountByEmployee.slice(0, 6)

  return (
    <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Manual Assignment Baseline
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Descriptive outcomes for manager-selected initial assignments.
          </p>
        </div>
        <StatusBadge tone="default">Manual</StatusBadge>
      </div>

      {baseline.totalManualAssignments > 0 ? (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <BaselineMetric
              icon={UserPlus}
              label="Manual Assignments"
              value={String(baseline.totalManualAssignments)}
            />
            <BaselineMetric
              icon={RefreshCcw}
              label="Jobs Started"
              value={String(baseline.jobsStarted)}
            />
            <BaselineMetric
              icon={CheckCircle2}
              label="Jobs Completed"
              value={String(baseline.completedJobs)}
            />
            <BaselineMetric
              icon={Percent}
              label="Completion Rate"
              value={formatPercent(baseline.completionRate)}
            />
            <BaselineMetric
              icon={Timer}
              label="Avg Assign to Start"
              value={formatHours(baseline.averageAssignedToStartedHours)}
            />
            <BaselineMetric
              icon={Clock}
              label="Avg Assign to Complete"
              value={formatHours(baseline.averageAssignedToCompletedHours)}
            />
            {baseline.jobsWithDueDate > 0 ? (
              <BaselineMetric
                icon={AlertTriangle}
                label="Overdue Completions"
                value={`${baseline.jobsCompletedOverdue} (${formatPercent(
                  baseline.overdueCompletionRate ?? 0,
                )})`}
              />
            ) : null}
            <BaselineMetric
              icon={UsersRound}
              label="Distribution"
              value={`${baseline.assignmentDistribution.lowest} / ${baseline.assignmentDistribution.highest} / ${formatNumber(
                baseline.assignmentDistribution.average,
              )}`}
              helper="Low / high / avg"
            />
          </div>

          <div className="mt-6 rounded-md border border-border bg-background p-4">
            <h3 className="text-sm font-semibold text-foreground">
              Assignment Count by Employee
            </h3>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {topEmployees.map((employee) => (
                <div
                  className="flex items-center justify-between gap-4 rounded-md border border-border bg-card px-4 py-3"
                  key={employee.employeeId}
                >
                  <span className="min-w-0 truncate text-sm text-foreground">
                    {employee.displayName}
                  </span>
                  <span className="shrink-0 text-sm font-semibold text-foreground">
                    {employee.assignmentCount}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <p className="mt-6 rounded-md border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
          No manual initial assignment audit events are available yet.
        </p>
      )}
    </section>
  )
}

function BaselineMetric({
  helper,
  icon: Icon,
  label,
  value,
}: {
  helper?: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  label: string
  value: string
}) {
  return (
    <div className="rounded-md border border-border bg-background p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon aria-hidden="true" className="size-4 shrink-0" />
        <p className="text-xs font-medium uppercase leading-5 tracking-[0.08em]">
          {label}
        </p>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
      {helper ? (
        <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
      ) : null}
    </div>
  )
}

function DashboardLoadingState() {
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
      {Array.from({ length: 6 }, (_, index) => (
        <div
          className="min-h-[168px] rounded-xl border border-border bg-card p-6 shadow-sm"
          key={index}
        >
          <div className="h-4 w-28 rounded-full bg-muted" />
          <div className="mt-6 h-8 w-16 rounded-full bg-muted" />
        </div>
      ))}
    </section>
  )
}

function getActivityIcon(type: RecentDashboardActivity['activityType']) {
  switch (type) {
    case 'employees_assigned':
    case 'employees_reassigned':
    case 'employees_unassigned':
      return UserPlus
    case 'employee_completed_job':
      return CheckCircle2
    case 'employee_started_job':
      return RefreshCcw
    default:
      return ClipboardList
  }
}

function getActivityTone(type: RecentDashboardActivity['activityType']) {
  switch (type) {
    case 'employee_completed_job':
      return 'success'
    case 'employees_unassigned':
      return 'danger'
    case 'employee_started_job':
    case 'employees_assigned':
    case 'employees_reassigned':
      return 'primary'
    default:
      return 'default'
  }
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
  return `Operational snapshot for ${new Intl.DateTimeFormat(undefined, {
    dateStyle: 'full',
  }).format(date)}.`
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`
}

function formatHours(value: number | null) {
  return value === null ? 'N/A' : `${formatNumber(value)}h`
}

function formatNumber(value: number) {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 1,
  }).format(value)
}
