/**
 * Generates `src/studio/embeds/viewConfigSchema.generated.ts` from a published Visual
 * Embed SDK's `.d.ts` files.
 *
 * The config panel's Code tab prints a config as source, which means naming enum
 * values (`Action.Save`, not `'save'`). That needs to know which props are backed by
 * which SDK enum — read out of the SDK's own type definitions and committed as
 * generated code, rather than hand-maintained and rotting on every SDK bump.
 *
 * The SDK is not a dependency of this app, so the package is downloaded rather than
 * read from `node_modules`. Which version is the app's snapshot lives in
 * `scripts/sdk-versions.json`; pass a version or tarball URL to generate from another:
 *
 *   npm run gen:embed-schema              # the pinned version
 *   npm run gen:embed-schema -- 1.51.0    # and update the pin to it
 */
import fs from 'node:fs'
import path from 'node:path'
import { fetchSdkPackage, readPins } from './sdkSource.mjs'

const EMBED_PKG = '@thoughtspot/visual-embed-sdk'
const REST_PKG = '@thoughtspot/rest-api-sdk'
const PINS_FILE = 'scripts/sdk-versions.json'
const OUT_FILE = 'src/studio/embeds/viewConfigSchema.generated.ts'

const pins = readPins()
const embedSpec = process.argv[2] ?? pins[EMBED_PKG]
const embed = await fetchSdkPackage(EMBED_PKG, embedSpec)
const rest = await fetchSdkPackage(REST_PKG, pins[REST_PKG])
const TYPES_ROOT = path.join(embed.root, 'lib/src')

if (process.argv[2]) {
  fs.writeFileSync(PINS_FILE, JSON.stringify({ ...pins, [EMBED_PKG]: embedSpec }, null, 2) + '\n')
}

/** The root view-config interface each Studio embed type is built from. */
const EMBED_VIEW_CONFIGS = {
  app: 'AppViewConfig',
  liveboard: 'LiveboardViewConfig',
  search: 'SearchViewConfig',
  spotter: 'SpotterEmbedViewConfig',
}

/**
 * Props the Studio owns rather than the user: the iframe has to fill the surface,
 * and a pre-render container/id would move the embed out of the Studio's stage.
 */
const OMIT_PROPS = new Set(['preRenderContainer', 'insertAsSibling'])

function listDts(dir) {
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...listDts(p))
    else if (entry.name.endsWith('.d.ts') && !entry.name.includes('.spec.')) out.push(p)
  }
  return out
}

const depthOf = (s) =>
  (s.match(/[{([]/g) || []).length - (s.match(/[})\]]/g) || []).length

