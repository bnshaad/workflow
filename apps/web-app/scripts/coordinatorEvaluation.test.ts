import assert from 'node:assert/strict'
import test from 'node:test'

import {
  COORDINATOR_EVALUATION_CATEGORIES,
  coordinatorEvaluationCorpus,
  type CoordinatorEvaluationCorpus,
} from './coordinatorEvaluationCorpus.ts'
import {
  runCoordinatorEvaluation,
  validateCoordinatorEvaluationCorpus,
} from './coordinatorEvaluationRunner.ts'

test('the versioned corpus covers every controlled evaluation category', () => {
  validateCoordinatorEvaluationCorpus(coordinatorEvaluationCorpus)

  assert.equal(coordinatorEvaluationCorpus.cases.length, 35)
  assert.deepEqual(
    [...new Set(coordinatorEvaluationCorpus.cases.map(({ category }) => category))].sort(),
    [...COORDINATOR_EVALUATION_CATEGORIES].sort(),
  )
  assert.equal(
    coordinatorEvaluationCorpus.cases.every(({ requiresNoWrite }) => requiresNoWrite),
    true,
  )
})

test('the corpus validator rejects duplicate IDs, intents, and tools', () => {
  const duplicateCorpus = structuredClone(
    coordinatorEvaluationCorpus,
  ) as CoordinatorEvaluationCorpus
  duplicateCorpus.cases[1].id = duplicateCorpus.cases[0].id
  assert.throws(
    () => validateCoordinatorEvaluationCorpus(duplicateCorpus),
    /Duplicate coordinator evaluation case ID/,
  )

  const invalidIntentCorpus = structuredClone(
    coordinatorEvaluationCorpus,
  ) as CoordinatorEvaluationCorpus
  invalidIntentCorpus.cases[0].expectedIntent = 'new_unsupported_intent' as never
  assert.throws(
    () => validateCoordinatorEvaluationCorpus(invalidIntentCorpus),
    /unsupported expected intent/,
  )

  const invalidToolCorpus = structuredClone(
    coordinatorEvaluationCorpus,
  ) as CoordinatorEvaluationCorpus
  invalidToolCorpus.cases[0].expectedTool = 'delete_jobs'
  assert.throws(
    () => validateCoordinatorEvaluationCorpus(invalidToolCorpus),
    /unsupported expected tool/,
  )
})

test('the fake-provider evaluation passes routing, grounding, and no-write checks', async () => {
  const report = await runCoordinatorEvaluation(coordinatorEvaluationCorpus)

  assert.equal(report.metrics.controlledFunctionalEvaluation, true)
  assert.equal(report.metrics.totalCases, 35)
  assert.equal(report.metrics.passedCases, 35)
  assert.equal(report.metrics.intentRoutingPassRate, 1)
  assert.equal(report.metrics.unsupportedRequestRejectionRate, 1)
  assert.equal(report.metrics.deterministicBypassPassRate, 1)
  assert.equal(report.metrics.correctToolSelectionRate, 1)
  assert.equal(report.metrics.groundingComplianceRate, 1)
  assert.equal(report.metrics.noWriteSafetyRate, 1)
  assert.equal(report.metrics.responseCompletenessRate, 1)
  assert.equal(report.cases.every(({ actualToolCalls }) => actualToolCalls <= 1), true)
  assert.equal(
    report.cases
      .filter(({ id }) => id.startsWith('ops-exact-'))
      .every(({ actualModelCalls }) => actualModelCalls === 0),
    true,
  )
  assert.equal(
    report.cases
      .filter(({ id }) => id.startsWith('ops-ambiguous-'))
      .every(({ actualModelCalls }) => actualModelCalls <= 1),
    true,
  )
  assert.equal(
    report.cases
      .filter(({ deterministicBypassExpected }) => deterministicBypassExpected)
      .every(({ actualClassifierCalls }) => actualClassifierCalls === 0),
    true,
  )
  assert.equal(
    report.cases
      .filter(({ id }) => id.startsWith('mutation-'))
      .every(
        ({ actualIntent, actualToolCalls, unsupportedRejectionPassed }) =>
          actualIntent === null &&
          actualToolCalls === 0 &&
          unsupportedRejectionPassed,
      ),
    true,
  )
  const classifierFailure = report.cases.find(
    ({ id }) => id === 'boundary-classifier-failure',
  )
  assert.equal(classifierFailure?.actualOutcome, 'safe_fallback')
  assert.equal(classifierFailure?.actualToolCalls, 0)
  assert.equal(classifierFailure?.passed, true)
})
