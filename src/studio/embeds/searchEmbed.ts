import type { SearchEmbed, SearchViewConfig } from '../../thoughtspot/sdkTypes'
import { embedSdk } from '../../thoughtspot/sdkLoader'

/**
 * Search embed (SearchEmbed). Needs `dataSources` in the source to search anything.
 *
 * The config is whatever the user's source builds; this only constructs the embed
 * from it, against whichever SDK version is loaded.
 */
export function createSearchEmbed(
  container: HTMLDivElement,
  config: SearchViewConfig,
): SearchEmbed {
  return new (embedSdk().SearchEmbed)(container, config)
}
