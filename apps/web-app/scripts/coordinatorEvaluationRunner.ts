import {
  OPERATIONS_ATTENTION_REASONS,
  buildOperationsToolResult,
  isOperationsIntent,
  type OperationsIntent,
} from '../../../shared/operationsIntelligence.ts'
import {
  isModelCoordinatorIntent,
  type ModelIntentClassification,
} from '../../../shared/coordinatorModel.ts'
import type { WorkforceRecommendationResult } from '../../../shared/workforceIntelligence.ts'
import type { WorkforceIntelligenceResult } from '../src/types/coordinator.ts'
import {
  AGENT_TOOL_ALLOWLIST,
} from '../src/services/coordinator/coordinatorRules.ts'
import type { CoordinatorTelemetryEvent } from '../src/services/coordinator/coordinatorTelemetry.ts'
import {
  WorkflowCoordinator,
  type CoordinatorTools,
} from '../src/services/coordinator/workflowCoordinator.ts'
import {
  SupportedCoordinatorIntents,
  type CoordinatorRequest,
  type CoordinatorResponse,
  type JobDraftSuggestion,
  type OperationsIntelligenceResult,
  type ProposedAction,
  type ProposedCreateJobPayload,
  type SupportedCoordinatorIntent,
  type UserProfile,
} from '../src/types/index.ts'
import {
  COORDINATOR_EVALUATION_CATEGORIES,
  COORDINATOR_EVALUATION_CORPUS_VERSION,
  type CoordinatorEvaluationCase,
  type CoordinatorEvaluationCorpus,
  type CoordinatorEvaluationOutcome,
} from './coordinatorEvaluationCorpus.ts'

const allowedTools = new Set<string>(
  Object.values(AGENT_TOOL_ALLOWLIST).flat(),
)
const supportedIntents = new Set<string>(
  Object.values(SupportedCoordinatorIntents),
)
const telemetryFields = [
  'correlationId',
  'durationMs',
  'groundingStatus',
  'modelCallCount',
  'normalizedError',
  'outcome',
  'routeSource',
  'toolCallCount',
  'toolName',
  'validatedIntent',
  'writeAttempted',
].sort()

type EvaluationResponse = CoordinatorResponse<
  | JobDraftSuggestion
  | OperationsIntelligenceResult
  | ProposedAction<ProposedCreateJobPayload>
  | WorkforceIntelligenceResult
>

export type CoordinatorEvaluationCaseResult = {
  actualClassifierCalls: number
  actualIntent: SupportedCoordinatorIntent | null
  actualModelCalls: number
  actualOutcome: CoordinatorEvaluationOutcome
  actualTool: string | null
  actualToolCalls: number
  deterministicBypassPassed: boolean
  deterministicBypassExpected: boolean
  errors: string[]
  groundingPassed: boolean
  id: string
  intentPassed: boolean
  noWritePassed: boolean
  passed: boolean
  responseComplete: boolean
  telemetryPassed: boolean
  toolSelectionPassed: boolean
  expectedOutcome: CoordinatorEvaluationOutcome
  unsupportedRejectionPassed: boolean
}

export type CoordinatorEvaluationMetrics = {
  averageModelCalls: number
  averageToolCalls: number
  controlledFunctionalEvaluation: true
  correctToolSelectionRate: number
  deterministicBypassPassRate: number
  groundingComplianceRate: number
  intentRoutingPassRate: number
  noWriteSafetyRate: number
  passedCases: number
  responseCompletenessRate: number
  totalCases: number
  unsupportedRequestRejectionRate: number
}

export type CoordinatorEvaluationReport = {
  cases: CoordinatorEvaluationCaseResult[]
  corpusVersion: string
  metrics: CoordinatorEvaluationMetrics
}

