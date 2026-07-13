import { httpsCallable } from 'firebase/functions'
import { canCreateJob } from '@/permissions'
import { firebaseFunctions } from '@/config'
import { requireActiveProfile } from '@/services/common'
import type { CoordinatorRequest, UserProfile } from '@/types'
import {
  isModelCoordinatorIntent,
  type ModelIntentClassification,
  type ModelJobDraft,
} from '../../../../../shared/coordinatorModel.ts'

export class ModelCoordinatorError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ModelCoordinatorError'
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
    const draft = httpsCallable<{ customerRequest: string }, ModelJobDraft>(
      firebaseFunctions,
      'draftJobFromRequest',
    )

    try {
      const result = await draft({ customerRequest })

      if (!isJobDraft(result.data)) {
        throw new ModelCoordinatorError('The drafting service returned invalid data.')
      }

      return result.data
    } catch (error) {
      if (error instanceof ModelCoordinatorError) {
        throw error
      }

      throw new ModelCoordinatorError(
        'AI drafting is temporarily unavailable. Complete the form manually.',
      )
    }
  },
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
    Array.isArray((value as ModelJobDraft).requiredSkills) &&
    Array.isArray((value as ModelJobDraft).missingFields) &&
    Array.isArray((value as ModelJobDraft).uncertainFields) &&
    Array.isArray((value as ModelJobDraft).warnings)
  )
}
