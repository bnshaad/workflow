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
      if (import.meta.env.DEV) {
        console.warn(
          'Model drafting failed in development mode; falling back to development stub.',
          error,
        )
        return buildDevelopmentStubSuggestion(customerRequest)
      }

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
  const dueDate = detectDueDate(customerRequest) || null
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
    dueDate,
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
  if (matchesAny(normalizedRequest, ['ac', 'air conditioning', 'hvac', 'cooling', 'compressor'])) {
    return 'AC Repair'
  }

  if (matchesAny(normalizedRequest, ['plumbing', 'pipe', 'leak', 'drain', 'faucet', 'sink', 'toilet'])) {
    return 'Plumbing'
  }

  if (matchesAny(normalizedRequest, ['electrical', 'wiring', 'circuit', 'power', 'switch', 'outlet'])) {
    return 'Electrical'
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
    skills.add('Electrical')
  }

  if (matchesAny(normalizedRequest, ['thermostat', 'calibration'])) {
    skills.add('Smart Thermostats')
  }

  if (matchesAny(normalizedRequest, ['plumbing', 'pipe', 'leak', 'drain', 'sink'])) {
    skills.add('Plumbing')
  }

  return Array.from(skills)
}

function detectPriority(normalizedRequest: string): JobPriority | '' {
  if (matchesAny(normalizedRequest, ['emergency', 'immediately', 'no cooling', 'critical', 'burst'])) {
    return JobPriorities.Urgent
  }

  if (matchesAny(normalizedRequest, ['urgent', 'asap', 'today', 'not working', 'soon'])) {
    return JobPriorities.High
  }

  return ''
}

const PREPOSITIONS_AND_STOPWORDS = new Set([
  'at', 'on', 'in', 'by', 'for', 'from', 'to', 'with', 'phone', 'ph',
  'tel', 'mobile', 'mob', 'call', 'need', 'needs', 'is', 'has', 'urgent',
  'urgently', 'emergency', 'customer', 'client', 'service', 'please',
  'today', 'tomorrow', 'repair', 'installation', 'maintenance', 'hvac',
  'ac', 'compressor', 'electrical', 'plumbing', 'high', 'low'
])

function cleanExtractedName(rawName: string) {
  if (!rawName) return ''
  const words = rawName.trim().split(/\s+/).filter((w) => !PREPOSITIONS_AND_STOPWORDS.has(w.toLowerCase()))
  const validWords = words.filter((w) => /^[A-Z][a-zA-Z'-]+$/.test(w))
  if (validWords.length === 0) return ''
  return validWords.slice(0, 3).join(' ')
}

function detectCustomerName(customerRequest: string) {
  // 1. Explicit keyword: "Customer Sarah Connor" / "Customer: Sarah Connor" / "Client: Sarah Connor"
  const labelMatch = customerRequest.match(
    /\b(?:customer|client|name)\s*(?:is|:|-|\s)\s*([A-Z][a-zA-Z'-]+(?:\s+[A-Z][a-zA-Z'-]+){0,2})/i,
  )
  if (labelMatch) {
    const cleaned = cleanExtractedName(labelMatch[1])
    if (cleaned) return cleaned
  }

  // 2. "for Name" (e.g. "AC repair at Kakkanad for Rahul Sharma")
  const forMatch = customerRequest.match(
    /\bfor\s+([A-Z][a-zA-Z'-]+(?:\s+[A-Z][a-zA-Z'-]+){0,2})/i,
  )
  if (forMatch) {
    const cleaned = cleanExtractedName(forMatch[1])
    if (cleaned) return cleaned
  }

  // 3. "from Name" / "this is Name"
  const fromMatch = customerRequest.match(
    /\b(?:from|this is)\s+([A-Z][a-zA-Z'-]+(?:\s+[A-Z][a-zA-Z'-]+){0,2})/i,
  )
  if (fromMatch) {
    const cleaned = cleanExtractedName(fromMatch[1])
    if (cleaned) return cleaned
  }

  // 4. Leading Name: "Rahul Sharma, 9876543210..."
  const startMatch = customerRequest.match(
    /^([A-Z][a-zA-Z'-]+(?:\s+[A-Z][a-zA-Z'-]+){1,2})(?:\s*[,:\n-]|\s+(?:phone|ph|at|needs|need|is)\b)/i,
  )
  if (startMatch) {
    const cleaned = cleanExtractedName(startMatch[1])
    if (cleaned) return cleaned
  }

  return ''
}