export function validateCoordinatorEvaluationCorpus(
  value: unknown,
): asserts value is CoordinatorEvaluationCorpus {
  if (!value || typeof value !== 'object') {
    throw new Error('The coordinator evaluation corpus must be an object.')
  }

  const corpus = value as Record<string, unknown>
  if (corpus.version !== COORDINATOR_EVALUATION_CORPUS_VERSION) {
    throw new Error('The coordinator evaluation corpus version is unsupported.')
  }
  if (corpus.kind !== 'controlled_functional_evaluation') {
    throw new Error('The coordinator evaluation corpus kind is invalid.')
  }
  if (!Array.isArray(corpus.cases) || corpus.cases.length === 0 || corpus.cases.length > 80) {
    throw new Error('The coordinator evaluation corpus must contain 1 to 80 cases.')
  }

  const ids = new Set<string>()
  for (const [index, rawCase] of corpus.cases.entries()) {
    validateEvaluationCase(rawCase, index)
    if (ids.has(rawCase.id)) {
      throw new Error(`Duplicate coordinator evaluation case ID: ${rawCase.id}.`)
    }
    ids.add(rawCase.id)
  }
}

export async function runCoordinatorEvaluation(
  corpus: CoordinatorEvaluationCorpus,
): Promise<CoordinatorEvaluationReport> {
  validateCoordinatorEvaluationCorpus(corpus)
  const caseResults = await Promise.all(corpus.cases.map(runEvaluationCase))

  return {
    cases: caseResults,
    corpusVersion: corpus.version,
    metrics: buildMetrics(caseResults),
  }
}

export function formatCoordinatorEvaluationReport(
  report: CoordinatorEvaluationReport,
) {
  const { metrics } = report
  return [
    `Controlled functional evaluation: ${report.corpusVersion}`,
    `Total cases: ${metrics.totalCases}`,
    `Passed: ${metrics.passedCases}`,
    `Intent-routing pass rate: ${formatPercent(metrics.intentRoutingPassRate)}`,
    `Unsupported-request rejection: ${formatPercent(metrics.unsupportedRequestRejectionRate)}`,
    `Deterministic-bypass pass rate: ${formatPercent(metrics.deterministicBypassPassRate)}`,
    `Correct-tool selection: ${formatPercent(metrics.correctToolSelectionRate)}`,
    `Grounding compliance: ${formatPercent(metrics.groundingComplianceRate)}`,
    `No-write safety: ${formatPercent(metrics.noWriteSafetyRate)}`,
    `Response completeness: ${formatPercent(metrics.responseCompletenessRate)}`,
    `Average model calls: ${metrics.averageModelCalls.toFixed(2)}`,
    `Average tool calls: ${metrics.averageToolCalls.toFixed(2)}`,
  ].join('\n')
}

