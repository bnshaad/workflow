export type ProposalConfirmationDecision =
  | { kind: 'claim' }
  | { kind: 'completed'; jobId: string }
  | { kind: 'processing' }
  | {
      kind: 'rejected'
      code: 'deadline-exceeded' | 'failed-precondition' | 'invalid-argument' | 'permission-denied'
      failureCode?: 'expired' | 'payload_invalid'
      message: string
    }

type ProposalConfirmationInput = {
  actionType: unknown
  callerOrganizationId: string
  callerUserId: string
  expiresAtMillis: number | null
  organizationId: unknown
  payloadHashMatches: boolean
  requestedBy: unknown
  resultJobId: unknown
  status: unknown
}

export function evaluateProposalConfirmation(
  input: ProposalConfirmationInput,
): ProposalConfirmationDecision {
  if (
    input.requestedBy !== input.callerUserId ||
    input.organizationId !== input.callerOrganizationId
  ) {
    return {
      code: 'permission-denied',
      kind: 'rejected',
      message: 'The proposal does not belong to this user.',
    }
  }

  if (input.actionType !== 'create_job') {
    return {
      code: 'invalid-argument',
      kind: 'rejected',
      message: 'The proposal action is not supported.',
    }
  }

  if (input.status === 'completed') {
    return typeof input.resultJobId === 'string' && input.resultJobId.length > 0
      ? { jobId: input.resultJobId, kind: 'completed' }
      : {
          code: 'failed-precondition',
          kind: 'rejected',
          message: 'The completed proposal does not contain a job result.',
        }
  }

  if (input.status === 'processing') {
    return { kind: 'processing' }
  }

  if (input.status !== 'prepared') {
    return {
      code: 'failed-precondition',
      kind: 'rejected',
      message: 'The proposal is not available for confirmation.',
    }
  }

  if (
    input.expiresAtMillis === null ||
    input.expiresAtMillis <= Date.now()
  ) {
    return {
      code: 'deadline-exceeded',
      failureCode: 'expired',
      kind: 'rejected',
      message: 'The proposal has expired.',
    }
  }

  if (!input.payloadHashMatches) {
    return {
      code: 'failed-precondition',
      failureCode: 'payload_invalid',
      kind: 'rejected',
      message: 'The proposal payload was modified.',
    }
  }

  return { kind: 'claim' }
}

export function failureStatusForExecution(isDefinite: boolean) {
  return isDefinite ? 'failed' : 'reconciliation_required'
}
