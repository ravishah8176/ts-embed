import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import './RestExplorer.scss'
import { jstr, fmtTime } from '../constants'
import { createRestClient } from './restClient'
import { SNAPSHOT_VERSIONS, NPM_PACKAGE, isModuleUrl } from '../../thoughtspot/sdkLoader'
import SdkVersionSwitcher from '../SdkVersionSwitcher'
import SidePanel from '../SidePanel'
import PanelRail from '../PanelRail'
import Button from '../Button'
import { usePanelWidth } from '../usePanelWidth'
import { generateCatalog, type GenStage } from './catalogGen'
import {
  UNCATALOGUED_GROUP,
  buildMethodSet,
  clientMethodNames,
  syntheticArgs,
  type ExplorerMethod,
} from './methodAvailability'

/** Shared with the embed panel and the host-event composer; one lazy chunk for all. */
const CodeEditor = lazy(() => import('../CodeEditor'))

const REST_PANEL_WIDTH_KEY = 'ts_embed_rest_panel_width_v1'

import type { RestAuthMode } from '../../auth/authMethods'
import {
  REST_METHODS,
  restGroupColor,
  defaultBodyFor,
  takesNoArgs,
  buildArgs,
  invokeRest,
  type RestMethod,
} from './catalog'

interface Props {
  host: string
  authMode: RestAuthMode
  /** Version of @thoughtspot/rest-api-sdk to call, switched in this panel's header. */
  sdkVersion: string
  onSdkVersion: (version: string) => void
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

/** Groups that actually have methods, sorted alphabetically — for the section filter. */
const FILTER_GROUPS = Array.from(new Set(REST_METHODS.map((m) => m.group))).sort((a, b) =>
  a.localeCompare(b),
)

/** Build a readable `await rest.method(...)` preview from the parsed args. */
function callPreview(method: ExplorerMethod, draft: string, noArgs: boolean): string {
  if (noArgs) return `await rest.${method.key}();`
  let parsed: unknown = {}
  try {
    parsed = draft.trim() ? JSON.parse(draft) : {}
  } catch {
    return `await rest.${method.key}( /* fix JSON */ );`
  }
  const args = (method.synthetic ? syntheticArgs(parsed) : buildArgs(method, parsed))
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
export default function RestExplorer({ host, authMode, sdkVersion, onSdkVersion }: Props) {
  // The client depends on the host, how it authenticates, and which SDK version to
  // call; recreate on any of them. Held as a promise because that version is fetched
  // on demand — a failure to load surfaces on the call that awaited it.
  const apiPromise = useMemo(
    () => createRestClient(host, authMode, sdkVersion),
    [host, authMode, sdkVersion],
  )

  /**
   * The same panel frame the embed tools use — dragging its edge, remembering the
   * width, keyboard resize — under its own key, since a request builder wants a
   * different width from a config editor.
   */
  const panel = usePanelWidth({ storeKey: REST_PANEL_WIDTH_KEY, defaultWidth: 340 })
  const [collapsed, setCollapsed] = useState(false)

  const [methodKey, setMethodKey] = useState('getCurrentUserInfo')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [groupFilter, setGroupFilter] = useState<string | null>(null)
  const [sectionOpen, setSectionOpen] = useState(false)
  const [bodyDrafts, setBodyDrafts] = useState<Record<string, string>>({})
  const [running, setRunning] = useState(false)
  const [entries, setEntries] = useState<RestLogEntry[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)

  /**
   * What the loaded client can actually call.
   *
   * Read off the client rather than assumed from the catalog, which describes the
   * snapshot version — switching version changes the method list, and a stale list
   * would offer calls that do not exist.
   */
  const [available, setAvailable] = useState<Set<string> | null>(null)
  useEffect(() => {
    let live = true
    setAvailable(null)
    apiPromise
      .then((api) => live && setAvailable(clientMethodNames(api as object)))
      .catch(() => live && setAvailable(null))
    return () => {
      live = false
    }
  }, [apiPromise])

  /**
   * The catalog for the version in use, built in the browser from that version's own
   * `index.d.ts` and `index.js`.
   *
   * Switching version otherwise leaves the shipped snapshot describing a build that is
   * not the one answering calls — right method names at best, wrong signatures and
   * paths at worst. Generating takes a few megabytes of download, so it reports its
   * stage, and a failure falls back to the snapshot rather than emptying the list.
   */
  const [catalog, setCatalog] = useState<RestMethod[] | null>(null)
  const [genStage, setGenStage] = useState<GenStage | null>(null)
  const [genError, setGenError] = useState('')

  useEffect(() => {
    let live = true
    // The pinned version is the snapshot in `catalog.ts` — nothing to fetch.
    if (sdkVersion === SNAPSHOT_VERSIONS.rest || isModuleUrl(sdkVersion)) {
      setCatalog(null)
      setGenStage(null)
      setGenError('')
      return
    }
    setGenStage('signatures')
    setGenError('')
    generateCatalog(sdkVersion, (stage) => live && setGenStage(stage))
      .then((methods) => {
        if (!live) return
        setCatalog(methods)
        setGenStage(null)
      })
      .catch((e: unknown) => {
        if (!live) return
        setCatalog(null)
        setGenStage(null)
        setGenError(e instanceof Error ? e.message : 'Could not read that version’s catalog')
      })
    return () => {
      live = false
    }
  }, [sdkVersion])

  const methodSet = useMemo(() => buildMethodSet(available, catalog ?? undefined), [available, catalog])
  const allMethods = methodSet.list

  const uidRef = useRef(1)
  const method = (allMethods.find((m) => m.key === methodKey) ?? allMethods[0]) as ExplorerMethod
  const noArgs = takesNoArgs(method)
  const hasFile = method.params.some((p) => p.isFile)
  const defaultBody = jstr(defaultBodyFor(method))
  const draft = bodyDrafts[methodKey] ?? defaultBody

  const sectionCount = groupFilter
    ? allMethods.filter((m) => m.group === groupFilter).length
    : allMethods.length

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase()
    const match = (m: RestMethod) =>
      !q ||
      m.label.toLowerCase().includes(q) ||
      m.key.toLowerCase().includes(q) ||
      m.path.toLowerCase().includes(q)
    const sections = methodSet.extraCount ? [...FILTER_GROUPS, UNCATALOGUED_GROUP] : FILTER_GROUPS
    return sections
      .filter((g) => !groupFilter || g === groupFilter)
      .map((g) => ({
        label: g,
        color: restGroupColor(g),
        opts: allMethods.filter((m) => m.group === g && match(m)).sort((a, b) =>
          a.label.localeCompare(b.label),
        ),
      }))
      .filter((g) => g.opts.length)
  }, [search, groupFilter, allMethods, methodSet.extraCount])

