import { SpotterEmbed } from '@thoughtspot/visual-embed-sdk'
import { useThoughtSpotEmbed } from '../hooks/useThoughtSpotEmbed'
import EmbedFrame from '../components/EmbedFrame'
import './EmbedPage.css'

export default function Spotter() {
  const { containerRef, status, errorMsg } = useThoughtSpotEmbed(
    (container) =>
      new SpotterEmbed(container, {
        frameParams: { width: '100%', height: '100%' },
        worksheetId: import.meta.env.VITE_TS_DATASOURCE_ID ?? '',
        updatedSpotterChatPrompt: true,
      }),
  )
  return (
    <div className="embed-page">
      <EmbedFrame containerRef={containerRef} status={status} errorMsg={errorMsg} />
    </div>
  )
}
