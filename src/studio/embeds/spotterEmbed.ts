import { SpotterEmbed } from '@thoughtspot/visual-embed-sdk'
import { embedConfig } from '../config'

/**
 * Spotter embed (SpotterEmbed) — conversational AI.
 *
 * Bound to a worksheet/model (VITE_TS_WORKSHEET_ID). Edit anything in
 * `SpotterEmbedViewConfig` here to test changes.
 */
export function createSpotterEmbed(container: HTMLDivElement): SpotterEmbed {
  return new SpotterEmbed(container, {
    frameParams: { width: '100%', height: '100%' },

    // ───────── customize from here ─────────
    worksheetId: embedConfig.worksheetId,
    enablePastConversationsSidebar: false,
    updatedSpotterChatPrompt: true,
    spotterSidebarConfig: {
      enablePastConversationsSidebar: true,
      spotterSidebarTitle: 'TS Assistant',
    },
    // ───────────────────────────────────────
  })
}
