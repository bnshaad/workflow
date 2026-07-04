import { Outlet } from 'react-router-dom'

type RoleRouteProps = {
  allowedRoles: string[]
}

export function RoleRoute({ allowedRoles: _allowedRoles }: RoleRouteProps) {
  void _allowedRoles

  return <Outlet />
}