  /** What the count pill means once the loaded build is known. */
  const generating = genStage !== null
  const GEN_STAGE_TEXT: Record<GenStage, string> = {
    signatures: 'reading method signatures…',
    endpoints: 'reading endpoints…',
    parsing: 'building catalog…',
  }
  const countTitle = generating
    ? `Generating the catalog for ${sdkVersion}`
    : catalog
      ? `Generated from ${NPM_PACKAGE.rest}@${sdkVersion} — signatures and paths are this version's own`
      : available
        ? `${methodSet.availableCount} of ${REST_METHODS.length} catalogued methods exist in ${sdkVersion}` +
          (methodSet.extraCount ? `, plus ${methodSet.extraCount} this build's catalog does not describe` : '')
        : 'Reading the loaded client…'

  let validStatus = 'valid JSON'
  let validColor = 'var(--rd-sys-color-content-success)'
  if (noArgs) {
    validStatus = 'no arguments'
    validColor = 'var(--rd-sys-color-content-tertiary)'
  } else if (draft.trim() === '') {
    validStatus = 'empty → {}'
    validColor = 'var(--rd-sys-color-content-tertiary)'
  } else {
    try {
      JSON.parse(draft)
    } catch {
      validStatus = 'invalid JSON'
      validColor = 'var(--rd-sys-color-content-failure)'
    }
  }

