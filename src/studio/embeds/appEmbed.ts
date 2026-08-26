import type { AppEmbed, AppViewConfig } from '../../thoughtspot/sdkTypes'
import { embedSdk } from '../../thoughtspot/sdkLoader'

/**
 * Full-application embed (AppEmbed) — it embeds the whole ThoughtSpot app.
 *
 * The config is whatever the user's source builds; this only constructs the embed
 * from it, against whichever SDK version is loaded.
 */
export function createAppEmbed(container: HTMLDivElement, config: AppViewConfig): AppEmbed {
  return new (embedSdk().AppEmbed)(container, config)
}
