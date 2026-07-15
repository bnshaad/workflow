export type TrustedProfile = {
  id: string
  organizationId: string
}

export function readTrustedManagerProfile(
  uid: string,
  authUserDisabled: boolean,
  data: unknown,
): TrustedProfile | null {
  if (authUserDisabled || !data || typeof data !== 'object') {
    return null
  }

  const profile = data as Record<string, unknown>

  if (
    profile.id !== uid ||
    profile.isActive !== true ||
    (profile.role !== 'admin' && profile.role !== 'manager') ||
    typeof profile.organizationId !== 'string' ||
    profile.organizationId.length === 0
  ) {
    return null
  }

  return {
    id: uid,
    organizationId: profile.organizationId,
  }
}
