import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import '../styles.css'

type Props = { children: ReactNode }
const groups = [
  { label: 'WORKSPACE', items: [
    { to: '/', label: 'Overview', icon: '◫' },
    { to: '/customers', label: 'Customers', icon: '♙' },
    { to: '/riders', label: 'Riders', icon: '♧' },
    { to: '/rides', label: 'Ride operations', icon: '↗' },
    { to: '/payments', label: 'Payments', icon: '◈' },
    { to: '/clients', label: 'Corporate clients', icon: '▦' },
  ]},
  { label: 'OPERATIONS', items: [
    { to: '/support', label: 'Support & disputes', icon: '☏' },
    { to: '/fleet', label: 'Live fleet', icon: '⌖' },
    { to: '/analytics', label: 'Reports & analytics', icon: '▥' },
    { to: '/notifications', label: 'Notifications', icon: '♧' },
  ]},
  { label: 'ADMINISTRATION', items: [
    { to: '/admins', label: 'Admin & audit', icon: '♙' },
    { to: '/settings', label: 'Settings', icon: '⚙' },
  ]},
]
const titles: Record<string,string> = {'/':'Overview','/customers':'Customers','/riders':'Riders','/rides':'Ride operations','/payments':'Payments','/clients':'Corporate clients','/support':'Support & disputes','/fleet':'Live fleet','/analytics':'Reports & analytics','/notifications':'Notifications','/admins':'Admin & audit','/settings':'Settings','/rides/detail':'Ride details','/payments/detail':'Payment details','/clients/detail':'Corporate account'}
export function AdminLayout({ children }: Props) {
  const [dark, setDark] = useState(() => { try { return localStorage.getItem('urbanride-theme') === 'dark' } catch { return false } })
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const location = useLocation()
  const title = useMemo(() => titles[location.pathname] ?? 'Overview', [location.pathname])
  useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : 'light'; try { localStorage.setItem('urbanride-theme', dark ? 'dark' : 'light') } catch {} }, [dark])
  return <div className="app-shell">
    {mobileOpen && <button className="mobile-scrim" aria-label="Close menu" onClick={() => setMobileOpen(false)} />}
    <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
      <div className="brand"><div className="brand-mark">U<span>↗</span></div><div><strong>urbanride</strong><small>PLATFORM CONSOLE</small></div><button className="sidebar-close" onClick={() => setMobileOpen(false)}>×</button></div>
      <div className="workspace-switch"><div className="workspace-avatar">UR</div><div><strong>UrbanRide India</strong><small>Platform workspace</small></div><span className="chevron">⌄</span></div>
      <nav className="side-nav">{groups.map(group => <section className="nav-group" key={group.label}><p>{group.label}</p>{group.items.map(item => <NavLink key={item.to} end={item.to === '/'} to={item.to} onClick={() => setMobileOpen(false)} className={({isActive}) => `nav-item ${isActive || (item.to !== '/' && location.pathname.startsWith(item.to)) ? 'active' : ''}`}><span className="nav-icon">{item.icon}</span><span>{item.label}</span>{item.to === '/support' && <i className="nav-count">6</i>}</NavLink>)}</section>)}</nav>
      <div className="sidebar-bottom"><div className="system-status"><span className="status-dot"/><div><strong>All systems operational</strong><small>Updated just now</small></div></div><button className="profile-row profile-row-button" onClick={() => setProfileOpen(v => !v)} aria-expanded={profileOpen}><div className="profile-avatar">KA</div><div className="profile-info"><strong>Karthik</strong><small>Administrator</small></div><span className="profile-more">···</span></button></div>
    </aside>
    <div className="main-shell"><header className="topbar"><div className="topbar-left"><button className="mobile-menu icon-button" onClick={() => setMobileOpen(true)} aria-label="Open menu">☰</button><div className="breadcrumbs"><span>Platform</span><b>/</b><strong>{title}</strong></div></div><div className="top-actions"><div className="environment-pill"><span className="status-dot"/> Production</div><button className="icon-button theme-toggle" title="Toggle theme" onClick={() => setDark(v => !v)}>{dark ? '☼' : '☾'}</button><button className="icon-button notification-button" aria-label="Notifications" title="Notifications" onClick={() => setNotificationsOpen(v => !v)}>♧<i/></button><div className="top-divider"/><button className="top-user top-user-button" onClick={() => setProfileOpen(v => !v)} aria-expanded={profileOpen}><div className="profile-avatar">KA</div><span>Karthik</span><span className="chevron">⌄</span></button></div></header>
      {profileOpen && <div className="popover-backdrop" onClick={() => setProfileOpen(false)}><section className="profile-popover" onClick={e => e.stopPropagation()}><div className="profile-popover-head"><div className="profile-avatar profile-avatar-large">KA</div><div><strong>Karthik</strong><small>UrbanRide administrator</small></div></div><div className="profile-detail"><span>Username</span><strong>karthik</strong></div><div className="profile-detail"><span>Role</span><strong>Administrator</strong></div><button className="secondary-button profile-close" onClick={() => setProfileOpen(false)}>Close profile</button></section></div>} {notificationsOpen && <div className="popover-backdrop" onClick={() => setNotificationsOpen(false)}><section className="profile-popover notification-popover" onClick={e => e.stopPropagation()}><div className="profile-popover-head"><strong>Notifications</strong></div><p className="notification-empty">No new notifications are available from the backend.</p><button className="secondary-button profile-close" onClick={() => setNotificationsOpen(false)}>Close</button></section></div>}<main className="page-content">{children}<footer className="page-footer"><span>© 2026 UrbanRide Technologies</span><span><span className="status-dot"/> Platform status: Operational <b>·</b> v1.0.0</span></footer></main>
    </div>
  </div>
}
