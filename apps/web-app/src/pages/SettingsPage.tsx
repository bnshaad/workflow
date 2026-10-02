import { useEffect, useState } from 'react'
import {
  BarChart3,
  Bell,
  BriefcaseBusiness,
  Check,
  Cpu,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  UserRoundCog,
  X,
} from 'lucide-react'
import { Timestamp } from 'firebase/firestore'
import { PageHeader, StatusBadge } from '@/components'
import { useAuth, useCompactView } from '@/hooks'
import {
  canManageBusiness,
  canManageUsers,
  canViewAuditLogs,
  canViewOperationalPreferences,
} from '@/permissions'
import { configurationService } from '@/services/config/configurationService'
import { getRecentAuditLogs, type AuditLogEntry } from '@/services/evaluation'
import { jobService } from '@/services/jobs'
import { cacheService } from '@/services/cache/cacheService'
import type { UserProfile } from '@/types'
import { cn } from '@/utils'
import { AnalyticsPage } from './AnalyticsPage'
import {
  buildDefaultOrganizationConfiguration,
  DEFAULT_AHP_PROFILES,
  type OrganizationConfiguration,
} from '../../../../shared/configuration.ts'
import type {
  AhpProfileName,
  AssignmentAlgorithmVersion,
} from '../../../../shared/assignmentRecommendation.ts'

function SettingsSection({
  children,
  description,
  icon: Icon,
  title,
}: {
  children: React.ReactNode
  description?: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  title: string
}) {
  return (
    <section className="rounded-card border border-wf-border bg-wf-surface shadow-xs">
      <div className="flex items-center gap-2.5 border-b border-wf-border px-4 py-3">
        <Icon aria-hidden="true" className="size-4 shrink-0 text-wf-ink-2" />
        <div>
          <h2 className="text-sm font-semibold text-wf-ink">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-xs text-wf-ink-3">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      <div className="p-4">{children}</div>
    </section>
  )
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-wf-ink-3">
        {label}
      </p>
      <div className="border-b border-wf-border pb-2 text-sm font-medium text-wf-ink">
        {value}
      </div>
    </div>
  )
}

type SettingsTab = 'organization' | 'skills' | 'audit' | 'reports'

