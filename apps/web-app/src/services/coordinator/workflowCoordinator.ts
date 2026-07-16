import type {
  ActionProposalExecutionResult,
  CoordinatorExecution,
  CoordinatorFallback,
  CoordinatorRequest,
  CoordinatorResponse,
  CoordinatorRoute,
  JobDraftSuggestion,
  ModelIntentClassification,
  OperationsIntelligenceResult,
  ProposedAction,
  ProposedCreateJobPayload,
  WorkforceIntelligenceResult,
} from '../../types/coordinator'
import type { UserProfile } from '../../types/user'
import {
  COORDINATOR_LIMITS,
  routeCoordinatorRequest,
  validateProposedCreateJobPayload,
} from './coordinatorRules.ts'
import { WorkforceIntelligenceAgent } from './workforceIntelligenceAgent.ts'
import { OperationsIntelligenceAgent } from './operationsIntelligenceAgent.ts'
import { isModelCoordinatorIntent } from '../../../../../shared/coordinatorModel.ts'
import type {
  WorkforceIntent,
  WorkforceRecommendationResult,
} from '../../../../../shared/workforceIntelligence.ts'
import {
  isOperationsIntent,
  type OperationsIntent,
  type OperationsToolResult,
} from '../../../../../shared/operationsIntelligence.ts'
import {
  createCoordinatorTelemetryEvent,
  type CoordinatorErrorCategory,
  type CoordinatorTelemetryEvent,
} from './coordinatorTelemetry.ts'

export type CoordinatorTools = {
  classifyCoordinatorIntent: (
    profile: UserProfile,
    request: Pick<CoordinatorRequest, 'message' | 'uiContext'>,
  ) => Promise<ModelIntentClassification>
  confirmCreateJobProposal: (
    profile: UserProfile,
    proposalId: string,
  ) => Promise<ActionProposalExecutionResult>
  createCreateJobProposal: (
    profile: UserProfile,
    payload: ProposedCreateJobPayload,
  ) => Promise<ProposedAction<ProposedCreateJobPayload>>
  generateJobDraft: (
    profile: UserProfile,
    customerRequest: string,
  ) => Promise<JobDraftSuggestion>
  getOperationsInsight: (
    profile: UserProfile,
    intent: OperationsIntent,
    jobId?: string,
  ) => Promise<OperationsToolResult>
  getWorkforceRecommendation: (
    profile: UserProfile,
    jobId: string,
  ) => Promise<WorkforceRecommendationResult>
}

export type CoordinatorOperationalEvent = {
  correlationId: string
  intent: string | null
  outcome: 'fallback' | 'rejected' | 'succeeded'
  toolCalls: number
}

export type WorkflowCoordinatorOptions = {
  createId?: () => string
  now?: () => number
  onOperationalEvent?: (event: CoordinatorOperationalEvent) => void
  onTelemetryEvent?: (event: CoordinatorTelemetryEvent) => void
  tools: CoordinatorTools
}

export class CoordinatorValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CoordinatorValidationError'
  }
}

/**
 * This coordinator only routes fixed commands. It does not accept authority,
 * organization IDs, or permissions from a request payload.
 */
export class WorkflowCoordinator {
  private readonly createId: () => string
  private readonly now: () => number
  private readonly onOperationalEvent: (event: CoordinatorOperationalEvent) => void
  private readonly onTelemetryEvent: (event: CoordinatorTelemetryEvent) => void
  private readonly tools: CoordinatorTools

  constructor(options: WorkflowCoordinatorOptions) {
    this.createId = options.createId ?? createCoordinatorId
    this.now = options.now ?? Date.now
    this.onOperationalEvent = options.onOperationalEvent ?? (() => undefined)
    this.onTelemetryEvent = options.onTelemetryEvent ?? (() => undefined)
    this.tools = options.tools
  }

