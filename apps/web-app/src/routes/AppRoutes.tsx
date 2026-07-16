import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/layouts'
import {
  AnalyticsPage,
  CreateJobPage,
  DashboardPage,
  JobDetailsPage,
  JobsPage,
  LoginPage,
  ProfileSetupRequiredPage,
  SettingsPage,
  TeamPage,
  UnauthorizedPage,
} from '@/pages'
import {
  canAccessSettings,
  canCreateJob,
  canViewDashboard,
  canViewJobs,
  canViewTeam,
} from '@/permissions'
import { ProtectedRoute } from './ProtectedRoute'
import { RoleRoute } from './RoleRoute'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate replace to="/dashboard" />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/profile-setup-required"
        element={<ProfileSetupRequiredPage />}
      />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

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
  )
}
