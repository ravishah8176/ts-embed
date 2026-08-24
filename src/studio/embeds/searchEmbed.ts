import type { SearchEmbed, SearchViewConfig } from '../../thoughtspot/sdkTypes'
import { embedSdk } from '../../thoughtspot/sdkLoader'
import { embedConfig } from '../config'

/**
 * Search embed (SearchEmbed).
 *
 * `dataSources` defaults to the configured worksheet/data source. Everything in
 * `SearchViewConfig` — including `searchOptions`, to preload a query — is editable
 * from the Embed config panel at runtime, so this is only the starting point.
 */
export function searchDefaults(): SearchViewConfig {
  return {
    dataSources: embedConfig.dataSourceId ? [embedConfig.dataSourceId] : undefined,
  }
}

export function createSearchEmbed(
  container: HTMLDivElement,
  config: SearchViewConfig,
): SearchEmbed {
  return new (embedSdk().SearchEmbed)(container, config)
}
