import assert from 'node:assert/strict'
import test from 'node:test'
import { getApps, initializeApp as initializeAdminApp } from 'firebase-admin/app'
import { getAuth as getAdminAuth } from 'firebase-admin/auth'
import {
  getFirestore as getAdminFirestore,
  Timestamp,
} from 'firebase-admin/firestore'
import { deleteApp, initializeApp } from 'firebase/app'
import {
  connectAuthEmulator,
  initializeAuth,
  inMemoryPersistence,
  signInWithEmailAndPassword,
} from 'firebase/auth'
import {
  connectFunctionsEmulator,
  getFunctions,
  httpsCallable,
} from 'firebase/functions'

const PROJECT_ID = 'workflow-integration'
const AUTH_HOST = '127.0.0.1:9099'
const PASSWORD = 'operations-integration-password'
const CLIENT_CONFIG = {
  apiKey: 'integration-api-key',
  appId: 'workflow-operations-integration-app',
  authDomain: '127.0.0.1',
  projectId: PROJECT_ID,
}

process.env.FIREBASE_AUTH_EMULATOR_HOST ??= AUTH_HOST
process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080'
process.env.GCLOUD_PROJECT ??= PROJECT_ID

const adminApp =
  getApps()[0] ?? initializeAdminApp({ projectId: PROJECT_ID }, 'operations-admin')
const adminAuth = getAdminAuth(adminApp)
const adminFirestore = getAdminFirestore(adminApp)
const clients = []

const identities = {
  adminA: identity('operations-admin-a', 'operations-organization-a', 'admin'),
  employeeA: identity(
    'operations-employee-a',
    'operations-organization-a',
    'employee',
  ),
  inactiveManager: identity(
    'operations-inactive-manager',
    'operations-organization-a',
    'manager',
  ),
  managerA: identity(
    'operations-manager-a',
    'operations-organization-a',
    'manager',
  ),
  managerB: identity(
    'operations-manager-b',
    'operations-organization-b',
    'manager',
  ),
}

test('operations callable is manager-only, tenant-scoped, bounded, and read-only', async (t) => {
  await seedFixtures()

  try {
    const adminA = await signedInClient(identities.adminA)
    const employeeA = await signedInClient(identities.employeeA)
    const inactiveManager = await signedInClient(identities.inactiveManager)
    const managerA = await signedInClient(identities.managerA)
    const managerB = await signedInClient(identities.managerB)

    await t.test('manager and admin receive only their tenant data', async () => {
      const managerResult = await insight(managerA, {
        intent: 'show_jobs_requiring_attention',
      })
      const adminResult = await insight(adminA, {
        intent: 'show_urgent_unassigned_jobs',
      })

      assert.deepEqual(
        managerResult.items.map((item) => item.jobId),
        ['operations-job-a'],
      )
      assert.deepEqual(
        adminResult.items.map((item) => item.jobId),
        ['operations-job-a'],
      )
      assert.equal(managerResult.items.length <= 10, true)
    })

    await t.test('employee and inactive manager are rejected', async () => {
      await expectCode(
        () => insight(employeeA, { intent: 'summarize_open_operations' }),
        'functions/permission-denied',
      )
      await expectCode(
        () => insight(inactiveManager, { intent: 'summarize_open_operations' }),
        'functions/permission-denied',
      )
    })

    await t.test('client organization claims are ignored', async () => {
      const result = await insight(managerB, {
        intent: 'show_urgent_unassigned_jobs',
        organizationId: 'operations-organization-a',
        role: 'admin',
      })

      assert.deepEqual(
        result.items.map((item) => item.jobId),
        ['operations-job-b'],
      )
    })

    await t.test('cross-tenant attention explanations are hidden', async () => {
      await expectCode(
        () =>
          insight(managerB, {
            intent: 'explain_job_attention_flag',
            jobId: 'operations-job-a',
          }),
        'functions/not-found',
      )
    })

    await t.test('workload counts assigned and in-progress jobs without overload claims', async () => {
      const result = await insight(managerA, {
        intent: 'show_workload_distribution',
      })

      assert.equal(result.employees[0].employeeId, identities.employeeA.uid)
      assert.equal(result.employees[0].activeJobCount, 1)
      assert.doesNotMatch(result.note, /overloaded|burnout|risk|predict/i)
      assert.match(result.note, /No organization workload threshold/)
    })

    await t.test('does not write jobs, proposals, recommendations, or notifications', async () => {
      await insight(managerA, { intent: 'summarize_open_operations' })
      const [job, proposals, recommendations, notifications] = await Promise.all([
        adminFirestore.collection('jobs').doc('operations-job-a').get(),
        adminFirestore
          .collection('actionProposals')
          .where('requestedBy', '==', identities.managerA.uid)
          .get(),
        adminFirestore
          .collection('recommendations')
          .where('generatedBy', '==', identities.managerA.uid)
          .get(),
        adminFirestore
          .collection('notifications')
          .where('organizationId', '==', identities.managerA.organizationId)
          .get(),
      ])

      assert.deepEqual(job.data().assignedEmployeeIds, [])
      assert.equal(job.data().status, 'open')
      assert.equal(proposals.empty, true)
      assert.equal(recommendations.empty, true)
      assert.equal(notifications.empty, true)
    })
  } finally {
    await Promise.all(clients.map((client) => deleteApp(client.app)))
  }
})