  async handle(
    profile: UserProfile,
    request: CoordinatorRequest,
  ): Promise<CoordinatorResponse<
    | JobDraftSuggestion
    | OperationsIntelligenceResult
    | ProposedAction<ProposedCreateJobPayload>
    | WorkforceIntelligenceResult
  >> {
    const startedAt = this.now()
    const correlationId = request.requestId?.trim() || this.createId()
    let route = routeCoordinatorRequest(request)
    const routeSource =
      route.intent && route.toolName ? 'deterministic' : 'model'
    const execution: CoordinatorExecution = {
      modelCalls: 0,
      steps: 1,
      toolCalls: 0,
    }

    if (!route.intent || !route.toolName) {
      try {
        route = await this.resolveModelRoute(profile, request, execution)
      } catch (error) {
        return this.fallback(
          correlationId,
          {
            ...route,
            confidence: 0,
            reason: error instanceof Error ? error.message : 'The request could not be classified safely.',
          },
          execution,
          routeSource,
          startedAt,
          normalizeCoordinatorError(error, 'classification'),
        )
      }

      if (!route.intent || !route.toolName) {
        return this.fallback(
          correlationId,
          route,
          execution,
          routeSource,
          startedAt,
          normalizeRouteFailure(route),
        )
      }
    }

    try {
      switch (route.intent) {
        case 'show_urgent_unassigned_jobs':
        case 'show_overdue_jobs':
        case 'show_jobs_requiring_attention':
        case 'show_workload_distribution':
        case 'summarize_open_operations':
        case 'explain_job_attention_flag': {
          const intent = route.intent as OperationsIntent
          const jobId = request.jobId?.trim()
          if (intent === 'explain_job_attention_flag' && !jobId) {
            throw new CoordinatorValidationError(
              'A current job is required to explain an attention flag.',
            )
          }

          const activeProfile = this.requireDashboardProfile(profile)
          const agent = new OperationsIntelligenceAgent({
            getInsight: (trustedProfile, trustedIntent, trustedJobId) =>
              this.tools.getOperationsInsight(
                trustedProfile,
                trustedIntent,
                trustedJobId,
              ),
          })
          const data = await this.runReadTool(
            () => agent.handle(activeProfile, intent, jobId),
            execution,
          )
          assertOperationsIntelligenceResult(data, intent)
          return this.result(
            correlationId,
            route,
            execution,
            data,
            routeSource,
            startedAt,
          )
        }
        case 'recommend_employee_for_job':
        case 'explain_recommendation':
        case 'compare_top_candidates': {
          const jobId = request.jobId?.trim()
          if (!jobId) {
            throw new CoordinatorValidationError(
              'A current job is required for workforce recommendations.',
            )
          }

          const activeProfile = this.requireDashboardProfile(profile)
          const agent = new WorkforceIntelligenceAgent({
            getRecommendation: async (trustedProfile, trustedJobId) =>
              this.tools.getWorkforceRecommendation(
                trustedProfile,
                trustedJobId,
              ),
          })
          const data = await this.runReadTool(
            () => agent.handle(activeProfile, route.intent as WorkforceIntent, jobId),
            execution,
          )
          assertWorkforceIntelligenceResult(data, jobId, route.intent)
          return this.result(
            correlationId,
            route,
            execution,
            data,
            routeSource,
            startedAt,
          )
        }
        case 'prepare_job_draft': {
          const customerRequest = request.customerRequest?.trim() || request.message.trim()

          if (!customerRequest) {
            throw new CoordinatorValidationError('A customer request is required.')
          }

          const data = await this.runModelTool(
            () => this.tools.generateJobDraft(this.requireCreateJobProfile(profile), customerRequest),
            execution,
          )
          assertJobDraftSuggestion(data)
          return this.result(
            correlationId,
            route,
            execution,
            data,
            routeSource,
            startedAt,
          )
        }
        case 'prepare_create_job_proposal': {
          if (!request.createJobInput) {
            throw new CoordinatorValidationError('A structured job draft is required.')
          }

          const proposal = await this.prepareCreateJobProposal(
            profile,
            request.createJobInput,
          )
          execution.steps += 1
          return this.result(
            correlationId,
            route,
            execution,
            proposal,
            routeSource,
            startedAt,
          )
        }
      }
    } catch (error) {
      return this.fallback(
        correlationId,
        {
          ...route,
          confidence: 0,
          reason: error instanceof Error ? error.message : 'The request could not be completed safely.',
        },
        execution,
        routeSource,
        startedAt,
        normalizeCoordinatorError(error, 'tool'),
      )
    }
  }

  async prepareCreateJobProposal(
    profile: UserProfile,
    payload: ProposedCreateJobPayload,
  ): Promise<ProposedAction<ProposedCreateJobPayload>> {
    const activeProfile = this.requireCreateJobProfile(profile)
    const normalizedPayload = normalizeCreateJobPayload(payload)
    const validation = validateProposedCreateJobPayload(normalizedPayload)

    if (!validation.isValid) {
      throw new CoordinatorValidationError(validation.errors.join(' '))
    }

    return this.tools.createCreateJobProposal(activeProfile, normalizedPayload)
  }

