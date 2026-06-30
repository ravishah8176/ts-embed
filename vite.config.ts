import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { randomUUID } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'

const SESSION_COOKIE = 'ts_app_session'
const TOKEN_VALIDITY_SECS = 30000

/** The full raw user object as returned by the session-user endpoint. */
type SessionUser = Record<string, unknown>

interface Session {
  username: string
  password: string
  host: string
  displayName: string
  profile: SessionUser
}

/**
 * Dev-only auth backend for cookieless trusted auth.
 *
 * - POST /api/login   { username, password, host } -> validates against the given
 *                      ThoughtSpot host, creates a first-party server session, sets
 *                      an HttpOnly cookie. The host comes from the login form.
 * - GET  /api/token   -> derives the user + host from the session (NEVER from the
 *                        browser) and mints a short-lived token. Used by getAuthToken.
 * - GET  /api/me      -> returns the logged-in username/host (or null) for SPA restore.
 * - POST /api/logout  -> clears the session.
 *
 * Credentials live only in this Node process — never in the browser bundle.
 */
function thoughtSpotAuthEndpoints(): Plugin {
  const sessions = new Map<string, Session>()

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

  // Look up the current session user and return the FULL raw object (so the
  // client can surface every available field) plus a convenience display name.
  // Falls back to username-only defaults on any failure.
  async function fetchUserProfile(
    host: string,
    token: string,
    username: string,
  ): Promise<{ displayName: string; profile: SessionUser }> {
    try {
      const resp = await fetch(`${host}/api/rest/2.0/auth/session/user`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = (await resp.json().catch(() => ({}))) as SessionUser
      if (!resp.ok || !data || typeof data !== 'object') {
        return { displayName: username, profile: {} }
      }
      const displayName =
        typeof data.display_name === 'string' && data.display_name ? data.display_name : username
      return { displayName, profile: data }
    } catch {
      return { displayName: username, profile: {} }
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
        const { displayName, profile } = await fetchUserProfile(host, result.token, username)
        const sid = randomUUID()
        sessions.set(sid, { username, password, host, displayName, profile })
        res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${sid}; HttpOnly; SameSite=Lax; Path=/`)
        return json(res, 200, { username, displayName, profile, host })
      })

      server.middlewares.use('/api/token', async (req, res) => {
        const sid = getCookie(req, SESSION_COOKIE)
        const session = sid ? sessions.get(sid) : undefined
        if (!session) {
          res.statusCode = 401
          return res.end('not authenticated')
        }
        const result = await mintToken(session.host, session.username, session.password)
        if (!result.ok) {
          res.statusCode = 401
          return res.end('token mint failed')
        }
        res.setHeader('Content-Type', 'text/plain')
        res.end(result.token)
      })

      server.middlewares.use('/api/me', (req, res) => {
        const sid = getCookie(req, SESSION_COOKIE)
        const session = sid ? sessions.get(sid) : undefined
        return json(res, 200, {
          username: session?.username ?? null,
          displayName: session?.displayName ?? null,
          profile: session?.profile ?? null,
          host: session?.host ?? null,
        })
      })

      server.middlewares.use('/api/logout', (req, res) => {
        const sid = getCookie(req, SESSION_COOKIE)
        if (sid) sessions.delete(sid)
        res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`)
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
