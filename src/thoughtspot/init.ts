import { init, AuthType, AuthStatus, AuthFailureType } from '@thoughtspot/visual-embed-sdk'

let initialized = false

/**
 * Genuine auth-failure listeners.
 *
 * Neither `EmbedEvent.AuthExpire` nor `AuthStatus.FAILURE` reliably mean "the
 * user must sign in again" in cookieless auto-login mode: the iframe emits
 * `AuthExpire` routinely to request a fresh token, and the SDK then emits
 * `AuthStatus.FAILURE(EXPIRY)` even when that refresh SUCCEEDS. The only
 * trustworthy "genuinely broken" signal is our own /api/token endpoint failing
 * (the server session is gone) or a non-EXPIRY fatal failure type.
 */
const authFailureListeners = new Set<() => void>()

export function onAuthFailure(listener: () => void): () => void {
  authFailureListeners.add(listener)
  return () => authFailureListeners.delete(listener)
}

function notifyGenuineAuthFailure() {
  authFailureListeners.forEach((l) => l())
}

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

  const authEE = init({
    thoughtSpotHost: host || (import.meta.env.VITE_THOUGHTSPOT_HOST ?? ''),
    // Cookieless trusted auth — the user identity is encoded in the token, so no `username`.
    // getAuthToken fetches a short-lived token from our first-party /api/token endpoint,
    // which derives the user from the server session (never trusting a browser-supplied name).
    authType: AuthType.TrustedAuthTokenCookieless,
    getAuthToken: async () => {
      let r: Response
      try {
        r = await fetch('/api/token', { credentials: 'include' })
      } catch (e) {
        // Can't even reach our own backend — the session can't be refreshed.
        notifyGenuineAuthFailure()
        throw e
      }
      if (!r.ok) {
        // A non-OK here means the server session is gone / token mint failed —
        // this is the real "please sign in again" condition.
        notifyGenuineAuthFailure()
        // Don't hand the SDK an error body as if it were a token.
        throw new Error(`token fetch failed: ${r.status}`)
      }
      const token = (await r.text()).trim()
      if (!token) {
        notifyGenuineAuthFailure()
        throw new Error('empty token')
      }
      return token
    },
    autoLogin: true,
  })

  // EXPIRY & IDLE_SESSION_TIMEOUT fire routinely even when the SDK successfully
  // refreshes the token, so they are NOT fatal. Any other failure type
  // (NO_COOKIE_ACCESS / SDK / OTHER / UNAUTHENTICATED_FAILURE) is genuine.
  authEE?.on(AuthStatus.FAILURE, (failureType: unknown) => {
    const benign =
      failureType === AuthFailureType.EXPIRY ||
      failureType === AuthFailureType.IDLE_SESSION_TIMEOUT
    if (!benign) notifyGenuineAuthFailure()
  })
}
