import { useEffect } from 'react'
import {
  BarChart3,
  BriefcaseBusiness,
  X,
  LayoutDashboard,
  Settings,
  UsersRound,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '@/hooks'
import {
  canAccessSettings,
  canViewDashboard,
  canViewJobs,
  canViewTeam,
  type PermissionCheck,
} from '@/permissions'
import type { UserProfile } from '@/types'
import { cn } from '@/utils'

const navigationItems = [
  {
    label: 'Dashboard',
    to: '/dashboard',
    icon: LayoutDashboard,
    canView: canViewDashboard,
  },
  {
    label: 'Analytics',
    to: '/analytics',
    icon: BarChart3,
    canView: canViewDashboard,
  },
  {
    label: 'Jobs',
    to: '/jobs',
    icon: BriefcaseBusiness,
    canView: canViewJobs,
  },
  { label: 'Team', to: '/team', icon: UsersRound, canView: canViewTeam },
  {
    label: 'Settings',
    to: '/settings',
    icon: Settings,
    canView: canAccessSettings,
  },
] satisfies Array<{
  label: string
  to: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  canView: PermissionCheck
}>

type SidebarProps = {
  isMobileOpen?: boolean
  onMobileClose?: () => void
}

export function Sidebar({
  isMobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  const { profile } = useAuth()
  const visibleNavigationItems = profile
    ? getVisibleNavigationItems(profile)
    : []

  useEffect(() => {
    if (!isMobileOpen) {
      return undefined
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onMobileClose?.()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isMobileOpen, onMobileClose])

  return (
    <>
      <aside className="fixed left-0 top-0 z-50 hidden h-screen w-[240px] flex-col border-r border-sidebar-border bg-sidebar px-3 py-5 md:flex">
        <SidebarContent navigationItems={visibleNavigationItems} />
      </aside>

      {isMobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden" role="presentation">
          <button
            aria-label="Close navigation menu"
            className="absolute inset-0 bg-foreground/20"
            onClick={onMobileClose}
            type="button"
          />
          <aside
            aria-label="Mobile navigation"
            aria-modal="true"
            className="relative flex h-full w-[min(320px,85vw)] flex-col border-r border-sidebar-border bg-sidebar px-3 py-4 shadow-xl"
            role="dialog"
          >
            <div className="mb-4 flex items-center justify-between gap-3 px-4 py-2">
              <BrandMark />
              <button
                aria-label="Close navigation menu"
                className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                onClick={onMobileClose}
                type="button"
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </div>

            <SidebarNavigation
              navigationItems={visibleNavigationItems}
              onNavigate={onMobileClose}
            />
          </aside>
        </div>
      ) : null}
    </>
  )
}

function SidebarContent({
  navigationItems,
}: {
  navigationItems: VisibleNavigationItem[]
}) {
  return (
    <>
      <div className="mb-7 px-3 py-1">
        <BrandMark />
      </div>

      <SidebarNavigation navigationItems={navigationItems} />
    </>
  )
}

function BrandMark() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-base font-semibold text-primary-foreground shadow-sm shadow-primary/20">
        W
      </div>
      <div>
        <p className="text-xl font-semibold leading-6 tracking-[-0.025em] text-primary">
          Workflow
        </p>
        <p className="text-xs leading-4 text-muted-foreground">
          Operations portal
        </p>
      </div>
    </div>
  )
}

function SidebarNavigation({
  navigationItems,
  onNavigate,
}: {
  navigationItems: VisibleNavigationItem[]
  onNavigate?: () => void
}) {
  return (
    <nav aria-label="Primary navigation" className="flex flex-1 flex-col">
      <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80">
        Workspace
      </p>
      <div className="space-y-1">
        {navigationItems.map((item) => (
          <NavLink
            className={({ isActive }) =>
              cn(
                'group relative flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-primary/30',
                isActive
                  ? 'bg-primary/10 text-primary shadow-sm shadow-primary/5'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )
            }
            end={item.to !== '/jobs'}
            key={item.to}
            onClick={onNavigate}
            to={item.to}
          >
            {({ isActive }) => (
              <>
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute inset-y-2 left-0 w-0.5 rounded-full bg-primary transition-opacity',
                    isActive ? 'opacity-100' : 'opacity-0',
                  )}
                />
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
    </nav>
  )
}

type VisibleNavigationItem = (typeof navigationItems)[number]

function getVisibleNavigationItems(profile: UserProfile) {
  return navigationItems.filter((item) => item.canView(profile))
}
