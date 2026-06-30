import { SearchEmbed } from '@thoughtspot/visual-embed-sdk'
import { embedConfig } from '../config'

/**
 * Search embed (SearchEmbed).
 *
 * `dataSources` defaults to the configured worksheet/data source. Edit
 * anything in `SearchViewConfig` here — e.g. add `searchOptions` to preload
 * a query:
 *   searchOptions: { searchTokenString: '[Revenue] [Product] top 10', executeSearch: true }
 */
export function createSearchEmbed(container: HTMLDivElement): SearchEmbed {
  return new SearchEmbed(container, {
    frameParams: { width: '100%', height: '100%' },

    // ───────── customize from here ─────────
    dataSources: embedConfig.dataSourceId ? [embedConfig.dataSourceId] : undefined,
    // ───────────────────────────────────────
  })
}
