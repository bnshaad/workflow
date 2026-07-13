import {
  isJobPriority,
  type JobPriority,
} from '../../../shared/jobCreation.js'
import {
  isModelCoordinatorIntent,
  type ModelIntentClassification,
  type ModelJobDraft,
} from '../../../shared/coordinatorModel.js'
import {
  ModelProviderError,
  type StructuredModelProvider,
} from './modelProvider.js'

const MAX_TEXT_LENGTH = 2_000
const MAX_ARRAY_ITEMS = 10
const MAX_FIELD_LENGTH = 240

export type ModelClassificationInput = {
  message: string
  uiContext: string
}

export function createModelCoordinatorService(provider: StructuredModelProvider) {
  return {
    async classifyIntent(input: ModelClassificationInput) {
      const message = requireBoundedText(input.message, 'message')
      const uiContext = requireUiContext(input.uiContext)
      const result = await provider.generateJson({
        prompt: `Classify this Workflow manager request. UI context: ${uiContext}. Request: ${message}`,
        responseSchema: intentSchema(),
        systemInstruction:
          'Return JSON only. Choose one supported intent. Do not provide tools, authorization, explanations, or actions.',
      })

      return validateIntentClassification(result)
    },

    async draftJob(customerRequest: string) {
      const request = requireBoundedText(customerRequest, 'customer request')
      const result = await provider.generateJson({
        prompt: `Extract an editable Workflow job draft from this customer request: ${request}`,
        responseSchema: jobDraftSchema(),
        systemInstruction:
          'Return JSON only. Extract only stated information. Use empty strings, null, and missingFields for unknown values. Never invent customer data, addresses, dates, skills, or priorities. This output cannot create or authorize a job.',
      })

      return validateModelJobDraft(result)
    },
  }
}

export function toPublicModelError(error: unknown) {
  if (!(error instanceof ModelProviderError)) {
    return {
      code: 'unavailable' as const,
      message: 'The drafting service is temporarily unavailable. Complete the form manually.',
    }
  }

  switch (error.kind) {
    case 'missing_configuration':
      return {
        code: 'failed-precondition' as const,
        message: 'AI drafting is not configured. Complete the form manually.',
      }
    case 'quota_exhausted':
      return {
        code: 'resource-exhausted' as const,
        message: 'AI drafting is temporarily unavailable. Complete the form manually.',
      }
    case 'timeout':
      return {
        code: 'deadline-exceeded' as const,
        message: 'AI drafting timed out. Complete the form manually.',
      }
    default:
      return {
        code: 'unavailable' as const,
        message: 'AI drafting is temporarily unavailable. Complete the form manually.',
      }
  }
}

function validateIntentClassification(value: unknown): ModelIntentClassification {
  if (!value || typeof value !== 'object') {
    throw new ModelProviderError('invalid_response', 'Classification is invalid.')
  }

  const record = value as Record<string, unknown>
  const confidence = record.confidence

  if (
    !isModelCoordinatorIntent(record.intent) ||
    typeof confidence !== 'number' ||
    !Number.isFinite(confidence) ||
    confidence < 0 ||
    confidence > 1 ||
    typeof record.requiresClarification !== 'boolean'
  ) {
    throw new ModelProviderError('invalid_response', 'Classification is invalid.')
  }

  const clarificationReason = readOptionalText(record.clarificationReason, 240)

  return clarificationReason
    ? {
        clarificationReason,
        confidence,
        intent: record.intent,
        requiresClarification: record.requiresClarification,
      }
    : {
        confidence,
        intent: record.intent,
        requiresClarification: record.requiresClarification,
      }
}

function validateModelJobDraft(value: unknown): ModelJobDraft {
  if (!value || typeof value !== 'object') {
    throw new ModelProviderError('invalid_response', 'Draft is invalid.')
  }

  const record = value as Record<string, unknown>
  const priority = record.priority === '' ? '' : record.priority

  if (priority !== '' && !isJobPriority(priority)) {
    throw new ModelProviderError('invalid_response', 'Draft priority is invalid.')
  }

  const dueDate = record.dueDate
  if (dueDate !== null && (typeof dueDate !== 'string' || Number.isNaN(Date.parse(dueDate)))) {
    throw new ModelProviderError('invalid_response', 'Draft due date is invalid.')
  }

  return {
    customerName: readText(record.customerName),
    customerPhone: readText(record.customerPhone),
    description: readText(record.description, MAX_TEXT_LENGTH),
    dueDate,
    location: readText(record.location),
    missingFields: readTextArray(record.missingFields),
    priority: priority as JobPriority | '',
    requiredSkills: readTextArray(record.requiredSkills),
    serviceAddress: readText(record.serviceAddress),
    serviceType: readText(record.serviceType),
    title: readText(record.title),
    uncertainFields: readTextArray(record.uncertainFields),
    warnings: readTextArray(record.warnings),
  }
}

function requireBoundedText(value: unknown, label: string) {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > MAX_TEXT_LENGTH) {
    throw new ModelProviderError('invalid_response', `Invalid ${label}.`)
  }

  return value.trim()
}

function requireUiContext(value: unknown) {
  return value === 'create_job' || value === 'dashboard' || value === 'jobs' || value === 'job_details'
    ? value
    : 'unknown'
}

function readText(value: unknown, maxLength = MAX_FIELD_LENGTH) {
  if (typeof value !== 'string' || value.length > maxLength) {
    throw new ModelProviderError('invalid_response', 'Draft field is invalid.')
  }

  return value.trim()
}

function readOptionalText(value: unknown, maxLength: number) {
  if (value === undefined) {
    return undefined
  }

  return readText(value, maxLength)
}

function readTextArray(value: unknown) {
  if (!Array.isArray(value) || value.length > MAX_ARRAY_ITEMS) {
    throw new ModelProviderError('invalid_response', 'Draft list is invalid.')
  }

  return value.map((item) => readText(item, MAX_FIELD_LENGTH)).filter(Boolean)
}

function intentSchema() {
  return {
    properties: {
      clarificationReason: { type: 'string' },
      confidence: { type: 'number' },
      intent: { enum: ['show_urgent_unassigned_jobs', 'show_open_jobs_summary', 'show_overloaded_employees', 'prepare_job_draft', 'unsupported'], type: 'string' },
      requiresClarification: { type: 'boolean' },
    },
    required: ['intent', 'confidence', 'requiresClarification'],
    type: 'object',
  }
}

function jobDraftSchema() {
  return {
    properties: {
      customerName: { type: 'string' },
      customerPhone: { type: 'string' },
      description: { type: 'string' },
      dueDate: { nullable: true, type: 'string' },
      location: { type: 'string' },
      missingFields: { items: { type: 'string' }, type: 'array' },
      priority: { enum: ['', 'Low', 'Medium', 'High', 'Urgent'], type: 'string' },
      requiredSkills: { items: { type: 'string' }, type: 'array' },
      serviceAddress: { type: 'string' },
      serviceType: { type: 'string' },
      title: { type: 'string' },
      uncertainFields: { items: { type: 'string' }, type: 'array' },
      warnings: { items: { type: 'string' }, type: 'array' },
    },
    required: ['title', 'description', 'customerName', 'customerPhone', 'serviceAddress', 'location', 'priority', 'requiredSkills', 'dueDate', 'missingFields', 'uncertainFields', 'warnings', 'serviceType'],
    type: 'object',
  }
}
