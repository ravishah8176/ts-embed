/**
 * Catalog of every login method the Visual Embed SDK supports, plus the metadata
 * the Studio needs to drive them.
 *
 * The SDK's `AuthType` alone is not enough to build an `init()` config: each method
 * needs a different subset of credentials, some redirect the whole page, and only
 * two of them route through this app's own token backend. Rather than scatter that
 * knowledge across the login form, the init call and the REST client, it lives here
 * once and everything else reads off it.
 *
 * Ordering is the order shown in the login picker — the recommended default first.
 *
 * Nothing here imports the SDK: `AuthType` is a string enum whose members are the
 * wire values below, and this module is read by the login form before any SDK
 * version has been loaded.
 */

export type AuthMethodId =
  | 'TrustedAuthTokenCookieless'
  | 'TrustedAuthToken'
  | 'EmbeddedSSO'
  | 'SAMLRedirect'
  | 'OIDCRedirect'
  | 'Basic'
  | 'None'

/** How REST calls must authenticate once the session exists. */
export type RestAuthMode = 'bearer' | 'cookie'

export interface AuthMethodSpec {
  id: AuthMethodId
  /** `AuthType` member value: what `init({ authType })` receives, and what the SDK puts on the iframe URL. */
  wireValue: string
  label: string
  blurb: string
  /**
   * Mints its session through this app's dev backend (`/api/login` -> `/api/token`),
   * so login needs a username + password and REST calls get a bearer token.
   */
  usesBackendToken: boolean
  needsUsername: boolean
  needsPassword: boolean
  /** Supports `inPopup` + `authTriggerContainer` instead of a full-page redirect. */
  supportsPopup: boolean
  /**
   * Whether a ThoughtSpot session cookie exists on the host after the flow, so
   * `getSessionInfo()` can resolve the real user. False for the pass-through modes,
   * where authentication happens inside the iframe and there is nothing to read yet.
   */
  resolvesIdentity: boolean
  restAuthMode: RestAuthMode
  badge?: string
  badgeTone?: 'good' | 'warn'
  /** Cluster-side prerequisite or caveat, surfaced under the picker. */
  note?: string
}

const SPECS: AuthMethodSpec[] = [
  {
    id: 'TrustedAuthTokenCookieless',
    wireValue: 'AuthServerCookieless',
    label: 'TrustedAuthTokenCookieless',
    blurb: 'Token per iframe, no third-party cookies',
    usesBackendToken: true,
    needsUsername: true,
    needsPassword: true,
    supportsPopup: false,
    resolvesIdentity: false,
    restAuthMode: 'bearer',
    badge: 'RECOMMENDED',
    badgeTone: 'good',
    note: 'Tokens are minted by this app’s backend from your credentials and never leave it.',
  },
  {
    id: 'TrustedAuthToken',
    wireValue: 'AuthServer',
    label: 'TrustedAuthToken',
    blurb: 'Token exchanged for a ThoughtSpot session cookie',
    usesBackendToken: true,
    needsUsername: true,
    needsPassword: true,
    supportsPopup: false,
    resolvesIdentity: true,
    restAuthMode: 'bearer',
    note: 'Depends on third-party cookies — Safari and hardened Chrome profiles will block it.',
  },
  {
    id: 'EmbeddedSSO',
    wireValue: 'EmbeddedSSO',
    label: 'EmbeddedSSO',
    blurb: 'IdP redirect happens inside the iframe',
    usesBackendToken: false,
    needsUsername: false,
    needsPassword: false,
    supportsPopup: false,
    resolvesIdentity: false,
    restAuthMode: 'cookie',
    note: 'Requires SAML/OIDC on the cluster and an IdP that permits iframe embedding.',
  },
  {
    id: 'SAMLRedirect',
    wireValue: 'SSO_SAML',
    label: 'SAMLRedirect',
    blurb: 'Host app redirects to the SAML IdP',
    usesBackendToken: false,
    needsUsername: false,
    needsPassword: false,
    supportsPopup: true,
    resolvesIdentity: true,
    restAuthMode: 'cookie',
    note: 'Requires SAML on the cluster. Without popup mode this page navigates away and back.',
  },
  {
    id: 'OIDCRedirect',
    wireValue: 'SSO_OIDC',
    label: 'OIDCRedirect',
    blurb: 'Host app redirects to the OIDC IdP',
    usesBackendToken: false,
    needsUsername: false,
    needsPassword: false,
    supportsPopup: true,
    resolvesIdentity: true,
    restAuthMode: 'cookie',
    note: 'Requires OIDC on the cluster. Without popup mode this page navigates away and back.',
  },
  {
    id: 'Basic',
    wireValue: 'Basic',
    label: 'Basic',
    blurb: 'Credentials posted straight to the cluster login API',
    usesBackendToken: false,
    needsUsername: true,
    needsPassword: true,
    supportsPopup: false,
    resolvesIdentity: true,
    restAuthMode: 'cookie',
    badge: 'DEV ONLY',
    badgeTone: 'warn',
    note: 'The password reaches the browser’s SDK config. Developer testing only — never production. Not remembered across reloads.',
  },
  {
    id: 'None',
    wireValue: 'None',
    label: 'None',
    blurb: 'No SDK auth — pass through to the embedded app',
    usesBackendToken: false,
    needsUsername: false,
    needsPassword: false,
    supportsPopup: false,
    resolvesIdentity: false,
    restAuthMode: 'cookie',
    note: 'The iframe is on its own: it works only if the browser already has a cluster session.',
  },
]

export const AUTH_METHOD_LIST = SPECS

export const AUTH_METHODS = Object.fromEntries(
  SPECS.map((s) => [s.id, s]),
) as Record<AuthMethodId, AuthMethodSpec>

export const DEFAULT_AUTH_METHOD: AuthMethodId = 'TrustedAuthTokenCookieless'

export function isAuthMethodId(value: unknown): value is AuthMethodId {
  return typeof value === 'string' && value in AUTH_METHODS
}
