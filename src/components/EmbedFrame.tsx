import type { Ref } from 'react'
import type { EmbedStatus } from '../hooks/useThoughtSpotEmbed'
import './EmbedFrame.css'

interface Props {
  containerRef: Ref<HTMLDivElement>
  status: EmbedStatus
  errorMsg?: string
}

export default function EmbedFrame({ containerRef, status, errorMsg }: Props) {
  return (
    <div className="embed-frame-wrap">
      {status === 'error' && (
        <div className="embed-overlay embed-overlay--error">
          <span className="embed-error-icon">⚠</span>
          <p>{errorMsg ?? 'Something went wrong.'}</p>
        </div>
      )}

      {/* Always visible — ThoughtSpot renders its own loading state inside the iframe */}
      <div ref={containerRef} className="embed-inner" />
    </div>
  )
}
