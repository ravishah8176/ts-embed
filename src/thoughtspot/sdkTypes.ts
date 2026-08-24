import type {
  AppViewConfigProp,
  LiveboardViewConfigProp,
  SearchViewConfigProp,
  SpotterEmbedViewConfigProp,
} from '../studio/embeds/viewConfigSchema.generated'

/**
 * The shape of the ThoughtSpot SDKs, declared here rather than imported from them.
 *
 * Neither SDK is a dependency of this app: every version, including the one the app
 * starts at, is fetched at runtime from a CDN, so there is no package on disk to take
 * types from. What that leaves is this file — a declaration of exactly the surface the
 * app touches, which is small because the app drives the SDKs reflectively: view
 * configs are edited as plain JSON against `VIEW_CONFIG_SCHEMA`, enum members are
 * resolved by name off the loaded module, and REST methods are dispatched by string
 * key from `catalog.ts`.
 *
 * The trade-off is real and worth stating: these types describe the surface, not the
 * value types behind it. A misspelled view-config prop is still caught — the prop
 * names come from the generated schema, which is generated from a published build's
 * own type definitions — but a prop given the wrong *kind* of value is not, and lands
 * as an SDK-side error at render instead of a compile error. `viewConfigSchema.generated.ts`
 * carries each prop's kind, and the config panel validates against it at runtime.
 */

/** A member of one of the SDK's enums, as it exists at runtime: name → wire value. */
export type SdkEnum = Record<string, string | number>

/** Enum members are compared and passed around by value, never constructed here. */
export type AuthType = string
export type HostEvent = string | number
export type EmbedEvent = string | number

/** `init()`'s config. Open, because the panel can set any prop the loaded build reads. */
export interface EmbedConfig {
  thoughtSpotHost: string
  authType: AuthType
  [prop: string]: unknown
}

/** What `EmbedEvent.ALL` delivers. Every field is optional — the SDK's own shape. */
export interface EmbedEventPayload {
  type?: string
  status?: string
  data?: unknown
  [prop: string]: unknown
}

/**
 * The emitter `init()` returns, for the SSO-popup flow. `undefined` is part of the
 * SDK's signature, not a convenience: it returns nothing for auth types with no
 * events to emit.
 */
export interface AuthEventEmitter {
  on(event: string | number, handler: (payload?: unknown) => void): void
  emit(event: string | number, ...args: unknown[]): void
}

/**
 * One embed. All four classes share this surface, which is all the Studio uses —
 * it mounts, listens, triggers host events, and tears down.
 */
export interface EmbedInstance {
  render(): unknown
  destroy(): void
  on(event: EmbedEvent, handler: (payload: EmbedEventPayload) => void): unknown
  trigger(event: HostEvent, params?: unknown): Promise<unknown>
}

export type AppEmbed = EmbedInstance
export type LiveboardEmbed = EmbedInstance
export type SearchEmbed = EmbedInstance
export type SpotterEmbed = EmbedInstance

/** Constructor of any embed class, as reached off the loaded module. */
export type EmbedClass = new (container: HTMLElement, config: unknown) => EmbedInstance

/**
 * View configs, keyed by the prop names the generator read out of a published build.
 *
 * Values are `unknown` — see the note at the top of this file. Every prop is optional
 * because the SDK's own defaults apply to anything left out, which is what makes a
 * partial config in the panel meaningful.
 */
export type AppViewConfig = Partial<Record<AppViewConfigProp, unknown>>
export type LiveboardViewConfig = Partial<Record<LiveboardViewConfigProp, unknown>>
export type SearchViewConfig = Partial<Record<SearchViewConfigProp, unknown>>
export type SpotterEmbedViewConfig = Partial<Record<SpotterEmbedViewConfigProp, unknown>>

/**
 * The Visual Embed SDK module.
 *
 * The named members are the ones the app reaches for by name; the index signature
 * covers the rest, since `sdkEnums.ts` looks enums up by the name the generated
 * schema recorded and the set of those differs by version.
 */
export interface EmbedSdkModule {
  init(config: EmbedConfig): AuthEventEmitter | undefined
  AppEmbed: EmbedClass
  LiveboardEmbed: EmbedClass
  SearchEmbed: EmbedClass
  SpotterEmbed: EmbedClass
  Action: SdkEnum
  AuthEvent: SdkEnum
  AuthStatus: SdkEnum
  AuthFailureType: SdkEnum
  AuthType: SdkEnum
  EmbedEvent: SdkEnum
  HostEvent: SdkEnum
  HomePage: SdkEnum
  HomePageSearchBarMode: SdkEnum
  PrimaryNavbarVersion: SdkEnum
  [name: string]: unknown
}

/**
 * The aggregate REST client. Indexed rather than enumerated: `catalog.ts` dispatches
 * by method name, and which names exist is exactly what changes between versions —
 * `methodAvailability.ts` reconciles the catalog against the prototype at runtime.
 */
export interface ThoughtSpotRestApi {
  [method: string]: (...args: never[]) => Promise<unknown>
}

/** Config builders. The `unknown` return is passed straight back to the constructor. */
export interface RestSdkModule {
  ThoughtSpotRestApi: new (config: unknown) => ThoughtSpotRestApi
  createBasicConfig(host: string): unknown
  createBearerAuthenticationConfig(host: string, token: () => Promise<string>): unknown
  [name: string]: unknown
}
