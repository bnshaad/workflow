import { isModelCoordinatorIntent } from '../../../../../shared/coordinatorModel.ts'

export const COORDINATOR_TELEMETRY_EVENT = 'workflow_coordinator_execution'

export const COORDINATOR_ERROR_CATEGORIES = [
  'none',
  'classification_failed',
  'grounding_failed',
  'invalid_model_output',
  'low_confidence',
  'missing_context',
  'permission_denied',
  'timeout',
  'tool_failed',
  'unsupported',
  'validation_failed',
] as const

export type CoordinatorErrorCategory =
  (typeof COORDINATOR_ERROR_CATEGORIES)[number]

export type CoordinatorTelemetryEvent = {
  correlationId: string
  durationMs: number
  groundingStatus:
    | 'failed'
    | 'not_applicable'
    | 'not_evaluated'
    | 'passed'
  modelCallCount: number
  normalizedError: CoordinatorErrorCategory
  outcome: 'rejected' | 'safe_fallback' | 'success'
  routeSource: 'deterministic' | 'model'
  toolCallCount: number
  toolName: string | null
  validatedIntent: string | null
  writeAttempted: false
}

export function createCoordinatorTelemetryEvent(
  input: CoordinatorTelemetryEvent,
): CoordinatorTelemetryEvent {
  const validatedIntent = isModelCoordinatorIntent(input.validatedIntent)
    ? input.validatedIntent
    : null

  return {
    correlationId: normalizeCorrelationId(input.correlationId),
    durationMs: boundedCount(input.durationMs, 60_000),
    groundingStatus: input.groundingStatus,
    modelCallCount: boundedCount(input.modelCallCount, 1),
    normalizedError: input.normalizedError,
    outcome: input.outcome,
    routeSource: input.routeSource,
    toolCallCount: boundedCount(input.toolCallCount, 2),
    toolName: normalizeToolName(input.toolName),
    validatedIntent,
    writeAttempted: false,
  }
}

export function logCoordinatorTelemetry(event: CoordinatorTelemetryEvent) {
  console.info(
    COORDINATOR_TELEMETRY_EVENT,
    createCoordinatorTelemetryEvent(event),
  )
}

function normalizeCorrelationId(value: string) {
  return /^[A-Za-z0-9._-]{1,80}$/.test(value)
    ? value
    : 'redacted-invalid-id'
}

function normalizeToolName(value: string | null) {
  return value !== null && /^[a-z_]{1,64}$/.test(value) ? value : null
}

function boundedCount(value: number, maximum: number) {
  if (!Number.isFinite(value)) return 0
  return Math.min(maximum, Math.max(0, Math.round(value)))
}
