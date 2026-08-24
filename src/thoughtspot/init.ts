import type { AuthType, EmbedConfig } from './sdkTypes'
import { AUTH_METHODS, type AuthMethodId } from '../auth/authMethods'
import { embedSdk, loadEmbedSdk, type EmbedSdkModule } from './sdkLoader'

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

/** DOM id of the container the SDK injects its popup-trigger button into. */
export const SSO_TRIGGER_CONTAINER_ID = 'ts-sso-trigger'

export interface InitOptions {
  host: string
  method: AuthMethodId
  /** Required by Basic and TrustedAuthToken. */
  username?: string
  /** Required by Basic only; never persisted anywhere. */
  password?: string
  /** SAMLRedirect / OIDCRedirect: open the IdP in a popup instead of navigating. */
  inPopup?: boolean
  /** SAMLRedirect / OIDCRedirect: path on this origin the IdP flow lands back on. */
  redirectPath?: string
}

let initialized: InitOptions | null = null
let authEE: ReturnType<EmbedSdkModule['init']> | null = null

/**
 * Fetches a short-lived cluster token from this app's own backend.
 *
 * Every failure here is a genuine "please sign in again" condition, so each one
 * notifies the listeners: an unreachable backend cannot refresh the session, and a
 * non-OK response means the server session is gone or the token mint failed.
 * Always throws rather than returning a falsy token — handing the SDK an error
 * body as if it were a token surfaces much later as an opaque auth failure.
 */
async function fetchBackendToken(): Promise<string> {
  let r: Response
  try {
    r = await fetch('/api/token', { credentials: 'include' })
  } catch (e) {
    notifyGenuineAuthFailure()
    throw e
  }
  if (!r.ok) {
    notifyGenuineAuthFailure()
    throw new Error(`token fetch failed: ${r.status}`)
  }
  const token = (await r.text()).trim()
  if (!token) {
    notifyGenuineAuthFailure()
    throw new Error('empty token')
  }
  return token
}

/**
 * Translates one of our `AuthMethodId`s into the `init()` config the SDK expects.
 *
 * Each branch adds only the fields its `authType` actually reads — passing a
 * `password` to an SSO type or a `getAuthToken` to `Basic` is silently ignored by
 * the SDK, which makes misconfiguration hard to spot, so we keep the shapes exact.
 *
 * Only the cookie'd `TrustedAuthToken` takes a `username`: it posts the token
 * against a named user, whereas the cookieless variant carries the identity inside
 * the token itself.
 */
function buildConfig(opts: InitOptions): EmbedConfig {
  const spec = AUTH_METHODS[opts.method]
  const config: EmbedConfig = {
    thoughtSpotHost: opts.host,
    authType: spec.wireValue as AuthType,
    loginFailedMessage: `Could not sign in with ${spec.label}.`,
  }

  if (spec.usesBackendToken) {
    config.getAuthToken = fetchBackendToken
    config.autoLogin = true
    if (opts.method === 'TrustedAuthToken') config.username = opts.username
  }

  if (opts.method === 'Basic') {
    config.username = opts.username
    config.password = opts.password
  }

  if (spec.supportsPopup && opts.inPopup) {
    config.inPopup = true
    config.authTriggerContainer = `#${SSO_TRIGGER_CONTAINER_ID}`
    config.authTriggerText = `Continue with ${spec.id === 'OIDCRedirect' ? 'OIDC' : 'SAML'}`
  } else if (spec.supportsPopup && opts.redirectPath) {
    config.redirectPath = opts.redirectPath
  }

  return config
}

/**
 * Initialize the ThoughtSpot SDK for one auth method and resolve once its auth
 * step has settled.
 *
 * `init()` starts the handshake immediately, so it cannot be called before we know
 * which method and host to use — hence this is driven by the login flow rather
 * than module load. It is also where the SDK itself is fetched, at the version the
 * user picked, so nothing else in the app may touch the SDK before this resolves.
 *
 * A *successful* init sticks for the lifetime of the page: the SDK caches the
 * config globally and every mounted embed reads it, so switching methods after
 * that needs a reload (see `logout` in AuthContext). A failed one does not — the
 * SDK builds a fresh event emitter per `init()` call, so the login form is free to
 * retry with different credentials or a different method.
 *
 * Resolution is keyed on `AuthStatus.SDK_SUCCESS` / `FAILURE`, which the SDK emits
 * for every `authType` — including the pass-through modes, where it means "nothing
 * to do, the iframe will handle it" rather than "a user is signed in".
 *
 * For a full-page SAML/OIDC redirect the returned promise never settles: the
 * browser leaves the page before the SDK can emit anything. The popup variant is
 * settled by `SAML_POPUP_CLOSED_NO_AUTH`, without which closing the IdP window
 * would leave the caller waiting forever.
 *
 * `FAILURE` needs filtering: `EXPIRY` and `IDLE_SESSION_TIMEOUT` fire routinely
 * even when the SDK successfully refreshes the token, so only the other types
 * (`NO_COOKIE_ACCESS` / `SDK` / `OTHER` / `UNAUTHENTICATED_FAILURE`) are genuine
 * failures worth reporting. Those routine post-success refreshes land here too,
 * which is why `fail` is a no-op once the promise has settled — a refresh must not
 * retroactively break a login that already succeeded, nor release the init lock
 * after embeds have read the config.
 */
export async function initThoughtSpot(opts: InitOptions): Promise<void> {
  if (initialized) {
    if (initialized.method !== opts.method || initialized.host !== opts.host) {
      throw new Error('The SDK is already initialized — reload the page to change auth method or host.')
    }
    return
  }

  const { init, AuthStatus, AuthFailureType } = await loadEmbedSdk()
  initialized = opts

  return new Promise<void>((resolve, reject) => {
    let settled = false

    const fail = (message: string) => {
      if (settled) return
      settled = true
      initialized = null
      reject(new Error(message))
    }

    authEE = init(buildConfig(opts))

    authEE?.on(AuthStatus.SDK_SUCCESS, () => {
      settled = true
      resolve()
    })

    authEE?.on(AuthStatus.SAML_POPUP_CLOSED_NO_AUTH, () => {
      fail('The sign-in window was closed before authentication finished.')
    })

    authEE?.on(AuthStatus.FAILURE, (failureType: unknown) => {
      const benign =
        failureType === AuthFailureType.EXPIRY ||
        failureType === AuthFailureType.IDLE_SESSION_TIMEOUT
      if (!benign) notifyGenuineAuthFailure()
      fail(benign ? 'Session expired.' : `Authentication failed (${String(failureType)}).`)
    })
  })
}

/** True once `initThoughtSpot` has run on this page. */
export function isThoughtSpotInitialized(): boolean {
  return initialized !== null
}

/** The options the SDK was initialized with, or null. */
export function getInitOptions(): InitOptions | null {
  return initialized
}

/**
 * Open the SSO popup on demand.
 *
 * With `inPopup` the SDK injects its own trigger button into
 * `#ts-sso-trigger`; this is the escape hatch for driving the same flow from our
 * own UI instead.
 */
export function triggerSsoPopup(): void {
  authEE?.emit(embedSdk().AuthEvent.TRIGGER_SSO_POPUP)
}
