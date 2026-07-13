import {
  getFirestore,
  Timestamp,
  type DocumentData,
  type Firestore,
} from 'firebase-admin/firestore'
import { HttpsError, type CallableRequest } from 'firebase-functions/v2/https'
import {
  hashProposalPayload,
  type CreateJobProposalPayload,
} from '../../../shared/actionProposal.js'
import {
  buildNewJobDocument,
  validateJobCreation,
} from '../../../shared/jobCreation.js'
import {
  evaluateProposalConfirmation,
  failureStatusForExecution,
} from './proposalState.js'
import type { TrustedProfile } from './trustedProfile.js'
import { requireTrustedManager } from '../auth/requireTrustedManager.js'

const ACTION_PROPOSALS_COLLECTION = 'actionProposals'
const AUDIT_LOGS_COLLECTION = 'auditLogs'
const JOBS_COLLECTION = 'jobs'
const PROCESSING_STALE_MS = 5 * 60_000

type ClaimedProposal = {
  executionJobId: string
  payload: CreateJobProposalPayload
  proposalId: string
}

type CompletedProposal = {
  jobId: string
  proposalId: string
  status: 'completed'
}

type ProcessingProposal = {
  executionJobId: string
  processingStartedAt: Timestamp | null
  proposalId: string
}

type ProposalClaim =
  | { kind: 'claimed'; proposal: ClaimedProposal }
  | { kind: 'completed'; result: CompletedProposal }
  | { kind: 'processing'; proposal: ProcessingProposal }
  | {
      kind: 'rejected'
      code: 'deadline-exceeded' | 'failed-precondition' | 'invalid-argument' | 'permission-denied'
      message: string
    }

class DefinitePreWriteError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DefinitePreWriteError'
  }
}

export async function confirmCreateJobProposal(
  request: CallableRequest<unknown>,
): Promise<CompletedProposal> {
  const proposalId = readProposalId(request.data)
  const caller = await requireTrustedManager(request)
  const firestore = getFirestore()
  const claim = await claimProposal(firestore, proposalId, caller)

  if (claim.kind === 'completed') {
    return claim.result
  }

  if (claim.kind === 'processing') {
    return resolveProcessingProposal(firestore, claim.proposal)
  }

  if (claim.kind === 'rejected') {
    throw new HttpsError(claim.code, claim.message)
  }

  try {
    const jobId = await createJobIfAbsent(firestore, caller, claim.proposal)

    return await completeProposal(firestore, claim.proposal.proposalId, jobId)
  } catch (error) {
    if (error instanceof DefinitePreWriteError) {
      await markProposalFailed(firestore, claim.proposal.proposalId, error.message)
      throw new HttpsError('failed-precondition', error.message)
    }

    const reconciled = await findCompletedJob(
      firestore,
      claim.proposal.proposalId,
      claim.proposal.executionJobId,
    )

    if (reconciled) {
      return reconciled
    }

    await markReconciliationRequired(firestore, claim.proposal.proposalId)
    throw new HttpsError(
      'internal',
      'The job result could not be confirmed safely. The proposal requires reconciliation.',
    )
  }
}

