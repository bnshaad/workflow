import { httpsCallable } from 'firebase/functions'
import { firebaseFunctions } from '@/config'
import { requireActiveProfile, requireTenantAccess } from '@/services/common'
import { jobService } from '@/services/jobs'
import { DEFAULT_AVAILABLE_SKILLS } from '../../../../../shared/configuration.ts'
import { hashProposalPayload } from '../../../../../shared/actionProposal.ts'
import type {
  ActionProposalExecutionResult,
  ProposedAction,
  ProposedCreateJobPayload,
  UserProfile,
  WhatsAppFieldConfidence,
  WhatsAppMessage,
  WhatsAppProposalMetadata,
  WhatsAppSimulatedNotification,
} from '@/types'

export type SimulateMessageParams = {
  messageText: string
  proposalId?: string
  senderName?: string
  senderPhone?: string
}

export type SimulateMessageResponse = {
  ackMessage: string
  payload: ProposedCreateJobPayload
  proposalId: string
  threadState: string
  whatsappMetadata: WhatsAppProposalMetadata
}

export class WhatsAppDemoServiceError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WhatsAppDemoServiceError'
  }
}

// Local demo storage helpers for offline / emulator-free resilience
function getStorageKey(organizationId: string): string {
  return `workflow_demo_whatsapp_proposals_${organizationId}`
}

