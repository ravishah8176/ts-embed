import { useState } from 'react'
import './RestTab.scss'
import RestExplorer from './RestExplorer'
import RestPlayground from './RestPlayground'
import type { RestAuthMode } from '../../auth/authMethods'
import { storedSdkVersions } from '../../thoughtspot/sdkLoader'
import {
  DEFAULT_PLAYGROUND_URL,
  clearStoredPlaygroundUrl,
  playgroundOrigin,
  setStoredPlaygroundUrl,
  storedPlaygroundUrl,
} from './restPrefs'

type RestMode = 'sdk' | 'playground'

const MODES: { id: RestMode; label: string; hint: string }[] = [
  { id: 'sdk', label: 'SDK Explorer', hint: 'Calls @thoughtspot/rest-api-sdk directly' },
  { id: 'playground', label: 'API Playground', hint: 'Embedded ThoughtSpot REST API playground' },
]

/**
 * The REST API tab. Two ways to exercise the v2 REST API, both fed the same
 * cluster host + session credentials as the embeds:
 *   • SDK Explorer  — our in-app catalog that calls the TypeScript SDK.
 *   • API Playground — the hosted APIMatic dev portal, embedded in an iframe.
 *
 * Both of the things that decide *what* is being tested here are runtime settings
 * rather than build-time ones: the REST SDK version the Explorer calls, and the
 * playground URL the iframe loads. The version is owned here but switched inside the
 * Explorer's own left panel — the same place, and the same control, as an embed's SDK
 * version — while the playground's URL stays on this bar, since the playground has no
 * panel of its own. Switching needs no reload: the client is rebuilt per
 * host/mode/version rather than held page-wide.
 */
export default function RestTab({ host, authMode }: { host: string; authMode: RestAuthMode }) {
  const [mode, setMode] = useState<RestMode>('sdk')
  const [sdkVersion, setSdkVersion] = useState(() => storedSdkVersions().rest)
  const [playgroundUrl, setPlaygroundUrl] = useState(storedPlaygroundUrl)
  const [urlDraft, setUrlDraft] = useState(playgroundUrl)

  const active = MODES.find((m) => m.id === mode) as (typeof MODES)[number]
  const urlValid = playgroundOrigin(urlDraft) !== null
  const urlDirty = urlDraft.trim() !== playgroundUrl

  function loadUrl() {
    const next = urlDraft.trim()
    if (!urlValid || !next) return
    setStoredPlaygroundUrl(next)
    setPlaygroundUrl(next)
  }

  function resetUrl() {
    clearStoredPlaygroundUrl()
    setPlaygroundUrl(DEFAULT_PLAYGROUND_URL)
    setUrlDraft(DEFAULT_PLAYGROUND_URL)
  }

  return (
    <div className="rest-tab">
      <div className="rest-tab-bar">
        <div className="rest-seg">
          {MODES.map((m) => (
            <button
              key={m.id}
              className={'rest-seg-btn' + (m.id === mode ? ' on' : '')}
              onClick={() => setMode(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>

        {mode === 'sdk' ? (
          <>
            <div className="rest-tab-hint">{active.hint}</div>
            <div className="rest-bar-spacer" />
          </>
        ) : (
          <>
            <label className="rest-url-label" htmlFor="rest-playground-url">
              Playground URL
            </label>
            <input
              id="rest-playground-url"
              className={'rest-url-input' + (urlValid ? '' : ' bad')}
              value={urlDraft}
              spellCheck={false}
              onChange={(e) => setUrlDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadUrl()}
              placeholder={DEFAULT_PLAYGROUND_URL}
            />
            <button
              className="rest-url-btn"
              onClick={loadUrl}
              disabled={!urlDirty || !urlValid}
              title={urlValid ? 'Reload the playground from this URL' : 'Not a valid URL'}
            >
              Load
            </button>
            <button
              className="link-btn rest-url-reset"
              onClick={resetUrl}
              disabled={playgroundUrl === DEFAULT_PLAYGROUND_URL && !urlDirty}
            >
              Reset
            </button>
          </>
        )}
      </div>
      <div className="rest-tab-body">
        {/* Keep both mounted so toggling back doesn't reload the iframe / lose log. */}
        <div className="rest-tab-pane" style={{ display: mode === 'sdk' ? 'flex' : 'none' }}>
          <RestExplorer
            host={host}
            authMode={authMode}
            sdkVersion={sdkVersion}
            onSdkVersion={setSdkVersion}
          />
        </div>
        <div className="rest-tab-pane" style={{ display: mode === 'playground' ? 'flex' : 'none' }}>
          <RestPlayground host={host} url={playgroundUrl} />
        </div>
      </div>
    </div>
  )
}
