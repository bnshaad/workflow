import { logger } from 'firebase-functions'
import { HttpsError, type CallableRequest } from 'firebase-functions/v2/https'
import { requireTrustedManager } from '../auth/requireTrustedManager.js'
import {
  createModelCoordinatorService,
  toPublicModelError,
  type ModelClassificationInput,
} from './modelCoordinatorService.js'
import type { StructuredModelProvider } from './modelProvider.js'

const MAX_REQUEST_LENGTH = 2_000
const MAX_REQUEST_BYTES = 4_096

export function createModelCallableHandlers(provider: StructuredModelProvider) {
  const service = createService(provider)

  return {
    async classifyCoordinatorIntent(request: CallableRequest<unknown>) {
      await requireTrustedManager(request)
      const input = readClassificationInput(request.data)

      try {
        const result = await service.classifyIntent(input)
        logger.info('model_intent_classification', {
          confidence: result.confidence,
          intent: result.intent,
          requestLength: input.message.length,
        })
        return result
      } catch (error) {
        logModelFailure('intent_classification', input.message.length, error)
        throw asHttpsError(error)
      }
    },

    async draftJobFromRequest(request: CallableRequest<unknown>) {
      await requireTrustedManager(request)
      const customerRequest = readCustomerRequest(request.data)

      try {
        const result = await service.draftJob(customerRequest)
        logger.info('model_job_draft', {
          requestLength: customerRequest.length,
          warningCount: result.warnings.length,
        })
        return result
      } catch (error) {
        logModelFailure('job_draft', customerRequest.length, error)
        throw asHttpsError(error)
      }
    },
  }
}

function createService(provider: StructuredModelProvider) {
  return createModelCoordinatorService(provider)
}

function readClassificationInput(value: unknown): ModelClassificationInput {
  assertBoundedPayload(value)

  if (!value || typeof value !== 'object') {
    throw new HttpsError('invalid-argument', 'A request is required.')
  }

  const data = value as Record<string, unknown>
  return {
    message: readBoundedString(data.message, 'message'),
    uiContext:
      typeof data.uiContext === 'string' && data.uiContext.length <= 32
        ? data.uiContext
        : 'unknown',
  }
}

function readCustomerRequest(value: unknown) {
  assertBoundedPayload(value)

  if (!value || typeof value !== 'object') {
    throw new HttpsError('invalid-argument', 'A customer request is required.')
  }

  return readBoundedString(
    (value as Record<string, unknown>).customerRequest,
    'customer request',
  )
}

function readBoundedString(value: unknown, label: string) {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > MAX_REQUEST_LENGTH) {
    throw new HttpsError('invalid-argument', `A valid ${label} is required.`)
  }

  return value.trim()
}

function assertBoundedPayload(value: unknown) {
  try {
    if (JSON.stringify(value).length > MAX_REQUEST_BYTES) {
      throw new HttpsError('invalid-argument', 'The request is too large.')
    }
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error
    }

    throw new HttpsError('invalid-argument', 'The request is invalid.')
  }
}

function asHttpsError(error: unknown) {
  const publicError = toPublicModelError(error)
  return new HttpsError(publicError.code, publicError.message)
}

function logModelFailure(operation: string, requestLength: number, error: unknown) {
  logger.warn('model_request_failed', {
    errorKind: error instanceof Error ? error.name : 'unknown',
    operation,
    requestLength,
  })
}
