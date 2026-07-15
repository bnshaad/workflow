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
          'Return JSON only. Extract only stated information. Use empty strings, empty arrays, and missingFields for unknown values. dueDateText must be an ISO 8601 date or datetime only when the request states a resolvable date; otherwise use an empty string. Use lowercase priority values. Never invent customer data, addresses, dates, skills, or priorities. This output cannot create or authorize a job.',
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
  const responseLength = serializedLength(value)
  if (!value || typeof value !== 'object') {
    throw draftValidationError(['draft'], responseLength)
  }

  const record = value as Record<string, unknown>
  const priority = normalizePriority(record.priority, responseLength)
  const dueDate = normalizeDueDate(record.dueDateText, responseLength)
  const warnings = readDraftTextArray(record.warnings, 'warnings', responseLength)

  return {
    customerName: readDraftText(record.customerName, 'customerName', responseLength),
    customerPhone: normalizePhone(
      readDraftText(record.customerPhone, 'customerPhone', responseLength),
    ),
    description: readDraftText(record.description, 'description', responseLength, MAX_TEXT_LENGTH),
    dueDate,
    location: readDraftText(record.locationText, 'locationText', responseLength),
    missingFields: normalizeFieldNames(
      readDraftTextArray(record.missingFields, 'missingFields', responseLength),
    ),
    priority,
    requiredSkills: readDraftTextArray(record.requiredSkills, 'requiredSkills', responseLength),
    serviceAddress: readDraftText(record.serviceAddress, 'serviceAddress', responseLength),
    serviceType: readDraftText(record.serviceType, 'serviceType', responseLength),
    title: readDraftText(record.title, 'title', responseLength),
    uncertainFields: readDraftTextArray(record.uncertainFields, 'uncertainFields', responseLength),
    warnings: ensureDueDateWarning(warnings, dueDate),
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

function readDraftText(
  value: unknown,
  field: string,
  responseLength: number,
  maxLength = MAX_FIELD_LENGTH,
) {
  try {
    return readText(value, maxLength)
  } catch {
    throw draftValidationError([field], responseLength)
  }
}

function readDraftTextArray(
  value: unknown,
  field: string,
  responseLength: number,
) {
  try {
    return deduplicate(readTextArray(value))
  } catch {
    throw draftValidationError([field], responseLength)
  }
}

function normalizePriority(value: unknown, responseLength: number): JobPriority | '' {
  const priority = readDraftText(value, 'priority', responseLength).toLowerCase()
  const normalized = priority
    ? `${priority.charAt(0).toUpperCase()}${priority.slice(1)}`
    : ''

  if (normalized !== '' && !isJobPriority(normalized)) {
    throw draftValidationError(['priority'], responseLength)
  }

  return normalized as JobPriority | ''
}

function normalizeDueDate(value: unknown, responseLength: number) {
  const dueDate = readDraftText(value, 'dueDateText', responseLength)
  if (dueDate === '') {
    return null
  }

  const isIsoDate = /^\d{4}-\d{2}-\d{2}$/.test(dueDate)
  const isIsoDateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(dueDate)
  if ((!isIsoDate && !isIsoDateTime) || Number.isNaN(Date.parse(dueDate))) {
    throw draftValidationError(['dueDateText'], responseLength)
  }

  return dueDate
}

function normalizePhone(value: string) {
  return value.replace(/\s+/g, ' ')
}

function ensureDueDateWarning(warnings: string[], dueDate: string | null) {
  if (dueDate !== null || warnings.some((warning) => /date|deadline|schedule/i.test(warning))) {
    return warnings
  }

  return [...warnings, 'Due date is missing or could not be resolved safely.']
}

function normalizeFieldNames(values: string[]) {
  return deduplicate(
    values.map((value) => {
      if (value === 'dueDateText') return 'dueDate'
      if (value === 'locationText') return 'location'
      return value
    }),
  )
}

function deduplicate(values: string[]) {
  const seen = new Set<string>()
  return values.filter((value) => {
    const key = value.toLocaleLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function draftValidationError(fields: string[], responseLength: number) {
  return new ModelProviderError(
    'invalid_response',
    'The structured draft failed validation.',
    {
      code: 'draft_validation_failed',
      responseLength,
      validationFields: fields,
    },
  )
}

function serializedLength(value: unknown) {
  try {
    return JSON.stringify(value).length
  } catch {
    return 0
  }
}

function intentSchema() {
  return {
    properties: {
      clarificationReason: { type: 'string' },
      confidence: { type: 'number' },
      intent: { enum: ['show_urgent_unassigned_jobs', 'show_open_jobs_summary', 'show_overloaded_employees', 'recommend_employee_for_job', 'explain_recommendation', 'compare_top_candidates', 'prepare_job_draft', 'unsupported'], type: 'string' },
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
      dueDateText: { type: 'string' },
      locationText: { type: 'string' },
      missingFields: { items: { type: 'string' }, type: 'array' },
      priority: { type: 'string' },
      requiredSkills: { items: { type: 'string' }, type: 'array' },
      serviceAddress: { type: 'string' },
      serviceType: { type: 'string' },
      title: { type: 'string' },
      uncertainFields: { items: { type: 'string' }, type: 'array' },
      warnings: { items: { type: 'string' }, type: 'array' },
    },
    required: ['title', 'description', 'customerName', 'customerPhone', 'serviceAddress', 'locationText', 'priority', 'requiredSkills', 'dueDateText', 'missingFields', 'uncertainFields', 'warnings', 'serviceType'],
    type: 'object',
  }
}
