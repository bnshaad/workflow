import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { mockAuthState } from '@/config'

export function ProtectedRoute() {
  const location = useLocation()

  if (!mockAuthState.isAuthenticated) {
    return <Navigate replace state={{ from: location }} to="/login" />
  }

  return <Outlet />
}
