import type { ThoughtSpotRestApi } from '../../thoughtspot/sdkTypes'
import type { RestAuthMode } from '../../auth/authMethods'
import { loadRestSdk } from '../../thoughtspot/sdkLoader'

/**
 * Builds a ThoughtSpot REST API SDK client (`@thoughtspot/rest-api-sdk`)
 * authenticated the same way the embeds are.
 *
 * Which of the two shapes applies depends on the login method (see
 * `auth/authMethods.ts`):
 *
 *   • `bearer` — the trusted-token methods. The token provider hits our
 *     first-party `/api/token` endpoint; the dev server returns the short-lived
 *     full-access token held in the HttpOnly session cookie (see `vite.config.ts`),
 *     and the SDK sends it as `Authorization: Bearer <token>` on every request.
 *
 *   • `cookie` — the SSO, Basic and None methods. There is no token to fetch: those
 *     flows leave a ThoughtSpot session cookie in the browser, so the client is
 *     configured without an authenticator and rides that cookie instead. It follows
 *     that REST calls fail here whenever the embed itself is unauthenticated (`None`,
 *     or an `EmbeddedSSO` iframe the user has not completed).
 *
 * The SDK itself is fetched at `version` (the REST tab's picker owns it), which is
 * why this is async — the caller awaits it before making the client available.
 *
 * NOTE: unlike the iframe embeds (which talk to the cluster over postMessage),
 * these are real cross-origin `fetch`es from the browser to `host`. The cluster
 * must therefore allow CORS for this origin — the same allowlist you configure
 * for embedding. If a call fails with a CORS / network error, that allowlist is
 * the first thing to check.
 */
export async function createRestClient(
  host: string,
  mode: RestAuthMode = 'bearer',
  version?: string,
): Promise<ThoughtSpotRestApi> {
  const { ThoughtSpotRestApi, createBasicConfig, createBearerAuthenticationConfig } =
    await loadRestSdk(version)

  if (mode === 'cookie') {
    return new ThoughtSpotRestApi(createBasicConfig(host))
  }

  const config = createBearerAuthenticationConfig(host, async () => {
    const r = await fetch('/api/token', { credentials: 'include' })
    if (!r.ok) throw new Error(`token fetch failed: ${r.status}`)
    return r.text()
  })
  return new ThoughtSpotRestApi(config)
}
