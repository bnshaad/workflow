import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { hashProposalPayload, type CreateJobProposalPayload } from '../../../shared/actionProposal.js'
import { DEFAULT_AVAILABLE_SKILLS } from '../../../shared/configuration.js'
import type {
  WhatsAppMessage,
  WhatsAppProposalMetadata,
  WhatsAppSimulatedNotification,
  WhatsAppFieldConfidence,
} from '../../../shared/whatsappIntake.js'
import { createModelCoordinatorService } from '../model/modelCoordinatorService.js'
import { createGeminiModelProvider } from '../model/modelProvider.js'
import type { ModelJobDraft } from '../../../shared/coordinatorModel.js'

const ACTION_PROPOSALS_COLLECTION = 'actionProposals'
const AUDIT_LOGS_COLLECTION = 'auditLogs'
const ORG_CONFIG_COLLECTION = 'organizationConfigurations'

export type SimulateWhatsAppMessageInput = {
  messageText: string
  proposalId?: string
  senderName?: string
  senderPhone?: string
}

export async function handleSimulateWhatsAppMessage(
  caller: { id: string; organizationId: string; displayName?: string },
  input: SimulateWhatsAppMessageInput,
  geminiApiKey?: string,
) {
  const firestore = getFirestore()
  const now = Timestamp.now()
  const rawText = (input.messageText || '').trim()
  if (!rawText) {
    throw new Error('Message text is required.')
  }

  const senderPhone = (input.senderPhone || '+91 98765 43210').trim()
  const senderName = (input.senderName || 'Customer').trim()
  const proposalId = input.proposalId || `wa_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  const proposalRef = firestore.collection(ACTION_PROPOSALS_COLLECTION).doc(proposalId)

  const existingSnap = await proposalRef.get()
  const existingData = existingSnap.exists ? existingSnap.data() : null

  const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  const inboundMessage: WhatsAppMessage = {
    id: messageId,
    direction: 'inbound',
    text: rawText,
    timestamp: now.toDate().toISOString(),
    senderName,
    senderPhone,
  }

  const existingMessages: WhatsAppMessage[] = existingData?.whatsappMetadata?.originalMessages || []
  const allMessages = [...existingMessages, inboundMessage]

  // Accumulate text for draft extraction
  const fullConversationText = allMessages
    .filter((m) => m.direction === 'inbound')
    .map((m) => m.text)
    .join('\n')

  // Generate reference code for simulated customer notification
  const refCode = proposalId.slice(-6).toUpperCase()
  const ackText = `Thanks for contacting us, ${senderName}! We've received your request (ref #W-${refCode}). Our team is reviewing details and will confirm shortly.`
  const ackNotification: WhatsAppSimulatedNotification = {
    id: `notif_${Date.now()}`,
    type: 'received_acknowledgement',
    recipientPhone: senderPhone,
    templateName: 'request_received',
    body: ackText,
    sentAt: now.toDate().toISOString(),
  }

  const existingNotifs: WhatsAppSimulatedNotification[] =
    existingData?.whatsappMetadata?.simulatedNotifications || []
  const allNotifications = [...existingNotifs, ackNotification]

  // Extract draft via Gemini or fallback
  const { draft, sourceAi, confidenceMap } = await extractDraftFields(
    fullConversationText,
    senderName,
    senderPhone,
    caller.organizationId,
    geminiApiKey,
  )

  const payload: CreateJobProposalPayload = {
    customerName: draft.customerName || senderName,
    customerPhone: draft.customerPhone || senderPhone,
    description: draft.description || rawText,
    dueDate: draft.dueDate,
    location: draft.location || 'Kochi',
    priority: normalizePriority(draft.priority),
    requiredSkills: draft.requiredSkills.length > 0 ? draft.requiredSkills : ['General Maintenance'],
    serviceAddress: draft.serviceAddress || 'Address to be confirmed with customer',
    title: draft.title || `Service Request from ${senderName}`,
  }

  const whatsappMetadata: WhatsAppProposalMetadata = {
    source: 'whatsapp',
    customerWaId: senderPhone,
    customerName: payload.customerName,
    customerPhone: payload.customerPhone,
    threadState: 'pending_review',
    originalMessages: allMessages,
    serviceType: draft.serviceType || 'Maintenance',
    missingFields: draft.missingFields,
    uncertainFields: draft.uncertainFields,
    fieldConfidence: confidenceMap,
    language: 'English',
    category: detectCategory(draft.serviceType || fullConversationText),
    simulatedNotifications: allNotifications,
    clarificationMode: 'manager_triggered',
    aiModelUsed: sourceAi,
  }

  const payloadHash = hashProposalPayload(payload)
  const expiresAt = Timestamp.fromMillis(now.toMillis() + 48 * 60 * 60 * 1000) // 48 hours

  const proposalDocument = {
    id: proposalId,
    organizationId: caller.organizationId,
    actionType: 'create_job',
    source: 'whatsapp',
    status: 'prepared',
    summary: `WhatsApp Request: ${payload.title} from ${payload.customerName}`,
    payload,
    payloadHash,
    version: (existingData?.version || 0) + 1,
    requiresConfirmation: true,
    warnings: draft.warnings.length > 0 ? draft.warnings.slice(0, 5) : [
      'Customer request extracted via AI. Verify contact and address details before approving.',
    ],
    idempotencyKey: `create_job:${proposalId}`,
    requestedBy: caller.id,
    expiresAt,
    confirmedAt: null,
    processingStartedAt: null,
    completedAt: null,
    resultJobId: null,
    failureCode: null,
    failureSummary: null,
    whatsappMetadata,
    createdAt: existingData?.createdAt || now,
    updatedAt: now,
    isActive: true,
  }

  await proposalRef.set(proposalDocument, { merge: true })

  // Write audit log
  const auditRef = firestore.collection(AUDIT_LOGS_COLLECTION).doc()
  await auditRef.set({
    id: auditRef.id,
    organizationId: caller.organizationId,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    actorId: caller.id,
    action: 'whatsapp_message_simulated',
    entityId: proposalId,
    entityType: 'actionProposal',
    metadata: {
      proposalId,
      senderPhone,
      senderName,
      sourceAi,
    },
  })

  return {
    proposalId,
    threadState: 'pending_review',
    payload,
    whatsappMetadata,
    ackMessage: ackText,
  }
}

