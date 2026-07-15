import {
  SupportedCoordinatorIntents,
  type CoordinatorRequest,
  type CoordinatorRoute,
  type ProposedCreateJobPayload,
} from '../../types/coordinator.ts'
import { JOB_PRIORITY_VALUES } from '../../types/jobPriority.ts'
import { hashProposalPayload } from '../../../../../shared/actionProposal.ts'

const VALID_CREATE_JOB_CONTEXTS = new Set(['create_job', 'unknown'])
const VALID_WORKFORCE_CONTEXTS = new Set(['job_details', 'unknown'])
const VALID_OPERATIONS_CONTEXTS = new Set([
  'dashboard',
  'job_details',
  'jobs',
  'unknown',
])

export const COORDINATOR_LIMITS = {
  classificationConfidenceThreshold: 0.8,
  maxModelCalls: 1,
  maxSteps: 3,
  maxToolCalls: 2,
  modelToolTimeoutMs: 6_000,
  readToolTimeoutMs: 4_000,
  proposalLifetimeMs: 5 * 60_000,
} as const

export const AGENT_TOOL_ALLOWLIST = {
  job_intelligence: [
    'generate_job_draft',
    'prepare_create_job_proposal',
  ],
  knowledge: [],
  operations_insight: ['get_operations_insight'],
  workforce_intelligence: ['get_workforce_recommendation'],
} as const

const FALLBACK_ROUTE: CoordinatorRoute = {
  agent: 'operations_insight',
  confidence: 0,
  intent: null,
  reason: 'The request does not exactly match a supported coordinator command.',
  toolName: null,
}

export function routeCoordinatorRequest(
  request: CoordinatorRequest,
): CoordinatorRoute {
  const message = normalizeCommand(request.message)

  if (
    VALID_OPERATIONS_CONTEXTS.has(request.uiContext) &&
    matches(message, ['show urgent unassigned jobs', 'urgent unassigned jobs'])
  ) {
    return deterministicRoute(
      SupportedCoordinatorIntents.ShowUrgentUnassignedJobs,
      'operations_insight',
      'get_operations_insight',
    )
  }

  if (
    VALID_OPERATIONS_CONTEXTS.has(request.uiContext) &&
    matches(message, ['show overdue jobs', 'overdue jobs'])
  ) {
    return deterministicRoute(
      SupportedCoordinatorIntents.ShowOverdueJobs,
      'operations_insight',
      'get_operations_insight',
    )
  }

  if (
    VALID_OPERATIONS_CONTEXTS.has(request.uiContext) &&
    matches(message, ['show jobs requiring attention', 'what needs attention today'])
  ) {
    return deterministicRoute(
      SupportedCoordinatorIntents.ShowJobsRequiringAttention,
      'operations_insight',
      'get_operations_insight',
    )
  }

  if (
    VALID_OPERATIONS_CONTEXTS.has(request.uiContext) &&
    matches(message, [
      'show workforce workload distribution',
      'show workload distribution',
      'show employee workload',
      'which technicians are overloaded',
    ])
  ) {
    return deterministicRoute(
      SupportedCoordinatorIntents.ShowWorkloadDistribution,
      'operations_insight',
      'get_operations_insight',
    )
  }

  if (
    VALID_OPERATIONS_CONTEXTS.has(request.uiContext) &&
    matches(message, [
      'summarize current open operations',
      'summarize open operations',
      'summarize open jobs',
      'show open jobs summary',
    ])
  ) {
    return deterministicRoute(
      SupportedCoordinatorIntents.SummarizeOpenOperations,
      'operations_insight',
      'get_operations_insight',
    )
  }

  if (
    VALID_OPERATIONS_CONTEXTS.has(request.uiContext) &&
    Boolean(request.jobId?.trim()) &&
    matches(message, [
      'explain job attention flag',
      'why is this job flagged',
    ])
  ) {
    return deterministicRoute(
      SupportedCoordinatorIntents.ExplainJobAttentionFlag,
      'operations_insight',
      'get_operations_insight',
    )
  }

  if (
    VALID_WORKFORCE_CONTEXTS.has(request.uiContext) &&
    matches(message, [
      'recommend employee for job',
      'who is the best technician for this job',
    ])
  ) {
    return deterministicRoute(
      SupportedCoordinatorIntents.RecommendEmployeeForJob,
      'workforce_intelligence',
      'get_workforce_recommendation',
    )
  }

  if (
    VALID_WORKFORCE_CONTEXTS.has(request.uiContext) &&
    matches(message, ['explain recommendation', 'why is this employee recommended'])
  ) {
    return deterministicRoute(
      SupportedCoordinatorIntents.ExplainRecommendation,
      'workforce_intelligence',
      'get_workforce_recommendation',
    )
  }

  if (
    VALID_WORKFORCE_CONTEXTS.has(request.uiContext) &&
    matches(message, [
      'compare top candidates',
      'compare the top two employees for this job',
    ])
  ) {
    return deterministicRoute(
      SupportedCoordinatorIntents.CompareTopCandidates,
      'workforce_intelligence',
      'get_workforce_recommendation',
    )
  }

  if (
    VALID_CREATE_JOB_CONTEXTS.has(request.uiContext) &&
    Boolean(request.customerRequest?.trim()) &&
    matches(message, ['prepare job draft', 'create job draft'])
  ) {
    return deterministicRoute(
      SupportedCoordinatorIntents.PrepareJobDraft,
      'job_intelligence',
      'generate_job_draft',
    )
  }

  if (
    VALID_CREATE_JOB_CONTEXTS.has(request.uiContext) &&
    request.createJobInput !== undefined &&
    matches(message, ['prepare job creation', 'review job before creating'])
  ) {
    return deterministicRoute(
      SupportedCoordinatorIntents.PrepareCreateJobProposal,
      'job_intelligence',
      'prepare_create_job_proposal',
    )
  }

  return FALLBACK_ROUTE
}

