import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createCoordinatorTelemetryEvent,
  type CoordinatorTelemetryEvent,
} from '../src/services/coordinator/coordinatorTelemetry.ts'

const baseEvent: CoordinatorTelemetryEvent = {
  correlationId: 'evaluation-case-1',
  durationMs: 12,
  groundingStatus: 'passed',
  modelCallCount: 1,
  normalizedError: 'none',
  outcome: 'success',
  routeSource: 'model',
  toolCallCount: 1,
  toolName: 'get_operations_insight',
  validatedIntent: 'show_overdue_jobs',
  writeAttempted: false,
}

test('telemetry keeps only bounded structured coordinator fields', () => {
  const event = createCoordinatorTelemetryEvent({
    ...baseEvent,
    correlationId: 'Customer Name +91 90000 00000',
    durationMs: Number.POSITIVE_INFINITY,
    modelCallCount: 99,
    toolCallCount: -4,
    toolName: 'delete-jobs Customer Name',
    validatedIntent: 'free form customer request',
  })

  assert.deepEqual(event, {
    ...baseEvent,
    correlationId: 'redacted-invalid-id',
    durationMs: 0,
    modelCallCount: 1,
    toolCallCount: 0,
    toolName: null,
    validatedIntent: null,
  })
  assert.doesNotMatch(JSON.stringify(event), /Customer Name|90000|customer request/)
})
