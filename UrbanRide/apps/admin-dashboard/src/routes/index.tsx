import { Navigate, Route, Routes } from 'react-router-dom'
import { AdminLayout } from '../layouts/AdminLayout'
import { DashboardPage } from '../pages/AdminDashboardPage'
import { AdminCustomersPage } from '../pages/AdminCustomersPage'
import { AdminRidersPage } from '../pages/AdminRidersPage'
import { AdminRidesPage } from '../pages/AdminRidesPage'
import { AdminRideDetailPage } from '../pages/AdminRideDetailPage'
import { AdminPaymentsPage } from '../pages/AdminPaymentsPage'
import { AdminPaymentDetailPage } from '../pages/AdminPaymentDetailPage'
import { AdminClientsPage } from '../pages/AdminClientsPage'
import { AdminCorporateDetailPage } from '../pages/AdminCorporateDetailPage'
import { ROUTE_PATHS } from './route-paths'
import { AdminModulePage } from '../pages/AdminModulePage'
import { AdminSupportPage } from '../pages/AdminSupportPage'

export function AppRoutes() {
  return (
    <AdminLayout>
      <Routes>
        <Route path={ROUTE_PATHS.dashboard} element={<DashboardPage />} />
        <Route path={ROUTE_PATHS.customers} element={<AdminCustomersPage />} />
        <Route path={ROUTE_PATHS.riders} element={<AdminRidersPage />} />
        <Route path={ROUTE_PATHS.rides} element={<AdminRidesPage />} />
        <Route path="/rides/detail" element={<AdminRideDetailPage />} />
        <Route path="/payments" element={<AdminPaymentsPage />} />
        <Route path="/payments/detail" element={<AdminPaymentDetailPage />} />
        <Route path={ROUTE_PATHS.clients} element={<AdminClientsPage />} />
        <Route path="/clients/detail" element={<AdminCorporateDetailPage />} />
        <Route path={ROUTE_PATHS.settings} element={<AdminModulePage />} />
        <Route path="/support" element={<AdminSupportPage />} />
        <Route path="/fleet" element={<AdminModulePage />} />
        <Route path="/analytics" element={<AdminModulePage />} />
        <Route path="/notifications" element={<AdminModulePage />} />
        <Route path="/admins" element={<AdminModulePage />} />
        <Route
          path="*"
          element={<Navigate to={ROUTE_PATHS.dashboard} replace />}
        />
      </Routes>
    </AdminLayout>
  )
}
