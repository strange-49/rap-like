import { Navigate, Route, Routes } from 'react-router-dom'
import { AdminLayout } from '../layouts/AdminLayout'
import { ROUTE_PATHS } from './route-paths'

function DashboardPage() {
  return <h2>Admin Dashboard</h2>
}

function CustomersPage() {
  return <h2>Customers</h2>
}

function RidersPage() {
  return <h2>Riders</h2>
}

function RidesPage() {
  return <h2>Rides</h2>
}

function ClientsPage() {
  return <h2>Clients</h2>
}

function SettingsPage() {
  return <h2>Settings</h2>
}

export function AppRoutes() {
  return (
    <AdminLayout>
      <Routes>
        <Route path={ROUTE_PATHS.dashboard} element={<DashboardPage />} />
        <Route path={ROUTE_PATHS.customers} element={<CustomersPage />} />
        <Route path={ROUTE_PATHS.riders} element={<RidersPage />} />
        <Route path={ROUTE_PATHS.rides} element={<RidesPage />} />
        <Route path={ROUTE_PATHS.clients} element={<ClientsPage />} />
        <Route path={ROUTE_PATHS.settings} element={<SettingsPage />} />
        <Route path="*" element={<Navigate to={ROUTE_PATHS.dashboard} replace />} />
      </Routes>
    </AdminLayout>
  )
}
