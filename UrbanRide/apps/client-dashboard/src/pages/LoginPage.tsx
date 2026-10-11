import { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { loginClient } from '../services/auth'
import './AuthPages.css'

type Theme = 'light' | 'dark'
function readTheme(): Theme {
  try { return localStorage.getItem('urbanride_client_theme') === 'dark' ? 'dark' : 'light' } catch { return 'light' }
}
function Brand({ mobile = false }: { mobile?: boolean }) {
  return <a className={`ur-auth-brand${mobile ? ' ur-auth-mobile-brand' : ''}`} href="/login" aria-label="UrbanRide Business sign in"><span className="ur-auth-brand-mark">U</span><span className="ur-auth-brand-name">Urban<span>Ride</span><small>BUSINESS</small></span></a>
}
function Showcase() {
  return <section className="ur-auth-showcase"><Brand /><div className="ur-auth-showcase-content"><span className="ur-auth-eyebrow">UrbanRide Business</span><h1>Corporate rides, <em>simplified.</em></h1><p>Bring your company’s mobility into one clear workspace. Manage employees, follow ride activity and keep business travel organized.</p></div><div className="ur-auth-benefits">
      <div className="ur-auth-benefit"><span className="ur-auth-benefit-icon" aria-hidden="true">⌘</span><span><strong>One company workspace</strong><small>Keep employee mobility organized.</small></span></div>
      <div className="ur-auth-benefit"><span className="ur-auth-benefit-icon" aria-hidden="true">↗</span><span><strong>Clear ride visibility</strong><small>Follow activity and spending.</small></span></div>
      <div className="ur-auth-benefit"><span className="ur-auth-benefit-icon" aria-hidden="true">✓</span><span><strong>Built for teams</strong><small>Manage access in one place.</small></span></div>
    </div></section>
}
export function LoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [theme] = useState<Theme>(readTheme)
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.body.dataset.theme = theme
    try { localStorage.setItem('urbanride_client_theme', theme) } catch {}
    window.dispatchEvent(new CustomEvent('urbanride-theme-change', { detail: theme }))
  }, [theme])
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setLoading(true)
    try {
      await loginClient(username.trim(), password)
      // The existing auth service owns token/principal persistence; retain its established behavior.
      void remember
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in. Please try again.')
    } finally { setLoading(false) }
  }
  return <main className="ur-auth-page" data-theme={theme}>
    <Showcase />
    <section className="ur-auth-panel-wrap"><div className="ur-auth-panel-inner">
      <div className="ur-auth-panel-top"><Brand mobile /></div>
      <header className="ur-auth-heading"><h2>Welcome back</h2><p>Sign in to your company administrator account.</p></header>
      <form className="ur-auth-form" onSubmit={handleSubmit}>
        <label className="ur-auth-field"><span>Email or username</span><span className="ur-auth-input-wrap"><span className="ur-auth-input-icon" aria-hidden="true">♙</span><input value={username} onChange={event => setUsername(event.target.value)} autoComplete="username" placeholder="admin@yourcompany.com" required /></span></label>
        <label className="ur-auth-field"><span>Password</span><span className="ur-auth-input-wrap"><span className="ur-auth-input-icon" aria-hidden="true">♙</span><input type={showPassword ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" placeholder="Enter your password" required /><button className="ur-auth-password-toggle" type="button" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? 'Hide' : 'Show'}</button></span></label>
        <div className="ur-auth-form-row"><label className="ur-auth-check"><input type="checkbox" checked={remember} onChange={event => setRemember(event.target.checked)} /> Remember me</label><span>Use your company credentials</span></div>
        {error && <p className="ur-auth-error" role="alert">{error}</p>}
        <button className="ur-auth-submit" type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign in to workspace'} <span aria-hidden="true">→</span></button>
      </form>
      <div className="ur-auth-divider">New to UrbanRide Business?</div>
      <Link className="ur-auth-secondary" to="/register-company">＋ &nbsp; Register your company</Link>
      <p className="ur-auth-footnote">Secure access for company administrators. Employee corporate sign-in remains available through the customer app.</p>
    </div></section>
  </main>
}
