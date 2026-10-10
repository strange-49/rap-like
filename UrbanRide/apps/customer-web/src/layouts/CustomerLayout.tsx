import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  clearSession,
  getDarkModePreference,
  getPrincipal,
} from '../services/auth'
import { ROUTE_PATHS } from '../routes/route-paths'

type CustomerLayoutProps = {
  children: ReactNode
}

export function CustomerLayout({
  children,
}: CustomerLayoutProps) {
  const navigate = useNavigate()
  const [principal, setPrincipal] = useState(getPrincipal)

  useEffect(() => {
    const refresh = () => setPrincipal(getPrincipal())
    window.addEventListener('urbanride:session-changed', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('urbanride:session-changed', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  useEffect(() => {
    const applyTheme = () => {
      if (principal) {
        document.documentElement.dataset.theme = getDarkModePreference(principal.subjectId) ? 'dark' : 'light'
      } else {
        document.documentElement.dataset.theme = 'light'
      }
    }
    applyTheme()
    window.addEventListener('urbanride:dark-mode-changed', applyTheme)
    window.addEventListener('storage', applyTheme)
    return () => {
      window.removeEventListener('urbanride:dark-mode-changed', applyTheme)
      window.removeEventListener('storage', applyTheme)
    }
  }, [principal])

  function handleLogout() {
    clearSession()
    navigate(ROUTE_PATHS.login, { replace: true })
  }

  return (
    <div className="customer-app">
      <header className="customer-header">
        <h1 className="customer-brand">UrbanRide</h1>

        {principal && (
          <div className="customer-header-actions">
            <Link className="customer-header-link" to={ROUTE_PATHS.settings}>Settings</Link>
            <details className="profile-menu">
              <summary className="customer-header-link">Profile</summary>
              <div className="profile-menu-content">
                <p><strong>Account</strong></p>
                <p>Role: {principal.role}</p>
                <p className="profile-id">Customer ID: {principal.subjectId}</p>
                <button type="button" onClick={handleLogout}>Logout</button>
              </div>
            </details>
          </div>
        )}
      </header>

      <main className="customer-main">{children}</main>
    </div>
  )
}
