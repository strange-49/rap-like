import { useEffect, useState, type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { HomePage } from '../pages/HomePage'
import { LoginPage } from '../pages/LoginPage'
import { SettingsPage } from '../pages/SettingsPage'
import {
  clearSession,
  getCurrentSession,
  getToken,
} from '../services/auth'
import { CustomerLayout } from '../layouts/CustomerLayout'
import { ROUTE_PATHS } from './route-paths'

function ProtectedRoute({
  children,
}: {
  children: ReactNode
}) {
  const [checking, setChecking] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    let mounted = true

    async function validateSession() {
      const token = getToken()

      if (!token) {
        if (mounted) {
          setAuthenticated(false)
          setChecking(false)
        }

        return
      }

      try {
        await getCurrentSession()

        if (mounted) {
          setAuthenticated(true)
        }
      } catch {
        clearSession()

        if (mounted) {
          setAuthenticated(false)
        }
      } finally {
        if (mounted) {
          setChecking(false)
        }
      }
    }

    void validateSession()

    return () => {
      mounted = false
    }
  }, [])

  if (checking) {
    return <div>Checking authentication...</div>
  }

  if (!authenticated) {
    return <Navigate to={ROUTE_PATHS.login} replace />
  }

  return <>{children}</>
}

export function AppRoutes() {
  return (
    <CustomerLayout>
      <Routes>
        <Route
          path={ROUTE_PATHS.login}
          element={<LoginPage />}
        />

        <Route
          path={ROUTE_PATHS.home}
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />

        <Route
          path={ROUTE_PATHS.settings}
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="*"
          element={
            <Navigate
              to={ROUTE_PATHS.home}
              replace
            />
          }
        />
      </Routes>
    </CustomerLayout>
  )
}
