import type { Ref } from 'react'
import './EmbedSurface.scss'
import type { EmbedType } from './constants'
import { EMBED_CLASS_NAME } from './constants'
import type { EmbedStatus } from './useStudioEmbed'

interface Props {
  embedType: EmbedType
  status: EmbedStatus
  containerRef: Ref<HTMLDivElement>
}

export default function EmbedSurface({ embedType, status, containerRef }: Props) {
  const className = EMBED_CLASS_NAME[embedType]
  return (
    <main className="es-main">
      <div className="es-frame">
        {/* The real embed renders into this container. */}
        <div className="es-stage">
          {status === 'loading' && (
            <div className="es-overlay es-overlay-loading">
              <span className="es-spinner" />
              <div className="es-loading-msg">Loading {className}…</div>
            </div>
          )}
          {status === 'error' && (
            <div className="es-overlay es-overlay-error">
              <span className="es-error-icon">⚠</span>
              <div className="es-error-msg">Authentication expired — please sign in again.</div>
            </div>
          )}
          <div ref={containerRef} className="es-container" />
        </div>
      </div>
    </main>
  )
}
