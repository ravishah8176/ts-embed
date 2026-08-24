import {
  SNAPSHOT_EMBED_SDK_VERSION,
  SNAPSHOT_REST_SDK_VERSION,
} from '../studio/embeds/viewConfigSchema.generated'
import { importFromTarball, readTarballBundle } from './tarballModule'
import type { EmbedSdkModule, RestSdkModule } from './sdkTypes'

/**
 * Loads the two ThoughtSpot SDKs at a version the user picks in the UI.
 *
 * This app is deployed as a static embed-testing sandbox, so "which SDK version am
 * I testing against" is a runtime question, not a `package.json` edit and a redeploy.
 * Neither SDK is a dependency of this app at all: both publish self-contained ES
 * module bundles, so every version — including the one the app starts at — is pulled
 * off a CDN and imported. `sdkTypes.ts` declares the surface that costs, and
 * `scripts/sdk-versions.json` pins the version the committed generated artifacts
 * describe.
 *
 * Two rules make this predictable:
 *   • Nothing is served from the app bundle, so the app needs a reachable CDN to run
 *     at all. `SNAPSHOT_VERSIONS` is the fallback when npm's latest cannot be
 *     resolved or will not load — a version, not a local copy.
 *   • A version is loaded at most once per page. `init()` and every live embed hold
 *     onto module-level state inside the SDK, so switching version persists the
 *     choice and reloads the page rather than trying to swap it underneath them.
 */
export type { EmbedSdkModule, RestSdkModule }

export type SdkName = 'embed' | 'rest'

export interface SdkVersions {
  embed: string
  rest: string
}

export const NPM_PACKAGE: Record<SdkName, string> = {
  embed: '@thoughtspot/visual-embed-sdk',
  rest: '@thoughtspot/rest-api-sdk',
}

/**
 * The versions the committed generated artifacts were built from, and what the app
 * falls back to. Fetched from a CDN like any other — "snapshot" describes the
 * generated code that matches them, not a copy of the SDK on disk.
 */
export const SNAPSHOT_VERSIONS: SdkVersions = {
  embed: SNAPSHOT_EMBED_SDK_VERSION,
  rest: SNAPSHOT_REST_SDK_VERSION,
}

/** Path to each package's built ES module inside the package (used for tarballs). */
const ESM_ENTRY: Record<SdkName, string> = {
  embed: 'dist/tsembed.es.js',
  rest: 'dist/index.js',
}

/**
 * Which CDN each package is fetched from, and why they differ.
 *
 * The Visual Embed SDK publishes a self-contained browser bundle, so the file can be
 * taken straight off jsDelivr. The REST SDK's published bundle cannot: it opens with
 * `import "whatwg-fetch"`, a bare specifier no browser can resolve without an import
 * map, so fetching that file verbatim fails at import. esm.sh serves the same package
 * with its specifiers rewritten to absolute URLs, which is what makes it loadable.
 */
export const CDN_NAME: Record<SdkName, string> = {
  embed: 'jsDelivr',
  rest: 'esm.sh',
}

const VERSIONS_KEY = 'ts_embed_sdk_versions_v1'
/** Set just before a version reload, read once after it, so the switch is confirmed. */
const SWITCH_KEY = 'ts_embed_sdk_switch_v1'
/** Per-tab cache of npm's latest, so a version reload cannot change it mid-session. */
const LATEST_KEY = 'ts_embed_latest_latest_v1'

/**
 * What a version means when the user has not picked one.
 *
 * Starts at the versions baked into this build and is replaced by npm's latest during
 * `resolveDefaultSdkVersions()`, which every other reader waits on. Nothing writes
 * this to `localStorage`: a resolved default has to stay a default, or the first visit
 * would pin the app to whatever was latest that day.
 */
let defaultVersions: SdkVersions = { ...SNAPSHOT_VERSIONS }

export function defaultSdkVersions(): SdkVersions {
  return { ...defaultVersions }
}

/**
 * Both accessors swallow their errors: with site data disabled the app still runs
 * on the bundled versions, it just cannot remember a different choice.
 */
export function storedSdkVersions(): SdkVersions {
  try {
    const raw = localStorage.getItem(VERSIONS_KEY)
    if (!raw) return defaultSdkVersions()
    const parsed = JSON.parse(raw) as Partial<SdkVersions>
    return {
      embed: pickStored('embed', parsed.embed),
      rest: pickStored('rest', parsed.rest),
    }
  } catch {
    return defaultSdkVersions()
  }
}

/**
 * A stored choice is only honoured while it is still one this app can drive: a version
 * stored before the floor existed would otherwise load on every visit and fail, with
 * no way back to a working app but clearing site data. That case falls back to the
 * bundled version rather than the resolved default — it is the one always loadable
 * without a network.
 */
