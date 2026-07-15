import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { getApps, initializeApp as initializeAdminApp } from 'firebase-admin/app'
import { getAuth as getAdminAuth } from 'firebase-admin/auth'
import { getFirestore as getAdminFirestore, Timestamp } from 'firebase-admin/firestore'
import { initializeApp as initializeClientApp } from 'firebase/app'
import {
  connectAuthEmulator,
  getAuth,
  signInWithEmailAndPassword,
} from 'firebase/auth'
import {
  connectFunctionsEmulator,
  getFunctions,
  httpsCallable,
} from 'firebase/functions'

const PROJECT_ID = 'workflow-integration'
const SYNTHETIC_PASSWORD = 'LocalSmoke-Only-123!'
const protectedCollections = ['actionProposals', 'jobs', 'recommendations']

assertLocalOnlyEnvironment()

const suffix = randomUUID()
const uid = `local-ai-smoke-${suffix}`
const email = `${uid}@example.test`
const adminApp =
  getApps().find((app) => app.name === 'local-ai-smoke-admin') ??
  initializeAdminApp({ projectId: PROJECT_ID }, 'local-ai-smoke-admin')
const adminAuth = getAdminAuth(adminApp)
const adminFirestore = getAdminFirestore(adminApp)
const clientApp = initializeClientApp(
  { apiKey: 'local-emulator-only', projectId: PROJECT_ID },
  `local-ai-smoke-client-${suffix}`,
)
const clientAuth = getAuth(clientApp)
const functions = getFunctions(clientApp, 'asia-south1')

connectAuthEmulator(clientAuth, 'http://127.0.0.1:9099', {
  disableWarnings: true,
})
connectFunctionsEmulator(functions, '127.0.0.1', 5001)

const classify = httpsCallable(functions, 'classifyCoordinatorIntent')
const draft = httpsCallable(functions, 'draftJobFromRequest')
let userCreated = false
let profileCreated = false

try {
  await adminAuth.createUser({
    disabled: false,
    email,
    password: SYNTHETIC_PASSWORD,
    uid,
  })
  userCreated = true
  await adminFirestore.collection('users').doc(uid).set({
    activeTaskCount: 0,
    availability: 'available',
    createdAt: Timestamp.now(),
    displayName: 'Local AI Smoke Manager',
    email,
    id: uid,
    isActive: true,
    organizationId: 'local-ai-smoke-organization',
    performanceScore: 0,
    role: 'manager',
    skills: [],
    updatedAt: Timestamp.now(),
  })
  profileCreated = true
  await signInWithEmailAndPassword(clientAuth, email, SYNTHETIC_PASSWORD)

  const beforeCounts = await readProtectedCollectionCounts()
  const immediateAttention = await classify({
    message: 'What work needs immediate attention today?',
    uiContext: 'dashboard',
  })
  assert.equal(immediateAttention.data.intent, 'show_urgent_unassigned_jobs')
  assert.equal(immediateAttention.data.requiresClarification, false)

  const destructive = await classify({
    message: 'Delete all overdue jobs.',
    uiContext: 'jobs',
  })
  assert.equal(destructive.data.intent, 'unsupported')

  const workforceRecommendation = await classify({
    message: 'Who is the best technician for this job?',
    uiContext: 'job_details',
  })
  assert.equal(
    workforceRecommendation.data.intent,
    'recommend_employee_for_job',
  )

  const workforceComparison = await classify({
    message: 'Compare the top two employees for this job.',
    uiContext: 'job_details',
  })
  assert.equal(workforceComparison.data.intent, 'compare_top_candidates')

  const workforceExplanation = await classify({
    message: 'Why is Rahul recommended?',
    uiContext: 'job_details',
  })
  assert.equal(workforceExplanation.data.intent, 'explain_recommendation')

  const completeDraft = await draft({
    customerRequest:
      'Customer Fathima reported that the office AC in Kakkanad is leaking water. Contact number is 9876543210. Service is needed before 5 PM today.',
  })
  assert.match(completeDraft.data.customerName, /fathima/i)
  assert.match(completeDraft.data.customerPhone, /9876543210/)
  assert.match(
    `${completeDraft.data.location} ${completeDraft.data.serviceAddress}`,
    /kakkanad/i,
  )
  assert.equal(Array.isArray(completeDraft.data.uncertainFields), true)

  const incompleteDraft = await draft({
    customerRequest: 'AC problem. Send someone quickly.',
  })
  assert.equal(incompleteDraft.data.customerName, '')
  assert.equal(incompleteDraft.data.customerPhone, '')
  assert.equal(incompleteDraft.data.serviceAddress, '')
  assert.equal(Array.isArray(incompleteDraft.data.missingFields), true)
  assert.equal(incompleteDraft.data.missingFields.length > 0, true)

  const afterCounts = await readProtectedCollectionCounts()
  assert.deepEqual(afterCounts, beforeCounts)

  console.log('Local real-Gemini smoke test passed with synthetic data.')
  console.log(
    JSON.stringify(
      {
        completeDraftSummary: summarizeDraft(completeDraft.data),
        destructiveIntent: destructive.data.intent,
        immediateAttentionIntent: immediateAttention.data.intent,
        incompleteDraftSummary: summarizeDraft(incompleteDraft.data),
        protectedCollectionCounts: afterCounts,
        workforceIntents: [
          workforceRecommendation.data.intent,
          workforceComparison.data.intent,
          workforceExplanation.data.intent,
        ],
      },
      null,
      2,
    ),
  )
} finally {
  if (profileCreated) {
    await adminFirestore.collection('users').doc(uid).delete()
  }
  if (userCreated) {
    await adminAuth.deleteUser(uid)
  }
}

async function readProtectedCollectionCounts() {
  const entries = await Promise.all(
    protectedCollections.map(async (collectionName) => {
      const snapshot = await adminFirestore.collection(collectionName).get()
      return [collectionName, snapshot.size]
    }),
  )

  return Object.fromEntries(entries)
}

function summarizeDraft(draftValue) {
  const draft = draftValue && typeof draftValue === 'object' ? draftValue : {}
  return {
    arrayCounts: Object.fromEntries(
      ['missingFields', 'requiredSkills', 'uncertainFields', 'warnings'].map(
        (field) => [field, Array.isArray(draft[field]) ? draft[field].length : 0],
      ),
    ),
    emptyFields: Object.entries(draft)
      .filter(([, value]) => value === '' || value === null)
      .map(([field]) => field),
  }
}

function assertLocalOnlyEnvironment() {
  assert.equal(
    process.env.WORKFLOW_USE_REAL_GEMINI,
    'true',
    'Explicit local real-Gemini opt-in is required.',
  )
  assert.equal(
    process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT,
    PROJECT_ID,
    'The smoke test must use the isolated emulator project.',
  )
  assert.match(
    process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '',
    /^(127\.0\.0\.1|localhost):9099$/,
    'The Auth Emulator is required.',
  )
  assert.match(
    process.env.FIRESTORE_EMULATOR_HOST ?? '',
    /^(127\.0\.0\.1|localhost):8080$/,
    'The Firestore Emulator is required.',
  )
  assert.match(
    process.env.FUNCTIONS_EMULATOR_HOST ?? '',
    /^(127\.0\.0\.1|localhost):5001$/,
    'The Functions Emulator is required.',
  )
}
