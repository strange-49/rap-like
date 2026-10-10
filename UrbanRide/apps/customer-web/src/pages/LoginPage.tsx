import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  login,
  signup,
} from '../services/auth'
import { ROUTE_PATHS } from '../routes/route-paths'

type AuthMode = 'login' | 'signup'

export function LoginPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<AuthMode>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setMessage('')
    setError('')
    setLoading(true)

    try {
      const session =
        mode === 'login'
          ? await login(username, password)
          : await signup(username, password)

      setMessage(`Signed in as ${session.principal.role}.`)
      setPassword('')
      navigate(ROUTE_PATHS.home, { replace: true })
    } catch (authenticationError) {
      setError(
        authenticationError instanceof Error
          ? authenticationError.message
          : 'Authentication failed.',
      )
    } finally {
      setLoading(false)
    }
  }

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode)
    setMessage('')
    setError('')
    setPassword('')
  }

  return (
    <main
      style={{
        maxWidth: '420px',
        margin: '80px auto',
        padding: '24px',
      }}
    >
      <h1>UrbanRide</h1>

      <h2>{mode === 'login' ? 'Login' : 'Create Account'}</h2>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="username">Username</label>

          <input
            id="username"
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
            autoComplete="username"
            style={{
              display: 'block',
              width: '100%',
              marginTop: '6px',
              padding: '10px',
            }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="password">Password</label>

          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={6}
            autoComplete={
              mode === 'login'
                ? 'current-password'
                : 'new-password'
            }
            style={{
              display: 'block',
              width: '100%',
              marginTop: '6px',
              padding: '10px',
            }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
          }}
        >
          {loading
            ? 'Please wait...'
            : mode === 'login'
              ? 'Login'
              : 'Create Account'}
        </button>
      </form>

      {message && (
        <p style={{ marginTop: '16px' }}>
          {message}
        </p>
      )}

      {error && (
        <p style={{ marginTop: '16px' }}>
          {error}
        </p>
      )}

      <div style={{ marginTop: '24px' }}>
        {mode === 'login' ? (
          <p>
            Don't have an account?{' '}
            <button
              type="button"
              onClick={() => switchMode('signup')}
            >
              Sign up
            </button>
          </p>
        ) : (
          <p>
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => switchMode('login')}
            >
              Login
            </button>
          </p>
        )}
      </div>
    </main>
  )
}