async function runEvaluationCase(
  evaluationCase: CoordinatorEvaluationCase,
): Promise<CoordinatorEvaluationCaseResult> {
  const calledTools: string[] = []
  const telemetryEvents: CoordinatorTelemetryEvent[] = []
  let classificationCalls = 0
  let writeAttempts = 0
  const tools: CoordinatorTools = {
    async classifyCoordinatorIntent() {
      classificationCalls += 1
      if (evaluationCase.modelFailure) {
        throw new Error('Synthetic classifier failure.')
      }
      return evaluationCase.modelResponse ?? unsupportedClassification()
    },
    async confirmCreateJobProposal() {
      writeAttempts += 1
      throw new Error('Write-capable confirmation must not be invoked.')
    },
    async createCreateJobProposal() {
      writeAttempts += 1
      throw new Error('Write-capable proposal creation must not be invoked.')
    },
    async generateJobDraft() {
      calledTools.push('generate_job_draft')
      return syntheticJobDraft()
    },
    async getOperationsInsight(_profile, intent) {
      calledTools.push('get_operations_insight')
      return syntheticOperationsResult(intent)
    },
    async getWorkforceRecommendation(_profile, jobId) {
      calledTools.push('get_workforce_recommendation')
      return syntheticWorkforceRecommendation(jobId)
    },
  }
  const coordinator = new WorkflowCoordinator({
    createId: () => `evaluation-${evaluationCase.id}`,
    now: () => 1_000,
    onTelemetryEvent: (event) => telemetryEvents.push(event),
    tools,
  })

  let response: EvaluationResponse
  try {
    response = await coordinator.handle(
      syntheticManagerProfile,
      evaluationCase.request as CoordinatorRequest,
    )
  } catch (error) {
    return failedCaseResult(
      evaluationCase,
      error instanceof Error ? error.message : 'Coordinator execution threw.',
    )
  }

  const telemetry = telemetryEvents[0]
  const actualOutcome = getActualOutcome(response)
  const actualIntent = response.route.intent
  const actualTool = response.route.toolName
  const responseText = getResponseText(response)
  const intentPassed = actualIntent === evaluationCase.expectedIntent
  const toolSelectionPassed =
    actualTool === evaluationCase.expectedTool &&
    calledTools.length === evaluationCase.expectedToolCalls &&
    (evaluationCase.expectedToolCalls === 0 ||
      calledTools[0] === evaluationCase.expectedTool)
  const deterministicBypassPassed =
    !evaluationCase.deterministicBypassExpected ||
    classificationCalls === 0
  const noWritePassed = writeAttempts === 0
  const groundingPassed =
    hasNoForbiddenClaims(responseText, evaluationCase.forbiddenClaims) &&
    hasOnlyDeterministicAttentionReasons(response)
  const responseComplete = isResponseComplete(response)
  const telemetryPassed = isPrivacySafeTelemetry(
    telemetry,
    evaluationCase.request.message,
    evaluationCase.expectedRouteSource,
  )
  const unsupportedRejectionPassed =
    evaluationCase.expectedOutcome !== 'unsupported' ||
    (actualOutcome === 'safe_fallback' &&
      response.kind === 'fallback' &&
      response.execution.toolCalls === 0 &&
      telemetry !== undefined &&
      telemetry.normalizedError !== 'none')
  const outcomePassed =
    actualOutcome === evaluationCase.expectedOutcome ||
    (evaluationCase.expectedOutcome === 'unsupported' &&
      unsupportedRejectionPassed)
  const errors = [
    intentPassed ? '' : `Expected intent ${evaluationCase.expectedIntent}, received ${actualIntent}.`,
    response.execution.modelCalls === evaluationCase.expectedModelCalls
      ? ''
      : `Expected ${evaluationCase.expectedModelCalls} model calls, received ${response.execution.modelCalls}.`,
    response.execution.toolCalls === evaluationCase.expectedToolCalls
      ? ''
      : `Expected ${evaluationCase.expectedToolCalls} tool calls, received ${response.execution.toolCalls}.`,
    outcomePassed
      ? ''
      : `Expected outcome ${evaluationCase.expectedOutcome}, received ${actualOutcome}.`,
    toolSelectionPassed ? '' : 'The approved tool selection did not match.',
    deterministicBypassPassed ? '' : 'A deterministic command invoked the classifier.',
    groundingPassed ? '' : 'The response failed grounding checks.',
    noWritePassed ? '' : 'A write-capable tool was invoked.',
    responseComplete ? '' : 'The response was incomplete.',
    telemetryPassed ? '' : 'Telemetry was missing, unbounded, or contained disallowed data.',
    unsupportedRejectionPassed ? '' : 'An unsupported request was not rejected safely.',
  ].filter(Boolean)

  return {
    actualClassifierCalls: classificationCalls,
    actualIntent,
    actualModelCalls: response.execution.modelCalls,
    actualOutcome,
    actualTool,
    actualToolCalls: response.execution.toolCalls,
    deterministicBypassPassed,
    deterministicBypassExpected: evaluationCase.deterministicBypassExpected,
    errors,
    expectedOutcome: evaluationCase.expectedOutcome,
    groundingPassed,
    id: evaluationCase.id,
    intentPassed,
    noWritePassed,
    passed: errors.length === 0,
    responseComplete,
    telemetryPassed,
    toolSelectionPassed,
    unsupportedRejectionPassed,
  }
}

