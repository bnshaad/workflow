import type {
  ActionProposalExecutionResult,
  CoordinatorExecution,
  CoordinatorFallback,
  CoordinatorRequest,
  CoordinatorResponse,
  CoordinatorRoute,
  HighestWorkloadEmployee,
  JobDraftSuggestion,
  ModelIntentClassification,
  OpenJobsSummary,
  ProposedAction,
  ProposedCreateJobPayload,
  UrgentUnassignedJob,
  WorkloadSnapshot,
} from '../../types/coordinator'
import type { UserProfile } from '../../types/user'
import {
  COORDINATOR_LIMITS,
  routeCoordinatorRequest,
  validateProposedCreateJobPayload,
} from './coordinatorRules.ts'

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
  getOpenJobsSummary: (profile: UserProfile) => Promise<OpenJobsSummary>
  getUrgentUnassignedJobs: (
    profile: UserProfile,
  ) => Promise<UrgentUnassignedJob[]>
  getWorkloadSnapshot: (profile: UserProfile) => Promise<WorkloadSnapshot>
}

export type CoordinatorOperationalEvent = {
  correlationId: string
  intent: string | null
  outcome: 'fallback' | 'rejected' | 'succeeded'
  toolCalls: number
}

export type WorkflowCoordinatorOptions = {
  createId?: () => string
  onOperationalEvent?: (event: CoordinatorOperationalEvent) => void
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
  private readonly onOperationalEvent: (event: CoordinatorOperationalEvent) => void
  private readonly tools: CoordinatorTools

  constructor(options: WorkflowCoordinatorOptions) {
    this.createId = options.createId ?? createCoordinatorId
    this.onOperationalEvent = options.onOperationalEvent ?? (() => undefined)
    this.tools = options.tools
  }

  async handle(
    profile: UserProfile,
    request: CoordinatorRequest,
  ): Promise<CoordinatorResponse<
    | JobDraftSuggestion
    | OpenJobsSummary
    | ProposedAction<ProposedCreateJobPayload>
    | UrgentUnassignedJob[]
    | WorkloadSnapshot
  >> {
    const correlationId = request.requestId?.trim() || this.createId()
    let route = routeCoordinatorRequest(request)
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
        )
      }

      if (!route.intent || !route.toolName) {
        return this.fallback(correlationId, route, execution)
      }
    }

    try {
      switch (route.intent) {
        case 'show_urgent_unassigned_jobs': {
          const data = await this.runReadTool(
            () => this.tools.getUrgentUnassignedJobs(this.requireDashboardProfile(profile)),
            execution,
          )
          assertUrgentUnassignedJobs(data)
          return this.result(correlationId, route, execution, data)
        }
        case 'show_open_jobs_summary': {
          const data = await this.runReadTool(
            () => this.tools.getOpenJobsSummary(this.requireDashboardProfile(profile)),
            execution,
          )
          assertOpenJobsSummary(data)
          return this.result(correlationId, route, execution, data)
        }
        case 'show_overloaded_employees': {
          const data = await this.runReadTool(
            () => this.tools.getWorkloadSnapshot(this.requireDashboardProfile(profile)),
            execution,
          )
          assertWorkloadSnapshot(data)
          return this.result(correlationId, route, execution, data)
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
          return this.result(correlationId, route, execution, data)
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
          return this.result(correlationId, route, execution, proposal)
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
  ): CoordinatorFallback {
    this.onOperationalEvent({
      correlationId,
      intent: route.intent,
      outcome: 'fallback',
      toolCalls: execution.toolCalls,
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
  ) {
    this.onOperationalEvent({
      correlationId,
      intent: route.intent,
      outcome: 'succeeded',
      toolCalls: execution.toolCalls,
    })

    return {
      correlationId,
      data,
      execution,
      kind: 'result' as const,
      route,
    }
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

function assertUrgentUnassignedJobs(value: unknown): asserts value is UrgentUnassignedJob[] {
  if (!Array.isArray(value) || value.some((job) => !isUrgentUnassignedJob(job))) {
    throw new CoordinatorValidationError('The urgent-job tool returned invalid data.')
  }
}

function assertOpenJobsSummary(value: unknown): asserts value is OpenJobsSummary {
  if (
    !value ||
    typeof value !== 'object' ||
    typeof (value as OpenJobsSummary).openJobCount !== 'number' ||
    typeof (value as OpenJobsSummary).totalJobCount !== 'number'
  ) {
    throw new CoordinatorValidationError('The open-jobs tool returned invalid data.')
  }
}

function assertWorkloadSnapshot(value: unknown): asserts value is WorkloadSnapshot {
  if (
    !value ||
    typeof value !== 'object' ||
    !Array.isArray((value as WorkloadSnapshot).employees) ||
    typeof (value as WorkloadSnapshot).note !== 'string' ||
    (value as WorkloadSnapshot).employees.some((employee) => !isWorkloadEmployee(employee))
  ) {
    throw new CoordinatorValidationError('The workload tool returned invalid data.')
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
      return modelRoute(
        classification,
        'show_urgent_unassigned_jobs',
        'operations_insight',
        'get_urgent_unassigned_jobs',
      )
    case 'show_open_jobs_summary':
      return modelRoute(
        classification,
        'show_open_jobs_summary',
        'operations_insight',
        'get_open_jobs_summary',
      )
    case 'show_overloaded_employees':
      return modelRoute(
        classification,
        'show_overloaded_employees',
        'operations_insight',
        'get_workload_snapshot',
      )
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
    Boolean(value) &&
    typeof value === 'object' &&
    ['show_urgent_unassigned_jobs', 'show_open_jobs_summary', 'show_overloaded_employees', 'prepare_job_draft', 'unsupported'].includes(
      (value as ModelIntentClassification).intent,
    ) &&
    typeof (value as ModelIntentClassification).confidence === 'number' &&
    Number.isFinite((value as ModelIntentClassification).confidence) &&
    (value as ModelIntentClassification).confidence >= 0 &&
    (value as ModelIntentClassification).confidence <= 1 &&
    typeof (value as ModelIntentClassification).requiresClarification === 'boolean'
  )
}

function isUrgentUnassignedJob(value: unknown): value is UrgentUnassignedJob {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    typeof (value as UrgentUnassignedJob).id === 'string' &&
    typeof (value as UrgentUnassignedJob).title === 'string' &&
    (value as UrgentUnassignedJob).priority === 'Urgent'
  )
}

function isWorkloadEmployee(value: unknown): value is HighestWorkloadEmployee {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    typeof (value as HighestWorkloadEmployee).employeeId === 'string' &&
    typeof (value as HighestWorkloadEmployee).displayName === 'string' &&
    typeof (value as HighestWorkloadEmployee).activeJobCount === 'number' &&
    typeof (value as HighestWorkloadEmployee).inProgressJobCount === 'number'
  )
}

function createCoordinatorId() {
  return `coord-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
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
