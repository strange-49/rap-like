import { Navigate, Route, Routes } from 'react-router-dom'
import { ClientLayout } from '../layouts/ClientLayout'
import { ClientDashboardPage } from '../pages/ClientDashboardPage'
import { ROUTE_PATHS } from './route-paths'

function EmployeesPage() {
  return <h2>Employees</h2>
}

function RidesPage() {
  return <h2>Rides</h2>
}

function SettingsPage() {
  return <h2>Settings</h2>
}

export function AppRoutes() {
  return (
    <ClientLayout>
      <Routes>
        <Route path={ROUTE_PATHS.dashboard} element={<ClientDashboardPage />} />
        <Route path={ROUTE_PATHS.employees} element={<EmployeesPage />} />
        <Route path={ROUTE_PATHS.rides} element={<RidesPage />} />
        <Route path={ROUTE_PATHS.settings} element={<SettingsPage />} />
        <Route path="*" element={<Navigate to={ROUTE_PATHS.dashboard} replace />} />
      </Routes>
    </ClientLayout>
  )
}