function validateEvaluationCase(value: unknown, index: number): asserts value is CoordinatorEvaluationCase {
  if (!value || typeof value !== 'object') {
    throw new Error(`Coordinator evaluation case ${index} must be an object.`)
  }
  const item = value as Record<string, unknown>
  if (typeof item.id !== 'string' || !/^[a-z0-9-]{3,80}$/.test(item.id)) {
    throw new Error(`Coordinator evaluation case ${index} has an invalid ID.`)
  }
  if (!COORDINATOR_EVALUATION_CATEGORIES.includes(item.category as never)) {
    throw new Error(`Coordinator evaluation case ${item.id} has an invalid category.`)
  }
  if (item.expectedIntent !== null && !supportedIntents.has(String(item.expectedIntent))) {
    throw new Error(`Coordinator evaluation case ${item.id} has an unsupported expected intent.`)
  }
  if (item.expectedTool !== null && !allowedTools.has(String(item.expectedTool))) {
    throw new Error(`Coordinator evaluation case ${item.id} has an unsupported expected tool.`)
  }
  if (item.expectedModelCalls !== 0 && item.expectedModelCalls !== 1) {
    throw new Error(`Coordinator evaluation case ${item.id} has an invalid model-call budget.`)
  }
  if (item.expectedToolCalls !== 0 && item.expectedToolCalls !== 1) {
    throw new Error(`Coordinator evaluation case ${item.id} has an invalid tool-call budget.`)
  }
  if (!['safe_fallback', 'success', 'unsupported'].includes(String(item.expectedOutcome))) {
    throw new Error(`Coordinator evaluation case ${item.id} has an invalid outcome.`)
  }
  if (!['deterministic', 'model'].includes(String(item.expectedRouteSource))) {
    throw new Error(`Coordinator evaluation case ${item.id} has an invalid route source.`)
  }
  if (!item.request || typeof item.request !== 'object' || !('message' in item.request)) {
    throw new Error(`Coordinator evaluation case ${item.id} has an invalid request fixture.`)
  }
  if (
    !Array.isArray(item.forbiddenClaims) ||
    item.forbiddenClaims.length === 0 ||
    item.forbiddenClaims.length > 20 ||
    item.forbiddenClaims.some(
      (claim) => typeof claim !== 'string' || claim.length === 0 || claim.length > 80,
    )
  ) {
    throw new Error(`Coordinator evaluation case ${item.id} has invalid forbidden claims.`)
  }
  if (item.requiresNoWrite !== true) {
    throw new Error(`Coordinator evaluation case ${item.id} must require no writes.`)
  }
  if (item.modelFailure === true && item.modelResponse !== undefined) {
    throw new Error(`Coordinator evaluation case ${item.id} has conflicting model fixtures.`)
  }
  if (item.modelResponse !== undefined) {
    if (
      !item.modelResponse ||
      typeof item.modelResponse !== 'object' ||
      !isModelCoordinatorIntent(
        (item.modelResponse as ModelIntentClassification).intent,
      )
    ) {
      throw new Error(`Coordinator evaluation case ${item.id} has an unsupported model intent.`)
    }
  }
}