function loadLocalProposals(organizationId: string): ProposedAction<ProposedCreateJobPayload>[] {
  try {
    const raw = localStorage.getItem(getStorageKey(organizationId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveLocalProposal(
  organizationId: string,
  proposal: ProposedAction<ProposedCreateJobPayload>,
) {
  try {
    const current = loadLocalProposals(organizationId)
    const existingIndex = current.findIndex((p) => p.proposalId === proposal.proposalId)
    let updated: ProposedAction<ProposedCreateJobPayload>[]
    if (existingIndex >= 0) {
      updated = [...current]
      updated[existingIndex] = proposal
    } else {
      updated = [proposal, ...current]
    }
    localStorage.setItem(getStorageKey(organizationId), JSON.stringify(updated))
    notifyProposalChange(organizationId)
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('Failed to save demo proposal to localStorage:', err)
    }
  }
}

function notifyProposalChange(organizationId: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('workflow:whatsapp_proposals_changed', {
        detail: { organizationId },
      }),
    )
  }
}

function updateLocalProposalState(
  organizationId: string,
  proposalId: string,
  mutator: (proposal: ProposedAction<ProposedCreateJobPayload>) => void,
): ProposedAction<ProposedCreateJobPayload> | null {
  try {
    const current = loadLocalProposals(organizationId)
    const target = current.find((p) => p.proposalId === proposalId)
    if (!target) return null
    mutator(target)
    localStorage.setItem(getStorageKey(organizationId), JSON.stringify(current))
    notifyProposalChange(organizationId)
    return target
  } catch {
    return null
  }
}

export const whatsappDemoService = {
  subscribeProposals(organizationId: string, onChange: () => void): () => void {
    if (typeof window === 'undefined') return () => {}

    const handleCustomEvent = (e: Event) => {
      const custom = e as CustomEvent<{ organizationId?: string }>
      if (!custom.detail?.organizationId || custom.detail.organizationId === organizationId) {
        onChange()
      }
    }

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === getStorageKey(organizationId)) {
        onChange()
      }
    }

    window.addEventListener('workflow:whatsapp_proposals_changed', handleCustomEvent)
    window.addEventListener('storage', handleStorageEvent)

    return () => {
      window.removeEventListener('workflow:whatsapp_proposals_changed', handleCustomEvent)
      window.removeEventListener('storage', handleStorageEvent)
    }
  },
  async simulateCustomerMessage(
    profile: UserProfile,
    input: SimulateMessageParams,
  ): Promise<SimulateMessageResponse> {
    const active = requireActiveProfile(profile)
    requireTenantAccess(active, active.organizationId)

    // Attempt Cloud Function first
    const callable = httpsCallable<SimulateMessageParams, SimulateMessageResponse>(
      firebaseFunctions,
      'simulateWhatsAppMessage',
    )

    try {
      const result = await callable(input)
      if (result.data?.proposalId) {
        // Cache into local store
        const proposal: ProposedAction<ProposedCreateJobPayload> = {
          actionType: 'create_job',
          completedAt: null,
          confirmedAt: null,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
          failureCode: null,
          failureSummary: null,
          idempotencyKey: `create_job:${result.data.proposalId}`,
          organizationId: active.organizationId,
          payload: result.data.payload,
          payloadHash: hashProposalPayload(result.data.payload),
          processingStartedAt: null,
          proposalId: result.data.proposalId,
          requestedBy: active.id,
          requiresConfirmation: true,
          resultJobId: null,
          source: 'whatsapp',
          status: 'prepared',
          summary: `WhatsApp: ${result.data.payload.title} (${result.data.payload.customerName})`,
          updatedAt: new Date().toISOString(),
          version: 1,
          warnings: ['Simulated WhatsApp Intake request.'],
          whatsappMetadata: result.data.whatsappMetadata,
        }
        saveLocalProposal(active.organizationId, proposal)
        return result.data
      }
    } catch (err: unknown) {
      if (import.meta.env.DEV) {
        console.warn(
          'simulateWhatsAppMessage Cloud Function call failed, activating local demo heuristic engine:',
          err,
        )
      }
    }

    // Resilient local fallback engine
    return fallbackSimulateCustomerMessage(active, input)
  },

  async listWhatsAppProposals(
    profile: UserProfile,
  ): Promise<ProposedAction<ProposedCreateJobPayload>[]> {
    const active = requireActiveProfile(profile)
    requireTenantAccess(active, active.organizationId)

    const localProposals = loadLocalProposals(active.organizationId)

    const callable = httpsCallable<void, ProposedAction<ProposedCreateJobPayload>[]>(
      firebaseFunctions,
      'listWhatsAppProposals',
    )

    try {
      const result = await callable()
      if (Array.isArray(result.data)) {
        // Merge cloud proposals with any locally cached ones
        const cloudIds = new Set(result.data.map((p) => p.proposalId))
        const merged = [...result.data]
        for (const local of localProposals) {
          if (!cloudIds.has(local.proposalId)) {
            merged.push(local)
          }
        }
        merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        return merged
      }
    } catch {
      // Return local proposals directly if Cloud Function is offline or undeployed
    }

    return localProposals
  },

  async confirmAndAssign(
    profile: UserProfile,
    proposalId: string,
    assignToEmployeeId?: string,
  ): Promise<ActionProposalExecutionResult> {
    const active = requireActiveProfile(profile)
    requireTenantAccess(active, active.organizationId)

    // Attempt Cloud Function first
    const callable = httpsCallable<
      { proposalId: string; assignToEmployeeId?: string },
      ActionProposalExecutionResult
    >(firebaseFunctions, 'confirmCreateJobProposal')

    try {
      const result = await callable({
        proposalId,
        assignToEmployeeId: assignToEmployeeId || undefined,
      })
      if (result.data?.status === 'completed') {
        updateLocalProposalState(active.organizationId, proposalId, (p) => {
          p.status = 'completed'
          p.resultJobId = result.data.jobId
          if (p.whatsappMetadata) {
            p.whatsappMetadata.threadState = 'confirmed'
          }
        })
        return result.data
      }
    } catch (err: unknown) {
      if (import.meta.env.DEV) {
        console.warn('confirmCreateJobProposal Cloud Function failed, executing fallback via jobService:', err)
      }
    }

    // Resilient local confirmation fallback:
    // Create the job in Firestore via standard jobService which has full client permissions!
    const localProposals = loadLocalProposals(active.organizationId)
    const targetProposal = localProposals.find((p) => p.proposalId === proposalId)

    if (!targetProposal) {
      throw new WhatsAppDemoServiceError('Proposal not found.')
    }

    try {
      const createdJob = await jobService.createJob(active, {
        attachments: [],
        customerName: targetProposal.payload.customerName,
        customerPhone: targetProposal.payload.customerPhone,
        description: targetProposal.payload.description,
        dueDate: targetProposal.payload.dueDate ? new Date(targetProposal.payload.dueDate) : null,
        location: targetProposal.payload.location,
        priority: targetProposal.payload.priority,
        requiredSkills: targetProposal.payload.requiredSkills,
        serviceAddress: targetProposal.payload.serviceAddress,
        title: targetProposal.payload.title,
      })

      // Assign employee if chosen
      if (assignToEmployeeId) {
        await jobService.assignEmployeesToJob(active, createdJob.id, active.organizationId, [
          assignToEmployeeId,
        ])
      }

      // Record dispatch notification
      const refCode = proposalId.slice(-6).toUpperCase()
      const dispatchNotification: WhatsAppSimulatedNotification = {
        body: `Great news, ${targetProposal.payload.customerName}! Your service request (#W-${refCode}) has been confirmed and assigned to our field technician.`,
        id: `notif_${Date.now()}`,
        recipientPhone: targetProposal.payload.customerPhone,
        sentAt: new Date().toISOString(),
        templateName: 'job_assigned',
        type: 'job_scheduled',
      }

      updateLocalProposalState(active.organizationId, proposalId, (p) => {
        p.status = 'completed'
        p.resultJobId = createdJob.id
        p.completedAt = new Date().toISOString()
        if (p.whatsappMetadata) {
          p.whatsappMetadata.threadState = 'confirmed'
          p.whatsappMetadata.simulatedNotifications = [
            ...(p.whatsappMetadata.simulatedNotifications || []),
            dispatchNotification,
          ]
        }
      })

      return {
        jobId: createdJob.id,
        proposalId,
        status: 'completed',
      }
    } catch (createErr: unknown) {
      const msg = createErr instanceof Error ? createErr.message : 'Failed to create job.'
      throw new WhatsAppDemoServiceError(msg)
    }
  },

  async rejectProposal(
    profile: UserProfile,
    proposalId: string,
    action: 'reject' | 'spam',
    reason?: string,
  ): Promise<{ proposalId: string; success: boolean; threadState: string }> {
    const active = requireActiveProfile(profile)
    requireTenantAccess(active, active.organizationId)

    const callable = httpsCallable<
      { action: 'reject' | 'spam'; proposalId: string; reason?: string },
      { proposalId: string; success: boolean; threadState: string }
    >(firebaseFunctions, 'rejectWhatsAppProposal')

    try {
      const result = await callable({ action, proposalId, reason })
      updateLocalProposalState(active.organizationId, proposalId, (p) => {
        p.status = 'cancelled'
        if (p.whatsappMetadata) {
          p.whatsappMetadata.threadState = action === 'spam' ? 'spam' : 'rejected'
          p.whatsappMetadata.rejectionReason = reason || (action === 'spam' ? 'Marked as spam' : 'Declined by manager')
        }
      })
      return result.data
    } catch {
      // Local fallback
      const newState = action === 'spam' ? 'spam' : 'rejected'
      updateLocalProposalState(active.organizationId, proposalId, (p) => {
        p.status = 'cancelled'
        if (p.whatsappMetadata) {
          p.whatsappMetadata.threadState = newState
          p.whatsappMetadata.rejectionReason = reason || (action === 'spam' ? 'Marked as spam' : 'Declined by manager')
        }
      })
      return { proposalId, success: true, threadState: newState }
    }
  },

  async sendClarification(
    profile: UserProfile,
    proposalId: string,
    clarificationText: string,
  ): Promise<{ proposalId: string; success: boolean }> {
    const active = requireActiveProfile(profile)
    requireTenantAccess(active, active.organizationId)

    const text = clarificationText.trim()
    if (!text) {
      throw new WhatsAppDemoServiceError('Clarification text cannot be empty.')
    }

    const callable = httpsCallable<
      { clarificationText: string; proposalId: string },
      { proposalId: string; success: boolean }
    >(firebaseFunctions, 'sendWhatsAppClarification')

    try {
      const result = await callable({ clarificationText: text, proposalId })
      return result.data
    } catch {
      // Local fallback
      const nowIso = new Date().toISOString()
      const newMsg: WhatsAppMessage = {
        direction: 'outbound',
        id: `msg_clarify_${Date.now()}`,
        senderName: profile.displayName || 'Manager',
        senderPhone: 'Workflow Business',
        text,
        timestamp: nowIso,
      }
      const newNotif: WhatsAppSimulatedNotification = {
        body: text,
        id: `notif_clarify_${Date.now()}`,
        recipientPhone: 'Customer',
        sentAt: nowIso,
        templateName: 'manager_clarification',
        type: 'clarification',
      }
      updateLocalProposalState(active.organizationId, proposalId, (p) => {
        if (p.whatsappMetadata) {
          p.whatsappMetadata.originalMessages = [
            ...(p.whatsappMetadata.originalMessages || []),
            newMsg,
          ]
          p.whatsappMetadata.simulatedNotifications = [
            ...(p.whatsappMetadata.simulatedNotifications || []),
            newNotif,
          ]
        }
      })
      return { proposalId, success: true }
    }
  },
}

