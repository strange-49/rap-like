import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  getCurrentSession,
  getDarkModePreference,
  getPrincipal,
  setDarkModePreference,
  updateRideStartOtpPreference,
} from '../services/auth'
import { ROUTE_PATHS } from '../routes/route-paths'
import { UrbanRideLogo } from '../components/UrbanRideLogo'

type SettingsSection = 'overview' | 'profile' | 'preferences' | 'payments' | 'saved' | 'notifications' | 'security' | 'safety' | 'app' | 'support'

const settingsSections: { id: SettingsSection; icon: string; title: string; description: string }[] = [
  { id: 'overview', icon: '▦', title: 'Account overview', description: 'Your UrbanRide account at a glance' },
  { id: 'profile', icon: '♙', title: 'Personal details', description: 'Your display name and account' },
  { id: 'preferences', icon: '☷', title: 'Ride preferences', description: 'Safety and ride options' },
  { id: 'payments', icon: '▣', title: 'Payment methods', description: 'Payments and receipts' },
  { id: 'saved', icon: '⌖', title: 'Saved places', description: 'Home, work and favourites' },
  { id: 'notifications', icon: '♧', title: 'Notifications', description: 'Ride updates and alerts' },
  { id: 'security', icon: '◇', title: 'Privacy & security', description: 'Account access and privacy' },
  { id: 'safety', icon: '⬡', title: 'Safety settings', description: 'Ride safety preferences' },
  { id: 'app', icon: '⚙', title: 'App preferences', description: 'Theme and display options' },
  { id: 'support', icon: '?', title: 'Help & support', description: 'Get help with UrbanRide' },
]


type PersonalProfile = {
  firstName: string
  lastName: string
  email: string
  phone: string
  dateOfBirth: string
  gender: string
}

const emptyPersonalProfile: PersonalProfile = {
  firstName: '', lastName: '', email: '', phone: '', dateOfBirth: '', gender: '',
}

