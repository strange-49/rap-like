import { useEffect, useState } from 'react'
import {
  getCurrentSession,
  getDarkModePreference,
  getPrincipal,
  setDarkModePreference,
  updateRideStartOtpPreference,
} from '../services/auth'

export function SettingsPage() {
  const principal = getPrincipal()
  const [darkMode, setDarkMode] = useState(
    principal ? getDarkModePreference(principal.subjectId) : false,
  )
  const [rideStartOtpEnabled, setRideStartOtpEnabled] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingOtp, setSavingOtp] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    void getCurrentSession().then((session) => {
      if (active) setRideStartOtpEnabled(session.preferences?.rideStartOtpEnabled ?? false)
    }).catch((loadError) => {
      if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load settings.')
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [])

  function toggleDarkMode(enabled: boolean) {
    if (!principal) return
    setDarkMode(enabled)
    setDarkModePreference(principal.subjectId, enabled)
  }

  async function toggleRideStartOtp(enabled: boolean) {
    if (savingOtp) return
    setSavingOtp(true)
    setError('')
    try {
      setRideStartOtpEnabled(await updateRideStartOtpPreference(enabled))
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save settings.')
    } finally {
      setSavingOtp(false)
    }
  }

  return (
    <section className="settings-page">
      <h2>Settings</h2>

      <section className="settings-card" aria-labelledby="appearance-heading">
        <h3 id="appearance-heading">Appearance</h3>
        <div className="setting-row">
          <div>
            <strong>Dark Mode</strong>
            <p>Use a dark theme across Customer Web.</p>
          </div>
          <label className="toggle-control">
            <span>{darkMode ? 'On' : 'Off'}</span>
            <input
              type="checkbox"
              role="switch"
              aria-label="Dark Mode"
              checked={darkMode}
              onChange={(event) => toggleDarkMode(event.target.checked)}
            />
          </label>
        </div>
      </section>

      <section className="settings-card" aria-labelledby="ride-verification-heading">
        <h3 id="ride-verification-heading">Ride Verification</h3>
        <div className="setting-row">
          <div>
            <strong>Ride-start OTP</strong>
            <p>Require the rider to enter a one-time code before starting your rides.</p>
          </div>
          <label className="toggle-control">
            <span>{rideStartOtpEnabled ? 'On' : 'Off'}</span>
            <input
              type="checkbox"
              role="switch"
              aria-label="Ride-start OTP"
              checked={rideStartOtpEnabled ?? false}
              disabled={loading || savingOtp || rideStartOtpEnabled === null}
              onChange={(event) => void toggleRideStartOtp(event.target.checked)}
            />
          </label>
        </div>
        {loading && <p role="status">Loading saved preference…</p>}
        {savingOtp && <p role="status">Saving preference…</p>}
      </section>

      {error && <p className="form-error" role="alert">{error}</p>}
    </section>
  )
}
