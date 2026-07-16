import { canCreateJob } from '@/permissions'
import { requireActiveProfile } from '@/services/common'
import type { UserProfile } from '@/types'
import type { JobPriority } from '@/types/jobPriority'
import { JobPriorities } from '@/types/jobPriority'
import {
  ModelCoordinatorError,
  modelCoordinatorService,
  type ModelCoordinatorDiagnostics,
} from './modelCoordinatorService'

export type GenerateJobDraftInput = {
  customerRequest: string
}

export type AiJobDraftSuggestion = {
  title: string
  description: string
  serviceType: string
  requiredSkills: string[]
  priority: JobPriority | ''
  customerName: string
  customerPhone: string
  serviceAddress: string
  location: string
  dueDate: string | null
  needsReview: string[]
  source: 'development-stub' | 'gemini'
}

export interface JobUnderstandingService {
  generateJobDraftSuggestion(
    profile: UserProfile,
    input: GenerateJobDraftInput,
  ): Promise<AiJobDraftSuggestion>
}

export class AiJobUnderstandingError extends Error {
  readonly diagnostics?: ModelCoordinatorDiagnostics

  constructor(
    message: string,
    diagnostics?: ModelCoordinatorDiagnostics,
  ) {
    super(message)
    this.name = 'AiJobUnderstandingError'
    this.diagnostics = diagnostics
  }
}

/**
 * Model drafting is requested through the trusted callable boundary. The local
 * stub remains available only for explicit development-only offline exercises.
 */
export const jobUnderstandingService: JobUnderstandingService = {
  async generateJobDraftSuggestion(profile, input) {
    const activeProfile = requireActiveProfile(profile)

    if (!canCreateJob(activeProfile)) {
      throw new AiJobUnderstandingError(
        'You do not have permission to generate job drafts.',
      )
    }

    const customerRequest = input.customerRequest.trim()

    if (customerRequest.length < 10) {
      throw new AiJobUnderstandingError(
        'Enter a more detailed customer request first.',
      )
    }

    if (
      import.meta.env.DEV &&
      import.meta.env.VITE_USE_DEVELOPMENT_JOB_DRAFT_STUB === 'true'
    ) {
      return buildDevelopmentStubSuggestion(customerRequest)
    }

    try {
      const draft = await modelCoordinatorService.draftJob(
        activeProfile,
        customerRequest,
      )

      return {
        customerName: draft.customerName,
        customerPhone: draft.customerPhone,
        description: draft.description,
        dueDate: draft.dueDate,
        location: draft.location,
        needsReview: [
          ...draft.missingFields,
          ...draft.uncertainFields,
          ...draft.warnings,
        ],
        priority: draft.priority,
        requiredSkills: draft.requiredSkills,
        serviceAddress: draft.serviceAddress,
        serviceType: draft.serviceType,
        source: 'gemini',
        title: draft.title,
      }
    } catch (error) {
      if (error instanceof ModelCoordinatorError) {
        throw new AiJobUnderstandingError(error.message, error.diagnostics)
      }
      if (error instanceof Error) {
        throw new AiJobUnderstandingError(error.message)
      }

      throw new AiJobUnderstandingError(
        'AI drafting is temporarily unavailable. Complete the form manually.',
      )
    }
  },
}

