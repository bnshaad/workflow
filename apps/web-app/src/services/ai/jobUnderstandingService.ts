import { canCreateJob } from '@/permissions'
import { requireActiveProfile } from '@/services/common'
import type { UserProfile } from '@/types'
import type { JobPriority } from '@/types/jobPriority'
import { JobPriorities } from '@/types/jobPriority'

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
  needsReview: string[]
  source: 'development-stub'
}

export interface JobUnderstandingService {
  generateJobDraftSuggestion(
    profile: UserProfile,
    input: GenerateJobDraftInput,
  ): Promise<AiJobDraftSuggestion>
}

export class AiJobUnderstandingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AiJobUnderstandingError'
  }
}

/**
 * Development-only AI Job Understanding contract.
 *
 * There is no approved secure production AI integration in the current Firebase
 * Spark architecture. This service keeps the UI and review workflow ready
 * without exposing API keys or creating jobs automatically.
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

    return buildDevelopmentStubSuggestion(customerRequest)
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
