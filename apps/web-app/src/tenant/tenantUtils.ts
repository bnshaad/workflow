import type { UserProfile } from '@/types'

/**
 * Every business document in Workflow must include organizationId.
 * Future Firestore services should use these helpers before building tenant-scoped queries.
 * Firestore Security Rules will enforce the same tenant boundary later.
 */
export function getUserOrganizationId(profile: UserProfile | null | undefined) {
  return profile?.organizationId ?? null
}

export function requireOrganizationId(profile: UserProfile | null | undefined) {
  const organizationId = getUserOrganizationId(profile)

  if (!organizationId) {
    throw new Error('Organization access is required.')
  }

  return organizationId
}

export function isSameOrganization(
  profile: UserProfile | null | undefined,
  organizationId: string,
) {
  return getUserOrganizationId(profile) === organizationId
}
