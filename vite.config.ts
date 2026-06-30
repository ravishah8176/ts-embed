import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { randomUUID } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'

const SESSION_COOKIE = 'ts_app_session'
const TOKEN_VALIDITY_SECS = 300

interface Session {
  username: string
  password: string
  displayName: string
}

/**
 * Dev-only auth backend for cookieless trusted auth.
 *
 * - POST /api/login   { username, password } -> validates against ThoughtSpot,
 *                      creates a first-party server session, sets an HttpOnly cookie.
 * - GET  /api/token   -> derives the user from the session (NEVER from the browser)
 *                        and mints a short-lived ThoughtSpot token. Used by getAuthToken.
 * - GET  /api/me      -> returns the logged-in username (or null) so the SPA can restore state.
 * - POST /api/logout  -> clears the session.
 *
 * Credentials live only in this Node process — never in the browser bundle.
 */
function thoughtSpotAuthEndpoints(env: Record<string, string>): Plugin {
  const host = env.VITE_THOUGHTSPOT_HOST
  const sessions = new Map<string, Session>()

  async function mintToken(username: string, password: string) {
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
  }

  // Look up the user's display name (falls back to username on any failure).
  async function fetchDisplayName(token: string, username: string) {
    try {
      const resp = await fetch(`${host}/api/rest/2.0/auth/session/user`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = (await resp.json().catch(() => ({}))) as { display_name?: string }
      return data.display_name || username
    } catch {
      return username
    }
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
        const { username, password } = await readJsonBody(req)
        if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
          return json(res, 400, { error: 'username and password are required' })
        }
        const result = await mintToken(username, password)
        if (!result.ok) {
          return json(res, 401, { error: 'Invalid ThoughtSpot credentials' })
        }
        const displayName = await fetchDisplayName(result.token, username)
        const sid = randomUUID()
        sessions.set(sid, { username, password, displayName })
        res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${sid}; HttpOnly; SameSite=Lax; Path=/`)
        return json(res, 200, { username, displayName })
      })

      server.middlewares.use('/api/token', async (req, res) => {
        const sid = getCookie(req, SESSION_COOKIE)
        const session = sid ? sessions.get(sid) : undefined
        if (!session) {
          res.statusCode = 401
          return res.end('not authenticated')
        }
        const result = await mintToken(session.username, session.password)
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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), thoughtSpotAuthEndpoints(env)],
    server: {
      host: '10.79.142.203',
      port: 3030,
    },
  }
})
