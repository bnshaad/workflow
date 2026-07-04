import type { UserProfile } from '@/types'
import { Roles } from './roles'

export type PermissionCheck = (profile: UserProfile) => boolean

function hasRole(profile: UserProfile, roles: readonly string[]) {
  return profile.isActive && roles.includes(profile.role)
}

export function canViewDashboard(profile: UserProfile) {
  return hasRole(profile, [Roles.Admin, Roles.Manager, Roles.Employee])
}

export function canViewJobs(profile: UserProfile) {
  return hasRole(profile, [Roles.Admin, Roles.Manager, Roles.Employee])
}

export function canCreateJob(profile: UserProfile) {
  return hasRole(profile, [Roles.Manager])
}

export function canEditJob(profile: UserProfile) {
  return hasRole(profile, [Roles.Manager])
}

export function canDeleteJob(profile: UserProfile) {
  return hasRole(profile, [Roles.Manager])
}

export function canAssignWorkers(profile: UserProfile) {
  return hasRole(profile, [Roles.Admin, Roles.Manager])
}

export function canViewTeam(profile: UserProfile) {
  return hasRole(profile, [Roles.Admin, Roles.Manager])
}

export function canManageTeam(profile: UserProfile) {
  return hasRole(profile, [Roles.Admin, Roles.Manager])
}

export function canAccessSettings(profile: UserProfile) {
  return hasRole(profile, [Roles.Admin, Roles.Manager])
}

export function canManageBusiness(profile: UserProfile) {
  return hasRole(profile, [Roles.Admin])
}

export function canManageUsers(profile: UserProfile) {
  return hasRole(profile, [Roles.Admin])
}

export function canUploadWorkProof(profile: UserProfile) {
  return hasRole(profile, [Roles.Employee])
}

export function canViewAuditLogs(profile: UserProfile) {
  return hasRole(profile, [Roles.Admin])
}

export function canViewOperationalPreferences(profile: UserProfile) {
  return hasRole(profile, [Roles.Admin, Roles.Manager])
}
