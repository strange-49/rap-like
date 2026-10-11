import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import './AuthPages.css'

const API_BASE_URL = 'http://localhost:3000'
type Theme = 'light' | 'dark'
type RegistrationResponse = { account: { id: string; name: string; accessCode: string }; administrator: { username: string; email: string; fullName: string }; message: string }
function readTheme(): Theme { try { return localStorage.getItem('urbanride_client_theme') === 'dark' ? 'dark' : 'light' } catch { return 'light' } }
function Brand({ mobile = false }: { mobile?: boolean }) { return <a className={`ur-auth-brand${mobile ? ' ur-auth-mobile-brand' : ''}`} href="/register-company" aria-label="UrbanRide Business company registration"><span className="ur-auth-brand-mark">U</span><span className="ur-auth-brand-name">Urban<span>Ride</span><small>BUSINESS</small></span></a> }
function Showcase() { return <section className="ur-auth-showcase"><Brand /><div className="ur-auth-showcase-content"><span className="ur-auth-eyebrow">Get started in minutes</span><h1>Your company’s rides, <em>all in one place.</em></h1><p>Create your UrbanRide Business workspace, then invite employees and follow company ride activity from one dashboard.</p></div><div className="ur-auth-benefits"><div className="ur-auth-benefit"><span className="ur-auth-benefit-icon" aria-hidden="true">⌘</span><span><strong>Unique company access code</strong><small>Identify your company workspace.</small></span></div><div className="ur-auth-benefit"><span className="ur-auth-benefit-icon" aria-hidden="true">♙</span><span><strong>Employee management</strong><small>Invite your team when you’re ready.</small></span></div><div className="ur-auth-benefit"><span className="ur-auth-benefit-icon" aria-hidden="true">▥</span><span><strong>Ride reporting</strong><small>Review company usage and spending.</small></span></div></div></section> }
export function CompanyRegistrationPage() {
  const [companyName, setCompanyName] = useState('')
  const [billingEmail, setBillingEmail] = useState('')
  const [adminName, setAdminName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<RegistrationResponse | null>(null)
  const [theme] = useState<Theme>(readTheme)
  const [copied, setCopied] = useState(false)
  useEffect(() => { document.documentElement.dataset.theme = theme; document.body.dataset.theme = theme; try { localStorage.setItem('urbanride_client_theme', theme) } catch {}; window.dispatchEvent(new CustomEvent('urbanride-theme-change', { detail: theme })) }, [theme])
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setResult(null)
    if (password.length < 8) { setError('Use a password with at least 8 characters.'); return }
    if (password !== confirmPassword) { setError('The passwords do not match.'); return }
    setBusy(true)
    try {
      const response = await fetch(`${API_BASE_URL}/corporate/register`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ companyName: companyName.trim(), billingEmail: billingEmail.trim(), adminName: adminName.trim(), adminEmail: adminEmail.trim(), adminUsername: adminEmail.trim(), password }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error?.message ?? 'Company registration failed.')
      setResult(data as RegistrationResponse); setPassword(''); setConfirmPassword('')
    } catch (err) { setError(err instanceof Error ? err.message : 'Company registration failed.') } finally { setBusy(false) }
  }
  async function copyAccessCode() { if (!result?.account.accessCode) return; try { await navigator.clipboard.writeText(result.account.accessCode); setCopied(true); window.setTimeout(() => setCopied(false), 1800) } catch { setError('Clipboard access was blocked. Please select and copy the access code manually.') } }
  const strength = password.length >= 12 ? 100 : password.length >= 8 ? 70 : password.length >= 5 ? 40 : password.length ? 20 : 0
  return <main className="ur-auth-page ur-auth-registration" data-theme={theme}>
    <Showcase />
    <section className="ur-auth-panel-wrap"><div className="ur-auth-panel-inner">
      <div className="ur-auth-panel-top"><Brand mobile /></div>
      <header className="ur-auth-heading"><h2>Register your company</h2><p>Create your company workspace and its first administrator account.</p></header>
      <form className="ur-auth-form" onSubmit={submit}>
        <label className="ur-auth-field"><span>Company name</span><span className="ur-auth-input-wrap"><span className="ur-auth-input-icon" aria-hidden="true">▦</span><input required minLength={2} value={companyName} onChange={e => setCompanyName(e.target.value)} autoComplete="organization" placeholder="Your company name" /></span></label>
        <label className="ur-auth-field"><span>Company email</span><span className="ur-auth-input-wrap"><span className="ur-auth-input-icon" aria-hidden="true">✉</span><input required type="email" value={billingEmail} onChange={e => setBillingEmail(e.target.value)} autoComplete="email" placeholder="company@yourcompany.com" /></span></label>
        <label className="ur-auth-field"><span>Administrator full name</span><span className="ur-auth-input-wrap"><span className="ur-auth-input-icon" aria-hidden="true">♙</span><input required minLength={2} value={adminName} onChange={e => setAdminName(e.target.value)} autoComplete="name" placeholder="Your full name" /></span></label>
        <label className="ur-auth-field"><span>Administrator email / username</span><span className="ur-auth-input-wrap"><span className="ur-auth-input-icon" aria-hidden="true">✉</span><input required type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} autoComplete="username" placeholder="admin@yourcompany.com" /></span></label>
        <label className="ur-auth-field"><span>Password</span><span className="ur-auth-input-wrap"><span className="ur-auth-input-icon" aria-hidden="true">▣</span><input required minLength={8} type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" placeholder="Create a strong password" /><button className="ur-auth-password-toggle" type="button" onClick={() => setShowPassword(v => !v)}>{showPassword ? 'Hide' : 'Show'}</button></span><span className="ur-auth-password-strength" aria-label="Password length strength"><span style={{ width: `${strength}%` }} /></span><small style={{ color: 'var(--auth-muted)', fontSize: 10 }}>{password.length >= 12 ? 'Long password' : password.length >= 8 ? 'Good length — use a unique password' : 'Use at least 8 characters'}</small></label>
        <label className="ur-auth-field"><span>Confirm password</span><span className="ur-auth-input-wrap"><span className="ur-auth-input-icon" aria-hidden="true">▣</span><input required minLength={8} type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} autoComplete="new-password" placeholder="Confirm your password" /></span></label>
        {error && <p className="ur-auth-error" role="alert">{error}</p>}
        <button className="ur-auth-submit" type="submit" disabled={busy}>{busy ? 'Creating company…' : 'Create company account'} <span aria-hidden="true">→</span></button>
      </form>
      {result && <section className="ur-auth-success" role="status"><h3>Company registered successfully</h3><p><strong>Company:</strong> {result.account.name}</p><p><strong>Administrator:</strong> {result.administrator.username}</p><p>{result.message}</p><div className="ur-auth-access-code"><span><small style={{ display: 'block', color: 'var(--auth-muted)', fontSize: 10, marginBottom: 5 }}>Company access code</small><code>{result.account.accessCode}</code></span><button type="button" onClick={copyAccessCode}>{copied ? 'Copied ✓' : 'Copy code'}</button></div><p>Keep this code available for company access workflows.</p><Link className="ur-auth-link" to="/login">Continue to sign in →</Link></section>}
      <div className="ur-auth-divider">Already have a company account?</div><Link className="ur-auth-secondary" to="/login">Sign in to your workspace</Link>
      <p className="ur-auth-footnote">By creating an account, you confirm that you’re authorized to register this company.</p>
    </div></section>
  </main>
}
