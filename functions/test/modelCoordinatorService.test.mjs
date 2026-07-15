import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createModelCoordinatorService,
  toPublicModelError,
} from '../lib/functions/src/model/modelCoordinatorService.js'
import { ModelProviderError } from '../lib/functions/src/model/modelProvider.js'
import { createGeminiModelProvider } from '../lib/functions/src/model/modelProvider.js'

const validProviderDraft = {
  customerName: '',
  customerPhone: '',
  description: 'The air conditioner is not cooling.',
  dueDateText: '',
  locationText: '',
  missingFields: ['customerName', 'customerPhone', 'serviceAddress'],
  priority: 'high',
  requiredSkills: ['AC Repair'],
  serviceAddress: '',
  serviceType: 'AC Repair',
  title: 'Air conditioner not cooling',
  uncertainFields: ['priority'],
  warnings: ['Manager must review every field before preparing a proposal.'],
}

const validDraft = {
  ...validProviderDraft,
  dueDate: null,
  location: '',
  priority: 'High',
  warnings: [
    ...validProviderDraft.warnings,
    'Due date is missing or could not be resolved safely.',
  ],
}
delete validDraft.dueDateText
delete validDraft.locationText

function fakeProvider(result) {
  return {
    async generateJson() {
      if (result instanceof Error) {
        throw result
      }

      return result
    },
  }
}

test('validates structured intent classifications from a fake provider', async () => {
  const service = createModelCoordinatorService(
    fakeProvider({
      confidence: 0.91,
      intent: 'show_urgent_unassigned_jobs',
      requiresClarification: false,
    }),
  )

  assert.deepEqual(
    await service.classifyIntent({
      message: 'Which urgent work is waiting?',
      uiContext: 'dashboard',
    }),
    {
      confidence: 0.91,
      intent: 'show_urgent_unassigned_jobs',
      requiresClarification: false,
    },
  )
})

test('accepts only the fixed workforce intent enum from a fake provider', async () => {
  const service = createModelCoordinatorService(
    fakeProvider({
      confidence: 0.93,
      intent: 'compare_top_candidates',
      requiresClarification: false,
    }),
  )

  assert.deepEqual(
    await service.classifyIntent({
      message: 'Compare the strongest candidates for this job.',
      uiContext: 'job_details',
    }),
    {
      confidence: 0.93,
      intent: 'compare_top_candidates',
      requiresClarification: false,
    },
  )
})

test('rejects malformed classifications and invalid draft fields', async () => {
  const malformedClassification = createModelCoordinatorService(
    fakeProvider({ intent: 'unknown_tool' }),
  )
  const invalidDraft = createModelCoordinatorService(
    fakeProvider({ ...validProviderDraft, priority: 'Critical' }),
  )

  await assert.rejects(
    malformedClassification.classifyIntent({
      message: 'Show operational work.',
      uiContext: 'dashboard',
    }),
    (error) => error instanceof ModelProviderError && error.kind === 'invalid_response',
  )
  await assert.rejects(
    invalidDraft.draftJob('The air conditioner is not cooling.'),
    (error) => error instanceof ModelProviderError && error.kind === 'invalid_response',
  )
})

test('returns editable drafts with missing fields instead of fabricated values', async () => {
  const service = createModelCoordinatorService(fakeProvider(validProviderDraft))

  assert.deepEqual(
    await service.draftJob('The air conditioner is not cooling.'),
    validDraft,
  )
})

test('normalizes safe draft variations while preserving the public contract', async () => {
  const service = createModelCoordinatorService(
    fakeProvider({
      ...validProviderDraft,
      customerPhone: '+1  555  0100',
      dueDateText: '2026-08-01T09:30:00Z',
      locationText: 'Test District',
      missingFields: ['dueDateText', 'DueDateText', 'locationText'],
      priority: 'uRgEnT',
      requiredSkills: ['AC Repair', 'ac repair', 'Diagnostics'],
      warnings: ['Review date', 'review date'],
    }),
  )

  const result = await service.draftJob('Synthetic request with an explicit date.')
  assert.equal(result.customerPhone, '+1 555 0100')
  assert.equal(result.dueDate, '2026-08-01T09:30:00Z')
  assert.equal(result.location, 'Test District')
  assert.equal(result.priority, 'Urgent')
  assert.deepEqual(result.missingFields, ['dueDate', 'location'])
  assert.deepEqual(result.requiredSkills, ['AC Repair', 'Diagnostics'])
  assert.deepEqual(result.warnings, ['Review date'])
})

test('accepts empty optional draft fields and does not fabricate unknown values', async () => {
  const service = createModelCoordinatorService(
    fakeProvider({
      ...validProviderDraft,
      description: '',
      missingFields: ['customerName', 'customerPhone', 'serviceAddress', 'dueDateText'],
      priority: '',
      requiredSkills: [],
      serviceType: '',
      title: '',
      uncertainFields: [],
      warnings: [],
    }),
  )

  const result = await service.draftJob('A deliberately incomplete synthetic request.')
  assert.equal(result.dueDate, null)
  assert.equal(result.priority, '')
  assert.equal(result.title, '')
  assert.deepEqual(result.requiredSkills, [])
  assert.deepEqual(result.warnings, [
    'Due date is missing or could not be resolved safely.',
  ])
  assert.deepEqual(result.missingFields, [
    'customerName',
    'customerPhone',
    'serviceAddress',
    'dueDate',
  ])
})

test('reports only the field when draft post-validation fails', async () => {
  const service = createModelCoordinatorService(
    fakeProvider({ ...validProviderDraft, dueDateText: 'tomorrow afternoon' }),
  )

  await assert.rejects(
    service.draftJob('Synthetic request.'),
    (error) =>
      error instanceof ModelProviderError &&
      error.diagnostics.code === 'draft_validation_failed' &&
      error.diagnostics.responseLength > 0 &&
      assert.deepEqual(error.diagnostics.validationFields, ['dueDateText']) === undefined,
  )
})

test('maps provider timeout, quota, and temporary failures to safe public errors', () => {
  assert.deepEqual(
    toPublicModelError(new ModelProviderError('timeout', 'internal detail')),
    {
      code: 'deadline-exceeded',
      message: 'AI drafting timed out. Complete the form manually.',
    },
  )
  assert.deepEqual(
    toPublicModelError(new ModelProviderError('quota_exhausted', 'internal detail')),
    {
      code: 'resource-exhausted',
      message: 'AI drafting is temporarily unavailable. Complete the form manually.',
    },
  )
  assert.deepEqual(toPublicModelError(new Error('provider detail')), {
    code: 'unavailable',
    message: 'The drafting service is temporarily unavailable. Complete the form manually.',
  })
})

test('uses bounded retries and never exposes missing Gemini configuration', async () => {
  let attempts = 0
  const provider = createGeminiModelProvider('test-key', async () => {
    attempts += 1
    return { ok: false, status: 503, text: async () => '' }
  })
  const unconfiguredProvider = createGeminiModelProvider(undefined)

  await assert.rejects(
    provider.generateJson({
      prompt: 'request',
      responseSchema: {},
      systemInstruction: 'instruction',
    }),
    (error) => error instanceof ModelProviderError && error.kind === 'temporary_failure',
  )
  assert.equal(attempts, 2)
  await assert.rejects(
    unconfiguredProvider.generateJson({
      prompt: 'request',
      responseSchema: {},
      systemInstruction: 'instruction',
    }),
    (error) =>
      error instanceof ModelProviderError && error.kind === 'missing_configuration',
  )
})
