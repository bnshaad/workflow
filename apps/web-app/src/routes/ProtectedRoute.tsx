import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks'
import { canAccessWebPortal } from '@/permissions'

export function ProtectedRoute() {
  const location = useLocation()
  const { loading, profile, user } = useAuth()

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="rounded-md border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          Loading...
        </div>
      </main>
    )
  }

  if (!user) {
    return <Navigate replace state={{ from: location }} to="/login" />
  }

  if (!profile) {
    return <Navigate replace to="/profile-setup-required" />
  }

  if (!canAccessWebPortal(profile)) {
    return <Navigate replace to="/unauthorized" />
  }

  return <Outlet />
}
