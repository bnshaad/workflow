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
const PASSWORD = 'workforce-integration-password'
const CLIENT_CONFIG = {
  apiKey: 'integration-api-key',
  appId: 'workflow-workforce-integration-app',
  authDomain: '127.0.0.1',
  projectId: PROJECT_ID,
}

process.env.FIREBASE_AUTH_EMULATOR_HOST ??= AUTH_HOST
process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080'
process.env.GCLOUD_PROJECT ??= PROJECT_ID

const adminApp =
  getApps()[0] ?? initializeAdminApp({ projectId: PROJECT_ID }, 'workforce-admin')
const adminAuth = getAdminAuth(adminApp)
const adminFirestore = getAdminFirestore(adminApp)
const clients = []

const identities = {
  employee: identity('workforce-employee', 'organization-workforce-a', 'employee'),
  inactiveManager: identity(
    'workforce-inactive-manager',
    'organization-workforce-a',
    'manager',
  ),
  managerA: identity('workforce-manager-a', 'organization-workforce-a', 'manager'),
  managerB: identity('workforce-manager-b', 'organization-workforce-b', 'manager'),
}

test('trusted workforce callable is tenant-scoped, deterministic, and read-only', async (t) => {
  await seedFixtures()

  try {
    const managerA = await signedInClient(identities.managerA)
    const managerB = await signedInClient(identities.managerB)
    const employee = await signedInClient(identities.employee)
    const inactiveManager = await signedInClient(identities.inactiveManager)

    await t.test('returns only eligible ranked candidates for a valid manager', async () => {
      const result = await recommend(managerA, 'workforce-job-open')

      assert.equal(result.jobId, 'workforce-job-open')
      assert.equal(result.engineVersion, 'rule-based-v1')
      assert.deepEqual(
        result.candidates.map((candidate) => candidate.employeeId),
        [
          'workforce-candidate-asha',
          'workforce-candidate-basil',
          'workforce-employee',
        ],
      )
      assert.deepEqual(
        result.candidates.map((candidate) => candidate.rank),
        [1, 2, 3],
      )
      assert.equal(result.candidates[0].score, 80)
      assert.equal(result.candidates[1].score, 73)
      assert.match(result.candidates[0].reasons.join(' '), /Matched 1 of 1/)
      assert.equal(
        result.candidates.some(
          (candidate) => candidate.employeeId === 'workforce-candidate-leave',
        ),
        false,
      )
      assert.equal(
        result.candidates.some(
          (candidate) => candidate.employeeId === 'workforce-candidate-cross-tenant',
        ),
        false,
      )
    })

    await t.test('rejects employee and inactive-manager callers', async () => {
      await expectCode(
        () => recommend(employee, 'workforce-job-open'),
        'functions/permission-denied',
      )
      await expectCode(
        () => recommend(inactiveManager, 'workforce-job-open'),
        'functions/permission-denied',
      )
    })

    await t.test('hides cross-tenant and missing jobs', async () => {
      await expectCode(
        () => recommend(managerB, 'workforce-job-open'),
        'functions/not-found',
      )
      await expectCode(
        () => recommend(managerA, 'workforce-job-missing'),
        'functions/not-found',
      )
    })

    await t.test('does not assign, create a proposal, or persist a recommendation', async () => {
      await recommend(managerA, 'workforce-job-open')
      const [job, recommendations, proposals] = await Promise.all([
        adminFirestore.collection('jobs').doc('workforce-job-open').get(),
        adminFirestore
          .collection('recommendations')
          .where('generatedBy', '==', identities.managerA.uid)
          .get(),
        adminFirestore
          .collection('actionProposals')
          .where('requestedBy', '==', identities.managerA.uid)
          .get(),
      ])

      assert.deepEqual(job.data().assignedEmployeeIds, [])
      assert.equal(job.data().status, 'open')
      assert.equal(recommendations.empty, true)
      assert.equal(proposals.empty, true)
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
      ...baseUser(currentIdentity),
      isActive: currentIdentity !== identities.inactiveManager,
    })
  }

  await Promise.all([
    seedCandidate(
      'workforce-candidate-asha',
      'Asha',
      'organization-workforce-a',
      'available',
      ['AC Repair'],
    ),
    seedCandidate(
      'workforce-candidate-basil',
      'Basil',
      'organization-workforce-a',
      'busy',
      ['AC Repair'],
    ),
    seedCandidate(
      'workforce-candidate-leave',
      'Leena',
      'organization-workforce-a',
      'leave',
      ['AC Repair'],
    ),
    seedCandidate(
      'workforce-candidate-cross-tenant',
      'Cross Tenant',
      'organization-workforce-b',
      'available',
      ['AC Repair'],
    ),
  ])

  await Promise.all([
    seedJob('workforce-job-open', {
      assignedEmployeeIds: [],
      completedAt: null,
      organizationId: 'organization-workforce-a',
      status: 'open',
    }),
    seedJob('workforce-job-basil-active', {
      assignedEmployeeIds: ['workforce-candidate-basil'],
      completedAt: null,
      organizationId: 'organization-workforce-a',
      status: 'assigned',
    }),
    seedJob('workforce-job-basil-completed', {
      assignedEmployeeIds: ['workforce-candidate-basil'],
      completedAt: Timestamp.now(),
      organizationId: 'organization-workforce-a',
      status: 'completed',
    }),
  ])
}

async function seedCandidate(id, displayName, organizationId, availability, skills) {
  await adminFirestore.collection('users').doc(id).set({
    activeTaskCount: 0,
    availability,
    createdAt: Timestamp.now(),
    displayName,
    email: `${id}@example.test`,
    id,
    isActive: true,
    organizationId,
    performanceScore: 0,
    role: 'employee',
    skills,
    updatedAt: Timestamp.now(),
  })
}

async function seedJob(id, overrides) {
  await adminFirestore.collection('jobs').doc(id).set({
    assignedEmployeeIds: [],
    completedAt: null,
    createdAt: Timestamp.now(),
    id,
    isActive: true,
    location: 'Kakkanad',
    organizationId: 'organization-workforce-a',
    requiredSkills: ['AC Repair'],
    status: 'open',
    updatedAt: Timestamp.now(),
    ...overrides,
  })
}

async function signedInClient(currentIdentity) {
  const app = initializeApp(CLIENT_CONFIG, `workforce-client-${clients.length}`)
  const auth = initializeAuth(app, { persistence: inMemoryPersistence })
  const functions = getFunctions(app, 'asia-south1')

  connectAuthEmulator(auth, `http://${AUTH_HOST}`, { disableWarnings: true })
  connectFunctionsEmulator(functions, '127.0.0.1', 5001)
  await signInWithEmailAndPassword(auth, currentIdentity.email, PASSWORD)

  const client = { app, auth, functions }
  clients.push(client)
  return client
}

async function recommend(client, jobId) {
  const callable = httpsCallable(client.functions, 'getWorkforceRecommendation')
  const result = await callable({ jobId })
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

function baseUser(currentIdentity) {
  return {
    activeTaskCount: 0,
    availability: 'available',
    createdAt: Timestamp.now(),
    displayName: currentIdentity.uid,
    email: currentIdentity.email,
    id: currentIdentity.uid,
    isActive: true,
    organizationId: currentIdentity.organizationId,
    performanceScore: 0,
    role: currentIdentity.role,
    skills: [],
    updatedAt: Timestamp.now(),
  }
}
