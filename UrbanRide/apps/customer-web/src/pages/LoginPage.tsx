import { useMemo, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { login, signup } from '../services/auth'
import { ROUTE_PATHS } from '../routes/route-paths'
import { UrbanRideLogo } from '../components/UrbanRideLogo'

type AuthMode = 'login' | 'signup'

export function LoginPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const mode: AuthMode = location.pathname === ROUTE_PATHS.signup ? 'signup' : 'login'
  const isSignup = mode === 'signup'
  const [identifier, setIdentifier] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [countryCode, setCountryCode] = useState('+91')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleNotice, setGoogleNotice] = useState(false)
  const [forgotNotice, setForgotNotice] = useState(false)

  const passwordStrength = useMemo(() => {
    if (!password) return { label: 'Create a strong password', score: 0 }
    let score = 0
    if (password.length >= 8) score++
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
    if (/\d/.test(password)) score++
    if (/[^A-Za-z0-9]/.test(password)) score++
    return { label: score >= 3 ? 'Strong password' : score === 2 ? 'Good password' : 'Use 8+ characters for better security', score }
  }, [password])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setError('')
    setGoogleNotice(false)
    setForgotNotice(false)

    if (isSignup) {
      if (fullName.trim().length < 2) { setError('Enter your full name.'); return }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier.trim())) { setError('Enter a valid email address.'); return }
      if (password !== confirmPassword) { setError('Your passwords do not match.'); return }
      if (password.length < 8) { setError('Use at least 8 characters for your password.'); return }
      if (!termsAccepted) { setError('Please accept the Terms of Service and Privacy Policy to continue.'); return }
      if (!/^[0-9 ()-]{7,15}$/.test(phone.trim()) || phone.replace(/\D/g, '').length < 7) { setError('Enter a valid phone number.'); return }
    }

    setLoading(true)
    try {
      // The current development API accepts username + password only.
      // Email is the login identifier; full name is retained for the current UI.
      const session = isSignup
        ? await signup(identifier.trim().toLowerCase(), password)
        : await login(identifier.trim(), password)

      if (isSignup) {
        window.localStorage.setItem(`urbanride:customer-name:${session.principal.subjectId}`, fullName.trim())
        // The country code is captured for the planned profile API; it is not sent because the current endpoint does not accept it.
        void countryCode
        // Contact details are collected here, but the current backend signup contract
        // does not persist full name or phone yet. Do not claim they were server-synced.
      }
      window.dispatchEvent(new Event('urbanride:session-changed'))
      setMessage(isSignup ? 'Your account was created. Welcome to UrbanRide!' : `Welcome back, ${identifier.trim()}.`)
      setPassword('')
      setConfirmPassword('')
      navigate(ROUTE_PATHS.home, { replace: true })
    } catch (authenticationError) {
      setError(authenticationError instanceof Error ? authenticationError.message : 'Authentication failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className={`auth-page auth-page-${mode}`}>
      <div className="auth-backdrop" aria-hidden="true" />
      <div className="auth-shell">
        <header className="auth-brand-header"><Link to={ROUTE_PATHS.login} aria-label="UrbanRide home"><UrbanRideLogo tagline markSize={58} /></Link></header>
        <section className="auth-card" aria-labelledby="auth-title">
          <div className="auth-card-heading">
            <span className="auth-eyebrow">{isSignup ? 'YOUR CITY. YOUR RIDE.' : 'WELCOME BACK TO URBANRIDE'}</span>
            <h1 id="auth-title">{isSignup ? 'Create your account' : 'Welcome back'}</h1>
            <p>{isSignup ? 'Join UrbanRide and start riding today' : 'Sign in to continue to UrbanRide'}</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {isSignup && <label className="auth-field"><span className="auth-field-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c.5-4.2 3.2-6.4 8-6.4s7.5 2.2 8 6.4"/></svg></span><span className="auth-field-copy"><span>Full name</span><input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="e.g. Karthik Kumar" autoComplete="name" minLength={2} required /></span></label>}
            <label className="auth-field"><span className="auth-field-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg></span><span className="auth-field-copy"><span>{isSignup ? 'Email address' : 'Username or phone number'}</span><input type={isSignup ? 'email' : 'text'} value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder={isSignup ? 'e.g. you@example.com' : 'Enter your username or phone number'} autoComplete={isSignup ? 'email' : 'username'} required /></span></label>
            {isSignup && <label className="auth-field"><span className="auth-field-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6.5 3h3l1.5 4-2 1.5a15 15 0 0 0 6.5 6.5l1.5-2 4 1.5v3c0 1.1-.9 2-2 2C10.2 21 3 13.8 3 5c0-1.1.9-2 2-2Z"/></svg></span><span className="auth-field-copy"><span>Phone number</span><span className="auth-phone-control"><select aria-label="Country calling code" value={countryCode} onChange={e => setCountryCode(e.target.value)}><option value="+91">🇮🇳 +91</option><option value="+1">🇺🇸 +1</option><option value="+44">🇬🇧 +44</option><option value="+61">🇦🇺 +61</option></select><input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Enter your phone number" autoComplete="tel" required /></span></span></label>}
            <label className="auth-field"><span className="auth-field-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg></span><span className="auth-field-copy"><span>Password</span><span className="auth-password-control"><input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder={isSignup ? 'Create a strong password' : 'Enter your password'} autoComplete={isSignup ? 'new-password' : 'current-password'} minLength={isSignup ? 8 : 1} required /><button type="button" className="auth-visibility" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'}><svg viewBox="0 0 24 24"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg></button></span>{isSignup && <small className={`auth-strength strength-${passwordStrength.score}`}>{passwordStrength.label}</small>}</span></label>
            {isSignup && <label className="auth-field"><span className="auth-field-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg></span><span className="auth-field-copy"><span>Confirm password</span><span className="auth-password-control"><input type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter your password" autoComplete="new-password" required /><button type="button" className="auth-visibility" onClick={() => setShowConfirmPassword(v => !v)} aria-label={showConfirmPassword ? 'Hide confirmation password' : 'Show confirmation password'}><svg viewBox="0 0 24 24"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg></button></span></span></label>}

            {!isSignup && <div className="auth-form-options"><label className="auth-checkbox"><input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} /><span className="auth-checkmark" />Remember me</label><button type="button" className="auth-text-button" onClick={() => setForgotNotice(true)}>Forgot password?</button></div>}
            {isSignup && <label className="auth-checkbox auth-terms"><input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} /><span className="auth-checkmark" /><span>I agree to the <a href="#terms" onClick={e => { e.preventDefault(); setMessage('Terms of Service will be available when the legal pages are connected.') }}>Terms of Service</a> and <a href="#privacy" onClick={e => { e.preventDefault(); setMessage('Privacy Policy will be available when the legal pages are connected.') }}>Privacy Policy</a></span></label>}

            {error && <div className="auth-alert auth-alert-error" role="alert">{error}</div>}
            {message && <div className="auth-alert" role="status">{message}</div>}
            {googleNotice && <div className="auth-alert" role="status">Google sign-in is not configured for the current UrbanRide backend yet.</div>}
            {forgotNotice && <div className="auth-alert" role="status">Password recovery is not exposed by the current backend yet. Contact support once that workflow is configured.</div>}
            <button className="auth-submit" type="submit" disabled={loading}>{loading ? <><span className="auth-spinner" />{isSignup ? 'Creating account…' : 'Signing in…'}</> : <>{isSignup ? 'Create account' : 'Sign in'} <span aria-hidden="true">→</span></>}</button>
          </form>

          <div className="auth-divider"><span />OR<span /></div>
          <button className="auth-google-button" type="button" onClick={() => setGoogleNotice(true)}><svg className="auth-google-mark" aria-hidden="true" viewBox="0 0 48 48"><path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.8 6.1-15Z"/><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.6-5.1c-1.8 1.2-4 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20 20 0 0 0 24 44Z"/><path fill="#FBBC05" d="M12.6 27.6a12 12 0 0 1 0-7.2v-5.3H5.8a20 20 0 0 0 0 17.8l6.8-5.3Z"/><path fill="#EA4335" d="M24 12c3 0 5.7 1 7.8 3.1l5.8-5.8C34.1 6.1 29.5 4 24 4A20 20 0 0 0 5.8 15.1l6.8 5.3C14.2 15.6 18.7 12 24 12Z"/></svg>Continue with Google</button>
          <p className="auth-switch-copy">{isSignup ? 'Already have an account?' : "Don't have an account?"} <Link to={isSignup ? ROUTE_PATHS.login : ROUTE_PATHS.signup}>{isSignup ? 'Sign in' : 'Sign up'}</Link></p>
        </section>
        {!isSignup && <div className="auth-benefits"><div><span aria-hidden="true">◇</span><strong>Safe &amp; secure</strong><small>Your data is protected</small></div><div><span aria-hidden="true">ϟ</span><strong>Quick &amp; easy</strong><small>Book a ride in seconds</small></div><div><span aria-hidden="true">⌖</span><strong>Reliable rides</strong><small>Anytime, anywhere</small></div></div>}
        <p className="auth-footnote">By continuing, you agree to use UrbanRide responsibly and keep your account secure.</p>
      </div>
    </main>
  )
}
