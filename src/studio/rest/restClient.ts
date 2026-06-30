import { ThoughtSpotRestApi, createBearerAuthenticationConfig } from '@thoughtspot/rest-api-sdk'

/**
 * Builds a ThoughtSpot REST API SDK client (`@thoughtspot/rest-api-sdk`)
 * authenticated with the SAME cookieless session the embeds use.
 *
 * The token provider hits our first-party `/api/token` endpoint — the dev-server
 * mints a short-lived full-access token from the server session (see
 * `vite.config.ts`). The SDK then sends it as `Authorization: Bearer <token>`
 * on every request.
 *
 * NOTE: unlike the iframe embeds (which talk to the cluster over postMessage),
 * these are real cross-origin `fetch`es from the browser to `host`. The cluster
 * must therefore allow CORS for this origin — the same allowlist you configure
 * for embedding. If a call fails with a CORS / network error, that allowlist is
 * the first thing to check.
 */
export function createRestClient(host: string): ThoughtSpotRestApi {
  const config = createBearerAuthenticationConfig(host, async () => {
    const r = await fetch('/api/token', { credentials: 'include' })
    if (!r.ok) throw new Error(`token fetch failed: ${r.status}`)
    return r.text()
  })
  return new ThoughtSpotRestApi(config)
}