function fallbackSimulateCustomerMessage(
  active: UserProfile,
  input: SimulateMessageParams,
): SimulateMessageResponse {
  const rawText = input.messageText.trim()
  const senderPhone = (input.senderPhone || '+91 98765 43210').trim()
  const senderName = (input.senderName || 'Customer').trim()
  const proposalId = input.proposalId || `wa_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

  const existingProposals = loadLocalProposals(active.organizationId)
  const existingProposal = existingProposals.find((p) => p.proposalId === proposalId)

  const nowIso = new Date().toISOString()
  const inboundMessage: WhatsAppMessage = {
    direction: 'inbound',
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    senderName,
    senderPhone,
    text: rawText,
    timestamp: nowIso,
  }

  const existingMessages = existingProposal?.whatsappMetadata?.originalMessages || []
  const allMessages = [...existingMessages, inboundMessage]

  const refCode = proposalId.slice(-6).toUpperCase()
  const ackText = `Thanks for contacting us, ${senderName}! We've received your request (ref #W-${refCode}). Our team is reviewing details and will confirm shortly.`
  const ackNotification: WhatsAppSimulatedNotification = {
    body: ackText,
    id: `notif_${Date.now()}`,
    recipientPhone: senderPhone,
    sentAt: nowIso,
    templateName: 'request_received',
    type: 'received_acknowledgement',
  }

  const existingNotifs = existingProposal?.whatsappMetadata?.simulatedNotifications || []
  const allNotifications = [...existingNotifs, ackNotification]

  const extracted = parseCustomerText(rawText, senderName, senderPhone)

  const payload: ProposedCreateJobPayload = {
    customerName: extracted.customerName || senderName,
    customerPhone: extracted.customerPhone || senderPhone,
    description: extracted.description || rawText,
    dueDate: extracted.dueDate,
    location: extracted.location || 'Kochi',
    priority: extracted.priority,
    requiredSkills: extracted.requiredSkills,
    serviceAddress: extracted.serviceAddress || 'Address to be confirmed with customer',
    title: extracted.title,
  }

  const confidenceMap: Record<string, WhatsAppFieldConfidence> = {
    customerName: extracted.customerName ? 'high' : 'medium',
    customerPhone: extracted.customerPhone ? 'high' : 'medium',
    priority: extracted.priority === 'Urgent' ? 'high' : 'medium',
    requiredSkills: extracted.requiredSkills.length > 0 ? 'high' : 'low',
    serviceAddress: extracted.serviceAddress ? 'high' : 'low',
    serviceType: 'high',
    title: 'high',
  }

  const whatsappMetadata: WhatsAppProposalMetadata = {
    aiModelUsed: 'Workflow Neural Parser (Offline Heuristic)',
    clarificationMode: 'manager_triggered',
    customerName: senderName,
    customerPhone: senderPhone,
    customerWaId: senderPhone.replace(/\D/g, ''),
    fieldConfidence: confidenceMap,
    originalMessages: allMessages,
    simulatedNotifications: allNotifications,
    source: 'whatsapp',
    threadState: 'pending_review',
  }

  const proposal: ProposedAction<ProposedCreateJobPayload> = {
    actionType: 'create_job',
    completedAt: null,
    confirmedAt: null,
    createdAt: nowIso,
    expiresAt: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    failureCode: null,
    failureSummary: null,
    idempotencyKey: `create_job:${proposalId}`,
    organizationId: active.organizationId,
    payload,
    payloadHash: hashProposalPayload(payload),
    processingStartedAt: null,
    proposalId,
    requestedBy: active.id,
    requiresConfirmation: true,
    resultJobId: null,
    source: 'whatsapp',
    status: 'prepared',
    summary: `WhatsApp: ${payload.title} (${payload.customerName})`,
    updatedAt: nowIso,
    version: 1,
    warnings: ['Simulated WhatsApp Intake request.'],
    whatsappMetadata,
  }

  saveLocalProposal(active.organizationId, proposal)

  return {
    ackMessage: ackText,
    payload,
    proposalId,
    threadState: 'pending_review',
    whatsappMetadata,
  }
}

