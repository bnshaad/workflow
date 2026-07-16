import { httpsCallable } from 'firebase/functions'
import { canCreateJob } from '@/permissions'
import { firebaseFunctions, firebaseRuntime } from '@/config'
import { requireActiveProfile } from '@/services/common'
import type { CoordinatorRequest, UserProfile } from '@/types'
import {
  isModelCoordinatorIntent,
  type ModelIntentClassification,
  type ModelJobDraft,
} from '../../../../../shared/coordinatorModel.ts'

export type ModelCoordinatorErrorCode =
  | 'authentication_required'
  | 'callable_unavailable'
  | 'configuration_missing'
  | 'emulator_unavailable'
  | 'invalid_request'
  | 'invalid_response'
  | 'network_failure'
  | 'permission_denied'
  | 'provider_unavailable'
  | 'quota_exhausted'
  | 'schema_rejection'
  | 'timeout'
  | 'unknown_failure'

export type ModelCoordinatorDiagnostics = {
  callableStatus: string
  durationMs: number
  normalizedErrorCode: ModelCoordinatorErrorCode
}

type DraftCallableLogDiagnostics = {
  callableStatus: string
  durationMs: number
  normalizedErrorCode: ModelCoordinatorErrorCode | 'none'
}

export class ModelCoordinatorError extends Error {
  readonly diagnostics?: ModelCoordinatorDiagnostics

  constructor(
    message: string,
    diagnostics?: ModelCoordinatorDiagnostics,
  ) {
    super(message)
    this.name = 'ModelCoordinatorError'
    this.diagnostics = diagnostics
  }
}

export const modelCoordinatorService = {
  async classifyIntent(
    profile: UserProfile,
    request: Pick<CoordinatorRequest, 'message' | 'uiContext'>,
  ): Promise<ModelIntentClassification> {
    requireManagerProfile(profile)
    const classify = httpsCallable<
      { message: string; uiContext: CoordinatorRequest['uiContext'] },
      ModelIntentClassification
    >(firebaseFunctions, 'classifyCoordinatorIntent')

    try {
      const result = await classify({
        message: request.message,
        uiContext: request.uiContext,
      })

      if (!isIntentClassification(result.data)) {
        throw new ModelCoordinatorError('The classifier returned invalid data.')
      }

      return result.data
    } catch (error) {
      if (error instanceof ModelCoordinatorError) {
        throw error
      }

      throw new ModelCoordinatorError(
        'The request could not be classified safely. Use the existing Workflow screens.',
      )
    }
  },

  async draftJob(
    profile: UserProfile,
    customerRequest: string,
  ): Promise<ModelJobDraft> {
    requireManagerProfile(profile)
    const callableName = 'draftJobFromRequest'
    const startedAt = performance.now()
    const draft = httpsCallable<{ customerRequest: string }, ModelJobDraft>(
      firebaseFunctions,
      callableName,
    )

    try {
      const result = await draft({ customerRequest })
      const durationMs = elapsedMilliseconds(startedAt)

      if (!isJobDraft(result.data)) {
        throw new ModelCoordinatorError(
          'AI drafting returned an invalid response. Complete the form manually.',
          {
            callableStatus: 'invalid-response',
            durationMs,
            normalizedErrorCode: 'invalid_response',
          },
        )
      }

      logDraftCallableResult(callableName, {
        callableStatus: 'succeeded',
        durationMs,
        normalizedErrorCode: 'none',
      })
      return result.data
    } catch (error) {
      const mappedError =
        error instanceof ModelCoordinatorError
          ? error
          : mapDraftCallableError(error, elapsedMilliseconds(startedAt))
      logDraftCallableResult(
        callableName,
        mappedError.diagnostics ?? {
          callableStatus: 'unknown',
          durationMs: elapsedMilliseconds(startedAt),
          normalizedErrorCode: 'unknown_failure',
        },
      )
      throw mappedError
    }
  },
}

