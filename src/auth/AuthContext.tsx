import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { initThoughtSpot } from '../thoughtspot/init'

interface AuthState {
  username: string | null
  displayName: string | null
  loading: boolean
  login: (username: string, password: string, host?: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Restore session on load (the HttpOnly cookie is sent automatically).
  useEffect(() => {
    fetch('/api/me')
      .then((r) => r.json())
      .then((d: { username: string | null; displayName: string | null }) => {
        // Init the SDK only once we know a session exists, before any embed mounts.
        if (d.username) initThoughtSpot()
        setUsername(d.username)
        setDisplayName(d.displayName)
      })
      .catch(() => setUsername(null))
      .finally(() => setLoading(false))
  }, [])

  async function login(user: string, password: string, host?: string) {
    const resp = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user, password }),
    })
    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}))
      throw new Error(data.error ?? 'Login failed')
    }
    const data: { username: string; displayName: string } = await resp.json()
    // Session now exists — safe to init the SDK before the app (and embeds) render.
    initThoughtSpot(host)
    setUsername(data.username)
    setDisplayName(data.displayName)
  }

  async function logout() {
    await fetch('/api/logout', { method: 'POST' }).catch(() => {})
    setUsername(null)
    setDisplayName(null)
  }

  return (
    <AuthContext.Provider value={{ username, displayName, loading, login, logout }}>
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