/** Collects every interface in the SDK, plus the names of its runtime enums. */
function readSdk() {
  const interfaces = new Map()
  const enums = new Set()

  for (const file of listDts(TYPES_ROOT)) {
    const lines = fs.readFileSync(file, 'utf8').split('\n')
    for (let i = 0; i < lines.length; i++) {
      const enumMatch = /^\s*export declare (?:const )?enum (\w+)/.exec(lines[i])
      if (enumMatch) enums.add(enumMatch[1])

      const head = /^\s*(?:export )?(?:declare )?interface (\w+)(?:<[^>]*>)?(?:\s+extends\s+([^{]+))?\s*\{/.exec(lines[i])
      if (!head) continue

      const members = []
      let depth = depthOf(lines[i])
      let doc = []
      let buffer = null

      let j = i + 1
      for (; j < lines.length && depth > 0; j++) {
        const line = lines[j]
        const trimmed = line.trim()

        if (buffer) {
          buffer.type.push(trimmed)
          if (depth + depthOf(line) === 1) {
            members.push({
              name: buffer.name,
              type: buffer.type.join(' ').replace(/;$/, '').replace(/\s+/g, ' ').trim(),
              doc: buffer.doc,
            })
            buffer = null
          }
          depth += depthOf(line)
          continue
        }

        if (trimmed.startsWith('/**') || trimmed.startsWith('*')) {
          if (trimmed.startsWith('/**')) doc = []
          doc.push(trimmed)
          depth += depthOf(line)
          continue
        }

        const member = depth === 1 && /^(\w+)(\?)?:\s*(.*)$/.exec(trimmed)
        if (member) {
          const type = member[3]
          if (depth + depthOf(line) === 1) {
            members.push({
              name: member[1],
              type: type.replace(/;$/, '').replace(/\s+/g, ' ').trim(),
              doc,
            })
          } else {
            buffer = { name: member[1], type: [type], doc }
          }
          doc = []
          depth += depthOf(line)
          continue
        }

        doc = []
        depth += depthOf(line)
      }

      interfaces.set(head[1], { extends: (head[2] || '').trim(), members })
      i = j - 1
    }
  }
  return { interfaces, enums }
}

/**
 * Flattens an interface and everything it extends into one prop list.
 *
 * Later declarations win, so own members override inherited ones, and each prop
 * remembers the interface it came from — that is what the panel groups by.
 * `Omit<X, 'a' | 'b'>` in an extends clause is honoured; the SDK uses it to drop
 * props that do not apply to an embed (e.g. `primaryAction` on Spotter).
 */
function flatten(interfaces, name, seen = new Set()) {
  if (seen.has(name)) return []
  seen.add(name)
  const iface = interfaces.get(name)
  if (!iface) return []

  const inherited = []
  if (iface.extends) {
    for (const part of iface.extends.split(/,(?![^<]*>)/)) {
      const clause = part.trim()
      const omit = /^Omit<\s*(\w+)\s*,\s*(.+?)>$/.exec(clause)
      if (omit) {
        const dropped = omit[2].split('|').map((s) => s.trim().replace(/['"]/g, ''))
        inherited.push(...flatten(interfaces, omit[1], seen).filter((p) => !dropped.includes(p.name)))
      } else {
        inherited.push(...flatten(interfaces, clause.replace(/<.*/, ''), seen))
      }
    }
  }

  const own = iface.members.map((m) => ({ ...m, owner: name }))
  const byName = new Map()
  for (const prop of [...inherited, ...own]) byName.set(prop.name, prop)
  return [...byName.values()]
}

/** Picks the control the panel renders for a prop, from its declared type. */
function classify(type, enums) {
  const t = type.trim()
  if (t === 'boolean') return { kind: 'boolean' }
  if (t === 'string') return { kind: 'string' }
  if (t === 'number') return { kind: 'number' }
  if (t === 'string[]' || t === 'Array<string>') return { kind: 'stringList' }
  if (t === 'Action[]') return { kind: 'enumList', enumName: 'Action' }

  const literals = t.split('|').map((s) => s.trim())
  if (literals.length > 1 && literals.every((s) => /^'[^']*'$/.test(s))) {
    return { kind: 'select', literals: literals.map((s) => s.slice(1, -1)) }
  }
  if (literals.length > 1 && literals.every((s) => /^-?\d+$/.test(s))) {
    return { kind: 'select', literals }
  }

  const enumArray = /^(\w+)\[\]$/.exec(t)
  if (enumArray && enums.has(enumArray[1])) return { kind: 'enumList', enumName: enumArray[1] }
  if (enums.has(t)) return { kind: 'select', enumName: t }

  const nonNull = literals.filter((s) => s !== 'undefined' && s !== 'null')
  if (nonNull.length && nonNull.every((s) => enums.has(s) || /^'[^']*'$/.test(s))) {
    const only = nonNull.find((s) => enums.has(s))
    if (only) return { kind: 'select', enumName: only }
  }
  if (nonNull.includes('string')) return { kind: 'string' }

  return { kind: 'json' }
}

const { interfaces, enums } = readSdk()
const sdkVersion = embed.version
const restSdkVersion = rest.version

const schema = {}
for (const [embedType, rootInterface] of Object.entries(EMBED_VIEW_CONFIGS)) {
  const props = flatten(interfaces, rootInterface)
    .filter((p) => !OMIT_PROPS.has(p.name))
    .map((p) => {
      const { kind, enumName } = classify(p.type, enums)
      return { name: p.name, kind, ...(enumName ? { enumName } : {}) }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
  schema[embedType] = props
}

/**
 * Prop names as a union per embed type, so `sdkTypes.ts` can build the view-config
 * types from them. With the SDK not on disk there is nothing else to check a config
 * literal against — this is what still catches a misspelled prop at compile time.
 */
const propUnion = (embedType, rootInterface) => {
  const names = schema[embedType].map((p) => `'${p.name}'`)
  return `/** Every prop of \`${rootInterface}\` in ${sdkVersion}. */\nexport type ${rootInterface}Prop =\n  | ${names.join('\n  | ')}\n`
}

const banner = `/* eslint-disable */
/**
 * GENERATED — do not edit by hand.
 *
 * Every prop of every embed's \`ViewConfig\`, read out of
 * @thoughtspot/visual-embed-sdk ${sdkVersion}'s type definitions, with the SDK enum
 * backing it. Used by the config panel's Code tab to print enum values by name, and by
 * \`sdkTypes.ts\` to type the view configs — the SDK is not a dependency of this app, so
 * these names are the only compile-time record of its surface.
 * Props are matched by name only, so this stays useful when a different SDK version
 * is loaded — a prop it does not list is passed through untouched.
 *
 * Regenerate with: npm run gen:embed-schema
 */
import type { EmbedType } from '../constants'

/** How a prop's value is shaped, which is what deciding how to print it needs. */
export type PropKind = 'boolean' | 'string' | 'number' | 'select' | 'stringList' | 'enumList' | 'json'

export interface PropSpec {
  name: string
  kind: PropKind
  /** SDK enum whose members this prop's value comes from, resolved at runtime. */
  enumName?: string
}

/**
 * The versions these artifacts were generated from, pinned in
 * \`scripts/sdk-versions.json\`. Nothing is bundled: this is the version the app falls
 * back to from the CDN when npm's latest cannot be resolved or will not load.
 */
export const SNAPSHOT_EMBED_SDK_VERSION = '${sdkVersion}'
export const SNAPSHOT_REST_SDK_VERSION = '${restSdkVersion}'

export const VIEW_CONFIG_TYPE_NAME: Record<EmbedType, string> = ${JSON.stringify(EMBED_VIEW_CONFIGS, null, 2)}

export const VIEW_CONFIG_SCHEMA: Record<EmbedType, PropSpec[]> = `

const unions = Object.entries(EMBED_VIEW_CONFIGS)
  .map(([embedType, rootInterface]) => propUnion(embedType, rootInterface))
  .join('\n')

fs.writeFileSync(OUT_FILE, banner + JSON.stringify(schema, null, 2) + '\n\n' + unions)

for (const [type, props] of Object.entries(schema)) {
  const counts = props.reduce((acc, p) => ({ ...acc, [p.kind]: (acc[p.kind] ?? 0) + 1 }), {})
  console.log(`${type}: ${props.length} props`, counts)
}
console.log(`wrote ${OUT_FILE}`)
