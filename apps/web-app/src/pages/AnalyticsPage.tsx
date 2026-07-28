import {
  useEffect,
  useState,
  type ComponentType,
  type ReactNode,
  type SVGProps,
} from 'react'
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  Cpu,
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
import { canViewAcademicBenchmarks } from '@/permissions'

import {
  getDashboardSummary,
  type DashboardSummary,
} from '@/services/dashboard'
import {
  getManualAssignmentBaselineMetrics,
  type ManualAssignmentBaselineMetrics,
} from '@/services/evaluation'
import {
  assignmentRecommendationService,
} from '@/services/recommendations'
import type { RecommendationDecisionEvaluationMetrics } from '@/services/recommendations/assignmentRecommendationDecisionRules'
import type { JobPriority } from '@/types/jobPriority'
import { cn } from '@/utils'

const priorityTone: Record<JobPriority, 'danger' | 'default' | 'warning'> = {
  High: 'warning',
  Low: 'default',
  Medium: 'default',
  Urgent: 'danger',
}

export function AnalyticsPage() {
  const { profile } = useAuth()
  const showAcademicBenchmarks = profile ? canViewAcademicBenchmarks(profile) : false
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [baseline, setBaseline] =
    useState<ManualAssignmentBaselineMetrics | null>(null)
  const [recommendationMetrics, setRecommendationMetrics] =
    useState<RecommendationDecisionEvaluationMetrics | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [rawActiveTab, setActiveTab] = useState<'manager' | 'benchmark'>('manager')
  const activeTab = showAcademicBenchmarks ? rawActiveTab : 'manager'


  useEffect(() => {
    let isMounted = true

    async function loadReports() {
      if (!profile) {
        return
      }

      setIsLoading(true)
      setErrorMessage('')

      try {
        const [dashboardSummary, baselineMetrics, recMetrics] = await Promise.all([
          getDashboardSummary(profile, profile.organizationId),
          getManualAssignmentBaselineMetrics(profile, profile.organizationId),
          assignmentRecommendationService
            .getRecommendationDecisionMetrics(profile, profile.organizationId)
            .catch((err) => {
              if (import.meta.env.DEV) console.error('Rec metrics error', err)
              return null
            }),
        ])

        if (isMounted) {
          setSummary(dashboardSummary)
          setBaseline(baselineMetrics)
          setRecommendationMetrics(recMetrics)
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Reports metrics failed to load.', error)
        }

        if (isMounted) {
          setErrorMessage('Unable to load reports. Please try again.')
          setSummary(null)
          setBaseline(null)
          setRecommendationMetrics(null)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadReports()

    return () => {
      isMounted = false
    }
  }, [profile])

  return (
    <div className="space-y-4">
      <PageHeader
        title="Reports & Evaluation"
        description="Evidence-based AI recommendation performance and manual assignment baselines."
      />

      {/* Primary Manager Operational Header */}
      {showAcademicBenchmarks ? (

        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex gap-2">
            <button
              className={cn(
                'inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors',
                activeTab === 'manager'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-card border border-border text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
              onClick={() => setActiveTab('manager')}
              type="button"
            >
              <BarChart3 className="size-3.5" />
              Manager Operational KPIs
            </button>

            <button
              className={cn(
                'inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors',
                activeTab === 'benchmark'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-card border border-border text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
              onClick={() => setActiveTab('benchmark')}
              type="button"
            >
              <Cpu className="size-3.5" />
              Academic Research Benchmarks
            </button>
          </div>
        </div>
      ) : null}


      {isLoading ? (
        <AnalyticsLoadingState />
      ) : errorMessage ? (
        <section className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </section>
      ) : summary ? (
        activeTab === 'manager' ? (
          <div className="space-y-6">
            <OperationsSummary summary={summary} />
            {recommendationMetrics ? (
              <AiDecisionEvaluationPanel metrics={recommendationMetrics} />
            ) : null}
            {baseline ? <ManualAssignmentBaseline baseline={baseline} /> : null}
          </div>
        ) : (
          <div className="space-y-6">
            <AlgorithmComparisonPanel />
          </div>
        )
      ) : (
        <section className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          Reports are not available.
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
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-bold text-foreground">
          Operational Capacity
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Current field workload and overdue work.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <PriorityBreakdown summary={summary} />

        <AnalyticsCard
          description="Active jobs assigned or in progress."
          icon={UsersRound}
          title="Workload Distribution"
        >
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <SummaryStat
              label="High workload (≥3 jobs)"
              value={String(highWorkloadCount)}
            />
            <SummaryStat
              label="Available (0 active jobs)"
              value={String(idleEmployeeCount)}
            />
            <SummaryStat
              label="Avg active jobs / tech"
              value={formatNumber(averageActiveJobs)}
            />
          </div>
        </AnalyticsCard>

        <AnalyticsCard
          description="Overdue active service jobs."
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
      <div className="space-y-2">
        {JOB_PRIORITY_OPTIONS.map((priority) => (
          <div
            className="flex items-center justify-between gap-4 border-b border-border/60 px-1 py-2 last:border-b-0"
            key={priority}
          >
            <StatusBadge tone={priorityTone[priority]}>{priority}</StatusBadge>
            <span className="text-base font-semibold text-foreground">
              {summary.jobMetrics.priorityCounts[priority]}
            </span>
          </div>
        ))}
      </div>
    </AnalyticsCard>
  )
}

function AiDecisionEvaluationPanel({
  metrics,
}: {
  metrics: RecommendationDecisionEvaluationMetrics
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card p-4 shadow-2xs">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Sparkles className="size-4 text-primary" />
            AI Decision Support Quality Metrics
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Manager acceptance rate & override tracking for explainable recommendations.
          </p>
        </div>
        <StatusBadge tone="primary">Phase 3 Evaluation</StatusBadge>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <BaselineMetric
          icon={Percent}
          label="Acceptance Rate"
          value={formatPercent(metrics.acceptanceRate)}
        />
        <BaselineMetric
          icon={CheckCircle2}
          label="Recs Accepted"
          value={String(metrics.recommendationsAccepted)}
        />
        <BaselineMetric
          icon={AlertTriangle}
          label="Recs Overridden"
          value={String(metrics.recommendationsOverridden)}
        />
        <BaselineMetric
          icon={ListChecks}
          label="Total Recs Generated"
          value={String(metrics.recommendationsGenerated)}
        />
      </div>
    </section>
  )
}

function AlgorithmComparisonPanel() {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card p-4 shadow-2xs">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Sparkles className="size-4 text-primary" />
            Algorithm Comparison (Weighted vs AHP-TOPSIS)
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Side-by-side strategy benchmark for decision optimization.
          </p>
        </div>
        <StatusBadge tone="primary">Phase 2 Active</StatusBadge>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-muted/20 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-foreground">Weighted Strategy (`rule-based-v1`)</h3>
            <span className="text-[10px] font-semibold text-muted-foreground">Additive Baseline</span>
          </div>
          <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
            <li>• Criteria: Fixed sum across Skills (35%), Availability (25%), Workload (20%), Performance (10%)</li>
            <li>• Scoring Range: 0 to 100 additive points</li>
            <li>• Use Case: General operations baseline</li>
          </ul>
        </div>

        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-primary">AHP-TOPSIS Strategy (`ahp-topsis-v1`)</h3>
            <span className="text-[10px] font-semibold text-primary">MCDM Active</span>
          </div>
          <ul className="mt-3 space-y-1.5 text-xs text-foreground">
            <li>• Criteria: AHP Pairwise Matrix derived weights + TOPSIS Relative Closeness ($C_i^*$)</li>
            <li>• Profiles: Emergency Repair, Commercial Maintenance, Standard</li>
            <li>• Confidence Score: High (≥0.80), Medium (0.60–0.79), Low (&lt;0.60)</li>
          </ul>
        </div>
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
    <section className="overflow-hidden rounded-xl border border-border bg-card p-4 shadow-2xs">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-bold text-foreground">
            Manual Assignment Baseline
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Historical outcomes from manager-selected assignments.
          </p>
        </div>
        <StatusBadge tone="default">Manual</StatusBadge>
      </div>

      {baseline.totalManualAssignments > 0 ? (
        <>
          <div className="mt-4 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
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

          <div className="mt-4 rounded-xl border border-border bg-background p-3.5">
            <h3 className="text-xs font-bold text-foreground">
              Employee Assignment Distribution
            </h3>
            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
              {topEmployees.map((employee) => (
                <div
                  className="flex items-center justify-between gap-4 border-b border-border/60 px-1 py-2 last:border-b-0"
                  key={employee.employeeId}
                >
                  <span className="min-w-0 truncate text-xs text-foreground font-medium">
                    {employee.displayName}
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-foreground">
                    {employee.assignmentCount}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <p className="mt-4 rounded-xl border border-border bg-background px-4 py-3 text-xs text-muted-foreground">
          No manual assignment history is available.
        </p>
      )}
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
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-2xs">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3.5">
        <div>
          <h3 className="text-xs font-bold text-foreground">{title}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
        <span className="inline-flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon aria-hidden="true" className="size-4 shrink-0" />
        </span>
      </div>
      <div className="p-4">{children}</div>
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
    <div className="flex items-end justify-between gap-3 border-b border-border/60 px-1 py-2 last:border-b-0">
      <p className="text-xs font-medium text-muted-foreground">
        {label}
      </p>
      <p
        className={
          tone === 'danger'
            ? 'text-lg font-bold tracking-tight text-rose-600'
            : 'text-lg font-bold tracking-tight text-foreground'
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
    <div className="bg-card p-3.5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon aria-hidden="true" className="size-3.5 shrink-0 text-primary" />
        <p className="text-[10px] font-bold uppercase tracking-wider">
          {label}
        </p>
      </div>
      <p className="mt-2 text-xl font-bold tracking-tight text-foreground">
        {value}
      </p>
      {helper ? (
        <p className="mt-1 text-[11px] text-muted-foreground">{helper}</p>
      ) : null}
    </div>
  )
}

function AnalyticsLoadingState() {
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 8 }, (_, index) => (
        <div
          className="min-h-[100px] animate-pulse rounded-xl border border-border bg-card p-4"
          key={index}
        >
          <div className="h-3.5 w-28 rounded-full bg-muted" />
          <div className="mt-4 h-8 w-16 rounded-lg bg-muted" />
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
