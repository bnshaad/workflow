import { useEffect, useMemo, useState, type ComponentType, type SVGProps } from 'react'
import {
  AlertTriangle,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock,
  ListChecks,
  RefreshCcw,
  UserPlus,
  UsersRound,
} from 'lucide-react'
import {
  MetricCard,
  PageHeader,
  RecentActivityItem,
  StatusBadge,
} from '@/components'
import { JOB_PRIORITY_OPTIONS } from '@/constants/jobConstants'
import { useAuth } from '@/hooks'
import {
  getDashboardSummary,
  type DashboardSummary,
  type RecentDashboardActivity,
} from '@/services/dashboard'
import { JobStatuses, JOB_STATUS_LABELS, type JobStatus } from '@/types'
import type { JobPriority } from '@/types/jobPriority'

type MetricItem = {
  icon: ComponentType<SVGProps<SVGSVGElement>>
  label: string
  tone?: 'default' | 'primary' | 'success' | 'danger'
  value: string
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

const priorityTone: Record<JobPriority, 'danger' | 'default' | 'warning'> = {
  High: 'warning',
  Low: 'default',
  Medium: 'default',
  Urgent: 'danger',
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

  return (
    <div className="space-y-8">
      <PageHeader
        title="Today's Overview"
        description="Operational snapshot for your service business."
      />

      {isLoading ? (
        <DashboardLoadingState />
      ) : errorMessage ? (
        <section className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </section>
      ) : summary ? (
        <>
          <section
            aria-label="Dashboard metrics"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6"
          >
            {metrics.map((metric) => (
              <MetricCard key={metric.label} {...metric} />
            ))}
          </section>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <PriorityBreakdown summary={summary} />
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
    <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
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
