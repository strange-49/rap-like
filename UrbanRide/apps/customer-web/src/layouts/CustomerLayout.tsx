
import { useEffect, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  clearSession,
  getPrincipal,
  getDarkModePreference,
  setDarkModePreference,
} from '../services/auth'
import { ROUTE_PATHS } from '../routes/route-paths'
import { UrbanRideLogo } from '../components/UrbanRideLogo'

type CustomerLayoutProps = {
  children: ReactNode
}

export function CustomerLayout({ children }: CustomerLayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [principal, setPrincipal] = useState(getPrincipal)
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [profileGender, setProfileGender] = useState<'male' | 'female'>('male')
  const [displayName, setDisplayName] = useState('')

  useEffect(() => {
    const refresh = () => {
      const nextPrincipal = getPrincipal()
      setPrincipal(nextPrincipal)
      setDisplayName(
        nextPrincipal
          ? window.localStorage.getItem(`urbanride:customer-name:${nextPrincipal.subjectId}`) || 'Profile'
          : '',
      )
    }

    const refreshTheme = () => {
      const current = getPrincipal()
      const dark = current ? getDarkModePreference(current.subjectId) : window.localStorage.getItem('urbanride:theme') === 'dark'
      setIsDarkMode(dark)
      document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    }
    window.addEventListener('urbanride:session-changed', refresh)
    window.addEventListener('storage', refresh)
    window.addEventListener('urbanride:dark-mode-changed', refreshTheme)

    return () => {
      window.removeEventListener('urbanride:session-changed', refresh)
      window.removeEventListener('storage', refresh)
      window.removeEventListener('urbanride:dark-mode-changed', refreshTheme)
    }
  }, [])

  useEffect(() => {
    const currentPrincipal = getPrincipal()
    const savedTheme = window.localStorage.getItem('urbanride:theme')
    const dark = currentPrincipal ? getDarkModePreference(currentPrincipal.subjectId) : savedTheme !== 'light'
    setIsDarkMode(dark)
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    const savedGender = window.localStorage.getItem('urbanride:profile-gender')
    setProfileGender(savedGender === 'female' ? 'female' : 'male')
    setDisplayName(
      currentPrincipal
        ? window.localStorage.getItem(`urbanride:customer-name:${currentPrincipal.subjectId}`) || 'Profile'
        : '',
    )
  }, [])

  function toggleTheme() {
    const nextDark = !isDarkMode
    setIsDarkMode(nextDark)
    document.documentElement.dataset.theme = nextDark ? 'dark' : 'light'
    window.localStorage.setItem('urbanride:theme', nextDark ? 'dark' : 'light')
    if (principal) setDarkModePreference(principal.subjectId, nextDark)
  }

  useEffect(() => {
    setMenuOpen(false)
    setProfileOpen(false)
  }, [location.pathname, location.search])

  useEffect(() => {
    if (!menuOpen) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [menuOpen])

  function handleLogout() {
    setMenuOpen(false)
    clearSession()
    navigate(ROUTE_PATHS.login, { replace: true })
  }

  const onHome = location.pathname === ROUTE_PATHS.home
  const onSettings = location.pathname === ROUTE_PATHS.settings
  const onMyRides = location.pathname === ROUTE_PATHS.myRides
  const onBooking = location.pathname === ROUTE_PATHS.booking
  function openPayments() {
    setMenuOpen(false)
    setProfileOpen(false)
    navigate(ROUTE_PATHS.payments)
  }

  function openSettings(section = 'preferences') {
    setMenuOpen(false)
    setProfileOpen(false)
    navigate(`${ROUTE_PATHS.settings}?section=${encodeURIComponent(section)}`)
  }

  return (
    <div className={`customer-app${principal ? ' has-principal' : ''}${onBooking ? ' is-booking' : ''}${onSettings ? ' is-settings' : ''}${onMyRides ? ' is-my-rides' : ''}`}>
      {principal && !onBooking && (
        <aside className="customer-sidebar" aria-label="Primary navigation">
          <Link className="sidebar-brand" to={ROUTE_PATHS.home} aria-label="UrbanRide home"><UrbanRideLogo markSize={30} /></Link>
          <nav className="sidebar-nav">
            <Link className={`sidebar-link ${onHome ? 'is-active' : ''}`} to={ROUTE_PATHS.home}><span aria-hidden="true">⌂</span><strong>Home</strong></Link>
            <Link className={`sidebar-link ${onMyRides ? 'is-active' : ''}`} to={ROUTE_PATHS.myRides}><span aria-hidden="true">◷</span><strong>My rides</strong></Link>
            <button className="sidebar-link" type="button" onClick={openPayments}><span aria-hidden="true">▣</span><strong>Payments</strong></button>
            <Link className={`sidebar-link ${onSettings ? 'is-active' : ''}`} to={ROUTE_PATHS.settings}><span aria-hidden="true">⚙</span><strong>Settings</strong></Link>
          </nav>
          <button className="sidebar-support" type="button" onClick={() => navigate(ROUTE_PATHS.settings)}>
            <span aria-hidden="true">◉</span><span><strong>Need Help?</strong><small>Support & preferences</small></span><span aria-hidden="true">›</span>
          </button>
        </aside>
      )}

      <header className="customer-header">
        <div className="header-brand-group">
          {principal && (
            <button
              className="menu-trigger"
              type="button"
              aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={menuOpen}
              aria-controls="customer-navigation"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span />
              <span />
              <span />
            </button>
          )}

          <Link className="customer-brand" to={ROUTE_PATHS.home} aria-label="UrbanRide home"><UrbanRideLogo markSize={38} /></Link>
        </div>

        {principal && (
          <div className="customer-header-actions">
            <button className="theme-quick-toggle" type="button" onClick={toggleTheme} aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`} title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}>
              <span aria-hidden="true">☀</span><span className="theme-toggle-track"><i className={isDarkMode ? 'is-dark' : 'is-light'} /></span><span aria-hidden="true">☾</span>
            </button>
            <div className={`profile-menu${profileOpen ? ' is-open' : ''}`}>
              <button className="customer-header-link" type="button" aria-expanded={profileOpen} aria-haspopup="true" onClick={() => setProfileOpen((open) => !open)}>
                <span className={`profile-avatar profile-avatar-${profileGender}`} aria-hidden="true">{profileGender === 'female' ? '👩🏻' : '👨🏻'}</span>
                <span className="profile-greeting">Hi, {displayName || 'there'}</span>
                <span className="profile-caret" aria-hidden="true">⌄</span>
              </button>
              {profileOpen && (
                <div className="profile-menu-content" role="menu" aria-label="Your profile">
                  <div className="profile-menu-identity">
                    <span className={`profile-avatar profile-avatar-large profile-avatar-${profileGender}`} aria-hidden="true">{profileGender === 'female' ? '👩🏻' : '👨🏻'}</span>
                    <span><strong>{displayName || 'Your profile'}</strong><small>Customer</small></span>
                  </div>
                  <div className="profile-menu-actions">
                    <button type="button" role="menuitem" onClick={() => openSettings('profile')}><span aria-hidden="true">♙</span><span>Personal details</span><b>›</b></button>
                    <button type="button" role="menuitem" onClick={() => openSettings('preferences')}><span aria-hidden="true">☷</span><span>Ride preferences</span><b>›</b></button>
                    <button type="button" role="menuitem" onClick={() => openSettings('security')}><span aria-hidden="true">♙</span><span>Account &amp; security</span><b>›</b></button>
                  </div>
                  <button className="profile-manage-button" type="button" onClick={() => openSettings('profile')}><span aria-hidden="true">♙</span> Manage profile</button>
                  <button className="profile-logout-button" type="button" onClick={handleLogout}><span aria-hidden="true">⇥</span> Log out</button>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {principal && menuOpen && (
        <button
          className="navigation-backdrop"
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {principal && (
        <aside
          id="customer-navigation"
          className={`navigation-drawer ${menuOpen ? 'is-open' : ''}`}
          aria-label="Main navigation"
          aria-hidden={!menuOpen}
          inert={!menuOpen}
        >
          <div className="drawer-heading">
            <div>
              <span className="section-eyebrow">YOUR ACCOUNT</span>
              <h2>Navigate</h2>
            </div>
            <button
              className="icon-button"
              type="button"
              aria-label="Close navigation"
              onClick={() => setMenuOpen(false)}
            >
              ×
            </button>
          </div>

          <nav className="drawer-nav" aria-label="Customer sections">
            <Link className={`drawer-link ${onHome ? 'is-active' : ''}`} to={ROUTE_PATHS.home} aria-current={onHome ? 'page' : undefined}>
              <span className="drawer-link-icon" aria-hidden="true">⌂</span><span><strong>Home</strong><small>Book and manage rides</small></span><span className="drawer-chevron" aria-hidden="true">›</span>
            </Link>
            <Link className={`drawer-link ${onMyRides ? 'is-active' : ''}`} to={ROUTE_PATHS.myRides} onClick={() => setMenuOpen(false)} aria-current={onMyRides ? 'page' : undefined}>
              <span className="drawer-link-icon" aria-hidden="true">◷</span><span><strong>My rides</strong><small>Upcoming and past trips</small></span><span className="drawer-chevron" aria-hidden="true">›</span>
            </Link>
            <Link className="drawer-link" to={ROUTE_PATHS.savedPlaces} onClick={() => setMenuOpen(false)}>
              <span className="drawer-link-icon" aria-hidden="true">♧</span><span><strong>Saved places</strong><small>Home, work and favourites</small></span><span className="drawer-chevron" aria-hidden="true">›</span>
            </Link>
            <Link className="drawer-link" to={ROUTE_PATHS.payments} onClick={() => setMenuOpen(false)}>
              <span className="drawer-link-icon" aria-hidden="true">▤</span><span><strong>Payments</strong><small>Payment methods and receipts</small></span><span className="drawer-chevron" aria-hidden="true">›</span>
            </Link>
            <Link className="drawer-link" to={ROUTE_PATHS.notifications} onClick={() => setMenuOpen(false)}>
              <span className="drawer-link-icon" aria-hidden="true">♧</span><span><strong>Notifications</strong><small>Ride updates and alerts</small></span><span className="drawer-chevron" aria-hidden="true">›</span>
            </Link>
            <Link className="drawer-link" to={ROUTE_PATHS.safety} onClick={() => setMenuOpen(false)}>
              <span className="drawer-link-icon" aria-hidden="true">◇</span><span><strong>Safety centre</strong><small>Trip safety and emergency info</small></span><span className="drawer-chevron" aria-hidden="true">›</span>
            </Link>
                <button className={`drawer-link ${onSettings ? 'is-active' : ''}`} type="button" onClick={() => openSettings()}>
                <span className="drawer-link-icon" aria-hidden="true">⚙</span><span><strong>Settings</strong><small>Preferences and account</small></span><span className="drawer-chevron" aria-hidden="true">›</span>
            </button>
            <Link className="drawer-link" to={ROUTE_PATHS.help} onClick={() => setMenuOpen(false)}>
              <span className="drawer-link-icon" aria-hidden="true">?</span><span><strong>Help &amp; support</strong><small>FAQs and contact support</small></span><span className="drawer-chevron" aria-hidden="true">›</span>
            </Link>
          </nav>

          <div className="drawer-footer"><UrbanRideLogo tagline markSize={32} /></div>
        </aside>
      )}

      <main className="customer-main">{children}</main>
    </div>
  )
}
