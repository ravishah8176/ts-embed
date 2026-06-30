import { useState } from 'react'
import './RestTab.scss'
import RestExplorer from './RestExplorer'
import RestPlayground from './RestPlayground'

type RestMode = 'sdk' | 'playground'

const MODES: { id: RestMode; label: string; hint: string }[] = [
  { id: 'sdk', label: 'SDK Explorer', hint: 'Calls @thoughtspot/rest-api-sdk directly' },
  { id: 'playground', label: 'API Playground', hint: 'Embedded ThoughtSpot REST API playground' },
]

/**
 * The REST API tab. Two ways to exercise the v2 REST API, both fed the same
 * cluster host + session token as the embeds:
 *   • SDK Explorer  — our in-app catalog that calls the TypeScript SDK.
 *   • API Playground — the hosted APIMatic dev portal, embedded in an iframe.
 */
export default function RestTab({ host }: { host: string }) {
  const [mode, setMode] = useState<RestMode>('sdk')
  const active = MODES.find((m) => m.id === mode) as (typeof MODES)[number]

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
        <div className="rest-tab-hint">{active.hint}</div>
      </div>
      <div className="rest-tab-body">
        {/* Keep both mounted so toggling back doesn't reload the iframe / lose log. */}
        <div className="rest-tab-pane" style={{ display: mode === 'sdk' ? 'flex' : 'none' }}>
          <RestExplorer host={host} />
        </div>
        <div className="rest-tab-pane" style={{ display: mode === 'playground' ? 'flex' : 'none' }}>
          <RestPlayground host={host} />
        </div>
      </div>
    </div>
  )
}
