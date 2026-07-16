import { useEffect, useRef } from 'react'
import {
  BarChart3,
  BriefcaseBusiness,
  ClipboardCheck,
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
    label: 'Overview',
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
    label: 'Assignments',
    to: '/assignments',
    icon: ClipboardCheck,
    canView: canViewJobs,
  },
  { label: 'Team', to: '/team', icon: UsersRound, canView: canViewTeam },
  {
    label: 'Reports',
    to: '/analytics',
    icon: BarChart3,
    canView: canViewDashboard,
  },
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
  const mobileDialogRef = useRef<HTMLElement>(null)
  const visibleNavigationItems = profile
    ? getVisibleNavigationItems(profile)
    : []

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

  return (
    <>
      <aside className="fixed left-0 top-0 z-50 hidden h-screen w-[240px] flex-col border-r border-sidebar-border bg-sidebar px-3 py-4 md:flex">
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
            ref={mobileDialogRef}
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
      <div className="mb-6 px-3 py-1">
        <BrandMark />
      </div>

      <SidebarNavigation navigationItems={navigationItems} />
    </>
  )
}

function BrandMark() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-8 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
        W
      </div>
      <div>
        <p className="text-lg font-semibold leading-5 tracking-[-0.02em] text-foreground">
          Workflow
        </p>
        <p className="text-xs leading-4 text-muted-foreground">Management</p>
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
      <div className="space-y-1">
        {navigationItems.map((item) => (
          <NavLink
            className={({ isActive }) =>
              cn(
                'group relative flex min-h-9 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30',
                isActive
                  ? 'bg-muted text-foreground'
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
                      ? 'text-foreground'
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
