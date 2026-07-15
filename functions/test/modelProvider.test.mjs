import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildGeminiRequestBody,
  createGeminiModelProvider,
  ModelProviderError,
} from '../lib/functions/src/model/modelProvider.js'

const request = {
  prompt: 'Synthetic request',
  responseSchema: { properties: { title: { type: 'string' } }, type: 'object' },
  systemInstruction: 'Return JSON only.',
}

function response(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => typeof body === 'string' ? body : JSON.stringify(body),
  }
}

test('builds the exact structured Gemini generateContent request body', () => {
  assert.deepEqual(buildGeminiRequestBody(request), {
    contents: [{ parts: [{ text: 'Synthetic request' }] }],
    generationConfig: {
      candidateCount: 1,
      responseMimeType: 'application/json',
      responseSchema: request.responseSchema,
      temperature: 0,
    },
    systemInstruction: { parts: [{ text: 'Return JSON only.' }] },
  })
})

test('parses text across response parts and ignores thought parts', async () => {
  const provider = createGeminiModelProvider('test-key', async () =>
    response({
      candidates: [{
        content: { parts: [
          { text: 'internal', thought: true, thoughtSignature: 'signature' },
          { text: '{"title":' },
          { text: '"Safe draft"}', thoughtSignature: 'signature' },
        ] },
        finishReason: 'STOP',
      }],
    }),
  )

  assert.deepEqual(await provider.generateJson(request), { title: 'Safe draft' })
})

test('normalizes schema rejection without exposing the provider response', async () => {
  const provider = createGeminiModelProvider('test-key', async () =>
    response({ error: { message: 'sensitive provider detail' } }, 400),
  )

  await assert.rejects(
    provider.generateJson(request),
    (error) =>
      error instanceof ModelProviderError &&
      error.kind === 'invalid_response' &&
      error.diagnostics.code === 'schema_or_request_rejected' &&
      error.diagnostics.httpStatus === 400 &&
      error.message === 'Gemini rejected the structured request.',
  )
})

test('normalizes a missing configured model separately from other HTTP failures', async () => {
  const provider = createGeminiModelProvider('test-key', async () =>
    response({ error: { message: 'provider detail' } }, 404),
  )

  await assert.rejects(
    provider.generateJson(request),
    (error) =>
      error instanceof ModelProviderError &&
      error.diagnostics.code === 'model_not_found' &&
      error.diagnostics.httpStatus === 404,
  )
})

test('reports missing candidates and malformed JSON with normalized codes', async () => {
  const missingCandidate = createGeminiModelProvider('test-key', async () =>
    response({ candidates: [] }),
  )
  const malformedJson = createGeminiModelProvider('test-key', async () =>
    response({ candidates: [{ content: { parts: [{ text: '{bad json' }] }, finishReason: 'STOP' }] }),
  )

  await assert.rejects(
    missingCandidate.generateJson(request),
    (error) => error instanceof ModelProviderError && error.diagnostics.code === 'missing_candidate',
  )
  await assert.rejects(
    malformedJson.generateJson(request),
    (error) => error instanceof ModelProviderError && error.diagnostics.code === 'invalid_json',
  )
})

test('reports non-stop finish reasons without returning partial JSON', async () => {
  const provider = createGeminiModelProvider('test-key', async () =>
    response({
      candidates: [{
        content: { parts: [{ text: '{"title":"partial"}' }] },
        finishReason: 'MAX_TOKENS',
      }],
    }),
  )

  await assert.rejects(
    provider.generateJson(request),
    (error) =>
      error instanceof ModelProviderError &&
      error.diagnostics.code === 'finish_reason' &&
      error.diagnostics.finishReason === 'MAX_TOKENS',
  )
})
