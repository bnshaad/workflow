import assert from 'node:assert/strict'
import test from 'node:test'

import type {
  ModelIntentClassification,
  ProposedAction,
  ProposedCreateJobPayload,
  UserProfile,
} from '../src/types/index.ts'
import type { WorkforceRecommendationResult } from '../../../shared/workforceIntelligence.ts'
import type {
  OperationsAttentionItem,
  OperationsIntent,
  OperationsToolResult,
} from '../../../shared/operationsIntelligence.ts'
import {
  WorkflowCoordinator,
  type CoordinatorTools,
} from '../src/services/coordinator/workflowCoordinator.ts'

const managerProfile: UserProfile = {
  activeTaskCount: 0,
  availability: 'available',
  createdAt: {} as UserProfile['createdAt'],
  displayName: 'Manager One',
  email: 'manager@example.com',
  id: 'manager-1',
  isActive: true,
  organizationId: 'org-1',
  performanceScore: 0,
  role: 'manager',
  skills: [],
  updatedAt: {} as UserProfile['updatedAt'],
}

const employeeProfile: UserProfile = {
  ...managerProfile,
  id: 'employee-1',
  role: 'employee',
}

const validJobPayload: ProposedCreateJobPayload = {
  customerName: 'Casey Customer',
  customerPhone: '555-0100',
  description: 'Urgent AC cooling issue.',
  dueDate: null,
  location: 'North District',
  priority: 'Urgent',
  requiredSkills: ['AC Repair'],
  serviceAddress: '1 Main Street',
  title: 'AC repair',
}

function createProposal(
  payload: ProposedCreateJobPayload,
): ProposedAction<ProposedCreateJobPayload> {
  return {
    actionType: 'create_job',
    completedAt: null,
    confirmedAt: null,
    createdAt: '2026-07-13T10:00:00.000Z',
    expiresAt: '2026-07-13T10:05:00.000Z',
    failureCode: null,
    failureSummary: null,
    idempotencyKey: 'create_job:proposal-1',
    organizationId: 'org-1',
    payload,
    payloadHash: 'fnv1a-test',
    processingStartedAt: null,
    proposalId: 'proposal-1',
    requestedBy: 'manager-1',
    requiresConfirmation: true,
    resultJobId: null,
    status: 'prepared',
    summary: 'Create job "AC repair" for Casey Customer.',
    updatedAt: '2026-07-13T10:00:00.000Z',
    version: 1,
    warnings: ['Review details before confirming.'],
  }
}

function createTools() {
  let classificationCalls = 0
  let confirmationCalls = 0
  let preparationCalls = 0
  let operationsCalls = 0
  let workforceCalls = 0
  const tools: CoordinatorTools = {
    async classifyCoordinatorIntent() {
      classificationCalls += 1
      return {
        confidence: 0,
        intent: 'unsupported',
        requiresClarification: true,
      }
    },
    async confirmCreateJobProposal(_profile, proposalId) {
      confirmationCalls += 1
      return {
        jobId: 'proposal-1',
        proposalId,
        status: 'completed',
      }
    },
    async createCreateJobProposal(_profile, payload) {
      preparationCalls += 1
      return createProposal(payload)
    },
    async generateJobDraft() {
      return {
        customerName: '',
        customerPhone: '',
        description: 'Request',
        dueDate: null,
        location: '',
        needsReview: [],
        priority: '',
        requiredSkills: [],
        serviceAddress: '',
        source: 'development-stub',
        title: '',
      }
    },
    async getOperationsInsight(_profile, intent) {
      operationsCalls += 1
      return operationsResult(intent)
    },
    async getWorkforceRecommendation(_profile, jobId) {
      workforceCalls += 1
      return workforceRecommendation(jobId)
    },
  }

  return {
    getClassificationCalls: () => classificationCalls,
    getConfirmationCalls: () => confirmationCalls,
    getPreparationCalls: () => preparationCalls,
    getOperationsCalls: () => operationsCalls,
    getWorkforceCalls: () => workforceCalls,
    tools,
  }
}