function pickStored(sdk: SdkName, stored: string | undefined): string {
  if (typeof stored !== 'string' || !stored) return defaultVersions[sdk]
  return isSupportedVersion(sdk, stored) ? stored : SNAPSHOT_VERSIONS[sdk]
}

/**
 * Resolves the default versions to npm's latest, once per tab, before the app renders.
 *
 * The app starts at whatever is newest rather than at whatever this build happened to
 * install, which is the point of a version-switching tool. Three things bound the
 * cost of that: the result is cached for the tab, so the reload an embed SDK switch
 * needs cannot land on a different version than the one before it; a timeout keeps a
 * slow or captive network from holding up first paint; and every failure path leaves
 * the bundled versions in place, which need no network at all.
 *
 * A version that is loadable but wrong is still possible — nothing is fetched here but
 * the metadata. Sign-in offers a one-click fall back to the bundled version for that.
 */
export async function resolveDefaultSdkVersions(timeoutMs = 2500): Promise<SdkVersions> {
  try {
    const cached = sessionStorage.getItem(LATEST_KEY)
    if (cached) {
      const parsed = JSON.parse(cached) as Partial<SdkVersions>
      defaultVersions = {
        embed: parsed.embed || SNAPSHOT_VERSIONS.embed,
        rest: parsed.rest || SNAPSHOT_VERSIONS.rest,
      }
      return defaultSdkVersions()
    }
  } catch {
    /* empty */
  }

  const signal = AbortSignal.timeout(timeoutMs)
  const resolved = await Promise.all(
    (['embed', 'rest'] as SdkName[]).map(async (sdk) => {
      try {
        const { latest } = await fetchPublishedVersions(sdk, signal)
        /** The floor still applies: latest is only a better default if it is usable. */
        return latest && isSupportedVersion(sdk, latest) ? latest : SNAPSHOT_VERSIONS[sdk]
      } catch {
        return SNAPSHOT_VERSIONS[sdk]
      }
    }),
  )

  defaultVersions = { embed: resolved[0], rest: resolved[1] }
  try {
    sessionStorage.setItem(LATEST_KEY, JSON.stringify(defaultVersions))
  } catch {
    /* empty */
  }
  return defaultSdkVersions()
}

export function setStoredSdkVersions(next: Partial<SdkVersions>) {
  try {
    localStorage.setItem(VERSIONS_KEY, JSON.stringify({ ...storedSdkVersions(), ...next }))
  } catch {
    /* empty */
  }
}

/** Notes that this reload is a deliberate SDK switch, for the page that comes back. */
export function markSdkSwitch(sdk: SdkName, version: string) {
  try {
    sessionStorage.setItem(SWITCH_KEY, JSON.stringify({ sdk, version }))
  } catch {
    /* empty */
  }
}

/** Reads and clears that note; null when this load is not the far side of a switch. */
export function takeSdkSwitch(): { sdk: SdkName; version: string } | null {
  try {
    const raw = sessionStorage.getItem(SWITCH_KEY)
    if (!raw) return null
    sessionStorage.removeItem(SWITCH_KEY)
    const parsed = JSON.parse(raw) as { sdk?: string; version?: string }
    if (parsed.sdk !== 'embed' && parsed.sdk !== 'rest') return null
    return typeof parsed.version === 'string' ? { sdk: parsed.sdk, version: parsed.version } : null
  } catch {
    return null
  }
}

/**
 * A version can also be given as a URL to a built ES module — a custom CDN, a
 * self-hosted build, an unreleased artifact. Anything a browser can `import()`.
 */
export function isModuleUrl(version: string): boolean {
  return /^https?:\/\//i.test(version.trim())
}

/** `pkg.pr.new` links are long and mostly boilerplate; the commit is the useful part. */
export function displayVersion(version: string): string {
  const v = version.trim()
  if (!isModuleUrl(v)) return v
  if (/pkg\.pr\.new/.test(v)) return `pr ${v.split('@').pop() ?? v}`
  return v.replace(/^https?:\/\//, '')
}

export function isPrBuild(version: string): boolean {
  return isModuleUrl(version) && /pkg\.pr\.new/.test(version)
}

/**
 * Oldest version of each package this app can drive, and why there is a floor at all.
 *
 * The REST SDK was regenerated for 2.0: 1.x is an APIMATIC build whose surface is one
 * class per controller (`UserController`, `MetadataController`) reached through a
 * `Client` that carries no methods, against `/api/rest/v2/` paths. Nothing in the
 * Explorer — the aggregate `ThoughtSpotRestApi`, the catalog parse, the prototype scan
 * — has anything to bind to there, so a 1.x pick is refused up front instead of
 * loading and then failing three steps later. `null` means no floor is known.
 */
const MIN_SUPPORTED: Record<SdkName, string | null> = {
  embed: null,
  rest: '2.0.0',
}

/** Named exports the Explorer builds every call from; their absence is unrecoverable. */
const REQUIRED_REST_EXPORTS = ['ThoughtSpotRestApi', 'createBearerAuthenticationConfig']

/** Numeric core only, so `2.0.0-dev` sorts below `2.0.0` as semver says it should. */
function belowFloor(version: string, floor: string): boolean {
  const core = version.trim().split('-')[0].split('.').map(Number)
  if (core.length !== 3 || core.some(Number.isNaN)) return false
  const min = floor.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    if (core[i] !== min[i]) return core[i] < min[i]
  }
  return /-/.test(version.trim())
}

