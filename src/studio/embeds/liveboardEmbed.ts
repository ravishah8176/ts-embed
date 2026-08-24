import type { LiveboardEmbed, LiveboardViewConfig } from '../../thoughtspot/sdkTypes'
import { embedSdk } from '../../thoughtspot/sdkLoader'
import { embedConfig } from '../config'

/**
 * Liveboard embed (LiveboardEmbed).
 *
 * Needs a real `liveboardId`; it defaults to VITE_TS_LIVEBOARD_ID and can be typed
 * straight into the Embed config panel instead. Every other prop of
 * `LiveboardViewConfig` is editable there too — this is only the starting point.
 */
export function liveboardDefaults(): LiveboardViewConfig {
  return {
    liveboardId: embedConfig.liveboardId,
    fullHeight: true,
  }
}

export function createLiveboardEmbed(
  container: HTMLDivElement,
  config: LiveboardViewConfig,
): LiveboardEmbed {
  return new (embedSdk().LiveboardEmbed)(container, config)
}
