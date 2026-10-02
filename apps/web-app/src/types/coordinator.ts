import type { JobPriority } from './jobPriority'
import type { ActionProposalStatus as SharedActionProposalStatus } from '../../../../shared/actionProposal.ts'
import type { ModelIntentClassification as SharedModelIntentClassification } from '../../../../shared/coordinatorModel.ts'
import type { WorkforceIntelligenceResult } from '../../../../shared/workforceIntelligence.ts'
import type {
  OperationsIntelligenceResult,
  OperationsIntent,
} from '../../../../shared/operationsIntelligence.ts'

export const SupportedCoordinatorIntents = {
  PrepareCreateJobProposal: 'prepare_create_job_proposal',
  PrepareJobDraft: 'prepare_job_draft',
  RecommendEmployeeForJob: 'recommend_employee_for_job',
  ExplainRecommendation: 'explain_recommendation',
  CompareTopCandidates: 'compare_top_candidates',
  ExplainJobAttentionFlag: 'explain_job_attention_flag',
  ShowJobsRequiringAttention: 'show_jobs_requiring_attention',
  ShowOverdueJobs: 'show_overdue_jobs',
  ShowWorkloadDistribution: 'show_workload_distribution',
  ShowUrgentUnassignedJobs: 'show_urgent_unassigned_jobs',
  SummarizeOpenOperations: 'summarize_open_operations',
} as const

export type SupportedCoordinatorIntent =
  (typeof SupportedCoordinatorIntents)[keyof typeof SupportedCoordinatorIntents]

export const CriticalActionTypes = {
  CreateJob: 'create_job',
  AssignEmployee: 'assign_employee',
  CancelJob: 'cancel_job',
  ChangeJobStatus: 'change_job_status',
  DeleteJob: 'delete_job',
  ModifyAssignmentCriteria: 'modify_assignment_criteria',
  ModifyKnowledgeDocument: 'modify_knowledge_document',
  ModifyOrganizationSettings: 'modify_organization_settings',
  ModifyUserRole: 'modify_user_role',
  ReassignEmployee: 'reassign_employee',
  ResolveIncident: 'resolve_incident',
  SendOperationalNotification: 'send_operational_notification',
  UnassignEmployee: 'unassign_employee',
} as const

export type CriticalActionType =
  (typeof CriticalActionTypes)[keyof typeof CriticalActionTypes]

export type CoordinatorAgent =
  | 'job_intelligence'
  | 'operations_insight'
  | 'workforce_intelligence'
  | 'knowledge'

export type CoordinatorUiContext =
  | 'create_job'
  | 'dashboard'
  | 'job_details'
  | 'jobs'
  | 'unknown'

export type CoordinatorRequest = {
  createJobInput?: ProposedCreateJobPayload
  customerRequest?: string
  jobId?: string
  message: string
  requestId?: string
  uiContext: CoordinatorUiContext
}

export type CoordinatorRoute = {
  agent: CoordinatorAgent
  confidence: number
  intent: SupportedCoordinatorIntent | null
  reason: string
  toolName: string | null
}

export type ProposedCreateJobPayload = {
  customerName: string
  customerPhone: string
  description: string
  dueDate: string | null
  location: string
  priority: JobPriority
  requiredSkills: string[]
  serviceAddress: string
  title: string
}

export type ActionProposalStatus = SharedActionProposalStatus
export type ModelIntentClassification = SharedModelIntentClassification

export interface ProposedAction<TPayload> {
  actionType: CriticalActionType
  completedAt: string | null
  confirmedAt: string | null
  createdAt: string
  entityVersion?: string
  expiresAt: string
  failureCode: string | null
  failureSummary: string | null
  idempotencyKey: string
  organizationId: string
  payload: TPayload
  payloadHash: string
  processingStartedAt: string | null
  proposalId: string
  resultJobId: string | null
  requestedBy: string
  requiresConfirmation: true
  source?: 'manual' | 'coordinator' | 'whatsapp'
  status: ActionProposalStatus
  summary: string
  updatedAt: string
  version: number
  warnings: string[]
  whatsappMetadata?: import('./whatsapp').WhatsAppProposalMetadata
}

export type ActionProposalExecutionResult = {
  jobId: string
  proposalId: string
  status: 'completed'
}

export type CoordinatorExecution = {
  modelCalls: number
  steps: number
  toolCalls: number
}

export type CoordinatorFallback = {
  correlationId: string
  execution: CoordinatorExecution
  kind: 'fallback'
  message: string
  route: CoordinatorRoute
}

export type CoordinatorResult<TData> = {
  correlationId: string
  data: TData
  execution: CoordinatorExecution
  kind: 'result'
  route: CoordinatorRoute
}

export type CoordinatorResponse<TData> =
  | CoordinatorFallback
  | CoordinatorResult<TData>

export type { WorkforceIntelligenceResult }
export type { OperationsIntelligenceResult, OperationsIntent }

export type UrgentUnassignedJob = {
  dueDate: string | null
  id: string
  priority: JobPriority
  title: string
}

export type OpenJobsSummary = {
  openJobCount: number
  totalJobCount: number
}

export type HighestWorkloadEmployee = {
  activeJobCount: number
  displayName: string
  employeeId: string
  inProgressJobCount: number
}

export type WorkloadSnapshot = {
  employees: HighestWorkloadEmployee[]
  note: string
}

export type JobDraftSuggestion = {
  customerName: string
  customerPhone: string
  description: string
  dueDate: string | null
  location: string
  needsReview: string[]
  priority: JobPriority | ''
  requiredSkills: string[]
  serviceAddress: string
  source: 'development-stub' | 'gemini'
  title: string
}
