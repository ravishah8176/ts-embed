import { useMemo } from 'react'
import './ComposerPanel.scss'
import type { EmbedType } from './constants'
import {
  CAT_ORDER,
  CATS,
  EMBED_CLASS_NAME,
  allowedHostEvents,
  categoryOf,
  colorOf,
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

  const composerColor = colorOf(composerKey)

  const groups = useMemo(() => {
    const allowed = allowedHostEvents(embedType)
    const q = composerSearch.trim().toLowerCase()
    const match = (k: string) => !q || k.toLowerCase().includes(q) || humanize(k).toLowerCase().includes(q)
    return CAT_ORDER.map((cat) => ({
      label: CATS[cat].label,
      color: CATS[cat].color,
      opts: allowed.filter((k) => categoryOf(k) === cat && match(k)),
    })).filter((g) => g.opts.length)
  }, [embedType, composerSearch])

  const noResults = groups.length === 0

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
      style={{
        flex: `0 0 ${panelW}px`,
        minHeight: 0,
        background: '#fff',
        borderRight: '1px solid #E4E7EC',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'flex-basis .22s ease',
      }}
    >
      {collapsed ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px 0', gap: 16 }}>
          <button
            className="ts-btn-primary"
            onClick={onTogglePanel}
            title="Expand composer"
            style={{ padding: 7, lineHeight: 0 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="13 17 18 12 13 7" />
              <polyline points="6 17 11 12 6 7" />
            </svg>
          </button>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: composerColor }} />
        </div>
      ) : (
        <>
          {/* Header + event selector */}
          <div style={{ padding: '15px 16px 14px', borderBottom: '1px solid #EEF0F3', position: 'relative', zIndex: 20 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 3 }}>
              <div style={{ flex: 1, fontSize: 14.5, fontWeight: 800, letterSpacing: '-.01em' }}>Host event composer</div>
              <button
                className="ts-icon-btn"
                onClick={onTogglePanel}
                title="Collapse panel"
                style={{ flexShrink: 0, padding: 5, marginTop: -2 }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="11 17 6 12 11 7" />
                  <polyline points="18 17 13 12 18 7" />
                </svg>
              </button>
            </div>
            <div style={{ fontSize: 12, color: '#8A94A2', marginBottom: 13 }}>
              Configure &amp; fire{' '}
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: 'var(--accent)' }}>
                embed.trigger()
              </span>
            </div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#3A4452', marginBottom: 7 }}>
              Host event
            </label>
            <div style={{ position: 'relative' }}>
              <button
                className="composer-select"
                onClick={onToggleComposer}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  border: '1px solid #D7DCE3',
                  borderRadius: 10,
                  padding: '10px 12px',
                  background: '#FAFBFC',
                  textAlign: 'left',
                }}
              >
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: composerColor, flexShrink: 0 }} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#0E1116', lineHeight: 1.25 }}>
                    {humanize(composerKey)}
                  </span>
                  <span
                    style={{
                      display: 'block',
                      fontFamily: "'JetBrains Mono',monospace",
                      fontSize: 10.5,
                      color: '#9AA4B2',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
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
                  style={{ flexShrink: 0, transform: composerOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .15s' }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {composerOpen && (
                <>
                  <div onClick={onCloseComposer} style={{ position: 'fixed', inset: 0, zIndex: 25 }} />
                  <div
                    className="anim-fade"
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      top: 'calc(100% + 6px)',
                      zIndex: 26,
                      background: '#fff',
                      border: '1px solid #E4E7EC',
                      borderRadius: 12,
                      boxShadow: '0 18px 44px rgba(14,17,22,.2)',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      maxHeight: 330,
                    }}
                  >
                    <div style={{ padding: 9, borderBottom: '1px solid #EEF0F3' }}>
                      <div style={{ position: 'relative' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9AA4B2" strokeWidth="2" strokeLinecap="round" style={{ position: 'absolute', left: 9, top: 8 }}>
                          <circle cx="11" cy="11" r="7" />
                          <path d="m20 20-3-3" />
                        </svg>
                        <input
                          className="ts-input"
                          value={composerSearch}
                          onChange={(e) => onComposerSearch(e.target.value)}
                          placeholder="Search host events…"
                          style={{ padding: '7px 9px 7px 29px', fontSize: 13, background: '#FAFBFC', borderRadius: 8 }}
                          autoFocus
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 10.5, color: '#9AA4B2' }}>
                        Events supported by{' '}
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 600, color: '#3A4452' }}>
                          {EMBED_CLASS_NAME[embedType]}
                        </span>
                      </div>
                    </div>
                    <div className="tss" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 5 }}>
                      {groups.map((g) => (
                        <div key={g.label}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 8px 3px' }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: g.color }} />
                            <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: '#9AA4B2' }}>
                              {g.label}
                            </span>
                          </div>
                          {g.opts.map((k) => {
                            const selected = k === composerKey
                            return (
                              <button
                                key={k}
                                className="hover-opt"
                                onClick={() => onPickEvent(k)}
                                style={{
                                  width: '100%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 8,
                                  border: 'none',
                                  background: selected ? '#F4F6FF' : 'transparent',
                                  borderRadius: 8,
                                  padding: '7px 9px',
                                  textAlign: 'left',
                                }}
                              >
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: colorOf(k), flexShrink: 0 }} />
                                <span style={{ flex: 1, minWidth: 0 }}>
                                  <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1B2530', lineHeight: 1.2 }}>
                                    {humanize(k)}
                                  </span>
                                  <span
                                    style={{
                                      display: 'block',
                                      fontFamily: "'JetBrains Mono',monospace",
                                      fontSize: 10,
                                      color: '#AEB6C2',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                    }}
                                  >
                                    HostEvent.{k}
                                  </span>
                                </span>
                                {selected && (
                                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      ))}
                      {noResults && (
                        <div style={{ textAlign: 'center', color: '#9AA4B2', fontSize: 13, padding: '22px 12px' }}>
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
          <div className="tss" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#3A4452' }}>Parameters · JSON</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 10.5, fontWeight: 600, color: validColor }}>{validStatus}</span>
                <button
                  className="link-btn"
                  onClick={onReset}
                  style={{ background: 'transparent', border: 'none', fontSize: 11.5, color: 'var(--accent)', fontWeight: 600, padding: 0 }}
                >
                  Reset to example
                </button>
              </div>
            </div>
            <textarea
              className="tss"
              value={draft}
              onChange={(e) => onDraftChange(e.target.value)}
              spellCheck={false}
              placeholder="{}"
              style={{
                width: '100%',
                height: 260,
                resize: 'none',
                overflow: 'auto',
                border: '1px solid #D7DCE3',
                borderRadius: 10,
                padding: 11,
                fontFamily: "'JetBrains Mono',monospace",
                fontSize: 12,
                lineHeight: 1.55,
                outline: 'none',
                color: '#1B2530',
                background: '#FAFBFC',
              }}
            />

            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#3A4452', margin: '16px 0 7px' }}>
              Resulting call
            </label>
            <pre
              className="tss"
              style={{
                margin: 0,
                minHeight: 60,
                maxHeight: 160,
                overflow: 'auto',
                background: '#0B0E14',
                border: '1px solid #1C2230',
                borderRadius: 10,
                padding: '12px 13px',
                fontFamily: "'JetBrains Mono',monospace",
                fontSize: 11.5,
                lineHeight: 1.6,
                color: '#9FD0A8',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {composerCodeFor(composerKey, draft)}
            </pre>
          </div>

          <div style={{ flexShrink: 0, padding: '13px 16px', borderTop: '1px solid #EEF0F3', background: '#fff' }}>
            <button
              className="ts-btn-primary"
              onClick={onTrigger}
              style={{ width: '100%', fontSize: 14, padding: 12, gap: 8, boxShadow: '0 4px 12px rgba(43,91,244,.22)' }}
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
