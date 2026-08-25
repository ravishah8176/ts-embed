/**
 * Host and service URLs the app itself needs.
 *
 * Content IDs are deliberately absent: an embed's config is the source the user
 * writes in the config panel, so a liveboard or worksheet GUID belongs in that
 * source, not in this app's environment.
 *
 * Override via .env without touching code: VITE_THOUGHTSPOT_HOST,
 * VITE_REST_PLAYGROUND_URL.
 */

/** Hosted ThoughtSpot REST API playground embedded by the REST API tab. */
const DEFAULT_PLAYGROUND_URL = 'https://rest-api-kg1tc3osg-thoughtspot-site.vercel.app/'

export const embedConfig = {
  host: import.meta.env.VITE_THOUGHTSPOT_HOST ?? '',
  playgroundUrl: import.meta.env.VITE_REST_PLAYGROUND_URL ?? DEFAULT_PLAYGROUND_URL,
}
