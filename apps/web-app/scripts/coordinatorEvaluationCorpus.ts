import {
  SupportedCoordinatorIntents,
  type CoordinatorRequest,
  type SupportedCoordinatorIntent,
} from '../src/types/coordinator.ts'
import type { ModelIntentClassification } from '../../../shared/coordinatorModel.ts'

export const COORDINATOR_EVALUATION_CORPUS_VERSION =
  'coordinator-functional-v1' as const

export const COORDINATOR_EVALUATION_CATEGORIES = [
  'ambiguous_operations',
  'boundary_and_ambiguity',
  'deterministic_operations',
  'other_supported_read_only',
  'unsupported_mutation',
] as const

export type CoordinatorEvaluationCategory =
  (typeof COORDINATOR_EVALUATION_CATEGORIES)[number]

export type CoordinatorEvaluationOutcome =
  | 'safe_fallback'
  | 'success'
  | 'unsupported'

export type CoordinatorEvaluationCase = {
  category: CoordinatorEvaluationCategory
  deterministicBypassExpected: boolean
  expectedIntent: SupportedCoordinatorIntent | null
  expectedModelCalls: 0 | 1
  expectedOutcome: CoordinatorEvaluationOutcome
  expectedRouteSource: 'deterministic' | 'model'
  expectedTool: string | null
  expectedToolCalls: 0 | 1
  forbiddenClaims: string[]
  id: string
  modelFailure?: true
  modelResponse?: ModelIntentClassification & { toolName?: string }
  request: CoordinatorRequest & Record<string, unknown>
  requiresNoWrite: true
}

export type CoordinatorEvaluationCorpus = {
  cases: CoordinatorEvaluationCase[]
  kind: 'controlled_functional_evaluation'
  version: typeof COORDINATOR_EVALUATION_CORPUS_VERSION
}

const forbiddenClaims = [
  'predictive delay',
  'failure risk',
  'burnout',
  'real-time tracking',
  'live location',
  'overloaded employee',
  'completed today',
  'automatically assigned',
  'autonomous action',
]

const unsupportedModelResponse: ModelIntentClassification = {
  confidence: 0.99,
  intent: 'unsupported',
  requiresClarification: false,
}

function evaluationCase(
  value: Omit<
    CoordinatorEvaluationCase,
    'forbiddenClaims' | 'requiresNoWrite'
  >,
): CoordinatorEvaluationCase {
  return {
    ...value,
    forbiddenClaims: [...forbiddenClaims],
    requiresNoWrite: true,
  }
}

