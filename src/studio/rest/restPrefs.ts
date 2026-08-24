import { embedConfig } from '../config'

/**
 * REST-tab settings a user changes at runtime.
 *
 * The playground is a hosted page whose URL moves between environments, so which
 * one to embed has to be answerable in a deployed build. `.env`'s
 * VITE_REST_PLAYGROUND_URL stays the default and the "Reset" target; a value typed
 * in the tab overrides it for that browser.
 */
const PLAYGROUND_KEY = 'ts_embed_playground_url_v1'

export const DEFAULT_PLAYGROUND_URL = embedConfig.playgroundUrl

/**
 * All three accessors swallow their errors: with site data disabled the tab still
 * works, it just falls back to the configured URL on every load.
 */
export function storedPlaygroundUrl(): string {
  try {
    return localStorage.getItem(PLAYGROUND_KEY) || DEFAULT_PLAYGROUND_URL
  } catch {
    return DEFAULT_PLAYGROUND_URL
  }
}

export function setStoredPlaygroundUrl(url: string) {
  try {
    localStorage.setItem(PLAYGROUND_KEY, url)
  } catch {
    /* empty */
  }
}

export function clearStoredPlaygroundUrl() {
  try {
    localStorage.removeItem(PLAYGROUND_KEY)
  } catch {
    /* empty */
  }
}

/** The playground has to be same-origin-checkable for the config handshake. */
export function playgroundOrigin(url: string): string | null {
  try {
    return new URL(url).origin
  } catch {
    return null
  }
}
