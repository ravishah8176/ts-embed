import { useEffect, useRef, useState } from 'react'
import './RestPlayground.scss'
import { embedConfig } from '../config'

/**
 * The hosted ThoughtSpot REST API playground (an embeddable APIMatic dev
 * portal). We embed it in an iframe and feed it the same inputs the embeds use
 * — the cluster host (`baseUrl`) and a session token (`accessToken`).
 *
 * Handshake (see the playground's embedded.js):
 *   1. iframe → parent:  { type: 'api-playground-ready' }   (+ a MessageChannel port)
 *   2. parent → iframe:  { type: 'api-playground-config', baseUrl, accessToken }
 * The playground then patches its base-url + bearer-token config form.
 */
const PLAYGROUND_URL = embedConfig.playgroundUrl
const PLAYGROUND_ORIGIN = new URL(PLAYGROUND_URL).origin

export default function RestPlayground({ host }: { host: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    let cancelled = false

    async function sendConfig(port?: MessagePort) {
      try {
        const r = await fetch('/api/token', { credentials: 'include' })
        if (!r.ok) throw new Error(`token fetch failed: ${r.status}`)
        const accessToken = await r.text()
        if (cancelled) return
        const config = { type: 'api-playground-config', baseUrl: host, accessToken }
        // Primary path: the playground listens for this on its window.
        iframeRef.current?.contentWindow?.postMessage(config, PLAYGROUND_ORIGIN)
        // Belt-and-suspenders: also reply on the transferred channel port (test.html style).
        port?.postMessage({ baseUrl: host, accessToken })
        setStatus('ready')
      } catch {
        if (!cancelled) setStatus('error')
      }
    }

    function onMessage(e: MessageEvent) {
      if (e.origin !== PLAYGROUND_ORIGIN) return
      if (e.data?.type === 'api-playground-ready') {
        sendConfig(e.ports?.[0])
      }
    }

    window.addEventListener('message', onMessage)
    return () => {
      cancelled = true
      window.removeEventListener('message', onMessage)
    }
  }, [host])

  return (
    <div className="rest-playground">
      {status !== 'ready' && (
        <div className="rest-playground-overlay">
          {status === 'loading' ? (
            <>
              <span className="rest-playground-spinner" />
              <div className="rest-playground-msg">Loading REST API playground…</div>
            </>
          ) : (
            <>
              <span className="rest-playground-error-icon">⚠</span>
              <div className="rest-playground-msg rest-playground-error-msg">
                Couldn’t fetch a session token to configure the playground.
              </div>
            </>
          )}
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={PLAYGROUND_URL}
        title="ThoughtSpot REST API Playground"
        className="rest-playground-frame"
      />
    </div>
  )
}
