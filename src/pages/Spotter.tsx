import { SpotterEmbed } from '@thoughtspot/visual-embed-sdk'
import { useThoughtSpotEmbed } from '../hooks/useThoughtSpotEmbed'
import EmbedFrame from '../components/EmbedFrame'
import './EmbedPage.css'

export default function Spotter() {
  const { containerRef, status, errorMsg } = useThoughtSpotEmbed(
    (container) =>
      new SpotterEmbed(container, {
        frameParams: { width: '100%', height: '100%' },
        // Add the params from here to test your changes
        worksheetId: "cd252e5c-b552-49a8-821d-3eadaa049cca",
        enablePastConversationsSidebar: false,
        updatedSpotterChatPrompt: true,
        spotterSidebarConfig: {
          enablePastConversationsSidebar: true,
          spotterSidebarTitle: "TS Assistant",
        }
      }),
  )
  return (
    <div className="embed-page">
      <EmbedFrame containerRef={containerRef} status={status} errorMsg={errorMsg} />
    </div>
  )
}
