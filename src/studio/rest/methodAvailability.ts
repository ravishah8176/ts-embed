import type { RestMethod } from './catalog'
import { REST_METHODS } from './catalog'

/**
 * Reconciles the build-time method catalog with the SDK version actually loaded.
 *
 * `catalog.ts` is generated from the package installed in `node_modules`, so it
 * describes one version — the pinned one. The explorer can call any published
 * version, which means the catalog is a description of a *different* build than the
 * one answering the calls: methods it lists may not exist, and methods the loaded
 * build has may be missing from it.
 *
 * The loaded client itself is the authority on what can be called, so its prototype
 * is read at runtime and the two are merged: catalog entries keep their signature,
 * verb, path and sample; entries the loaded build lacks are marked unavailable; and
 * methods only the loaded build has are synthesised so they can still be called,
 * with no metadata to describe them.
 */

/** Group the synthesised methods land in, listed after the real sections. */
export const UNCATALOGUED_GROUP = 'Not in this build’s catalog'

export interface ExplorerMethod extends RestMethod {
  /** The loaded client has this method. */
  available: boolean
  /** Synthesised from the loaded client — no signature, verb or path is known. */
  synthetic?: boolean
}

/**
 * Method names on a client instance.
 *
 * Walks the prototype chain because the aggregate client inherits from the
 * per-service classes, and drops the `…WithHttpInfo` twins the newer builds expose
 * alongside every method — they are the same endpoint, returning the raw response.
 */
export function clientMethodNames(api: object): Set<string> {
  const names = new Set<string>()
  for (let proto = Object.getPrototypeOf(api); proto && proto !== Object.prototype; ) {
    for (const name of Object.getOwnPropertyNames(proto)) {
      if (name === 'constructor' || name.startsWith('_') || name.endsWith('WithHttpInfo')) continue
      const value = (proto as Record<string, unknown>)[name]
      if (typeof value === 'function') names.add(name)
    }
    proto = Object.getPrototypeOf(proto)
  }
  return names
}

/** `searchMetadata` → `Search Metadata`, for a method the catalog cannot name. */
function humanise(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase())
}

function synthesise(key: string): ExplorerMethod {
  return {
    key,
    label: humanise(key),
    group: UNCATALOGUED_GROUP,
    http: 'POST',
    path: `rest.${key}(…)`,
    params: [{ name: 'args', optional: true, isBody: true, isFile: false }],
    available: true,
    synthetic: true,
  }
}

export interface MethodSet {
  list: ExplorerMethod[]
  /** Catalogued methods the loaded build can actually call. */
  availableCount: number
  /** Catalogued methods the loaded build does not have. */
  missingCount: number
  /** Methods the loaded build has that the catalog does not describe. */
  extraCount: number
}

/**
 * The method list to show. `available` of `null` means the client has not resolved
 * yet, and everything is treated as callable rather than flickering to disabled.
 *
 * `catalog` defaults to the shipped snapshot; the explorer passes the catalog it
 * generated for the loaded version, in which case the two agree and nothing is marked
 * absent or synthesised.
 */
export function buildMethodSet(
  available: Set<string> | null,
  catalog: RestMethod[] = REST_METHODS,
): MethodSet {
  if (!available) {
    return {
      list: catalog.map((m) => ({ ...m, available: true })),
      availableCount: catalog.length,
      missingCount: 0,
      extraCount: 0,
    }
  }

  const catalogued = catalog.map((m) => ({ ...m, available: available.has(m.key) }))
  const known = new Set(catalog.map((m) => m.key))
  const extras = [...available].filter((k) => !known.has(k)).sort().map(synthesise)

  return {
    list: [...catalogued, ...extras],
    availableCount: catalogued.filter((m) => m.available).length,
    missingCount: catalogued.filter((m) => !m.available).length,
    extraCount: extras.length,
  }
}

/**
 * Positional arguments for a synthesised method: an array is spread, anything else
 * is passed as the single first argument — which covers the two shapes the SDK's
 * generated methods take (one request body, or one id).
 */
export function syntheticArgs(parsed: unknown): unknown[] {
  if (parsed === undefined || parsed === null) return []
  if (Array.isArray(parsed)) return parsed
  if (typeof parsed === 'object' && Object.keys(parsed as object).length === 0) return []
  return [parsed]
}
