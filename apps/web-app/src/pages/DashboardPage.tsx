import { useEffect, useMemo, useState, type ComponentType, type SVGProps } from 'react'
import {
  ArrowRight,
  AlertTriangle,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardList,
  Clock,
  Plus,
  RefreshCcw,
  UserPlus,
  UsersRound,
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
import { JobStatuses, JOB_STATUS_LABELS, type JobStatus } from '@/types'

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

export function DashboardPage() {
  const { profile } = useAuth()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
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

  return (
    <div className="space-y-5">
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
            className="space-y-3"
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {metrics.map((metric) => (
                <MetricCard key={metric.label} {...metric} />
              ))}
            </div>
          </section>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <EmployeeWorkload summary={summary} />
            <RecentActivity summary={summary} />
          </div>
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
      className="rounded-xl border border-border bg-card p-4 shadow-sm"
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
        <div className="mt-4 grid grid-cols-1 gap-2 xl:grid-cols-2">
          {items.map((item) => (
            <ActionNeededCard item={item} key={item.label} />
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
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
    <article
      className={`grid gap-3 rounded-lg border p-3 sm:grid-cols-[48px_minmax(0,1fr)_auto] sm:items-center ${toneClass}`}
    >
      <div className="flex items-center gap-3 sm:block">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-card/80 text-lg font-semibold tracking-tight">
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
    'inline-flex h-8 w-fit items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/30'

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
      className="rounded-lg border border-border bg-card p-4 shadow-sm"
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
        <Link
          className="shrink-0 text-sm font-medium text-primary transition hover:text-primary/80 focus:outline-none focus:ring-2 focus:ring-primary/30"
          to="/analytics"
        >
          View full workload in Analytics
        </Link>
      </div>

      <div className="mt-4 space-y-2">
        {workload.length > 0 ? (
          workload.map((employee) => (
            <div
              className="flex items-center justify-between gap-4 rounded-md border border-border bg-background px-3 py-2"
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
              <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-card text-sm font-semibold text-foreground">
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
  const recentActivities = summary.recentActivities.slice(0, 5)

  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Recent Activity
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Latest job lifecycle events.
          </p>
        </div>
        <Link
          className="shrink-0 text-sm font-medium text-primary transition hover:text-primary/80 focus:outline-none focus:ring-2 focus:ring-primary/30"
          to="/jobs"
        >
          View Jobs
        </Link>
      </div>

      <div className="mt-4 space-y-2">
        {recentActivities.length > 0 ? (
          recentActivities.map((activity) => (
            <CompactActivityItem activity={activity} key={activity.id} />
          ))
        ) : (
          <p className="rounded-md border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
            No recent job activity yet.
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
    <div className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2">
      <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-card text-muted-foreground">
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
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }, (_, index) => (
        <div
          className="min-h-[92px] rounded-lg border border-border bg-card p-3 shadow-sm"
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
  return `Operational snapshot for ${new Intl.DateTimeFormat(undefined, {
    dateStyle: 'full',
  }).format(date)}.`
}
