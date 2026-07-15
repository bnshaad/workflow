import assert from 'node:assert/strict'
import test from 'node:test'
import { shouldReadGeminiSecret } from '../lib/functions/src/model/modelRuntimeConfiguration.js'

test('local emulator real-Gemini access is opt-in and cloud access remains Secret-bound', () => {
  assert.equal(
    shouldReadGeminiSecret({ FUNCTIONS_EMULATOR: 'true' }),
    false,
  )
  assert.equal(
    shouldReadGeminiSecret({
      FUNCTIONS_EMULATOR: 'true',
      WORKFLOW_USE_REAL_GEMINI: 'true',
    }),
    true,
  )
  assert.equal(shouldReadGeminiSecret({}), true)
})
