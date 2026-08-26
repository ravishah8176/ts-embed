import { embedSdk } from '../../thoughtspot/sdkLoader'
import { fetchBackendToken } from '../../thoughtspot/init'
import type { EmbedType } from '../constants'
import type { ViewConfigValues } from './index'

/**
 * The user's embed source: where it is kept, and what running it produces.
 *
 * There is one artifact in this app now — the source in the config panel — so its
 * whole life is one file. It is stored per embed type, re-run on load, and what it
 * builds is the config the live iframe is mounted with.
 *
 * The source is not translated into a config, it is run as the app code it already
 * is, against stub embed classes that record the config they were constructed with
 * instead of mounting an iframe. A snippet copied out of the ThoughtSpot Developer
 * Playground therefore runs unedited — imports, `init()`, `render()` and all — and
 * the config it would have built is what comes back. The live iframe is still built
 * by `useStudioEmbed`; this only decides what to build it with.
 *
 * Running it, rather than parsing it, is the point. A parser reads a config that is
 * written down; it cannot read one that is *computed* — an id pulled off the URL, a
 * `customActions` handler, a value behind a ternary. Those are the configs people
 * actually arrive with, and an expression yields a value only by being evaluated.
 *
 * Because the SDK's own exports are in scope, `Action.Save` resolves to whatever the
 * loaded version means by it, with no enum table of our own in the path.
 *
 * SECURITY. This is `new Function`: arbitrary JavaScript at this page's privilege.
 * Injecting a scope is not a sandbox — `globalThis` stays reachable — so source run
 * here can read this browser's storage and call the REST API as the signed-in user.
 * A Worker would sandbox it but cannot pass functions back across the boundary,
 * which is half of what this exists for, so the exposure is bounded by *when* it
 * runs instead: on an explicit Apply, and on source this browser previously applied.
 * Never on a keystroke. A synchronous infinite loop in the source hangs the tab and
 * there is no interrupt for it.
 */

/**
 * Applied source, with the config it produced.
 *
 * The config is kept alongside because the source may not build the same one twice —
 * it is the last snapshot, and what the panel falls back to when a re-run fails.
 */
export interface AppliedSource {
  code: string
  config: ViewConfigValues
}

/**
 * Per-browser scratch work, so localStorage is the whole store: what a user builds
 * here has to be theirs and has to survive a reload, but it is not shared state.
 * Both accessors swallow their errors — with site data disabled the app still works
 * for this page load, it just cannot remember anything across reloads.
 */
const STORE_KEY = 'ts_embed_view_configs_v1'

type Stored = Partial<Record<EmbedType, AppliedSource>>

function readStore(): Stored {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    const parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : null
    if (!parsed || typeof parsed !== 'object') return {}
    const out: Stored = {}
    for (const [type, value] of Object.entries(parsed)) {
      const entry = value as { code?: unknown; config?: unknown }
      /* Entries without source predate it and are dropped: printing one back into
         source would be inventing source the user never wrote. */
      if (typeof entry?.code !== 'string' || !entry.code) continue
      if (!entry.config || typeof entry.config !== 'object') continue
      out[type as EmbedType] = { code: entry.code, config: entry.config as ViewConfigValues }
    }
    return out
  } catch {
    return {}
  }
}

/** What was applied to this embed last, or null if nothing ever was. */
export function loadApplied(type: EmbedType): AppliedSource | null {
  return readStore()[type] ?? null
}

export function saveApplied(type: EmbedType, entry: AppliedSource) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ ...readStore(), [type]: entry }))
  } catch {
    /* empty */
  }
}

/**
 * What a stored entry means right now.
 *
 * The source is re-run on load because that is the point of keeping it: an id read
 * off the URL has to be read again on the next page load, not remembered from the
 * last one. When the run fails — an SDK version that no longer has an enum the
 * source names, a fetch that is down — the last snapshot is served instead, so a
 * saved embed never comes back with nothing to show.
 */
export function appliedConfig(entry: AppliedSource): { config: ViewConfigValues; error?: string } {
  try {
    return { config: runConfigSource(entry.code) }
  } catch (e) {
    return { config: entry.config, error: e instanceof Error ? e.message : String(e) }
  }
}

