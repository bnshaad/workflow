import { useEffect, useState } from 'react'
import {
  BarChart3,
  Bell,
  BriefcaseBusiness,
  Check,
  ClipboardList,
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
  type OrganizationConfiguration,
} from '../../../../shared/configuration.ts'

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
    <section className="rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2.5 border-b border-border px-3.5 py-2.5">
        <Icon aria-hidden="true" className="size-4 shrink-0 text-primary" />
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      <div className="p-3.5">{children}</div>
    </section>
  )
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-muted-foreground">
        {label}
      </p>
      <div className="border-b border-border pb-2 text-sm font-medium text-foreground">
        {value}
      </div>
    </div>
  )
}

type SettingsTab = 'general' | 'team' | 'config' | 'audit' | 'reports'

export function SettingsPage() {
  const { profile } = useAuth()
  const { isCompact, toggleCompact } = useCompactView()
  const showBusinessProfile = profile ? canManageBusiness(profile) : false
  const showUsersAndRoles = profile ? canManageUsers(profile) : false
  const showAuditLogs = profile ? canViewAuditLogs(profile) : false
  const showPreferences = profile ? canViewOperationalPreferences(profile) : false

  const [activeTab, setActiveTab] = useState<SettingsTab>('general')
  const [teamUsers, setTeamUsers] = useState<UserProfile[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([])
  const [config, setConfig] = useState<OrganizationConfiguration | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingConfig, setIsSavingConfig] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const [newSkillInput, setNewSkillInput] = useState('')
  const [selectedAhpProfileKey, setSelectedAhpProfileKey] = useState('standard')
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
      setSuccessMessage(`Added skill "${trimmed}" to organization configuration.`)
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

  const roleTone: Record<string, 'default' | 'primary' | 'success' | 'warning'> = {
    admin: 'primary',
    manager: 'warning',
    employee: 'default',
  }

  const tabs: Array<{ id: SettingsTab; label: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>> }> = [
    { id: 'general', label: 'Business Info', icon: BriefcaseBusiness },
    { id: 'team', label: 'Team Access', icon: UserRoundCog },
    { id: 'config', label: 'Skills & Matching', icon: Cpu },
    { id: 'audit', label: 'Activity Log', icon: ShieldCheck },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
  ]

  return (
    <div className="space-y-3">
      <PageHeader
        title="Settings"
        actions={
          <button
            className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
            type="button"
            onClick={refreshSettingsData}
            title="Refresh Settings"
          >
            <RefreshCw aria-hidden="true" className="size-4" />
          </button>
        }
      />

      {/* Internal Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-card border border-border text-muted-foreground hover:bg-muted hover:text-foreground'
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
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
          <Check className="size-4" />
          {successMessage}
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex items-center justify-center p-12 text-sm text-muted-foreground">
          <Loader2 className="mr-2 size-5 animate-spin text-primary" />
          Loading workspace settings from Firestore...
        </div>
      ) : (
        <div className="space-y-3">
          {activeTab === 'general' ? (
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              {showBusinessProfile ? (
                <SettingsSection
                  icon={BriefcaseBusiness}
                  title="Business Profile"
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <ReadOnlyField label="Organization ID" value={profile?.organizationId || 'demo-org-001'} />
                    <ReadOnlyField label="Current Account" value={profile?.email || 'N/A'} />
                    <ReadOnlyField label="Active Role" value={profile?.role.toUpperCase() || 'MANAGER'} />
                    <ReadOnlyField label="Total Active Members" value={`${teamUsers.length} Users`} />
                  </div>
                </SettingsSection>
              ) : null}

              {showPreferences ? (
                <SettingsSection
                  icon={Bell}
                  title="Preferences"
                >
                  <div className="divide-y divide-border">
                    <div className="flex items-center justify-between gap-4 px-1 py-2.5">
                      <div>
                        <h3 className="text-sm font-medium text-foreground">Job Notifications</h3>
                        <p className="text-xs text-muted-foreground">Receive real-time alerts when technician updates status.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNotificationsEnabled((prev) => !prev)}
                        className={cn(
                          'h-6 w-11 rounded-full p-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30',
                          notificationsEnabled ? 'bg-primary' : 'bg-muted'
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
                        <h3 className="text-sm font-medium text-foreground">Compact Operations View</h3>
                        <p className="text-xs text-muted-foreground">Enable high-density row layout for operations dashboard.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleCompact()}
                        className={cn(
                          'h-6 w-11 rounded-full p-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30',
                          isCompact ? 'bg-primary' : 'bg-muted'
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
          ) : null}

          {activeTab === 'team' && showUsersAndRoles ? (
            <SettingsSection
              icon={UserRoundCog}
              title="Users & Roles"
            >
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full min-w-[560px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-background/60">
                      <th className="px-3 py-2 text-xs font-medium tracking-[0.08em] text-muted-foreground">
                        Name
                      </th>
                      <th className="px-3 py-2 text-xs font-medium tracking-[0.08em] text-muted-foreground">
                        Email
                      </th>
                      <th className="px-3 py-2 text-xs font-medium tracking-[0.08em] text-muted-foreground">
                        Role
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {teamUsers.map((user) => (
                      <tr key={user.id || user.email}>
                        <td className="px-3 py-2 font-medium text-foreground">
                          {user.displayName || 'User'}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {user.email}
                        </td>
                        <td className="px-3 py-2">
                          <StatusBadge tone={roleTone[user.role] || 'default'}>
                            {user.role}
                          </StatusBadge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SettingsSection>
          ) : null}

          {activeTab === 'config' ? (
            <SettingsSection
              icon={Cpu}
              title="Skills & Worker Matching"
            >
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Organization Skills ({config?.availableSkills.length || 0})
                  </h3>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {config?.availableSkills.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted px-2.5 py-1 text-xs font-medium text-foreground"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => void handleRemoveSkill(skill)}
                          disabled={isSavingConfig}
                          className="text-muted-foreground hover:text-destructive focus:outline-none disabled:opacity-50"
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
                      placeholder="Add new skill (e.g. Solar Repair)"
                      value={newSkillInput}
                      onChange={(e) => setNewSkillInput(e.target.value)}
                      className="h-9 flex-1 rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                    <button
                      type="button"
                      onClick={handleAddSkill}
                      disabled={isSavingConfig || !newSkillInput.trim()}
                      className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      <Plus className="size-4" />
                      Add Skill
                    </button>
                  </div>
                </div>

                <details className="group border-t border-border pt-3">
                  <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground">
                    Advanced Matching Strategy Settings
                  </summary>
                  <div className="mt-3 space-y-2">
                    <select
                      value={selectedAhpProfileKey}
                      onChange={(e) => setSelectedAhpProfileKey(e.target.value)}
                      className="h-9 w-full max-w-md rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="standard">Standard Strategy (Balanced Skill & Availability)</option>
                      <option value="emergency_repair">Emergency Strategy (Prioritize Immediate Availability)</option>
                      <option value="commercial_maintenance">Specialized Maintenance (Prioritize High Skill & Performance)</option>
                    </select>
                    <p className="text-xs text-muted-foreground">
                      Tune how the AI recommendation engine ranks workers when assigning jobs.
                    </p>
                  </div>
                </details>
              </div>
            </SettingsSection>
          ) : null}

          {activeTab === 'audit' && showAuditLogs ? (
            <SettingsSection
              icon={ShieldCheck}
              title="Live Audit Logs"
            >
              <div className="divide-y divide-border">
                {auditLogs.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    No audit log records found for this workspace.
                  </p>
                ) : (
                  auditLogs.map((log) => (
                    <article className="px-1 py-2.5" key={log.id}>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-sm font-medium text-foreground">
                            {log.action}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            Actor: {log.actorId} • Entity: {log.entityType} ({log.entityId})
                          </p>
                        </div>
                        <p className="shrink-0 text-xs text-muted-foreground">
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

      <section className="border-t border-border px-1 pt-3 text-xs text-muted-foreground">
        <div className="flex items-start gap-2">
          <ClipboardList aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
          <p>
            Settings changes are saved directly to your organization configuration document in Cloud Firestore (`organizationConfigurations`).
          </p>
        </div>
      </section>
    </div>
  )
}