/**
 * Why a version cannot be used, or null when nothing rules it out.
 *
 * Only ever non-null for a published version below the floor: a URL names a build
 * whose shape cannot be known from the string, so it is left to `verifySdkSource` to
 * import and find out. Both the picker and the pre-flight read this, so the reason the
 * list omits a version and the reason a typed one is refused are the same sentence.
 */
export function unsupportedReason(sdk: SdkName, version: string): string | null {
  const floor = MIN_SUPPORTED[sdk]
  const v = version.trim()
  if (!floor || isModuleUrl(v) || !belowFloor(v, floor)) return null
  return (
    `${NPM_PACKAGE[sdk]}@${v} predates ${floor} — that generation of the package exposes one class ` +
    `per controller instead of a single client, which this app cannot call. Pick ${floor} or newer.`
  )
}

export function isSupportedVersion(sdk: SdkName, version: string): boolean {
  return !unsupportedReason(sdk, version)
}

export function cdnUrl(sdk: SdkName, version: string): string {
  const v = version.trim()
  if (isModuleUrl(v)) return v
  if (sdk === 'rest') return `https://esm.sh/${NPM_PACKAGE.rest}@${v}`
  return `https://cdn.jsdelivr.net/npm/${NPM_PACKAGE.embed}@${v}/${ESM_ENTRY.embed}`
}

/** Content types that mean "npm tarball" — unpacked in the browser, see tarballModule. */
const TARBALL_TYPES = ['tar', 'gzip', 'x-gtar']

async function contentType(url: string): Promise<string> {
  const resp = await fetch(url, { method: 'GET', headers: { Range: 'bytes=0-0' } })
  if (!resp.ok) throw new Error(`${url} returned ${resp.status}.`)
  return (resp.headers.get('content-type') ?? '').toLowerCase()
}

function isTarball(type: string): boolean {
  return TARBALL_TYPES.some((t) => type.includes(t))
}

/**
 * Checks a version, module URL or tarball is actually loadable, before it is stored.
 *
 * Worth a round trip because the alternative is discovering it after the reload:
 * `init()` never runs, so the page comes back signed out, on a version that cannot
 * load, and the only way forward is the fallback button on the sign-in screen.
 *
 * A tarball is checked the whole way — downloaded, unpacked, entry module located —
 * because "the URL responds" says nothing about whether the build inside it is one
 * this loader can use. The parse is cached, so the load that follows is free.
 */
export async function verifySdkSource(sdk: SdkName, version: string): Promise<void> {
  const unsupported = unsupportedReason(sdk, version)
  if (unsupported) throw new Error(unsupported)

  const url = cdnUrl(sdk, version)
  let type: string
  try {
    type = await contentType(url)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    if (!isModuleUrl(version) && /returned 40\d/.test(message)) {
      throw new Error(
        `${NPM_PACKAGE[sdk]}@${version} is not on ${CDN_NAME[sdk]} — check the version exists.`,
      )
    }
    throw new Error(
      `Could not reach ${url} — ${message} A cross-origin build has to be served with CORS enabled.`,
    )
  }

  if (isTarball(type)) {
    const bundle = await readTarballBundle(url, ESM_ENTRY[sdk])
    if (!bundle.entryUrl) {
      throw new Error(
        `That tarball has no ${ESM_ENTRY[sdk]} — this loader needs the built ES bundle. ` +
          `It carries: ${bundle.files.slice(0, 6).join(', ') || 'no dist/ modules'}.`,
      )
    }
    return
  }

  if (type && !/javascript|ecmascript|text\/plain|octet-stream/.test(type)) {
    throw new Error(`${url} is served as ${type.split(';')[0]}, which is not a JavaScript module.`)
  }

  /**
   * For the REST SDK the check goes all the way and imports it.
   *
   * "It responds with JavaScript" is not the same as "it loads": a bundle whose
   * specifiers a browser cannot resolve answers 200 and then throws at import. Only
   * the REST SDK is safe to prove this way — it is a client object, so a second copy
   * on the page costs nothing, whereas importing a second Visual Embed SDK would put
   * two of them next to one set of live iframes. The module cache makes the load that
   * follows free.
   */
  if (sdk === 'rest') {
    let module: Record<string, unknown>
    try {
      module = (await import(/* @vite-ignore */ url)) as Record<string, unknown>
    } catch (e) {
      throw new Error(
        `${url} responded, but the browser could not import it — ` +
          `${e instanceof Error ? e.message : String(e)}`,
      )
    }
    /** A URL, or a version the floor above cannot judge, can still be the wrong shape. */
    const missing = REQUIRED_REST_EXPORTS.filter((name) => !(name in module))
    if (missing.length) {
      throw new Error(
        `${url} imports, but exports no ${missing.join(' or ')} — ` +
          `this app builds every call from those, so that build cannot be driven from here.`,
      )
    }
  }
}

