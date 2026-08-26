import { useEffect, useRef, useState } from 'react'
import './RestPlayground.scss'
import { playgroundOrigin } from './restPrefs'

/**
 * The hosted ThoughtSpot REST API playground (an embeddable APIMatic dev
 * portal). We embed it in an iframe and feed it the same inputs the embeds use
 * — the cluster host (`baseUrl`) and a session token (`accessToken`).
 *
 * Handshake (see the playground's embedded.js):
 *   1. iframe → parent:  { type: 'api-playground-ready' }   (+ a MessageChannel port)
 *   2. parent → iframe:  { type: 'api-playground-config', baseUrl, accessToken }
 * The playground then patches its base-url + bearer-token config form.
 *
 * `url` is a runtime setting (see `restPrefs`), so it can point at another
 * environment's playground without a rebuild. Its origin gates the handshake in both
 * directions, and a URL that does not parse is reported rather than loaded.
 */
export default function RestPlayground({ host, url }: { host: string; url: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const origin = playgroundOrigin(url)

  useEffect(() => {
    let cancelled = false
    if (!origin) {
      setStatus('error')
      return
    }
    const targetOrigin = origin
    setStatus('loading')

    async function sendConfig(port?: MessagePort) {
      try {
        const r = await fetch('/api/token', { credentials: 'include' })
        if (!r.ok) throw new Error(`token fetch failed: ${r.status}`)
        const accessToken = await r.text()
        if (cancelled) return
        const config = { type: 'api-playground-config', baseUrl: host, accessToken }
        // Primary path: the playground listens for this on its window.
        iframeRef.current?.contentWindow?.postMessage(config, targetOrigin)
        // Belt-and-suspenders: also reply on the transferred channel port (test.html style).
        port?.postMessage({ baseUrl: host, accessToken })
        setStatus('ready')
      } catch {
        if (!cancelled) setStatus('error')
      }
    }

    function onMessage(e: MessageEvent) {
      if (e.origin !== targetOrigin) return
      if (e.data?.type === 'api-playground-ready') {
        sendConfig(e.ports?.[0])
      }
    }

    window.addEventListener('message', onMessage)
    return () => {
      cancelled = true
      window.removeEventListener('message', onMessage)
    }
  }, [host, origin])

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
                {origin
                  ? 'Couldn’t fetch a session token to configure the playground.'
                  : `“${url}” is not a valid URL.`}
              </div>
            </>
          )}
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={origin ? url : 'about:blank'}
        title="ThoughtSpot REST API Playground"
        className="rest-playground-frame"
      />
    </div>
  )
}
