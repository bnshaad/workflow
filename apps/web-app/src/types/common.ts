import type { Timestamp } from 'firebase/firestore'

export interface BaseDocument {
  id: string
  isActive: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface TenantDocument extends BaseDocument {
  organizationId: string
}
