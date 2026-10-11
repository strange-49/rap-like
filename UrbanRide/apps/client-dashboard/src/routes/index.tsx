import { Navigate, Route, Routes } from 'react-router-dom'
import { ClientLayout } from '../layouts/ClientLayout'
import { ClientDashboardPage } from '../pages/ClientDashboardPage'
import { CompanyRegistrationPage } from '../pages/CompanyRegistrationPage'
import { EmployeesPage } from '../pages/EmployeesPage'
import { LoginPage } from '../pages/LoginPage'
import { RidesPage } from '../pages/RidesPage'
import { ReportsPage } from '../pages/ReportsPage'
import { SettingsPage } from '../pages/SettingsPage'
import { isClientAuthenticated } from '../services/auth'
import { ROUTE_PATHS } from './route-paths'
function ProtectedRoutes(){if(!isClientAuthenticated())return <Navigate to="/login" replace/>;return <ClientLayout><Routes><Route path={ROUTE_PATHS.dashboard} element={<ClientDashboardPage/>}/><Route path={ROUTE_PATHS.employees} element={<EmployeesPage/>}/><Route path={ROUTE_PATHS.rides} element={<RidesPage/>}/><Route path={ROUTE_PATHS.reports} element={<ReportsPage/>}/><Route path={ROUTE_PATHS.settings} element={<SettingsPage/>}/><Route path="*" element={<Navigate to={ROUTE_PATHS.dashboard} replace/>}/></Routes></ClientLayout>}
export function AppRoutes(){return <Routes><Route path="/login" element={<LoginPage/>}/><Route path="/register-company" element={<CompanyRegistrationPage/>}/><Route path="*" element={<ProtectedRoutes/>}/></Routes>}
