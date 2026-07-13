import assert from 'node:assert/strict'
import test from 'node:test'
import {
  evaluateProposalConfirmation,
  failureStatusForExecution,
} from '../lib/functions/src/actionProposals/proposalState.js'
import { readTrustedManagerProfile } from '../lib/functions/src/actionProposals/trustedProfile.js'
import {
  buildNewJobDocument,
  validateJobCreation,
} from '../lib/shared/jobCreation.js'

const validInput = () => ({
  actionType: 'create_job',
  callerOrganizationId: 'org-a',
  callerUserId: 'manager-a',
  expiresAtMillis: Date.now() + 60_000,
  organizationId: 'org-a',
  payloadHashMatches: true,
  requestedBy: 'manager-a',
  resultJobId: null,
  status: 'prepared',
})

test('claims a valid prepared proposal', () => {
  assert.deepEqual(evaluateProposalConfirmation(validInput()), { kind: 'claim' })
})

test('returns the existing result for a completed proposal', () => {
  assert.deepEqual(
    evaluateProposalConfirmation({
      ...validInput(),
      resultJobId: 'proposal-1',
      status: 'completed',
    }),
    { jobId: 'proposal-1', kind: 'completed' },
  )
})

test('protects a processing proposal from concurrent confirmation', () => {
  assert.deepEqual(
    evaluateProposalConfirmation({ ...validInput(), status: 'processing' }),
    { kind: 'processing' },
  )
})

test('rejects expired and modified proposals with durable terminal reasons', () => {
  assert.deepEqual(
    evaluateProposalConfirmation({ ...validInput(), expiresAtMillis: Date.now() - 1 }),
    {
      code: 'deadline-exceeded',
      failureCode: 'expired',
      kind: 'rejected',
      message: 'The proposal has expired.',
    },
  )
  assert.deepEqual(
    evaluateProposalConfirmation({ ...validInput(), payloadHashMatches: false }),
    {
      code: 'failed-precondition',
      failureCode: 'payload_invalid',
      kind: 'rejected',
      message: 'The proposal payload was modified.',
    },
  )
})

test('rejects wrong owner, tenant, unsupported action, and terminal proposals', () => {
  assert.equal(
    evaluateProposalConfirmation({ ...validInput(), requestedBy: 'manager-b' }).code,
    'permission-denied',
  )
  assert.equal(
    evaluateProposalConfirmation({ ...validInput(), organizationId: 'org-b' }).code,
    'permission-denied',
  )
  assert.equal(
    evaluateProposalConfirmation({ ...validInput(), actionType: 'delete_job' }).code,
    'invalid-argument',
  )
  assert.equal(
    evaluateProposalConfirmation({ ...validInput(), status: 'cancelled' }).code,
    'failed-precondition',
  )
})

test('classifies definite and uncertain execution failures safely', () => {
  assert.equal(failureStatusForExecution(true), 'failed')
  assert.equal(failureStatusForExecution(false), 'reconciliation_required')
})

test('requires an active admin or manager profile from trusted server data', () => {
  assert.equal(
    readTrustedManagerProfile('manager-a', true, {
      id: 'manager-a',
      isActive: true,
      organizationId: 'org-a',
      role: 'manager',
    }),
    null,
  )
  assert.equal(
    readTrustedManagerProfile('manager-a', false, {
      id: 'manager-a',
      isActive: false,
      organizationId: 'org-a',
      role: 'manager',
    }),
    null,
  )
  assert.deepEqual(
    readTrustedManagerProfile('manager-a', false, {
      id: 'manager-a',
      isActive: true,
      organizationId: 'org-a',
      role: 'manager',
    }),
    { id: 'manager-a', organizationId: 'org-a' },
  )
})

test('uses the shared job contract for a valid proposal payload', () => {
  const payload = {
    customerName: 'Ada Customer',
    customerPhone: '555-0100',
    description: 'Repair the cooling unit.',
    location: 'South Zone',
    priority: 'High',
    requiredSkills: ['HVAC'],
    serviceAddress: '10 Main Street',
    title: 'Cooling repair',
  }
  const dueDate = new Date('2026-07-14T10:00:00.000Z')

  assert.equal(
    validateJobCreation({
      ...payload,
      attachments: [],
      createdBy: 'manager-a',
      dueDate,
      organizationId: 'org-a',
    }).isValid,
    true,
  )
  assert.deepEqual(
    buildNewJobDocument({
      createdAt: 'created-at',
      createdBy: 'manager-a',
      dueDate,
      id: 'proposal-1',
      organizationId: 'org-a',
      payload,
      toTimestamp: (date) => date.toISOString(),
    }),
    {
      aiRecommendation: null,
      assignedAt: null,
      assignedBy: null,
      assignedEmployeeIds: [],
      attachments: [],
      completedAt: null,
      completedBy: null,
      createdAt: 'created-at',
      createdBy: 'manager-a',
      customerName: 'Ada Customer',
      customerPhone: '555-0100',
      description: 'Repair the cooling unit.',
      dueDate: '2026-07-14T10:00:00.000Z',
      id: 'proposal-1',
      isActive: true,
      issueCount: 0,
      location: 'South Zone',
      manualOverride: false,
      organizationId: 'org-a',
      overrideReason: null,
      priority: 'High',
      requiredSkills: ['HVAC'],
      serviceAddress: '10 Main Street',
      startedAt: null,
      startedBy: null,
      status: 'draft',
      statusUpdatedAt: null,
      statusUpdatedBy: null,
      title: 'Cooling repair',
      updatedAt: 'created-at',
      workProofCount: 0,
    },
  )
})
