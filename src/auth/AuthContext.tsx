import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { initThoughtSpot, type InitOptions } from '../thoughtspot/init'
import {
  AUTH_METHODS,
  DEFAULT_AUTH_METHOD,
  isAuthMethodId,
  type AuthMethodId,
  type RestAuthMode,
} from './authMethods'

/** The full raw user object from /api/rest/2.0/auth/session/user (every field). */
export type SessionUser = Record<string, unknown>

export interface LoginParams {
  method: AuthMethodId
  host: string
  username?: string
  password?: string
  inPopup?: boolean
  redirectPath?: string
}

interface AuthState {
  /** True once a session exists (or, for pass-through modes, once the SDK is armed). */
  signedIn: boolean
  method: AuthMethodId | null
  restAuthMode: RestAuthMode
  username: string | null
  displayName: string | null
  profile: SessionUser | null
  host: string | null
  loading: boolean
  login: (params: LoginParams) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

interface SessionResponse {
  username: string | null
  displayName: string | null
  profile: SessionUser | null
  host: string | null
}

/**
 * The chosen method + host, kept client-side.
 *
 * The HttpOnly cookie only exists for the two backend-token methods, and it does
 * not record *which* of them was used. The SSO and Basic methods have no server
 * state at all, yet still need to re-`init()` after a reload — and a full-page
 * SAML/OIDC redirect makes that reload mandatory. So the intent lives in
 * localStorage for every method. Never the password.
 */
const INTENT_KEY = 'ts_embed_auth_intent'

type AuthIntent = Omit<LoginParams, 'password'>

function readIntent(): AuthIntent | null {
  try {
    const raw = localStorage.getItem(INTENT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AuthIntent
    if (!isAuthMethodId(parsed.method) || !parsed.host) return null
    return parsed
  } catch {
    return null
  }
}

/**
 * Both accessors swallow their errors: in private mode, or with site data
 * disabled, the session still works for this page load — it just won't survive a
 * reload. There is nothing to recover from and nothing useful to tell the user.
 */
function writeIntent(intent: AuthIntent) {
  try {
    localStorage.setItem(INTENT_KEY, JSON.stringify(intent))
  } catch {
    /* empty */
  }
}

function clearIntent() {
  try {
    localStorage.removeItem(INTENT_KEY)
  } catch {
    /* empty */
  }
}

/**
 * Resolve the signed-in user straight from the cluster.
 *
 * Used by the methods that leave a ThoughtSpot session cookie in the browser
 * (Basic, SAMLRedirect, OIDCRedirect) — there is no server session of ours to ask.
 * Deliberately the same endpoint the dev backend calls, so `profile` has one shape
 * regardless of how the user signed in.
 *
 * This is a cross-origin request, so the cluster must allow this origin — the same
 * allowlist that permits embedding. Returns null when it doesn't.
 */
async function fetchClusterUser(host: string): Promise<SessionResponse | null> {
  try {
    const resp = await fetch(`${host}/api/rest/2.0/auth/session/user`, {
      credentials: 'include',
    })
    if (!resp.ok) return null
    const data = (await resp.json()) as SessionUser
    if (!data || typeof data !== 'object') return null
    const username = typeof data.name === 'string' ? data.name : ''
    const displayName =
      typeof data.display_name === 'string' && data.display_name ? data.display_name : username
    return { username, displayName, profile: data, host }
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [signedIn, setSignedIn] = useState(false)
  const [method, setMethod] = useState<AuthMethodId | null>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [profile, setProfile] = useState<SessionUser | null>(null)
  const [host, setHost] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  function applySession(m: AuthMethodId, s: SessionResponse | null, fallbackHost: string) {
    setMethod(m)
    setUsername(s?.username ?? null)
    setDisplayName(s?.displayName ?? null)
    setProfile(s?.profile ?? null)
    setHost(s?.host ?? fallbackHost)
    setSignedIn(true)
  }

  /**
   * Bring up the SDK for one method and resolve whatever identity that method can
   * offer. Shared by fresh logins and post-reload restores so both land in exactly
   * the same state.
   *
   * Three shapes, by method:
   *   • backend-token — our own backend owns the session, so it is minted before
   *     `init()`, whose very first act is to call `/api/token`.
   *   • SSO / Basic — the browser authenticates against the cluster directly, then
   *     the user is read back from it. On a full-page SAML/OIDC redirect the
   *     `initThoughtSpot` call never returns: the browser leaves for the IdP and
   *     comes back through the restore path instead.
   *   • None / EmbeddedSSO — the iframe does the authenticating, so no session is
   *     readable yet; arm the Studio and let the embed report its own failures.
   */
  const establish = useCallback(async (params: LoginParams): Promise<void> => {
    const spec = AUTH_METHODS[params.method]
    const initOpts: InitOptions = {
      host: params.host,
      method: params.method,
      username: params.username,
      password: params.password,
      inPopup: params.inPopup,
      redirectPath: params.redirectPath,
    }

    if (spec.usesBackendToken) {
      const resp = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: params.username,
          password: params.password,
          host: params.host,
        }),
      })
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? 'Login failed')
      }
      const session = (await resp.json()) as SessionResponse
      await initThoughtSpot({ ...initOpts, host: session.host ?? params.host })
      applySession(params.method, session, params.host)
      return
    }

    await initThoughtSpot(initOpts)

    if (!spec.resolvesIdentity) {
      applySession(params.method, null, params.host)
      return
    }

    const session = await fetchClusterUser(params.host)
    if (!session) {
      throw new Error(
        `Signed in with ${spec.label}, but the cluster user could not be read. ` +
          'Check that this origin is on the cluster CORS allowlist.',
      )
    }
    applySession(params.method, session, params.host)
  }, [])

  /**
   * Restore on load.
   *
   * The stored intent decides where the session lives; with none recorded we fall
   * back to the historical default and the server cookie. A full-page SAML/OIDC
   * round trip also lands here, and re-initializing lets the SDK finish that flow
   * off its redirect marker. Basic is the one method that cannot be restored: it
   * needs the password on every `init()` and we refuse to store one, so it always
   * drops back to the login form.
   */
  useEffect(() => {
    const intent = readIntent()
    let cancelled = false

    async function restore() {
      const m = intent?.method ?? DEFAULT_AUTH_METHOD
      const spec = AUTH_METHODS[m]

      if (spec.usesBackendToken) {
        const data = await fetch('/api/me')
          .then((r) => r.json() as Promise<SessionResponse>)
          .catch(() => null)
        if (cancelled) return
        if (!data?.username || !data.host) return
        await initThoughtSpot({ host: data.host, method: m, username: data.username })
        if (cancelled) return
        applySession(m, data, data.host)
        return
      }

      if (!intent) return

      if (spec.needsPassword) {
        clearIntent()
        return
      }

      try {
        await establish({ ...intent, password: undefined })
      } catch {
        if (!cancelled) clearIntent()
      }
    }

    restore().finally(() => {
      if (!cancelled) setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [establish])

  /**
   * Validate what the chosen method requires, then establish it.
   *
   * The intent is persisted *before* `establish`, because a full-page SSO redirect
   * never comes back to the line after it.
   */
  async function login(params: LoginParams) {
    const spec = AUTH_METHODS[params.method]
    if (!params.host) throw new Error('A ThoughtSpot host is required')
    if (spec.needsUsername && !params.username) throw new Error('A username is required')
    if (spec.needsPassword && !params.password) throw new Error('A password is required')

    writeIntent({
      method: params.method,
      host: params.host,
      username: params.username,
      inPopup: params.inPopup,
      redirectPath: params.redirectPath,
    })

    try {
      await establish(params)
    } catch (e) {
      clearIntent()
      throw e
    }
  }

  /**
   * Clear the session and reload.
   *
   * The reload is load-bearing: the SDK caches its config for the lifetime of the
   * page and every mounted embed reads it, so this is the only way to leave the
   * next login free to pick a different method or host.
   */
  async function logout() {
    clearIntent()
    await fetch('/api/logout', { method: 'POST' }).catch(() => {})
    window.location.replace('/')
  }

  return (
    <AuthContext.Provider
      value={{
        signedIn,
        method,
        restAuthMode: method ? AUTH_METHODS[method].restAuthMode : 'bearer',
        username,
        displayName,
        profile,
        host,
        loading,
        login,
        logout,
      }}
    >
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
