import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  loginClient,
} from '../services/auth'

export function LoginPage() {
  const navigate = useNavigate()

  const [username, setUsername] =
    useState('')

  const [password, setPassword] =
    useState('')

  const [error, setError] =
    useState('')

  const [loading, setLoading] =
    useState(false)

  async function handleSubmit(
    event: FormEvent,
  ) {
    event.preventDefault()

    setError('')
    setLoading(true)

    try {
      await loginClient(
        username.trim(),
        password,
      )

      navigate('/dashboard', {
        replace: true,
      })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Login failed.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '24px',
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: '100%',
          maxWidth: '420px',
          display: 'grid',
          gap: '16px',
        }}
      >
        <div>
          <h1>UrbanRide</h1>
          <p>Client Dashboard</p>
        </div>

        <label>
          Username
          <input
            value={username}
            onChange={(event) =>
              setUsername(event.target.value)
            }
            autoComplete="username"
            required
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
            autoComplete="current-password"
            required
          />
        </label>

        {error && (
          <p role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
        >
          {loading
            ? 'Signing in...'
            : 'Sign in'}
        </button>
      </form>
    </main>
  )
}