function detectPhoneNumber(customerRequest: string) {
  // 1. Explicit keyword prefix: phone/ph/mobile/mob/tel/cell/call/contact
  const labelMatch = customerRequest.match(
    /(?:phone|ph|mobile|mob|tel|cell|call|contact)[:\s#-]*([+]?[\d\s().-]{7,16}\d)/i,
  )
  if (labelMatch) {
    const candidate = labelMatch[1].trim()
    const digits = candidate.replace(/\D/g, '')
    if (digits.length >= 7 && digits.length <= 15) return candidate
  }

  // 2. International format: +1..., +91...
  const intlMatch = customerRequest.match(/(?:\+[\d\s().-]{7,16}\d)/)
  if (intlMatch) {
    const candidate = intlMatch[0].trim()
    const digits = candidate.replace(/\D/g, '')
    if (digits.length >= 7 && digits.length <= 15) return candidate
  }

  // 3. Standard 7 to 10 digit patterns (e.g. 555-0199, (555) 123-4567, 9876543210)
  const standardMatch = customerRequest.match(
    /(?:\b|\()(?:\d{3}[-.\s)]\s*\d{3}[-.\s]\d{4}|\d{3}[-.\s]\d{4}|\d{10})\b/
  )
  if (standardMatch) {
    return standardMatch[0].trim()
  }

  // 4. Any generic number sequence with 7 to 15 digits (excluding ISO dates)
  const genericMatches = customerRequest.matchAll(/(?:^|[^\d+])(\+?[\d\s().-]{7,16}\d)(?=[^\d]|$)/g)
  for (const m of genericMatches) {
    const cand = m[1].trim()
    if (/^\d{4}[-/]\d{2}[-/]\d{2}$/.test(cand)) continue
    const digits = cand.replace(/\D/g, '')
    if (digits.length >= 7 && digits.length <= 15) {
      return cand
    }
  }

  return ''
}

function detectDueDate(customerRequest: string, baseDate = new Date()): string {
  const lower = customerRequest.toLowerCase()

  // 1. "today"
  if (/\btoday\b/.test(lower)) {
    return formatDateString(baseDate)
  }

  // 2. "tomorrow" / "by tomorrow morning"
  if (/\btomorrow\b/.test(lower)) {
    const d = new Date(baseDate)
    d.setDate(d.getDate() + 1)
    return formatDateString(d)
  }

  // 3. "in (\d+) days"
  const inDaysMatch = lower.match(/\bin\s+(\d+)\s+days?\b/)
  if (inDaysMatch) {
    const days = parseInt(inDaysMatch[1], 10)
    const d = new Date(baseDate)
    d.setDate(d.getDate() + days)
    return formatDateString(d)
  }

  // 4. "next week"
  if (/\bnext\s+week\b/.test(lower)) {
    const d = new Date(baseDate)
    d.setDate(d.getDate() + 7)
    return formatDateString(d)
  }

  // 5. Day of week: "by Monday", "this Friday", "on Wednesday"
  const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const dayMatch = lower.match(/\b(?:by|on|this|next)?\s*(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/)
  if (dayMatch) {
    const targetDay = weekdays.indexOf(dayMatch[1])
    if (targetDay !== -1) {
      const d = new Date(baseDate)
      const currentDay = d.getDay()
      let diff = targetDay - currentDay
      if (diff <= 0) diff += 7
      d.setDate(d.getDate() + diff)
      return formatDateString(d)
    }
  }

  // 6. ISO Date: 2026-09-15
  const isoMatch = customerRequest.match(/\b(\d{4})-(\d{2})-(\d{2})\b/)
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`
  }

  // 7. Textual date: "Oct 15", "October 15", "15th October", "15 Oct 2026"
  const months: Record<string, number> = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12
  }
  const textDateMatch = lower.match(
    /\b(?:by|on|before|due)?\s*(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*(?:\s+(\d{4}))?\b/
  ) || lower.match(
    /\b(?:by|on|before|due)?\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?\b/
  )

  if (textDateMatch) {
    let day: number
    let monthName: string
    let year: number
    if (isNaN(parseInt(textDateMatch[1], 10))) {
      monthName = textDateMatch[1]
      day = parseInt(textDateMatch[2], 10)
      year = textDateMatch[3] ? parseInt(textDateMatch[3], 10) : baseDate.getFullYear()
    } else {
      day = parseInt(textDateMatch[1], 10)
      monthName = textDateMatch[2]
      year = textDateMatch[3] ? parseInt(textDateMatch[3], 10) : baseDate.getFullYear()
    }
    const month = months[monthName.substring(0, 4)] || months[monthName.substring(0, 3)]
    if (month && day >= 1 && day <= 31) {
      const mm = String(month).padStart(2, '0')
      const dd = String(day).padStart(2, '0')
      return `${year}-${mm}-${dd}`
    }
  }

  return ''
}

function formatDateString(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function detectAddress(customerRequest: string) {
  // 1. Street address with building/house number: e.g. "742 Evergreen Terrace", "42 Wallaby Way"
  const numberedStreetMatch = customerRequest.match(
    /\b(?:flat\s+\w+,\s+)?(\d{1,5}\s+(?:[A-Z][a-zA-Z0-9.-]+\s+){1,4}(?:street|st|road|rd|avenue|ave|lane|ln|drive|dr|boulevard|blvd|terrace|court|ct|plaza|park|way|circle|cir|highway|hwy|nagar|colony|sector|block|bldg|building|suite|ste|apt)\b(?:\s*,\s*[A-Z][a-z]+)?)/i
  )
  if (numberedStreetMatch) {
    return numberedStreetMatch[1].trim()
  }

  // 2. Named road or location with street keywords: e.g. "Infopark Road, Kakkanad"
  const namedRoadMatch = customerRequest.match(
    /\b(?:at|address:?|location:?)\s+([A-Z0-9][\w\s,.-]+?\b(?:street|st|road|rd|avenue|ave|lane|ln|drive|dr|boulevard|blvd|terrace|court|ct|plaza|park|way|circle|cir|highway|hwy|nagar|colony|sector|block)\b(?:\s*,\s*[A-Z][a-z]+)?)/i
  )
  if (namedRoadMatch) {
    return namedRoadMatch[1].trim()
  }

  // 3. Fallback: text after "at <Location>" up to prepositions/keywords
  const allAtMatches = customerRequest.matchAll(/\bat\s+([A-Za-z0-9#][^.;\n]+?)(?=\s+(?:by|before|phone|ph|due|call|urgently|urgent|need|needs|tomorrow|today|for)\b|[.;\n]|$)/gi)
  for (const m of allAtMatches) {
    const candidate = m[1].trim()
    if (!/^\+?[\d\s().-]{5,}\d$/.test(candidate)) {
      return candidate
    }
  }

  return ''
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
