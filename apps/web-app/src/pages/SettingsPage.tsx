import {
  Bell,
  BriefcaseBusiness,
  ClipboardList,
  ShieldCheck,
  UserRoundCog,
} from 'lucide-react'
import { PageHeader, StatusBadge } from '@/components'
import { useAuth } from '@/hooks'
import {
  canManageBusiness,
  canManageUsers,
  canViewAuditLogs,
  canViewOperationalPreferences,
} from '@/permissions'

const businessProfile = [
  { label: 'Business Name', value: 'Service Pro Inc.' },
  { label: 'Business Email', value: 'operations@servicepro.example' },
  { label: 'Service Region', value: 'Springfield Metro' },
  { label: 'Primary Job Type', value: 'Field Service' },
]

const users = [
  {
    email: 'admin@servicepro.example',
    name: 'Avery Stone',
    role: 'Admin',
    tone: 'primary',
  },
  {
    email: 'manager@servicepro.example',
    name: 'Sam Manager',
    role: 'Manager',
    tone: 'default',
  },
  {
    email: 'team@servicepro.example',
    name: 'Alex Rivera',
    role: 'Employee',
    tone: 'default',
  },
] satisfies Array<{
  email: string
  name: string
  role: string
  tone: 'default' | 'primary'
}>

const auditLogs = [
  {
    action: 'Job Created',
    actor: 'Sam Manager',
    id: 'audit-1',
    target: '#JOB-0842',
    time: 'Today, 08:30 AM',
  },
  {
    action: 'Suggested Worker Reviewed',
    actor: 'Sam Manager',
    id: 'audit-2',
    target: '#JOB-0842',
    time: 'Today, 08:31 AM',
  },
  {
    action: 'Issue Updated',
    actor: 'Avery Stone',
    id: 'audit-3',
    target: 'Material shortage',
    time: 'Yesterday, 04:15 PM',
  },
]

const preferences = [
  {
    description: 'Show alerts when Jobs are assigned or updated.',
    label: 'Job notifications',
    value: true,
  },
  {
    description: 'Surface Issues in the header notification feed.',
    label: 'Issue alerts',
    value: true,
  },
  {
    description: 'Use compact rows for Jobs and Team lists.',
    label: 'Compact operational views',
    value: false,
  },
]

function SettingsSection({
  children,
  description,
  icon: Icon,
  title,
}: {
  children: React.ReactNode
  description: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  title: string
}) {
  return (
    <section className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-start gap-3 border-b border-border p-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon aria-hidden="true" className="size-4" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      <div className="p-3">{children}</div>
    </section>
  )
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <div className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground">
        {value}
      </div>
    </div>
  )
}

export function SettingsPage() {
  const { profile } = useAuth()
  const showBusinessProfile = profile ? canManageBusiness(profile) : false
  const showUsersAndRoles = profile ? canManageUsers(profile) : false
  const showAuditLogs = profile ? canViewAuditLogs(profile) : false
  const showPreferences = profile
    ? canViewOperationalPreferences(profile)
    : false

  return (
    <div className="space-y-5">
      <PageHeader
        title="Settings"
        description="Review Business setup, Team access, Audit Logs, and operational Preferences."
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          {showBusinessProfile ? (
            <SettingsSection
              icon={BriefcaseBusiness}
              title="Business Profile"
              description="Admin-focused Business details used across Jobs and Team workflows."
            >
              <div className="grid gap-3 md:grid-cols-2">
                {businessProfile.map((field) => (
                  <ReadOnlyField key={field.label} {...field} />
                ))}
              </div>
            </SettingsSection>
          ) : null}

          {showUsersAndRoles ? (
            <SettingsSection
              icon={UserRoundCog}
              title="Users & Roles"
              description="Admin-focused view of mock users and their current access level."
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
                    {users.map((user) => (
                      <tr key={user.email}>
                        <td className="px-3 py-2 font-medium text-foreground">
                          {user.name}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {user.email}
                        </td>
                        <td className="px-3 py-2">
                          <StatusBadge tone={user.tone}>{user.role}</StatusBadge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SettingsSection>
          ) : null}
        </div>

        <div className="space-y-4">
          {showAuditLogs ? (
            <SettingsSection
              icon={ShieldCheck}
              title="Audit Logs"
              description="Admin-focused activity summary for Jobs, Team, and Issues."
            >
              <div className="space-y-2">
                {auditLogs.map((log) => (
                  <article
                    className="rounded-lg border border-border bg-background px-3 py-2"
                    key={log.id}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-sm font-medium text-foreground">
                          {log.action}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {log.actor} - {log.target}
                        </p>
                      </div>
                      <p className="shrink-0 text-xs text-muted-foreground">
                        {log.time}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </SettingsSection>
          ) : null}

          {showPreferences ? (
            <SettingsSection
              icon={Bell}
              title="Preferences"
              description="Manager-visible display preferences for Jobs, Team, and Issues."
            >
              <div className="space-y-2">
                {preferences.map((preference) => (
                  <div
                    className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background px-3 py-2"
                    key={preference.label}
                  >
                    <div>
                      <h3 className="text-sm font-medium text-foreground">
                        {preference.label}
                      </h3>
                      <p className="text-sm leading-5 text-muted-foreground">
                        {preference.description}
                      </p>
                    </div>
                    <span
                      className={
                        preference.value
                          ? 'h-6 w-11 rounded-full bg-primary p-0.5'
                          : 'h-6 w-11 rounded-full bg-muted p-0.5'
                      }
                    >
                      <span
                        className={
                          preference.value
                            ? 'block size-5 translate-x-5 rounded-full bg-white shadow-sm'
                            : 'block size-5 rounded-full bg-white shadow-sm'
                        }
                      />
                    </span>
                  </div>
                ))}
              </div>
            </SettingsSection>
          ) : null}
        </div>
      </div>

      <section className="rounded-xl border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
        <div className="flex items-start gap-3">
          <ClipboardList aria-hidden="true" className="mt-0.5 size-5 text-primary" />
          <p>
            Settings are static in this phase. Save, update, invite, and role-change
            actions will be added in a later implementation phase.
          </p>
        </div>
      </section>
    </div>
  )
}