export async function handleRejectWhatsAppProposal(
  caller: { id: string; organizationId: string },
  input: { proposalId: string; action: 'reject' | 'spam'; reason?: string },
) {
  const firestore = getFirestore()
  const now = Timestamp.now()
  const proposalRef = firestore.collection(ACTION_PROPOSALS_COLLECTION).doc(input.proposalId)
  const snap = await proposalRef.get()

  if (!snap.exists) {
    throw new Error('Proposal not found.')
  }

  const data = snap.data()
  if (data?.organizationId !== caller.organizationId) {
    throw new Error('Proposal does not belong to your organization.')
  }

  const newState = input.action === 'spam' ? 'spam' : 'rejected'
  const reason = input.reason || (input.action === 'spam' ? 'Marked as spam' : 'Declined by manager')

  await proposalRef.update({
    status: 'cancelled',
    'whatsappMetadata.threadState': newState,
    'whatsappMetadata.rejectionReason': reason,
    updatedAt: now,
    version: (data?.version || 1) + 1,
  })

  const auditRef = firestore.collection(AUDIT_LOGS_COLLECTION).doc()
  await auditRef.set({
    id: auditRef.id,
    organizationId: caller.organizationId,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    actorId: caller.id,
    action: input.action === 'spam' ? 'whatsapp_proposal_spam' : 'whatsapp_proposal_rejected',
    entityId: input.proposalId,
    entityType: 'actionProposal',
    metadata: {
      proposalId: input.proposalId,
      action: input.action,
      reason,
    },
  })

  return { success: true, proposalId: input.proposalId, threadState: newState }
}

export async function handleSendWhatsAppClarification(
  caller: { id: string; organizationId: string; displayName?: string },
  input: { proposalId: string; clarificationText: string },
) {
  const firestore = getFirestore()
  const now = Timestamp.now()
  const text = (input.clarificationText || '').trim()
  if (!text) {
    throw new Error('Clarification text is required.')
  }

  const proposalRef = firestore.collection(ACTION_PROPOSALS_COLLECTION).doc(input.proposalId)
  const snap = await proposalRef.get()

  if (!snap.exists) {
    throw new Error('Proposal not found.')
  }

  const data = snap.data()
  if (data?.organizationId !== caller.organizationId) {
    throw new Error('Proposal does not belong to your organization.')
  }

  const meta = data?.whatsappMetadata || {}
  const originalMessages: WhatsAppMessage[] = meta.originalMessages || []
  const simulatedNotifications: WhatsAppSimulatedNotification[] = meta.simulatedNotifications || []

  const outboundMsg: WhatsAppMessage = {
    id: `msg_out_${Date.now()}`,
    direction: 'outbound',
    text,
    timestamp: now.toDate().toISOString(),
    senderName: caller.displayName || 'Service Manager',
  }

  const notif: WhatsAppSimulatedNotification = {
    id: `notif_${Date.now()}`,
    type: 'clarification',
    recipientPhone: meta.customerPhone || data?.payload?.customerPhone || '',
    templateName: 'manager_clarification',
    body: `Service Team: ${text}`,
    sentAt: now.toDate().toISOString(),
  }

  await proposalRef.update({
    'whatsappMetadata.originalMessages': [...originalMessages, outboundMsg],
    'whatsappMetadata.simulatedNotifications': [...simulatedNotifications, notif],
    updatedAt: now,
    version: (data?.version || 1) + 1,
  })

  return { success: true, proposalId: input.proposalId }
}

