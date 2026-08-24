import type { EmbedType } from '../constants'
import { EMBED_CLASS_NAME } from '../constants'
import { embedDefaults, type ViewConfigValues } from './index'
import { enumMemberName } from './sdkEnums'
import { VIEW_CONFIG_SCHEMA, type PropSpec } from './viewConfigSchema.generated'

/**
 * Where a user's edited embed config lives.
 *
 * This app is deployed for embed testing, so the configs users build have to be
 * theirs and have to survive a reload — but they are per-browser scratch work, not
 * shared state, so localStorage is the whole store. A stored entry is the *complete*
 * config that was applied, not a diff against the defaults: an absent prop means
 * "the user left it unset", which is what the SDK is then given.
 */
const STORE_KEY = 'ts_embed_view_configs_v1'

type StoredConfigs = Partial<Record<EmbedType, ViewConfigValues>>

/** Drops keys whose value is `undefined` so "unset" is always absence, never a key. */
function pruneConfig(values: ViewConfigValues): ViewConfigValues {
  const out: ViewConfigValues = {}
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) out[key] = value
  }
  return out
}

/**
 * Both accessors swallow their errors: with site data disabled the panel still
 * works for this page load, it just cannot remember configs across reloads.
 */
function readStore(): StoredConfigs {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as StoredConfigs
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeStore(store: StoredConfigs) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store))
  } catch {
    /* empty */
  }
}

/** The config an embed should be built with: the user's if they saved one. */
export function loadConfig(type: EmbedType): ViewConfigValues {
  return pruneConfig(readStore()[type] ?? embedDefaults(type))
}

export function saveConfig(type: EmbedType, values: ViewConfigValues) {
  writeStore({ ...readStore(), [type]: pruneConfig(values) })
}

/** Forgets the user's config so this embed falls back to the built-in defaults. */
export function clearConfig(type: EmbedType) {
  const store = readStore()
  delete store[type]
  writeStore(store)
}

/** Prop names whose value differs between two configs — the panel's dirty state. */
export function diffKeys(a: ViewConfigValues, b: ViewConfigValues): string[] {
  const names = new Set([...Object.keys(pruneConfig(a)), ...Object.keys(pruneConfig(b))])
  return [...names].filter((name) => stableStringify(a[name]) !== stableStringify(b[name])).sort()
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null'
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([x], [y]) => x.localeCompare(y))
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`
}

/* ----------------------------------------------------------------------------
 * Code preview
 * -------------------------------------------------------------------------- */

const INDENT = '  '

function literal(value: unknown, depth: number): string {
  if (typeof value === 'string') return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
  if (typeof value === 'number' || typeof value === 'boolean' || value === null) return String(value)
  if (Array.isArray(value)) {
    if (!value.length) return '[]'
    const items = value.map((v) => literal(v, depth + 1))
    const inline = `[${items.join(', ')}]`
    if (inline.length <= 68 && !inline.includes('\n')) return inline
    const pad = INDENT.repeat(depth + 1)
    return `[\n${items.map((i) => pad + i).join(',\n')},\n${INDENT.repeat(depth)}]`
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).filter(([, v]) => v !== undefined)
    if (!entries.length) return '{}'
    const pad = INDENT.repeat(depth + 1)
    const body = entries.map(([k, v]) => `${pad}${k}: ${literal(v, depth + 1)},`).join('\n')
    return `{\n${body}\n${INDENT.repeat(depth)}}`
  }
  return 'undefined'
}

/**
 * Renders a config as the source a user would paste into their own app.
 *
 * Values that came from an SDK enum are printed as `Action.Save` rather than as
 * the `'save'` wire value, and every enum used is collected into the import line —
 * the point of the preview is code that compiles where it lands, not a JSON dump.
 */
export function configToCode(type: EmbedType, values: ViewConfigValues): string {
  const specs = new Map(VIEW_CONFIG_SCHEMA[type].map((s: PropSpec) => [s.name, s]))
  const usedEnums = new Set<string>()
  const embedClass = EMBED_CLASS_NAME[type]

  const lines: string[] = []
  for (const [name, value] of Object.entries(pruneConfig(values)).sort(([a], [b]) => a.localeCompare(b))) {
    const spec = specs.get(name)
    const enumName = spec?.enumName

    if (enumName && spec?.kind === 'enumList' && Array.isArray(value)) {
      const items = value.map((v) => {
        const member = enumMemberName(enumName, v)
        if (member) usedEnums.add(enumName)
        return member ? `${enumName}.${member}` : literal(v, 1)
      })
      const inline = `[${items.join(', ')}]`
      const pad = INDENT.repeat(2)
      lines.push(
        `${INDENT}${name}: ` +
          (inline.length <= 68
            ? inline
            : `[\n${items.map((i) => pad + i).join(',\n')},\n${INDENT}]`) +
          ',',
      )
      continue
    }

    if (enumName && spec?.kind === 'select') {
      const member = enumMemberName(enumName, value)
      if (member) {
        usedEnums.add(enumName)
        lines.push(`${INDENT}${name}: ${enumName}.${member},`)
        continue
      }
    }

    lines.push(`${INDENT}${name}: ${literal(value, 1)},`)
  }

  const imports = [embedClass, ...[...usedEnums].sort()].join(', ')
  const body = lines.length ? `{\n${lines.join('\n')}\n}` : '{}'
  return (
    `import { ${imports} } from '@thoughtspot/visual-embed-sdk'\n\n` +
    `const embed = new ${embedClass}(container, ${body})\n\n` +
    `embed.render()\n`
  )
}
