import { useState } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { AppProviders } from './providers'
import { AppRoutes } from '../routes'
import { AdminLoginPage } from '../pages/AdminLoginPage'

export function App() {
  const [authenticated, setAuthenticated] = useState(() => {
    try { return sessionStorage.getItem('urbanride-admin-session') === 'authenticated' && Boolean(sessionStorage.getItem('urbanride-admin-token')) } catch { return false }
  })
  if (!authenticated) return <AdminLoginPage onLogin={() => setAuthenticated(true)} />
  return <AppProviders><BrowserRouter><AppRoutes /></BrowserRouter></AppProviders>
}