function operationsResult(intent: OperationsIntent): OperationsToolResult {
  const base = {
    generatedAt: '2026-07-15T00:00:00.000Z',
    isTruncated: false,
    sourceJobLimit: 200,
  }

  if (intent === 'show_workload_distribution') {
    return {
      ...base,
      employeeIsTruncated: false,
      employees: [],
      intent,
      note: 'No organization workload threshold is configured.',
      sourceEmployeeLimit: 100,
    }
  }

  if (intent === 'summarize_open_operations') {
    return {
      ...base,
      attentionItems: [],
      counts: {
        assigned: 2,
        draft: 1,
        inProgress: 1,
        open: 3,
        overdue: 1,
        urgentUnassigned: 1,
      },
      intent,
    }
  }

  if (intent === 'explain_job_attention_flag') {
    return {
      ...base,
      intent,
      item: attentionItem(),
      sourceJobLimit: 1,
    }
  }

  return {
    ...base,
    intent,
    items: intent === 'show_urgent_unassigned_jobs' ? [attentionItem()] : [],
  }
}

function attentionItem(): OperationsAttentionItem {
  return {
    assignedEmployeeCount: 0,
    attentionReasons: ['urgent_unassigned'],
    dueDate: null,
    jobId: 'job-urgent',
    priority: 'Urgent',
    status: 'open',
    title: 'Urgent repair',
  }
}

