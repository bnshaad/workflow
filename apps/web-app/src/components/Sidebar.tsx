import { useEffect, useRef } from 'react'
import {
  BriefcaseBusiness,
  LayoutDashboard,
  LogOut,
  Plus,
  Settings,
  UserCircle,
  UsersRound,
  X,
} from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks'
import {
  canAccessSettings,
  canCreateJob,
  canViewDashboard,
  canViewJobs,
  canViewTeam,
  type PermissionCheck,
} from '@/permissions'
import type { UserProfile } from '@/types'
import { cn } from '@/utils'

type NavGroup = {
  category: string
  items: Array<{
    label: string
    to: string
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
    canView: PermissionCheck
  }>
}

const navigationGroups: NavGroup[] = [
  {
    category: 'MENU',
    items: [
      {
        label: 'Dashboard',
        to: '/dashboard',
        icon: LayoutDashboard,
        canView: canViewDashboard,
      },
      {
        label: 'Jobs',
        to: '/jobs',
        icon: BriefcaseBusiness,
        canView: canViewJobs,
      },
      {
        label: 'Team',
        to: '/team',
        icon: UsersRound,
        canView: canViewTeam,
      },
      {
        label: 'Settings & Reports',
        to: '/settings',
        icon: Settings,
        canView: canAccessSettings,
      },
    ],
  },
]

type SidebarProps = {
  isMobileOpen?: boolean
  onMobileClose?: () => void
  onOpenCreateJob?: () => void
}

export function Sidebar({
  isMobileOpen = false,
  onMobileClose,
  onOpenCreateJob,
}: SidebarProps) {

  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const mobileDialogRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!isMobileOpen) {
      return undefined
    }

    const previouslyFocusedElement = document.activeElement as HTMLElement | null
    const focusableElements = mobileDialogRef.current
      ? Array.from(
          mobileDialogRef.current.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        )
      : []

    focusableElements[0]?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onMobileClose?.()
        return
      }

      if (event.key === 'Tab' && focusableElements.length > 0) {
        const firstElement = focusableElements[0]
        const lastElement = focusableElements[focusableElements.length - 1]

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault()
          lastElement.focus()
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault()
          firstElement.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previouslyFocusedElement?.focus()
    }
  }, [isMobileOpen, onMobileClose])

  async function handleSignOut() {
    try {
      await signOut()
      onMobileClose?.()
      navigate('/login', { replace: true })
    } catch {
      // Ignored
    }
  }

  return (
    <>
      <aside className="fixed left-0 top-0 z-50 hidden h-screen w-[240px] flex-col border-r border-sidebar-border bg-sidebar px-3.5 py-4 md:flex">
        <SidebarContent profile={profile} onOpenCreateJob={onOpenCreateJob} onSignOut={handleSignOut} />
      </aside>

      {isMobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden" role="presentation">
          <button
            aria-label="Close navigation menu"
            className="absolute inset-0 bg-foreground/20 backdrop-blur-xs"
            onClick={onMobileClose}
            type="button"
          />
          <aside
            aria-label="Mobile navigation"
            aria-modal="true"
            className="relative flex h-full w-[min(320px,85vw)] flex-col border-r border-sidebar-border bg-sidebar px-3.5 py-4 shadow-xl"
            ref={mobileDialogRef}
            role="dialog"
          >
            <div className="mb-4 flex items-center justify-between gap-3 px-2 py-1">
              <BrandMark />
              <button
                aria-label="Close navigation menu"
                className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                onClick={onMobileClose}
                type="button"
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </div>

            <SidebarNavigation
              profile={profile}
              onNavigate={onMobileClose}
            />

            <SidebarFooter onOpenCreateJob={() => { onMobileClose?.(); onOpenCreateJob?.() }} onSignOut={handleSignOut} profile={profile} />
          </aside>
        </div>
      ) : null}
    </>
  )
}

function SidebarContent({
  profile,
  onOpenCreateJob,
  onSignOut,
}: {
  profile: UserProfile | null
  onOpenCreateJob?: () => void
  onSignOut: () => void
}) {
  return (
    <>
      <div className="mb-5 rounded-xl border border-border/80 bg-muted/40 p-2.5">
        <BrandMark />
      </div>

      <SidebarNavigation profile={profile} />

      <SidebarFooter onOpenCreateJob={onOpenCreateJob} onSignOut={onSignOut} profile={profile} />
    </>
  )
}

function BrandMark() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground shadow-xs">
        W
      </div>
      <div>
        <p className="text-[14px] font-bold tracking-tight text-foreground leading-4">
          Workflow
        </p>
        <p className="text-[11px] font-medium text-muted-foreground">Field Operations</p>
      </div>
    </div>
  )
}

function SidebarNavigation({
  profile,
  onNavigate,
}: {
  profile: UserProfile | null
  onNavigate?: () => void
}) {
  return (
    <nav aria-label="Primary navigation" className="flex-1 space-y-5 overflow-y-auto pr-1">
      {navigationGroups.map((group) => {
        const visibleItems = profile
          ? group.items.filter((item) => item.canView(profile))
          : []

        if (visibleItems.length === 0) return null

        return (
          <div key={group.category} className="space-y-0.5">
            {visibleItems.map((item) => (
              <NavLink
                className={({ isActive }) =>
                  cn(
                    'group relative flex min-h-9 items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-all focus:outline-none focus:ring-2 focus:ring-primary/30',
                    isActive
                      ? 'bg-sidebar-accent font-semibold text-sidebar-accent-foreground'
                      : 'font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground',
                  )
                }
                end={item.to !== '/jobs'}
                key={item.to}
                onClick={onNavigate}
                to={item.to}
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      aria-hidden="true"
                      className={cn(
                        'size-[18px] shrink-0 transition-colors',
                        isActive
                          ? 'text-primary'
                          : 'text-muted-foreground group-hover:text-foreground',
                      )}
                    />
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        )
      })}
    </nav>
  )
}

function SidebarFooter({
  profile,
  onOpenCreateJob,
  onSignOut,
}: {
  profile: UserProfile | null
  onOpenCreateJob?: () => void
  onSignOut: () => void
}) {
  const displayName = profile?.displayName ?? 'Workflow Manager'
  const email = profile?.email ?? 'operations@workflow.example'
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <div className="mt-auto border-t border-sidebar-border pt-3 space-y-2.5">
      {profile && canCreateJob(profile) ? (
        <button
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
          onClick={onOpenCreateJob}
          type="button"
        >
          <Plus aria-hidden="true" className="size-4" />
          <span>Create Job</span>
        </button>
      ) : null}


      <div className="flex items-center gap-2.5 px-2 py-1">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-foreground">
          {initials || <UserCircle className="size-5 text-muted-foreground" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-foreground leading-4">
            {displayName}
          </p>
          <p className="truncate text-[10px] text-muted-foreground">
            {email}
          </p>
        </div>
      </div>
      <button
        aria-label="Sign out"
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-border/80 bg-card py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
        onClick={onSignOut}
        type="button"
      >
        <LogOut aria-hidden="true" className="size-3.5" />
        Logout
      </button>
    </div>
  )
}
