import type { RestMethod, RestParam } from './catalog'
import { NPM_PACKAGE } from '../../thoughtspot/sdkLoader'

/**
 * Builds the method catalog for a REST SDK version, in the browser.
 *
 * `catalog.ts` is generated at build time from the installed package, so it can only
 * ever describe the pinned version. But the two files it is generated from —
 * `dist/index.d.ts` for signatures and `dist/index.js` for verb and path — are
 * published for every version, so the same parse runs here against any version the
 * user picks. That makes the catalog follow the version rather than the build.
 *
 * The parsing rules mirror `scripts/gen-rest-catalog.mjs`, which still generates the
 * shipped snapshot: the app then starts with a full catalog and no network, and only
 * fetches when the user asks for a different version.
 */

const GROUP_NAMES: Record<string, string> = {
  auth: 'Auth & Session', users: 'Users', groups: 'Groups', roles: 'Roles',
  metadata: 'Metadata', tags: 'Tags', security: 'Security', system: 'System',
  orgs: 'Orgs', connection: 'Connections', 'connection-configurations': 'Connections',
  schedules: 'Schedules', ai: 'AI', vcs: 'Version Control', logs: 'Logs', log: 'Logs',
  customization: 'Customization', dbt: 'DBT', calendars: 'Custom Calendars',
  template: 'Variables', webhooks: 'Webhooks', reports: 'Reports', report: 'Reports',
  data: 'Data', searchdata: 'Data', collections: 'Collections', jobs: 'Jobs',
}

/** Curated request bodies, carried over from the generator so samples survive a switch. */
const SAMPLES: Record<string, Record<string, unknown>> = {
  searchMetadata: { searchMetadataRequest: { metadata: [{ type: 'LIVEBOARD' }], record_size: 10 } },
  searchUsers: { searchUsersRequest: { record_size: 10 } },
  searchUserGroups: { searchUserGroupsRequest: { record_size: 10 } },
  searchConnection: { searchConnectionRequest: { record_size: 10 } },
  searchSchedules: { searchSchedulesRequest: { record_size: 10 } },
}

function groupOf(path: string): string {
  const seg = /\/api\/rest\/2\.0\/([^/]+)/.exec(path)?.[1] ?? ''
  return GROUP_NAMES[seg] || (seg ? seg[0].toUpperCase() + seg.slice(1) : 'Other')
}

function labelOf(name: string): string {
  const s = name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Argument lists, read off the typed aggregate client. */
function parseSignatures(dts: string): Record<string, RestParam[]> {
  const methods: Record<string, RestParam[]> = {}
  let inClass = false

  for (const line of dts.split('\n')) {
    if (line.includes('declare class PromiseThoughtSpotRestApi')) inClass = true
    else if (inClass && /^declare class /.test(line)) break
    if (!inClass) continue

    const m = /^\s{4}([a-z]\w*)\((.*)\): Promise</.exec(line)
    // `…WithHttpInfo` twins (2.26+) are the same endpoint returning the raw response.
    if (!m || m[1] === 'constructor' || m[1].endsWith('WithHttpInfo')) continue

    const params: RestParam[] = []
    const raw = m[2].trim()
    if (raw) {
      for (const part of raw.split(',')) {
        const pm = /^(\w+)(\??):\s*(.+)$/.exec(part.trim())
        if (!pm) continue
        const [, name, optional, rawType] = pm
        if (name === '_options') continue
        const type = rawType.trim()
        const isFile = type === 'HttpFile'
        const isScalar = type === 'string' || type === 'number' || type === 'boolean'
        params.push({ name, optional: optional === '?', isFile, isBody: !isFile && !isScalar })
      }
    }
    methods[m[1]] = params
  }
  return methods
}

/**
 * Verb and path, read off the request-factory bodies.
 *
 * Every method appears in several factory classes with the same verb and path, so the
 * first sighting wins.
 */
function parseEndpoints(js: string): Record<string, { http: RestMethod['http']; path: string }> {
  const endpoints: Record<string, { http: RestMethod['http']; path: string }> = {}
  let name: string | null = null
  let path: string | null = null

  for (const line of js.split('\n')) {
    // `async` prefix since 2.27; older builds wrap the body in `__async(this, …)`.
    const decl = /^ {2}(?:async\s+)?([a-z]\w*)\([^)]*\)\s*\{$/.exec(line)
    if (decl) {
      name = decl[1]
      path = null
      continue
    }
    const p = /const localVarPath = "([^"]+)"/.exec(line)
    if (p) {
      path = p[1]
      continue
    }
    const verb = /makeRequestContext\(localVarPath, "([A-Z]+)"/.exec(line)
    if (verb && name && path && !endpoints[name]) {
      endpoints[name] = { http: verb[1] as RestMethod['http'], path }
    }
  }
  return endpoints
}

export function parseCatalog(dts: string, js: string): RestMethod[] {
  const signatures = parseSignatures(dts)
  const endpoints = parseEndpoints(js)

  return Object.keys(signatures)
    .filter((name) => endpoints[name])
    .sort()
    .map((name) => ({
      key: name,
      label: labelOf(name),
      group: groupOf(endpoints[name].path),
      http: endpoints[name].http,
      path: endpoints[name].path,
      params: signatures[name],
      sample: SAMPLES[name],
    }))
}

export type GenStage = 'signatures' | 'endpoints' | 'parsing'

/** Parsed catalogs are kept for the page: switching back and forth costs one fetch. */
const cache = new Map<string, RestMethod[]>()

function sourceUrl(version: string, file: string): string {
  return `https://cdn.jsdelivr.net/npm/${NPM_PACKAGE.rest}@${version}/dist/${file}`
}

/**
 * Fetches and parses the catalog for one version. `onStage` reports which of the two
 * downloads is in flight — together they are several megabytes, so the UI says what
 * it is waiting on rather than showing an unexplained pause.
 */
export async function generateCatalog(
  version: string,
  onStage?: (stage: GenStage) => void,
): Promise<RestMethod[]> {
  const cached = cache.get(version)
  if (cached) return cached

  onStage?.('signatures')
  const dtsResp = await fetch(sourceUrl(version, 'index.d.ts'))
  if (!dtsResp.ok) throw new Error(`index.d.ts for ${version} returned ${dtsResp.status}`)
  const dts = await dtsResp.text()

  onStage?.('endpoints')
  const jsResp = await fetch(sourceUrl(version, 'index.js'))
  if (!jsResp.ok) throw new Error(`index.js for ${version} returned ${jsResp.status}`)
  const js = await jsResp.text()

  onStage?.('parsing')
  const methods = parseCatalog(dts, js)
  if (!methods.length) {
    /** Names the half that failed: these parses read the SDK's own build output, whose shape can change. */
    const signatures = Object.keys(parseSignatures(dts)).length
    const endpoints = Object.keys(parseEndpoints(js)).length
    throw new Error(
      `nothing matched in ${NPM_PACKAGE.rest}@${version} — ` +
        `${signatures} signatures, ${endpoints} endpoints found; that build's output shape is not one this parser knows`,
    )
  }

  cache.set(version, methods)
  return methods
}
