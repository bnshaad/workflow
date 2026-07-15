import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'

const LOCAL_PROJECT_ID = 'workflow-integration'
const secretPath = resolve('.secret.local')

if (process.env.CI) {
  fail('Local real-Gemini smoke testing is disabled in CI.')
}

if (process.env.WORKFLOW_USE_REAL_GEMINI !== 'true') {
  fail('Set WORKFLOW_USE_REAL_GEMINI=true to opt in to local real-Gemini testing.')
}

if (!existsSync(secretPath)) {
  fail('Create functions/.secret.local with GEMINI_API_KEY before running this command.')
}

const secretConfiguration = readFileSync(secretPath, 'utf8')
if (!/^GEMINI_API_KEY=\S+$/m.test(secretConfiguration)) {
  fail('functions/.secret.local must contain a non-empty GEMINI_API_KEY value.')
}

const build = spawnSync('npm', ['run', 'build'], {
  env: process.env,
  stdio: 'inherit',
})
if (build.status !== 0) {
  process.exit(build.status ?? 1)
}

const smoke = spawnSync(
  'firebase',
  [
    'emulators:exec',
    '--only',
    'auth,firestore,functions',
    '--project',
    LOCAL_PROJECT_ID,
    'node scripts/localAiSmokeTest.mjs',
  ],
  {
    env: {
      ...process.env,
      FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
      FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
      FUNCTIONS_EMULATOR_HOST: '127.0.0.1:5001',
      GCLOUD_PROJECT: LOCAL_PROJECT_ID,
      GOOGLE_CLOUD_PROJECT: LOCAL_PROJECT_ID,
      WORKFLOW_USE_REAL_GEMINI: 'true',
    },
    stdio: 'inherit',
  },
)

removeGeneratedLogs()
process.exit(smoke.status ?? 1)

function removeGeneratedLogs() {
  for (const path of ['firebase-debug.log', 'firestore-debug.log']) {
    rmSync(resolve(path), { force: true })
  }
}

function fail(message) {
  console.error(message)
  process.exit(1)
}
