export const OPERATIONS_INTENTS = [
  'show_urgent_unassigned_jobs',
  'show_overdue_jobs',
  'show_jobs_requiring_attention',
  'show_workload_distribution',
  'summarize_open_operations',
  'explain_job_attention_flag',
] as const

export type OperationsIntent = (typeof OPERATIONS_INTENTS)[number]

export const OPERATIONS_ATTENTION_REASONS = [
  'urgent_unassigned',
  'overdue',
  'assigned_not_started_after_due',
  'in_progress_overdue',
] as const

export type OperationsAttentionReason =
  (typeof OPERATIONS_ATTENTION_REASONS)[number]

export const OPERATIONS_ATTENTION_LIMIT = 10
export const OPERATIONS_WORKLOAD_LIMIT = 10

export type OperationsJobInput = {
  assignedEmployeeIds: string[]
  dueAtMillis: number | null
  id: string
  isActive: boolean
  priority: string
  status: string
  title: string
}

export type OperationsEmployeeInput = {
  displayName: string
  id: string
}

export type OperationsAttentionItem = {
  assignedEmployeeCount: number
  attentionReasons: OperationsAttentionReason[]
  dueDate: string | null
  jobId: string
  priority: string
  status: string
  title: string
}

export type OperationsWorkloadItem = {
  activeJobCount: number
  assignedJobCount: number
  displayName: string
  employeeId: string
  inProgressJobCount: number
}

export type OperationsCounts = {
  assigned: number
  draft: number
  inProgress: number
  open: number
  overdue: number
  urgentUnassigned: number
}

type OperationsResultBase<TIntent extends OperationsIntent> = {
  generatedAt: string
  intent: TIntent
  isTruncated: boolean
  sourceJobLimit: number
}

export type OperationsJobsResult = OperationsResultBase<
  | 'show_urgent_unassigned_jobs'
  | 'show_overdue_jobs'
  | 'show_jobs_requiring_attention'
> & {
  items: OperationsAttentionItem[]
}

export type OperationsWorkloadResult =
  OperationsResultBase<'show_workload_distribution'> & {
    employeeIsTruncated: boolean
    employees: OperationsWorkloadItem[]
    note: string
    sourceEmployeeLimit: number
  }

export type OperationsSummaryResult =
  OperationsResultBase<'summarize_open_operations'> & {
    attentionItems: OperationsAttentionItem[]
    counts: OperationsCounts
  }

export type OperationsExplanationResult =
  OperationsResultBase<'explain_job_attention_flag'> & {
    item: OperationsAttentionItem
  }

export type OperationsToolResult =
  | OperationsJobsResult
  | OperationsWorkloadResult
  | OperationsSummaryResult
  | OperationsExplanationResult

export type OperationsIntelligenceResult = {
  data: OperationsToolResult
  intent: OperationsIntent
  summary: string[]
}

export function isOperationsIntent(value: unknown): value is OperationsIntent {
  return (
    typeof value === 'string' &&
    OPERATIONS_INTENTS.includes(value as OperationsIntent)
  )
}

export function isUrgentUnassignedOperation(job: OperationsJobInput) {
  return (
    job.isActive &&
    job.status === 'open' &&
    (job.priority === 'Urgent' || job.priority === 'High') &&
    job.assignedEmployeeIds.length === 0
  )
}

export function isOverdueOperation(
  job: OperationsJobInput,
  nowMillis: number,
) {
  return (
    job.isActive &&
    job.dueAtMillis !== null &&
    job.dueAtMillis < nowMillis &&
    job.status !== 'completed' &&
    job.status !== 'cancelled'
  )
}

export function getOperationsAttentionReasons(
  job: OperationsJobInput,
  nowMillis: number,
): OperationsAttentionReason[] {
  const reasons: OperationsAttentionReason[] = []

  if (isUrgentUnassignedOperation(job)) {
    reasons.push('urgent_unassigned')
  }

  if (isOverdueOperation(job, nowMillis)) {
    reasons.push('overdue')

    if (job.status === 'assigned') {
      reasons.push('assigned_not_started_after_due')
    }

    if (job.status === 'in_progress') {
      reasons.push('in_progress_overdue')
    }
  }

  return reasons
}

