import { AppEmbed, Page, EmbedEvent } from '@thoughtspot/visual-embed-sdk'
import { useThoughtSpotEmbed } from '../hooks/useThoughtSpotEmbed'
import EmbedFrame from '../components/EmbedFrame'
import './EmbedPage.css'

export default function FullApp() {
  const { containerRef, status, errorMsg } = useThoughtSpotEmbed(
    (container) => {
      const embed = new AppEmbed(container, {
        frameParams: { width: '100%', height: '100%' },
        showPrimaryNavbar: true,
        pageId: Page.Home,
      })
      embed.on(EmbedEvent.RouteChange, (payload) => {
        console.log('[FullApp] Route changed:', payload)
      })
      return embed
    },
  )

  return (
    <div className="embed-page">
      <EmbedFrame containerRef={containerRef} status={status} errorMsg={errorMsg} />
    </div>
  )
}
