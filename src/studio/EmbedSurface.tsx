import type { Ref } from 'react'
import './EmbedSurface.scss'
import type { EmbedType } from './constants'
import { EMBED_CLASS_NAME } from './constants'
import type { EmbedStatus } from './useStudioEmbed'

interface Props {
  embedType: EmbedType
  status: EmbedStatus
  /** Set when the failure is something other than a lapsed session. */
  error?: string | null
  containerRef: Ref<HTMLDivElement>
}

export default function EmbedSurface({ embedType, status, error, containerRef }: Props) {
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
              <div className="es-error-msg">
                {error ?? 'Authentication expired — please sign in again.'}
              </div>
              {error && (
                <div className="es-error-sub">
                  Not every embed exists in every SDK release — switch the version back in the panel’s
                  SDK chip, or pick a config this release supports.
                </div>
              )}
            </div>
          )}
          <div ref={containerRef} className="es-container" />
        </div>
      </div>
    </main>
  )
}
