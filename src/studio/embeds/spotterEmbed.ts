import { Action, SpotterEmbed } from '@thoughtspot/visual-embed-sdk'

/**
 * Spotter embed (SpotterEmbed) — conversational AI.
 *
 * Bound to a worksheet/model (VITE_TS_WORKSHEET_ID). Edit anything in
 * `SpotterEmbedViewConfig` here to test changes.
 */
export function createSpotterEmbed(container: HTMLDivElement): SpotterEmbed {
  const sharedConversationId = window.location.hash.split('/share/')[1];
  return new SpotterEmbed(container, {
    frameParams: { width: '100%', height: '100%' },

    // ───────── customize from here ─────────
    
    worksheetId: 'cd252e5c-b552-49a8-821d-3eadaa049cca',
    enablePastConversationsSidebar: false,
    updatedSpotterChatPrompt: true,
    disabledActions: [Action.SpotterChatRename],
    // hiddenActions: [
    //     Action.SpotterShareConversationButtonHeader,
    //     Action.SpotterShareConversationMenuItemSidebar,
    // ],
    spotterSidebarConfig: {
      enablePastConversationsSidebar: true,
      spotterSidebarTitle: 'TS Assistant',
      spotterChatRenameLabel: 'Rename this conversation',
    },
    spotterShareConversationConfig: {
      enableShareConversation: true,
      spotterShareLabel: 'Share this conversation',
    },
    sharedConversationId
    // ───────────────────────────────────────
  })
}


// https://cdn.jsdelivr.net/gh/ravishah8176/assest/documentation.svg
// https://cdn.jsdelivr.net/gh/ravishah8176/assest/share.svg
// https://cdn.jsdelivr.net/gh/ravishah8176/assest/user-group.svg