export function SettingsPage() {
  const { profile } = useAuth()
  const { isCompact, toggleCompact } = useCompactView()
  const showBusinessProfile = profile ? canManageBusiness(profile) : false
  const showUsersAndRoles = profile ? canManageUsers(profile) : false
  const showAuditLogs = profile ? canViewAuditLogs(profile) : false
  const showPreferences = profile ? canViewOperationalPreferences(profile) : false

  const [activeTab, setActiveTab] = useState<SettingsTab>('organization')
  const [teamUsers, setTeamUsers] = useState<UserProfile[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([])
  const [config, setConfig] = useState<OrganizationConfiguration | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingConfig, setIsSavingConfig] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const [newSkillInput, setNewSkillInput] = useState('')
  const [selectedStrategy, setSelectedStrategy] = useState<AssignmentAlgorithmVersion>('ahp-topsis-v1')
  const [selectedAhpProfile, setSelectedAhpProfile] = useState<AhpProfileName>('Standard')
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)

  const refreshSettingsData = async () => {
    if (!profile) return

    cacheService.invalidate()
    setIsLoading(true)
    setErrorMessage('')

    try {
      const [fetchedEmployees, fetchedAuditLogs, fetchedConfig] = await Promise.all([
        jobService.listAssignableEmployees(profile, profile.organizationId).catch(() => [profile]),
        getRecentAuditLogs(profile, profile.organizationId, 50).catch(() => []),
        configurationService
          .getOrganizationConfiguration(profile, profile.organizationId)
          .catch(() => buildDefaultOrganizationConfiguration(profile.organizationId, Timestamp.now())),
      ])

      const allUsers = [...fetchedEmployees]
      if (!allUsers.some((u) => u.id === profile.id)) {
        allUsers.unshift(profile)
      }

      setTeamUsers(allUsers)
      setAuditLogs(fetchedAuditLogs)
      setConfig(fetchedConfig)
      if (fetchedConfig.defaultStrategy) {
        setSelectedStrategy(fetchedConfig.defaultStrategy)
      }
      if (fetchedConfig.defaultAhpProfile) {
        setSelectedAhpProfile(fetchedConfig.defaultAhpProfile)
      }
    } catch {
      setErrorMessage('Unable to load settings data. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true

    async function fetchSettingsData() {
      if (!profile) return

      setIsLoading(true)
      setErrorMessage('')

      try {
        const [fetchedEmployees, fetchedAuditLogs, fetchedConfig] = await Promise.all([
          jobService.listAssignableEmployees(profile, profile.organizationId).catch(() => [profile]),
          getRecentAuditLogs(profile, profile.organizationId, 50).catch(() => []),
          configurationService
            .getOrganizationConfiguration(profile, profile.organizationId)
            .catch(() => buildDefaultOrganizationConfiguration(profile.organizationId, Timestamp.now())),
        ])

        if (isMounted) {
          const allUsers = [...fetchedEmployees]
          if (!allUsers.some((u) => u.id === profile.id)) {
            allUsers.unshift(profile)
          }

          setTeamUsers(allUsers)
          setAuditLogs(fetchedAuditLogs)
          setConfig(fetchedConfig)
          if (fetchedConfig.defaultStrategy) {
            setSelectedStrategy(fetchedConfig.defaultStrategy)
          }
          if (fetchedConfig.defaultAhpProfile) {
            setSelectedAhpProfile(fetchedConfig.defaultAhpProfile)
          }
        }
      } catch {
        if (isMounted) {
          setErrorMessage('Unable to load settings data. Please try again.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchSettingsData()

    return () => {
      isMounted = false
    }
  }, [profile])

  const handleAddSkill = async () => {
    if (!profile || !config || !newSkillInput.trim()) return

    const trimmed = newSkillInput.trim()
    if (config.availableSkills.includes(trimmed)) {
      setErrorMessage('Skill already exists.')
      return
    }

    setIsSavingConfig(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const updatedSkills = [...config.availableSkills, trimmed]
      const updated = await configurationService.updateOrganizationConfiguration(
        profile,
        profile.organizationId,
        { availableSkills: updatedSkills }
      )
      setConfig(updated)
      setNewSkillInput('')
      setSuccessMessage(`Added skill "${trimmed}".`)
    } catch {
      setErrorMessage('Failed to add skill.')
    } finally {
      setIsSavingConfig(false)
    }
  }

  const handleRemoveSkill = async (skillToRemove: string) => {
    if (!profile || !config) return

    setIsSavingConfig(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const updatedSkills = config.availableSkills.filter((s) => s !== skillToRemove)
      const updated = await configurationService.updateOrganizationConfiguration(
        profile,
        profile.organizationId,
        { availableSkills: updatedSkills }
      )
      setConfig(updated)
      setSuccessMessage(`Removed skill "${skillToRemove}".`)
    } catch {
      setErrorMessage('Failed to remove skill.')
    } finally {
      setIsSavingConfig(false)
    }
  }

  const handleSaveMatchingStrategy = async () => {
    if (!profile || !config) return

    setIsSavingConfig(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const updated = await configurationService.updateOrganizationConfiguration(
        profile,
        profile.organizationId,
        {
          defaultStrategy: selectedStrategy,
          defaultAhpProfile: selectedAhpProfile,
        },
      )
      setConfig(updated)
      setSuccessMessage('Dispatch recommendation strategy saved successfully.')
    } catch {
      setErrorMessage('Failed to update recommendation strategy.')
    } finally {
      setIsSavingConfig(false)
    }
  }

  const formatLogTime = (timestamp: { toMillis: () => number }) => {
    try {
      const date = new Date(timestamp.toMillis())
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return 'Recently'
    }
  }

  const tabs: Array<{ id: SettingsTab; label: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>> }> = [
    { id: 'organization', label: 'Organization', icon: BriefcaseBusiness },
    { id: 'skills', label: 'Skills & matching', icon: Cpu },
    { id: 'audit', label: 'Activity log', icon: ShieldCheck },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title="Settings"
        actions={
          <button
            className="inline-flex h-8 items-center gap-2 rounded-control border border-wf-border bg-wf-surface px-3 text-xs font-medium text-wf-ink-2 transition-colors hover:bg-wf-surface-sunken hover:text-wf-ink focus:outline-none focus:ring-2 focus:ring-wf-accent/20"
            type="button"
            onClick={refreshSettingsData}
            title="Refresh settings"
          >
            <RefreshCw aria-hidden="true" className={cn('size-3.5', isLoading && 'animate-spin')} />
            <span>Refresh</span>
          </button>
        }
      />

      {/* Internal Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-wf-border pb-3">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'inline-flex items-center gap-2 rounded-control px-3.5 py-2 text-xs font-medium transition-colors',
                isActive
                  ? 'bg-wf-ink text-wf-surface shadow-xs'
                  : 'bg-wf-surface border border-wf-border text-wf-ink-2 hover:bg-wf-surface-sunken hover:text-wf-ink'
              )}
              type="button"
            >
              <Icon className="size-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {errorMessage ? (
        <div className="rounded-control border border-wf-danger/30 bg-wf-danger-wash p-3 text-xs font-medium text-wf-danger">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-control border border-wf-done/30 bg-wf-surface-sunken p-3 text-xs font-medium text-wf-done flex items-center gap-2">
          <Check className="size-4" />
          {successMessage}
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex items-center justify-center p-12 text-xs text-wf-ink-3">
          <Loader2 className="mr-2 size-4 animate-spin text-wf-ink-2" />
          Loading workspace settings...
        </div>
      ) : (
        <div className="space-y-4">
          {activeTab === 'organization' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {showBusinessProfile ? (
                  <SettingsSection
                    icon={BriefcaseBusiness}
                    title="Business profile"
                  >
                    <div className="grid gap-3 sm:grid-cols-2">
                      <ReadOnlyField label="Organization ID" value={profile?.organizationId || 'demo-org-001'} />
                      <ReadOnlyField label="Current account" value={profile?.email || 'N/A'} />
                      <ReadOnlyField label="Active role" value={profile?.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : 'Manager'} />
                      <ReadOnlyField label="Total active members" value={`${teamUsers.length} users`} />
                    </div>
                  </SettingsSection>
                ) : null}

                {showPreferences ? (
                  <SettingsSection
                    icon={Bell}
                    title="Preferences"
                  >
                    <div className="divide-y divide-wf-border">
                      <div className="flex items-center justify-between gap-4 px-1 py-2.5">
                        <div>
                          <h3 className="text-xs font-medium text-wf-ink">Job notifications</h3>
                          <p className="text-[11px] text-wf-ink-3">Receive real-time alerts when a technician updates job status.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setNotificationsEnabled((prev) => !prev)}
                          className={cn(
                            'h-6 w-11 rounded-full p-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-wf-accent/30',
                            notificationsEnabled ? 'bg-wf-accent' : 'bg-wf-surface-sunken border border-wf-border'
                          )}
                        >
                          <span
                            className={cn(
                              'block size-5 rounded-full bg-white transition-transform',
                              notificationsEnabled ? 'translate-x-5' : 'translate-x-0'
                            )}
                          />
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-4 px-1 py-2.5">
                        <div>
                          <h3 className="text-xs font-medium text-wf-ink">Compact operations view</h3>
                          <p className="text-[11px] text-wf-ink-3">Enable high-density row layout for operations dashboard.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleCompact()}
                          className={cn(
                            'h-6 w-11 rounded-full p-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-wf-accent/30',
                            isCompact ? 'bg-wf-accent' : 'bg-wf-surface-sunken border border-wf-border'
                          )}
                        >
                          <span
                            className={cn(
                              'block size-5 rounded-full bg-white transition-transform',
                              isCompact ? 'translate-x-5' : 'translate-x-0'
                            )}
                          />
                        </button>
                      </div>
                    </div>
                  </SettingsSection>
                ) : null}
              </div>

              {showUsersAndRoles ? (
                <SettingsSection
                  icon={UserRoundCog}
                  title="Team access & roles"
                >
                  <div className="overflow-hidden rounded-control border border-wf-border">
                    <table className="w-full min-w-[560px] border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-wf-border bg-wf-surface-sunken">
                          <th className="px-3.5 py-2 font-medium text-wf-ink-3">
                            Name
                          </th>
                          <th className="px-3.5 py-2 font-medium text-wf-ink-3">
                            Email
                          </th>
                          <th className="px-3.5 py-2 font-medium text-wf-ink-3">
                            Role
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-wf-border">
                        {teamUsers.map((user) => (
                          <tr key={user.id || user.email} className="hover:bg-wf-surface-sunken/40">
                            <td className="px-3.5 py-2.5 font-medium text-wf-ink">
                              {user.displayName || 'User'}
                            </td>
                            <td className="px-3.5 py-2.5 text-wf-ink-2">
                              {user.email}
                            </td>
                            <td className="px-3.5 py-2.5">
                              <StatusBadge tone={user.role === 'admin' ? 'primary' : 'default'}>
                                {user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Member'}
                              </StatusBadge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </SettingsSection>
              ) : null}
            </div>
          ) : null}

          {activeTab === 'skills' ? (
            <SettingsSection
              icon={Cpu}
              title="Skills & worker matching"
            >
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-wf-ink-3 mb-2">
                    Organization skills ({config?.availableSkills.length || 0})
                  </h3>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {config?.availableSkills.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center gap-1.5 rounded-control border border-wf-border bg-wf-surface-sunken px-2.5 py-1 text-xs font-medium text-wf-ink-2"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => void handleRemoveSkill(skill)}
                          disabled={isSavingConfig}
                          className="text-wf-ink-3 hover:text-wf-danger focus:outline-none disabled:opacity-50 transition-colors"
                          title={`Remove ${skill}`}
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="flex gap-2 max-w-md">
                    <input
                      type="text"
                      placeholder="Add new skill (e.g. Solar repair)"
                      value={newSkillInput}
                      onChange={(e) => setNewSkillInput(e.target.value)}
                      className="h-9 flex-1 rounded-control border border-wf-border bg-wf-surface px-3 text-xs text-wf-ink outline-none focus:border-wf-accent focus:ring-1 focus:ring-wf-accent/20 placeholder:text-wf-ink-3"
                    />
                    <button
                      type="button"
                      onClick={handleAddSkill}
                      disabled={isSavingConfig || !newSkillInput.trim()}
                      className="inline-flex h-9 items-center gap-1.5 rounded-control border border-wf-border bg-wf-surface px-3 text-xs font-medium text-wf-ink-2 hover:bg-wf-surface-sunken hover:text-wf-ink disabled:opacity-50 transition-colors"
                    >
                      <Plus className="size-3.5" />
                      Add skill
                    </button>
                  </div>
                </div>

                <div className="border-t border-wf-border pt-4 space-y-4">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-wf-ink-3">
                      Dispatch decision engine
                    </h3>
                    <p className="mt-0.5 text-xs text-wf-ink-2">
                      Configure the default scoring model and sensitivity profile used when recommending technicians.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-xs font-medium text-wf-ink">
                      Scoring strategy
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
                      <button
                        type="button"
                        onClick={() => setSelectedStrategy('ahp-topsis-v1')}
                        className={cn(
                          'flex flex-col text-left p-3 rounded-card border transition-colors',
                          selectedStrategy === 'ahp-topsis-v1'
                            ? 'border-wf-accent bg-wf-accent-wash/30 text-wf-ink'
                            : 'border-wf-border bg-wf-surface hover:bg-wf-surface-sunken text-wf-ink-2'
                        )}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-semibold text-wf-ink">AHP-TOPSIS</span>
                          {selectedStrategy === 'ahp-topsis-v1' && (
                            <span className="text-[11px] font-medium text-wf-accent">Active</span>
                          )}
                        </div>
                        <p className="mt-1 text-[11px] text-wf-ink-2 leading-relaxed">
                          Multi-criteria decision making with AHP criteria weighting and TOPSIS vector closeness ranking.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedStrategy('rule-based-v1')}
                        className={cn(
                          'flex flex-col text-left p-3 rounded-card border transition-colors',
                          selectedStrategy === 'rule-based-v1'
                            ? 'border-wf-accent bg-wf-accent-wash/30 text-wf-ink'
                            : 'border-wf-border bg-wf-surface hover:bg-wf-surface-sunken text-wf-ink-2'
                        )}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-semibold text-wf-ink">Weighted sum</span>
                          {selectedStrategy === 'rule-based-v1' && (
                            <span className="text-[11px] font-medium text-wf-accent">Active</span>
                          )}
                        </div>
                        <p className="mt-1 text-[11px] text-wf-ink-2 leading-relaxed">
                          Classic additive scoring across trade skills, availability, and active workload.
                        </p>
                      </button>
                    </div>
                  </div>

                  {selectedStrategy === 'ahp-topsis-v1' && (
                    <div className="space-y-3 pt-1">
                      <label className="block text-xs font-medium text-wf-ink">
                        Default sensitivity profile
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 max-w-xl">
                        {(['Standard', 'Emergency Repair', 'Commercial Maintenance'] as AhpProfileName[]).map(
                          (profileName) => {
                            const isSelected = selectedAhpProfile === profileName
                            const weights = DEFAULT_AHP_PROFILES[profileName]

                            return (
                              <button
                                key={profileName}
                                type="button"
                                onClick={() => setSelectedAhpProfile(profileName)}
                                className={cn(
                                  'flex flex-col text-left p-2.5 rounded-control border transition-colors',
                                  isSelected
                                    ? 'border-wf-accent bg-wf-accent-wash/30'
                                    : 'border-wf-border bg-wf-surface hover:bg-wf-surface-sunken'
                                )}
                              >
                                <span className="text-xs font-medium text-wf-ink">{profileName}</span>
                                <span className="mt-1 text-[10px] text-wf-ink-3">
                                  Skill {Math.round(weights.skillMatch * 100)}% · Avail {Math.round(weights.availability * 100)}%
                                </span>
                              </button>
                            )
                          }
                        )}
                      </div>

                      <div className="rounded-card border border-wf-border bg-wf-surface-sunken p-3 max-w-xl text-xs space-y-2">
                        <span className="font-medium text-wf-ink text-[11px]">
                          Criteria weight distribution ({selectedAhpProfile})
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                          <div className="rounded-control border border-wf-border bg-wf-surface p-2">
                            <p className="text-[10px] text-wf-ink-3">Trade skills</p>
                            <p className="text-xs font-semibold text-wf-ink">
                              {Math.round(DEFAULT_AHP_PROFILES[selectedAhpProfile].skillMatch * 100)}%
                            </p>
                          </div>
                          <div className="rounded-control border border-wf-border bg-wf-surface p-2">
                            <p className="text-[10px] text-wf-ink-3">Availability</p>
                            <p className="text-xs font-semibold text-wf-ink">
                              {Math.round(DEFAULT_AHP_PROFILES[selectedAhpProfile].availability * 100)}%
                            </p>
                          </div>
                          <div className="rounded-control border border-wf-border bg-wf-surface p-2">
                            <p className="text-[10px] text-wf-ink-3">Workload</p>
                            <p className="text-xs font-semibold text-wf-ink">
                              {Math.round(DEFAULT_AHP_PROFILES[selectedAhpProfile].workload * 100)}%
                            </p>
                          </div>
                          <div className="rounded-control border border-wf-border bg-wf-surface p-2">
                            <p className="text-[10px] text-wf-ink-3">Performance</p>
                            <p className="text-xs font-semibold text-wf-ink">
                              {Math.round(DEFAULT_AHP_PROFILES[selectedAhpProfile].performance * 100)}%
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => void handleSaveMatchingStrategy()}
                      disabled={isSavingConfig}
                      className="inline-flex h-9 items-center gap-1.5 rounded-control bg-wf-accent px-3.5 text-xs font-medium text-white hover:bg-wf-accent-hover disabled:opacity-50 transition-colors"
                    >
                      {isSavingConfig ? 'Saving...' : 'Save dispatch strategy'}
                    </button>
                  </div>
                </div>
              </div>
            </SettingsSection>
          ) : null}

          {activeTab === 'audit' && showAuditLogs ? (
            <SettingsSection
              icon={ShieldCheck}
              title="Activity log"
            >
              <div className="divide-y divide-wf-border">
                {auditLogs.length === 0 ? (
                  <p className="py-4 text-center text-xs text-wf-ink-3">
                    No activity records found for this workspace.
                  </p>
                ) : (
                  auditLogs.map((log) => (
                    <article className="px-1 py-2.5" key={log.id}>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-xs font-medium text-wf-ink">
                            {log.action}
                          </h3>
                          <p className="text-[11px] text-wf-ink-3 mt-0.5">
                            Actor: {log.actorId}, Entity: {log.entityType} ({log.entityId})
                          </p>
                        </div>
                        <p className="shrink-0 text-[11px] text-wf-ink-3 tabular-nums">
                          {formatLogTime(log.createdAt)}
                        </p>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </SettingsSection>
          ) : null}

          {activeTab === 'reports' ? (
            <AnalyticsPage />
          ) : null}
        </div>
      )}
    </div>
  )
}

