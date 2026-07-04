import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks'
import type { PermissionCheck } from '@/permissions'

type RoleRouteProps = {
  canAccess: PermissionCheck
}

export function RoleRoute({ canAccess }: RoleRouteProps) {
  const { loading, profile } = useAuth()

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
          Loading...
        </div>
      </main>
    )
  }

  if (!profile || !canAccess(profile)) {
    return <Navigate replace to="/unauthorized" />
  }

  return <Outlet />
}
