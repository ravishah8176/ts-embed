import { useMemo } from 'react'
import './ComposerPanel.scss'
import type { EmbedType } from './constants'
import {
  allowedHostEvents,
  composerCodeFor,
  humanize,
} from './constants'

interface Props {
  collapsed: boolean
  onTogglePanel: () => void
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
    collapsed,
    onTogglePanel,
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

  const composerColor = '#7c5cfc'

  const opts = useMemo(() => {
    const q = composerSearch.trim().toLowerCase()
    const match = (k: string) => !q || k.toLowerCase().includes(q) || humanize(k).toLowerCase().includes(q)
    return allowedHostEvents(embedType)
      .filter(match)
      .sort((a, b) => humanize(a).localeCompare(humanize(b)))
  }, [embedType, composerSearch])

  const noResults = opts.length === 0

  let validStatus = 'valid JSON'
  let validColor = '#12875A'
  if (draft.trim() === '') {
    validStatus = 'no params → {}'
    validColor = '#9AA4B2'
  } else {
    try {
      JSON.parse(draft)
    } catch {
      validStatus = 'invalid JSON'
      validColor = '#EF4444'
    }
  }

  const panelW = collapsed ? 56 : 320

  return (
    <aside
      className="cp-aside"
      style={{ flex: `0 0 ${panelW}px` }}
    >
      {collapsed ? (
        <div className="cp-collapsed-rail">
          <button
            className="ts-btn-primary cp-expand-btn"
            onClick={onTogglePanel}
            title="Expand composer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="13 17 18 12 13 7" />
              <polyline points="6 17 11 12 6 7" />
            </svg>
          </button>
          <div className="cp-dot-8" style={{ background: composerColor }} />
        </div>
      ) : (
        <>
          {/* Header + event selector */}
          <div className="cp-header">
            <div className="cp-header-row">
              <div className="cp-header-title">Host event composer</div>
              <button
                className="ts-icon-btn cp-collapse-btn"
                onClick={onTogglePanel}
                title="Collapse panel"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="11 17 6 12 11 7" />
                  <polyline points="18 17 13 12 18 7" />
                </svg>
              </button>
            </div>
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
                  stroke="#7A8694"
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
                      <div className="cp-rel">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9AA4B2" strokeWidth="2" strokeLinecap="round" className="cp-search-icon">
                          <circle cx="11" cy="11" r="7" />
                          <path d="m20 20-3-3" />
                        </svg>
                        <input
                          className="ts-input cp-search-input"
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
                            style={{ background: selected ? '#F4F6FF' : 'transparent' }}
                          >
                            <span className="cp-dot-6 cp-dot-shrink" style={{ background: '#7c5cfc' }} />
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
            <textarea
              className="tss cp-textarea"
              value={draft}
              onChange={(e) => onDraftChange(e.target.value)}
              spellCheck={false}
              placeholder="{}"
            />

            <label className="cp-field-label cp-result-label">
              Resulting call
            </label>
            <pre className="tss cp-result-pre">
              {composerCodeFor(composerKey, draft)}
            </pre>
          </div>

          <div className="cp-footer">
            <button
              className="ts-btn-primary cp-trigger-btn"
              onClick={onTrigger}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
              Trigger event
            </button>
          </div>
        </>
      )}
    </aside>
  )
}
