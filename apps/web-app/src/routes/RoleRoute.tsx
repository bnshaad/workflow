import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks'
import type { PermissionCheck } from '@/permissions'

type RoleRouteProps = {
  canAccess: PermissionCheck
}

export function RoleRoute({ canAccess }: RoleRouteProps) {
  const { profile } = useAuth()

  if (!profile || !canAccess(profile)) {
    return <Navigate replace to="/unauthorized" />
  }

  return <Outlet />
}