function mapDraftCallableError(
  error: unknown,
  durationMs: number,
): ModelCoordinatorError {
  const callableStatus = readCallableStatus(error)
  const serverCategory = readServerCategory(error)
  const message = readErrorMessage(error)
  const diagnostics = (
    normalizedErrorCode: ModelCoordinatorErrorCode,
  ): ModelCoordinatorDiagnostics => ({
    callableStatus,
    durationMs,
    normalizedErrorCode,
  })

  if (callableStatus === 'functions/unauthenticated') {
    return new ModelCoordinatorError(
      'Your sign-in has expired. Sign in again before generating a draft.',
      diagnostics('authentication_required'),
    )
  }
  if (callableStatus === 'functions/permission-denied') {
    return new ModelCoordinatorError(
      'You do not have permission to use AI drafting.',
      diagnostics('permission_denied'),
    )
  }
  if (callableStatus === 'functions/deadline-exceeded') {
    return new ModelCoordinatorError(
      'AI drafting timed out. Review the request and try again.',
      diagnostics('timeout'),
    )
  }
  if (callableStatus === 'functions/resource-exhausted') {
    return new ModelCoordinatorError(
      'AI drafting is temporarily unavailable. Complete the form manually.',
      diagnostics('quota_exhausted'),
    )
  }
  if (serverCategory === 'schema_rejection') {
    return new ModelCoordinatorError(
      'The AI provider rejected the draft schema. Complete the form manually.',
      diagnostics('schema_rejection'),
    )
  }
  if (
    serverCategory === 'invalid_response' ||
    callableStatus === 'functions/data-loss'
  ) {
    return new ModelCoordinatorError(
      'AI drafting returned an invalid response. Complete the form manually.',
      diagnostics('invalid_response'),
    )
  }
  if (callableStatus === 'functions/invalid-argument') {
    return new ModelCoordinatorError(
      'The drafting request was rejected. Review the request and try again.',
      diagnostics('invalid_request'),
    )
  }
  if (callableStatus === 'functions/failed-precondition') {
    return new ModelCoordinatorError(
      'AI drafting is not configured for this environment.',
      diagnostics('configuration_missing'),
    )
  }
  if (
    callableStatus === 'functions/unavailable' &&
    (serverCategory === 'provider_unavailable' ||
      /AI drafting|drafting service/i.test(message))
  ) {
    return new ModelCoordinatorError(
      'AI drafting is temporarily unavailable. Complete the form manually.',
      diagnostics('provider_unavailable'),
    )
  }
  if (
    callableStatus === 'functions/not-found' ||
    callableStatus === 'functions/unimplemented' ||
    callableStatus === 'functions/internal'
  ) {
    return new ModelCoordinatorError(
      import.meta.env.DEV
        ? 'The AI drafting callable is unavailable. Check the Functions emulator and try again.'
        : 'The AI drafting callable is unavailable. Please try again later.',
      diagnostics('callable_unavailable'),
    )
  }
  if (callableStatus === 'functions/unavailable') {
    return new ModelCoordinatorError(
      firebaseRuntime.functionsMode === 'emulator'
        ? 'The Functions emulator is unavailable. Start it and try again.'
        : 'The AI drafting service could not be reached. Please try again.',
      diagnostics(
        firebaseRuntime.functionsMode === 'emulator'
          ? 'emulator_unavailable'
          : 'network_failure',
      ),
    )
  }

  return new ModelCoordinatorError(
    'Unable to generate an AI draft. Please try again.',
    diagnostics('unknown_failure'),
  )
}

function logDraftCallableResult(
  callableName: string,
  diagnostics: DraftCallableLogDiagnostics,
) {
  if (!import.meta.env.DEV) return

  const metadata = {
    callableName,
    callableStatus: diagnostics.callableStatus,
    callableUrl: `${firebaseRuntime.functionsUrl}/${callableName}`,
    durationMs: diagnostics.durationMs,
    mode: firebaseRuntime.functionsMode,
    normalizedErrorCode: diagnostics.normalizedErrorCode,
  }

  if (diagnostics.callableStatus === 'succeeded') {
    console.info('firebase_callable_request', metadata)
  } else {
    console.warn('firebase_callable_request', metadata)
  }
}

function elapsedMilliseconds(startedAt: number) {
  return Math.max(0, Math.round(performance.now() - startedAt))
}

function readCallableStatus(error: unknown) {
  return error &&
    typeof error === 'object' &&
    typeof (error as { code?: unknown }).code === 'string'
    ? (error as { code: string }).code
    : 'unknown'
}

function readServerCategory(error: unknown) {
  if (!error || typeof error !== 'object') return null
  const details = (error as { details?: unknown }).details
  return details &&
    typeof details === 'object' &&
    typeof (details as { category?: unknown }).category === 'string'
    ? (details as { category: string }).category
    : null
}

function readErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : ''
}

function requireManagerProfile(profile: UserProfile) {
  const activeProfile = requireActiveProfile(profile)

  if (!canCreateJob(activeProfile)) {
    throw new ModelCoordinatorError('You do not have permission to use AI drafting.')
  }

  return activeProfile
}

function isIntentClassification(value: unknown): value is ModelIntentClassification {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    isModelCoordinatorIntent((value as ModelIntentClassification).intent) &&
    typeof (value as ModelIntentClassification).confidence === 'number' &&
    Number.isFinite((value as ModelIntentClassification).confidence) &&
    (value as ModelIntentClassification).confidence >= 0 &&
    (value as ModelIntentClassification).confidence <= 1 &&
    typeof (value as ModelIntentClassification).requiresClarification === 'boolean'
  )
}

function isJobDraft(value: unknown): value is ModelJobDraft {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    typeof (value as ModelJobDraft).title === 'string' &&
    typeof (value as ModelJobDraft).description === 'string' &&
    typeof (value as ModelJobDraft).customerName === 'string' &&
    typeof (value as ModelJobDraft).customerPhone === 'string' &&
    typeof (value as ModelJobDraft).serviceAddress === 'string' &&
    typeof (value as ModelJobDraft).location === 'string' &&
    typeof (value as ModelJobDraft).serviceType === 'string' &&
    (typeof (value as ModelJobDraft).dueDate === 'string' ||
      (value as ModelJobDraft).dueDate === null) &&
    isStringArray((value as ModelJobDraft).requiredSkills) &&
    isStringArray((value as ModelJobDraft).missingFields) &&
    isStringArray((value as ModelJobDraft).uncertainFields) &&
    isStringArray((value as ModelJobDraft).warnings)
  )
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}
