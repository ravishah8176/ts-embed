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
    <main style={{ flex: 1, minHeight: 0, padding: 14, display: 'flex' }}>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          borderRadius: 14,
          border: '1px solid #E0E4EA',
          background: '#fff',
          boxShadow: '0 1px 3px rgba(14,17,22,.05)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* The real embed renders into this container. */}
        <div style={{ flex: 1, minHeight: 0, position: 'relative', background: '#FBFBFC' }}>
          {status === 'loading' && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 12,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 14,
                background: '#FBFBFC',
                pointerEvents: 'none',
              }}
            >
              <span style={{ width: 34, height: 34, border: '3px solid #E4E7EC', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'tsSpin .8s linear infinite' }} />
              <div style={{ fontSize: 13, color: '#7A8694', fontWeight: 500 }}>Loading {className}…</div>
            </div>
          )}
          {status === 'error' && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 12,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                background: '#FBFBFC',
                color: '#C0392B',
                padding: 24,
                textAlign: 'center',
              }}
            >
              <span style={{ fontSize: 26 }}>⚠</span>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Authentication expired — please sign in again.</div>
            </div>
          )}
          <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
        </div>
      </div>
    </main>
  )
}
