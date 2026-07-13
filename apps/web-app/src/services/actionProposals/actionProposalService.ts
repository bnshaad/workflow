import {
  collection,
  doc,
  getDoc,
  setDoc,
  Timestamp,
  type DocumentData,
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { canCreateJob } from '@/permissions'
import { firebaseFunctions, firestore } from '@/config'
import { requireActiveProfile, requireTenantAccess } from '@/services/common'
import { messageForActionProposalCallableError } from './actionProposalMessages'
import type {
  ActionProposalExecutionResult,
  ActionProposalStatus,
  ProposedAction,
  ProposedCreateJobPayload,
  UserProfile,
} from '@/types'
import { validateCreateJob } from '@/validators/jobValidator'
import {
  hashProposalPayload,
  isActionProposalStatus,
} from '../../../../../shared/actionProposal.ts'

const ACTION_PROPOSALS_COLLECTION = 'actionProposals'
const PROPOSAL_LIFETIME_MS = 5 * 60_000

export class ActionProposalError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ActionProposalError'
  }
}

export const actionProposalService = {
  async createCreateJobProposal(
    profile: UserProfile,
    payload: ProposedCreateJobPayload,
  ): Promise<ProposedAction<ProposedCreateJobPayload>> {
    const activeProfile = requireActiveProfile(profile)
    const organizationId = requireTenantAccess(
      activeProfile,
      activeProfile.organizationId,
    )

    if (!canCreateJob(activeProfile)) {
      throw new ActionProposalError('You do not have permission to prepare jobs.')
    }

    const normalizedPayload = normalizeCreateJobPayload(payload)
    const validation = validateCreateJob({
      ...normalizedPayload,
      attachments: [],
      createdBy: activeProfile.id,
      dueDate: normalizedPayload.dueDate
        ? new Date(normalizedPayload.dueDate)
        : null,
      organizationId,
    })

    if (!validation.isValid) {
      throw new ActionProposalError(validation.errors.join(' '))
    }

    const reference = doc(collection(firestore, ACTION_PROPOSALS_COLLECTION))
    const createdAt = Timestamp.now()
    const proposal: ProposedAction<ProposedCreateJobPayload> = {
      actionType: 'create_job',
      completedAt: null,
      confirmedAt: null,
      createdAt: createdAt.toDate().toISOString(),
      expiresAt: Timestamp.fromMillis(
        createdAt.toMillis() + PROPOSAL_LIFETIME_MS,
      )
        .toDate()
        .toISOString(),
      failureCode: null,
      failureSummary: null,
      idempotencyKey: `create_job:${reference.id}`,
      organizationId,
      payload: normalizedPayload,
      payloadHash: hashProposalPayload(normalizedPayload),
      processingStartedAt: null,
      proposalId: reference.id,
      requestedBy: activeProfile.id,
      requiresConfirmation: true,
      resultJobId: null,
      status: 'prepared',
      summary: `Create job "${normalizedPayload.title}" for ${normalizedPayload.customerName}.`,
      updatedAt: createdAt.toDate().toISOString(),
      version: 1,
      warnings: [
        'This proposal creates a new job after explicit confirmation.',
        'Review all customer and scheduling details before confirming.',
      ],
    }

    await setDoc(reference, {
      ...proposal,
      createdAt,
      expiresAt: Timestamp.fromDate(new Date(proposal.expiresAt)),
      id: reference.id,
      isActive: true,
      updatedAt: createdAt,
    })

    return proposal
  },

  async getProposal(
    profile: UserProfile,
    proposalId: string,
  ): Promise<ProposedAction<ProposedCreateJobPayload> | null> {
    const activeProfile = requireActiveProfile(profile)
    requireTenantAccess(activeProfile, activeProfile.organizationId)
    requireProposalId(proposalId)

    const snapshot = await getDoc(
      doc(firestore, ACTION_PROPOSALS_COLLECTION, proposalId),
    )

    if (!snapshot.exists()) {
      return null
    }

    const proposal = mapProposal(snapshot.id, snapshot.data())

    if (
      proposal.organizationId !== activeProfile.organizationId ||
      proposal.requestedBy !== activeProfile.id
    ) {
      return null
    }

    return proposal
  },

  async confirmCreateJobProposal(
    profile: UserProfile,
    proposalId: string,
  ): Promise<ActionProposalExecutionResult> {
    const activeProfile = requireActiveProfile(profile)
    requireTenantAccess(activeProfile, activeProfile.organizationId)

    if (!canCreateJob(activeProfile)) {
      throw new ActionProposalError('You do not have permission to confirm jobs.')
    }

    requireProposalId(proposalId)
    const confirm = httpsCallable<
      { proposalId: string },
      ActionProposalExecutionResult
    >(firebaseFunctions, 'confirmCreateJobProposal')

    try {
      const result = await confirm({ proposalId })

      if (
        result.data.status !== 'completed' ||
        typeof result.data.jobId !== 'string' ||
        result.data.proposalId !== proposalId
      ) {
        throw new ActionProposalError('The trusted service returned an invalid result.')
      }

      return result.data
    } catch (error) {
      if (error instanceof ActionProposalError) {
        throw error
      }

      throw new ActionProposalError(messageForActionProposalCallableError(error))
    }
  },
}

