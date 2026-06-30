import { useState } from 'react'
import './Login.scss'
import { useAuth } from '../auth/AuthContext'
import { embedConfig } from './config'

export default function Login() {
  const { login } = useAuth()
  const [host, setHost] = useState(embedConfig.host)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState('')

  async function onConnect() {
    if (connecting) return
    setError('')
    setConnecting(true)
    try {
      await login(username, password, host)
      // On success, <App> swaps to the Studio automatically.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not connect')
      setConnecting(false)
    }
  }

  return (
    <div className="login-root">
      {/* ── Brand panel ── */}
      <div className="login-brand">
        <div className="login-brand-glow-a" />
        <div className="login-brand-glow-b" />
        <div className="login-brand-header">
          <div className="login-logo-badge">
            <div className="login-logo-dot" />
          </div>
          <div className="login-logo-text">ThoughtSpot</div>
          <div className="login-logo-tag">
            Embed Studio
          </div>
        </div>

        <div className="login-hero">
          <div className="login-hero-eyebrow">
            Visual Embed SDK
          </div>
          <h1 className="login-hero-title">
            Embed agentic
            <br />
            analytics into
            <br />
            your application.
          </h1>
          <p className="login-hero-copy">
            Authenticate a cluster, embed the full app, a Liveboard, Search or Spotter — then trigger host events and
            watch every embed event stream live.
          </p>
        </div>

        <div className="login-footer">
          © 2026 ThoughtSpot, Inc. · Internal reference integration
        </div>
      </div>

      {/* ── Form panel ── */}
      <div className="login-form-panel">
        <form
          className="anim-fade login-form"
          onSubmit={(e) => {
            e.preventDefault()
            onConnect()
          }}
        >
          <h2 className="login-form-title">
            Sign in to your workspace
          </h2>
          <p className="login-form-subtitle">
            Authenticate with <strong className="login-strong">Trusted Auth Token</strong>{' '}
            (cookieless). Tokens are fetched from your own backend.
          </p>

          <div className="login-auth-card">
            <div className="login-auth-icon">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div className="login-auth-body">
              <div className="login-auth-method">
                TrustedAuthTokenCookieless
              </div>
              <div className="login-auth-note">No third-party cookies required</div>
            </div>
            <div className="login-auth-pill">
              RECOMMENDED
            </div>
          </div>

          <label className="login-label">ThoughtSpot Host URL</label>
          <input
            className="ts-input login-field"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="https://my-company.thoughtspot.cloud"
          />

          <label className="login-label">Username</label>
          <input
            className="ts-input login-field"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="you@company.com"
            autoComplete="username"
          />

          <label className="login-label">Password</label>
          <input
            className={'ts-input ' + (error ? 'login-field-tight' : 'login-field-loose')}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
          />

          {error && (
            <div role="alert" className="login-error">
              <span className="login-error-dot" />
              {error}
            </div>
          )}

          <button
            type="submit"
            className="ts-btn-primary login-submit"
            disabled={connecting}
          >
            {connecting && (
              <span className="login-spinner" />
            )}
            <span>{connecting ? 'Authenticating…' : 'Connect & launch embed'}</span>
          </button>
        </form>
      </div>
    </div>
  )
}