export function SettingsPage() {
  const principal = getPrincipal()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedSection = (searchParams.get('section') ?? 'overview') as SettingsSection
  const activeSection: SettingsSection = settingsSections.some((item) => item.id === requestedSection) ? requestedSection : 'overview'
  const savedDisplayName = principal ? window.localStorage.getItem(`urbanride:customer-name:${principal.subjectId}`) || 'Name not added' : 'Unavailable'
  const profileStorageKey = principal ? `urbanride:personal-profile:${principal.subjectId}` : 'urbanride:personal-profile:guest'
  const [profile, setProfile] = useState<PersonalProfile>(() => {
    try {
      const stored = window.localStorage.getItem(profileStorageKey)
      return stored ? { ...emptyPersonalProfile, ...JSON.parse(stored) as Partial<PersonalProfile> } : emptyPersonalProfile
    } catch { return emptyPersonalProfile }
  })
  const [profileSaved, setProfileSaved] = useState(false)

  const [rideStartOtpEnabled, setRideStartOtpEnabled] = useState<boolean | null>(null)
  const [loadingPreference, setLoadingPreference] = useState(true)
  const [savingOtp, setSavingOtp] = useState(false)
  const [error, setError] = useState('')
  const [themeDark, setThemeDark] = useState(() => principal ? getDarkModePreference(principal.subjectId) : document.documentElement.dataset.theme !== 'light')

  useEffect(() => {
    let active = true
    void getCurrentSession().then((session) => {
      if (active) setRideStartOtpEnabled(session.preferences?.rideStartOtpEnabled ?? false)
    }).catch((loadError) => {
      if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load your settings.')
    }).finally(() => { if (active) setLoadingPreference(false) })
    return () => { active = false }
  }, [])


  function selectSection(section: SettingsSection) {
    setSearchParams(section === 'overview' ? {} : { section })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function toggleRideStartOtp(enabled: boolean) {
    if (savingOtp) return
    setSavingOtp(true); setError('')
    try { setRideStartOtpEnabled(await updateRideStartOtpPreference(enabled)) }
    catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'Unable to save this preference.') }
    finally { setSavingOtp(false) }
  }

  function changeTheme(dark: boolean) {
    setThemeDark(dark)
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    window.localStorage.setItem('urbanride:theme', dark ? 'dark' : 'light')
    if (principal) setDarkModePreference(principal.subjectId, dark)
  }



  return (
    <div className="settings-page">
      <div className="settings-dashboard-layout">
      <aside className="settings-sidebar" aria-label="Settings navigation">
        <div className="settings-sidebar-label">SETTINGS</div>
        <nav className="settings-section-nav" aria-label="Settings sections">
          {settingsSections.map((section) => (
            <button key={section.id} type="button" className={`settings-section-tab${activeSection === section.id ? ' is-active' : ''}`} onClick={() => selectSection(section.id)} aria-current={activeSection === section.id ? 'page' : undefined}>
              <span className="settings-tab-icon" aria-hidden="true">{section.icon}</span>
              <span className="settings-tab-copy"><strong>{section.title}</strong></span>
            </button>
          ))}
        </nav>
      </aside>
      <main className="settings-content">
      <header className="settings-page-header">
        <div className="settings-heading-copy">
          <span className="section-eyebrow">URBANRIDE ACCOUNT</span>
          <h1>Settings</h1>
          <p>Manage your account, preferences and ride experience.</p>
        </div>
      </header>

      {activeSection === 'overview' && <>
        <section className="settings-overview-card settings-profile-overview">
          <div className="settings-card-title-row"><div><span className="settings-card-kicker">YOUR PROFILE</span><h2>Profile overview</h2><p>Your basic account information and ride activity.</p></div><button className="secondary-button" type="button" onClick={() => selectSection('profile')}>✎ Edit profile</button></div>
          <div className="settings-profile-overview-body"><div className="settings-user-avatar settings-avatar-animated" role="img" aria-label="Generic profile avatar"><svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="17" r="8" /><path d="M9 41c1.5-8.5 6.8-13 15-13s13.5 4.5 15 13" /></svg></div><div className="settings-user-summary"><strong>{savedDisplayName}</strong><span>{principal?.role ?? 'Customer'}</span><small>UrbanRide customer account</small></div><div className="settings-account-reference"><span>Account reference</span><strong>{principal?.subjectId ?? 'Unavailable'}</strong><small>For support requests only</small></div></div>
        </section>
        <section className="settings-overview-card settings-contact-card">
          <div className="settings-card-title-row"><div><h2>Contact information</h2><p>Your registered contact details.</p></div><span className="settings-feature-icon" aria-hidden="true">✉</span></div>
          <div className="settings-contact-grid">
            <div className="settings-contact-item"><span className="settings-contact-icon" aria-hidden="true">☎</span><div><strong>Phone number</strong><small>Not available from the current customer API</small></div><span className="settings-status-muted">Not provided</span></div>
            <div className="settings-contact-item"><span className="settings-contact-icon" aria-hidden="true">✉</span><div><strong>Email address</strong><small>Not available from the current customer API</small></div><span className="settings-status-muted">Not provided</span></div>
          </div>
        </section>
        <section className="settings-overview-card settings-quick-actions-card">
          <div className="settings-card-title-row"><div><h2>Quick actions</h2><p>Common account actions.</p></div></div>
          <div className="settings-quick-actions settings-quick-actions-grid">
            <button type="button" onClick={() => selectSection('security')}><span aria-hidden="true">♙</span><span><strong>Change password</strong><small>Update your password</small></span><b>›</b></button>
            <button type="button" onClick={() => selectSection('security')}><span aria-hidden="true">▣</span><span><strong>Manage devices</strong><small>View active sessions</small></span><b>›</b></button>
            <button type="button" onClick={() => selectSection('security')}><span aria-hidden="true">⇩</span><span><strong>Download data</strong><small>Request a copy of your data</small></span><b>›</b></button>
            <button type="button" onClick={() => selectSection('security')}><span aria-hidden="true">▤</span><span><strong>Delete account</strong><small>Review account deletion options</small></span><b>›</b></button>
          </div>
          <p className="settings-note">These actions open the security section, where we explain which operations are currently supported by the customer API.</p>
        </section>
      </>}

      {activeSection === 'profile' && <section className="settings-overview-card settings-detail-panel">
        <div className="settings-card-title-row"><div><span className="settings-card-kicker">YOUR PROFILE</span><h2>Personal details</h2><p>Manage your personal information and account identifiers.</p></div><div className="settings-user-avatar settings-avatar-animated settings-avatar-small" role="img" aria-label="Generic profile avatar"><svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="17" r="8" /><path d="M9 41c1.5-8.5 6.8-13 15-13s13.5 4.5 15 13" /></svg></div></div>
        <form className="settings-personal-form" onSubmit={(event) => { event.preventDefault(); window.localStorage.setItem(profileStorageKey, JSON.stringify(profile)); setProfileSaved(true) }}>
          <div className="settings-personal-field"><label htmlFor="profile-username">Username / display name</label><input id="profile-username" value={savedDisplayName === 'Name not added' ? '' : savedDisplayName} readOnly placeholder="Your registered username" /><small>Managed by your current UrbanRide sign-in.</small></div>
          <div className="settings-personal-field"><label htmlFor="profile-role">Account type</label><input id="profile-role" value={principal?.role ?? 'Customer'} readOnly /></div>
          <div className="settings-personal-field"><label htmlFor="profile-first-name">First name</label><input id="profile-first-name" autoComplete="given-name" value={profile.firstName} onChange={(event) => { setProfile({ ...profile, firstName: event.target.value }); setProfileSaved(false) }} placeholder="Enter first name" /></div>
          <div className="settings-personal-field"><label htmlFor="profile-last-name">Last name</label><input id="profile-last-name" autoComplete="family-name" value={profile.lastName} onChange={(event) => { setProfile({ ...profile, lastName: event.target.value }); setProfileSaved(false) }} placeholder="Enter last name" /></div>
          <div className="settings-personal-field"><label htmlFor="profile-email">Email address</label><input id="profile-email" type="email" autoComplete="email" value={profile.email} onChange={(event) => { setProfile({ ...profile, email: event.target.value }); setProfileSaved(false) }} placeholder="you@example.com" /></div>
          <div className="settings-personal-field"><label htmlFor="profile-phone">Mobile number</label><input id="profile-phone" type="tel" autoComplete="tel" value={profile.phone} onChange={(event) => { setProfile({ ...profile, phone: event.target.value }); setProfileSaved(false) }} placeholder="Enter mobile number" /></div>
          <div className="settings-personal-field"><label htmlFor="profile-dob">Date of birth</label><input id="profile-dob" type="date" autoComplete="bday" value={profile.dateOfBirth} onChange={(event) => { setProfile({ ...profile, dateOfBirth: event.target.value }); setProfileSaved(false) }} /></div>
          <div className="settings-personal-field"><label htmlFor="profile-gender">Gender (optional)</label><select id="profile-gender" value={profile.gender} onChange={(event) => { setProfile({ ...profile, gender: event.target.value }); setProfileSaved(false) }}><option value="">Prefer not to say</option><option value="woman">Woman</option><option value="man">Man</option><option value="nonbinary">Non-binary</option><option value="self-described">Self-describe later</option></select></div>
          <div className="settings-personal-field settings-personal-field-wide"><label htmlFor="profile-account-id">Customer ID / account reference</label><input id="profile-account-id" value={principal?.subjectId ?? ''} readOnly placeholder="Unavailable" /><small>Keep this reference for support requests. Do not share it publicly.</small></div>
          <div className="settings-personal-form-footer"><p className="settings-note">These profile fields are saved locally in this browser for now. They are not yet synced to the UrbanRide backend; backend profile support can be connected later.</p><button className="secondary-button" type="submit">Save personal details</button></div>
          {profileSaved && <p className="settings-profile-saved" role="status">Personal details saved in this browser.</p>}
        </form>
      </section>}

      {activeSection === 'preferences' && <section className="settings-overview-card settings-detail-panel"><div className="settings-card-title-row"><div><span className="settings-card-kicker">RIDE EXPERIENCE</span><h2>Ride preferences</h2><p>Configure available safety and trip preferences.</p></div><span className="settings-feature-icon">☷</span></div><div className="settings-inline-setting"><div><strong>Ride-start OTP</strong><small>Require a one-time code before the ride can start.</small></div><label className="toggle-control"><span>{rideStartOtpEnabled === null ? 'Loading' : rideStartOtpEnabled ? 'On' : 'Off'}</span><input type="checkbox" role="switch" aria-label="Ride-start OTP" checked={rideStartOtpEnabled ?? false} disabled={loadingPreference || savingOtp || rideStartOtpEnabled === null} onChange={(event) => void toggleRideStartOtp(event.target.checked)} /></label></div>{loadingPreference && <p className="settings-note" role="status">Loading your saved preference…</p>}{savingOtp && <p className="settings-note" role="status">Saving preference…</p>}</section>}

      {activeSection === 'app' && <section className="settings-overview-card settings-detail-panel"><div className="settings-card-title-row"><div><span className="settings-card-kicker">DISPLAY</span><h2>App preferences</h2><p>Choose the appearance that works best for you.</p></div><span className="settings-feature-icon">☼</span></div><div className="settings-inline-setting"><div><strong>Appearance</strong><small>Your choice applies across the customer app.</small></div><div className="settings-theme-options"><button type="button" className={!themeDark ? 'is-selected' : ''} aria-pressed={!themeDark} onClick={() => changeTheme(false)}>☀ Light</button><button type="button" className={themeDark ? 'is-selected' : ''} aria-pressed={themeDark} onClick={() => changeTheme(true)}>☾ Dark</button></div></div><p className="settings-note">Language and distance-unit controls will be added when those preferences are supported throughout the app.</p></section>}

      {activeSection === 'payments' && <SettingsDestination title="Payment methods" description="Review payment options and receipts." icon="▣" message="Payment records are available through the existing Payments section. Saved payment methods and billing preferences are not exposed as editable settings in the current customer API." actionLabel="Open payments" to={ROUTE_PATHS.payments} />}
      {activeSection === 'saved' && <SettingsDestination title="Saved places" description="Manage places you use frequently." icon="⌖" message="Saved home and work addresses should be stored against your customer account. The current customer API does not yet expose saved-place management from Settings." actionLabel="Open saved places" to={ROUTE_PATHS.savedPlaces} />}
      {activeSection === 'notifications' && <SettingsDestination title="Notifications" description="Ride updates and account alerts." icon="♧" message="Ride updates are shown by the existing app flows. Persistent per-channel notification preferences are not currently exposed by the customer API, so no non-persistent toggles are shown here." actionLabel="View notifications" to={ROUTE_PATHS.notifications} />}
      {activeSection === 'security' && <SettingsDestination title="Privacy & security" description="Understand the security options available for your account." icon="◇" message="The current customer API does not expose password changes, multi-factor authentication, or device-session management. These actions need backend support before they can be safely enabled." />}
      {activeSection === 'safety' && <SettingsDestination title="Safety settings" description="Safety information for your trips." icon="⬡" message="Ride-start OTP is the safety preference currently available and can be managed in Ride Preferences. Emergency-contact storage and safety-preference APIs are not exposed in the current customer API." actionLabel="Manage ride preferences" onAction={() => selectSection('preferences')} />}
      {activeSection === 'support' && <SettingsDestination title="Help & support" description="Get help with an UrbanRide issue." icon="?" message="For ride-specific issues, use the existing My Rides / ride history destination. A dedicated in-app support ticket API is not currently exposed, so this page does not show a non-functional ticket form." actionLabel="Open home" to={ROUTE_PATHS.home} />}

      {error && <p className="inline-notice error-message" role="alert">{error}</p>}

      <footer className="settings-page-footer"><UrbanRideLogo tagline markSize={34} /><span className="settings-footer-meta">Your account · Your preferences</span></footer>
      </main>
      </div>
    </div>
  )
}

function SettingsDestination({ title, description, icon, message, actionLabel, to, onAction }: { title: string; description: string; icon: string; message: string; actionLabel?: string; to?: string; onAction?: () => void }) {
  return <section className="settings-overview-card settings-detail-panel"><div className="settings-card-title-row"><div><span className="settings-card-kicker">SETTINGS</span><h2>{title}</h2><p>{description}</p></div><span className="settings-feature-icon">{icon}</span></div><div className="settings-destination-message"><span className="settings-destination-mark">i</span><p>{message}</p></div>{actionLabel && (to ? <Link className="secondary-button settings-destination-action" to={to}>{actionLabel} →</Link> : <button className="secondary-button settings-destination-action" type="button" onClick={onAction}>{actionLabel} →</button>)}</section>
}
