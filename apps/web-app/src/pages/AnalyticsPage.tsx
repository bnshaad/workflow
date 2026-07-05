import {
  useEffect,
  useState,
  type ComponentType,
  type ReactNode,
  type SVGProps,
} from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ListChecks,
  Percent,
  RefreshCcw,
  Sparkles,
  Timer,
  UserPlus,
  UsersRound,
} from 'lucide-react'
import { PageHeader, StatusBadge } from '@/components'
import { JOB_PRIORITY_OPTIONS } from '@/constants/jobConstants'
import { useAuth } from '@/hooks'
import {
  getDashboardSummary,
  type DashboardSummary,
} from '@/services/dashboard'
import {
  getManualAssignmentBaselineMetrics,
  type ManualAssignmentBaselineMetrics,
} from '@/services/evaluation'
import type { JobPriority } from '@/types/jobPriority'

const priorityTone: Record<JobPriority, 'danger' | 'default' | 'warning'> = {
  High: 'warning',
  Low: 'default',
  Medium: 'default',
  Urgent: 'danger',
}

export function AnalyticsPage() {
  const { profile } = useAuth()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [baseline, setBaseline] =
    useState<ManualAssignmentBaselineMetrics | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function loadAnalytics() {
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
          console.error('Analytics metrics failed to load.', error)
        }

        if (isMounted) {
          setErrorMessage('Unable to load analytics. Please try again.')
          setSummary(null)
          setBaseline(null)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadAnalytics()

    return () => {
      isMounted = false
    }
  }, [profile])

  return (
    <div className="space-y-5">
      <PageHeader
        title="Analytics"
        description="Operational performance and assignment evaluation"
      />

      {isLoading ? (
        <AnalyticsLoadingState />
      ) : errorMessage ? (
        <section className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </section>
      ) : summary ? (
        <>
          <OperationsSummary summary={summary} />
          {baseline ? <ManualAssignmentBaseline baseline={baseline} /> : null}
          <FutureEvaluationState />
        </>
      ) : (
        <section className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
          No analytics data is available yet.
        </section>
      )}
    </div>
  )
}

function OperationsSummary({ summary }: { summary: DashboardSummary }) {
  const employeeCount = summary.employeeWorkload.length
  const highWorkloadCount = summary.employeeWorkload.filter(
    (employee) => employee.activeJobCount >= 3,
  ).length
  const idleEmployeeCount = summary.employeeWorkload.filter(
    (employee) => employee.activeJobCount === 0,
  ).length
  const averageActiveJobs =
    employeeCount === 0
      ? 0
      : summary.employeeWorkload.reduce(
          (total, employee) => total + employee.activeJobCount,
          0,
        ) / employeeCount

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-foreground">
          Operations Summary
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Job urgency, workload distribution, and overdue job signals.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <PriorityBreakdown summary={summary} />

        <AnalyticsCard
          description="Active jobs are assigned or in progress."
          icon={UsersRound}
          title="Workload Distribution"
        >
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <SummaryStat
              label="High workload"
              value={String(highWorkloadCount)}
            />
            <SummaryStat
              label="No active jobs"
              value={String(idleEmployeeCount)}
            />
            <SummaryStat
              label="Avg active jobs"
              value={formatNumber(averageActiveJobs)}
            />
          </div>
        </AnalyticsCard>

        <AnalyticsCard
          description="Overdue excludes completed and cancelled jobs."
          icon={AlertTriangle}
          title="Overdue Jobs"
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <SummaryStat
              label="Overdue active"
              tone={summary.jobMetrics.overdueJobs > 0 ? 'danger' : 'default'}
              value={String(summary.jobMetrics.overdueJobs)}
            />
            <SummaryStat
              label="Jobs with due dates"
              value={String(summary.jobMetrics.dueDateJobCount)}
            />
          </div>
        </AnalyticsCard>
      </div>
    </section>
  )
}

function PriorityBreakdown({ summary }: { summary: DashboardSummary }) {
  return (
    <AnalyticsCard
      description="Jobs grouped by service urgency."
      icon={ListChecks}
      title="Priority Breakdown"
    >
      <div className="space-y-3">
        {JOB_PRIORITY_OPTIONS.map((priority) => (
          <div
            className="flex items-center justify-between gap-4 rounded-md border border-border bg-background px-3 py-2"
            key={priority}
          >
            <StatusBadge tone={priorityTone[priority]}>{priority}</StatusBadge>
            <span className="text-lg font-semibold text-foreground">
              {summary.jobMetrics.priorityCounts[priority]}
            </span>
          </div>
        ))}
      </div>
    </AnalyticsCard>
  )
}

function ManualAssignmentBaseline({
  baseline,
}: {
  baseline: ManualAssignmentBaselineMetrics
}) {
  const topEmployees = baseline.assignmentCountByEmployee.slice(0, 6)

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
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
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
            <BaselineMetric
              icon={AlertTriangle}
              label="Overdue Completion Rate"
              value={
                baseline.jobsWithDueDate > 0
                  ? formatPercent(baseline.overdueCompletionRate ?? 0)
                  : 'N/A'
              }
              helper={
                baseline.jobsWithDueDate > 0
                  ? `${baseline.jobsCompletedOverdue} overdue completions`
                  : 'No due-date baseline'
              }
            />
            <BaselineMetric
              icon={UsersRound}
              label="Distribution"
              value={`${baseline.assignmentDistribution.lowest} / ${baseline.assignmentDistribution.highest} / ${formatNumber(
                baseline.assignmentDistribution.average,
              )}`}
              helper="Low / high / avg"
            />
          </div>

          <div className="mt-4 rounded-md border border-border bg-background p-3">
            <h3 className="text-sm font-semibold text-foreground">
              Employee Assignment Distribution
            </h3>
            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
              {topEmployees.map((employee) => (
                <div
                  className="flex items-center justify-between gap-4 rounded-md border border-border bg-card px-3 py-2"
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

function FutureEvaluationState() {
  return (
    <section className="rounded-xl border border-dashed border-border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Sparkles aria-hidden="true" className="size-4 text-primary" />
            AI-Assisted Assignment Evaluation
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            AI-assisted evaluation will appear after recommendation acceptance
            and override tracking are implemented.
          </p>
        </div>
        <StatusBadge tone="default">Future</StatusBadge>
      </div>
    </section>
  )
}

function AnalyticsCard({
  children,
  description,
  icon: Icon,
  title,
}: {
  children: ReactNode
  description: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  title: string
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <Icon aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
      </div>
      {children}
    </section>
  )
}

function SummaryStat({
  label,
  tone = 'default',
  value,
}: {
  label: string
  tone?: 'danger' | 'default'
  value: string
}) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <p className="text-xs font-medium uppercase leading-5 tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <p
        className={
          tone === 'danger'
            ? 'mt-3 text-2xl font-semibold tracking-tight text-destructive'
            : 'mt-3 text-2xl font-semibold tracking-tight text-foreground'
        }
      >
        {value}
      </p>
    </div>
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
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon aria-hidden="true" className="size-4 shrink-0" />
        <p className="text-xs font-medium uppercase leading-5 tracking-[0.08em]">
          {label}
        </p>
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
      {helper ? (
        <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
      ) : null}
    </div>
  )
}

function AnalyticsLoadingState() {
  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 8 }, (_, index) => (
        <div
          className="min-h-[92px] rounded-lg border border-border bg-card p-3 shadow-sm"
          key={index}
        >
          <div className="h-4 w-28 rounded-full bg-muted" />
          <div className="mt-4 h-8 w-16 rounded-full bg-muted" />
        </div>
      ))}
    </section>
  )
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
