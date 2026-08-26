import type { LiveboardEmbed, LiveboardViewConfig } from '../../thoughtspot/sdkTypes'
import { embedSdk } from '../../thoughtspot/sdkLoader'

/**
 * Liveboard embed (LiveboardEmbed). Needs a real `liveboardId` in the source.
 *
 * The config is whatever the user's source builds; this only constructs the embed
 * from it, against whichever SDK version is loaded.
 */
export function createLiveboardEmbed(
  container: HTMLDivElement,
  config: LiveboardViewConfig,
): LiveboardEmbed {
  return new (embedSdk().LiveboardEmbed)(container, config)
}