  async confirmCreateJobProposal(
    profile: UserProfile,
    proposalId: string,
  ) {
    const activeProfile = this.requireCreateJobProfile(profile)

    try {
      const result = await this.tools.confirmCreateJobProposal(
        activeProfile,
        proposalId,
      )

      this.onOperationalEvent({
        correlationId: proposalId,
        intent: 'create_job',
        outcome: 'succeeded',
        toolCalls: 1,
      })

      return result
    } catch (error) {
      this.onOperationalEvent({
        correlationId: proposalId,
        intent: 'create_job',
        outcome: 'rejected',
        toolCalls: 1,
      })
      throw error
    }
  }

  private fallback(
    correlationId: string,
    route: CoordinatorFallback['route'],
    execution: CoordinatorExecution,
    routeSource: CoordinatorTelemetryEvent['routeSource'],
    startedAt: number,
    errorCategory: CoordinatorErrorCategory,
  ): CoordinatorFallback {
    this.onOperationalEvent({
      correlationId,
      intent: route.intent,
      outcome: 'fallback',
      toolCalls: execution.toolCalls,
    })
    this.emitTelemetry({
      correlationId,
      durationMs: this.now() - startedAt,
      groundingStatus:
        execution.toolCalls > 0 && route.agent === 'operations_insight'
          ? 'failed'
          : 'not_evaluated',
      modelCallCount: execution.modelCalls,
      normalizedError: errorCategory,
      outcome: 'safe_fallback',
      routeSource,
      toolCallCount: execution.toolCalls,
      toolName: route.toolName,
      validatedIntent: route.intent,
      writeAttempted: false,
    })

    return {
      correlationId,
      execution,
      kind: 'fallback',
      message: 'Use the existing Workflow screens for this request.',
      route,
    }
  }

  private requireCreateJobProfile(profile: UserProfile) {
    const activeProfile = requireCoordinatorProfile(profile)

    if (!canManageCoordinatorJobs(activeProfile)) {
      throw new CoordinatorValidationError('You do not have permission to create jobs.')
    }

    return activeProfile
  }

  private requireDashboardProfile(profile: UserProfile) {
    const activeProfile = requireCoordinatorProfile(profile)

    if (!canManageCoordinatorJobs(activeProfile)) {
      throw new CoordinatorValidationError(
        'You do not have permission to view operational insights.',
      )
    }

    return activeProfile
  }

  private async resolveModelRoute(
    profile: UserProfile,
    request: CoordinatorRequest,
    execution: CoordinatorExecution,
  ): Promise<CoordinatorRoute> {
    if (execution.modelCalls >= COORDINATOR_LIMITS.maxModelCalls) {
      throw new CoordinatorValidationError('The coordinator model-call limit was reached.')
    }

    if (execution.steps >= COORDINATOR_LIMITS.maxSteps) {
      throw new CoordinatorValidationError('The coordinator step limit was reached.')
    }

    const activeProfile = this.requireDashboardProfile(profile)
    execution.modelCalls += 1
    execution.steps += 1
    const classification = await withTimeout(
      this.tools.classifyCoordinatorIntent(activeProfile, {
        message: request.message,
        uiContext: request.uiContext,
      }),
      COORDINATOR_LIMITS.modelToolTimeoutMs,
    )

    if (!isValidModelClassification(classification)) {
      return {
        agent: 'operations_insight',
        confidence: 0,
        intent: null,
        reason: 'The classifier returned invalid data.',
        toolName: null,
      }
    }

    if (
      classification.requiresClarification ||
      classification.confidence < COORDINATOR_LIMITS.classificationConfidenceThreshold
    ) {
      return {
        agent: 'operations_insight',
        confidence: classification.confidence,
        intent: null,
        reason:
          classification.clarificationReason ??
          'The request needs clarification before Workflow can route it safely.',
        toolName: null,
      }
    }

    return modelClassificationRoute(classification, request)
  }

  private async runReadTool<TData>(
    operation: () => Promise<TData>,
    execution: CoordinatorExecution,
  ) {
    if (execution.steps >= COORDINATOR_LIMITS.maxSteps) {
      throw new CoordinatorValidationError('The coordinator step limit was reached.')
    }

    if (execution.toolCalls >= COORDINATOR_LIMITS.maxToolCalls) {
      throw new CoordinatorValidationError('The coordinator tool-call limit was reached.')
    }

    execution.steps += 1
    execution.toolCalls += 1

    return withTimeout(operation(), COORDINATOR_LIMITS.readToolTimeoutMs)
  }

  private async runModelTool<TData>(
    operation: () => Promise<TData>,
    execution: CoordinatorExecution,
  ) {
    if (execution.modelCalls >= COORDINATOR_LIMITS.maxModelCalls) {
      throw new CoordinatorValidationError('The coordinator model-call limit was reached.')
    }

    execution.modelCalls += 1
    return this.runReadTool(operation, execution)
  }