function mapProposal(
  id: string,
  data: DocumentData,
): ProposedAction<ProposedCreateJobPayload> {
  const status = readProposalStatus(data.status)
  const payload = readCreateJobPayload(data.payload)

  return {
    actionType: 'create_job',
    completedAt: readTimestampOrNull(data.completedAt),
    confirmedAt: readTimestampOrNull(data.confirmedAt),
    createdAt: readTimestamp(data.createdAt),
    expiresAt: readTimestamp(data.expiresAt),
    failureCode: readStringOrNull(data.failureCode),
    failureSummary: readStringOrNull(data.failureSummary),
    idempotencyKey: readString(data.idempotencyKey),
    organizationId: readString(data.organizationId),
    payload,
    payloadHash: readString(data.payloadHash),
    processingStartedAt: readTimestampOrNull(data.processingStartedAt),
    proposalId: readString(data.id, id),
    requestedBy: readString(data.requestedBy),
    requiresConfirmation: true,
    resultJobId: readStringOrNull(data.resultJobId),
    status,
    summary: readString(data.summary),
    updatedAt: readTimestamp(data.updatedAt),
    version: typeof data.version === 'number' ? data.version : 1,
    warnings: readStringArray(data.warnings),
  }
}

function normalizeCreateJobPayload(payload: ProposedCreateJobPayload) {
  return {
    ...payload,
    customerName: payload.customerName.trim(),
    customerPhone: payload.customerPhone.trim(),
    description: payload.description.trim(),
    location: payload.location.trim(),
    requiredSkills: payload.requiredSkills.map((skill) => skill.trim()).filter(Boolean),
    serviceAddress: payload.serviceAddress.trim(),
    title: payload.title.trim(),
  }
}

function readCreateJobPayload(value: unknown): ProposedCreateJobPayload {
  const data = value && typeof value === 'object' ? (value as DocumentData) : {}

  return {
    customerName: readString(data.customerName),
    customerPhone: readString(data.customerPhone),
    description: readString(data.description),
    dueDate: typeof data.dueDate === 'string' ? data.dueDate : null,
    location: readString(data.location),
    priority: readPriority(data.priority),
    requiredSkills: readStringArray(data.requiredSkills),
    serviceAddress: readString(data.serviceAddress),
    title: readString(data.title),
  }
}

function readPriority(value: unknown): ProposedCreateJobPayload['priority'] {
  return value === 'Low' || value === 'High' || value === 'Urgent'
    ? value
    : 'Medium'
}

function readProposalStatus(value: unknown): ActionProposalStatus {
  return isActionProposalStatus(value) ? value : 'failed'
}

function requireProposalId(proposalId: string) {
  if (proposalId.trim().length === 0 || proposalId.length > 128) {
    throw new ActionProposalError('A valid proposal ID is required.')
  }
}

function readString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function readStringOrNull(value: unknown) {
  return typeof value === 'string' ? value : null
}

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

function readTimestamp(value: unknown) {
  return value instanceof Timestamp ? value.toDate().toISOString() : new Date(0).toISOString()
}

function readTimestampOrNull(value: unknown) {
  return value instanceof Timestamp ? value.toDate().toISOString() : null
}
