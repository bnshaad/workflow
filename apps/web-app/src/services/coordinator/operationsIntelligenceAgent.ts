import type { UserProfile } from '../../types/user.ts'
import {
  buildGroundedOperationsSummary,
  type OperationsIntelligenceResult,
  type OperationsIntent,
  type OperationsToolResult,
} from '../../../../../shared/operationsIntelligence.ts'

export type OperationsIntelligenceTools = {
  getInsight: (
    profile: UserProfile,
    intent: OperationsIntent,
    jobId?: string,
  ) => Promise<OperationsToolResult>
}

export class OperationsIntelligenceAgent {
  private readonly tools: OperationsIntelligenceTools

  constructor(tools: OperationsIntelligenceTools) {
    this.tools = tools
  }

  async handle(
    profile: UserProfile,
    intent: OperationsIntent,
    jobId?: string,
  ): Promise<OperationsIntelligenceResult> {
    const data = await this.tools.getInsight(profile, intent, jobId)

    if (data.intent !== intent) {
      throw new Error('The operations tool returned a mismatched intent.')
    }

    return {
      data,
      intent,
      summary: buildGroundedOperationsSummary(data),
    }
  }
}