  private result<TData>(
    correlationId: string,
    route: CoordinatorRoute,
    execution: CoordinatorExecution,
    data: TData,
    routeSource: CoordinatorTelemetryEvent['routeSource'],
    startedAt: number,
  ) {
    this.onOperationalEvent({
      correlationId,
      intent: route.intent,
      outcome: 'succeeded',
      toolCalls: execution.toolCalls,
    })
    this.emitTelemetry({
      correlationId,
      durationMs: this.now() - startedAt,
      groundingStatus:
        route.agent === 'operations_insight' ||
        route.agent === 'workforce_intelligence'
          ? 'passed'
          : 'not_applicable',
      modelCallCount: execution.modelCalls,
      normalizedError: 'none',
      outcome: 'success',
      routeSource,
      toolCallCount: execution.toolCalls,
      toolName: route.toolName,
      validatedIntent: route.intent,
      writeAttempted: false,
    })

    return {
      correlationId,
      data,
      execution,
      kind: 'result' as const,
      route,
    }
  }

  private emitTelemetry(event: CoordinatorTelemetryEvent) {
    if (event.validatedIntent === 'prepare_create_job_proposal') return
    this.onTelemetryEvent(createCoordinatorTelemetryEvent(event))
  }
}

function normalizeCreateJobPayload(payload: ProposedCreateJobPayload) {
  return {
    ...payload,
    customerName: payload.customerName.trim(),
    customerPhone: payload.customerPhone.trim(),
    description: payload.description.trim(),
    location: payload.location.trim(),
    requiredSkills: payload.requiredSkills.map((skill) => skill.trim()).filter(Boolean),
    serviceAddress: payload.serviceAddress.trim(),
    title: payload.title.trim(),
  }
}

function requireCoordinatorProfile(profile: UserProfile) {
  if (!profile.isActive) {
    throw new CoordinatorValidationError('An active user profile is required.')
  }

  if (profile.organizationId.trim().length === 0) {
    throw new CoordinatorValidationError('An organization is required.')
  }

  return profile
}

function canManageCoordinatorJobs(profile: UserProfile) {
  return profile.role === 'admin' || profile.role === 'manager'
}

function assertOperationsIntelligenceResult(
  value: unknown,
  intent: OperationsIntent,
): asserts value is OperationsIntelligenceResult {
  const result = value as OperationsIntelligenceResult
  if (
    !result ||
    result.intent !== intent ||
    result.data?.intent !== intent ||
    !isOperationsIntent(result.intent) ||
    !Array.isArray(result.summary) ||
    result.summary.some((line) => typeof line !== 'string')
  ) {
    throw new CoordinatorValidationError(
      'The operations tool returned invalid data.',
    )
  }
}

function assertJobDraftSuggestion(value: unknown): asserts value is JobDraftSuggestion {
  if (
    !value ||
    typeof value !== 'object' ||
    typeof (value as JobDraftSuggestion).title !== 'string' ||
    !Array.isArray((value as JobDraftSuggestion).needsReview) ||
    ((value as JobDraftSuggestion).source !== 'development-stub' &&
      (value as JobDraftSuggestion).source !== 'gemini')
  ) {
    throw new CoordinatorValidationError('The job-draft tool returned invalid data.')
  }
}

function modelClassificationRoute(
  classification: ModelIntentClassification,
  request: CoordinatorRequest,
): CoordinatorRoute {
  switch (classification.intent) {
    case 'show_urgent_unassigned_jobs':
    case 'show_overdue_jobs':
    case 'show_jobs_requiring_attention':
    case 'show_workload_distribution':
    case 'summarize_open_operations':
    case 'explain_job_attention_flag':
      return operationsModelRoute(
        classification,
        request,
        classification.intent,
      )
    case 'recommend_employee_for_job':
      return workforceModelRoute(classification, request, 'recommend_employee_for_job')
    case 'explain_recommendation':
      return workforceModelRoute(classification, request, 'explain_recommendation')
    case 'compare_top_candidates':
      return workforceModelRoute(classification, request, 'compare_top_candidates')
    case 'prepare_job_draft':
      return request.uiContext === 'create_job' || request.uiContext === 'unknown'
        ? modelRoute(
            classification,
            'prepare_job_draft',
            'job_intelligence',
            'generate_job_draft',
          )
        : unsupportedModelRoute(classification)
    case 'unsupported':
      return unsupportedModelRoute(classification)
  }
}

