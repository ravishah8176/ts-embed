import { useMemo, useRef, useState } from 'react'
import './RestExplorer.scss'
import { jstr, fmtTime } from '../constants'
import { createRestClient } from './restClient'
import {
  REST_METHODS,
  REST_GROUP_ORDER,
  findRestMethod,
  restGroupColor,
  defaultBodyFor,
  takesNoArgs,
  buildArgs,
  invokeRest,
  type RestMethod,
} from './catalog'

interface Props {
  host: string
}

interface RestLogEntry {
  id: string
  ts: number
  key: string
  label: string
  http: string
  path: string
  durationMs: number
  ok: boolean
  status?: number
  /** Full resolved request URL (host + path with path-params substituted). */
  url: string
  /** The request payload that was sent (undefined when the method takes none). */
  request?: unknown
  result?: unknown
  error?: string
}

/**
 * The SDK's ApiException.message is a multi-line blob:
 *   "HTTP-Code: 400\nMessage: …\nBody: {…}\nHeaders: {…}"
 * The status shows in the badge and the body shows in the Response pane, so pull
 * out just the human "Message:" line to avoid rendering body + headers twice.
 */
function cleanError(raw?: string): string | undefined {
  if (!raw) return undefined
  const m = raw.match(/Message:\s*([^\n]*)/)
  return m ? m[1].trim() : raw
}

/** Substitute `{snake_case}` path params with the camelCase arg values sent. */
function resolveUrl(host: string, method: RestMethod, body: Record<string, unknown>): string {
  let path = method.path
  for (const p of method.params) {
    if (p.isBody || p.isFile) continue
    const snake = p.name.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase())
    const val = body?.[p.name]
    if (val != null && val !== '') {
      path = path.replace(`{${snake}}`, encodeURIComponent(String(val)))
    }
  }
  return (host || '') + path
}

const LOG_CAP = 60

/** Build a readable `await rest.method(...)` preview from the parsed args. */
function callPreview(method: RestMethod, draft: string, noArgs: boolean): string {
  if (noArgs) return `await rest.${method.key}();`
  let parsed: unknown = {}
  try {
    parsed = draft.trim() ? JSON.parse(draft) : {}
  } catch {
    return `await rest.${method.key}( /* fix JSON */ );`
  }
  const args = buildArgs(method, parsed)
    .map((a) => (a === undefined ? 'undefined' : JSON.stringify(a)))
    .join(', ')
  return `await rest.${method.key}(${args});`
}

/**
 * REST API SDK explorer — the REST counterpart of the embed workspace.
 *
 * Lists every method on the `@thoughtspot/rest-api-sdk` aggregate client
 * (auto-generated catalog), lets you edit the JSON arguments, fires a real call,
 * and inspects the response. Calls reuse the same cookieless session as the
 * embeds (Bearer token via `/api/token`).
 */
