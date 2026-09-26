export type IncidentCategory =
  | 'customer_unavailable'
  | 'access_denied'
  | 'missing_parts'
  | 'safety_hazard'
  | 'scope_mismatch'
  | 'other'

export type IncidentStatus = 'open' | 'resolved'

export interface Incident {
  id: string
  jobId: string
  organizationId: string
  reportedByUserId: string
  reportedByUserName: string
  category: IncidentCategory
  description: string
  status: IncidentStatus
  resolvedAt?: unknown | null
  resolvedByUserId?: string | null
  resolutionNotes?: string | null
  createdAt: unknown
  updatedAt: unknown
  isActive: boolean
}

export const INCIDENT_CATEGORY_LABELS: Record<IncidentCategory, string> = {
  customer_unavailable: 'Customer Unavailable / No Show',
  access_denied: 'Access Denied / Gate Locked',
  missing_parts: 'Missing Parts / Equipment',
  safety_hazard: 'Safety Hazard on Site',
  scope_mismatch: 'Scope Mismatch / Extra Work',
  other: 'Other Operational Blocker',
}
