import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks'

export function ProtectedRoute() {
  const location = useLocation()
  const { loading, user } = useAuth()

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
          Loading...
        </div>
      </main>
    )
  }

  if (!user) {
    return <Navigate replace state={{ from: location }} to="/login" />
  }

  return <Outlet />
}