function workforceRecommendation(jobId: string): WorkforceRecommendationResult {
  return {
    candidates: [
      {
        employeeId: 'worker-1',
        employeeName: 'Worker One',
        rank: 1,
        reasons: ['Matched 1 of 1 required skill(s).'],
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
    generatedAt: '2026-07-15T00:00:00.000Z',
    jobId,
  }
}

function createCoordinator(tools: CoordinatorTools) {
  let nextId = 0

  return new WorkflowCoordinator({
    createId: () => `request-${++nextId}`,
    tools,
  })
}

test('routes an exact urgent-jobs command to only the operations tool', async () => {
  const { getClassificationCalls, tools } = createTools()
  const calledIntents: OperationsIntent[] = []
  tools.getOperationsInsight = async (_profile, intent) => {
    calledIntents.push(intent)
    return operationsResult(intent)
  }
  const coordinator = createCoordinator(tools)

  const result = await coordinator.handle(managerProfile, {
    message: 'Show urgent unassigned jobs',
    uiContext: 'dashboard',
  })

  assert.equal(result.kind, 'result')
  assert.equal(result.route.intent, 'show_urgent_unassigned_jobs')
  assert.equal(result.route.agent, 'operations_insight')
  assert.deepEqual(calledIntents, ['show_urgent_unassigned_jobs'])
  assert.equal(getClassificationCalls(), 0)
  assert.equal(result.execution.modelCalls, 0)
  assert.equal(result.execution.toolCalls, 1)
})

test('uses a safe fallback for unsupported or low-confidence requests', async () => {
  const { getClassificationCalls, tools } = createTools()
  const coordinator = createCoordinator(tools)

  const result = await coordinator.handle(managerProfile, {
    message: 'Predict next month staffing needs',
    uiContext: 'dashboard',
  })

  assert.equal(result.kind, 'fallback')
  assert.equal(result.route.intent, null)
  assert.equal(result.execution.toolCalls, 0)
  assert.equal(result.execution.modelCalls, 1)
  assert.equal(getClassificationCalls(), 1)
})

test('uses one validated model classification to invoke only its allowlisted tool', async () => {
  const { tools } = createTools()
  let classificationCalls = 0
  const calledIntents: OperationsIntent[] = []
  tools.classifyCoordinatorIntent = async () => {
    classificationCalls += 1
    return {
      confidence: 0.92,
      intent: 'show_urgent_unassigned_jobs',
      requiresClarification: false,
    } satisfies ModelIntentClassification
  }
  tools.getOperationsInsight = async (_profile, intent) => {
    calledIntents.push(intent)
    return operationsResult(intent)
  }
  const coordinator = createCoordinator(tools)

  const result = await coordinator.handle(managerProfile, {
    message: 'What work needs attention immediately?',
    uiContext: 'dashboard',
  })

  assert.equal(result.kind, 'result')
  assert.equal(result.route.intent, 'show_urgent_unassigned_jobs')
  assert.equal(result.execution.modelCalls, 1)
  assert.equal(classificationCalls, 1)
  assert.deepEqual(calledIntents, ['show_urgent_unassigned_jobs'])
})

test('rejects low-confidence, malformed, and unknown-tool model output safely', async () => {
  const { tools } = createTools()
  const coordinator = createCoordinator(tools)
  tools.classifyCoordinatorIntent = async () => ({
    confidence: 0.4,
    intent: 'summarize_open_operations',
    requiresClarification: false,
  })

  const lowConfidence = await coordinator.handle(managerProfile, {
    message: 'Can you help with operations?',
    uiContext: 'dashboard',
  })
  assert.equal(lowConfidence.kind, 'fallback')

  tools.classifyCoordinatorIntent = async () => ({
    confidence: 0.95,
    intent: 'show_urgent_unassigned_jobs',
    requiresClarification: false,
    toolName: 'delete_everything',
  }) as never
  const unknownTool = await coordinator.handle(managerProfile, {
    message: 'What needs attention?',
    uiContext: 'dashboard',
  })
  assert.equal(unknownTool.kind, 'fallback')
  assert.equal(unknownTool.execution.toolCalls, 0)

  tools.classifyCoordinatorIntent = async () => ({ intent: 'unknown' }) as never
  const malformed = await coordinator.handle(managerProfile, {
    message: 'Need another answer.',
    uiContext: 'dashboard',
  })
  assert.equal(malformed.kind, 'fallback')
})

test('enforces one model call when classification would otherwise request drafting', async () => {
  const { tools } = createTools()
  let draftCalls = 0
  let classificationCalls = 0
  tools.classifyCoordinatorIntent = async () => {
    classificationCalls += 1
    return {
      confidence: 0.98,
      intent: 'prepare_job_draft',
      requiresClarification: false,
    }
  }
  tools.generateJobDraft = async () => {
    draftCalls += 1
    return {
      customerName: '',
      customerPhone: '',
      description: 'Draft',
      dueDate: null,
      location: '',
      needsReview: [],
      priority: '',
      requiredSkills: [],
      serviceAddress: '',
      source: 'gemini',
      title: '',
    }
  }
  const coordinator = createCoordinator(tools)

  const result = await coordinator.handle(managerProfile, {
    message: 'The AC is not cooling at the customer site.',
    uiContext: 'create_job',
  })

  assert.equal(result.kind, 'fallback')
  assert.equal(result.execution.modelCalls, 1)
  assert.equal(classificationCalls, 1)
  assert.equal(draftCalls, 0)
})

test('prepares a durable proposal without invoking critical execution', async () => {
  const { getConfirmationCalls, getPreparationCalls, tools } = createTools()
  const coordinator = createCoordinator(tools)

  const proposal = await coordinator.prepareCreateJobProposal(
    managerProfile,
    validJobPayload,
  )

  assert.equal(proposal.actionType, 'create_job')
  assert.equal(proposal.status, 'prepared')
  assert.equal(getPreparationCalls(), 1)
  assert.equal(getConfirmationCalls(), 0)
})

test('confirms by proposal ID through the trusted adapter', async () => {
  const { getConfirmationCalls, tools } = createTools()
  const coordinator = createCoordinator(tools)

  const result = await coordinator.confirmCreateJobProposal(
    managerProfile,
    'proposal-1',
  )

  assert.equal(result.jobId, 'proposal-1')
  assert.equal(result.status, 'completed')
  assert.equal(getConfirmationCalls(), 1)
})

test('rejects an unauthorized coordinator confirmation before calling the adapter', async () => {
  const { getConfirmationCalls, tools } = createTools()
  const coordinator = createCoordinator(tools)

  await assert.rejects(
    coordinator.confirmCreateJobProposal(employeeProfile, 'proposal-1'),
    /permission/,
  )
  assert.equal(getConfirmationCalls(), 0)
})

test('invalid tool output falls back without returning unvalidated data', async () => {
  const { tools } = createTools()
  tools.getOperationsInsight = async () => ({ intent: 'unknown' }) as never
  const coordinator = createCoordinator(tools)

  const result = await coordinator.handle(managerProfile, {
    message: 'Summarize open jobs',
    uiContext: 'dashboard',
  })

  assert.equal(result.kind, 'fallback')
  assert.match(result.route.reason, /invalid data|mismatched intent/)
})

test('routes a deterministic workforce request to one read-only tool call', async () => {
  const { getClassificationCalls, getWorkforceCalls, tools } = createTools()
  const coordinator = createCoordinator(tools)

  const result = await coordinator.handle(managerProfile, {
    jobId: 'job-1',
    message: 'Who is the best technician for this job?',
    uiContext: 'job_details',
  })

  assert.equal(result.kind, 'result')
  assert.equal(result.route.intent, 'recommend_employee_for_job')
  assert.equal(result.route.agent, 'workforce_intelligence')
  assert.equal(result.execution.modelCalls, 0)
  assert.equal(result.execution.toolCalls, 1)
  assert.equal(getClassificationCalls(), 0)
  assert.equal(getWorkforceCalls(), 1)
  assert.equal('proposalId' in result.data, false)
})

test('uses one model classification and one fixed workforce tool', async () => {
  const { getWorkforceCalls, tools } = createTools()
  let classificationCalls = 0
  tools.classifyCoordinatorIntent = async () => {
    classificationCalls += 1
    return {
      confidence: 0.94,
      intent: 'compare_top_candidates',
      requiresClarification: false,
    }
  }
  const coordinator = createCoordinator(tools)

  const result = await coordinator.handle(managerProfile, {
    jobId: 'job-1',
    message: 'Compare the strongest available options.',
    uiContext: 'job_details',
  })

  assert.equal(result.kind, 'result')
  assert.equal(result.route.intent, 'compare_top_candidates')
  assert.equal(result.route.toolName, 'get_workforce_recommendation')
  assert.equal(result.execution.modelCalls, 1)
  assert.equal(result.execution.toolCalls, 1)
  assert.equal(classificationCalls, 1)
  assert.equal(getWorkforceCalls(), 1)
})

test('workforce requests fail closed without a trusted job context', async () => {
  const { getWorkforceCalls, tools } = createTools()
  tools.classifyCoordinatorIntent = async () => ({
    confidence: 0.95,
    intent: 'explain_recommendation',
    requiresClarification: false,
  })
  const coordinator = createCoordinator(tools)

  const result = await coordinator.handle(managerProfile, {
    message: 'Why is Rahul recommended?',
    uiContext: 'job_details',
  })

  assert.equal(result.kind, 'fallback')
  assert.equal(result.execution.modelCalls, 1)
  assert.equal(result.execution.toolCalls, 0)
  assert.equal(getWorkforceCalls(), 0)
})

test('unrelated and unknown workforce requests never invoke the workforce tool', async () => {
  const { getWorkforceCalls, tools } = createTools()
  const coordinator = createCoordinator(tools)

  const unrelated = await coordinator.handle(managerProfile, {
    jobId: 'job-1',
    message: 'Summarize open jobs',
    uiContext: 'job_details',
  })
  assert.equal(unrelated.route.intent, 'summarize_open_operations')
  assert.equal(getWorkforceCalls(), 0)

  tools.classifyCoordinatorIntent = async () => ({
    confidence: 0.98,
    intent: 'unsupported',
    requiresClarification: false,
  })
  const unknown = await coordinator.handle(managerProfile, {
    jobId: 'job-1',
    message: 'Choose whoever will make the customer happiest next month.',
    uiContext: 'job_details',
  })
  assert.equal(unknown.kind, 'fallback')
  assert.equal(unknown.execution.modelCalls, 1)
  assert.equal(unknown.execution.toolCalls, 0)
  assert.equal(getWorkforceCalls(), 0)
})
