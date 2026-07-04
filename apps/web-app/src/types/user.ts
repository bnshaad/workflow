import type { TenantDocument } from './common'

export type UserRole = 'admin' | 'manager' | 'employee'

export type UserAvailability =
  | 'available'
  | 'busy'
  | 'leave'
  | 'Available'
  | 'Busy'
  | 'Leave'

export interface UserProfile extends TenantDocument {
  email: string
  displayName: string
  role: UserRole
  skills: string[]
  availability: UserAvailability
  activeTaskCount: number
  performanceScore: number
}
