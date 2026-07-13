import assert from 'node:assert/strict'
import test from 'node:test'
import { getAuth as getAdminAuth } from 'firebase-admin/auth'
import {
  getFirestore as getAdminFirestore,
  Timestamp as AdminTimestamp,
} from 'firebase-admin/firestore'
import { getApps, initializeApp as initializeAdminApp } from 'firebase-admin/app'
import { deleteApp, initializeApp } from 'firebase/app'
import {
  connectAuthEmulator,
  initializeAuth,
  inMemoryPersistence,
  signInWithEmailAndPassword,
} from 'firebase/auth'
import {
  connectFirestoreEmulator,
  deleteDoc,
  doc,
  getDoc,
  getFirestore,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore'
import {
  connectFunctionsEmulator,
  getFunctions,
  httpsCallable,
} from 'firebase/functions'
import { hashProposalPayload } from '../lib/shared/actionProposal.js'

const PROJECT_ID = 'workflow-integration'
const AUTH_HOST = '127.0.0.1:9099'
const FIRESTORE_HOST = '127.0.0.1:8080'
const PASSWORD = 'integration-password'
const CLIENT_CONFIG = {
  apiKey: 'integration-api-key',
  appId: 'workflow-integration-app',
  authDomain: '127.0.0.1',
  projectId: PROJECT_ID,
}

process.env.FIREBASE_AUTH_EMULATOR_HOST ??= AUTH_HOST
process.env.FIRESTORE_EMULATOR_HOST ??= FIRESTORE_HOST
process.env.GCLOUD_PROJECT ??= PROJECT_ID

const adminApp =
  getApps()[0] ?? initializeAdminApp({ projectId: PROJECT_ID }, 'integration-admin')
const adminAuth = getAdminAuth(adminApp)
const adminFirestore = getAdminFirestore(adminApp)
const clients = []

const identities = {
  employeeA: {
    email: 'employee-a@example.test',
    organizationId: 'organization-a',
    role: 'employee',
    uid: 'employee-a',
  },
  inactiveManagerA: {
    email: 'inactive-manager-a@example.test',
    organizationId: 'organization-a',
    role: 'manager',
    uid: 'inactive-manager-a',
  },
  managerA: {
    email: 'manager-a@example.test',
    organizationId: 'organization-a',
    role: 'manager',
    uid: 'manager-a',
  },
  managerASecond: {
    email: 'manager-a-second@example.test',
    organizationId: 'organization-a',
    role: 'manager',
    uid: 'manager-a-second',
  },
  managerB: {
    email: 'manager-b@example.test',
    organizationId: 'organization-b',
    role: 'manager',
    uid: 'manager-b',
  },
}

const validPayload = {
  customerName: 'Ada Customer',
  customerPhone: '555-0100',
  description: 'Repair the cooling unit.',
  dueDate: null,
  location: 'South Zone',
  priority: 'High',
  requiredSkills: ['HVAC'],
  serviceAddress: '10 Main Street',
  title: 'Cooling repair',
}

test('action proposal lifecycle uses Auth, Firestore Rules, transactions, and the callable emulator', async (t) => {
  await seedFixtures()

  try {
    await t.test('creates, reloads, confirms, audits, and idempotently returns one job', async () => {
      const manager = await signedInClient(identities.managerA)
      const proposalId = 'proposal-valid'
      await createPreparedProposal(manager, proposalId)

      const restartedManager = await signedInClient(identities.managerA)
      const reloaded = await getDoc(
        doc(restartedManager.firestore, 'actionProposals', proposalId),
      )
      assert.equal(reloaded.exists(), true)
      assert.equal(reloaded.data().status, 'prepared')

      const firstResult = await confirmProposal(restartedManager, proposalId, {
        organizationId: 'organization-b',
        role: 'employee',
      })
      const retryResult = await confirmProposal(restartedManager, proposalId)
      assert.deepEqual(firstResult, {
        jobId: proposalId,
        proposalId,
        status: 'completed',
      })
      assert.deepEqual(retryResult, firstResult)

      const [jobSnapshot, proposalSnapshot, auditSnapshot] = await Promise.all([
        adminFirestore.collection('jobs').doc(proposalId).get(),
        adminFirestore.collection('actionProposals').doc(proposalId).get(),
        adminFirestore
          .collection('auditLogs')
          .where('entityId', '==', proposalId)
          .get(),
      ])
      assert.equal(jobSnapshot.exists, true)
      assert.equal(jobSnapshot.data().id, proposalId)
      assert.equal(jobSnapshot.data().organizationId, 'organization-a')
      assert.equal(jobSnapshot.data().createdBy, identities.managerA.uid)
      assert.equal(proposalSnapshot.data().status, 'completed')
      assert.equal(proposalSnapshot.data().resultJobId, proposalId)
      assert.equal(auditSnapshot.size, 1)
      assert.equal(auditSnapshot.docs[0].data().metadata.actionProposalId, proposalId)
    })

    await t.test('allows only the requesting manager to read or confirm a proposal', async () => {
      const manager = await signedInClient(identities.managerA)
      const secondManager = await signedInClient(identities.managerASecond)
      const managerB = await signedInClient(identities.managerB)
      const proposalId = 'proposal-owner-only'
      await createPreparedProposal(manager, proposalId)

      await expectCode(
        () => getDoc(doc(secondManager.firestore, 'actionProposals', proposalId)),
        'permission-denied',
      )
      await expectCode(
        () => getDoc(doc(managerB.firestore, 'actionProposals', proposalId)),
        'permission-denied',
      )
      await expectCode(
        () =>
          confirmProposal(secondManager, proposalId, {
            organizationId: 'organization-a',
            role: 'admin',
          }),
        'functions/permission-denied',
      )
      await expectCode(
        () =>
          confirmProposal(managerB, proposalId, {
            organizationId: 'organization-a',
            role: 'admin',
          }),
        'functions/permission-denied',
      )
    })

    await t.test('enforces proposal creation and immutability through deployed Rules', async () => {
      const manager = await signedInClient(identities.managerA)
      const employee = await signedInClient(identities.employeeA)
      const proposalId = 'proposal-rules'
      await createPreparedProposal(manager, proposalId)

      await expectCode(
        () => createPreparedProposal(employee, 'proposal-employee'),
        'permission-denied',
      )
      await expectCode(
        () =>
          updateDoc(doc(manager.firestore, 'actionProposals', proposalId), {
            payload: { ...validPayload, title: 'Modified client payload' },
            status: 'processing',
          }),
        'permission-denied',
      )
      await expectCode(
        () => deleteDoc(doc(manager.firestore, 'actionProposals', proposalId)),
        'permission-denied',
      )
      await confirmProposal(manager, proposalId)
      await expectCode(
        () =>
          updateDoc(doc(manager.firestore, 'actionProposals', proposalId), {
            status: 'prepared',
          }),
        'permission-denied',
      )
    })

    await t.test('rejects employee, inactive-manager, integrity, expiry, and unsupported-action cases', async () => {
      const manager = await signedInClient(identities.managerA)
      const employee = await signedInClient(identities.employeeA)
      const inactiveManager = await signedInClient(identities.inactiveManagerA)
      const employeeProposalId = 'proposal-employee-confirm'
      await createPreparedProposal(manager, employeeProposalId)

      await expectCode(
        () => confirmProposal(employee, employeeProposalId),
        'functions/permission-denied',
      )

      const inactiveProposalId = 'proposal-inactive-manager'
      await seedProposal(inactiveProposalId, identities.inactiveManagerA, {})
      await expectCode(
        () => confirmProposal(inactiveManager, inactiveProposalId),
        'functions/permission-denied',
      )

      const alteredPayloadId = 'proposal-altered-payload'
      await seedProposal(alteredPayloadId, identities.managerA, {
        payload: { ...validPayload, title: 'Changed after hashing' },
        payloadHash: hashProposalPayload(validPayload),
      })
      await expectCode(
        () => confirmProposal(manager, alteredPayloadId),
        'functions/failed-precondition',
      )
      assert.equal(
        (await adminFirestore.collection('actionProposals').doc(alteredPayloadId).get()).data()
          .status,
        'failed',
      )

      const alteredHashId = 'proposal-altered-hash'
      await seedProposal(alteredHashId, identities.managerA, {
        payloadHash: 'fnv1a-not-the-payload',
      })
      await expectCode(
        () => confirmProposal(manager, alteredHashId),
        'functions/failed-precondition',
      )
      assert.equal(
        (await adminFirestore.collection('actionProposals').doc(alteredHashId).get()).data()
          .status,
        'failed',
      )

      const invalidPayloadId = 'proposal-invalid-payload'
      const invalidPayload = { ...validPayload, title: '' }
      await seedProposal(invalidPayloadId, identities.managerA, {
        payload: invalidPayload,
        payloadHash: hashProposalPayload(invalidPayload),
      })
      await expectCode(
        () => confirmProposal(manager, invalidPayloadId),
        'functions/failed-precondition',
      )
      assert.equal(
        (await adminFirestore.collection('jobs').doc(invalidPayloadId).get()).exists,
        false,
      )
      assert.equal(
        (await adminFirestore.collection('actionProposals').doc(invalidPayloadId).get()).data()
          .status,
        'failed',
      )

      const expiredProposalId = 'proposal-expired'
      await seedProposal(expiredProposalId, identities.managerA, {
        expiresAt: AdminTimestamp.fromMillis(Date.now() - 1_000),
      })
      await expectCode(
        () => confirmProposal(manager, expiredProposalId),
        'functions/deadline-exceeded',
      )
      assert.equal(
        (await adminFirestore.collection('actionProposals').doc(expiredProposalId).get()).data()
          .status,
        'expired',
      )

      const unsupportedProposalId = 'proposal-unsupported'
      await seedProposal(unsupportedProposalId, identities.managerA, {
        actionType: 'delete_job',
      })
      await expectCode(
        () => confirmProposal(manager, unsupportedProposalId),
        'functions/invalid-argument',
      )
    })

    await t.test('keeps processing and reconciliation-required proposals from writing again', async () => {
      const manager = await signedInClient(identities.managerA)
      const processingProposalId = 'proposal-processing'
      await seedProposal(processingProposalId, identities.managerA, {
        executionJobId: processingProposalId,
        processingStartedAt: AdminTimestamp.now(),
        status: 'processing',
      })
      await expectCode(
        () => confirmProposal(manager, processingProposalId),
        'functions/aborted',
      )
      assert.equal(
        (await adminFirestore.collection('jobs').doc(processingProposalId).get()).exists,
        false,
      )

      const reconciliationProposalId = 'proposal-reconciliation'
      await seedProposal(reconciliationProposalId, identities.managerA, {
        failureCode: 'execution_uncertain',
        failureSummary: 'Integration fixture only.',
        status: 'reconciliation_required',
      })
      await expectCode(
        () => confirmProposal(manager, reconciliationProposalId),
        'functions/failed-precondition',
      )
      assert.equal(
        (await adminFirestore.collection('jobs').doc(reconciliationProposalId).get()).exists,
        false,
      )
    })

    await t.test('handles concurrent confirmation with one deterministic job', async () => {
      const manager = await signedInClient(identities.managerA)
      const concurrentManager = await signedInClient(identities.managerA)
      const proposalId = 'proposal-concurrent'
      await createPreparedProposal(manager, proposalId)

      const attempts = await Promise.allSettled([
        confirmProposal(manager, proposalId),
        confirmProposal(concurrentManager, proposalId),
      ])
      assert.equal(
        attempts.some((attempt) => attempt.status === 'fulfilled'),
        true,
      )
      assert.equal(
        (await adminFirestore.collection('jobs').doc(proposalId).get()).exists,
        true,
      )
      const jobsWithProposalId = await adminFirestore
        .collection('jobs')
        .where('id', '==', proposalId)
        .get()
      assert.equal(jobsWithProposalId.size, 1)
      assert.deepEqual(await confirmProposal(manager, proposalId), {
        jobId: proposalId,
        proposalId,
        status: 'completed',
      })
    })
  } finally {
    await Promise.all(clients.map((client) => deleteApp(client.app)))
  }
})

async function seedFixtures() {
  for (const identity of Object.values(identities)) {
    await adminAuth.createUser({
      email: identity.email,
      password: PASSWORD,
      uid: identity.uid,
    })
    await adminFirestore.collection('users').doc(identity.uid).set({
      activeTaskCount: 0,
      availability: 'available',
      createdAt: AdminTimestamp.now(),
      displayName: identity.uid,
      email: identity.email,
      id: identity.uid,
      isActive: identity !== identities.inactiveManagerA,
      organizationId: identity.organizationId,
      performanceScore: 0,
      role: identity.role,
      skills: [],
      updatedAt: AdminTimestamp.now(),
    })
  }
}

async function signedInClient(identity) {
  const app = initializeApp(CLIENT_CONFIG, `integration-${clients.length}`)
  const auth = initializeAuth(app, { persistence: inMemoryPersistence })
  const firestore = getFirestore(app)
  const functions = getFunctions(app, 'asia-south1')

  connectAuthEmulator(auth, `http://${AUTH_HOST}`, { disableWarnings: true })
  connectFirestoreEmulator(firestore, '127.0.0.1', 8080)
  connectFunctionsEmulator(functions, '127.0.0.1', 5001)
  await signInWithEmailAndPassword(auth, identity.email, PASSWORD)

  const client = { app, auth, firestore, functions, identity }
  clients.push(client)
  return client
}

async function createPreparedProposal(client, proposalId) {
  await setDoc(
    doc(client.firestore, 'actionProposals', proposalId),
    proposalDocument(proposalId, client.identity, { timestamp: Timestamp.now() }),
  )
}

async function seedProposal(proposalId, identity, overrides) {
  await adminFirestore
    .collection('actionProposals')
    .doc(proposalId)
    .set(proposalDocument(proposalId, identity, { timestamp: AdminTimestamp.now(), ...overrides }))
}

function proposalDocument(proposalId, identity, options) {
  const payload = options.payload ?? validPayload
  const timestamp = options.timestamp

  return {
    actionType: options.actionType ?? 'create_job',
    completedAt: null,
    confirmedAt: null,
    createdAt: timestamp,
    executionJobId: options.executionJobId ?? null,
    expiresAt:
      options.expiresAt ??
      (timestamp.constructor.fromMillis
        ? timestamp.constructor.fromMillis(timestamp.toMillis() + 60_000)
        : Timestamp.fromMillis(timestamp.toMillis() + 60_000)),
    failureCode: options.failureCode ?? null,
    failureSummary: options.failureSummary ?? null,
    id: proposalId,
    idempotencyKey: `create_job:${proposalId}`,
    isActive: true,
    organizationId: identity.organizationId,
    payload,
    payloadHash: options.payloadHash ?? hashProposalPayload(payload),
    processingStartedAt: options.processingStartedAt ?? null,
    proposalId,
    requestedBy: identity.uid,
    requiresConfirmation: true,
    resultJobId: null,
    status: options.status ?? 'prepared',
    summary: 'Create cooling repair job.',
    updatedAt: timestamp,
    version: 1,
    warnings: [],
  }
}

async function confirmProposal(client, proposalId, extra = {}) {
  const confirm = httpsCallable(client.functions, 'confirmCreateJobProposal')
  const result = await confirm({ proposalId, ...extra })
  return result.data
}

async function expectCode(operation, code) {
  await assert.rejects(operation, (error) => error?.code === code)
}
