import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/layouts'
import {
  canAccessSettings,
  canCreateJob,
  canViewDashboard,
  canViewJobs,
  canViewTeam,
} from '@/permissions'
import { ProtectedRoute } from './ProtectedRoute'
import { RoleRoute } from './RoleRoute'

const AnalyticsPage = lazy(() =>
  import('@/pages/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })),
)
const CreateJobPage = lazy(() =>
  import('@/pages/CreateJobPage').then((m) => ({ default: m.CreateJobPage })),
)
const DashboardPage = lazy(() =>
  import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
)
const JobDetailsPage = lazy(() =>
  import('@/pages/JobDetailsPage').then((m) => ({ default: m.JobDetailsPage })),
)
const JobsPage = lazy(() =>
  import('@/pages/JobsPage').then((m) => ({ default: m.JobsPage })),
)
const LoginPage = lazy(() =>
  import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage })),
)
const ProfileSetupRequiredPage = lazy(() =>
  import('@/pages/ProfileSetupRequiredPage').then((m) => ({
    default: m.ProfileSetupRequiredPage,
  })),
)
const SettingsPage = lazy(() =>
  import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
)
const TeamPage = lazy(() =>
  import('@/pages/TeamPage').then((m) => ({ default: m.TeamPage })),
)
const UnauthorizedPage = lazy(() =>
  import('@/pages/UnauthorizedPage').then((m) => ({
    default: m.UnauthorizedPage,
  })),
)
const WhatsAppStandaloneSimulatorPage = lazy(() =>
  import('@/pages/WhatsAppStandaloneSimulatorPage').then((m) => ({
    default: m.WhatsAppStandaloneSimulatorPage,
  })),
)

function RouteLoadingFallback() {
  return (
    <div className="flex h-64 w-full items-center justify-center p-8">
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
        <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span>Loading...</span>
      </div>
    </div>
  )
}

export function AppRoutes() {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Routes>
        <Route path="/" element={<Navigate replace to="/dashboard" />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/profile-setup-required"
          element={<ProfileSetupRequiredPage />}
        />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route
          path="/demo/whatsapp"
          element={<WhatsAppStandaloneSimulatorPage />}
        />
        <Route
          path="/demo/phone"
          element={<WhatsAppStandaloneSimulatorPage />}
        />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route element={<RoleRoute canAccess={canViewDashboard} />}>
              <Route path="/dashboard" element={<DashboardPage />} />
            </Route>
            <Route element={<RoleRoute canAccess={canViewDashboard} />}>
              <Route path="/analytics" element={<AnalyticsPage />} />
            </Route>
            <Route element={<RoleRoute canAccess={canViewJobs} />}>
              <Route path="/jobs" element={<JobsPage />} />
              <Route path="/assignments" element={<JobsPage />} />
            </Route>
            <Route element={<RoleRoute canAccess={canCreateJob} />}>
              <Route path="/jobs/create" element={<CreateJobPage />} />
            </Route>
            <Route element={<RoleRoute canAccess={canViewJobs} />}>
              <Route path="/jobs/:jobId" element={<JobDetailsPage />} />
            </Route>
            <Route element={<RoleRoute canAccess={canViewTeam} />}>
              <Route path="/team" element={<TeamPage />} />
            </Route>
            <Route element={<RoleRoute canAccess={canAccessSettings} />}>
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </Suspense>
  )
}
