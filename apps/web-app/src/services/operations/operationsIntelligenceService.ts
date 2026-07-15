import { httpsCallable } from 'firebase/functions'
import { firebaseFunctions } from '@/config'
import { canViewDashboard } from '@/permissions'
import { requireActiveProfile } from '@/services/common'
import type { UserProfile } from '@/types'
import {
  OPERATIONS_ATTENTION_LIMIT,
  OPERATIONS_ATTENTION_REASONS,
  OPERATIONS_WORKLOAD_LIMIT,
  isOperationsIntent,
  type OperationsIntent,
  type OperationsToolResult,
} from '../../../../../shared/operationsIntelligence.ts'

export class OperationsIntelligenceError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OperationsIntelligenceError'
  }
}

export const operationsIntelligenceService = {
  async getInsight(
    profile: UserProfile,
    intent: OperationsIntent,
    jobId?: string,
  ): Promise<OperationsToolResult> {
    const activeProfile = requireActiveProfile(profile)
    if (!canViewDashboard(activeProfile)) {
      throw new OperationsIntelligenceError(
        'You do not have permission to view operational insights.',
      )
    }

    const callable = httpsCallable<
      { intent: OperationsIntent; jobId?: string },
      OperationsToolResult
    >(firebaseFunctions, 'getOperationsInsight')

    try {
      const result = await callable({ intent, ...(jobId ? { jobId } : {}) })
      assertOperationsToolResult(result.data, intent)
      return result.data
    } catch (error) {
      if (error instanceof OperationsIntelligenceError) throw error

      throw new OperationsIntelligenceError(
        'Operational insight could not be loaded safely.',
      )
    }
  },
}

function assertOperationsToolResult(
  value: unknown,
  expectedIntent: OperationsIntent,
): asserts value is OperationsToolResult {
  if (!value || typeof value !== 'object') invalidResult()

  const result = value as OperationsToolResult
  if (
    !isOperationsIntent(result.intent) ||
    result.intent !== expectedIntent ||
    typeof result.generatedAt !== 'string' ||
    typeof result.isTruncated !== 'boolean' ||
    typeof result.sourceJobLimit !== 'number'
  ) {
    invalidResult()
  }

  if ('items' in result) {
    if (
      !Array.isArray(result.items) ||
      result.items.length > OPERATIONS_ATTENTION_LIMIT ||
      result.items.some((item) => !isAttentionItem(item))
    ) {
      invalidResult()
    }
    return
  }

  if (result.intent === 'show_workload_distribution') {
    if (
      !Array.isArray(result.employees) ||
      result.employees.length > OPERATIONS_WORKLOAD_LIMIT ||
      result.employees.some(
        (employee) =>
          typeof employee.employeeId !== 'string' ||
          typeof employee.displayName !== 'string' ||
          typeof employee.activeJobCount !== 'number' ||
          typeof employee.assignedJobCount !== 'number' ||
          typeof employee.inProgressJobCount !== 'number',
      ) ||
      typeof result.note !== 'string' ||
      typeof result.employeeIsTruncated !== 'boolean' ||
      typeof result.sourceEmployeeLimit !== 'number'
    ) {
      invalidResult()
    }
    return
  }

  if (result.intent === 'summarize_open_operations') {
    if (
      !Array.isArray(result.attentionItems) ||
      result.attentionItems.length > OPERATIONS_ATTENTION_LIMIT ||
      result.attentionItems.some((item) => !isAttentionItem(item)) ||
      !result.counts ||
      Object.values(result.counts).some((count) => typeof count !== 'number')
    ) {
      invalidResult()
    }
    return
  }

  if (
    result.intent !== 'explain_job_attention_flag' ||
    !isAttentionItem(result.item)
  ) {
    invalidResult()
  }
}

function isAttentionItem(value: unknown) {
  if (!value || typeof value !== 'object') return false
  const item = value as Record<string, unknown>
  return (
    typeof item.jobId === 'string' &&
    typeof item.title === 'string' &&
    typeof item.status === 'string' &&
    typeof item.priority === 'string' &&
    (item.dueDate === null || typeof item.dueDate === 'string') &&
    typeof item.assignedEmployeeCount === 'number' &&
    Array.isArray(item.attentionReasons) &&
    item.attentionReasons.every(
      (reason) =>
        typeof reason === 'string' &&
        OPERATIONS_ATTENTION_REASONS.includes(
          reason as (typeof OPERATIONS_ATTENTION_REASONS)[number],
        ),
    )
  )
}

function invalidResult(): never {
  throw new OperationsIntelligenceError(
    'The operations tool returned invalid data.',
  )
}
