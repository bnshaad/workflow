export type MockRole = 'admin' | 'manager' | 'employee'

type MockAuthState = {
  isAuthenticated: boolean
  role: MockRole
}

export const mockAuthState: MockAuthState = {
  isAuthenticated: true,
  role: 'manager',
}