export function validateProposedCreateJobPayload(
  payload: ProposedCreateJobPayload,
) {
  const errors: string[] = []

  for (const [field, value] of Object.entries(payload)) {
    if (
      ['title', 'description', 'customerName', 'customerPhone', 'serviceAddress'].includes(
        field,
      ) &&
      (typeof value !== 'string' || value.trim().length === 0)
    ) {
      errors.push(`${field} is required.`)
    }
  }

  if (!Array.isArray(payload.requiredSkills)) {
    errors.push('requiredSkills must be a list.')
  }

  if (!JOB_PRIORITY_VALUES.includes(payload.priority)) {
    errors.push('priority is invalid.')
  }

  if (payload.dueDate !== null && !isValidIsoDate(payload.dueDate)) {
    errors.push('dueDate must be a valid ISO date string or null.')
  }

  return {
    errors,
    isValid: errors.length === 0,
  }
}

export function hashPayload(payload: unknown) {
  return hashProposalPayload(payload)
}

export function cloneStructured<TValue>(value: TValue): TValue {
  return JSON.parse(JSON.stringify(value)) as TValue
}

function deterministicRoute(
  intent: CoordinatorRoute['intent'],
  agent: CoordinatorRoute['agent'],
  toolName: string,
): CoordinatorRoute {
  return {
    agent,
    confidence: 1,
    intent,
    reason: 'Matched a supported deterministic command for the current workflow.',
    toolName,
  }
}

function isValidIsoDate(value: string) {
  return !Number.isNaN(Date.parse(value))
}

function matches(message: string, commands: string[]) {
  return commands.includes(message)
}

function normalizeCommand(message: string) {
  return message
    .trim()
    .toLowerCase()
    .replace(/[.!?]+$/, '')
    .replace(/\s+/g, ' ')
}