export default function RestExplorer({ host }: Props) {
  // The client only depends on the host; recreate when the user switches clusters.
  const api = useMemo(() => createRestClient(host), [host])

  const [methodKey, setMethodKey] = useState('getCurrentUserInfo')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [bodyDrafts, setBodyDrafts] = useState<Record<string, string>>({})
  const [running, setRunning] = useState(false)
  const [entries, setEntries] = useState<RestLogEntry[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const uidRef = useRef(1)
  const method = (findRestMethod(methodKey) ?? REST_METHODS[0]) as RestMethod
  const noArgs = takesNoArgs(method)
  const hasFile = method.params.some((p) => p.isFile)
  const defaultBody = jstr(defaultBodyFor(method))
  const draft = bodyDrafts[methodKey] ?? defaultBody

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase()
    const match = (m: RestMethod) =>
      !q ||
      m.label.toLowerCase().includes(q) ||
      m.key.toLowerCase().includes(q) ||
      m.path.toLowerCase().includes(q)
    return REST_GROUP_ORDER.map((g) => ({
      label: g,
      color: restGroupColor(g),
      opts: REST_METHODS.filter((m) => m.group === g && match(m)),
    })).filter((g) => g.opts.length)
  }, [search])

  let validStatus = 'valid JSON'
  let validColor = '#12875A'
  if (noArgs) {
    validStatus = 'no arguments'
    validColor = '#9AA4B2'
  } else if (draft.trim() === '') {
    validStatus = 'empty → {}'
    validColor = '#9AA4B2'
  } else {
    try {
      JSON.parse(draft)
    } catch {
      validStatus = 'invalid JSON'
      validColor = '#EF4444'
    }
  }

  function pickMethod(k: string) {
    const m = findRestMethod(k)
    if (m && bodyDrafts[k] === undefined && !takesNoArgs(m)) {
      setBodyDrafts((d) => ({ ...d, [k]: jstr(defaultBodyFor(m)) }))
    }
    setMethodKey(k)
    setPickerOpen(false)
    setSearch('')
  }

  async function onSend() {
    if (running) return
    let body: unknown = {}
    if (!noArgs) {
      const raw = draft.trim()
      if (raw !== '') {
        try {
          body = JSON.parse(raw)
        } catch {
          return // invalid JSON — the status hint already flags it
        }
      }
    }

    const bodyObj = (body ?? {}) as Record<string, unknown>
    const url = resolveUrl(host, method, bodyObj)

    // What to display as the request payload: unwrap the lone body arg for
    // clarity, otherwise show the full keyed-args object. undefined when none.
    let request: unknown
    if (!noArgs) {
      request =
        method.params.length === 1 && method.params[0].isBody
          ? bodyObj?.[method.params[0].name]
          : bodyObj
    }

    setRunning(true)
    const startedAt = Date.now()
    let entry: RestLogEntry
    try {
      const result = await invokeRest(api, method, body)
      entry = {
        id: 'R' + uidRef.current++,
        ts: Date.now(),
        key: method.key,
        label: method.label,
        http: method.http,
        path: method.path,
        durationMs: Date.now() - startedAt,
        ok: true,
        status: 200,
        url,
        request,
        result,
      }
    } catch (err: unknown) {
      // ApiException carries { code, body }; everything else is a network/CORS error.
      const e = err as { code?: number; body?: unknown; message?: string }
      const status = typeof e?.code === 'number' ? e.code : undefined
      entry = {
        id: 'R' + uidRef.current++,
        ts: Date.now(),
        key: method.key,
        label: method.label,
        http: method.http,
        path: method.path,
        durationMs: Date.now() - startedAt,
        ok: false,
        status,
        url,
        request,
        result: e?.body,
        error: e?.message ?? String(err),
      }
    }

    setEntries((prev) => {
      const next = [entry, ...prev]
      if (next.length > LOG_CAP) next.length = LOG_CAP
      return next
    })
    setExpandedId(entry.id)
    setRunning(false)
  }

  return (
    <div className="rest-explorer">
      {/* ── Left: method selector + argument editor ── */}
      <aside className="rest-panel">
        <div className="rest-panel-head">
          <div className="rest-panel-title">
            REST API SDK
            <span className="rest-count">{REST_METHODS.length} methods</span>
          </div>
          <div className="rest-panel-sub">
            Call <code>@thoughtspot/rest-api-sdk</code>
          </div>

          <label className="rest-label">Method</label>
          <div style={{ position: 'relative' }}>
            <button className="rest-select" onClick={() => setPickerOpen((o) => !o)}>
              <span className="rest-dot" style={{ background: restGroupColor(method.group) }} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="rest-select-label">{method.label}</span>
                <span className="rest-select-mono">
                  {method.http} {method.path}
                </span>
              </span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#7A8694"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ flexShrink: 0, transform: pickerOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {pickerOpen && (
              <>
                <div onClick={() => setPickerOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 25 }} />
                <div className="rest-dropdown anim-fade">
                  <div className="rest-dropdown-search">
                    <input
                      className="ts-input"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search 160 methods…"
                      autoFocus
                    />
                  </div>
                  <div className="tss rest-dropdown-list">
                    {groups.map((g) => (
                      <div key={g.label}>
                        <div className="rest-group-head">
                          <span className="rest-dot-sm" style={{ background: g.color }} />
                          {g.label}
                          <span className="rest-group-count">{g.opts.length}</span>
                        </div>
                        {g.opts.map((m) => {
                          const selected = m.key === methodKey
                          return (
                            <button
                              key={m.key}
                              className={'rest-opt' + (selected ? ' selected' : '')}
                              onClick={() => pickMethod(m.key)}
                            >
                              <span className="rest-dot-sm" style={{ background: restGroupColor(m.group) }} />
                              <span style={{ flex: 1, minWidth: 0 }}>
                                <span className="rest-opt-label">{m.label}</span>
                                <span className="rest-opt-mono">
                                  {m.http} {m.path}
                                </span>
                              </span>
                              {selected && (
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    ))}
                    {groups.length === 0 && (
                      <div className="rest-empty">No methods match “{search}”.</div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="tss rest-panel-body">
          <div className="rest-body-head">
            <label className="rest-label" style={{ margin: 0 }}>
              Arguments · JSON
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 10.5, fontWeight: 600, color: validColor }}>{validStatus}</span>
              <button
                className="rest-link"
                onClick={() => setBodyDrafts((d) => ({ ...d, [methodKey]: defaultBody }))}
                disabled={noArgs}
              >
                Reset
              </button>
            </div>
          </div>
          <textarea
            className="tss rest-textarea"
            value={noArgs ? '' : draft}
            onChange={(e) => setBodyDrafts((d) => ({ ...d, [methodKey]: e.target.value }))}
            spellCheck={false}
            disabled={noArgs}
            placeholder={noArgs ? 'This method takes no arguments.' : '{}'}
          />
          {hasFile && (
            <div className="rest-note">
              ⚠ This method expects a file upload, which the explorer can't supply — the
              file argument is sent as <code>undefined</code>.
            </div>
          )}

          <label className="rest-label" style={{ marginTop: 16 }}>
            Resulting call
          </label>
          <pre className="tss rest-code">{callPreview(method, draft, noArgs)}</pre>
        </div>

        <div className="rest-panel-foot">
          <button className="ts-btn-primary rest-send" onClick={onSend} disabled={running}>
            {running ? (
              <span className="rest-spinner" />
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
            {running ? 'Sending…' : 'Send request'}
          </button>
        </div>
      </aside>

      {/* ── Right: responses ── */}
      <main className="rest-main">
        <div className="rest-main-head">
          <div className="rest-main-title">Responses</div>
          {entries.length > 0 && (
            <button className="rest-link" onClick={() => { setEntries([]); setExpandedId(null) }}>
              Clear
            </button>
          )}
        </div>

        {entries.length === 0 ? (
          <div className="rest-blank">
            <div className="rest-blank-icon">⇆</div>
            <div className="rest-blank-title">No requests yet</div>
            <div className="rest-blank-sub">Pick a method and hit Send to call the cluster.</div>
          </div>
        ) : (
          <div className="tss rest-results">
            {entries.map((en) => {
              const open = expandedId === en.id
              return (
                <div key={en.id} className={'rest-row' + (open ? ' open' : '')}>
                  <button className="rest-row-head" onClick={() => setExpandedId(open ? null : en.id)}>
                    <span className={'rest-badge ' + (en.ok ? 'ok' : 'err')}>
                      {en.status ?? 'ERR'}
                    </span>
                    <span className="rest-row-method">{en.label}</span>
                    <span className="rest-row-path">
                      {en.http} {en.path}
                    </span>
                    <span style={{ flex: 1 }} />
                    <span className="rest-row-meta">{en.durationMs}ms</span>
                    <span className="rest-row-meta">{fmtTime(en.ts)}</span>
                  </button>
                  {open && (
                    <div className="rest-row-body">
                      <div className="rest-detail-sec">
                        <div className="rest-detail-head">
                          <span>Request</span>
                          <span className="rest-detail-url">
                            {en.http} {en.url}
                          </span>
                        </div>
                        {en.request === undefined ? (
                          <div className="rest-detail-empty">No request body.</div>
                        ) : (
                          <pre className="tss rest-json">{jstr(en.request)}</pre>
                        )}
                      </div>
                      <div className="rest-detail-sec">
                        <div className="rest-detail-head">
                          <span>Response</span>
                          <span className={'rest-detail-status ' + (en.ok ? 'ok' : 'err')}>
                            {en.status ?? 'ERROR'}
                          </span>
                        </div>
                        {en.error && <div className="rest-row-error">{cleanError(en.error)}</div>}
                        <pre className="tss rest-json">{jstr(en.result ?? {})}</pre>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