async function claimProposal(
  firestore: Firestore,
  proposalId: string,
  caller: TrustedProfile,
): Promise<ProposalClaim> {
  const proposalReference = firestore
    .collection(ACTION_PROPOSALS_COLLECTION)
    .doc(proposalId)

  return firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(proposalReference)

    if (!snapshot.exists) {
      throw new HttpsError('not-found', 'The proposal was not found.')
    }

    const proposal = snapshot.data()

    if (!proposal) {
      throw new HttpsError('not-found', 'The proposal was not found.')
    }

    const now = Timestamp.now()
    const decision = evaluateProposalConfirmation({
      actionType: proposal.actionType,
      callerOrganizationId: caller.organizationId,
      callerUserId: caller.id,
      expiresAtMillis: readTimestampOrNull(proposal.expiresAt)?.toMillis() ?? null,
      organizationId: proposal.organizationId,
      payloadHashMatches: hashProposalPayload(proposal.payload) === proposal.payloadHash,
      requestedBy: proposal.requestedBy,
      resultJobId: proposal.resultJobId,
      status: proposal.status,
    })

    if (decision.kind === 'completed') {
      return {
        kind: 'completed',
        result: {
          jobId: decision.jobId,
          proposalId,
          status: 'completed',
        },
      }
    }

    if (decision.kind === 'processing') {
      return {
        kind: 'processing',
        proposal: {
          executionJobId: readString(proposal.executionJobId, proposalId),
          processingStartedAt: readTimestampOrNull(proposal.processingStartedAt),
          proposalId,
        },
      }
    }

    if (decision.kind === 'rejected') {
      if (decision.failureCode) {
        transaction.update(proposalReference, {
          failureCode: decision.failureCode,
          failureSummary: decision.message,
          status: decision.failureCode === 'expired' ? 'expired' : 'failed',
          updatedAt: now,
          version: readNumber(proposal.version, 1) + 1,
        })
      }

      return {
        kind: 'rejected',
        code: decision.code,
        message: decision.message,
      }
    }

    let payload: CreateJobProposalPayload

    try {
      payload = validateStoredPayload(proposal, caller)
    } catch (error) {
      transaction.update(proposalReference, {
        failureCode: 'payload_invalid',
        failureSummary:
          error instanceof Error ? error.message : 'The proposal payload is invalid.',
        status: 'failed',
        updatedAt: now,
        version: readNumber(proposal.version, 1) + 1,
      })
      return {
        kind: 'rejected',
        code: 'failed-precondition',
        message: 'The proposal payload is invalid.',
      }
    }

    const executionJobId = proposalId

    transaction.update(proposalReference, {
      confirmedAt: now,
      executionJobId,
      processingStartedAt: now,
      status: 'processing',
      updatedAt: now,
      version: readNumber(proposal.version, 1) + 1,
    })

    return {
      kind: 'claimed',
      proposal: {
        executionJobId,
        payload,
        proposalId,
      },
    }
  })
}

async function resolveProcessingProposal(
  firestore: Firestore,
  proposal: ProcessingProposal,
): Promise<CompletedProposal> {
  const completed = await findCompletedJob(
    firestore,
    proposal.proposalId,
    proposal.executionJobId,
  )

  if (completed) {
    return completed
  }

  const processingAge = proposal.processingStartedAt
    ? Timestamp.now().toMillis() - proposal.processingStartedAt.toMillis()
    : PROCESSING_STALE_MS

  if (processingAge >= PROCESSING_STALE_MS) {
    await markReconciliationRequired(firestore, proposal.proposalId)
    throw new HttpsError(
      'failed-precondition',
      'The proposal requires reconciliation before another confirmation.',
    )
  }

  throw new HttpsError('aborted', 'The proposal is already processing.')
}

async function createJobIfAbsent(
  firestore: Firestore,
  caller: TrustedProfile,
  proposal: ClaimedProposal,
) {
  const validation = validateJobCreation({
    ...proposal.payload,
    attachments: [],
    createdBy: caller.id,
    dueDate: proposal.payload.dueDate
      ? new Date(proposal.payload.dueDate)
      : null,
    organizationId: caller.organizationId,
  })

  if (!validation.isValid) {
    throw new DefinitePreWriteError(validation.errors.join(' '))
  }

  const jobReference = firestore.collection(JOBS_COLLECTION).doc(proposal.executionJobId)

  await firestore.runTransaction(async (transaction) => {
    const existingJob = await transaction.get(jobReference)

    if (existingJob.exists) {
      return
    }

    const timestamp = Timestamp.now()
    const auditReference = firestore.collection(AUDIT_LOGS_COLLECTION).doc()
    transaction.set(
      jobReference,
      buildNewJobDocument({
        createdAt: timestamp,
        createdBy: caller.id,
        dueDate: proposal.payload.dueDate
          ? new Date(proposal.payload.dueDate)
          : null,
        id: jobReference.id,
        organizationId: caller.organizationId,
        payload: proposal.payload,
        toTimestamp: (date) => Timestamp.fromDate(date),
      }),
    )
    transaction.set(auditReference, {
      id: auditReference.id,
      organizationId: caller.organizationId,
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp,
      actorId: caller.id,
      action: 'job_created',
      entityId: jobReference.id,
      entityType: 'job',
      metadata: {
        actionProposalId: proposal.proposalId,
        assignmentMode: 'action_proposal',
        jobId: jobReference.id,
      },
    })
  })

  return jobReference.id
}

