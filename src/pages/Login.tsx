import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import './Login.css'

export default function Login() {
  const { username, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const from = (location.state as { from?: Location })?.from?.pathname ?? '/'

  // Already signed in — bounce to where they were headed.
  if (username) {
    return <Navigate to={from} replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(user, pass)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login">
      {/* ── Brand panel ── */}
      <aside className="login-brand" aria-hidden="true">
        <div className="login-brand-grid" />
        <div className="login-brand-glow" />

        <div className="login-brand-top">
          <span className="login-logo">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
              <path d="M12 12L18.5 18.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <circle cx="12" cy="12" r="3" fill="currentColor" />
            </svg>
            ThoughtSpot
          </span>
        </div>

        <div className="login-brand-body">
          <h2 className="login-brand-headline">
            Insights, <em>embedded</em> where decisions happen.
          </h2>
          <p className="login-brand-sub">
            Spotter AI and live analytics, delivered inside your application.
          </p>

          <ul className="login-brand-stats">
            <li>
              <strong>Spotter</strong>
              <span>Conversational AI analytics</span>
            </li>
            <li>
              <strong>Full App</strong>
              <span>The complete ThoughtSpot experience</span>
            </li>
          </ul>
        </div>

        <div className="login-brand-foot">Trusted, cookieless authentication</div>
      </aside>

      {/* ── Form panel ── */}
      <main className="login-main">
        <form className="login-form" onSubmit={handleSubmit}>
          <header className="login-form-head">
            <h1>Welcome back</h1>
            <p>Sign in with your ThoughtSpot credentials to continue.</p>
          </header>

          <label className="login-field">
            <span className="login-label">Username</span>
            <input
              className="login-input"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              autoComplete="username"
              placeholder="you@company.com"
              autoFocus
              required
            />
          </label>

          <label className="login-field">
            <span className="login-label">Password</span>
            <div className="login-input-wrap">
              <input
                className="login-input"
                type={showPass ? 'text' : 'password'}
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                className="login-reveal"
                onClick={() => setShowPass((s) => !s)}
                aria-label={showPass ? 'Hide password' : 'Show password'}
              >
                {showPass ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>

          {error && (
            <div className="login-error" role="alert">
              <span className="login-error-dot" />
              {error}
            </div>
          )}

          <button type="submit" className="login-submit" disabled={submitting}>
            {submitting ? (
              <>
                <span className="login-spinner" />
                Signing in…
              </>
            ) : (
              'Sign in'
            )}
          </button>

          <p className="login-foot">
            Protected by ThoughtSpot trusted authentication
          </p>
        </form>
      </main>
    </div>
  )
}
