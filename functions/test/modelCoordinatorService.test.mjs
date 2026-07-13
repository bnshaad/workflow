import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createModelCoordinatorService,
  toPublicModelError,
} from '../lib/functions/src/model/modelCoordinatorService.js'
import { ModelProviderError } from '../lib/functions/src/model/modelProvider.js'
import { createGeminiModelProvider } from '../lib/functions/src/model/modelProvider.js'

const validDraft = {
  customerName: '',
  customerPhone: '',
  description: 'The air conditioner is not cooling.',
  dueDate: null,
  location: '',
  missingFields: ['customerName', 'customerPhone', 'serviceAddress'],
  priority: 'High',
  requiredSkills: ['AC Repair'],
  serviceAddress: '',
  serviceType: 'AC Repair',
  title: 'Air conditioner not cooling',
  uncertainFields: ['priority'],
  warnings: ['Manager must review every field before preparing a proposal.'],
}

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

test('rejects malformed classifications and invalid draft fields', async () => {
  const malformedClassification = createModelCoordinatorService(
    fakeProvider({ intent: 'unknown_tool' }),
  )
  const invalidDraft = createModelCoordinatorService(
    fakeProvider({ ...validDraft, priority: 'Critical' }),
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
  const service = createModelCoordinatorService(fakeProvider(validDraft))

  assert.deepEqual(
    await service.draftJob('The air conditioner is not cooling.'),
    validDraft,
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
    return { ok: false, status: 503, json: async () => ({}) }
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
