import { embedSdk, loadedVersion } from '../../thoughtspot/sdkLoader'

/**
 * Resolves SDK enums by name at runtime.
 *
 * The config schema is generated from the SDK's type definitions, so it can only
 * carry an enum's *name* (`'Action'`, `'HomePageSearchBarMode'`, …). The
 * `Action.Save`-style names the code preview prints come from the enum object on the
 * loaded SDK instead, so they can never drift from the values the embed is given.
 *
 * An enum the loaded SDK does not export resolves to no options, and the preview
 * falls back to printing the raw value.
 */

interface EnumOption {
  /** Member name, e.g. `SpotterChatRename`. */
  label: string
  /** Wire value the SDK expects, e.g. `spotterChatRename`. */
  value: string | number
}

const cache = new Map<string, EnumOption[]>()

function enumOptions(name?: string): EnumOption[] {
  if (!name) return []
  const key = `${loadedVersion('embed') ?? '?'}:${name}`
  const cached = cache.get(key)
  if (cached) return cached

  const source = (embedSdk() as unknown as Record<string, unknown>)[name]
  const options: EnumOption[] =
    source && typeof source === 'object'
      ? Object.entries(source as Record<string, string | number>)
          .filter(([member, value]) => isNaN(Number(member)) && (typeof value === 'string' || typeof value === 'number'))
          .map(([member, value]) => ({ label: member, value }))
          .sort((a, b) => a.label.localeCompare(b.label))
      : []

  cache.set(key, options)
  return options
}

/** `('Action', 'spotterChatRename')` → `'SpotterChatRename'`, or null if unknown. */
export function enumMemberName(name: string | undefined, value: unknown): string | null {
  if (!name) return null
  const hit = enumOptions(name).find((o) => o.value === value)
  return hit ? hit.label : null
}

/** `('Action', 'SpotterChatRename')` → `'spotterChatRename'`, or null if unknown. */
export function enumMemberValue(name: string, member: string): string | number | null {
  const hit = enumOptions(name).find((o) => o.label === member)
  return hit ? hit.value : null
}
