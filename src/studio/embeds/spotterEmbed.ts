import type { SpotterEmbed, SpotterEmbedViewConfig } from '../../thoughtspot/sdkTypes'
import { embedSdk } from '../../thoughtspot/sdkLoader'

/**
 * Spotter embed (SpotterEmbed) — conversational AI, bound to a worksheet/model.
 *
 * The config is whatever the user's source builds; this only constructs the embed
 * from it, against whichever SDK version is loaded. A shared-conversation link is
 * one line of source away — `window.location.hash` is readable there, since the
 * source is executed rather than parsed.
 */
export function createSpotterEmbed(
  container: HTMLDivElement,
  config: SpotterEmbedViewConfig,
): SpotterEmbed {
  return new (embedSdk().SpotterEmbed)(container, config)
}
