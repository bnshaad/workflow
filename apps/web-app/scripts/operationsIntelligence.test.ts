import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildGroundedOperationsSummary,
  buildOperationsToolResult,
  getOperationsAttentionReasons,
  isOverdueOperation,
  isUrgentUnassignedOperation,
  type OperationsJobInput,
} from '../../../shared/operationsIntelligence.ts'

const now = Date.parse('2026-07-15T12:00:00.000Z')

test('flags only active actionable high-priority jobs without assignments', () => {
  assert.equal(isUrgentUnassignedOperation(job()), true)
  assert.equal(
    isUrgentUnassignedOperation(
      job({ assignedEmployeeIds: ['employee-1'] }),
    ),
    false,
  )
  assert.equal(
    isUrgentUnassignedOperation(job({ status: 'completed' })),
    false,
  )
  assert.equal(
    isUrgentUnassignedOperation(job({ priority: 'Medium' })),
    false,
  )
})

test('overdue requires a due date and excludes completed and cancelled jobs', () => {
  assert.equal(isOverdueOperation(job(), now), true)
  assert.equal(isOverdueOperation(job({ dueAtMillis: null }), now), false)
  assert.equal(isOverdueOperation(job({ status: 'completed' }), now), false)
  assert.equal(isOverdueOperation(job({ status: 'cancelled' }), now), false)
  assert.equal(
    isOverdueOperation(job({ dueAtMillis: now + 1 }), now),
    false,
  )
})

test('uses only deterministic attention reasons', () => {
  assert.deepEqual(
    getOperationsAttentionReasons(
      job({ assignedEmployeeIds: ['employee-1'], status: 'in_progress' }),
      now,
    ),
    ['overdue', 'in_progress_overdue'],
  )
  assert.deepEqual(
    getOperationsAttentionReasons(
      job({ assignedEmployeeIds: ['employee-1'], status: 'assigned' }),
      now,
    ),
    ['overdue', 'assigned_not_started_after_due'],
  )
})

test('workload counts only assigned and in-progress active jobs and makes no overload claim', () => {
  const result = buildOperationsToolResult({
    employees: [{ displayName: 'Asha', id: 'employee-1' }],
    intent: 'show_workload_distribution',
    isTruncated: false,
    jobs: [
      job({ assignedEmployeeIds: ['employee-1'], id: 'assigned', status: 'assigned' }),
      job({ assignedEmployeeIds: ['employee-1'], id: 'started', status: 'in_progress' }),
      job({ assignedEmployeeIds: ['employee-1'], id: 'completed', status: 'completed' }),
      job({ assignedEmployeeIds: ['employee-1'], id: 'inactive', isActive: false }),
    ],
    nowMillis: now,
    sourceEmployeeLimit: 100,
    sourceJobLimit: 200,
  })

  assert.equal(result.intent, 'show_workload_distribution')
  assert.deepEqual(result.employees[0], {
    activeJobCount: 2,
    assignedJobCount: 1,
    displayName: 'Asha',
    employeeId: 'employee-1',
    inProgressJobCount: 1,
  })
  assert.doesNotMatch(
    buildGroundedOperationsSummary(result).join(' '),
    /overloaded|burnout|risk|predict/i,
  )
})

test('summary counts and attention list stay grounded and bounded', () => {
  const jobs = Array.from({ length: 14 }, (_, index) =>
    job({ id: `job-${index}`, title: `Repair ${index}` }),
  )
  const result = buildOperationsToolResult({
    intent: 'summarize_open_operations',
    isTruncated: false,
    jobs,
    nowMillis: now,
    sourceJobLimit: 200,
  })

  assert.equal(result.intent, 'summarize_open_operations')
  assert.equal(result.counts.open, 14)
  assert.equal(result.counts.urgentUnassigned, 14)
  assert.equal(result.counts.overdue, 14)
  assert.equal(result.attentionItems.length, 10)
  assert.match(buildGroundedOperationsSummary(result)[0], /14 open.*14 urgent unassigned.*14 overdue/)
  assert.doesNotMatch(
    buildGroundedOperationsSummary(result).join(' '),
    /likely|forecast|real-time|high risk/i,
  )
})

function job(overrides: Partial<OperationsJobInput> = {}): OperationsJobInput {
  return {
    assignedEmployeeIds: [],
    dueAtMillis: now - 1,
    id: 'job-1',
    isActive: true,
    priority: 'High',
    status: 'open',
    title: 'AC repair',
    ...overrides,
  }
}
