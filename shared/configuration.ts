import type { AhpProfileName } from './assignmentRecommendation.js'

export type JobTypeCategory = 'hvac' | 'plumbing' | 'electrical' | 'handyman' | 'general'

export type JobTypeConfig = {
  category: JobTypeCategory
  defaultAhpProfile: AhpProfileName
  description: string
  id: string
  name: string
  requiredSkills: string[]
}

export type AhpCriteriaWeights = {
  availability: number
  performance: number
  skillMatch: number
  workload: number
}

export type OrganizationConfiguration = {
  ahpProfiles: Record<AhpProfileName, AhpCriteriaWeights>
  availableSkills: string[]
  id: string
  isActive: boolean
  jobTypes: JobTypeConfig[]
  organizationId: string
  updatedAt: unknown
}

export const DEFAULT_AVAILABLE_SKILLS = [
  'HVAC',
  'Electrical',
  'Plumbing',
  'General Maintenance',
  'Appliance Repair',
  'Safety Inspection',
]

export const DEFAULT_JOB_TYPES: JobTypeConfig[] = [
  {
    id: 'jobtype_ac_repair',
    name: 'AC Repair & Diagnostics',
    category: 'hvac',
    description: 'Emergency HVAC cooling diagnostics and compressor repair.',
    requiredSkills: ['HVAC', 'Electrical'],
    defaultAhpProfile: 'Emergency Repair',
  },
  {
    id: 'jobtype_plumbing_install',
    name: 'Commercial Plumbing Installation',
    category: 'plumbing',
    description: 'Piping installation, valve replacement, and drainage maintenance.',
    requiredSkills: ['Plumbing'],
    defaultAhpProfile: 'Commercial Maintenance',
  },
  {
    id: 'jobtype_electrical_inspection',
    name: 'Electrical Safety Inspection',
    category: 'electrical',
    description: 'High-voltage panel inspection and wiring verification.',
    requiredSkills: ['Electrical', 'Safety Inspection'],
    defaultAhpProfile: 'Standard',
  },
  {
    id: 'jobtype_facility_handyman',
    name: 'General Facility Repair',
    category: 'handyman',
    description: 'Routine fixture replacement and general building maintenance.',
    requiredSkills: ['General Maintenance'],
    defaultAhpProfile: 'Standard',
  },
]

export const DEFAULT_AHP_PROFILES: Record<AhpProfileName, AhpCriteriaWeights> = {
  'Emergency Repair': {
    availability: 0.45,
    performance: 0.08,
    skillMatch: 0.35,
    workload: 0.12,
  },
  'Commercial Maintenance': {
    availability: 0.15,
    performance: 0.25,
    skillMatch: 0.50,
    workload: 0.10,
  },
  Standard: {
    availability: 0.30,
    performance: 0.10,
    skillMatch: 0.40,
    workload: 0.20,
  },
}

export function buildDefaultOrganizationConfiguration(
  organizationId: string,
  updatedAtTimestamp: unknown,
): OrganizationConfiguration {
  return {
    id: `config_${organizationId}`,
    organizationId,
    isActive: true,
    availableSkills: [...DEFAULT_AVAILABLE_SKILLS],
    jobTypes: [...DEFAULT_JOB_TYPES],
    ahpProfiles: { ...DEFAULT_AHP_PROFILES },
    updatedAt: updatedAtTimestamp,
  }
}
