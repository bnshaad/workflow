import {
  doc,
  getDoc,
  setDoc,
  Timestamp,
} from 'firebase/firestore'
import { canAccessSettings } from '@/permissions'
import { requireActiveProfile, requireTenantAccess } from '@/services/common'
import { firestore } from '@/services/firestore'
import { cacheService } from '@/services/cache/cacheService'
import type { UserProfile } from '@/types'
import {
  buildDefaultOrganizationConfiguration,
  type OrganizationConfiguration,
} from '../../../../../shared/configuration.ts'

const CONFIGURATION_COLLECTION = 'organizationConfigurations'

export interface ConfigurationService {
  getOrganizationConfiguration(
    profile: UserProfile,
    organizationId: string,
  ): Promise<OrganizationConfiguration>
  updateOrganizationConfiguration(
    profile: UserProfile,
    organizationId: string,
    updates: Partial<OrganizationConfiguration>,
  ): Promise<OrganizationConfiguration>
}

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConfigurationError'
  }
}

export const configurationService: ConfigurationService = {
  async getOrganizationConfiguration(profile, organizationId) {
    const activeProfile = requireActiveProfile(profile)
    requireTenantAccess(activeProfile, organizationId)

    const cacheKey = `config:${organizationId}`
    const cached = cacheService.get<OrganizationConfiguration>(cacheKey, 60000)
    if (cached) return cached

    const configDocRef = doc(
      firestore,
      CONFIGURATION_COLLECTION,
      `config_${organizationId}`,
    )
    const snapshot = await getDoc(configDocRef)

    let config: OrganizationConfiguration
    if (!snapshot.exists()) {
      config = buildDefaultOrganizationConfiguration(
        organizationId,
        Timestamp.now(),
      )
    } else {
      const data = snapshot.data()
      config = {
        id: snapshot.id,
        organizationId: data.organizationId ?? organizationId,
        isActive: data.isActive ?? true,
        availableSkills: Array.isArray(data.availableSkills)
          ? data.availableSkills
          : [],
        jobTypes: Array.isArray(data.jobTypes) ? data.jobTypes : [],
        ahpProfiles: data.ahpProfiles ?? {},
        defaultStrategy: data.defaultStrategy ?? 'ahp-topsis-v1',
        defaultAhpProfile: data.defaultAhpProfile ?? 'Standard',
        updatedAt: data.updatedAt ?? Timestamp.now(),
      }
    }

    cacheService.set(cacheKey, config)
    return config
  },

  async updateOrganizationConfiguration(profile, organizationId, updates) {
    const activeProfile = requireActiveProfile(profile)
    requireTenantAccess(activeProfile, organizationId)

    if (!canAccessSettings(activeProfile)) {
      throw new ConfigurationError(
        'You do not have permission to modify organization settings.',
      )
    }

    const currentConfig = await this.getOrganizationConfiguration(
      activeProfile,
      organizationId,
    )

    const updatedConfig: OrganizationConfiguration = {
      ...currentConfig,
      ...updates,
      updatedAt: Timestamp.now(),
    }

    const configDocRef = doc(
      firestore,
      CONFIGURATION_COLLECTION,
      `config_${organizationId}`,
    )

    await setDoc(configDocRef, updatedConfig)
    cacheService.invalidate(`config:${organizationId}`)

    return updatedConfig
  },
}