async function seedFixtures() {
  for (const currentIdentity of Object.values(identities)) {
    await adminAuth.createUser({
      email: currentIdentity.email,
      password: PASSWORD,
      uid: currentIdentity.uid,
    })
    await adminFirestore.collection('users').doc(currentIdentity.uid).set({
      activeTaskCount: 0,
      availability: 'available',
      createdAt: Timestamp.now(),
      displayName: currentIdentity.uid,
      email: currentIdentity.email,
      id: currentIdentity.uid,
      isActive: currentIdentity !== identities.inactiveManager,
      organizationId: currentIdentity.organizationId,
      performanceScore: 0,
      role: currentIdentity.role,
      skills: [],
      updatedAt: Timestamp.now(),
    })
  }

  await Promise.all([
    seedJob('operations-job-a', {
      assignedEmployeeIds: [],
      organizationId: 'operations-organization-a',
      priority: 'High',
      status: 'open',
    }),
    seedJob('operations-job-a-assigned', {
      assignedEmployeeIds: [identities.employeeA.uid],
      organizationId: 'operations-organization-a',
      priority: 'Medium',
      status: 'assigned',
    }),
    seedJob('operations-job-b', {
      assignedEmployeeIds: [],
      organizationId: 'operations-organization-b',
      priority: 'Urgent',
      status: 'open',
    }),
  ])
}

async function seedJob(id, overrides) {
  await adminFirestore.collection('jobs').doc(id).set({
    assignedEmployeeIds: [],
    createdAt: Timestamp.now(),
    dueDate: Timestamp.fromMillis(Date.now() + 60_000),
    id,
    isActive: true,
    organizationId: 'operations-organization-a',
    priority: 'Medium',
    status: 'open',
    title: id,
    updatedAt: Timestamp.now(),
    ...overrides,
  })
}

async function signedInClient(currentIdentity) {
  const app = initializeApp(CLIENT_CONFIG, `operations-client-${clients.length}`)
  const auth = initializeAuth(app, { persistence: inMemoryPersistence })
  const functions = getFunctions(app, 'asia-south1')

  connectAuthEmulator(auth, `http://${AUTH_HOST}`, { disableWarnings: true })
  connectFunctionsEmulator(functions, '127.0.0.1', 5001)
  await signInWithEmailAndPassword(auth, currentIdentity.email, PASSWORD)

  const client = { app, auth, functions }
  clients.push(client)
  return client
}

async function insight(client, input) {
  const callable = httpsCallable(client.functions, 'getOperationsInsight')
  const result = await callable(input)
  return result.data
}

async function expectCode(operation, code) {
  await assert.rejects(operation, (error) => error?.code === code)
}

function identity(uid, organizationId, role) {
  return {
    email: `${uid}@example.test`,
    organizationId,
    role,
    uid,
  }
}
