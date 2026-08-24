import type { SpotterEmbed, SpotterEmbedViewConfig } from '../../thoughtspot/sdkTypes'
import { embedSdk } from '../../thoughtspot/sdkLoader'
import { embedConfig } from '../config'

/**
 * Spotter embed (SpotterEmbed) — conversational AI.
 *
 * Bound to a worksheet/model (VITE_TS_WORKSHEET_ID). Every prop of
 * `SpotterEmbedViewConfig` is editable from the Embed config panel at runtime, so
 * this is only what a fresh browser starts from.
 *
 * `sharedConversationId` is read off the URL so a shared-conversation link opens on
 * the conversation it points at; the panel shows the parsed value and can override
 * it.
 */
export function spotterDefaults(): SpotterEmbedViewConfig {
  const { Action } = embedSdk()
  const sharedConversationId = window.location.hash.split('/insights/conv-assist/s/')[1]
  return {
    worksheetId: embedConfig.worksheetId,
    enablePastConversationsSidebar: false,
    updatedSpotterChatPrompt: true,
    disabledActions: [Action.SpotterChatRename],
    spotterSidebarConfig: {
      enablePastConversationsSidebar: true,
      spotterSidebarTitle: 'TS Assistant',
      spotterChatRenameLabel: 'Rename this conversation',
    },
    spotterShareConversationConfig: {
      enableShareConversation: true,
      spotterShareLabel: 'Share this conversation',
    },
    updatedSpotterExperience: false,
    ...(sharedConversationId ? { sharedConversationId } : {}),
  }
}

export function createSpotterEmbed(
  container: HTMLDivElement,
  config: SpotterEmbedViewConfig,
): SpotterEmbed {
  return new (embedSdk().SpotterEmbed)(container, config)
}