async function completeProposal(
  firestore: Firestore,
  proposalId: string,
  jobId: string,
): Promise<CompletedProposal> {
  const proposalReference = firestore
    .collection(ACTION_PROPOSALS_COLLECTION)
    .doc(proposalId)

  await firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(proposalReference)

    if (!snapshot.exists || snapshot.data()?.status !== 'processing') {
      throw new HttpsError('failed-precondition', 'The proposal can no longer complete.')
    }

    const now = Timestamp.now()
    transaction.update(proposalReference, {
      completedAt: now,
      failureCode: null,
      failureSummary: null,
      resultJobId: jobId,
      status: 'completed',
      updatedAt: now,
      version: readNumber(snapshot.data()?.version, 1) + 1,
    })
  })

  return {
    jobId,
    proposalId,
    status: 'completed',
  }
}

async function findCompletedJob(
  firestore: Firestore,
  proposalId: string,
  jobId: string,
): Promise<CompletedProposal | null> {
  const jobSnapshot = await firestore.collection(JOBS_COLLECTION).doc(jobId).get()

  if (!jobSnapshot.exists) {
    return null
  }

  return completeProposal(firestore, proposalId, jobId)
}

async function markProposalFailed(
  firestore: Firestore,
  proposalId: string,
  summary: string,
) {
  await updateProcessingProposal(firestore, proposalId, {
    failureCode: 'prewrite_validation_failed',
    failureSummary: summary,
    status: failureStatusForExecution(true),
  })
}

async function markReconciliationRequired(firestore: Firestore, proposalId: string) {
  await updateProcessingProposal(firestore, proposalId, {
    failureCode: 'execution_uncertain',
    failureSummary: 'The server could not confirm whether the job write completed.',
    status: failureStatusForExecution(false),
  })
}

async function updateProcessingProposal(
  firestore: Firestore,
  proposalId: string,
  updates: {
    failureCode: string
    failureSummary: string
    status: 'failed' | 'reconciliation_required'
  },
) {
  const proposalReference = firestore
    .collection(ACTION_PROPOSALS_COLLECTION)
    .doc(proposalId)

  await firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(proposalReference)

    if (!snapshot.exists || snapshot.data()?.status !== 'processing') {
      return
    }

    transaction.update(proposalReference, {
      ...updates,
      updatedAt: Timestamp.now(),
      version: readNumber(snapshot.data()?.version, 1) + 1,
    })
  })
}

function validateStoredPayload(
  proposal: DocumentData,
  caller: TrustedProfile,
): CreateJobProposalPayload {
  const payload = readCreateJobPayload(proposal.payload)
  const validation = validateJobCreation({
    ...payload,
    attachments: [],
    createdBy: caller.id,
    dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
    organizationId: caller.organizationId,
  })

  if (!validation.isValid) {
    throw new HttpsError('failed-precondition', validation.errors.join(' '))
  }

  return payload
}

function readProposalId(data: unknown) {
  if (
    !data ||
    typeof data !== 'object' ||
    typeof (data as { proposalId?: unknown }).proposalId !== 'string'
  ) {
    throw new HttpsError('invalid-argument', 'A proposal ID is required.')
  }

  const proposalId = (data as { proposalId: string }).proposalId.trim()

  if (!proposalId || proposalId.length > 128) {
    throw new HttpsError('invalid-argument', 'A valid proposal ID is required.')
  }

  return proposalId
}

function readCreateJobPayload(value: unknown): CreateJobProposalPayload {
  if (!value || typeof value !== 'object') {
    throw new HttpsError('failed-precondition', 'The proposal payload is invalid.')
  }

  const payload = value as Record<string, unknown>
  const priority = readString(payload.priority)

  if (
    priority !== 'Low' &&
    priority !== 'Medium' &&
    priority !== 'High' &&
    priority !== 'Urgent'
  ) {
    throw new HttpsError('failed-precondition', 'The proposal priority is invalid.')
  }

  if (payload.dueDate !== null && typeof payload.dueDate !== 'string') {
    throw new HttpsError('failed-precondition', 'The proposal due date is invalid.')
  }

  return {
    customerName: readString(payload.customerName),
    customerPhone: readString(payload.customerPhone),
    description: readString(payload.description),
    dueDate: payload.dueDate,
    location: readString(payload.location),
    priority,
    requiredSkills: readStringArray(payload.requiredSkills),
    serviceAddress: readString(payload.serviceAddress),
    title: readString(payload.title),
  }
}

function readString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

function readTimestampOrNull(value: unknown) {
  return value instanceof Timestamp ? value : null
}

function readNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}
