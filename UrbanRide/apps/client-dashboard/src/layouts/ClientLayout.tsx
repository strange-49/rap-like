import { type ReactNode, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ClientNavigation } from '../components/ClientNavigation'
import './ClientLayout.css'

type Props = { children: ReactNode }
const pageNames: Record<string, string> = { '/': 'Overview', '/employees': 'Employees', '/rides': 'Rides', '/reports': 'Reports', '/settings': 'Settings' }
export function ClientLayout({ children }: Props) {
  const location = useLocation(); const navigate = useNavigate()
  const [theme, setTheme] = useState<'light'|'dark'>(() => { try { return localStorage.getItem('urbanride_client_theme') === 'dark' ? 'dark' : 'light' } catch { return 'light' } })
  const [profileOpen, setProfileOpen] = useState(false)
  let companyName = 'Company workspace'; let adminName = 'Company admin'; let adminEmail = ''; let accountId = ''
  try { const raw = localStorage.getItem('urbanride_client_principal'); if (raw) { const p = JSON.parse(raw) as { tenant?: { tenantId?: string; name?: string }; tenantId?: string; username?: string; email?: string; fullName?: string; id?: string }; companyName = p.tenant?.name || p.tenant?.tenantId || p.tenantId || companyName; adminName = p.fullName || p.username || adminName; adminEmail = p.email || (p.username?.includes('@') ? p.username : ''); accountId = p.id || '' } } catch {}
  useEffect(() => { document.documentElement.dataset.theme = theme; document.body.dataset.theme = theme; try { localStorage.setItem('urbanride_client_theme', theme) } catch {} }, [theme])
  useEffect(() => { const sync = (event: Event) => { const next = (event as CustomEvent<'light'|'dark'>).detail; if (next === 'light' || next === 'dark') setTheme(next) }; window.addEventListener('urbanride-theme-change', sync); return () => window.removeEventListener('urbanride-theme-change', sync) }, [])
  useEffect(() => { if (!profileOpen) return; const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setProfileOpen(false) }; const onPointerDown = (event: PointerEvent) => { if (event.target instanceof Element && !event.target.closest('.client-profile-menu-wrap')) setProfileOpen(false) }; document.addEventListener('keydown', onKeyDown); document.addEventListener('pointerdown', onPointerDown); return () => { document.removeEventListener('keydown', onKeyDown); document.removeEventListener('pointerdown', onPointerDown) } }, [profileOpen])
  const signOut = () => { try { for (const key of Object.keys(localStorage)) { if (key.startsWith('urbanride_client_')) localStorage.removeItem(key) } } catch {} setProfileOpen(false); navigate('/login', { replace: true }) }
  return <div className="client-layout" data-theme={theme}>
    <aside className="client-sidebar">
      <a className="client-brand" href="/" aria-label="UrbanRide overview"><span className="client-brand-mark client-brand-mark--animated">U</span><span>Urban<span>Ride</span><small>BUSINESS</small></span></a>
      <div className="client-sidebar-label">WORKSPACE</div><ClientNavigation />
      <div className="client-sidebar-spacer" />
      <div className="client-sidebar-help"><span className="client-help-icon">?</span><span><strong>Need a hand?</strong><small>Corporate workspace</small></span></div>
      <div className="client-sidebar-profile"><span className="client-profile-avatar">{adminName.slice(0,1).toUpperCase()}</span><span><strong>{adminName}</strong><small>{companyName}</small></span><button className="client-signout" onClick={signOut} title="Sign out" aria-label="Sign out">↪</button></div>
    </aside>
    <div className="client-content-shell">
      <header className="client-topbar"><div className="client-mobile-brand"><span className="client-brand-mark">U</span><strong>Urban<span>Ride</span></strong></div><div className="client-topbar-context"><span className="client-topbar-status"/><span>Company workspace</span><span className="client-topbar-separator">/</span><strong>{pageNames[location.pathname] || 'Workspace'}</strong></div><div className="client-topbar-actions"><span className="client-secure-label"><span>✓</span> Secure workspace</span><button className="client-theme-toggle" type="button" onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`} title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}><span>{theme === 'light' ? '☾' : '☀'}</span><span>{theme === 'light' ? 'Dark' : 'Light'}</span></button><div className="client-profile-menu-wrap"><button className="client-top-profile" type="button" aria-haspopup="menu" aria-expanded={profileOpen} onClick={() => setProfileOpen(v => !v)}><span className="client-profile-avatar">{adminName.slice(0,1).toUpperCase()}</span><span className="client-top-profile-copy"><strong>{adminName}</strong><small>Company admin</small></span><span aria-hidden="true">⌄</span></button>{profileOpen && <div className="client-profile-dropdown" role="menu" aria-label="Account menu">
  <div className="client-profile-dropdown-heading">
    <span className="client-profile-dropdown-avatar">{adminName.slice(0,1).toUpperCase()}</span>
    <span className="client-profile-dropdown-identity"><strong>{adminName}</strong><small>{adminEmail || 'Corporate administrator'}</small><span className="client-profile-role">COMPANY ADMIN</span></span>
  </div>
  <div className="client-profile-company"><span className="client-profile-company-icon">▦</span><span><small>ACTIVE WORKSPACE</small><strong>{companyName}</strong>{accountId && <small className="client-profile-account-id">Account · {accountId}</small>}</span></div>
  <div className="client-profile-menu-label">ACCOUNT</div>
  <button role="menuitem" onClick={() => { setProfileOpen(false); navigate('/settings') }}><span className="client-menu-item-icon">♙</span><span><strong>Profile & settings</strong><small>Manage your workspace</small></span><span className="client-menu-chevron">›</span></button>
  <button role="menuitem" onClick={() => { setProfileOpen(false); navigate('/settings#company-profile') }}><span className="client-menu-item-icon">▤</span><span><strong>Company profile</strong><small>Registered company details</small></span><span className="client-menu-chevron">›</span></button>
  <button role="menuitem" onClick={() => { setProfileOpen(false); navigate('/settings#account-security') }}><span className="client-menu-item-icon">♢</span><span><strong>Security</strong><small>Session and access information</small></span><span className="client-menu-chevron">›</span></button>
  <div className="client-profile-menu-divider" />
  <button role="menuitem" className="client-profile-logout" onClick={signOut}><span className="client-menu-item-icon">↪</span><span><strong>Sign out</strong><small>End this admin session</small></span></button>
</div>}</div></div></header>
      <main className="client-main">{children}</main><footer className="client-footer"><span>© {new Date().getFullYear()} UrbanRide</span><span>Corporate mobility, made simpler.</span></footer>
    </div>
  </div>
}