function buildMetrics(
  results: CoordinatorEvaluationCaseResult[],
): CoordinatorEvaluationMetrics {
  const deterministicCases = results.filter(
    (result) => result.deterministicBypassExpected,
  )
  const unsupportedCases = results.filter(
    (result) => result.expectedOutcome === 'unsupported',
  )
  const totalModelCalls = results.reduce(
    (total, result) => total + result.actualModelCalls,
    0,
  )
  const totalToolCalls = results.reduce(
    (total, result) => total + result.actualToolCalls,
    0,
  )

  return {
    averageModelCalls: divide(totalModelCalls, results.length),
    averageToolCalls: divide(totalToolCalls, results.length),
    controlledFunctionalEvaluation: true,
    correctToolSelectionRate: passRate(results, 'toolSelectionPassed'),
    deterministicBypassPassRate: passRate(
      deterministicCases,
      'deterministicBypassPassed',
    ),
    groundingComplianceRate: passRate(results, 'groundingPassed'),
    intentRoutingPassRate: passRate(results, 'intentPassed'),
    noWriteSafetyRate: passRate(results, 'noWritePassed'),
    passedCases: results.filter((result) => result.passed).length,
    responseCompletenessRate: passRate(results, 'responseComplete'),
    totalCases: results.length,
    unsupportedRequestRejectionRate: passRate(
      unsupportedCases,
      'unsupportedRejectionPassed',
    ),
  }
}

function getActualOutcome(
  response: EvaluationResponse,
): CoordinatorEvaluationOutcome {
  if (response.kind === 'result') return 'success'
  return 'safe_fallback'
}

function getResponseText(response: EvaluationResponse) {
  if (response.kind === 'fallback') {
    return `${response.message} ${response.route.reason}`
  }
  const data = response.data
  if ('summary' in data && Array.isArray(data.summary)) {
    return data.summary.join(' ')
  }
  if ('title' in data && typeof data.title === 'string') {
    return `${data.title} ${data.description}`
  }
  return ''
}

function isResponseComplete(response: EvaluationResponse) {
  if (response.kind === 'fallback') return response.message.trim().length > 0
  const data = response.data
  if ('summary' in data && Array.isArray(data.summary)) {
    return data.summary.length > 0 && data.summary.every((line) => line.trim().length > 0)
  }
  return 'title' in data && typeof data.title === 'string' && data.title.length > 0
}

function hasOnlyDeterministicAttentionReasons(response: EvaluationResponse) {
  if (response.kind !== 'result' || !isOperationsResult(response.data)) return true
  return getAttentionItems(response.data).every((item) =>
    item.attentionReasons.every((reason) =>
      OPERATIONS_ATTENTION_REASONS.includes(reason),
    ),
  )
}

function isOperationsResult(
  value: EvaluationResponse extends CoordinatorResponse<infer TData>
    ? TData
    : never,
): value is OperationsIntelligenceResult {
  return (
    'intent' in value &&
    isOperationsIntent(value.intent) &&
    'data' in value &&
    Boolean(value.data)
  )
}

function getAttentionItems(result: OperationsIntelligenceResult) {
  const data = result.data
  if ('items' in data) return data.items
  if (data.intent === 'summarize_open_operations') return data.attentionItems
  if (data.intent === 'explain_job_attention_flag') return [data.item]
  return []
}

function hasNoForbiddenClaims(text: string, forbiddenClaims: string[]) {
  const normalized = text.toLowerCase()
  return forbiddenClaims.every((claim) => !normalized.includes(claim.toLowerCase()))
}

function isPrivacySafeTelemetry(
  event: CoordinatorTelemetryEvent | undefined,
  rawMessage: unknown,
  expectedRouteSource: CoordinatorTelemetryEvent['routeSource'],
) {
  if (!event) return false
  if (event.routeSource !== expectedRouteSource || event.writeAttempted !== false) {
    return false
  }
  if (event.correlationId.length > 80 || event.durationMs < 0 || event.durationMs > 60_000) {
    return false
  }
  if (event.modelCallCount > 1 || event.toolCallCount > 2) return false
  if (JSON.stringify(event).includes(String(rawMessage))) return false
  return JSON.stringify(Object.keys(event).sort()) === JSON.stringify(telemetryFields)
}

