import type {
  AppEmbed,
  AppViewConfig,
  LiveboardEmbed,
  LiveboardViewConfig,
  SearchEmbed,
  SearchViewConfig,
  SpotterEmbed,
  SpotterEmbedViewConfig,
} from '../../thoughtspot/sdkTypes'
import type { EmbedType } from '../constants'
import { createAppEmbed } from './appEmbed'
import { createLiveboardEmbed } from './liveboardEmbed'
import { createSearchEmbed } from './searchEmbed'
import { createSpotterEmbed } from './spotterEmbed'

export type AnyEmbed = AppEmbed | LiveboardEmbed | SearchEmbed | SpotterEmbed

/** A view config as the config panel holds it: prop name → value, untyped. */
export type ViewConfigValues = Record<string, unknown>

/** Iframe size the Studio's embed stage needs, used unless the user sets its own. */
const STAGE_FRAME_PARAMS = { width: '100%', height: '100%' }

/**
 * Builds one embed from a config assembled in the UI.
 *
 * The cast is the boundary between the panel's untyped prop bag and the SDK's view
 * config types: props come from a schema generated off those same types, but they
 * are edited as JSON, so nothing stronger than a cast is available here.
 */
export function createEmbed(
  type: EmbedType,
  container: HTMLDivElement,
  values: ViewConfigValues,
): AnyEmbed {
  const config = { frameParams: STAGE_FRAME_PARAMS, ...values }
  switch (type) {
    case 'app':
      return createAppEmbed(container, config as AppViewConfig)
    case 'liveboard':
    case 'viz':
      return createLiveboardEmbed(container, config as LiveboardViewConfig)
    case 'search':
    case 'answer':
      return createSearchEmbed(container, config as SearchViewConfig)
    case 'spotter':
      return createSpotterEmbed(container, config as SpotterEmbedViewConfig)
  }
}
