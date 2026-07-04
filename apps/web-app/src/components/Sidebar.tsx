import {
  BriefcaseBusiness,
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

export function Sidebar() {
  const { profile } = useAuth()
  const visibleNavigationItems = profile
    ? getVisibleNavigationItems(profile)
    : []

  return (
    <aside className="fixed left-0 top-0 z-50 hidden h-screen w-[240px] flex-col border-r border-sidebar-border bg-sidebar px-2 py-4 md:flex">
      <div className="mb-8 flex items-center gap-3 px-4 py-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-base font-semibold text-primary-foreground">
          W
        </div>
        <div>
          <p className="text-2xl font-semibold leading-7 tracking-tight text-primary">
            Workflow
          </p>
          <p className="text-xs leading-4 text-muted-foreground">Business</p>
        </div>
      </div>

      <nav aria-label="Primary navigation" className="flex flex-1 flex-col gap-1">
        {visibleNavigationItems.map((item) => (
          <NavLink
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )
            }
            end={item.to !== '/jobs'}
            key={item.to}
            to={item.to}
          >
            <item.icon aria-hidden="true" className="size-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

function getVisibleNavigationItems(profile: UserProfile) {
  return navigationItems.filter((item) => item.canView(profile))
}
