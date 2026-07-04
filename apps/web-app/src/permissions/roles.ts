import type { UserRole } from '@/types'

export const Roles = {
  Admin: 'admin',
  Manager: 'manager',
  Employee: 'employee',
} as const satisfies Record<string, UserRole>

export type RoleName = (typeof Roles)[keyof typeof Roles]
