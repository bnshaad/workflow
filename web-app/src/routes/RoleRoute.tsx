import { Navigate, Outlet } from 'react-router-dom'
import { mockAuthState, type MockRole } from '@/config'

type RoleRouteProps = {
  allowedRoles: MockRole[]
}

export function RoleRoute({ allowedRoles }: RoleRouteProps) {
  if (!allowedRoles.includes(mockAuthState.role)) {
    return <Navigate replace to="/unauthorized" />
  }

  return <Outlet />
}
