import { Navigate, Route, Routes } from 'react-router-dom'
import { HomePage } from '../pages/HomePage'
import { LoginPage } from '../pages/LoginPage'
import { CustomerLayout } from '../layouts/CustomerLayout'
import { ROUTE_PATHS } from './route-paths'

export function AppRoutes() {
  return (
    <CustomerLayout>
      <Routes>
        <Route path={ROUTE_PATHS.home} element={<HomePage />} />
        <Route path={ROUTE_PATHS.login} element={<LoginPage />} />
        <Route path="*" element={<Navigate to={ROUTE_PATHS.home} replace />} />
      </Routes>
    </CustomerLayout>
  )
}