export function buildOperationsToolResult(input: {
  employees?: OperationsEmployeeInput[]
  employeeIsTruncated?: boolean
  intent: OperationsIntent
  isTruncated: boolean
  jobs: OperationsJobInput[]
  nowMillis: number
  sourceJobLimit: number
  sourceEmployeeLimit?: number
}): OperationsToolResult {
  const generatedAt = new Date(input.nowMillis).toISOString()
  const attentionItems = input.jobs
    .map((job) => toAttentionItem(job, input.nowMillis))
    .filter((item) => item.attentionReasons.length > 0)
    .sort(compareAttentionItems)

  switch (input.intent) {
    case 'show_urgent_unassigned_jobs':
      return {
        generatedAt,
        intent: input.intent,
        isTruncated: input.isTruncated,
        items: attentionItems
          .filter((item) => item.attentionReasons.includes('urgent_unassigned'))
          .slice(0, OPERATIONS_ATTENTION_LIMIT),
        sourceJobLimit: input.sourceJobLimit,
      }
    case 'show_overdue_jobs':
      return {
        generatedAt,
        intent: input.intent,
        isTruncated: input.isTruncated,
        items: attentionItems
          .filter((item) => item.attentionReasons.includes('overdue'))
          .slice(0, OPERATIONS_ATTENTION_LIMIT),
        sourceJobLimit: input.sourceJobLimit,
      }
    case 'show_jobs_requiring_attention':
      return {
        generatedAt,
        intent: input.intent,
        isTruncated: input.isTruncated,
        items: attentionItems.slice(0, OPERATIONS_ATTENTION_LIMIT),
        sourceJobLimit: input.sourceJobLimit,
      }
    case 'show_workload_distribution':
      return {
        employeeIsTruncated: input.employeeIsTruncated ?? false,
        employees: buildOperationsWorkloadDistribution(
          input.employees ?? [],
          input.jobs,
        ).slice(0, OPERATIONS_WORKLOAD_LIMIT),
        generatedAt,
        intent: input.intent,
        isTruncated: input.isTruncated,
        note:
          'No organization workload threshold is configured. Employees are ranked by active assigned and in-progress job count.',
        sourceEmployeeLimit: input.sourceEmployeeLimit ?? 0,
        sourceJobLimit: input.sourceJobLimit,
      }
    case 'summarize_open_operations':
      return {
        attentionItems: attentionItems.slice(0, OPERATIONS_ATTENTION_LIMIT),
        counts: buildOperationsCounts(input.jobs, input.nowMillis),
        generatedAt,
        intent: input.intent,
        isTruncated: input.isTruncated,
        sourceJobLimit: input.sourceJobLimit,
      }
    case 'explain_job_attention_flag': {
      const job = input.jobs[0]
      if (!job) {
        throw new Error('A trusted job is required for an attention explanation.')
      }

      return {
        generatedAt,
        intent: input.intent,
        isTruncated: false,
        item: toAttentionItem(job, input.nowMillis),
        sourceJobLimit: 1,
      }
    }
  }
}

export function buildGroundedOperationsSummary(
  result: OperationsToolResult,
): string[] {
  switch (result.intent) {
    case 'show_urgent_unassigned_jobs':
      return summarizeItems(
        result.items,
        'No urgent unassigned jobs were found.',
        'urgent unassigned job',
        result.isTruncated,
        result.sourceJobLimit,
      )
    case 'show_overdue_jobs':
      return summarizeItems(
        result.items,
        'No overdue jobs were found.',
        'overdue job',
        result.isTruncated,
        result.sourceJobLimit,
      )
    case 'show_jobs_requiring_attention':
      return summarizeItems(
        result.items,
        'No jobs currently require attention.',
        'job requiring attention',
        result.isTruncated,
        result.sourceJobLimit,
      )
    case 'show_workload_distribution':
      return result.employees.length === 0
        ? [
            `No active employee workload was found${formatWorkloadScope(result)}.`,
            result.note,
          ]
        : [
            `Workload distribution for ${result.employees.length} employee${result.employees.length === 1 ? '' : 's'}${formatWorkloadScope(result)}.`,
            ...result.employees.map(
              (employee) =>
                `${employee.displayName}: ${employee.activeJobCount} active job${employee.activeJobCount === 1 ? '' : 's'} (${employee.assignedJobCount} assigned, ${employee.inProgressJobCount} in progress).`,
            ),
            result.note,
          ]
    case 'summarize_open_operations': {
      const prefix = result.isTruncated
        ? `Within the latest ${result.sourceJobLimit} active jobs`
        : 'Current operations'
      return [
        `${prefix}: ${result.counts.open} open, ${result.counts.assigned} assigned, ${result.counts.inProgress} in progress, ${result.counts.urgentUnassigned} urgent unassigned, and ${result.counts.overdue} overdue.`,
      ]
    }
    case 'explain_job_attention_flag':
      return result.item.attentionReasons.length === 0
        ? [`${result.item.title} is not currently flagged for attention.`]
        : [
            `${result.item.title} is flagged because ${formatAttentionReasons(result.item.attentionReasons)}.`,
          ]
  }
}