  function selectMethod(k: string) {
    const m = allMethods.find((x) => x.key === k)
    if (m && bodyDrafts[k] === undefined && !takesNoArgs(m)) {
      setBodyDrafts((d) => ({ ...d, [k]: jstr(defaultBodyFor(m)) }))
    }
    setMethodKey(k)
  }

  function pickMethod(k: string) {
    selectMethod(k)
    setPickerOpen(false)
    setSearch('')
  }

  function pickSection(g: string | null) {
    setGroupFilter(g)
    setSectionOpen(false)
    // Keep the method consistent with the section: if the current method isn't
    // in the chosen section, jump to that section's first method.
    if (g && method.group !== g) {
      const first = REST_METHODS.filter((m) => m.group === g).sort((a, b) =>
        a.label.localeCompare(b.label),
      )[0]
      if (first) selectMethod(first.key)
    }
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
      const api = await apiPromise
      const result = method.synthetic
        ? await (api as unknown as Record<string, (...a: unknown[]) => Promise<unknown>>)[method.key](
            ...syntheticArgs(body),
          )
        : await invokeRest(api, method, body)
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

    setEntries((prev) => [entry, ...prev])
    setExpandedId(entry.id)
    setRunning(false)
  }

  return (
    <div className="rest-explorer">
      {/* ── Left: method selector + argument editor, in the shared resizable panel ── */}
      {collapsed ? (
        <PanelRail onExpand={() => setCollapsed(false)} />
      ) : (
      <SidePanel width={panel.width} resizing={panel.resizing} handleProps={panel.handleProps}>
        <div className="rest-panel-head">
          <div className="rest-panel-title">
            Request builder
            <span className={'rest-count' + (generating ? ' busy' : '')} title={countTitle}>
              {generating
                ? 'generating…'
                : `${methodSet.availableCount + methodSet.extraCount} methods`}
            </span>
            <button
              className="ts-icon-btn rest-collapse"
              onClick={() => setCollapsed(true)}
              title="Collapse panel"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="11 17 6 12 11 7" />
                <polyline points="18 17 13 12 18 7" />
              </svg>
            </button>
          </div>
          {generating && (
            <p className="rest-gen" role="status">
              <span className="rest-gen-spinner" />
              Generating the catalog for {sdkVersion} — {GEN_STAGE_TEXT[genStage]}
            </p>
          )}
          {genError && !generating && (
            <p className="rest-gen bad">
              Could not read {sdkVersion}’s catalog ({genError}). Showing the{' '}
              {SNAPSHOT_VERSIONS.rest} catalog, reconciled against what this version can call.
            </p>
          )}
          {catalog && !generating && (
            <p className="rest-gen ok">Catalog generated from {sdkVersion}.</p>
          )}

          {/* Same slot the embed panel gives it: the version under the panel title. */}
          <div className="rest-panel-sdk">
            <SdkVersionSwitcher
              sdk="rest"
              align="left"
              layout="block"
              withHint
              value={sdkVersion}
              onApplied={onSdkVersion}
            />
          </div>

          <label className="rest-label">Section</label>
          <div className="rest-rel rest-mb12">
            <button className="rest-select" onClick={() => setSectionOpen((o) => !o)}>
              <span
                className="rest-dot"
                style={{ background: groupFilter ? restGroupColor(groupFilter) : 'var(--rd-sys-color-content-tertiary)' }}
              />
              <span className="rest-grow">
                <span className="rest-select-label">{groupFilter ?? 'All sections'}</span>
                <span className="rest-select-mono">{sectionCount} methods</span>
              </span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--rd-sys-color-content-secondary)"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="rest-chevron"
                style={{ transform: sectionOpen ? 'rotate(180deg)' : 'none' }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {sectionOpen && (
              <>
                <div onClick={() => setSectionOpen(false)} className="rest-overlay" />
                <div className="rest-dropdown anim-fade">
                  <div className="tss rest-dropdown-list">
                    <button
                      className={'rest-opt' + (groupFilter === null ? ' selected' : '')}
                      onClick={() => pickSection(null)}
                    >
                      <span className="rest-dot-sm" style={{ background: 'var(--rd-sys-color-content-tertiary)' }} />
                      <span className="rest-grow">
                        <span className="rest-opt-label">All sections</span>
                        <span className="rest-opt-mono">{allMethods.length} listed</span>
                      </span>
                      {groupFilter === null && (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                    {(methodSet.extraCount ? [...FILTER_GROUPS, UNCATALOGUED_GROUP] : FILTER_GROUPS).map((g) => {
                      const selected = groupFilter === g
                      const count = allMethods.filter((m) => m.group === g).length
                      return (
                        <button
                          key={g}
                          className={'rest-opt' + (selected ? ' selected' : '')}
                          onClick={() => pickSection(g)}
                        >
                          <span className="rest-dot-sm" style={{ background: restGroupColor(g) }} />
                          <span className="rest-grow">
                            <span className="rest-opt-label">{g}</span>
                            <span className="rest-opt-mono">{count} listed</span>
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
                </div>
              </>
            )}
          </div>

          <label className="rest-label">Method</label>
          <div className="rest-rel">
            <button className="rest-select" onClick={() => setPickerOpen((o) => !o)}>
              <span className="rest-dot" style={{ background: restGroupColor(method.group) }} />
              <span className="rest-grow">
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
                stroke="var(--rd-sys-color-content-secondary)"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="rest-chevron"
                style={{ transform: pickerOpen ? 'rotate(180deg)' : 'none' }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {pickerOpen && (
              <>
                <div onClick={() => setPickerOpen(false)} className="rest-overlay" />
                <div className="rest-dropdown anim-fade">
                  <div className="rest-dropdown-search">
                    <input
                      className="ts-input"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={`Search ${sectionCount} methods…`}
                      autoFocus
                    />
                  </div>
                  <div className="tss rest-dropdown-list">
                    {groups.map((g) => (
                      <div key={g.label} className="rest-group">
                        <div className="rest-group-head" style={{ color: g.color }}>
                          {g.label}
                          <span className="rest-group-count">{g.opts.length}</span>
                        </div>
                        <div className="rest-group-items" style={{ borderLeftColor: g.color }}>
                          {g.opts.map((m) => {
                            const selected = m.key === methodKey
                            return (
                              <button
                                key={m.key}
                                className={
                                  'rest-opt' +
                                  (selected ? ' selected' : '') +
                                  (m.available ? '' : ' unavailable')
                                }
                                onClick={() => pickMethod(m.key)}
                                title={
                                  m.available
                                    ? undefined
                                    : `Not in ${sdkVersion} — switch version to call it`
                                }
                              >
                                <span className="rest-grow">
                                  <span className="rest-opt-label">
                                    <span className="rest-opt-name">{m.label}</span>
                                    {!m.available && <span className="rest-opt-tag">absent</span>}
                                    {m.synthetic && <span className="rest-opt-tag new">new</span>}
                                  </span>
                                  <span className="rest-opt-mono">
                                    {m.synthetic ? m.path : `${m.http} ${m.path}`}
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
            <label className="rest-label rest-m0">
              Arguments · JSON
            </label>
            <div className="rest-valid-row">
              <span className="rest-valid-text" style={{ color: validColor }}>{validStatus}</span>
              <button
                className="rest-link"
                onClick={() => setBodyDrafts((d) => ({ ...d, [methodKey]: defaultBody }))}
                disabled={noArgs}
              >
                Reset
              </button>
            </div>
          </div>
          {noArgs ? (
            <div className="rest-noargs">This method takes no arguments.</div>
          ) : (
            <div className="rest-args-box">
              <Suspense fallback={<div className="ce-host ce-loading">Loading editor…</div>}>
                <CodeEditor
                  value={draft}
                  language="json"
                  onChange={(next) => setBodyDrafts((d) => ({ ...d, [methodKey]: next }))}
                />
              </Suspense>
            </div>
          )}
          {hasFile && (
            <div className="rest-note">
              ⚠ This method expects a file upload, which the explorer can't supply — the
              file argument is sent as <code>undefined</code>.
            </div>
          )}

          <label className="rest-label rest-mt16">
            Resulting call
          </label>
          <div className="rest-code-box">
            <Suspense fallback={<div className="ce-host ce-loading">Loading editor…</div>}>
              <CodeEditor value={callPreview(method, draft, noArgs)} language="typescript" />
            </Suspense>
          </div>
        </div>

        <div className="rest-panel-foot">
          {!method.available && (
            <p className="rest-unavailable">
              <code>{method.key}</code> is not in {sdkVersion}. Switch the version above to call it.
            </p>
          )}
          <Button
            variant="primary"
            size="m"
            className="rest-send"
            icon={
              running ? (
                <span className="rest-spinner" />
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )
            }
            onClick={onSend}
            disabled={running || !method.available}
          >
            {running ? 'Sending…' : 'Send request'}
          </Button>
        </div>
      </SidePanel>
      )}

      {/* ── Right: responses ── */}
      <main className="rest-main">
        <div className="rest-main-card">
          <div className="rest-main-head">
            <div className="rest-main-title">
              Responses
              <span className="rest-count">
                {entries.length} {entries.length === 1 ? 'call' : 'calls'}
              </span>
            </div>
            <div className="rest-main-actions">
              {entries.length > 0 && <span className="rest-main-hint">newest first</span>}
              <button
                className="rest-link"
                onClick={() => {
                  setEntries([])
                  setExpandedId(null)
                }}
                disabled={entries.length === 0}
              >
                Clear
              </button>
            </div>
          </div>

          {entries.length === 0 ? (
            <div className="rest-blank">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 8h13l-3-3M20 16H7l3 3" />
              </svg>
              <div className="rest-blank-title">No requests yet</div>
              <div className="rest-blank-sub">
                Pick a method on the left and hit <strong>Send request</strong> to call the cluster.
              </div>
            </div>
          ) : (
            <div className="tss rest-results">
              {entries.map((en) => {
                const open = expandedId === en.id
                return (
                  <div key={en.id} className={'rest-row' + (en.ok ? ' ok' : ' err') + (open ? ' open' : '')}>
                    <button className="rest-row-head" onClick={() => setExpandedId(open ? null : en.id)}>
                      <span className={'rest-badge ' + (en.ok ? 'ok' : 'err')}>{en.status ?? 'ERR'}</span>
                      <span className="rest-row-text">
                        <span className="rest-row-method">{en.label}</span>
                        <span className="rest-row-path">
                          {en.http} {en.path}
                        </span>
                      </span>
                      <span className="rest-row-meta">{en.durationMs}ms</span>
                      <span className="rest-row-meta rest-row-time">{fmtTime(en.ts)}</span>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="rest-row-chevron">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>

                    {open && (
                      <div className="rest-row-body">
                        <div className="rest-detail-sec">
                          <div className="rest-detail-head">
                            <span className="rest-detail-label">Request</span>
                            <code className="rest-detail-url" title={en.url}>
                              {en.http} {en.url}
                            </code>
                            {en.request !== undefined && (
                              <button
                                className="rest-link rest-copy"
                                onClick={() => navigator.clipboard?.writeText(jstr(en.request))}
                              >
                                Copy
                              </button>
                            )}
                          </div>
                          {en.request === undefined ? (
                            <div className="rest-detail-empty">No request body.</div>
                          ) : (
                            <pre className="rest-json">{jstr(en.request)}</pre>
                          )}
                        </div>

                        <div className="rest-detail-sec">
                          <div className="rest-detail-head">
                            <span className="rest-detail-label">Response</span>
                            <span className={'rest-detail-status ' + (en.ok ? 'ok' : 'err')}>
                              {en.status ?? 'ERROR'}
                            </span>
                            <span className="rest-detail-spacer" />
                            <button
                              className="rest-link rest-copy"
                              onClick={() => navigator.clipboard?.writeText(jstr(en.result ?? {}))}
                            >
                              Copy
                            </button>
                          </div>
                          {en.error && <div className="rest-row-error">{cleanError(en.error)}</div>}
                          <pre className="rest-json">{jstr(en.result ?? {})}</pre>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
