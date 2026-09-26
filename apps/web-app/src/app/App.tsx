import { AppRoutes } from '@/routes/AppRoutes'
import { AuthProvider } from '@/contexts/AuthContext'
import { ErrorBoundary } from '@/components'

export function App() {
  return (
    <AuthProvider>
      <ErrorBoundary>
        <AppRoutes />
      </ErrorBoundary>
    </AuthProvider>
  )
}

