import { Navigate, Route, Routes } from 'react-router-dom'
import { ClientLayout } from '../layouts/ClientLayout'
import { ClientDashboardPage } from '../pages/ClientDashboardPage'
import { EmployeesPage } from '../pages/EmployeesPage'
import { RidesPage } from '../pages/RidesPage'
import { SettingsPage } from '../pages/SettingsPage'
import { ROUTE_PATHS } from './route-paths'

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