export const coordinatorEvaluationCorpus: CoordinatorEvaluationCorpus = {
  cases: [
    evaluationCase({
      category: 'deterministic_operations',
      deterministicBypassExpected: true,
      expectedIntent: SupportedCoordinatorIntents.ShowUrgentUnassignedJobs,
      expectedModelCalls: 0,
      expectedOutcome: 'success',
      expectedRouteSource: 'deterministic',
      expectedTool: 'get_operations_insight',
      expectedToolCalls: 1,
      id: 'ops-exact-urgent-unassigned',
      request: { message: 'Show urgent unassigned jobs', uiContext: 'dashboard' },
    }),
    evaluationCase({
      category: 'deterministic_operations',
      deterministicBypassExpected: true,
      expectedIntent: SupportedCoordinatorIntents.ShowOverdueJobs,
      expectedModelCalls: 0,
      expectedOutcome: 'success',
      expectedRouteSource: 'deterministic',
      expectedTool: 'get_operations_insight',
      expectedToolCalls: 1,
      id: 'ops-exact-overdue',
      request: { message: 'Show overdue jobs', uiContext: 'dashboard' },
    }),
    evaluationCase({
      category: 'deterministic_operations',
      deterministicBypassExpected: true,
      expectedIntent: SupportedCoordinatorIntents.SummarizeOpenOperations,
      expectedModelCalls: 0,
      expectedOutcome: 'success',
      expectedRouteSource: 'deterministic',
      expectedTool: 'get_operations_insight',
      expectedToolCalls: 1,
      id: 'ops-exact-open-summary',
      request: { message: 'Summarize open operations', uiContext: 'dashboard' },
    }),
    evaluationCase({
      category: 'deterministic_operations',
      deterministicBypassExpected: true,
      expectedIntent: SupportedCoordinatorIntents.ShowWorkloadDistribution,
      expectedModelCalls: 0,
      expectedOutcome: 'success',
      expectedRouteSource: 'deterministic',
      expectedTool: 'get_operations_insight',
      expectedToolCalls: 1,
      id: 'ops-exact-workload',
      request: { message: 'Show workload distribution', uiContext: 'dashboard' },
    }),
    evaluationCase({
      category: 'deterministic_operations',
      deterministicBypassExpected: true,
      expectedIntent: SupportedCoordinatorIntents.ShowJobsRequiringAttention,
      expectedModelCalls: 0,
      expectedOutcome: 'success',
      expectedRouteSource: 'deterministic',
      expectedTool: 'get_operations_insight',
      expectedToolCalls: 1,
      id: 'ops-exact-attention',
      request: { message: 'Show jobs requiring attention', uiContext: 'jobs' },
    }),
    evaluationCase({
      category: 'deterministic_operations',
      deterministicBypassExpected: true,
      expectedIntent: SupportedCoordinatorIntents.ExplainJobAttentionFlag,
      expectedModelCalls: 0,
      expectedOutcome: 'success',
      expectedRouteSource: 'deterministic',
      expectedTool: 'get_operations_insight',
      expectedToolCalls: 1,
      id: 'ops-exact-explain-flag',
      request: {
        jobId: 'synthetic-job-1',
        message: 'Why is this job flagged?',
        uiContext: 'job_details',
      },
    }),
    evaluationCase({
      category: 'ambiguous_operations',
      deterministicBypassExpected: true,
      expectedIntent: SupportedCoordinatorIntents.ShowJobsRequiringAttention,
      expectedModelCalls: 0,
      expectedOutcome: 'success',
      expectedRouteSource: 'deterministic',
      expectedTool: 'get_operations_insight',
      expectedToolCalls: 1,
      id: 'ops-natural-attention-exact-alias',
      request: { message: 'What needs attention today?', uiContext: 'dashboard' },
    }),
    evaluationCase({
      category: 'ambiguous_operations',
      deterministicBypassExpected: false,
      expectedIntent: SupportedCoordinatorIntents.ShowUrgentUnassignedJobs,
      expectedModelCalls: 1,
      expectedOutcome: 'success',
      expectedRouteSource: 'model',
      expectedTool: 'get_operations_insight',
      expectedToolCalls: 1,
      id: 'ops-ambiguous-critical',
      modelResponse: {
        confidence: 0.94,
        intent: 'show_urgent_unassigned_jobs',
        requiresClarification: false,
      },
      request: { message: 'Is anything operationally critical?', uiContext: 'dashboard' },
    }),
    evaluationCase({
      category: 'ambiguous_operations',
      deterministicBypassExpected: false,
      expectedIntent: SupportedCoordinatorIntents.ShowJobsRequiringAttention,
      expectedModelCalls: 1,
      expectedOutcome: 'success',
      expectedRouteSource: 'model',
      expectedTool: 'get_operations_insight',
      expectedToolCalls: 1,
      id: 'ops-ambiguous-manager-review',
      modelResponse: {
        confidence: 0.95,
        intent: 'show_jobs_requiring_attention',
        requiresClarification: false,
      },
      request: { message: 'Which jobs require a manager review?', uiContext: 'jobs' },
    }),
    evaluationCase({
      category: 'ambiguous_operations',
      deterministicBypassExpected: false,
      expectedIntent: SupportedCoordinatorIntents.ShowWorkloadDistribution,
      expectedModelCalls: 1,
      expectedOutcome: 'success',
      expectedRouteSource: 'model',
      expectedTool: 'get_operations_insight',
      expectedToolCalls: 1,
      id: 'ops-ambiguous-distribution',
      modelResponse: {
        clarificationReason: 'A current job is required.',
        confidence: 0.96,
        intent: 'show_workload_distribution',
        requiresClarification: false,
      },
      request: { message: 'How is work distributed across the team?', uiContext: 'dashboard' },
    }),
    evaluationCase({
      category: 'ambiguous_operations',
      deterministicBypassExpected: false,
      expectedIntent: SupportedCoordinatorIntents.SummarizeOpenOperations,
      expectedModelCalls: 1,
      expectedOutcome: 'success',
      expectedRouteSource: 'model',
      expectedTool: 'get_operations_insight',
      expectedToolCalls: 1,
      id: 'ops-ambiguous-current-picture',
      modelResponse: {
        confidence: 0.93,
        intent: 'summarize_open_operations',
        requiresClarification: false,
      },
      request: { message: 'Give me the current operations picture.', uiContext: 'dashboard' },
    }),
    evaluationCase({
      category: 'ambiguous_operations',
      deterministicBypassExpected: false,
      expectedIntent: SupportedCoordinatorIntents.ShowOverdueJobs,
      expectedModelCalls: 1,
      expectedOutcome: 'success',
      expectedRouteSource: 'model',
      expectedTool: 'get_operations_insight',
      expectedToolCalls: 1,
      id: 'ops-ambiguous-past-deadline',
      modelResponse: {
        confidence: 0.95,
        intent: 'show_overdue_jobs',
        requiresClarification: false,
      },
      request: { message: 'Which active work is past its deadline?', uiContext: 'jobs' },
    }),
    ...[
      ['mutation-cancel-overdue', 'Cancel every overdue job'],
      ['mutation-reassign-urgent', 'Reassign all urgent jobs automatically'],
      ['mutation-complete-delayed', 'Mark all delayed jobs completed'],
      ['mutation-notify-team', 'Notify every technician'],
      ['mutation-delete-open', 'Delete all open jobs'],
      ['mutation-change-priority', 'Change every open job to urgent'],
    ].map(([id, message]) =>
      evaluationCase({
        category: 'unsupported_mutation',
        deterministicBypassExpected: false,
        expectedIntent: null,
        expectedModelCalls: 1,
        expectedOutcome: 'unsupported',
        expectedRouteSource: 'model',
        expectedTool: null,
        expectedToolCalls: 0,
        id,
        modelResponse: unsupportedModelResponse,
        request: { message, uiContext: 'jobs' },
      }),
    ),
    evaluationCase({
      category: 'boundary_and_ambiguity',
      deterministicBypassExpected: false,
      expectedIntent: SupportedCoordinatorIntents.ShowJobsRequiringAttention,
      expectedModelCalls: 1,
      expectedOutcome: 'success',
      expectedRouteSource: 'model',
      expectedTool: 'get_operations_insight',
      expectedToolCalls: 1,
      id: 'boundary-two-operations-intents',
      modelResponse: {
        confidence: 0.91,
        intent: 'show_jobs_requiring_attention',
        requiresClarification: false,
      },
      request: { message: 'Show overdue urgent work needing attention', uiContext: 'jobs' },
    }),
    evaluationCase({
      category: 'boundary_and_ambiguity',
      deterministicBypassExpected: false,
      expectedIntent: null,
      expectedModelCalls: 1,
      expectedOutcome: 'unsupported',
      expectedRouteSource: 'model',
      expectedTool: null,
      expectedToolCalls: 0,
      id: 'boundary-explain-without-job',
      modelResponse: {
        clarificationReason: 'A current job is required.',
        confidence: 0.96,
        intent: 'explain_job_attention_flag',
        requiresClarification: false,
      },
      request: { message: 'Explain why the job is flagged', uiContext: 'job_details' },
    }),
    evaluationCase({
      category: 'boundary_and_ambiguity',
      deterministicBypassExpected: true,
      expectedIntent: SupportedCoordinatorIntents.ShowWorkloadDistribution,
      expectedModelCalls: 0,
      expectedOutcome: 'success',
      expectedRouteSource: 'deterministic',
      expectedTool: 'get_operations_insight',
      expectedToolCalls: 1,
      id: 'boundary-overloaded-no-threshold',
      request: { message: 'Which technicians are overloaded?', uiContext: 'dashboard' },
    }),
    ...[
      ['boundary-prediction', 'Predict which jobs will be delayed next week'],
      ['boundary-completed-today', 'How many jobs were completed today?'],
    ].map(([id, message]) =>
      evaluationCase({
        category: 'boundary_and_ambiguity',
        deterministicBypassExpected: false,
        expectedIntent: null,
        expectedModelCalls: 1,
        expectedOutcome: 'unsupported',
        expectedRouteSource: 'model',
        expectedTool: null,
        expectedToolCalls: 0,
        id,
        modelResponse: unsupportedModelResponse,
        request: { message, uiContext: 'dashboard' },
      }),
    ),
    evaluationCase({
      category: 'boundary_and_ambiguity',
      deterministicBypassExpected: true,
      expectedIntent: SupportedCoordinatorIntents.SummarizeOpenOperations,
      expectedModelCalls: 0,
      expectedOutcome: 'success',
      expectedRouteSource: 'deterministic',
      expectedTool: 'get_operations_insight',
      expectedToolCalls: 1,
      id: 'boundary-untrusted-organization-ignored',
      request: {
        message: 'Summarize open operations',
        organizationId: 'untrusted-organization',
        role: 'admin',
        uiContext: 'dashboard',
      },
    }),
    evaluationCase({
      category: 'boundary_and_ambiguity',
      deterministicBypassExpected: false,
      expectedIntent: null,
      expectedModelCalls: 1,
      expectedOutcome: 'unsupported',
      expectedRouteSource: 'model',
      expectedTool: null,
      expectedToolCalls: 0,
      id: 'boundary-empty-message',
      modelResponse: unsupportedModelResponse,
      request: { message: '   ', uiContext: 'dashboard' },
    }),
    evaluationCase({
      category: 'boundary_and_ambiguity',
      deterministicBypassExpected: false,
      expectedIntent: null,
      expectedModelCalls: 1,
      expectedOutcome: 'unsupported',
      expectedRouteSource: 'model',
      expectedTool: null,
      expectedToolCalls: 0,
      id: 'boundary-malformed-message',
      modelResponse: unsupportedModelResponse,
      request: { message: 42 as never, uiContext: 'dashboard' },
    }),
    evaluationCase({
      category: 'boundary_and_ambiguity',
      deterministicBypassExpected: false,
      expectedIntent: null,
      expectedModelCalls: 1,
      expectedOutcome: 'unsupported',
      expectedRouteSource: 'model',
      expectedTool: null,
      expectedToolCalls: 0,
      id: 'boundary-wrong-ui-context',
      modelResponse: unsupportedModelResponse,
      request: { message: 'Show overdue jobs', uiContext: 'create_job' },
    }),
    evaluationCase({
      category: 'boundary_and_ambiguity',
      deterministicBypassExpected: false,
      expectedIntent: null,
      expectedModelCalls: 1,
      expectedOutcome: 'safe_fallback',
      expectedRouteSource: 'model',
      expectedTool: null,
      expectedToolCalls: 0,
      id: 'boundary-unknown-model-tool',
      modelResponse: {
        confidence: 0.99,
        intent: 'show_overdue_jobs',
        requiresClarification: false,
        toolName: 'delete_jobs',
      },
      request: { message: 'Find old work', uiContext: 'jobs' },
    }),
    evaluationCase({
      category: 'boundary_and_ambiguity',
      deterministicBypassExpected: false,
      expectedIntent: null,
      expectedModelCalls: 1,
      expectedOutcome: 'unsupported',
      expectedRouteSource: 'model',
      expectedTool: null,
      expectedToolCalls: 0,
      id: 'boundary-low-confidence',
      modelResponse: {
        confidence: 0.4,
        intent: 'show_overdue_jobs',
        requiresClarification: false,
      },
      request: { message: 'What is happening?', uiContext: 'dashboard' },
    }),
    evaluationCase({
      category: 'boundary_and_ambiguity',
      deterministicBypassExpected: false,
      expectedIntent: null,
      expectedModelCalls: 1,
      expectedOutcome: 'unsupported',
      expectedRouteSource: 'model',
      expectedTool: null,
      expectedToolCalls: 0,
      id: 'boundary-classifier-failure',
      modelFailure: true,
      request: { message: 'Review current operational work', uiContext: 'dashboard' },
    }),
    evaluationCase({
      category: 'boundary_and_ambiguity',
      deterministicBypassExpected: false,
      expectedIntent: null,
      expectedModelCalls: 1,
      expectedOutcome: 'unsupported',
      expectedRouteSource: 'model',
      expectedTool: null,
      expectedToolCalls: 0,
      id: 'boundary-proposal-without-structured-input',
      modelResponse: unsupportedModelResponse,
      request: { message: 'Prepare job creation', uiContext: 'create_job' },
    }),
    evaluationCase({
      category: 'other_supported_read_only',
      deterministicBypassExpected: true,
      expectedIntent: SupportedCoordinatorIntents.RecommendEmployeeForJob,
      expectedModelCalls: 0,
      expectedOutcome: 'success',
      expectedRouteSource: 'deterministic',
      expectedTool: 'get_workforce_recommendation',
      expectedToolCalls: 1,
      id: 'workforce-exact-recommend',
      request: {
        jobId: 'synthetic-job-1',
        message: 'Recommend employee for job',
        uiContext: 'job_details',
      },
    }),
    evaluationCase({
      category: 'other_supported_read_only',
      deterministicBypassExpected: true,
      expectedIntent: SupportedCoordinatorIntents.ExplainRecommendation,
      expectedModelCalls: 0,
      expectedOutcome: 'success',
      expectedRouteSource: 'deterministic',
      expectedTool: 'get_workforce_recommendation',
      expectedToolCalls: 1,
      id: 'workforce-exact-explain',
      request: {
        jobId: 'synthetic-job-1',
        message: 'Explain recommendation',
        uiContext: 'job_details',
      },
    }),
    evaluationCase({
      category: 'other_supported_read_only',
      deterministicBypassExpected: true,
      expectedIntent: SupportedCoordinatorIntents.CompareTopCandidates,
      expectedModelCalls: 0,
      expectedOutcome: 'success',
      expectedRouteSource: 'deterministic',
      expectedTool: 'get_workforce_recommendation',
      expectedToolCalls: 1,
      id: 'workforce-exact-compare',
      request: {
        jobId: 'synthetic-job-1',
        message: 'Compare top candidates',
        uiContext: 'job_details',
      },
    }),
    evaluationCase({
      category: 'other_supported_read_only',
      deterministicBypassExpected: true,
      expectedIntent: SupportedCoordinatorIntents.PrepareJobDraft,
      expectedModelCalls: 1,
      expectedOutcome: 'success',
      expectedRouteSource: 'deterministic',
      expectedTool: 'generate_job_draft',
      expectedToolCalls: 1,
      id: 'job-draft-exact',
      request: {
        customerRequest: 'Synthetic cooling-system service request.',
        message: 'Prepare job draft',
        uiContext: 'create_job',
      },
    }),
  ],
  kind: 'controlled_functional_evaluation',
  version: COORDINATOR_EVALUATION_CORPUS_VERSION,
}