function operationsModelRoute(
  classification: ModelIntentClassification,
  request: CoordinatorRequest,
  intent: OperationsIntent,
): CoordinatorRoute {
  if (
    intent === 'explain_job_attention_flag' &&
    !request.jobId?.trim()
  ) {
    return unsupportedModelRoute(classification)
  }

  return ['dashboard', 'job_details', 'jobs', 'unknown'].includes(
    request.uiContext,
  )
    ? modelRoute(
        classification,
        intent,
        'operations_insight',
        'get_operations_insight',
      )
    : unsupportedModelRoute(classification)
}

function workforceModelRoute(
  classification: ModelIntentClassification,
  request: CoordinatorRequest,
  intent: WorkforceIntent,
): CoordinatorRoute {
  return request.uiContext === 'job_details' && Boolean(request.jobId?.trim())
    ? modelRoute(
        classification,
        intent,
        'workforce_intelligence',
        'get_workforce_recommendation',
      )
    : unsupportedModelRoute(classification)
}

function assertWorkforceIntelligenceResult(
  value: unknown,
  jobId: string,
  intent: CoordinatorRoute['intent'],
): asserts value is WorkforceIntelligenceResult {
  const result = value as WorkforceIntelligenceResult
  if (
    !result ||
    result.jobId !== jobId ||
    result.intent !== intent ||
    result.engineVersion !== 'rule-based-v1' ||
    !Array.isArray(result.summary) ||
    !Array.isArray(result.candidates) ||
    result.candidates.length > 5
  ) {
    throw new CoordinatorValidationError(
      'The workforce tool returned invalid data.',
    )
  }
}

function modelRoute(
  classification: ModelIntentClassification,
  intent: CoordinatorRoute['intent'],
  agent: CoordinatorRoute['agent'],
  toolName: string,
): CoordinatorRoute {
  return {
    agent,
    confidence: classification.confidence,
    intent,
    reason: 'Matched an allowlisted model classification after deterministic routing did not match.',
    toolName,
  }
}

function unsupportedModelRoute(
  classification: ModelIntentClassification,
): CoordinatorRoute {
  return {
    agent: 'operations_insight',
    confidence: classification.confidence,
    intent: null,
    reason:
      classification.clarificationReason ??
      'The request is not supported by the Workflow coordinator.',
    toolName: null,
  }
}

function isValidModelClassification(
  value: unknown,
): value is ModelIntentClassification {
  return (
    value !== null &&
    typeof value === 'object' &&
    !('toolName' in value) &&
    isModelCoordinatorIntent((value as ModelIntentClassification).intent) &&
    typeof (value as ModelIntentClassification).confidence === 'number' &&
    Number.isFinite((value as ModelIntentClassification).confidence) &&
    (value as ModelIntentClassification).confidence >= 0 &&
    (value as ModelIntentClassification).confidence <= 1 &&
    typeof (value as ModelIntentClassification).requiresClarification === 'boolean'
  )
}

function createCoordinatorId() {
  return `coord-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function normalizeRouteFailure(
  route: CoordinatorRoute,
): CoordinatorErrorCategory {
  if (/low|clarification/i.test(route.reason)) return 'low_confidence'
  if (/invalid data|invalid model|classifier returned invalid/i.test(route.reason)) {
    return 'invalid_model_output'
  }
  if (/current job|required/i.test(route.reason)) return 'missing_context'
  return 'unsupported'
}

function normalizeCoordinatorError(
  error: unknown,
  phase: 'classification' | 'tool',
): CoordinatorErrorCategory {
  const message = error instanceof Error ? error.message : ''
  if (/timed out|timeout/i.test(message)) return 'timeout'
  if (/permission|active user|manager access/i.test(message)) {
    return 'permission_denied'
  }
  if (/current job|required/i.test(message)) return 'missing_context'
  if (/invalid data|mismatched intent|ground/i.test(message)) {
    return phase === 'tool' ? 'grounding_failed' : 'invalid_model_output'
  }
  if (/invalid|validation/i.test(message)) return 'validation_failed'
  return phase === 'classification' ? 'classification_failed' : 'tool_failed'
}

function withTimeout<TData>(operation: Promise<TData>, timeoutMs: number) {
  return new Promise<TData>((resolve, reject) => {
    const timeoutId = globalThis.setTimeout(() => {
      reject(new CoordinatorValidationError('The read tool timed out.'))
    }, timeoutMs)

    operation.then(
      (value) => {
        globalThis.clearTimeout(timeoutId)
        resolve(value)
      },
      (error: unknown) => {
        globalThis.clearTimeout(timeoutId)
        reject(error)
      },
    )
  })
}
