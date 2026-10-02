import type { WhatsAppProposalMetadata } from './whatsappIntake.js'

export const PROPOSAL_SOURCES = ['manual', 'coordinator', 'whatsapp'] as const
export type ProposalSource = (typeof PROPOSAL_SOURCES)[number]

export type { WhatsAppProposalMetadata }

export const ACTION_PROPOSAL_STATUSES = [
  'prepared',
  'confirmed',
  'processing',
  'completed',
  'failed',
  'expired',
  'cancelled',
  'reconciliation_required',
] as const

export type ActionProposalStatus = (typeof ACTION_PROPOSAL_STATUSES)[number]

export type CreateJobProposalPayload = {
  customerName: string
  customerPhone: string
  description: string
  dueDate: string | null
  location: string
  priority: 'Low' | 'Medium' | 'High' | 'Urgent'
  requiredSkills: string[]
  serviceAddress: string
  title: string
}

export function hashProposalPayload(payload: unknown) {
  const serialized = stableSerialize(payload)
  let hash = 2_166_136_261

  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index)
    hash = Math.imul(hash, 16_777_619)
  }

  return `fnv1a-${(hash >>> 0).toString(16)}`
}

export function isActionProposalStatus(value: unknown): value is ActionProposalStatus {
  return (
    typeof value === 'string' &&
    ACTION_PROPOSAL_STATUSES.includes(value as ActionProposalStatus)
  )
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(',')}]`
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>

    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`)
      .join(',')}}`
  }

  return JSON.stringify(value) ?? 'null'
}
