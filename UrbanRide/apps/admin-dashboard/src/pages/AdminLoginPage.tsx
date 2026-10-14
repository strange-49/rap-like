import { useState, type FormEvent } from 'react'

type Props = { onLogin: () => void }
export function AdminLoginPage({ onLogin }: Props) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setLoading(true)
    try {
      const response = await fetch('http://localhost:3000/auth/development/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: username.trim(), password }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error?.message || 'Sign-in failed.')
      if (data.principal?.role !== 'ADMIN' || typeof data.token !== 'string') throw new Error('This account does not have administrator permissions.')
      sessionStorage.setItem('urbanride-admin-token', data.token); sessionStorage.setItem('urbanride-admin-session', 'authenticated')
      onLogin()
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to sign in. Check the backend and credentials.') } finally { setLoading(false) }
  }
  return <main className="login-screen"><section className="login-visual"><div className="login-brand"><span className="login-mark">Uâ†—</span><span><strong>urbanride</strong><small>PLATFORM CONSOLE</small></span></div><div className="login-hero"><span className="login-kicker">ADMINISTRATOR ACCESS</span><h1>Your platform.<br/><em>Your command.</em></h1><p>Monitor rides, payments, riders and corporate operations from one control room.</p><div className="login-visual-card"><div className="visual-route"><span/><i/><span/></div><div><strong>UrbanRide Operations</strong><small>One connected platform</small></div><b className="visual-live"><i/> CONTROL CENTER</b></div></div><div className="login-visual-footer">URBANRIDE Â· PLATFORM OPERATIONS</div></section><section className="login-side"><form className="login-form" onSubmit={submit}><span className="login-mobile-mark">Uâ†—</span><p className="eyebrow">WELCOME BACK</p><h2>Sign in to Admin</h2><p className="login-subtitle">Enter your administrator credentials to continue.</p><label htmlFor="admin-username">Username</label><input id="admin-username" autoComplete="username" value={username} onChange={e=>setUsername(e.target.value)} placeholder="Enter username" required/><label htmlFor="admin-password">Password</label><div className="password-wrap"><input id="admin-password" autoComplete="current-password" type={showPassword?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter password" required/><button type="button" onClick={()=>setShowPassword(v=>!v)}>{showPassword?'Hide':'Show'}</button></div>{error&&<p className="login-error" role="alert">{error}</p>}<button className="login-submit" type="submit" disabled={loading}>{loading ? 'Signing inâ€¦' : 'Sign in'} <span>â†’</span></button><div className="login-security"><span>â–£</span><p><strong>Secure workspace</strong><small>Administrator access only</small></p></div><small className="login-footnote">Authenticated by the UrbanRide backend. Use an active ADMIN account.</small></form></section></main>
}
