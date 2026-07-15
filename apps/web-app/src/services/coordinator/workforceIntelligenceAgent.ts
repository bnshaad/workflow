import type { UserProfile } from '../../types/user.ts'
import type {
  WorkforceIntelligenceResult,
  WorkforceIntent,
  WorkforceRecommendationResult,
} from '../../../../../shared/workforceIntelligence.ts'

export type WorkforceIntelligenceTools = {
  getRecommendation: (
    profile: UserProfile,
    jobId: string,
  ) => Promise<WorkforceRecommendationResult>
}

export class WorkforceIntelligenceAgent {
  private readonly tools: WorkforceIntelligenceTools

  constructor(tools: WorkforceIntelligenceTools) {
    this.tools = tools
  }

  async handle(
    profile: UserProfile,
    intent: WorkforceIntent,
    jobId: string,
  ): Promise<WorkforceIntelligenceResult> {
    const recommendation = await this.tools.getRecommendation(profile, jobId)

    return {
      ...recommendation,
      intent,
      summary: buildGroundedSummary(intent, recommendation),
    }
  }
}

function buildGroundedSummary(
  intent: WorkforceIntent,
  result: WorkforceRecommendationResult,
) {
  const topCandidate = result.candidates[0]
  if (!topCandidate) {
    return ['No eligible employees were found by the deterministic engine.']
  }

  if (intent === 'compare_top_candidates') {
    return result.candidates.slice(0, 2).map((candidate) =>
      [
        `${candidate.employeeName} is ranked #${candidate.rank} with score ${candidate.score}.`,
        ...candidate.reasons,
      ].join(' '),
    )
  }

  return [
    `${topCandidate.employeeName} is ranked #${topCandidate.rank} with score ${topCandidate.score}.`,
    ...topCandidate.reasons,
  ]
}