function formatWorkloadScope(result: OperationsWorkloadResult) {
  const sources: string[] = []
  if (result.isTruncated) {
    sources.push(`the latest ${result.sourceJobLimit} active jobs`)
  }
  if (result.employeeIsTruncated) {
    sources.push(
      `a bounded set of ${result.sourceEmployeeLimit} active employees`,
    )
  }

  return sources.length > 0 ? ` based on ${sources.join(' and ')}` : ''
}

function toAttentionItem(
  job: OperationsJobInput,
  nowMillis: number,
): OperationsAttentionItem {
  return {
    assignedEmployeeCount: job.assignedEmployeeIds.length,
    attentionReasons: getOperationsAttentionReasons(job, nowMillis),
    dueDate:
      job.dueAtMillis === null ? null : new Date(job.dueAtMillis).toISOString(),
    jobId: job.id,
    priority: job.priority,
    status: job.status,
    title: job.title,
  }
}

function buildOperationsCounts(
  jobs: OperationsJobInput[],
  nowMillis: number,
): OperationsCounts {
  return jobs.reduce<OperationsCounts>(
    (counts, job) => {
      if (job.status === 'draft') counts.draft += 1
      if (job.status === 'open') counts.open += 1
      if (job.status === 'assigned') counts.assigned += 1
      if (job.status === 'in_progress') counts.inProgress += 1
      if (isUrgentUnassignedOperation(job)) counts.urgentUnassigned += 1
      if (isOverdueOperation(job, nowMillis)) counts.overdue += 1
      return counts
    },
    {
      assigned: 0,
      draft: 0,
      inProgress: 0,
      open: 0,
      overdue: 0,
      urgentUnassigned: 0,
    },
  )
}

export function buildOperationsWorkloadDistribution(
  employees: OperationsEmployeeInput[],
  jobs: OperationsJobInput[],
) {
  return employees
    .map((employee): OperationsWorkloadItem => {
      const assignedJobs = jobs.filter(
        (job) =>
          job.isActive && job.assignedEmployeeIds.includes(employee.id),
      )
      const assignedJobCount = assignedJobs.filter(
        (job) => job.status === 'assigned',
      ).length
      const inProgressJobCount = assignedJobs.filter(
        (job) => job.status === 'in_progress',
      ).length

      return {
        activeJobCount: assignedJobCount + inProgressJobCount,
        assignedJobCount,
        displayName: employee.displayName,
        employeeId: employee.id,
        inProgressJobCount,
      }
    })
    .sort(
      (first, second) =>
        second.activeJobCount - first.activeJobCount ||
        first.displayName.localeCompare(second.displayName) ||
        first.employeeId.localeCompare(second.employeeId),
    )
}

function compareAttentionItems(
  first: OperationsAttentionItem,
  second: OperationsAttentionItem,
) {
  return (
    attentionRank(first) - attentionRank(second) ||
    compareNullableDates(first.dueDate, second.dueDate) ||
    first.title.localeCompare(second.title) ||
    first.jobId.localeCompare(second.jobId)
  )
}

function attentionRank(item: OperationsAttentionItem) {
  if (item.attentionReasons.includes('urgent_unassigned')) return 0
  if (item.attentionReasons.includes('in_progress_overdue')) return 1
  if (item.attentionReasons.includes('assigned_not_started_after_due')) return 2
  return 3
}

function compareNullableDates(first: string | null, second: string | null) {
  if (first === second) return 0
  if (first === null) return 1
  if (second === null) return -1
  return first.localeCompare(second)
}

function summarizeItems(
  items: OperationsAttentionItem[],
  emptyMessage: string,
  singularLabel: string,
  isTruncated: boolean,
  sourceJobLimit: number,
) {
  if (items.length === 0) {
    return [
      isTruncated
        ? `${emptyMessage.replace(/\.$/, '')} within the latest ${sourceJobLimit} active jobs.`
        : emptyMessage,
    ]
  }

  return [
    `${isTruncated ? `Within the latest ${sourceJobLimit} active jobs, showing` : 'Showing'} ${items.length} ${singularLabel}${items.length === 1 ? '' : 's'}.`,
    ...items.map(
      (item) =>
        `${item.title}: ${formatAttentionReasons(item.attentionReasons)}.`,
    ),
  ]
}

function formatAttentionReasons(reasons: OperationsAttentionReason[]) {
  return reasons
    .filter(
      (reason) =>
        reason !== 'overdue' ||
        (!reasons.includes('assigned_not_started_after_due') &&
          !reasons.includes('in_progress_overdue')),
    )
    .map((reason) => {
      switch (reason) {
        case 'urgent_unassigned':
          return 'it is high priority and unassigned'
        case 'overdue':
          return 'it is overdue'
        case 'assigned_not_started_after_due':
          return 'it is assigned, not started, and past due'
        case 'in_progress_overdue':
          return 'it is in progress and past due'
      }
    })
    .join('; ')
}
