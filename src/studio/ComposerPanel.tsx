import { Suspense, lazy, useMemo } from 'react'
import './ComposerPanel.scss'
import type { EmbedType } from './constants'
import {
  allowedHostEvents,
  composerCodeFor,
  humanize,
} from './constants'
import Button from './Button'

/** Shared with the config panel, so this tab adds no download of its own. */
const CodeEditor = lazy(() => import('./CodeEditor'))

interface Props {
  embedType: EmbedType
  composerKey: string
  onPickEvent: (key: string) => void
  composerOpen: boolean
  onToggleComposer: () => void
  onCloseComposer: () => void
  composerSearch: string
  onComposerSearch: (v: string) => void
  draft: string
  onDraftChange: (v: string) => void
  onReset: () => void
  onTrigger: () => void
}

export default function ComposerPanel(props: Props) {
  const {
    embedType,
    composerKey,
    onPickEvent,
    composerOpen,
    onToggleComposer,
    onCloseComposer,
    composerSearch,
    onComposerSearch,
    draft,
    onDraftChange,
    onReset,
    onTrigger,
  } = props

  const composerColor = 'var(--rd-sys-color-content-brand)'

  const opts = useMemo(() => {
    const q = composerSearch.trim().toLowerCase()
    const match = (k: string) => !q || k.toLowerCase().includes(q) || humanize(k).toLowerCase().includes(q)
    return allowedHostEvents(embedType)
      .filter(match)
      .sort((a, b) => humanize(a).localeCompare(humanize(b)))
  }, [embedType, composerSearch])

  const noResults = opts.length === 0

  let validStatus = 'valid JSON'
  let validColor = 'var(--rd-sys-color-content-success)'
  if (draft.trim() === '') {
    validStatus = 'no params → {}'
    validColor = 'var(--rd-sys-color-content-tertiary)'
  } else {
    try {
      JSON.parse(draft)
    } catch {
      validStatus = 'invalid JSON'
      validColor = 'var(--rd-sys-color-content-failure)'
    }
  }

  return (
    <>
      {/* Header + event selector */}
          <div className="cp-header">
            <div className="cp-header-title">Host event composer</div>
            <div className="cp-subtitle">
              Configure &amp; fire{' '}
              <span className="cp-trigger-code">
                embed.trigger()
              </span>
            </div>
            <label className="cp-field-label">
              Host event
            </label>
            <div className="cp-rel">
              <button
                className="composer-select cp-select-btn"
                onClick={onToggleComposer}
              >
                <span className="cp-dot-9" style={{ background: composerColor }} />
                <span className="cp-select-text">
                  <span className="cp-select-name">
                    {humanize(composerKey)}
                  </span>
                  <span className="cp-select-key">
                    HostEvent.{composerKey}
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
                  className="cp-select-chevron"
                  style={{ transform: composerOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {composerOpen && (
                <>
                  <div onClick={onCloseComposer} className="cp-overlay" />
                  <div className="anim-fade cp-dropdown">
                    <div className="cp-dropdown-head">
                      <div className="ts-search">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="ts-search-icon" aria-hidden>
                          <circle cx="11" cy="11" r="7" />
                          <path d="m20 20-3-3" />
                        </svg>
                        <input
                          className="ts-input"
                          value={composerSearch}
                          onChange={(e) => onComposerSearch(e.target.value)}
                          placeholder="Search host events…"
                          autoFocus
                        />
                      </div>
                      <div className="cp-supported">
                        All SDK host events
                      </div>
                    </div>
                    <div className="tss cp-opt-list">
                      {opts.map((k) => {
                        const selected = k === composerKey
                        return (
                          <button
                            key={k}
                            className="hover-opt cp-opt"
                            onClick={() => onPickEvent(k)}
                            style={{ background: selected ? 'var(--rd-sys-color-background-ghost-highlight)' : 'transparent' }}
                          >
                            <span className="cp-dot-6 cp-dot-shrink" style={{ background: 'var(--rd-sys-color-content-brand)' }} />
                            <span className="cp-select-text">
                              <span className="cp-opt-name">
                                {humanize(k)}
                              </span>
                              <span className="cp-opt-key">
                                HostEvent.{k}
                              </span>
                            </span>
                            {selected && (
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="cp-check-icon">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </button>
                        )
                      })}
                      {noResults && (
                        <div className="cp-no-results">
                          No events match “{composerSearch}”.
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Params + resulting call */}
          <div className="tss cp-params">
            <div className="cp-params-head">
              <label className="cp-field-label-inline">Parameters · JSON</label>
              <div className="cp-params-status">
                <span className="cp-valid-status" style={{ color: validColor }}>{validStatus}</span>
                <button
                  className="link-btn cp-reset-btn"
                  onClick={onReset}
                >
                  Reset to example
                </button>
              </div>
            </div>
            <Suspense fallback={<div className="ce-host ce-loading">Loading editor…</div>}>
              <CodeEditor value={draft} language="json" onChange={onDraftChange} />
            </Suspense>

            <label className="cp-field-label cp-result-label">
              Resulting call
            </label>
            <div className="cp-result-box">
              <Suspense fallback={<div className="ce-host ce-loading">Loading editor…</div>}>
                <CodeEditor value={composerCodeFor(composerKey, draft)} language="typescript" />
              </Suspense>
            </div>
          </div>

          <div className="cp-footer">
            <Button
              variant="primary"
              size="m"
              className="cp-trigger-btn"
              icon={
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              }
              onClick={onTrigger}
            >
              Trigger event
            </Button>
          </div>
    </>
  )
}
