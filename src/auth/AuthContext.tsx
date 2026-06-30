import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { initThoughtSpot } from '../thoughtspot/init'

/** The full raw user object from /api/rest/2.0/auth/session/user (every field). */
export type SessionUser = Record<string, unknown>

interface AuthState {
  username: string | null
  displayName: string | null
  profile: SessionUser | null
  host: string | null
  loading: boolean
  login: (username: string, password: string, host: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

interface SessionResponse {
  username: string | null
  displayName: string | null
  profile: SessionUser | null
  host: string | null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [profile, setProfile] = useState<SessionUser | null>(null)
  const [host, setHost] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Restore session on load (the HttpOnly cookie is sent automatically).
  useEffect(() => {
    fetch('/api/me')
      .then((r) => r.json())
      .then((d: SessionResponse) => {
        // Init the SDK only once we know a session exists, before any embed mounts.
        // Use the host the session was created with.
        if (d.username && d.host) initThoughtSpot(d.host)
        setUsername(d.username)
        setDisplayName(d.displayName)
        setProfile(d.profile)
        setHost(d.host)
      })
      .catch(() => setUsername(null))
      .finally(() => setLoading(false))
  }, [])

  async function login(user: string, password: string, loginHost: string) {
    const resp = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user, password, host: loginHost }),
    })
    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}))
      throw new Error(data.error ?? 'Login failed')
    }
    const data: SessionResponse = await resp.json()
    // Session now exists — init the SDK against the same host before embeds render.
    if (data.host) initThoughtSpot(data.host)
    setUsername(data.username)
    setDisplayName(data.displayName)
    setProfile(data.profile)
    setHost(data.host)
  }

  async function logout() {
    await fetch('/api/logout', { method: 'POST' }).catch(() => {})
    setUsername(null)
    setDisplayName(null)
    setProfile(null)
    setHost(null)
  }

  return (
    <AuthContext.Provider value={{ username, displayName, profile, host, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
