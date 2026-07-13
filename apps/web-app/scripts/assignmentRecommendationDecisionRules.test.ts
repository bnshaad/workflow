import test from 'node:test'
import assert from 'node:assert/strict'

import {
  ASSIGNMENT_OVERRIDE_REASONS,
  buildRecommendationDecisionEvaluationMetrics,
  incrementOverrideReasonDistribution,
  validateRecommendationDecisionInput,
} from '../src/services/recommendations/assignmentRecommendationDecisionRules.ts'

test('accepting a recommendation requires the recommended employee', () => {
  const result = validateRecommendationDecisionInput({
    decision: 'accepted',
    recommendedEmployeeId: 'employee-1',
    selectedEmployeeId: 'employee-1',
  })

  assert.equal(result.isValid, true)
  assert.equal(result.normalizedOverrideReason, null)
})

test('accepting a different employee is rejected', () => {
  const result = validateRecommendationDecisionInput({
    decision: 'accepted',
    recommendedEmployeeId: 'employee-1',
    selectedEmployeeId: 'employee-2',
  })

  assert.equal(result.isValid, false)
  assert.match(result.errors.join(' '), /recommended employee/)
})

test('overriding requires a valid override reason', () => {
  const result = validateRecommendationDecisionInput({
    decision: 'overridden',
    recommendedEmployeeId: 'employee-1',
    selectedEmployeeId: 'employee-2',
  })

  assert.equal(result.isValid, false)
  assert.match(result.errors.join(' '), /override reason/)
})

test('overriding with a valid reason normalizes the decision metadata', () => {
  const result = validateRecommendationDecisionInput({
    decision: 'overridden',
    overrideReason: 'Other',
    overrideNote: '  Customer escalation coverage  ',
    recommendedEmployeeId: 'employee-1',
    selectedEmployeeId: 'employee-2',
  })

  assert.equal(result.isValid, true)
  assert.equal(result.normalizedOverrideReason, 'Other')
  assert.equal(result.normalizedOverrideNote, 'Customer escalation coverage')
})

test('override reason distribution supports evaluation-ready metrics', () => {
  const metrics = buildRecommendationDecisionEvaluationMetrics([
    { decision: 'accepted' },
    { decision: 'overridden' },
    { decision: 'overridden' },
  ])
  const distribution = incrementOverrideReasonDistribution(
    metrics.overrideReasonDistribution,
    'Workload balancing',
  )

  assert.equal(metrics.recommendationsGenerated, 3)
  assert.equal(metrics.recommendationsAccepted, 1)
  assert.equal(metrics.recommendationsOverridden, 2)
  assert.equal(metrics.acceptanceRate, 1 / 3)
  assert.equal(distribution['Workload balancing'], 1)
  assert.equal(ASSIGNMENT_OVERRIDE_REASONS.includes('Other'), true)
})
