import { JobPriorities, JobStatuses } from '../../types'
import type {
  JobDraftSuggestion,
  OpenJobsSummary,
  UrgentUnassignedJob,
  WorkloadSnapshot,
} from '../../types/coordinator'
import { getDashboardJobMetrics, getEmployeeWorkloadSummary } from '../dashboard'
import { jobUnderstandingService } from '../ai'
import { modelCoordinatorService } from '../ai'
import { actionProposalService } from '../actionProposals'
import { jobService } from '../jobs'
import type { CoordinatorTools } from './workflowCoordinator'

const MAX_URGENT_UNASSIGNED_JOBS = 20
const MAX_WORKLOAD_EMPLOYEES = 10

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

  async getOpenJobsSummary(profile): Promise<OpenJobsSummary> {
    const metrics = await getDashboardJobMetrics(profile, profile.organizationId)

    return {
      openJobCount: metrics.statusCounts[JobStatuses.Open],
      totalJobCount: metrics.totalJobs,
    }
  },

  async getUrgentUnassignedJobs(profile): Promise<UrgentUnassignedJob[]> {
    const jobs = await jobService.listJobs(profile, profile.organizationId, {
      limit: MAX_URGENT_UNASSIGNED_JOBS,
    })

    return jobs
      .filter(
        (job) =>
          job.status === JobStatuses.Open &&
          job.priority === JobPriorities.Urgent &&
          job.assignedEmployeeIds.length === 0,
      )
      .slice(0, MAX_URGENT_UNASSIGNED_JOBS)
      .map((job) => ({
        dueDate: job.dueDate?.toDate().toISOString() ?? null,
        id: job.id,
        priority: job.priority,
        title: job.title,
      }))
  },

  async getWorkloadSnapshot(profile): Promise<WorkloadSnapshot> {
    const workload = await getEmployeeWorkloadSummary(profile, profile.organizationId)

    return {
      employees: workload.slice(0, MAX_WORKLOAD_EMPLOYEES),
      note:
        'No organization workload threshold is configured. Employees are shown by active job count.',
    }
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
