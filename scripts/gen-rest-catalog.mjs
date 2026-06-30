/*
 * Generates src/studio/rest/catalog.ts — the full list of methods on the
 * @thoughtspot/rest-api-sdk aggregate REST client, used by the Embed Studio's
 * REST API explorer tab.
 *
 * It reads ONLY from the INSTALLED npm package (node_modules), so the workflow
 * when ThoughtSpot ships new endpoints is simply:
 *
 *   1. bump "@thoughtspot/rest-api-sdk" in package.json
 *   2. npm install
 *   3. npm run gen:rest-catalog
 *
 * No manual edits to catalog.ts. Two facts are extracted per method:
 *   • signature (argument names + types) ← dist/index.d.ts  (PromiseThoughtSpotRestApi)
 *   • HTTP verb + path                   ← dist/index.js     (request factory bodies)
 *
 * Run with: node scripts/gen-rest-catalog.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = resolve(root, 'node_modules/@thoughtspot/rest-api-sdk/dist')
const OUT = resolve(root, 'src/studio/rest/catalog.ts')

// ── 1) Argument signatures from the typed aggregate client ──────────────────
const dts = readFileSync(`${DIST}/index.d.ts`, 'utf8').split('\n')
const methods = {}
let inClass = false
for (const line of dts) {
  if (line.includes('declare class PromiseThoughtSpotRestApi')) inClass = true
  else if (inClass && /^declare class /.test(line)) break
  if (!inClass) continue
  const m = line.match(/^\s{4}([a-z]\w*)\((.*)\): Promise</)
  if (!m || m[1] === 'constructor') continue
  const params = []
  const raw = m[2].trim()
  if (raw) {
    for (const part of raw.split(',')) {
      const pm = part.trim().match(/^(\w+)(\??):\s*(.+)$/)
      if (!pm) continue
      const [, pname, opt, ptype] = pm
      if (pname === '_options') continue
      const type = ptype.trim()
      const isFile = type === 'HttpFile'
      const isScalar = type === 'string' || type === 'number' || type === 'boolean'
      params.push({ name: pname, optional: opt === '?', isFile, isBody: !isFile && !isScalar })
    }
  }
  methods[m[1]] = params
}

// ── 2) HTTP verb + path from the request-factory bodies ─────────────────────
// The bundle defines each method in several factory classes (per-tag + aggregate),
// all with identical verb+path — dedup by method name on first sight.
const js = readFileSync(`${DIST}/index.js`, 'utf8').split('\n')
const endpoints = {}
let curName = null
let curPath = null
for (const line of js) {
  let m = line.match(/^ {2}([a-z]\w*)\([^)]*\)\s*\{$/)
  if (m) {
    curName = m[1]
    curPath = null
    continue
  }
  m = line.match(/const localVarPath = "([^"]+)"/)
  if (m) {
    curPath = m[1]
    continue
  }
  m = line.match(/makeRequestContext\(localVarPath, "([A-Z]+)"/)
  if (m && curName && curPath && !endpoints[curName]) {
    endpoints[curName] = { http: m[1], path: curPath }
  }
}

// ── 3) Friendly group from the first path segment ───────────────────────────
const GROUP_NAMES = {
  auth: 'Auth & Session', users: 'Users', groups: 'Groups', roles: 'Roles',
  metadata: 'Metadata', tags: 'Tags', security: 'Security', system: 'System',
  orgs: 'Orgs', connection: 'Connections', 'connection-configurations': 'Connections',
  schedules: 'Schedules', ai: 'AI', vcs: 'Version Control', logs: 'Logs', log: 'Logs',
  customization: 'Customization', dbt: 'DBT', calendars: 'Custom Calendars',
  template: 'Variables', webhooks: 'Webhooks', reports: 'Reports', report: 'Reports',
  data: 'Data', searchdata: 'Data', collections: 'Collections', jobs: 'Jobs',
}
const GROUP_ORDER = [
  'Auth & Session', 'Metadata', 'Data', 'Users', 'Groups', 'Roles', 'Orgs',
  'Tags', 'Collections', 'Connections', 'Schedules', 'AI', 'Security', 'System',
  'Customization', 'Webhooks', 'Reports', 'Jobs', 'Variables', 'Version Control',
  'DBT', 'Custom Calendars', 'Logs', 'Other',
]
function groupOf(path) {
  const seg = (path.match(/\/api\/rest\/2\.0\/([^/]+)/) || [])[1] || ''
  return GROUP_NAMES[seg] || (seg ? seg[0].toUpperCase() + seg.slice(1) : 'Other')
}

function labelOf(name) {
  const s = name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// Curated default editor content for common search endpoints (keyed by arg name).
const SAMPLES = {
  searchMetadata: { searchMetadataRequest: { metadata: [{ type: 'LIVEBOARD' }], record_size: 10 } },
  searchUsers: { searchUsersRequest: { record_size: 10 } },
  searchUserGroups: { searchUserGroupsRequest: { record_size: 10 } },
  searchConnection: { searchConnectionRequest: { record_size: 10 } },
  searchSchedules: { searchSchedulesRequest: { record_size: 10 } },
}

const names = Object.keys(methods).filter((n) => endpoints[n]).sort()
const missing = Object.keys(methods).filter((n) => !endpoints[n])
if (missing.length) {
  console.error('WARNING: no verb/path found for:', missing.join(', '))
}

const entries = names.map((name) => ({
  key: name,
  label: labelOf(name),
  group: groupOf(endpoints[name].path),
  http: endpoints[name].http,
  path: endpoints[name].path,
  params: methods[name],
  sample: SAMPLES[name],
}))

const banner = `/* AUTO-GENERATED by scripts/gen-rest-catalog.mjs — do not edit by hand.
   Source: the INSTALLED @thoughtspot/rest-api-sdk npm package (dist/index.d.ts + dist/index.js).
   To pick up new endpoints: bump the dependency, \`npm install\`, then \`npm run gen:rest-catalog\`. */`

const out = `${banner}
import type { ThoughtSpotRestApi } from '@thoughtspot/rest-api-sdk'

