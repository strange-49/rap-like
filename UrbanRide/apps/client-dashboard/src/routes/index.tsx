import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { ClientLayout } from '../layouts/ClientLayout'
const ClientDashboardPage = lazy(() => import('../pages/ClientDashboardPage').then((module) => ({ default: module.ClientDashboardPage })))
const CompanyRegistrationPage = lazy(() => import('../pages/CompanyRegistrationPage').then((module) => ({ default: module.CompanyRegistrationPage })))
const EmployeesPage = lazy(() => import('../pages/EmployeesPage').then((module) => ({ default: module.EmployeesPage })))
const LoginPage = lazy(() => import('../pages/LoginPage').then((module) => ({ default: module.LoginPage })))
const RidesPage = lazy(() => import('../pages/RidesPage').then((module) => ({ default: module.RidesPage })))
const ReportsPage = lazy(() => import('../pages/ReportsPage').then((module) => ({ default: module.ReportsPage })))
const SettingsPage = lazy(() => import('../pages/SettingsPage').then((module) => ({ default: module.SettingsPage })))
import { isClientAuthenticated } from '../services/auth'
import { ROUTE_PATHS } from './route-paths'
function ProtectedRoutes(){if(!isClientAuthenticated())return <Navigate to="/login" replace/>;return <ClientLayout><Routes><Route path={ROUTE_PATHS.dashboard} element={<ClientDashboardPage/>}/><Route path={ROUTE_PATHS.employees} element={<EmployeesPage/>}/><Route path={ROUTE_PATHS.rides} element={<RidesPage/>}/><Route path={ROUTE_PATHS.reports} element={<ReportsPage/>}/><Route path={ROUTE_PATHS.settings} element={<SettingsPage/>}/><Route path="*" element={<Navigate to={ROUTE_PATHS.dashboard} replace/>}/></Routes></ClientLayout>}
export function AppRoutes(){return <Suspense fallback={<div role="status">Loading page…</div>}><Routes><Route path="/login" element={<LoginPage/>}/><Route path="/register-company" element={<CompanyRegistrationPage/>}/><Route path="*" element={<ProtectedRoutes/>}/></Routes></Suspense>}