export async function handleListWhatsAppProposals(caller: { organizationId: string }) {
  const firestore = getFirestore()
  const snapshot = await firestore
    .collection(ACTION_PROPOSALS_COLLECTION)
    .where('organizationId', '==', caller.organizationId)
    .where('source', '==', 'whatsapp')
    .where('isActive', '==', true)
    .get()

  const proposals = snapshot.docs.map((doc) => {
    const data = doc.data()
    return {
      ...data,
      id: doc.id,
      proposalId: doc.id,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
      expiresAt: data.expiresAt instanceof Timestamp ? data.expiresAt.toDate().toISOString() : data.expiresAt,
    }
  })

  // Sort newest first
  return proposals.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

// ---------------------------------------------------------------------------
// Helpers: Gemini Extraction with Resilient Heuristic Fallback & Skill Allowlist
// ---------------------------------------------------------------------------

async function extractDraftFields(
  customerRequest: string,
  senderName: string,
  senderPhone: string,
  organizationId: string,
  geminiApiKey?: string,
): Promise<{
  draft: ModelJobDraft
  sourceAi: string
  confidenceMap: Record<string, WhatsAppFieldConfidence>
}> {
  // 1. Load organization available skills for allowlist filtering
  const availableSkills = await getOrganizationAvailableSkills(organizationId)

  // 2. Attempt Gemini model if configured
  if (geminiApiKey) {
    try {
      const provider = createGeminiModelProvider(geminiApiKey)
      const service = createModelCoordinatorService(provider)
      const modelDraft = await service.draftJob(customerRequest)

      // Filter skills against org allowlist
      const filteredSkills = filterSkills(modelDraft.requiredSkills, availableSkills)

      const confidenceMap: Record<string, WhatsAppFieldConfidence> = {
        title: modelDraft.title ? 'high' : 'low',
        serviceType: modelDraft.serviceType ? 'high' : 'medium',
        customerName: modelDraft.customerName ? 'high' : 'medium',
        customerPhone: modelDraft.customerPhone ? 'high' : 'medium',
        serviceAddress: modelDraft.serviceAddress ? 'high' : 'low',
        priority: modelDraft.priority ? 'high' : 'medium',
        requiredSkills: filteredSkills.length > 0 ? 'high' : 'low',
      }

      return {
        draft: {
          ...modelDraft,
          requiredSkills: filteredSkills.length > 0 ? filteredSkills : ['General Maintenance'],
        },
        sourceAi: 'Gemini 3.1 Flash Lite',
        confidenceMap,
      }
    } catch {
      // Fallback cleanly to heuristic extractor
    }
  }

  // 3. Resilient heuristic extractor
  const heuristicDraft = extractHeuristicDraft(customerRequest, senderName, senderPhone, availableSkills)
  const confidenceMap: Record<string, WhatsAppFieldConfidence> = {
    title: heuristicDraft.title ? 'high' : 'low',
    serviceType: heuristicDraft.serviceType ? 'high' : 'medium',
    customerName: heuristicDraft.customerName ? 'high' : 'medium',
    customerPhone: heuristicDraft.customerPhone ? 'high' : 'medium',
    serviceAddress: heuristicDraft.serviceAddress ? 'high' : 'low',
    priority: heuristicDraft.priority ? 'medium' : 'low',
    requiredSkills: heuristicDraft.requiredSkills.length > 0 ? 'high' : 'low',
  }

  return {
    draft: heuristicDraft,
    sourceAi: 'Workflow Neural Parser (Offline Heuristic)',
    confidenceMap,
  }
}

async function getOrganizationAvailableSkills(organizationId: string): Promise<string[]> {
  try {
    const firestore = getFirestore()
    const configSnap = await firestore.collection(ORG_CONFIG_COLLECTION).doc(organizationId).get()
    if (configSnap.exists) {
      const data = configSnap.data()
      if (Array.isArray(data?.availableSkills) && data.availableSkills.length > 0) {
        return data.availableSkills
      }
    }
  } catch {
    // ignore
  }
  return DEFAULT_AVAILABLE_SKILLS
}

function filterSkills(extractedSkills: string[], availableSkills: string[]): string[] {
  const allowed = new Set(availableSkills.map((s) => s.toLowerCase()))
  return extractedSkills.filter((s) => allowed.has(s.toLowerCase()))
}

function extractHeuristicDraft(
  text: string,
  senderName: string,
  senderPhone: string,
  availableSkills: string[],
): ModelJobDraft {
  const lower = text.toLowerCase()

  // Service detection
  let serviceType = 'General Maintenance'
  let matchedSkill = 'General Maintenance'

  if (/(?:ac|air condition|cooling|chiller|refrigerant|compressor|blower)/i.test(lower)) {
    serviceType = 'AC Repair & Diagnostics'
    matchedSkill = 'HVAC'
  } else if (/(?:pipe|leak|tap|faucet|plumb|drain|sink|clog|water heater|flush)/i.test(lower)) {
    serviceType = 'Plumbing Maintenance'
    matchedSkill = 'Plumbing'
  } else if (/(?:wire|spark|switch|mcb|breaker|fuse|short circuit|lighting|power cut)/i.test(lower)) {
    serviceType = 'Electrical Repair'
    matchedSkill = 'Electrical'
  } else if (/(?:appliance|fridge|refrigerator|washing machine|oven|microwave)/i.test(lower)) {
    serviceType = 'Appliance Repair'
    matchedSkill = 'Appliance Repair'
  }

  const skills = filterSkills([matchedSkill], availableSkills)
  if (skills.length === 0) {
    skills.push(availableSkills[0] || 'General Maintenance')
  }

  // Priority detection
  let priority: 'Low' | 'Medium' | 'High' | 'Urgent' = 'Medium'
  if (/(?:urgent|emergency|asap|immediately|right now|hazard|smoke|burning|flooding)/i.test(lower)) {
    priority = 'Urgent'
  } else if (/(?:high|important|today|broken completely)/i.test(lower)) {
    priority = 'High'
  } else if (/(?:low|when possible|next week|minor)/i.test(lower)) {
    priority = 'Low'
  }

  // Phone detection
  const phoneMatch = text.match(/(?:\+?91[\s-]?)?[6-9]\d{9}\b/)
  const extractedPhone = phoneMatch ? phoneMatch[0] : senderPhone

  // Address & location detection
  let location = 'Kochi'
  let serviceAddress = ''
  const locationMatches = ['Kakkanad', 'Infopark', 'Kaloor', 'Edapally', 'Ernakulam', 'Aluva', 'Fort Kochi', 'Vyttila', 'Palarivattom']
  for (const loc of locationMatches) {
    if (lower.includes(loc.toLowerCase())) {
      location = loc
      break
    }
  }

  // Address lines (e.g., Near, Flat, Apt, Building, Street)
  const addrMatch = text.match(/(?:at|near|in|apt|flat|building|house|floor|road|st|street)[^.,\n]+/i)
  if (addrMatch) {
    serviceAddress = `${addrMatch[0].trim()}, ${location}`
  } else {
    serviceAddress = `Customer location at ${location}`
  }

  // Title
  let title = `${serviceType}`
  if (/(?:grinding noise|not cooling|water leak|tripping|sparking)/i.test(lower)) {
    const issueMatch = lower.match(/(?:grinding noise|not cooling|water leak|tripping|sparking)/i)
    if (issueMatch) {
      title = `${serviceType} — ${issueMatch[0].charAt(0).toUpperCase() + issueMatch[0].slice(1)}`
    }
  }

  return {
    title,
    description: text,
    dueDate: null,
    location,
    missingFields: [],
    priority,
    requiredSkills: skills,
    serviceAddress,
    serviceType,
    customerName: senderName,
    customerPhone: extractedPhone,
    uncertainFields: [],
    warnings: [],
  }
}

function normalizePriority(value: unknown): 'Low' | 'Medium' | 'High' | 'Urgent' {
  if (typeof value !== 'string') return 'Medium'
  const v = value.toLowerCase().trim()
  if (v === 'urgent') return 'Urgent'
  if (v === 'high') return 'High'
  if (v === 'low') return 'Low'
  return 'Medium'
}

function detectCategory(text: string): string {
  const lower = text.toLowerCase()
  if (lower.includes('hvac') || lower.includes('ac')) return 'hvac'
  if (lower.includes('plumb') || lower.includes('leak')) return 'plumbing'
  if (lower.includes('electr')) return 'electrical'
  return 'general'
}
