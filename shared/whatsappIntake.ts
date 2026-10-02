export type WhatsAppFieldConfidence = 'high' | 'medium' | 'low'

export type WhatsAppMessage = {
  id: string
  direction: 'inbound' | 'outbound'
  text: string
  timestamp: string // ISO date
  senderName?: string
  senderPhone?: string
}

export type WhatsAppThreadState =
  | 'collecting'
  | 'drafting'
  | 'pending_review'
  | 'confirmed'
  | 'rejected'
  | 'spam'

export type WhatsAppSimulatedNotification = {
  id: string
  type: 'received_acknowledgement' | 'job_scheduled' | 'clarification'
  recipientPhone: string
  templateName: string
  body: string
  sentAt: string
}

export type WhatsAppProposalMetadata = {
  source: 'whatsapp'
  customerWaId: string
  customerName?: string
  customerPhone?: string
  threadState: WhatsAppThreadState
  originalMessages: WhatsAppMessage[]
  serviceType?: string
  missingFields?: string[]
  uncertainFields?: string[]
  fieldConfidence?: Record<string, WhatsAppFieldConfidence>
  language?: string
  category?: string
  simulatedNotifications: WhatsAppSimulatedNotification[]
  clarificationMode: 'manager_triggered'
  assignedEmployeeId?: string | null
  assignedEmployeeName?: string | null
  rejectionReason?: string | null
  aiModelUsed?: string
}
