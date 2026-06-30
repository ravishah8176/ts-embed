import { useState, type CSSProperties } from 'react'
import './Login.scss'
import { useAuth } from '../auth/AuthContext'
import { embedConfig } from './config'

const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: 12.5,
  fontWeight: 600,
  color: '#3A4452',
  marginBottom: 6,
}

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
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* ── Brand panel ── */}
      <div
        style={{
          flex: 1.05,
          background: '#0E1116',
          color: '#fff',
          padding: '56px 60px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: 560,
            height: 560,
            right: -180,
            top: -200,
            background: 'radial-gradient(circle at center, rgba(43,91,244,.5), transparent 60%)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: 360,
            height: 360,
            left: -130,
            bottom: -150,
            background: 'radial-gradient(circle at center, rgba(124,92,252,.3), transparent 64%)',
            pointerEvents: 'none',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: 2 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 9,
              background: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#0E1116' }} />
          </div>
          <div style={{ fontWeight: 800, fontSize: 19, letterSpacing: '-.02em' }}>ThoughtSpot</div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '.12em',
              textTransform: 'uppercase',
              color: '#6b94ff',
              border: '1px solid rgba(43,91,244,.5)',
              padding: '3px 8px',
              borderRadius: 6,
            }}
          >
            Embed Studio
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 2, maxWidth: 470 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '.14em',
              textTransform: 'uppercase',
              color: '#5B6472',
              marginBottom: 22,
            }}
          >
            Visual Embed SDK
          </div>
          <h1 style={{ fontSize: 46, lineHeight: 1.05, fontWeight: 800, letterSpacing: '-.03em', margin: '0 0 20px' }}>
            Embed agentic
            <br />
            analytics into
            <br />
            your application.
          </h1>
          <p style={{ fontSize: 16, lineHeight: 1.55, color: '#9aa3b2', margin: '0 0 32px', maxWidth: 410 }}>
            Authenticate a cluster, embed the full app, a Liveboard, Search or Spotter — then trigger host events and
            watch every embed event stream live.
          </p>
        </div>

        <div style={{ position: 'relative', zIndex: 2, fontSize: 12.5, color: '#5B6472' }}>
          © 2026 ThoughtSpot, Inc. · Internal reference integration
        </div>
      </div>

      {/* ── Form panel ── */}
      <div
        style={{
          flex: 1,
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 40,
        }}
      >
        <form
          className="anim-fade"
          style={{ width: '100%', maxWidth: 412 }}
          onSubmit={(e) => {
            e.preventDefault()
            onConnect()
          }}
        >
          <h2 style={{ fontSize: 27, fontWeight: 800, letterSpacing: '-.02em', margin: '0 0 7px' }}>
            Sign in to your workspace
          </h2>
          <p style={{ fontSize: 14, color: '#5A6573', margin: '0 0 26px', lineHeight: 1.5 }}>
            Authenticate with <strong style={{ fontWeight: 600, color: '#0E1116' }}>Trusted Auth Token</strong>{' '}
            (cookieless). Tokens are fetched from your own backend.
          </p>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 11,
              background: '#F4F5F7',
              border: '1px solid #E4E7EC',
              borderRadius: 11,
              padding: '11px 13px',
              marginBottom: 20,
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: '#0E1116',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace" }}>
                TrustedAuthTokenCookieless
              </div>
              <div style={{ fontSize: 12, color: '#7A8694' }}>No third-party cookies required</div>
            </div>
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                color: '#12875A',
                background: '#E7F6EE',
                borderRadius: 6,
                padding: '3px 8px',
                flexShrink: 0,
              }}
            >
              RECOMMENDED
            </div>
          </div>

          <label style={labelStyle}>ThoughtSpot Host URL</label>
          <input
            className="ts-input"
            style={{ marginBottom: 15 }}
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="https://my-company.thoughtspot.cloud"
          />

          <label style={labelStyle}>Username</label>
          <input
            className="ts-input"
            style={{ marginBottom: 15 }}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="you@company.com"
            autoComplete="username"
          />

          <label style={labelStyle}>Password</label>
          <input
            className="ts-input"
            style={{ marginBottom: error ? 12 : 22 }}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
          />

          {error && (
            <div
              role="alert"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                color: '#C0392B',
                background: '#FDECEA',
                border: '1px solid #F1C9C4',
                borderRadius: 9,
                padding: '9px 12px',
                marginBottom: 18,
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#C0392B', flexShrink: 0 }} />
              {error}
            </div>
          )}

          <button
            type="submit"
            className="ts-btn-primary"
            style={{ width: '100%', fontSize: 15, padding: 13, boxShadow: '0 6px 18px rgba(43,91,244,.26)' }}
            disabled={connecting}
          >
            {connecting && (
              <span
                style={{
                  width: 15,
                  height: 15,
                  border: '2px solid rgba(255,255,255,.4)',
                  borderTopColor: '#fff',
                  borderRadius: '50%',
                  display: 'inline-block',
                  animation: 'tsSpin .7s linear infinite',
                }}
              />
            )}
            <span>{connecting ? 'Authenticating…' : 'Connect & launch embed'}</span>
          </button>
        </form>
      </div>
    </div>
  )
}
