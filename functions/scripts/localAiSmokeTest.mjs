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
const operationsOnly = process.argv.includes('--operations-only')
const protectedCollections = [
  'actionProposals',
  'jobs',
  'notifications',
  'recommendations',
]
const operationsIntents = new Set([
  'show_urgent_unassigned_jobs',
  'show_overdue_jobs',
  'show_jobs_requiring_attention',
  'show_workload_distribution',
  'summarize_open_operations',
  'explain_job_attention_flag',
])

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
const operations = httpsCallable(functions, 'getOperationsInsight')
let userCreated = false
let profileCreated = false
const employeeId = `local-ai-smoke-employee-${suffix}`
const urgentJobId = `local-ai-smoke-urgent-${suffix}`
const assignedJobId = `local-ai-smoke-assigned-${suffix}`
const organizationId = `local-ai-smoke-organization-${suffix}`

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
    organizationId,
    performanceScore: 0,
    role: 'manager',
    skills: [],
    updatedAt: Timestamp.now(),
  })
  profileCreated = true
  await adminFirestore.collection('users').doc(employeeId).set({
    createdAt: Timestamp.now(),
    displayName: 'Synthetic Technician',
    email: `${employeeId}@example.test`,
    id: employeeId,
    isActive: true,
    organizationId,
    role: 'employee',
    updatedAt: Timestamp.now(),
  })
  await Promise.all([
    adminFirestore.collection('jobs').doc(urgentJobId).set({
      assignedEmployeeIds: [],
      createdAt: Timestamp.now(),
      dueDate: Timestamp.fromMillis(Date.now() - 60_000),
      id: urgentJobId,
      isActive: true,
      organizationId,
      priority: 'High',
      status: 'open',
      title: 'Synthetic overdue repair',
      updatedAt: Timestamp.now(),
    }),
    adminFirestore.collection('jobs').doc(assignedJobId).set({
      assignedEmployeeIds: [employeeId],
      createdAt: Timestamp.now(),
      dueDate: Timestamp.fromMillis(Date.now() + 60_000),
      id: assignedJobId,
      isActive: true,
      organizationId,
      priority: 'Medium',
      status: 'assigned',
      title: 'Synthetic assigned repair',
      updatedAt: Timestamp.now(),
    }),
  ])
  await signInWithEmailAndPassword(clientAuth, email, SYNTHETIC_PASSWORD)

  const beforeCounts = await readProtectedCollectionCounts()
  if (operationsOnly) {
    const result = await runOperationsOnlySpotCheck(classify, operations)
    const afterCounts = await readProtectedCollectionCounts()
    assert.deepEqual(afterCounts, beforeCounts)
    console.log('Local real-Gemini Operations spot-check passed with synthetic data.')
    console.log(
      JSON.stringify(
        {
          protectedCollectionCounts: afterCounts,
          realGeminiRequestCount: result.length,
          routes: result,
        },
        null,
        2,
      ),
    )
  } else {
    const immediateAttention = await classify({
      message: 'What needs attention today?',
      uiContext: 'dashboard',
    })
    assert.equal(operationsIntents.has(immediateAttention.data.intent), true)
    assert.equal(immediateAttention.data.requiresClarification, false)
    const immediateInsight = await operations({
      intent: immediateAttention.data.intent,
      jobId: urgentJobId,
    })
    assert.equal(immediateInsight.data.intent, immediateAttention.data.intent)

  const destructive = await classify({
    message: 'Cancel every overdue job.',
    uiContext: 'jobs',
  })
  assert.equal(destructive.data.intent, 'unsupported')

  const predictive = await classify({
    message: 'Predict which open job will fail next.',
    uiContext: 'dashboard',
  })
  assert.equal(predictive.data.intent, 'unsupported')

  const historical = await classify({
    message: 'Show every job completed today.',
    uiContext: 'jobs',
  })
  assert.equal(historical.data.intent, 'unsupported')

  const overdue = await operations({ intent: 'show_overdue_jobs' })
  assert.deepEqual(
    overdue.data.items.map((item) => item.jobId),
    [urgentJobId],
  )

  const workload = await operations({ intent: 'show_workload_distribution' })
  assert.equal(workload.data.employees[0].employeeId, employeeId)
  assert.equal(workload.data.employees[0].activeJobCount, 1)
  assert.doesNotMatch(workload.data.note, /overloaded|burnout|risk|predict/i)

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

  const sampleDraft = await draft({
    customerRequest:
      'The AC in our office at Kakkanad is leaking water. Please send someone today.',
  })
  assert.equal(sampleDraft.data.customerName, '')
  assert.equal(sampleDraft.data.customerPhone, '')
  assert.match(
    `${sampleDraft.data.location} ${sampleDraft.data.serviceAddress}`,
    /kakkanad/i,
  )
  assert.equal(sampleDraft.data.description.length > 0, true)
  assert.equal(sampleDraft.data.title.length > 0, true)
  assert.equal(Array.isArray(sampleDraft.data.uncertainFields), true)

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
          sampleDraftSummary: summarizeDraft(sampleDraft.data),
          destructiveIntent: destructive.data.intent,
          historicalIntent: historical.data.intent,
          immediateAttentionIntent: immediateAttention.data.intent,
          operationsChecks: {
            attentionResultIntent: immediateInsight.data.intent,
            overdueCount: overdue.data.items.length,
            workloadEmployeeCount: workload.data.employees.length,
          },
          incompleteDraftSummary: summarizeDraft(incompleteDraft.data),
          predictiveIntent: predictive.data.intent,
          protectedCollectionCounts: afterCounts,
          realGeminiRequestCount: 9,
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
  }
} finally {
  await Promise.all([
    adminFirestore.collection('jobs').doc(urgentJobId).delete(),
    adminFirestore.collection('jobs').doc(assignedJobId).delete(),
    adminFirestore.collection('users').doc(employeeId).delete(),
  ])
  if (profileCreated) {
    await adminFirestore.collection('users').doc(uid).delete()
  }
  if (userCreated) {
    await adminAuth.deleteUser(uid)
  }
}

async function runOperationsOnlySpotCheck(classifyCallable, operationsCallable) {
  const cases = [
    ['attention', 'What needs attention today?', 'dashboard', 'show_jobs_requiring_attention'],
    ['critical', 'Is anything operationally critical?', 'dashboard', 'show_urgent_unassigned_jobs'],
    ['manager-review', 'Which jobs require a manager review?', 'jobs', 'show_jobs_requiring_attention'],
    ['workload', 'How is work distributed across the team?', 'dashboard', 'show_workload_distribution'],
    ['overdue', 'Which active jobs are past their deadline?', 'jobs', 'show_overdue_jobs'],
    ['open-summary', 'Give me an overview of current open operations.', 'dashboard', 'summarize_open_operations'],
    ['mutation', 'Cancel every overdue job.', 'jobs', 'unsupported'],
    ['prediction', 'Predict which open job will fail next.', 'dashboard', 'unsupported'],
    ['historical', 'Show every job completed today.', 'jobs', 'unsupported'],
  ]

  const routes = []
  for (const [id, message, uiContext, expectedIntent] of cases) {
    const classification = await classifyCallable({ message, uiContext })
    assert.equal(classification.data.intent, expectedIntent)
    assert.equal(classification.data.requiresClarification, false)

    if (operationsIntents.has(expectedIntent)) {
      const insight = await operationsCallable({ intent: expectedIntent })
      assert.equal(insight.data.intent, expectedIntent)
    }

    routes.push({ id, intent: classification.data.intent })
  }

  return routes
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
