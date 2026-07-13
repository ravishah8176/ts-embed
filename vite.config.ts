import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import type { IncomingMessage, ServerResponse } from 'node:http'

const AUTH_COOKIE = 'ts_app_auth'
const TOKEN_VALIDITY_SECS = 30000

/** The full raw user object as returned by the session-user endpoint. */
type SessionUser = Record<string, unknown>

/** What we stash in the HttpOnly cookie — a ThoughtSpot token + the host it's for.
 *  Deliberately NO password: credentials are used once at login, never stored. */
interface AuthCookie {
  token: string
  host: string
}

/**
 * Dev-only auth backend for cookieless trusted auth.
 *
 * Stateless: there is no server-side session store. At login we mint a
 * ThoughtSpot token and keep it (plus its host) in an HttpOnly cookie the
 * browser can't read from JS. Because nothing lives in process memory, the
 * session survives a dev-server restart and works across multiple LAN/tunnel
 * users. The password is used once to mint the token and is never persisted.
 *
 * - POST /api/login   { username, password, host } -> mints a token against the
 *                      given host, stores {token, host} in an HttpOnly cookie.
 * - GET  /api/token   -> returns the token from the cookie. Used by getAuthToken.
 * - GET  /api/me      -> derives the user from the cookie's token (calls TS) for
 *                        SPA restore; returns nulls once the token is gone/expired.
 * - POST /api/logout  -> clears the cookie.
 *
 * Trade-off: the session lasts only as long as the token (~TOKEN_VALIDITY_SECS);
 * after that the user logs in again. No password is stored to enable silent
 * refresh — that is the deliberate security choice.
 */
function thoughtSpotAuthEndpoints(): Plugin {
  async function mintToken(host: string, username: string, password: string) {
    try {
      const resp = await fetch(`${host}/api/rest/2.0/auth/token/full`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          validity_time_in_sec: TOKEN_VALIDITY_SECS,
        }),
      })
      const data = (await resp.json().catch(() => ({}))) as { token?: string }
      if (!resp.ok || !data.token) {
        return { ok: false as const, status: resp.status || 500, error: data }
      }
      return { ok: true as const, token: data.token }
    } catch (err) {
      // Bad host / connection refused / TLS error — don't crash the dev server.
      return { ok: false as const, status: 502, error: String(err) }
    }
  }

  // Resolve the current user from a token by calling the session-user endpoint.
  // Returns the FULL raw object (so the client can surface every field) plus the
  // login name and a display name. Returns null when the token is invalid/expired.
  async function fetchSessionUser(
    host: string,
    token: string,
  ): Promise<{ username: string; displayName: string; profile: SessionUser } | null> {
    try {
      const resp = await fetch(`${host}/api/rest/2.0/auth/session/user`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = (await resp.json().catch(() => ({}))) as SessionUser
      if (!resp.ok || !data || typeof data !== 'object') return null
      const username = typeof data.name === 'string' ? data.name : ''
      const displayName =
        typeof data.display_name === 'string' && data.display_name ? data.display_name : username
      return { username, displayName, profile: data }
    } catch {
      return null
    }
  }

  // Normalize a user-supplied host: must be http(s), no trailing slash.
  function normalizeHost(raw: unknown): string | null {
    if (typeof raw !== 'string') return null
    const h = raw.trim().replace(/\/+$/, '')
    if (!/^https?:\/\/.+/i.test(h)) return null
    return h
  }

  function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
    return new Promise((resolve) => {
      let body = ''
      req.on('data', (chunk) => (body += chunk))
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {})
        } catch {
          resolve({})
        }
      })
    })
  }

  function getCookie(req: IncomingMessage, name: string): string | undefined {
    const raw = req.headers.cookie ?? ''
    for (const part of raw.split(';')) {
      const idx = part.indexOf('=')
      if (idx === -1) continue
      if (part.slice(0, idx).trim() === name) {
        return decodeURIComponent(part.slice(idx + 1).trim())
      }
    }
    return undefined
  }

  // The cookie holds base64url(JSON({token, host})) — opaque to the browser.
  function encodeAuth(auth: AuthCookie): string {
    return Buffer.from(JSON.stringify(auth), 'utf8').toString('base64url')
  }

  function decodeAuth(req: IncomingMessage): AuthCookie | null {
    const raw = getCookie(req, AUTH_COOKIE)
    if (!raw) return null
    try {
      const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'))
      if (parsed && typeof parsed.token === 'string' && typeof parsed.host === 'string') {
        return parsed as AuthCookie
      }
      return null
    } catch {
      return null
    }
  }

  function setAuthCookie(res: ServerResponse, auth: AuthCookie) {
    res.setHeader(
      'Set-Cookie',
      `${AUTH_COOKIE}=${encodeAuth(auth)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${TOKEN_VALIDITY_SECS}`,
    )
  }

  function json(res: ServerResponse, status: number, payload: unknown) {
    res.statusCode = status
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(payload))
  }

  return {
    name: 'thoughtspot-auth-endpoints',
    configureServer(server) {
      // ThoughtSpot dev instance uses a self-signed cert; trust it for this dev process only.
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

      server.middlewares.use('/api/login', async (req, res) => {
        if (req.method !== 'POST') return json(res, 405, { error: 'method not allowed' })
        const body = await readJsonBody(req)
        const { username, password } = body
        const host = normalizeHost(body.host)
        if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
          return json(res, 400, { error: 'username and password are required' })
        }
        if (!host) {
          return json(res, 400, { error: 'A valid ThoughtSpot host URL (https://…) is required' })
        }
        const result = await mintToken(host, username, password)
        if (!result.ok) {
          return json(res, 401, { error: 'Invalid ThoughtSpot credentials or host' })
        }
        // Store only {token, host} in the cookie — the password is discarded here.
        setAuthCookie(res, { token: result.token, host })
        const user = await fetchSessionUser(host, result.token)
        return json(res, 200, {
          username: user?.username || username,
          displayName: user?.displayName || username,
          profile: user?.profile ?? {},
          host,
        })
      })

      server.middlewares.use('/api/token', (req, res) => {
        const auth = decodeAuth(req)
        if (!auth) {
          res.statusCode = 401
          return res.end('not authenticated')
        }
        res.setHeader('Content-Type', 'text/plain')
        res.end(auth.token)
      })

      server.middlewares.use('/api/me', async (req, res) => {
        const auth = decodeAuth(req)
        const user = auth ? await fetchSessionUser(auth.host, auth.token) : null
        // Token gone/expired -> report logged-out so the SPA shows the login screen.
        return json(res, 200, {
          username: user?.username ?? null,
          displayName: user?.displayName ?? null,
          profile: user?.profile ?? null,
          host: user ? auth?.host ?? null : null,
        })
      })

      server.middlewares.use('/api/logout', (_req, res) => {
        res.setHeader('Set-Cookie', `${AUTH_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`)
        return json(res, 200, { ok: true })
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), thoughtSpotAuthEndpoints()],
  server: {
    // Bind all interfaces so both localhost:3030 and the LAN IP work.
    host: true,
    port: 3030,
    // Accept requests for any Host header (e.g. tunnels, custom domains, LAN IPs).
    allowedHosts: true,
  },
})
