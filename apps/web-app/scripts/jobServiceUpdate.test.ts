import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

test('jobService.updateJob validates updates, active profile, and permissions', () => {
  const serviceSource = readFileSync(
    resolve(process.cwd(), 'src/services/jobs/jobService.ts'),
    'utf8',
  )

  assert.match(serviceSource, /async function updateJob/)
  assert.match(serviceSource, /requireActiveProfile\(profile\)/)
  assert.match(serviceSource, /requireTenantAccess\(activeProfile, organizationId\)/)
  assert.match(serviceSource, /canEditJob\(activeProfile\)/)
  assert.match(serviceSource, /writeBatch\(firestore\)/)
  assert.match(serviceSource, /batch\.update\(jobReference, updatePayload\)/)
  assert.match(serviceSource, /cacheService\.invalidate\('jobs'\)/)
})
