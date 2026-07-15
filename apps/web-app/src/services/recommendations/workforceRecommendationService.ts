import { httpsCallable } from 'firebase/functions'
import { canAssignWorker } from '@/permissions'
import { firebaseFunctions } from '@/config'
import { requireActiveProfile } from '@/services/common'
import type { UserProfile } from '@/types'
import type { WorkforceRecommendationResult } from '../../../../../shared/workforceIntelligence.ts'

export class WorkforceRecommendationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WorkforceRecommendationError'
  }
}

export const workforceRecommendationService = {
  async recommendForJob(
    profile: UserProfile,
    jobId: string,
  ): Promise<WorkforceRecommendationResult> {
    const activeProfile = requireActiveProfile(profile)
    if (!canAssignWorker(activeProfile)) {
      throw new WorkforceRecommendationError(
        'You do not have permission to view workforce recommendations.',
      )
    }

    const getRecommendation = httpsCallable<
      { jobId: string },
      WorkforceRecommendationResult
    >(firebaseFunctions, 'getWorkforceRecommendation')

    try {
      const result = await getRecommendation({ jobId })
      assertWorkforceRecommendation(result.data, jobId)
      return result.data
    } catch (error) {
      if (error instanceof WorkforceRecommendationError) {
        throw error
      }

      throw new WorkforceRecommendationError(
        'The workforce recommendation could not be loaded safely.',
      )
    }
  },
}

function assertWorkforceRecommendation(
  value: WorkforceRecommendationResult,
  jobId: string,
): asserts value is WorkforceRecommendationResult {
  if (
    !value ||
    value.jobId !== jobId ||
    value.engineVersion !== 'rule-based-v1' ||
    !Array.isArray(value.candidates) ||
    value.candidates.length > 5 ||
    value.candidates.some(
      (candidate, index) =>
        candidate.rank !== index + 1 ||
        typeof candidate.score !== 'number' ||
        !Array.isArray(candidate.reasons) ||
        !Array.isArray(candidate.warnings),
    )
  ) {
    throw new WorkforceRecommendationError(
      'The workforce recommendation returned invalid data.',
    )
  }
}
