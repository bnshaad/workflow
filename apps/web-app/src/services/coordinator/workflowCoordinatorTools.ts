import type { JobDraftSuggestion } from '../../types/coordinator'
import { jobUnderstandingService } from '../ai'
import { modelCoordinatorService } from '../ai'
import { actionProposalService } from '../actionProposals'
import { operationsIntelligenceService } from '../operations'
import { workforceRecommendationService } from '../recommendations'
import type { CoordinatorTools } from './workflowCoordinator'

export const workflowCoordinatorTools: CoordinatorTools = {
  async classifyCoordinatorIntent(profile, request) {
    return modelCoordinatorService.classifyIntent(profile, request)
  },

  async confirmCreateJobProposal(profile, proposalId) {
    return actionProposalService.confirmCreateJobProposal(profile, proposalId)
  },

  async createCreateJobProposal(profile, payload) {
    return actionProposalService.createCreateJobProposal(profile, payload)
  },

  async generateJobDraft(profile, customerRequest) {
    const suggestion = await jobUnderstandingService.generateJobDraftSuggestion(profile, {
      customerRequest,
    })

    return toJobDraftSuggestion(suggestion)
  },

  async getOperationsInsight(profile, intent, jobId) {
    return operationsIntelligenceService.getInsight(profile, intent, jobId)
  },

  async getWorkforceRecommendation(profile, jobId) {
    return workforceRecommendationService.recommendForJob(profile, jobId)
  },
}

function toJobDraftSuggestion(
  suggestion: Awaited<
    ReturnType<typeof jobUnderstandingService.generateJobDraftSuggestion>
  >,
): JobDraftSuggestion {
  return {
    customerName: suggestion.customerName,
    customerPhone: suggestion.customerPhone,
    description: suggestion.description,
    dueDate: suggestion.dueDate,
    location: suggestion.location,
    needsReview: suggestion.needsReview,
    priority: suggestion.priority,
    requiredSkills: suggestion.requiredSkills,
    serviceAddress: suggestion.serviceAddress,
    source: suggestion.source,
    title: suggestion.title,
  }
}