let embedSdkModule: { version: string; module: EmbedSdkModule } | null = null
let restSdkModule: { version: string; module: RestSdkModule } | null = null

async function importSdk(sdk: SdkName, version: string): Promise<unknown> {
  const url = cdnUrl(sdk, version)
  try {
    /**
     * A `pkg.pr.new` URL — either form, package-scoped or repo-scoped — is a tarball
     * of a per-commit build. It is the normal way to try a PR of the SDK, so it is
     * unpacked in the page rather than refused; anything else is imported directly.
     */
    if (isModuleUrl(version) && isTarball(await contentType(url))) {
      return await importFromTarball(url, ESM_ENTRY[sdk])
    }
    return await import(/* @vite-ignore */ url)
  } catch (e) {
    throw new Error(
      `Could not load ${NPM_PACKAGE[sdk]}@${version} from ${url} — ` +
        `check the version exists and that this page can reach jsDelivr. (${
          e instanceof Error ? e.message : String(e)
        })`,
    )
  }
}

/**
 * Loads the Visual Embed SDK at the stored version, or returns the already-loaded
 * one. A second version on the same page is refused rather than silently ignored:
 * the caller's fix is to persist the version and reload.
 */
export async function loadEmbedSdk(version = storedSdkVersions().embed): Promise<EmbedSdkModule> {
  if (embedSdkModule) {
    if (embedSdkModule.version !== version) {
      throw new Error(
        `Visual Embed SDK ${embedSdkModule.version} is already loaded on this page — reload to use ${version}.`,
      )
    }
    return embedSdkModule.module
  }
  const module = (await importSdk('embed', version)) as EmbedSdkModule
  embedSdkModule = { version, module }
  return module
}

export async function loadRestSdk(version = storedSdkVersions().rest): Promise<RestSdkModule> {
  if (restSdkModule?.version === version) return restSdkModule.module
  const module = (await importSdk('rest', version)) as RestSdkModule
  restSdkModule = { version, module }
  return module
}

/**
 * The loaded Visual Embed SDK.
 *
 * Throws rather than loading on demand: everything that touches the SDK renders
 * behind the sign-in screen, which loads it first, so reaching here unloaded is a
 * wiring bug and silently importing a second copy would hide it.
 */
export function embedSdk(): EmbedSdkModule {
  if (!embedSdkModule) throw new Error('The Visual Embed SDK has not been loaded yet.')
  return embedSdkModule.module
}

export function restSdk(): RestSdkModule {
  if (!restSdkModule) throw new Error('The REST API SDK has not been loaded yet.')
  return restSdkModule.module
}

export function loadedVersion(sdk: SdkName): string | null {
  return (sdk === 'embed' ? embedSdkModule?.version : restSdkModule?.version) ?? null
}

export interface PublishedVersions {
  versions: string[]
  latest: string | null
}

/**
 * Every published version of a package, newest first, from jsDelivr's metadata API.
 *
 * Only used to populate the picker, so a failure is not fatal — the caller falls
 * back to letting the user type a version, which is also the only way to reach a
 * build that is not on npm (a `pkg.pr.new` PR build, say).
 */
export async function fetchPublishedVersions(
  sdk: SdkName,
  signal?: AbortSignal,
): Promise<PublishedVersions> {
  const resp = await fetch(`https://data.jsdelivr.com/v1/packages/npm/${NPM_PACKAGE[sdk]}`, { signal })
  if (!resp.ok) throw new Error(`Version list unavailable (${resp.status})`)
  const data = (await resp.json()) as {
    versions?: { version: string }[]
    tags?: Record<string, string>
  }
  return {
    versions: (data.versions ?? []).map((v) => v.version),
    latest: data.tags?.latest ?? null,
  }
}