export interface RestParam {
  /** Argument name as it appears in the SDK method signature. */
  name: string
  optional: boolean
  /** A request-body object (vs. a path/query scalar). */
  isBody: boolean
  /** A file-upload arg — cannot be supplied as JSON. */
  isFile: boolean
}

export interface RestMethod {
  /** SDK method name == unique id. */
  key: string
  label: string
  group: string
  http: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  path: string
  /** Ordered call arguments. */
  params: RestParam[]
  /** Curated default editor content (keyed by arg name); optional. */
  sample?: Record<string, unknown>
}

/** Every method on the aggregate ThoughtSpot REST API v2 client (${entries.length} total). */
export const REST_METHODS: RestMethod[] = ${JSON.stringify(entries, null, 2)}

export const REST_GROUP_ORDER = ${JSON.stringify(GROUP_ORDER)}

const REST_GROUP_COLOR: Record<string, string> = {
  'Auth & Session': '#3B82F6', Metadata: '#06B6D4', Data: '#0EA5E9', Users: '#8B5CF6',
  Groups: '#A855F7', Roles: '#9333EA', Orgs: '#D946EF', Tags: '#F59E0B',
  Collections: '#EAB308', Connections: '#F97316', Schedules: '#EC4899', AI: '#14B8A6',
  Security: '#EF4444', System: '#64748B', Customization: '#10B981', Webhooks: '#06B6D4',
  Reports: '#0891B2', Jobs: '#0D9488', Variables: '#7C5CFC', 'Version Control': '#2563EB',
  DBT: '#65A30D', 'Custom Calendars': '#DB2777', Logs: '#94A3B8', Other: '#64748B',
}

export function restGroupColor(group: string): string {
  return REST_GROUP_COLOR[group] ?? '#64748B'
}

export function findRestMethod(key: string): RestMethod | undefined {
  return REST_METHODS.find((m) => m.key === key)
}

/** Build the default editor object for a method: one key per non-file arg. */
export function defaultBodyFor(m: RestMethod): Record<string, unknown> {
  if (m.sample) return m.sample
  const obj: Record<string, unknown> = {}
  for (const p of m.params) {
    if (p.isFile) continue
    obj[p.name] = p.isBody ? {} : ''
  }
  return obj
}

/** True when the method takes no JSON-supplied arguments. */
export function takesNoArgs(m: RestMethod): boolean {
  return m.params.every((p) => p.isFile)
}

/** Build the positional argument list from the parsed editor object. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildArgs(m: RestMethod, body: any): unknown[] {
  return m.params.map((p) => (p.isFile ? undefined : body?.[p.name]))
}

/** Invoke the method by name with positional args derived from \`body\`. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function invokeRest(api: ThoughtSpotRestApi, m: RestMethod, body: any): Promise<unknown> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fn = (api as any)[m.key] as (...a: unknown[]) => Promise<unknown>
  return fn.apply(api, buildArgs(m, body))
}
`

writeFileSync(OUT, out)
console.error(`Wrote ${entries.length} methods across ${new Set(entries.map((e) => e.group)).size} groups to ${OUT}`)
