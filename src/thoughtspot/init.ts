import { init, AuthType } from '@thoughtspot/visual-embed-sdk'

let initialized = false

/**
 * Initialize the ThoughtSpot SDK exactly once, AFTER the user is authenticated.
 *
 * init() kicks off the cookieless auth handshake immediately (getAuthToken ->
 * /api/token). If called before login, that request 401s and the embed inherits
 * a failed auth state. So we defer init() until a session exists.
 */
export function initThoughtSpot(host?: string) {
  if (initialized) return
  initialized = true
  init({
    thoughtSpotHost: host || (import.meta.env.VITE_THOUGHTSPOT_HOST ?? ''),
    // Cookieless trusted auth — the user identity is encoded in the token, so no `username`.
    // getAuthToken fetches a short-lived token from our first-party /api/token endpoint,
    // which derives the user from the server session (never trusting a browser-supplied name).
    authType: AuthType.TrustedAuthTokenCookieless,
    getAuthToken: async () => {
      const r = await fetch('/api/token', { credentials: 'include' })
      if (!r.ok) {
        // Don't hand the SDK an error body as if it were a token.
        throw new Error(`token fetch failed: ${r.status}`)
      }
      return r.text()
    },
    autoLogin: true,
  })
}
