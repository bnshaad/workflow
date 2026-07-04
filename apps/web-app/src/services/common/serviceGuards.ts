import { isSameOrganization, requireOrganizationId } from '@/tenant'
import type { UserProfile } from '@/types'

/**
 * Service guard utilities for future Firestore services.
 *
 * Every business document must include organizationId, and every business query
 * should be scoped with the authenticated user's organizationId. These guards
 * centralize that check now; Firestore Security Rules will provide backend
 * enforcement in a later phase.
 */
export function requireAuthenticatedProfile(
  profile: UserProfile | null | undefined,
) {
  if (!profile) {
    throw new Error('Authentication is required.')
  }

  return profile
}

export function requireActiveProfile(profile: UserProfile | null | undefined) {
  const authenticatedProfile = requireAuthenticatedProfile(profile)

  if (!authenticatedProfile.isActive) {
    throw new Error('Active user profile is required.')
  }

  return authenticatedProfile
}

export function requireTenantAccess(
  profile: UserProfile | null | undefined,
  organizationId: string,
) {
  const activeProfile = requireActiveProfile(profile)
  const userOrganizationId = requireOrganizationId(activeProfile)

  if (!isSameOrganization(activeProfile, organizationId)) {
    throw new Error('Tenant access denied.')
  }

  return userOrganizationId
}
