import type { Timestamp } from 'firebase/firestore'

export type UserRole = 'admin' | 'manager' | 'employee'

export type UserAvailability = 'Available' | 'Busy' | 'Leave'

export interface UserProfile {
  id: string
  organizationId: string
  email: string
  displayName: string
  role: UserRole
  skills: string[]
  availability: UserAvailability
  activeTaskCount: number
  performanceScore: number
  isActive: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}
