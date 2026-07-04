import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/layouts'
import {
  DashboardPage,
  JobDetailsPage,
  JobsPage,
  LoginPage,
  ProfileSetupRequiredPage,
  SettingsPage,
  TeamPage,
  UnauthorizedPage,
} from '@/pages'
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
          <Route element={<RoleRoute allowedRoles={['admin', 'manager']} />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/jobs" element={<JobsPage />} />
            <Route path="/jobs/:jobId" element={<JobDetailsPage />} />
            <Route path="/team" element={<TeamPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  )
}
