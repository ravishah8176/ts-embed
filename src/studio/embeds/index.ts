import type { AppEmbed, LiveboardEmbed, SearchEmbed, SpotterEmbed } from '@thoughtspot/visual-embed-sdk'
import type { EmbedType } from '../constants'
import { createAppEmbed } from './appEmbed'
import { createLiveboardEmbed } from './liveboardEmbed'
import { createSearchEmbed } from './searchEmbed'
import { createSpotterEmbed } from './spotterEmbed'

export type AnyEmbed = AppEmbed | LiveboardEmbed | SearchEmbed | SpotterEmbed

/** Maps each embed type to the factory that builds it. Add per-embed config in the factory file. */
export const EMBED_FACTORIES: Record<EmbedType, (container: HTMLDivElement) => AnyEmbed> = {
  app: createAppEmbed,
  liveboard: createLiveboardEmbed,
  search: createSearchEmbed,
  spotter: createSpotterEmbed,
}