function parseCustomerText(text: string, senderName: string, senderPhone: string) {
  const lower = text.toLowerCase()

  let title = 'Maintenance Service Request'
  let serviceType = 'General Maintenance'
  let requiredSkills = ['General Maintenance']

  if (/(?:ac|air condition|cooling|chiller|refrigerant|compressor|blower|grinding)/i.test(lower)) {
    title = 'Emergency AC Repair & Diagnostics'
    serviceType = 'AC Repair & Diagnostics'
    requiredSkills = ['HVAC']
  } else if (/(?:pipe|leak|tap|faucet|plumb|drain|sink|clog|water heater|flush|burst|flooding)/i.test(lower)) {
    title = 'Urgent Pipe Leak & Plumbing Repair'
    serviceType = 'Plumbing Maintenance'
    requiredSkills = ['Plumbing']
  } else if (/(?:wire|spark|switch|mcb|breaker|fuse|short circuit|lighting|power cut|tripping|burning)/i.test(lower)) {
    title = 'Electrical MCB Tripping & Safety Inspection'
    serviceType = 'Electrical Repair'
    requiredSkills = ['Electrical']
  } else if (/(?:appliance|fridge|refrigerator|washing machine|oven|microwave)/i.test(lower)) {
    title = 'Home Appliance Repair'
    serviceType = 'Appliance Repair'
    requiredSkills = ['Appliance Repair']
  }

  // Filter against defaults
  requiredSkills = requiredSkills.filter((s) => DEFAULT_AVAILABLE_SKILLS.includes(s))
  if (requiredSkills.length === 0) {
    requiredSkills = ['General Maintenance']
  }

  let priority: 'Low' | 'Medium' | 'High' | 'Urgent' = 'Medium'
  if (/(?:urgent|emergency|asap|immediately|hazard|smoke|burning|flooding|burst|fire)/i.test(lower)) {
    priority = 'Urgent'
  } else if (/(?:high|important|today|broken completely|continuous|tripping)/i.test(lower)) {
    priority = 'High'
  } else if (/(?:low|when possible|next week|minor)/i.test(lower)) {
    priority = 'Low'
  }

  let location = 'Kochi'
  let serviceAddress = ''
  const locationMatches = [
    'Kakkanad',
    'Infopark',
    'Kaloor',
    'Edapally',
    'Ernakulam',
    'Aluva',
    'Fort Kochi',
    'Vyttila',
    'Palarivattom',
  ]
  for (const loc of locationMatches) {
    if (lower.includes(loc.toLowerCase())) {
      location = loc
      serviceAddress = `Customer Site, near ${loc} Junction, Kochi`
      break
    }
  }

  let customerName = senderName
  const nameSignOff = text.match(/(?:-|thanks,|regards,|from)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i)
  if (nameSignOff && nameSignOff[1]) {
    customerName = nameSignOff[1].trim()
  }

  // Due date default: tomorrow or today if urgent
  const due = new Date()
  if (priority === 'Urgent') {
    due.setHours(due.getHours() + 4)
  } else {
    due.setDate(due.getDate() + 1)
    due.setHours(17, 0, 0, 0)
  }

  return {
    customerName,
    customerPhone: senderPhone,
    description: text,
    dueDate: due.toISOString(),
    location,
    priority,
    requiredSkills,
    serviceAddress: serviceAddress || 'Site address to be verified with customer',
    serviceType,
    title,
  }
}