/** `import`/`export` are illegal inside a `Function` body, and the names are injected. */
function stripModuleSyntax(src: string): string {
  return src
    .replace(/^[ \t]*import\b[\s\S]*?from\s*(['"])[^'"]*\1[ \t]*;?[ \t]*$/gm, '')
    .replace(/^[ \t]*import\s*(['"])[^'"]*\1[ \t]*;?[ \t]*$/gm, '')
    .replace(/^[ \t]*export\s+(?:default\s+)?/gm, '')
}

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/
/** Injecting these would be a syntax error in the wrapper's parameter list. */
const RESERVED = new Set(['arguments', 'eval', 'this', 'null', 'true', 'false', 'default'])

/**
 * The scope the source runs in: the loaded SDK, with anything that mounts stubbed.
 *
 * Every export of the SDK is injected under its own name, so the source's `import`
 * line can be stripped and still resolve. What is replaced is the part with side
 * effects — an embed class becomes a recorder, and `init()` becomes a no-op, because
 * the Studio has already called the real one with the user's authentication and a
 * second call from pasted source would fight it.
 *
 * Stub methods return the stub, since the snippets chain (`.on(...).render()`).
 */
function buildScope(capture: (config: ViewConfigValues) => void): {
  names: string[]
  values: unknown[]
} {
  const sdk = embedSdk() as unknown as Record<string, unknown>
  const scope = new Map<string, unknown>()

  class EmbedStub {
    constructor(_container: unknown, config?: ViewConfigValues) {
      if (config && typeof config === 'object') capture(config)
    }
    render() {
      return this
    }
    on() {
      return this
    }
    off() {
      return this
    }
    trigger() {
      return this
    }
    prerenderGeneric() {
      return this
    }
    destroy() {}
  }

  for (const [name, value] of Object.entries(sdk)) {
    if (!IDENTIFIER.test(name) || RESERVED.has(name)) continue
    /* Anything that mounts something is replaced; enums and helpers pass through. */
    scope.set(name, name.endsWith('Embed') ? EmbedStub : value)
  }
  scope.set('init', () => ({ on: () => undefined }))

  /**
   * The two helpers the playground's own templates import from sibling files, so a
   * snippet copied from there runs here without its imports being edited out. The
   * token one answers from this app's session rather than the playground's parent
   * window bridge, which is the same token the Studio's own embed already uses.
   */
  scope.set('getTokenService', () => fetchBackendToken())
  scope.set('debounceFunc', (fn: (...args: unknown[]) => unknown, wait = 200) => {
    let timer: ReturnType<typeof setTimeout> | undefined
    return (...args: unknown[]) => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => fn(...args), wait)
    }
  })

  /**
   * The container the playground's snippets name. They pass a selector or an
   * element to the constructor and the stub ignores it, but an undeclared
   * `container` would still throw before it got there.
   */
  scope.set('container', null)

  return { names: [...scope.keys()], values: [...scope.values()] }
}

function isPlainObject(value: unknown): value is ViewConfigValues {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Evaluates source and returns the view config it builds.
 *
 * A bare object literal is tried as an expression first: as a statement it is a
 * block, which either throws or means something else entirely. Only if that is not
 * what the source is does it run as a program, so nothing is executed twice.
 *
 * Throws an `Error` whose message is what the panel shows. Line numbers are not
 * offered: the offsets in a `new Function` stack count from the injected wrapper,
 * not from the user's first line.
 */
export function runConfigSource(src: string): ViewConfigValues {
  const body = stripModuleSyntax(src).trim()
  if (!body) throw new Error('Nothing to run')

  let captured: ViewConfigValues | null = null
  const { names, values } = buildScope((config) => {
    captured = config
  })
  const exec = (source: string) => new Function(...names, source)(...values) as unknown

  if (body.startsWith('{')) {
    try {
      const value = exec(`"use strict";\nreturn (${body})`)
      if (isPlainObject(value)) return value
    } catch {
      /* not an object literal — run it as a program below */
    }
  }

  const returned = exec(`"use strict";\n${body}`)
  if (captured) return captured
  if (isPlainObject(returned)) return returned
  throw new Error('No config here — this source has to construct an embed, or be a config object')
}