function failedCaseResult(
  evaluationCase: CoordinatorEvaluationCase,
  message: string,
): CoordinatorEvaluationCaseResult {
  return {
    actualClassifierCalls: 0,
    actualIntent: null,
    actualModelCalls: 0,
    actualOutcome: 'safe_fallback',
    actualTool: null,
    actualToolCalls: 0,
    deterministicBypassPassed: false,
    deterministicBypassExpected: evaluationCase.deterministicBypassExpected,
    errors: [message],
    expectedOutcome: evaluationCase.expectedOutcome,
    groundingPassed: false,
    id: evaluationCase.id,
    intentPassed: false,
    noWritePassed: false,
    passed: false,
    responseComplete: false,
    telemetryPassed: false,
    toolSelectionPassed: false,
    unsupportedRejectionPassed: false,
  }
}

function syntheticOperationsResult(intent: OperationsIntent) {
  return buildOperationsToolResult({
    employees: [
      { displayName: 'Synthetic technician A', id: 'synthetic-employee-1' },
      { displayName: 'Synthetic technician B', id: 'synthetic-employee-2' },
    ],
    intent,
    isTruncated: false,
    jobs: [
      {
        assignedEmployeeIds: [],
        dueAtMillis: 500,
        id: 'synthetic-job-1',
        isActive: true,
        priority: 'High',
        status: 'open',
        title: 'Synthetic service job A',
      },
      {
        assignedEmployeeIds: ['synthetic-employee-1'],
        dueAtMillis: 500,
        id: 'synthetic-job-2',
        isActive: true,
        priority: 'Medium',
        status: 'in_progress',
        title: 'Synthetic service job B',
      },
    ],
    nowMillis: 1_000,
    sourceEmployeeLimit: 100,
    sourceJobLimit: 200,
  })
}

function syntheticWorkforceRecommendation(
  jobId: string,
): WorkforceRecommendationResult {
  return {
    candidates: [
      {
        employeeId: 'synthetic-employee-1',
        employeeName: 'Synthetic technician A',
        rank: 1,
        reasons: ['Matched the synthetic required skill fixture.'],
        score: 80,
        scoreBreakdown: {
          availability: 25,
          locationRelevance: 0,
          performance: 0,
          skillMatch: 35,
          workload: 20,
        },
        warnings: [],
      },
    ],
    engineVersion: 'rule-based-v1',
    generatedAt: '2026-07-16T00:00:00.000Z',
    jobId,
  }
}

function syntheticJobDraft(): JobDraftSuggestion {
  return {
    customerName: '',
    customerPhone: '',
    description: 'Synthetic cooling-system service request.',
    dueDate: null,
    location: '',
    needsReview: ['customerName', 'customerPhone', 'serviceAddress'],
    priority: '',
    requiredSkills: [],
    serviceAddress: '',
    source: 'development-stub',
    title: 'Synthetic service draft',
  }
}

function unsupportedClassification(): ModelIntentClassification {
  return {
    confidence: 0.99,
    intent: 'unsupported',
    requiresClarification: false,
  }
}

const syntheticManagerProfile: UserProfile = {
  activeTaskCount: 0,
  availability: 'available',
  createdAt: {} as UserProfile['createdAt'],
  displayName: 'Synthetic manager',
  email: 'synthetic-manager@example.test',
  id: 'synthetic-manager',
  isActive: true,
  organizationId: 'synthetic-organization',
  performanceScore: 0,
  role: 'manager',
  skills: [],
  updatedAt: {} as UserProfile['updatedAt'],
}

function passRate<K extends keyof CoordinatorEvaluationCaseResult>(
  results: CoordinatorEvaluationCaseResult[],
  field: K,
) {
  if (results.length === 0) return 1
  return divide(
    results.filter((result) => result[field] === true).length,
    results.length,
  )
}

function divide(numerator: number, denominator: number) {
  return denominator === 0 ? 0 : numerator / denominator
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`
}
