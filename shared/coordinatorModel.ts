import type { JobPriority } from './jobCreation.js'
import { OPERATIONS_INTENTS } from './operationsIntelligence.js'

export const MODEL_COORDINATOR_INTENTS = [
  ...OPERATIONS_INTENTS,
  'recommend_employee_for_job',
  'explain_recommendation',
  'compare_top_candidates',
  'prepare_job_draft',
  'unsupported',
] as const

export type ModelCoordinatorIntent =
  (typeof MODEL_COORDINATOR_INTENTS)[number]

export type ModelIntentClassification = {
  clarificationReason?: string
  confidence: number
  intent: ModelCoordinatorIntent
  requiresClarification: boolean
}

export type ModelJobDraft = {
  customerName: string
  customerPhone: string
  description: string
  dueDate: string | null
  location: string
  missingFields: string[]
  priority: JobPriority | ''
  requiredSkills: string[]
  serviceAddress: string
  serviceType: string
  title: string
  uncertainFields: string[]
  warnings: string[]
}

export function isModelCoordinatorIntent(
  value: unknown,
): value is ModelCoordinatorIntent {
  return (
    typeof value === 'string' &&
    MODEL_COORDINATOR_INTENTS.includes(value as ModelCoordinatorIntent)
  )
}
