import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AdminLayout } from '../layouts/AdminLayout'
const DashboardPage = lazy(() => import('../pages/AdminDashboardPage').then((module) => ({ default: module.DashboardPage })))
const AdminCustomersPage = lazy(() => import('../pages/AdminCustomersPage').then((module) => ({ default: module.AdminCustomersPage })))
const AdminRidersPage = lazy(() => import('../pages/AdminRidersPage').then((module) => ({ default: module.AdminRidersPage })))
const AdminRidesPage = lazy(() => import('../pages/AdminRidesPage').then((module) => ({ default: module.AdminRidesPage })))
const AdminRideDetailPage = lazy(() => import('../pages/AdminRideDetailPage').then((module) => ({ default: module.AdminRideDetailPage })))
const AdminPaymentsPage = lazy(() => import('../pages/AdminPaymentsPage').then((module) => ({ default: module.AdminPaymentsPage })))
const AdminPaymentDetailPage = lazy(() => import('../pages/AdminPaymentDetailPage').then((module) => ({ default: module.AdminPaymentDetailPage })))
const AdminClientsPage = lazy(() => import('../pages/AdminClientsPage').then((module) => ({ default: module.AdminClientsPage })))
const AdminCorporateDetailPage = lazy(() => import('../pages/AdminCorporateDetailPage').then((module) => ({ default: module.AdminCorporateDetailPage })))
import { ROUTE_PATHS } from './route-paths'
const AdminModulePage = lazy(() => import('../pages/AdminModulePage').then((module) => ({ default: module.AdminModulePage })))
const AdminSupportPage = lazy(() => import('../pages/AdminSupportPage').then((module) => ({ default: module.AdminSupportPage })))

export function AppRoutes() {
  return (
    <AdminLayout>
      <Suspense fallback={<div role="status">Loading page…</div>}>
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
      </Suspense>
    </AdminLayout>
  )
}
