import { useState } from 'react'
import './Login.scss'
import Button from './Button'
import { useAuth } from '../auth/AuthContext'
import {
  AUTH_METHODS,
  AUTH_METHOD_LIST,
  DEFAULT_AUTH_METHOD,
  type AuthMethodId,
} from '../auth/authMethods'
import { SSO_TRIGGER_CONTAINER_ID } from '../thoughtspot/init'
import {
  SNAPSHOT_VERSIONS,
  displayVersion,
  setStoredSdkVersions,
  storedSdkVersions,
} from '../thoughtspot/sdkLoader'
import { embedConfig } from './config'

/**
 * Sign-in screen: pick one of the SDK's authentication methods, then a cluster.
 *
 * The method picker is a custom listbox rather than a native `<select>`, for two
 * reasons: its rows carry a blurb and a badge that an OS-drawn popup cannot
 * render, and that popup cannot be styled to match the Studio's surfaces. It
 * mirrors the dropdown in RestExplorer so the two read as one system.
 *
 * The trigger's layout is driven by the form's 412px width — label and badge share
 * a row while the blurb takes the full width beneath, which is the only way all
 * four elements fit. The raw `authType` value sits under the trigger for the same
 * reason: inline it collided with the badge.
 *
 * SDK versions are picked inside the Studio, not here — but the Visual Embed SDK is
 * fetched by this form's `init()`, so a stored version that cannot be loaded fails
 * at sign-in, where the Studio's picker is out of reach. That one case gets a
 * recovery button back to the snapshot version.
 */
export default function Login() {
  const { login } = useAuth()
  const [method, setMethod] = useState<AuthMethodId>(DEFAULT_AUTH_METHOD)
  const [host, setHost] = useState(embedConfig.host)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [inPopup, setInPopup] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState('')

  const spec = AUTH_METHODS[method]
  // A full-page SSO redirect leaves this page, so the button must say so.
  const willRedirect = spec.supportsPopup && !inPopup

  async function onConnect() {
    if (connecting) return
    setError('')
    setConnecting(true)
    try {
      await login({
        method,
        host,
        username: spec.needsUsername ? username : undefined,
        password: spec.needsPassword ? password : undefined,
        inPopup: spec.supportsPopup ? inPopup : undefined,
        redirectPath: spec.supportsPopup && !inPopup ? '/' : undefined,
      })
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
            Choose how to authenticate, then point the Studio at your cluster.
          </p>

          <label className="login-label" id="login-method-label">Authentication method</label>
          <div className="login-rel" onKeyDown={(e) => e.key === 'Escape' && setPickerOpen(false)}>
            <button
              type="button"
              className="login-select"
              aria-haspopup="listbox"
              aria-expanded={pickerOpen}
              aria-labelledby="login-method-label"
              disabled={connecting}
              onClick={() => setPickerOpen((o) => !o)}
            >
              <span className="login-select-icon">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--rd-sys-color-content-inverse)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <span className="login-grow">
                <span className="login-select-top">
                  <span className="login-select-label">{spec.label}</span>
                  {spec.badge && (
                    <span className={'login-auth-pill' + (spec.badgeTone === 'warn' ? ' login-auth-pill-warn' : '')}>
                      {spec.badge}
                    </span>
                  )}
                </span>
                <span className="login-select-sub">{spec.blurb}</span>
              </span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--rd-sys-color-content-tertiary)"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="login-chevron"
                style={{ transform: pickerOpen ? 'rotate(180deg)' : 'none' }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {pickerOpen && (
              <>
                <div className="login-overlay" onClick={() => setPickerOpen(false)} />
                <div className="login-dropdown anim-fade">
                  <div className="tss login-dropdown-list" role="listbox" aria-labelledby="login-method-label">
                    {AUTH_METHOD_LIST.map((m) => {
                      const selected = m.id === method
                      return (
                        <button
                          key={m.id}
                          type="button"
                          role="option"
                          aria-selected={selected}
                          className={'login-opt' + (selected ? ' selected' : '')}
                          onClick={() => {
                            setMethod(m.id)
                            setError('')
                            setPickerOpen(false)
                          }}
                        >
                          <span className="login-grow">
                            <span className="login-opt-label">
                              {m.label}
                              {m.badge && (
                                <span
                                  className={
                                    'login-opt-badge' +
                                    (m.badgeTone === 'warn' ? ' login-opt-badge-warn' : '')
                                  }
                                >
                                  {m.badge}
                                </span>
                              )}
                            </span>
                            <span className="login-opt-sub">{m.blurb}</span>
                          </span>
                          {selected && (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          <p className="login-method-note">
            <span className="login-method-wire">authType: {spec.wireValue}</span>
            {spec.note}
          </p>


          <label className="login-label" htmlFor="login-host">ThoughtSpot Host URL</label>
          <input
            id="login-host"
            className="ts-input login-field"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="https://my-company.thoughtspot.cloud"
          />

          {spec.needsUsername && (
            <>
              <label className="login-label" htmlFor="login-username">Username</label>
              <input
                id="login-username"
                className="ts-input login-field"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="you@company.com"
                autoComplete="username"
              />
            </>
          )}

          {spec.needsPassword && (
            <>
              <label className="login-label" htmlFor="login-password">Password</label>
              <input
                id="login-password"
                className={'ts-input ' + (error ? 'login-field-tight' : 'login-field-loose')}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </>
          )}

          {spec.supportsPopup && (
            <label className="login-check">
              <input
                type="checkbox"
                checked={inPopup}
                disabled={connecting}
                onChange={(e) => setInPopup(e.target.checked)}
              />
              <span>
                Open the IdP in a popup (<code className="login-code">inPopup</code>)
                <span className="login-check-hint">
                  {inPopup
                    ? 'This page stays put; the SDK adds a trigger button below.'
                    : 'This page redirects to the IdP and back.'}
                </span>
              </span>
            </label>
          )}

          {/* The SDK injects its popup-trigger button here when inPopup is on. */}
          <div id={SSO_TRIGGER_CONTAINER_ID} className="login-sso-trigger" />

          {error && (
            <div role="alert" className="login-error">
              <span className="login-error-dot" />
              {error}
              {storedSdkVersions().embed !== SNAPSHOT_VERSIONS.embed && (
                <button
                  type="button"
                  className="link-btn login-sdk-recover"
                  onClick={() => {
                    setStoredSdkVersions({ embed: SNAPSHOT_VERSIONS.embed })
                    setError('')
                    onConnect()
                  }}
                >
                  Retry with {displayVersion(SNAPSHOT_VERSIONS.embed)}
                </button>
              )}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="m"
            className="login-submit"
            disabled={connecting}
            icon={connecting ? <span className="login-spinner" /> : undefined}
          >
            {connecting
              ? willRedirect
                ? 'Redirecting to your IdP…'
                : 'Authenticating…'
              : 'Connect & launch embed'}
          </Button>
        </form>
      </div>
    </div>
  )
}