function buildDevelopmentStubSuggestion(
  customerRequest: string,
): AiJobDraftSuggestion {
  const normalizedRequest = customerRequest.toLowerCase()
  const serviceMatch = detectServiceType(normalizedRequest)
  const requiredSkills = detectRequiredSkills(normalizedRequest, serviceMatch)
  const customerPhone = detectPhoneNumber(customerRequest)
  const customerName = detectCustomerName(customerRequest)
  const serviceAddress = detectAddress(customerRequest)
  const location = detectLocation(customerRequest, serviceAddress)
  const needsReview: string[] = []
  const priority = detectPriority(normalizedRequest)
  const title = serviceMatch ? `${serviceMatch} service request` : ''

  if (!title) {
    needsReview.push('Job title needs manager review.')
  }

  if (!serviceMatch) {
    needsReview.push('Service type needs manager review.')
  }

  if (requiredSkills.length === 0) {
    needsReview.push('Required skills need manager review.')
  }

  if (!customerName) {
    needsReview.push('Customer name was not found.')
  }

  if (!customerPhone) {
    needsReview.push('Customer phone was not found.')
  }

  if (!serviceAddress) {
    needsReview.push('Service address was not found.')
  }

  if (!priority) {
    needsReview.push('Priority needs manager review.')
  }

  return {
    title,
    description: customerRequest,
    dueDate: null,
    serviceType: serviceMatch,
    requiredSkills,
    priority,
    customerName,
    customerPhone,
    serviceAddress,
    location,
    needsReview,
    source: 'development-stub',
  }
}

function detectServiceType(normalizedRequest: string) {
  if (matchesAny(normalizedRequest, ['ac', 'air conditioning', 'hvac', 'cooling'])) {
    return 'AC Repair'
  }

  if (matchesAny(normalizedRequest, ['install', 'installation', 'replace'])) {
    return 'Installation'
  }

  if (matchesAny(normalizedRequest, ['thermostat', 'temperature control'])) {
    return 'Thermostat Service'
  }

  if (matchesAny(normalizedRequest, ['tv', 'television', 'power board'])) {
    return 'Electronics Repair'
  }

  if (matchesAny(normalizedRequest, ['refrigerator', 'fridge', 'washing machine'])) {
    return 'Appliance Repair'
  }

  return ''
}

function detectRequiredSkills(
  normalizedRequest: string,
  serviceType: string,
) {
  const skills = new Set<string>()

  if (serviceType) {
    skills.add(serviceType)
  }

  if (matchesAny(normalizedRequest, ['diagnose', 'diagnostic', 'inspect', 'issue'])) {
    skills.add('Diagnostics')
  }

  if (matchesAny(normalizedRequest, ['install', 'installation', 'replace'])) {
    skills.add('Installation')
  }

  if (matchesAny(normalizedRequest, ['compressor', 'outdoor unit'])) {
    skills.add('Compressor Repair')
  }

  if (matchesAny(normalizedRequest, ['wiring', 'circuit', 'board', 'power'])) {
    skills.add('Electronics Repair')
  }

  if (matchesAny(normalizedRequest, ['thermostat', 'calibration'])) {
    skills.add('Smart Thermostats')
  }

  return Array.from(skills)
}

function detectPriority(normalizedRequest: string): JobPriority | '' {
  if (matchesAny(normalizedRequest, ['emergency', 'immediately', 'no cooling'])) {
    return JobPriorities.Urgent
  }

  if (matchesAny(normalizedRequest, ['urgent', 'asap', 'today', 'not working'])) {
    return JobPriorities.High
  }

  return ''
}

function detectPhoneNumber(customerRequest: string) {
  return customerRequest.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0]?.trim() ?? ''
}

function detectCustomerName(customerRequest: string) {
  const match = customerRequest.match(
    /(?:customer|client|name)\s*(?:is|:|-)\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/,
  )

  return match?.[1]?.trim() ?? ''
}

function detectAddress(customerRequest: string) {
  const match = customerRequest.match(
    /\b(?:at|address is|address:)\s+([^.;\n]+(?:street|st|road|rd|avenue|ave|lane|ln|drive|dr|boulevard|blvd|terrace|court|ct|plaza|park|way)\b[^.;\n]*)/i,
  )

  return match?.[1]?.trim() ?? ''
}

function detectLocation(customerRequest: string, serviceAddress: string) {
  if (serviceAddress) {
    return ''
  }

  const match = customerRequest.match(/\b(?:in|near)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/)

  return match?.[1]?.trim() ?? ''
}

function matchesAny(value: string, needles: string[]) {
  return needles.some((needle) => value.includes(needle))
}
