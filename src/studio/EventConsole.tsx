import { useMemo } from 'react'
import './EventConsole.scss'
import type { LogRow, Reaction } from './constants'
import { CATS, REACT_CHOICES, categoryOf, colorOf, fmtTime, humanize, jstr } from './constants'

export type ConsoleState = 'collapsed' | 'short' | 'normal' | 'tall'

interface Props {
  consoleState: ConsoleState
  onCycleConsole: () => void
  log: LogRow[]
  logFilter: string
  onLogFilter: (v: string) => void
  paused: boolean
  onPause: () => void
  onClear: () => void
  onExport: () => void
  reactions: Reaction[]
  onRemoveReaction: (idx: number) => void
  expandedId: string | null
  onToggleExpand: (id: string) => void
  reactPickerFor: string | null
  onOpenReactPicker: (id: string) => void
  onAddReaction: (embedEvent: string, hostEvent: string) => void
  setConsoleEl: (el: HTMLDivElement | null) => void
}

const CONSOLE_HEIGHTS: Record<ConsoleState, number> = { collapsed: 43, short: 150, normal: 248, tall: 372 }

export default function EventConsole(props: Props) {
  const {
    consoleState,
    onCycleConsole,
    log,
    logFilter,
    onLogFilter,
    paused,
    onPause,
    onClear,
    onExport,
    reactions,
    onRemoveReaction,
    expandedId,
    onToggleExpand,
    reactPickerFor,
    onOpenReactPicker,
    onAddReaction,
    setConsoleEl,
  } = props

  const collapsed = consoleState === 'collapsed'
  const consoleH = CONSOLE_HEIGHTS[consoleState]

  const rows = useMemo(() => {
    const q = logFilter.trim().toLowerCase()
    return log.filter(
      (r) => !q || r.name.toLowerCase().includes(q) || humanize(r.name).toLowerCase().includes(q),
    )
  }, [log, logFilter])

  const liveDot = paused ? '#FAB005' : '#34D399'
  const liveGlow = paused ? 'rgba(250,176,5,.18)' : 'rgba(52,211,153,.18)'
  const reactionsVisible = reactions.length > 0 && !collapsed

  return (
    <section
      className="ec-console"
      style={{ height: consoleH }}
    >
      {/* Header */}
      <div className="ec-header">
        <div className="ec-header-left">
          <span className="ec-live-dot" style={{ background: liveDot, boxShadow: `0 0 0 3px ${liveGlow}` }} />
          <span className="ec-title">Embed event log</span>
          <span className="ec-count">
            {rows.length} / {log.length}
          </span>
        </div>

        {!collapsed && (
          <div className="ec-search">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#5A6473" strokeWidth="2" strokeLinecap="round" className="ec-search-icon">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3-3" />
            </svg>
            <input
              className="ts-dark-input ec-search-input"
              value={logFilter}
              onChange={(e) => onLogFilter(e.target.value)}
              placeholder="Filter events…"
            />
          </div>
        )}

        <div className="ec-spacer" />

        {!collapsed && (
          <>
            <button
              onClick={onPause}
              title="Pause / resume capture"
              className="ec-pause-btn"
              style={{
                background: paused ? 'rgba(250,176,5,.14)' : '#161B26',
                color: paused ? '#FAB005' : '#AEB6C2',
              }}
            >
              {paused ? '▶ Resume' : '❚❚ Pause'}
            </button>
            <button className="ts-dark-btn ec-icon-btn" onClick={onExport} title="Export log as JSON">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v12m0 0 4-4m-4 4-4-4" />
                <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
              </svg>
            </button>
            <button className="ts-dark-btn ec-icon-btn" onClick={onClear} title="Clear log">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
              </svg>
            </button>
          </>
        )}
        <button className="ts-dark-btn ec-icon-btn" onClick={onCycleConsole} title="Resize / collapse log">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points={consoleState === 'tall' ? '6 9 12 15 18 9' : '6 15 12 9 18 15'} />
          </svg>
        </button>
      </div>

      {/* Reactions bar */}
      {reactionsVisible && (
        <div
          className="tssd ec-reactions"
        >
          <span className="ec-reactions-label">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="#FAB005" stroke="none">
              <path d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12z" />
            </svg>
            Reactions
          </span>
          {reactions.map((r, i) => (
            <div
              key={`${r.embedEvent}-${r.hostEvent}-${i}`}
              className="ec-reaction-chip"
            >
              <span className="ec-reaction-text">
                {r.embedEvent} → {r.hostEvent}
              </span>
              <button onClick={() => onRemoveReaction(i)} className="ec-reaction-remove">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Log body */}
      {!collapsed && (
        <div className="tssd ec-body" ref={setConsoleEl}>
          {rows.length === 0 ? (
            <div className="ec-empty">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M4 6h16M4 12h16M4 18h10" />
              </svg>
              <div className="ec-empty-text">No events match — interact with the embed or trigger a host event.</div>
            </div>
          ) : (
            rows.map((r) => {
              const isEmbed = r.dir === 'embed'
              const pre = isEmbed ? 'EmbedEvent.' : 'HostEvent.'
              const color = colorOf(r.name)
              const catLabel = CATS[categoryOf(r.name)].label
              const expanded = expandedId === r.id
              const reactOpen = reactPickerFor === r.id
              return (
                <div key={r.id} className="ec-row-wrap">
                  <div
                    className="log-row ec-row"
                    onClick={() => onToggleExpand(r.id)}
                    style={{ borderLeft: `3px solid ${color}` }}
                  >
                    <span className="ec-row-time">
                      {fmtTime(r.ts)}
                    </span>
                    <span
                      className="ec-row-badge"
                      style={{
                        background: isEmbed ? 'rgba(16,185,129,.14)' : 'rgba(43,91,244,.18)',
                        color: isEmbed ? '#34D399' : '#7AA0FF',
                      }}
                    >
                      {isEmbed ? 'EMBED' : 'HOST'}
                    </span>
                    <span className="ec-row-dot" style={{ background: color }} />
                    <span className="ec-row-name">
                      {pre}
                      {r.name}
                    </span>
                    {r.reactedWith && (
                      <span className="ec-row-reacted">⚡ {r.reactedWith}</span>
                    )}
                    {r.viaReaction && (
                      <span className="ec-row-via">via {r.viaReaction}</span>
                    )}
                    <div className="ec-spacer" />
                    <span className="ec-row-cat">{catLabel}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (isEmbed) onOpenReactPicker(r.id)
                      }}
                      title="React with a host event"
                      className="ec-row-react"
                      style={{ color: isEmbed ? (r.reactedWith ? '#FAB005' : '#3A4456') : '#1c2330' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill={r.reactedWith ? '#FAB005' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12z" />
                      </svg>
                    </button>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#5A6473" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ec-row-chevron" style={{ transform: expanded ? 'rotate(180deg)' : 'none' }}>
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>

                  {reactOpen && (
                    <div className="ec-react-panel">
                      <div className="ec-react-prompt">
                        When <span className="ec-react-prompt-name">{r.name}</span> fires → auto-trigger a host event:
                      </div>
                      <div className="ec-react-choices">
                        {REACT_CHOICES.map((h) => (
                          <button
                            key={h}
                            className="react-chip ec-react-choice"
                            onClick={() => onAddReaction(r.name, h)}
                          >
                            → {humanize(h)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {expanded && (
                    <div className="ec-expand-panel">
                      <pre className="ec-payload">
                        {`// ${pre}${r.name}\n${jstr(r.payload)}`}
                      </pre>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </section>
  )
}
